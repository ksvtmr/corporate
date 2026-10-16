import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Layers, Check, X, Search } from 'lucide-react';
import { api, Badge, Button, ConfirmDialog, EmptyState, ErrorState, LocalizedText, Modal, Spinner, useApiErrorMessage, useI18n, useToast, ApiError } from '@iclever/frontend-kit';

interface Review {
  id: string;
  student_name: string;
  question_text: LocalizedText;
  student_answer: string;
  ai_score: number;
  max_score: number;
  ai_confidence: number;
  ai_justification: LocalizedText;
  matched_criteria: LocalizedText[];
  missed_criteria: LocalizedText[];
  cluster_tag: LocalizedText;
  status: 'pending' | 'approved' | 'overridden';
  reviewer_comment?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

const STATUS_VARIANT = { pending: 'info', approved: 'success', overridden: 'warning' } as const;

export const ReviewsPage: React.FC = () => {
  const { t, lt, formatDate, formatPercent } = useI18n();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [isClustered, setIsClustered] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sortOrder, setSortOrder] = useState<'confidence_desc' | 'score_asc' | 'score_desc' | 'newest'>('newest');
  const [selected, setSelected] = useState<Review | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideComment, setOverrideComment] = useState('');
  const [formError, setFormError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<Review[]>('/assessment/reviews', { noCache: true });
    if (res.success && res.data) {
      setReviews(res.data);
      setLoadError(null);
    } else setLoadError(res.error ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (updated: Review) => setReviews((prev) => (prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev));

  const approve = async (r: Review) => {
    setBusyId(r.id);
    const res = await api.post<Review>(`/assessment/reviews/${r.id}/approve`);
    setBusyId(null);
    if (res.success && res.data) {
      replace(res.data);
      toast.success(t('reviews.toast.approved', { name: r.student_name }));
    } else {
      toast.error(errorMessage(res.error));
      void load();
    }
  };

  const approveAll = async () => {
    setBusyId('all');
    const res = await api.post<{ affected_rows: number }>('/assessment/reviews/approve-all');
    setBusyId(null);
    setConfirmAll(false);
    if (res.success) {
      toast.success(t('reviews.toast.approvedAll', { count: res.data?.affected_rows ?? 0 }));
      void load();
    } else toast.error(errorMessage(res.error));
  };

  const submitOverride = async () => {
    if (!selected) return;
    const score = Number(overrideScore);
    if (overrideScore === '' || !Number.isInteger(score) || score < 0 || score > selected.max_score) {
      return setFormError(t('reviews.override.scoreError', { max: selected.max_score }));
    }
    if (overrideComment.trim().length < 3) return setFormError(t('reviews.override.commentError'));
    setBusyId(selected.id);
    const res = await api.post<Review>(`/assessment/reviews/${selected.id}/override`, { score, comment: overrideComment.trim() });
    setBusyId(null);
    if (res.success && res.data) {
      replace(res.data);
      toast.success(t('reviews.toast.overridden', { score, max: selected.max_score }));
      setSelected(null);
    } else setFormError(errorMessage(res.error));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (reviews ?? [])
      .filter((r) => (!q || `${r.student_name} ${Object.values(r.question_text).join(' ')}`.toLowerCase().includes(q)) && (statusFilter === 'all' || r.status === statusFilter))
      .sort((a, b) => {
        if (sortOrder === 'confidence_desc') return b.ai_confidence - a.ai_confidence;
        if (sortOrder === 'score_asc') return a.ai_score / a.max_score - b.ai_score / b.max_score;
        if (sortOrder === 'score_desc') return b.ai_score / b.max_score - a.ai_score / a.max_score;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [reviews, search, statusFilter, sortOrder]);

  const groups = useMemo(() => {
    if (!isClustered) return [{ key: 'all', label: '', items: filtered }];
    const map = new Map<string, { key: string; label: string; items: Review[] }>();
    for (const r of filtered) {
      const label = lt(r.cluster_tag);
      const g = map.get(label) ?? { key: label, label, items: [] };
      g.items.push(r);
      map.set(label, g);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [filtered, isClustered, lt]);

  const pendingCount = reviews?.filter((r) => r.status === 'pending').length ?? 0;

  if (loadError) return <ErrorState message={errorMessage(loadError, 'errors.loadFailed')} onRetry={() => void load()} />;
  if (!reviews) return <Spinner className="py-16" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('reviews.title')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('reviews.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmAll(true)} disabled={pendingCount === 0}>
            <Check className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
            {t('reviews.actions.approveAll', { count: pendingCount })}
          </Button>
          <Button variant={isClustered ? 'primary' : 'outline'} size="sm" onClick={() => setIsClustered((v) => !v)} aria-pressed={isClustered}>
            <Layers className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {isClustered ? t('reviews.actions.plainList') : t('reviews.actions.cluster')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('common.actions.search')}
            placeholder={t('reviews.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select aria-label={t('common.filters.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700">
            <option value="all">{t('common.filters.allStatuses')}</option>
            {(['pending', 'approved', 'overridden'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`reviews.status.${s}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.sortBy')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-medium">
            <option value="newest">{t('reviews.sort.newest')}</option>
            <option value="confidence_desc">{t('reviews.sort.confidence')}</option>
            <option value="score_asc">{t('reviews.sort.scoreAsc')}</option>
            <option value="score_desc">{t('reviews.sort.scoreDesc')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={statusFilter === 'pending' && !search ? t('reviews.emptyPending') : t('common.states.emptyFiltered')} />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-4" aria-label={group.label || undefined}>
            {isClustered && (
              <h2 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                {group.label} · {group.items.length}
              </h2>
            )}
            {group.items.map((rev) => (
              <article key={rev.id} className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{rev.student_name}</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-medium">{lt(rev.cluster_tag)}</span>
                      <time className="text-[10px] text-slate-400" dateTime={rev.created_at}>
                        {formatDate(rev.created_at, 'dateTime')}
                      </time>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mt-1">{lt(rev.question_text)}</h3>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-indigo-600">{t('reviews.score', { score: rev.ai_score, max: rev.max_score })}</div>
                    <div className="text-[10px] text-slate-500">{t('reviews.confidence', { value: formatPercent(rev.ai_confidence) })}</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800">
                  <span className="font-semibold text-slate-500 block mb-1">{t('reviews.answer')}</span>
                  <p className="italic whitespace-pre-line break-words">{rev.student_answer}</p>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs space-y-2">
                  <div className="flex items-center text-indigo-900 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" aria-hidden="true" />
                    {t('reviews.justification')}
                  </div>
                  <p className="text-slate-700">{lt(rev.ai_justification)}</p>
                  <ul className="flex flex-wrap gap-2 pt-1 text-[11px]" aria-label={t('reviews.criteria')}>
                    {rev.matched_criteria.map((c, i) => (
                      <li key={`m${i}`} className="inline-flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        <Check className="w-3 h-3 mr-1" aria-label={t('reviews.matched')} /> {lt(c)}
                      </li>
                    ))}
                    {rev.missed_criteria.map((c, i) => (
                      <li key={`x${i}`} className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <X className="w-3 h-3 mr-1" aria-label={t('reviews.missed')} /> {lt(c)}
                      </li>
                    ))}
                  </ul>
                  {rev.reviewer_comment && <p className="text-[11px] text-amber-800">{t('reviews.reviewerComment', { comment: rev.reviewer_comment })}</p>}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[rev.status]}>{t(`reviews.status.${rev.status}`)}</Badge>
                    {rev.reviewed_by && <span className="text-[10px] text-slate-400">{t('reviews.reviewedBy', { name: rev.reviewed_by, date: formatDate(rev.reviewed_at, 'dateTime') })}</span>}
                  </div>
                  {rev.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(rev);
                          setOverrideScore(String(rev.ai_score));
                          setOverrideComment('');
                          setFormError('');
                        }}
                      >
                        {t('reviews.actions.changeScore')}
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => void approve(rev)} isLoading={busyId === rev.id}>
                        <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                        {t('reviews.actions.approve')}
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        ))
      )}

      <ConfirmDialog
        isOpen={confirmAll}
        title={t('reviews.approveAll.title')}
        message={t('reviews.approveAll.message', { count: pendingCount })}
        tone="primary"
        confirmLabel={t('reviews.approveAll.confirm')}
        isLoading={busyId === 'all'}
        onConfirm={() => void approveAll()}
        onCancel={() => setConfirmAll(false)}
      />

      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title={t('reviews.override.title')} size="md" preventClose={busyId === selected.id}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitOverride();
            }}
            className="space-y-4 text-xs py-2"
          >
            {formError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {formError}
              </div>
            )}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-900 block">{selected.student_name}</span>
              <p className="italic text-slate-600 break-words">{selected.student_answer}</p>
            </div>
            <div>
              <label htmlFor="override-score" className="block text-xs font-medium text-slate-700 mb-1">
                {t('reviews.override.score', { max: selected.max_score })}
              </label>
              <input id="override-score" type="number" min={0} max={selected.max_score} step={1} value={overrideScore} onChange={(e) => setOverrideScore(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs" required />
            </div>
            <div>
              <label htmlFor="override-comment" className="block text-xs font-medium text-slate-700 mb-1">
                {t('reviews.override.comment')}
              </label>
              <textarea
                id="override-comment"
                rows={3}
                maxLength={2000}
                placeholder={t('reviews.override.commentPlaceholder')}
                value={overrideComment}
                onChange={(e) => setOverrideComment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setSelected(null)}>
                {t('common.actions.cancel')}
              </Button>
              <Button variant="primary" type="submit" isLoading={busyId === selected.id}>
                {t('reviews.override.save')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
