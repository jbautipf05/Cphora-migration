import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, fmtDate } from '../lib/format';
import { KpiCard } from '../components/ui';

// Listado de Notas Crédito y Notas Débito emitidas (§7.9). Lectura/auditoría.
// La emisión vive en Ventas (modal sobre la factura). Aquí solo se ven y se
// puede saltar al asiento contable asociado (JE-XXXXXX).
export default function NotasCreditoDebito() {
  const { notasCredito = [], notasDebito = [], invoices = [], customers = [], orders = [] } =
    useApp();
  const [tipo, setTipo] = useState('all'); // 'all' | 'NC' | 'ND'
  const [q, setQ] = useState('');

  function customerNameFor(invoiceId) {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return '—';
    if (inv.customerId) {
      const c = customers.find((x) => x.id === inv.customerId);
      if (c?.name) return c.name;
    }
    if (inv.orderId) {
      const o = orders.find((x) => x.id === inv.orderId);
      if (o?.customerId) {
        const c = customers.find((x) => x.id === o.customerId);
        if (c?.name) return c.name;
      }
    }
    return inv.clientName || '—';
  }

  const totalNC = useMemo(
    () => notasCredito.reduce((a, n) => a + (+n.monto || 0), 0),
    [notasCredito],
  );
  const totalND = useMemo(
    () => notasDebito.reduce((a, n) => a + (+n.monto || 0), 0),
    [notasDebito],
  );

  const term = q.trim().toLowerCase();
  const matches = (n) => {
    if (!term) return true;
    const inv = invoices.find((i) => i.id === n.invoiceId);
    const cust = customerNameFor(n.invoiceId);
    return (
      String(n.id).toLowerCase().includes(term) ||
      String(n.invoiceId).toLowerCase().includes(term) ||
      String(cust).toLowerCase().includes(term) ||
      String(n.motivo || '').toLowerCase().includes(term)
    );
  };
  const filteredNC = notasCredito.filter(matches);
  const filteredND = notasDebito.filter(matches);
  const showNC = tipo === 'all' || tipo === 'NC';
  const showND = tipo === 'all' || tipo === 'ND';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label="NCs EMITIDAS"
          value={String(notasCredito.length)}
          subtitle={notasCredito.length === 1 ? 'Nota crédito' : 'Notas crédito'}
        />
        <KpiCard label="VALOR NCs" value={fmtCOP(totalNC)} subtitle="Acumulado" />
        <KpiCard
          label="NDs EMITIDAS"
          value={String(notasDebito.length)}
          subtitle={notasDebito.length === 1 ? 'Nota débito' : 'Notas débito'}
        />
        <KpiCard label="VALOR NDs" value={fmtCOP(totalND)} subtitle="Acumulado" />
      </div>

      <div className="panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Buscar</label>
            <input
              className="input-field"
              placeholder="Número, factura, cliente o motivo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select
              className="input-field"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="NC">Solo NC</option>
              <option value="ND">Solo ND</option>
            </select>
          </div>
        </div>
      </div>

      {showNC && (
        <div className="panel p-4">
          <h3 className="gold-title mb-3">Notas crédito</h3>
          {filteredNC.length === 0 ? (
            <p className="text-sm text-brand-muted">
              {notasCredito.length === 0
                ? 'No hay notas crédito emitidas.'
                : 'Sin coincidencias para el filtro.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-brand-gold-light/60">
                  <tr>
                    <th className="px-2 py-2">Número</th>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Factura</th>
                    <th className="px-2 py-2">Cliente</th>
                    <th className="px-2 py-2">Motivo</th>
                    <th className="px-2 py-2 text-right">Monto</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2">Asiento</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNC.map((n) => (
                    <tr key={n.id} className="border-t border-brand-border/50">
                      <td className="px-2 py-2 font-mono text-brand-gold">{n.id}</td>
                      <td className="px-2 py-2 text-brand-muted">{fmtDate(n.fecha)}</td>
                      <td className="px-2 py-2 font-mono text-xs">{n.invoiceId}</td>
                      <td className="px-2 py-2">{customerNameFor(n.invoiceId)}</td>
                      <td className="px-2 py-2 text-brand-muted">{n.motivo}</td>
                      <td className="px-2 py-2 text-right text-white">{fmtCOP(n.monto)}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            n.isTotal
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {n.isTotal ? 'Total' : 'Parcial'}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-brand-gold-light/70">
                        {n.journalEntryId}
                        {n.cogsReversalJournalEntryId && (
                          <span className="ml-1 text-[10px] text-brand-gold-light/40">
                            + {n.cogsReversalJournalEntryId}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showND && (
        <div className="panel p-4">
          <h3 className="gold-title mb-3">Notas débito</h3>
          {filteredND.length === 0 ? (
            <p className="text-sm text-brand-muted">
              {notasDebito.length === 0
                ? 'No hay notas débito emitidas.'
                : 'Sin coincidencias para el filtro.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-brand-gold-light/60">
                  <tr>
                    <th className="px-2 py-2">Número</th>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Factura</th>
                    <th className="px-2 py-2">Cliente</th>
                    <th className="px-2 py-2">Motivo</th>
                    <th className="px-2 py-2 text-right">Monto</th>
                    <th className="px-2 py-2">Asiento</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredND.map((n) => (
                    <tr key={n.id} className="border-t border-brand-border/50">
                      <td className="px-2 py-2 font-mono text-brand-gold">{n.id}</td>
                      <td className="px-2 py-2 text-brand-muted">{fmtDate(n.fecha)}</td>
                      <td className="px-2 py-2 font-mono text-xs">{n.invoiceId}</td>
                      <td className="px-2 py-2">{customerNameFor(n.invoiceId)}</td>
                      <td className="px-2 py-2 text-brand-muted">{n.motivo}</td>
                      <td className="px-2 py-2 text-right text-white">{fmtCOP(n.monto)}</td>
                      <td className="px-2 py-2 font-mono text-xs text-brand-gold-light/70">
                        {n.journalEntryId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-brand-muted">
        Emisión desde Ventas → detalle de pedido → factura. Numeración interna ·
        No oficial DIAN.
      </p>
    </div>
  );
}
