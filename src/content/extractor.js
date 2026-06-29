function detectKind() {
  const url = location.href;
  if (/youtube\.com|vimeo\.com|\.mp4($|\?)/i.test(url)) return 'video';
  if (/\.pdf($|\?)/i.test(url) || document.contentType === 'application/pdf') return 'document';
  return 'webpage';
}

function visibleText() {
  const article = document.querySelector('article');
  const preferred = article || document.body;
  const clone = preferred.cloneNode(true);
  clone.querySelectorAll('script, style, nav, footer, aside, noscript').forEach((el) => el.remove());
  const text = clone.innerText || preferred.innerText || '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'extract:content') return;
  const selection = String(window.getSelection?.() || '').trim();
  sendResponse({
    title: document.title,
    url: location.href,
    kind: detectKind(),
    selection,
    text: selection || visibleText()
  });
});
