import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, getSaldoCuenta } from '../lib/accounting';
import { PUC_CATALOG } from '../data/pucCatalog';
import { Panel, Badge } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';

// Balance General clasificado — Activo, Pasivo y Patrimonio agrupados por
// grupo PUC (level 2). Compara A = P + Pat + Utilidad para verificar cuadre.
const GROUPS = {
  1: { label: 'ACTIVO', color: '#38bdf8' },
  2: { label: 'PASIVO', color: '#fb923c' },
  3: { label: 'PATRIMONIO', color: '#a78bfa' },
};

function GroupSection({ classCode, color, label, lines, entries, period }) {
  // Cuentas de grupo (level 2) bajo esta clase.
  const grupos = PUC_CATALOG.filter((a) => a.level === 2 && a.classCode === classCode);
  const filas = grupos
    .map((g) => ({
      ...g,
      saldo: getSaldoCuenta(g.code, lines, entries, period),
    }))
    .filter((g) => Math.abs(g.saldo) > 0.5);

  const total = filas.reduce((a, g) => a + g.saldo, 0);

  return (
    <Panel title={label}>
      {filas.length === 0 ? (
        <p className="text-sm text-muted">Sin saldos en el periodo seleccionado.</p>
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
                Total {label}
              </td>
              <td className="py-2 text-right font-mono text-base font-bold tabular-nums" style={{ color }}>
                {fmtCOP(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </Panel>
  );
}

export default function BalanceGeneral() {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');

  // Saldos por clase para verificar la ecuación A = P + Pat + Utilidad.
  const totales = useMemo(() => {
    const activo = PUC_CATALOG.filter((a) => a.level === 2 && a.classCode === '1').reduce(
      (a, g) => a + getSaldoCuenta(g.code, journalLines, journalEntries, period),
      0,
    );
    const pasivo = PUC_CATALOG.filter((a) => a.level === 2 && a.classCode === '2').reduce(
      (a, g) => a + getSaldoCuenta(g.code, journalLines, journalEntries, period),
      0,
    );
    const patrimonio = PUC_CATALOG.filter((a) => a.level === 2 && a.classCode === '3').reduce(
      (a, g) => a + getSaldoCuenta(g.code, journalLines, journalEntries, period),
      0,
    );
    // Utilidad = ingresos - gastos (clases 4 vs 5,6,7).
    const ingresos = PUC_CATALOG.filter((a) => a.level === 2 && a.classCode === '4').reduce(
      (a, g) => a + getSaldoCuenta(g.code, journalLines, journalEntries, period),
      0,
    );
    const gastos = ['5', '6', '7'].reduce(
      (acc, c) =>
        acc +
        PUC_CATALOG.filter((a) => a.level === 2 && a.classCode === c).reduce(
          (a, g) => a + getSaldoCuenta(g.code, journalLines, journalEntries, period),
          0,
        ),
      0,
    );
    const utilidad = ingresos - gastos;
    const lhs = activo;
    const rhs = pasivo + patrimonio + utilidad;
    return { activo, pasivo, patrimonio, utilidad, lhs, rhs, diff: lhs - rhs };
  }, [journalEntries, journalLines, period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Estado de situación financiera · saldos clasificados por grupo PUC.
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <Panel title="Verificación de la ecuación contable">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
            <p className="text-[11px] uppercase text-muted">Activo</p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-sky-300">
              {fmtCOP(totales.activo)}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
            <p className="text-[11px] uppercase text-muted">Pasivo</p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-orange-300">
              {fmtCOP(totales.pasivo)}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
            <p className="text-[11px] uppercase text-muted">Patrimonio</p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-violet-300">
              {fmtCOP(totales.patrimonio)}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
            <p className="text-[11px] uppercase text-muted">Utilidad del ejercicio</p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-gold-accent">
              {fmtCOP(totales.utilidad)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted">{fmtCOP(totales.lhs)} = {fmtCOP(totales.rhs)}</span>
          {Math.abs(totales.diff) < 1 ? (
            <Badge tone="green">✓ Ecuación cuadra</Badge>
          ) : (
            <Badge tone="red">✗ Diferencia {fmtCOP(totales.diff)}</Badge>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GroupSection
          classCode="1"
          color={GROUPS[1].color}
          label={GROUPS[1].label}
          lines={journalLines}
          entries={journalEntries}
          period={period}
        />
        <div className="space-y-4">
          <GroupSection
            classCode="2"
            color={GROUPS[2].color}
            label={GROUPS[2].label}
            lines={journalLines}
            entries={journalEntries}
            period={period}
          />
          <GroupSection
            classCode="3"
            color={GROUPS[3].color}
            label={GROUPS[3].label}
            lines={journalLines}
            entries={journalEntries}
            period={period}
          />
        </div>
      </div>
    </div>
  );
}
