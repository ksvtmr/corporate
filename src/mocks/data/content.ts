// Database-driven learning content for the mock backend. Every human-readable
// field is stored per language (LocalizedText); identifiers are stable and
// language independent. Correct answers and grading rubrics stay server-side.

import type { LocalizedText } from '@/kit/i18n';

export type BlockType = 'material' | 'video' | 'test' | 'acknowledgment';

export interface ContentBlock {
  id: string;
  type: BlockType;
  title: LocalizedText;
  body: LocalizedText;
  takeaway?: LocalizedText;
  duration_label?: string;
  test_id?: string;
}

export interface ContentTrack {
  id: string;
  title: LocalizedText;
  curator_name: string;
  blocks: ContentBlock[];
}

export interface RubricCriterion {
  id: string;
  label: LocalizedText;
  /** Lower-case stems matched against the answer in any language. */
  keywords: string[];
}

export interface ContentQuestion {
  id: string;
  type: 'single_choice' | 'open_answer';
  topic_id: string;
  text: LocalizedText;
  options?: LocalizedText[];
  correct_option?: number;
  points: number;
  rubric?: RubricCriterion[];
}

export interface ContentTest {
  id: string;
  title: LocalizedText;
  time_limit_minutes: number;
  passing_score_percent: number;
  integrity_monitoring: boolean;
  topics: Record<string, LocalizedText>;
  questions: ContentQuestion[];
}

export const TEST_GO_ONBOARDING: ContentTest = {
  id: 'tst-go-onboarding',
  title: {
    ru: 'Контрольное тестирование по стандартам платформы',
    kk: 'Платформа стандарттары бойынша бақылау тестілеуі',
    en: 'Platform Standards Assessment',
  },
  time_limit_minutes: 20,
  passing_score_percent: 80,
  integrity_monitoring: true,
  topics: {
    clean_arch: { ru: 'Clean Architecture в Go', kk: 'Go-дағы Clean Architecture', en: 'Clean Architecture in Go' },
    outbox: { ru: 'NATS JetStream и паттерн Outbox', kk: 'NATS JetStream және Outbox паттерні', en: 'NATS JetStream & the Outbox pattern' },
    open_case: { ru: 'Развернутый кейс (оценка AI)', kk: 'Толық кейс (AI бағалауы)', en: 'Open case (AI-graded)' },
  },
  questions: [
    {
      id: 'q-clean-arch-1',
      type: 'single_choice',
      topic_id: 'clean_arch',
      points: 10,
      text: {
        ru: 'В каком слое Clean Architecture располагается определение интерфейсов репозиториев?',
        kk: 'Clean Architecture-да репозиторий интерфейстерінің анықтамасы қай қабатта орналасады?',
        en: 'In which Clean Architecture layer are repository interfaces defined?',
      },
      options: [
        { ru: 'В слое Use Case (или Domain)', kk: 'Use Case (немесе Domain) қабатында', en: 'In the Use Case (or Domain) layer' },
        { ru: 'В слое Transport / HTTP', kk: 'Transport / HTTP қабатында', en: 'In the Transport / HTTP layer' },
        { ru: 'В файле main.go', kk: 'main.go файлында', en: 'In main.go' },
        { ru: 'В инфраструктурном драйвере', kk: 'Инфрақұрылымдық драйверде', en: 'In the infrastructure driver' },
      ],
      correct_option: 0,
    },
    {
      id: 'q-outbox-1',
      type: 'single_choice',
      topic_id: 'outbox',
      points: 10,
      text: {
        ru: 'Какую проблему решает паттерн Transactional Outbox?',
        kk: 'Transactional Outbox паттерні қандай мәселені шешеді?',
        en: 'What problem does the Transactional Outbox pattern solve?',
      },
      options: [
        {
          ru: 'Атомарность сохранения в БД и отправки в шину сообщений без потери событий',
          kk: 'Оқиғаларды жоғалтпай, ДҚ-ға сақтау мен хабарлама шинасына жіберудің атомарлығы',
          en: 'Atomically saving to the database and publishing to the message bus without losing events',
        },
        { ru: 'Ускорение HTTP-запросов', kk: 'HTTP-сұраныстарды жылдамдату', en: 'Speeding up HTTP requests' },
        { ru: 'Кэширование сессий пользователей в браузере', kk: 'Браузерде пайдаланушы сессияларын кэштеу', en: 'Caching user sessions in the browser' },
      ],
      correct_option: 0,
    },
    {
      id: 'q-open-domain-1',
      type: 'open_answer',
      topic_id: 'open_case',
      points: 20,
      text: {
        ru: 'Развернутый ответ: почему доменный слой не должен импортировать SQL-драйверы или структуры ORM?',
        kk: 'Толық жауап: неліктен домендік қабат SQL-драйверлерді немесе ORM құрылымдарын импорттамауы керек?',
        en: 'Open answer: why must the domain layer not import SQL drivers or ORM structures?',
      },
      rubric: [
        {
          id: 'independence',
          label: {
            ru: 'Независимость бизнес-правил от инфраструктуры',
            kk: 'Бизнес-ережелердің инфрақұрылымнан тәуелсіздігі',
            en: 'Business rules independent of infrastructure',
          },
          keywords: ['независим', 'инфраструкт', 'зависим', 'тәуелсіз', 'инфрақұрылым', 'тәуелді', 'independen', 'infrastructure', 'depend', 'coupl'],
        },
        {
          id: 'testability',
          label: { ru: 'Тестируемость без базы данных', kk: 'Дерекқорсыз тестілеу мүмкіндігі', en: 'Testability without a database' },
          keywords: ['тест', 'test'],
        },
        {
          id: 'replaceability',
          label: { ru: 'Возможность замены хранилища', kk: 'Сақтау қабатын ауыстыру мүмкіндігі', en: 'Ability to swap the storage layer' },
          keywords: ['замен', 'смен', 'другую', 'другой', 'ауыстыр', 'басқа', 'swap', 'replace', 'switch', 'change'],
        },
      ],
    },
  ],
};

export const TRACK_GO_ONBOARDING: ContentTrack = {
  id: 'trk-01',
  curator_name: 'Виктор Ким',
  title: {
    ru: 'Онбординг Go Backend-разработчика 2026',
    kk: 'Go Backend әзірлеушісінің онбордингі 2026',
    en: 'Go Backend Developer Onboarding 2026',
  },
  blocks: [
    {
      id: 'blk-1',
      type: 'material',
      title: {
        ru: 'Регламент чистой архитектуры Go-сервисов',
        kk: 'Go-сервистердің таза архитектура регламенті',
        en: 'Clean Architecture Guidelines for Go Services',
      },
      body: {
        ru: 'Чистая архитектура (Clean Architecture) предполагает строгое разделение ответственности по слоям: Domain, Use Case (бизнес-логика), Repository/Adapter (хранение) и Transport (HTTP/gRPC/NATS). Внутренние слои не должны зависеть от внешних библиотек и СУБД.',
        kk: 'Таза архитектура (Clean Architecture) жауапкершілікті қабаттарға қатаң бөлуді көздейді: Domain, Use Case (бизнес-логика), Repository/Adapter (сақтау) және Transport (HTTP/gRPC/NATS). Ішкі қабаттар сыртқы кітапханалар мен ДҚБЖ-ға тәуелді болмауы тиіс.',
        en: 'Clean Architecture enforces a strict separation of responsibilities across layers: Domain, Use Case (business logic), Repository/Adapter (storage) and Transport (HTTP/gRPC/NATS). Inner layers must not depend on external libraries or the database.',
      },
      takeaway: {
        ru: 'Бизнес-правила домена должны покрываться юнит-тестами без поднятия базы данных и внешних сетевых соединений.',
        kk: 'Доменнің бизнес-ережелері дерекқорды және сыртқы желілік қосылымдарды іске қоспай-ақ юнит-тесттермен тексерілуі тиіс.',
        en: 'Domain business rules must be covered by unit tests without starting a database or external network connections.',
      },
    },
    {
      id: 'blk-2',
      type: 'video',
      duration_label: '18:40',
      title: {
        ru: 'Видеоматериал: Transactional Outbox и NATS',
        kk: 'Бейнематериал: Transactional Outbox және NATS',
        en: 'Video: Transactional Outbox & NATS',
      },
      body: {
        ru: 'Практическая видеолекция о построении отказоустойчивой отправки событий в очередь через outbox-таблицу в единой ACID-транзакции с бизнес-данными.',
        kk: 'Бизнес-деректермен бірге бір ACID-транзакцияда outbox-кесте арқылы оқиғаларды кезекке сенімді жіберуді құру туралы практикалық бейнедәріс.',
        en: 'A practical video lecture on reliable event publishing through an outbox table within the same ACID transaction as the business data.',
      },
    },
    {
      id: 'blk-3',
      type: 'test',
      test_id: TEST_GO_ONBOARDING.id,
      title: TEST_GO_ONBOARDING.title,
      body: {
        ru: 'Контрольный тест из 3 вопросов с ограничением по времени и автосохранением ответов.',
        kk: 'Уақыт шектеуі және жауаптарды автосақтауы бар 3 сұрақтан тұратын бақылау тесті.',
        en: 'A timed 3-question assessment with automatic answer saving.',
      },
    },
    {
      id: 'blk-4',
      type: 'acknowledgment',
      title: {
        ru: 'Подтверждение ознакомления с политиками ИБ',
        kk: 'АҚ саясаттарымен танысқанын растау',
        en: 'Information Security Policy Acknowledgment',
      },
      body: {
        ru: 'Я подтверждаю, что ознакомился(-ась) с регламентом разработки и политиками безопасности, обязуюсь следовать стандартам чистого кода и защищать конфиденциальные данные компании.',
        kk: 'Әзірлеу регламентімен және қауіпсіздік саясаттарымен танысқанымды растаймын, таза код стандарттарын сақтауға және компанияның құпия деректерін қорғауға міндеттенемін.',
        en: "I confirm that I have read the development guidelines and security policies, and I commit to following clean code standards and protecting the company's confidential data.",
      },
    },
  ],
};

export const CONTENT_TRACKS: ContentTrack[] = [TRACK_GO_ONBOARDING];
export const CONTENT_TESTS: ContentTest[] = [TEST_GO_ONBOARDING];

// ---------------------------------------------------------------------------
// Corporate knowledge base used by the RAG assistant mock.
// ---------------------------------------------------------------------------

export interface KnowledgeEntry {
  id: string;
  scopes: string[];
  keywords: string[];
  answer: LocalizedText;
  citation: { title: LocalizedText; section: LocalizedText; snippet: LocalizedText };
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'kb-outbox',
    scopes: ['all', 'dev'],
    keywords: ['outbox', 'nats', 'jetstream', 'идемпотент', 'idempoten', 'идемпотентт'],
    answer: {
      ru: 'Паттерн Transactional Outbox решает проблему атомарности: изменения доменных данных и событие для NATS JetStream сохраняются в одной транзакции PostgreSQL в таблицу outbox_events. Отдельный воркер считывает новые записи и публикует их в шину с подтверждением ACK. Для идемпотентности консьюмер хранит ID обработанных событий в таблице processed_events.',
      kk: 'Transactional Outbox паттерні атомарлық мәселесін шешеді: домендік деректердің өзгерістері мен NATS JetStream-ге арналған оқиға бір PostgreSQL транзакциясында outbox_events кестесіне сақталады. Жеке воркер жаңа жазбаларды оқып, оларды ACK растауымен шинаға жариялайды. Идемпотенттілік үшін консьюмер өңделген оқиғалардың ID-ларын processed_events кестесінде сақтайды.',
      en: 'The Transactional Outbox pattern solves atomicity: domain data changes and the NATS JetStream event are saved to the outbox_events table in a single PostgreSQL transaction. A separate worker reads new rows and publishes them to the bus with ACK confirmation. For idempotency, the consumer stores processed event IDs in the processed_events table.',
    },
    citation: {
      title: { ru: 'Архитектурный стандарт микросервисов Go', kk: 'Go микросервистерінің архитектуралық стандарты', en: 'Go Microservices Architecture Standard' },
      section: { ru: '§4.2 Transactional Outbox и NATS', kk: '§4.2 Transactional Outbox және NATS', en: '§4.2 Transactional Outbox & NATS' },
      snippet: {
        ru: 'Атомарность БД и шины достигается записью в локальную outbox-таблицу.',
        kk: 'ДҚ мен шинаның атомарлығы жергілікті outbox-кестеге жазу арқылы қамтамасыз етіледі.',
        en: 'Database and bus atomicity is achieved by writing to a local outbox table.',
      },
    },
  },
  {
    id: 'kb-passwords',
    scopes: ['all', 'security'],
    keywords: ['парол', '2fa', 'mfa', 'password', 'құпиясөз', 'totp'],
    answer: {
      ru: 'Согласно регламенту информационной безопасности 2026: минимальная длина пароля — 12 символов. Для всех корпоративных учетных записей обязательна двухфакторная аутентификация (TOTP/MFA). Запрещено использовать одинаковые пароли во внешних сервисах.',
      kk: '2026 жылғы ақпараттық қауіпсіздік регламентіне сәйкес: құпиясөздің ең аз ұзындығы — 12 таңба. Барлық корпоративтік тіркелгілер үшін екі факторлы аутентификация (TOTP/MFA) міндетті. Сыртқы сервистерде бірдей құпиясөздерді қолдануға тыйым салынады.',
      en: 'Per the 2026 Information Security Policy: the minimum password length is 12 characters. Two-factor authentication (TOTP/MFA) is mandatory for all corporate accounts. Reusing passwords on external services is prohibited.',
    },
    citation: {
      title: { ru: 'Регламент информационной безопасности 2026', kk: '2026 жылғы ақпараттық қауіпсіздік регламенті', en: 'Information Security Policy 2026' },
      section: { ru: '§2.1 Парольная политика и MFA', kk: '§2.1 Құпиясөз саясаты және MFA', en: '§2.1 Password policy & MFA' },
      snippet: {
        ru: 'Обязательное использование TOTP-аутентификатора и смена паролей каждые 90 дней.',
        kk: 'TOTP-аутентификаторды міндетті түрде қолдану және құпиясөзді 90 күн сайын ауыстыру.',
        en: 'Mandatory use of a TOTP authenticator and password rotation every 90 days.',
      },
    },
  },
  {
    id: 'kb-clean-arch',
    scopes: ['all', 'dev'],
    keywords: ['clean architecture', 'чистой архитектур', 'чистая архитектур', 'таза архитектура', 'domain', 'домен'],
    answer: {
      ru: 'Стандарт Clean Architecture в Go-сервисах: доменный слой содержит сущности и бизнес-правила и не импортирует инфраструктурные пакеты. Интерфейсы репозиториев объявляются в слое Use Case, а их реализации — в адаптерах. Транспортный слой (HTTP/gRPC/NATS) только преобразует запросы и вызывает сценарии.',
      kk: 'Go-сервистердегі Clean Architecture стандарты: домендік қабатта нысандар мен бизнес-ережелер болады және ол инфрақұрылымдық пакеттерді импорттамайды. Репозиторий интерфейстері Use Case қабатында жарияланады, ал олардың іске асырылуы — адаптерлерде. Көліктік қабат (HTTP/gRPC/NATS) тек сұраныстарды түрлендіріп, сценарийлерді шақырады.',
      en: 'The Clean Architecture standard for Go services: the domain layer holds entities and business rules and never imports infrastructure packages. Repository interfaces are declared in the Use Case layer and implemented in adapters. The transport layer (HTTP/gRPC/NATS) only maps requests and invokes use cases.',
    },
    citation: {
      title: { ru: 'Архитектурный стандарт микросервисов Go', kk: 'Go микросервистерінің архитектуралық стандарты', en: 'Go Microservices Architecture Standard' },
      section: { ru: '§2 Слои и зависимости', kk: '§2 Қабаттар мен тәуелділіктер', en: '§2 Layers and dependencies' },
      snippet: {
        ru: 'Зависимости направлены только внутрь: от транспорта к домену.',
        kk: 'Тәуелділіктер тек ішке қарай бағытталады: көліктен доменге.',
        en: 'Dependencies point inward only: from transport to domain.',
      },
    },
  },
  {
    id: 'kb-incident',
    scopes: ['all', 'security'],
    keywords: ['инцидент', 'incident', 'инцидент', 'фишинг', 'phishing', 'утечк', 'leak', 'ағып'],
    answer: {
      ru: 'При подозрении на инцидент ИБ: не перезагружайте затронутые системы, немедленно отзовите скомпрометированные токены и сессии, сохраните журналы аудита и сообщите дежурному инженеру ИБ через защищенный канал. О фишинговых письмах сообщайте кнопкой «Сообщить о фишинге», не открывая вложения.',
      kk: 'АҚ инцидентіне күдік болса: зардап шеккен жүйелерді қайта жүктемеңіз, бұзылған токендер мен сессияларды дереу кері қайтарып алыңыз, аудит журналдарын сақтаңыз және қорғалған арна арқылы кезекші АҚ инженеріне хабарлаңыз. Фишингтік хаттар туралы салымдарды ашпай, «Фишинг туралы хабарлау» батырмасымен хабарлаңыз.',
      en: 'If you suspect a security incident: do not reboot affected systems, immediately revoke compromised tokens and sessions, preserve audit logs and notify the on-call security engineer via a secure channel. Report phishing emails with the "Report phishing" button without opening attachments.',
    },
    citation: {
      title: { ru: 'Регламент реагирования на инциденты ИБ', kk: 'АҚ инциденттеріне әрекет ету регламенті', en: 'Security Incident Response Procedure' },
      section: { ru: 'Раздел 3. Первичные действия', kk: '3-бөлім. Бастапқы әрекеттер', en: 'Section 3. First response' },
      snippet: {
        ru: 'Сохранность журналов аудита важнее скорости восстановления сервиса.',
        kk: 'Аудит журналдарының сақталуы сервисті қалпына келтіру жылдамдығынан маңыздырақ.',
        en: 'Preserving audit logs takes priority over the speed of service recovery.',
      },
    },
  },
];

/** Phrases that indicate an attempt to override the assistant's instructions. */
export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore (all|any|the)?\s*(previous|prior|above) (instructions|prompts?)/i,
  /(reveal|show|print).{0,20}(system prompt|instructions)/i,
  /игнорируй|забудь (все|предыдущие)|системн(ый|ого) промпт/i,
  /нұсқауларды елеме|алдыңғы нұсқаулар/i,
  /act as (an? )?(admin|administrator|root)/i,
];

// ---------------------------------------------------------------------------
// Seed open-answer reviews and integrity events (admin queues).
// ---------------------------------------------------------------------------

const Q_INCIDENT: LocalizedText = {
  ru: 'Опишите алгоритм действий дежурного инженера при обнаружении несанкционированного изменения ролей в базе данных.',
  kk: 'Дерекқорда рөлдердің рұқсатсыз өзгертілгенін анықтаған кезде кезекші инженердің әрекет алгоритмін сипаттаңыз.',
  en: 'Describe the on-call engineer’s procedure when an unauthorized role change is detected in the database.',
};

export interface SeedReview {
  id: string;
  organization_id: string;
  student_name: string;
  question_text: LocalizedText;
  student_answer: string;
  ai_score: number;
  max_score: number;
  ai_confidence: number;
  ai_justification: LocalizedText;
  matched_criteria: LocalizedText[];
  missed_criteria: LocalizedText[];
  cluster_tag: LocalizedText;
  status: 'pending' | 'approved' | 'overridden';
  reviewer_comment?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  attempt_id?: string;
  created_at: string;
}

export const initialReviews: SeedReview[] = [
  {
    id: 'rev-001',
    organization_id: 'org-fintech-01',
    student_name: 'Марат Жумабаев',
    question_text: Q_INCIDENT,
    student_answer: 'Сразу блокирую подозрительную сессию через revoke токена, проверяю audit_logs для выявления ip и аккаунта инициатора, пишу в канал безопасности инцидент и оповещаю CISO.',
    ai_score: 18,
    max_score: 20,
    ai_confidence: 94,
    ai_justification: {
      ru: 'Ответ покрывает первоочередные меры локализации инцидента и эскалацию. Не упомянуто сохранение снапшота логов для форензики — снято 2 балла.',
      kk: 'Жауап инцидентті оқшаулаудың бірінші кезектегі шаралары мен эскалацияны қамтиды. Форензика үшін журнал снапшотын сақтау айтылмаған — 2 балл алынды.',
      en: 'The answer covers the first-response containment steps and escalation. Preserving a log snapshot for forensics is not mentioned — 2 points deducted.',
    },
    matched_criteria: [
      { ru: 'Блокировка сессии/токена', kk: 'Сессияны/токенді бұғаттау', en: 'Session/token revocation' },
      { ru: 'Аудит таблицы audit_logs', kk: 'audit_logs кестесін тексеру', en: 'audit_logs review' },
      { ru: 'Эскалация CISO', kk: 'CISO-ға эскалациялау', en: 'Escalation to the CISO' },
    ],
    missed_criteria: [
      { ru: 'Снятие дампа сессий для форензики', kk: 'Форензика үшін сессиялар дампын алу', en: 'Capturing a session dump for forensics' },
    ],
    cluster_tag: { ru: 'Инциденты ИБ: эскалация и изоляция', kk: 'АҚ инциденттері: эскалация және оқшаулау', en: 'Security incidents: escalation & isolation' },
    status: 'pending',
    created_at: '2026-10-12T10:15:00Z',
  },
  {
    id: 'rev-002',
    organization_id: 'org-fintech-01',
    student_name: 'Александр Петров',
    question_text: Q_INCIDENT,
    student_answer: 'Перезагружаю контейнер сервиса и пишу в общий чат разработчиков о странной активности.',
    ai_score: 5,
    max_score: 20,
    ai_confidence: 96,
    ai_justification: {
      ru: 'Грубая ошибка: перезагрузка контейнера уничтожает оперативные логи сессии и не отзывает скомпрометированный токен. Нет уведомления службы ИБ.',
      kk: 'Өрескел қате: контейнерді қайта жүктеу сессияның жедел журналдарын жояды және бұзылған токенді кері қайтармайды. АҚ қызметіне хабарлама жоқ.',
      en: 'Critical mistake: restarting the container destroys live session logs and does not revoke the compromised token. The security team is not notified.',
    },
    matched_criteria: [{ ru: 'Попытка реакции на инцидент', kk: 'Инцидентке әрекет ету әрекеті', en: 'Attempted incident response' }],
    missed_criteria: [
      { ru: 'Блокировка скомпрометированной сессии', kk: 'Бұзылған сессияны бұғаттау', en: 'Blocking the compromised session' },
      { ru: 'Аудит логов', kk: 'Журналдарды тексеру', en: 'Log audit' },
      { ru: 'Эскалация CISO', kk: 'CISO-ға эскалациялау', en: 'Escalation to the CISO' },
    ],
    cluster_tag: { ru: 'Ошибочная перезагрузка вместо изоляции', kk: 'Оқшаулаудың орнына қате қайта жүктеу', en: 'Restart instead of isolation' },
    status: 'pending',
    created_at: '2026-10-13T08:40:00Z',
  },
  {
    id: 'rev-003',
    organization_id: 'org-fintech-01',
    student_name: 'Нурлан Сейтов',
    question_text: {
      ru: 'Как предотвратить дублирование сообщений при повторной доставке из очереди NATS?',
      kk: 'NATS кезегінен қайта жеткізу кезінде хабарламалардың қайталануын қалай болдырмауға болады?',
      en: 'How do you prevent duplicate messages on redelivery from a NATS queue?',
    },
    student_answer: 'Реализовать идемпотентный консьюмер с проверкой id сообщения в кэше Redis или в таблице обработанных событий в транзакции.',
    ai_score: 20,
    max_score: 20,
    ai_confidence: 98,
    ai_justification: {
      ru: 'Полный ответ: указаны оба рекомендуемых варианта (дедупликация в кэше и транзакционная фиксация в БД).',
      kk: 'Толық жауап: ұсынылған екі нұсқа да көрсетілген (кэштегі дедупликация және ДҚ-дағы транзакциялық тіркеу).',
      en: 'Complete answer: both recommended options are given (cache deduplication and transactional recording in the database).',
    },
    matched_criteria: [
      { ru: 'Идемпотентный консьюмер', kk: 'Идемпотентті консьюмер', en: 'Idempotent consumer' },
      { ru: 'Транзакционная дедупликация', kk: 'Транзакциялық дедупликация', en: 'Transactional deduplication' },
    ],
    missed_criteria: [],
    cluster_tag: { ru: 'Идемпотентность распределенных очередей', kk: 'Таратылған кезектердің идемпотенттілігі', en: 'Idempotency of distributed queues' },
    status: 'approved',
    reviewed_by: 'Алина Садыкова',
    reviewed_at: '2026-10-14T12:00:00Z',
    created_at: '2026-10-11T15:20:00Z',
  },
];

export type IntegrityEventType = 'tab_switch' | 'focus_loss' | 'copy_paste' | 'rapid_answering' | 'ai_text_detected';

export interface SeedIntegrityEvent {
  id: string;
  organization_id: string;
  student_name: string;
  user_id?: string;
  test_title: LocalizedText;
  event_type: IntegrityEventType;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  /** Structured parameters; the UI renders a localized description from them. */
  params: { seconds?: number; question?: number; chars?: number };
  status: 'new' | 'dismissed' | 'escalated';
  resolution_note?: string;
  resolved_by?: string;
  resolved_at?: string;
}

const T_GO_ENTRY: LocalizedText = {
  ru: 'Входное тестирование по стандартам Go',
  kk: 'Go стандарттары бойынша кіріс тестілеуі',
  en: 'Go Standards Entry Test',
};

export const initialIntegrityEvents: SeedIntegrityEvent[] = [
  {
    id: 'evt-001', organization_id: 'org-fintech-01', student_name: 'Марат Жумабаев', test_title: T_GO_ENTRY,
    event_type: 'tab_switch', severity: 'low', timestamp: '2026-10-14T14:22:10Z', params: { seconds: 4, question: 7 }, status: 'new',
  },
  {
    id: 'evt-002', organization_id: 'org-fintech-01', student_name: 'Алексей Смирнов',
    test_title: { ru: 'Ежегодный аудит ИБ 2026', kk: '2026 жылғы жыл сайынғы АҚ аудиті', en: 'Annual Security Audit 2026' },
    event_type: 'copy_paste', severity: 'medium', timestamp: '2026-10-14T11:05:40Z', params: { chars: 140, question: 3 }, status: 'new',
  },
  {
    id: 'evt-003', organization_id: 'org-fintech-01', student_name: 'Нурлан Сейтов',
    test_title: { ru: 'Тест по микросервисам', kk: 'Микросервистер бойынша тест', en: 'Microservices Test' },
    event_type: 'rapid_answering', severity: 'high', timestamp: '2026-10-13T16:45:12Z', params: { seconds: 1.8, question: 5 },
    status: 'escalated', resolution_note: 'Передано куратору направления для устного собеседования.', resolved_by: 'Алина Садыкова', resolved_at: '2026-10-13T17:00:00Z',
  },
  {
    id: 'evt-004', organization_id: 'org-fintech-01', student_name: 'Дина Сабитова',
    test_title: { ru: 'Комплаенс ИБ', kk: 'АҚ комплаенсі', en: 'Security Compliance' },
    event_type: 'focus_loss', severity: 'low', timestamp: '2026-10-10T09:12:05Z', params: { seconds: 1 },
    status: 'dismissed', resolution_note: 'Признаков академической нечестности нет.', resolved_by: 'Алина Садыкова', resolved_at: '2026-10-10T10:00:00Z',
  },
];
