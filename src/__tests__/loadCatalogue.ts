// Loads the reference (ru) catalogue synchronously for tests.
import type { Messages } from '@/kit/i18n/core';

const modules = import.meta.glob<Messages>('../locales/ru/*.json', { import: 'default', eager: true });
const catalogue: Messages = {};
for (const [path, messages] of Object.entries(modules)) catalogue[path.split('/').pop()!.replace('.json', '')] = messages;
export default catalogue;

export function loadAll(): Record<'ru' | 'kk' | 'en', Messages> {
  const all = import.meta.glob<Messages>('../locales/*/*.json', { import: 'default', eager: true });
  const out = { ru: {}, kk: {}, en: {} } as Record<'ru' | 'kk' | 'en', Messages>;
  for (const [path, messages] of Object.entries(all)) {
    const [, loc, file] = /locales\/(\w+)\/(\w+)\.json$/.exec(path)!;
    (out as Record<string, Messages>)[loc][file] = messages;
  }
  return out;
}
