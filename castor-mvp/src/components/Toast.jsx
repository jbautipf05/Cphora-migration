import { createContext, useCallback, useContext, useState } from 'react';

// Sistema de toasts (espejo de toast() del demo). Provee useToast() → toast(msg, type).
const ToastContext = createContext(() => {});

const TONES = {
  info: 'border-brand-border bg-brand-panel text-white',
  ok: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  warn: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
  error: 'border-red-500/40 bg-red-500/15 text-red-200',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[80] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast min-w-[220px] max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl ${TONES[t.type] || TONES.info}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
