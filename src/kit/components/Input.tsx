import React, { useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 mb-1">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? messageId : undefined}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 
          transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'}
          ${className}`}
        {...props}
      />
      {error ? (
        <p id={messageId} className="mt-1 text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p id={messageId} className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

/** Password field with a show/hide toggle. */
export const PasswordInput: React.FC<Omit<InputProps, 'type'>> = ({ className = '', ...props }) => {
  const [visible, setVisible] = React.useState(false);
  const { t } = useI18n();
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={`pr-10 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={visible}
        className={`absolute right-2 ${props.label ? 'top-[26px]' : 'top-1.5'} p-1 rounded text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
      >
        {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
      </button>
    </div>
  );
};
