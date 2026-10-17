import React from 'react';
import { AlertCircle, Inbox, FlaskConical } from 'lucide-react';
import { Button } from './Button';
import { useI18n } from '../i18n/I18nProvider';

export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label, className = '' }) => {
  const { t } = useI18n();
  return (
    <div role="status" className={`flex items-center justify-center gap-2 text-xs text-slate-500 ${className}`}>
      <span className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true" />
      <span>{label ?? t('common.states.loading')}</span>
    </div>
  );
};

export const EmptyState: React.FC<{ title?: string; description?: string; action?: React.ReactNode; className?: string }> = ({
  title,
  description,
  action,
  className = '',
}) => {
  const { t } = useI18n();
  return (
    <div className={`py-10 px-4 text-center bg-white rounded-xl border border-slate-200 ${className}`}>
      <Inbox className="w-6 h-6 mx-auto text-slate-300 mb-2" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">{title ?? t('common.states.empty')}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void; className?: string }> = ({ message, onRetry, className = '' }) => {
  const { t } = useI18n();
  return (
    <div role="alert" className={`p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <span className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        {message ?? t('errors.generic')}
      </span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.actions.retry')}
        </Button>
      )}
    </div>
  );
};

/** Marks illustrative figures that are not computed from live data (honest UI for the demo build). */
export const DemoDataBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
      title={t('common.demoData.tooltip')}
    >
      <FlaskConical className="w-3 h-3" aria-hidden="true" />
      {t('common.demoData.label')}
    </span>
  );
};
