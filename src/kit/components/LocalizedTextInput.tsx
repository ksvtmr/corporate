import React, { useId, useState } from 'react';
import { LOCALE_LABELS, Locale, SUPPORTED_LOCALES } from '../i18n/config';
import { LocalizedText, MaybeLocalized, missingLocales } from '../i18n/localized';
import { useI18n } from '../i18n/I18nProvider';

interface LocalizedTextInputProps {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  /** Locale that must be filled (usually the organization default). */
  requiredLocale?: Locale;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Editor for admin-managed content in RU/KK/EN. One language is required; the
 * others are optional and flagged as missing so administrators can see gaps.
 */
export const LocalizedTextInput: React.FC<LocalizedTextInputProps> = ({ label, value, onChange, requiredLocale, multiline, placeholder, maxLength = 200 }) => {
  const { locale, t } = useI18n();
  const id = useId();
  const [active, setActive] = useState<Locale>(requiredLocale ?? locale);
  const missing = missingLocales(value);
  const fieldClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1 gap-2">
        <label htmlFor={`${id}-${active}`} className="block text-xs font-medium text-slate-700">
          {label} <span className="text-slate-400 font-normal">({LOCALE_LABELS[active].native})</span>
        </label>
        <div role="tablist" aria-label={t('common.language.translations')} className="flex gap-1">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              role="tab"
              aria-selected={loc === active}
              onClick={() => setActive(loc)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                loc === active ? 'bg-indigo-600 text-white border-indigo-600' : missing.includes(loc) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200'
              }`}
              title={missing.includes(loc) ? t('common.language.missingTranslation') : LOCALE_LABELS[loc].native}
            >
              {LOCALE_LABELS[loc].short}
              {missing.includes(loc) ? ' •' : ''}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          id={`${id}-${active}`}
          lang={active}
          rows={3}
          maxLength={maxLength}
          className={fieldClass}
          placeholder={placeholder}
          value={value[active] ?? ''}
          required={active === requiredLocale}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
        />
      ) : (
        <input
          id={`${id}-${active}`}
          lang={active}
          maxLength={maxLength}
          className={fieldClass}
          placeholder={placeholder}
          value={value[active] ?? ''}
          required={active === requiredLocale}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
        />
      )}
      {missing.length > 0 && missing.length < SUPPORTED_LOCALES.length && (
        <p className="mt-1 text-[11px] text-amber-700">
          {t('common.language.missingFor', { locales: missing.map((l) => LOCALE_LABELS[l].short).join(', ') })}
        </p>
      )}
    </div>
  );
};

/** Admin-facing marker for content that has no translation in the current language. */
export const TranslationFallbackMark: React.FC<{ value: MaybeLocalized }> = ({ value }) => {
  const { ltDetail, t } = useI18n();
  const res = ltDetail(value);
  if (!res.isFallback || !res.locale) return null;
  return (
    <span className="ml-1 inline-flex items-center px-1 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 align-middle" title={t('common.language.shownIn', { language: LOCALE_LABELS[res.locale].native })}>
      {LOCALE_LABELS[res.locale].short}
    </span>
  );
};
