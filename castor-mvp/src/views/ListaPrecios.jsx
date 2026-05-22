import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { Toolbar, SearchBox, SelectFilter, SlidePanel } from '../components/widgets';

export default function ListaPrecios() {
  const { products, warehouses } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sel, setSel] = useState(null);

  const categorias = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const wName = (id) => warehouses.find((w) => w.id === id)?.code || id;

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (t && !`${p.name} ${p.sku} ${p.description}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [products, q, cat]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Productos" value={products.length} accent="#38bdf8" />
        <KpiCard label="Categorías" value={categorias.length} accent="#a78bfa" />
        <KpiCard label="Stock total" value={`${products.reduce((a, p) => a + p.stock, 0)} und`} accent="#C9A961" />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, SKU, descripción…" />
        <SelectFilter value={cat} onChange={setCat} options={categorias} allLabel="Todas las categorías" />
        <span className="ml-auto text-sm text-muted">{rows.length} productos</span>
      </Toolbar>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((p) => (
          <button
            key={p.id}
            onClick={() => setSel(p)}
            className="panel group p-4 text-left transition hover:border-gold-accent/40"
          >
            <div className="mb-3 grid h-24 place-items-center rounded-lg bg-brand-bg/60 text-4xl">{p.photo}</div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-white">{p.name}</p>
            </div>
            <p className="font-mono text-[11px] text-muted">{p.sku}</p>
            <div className="mt-2"><Badge tone="muted">{p.category}</Badge></div>
            <p className="mt-2 line-clamp-2 text-xs text-muted">{p.description}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-lg font-bold text-gold-accent">{fmtCOP(p.price)}</span>
              <span className={`text-xs ${p.stock <= p.min ? 'text-red-300' : 'text-muted'}`}>
                {p.stock} und · {wName(p.warehouseId)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <SlidePanel open={!!sel} onClose={() => setSel(null)} title={sel?.name} subtitle={sel?.sku}>
        {sel && (
          <div className="space-y-5">
            <div className="grid h-40 place-items-center rounded-xl bg-brand-bg/60 text-7xl">{sel.photo}</div>
            <p className="text-sm text-muted">{sel.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Precio venta', fmtCOP(sel.price)], ['Costo', fmtCOP(sel.cost)],
                ['Margen', `${(((sel.price - sel.cost) / sel.price) * 100).toFixed(1)}%`],
                ['Stock', `${sel.stock} und`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p>
                  <p className="mt-0.5 font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3 text-sm">
              <p className="text-[11px] uppercase text-muted">Dimensiones</p>
              <p className="mt-0.5 text-white">{sel.dimensions.ancho} × {sel.dimensions.alto} × {sel.dimensions.profundidad} cm</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sel.areas.map((a) => <Badge key={a} tone="muted">{a}</Badge>)}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
