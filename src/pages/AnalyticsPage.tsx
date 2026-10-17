import React, { useMemo, useState } from 'react';
import { AlertTriangle, Sparkles, Clock, Award } from 'lucide-react';
import { DemoDataBadge, Spinner, useAuth, useI18n } from '@iclever/frontend-kit';
import { daysFromNow, DemoAssignment } from '../demo/fixtures';
import { effectiveStatus, useAssignmentsState, useCohortsState, useDepartments, useDirectory } from '../demo/useDemoData';

const RANGES = { '7d': 7, '30d': 30, '90d': 90, all: null } as const;
type Range = keyof typeof RANGES;
const TARGET = 85;

interface Stats {
  total: number;
  completed: number;
  overdue: number;
  avgProgress: number;
  completion: number;
}

function computeStats(items: DemoAssignment[]): Stats {
  const active = items.filter((a) => a.status !== 'cancelled');
  const completed = active.filter((a) => a.status === 'completed').length;
  const overdue = active.filter((a) => effectiveStatus(a) === 'overdue').length;
  const avgProgress = active.length ? active.reduce((s, a) => s + a.progress_percent, 0) / active.length : 0;
  return { total: active.length, completed, overdue, avgProgress, completion: active.length ? (completed / active.length) * 100 : 0 };
}

export const AnalyticsPage: React.FC = () => {
  const { t, lt, formatPercent, formatNumber } = useI18n();
  const { activeMember } = useAuth();
  const isManager = activeMember?.role === 'manager';
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [range, setRange] = useState<Range>('90d');
  const departments = useDepartments();
  const { members, loaded } = useDirectory();
  const [assignments] = useAssignmentsState();
  const [cohorts] = useCohortsState();

  // Expand cohort assignments to their members so every row maps to one person.
  const perMember = useMemo(() => {
    const since = RANGES[range] === null ? null : daysFromNow(-(RANGES[range] as number));
    return assignments
      .filter((a) => !since || a.created_at >= since)
      .flatMap((a) => {
        if (a.assignee_type === 'member') return [{ a, memberId: a.assignee_id }];
        const cohort = cohorts.find((c) => c.id === a.assignee_id);
        return (cohort?.member_ids ?? []).map((memberId) => ({ a: { ...a, progress_percent: cohort?.progress[memberId] ?? a.progress_percent }, memberId }));
      })
      .map(({ a, memberId }) => ({ a, member: members.find((m) => m.id === memberId) }))
      .filter((x) => !!x.member);
  }, [assignments, cohorts, members, range]);

  const scoped = perMember.filter((x) => departmentFilter === 'all' || x.member!.department_id === departmentFilter);
  const stats = computeStats(scoped.map((x) => x.a));
  const activeEmployees = members.filter((m) => m.status === 'active' && (departmentFilter === 'all' || m.department_id === departmentFilter)).length;

  const byDepartment = departments
    .map((d) => {
      const rows = perMember.filter((x) => x.member!.department_id === d.id).map((x) => x.a);
      return { dept: d, headcount: members.filter((m) => m.department_id === d.id && m.status !== 'archived').length, stats: computeStats(rows) };
    })
    .filter((x) => x.headcount > 0 || x.stats.total > 0)
    .sort((a, b) => b.stats.completion - a.stats.completion);

  const weakest = byDepartment.filter((x) => x.stats.total > 0).slice(-1)[0];
  const mostOverdue = [...byDepartment].sort((a, b) => b.stats.overdue - a.stats.overdue)[0];
  const best = byDepartment.find((x) => x.stats.total > 0);

  if (!loaded) return <Spinner className="py-16" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {t('analytics.title')} <DemoDataBadge />
          </h1>
          <p className="text-xs text-slate-500 mt-1">{isManager ? t('analytics.subtitleManager') : t('analytics.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!isManager && (
            <select aria-label={t('analytics.department')} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700">
              <option value="all">{t('analytics.wholeOrg')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {lt(d.name_i18n ?? d.name)}
                </option>
              ))}
            </select>
          )}
          <select aria-label={t('analytics.period')} value={range} onChange={(e) => setRange(e.target.value as Range)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700">
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <option key={r} value={r}>
                {t(`analytics.ranges.${r}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">{t('analytics.dataNote')}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">{t('analytics.kpi.completion')}</span>
          <div className="text-2xl font-black text-slate-900">{formatPercent(stats.completion, 1)}</div>
          <span className="text-[10px] text-slate-500">{t('analytics.kpi.completionHint', { completed: stats.completed, total: stats.total })}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">{t('analytics.kpi.avgProgress')}</span>
          <div className="text-2xl font-black text-slate-900">{formatPercent(stats.avgProgress)}</div>
          <span className="text-[10px] text-slate-500">{t('analytics.kpi.target', { target: formatPercent(TARGET) })}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">{t('analytics.kpi.overdue')}</span>
          <div className="text-2xl font-black text-red-600">{formatNumber(stats.overdue)}</div>
          <span className="text-[10px] text-red-500 font-medium">{t('analytics.kpi.overdueShare', { share: formatPercent(stats.total ? (stats.overdue / stats.total) * 100 : 0, 1) })}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">{t('analytics.kpi.activeEmployees')}</span>
          <div className="text-2xl font-black text-indigo-600">{formatNumber(activeEmployees)}</div>
          <span className="text-[10px] text-slate-500">{t('analytics.kpi.liveHint')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4" aria-labelledby="dept-progress">
          <div className="flex items-center justify-between gap-2">
            <h2 id="dept-progress" className="text-sm font-bold text-slate-900">
              {t('analytics.byDepartment')}
            </h2>
            <span className="text-xs text-slate-400">{t('analytics.kpi.target', { target: formatPercent(TARGET) })}</span>
          </div>
          {byDepartment.length === 0 ? (
            <p className="text-xs text-slate-400">{t('analytics.noData')}</p>
          ) : (
            <ul className="space-y-4 text-xs">
              {byDepartment.map(({ dept, headcount, stats: s }) => {
                const color = s.completion >= TARGET ? 'bg-green-500' : s.completion >= 70 ? 'bg-indigo-600' : 'bg-amber-500';
                return (
                  <li key={dept.id}>
                    <div className="flex justify-between gap-2 text-slate-700 font-medium mb-1">
                      <span>{t('analytics.departmentRow', { name: lt(dept.name_i18n ?? dept.name), count: headcount })}</span>
                      <span className="font-bold">{s.total ? formatPercent(s.completion, 1) : '—'}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(s.completion)} aria-valuemin={0} aria-valuemax={100}>
                      <div className={`${color} h-full rounded-full`} style={{ width: `${s.completion}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t('analytics.departmentHint', { total: s.total, overdue: s.overdue })}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4" aria-labelledby="insights">
          <h2 id="insights" className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <span>{t('analytics.insights.title')}</span>
          </h2>
          <ul className="space-y-3 text-xs">
            {weakest && weakest.stats.completion < TARGET && (
              <li className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
                <span className="font-semibold text-red-600 flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  {t('analytics.insights.lowCompletionTitle')}
                </span>
                <p className="text-slate-600 text-[11px]">{t('analytics.insights.lowCompletion', { name: lt(weakest.dept.name_i18n ?? weakest.dept.name), value: formatPercent(weakest.stats.completion, 1) })}</p>
              </li>
            )}
            {mostOverdue && mostOverdue.stats.overdue > 0 && (
              <li className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
                <span className="font-semibold text-amber-600 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  {t('analytics.insights.overdueTitle')}
                </span>
                <p className="text-slate-600 text-[11px]">{t('analytics.insights.overdue', { name: lt(mostOverdue.dept.name_i18n ?? mostOverdue.dept.name), count: mostOverdue.stats.overdue })}</p>
              </li>
            )}
            {best && (
              <li className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
                <span className="font-semibold text-indigo-600 flex items-center">
                  <Award className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  {t('analytics.insights.leaderTitle')}
                </span>
                <p className="text-slate-600 text-[11px]">{t('analytics.insights.leader', { name: lt(best.dept.name_i18n ?? best.dept.name), value: formatPercent(best.stats.completion, 1) })}</p>
              </li>
            )}
            {!weakest && !best && <li className="text-slate-500">{t('analytics.noData')}</li>}
          </ul>
          <p className="text-[10px] text-slate-500">{t('analytics.insights.note')}</p>
        </section>
      </div>
    </div>
  );
};
