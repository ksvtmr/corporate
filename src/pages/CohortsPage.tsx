import React, { useMemo, useState } from 'react';
import { Plus, Search, UserPlus, Trash2, ArrowRight } from 'lucide-react';
import { Badge, Button, cleanLocalized, ConfirmDialog, DemoDataBadge, EmptyState, LocalizedText, LocalizedTextInput, Modal, TranslationFallbackMark, useI18n, useToast } from '@iclever/frontend-kit';
import { DemoCohort, todayIso } from '../demo/fixtures';
import { fullName, useCohortsState, useDepartments, useDirectory, useTracksState } from '../demo/useDemoData';

export const CohortsPage: React.FC = () => {
  const { t, lt, locale, formatDate, formatPercent, compare } = useI18n();
  const toast = useToast();
  const [cohorts, setCohorts] = useCohortsState();
  const [tracks] = useTracksState();
  const departments = useDepartments();
  const { members, byId } = useDirectory();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'members_desc' | 'created_desc' | 'name_asc'>('members_desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState<LocalizedText>({});
  const [description, setDescription] = useState<LocalizedText>({});
  const [dept, setDept] = useState('');
  const [trackId, setTrackId] = useState('');
  const [formError, setFormError] = useState('');

  const [addMemberId, setAddMemberId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [changeTrackOpen, setChangeTrackOpen] = useState(false);
  const [newTrack, setNewTrack] = useState('');

  const selected = cohorts.find((c) => c.id === selectedId) ?? null;
  const publishedTracks = tracks.filter((x) => x.status === 'published');
  const deptName = (id: string | null) => {
    if (!id) return t('cohorts.allDepartments');
    const d = departments.find((x) => x.id === id);
    return d ? lt(d.name_i18n ?? d.name) : '—';
  };
  const trackName = (id: string | null) => (id ? lt(tracks.find((x) => x.id === id)?.title) || t('cohorts.trackRemoved') : t('cohorts.noTrack'));
  const update = (id: string, patch: (c: DemoCohort) => DemoCohort) => setCohorts((prev) => prev.map((c) => (c.id === id ? patch(c) : c)));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanLocalized(name);
    if (Object.keys(clean).length === 0) return setFormError(t('cohorts.form.nameRequired'));
    const cohort: DemoCohort = {
      id: `coh-${Date.now().toString(36)}`,
      name: clean,
      description: cleanLocalized(description),
      department_id: dept || null,
      track_id: trackId || null,
      created_at: todayIso(),
      member_ids: [],
      progress: {},
    };
    setCohorts((prev) => [cohort, ...prev]);
    setIsCreateOpen(false);
    setName({});
    setDescription({});
    setSelectedId(cohort.id);
    toast.success(t('cohorts.toast.created', { name: lt(clean) }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cohorts
      .filter((c) => {
        const text = [c.name, c.description].map((v) => (typeof v === 'string' ? v : Object.values(v).join(' '))).join(' ').toLowerCase();
        return (!q || text.includes(q)) && (deptFilter === 'all' || c.department_id === deptFilter);
      })
      .sort((a, b) => {
        if (sortOrder === 'name_asc') return compare(lt(a.name), lt(b.name));
        if (sortOrder === 'created_desc') return b.created_at.localeCompare(a.created_at);
        return b.member_ids.length - a.member_ids.length;
      });
  }, [cohorts, search, deptFilter, sortOrder, lt, compare]);

  const candidates = selected ? members.filter((m) => !selected.member_ids.includes(m.id) && (m.status === 'active' || m.status === 'invited')) : [];
  const fieldClass = 'w-full rounded-lg border border-slate-300 p-2 text-xs bg-white';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {t('cohorts.title')} <DemoDataBadge />
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('cohorts.subtitle')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setFormError(''); setIsCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
          {t('cohorts.actions.create')}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">{t('common.demoData.localNotice')}</p>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('common.actions.search')}
            placeholder={t('cohorts.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select aria-label={t('cohorts.form.department')} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700">
            <option value="all">{t('common.filters.allDepartments')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {lt(d.name_i18n ?? d.name)}
              </option>
            ))}
          </select>
          <select aria-label={t('common.filters.sortBy')} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-medium">
            <option value="members_desc">{t('cohorts.sort.members')}</option>
            <option value="created_desc">{t('cohorts.sort.newest')}</option>
            <option value="name_asc">{t('cohorts.sort.name')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={cohorts.length === 0 ? t('cohorts.empty') : t('common.states.emptyFiltered')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className="text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">{deptName(c.department_id)}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">
                    {lt(c.name)}
                    <TranslationFallbackMark value={c.name} />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{lt(c.description)}</p>
                </div>
                <Badge variant="info">{t('common.units.people', { count: c.member_ids.length })}</Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {t('cohorts.card.track')} <strong className="text-slate-800">{trackName(c.track_id)}</strong>
                </span>
                <span className="text-indigo-600 font-medium flex items-center shrink-0">
                  {t('cohorts.card.members')} <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Modal isOpen onClose={() => setSelectedId(null)} title={t('cohorts.detail.title', { name: lt(selected.name) })} size="lg">
          <div className="space-y-4 text-xs text-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">{t('cohorts.detail.track')}</span>
                <div className="font-semibold text-slate-900 mt-0.5">{trackName(selected.track_id)}</div>
                <div className="text-[10px] text-slate-400">{t('cohorts.detail.created', { date: formatDate(selected.created_at) })}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewTrack(selected.track_id ?? '');
                  setChangeTrackOpen(true);
                }}
              >
                {t('cohorts.actions.changeTrack')}
              </Button>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">{t('cohorts.detail.members', { count: selected.member_ids.length })}</h4>
              <form
                className="flex flex-col sm:flex-row gap-2 mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!addMemberId || selected.member_ids.includes(addMemberId)) return;
                  update(selected.id, (c) => ({ ...c, member_ids: [...c.member_ids, addMemberId], progress: { ...c.progress, [addMemberId]: 0 } }));
                  toast.success(t('cohorts.toast.memberAdded', { name: fullName(byId(addMemberId)) }));
                  setAddMemberId('');
                }}
              >
                <label htmlFor="add-member" className="sr-only">
                  {t('cohorts.detail.addMember')}
                </label>
                <select id="add-member" value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)} className={fieldClass}>
                  <option value="">{t('cohorts.detail.chooseEmployee')}</option>
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {fullName(m)} — {m.job_title || m.email}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" type="submit" disabled={!addMemberId}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  {t('cohorts.detail.addMember')}
                </Button>
              </form>
              {selected.member_ids.length === 0 ? (
                <p className="text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">{t('cohorts.detail.noMembers')}</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                  {selected.member_ids.map((id) => {
                    const m = byId(id);
                    const progress = selected.progress[id] ?? 0;
                    return (
                      <li key={id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{fullName(m) || t('cohorts.detail.unknownMember')}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {m?.email} {m?.job_title ? `• ${m.job_title}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-[11px] font-semibold text-indigo-600">{formatPercent(progress)}</div>
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-indigo-600 h-full" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <button type="button" onClick={() => setRemoveTarget(id)} className="text-slate-400 hover:text-red-600 p-1 transition" aria-label={t('cohorts.detail.remove', { name: fullName(m) })}>
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedId(null)}>
                {t('common.actions.close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!removeTarget}
        title={t('cohorts.removeMember.title')}
        message={t('cohorts.removeMember.message', { name: fullName(byId(removeTarget ?? '')) })}
        confirmLabel={t('common.actions.remove')}
        onConfirm={() => {
          if (selected && removeTarget) {
            update(selected.id, (c) => ({ ...c, member_ids: c.member_ids.filter((x) => x !== removeTarget) }));
            toast.success(t('cohorts.toast.memberRemoved'));
          }
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      <Modal isOpen={changeTrackOpen && !!selected} onClose={() => setChangeTrackOpen(false)} title={t('cohorts.changeTrack.title')} size="sm">
        <div className="space-y-4 text-xs py-2">
          <div>
            <label htmlFor="new-track" className="block font-medium text-slate-700 mb-1">
              {t('cohorts.changeTrack.label')}
            </label>
            <select id="new-track" value={newTrack} onChange={(e) => setNewTrack(e.target.value)} className={fieldClass}>
              <option value="">{t('cohorts.noTrack')}</option>
              {publishedTracks.map((x) => (
                <option key={x.id} value={x.id}>
                  {lt(x.title)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setChangeTrackOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (selected) update(selected.id, (c) => ({ ...c, track_id: newTrack || null }));
                setChangeTrackOpen(false);
                toast.success(t('cohorts.toast.trackChanged', { track: trackName(newTrack || null) }));
              }}
            >
              {t('common.actions.save')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t('cohorts.form.title')} size="md">
        <form onSubmit={handleCreate} className="space-y-4 text-xs py-2">
          {formError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {formError}
            </div>
          )}
          <LocalizedTextInput label={t('cohorts.form.name')} value={name} onChange={setName} requiredLocale={locale} placeholder={t('cohorts.form.namePlaceholder')} maxLength={150} />
          <LocalizedTextInput label={t('cohorts.form.description')} value={description} onChange={setDescription} placeholder={t('cohorts.form.descriptionPlaceholder')} maxLength={300} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="coh-dept" className="block text-xs font-medium text-slate-700 mb-1">
                {t('cohorts.form.department')}
              </label>
              <select id="coh-dept" value={dept} onChange={(e) => setDept(e.target.value)} className={fieldClass}>
                <option value="">{t('cohorts.allDepartments')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lt(d.name_i18n ?? d.name)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="coh-track" className="block text-xs font-medium text-slate-700 mb-1">
                {t('cohorts.form.track')}
              </label>
              <select id="coh-track" value={trackId} onChange={(e) => setTrackId(e.target.value)} className={fieldClass}>
                <option value="">{t('cohorts.noTrack')}</option>
                {publishedTracks.map((x) => (
                  <option key={x.id} value={x.id}>
                    {lt(x.title)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">{t('cohorts.form.membersHint')}</p>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('cohorts.actions.create')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
