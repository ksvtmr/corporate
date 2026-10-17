import type { MockDB } from './db';
import type { AuthContext } from './http';
import { randomId } from './crypto';

/** Appends an audit-log entry for an administrative action (kept to the last 500 per DB). */
export function audit(
  db: MockDB,
  ctx: Pick<AuthContext, 'user' | 'org'>,
  action: string,
  target_type: string,
  target_id: string,
  details?: Record<string, unknown>,
): void {
  db.audit_log.unshift({
    id: randomId('aud'),
    organization_id: ctx.org.id,
    actor_user_id: ctx.user.id,
    actor_name: `${ctx.user.first_name} ${ctx.user.last_name}`.trim(),
    action,
    target_type,
    target_id,
    details,
    created_at: new Date().toISOString(),
  });
  if (db.audit_log.length > 500) db.audit_log.length = 500;
}
