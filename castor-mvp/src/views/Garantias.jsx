import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { DataTable, EstadoBadge, SlidePanel, fmtDate } from '../components/widgets';

const ESTADOS = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];

export default function Garantias() {
  const { warranties, setState } = useApp();
  const [sel, setSel] = useState(null);

  const kpis = useMemo(() => ({
    abiertos: warranties.filter((w) => w.estado !== 'cerrada' && w.estado !== 'resuelta').length,
    cerrados: warranties.filter((w) => w.estado === 'cerrada' || w.estado === 'resuelta').length,
    total: warranties.length,
  }), [warranties]);

  const changeEstado = (id, estado) =>
    setState((s) => ({ ...s, warranties: s.warranties.map((w) => (w.id === id ? { ...w, estado } : w)) }));

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'orderId', label: 'Pedido', render: (r) => <span className="text-muted">{r.orderId}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'motivo', label: 'Motivo', render: (r) => <span className="text-muted">{r.motivo}</span> },
    { key: 'reportado', label: 'Reportado', render: (r) => <span className="text-muted">{fmtDate(r.reportedAt)}</span> },
    { key: 'asignado', label: 'Asignado', render: (r) => <span className="text-muted">{r.asignado}</span> },
    {
      key: 'estado', label: 'Estado',
      render: (r) => (
        <select
          value={r.estado}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => changeEstado(r.id, e.target.value)}
          className="rounded-lg border border-white/10 bg-brand-bg/60 px-2 py-1 text-xs text-white outline-none focus:border-gold-accent/60"
        >
          {ESTADOS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Abiertos" value={kpis.abiertos} accent="#f87171" />
        <KpiCard label="Resueltos / cerrados" value={kpis.cerrados} accent="#34d399" />
        <KpiCard label="Total" value={kpis.total} accent="#38bdf8" />
      </div>

      <DataTable columns={columns} rows={warranties} getKey={(r) => r.id} onRowClick={setSel} empty="Sin garantías reportadas." />

      <SlidePanel open={!!sel} onClose={() => setSel(null)} title={sel?.id} subtitle={sel ? `${sel.clientName} · ${sel.estado.replace('_', ' ')}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><EstadoBadge value={sel.estado} /></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Pedido', sel.orderId], ['Comercial', sel.comercial], ['Causal', sel.causal], ['Asignado a', sel.asignado], ['Reportado', fmtDate(sel.reportedAt)]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p><p className="mt-0.5 text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3 text-sm">
              <p className="text-[11px] uppercase text-muted">Motivo</p>
              <p className="mt-0.5 text-white">{sel.motivo}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1">📷 Adjuntar foto</button>
              <button className="btn-gold flex-1">Cargar costo garantía</button>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
