import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, SlidePanel, fmtDate } from '../components/widgets';

const ESTADOS = ['borrador', 'enviada', 'aceptada', 'vencida'];

const subtotal = (q) => q.items.reduce((a, i) => a + i.qty * i.price, 0);
const total = (q) => Math.round(subtotal(q) * (1 - q.discount / 100));

export default function Cotizaciones() {
  const { quotes } = useApp();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [sel, setSel] = useState(null);

  const canales = useMemo(() => [...new Set(quotes.map((x) => x.channel))], [quotes]);
  const [canal, setCanal] = useState('');

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return quotes.filter((c) => {
      if (estado && c.estado !== estado) return false;
      if (canal && c.channel !== canal) return false;
      if (t && !`${c.id} ${c.clientName} ${c.asesor}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [quotes, q, estado, canal]);

  const aceptadas = quotes.filter((c) => c.estado === 'aceptada').length;

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'channel', label: 'Canal', render: (r) => <span className="text-muted">{r.channel}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-muted">{r.asesor}</span> },
    { key: 'items', label: 'Items', align: 'right', render: (r) => <span className="text-muted">{r.items.length}</span> },
    { key: 'desc', label: 'Desc.', align: 'right', render: (r) => <span className="text-muted">{r.discount}%</span> },
    { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="text-white">{fmtCOP(total(r))}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
    { key: 'fecha', label: 'Creación', render: (r) => <span className="text-muted">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Cotizaciones" value={quotes.length} accent="#a78bfa" />
        <KpiCard label="Aceptadas (crear pedido)" value={aceptadas} accent="#34d399" />
        <KpiCard label="Valor en cotización" value={fmtCOP(quotes.reduce((a, c) => a + total(c), 0))} accent="#C9A961" />
      </div>

      {aceptadas > 0 && (
        <div className="rounded-xl border border-gold-accent/30 bg-gold-accent/10 px-4 py-3 text-sm text-gold-accent">
          {aceptadas} cotización(es) aceptada(s) pendiente(s) de crear pedido.
        </div>
      )}

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar ID, cliente, asesor…" />
        <SelectFilter value={estado} onChange={setEstado} options={ESTADOS} allLabel="Todos los estados" />
        <SelectFilter value={canal} onChange={setCanal} options={canales} allLabel="Todos los canales" />
        <span className="ml-auto text-sm text-muted">{rows.length} cotizaciones</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={setSel} />

      <SlidePanel open={!!sel} onClose={() => setSel(null)} title={sel?.id} subtitle={sel ? `${sel.clientName} · ${sel.channel}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><EstadoBadge value={sel.estado} /></div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Items</p>
              <div className="space-y-1.5">
                {sel.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-bg/40 px-3 py-2 text-sm">
                    <span className="text-white">{it.desc} × {it.qty}</span>
                    <span className="text-muted">{fmtCOP(it.qty * it.price)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1 rounded-lg border border-white/5 bg-brand-bg/40 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-white">{fmtCOP(subtotal(sel))}</span></div>
              <div className="flex justify-between"><span className="text-muted">Descuento {sel.discount}%</span><span className="text-white">-{fmtCOP(subtotal(sel) * sel.discount / 100)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-1 font-semibold"><span className="text-white">Total</span><span className="text-gold-accent">{fmtCOP(total(sel))}</span></div>
            </div>
            {sel.notes && <p className="text-sm text-muted">{sel.notes}</p>}
            <div className="flex gap-2">
              <button className="btn-ghost flex-1">Enviar</button>
              <button className="btn-gold flex-1">Aceptar → Pedido</button>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
