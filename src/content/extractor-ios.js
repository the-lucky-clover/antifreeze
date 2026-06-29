// iOS Safari Content Script - Simplified for iOS (no background scripts)
// Uses Safari Extension API directly

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

// iOS Safari uses safari.self.addEventListener
if (typeof safari !== 'undefined' && safari.self) {
  safari.self.addEventListener('message', (event) => {
    switch (event.name) {
      case 'extract-content':
        const selection = String(window.getSelection?.() || '').trim();
        safari.self.tab.dispatchMessage('content-extracted', {
          title: document.title,
          url: location.href,
          kind: detectKind(),
          selection,
          text: selection || visibleText()
        });
        break;
      case 'ping':
        safari.self.tab.dispatchMessage('pong', { alive: true });
        break;
    }
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof safari !== 'undefined' && safari.self) {
      safari.self.tab.dispatchMessage('content-script-ready', { url: location.href });
    }
  });
}