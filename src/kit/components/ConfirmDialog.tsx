import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useI18n } from '../i18n/I18nProvider';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}

/** Confirmation step for destructive or irreversible actions. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  children,
  confirmDisabled,
}) => {
  const { t } = useI18n();
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm" preventClose={isLoading}>
      <div className="space-y-4 text-xs text-slate-700">
        <div className="flex items-start space-x-2">
          {tone === 'danger' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />}
          <div className="leading-relaxed">{message}</div>
        </div>
        {children}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
            {t('common.actions.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} type="button" onClick={onConfirm} isLoading={isLoading} disabled={confirmDisabled} data-autofocus>
            {confirmLabel || t('common.actions.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
