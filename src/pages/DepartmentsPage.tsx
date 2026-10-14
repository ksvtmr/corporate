import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Briefcase, Users, Archive, Search, Filter, ArrowRight, Check } from 'lucide-react';
import { Card, Button, Input, Modal, Badge, api } from '@iclever/frontend-kit';

interface Department {
  id: string;
  parent_id?: string;
  name: string;
  code?: string;
  description?: string;
  manager_id?: string;
  manager_name?: string;
  member_count: number;
}

interface Position {
  id: string;
  title: string;
  code?: string;
  level?: string;
  description?: string;
}

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'departments' | 'positions'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Sorting
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'members_desc' | 'name_asc'>('members_desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);

  // Department form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptParent, setDeptParent] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Position form
  const [posTitle, setPosTitle] = useState('');
  const [posCode, setPosCode] = useState('');
  const [posLevel, setPosLevel] = useState('Junior');
  const [posDesc, setPosDesc] = useState('');

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.get<Department[]>('/corporate/departments'),
      api.get<Position[]>('/corporate/positions'),
    ])
      .then(([deptRes, posRes]) => {
        if (deptRes.success && deptRes.data) {
          setDepartments(deptRes.data);
        } else {
          // Demo fallback
          setDepartments([
            { id: 'dept-eng-01', name: 'Инженерия и разработка', code: 'ENG', manager_name: 'Виктор Ким', member_count: 5 },
            { id: 'dept-sales-02', name: 'Продажи и клиентский сервис', code: 'SALES', manager_name: 'Дарья Романова', member_count: 2 },
            { id: 'dept-hr-03', name: 'People & HR', code: 'HR', manager_name: 'Алина Садыкова', member_count: 2 },
          ]);
        }
        if (posRes.success && posRes.data) {
          setPositions(posRes.data);
        } else {
          setPositions([
            { id: 'p1', title: 'Go Backend Developer', code: 'DEV-GO', level: 'Middle' },
            { id: 'p2', title: 'React Frontend Developer', code: 'DEV-FE', level: 'Senior' },
            { id: 'p3', title: 'Account Executive', code: 'SALES-AE', level: 'Junior' },
            { id: 'p4', title: 'DevOps Engineer', code: 'DEV-OPS', level: 'Middle' },
            { id: 'p5', title: 'QA Automation Engineer', code: 'QA-AUTO', level: 'Middle' },
          ]);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/corporate/departments', {
      name: deptName,
      code: deptCode || undefined,
      parent_id: deptParent || undefined,
      description: deptDesc || undefined,
    });

    if (res.success) {
      setIsDeptModalOpen(false);
      const name = deptName;
      setDeptName('');
      setDeptCode('');
      setDeptParent('');
      setDeptDesc('');
      loadData();
      setToastMessage(`Подразделение «${name}» успешно создано!`);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      alert(res.error?.message || 'Ошибка создания подразделения');
    }
  };

  const handleCreatePos = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/corporate/positions', {
      title: posTitle,
      code: posCode || undefined,
      level: posLevel,
      description: posDesc || undefined,
    });

    if (res.success) {
      setIsPosModalOpen(false);
      const title = posTitle;
      setPosTitle('');
      setPosCode('');
      setPosDesc('');
      loadData();
      setToastMessage(`Должность «${title}» добавлена в справочник!`);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      alert(res.error?.message || 'Ошибка создания должности');
    }
  };

  const handleArchiveDept = async (id: string, name: string) => {
    if (!confirm(`Архивировать подразделение «${name}»? Связи с сотрудниками сохранятся в истории.`)) return;
    const res = await api.delete(`/corporate/departments/${id}`);
    if (res.success) {
      loadData();
      setToastMessage(`Подразделение «${name}» архивировано.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Filter & Sort
  const filteredDepts = departments
    .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || (d.code || '').toLowerCase().includes(search.toLowerCase()) || (d.manager_name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'name_asc') return a.name.localeCompare(b.name, 'ru');
      return b.member_count - a.member_count;
    });

  const filteredPositions = positions
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || (p.code || '').toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Оргструктура компании</h1>
          <p className="text-sm text-slate-500 mt-1">
            Иерархия подразделений, команд, должностей и распределение руководителей
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPosModalOpen(true)}
          >
            <Briefcase className="w-4 h-4 mr-1.5" />
            Добавить должность
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDeptModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Добавить подразделение
          </Button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Подразделения ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'positions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Должности ({positions.length})
          </button>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'departments' ? 'Поиск подразделения...' : 'Поиск должности...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {activeTab === 'departments' && (
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium"
            >
              <option value="members_desc">По числу сотрудников</option>
              <option value="name_asc">По названию (А — Я)</option>
            </select>
          )}
        </div>
      </div>

      {/* Tab: Departments */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((dept) => (
            <Card key={dept.id} className="relative group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
                {dept.code && <Badge variant="neutral">{dept.code}</Badge>}
              </div>

              <div className="mt-3">
                <h3 className="font-semibold text-slate-900">{dept.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Руководитель: <span className="font-medium text-slate-700">{dept.manager_name || 'Не назначен'}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => navigate('/corporate/employees')}
                  className="flex items-center text-indigo-600 hover:underline font-medium"
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  {dept.member_count} сотрудников
                </button>
                <button
                  onClick={() => handleArchiveDept(dept.id, dept.name)}
                  title="Архивировать"
                  className="text-slate-400 hover:text-red-600 p-1 transition"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}

          {filteredDepts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              Подразделения по поисковому запросу не найдены
            </div>
          )}
        </div>
      )}

      {/* Tab: Positions */}
      {activeTab === 'positions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPositions.map((pos) => (
            <Card key={pos.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">{pos.title}</h4>
                {pos.level && <Badge variant="brand">{pos.level}</Badge>}
              </div>
              {pos.code && (
                <p className="text-xs font-mono text-slate-400 mt-1">Код: {pos.code}</p>
              )}
              {pos.description && (
                <p className="text-xs text-slate-500 mt-2">{pos.description}</p>
              )}
            </Card>
          ))}

          {filteredPositions.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              Должности по поисковому запросу не найдены
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Department */}
      {isDeptModalOpen && (
        <Modal
          isOpen={isDeptModalOpen}
          onClose={() => setIsDeptModalOpen(false)}
          title="Новое подразделение"
          subtitle="Создайте структурную единицу для группировки сотрудников и контента"
        >
          <form onSubmit={handleCreateDept} className="space-y-4 py-2">
            <Input
              label="Название подразделения"
              placeholder="Например: Инженерия или Отдел маркетинга"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Код подразделения"
                placeholder="ENG"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Вышестоящее подразделение</label>
                <select
                  value={deptParent}
                  onChange={(e) => setDeptParent(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
                >
                  <option value="">Нет (Корневое подразделение)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Описание</label>
              <textarea
                rows={3}
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Краткое описание функций подразделения..."
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setIsDeptModalOpen(false)}>Отмена</Button>
              <Button type="submit" variant="primary">Создать подразделение</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Position */}
      {isPosModalOpen && (
        <Modal
          isOpen={isPosModalOpen}
          onClose={() => setIsPosModalOpen(false)}
          title="Новая должность"
          subtitle="Добавьте позицию в корпоративный каталог для привязки к матрице компетенций"
        >
          <form onSubmit={handleCreatePos} className="space-y-4 py-2">
            <Input
              label="Название должности"
              placeholder="Например: Senior Frontend Developer"
              value={posTitle}
              onChange={(e) => setPosTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Код должности"
                placeholder="DEV-SR-FE"
                value={posCode}
                onChange={(e) => setPosCode(e.target.value)}
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Грейд / Уровень</label>
                <select
                  value={posLevel}
                  onChange={(e) => setPosLevel(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
                >
                  <option value="Intern">Intern (Стажер)</option>
                  <option value="Junior">Junior</option>
                  <option value="Middle">Middle</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                  <option value="Director">Director</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Описание обязанностей</label>
              <textarea
                rows={3}
                value={posDesc}
                onChange={(e) => setPosDesc(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Основные компетенции и задачи..."
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setIsPosModalOpen(false)}>Отмена</Button>
              <Button type="submit" variant="primary">Создать должность</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
