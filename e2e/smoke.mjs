#!/usr/bin/env node
// Post-deployment smoke test: proves that a deployed URL serves the expected
// build and that the critical path (deep link → login → protected page →
// refresh) works in a real browser.
//
//   SMOKE_URL=https://ksvtmr.github.io/corporate/ \
//   SMOKE_EXPECT_VERSION=<commit sha> \
//   SMOKE_EXPECT_ENV=production|preview \
//   node e2e/smoke.mjs
//
// SMOKE_LOGIN=false skips the demo-account login (for builds with the real
// backend, where demo accounts do not exist). Read-only: it never changes data
// outside the test browser's own storage.

import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';

const url = (process.env.SMOKE_URL || 'http://localhost:4173/').replace(/\/?$/, '/');
const expectVersion = process.env.SMOKE_EXPECT_VERSION || '';
const expectEnv = process.env.SMOKE_EXPECT_ENV || '';
const doLogin = process.env.SMOKE_LOGIN !== 'false';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_SECONDS || 300) * 1000;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

// 1. Wait until the CDN serves the new build (GitHub Pages needs ~1 minute).
const started = Date.now();
let html = '';
let lastProblem = '';
for (;;) {
  try {
    const res = await fetch(`${url}?smoke=${Date.now()}`, { cache: 'no-store' });
    html = await res.text();
    const version = html.match(/<meta name="app-version" content="([^"]*)"/)?.[1] ?? '';
    if (!res.ok) lastProblem = `HTTP ${res.status}`;
    else if (expectVersion && version !== expectVersion) lastProblem = `serves version "${version || 'unknown'}", waiting for "${expectVersion}"`;
    else break;
  } catch (err) {
    lastProblem = err.message;
  }
  if (Date.now() - started > timeoutMs) fail(`${url} is not serving the expected build: ${lastProblem}`);
  await sleep(10_000);
}
console.log(`✓ ${url} responds with the expected build${expectVersion ? ` (${expectVersion.slice(0, 7)})` : ''}`);

// 2. Static assets referenced by the page load.
const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => new URL(m[1], url).href);
if (!assets.length) fail('index.html references no JS/CSS assets');
for (const asset of assets) {
  const res = await fetch(asset);
  if (!res.ok) fail(`asset ${asset} → HTTP ${res.status}`);
}
console.log(`✓ ${assets.length} entry assets load`);

// 3. Browser journey.
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(`${url}corporate/employees`);
  await page.waitForURL(/\/login(\?|$)/, { timeout: 30_000 }).catch(() => fail(`deep link did not reach the login page (at ${page.url()})`));
  console.log('✓ deep link to a protected page redirects to login');

  const badge = await page.locator('[data-environment=preview]').count();
  if (expectEnv === 'preview' && !badge) fail('preview build does not show the preview badge');
  if (expectEnv === 'production' && badge) fail('production build shows the preview badge');
  if (expectEnv) console.log(`✓ environment marker matches "${expectEnv}"`);

  if (doLogin) {
    await page.fill('input[type=email]', 'admin@corp.iclever.ai');
    await page.fill('input[autocomplete=current-password]', 'Password123!');
    await page.click('button[type=submit]');
    await page.waitForURL(/\/corporate\/employees/, { timeout: 30_000 }).catch(() => fail(`login did not return to the requested page (at ${page.url()})`));
    await page.waitForSelector('table', { timeout: 30_000 });
    await page.reload();
    await page.waitForSelector('table', { timeout: 30_000 }).catch(() => fail('page refresh on a deep link lost the page or the session'));
    console.log('✓ demo login, protected page and refresh work');
  }
  if (errors.length) fail(`uncaught page errors: ${errors.join(' | ')}`);
} finally {
  await browser.close();
}
console.log('\nSmoke test passed.');
