import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, movimientosPorCuenta } from '../lib/accounting';
import { Panel, Badge } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';
import { fmtDate } from '../lib/format';

// Auxiliar de IVA — saldos por tipo (generado/descontable) y detalle.
// Espejo compacto de renderAuxIVA() del castor_accounting.js.
const CUENTAS_IVA = {
  generado: { code: '240805', label: 'IVA generado', tone: 'blue' },
  descontable: { code: '240810', label: 'IVA descontable', tone: 'green' },
};

export default function AuxIVA() {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');

  // Movimientos del periodo.
  const mov = useMemo(
    () => movimientosPorCuenta(journalLines, journalEntries, period),
    [journalEntries, journalLines, period],
  );

  const generado = mov[CUENTAS_IVA.generado.code] || { debe: 0, haber: 0 };
  const descontable = mov[CUENTAS_IVA.descontable.code] || { debe: 0, haber: 0 };
  const ivaPorPagar = generado.haber - generado.debe - (descontable.debe - descontable.haber);

  // Detalle de líneas por cuenta IVA en el periodo.
  const detalle = useMemo(() => {
    const idsPeriodo = new Set(
      period === 'all'
        ? journalEntries.map((e) => e.id)
        : journalEntries.filter((e) => e.period === period).map((e) => e.id),
    );
    return Object.values(CUENTAS_IVA).flatMap((c) =>
      journalLines
        .filter((l) => l.accountCode === c.code && idsPeriodo.has(l.journalId))
        .map((l) => {
          const je = journalEntries.find((e) => e.id === l.journalId);
          return { ...l, cuentaLabel: c.label, date: je?.date, concept: je?.concept };
        }),
    ).sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [journalEntries, journalLines, period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Auxiliar IVA · resumen de saldos generados, descontables y neto a pagar.
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase text-muted">IVA generado (240805)</p>
            <Badge tone="blue">Crédito</Badge>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-sky-300">
            {fmtCOP(generado.haber - generado.debe)}
          </p>
          <p className="text-[11px] text-muted">
            DB {fmtCOP(generado.debe)} · CR {fmtCOP(generado.haber)}
          </p>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase text-muted">IVA descontable (240810)</p>
            <Badge tone="green">Débito</Badge>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
            {fmtCOP(descontable.debe - descontable.haber)}
          </p>
          <p className="text-[11px] text-muted">
            DB {fmtCOP(descontable.debe)} · CR {fmtCOP(descontable.haber)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] uppercase text-muted">IVA neto a pagar</p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              ivaPorPagar >= 0 ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            {fmtCOP(ivaPorPagar)}
          </p>
          <p className="text-[11px] text-muted">
            Generado − Descontable
          </p>
        </div>
      </div>

      <Panel title="Detalle de movimientos IVA">
        {detalle.length === 0 ? (
          <p className="text-sm text-muted">Sin movimientos de IVA en el periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Asiento</th>
                  <th className="py-2 pr-2">Cuenta</th>
                  <th className="py-2 pr-2">Concepto</th>
                  <th className="py-2 pr-2">Tercero</th>
                  <th className="py-2 pr-2 text-right">Debe</th>
                  <th className="py-2 pr-2 text-right">Haber</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((l) => (
                  <tr key={l.id} className="border-b border-white/5">
                    <td className="py-2 pr-2 text-muted">{fmtDate(l.date)}</td>
                    <td className="py-2 pr-2 font-mono text-xs text-gold-accent/80">
                      {l.journalId}
                    </td>
                    <td className="py-2 pr-2 text-white/90">{l.cuentaLabel}</td>
                    <td className="py-2 pr-2 text-white/70">{l.concept || '—'}</td>
                    <td className="py-2 pr-2 text-muted">{l.thirdParty || '—'}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-emerald-300/90">
                      {l.debit ? fmtCOP(l.debit) : ''}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-orange-300/90">
                      {l.credit ? fmtCOP(l.credit) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
