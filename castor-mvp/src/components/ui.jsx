// Primitivas de UI compartidas.

export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, hint, accent = '#C9A961', icon }) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {icon && (
          <span
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ background: `${accent}1a`, color: accent }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = 'muted' }) {
  const tones = {
    muted: 'bg-white/5 text-muted border-white/10',
    gold: 'bg-gold-accent/15 text-gold-accent border-gold-accent/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const CLASS_LABELS = {
  1: 'Activo',
  2: 'Pasivo',
  3: 'Patrimonio',
  4: 'Ingresos',
  5: 'Gastos',
  6: 'Costos de venta',
  7: 'Costos de producción',
};

export const CLASS_COLORS = {
  1: '#38bdf8',
  2: '#fb923c',
  3: '#a78bfa',
  4: '#34d399',
  5: '#f87171',
  6: '#fbbf24',
  7: '#f472b6',
};
