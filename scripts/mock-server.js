// Lightweight mock API server for local testing (no deps)
// Endpoints:
// - GET /prompts -> [{ id, title, version, updatedAt }]
// - GET /prompts/:id -> { body }

const http = require('http');
const url = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const prompts = [
  { id: 'welcome', title: 'Welcome System Prompt', version: '1', updatedAt: new Date().toISOString(), body: 'You are a helpful assistant. Always be concise.' },
  { id: 'coding', title: 'Coding System Prompt', version: '3', updatedAt: new Date().toISOString(), body: 'Write clear, readable code with comments explaining why, not how.' },
  { id: 'analysis', title: 'Analysis System Prompt', version: '2', updatedAt: new Date().toISOString(), body: 'Think step-by-step, list assumptions, and summarize key insights.' },
];

const indexEtag = 'W/"index-v1"';

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '', true);
  const method = req.method || 'GET';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, If-None-Match');

  if (method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (method !== 'GET') {
    res.writeHead(405).end('Method Not Allowed');
    return;
  }

  if (parsed.pathname === '/prompts') {
    const inm = req.headers['if-none-match'];
    if (inm && inm === indexEtag) {
      res.writeHead(304).end();
      return;
    }
    const items = prompts.map(({ id, title, version, updatedAt }) => ({ id, title, version, updatedAt }));
    const body = JSON.stringify(items);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('ETag', indexEtag);
    res.writeHead(200).end(body);
    return;
  }

  const match = parsed.pathname && parsed.pathname.match(/^\/prompts\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const item = prompts.find((p) => p.id === id);
    if (!item) {
      res.writeHead(404).end('Not Found');
      return;
    }
    const etag = `W/"${id}-v${item.version}"`;
    const inm = req.headers['if-none-match'];
    if (inm && inm === etag) {
      res.writeHead(304).end();
      return;
    }
    const body = JSON.stringify({ body: item.body });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('ETag', etag);
    res.writeHead(200).end(body);
    return;
  }

  res.writeHead(404).end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Mock prompts API listening on http://localhost:${PORT}`);
});


