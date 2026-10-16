import type { LocalizedText, Locale } from '@/kit/i18n';
import type { MemberStatus, Role } from '@/kit/auth/permissions';

// Demo credentials: every seed account uses the password "Password123!".
// Only the salted SHA-256 hash is stored (see src/mocks/crypto.ts).
export const DEMO_PASSWORD_HASH = 'sha256:iclever-demo-salt:80adaea6502c443d68f321e8eae8efa52ec341999664e0bc40f2fab40cb46639';

export interface SeedUser {
  id: string;
  email: string;
  /** `sha256:<salt>:<hex>`; null until an invited user sets a password. */
  password_hash: string | null;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
  locale?: Locale;
  created_at?: string;
}

export interface SeedOrganization {
  id: string;
  name: string;
  legal_name?: string;
  domain?: string;
  allowed_domains: string[];
  logo_url?: string;
  brand_color: string;
  timezone: string;
  default_locale: Locale;
  plan_name: string;
  max_seats: number;
  storage_limit_mb: number;
  storage_used_mb: number;
}

export interface SeedOrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  status: MemberStatus;
  job_title?: string;
  department_id?: string;
  manager_name?: string;
  active_assignments_count: number;
  start_date?: string;
  created_at?: string;
}

export interface SeedDepartment {
  id: string;
  organization_id: string;
  parent_id?: string;
  /** Primary (legacy) name; `name_i18n` holds per-language variants. */
  name: string;
  name_i18n?: LocalizedText;
  code?: string;
  description?: string;
  description_i18n?: LocalizedText;
  manager_id?: string;
  manager_name?: string;
  archived_at?: string;
}

export interface SeedPosition {
  id: string;
  organization_id: string;
  title: string;
  code?: string;
  level?: string;
  description?: string;
  description_i18n?: LocalizedText;
}

const user = (id: string, email: string, first_name: string, last_name: string): SeedUser => ({
  id,
  email,
  password_hash: DEMO_PASSWORD_HASH,
  first_name,
  last_name,
  is_active: true,
});

export const initialUsers: SeedUser[] = [
  user('usr-admin-001', 'admin@corp.iclever.ai', 'Алина', 'Садыкова'),
  user('usr-emp-001', 'employee@corp.iclever.ai', 'Марат', 'Жумабаев'),
  user('usr-mgr-002', 'manager@corp.iclever.ai', 'Виктор', 'Ким'),
  user('usr-hr-011', 'hr@corp.iclever.ai', 'Динара', 'Касымова'),
  user('usr-004', 'daria.r@fintech.kz', 'Дарья', 'Романова'),
  user('usr-005', 'trainer@corp.iclever.ai', 'Елена', 'Воронова'),
  user('usr-006', 'marketing@fintech.kz', 'Айгерим', 'Касымова'),
  user('usr-007', 'alex.p@fintech.kz', 'Александр', 'Петров'),
  user('usr-008', 'nurlan.s@fintech.kz', 'Нурлан', 'Сейтов'),
  user('usr-009', 'dina.s@fintech.kz', 'Дина', 'Сабитова'),
  user('usr-010', 'alexey.s@fintech.kz', 'Алексей', 'Смирнов'),
];

export const initialOrganizations: SeedOrganization[] = [
  {
    id: 'org-fintech-01',
    name: 'Fintech Innovations Corp',
    legal_name: 'ТОО "Финтех Инновации Казахстан"',
    domain: 'fintech.kz',
    allowed_domains: ['fintech.kz', 'fintech.corp.ai', 'corp.iclever.ai'],
    brand_color: '#4F46E5',
    timezone: 'UTC+5',
    default_locale: 'ru',
    plan_name: 'Corporate Standard',
    max_seats: 200,
    storage_limit_mb: 10240,
    storage_used_mb: 1240,
  },
  {
    id: 'org-retail-02',
    name: 'Retail Group Central Asia',
    legal_name: 'ТОО "Ритейл Системс"',
    domain: 'retail.corp.kz',
    allowed_domains: ['retail.corp.kz'],
    brand_color: '#059669',
    timezone: 'UTC+5',
    default_locale: 'ru',
    plan_name: 'Corporate Starter',
    max_seats: 50,
    storage_limit_mb: 2048,
    storage_used_mb: 120,
  },
];

export const initialDepartments: SeedDepartment[] = [
  {
    id: 'dept-eng-01',
    organization_id: 'org-fintech-01',
    name: 'Инженерия и разработка',
    name_i18n: { ru: 'Инженерия и разработка', kk: 'Инженерия және әзірлеу', en: 'Engineering & Development' },
    code: 'ENG',
    description: 'Разработка микросервисов, фронтенда, QA и DevOps инфраструктуры',
    description_i18n: {
      ru: 'Разработка микросервисов, фронтенда, QA и DevOps инфраструктуры',
      kk: 'Микросервистерді, фронтендті әзірлеу, QA және DevOps инфрақұрылымы',
      en: 'Microservices, frontend, QA and DevOps infrastructure',
    },
    manager_id: 'mem-003',
    manager_name: 'Виктор Ким',
  },
  {
    id: 'dept-sales-02',
    organization_id: 'org-fintech-01',
    name: 'Продажи и клиентский сервис',
    name_i18n: { ru: 'Продажи и клиентский сервис', kk: 'Сату және клиенттерге қызмет көрсету', en: 'Sales & Customer Service' },
    code: 'SALES',
    description: 'B2B продажи корпоративным клиентам и сопровождение сделок',
    description_i18n: {
      ru: 'B2B продажи корпоративным клиентам и сопровождение сделок',
      kk: 'Корпоративтік клиенттерге B2B сату және мәмілелерді сүйемелдеу',
      en: 'B2B sales to corporate clients and deal support',
    },
    manager_name: 'Дарья Романова',
  },
  {
    id: 'dept-hr-03',
    organization_id: 'org-fintech-01',
    name: 'People & HR',
    name_i18n: { ru: 'Персонал и HR', kk: 'Персонал және HR', en: 'People & HR' },
    code: 'HR',
    description: 'Рекрутинг, онбординг, удержание и корпоративное обучение',
    description_i18n: {
      ru: 'Рекрутинг, онбординг, удержание и корпоративное обучение',
      kk: 'Рекрутинг, онбординг, қызметкерлерді ұстап қалу және корпоративтік оқыту',
      en: 'Recruiting, onboarding, retention and corporate learning',
    },
    manager_id: 'mem-001',
    manager_name: 'Алина Садыкова',
  },
  {
    id: 'dept-fin-04',
    organization_id: 'org-fintech-01',
    name: 'Финансы и комплаенс',
    name_i18n: { ru: 'Финансы и комплаенс', kk: 'Қаржы және комплаенс', en: 'Finance & Compliance' },
    code: 'FIN',
    description: 'Финансовое планирование, бухгалтерский учет и аудит безопасности',
    description_i18n: {
      ru: 'Финансовое планирование, бухгалтерский учет и аудит безопасности',
      kk: 'Қаржылық жоспарлау, бухгалтерлік есеп және қауіпсіздік аудиті',
      en: 'Financial planning, accounting and security audit',
    },
    manager_name: 'Динара Касымова',
  },
];

export const initialPositions: SeedPosition[] = [
  {
    id: 'pos-01', organization_id: 'org-fintech-01', title: 'Go Backend Developer', code: 'DEV-GO', level: 'Middle',
    description_i18n: { ru: 'Разработка распределенных бэкенд-сервисов на Go', kk: 'Go тілінде таратылған бэкенд-сервистерді әзірлеу', en: 'Building distributed backend services in Go' },
  },
  {
    id: 'pos-02', organization_id: 'org-fintech-01', title: 'React Frontend Developer', code: 'DEV-FE', level: 'Senior',
    description_i18n: { ru: 'Разработка интерфейсов корпоративной платформы', kk: 'Корпоративтік платформа интерфейстерін әзірлеу', en: 'Building the corporate platform user interfaces' },
  },
  {
    id: 'pos-03', organization_id: 'org-fintech-01', title: 'HR Lead', code: 'HR-LEAD', level: 'Lead',
    description_i18n: { ru: 'Руководство отделом персонала и обучением', kk: 'Персонал бөлімі мен оқытуды басқару', en: 'Leading the people team and corporate learning' },
  },
  {
    id: 'pos-04', organization_id: 'org-fintech-01', title: 'Account Executive', code: 'SALES-AE', level: 'Junior',
    description_i18n: { ru: 'Ведение ключевых клиентов', kk: 'Негізгі клиенттермен жұмыс', en: 'Managing key client accounts' },
  },
  {
    id: 'pos-05', organization_id: 'org-fintech-01', title: 'Engineering Manager', code: 'ENG-MGR', level: 'Director',
    description_i18n: { ru: 'Управление инженерными командами', kk: 'Инженерлік командаларды басқару', en: 'Managing engineering teams' },
  },
];

const member = (
  id: string,
  user_id: string,
  role: Role,
  status: MemberStatus,
  job_title: string,
  department_id: string,
  start_date: string,
  active_assignments_count: number,
  manager_name?: string,
): SeedOrgMember => ({
  id,
  organization_id: 'org-fintech-01',
  user_id,
  role,
  status,
  job_title,
  department_id,
  manager_name,
  active_assignments_count,
  start_date,
});

export const initialMembers: SeedOrgMember[] = [
  member('mem-001', 'usr-admin-001', 'org_admin', 'active', 'HR Lead & Platform Admin', 'dept-hr-03', '2025-01-15', 2),
  member('mem-002', 'usr-emp-001', 'employee', 'active', 'Go Backend Developer', 'dept-eng-01', '2025-06-01', 3, 'Виктор Ким'),
  member('mem-003', 'usr-mgr-002', 'manager', 'active', 'Engineering Manager', 'dept-eng-01', '2024-03-10', 0),
  member('mem-004', 'usr-004', 'employee', 'invited', 'Sales Rep', 'dept-sales-02', '2026-08-20', 3, 'Дарья Романова'),
  member('mem-005', 'usr-005', 'trainer', 'active', 'Lead Corporate Trainer', 'dept-hr-03', '2025-02-01', 0),
  member('mem-006', 'usr-006', 'employee', 'suspended', 'Marketing Specialist', 'dept-sales-02', '2025-09-12', 1),
  member('mem-007', 'usr-007', 'employee', 'active', 'DevOps Engineer', 'dept-eng-01', '2025-04-10', 1, 'Виктор Ким'),
  member('mem-008', 'usr-008', 'employee', 'active', 'Frontend Developer', 'dept-eng-01', '2025-05-15', 2, 'Виктор Ким'),
  member('mem-009', 'usr-009', 'employee', 'active', 'QA Automation Engineer', 'dept-eng-01', '2025-07-01', 1, 'Виктор Ким'),
  member('mem-010', 'usr-010', 'employee', 'active', 'Backend Intern', 'dept-eng-01', '2026-08-01', 1, 'Виктор Ким'),
  member('mem-011', 'usr-hr-011', 'hr_manager', 'active', 'Learning & Development Manager', 'dept-hr-03', '2025-03-01', 0),
];

