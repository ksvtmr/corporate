import React from 'react';
import { useI18n } from '@iclever/frontend-kit';

/** Marks preview deployments so testers never confuse them with production. */
export const EnvironmentBadge: React.FC = () => {
  const { t } = useI18n();
  if (import.meta.env.VITE_DEPLOY_ENV !== 'preview') return null;
  const version = import.meta.env.VITE_APP_VERSION;
  return (
    <div
      role="note"
      data-environment="preview"
      title={t('common.previewBuild.tooltip')}
      className="fixed bottom-2 left-2 z-[60] pointer-events-none rounded-full bg-amber-500/95 px-3 py-1 text-[11px] font-semibold text-white shadow"
    >
      {t('common.previewBuild.label')}
      {version ? ` · ${version.slice(0, 7)}` : ''}
    </div>
  );
};
