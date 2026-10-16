// Guards dynamic (template-literal) translation keys and seed content, which
// the static i18n checker cannot see.
import { describe, expect, it } from 'vitest';
import ru from './loadCatalogue';
import { ASSIGNABLE_ROLES, MEMBER_STATUSES, ROLES } from '@/kit/auth/permissions';
import { lookup } from '@/kit/i18n/core';
import { isLocalizedText, missingLocales } from '@/kit/i18n/localized';
import * as fixtures from '@/demo/fixtures';
import { TRACK_GO_ONBOARDING, TEST_GO_ONBOARDING, KNOWLEDGE_BASE, initialReviews, initialIntegrityEvents } from '@/mocks/data/content';
import { initialDepartments, initialPositions } from '@/mocks/data/seed';

const expectKeys = (prefix: string, values: readonly string[]) => {
  for (const v of values) expect(lookup(ru, `${prefix}.${v}`), `${prefix}.${v}`).toBeDefined();
};

describe('dynamic translation keys exist for every enum value', () => {
  it('roles and statuses', () => {
    expectKeys('roles', ROLES);
    expectKeys('roles.short', ROLES);
    expectKeys('roles.status', MEMBER_STATUSES);
    expectKeys('employees.status.changed', MEMBER_STATUSES);
    expectKeys('employees.status.confirmTitle', MEMBER_STATUSES);
    expectKeys('auth.login.demo.scope', ASSIGNABLE_ROLES);
  });

  it('assignment, track, material and question enums', () => {
    expectKeys('assignments.status', ['assigned', 'in_progress', 'completed', 'overdue', 'cancelled']);
    expectKeys('tracks.types', ['onboarding', 'compliance', 'role_training', 'safety', 'custom']);
    expectKeys('tracks.status', ['draft', 'in_review', 'published', 'archived']);
    expectKeys('tracks.blockTypes', ['material', 'video', 'test', 'open_question', 'flashcards', 'acknowledgment']);
    expectKeys('tracks.rules', ['sequential', 'free', 'must_complete_previous', 'min_score_70']);
    expectKeys('materials.categories', ['development', 'compliance', 'sales', 'training', 'people']);
    expectKeys('materials.status', ['uploaded', 'queued', 'processing', 'ready_for_review', 'published', 'failed']);
    expectKeys('assessments.types', ['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'open_answer', 'matching', 'ordering', 'scenario']);
    expectKeys('flashcards.topics', fixtures.FLASHCARD_TOPICS);
    expectKeys('reports.types', fixtures.REPORT_TYPES);
    expectKeys('integrity.types', ['tab_switch', 'focus_loss', 'copy_paste', 'rapid_answering', 'ai_text_detected']);
    expectKeys('integrity.details', ['tab_switch', 'focus_loss', 'copy_paste', 'rapid_answering', 'ai_text_detected']);
    expectKeys('departments.levels', ['Intern', 'Junior', 'Middle', 'Senior', 'Lead', 'Director']);
  });

  it('every API error code produced by the backend has a localized message', () => {
    const codes = [
      'INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'MEMBERSHIP_SUSPENDED', 'MEMBERSHIP_INACTIVE', 'NO_ACTIVE_MEMBERSHIP', 'UNAUTHORIZED', 'SESSION_EXPIRED',
      'FORBIDDEN', 'TENANT_MISMATCH', 'NOT_FOUND', 'USER_EXISTS', 'MEMBER_EXISTS', 'CODE_EXISTS', 'DOMAIN_NOT_ALLOWED', 'DEPARTMENT_NOT_EMPTY',
      'CANNOT_MODIFY_SELF', 'LAST_ADMIN', 'INVALID_STATUS_TRANSITION', 'SEAT_LIMIT_REACHED', 'INVITATION_INVALID', 'INVITATION_EXPIRED',
      'ALREADY_REVIEWED', 'TRACK_INCOMPLETE', 'RATE_LIMITED', 'UNSUPPORTED_FORMAT', 'VALIDATION_ERROR', 'INTERNAL_ERROR',
    ];
    expectKeys('errors.codes', codes);
    expectKeys('employees.import.rowErrors', ['INVALID_EMAIL', 'DUPLICATE_IN_FILE', 'DOMAIN_NOT_ALLOWED', 'INVALID_ROLE', 'UNKNOWN_DEPARTMENT', 'SEAT_LIMIT_REACHED']);
  });
});

/** Walks any value and collects every LocalizedText object inside it. */
function collectLocalized(value: unknown, path = '', out: Array<[string, Record<string, string>]> = []) {
  if (Array.isArray(value)) value.forEach((v, i) => collectLocalized(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    if (isLocalizedText(value) && Object.keys(value).length > 0) out.push([path, value as Record<string, string>]);
    else for (const [k, v] of Object.entries(value)) collectLocalized(v, `${path}.${k}`, out);
  }
  return out;
}

describe('seed and fixture content is translated into all three languages', () => {
  const sources: Record<string, unknown> = {
    tracks: fixtures.seedTracks(),
    materials: fixtures.seedMaterials(),
    cohorts: fixtures.seedCohorts(),
    questions: fixtures.seedQuestions(),
    tests: fixtures.seedTests(),
    flashcards: fixtures.seedFlashcards(),
    playerTrack: TRACK_GO_ONBOARDING,
    playerTest: TEST_GO_ONBOARDING,
    knowledgeBase: KNOWLEDGE_BASE,
    reviews: initialReviews,
    integrity: initialIntegrityEvents,
    departments: initialDepartments,
    positions: initialPositions,
  };
  for (const [name, value] of Object.entries(sources)) {
    it(name, () => {
      const entries = collectLocalized(value, name);
      expect(entries.length).toBeGreaterThan(0);
      for (const [path, text] of entries) expect(missingLocales(text), path).toEqual([]);
    });
  }
});
