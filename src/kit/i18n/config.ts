// Central locale configuration. Every locale-aware module reads from here so
// supported languages, the default and the fallback are defined exactly once.

export const SUPPORTED_LOCALES = ['ru', 'kk', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Language used for first-time visitors whose browser prefers none of the supported locales. */
export const DEFAULT_LOCALE: Locale = 'ru';

/**
 * Explicit fallback for UI keys missing in the active locale.
 * Russian is the source language, so it is the most complete catalogue.
 * The fallback is observable: every miss is reported via `reportMissing`
 * (console warning in development, `window.__I18N_MISSING__` registry) and
 * `npm run i18n:check` fails CI on any missing key, so it never silently
 * becomes the permanent text for Kazakh or English users.
 */
export const FALLBACK_LOCALE: Locale = 'ru';

/** BCP 47 tags passed to `Intl` formatters. */
export const INTL_LOCALE_TAGS: Record<Locale, string> = {
  ru: 'ru-RU',
  kk: 'kk-KZ',
  en: 'en-US',
};

/** Endonyms shown in the language switcher (never translated). */
export const LOCALE_LABELS: Record<Locale, { short: string; native: string }> = {
  ru: { short: 'RU', native: 'Русский' },
  kk: { short: 'KK', native: 'Қазақша' },
  en: { short: 'EN', native: 'English' },
};

export const LOCALE_STORAGE_KEY = 'iclever_locale';

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Normalises arbitrary input ("kk-KZ", "EN", "kz", garbage) to a supported locale or null.
 * "kz" is a common (incorrect) code for Kazakh and is accepted defensively.
 */
export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  if (base === 'kz') return 'kk';
  return isSupportedLocale(base) ? base : null;
}

/** Picks the first supported locale from the browser preference list. */
export function detectBrowserLocale(languages?: readonly string[]): Locale | null {
  const list = languages ?? (typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []);
  for (const lang of list) {
    const loc = normalizeLocale(lang);
    if (loc) return loc;
  }
  return null;
}

/** Explicit user choice stored on this device (never a browser-detected value). */
export function readStoredLocale(): Locale | null {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable (private mode); the in-memory choice still applies.
  }
}

/** Resolution order for the initial locale: saved explicit choice → browser → default. */
export function resolveInitialLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale() ?? DEFAULT_LOCALE;
}
