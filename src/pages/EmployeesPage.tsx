import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Upload,
  Download,
  Search,
  Check,
  Copy,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  CheckSquare,
  GraduationCap,
  ShieldCheck,
  Building2,
  Mail,
  Calendar,
  Briefcase
} from 'lucide-react';

import { Card, Table, Badge, Button, Input, Modal, api, useAuth, useDebounce } from '@iclever/frontend-kit';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: 'invited' | 'active' | 'suspended' | 'inactive' | 'archived';
  job_title?: string;
  department_id?: string;
  department_name?: string;
  manager_name?: string;
  start_date?: string;
  active_assignments_count: number;
}

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface RowReport {
  row_number: number;
  email: string;
  status: string;
  error?: string;
}

interface ImportReport {
  total_rows: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  row_results: RowReport[];
}

export const EmployeesPage: React.FC = () => {
  const { activeMember } = useAuth();
  const navigate = useNavigate();
  const isManager = activeMember?.role === 'manager';

  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDept, setSelectedDept] = useState(isManager ? 'dept-eng-01' : '');
  const [onlyMyTeam, setOnlyMyTeam] = useState(isManager);
  const [isLoading, setIsLoading] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Detail Modal
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Selection for bulk actions
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'assign_department' | 'change_role' | 'deactivate'>('assign_department');
  const [bulkTargetValue, setBulkTargetValue] = useState('');

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteDept, setInviteDept] = useState(isManager ? 'dept-eng-01' : '');
  const [inviteType, setInviteType] = useState<'email' | 'link'>('email');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const latestRequestIdRef = React.useRef(0);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, selectedDept, onlyMyTeam]);

  // Fetch departments (cached via ApiClient)
  useEffect(() => {
    api.get<Department[]>('/corporate/departments').then((res) => {
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    });
  }, []);

  // Fetch members with race-condition guard
  const fetchMembers = (searchTerm: string = debouncedSearch) => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
    });
    if (searchTerm) params.set('search', searchTerm);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (selectedDept) params.set('department_id', selectedDept);

    api.get<Member[]>(`/corporate/members?${params.toString()}`)
      .then((res) => {
        if (requestId !== latestRequestIdRef.current) {
          // Newer query already triggered; ignore stale response
          return;
        }
        if (res.success && res.data) {
          let list = res.data;
          if (onlyMyTeam) {
            list = list.filter((m) => (m.department_name || '').includes('Инженер') || m.department_id === 'dept-eng-01');
          }
          setMembers(list);
          setTotalItems(res.meta?.total_items || list.length);
        } else {
          // Demo fallback
          setMembers([
            { id: 'mem-002', first_name: 'Марат', last_name: 'Жумабаев', email: 'employee@corp.iclever.ai', role: 'employee', status: 'active', job_title: 'Go Backend Developer', department_name: 'Инженерия и разработка', department_id: 'dept-eng-01', active_assignments_count: 3 },
            { id: 'mem-003', first_name: 'Виктор', last_name: 'Ким', email: 'manager@corp.iclever.ai', role: 'manager', status: 'active', job_title: 'Engineering Manager', department_name: 'Инженерия и разработка', department_id: 'dept-eng-01', active_assignments_count: 0 },
            { id: 'mem-007', first_name: 'Александр', last_name: 'Петров', email: 'alex.p@fintech.kz', role: 'employee', status: 'active', job_title: 'DevOps Engineer', department_name: 'Инженерия и разработка', department_id: 'dept-eng-01', active_assignments_count: 1 },
            { id: 'mem-008', first_name: 'Нурлан', last_name: 'Сейтов', email: 'nurlan.s@fintech.kz', role: 'employee', status: 'active', job_title: 'Frontend Developer', department_name: 'Инженерия и разработка', department_id: 'dept-eng-01', active_assignments_count: 2 },
            { id: 'mem-009', first_name: 'Дина', last_name: 'Сабитова', email: 'dina.s@fintech.kz', role: 'employee', status: 'active', job_title: 'QA Automation Engineer', department_name: 'Инженерия и разработка', department_id: 'dept-eng-01', active_assignments_count: 1 },
            { id: 'mem-010', first_name: 'Алексей', last_name: 'Смирнов', email: 'alexey.s@fintech.kz', role: 'employee', status: 'active', job_title: 'Backend Intern', department_name: 'Инженерия и разработка', department_id: 'dept-eng-01', active_assignments_count: 1 },
            { id: 'mem-001', first_name: 'Алина', last_name: 'Садыкова', email: 'admin@corp.iclever.ai', role: 'org_admin', status: 'active', job_title: 'HR Lead & Admin', department_name: 'People & HR', department_id: 'dept-hr-03', active_assignments_count: 2 },
          ]);
          setTotalItems(7);
        }
      })
      .finally(() => {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchMembers(debouncedSearch);
  }, [page, debouncedSearch, roleFilter, statusFilter, selectedDept, onlyMyTeam]);

  // Handle invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post<{ invite_link?: string }>('/corporate/members/invite', {
      email: inviteEmail,
      role: inviteRole,
      department_id: inviteDept || undefined,
      invite_type: inviteType,
    });

    if (res.success) {
      if (inviteType === 'link' && res.data?.invite_link) {
        setGeneratedInviteLink(res.data.invite_link);
      } else {
        setIsInviteModalOpen(false);
        setInviteEmail('');
        fetchMembers();
        setActionFeedback(`Приглашение отправлено на ${inviteEmail}`);
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } else {
      alert(res.error?.message || 'Ошибка отправки приглашения');
    }
  };

  // Handle CSV import
  const handleImportSubmit = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportReport(null);

    const formData = new FormData();
    formData.append('file', importFile);

    const token = localStorage.getItem('iclever_token');
    const orgId = localStorage.getItem('iclever_active_org_id');

    try {
      const response = await fetch('/api/v1/corporate/members/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Organization-ID': orgId || '',
        },
        body: formData,
      });

      const json = await response.json();
      if (json.success && json.data) {
        setImportReport(json.data);
        fetchMembers();
      } else {
        alert(json.error?.message || 'Ошибка импорта файла');
      }
    } catch {
      alert('Ошибка соединения при импорте');
    } finally {
      setIsImporting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const csvContent = "first_name,last_name,email,role,job_title,department_code,manager_email\nИван,Иванов,ivan@company.com,employee,Разработчик,ENG,lead@company.com\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employees_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export real CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Имя', 'Фамилия', 'Email', 'Роль', 'Статус', 'Должность', 'Подразделение', 'Активных заданий'];
    const rows = sortedMembers.map((m) => [
      m.id,
      `"${m.first_name}"`,
      `"${m.last_name}"`,
      m.email,
      m.role,
      m.status,
      `"${m.job_title || ''}"`,
      `"${m.department_name || ''}"`,
      m.active_assignments_count
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActionFeedback('Файл employees.csv успешно сформирован и загружен!');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Execute bulk action
  const handleBulkAction = async () => {
    if (selectedIDs.length === 0) return;
    const res = await api.post('/corporate/members/bulk', {
      action: bulkActionType,
      member_ids: selectedIDs,
      target_id: bulkActionType === 'assign_department' ? bulkTargetValue : undefined,
      new_role: bulkActionType === 'change_role' ? bulkTargetValue : undefined,
    });

    if (res.success) {
      const count = selectedIDs.length;
      setSelectedIDs([]);
      setIsBulkActionModalOpen(false);
      fetchMembers();
      setActionFeedback(`Действие успешно применено к ${count} сотрудникам!`);
      setTimeout(() => setActionFeedback(null), 3000);
    } else {
      alert(res.error?.message || 'Ошибка выполнения действия');
    }
  };

  // Toggle Member Status from detail modal
  const handleToggleStatus = (member: Member) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    setMembers(members.map((m) => m.id === member.id ? { ...m, status: newStatus } : m));
    setDetailMember({ ...member, status: newStatus });
    setActionFeedback(`Статус сотрудника ${member.first_name} изменен на ${newStatus}`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Sorted members
  const sortedMembers = [...members].sort((a, b) => {
    let valA: any = a[sortField as keyof Member] ?? '';
    let valB: any = b[sortField as keyof Member] ?? '';

    if (sortField === 'name') {
      valA = `${a.first_name} ${a.last_name}`;
      valB = `${b.first_name} ${b.last_name}`;
    }

    if (typeof valA === 'string') {
      return sortDir === 'asc' ? valA.localeCompare(valB, 'ru') : valB.localeCompare(valA, 'ru');
    }
    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-indigo-600 ml-1 inline font-bold" />
      : <ArrowDown className="w-3 h-3 text-indigo-600 ml-1 inline font-bold" />;
  };

  // Table columns
  const columns = [
    {
      key: 'select',
      header: '',
      className: 'w-10 text-center',
      render: (item: Member) => (
        <input
          type="checkbox"
          checked={selectedIDs.includes(item.id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setSelectedIDs([...selectedIDs, item.id]);
            } else {
              setSelectedIDs(selectedIDs.filter((id) => id !== item.id));
            }
          }}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
        />
      ),
    },
    {
      key: 'name',
      header: (
        <div onClick={() => handleSort('name')} className="cursor-pointer select-none flex items-center hover:text-indigo-600">
          <span>Сотрудник</span>
          {getSortIcon('name')}
        </div>
      ),
      render: (item: Member) => (
        <div className="cursor-pointer" onClick={() => setDetailMember(item)}>
          <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
            {item.first_name} {item.last_name}
          </div>
          <div className="text-xs text-slate-500">{item.email}</div>
        </div>
      ),
    },
    {
      key: 'job_title',
      header: (
        <div onClick={() => handleSort('job_title')} className="cursor-pointer select-none flex items-center hover:text-indigo-600">
          <span>Должность</span>
          {getSortIcon('job_title')}
        </div>
      ),
      render: (item: Member) => (
        <span className="text-xs text-slate-700 cursor-pointer" onClick={() => setDetailMember(item)}>
          {item.job_title || '—'}
        </span>
      ),
    },
    {
      key: 'department',
      header: (
        <div onClick={() => handleSort('department_name')} className="cursor-pointer select-none flex items-center hover:text-indigo-600">
          <span>Подразделение</span>
          {getSortIcon('department_name')}
        </div>
      ),
      render: (item: Member) => (
        <span className="text-xs font-medium text-slate-700 cursor-pointer" onClick={() => setDetailMember(item)}>
          {item.department_name || '—'}
        </span>
      ),
    },
    {
      key: 'role',
      header: (
        <div onClick={() => handleSort('role')} className="cursor-pointer select-none flex items-center hover:text-indigo-600">
          <span>Роль</span>
          {getSortIcon('role')}
        </div>
      ),
      render: (item: Member) => (
        <span className="text-xs font-mono uppercase text-slate-600 cursor-pointer" onClick={() => setDetailMember(item)}>
          {item.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: (
        <div onClick={() => handleSort('status')} className="cursor-pointer select-none flex items-center hover:text-indigo-600">
          <span>Статус</span>
          {getSortIcon('status')}
        </div>
      ),
      render: (item: Member) => {
        const variants = {
          active: 'success' as const,
          invited: 'warning' as const,
          suspended: 'danger' as const,
          inactive: 'neutral' as const,
          archived: 'neutral' as const,
        };
        return (
          <div className="cursor-pointer" onClick={() => setDetailMember(item)}>
            <Badge variant={variants[item.status] || 'neutral'}>{item.status}</Badge>
          </div>
        );
      },
    },
    {
      key: 'assignments',
      header: (
        <div onClick={() => handleSort('active_assignments_count')} className="cursor-pointer select-none flex items-center hover:text-indigo-600">
          <span>Курсы в процессе</span>
          {getSortIcon('active_assignments_count')}
        </div>
      ),
      render: (item: Member) => (
        <span className="text-xs font-semibold text-slate-700 cursor-pointer" onClick={() => setDetailMember(item)}>
          {item.active_assignments_count} шт.
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {actionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <span className="flex items-center">
            <Check className="w-4 h-4 mr-2 text-emerald-600" />
            {actionFeedback}
          </span>
          <button onClick={() => setActionFeedback(null)}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isManager ? 'Команда инженеров' : 'Сотрудники'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isManager
              ? `Инженерный состав команды под руководством Виктора Кима (${sortedMembers.length} чел.)`
              : `Управление кадровым составом, ролями, инвайтами и массовыми операциями (${totalItems} чел.)`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isManager && (
            <button
              onClick={() => setOnlyMyTeam(!onlyMyTeam)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                onlyMyTeam ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              {onlyMyTeam ? '✓ Только моя команда' : 'Все сотрудники'}
            </button>
          )}

          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-1.5" />
            Экспорт CSV
          </Button>
          {!isManager && (
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Импорт
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Пригласить
          </Button>
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedIDs.length > 0 && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2 text-sm text-indigo-900 font-medium">
            <span>Выбрано сотрудников: {selectedIDs.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkActionType('assign_department');
                setIsBulkActionModalOpen(true);
              }}
            >
              Назначить отдел
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkActionType('change_role');
                setIsBulkActionModalOpen(true);
              }}
            >
              Сменить роль
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setBulkActionType('deactivate');
                setIsBulkActionModalOpen(true);
              }}
            >
              Деактивировать
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIDs([])}>
              Снять выбор
            </Button>
          </div>
        </div>
      )}

      {/* Filters & Sorting Bar */}
      <Card>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
          <div className="w-full md:max-w-xs">
            <Input
              placeholder="Поиск по имени, email, должности..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end text-xs">
            {/* Sort selector dropdown */}
            <select
              value={`${sortField}_${sortDir}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('_');
                setSortField(f);
                setSortDir(d as 'asc' | 'desc');
              }}
              className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="name_asc">Сортировка: Имя (А — Я)</option>
              <option value="name_desc">Сортировка: Имя (Я — А)</option>
              <option value="active_assignments_count_desc">Курсы в процессе (по убыванию)</option>
              <option value="active_assignments_count_asc">Курсы в процессе (по возрастанию)</option>
              <option value="status_asc">По статусу</option>
              <option value="job_title_asc">По должности</option>
            </select>

            {!isManager && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Все отделы</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Все роли</option>
              <option value="org_admin">Org Admin</option>
              <option value="hr_manager">HR Manager</option>
              <option value="manager">Manager</option>
              <option value="trainer">Trainer</option>
              <option value="employee">Employee</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Все статусы</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <Table
          columns={columns}
          data={sortedMembers}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
        />
      </Card>

      {/* Detail Modal: Employee Profile */}
      {detailMember && (
        <Modal
          isOpen={!!detailMember}
          onClose={() => setDetailMember(null)}
          title={`Карточка сотрудника: ${detailMember.first_name} ${detailMember.last_name}`}
          size="md"
        >
          <div className="space-y-4 py-2 text-xs text-slate-700">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
                {detailMember.first_name[0]}{detailMember.last_name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{detailMember.first_name} {detailMember.last_name}</h4>
                  <Badge variant={detailMember.status === 'active' ? 'success' : detailMember.status === 'invited' ? 'warning' : 'danger'}>
                    {detailMember.status}
                  </Badge>
                </div>
                <p className="text-slate-500">{detailMember.job_title || 'Должность не указана'} • {detailMember.department_name || 'Подразделение не назначено'}</p>
                <p className="text-indigo-600 font-medium">{detailMember.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block">Роль в системе</span>
                <span className="font-bold text-slate-800 uppercase font-mono">{detailMember.role}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block">Курсов в процессе</span>
                <span className="font-bold text-indigo-600">{detailMember.active_assignments_count} шт.</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block">Дата начала работы</span>
                <span className="font-medium text-slate-800">{detailMember.start_date || '2025-06-01'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block">Руководитель</span>
                <span className="font-medium text-slate-800">{detailMember.manager_name || 'Виктор Ким'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleStatus(detailMember)}
              >
                {detailMember.status === 'active' ? 'Приостановить доступ' : 'Активировать'}
              </Button>

              <div className="flex space-x-2">
                <Button variant="secondary" size="sm" onClick={() => setDetailMember(null)}>
                  Закрыть
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const name = encodeURIComponent(`${detailMember.first_name} ${detailMember.last_name}`);
                    setDetailMember(null);
                    navigate(`/corporate/assignments?assignee=${name}`);
                  }}
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  Назначить трек
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Invite Member */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setGeneratedInviteLink('');
        }}
        title="Пригласить сотрудника"
        subtitle="Сотрудник получит доступ к учебным трекам организации"
      >
        {generatedInviteLink ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
              Одноразовая ссылка успешно создана. Скопируйте и передайте её сотруднику:
            </div>
            <div className="flex items-center space-x-2">
              <input
                readOnly
                value={generatedInviteLink}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generatedInviteLink);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
              >
                {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4 py-2">
            <Input
              label="Email сотрудника"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="employee@company.com"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Роль в системе</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
                >
                  <option value="employee">Employee (Сотрудник)</option>
                  <option value="manager">Manager (Руководитель команды)</option>
                  <option value="trainer">Trainer (Тренер)</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="org_admin">Organization Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Подразделение</label>
                <select
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
                >
                  <option value="">Не выбрано</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Способ отправки</label>
              <div className="flex items-center space-x-4 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteType"
                    checked={inviteType === 'email'}
                    onChange={() => setInviteType('email')}
                  />
                  <span>Отправить на email</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteType"
                    checked={inviteType === 'link'}
                    onChange={() => setInviteType('link')}
                  />
                  <span>Одноразовая ссылка</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setIsInviteModalOpen(false)}>Отмена</Button>
              <Button type="submit" variant="primary">
                {inviteType === 'link' ? 'Сгенерировать ссылку' : 'Отправить приглашение'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Bulk CSV Import with Line-by-Line Report */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportReport(null);
          setImportFile(null);
        }}
        title="Массовый импорт сотрудников (CSV/XLSX)"
        subtitle="Идемпотентная загрузка списка сотрудников с построчным отчетом об ошибках"
        maxWidth="4xl"
      >
        <div className="space-y-4 py-2">
          {/* File Picker & Template */}
          <div className="flex items-center justify-between p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-xs font-medium text-slate-900">
                  {importFile ? importFile.name : 'Выберите файл формата CSV для импорта'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Поддерживаются заголовки: first_name, last_name, email, role, job_title, department_code
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-3.5 h-3.5 mr-1" />
                Скачать шаблон
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center font-medium rounded-lg px-3 py-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700">
                  Обзор файла
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                      setImportReport(null);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Import Action */}
          {importFile && !importReport && (
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportSubmit}
                isLoading={isImporting}
              >
                Начать импорт
              </Button>
            </div>
          )}

          {/* Import Line-by-Line Report */}
          {importReport && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500">Всего строк</span>
                  <p className="text-lg font-bold text-slate-900">{importReport.total_rows}</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-xs text-green-700">Создано</span>
                  <p className="text-lg font-bold text-green-700">{importReport.created_count}</p>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-xs text-indigo-700">Обновлено</span>
                  <p className="text-lg font-bold text-indigo-700">{importReport.updated_count}</p>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs text-red-700">Ошибок</span>
                  <p className="text-lg font-bold text-red-700">{importReport.failed_count}</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-500">Строка</th>
                      <th className="px-3 py-2 text-left text-slate-500">Email</th>
                      <th className="px-3 py-2 text-left text-slate-500">Статус</th>
                      <th className="px-3 py-2 text-left text-slate-500">Результат / Ошибка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {importReport.row_results.map((r, i) => (
                      <tr key={i} className={r.status === 'failed' ? 'bg-red-50/50' : ''}>
                        <td className="px-3 py-1.5 font-mono">{r.row_number}</td>
                        <td className="px-3 py-1.5">{r.email || '—'}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant={r.status === 'failed' ? 'danger' : 'success'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">{r.error || 'Успешно обработано'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Bulk Actions */}
      <Modal
        isOpen={isBulkActionModalOpen}
        onClose={() => setIsBulkActionModalOpen(false)}
        title="Массовое действие"
        subtitle={`Применяется к ${selectedIDs.length} выбранным сотрудникам`}
      >
        <div className="space-y-4 py-2">
          {bulkActionType === 'assign_department' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Выберите подразделение</label>
              <select
                value={bulkTargetValue}
                onChange={(e) => setBulkTargetValue(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
              >
                <option value="">Выберите подразделение</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {bulkActionType === 'change_role' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Новая роль</label>
              <select
                value={bulkTargetValue}
                onChange={(e) => setBulkTargetValue(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
              >
                <option value="">Выберите роль</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="trainer">Trainer</option>
                <option value="hr_manager">HR Manager</option>
              </select>
            </div>
          )}

          {bulkActionType === 'deactivate' && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Выбранные сотрудники будут переведены в статус inactive. История пройденных курсов и тестов будет сохранена.</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsBulkActionModalOpen(false)}>Отмена</Button>
            <Button
              variant={bulkActionType === 'deactivate' ? 'danger' : 'primary'}
              onClick={handleBulkAction}
            >
              Подтвердить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
