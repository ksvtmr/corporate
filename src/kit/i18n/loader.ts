// Lazily loads translation catalogues: one chunk per locale (all namespaces of
// src/locales/<locale>/*.json bundled by src/locales/<locale>/index.ts), so only
// the active language and the fallback are downloaded.

import { Locale } from './config';
import { Messages } from './core';

const modules = import.meta.glob<Messages>('../../locales/*/index.ts', { import: 'default' });

export async function loadCatalogue(locale: Locale): Promise<Messages> {
  const load = modules[`../../locales/${locale}/index.ts`];
  if (!load) throw new Error(`No translation catalogue for locale "${locale}"`);
  return load();
}
