import http from 'http';

function summarize(text = '', title = 'Untitled') {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  const top = sentences.slice(0, 6);
  return {
    text: `Summary for ${title}: ${top.join(' ') || 'No text supplied.'}`
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/summarize') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const result = summarize(body.chunk || '', body.meta?.title || 'Untitled');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

server.listen(8787, '127.0.0.1', () => {
  console.log('Local summarizer server listening on http://127.0.0.1:8787/summarize');
});
