import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Chip } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { SlidePanel } from '../components/widgets';
import { IconBox, IconTag, IconBank, IconShield } from '../components/icons';
import { useToast } from '../components/Toast';
import { exportPriceListPDF } from '../lib/priceListPdf';
import Modal from '../components/Modal';
import { Field, Input, Select, Textarea } from '../components/form';
import { uid } from '../lib/format';

// Lista de precios — catálogo de productos con filtros completos.
// Espejo HTML: search + categoría + bodega + rango de precio.
export default function ListaPrecios() {
  const { products, warehouses, finishedStock, add, nextId } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [bodega, setBodega] = useState('');
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null); // H-041: modal nuevo producto
  const toast = useToast();
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const categorias = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const ptBodegas = warehouses.filter((w) => w.tipo === 'terminado');

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
    return products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (bodega) {
        const st = stockByProduct[p.id];
        if (!st || !st.byW[bodega]) return false;
      }
      if (t && !`${p.name} ${p.sku || ''} ${p.description || ''}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [products, q, cat, bodega, stockByProduct]);

  const hasFilters = !!(q || cat || bodega);
  const clearAll = () => { setQ(''); setCat(''); setBodega(''); };
  // H-040: exporta la lista (filtrada) a PDF corporativo.
  const handleExportPdf = () => {
    exportPriceListPDF(rows, { warehouses });
    toast(`PDF de ${rows.length} producto(s) generado`, 'ok');
  };

  // H-041: alta rápida de producto al catálogo (modal simple, sin BOM).
  // H-104: el alta de producto vive ahora SOLO en Innovación (modal completo con BOM).
  // Este modal y su `emptyProduct` se conservan SIN entry point público (se quitó el
  // botón "+ Nuevo producto") por si en un sprint futuro el cliente lo vuelve a pedir.
  // eslint-disable-next-line no-unused-vars
  const emptyProduct = () => ({
    name: '', sku: '', category: '', price: 0, description: '',
    ancho: '', alto: '', profundidad: '', warehouseId: ptBodegas[0]?.id || '', stock: 1, photo: '📦',
  });
  const saveNewProduct = () => {
    if (!form.name.trim()) return toast('El nombre es obligatorio', 'warn');
    if (!form.category) return toast('Selecciona la categoría', 'warn');
    if (!(Number(form.price) > 0)) return toast('Indica el precio comercial', 'warn');
    const id = nextId('PROD', 'prod', 0);
    const sku = form.sku.trim() || `${form.category.slice(0, 3).toUpperCase()}-${id.toUpperCase()}`;
    const stockIni = Number(form.stock) || 0;
    add('products', {
      id, sku, name: form.name.trim(), category: form.category, photo: form.photo || '📦',
      warehouseId: form.warehouseId, description: form.description,
      dimensions: { ancho: Number(form.ancho) || 0, alto: Number(form.alto) || 0, profundidad: Number(form.profundidad) || 0 },
      stock: stockIni, min: 0, cost: 0, price: Number(form.price) || 0, verified: true,
    });
    // Stock inicial → registro en finishedStock para que aparezca en el catálogo/disponibilidad.
    if (stockIni > 0 && form.warehouseId) {
      add('finishedStock', { id: uid('FS'), productId: id, warehouseId: form.warehouseId, qty: stockIni, status: 'disponible' });
    }
    toast(`Producto ${sku} creado`, 'ok');
    setForm(null);
  };

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

      {/* H-038: texto sutil + filtros simplificados + botones (Demo6). */}
      <p className="text-[11px] text-muted">
        Catálogo completo con medidas finales, precio, descripción y ubicación.
      </p>
      <div className="panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="label">Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, SKU o descripción"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="input-field">
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bodega</label>
            <select value={bodega} onChange={(e) => setBodega(e.target.value)} className="input-field">
              <option value="">Todas</option>
              {ptBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {hasFilters && <button onClick={clearAll} className="btn-outline text-xs">Limpiar</button>}
            <button onClick={handleExportPdf} className="btn-outline text-xs">📄 Exportar PDF</button>
            {/* H-104: el alta de producto se hace en Innovación (modal con BOM); aquí queda
                como catálogo de solo lectura para alta. El modal interno se conserva. */}
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
              {/* H-039: SKU arriba (mono gris), nombre grande; un solo badge categoría (ocre). */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-muted">{p.sku}</p>
                  <p className="text-lg font-bold text-white">{p.name}</p>
                </div>
                <Chip variant="gold">{p.category}</Chip>
              </div>
              {p.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted">{p.description}</p>
              )}
              {/* Especificaciones: Medidas (dorado) + Bodega (color por sede). */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted">Medidas</div>
                  <div className="font-semibold text-brand-gold-light">
                    {p.dimensions ? `${p.dimensions.ancho} × ${p.dimensions.alto} × ${p.dimensions.profundidad} cm` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Bodega</div>
                  <div className="font-semibold" style={{ color: warehouses.find((w) => w.id === p.warehouseId)?.color }}>
                    {warehouses.find((w) => w.id === p.warehouseId)?.code || '—'}
                  </div>
                </div>
              </div>
              {/* Cierre: precio comercial + stock (solo número, sin "und disp."). */}
              <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Precio comercial</div>
                  <div className="text-xl font-bold text-gold-accent">{fmtCOP(p.price)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted">Stock</div>
                  <div
                    className={`text-lg font-semibold ${
                      stock.total === 0 ? 'text-red-400' : stock.total <= (p.min || 0) ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    {stock.total}
                  </div>
                </div>
              </div>
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

      {/* H-041: Modal Nuevo producto (A datos+imagen · B dimensiones · C ubicación/stock). */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Nuevo producto"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveNewProduct}>Crear producto</button>
          </>
        }
      >
        {form && (
          <div className="space-y-5">
            {/* Bloque A: datos básicos + imagen */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="sm:w-40">
                <div className="grid h-32 place-items-center rounded-lg border border-dashed border-white/15 bg-brand-bg/60 text-5xl">
                  {form.photo || '➕'}
                </div>
                <Input className="mt-2 text-center" value={form.photo} onChange={(e) => setField('photo', e.target.value)} placeholder="+ Imagen (emoji)" />
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nombre del producto *"><Input value={form.name} onChange={(e) => setField('name', e.target.value)} /></Field>
                <Field label="SKU"><Input value={form.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="Autogenerado si vacío" /></Field>
                <Field label="Categoría *">
                  <Select value={form.category} onChange={(e) => setField('category', e.target.value)}>
                    <option value="">— Elegir —</option>
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Precio comercial *"><Input type="number" min="0" value={form.price} onChange={(e) => setField('price', Number(e.target.value))} /></Field>
                <Field className="sm:col-span-2" label="Descripción corta / detalles de materiales">
                  <Textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Ej: estructura de madera sólida, tapizado en tela…" />
                </Field>
              </div>
            </div>

            {/* Bloque B: dimensiones */}
            <div>
              <p className="mb-2 text-sm font-semibold gold-title">Dimensiones</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Ancho (cm) *"><Input type="number" min="0" value={form.ancho} onChange={(e) => setField('ancho', e.target.value)} /></Field>
                <Field label="Alto (cm) *"><Input type="number" min="0" value={form.alto} onChange={(e) => setField('alto', e.target.value)} /></Field>
                <Field label="Profundidad (cm) *"><Input type="number" min="0" value={form.profundidad} onChange={(e) => setField('profundidad', e.target.value)} /></Field>
              </div>
            </div>

            {/* Bloque C: ubicación y stock */}
            <div>
              <p className="mb-2 text-sm font-semibold gold-title">Ubicación y Stock</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Bodega / sede inicial *">
                  <Select value={form.warehouseId} onChange={(e) => setField('warehouseId', e.target.value)}>
                    {ptBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                  </Select>
                </Field>
                <Field label="Stock inicial *"><Input type="number" min="0" value={form.stock} onChange={(e) => setField('stock', Number(e.target.value))} /></Field>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
