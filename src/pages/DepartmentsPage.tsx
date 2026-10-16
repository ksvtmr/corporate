import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Briefcase, Users, Archive, Search, Pencil } from 'lucide-react';
import {
  api,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  LocalizedText,
  LocalizedTextInput,
  Modal,
  Spinner,
  TranslationFallbackMark,
  useApiErrorMessage,
  useAuth,
  useI18n,
  useToast,
  ApiError,
  cleanLocalized,
  Locale,
  normalizeLocale,
} from '@iclever/frontend-kit';

interface Department {
  id: string;
  parent_id?: string;
  name: string;
  name_i18n?: LocalizedText;
  code?: string;
  description?: string;
  description_i18n?: LocalizedText;
  manager_name?: string;
  member_count: number;
}

interface Position {
  id: string;
  title: string;
  code?: string;
  level?: string;
  description?: string;
  description_i18n?: LocalizedText;
}

const LEVELS = ['Intern', 'Junior', 'Middle', 'Senior', 'Lead', 'Director'] as const;

export const DepartmentsPage: React.FC = () => {
  const { t, lt, compare, locale } = useI18n();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const { activeMember } = useAuth();
  const [activeTab, setActiveTab] = useState<'departments' | 'positions'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [orgLocale, setOrgLocale] = useState<Locale>(locale);

  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'members_desc' | 'name_asc'>('members_desc');

  const [deptModal, setDeptModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [deptName, setDeptName] = useState<LocalizedText>({});
  const [deptCode, setDeptCode] = useState('');
  const [deptParent, setDeptParent] = useState('');
  const [deptDesc, setDeptDesc] = useState<LocalizedText>({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Department | null>(null);

  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [posTitle, setPosTitle] = useState('');
  const [posCode, setPosCode] = useState('');
  const [posLevel, setPosLevel] = useState<string>('Junior');
  const [posDesc, setPosDesc] = useState<LocalizedText>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [deptRes, posRes, orgRes] = await Promise.all([
      api.get<Department[]>('/corporate/departments', { noCache: true }),
      api.get<Position[]>('/corporate/positions', { noCache: true }),
      api.get<{ default_locale: string }>('/corporate/organizations/current'),
    ]);
    setIsLoading(false);
    if (deptRes.success && deptRes.data && posRes.success && posRes.data) {
      setDepartments(deptRes.data);
      setPositions(posRes.data);
      setLoadError(null);
    } else {
      setLoadError(deptRes.error ?? posRes.error ?? null);
    }
    const org = normalizeLocale(orgRes.data?.default_locale);
    if (org) setOrgLocale(org);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, activeMember?.organization_id]);

  const nameOf = (d: Pick<Department, 'name' | 'name_i18n'>) => lt(d.name_i18n ?? d.name);

  const openCreate = () => {
    setDeptModal({ mode: 'create' });
    setDeptName({});
    setDeptCode('');
    setDeptParent('');
    setDeptDesc({});
    setFormError('');
  };

  const openEdit = (d: Department) => {
    setDeptModal({ mode: 'edit', id: d.id });
    setDeptName(d.name_i18n ?? { [orgLocale]: d.name });
    setDeptCode(d.code || '');
    setDeptParent(d.parent_id || '');
    setDeptDesc(d.description_i18n ?? (d.description ? { [orgLocale]: d.description } : {}));
    setFormError('');
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptModal || isSaving) return;
    const name_i18n = cleanLocalized(deptName);
    if (Object.keys(name_i18n).length === 0) {
      setFormError(t('departments.form.nameRequired'));
      return;
    }
    const description_i18n = cleanLocalized(deptDesc);
    const payload = {
      name: name_i18n[orgLocale] || Object.values(name_i18n)[0],
      name_i18n,
      parent_id: deptParent || null,
      description: description_i18n[orgLocale] || Object.values(description_i18n)[0] || undefined,
      ...(deptModal.mode === 'create' ? { code: deptCode.trim() || undefined } : {}),
    };
    setIsSaving(true);
    const res = deptModal.mode === 'create' ? await api.post<Department>('/corporate/departments', payload) : await api.put<Department>(`/corporate/departments/${deptModal.id}`, payload);
    setIsSaving(false);
    if (res.success && res.data) {
      toast.success(t(deptModal.mode === 'create' ? 'departments.toast.created' : 'departments.toast.updated', { name: nameOf(res.data) }));
      setDeptModal(null);
      void loadData();
    } else {
      setFormError(errorMessage(res.error));
    }
  };

  const handleCreatePos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const description_i18n = cleanLocalized(posDesc);
    const res = await api.post<Position>('/corporate/positions', {
      title: posTitle.trim(),
      code: posCode.trim() || undefined,
      level: posLevel,
      description: description_i18n[orgLocale] || Object.values(description_i18n)[0] || undefined,
    });
    setIsSaving(false);
    if (res.success) {
      setIsPosModalOpen(false);
      toast.success(t('departments.toast.positionCreated', { title: posTitle.trim() }));
      setPosTitle('');
      setPosCode('');
      setPosDesc({});
      void loadData();
    } else {
      setFormError(errorMessage(res.error));
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget || isSaving) return;
    setIsSaving(true);
    const res = await api.delete(`/corporate/departments/${archiveTarget.id}`);
    setIsSaving(false);
    const name = nameOf(archiveTarget);
    setArchiveTarget(null);
    if (res.success) {
      toast.success(t('departments.toast.archived', { name }));
      void loadData();
    } else {
      toast.error(errorMessage(res.error));
    }
  };

  const q = search.trim().toLowerCase();
  const filteredDepts = departments
    .filter((d) => !q || `${d.name} ${Object.values(d.name_i18n ?? {}).join(' ')} ${d.code ?? ''} ${d.manager_name ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => (sortOrder === 'name_asc' ? compare(nameOf(a), nameOf(b)) : b.member_count - a.member_count));
  const filteredPositions = positions.filter((p) => !q || `${p.title} ${p.code ?? ''}`.toLowerCase().includes(q));

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('departments.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('departments.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError('');
              setIsPosModalOpen(true);
            }}
          >
            <Briefcase className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('departments.actions.addPosition')}
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('departments.actions.addDepartment')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div role="tablist" className="flex space-x-2 w-full sm:w-auto">
          <button type="button" role="tab" aria-selected={activeTab === 'departments'} onClick={() => setActiveTab('departments')} className={tabClass(activeTab === 'departments')}>
            {t('departments.tabs.departments', { count: departments.length })}
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'positions'} onClick={() => setActiveTab('positions')} className={tabClass(activeTab === 'positions')}>
            {t('departments.tabs.positions', { count: positions.length })}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label={t('common.actions.search')}
              placeholder={activeTab === 'departments' ? t('departments.searchDepartments') : t('departments.searchPositions')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          {activeTab === 'departments' && (
            <select aria-label={t('common.filters.sortBy')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium">
              <option value="members_desc">{t('departments.sort.members')}</option>
              <option value="name_asc">{t('departments.sort.name')}</option>
            </select>
          )}
        </div>
      </div>

      {isLoading && departments.length === 0 ? (
        <Spinner className="py-12" />
      ) : loadError ? (
        <ErrorState message={errorMessage(loadError, 'errors.loadFailed')} onRetry={() => void loadData()} />
      ) : activeTab === 'departments' ? (
        filteredDepts.length === 0 ? (
          <EmptyState
            title={departments.length === 0 ? t('departments.emptyTitle') : t('common.states.emptyFiltered')}
            description={departments.length === 0 ? t('departments.emptyHint') : undefined}
            action={departments.length === 0 ? <Button size="sm" onClick={openCreate}>{t('departments.actions.addDepartment')}</Button> : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepts.map((dept) => {
              const parent = dept.parent_id ? departments.find((d) => d.id === dept.parent_id) : undefined;
              return (
                <Card key={dept.id} className="relative group hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <Building2 className="w-5 h-5" aria-hidden="true" />
                    </div>
                    {dept.code && <Badge variant="neutral">{dept.code}</Badge>}
                  </div>
                  <div className="mt-3">
                    <h3 className="font-semibold text-slate-900">
                      {nameOf(dept)}
                      <TranslationFallbackMark value={dept.name_i18n ?? dept.name} />
                    </h3>
                    {parent && <p className="text-[11px] text-slate-400">{t('departments.card.parent', { name: nameOf(parent) })}</p>}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('departments.card.manager')} <span className="font-medium text-slate-700">{dept.manager_name || t('departments.card.noManager')}</span>
                    </p>
                    {(dept.description_i18n || dept.description) && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{lt(dept.description_i18n ?? dept.description)}</p>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <button type="button" onClick={() => navigate(`/corporate/employees?department_id=${encodeURIComponent(dept.id)}`)} className="flex items-center text-indigo-600 hover:underline font-medium">
                      <Users className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      {t('common.units.employees', { count: dept.member_count })}
                    </button>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(dept)} title={t('common.actions.edit')} aria-label={t('departments.actions.editNamed', { name: nameOf(dept) })} className="text-slate-400 hover:text-indigo-600 p-1 transition">
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(dept)}
                        title={t('departments.actions.archive')}
                        aria-label={t('departments.actions.archiveNamed', { name: nameOf(dept) })}
                        className="text-slate-400 hover:text-red-600 p-1 transition"
                      >
                        <Archive className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : filteredPositions.length === 0 ? (
        <EmptyState title={positions.length === 0 ? t('departments.emptyPositions') : t('common.states.emptyFiltered')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPositions.map((pos) => (
            <Card key={pos.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium text-slate-900">{pos.title}</h4>
                {pos.level && <Badge variant="brand">{t(`departments.levels.${pos.level}`)}</Badge>}
              </div>
              {pos.code && <p className="text-xs font-mono text-slate-400 mt-1">{t('departments.position.code', { code: pos.code })}</p>}
              {(pos.description_i18n || pos.description) && <p className="text-xs text-slate-500 mt-2">{lt(pos.description_i18n ?? pos.description)}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!deptModal}
        onClose={() => setDeptModal(null)}
        title={deptModal?.mode === 'edit' ? t('departments.form.editTitle') : t('departments.form.createTitle')}
        subtitle={t('departments.form.subtitle')}
        preventClose={isSaving}
      >
        <form onSubmit={handleSaveDept} className="space-y-4 py-2">
          {formError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {formError}
            </div>
          )}
          <LocalizedTextInput label={t('departments.form.name')} value={deptName} onChange={setDeptName} requiredLocale={orgLocale} placeholder={t('departments.form.namePlaceholder')} maxLength={120} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('departments.form.code')}
              placeholder="ENG"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              maxLength={16}
              disabled={deptModal?.mode === 'edit'}
              helperText={deptModal?.mode === 'edit' ? t('departments.form.codeLocked') : undefined}
            />
            <div>
              <label htmlFor="dept-parent" className="block text-xs font-medium text-slate-700 mb-1">
                {t('departments.form.parent')}
              </label>
              <select id="dept-parent" value={deptParent} onChange={(e) => setDeptParent(e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                <option value="">{t('departments.form.noParent')}</option>
                {departments
                  .filter((d) => d.id !== deptModal?.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {nameOf(d)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <LocalizedTextInput label={t('departments.form.description')} value={deptDesc} onChange={setDeptDesc} multiline maxLength={1000} placeholder={t('departments.form.descriptionPlaceholder')} />
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setDeptModal(null)} disabled={isSaving}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {deptModal?.mode === 'edit' ? t('common.actions.saveChanges') : t('departments.form.create')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title={t('departments.archive.title')}
        message={archiveTarget ? t('departments.archive.message', { name: nameOf(archiveTarget), count: archiveTarget.member_count }) : ''}
        confirmLabel={t('departments.actions.archive')}
        isLoading={isSaving}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <Modal isOpen={isPosModalOpen} onClose={() => setIsPosModalOpen(false)} title={t('departments.position.createTitle')} subtitle={t('departments.position.subtitle')} preventClose={isSaving}>
        <form onSubmit={handleCreatePos} className="space-y-4 py-2">
          {formError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {formError}
            </div>
          )}
          <Input label={t('departments.position.title')} placeholder="Senior Frontend Developer" value={posTitle} onChange={(e) => setPosTitle(e.target.value)} maxLength={120} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={t('departments.position.codeLabel')} placeholder="DEV-SR-FE" value={posCode} onChange={(e) => setPosCode(e.target.value.toUpperCase())} maxLength={24} />
            <div>
              <label htmlFor="pos-level" className="block text-xs font-medium text-slate-700 mb-1">
                {t('departments.position.level')}
              </label>
              <select id="pos-level" value={posLevel} onChange={(e) => setPosLevel(e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {t(`departments.levels.${l}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <LocalizedTextInput label={t('departments.position.description')} value={posDesc} onChange={setPosDesc} multiline maxLength={1000} placeholder={t('departments.position.descriptionPlaceholder')} />
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsPosModalOpen(false)} disabled={isSaving}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {t('departments.position.create')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
