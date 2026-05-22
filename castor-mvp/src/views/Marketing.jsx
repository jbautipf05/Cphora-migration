import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge, Chip } from '../components/ui';
import { fmtDate, today } from '../lib/format';
import { Toolbar, SearchBox, SelectFilter, SlidePanel, ClearFiltersButton } from '../components/widgets';
import Modal from '../components/Modal';
import { Field, Input, Select, Textarea, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const TYPE_ICON = {
  Catalogo: '📚', 'Foto producto': '📷', 'Foto ambiente': '🖼️', 'Foto cliente': '👤',
  Historias: '📱', Feed: '🔲', Campañas: '🎬',
};
const TYPES = ['Catalogo', 'Foto producto', 'Foto ambiente', 'Foto cliente', 'Historias', 'Feed', 'Campañas'];
const FORMATS = ['PDF', 'JPG', 'PNG', 'MP4', 'ZIP'];

const empty = () => ({ name: '', type: 'Foto producto', format: 'JPG', filename: '', size: '', description: '', productIds: [] });

export default function Marketing() {
  const { marketingAssets, products, add, nextId } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [formato, setFormato] = useState('');
  const [productoFilter, setProductoFilter] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null);

  const tipos = useMemo(() => [...new Set(marketingAssets.map((a) => a.type))], [marketingAssets]);
  const formatos = useMemo(() => [...new Set(marketingAssets.map((a) => a.format).filter(Boolean))], [marketingAssets]);
  const pName = (id) => products.find((p) => p.id === id)?.name || id;

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return marketingAssets.filter((a) => {
      if (tipo && a.type !== tipo) return false;
      if (formato && a.format !== formato) return false;
      if (productoFilter && !(a.productIds || []).includes(productoFilter)) return false;
      if (desde && a.createdAt < desde) return false;
      if (hasta && a.createdAt > hasta) return false;
      if (t && !`${a.name} ${a.description || ''} ${a.filename || ''}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [marketingAssets, q, tipo, formato, productoFilter, desde, hasta]);

  const hasFilters = !!(q || tipo || formato || productoFilter || desde || hasta);
  const clearAll = () => { setQ(''); setTipo(''); setFormato(''); setProductoFilter(''); setDesde(''); setHasta(''); };

  // Descarga simulada de un asset: genera un archivo .txt con sus metadatos
  // (el demo HTML solo mostraba "Descargar" como acción simulada).
  const downloadAsset = (a) => {
    const content = `CASTOR · Pieza de marketing\n\nNombre: ${a.name}\nTipo: ${a.type}\nFormato: ${a.format}\nArchivo: ${a.filename || '—'}\nTamaño: ${a.size || '—'}\nCreado: ${a.createdAt}\nDescripción: ${a.description || ''}\nProductos: ${(a.productIds || []).map(pName).join(', ')}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${a.id}_${a.name.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast(`Descargando ${a.name}…`, 'ok');
  };

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleProduct = (id) =>
    setForm((f) => ({ ...f, productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id] }));
  function save() {
    if (!form.name.trim()) return toast('Indica el nombre', 'warn');
    const id = nextId('MKT', 'mkt', 3);
    add('marketingAssets', { id, ...form, createdAt: today() });
    toast(`Pieza ${id} creada`, 'ok');
    setForm(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Piezas totales" value={marketingAssets.length} accent="#C9A961" />
        <KpiCard label="Productos vinculados" value={new Set(marketingAssets.flatMap((a) => a.productIds || [])).size} accent="#3b82f6" />
        <KpiCard label="Tipos" value={tipos.length} accent="#10b981" />
        <KpiCard label="Mostrando" value={rows.length} accent="#8b5cf6" />
      </div>

      {/* Panel filtros completo (6 campos) — espejo HTML */}
      <div className="panel p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-field">
            <option value="">Todos los tipos</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={formato} onChange={(e) => setFormato(e.target.value)} className="input-field">
            <option value="">Todos los formatos</option>
            {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={productoFilter} onChange={(e) => setProductoFilter(e.target.value)} className="input-field">
            <option value="">Todos los productos</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} placeholder="Desde" className="input-field" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} placeholder="Hasta" className="input-field" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pieza…" className="input-field" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ClearFiltersButton active={hasFilters} onClear={clearAll} />
          <span className="ml-auto text-sm text-muted">{rows.length} piezas</span>
          <button className="btn-gold" onClick={() => setForm(empty())}>+ Subir pieza</button>
        </div>
      </div>

      <h3 className="text-base font-semibold text-white">Biblioteca de materiales</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((a) => {
          const prodNames = (a.productIds || []).map(pName);
          return (
            <div key={a.id} className="panel relative p-4 transition hover:border-gold-accent">
              <button
                onClick={() => setSel(a)}
                className="absolute inset-0 z-0 cursor-pointer rounded-xl"
                aria-label={`Ver ${a.name}`}
              />
              <div className="relative z-10">
                <div className="mb-3 flex items-start justify-between">
                  <div className="grid h-16 w-16 place-items-center rounded-lg bg-brand-bg/60 text-4xl">
                    {TYPE_ICON[a.type] || a.thumb || '📄'}
                  </div>
                  <Chip variant="gold">{a.format || '—'}</Chip>
                </div>
                <p className="font-semibold text-white">{a.name}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted">{a.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-300">{a.type}</span>
                  {a.filename && (
                    <span className="rounded bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-300">📎 {a.filename}</span>
                  )}
                </div>
                {prodNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {prodNames.map((n) => (
                      <span key={n} className="rounded bg-gold-accent/20 px-2 py-0.5 text-[10px] text-gold-accent">
                        📦 {n}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-muted">
                  <span>{a.size || '—'}</span>
                  <span>{fmtDate(a.createdAt)}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadAsset(a); }}
                  className="relative z-20 mt-2 w-full rounded-lg border border-gold-accent/40 px-2 py-1.5 text-xs text-gold-accent transition hover:bg-gold-accent/10"
                >
                  ⬇ Descargar
                </button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted md:col-span-2 lg:col-span-3">
            Sin piezas para los filtros aplicados.
          </div>
        )}
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
                {(sel.productIds || []).map((id) => <Badge key={id} tone="muted">{pName(id)}</Badge>)}
                {(sel.productIds || []).length === 0 && (
                  <span className="text-xs text-muted">Sin productos vinculados.</span>
                )}
              </div>
            </div>
            <button onClick={() => downloadAsset(sel)} className="btn-gold w-full">
              ⬇ Descargar pieza
            </button>
          </div>
        )}
      </SlidePanel>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Nueva pieza de marketing"
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={save}>Guardar</button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <FormGrid cols={2}>
              <Field label="Nombre" className="sm:col-span-2"><Input value={form.name} onChange={(e) => setF('name', e.target.value)} /></Field>
              <Field label="Tipo">
                <Select value={form.type} onChange={(e) => setF('type', e.target.value)}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Formato">
                <Select value={form.format} onChange={(e) => setF('format', e.target.value)}>
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label="Archivo"><Input value={form.filename} onChange={(e) => setF('filename', e.target.value)} placeholder="archivo.jpg" /></Field>
              <Field label="Tamaño"><Input value={form.size} onChange={(e) => setF('size', e.target.value)} placeholder="2.4 MB" /></Field>
            </FormGrid>
            <Field label="Descripción"><Textarea rows={2} value={form.description} onChange={(e) => setF('description', e.target.value)} /></Field>
            <div>
              <span className="label">Productos vinculados</span>
              <div className="flex flex-wrap gap-1.5">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      form.productIds.includes(p.id)
                        ? 'border-brand-gold/40 bg-brand-gold/20 text-brand-gold-light'
                        : 'border-brand-border text-brand-muted hover:text-white'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
