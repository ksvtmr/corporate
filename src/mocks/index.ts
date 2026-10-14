import { setupFetchMock } from './adapter';

export function initMocks() {
  const useMock = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK !== 'false';

  if (useMock) {
    setupFetchMock();
    console.info(
      '%c[iClever Corporate] %cMock API Active %c\n- Local test login: admin@corp.iclever.ai / Password123!\n- Data persisted in localStorage ("iclever_mock_db")',
      'color: #4F46E5; font-weight: bold;',
      'background: #4F46E5; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
      'color: #64748B;'
    );
  }
}

export * from './store';
export * from './data/seed';
