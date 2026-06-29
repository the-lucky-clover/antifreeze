export async function sendNative(payload) {
  if (!chrome.runtime?.sendNativeMessage) {
    throw new Error('Native messaging is unavailable in this browser context.');
  }
  return chrome.runtime.sendNativeMessage('com.neon.summarizer.host', payload);
}
