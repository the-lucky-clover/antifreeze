import { getRatings } from '../shared/storage.js';

const jobsTable = document.getElementById('jobsTable');

function escapeHtml(text = '') {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderStars(jobId, ratingValue = 0) {
  return `<div class="stars">${[1,2,3,4,5].map((value) => `<button class="star ${value <= ratingValue ? 'active' : ''}" data-job-id="${jobId}" data-score="${value}">★</button>`).join('')}</div>`;
}

function badgeClass(state) {
  if (state === 'Done') return 'badge done';
  if (state === 'Error' || state === 'Canceled') return 'badge error';
  return 'badge running';
}

async function fetchJobs() {
  const response = await chrome.runtime.sendMessage({ type: 'jobs:list' });
  return response.jobs || {};
}

async function render() {
  const [jobsMap, ratings] = await Promise.all([fetchJobs(), getRatings()]);
  const jobs = Object.values(jobsMap).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

  const queued = jobs.filter((job) => job.state === 'Queued').length;
  const running = jobs.filter((job) => ['Extracting', 'Chunking', 'Summarizing', 'Formatting'].includes(job.state)).length;
  const done = jobs.filter((job) => job.state === 'Done').length;
  document.getElementById('statQueued').textContent = String(queued);
  document.getElementById('statRunning').textContent = String(running);
  document.getElementById('statDone').textContent = String(done);

  jobsTable.innerHTML = jobs.map((job) => {
    const rating = ratings[job.jobId]?.score || 0;
    const thumb = job.thumbnail ? `<img src="${job.thumbnail}" alt="Thumbnail" />` : '<span>No capture</span>';
    const summaryText = job.summary?.combined || job.message || 'Waiting in queue...';
    return `
      <tr>
        <td><div class="thumb">${thumb}</div></td>
        <td>
          <div style="font-weight:700; margin-bottom:6px;">${escapeHtml(job.title || 'Untitled')}</div>
          <a href="${escapeHtml(job.url || '#')}" target="_blank" rel="noreferrer" style="color:#7be6ff; word-break:break-word;">${escapeHtml(job.url || '')}</a>
        </td>
        <td>
          <div class="${badgeClass(job.state)}">${escapeHtml(job.state || 'Queued')}</div>
          <div style="height:10px"></div>
          <div class="progress"><span style="width:${Number(job.progress || 0)}%"></span></div>
          <div style="height:8px"></div>
          <div class="small">${escapeHtml(job.message || '')}</div>
        </td>
        <td><div class="summary-box">${escapeHtml(summaryText)}</div></td>
        <td>${renderStars(job.jobId, rating)}</td>
        <td>
          <div class="actions">
            <button class="secondary retry-btn" data-tab-id="${job.tabId}">Retry</button>
            <button class="danger cancel-btn" data-job-id="${job.jobId}">Cancel</button>
          </div>
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="6" class="muted">No jobs yet. Queue a current or background tab to begin.</td></tr>';
}

document.getElementById('refreshBtn').addEventListener('click', render);
document.getElementById('queueBackgroundBtn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'summarize:background-tabs' });
  render();
});

jobsTable.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.classList.contains('retry-btn')) {
    await chrome.runtime.sendMessage({ type: 'job:retry', tabId: Number(target.dataset.tabId) });
  }
  if (target.classList.contains('cancel-btn')) {
    await chrome.runtime.sendMessage({ type: 'job:cancel', jobId: target.dataset.jobId });
  }
  if (target.classList.contains('star')) {
    await chrome.runtime.sendMessage({ type: 'rating:save', jobId: target.dataset.jobId, score: Number(target.dataset.score) });
  }
  render();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'telemetry:update' || message.type === 'queue:updated') render();
});

render();
