import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import {
  Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, ProgressBar, SlidePanel, fmtDate,
} from '../components/widgets';

export default function Ventas() {
  const { orders, products, payments, invoices } = useApp();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [sel, setSel] = useState(null);

  const estados = useMemo(() => [...new Set(orders.map((o) => o.estado))], [orders]);
  const tipos = useMemo(() => [...new Set(orders.map((o) => o.tipo))], [orders]);
  const pName = (id) => products.find((p) => p.id === id)?.name || id;

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return orders.filter((o) => {
      if (estado && o.estado !== estado) return false;
      if (tipo && o.tipo !== tipo) return false;
      if (t && !`${o.id} ${o.clientName} ${o.asesor}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [orders, q, estado, tipo]);

  const kpis = useMemo(() => {
    const valor = orders.reduce((a, o) => a + (o.total || 0), 0);
    const cobrado = orders.reduce((a, o) => a + (o.total || 0) * (o.paid / 100), 0);
    return { pedidos: orders.length, valor, cobrado, saldo: valor - cobrado };
  }, [orders]);

  const columns = [
    { key: 'id', label: 'Pedido', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-muted">{r.asesor}</span> },
    { key: 'producto', label: 'Producto', render: (r) => <span className="text-muted">{pName(r.productId)} ×{r.qty}</span> },
    { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.total)}</span> },
    { key: 'pago', label: 'Pago', render: (r) => <ProgressBar value={r.paid} /> },
    { key: 'tipo', label: 'Tipo', render: (r) => <span className="capitalize text-muted">{r.tipo}</span> },
    { key: 'doc', label: 'Doc', render: (r) => <span className="text-muted">{r.docType}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pedidos" value={kpis.pedidos} accent="#38bdf8" />
        <KpiCard label="Valor ventas" value={fmtCOP(kpis.valor)} accent="#34d399" />
        <KpiCard label="Cobrado" value={fmtCOP(kpis.cobrado)} accent="#C9A961" />
        <KpiCard label="Saldo pendiente" value={fmtCOP(kpis.saldo)} accent="#f87171" />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar pedido, cliente, asesor…" />
        <SelectFilter value={estado} onChange={setEstado} options={estados} allLabel="Todos los estados" />
        <SelectFilter value={tipo} onChange={setTipo} options={tipos} allLabel="Todos los tipos" />
        <span className="ml-auto text-sm text-muted">{rows.length} pedidos</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={setSel} />

      <SlidePanel open={!!sel} onClose={() => setSel(null)} title={sel?.id} subtitle={sel ? `${sel.clientName} · ${fmtDate(sel.orderDate)}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><EstadoBadge value={sel.estado} /><EstadoBadge value={sel.tipo} /></div>
            <div className="grid grid-cols-3 gap-3">
              {[['Total', fmtCOP(sel.total)], ['Pagado', `${sel.paid}%`], ['Doc', sel.docType]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p>
                  <p className="mt-0.5 font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3 text-sm">
              <p className="text-[11px] uppercase text-muted">Producto · OP</p>
              <p className="mt-0.5 text-white">{pName(sel.productId)} × {sel.qty} · área {sel.area || '—'}</p>
              <p className="mt-1 text-xs text-muted">Entrega: {sel.deliveryAddress}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Pagos</p>
              <div className="space-y-1.5">
                {payments.filter((p) => p.orderId === sel.id).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-bg/40 px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-gold-accent">{p.id}</span>
                    <span className="text-muted">{p.method}</span>
                    <span className="text-white">{fmtCOP(p.amount)}</span>
                    <EstadoBadge value={p.estado} />
                  </div>
                ))}
                {payments.filter((p) => p.orderId === sel.id).length === 0 && <p className="text-sm text-muted">Sin pagos.</p>}
              </div>
            </div>
            {invoices.filter((i) => i.orderId === sel.id).map((i) => (
              <div key={i.id} className="rounded-lg border border-gold-accent/30 bg-gold-accent/10 p-3 text-sm">
                <p className="text-gold-accent">Documento emitido: {i.id} · {fmtCOP(i.amount)} · <span className="capitalize">{i.estado}</span></p>
                <p className="mt-0.5 text-[11px] text-muted">Numeración interna · No oficial DIAN</p>
              </div>
            ))}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
