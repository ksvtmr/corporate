import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { t } = useI18n();
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" aria-hidden="true" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" aria-hidden="true" />,
    info: <Info className="w-5 h-5 text-indigo-500 flex-shrink-0" aria-hidden="true" />,
  };
  const borders = {
    success: 'border-green-200 bg-white shadow-lg',
    error: 'border-red-200 bg-white shadow-lg',
    info: 'border-indigo-200 bg-white shadow-lg',
  };
  return (
    <div role={toast.type === 'error' ? 'alert' : 'status'} className={`flex items-start space-x-3 p-3.5 rounded-xl border max-w-sm w-full transition-all ${borders[toast.type]}`}>
      {icons[toast.type]}
      <div className="flex-1 text-xs">
        {toast.title && <h4 className="font-semibold text-slate-900 mb-0.5">{toast.title}</h4>}
        <p className="text-slate-600 break-words">{toast.message}</p>
      </div>
      <button type="button" onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-slate-600" aria-label={t('common.actions.dismiss')}>
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

interface ToastContextValue {
  notify: (type: ToastMessage['type'], message: string, title?: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** App-wide toast stack with an ARIA live region; timers are cleaned up on unmount. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (type: ToastMessage['type'], message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message, title }]);
      timers.current.set(id, setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (m) => notify('success', m),
      error: (m) => notify('error', m),
      info: (m) => notify('info', m),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col items-end space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full sm:w-auto">
            <Toast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
