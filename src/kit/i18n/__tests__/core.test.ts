import { beforeEach, describe, expect, it } from 'vitest';
import { clearMissingKeys, getMissingKeys, interpolate, Messages, translate } from '../core';
import { detectBrowserLocale, normalizeLocale, resolveInitialLocale, LOCALE_STORAGE_KEY } from '../config';
import { missingLocales, resolveLocalized } from '../localized';

const ru: Messages = {
  common: {
    hello: 'Привет, {{name}}',
    only_ru: 'Только по-русски',
    files: { one: '{{count}} файл', few: '{{count}} файла', many: '{{count}} файлов', other: '{{count}} файла' },
  },
};
const kk: Messages = { common: { hello: 'Сәлем, {{name}}', files: { one: '{{count}} файл', other: '{{count}} файл' } } };
const en: Messages = { common: { hello: 'Hello, {{name}}', files: { one: '{{count}} file', other: '{{count}} files' } } };

beforeEach(() => {
  clearMissingKeys();
  localStorage.clear();
});

describe('translate', () => {
  it('interpolates dynamic values in every language', () => {
    expect(translate({ active: ru, fallback: ru }, 'ru', 'common.hello', { name: 'Айгерим' })).toBe('Привет, Айгерим');
    expect(translate({ active: kk, fallback: ru }, 'kk', 'common.hello', { name: 'Айгерим' })).toBe('Сәлем, Айгерим');
    expect(translate({ active: en, fallback: ru }, 'en', 'common.hello', { name: 'Aigerim' })).toBe('Hello, Aigerim');
  });

  it('selects CLDR plural forms per locale', () => {
    const t = (cat: Messages, loc: 'ru' | 'kk' | 'en', n: number) => translate({ active: cat, fallback: ru }, loc, 'common.files', { count: n });
    expect([1, 2, 5, 21, 22, 25].map((n) => t(ru, 'ru', n))).toEqual(['1 файл', '2 файла', '5 файлов', '21 файл', '22 файла', '25 файлов']);
    expect([1, 5].map((n) => t(en, 'en', n))).toEqual(['1 file', '5 files']);
    expect(t(kk, 'kk', 7)).toBe('7 файл');
  });

  it('formats numeric values for the locale', () => {
    expect(interpolate('{{count}}', { count: 12500 }, 'en')).toBe('12,500');
    expect(interpolate('{{count}}', { count: 12500 }, 'ru')).toMatch(/^12\s500$/);
  });

  it('uses the explicit fallback for missing keys and records the miss (observable fallback)', () => {
    expect(translate({ active: en, fallback: ru }, 'en', 'common.only_ru')).toBe('Только по-русски');
    expect(getMissingKeys()).toContain('en:common.only_ru');
    expect(window.__I18N_MISSING__).toContain('en:common.only_ru');
  });

  it('never renders a raw dotted key when a key is missing everywhere', () => {
    const out = translate({ active: en, fallback: ru }, 'en', 'common.someMissingKey');
    expect(out).toBe('some Missing Key');
    expect(out).not.toContain('.');
  });
});

describe('locale configuration', () => {
  it('normalises locale codes and rejects unsupported values', () => {
    expect(normalizeLocale('kk-KZ')).toBe('kk');
    expect(normalizeLocale('KZ')).toBe('kk');
    expect(normalizeLocale('EN_us')).toBe('en');
    expect(normalizeLocale('de')).toBeNull();
    expect(normalizeLocale('<script>')).toBeNull();
    expect(normalizeLocale(42)).toBeNull();
  });

  it('detects the first supported browser language', () => {
    expect(detectBrowserLocale(['de-DE', 'kk-KZ', 'en'])).toBe('kk');
    expect(detectBrowserLocale(['fr'])).toBeNull();
  });

  it('prefers the saved explicit choice over the browser language', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    expect(resolveInitialLocale()).toBe('en');
    localStorage.setItem(LOCALE_STORAGE_KEY, 'garbage');
    expect(['ru', 'kk', 'en']).toContain(resolveInitialLocale());
  });
});

describe('localized dynamic content', () => {
  it('returns the requested language when available', () => {
    expect(resolveLocalized({ ru: 'Отдел', kk: 'Бөлім', en: 'Team' }, 'kk')).toEqual({ text: 'Бөлім', locale: 'kk', isFallback: false });
  });

  it('falls back predictably and flags the fallback', () => {
    const res = resolveLocalized({ en: 'Team' }, 'kk');
    expect(res).toEqual({ text: 'Team', locale: 'en', isFallback: true });
    expect(resolveLocalized({ ru: 'Отдел', en: 'Team' }, 'kk', 'en').locale).toBe('en');
  });

  it('keeps legacy single-language strings working', () => {
    expect(resolveLocalized('Legacy name', 'en')).toEqual({ text: 'Legacy name', locale: null, isFallback: false });
  });

  it('reports missing translations for admins', () => {
    expect(missingLocales({ ru: 'a', kk: ' ' })).toEqual(['kk', 'en']);
  });
});
