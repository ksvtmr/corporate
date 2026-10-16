import React, { useEffect, useMemo, useState } from 'react';
import { Upload, Search, CheckCircle2, Clock, AlertCircle, Sparkles, ChevronRight, Shield, Tag, BookOpen, Trash2, Download } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DemoDataBadge, EmptyState, FileUploader, Input, Modal, saveBlob, TranslationFallbackMark, useAuth, useI18n, useToast } from '@iclever/frontend-kit';
import { AccessLevel, Confidentiality, DemoMaterial, MaterialCategory, MaterialFormat, MaterialStatus, todayIso } from '../demo/fixtures';
import { fullName, useMaterialsState } from '../demo/useDemoData';

const CATEGORIES: MaterialCategory[] = ['development', 'compliance', 'sales', 'training', 'people'];
const STATUSES: MaterialStatus[] = ['uploaded', 'queued', 'processing', 'ready_for_review', 'published', 'failed'];
const ACCESS: AccessLevel[] = ['public_within_organization', 'restricted_by_department', 'restricted_by_role', 'admins_only'];
const CONFIDENTIALITY: Confidentiality[] = ['internal', 'confidential', 'strictly_confidential'];
const STATUS_VARIANT: Record<MaterialStatus, 'success' | 'warning' | 'info' | 'danger'> = {
  uploaded: 'info',
  queued: 'warning',
  processing: 'warning',
  ready_for_review: 'info',
  published: 'success',
  failed: 'danger',
};
const EXT_FORMAT: Record<string, MaterialFormat> = { pdf: 'pdf', docx: 'docx', pptx: 'pptx', md: 'markdown', txt: 'txt', mp4: 'video' };

export const MaterialsPage: React.FC = () => {
  const { t, lt, locale, formatDate, formatFileSize, compare } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const [materials, setMaterials] = useMaterialsState();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'title_asc' | 'size_desc'>('date_desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topicToRemove, setTopicToRemove] = useState<string | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<MaterialCategory>('development');
  const [uploadConfidentiality, setUploadConfidentiality] = useState<Confidentiality>('internal');
  const [uploadAccess, setUploadAccess] = useState<AccessLevel>('public_within_organization');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const selected = materials.find((m) => m.id === selectedId) ?? null;

  // Simulated processing pipeline; the timer is cleared if the page unmounts.
  useEffect(() => {
    if (uploadProgress === null) return;
    if (uploadProgress >= 100) {
      const ext = (uploadedFile?.name.split('.').pop() || '').toLowerCase();
      const item: DemoMaterial = {
        id: `mat-${Date.now().toString(36)}`,
        title: { [locale]: uploadTitle.trim() },
        category: uploadCategory,
        format: EXT_FORMAT[ext] ?? 'pdf',
        status: 'ready_for_review',
        confidentiality: uploadConfidentiality,
        access_level: uploadAccess,
        version: 1,
        uploaded_by: fullName(user ?? undefined),
        uploaded_at: todayIso(),
        file_size_mb: uploadedFile ? Math.max(0.1, +(uploadedFile.size / (1024 * 1024)).toFixed(1)) : 0,
        ai_summary: { [locale]: t('materials.generated.summary') },
        topics: (['intro', 'process', 'checklists'] as const).map((k, i) => ({
          id: `top-${Date.now().toString(36)}-${i}`,
          name: { [locale]: t(`materials.generated.topics.${k}`) },
          priority: i < 2 ? 'high' : 'medium',
          is_required: i < 2,
        })),
      };
      setMaterials((prev) => [item, ...prev]);
      setUploadProgress(null);
      setIsUploadOpen(false);
      setSelectedId(item.id);
      setUploadTitle('');
      setUploadedFile(null);
      toast.success(t('materials.toast.uploaded'));
      return;
    }
    const timer = setTimeout(() => setUploadProgress((p) => (p === null ? null : p + 20)), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadProgress]);

  const updateMaterial = (id: string, patch: (m: DemoMaterial) => DemoMaterial) => setMaterials((prev) => prev.map((m) => (m.id === id ? patch(m) : m)));

  const handlePublish = (m: DemoMaterial) => {
    updateMaterial(m.id, (x) => ({ ...x, status: 'published' }));
    toast.success(t('materials.toast.published', { title: lt(m.title) }));
  };

  const handleDownload = (m: DemoMaterial) => {
    const lines = [
      `# ${lt(m.title)}`,
      '',
      `- ${t('materials.fields.category')}: ${t(`materials.categories.${m.category}`)}`,
      `- ${t('materials.fields.confidentiality')}: ${t(`materials.confidentiality.${m.confidentiality}`)}`,
      `- ${t('materials.fields.version')}: v${m.version}`,
      `- ${t('materials.fields.uploadedBy')}: ${m.uploaded_by} (${formatDate(m.uploaded_at)})`,
      '',
      `## ${t('materials.detail.summary')}`,
      lt(m.ai_summary) || '—',
      '',
      `## ${t('materials.detail.topics', { count: m.topics.length })}`,
      ...m.topics.map((tp, i) => `${i + 1}. ${lt(tp.name)} — ${t(`materials.priority.${tp.priority}`)}, ${tp.is_required ? t('materials.required') : t('materials.optional')}`),
      '',
    ];
    const name = `${lt(m.title).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60) || m.id}.md`;
    saveBlob(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }), name);
    toast.success(t('materials.toast.downloaded', { file: name }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials
      .filter((m) => {
        const text = `${typeof m.title === 'string' ? m.title : Object.values(m.title).join(' ')} ${t(`materials.categories.${m.category}`)}`.toLowerCase();
        return (!q || text.includes(q)) && (statusFilter === 'all' || m.status === statusFilter) && (categoryFilter === 'all' || m.category === categoryFilter);
      })
      .sort((a, b) => {
        if (sortOrder === 'title_asc') return compare(lt(a.title), lt(b.title));
        if (sortOrder === 'size_desc') return b.file_size_mb - a.file_size_mb;
        return b.uploaded_at.localeCompare(a.uploaded_at);
      });
  }, [materials, search, statusFilter, categoryFilter, sortOrder, t, lt, compare]);

  const stat = (status: MaterialStatus) => materials.filter((m) => m.status === status).length;
  const selectClass = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {t('materials.title')} <DemoDataBadge />
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('materials.subtitle')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-1.5" aria-hidden="true" />
          {t('materials.actions.upload')}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">{t('common.demoData.localNotice')}</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t('materials.kpi.total'), value: materials.length, icon: BookOpen, tone: 'bg-indigo-50 text-indigo-600' },
          { label: t('materials.kpi.published'), value: stat('published'), icon: CheckCircle2, tone: 'bg-green-50 text-green-600' },
          { label: t('materials.kpi.review'), value: stat('ready_for_review'), icon: Clock, tone: 'bg-blue-50 text-blue-600' },
          { label: t('materials.kpi.processing'), value: stat('processing') + stat('queued'), icon: Sparkles, tone: 'bg-purple-50 text-purple-600' },
          { label: t('materials.kpi.failed'), value: stat('failed'), icon: AlertCircle, tone: 'bg-red-50 text-red-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${k.tone}`}>
              <k.icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{k.value}</div>
              <div className="text-[11px] text-slate-500">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('common.actions.search')}
            placeholder={t('materials.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select aria-label={t('materials.fields.category')} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('materials.allCategories')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`materials.categories.${c}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('common.filters.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`materials.status.${s}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.sortBy')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className={`${selectClass} font-medium text-slate-700`}>
            <option value="date_desc">{t('materials.sort.newest')}</option>
            <option value="title_asc">{t('materials.sort.title')}</option>
            <option value="size_desc">{t('materials.sort.size')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={materials.length === 0 ? t('materials.empty') : t('common.states.emptyFiltered')}
          action={materials.length === 0 ? <Button size="sm" onClick={() => setIsUploadOpen(true)}>{t('materials.actions.upload')}</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mat) => (
            <button
              key={mat.id}
              type="button"
              onClick={() => setSelectedId(mat.id)}
              className="text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">{t(`materials.categories.${mat.category}`)}</span>
                  <Badge variant={STATUS_VARIANT[mat.status]}>{t(`materials.status.${mat.status}`)}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2">
                  {lt(mat.title)}
                  <TranslationFallbackMark value={mat.title} />
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{mat.status === 'processing' ? t('materials.processingSummary') : lt(mat.ai_summary)}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 w-full">
                <span>
                  <span className="font-medium text-slate-600">{mat.format.toUpperCase()}</span> • {formatFileSize(mat.file_size_mb)} • v{mat.version}
                </span>
                <span className="text-indigo-600 font-medium flex items-center">
                  {t('common.actions.details')} <ChevronRight className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Modal isOpen onClose={() => setSelectedId(null)} title={t('materials.detail.title')} size="lg">
          <div className="space-y-5 text-xs text-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                  {t(`materials.categories.${selected.category}`)} • v{selected.version} • {t(`materials.confidentiality.${selected.confidentiality}`)}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{lt(selected.title)}</h2>
                <p className="text-slate-500 mt-1">{t('materials.detail.meta', { author: selected.uploaded_by, date: formatDate(selected.uploaded_at), size: formatFileSize(selected.file_size_mb) })}</p>
              </div>
              <Badge variant={STATUS_VARIANT[selected.status]}>{t(`materials.status.${selected.status}`)}</Badge>
            </div>

            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
              <div className="flex items-center text-indigo-900 font-semibold">
                <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" aria-hidden="true" />
                {t('materials.detail.summary')}
                <TranslationFallbackMark value={selected.ai_summary} />
              </div>
              <p className="text-slate-700 leading-relaxed">{selected.status === 'processing' ? t('materials.processingSummary') : lt(selected.ai_summary) || '—'}</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 flex items-center mb-2">
                <Tag className="w-4 h-4 mr-1 text-slate-500" aria-hidden="true" />
                {t('materials.detail.topics', { count: selected.topics.length })}
              </h3>
              {selected.topics.length === 0 ? (
                <p className="text-slate-400">{t('materials.detail.noTopics')}</p>
              ) : (
                <ul className="space-y-2">
                  {selected.topics.map((tp, idx) => (
                    <li key={tp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                        <span className="font-medium text-slate-800">{lt(tp.name)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{t('materials.priorityLabel', { priority: t(`materials.priority.${tp.priority}`) })}</span>
                        <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tp.is_required}
                            onChange={(e) => updateMaterial(selected.id, (m) => ({ ...m, topics: m.topics.map((x) => (x.id === tp.id ? { ...x, is_required: e.target.checked } : x)) }))}
                          />
                          {t('materials.required')}
                        </label>
                        <button type="button" onClick={() => setTopicToRemove(tp.id)} className="text-slate-400 hover:text-red-600 p-1" aria-label={t('materials.detail.removeTopic', { name: lt(tp.name) })}>
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-slate-500">
                <Shield className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>{t('materials.fields.access')}</span>
                <select
                  value={selected.access_level}
                  onChange={(e) => updateMaterial(selected.id, (m) => ({ ...m, access_level: e.target.value as AccessLevel }))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  {ACCESS.map((a) => (
                    <option key={a} value={a}>
                      {t(`materials.access.${a}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => handleDownload(selected)} disabled={selected.status === 'processing'}>
                  <Download className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  {t('materials.actions.downloadSummary')}
                </Button>
                {selected.status === 'ready_for_review' && (
                  <Button variant="primary" onClick={() => handlePublish(selected)}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    {t('materials.actions.publish')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!topicToRemove}
        title={t('materials.removeTopic.title')}
        message={t('materials.removeTopic.message')}
        confirmLabel={t('common.actions.remove')}
        onConfirm={() => {
          if (selected && topicToRemove) updateMaterial(selected.id, (m) => ({ ...m, topics: m.topics.filter((x) => x.id !== topicToRemove) }));
          setTopicToRemove(null);
        }}
        onCancel={() => setTopicToRemove(null)}
      />

      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title={t('materials.upload.title')} size="md" preventClose={uploadProgress !== null}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (uploadTitle.trim() && uploadedFile && uploadProgress === null) setUploadProgress(0);
          }}
          className="space-y-4 text-xs py-2"
        >
          <FileUploader
            onFileSelected={(file) => {
              setUploadedFile(file);
              if (file && !uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
            }}
            isProcessing={uploadProgress !== null}
          />
          <Input label={t('materials.upload.name')} value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder={t('materials.upload.namePlaceholder')} maxLength={200} required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="up-cat" className="block text-xs font-medium text-slate-700 mb-1">
                {t('materials.fields.category')}
              </label>
              <select id="up-cat" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as MaterialCategory)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`materials.categories.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="up-conf" className="block text-xs font-medium text-slate-700 mb-1">
                {t('materials.fields.confidentiality')}
              </label>
              <select id="up-conf" value={uploadConfidentiality} onChange={(e) => setUploadConfidentiality(e.target.value as Confidentiality)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white">
                {CONFIDENTIALITY.map((c) => (
                  <option key={c} value={c}>
                    {t(`materials.confidentiality.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="up-access" className="block text-xs font-medium text-slate-700 mb-1">
                {t('materials.fields.access')}
              </label>
              <select id="up-access" value={uploadAccess} onChange={(e) => setUploadAccess(e.target.value as AccessLevel)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white">
                {ACCESS.map((a) => (
                  <option key={a} value={a}>
                    {t(`materials.access.${a}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {uploadProgress !== null && (
            <div className="space-y-1.5 p-3 bg-indigo-50 rounded-xl border border-indigo-100" role="status">
              <div className="flex justify-between text-indigo-900 font-semibold text-[11px]">
                <span>{t('materials.upload.processing')}</span>
                <span>{Math.min(uploadProgress, 100)}%</span>
              </div>
              <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${Math.min(uploadProgress, 100)}%` }} />
              </div>
            </div>
          )}
          {!uploadedFile && <p className="text-[11px] text-slate-500">{t('materials.upload.fileRequired')}</p>}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" disabled={uploadProgress !== null} onClick={() => setIsUploadOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit" disabled={uploadProgress !== null || !uploadTitle.trim() || !uploadedFile} isLoading={uploadProgress !== null}>
              {t('materials.upload.start')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
