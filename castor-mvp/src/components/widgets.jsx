import { useEffect } from 'react';
import { Badge } from './ui';

// ── Formato de fecha es-CO ──
export const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d.length <= 10 ? d + 'T00:00:00' : d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const daysUntil = (d) => {
  if (!d) return null;
  const date = new Date(d.length <= 10 ? d + 'T00:00:00' : d);
  return Math.ceil((date - new Date('2026-04-16')) / 86400000);
};

// ── Barra de herramientas (búsqueda + filtros) ──
export function Toolbar({ children }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>;
}

export function SearchBox({ value, onChange, placeholder = 'Buscar…' }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-64 rounded-lg border border-white/10 bg-brand-bg/60 px-3 py-2 text-sm text-white placeholder-muted/60 outline-none transition focus:border-gold-accent/60"
    />
  );
}

export function SelectFilter({ value, onChange, options, allLabel = 'Todos' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/10 bg-brand-bg/60 px-3 py-2 text-sm text-white outline-none transition focus:border-gold-accent/60"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ── Pestañas internas ──
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-white/5 bg-panel-bg/60 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            active === t.id ? 'bg-gold-accent text-brand-bg' : 'text-muted hover:text-white'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Slide-panel lateral (mirror del slide-panel 560px del demo) ──
export function SlidePanel({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-white/10 bg-panel-bg shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-muted transition hover:text-white"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Tabla genérica (columns: {key,label,align,render}) ──
export function DataTable({ columns, rows, onRowClick, getKey, empty = 'Sin registros.' }) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-white/5 transition hover:bg-white/5 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}
                  >
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Badge de estado por mapa de tonos ──
const ESTADO_TONE = {
  // genéricos
  activo: 'green', confirmado: 'green', pagada: 'green', aceptada: 'green', completado: 'green',
  disponible: 'green', cerrada: 'green', entregado: 'green', resuelta: 'green', Compro: 'green',
  pendiente: 'gold', enviada: 'gold', borrador: 'muted', programado: 'blue', reservado: 'gold',
  en_proceso: 'gold', parcial: 'gold', 'En gestión': 'gold', Nuevo: 'blue', anticipo: 'blue',
  produccion: 'blue', en_transito: 'blue', abierta: 'blue', piloto: 'blue', idea: 'muted',
  vencida: 'red', rechazado: 'red', 'No interesado': 'red', cancelado: 'red', retirado: 'red',
  entregada: 'blue', despachado: 'green', pendiente_op: 'gold',
};

export function EstadoBadge({ value }) {
  const tone = ESTADO_TONE[value] || 'muted';
  const label = String(value || '').replace(/_/g, ' ');
  return <Badge tone={tone}>{label}</Badge>;
}

// ── Mini progress bar (pago %) ──
export function ProgressBar({ value, color = '#C9A961' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-muted">{value}%</span>
    </div>
  );
}
