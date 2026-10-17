import { Invitation, MockDB, saveDb, transaction } from '../db';
import { randomId, randomToken } from '../crypto';
import { departmentDto, memberDto, organizationDto, usedSeats } from '../dto';
import { audit } from '../audit';
import {
  asObject,
  authenticate,
  AuthContext,
  badRequest,
  conflict,
  DOMAIN_RE,
  EMAIL_RE,
  forbidden,
  HttpError,
  MockRequest,
  MockResult,
  notFound,
  nowIso,
  ok,
  requireCapability,
  sanitizeCsvCell,
  str,
  stripFormula,
} from '../http';
import type { SeedOrgMember } from '../data/seed';
import { canAssignRole, isRole, MEMBER_STATUSES, MemberStatus, Role } from '@/kit/auth/permissions';
import { isLocalizedText, cleanLocalized, LocalizedText } from '@/kit/i18n/localized';
import { normalizeLocale } from '@/kit/i18n/config';

export const ALLOWED_TIMEZONES = ['UTC+6', 'UTC+5', 'UTC+3', 'UTC+0'];
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ADMIN_ROLES: Role[] = ['org_admin', 'platform_super_admin'];

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export function getOrganization(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  return ok(organizationDto(ctx.org));
}

export function updateOrganization(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'org.settings');
  const body = asObject(req.body);

  // Explicit allow-list: id, plan and quota fields can never be changed here.
  const name = str(body.name, 'name', { required: true, max: 120 })!;
  const legal_name = str(body.legal_name, 'legal_name', { max: 200 });
  const brand_color = str(body.brand_color, 'brand_color', { required: true })!;
  if (!/^#[0-9a-fA-F]{6}$/.test(brand_color)) throw badRequest('Invalid color', { field: 'brand_color', rule: 'color' });
  const timezone = str(body.timezone, 'timezone', { required: true })!;
  if (!ALLOWED_TIMEZONES.includes(timezone)) throw badRequest('Unsupported timezone', { field: 'timezone', rule: 'enum' });
  const default_locale = normalizeLocale(body.default_locale);
  if (!default_locale) throw badRequest('Unsupported locale', { field: 'default_locale', rule: 'locale' });
  if (!Array.isArray(body.allowed_domains)) throw badRequest('allowed_domains must be an array', { field: 'allowed_domains', rule: 'type' });
  const domains = Array.from(new Set(body.allowed_domains.map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))));
  if (domains.length > 20) throw badRequest('Too many domains', { field: 'allowed_domains', rule: 'max', max: 20 });
  const invalid = domains.find((d) => !DOMAIN_RE.test(d));
  if (invalid) throw badRequest('Invalid domain', { field: 'allowed_domains', rule: 'domain', value: invalid });

  const before = organizationDto(ctx.org);
  Object.assign(ctx.org, { name, legal_name, brand_color, timezone, default_locale, allowed_domains: domains });
  audit(ctx.db, ctx, 'organization.updated', 'organization', ctx.org.id, { before, after: organizationDto(ctx.org) });
  saveDb();
  return ok(organizationDto(ctx.org));
}

export function getOrganizationQuota(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  return ok({
    plan_name: ctx.org.plan_name,
    max_seats: ctx.org.max_seats,
    used_seats: usedSeats(ctx.db, ctx.org.id),
    storage_limit_mb: ctx.org.storage_limit_mb,
    storage_used_mb: ctx.org.storage_used_mb,
  });
}

export function getAuditLog(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'org.settings');
  const limit = Math.min(Math.max(parseInt(req.query.get('limit') || '20', 10) || 20, 1), 100);
  return ok(ctx.db.audit_log.filter((e) => e.organization_id === ctx.org.id).slice(0, limit));
}

export function getDashboardSummary(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'analytics.read');
  const members = ctx.db.members.filter((m) => m.organization_id === ctx.org.id);
  const count = (s: MemberStatus) => members.filter((m) => m.status === s).length;
  return ok({
    active_members: count('active'),
    invited_members: count('invited'),
    suspended_members: count('suspended'),
    departments: ctx.db.departments.filter((d) => d.organization_id === ctx.org.id && !d.archived_at).length,
    pending_reviews: ctx.db.reviews.filter((r) => r.organization_id === ctx.org.id && r.status === 'pending').length,
    new_integrity_events: ctx.db.integrity_events.filter((e) => e.organization_id === ctx.org.id && e.status === 'new').length,
    max_seats: ctx.org.max_seats,
    used_seats: usedSeats(ctx.db, ctx.org.id),
  });
}

// ---------------------------------------------------------------------------
// Departments & positions
// ---------------------------------------------------------------------------

function orgDepartments(ctx: AuthContext) {
  return ctx.db.departments.filter((d) => d.organization_id === ctx.org.id && !d.archived_at);
}

function readLocalizedName(body: Record<string, unknown>, field: string, defaultLocale: string): { primary: string; i18n?: LocalizedText } {
  const raw = body[`${field}_i18n`];
  let i18n: LocalizedText | undefined;
  if (raw !== undefined && raw !== null) {
    if (!isLocalizedText(raw)) throw badRequest(`${field}_i18n is invalid`, { field: `${field}_i18n`, rule: 'type' });
    i18n = cleanLocalized(raw);
    for (const value of Object.values(i18n)) {
      if (value && value.length > 120) throw badRequest(`${field} is too long`, { field, rule: 'max', max: 120 });
    }
  }
  const primary =
    str(body[field], field, { max: 120 }) ||
    (i18n && (i18n[defaultLocale as keyof LocalizedText] || Object.values(i18n).find(Boolean))) ||
    '';
  if (!primary) throw badRequest(`${field} is required`, { field, rule: 'required' });
  return { primary, i18n: i18n && Object.keys(i18n).length ? i18n : undefined };
}

export function listDepartments(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  return ok(orgDepartments(ctx).map((d) => departmentDto(ctx.db, d)));
}

export function createDepartment(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'org.structure');
  const body = asObject(req.body);
  const { primary, i18n } = readLocalizedName(body, 'name', ctx.org.default_locale);
  const code = str(body.code, 'code', { max: 16 })?.toUpperCase();
  if (code && !/^[A-Z0-9_-]+$/.test(code)) throw badRequest('Invalid code', { field: 'code', rule: 'code' });
  if (code && orgDepartments(ctx).some((d) => d.code === code)) throw conflict('CODE_EXISTS', 'Department code already exists');
  const parent_id = str(body.parent_id, 'parent_id');
  if (parent_id && !orgDepartments(ctx).some((d) => d.id === parent_id)) throw badRequest('Unknown parent', { field: 'parent_id', rule: 'exists' });
  const description = str(body.description, 'description', { max: 1000 });

  const dept = {
    id: randomId('dept'),
    organization_id: ctx.org.id,
    name: primary,
    name_i18n: i18n,
    code,
    parent_id,
    description,
  };
  ctx.db.departments.push(dept);
  audit(ctx.db, ctx, 'department.created', 'department', dept.id, { name: primary });
  saveDb();
  return ok(departmentDto(ctx.db, dept), 201);
}

export function updateDepartment(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'org.structure');
  const dept = orgDepartments(ctx).find((d) => d.id === id);
  if (!dept) throw notFound('Department not found');
  const body = asObject(req.body);
  if (body.name !== undefined || body.name_i18n !== undefined) {
    const { primary, i18n } = readLocalizedName(body, 'name', ctx.org.default_locale);
    dept.name = primary;
    dept.name_i18n = i18n;
  }
  if (body.description !== undefined) dept.description = str(body.description, 'description', { max: 1000 });
  if (body.parent_id !== undefined) {
    const parent = str(body.parent_id, 'parent_id');
    if (parent === dept.id) throw badRequest('Department cannot be its own parent', { field: 'parent_id', rule: 'cycle' });
    if (parent && !orgDepartments(ctx).some((d) => d.id === parent)) throw badRequest('Unknown parent', { field: 'parent_id', rule: 'exists' });
    dept.parent_id = parent;
  }
  audit(ctx.db, ctx, 'department.updated', 'department', dept.id);
  saveDb();
  return ok(departmentDto(ctx.db, dept));
}

export function archiveDepartment(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'org.structure');
  const dept = orgDepartments(ctx).find((d) => d.id === id);
  if (!dept) throw notFound('Department not found');
  const activeMembers = ctx.db.members.filter((m) => m.department_id === id && m.status !== 'archived' && m.status !== 'inactive').length;
  const children = orgDepartments(ctx).filter((d) => d.parent_id === id).length;
  // Archiving a populated department would orphan members; require reassignment first.
  if (activeMembers > 0 || children > 0) {
    throw new HttpError(409, 'DEPARTMENT_NOT_EMPTY', 'Department has members or child departments', { members: activeMembers, children });
  }
  dept.archived_at = nowIso();
  audit(ctx.db, ctx, 'department.archived', 'department', dept.id, { name: dept.name });
  saveDb();
  return ok({ message: 'department archived' });
}

export function listPositions(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  return ok(ctx.db.positions.filter((p) => p.organization_id === ctx.org.id));
}

export const POSITION_LEVELS = ['Intern', 'Junior', 'Middle', 'Senior', 'Lead', 'Director'];

export function createPosition(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'org.structure');
  const body = asObject(req.body);
  const title = str(body.title, 'title', { required: true, max: 120 })!;
  const code = str(body.code, 'code', { max: 24 })?.toUpperCase();
  if (code && ctx.db.positions.some((p) => p.organization_id === ctx.org.id && p.code === code)) throw conflict('CODE_EXISTS', 'Position code already exists');
  const level = str(body.level, 'level');
  if (level && !POSITION_LEVELS.includes(level)) throw badRequest('Invalid level', { field: 'level', rule: 'enum' });
  const pos = { id: randomId('pos'), organization_id: ctx.org.id, title, code, level, description: str(body.description, 'description', { max: 1000 }) };
  ctx.db.positions.push(pos);
  audit(ctx.db, ctx, 'position.created', 'position', pos.id, { title });
  saveDb();
  return ok(pos, 201);
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/** Members visible to the caller: whole org for HR/admins, own department for managers. */
function visibleMembers(ctx: AuthContext): SeedOrgMember[] {
  const all = ctx.db.members.filter((m) => m.organization_id === ctx.org.id);
  if (ctx.member.role === 'manager') {
    return ctx.member.department_id ? all.filter((m) => m.department_id === ctx.member.department_id) : [ctx.member];
  }
  return all;
}

const SORT_FIELDS = ['name', 'job_title', 'department_name', 'role', 'status', 'active_assignments_count', 'start_date'];

export function listMembers(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.read');
  const q = req.query;
  const page = Math.max(parseInt(q.get('page') || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.get('limit') || '20', 10) || 20, 1), 100);
  const search = (q.get('search') || '').trim().toLowerCase();
  const role = q.get('role') || '';
  const status = q.get('status') || '';
  const department = q.get('department_id') || '';
  const sort = SORT_FIELDS.includes(q.get('sort') || '') ? q.get('sort')! : 'name';
  const dir = q.get('dir') === 'desc' ? -1 : 1;

  let list = visibleMembers(ctx).map((m) => memberDto(ctx.db, m));
  // Archived members are hidden unless explicitly requested.
  list = status ? list.filter((m) => m.status === status) : list.filter((m) => m.status !== 'archived');
  if (role) list = list.filter((m) => m.role === role);
  if (department) list = list.filter((m) => m.department_id === department);
  if (search) {
    list = list.filter((m) =>
      `${m.first_name} ${m.last_name} ${m.email} ${m.job_title || ''}`.toLowerCase().includes(search),
    );
  }
  const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });
  list.sort((a, b) => {
    if (sort === 'active_assignments_count') return (a.active_assignments_count - b.active_assignments_count) * dir;
    const va = sort === 'name' ? `${a.first_name} ${a.last_name}` : String((a as Record<string, unknown>)[sort] ?? '');
    const vb = sort === 'name' ? `${b.first_name} ${b.last_name}` : String((b as Record<string, unknown>)[sort] ?? '');
    return collator.compare(va, vb) * dir;
  });

  const total = list.length;
  const total_pages = Math.max(Math.ceil(total / limit), 1);
  return ok(list.slice((page - 1) * limit, page * limit), 200, { page, limit, total_items: total, total_pages });
}

function findVisibleMember(ctx: AuthContext, id: string): SeedOrgMember {
  const m = visibleMembers(ctx).find((x) => x.id === id);
  // 404 (not 403) for other tenants' records avoids leaking their existence.
  if (!m) throw notFound('Member not found');
  return m;
}

export function getMember(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.read');
  return ok(memberDto(ctx.db, findVisibleMember(ctx, id)));
}

function activeAdminsExcept(db: MockDB, orgId: string, excludeIds: string[]): number {
  return db.members.filter((m) => m.organization_id === orgId && m.role === 'org_admin' && m.status === 'active' && !excludeIds.includes(m.id)).length;
}

function revokeSessions(db: MockDB, userId: string, orgId: string) {
  db.sessions = db.sessions.filter((s) => !(s.user_id === userId && s.organization_id === orgId));
}

interface MemberChange {
  status?: MemberStatus;
  role?: Role;
  department_id?: string | null;
  job_title?: string;
}

/** Applies a validated change to one member inside a transaction. Throws on any business-rule violation. */
function applyMemberChange(db: MockDB, ctx: AuthContext, target: SeedOrgMember, change: MemberChange, removingAdminIds: string[]) {
  const isSelf = target.id === ctx.member.id;
  if (isSelf && (change.status !== undefined || change.role !== undefined)) {
    throw conflict('CANNOT_MODIFY_SELF', 'You cannot change your own role or status');
  }
  if (target.role === 'org_admin' && !ADMIN_ROLES.includes(ctx.member.role) && (change.role || change.status)) {
    throw forbidden('Only organization admins can modify another admin');
  }
  if (target.role === 'platform_super_admin') throw forbidden('Platform administrators are managed outside the organization');

  const before = { role: target.role, status: target.status, department_id: target.department_id };

  if (change.role !== undefined && change.role !== target.role) {
    if (!canAssignRole(ctx.member.role, change.role)) throw forbidden(`Cannot assign role ${change.role}`);
    target.role = change.role;
  }
  if (change.status !== undefined && change.status !== target.status) {
    const allowed: Record<MemberStatus, MemberStatus[]> = {
      active: ['suspended', 'inactive', 'archived'],
      suspended: ['active', 'inactive', 'archived'],
      inactive: ['active', 'archived'],
      invited: ['archived'],
      archived: [],
    };
    if (!allowed[target.status].includes(change.status)) {
      throw new HttpError(409, 'INVALID_STATUS_TRANSITION', `Cannot change status from ${target.status} to ${change.status}`, { from: target.status, to: change.status });
    }
    target.status = change.status;
    if (change.status !== 'active') revokeSessions(db, target.user_id, target.organization_id);
    if (change.status === 'archived') {
      db.invitations = db.invitations.filter((i) => i.member_id !== target.id || !!i.accepted_at);
    }
  }
  if (change.department_id !== undefined) {
    if (change.department_id && !db.departments.some((d) => d.id === change.department_id && d.organization_id === ctx.org.id && !d.archived_at)) {
      throw badRequest('Unknown department', { field: 'department_id', rule: 'exists' });
    }
    target.department_id = change.department_id || undefined;
  }
  if (change.job_title !== undefined) target.job_title = change.job_title;

  const losesAdmin = before.role === 'org_admin' && before.status === 'active' && (target.role !== 'org_admin' || target.status !== 'active');
  if (losesAdmin) removingAdminIds.push(target.id);

  audit(db, ctx, 'member.updated', 'member', target.id, { before, after: { role: target.role, status: target.status, department_id: target.department_id } });
}

function parseChange(body: Record<string, unknown>): MemberChange {
  const change: MemberChange = {};
  if (body.status !== undefined) {
    if (!(MEMBER_STATUSES as readonly unknown[]).includes(body.status)) throw badRequest('Invalid status', { field: 'status', rule: 'enum' });
    change.status = body.status as MemberStatus;
  }
  if (body.role !== undefined) {
    if (!isRole(body.role)) throw badRequest('Invalid role', { field: 'role', rule: 'enum' });
    change.role = body.role;
  }
  if (body.department_id !== undefined) change.department_id = body.department_id === null ? null : str(body.department_id, 'department_id') ?? null;
  if (body.job_title !== undefined) change.job_title = str(body.job_title, 'job_title', { max: 120 }) ?? '';
  return change;
}

export function updateMember(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.manage');
  const change = parseChange(asObject(req.body));
  findVisibleMember(ctx, id);
  const updated = transaction((db) => {
    const target = db.members.find((m) => m.id === id)!;
    const removing: string[] = [];
    applyMemberChange(db, { ...ctx, db, member: db.members.find((m) => m.id === ctx.member.id)! }, target, change, removing);
    if (removing.length && activeAdminsExcept(db, ctx.org.id, removing) === 0) {
      throw conflict('LAST_ADMIN', 'The organization must keep at least one active admin');
    }
    return memberDto(db, target);
  });
  return ok(updated);
}

export function archiveMember(req: MockRequest, id: string): MockResult {
  return updateMember({ ...req, body: { status: 'archived' } }, id);
}

export function bulkAction(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.manage');
  const body = asObject(req.body);
  const action = body.action;
  const ids = Array.isArray(body.member_ids) ? Array.from(new Set(body.member_ids.map(String))) : [];
  if (ids.length === 0) throw badRequest('member_ids is required', { field: 'member_ids', rule: 'required' });
  if (ids.length > 500) throw badRequest('Too many members', { field: 'member_ids', rule: 'max', max: 500 });

  let change: MemberChange;
  if (action === 'assign_department') {
    const target = str(body.target_id, 'target_id', { required: true })!;
    change = { department_id: target };
  } else if (action === 'change_role') {
    if (!isRole(body.new_role)) throw badRequest('Invalid role', { field: 'new_role', rule: 'enum' });
    change = { role: body.new_role };
  } else if (action === 'deactivate') {
    change = { status: 'inactive' };
  } else {
    throw badRequest('Unknown action', { field: 'action', rule: 'enum' });
  }

  const visible = new Set(visibleMembers(ctx).map((m) => m.id));
  const unknown = ids.filter((id) => !visible.has(id));
  if (unknown.length) throw notFound('Some members were not found');

  // All-or-nothing: a single rule violation rolls back the whole batch.
  const affected = transaction((db) => {
    const removing: string[] = [];
    const actor = db.members.find((m) => m.id === ctx.member.id)!;
    let count = 0;
    for (const id of ids) {
      const target = db.members.find((m) => m.id === id)!;
      if (change.status && target.status === change.status) continue;
      applyMemberChange(db, { ...ctx, db, member: actor }, target, change, removing);
      count++;
    }
    if (removing.length && activeAdminsExcept(db, ctx.org.id, removing) === 0) {
      throw conflict('LAST_ADMIN', 'The organization must keep at least one active admin');
    }
    return count;
  });
  return ok({ affected_rows: affected });
}

function assertDomainAllowed(ctx: AuthContext, email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (ctx.org.allowed_domains.length > 0 && !ctx.org.allowed_domains.includes(domain)) {
    throw new HttpError(422, 'DOMAIN_NOT_ALLOWED', 'Email domain is not allowed for this organization', { domain });
  }
}

function inviteLink(token: string): string {
  const base = typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}` : '/';
  return `${base}invite?token=${token}`;
}

function createInvitation(db: MockDB, ctx: AuthContext, member: SeedOrgMember, email: string): Invitation {
  db.invitations = db.invitations.filter((i) => i.member_id !== member.id || !!i.accepted_at);
  const now = Date.now();
  const inv: Invitation = {
    token: randomToken(20),
    organization_id: ctx.org.id,
    member_id: member.id,
    email,
    role: member.role,
    department_id: member.department_id,
    created_by: ctx.user.id,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + INVITE_TTL_MS).toISOString(),
  };
  db.invitations.push(inv);
  return inv;
}

function ensureSeat(db: MockDB, ctx: AuthContext, extra = 1) {
  if (usedSeats(db, ctx.org.id) + extra > ctx.org.max_seats) {
    throw new HttpError(409, 'SEAT_LIMIT_REACHED', 'Subscription seat limit reached', { max_seats: ctx.org.max_seats });
  }
}

export function inviteMember(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.manage');
  const body = asObject(req.body);
  const email = str(body.email, 'email', { required: true, max: 254 })!.toLowerCase();
  if (!EMAIL_RE.test(email)) throw badRequest('Invalid email', { field: 'email', rule: 'email' });
  if (!isRole(body.role) || !canAssignRole(ctx.member.role, body.role)) throw forbidden('Role cannot be assigned');
  const role = body.role;
  const department_id = str(body.department_id, 'department_id');
  if (department_id && !orgDepartments(ctx).some((d) => d.id === department_id)) throw badRequest('Unknown department', { field: 'department_id', rule: 'exists' });
  assertDomainAllowed(ctx, email);
  const inviteType = body.invite_type === 'link' ? 'link' : 'email';

  const result = transaction((db) => {
    let user = db.users.find((u) => u.email.toLowerCase() === email);
    let member = user ? db.members.find((m) => m.user_id === user!.id && m.organization_id === ctx.org.id) : undefined;
    if (member && member.status !== 'archived') throw conflict('MEMBER_EXISTS', 'This person is already a member of the organization');
    ensureSeat(db, ctx);
    if (!user) {
      user = { id: randomId('usr'), email, password_hash: null, first_name: '', last_name: '', is_active: true, created_at: nowIso() };
      db.users.push(user);
    }
    if (member) {
      Object.assign(member, { status: 'invited', role, department_id });
    } else {
      member = {
        id: randomId('mem'),
        organization_id: ctx.org.id,
        user_id: user.id,
        role,
        status: 'invited',
        department_id,
        active_assignments_count: 0,
        start_date: nowIso().slice(0, 10),
        created_at: nowIso(),
      };
      db.members.push(member);
    }
    const inv = createInvitation(db, ctx, member, email);
    audit(db, ctx, 'member.invited', 'member', member.id, { email, role, invite_type: inviteType });
    return { inv, member: memberDto(db, member) };
  });

  // Email delivery is not available in the offline demo; the link is always returned
  // to administrators so the invite can be shared manually.
  return ok({ invitation_id: result.inv.token.slice(0, 8), invite_link: inviteLink(result.inv.token), email_delivery: inviteType === 'email' ? 'simulated' : 'not_requested', member: result.member }, 201);
}

export function resendInvite(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.manage');
  const body = asObject(req.body);
  const memberId = str(body.member_id, 'member_id', { required: true })!;
  const target = findVisibleMember(ctx, memberId);
  if (target.status !== 'invited') throw new HttpError(409, 'INVALID_STATUS_TRANSITION', 'Member is not in invited status');
  const user = ctx.db.users.find((u) => u.id === target.user_id)!;
  const inv = createInvitation(ctx.db, ctx, target, user.email);
  audit(ctx.db, ctx, 'member.invite_resent', 'member', target.id);
  saveDb();
  return ok({ invite_link: inviteLink(inv.token) });
}

// ---------------------------------------------------------------------------
// CSV import / export
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      if (inQuotes && line[j + 1] === '"') {
        cur += '"';
        j++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export const IMPORT_MAX_ROWS = 500;

function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

export async function importMembers(req: MockRequest): Promise<MockResult> {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.manage');
  let csv = '';
  if (req.body instanceof FormData) {
    const file = req.body.get('file');
    if (file instanceof Blob) {
      const name = (file as File).name || '';
      if (file.size > 2 * 1024 * 1024) throw badRequest('File too large', { field: 'file', rule: 'max_size', max_mb: 2 });
      if (!/\.csv$/i.test(name)) throw new HttpError(415, 'UNSUPPORTED_FORMAT', 'Only CSV files are supported');
      csv = await readBlobText(file);
    }
  }
  if (!csv.trim()) throw badRequest('File is empty', { field: 'file', rule: 'required' });

  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  if (!header.includes('email')) throw badRequest('Missing email column', { field: 'file', rule: 'header' });
  const rows = lines.slice(1, IMPORT_MAX_ROWS + 1);
  const truncated = lines.length - 1 > IMPORT_MAX_ROWS;

  const report = transaction((db) => {
    const results: Array<{ row_number: number; email: string; status: 'created' | 'updated' | 'failed'; error_code?: string }> = [];
    const seen = new Set<string>();
    let created = 0;
    let updated = 0;
    let failed = 0;
    const fail = (row_number: number, email: string, error_code: string) => {
      results.push({ row_number, email, status: 'failed', error_code });
      failed++;
    };

    rows.forEach((line, idx) => {
      const rowNum = idx + 2; // 1-based, header is row 1
      if (!line.trim()) return;
      const cols = parseCsvLine(line);
      const row: Record<string, string> = {};
      header.forEach((h, i) => (row[h] = stripFormula(cols[i] || '')));

      const email = row.email.toLowerCase();
      if (!email || !EMAIL_RE.test(email)) return fail(rowNum, email, 'INVALID_EMAIL');
      if (seen.has(email)) return fail(rowNum, email, 'DUPLICATE_IN_FILE');
      seen.add(email);
      const domain = email.split('@')[1];
      if (ctx.org.allowed_domains.length && !ctx.org.allowed_domains.includes(domain)) return fail(rowNum, email, 'DOMAIN_NOT_ALLOWED');
      const role = (row.role || 'employee') as Role;
      if (!isRole(role) || !canAssignRole(ctx.member.role, role)) return fail(rowNum, email, 'INVALID_ROLE');
      let deptId: string | undefined;
      if (row.department_code) {
        const dept = db.departments.find((d) => d.organization_id === ctx.org.id && !d.archived_at && d.code === row.department_code.toUpperCase());
        if (!dept) return fail(rowNum, email, 'UNKNOWN_DEPARTMENT');
        deptId = dept.id;
      }
      const jobTitle = row.job_title ? row.job_title.slice(0, 120) : undefined;

      let user = db.users.find((u) => u.email.toLowerCase() === email);
      const existing = user ? db.members.find((m) => m.user_id === user!.id && m.organization_id === ctx.org.id && m.status !== 'archived') : undefined;
      if (existing) {
        // Idempotent re-import: update profile fields, never role/status of existing members.
        if (jobTitle) existing.job_title = jobTitle;
        if (deptId) existing.department_id = deptId;
        results.push({ row_number: rowNum, email, status: 'updated' });
        updated++;
        return;
      }
      if (usedSeats(db, ctx.org.id) + 1 > ctx.org.max_seats) return fail(rowNum, email, 'SEAT_LIMIT_REACHED');
      if (!user) {
        user = {
          id: randomId('usr'),
          email,
          password_hash: null,
          first_name: (row.first_name || '').slice(0, 100),
          last_name: (row.last_name || '').slice(0, 100),
          is_active: true,
          created_at: nowIso(),
        };
        db.users.push(user);
      }
      const member: SeedOrgMember = {
        id: randomId('mem'),
        organization_id: ctx.org.id,
        user_id: user.id,
        role,
        status: 'invited',
        job_title: jobTitle,
        department_id: deptId,
        active_assignments_count: 0,
        start_date: nowIso().slice(0, 10),
        created_at: nowIso(),
      };
      db.members.push(member);
      createInvitation(db, ctx, member, email);
      results.push({ row_number: rowNum, email, status: 'created' });
      created++;
    });
    audit(db, ctx, 'members.imported', 'organization', ctx.org.id, { created, updated, failed });
    return { total_rows: results.length, created_count: created, updated_count: updated, failed_count: failed, truncated, row_results: results };
  });
  return ok(report);
}

export function exportMembers(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'members.export');
  const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Job Title', 'Department', 'Active Assignments'];
  const rows = visibleMembers(ctx)
    .filter((m) => m.status !== 'archived')
    .map((m) => {
      const d = memberDto(ctx.db, m);
      return [d.id, d.first_name, d.last_name, d.email, d.role, d.status, d.job_title, d.department_name, d.active_assignments_count].map(sanitizeCsvCell).join(',');
    });
  audit(ctx.db, ctx, 'members.exported', 'organization', ctx.org.id, { rows: rows.length });
  saveDb();
  const date = new Date().toISOString().slice(0, 10);
  return {
    status: 200,
    text: '﻿' + [headers.map(sanitizeCsvCell).join(','), ...rows].join('\r\n'),
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="employees_${date}.csv"` },
  };
}

