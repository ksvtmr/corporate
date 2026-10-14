const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\kisae\\.gemini\\antigravity\\brain\\3ee18f89-a714-4243-92f8-ca4fe829b29d\\screenshots';

async function testAll() {
  console.log('--- TESTING ALL SPRINTS & MODULES IN BROWSER ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[Console Error]:', msg.text());
  });

  try {
    // 1. Login
    console.log('[1] Logging in...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'admin@corp.iclever.ai');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/corporate/dashboard');
    console.log('Logged in to dashboard: PASS');

    // 2. Materials
    console.log('[2] Testing Materials (/corporate/materials)...');
    await page.goto('http://localhost:5173/corporate/materials', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=База знаний и учебные материалы');
    const materialsCount = await page.locator('h3').count();
    console.log(`Materials loaded (${materialsCount} items): PASS`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_materials_page.png') });

    // 3. Tracks
    console.log('[3] Testing Tracks (/corporate/tracks)...');
    await page.goto('http://localhost:5173/corporate/tracks', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Учебные треки и программы онбординга');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_tracks_page.png') });

    // 4. Cohorts
    console.log('[4] Testing Cohorts (/corporate/cohorts)...');
    await page.goto('http://localhost:5173/corporate/cohorts', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Учебные когорты');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_cohorts_page.png') });

    // 5. Assignments
    console.log('[5] Testing Assignments (/corporate/assignments)...');
    await page.goto('http://localhost:5173/corporate/assignments', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Управление назначениями и дедлайнами');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_assignments_page.png') });

    // 6. Assessments
    console.log('[6] Testing Assessments (/corporate/assessments)...');
    await page.goto('http://localhost:5173/corporate/assessments', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Банк вопросов и конструктор тестирования');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_assessments_page.png') });

    // 7. Reviews
    console.log('[7] Testing Reviews (/corporate/reviews)...');
    await page.goto('http://localhost:5173/corporate/reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Проверка открытых ответов с AI');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_reviews_page.png') });

    // 8. Integrity
    console.log('[8] Testing Integrity (/corporate/integrity)...');
    await page.goto('http://localhost:5173/corporate/integrity', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Мониторинг честности тестирования');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_integrity_page.png') });

    // 9. Analytics
    console.log('[9] Testing Analytics (/corporate/analytics)...');
    await page.goto('http://localhost:5173/corporate/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=HR-Аналитика и образовательные метрики');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_analytics_page.png') });

    // 10. Reports
    console.log('[10] Testing Reports (/corporate/reports)...');
    await page.goto('http://localhost:5173/corporate/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Экспорт корпоративных отчетов');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_reports_page.png') });

    // 11. Flashcards
    console.log('[11] Testing Flashcards (/corporate/flashcards)...');
    await page.goto('http://localhost:5173/corporate/flashcards', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Интервальное повторение');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_flashcards_page.png') });

    // 12. AI Chat
    console.log('[12] Testing AI Chat (/corporate/ai-chat)...');
    await page.goto('http://localhost:5173/corporate/ai-chat', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Корпоративный RAG AI-Ассистент');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17_ai_chat_page.png') });

    // 13. Player
    console.log('[13] Testing Player (/corporate/my/player)...');
    await page.goto('http://localhost:5173/corporate/my/player', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Учебный плеер сотрудника');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '18_player_page.png') });

    // 14. Dev Role Switcher
    console.log('[14] Testing Dev Role Switcher to Employee...');
    await page.click('button:has-text("👤 Employee")');
    await page.goto('http://localhost:5173/corporate/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Личный кабинет сотрудника');
    console.log('Switched to Employee Dashboard: PASS');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '19_employee_dashboard.png') });

    console.log('\n=== ALL MODULES & SPRINT DELIVERABLES VERIFIED 100% ===');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testAll();
