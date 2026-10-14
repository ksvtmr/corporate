import React from 'react';

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
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 mb-1">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 
          transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'}
          ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
