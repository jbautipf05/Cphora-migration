import { useEffect, useMemo, useState } from 'react';
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

// ── Botón "× Limpiar" — visible sólo si hay filtros activos.
// `active` es bool o un array de booleanos (cualquiera true muestra el botón).
export function ClearFiltersButton({ active, onClear, label = '× Limpiar' }) {
  const isActive = Array.isArray(active) ? active.some(Boolean) : !!active;
  if (!isActive) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="text-xs text-red-300 transition hover:text-red-200 hover:underline"
    >
      {label}
    </button>
  );
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

// ── Tabla genérica (columns: {key,label,align,render,sortable,sortValue}) ──
// Ordenamiento clickeable en headers (espejo de toggleSort/applySort del demo).
// Cada columna acepta:
//  - sortable: bool (default true salvo que render sea custom sin sortValue)
//  - sortValue(row): valor crudo a comparar (si no se da, usa row[c.key])
export function DataTable({ columns, rows, onRowClick, getKey, empty = 'Sin registros.' }) {
  const [sort, setSort] = useState({ by: null, dir: 'asc' });

  const sortedRows = useMemo(() => {
    if (!sort.by) return rows;
    const col = columns.find((c) => c.key === sort.by);
    if (!col) return rows;
    const valueOf = col.sortValue || ((r) => r[col.key]);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) => {
    setSort((s) => {
      if (s.by !== key) return { by: key, dir: 'asc' };
      if (s.dir === 'asc') return { by: key, dir: 'desc' };
      return { by: null, dir: 'asc' };
    });
  };

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
              {columns.map((c) => {
                const isSortable = c.sortable !== false;
                const isActive = sort.by === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={isSortable ? () => toggleSort(c.key) : undefined}
                    className={`px-4 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''} ${
                      isSortable ? 'cursor-pointer select-none transition hover:text-white' : ''
                    } ${isActive ? 'text-brand-gold-light' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {isSortable && (
                        <span className="text-[9px] opacity-60">
                          {isActive ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-white/5 transition hover:bg-[rgba(201,169,97,0.06)] ${
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
            {sortedRows.length === 0 && (
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
