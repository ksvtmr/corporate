// Seed content for modules whose backend service is not part of this
// repository (content, cohorts, assignments, question bank, flashcards,
// report jobs). Records use stable ids, reference real department/member ids
// from the mock backend, store human-readable text per language and use dates
// relative to "today" so the demo never shows stale deadlines.

import type { LocalizedText } from '@/kit/i18n/localized';

export type Text = string | LocalizedText;
const l = (ru: string, kk: string, en: string): LocalizedText => ({ ru, kk, en });

export function daysFromNow(days: number, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayIso(): string {
  return daysFromNow(0);
}

// ---------------------------------------------------------------------------
// Learning tracks
// ---------------------------------------------------------------------------

export type BlockType = 'material' | 'video' | 'test' | 'open_question' | 'flashcards' | 'acknowledgment';
export type TransitionRule = 'sequential' | 'free' | 'must_complete_previous' | 'min_score_70';
export type TrackType = 'onboarding' | 'compliance' | 'role_training' | 'safety' | 'custom';
export type TrackStatus = 'draft' | 'in_review' | 'published' | 'archived';

export interface DemoTrackBlock {
  id: string;
  type: BlockType;
  title: Text;
  duration_minutes: number;
  transition_rule: TransitionRule;
}

export interface DemoTrack {
  id: string;
  title: Text;
  type: TrackType;
  status: TrackStatus;
  description: Text;
  /** null = all departments */
  department_id: string | null;
  total_duration_hours: number;
  passing_score_percent: number;
  enrolled_count: number;
  completion_rate: number;
  blocks: DemoTrackBlock[];
  created_by?: string;
  ai_generated?: boolean;
}

export const seedTracks = (): DemoTrack[] => [
  {
    id: 'trk-01',
    title: l('Онбординг Go Backend-разработчика 2026', 'Go Backend әзірлеушісінің онбордингі 2026', 'Go Backend Developer Onboarding 2026'),
    type: 'onboarding',
    status: 'published',
    description: l(
      'Комплексный вводный трек: чистая архитектура, NATS JetStream, мультиарендность PostgreSQL, стандарты тестирования.',
      'Кешенді кіріспе трек: таза архитектура, NATS JetStream, PostgreSQL көпжалдаушылығы, тестілеу стандарттары.',
      'Comprehensive introductory track: clean architecture, NATS JetStream, PostgreSQL multi-tenancy, testing standards.',
    ),
    department_id: 'dept-eng-01',
    total_duration_hours: 16,
    passing_score_percent: 80,
    enrolled_count: 14,
    completion_rate: 92.8,
    blocks: [
      { id: 'blk-1', type: 'material', title: l('Регламент чистой архитектуры Go-сервисов', 'Go-сервистердің таза архитектура регламенті', 'Clean Architecture Guidelines for Go Services'), duration_minutes: 45, transition_rule: 'sequential' },
      { id: 'blk-2', type: 'video', title: l('Воркшоп: NATS JetStream и паттерн Outbox', 'Воркшоп: NATS JetStream және Outbox паттерні', 'Workshop: NATS JetStream & the Outbox pattern'), duration_minutes: 60, transition_rule: 'must_complete_previous' },
      { id: 'blk-3', type: 'flashcards', title: l('Термины и коды ошибок платформы', 'Платформа терминдері мен қате кодтары', 'Platform terms and error codes'), duration_minutes: 20, transition_rule: 'free' },
      { id: 'blk-4', type: 'test', title: l('Входное тестирование по стандартам Go', 'Go стандарттары бойынша кіріс тестілеуі', 'Go Standards Entry Test'), duration_minutes: 40, transition_rule: 'min_score_70' },
      { id: 'blk-5', type: 'open_question', title: l('Архитектурный кейс: проектирование сервиса отчётов', 'Архитектуралық кейс: есептер сервисін жобалау', 'Architecture case: designing a reporting service'), duration_minutes: 90, transition_rule: 'must_complete_previous' },
      { id: 'blk-6', type: 'acknowledgment', title: l('Подтверждение ознакомления с политиками ИБ', 'АҚ саясаттарымен танысқанын растау', 'Information Security Policy Acknowledgment'), duration_minutes: 10, transition_rule: 'must_complete_previous' },
    ],
  },
  {
    id: 'trk-02',
    title: l('Обязательный ежегодный аудит ИБ и защита персональных данных', 'Міндетті жыл сайынғы АҚ аудиті және дербес деректерді қорғау', 'Mandatory Annual Security Audit & Personal Data Protection'),
    type: 'compliance',
    status: 'published',
    description: l(
      'Обязательный комплаенс-курс для всех сотрудников с контрольным тестированием и фиксацией в аудите.',
      'Барлық қызметкерлерге арналған бақылау тестілеуі және аудитте тіркелуі бар міндетті комплаенс-курс.',
      'Mandatory compliance course for all employees with a final test recorded in the audit log.',
    ),
    department_id: null,
    total_duration_hours: 4,
    passing_score_percent: 85,
    enrolled_count: 142,
    completion_rate: 88.4,
    blocks: [
      { id: 'blk-7', type: 'material', title: l('Политика паролей, 2FA и защита персональных данных', 'Құпиясөз саясаты, 2FA және дербес деректерді қорғау', 'Password policy, 2FA and personal data protection'), duration_minutes: 60, transition_rule: 'sequential' },
      { id: 'blk-8', type: 'test', title: l('Итоговый комплаенс-тест по безопасности', 'Қауіпсіздік бойынша қорытынды комплаенс-тест', 'Final security compliance test'), duration_minutes: 30, transition_rule: 'min_score_70' },
      { id: 'blk-9', type: 'acknowledgment', title: l('Согласие с регламентом', 'Регламентпен келісу', 'Policy agreement'), duration_minutes: 5, transition_rule: 'must_complete_previous' },
    ],
  },
  {
    id: 'trk-03',
    title: l('B2B-продажи: методология переговоров с корпоративными клиентами', 'B2B сату: корпоративтік клиенттермен келіссөз әдістемесі', 'B2B Sales: Negotiating with Corporate Clients'),
    type: 'role_training',
    status: 'draft',
    description: l(
      'Работа со сложными возражениями по безопасности, презентация ROI и подготовка коммерческих предложений.',
      'Қауіпсіздік бойынша күрделі қарсылықтармен жұмыс, ROI таныстырылымы және коммерциялық ұсыныстар дайындау.',
      'Handling tough security objections, presenting ROI and preparing commercial proposals.',
    ),
    department_id: 'dept-sales-02',
    total_duration_hours: 8,
    passing_score_percent: 75,
    enrolled_count: 0,
    completion_rate: 0,
    blocks: [
      { id: 'blk-10', type: 'material', title: l('Сценарии демо для корпоративных клиентов', 'Корпоративтік клиенттерге арналған демо сценарийлері', 'Demo scripts for corporate clients'), duration_minutes: 40, transition_rule: 'sequential' },
      { id: 'blk-11', type: 'open_question', title: l('Разбор реального кейса клиента из банковского сектора', 'Банк секторындағы клиенттің нақты кейсін талдау', 'Case study: a banking-sector client'), duration_minutes: 60, transition_rule: 'must_complete_previous' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Knowledge base materials
// ---------------------------------------------------------------------------

export type MaterialCategory = 'development' | 'compliance' | 'sales' | 'training' | 'people';
export type MaterialFormat = 'pdf' | 'docx' | 'pptx' | 'video' | 'markdown' | 'txt';
export type MaterialStatus = 'uploaded' | 'queued' | 'processing' | 'ready_for_review' | 'published' | 'failed';
export type Confidentiality = 'internal' | 'confidential' | 'strictly_confidential';
export type AccessLevel = 'public_within_organization' | 'restricted_by_department' | 'restricted_by_role' | 'admins_only';

export interface DemoTopic {
  id: string;
  name: Text;
  priority: 'high' | 'medium' | 'low';
  is_required: boolean;
}

export interface DemoMaterial {
  id: string;
  title: Text;
  category: MaterialCategory;
  format: MaterialFormat;
  status: MaterialStatus;
  confidentiality: Confidentiality;
  access_level: AccessLevel;
  version: number;
  uploaded_by: string;
  uploaded_at: string;
  file_size_mb: number;
  ai_summary?: Text;
  topics: DemoTopic[];
}

export const seedMaterials = (): DemoMaterial[] => [
  {
    id: 'mat-001',
    title: l('Регламент информационной безопасности и работы с персональными данными 2026', '2026 жылғы ақпараттық қауіпсіздік және дербес деректермен жұмыс регламенті', 'Information Security & Personal Data Policy 2026'),
    category: 'compliance',
    format: 'pdf',
    status: 'published',
    confidentiality: 'confidential',
    access_level: 'public_within_organization',
    version: 2,
    uploaded_by: 'Алина Садыкова',
    uploaded_at: daysFromNow(-57),
    file_size_mb: 4.8,
    ai_summary: l(
      'Парольная политика, двухфакторная аутентификация, запрет пересылки клиентских баз во внешние мессенджеры и протоколы эскалации инцидентов.',
      'Құпиясөз саясаты, екі факторлы аутентификация, клиент базаларын сыртқы мессенджерлерге жіберуге тыйым және инциденттерді эскалациялау хаттамалары.',
      'Password policy, two-factor authentication, a ban on sharing client databases in external messengers and incident escalation procedures.',
    ),
    topics: [
      { id: 'top-1', name: l('Парольная политика и 2FA', 'Құпиясөз саясаты және 2FA', 'Password policy & 2FA'), priority: 'high', is_required: true },
      { id: 'top-2', name: l('Работа с персональными данными', 'Дербес деректермен жұмыс', 'Handling personal data'), priority: 'high', is_required: true },
      { id: 'top-3', name: l('Предотвращение фишинга и социальной инженерии', 'Фишинг пен әлеуметтік инженерияның алдын алу', 'Preventing phishing and social engineering'), priority: 'medium', is_required: true },
      { id: 'top-4', name: l('Порядок действий при утечке данных', 'Деректер ағып кеткен кездегі әрекет тәртібі', 'Data breach response'), priority: 'high', is_required: true },
      { id: 'top-5', name: l('Использование личных устройств (BYOD)', 'Жеке құрылғыларды пайдалану (BYOD)', 'Using personal devices (BYOD)'), priority: 'low', is_required: false },
    ],
  },
  {
    id: 'mat-002',
    title: l('Архитектурный стандарт микросервисов Go и NATS JetStream', 'Go микросервистері мен NATS JetStream архитектуралық стандарты', 'Go Microservices & NATS JetStream Architecture Standard'),
    category: 'development',
    format: 'markdown',
    status: 'ready_for_review',
    confidentiality: 'internal',
    access_level: 'restricted_by_department',
    version: 1,
    uploaded_by: 'Виктор Ким',
    uploaded_at: daysFromNow(-49),
    file_size_mb: 1.2,
    ai_summary: l(
      'Принципы Clean Architecture, распределённые транзакции через Outbox, идемпотентность консьюмеров NATS и стандарты метрик Prometheus.',
      'Clean Architecture қағидалары, Outbox арқылы таратылған транзакциялар, NATS консьюмерлерінің идемпотенттілігі және Prometheus метрикаларының стандарттары.',
      'Clean Architecture principles, distributed transactions via Outbox, idempotent NATS consumers and Prometheus metrics standards.',
    ),
    topics: [
      { id: 'top-6', name: l('Clean Architecture и доменные границы', 'Clean Architecture және домендік шекаралар', 'Clean Architecture & domain boundaries'), priority: 'high', is_required: true },
      { id: 'top-7', name: 'NATS JetStream: Publisher/Consumer', priority: 'high', is_required: true },
      { id: 'top-8', name: 'Transactional Outbox & Idempotency', priority: 'high', is_required: true },
      { id: 'top-9', name: l('Трассировка OpenTelemetry и логирование', 'OpenTelemetry трассировкасы және журналдау', 'OpenTelemetry tracing & logging'), priority: 'medium', is_required: false },
    ],
  },
  {
    id: 'mat-003',
    title: l('Презентация продукта iClever Corporate для B2B-продаж', 'B2B сатуға арналған iClever Corporate өнімінің таныстырылымы', 'iClever Corporate product deck for B2B sales'),
    category: 'sales',
    format: 'pptx',
    status: 'processing',
    confidentiality: 'internal',
    access_level: 'restricted_by_role',
    version: 1,
    uploaded_by: 'Дарья Романова',
    uploaded_at: daysFromNow(-2),
    file_size_mb: 14.5,
    topics: [
      { id: 'top-10', name: l('Ценностное предложение платформы', 'Платформаның құндылық ұсынысы', 'Platform value proposition'), priority: 'high', is_required: true },
      { id: 'top-11', name: l('Тарифы и расчёт ROI', 'Тарифтер және ROI есебі', 'Pricing & ROI calculation'), priority: 'medium', is_required: false },
      { id: 'top-12', name: l('Ответы на частые возражения по безопасности', 'Қауіпсіздік бойынша жиі қарсылықтарға жауаптар', 'Answering common security objections'), priority: 'high', is_required: true },
    ],
  },
  {
    id: 'mat-004',
    title: l('Видеозапись: конструктор тестов и RAG-ассистент', 'Бейнежазба: тест конструкторы және RAG-ассистент', 'Recording: test builder and RAG assistant'),
    category: 'training',
    format: 'video',
    status: 'published',
    confidentiality: 'internal',
    access_level: 'public_within_organization',
    version: 1,
    uploaded_by: 'Елена Воронова',
    uploaded_at: daysFromNow(-62),
    file_size_mb: 240,
    ai_summary: l(
      'Практический воркшоп для методистов: создание вопросов с AI-генерацией и настройка контроля честности.',
      'Әдіскерлерге арналған практикалық воркшоп: AI көмегімен сұрақтар құру және адалдықты бақылауды баптау.',
      'Hands-on workshop for trainers: creating AI-generated questions and configuring integrity monitoring.',
    ),
    topics: [
      { id: 'top-13', name: l('Создание банка вопросов', 'Сұрақтар банкін құру', 'Building a question bank'), priority: 'medium', is_required: false },
      { id: 'top-14', name: l('Настройка RAG-промптов', 'RAG-промпттарды баптау', 'Configuring RAG prompts'), priority: 'low', is_required: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cohorts (members reference real directory ids from the mock backend)
// ---------------------------------------------------------------------------

export interface DemoCohort {
  id: string;
  name: Text;
  description: Text;
  department_id: string | null;
  track_id: string | null;
  created_at: string;
  member_ids: string[];
  /** Illustrative per-member progress, 0–100. */
  progress: Record<string, number>;
}

export const seedCohorts = (): DemoCohort[] => [
  {
    id: 'coh-01',
    name: l('Онбординг разработчиков — текущий квартал', 'Әзірлеушілер онбордингі — ағымдағы тоқсан', 'Developer onboarding — current quarter'),
    description: l('Новые инженеры, присоединившиеся за последние три месяца', 'Соңғы үш айда қосылған жаңа инженерлер', 'New engineers who joined in the last three months'),
    department_id: 'dept-eng-01',
    track_id: 'trk-01',
    created_at: daysFromNow(-90),
    member_ids: ['mem-002', 'mem-007', 'mem-008', 'mem-009', 'mem-010'],
    progress: { 'mem-002': 75, 'mem-007': 40, 'mem-008': 90, 'mem-009': 60, 'mem-010': 20 },
  },
  {
    id: 'coh-02',
    name: l('Стажёры продаж и маркетинга', 'Сату және маркетинг тағылымдамашылары', 'Sales & marketing interns'),
    description: l('Когорта начинающих специалистов клиентского сервиса', 'Клиенттерге қызмет көрсетудің жас мамандар когортасы', 'Cohort of junior customer-service specialists'),
    department_id: 'dept-sales-02',
    track_id: 'trk-03',
    created_at: daysFromNow(-60),
    member_ids: ['mem-004', 'mem-006'],
    progress: { 'mem-004': 100, 'mem-006': 85 },
  },
];

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export interface DemoAssignment {
  id: string;
  assignee_type: 'member' | 'cohort';
  assignee_id: string;
  target_type: 'track' | 'test';
  target_id: string;
  /** Stored status; "overdue" is derived from due_date at display time. */
  status: Exclude<AssignmentStatus, 'overdue'>;
  due_date: string;
  assigned_by: string;
  progress_percent: number;
  is_mandatory: boolean;
  created_at: string;
  cancel_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  reminders_sent?: number;
}

export const seedAssignments = (): DemoAssignment[] => [
  { id: 'asg-001', assignee_type: 'member', assignee_id: 'mem-002', target_type: 'track', target_id: 'trk-01', status: 'in_progress', due_date: daysFromNow(9), assigned_by: 'Виктор Ким', progress_percent: 75, is_mandatory: true, created_at: daysFromNow(-30) },
  { id: 'asg-002', assignee_type: 'cohort', assignee_id: 'coh-01', target_type: 'track', target_id: 'trk-02', status: 'assigned', due_date: daysFromNow(14), assigned_by: 'Алина Садыкова', progress_percent: 15, is_mandatory: true, created_at: daysFromNow(-20) },
  { id: 'asg-003', assignee_type: 'member', assignee_id: 'mem-010', target_type: 'test', target_id: 't-1', status: 'assigned', due_date: daysFromNow(-3), assigned_by: 'Виктор Ким', progress_percent: 0, is_mandatory: true, created_at: daysFromNow(-25) },
  { id: 'asg-004', assignee_type: 'member', assignee_id: 'mem-011', target_type: 'test', target_id: 't-2', status: 'completed', due_date: daysFromNow(-10), assigned_by: 'Алина Садыкова', progress_percent: 100, is_mandatory: true, created_at: daysFromNow(-40) },
  { id: 'asg-005', assignee_type: 'member', assignee_id: 'mem-007', target_type: 'track', target_id: 'trk-01', status: 'in_progress', due_date: daysFromNow(12), assigned_by: 'Виктор Ким', progress_percent: 40, is_mandatory: true, created_at: daysFromNow(-28) },
  { id: 'asg-006', assignee_type: 'member', assignee_id: 'mem-008', target_type: 'track', target_id: 'trk-01', status: 'completed', due_date: daysFromNow(-5), assigned_by: 'Виктор Ким', progress_percent: 100, is_mandatory: true, created_at: daysFromNow(-45) },
];

// ---------------------------------------------------------------------------
// Question bank & tests
// ---------------------------------------------------------------------------

export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'open_answer' | 'matching' | 'ordering' | 'scenario';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DemoQuestion {
  id: string;
  text: Text;
  type: QuestionType;
  topic: Text;
  difficulty: Difficulty;
  points: number;
  options?: Text[];
  /** Indexes of correct options (choice questions). */
  correct?: number[];
  source_fragment?: Text;
  ai_generated?: boolean;
}

export interface DemoTest {
  id: string;
  title: Text;
  description: Text;
  question_ids: string[];
  time_limit_minutes: number;
  passing_score_percent: number;
  shuffle_questions: boolean;
  integrity_monitoring: boolean;
  version: number;
}

const TOPIC_GO = l('Архитектура Go', 'Go архитектурасы', 'Go architecture');
const TOPIC_SEC = l('Информационная безопасность', 'Ақпараттық қауіпсіздік', 'Information security');
const TOPIC_DB = l('Архитектура БД', 'ДҚ архитектурасы', 'Database architecture');

export const seedQuestions = (): DemoQuestion[] => [
  {
    id: 'q-1',
    text: l(
      'Что из перечисленного является ключевым требованием шаблона Transactional Outbox в Go-сервисах?',
      'Go-сервистердегі Transactional Outbox үлгісінің негізгі талабы қайсы?',
      'Which of the following is a key requirement of the Transactional Outbox pattern in Go services?',
    ),
    type: 'single_choice',
    topic: TOPIC_GO,
    difficulty: 'medium',
    points: 10,
    options: [
      l('Публикация сообщения в брокер строго до сохранения в БД', 'Хабарламаны брокерге ДҚ-ға сақтаудан бұрын жариялау', 'Publish the message to the broker strictly before saving to the database'),
      l('Запись события в таблицу outbox_events в одной транзакции с бизнес-данными', 'Оқиғаны бизнес-деректермен бір транзакцияда outbox_events кестесіне жазу', 'Write the event to outbox_events in the same transaction as the business data'),
      l('Асинхронный REST-вызов без гарантии доставки', 'Жеткізу кепілдігінсіз асинхронды REST шақыруы', 'An asynchronous REST call without delivery guarantees'),
      l('Обязательное применение Kafka с репликацией 3', 'Репликациясы 3 болатын Kafka-ны міндетті қолдану', 'Mandatory Kafka with replication factor 3'),
    ],
    correct: [1],
    source_fragment: l('Архитектурный стандарт микросервисов Go, §4.2', 'Go микросервистерінің архитектуралық стандарты, §4.2', 'Go Microservices Architecture Standard, §4.2'),
  },
  {
    id: 'q-2',
    text: l(
      'Выберите ВСЕ обязательные меры при обнаружении попытки несанкционированного доступа к серверу:',
      'Серверге рұқсатсыз кіру әрекеті анықталғанда БАРЛЫҚ міндетті шараларды таңдаңыз:',
      'Select ALL mandatory actions when an unauthorized server access attempt is detected:',
    ),
    type: 'multiple_choice',
    topic: TOPIC_SEC,
    difficulty: 'hard',
    points: 15,
    options: [
      l('Немедленно отозвать активные JWT-токены скомпрометированного аккаунта', 'Бұзылған аккаунттың белсенді JWT токендерін дереу кері қайтару', 'Immediately revoke the compromised account’s active JWT tokens'),
      l('Удалить системные логи для освобождения места', 'Орын босату үшін жүйелік журналдарды жою', 'Delete system logs to free up disk space'),
      l('Оповестить дежурного офицера ИБ через защищённый канал', 'Қорғалған арна арқылы кезекші АҚ офицеріне хабарлау', 'Notify the on-call security officer via a secure channel'),
      l('Изолировать скомпрометированный узел от корпоративной сети', 'Бұзылған түйінді корпоративтік желіден оқшаулау', 'Isolate the compromised node from the corporate network'),
    ],
    correct: [0, 2, 3],
    source_fragment: l('Регламент реагирования на инциденты ИБ, раздел 3', 'АҚ инциденттеріне әрекет ету регламенті, 3-бөлім', 'Security Incident Response Procedure, section 3'),
  },
  {
    id: 'q-3',
    text: l(
      'Опишите, как в мультиарендной архитектуре обеспечивается изоляция данных между компаниями на уровне PostgreSQL.',
      'Көпжалдаушы архитектурада PostgreSQL деңгейінде компаниялар арасындағы деректерді оқшаулау қалай қамтамасыз етілетінін сипаттаңыз.',
      'Describe how a multi-tenant architecture isolates data between companies at the PostgreSQL level.',
    ),
    type: 'open_answer',
    topic: TOPIC_DB,
    difficulty: 'hard',
    points: 20,
    source_fragment: l('Регламент изоляции тенантов и безопасности хранения данных', 'Тенанттарды оқшаулау және деректерді сақтау қауіпсіздігі регламенті', 'Tenant Isolation & Data Storage Security Policy'),
  },
  {
    id: 'q-4',
    text: l(
      'Разрешено ли сохранять нехешированные пароли сотрудников во временных логах отладки?',
      'Қызметкерлердің хэштелмеген құпиясөздерін уақытша жөндеу журналдарында сақтауға рұқсат етіле ме?',
      'Is it allowed to store unhashed employee passwords in temporary debug logs?',
    ),
    type: 'true_false',
    topic: TOPIC_SEC,
    difficulty: 'easy',
    points: 5,
    options: [l('Да', 'Иә', 'Yes'), l('Нет', 'Жоқ', 'No')],
    correct: [1],
    source_fragment: l('Политика конфиденциальности и аутентификации, §1.4', 'Құпиялылық және аутентификация саясаты, §1.4', 'Privacy & Authentication Policy, §1.4'),
  },
];

export const seedTests = (): DemoTest[] => [
  {
    id: 't-1',
    title: l('Итоговая аттестация: онбординг Go Backend 2026', 'Қорытынды аттестация: Go Backend онбордингі 2026', 'Final assessment: Go Backend onboarding 2026'),
    description: l(
      'Срез знаний стандартов Clean Architecture, Transactional Outbox, NATS и PostgreSQL.',
      'Clean Architecture, Transactional Outbox, NATS және PostgreSQL стандарттарын білуді тексеру.',
      'Knowledge check on Clean Architecture, Transactional Outbox, NATS and PostgreSQL standards.',
    ),
    question_ids: ['q-1', 'q-3'],
    time_limit_minutes: 30,
    passing_score_percent: 80,
    shuffle_questions: true,
    integrity_monitoring: true,
    version: 2,
  },
  {
    id: 't-2',
    title: l('Обязательный тест: информационная безопасность и персональные данные', 'Міндетті тест: ақпараттық қауіпсіздік және дербес деректер', 'Mandatory test: information security & personal data'),
    description: l(
      'Ежегодная проверка знаний правил защиты персональных данных, 2FA и защиты от фишинга.',
      'Дербес деректерді қорғау, 2FA және фишингтен қорғау ережелерін жыл сайынғы тексеру.',
      'Annual check of personal data protection, 2FA and phishing defence rules.',
    ),
    question_ids: ['q-2', 'q-4'],
    time_limit_minutes: 20,
    passing_score_percent: 85,
    shuffle_questions: true,
    integrity_monitoring: true,
    version: 1,
  },
];

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export const FLASHCARD_TOPICS = ['go_arch', 'infosec', 'engineering', 'general'] as const;
export type FlashcardTopic = (typeof FLASHCARD_TOPICS)[number];

export interface DemoFlashcard {
  id: string;
  topic: FlashcardTopic;
  front: Text;
  back: Text;
  due_date: string;
  repetitions: number;
  interval_days: number;
}

export const seedFlashcards = (): DemoFlashcard[] => [
  {
    id: 'fc-1',
    topic: 'go_arch',
    front: l('Что такое Transactional Outbox?', 'Transactional Outbox деген не?', 'What is the Transactional Outbox?'),
    back: l(
      'Шаблон, при котором исходящие сообщения сохраняются в таблицу БД в той же ACID-транзакции, что и бизнес-данные, а отдельный процесс ретранслирует их в шину.',
      'Шығыс хабарламалар бизнес-деректермен бір ACID-транзакцияда ДҚ кестесіне сақталып, жеке процесс оларды шинаға жіберетін үлгі.',
      'A pattern where outgoing messages are stored in a database table in the same ACID transaction as the business data, and a separate process relays them to the bus.',
    ),
    due_date: daysFromNow(0),
    repetitions: 3,
    interval_days: 4,
  },
  {
    id: 'fc-2',
    topic: 'infosec',
    front: l('В чём ключевое отличие 2FA от MFA?', '2FA мен MFA-ның негізгі айырмашылығы неде?', 'What is the key difference between 2FA and MFA?'),
    back: l(
      '2FA использует ровно два независимых фактора (например, пароль + TOTP), а MFA — два и более (биометрия, геолокация, смарт-карты).',
      '2FA дәл екі тәуелсіз факторды қолданады (мысалы, құпиясөз + TOTP), ал MFA — екі және одан көп (биометрия, геолокация, смарт-карталар).',
      '2FA uses exactly two independent factors (e.g. password + TOTP), while MFA uses two or more (biometrics, location, smart cards).',
    ),
    due_date: daysFromNow(1),
    repetitions: 5,
    interval_days: 8,
  },
  {
    id: 'fc-3',
    topic: 'engineering',
    front: l('Какова цель идемпотентного консьюмера в NATS?', 'NATS-тағы идемпотентті консьюмердің мақсаты қандай?', 'What is the purpose of an idempotent NATS consumer?'),
    back: l(
      'Гарантировать, что повторная обработка события при сбоях сети не приведёт к дублированию побочных эффектов в базе данных.',
      'Желі ақауларында оқиғаны қайта өңдеу дерекқорда жанама әсерлердің қайталануына әкелмейтініне кепілдік беру.',
      'To guarantee that reprocessing an event after a network failure does not duplicate side effects in the database.',
    ),
    due_date: daysFromNow(3),
    repetitions: 1,
    interval_days: 2,
  },
  {
    id: 'fc-4',
    topic: 'go_arch',
    front: l(
      'Почему доменный слой не должен зависеть от ORM и SQL-драйверов?',
      'Неліктен домендік қабат ORM мен SQL-драйверлерге тәуелді болмауы керек?',
      'Why must the domain layer not depend on ORMs and SQL drivers?',
    ),
    back: l(
      'Чтобы бизнес-правила оставались независимыми от инфраструктуры и тестировались изолированно, без поднятия СУБД.',
      'Бизнес-ережелер инфрақұрылымнан тәуелсіз болып, ДҚБЖ-ны іске қоспай оқшау тексерілуі үшін.',
      'So that business rules stay independent of infrastructure and can be tested in isolation without a database.',
    ),
    due_date: daysFromNow(0),
    repetitions: 2,
    interval_days: 3,
  },
  {
    id: 'fc-5',
    topic: 'infosec',
    front: l('Что делать при подозрении на фишинговое письмо?', 'Фишингтік хатқа күдік болса не істеу керек?', 'What should you do if you suspect a phishing email?'),
    back: l(
      'Не переходить по ссылкам и не открывать вложения, нажать «Сообщить о фишинге» и оповестить дежурного инженера ИБ.',
      'Сілтемелерге өтпеу және салымдарды ашпау, «Фишинг туралы хабарлау» батырмасын басып, кезекші АҚ инженеріне хабарлау.',
      'Do not click links or open attachments; press “Report phishing” and notify the on-call security engineer.',
    ),
    due_date: daysFromNow(0),
    repetitions: 4,
    interval_days: 6,
  },
];

// ---------------------------------------------------------------------------
// Report export jobs
// ---------------------------------------------------------------------------

export const REPORT_TYPES = ['department_progress', 'overdue_registry', 'competency_matrix', 'integrity_log', 'employee_registry'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportFormat = 'csv' | 'pdf';

export interface DemoReportJob {
  id: string;
  report_type: ReportType;
  format: ReportFormat;
  status: 'ready' | 'failed';
  created_at: string;
  file_size_kb: number;
  created_by: string;
}

export const seedReportJobs = (): DemoReportJob[] => [
  { id: 'exp-001', report_type: 'department_progress', format: 'csv', status: 'ready', created_at: `${daysFromNow(-1)}T12:30:15`, file_size_kb: 24, created_by: 'Алина Садыкова' },
  { id: 'exp-002', report_type: 'integrity_log', format: 'pdf', status: 'ready', created_at: `${daysFromNow(-2)}T18:45:00`, file_size_kb: 110, created_by: 'Алина Садыкова' },
  { id: 'exp-003', report_type: 'employee_registry', format: 'csv', status: 'ready', created_at: `${daysFromNow(-6)}T09:10:22`, file_size_kb: 4, created_by: 'Динара Касымова' },
];
