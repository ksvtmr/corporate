import React from 'react';
import { Globe } from 'lucide-react';
import { LOCALE_LABELS, SUPPORTED_LOCALES, Locale } from './config';
import { useI18n } from './I18nProvider';

interface LanguageSwitcherProps {
  onChange: (locale: Locale) => void;
  tone?: 'dark' | 'light';
  className?: string;
}

/** Segmented control for RU/KK/EN. Labels are endonyms so every user can find their language. */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ onChange, tone = 'light', className = '' }) => {
  const { locale, t } = useI18n();
  const dark = tone === 'dark';
  return (
    <div
      role="group"
      aria-label={t('common.language.label')}
      className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-lg border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${className}`}
    >
      <Globe className={`w-3.5 h-3.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`} aria-hidden="true" />
      {SUPPORTED_LOCALES.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            lang={loc}
            aria-pressed={active}
            title={LOCALE_LABELS[loc].native}
            aria-label={LOCALE_LABELS[loc].native}
            onClick={() => !active && onChange(loc)}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              active ? 'bg-indigo-600 text-white' : dark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {LOCALE_LABELS[loc].short}
          </button>
        );
      })}
    </div>
  );
};
