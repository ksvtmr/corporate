// Locale-aware model for dynamic, database-driven or admin-managed content
// (department names, track titles, material descriptions, test questions...).
//
// Content is stored as a map of locale -> text. Stable identifiers live next to
// it and never depend on the displayed language. Older single-language records
// are plain strings, which keeps the model backward compatible.

import { FALLBACK_LOCALE, Locale, SUPPORTED_LOCALES } from './config';

export type LocalizedText = Partial<Record<Locale, string>>;
export type MaybeLocalized = string | LocalizedText | null | undefined;

export interface ResolvedText {
  text: string;
  /** Locale the returned text is actually written in (null for legacy plain strings). */
  locale: Locale | null;
  /** True when the requested locale was unavailable and a fallback was used. */
  isFallback: boolean;
}

export function isLocalizedText(value: unknown): value is LocalizedText {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value as object).every((k) => (SUPPORTED_LOCALES as readonly string[]).includes(k));
}

/**
 * Resolves content for `locale`. Fallback order is explicit and predictable:
 * requested locale → content's preferred locale (e.g. the org default) →
 * FALLBACK_LOCALE → any remaining supported locale.
 */
export function resolveLocalized(value: MaybeLocalized, locale: Locale, preferred?: Locale): ResolvedText {
  if (value === null || value === undefined) return { text: '', locale: null, isFallback: false };
  if (typeof value === 'string') return { text: value, locale: null, isFallback: false };

  const direct = value[locale];
  if (direct && direct.trim()) return { text: direct, locale, isFallback: false };

  const order: Locale[] = [];
  if (preferred) order.push(preferred);
  order.push(FALLBACK_LOCALE, ...SUPPORTED_LOCALES);
  for (const candidate of order) {
    const text = value[candidate];
    if (text && text.trim()) return { text, locale: candidate, isFallback: true };
  }
  return { text: '', locale: null, isFallback: true };
}

/** Locales that have no (non-empty) text. Useful for "translation missing" admin badges. */
export function missingLocales(value: MaybeLocalized): Locale[] {
  if (!value || typeof value === 'string') return [...SUPPORTED_LOCALES];
  return SUPPORTED_LOCALES.filter((loc) => !value[loc] || !value[loc]!.trim());
}

/** Normalises user input: trims values and drops empty translations. */
export function cleanLocalized(value: LocalizedText): LocalizedText {
  const out: LocalizedText = {};
  for (const loc of SUPPORTED_LOCALES) {
    const text = value[loc]?.trim();
    if (text) out[loc] = text;
  }
  return out;
}

/** Text used for case-insensitive search across every available language. */
export function searchableText(value: MaybeLocalized): string {
  if (!value) return '';
  if (typeof value === 'string') return value.toLowerCase();
  return Object.values(value).join(' ').toLowerCase();
}
