#!/usr/bin/env node
// Minimal static server that behaves like GitHub Pages: serves files from a
// directory and answers unknown paths with the site-wide /404.html (status
// 404). Used to test the gh-pages layout (production + pr-<N>/ previews and
// deep-link handling) locally before relying on the real host.
//
//   node scripts/serve-pages.mjs <site-dir> [port=4300] [mount=/corporate]

import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const [dir, port = '4300', mount = '/corporate'] = process.argv.slice(2);
if (!dir) {
  console.error('usage: node scripts/serve-pages.mjs <site-dir> [port] [mount]');
  process.exit(2);
}
const root = path.resolve(dir);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = null;
    if (pathname === mount || pathname.startsWith(`${mount}/`)) {
      file = path.join(root, pathname.slice(mount.length));
      if (!file.startsWith(root)) file = null; // no path traversal
      else if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    }
    if (file && existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      return res.end(readFileSync(file));
    }
    const notFound = path.join(root, '404.html');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(existsSync(notFound) ? readFileSync(notFound) : 'Not found');
  })
  .listen(Number(port), '127.0.0.1', () => console.log(`GitHub Pages simulation: http://127.0.0.1:${port}${mount}/  (serving ${root})`));
