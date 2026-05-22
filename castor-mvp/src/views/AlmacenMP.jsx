import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge, Chip } from '../components/ui';
import { fmtCOP, fmtDate } from '../lib/format';
import {
  Tabs,
  Toolbar,
  SearchBox,
  DataTable,
  EstadoBadge,
  SlidePanel,
  ClearFiltersButton,
} from '../components/widgets';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';
import {
  IconBox,
  IconDashboard,
  IconUsers,
  IconDoc,
  IconBank,
  IconShield,
} from '../components/icons';

const SUPPLY_CATS = ['Madera', 'Telas', 'Hierro', 'Espuma', 'Pintura', 'Insumos'];

// ─────────────────────────────────────────────────────────────────────────────
// Almacén · Bodegas (materia prima) — espejo de renderAlmacen() del HTML
// KPIs + tarjetas de bodegas MP (Todas, Insumos 1, Insumos 2) con SKUs,
// unidades, valor, críticos + tabs (insumos/proveedores/OC/movimientos).
// ─────────────────────────────────────────────────────────────────────────────
export default function AlmacenMP() {
  const {
    supplies,
    suppliers,
    purchaseOrders,
    stockMoves,
    warehouses,
    add,
    nextId,
  } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('insumos');
  const [bodega, setBodega] = useState('');
  const [insSearch, setInsSearch] = useState('');
  const [insCat, setInsCat] = useState('');
  const [ocSearch, setOcSearch] = useState('');
  const [ocEstado, setOcEstado] = useState('');
  const [ocSupplier, setOcSupplier] = useState('');
  const [provSearch, setProvSearch] = useState('');
  const [provCat, setProvCat] = useState('');
  const [selOC, setSelOC] = useState(null);
  const [supplyForm, setSupplyForm] = useState(null);
  const [supForm, setSupForm] = useState(null);

  const insumoBodegas = warehouses.filter((w) => w.tipo === 'insumos');
  const supName = (id) => suppliers.find((s) => s.id === id)?.name || id;
  const supplyName = (id) => supplies.find((s) => s.id === id)?.name || id;
  const wById = (id) => warehouses.find((w) => w.id === id);
  const wName = (id) => wById(id)?.code || id;

  // KPIs superiores: proveedores, insumos, OC abiertas, valor, bajos.
  const kpis = useMemo(
    () => ({
      proveedores: suppliers.length,
      insumos: supplies.length,
      ocAbiertas: purchaseOrders.filter((o) => o.estado === 'abierta' || o.estado === 'parcial')
        .length,
      ocTotales: purchaseOrders.length,
      valor: supplies.reduce((a, s) => a + s.stock * s.cost, 0),
      bajos: supplies.filter((s) => s.stock <= s.min).length,
    }),
    [supplies, suppliers, purchaseOrders],
  );

  // Resumen por bodega de insumos (SKUs, unidades, valor, críticos).
  const summaryByW = useMemo(() => {
    const map = {};
    for (const w of insumoBodegas) {
      const items = supplies.filter((s) => s.warehouseId === w.id);
      const units = items.reduce((a, s) => a + (s.stock || 0), 0);
      const val = items.reduce((a, s) => a + s.stock * s.cost, 0);
      const lows = items.filter((s) => s.stock <= s.min).length;
      map[w.id] = { skus: items.length, units, val, lows };
    }
    return map;
  }, [insumoBodegas, supplies]);

  const totalUnits = supplies.reduce((a, s) => a + (s.stock || 0), 0);

  // Listados filtrados por tab.
  const fSupplies = useMemo(() => {
    const t = insSearch.toLowerCase();
    return supplies.filter((s) => {
      if (bodega && s.warehouseId !== bodega) return false;
      if (insCat && s.category !== insCat) return false;
      if (t && !`${s.name} ${s.id} ${s.category}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [supplies, insSearch, insCat, bodega]);

  const fOC = useMemo(() => {
    const t = ocSearch.toLowerCase();
    return purchaseOrders.filter((o) => {
      if (ocEstado && o.estado !== ocEstado) return false;
      if (ocSupplier && o.supplierId !== ocSupplier && o.supplier !== ocSupplier) return false;
      if (t && !`${o.id} ${o.supplier}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [purchaseOrders, ocSearch, ocEstado, ocSupplier]);

  const fProveedores = useMemo(() => {
    const t = provSearch.toLowerCase();
    return suppliers.filter((s) => {
      if (provCat && s.category !== provCat) return false;
      if (t && !`${s.name} ${s.nit} ${s.contact}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [suppliers, provSearch, provCat]);

  const lowSupplies = supplies.filter((s) => s.stock <= s.min);

  // CRUD básico (mantenido del original).
  function saveSupply() {
    if (!supplyForm.name.trim()) return toast('Indica el nombre', 'warn');
    const id = nextId('IN', 'insumo', 2);
    add('supplies', {
      id,
      name: supplyForm.name,
      unit: supplyForm.unit,
      unitOut: supplyForm.unit,
      convFactor: 1,
      cost: Number(supplyForm.cost) || 0,
      supplierId: supplyForm.supplierId,
      stock: Number(supplyForm.stock) || 0,
      min: Number(supplyForm.min) || 0,
      category: supplyForm.category,
      warehouseId: supplyForm.warehouseId,
    });
    toast(`Insumo ${id} creado`, 'ok');
    setSupplyForm(null);
  }
  function saveSupplier() {
    if (!supForm.name.trim()) return toast('Indica el nombre', 'warn');
    const id = nextId('SUP', 'sup', 2);
    add('suppliers', { id, ...supForm, pais: 'Colombia' });
    toast(`Proveedor ${id} creado`, 'ok');
    setSupForm(null);
  }

  const hasInsFilters = !!(insSearch || insCat || bodega);
  const hasOCFilters = !!(ocSearch || ocEstado || ocSupplier);
  const hasProvFilters = !!(provSearch || provCat);

  const supplyCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-muted">{r.id}</span> },
    {
      key: 'name',
      label: 'Insumo',
      render: (r) => (
        <div>
          <span className="text-white">
            {r.stock <= r.min && <span className="mr-1 text-red-400">⚠</span>}
            {r.name}
          </span>
        </div>
      ),
    },
    { key: 'category', label: 'Categoría', sortValue: (r) => r.category, render: (r) => <Chip variant="gold">{r.category}</Chip> },
    { key: 'unit', label: 'Unidad', render: (r) => <span className="text-muted">{r.unit}</span> },
    { key: 'bod', label: 'Bodega', render: (r) => <span className="text-muted">{wName(r.warehouseId)}</span> },
    { key: 'sup', label: 'Proveedor', render: (r) => <span className="text-muted">{supName(r.supplierId)}</span> },
    { key: 'cost', label: 'Costo', align: 'right', sortValue: (r) => r.cost, render: (r) => <span className="text-white">{fmtCOP(r.cost)}</span> },
    {
      key: 'stock',
      label: 'Stock',
      align: 'right',
      sortValue: (r) => r.stock,
      render: (r) => (
        <span className={r.stock <= r.min ? 'font-bold text-red-300' : 'text-white'}>{r.stock}</span>
      ),
    },
    { key: 'min', label: 'Mín', align: 'right', sortValue: (r) => r.min, render: (r) => <span className="text-muted">{r.min}</span> },
    {
      key: 'estado',
      label: 'Estado',
      render: (r) => (r.stock <= r.min ? <Chip variant="danger">BAJO MÍN.</Chip> : <Chip variant="ok">OK</Chip>),
    },
  ];

  const ocCols = [
    { key: 'id', label: 'OC', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'date', label: 'Fecha', sortValue: (r) => r.date, render: (r) => <span className="text-muted">{fmtDate(r.date)}</span> },
    { key: 'sup', label: 'Proveedor', render: (r) => <span className="text-white">{r.supplier}</span> },
    { key: 'bod', label: 'Bodega', render: (r) => <span className="text-muted">{wName(r.warehouseId)}</span> },
    { key: 'items', label: 'Ítems', align: 'right', sortValue: (r) => r.items?.length, render: (r) => <span className="text-muted">{r.items?.length || 0}</span> },
    { key: 'total', label: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => <span className="text-gold-accent">{fmtCOP(r.total)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  const moveCols = [
    { key: 'id', label: 'Mov', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'type', label: 'Tipo', render: (r) => <Chip variant={r.type === 'entrada' ? 'ok' : r.type === 'traslado' ? 'info' : 'gold'}>{r.type}</Chip> },
    { key: 'item', label: 'Ítem', render: (r) => <span className="text-white">{r.supplyId ? supplyName(r.supplyId) : r.productId}</span> },
    { key: 'qty', label: 'Cant.', align: 'right', render: (r) => <span className="text-white">{r.qty}</span> },
    { key: 'reason', label: 'Motivo', render: (r) => <span className="text-muted">{r.reason}</span> },
    { key: 'by', label: 'Por', render: (r) => <span className="text-muted">{r.by}</span> },
    { key: 'date', label: 'Fecha', sortValue: (r) => r.date, render: (r) => <span className="text-muted">{fmtDate(r.date)}</span> },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs superiores (5) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Proveedores" value={kpis.proveedores} hint="Activos" accent="#C9A961" icon={<IconUsers width={18} height={18} />} />
        <KpiCard label="Insumos" value={kpis.insumos} hint="SKUs materia prima" accent="#10b981" icon={<IconBox width={18} height={18} />} />
        <KpiCard label="OC abiertas" value={kpis.ocAbiertas} hint={`${kpis.ocTotales} totales`} accent="#8b5cf6" icon={<IconDoc width={18} height={18} />} />
        <KpiCard label="Valor insumos" value={fmtCOP(kpis.valor)} hint="A costo" accent="#3b82f6" icon={<IconBank width={18} height={18} />} />
        <KpiCard label="Insumos bajos" value={kpis.bajos} hint={kpis.bajos === 0 ? 'Todo ok' : 'Crítico'} accent={kpis.bajos > 0 ? '#ef4444' : '#10b981'} icon={<IconShield width={18} height={18} />} />
      </div>

      {/* Título bodegas */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-white">🏬 Bodegas de materia prima</span>
        <span className="text-xs text-muted">(únicas bodegas donde viven los insumos · clic para filtrar)</span>
      </div>

      {/* Tarjetas de bodegas MP */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card Todas */}
        <button
          onClick={() => setBodega('')}
          className={`panel p-4 text-left transition hover:border-gold-accent ${
            bodega === '' ? 'border-gold-accent ring-2 ring-gold-accent/30' : ''
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="grid h-10 w-10 place-items-center rounded-lg"
                style={{ background: '#C9A96122', border: '1px solid #C9A96155', color: '#C9A961' }}
              >
                <IconDashboard width={18} height={18} />
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: '#C9A961' }}>Todas</div>
                <div className="text-[11px] text-muted">Ambas bodegas</div>
              </div>
            </div>
            {bodega === '' && (
              <span className="text-[10px] font-bold" style={{ color: '#C9A961' }}>ACTIVO</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="panel-2 rounded p-2">
              <div className="text-[10px] uppercase text-muted">SKUs</div>
              <div className="text-lg font-bold text-white">{supplies.length}</div>
            </div>
            <div className="panel-2 rounded p-2">
              <div className="text-[10px] uppercase text-muted">Unidades</div>
              <div className="text-lg font-bold text-gold-accent">{totalUnits}</div>
            </div>
            <div className="panel-2 col-span-2 rounded p-2">
              <div className="text-[10px] uppercase text-muted">Valor total a costo</div>
              <div className="text-sm font-bold text-gold-accent">{fmtCOP(kpis.valor)}</div>
            </div>
          </div>
        </button>

        {insumoBodegas.map((w) => {
          const s = summaryByW[w.id] || { skus: 0, units: 0, val: 0, lows: 0 };
          const active = bodega === w.id;
          return (
            <button
              key={w.id}
              onClick={() => {
                setBodega(active ? '' : w.id);
                setTab('insumos');
              }}
              className={`panel p-4 text-left transition hover:border-gold-accent ${
                active ? 'ring-2 ring-gold-accent/30' : ''
              }`}
              style={active ? { borderColor: w.color, boxShadow: `0 0 0 2px ${w.color}55` } : undefined}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-lg"
                    style={{ background: `${w.color}22`, border: `1px solid ${w.color}55`, color: w.color }}
                  >
                    <IconBox width={18} height={18} />
                  </div>
                  <div>
                    <div className="text-lg font-bold" style={{ color: w.color }}>{w.code}</div>
                    <div className="text-[11px] text-muted">{w.name} · materia prima</div>
                  </div>
                </div>
                {active && (
                  <span className="text-[10px] font-bold" style={{ color: w.color }}>ACTIVO</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="panel-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">SKUs</div>
                  <div className="text-lg font-bold text-white">{s.skus}</div>
                </div>
                <div className="panel-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">Unidades</div>
                  <div className="text-lg font-bold" style={{ color: w.color }}>{s.units}</div>
                </div>
                <div className="panel-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">Valor</div>
                  <div className="text-sm font-semibold text-gold-accent">{fmtCOP(s.val)}</div>
                </div>
                <div className="panel-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">Críticos</div>
                  <div className={`text-sm font-bold ${s.lows > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {s.lows}
                  </div>
                </div>
              </div>
              <div className="mt-3 truncate text-[11px] text-muted">
                📍 {w.address} · {w.responsable}
              </div>
            </button>
          );
        })}
      </div>

      <Tabs
        tabs={[
          { id: 'insumos', label: '📦 Insumos' },
          { id: 'proveedores', label: '👥 Proveedores' },
          { id: 'oc', label: '📄 Órdenes de Compra' },
          { id: 'movimientos', label: '🔄 Movimientos' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* TAB: INSUMOS */}
      {tab === 'insumos' && (
        <>
          {lowSupplies.length > 0 && (
            <div
              className="panel p-4"
              style={{ borderLeft: '4px solid #ef4444', background: '#2a0e14' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-red-300">⚠ Insumos por debajo del stock mínimo</h3>
                <span className="text-xs text-muted">{lowSupplies.length} crítico(s)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowSupplies.slice(0, 12).map((s) => (
                  <span key={s.id} className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-200">
                    {s.name} · {s.stock}/{s.min} {s.unit}
                  </span>
                ))}
                {lowSupplies.length > 12 && (
                  <span className="text-xs text-muted">y {lowSupplies.length - 12} más…</span>
                )}
              </div>
            </div>
          )}

          <div className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox value={insSearch} onChange={setInsSearch} placeholder="Buscar insumo, ID, categoría…" />
              <select value={insCat} onChange={(e) => setInsCat(e.target.value)} className="input-field w-auto">
                <option value="">Todas las categorías</option>
                {SUPPLY_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={bodega} onChange={(e) => setBodega(e.target.value)} className="input-field w-auto">
                <option value="">Todas las bodegas</option>
                {insumoBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
              </select>
              <ClearFiltersButton
                active={hasInsFilters}
                onClear={() => { setInsSearch(''); setInsCat(''); setBodega(''); }}
              />
              <span className="ml-auto text-sm text-muted">{fSupplies.length} insumos</span>
              <button
                className="btn-gold"
                onClick={() =>
                  setSupplyForm({
                    name: '',
                    unit: 'Unidad',
                    cost: 0,
                    supplierId: suppliers[0]?.id,
                    stock: 0,
                    min: 0,
                    category: 'Madera',
                    warehouseId: insumoBodegas[0]?.id,
                  })
                }
              >
                + Insumo
              </button>
            </div>
          </div>
          <DataTable columns={supplyCols} rows={fSupplies} getKey={(r) => r.id} />
        </>
      )}

      {/* TAB: PROVEEDORES */}
      {tab === 'proveedores' && (
        <>
          <div className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox value={provSearch} onChange={setProvSearch} placeholder="Buscar proveedor, NIT, contacto…" />
              <select value={provCat} onChange={(e) => setProvCat(e.target.value)} className="input-field w-auto">
                <option value="">Todas las categorías</option>
                {SUPPLY_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ClearFiltersButton
                active={hasProvFilters}
                onClear={() => { setProvSearch(''); setProvCat(''); }}
              />
              <span className="ml-auto text-sm text-muted">{fProveedores.length} proveedores</span>
              <button
                className="btn-gold"
                onClick={() =>
                  setSupForm({
                    name: '',
                    nit: '',
                    contact: '',
                    phone: '',
                    email: '',
                    category: 'Madera',
                    city: '',
                    address: '',
                    actividadEconomica: '',
                  })
                }
              >
                + Proveedor
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fProveedores.map((s) => (
              <div key={s.id} className="panel p-4">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-white">{s.name}</p>
                  <Chip variant="gold">{s.category}</Chip>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted">{s.nit}</p>
                <p className="mt-2 text-sm text-muted">{s.contact} · {s.phone}</p>
                <p className="text-xs text-muted">{s.email}</p>
                <p className="mt-1 text-xs text-muted">📍 {s.city} · {s.address}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TAB: ÓRDENES DE COMPRA */}
      {tab === 'oc' && (
        <>
          <div className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox value={ocSearch} onChange={setOcSearch} placeholder="Buscar OC, proveedor…" />
              <select value={ocEstado} onChange={(e) => setOcEstado(e.target.value)} className="input-field w-auto">
                <option value="">Todos los estados</option>
                {['abierta', 'parcial', 'cerrada', 'cancelada'].map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={ocSupplier} onChange={(e) => setOcSupplier(e.target.value)} className="input-field w-auto">
                <option value="">Todos los proveedores</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ClearFiltersButton
                active={hasOCFilters}
                onClear={() => { setOcSearch(''); setOcEstado(''); setOcSupplier(''); }}
              />
              <span className="ml-auto text-sm text-muted">{fOC.length} OC</span>
            </div>
          </div>
          <DataTable columns={ocCols} rows={fOC} getKey={(r) => r.id} onRowClick={setSelOC} />
        </>
      )}

      {/* TAB: MOVIMIENTOS */}
      {tab === 'movimientos' && (
        <DataTable columns={moveCols} rows={stockMoves} getKey={(r) => r.id} />
      )}

      <SlidePanel
        open={!!selOC}
        onClose={() => setSelOC(null)}
        title={selOC?.id}
        subtitle={selOC ? `${selOC.supplier} · ${selOC.estado}` : ''}
      >
        {selOC && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Fecha', fmtDate(selOC.date)],
                ['Esperada', fmtDate(selOC.expectedDate)],
                ['Bodega', wName(selOC.warehouseId)],
                ['Total', fmtCOP(selOC.total)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p>
                  <p className="mt-0.5 text-white">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Items</p>
              <div className="space-y-1.5">
                {selOC.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-bg/40 px-3 py-2 text-sm">
                    <span className="text-white">{supplyName(it.supplyId)}</span>
                    <span className="text-muted">{it.received}/{it.qty} {it.unit}</span>
                    <EstadoBadge value={it.status === 'completo' ? 'confirmado' : it.status} />
                  </div>
                ))}
              </div>
            </div>
            {selOC.notes && <p className="text-sm text-muted">{selOC.notes}</p>}
          </div>
        )}
      </SlidePanel>

      <Modal
        open={!!supplyForm}
        onClose={() => setSupplyForm(null)}
        title="Nuevo insumo"
        footer={
          <>
            <button className="btn-outline" onClick={() => setSupplyForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveSupply}>Guardar</button>
          </>
        }
      >
        {supplyForm && (
          <FormGrid cols={2}>
            <Field label="Nombre" className="sm:col-span-2"><Input value={supplyForm.name} onChange={(e) => setSupplyForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Unidad"><Input value={supplyForm.unit} onChange={(e) => setSupplyForm((f) => ({ ...f, unit: e.target.value }))} /></Field>
            <Field label="Categoría">
              <Select value={supplyForm.category} onChange={(e) => setSupplyForm((f) => ({ ...f, category: e.target.value }))}>
                {SUPPLY_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Costo (COP)"><Input type="number" value={supplyForm.cost} onChange={(e) => setSupplyForm((f) => ({ ...f, cost: e.target.value }))} /></Field>
            <Field label="Proveedor">
              <Select value={supplyForm.supplierId} onChange={(e) => setSupplyForm((f) => ({ ...f, supplierId: e.target.value }))}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Stock"><Input type="number" value={supplyForm.stock} onChange={(e) => setSupplyForm((f) => ({ ...f, stock: e.target.value }))} /></Field>
            <Field label="Mínimo"><Input type="number" value={supplyForm.min} onChange={(e) => setSupplyForm((f) => ({ ...f, min: e.target.value }))} /></Field>
            <Field label="Bodega">
              <Select value={supplyForm.warehouseId} onChange={(e) => setSupplyForm((f) => ({ ...f, warehouseId: e.target.value }))}>
                {insumoBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
              </Select>
            </Field>
          </FormGrid>
        )}
      </Modal>

      <Modal
        open={!!supForm}
        onClose={() => setSupForm(null)}
        title="Nuevo proveedor"
        footer={
          <>
            <button className="btn-outline" onClick={() => setSupForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveSupplier}>Guardar</button>
          </>
        }
      >
        {supForm && (
          <FormGrid cols={2}>
            <Field label="Nombre" className="sm:col-span-2"><Input value={supForm.name} onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="NIT"><Input value={supForm.nit} onChange={(e) => setSupForm((f) => ({ ...f, nit: e.target.value }))} /></Field>
            <Field label="Categoría">
              <Select value={supForm.category} onChange={(e) => setSupForm((f) => ({ ...f, category: e.target.value }))}>
                {SUPPLY_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Contacto"><Input value={supForm.contact} onChange={(e) => setSupForm((f) => ({ ...f, contact: e.target.value }))} /></Field>
            <Field label="Teléfono"><Input value={supForm.phone} onChange={(e) => setSupForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
            <Field label="Email"><Input value={supForm.email} onChange={(e) => setSupForm((f) => ({ ...f, email: e.target.value }))} /></Field>
            <Field label="Ciudad"><Input value={supForm.city} onChange={(e) => setSupForm((f) => ({ ...f, city: e.target.value }))} /></Field>
            <Field label="Dirección" className="sm:col-span-2"><Input value={supForm.address} onChange={(e) => setSupForm((f) => ({ ...f, address: e.target.value }))} /></Field>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
