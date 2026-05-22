import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { Toolbar, SearchBox, SelectFilter, DataTable, SlidePanel, fmtDate } from '../components/widgets';
import { Badge } from '../components/ui';

export default function Clientes() {
  const { customers, orders } = useApp();
  const [q, setQ] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [sel, setSel] = useState(null);

  const ciudades = useMemo(() => [...new Set(customers.map((c) => c.city).filter(Boolean))], [customers]);

  const histByCustomer = useMemo(() => {
    const map = {};
    for (const c of customers) {
      const ords = orders.filter((o) => o.customerId === c.id);
      map[c.id] = {
        pedidos: ords,
        historico: ords.reduce((a, o) => a + (o.total || 0), 0),
      };
    }
    return map;
  }, [customers, orders]);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return customers.filter((c) => {
      if (ciudad && c.city !== ciudad) return false;
      if (t && !`${c.name} ${c.doc} ${c.phone} ${c.email}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [customers, q, ciudad]);

  const kpis = useMemo(() => ({
    total: customers.length,
    institucionales: customers.filter((c) => c.tipo === 'institucional').length,
    vip: customers.filter((c) => (histByCustomer[c.id]?.historico || 0) >= 20000000).length,
    historico: customers.reduce((a, c) => a + (histByCustomer[c.id]?.historico || 0), 0),
  }), [customers, histByCustomer]);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'name', label: 'Nombre', render: (r) => (
      <span className="text-white">{r.name}{(histByCustomer[r.id]?.historico || 0) >= 20000000 && <Badge tone="gold">VIP</Badge>}</span>
    ) },
    { key: 'tipo', label: 'Tipo', render: (r) => <span className="capitalize text-muted">{r.tipo}</span> },
    { key: 'doc', label: 'Documento', render: (r) => <span className="text-muted">{r.doc}</span> },
    { key: 'city', label: 'Ciudad', render: (r) => <span className="text-muted">{r.city}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-muted">{r.asesor}</span> },
    { key: 'hist', label: 'Histórico', align: 'right', render: (r) => <span className="text-white">{fmtCOP(histByCustomer[r.id]?.historico || 0)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total clientes" value={kpis.total} accent="#38bdf8" />
        <KpiCard label="Institucionales" value={kpis.institucionales} accent="#a78bfa" />
        <KpiCard label="Clientes VIP" value={kpis.vip} hint="≥ $20M histórico" accent="#C9A961" />
        <KpiCard label="Histórico total" value={fmtCOP(kpis.historico)} accent="#34d399" />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, doc, teléfono…" />
        <SelectFilter value={ciudad} onChange={setCiudad} options={ciudades} allLabel="Todas las ciudades" />
        <span className="ml-auto text-sm text-muted">{rows.length} clientes</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={setSel} />

      <SlidePanel open={!!sel} onClose={() => setSel(null)} title={sel?.name} subtitle={sel ? `${sel.id} · ${sel.tipo}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase text-muted">Histórico</p>
                <p className="mt-0.5 font-semibold text-white">{fmtCOP(histByCustomer[sel.id]?.historico || 0)}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase text-muted">Pedidos</p>
                <p className="mt-0.5 font-semibold text-white">{histByCustomer[sel.id]?.pedidos.length || 0}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase text-muted">Ciudad</p>
                <p className="mt-0.5 font-semibold text-white">{sel.city}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Teléfono', sel.phone], ['Email', sel.email], ['Documento', sel.doc], ['Dirección', sel.address], ['NIT', sel.nit], ['Razón social', sel.razonSocial]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p>
                  <p className="mt-0.5 text-white">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Pedidos</p>
              <div className="space-y-1.5">
                {(histByCustomer[sel.id]?.pedidos || []).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-bg/40 px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-gold-accent">{o.id}</span>
                    <span className="text-muted">{fmtDate(o.orderDate)}</span>
                    <span className="text-white">{fmtCOP(o.total)}</span>
                  </div>
                ))}
                {(histByCustomer[sel.id]?.pedidos || []).length === 0 && <p className="text-sm text-muted">Sin pedidos.</p>}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
