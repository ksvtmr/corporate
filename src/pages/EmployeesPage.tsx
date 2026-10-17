import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Upload, Download, Check, Copy, AlertTriangle, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Mail } from 'lucide-react';
import {
  api,
  ASSIGNABLE_ROLES,
  Badge,
  Button,
  canAssignRole,
  Card,
  ConfirmDialog,
  ErrorState,
  Input,
  LocalizedText,
  Modal,
  saveBlob,
  Table,
  useApiErrorMessage,
  useAuth,
  useDebounce,
  useI18n,
  useToast,
  ApiError,
  Role,
  MemberStatus,
} from '@iclever/frontend-kit';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  job_title?: string;
  department_id?: string;
  department_name?: string;
  department_name_i18n?: LocalizedText;
  manager_name?: string;
  start_date?: string;
  active_assignments_count: number;
}

interface Department {
  id: string;
  name: string;
  name_i18n?: LocalizedText;
  code?: string;
}

interface ImportReport {
  total_rows: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  truncated?: boolean;
  row_results: Array<{ row_number: number; email: string; status: 'created' | 'updated' | 'failed'; error_code?: string }>;
}

type SortField = 'name' | 'job_title' | 'department_name' | 'role' | 'status' | 'active_assignments_count';
type BulkAction = 'assign_department' | 'change_role' | 'deactivate';

const PAGE_SIZE = 20;
const STATUS_VARIANT: Record<MemberStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
  inactive: 'neutral',
  archived: 'neutral',
};
const CSV_TEMPLATE_HEADER = 'first_name,last_name,email,role,job_title,department_code';

export const EmployeesPage: React.FC = () => {
  const { t, lt, formatDate, formatNumber } = useI18n();
  const { activeMember, can } = useAuth();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isManager = activeMember?.role === 'manager';
  const canManage = can('members.manage');
  const actorRole = activeMember?.role ?? 'employee';

  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState({ total_items: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [deptFilter, setDeptFilter] = useState(() => searchParams.get('department_id') || '');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ member: Member; status: MemberStatus } | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkTarget, setBulkTarget] = useState('');

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('employee');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteType, setInviteType] = useState<'email' | 'link'>('email');
  const [inviteResult, setInviteResult] = useState<{ link: string; email: string; type: 'email' | 'link' } | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const latestRequestIdRef = useRef(0);

  const deptName = useCallback((m: { department_name?: string; department_name_i18n?: LocalizedText }) => lt(m.department_name_i18n ?? m.department_name) || '—', [lt]);

  useEffect(() => {
    setPage(1);
    setSelectedIDs([]);
  }, [debouncedSearch, roleFilter, statusFilter, deptFilter, sortField, sortDir]);

  useEffect(() => {
    api.get<Department[]>('/corporate/departments').then((res) => res.success && res.data && setDepartments(res.data));
  }, []);

  useEffect(() => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort: sortField, dir: sortDir });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (deptFilter) params.set('department_id', deptFilter);

    api.get<Member[]>(`/corporate/members?${params.toString()}`, { noCache: reloadToken > 0 }).then((res) => {
      // Ignore responses that arrive after a newer query was issued.
      if (requestId !== latestRequestIdRef.current) return;
      setIsLoading(false);
      if (res.success && res.data) {
        setMembers(res.data);
        setMeta({ total_items: res.meta?.total_items ?? res.data.length, total_pages: res.meta?.total_pages ?? 1 });
        setLoadError(null);
      } else {
        setMembers([]);
        setLoadError(res.error ?? null);
      }
    });
  }, [page, debouncedSearch, roleFilter, statusFilter, deptFilter, sortField, sortDir, reloadToken]);

  const refresh = () => setReloadToken((n) => n + 1);

  const assignableRoles = useMemo(() => ASSIGNABLE_ROLES.filter((r) => canAssignRole(actorRole, r)), [actorRole]);

  // ---- actions --------------------------------------------------------------

  const resetInvite = () => {
    setIsInviteOpen(false);
    setInviteEmail('');
    setInviteRole('employee');
    setInviteDept('');
    setInviteType('email');
    setInviteResult(null);
    setInviteError('');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutating) return;
    setInviteError('');
    setIsMutating(true);
    const res = await api.post<{ invite_link: string }>('/corporate/members/invite', {
      email: inviteEmail.trim(),
      role: inviteRole,
      department_id: inviteDept || undefined,
      invite_type: inviteType,
    });
    setIsMutating(false);
    if (res.success && res.data) {
      setInviteResult({ link: res.data.invite_link, email: inviteEmail.trim(), type: inviteType });
      refresh();
    } else {
      setInviteError(errorMessage(res.error));
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile || isImporting) return;
    setIsImporting(true);
    setImportReport(null);
    const form = new FormData();
    form.append('file', importFile);
    const res = await api.upload<ImportReport>('/corporate/members/import', form);
    setIsImporting(false);
    if (res.success && res.data) {
      setImportReport(res.data);
      refresh();
    } else {
      toast.error(errorMessage(res.error));
    }
  };

  const downloadTemplate = () => {
    const example = `${CSV_TEMPLATE_HEADER}\n${t('employees.import.templateExample')}\n`;
    saveBlob(new Blob(['﻿' + example], { type: 'text/csv;charset=utf-8' }), 'employees_template.csv');
  };

  const handleExport = async () => {
    setIsExporting(true);
    const res = await api.download('/corporate/members/export', `employees_${new Date().toISOString().slice(0, 10)}.csv`);
    setIsExporting(false);
    if (res.success && res.data) {
      saveBlob(res.data.blob, res.data.filename);
      toast.success(t('employees.export.success', { file: res.data.filename }));
    } else {
      toast.error(errorMessage(res.error));
    }
  };

  const handleBulk = async () => {
    if (!bulkAction || selectedIDs.length === 0 || isMutating) return;
    if (bulkAction !== 'deactivate' && !bulkTarget) return;
    setIsMutating(true);
    const res = await api.post<{ affected_rows: number }>('/corporate/members/bulk', {
      action: bulkAction,
      member_ids: selectedIDs,
      target_id: bulkAction === 'assign_department' ? bulkTarget : undefined,
      new_role: bulkAction === 'change_role' ? bulkTarget : undefined,
    });
    setIsMutating(false);
    if (res.success) {
      toast.success(t('employees.bulk.success', { count: res.data?.affected_rows ?? 0 }));
      setSelectedIDs([]);
      setBulkAction(null);
      setBulkTarget('');
      refresh();
    } else {
      toast.error(errorMessage(res.error));
    }
  };

  const handleStatusChange = async () => {
    if (!pendingStatus || isMutating) return;
    setIsMutating(true);
    const { member, status } = pendingStatus;
    const res = status === 'archived' ? await api.delete<Member>(`/corporate/members/${member.id}`) : await api.patch<Member>(`/corporate/members/${member.id}`, { status });
    setIsMutating(false);
    setPendingStatus(null);
    if (res.success && res.data) {
      toast.success(t(`employees.status.changed.${status}`, { name: `${member.first_name} ${member.last_name}`.trim() || member.email }));
      setDetailMember(status === 'archived' ? null : res.data);
      refresh();
    } else {
      toast.error(errorMessage(res.error));
    }
  };

  const handleResendInvite = async (member: Member) => {
    setIsMutating(true);
    const res = await api.post<{ invite_link: string }>('/corporate/members/invite/resend', { member_id: member.id });
    setIsMutating(false);
    if (res.success && res.data) {
      await navigator.clipboard?.writeText(res.data.invite_link).catch(() => undefined);
      toast.success(t('employees.invite.resent', { email: member.email }));
    } else {
      toast.error(errorMessage(res.error));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ---- rendering ------------------------------------------------------------

  const sortHeader = (field: SortField, label: string) => {
    const active = sortField === field;
    const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center uppercase hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
        aria-label={t('employees.table.sortBy', { column: label })}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        <span>{label}</span>
        <Icon className={`w-3 h-3 ml-1 ${active ? 'text-indigo-600' : 'text-slate-300'}`} aria-hidden="true" />
      </button>
    );
  };

  const displayName = (m: Member) => `${m.first_name} ${m.last_name}`.trim() || t('employees.pendingName');
  const allOnPageSelected = members.length > 0 && members.every((m) => selectedIDs.includes(m.id));

  const columns = [
    ...(canManage
      ? [
          {
            key: 'select',
            header: (
              <input
                type="checkbox"
                aria-label={t('employees.table.selectPage')}
                checked={allOnPageSelected}
                onChange={(e) =>
                  setSelectedIDs((prev) => (e.target.checked ? Array.from(new Set([...prev, ...members.map((m) => m.id)])) : prev.filter((id) => !members.some((m) => m.id === id))))
                }
                className="rounded border-slate-300 text-indigo-600 h-4 w-4"
              />
            ),
            className: 'w-10 text-center',
            render: (item: Member) => (
              <input
                type="checkbox"
                aria-label={t('employees.table.select', { name: displayName(item) })}
                checked={selectedIDs.includes(item.id)}
                onChange={(e) => setSelectedIDs((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
            ),
          },
        ]
      : []),
    {
      key: 'name',
      header: sortHeader('name', t('employees.table.employee')),
      render: (item: Member) => (
        <button type="button" className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded" onClick={() => setDetailMember(item)}>
          <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">{displayName(item)}</div>
          <div className="text-xs text-slate-500 break-all">{item.email}</div>
        </button>
      ),
    },
    { key: 'job_title', header: sortHeader('job_title', t('employees.table.jobTitle')), render: (item: Member) => <span className="text-xs text-slate-700">{item.job_title || '—'}</span> },
    { key: 'department', header: sortHeader('department_name', t('employees.table.department')), render: (item: Member) => <span className="text-xs font-medium text-slate-700">{deptName(item)}</span> },
    { key: 'role', header: sortHeader('role', t('employees.table.role')), render: (item: Member) => <span className="text-xs text-slate-600">{t(`roles.${item.role}`)}</span> },
    {
      key: 'status',
      header: sortHeader('status', t('employees.table.status')),
      render: (item: Member) => <Badge variant={STATUS_VARIANT[item.status] || 'neutral'}>{t(`roles.status.${item.status}`)}</Badge>,
    },
    {
      key: 'assignments',
      header: sortHeader('active_assignments_count', t('employees.table.activeCourses')),
      render: (item: Member) => <span className="text-xs font-semibold text-slate-700">{formatNumber(item.active_assignments_count)}</span>,
    },
  ];

  const from = meta.total_items === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, meta.total_items);
  const selectClass = 'text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isManager ? t('employees.titleManager') : t('employees.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isManager
              ? t('employees.subtitleManager', { department: deptName(activeMember ?? {}), count: meta.total_items })
              : t('employees.subtitle', { count: meta.total_items })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('members.export') && (
            <Button variant="outline" size="sm" onClick={handleExport} isLoading={isExporting}>
              <Download className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('employees.actions.export')}
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {t('employees.actions.import')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {t('employees.actions.invite')}
              </Button>
            </>
          )}
        </div>
      </div>

      {canManage && selectedIDs.length > 0 && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm text-indigo-900 font-medium">{t('employees.bulk.selected', { count: selectedIDs.length })}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBulkAction('assign_department')}>
              {t('employees.bulk.assignDepartment')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setBulkAction('change_role')}>
              {t('employees.bulk.changeRole')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkAction('deactivate')}>
              {t('employees.bulk.deactivate')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIDs([])}>
              {t('common.actions.clearSelection')}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div className="w-full lg:max-w-xs">
            <Input placeholder={t('employees.filters.searchPlaceholder')} aria-label={t('common.actions.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              aria-label={t('common.filters.sortBy')}
              value={`${sortField}:${sortDir}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split(':');
                setSortField(f as SortField);
                setSortDir(d as 'asc' | 'desc');
              }}
              className={`${selectClass} font-medium`}
            >
              <option value="name:asc">{t('employees.sort.nameAsc')}</option>
              <option value="name:desc">{t('employees.sort.nameDesc')}</option>
              <option value="active_assignments_count:desc">{t('employees.sort.coursesDesc')}</option>
              <option value="active_assignments_count:asc">{t('employees.sort.coursesAsc')}</option>
              <option value="status:asc">{t('employees.sort.status')}</option>
              <option value="job_title:asc">{t('employees.sort.jobTitle')}</option>
            </select>
            {!isManager && (
              <select aria-label={t('employees.table.department')} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectClass}>
                <option value="">{t('common.filters.allDepartments')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lt(d.name_i18n ?? d.name)}
                  </option>
                ))}
              </select>
            )}
            <select aria-label={t('employees.table.role')} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
              <option value="">{t('common.filters.allRoles')}</option>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
            <select aria-label={t('employees.table.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
              <option value="">{t('employees.filters.allCurrent')}</option>
              {(['active', 'invited', 'suspended', 'inactive', 'archived'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`roles.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadError ? (
          <ErrorState message={errorMessage(loadError, 'errors.loadFailed')} onRetry={refresh} />
        ) : (
          <>
            <Table columns={columns} data={members} keyExtractor={(item) => item.id} isLoading={isLoading} emptyText={t('employees.empty')} />
            {meta.total_items > 0 && (
              <nav aria-label={t('common.pagination.label')} className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 text-xs text-slate-500">
                <span>{t('common.pagination.summary', { from, to, total: meta.total_items })}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
                    {t('common.actions.previous')}
                  </Button>
                  <span>{t('common.pagination.page', { page, pages: meta.total_pages })}</span>
                  <Button variant="outline" size="sm" disabled={page >= meta.total_pages || isLoading} onClick={() => setPage((p) => p + 1)}>
                    {t('common.actions.nextPage')}
                  </Button>
                </div>
              </nav>
            )}
          </>
        )}
      </Card>

      {/* Employee profile */}
      {detailMember && (
        <Modal isOpen onClose={() => setDetailMember(null)} title={t('employees.detail.title', { name: displayName(detailMember) })} size="md">
          <div className="space-y-4 py-2 text-xs text-slate-700">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow shrink-0" aria-hidden="true">
                {(detailMember.first_name[0] || detailMember.email[0] || '?').toUpperCase()}
                {(detailMember.last_name[0] || '').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{displayName(detailMember)}</h4>
                  <Badge variant={STATUS_VARIANT[detailMember.status]}>{t(`roles.status.${detailMember.status}`)}</Badge>
                </div>
                <p className="text-slate-500">
                  {detailMember.job_title || t('employees.detail.noJobTitle')} • {detailMember.department_id ? deptName(detailMember) : t('employees.detail.noDepartment')}
                </p>
                <p className="text-indigo-600 font-medium break-all">{detailMember.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-[11px]">
              {[
                [t('employees.detail.role'), t(`roles.${detailMember.role}`)],
                [t('employees.detail.activeCourses'), formatNumber(detailMember.active_assignments_count)],
                [t('employees.detail.startDate'), formatDate(detailMember.start_date)],
                [t('employees.detail.manager'), detailMember.manager_name || '—'],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {canManage && detailMember.id !== activeMember?.id ? (
                <div className="flex flex-wrap gap-2">
                  {detailMember.status === 'active' && (
                    <Button variant="outline" size="sm" onClick={() => setPendingStatus({ member: detailMember, status: 'suspended' })}>
                      {t('employees.detail.suspend')}
                    </Button>
                  )}
                  {(detailMember.status === 'suspended' || detailMember.status === 'inactive') && (
                    <Button variant="outline" size="sm" onClick={() => setPendingStatus({ member: detailMember, status: 'active' })}>
                      {t('employees.detail.reactivate')}
                    </Button>
                  )}
                  {detailMember.status === 'invited' && (
                    <Button variant="outline" size="sm" onClick={() => handleResendInvite(detailMember)} disabled={isMutating}>
                      <Mail className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      {t('employees.detail.resendInvite')}
                    </Button>
                  )}
                  {detailMember.status !== 'archived' && (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setPendingStatus({ member: detailMember, status: 'archived' })}>
                      {t('employees.detail.archive')}
                    </Button>
                  )}
                </div>
              ) : (
                <span />
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setDetailMember(null)}>
                  {t('common.actions.close')}
                </Button>
                {can('assignments.manage') && detailMember.status === 'active' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const id = detailMember.id;
                      setDetailMember(null);
                      navigate(`/corporate/assignments?assignee=${encodeURIComponent(id)}`);
                    }}
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    {t('employees.detail.assignTrack')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!pendingStatus}
        title={t(`employees.status.confirmTitle.${pendingStatus?.status ?? 'suspended'}`)}
        message={pendingStatus ? t(`employees.status.confirmMessage.${pendingStatus.status}`, { name: displayName(pendingStatus.member) }) : ''}
        tone={pendingStatus?.status === 'active' ? 'primary' : 'danger'}
        isLoading={isMutating}
        onConfirm={handleStatusChange}
        onCancel={() => setPendingStatus(null)}
      />

      {/* Invite */}
      <Modal isOpen={isInviteOpen} onClose={resetInvite} title={t('employees.invite.title')} subtitle={t('employees.invite.subtitle')} preventClose={isMutating}>
        {inviteResult ? (
          <div className="space-y-4 py-2">
            <div role="status" className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
              {inviteResult.type === 'email' ? t('employees.invite.emailSimulated', { email: inviteResult.email }) : t('employees.invite.linkCreated')}
            </div>
            <div className="flex items-center space-x-2">
              <input readOnly aria-label={t('employees.invite.link')} value={inviteResult.link} className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2" onFocus={(e) => e.target.select()} />
              <Button
                size="sm"
                variant="outline"
                aria-label={isCopied ? t('common.actions.copied') : t('common.actions.copy')}
                onClick={async () => {
                  await navigator.clipboard?.writeText(inviteResult.link).catch(() => undefined);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
              >
                {isCopied ? <Check className="w-4 h-4 text-green-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">{t('employees.invite.linkExpiry')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setInviteResult(null)}>
                {t('employees.invite.another')}
              </Button>
              <Button variant="primary" onClick={resetInvite}>
                {t('common.actions.close')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4 py-2">
            {inviteError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {inviteError}
              </div>
            )}
            <Input label={t('employees.invite.email')} type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="employee@company.com" required data-autofocus />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="invite-role" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('employees.invite.role')}
                </label>
                <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {t(`roles.${r}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="invite-dept" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('employees.invite.department')}
                </label>
                <select id="invite-dept" value={inviteDept} onChange={(e) => setInviteDept(e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                  <option value="">{t('employees.invite.noDepartment')}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {lt(d.name_i18n ?? d.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <fieldset>
              <legend className="block text-xs font-medium text-slate-700 mb-1">{t('employees.invite.method')}</legend>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="inviteType" value="email" checked={inviteType === 'email'} onChange={() => setInviteType('email')} />
                  <span>{t('employees.invite.byEmail')}</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input type="radio" name="inviteType" value="link" checked={inviteType === 'link'} onChange={() => setInviteType('link')} />
                  <span>{t('employees.invite.byLink')}</span>
                </label>
              </div>
            </fieldset>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={resetInvite}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" variant="primary" isLoading={isMutating}>
                {inviteType === 'link' ? t('employees.invite.generateLink') : t('employees.invite.send')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CSV import */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportReport(null);
          setImportFile(null);
        }}
        title={t('employees.import.title')}
        subtitle={t('employees.import.subtitle')}
        maxWidth="4xl"
        preventClose={isImporting}
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50">
            <div className="flex items-center space-x-3 min-w-0">
              <FileSpreadsheet className="w-8 h-8 text-indigo-600 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">{importFile ? importFile.name : t('employees.import.chooseFile')}</p>
                <p className="text-[11px] text-slate-500">{t('employees.import.headers', { headers: CSV_TEMPLATE_HEADER })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                {t('employees.import.template')}
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center font-medium rounded-lg px-3 py-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 focus-within:ring-2 focus-within:ring-indigo-500">
                  {t('employees.import.browse')}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setImportFile(e.target.files[0]);
                        setImportReport(null);
                      }
                      e.target.value = '';
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {importFile && !importReport && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleImportSubmit} isLoading={isImporting}>
                {t('employees.import.start')}
              </Button>
            </div>
          )}

          {importReport && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  ['total', importReport.total_rows, 'bg-slate-50 border-slate-200 text-slate-900'],
                  ['created', importReport.created_count, 'bg-green-50 border-green-200 text-green-700'],
                  ['updated', importReport.updated_count, 'bg-indigo-50 border-indigo-200 text-indigo-700'],
                  ['failed', importReport.failed_count, 'bg-red-50 border-red-200 text-red-700'],
                ].map(([key, value, cls]) => (
                  <div key={key as string} className={`p-3 border rounded-lg ${cls}`}>
                    <span className="text-xs">{t(`employees.import.summary.${key}`)}</span>
                    <p className="text-lg font-bold">{formatNumber(value as number)}</p>
                  </div>
                ))}
              </div>
              {importReport.truncated && <p className="text-xs text-amber-700">{t('employees.import.truncated')}</p>}
              {importReport.created_count > 0 && <p className="text-xs text-slate-500">{t('employees.import.invitedNote')}</p>}
              <div className="max-h-60 overflow-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-slate-500">{t('employees.import.columns.row')}</th>
                      <th scope="col" className="px-3 py-2 text-left text-slate-500">Email</th>
                      <th scope="col" className="px-3 py-2 text-left text-slate-500">{t('employees.import.columns.status')}</th>
                      <th scope="col" className="px-3 py-2 text-left text-slate-500">{t('employees.import.columns.result')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {importReport.row_results.map((r) => (
                      <tr key={r.row_number} className={r.status === 'failed' ? 'bg-red-50/50' : ''}>
                        <td className="px-3 py-1.5 font-mono">{r.row_number}</td>
                        <td className="px-3 py-1.5 break-all">{r.email || '—'}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant={r.status === 'failed' ? 'danger' : r.status === 'updated' ? 'info' : 'success'}>{t(`employees.import.rowStatus.${r.status}`)}</Badge>
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">{r.error_code ? t(`employees.import.rowErrors.${r.error_code}`) : t('employees.import.rowOk')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk actions */}
      <Modal
        isOpen={!!bulkAction}
        onClose={() => {
          setBulkAction(null);
          setBulkTarget('');
        }}
        title={bulkAction ? t(`employees.bulk.titles.${bulkAction}`) : ''}
        subtitle={t('employees.bulk.appliesTo', { count: selectedIDs.length })}
        preventClose={isMutating}
      >
        <div className="space-y-4 py-2">
          {bulkAction === 'assign_department' && (
            <div>
              <label htmlFor="bulk-dept" className="block text-xs font-medium text-slate-700 mb-1">
                {t('employees.bulk.chooseDepartment')}
              </label>
              <select id="bulk-dept" value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                <option value="">{t('employees.bulk.chooseDepartment')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lt(d.name_i18n ?? d.name)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {bulkAction === 'change_role' && (
            <div>
              <label htmlFor="bulk-role" className="block text-xs font-medium text-slate-700 mb-1">
                {t('employees.bulk.newRole')}
              </label>
              <select id="bulk-role" value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                <option value="">{t('employees.bulk.chooseRole')}</option>
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {bulkAction === 'deactivate' && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t('employees.bulk.deactivateWarning')}</span>
            </div>
          )}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkAction(null)} disabled={isMutating}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant={bulkAction === 'deactivate' ? 'danger' : 'primary'} onClick={handleBulk} isLoading={isMutating} disabled={bulkAction !== 'deactivate' && !bulkTarget}>
              {t('common.actions.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
