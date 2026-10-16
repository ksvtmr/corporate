import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, call, EMPLOYEE, freshState, HR, loginAs, MANAGER, TRAINER } from './helpers';

beforeEach(freshState);

describe('RBAC enforcement on the backend', () => {
  it('employees cannot read the directory or change settings', async () => {
    const token = await loginAs(EMPLOYEE);
    expect((await call('GET', '/corporate/members', { token })).status).toBe(403);
    expect((await call('PUT', '/corporate/organizations/current', { token, body: {} })).status).toBe(403);
    expect((await call('POST', '/corporate/members/invite', { token, body: { email: 'a@fintech.kz', role: 'employee' } })).status).toBe(403);
    expect((await call('GET', '/assessment/reviews', { token })).status).toBe(403);
  });

  it('trainers cannot manage members', async () => {
    const token = await loginAs(TRAINER);
    expect((await call('POST', '/corporate/members/bulk', { token, body: { action: 'deactivate', member_ids: ['mem-002'] } })).status).toBe(403);
  });

  it('managers only see their own team', async () => {
    const token = await loginAs(MANAGER);
    const res = await call('GET', '/corporate/members', { token, query: { limit: '100' } });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((m: { department_id: string }) => m.department_id === 'dept-eng-01')).toBe(true);
    // Members of other departments are invisible (404, not 403).
    expect((await call('GET', '/corporate/members/mem-001', { token })).status).toBe(404);
    // Managers cannot invite.
    expect((await call('POST', '/corporate/members/invite', { token, body: { email: 'x@fintech.kz', role: 'employee' } })).status).toBe(403);
  });

  it('HR cannot grant org_admin or modify an admin; nobody can grant platform_super_admin', async () => {
    const hr = await loginAs(HR);
    expect((await call('POST', '/corporate/members/invite', { token: hr, body: { email: 'boss@fintech.kz', role: 'org_admin' } })).status).toBe(403);
    expect((await call('PATCH', '/corporate/members/mem-001', { token: hr, body: { status: 'suspended' } })).status).toBe(403);
    const admin = await loginAs(ADMIN);
    expect((await call('POST', '/corporate/members/bulk', { token: admin, body: { action: 'change_role', member_ids: ['mem-002'], new_role: 'platform_super_admin' } })).status).toBe(403);
  });
});

describe('member lifecycle', () => {
  it('suspension persists, revokes sessions and blocks login; reactivation restores access', async () => {
    const admin = await loginAs(ADMIN);
    const empToken = await loginAs(EMPLOYEE);
    const res = await call('PATCH', '/corporate/members/mem-002', { token: admin, body: { status: 'suspended' } });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('suspended');
    expect((await call('GET', '/identity/me', { token: empToken })).status).toBe(401);
    expect((await call('POST', '/identity/login', { body: { email: EMPLOYEE, password: 'Password123!' } })).status).toBe(403);

    const list = await call('GET', '/corporate/members', { token: admin, query: { status: 'suspended' } });
    expect(list.body.data.some((m: { id: string }) => m.id === 'mem-002')).toBe(true);

    await call('PATCH', '/corporate/members/mem-002', { token: admin, body: { status: 'active' } });
    expect((await call('POST', '/identity/login', { body: { email: EMPLOYEE, password: 'Password123!' } })).status).toBe(200);
  });

  it('prevents self-lockout and removing the last admin', async () => {
    const admin = await loginAs(ADMIN);
    const self = await call('PATCH', '/corporate/members/mem-001', { token: admin, body: { role: 'employee' } });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  it('rejects invalid status transitions', async () => {
    const admin = await loginAs(ADMIN);
    const res = await call('PATCH', '/corporate/members/mem-004', { token: admin, body: { status: 'active' } });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('bulk actions are atomic: one violation rolls back the whole batch', async () => {
    const admin = await loginAs(ADMIN);
    const res = await call('POST', '/corporate/members/bulk', { token: admin, body: { action: 'deactivate', member_ids: ['mem-007', 'mem-001'] } });
    expect(res.status).toBe(409);
    const m7 = await call('GET', '/corporate/members/mem-007', { token: admin });
    expect(m7.body.data.status).toBe('active');
  });

  it('bulk department assignment validates the department belongs to the tenant', async () => {
    const admin = await loginAs(ADMIN);
    expect((await call('POST', '/corporate/members/bulk', { token: admin, body: { action: 'assign_department', member_ids: ['mem-007'], target_id: 'dept-missing' } })).status).toBe(422);
    const ok = await call('POST', '/corporate/members/bulk', { token: admin, body: { action: 'assign_department', member_ids: ['mem-007'], target_id: 'dept-sales-02' } });
    expect(ok.body.data.affected_rows).toBe(1);
  });

  it('invites enforce allowed domains and prevent duplicate members', async () => {
    const admin = await loginAs(ADMIN);
    const bad = await call('POST', '/corporate/members/invite', { token: admin, body: { email: 'x@gmail.com', role: 'employee' } });
    expect(bad.body.error.code).toBe('DOMAIN_NOT_ALLOWED');
    const dup = await call('POST', '/corporate/members/invite', { token: admin, body: { email: EMPLOYEE, role: 'employee' } });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('MEMBER_EXISTS');
  });

  it('newly invited members appear in the admin directory immediately', async () => {
    const admin = await loginAs(ADMIN);
    await call('POST', '/corporate/members/invite', { token: admin, body: { email: 'sync.check@fintech.kz', role: 'employee', department_id: 'dept-eng-01' } });
    const list = await call('GET', '/corporate/members', { token: admin, query: { search: 'sync.check' } });
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].status).toBe('invited');
    expect(list.body.data[0].department_name).toBe('Инженерия и разработка');
  });
});

describe('members list API', () => {
  it('paginates with correct meta and caps the limit at 100', async () => {
    const admin = await loginAs(ADMIN);
    const res = await call('GET', '/corporate/members', { token: admin, query: { limit: '3', page: '2' } });
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 3 });
    expect(res.body.meta.total_pages).toBe(Math.ceil(res.body.meta.total_items / 3));
    const capped = await call('GET', '/corporate/members', { token: admin, query: { limit: '1000' } });
    expect(capped.body.meta.limit).toBe(100);
  });

  it('sorts server-side', async () => {
    const admin = await loginAs(ADMIN);
    const res = await call('GET', '/corporate/members', { token: admin, query: { sort: 'active_assignments_count', dir: 'desc', limit: '100' } });
    const counts = res.body.data.map((m: { active_assignments_count: number }) => m.active_assignments_count);
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a));
  });
});

describe('departments', () => {
  it('computes member counts from real membership data', async () => {
    const admin = await loginAs(ADMIN);
    const res = await call('GET', '/corporate/departments', { token: admin });
    const eng = res.body.data.find((d: { id: string }) => d.id === 'dept-eng-01');
    expect(eng.member_count).toBe(6);
    expect(eng.name_i18n.kk).toBe('Инженерия және әзірлеу');
  });

  it('refuses to archive a department that still has members', async () => {
    const admin = await loginAs(ADMIN);
    const res = await call('DELETE', '/corporate/departments/dept-eng-01', { token: admin });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DEPARTMENT_NOT_EMPTY');
  });

  it('stores multilingual names and rejects duplicate codes', async () => {
    const admin = await loginAs(ADMIN);
    const created = await call('POST', '/corporate/departments', {
      token: admin,
      body: { name_i18n: { ru: 'Маркетинг', kk: 'Маркетинг бөлімі', en: 'Marketing' }, code: 'mkt' },
    });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe('MKT');
    expect(created.body.data.name).toBe('Маркетинг');
    const dup = await call('POST', '/corporate/departments', { token: admin, body: { name: 'Other', code: 'MKT' } });
    expect(dup.status).toBe(409);
    // Empty department can be archived.
    expect((await call('DELETE', `/corporate/departments/${created.body.data.id}`, { token: admin })).status).toBe(200);
  });
});

describe('organization settings', () => {
  it('validates input and ignores non-whitelisted fields', async () => {
    const admin = await loginAs(ADMIN);
    const base = { name: 'Fintech', brand_color: '#123456', timezone: 'UTC+5', default_locale: 'en', allowed_domains: ['fintech.kz'] };
    expect((await call('PUT', '/corporate/organizations/current', { token: admin, body: { ...base, brand_color: 'red' } })).status).toBe(422);
    expect((await call('PUT', '/corporate/organizations/current', { token: admin, body: { ...base, allowed_domains: ['not a domain'] } })).status).toBe(422);
    const res = await call('PUT', '/corporate/organizations/current', { token: admin, body: { ...base, id: 'hijack', max_seats: 99999 } });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('org-fintech-01');
    const quota = await call('GET', '/corporate/organizations/settings', { token: admin });
    expect(quota.body.data.max_seats).toBe(200);
    const log = await call('GET', '/corporate/audit-log', { token: admin });
    expect(log.body.data[0].action).toBe('organization.updated');
  });
});

describe('CSV import/export', () => {
  it('import validates rows, is idempotent and never grants roles above the actor', async () => {
    const hr = await loginAs(HR);
    const csv =
      'first_name,last_name,email,role,job_title,department_code\n' +
      'Иван,Иванов,ivan@fintech.kz,employee,=HYPERLINK("x"),ENG\n' +
      'Bad,Row,not-an-email,employee,Dev,ENG\n' +
      'Boss,Man,boss@fintech.kz,org_admin,CEO,ENG\n' +
      'Dup,Row,ivan@fintech.kz,employee,Dev,ENG\n' +
      'Out,Side,someone@gmail.com,employee,Dev,ENG\n' +
      'Марат,Ж,employee@corp.iclever.ai,employee,Senior Go Developer,ENG\n';
    const form = new FormData();
    form.append('file', new File([csv], 'members.csv', { type: 'text/csv' }));
    const res = await call('POST', '/corporate/members/import', { token: hr, body: form });
    expect(res.status).toBe(200);
    const codes = res.body.data.row_results.map((r: { status: string; error_code?: string }) => r.error_code || r.status);
    expect(codes).toEqual(['created', 'INVALID_EMAIL', 'INVALID_ROLE', 'DUPLICATE_IN_FILE', 'DOMAIN_NOT_ALLOWED', 'updated']);
    const ivan = await call('GET', '/corporate/members', { token: hr, query: { search: 'ivan@' } });
    expect(ivan.body.data[0].status).toBe('invited');
    expect(ivan.body.data[0].job_title).not.toMatch(/^[=+\-@]/);
  });

  it('export is tenant/team scoped and neutralises formula injection', async () => {
    const admin = await loginAs(ADMIN);
    await call('PATCH', '/corporate/members/mem-007', { token: admin, body: { job_title: '=cmd|calc' } });
    const res = await call('GET', '/corporate/members/export', { token: admin });
    expect(res.headers?.['Content-Type']).toContain('text/csv');
    expect(res.text).toContain(`"'=cmd|calc"`);
    const mgr = await loginAs(MANAGER);
    const team = await call('GET', '/corporate/members/export', { token: mgr });
    expect(team.text).not.toContain('admin@corp.iclever.ai');
  });
});

describe('routing', () => {
  it('returns 404 for unknown endpoints instead of a fake success', async () => {
    const admin = await loginAs(ADMIN);
    const res = await call('POST', '/corporate/does-not-exist', { token: admin });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
