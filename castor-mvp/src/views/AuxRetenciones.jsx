import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, movimientosPorCuenta } from '../lib/accounting';
import { Panel, Badge } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';
import { fmtDate } from '../lib/format';

// Auxiliar de Retenciones — espejo compacto del auxiliar de retenciones del motor.
// Practicadas (Castor retiene → pasivo con la DIAN, naturaleza crédito) vs
// Sufridas (le retienen a Castor → anticipo de impuesto, naturaleza débito).
const PRACTICADAS = [
  { code: '236540', label: 'ReteFuente compras (2.5%)' },
  { code: '236801', label: 'ReteICA Bogotá' },
];
const SUFRIDAS = [
  { code: '135515', label: 'ReteFuente (recibida)' },
  { code: '135517', label: 'ReteIVA (recibida)' },
  { code: '135518', label: 'ReteICA (recibida)' },
];
const ALL = [...PRACTICADAS, ...SUFRIDAS];
const LABEL = Object.fromEntries(ALL.map((c) => [c.code, c.label]));

export default function AuxRetenciones() {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');

  const mov = useMemo(
    () => movimientosPorCuenta(journalLines, journalEntries, period),
    [journalEntries, journalLines, period],
  );

  // Practicadas: saldo crédito (haber − debe). Sufridas: saldo débito (debe − haber).
  const practicadasTotal = PRACTICADAS.reduce((a, c) => {
    const m = mov[c.code] || { debe: 0, haber: 0 };
    return a + (m.haber - m.debe);
  }, 0);
  const sufridasTotal = SUFRIDAS.reduce((a, c) => {
    const m = mov[c.code] || { debe: 0, haber: 0 };
    return a + (m.debe - m.haber);
  }, 0);

  const detalle = useMemo(() => {
    const idsPeriodo = new Set(
      period === 'all'
        ? journalEntries.map((e) => e.id)
        : journalEntries.filter((e) => e.period === period).map((e) => e.id),
    );
    const codes = new Set(ALL.map((c) => c.code));
    return journalLines
      .filter((l) => codes.has(l.accountCode) && idsPeriodo.has(l.journalId))
      .map((l) => {
        const je = journalEntries.find((e) => e.id === l.journalId);
        return { ...l, cuentaLabel: LABEL[l.accountCode], date: je?.date, concept: je?.concept };
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [journalEntries, journalLines, period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Auxiliar de retenciones · practicadas (por pagar a la DIAN) y sufridas (a favor).</p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase text-muted">Practicadas (por pagar)</p>
            <Badge tone="blue">Crédito</Badge>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-sky-300">{fmtCOP(practicadasTotal)}</p>
          <p className="text-[11px] text-muted">{PRACTICADAS.map((c) => c.code).join(' · ')}</p>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase text-muted">Sufridas (a favor)</p>
            <Badge tone="green">Débito</Badge>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">{fmtCOP(sufridasTotal)}</p>
          <p className="text-[11px] text-muted">{SUFRIDAS.map((c) => c.code).join(' · ')}</p>
        </div>
      </div>

      {/* Resumen por cuenta */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ALL.map((c) => {
          const m = mov[c.code] || { debe: 0, haber: 0 };
          const isCredit = PRACTICADAS.some((p) => p.code === c.code);
          const saldo = isCredit ? m.haber - m.debe : m.debe - m.haber;
          return (
            <div key={c.code} className="panel-2 rounded p-3">
              <p className="text-xs text-white">{c.label}</p>
              <p className="text-[11px] text-muted">{c.code} · {isCredit ? 'practicada' : 'sufrida'}</p>
              <p className="mt-1 font-semibold tabular-nums text-brand-gold-light">{fmtCOP(saldo)}</p>
            </div>
          );
        })}
      </div>

      <Panel title="Detalle de movimientos de retención">
        {detalle.length === 0 ? (
          <p className="text-sm text-muted">Sin movimientos de retención en el periodo.</p>
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
                    <td className="py-2 pr-2 font-mono text-xs text-gold-accent/80">{l.journalId}</td>
                    <td className="py-2 pr-2 text-white/90">{l.cuentaLabel}</td>
                    <td className="py-2 pr-2 text-white/70">{l.concept || '—'}</td>
                    <td className="py-2 pr-2 text-muted">{l.thirdParty || '—'}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-emerald-300/90">{l.debit ? fmtCOP(l.debit) : ''}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-orange-300/90">{l.credit ? fmtCOP(l.credit) : ''}</td>
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
