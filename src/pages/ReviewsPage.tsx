import React, { useState } from 'react';
import {
  CheckCircle,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Flag,
  Layers,
  MessageSquare,
  User,
  Check,
  X,
  ChevronRight,
  Filter,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { Button, Card, Badge, Input, Modal } from '@iclever/frontend-kit';

interface OpenAnswerReview {
  id: string;
  student_name: string;
  question_text: string;
  student_answer: string;
  ai_score: number;
  max_score: number;
  ai_confidence: number;
  ai_justification: string;
  matched_criteria: string[];
  missed_criteria: string[];
  cluster_tag?: string;
  status: 'pending' | 'approved' | 'overridden';
}

const initialReviews: OpenAnswerReview[] = [
  {
    id: 'rev-001',
    student_name: 'Марат Жумабаев',
    question_text: 'Опишите алгоритм действий дежурного инженера при обнаружении несанкционированного изменения ролей в базе данных.',
    student_answer: 'Сразу блокирую подозрительную сессию через revoke токена, проверяю audit_logs для выявления ip и аккаунта инициатора, пишу в канал безопасности инцидент и оповещаю CISO.',
    ai_score: 18,
    max_score: 20,
    ai_confidence: 94,
    ai_justification: 'Ответ полностью покрывает первоочередные меры локализации инцидента и эскалацию. Не упомянуто создание снапшота логов для форензики, сняты 2 балла.',
    matched_criteria: ['Блокировка сессии/токена', 'Аудит таблицы audit_logs', 'Эскалация CISO'],
    missed_criteria: ['Снятие дампа состояния памяти / сессий для форензики'],
    cluster_tag: 'Инциденты ИБ: эскалация и изоляция',
    status: 'pending',
  },
  {
    id: 'rev-002',
    student_name: 'Александр Петров',
    question_text: 'Опишите алгоритм действий дежурного инженера при обнаружении несанкционированного изменения ролей в базе данных.',
    student_answer: 'Перезагружаю контейнер сервиса и пишу в общий чат разработчиков о странной активности.',
    ai_score: 5,
    max_score: 20,
    ai_confidence: 96,
    ai_justification: 'Грубая ошибка: перезагрузка контейнера уничтожает оперативные логи сессии и не отзывает скомпрометированный токен. Нет уведомления ИБ.',
    matched_criteria: ['Попытка реакции на инцидент'],
    missed_criteria: ['Блокировка скомпрометированной сессии', 'Аудит логов', 'Эскалация CISO'],
    cluster_tag: 'Ошибочная перезагрузка вместо изоляции',
    status: 'pending',
  },
  {
    id: 'rev-003',
    student_name: 'Нурлан Сейтов',
    question_text: 'Как предотвратить дублирование сообщений при повторной доставке из очереди NATS?',
    student_answer: 'Реализовать идемпотентный консьюмер с проверкой id сообщения в кэше Redis или в таблице обработанных событий в транзакции.',
    ai_score: 20,
    max_score: 20,
    ai_confidence: 98,
    ai_justification: 'Идеальный ответ с указанием обоих рекомендованных вариантов (in-memory дедупликация и БД транзакционная фиксация).',
    matched_criteria: ['Идемпотентный консьюмер', 'Транзакционная дедупликация'],
    missed_criteria: [],
    cluster_tag: 'Идемпотентность распределенных очередей',
    status: 'approved',
  },
];

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<OpenAnswerReview[]>(initialReviews);
  const [isClustered, setIsClustered] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'confidence_desc' | 'score_asc' | 'score_desc'>('confidence_desc');

  const [selectedReview, setSelectedReview] = useState<OpenAnswerReview | null>(null);
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [overrideComment, setOverrideComment] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
    if (selectedReview?.id === id) setSelectedReview(null);
    setToastMessage('Оценка AI успешно подтверждена!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApproveAllPending = () => {
    setReviews(reviews.map((r) => (r.status === 'pending' ? { ...r, status: 'approved' } : r)));
    setToastMessage('Все ожидающие решения ответы подтверждены в 1 клик!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOverride = () => {
    if (!selectedReview) return;
    setReviews(
      reviews.map((r) =>
        r.id === selectedReview.id
          ? {
              ...r,
              status: 'overridden',
              ai_score: overrideScore,
              ai_justification: `[Ручной пересмотр методистом]: ${overrideComment}`,
            }
          : r
      )
    );
    setSelectedReview(null);
    setToastMessage(`Балл переопределен на ${overrideScore} / ${selectedReview.max_score}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter & Sort
  const filtered = reviews
    .filter((r) => {
      const matchSearch = r.student_name.toLowerCase().includes(search.toLowerCase()) || r.question_text.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'confidence_desc') return b.ai_confidence - a.ai_confidence;
      if (sortOrder === 'score_asc') return a.ai_score - b.ai_score;
      if (sortOrder === 'score_desc') return b.ai_score - a.ai_score;
      return 0;
    });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <span className="flex items-center">
            <Check className="w-4 h-4 mr-2 text-emerald-600" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Проверка открытых ответов с AI</h1>
          <p className="text-xs text-slate-500 mt-1">
            Очередь развернутых ответов сотрудников с семантической оценкой, анализом критериев и кластеризацией ошибок
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApproveAllPending}
          >
            <Check className="w-4 h-4 mr-1 text-emerald-600" />
            Подтвердить все AI
          </Button>
          <Button
            variant={isClustered ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsClustered(!isClustered)}
          >
            <Layers className="w-4 h-4 mr-1.5" />
            {isClustered ? 'Обычный список' : 'Кластеризовать по ошибкам'}
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по студенту или формулировке вопроса..."
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
            <option value="pending">Ожидает решения</option>
            <option value="approved">Подтверждено</option>
            <option value="overridden">Переопределено</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="confidence_desc">По уверенности AI (по убыванию)</option>
            <option value="score_asc">Сначала низкий балл (ошибки)</option>
            <option value="score_desc">Сначала высокий балл</option>
          </select>
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="space-y-4">
        {filtered.map((rev) => (
          <div
            key={rev.id}
            className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-semibold text-slate-900">{rev.student_name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-medium">
                    {rev.cluster_tag}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mt-1">{rev.question_text}</h3>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-indigo-600">
                  {rev.ai_score} / {rev.max_score} б.
                </div>
                <div className="text-[10px] text-slate-400">AI Уверенность: {rev.ai_confidence}%</div>
              </div>
            </div>

            {/* Student Answer */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800">
              <span className="font-semibold text-slate-500 block mb-1">Ответ сотрудника:</span>
              <p className="italic">{rev.student_answer}</p>
            </div>

            {/* AI Justification & Criteria */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center text-indigo-900 font-semibold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Обоснование оценки AI:
              </div>
              <p className="text-slate-700">{rev.ai_justification}</p>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                {rev.matched_criteria.map((c, i) => (
                  <span key={i} className="inline-flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    <Check className="w-3 h-3 mr-1" /> {c}
                  </span>
                ))}
                {rev.missed_criteria.map((c, i) => (
                  <span key={i} className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    <X className="w-3 h-3 mr-1" /> {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <Badge variant={rev.status === 'approved' ? 'success' : rev.status === 'overridden' ? 'warning' : 'info'}>
                {rev.status === 'approved' ? 'Подтверждено' : rev.status === 'overridden' ? 'Переопределено' : 'Ожидает решения'}
              </Badge>

              {rev.status === 'pending' && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedReview(rev);
                      setOverrideScore(rev.ai_score);
                    }}
                  >
                    Изменить балл
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleApprove(rev.id)}>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Одобрить оценку AI
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            Ответы по заданным критериям не найдены
          </div>
        )}
      </div>

      {/* Override Modal */}
      {selectedReview && (
        <Modal
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
          title="Ручной пересмотр оценки ответа"
          size="md"
        >
          <div className="space-y-4 text-xs py-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-900 block">{selectedReview.student_name}</span>
              <p className="italic text-slate-600">«{selectedReview.student_answer}»</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Балл методиста (из {selectedReview.max_score})
              </label>
              <input
                type="number"
                min="0"
                max={selectedReview.max_score}
                value={overrideScore}
                onChange={(e) => setOverrideScore(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Комментарий / Обоснование</label>
              <textarea
                rows={3}
                placeholder="Укажите аргументы изменения оценки..."
                value={overrideComment}
                onChange={(e) => setOverrideComment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setSelectedReview(null)}>Отмена</Button>
              <Button variant="primary" onClick={handleOverride}>Сохранить пересмотр</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
