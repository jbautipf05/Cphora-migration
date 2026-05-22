import { useApp } from '../store/AppContext';

export default function PeriodFilter({ value, onChange, includeAll = true }) {
  const { fiscalPeriods } = useApp();
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-muted">Periodo</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-brand-bg/60 px-3 py-1.5 text-sm text-white outline-none transition focus:border-gold-accent/60"
      >
        {includeAll && <option value="all">Acumulado 2026</option>}
        {fiscalPeriods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.estado === 'cerrado' ? ' · cerrado' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
