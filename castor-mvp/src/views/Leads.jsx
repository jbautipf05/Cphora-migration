import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import {
  Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, SlidePanel, fmtDate,
} from '../components/widgets';

const ESTADOS = ['Nuevo', 'En gestión', 'Compro', 'No interesado'];
const CLASIF = ['alto', 'medio', 'bajo'];

export default function Leads() {
  const { leads, products } = useApp();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [clasif, setClasif] = useState('');
  const [sel, setSel] = useState(null);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return leads.filter((l) => {
      if (estado && l.estado !== estado) return false;
      if (clasif && l.clasificacion !== clasif) return false;
      if (t && !`${l.id} ${l.name} ${l.razonSocial || ''}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [leads, q, estado, clasif]);

  const kpis = useMemo(() => ({
    total: leads.length,
    gestion: leads.filter((l) => l.estado === 'En gestión').length,
    alto: leads.filter((l) => l.clasificacion === 'alto').length,
    valor: leads.reduce((a, l) => a + (l.valor || 0), 0),
  }), [leads]);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'name', label: 'Nombre', render: (r) => <span className="text-white">{r.name}</span> },
    { key: 'tipo', label: 'Tipo', render: (r) => <span className="capitalize text-muted">{r.tipo}</span> },
    { key: 'channel', label: 'Canal', render: (r) => <span className="text-muted">{r.channel}</span> },
    { key: 'clasificacion', label: 'Clasif.', render: (r) => <span className="capitalize text-muted">{r.clasificacion}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-muted">{r.asesor}</span> },
    { key: 'valor', label: 'Valor est.', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.valor)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Leads totales" value={kpis.total} accent="#38bdf8" />
        <KpiCard label="En gestión" value={kpis.gestion} accent="#C9A961" />
        <KpiCard label="Clasificación alta" value={kpis.alto} accent="#34d399" />
        <KpiCard label="Valor estimado" value={fmtCOP(kpis.valor)} accent="#a78bfa" />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, razón social, ID…" />
        <SelectFilter value={estado} onChange={setEstado} options={ESTADOS} allLabel="Todos los estados" />
        <SelectFilter value={clasif} onChange={setClasif} options={CLASIF} allLabel="Toda clasificación" />
        <span className="ml-auto text-sm text-muted">{rows.length} leads</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={setSel} />

      <SlidePanel
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel?.name}
        subtitle={sel ? `${sel.id} · ${sel.tipo} · ${sel.city || ''}` : ''}
      >
        {sel && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <EstadoBadge value={sel.estado} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Teléfono', sel.phone], ['Email', sel.email], ['Documento', sel.doc],
                ['Ciudad', sel.city], ['Canal', sel.channel], ['Asesor', sel.asesor],
                ['NIT', sel.nit], ['Razón social', sel.razonSocial],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">{k}</p>
                  <p className="mt-0.5 text-white">{v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">
                Productos de interés
              </p>
              <div className="space-y-1.5">
                {sel.productosInteres.length === 0 && <p className="text-sm text-muted">Sin productos asociados.</p>}
                {sel.productosInteres.map((pi, i) => {
                  const p = products.find((x) => x.id === pi.productId);
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-bg/40 px-3 py-2 text-sm">
                      <span className="text-white">{p?.name || pi.productId} × {pi.qty}</span>
                      <span className="text-muted">{fmtCOP((p?.price || 0) * pi.qty)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">
                Historial de notas
              </p>
              <div className="space-y-2">
                {sel.notes.length === 0 && <p className="text-sm text-muted">Sin notas.</p>}
                {sel.notes.map((n, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3 text-sm">
                    <p className="text-white/90">{n.text}</p>
                    <p className="mt-1 text-[11px] text-muted">{n.by} · {fmtDate(n.at)}</p>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-gold w-full">💬 Crear cotización desde lead</button>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
