// Development only: lets edited translation files appear in the open browser
// tab without a page reload (see src/locales/<locale>/index.ts).
import type { Locale } from './config';
import type { Messages } from './core';

export const CATALOGUE_HMR_EVENT = 'iclever:i18n-hmr';

export interface CatalogueHmrDetail {
  locale: Locale;
  messages: Messages;
}

export function announceCatalogueUpdate(locale: Locale, messages: Messages) {
  window.dispatchEvent(new CustomEvent<CatalogueHmrDetail>(CATALOGUE_HMR_EVENT, { detail: { locale, messages } }));
}
