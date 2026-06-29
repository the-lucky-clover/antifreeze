const summaryToneEl = document.getElementById('summaryTone');
const detailLevelEl = document.getElementById('detailLevel');
const outputEl = document.getElementById('output');
const summarizeBtn = document.getElementById('currentTabBtn');

// iOS Safari localStorage wrapper for settings
const storage = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function loadSettings() {
  const settings = storage.get('neon.settings') || {};
  summaryToneEl.value = settings.summaryTone || 'concise';
  detailLevelEl.value = settings.detailLevel || 'balanced';
}

function saveSettings() {
  const settings = storage.get('neon.settings') || {};
  settings.summaryTone = summaryToneEl.value;
  settings.detailLevel = detailLevelEl.value;
  storage.set('neon.settings', settings);
}

function summarizeCurrentPage() {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Extracting content...';

  // iOS Safari Extension API
  if (typeof safari !== 'undefined' && safari.self) {
    const handler = (event) => {
      if (event.name === 'content-extracted') {
        safari.self.removeEventListener('message', handler);
        runLocalSummary(event.message);
      }
    };
    safari.self.addEventListener('message', handler);
    safari.self.tab.dispatchMessage('extract-content');
  } else if (typeof chrome !== 'undefined' && chrome.tabs) {
    // Chrome fallback
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { type: 'extract:content' }).then((response) => {
        runLocalSummary(response);
      });
    });
  } else {
    statusEl.textContent = 'Safari extension required.';
  }
}

function runLocalSummary(data) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Processing...';

  const text = data.text || '';
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean).slice(0, 12);

  const outline = [
    `1. Main topic — ${data.title || 'Untitled page'}`,
    `2. Context — ${sentences[0] || 'Content extracted.'}`,
    `3. Core points — ${(sentences[1] || '')} ${(sentences[2] || '')}`.trim(),
    `4. Why it matters — ${sentences[3] || 'Key information identified.'}`,
    `5. Next action — ${sentences[4] || 'Review the source page.'}`
  ].join('\n');

  const bullets = sentences.slice(0, 6).map((line, i) => `${['⚡','🧠','📌','🔍','🛠️','🌐'][i] || '✨'} ${line}`).join('\n\n');

  const urls = [...new Set((text.match(/https?:\/\/[^\s)\]]+/g) || []).slice(0, 6))];
  const tldr = [
    `Key takeaways: ${sentences.slice(0, 3).join(' ') || 'Summary generated.'}`,
    urls.length ? `URLs: ${urls.join(', ')}` : 'No external URLs detected.'
  ].join('\n');

  outputEl.innerHTML = `<pre>${outline}\n\n${bullets}\n\n${tldr}</pre>`;
  statusEl.textContent = 'Done.';
}

// Initialize
document.addEventListener('DOMContentLoaded', loadSettings);
if (summarizeBtn) summarizeBtn.addEventListener('click', summarizeCurrentPage);
if (summaryToneEl) summaryToneEl.addEventListener('change', saveSettings);
if (detailLevelEl) detailLevelEl.addEventListener('change', saveSettings);