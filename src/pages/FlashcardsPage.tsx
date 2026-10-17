import React, { useEffect, useMemo, useState } from 'react';
import { RotateCw, CheckCircle2, XCircle, Clock, RotateCcw, Plus, Shuffle, Filter, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, Input, Modal, useI18n, useToast } from '@iclever/frontend-kit';
import { daysFromNow, DemoFlashcard, FLASHCARD_TOPICS, FlashcardTopic, todayIso } from '../demo/fixtures';
import { useFlashcardsState } from '../demo/useDemoData';

/** Simplified Leitner scheduling: "know" doubles the interval, "repeat" resets it to one day. */
export function scheduleCard(card: DemoFlashcard, known: boolean, today = new Date()): DemoFlashcard {
  const interval = known ? Math.min(Math.max(card.interval_days * 2, 1), 180) : 1;
  return { ...card, interval_days: interval, repetitions: known ? card.repetitions + 1 : card.repetitions, due_date: daysFromNow(interval, today) };
}

export const FlashcardsPage: React.FC = () => {
  const { t, lt, locale, formatDate } = useI18n();
  const toast = useToast();
  const [cards, setCards] = useFlashcardsState();
  const [topic, setTopic] = useState<'all' | FlashcardTopic>('all');
  const [includeNotDue, setIncludeNotDue] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTopic, setNewTopic] = useState<FlashcardTopic>('general');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const today = todayIso();
  const eligible = useMemo(
    () => cards.filter((c) => (topic === 'all' || c.topic === topic) && (includeNotDue || c.due_date <= today)),
    [cards, topic, includeNotDue, today],
  );

  const startSession = (shuffle = false) => {
    const ids = eligible.map((c) => c.id);
    if (shuffle) {
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    setQueue(ids);
    setIsFlipped(false);
    setReviewedCount(0);
  };

  // Rebuild the session when filters change.
  useEffect(() => {
    startSession(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, includeNotDue]);

  const current = cards.find((c) => c.id === queue[0]);
  const sessionTotal = reviewedCount + queue.length;

  const answer = (known: boolean) => {
    if (!current) return;
    setCards((prev) => prev.map((c) => (c.id === current.id ? scheduleCard(c, known) : c)));
    setIsFlipped(false);
    if (known) {
      setQueue((q) => q.slice(1));
      setReviewedCount((n) => n + 1);
    } else {
      // "Repeat" puts the card back at the end of today's session.
      setQueue((q) => (q.length > 1 ? [...q.slice(1), q[0]] : q));
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    const card: DemoFlashcard = {
      id: `fc-${Date.now().toString(36)}`,
      topic: newTopic,
      front: { [locale]: newFront.trim() },
      back: { [locale]: newBack.trim() },
      due_date: today,
      repetitions: 0,
      interval_days: 0,
    };
    setCards((prev) => [card, ...prev]);
    setQueue((q) => (topic === 'all' || topic === newTopic ? [card.id, ...q] : q));
    setIsCreateOpen(false);
    setNewFront('');
    setNewBack('');
    toast.success(t('flashcards.toast.created'));
  };

  const dueLabel = (c: DemoFlashcard) => (c.due_date <= today ? t('flashcards.due.today') : c.due_date === daysFromNow(1) ? t('flashcards.due.tomorrow') : formatDate(c.due_date, 'monthDay'));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('flashcards.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('flashcards.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => startSession(true)} disabled={eligible.length < 2}>
            <Shuffle className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            {t('flashcards.actions.shuffle')}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            {t('flashcards.actions.add')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <label htmlFor="fc-topic" className="text-slate-500 font-medium">
            {t('flashcards.topic')}
          </label>
          <select id="fc-topic" value={topic} onChange={(e) => setTopic(e.target.value as typeof topic)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500">
            <option value="all">{t('flashcards.allTopics', { count: cards.length })}</option>
            {FLASHCARD_TOPICS.map((tp) => (
              <option key={tp} value={tp}>
                {t(`flashcards.topics.${tp}`)} ({cards.filter((c) => c.topic === tp).length})
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
          <input type="checkbox" checked={includeNotDue} onChange={(e) => setIncludeNotDue(e.target.checked)} />
          {t('flashcards.includeNotDue')}
        </label>
      </div>

      {cards.length === 0 ? (
        <EmptyState title={t('flashcards.empty')} action={<Button size="sm" onClick={() => setIsCreateOpen(true)}>{t('flashcards.actions.add')}</Button>} />
      ) : current ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t('flashcards.progress', { current: reviewedCount + 1, total: sessionTotal })}</span>
            <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{t(`flashcards.topics.${current.topic}`)}</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={reviewedCount} aria-valuemin={0} aria-valuemax={sessionTotal}>
            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(reviewedCount / Math.max(sessionTotal, 1)) * 100}%` }} />
          </div>

          <button
            type="button"
            onClick={() => setIsFlipped((f) => !f)}
            aria-label={isFlipped ? t('flashcards.showQuestion') : t('flashcards.showAnswer')}
            className="w-full min-h-[280px] bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 flex flex-col justify-between hover:border-indigo-400 hover:shadow-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 w-full">
              <span>{t('flashcards.repetitions', { count: current.repetitions })}</span>
              <span className="flex items-center text-indigo-600 font-medium">
                <RotateCw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                {t('flashcards.flipHint')}
              </span>
            </div>
            <div className="py-6" aria-live="polite">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">{isFlipped ? t('flashcards.answerLabel') : t('flashcards.questionLabel')}</span>
              <p className={`font-semibold leading-relaxed ${isFlipped ? 'text-sm text-indigo-950 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100' : 'text-base text-slate-900'}`}>{lt(isFlipped ? current.back : current.front)}</p>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('flashcards.nextReview', { date: dueLabel(current) })}</span>
            </div>
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" className="w-full sm:w-44 border-red-200 text-red-700 hover:bg-red-50" onClick={() => answer(false)}>
              <XCircle className="w-4 h-4 mr-1.5 text-red-500" aria-hidden="true" />
              {t('flashcards.actions.repeat')}
            </Button>
            <Button variant="primary" className="w-full sm:w-44 bg-emerald-600 hover:bg-emerald-700" onClick={() => answer(true)}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('flashcards.actions.know')}
            </Button>
          </div>
          <div className="text-center">
            <button type="button" onClick={() => setDeleteId(current.id)} className="text-[11px] text-slate-400 hover:text-red-600 inline-flex items-center gap-1">
              <Trash2 className="w-3 h-3" aria-hidden="true" />
              {t('flashcards.actions.delete')}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{reviewedCount > 0 ? t('flashcards.done.title') : t('flashcards.done.nothingDue')}</h2>
          <p className="text-xs text-slate-500">{reviewedCount > 0 ? t('flashcards.done.text', { count: reviewedCount }) : t('flashcards.done.nothingDueText')}</p>
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            {!includeNotDue && (
              <Button variant="secondary" onClick={() => setIncludeNotDue(true)}>
                <RotateCcw className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {t('flashcards.done.studyAhead')}
              </Button>
            )}
            <Button variant="primary" onClick={() => startSession(true)} disabled={eligible.length === 0}>
              <Shuffle className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('flashcards.done.again')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title={t('flashcards.delete.title')}
        message={t('flashcards.delete.message')}
        confirmLabel={t('common.actions.delete')}
        onConfirm={() => {
          setCards((prev) => prev.filter((c) => c.id !== deleteId));
          setQueue((q) => q.filter((id) => id !== deleteId));
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t('flashcards.form.title')} subtitle={t('flashcards.form.subtitle')}>
        <form onSubmit={handleCreate} className="space-y-4 py-2 text-xs">
          <div>
            <label htmlFor="fc-new-topic" className="block text-slate-700 font-medium mb-1">
              {t('flashcards.form.topic')}
            </label>
            <select id="fc-new-topic" value={newTopic} onChange={(e) => setNewTopic(e.target.value as FlashcardTopic)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white">
              {FLASHCARD_TOPICS.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`flashcards.topics.${tp}`)}
                </option>
              ))}
            </select>
          </div>
          <Input label={t('flashcards.form.front')} placeholder={t('flashcards.form.frontPlaceholder')} value={newFront} onChange={(e) => setNewFront(e.target.value)} maxLength={300} required />
          <div>
            <label htmlFor="fc-back" className="block text-slate-700 font-medium mb-1">
              {t('flashcards.form.back')}
            </label>
            <textarea id="fc-back" rows={3} maxLength={1000} placeholder={t('flashcards.form.backPlaceholder')} value={newBack} onChange={(e) => setNewBack(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" type="submit" disabled={!newFront.trim() || !newBack.trim()}>
              {t('flashcards.form.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
