import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge } from '../components/ui';
import { Toolbar, SearchBox, SelectFilter, SlidePanel, fmtDate } from '../components/widgets';

const TYPE_ICON = {
  Catalogo: '📚', 'Foto producto': '📷', 'Foto ambiente': '🖼️', 'Foto cliente': '👤',
  Historias: '📱', Feed: '🔲', Campañas: '🎬',
};

export default function Marketing() {
  const { marketingAssets, products } = useApp();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [sel, setSel] = useState(null);

  const tipos = useMemo(() => [...new Set(marketingAssets.map((a) => a.type))], [marketingAssets]);
  const pName = (id) => products.find((p) => p.id === id)?.name || id;

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return marketingAssets.filter((a) => {
      if (tipo && a.type !== tipo) return false;
      if (t && !`${a.name} ${a.description}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [marketingAssets, q, tipo]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Piezas totales" value={marketingAssets.length} accent="#a78bfa" />
        <KpiCard label="Tipos" value={tipos.length} accent="#38bdf8" />
        <KpiCard label="Mostrando" value={rows.length} accent="#C9A961" />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar pieza…" />
        <SelectFilter value={tipo} onChange={setTipo} options={tipos} allLabel="Todos los tipos" />
        <span className="ml-auto text-sm text-muted">{rows.length} piezas</span>
      </Toolbar>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((a) => (
          <button key={a.id} onClick={() => setSel(a)} className="panel group p-4 text-left transition hover:border-gold-accent/40">
            <div className="mb-3 grid h-24 place-items-center rounded-lg bg-brand-bg/60 text-4xl">{TYPE_ICON[a.type] || '📄'}</div>
            <div className="flex items-center gap-2"><Badge tone="gold">{a.type}</Badge><Badge tone="muted">{a.format}</Badge></div>
            <p className="mt-2 font-semibold text-white">{a.name}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{a.description}</p>
            <p className="mt-2 text-[11px] text-muted">{a.size} · {fmtDate(a.createdAt)}</p>
          </button>
        ))}
      </div>

      <SlidePanel open={!!sel} onClose={() => setSel(null)} title={sel?.name} subtitle={sel ? `${sel.type} · ${sel.format}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div className="grid h-40 place-items-center rounded-xl bg-brand-bg/60 text-7xl">{TYPE_ICON[sel.type] || '📄'}</div>
            <p className="text-sm text-muted">{sel.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Archivo', sel.filename], ['Tamaño', sel.size], ['Formato', sel.format], ['Creado', fmtDate(sel.createdAt)]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p>
                  <p className="mt-0.5 break-all text-white">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Productos vinculados</p>
              <div className="flex flex-wrap gap-1.5">
                {sel.productIds.map((id) => <Badge key={id} tone="muted">{pName(id)}</Badge>)}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
