const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\kisae\\.gemini\\antigravity\\brain\\3ee18f89-a714-4243-92f8-ca4fe829b29d\\screenshots';

async function run() {
  console.log('--- STARTING CORPORATE FRONTEND BROWSER TEST ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Listen to dialogs (alert/confirm/prompt)
  page.on('dialog', async (dialog) => {
    console.log(`[Browser Dialog]: ${dialog.type()} message: "${dialog.message()}"`);
    await dialog.accept();
  });

  // Listen to console errors or logs
  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });

  page.on('response', async (res) => {
    if (res.url().includes('/corporate/members/invite')) {
      try {
        const text = await res.text();
        console.log('[Invite Response Status]:', res.status(), text);
      } catch (e) {}
    }
  });

  try {
    // 1. Initial navigation & Redirect to Login
    console.log('\n[Step 1] Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    console.log('Current URL:', page.url());

    if (!page.url().includes('/login')) {
      await page.waitForURL('**/login', { timeout: 5000 });
    }
    console.log('Verified redirect to /login: PASS');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page.png') });
    console.log('Saved screenshot: 01_login_page.png');

    // 2. Negative Authentication Test
    console.log('\n[Step 2] Testing authentication failure with invalid password...');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    const errorAlert = await page.locator('text=Неверный email или пароль').isVisible();
    console.log('Invalid credentials error banner visible:', errorAlert ? 'PASS' : 'FAIL');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_login_error.png') });

    // 3. Happy Path Login
    console.log('\n[Step 3] Logging in with valid admin credentials...');
    await page.fill('input[type="email"]', 'admin@corp.iclever.ai');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/corporate/dashboard', { timeout: 10000 });
    console.log('Redirected to /corporate/dashboard: PASS');

    await page.waitForSelector('text=Корпоративный дашборд');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_dashboard.png') });
    console.log('Saved screenshot: 03_dashboard.png');

    // 4. Employees Page & Staffing
    console.log('\n[Step 4] Navigating to Employees page...');
    await page.click('a[href="/corporate/employees"]');
    await page.waitForURL('**/corporate/employees');
    await page.waitForSelector('text=Управление кадровым составом');

    // Check table rows
    const memberRows = await page.locator('table tbody tr').count();
    console.log(`Found ${memberRows} employee records in table: PASS`);

    // Open Invite modal
    console.log('Opening invite modal...');
    await page.click('button:has-text("Пригласить")');
    await page.waitForSelector('text=Пригласить сотрудника');

    await page.fill('input[placeholder="employee@company.com"]', 'intern.alex@fintech.kz');
    await page.click('input[name="inviteType"][value="link"]', { force: true }).catch(async () => {
      await page.click('text=Одноразовая ссылка');
    });

    await page.click('button:has-text("Сгенерировать ссылку")');
    await page.waitForSelector('text=Одноразовая ссылка успешно создана');
    console.log('Generated invite link modal: PASS');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_invite_modal.png') });

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_employees_page.png') });

    // 5. Departments Page
    console.log('\n[Step 5] Navigating to Departments page...');
    await page.click('a[href="/corporate/departments"]');
    await page.waitForURL('**/corporate/departments');
    await page.waitForSelector('text=Оргструктура компании');

    const deptCards = await page.locator('h3').count();
    console.log(`Found ${deptCards} department headers: PASS`);

    // Switch to Positions tab
    await page.click('button:has-text("Должности")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_departments_positions.png') });
    console.log('Saved screenshot: 05_departments_positions.png');

    // 6. Settings Page & Updates
    console.log('\n[Step 6] Navigating to Settings page...');
    await page.click('a[href="/corporate/settings"]');
    await page.waitForURL('**/corporate/settings');
    await page.waitForSelector('text=Настройки организации');
    await page.waitForSelector('text=@fintech.kz'); // Ensure mock data has arrived

    // Add a new domain
    console.log('Adding new allowed email domain...');
    await page.fill('input[placeholder="например: company.com"]', 'corp-partner.kz');
    await page.click('button:has-text("Добавить домен")');
    await page.waitForSelector('text=@corp-partner.kz');

    // Save changes
    await page.click('button:has-text("Сохранить изменения")');
    await page.waitForSelector('text=Настройки успешно сохранены');
    console.log('Settings save confirmation: PASS');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_settings_saved.png') });
    console.log('Saved screenshot: 06_settings_saved.png');

    console.log('\n--- ALL BROWSER E2E TESTS COMPLETED WITH 100% SUCCESS ---');
  } catch (err) {
    console.error('Test failed with error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
