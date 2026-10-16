// Transport-independent request/response model for the mock backend. The
// fetch interceptor converts real Requests into MockRequest, which also lets
// unit tests call `handleRequest` directly.

import { getDb, MockDB, Session } from './db';
import type { SeedOrganization, SeedOrgMember, SeedUser } from './data/seed';
import { can, Capability } from '@/kit/auth/permissions';
import { Locale, normalizeLocale } from '@/kit/i18n/config';
import { isStrongPassword } from '@/kit/forms/validation';

export interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  /** Lower-cased header names. */
  headers: Record<string, string>;
  body: unknown;
}

export interface MockResult {
  status: number;
  body?: unknown;
  text?: string;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok(data: unknown, status = 200, meta?: Record<string, unknown>): MockResult {
  return { status, body: { success: true, data, ...(meta ? { meta } : {}) } };
}

export function errorResult(err: HttpError): MockResult {
  return {
    status: err.status,
    body: { success: false, error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
    headers: err.status === 429 ? { 'Retry-After': '60' } : undefined,
  };
}

export const badRequest = (message: string, details?: unknown) => new HttpError(422, 'VALIDATION_ERROR', message, details);
export const notFound = (message = 'Not found') => new HttpError(404, 'NOT_FOUND', message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, 'FORBIDDEN', message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);

export interface AuthContext {
  db: MockDB;
  session: Session;
  user: SeedUser;
  member: SeedOrgMember;
  org: SeedOrganization;
  locale: Locale;
}

export function requestLocale(req: MockRequest, fallback: Locale = 'ru'): Locale {
  const fromBody = (req.body as { locale?: unknown } | null)?.locale;
  return normalizeLocale(fromBody) ?? normalizeLocale(req.headers['accept-language']) ?? fallback;
}

export function bearerToken(req: MockRequest): string | null {
  const header = req.headers['authorization'] || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/** Resolves the session, user and active membership; throws 401/403 on any inconsistency. */
export function authenticate(req: MockRequest): AuthContext {
  const db = getDb();
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'Missing bearer token');
  const session = db.sessions.find((s) => s.token === token);
  if (!session) throw new HttpError(401, 'UNAUTHORIZED', 'Invalid session');
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.sessions = db.sessions.filter((s) => s.token !== token);
    throw new HttpError(401, 'SESSION_EXPIRED', 'Session expired');
  }
  const user = db.users.find((u) => u.id === session.user_id);
  if (!user || !user.is_active) throw new HttpError(401, 'UNAUTHORIZED', 'User is disabled');
  const member = db.members.find((m) => m.user_id === user.id && m.organization_id === session.organization_id);
  if (!member || member.status !== 'active') throw new HttpError(403, 'MEMBERSHIP_INACTIVE', 'Membership is not active');
  const org = db.organizations.find((o) => o.id === session.organization_id);
  if (!org) throw new HttpError(401, 'UNAUTHORIZED', 'Organization not found');

  // Tenant header must agree with the session: prevents cross-tenant requests.
  const tenantHeader = req.headers['x-organization-id'];
  if (tenantHeader && tenantHeader !== org.id) throw new HttpError(403, 'TENANT_MISMATCH', 'Organization header does not match session');

  return { db, session, user, member, org, locale: requestLocale(req, org.default_locale) };
}

export function requireCapability(ctx: AuthContext, capability: Capability): void {
  if (!can(ctx.member.role, capability)) throw forbidden(`Role ${ctx.member.role} lacks ${capability}`);
}

// ---------------------------------------------------------------------------
// Rate limiting (API_CONTRACTS.md §16.5) — sliding one-minute window.
// ---------------------------------------------------------------------------
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs = 60_000): void {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    throw new HttpError(429, 'RATE_LIMITED', 'Too many requests');
  }
  hits.push(now);
  buckets.set(key, hits);
}

export function resetRateLimits(): void {
  buckets.clear();
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
export { EMAIL_RE, DOMAIN_RE } from '@/kit/forms/validation';

export function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body) || body instanceof FormData) {
    throw new HttpError(400, 'BAD_REQUEST', 'JSON object body expected');
  }
  return body as Record<string, unknown>;
}

export function str(value: unknown, field: string, opts: { required?: boolean; max?: number; min?: number } = {}): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw badRequest(`${field} is required`, { field, rule: 'required' });
    return undefined;
  }
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`, { field, rule: 'type' });
  const trimmed = value.trim();
  if (opts.required && !trimmed) throw badRequest(`${field} is required`, { field, rule: 'required' });
  if (opts.min !== undefined && trimmed.length < opts.min) throw badRequest(`${field} is too short`, { field, rule: 'min', min: opts.min });
  if (opts.max !== undefined && trimmed.length > opts.max) throw badRequest(`${field} is too long`, { field, rule: 'max', max: opts.max });
  return trimmed;
}

/** Password policy shared with the registration form: ≥ 8 chars, a letter and a digit. */
export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || !isStrongPassword(password)) {
    throw badRequest('Password does not meet the policy', { field: 'password', rule: 'password_policy' });
  }
  return password;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { sanitizeCsvCell } from '@/kit/export/csv';

/** Removes formula prefixes from imported values (repeatedly, e.g. "=+cmd"). */
export function stripFormula(value: string): string {
  return value.replace(/^[=+\-@\t\r']+/, '').trim();
}
