import { handleRequest } from '../adapter';
import { resetDb } from '../db';
import { resetRateLimits } from '../http';

export interface CallOptions {
  token?: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export async function call(method: string, path: string, opts: CallOptions = {}) {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;
  const res = await handleRequest({
    method,
    path: `/api/v1${path}`,
    query: new URLSearchParams(opts.query || {}),
    headers,
    body: opts.body ?? null,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: res.body as any, text: res.text, headers: res.headers };
}

export async function loginAs(email: string, password = 'Password123!'): Promise<string> {
  const res = await call('POST', '/identity/login', { body: { email, password } });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

export function freshState() {
  localStorage.clear();
  resetDb();
  resetRateLimits();
}

export const ADMIN = 'admin@corp.iclever.ai';
export const HR = 'hr@corp.iclever.ai';
export const MANAGER = 'manager@corp.iclever.ai';
export const TRAINER = 'trainer@corp.iclever.ai';
export const EMPLOYEE = 'employee@corp.iclever.ai';
