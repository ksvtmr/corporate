import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  Clock,
  Play,
  ArrowRight,
  TrendingUp,
  Bell,
  CheckSquare,
  ShieldAlert,
  Search,
  Filter,
  Check,
  Calendar,
  UserCheck
} from 'lucide-react';
import { Card, Badge, Button, Modal } from '@iclever/frontend-kit';
import { useAuth } from '@iclever/frontend-kit';

interface TeamMemberProgress {
  name: string;
  email: string;
  role: string;
  track: string;
  progress: number;
  deadline: string;
  status: 'completed' | 'in_progress' | 'overdue';
}

const initialTeamProgress: TeamMemberProgress[] = [
  { name: 'Марат Жумабаев', email: 'employee@corp.iclever.ai', role: 'Go Developer', track: 'Онбординг Go Backend', progress: 75, deadline: '15 сен 2026', status: 'in_progress' },
  { name: 'Александр Петров', email: 'alex.p@fintech.kz', role: 'DevOps Engineer', track: 'Онбординг Go Backend', progress: 40, deadline: '18 сен 2026', status: 'in_progress' },
  { name: 'Нурлан Сейтов', email: 'nurlan.s@fintech.kz', role: 'Frontend Developer', track: 'Архитектурный стандарт', progress: 95, deadline: '10 сен 2026', status: 'completed' },
  { name: 'Дина Сабитова', email: 'dina.s@fintech.kz', role: 'QA Automation', track: 'Информационная безопасность', progress: 100, deadline: '05 сен 2026', status: 'completed' },
  { name: 'Алексей Смирнов', email: 'alexey.s@fintech.kz', role: 'Backend Intern', track: 'Входное тестирование', progress: 10, deadline: '01 сен 2026', status: 'overdue' },
];

export const DashboardPage: React.FC = () => {
  const { activeMember, user } = useAuth();
  const navigate = useNavigate();
  const role = activeMember?.role || 'org_admin';

  // Manager Team Dashboard State
  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState('all');
  const [teamSort, setTeamSort] = useState<'name_asc' | 'name_desc' | 'progress_desc' | 'progress_asc'>('progress_asc');
  const [selectedMember, setSelectedMember] = useState<TeamMemberProgress | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const handleSendReminders = () => {
    setReminderToast('Уведомления о дедлайнах успешно отправлены 5 инженерам команды!');
    setTimeout(() => setReminderToast(null), 4000);
  };

  // ==========================================
  // 1. EMPLOYEE DASHBOARD
  // ==========================================
  if (role === 'employee') {
    return (
      <div className="space-y-6">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Личный кабинет сотрудника • {activeMember?.department_name || 'Инженерия и разработка'}
            </span>
            <h1 className="text-2xl font-bold mt-1">
              Привет, {user?.first_name || 'Марат'}! Рады видеть вас 👋
            </h1>
            <p className="text-xs text-indigo-100 mt-1 max-w-xl">
              Ваш онбординг продолжается. До завершения трека «Онбординг Go разработчика» осталось пройти контрольное тестирование.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold border-0 shadow"
              onClick={() => navigate('/corporate/my/player')}
            >
              <Play className="w-4 h-4 mr-2 text-indigo-600 fill-indigo-600" />
              Плеер курса
            </Button>
            <Button
              variant="primary"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold border-0 shadow"
              onClick={() => navigate('/corporate/my/player?view=test')}
            >
              <Award className="w-4 h-4 mr-2" />
              Пройти тест
            </Button>
          </div>
        </div>

        {/* Employee Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Текущий прогресс</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">75%</div>
            <span className="text-[10px] text-slate-500">3 из 4 блоков завершено</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Активных заданий</span>
            <div className="text-2xl font-black text-slate-900 mt-1">2</div>
            <span className="text-[10px] text-amber-600 font-medium">Ближайший дедлайн: 15 сен</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Баллы опыта (XP)</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">450 XP</div>
            <span className="text-[10px] text-slate-500">Уровень: 2 (Junior)</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Пройдено аттестаций</span>
            <div className="text-2xl font-black text-slate-900 mt-1">1 / 2</div>
            <span className="text-[10px] text-green-600 font-medium">Средний балл: 92%</span>
          </div>
        </div>

        {/* Active courses & AI Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Мои назначенные программы</h3>
              <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => navigate('/corporate/my/player')}>
                Открыть плеер →
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Онбординг Go Backend разработчика 2026</h4>
                    <p className="text-xs text-slate-500">Куратор: Виктор Ким • Дедлайн: 15 сентября</p>
                  </div>
                  <Badge variant="warning">В процессе</Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Прогресс: 3 из 4 блоков</span>
                    <span className="font-semibold text-indigo-600">75%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: '75%' }} />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <Button size="sm" variant="outline" onClick={() => navigate('/corporate/my/player')}>
                    Изучить материалы
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => navigate('/corporate/my/player?view=test')}>
                    Контрольный тест →
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Обязательный аудит ИБ и 152-ФЗ / РК</h4>
                    <p className="text-xs text-slate-500">Дедлайн: 20 сентября</p>
                  </div>
                  <Badge variant="info">Не начато</Badge>
                </div>
                <div className="pt-1 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => navigate('/corporate/my/player')}>
                    Начать курс
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* AI recommendations */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>AI-Рекомендации</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-1">
                <span className="font-semibold text-indigo-900">Повторить карточки (Flashcards)</span>
                <p className="text-slate-600 text-[11px]">
                  У вас запланировано 3 карточки по теме «Transactional Outbox».
                </p>
                <div className="pt-1">
                  <Button size="sm" variant="outline" onClick={() => navigate('/corporate/flashcards')}>
                    Перейти к карточкам
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-1">
                <span className="font-semibold text-indigo-900">Спросить у AI-ассистента</span>
                <p className="text-slate-600 text-[11px]">
                  Непонятны стандарты чистой архитектуры? Задайте вопрос RAG-ассистенту.
                </p>
                <div className="pt-1">
                  <Button size="sm" variant="outline" onClick={() => navigate('/corporate/ai-chat')}>
                    Открыть AI-чат
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. MANAGER DASHBOARD (Scoped to Own Team)
  // ==========================================
  if (role === 'manager') {
    // Filter & Sort Team
    const filteredTeam = initialTeamProgress
      .filter((m) => {
        const matchQuery = m.name.toLowerCase().includes(teamSearch.toLowerCase()) || m.role.toLowerCase().includes(teamSearch.toLowerCase());
        const matchStatus = teamStatusFilter === 'all' || m.status === teamStatusFilter;
        return matchQuery && matchStatus;
      })
      .sort((a, b) => {
        if (teamSort === 'name_asc') return a.name.localeCompare(b.name, 'ru');
        if (teamSort === 'name_desc') return b.name.localeCompare(a.name, 'ru');
        if (teamSort === 'progress_desc') return b.progress - a.progress;
        if (teamSort === 'progress_asc') return a.progress - b.progress;
        return 0;
      });

    return (
      <div className="space-y-6">
        {reminderToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
              {reminderToast}
            </span>
            <button onClick={() => setReminderToast(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              Панель руководителя команды • Инженерия и разработка
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Командный дашборд</h1>
            <p className="text-xs text-slate-500">
              Успеваемость, дедлайны и прохождение курсов вашей инженерной команды (5 чел.)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/corporate/assignments')}>
              <CheckSquare className="w-4 h-4 mr-1.5" />
              Назначить трек
            </Button>
            <Button variant="primary" size="sm" onClick={handleSendReminders}>
              <Bell className="w-4 h-4 mr-1.5" />
              Напомнить о дедлайнах
            </Button>
          </div>
        </div>

        {/* Manager KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Инженеров в команде</span>
            <div className="text-2xl font-black text-slate-900 mt-1">5</div>
            <span className="text-[10px] text-slate-500">Отдел разработки Go</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Team Completion Rate</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">92.8%</div>
            <span className="text-[10px] text-green-600 font-medium">+5% к среднему</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Просрочено дедлайнов</span>
            <div className="text-2xl font-black text-red-600 mt-1">1</div>
            <span className="text-[10px] text-red-500 font-medium">Алексей Смирнов</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Средний балл тестов</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">89.4 / 100</div>
            <span className="text-[10px] text-slate-500">Отличный результат</span>
          </div>
        </div>

        {/* Team Members Progress Table with Filters & Sorting */}
        <Card title="Прогресс онбординга инженеров команды" subtitle="Нажмите на сотрудника для просмотра деталей или назначения">
          {/* Controls bar */}
          <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск инженера по имени или роли..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={teamStatusFilter}
                onChange={(e) => setTeamStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
              >
                <option value="all">Все статусы</option>
                <option value="in_progress">В процессе</option>
                <option value="overdue">Просрочено</option>
                <option value="completed">Сдано</option>
              </select>

              <select
                value={teamSort}
                onChange={(e) => setTeamSort(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium"
              >
                <option value="progress_asc">Сортировка: Сначала отстающие</option>
                <option value="progress_desc">Сортировка: Высокий прогресс</option>
                <option value="name_asc">Имя: А — Я</option>
                <option value="name_desc">Имя: Я — А</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {filteredTeam.map((m, i) => (
              <div
                key={i}
                onClick={() => setSelectedMember(m)}
                className="py-3 px-2 rounded-lg hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center space-x-2">
                    <span>{m.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({m.email})</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {m.role} • {m.track} • <span className="text-slate-400">Дедлайн: {m.deadline}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right w-28">
                    <div className="font-semibold text-slate-700">{m.progress}%</div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                      <div
                        className={`h-full ${m.status === 'overdue' ? 'bg-red-500' : m.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant={m.status === 'completed' ? 'success' : m.status === 'overdue' ? 'danger' : 'warning'}>
                    {m.status === 'completed' ? 'Сдано' : m.status === 'overdue' ? 'Просрочено' : 'В процессе'}
                  </Badge>
                  <span className="text-indigo-600 font-semibold text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                    Детали →
                  </span>
                </div>
              </div>
            ))}

            {filteredTeam.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Инженеры по заданным фильтрам не найдены
              </div>
            )}
          </div>
        </Card>

        {/* Member Details Modal */}
        {selectedMember && (
          <Modal
            isOpen={!!selectedMember}
            onClose={() => setSelectedMember(null)}
            title={`Профиль инженера: ${selectedMember.name}`}
            size="md"
          >
            <div className="space-y-4 text-xs text-slate-700 py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{selectedMember.name}</span>
                  <Badge variant={selectedMember.status === 'completed' ? 'success' : selectedMember.status === 'overdue' ? 'danger' : 'warning'}>
                    {selectedMember.status === 'completed' ? 'Сдано' : selectedMember.status === 'overdue' ? 'Просрочено' : 'В процессе'}
                  </Badge>
                </div>
                <p className="text-slate-500">{selectedMember.role} • {selectedMember.email}</p>
                <p className="text-[11px] text-indigo-700 font-medium">Отдел: Инженерия и разработка • Куратор: Виктор Ким</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Назначенный трек обучения</h4>
                <div className="p-3 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">{selectedMember.track}</span>
                    <span className="font-bold text-indigo-600">{selectedMember.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: `${selectedMember.progress}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500">Установленный дедлайн: {selectedMember.deadline}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setSelectedMember(null)}>
                  Закрыть
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedMember(null);
                    navigate('/corporate/assignments');
                  }}
                >
                  Управление назначениями →
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ==========================================
  // 3. HR / ORG ADMIN DASHBOARD (Default)
  // ==========================================
  const stats = [
    { title: 'Активных сотрудников', value: '142', change: '+12% за месяц', icon: Users, variant: 'brand' as const },
    { title: 'Курсов и треков', value: '18', change: '4 в разработке', icon: BookOpen, variant: 'neutral' as const },
    { title: 'Completion Rate', value: '88.4%', change: '+3.2% к цели', icon: CheckCircle2, variant: 'success' as const },
    { title: 'Просрочено дедлайнов', value: '7', change: 'Требует эскалации', icon: AlertCircle, variant: 'danger' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Корпоративный дашборд</h1>
          <p className="text-sm text-slate-500 mt-1">
            Обзор онбординга, прохождения треков и ключевых показателей компании {activeMember?.org_name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/corporate/reports')}>
            Экспорт отчета
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/corporate/tracks')}>
            <Sparkles className="w-4 h-4 mr-1.5" />
            AI-генерация трека
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{stat.title}</span>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-700">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="mt-1 flex items-center">
                  <Badge variant={stat.variant}>{stat.change}</Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Active Onboarding Highlights & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Критичные назначения" subtitle="Требуют внимания руководителей" className="lg:col-span-2">
          <div className="divide-y divide-slate-100">
            {[
              { name: 'Алексей Смирнов', track: 'Онбординг разработчика Go', dept: 'Инженерия', due: 'Сегодня, 18:00', status: 'danger' as const },
              { name: 'Динара Касымова', track: 'Информационная безопасность 2026', dept: 'Бухгалтерия', due: 'Завтра', status: 'warning' as const },
              { name: 'Елена Воронова', track: 'Продукт iClever: модуль B2B', dept: 'Продажи', due: 'через 3 дня', status: 'brand' as const },
            ].map((row, i) => (
              <div
                key={i}
                onClick={() => navigate('/corporate/assignments')}
                className="py-3 flex items-center justify-between text-sm hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.track} • {row.dept}</p>
                </div>
                <div className="text-right">
                  <Badge variant={row.status}>{row.due}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Статус модулей MVP" subtitle="Готовность архитектуры">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Tenant Isolation & RBAC</span>
              <Badge variant="success">Активно</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">PostgreSQL + pgvector</span>
              <Badge variant="success">Готово</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">MinIO S3 Storage</span>
              <Badge variant="success">Подключено</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">NATS JetStream Bus</span>
              <Badge variant="success">Очередь готова</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">API Gateway :8080</span>
              <Badge variant="success">Готово</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
