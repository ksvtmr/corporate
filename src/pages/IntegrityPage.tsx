import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api, Badge, Button, EmptyState, ErrorState, LocalizedText, Modal, Spinner, Table, useApiErrorMessage, useI18n, useToast, ApiError } from '@iclever/frontend-kit';

type EventType = 'tab_switch' | 'focus_loss' | 'copy_paste' | 'rapid_answering' | 'ai_text_detected';

interface IntegrityEvent {
  id: string;
  student_name: string;
  test_title: LocalizedText;
  event_type: EventType;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  params: { seconds?: number; question?: number; chars?: number };
  status: 'new' | 'dismissed' | 'escalated';
  resolution_note?: string;
  resolved_by?: string;
  resolved_at?: string;
}

const SEVERITY_VARIANT = { high: 'danger', medium: 'warning', low: 'info' } as const;
const STATUS_VARIANT = { new: 'warning', escalated: 'danger', dismissed: 'success' } as const;
const SEVERITY_ORDER = { high: 3, medium: 2, low: 1 };

export const IntegrityPage: React.FC = () => {
  const { t, lt, formatDate, formatNumber, compare } = useI18n();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const [events, setEvents] = useState<IntegrityEvent[] | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'time_desc' | 'severity_desc' | 'name_asc'>('time_desc');
  const [selected, setSelected] = useState<IntegrityEvent | null>(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<IntegrityEvent[]>('/assessment/integrity-events', { noCache: true });
    if (res.success && res.data) {
      setEvents(res.data);
      setLoadError(null);
    } else setLoadError(res.error ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Event descriptions are rendered from structured parameters, so they follow the UI language. */
  const describe = (e: IntegrityEvent) =>
    t(`integrity.details.${e.event_type}`, {
      seconds: e.params.seconds !== undefined ? formatNumber(e.params.seconds) : '—',
      question: e.params.question ?? '—',
      chars: e.params.chars ?? '—',
    });

  const resolve = async (action: 'dismissed' | 'escalated') => {
    if (!selected) return;
    setIsSaving(true);
    const res = await api.post<IntegrityEvent>(`/assessment/integrity-events/${selected.id}/resolve`, { action, note: note.trim() || undefined });
    setIsSaving(false);
    if (res.success && res.data) {
      setEvents((prev) => (prev ? prev.map((e) => (e.id === res.data!.id ? res.data! : e)) : prev));
      toast.success(t(`integrity.toast.${action}`));
      setSelected(null);
      setNote('');
    } else {
      toast.error(errorMessage(res.error));
      void load();
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (events ?? [])
      .filter((e) => {
        const text = `${e.student_name} ${Object.values(e.test_title).join(' ')} ${describe(e)}`.toLowerCase();
        return (!q || text.includes(q)) && (severityFilter === 'all' || e.severity === severityFilter) && (statusFilter === 'all' || e.status === statusFilter);
      })
      .sort((a, b) => {
        if (sortOrder === 'severity_desc') return SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
        if (sortOrder === 'name_asc') return compare(a.student_name, b.student_name);
        return b.timestamp.localeCompare(a.timestamp);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, search, severityFilter, statusFilter, sortOrder, t]);

  if (loadError) return <ErrorState message={errorMessage(loadError, 'errors.loadFailed')} onRetry={() => void load()} />;
  if (!events) return <Spinner className="py-16" />;

  const count = (s: IntegrityEvent['status']) => events.filter((e) => e.status === s).length;
  const selectClass = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('integrity.title')}</h1>
        <p className="text-xs text-slate-500 mt-1">{t('integrity.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['total', events.length, 'text-slate-900'],
          ['new', count('new'), 'text-amber-600'],
          ['escalated', count('escalated'), 'text-red-600'],
          ['dismissed', count('dismissed'), 'text-green-600'],
        ].map(([key, value, tone]) => (
          <div key={key as string} className="bg-white p-3.5 rounded-xl border border-slate-200">
            <div className={`text-lg font-bold ${tone}`}>{value as number}</div>
            <div className="text-[11px] text-slate-500">{t(`integrity.kpi.${key}`)}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('common.actions.search')}
            placeholder={t('integrity.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select aria-label={t('integrity.columns.severity')} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('integrity.anySeverity')}</option>
            {(['high', 'medium', 'low'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`integrity.severity.${s}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('common.filters.allStatuses')}</option>
            {(['new', 'escalated', 'dismissed'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`integrity.status.${s}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.sortBy')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className={`${selectClass} font-medium`}>
            <option value="time_desc">{t('integrity.sort.time')}</option>
            <option value="severity_desc">{t('integrity.sort.severity')}</option>
            <option value="name_asc">{t('integrity.sort.name')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t('common.states.emptyFiltered')} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table
            headers={[
              t('integrity.columns.employee'),
              t('integrity.columns.test'),
              t('integrity.columns.type'),
              t('integrity.columns.details'),
              t('integrity.columns.severity'),
              t('integrity.columns.status'),
              t('integrity.columns.action'),
            ]}
          >
            {filtered.map((evt) => (
              <tr key={evt.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
                <td className="p-3 font-semibold text-slate-900">
                  {evt.student_name}
                  <time className="block text-[10px] font-normal text-slate-400" dateTime={evt.timestamp}>
                    {formatDate(evt.timestamp, 'dateTime')}
                  </time>
                </td>
                <td className="p-3 text-slate-600">{lt(evt.test_title)}</td>
                <td className="p-3 font-medium text-slate-800">{t(`integrity.types.${evt.event_type}`)}</td>
                <td className="p-3 max-w-xs text-slate-500">{describe(evt)}</td>
                <td className="p-3">
                  <Badge variant={SEVERITY_VARIANT[evt.severity]}>{t(`integrity.severity.${evt.severity}`)}</Badge>
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[evt.status]}>{t(`integrity.status.${evt.status}`)}</Badge>
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelected(evt);
                      setNote('');
                    }}
                  >
                    {evt.status === 'new' ? t('integrity.actions.review') : t('common.actions.details')}
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title={t('integrity.modal.title')} size="md" preventClose={isSaving}>
          <div className="space-y-4 text-xs py-2 text-slate-700">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-slate-900">{selected.student_name}</span>
                <time className="text-slate-400" dateTime={selected.timestamp}>
                  {formatDate(selected.timestamp, 'dateTime')}
                </time>
              </div>
              <div className="text-slate-600">{t('integrity.modal.test', { test: lt(selected.test_title) })}</div>
              <div className="text-indigo-600 font-medium">{t('integrity.modal.type', { type: t(`integrity.types.${selected.event_type}`) })}</div>
              <p className="text-slate-800 pt-1 border-t border-slate-200">{describe(selected)}</p>
            </div>
            {selected.status !== 'new' && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
                <span className="font-semibold block mb-1">{t('integrity.modal.auditEntry')}</span>
                <p>
                  {t(`integrity.status.${selected.status}`)} — {selected.resolved_by} ({formatDate(selected.resolved_at, 'dateTime')})
                </p>
                {selected.resolution_note && <p className="mt-1 italic">{selected.resolution_note}</p>}
              </div>
            )}
            {selected.status === 'new' && (
              <div>
                <label htmlFor="resolution-note" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('integrity.modal.note')}
                </label>
                <textarea id="resolution-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('integrity.modal.notePlaceholder')} className="w-full rounded-lg border border-slate-300 p-2 text-xs" />
                <p className="text-[11px] text-slate-400 mt-1">{t('integrity.modal.neutralHint')}</p>
              </div>
            )}
            <div className="pt-2 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelected(null)} disabled={isSaving}>
                {t('common.actions.close')}
              </Button>
              {selected.status === 'new' && (
                <>
                  <Button variant="outline" onClick={() => void resolve('dismissed')} isLoading={isSaving}>
                    {t('integrity.actions.dismiss')}
                  </Button>
                  <Button variant="danger" onClick={() => void resolve('escalated')} isLoading={isSaving}>
                    {t('integrity.actions.escalate')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
