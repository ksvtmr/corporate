import { getDb, saveDb, Session } from '../db';
import { hashPassword, randomId, randomToken, verifyPassword } from '../crypto';
import { memberDto, userDto } from '../dto';
import {
  asObject,
  authenticate,
  badRequest,
  conflict,
  EMAIL_RE,
  HttpError,
  MockRequest,
  MockResult,
  nowIso,
  ok,
  rateLimit,
  str,
  validatePassword,
} from '../http';
import { audit } from '../audit';
import type { MockDB } from '../db';
import { normalizeLocale } from '@/kit/i18n/config';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function createSession(db: MockDB, userId: string, organizationId: string): Session {
  const now = Date.now();
  db.sessions = db.sessions.filter((s) => new Date(s.expires_at).getTime() > now);
  const session: Session = {
    token: randomToken(32),
    user_id: userId,
    organization_id: organizationId,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
  };
  db.sessions.push(session);
  return session;
}

function membershipsFor(db: MockDB, userId: string) {
  return db.members.filter((m) => m.user_id === userId && m.status !== 'archived').map((m) => memberDto(db, m));
}

function sessionPayload(db: MockDB, session: Session) {
  const user = db.users.find((u) => u.id === session.user_id)!;
  const member = db.members.find((m) => m.user_id === user.id && m.organization_id === session.organization_id)!;
  return {
    token: session.token,
    expires_at: session.expires_at,
    user: userDto(user),
    active_member: memberDto(db, member),
    memberships: membershipsFor(db, user.id),
  };
}

export async function login(req: MockRequest): Promise<MockResult> {
  const body = asObject(req.body);
  const email = str(body.email, 'email', { required: true, max: 254 })!.toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  rateLimit(`login:${email}`, 10);

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  // Same response for unknown email and wrong password: no account enumeration.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (!user.is_active) throw new HttpError(403, 'ACCOUNT_DISABLED', 'Account is disabled');

  const requestedOrg = typeof body.organization_id === 'string' ? body.organization_id : undefined;
  const active = db.members.filter((m) => m.user_id === user.id && m.status === 'active');
  const member = (requestedOrg && active.find((m) => m.organization_id === requestedOrg)) || active[0];
  if (!member) {
    const suspended = db.members.some((m) => m.user_id === user.id && m.status === 'suspended');
    throw new HttpError(403, suspended ? 'MEMBERSHIP_SUSPENDED' : 'NO_ACTIVE_MEMBERSHIP', 'No active membership');
  }

  const session = createSession(db, user.id, member.organization_id);
  saveDb();
  return ok(sessionPayload(db, session));
}

export async function register(req: MockRequest): Promise<MockResult> {
  rateLimit('register', 10);
  const body = asObject(req.body);
  const email = str(body.email, 'email', { required: true, max: 254 })!.toLowerCase();
  if (!EMAIL_RE.test(email)) throw badRequest('Invalid email', { field: 'email', rule: 'email' });
  const password = validatePassword(body.password);
  const first_name = str(body.first_name, 'first_name', { required: true, max: 100 })!;
  const last_name = str(body.last_name, 'last_name', { required: true, max: 100 })!;
  const org_name = str(body.org_name, 'org_name', { required: true, max: 120 })!;
  const job_title = str(body.job_title, 'job_title', { max: 120 });
  const locale = normalizeLocale(body.locale) ?? 'ru';

  const db = getDb();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw conflict('USER_EXISTS', 'A user with this email already exists');
  }

  const now = nowIso();
  const domain = email.split('@')[1];
  const user = { id: randomId('usr'), email, password_hash: await hashPassword(password), first_name, last_name, is_active: true, locale, created_at: now };
  const org = {
    id: randomId('org'),
    name: org_name,
    legal_name: org_name,
    domain,
    allowed_domains: [domain],
    brand_color: '#4F46E5',
    timezone: 'UTC+5',
    default_locale: locale,
    plan_name: 'Corporate Starter',
    max_seats: 50,
    storage_limit_mb: 2048,
    storage_used_mb: 0,
  };
  const member = {
    id: randomId('mem'),
    organization_id: org.id,
    user_id: user.id,
    role: 'org_admin' as const,
    status: 'active' as const,
    job_title: job_title || undefined,
    active_assignments_count: 0,
    start_date: now.slice(0, 10),
    created_at: now,
  };
  db.users.push(user);
  db.organizations.push(org);
  db.members.push(member);
  audit(db, { user, org }, 'organization.registered', 'organization', org.id);
  const session = createSession(db, user.id, org.id);
  saveDb();
  return ok(sessionPayload(db, session), 201);
}

export function me(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  const payload = sessionPayload(ctx.db, ctx.session);
  const { token, ...rest } = payload;
  return ok(rest);
}

export function logout(req: MockRequest): MockResult {
  const db = getDb();
  const header = req.headers['authorization'] || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDb();
  return ok({ logged_out: true });
}

export function switchOrg(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  const body = asObject(req.body);
  const orgId = str(body.organization_id, 'organization_id', { required: true })!;
  const target = ctx.db.members.find((m) => m.user_id === ctx.user.id && m.organization_id === orgId);
  // Users may only switch into organizations where they hold an active membership.
  if (!target || target.status !== 'active') throw new HttpError(403, 'FORBIDDEN', 'No active membership in organization');
  ctx.db.sessions = ctx.db.sessions.filter((s) => s.token !== ctx.session.token);
  const session = createSession(ctx.db, ctx.user.id, orgId);
  saveDb();
  return ok(sessionPayload(ctx.db, session));
}

export function updatePreferences(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  const body = asObject(req.body);
  const locale = normalizeLocale(body.locale);
  if (!locale) throw badRequest('Unsupported locale', { field: 'locale', rule: 'locale' });
  ctx.user.locale = locale;
  saveDb();
  return ok(userDto(ctx.user));
}

function findInvitation(db: MockDB, token: string) {
  const inv = db.invitations.find((i) => i.token === token);
  if (!inv || inv.accepted_at) throw new HttpError(404, 'INVITATION_INVALID', 'Invitation not found or already used');
  if (new Date(inv.expires_at).getTime() <= Date.now()) throw new HttpError(410, 'INVITATION_EXPIRED', 'Invitation expired');
  return inv;
}

export function getInvitation(_req: MockRequest, token: string): MockResult {
  const db = getDb();
  const inv = findInvitation(db, token);
  const org = db.organizations.find((o) => o.id === inv.organization_id);
  const user = db.users.find((u) => u.email.toLowerCase() === inv.email.toLowerCase());
  return ok({
    email: inv.email,
    role: inv.role,
    org_name: org?.name,
    requires_existing_password: !!user?.password_hash,
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
  });
}

export async function acceptInvitation(req: MockRequest): Promise<MockResult> {
  rateLimit('invite-accept', 20);
  const body = asObject(req.body);
  const token = str(body.token, 'token', { required: true })!;
  const db = getDb();
  const inv = findInvitation(db, token);
  const user = db.users.find((u) => u.email.toLowerCase() === inv.email.toLowerCase());
  const member = db.members.find((m) => m.id === inv.member_id);
  if (!user || !member) throw new HttpError(404, 'INVITATION_INVALID', 'Invitation target missing');

  if (user.password_hash) {
    // Existing account: prove ownership instead of silently resetting the password.
    if (!(await verifyPassword(String(body.password ?? ''), user.password_hash))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid password');
    }
  } else {
    user.password_hash = await hashPassword(validatePassword(body.password));
    user.first_name = str(body.first_name, 'first_name', { required: true, max: 100 })!;
    user.last_name = str(body.last_name, 'last_name', { required: true, max: 100 })!;
  }
  member.status = 'active';
  inv.accepted_at = nowIso();
  const org = db.organizations.find((o) => o.id === inv.organization_id)!;
  audit(db, { user, org }, 'invitation.accepted', 'member', member.id);
  const session = createSession(db, user.id, inv.organization_id);
  saveDb();
  return ok(sessionPayload(db, session));
}
