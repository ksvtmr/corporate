import { useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { ApiError } from './client';

/**
 * Maps API error codes to localized, user-safe messages. Server messages are
 * developer-facing English and are never shown verbatim.
 */
export function useApiErrorMessage() {
  const { t, has } = useI18n();
  return useCallback(
    (error: ApiError | undefined | null, fallbackKey = 'errors.generic'): string => {
      if (!error) return t(fallbackKey);
      const details = (error.details || {}) as { rule?: string; field?: string; max?: number; min?: number };
      if (error.code === 'VALIDATION_ERROR' && details.rule && has(`errors.rules.${details.rule}`)) {
        const field = details.field && has(`errors.fields.${details.field}`) ? t(`errors.fields.${details.field}`) : details.field || '';
        return t(`errors.rules.${details.rule}`, { field, max: details.max, min: details.min });
      }
      if (has(`errors.codes.${error.code}`)) return t(`errors.codes.${error.code}`);
      return t(fallbackKey);
    },
    [t, has],
  );
}
