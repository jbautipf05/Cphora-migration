import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { buildBalancePrueba, getSaldosPorClase, fmtCOP } from '../lib/accounting';
import { Panel, Badge, CLASS_LABELS, CLASS_COLORS } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';

export default function BalancePrueba() {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');

  const { rows, totals, cuadra } = useMemo(
    () => buildBalancePrueba(journalLines, journalEntries, period),
    [journalLines, journalEntries, period],
  );
  const clases = useMemo(
    () => getSaldosPorClase(journalLines, journalEntries, period),
    [journalLines, journalEntries, period],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Saldo inicial · movimientos del periodo · saldo final, por cuenta auxiliar.
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Verificación del cuadre */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Sumas iguales</p>
          <div className="mt-2 flex items-center gap-2">
            {cuadra ? (
              <Badge tone="green">✓ Debe = Haber</Badge>
            ) : (
              <Badge tone="red">✗ Descuadre</Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            Σ Debe {fmtCOP(totals.debe)} · Σ Haber {fmtCOP(totals.haber)}
          </p>
        </div>
        <div className="panel p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted">Ecuación contable</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-sky-300">{fmtCOP(clases.activo)}</span>
            <span className="text-muted">=</span>
            <span className="font-semibold text-orange-300">{fmtCOP(clases.pasivo)}</span>
            <span className="text-muted">+</span>
            <span className="font-semibold text-violet-300">{fmtCOP(clases.patrimonio)}</span>
            <span className="text-muted">+</span>
            <span className="font-semibold text-gold-accent">{fmtCOP(clases.utilidad)}</span>
            <span className="ml-2">
              {clases.ecuacionCuadra ? (
                <Badge tone="green">✓ cuadra</Badge>
              ) : (
                <Badge tone="red">✗ {fmtCOP(clases.diferencia)}</Badge>
              )}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Activo = Pasivo + Patrimonio + Utilidad
          </p>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Cuenta</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 text-right font-medium">Saldo inicial</th>
                <th className="px-4 py-3 text-right font-medium">Debe</th>
                <th className="px-4 py-3 text-right font-medium">Haber</th>
                <th className="px-4 py-3 text-right font-medium">Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-white/5 transition hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: CLASS_COLORS[r.classCode] }}
                        title={CLASS_LABELS[r.classCode]}
                      />
                      <span className="font-mono text-xs text-gold-accent">{r.code}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white/90">{r.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted">
                    {fmtCOP(r.saldoInicial)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-300/90">
                    {r.debe ? fmtCOP(r.debe) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-orange-300/90">
                    {r.haber ? fmtCOP(r.haber) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-white">
                    {fmtCOP(r.saldoFinal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 font-semibold">
                <td className="px-4 py-3 text-white" colSpan={3}>
                  Totales movimientos
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300">
                  {fmtCOP(totals.debe)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-orange-300">
                  {fmtCOP(totals.haber)}
                </td>
                <td className="px-4 py-3 text-right text-muted">
                  {cuadra ? '✓' : '✗'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}
