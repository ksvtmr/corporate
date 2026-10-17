// Routes API calls to mock handlers. `handleRequest` is transport independent
// (used directly by unit tests); `setupFetchMock` wires it into window.fetch.

import { errorResult, HttpError, MockRequest, MockResult } from './http';
import * as identity from './handlers/identity';
import * as corporate from './handlers/corporate';
import * as learning from './handlers/learning';
import * as ai from './handlers/ai';

type Handler = (req: MockRequest, ...params: string[]) => MockResult | Promise<MockResult>;

const ID = '([A-Za-z0-9_-]{1,64})';
const routes: Array<[string, RegExp, Handler]> = [
  ['POST', /^\/identity\/login$/, identity.login],
  ['POST', /^\/identity\/register$/, identity.register],
  ['GET', /^\/identity\/me$/, identity.me],
  ['POST', /^\/identity\/logout$/, identity.logout],
  ['POST', /^\/identity\/switch-org$/, identity.switchOrg],
  ['PUT', /^\/identity\/me\/preferences$/, identity.updatePreferences],
  ['GET', new RegExp(`^/identity/invitations/${ID}$`), identity.getInvitation],
  ['POST', /^\/identity\/invitations\/accept$/, identity.acceptInvitation],

  ['GET', /^\/corporate\/organizations\/current$/, corporate.getOrganization],
  ['PUT', /^\/corporate\/organizations\/current$/, corporate.updateOrganization],
  ['GET', /^\/corporate\/organizations\/settings$/, corporate.getOrganizationQuota],
  ['GET', /^\/corporate\/audit-log$/, corporate.getAuditLog],
  ['GET', /^\/corporate\/dashboard\/summary$/, corporate.getDashboardSummary],

  ['GET', /^\/corporate\/departments\/?$/, corporate.listDepartments],
  ['GET', /^\/corporate\/departments\/tree$/, corporate.listDepartments],
  ['POST', /^\/corporate\/departments\/?$/, corporate.createDepartment],
  ['PUT', new RegExp(`^/corporate/departments/${ID}$`), corporate.updateDepartment],
  ['DELETE', new RegExp(`^/corporate/departments/${ID}$`), corporate.archiveDepartment],
  ['GET', /^\/corporate\/positions$/, corporate.listPositions],
  ['POST', /^\/corporate\/positions$/, corporate.createPosition],

  ['GET', /^\/corporate\/members\/?$/, corporate.listMembers],
  ['POST', /^\/corporate\/members\/invite$/, corporate.inviteMember],
  ['POST', /^\/corporate\/members\/invite\/resend$/, corporate.resendInvite],
  ['POST', /^\/corporate\/members\/bulk$/, corporate.bulkAction],
  ['POST', /^\/corporate\/members\/import$/, corporate.importMembers],
  ['GET', /^\/corporate\/members\/export$/, corporate.exportMembers],
  ['GET', new RegExp(`^/corporate/members/${ID}$`), corporate.getMember],
  ['PATCH', new RegExp(`^/corporate/members/${ID}$`), corporate.updateMember],
  ['DELETE', new RegExp(`^/corporate/members/${ID}$`), corporate.archiveMember],

  ['GET', /^\/learning\/my\/track$/, learning.getMyTrack],
  ['PUT', /^\/learning\/my\/progress$/, learning.updateMyProgress],
  ['POST', /^\/learning\/my\/complete$/, learning.completeMyTrack],
  ['GET', new RegExp(`^/assessment/tests/${ID}$`), learning.getTest],
  ['GET', new RegExp(`^/assessment/tests/${ID}/attempts/latest$`), learning.getLatestAttempt],
  ['POST', new RegExp(`^/assessment/tests/${ID}/attempts$`), learning.submitAttempt],
  ['POST', /^\/assessment\/integrity-events$/, learning.recordIntegrityEvent],
  ['GET', /^\/assessment\/integrity-events$/, learning.listIntegrityEvents],
  ['POST', new RegExp(`^/assessment/integrity-events/${ID}/resolve$`), learning.resolveIntegrityEvent],
  ['GET', /^\/assessment\/reviews$/, learning.listReviews],
  ['POST', /^\/assessment\/reviews\/approve-all$/, learning.approveAllReviews],
  ['POST', new RegExp(`^/assessment/reviews/${ID}/approve$`), learning.approveReview],
  ['POST', new RegExp(`^/assessment/reviews/${ID}/override$`), learning.overrideReview],

  ['POST', /^\/ai\/assistant\/chat$/, ai.assistantChat],
  ['POST', /^\/ai\/tracks\/generate$/, ai.generateTrack],
  ['POST', /^\/ai\/questions\/generate$/, ai.generateQuestions],
];

/** Strips the API prefix: "/api/v1/corporate/x" → "/corporate/x". */
export function normalizePath(pathname: string): string {
  return pathname.replace(/^\/api(?=\/)/, '').replace(/^\/v1(?=\/)/, '').replace(/\/+$/, '') || '/';
}

export async function handleRequest(req: MockRequest): Promise<MockResult> {
  const method = req.method.toUpperCase();
  const path = normalizePath(req.path);
  let methodMismatch = false;
  for (const [m, re, handler] of routes) {
    const match = re.exec(path);
    if (!match) continue;
    if (m !== method) {
      methodMismatch = true;
      continue;
    }
    try {
      return await handler({ ...req, method, path }, ...match.slice(1));
    } catch (err) {
      if (err instanceof HttpError) return errorResult(err);
      // Never leak stack traces or internals to the client.
      console.error('[Mock API] Unhandled error', err);
      return errorResult(new HttpError(500, 'INTERNAL_ERROR', 'Internal server error'));
    }
  }
  return methodMismatch
    ? errorResult(new HttpError(405, 'METHOD_NOT_ALLOWED', `${method} not allowed for ${path}`))
    : errorResult(new HttpError(404, 'NOT_FOUND', `No endpoint ${method} ${path}`));
}

const SIMULATED_DELAY_MS = 120;

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  new Headers(headers).forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function apiPrefix(): string {
  const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) || '/api';
  return base.replace(/\/+$/, '');
}

export function setupFetchMock(): void {
  const originalFetch = window.fetch.bind(window);
  const prefix = apiPrefix();

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(urlStr, window.location.origin);
    // Only same-origin API calls are intercepted; static assets and third parties pass through.
    if (url.origin !== window.location.origin || !(url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      return originalFetch(input, init);
    }

    let body: unknown = null;
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        return new Response(JSON.stringify({ success: false, error: { code: 'BAD_REQUEST', message: 'Malformed JSON' } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (init?.body instanceof FormData) {
      body = init.body;
    }

    await new Promise((r) => setTimeout(r, SIMULATED_DELAY_MS));
    const result = await handleRequest({
      method: init?.method || 'GET',
      path: url.pathname.slice(prefix.length) || '/',
      query: url.searchParams,
      headers: headersToRecord(init?.headers),
      body,
    });

    if (import.meta.env?.DEV) console.debug(`[Mock API] ${init?.method || 'GET'} ${url.pathname} → ${result.status}`);
    const headers = { 'X-Mock-Engine': 'iClever-Local-Mock', ...(result.headers || {}) };
    if (result.text !== undefined) return new Response(result.text, { status: result.status, headers });
    return new Response(JSON.stringify(result.body ?? null), { status: result.status, headers: { 'Content-Type': 'application/json', ...headers } });
  };
}
