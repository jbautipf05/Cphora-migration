import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, getSaldoCuenta } from '../lib/accounting';
import { PUC_CATALOG } from '../data/pucCatalog';
import { Panel, Badge } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';

// Estado de Resultados (P&L) — Ingresos − Costos − Gastos = Utilidad.
// Agrupa por clase 4 (ingresos), 6/7 (costos) y 5 (gastos).
const SECTIONS = [
  { key: 'ingresos', label: 'Ingresos operacionales', classes: ['4'], color: '#34d399', sign: 1 },
  { key: 'costos', label: 'Costos', classes: ['6', '7'], color: '#fbbf24', sign: -1 },
  { key: 'gastos', label: 'Gastos operacionales', classes: ['5'], color: '#f87171', sign: -1 },
];

function Section({ label, color, classes, sign, lines, entries, period }) {
  const grupos = PUC_CATALOG.filter(
    (a) => a.level === 2 && classes.includes(a.classCode),
  );
  const filas = grupos
    .map((g) => ({
      ...g,
      saldo: getSaldoCuenta(g.code, lines, entries, period),
    }))
    .filter((g) => Math.abs(g.saldo) > 0.5);
  const subtotal = filas.reduce((a, g) => a + g.saldo, 0);

  return (
    <Panel title={label}>
      {filas.length === 0 ? (
        <p className="text-sm text-muted">Sin movimiento en el periodo.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {filas.map((g) => (
              <tr key={g.code} className="border-b border-white/5 last:border-0">
                <td className="py-2 pr-3 font-mono text-xs text-muted">{g.code}</td>
                <td className="py-2 text-white">{g.name}</td>
                <td className="py-2 text-right font-mono tabular-nums text-white">
                  {fmtCOP(g.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2" style={{ borderColor: color }}>
              <td colSpan={2} className="py-2 font-semibold uppercase tracking-wide" style={{ color }}>
                Subtotal {label}
              </td>
              <td className="py-2 text-right font-mono text-base font-bold tabular-nums" style={{ color }}>
                {sign < 0 ? '(' : ''}{fmtCOP(subtotal)}{sign < 0 ? ')' : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </Panel>
  );
}

export default function EstadoResultados() {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');

  // Calcula totales por sección y utilidad neta.
  const totales = useMemo(() => {
    const out = {};
    for (const s of SECTIONS) {
      const grupos = PUC_CATALOG.filter(
        (a) => a.level === 2 && s.classes.includes(a.classCode),
      );
      out[s.key] = grupos.reduce(
        (a, g) => a + getSaldoCuenta(g.code, journalLines, journalEntries, period),
        0,
      );
    }
    out.utilidadOperacional = out.ingresos - out.costos - out.gastos;
    out.margen = out.ingresos > 0 ? (out.utilidadOperacional / out.ingresos) * 100 : 0;
    return out;
  }, [journalEntries, journalLines, period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Estado de Resultados · Ingresos − Costos − Gastos = Utilidad operacional.
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="panel p-4">
          <p className="text-[11px] uppercase text-muted">Ingresos</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-300">
            {fmtCOP(totales.ingresos)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] uppercase text-muted">Costos</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-amber-300">
            ({fmtCOP(totales.costos)})
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] uppercase text-muted">Gastos</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-red-300">
            ({fmtCOP(totales.gastos)})
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] uppercase text-muted">Utilidad operacional</p>
          <p
            className={`mt-0.5 text-base font-bold tabular-nums ${
              totales.utilidadOperacional >= 0 ? 'text-gold-accent' : 'text-red-300'
            }`}
          >
            {fmtCOP(totales.utilidadOperacional)}
          </p>
          <Badge tone={totales.margen >= 0 ? 'green' : 'red'}>
            Margen {totales.margen.toFixed(1)}%
          </Badge>
        </div>
      </div>

      {SECTIONS.map((s) => (
        <Section
          key={s.key}
          label={s.label}
          color={s.color}
          classes={s.classes}
          sign={s.sign}
          lines={journalLines}
          entries={journalEntries}
          period={period}
        />
      ))}
    </div>
  );
}
