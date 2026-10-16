// Response shapes. Department names are joined at read time so renaming a
// department is reflected everywhere immediately (no stale denormalised copies),
// and credentials are never part of any DTO.

import type { MockDB } from './db';
import type { SeedDepartment, SeedOrganization, SeedOrgMember, SeedUser } from './data/seed';

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9а-яёәғқңөұүһі]+/gi, '-').replace(/^-+|-+$/g, '') || 'org';
}

export function userDto(user: SeedUser) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    locale: user.locale ?? null,
  };
}

export function memberDto(db: MockDB, m: SeedOrgMember) {
  const user = db.users.find((u) => u.id === m.user_id);
  const dept = m.department_id ? db.departments.find((d) => d.id === m.department_id && !d.archived_at) : undefined;
  const org = db.organizations.find((o) => o.id === m.organization_id);
  return {
    id: m.id,
    organization_id: m.organization_id,
    user_id: m.user_id,
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    role: m.role,
    status: m.status,
    job_title: m.job_title,
    department_id: dept?.id,
    department_name: dept?.name,
    department_name_i18n: dept?.name_i18n,
    manager_name: m.manager_name ?? dept?.manager_name,
    active_assignments_count: m.active_assignments_count ?? 0,
    start_date: m.start_date,
    org_name: org?.name,
    org_slug: org ? slugify(org.name) : undefined,
  };
}

export function departmentDto(db: MockDB, d: SeedDepartment) {
  return {
    id: d.id,
    parent_id: d.parent_id,
    name: d.name,
    name_i18n: d.name_i18n,
    code: d.code,
    description: d.description,
    description_i18n: d.description_i18n,
    manager_id: d.manager_id,
    manager_name: d.manager_name,
    member_count: db.members.filter(
      (m) => m.department_id === d.id && m.organization_id === d.organization_id && m.status !== 'archived' && m.status !== 'inactive',
    ).length,
  };
}

export function organizationDto(org: SeedOrganization) {
  return {
    id: org.id,
    name: org.name,
    legal_name: org.legal_name,
    domain: org.domain,
    allowed_domains: org.allowed_domains,
    logo_url: org.logo_url,
    brand_color: org.brand_color,
    timezone: org.timezone,
    default_locale: org.default_locale,
  };
}

/** Seats count every member that can hold or claim access. */
export function usedSeats(db: MockDB, orgId: string): number {
  return db.members.filter((m) => m.organization_id === orgId && (m.status === 'active' || m.status === 'invited' || m.status === 'suspended')).length;
}
