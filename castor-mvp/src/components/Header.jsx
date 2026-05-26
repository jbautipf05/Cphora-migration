import { useState } from 'react';
import { pageMeta } from '../nav';
import { useApp } from '../store/AppContext';
import { IconSearch } from './icons';
import Notifications from './Notifications';
import Modal from './Modal';

// Espejo del menú "Crear nuevo" de Demo6 (modal-quick-create): 9 opciones en el
// mismo orden, con los mismos emoji y etiquetas. H-001.
// Formato: [viewId, emoji, label, intentType|null]
// - intentType != null → setea pendingForm y la vista destino abre su formulario.
// - intentType == null → sólo navega (gap: el form de creación no existe aún en
//   React — Pago, Terminado, Cuenta bancaria; ver FASE1/H-001.md y HALLAZGOS_EXTRA).
const QUICK = [
  ['leads', '👤', 'Lead', 'lead'],
  ['cotizaciones', '📄', 'Cotización', 'quote'],
  ['ventas', '💰', 'Pago', null],
  ['garantias', '🛡', 'Garantía', 'garantia'],
  ['innovacion', '📦', 'Nuevo producto', 'producto'],
  ['inventario', '✓', 'Terminado', null],
  ['rrhh', '🧑', 'Empleado', 'empleado'],
  ['config-nomina', '🏦', 'Cuenta bancaria', null],
  ['postventa', '📞', 'Postventa', 'postventa'],
];

export default function Header({ view, search, setSearch, setView }) {
  const { title, breadcrumb } = pageMeta(view);
  const { setPendingForm } = useApp();
  const [quickOpen, setQuickOpen] = useState(false);

  const onPick = (id, type) => {
    if (type) setPendingForm({ type });
    setView(id);
    setQuickOpen(false);
  };

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

        <button onClick={() => setQuickOpen(true)} className="btn-gold">
          + Nuevo
        </button>
      </div>

      {/* Modal "Crear nuevo" — espejo de modal-quick-create de Demo6 */}
      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Crear nuevo" size="sm">
        <div className="space-y-1">
          {QUICK.map(([id, emoji, label, type]) => (
            <button
              key={id}
              onClick={() => onPick(id, type)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-brand-muted transition hover:bg-white/5 hover:text-white"
            >
              <span className="w-5 text-center text-base leading-none">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </header>
  );
}
