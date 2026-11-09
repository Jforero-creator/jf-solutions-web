// Servidor estático local que imita lo esencial de Vercel para las pruebas:
// trailingSlash (308 a la ruta con /), index.html por carpeta y cabeceras de vercel.json.
//   node dev/experiencia/tests/serve.mjs [puerto] [--csp archivo-vercel.json]
// --csp permite probar con las cabeceras de seguridad del PR #6 sin fusionarlo.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const port = +(process.argv[2] || 8810);
const ci = process.argv.indexOf('--csp');
const cfgPath = ci > -1 ? process.argv[ci + 1] : join(root, 'vercel.json');
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
const rules = (cfg.headers || []).map((r) => [new RegExp('^' + r.source.replace('(.*)', '.*') + '$'), r.headers]);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.vtt': 'text/vtt; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.xml': 'application/xml', '.txt': 'text/plain' };

createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  for (const [rx, hs] of rules) if (rx.test(path)) for (const h of hs) res.setHeader(h.key, h.value);
  let f = join(root, path);
  if (existsSync(f) && statSync(f).isDirectory()) {
    if (!path.endsWith('/')) { res.writeHead(308, { Location: path + '/' }); return res.end(); }
    f = join(f, 'index.html');
  }
  if (path.startsWith('/_vercel/')) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(''); }
  if (!existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
