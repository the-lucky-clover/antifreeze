export const STORAGE_KEYS = {
  settings: 'neon.settings',
  jobs: 'neon.jobs',
  ratings: 'neon.ratings',
  introSeen: 'neon.introSeen'
};

export const DEFAULT_SETTINGS = {
  chunkSize: 5000,
  overlap: 400,
  maxTabsPerBatch: 20,
  providerMode: 'native-host',
  backendEndpoint: 'http://127.0.0.1:8787/summarize',
  customPrompt: `You are an ultra-intelligent, semi-autonomous AI summarizer with forensic-level detail extraction capabilities. Your mission is to analyze {{URL}} and report back every technical, procedural, and contextual detail with surgical precision.

You are not allowed to generalize, skip steps, or group actions vaguely. Every individual action, setting, and config **must be extracted and documented in order**.

FORMAT YOUR OUTPUT AS FOLLOWS:
1. **Structured Outline of \`{{TITLE}}\`**
   - Break the content down into **sections**, then further into **detailed, sequential steps** (not grouped).
   - Every action, tool, file, and command should be an individual sub-step.
   - Include any visual references mentioned: buttons, menu names, tabs, sliders, or filenames.

2. **Bullet Summary (w/ Emojis):**
   - 🛠️ Tools/frameworks
   - 📋 Ordered steps
   - 💻 Devices/Specs
   - 🧪 Test/benchmarks
   - 📁 Files/config paths
   - 💰 Pricing/sponsorship
   - 🔗 Full URLs
   - 🔒 Privacy/telemetry concerns

3. **TL;DR (3–15 Sentences):**
   - Write a detailed yet readable synthesis.
   - Must include all named devices, tools, techniques, and results.
   - If steps were shown in video, summarize their **purpose and result**.

4. **Full Link Breakdown:**
   - Show every URL in full.
   - Label: Free, Affiliate/Sponsored, Docs, Risky or tracking.

NEVER summarize vaguely. NEVER combine steps. NEVER skip names, models, commands, links, or tool versions. Think like an engineer writing documentation for a system rebuild. Output only text. Be relentlessly thorough. Assume the user needs to *rebuild the whole demo from scratch using your output*.`,
  premiumEnabled: false,
  summaryTone: 'concise',
  includeHowTo: true,
  includeLinks: true,
  detailLevel: 'balanced'
};

export const JOB_STATES = {
  queued: 'Queued',
  extracting: 'Extracting',
  chunking: 'Chunking',
  summarizing: 'Summarizing',
  formatting: 'Formatting',
  done: 'Done',
  error: 'Error',
  canceled: 'Canceled'
};

export const TELEMETRY_STEPS = ['Queued', 'Extracting', 'Chunking', 'Summarizing', 'Formatting', 'Done'];
