import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, Search, Printer } from 'lucide-react';
import { api, Badge, Button, DemoDataBadge, EmptyState, LocalizedText, saveBlob, Table, toCsv, useApiErrorMessage, useAuth, useI18n, useToast } from '@iclever/frontend-kit';
import { DemoReportJob, REPORT_TYPES, ReportFormat, ReportType } from '../demo/fixtures';
import { effectiveStatus, fullName, useAssignmentsState, useDepartments, useDirectory, useReportJobsState, useTestsState, useTracksState } from '../demo/useDemoData';

interface IntegrityEvent {
  student_name: string;
  test_title: LocalizedText;
  event_type: string;
  severity: string;
  timestamp: string;
  status: string;
}

type StoredJob = DemoReportJob & { rows?: string[][] };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export const ReportsPage: React.FC = () => {
  const { t, lt, locale, formatDate, formatNumber, formatPercent } = useI18n();
  const { user, activeMember } = useAuth();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const [jobs, setJobs] = useReportJobsState();
  const [assignments] = useAssignmentsState();
  const [tracks] = useTracksState();
  const [tests] = useTestsState();
  const departments = useDepartments();
  const { members } = useDirectory();
  const [selectedType, setSelectedType] = useState<ReportType>('department_progress');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [progress, setProgress] = useState<number | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  const programName = (type: 'track' | 'test', id: string) => lt((type === 'track' ? tracks.find((x) => x.id === id) : tests.find((x) => x.id === id))?.title) || id;
  const deptName = (id?: string) => {
    const d = departments.find((x) => x.id === id);
    return d ? lt(d.name_i18n ?? d.name) : '—';
  };

  /** Builds report rows from the organization's current data, with headers in the UI language. */
  const buildRows = async (type: ReportType): Promise<string[][] | null> => {
    const h = (k: string) => t(`reports.columns.${k}`);
    if (type === 'department_progress') {
      return [
        [h('department'), h('headcount'), h('assignments'), h('completed'), h('overdue'), h('avgProgress')],
        ...departments.map((d) => {
          const rows = assignments.filter((a) => a.assignee_type === 'member' && members.find((m) => m.id === a.assignee_id)?.department_id === d.id && a.status !== 'cancelled');
          const avg = rows.length ? rows.reduce((s, a) => s + a.progress_percent, 0) / rows.length : 0;
          return [lt(d.name_i18n ?? d.name), String(members.filter((m) => m.department_id === d.id).length), String(rows.length), String(rows.filter((a) => a.status === 'completed').length), String(rows.filter((a) => effectiveStatus(a) === 'overdue').length), formatPercent(avg)];
        }),
      ];
    }
    if (type === 'overdue_registry') {
      return [
        [h('employee'), h('department'), h('program'), h('dueDate'), h('progress')],
        ...assignments
          .filter((a) => a.assignee_type === 'member' && effectiveStatus(a) === 'overdue')
          .map((a) => {
            const m = members.find((x) => x.id === a.assignee_id);
            return [fullName(m) || a.assignee_id, deptName(m?.department_id), programName(a.target_type, a.target_id), formatDate(a.due_date, 'dateShort'), formatPercent(a.progress_percent)];
          }),
      ];
    }
    if (type === 'competency_matrix') {
      return [
        [h('employee'), h('jobTitle'), h('department'), h('completed'), h('inProgress'), h('avgProgress')],
        ...members
          .filter((m) => m.status === 'active')
          .map((m) => {
            const rows = assignments.filter((a) => a.assignee_type === 'member' && a.assignee_id === m.id && a.status !== 'cancelled');
            const avg = rows.length ? rows.reduce((s, a) => s + a.progress_percent, 0) / rows.length : 0;
            return [fullName(m), m.job_title || '—', deptName(m.department_id), String(rows.filter((a) => a.status === 'completed').length), String(rows.filter((a) => a.status !== 'completed').length), formatPercent(avg)];
          }),
      ];
    }
    if (type === 'integrity_log') {
      const res = await api.get<IntegrityEvent[]>('/assessment/integrity-events', { noCache: true });
      if (!res.success || !res.data) {
        toast.error(errorMessage(res.error));
        return null;
      }
      return [
        [h('employee'), h('test'), h('event'), h('severity'), h('status'), h('date')],
        ...res.data.map((e) => [e.student_name, lt(e.test_title), t(`integrity.types.${e.event_type}`), t(`integrity.severity.${e.severity}`), t(`integrity.status.${e.status}`), formatDate(e.timestamp, 'dateTime')]),
      ];
    }
    // employee_registry: rows from the members API (server-side scoped and sanitized export also available).
    return [
      [h('employee'), 'Email', h('role'), h('status'), h('jobTitle'), h('department')],
      ...members.filter((m) => m.status !== 'archived').map((m) => [fullName(m), m.email, t(`roles.${m.role}`), t(`roles.status.${m.status}`), m.job_title || '—', deptName(m.department_id)]),
    ];
  };

  // Simulated asynchronous job; the timer is cleaned up on unmount.
  useEffect(() => {
    if (progress === null) return;
    if (progress < 100) {
      const timer = setTimeout(() => setProgress((p) => (p === null ? null : p + 25)), 300);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    (async () => {
      const rows = await buildRows(selectedType);
      if (cancelled) return;
      setProgress(null);
      if (!rows) return;
      const csv = toCsv(rows);
      const job: StoredJob = {
        id: `exp-${Date.now().toString(36)}`,
        report_type: selectedType,
        format,
        status: 'ready',
        created_at: new Date().toISOString(),
        file_size_kb: Math.max(1, Math.round(new Blob([csv]).size / 1024)),
        created_by: fullName(user ?? undefined),
        rows,
      };
      setJobs((prev) => [job, ...prev].slice(0, 50));
      toast.success(t('reports.toast.ready', { report: t(`reports.types.${selectedType}.title`) }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const download = async (job: StoredJob) => {
    const title = t(`reports.types.${job.report_type}.title`);
    const rows = job.rows ?? (await buildRows(job.report_type));
    if (!rows) return;
    if (job.format === 'csv') {
      const name = `${job.report_type}_${job.created_at.slice(0, 10)}.csv`;
      saveBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), name);
      toast.success(t('reports.toast.downloaded', { file: name }));
      return;
    }
    // PDF: print-ready document; the browser's "Save as PDF" produces the file.
    const win = window.open('', '_blank', 'noopener=no');
    if (!win) return toast.error(t('reports.toast.popupBlocked'));
    const [head, ...body] = rows;
    win.document.write(
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0f172a}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#f1f5f9}</style></head><body>` +
        `<h1 style="font-size:18px">${escapeHtml(title)}</h1><p style="font-size:12px;color:#64748b">${escapeHtml(activeMember?.org_name ?? '')} • ${escapeHtml(formatDate(job.created_at, 'dateTime'))}</p>` +
        `<table><thead><tr>${head.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const filteredJobs = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return (jobs as StoredJob[]).filter((j) => !q || `${t(`reports.types.${j.report_type}.title`)} ${j.format}`.toLowerCase().includes(q));
  }, [jobs, historySearch, t]);

  const isGenerating = progress !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          {t('reports.title')} <DemoDataBadge />
        </h1>
        <p className="text-xs text-slate-500 mt-1">{t('reports.subtitle')}</p>
      </div>

      <section className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <fieldset>
          <legend className="text-sm font-bold text-slate-900 mb-2">{t('reports.step1')}</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {REPORT_TYPES.map((type) => (
              <label
                key={type}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all focus-within:ring-2 focus-within:ring-indigo-500 ${
                  selectedType === type ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <input type="radio" name="report-type" value={type} checked={selectedType === type} onChange={() => setSelectedType(type)} className="sr-only" />
                <div className="font-semibold text-slate-900">{t(`reports.types.${type}.title`)}</div>
                <div className="text-[11px] text-slate-500 mt-1">{t(`reports.types.${type}.desc`)}</div>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold text-slate-900 mb-2">{t('reports.step2')}</legend>
          <div className="flex flex-wrap gap-3 text-xs">
            {(['csv', 'pdf'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                aria-pressed={format === fmt}
                onClick={() => setFormat(fmt)}
                className={`px-4 py-2 rounded-xl border font-bold uppercase transition-all flex items-center gap-2 ${format === fmt ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                <FileDown className="w-4 h-4" aria-hidden="true" />
                <span>{fmt}</span>
              </button>
            ))}
            <button type="button" disabled title={t('reports.xlsxUnavailable')} className="px-4 py-2 rounded-xl border font-bold uppercase flex items-center gap-2 bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed">
              <FileDown className="w-4 h-4" aria-hidden="true" />
              <span>xlsx</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">{format === 'pdf' ? t('reports.pdfHint') : t('reports.csvHint')}</p>
          <p className="text-[11px] text-slate-400">{t('reports.xlsxUnavailable')}</p>
        </fieldset>

        {isGenerating && (
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-2 text-xs" role="status">
            <div className="flex justify-between font-semibold text-indigo-900">
              <span>{t('reports.generating')}</span>
              <span>{Math.min(progress!, 100)}%</span>
            </div>
            <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${Math.min(progress!, 100)}%` }} />
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="primary" disabled={isGenerating} isLoading={isGenerating} onClick={() => setProgress(0)}>
            <Download className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('reports.generate')}
          </Button>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="report-history">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 id="report-history" className="text-sm font-bold text-slate-900">
            {t('reports.history')}
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label={t('common.actions.search')}
              placeholder={t('reports.searchPlaceholder')}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        {filteredJobs.length === 0 ? (
          <EmptyState title={jobs.length === 0 ? t('reports.emptyHistory') : t('common.states.emptyFiltered')} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <Table headers={[t('reports.columns.report'), t('reports.columns.format'), t('reports.columns.size'), t('reports.columns.created'), t('reports.columns.status'), t('reports.columns.download')]}>
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">
                    {t(`reports.types.${job.report_type}.title`)}
                    <span className="block text-[10px] font-normal text-slate-400">{job.created_by}</span>
                  </td>
                  <td className="p-3 uppercase font-bold text-slate-600">{job.format}</td>
                  <td className="p-3 text-slate-500">{t('reports.sizeKb', { size: formatNumber(job.file_size_kb) })}</td>
                  <td className="p-3 text-slate-500">
                    <time dateTime={job.created_at}>{formatDate(job.created_at, 'dateTime')}</time>
                  </td>
                  <td className="p-3">
                    <Badge variant={job.status === 'ready' ? 'success' : 'danger'}>{t(`reports.status.${job.status}`)}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => void download(job)} disabled={job.status !== 'ready'}>
                      {job.format === 'pdf' ? <Printer className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> : <Download className="w-3.5 h-3.5 mr-1" aria-hidden="true" />}
                      {job.format === 'pdf' ? t('reports.openPdf') : t('common.actions.download')}
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
        <p className="text-[11px] text-slate-400">{t('reports.historyNote')}</p>
      </section>
    </div>
  );
};
