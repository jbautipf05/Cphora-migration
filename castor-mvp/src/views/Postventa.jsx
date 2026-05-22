import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { Tabs, DataTable, EstadoBadge, fmtDate } from '../components/widgets';

export default function Postventa() {
  const { postSales, setState } = useApp();
  const [tab, setTab] = useState('pendiente');

  const kpis = useMemo(() => {
    const npsList = postSales.filter((p) => p.nps != null).map((p) => p.nps);
    return {
      vencidos: postSales.filter((p) => p.estado === 'pendiente').length,
      proximos: postSales.filter((p) => p.estado === 'programado').length,
      completados: postSales.filter((p) => p.estado === 'completado').length,
      nps: npsList.length ? (npsList.reduce((a, b) => a + b, 0) / npsList.length).toFixed(1) : '—',
    };
  }, [postSales]);

  const rows = useMemo(() => postSales.filter((p) => p.estado === tab), [postSales, tab]);

  const completar = (id) => {
    const nps = Number(prompt('NPS del cliente (0-10):', '9'));
    const notes = prompt('Notas del contacto:', '') || '';
    setState((s) => ({
      ...s,
      postSales: s.postSales.map((p) =>
        p.id === id ? { ...p, estado: 'completado', date: '2026-04-16', nps: isNaN(nps) ? null : nps, notes } : p,
      ),
    }));
  };

  const npsColor = (n) => (n == null ? 'text-muted' : n <= 6 ? 'text-red-300' : n <= 8 ? 'text-amber-300' : 'text-emerald-300');

  const columns = [
    { key: 'hito', label: 'Hito', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.hito}</span> },
    { key: 'orderId', label: 'Pedido', render: (r) => <span className="text-muted">{r.orderId}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-muted">{r.asesor}</span> },
    { key: 'fechaObjetivo', label: 'Fecha objetivo', render: (r) => <span className="text-muted">{fmtDate(r.fechaObjetivo)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
    { key: 'nps', label: 'NPS', align: 'right', render: (r) => <span className={npsColor(r.nps)}>{r.nps ?? '—'}</span> },
    {
      key: 'acc', label: '', align: 'right',
      render: (r) => r.estado !== 'completado'
        ? <button onClick={(e) => { e.stopPropagation(); completar(r.id); }} className="rounded-lg border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10">✓ Completar</button>
        : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vencidos (pendientes)" value={kpis.vencidos} accent="#f87171" />
        <KpiCard label="Próximos (programados)" value={kpis.proximos} accent="#38bdf8" />
        <KpiCard label="Completados" value={kpis.completados} accent="#34d399" />
        <KpiCard label="NPS promedio" value={kpis.nps} accent="#C9A961" />
      </div>

      <Tabs
        tabs={[
          { id: 'pendiente', label: 'Pendientes' },
          { id: 'programado', label: 'Próximos' },
          { id: 'completado', label: 'Completados' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} empty="Sin hitos en esta pestaña." />
    </div>
  );
}
