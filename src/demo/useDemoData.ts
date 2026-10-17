import { useEffect, useState } from 'react';
import { api, LocalizedText, useAuth, usePersistentState } from '@iclever/frontend-kit';
import {
  AssignmentStatus,
  DemoAssignment,
  DemoCohort,
  DemoFlashcard,
  DemoMaterial,
  DemoQuestion,
  DemoReportJob,
  DemoTest,
  DemoTrack,
  seedAssignments,
  seedCohorts,
  seedFlashcards,
  seedMaterials,
  seedQuestions,
  seedReportJobs,
  seedTests,
  seedTracks,
  todayIso,
} from './fixtures';

// The seeded demo organization ships with sample content; organizations created
// via registration start empty instead of inheriting another tenant's data.
const SEEDED_ORG = 'org-fintech-01';

function useOrgState<T>(key: string, seed: () => T[]) {
  const { activeMember } = useAuth();
  const orgId = activeMember?.organization_id;
  return usePersistentState<T[]>(key, orgId, () => (orgId === SEEDED_ORG ? seed() : []));
}

export const useTracksState = () => useOrgState<DemoTrack>('tracks', seedTracks);
export const useMaterialsState = () => useOrgState<DemoMaterial>('materials', seedMaterials);
export const useCohortsState = () => useOrgState<DemoCohort>('cohorts', seedCohorts);
export const useAssignmentsState = () => useOrgState<DemoAssignment>('assignments', seedAssignments);
export const useQuestionsState = () => useOrgState<DemoQuestion>('questions', seedQuestions);
export const useTestsState = () => useOrgState<DemoTest>('tests', seedTests);
export const useReportJobsState = () => useOrgState<DemoReportJob>('report_jobs', seedReportJobs);

/** Flashcards are personal: scoped to the user inside the organization. */
export function useFlashcardsState() {
  const { activeMember } = useAuth();
  const scope = activeMember ? `${activeMember.organization_id}:${activeMember.user_id}` : undefined;
  return usePersistentState<DemoFlashcard[]>('flashcards', scope, () => (activeMember?.organization_id === SEEDED_ORG ? seedFlashcards() : []));
}

/** Overdue is derived from the deadline, never stored, so it cannot go stale. */
export function effectiveStatus(a: Pick<DemoAssignment, 'status' | 'due_date'>, today = todayIso()): AssignmentStatus {
  if (a.status === 'completed' || a.status === 'cancelled') return a.status;
  return a.due_date < today ? 'overdue' : a.status;
}

export interface DirectoryMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  job_title?: string;
  department_id?: string;
  department_name?: string;
  department_name_i18n?: LocalizedText;
}

/** Loads the (role-scoped) member directory for name resolution in demo modules. */
export function useDirectory(enabled = true) {
  const { can } = useAuth();
  const allowed = enabled && can('members.read');
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loaded, setLoaded] = useState(!allowed);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      const all: DirectoryMember[] = [];
      for (let page = 1; page <= 10; page++) {
        const res = await api.get<DirectoryMember[]>(`/corporate/members?limit=100&page=${page}`);
        if (!res.success || !res.data) break;
        all.push(...res.data);
        if (page >= (res.meta?.total_pages ?? 1)) break;
      }
      if (!cancelled) {
        setMembers(all);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  return { members, loaded, byId: (id: string) => members.find((m) => m.id === id) };
}

export interface DepartmentRef {
  id: string;
  name: string;
  name_i18n?: LocalizedText;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<DepartmentRef[]>([]);
  useEffect(() => {
    let cancelled = false;
    api.get<DepartmentRef[]>('/corporate/departments').then((res) => {
      if (!cancelled && res.success && res.data) setDepartments(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return departments;
}

export const fullName = (m?: { first_name: string; last_name: string; email?: string }) =>
  m ? `${m.first_name} ${m.last_name}`.trim() || m.email || '' : '';
