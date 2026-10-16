// Lazily loads translation catalogues. Each locale is split into namespace
// files (src/locales/<locale>/<namespace>.json); Vite emits them as separate
// chunks so only the active language (plus the fallback) is downloaded.

import { Locale } from './config';
import { Messages } from './core';

const modules = import.meta.glob<Messages>('../../locales/*/*.json', { import: 'default' });

export async function loadCatalogue(locale: Locale): Promise<Messages> {
  const entries = Object.entries(modules).filter(([path]) => path.includes(`/locales/${locale}/`));
  if (entries.length === 0) throw new Error(`No translation catalogue for locale "${locale}"`);
  const loaded = await Promise.all(
    entries.map(async ([path, load]) => {
      const ns = path.split('/').pop()!.replace(/\.json$/, '');
      return [ns, await load()] as const;
    }),
  );
  const catalogue: Messages = {};
  for (const [ns, messages] of loaded) catalogue[ns] = messages;
  return catalogue;
}
