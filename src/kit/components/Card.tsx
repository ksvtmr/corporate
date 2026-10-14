import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 ${className}`}
      {...props}
    >
      {title || subtitle || action ? (
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
            {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
};
