import { getSettings, saveSettings } from '../shared/storage.js';

const queueCountEl = document.getElementById('queueCount');
const activeStateEl = document.getElementById('activeState');
const activeProgressEl = document.getElementById('activeProgress');
const activeMessageEl = document.getElementById('activeMessage');
const summaryToneEl = document.getElementById('summaryTone');
const detailLevelEl = document.getElementById('detailLevel');
const actionsEl = document.querySelector('.actions');

async function refresh() {
  const settings = await getSettings();
  summaryToneEl.value = settings.summaryTone;
  detailLevelEl.value = settings.detailLevel;

  const response = await chrome.runtime.sendMessage({ type: 'jobs:list' });
  const jobs = Object.values(response.jobs || {});
  const active = jobs.find((job) => !['Done', 'Error', 'Canceled'].includes(job.state));
  queueCountEl.textContent = String(response.queueLength || 0);
  activeStateEl.textContent = active?.state || 'Idle';
  activeProgressEl.style.width = `${active?.progress || 0}%`;
  activeMessageEl.textContent = active?.message || 'No active summarization.';

  const doneCount = jobs.filter((j) => j.state === 'Done').length;
  if (doneCount > 0 && !document.getElementById('batchAfterBtn')) {
    const btn = document.createElement('button');
    btn.id = 'batchAfterBtn';
    btn.className = 'secondary';
    btn.textContent = 'Batch summarize background tabs';
    btn.style.marginTop = '8px';
    btn.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'summarize:background-tabs' });
      refresh();
    });
    actionsEl.appendChild(btn);
  }
}

async function persistSettings() {
  const settings = await getSettings();
  settings.summaryTone = summaryToneEl.value;
  settings.detailLevel = detailLevelEl.value;
  await saveSettings(settings);
}

document.getElementById('currentTabBtn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'summarize:current-tab' });
  refresh();
});

document.getElementById('backgroundTabsBtn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'summarize:background-tabs' });
  refresh();
});

document.getElementById('resultsBtn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'results:open' });
});

summaryToneEl.addEventListener('change', persistSettings);
detailLevelEl.addEventListener('change', persistSettings);
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'telemetry:update' || message.type === 'queue:updated') refresh();
});

refresh();