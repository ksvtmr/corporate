import { LearningProgress, saveDb, TestAttempt, transaction } from '../db';
import { randomId } from '../crypto';
import { audit } from '../audit';
import { CONTENT_TESTS, CONTENT_TRACKS, ContentQuestion, ContentTest, IntegrityEventType, SeedReview } from '../data/content';
import {
  asObject,
  authenticate,
  AuthContext,
  badRequest,
  HttpError,
  MockRequest,
  MockResult,
  notFound,
  nowIso,
  ok,
  rateLimit,
  requireCapability,
  str,
} from '../http';
import { normalizeLocale } from '@/kit/i18n/config';
import type { LocalizedText } from '@/kit/i18n/localized';

// ---------------------------------------------------------------------------
// Track & progress
// ---------------------------------------------------------------------------

function getProgress(ctx: AuthContext, trackId: string): LearningProgress {
  let p = ctx.db.learning_progress.find((x) => x.user_id === ctx.user.id && x.organization_id === ctx.org.id && x.track_id === trackId);
  if (!p) {
    p = { user_id: ctx.user.id, organization_id: ctx.org.id, track_id: trackId, completed_block_ids: [], acknowledged: false, updated_at: nowIso() };
    ctx.db.learning_progress.push(p);
  }
  return p;
}

function latestAttempt(ctx: AuthContext, testId: string): TestAttempt | undefined {
  return ctx.db.attempts
    .filter((a) => a.user_id === ctx.user.id && a.organization_id === ctx.org.id && a.test_id === testId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

function attemptDto(ctx: AuthContext, a: TestAttempt) {
  const test = CONTENT_TESTS.find((t) => t.id === a.test_id)!;
  const review = a.review_id ? ctx.db.reviews.find((r) => r.id === a.review_id) : undefined;
  return {
    id: a.id,
    test_id: a.test_id,
    score_percent: a.score_percent,
    passed: a.passed,
    passing_score_percent: test.passing_score_percent,
    auto_score: a.auto_score,
    auto_max: a.auto_max,
    open_score: review && review.status !== 'pending' ? review.ai_score : a.open_ai_score,
    open_max: a.open_max,
    review_status: review?.status ?? null,
    topics: a.topics.map((t) => ({ ...t, label: test.topics[t.topic_id] })),
    duration_seconds: a.duration_seconds,
    created_at: a.created_at,
  };
}

function trackDto(ctx: AuthContext) {
  const track = CONTENT_TRACKS[0];
  const progress = getProgress(ctx, track.id);
  const testBlocks = track.blocks.filter((b) => b.type === 'test' && b.test_id);
  return {
    track: {
      id: track.id,
      title: track.title,
      curator_name: track.curator_name,
      blocks: track.blocks.map((b) => ({ id: b.id, type: b.type, title: b.title, body: b.body, takeaway: b.takeaway, duration_label: b.duration_label, test_id: b.test_id })),
    },
    progress: {
      completed_block_ids: progress.completed_block_ids,
      acknowledged: progress.acknowledged,
      completed_at: progress.completed_at ?? null,
      percent: Math.round((progress.completed_block_ids.length / track.blocks.length) * 100),
    },
    latest_attempts: testBlocks
      .map((b) => latestAttempt(ctx, b.test_id!))
      .filter((a): a is TestAttempt => !!a)
      .map((a) => attemptDto(ctx, a)),
  };
}

export function getMyTrack(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'learning.self');
  const dto = trackDto(ctx);
  saveDb();
  return ok(dto);
}

export function updateMyProgress(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'learning.self');
  const body = asObject(req.body);
  const track = CONTENT_TRACKS.find((t) => t.id === body.track_id);
  if (!track) throw notFound('Track not found');
  const progress = getProgress(ctx, track.id);
  if (progress.completed_at) return ok(trackDto(ctx)); // completed tracks are immutable

  if (body.completed_block_ids !== undefined) {
    if (!Array.isArray(body.completed_block_ids)) throw badRequest('completed_block_ids must be an array', { field: 'completed_block_ids', rule: 'type' });
    const validIds = new Set(track.blocks.map((b) => b.id));
    const ids = Array.from(new Set(body.completed_block_ids.map(String))).filter((id) => validIds.has(id));
    // Test blocks can only be completed by passing the test, never by the client.
    const testIds = new Set(track.blocks.filter((b) => b.type === 'test').map((b) => b.id));
    const preserved = progress.completed_block_ids.filter((id) => testIds.has(id));
    progress.completed_block_ids = Array.from(new Set([...ids.filter((id) => !testIds.has(id)), ...preserved]));
  }
  if (typeof body.acknowledged === 'boolean') progress.acknowledged = body.acknowledged;
  progress.updated_at = nowIso();
  saveDb();
  return ok(trackDto(ctx));
}

export function completeMyTrack(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'learning.self');
  const body = asObject(req.body);
  const track = CONTENT_TRACKS.find((t) => t.id === body.track_id);
  if (!track) throw notFound('Track not found');
  const progress = getProgress(ctx, track.id);
  const done = new Set(progress.completed_block_ids);
  const missing = track.blocks.filter((b) => b.type !== 'acknowledgment' && !done.has(b.id)).map((b) => b.id);
  if (missing.length || !progress.acknowledged) {
    throw new HttpError(409, 'TRACK_INCOMPLETE', 'Not all required blocks are completed', { missing_blocks: missing, acknowledged: progress.acknowledged });
  }
  if (!progress.completed_at) {
    const ack = track.blocks.find((b) => b.type === 'acknowledgment');
    if (ack && !done.has(ack.id)) progress.completed_block_ids.push(ack.id);
    progress.completed_at = nowIso();
    audit(ctx.db, ctx, 'track.completed', 'track', track.id);
  }
  saveDb();
  return ok(trackDto(ctx));
}

// ---------------------------------------------------------------------------
// Tests & attempts
// ---------------------------------------------------------------------------

function findTest(id: string): ContentTest {
  const test = CONTENT_TESTS.find((t) => t.id === id);
  if (!test) throw notFound('Test not found');
  return test;
}

/** Public test definition: correct answers and grading rubrics are never sent to the client. */
export function getTest(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'learning.self');
  const test = findTest(id);
  return ok({
    id: test.id,
    title: test.title,
    time_limit_minutes: test.time_limit_minutes,
    passing_score_percent: test.passing_score_percent,
    integrity_monitoring: test.integrity_monitoring,
    questions: test.questions.map((q) => ({ id: q.id, type: q.type, topic_id: q.topic_id, text: q.text, options: q.options, points: q.points })),
  });
}

export function getLatestAttempt(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  findTest(id);
  const a = latestAttempt(ctx, id);
  return ok(a ? attemptDto(ctx, a) : null);
}

interface OpenGrade {
  score: number;
  confidence: number;
  matched: LocalizedText[];
  missed: LocalizedText[];
  justification: LocalizedText;
  cluster: LocalizedText;
}

/**
 * Deterministic stand-in for the AI grader: matches rubric criteria by
 * keyword stems in any supported language. Output is structured and
 * validated server-side, never free text that the client must parse.
 */
export function gradeOpenAnswer(question: ContentQuestion, answer: string): OpenGrade {
  const rubric = question.rubric || [];
  const text = answer.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const join = (items: LocalizedText[], loc: 'ru' | 'kk' | 'en') => items.map((i) => i[loc]).join(', ');

  if (words < 5) {
    return {
      score: 0,
      confidence: 90,
      matched: [],
      missed: rubric.map((r) => r.label),
      justification: {
        ru: 'Ответ слишком короткий для оценки по критериям.',
        kk: 'Жауап критерийлер бойынша бағалау үшін тым қысқа.',
        en: 'The answer is too short to be assessed against the criteria.',
      },
      cluster: { ru: 'Ответ не раскрыт', kk: 'Жауап ашылмаған', en: 'Answer not developed' },
    };
  }
  const matched = rubric.filter((r) => r.keywords.some((k) => text.includes(k))).map((r) => r.label);
  const missed = rubric.filter((r) => !r.keywords.some((k) => text.includes(k))).map((r) => r.label);
  const score = rubric.length ? Math.round((question.points * matched.length) / rubric.length) : 0;
  const m = matched.length;
  const n = rubric.length;
  return {
    score,
    confidence: Math.min(70 + m * 8, 95),
    matched,
    missed,
    justification: missed.length
      ? {
          ru: `Совпало критериев: ${m} из ${n}. Не раскрыто: ${join(missed, 'ru')}.`,
          kk: `Сәйкес келген критерийлер: ${m} / ${n}. Ашылмағаны: ${join(missed, 'kk')}.`,
          en: `Criteria matched: ${m} of ${n}. Not covered: ${join(missed, 'en')}.`,
        }
      : {
          ru: `Совпало критериев: ${m} из ${n}. Все ключевые критерии раскрыты.`,
          kk: `Сәйкес келген критерийлер: ${m} / ${n}. Барлық негізгі критерийлер ашылған.`,
          en: `Criteria matched: ${m} of ${n}. All key criteria are covered.`,
        },
    cluster: missed.length
      ? { ru: 'Неполное раскрытие критериев', kk: 'Критерийлер толық ашылмаған', en: 'Criteria partially covered' }
      : { ru: 'Полное раскрытие критериев', kk: 'Критерийлер толық ашылған', en: 'All criteria covered' },
  };
}

export function submitAttempt(req: MockRequest, testId: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'learning.self');
  const test = findTest(testId);
  const body = asObject(req.body);
  const clientAttemptId = str(body.client_attempt_id, 'client_attempt_id', { required: true, max: 64 })!;

  // Idempotency: a retried submission returns the original result instead of a duplicate.
  const existing = ctx.db.attempts.find((a) => a.user_id === ctx.user.id && a.client_attempt_id === clientAttemptId);
  if (existing) return ok(attemptDto(ctx, existing));

  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? (body.answers as Record<string, unknown>) : {};
  const locale = normalizeLocale(body.locale) ?? ctx.locale;

  const result = transaction((db) => {
    let autoScore = 0;
    let autoMax = 0;
    let openScore = 0;
    let openMax = 0;
    const topics = new Map<string, { earned: number; max: number }>();
    let reviewId: string | undefined;

    for (const q of test.questions) {
      const t = topics.get(q.topic_id) || { earned: 0, max: 0 };
      t.max += q.points;
      if (q.type === 'single_choice') {
        autoMax += q.points;
        const raw = answers[q.id];
        const choice = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : null;
        if (choice !== null && choice === q.correct_option) {
          autoScore += q.points;
          t.earned += q.points;
        }
      } else {
        openMax += q.points;
        const answer = typeof answers[q.id] === 'string' ? (answers[q.id] as string).slice(0, 5000) : '';
        const grade = gradeOpenAnswer(q, answer);
        openScore += grade.score;
        t.earned += grade.score;
        if (answer.trim()) {
          const review: SeedReview = {
            id: randomId('rev'),
            organization_id: ctx.org.id,
            student_name: `${ctx.user.first_name} ${ctx.user.last_name}`.trim(),
            question_text: q.text,
            student_answer: answer,
            ai_score: grade.score,
            max_score: q.points,
            ai_confidence: grade.confidence,
            ai_justification: grade.justification,
            matched_criteria: grade.matched,
            missed_criteria: grade.missed,
            cluster_tag: grade.cluster,
            status: 'pending',
            created_at: nowIso(),
          };
          db.reviews.unshift(review);
          reviewId = review.id;
        }
      }
      topics.set(q.topic_id, t);
    }

    const max = autoMax + openMax;
    const scorePercent = max ? Math.round(((autoScore + openScore) / max) * 100) : 0;
    const started = typeof body.started_at === 'string' ? Date.parse(body.started_at) : NaN;
    const attempt: TestAttempt = {
      id: randomId('att'),
      client_attempt_id: clientAttemptId,
      user_id: ctx.user.id,
      organization_id: ctx.org.id,
      test_id: test.id,
      locale,
      answers,
      auto_score: autoScore,
      auto_max: autoMax,
      open_ai_score: openScore,
      open_max: openMax,
      score_percent: scorePercent,
      passed: scorePercent >= test.passing_score_percent,
      topics: Array.from(topics.entries()).map(([topic_id, v]) => ({ topic_id, ...v })),
      review_id: reviewId,
      duration_seconds: Number.isFinite(started) ? Math.max(0, Math.round((Date.now() - started) / 1000)) : undefined,
      created_at: nowIso(),
    };
    if (reviewId) {
      const review = db.reviews.find((r) => r.id === reviewId)!;
      review.attempt_id = attempt.id;
    }
    db.attempts.push(attempt);

    if (attempt.passed) {
      const track = CONTENT_TRACKS.find((tr) => tr.blocks.some((b) => b.test_id === test.id));
      const block = track?.blocks.find((b) => b.test_id === test.id);
      if (track && block) {
        let p = db.learning_progress.find((x) => x.user_id === ctx.user.id && x.organization_id === ctx.org.id && x.track_id === track.id);
        if (!p) {
          p = { user_id: ctx.user.id, organization_id: ctx.org.id, track_id: track.id, completed_block_ids: [], acknowledged: false, updated_at: nowIso() };
          db.learning_progress.push(p);
        }
        if (!p.completed_block_ids.includes(block.id)) p.completed_block_ids.push(block.id);
      }
    }
    return attempt;
  });

  return ok(attemptDto(authenticate(req), result), 201);
}

const CLIENT_INTEGRITY_EVENTS: IntegrityEventType[] = ['tab_switch', 'focus_loss', 'copy_paste'];

export function recordIntegrityEvent(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'learning.self');
  rateLimit(`integrity:${ctx.user.id}`, 30);
  const body = asObject(req.body);
  const test = findTest(String(body.test_id || ''));
  const type = body.event_type as IntegrityEventType;
  if (!CLIENT_INTEGRITY_EVENTS.includes(type)) throw badRequest('Invalid event type', { field: 'event_type', rule: 'enum' });
  const raw = (body.params && typeof body.params === 'object' ? body.params : {}) as Record<string, unknown>;
  const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : undefined);
  ctx.db.integrity_events.unshift({
    id: randomId('evt'),
    organization_id: ctx.org.id,
    student_name: `${ctx.user.first_name} ${ctx.user.last_name}`.trim(),
    user_id: ctx.user.id,
    test_title: test.title,
    event_type: type,
    severity: type === 'copy_paste' ? 'medium' : 'low',
    timestamp: nowIso(),
    params: { seconds: num(raw.seconds, 3600), question: num(raw.question, 1000), chars: num(raw.chars, 100000) },
    status: 'new',
  });
  saveDb();
  return ok({ recorded: true }, 201);
}

// ---------------------------------------------------------------------------
// Reviews (AI-graded open answers) & integrity events — admin side
// ---------------------------------------------------------------------------

export function listReviews(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'reviews.manage');
  return ok(ctx.db.reviews.filter((r) => r.organization_id === ctx.org.id));
}

function findReview(ctx: AuthContext, id: string) {
  const r = ctx.db.reviews.find((x) => x.id === id && x.organization_id === ctx.org.id);
  if (!r) throw notFound('Review not found');
  if (r.status !== 'pending') throw new HttpError(409, 'ALREADY_REVIEWED', 'Review already decided');
  return r;
}

/** Re-scores the attempt linked to a review so pass/fail reflects the final human decision. */
function syncAttempt(ctx: AuthContext, review: SeedReview) {
  if (!review.attempt_id) return;
  const attempt = ctx.db.attempts.find((a) => a.id === review.attempt_id);
  if (!attempt) return;
  const test = CONTENT_TESTS.find((t) => t.id === attempt.test_id);
  if (!test) return;
  const max = attempt.auto_max + attempt.open_max;
  attempt.open_ai_score = review.ai_score;
  attempt.score_percent = max ? Math.round(((attempt.auto_score + review.ai_score) / max) * 100) : 0;
  attempt.passed = attempt.score_percent >= test.passing_score_percent;
  const openTopic = attempt.topics.find((t) => t.topic_id === 'open_case');
  if (openTopic) openTopic.earned = review.ai_score;
}

export function approveReview(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'reviews.manage');
  const r = findReview(ctx, id);
  r.status = 'approved';
  r.reviewed_by = `${ctx.user.first_name} ${ctx.user.last_name}`.trim();
  r.reviewed_at = nowIso();
  syncAttempt(ctx, r);
  audit(ctx.db, ctx, 'review.approved', 'review', r.id, { score: r.ai_score });
  saveDb();
  return ok(r);
}

export function approveAllReviews(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'reviews.manage');
  const pending = ctx.db.reviews.filter((r) => r.organization_id === ctx.org.id && r.status === 'pending');
  const reviewer = `${ctx.user.first_name} ${ctx.user.last_name}`.trim();
  for (const r of pending) {
    r.status = 'approved';
    r.reviewed_by = reviewer;
    r.reviewed_at = nowIso();
    syncAttempt(ctx, r);
  }
  audit(ctx.db, ctx, 'review.approved_bulk', 'organization', ctx.org.id, { count: pending.length });
  saveDb();
  return ok({ affected_rows: pending.length });
}

export function overrideReview(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'reviews.manage');
  const r = findReview(ctx, id);
  const body = asObject(req.body);
  const score = body.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > r.max_score) {
    throw badRequest('Score out of range', { field: 'score', rule: 'range', min: 0, max: r.max_score });
  }
  const comment = str(body.comment, 'comment', { required: true, min: 3, max: 2000 })!;
  const previous = r.ai_score;
  r.ai_score = score;
  r.status = 'overridden';
  r.reviewer_comment = comment;
  r.reviewed_by = `${ctx.user.first_name} ${ctx.user.last_name}`.trim();
  r.reviewed_at = nowIso();
  syncAttempt(ctx, r);
  audit(ctx.db, ctx, 'review.overridden', 'review', r.id, { previous, score });
  saveDb();
  return ok(r);
}

export function listIntegrityEvents(req: MockRequest): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'integrity.manage');
  return ok(ctx.db.integrity_events.filter((e) => e.organization_id === ctx.org.id));
}

export function resolveIntegrityEvent(req: MockRequest, id: string): MockResult {
  const ctx = authenticate(req);
  requireCapability(ctx, 'integrity.manage');
  const evt = ctx.db.integrity_events.find((e) => e.id === id && e.organization_id === ctx.org.id);
  if (!evt) throw notFound('Event not found');
  if (evt.status !== 'new') throw new HttpError(409, 'ALREADY_REVIEWED', 'Event already resolved');
  const body = asObject(req.body);
  if (body.action !== 'dismissed' && body.action !== 'escalated') throw badRequest('Invalid action', { field: 'action', rule: 'enum' });
  const note = str(body.note, 'note', { max: 2000 });
  evt.status = body.action;
  evt.resolution_note = note;
  evt.resolved_by = `${ctx.user.first_name} ${ctx.user.last_name}`.trim();
  evt.resolved_at = nowIso();
  audit(ctx.db, ctx, `integrity.${body.action}`, 'integrity_event', evt.id, { note });
  saveDb();
  return ok(evt);
}
