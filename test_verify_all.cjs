const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\kisae\\.gemini\\antigravity\\brain\\7b2703bf-7295-4bf6-a7af-735dadf6f7f0\\screenshots';
const LOCAL_BRAIN_DIR = 'c:\\dev\\corporate\\.agents\\brain\\screenshots';

[ARTIFACT_DIR, LOCAL_BRAIN_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function saveScreen(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_BRAIN_DIR, filename);
  await page.screenshot({ path: p1, fullPage: true });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('--- 1. Testing Employee Role (employee@corp.iclever.ai) ---');
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);

  // Use quick-fill button for Employee
  await page.click('text=👤 Сотрудник (Марат Жумабаев)');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/corporate/dashboard');
  await page.waitForTimeout(1000);
  await saveScreen(page, 'v2_emp_01_dashboard.png');

  // Navigate to Player & Test
  await page.click('text=Пройти тест');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_emp_02_test.png');

  // Select test answers and submit
  const radio = page.locator('input[type="radio"]').first();
  if (await radio.count() > 0) {
    await radio.check();
  }
  await page.waitForTimeout(500);

  // Navigate to Flashcards
  await page.goto('http://localhost:5173/corporate/flashcards');
  await page.waitForTimeout(800);
  // Flip card
  await page.click('text=Нажмите для переворота');
  await page.waitForTimeout(500);
  await saveScreen(page, 'v2_emp_03_flashcards.png');

  // Navigate to AI Chat
  await page.goto('http://localhost:5173/corporate/ai-chat');
  await page.waitForTimeout(800);
  // Click quick suggestion chip
  await page.click('text=Как устроен Transactional Outbox?');
  await page.waitForTimeout(1500);
  await saveScreen(page, 'v2_emp_04_aichat.png');

  console.log('--- 2. Testing Manager Role (manager@corp.iclever.ai) ---');
  // Logout
  await page.click('button[title="Выйти"]');
  await page.waitForURL('**/login');
  await page.waitForTimeout(500);

  // Use quick-fill for Manager
  await page.click('text=👔 Руководитель (Виктор Ким)');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/corporate/dashboard');
  await page.waitForTimeout(1000);

  // Manager dashboard - test reminder toast
  await page.click('text=Напомнить о дедлайнах');
  await page.waitForTimeout(500);
  await saveScreen(page, 'v2_mgr_01_dashboard_toast.png');

  // Click on an engineer row to open modal
  await page.click('text=Марат Жумабаев');
  await page.waitForTimeout(500);
  await saveScreen(page, 'v2_mgr_02_engineer_modal.png');
  await page.click('text=Закрыть');
  await page.waitForTimeout(300);

  // Manager Team Employees
  await page.goto('http://localhost:5173/corporate/employees');
  await page.waitForTimeout(1000);
  await saveScreen(page, 'v2_mgr_03_team_employees.png');

  // Manager Team Assignments
  await page.goto('http://localhost:5173/corporate/assignments');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_mgr_04_assignments.png');

  console.log('--- 3. Testing Admin / HR Role (admin@corp.iclever.ai) ---');
  // Logout
  await page.click('button[title="Выйти"]');
  await page.waitForURL('**/login');
  await page.waitForTimeout(500);

  // Use quick-fill for Admin
  await page.click('text=🛡️ Администратор / HR (Алина Садыкова)');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/corporate/dashboard');
  await page.waitForTimeout(1000);
  await saveScreen(page, 'v2_adm_01_dashboard.png');

  // Materials Page
  await page.goto('http://localhost:5173/corporate/materials');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_adm_02_materials.png');

  // Tracks Page
  await page.goto('http://localhost:5173/corporate/tracks');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_adm_03_tracks.png');

  // Cohorts Page
  await page.goto('http://localhost:5173/corporate/cohorts');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_adm_04_cohorts.png');

  // Assessments Page
  await page.goto('http://localhost:5173/corporate/assessments');
  await page.waitForTimeout(800);
  // Open Create Question Modal
  await page.click('text=Создать вопрос');
  await page.waitForTimeout(500);
  await saveScreen(page, 'v2_adm_05_create_question_modal.png');
  await page.click('text=Отмена');
  await page.waitForTimeout(300);

  // Reviews Page
  await page.goto('http://localhost:5173/corporate/reviews');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_adm_06_reviews.png');

  // Integrity Page
  await page.goto('http://localhost:5173/corporate/integrity');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_adm_07_integrity.png');

  // Reports Page
  await page.goto('http://localhost:5173/corporate/reports');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_adm_08_reports.png');

  // Departments Page
  await page.goto('http://localhost:5173/corporate/departments');
  await page.waitForTimeout(800);
  await saveScreen(page, 'v2_adm_09_departments.png');

  console.log('All tests completed successfully!');
  await browser.close();
})();
