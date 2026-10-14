import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  User,
  Users,
  Compass,
  ArrowRight,
  Send,
  Trash2,
  ShieldAlert,
  Bell,
  CalendarPlus,
  Check
} from 'lucide-react';
import { Button, Card, Badge, Input, Modal, Table } from '@iclever/frontend-kit';

interface AssignmentItem {
  id: string;
  assignee_name: string;
  assignee_type: 'individual' | 'cohort';
  target_name: string;
  target_type: 'track' | 'test';
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  due_date: string;
  assigned_by: string;
  progress_percent: number;
  is_mandatory: boolean;
}

const initialAssignments: AssignmentItem[] = [
  {
    id: 'asg-001',
    assignee_name: 'Марат Жумабаев',
    assignee_type: 'individual',
    target_name: 'Онбординг Go Backend разработчика 2026',
    target_type: 'track',
    status: 'in_progress',
    due_date: '2026-09-15',
    assigned_by: 'Виктор Ким',
    progress_percent: 75,
    is_mandatory: true,
  },
  {
    id: 'asg-002',
    assignee_name: 'Онбординг разработчиков Q3 2026',
    assignee_type: 'cohort',
    target_name: 'Обязательный ежегодный аудит ИБ и 152-ФЗ / РК',
    target_type: 'track',
    status: 'assigned',
    due_date: '2026-09-20',
    assigned_by: 'Алина Садыкова',
    progress_percent: 15,
    is_mandatory: true,
  },
  {
    id: 'asg-003',
    assignee_name: 'Алексей Смирнов',
    assignee_type: 'individual',
    target_name: 'Входное тестирование по стандартам Go',
    target_type: 'test',
    status: 'overdue',
    due_date: '2026-09-01',
    assigned_by: 'Виктор Ким',
    progress_percent: 0,
    is_mandatory: true,
  },
  {
    id: 'asg-004',
    assignee_name: 'Динара Касымова',
    assignee_type: 'individual',
    target_name: 'Информационная безопасность 2026',
    target_type: 'test',
    status: 'completed',
    due_date: '2026-08-30',
    assigned_by: 'Алина Садыкова',
    progress_percent: 100,
    is_mandatory: true,
  },
  {
    id: 'asg-005',
    assignee_name: 'Александр Петров',
    assignee_type: 'individual',
    target_name: 'Онбординг Go Backend разработчика 2026',
    target_type: 'track',
    status: 'in_progress',
    due_date: '2026-09-18',
    assigned_by: 'Виктор Ким',
    progress_percent: 40,
    is_mandatory: true,
  },
  {
    id: 'asg-006',
    assignee_name: 'Нурлан Сейтов',
    assignee_type: 'individual',
    target_name: 'Архитектурный стандарт микросервисов Go',
    target_type: 'track',
    status: 'completed',
    due_date: '2026-09-10',
    assigned_by: 'Виктор Ким',
    progress_percent: 95,
    is_mandatory: true,
  },
];

export const AssignmentsPage: React.FC = () => {
  const location = useLocation();
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'due_asc' | 'progress_asc' | 'progress_desc' | 'name_asc'>('due_asc');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cancelModalAssignment, setCancelModalAssignment] = useState<AssignmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeType, setAssigneeType] = useState<'individual' | 'cohort'>('individual');
  const [targetTrack, setTargetTrack] = useState('Онбординг Go Backend разработчика 2026');
  const [dueDate, setDueDate] = useState('2026-09-30');
  const [isMandatory, setIsMandatory] = useState(true);

  // Read URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillAssignee = params.get('assignee');
    const prefillTrack = params.get('track');
    if (prefillAssignee) {
      setAssigneeName(decodeURIComponent(prefillAssignee));
      setIsCreateModalOpen(true);
    }
    if (prefillTrack) {
      setTargetTrack(decodeURIComponent(prefillTrack));
      setIsCreateModalOpen(true);
    }
  }, [location.search]);

  const handleCreateAssignment = () => {
    if (!assigneeName.trim()) return;
    const newAsg: AssignmentItem = {
      id: 'asg-' + Math.random().toString(36).substring(2, 7),
      assignee_name: assigneeName.trim(),
      assignee_type: assigneeType,
      target_name: targetTrack,
      target_type: targetTrack.toLowerCase().includes('тест') ? 'test' : 'track',
      status: 'assigned',
      due_date: dueDate,
      assigned_by: 'Текущий руководитель',
      progress_percent: 0,
      is_mandatory: isMandatory,
    };
    setAssignments([newAsg, ...assignments]);
    setIsCreateModalOpen(false);
    setAssigneeName('');
    setToastMessage(`Программа «${targetTrack}» успешно назначена ${assigneeName}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendReminder = (a: AssignmentItem) => {
    setToastMessage(`Напоминание о дедлайне (${a.due_date}) отправлено сотруднику ${a.assignee_name}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExtendDueDate = (id: string) => {
    setAssignments(
      assignments.map((a) => {
        if (a.id === id) {
          const current = new Date(a.due_date);
          current.setDate(current.getDate() + 7);
          const newDate = current.toISOString().split('T')[0];
          return { ...a, due_date: newDate, status: a.status === 'overdue' ? 'in_progress' : a.status };
        }
        return a;
      })
    );
    setToastMessage('Дедлайн успешно продлен на 7 календарных дней!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCancelAssignment = () => {
    if (!cancelModalAssignment) return;
    setAssignments(
      assignments.map((a) => (a.id === cancelModalAssignment.id ? { ...a, status: 'cancelled' } : a))
    );
    setCancelModalAssignment(null);
    setCancelReason('');
    setToastMessage('Назначение отменено.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const statusBadges: Record<AssignmentItem['status'], { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }> = {
    assigned: { label: 'Назначен', variant: 'info' },
    in_progress: { label: 'В процессе', variant: 'warning' },
    completed: { label: 'Завершен', variant: 'success' },
    overdue: { label: 'Просрочен', variant: 'danger' },
    cancelled: { label: 'Отменен', variant: 'info' },
  };

  // Filtered & Sorted
  const filtered = assignments
    .filter((a) => {
      const matchSearch = a.assignee_name.toLowerCase().includes(search.toLowerCase()) || a.target_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchType = typeFilter === 'all' || a.assignee_type === typeFilter;
      return matchSearch && matchStatus && matchType;
    })
    .sort((a, b) => {
      if (sortOrder === 'due_asc') return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (sortOrder === 'progress_asc') return a.progress_percent - b.progress_percent;
      if (sortOrder === 'progress_desc') return b.progress_percent - a.progress_percent;
      if (sortOrder === 'name_asc') return a.assignee_name.localeCompare(b.assignee_name, 'ru');
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
          <h1 className="text-xl font-bold text-slate-900">Управление назначениями и дедлайнами</h1>
          <p className="text-xs text-slate-500 mt-1">
            Индивидуальные и когортные назначения курсов, контроль дедлайнов и эскалаций
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Новое назначение
        </Button>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-slate-900">{assignments.length}</div>
          <div className="text-[11px] text-slate-500">Всего назначений</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-amber-600">
            {assignments.filter((a) => a.status === 'in_progress').length}
          </div>
          <div className="text-[11px] text-slate-500">В процессе обучения</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-red-600">
            {assignments.filter((a) => a.status === 'overdue').length}
          </div>
          <div className="text-[11px] text-slate-500">Просроченных дедлайнов</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <div className="text-lg font-bold text-green-600">
            {assignments.filter((a) => a.status === 'completed').length}
          </div>
          <div className="text-[11px] text-slate-500">Успешно пройдено</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по сотруднику или названию трека..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="all">Все типы</option>
            <option value="individual">Индивидуальные</option>
            <option value="cohort">Когорты</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="all">Все статусы</option>
            <option value="in_progress">В процессе</option>
            <option value="assigned">Назначен</option>
            <option value="overdue">Просрочен</option>
            <option value="completed">Завершен</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="due_asc">Дедлайн: сначала срочные</option>
            <option value="progress_asc">Прогресс: сначала отстающие</option>
            <option value="progress_desc">Прогресс: высокий</option>
            <option value="name_asc">Сотрудник: А — Я</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <Table
          headers={['Назначено кому', 'Курс / Трек', 'Дедлайн', 'Прогресс', 'Статус', 'Действия']}
        >
          {filtered.map((a) => {
            const badge = statusBadges[a.status];
            return (
              <tr key={a.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                      {a.assignee_type === 'individual' ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{a.assignee_name}</div>
                      <div className="text-[10px] text-slate-400">Назначил: {a.assigned_by}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-medium text-slate-800">{a.target_name}</div>
                  {a.is_mandatory && (
                    <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Обязательный
                    </span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className={`font-medium ${a.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                    {a.due_date}
                  </div>
                </td>
                <td className="p-3 w-36">
                  <div className="flex items-center space-x-2">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${a.progress_percent}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600">{a.progress_percent}%</span>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    {a.status !== 'completed' && a.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => handleSendReminder(a)}
                          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                          title="Отправить напоминание"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExtendDueDate(a.id)}
                          className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Продлить дедлайн на 7 дней"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {a.status !== 'cancelled' && a.status !== 'completed' && (
                      <button
                        onClick={() => setCancelModalAssignment(a)}
                        className="text-slate-400 hover:text-red-600 text-xs p-1"
                        title="Отменить назначение"
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-xs">
            Назначения по заданным критериям не найдены
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Создать назначение обучения"
          size="md"
        >
          <div className="space-y-4 text-xs py-2">
            <div className="flex items-center space-x-4 mb-1">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="asgType"
                  checked={assigneeType === 'individual'}
                  onChange={() => setAssigneeType('individual')}
                />
                <span className="text-slate-700 font-medium">Конкретный сотрудник</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="asgType"
                  checked={assigneeType === 'cohort'}
                  onChange={() => setAssigneeType('cohort')}
                />
                <span className="text-slate-700 font-medium">Когорта / Отдел</span>
              </label>
            </div>

            <Input
              label={assigneeType === 'individual' ? 'ФИО сотрудника' : 'Название когорты'}
              placeholder={assigneeType === 'individual' ? 'Например: Марат Жумабаев' : 'Например: Онбординг инженеров Q3'}
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Программа / Трек обучения</label>
              <select
                value={targetTrack}
                onChange={(e) => setTargetTrack(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
              >
                <option value="Онбординг Go Backend разработчика 2026">Онбординг Go Backend разработчика 2026</option>
                <option value="Обязательный ежегодный аудит ИБ и 152-ФЗ / РК">Обязательный ежегодный аудит ИБ и 152-ФЗ / РК</option>
                <option value="Архитектурный стандарт микросервисов Go">Архитектурный стандарт микросервисов Go</option>
                <option value="B2B Продажи: Методология переговоров">B2B Продажи: Методология переговоров</option>
                <option value="Входное тестирование по стандартам Go">Входное тестирование по стандартам Go</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Крайний срок (Дедлайн)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="isMandatory"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <label htmlFor="isMandatory" className="text-xs text-slate-700 font-medium cursor-pointer">
                Обязательный трек с отправкой напоминаний за 3 дня до дедлайна
              </label>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Отмена</Button>
              <Button variant="primary" onClick={handleCreateAssignment}>Назначить</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Assignment Modal */}
      {cancelModalAssignment && (
        <Modal
          isOpen={!!cancelModalAssignment}
          onClose={() => setCancelModalAssignment(null)}
          title="Отмена назначения"
          size="sm"
        >
          <div className="space-y-4 text-xs py-2 text-slate-700">
            <p>
              Вы уверены, что хотите отозвать назначение курса «{cancelModalAssignment.target_name}» для {cancelModalAssignment.assignee_name}?
            </p>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Причина отмены</label>
              <textarea
                rows={2}
                placeholder="Например: смена должностных обязанностей..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="secondary" onClick={() => setCancelModalAssignment(null)}>Назад</Button>
              <Button variant="danger" onClick={handleCancelAssignment}>Подтвердить отмену</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
