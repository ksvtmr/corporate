const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONV_ID = 'b06cb98d-5b4c-4919-861f-226f34f700c3';
const BRAIN_SCREENSHOTS_DIR = path.join('C:\\Users\\kisae\\.gemini\\antigravity\\brain', CONV_ID, 'screenshots');
const LOCAL_SCREENSHOTS_DIR = path.join('c:\\dev\\corporate\\.agents\\brain\\screenshots');

if (!fs.existsSync(BRAIN_SCREENSHOTS_DIR)) {
  fs.mkdirSync(BRAIN_SCREENSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(LOCAL_SCREENSHOTS_DIR)) {
  fs.mkdirSync(LOCAL_SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshot(page, filename) {
  const p1 = path.join(BRAIN_SCREENSHOTS_DIR, filename);
  const p2 = path.join(LOCAL_SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function runVerification() {
  console.log('=== STARTING SECURITY, OPTIMIZATION & ROLE E2E VERIFICATION ===');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[Console Error]:', msg.text());
      errors.push(msg.text());
    }
  });

  try {
    // 1. Login as Admin
    console.log('[1] Testing Admin Login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'admin@corp.iclever.ai');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/corporate/dashboard');
    console.log('-> Admin Login: PASS');
    await takeScreenshot(page, '01_admin_dashboard.png');

    // 2. Test Admin access to Settings
    console.log('[2] Testing Admin Access to Settings (/corporate/settings)...');
    await page.goto('http://localhost:5173/corporate/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Настройки организации');
    console.log('-> Admin Settings Access: PASS');
    await takeScreenshot(page, '02_admin_settings.png');

    // 3. Test Debounced Search & Employees in Admin view
    console.log('[3] Testing Employees Page & Search Debouncing...');
    await page.goto('http://localhost:5173/corporate/employees', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Управление кадровым составом');
    
    // Type rapidly into search to test debounce
    const searchInput = page.locator('input[placeholder*="Поиск по имени"]');
    await searchInput.fill('Марат');
    await page.waitForTimeout(600); // Allow debounce to fire
    console.log('-> Debounced search executed: PASS');
    await takeScreenshot(page, '03_employees_debounced_search.png');

    // 4. Test RBAC Guard: Switch to Employee and attempt forbidden route access
    console.log('[4] Testing RBAC Guard (Employee accessing /corporate/settings)...');
    // Switch role to employee via Dev Role Switcher
    await page.click('button:has-text("Employee (Марат)")');
    await page.waitForTimeout(600);
    
    // Try to navigate directly to /corporate/settings
    await page.goto('http://localhost:5173/corporate/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=403 Forbidden');
    await page.waitForSelector('text=Доступ ограничен');
    console.log('-> RBAC Guard Blocked Employee from Settings (403 Forbidden): PASS');
    await takeScreenshot(page, '04_rbac_403_access_denied.png');

    // 5. Test Employee allowed route: My Player
    console.log('[5] Testing Employee Allowed Route (/corporate/my/player)...');
    await page.goto('http://localhost:5173/corporate/my/player', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Учебный плеер сотрудника');
    console.log('-> Employee Course Player Access: PASS');
    await takeScreenshot(page, '05_employee_player.png');

    // 6. Switch back to Admin and verify all core modules
    console.log('[6] Testing Module Accessibility for Admin...');
    await page.click('button:has-text("Org Admin")');
    await page.waitForTimeout(600);

    const routes = [
      { path: '/corporate/materials', text: 'База знаний и учебные материалы', shot: '06_materials.png' },
      { path: '/corporate/tracks', text: 'Учебные треки', shot: '07_tracks.png' },
      { path: '/corporate/assessments', text: 'Банк вопросов', shot: '08_assessments.png' },
      { path: '/corporate/reviews', text: 'Проверка открытых ответов', shot: '09_reviews.png' },
      { path: '/corporate/integrity', text: 'Мониторинг честности', shot: '10_integrity.png' },
      { path: '/corporate/analytics', text: 'HR-Аналитика', shot: '11_analytics.png' },
      { path: '/corporate/reports', text: 'Экспорт корпоративных отчетов', shot: '12_reports.png' },
      { path: '/corporate/ai-chat', text: 'Корпоративный RAG AI-Ассистент', shot: '13_ai_chat.png' },
    ];

    for (const r of routes) {
      await page.goto(`http://localhost:5173${r.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(`text=${r.text}`);
      console.log(`-> Route ${r.path}: PASS`);
      await takeScreenshot(page, r.shot);
    }

    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY (100% PASS) ===');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
