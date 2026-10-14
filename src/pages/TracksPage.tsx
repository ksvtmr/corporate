import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  Award,
  ChevronRight,
  GripVertical,
  Play,
  ArrowRight,
  Layers,
  FileText,
  Video,
  CheckSquare,
  Users
} from 'lucide-react';
import { Button, Card, Badge, Input, Modal } from '@iclever/frontend-kit';

interface TrackBlock {
  id: string;
  type: 'material' | 'video' | 'test' | 'open_question' | 'flashcards' | 'acknowledgment';
  title: string;
  duration_minutes: number;
  transition_rule: 'sequential' | 'free' | 'must_complete_previous' | 'min_score_70';
}

interface LearningTrack {
  id: string;
  title: string;
  type: 'onboarding' | 'compliance' | 'role_training' | 'safety' | 'custom';
  status: 'draft' | 'in_review' | 'published' | 'archived';
  description: string;
  target_department: string;
  total_duration_hours: number;
  passing_score_percent: number;
  enrolled_count: number;
  completion_rate: number;
  blocks: TrackBlock[];
}

const initialTracks: LearningTrack[] = [
  {
    id: 'trk-01',
    title: 'Онбординг Go Backend разработчика 2026',
    type: 'onboarding',
    status: 'published',
    description: 'Комплексный вводный трек: чистая архитектура, NATS JetStream, PostgreSQL тенантность, стандарты тестирования.',
    target_department: 'Инженерия и разработка',
    total_duration_hours: 16,
    passing_score_percent: 80,
    enrolled_count: 14,
    completion_rate: 92.8,
    blocks: [
      { id: 'blk-1', type: 'material', title: 'Регламент чистой архитектуры Go сервисов', duration_minutes: 45, transition_rule: 'sequential' },
      { id: 'blk-2', type: 'video', title: 'Воркшоп: NATS JetStream & Outbox паттерн', duration_minutes: 60, transition_rule: 'must_complete_previous' },
      { id: 'blk-3', type: 'flashcards', title: 'Термины и коды ошибок платформы', duration_minutes: 20, transition_rule: 'free' },
      { id: 'blk-4', type: 'test', title: 'Входное тестирование по стандартам Go', duration_minutes: 40, transition_rule: 'min_score_70' },
      { id: 'blk-5', type: 'open_question', title: 'Архитектурный кейс: проектирование сервиса отчетов', duration_minutes: 90, transition_rule: 'must_complete_previous' },
      { id: 'blk-6', type: 'acknowledgment', title: 'Подтверждение ознакомления с политиками ИБ', duration_minutes: 10, transition_rule: 'must_complete_previous' },
    ],
  },
  {
    id: 'trk-02',
    title: 'Обязательный ежегодный аудит ИБ и 152-ФЗ / РК',
    type: 'compliance',
    status: 'published',
    description: 'Обязательный комплаенс-курс для всех сотрудников организации с контрольным тестированием и фиксацией в аудите.',
    target_department: 'Все подразделения',
    total_duration_hours: 4,
    passing_score_percent: 85,
    enrolled_count: 142,
    completion_rate: 88.4,
    blocks: [
      { id: 'blk-7', type: 'material', title: 'Политика паролей, 2FA и защита персональных данных', duration_minutes: 60, transition_rule: 'sequential' },
      { id: 'blk-8', type: 'test', title: 'Итоговый комплаенс тест по безопасности', duration_minutes: 30, transition_rule: 'min_score_70' },
      { id: 'blk-9', type: 'acknowledgment', title: 'Юридическое согласие с регламентом', duration_minutes: 5, transition_rule: 'must_complete_previous' },
    ],
  },
  {
    id: 'trk-03',
    title: 'B2B Продажи: Методология переговоров с корпоративными клиентами',
    type: 'role_training',
    status: 'draft',
    description: 'Техники работы со сложными возражениями безопасности, презентация ROI и подготовка коммерческих предложений.',
    target_department: 'Продажи и клиентский сервис',
    total_duration_hours: 8,
    passing_score_percent: 75,
    enrolled_count: 0,
    completion_rate: 0,
    blocks: [
      { id: 'blk-10', type: 'material', title: 'Сценарии проведения демо корпоративным клиентам', duration_minutes: 40, transition_rule: 'sequential' },
      { id: 'blk-11', type: 'open_question', title: 'Разбор реального кейса клиента из банковского сектора', duration_minutes: 60, transition_rule: 'must_complete_previous' },
    ],
  },
];

export const TracksPage: React.FC = () => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<LearningTrack[]>(initialTracks);
  const [selectedTrack, setSelectedTrack] = useState<LearningTrack | null>(null);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'duration_desc' | 'enrolled_desc' | 'title_asc'>('enrolled_desc');

  // AI Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiRole, setAiRole] = useState('Frontend React Инженер');
  const [aiDepartment, setAiDepartment] = useState('Инженерия и разработка');
  const [aiDuration, setAiDuration] = useState('2 недели');
  const [aiGoals, setAiGoals] = useState('Глубокое понимание дизайн-системы, Tailwind, TypeScript и архитектуры SPA');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Manual Create Modal
  const [isManualCreateModalOpen, setIsManualCreateModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDept, setManualDept] = useState('Инженерия и разработка');
  const [manualType, setManualType] = useState<LearningTrack['type']>('onboarding');
  const [manualDesc, setManualDesc] = useState('');
  const [manualHours, setManualHours] = useState(10);
  const [manualScore, setManualScore] = useState(80);

  const handleGenerateAiTrack = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      setIsGeneratingAi(false);
      setIsAiModalOpen(false);

      const generated: LearningTrack = {
        id: 'trk-ai-' + Date.now(),
        title: `Онбординг: ${aiRole}`,
        type: 'onboarding',
        status: 'draft',
        description: `Автоматически сформированный трек на основе корпоративных регламентов для подразделения ${aiDepartment}.`,
        target_department: aiDepartment,
        total_duration_hours: 12,
        passing_score_percent: 80,
        enrolled_count: 0,
        completion_rate: 0,
        blocks: [
          { id: 'g-1', type: 'material', title: 'Введение в архитектуру платформы и стек технологий', duration_minutes: 60, transition_rule: 'sequential' },
          { id: 'g-2', type: 'flashcards', title: 'Базовые термины и дизайн-токены', duration_minutes: 30, transition_rule: 'free' },
          { id: 'g-3', type: 'video', title: 'Разбор процесса ревью и CI/CD пайплайна', duration_minutes: 45, transition_rule: 'must_complete_previous' },
          { id: 'g-4', type: 'test', title: 'Тестирование знаний стандартов кода', duration_minutes: 30, transition_rule: 'min_score_70' },
          { id: 'g-5', type: 'open_question', title: 'Практическое задание: реализация компонента UI-кита', duration_minutes: 120, transition_rule: 'must_complete_previous' },
          { id: 'g-6', type: 'acknowledgment', title: 'Ознакомление с регламентом коммитов и релизов', duration_minutes: 10, transition_rule: 'must_complete_previous' },
        ],
      };

      setTracks([generated, ...tracks]);
      setSelectedTrack(generated);
    }, 1200);
  };

  const handleCreateManualTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const newTrack: LearningTrack = {
      id: 'trk-' + Date.now(),
      title: manualTitle.trim(),
      type: manualType,
      status: 'draft',
      description: manualDesc.trim() || 'Новая учебная программа организации',
      target_department: manualDept,
      total_duration_hours: Number(manualHours) || 8,
      passing_score_percent: Number(manualScore) || 80,
      enrolled_count: 0,
      completion_rate: 0,
      blocks: [
        { id: 'b-1', type: 'material', title: '1. Исходные регламенты и вводные положения', duration_minutes: 45, transition_rule: 'sequential' },
        { id: 'b-2', type: 'test', title: '2. Промежуточный срез знаний', duration_minutes: 30, transition_rule: 'min_score_70' },
      ],
    };

    setTracks([newTrack, ...tracks]);
    setSelectedTrack(newTrack);
    setIsManualCreateModalOpen(false);
    setManualTitle('');
    setManualDesc('');
  };

  const handlePublishTrack = (id: string) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, status: 'published' } : t)));
    if (selectedTrack?.id === id) {
      setSelectedTrack({ ...selectedTrack, status: 'published' });
    }
  };

  const blockIcons = {
    material: <FileText className="w-4 h-4 text-blue-600" />,
    video: <Video className="w-4 h-4 text-purple-600" />,
    test: <Award className="w-4 h-4 text-amber-600" />,
    open_question: <HelpCircle className="w-4 h-4 text-emerald-600" />,
    flashcards: <BookOpen className="w-4 h-4 text-indigo-600" />,
    acknowledgment: <CheckSquare className="w-4 h-4 text-slate-600" />,
  };

  // Filtered and sorted tracks
  const filteredTracks = tracks
    .filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.target_department.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    })
    .sort((a, b) => {
      if (sortOrder === 'title_asc') return a.title.localeCompare(b.title, 'ru');
      if (sortOrder === 'duration_desc') return b.total_duration_hours - a.total_duration_hours;
      return b.enrolled_count - a.enrolled_count;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Учебные треки и программы онбординга</h1>
          <p className="text-xs text-slate-500 mt-1">
            Конструктор последовательностей обучения, правила переходов между блоками и AI-генерация программ
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={() => setIsAiModalOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
            AI-Генерация трека
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsManualCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Создать трек
          </Button>
        </div>
      </div>

      {/* Filters & Sorting Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию трека или отделу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="all">Все статусы</option>
            <option value="published">Опубликован</option>
            <option value="draft">Черновик</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="all">Все типы</option>
            <option value="onboarding">Онбординг</option>
            <option value="compliance">Комплаенс</option>
            <option value="role_training">Обучение роли</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="enrolled_desc">Обучающихся (по убыванию)</option>
            <option value="duration_desc">По длительности (по убыванию)</option>
            <option value="title_asc">По названию (А — Я)</option>
          </select>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTracks.map((trk) => (
          <div
            key={trk.id}
            onClick={() => setSelectedTrack(trk)}
            className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
              selectedTrack?.id === trk.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {trk.type}
                </span>
                <Badge variant={trk.status === 'published' ? 'success' : 'info'}>
                  {trk.status === 'published' ? 'Опубликован' : 'Черновик'}
                </Badge>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1.5">
                {trk.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-3">{trk.description}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Блоков в программе:</span>
                <span className="font-semibold text-slate-700">{trk.blocks.length} шт. ({trk.total_duration_hours} ч.)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Обучающихся:</span>
                <span className="font-semibold text-slate-700">{trk.enrolled_count} чел. ({trk.completion_rate}%)</span>
              </div>
            </div>
          </div>
        ))}

        {filteredTracks.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            Треки обучения по заданным критериям не найдены
          </div>
        )}
      </div>

      {/* Track Builder Detail Modal */}
      {selectedTrack && (
        <Modal
          isOpen={!!selectedTrack}
          onClose={() => setSelectedTrack(null)}
          title={`Конструктор трека: ${selectedTrack.title}`}
          size="lg"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header info */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  {selectedTrack.target_department} • Порог прохождения: {selectedTrack.passing_score_percent}%
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedTrack.title}</h2>
                <p className="text-slate-500 mt-1">{selectedTrack.description}</p>
              </div>
              <Badge variant={selectedTrack.status === 'published' ? 'success' : 'info'}>
                {selectedTrack.status === 'published' ? 'Опубликован' : 'Черновик'}
              </Badge>
            </div>

            {/* Sequence of Blocks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">
                  Последовательность учебных блоков ({selectedTrack.blocks.length})
                </h4>
                <span className="text-[11px] text-slate-400">Структура программы обучения</span>
              </div>

              <div className="space-y-2">
                {selectedTrack.blocks.map((blk, idx) => (
                  <div
                    key={blk.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                        {blockIcons[blk.type]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{blk.title}</div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                          <span>Длительность: {blk.duration_minutes} мин</span>
                          <span>•</span>
                          <span>Правило: {blk.transition_rule === 'sequential' ? 'Последовательно' : blk.transition_rule === 'must_complete_previous' ? 'Строго после предыдущего' : blk.transition_rule === 'min_score_70' ? 'Мин. балл 70%' : 'Свободный доступ'}</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="info">{blk.type}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-400 text-xs">
                {selectedTrack.status === 'draft' ? '⚠️ Черновик не виден сотрудникам до явной публикации' : '✓ Трек активен и доступен для назначения'}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const trackTitle = encodeURIComponent(selectedTrack.title);
                    setSelectedTrack(null);
                    navigate(`/corporate/assignments?track=${trackTitle}`);
                  }}
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Назначить сотрудникам
                </Button>
                <Button variant="secondary" onClick={() => setSelectedTrack(null)}>Закрыть</Button>
                {selectedTrack.status !== 'published' && (
                  <Button variant="primary" onClick={() => handlePublishTrack(selectedTrack.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Опубликовать трек
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Track Create Modal */}
      {isManualCreateModalOpen && (
        <Modal
          isOpen={isManualCreateModalOpen}
          onClose={() => setIsManualCreateModalOpen(false)}
          title="Создать учебный трек"
          subtitle="Сформируйте новую программу обучения для подразделения"
          size="md"
        >
          <form onSubmit={handleCreateManualTrack} className="space-y-4 py-2 text-xs">
            <Input
              label="Название учебного трека"
              placeholder="Например: Архитектурные стандарты Go 2026"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Целевое подразделение</label>
                <select
                  value={manualDept}
                  onChange={(e) => setManualDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="Инженерия и разработка">Инженерия и разработка</option>
                  <option value="Продажи и клиентский сервис">Продажи и клиентский сервис</option>
                  <option value="People & HR">People & HR</option>
                  <option value="Все подразделения">Все подразделения</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Тип программы</label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="onboarding">Онбординг</option>
                  <option value="compliance">Комплаенс</option>
                  <option value="role_training">Обучение роли</option>
                  <option value="safety">Безопасность</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Описание программы</label>
              <textarea
                rows={3}
                placeholder="Краткое описание целей курса..."
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Длительность (часов)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={manualHours}
                  onChange={(e) => setManualHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Проходной балл (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={manualScore}
                  onChange={(e) => setManualScore(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" type="button" onClick={() => setIsManualCreateModalOpen(false)}>Отмена</Button>
              <Button variant="primary" type="submit">Создать черновик трека</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* AI Generate Track Modal */}
      {isAiModalOpen && (
        <Modal
          isOpen={isAiModalOpen}
          onClose={() => !isGeneratingAi && setIsAiModalOpen(false)}
          title="AI-Генерация программы обучения"
          size="md"
        >
          <div className="space-y-4 text-xs py-2">
            <Input
              label="Целевая должность"
              value={aiRole}
              onChange={(e) => setAiRole(e.target.value)}
              placeholder="Например: Middle Backend Go Developer"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Подразделение</label>
                <select
                  value={aiDepartment}
                  onChange={(e) => setAiDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="Инженерия и разработка">Инженерия и разработка</option>
                  <option value="Продажи и клиентский сервис">Продажи и клиентский сервис</option>
                  <option value="People & HR">People & HR</option>
                  <option value="Финансы и комплаенс">Финансы и комплаенс</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ожидаемая длительность</label>
                <input
                  type="text"
                  value={aiDuration}
                  onChange={(e) => setAiDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Цели обучения и фокус</label>
              <textarea
                rows={3}
                value={aiGoals}
                onChange={(e) => setAiGoals(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {isGeneratingAi && (
              <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center space-x-3 text-indigo-900">
                <span className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                <span>AI анализирует корпоративные регламенты и формирует блоки программы...</span>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" disabled={isGeneratingAi} onClick={() => setIsAiModalOpen(false)}>
                Отмена
              </Button>
              <Button variant="primary" disabled={isGeneratingAi} onClick={handleGenerateAiTrack}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {isGeneratingAi ? 'Генерация...' : 'Сгенерировать проект трека'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
