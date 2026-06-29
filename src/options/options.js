import { getSettings, saveSettings } from '../shared/storage.js';

const form = document.getElementById('settingsForm');
const ids = ['chunkSize', 'overlap', 'providerMode', 'backendEndpoint', 'customPrompt', 'includeHowTo', 'includeLinks'];
const saveState = document.getElementById('saveState');
const premiumState = document.getElementById('premiumState');

async function load() {
  const settings = await getSettings();
  document.getElementById('chunkSize').value = settings.chunkSize;
  document.getElementById('overlap').value = settings.overlap;
  document.getElementById('providerMode').value = settings.providerMode;
  document.getElementById('backendEndpoint').value = settings.backendEndpoint;
  document.getElementById('customPrompt').value = settings.customPrompt || '';
  document.getElementById('includeHowTo').value = String(settings.includeHowTo);
  document.getElementById('includeLinks').value = String(settings.includeLinks);
  premiumState.textContent = settings.premiumEnabled ? 'Premium preview enabled.' : 'Premium preview disabled.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const settings = await getSettings();
  settings.chunkSize = Number(document.getElementById('chunkSize').value);
  settings.overlap = Number(document.getElementById('overlap').value);
  settings.providerMode = document.getElementById('providerMode').value;
  settings.backendEndpoint = document.getElementById('backendEndpoint').value;
  settings.customPrompt = document.getElementById('customPrompt').value;
  settings.includeHowTo = document.getElementById('includeHowTo').value === 'true';
  settings.includeLinks = document.getElementById('includeLinks').value === 'true';
  await saveSettings(settings);
  saveState.textContent = 'Settings saved.';
  setTimeout(() => { saveState.textContent = ''; }, 1800);
});

document.getElementById('togglePremiumBtn').addEventListener('click', async () => {
  const settings = await getSettings();
  settings.premiumEnabled = !settings.premiumEnabled;
  await saveSettings(settings);
  premiumState.textContent = settings.premiumEnabled ? 'Premium preview enabled.' : 'Premium preview disabled.';
});

load();
