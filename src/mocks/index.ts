import { setupFetchMock } from './adapter';
import { getDb, STORAGE_KEY } from './db';

export function initMocks() {
  getDb(); // runs schema migrations before the first request
  setupFetchMock();
  console.info(
    `%c[iClever Corporate] %cMock API active%c — demo data is stored in this browser (localStorage "${STORAGE_KEY}").`,
    'color: #4F46E5; font-weight: bold;',
    'background: #4F46E5; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
    'color: #64748B;',
  );
}
