import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, User, Users, Bell, CalendarPlus } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DemoDataBadge, EmptyState, Modal, Table, useAuth, useI18n, useToast } from '@iclever/frontend-kit';
import { daysFromNow, DemoAssignment, todayIso } from '../demo/fixtures';
import { effectiveStatus, fullName, useAssignmentsState, useCohortsState, useDirectory, useTestsState, useTracksState } from '../demo/useDemoData';

const STATUS_VARIANT = { assigned: 'info', in_progress: 'warning', completed: 'success', overdue: 'danger', cancelled: 'neutral' } as const;

export const AssignmentsPage: React.FC = () => {
  const { t, lt, formatDate, formatPercent, compare } = useI18n();
  const { user, activeMember } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assignments, setAssignments] = useAssignmentsState();
  const [tracks] = useTracksState();
  const [tests] = useTestsState();
  const [cohorts] = useCohortsState();
  const { members, byId } = useDirectory();
  const isManager = activeMember?.role === 'manager';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'due_asc' | 'progress_asc' | 'progress_desc' | 'name_asc'>('due_asc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigneeType, setAssigneeType] = useState<'member' | 'cohort'>('member');
  const [assigneeId, setAssigneeId] = useState('');
  const [target, setTarget] = useState('');
  const [dueDate, setDueDate] = useState(() => daysFromNow(14));
  const [isMandatory, setIsMandatory] = useState(true);
  const [formError, setFormError] = useState('');

  const [cancelTarget, setCancelTarget] = useState<DemoAssignment | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const visibleCohorts = isManager ? cohorts.filter((c) => c.department_id === activeMember?.department_id) : cohorts;
  const activeMembers = members.filter((m) => m.status === 'active' && m.id !== activeMember?.id);
  const assignableTargets = [
    ...tracks.filter((x) => x.status === 'published').map((x) => ({ value: `track:${x.id}`, label: lt(x.title) })),
    ...tests.map((x) => ({ value: `test:${x.id}`, label: `${lt(x.title)} (${t('assignments.testSuffix')})` })),
  ];

  // Prefill from deep links (?assignee=<member id>&track=<track id>|test=<test id>).
  useEffect(() => {
    const prefillAssignee = searchParams.get('assignee');
    const prefillTrack = searchParams.get('track');
    const prefillTest = searchParams.get('test');
    if (!prefillAssignee && !prefillTrack && !prefillTest) return;
    if (prefillAssignee) {
      setAssigneeType('member');
      setAssigneeId(prefillAssignee);
    }
    if (prefillTrack) setTarget(`track:${prefillTrack}`);
    if (prefillTest) setTarget(`test:${prefillTest}`);
    setIsCreateOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const assigneeName = (a: DemoAssignment) => {
    if (a.assignee_type === 'cohort') return lt(cohorts.find((c) => c.id === a.assignee_id)?.name) || t('assignments.unknownCohort');
    return fullName(byId(a.assignee_id)) || t('assignments.unknownMember');
  };
  const targetName = (a: Pick<DemoAssignment, 'target_type' | 'target_id'>) => {
    const item = a.target_type === 'track' ? tracks.find((x) => x.id === a.target_id) : tests.find((x) => x.id === a.target_id);
    return item ? lt(item.title) : t('assignments.unknownTarget');
  };

  // Managers only see their own team's (or department cohort's) assignments.
  const scoped = useMemo(
    () =>
      assignments.filter((a) =>
        !isManager ? true : a.assignee_type === 'member' ? members.some((m) => m.id === a.assignee_id) : visibleCohorts.some((c) => c.id === a.assignee_id),
      ),
    [assignments, isManager, members, visibleCohorts],
  );

  const resetForm = () => {
    setIsCreateOpen(false);
    setAssigneeId('');
    setTarget('');
    setDueDate(daysFromNow(14));
    setIsMandatory(true);
    setFormError('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!assigneeId) return setFormError(t('assignments.form.errors.assignee'));
    if (!target) return setFormError(t('assignments.form.errors.target'));
    if (!dueDate || dueDate < todayIso()) return setFormError(t('assignments.form.errors.pastDate'));
    const [targetType, targetId] = target.split(':') as ['track' | 'test', string];
    const duplicate = assignments.some((a) => a.assignee_type === assigneeType && a.assignee_id === assigneeId && a.target_id === targetId && !['completed', 'cancelled'].includes(a.status));
    if (duplicate) return setFormError(t('assignments.form.errors.duplicate'));
    const item: DemoAssignment = {
      id: `asg-${Date.now().toString(36)}`,
      assignee_type: assigneeType,
      assignee_id: assigneeId,
      target_type: targetType,
      target_id: targetId,
      status: 'assigned',
      due_date: dueDate,
      assigned_by: fullName(user ?? undefined),
      progress_percent: 0,
      is_mandatory: isMandatory,
      created_at: todayIso(),
    };
    setAssignments((prev) => [item, ...prev]);
    toast.success(t('assignments.toast.created', { program: targetName(item), assignee: assigneeName(item) }));
    resetForm();
  };

  const handleRemind = (a: DemoAssignment) => {
    setAssignments((prev) => prev.map((x) => (x.id === a.id ? { ...x, reminders_sent: (x.reminders_sent ?? 0) + 1 } : x)));
    toast.success(t('assignments.toast.reminded', { assignee: assigneeName(a), date: formatDate(a.due_date) }));
  };

  const handleExtend = (a: DemoAssignment) => {
    const base = a.due_date < todayIso() ? todayIso() : a.due_date;
    const [y, m, d] = base.split('-').map(Number);
    const next = daysFromNow(7, new Date(y, m - 1, d));
    setAssignments((prev) => prev.map((x) => (x.id === a.id ? { ...x, due_date: next } : x)));
    toast.success(t('assignments.toast.extended', { date: formatDate(next) }));
  };

  const handleCancel = () => {
    if (!cancelTarget || cancelReason.trim().length < 3) return;
    setAssignments((prev) =>
      prev.map((x) => (x.id === cancelTarget.id ? { ...x, status: 'cancelled', cancel_reason: cancelReason.trim(), cancelled_by: fullName(user ?? undefined), cancelled_at: new Date().toISOString() } : x)),
    );
    toast.success(t('assignments.toast.cancelled'));
    setCancelTarget(null);
    setCancelReason('');
  };

  const q = search.trim().toLowerCase();
  const rows = scoped
    .map((a) => ({ a, status: effectiveStatus(a), name: assigneeName(a), program: targetName(a) }))
    .filter(({ a, status, name, program }) => {
      const matchSearch = !q || `${name} ${program}`.toLowerCase().includes(q);
      return matchSearch && (statusFilter === 'all' || status === statusFilter) && (typeFilter === 'all' || a.assignee_type === typeFilter);
    })
    .sort((x, y) => {
      if (sortOrder === 'due_asc') return x.a.due_date.localeCompare(y.a.due_date);
      if (sortOrder === 'progress_asc') return x.a.progress_percent - y.a.progress_percent;
      if (sortOrder === 'progress_desc') return y.a.progress_percent - x.a.progress_percent;
      return compare(x.name, y.name);
    });

  const counts = scoped.reduce(
    (acc, a) => {
      acc[effectiveStatus(a)]++;
      return acc;
    },
    { assigned: 0, in_progress: 0, completed: 0, overdue: 0, cancelled: 0 } as Record<string, number>,
  );
  const selectClass = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {t('assignments.title')} <DemoDataBadge />
          </h1>
          <p className="text-xs text-slate-500 mt-1">{isManager ? t('assignments.subtitleManager') : t('assignments.subtitle')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
          {t('assignments.actions.new')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['total', scoped.length, 'text-slate-900'],
          ['in_progress', counts.in_progress, 'text-amber-600'],
          ['overdue', counts.overdue, 'text-red-600'],
          ['completed', counts.completed, 'text-green-600'],
        ].map(([key, value, tone]) => (
          <div key={key as string} className="bg-white p-3 rounded-xl border border-slate-200">
            <div className={`text-lg font-bold ${tone}`}>{value as number}</div>
            <div className="text-[11px] text-slate-500">{t(`assignments.kpi.${key}`)}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('common.actions.search')}
            placeholder={t('assignments.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select aria-label={t('common.filters.type')} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('common.filters.allTypes')}</option>
            <option value="member">{t('assignments.type.member')}</option>
            <option value="cohort">{t('assignments.type.cohort')}</option>
          </select>
          <select aria-label={t('common.filters.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('common.filters.allStatuses')}</option>
            {(['in_progress', 'assigned', 'overdue', 'completed', 'cancelled'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`assignments.status.${s}`)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.sortBy')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className={`${selectClass} font-medium`}>
            <option value="due_asc">{t('assignments.sort.due')}</option>
            <option value="progress_asc">{t('assignments.sort.progressAsc')}</option>
            <option value="progress_desc">{t('assignments.sort.progressDesc')}</option>
            <option value="name_asc">{t('assignments.sort.name')}</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={scoped.length === 0 ? t('assignments.empty') : t('common.states.emptyFiltered')} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table headers={[t('assignments.columns.assignee'), t('assignments.columns.program'), t('assignments.columns.due'), t('assignments.columns.progress'), t('assignments.columns.status'), t('assignments.columns.actions')]}>
            {rows.map(({ a, status, name, program }) => (
              <tr key={a.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                      {a.assignee_type === 'member' ? <User className="w-3.5 h-3.5" aria-label={t('assignments.type.member')} /> : <Users className="w-3.5 h-3.5" aria-label={t('assignments.type.cohort')} />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{name}</div>
                      <div className="text-[10px] text-slate-400">{t('assignments.assignedBy', { name: a.assigned_by })}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-medium text-slate-800">{program}</div>
                  {a.is_mandatory && <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{t('assignments.mandatory')}</span>}
                  {a.status === 'cancelled' && a.cancel_reason && (
                    <p className="text-[10px] text-slate-400 mt-1">{t('assignments.cancelledNote', { reason: a.cancel_reason, name: a.cancelled_by ?? '' })}</p>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <time dateTime={a.due_date} className={`font-medium ${status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                    {formatDate(a.due_date)}
                  </time>
                </td>
                <td className="p-3 w-36">
                  <div className="flex items-center space-x-2">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={a.progress_percent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="bg-indigo-600 h-full" style={{ width: `${a.progress_percent}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600">{formatPercent(a.progress_percent)}</span>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[status]}>{t(`assignments.status.${status}`)}</Badge>
                </td>
                <td className="p-3 text-right">
                  {status !== 'completed' && status !== 'cancelled' && (
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" onClick={() => handleRemind(a)} className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded" title={t('assignments.actions.remind')} aria-label={t('assignments.actions.remind')}>
                        <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => handleExtend(a)} className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded" title={t('assignments.actions.extend')} aria-label={t('assignments.actions.extend')}>
                        <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => setCancelTarget(a)} className="text-slate-500 hover:text-red-600 text-xs p-1">
                        {t('assignments.actions.cancel')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={resetForm} title={t('assignments.form.title')} size="md">
        <form onSubmit={handleCreate} className="space-y-4 text-xs py-2">
          {formError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {formError}
            </div>
          )}
          <fieldset className="flex flex-wrap items-center gap-4">
            <legend className="sr-only">{t('assignments.form.assigneeType')}</legend>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" name="asgType" checked={assigneeType === 'member'} onChange={() => { setAssigneeType('member'); setAssigneeId(''); }} />
              <span className="text-slate-700 font-medium">{t('assignments.type.member')}</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" name="asgType" checked={assigneeType === 'cohort'} onChange={() => { setAssigneeType('cohort'); setAssigneeId(''); }} />
              <span className="text-slate-700 font-medium">{t('assignments.type.cohort')}</span>
            </label>
          </fieldset>
          <div>
            <label htmlFor="asg-assignee" className="block text-xs font-medium text-slate-700 mb-1">
              {assigneeType === 'member' ? t('assignments.form.member') : t('assignments.form.cohort')}
            </label>
            <select id="asg-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white" required>
              <option value="">{t('assignments.form.choose')}</option>
              {assigneeType === 'member'
                ? activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {fullName(m)} — {m.job_title || m.email}
                    </option>
                  ))
                : visibleCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lt(c.name)}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label htmlFor="asg-target" className="block text-xs font-medium text-slate-700 mb-1">
              {t('assignments.form.program')}
            </label>
            <select id="asg-target" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white" required>
              <option value="">{t('assignments.form.choose')}</option>
              {assignableTargets.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">{t('assignments.form.onlyPublished')}</p>
          </div>
          <div>
            <label htmlFor="asg-due" className="block text-xs font-medium text-slate-700 mb-1">
              {t('assignments.form.due')}
            </label>
            <input id="asg-due" type="date" min={todayIso()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white" required />
          </div>
          <label className="flex items-center space-x-2 pt-1 cursor-pointer">
            <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} className="rounded text-indigo-600" />
            <span className="text-xs text-slate-700 font-medium">{t('assignments.form.mandatory')}</span>
          </label>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={resetForm}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('assignments.form.submit')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        title={t('assignments.cancel.title')}
        message={cancelTarget ? t('assignments.cancel.message', { program: targetName(cancelTarget), assignee: assigneeName(cancelTarget) }) : ''}
        confirmLabel={t('assignments.cancel.confirm')}
        confirmDisabled={cancelReason.trim().length < 3}
        onConfirm={handleCancel}
        onCancel={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
      >
        <div>
          <label htmlFor="cancel-reason" className="block text-slate-700 font-medium mb-1">
            {t('assignments.cancel.reason')}
          </label>
          <textarea
            id="cancel-reason"
            rows={2}
            maxLength={500}
            placeholder={t('assignments.cancel.reasonPlaceholder')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-xs"
            required
          />
          <p className="text-[11px] text-slate-400 mt-1">{t('assignments.cancel.reasonHint')}</p>
        </div>
      </ConfirmDialog>
    </div>
  );
};
