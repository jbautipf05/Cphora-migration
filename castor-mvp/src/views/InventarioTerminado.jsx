import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { Toolbar, SelectFilter, DataTable, EstadoBadge, fmtDate } from '../components/widgets';

export default function InventarioTerminado() {
  const { finishedStock, products, warehouses } = useApp();
  const [bodega, setBodega] = useState('');
  const [vista, setVista] = useState('stock'); // stock | clientes

  const ptWarehouses = warehouses.filter((w) => w.tipo === 'terminado');
  const wName = (id) => warehouses.find((w) => w.id === id)?.code || id;
  const prod = (id) => products.find((p) => p.id === id);

  const rows = useMemo(() => {
    return finishedStock.filter((fs) => {
      if (bodega && fs.warehouseId !== bodega) return false;
      if (vista === 'stock' && fs.orderId) return false;
      if (vista === 'clientes' && !fs.orderId) return false;
      return true;
    });
  }, [finishedStock, bodega, vista]);

  const kpis = useMemo(() => {
    const priceOf = (id) => products.find((p) => p.id === id)?.price || 0;
    const unidades = finishedStock.reduce((a, f) => a + f.qty, 0);
    const disp = finishedStock.filter((f) => f.status === 'disponible').reduce((a, f) => a + f.qty, 0);
    const valor = finishedStock.reduce((a, f) => a + f.qty * priceOf(f.productId), 0);
    return { unidades, disp, valor };
  }, [finishedStock, products]);

  const columns = [
    { key: 'foto', label: '', render: (r) => <span className="text-2xl">{prod(r.productId)?.photo}</span> },
    { key: 'producto', label: 'Producto', render: (r) => <span className="text-white">{prod(r.productId)?.name}</span> },
    { key: 'sku', label: 'SKU', render: (r) => <span className="font-mono text-xs text-muted">{prod(r.productId)?.sku}</span> },
    ...(vista === 'clientes' ? [{ key: 'order', label: 'Pedido', render: (r) => <span className="text-muted">{r.orderId}</span> }] : []),
    { key: 'bodega', label: 'Bodega', render: (r) => <span className="text-muted">{wName(r.warehouseId)}</span> },
    { key: 'valor', label: 'Valor comercial', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.qty * (prod(r.productId)?.price || 0))}</span> },
    { key: 'qty', label: 'Cant.', align: 'right', render: (r) => <span className="text-white">{r.qty}</span> },
    { key: 'ingreso', label: 'Ingreso', render: (r) => <span className="text-muted">{fmtDate(r.readyDate)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Unidades terminadas" value={kpis.unidades} accent="#38bdf8" />
        <KpiCard label="Disponibles venta" value={kpis.disp} accent="#34d399" />
        <KpiCard label="Valor inventario" value={fmtCOP(kpis.valor)} accent="#C9A961" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setVista('stock')} className={vista === 'stock' ? 'btn-gold' : 'btn-ghost'}>📦 Stock Castor</button>
        <button onClick={() => setVista('clientes')} className={vista === 'clientes' ? 'btn-gold' : 'btn-ghost'}>👥 Reservado clientes</button>
      </div>

      <Toolbar>
        <SelectFilter value={bodega} onChange={setBodega} options={ptWarehouses.map((w) => w.id)} allLabel="Todas las bodegas" />
        <span className="ml-auto text-sm text-muted">{rows.length} líneas</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} empty="Sin unidades en esta vista." />
    </div>
  );
}
