export interface SeedUser {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
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
  default_locale: string;
}

export interface SeedOrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'platform_super_admin' | 'org_admin' | 'hr_manager' | 'manager' | 'trainer' | 'employee';
  status: 'invited' | 'active' | 'suspended' | 'inactive' | 'archived';
  job_title?: string;
  department_id?: string;
  department_name?: string;
  manager_id?: string;
  manager_name?: string;
  org_name?: string;
  org_slug?: string;
  active_assignments_count: number;
  start_date?: string;
}

export interface SeedDepartment {
  id: string;
  parent_id?: string;
  name: string;
  code?: string;
  description?: string;
  manager_id?: string;
  manager_name?: string;
  member_count: number;
}

export interface SeedPosition {
  id: string;
  title: string;
  code?: string;
  level?: string;
  description?: string;
}

export const initialUsers: SeedUser[] = [
  {
    id: 'usr-admin-001',
    email: 'admin@corp.iclever.ai',
    password: 'Password123!',
    first_name: 'Алина',
    last_name: 'Садыкова',
    is_active: true,
  },
  {
    id: 'usr-emp-001',
    email: 'employee@corp.iclever.ai',
    password: 'Password123!',
    first_name: 'Марат',
    last_name: 'Жумабаев',
    is_active: true,
  },
  {
    id: 'usr-mgr-002',
    email: 'manager@corp.iclever.ai',
    password: 'Password123!',
    first_name: 'Виктор',
    last_name: 'Ким',
    is_active: true,
  },
  {
    id: 'usr-mgr-victor',
    email: 'victor.k@fintech.kz',
    password: 'Password123!',
    first_name: 'Виктор',
    last_name: 'Ким',
    is_active: true,
  },
  {
    id: 'usr-004',
    email: 'daria.r@fintech.kz',
    password: 'Password123!',
    first_name: 'Дарья',
    last_name: 'Романова',
    is_active: true,
  },
  {
    id: 'usr-005',
    email: 'trainer@corp.iclever.ai',
    password: 'Password123!',
    first_name: 'Елена',
    last_name: 'Воронова',
    is_active: true,
  },
  {
    id: 'usr-006',
    email: 'marketing@fintech.kz',
    password: 'Password123!',
    first_name: 'Айгерим',
    last_name: 'Касымова',
    is_active: true,
  },
  {
    id: 'usr-007',
    email: 'alex.p@fintech.kz',
    password: 'Password123!',
    first_name: 'Александр',
    last_name: 'Петров',
    is_active: true,
  },
  {
    id: 'usr-008',
    email: 'nurlan.s@fintech.kz',
    password: 'Password123!',
    first_name: 'Нурлан',
    last_name: 'Сейтов',
    is_active: true,
  },
  {
    id: 'usr-009',
    email: 'dina.s@fintech.kz',
    password: 'Password123!',
    first_name: 'Дина',
    last_name: 'Сабитова',
    is_active: true,
  },
  {
    id: 'usr-010',
    email: 'alexey.s@fintech.kz',
    password: 'Password123!',
    first_name: 'Алексей',
    last_name: 'Смирнов',
    is_active: true,
  },
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
  },
];

export const initialDepartments: SeedDepartment[] = [
  {
    id: 'dept-eng-01',
    name: 'Инженерия и разработка',
    code: 'ENG',
    description: 'Разработка микросервисов, фронтенда, QA и DevOps инфраструктуры',
    manager_name: 'Виктор Ким',
    member_count: 32,
  },
  {
    id: 'dept-sales-02',
    name: 'Продажи и клиентский сервис',
    code: 'SALES',
    description: 'B2B продажи корпоративным клиентам и сопровождение сделок',
    manager_name: 'Дарья Романова',
    member_count: 18,
  },
  {
    id: 'dept-hr-03',
    name: 'People & HR',
    code: 'HR',
    description: 'Рекрутинг, онбординг, удержание и корпоративное обучение',
    manager_name: 'Алина Садыкова',
    member_count: 6,
  },
  {
    id: 'dept-fin-04',
    name: 'Финансы и комплаенс',
    code: 'FIN',
    description: 'Финансовое планирование, бухгалтерский учет и аудит безопасности',
    manager_name: 'Динара Касымова',
    member_count: 9,
  },
];

export const initialPositions: SeedPosition[] = [
  { id: 'pos-01', title: 'Go Backend Developer', code: 'DEV-GO', level: 'Middle', description: 'Разработка распределенных бэкенд сервисов на Go' },
  { id: 'pos-02', title: 'React Frontend Developer', code: 'DEV-FE', level: 'Senior', description: 'Разработка интерфейсов корпоративной платформы' },
  { id: 'pos-03', title: 'HR Lead', code: 'HR-LEAD', level: 'Lead', description: 'Руководство отделом персонала и обучение' },
  { id: 'pos-04', title: 'Account Executive', code: 'SALES-AE', level: 'Junior', description: 'Ведение ключевых клиентов' },
  { id: 'pos-05', title: 'Engineering Manager', code: 'ENG-MGR', level: 'Director', description: 'Управление инженерными командами' },
];

export const initialMembers: SeedOrgMember[] = [
  {
    id: 'mem-001',
    organization_id: 'org-fintech-01',
    user_id: 'usr-admin-001',
    role: 'org_admin',
    status: 'active',
    job_title: 'HR Lead & Platform Admin',
    department_id: 'dept-hr-03',
    department_name: 'People & HR',
    org_name: 'Fintech Innovations Corp',
    org_slug: 'fintech-innovations',
    active_assignments_count: 2,
    start_date: '2025-01-15',
  },
  {
    id: 'mem-002',
    organization_id: 'org-fintech-01',
    user_id: 'usr-emp-001',
    role: 'employee',
    status: 'active',
    job_title: 'Go Backend Developer',
    department_id: 'dept-eng-01',
    department_name: 'Инженерия и разработка',
    manager_name: 'Виктор Ким',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 3,
    start_date: '2025-06-01',
  },
  {
    id: 'mem-003',
    organization_id: 'org-fintech-01',
    user_id: 'usr-mgr-002',
    role: 'manager',
    status: 'active',
    job_title: 'Engineering Manager',
    department_id: 'dept-eng-01',
    department_name: 'Инженерия и разработка',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 0,
    start_date: '2024-03-10',
  },
  {
    id: 'mem-004',
    organization_id: 'org-fintech-01',
    user_id: 'usr-004',
    role: 'employee',
    status: 'invited',
    job_title: 'Sales Rep',
    department_id: 'dept-sales-02',
    department_name: 'Продажи и клиентский сервис',
    manager_name: 'Дарья Романова',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 3,
    start_date: '2026-08-20',
  },
  {
    id: 'mem-005',
    organization_id: 'org-fintech-01',
    user_id: 'usr-005',
    role: 'trainer',
    status: 'active',
    job_title: 'Lead Corporate Trainer',
    department_id: 'dept-hr-03',
    department_name: 'People & HR',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 0,
    start_date: '2025-02-01',
  },
  {
    id: 'mem-006',
    organization_id: 'org-fintech-01',
    user_id: 'usr-006',
    role: 'employee',
    status: 'suspended',
    job_title: 'Marketing Specialist',
    department_id: 'dept-sales-02',
    department_name: 'Продажи и клиентский сервис',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 1,
    start_date: '2025-09-12',
  },
  {
    id: 'mem-007',
    organization_id: 'org-fintech-01',
    user_id: 'usr-007',
    role: 'employee',
    status: 'active',
    job_title: 'DevOps Engineer',
    department_id: 'dept-eng-01',
    department_name: 'Инженерия и разработка',
    manager_name: 'Виктор Ким',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 1,
    start_date: '2025-04-10',
  },
  {
    id: 'mem-008',
    organization_id: 'org-fintech-01',
    user_id: 'usr-008',
    role: 'employee',
    status: 'active',
    job_title: 'Frontend Developer',
    department_id: 'dept-eng-01',
    department_name: 'Инженерия и разработка',
    manager_name: 'Виктор Ким',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 2,
    start_date: '2025-05-15',
  },
  {
    id: 'mem-009',
    organization_id: 'org-fintech-01',
    user_id: 'usr-009',
    role: 'employee',
    status: 'active',
    job_title: 'QA Automation Engineer',
    department_id: 'dept-eng-01',
    department_name: 'Инженерия и разработка',
    manager_name: 'Виктор Ким',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 1,
    start_date: '2025-07-01',
  },
  {
    id: 'mem-010',
    organization_id: 'org-fintech-01',
    user_id: 'usr-010',
    role: 'employee',
    status: 'active',
    job_title: 'Backend Intern',
    department_id: 'dept-eng-01',
    department_name: 'Инженерия и разработка',
    manager_name: 'Виктор Ким',
    org_name: 'Fintech Innovations Corp',
    active_assignments_count: 1,
    start_date: '2026-08-01',
  },
];
