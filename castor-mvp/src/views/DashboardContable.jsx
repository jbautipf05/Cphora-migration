import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getKPIs, getSaldosPorClase, fmtCOP } from '../lib/accounting';
import { KpiCard, Panel, Badge, CLASS_LABELS, CLASS_COLORS } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';
import { IconBook, IconScale, IconLayers, IconArrow } from '../components/icons';

export default function DashboardContable({ onNavigate }) {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');

  const kpis = useMemo(
    () => getKPIs(journalLines, journalEntries, period),
    [journalLines, journalEntries, period],
  );
  const clases = useMemo(
    () => getSaldosPorClase(journalLines, journalEntries, period),
    [journalLines, journalEntries, period],
  );

  // Distribución de egresos por clase de gasto/costo (5,6,7) para barras.
  const egresosPorClase = useMemo(() => {
    const out = {};
    for (const [code, m] of Object.entries(kpis.mov)) {
      const cls = code[0];
      if (['5', '6', '7'].includes(cls)) {
        out[cls] = (out[cls] || 0) + (m.debe - m.haber);
      }
    }
    return out;
  }, [kpis.mov]);
  const totalEgresos = Object.values(egresosPorClase).reduce((a, b) => a + b, 0) || 1;

  const margen = kpis.ingresos > 0 ? (kpis.utilidad / kpis.ingresos) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Resumen contable reactivo · cambia el periodo para recalcular los KPIs.
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ingresos"
          value={fmtCOP(kpis.ingresos)}
          hint="Clase 4 · operacionales"
          accent="#34d399"
          icon={<IconArrow width={18} height={18} />}
        />
        <KpiCard
          label="Egresos"
          value={fmtCOP(kpis.egresos)}
          hint="Clases 5 · 6 · 7"
          accent="#f87171"
          icon={<IconArrow width={18} height={18} style={{ transform: 'rotate(135deg)' }} />}
        />
        <KpiCard
          label="Utilidad del periodo"
          value={fmtCOP(kpis.utilidad)}
          hint={`Margen ${margen.toFixed(1)}%`}
          accent="#C9A961"
          icon={<IconScale width={18} height={18} />}
        />
        <KpiCard
          label="Saldo en bancos"
          value={fmtCOP(kpis.saldoBancos)}
          hint="Acumulado · 4 cuentas"
          accent="#38bdf8"
          icon={<IconBook width={18} height={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ecuación contable */}
        <Panel title="Ecuación contable" subtitle="Activo = Pasivo + Patrimonio + Utilidad" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Activo', clases.activo, '#38bdf8'],
              ['Pasivo', clases.pasivo, '#fb923c'],
              ['Patrimonio', clases.patrimonio, '#a78bfa'],
              ['Utilidad', clases.utilidad, '#C9A961'],
            ].map(([label, val, color]) => (
              <div key={label} className="rounded-lg border border-white/5 bg-brand-bg/40 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
                </div>
                <p className="mt-2 text-lg font-bold tabular-nums text-white">{fmtCOP(val)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/5 bg-brand-bg/40 px-4 py-3">
            {clases.ecuacionCuadra ? (
              <Badge tone="green">✓ La ecuación contable cuadra</Badge>
            ) : (
              <Badge tone="red">✗ Descuadre de {fmtCOP(clases.diferencia)}</Badge>
            )}
            <span className="ml-auto text-xs text-muted">
              {fmtCOP(clases.activo)} = {fmtCOP(clases.pasivo + clases.patrimonio + clases.utilidad)}
            </span>
          </div>
        </Panel>

        {/* Composición de egresos */}
        <Panel title="Composición de egresos" subtitle="Por clase">
          <div className="space-y-3">
            {['5', '6', '7'].map((cls) => {
              const val = egresosPorClase[cls] || 0;
              const pct = (val / totalEgresos) * 100;
              return (
                <div key={cls}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">{CLASS_LABELS[cls]}</span>
                    <span className="tabular-nums text-white">{fmtCOP(val)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%`, background: CLASS_COLORS[cls] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">
            {kpis.numAsientos} asientos contables en el periodo seleccionado.
          </p>
        </Panel>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['libro-diario', 'Libro Diario', 'Ver asientos de doble partida', IconBook],
          ['balance-prueba', 'Balance de Prueba', 'Verificar el cuadre por cuenta', IconScale],
          ['plan-puc', 'Plan PUC', 'Explorar el catálogo de cuentas', IconLayers],
        ].map(([id, title, desc, Icon]) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="panel group flex items-center gap-4 p-5 text-left transition hover:border-gold-accent/40"
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-gold-accent/15 text-gold-accent">
              <Icon width={20} height={20} />
            </span>
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="text-xs text-muted">{desc}</p>
            </div>
            <IconArrow
              width={18}
              height={18}
              className="ml-auto text-muted transition group-hover:translate-x-1 group-hover:text-gold-accent"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
