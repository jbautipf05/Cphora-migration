import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge } from '../components/ui';
import { PROD_AREAS } from '../data/erpSeed';
import { Tabs, fmtDate, daysUntil } from '../components/widgets';

export default function Produccion() {
  const { orders, products, setState } = useApp();
  const [view, setView] = useState('board');

  // OPs = pedidos en producción (incluye 'produccion' y 'pendiente_op').
  const ops = useMemo(
    () => orders.filter((o) => o.estado === 'produccion' || o.estado === 'pendiente_op'),
    [orders],
  );
  const pName = (id) => products.find((p) => p.id === id)?.name || id;

  const kpis = useMemo(() => {
    const activas = ops.length;
    const alertas = ops.filter((o) => { const d = daysUntil(o.dueDate); return d !== null && d <= 7; }).length;
    const listos = orders.filter((o) => o.area === 'Listo').length;
    return { activas, alertas, listos };
  }, [ops, orders]);

  const byArea = useMemo(() => {
    const map = Object.fromEntries(PROD_AREAS.map((a) => [a, []]));
    for (const o of ops) (map[o.area] = map[o.area] || []).push(o);
    return map;
  }, [ops]);

  const moveArea = (id, area) =>
    setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, area } : o)) }));

  const diasBadge = (o) => {
    const d = daysUntil(o.dueDate);
    if (d === null) return <Badge tone="muted">sin fecha</Badge>;
    return <Badge tone={d <= 3 ? 'red' : d <= 7 ? 'gold' : 'green'}>{d <= 0 ? 'Vencido' : `${d} días`}</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="OPs activas" value={kpis.activas} accent="#38bdf8" />
        <KpiCard label="Alertas ≤7 días" value={kpis.alertas} accent="#f87171" />
        <KpiCard label="Listos" value={kpis.listos} accent="#34d399" />
      </div>

      <Tabs tabs={[{ id: 'board', label: '🗂️ Tablero por estación' }, { id: 'table', label: '📋 Tabla' }]} active={view} onChange={setView} />

      {view === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PROD_AREAS.map((area) => (
            <div key={area} className="w-60 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{area}</p>
                <span className="text-xs text-gold-accent">{byArea[area]?.length || 0}</span>
              </div>
              <div className="space-y-2">
                {(byArea[area] || []).map((o) => (
                  <div key={o.id} className="panel p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gold-accent">{o.id}</span>
                      {diasBadge(o)}
                    </div>
                    <p className="mt-1 text-sm text-white">{o.clientName}</p>
                    <p className="text-xs text-muted">{pName(o.productId)} ×{o.qty}</p>
                  </div>
                ))}
                {(byArea[area] || []).length === 0 && <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-muted/60">—</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'table' && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">OP</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium">Días</th>
                  <th className="px-4 py-3 font-medium">Área (cambiar)</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-gold-accent">{o.id}</td>
                    <td className="px-4 py-3 text-white">{o.clientName}</td>
                    <td className="px-4 py-3 text-muted">{pName(o.productId)} ×{o.qty}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(o.dueDate)}</td>
                    <td className="px-4 py-3">{diasBadge(o)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={o.area || ''}
                        onChange={(e) => moveArea(o.id, e.target.value)}
                        className="rounded-lg border border-white/10 bg-brand-bg/60 px-2 py-1 text-xs text-white outline-none focus:border-gold-accent/60"
                      >
                        <option value="">—</option>
                        {PROD_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
