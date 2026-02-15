'use client';

import { create } from 'zustand';
import { useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// ─── Toast Store ────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Convenience hook */
export function useToast() {
  const { addToast } = useToastStore();
  return {
    success: useCallback((msg: string) => addToast('success', msg), [addToast]),
    error: useCallback((msg: string) => addToast('error', msg), [addToast]),
    info: useCallback((msg: string) => addToast('info', msg), [addToast]),
  };
}

// ─── Toast Container ────────────────────────────────────────

const ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-success flex-shrink-0" />,
  error: <AlertCircle size={18} className="text-danger flex-shrink-0" />,
  info: <Info size={18} className="text-info flex-shrink-0" />,
};

const BG: Record<ToastType, string> = {
  success: 'border-success/30 bg-success/10',
  error: 'border-danger/30 bg-danger/10',
  info: 'border-info/30 bg-info/10',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-in slide-in-from-right fade-in pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${BG[toast.type]}`}
          style={{ maxWidth: 380 }}
        >
          {ICON[toast.type]}
          <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted hover:text-foreground flex-shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
