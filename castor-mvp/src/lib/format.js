// Helpers de formato/fecha compartidos — espejo de los helpers globales del demo
// (fmtCOP, fmtNum, fmtDate, fmtDateTime, today, nowISO, daysBetween, addDays, uid).
// Fuente única para toda la app; consolida lo que antes vivía disperso.

const _copFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export const fmtCOP = (n) => _copFmt.format(Math.round(n || 0));

export const fmtNum = (n) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

const _toDate = (d) => (typeof d === 'string' && d.length <= 10 ? new Date(d + 'T00:00:00') : new Date(d));

export const fmtDate = (d) => {
  if (!d) return '—';
  const date = _toDate(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  const date = _toDate(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// "Hoy" del demo está fijado al periodo de la demo (mediados de abril 2026)
// para que las alertas de vencimiento sean coherentes con el seed.
export const DEMO_TODAY = '2026-04-16';
export const today = () => DEMO_TODAY;
export const nowISO = () => new Date().toISOString();

// Días entre dos fechas (b - a). Positivo = b está en el futuro respecto a a.
export const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.ceil((_toDate(b) - _toDate(a)) / 86400000);
};

// Días desde "hoy" (DEMO_TODAY) hasta d. Negativo = vencido.
export const daysUntil = (d) => daysBetween(DEMO_TODAY, d);

export const addDays = (d, n) => {
  const date = _toDate(d || DEMO_TODAY);
  date.setDate(date.getDate() + n);
  return date.toISOString().slice(0, 10);
};

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
