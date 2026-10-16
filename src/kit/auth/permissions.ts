// RBAC matrix from API_CONTRACTS.md §16.2. Single source of truth shared by
// route guards, navigation and the mock backend, so the UI can never grant
// something the API refuses (and vice versa).

export const ROLES = ['platform_super_admin', 'org_admin', 'hr_manager', 'manager', 'trainer', 'employee'] as const;
export type Role = (typeof ROLES)[number];

/** Roles an organization admin can assign through the corporate API (never platform_super_admin). */
export const ASSIGNABLE_ROLES: Role[] = ['org_admin', 'hr_manager', 'manager', 'trainer', 'employee'];

export const MEMBER_STATUSES = ['invited', 'active', 'suspended', 'inactive', 'archived'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export type Capability =
  | 'org.settings'
  | 'org.structure'
  | 'members.read'
  | 'members.manage'
  | 'members.export'
  | 'materials.read'
  | 'materials.manage'
  | 'tracks.manage'
  | 'cohorts.manage'
  | 'assignments.read'
  | 'assignments.manage'
  | 'assessments.manage'
  | 'reviews.manage'
  | 'integrity.manage'
  | 'analytics.read'
  | 'reports.export'
  | 'learning.self'
  | 'ai.assistant';

const ADMINS: Role[] = ['platform_super_admin', 'org_admin'];

const MATRIX: Record<Capability, Role[]> = {
  'org.settings': [...ADMINS, 'hr_manager'],
  'org.structure': [...ADMINS, 'hr_manager'],
  'members.read': [...ADMINS, 'hr_manager', 'manager'], // manager: own team only (scoped server-side)
  'members.manage': [...ADMINS, 'hr_manager'],
  'members.export': [...ADMINS, 'hr_manager', 'manager'], // manager: own team only
  'materials.read': [...ROLES],
  'materials.manage': [...ADMINS, 'hr_manager', 'trainer'],
  'tracks.manage': [...ADMINS, 'hr_manager', 'trainer'],
  'cohorts.manage': [...ADMINS, 'hr_manager'],
  'assignments.read': [...ROLES], // employee: self only, manager: team only
  'assignments.manage': [...ADMINS, 'hr_manager', 'manager'], // manager: team only
  'assessments.manage': [...ADMINS, 'hr_manager', 'trainer'],
  'reviews.manage': [...ADMINS, 'hr_manager'],
  'integrity.manage': [...ADMINS, 'hr_manager'],
  'analytics.read': [...ADMINS, 'hr_manager', 'manager'],
  'reports.export': [...ADMINS, 'hr_manager'],
  'learning.self': [...ROLES],
  'ai.assistant': [...ROLES],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[capability].includes(role);
}

export function rolesWith(capability: Capability): Role[] {
  return [...MATRIX[capability]];
}

/** Only org admins may grant the org_admin role; nobody can grant platform_super_admin via the org API. */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (!ASSIGNABLE_ROLES.includes(target)) return false;
  if (target === 'org_admin') return ADMINS.includes(actor);
  return can(actor, 'members.manage');
}
