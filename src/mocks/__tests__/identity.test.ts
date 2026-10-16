import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, call, EMPLOYEE, freshState, loginAs } from './helpers';
import { getDb, migrate, SCHEMA_VERSION } from '../db';

beforeEach(freshState);

describe('authentication', () => {
  it('logs in a seed account and never returns credentials', async () => {
    const res = await call('POST', '/identity/login', { body: { email: ADMIN, password: 'Password123!' } });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.data.active_member.role).toBe('org_admin');
    const json = JSON.stringify(res.body);
    expect(json).not.toMatch(/password/i);
  });

  it('rejects unknown emails instead of logging in as admin (regression)', async () => {
    const res = await call('POST', '/identity/login', { body: { email: 'nobody-employee@evil.com', password: 'whatever1' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a wrong password with the same error as an unknown email', async () => {
    const res = await call('POST', '/identity/login', { body: { email: ADMIN, password: 'nope12345' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rate-limits repeated login attempts', async () => {
    for (let i = 0; i < 10; i++) await call('POST', '/identity/login', { body: { email: ADMIN, password: 'bad' } });
    const res = await call('POST', '/identity/login', { body: { email: ADMIN, password: 'Password123!' } });
    expect(res.status).toBe(429);
  });

  it('blocks suspended members from logging in', async () => {
    const res = await call('POST', '/identity/login', { body: { email: 'marketing@fintech.kz', password: 'Password123!' } });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MEMBERSHIP_SUSPENDED');
  });

  it('/me requires a valid session (no silent admin fallback)', async () => {
    expect((await call('GET', '/identity/me')).status).toBe(401);
    expect((await call('GET', '/identity/me', { token: 'mock-jwt-token-' + btoa(ADMIN) })).status).toBe(401);
    const token = await loginAs(EMPLOYEE);
    const me = await call('GET', '/identity/me', { token });
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(EMPLOYEE);
    expect(me.body.data.active_member.role).toBe('employee');
  });

  it('logout invalidates the session', async () => {
    const token = await loginAs(ADMIN);
    await call('POST', '/identity/logout', { token });
    expect((await call('GET', '/identity/me', { token })).status).toBe(401);
  });

  it('expired sessions are rejected', async () => {
    const token = await loginAs(ADMIN);
    getDb().sessions.find((s) => s.token === token)!.expires_at = new Date(Date.now() - 1000).toISOString();
    const res = await call('GET', '/identity/me', { token });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('rejects requests whose tenant header does not match the session', async () => {
    const token = await loginAs(ADMIN);
    const res = await call('GET', '/corporate/members', { token, headers: { 'x-organization-id': 'org-retail-02' } });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TENANT_MISMATCH');
  });

  it('cannot switch into an organization without membership (privilege escalation regression)', async () => {
    const token = await loginAs(EMPLOYEE);
    const res = await call('POST', '/identity/switch-org', { token, body: { organization_id: 'org-retail-02' } });
    expect(res.status).toBe(403);
  });

  it('stores the language preference on the user profile', async () => {
    const token = await loginAs(EMPLOYEE);
    expect((await call('PUT', '/identity/me/preferences', { token, body: { locale: 'xx' } })).status).toBe(422);
    const res = await call('PUT', '/identity/me/preferences', { token, body: { locale: 'kk' } });
    expect(res.status).toBe(200);
    const me = await call('GET', '/identity/me', { token });
    expect(me.body.data.user.locale).toBe('kk');
  });
});

describe('registration', () => {
  const payload = { email: 'founder@newco.kz', password: 'Secret123', first_name: 'Айдана', last_name: 'Ержанова', org_name: 'NewCo', locale: 'kk' };

  it('creates user, organization and an active admin membership visible to the org', async () => {
    const res = await call('POST', '/identity/register', { body: payload });
    expect(res.status).toBe(201);
    const token = res.body.data.token;
    const members = await call('GET', '/corporate/members', { token });
    expect(members.status).toBe(200);
    expect(members.body.data).toHaveLength(1);
    expect(members.body.data[0].email).toBe('founder@newco.kz');
    // New tenant must not see another organization's departments (regression).
    const depts = await call('GET', '/corporate/departments', { token });
    expect(depts.body.data).toHaveLength(0);
    const org = await call('GET', '/corporate/organizations/current', { token });
    expect(org.body.data.default_locale).toBe('kk');
  });

  it('rejects duplicate emails with 409', async () => {
    await call('POST', '/identity/register', { body: payload });
    const res = await call('POST', '/identity/register', { body: payload });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_EXISTS');
  });

  it('validates password policy and required fields server-side', async () => {
    expect((await call('POST', '/identity/register', { body: { ...payload, password: 'short' } })).status).toBe(422);
    expect((await call('POST', '/identity/register', { body: { ...payload, email: 'bad' } })).status).toBe(422);
    expect((await call('POST', '/identity/register', { body: { ...payload, org_name: ' ' } })).status).toBe(422);
  });

  it('never stores plaintext passwords', async () => {
    await call('POST', '/identity/register', { body: payload });
    expect(localStorage.getItem('iclever_mock_db')).not.toContain('Secret123');
  });
});

describe('invitations', () => {
  it('invite → accept → login flow activates the member', async () => {
    const admin = await loginAs(ADMIN);
    const inv = await call('POST', '/corporate/members/invite', { token: admin, body: { email: 'new.hire@fintech.kz', role: 'employee', invite_type: 'link' } });
    expect(inv.status).toBe(201);
    const token = new URL(inv.body.data.invite_link).searchParams.get('token')!;

    // Invited users cannot log in before accepting (no default password).
    expect((await call('POST', '/identity/login', { body: { email: 'new.hire@fintech.kz', password: 'Password123!' } })).status).toBe(401);

    const info = await call('GET', `/identity/invitations/${token}`);
    expect(info.body.data.email).toBe('new.hire@fintech.kz');
    const accepted = await call('POST', '/identity/invitations/accept', { body: { token, password: 'Welcome123', first_name: 'Ерлан', last_name: 'Ахметов' } });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.active_member.status).toBe('active');

    // Token is single-use.
    expect((await call('POST', '/identity/invitations/accept', { body: { token, password: 'Welcome123', first_name: 'a', last_name: 'b' } })).status).toBe(404);
    expect((await call('POST', '/identity/login', { body: { email: 'new.hire@fintech.kz', password: 'Welcome123' } })).status).toBe(200);
  });
});

describe('schema migration', () => {
  it('migrates a v1 database without losing records and drops plaintext passwords', () => {
    const v1 = {
      users: [{ id: 'usr-x', email: 'x@fintech.kz', password: 'Password123!', first_name: 'X', last_name: 'Y', is_active: true }],
      organizations: [{ id: 'org-fintech-01', name: 'Fintech', allowed_domains: [], brand_color: '#000000', timezone: 'UTC+5', default_locale: 'ru' }],
      departments: [{ id: 'dept-custom', name: 'Custom', member_count: 99 }],
      positions: [{ id: 'pos-x', title: 'X' }],
      members: [{ id: 'mem-x', organization_id: 'org-fintech-01', user_id: 'usr-x', role: 'employee', status: 'active', department_name: 'Stale', active_assignments_count: 0 }],
      invitations: [],
    };
    const db = migrate(v1);
    expect(db.schema_version).toBe(SCHEMA_VERSION);
    expect(db.departments.find((d) => d.id === 'dept-custom')?.organization_id).toBe('org-fintech-01');
    expect(db.members.find((m) => m.id === 'mem-x')).toBeTruthy();
    expect(JSON.stringify(db.users)).not.toContain('"password"');
    expect(db.users.find((u) => u.id === 'usr-x')?.password_hash).toMatch(/^sha256:/);
  });
});
