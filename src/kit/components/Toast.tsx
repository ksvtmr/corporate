import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

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
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-green-200 bg-white shadow-lg',
    error: 'border-red-200 bg-white shadow-lg',
    info: 'border-indigo-200 bg-white shadow-lg',
  };

  return (
    <div
      className={`flex items-start space-x-3 p-3.5 rounded-xl border max-w-sm w-full transition-all ${borders[toast.type]}`}
    >
      {icons[toast.type]}
      <div className="flex-1 text-xs">
        {toast.title && <h4 className="font-semibold text-slate-900 mb-0.5">{toast.title}</h4>}
        <p className="text-slate-600">{toast.message}</p>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
