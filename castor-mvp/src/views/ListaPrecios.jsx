import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge, Chip } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import {
  Toolbar,
  SearchBox,
  SelectFilter,
  SlidePanel,
  ClearFiltersButton,
} from '../components/widgets';
import { IconBox, IconTag, IconBank, IconShield } from '../components/icons';

// Lista de precios — catálogo de productos con filtros completos.
// Espejo HTML: search + categoría + bodega + rango de precio.
export default function ListaPrecios() {
  const { products, warehouses, finishedStock } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [bodega, setBodega] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [sel, setSel] = useState(null);

  const categorias = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const ptBodegas = warehouses.filter((w) => w.tipo === 'terminado');
  const wName = (id) => warehouses.find((w) => w.id === id)?.code || id;

  // Cantidad disponible por producto a partir de finishedStock.
  const stockByProduct = useMemo(() => {
    const map = {};
    for (const f of finishedStock) {
      if (!map[f.productId]) map[f.productId] = { total: 0, byW: {} };
      map[f.productId].total += f.qty;
      map[f.productId].byW[f.warehouseId] = (map[f.productId].byW[f.warehouseId] || 0) + f.qty;
    }
    return map;
  }, [finishedStock]);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    const min = Number(precioMin) || 0;
    const max = Number(precioMax) || Infinity;
    return products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (bodega) {
        const st = stockByProduct[p.id];
        if (!st || !st.byW[bodega]) return false;
      }
      if (p.price < min || p.price > max) return false;
      if (t && !`${p.name} ${p.sku || ''} ${p.description || ''}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [products, q, cat, bodega, precioMin, precioMax, stockByProduct]);

  const hasFilters = !!(q || cat || bodega || precioMin || precioMax);
  const clearAll = () => { setQ(''); setCat(''); setBodega(''); setPrecioMin(''); setPrecioMax(''); };

  // KPIs
  const totalStock = Object.values(stockByProduct).reduce((a, s) => a + s.total, 0);
  const valorCatalogo = rows.reduce((a, p) => a + p.price * (stockByProduct[p.id]?.total || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Productos"
          value={products.length}
          hint="Catálogo completo"
          accent="#3b82f6"
          icon={<IconBox width={18} height={18} />}
        />
        <KpiCard
          label="Categorías"
          value={categorias.length}
          hint="Únicas"
          accent="#a78bfa"
          icon={<IconTag width={18} height={18} />}
        />
        <KpiCard
          label="Stock total"
          value={`${totalStock} und`}
          hint="Disponibles"
          accent="#C9A961"
          icon={<IconShield width={18} height={18} />}
        />
        <KpiCard
          label="Valor catálogo filtrado"
          value={fmtCOP(valorCatalogo)}
          hint="A precio venta"
          accent="#10b981"
          icon={<IconBank width={18} height={18} />}
        />
      </div>

      {/* Panel filtros */}
      <div className="panel p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <SearchBox value={q} onChange={setQ} placeholder="Nombre, SKU…" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="input-field">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={bodega} onChange={(e) => setBodega(e.target.value)} className="input-field">
            <option value="">Todas las bodegas</option>
            {ptBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
          </select>
          <input
            type="number"
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            placeholder="Precio mín"
            className="input-field"
          />
          <input
            type="number"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            placeholder="Precio máx"
            className="input-field"
          />
          <div className="flex items-center gap-2">
            <ClearFiltersButton active={hasFilters} onClear={clearAll} />
            <span className="ml-auto text-xs text-muted">{rows.length} productos</span>
          </div>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => {
          const stock = stockByProduct[p.id] || { total: 0, byW: {} };
          return (
            <button
              key={p.id}
              onClick={() => setSel(p)}
              className="panel group p-4 text-left transition hover:border-gold-accent"
            >
              <div className="mb-3 grid h-32 place-items-center rounded-lg bg-brand-bg/60 text-5xl">
                {p.photo}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="font-mono text-[11px] text-muted">{p.sku}</p>
                </div>
                <Chip variant="gold">{p.category}</Chip>
              </div>
              {p.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted">{p.description}</p>
              )}
              <div className="mt-3 flex items-end justify-between">
                <span className="text-lg font-bold text-gold-accent">{fmtCOP(p.price)}</span>
                <span
                  className={`text-xs ${stock.total === 0 ? 'text-red-300' : stock.total <= 2 ? 'text-amber-300' : 'text-emerald-300'}`}
                >
                  {stock.total} und disp.
                </span>
              </div>
              {Object.keys(stock.byW).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(stock.byW).map(([wid, q]) => {
                    const w = warehouses.find((x) => x.id === wid);
                    return (
                      <span
                        key={wid}
                        className="warehouse-pill !text-[10px]"
                        style={{
                          color: w?.color,
                          borderColor: `${w?.color}55`,
                          background: `${w?.color}1f`,
                        }}
                      >
                        {w?.code}: {q}
                      </span>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
        {rows.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted md:col-span-2 lg:col-span-3">
            Sin productos con los filtros aplicados.
          </div>
        )}
      </div>

      <SlidePanel open={!!sel} onClose={() => setSel(null)} title={sel?.name} subtitle={sel?.sku}>
        {sel && (
          <div className="space-y-5">
            <div className="grid h-48 place-items-center rounded-xl bg-brand-bg/60 text-7xl">{sel.photo}</div>
            {sel.description && <p className="text-sm text-muted">{sel.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Precio venta', fmtCOP(sel.price)],
                ['Costo', fmtCOP(sel.cost)],
                ['Margen', `${(((sel.price - sel.cost) / sel.price) * 100).toFixed(1)}%`],
                ['Stock total', `${(stockByProduct[sel.id]?.total || 0)} und`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p>
                  <p className="mt-0.5 font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>
            {sel.dimensions && (
              <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3 text-sm">
                <p className="text-[11px] uppercase text-muted">Dimensiones</p>
                <p className="mt-0.5 text-white">
                  {sel.dimensions.ancho} × {sel.dimensions.alto} × {sel.dimensions.profundidad} cm
                </p>
              </div>
            )}
            {sel.areas && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Áreas de producción</p>
                <div className="flex flex-wrap gap-1.5">
                  {sel.areas.map((a) => <Chip key={a} variant="info">{a}</Chip>)}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Disponibilidad por bodega</p>
              <div className="space-y-1.5">
                {Object.entries(stockByProduct[sel.id]?.byW || {}).map(([wid, qty]) => {
                  const w = warehouses.find((x) => x.id === wid);
                  return (
                    <div
                      key={wid}
                      className="flex items-center justify-between rounded bg-brand-bg/40 px-3 py-2 text-sm"
                    >
                      <span className="text-white">{w?.code} · {w?.name}</span>
                      <span className="font-bold" style={{ color: w?.color }}>{qty} und</span>
                    </div>
                  );
                })}
                {Object.keys(stockByProduct[sel.id]?.byW || {}).length === 0 && (
                  <p className="text-sm text-muted">Sin stock disponible.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
