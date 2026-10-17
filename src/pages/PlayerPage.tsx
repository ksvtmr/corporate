import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, CheckCircle2, Clock, Award, ChevronLeft, ChevronRight, ArrowRight, Eye, Circle } from 'lucide-react';
import { api, Badge, Button, ErrorState, LocalizedText, Modal, Spinner, useApiErrorMessage, useAuth, useI18n, useToast, ApiError } from '@iclever/frontend-kit';

interface Block {
  id: string;
  type: 'material' | 'video' | 'test' | 'acknowledgment';
  title: LocalizedText;
  body: LocalizedText;
  takeaway?: LocalizedText;
  duration_label?: string;
  test_id?: string;
}

interface TrackData {
  track: { id: string; title: LocalizedText; curator_name: string; blocks: Block[] };
  progress: { completed_block_ids: string[]; acknowledged: boolean; completed_at: string | null; percent: number };
  latest_attempts: AttemptResult[];
}

interface Question {
  id: string;
  type: 'single_choice' | 'open_answer';
  topic_id: string;
  text: LocalizedText;
  options?: LocalizedText[];
  points: number;
}

interface TestData {
  id: string;
  title: LocalizedText;
  time_limit_minutes: number;
  passing_score_percent: number;
  integrity_monitoring: boolean;
  questions: Question[];
}

interface AttemptResult {
  id: string;
  test_id: string;
  score_percent: number;
  passed: boolean;
  passing_score_percent: number;
  auto_score: number;
  auto_max: number;
  open_score: number;
  open_max: number;
  review_status: 'pending' | 'approved' | 'overridden' | null;
  topics: Array<{ topic_id: string; earned: number; max: number; label: LocalizedText }>;
  duration_seconds?: number;
  created_at: string;
}

interface Draft {
  client_attempt_id: string;
  started_at: string;
  deadline_at: number;
  answers: Record<string, number | string>;
}

const draftKey = (userId: string, testId: string) => `iclever_attempt:${userId}:${testId}`;

function loadDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(key: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch {
    // storage unavailable: the attempt still works in memory
  }
}

function isValidAttempt(value: unknown): value is AttemptResult {
  const v = value as AttemptResult;
  return !!v && typeof v.score_percent === 'number' && typeof v.passed === 'boolean' && Array.isArray(v.topics);
}

export const PlayerPage: React.FC = () => {
  const { t, lt, formatPercent, formatNumber } = useI18n();
  const { user, activeMember } = useAuth();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState<TrackData | null>(null);
  const [test, setTest] = useState<TestData | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [view, setView] = useState<'track' | 'test' | 'results'>(() => (new URLSearchParams(location.search).get('view') === 'test' ? 'test' : 'track'));
  const [blockIndex, setBlockIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [submitOpen, setSubmitOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<AttemptResult | null>(null);
  const submittingRef = useRef(false);

  const testBlock = data?.track.blocks.find((b) => b.type === 'test');
  const key = user && test ? draftKey(user.id, test.id) : null;

  const load = useCallback(async () => {
    const res = await api.get<TrackData>('/learning/my/track', { noCache: true });
    if (!res.success || !res.data) return setLoadError(res.error ?? null);
    setData(res.data);
    const testId = res.data.track.blocks.find((b) => b.type === 'test')?.test_id;
    if (testId) {
      const tr = await api.get<TestData>(`/assessment/tests/${testId}`);
      if (tr.success && tr.data) setTest(tr.data);
      else setLoadError(tr.error ?? null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, activeMember?.organization_id]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('view') === 'test') setView('test');
  }, [location.search]);

  // Restore an in-progress attempt (autosave) after reloads.
  useEffect(() => {
    if (key) setDraft(loadDraft(key));
  }, [key]);

  useEffect(() => {
    if (key && draft) saveDraft(key, draft);
  }, [key, draft]);

  const submit = useCallback(
    async (auto = false) => {
      if (!test || !draft || submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      setSubmitError('');
      const res = await api.post<AttemptResult>(`/assessment/tests/${test.id}/attempts`, {
        client_attempt_id: draft.client_attempt_id,
        started_at: draft.started_at,
        answers: draft.answers,
      });
      submittingRef.current = false;
      setIsSubmitting(false);
      setSubmitOpen(false);
      if (res.success && isValidAttempt(res.data)) {
        // The draft is only discarded after the server confirmed the attempt.
        if (key) saveDraft(key, null);
        setDraft(null);
        setResult(res.data);
        setView('results');
        if (auto) toast.info(t('player.test.autoSubmitted'));
        void load();
      } else {
        setSubmitError(res.success ? t('errors.generic') : errorMessage(res.error));
      }
    },
    [test, draft, key, toast, t, errorMessage, load],
  );

  // Countdown; auto-submits when time runs out.
  useEffect(() => {
    if (view !== 'test' || !draft) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [view, draft]);

  const remaining = draft ? Math.max(0, Math.round((draft.deadline_at - now) / 1000)) : 0;
  useEffect(() => {
    if (view === 'test' && draft && remaining === 0 && !submittingRef.current) void submit(true);
  }, [view, draft, remaining, submit]);

  // Integrity monitoring (disclosed to the employee on the start screen).
  useEffect(() => {
    if (view !== 'test' || !draft || !test?.integrity_monitoring) return;
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt) {
        const seconds = Math.round((Date.now() - hiddenAt) / 100) / 10;
        hiddenAt = null;
        void api.post('/assessment/integrity-events', { test_id: test.id, event_type: 'tab_switch', params: { seconds, question: questionIndex + 1 } });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [view, draft, test, questionIndex]);

  if (loadError) return <ErrorState message={errorMessage(loadError, 'errors.loadFailed')} onRetry={() => void load()} />;
  if (!data) return <Spinner className="py-16" />;

  const blocks = data.track.blocks;
  const block = blocks[blockIndex];
  const done = new Set(data.progress.completed_block_ids);
  const isCompleted = !!data.progress.completed_at;

  const saveProgress = async (patch: { completed_block_ids?: string[]; acknowledged?: boolean }) => {
    setIsSaving(true);
    const res = await api.put<TrackData>('/learning/my/progress', { track_id: data.track.id, completed_block_ids: Array.from(done), ...patch });
    setIsSaving(false);
    if (res.success && res.data) setData(res.data);
    else toast.error(errorMessage(res.error));
  };

  const goNext = async () => {
    if ((block.type === 'material' || block.type === 'video') && !done.has(block.id) && !isCompleted) {
      await saveProgress({ completed_block_ids: [...Array.from(done), block.id] });
    }
    setIsVideoPlaying(false);
    setBlockIndex((i) => Math.min(i + 1, blocks.length - 1));
  };

  const finishCourse = async () => {
    setIsSaving(true);
    const res = await api.post<TrackData>('/learning/my/complete', { track_id: data.track.id });
    setIsSaving(false);
    if (res.success && res.data) {
      setData(res.data);
      setCompleteOpen(true);
    } else {
      toast.error(errorMessage(res.error));
    }
  };

  const startTest = () => {
    if (!test) return;
    const started = new Date();
    const next: Draft = {
      client_attempt_id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      started_at: started.toISOString(),
      deadline_at: started.getTime() + test.time_limit_minutes * 60_000,
      answers: {},
    };
    setDraft(next);
    setNow(Date.now());
    setQuestionIndex(0);
    setResult(null);
  };

  const setAnswer = (qid: string, value: number | string) => setDraft((d) => (d ? { ...d, answers: { ...d.answers, [qid]: value } } : d));
  const isAnswered = (q: Question) => {
    const v = draft?.answers[q.id];
    return typeof v === 'number' || (typeof v === 'string' && v.trim().length > 0);
  };
  const unanswered = test ? test.questions.filter((q) => !isAnswered(q)).length : 0;
  const lastAttempt = data.latest_attempts.find((a) => a.test_id === test?.id) ?? null;
  const shownResult = result ?? (view === 'results' ? lastAttempt : null);
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{t('player.kicker', { track: lt(data.track.title) })}</span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{t(`player.views.${view}`)}</h1>
        </div>
        <div className="flex items-center gap-2">
          {view !== 'track' && (
            <Button variant="outline" size="sm" onClick={() => setView('track')}>
              {t('player.backToTrack')}
            </Button>
          )}
          {view === 'test' && draft && (
            <div role="timer" aria-live="off" className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${remaining < 60 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>{t('player.test.timeLeft', { time: `${mm}:${ss}` })}</span>
            </div>
          )}
        </div>
      </div>

      {view === 'track' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <nav className="lg:col-span-1 space-y-2" aria-label={t('player.blocks')}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('player.blocks')}</h2>
            <p className="text-[11px] text-slate-500">{t('player.progress', { percent: formatPercent(data.progress.percent) })}</p>
            {blocks.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBlockIndex(i)}
                aria-current={blockIndex === i ? 'step' : undefined}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  blockIndex === i ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {done.has(b.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" aria-label={t('player.blockDone')} />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">{i + 1}</span>
                  )}
                  <span className="truncate">{lt(b.title)}</span>
                </div>
              </button>
            ))}
          </nav>

          <div className="lg:col-span-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('player.blockOf', { current: blockIndex + 1, total: blocks.length })}</span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{lt(block.title)}</h2>
            </div>

            {block.type === 'material' && (
              <div className="text-slate-700 text-sm leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p>{lt(block.body)}</p>
                {block.takeaway && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-xs">
                    <strong>{t('player.takeaway')}</strong> {lt(block.takeaway)}
                  </div>
                )}
              </div>
            )}

            {block.type === 'video' && (
              <div className="space-y-3">
                <div className="aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white space-y-3 p-6 relative overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsVideoPlaying((v) => !v)}
                    aria-label={isVideoPlaying ? t('player.video.pause') : t('player.video.play')}
                    className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-10 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    {isVideoPlaying ? <Pause className="w-6 h-6" aria-hidden="true" /> : <Play className="w-6 h-6 ml-1" aria-hidden="true" />}
                  </button>
                  <span className="text-xs text-slate-300 z-10 text-center">
                    {isVideoPlaying ? t('player.video.playing') : t('player.video.duration', { duration: block.duration_label ?? '—' })}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{lt(block.body)}</p>
              </div>
            )}

            {block.type === 'test' && (
              <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-600 rounded-xl text-white">
                    <Award className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950">{t('player.testBlock.title')}</h3>
                    {test && (
                      <p className="text-xs text-indigo-700">
                        {t('player.testBlock.meta', { questions: t('common.units.questions', { count: test.questions.length }), minutes: test.time_limit_minutes, passing: formatPercent(test.passing_score_percent) })}
                      </p>
                    )}
                  </div>
                </div>
                {done.has(block.id) ? (
                  <Badge variant="success">{t('player.testBlock.passed')}</Badge>
                ) : (
                  <p className="text-xs text-indigo-800">{t('player.testBlock.required')}</p>
                )}
                <Button variant="primary" onClick={() => setView('test')}>
                  {t('player.testBlock.open')}
                  <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
                </Button>
              </div>
            )}

            {block.type === 'acknowledgment' && (
              <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-700 leading-relaxed">{lt(block.body)}</p>
                <label className="flex items-center space-x-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.progress.acknowledged}
                    disabled={isSaving || isCompleted}
                    onChange={(e) => void saveProgress({ acknowledged: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-900">{t('player.ack.label')}</span>
                </label>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <Button variant="secondary" disabled={blockIndex === 0} onClick={() => setBlockIndex((i) => i - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" />
                {t('common.actions.back')}
              </Button>
              {blockIndex < blocks.length - 1 ? (
                <Button variant="primary" onClick={goNext} isLoading={isSaving}>
                  {block.type === 'material' || block.type === 'video' ? t('player.markDoneNext') : t('common.actions.next')}
                  <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Button>
              ) : isCompleted ? (
                <Badge variant="success">{t('player.courseCompleted')}</Badge>
              ) : (
                <Button variant="primary" disabled={!data.progress.acknowledged} onClick={finishCourse} isLoading={isSaving}>
                  {t('player.finishCourse')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'test' && test && !draft && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">{lt(test.title)}</h2>
          <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
            <li>{t('common.units.questions', { count: test.questions.length })}</li>
            <li>{t('player.test.rules.time', { minutes: test.time_limit_minutes })}</li>
            <li>{t('player.test.rules.passing', { passing: formatPercent(test.passing_score_percent) })}</li>
            <li>{t('player.test.rules.autosave')}</li>
            <li>{t('player.test.rules.openAnswer')}</li>
          </ul>
          {test.integrity_monitoring && (
            <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
              {t('player.test.integrityNotice')}
            </p>
          )}
          {lastAttempt && (
            <p className="text-xs text-slate-500">
              {t('player.test.lastResult', { score: formatPercent(lastAttempt.score_percent) })}{' '}
              <button type="button" className="text-indigo-600 font-medium hover:underline" onClick={() => setView('results')}>
                {t('player.test.viewResult')}
              </button>
            </p>
          )}
          <div className="flex justify-end">
            <Button variant="primary" onClick={startTest}>
              {lastAttempt ? t('player.test.retake') : t('player.test.start')}
            </Button>
          </div>
        </div>
      )}

      {view === 'test' && test && draft && (
        <div className="max-w-3xl mx-auto space-y-6 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
            <span className="font-semibold text-slate-700">{t('player.test.questionOf', { current: questionIndex + 1, total: test.questions.length })}</span>
            <div className="flex space-x-1.5" role="group" aria-label={t('player.test.navigator')}>
              {test.questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuestionIndex(i)}
                  aria-label={t('player.test.goTo', { number: i + 1, state: isAnswered(q) ? t('player.test.answered') : t('player.test.notAnswered') })}
                  aria-current={questionIndex === i ? 'step' : undefined}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    questionIndex === i ? 'bg-indigo-600 text-white shadow' : isAnswered(q) ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const q = test.questions[questionIndex];
            return (
              <fieldset className="space-y-4">
                <legend className="text-base font-bold text-slate-900">{lt(q.text)}</legend>
                <p className="text-[11px] text-slate-400">{t('common.units.points', { count: q.points })}</p>
                {q.type === 'single_choice' && q.options ? (
                  <div className="space-y-2" role="radiogroup">
                    {q.options.map((opt, optIdx) => {
                      const selected = draft.answers[q.id] === optIdx;
                      return (
                        <label
                          key={optIdx}
                          className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center space-x-3 focus-within:ring-2 focus-within:ring-indigo-500 ${
                            selected ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                          }`}
                        >
                          <input type="radio" name={q.id} className="sr-only" checked={selected} onChange={() => setAnswer(q.id, optIdx)} />
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600'}`} aria-hidden="true">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{lt(opt)}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      maxLength={5000}
                      aria-label={lt(q.text)}
                      value={typeof draft.answers[q.id] === 'string' ? (draft.answers[q.id] as string) : ''}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      onPaste={(e) => {
                        if (test.integrity_monitoring) {
                          void api.post('/assessment/integrity-events', { test_id: test.id, event_type: 'copy_paste', params: { chars: e.clipboardData.getData('text').length, question: questionIndex + 1 } });
                        }
                      }}
                      placeholder={t('player.test.openPlaceholder')}
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400">{t('player.test.openHint')}</span>
                  </div>
                )}
              </fieldset>
            );
          })()}

          {submitError && <ErrorState message={submitError} onRetry={() => void submit()} />}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <Button variant="secondary" disabled={questionIndex === 0} onClick={() => setQuestionIndex((i) => i - 1)}>
              {t('player.test.prev')}
            </Button>
            {questionIndex < test.questions.length - 1 ? (
              <Button variant="primary" onClick={() => setQuestionIndex((i) => i + 1)}>
                {t('player.test.next')}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setSubmitOpen(true)}>
                {t('player.test.finish')}
              </Button>
            )}
          </div>
        </div>
      )}

      {view === 'results' && (
        <div className="max-w-2xl mx-auto space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          {!shownResult ? (
            <p className="text-sm text-slate-500">{t('player.results.none')}</p>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm ${shownResult.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {shownResult.passed ? <Award className="w-8 h-8" aria-hidden="true" /> : <Circle className="w-8 h-8" aria-hidden="true" />}
              </div>
              <div>
                <Badge variant={shownResult.passed ? 'success' : 'danger'}>{shownResult.passed ? t('player.results.passed') : t('player.results.failed')}</Badge>
                <h2 className="text-2xl font-black text-slate-900 mt-2">{formatPercent(shownResult.score_percent)}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('player.results.threshold', { passing: formatPercent(shownResult.passing_score_percent) })}
                  {shownResult.duration_seconds !== undefined && ` • ${t('player.results.duration', { minutes: formatNumber(Math.max(1, Math.round(shownResult.duration_seconds / 60))) })}`}
                </p>
                {shownResult.review_status === 'pending' && <p className="text-xs text-amber-700 mt-2">{t('player.results.pendingReview')}</p>}
              </div>
              <div className="text-left space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <h3 className="font-bold text-slate-900">{t('player.results.byTopic')}</h3>
                {shownResult.topics.map((topic) => {
                  const pct = topic.max ? (topic.earned / topic.max) * 100 : 0;
                  return (
                    <div key={topic.topic_id}>
                      <div className="flex justify-between text-slate-600 mb-1 gap-2">
                        <span>{lt(topic.label)}</span>
                        <span className={`font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {t('player.results.topicScore', { earned: topic.earned, max: topic.max, percent: formatPercent(pct) })}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={() => setView('track')}>
              {t('player.results.backToProgram')}
            </Button>
            {shownResult && !shownResult.passed && (
              <Button variant="outline" onClick={() => setView('test')}>
                {t('player.test.retake')}
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate('/corporate/dashboard')}>
              {t('player.results.toDashboard')}
            </Button>
          </div>
        </div>
      )}

      <Modal isOpen={submitOpen} onClose={() => setSubmitOpen(false)} title={t('player.submit.title')} size="sm" preventClose={isSubmitting}>
        <div className="space-y-3 text-xs py-2 text-slate-700">
          <p>{unanswered > 0 ? t('player.submit.unanswered', { count: unanswered }) : t('player.submit.allAnswered')}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setSubmitOpen(false)} disabled={isSubmitting}>
              {t('player.submit.keepWorking')}
            </Button>
            <Button variant="primary" onClick={() => void submit()} isLoading={isSubmitting}>
              {t('player.submit.send')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title={t('player.complete.title')} size="sm">
        <div className="space-y-4 text-xs py-2 text-slate-700 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <p className="font-semibold text-slate-900">{t('player.complete.message', { track: lt(data.track.title) })}</p>
          <p className="text-[11px] text-slate-500">{t('player.complete.recorded')}</p>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCompleteOpen(false)}>
              {t('common.actions.close')}
            </Button>
            <Button variant="primary" onClick={() => navigate('/corporate/dashboard')}>
              {t('player.results.toDashboard')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
