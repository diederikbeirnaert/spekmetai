// Lokale testserver: `node server.js` en surf naar http://localhost:8080
// Geen dependencies nodig. Toont ook je netwerkadres om met je gsm mee te spelen.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = +process.env.PORT || 8080;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    // Zoals GitHub Pages: onbekende paden krijgen 404.html (die stuurt korte weekendlinks door).
    if (err) return res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(fs.readFileSync(path.join(ROOT, '404.html')));
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => {
  const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal);
  console.log(`\n  🍳 SpekmetAI draait!\n\n  Op deze computer:  http://localhost:${PORT}`);
  if (lan) console.log(`  Op je gsm (zelfde wifi): http://${lan.address}:${PORT}`);
  console.log('\n  Stoppen: Ctrl+C\n');
});
