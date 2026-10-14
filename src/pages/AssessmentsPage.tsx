import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Plus,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Shuffle,
  ShieldAlert,
  FileText,
  Copy,
  Trash2,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { Card, Badge, Button, Tabs, Modal, Input } from '@iclever/frontend-kit';

interface QuestionItem {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'open_answer' | 'matching' | 'ordering' | 'scenario';
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  options?: string[];
  source_fragment?: string;
}

interface AssessmentTest {
  id: string;
  title: string;
  description: string;
  questions_count: number;
  time_limit_minutes: number;
  passing_score_percent: number;
  shuffle_questions: boolean;
  integrity_monitoring: boolean;
  version: number;
}

const initialQuestions: QuestionItem[] = [
  {
    id: 'q-1',
    text: 'Что из перечисленного является ключевым требованием шаблона Transactional Outbox в Go сервисах?',
    type: 'single_choice',
    topic: 'Архитектура Go',
    difficulty: 'medium',
    points: 10,
    options: [
      'Публикация сообщения в брокер строго до сохранения в БД',
      'Запись исходящего события в таблицу outbox_events внутри единой транзакции с бизнес-данными',
      'Использование асинхронного REST вызова без гарантии доставки',
      'Обязательное применение Kafka с репликацией 3',
    ],
    source_fragment: 'Архитектурный стандарт микросервисов Go, §4.2',
  },
  {
    id: 'q-2',
    text: 'Выберите ВСЕ обязательные меры при обнаружении попытки несанкционированного доступа к серверу:',
    type: 'multiple_choice',
    topic: 'Информационная безопасность',
    difficulty: 'hard',
    points: 15,
    options: [
      'Немедленно отозвать активные JWT токены скомпрометированного аккаунта',
      'Удалить системные логи для освобождения места на диске',
      'Оповестить дежурного офицера ИБ через зашифрованный канал связи',
      'Изолировать скомпрометированный узел из внутренней корпоративной подсети',
    ],
    source_fragment: 'Регламент реагирования на инциденты ИБ, раздел 3',
  },
  {
    id: 'q-3',
    text: 'Опишите, как в мультиарендной (Multi-tenant) архитектуре обеспечивается изоляция данных между компаниями на уровне PostgreSQL:',
    type: 'open_answer',
    topic: 'Архитектура БД',
    difficulty: 'hard',
    points: 20,
    source_fragment: 'Регламент изоляции тенантов и безопасности хранения данных',
  },
  {
    id: 'q-4',
    text: 'Разрешено ли сохранять нехешированные пароли сотрудников во временных логах отладки?',
    type: 'true_false',
    topic: 'Информационная безопасность',
    difficulty: 'easy',
    points: 5,
    options: ['Да', 'Нет'],
    source_fragment: 'Политика конфиденциальности и аутентификации §1.4',
  },
];

const initialTests: AssessmentTest[] = [
  {
    id: 't-1',
    title: 'Итоговая аттестация: Онбординг Go Backend 2026',
    description: 'Комплексный срез знаний стандартов Clean Architecture, Transactional Outbox, NATS и PostgreSQL.',
    questions_count: 15,
    time_limit_minutes: 30,
    passing_score_percent: 80,
    shuffle_questions: true,
    integrity_monitoring: true,
    version: 2,
  },
  {
    id: 't-2',
    title: 'Обязательный тест: Информационная безопасность и 152-ФЗ / РК',
    description: 'Ежегодная проверка знаний правил защиты персональных данных, 2FA и защиты от фишинга.',
    questions_count: 10,
    time_limit_minutes: 20,
    passing_score_percent: 85,
    shuffle_questions: true,
    integrity_monitoring: true,
    version: 1,
  },
];

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bank' | 'tests'>('bank');
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [tests, setTests] = useState<AssessmentTest[]>(initialTests);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBank, setSortBank] = useState<'points_desc' | 'points_asc' | 'difficulty' | 'topic'>('points_desc');

  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('Архитектурные паттерны микросервисов');
  const [aiCount, setAiCount] = useState(3);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Question Creator Modal
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<QuestionItem['type']>('single_choice');
  const [newQTopic, setNewQTopic] = useState('Архитектура Go');
  const [newQDifficulty, setNewQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newQPoints, setNewQPoints] = useState(10);
  const [newQOptions, setNewQOptions] = useState('Вариант 1\nВариант 2\nВариант 3');

  // Test Creator Modal
  const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [newTestTime, setNewTestTime] = useState(25);
  const [newTestPassing, setNewTestPassing] = useState(80);
  const [newTestShuffle, setNewTestShuffle] = useState(true);
  const [newTestIntegrity, setNewTestIntegrity] = useState(true);

  const typeLabels: Record<QuestionItem['type'], string> = {
    single_choice: 'Одиночный выбор',
    multiple_choice: 'Множественный выбор',
    true_false: 'Да/Нет',
    short_answer: 'Краткий ответ',
    open_answer: 'Развернутый ответ (AI)',
    matching: 'Сопоставление',
    ordering: 'Упорядочивание',
    scenario: 'Ситуационный кейс',
  };

  // AI Generator
  const handleGenerateAiQuestions = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      setIsGeneratingAi(false);
      setIsAiModalOpen(false);

      const generated: QuestionItem[] = [
        {
          id: 'q-ai-' + Date.now(),
          text: `[AI] Каким образом гарантируется изоляция контекстов в доменной модели при использовании ${aiTopic}?`,
          type: 'open_answer',
          topic: aiTopic,
          difficulty: aiDifficulty,
          points: 15,
          source_fragment: 'Автоматически извлечено AI из базы знаний компании',
        },
        {
          id: 'q-ai-' + (Date.now() + 1),
          text: `[AI] Выберите корректный способ масштабирования шины событий для ${aiTopic}:`,
          type: 'single_choice',
          topic: aiTopic,
          difficulty: aiDifficulty,
          points: 10,
          options: ['Через кластеризацию брокера с репликацией Raft', 'Через увеличение размера БД', 'Через отказ от очередей'],
          source_fragment: 'Архитектурные регламенты iClever Platform',
        },
      ];

      setQuestions([...generated, ...questions]);
    }, 1200);
  };

  // Create Question Submit
  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) return;

    const opts = newQType === 'open_answer' || newQType === 'short_answer'
      ? undefined
      : newQOptions.split('\n').filter((o) => o.trim().length > 0);

    const item: QuestionItem = {
      id: 'q-' + Date.now(),
      text: newQText.trim(),
      type: newQType,
      topic: newQTopic,
      difficulty: newQDifficulty,
      points: Number(newQPoints) || 10,
      options: opts,
      source_fragment: 'Создано методистом вручную',
    };

    setQuestions([item, ...questions]);
    setIsCreateQuestionModalOpen(false);
    setNewQText('');
  };

  // Create Test Submit
  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTitle.trim()) return;

    const newTest: AssessmentTest = {
      id: 't-' + Date.now(),
      title: newTestTitle.trim(),
      description: newTestDesc.trim() || 'Корпоративное тестирование персонала',
      questions_count: questions.length,
      time_limit_minutes: Number(newTestTime) || 20,
      passing_score_percent: Number(newTestPassing) || 80,
      shuffle_questions: newTestShuffle,
      integrity_monitoring: newTestIntegrity,
      version: 1,
    };

    setTests([newTest, ...tests]);
    setIsCreateTestModalOpen(false);
    setNewTestTitle('');
    setNewTestDesc('');
    setActiveTab('tests');
  };

  // Filtered & Sorted Questions
  const filteredQuestions = questions
    .filter((q) => {
      const matchSearch = q.text.toLowerCase().includes(search.toLowerCase()) || q.topic.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || q.type === typeFilter;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      if (sortBank === 'points_desc') return b.points - a.points;
      if (sortBank === 'points_asc') return a.points - b.points;
      if (sortBank === 'topic') return a.topic.localeCompare(b.topic, 'ru');
      if (sortBank === 'difficulty') {
        const order = { easy: 1, medium: 2, hard: 3 };
        return order[b.difficulty] - order[a.difficulty];
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Банк вопросов и конструктор тестирования</h1>
          <p className="text-xs text-slate-500 mt-1">
            8 типов вопросов, семантическая привязка к регламентам, таймеры, случайный порядок и анти-чит
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={() => setIsAiModalOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
            AI-Генерация вопросов
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => (activeTab === 'bank' ? setIsCreateQuestionModalOpen(true) : setIsCreateTestModalOpen(true))}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {activeTab === 'bank' ? 'Создать вопрос' : 'Собрать тест'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'bank', label: 'Банк вопросов', count: questions.length },
          { id: 'tests', label: 'Готовые тесты и аттестации', count: tests.length },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* Content */}
      {activeTab === 'bank' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по формулировке вопроса или топику..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
              >
                <option value="all">Все типы вопросов</option>
                <option value="single_choice">Одиночный выбор</option>
                <option value="multiple_choice">Множественный выбор</option>
                <option value="true_false">Да/Нет</option>
                <option value="open_answer">Открытый ответ (AI)</option>
              </select>

              <select
                value={sortBank}
                onChange={(e) => setSortBank(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium"
              >
                <option value="points_desc">Баллы: по убыванию</option>
                <option value="points_asc">Баллы: по возрастанию</option>
                <option value="difficulty">По сложности</option>
                <option value="topic">По теме</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                onClick={() => setSelectedQuestion(q)}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                      {typeLabels[q.type]}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{q.topic}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">Баллы: <strong>{q.points}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'medium' ? 'warning' : 'success'}>
                      {q.difficulty}
                    </Badge>
                    <span className="text-indigo-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Подробнее →
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {q.text}
                </h3>

                {q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 pt-1">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredQuestions.length === 0 && (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                Вопросы по заданным критериям не найдены
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((t) => (
            <div key={t.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                    v{t.version} • {t.questions_count} вопросов
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                </div>
                <Badge variant="success">Готов к сдаче</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400">Таймер:</span> <strong className="text-slate-700">{t.time_limit_minutes} мин</strong>
                </div>
                <div>
                  <span className="text-slate-400">Проходной балл:</span> <strong className="text-slate-700">{t.passing_score_percent}%</strong>
                </div>
                <div>
                  <span className="text-slate-400">Перемешивание:</span> <strong className="text-slate-700">{t.shuffle_questions ? 'Включено' : 'Выкл'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Контроль фокуса:</span> <strong className="text-slate-700">{t.integrity_monitoring ? 'Активен' : 'Выкл'}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => navigate('/corporate/my/player?view=test')}>
                  Предпросмотр
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/corporate/assignments')}>
                  Назначить тест
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Details Modal with Source Fragment */}
      {selectedQuestion && (
        <Modal
          isOpen={!!selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          title="Сведения о вопросе"
          size="md"
        >
          <div className="space-y-4 text-xs py-2 text-slate-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-600">{typeLabels[selectedQuestion.type]} • {selectedQuestion.topic}</span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedQuestion.text}</h3>
            </div>

            {selectedQuestion.options && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Варианты ответов:</h4>
                <div className="space-y-1.5">
                  {selectedQuestion.options.map((opt, i) => (
                    <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedQuestion.source_fragment && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                <div className="font-semibold flex items-center text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Привязка к первоисточнику в регламенте:
                </div>
                <p className="text-xs text-amber-800 italic">{selectedQuestion.source_fragment}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setSelectedQuestion(null)}>Закрыть</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setQuestions([
                    { ...selectedQuestion, id: 'q-copy-' + Date.now(), text: `[Копия] ${selectedQuestion.text}` },
                    ...questions,
                  ]);
                  setSelectedQuestion(null);
                }}
              >
                <Copy className="w-4 h-4 mr-1" />
                Дублировать
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Create Question */}
      {isCreateQuestionModalOpen && (
        <Modal
          isOpen={isCreateQuestionModalOpen}
          onClose={() => setIsCreateQuestionModalOpen(false)}
          title="Создать вопрос в банк"
          subtitle="Добавьте новый контрольный вопрос с вариантами ответов или открытой формулировкой"
          size="md"
        >
          <form onSubmit={handleCreateQuestion} className="space-y-4 py-2 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Формулировка вопроса</label>
              <textarea
                rows={3}
                placeholder="Введите текст вопроса..."
                value={newQText}
                onChange={(e) => setNewQText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Тип вопроса</label>
                <select
                  value={newQType}
                  onChange={(e) => setNewQType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="single_choice">Одиночный выбор</option>
                  <option value="multiple_choice">Множественный выбор</option>
                  <option value="true_false">Да / Нет</option>
                  <option value="open_answer">Открытый ответ (AI)</option>
                  <option value="short_answer">Краткий ответ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Тема / Раздел</label>
                <input
                  type="text"
                  value={newQTopic}
                  onChange={(e) => setNewQTopic(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Сложность</label>
                <select
                  value={newQDifficulty}
                  onChange={(e) => setNewQDifficulty(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="easy">Легкая</option>
                  <option value="medium">Средняя</option>
                  <option value="hard">Сложная</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Баллы за ответ</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newQPoints}
                  onChange={(e) => setNewQPoints(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>

            {newQType !== 'open_answer' && newQType !== 'short_answer' && (
              <div>
                <label className="block text-slate-700 font-medium mb-1">Варианты ответов (по одному на строку)</label>
                <textarea
                  rows={3}
                  value={newQOptions}
                  onChange={(e) => setNewQOptions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" type="button" onClick={() => setIsCreateQuestionModalOpen(false)}>Отмена</Button>
              <Button variant="primary" type="submit">Сохранить в банк</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Create Test */}
      {isCreateTestModalOpen && (
        <Modal
          isOpen={isCreateTestModalOpen}
          onClose={() => setIsCreateTestModalOpen(false)}
          title="Собрать новый тест"
          subtitle="Сформируйте контрольное тестирование из банка вопросов"
          size="md"
        >
          <form onSubmit={handleCreateTest} className="space-y-4 py-2 text-xs">
            <Input
              label="Название теста"
              placeholder="Например: Аттестация по Clean Architecture 2026"
              value={newTestTitle}
              onChange={(e) => setNewTestTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-slate-700 font-medium mb-1">Описание и цель теста</label>
              <textarea
                rows={2}
                placeholder="Краткое описание программы аттестации..."
                value={newTestDesc}
                onChange={(e) => setNewTestDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Лимит времени (минут)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={newTestTime}
                  onChange={(e) => setNewTestTime(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Проходной балл (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={newTestPassing}
                  onChange={(e) => setNewTestPassing(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTestShuffle}
                  onChange={(e) => setNewTestShuffle(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">Перемешивать порядок вопросов и вариантов</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTestIntegrity}
                  onChange={(e) => setNewTestIntegrity(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">Включить мониторинг честности (потеря фокуса вкладки)</span>
              </label>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" type="button" onClick={() => setIsCreateTestModalOpen(false)}>Отмена</Button>
              <Button variant="primary" type="submit">Создать тест</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* AI Generate Questions Modal */}
      {isAiModalOpen && (
        <Modal
          isOpen={isAiModalOpen}
          onClose={() => !isGeneratingAi && setIsAiModalOpen(false)}
          title="AI-Генерация тестовых вопросов"
          size="md"
        >
          <div className="space-y-4 text-xs py-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Тема или исходный регламент</label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Количество вопросов</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Сложность</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="easy">Легкая (Базовые понятия)</option>
                  <option value="medium">Средняя (Применение на практике)</option>
                  <option value="hard">Сложная (Архитектурные кейсы)</option>
                </select>
              </div>
            </div>

            {isGeneratingAi && (
              <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center space-x-3 text-indigo-900">
                <span className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                <span>AI формулирует вопросы, варианты дистракторов и критерии оценки...</span>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" disabled={isGeneratingAi} onClick={() => setIsAiModalOpen(false)}>Отмена</Button>
              <Button variant="primary" disabled={isGeneratingAi} onClick={handleGenerateAiQuestions}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {isGeneratingAi ? 'Генерация...' : 'Сгенерировать вопросы'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
