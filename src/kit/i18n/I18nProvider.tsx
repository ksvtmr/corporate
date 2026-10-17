import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  FALLBACK_LOCALE,
  INTL_LOCALE_TAGS,
  Locale,
  normalizeLocale,
  resolveInitialLocale,
  writeStoredLocale,
} from './config';
import { Catalogues, lookup, Messages, TranslateVars, translate } from './core';
import { MaybeLocalized, ResolvedText, resolveLocalized } from './localized';
import { loadCatalogue } from './loader';
import { CATALOGUE_HMR_EVENT, CatalogueHmrDetail } from './hmr';

export type DateStyle = 'date' | 'dateShort' | 'dateTime' | 'time' | 'monthDay';

export interface I18nContextValue {
  locale: Locale;
  /** Switches the UI language without a page reload. `persist` stores it as an explicit choice. */
  setLocale: (locale: Locale, options?: { persist?: boolean }) => Promise<void>;
  t: (key: string, vars?: TranslateVars) => string;
  /** True when `key` exists in the active catalogue (no fallback, no miss report). */
  has: (key: string) => boolean;
  /** Translation with inline markup, e.g. "Hello <b>{{name}}</b>" with `{ b: (c) => <strong>{c}</strong> }`. */
  rich: (key: string, vars: TranslateVars | undefined, tags: Record<string, (chunk: React.ReactNode) => React.ReactNode>) => React.ReactNode;
  /** Resolves admin/database content stored per language. */
  lt: (value: MaybeLocalized) => string;
  ltDetail: (value: MaybeLocalized) => ResolvedText;
  formatDate: (value: string | number | Date | null | undefined, style?: DateStyle) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** `value` is a percentage on the 0–100 scale. */
  formatPercent: (value: number, fractionDigits?: number) => string;
  formatFileSize: (megabytes: number) => string;
  compare: (a: string, b: string) => number;
  intlTag: string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/** Parses ISO dates; date-only strings are treated as local calendar dates (no UTC shift). */
export function parseDateValue(value: string | number | Date): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  const d = new Date(value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value);
  return isNaN(d.getTime()) ? null : d;
}

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { day: 'numeric', month: 'long', year: 'numeric' },
  dateShort: { day: '2-digit', month: '2-digit', year: 'numeric' },
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  time: { hour: '2-digit', minute: '2-digit' },
  monthDay: { day: 'numeric', month: 'long' },
};

function renderRich(
  text: string,
  tags: Record<string, (chunk: React.ReactNode) => React.ReactNode>,
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /<(\w+)>(.*?)<\/\1>/gs;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const render = tags[match[1]];
    parts.push(<React.Fragment key={i++}>{render ? render(match[2]) : match[2]}</React.Fragment>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

interface I18nProviderProps {
  children: React.ReactNode;
  /** Overrides the initial locale (tests). */
  initialLocale?: Locale;
  /** Preloaded catalogues (tests); skips async loading. */
  catalogues?: Partial<Record<Locale, Messages>>;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLocale, catalogues: preloaded }) => {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? resolveInitialLocale());
  const [store, setStore] = useState<Partial<Record<Locale, Messages>>>(() => preloaded ?? {});
  const [loadError, setLoadError] = useState(false);
  const storeRef = useRef(store);
  storeRef.current = store;

  const ensureLoaded = useCallback(async (loc: Locale) => {
    const needed: Locale[] = loc === FALLBACK_LOCALE ? [loc] : [loc, FALLBACK_LOCALE];
    const missing = needed.filter((l) => !storeRef.current[l]);
    if (missing.length === 0) return;
    const loaded = await Promise.all(missing.map(async (l) => [l, await loadCatalogue(l)] as const));
    setStore((prev) => {
      const next = { ...prev };
      for (const [l, messages] of loaded) next[l] = messages;
      storeRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    ensureLoaded(locale).catch((err) => {
      console.error('[i18n] Failed to load locale catalogue', err);
      setLoadError(true);
    });
  }, [locale, ensureLoaded]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Development: apply edited translation files without reloading the page.
  useEffect(() => {
    if (!import.meta.hot) return;
    const onUpdate = (event: Event) => {
      const { locale: updated, messages } = (event as CustomEvent<CatalogueHmrDetail>).detail;
      setStore((prev) => {
        if (!prev[updated]) return prev;
        const next = { ...prev, [updated]: messages };
        storeRef.current = next;
        return next;
      });
    };
    window.addEventListener(CATALOGUE_HMR_EVENT, onUpdate);
    return () => window.removeEventListener(CATALOGUE_HMR_EVENT, onUpdate);
  }, []);

  const setLocale = useCallback(async (next: Locale, options?: { persist?: boolean }) => {
    const safe = normalizeLocale(next);
    if (!safe) return;
    await ensureLoaded(safe);
    if (options?.persist !== false) writeStoredLocale(safe);
    setLocaleState(safe);
  }, [ensureLoaded]);

  const value = useMemo<I18nContextValue>(() => {
    const catalogues: Catalogues = { active: store[locale], fallback: store[FALLBACK_LOCALE] };
    const tag = INTL_LOCALE_TAGS[locale];
    const t = (key: string, vars?: TranslateVars) => translate(catalogues, locale, key, vars);
    const collator = new Intl.Collator(tag, { sensitivity: 'base', numeric: true });
    const numberFmt = new Intl.NumberFormat(tag);
    return {
      locale,
      setLocale,
      t,
      has: (key) => lookup(catalogues.active, key) !== undefined,
      rich: (key, vars, tags) => renderRich(t(key, vars), tags),
      lt: (v) => resolveLocalized(v, locale).text,
      ltDetail: (v) => resolveLocalized(v, locale),
      formatDate: (v, style = 'date') => {
        if (v === null || v === undefined || v === '') return '—';
        const d = parseDateValue(v);
        return d ? new Intl.DateTimeFormat(tag, DATE_STYLES[style]).format(d) : String(v);
      },
      formatNumber: (n, options) => (options ? new Intl.NumberFormat(tag, options).format(n) : numberFmt.format(n)),
      formatPercent: (n, digits = 0) =>
        new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n / 100),
      formatFileSize: (mb) =>
        mb >= 1024
          ? t('common.units.gb', { value: new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(mb / 1024) })
          : t('common.units.mb', { value: new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(mb) }),
      compare: (a, b) => collator.compare(a, b),
      intlTag: tag,
    };
  }, [locale, store, setLocale]);

  useEffect(() => {
    if (store[locale]) document.title = value.t('common.documentTitle');
  }, [store, locale, value]);

  if (!store[locale]) {
    if (loadError) {
      // Catalogue chunk failed to load (e.g. offline after deploy). Language-neutral recovery UI.
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
            /* i18n-ignore: catalogue failed to load, so a trilingual label is used */ aria-label="Reload / Перезагрузить / Қайта жүктеу"
          >
            ↻
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" role="status" aria-busy="true">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

/** Shorthand for components that only need `t`. */
export function useT() {
  return useI18n().t;
}
