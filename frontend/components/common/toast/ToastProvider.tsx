'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number; // ms, 0 = persistent
  withProgress?: boolean;
  hideClose?: boolean;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

interface ToastInternal extends Required<ToastOptions> {
  id: number;
  createdAt: number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 2000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((options: ToastOptions) => {
    const now = Date.now();
    const toast: ToastInternal = {
      id: ++idRef.current,
      title: options.title,
      description: options.description ?? '',
      tone: options.tone ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION,
      withProgress: options.withProgress ?? true,
      hideClose: options.hideClose ?? true,
      createdAt: now,
    };

    setToasts((prev) => {
      const next = [toast, ...prev].slice(0, MAX_VISIBLE);
      return next;
    });

    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    }
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-3 pointer-events-none max-w-[420px] w-[clamp(260px,40vw,420px)] items-center">
            {toasts.map((toast) => (
              <ToastCard
                key={toast.id}
                toast={toast}
                onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              />
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portal}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const toneClass: Record<ToastTone, string> = {
  success: 'border-pink-400/50',
  info: 'border-blue-400/40',
  warning: 'border-amber-400/40',
  error: 'border-red-400/50',
};

const toneIcon: Record<ToastTone, React.ReactNode> = {
  success: (
    <div className="h-7 w-7 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/30">
      <Check size={16} strokeWidth={3} />
    </div>
  ),
  info: <div className="text-blue-300 text-lg">i</div>,
  warning: <div className="text-amber-300 text-lg">!</div>,
  error: <div className="text-red-300 text-lg">!</div>,
};

function ToastCard({ toast, onDismiss }: { toast: ToastInternal; onDismiss: () => void }) {
  const { title, description, tone, duration, withProgress, hideClose } = toast;
  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${toneClass[tone]} bg-background/80 backdrop-blur-2xl shadow-2xl`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {toneIcon[tone]}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {description && (
            <div className="text-xs text-foreground-secondary mt-1 leading-relaxed line-clamp-3">
              {description}
            </div>
          )}
        </div>
      </div>
      {!hideClose && (
        <button
          className="absolute top-2 right-2 h-7 w-7 rounded-xl bg-white/5 border border-white/10 text-foreground-secondary text-sm"
          onClick={onDismiss}
        >
          ×
        </button>
      )}
      {withProgress && duration > 0 && (
        <div className="absolute left-0 bottom-0 h-1 w-full bg-white/5">
          <span
            className="block h-full bg-pink-400"
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
              transformOrigin: 'left',
            }}
          />
        </div>
      )}
    </div>
  );
}

// inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('toast-progress-style')) {
  const style = document.createElement('style');
  style.id = 'toast-progress-style';
  style.innerHTML = `
  @keyframes toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `;
  document.head.appendChild(style);
}
