import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Search, Copy, Trash2, Eye, Check } from 'lucide-react';
import { api, Badge, Button, ConfirmDialog, DemoDataBadge, EmptyState, ErrorState, Input, Modal, Tabs, TranslationFallbackMark, useApiErrorMessage, useI18n, useToast, ApiError } from '@iclever/frontend-kit';
import { DemoQuestion, DemoTest, Difficulty, QuestionType } from '../demo/fixtures';
import { useQuestionsState, useTestsState } from '../demo/useDemoData';

const ALL_TYPES: QuestionType[] = ['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'open_answer', 'matching', 'ordering', 'scenario'];
const CREATABLE: QuestionType[] = ['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'open_answer'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DIFF_VARIANT = { hard: 'danger', medium: 'warning', easy: 'success' } as const;
const DIFF_ORDER = { easy: 1, medium: 2, hard: 3 };
const hasOptions = (type: QuestionType) => type === 'single_choice' || type === 'multiple_choice' || type === 'true_false';

interface GeneratedQuestion {
  type: 'single_choice' | 'open_answer';
  text: string;
  options?: string[];
  correct_option?: number;
  points: number;
  difficulty: Difficulty;
  topic: string;
  source_fragment: string;
}

function parseGenerated(value: unknown, expected: number): GeneratedQuestion[] | null {
  const v = value as { questions?: GeneratedQuestion[] };
  if (!v || !Array.isArray(v.questions) || v.questions.length === 0 || v.questions.length > expected) return null;
  const ok = v.questions.every(
    (q) =>
      q &&
      (q.type === 'single_choice' || q.type === 'open_answer') &&
      typeof q.text === 'string' &&
      q.text.trim() &&
      Number.isFinite(q.points) &&
      (q.type === 'open_answer' || (Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.correct_option) && q.correct_option! < q.options.length)),
  );
  return ok ? v.questions : null;
}

export const AssessmentsPage: React.FC = () => {
  const { t, lt, locale, compare } = useI18n();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const [questions, setQuestions] = useQuestionsState();
  const [tests, setTests] = useTestsState();
  const [activeTab, setActiveTab] = useState<'bank' | 'tests'>('bank');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBank, setSortBank] = useState<'points_desc' | 'points_asc' | 'difficulty' | 'topic'>('points_desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemoQuestion | null>(null);
  const [previewTest, setPreviewTest] = useState<DemoTest | null>(null);

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState('3');
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<ApiError | null>(null);

  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('single_choice');
  const [qTopic, setQTopic] = useState('');
  const [qDifficulty, setQDifficulty] = useState<Difficulty>('medium');
  const [qPoints, setQPoints] = useState('10');
  const [qOptions, setQOptions] = useState('');
  const [qCorrect, setQCorrect] = useState<number[]>([]);
  const [qError, setQError] = useState('');

  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testTime, setTestTime] = useState('25');
  const [testPassing, setTestPassing] = useState('80');
  const [testShuffle, setTestShuffle] = useState(true);
  const [testIntegrity, setTestIntegrity] = useState(true);
  const [testQuestionIds, setTestQuestionIds] = useState<string[]>([]);
  const [testError, setTestError] = useState('');

  const selected = questions.find((q) => q.id === selectedId) ?? null;
  const optionLines = qType === 'true_false' ? [t('common.yes'), t('common.no')] : qOptions.split('\n').map((o) => o.trim()).filter(Boolean);
  const usedIn = (qid: string) => tests.filter((x) => x.question_ids.includes(qid));
  const local = (text: string) => ({ [locale]: text });

  const resetQuestion = () => {
    setIsQuestionOpen(false);
    setQText('');
    setQType('single_choice');
    setQTopic('');
    setQPoints('10');
    setQOptions('');
    setQCorrect([]);
    setQError('');
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setQError('');
    const points = Number(qPoints);
    if (!qText.trim()) return setQError(t('assessments.question.errors.text'));
    if (!qTopic.trim()) return setQError(t('assessments.question.errors.topic'));
    if (!Number.isInteger(points) || points < 1 || points > 100) return setQError(t('assessments.question.errors.points'));
    if (hasOptions(qType)) {
      if (optionLines.length < 2) return setQError(t('assessments.question.errors.options'));
      if (qCorrect.length === 0) return setQError(t('assessments.question.errors.correct'));
      if (qType !== 'multiple_choice' && qCorrect.length > 1) return setQError(t('assessments.question.errors.singleCorrect'));
    }
    const item: DemoQuestion = {
      id: `q-${Date.now().toString(36)}`,
      text: local(qText.trim()),
      type: qType,
      topic: local(qTopic.trim()),
      difficulty: qDifficulty,
      points,
      options: hasOptions(qType) ? optionLines.map(local) : undefined,
      correct: hasOptions(qType) ? qCorrect.filter((i) => i < optionLines.length) : undefined,
      source_fragment: local(t('assessments.question.manualSource')),
    };
    setQuestions((prev) => [item, ...prev]);
    toast.success(t('assessments.toast.questionCreated'));
    resetQuestion();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(aiCount);
    if (!aiTopic.trim() || !Number.isInteger(count) || count < 1 || count > 20 || isGenerating) return;
    setIsGenerating(true);
    setAiError(null);
    const res = await api.post('/ai/questions/generate', { topic: aiTopic.trim(), count, difficulty: aiDifficulty, locale }, { timeoutMs: 60_000 });
    setIsGenerating(false);
    const generated = res.success ? parseGenerated(res.data, count) : null;
    if (!generated) return setAiError(res.success ? { code: 'AI_INVALID', message: '' } : res.error ?? null);
    const stamp = Date.now().toString(36);
    const items: DemoQuestion[] = generated.map((g, i) => ({
      id: `q-ai-${stamp}-${i}`,
      text: local(g.text),
      type: g.type,
      topic: local(g.topic),
      difficulty: g.difficulty,
      points: g.points,
      options: g.options?.map(local),
      correct: g.type === 'single_choice' ? [g.correct_option!] : undefined,
      source_fragment: local(g.source_fragment),
      ai_generated: true,
    }));
    setQuestions((prev) => [...items, ...prev]);
    setIsAiOpen(false);
    toast.success(t('assessments.toast.generated', { count: items.length }));
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    setTestError('');
    const time = Number(testTime);
    const passing = Number(testPassing);
    if (!testTitle.trim()) return setTestError(t('assessments.test.errors.title'));
    if (testQuestionIds.length === 0) return setTestError(t('assessments.test.errors.questions'));
    if (!Number.isInteger(time) || time < 5 || time > 180) return setTestError(t('assessments.test.errors.time'));
    if (!Number.isInteger(passing) || passing < 50 || passing > 100) return setTestError(t('assessments.test.errors.passing'));
    const item: DemoTest = {
      id: `t-${Date.now().toString(36)}`,
      title: local(testTitle.trim()),
      description: local(testDesc.trim()),
      question_ids: testQuestionIds,
      time_limit_minutes: time,
      passing_score_percent: passing,
      shuffle_questions: testShuffle,
      integrity_monitoring: testIntegrity,
      version: 1,
    };
    setTests((prev) => [item, ...prev]);
    setIsTestOpen(false);
    setTestTitle('');
    setTestDesc('');
    setTestQuestionIds([]);
    setActiveTab('tests');
    toast.success(t('assessments.toast.testCreated'));
  };

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions
      .filter((x) => {
        const text = [x.text, x.topic].map((v) => (typeof v === 'string' ? v : Object.values(v).join(' '))).join(' ').toLowerCase();
        return (!q || text.includes(q)) && (typeFilter === 'all' || x.type === typeFilter);
      })
      .sort((a, b) => {
        if (sortBank === 'points_desc') return b.points - a.points;
        if (sortBank === 'points_asc') return a.points - b.points;
        if (sortBank === 'topic') return compare(lt(a.topic), lt(b.topic));
        return DIFF_ORDER[b.difficulty] - DIFF_ORDER[a.difficulty];
      });
  }, [questions, search, typeFilter, sortBank, lt, compare]);

  const fieldClass = 'w-full rounded-lg border border-slate-300 p-2 text-xs bg-white';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {t('assessments.title')} <DemoDataBadge />
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('assessments.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setAiError(null); setIsAiOpen(true); }}>
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" aria-hidden="true" />
            {t('assessments.actions.generate')}
          </Button>
          <Button variant="primary" size="sm" onClick={() => (activeTab === 'bank' ? setIsQuestionOpen(true) : (setTestError(''), setIsTestOpen(true)))}>
            <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {activeTab === 'bank' ? t('assessments.actions.createQuestion') : t('assessments.actions.createTest')}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">{t('common.demoData.localNotice')}</p>

      <Tabs
        tabs={[
          { id: 'bank', label: t('assessments.tabs.bank'), count: questions.length },
          { id: 'tests', label: t('assessments.tabs.tests'), count: tests.length },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'bank' | 'tests')}
      />

      {activeTab === 'bank' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                aria-label={t('common.actions.search')}
                placeholder={t('assessments.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select aria-label={t('common.filters.type')} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700">
                <option value="all">{t('assessments.allTypes')}</option>
                {ALL_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`assessments.types.${x}`)}
                  </option>
                ))}
              </select>
              <select aria-label={t('common.filters.sortBy')} value={sortBank} onChange={(e) => setSortBank(e.target.value as typeof sortBank)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium">
                <option value="points_desc">{t('assessments.sort.pointsDesc')}</option>
                <option value="points_asc">{t('assessments.sort.pointsAsc')}</option>
                <option value="difficulty">{t('assessments.sort.difficulty')}</option>
                <option value="topic">{t('assessments.sort.topic')}</option>
              </select>
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <EmptyState title={questions.length === 0 ? t('assessments.emptyBank') : t('common.states.emptyFiltered')} />
          ) : (
            <ul className="space-y-3">
              {filteredQuestions.map((q) => (
                <li key={q.id}>
                  <button type="button" onClick={() => setSelectedId(q.id)} className="w-full text-left p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all space-y-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">{t(`assessments.types.${q.type}`)}</span>
                        <span className="text-slate-500">{lt(q.topic)}</span>
                        <span className="text-slate-500">• {t('common.units.points', { count: q.points })}</span>
                        {q.ai_generated && <Badge variant="brand">AI</Badge>}
                      </div>
                      <Badge variant={DIFF_VARIANT[q.difficulty]}>{t(`assessments.difficulty.${q.difficulty}`)}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {lt(q.text)}
                      <TranslationFallbackMark value={q.text} />
                    </h3>
                    {q.options && (
                      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 pt-1">
                        {q.options.map((opt, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${q.correct?.includes(i) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                            <span>{lt(opt)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : tests.length === 0 ? (
        <EmptyState title={t('assessments.emptyTests')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => {
            const qs = test.question_ids.map((id) => questions.find((q) => q.id === id)).filter((q): q is DemoQuestion => !!q);
            return (
              <article key={test.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      v{test.version} • {t('common.units.questions', { count: qs.length })} • {t('common.units.points', { count: qs.reduce((s, q) => s + q.points, 0) })}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{lt(test.title)}</h3>
                    <p className="text-xs text-slate-500 mt-1">{lt(test.description)}</p>
                  </div>
                  <Badge variant={qs.length ? 'success' : 'warning'}>{qs.length ? t('assessments.test.ready') : t('assessments.test.noQuestions')}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <dt className="inline text-slate-400">{t('assessments.test.timer')}</dt> <dd className="inline font-semibold text-slate-700">{t('common.units.minutesShort', { count: test.time_limit_minutes })}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">{t('assessments.test.passing')}</dt> <dd className="inline font-semibold text-slate-700">{test.passing_score_percent}%</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">{t('assessments.test.shuffle')}</dt> <dd className="inline font-semibold text-slate-700">{test.shuffle_questions ? t('common.on') : t('common.off')}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">{t('assessments.test.integrity')}</dt> <dd className="inline font-semibold text-slate-700">{test.integrity_monitoring ? t('common.on') : t('common.off')}</dd>
                  </div>
                </dl>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setPreviewTest(test)}>
                    <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    {t('assessments.actions.preview')}
                  </Button>
                  <Button variant="primary" size="sm" disabled={qs.length === 0} onClick={() => navigate(`/corporate/assignments?test=${encodeURIComponent(test.id)}`)}>
                    {t('assessments.actions.assign')}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <Modal isOpen onClose={() => setSelectedId(null)} title={t('assessments.detail.title')} size="md">
          <div className="space-y-4 text-xs py-2 text-slate-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-600">
                {t(`assessments.types.${selected.type}`)} • {lt(selected.topic)} • {t(`assessments.difficulty.${selected.difficulty}`)}
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{lt(selected.text)}</h3>
            </div>
            {selected.options && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">{t('assessments.detail.options')}</h4>
                <ol className="space-y-1.5">
                  {selected.options.map((opt, i) => {
                    const correct = selected.correct?.includes(i);
                    return (
                      <li key={i} className={`p-2 border rounded-lg flex items-center gap-2 ${correct ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        <span className="flex-1">{lt(opt)}</span>
                        {correct && <Check className="w-3.5 h-3.5 text-green-600" aria-label={t('assessments.detail.correct')} />}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
            {selected.source_fragment && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                <div className="font-semibold flex items-center text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" aria-hidden="true" />
                  {t('assessments.detail.source')}
                </div>
                <p className="text-xs text-amber-800 italic">{lt(selected.source_fragment)}</p>
              </div>
            )}
            {usedIn(selected.id).length > 0 && <p className="text-[11px] text-slate-500">{t('assessments.detail.usedIn', { tests: usedIn(selected.id).map((x) => lt(x.title)).join(', ') })}</p>}
            <div className="pt-2 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" className="text-red-600" onClick={() => setDeleteTarget(selected)}>
                <Trash2 className="w-4 h-4 mr-1" aria-hidden="true" />
                {t('common.actions.delete')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const copy: DemoQuestion = { ...selected, id: `q-copy-${Date.now().toString(36)}`, text: local(t('assessments.detail.copyPrefix', { text: lt(selected.text) })), ai_generated: false };
                  setQuestions((prev) => [copy, ...prev]);
                  setSelectedId(copy.id);
                  toast.success(t('assessments.toast.duplicated'));
                }}
              >
                <Copy className="w-4 h-4 mr-1" aria-hidden="true" />
                {t('assessments.actions.duplicate')}
              </Button>
              <Button variant="secondary" onClick={() => setSelectedId(null)}>
                {t('common.actions.close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t('assessments.delete.title')}
        message={deleteTarget && usedIn(deleteTarget.id).length > 0 ? t('assessments.delete.inUse', { count: usedIn(deleteTarget.id).length }) : t('assessments.delete.message')}
        confirmDisabled={!!deleteTarget && usedIn(deleteTarget.id).length > 0}
        confirmLabel={t('common.actions.delete')}
        onConfirm={() => {
          if (deleteTarget) {
            setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id));
            setSelectedId(null);
            toast.success(t('assessments.toast.deleted'));
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {previewTest && (
        <Modal isOpen onClose={() => setPreviewTest(null)} title={t('assessments.preview.title', { title: lt(previewTest.title) })} size="lg">
          <ol className="space-y-3 text-xs text-slate-700 list-decimal pl-5">
            {previewTest.question_ids.map((id) => {
              const q = questions.find((x) => x.id === id);
              if (!q) return <li key={id} className="text-slate-400">{t('assessments.preview.missing')}</li>;
              return (
                <li key={id} className="space-y-1">
                  <p className="font-semibold text-slate-900">
                    {lt(q.text)} <span className="font-normal text-slate-400">({t('common.units.points', { count: q.points })})</span>
                  </p>
                  {q.options ? (
                    <ul className="list-[upper-alpha] pl-5 text-slate-600">
                      {q.options.map((o, i) => (
                        <li key={i}>{lt(o)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 italic">{t('assessments.preview.openAnswer')}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </Modal>
      )}

      <Modal isOpen={isQuestionOpen} onClose={resetQuestion} title={t('assessments.question.title')} subtitle={t('assessments.question.subtitle')} size="md">
        <form onSubmit={handleCreateQuestion} className="space-y-4 py-2 text-xs">
          {qError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {qError}
            </div>
          )}
          <div>
            <label htmlFor="q-text" className="block text-slate-700 font-medium mb-1">
              {t('assessments.question.text')}
            </label>
            <textarea id="q-text" rows={3} maxLength={1000} value={qText} onChange={(e) => setQText(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="q-type" className="block text-slate-700 font-medium mb-1">
                {t('assessments.question.type')}
              </label>
              <select
                id="q-type"
                value={qType}
                onChange={(e) => {
                  setQType(e.target.value as QuestionType);
                  setQCorrect([]);
                }}
                className={fieldClass}
              >
                {CREATABLE.map((x) => (
                  <option key={x} value={x}>
                    {t(`assessments.types.${x}`)}
                  </option>
                ))}
              </select>
            </div>
            <Input label={t('assessments.question.topic')} value={qTopic} onChange={(e) => setQTopic(e.target.value)} maxLength={120} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="q-diff" className="block text-slate-700 font-medium mb-1">
                {t('assessments.question.difficulty')}
              </label>
              <select id="q-diff" value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value as Difficulty)} className={fieldClass}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {t(`assessments.difficulty.${d}`)}
                  </option>
                ))}
              </select>
            </div>
            <Input label={t('assessments.question.points')} type="number" min={1} max={100} step={1} value={qPoints} onChange={(e) => setQPoints(e.target.value)} required />
          </div>
          {hasOptions(qType) && (
            <div className="space-y-2">
              {qType !== 'true_false' && (
                <div>
                  <label htmlFor="q-options" className="block text-slate-700 font-medium mb-1">
                    {t('assessments.question.options')}
                  </label>
                  <textarea id="q-options" rows={4} value={qOptions} onChange={(e) => setQOptions(e.target.value)} placeholder={t('assessments.question.optionsPlaceholder')} className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
              {optionLines.length > 0 && (
                <fieldset>
                  <legend className="text-slate-700 font-medium mb-1">{qType === 'multiple_choice' ? t('assessments.question.correctMany') : t('assessments.question.correctOne')}</legend>
                  <div className="space-y-1">
                    {optionLines.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type={qType === 'multiple_choice' ? 'checkbox' : 'radio'}
                          name="q-correct"
                          checked={qCorrect.includes(i)}
                          onChange={(e) => setQCorrect((prev) => (qType === 'multiple_choice' ? (e.target.checked ? [...prev, i] : prev.filter((x) => x !== i)) : [i]))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={resetQuestion}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('assessments.question.submit')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isTestOpen} onClose={() => setIsTestOpen(false)} title={t('assessments.test.title')} subtitle={t('assessments.test.subtitle')} size="lg">
        <form onSubmit={handleCreateTest} className="space-y-4 py-2 text-xs">
          {testError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {testError}
            </div>
          )}
          <Input label={t('assessments.test.name')} placeholder={t('assessments.test.namePlaceholder')} value={testTitle} onChange={(e) => setTestTitle(e.target.value)} maxLength={200} required />
          <div>
            <label htmlFor="test-desc" className="block text-slate-700 font-medium mb-1">
              {t('assessments.test.description')}
            </label>
            <textarea id="test-desc" rows={2} maxLength={1000} value={testDesc} onChange={(e) => setTestDesc(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500" />
          </div>
          <fieldset>
            <legend className="text-slate-700 font-medium mb-1">{t('assessments.test.chooseQuestions', { count: testQuestionIds.length })}</legend>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {questions.map((q) => (
                <label key={q.id} className="flex items-start gap-2 p-2 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={testQuestionIds.includes(q.id)}
                    onChange={(e) => setTestQuestionIds((prev) => (e.target.checked ? [...prev, q.id] : prev.filter((x) => x !== q.id)))}
                    className="mt-0.5"
                  />
                  <span>
                    {lt(q.text)} <span className="text-slate-400">({t(`assessments.types.${q.type}`)}, {t('common.units.points', { count: q.points })})</span>
                  </span>
                </label>
              ))}
              {questions.length === 0 && <p className="p-3 text-slate-400">{t('assessments.emptyBank')}</p>}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('assessments.test.time')} type="number" min={5} max={180} step={1} value={testTime} onChange={(e) => setTestTime(e.target.value)} required />
            <Input label={t('assessments.test.passingLabel')} type="number" min={50} max={100} step={1} value={testPassing} onChange={(e) => setTestPassing(e.target.value)} required />
          </div>
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={testShuffle} onChange={(e) => setTestShuffle(e.target.checked)} className="rounded text-indigo-600" />
              <span className="text-slate-700 font-medium">{t('assessments.test.shuffleLabel')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={testIntegrity} onChange={(e) => setTestIntegrity(e.target.checked)} className="rounded text-indigo-600" />
              <span className="text-slate-700 font-medium">{t('assessments.test.integrityLabel')}</span>
            </label>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsTestOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('assessments.test.submit')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} title={t('assessments.ai.title')} subtitle={t('assessments.ai.subtitle')} size="md" preventClose={isGenerating}>
        <form onSubmit={handleGenerate} className="space-y-4 text-xs py-2">
          <Input label={t('assessments.ai.topic')} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder={t('assessments.ai.topicPlaceholder')} maxLength={200} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('assessments.ai.count')} type="number" min={1} max={20} step={1} value={aiCount} onChange={(e) => setAiCount(e.target.value)} required />
            <div>
              <label htmlFor="ai-diff" className="block text-xs font-medium text-slate-700 mb-1">
                {t('assessments.question.difficulty')}
              </label>
              <select id="ai-diff" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as Difficulty)} className={fieldClass}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {t(`assessments.ai.difficulty.${d}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isGenerating && (
            <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center space-x-3 text-indigo-900" role="status">
              <span className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true" />
              <span>{t('assessments.ai.generating')}</span>
            </div>
          )}
          {aiError && <ErrorState message={aiError.code === 'AI_INVALID' ? t('errors.aiInvalidResponse') : errorMessage(aiError)} />}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" disabled={isGenerating} onClick={() => setIsAiOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit" disabled={isGenerating || !aiTopic.trim()} isLoading={isGenerating}>
              <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('assessments.ai.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
