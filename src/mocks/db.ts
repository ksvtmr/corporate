// Mock persistence layer (browser localStorage). Plays the role of the
// database for the offline demo: versioned schema, forward-only migrations
// that preserve existing records, and a single save point.

import {
  DEMO_PASSWORD_HASH,
  initialDepartments,
  initialMembers,
  initialOrganizations,
  initialPositions,
  initialUsers,
  SeedDepartment,
  SeedOrganization,
  SeedOrgMember,
  SeedPosition,
  SeedUser,
} from './data/seed';
import { initialIntegrityEvents, initialReviews, SeedIntegrityEvent, SeedReview } from './data/content';
import type { Role } from '@/kit/auth/permissions';
import { storageKey } from '@/kit/storage';

export const STORAGE_KEY = storageKey('iclever_mock_db');
export const SCHEMA_VERSION = 2;

export interface Invitation {
  token: string;
  organization_id: string;
  member_id: string;
  email: string;
  role: Role;
  department_id?: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
}

export interface Session {
  token: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  expires_at: string;
}

export interface AuditEntry {
  id: string;
  organization_id: string;
  actor_user_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface LearningProgress {
  user_id: string;
  organization_id: string;
  track_id: string;
  completed_block_ids: string[];
  acknowledged: boolean;
  completed_at?: string;
  updated_at: string;
}

export interface TestAttempt {
  id: string;
  client_attempt_id: string;
  user_id: string;
  organization_id: string;
  test_id: string;
  locale: string;
  answers: Record<string, unknown>;
  auto_score: number;
  auto_max: number;
  open_ai_score: number;
  open_max: number;
  score_percent: number;
  passed: boolean;
  topics: Array<{ topic_id: string; earned: number; max: number }>;
  review_id?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface MockDB {
  schema_version: number;
  users: SeedUser[];
  organizations: SeedOrganization[];
  departments: SeedDepartment[];
  positions: SeedPosition[];
  members: SeedOrgMember[];
  invitations: Invitation[];
  sessions: Session[];
  audit_log: AuditEntry[];
  learning_progress: LearningProgress[];
  attempts: TestAttempt[];
  reviews: SeedReview[];
  integrity_events: SeedIntegrityEvent[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function createInitialDb(): MockDB {
  return {
    schema_version: SCHEMA_VERSION,
    users: clone(initialUsers),
    organizations: clone(initialOrganizations),
    departments: clone(initialDepartments),
    positions: clone(initialPositions),
    members: clone(initialMembers),
    invitations: [],
    sessions: [],
    audit_log: [],
    learning_progress: [],
    attempts: [],
    reviews: clone(initialReviews),
    integrity_events: clone(initialIntegrityEvents),
  };
}

/**
 * Migrates a v1 database (no schema_version, plaintext passwords, no tenant
 * column on departments/positions, denormalised department names) to v2.
 * Existing records are kept; only missing structure is added.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): MockDB {
  if (!raw || typeof raw !== 'object') return createInitialDb();
  const version = typeof raw.schema_version === 'number' ? raw.schema_version : 1;
  if (version > SCHEMA_VERSION) return createInitialDb(); // written by a newer build; cannot interpret safely
  if (version === SCHEMA_VERSION) return raw as MockDB;

  const fresh = createInitialDb();
  const seedOrg = (raw.organizations?.[0]?.id as string) || 'org-fintech-01';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users: SeedUser[] = (raw.users || []).map((u: any) => {
    const { password, ...rest } = u;
    return {
      ...rest,
      // v1 stored plaintext passwords. Seed accounts keep the demo password;
      // other accounts must reset (null hash = cannot log in until invited again).
      password_hash: rest.password_hash ?? (password === 'Password123!' ? DEMO_PASSWORD_HASH : null),
    };
  });
  for (const seedUser of fresh.users) {
    if (!users.some((u) => u.email.toLowerCase() === seedUser.email.toLowerCase())) users.push(seedUser);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizations: SeedOrganization[] = (raw.organizations || []).map((o: any) => {
    const seed = fresh.organizations.find((s) => s.id === o.id);
    return {
      plan_name: seed?.plan_name ?? 'Corporate Starter',
      max_seats: seed?.max_seats ?? 50,
      storage_limit_mb: seed?.storage_limit_mb ?? 2048,
      storage_used_mb: seed?.storage_used_mb ?? 0,
      ...o,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const departments: SeedDepartment[] = (raw.departments || []).map((d: any) => {
    const seed = fresh.departments.find((s) => s.id === d.id);
    const { member_count, ...rest } = d;
    return { organization_id: seedOrg, name_i18n: seed?.name_i18n, description_i18n: seed?.description_i18n, ...rest };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positions: SeedPosition[] = (raw.positions || []).map((p: any) => ({ organization_id: seedOrg, ...p }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: SeedOrgMember[] = (raw.members || []).map((m: any) => {
    const { department_name, org_name, org_slug, ...rest } = m;
    return rest;
  });
  for (const seedMember of fresh.members) {
    if (!members.some((m) => m.id === seedMember.id)) members.push(seedMember);
  }

  return {
    ...fresh,
    users,
    organizations: organizations.length ? organizations : fresh.organizations,
    departments: departments.length ? departments : fresh.departments,
    positions: positions.length ? positions : fresh.positions,
    members,
    // v1 invitations lacked tokens bound to members; they cannot be redeemed safely.
    invitations: [],
  };
}

let db: MockDB | null = null;

export function getDb(): MockDB {
  if (db) return db;
  let loaded: MockDB | null = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) loaded = migrate(JSON.parse(stored));
  } catch {
    loaded = null;
  }
  db = loaded ?? createInitialDb();
  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Quota exceeded or storage disabled: keep working in memory.
  }
}

/**
 * Runs `fn` against a working copy and commits only if it completes, so a
 * failing multi-step operation (e.g. bulk update) never leaves partial writes.
 */
export function transaction<T>(fn: (tx: MockDB) => T): T {
  const current = getDb();
  const working = clone(current);
  const result = fn(working);
  db = working;
  saveDb();
  return result;
}

/** Test helper: resets to seed data. */
export function resetDb(): void {
  db = createInitialDb();
  saveDb();
}
