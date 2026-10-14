import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  ...props
}) => {
  const variantStyles = {
    brand: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-green-50 text-green-700 border border-green-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
