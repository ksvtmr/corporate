import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  History,
  Copy,
  ExternalLink,
  Clock,
  ArrowRight,
  Check
} from 'lucide-react';
import { Button, Card, Badge, Input, Modal, Table } from '@iclever/frontend-kit';

interface IntegrityEvent {
  id: string;
  student_name: string;
  test_title: string;
  event_type: 'tab_switch' | 'focus_loss' | 'copy_paste' | 'rapid_answering' | 'ai_text_detected';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  details: string;
  status: 'new' | 'dismissed' | 'escalated';
  resolution_note?: string;
}

const initialEvents: IntegrityEvent[] = [
  {
    id: 'evt-001',
    student_name: 'Марат Жумабаев',
    test_title: 'Входное тестирование по стандартам Go',
    event_type: 'tab_switch',
    severity: 'low',
    timestamp: '2026-09-02 14:22:10',
    details: 'Переключение вкладки браузера продолжительностью 4 секунды во время вопроса №7.',
    status: 'new',
  },
  {
    id: 'evt-002',
    student_name: 'Алексей Смирнов',
    test_title: 'Ежегодный аудит ИБ 2026',
    event_type: 'copy_paste',
    severity: 'medium',
    timestamp: '2026-09-02 11:05:40',
    details: 'Вставка текста из буфера обмена (140 символов) в поле развернутого ответа №3.',
    status: 'new',
  },
  {
    id: 'evt-003',
    student_name: 'Илья Морозов',
    test_title: 'Тест по микросервисам',
    event_type: 'rapid_answering',
    severity: 'high',
    timestamp: '2026-09-01 16:45:12',
    details: 'Ответ на сложный архитектурный кейс дан за 1.8 секунды.',
    status: 'escalated',
    resolution_note: 'Передано куратору направления для устного собеседования.',
  },
  {
    id: 'evt-004',
    student_name: 'Дина Сабитова',
    test_title: 'Комплаенс ИБ',
    event_type: 'focus_loss',
    severity: 'low',
    timestamp: '2026-08-30 09:12:05',
    details: 'Случайная потеря фокуса окна браузера на 1 секунду.',
    status: 'dismissed',
    resolution_note: 'Отклонено: признаков академической нечестности нет.',
  },
];

export const IntegrityPage: React.FC = () => {
  const [events, setEvents] = useState<IntegrityEvent[]>(initialEvents);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'time_desc' | 'severity_desc' | 'name_asc'>('time_desc');

  const [selectedEvent, setSelectedEvent] = useState<IntegrityEvent | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleResolve = (action: 'dismissed' | 'escalated') => {
    if (!selectedEvent) return;
    setEvents(
      events.map((e) =>
        e.id === selectedEvent.id
          ? {
              ...e,
              status: action,
              resolution_note: resolutionText || (action === 'dismissed' ? 'Флаг отклонен методистом' : 'Эскалировано на проверку руководителю'),
            }
          : e
      )
    );
    setSelectedEvent(null);
    setResolutionText('');
    setToastMessage(action === 'dismissed' ? 'Событие отклонено и помечено некритичным.' : 'Событие эскалировано куратору курса.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const typeLabels: Record<IntegrityEvent['event_type'], string> = {
    tab_switch: 'Смена вкладки',
    focus_loss: 'Потеря фокуса',
    copy_paste: 'Вставка из буфера',
    rapid_answering: 'Аномально быстрый ответ',
    ai_text_detected: 'Признаки генеративного текста',
  };

  // Filter & Sort
  const filtered = events
    .filter((e) => {
      const matchSearch = e.student_name.toLowerCase().includes(search.toLowerCase()) || e.test_title.toLowerCase().includes(search.toLowerCase()) || e.details.toLowerCase().includes(search.toLowerCase());
      const matchSeverity = severityFilter === 'all' || e.severity === severityFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchSeverity && matchStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'time_desc') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortOrder === 'severity_desc') {
        const order = { high: 3, medium: 2, low: 1 };
        return order[b.severity] - order[a.severity];
      }
      if (sortOrder === 'name_asc') return a.student_name.localeCompare(b.student_name, 'ru');
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
          <h1 className="text-xl font-bold text-slate-900">Мониторинг честности тестирования</h1>
          <p className="text-xs text-slate-500 mt-1">
            Нейтральная фиксация событий фокуса, вставки текста и времени ответов с аудиторским следом решений
          </p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-slate-900">{events.length}</div>
          <div className="text-[11px] text-slate-500">Зафиксированных событий</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-amber-600">
            {events.filter((e) => e.status === 'new').length}
          </div>
          <div className="text-[11px] text-slate-500">Ожидают рассмотрения</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-red-600">
            {events.filter((e) => e.status === 'escalated').length}
          </div>
          <div className="text-[11px] text-slate-500">Эскалировано кураторам</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-green-600">
            {events.filter((e) => e.status === 'dismissed').length}
          </div>
          <div className="text-[11px] text-slate-500">Отклонено методистом</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по студенту, тесту или деталям события..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="all">Любая важность</option>
            <option value="high">Высокая (High)</option>
            <option value="medium">Средняя (Medium)</option>
            <option value="low">Низкая (Low)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="all">Все статусы</option>
            <option value="new">Новые</option>
            <option value="escalated">Эскалированные</option>
            <option value="dismissed">Отклоненные</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="time_desc">Сначала недавние</option>
            <option value="severity_desc">По критичности</option>
            <option value="name_asc">По студенту (А — Я)</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <Table headers={['Сотрудник', 'Тестирование', 'Тип события', 'Детали', 'Важность', 'Статус', 'Действие']}>
          {filtered.map((evt) => (
            <tr key={evt.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
              <td className="p-3 font-semibold text-slate-900">{evt.student_name}</td>
              <td className="p-3 text-slate-600">{evt.test_title}</td>
              <td className="p-3">
                <span className="font-medium text-slate-800">{typeLabels[evt.event_type]}</span>
              </td>
              <td className="p-3 max-w-xs truncate text-slate-500">{evt.details}</td>
              <td className="p-3">
                <Badge variant={evt.severity === 'high' ? 'danger' : evt.severity === 'medium' ? 'warning' : 'info'}>
                  {evt.severity}
                </Badge>
              </td>
              <td className="p-3">
                <Badge variant={evt.status === 'new' ? 'warning' : evt.status === 'escalated' ? 'danger' : 'success'}>
                  {evt.status === 'new' ? 'Новое' : evt.status === 'escalated' ? 'Эскалировано' : 'Отклонено'}
                </Badge>
              </td>
              <td className="p-3 text-right">
                <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(evt)}>
                  Разбор
                </Button>
              </td>
            </tr>
          ))}
        </Table>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-xs">
            События мониторинга по заданным фильтрам не найдены
          </div>
        )}
      </div>

      {/* Event Resolution Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Разбор события честности"
          size="md"
        >
          <div className="space-y-4 text-xs py-2 text-slate-700">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">{selectedEvent.student_name}</span>
                <span className="text-slate-400">{selectedEvent.timestamp}</span>
              </div>
              <div className="text-slate-600">Тест: <strong>{selectedEvent.test_title}</strong></div>
              <div className="text-indigo-600 font-medium">Тип: {typeLabels[selectedEvent.event_type]}</div>
              <p className="text-slate-800 pt-1 border-t border-slate-200">{selectedEvent.details}</p>
            </div>

            {selectedEvent.resolution_note && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
                <span className="font-semibold block mb-1">Запись в аудит-логе:</span>
                <p className="text-xs">{selectedEvent.resolution_note}</p>
              </div>
            )}

            {selectedEvent.status === 'new' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Обоснование решения (для аудит-лога)
                </label>
                <textarea
                  rows={2}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Укажите комментарий к решению..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Закрыть</Button>
              {selectedEvent.status === 'new' && (
                <>
                  <Button variant="outline" onClick={() => handleResolve('dismissed')}>
                    Отклонить флаг
                  </Button>
                  <Button variant="danger" onClick={() => handleResolve('escalated')}>
                    Эскалировать куратору
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
