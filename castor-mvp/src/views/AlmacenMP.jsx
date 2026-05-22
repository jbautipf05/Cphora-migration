import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { Tabs, Toolbar, SearchBox, DataTable, EstadoBadge, SlidePanel, fmtDate } from '../components/widgets';

export default function AlmacenMP() {
  const { supplies, suppliers, purchaseOrders, stockMoves, warehouses } = useApp();
  const [tab, setTab] = useState('insumos');
  const [q, setQ] = useState('');
  const [selOC, setSelOC] = useState(null);

  const supName = (id) => suppliers.find((s) => s.id === id)?.name || id;
  const supplyName = (id) => supplies.find((s) => s.id === id)?.name || id;
  const wName = (id) => warehouses.find((w) => w.id === id)?.code || id;

  const kpis = useMemo(() => ({
    proveedores: suppliers.length,
    insumos: supplies.length,
    ocAbiertas: purchaseOrders.filter((o) => o.estado === 'abierta').length,
    valor: supplies.reduce((a, s) => a + s.stock * s.cost, 0),
    bajos: supplies.filter((s) => s.stock <= s.min).length,
  }), [supplies, suppliers, purchaseOrders]);

  const fSupplies = useMemo(() => {
    const t = q.toLowerCase();
    return supplies.filter((s) => !t || `${s.name} ${s.category}`.toLowerCase().includes(t));
  }, [supplies, q]);

  const supplyCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'name', label: 'Insumo', render: (r) => <span className="text-white">{r.name}</span> },
    { key: 'unit', label: 'Unidad', render: (r) => <span className="text-muted">{r.unit}</span> },
    { key: 'stock', label: 'Stock', align: 'right', render: (r) => <span className={r.stock <= r.min ? 'text-red-300' : 'text-white'}>{r.stock}</span> },
    { key: 'min', label: 'Mín', align: 'right', render: (r) => <span className="text-muted">{r.min}</span> },
    { key: 'cost', label: 'Costo', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.cost)}</span> },
    { key: 'sup', label: 'Proveedor', render: (r) => <span className="text-muted">{supName(r.supplierId)}</span> },
    { key: 'bod', label: 'Bodega', render: (r) => <span className="text-muted">{wName(r.warehouseId)}</span> },
  ];

  const ocCols = [
    { key: 'id', label: 'OC', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'sup', label: 'Proveedor', render: (r) => <span className="text-white">{r.supplier}</span> },
    { key: 'date', label: 'Fecha', render: (r) => <span className="text-muted">{fmtDate(r.date)}</span> },
    { key: 'exp', label: 'Esperada', render: (r) => <span className="text-muted">{fmtDate(r.expectedDate)}</span> },
    { key: 'bod', label: 'Bodega', render: (r) => <span className="text-muted">{wName(r.warehouseId)}</span> },
    { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.total)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  const moveCols = [
    { key: 'id', label: 'Mov', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'type', label: 'Tipo', render: (r) => <EstadoBadge value={r.type === 'entrada' ? 'confirmado' : 'pendiente'} /> },
    { key: 'item', label: 'Item', render: (r) => <span className="text-white">{r.supplyId ? supplyName(r.supplyId) : r.productId}</span> },
    { key: 'qty', label: 'Cant.', align: 'right', render: (r) => <span className="text-white">{r.qty}</span> },
    { key: 'reason', label: 'Motivo', render: (r) => <span className="text-muted">{r.reason}</span> },
    { key: 'by', label: 'Por', render: (r) => <span className="text-muted">{r.by}</span> },
    { key: 'date', label: 'Fecha', render: (r) => <span className="text-muted">{fmtDate(r.date)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Proveedores" value={kpis.proveedores} accent="#a78bfa" />
        <KpiCard label="Insumos" value={kpis.insumos} accent="#38bdf8" />
        <KpiCard label="OC abiertas" value={kpis.ocAbiertas} accent="#C9A961" />
        <KpiCard label="Valor insumos" value={fmtCOP(kpis.valor)} accent="#34d399" />
        <KpiCard label="Insumos bajos" value={kpis.bajos} accent="#f87171" />
      </div>

      <Tabs
        tabs={[
          { id: 'insumos', label: '📦 Insumos' },
          { id: 'proveedores', label: '👥 Proveedores' },
          { id: 'oc', label: '📄 Órdenes de Compra' },
          { id: 'movimientos', label: '🔄 Movimientos' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'insumos' && (
        <>
          <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Buscar insumo…" /><span className="ml-auto text-sm text-muted">{fSupplies.length} insumos</span></Toolbar>
          <DataTable columns={supplyCols} rows={fSupplies} getKey={(r) => r.id} />
        </>
      )}

      {tab === 'proveedores' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <div key={s.id} className="panel p-4">
              <p className="font-semibold text-white">{s.name}</p>
              <p className="font-mono text-xs text-muted">{s.nit}</p>
              <div className="mt-2"><Badge tone="muted">{s.category}</Badge></div>
              <p className="mt-2 text-sm text-muted">{s.contact} · {s.phone}</p>
              <p className="text-xs text-muted">{s.email}</p>
              <p className="mt-1 text-xs text-muted">{s.city} · {s.address}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'oc' && <DataTable columns={ocCols} rows={purchaseOrders} getKey={(r) => r.id} onRowClick={setSelOC} />}

      {tab === 'movimientos' && <DataTable columns={moveCols} rows={stockMoves} getKey={(r) => r.id} />}

      <SlidePanel open={!!selOC} onClose={() => setSelOC(null)} title={selOC?.id} subtitle={selOC ? `${selOC.supplier} · ${selOC.estado}` : ''}>
        {selOC && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Fecha', fmtDate(selOC.date)], ['Esperada', fmtDate(selOC.expectedDate)], ['Bodega', wName(selOC.warehouseId)], ['Total', fmtCOP(selOC.total)]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p><p className="mt-0.5 text-white">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Items</p>
              <div className="space-y-1.5">
                {selOC.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-bg/40 px-3 py-2 text-sm">
                    <span className="text-white">{supplyName(it.supplyId)}</span>
                    <span className="text-muted">{it.received}/{it.qty} {it.unit}</span>
                    <EstadoBadge value={it.status === 'completo' ? 'confirmado' : it.status} />
                  </div>
                ))}
              </div>
            </div>
            {selOC.notes && <p className="text-sm text-muted">{selOC.notes}</p>}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
