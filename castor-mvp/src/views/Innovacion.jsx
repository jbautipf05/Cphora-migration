import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtDate } from '../components/widgets';

const COLUMNS = [
  { id: 'idea', label: '💡 Ideas' },
  { id: 'piloto', label: '🧪 Pilotos' },
  { id: 'produccion', label: '🏭 Producción' },
];

export default function Innovacion() {
  const { innovation, products, setState } = useApp();

  const kpis = useMemo(() => ({
    ideas: innovation.filter((i) => i.estado === 'idea').length,
    pilotos: innovation.filter((i) => i.estado === 'piloto').length,
    productos: products.length,
    aprobados: products.filter((p) => p.verified).length,
  }), [innovation, products]);

  const move = (id, estado) =>
    setState((s) => ({ ...s, innovation: s.innovation.map((i) => (i.id === id ? { ...i, estado } : i)) }));

  const vote = (id) =>
    setState((s) => ({ ...s, innovation: s.innovation.map((i) => (i.id === id ? { ...i, votos: i.votos + 1 } : i)) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ideas" value={kpis.ideas} accent="#38bdf8" />
        <KpiCard label="Pilotos" value={kpis.pilotos} accent="#a78bfa" />
        <KpiCard label="Productos catálogo" value={kpis.productos} accent="#C9A961" />
        <KpiCard label="Aprobados (verified)" value={kpis.aprobados} accent="#34d399" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.id}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{col.label}</p>
            <div className="space-y-3">
              {innovation.filter((i) => i.estado === col.id).map((i) => {
                const idx = COLUMNS.findIndex((c) => c.id === i.estado);
                const next = COLUMNS[idx + 1];
                return (
                  <div key={i.id} className="panel p-4">
                    <p className="font-semibold text-white">{i.title}</p>
                    <p className="mt-1 text-xs text-muted">{i.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <button onClick={() => vote(i.id)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-muted hover:text-white">
                        ▲ {i.votos}
                      </button>
                      <span className="text-[11px] text-muted">{fmtDate(i.createdAt)}</span>
                    </div>
                    {next && (
                      <button onClick={() => move(i.id, next.id)} className="mt-2 w-full rounded-lg border border-gold-accent/30 px-2 py-1.5 text-xs text-gold-accent hover:bg-gold-accent/10">
                        Avanzar → {next.label}
                      </button>
                    )}
                  </div>
                );
              })}
              {innovation.filter((i) => i.estado === col.id).length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 py-6 text-center text-xs text-muted/60">Sin items</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
