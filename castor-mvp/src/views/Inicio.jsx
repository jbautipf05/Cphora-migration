import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Panel, Badge } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { daysUntil } from '../components/widgets';
import { IconArrow } from '../components/icons';

export default function Inicio({ onNavigate }) {
  const { leads, quotes, orders, bankAccounts, finishedStock, warehouses } = useApp();

  const kpis = useMemo(() => {
    const leadsActivos = leads.filter((l) => l.estado === 'En gestión' || l.estado === 'Nuevo').length;
    const cotPendientes = quotes.filter((q) => q.estado === 'enviada' || q.estado === 'aceptada').length;
    const ventas = orders.reduce((a, o) => a + (o.total || 0), 0);
    const caja = bankAccounts.reduce((a, b) => a + b.balance, 0);
    return { leadsActivos, cotPendientes, ventas, caja };
  }, [leads, quotes, orders, bankAccounts]);

  const alertasProd = useMemo(
    () =>
      orders
        .filter((o) => o.estado === 'produccion' && o.dueDate)
        .map((o) => ({ ...o, dias: daysUntil(o.dueDate) }))
        .filter((o) => o.dias !== null && o.dias <= 30)
        .sort((a, b) => a.dias - b.dias),
    [orders],
  );

  const invPorBodega = useMemo(() => {
    const map = {};
    for (const fs of finishedStock) {
      const w = warehouses.find((x) => x.id === fs.warehouseId);
      const key = w?.code || fs.warehouseId;
      map[key] = (map[key] || 0) + fs.qty;
    }
    return map;
  }, [finishedStock, warehouses]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Leads activos" value={kpis.leadsActivos} hint="En gestión / nuevos" accent="#38bdf8" />
        <KpiCard label="Cotizaciones pendientes" value={kpis.cotPendientes} hint="Enviadas / aceptadas" accent="#a78bfa" />
        <KpiCard label="Ventas acumuladas" value={fmtCOP(kpis.ventas)} hint={`${orders.length} pedidos`} accent="#34d399" />
        <KpiCard label="Caja bancos" value={fmtCOP(kpis.caja)} hint={`${bankAccounts.length} cuentas`} accent="#C9A961" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Alertas de producción" subtitle="OPs próximas a vencer" className="lg:col-span-2">
          <div className="space-y-2">
            {alertasProd.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-brand-bg/40 px-4 py-3">
                <span className="font-mono text-xs text-gold-accent">{o.id}</span>
                <span className="text-sm text-white">{o.clientName}</span>
                <span className="text-xs text-muted">· {o.area}</span>
                <span className="ml-auto">
                  <Badge tone={o.dias <= 3 ? 'red' : o.dias <= 7 ? 'gold' : 'blue'}>
                    {o.dias <= 0 ? 'Vencido' : `${o.dias} días`}
                  </Badge>
                </span>
              </div>
            ))}
            {alertasProd.length === 0 && <p className="text-sm text-muted">Sin alertas próximas.</p>}
          </div>
        </Panel>

        <Panel title="Inventario terminado" subtitle="Unidades por bodega">
          <div className="space-y-2">
            {Object.entries(invPorBodega).map(([code, qty]) => (
              <div key={code} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-bg/40 px-4 py-2.5">
                <span className="text-sm text-white">{code}</span>
                <span className="font-mono text-sm tabular-nums text-gold-accent">{qty} und</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['leads', '👥 Leads', `${leads.length} registrados`],
          ['ventas', '🛍️ Ventas', `${orders.length} pedidos`],
          ['dashboard', '💰 Contabilidad', 'Motor PUC activo'],
        ].map(([id, title, desc]) => (
          <button
            key={title}
            onClick={() => onNavigate(id)}
            className="panel group flex items-center gap-4 p-5 text-left transition hover:border-gold-accent/40"
          >
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="text-xs text-muted">{desc}</p>
            </div>
            <IconArrow width={18} height={18} className="ml-auto text-muted transition group-hover:translate-x-1 group-hover:text-gold-accent" />
          </button>
        ))}
      </div>
    </div>
  );
}
