import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/format';
import { IconBox, IconCheck, IconShield, IconBulb } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';
import { PROD_AREAS, PRODUCT_CATEGORIES } from '../data/erpSeed';

const LIFECYCLE_STATES = ['Activo', 'Borrador', 'Proceso', 'Inactivo'];

// Espejo de getProductLifecycle(): si no hay estado explícito, deriva de verified.
const lifecycleOf = (p) => p.lifecycleStatus || (p.verified ? 'Activo' : 'Borrador');

// ─────────────────────────────────────────────────────────────────────────────
// Innovación — espejo de PAGE_RENDERERS.innovacion (HTML líneas 8280-8367).
// KPIs · OPs pendientes de innovación · "Productos en desarrollo" con filtros
// (búsqueda / categoría / estado) · tabla con ciclo de vida editable · modales
// "Nuevo producto" (BOM) y edición de ficha (master card).
// ─────────────────────────────────────────────────────────────────────────────
export default function Innovacion() {
  const { products, orders, warehouses, supplies, update, add, nextId, pendingForm, setPendingForm } = useApp();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [estado, setEstado] = useState('');
  const [form, setForm] = useState(null);   // nuevo producto
  const [edit, setEdit] = useState(null);    // master card

  // H-102: un producto (terminado) solo puede vivir en una bodega de Producto Terminado;
  // las bodegas de insumos (MP) no deben aparecer en su selector de bodega.
  const ptWarehouses = useMemo(() => warehouses.filter((w) => w.tipo === 'terminado'), [warehouses]);

  const allCats = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );
  const pendingOPs = useMemo(
    () => orders.filter((o) => o.tipo === 'innovacion' && o.estado === 'pendiente_innovacion'),
    [orders],
  );

  const kpis = useMemo(() => ({
    total: products.length,
    aprobados: products.filter((p) => p.verified).length,
    auditoria: products.filter((p) => !p.verified).length,
    ops: pendingOPs.length,
  }), [products, pendingOPs]);

  const filtered = useMemo(() => products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!((p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))) return false;
    }
    if (category && p.category !== category) return false;
    if (estado) {
      if (estado === 'unverified') return !p.verified;
      return lifecycleOf(p) === estado;
    }
    return true;
  }), [products, search, category, estado]);

  // Costo estimado a partir del BOM (igual que el demo).
  const bomCost = (bom) => (bom || []).reduce((a, b) => {
    const s = supplies.find((x) => x.id === b.supplyId);
    return a + (s ? (Number(s.cost) || 0) * (Number(b.qty) || 0) : 0);
  }, 0);

  // Cambia el ciclo de vida; activar exige verificación de auditoría.
  const setLifecycle = (p, newStatus) => {
    if (newStatus === 'Activo' && !p.verified) {
      update('products', p.id, { lifecycleStatus: 'Borrador' });
      toast('No se puede activar: producto pendiente de verificación de auditoría', 'warn');
      return;
    }
    update('products', p.id, { lifecycleStatus: newStatus });
    toast(`Estado de ${p.name}: ${newStatus}`, newStatus === 'Activo' ? 'ok' : 'info');
  };

  // ── Nuevo producto ──
  const openNew = () => setForm({
    name: '', sku: '', category: '', photo: '📦', warehouseId: ptWarehouses[0]?.id || '',
    description: '', ancho: '', alto: '', profundidad: '', min: 0,
    areas: [], bom: [{ supplyId: '', qty: '' }], cost: 0, price: 0, costTouched: false,
  });
  const toggleArea = (a) => setForm((f) => ({
    ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a],
  }));
  // H-104a: mientras el usuario no edite manualmente "Costo final", éste se auto-rellena en
  // vivo con el total del BOM (espejo de recalcBomCostMaster, Demo6:8488-8489). Al tocar el
  // campo de costo se marca costTouched y deja de auto-actualizarse.
  const syncCost = (f) => (f.costTouched ? f : { ...f, cost: bomCost(f.bom) });
  const setBomRow = (i, k, v) => setForm((f) => syncCost({
    ...f, bom: f.bom.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)),
  }));
  const addBomRow = () => setForm((f) => syncCost({ ...f, bom: [...f.bom, { supplyId: '', qty: '' }] }));
  const delBomRow = (i) => setForm((f) => syncCost({ ...f, bom: f.bom.filter((_, idx) => idx !== i) }));

  // Intent del header "+ Nuevo" → abrir el form de nuevo producto (H-001).
  useEffect(() => {
    if (pendingForm?.type === 'producto') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openNew();
      setPendingForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingForm]);

  const formBomCost = form ? bomCost(form.bom) : 0;
  const formMargin = (f) => (Number(f.price) > 0 ? Math.round((Number(f.price) - Number(f.cost)) / Number(f.price) * 100) : 0);

  const saveNew = () => {
    if (!form.name.trim()) return toast('El nombre es obligatorio', 'warn');
    if (!form.category) return toast('Selecciona la categoría', 'warn');
    if (!(Number(form.price) > 0)) return toast('Indica el precio de venta', 'warn');
    const id = nextId('PROD', 'prod', 0);
    const sku = form.sku.trim() || `${form.category.slice(0, 3).toUpperCase()}-${id.toUpperCase()}`;
    const cleanBom = form.bom.filter((b) => b.supplyId && Number(b.qty) > 0).map((b) => ({ supplyId: b.supplyId, qty: Number(b.qty) }));
    add('products', {
      id, sku, name: form.name.trim(), category: form.category, photo: form.photo || '📦',
      warehouseId: form.warehouseId, description: form.description,
      dimensions: { ancho: Number(form.ancho) || 0, alto: Number(form.alto) || 0, profundidad: Number(form.profundidad) || 0 },
      stock: 0, min: Number(form.min) || 0, areas: form.areas, bom: cleanBom,
      cost: Number(form.cost) || bomCost(cleanBom), price: Number(form.price) || 0,
      verified: false, lifecycleStatus: 'Borrador', entryDate: undefined,
    });
    toast(`${form.name} enviado a auditoría`, 'ok');
    setForm(null);
  };

  // ── Editar ficha (master card) ── (EX-F3-01: paridad con openProductMasterEdit de Demo6)
  const openEdit = (p) => setEdit({
    ...p,
    ancho: p.dimensions?.ancho || '', alto: p.dimensions?.alto || '', profundidad: p.dimensions?.profundidad || '',
    areas: p.areas || [],
    // BOM editable: copia de trabajo desde p.bom (o una fila vacía si no tiene).
    bom: p.bom?.length ? p.bom.map((b) => ({ supplyId: b.supplyId, qty: b.qty })) : [{ supplyId: '', qty: '' }],
    costTouched: false, // mismo flag que el modal Nuevo: el costo se auto-rellena del BOM hasta override manual
  });
  const toggleEditArea = (a) => setEdit((f) => ({
    ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a],
  }));
  // Editor de BOM del modal de edición (mismo patrón que el modal Nuevo).
  const syncEditCost = (f) => (f.costTouched ? f : { ...f, cost: bomCost(f.bom) });
  const setEditBomRow = (i, k, v) => setEdit((f) => syncEditCost({
    ...f, bom: f.bom.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)),
  }));
  const addEditBomRow = () => setEdit((f) => syncEditCost({ ...f, bom: [...f.bom, { supplyId: '', qty: '' }] }));
  const delEditBomRow = (i) => setEdit((f) => syncEditCost({ ...f, bom: f.bom.filter((_, idx) => idx !== i) }));
  // Toggle verificado (espejo de toggleProductVerified): persiste en el producto y refleja en el form.
  const toggleEditVerified = () => {
    const nv = !edit.verified;
    update('products', edit.id, { verified: nv });
    setEdit((f) => ({ ...f, verified: nv }));
    toast(nv ? `${edit.name} marcado como verificado` : `${edit.name} enviado a auditoría`, nv ? 'ok' : 'info');
  };
  const saveEdit = () => {
    const cleanBom = (edit.bom || []).filter((b) => b.supplyId && Number(b.qty) > 0).map((b) => ({ supplyId: b.supplyId, qty: Number(b.qty) }));
    update('products', edit.id, {
      name: edit.name, sku: edit.sku, category: edit.category, photo: edit.photo,
      warehouseId: edit.warehouseId, description: edit.description,
      dimensions: { ancho: Number(edit.ancho) || 0, alto: Number(edit.alto) || 0, profundidad: Number(edit.profundidad) || 0 },
      stock: Number(edit.stock) || 0, min: Number(edit.min) || 0, areas: edit.areas,
      bom: cleanBom,
      cost: Number(edit.cost) || bomCost(cleanBom), price: Number(edit.price) || 0,
    });
    toast(`Ficha de ${edit.name} actualizada`, 'ok');
    setEdit(null);
  };

  const hasFilters = !!(search || category || estado);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Productos" value={kpis.total} hint="Catálogo completo" accent="#C9A961" icon={<IconBox width={18} height={18} />} />
        <KpiCard label="Aprobados" value={kpis.aprobados} hint="Verificados" accent="#10b981" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="En auditoría" value={kpis.auditoria} hint="Por validar" accent={kpis.auditoria ? '#f59e0b' : '#10b981'} icon={<IconShield width={18} height={18} />} />
        <KpiCard label="OPs innovación" value={kpis.ops} hint="Pendientes" accent={kpis.ops ? '#f59e0b' : '#10b981'} icon={<IconBulb width={18} height={18} />} />
      </div>

      {/* OPs pendientes de innovación */}
      {pendingOPs.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold gold-title">🧪 OPs pendientes de innovación</h3>
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-brand-muted">
                <tr>
                  <th className="px-3 py-3 text-left">OP</th>
                  <th className="px-3 py-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Producto propuesto</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Precio est.</th>
                  <th className="px-3 py-3 text-left">Asesor</th>
                </tr>
              </thead>
              <tbody>
                {pendingOPs.map((o) => {
                  const pp = o.productoPropuesto || {};
                  return (
                    <tr key={o.id} className="border-b border-white/5">
                      <td className="px-3 py-3 font-mono text-xs text-brand-gold">{o.id}</td>
                      <td className="px-3 py-3 text-white">{o.clientName}</td>
                      <td className="px-3 py-3 text-xs text-white">{pp.name || '—'}<div className="text-[11px] text-brand-muted">{pp.desc || ''}</div></td>
                      <td className="px-3 py-3 text-right text-white">{pp.qty || 1}</td>
                      <td className="px-3 py-3 text-right text-brand-gold-light">{fmtCOP(pp.price || 0)}</td>
                      <td className="px-3 py-3 text-xs text-brand-muted">{o.asesor || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Productos en desarrollo + filtros */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold gold-title">Productos en desarrollo</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU, descripción…"
              className="input-field py-1 text-xs"
              style={{ minWidth: 220 }}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-auto py-1 text-xs">
              <option value="">Todas las categorías</option>
              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="input-field w-auto py-1 text-xs">
              <option value="">Todos los estados</option>
              {LIFECYCLE_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="unverified">⏳ Auditoría</option>
            </select>
            {hasFilters && (
              <button className="text-xs text-red-300 hover:underline" onClick={() => { setSearch(''); setCategory(''); setEstado(''); }}>× Limpiar</button>
            )}
            <button className="btn-gold" onClick={openNew}>+ Nuevo producto</button>
          </div>
        </div>
        <p className="mb-2 text-xs italic text-brand-muted">
          Doble clic sobre una fila para editar la ficha. <b className="text-emerald-300">Solo los productos en estado "Activo" aparecen en la lista de precios y se pueden vender.</b>
        </p>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-brand-muted">
              <tr>
                <th className="px-3 py-3 text-left">Foto</th>
                <th className="px-3 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-left">Categoría</th>
                <th className="px-3 py-3 text-right">Costo calc.</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-right">Margen</th>
                <th className="px-3 py-3 text-left">Áreas</th>
                <th className="px-3 py-3 text-left">Auditoría</th>
                <th className="px-3 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((p) => {
                const margen = p.price ? Math.round((p.price - p.cost) / p.price * 100) : 0;
                const lc = lifecycleOf(p);
                const areas = p.areas || [];
                return (
                  <tr key={p.id} className="cursor-pointer table-row border-b border-white/5" onDoubleClick={() => openEdit(p)} title="Doble clic para editar ficha">
                    <td className="px-3 py-3"><div className="product-photo grid h-10 w-10 place-items-center rounded text-2xl">{p.photo || '📦'}</div></td>
                    <td className="px-3 py-3 font-medium text-white">{p.name}<div className="font-mono text-[11px] text-brand-muted">{p.sku}</div></td>
                    <td className="px-3 py-3"><span className="badge-gold rounded px-2 py-0.5 text-[11px]">{p.category || '—'}</span></td>
                    <td className="px-3 py-3 text-right text-brand-muted">{fmtCOP(p.cost)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-brand-gold-light">{fmtCOP(p.price)}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${margen > 30 ? 'text-emerald-400' : margen > 15 ? 'text-amber-400' : 'text-red-400'}`}>{margen}%</td>
                    <td className="px-3 py-3 text-[11px] text-brand-muted">
                      {areas.slice(0, 3).map((a) => <span key={a} className="badge-gold mr-1 rounded px-1 py-0.5 text-[10px]">{a}</span>)}
                      {areas.length > 3 && <span className="text-brand-muted">+{areas.length - 3}</span>}
                    </td>
                    <td className="px-3 py-3">
                      {p.verified
                        ? <span className="badge-ok rounded px-2 py-0.5 text-[10px]">✓ Verif.</span>
                        : p.rejectedByAudit
                          ? <span className="badge-danger rounded px-2 py-0.5 text-[10px]" title={p.rejectedReason || ''}>✗ Rechazado</span>
                          : <span className="badge-warn rounded px-2 py-0.5 text-[10px]">⏳ Pend.</span>}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={lc}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setLifecycle(p, e.target.value)}
                        className="input-field py-1 text-[11px]"
                        style={{ minWidth: 110 }}
                      >
                        {LIFECYCLE_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-xs italic text-brand-muted">Sin resultados para los filtros aplicados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal: Nuevo producto ── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Nuevo producto"
        subtitle="Define la ficha incluyendo los insumos (BOM). Entra en estado ⏳ Auditoría hasta aprobarse."
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveNew}>Enviar a auditoría</button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <FormGrid cols={3}>
              <Field label="Nombre del producto *" className="sm:col-span-2"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="SKU"><Input value={form.sku} placeholder="Auto si vacío" onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} /></Field>
              <Field label="Categoría *">
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="">— Elegir —</option>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Foto (emoji)"><Input value={form.photo} onChange={(e) => setForm((f) => ({ ...f, photo: e.target.value }))} /></Field>
              <Field label="Bodega inicial">
                <Select value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}>
                  {ptWarehouses.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                </Select>
              </Field>
              <Field label="Descripción" className="sm:col-span-3"><textarea rows={2} className="input-field" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
            </FormGrid>

            <FormGrid cols={4}>
              <Field label="Ancho (cm)"><Input type="number" value={form.ancho} onChange={(e) => setForm((f) => ({ ...f, ancho: e.target.value }))} /></Field>
              <Field label="Alto (cm)"><Input type="number" value={form.alto} onChange={(e) => setForm((f) => ({ ...f, alto: e.target.value }))} /></Field>
              <Field label="Profundidad (cm)"><Input type="number" value={form.profundidad} onChange={(e) => setForm((f) => ({ ...f, profundidad: e.target.value }))} /></Field>
              <Field label="Stock mín."><Input type="number" value={form.min} onChange={(e) => setForm((f) => ({ ...f, min: e.target.value }))} /></Field>
            </FormGrid>

            {/* Áreas */}
            <div className="panel-2 rounded p-4">
              <p className="mb-2 text-sm font-semibold gold-title">Áreas de producción por las que pasa</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {PROD_AREAS.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-xs text-white">
                    <input type="checkbox" className="accent-gold-accent" checked={form.areas.includes(a)} onChange={() => toggleArea(a)} />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* BOM */}
            <div className="panel-2 rounded p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold gold-title">Consumo de insumos (BOM)</p>
                <button type="button" className="text-xs text-brand-gold hover:underline" onClick={addBomRow}>+ Agregar insumo</button>
              </div>
              <div className="space-y-2">
                {form.bom.map((row, i) => {
                  // H-104a: subtotal por fila (costo del insumo × cantidad), espejo de la
                  // columna row-cost de Demo6 (addBomRowMaster).
                  const s = supplies.find((x) => x.id === row.supplyId);
                  const sub = s ? (Number(s.cost) || 0) * (Number(row.qty) || 0) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select value={row.supplyId} onChange={(e) => setBomRow(i, 'supplyId', e.target.value)} className="input-field flex-1 py-1 text-xs">
                        <option value="">— insumo —</option>
                        {supplies.map((sp) => <option key={sp.id} value={sp.id}>{sp.name} ({fmtCOP(sp.cost)}/{sp.unitOut || sp.unit})</option>)}
                      </select>
                      <input type="number" min="0" step="0.1" value={row.qty} onChange={(e) => setBomRow(i, 'qty', e.target.value)} placeholder="cant." className="input-field w-20 py-1 text-xs" />
                      <span className="w-24 text-right text-xs tabular-nums text-brand-muted" title="Subtotal (costo × cantidad)">{sub > 0 ? fmtCOP(sub) : '—'}</span>
                      <button type="button" className="text-red-300 hover:text-red-200" onClick={() => delBomRow(i)}>×</button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between border-t border-brand-border pt-3">
                <span className="text-xs text-brand-muted">Costo estimado (suma insumos)</span>
                <span className="text-lg font-bold text-brand-gold">{fmtCOP(formBomCost)}</span>
              </div>
            </div>

            <FormGrid cols={3}>
              <Field label="Costo final *"><Input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value, costTouched: true }))} /></Field>
              <Field label="Precio venta *"><Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></Field>
              <Field label="Margen"><div className="input-field text-center font-bold text-brand-gold">{formMargin(form)}%</div></Field>
            </FormGrid>
            <p className="text-xs text-brand-muted">💡 Sugerencia BOM: {fmtCOP(formBomCost)} — puedes ajustar el costo final manualmente.</p>
          </div>
        )}
      </Modal>

      {/* ── Modal: Editar ficha (master card) ── */}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        overline="Master card · Producto"
        title={edit ? edit.name : ''}
        subtitle={edit ? `${edit.sku} · ${edit.verified ? '✓ Activo' : '⏳ Auditoría'}` : ''}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            <button
              className={edit?.verified ? 'btn-outline' : 'btn-gold'}
              onClick={toggleEditVerified}
            >
              {edit?.verified ? '⏳ Enviar a auditoría' : '✓ Marcar verificado'}
            </button>
            <div className="flex gap-3">
              <button className="btn-outline" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn-gold" onClick={saveEdit}>💾 Guardar cambios</button>
            </div>
          </div>
        }
      >
        {edit && (
          <div className="space-y-4">
            <FormGrid cols={3}>
              <Field label="Nombre *" className="sm:col-span-2"><Input value={edit.name} onChange={(e) => setEdit((f) => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="SKU"><Input value={edit.sku || ''} onChange={(e) => setEdit((f) => ({ ...f, sku: e.target.value }))} /></Field>
              <Field label="Categoría">
                <Select value={edit.category} onChange={(e) => setEdit((f) => ({ ...f, category: e.target.value }))}>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Foto (emoji)"><Input value={edit.photo || '📦'} onChange={(e) => setEdit((f) => ({ ...f, photo: e.target.value }))} /></Field>
              <Field label="Bodega">
                <Select value={edit.warehouseId} onChange={(e) => setEdit((f) => ({ ...f, warehouseId: e.target.value }))}>
                  {ptWarehouses.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                </Select>
              </Field>
              <Field label="Descripción" className="sm:col-span-3"><textarea rows={2} className="input-field" value={edit.description || ''} onChange={(e) => setEdit((f) => ({ ...f, description: e.target.value }))} /></Field>
            </FormGrid>

            <FormGrid cols={5}>
              <Field label="Ancho (cm)"><Input type="number" value={edit.ancho} onChange={(e) => setEdit((f) => ({ ...f, ancho: e.target.value }))} /></Field>
              <Field label="Alto (cm)"><Input type="number" value={edit.alto} onChange={(e) => setEdit((f) => ({ ...f, alto: e.target.value }))} /></Field>
              <Field label="Profund. (cm)"><Input type="number" value={edit.profundidad} onChange={(e) => setEdit((f) => ({ ...f, profundidad: e.target.value }))} /></Field>
              <Field label="Stock"><Input type="number" value={edit.stock || 0} onChange={(e) => setEdit((f) => ({ ...f, stock: e.target.value }))} /></Field>
              <Field label="Stock mín."><Input type="number" value={edit.min || 0} onChange={(e) => setEdit((f) => ({ ...f, min: e.target.value }))} /></Field>
            </FormGrid>

            <div className="panel-2 rounded p-4">
              <p className="mb-2 text-sm font-semibold gold-title">Áreas de producción</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {PROD_AREAS.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-xs text-white">
                    <input type="checkbox" className="accent-gold-accent" checked={edit.areas.includes(a)} onChange={() => toggleEditArea(a)} />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* BOM (mismo patrón que el modal Nuevo) */}
            <div className="panel-2 rounded p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold gold-title">Consumo de insumos (BOM)</p>
                <button type="button" className="text-xs text-brand-gold hover:underline" onClick={addEditBomRow}>+ Agregar insumo</button>
              </div>
              <div className="space-y-2">
                {edit.bom.map((row, i) => {
                  const s = supplies.find((x) => x.id === row.supplyId);
                  const sub = s ? (Number(s.cost) || 0) * (Number(row.qty) || 0) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select value={row.supplyId} onChange={(e) => setEditBomRow(i, 'supplyId', e.target.value)} className="input-field flex-1 py-1 text-xs">
                        <option value="">— insumo —</option>
                        {supplies.map((sp) => <option key={sp.id} value={sp.id}>{sp.name} ({fmtCOP(sp.cost)}/{sp.unitOut || sp.unit})</option>)}
                      </select>
                      <input type="number" min="0" step="0.1" value={row.qty} onChange={(e) => setEditBomRow(i, 'qty', e.target.value)} placeholder="cant." className="input-field w-20 py-1 text-xs" />
                      <span className="w-24 text-right text-xs tabular-nums text-brand-muted" title="Subtotal (costo × cantidad)">{sub > 0 ? fmtCOP(sub) : '—'}</span>
                      <button type="button" className="text-red-300 hover:text-red-200" onClick={() => delEditBomRow(i)}>×</button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between border-t border-brand-border pt-3">
                <span className="text-xs text-brand-muted">Costo calculado (suma insumos)</span>
                <span className="text-lg font-bold text-brand-gold">{fmtCOP(bomCost(edit.bom))}</span>
              </div>
            </div>

            <FormGrid cols={3}>
              <Field label="Costo final *"><Input type="number" value={edit.cost || 0} onChange={(e) => setEdit((f) => ({ ...f, cost: e.target.value, costTouched: true }))} /></Field>
              <Field label="Precio venta *"><Input type="number" value={edit.price || 0} onChange={(e) => setEdit((f) => ({ ...f, price: e.target.value }))} /></Field>
              <Field label="Margen">
                {(() => {
                  const m = Number(edit.price) > 0 ? Math.round((Number(edit.price) - Number(edit.cost)) / Number(edit.price) * 100) : 0;
                  return <div className={`input-field text-center font-bold ${m > 30 ? 'text-emerald-400' : m > 15 ? 'text-amber-400' : 'text-red-400'}`}>{m}%</div>;
                })()}
              </Field>
            </FormGrid>
          </div>
        )}
      </Modal>
    </div>
  );
}
