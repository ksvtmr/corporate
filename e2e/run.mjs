#!/usr/bin/env node
// End-to-end browser tests for the critical user journeys (Playwright library).
//
//   npm run test:e2e                # builds, starts `vite preview`, runs all scenarios
//   E2E_BASE_URL=http://host npm run test:e2e:run   # against an already running build
//
// Uses PLAYWRIGHT_CHROMIUM_EXECUTABLE when set (e.g. a pre-installed Chromium).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.E2E_PORT || 4179);
let BASE = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;
const PASSWORD = 'Password123!';
const results = [];
const consoleProblems = [];
let server;
let lastPage = null;

async function startServer() {
  if (process.env.E2E_BASE_URL) return;
  const alreadyUp = await fetch(BASE).then(() => true, () => false);
  if (alreadyUp) throw new Error(`port ${PORT} is already serving something; stop it or set E2E_PORT`);
  // Run vite's CLI directly with node so that kill() stops the server itself.
  const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
  let exited = false;
  server.on('exit', () => (exited = true));
  server.stderr.on('data', (d) => process.stderr.write(d));
  for (let i = 0; i < 60; i++) {
    if (exited) throw new Error(`preview server exited (is port ${PORT} already in use?)`);
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error('preview server did not start');
}

async function newPage(browser, { locale = 'ru', viewport = { width: 1366, height: 860 } } = {}) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((loc) => {
    if (!localStorage.getItem('iclever_locale')) localStorage.setItem('iclever_locale', loc);
  }, locale);
  const page = await context.newPage();
  lastPage = page;
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleProblems.push(`${page.url()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleProblems.push(`${page.url()}: ${err.message}`));
  return { context, page };
}

async function login(page, email, password = PASSWORD) {
  await page.goto(`${BASE}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type=submit]').click();
}

async function logout(page) {
  await page.evaluate(async () => {
    const token = localStorage.getItem('iclever_token');
    if (token) await fetch('/api/v1/identity/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    localStorage.removeItem('iclever_token');
    localStorage.removeItem('iclever_active_org_id');
  });
}

async function expectNoMissingTranslations(page) {
  const missing = await page.evaluate(() => window.__I18N_MISSING__ || []);
  if (missing.length) throw new Error(`missing translations: ${missing.join(', ')}`);
}

async function scenario(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - started, error: err.message });
    console.log(`✗ ${name}\n    ${err.message.split('\n').slice(0, 3).join('\n    ')}`);
    if (lastPage && process.env.E2E_SCREENSHOT_DIR) {
      await lastPage.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/${results.length}.png`, fullPage: true }).catch(() => undefined);
    }
  }
}

async function main() {
  await startServer();
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });

  await scenario('unauthenticated users are redirected to login; wrong password is rejected with a localized error', async () => {
    const { context, page } = await newPage(browser);
    await page.goto(`${BASE}/corporate/employees`);
    await page.waitForURL('**/login');
    await login(page, 'admin@corp.iclever.ai', 'WrongPassword1');
    await page.getByRole('alert').getByText('Неверный email или пароль').waitFor();
    await login(page, 'unknown.person@evil.com', 'Whatever123');
    await page.getByRole('alert').getByText('Неверный email или пароль').waitFor();
    await context.close();
  });

  await scenario('a new company can register, stays signed in after refresh and can sign out', async () => {
    const { context, page } = await newPage(browser);
    await page.goto(`${BASE}/register`);
    const email = `founder.${Date.now()}@newco.kz`;
    await page.getByLabel('Название компании').fill('NewCo E2E');
    await page.getByLabel('Имя').fill('Айдана');
    await page.getByLabel('Фамилия').fill('Ержанова');
    await page.getByLabel('Рабочий email').fill(email);
    await page.getByLabel('Пароль', { exact: true }).fill('Secret1234');
    await page.getByLabel('Повторите пароль').fill('Secret1234');
    await page.getByRole('button', { name: 'Создать организацию' }).click();
    await page.waitForURL('**/corporate/dashboard');
    await page.getByRole('heading', { name: 'Корпоративный дашборд' }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Корпоративный дашборд' }).waitFor();
    // The founder appears in their own (isolated) employee directory.
    await page.goto(`${BASE}/corporate/employees`);
    await page.getByText(email).waitFor();
    const rows = await page.locator('table tbody tr').count();
    if (rows !== 1) throw new Error(`expected 1 member in the new tenant, got ${rows}`);
    await page.getByRole('button', { name: 'Выйти' }).first().click();
    await page.waitForURL('**/login');
    await context.close();
  });

  await scenario('admin invites an employee who appears in the directory at once, persists after refresh and can accept the invitation', async () => {
    const { context, page } = await newPage(browser);
    await login(page, 'admin@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    await page.goto(`${BASE}/corporate/employees`);
    await page.getByRole('button', { name: 'Пригласить' }).click();
    await page.getByLabel('Email сотрудника').fill('e2e.newhire@fintech.kz');
    await page.getByText('Одноразовая ссылка').click();
    await page.getByRole('button', { name: 'Сгенерировать ссылку' }).click();
    const inviteLink = await page.getByLabel('Ссылка-приглашение').inputValue();
    if (!inviteLink.includes('/invite?token=')) throw new Error(`unexpected invite link ${inviteLink}`);
    await page.getByRole('dialog').getByRole('button', { name: 'Закрыть', exact: true }).last().click();
    await page.getByPlaceholder('Поиск по имени, email, должности…').fill('e2e.newhire');
    await page.locator('table').getByText('e2e.newhire@fintech.kz').waitFor();
    await page.reload();
    await page.getByPlaceholder('Поиск по имени, email, должности…').fill('e2e.newhire');
    await page.locator('table').getByText('e2e.newhire@fintech.kz').waitFor();
    await page.locator('tr', { hasText: 'e2e.newhire@fintech.kz' }).getByText('Приглашён').waitFor();

    // The invitee opens the link (same browser storage = same demo backend).
    await logout(page);
    const url = new URL(inviteLink);
    await page.goto(`${BASE}/invite${url.search}`);
    await page.getByLabel('Имя').fill('Ерлан');
    await page.getByLabel('Фамилия').fill('Ахметов');
    await page.getByLabel('Придумайте пароль').fill('Welcome1234');
    await page.getByRole('button', { name: 'Принять приглашение' }).click();
    await page.waitForURL('**/corporate/dashboard');
    await page.getByText('Здравствуйте, Ерлан!').waitFor();
    // The link is single-use.
    await logout(page);
    await page.goto(`${BASE}/invite${url.search}`);
    await page.getByRole('heading', { name: 'Приглашение недоступно' }).waitFor();
    await context.close();
  });

  await scenario('employees cannot open admin sections (403 screen) and do not see admin navigation', async () => {
    const { context, page } = await newPage(browser);
    await login(page, 'employee@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    if (await page.getByRole('link', { name: 'Сотрудники' }).count()) throw new Error('employee sees admin navigation');
    await page.goto(`${BASE}/corporate/settings`);
    await page.getByRole('heading', { name: 'Доступ ограничен' }).waitFor();
    // Tampering with client storage must not grant privileges.
    await page.evaluate(() => localStorage.setItem('iclever_active_role', 'org_admin'));
    await page.goto(`${BASE}/corporate/employees`);
    await page.getByRole('heading', { name: 'Доступ ограничен' }).waitFor();
    await context.close();
  });

  await scenario('switching RU → KK → EN updates the whole interface, persists across reloads and has no missing keys', async () => {
    const { context, page } = await newPage(browser);
    await login(page, 'admin@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    await page.getByRole('button', { name: 'Қазақша' }).first().click();
    await page.getByRole('link', { name: 'Қызметкерлер' }).waitFor();
    await page.reload();
    await page.getByRole('link', { name: 'Қызметкерлер' }).waitFor();
    if ((await page.evaluate(() => document.documentElement.lang)) !== 'kk') throw new Error('html lang not updated');
    await page.getByRole('button', { name: 'English' }).first().click();
    await page.getByRole('link', { name: 'Employees' }).waitFor();
    await page.waitForLoadState('networkidle');
    for (const path of ['dashboard', 'employees', 'departments', 'materials', 'tracks', 'cohorts', 'assignments', 'assessments', 'reviews', 'integrity', 'analytics', 'reports', 'settings']) {
      await page.goto(`${BASE}/corporate/${path}`);
      await page.locator('h1').first().waitFor();
      const cyr = await page.evaluate(() => {
        // Personal names and org data are data, not UI; check only static UI chrome.
        const nav = document.querySelector('nav')?.textContent || '';
        const h1 = document.querySelector('h1')?.textContent || '';
        return /[Ѐ-ӿ]/.test(nav + h1);
      });
      if (cyr) throw new Error(`Cyrillic UI text on /${path} in English mode`);
    }
    await expectNoMissingTranslations(page);
    // The preference is stored on the user profile: after clearing the device choice
    // and signing in again, the saved language is applied.
    await logout(page);
    await page.evaluate(() => localStorage.removeItem('iclever_locale'));
    await login(page, 'admin@corp.iclever.ai');
    await page.getByRole('link', { name: 'Employees' }).waitFor();
    await context.close();
  });

  await scenario('assessment in English is scored from real answers and the open answer reaches the admin review queue', async () => {
    const { context, page } = await newPage(browser, { locale: 'en' });
    await login(page, 'employee@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    await page.goto(`${BASE}/corporate/my/player?view=test`);
    await page.getByRole('button', { name: /^(Start test|Retake)$/ }).click();
    await page.getByText('In the Use Case (or Domain) layer').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByText('Atomically saving to the database').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('textarea').fill('The domain must stay independent of infrastructure, so we can unit test it without a database and swap the storage later.');
    // Autosave: answers survive a reload mid-test.
    await page.reload();
    await page.getByRole('button', { name: /Question 3: answered/ }).waitFor();
    await page.getByRole('button', { name: /Question 3/ }).click();
    await page.getByRole('button', { name: 'Finish test' }).click();
    await page.getByText('You have answered every question').waitFor();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByText('Test passed').waitFor();
    await page.getByRole('heading', { name: '100%' }).waitFor();

    await logout(page);
    await login(page, 'admin@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    await page.goto(`${BASE}/corporate/reviews`);
    await page.getByText('Open answer: why must the domain layer not import SQL drivers or ORM structures?').first().waitFor();
    await page.getByText('The domain must stay independent of infrastructure').first().waitFor();
    await context.close();
  });

  await scenario('suspending an employee in the admin panel blocks their sign-in', async () => {
    const { context, page } = await newPage(browser);
    await login(page, 'admin@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    await page.goto(`${BASE}/corporate/employees`);
    await page.getByPlaceholder('Поиск по имени, email, должности…').fill('alex.p@');
    await page.getByRole('button', { name: /Александр Петров/ }).click();
    await page.getByRole('button', { name: 'Приостановить доступ' }).click();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Подтвердить' }).click();
    await page.getByText('Доступ сотрудника Александр Петров приостановлен').waitFor();
    await logout(page);
    await login(page, 'alex.p@fintech.kz');
    await page.getByRole('alert').getByText('Доступ к организации приостановлен', { exact: false }).waitFor();
    await context.close();
  });

  await scenario('demo role switcher signs in as another account (server session, not a UI override)', async () => {
    const { context, page } = await newPage(browser);
    await login(page, 'admin@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    await page.getByRole('group', { name: 'Демо: сменить роль' }).getByRole('button', { name: /Сотрудник/ }).click();
    await page.getByText('Здравствуйте, Марат!').waitFor();
    const role = await page.evaluate(async () => {
      const res = await fetch('/api/v1/identity/me', { headers: { Authorization: `Bearer ${localStorage.getItem('iclever_token')}` } });
      return (await res.json()).data.active_member.role;
    });
    if (role !== 'employee') throw new Error(`server session role is ${role}`);
    await context.close();
  });

  await scenario('mobile layout: menu, navigation and sign-out work without horizontal scrolling', async () => {
    const { context, page } = await newPage(browser, { viewport: { width: 375, height: 760 } });
    await login(page, 'hr@corp.iclever.ai');
    await page.waitForURL('**/corporate/dashboard');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`horizontal overflow of ${overflow}px`);
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await page.locator('#mobile-menu').getByRole('link', { name: 'Сотрудники' }).click();
    await page.waitForURL('**/corporate/employees');
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await page.locator('#mobile-menu').getByRole('button', { name: 'Выйти' }).click();
    await page.waitForURL('**/login');
    await context.close();
  });

  await browser.close();
  server?.kill();

  const failed = results.filter((r) => !r.ok);
  if (consoleProblems.length) {
    console.log(`\nBrowser console errors (${consoleProblems.length}):`);
    for (const p of consoleProblems) console.log(`  - ${p}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`);
  process.exit(failed.length || consoleProblems.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  server?.kill();
  process.exit(1);
});
