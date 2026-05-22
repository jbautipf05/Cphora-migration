import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { Toolbar, SearchBox, DataTable, EstadoBadge, fmtDate } from '../components/widgets';

export default function Despacho() {
  const { dispatchRequests, setState } = useApp();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return dispatchRequests.filter((d) => !t || `${d.clientName} ${d.orderId} ${d.ciudad}`.toLowerCase().includes(t));
  }, [dispatchRequests, q]);

  const kpis = useMemo(() => ({
    pendientes: dispatchRequests.filter((d) => d.estado === 'pendiente').length,
    despachados: dispatchRequests.filter((d) => d.estado === 'despachado').length,
    ciudades: new Set(dispatchRequests.map((d) => d.ciudad)).size,
  }), [dispatchRequests]);

  const marcar = (id) =>
    setState((s) => ({ ...s, dispatchRequests: s.dispatchRequests.map((d) => (d.id === id ? { ...d, estado: 'despachado' } : d)) }));

  const columns = [
    { key: 'id', label: 'Solicitud', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'orderId', label: 'Pedido/OP', render: (r) => <span className="text-muted">{r.orderId} · {r.opId}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'ciudad', label: 'Ciudad', render: (r) => <span className="text-muted">{r.ciudad}</span> },
    { key: 'address', label: 'Dirección de entrega', render: (r) => <span className="text-muted">{r.address}</span> },
    { key: 'fecha', label: 'Solicitado', render: (r) => <span className="text-muted">{fmtDate(r.requestedAt)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
    {
      key: 'acc', label: '', align: 'right',
      render: (r) => r.estado === 'pendiente'
        ? <button onClick={() => marcar(r.id)} className="rounded-lg border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10">🚚 Despachar</button>
        : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Pendientes" value={kpis.pendientes} accent="#f87171" />
        <KpiCard label="Despachados" value={kpis.despachados} accent="#34d399" />
        <KpiCard label="Ciudades" value={kpis.ciudades} accent="#38bdf8" />
      </div>
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar cliente, pedido, ciudad…" />
        <span className="ml-auto text-sm text-muted">{rows.length} solicitudes</span>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} empty="Sin solicitudes de despacho." />
    </div>
  );
}
