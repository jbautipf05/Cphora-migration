import { useEffect, useRef, useState } from 'react';
import { pageMeta } from '../nav';
import { IconSearch } from './icons';
import Notifications from './Notifications';

// Espejo del menú "Crear nuevo" de Demo6 (modal-quick-create): 9 opciones en el
// mismo orden y con los mismos íconos (emoji) y etiquetas. H-001.
// Nota: en Demo6 cada opción abre el formulario correspondiente; aquí navega al
// módulo (comportamiento actual de React). El "abrir formulario en contexto"
// queda pendiente de decisión (ver FASE1/H-001.md).
const QUICK = [
  ['leads', '👤', 'Lead'],
  ['cotizaciones', '📄', 'Cotización'],
  ['ventas', '💰', 'Pago'],
  ['garantias', '🛡', 'Garantía'],
  ['innovacion', '📦', 'Nuevo producto'],
  ['inventario', '✓', 'Terminado'],
  ['rrhh', '🧑', 'Empleado'],
  ['tesoreria', '🏦', 'Cuenta bancaria'],
  ['postventa', '📞', 'Postventa'],
];

export default function Header({ view, search, setSearch, setView }) {
  const { title, breadcrumb } = pageMeta(view);
  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (quickRef.current && !quickRef.current.contains(e.target)) setQuickOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between bg-brand-bg-2 px-8 py-4"
      style={{ borderBottom: '1px solid #2A4061' }}
    >
      <div className="min-w-0">
        <div className="mb-0.5 text-xs text-brand-muted">{breadcrumb}</div>
        <h1 className="truncate text-xl font-bold text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-72 rounded-lg border border-brand-border bg-brand-bg py-2 pl-9 pr-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-gold focus:outline-none"
          />
        </div>

        <Notifications onNavigate={setView} />

        <div className="relative" ref={quickRef}>
          <button onClick={() => setQuickOpen((o) => !o)} className="btn-gold">
            + Nuevo
          </button>
          {quickOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-brand-border bg-brand-panel shadow-2xl">
              {QUICK.map(([id, emoji, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setView(id);
                    setQuickOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-brand-muted transition hover:bg-white/5 hover:text-white"
                >
                  <span className="w-5 text-center text-base leading-none">{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
