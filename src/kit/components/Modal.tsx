import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  /** Prevents closing via Escape/backdrop while an operation is running. */
  preventClose?: boolean;
}

// Stack of open modals so Escape only closes the top-most one (nested dialogs).
const openStack: string[] = [];
let bodyLocks = 0;

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, children, footer, maxWidth, size, preventClose = false }) => {
  const { t } = useI18n();
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const preventRef = useRef(preventClose);
  preventRef.current = preventClose;
  const effectiveWidth = size || maxWidth || 'lg';

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openStack.push(id);
    bodyLocks++;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]') || dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first || dialogRef.current)?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== id) return;
      if (e.key === 'Escape' && !preventRef.current) {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        // Keep keyboard focus inside the dialog.
        const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      const idx = openStack.indexOf(id);
      if (idx >= 0) openStack.splice(idx, 1);
      bodyLocks = Math.max(0, bodyLocks - 1);
      if (bodyLocks === 0) document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [isOpen, id]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => !preventClose && onClose()} />
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={subtitle ? `${id}-subtitle` : undefined}
          tabIndex={-1}
          className={`relative w-full ${widthClasses[effectiveWidth]} transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all border border-slate-200 z-10 focus:outline-none`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 sm:px-6 py-4">
            <div className="min-w-0">
              <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900 break-words">{title}</h3>
              {subtitle && <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={preventClose}
              aria-label={t('common.actions.close')}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="px-4 sm:px-6 py-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
};
