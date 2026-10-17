import { daysFromNow, DemoFlashcard } from './fixtures';

/** Simplified Leitner scheduling: "know" doubles the interval, "repeat" resets it to one day. */
export function scheduleCard(card: DemoFlashcard, known: boolean, today = new Date()): DemoFlashcard {
  const interval = known ? Math.min(Math.max(card.interval_days * 2, 1), 180) : 1;
  return { ...card, interval_days: interval, repetitions: known ? card.repetitions + 1 : card.repetitions, due_date: daysFromNow(interval, today) };
}
