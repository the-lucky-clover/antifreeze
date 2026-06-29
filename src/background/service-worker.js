import { JOB_STATES } from '../shared/constants.js';
import { getJobs, updateJob, saveRating } from '../shared/storage.js';
import { summarizeDocument } from './summarizer.js';

const queue = [];
let activeJobId = null;

function jobIdForTab(tabId) {
  return `job-${tabId}`;
}

async function broadcast(type, payload = {}) {
  try {
    await chrome.runtime.sendMessage({ type, payload });
  } catch (_) {
    // UI pages may not be open.
  }
}

async function telemetry(jobId, patch) {
  const job = await updateJob(jobId, patch);
  await broadcast('telemetry:update', { jobId, job });
}

async function queryTabExtraction(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, { type: 'extract:content' });
  return response;
}

async function tryCaptureThumbnail(tab) {
  const fallback = tab.favIconUrl || '';
  try {
    if (tab.active && chrome.tabs.captureVisibleTab) {
      return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 55 });
    }
  } catch (_) {
    // Safari and some browsers may restrict this for inactive or protected tabs.
  }
  return fallback;
}

async function processQueue() {
  if (activeJobId || queue.length === 0) return;
  const next = queue.shift();
  if (!next) return;
  activeJobId = next.jobId;

  try {
    await telemetry(next.jobId, { state: JOB_STATES.extracting, progress: 10, message: 'Collecting page content' });
    const extraction = await queryTabExtraction(next.tab.id);
    const thumbnail = await tryCaptureThumbnail(next.tab);

    if (!extraction?.text) {
      throw new Error('No extractable content found in tab.');
    }

    await telemetry(next.jobId, {
      state: JOB_STATES.chunking,
      progress: 24,
      message: 'Chunking long-form content',
      contentLength: extraction.text.length,
      thumbnail,
      title: extraction.title || next.tab.title,
      url: extraction.url || next.tab.url
    });

const summary = await summarizeDocument({
       text: extraction.text,
       meta: {
         title: extraction.title || next.tab.title,
         url: extraction.url || next.tab.url,
         kind: extraction.kind,
         selection: extraction.selection
       },
       jobId: next.jobId,
       telemetry: async ({ state, progress, message }) => {
         await telemetry(next.jobId, { state, progress, message });
       }
     });

    await telemetry(next.jobId, {
      state: JOB_STATES.done,
      progress: 100,
      message: 'Summary ready',
      summary,
      completedAt: Date.now()
    });
  } catch (error) {
    await telemetry(next.jobId, {
      state: JOB_STATES.error,
      progress: 100,
      message: error.message,
      error: error.stack || String(error)
    });
  } finally {
    activeJobId = null;
    processQueue();
  }
}

async function enqueueTabs(tabs) {
  for (const tab of tabs) {
    if (!tab.id || !tab.url?.startsWith('http')) continue;
    const jobId = jobIdForTab(tab.id);
    queue.push({ tab, jobId });
    await updateJob(jobId, {
      jobId,
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
      state: JOB_STATES.queued,
      progress: 2,
      message: 'Queued for summarization',
      createdAt: Date.now()
    });
  }
  await broadcast('queue:updated', { activeJobId, queueLength: queue.length });
  processQueue();
}

async function getBackgroundTabs(currentWindowOnly = true) {
  const tabs = await chrome.tabs.query({ currentWindow: currentWindowOnly });
  return tabs.filter((tab) => !tab.active && /^https?:/i.test(tab.url || ''));
}

chrome.runtime.onInstalled.addListener(async () => {
  await getJobs();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'summarize:current-tab': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await enqueueTabs(tab ? [tab] : []);
        sendResponse({ ok: true });
        break;
      }
      case 'summarize:background-tabs': {
        const tabs = await getBackgroundTabs(true);
        await enqueueTabs(tabs);
        sendResponse({ ok: true, count: tabs.length });
        break;
      }
      case 'jobs:list': {
        const jobs = await getJobs();
        sendResponse({ ok: true, jobs, activeJobId, queueLength: queue.length });
        break;
      }
      case 'results:open': {
        await chrome.tabs.create({ url: chrome.runtime.getURL('results/results.html') });
        sendResponse({ ok: true });
        break;
      }
      case 'job:retry': {
        const tab = await chrome.tabs.get(message.tabId);
        await enqueueTabs([tab]);
        sendResponse({ ok: true });
        break;
      }
      case 'job:cancel': {
        const index = queue.findIndex((item) => item.jobId === message.jobId);
        if (index >= 0) {
          queue.splice(index, 1);
          await updateJob(message.jobId, { state: JOB_STATES.canceled, progress: 100, message: 'Canceled by user' });
        }
        sendResponse({ ok: true });
        break;
      }
      case 'rating:save': {
        await saveRating(message.jobId, { score: message.score, note: message.note || '', createdAt: Date.now() });
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  return true;
});
