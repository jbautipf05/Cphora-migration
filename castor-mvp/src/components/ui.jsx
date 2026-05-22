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

// Espejo de kpiCard() del demo (HTML 2999): tarjeta con degradado .kpi-card,
// label tracking-widest, caja de ícono con borde teñido del color de acento.
export function KpiCard({ label, value, hint, accent = '#C9A961', icon }) {
  return (
    <div className="kpi-card rounded-xl p-5">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">{label}</span>
        {icon && (
          <span
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-brand-muted">{hint}</div>}
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
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

// ── Chip — espejo de chip-alto/medio/bajo del HTML ─────────────────────────
// Acepta cualquiera de las variantes que usa el demo (chip-* y badge-*).
const CHIP_VARIANTS = {
  alto: 'bg-red-500/20 text-red-300',
  medio: 'bg-amber-500/20 text-amber-300',
  bajo: 'bg-emerald-500/20 text-emerald-300',
  danger: 'bg-red-500/20 text-red-300',
  warn: 'bg-amber-500/20 text-amber-300',
  info: 'bg-sky-500/20 text-sky-300',
  ok: 'bg-emerald-500/20 text-emerald-300',
  gray: 'bg-slate-500/20 text-slate-300',
  gold: 'bg-gold-accent/20 text-gold-accent',
  violet: 'bg-violet-500/20 text-violet-300',
};

export function Chip({ variant = 'gray', children, className = '', uppercase = true }) {
  const cls = CHIP_VARIANTS[variant] || CHIP_VARIANTS.gray;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
        uppercase ? 'uppercase tracking-wide' : ''
      } ${cls} ${className}`}
    >
      {children}
    </span>
  );
}

// ── Mapas globales de "tipo" → color de chip (espejo del HTML) ──
// Usar como: <Chip variant={TIPO_LEAD[l.tipo]}>{l.tipo}</Chip>
export const TIPO_LEAD = { lead: 'info', institucional: 'gold' };
export const TIPO_VENTA = {
  produccion: 'info',
  stock: 'ok',
  mixto: 'violet',
  innovacion: 'gold',
};
export const TIPO_DOC = { factura: 'ok', 'remisión': 'gold', remision: 'gold' };
export const MEDIO_VENTA = {
  TIENDA: 'gold',
  LEAD: 'info',
  FERIA: 'violet',
  REMARKETING: 'warn',
  REFERIDO: 'ok',
};
export const PDV_VARIANT = {
  'CASTOR 43': 'gold',
  'CASTOR CTG': 'info',
  'PAGINA WEB': 'violet',
  GERENCIA: 'warn',
};

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
