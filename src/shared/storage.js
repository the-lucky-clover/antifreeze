import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants.js';

export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.settings] || {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
  return settings;
}

export async function getJobs() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.jobs);
  return result[STORAGE_KEYS.jobs] || {};
}

export async function setJobs(jobs) {
  await chrome.storage.local.set({ [STORAGE_KEYS.jobs]: jobs });
  return jobs;
}

export async function updateJob(jobId, partial) {
  const jobs = await getJobs();
  jobs[jobId] = { ...(jobs[jobId] || {}), ...partial, updatedAt: Date.now() };
  await setJobs(jobs);
  return jobs[jobId];
}

export async function saveRating(jobId, rating) {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ratings);
  const ratings = result[STORAGE_KEYS.ratings] || {};
  ratings[jobId] = rating;
  await chrome.storage.local.set({ [STORAGE_KEYS.ratings]: ratings });
  return rating;
}

export async function getRatings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ratings);
  return result[STORAGE_KEYS.ratings] || {};
}
