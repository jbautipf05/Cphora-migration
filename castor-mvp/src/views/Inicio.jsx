import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import Chart from '../components/Chart';
import { fmtCOP, fmtDate, today, addDays, daysUntil } from '../lib/format';
import { IconUsers, IconDoc, IconCart, IconBank } from '../components/icons';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function Inicio({ onNavigate }) {
  const { leads, quotes, orders, bankAccounts, finishedStock, warehouses } = useApp();

  const k = useMemo(() => {
    const leadsAlto = leads.filter((l) => l.clasificacion === 'alto').length;
    const cotPend = quotes.filter((q) => ['enviada', 'borrador'].includes(q.estado)).length;
    const ventasAc = orders.reduce((a, o) => a + (o.total || 0), 0);
    const totalBanks = bankAccounts.reduce((a, b) => a + b.balance, 0);
    const finishedQty = finishedStock.reduce((a, f) => a + f.qty, 0);
    return { leadsAlto, cotPend, ventasAc, totalBanks, finishedQty };
  }, [leads, quotes, orders, bankAccounts, finishedStock]);

  // Ventas últimos 6 meses (a partir de orderDate)
  const salesData = useMemo(() => {
    const ref = new Date(today() + 'T00:00:00');
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], total: 0 });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    for (const o of orders) {
      if (!o.orderDate) continue;
      const d = new Date(o.orderDate + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in idx) buckets[idx[key]].total += o.total || 0;
    }
    return buckets;
  }, [orders]);

  const leadsByClass = useMemo(() => {
    const c = { alto: 0, medio: 0, bajo: 0 };
    for (const l of leads) c[l.clasificacion] = (c[l.clasificacion] || 0) + 1;
    return c;
  }, [leads]);

  const alertas = useMemo(
    () =>
      orders
        .filter((o) => o.estado === 'produccion')
        .map((o) => ({ ...o, due: o.dueDate || (o.orderDate && o.tiempo ? addDays(o.orderDate, o.tiempo) : null) }))
        .map((o) => ({ ...o, dias: daysUntil(o.due) }))
        .filter((o) => o.dias !== null && o.dias <= 7)
        .sort((a, b) => a.dias - b.dias),
    [orders],
  );

  return (
    <div className="page space-y-6">
      <p className="text-sm text-brand-muted">Bienvenido, Alexander · {fmtDate(today())}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Leads activos" value={leads.length} hint={`${k.leadsAlto} clasificación alta`} accent="#C9A961" icon={<IconUsers width={18} height={18} />} />
        <KpiCard label="Cotizaciones pend." value={k.cotPend} hint="Por convertir" accent="#D4B876" icon={<IconDoc width={18} height={18} />} />
        <KpiCard label="Ventas acumuladas" value={fmtCOP(k.ventasAc)} hint={`${orders.length} pedidos`} accent="#10b981" icon={<IconCart width={18} height={18} />} />
        <KpiCard label="Caja bancos" value={fmtCOP(k.totalBanks)} hint={`${bankAccounts.length} cuentas`} accent="#3b82f6" icon={<IconBank width={18} height={18} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold gold-title">Ventas últimos 6 meses</h3>
            <button onClick={() => onNavigate('ventas')} className="text-xs text-brand-gold hover:underline">
              Ver →
            </button>
          </div>
          {/* BAR chart (espejo HTML: barras gold con borderRadius 6) */}
          <Chart
            type="bar"
            data={{
              labels: salesData.map((b) => b.label),
              datasets: [
                {
                  label: 'Ventas (M COP)',
                  data: salesData.map((b) => Math.round(b.total / 1_000_000)),
                  backgroundColor: '#C9A961',
                  borderRadius: 6,
                  barPercentage: 0.7,
                  categoryPercentage: 0.7,
                },
              ],
            }}
            options={{
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { callback: (v) => `$${v}M`, color: '#B8C5D9' },
                  grid: { color: '#2A4061' },
                },
                x: {
                  ticks: { color: '#B8C5D9' },
                  grid: { display: false },
                },
              },
            }}
          />
        </div>

        <div className="panel p-6">
          <h3 className="mb-4 font-semibold gold-title">Clasificación leads</h3>
          <Chart
            type="doughnut"
            data={{
              labels: ['Alto', 'Medio', 'Bajo'],
              datasets: [
                {
                  data: [leadsByClass.alto, leadsByClass.medio, leadsByClass.bajo],
                  backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                  borderColor: '#152943',
                  borderWidth: 2,
                },
              ],
            }}
            options={{ plugins: { legend: { position: 'bottom' } }, cutout: '62%' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold gold-title">Inventario terminado</h3>
            <button onClick={() => onNavigate('inventario')} className="text-xs text-brand-gold hover:underline">
              Ver →
            </button>
          </div>
          <div className="mb-1 text-3xl font-bold text-white">
            {k.finishedQty} <span className="text-sm font-normal text-brand-muted">unidades listas</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {warehouses
              .filter((w) => w.tipo === 'terminado')
              .map((w) => {
                const q = finishedStock.filter((f) => f.warehouseId === w.id).reduce((a, f) => a + f.qty, 0);
                return (
                  <div key={w.id} className="panel-2 rounded-lg p-3">
                    <div className="text-xs text-brand-muted">{w.code}</div>
                    <div className="text-lg font-bold" style={{ color: w.color }}>
                      {q}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="panel p-6">
          <h3 className="mb-4 font-semibold gold-title">Alertas producción</h3>
          {alertas.length === 0 ? (
            <p className="text-sm text-brand-muted">Sin alertas — todo en tiempo.</p>
          ) : (
            alertas.map((o) => (
              <div
                key={o.id}
                onClick={() => onNavigate('produccion')}
                className="mb-2 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-red-500/10"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-red-300">{o.id}</div>
                  <div className="truncate text-xs text-red-200/70">
                    {o.clientName} · {o.dias <= 0 ? 'vencido' : `vence en ${o.dias} días`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
