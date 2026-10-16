import type { Role } from './permissions';

/** True when the bundled mock API is active (offline demo / GitHub Pages). */
export const IS_DEMO_MODE = import.meta.env?.VITE_USE_MOCK !== 'false';

/**
 * Demo accounts for the login quick-fill and the demo role switcher. They only
 * exist in the mock backend; with a real backend (VITE_USE_MOCK=false) the
 * switcher and quick-fill are not rendered.
 */
export const DEMO_ACCOUNTS: Array<{ role: Role; email: string; name: string }> = [
  { role: 'org_admin', email: 'admin@corp.iclever.ai', name: 'Алина Садыкова' },
  { role: 'hr_manager', email: 'hr@corp.iclever.ai', name: 'Динара Касымова' },
  { role: 'manager', email: 'manager@corp.iclever.ai', name: 'Виктор Ким' },
  { role: 'trainer', email: 'trainer@corp.iclever.ai', name: 'Елена Воронова' },
  { role: 'employee', email: 'employee@corp.iclever.ai', name: 'Марат Жумабаев' },
];
export const DEMO_PASSWORD = 'Password123!';
