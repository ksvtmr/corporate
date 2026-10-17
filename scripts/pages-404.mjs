#!/usr/bin/env node
// Generates the site-wide 404.html for GitHub Pages.
//
// GitHub Pages serves a single /404.html for every unknown path, both for the
// production app (at the site root) and for pull-request previews (in pr-<N>/
// sub-folders). This page sends the browser to the right app root with the
// original route in `?__route=`, which src/main.tsx restores before routing.
//
//   node scripts/pages-404.mjs /corporate/ gh-pages/404.html

import { writeFileSync } from 'node:fs';

const [siteBase = '/', out = 'dist/404.html'] = process.argv.slice(2);
const root = '/' + siteBase.replace(/^\/+|\/+$/g, '');
const rootNoSlash = root === '/' ? '' : root;

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex">
<title>iClever Corporate</title>
<script>
(function () {
  var l = window.location;
  var root = ${JSON.stringify(rootNoSlash)};
  // Already redirected once and still not found (e.g. a removed preview): stop.
  if (/[?&]__route=/.test(l.search)) return;
  if (l.pathname.indexOf(root + '/') !== 0 && l.pathname !== root) return;
  var rest = l.pathname.slice(root.length) || '/';
  var m = rest.match(/^\\/(pr-\\d+)(\\/.*)?$/);
  var appRoot = root + (m ? '/' + m[1] : '');
  var route = m ? (m[2] || '/') : rest;
  l.replace(appRoot + '/?__route=' + encodeURIComponent(route + l.search) + l.hash);
})();
</script>
</head>
<body style="font-family: system-ui, sans-serif; padding: 2rem; color: #334155">
<p>Страница не найдена · Бет табылмады · Page not found</p>
<p><a href="${rootNoSlash}/">iClever Corporate</a></p>
</body>
</html>
`;

writeFileSync(out, html);
console.log(`wrote ${out} (site root ${root})`);
