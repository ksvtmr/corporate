import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, AlertCircle, Sparkles, Award, Play, Bell, CheckSquare, Search, UserPlus, FileCheck, ShieldAlert, BookOpen, GraduationCap, HelpCircle } from 'lucide-react';
import { api, Badge, Button, Card, DemoDataBadge, ErrorState, LocalizedText, Modal, Spinner, useApiErrorMessage, useAuth, useI18n, useToast, ApiError } from '@iclever/frontend-kit';
import { effectiveStatus, fullName, useAssignmentsState, useDirectory, useMaterialsState, useQuestionsState, useTracksState, useTestsState, DirectoryMember } from '../demo/useDemoData';
import { DemoAssignment } from '../demo/fixtures';

interface TrackPayload {
  track: { id: string; title: LocalizedText; curator_name: string; blocks: Array<{ id: string; type: string }> };
  progress: { completed_block_ids: string[]; percent: number; completed_at: string | null };
  latest_attempts: Array<{ score_percent: number; passed: boolean; review_status: string | null }>;
}

interface Summary {
  active_members: number;
  invited_members: number;
  suspended_members: number;
  departments: number;
  pending_reviews: number;
  new_integrity_events: number;
  max_seats: number;
  used_seats: number;
}

const STATUS_VARIANT = { assigned: 'info', in_progress: 'warning', completed: 'success', overdue: 'danger', cancelled: 'neutral' } as const;

const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string }> = ({ label, value, hint, tone = 'text-slate-900' }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
    <span className="text-[11px] text-slate-500 font-medium">{label}</span>
    <div className={`text-2xl font-black mt-1 ${tone}`}>{value}</div>
    {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
  </div>
);

/** Resolves track/test titles referenced by assignments. */
function useTargetTitle() {
  const { lt, t } = useI18n();
  const [tracks] = useTracksState();
  const [tests] = useTestsState();
  return (a: Pick<DemoAssignment, 'target_type' | 'target_id'>) => {
    const target = a.target_type === 'track' ? tracks.find((x) => x.id === a.target_id) : tests.find((x) => x.id === a.target_id);
    return target ? lt(target.title) : t('dashboard.unknownProgram');
  };
}

// ---------------------------------------------------------------------------

const EmployeeDashboard: React.FC = () => {
  const { t, lt, formatDate, formatPercent } = useI18n();
  const { user, activeMember } = useAuth();
  const navigate = useNavigate();
  const errorMessage = useApiErrorMessage();
  const [assignments] = useAssignmentsState();
  const targetTitle = useTargetTitle();
  const [data, setData] = useState<TrackPayload | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    api.get<TrackPayload>('/learning/my/track', { noCache: true }).then((res) => (res.success && res.data ? setData(res.data) : setError(res.error ?? null)));
  }, []);

  const mine = assignments.filter((a) => a.assignee_type === 'member' && a.assignee_id === activeMember?.id && a.status !== 'cancelled');
  const open = mine.filter((a) => effectiveStatus(a) !== 'completed').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const attempt = data?.latest_attempts[0];
  const done = data?.progress.completed_block_ids.length ?? 0;
  const total = data?.track.blocks.length ?? 0;
  const dept = lt(activeMember?.department_name_i18n ?? activeMember?.department_name);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
            {dept ? t('dashboard.employee.kickerWithDept', { department: dept }) : t('dashboard.employee.kicker')}
          </span>
          <h1 className="text-2xl font-bold mt-1">{t('dashboard.employee.greeting', { name: user?.first_name || '' })}</h1>
          <p className="text-xs text-indigo-100 mt-1 max-w-xl">
            {data?.progress.completed_at
              ? t('dashboard.employee.trackDone', { track: lt(data.track.title) })
              : data
                ? t('dashboard.employee.trackInProgress', { track: lt(data.track.title), done, total })
                : t('common.states.loading')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold border-0 shadow" onClick={() => navigate('/corporate/my/player')}>
            <Play className="w-4 h-4 mr-2 text-indigo-600 fill-indigo-600" aria-hidden="true" />
            {t('dashboard.employee.openPlayer')}
          </Button>
          <Button variant="primary" className="bg-amber-500 hover:bg-amber-600 text-white font-bold border-0 shadow" onClick={() => navigate('/corporate/my/player?view=test')}>
            <Award className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('dashboard.employee.takeTest')}
          </Button>
        </div>
      </div>

      {error && <ErrorState message={errorMessage(error, 'errors.loadFailed')} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={t('dashboard.employee.progress')} value={data ? formatPercent(data.progress.percent) : '—'} hint={t('dashboard.employee.blocksDone', { done, total })} tone="text-indigo-600" />
        <StatTile
          label={t('dashboard.employee.activeAssignments')}
          value={open.length}
          hint={open[0] ? t('dashboard.employee.nextDeadline', { date: formatDate(open[0].due_date, 'monthDay') }) : t('dashboard.employee.noDeadlines')}
        />
        <StatTile
          label={t('dashboard.employee.lastTest')}
          value={attempt ? formatPercent(attempt.score_percent) : '—'}
          hint={attempt ? (attempt.review_status === 'pending' ? t('dashboard.employee.preliminary') : attempt.passed ? t('dashboard.employee.passed') : t('dashboard.employee.notPassed')) : t('dashboard.employee.noAttempts')}
          tone={attempt ? (attempt.passed ? 'text-emerald-600' : 'text-red-600') : 'text-slate-900'}
        />
        <StatTile label={t('dashboard.employee.completedPrograms')} value={mine.filter((a) => a.status === 'completed').length + (data?.progress.completed_at ? 1 : 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">{t('dashboard.employee.myPrograms')}</h2>
          {!data ? (
            <Spinner />
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{lt(data.track.title)}</h3>
                  <p className="text-xs text-slate-500">{t('dashboard.employee.curator', { name: data.track.curator_name })}</p>
                </div>
                <Badge variant={data.progress.completed_at ? 'success' : data.progress.percent > 0 ? 'warning' : 'info'}>
                  {t(`dashboard.trackStatus.${data.progress.completed_at ? 'completed' : data.progress.percent > 0 ? 'in_progress' : 'not_started'}`)}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{t('dashboard.employee.blocksDone', { done, total })}</span>
                  <span className="font-semibold text-indigo-600">{formatPercent(data.progress.percent)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={data.progress.percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="bg-indigo-600 h-full" style={{ width: `${data.progress.percent}%` }} />
                </div>
              </div>
              <div className="pt-2 flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate('/corporate/my/player')}>
                  {t('dashboard.employee.continue')}
                </Button>
                <Button size="sm" variant="primary" onClick={() => navigate('/corporate/my/player?view=test')}>
                  {t('dashboard.employee.toTest')}
                </Button>
              </div>
            </div>
          )}
          {open.length > 0 && (
            <ul className="space-y-2">
              {open.map((a) => {
                const status = effectiveStatus(a);
                return (
                  <li key={a.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{targetTitle(a)}</p>
                      <p className="text-slate-500">{t('dashboard.deadline', { date: formatDate(a.due_date) })}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[status]}>{t(`assignments.status.${status}`)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <span>{t('dashboard.employee.recommendations')}</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-1">
              <span className="font-semibold text-indigo-900">{t('dashboard.employee.recFlashcardsTitle')}</span>
              <p className="text-slate-600 text-[11px]">{t('dashboard.employee.recFlashcardsText')}</p>
              <Button size="sm" variant="outline" onClick={() => navigate('/corporate/flashcards')}>
                {t('dashboard.employee.recFlashcardsAction')}
              </Button>
            </div>
            <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-1">
              <span className="font-semibold text-indigo-900">{t('dashboard.employee.recAiTitle')}</span>
              <p className="text-slate-600 text-[11px]">{t('dashboard.employee.recAiText')}</p>
              <Button size="sm" variant="outline" onClick={() => navigate('/corporate/ai-chat')}>
                {t('dashboard.employee.recAiAction')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const ManagerDashboard: React.FC = () => {
  const { t, lt, formatDate, formatPercent, compare } = useI18n();
  const { activeMember } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { members, loaded } = useDirectory();
  const [assignments, setAssignments] = useAssignmentsState();
  const targetTitle = useTargetTitle();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<'progress_asc' | 'progress_desc' | 'name_asc' | 'name_desc'>('progress_asc');
  const [selected, setSelected] = useState<DirectoryMember | null>(null);

  const team = members.filter((m) => m.id !== activeMember?.id && m.status === 'active');
  const latestFor = (memberId: string) =>
    assignments.filter((a) => a.assignee_type === 'member' && a.assignee_id === memberId && a.status !== 'cancelled').sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const rows = team
    .map((m) => ({ member: m, assignment: latestFor(m.id) }))
    .filter(({ member, assignment }) => {
      const q = search.trim().toLowerCase();
      const matches = !q || `${fullName(member)} ${member.job_title ?? ''}`.toLowerCase().includes(q);
      const status = assignment ? effectiveStatus(assignment) : 'none';
      return matches && (statusFilter === 'all' || status === statusFilter);
    })
    .sort((a, b) => {
      if (sort === 'name_asc') return compare(fullName(a.member), fullName(b.member));
      if (sort === 'name_desc') return compare(fullName(b.member), fullName(a.member));
      const pa = a.assignment?.progress_percent ?? -1;
      const pb = b.assignment?.progress_percent ?? -1;
      return sort === 'progress_asc' ? pa - pb : pb - pa;
    });

  const teamAssignments = team.map((m) => latestFor(m.id)).filter((a): a is DemoAssignment => !!a);
  const overdue = teamAssignments.filter((a) => effectiveStatus(a) === 'overdue');
  const completion = teamAssignments.length ? (teamAssignments.filter((a) => a.status === 'completed').length / teamAssignments.length) * 100 : 0;
  const avgProgress = teamAssignments.length ? teamAssignments.reduce((s, a) => s + a.progress_percent, 0) / teamAssignments.length : 0;

  const sendReminders = () => {
    const targets = teamAssignments.filter((a) => ['assigned', 'in_progress', 'overdue'].includes(effectiveStatus(a)));
    if (targets.length === 0) return toast.info(t('dashboard.manager.noReminders'));
    setAssignments((prev) => prev.map((a) => (targets.some((x) => x.id === a.id) ? { ...a, reminders_sent: (a.reminders_sent ?? 0) + 1 } : a)));
    toast.success(t('dashboard.manager.remindersSent', { count: targets.length }));
  };

  const dept = lt(activeMember?.department_name_i18n ?? activeMember?.department_name);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{t('dashboard.manager.kicker', { department: dept || '—' })}</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{t('dashboard.manager.title')}</h1>
          <p className="text-xs text-slate-500">{t('dashboard.manager.subtitle', { count: team.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/corporate/assignments')}>
            <CheckSquare className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('dashboard.manager.assign')}
          </Button>
          <Button variant="primary" size="sm" onClick={sendReminders}>
            <Bell className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('dashboard.manager.remind')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={t('dashboard.manager.teamSize')} value={team.length} hint={dept} />
        <StatTile label={t('dashboard.manager.completion')} value={formatPercent(completion, 1)} tone="text-emerald-600" />
        <StatTile label={t('dashboard.manager.overdue')} value={overdue.length} tone={overdue.length ? 'text-red-600' : 'text-slate-900'} hint={overdue.map((a) => fullName(members.find((m) => m.id === a.assignee_id))).join(', ') || undefined} />
        <StatTile label={t('dashboard.manager.avgProgress')} value={formatPercent(avgProgress)} tone="text-indigo-600" />
      </div>

      <Card title={t('dashboard.manager.tableTitle')} subtitle={t('dashboard.manager.tableSubtitle')}>
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label={t('common.actions.search')}
              placeholder={t('dashboard.manager.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select aria-label={t('common.filters.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700">
              <option value="all">{t('common.filters.allStatuses')}</option>
              {(['assigned', 'in_progress', 'overdue', 'completed'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`assignments.status.${s}`)}
                </option>
              ))}
              <option value="none">{t('dashboard.manager.noAssignment')}</option>
            </select>
            <select aria-label={t('common.filters.sortBy')} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium">
              <option value="progress_asc">{t('dashboard.manager.sort.progressAsc')}</option>
              <option value="progress_desc">{t('dashboard.manager.sort.progressDesc')}</option>
              <option value="name_asc">{t('dashboard.manager.sort.nameAsc')}</option>
              <option value="name_desc">{t('dashboard.manager.sort.nameDesc')}</option>
            </select>
          </div>
        </div>
        {!loaded ? (
          <Spinner className="py-6" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-slate-400 text-xs">{t('common.states.emptyFiltered')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {rows.map(({ member, assignment }) => {
              const status = assignment ? effectiveStatus(assignment) : null;
              return (
                <li key={member.id}>
                  <button type="button" onClick={() => setSelected(member)} className="w-full py-3 px-2 rounded-lg hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        {fullName(member)} <span className="text-[10px] text-slate-400 font-normal">({member.email})</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {member.job_title || '—'}
                        {assignment && ` • ${targetTitle(assignment)} • ${t('dashboard.deadline', { date: formatDate(assignment.due_date) })}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {assignment && (
                        <div className="text-right w-28">
                          <div className="font-semibold text-slate-700">{formatPercent(assignment.progress_percent)}</div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div className={`h-full ${status === 'overdue' ? 'bg-red-500' : status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${assignment.progress_percent}%` }} />
                          </div>
                        </div>
                      )}
                      <Badge variant={status ? STATUS_VARIANT[status] : 'neutral'}>{status ? t(`assignments.status.${status}`) : t('dashboard.manager.noAssignment')}</Badge>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title={t('dashboard.manager.profileTitle', { name: fullName(selected) })} size="md">
          <div className="space-y-4 text-xs text-slate-700 py-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 text-sm">{fullName(selected)}</span>
              <p className="text-slate-500">
                {selected.job_title || '—'} • {selected.email}
              </p>
              <p className="text-[11px] text-indigo-700 font-medium">{lt(selected.department_name_i18n ?? selected.department_name)}</p>
            </div>
            {(() => {
              const a = latestFor(selected.id);
              if (!a) return <p className="text-slate-500">{t('dashboard.manager.noAssignment')}</p>;
              return (
                <div className="p-3 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-slate-800">{targetTitle(a)}</span>
                    <span className="font-bold text-indigo-600">{formatPercent(a.progress_percent)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: `${a.progress_percent}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500">{t('dashboard.deadline', { date: formatDate(a.due_date) })}</p>
                </div>
              );
            })()}
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                {t('common.actions.close')}
              </Button>
              <Button variant="primary" onClick={() => navigate(`/corporate/assignments?assignee=${encodeURIComponent(selected.id)}`)}>
                {t('dashboard.manager.manageAssignments')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const TrainerDashboard: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [materials] = useMaterialsState();
  const [tracks] = useTracksState();
  const [questions] = useQuestionsState();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('dashboard.trainer.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('dashboard.trainer.subtitle')}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={t('dashboard.trainer.materials')} value={materials.length} hint={t('dashboard.trainer.toReview', { count: materials.filter((m) => m.status === 'ready_for_review').length })} />
        <StatTile label={t('dashboard.trainer.tracks')} value={tracks.length} hint={t('dashboard.trainer.drafts', { count: tracks.filter((x) => x.status === 'draft').length })} />
        <StatTile label={t('dashboard.trainer.questions')} value={questions.length} />
        <StatTile label={t('dashboard.trainer.published')} value={tracks.filter((x) => x.status === 'published').length} tone="text-emerald-600" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/corporate/materials', icon: BookOpen, title: 'dashboard.trainer.goMaterials', text: 'dashboard.trainer.goMaterialsText' },
          { to: '/corporate/tracks', icon: GraduationCap, title: 'dashboard.trainer.goTracks', text: 'dashboard.trainer.goTracksText' },
          { to: '/corporate/assessments', icon: HelpCircle, title: 'dashboard.trainer.goAssessments', text: 'dashboard.trainer.goAssessmentsText' },
        ].map((item) => (
          <button key={item.to} type="button" onClick={() => navigate(item.to)} className="text-left p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <item.icon className="w-5 h-5 text-indigo-600 mb-2" aria-hidden="true" />
            <div className="font-semibold text-slate-900 text-sm">{t(item.title)}</div>
            <p className="text-xs text-slate-500 mt-1">{t(item.text)}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const AdminDashboard: React.FC = () => {
  const { t, formatDate, formatNumber, formatPercent } = useI18n();
  const { activeMember } = useAuth();
  const navigate = useNavigate();
  const errorMessage = useApiErrorMessage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [assignments] = useAssignmentsState();
  const { byId } = useDirectory();
  const targetTitle = useTargetTitle();

  useEffect(() => {
    api.get<Summary>('/corporate/dashboard/summary', { noCache: true }).then((res) => (res.success && res.data ? setSummary(res.data) : setError(res.error ?? null)));
  }, []);

  const critical = useMemo(
    () =>
      assignments
        .filter((a) => a.assignee_type === 'member' && ['overdue', 'assigned', 'in_progress'].includes(effectiveStatus(a)))
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 4),
    [assignments],
  );

  const actionItems = summary
    ? [
        { key: 'pendingReviews', count: summary.pending_reviews, icon: FileCheck, to: '/corporate/reviews' },
        { key: 'integrity', count: summary.new_integrity_events, icon: ShieldAlert, to: '/corporate/integrity' },
        { key: 'invited', count: summary.invited_members, icon: UserPlus, to: '/corporate/employees?status=invited' },
        { key: 'suspended', count: summary.suspended_members, icon: AlertCircle, to: '/corporate/employees' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('dashboard.admin.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('dashboard.admin.subtitle', { org: activeMember?.org_name ?? '' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/corporate/reports')}>
            {t('dashboard.admin.exportReport')}
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/corporate/tracks')}>
            <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('dashboard.admin.aiTrack')}
          </Button>
        </div>
      </div>

      {error && <ErrorState message={errorMessage(error, 'errors.loadFailed')} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary ? (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t('dashboard.admin.activeEmployees')}</span>
                <Users className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-3">{formatNumber(summary.active_members)}</div>
              <Badge variant="brand">{t('dashboard.admin.invitedHint', { count: summary.invited_members })}</Badge>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t('dashboard.admin.seats')}</span>
                <CheckCircle2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-3">
                {formatNumber(summary.used_seats)} / {formatNumber(summary.max_seats)}
              </div>
              <Badge variant={summary.used_seats / summary.max_seats > 0.9 ? 'danger' : 'success'}>{formatPercent((summary.used_seats / Math.max(summary.max_seats, 1)) * 100)}</Badge>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t('dashboard.admin.pendingReviews')}</span>
                <FileCheck className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-3">{formatNumber(summary.pending_reviews)}</div>
              <Badge variant={summary.pending_reviews ? 'warning' : 'success'}>{summary.pending_reviews ? t('dashboard.admin.needsAttention') : t('dashboard.admin.allClear')}</Badge>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t('dashboard.admin.departments')}</span>
                <AlertCircle className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-3">{formatNumber(summary.departments)}</div>
              <Badge variant="neutral">{t('dashboard.admin.liveData')}</Badge>
            </Card>
          </>
        ) : (
          !error && <Spinner className="col-span-full py-6" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title={t('dashboard.admin.criticalTitle')} subtitle={t('dashboard.admin.criticalSubtitle')} className="lg:col-span-2" action={<DemoDataBadge />}>
          {critical.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">{t('dashboard.admin.noCritical')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {critical.map((a) => {
                const status = effectiveStatus(a);
                const member = byId(a.assignee_id);
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => navigate('/corporate/assignments')} className="w-full py-3 flex items-center justify-between gap-2 text-sm hover:bg-slate-50 px-2 rounded-lg transition text-left">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{fullName(member) || t('dashboard.unknownMember')}</p>
                        <p className="text-xs text-slate-500 truncate">{targetTitle(a)}</p>
                      </div>
                      <Badge variant={STATUS_VARIANT[status]}>{status === 'overdue' ? t('assignments.status.overdue') : formatDate(a.due_date, 'monthDay')}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={t('dashboard.admin.actionsTitle')} subtitle={t('dashboard.admin.actionsSubtitle')}>
          <ul className="space-y-2 text-xs">
            {actionItems.map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => navigate(item.to)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left">
                  <span className="flex items-center gap-2 text-slate-700">
                    <item.icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    {t(`dashboard.admin.actionItems.${item.key}`)}
                  </span>
                  <Badge variant={item.count ? 'warning' : 'success'}>{formatNumber(item.count)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { activeMember } = useAuth();
  const role = activeMember?.role;
  if (role === 'employee') return <EmployeeDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  if (role === 'trainer') return <TrainerDashboard />;
  return <AdminDashboard />;
};
