import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, fmtDate, today, daysBetween } from '../lib/format';
import { KpiCard, Panel } from '../components/ui';

// Cartera (CxC) — antigüedad de saldos por cobrar a clientes.
// Lectura sobre invoices + payments (confirmados). Saldo = monto − pagos del pedido.
// Aging por dueDate vs hoy: corriente / 1-30 / 31-60 / 61-90 / >90 días.
const BUCKETS = [
  { key: 'corriente', label: 'Corriente', tone: 'text-emerald-300' },
  { key: 'b1_30', label: '1–30', tone: 'text-amber-300' },
  { key: 'b31_60', label: '31–60', tone: 'text-orange-300' },
  { key: 'b61_90', label: '61–90', tone: 'text-red-300' },
  { key: 'b90', label: '> 90', tone: 'text-red-400' },
];

function bucketOf(overdueDays) {
  if (overdueDays <= 0) return 'corriente';
  if (overdueDays <= 30) return 'b1_30';
  if (overdueDays <= 60) return 'b31_60';
  if (overdueDays <= 90) return 'b61_90';
  return 'b90';
}

export default function Cartera() {
  const { invoices, payments } = useApp();

  const rows = useMemo(() => {
    return (invoices || [])
      .filter((i) => i.estado !== 'pagada' && i.estado !== 'anulada')
      .map((i) => {
        const paid = (payments || [])
          .filter((p) => p.estado === 'confirmado' && p.orderId === i.orderId)
          .reduce((a, p) => a + (p.amount || 0), 0);
        const saldo = Math.max(0, (i.amount || 0) - paid);
        const dd = i.dueDate ? daysBetween(today(), i.dueDate) : null; // <0 ⇒ vencida
        const overdueDays = dd != null && dd < 0 ? -dd : 0;
        return { ...i, paid, saldo, overdueDays, bucket: bucketOf(overdueDays) };
      })
      .filter((r) => r.saldo > 0)
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [invoices, payments]);

  const kpis = useMemo(() => {
    const totals = { corriente: 0, b1_30: 0, b31_60: 0, b61_90: 0, b90: 0 };
    let total = 0;
    let vencido = 0;
    for (const r of rows) {
      totals[r.bucket] += r.saldo;
      total += r.saldo;
      if (r.overdueDays > 0) vencido += r.saldo;
    }
    return { total, vencido, corriente: total - vencido, nDocs: rows.length, totals };
  }, [rows]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Cartera (cuentas por cobrar) · antigüedad de saldos de clientes a hoy.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total por cobrar" value={fmtCOP(kpis.total)} hint={`${kpis.nDocs} documentos`} accent="#C9A961" />
        <KpiCard label="Vencido" value={fmtCOP(kpis.vencido)} hint="Saldo en mora" accent="#ef4444" />
        <KpiCard label="Corriente" value={fmtCOP(kpis.corriente)} hint="Al día / por vencer" accent="#10b981" />
        <KpiCard label="% vencido" value={`${kpis.total ? Math.round((kpis.vencido / kpis.total) * 100) : 0}%`} hint="Sobre el total" accent="#3b82f6" />
      </div>

      {/* Resumen por tramo de antigüedad */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {BUCKETS.map((b) => (
          <div key={b.key} className="panel p-3 text-center">
            <p className="text-[11px] uppercase text-muted">{b.label}</p>
            <p className={`mt-1 font-bold tabular-nums ${b.tone}`}>{fmtCOP(kpis.totals[b.key])}</p>
          </div>
        ))}
      </div>

      <Panel title="Documentos por cobrar">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Sin saldos de cartera pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-2">Documento</th>
                  <th className="py-2 pr-2">Cliente</th>
                  <th className="py-2 pr-2">Emisión</th>
                  <th className="py-2 pr-2">Vence</th>
                  <th className="py-2 pr-2 text-right">Monto</th>
                  <th className="py-2 pr-2 text-right">Pagado</th>
                  <th className="py-2 pr-2 text-right">Saldo</th>
                  <th className="py-2 pr-2 text-right">Días mora</th>
                  <th className="py-2 pr-2">Tramo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const tone = BUCKETS.find((b) => b.key === r.bucket)?.tone || 'text-muted';
                  return (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="py-2 pr-2 font-mono text-xs text-gold-accent">{r.id}</td>
                      <td className="py-2 pr-2 text-white">{r.clientName}</td>
                      <td className="py-2 pr-2 text-muted">{fmtDate(r.emitDate)}</td>
                      <td className="py-2 pr-2 text-muted">{r.dueDate ? fmtDate(r.dueDate) : '—'}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-white/80">{fmtCOP(r.amount)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-muted">{fmtCOP(r.paid)}</td>
                      <td className="py-2 pr-2 text-right font-semibold tabular-nums text-white">{fmtCOP(r.saldo)}</td>
                      <td className={`py-2 pr-2 text-right tabular-nums ${r.overdueDays > 0 ? 'text-red-300' : 'text-muted'}`}>{r.overdueDays > 0 ? r.overdueDays : '—'}</td>
                      <td className={`py-2 pr-2 font-semibold ${tone}`}>{BUCKETS.find((b) => b.key === r.bucket)?.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
