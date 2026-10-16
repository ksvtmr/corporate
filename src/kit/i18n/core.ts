// Framework-agnostic translation engine: key lookup, plural selection,
// interpolation and observable fallback. Kept free of React so it can be
// unit-tested and reused by the mock backend.

import { FALLBACK_LOCALE, INTL_LOCALE_TAGS, Locale } from './config';

export type Messages = { [key: string]: string | Messages };
export type TranslateVars = Record<string, string | number | null | undefined>;

export const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

const missingRegistry = new Set<string>();

declare global {
  interface Window {
    __I18N_MISSING__?: string[];
  }
}

/** Records a missing key once and surfaces it to developers. */
export function reportMissing(locale: Locale, key: string): void {
  const id = `${locale}:${key}`;
  if (missingRegistry.has(id)) return;
  missingRegistry.add(id);
  if (typeof window !== 'undefined') {
    window.__I18N_MISSING__ = Array.from(missingRegistry);
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[i18n] Missing translation "${key}" for locale "${locale}"`);
  }
}

export function getMissingKeys(): string[] {
  return Array.from(missingRegistry);
}

export function clearMissingKeys(): void {
  missingRegistry.clear();
}

export function lookup(messages: Messages | undefined, key: string): string | Messages | undefined {
  if (!messages) return undefined;
  let node: string | Messages | undefined = messages;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return node;
}

function isPluralNode(node: Messages): boolean {
  return typeof node.other === 'string';
}

const pluralRulesCache = new Map<Locale, Intl.PluralRules>();
function pluralRules(locale: Locale): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(INTL_LOCALE_TAGS[locale]);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

const numberFormatCache = new Map<Locale, Intl.NumberFormat>();
function numberFormat(locale: Locale): Intl.NumberFormat {
  let fmt = numberFormatCache.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(INTL_LOCALE_TAGS[locale]);
    numberFormatCache.set(locale, fmt);
  }
  return fmt;
}

/** Replaces `{{name}}` placeholders. Numbers are formatted for the locale. */
export function interpolate(template: string, vars: TranslateVars | undefined, locale: Locale): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null) return match;
    return typeof value === 'number' ? numberFormat(locale).format(value) : String(value);
  });
}

function resolveString(node: string | Messages | undefined, vars: TranslateVars | undefined, locale: Locale): string | undefined {
  if (typeof node === 'string') return node;
  if (node && isPluralNode(node)) {
    const count = typeof vars?.count === 'number' ? vars.count : Number(vars?.count ?? NaN);
    const category = Number.isFinite(count) ? pluralRules(locale).select(count) : 'other';
    const form = node[category];
    return typeof form === 'string' ? form : (node.other as string);
  }
  return undefined;
}

export interface Catalogues {
  active: Messages | undefined;
  fallback: Messages | undefined;
}

/**
 * Translates `key` for `locale`. On a miss it uses the explicit fallback
 * locale and reports the miss; if the fallback lacks the key too it returns a
 * humanised last key segment rather than the raw dotted key.
 */
export function translate(catalogues: Catalogues, locale: Locale, key: string, vars?: TranslateVars): string {
  let template = resolveString(lookup(catalogues.active, key), vars, locale);
  if (template === undefined) {
    reportMissing(locale, key);
    if (locale !== FALLBACK_LOCALE) {
      template = resolveString(lookup(catalogues.fallback, key), vars, FALLBACK_LOCALE);
    }
  }
  if (template === undefined) {
    const last = key.split('.').pop() || key;
    return last.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  }
  return interpolate(template, vars, locale);
}

/** Flattens a nested catalogue into `{ "a.b.c": "text" }` (plural nodes stay grouped). */
export function flattenMessages(messages: Messages, prefix = ''): Record<string, string | Messages> {
  const out: Record<string, string | Messages> = {};
  for (const [k, v] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || isPluralNode(v)) {
      out[path] = v;
    } else {
      Object.assign(out, flattenMessages(v, path));
    }
  }
  return out;
}
