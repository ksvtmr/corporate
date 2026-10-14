const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\kisae\\.gemini\\antigravity\\brain\\7b2703bf-7295-4bf6-a7af-735dadf6f7f0\\screenshots';
const LOCAL_SCREENSHOT_DIR = 'c:\\dev\\corporate\\.agents\\brain\\screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(LOCAL_SCREENSHOT_DIR)) fs.mkdirSync(LOCAL_SCREENSHOT_DIR, { recursive: true });

async function saveScreen(page, filename) {
  const p1 = path.join(SCREENSHOT_DIR, filename);
  const p2 = path.join(LOCAL_SCREENSHOT_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function runAudit() {
  console.log('--- STARTING CURRENT STATE ROLE AUDIT ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[Browser Error]:', msg.text());
  });

  try {
    // 1. Employee Login Audit
    console.log('\n=== 1. TESTING EMPLOYEE (employee@corp.iclever.ai) ===');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'employee@corp.iclever.ai');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/corporate/dashboard');
    await page.waitForTimeout(1000);
    console.log('Employee dashboard reached! Current URL:', page.url());

    const empName = await page.locator('h1').textContent();
    console.log('Employee Dashboard Heading:', empName);
    await saveScreen(page, 'emp_01_dashboard.png');

    // Check Employee Navigation items
    const empNav = await page.locator('aside nav a').allTextContents();
    console.log('Employee Nav Items:', empNav);

    // Test Player
    console.log('Navigating to Player...');
    await page.click('a[href="/corporate/my/player"]');
    await page.waitForURL('**/corporate/my/player');
    await page.waitForTimeout(500);
    await saveScreen(page, 'emp_02_player.png');

    // Test Flashcards
    console.log('Navigating to Flashcards...');
    await page.click('a[href="/corporate/flashcards"]');
    await page.waitForURL('**/corporate/flashcards');
    await page.waitForTimeout(500);
    await saveScreen(page, 'emp_03_flashcards.png');

    // Test AI Chat
    console.log('Navigating to AI Chat...');
    await page.click('a[href="/corporate/ai-chat"]');
    await page.waitForURL('**/corporate/ai-chat');
    await page.waitForTimeout(500);
    await saveScreen(page, 'emp_04_aichat.png');

    // Logout
    console.log('Logging out...');
    await page.click('button[title="Выйти"]');
    await page.waitForURL('**/login');
    console.log('Employee logged out successfully.');

    // 2. Manager Login Audit
    console.log('\n=== 2. TESTING MANAGER (manager@corp.iclever.ai) ===');
    await page.fill('input[type="email"]', 'manager@corp.iclever.ai');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/corporate/dashboard');
    await page.waitForTimeout(1000);
    console.log('Manager dashboard reached! Current URL:', page.url());

    const mgrName = await page.locator('h1').textContent();
    console.log('Manager Dashboard Heading:', mgrName);
    await saveScreen(page, 'mgr_01_dashboard.png');

    const mgrNav = await page.locator('aside nav a').allTextContents();
    console.log('Manager Nav Items:', mgrNav);

    // Test Employees (Team)
    console.log('Navigating to Team Employees...');
    await page.click('a[href="/corporate/employees"]');
    await page.waitForURL('**/corporate/employees');
    await page.waitForTimeout(500);
    await saveScreen(page, 'mgr_02_employees.png');

    // Test Assignments
    console.log('Navigating to Assignments...');
    await page.click('a[href="/corporate/assignments"]');
    await page.waitForURL('**/corporate/assignments');
    await page.waitForTimeout(500);
    await saveScreen(page, 'mgr_03_assignments.png');

    // Test Analytics
    console.log('Navigating to Analytics...');
    await page.click('a[href="/corporate/analytics"]');
    await page.waitForURL('**/corporate/analytics');
    await page.waitForTimeout(500);
    await saveScreen(page, 'mgr_04_analytics.png');

    // Logout
    await page.click('button[title="Выйти"]');
    await page.waitForURL('**/login');
    console.log('Manager logged out successfully.');

    // 3. Admin Login Audit
    console.log('\n=== 3. TESTING ADMIN (admin@corp.iclever.ai) ===');
    await page.fill('input[type="email"]', 'admin@corp.iclever.ai');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/corporate/dashboard');
    await page.waitForTimeout(1000);
    console.log('Admin dashboard reached! Current URL:', page.url());

    const admName = await page.locator('h1').textContent();
    console.log('Admin Dashboard Heading:', admName);
    await saveScreen(page, 'adm_01_dashboard.png');

    const admNav = await page.locator('aside nav a').allTextContents();
    console.log('Admin Nav Items count:', admNav.length);

    console.log('\n--- INITIAL AUDIT COMPLETE ---');
  } catch (err) {
    console.error('Audit failed with error:', err);
    await saveScreen(page, 'audit_error.png').catch(() => {});
  } finally {
    await browser.close();
  }
}

runAudit();
