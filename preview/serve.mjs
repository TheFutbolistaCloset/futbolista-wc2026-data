// Zero-dependency static server for the local preview.
// Serves the project root so /preview/index.html can fetch ./sample-data.json
// and ./assets/*. Open: http://localhost:8753/preview/
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, normalize, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 8753;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0]);
    if (path === '/') path = '/preview/index.html';
    if (path.endsWith('/')) path += 'index.html';
    const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, safe);
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
}).listen(PORT, () => {
  console.log(`Preview → http://localhost:${PORT}/preview/`);
});
