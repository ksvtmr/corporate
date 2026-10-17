import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Search, CheckCircle2, BookOpen, HelpCircle, Award, FileText, Video, CheckSquare, Users, Archive } from 'lucide-react';
import {
  api,
  Badge,
  Button,
  cleanLocalized,
  ConfirmDialog,
  DemoDataBadge,
  EmptyState,
  ErrorState,
  Input,
  LocalizedText,
  LocalizedTextInput,
  Modal,
  TranslationFallbackMark,
  useApiErrorMessage,
  useAuth,
  useI18n,
  useToast,
  ApiError,
} from '@iclever/frontend-kit';
import { BlockType, DemoTrack, TrackStatus, TrackType, TransitionRule } from '../demo/fixtures';
import { fullName, useDepartments, useTracksState } from '../demo/useDemoData';

const TYPES: TrackType[] = ['onboarding', 'compliance', 'role_training', 'safety', 'custom'];
const STATUSES: TrackStatus[] = ['draft', 'in_review', 'published', 'archived'];
const BLOCK_TYPES: BlockType[] = ['material', 'video', 'test', 'open_question', 'flashcards', 'acknowledgment'];
const RULES: TransitionRule[] = ['sequential', 'free', 'must_complete_previous', 'min_score_70'];
const STATUS_VARIANT: Record<TrackStatus, 'success' | 'info' | 'warning' | 'neutral'> = { published: 'success', draft: 'info', in_review: 'warning', archived: 'neutral' };

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  material: <FileText className="w-4 h-4 text-blue-600" aria-hidden="true" />,
  video: <Video className="w-4 h-4 text-purple-600" aria-hidden="true" />,
  test: <Award className="w-4 h-4 text-amber-600" aria-hidden="true" />,
  open_question: <HelpCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" />,
  flashcards: <BookOpen className="w-4 h-4 text-indigo-600" aria-hidden="true" />,
  acknowledgment: <CheckSquare className="w-4 h-4 text-slate-600" aria-hidden="true" />,
};

interface GeneratedTrack {
  locale: string;
  title: string;
  description: string;
  department_id: string | null;
  total_duration_hours: number;
  blocks: Array<{ type: BlockType; title: string; duration_minutes: number; transition_rule: TransitionRule }>;
}

/** The AI draft is only accepted if it matches the expected structure exactly. */
function parseGenerated(value: unknown): GeneratedTrack | null {
  const v = value as GeneratedTrack;
  if (!v || typeof v.title !== 'string' || !v.title.trim() || typeof v.description !== 'string' || !Array.isArray(v.blocks) || v.blocks.length === 0 || v.blocks.length > 30) return null;
  const valid = v.blocks.every((b) => b && BLOCK_TYPES.includes(b.type) && RULES.includes(b.transition_rule) && typeof b.title === 'string' && b.title.trim() && Number.isFinite(b.duration_minutes) && b.duration_minutes > 0);
  return valid ? v : null;
}

export const TracksPage: React.FC = () => {
  const { t, lt, locale, formatNumber, formatPercent, compare } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const [tracks, setTracks] = useTracksState();
  const departments = useDepartments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DemoTrack | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'enrolled_desc' | 'duration_desc' | 'title_asc'>('enrolled_desc');

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiRole, setAiRole] = useState('');
  const [aiDepartment, setAiDepartment] = useState('');
  const [aiWeeks, setAiWeeks] = useState('2');
  const [aiGoals, setAiGoals] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<ApiError | null>(null);

  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState<LocalizedText>({});
  const [manualDept, setManualDept] = useState('');
  const [manualType, setManualType] = useState<TrackType>('onboarding');
  const [manualDesc, setManualDesc] = useState<LocalizedText>({});
  const [manualHours, setManualHours] = useState('8');
  const [manualScore, setManualScore] = useState('80');
  const [manualError, setManualError] = useState('');

  const selected = tracks.find((x) => x.id === selectedId) ?? null;
  const deptName = (id: string | null) => {
    if (!id) return t('tracks.allDepartments');
    const d = departments.find((x) => x.id === id);
    return d ? lt(d.name_i18n ?? d.name) : '—';
  };

  const updateTrack = (id: string, patch: Partial<DemoTrack>) => setTracks((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRole.trim() || isGenerating) return;
    setIsGenerating(true);
    setAiError(null);
    const res = await api.post<GeneratedTrack>(
      '/ai/tracks/generate',
      { role: aiRole.trim(), department_id: aiDepartment || undefined, duration_weeks: Number(aiWeeks) || 2, goals: aiGoals.trim(), locale },
      { timeoutMs: 60_000 },
    );
    setIsGenerating(false);
    const draft = res.success ? parseGenerated(res.data) : null;
    if (!draft) {
      setAiError(res.success ? { code: 'AI_INVALID', message: '' } : res.error ?? null);
      return;
    }
    const loc = draft.locale in { ru: 1, kk: 1, en: 1 } ? draft.locale : locale;
    const stamp = Date.now().toString(36);
    const track: DemoTrack = {
      id: `trk-ai-${stamp}`,
      title: { [loc]: draft.title },
      description: { [loc]: draft.description },
      type: 'onboarding',
      status: 'draft',
      department_id: aiDepartment || null,
      total_duration_hours: draft.total_duration_hours,
      passing_score_percent: 80,
      enrolled_count: 0,
      completion_rate: 0,
      blocks: draft.blocks.map((b, i) => ({ id: `g-${stamp}-${i}`, type: b.type, title: { [loc]: b.title }, duration_minutes: b.duration_minutes, transition_rule: b.transition_rule })),
      created_by: fullName(user ?? undefined),
      ai_generated: true,
    };
    setTracks((prev) => [track, ...prev]);
    setIsAiOpen(false);
    setSelectedId(track.id);
    toast.success(t('tracks.toast.generated'));
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    const title = cleanLocalized(manualTitle);
    if (Object.keys(title).length === 0) return setManualError(t('tracks.form.errors.title'));
    const hours = Number(manualHours);
    const score = Number(manualScore);
    if (!Number.isInteger(hours) || hours < 1 || hours > 200) return setManualError(t('tracks.form.errors.hours'));
    if (!Number.isInteger(score) || score < 50 || score > 100) return setManualError(t('tracks.form.errors.score'));
    const stamp = Date.now().toString(36);
    const track: DemoTrack = {
      id: `trk-${stamp}`,
      title,
      description: cleanLocalized(manualDesc),
      type: manualType,
      status: 'draft',
      department_id: manualDept || null,
      total_duration_hours: hours,
      passing_score_percent: score,
      enrolled_count: 0,
      completion_rate: 0,
      blocks: [
        { id: `b-${stamp}-1`, type: 'material', title: { [locale]: t('tracks.starterBlocks.material') }, duration_minutes: 45, transition_rule: 'sequential' },
        { id: `b-${stamp}-2`, type: 'test', title: { [locale]: t('tracks.starterBlocks.test') }, duration_minutes: 30, transition_rule: 'min_score_70' },
      ],
      created_by: fullName(user ?? undefined),
    };
    setTracks((prev) => [track, ...prev]);
    setIsManualOpen(false);
    setManualTitle({});
    setManualDesc({});
    setSelectedId(track.id);
    toast.success(t('tracks.toast.created'));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracks
      .filter((x) => {
        const text = `${typeof x.title === 'string' ? x.title : Object.values(x.title).join(' ')} ${deptName(x.department_id)}`.toLowerCase();
        return (!q || text.includes(q)) && (statusFilter === 'all' || x.status === statusFilter) && (typeFilter === 'all' || x.type === typeFilter);
      })
      .sort((a, b) => {
        if (sortOrder === 'title_asc') return compare(lt(a.title), lt(b.title));
        if (sortOrder === 'duration_desc') return b.total_duration_hours - a.total_duration_hours;
        return b.enrolled_count - a.enrolled_count;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, search, statusFilter, typeFilter, sortOrder, departments, lt, compare]);

  const selectClass = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700';
  const fieldClass = 'w-full rounded-lg border border-slate-300 p-2 text-xs bg-white';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {t('tracks.title')} <DemoDataBadge />
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('tracks.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setAiError(null); setIsAiOpen(true); }}>
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" aria-hidden="true" />
            {t('tracks.actions.generate')}
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setManualError(''); setIsManualOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('tracks.actions.create')}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">{t('common.demoData.localNotice')}</p>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('common.actions.search')}
            placeholder={t('tracks.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select aria-label={t('common.filters.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('common.filters.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`tracks.status.${s}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.type')} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('common.filters.allTypes')}</option>
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`tracks.types.${x}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.sortBy')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className={`${selectClass} font-medium`}>
            <option value="enrolled_desc">{t('tracks.sort.enrolled')}</option>
            <option value="duration_desc">{t('tracks.sort.duration')}</option>
            <option value="title_asc">{t('tracks.sort.title')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={tracks.length === 0 ? t('tracks.empty') : t('common.states.emptyFiltered')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((trk) => (
            <button
              key={trk.id}
              type="button"
              onClick={() => setSelectedId(trk.id)}
              className="text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{t(`tracks.types.${trk.type}`)}</span>
                  <Badge variant={STATUS_VARIANT[trk.status]}>{t(`tracks.status.${trk.status}`)}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1.5">
                  {lt(trk.title)}
                  <TranslationFallbackMark value={trk.title} />
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{lt(trk.description)}</p>
              </div>
              <dl className="space-y-2 pt-3 border-t border-slate-100 w-full text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">{t('tracks.card.blocks')}</dt>
                  <dd className="font-semibold text-slate-700">
                    {t('common.units.blocks', { count: trk.blocks.length })} • {t('common.units.hoursShort', { count: trk.total_duration_hours })}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">{t('tracks.card.learners')}</dt>
                  <dd className="font-semibold text-slate-700">
                    {formatNumber(trk.enrolled_count)} ({formatPercent(trk.completion_rate, 1)})
                  </dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Modal isOpen onClose={() => setSelectedId(null)} title={t('tracks.detail.title', { title: lt(selected.title) })} size="lg">
          <div className="space-y-5 text-xs text-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  {deptName(selected.department_id)} • {t('tracks.detail.passing', { score: formatPercent(selected.passing_score_percent) })}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{lt(selected.title)}</h2>
                <p className="text-slate-500 mt-1">{lt(selected.description)}</p>
                {selected.ai_generated && <p className="text-[11px] text-indigo-700 mt-1">{t('tracks.detail.aiDraft')}</p>}
              </div>
              <Badge variant={STATUS_VARIANT[selected.status]}>{t(`tracks.status.${selected.status}`)}</Badge>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">{t('tracks.detail.sequence', { count: selected.blocks.length })}</h3>
              <ol className="space-y-2">
                {selected.blocks.map((blk, idx) => (
                  <li key={blk.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200">{BLOCK_ICONS[blk.type]}</div>
                      <div>
                        <div className="font-medium text-slate-900">{lt(blk.title)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t('common.units.minutesShort', { count: blk.duration_minutes })} • {t(`tracks.rules.${blk.transition_rule}`)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="info">{t(`tracks.blockTypes.${blk.type}`)}</Badge>
                  </li>
                ))}
              </ol>
            </div>
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">{selected.status === 'published' ? t('tracks.detail.publishedHint') : t('tracks.detail.draftHint')}</span>
              <div className="flex flex-wrap items-center gap-2">
                {selected.status === 'published' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const id = selected.id;
                      setSelectedId(null);
                      navigate(`/corporate/assignments?track=${encodeURIComponent(id)}`);
                    }}
                  >
                    <Users className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    {t('tracks.actions.assign')}
                  </Button>
                )}
                {selected.status !== 'archived' && (
                  <Button variant="ghost" onClick={() => setArchiveTarget(selected)}>
                    <Archive className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    {t('tracks.actions.archive')}
                  </Button>
                )}
                {(selected.status === 'draft' || selected.status === 'in_review' || selected.status === 'archived') && (
                  <Button
                    variant="primary"
                    disabled={selected.blocks.length === 0}
                    onClick={() => {
                      updateTrack(selected.id, { status: 'published' });
                      toast.success(t('tracks.toast.published', { title: lt(selected.title) }));
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    {t('tracks.actions.publish')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!archiveTarget}
        title={t('tracks.archive.title')}
        message={archiveTarget ? t('tracks.archive.message', { title: lt(archiveTarget.title) }) : ''}
        confirmLabel={t('tracks.actions.archive')}
        onConfirm={() => {
          if (archiveTarget) {
            updateTrack(archiveTarget.id, { status: 'archived' });
            toast.success(t('tracks.toast.archived'));
          }
          setArchiveTarget(null);
        }}
        onCancel={() => setArchiveTarget(null)}
      />

      <Modal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} title={t('tracks.form.title')} subtitle={t('tracks.form.subtitle')} size="md">
        <form onSubmit={handleManualCreate} className="space-y-4 py-2 text-xs">
          {manualError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {manualError}
            </div>
          )}
          <LocalizedTextInput label={t('tracks.form.name')} value={manualTitle} onChange={setManualTitle} requiredLocale={locale} placeholder={t('tracks.form.namePlaceholder')} maxLength={200} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="trk-dept" className="block text-slate-700 font-medium mb-1">
                {t('tracks.form.department')}
              </label>
              <select id="trk-dept" value={manualDept} onChange={(e) => setManualDept(e.target.value)} className={fieldClass}>
                <option value="">{t('tracks.allDepartments')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lt(d.name_i18n ?? d.name)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trk-type" className="block text-slate-700 font-medium mb-1">
                {t('tracks.form.type')}
              </label>
              <select id="trk-type" value={manualType} onChange={(e) => setManualType(e.target.value as TrackType)} className={fieldClass}>
                {TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`tracks.types.${x}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <LocalizedTextInput label={t('tracks.form.description')} value={manualDesc} onChange={setManualDesc} multiline maxLength={1000} placeholder={t('tracks.form.descriptionPlaceholder')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('tracks.form.hours')} type="number" min={1} max={200} step={1} value={manualHours} onChange={(e) => setManualHours(e.target.value)} required />
            <Input label={t('tracks.form.passing')} type="number" min={50} max={100} step={1} value={manualScore} onChange={(e) => setManualScore(e.target.value)} required />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsManualOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('tracks.form.submit')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} title={t('tracks.ai.title')} subtitle={t('tracks.ai.subtitle')} size="md" preventClose={isGenerating}>
        <form onSubmit={handleGenerate} className="space-y-4 text-xs py-2">
          <Input label={t('tracks.ai.role')} value={aiRole} onChange={(e) => setAiRole(e.target.value)} placeholder={t('tracks.ai.rolePlaceholder')} maxLength={120} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ai-dept" className="block text-xs font-medium text-slate-700 mb-1">
                {t('tracks.form.department')}
              </label>
              <select id="ai-dept" value={aiDepartment} onChange={(e) => setAiDepartment(e.target.value)} className={fieldClass}>
                <option value="">{t('tracks.allDepartments')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lt(d.name_i18n ?? d.name)}
                  </option>
                ))}
              </select>
            </div>
            <Input label={t('tracks.ai.weeks')} type="number" min={1} max={12} step={1} value={aiWeeks} onChange={(e) => setAiWeeks(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ai-goals" className="block text-xs font-medium text-slate-700 mb-1">
              {t('tracks.ai.goals')}
            </label>
            <textarea id="ai-goals" rows={3} maxLength={1000} value={aiGoals} onChange={(e) => setAiGoals(e.target.value)} placeholder={t('tracks.ai.goalsPlaceholder')} className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-[11px] text-slate-400 mt-1">{t('tracks.ai.goalsHint')}</p>
          </div>
          {isGenerating && (
            <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center space-x-3 text-indigo-900" role="status">
              <span className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true" />
              <span>{t('tracks.ai.generating')}</span>
            </div>
          )}
          {aiError && <ErrorState message={aiError.code === 'AI_INVALID' ? t('errors.aiInvalidResponse') : errorMessage(aiError)} />}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" disabled={isGenerating} onClick={() => setIsAiOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit" disabled={isGenerating || !aiRole.trim()} isLoading={isGenerating}>
              <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('tracks.ai.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
