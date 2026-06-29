import { getSettings } from '../shared/storage.js';
import { sendNative } from './native-bridge.js';

const CHATGPT_URLS = ['https://chat.openai.com', 'https://chatgpt.com'];

async function getChatGPTTab() {
  const tabs = await chrome.tabs.query({ url: CHATGPT_URLS.map(url => `${url}/*`) });
  return tabs.length > 0 ? tabs[0] : null;
}

async function createChatGPTTab() {
  const isSafari = typeof chrome.runtime.getBrowserInfo === 'function';
  if (isSafari) {
    return chrome.tabs.create({ url: 'https://chat.openai.com/', active: true });
  }
  return chrome.tabs.create({ url: 'https://chat.openai.com/', active: false });
}

function injectPromptWithMonitor(fullPrompt, itemId) {
  const textarea = document.querySelector('textarea#prompt-textarea, textarea[data-testid="textbox"], textarea');
  if (!textarea) {
    window.postMessage({ type: 'YTLDR_ERROR', itemId, error: 'ChatGPT not ready' }, '*');
    return;
  }

  const observer = new MutationObserver((mutations) => {
    const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      const text = last.textContent;
      if (text && text.length > 10) {
        window.postMessage({ type: 'YTLDR_RESPONSE', itemId, response: text }, '*');
        observer.disconnect();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  textarea.value = fullPrompt;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  setTimeout(() => {
    const submitBtn = document.querySelector('button[data-testid="send-button"], button[aria-label*="Send"], button[class*="send"]');
    if (submitBtn) submitBtn.click();
    else textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
  }, 500);
}

async function pollForChatGPTResponse(tabId, itemId, maxSeconds = 120) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      reject(new Error('ChatGPT response timed out'));
    }, maxSeconds * 1000);

    const poll = setInterval(async () => {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
            if (messages.length > 0) {
              const last = messages[messages.length - 1];
              const text = last.textContent;
              const isGenerating = !!document.querySelector('[data-testid="stop-button"], [data-state="generating"]');
              if (text && text.length > 10 && !isGenerating) {
                return text;
              }
            }
            return null;
          }
        });
        if (result[0]?.result) {
          clearInterval(poll);
          clearTimeout(timeout);
          resolve(result[0].result.trim());
        }
      } catch (e) {}
    }, 2000);
  });
}

async function sendToChatGPTHeadless(prompt, content, url, itemId, telemetry) {
  let chatgptTab = await getChatGPTTab();

  if (!chatgptTab) {
    chatgptTab = await createChatGPTTab();
    await telemetry({ state: 'Connecting', progress: 30, message: 'Waiting for ChatGPT to load...' });
    await new Promise(r => setTimeout(r, 4000));
  }

  const fullPrompt = prompt + (content ? '\n\n' + content : '');
  await telemetry({ state: 'Sending', progress: 35, message: 'Injecting prompt...' });

  await chrome.scripting.executeScript({
    target: { tabId: chatgptTab.id },
    func: injectPromptWithMonitor,
    args: [fullPrompt, itemId]
  });

  await telemetry({ state: 'Waiting', progress: 40, message: 'Waiting for ChatGPT response...' });
  return pollForChatGPTResponse(chatgptTab.id, itemId);
}

function stripNoise(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/(cookie policy|subscribe|sign in|advertisement)/gi, '')
    .trim();
}

export function chunkText(text, chunkSize = 5000, overlap = 400) {
  const cleaned = stripNoise(text);
  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + chunkSize);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function extractUrls(text) {
  return Array.from(new Set((text.match(/https?:\/\/[^\s)\]]+/g) || []).slice(0, 6)));
}

function linesFromText(text, limit = 6) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function formatThreeSectionSummary(partials, meta, settings) {
  const merged = partials.join(' ').trim();
  const sentences = linesFromText(merged, 12);
  const links = settings.includeLinks ? extractUrls(merged) : [];

  const outline = [
    `1. Main topic — ${meta.title || 'Untitled page'}`,
    `2. Context — ${sentences[0] || 'High-level context unavailable.'}`,
    `3. Core points — ${(sentences[1] || '')} ${(sentences[2] || '')}`.trim(),
    `4. Why it matters — ${sentences[3] || 'Importance inferred from document emphasis.'}`,
    `5. Recommended next action — ${sentences[4] || 'Review the source page for deeper detail.'}`
  ].join('\n');

  const bullets = sentences
    .slice(0, 6)
    .map((line, index) => `${['⚡','🧠','📌','🔍','🛠️','🌐'][index] || '✨'} ${line}`)
    .join('\n\n');

  const tldr = [
    `Key takeaways: ${sentences.slice(0, 3).join(' ') || 'Summary unavailable.'}`,
    links.length ? `External URLs: ${links.join(', ')}` : 'External URLs: none detected in extracted text.',
    `How-to steps: 1) Review the outline. 2) Scan the bullets. 3) Open the source tab for validation. 4) Save highly rated summaries for follow-up.`
  ].join('\n');

  return {
    outline,
    bullets,
    tldr,
    combined: `OUTLINE\n${outline}\n\nBULLETS\n${bullets}\n\nTL;DR\n${tldr}`
  };
}

async function summarizeViaHttp(payload, endpoint) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Backend request failed: ${response.status}`);
  return response.json();
}

function mockChunkSummary(chunk, index, total, meta) {
  const sentences = linesFromText(chunk, 4);
  return {
    text: [`Chunk ${index + 1}/${total} from ${meta.title || meta.url || 'page'}:`, ...sentences].join(' ')
  };
}

export async function summarizeDocument({ text, meta, telemetry, jobId }) {
  const settings = await getSettings();
  const chunks = chunkText(text, settings.chunkSize, settings.overlap);
  const partials = [];
  const effectiveJobId = jobId || 'direct';

  for (let index = 0; index < chunks.length; index += 1) {
    const percent = Math.round(35 + ((index + 1) / Math.max(chunks.length, 1)) * 45);
    await telemetry({ state: 'Summarizing', progress: percent, message: `Chunk ${index + 1} of ${chunks.length}` });

    const payload = {
      kind: 'summarize',
      meta,
      chunkIndex: index,
      totalChunks: chunks.length,
      chunk: chunks[index],
      settings,
      format: 'outline-bullets-tldr'
    };

    let response;
    if (settings.providerMode === 'chatgpt-headless') {
      try {
        response = await sendToChatGPTHeadless(
          settings.customPrompt.replace('{{URL}}', meta.url || '').replace('{{TITLE}}', meta.title || 'Untitled'),
          chunks[index],
          meta.url,
          `${effectiveJobId}-chunk-${index}`,
          telemetry
        );
        response = { text: response };
      } catch (error) {
        response = mockChunkSummary(chunks[index], index, chunks.length, meta);
      }
    } else if (settings.providerMode === 'native-host') {
      try {
        response = await sendNative(payload);
      } catch (error) {
        response = mockChunkSummary(chunks[index], index, chunks.length, meta);
      }
    } else if (settings.providerMode === 'http-backend') {
      try {
        response = await summarizeViaHttp(payload, settings.backendEndpoint);
      } catch (error) {
        response = mockChunkSummary(chunks[index], index, chunks.length, meta);
      }
    } else {
      response = mockChunkSummary(chunks[index], index, chunks.length, meta);
    }

    partials.push(response.text || '');
  }

  await telemetry({ state: 'Formatting', progress: 92, message: 'Compiling final summary sections' });
  return formatThreeSectionSummary(partials, meta, settings);
}
