import { useEffect } from 'react';

// Modal centrado reutilizable (espejo de openModal/.modal del demo).
// Úsalo para todos los formularios "crear/editar".
export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const maxW = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[size] || 'max-w-2xl';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 my-auto w-full ${maxW} rounded-2xl border border-brand-border bg-brand-bg-2 shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-brand-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold gold-title">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-brand-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-brand-border text-brand-muted transition hover:text-white"
          >
            ✕
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-3 border-t border-brand-border px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
