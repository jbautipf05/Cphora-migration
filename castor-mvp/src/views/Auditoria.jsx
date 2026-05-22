import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { DataTable, EstadoBadge, fmtDate } from '../components/widgets';

export default function Auditoria() {
  const { audits, orders, products } = useApp();

  const kpis = useMemo(() => ({
    pedidosSinOp: orders.filter((o) => o.estado === 'pendiente_op').length,
    productosNuevos: products.filter((p) => !p.verified).length,
    findings: audits.reduce((a, x) => a + x.findings, 0),
    abiertas: audits.filter((a) => a.estado !== 'cerrada').length,
  }), [audits, orders, products]);

  const auditCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'tipo', label: 'Tipo', render: (r) => <span className="capitalize text-muted">{r.tipo}</span> },
    { key: 'area', label: 'Área', render: (r) => <span className="text-white">{r.area}</span> },
    { key: 'findings', label: 'Hallazgos', align: 'right', render: (r) => <span className="text-white">{r.findings}</span> },
    { key: 'open', label: 'Abiertos', align: 'right', render: (r) => <span className="text-red-300">{r.open}</span> },
    { key: 'responsable', label: 'Responsable', render: (r) => <span className="text-muted">{r.responsable}</span> },
    { key: 'date', label: 'Fecha', render: (r) => <span className="text-muted">{fmtDate(r.date)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  const pendCols = [
    { key: 'id', label: 'Pedido', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'producto', label: 'Producto', render: (r) => <span className="text-muted">{products.find((p) => p.id === r.productId)?.name} ×{r.qty}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-muted">{r.asesor}</span> },
    {
      key: 'acc', label: '', align: 'right',
      render: () => <span className="rounded-lg border border-gold-accent/30 px-2 py-1 text-xs text-gold-accent">Crear OP · Rechazar · Editar</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pedidos sin OP" value={kpis.pedidosSinOp} accent="#C9A961" />
        <KpiCard label="Productos por validar" value={kpis.productosNuevos} accent="#a78bfa" />
        <KpiCard label="Hallazgos totales" value={kpis.findings} accent="#f87171" />
        <KpiCard label="Auditorías abiertas" value={kpis.abiertas} accent="#38bdf8" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-white">Pedidos pendientes por verificar (crear OP)</p>
        <DataTable columns={pendCols} rows={orders.filter((o) => o.estado === 'pendiente_op')} getKey={(r) => r.id} empty="Sin pedidos pendientes." />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-white">Hallazgos de auditoría</p>
        <DataTable columns={auditCols} rows={audits} getKey={(r) => r.id} />
      </div>
    </div>
  );
}
