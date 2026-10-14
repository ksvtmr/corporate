import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  UserPlus,
  Calendar,
  Building,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Sparkles,
  Check
} from 'lucide-react';
import { Button, Card, Badge, Input, Modal } from '@iclever/frontend-kit';

interface Cohort {
  id: string;
  name: string;
  description: string;
  department_name: string;
  members_count: number;
  active_track_name?: string;
  created_at: string;
  members: Array<{ id: string; name: string; email: string; role: string; progress_percent: number }>;
}

const initialCohorts: Cohort[] = [
  {
    id: 'coh-01',
    name: 'Онбординг разработчиков Q3 2026',
    description: 'Новые инженеры, присоединившиеся в июле-августе 2026 года',
    department_name: 'Инженерия и разработка',
    members_count: 5,
    active_track_name: 'Онбординг Go Backend разработчика 2026',
    created_at: '2026-07-01',
    members: [
      { id: 'm-1', name: 'Марат Жумабаев', email: 'employee@corp.iclever.ai', role: 'Go Developer', progress_percent: 75 },
      { id: 'm-2', name: 'Александр Петров', email: 'alex.p@fintech.kz', role: 'DevOps Engineer', progress_percent: 40 },
      { id: 'm-3', name: 'Нурлан Сейтов', email: 'nurlan.s@fintech.kz', role: 'Frontend Developer', progress_percent: 90 },
      { id: 'm-4', name: 'Дина Сабитова', email: 'dina.s@fintech.kz', role: 'QA Automation', progress_percent: 60 },
      { id: 'm-5', name: 'Алексей Смирнов', email: 'alexey.s@fintech.kz', role: 'Backend Intern', progress_percent: 20 },
    ],
  },
  {
    id: 'coh-02',
    name: 'Стажеры Sales & Marketing Осень 2026',
    description: 'Когорта начинающих специалистов клиентского сервиса',
    department_name: 'Продажи и клиентский сервис',
    members_count: 2,
    active_track_name: 'B2B Продажи и клиентский сервис',
    created_at: '2026-08-15',
    members: [
      { id: 'm-6', name: 'Айгерим Касымова', email: 'aigerim.k@fintech.kz', role: 'Sales Rep', progress_percent: 100 },
      { id: 'm-7', name: 'Руслан Ахметов', email: 'ruslan.a@fintech.kz', role: 'Account Exec', progress_percent: 85 },
    ],
  },
];

export const CohortsPage: React.FC = () => {
  const [cohorts, setCohorts] = useState<Cohort[]>(initialCohorts);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'members_desc' | 'created_desc' | 'name_asc'>('members_desc');

  // New Cohort Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dept, setDept] = useState('Инженерия и разработка');
  const [trackName, setTrackName] = useState('Онбординг Go Backend разработчика 2026');

  // Add member to cohort modal
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Developer');

  // Change track state
  const [isChangeTrackModalOpen, setIsChangeTrackModalOpen] = useState(false);
  const [selectedNewTrack, setSelectedNewTrack] = useState('');

  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newCohort: Cohort = {
      id: 'coh-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      description: description.trim() || 'Новая учебная когорта компании',
      department_name: dept,
      members_count: 1,
      active_track_name: trackName,
      created_at: new Date().toISOString().split('T')[0],
      members: [
        { id: 'm-new-' + Date.now(), name: 'Новый специалист', email: 'new.specialist@company.kz', role: 'Сотрудник', progress_percent: 0 },
      ],
    };
    setCohorts([newCohort, ...cohorts]);
    setIsCreateModalOpen(false);
    setName('');
    setDescription('');
    setToast(`Когорта «${newCohort.name}» успешно сформирована!`);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddMemberToCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort || !newMemberName.trim()) return;

    const newM = {
      id: 'm-' + Date.now(),
      name: newMemberName.trim(),
      email: newMemberEmail.trim() || `${newMemberName.toLowerCase().replace(/\s+/g, '.')}@corp.iclever.ai`,
      role: newMemberRole,
      progress_percent: 0,
    };

    const updated = {
      ...selectedCohort,
      members_count: selectedCohort.members_count + 1,
      members: [...selectedCohort.members, newM],
    };

    setCohorts(cohorts.map((c) => (c.id === selectedCohort.id ? updated : c)));
    setSelectedCohort(updated);
    setIsAddMemberModalOpen(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setToast(`${newM.name} добавлен(а) в когорту!`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedCohort) return;
    const updated = {
      ...selectedCohort,
      members_count: Math.max(0, selectedCohort.members_count - 1),
      members: selectedCohort.members.filter((m) => m.id !== memberId),
    };
    setCohorts(cohorts.map((c) => (c.id === selectedCohort.id ? updated : c)));
    setSelectedCohort(updated);
    setToast('Сотрудник исключен из состава когорты.');
    setTimeout(() => setToast(null), 3000);
  };

  const handleChangeTrack = () => {
    if (!selectedCohort || !selectedNewTrack) return;
    const updated = {
      ...selectedCohort,
      active_track_name: selectedNewTrack,
    };
    setCohorts(cohorts.map((c) => (c.id === selectedCohort.id ? updated : c)));
    setSelectedCohort(updated);
    setIsChangeTrackModalOpen(false);
    setToast(`Для когорты назначен трек «${selectedNewTrack}»!`);
    setTimeout(() => setToast(null), 3000);
  };

  // Filter & Sort
  const filteredCohorts = cohorts
    .filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === 'all' || c.department_name === deptFilter;
      return matchSearch && matchDept;
    })
    .sort((a, b) => {
      if (sortOrder === 'name_asc') return a.name.localeCompare(b.name, 'ru');
      if (sortOrder === 'created_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return b.members_count - a.members_count;
    });

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <span className="flex items-center">
            <Check className="w-4 h-4 mr-2 text-emerald-600" />
            {toast}
          </span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Учебные когорты</h1>
          <p className="text-xs text-slate-500 mt-1">
            Групповое распределение сотрудников по потокам обучения, датам найма и департаментам
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Создать когорту
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию когорты или описанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="all">Все департаменты</option>
            <option value="Инженерия и разработка">Инженерия и разработка</option>
            <option value="Продажи и клиентский сервис">Продажи и клиентский сервис</option>
            <option value="People & HR">People & HR</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="members_desc">По числу участников</option>
            <option value="created_desc">Сначала новые</option>
            <option value="name_asc">По названию (А — Я)</option>
          </select>
        </div>
      </div>

      {/* Cohorts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCohorts.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedCohort(c)}
            className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              selectedCohort?.id === c.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                  {c.department_name}
                </span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-1.5">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{c.description}</p>
              </div>
              <Badge variant="info">{c.members_count} чел.</Badge>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Активный трек: <strong className="text-slate-800">{c.active_track_name || 'Не назначен'}</strong>
              </div>
              <div className="text-indigo-600 font-medium flex items-center">
                Участники <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>
        ))}

        {filteredCohorts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            Когорты по заданным фильтрам не найдены
          </div>
        )}
      </div>

      {/* Cohort Detail Modal */}
      {selectedCohort && (
        <Modal
          isOpen={!!selectedCohort}
          onClose={() => setSelectedCohort(null)}
          title={`Состав когорты: ${selectedCohort.name}`}
          size="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Назначенная программа обучения</span>
                <div className="font-semibold text-slate-900 mt-0.5">{selectedCohort.active_track_name}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedNewTrack(selectedCohort.active_track_name || '');
                  setIsChangeTrackModalOpen(true);
                }}
              >
                Сменить трек
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">Участники потока ({selectedCohort.members.length})</h4>
                <Button variant="outline" size="sm" onClick={() => setIsAddMemberModalOpen(true)}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Добавить участника
                </Button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                {selectedCohort.members.map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-medium text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-400">{m.email} • {m.role}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-indigo-600">{m.progress_percent}%</div>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div className="bg-indigo-600 h-full" style={{ width: `${m.progress_percent}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition"
                        title="Исключить из когорты"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setSelectedCohort(null)}>Закрыть</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Add Member to Cohort */}
      {isAddMemberModalOpen && (
        <Modal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          title="Добавить сотрудника в когорту"
          size="sm"
        >
          <form onSubmit={handleAddMemberToCohort} className="space-y-4 text-xs py-2">
            <Input
              label="ФИО сотрудника"
              placeholder="Например: Алина Садыкова"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
            />
            <Input
              label="Рабочий email"
              type="email"
              placeholder="alina.s@fintech.kz"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
            <Input
              label="Должность / Роль"
              placeholder="Например: HR Lead"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
            />
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setIsAddMemberModalOpen(false)}>Отмена</Button>
              <Button variant="primary" type="submit">Добавить в состав</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Change Track */}
      {isChangeTrackModalOpen && (
        <Modal
          isOpen={isChangeTrackModalOpen}
          onClose={() => setIsChangeTrackModalOpen(false)}
          title="Смена учебного трека когорты"
          size="sm"
        >
          <div className="space-y-4 text-xs py-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Выберите учебный трек</label>
              <select
                value={selectedNewTrack}
                onChange={(e) => setSelectedNewTrack(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
              >
                <option value="Онбординг Go Backend разработчика 2026">Онбординг Go Backend разработчика 2026</option>
                <option value="Обязательный ежегодный аудит ИБ и 152-ФЗ / РК">Обязательный ежегодный аудит ИБ и 152-ФЗ / РК</option>
                <option value="Архитектурный стандарт микросервисов Go">Архитектурный стандарт микросервисов Go</option>
                <option value="B2B Продажи и клиентский сервис">B2B Продажи и клиентский сервис</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="secondary" onClick={() => setIsChangeTrackModalOpen(false)}>Отмена</Button>
              <Button variant="primary" onClick={handleChangeTrack}>Сохранить</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Create Cohort */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Создание новой когорты"
          size="md"
        >
          <form onSubmit={handleCreateCohort} className="space-y-4 text-xs py-2">
            <Input
              label="Название когорты"
              placeholder="Например: Онбординг инженеров Октябрь 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Описание"
              placeholder="Краткое описание фокуса или аудитории когорты"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Департамент</label>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="Инженерия и разработка">Инженерия и разработка</option>
                  <option value="Продажи и клиентский сервис">Продажи и клиентский сервис</option>
                  <option value="People & HR">People & HR</option>
                  <option value="Финансы и комплаенс">Финансы и комплаенс</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Учебная программа</label>
                <select
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="Онбординг Go Backend разработчика 2026">Онбординг Go Backend 2026</option>
                  <option value="Обязательный ежегодный аудит ИБ">Обязательный аудит ИБ</option>
                  <option value="B2B Продажи и клиентский сервис">B2B Продажи</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>Отмена</Button>
              <Button variant="primary" type="submit" disabled={!name}>
                Создать когорту
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
