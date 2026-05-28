import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Chip } from '../components/ui';
import { fmtCOP, fmtDate, today, addDays } from '../lib/format';
import {
  Tabs,
  SearchBox,
  DataTable,
  EstadoBadge,
  SlidePanel,
  ClearFiltersButton,
} from '../components/widgets';
import Modal from '../components/Modal';
import { Field, Input, MoneyInput, Select, FormGrid } from '../components/form';
import { Combobox } from '../components/Combobox';
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
const ALMACEN_UNITS = ['Unidad', 'Mts', 'Cm', 'Kg', 'Galon', '1/4 Galon', 'Litro', 'Caja', 'Carril', 'Rollo', 'Pie tabla'];

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
    supplyReceipts,
    supplyIssues,
    orders,
    products,
    add,
    nextId,
    setState,
    currentUser,
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
  const [ocForm, setOcForm] = useState(null); // AMP-01: alta de orden de compra
  const [recForm, setRecForm] = useState(null); // AMP-02: recepción de insumos (entrada)
  const [issForm, setIssForm] = useState(null); // AMP-03: salida/devolución de insumos
  const [selSup, setSelSup] = useState(null); // detalle de proveedor (doble clic)
  const [selRec, setSelRec] = useState(null); // detalle de entrada (doble clic)

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
    // convFactor = cuántas unidades de SALIDA salen de 1 unidad de ENTRADA (espejo de Demo6
    // saveSupply: outQty/entryQty). NOTA: el costeo de BOM (Innovación/Auditoría) es cost×qty y
    // NO usa convFactor/unitOut (solo se usan como etiqueta de display), así que esto no altera
    // ningún costo; solo modela bien la unidad de compra vs consumo.
    const entryQty = Number(supplyForm.entryQty) || 1;
    const outQty = Number(supplyForm.outQty) || 1;
    add('supplies', {
      id,
      name: supplyForm.name,
      unit: supplyForm.unit,
      unitOut: supplyForm.unitOut || supplyForm.unit,
      entryQty,
      outQty,
      convFactor: outQty / entryQty,
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
    if (!supForm.address.trim()) return toast('Indica la dirección', 'warn');
    if (!supForm.actividadEconomica.trim()) return toast('Indica la actividad económica', 'warn');
    const id = nextId('SUP', 'sup', 2);
    add('suppliers', { id, ...supForm, pais: supForm.pais || 'Colombia' });
    toast(`Proveedor ${id} creado`, 'ok');
    setSupForm(null);
  }

  // ── AMP-01: alta de Orden de Compra (espejo de openPurchaseOrderForm/savePurchaseOrder de Demo6) ──
  const openOC = () =>
    setOcForm({
      supplierId: suppliers[0]?.id || '',
      date: today(),
      expectedDate: addDays(today(), 15),
      warehouseId: insumoBodegas[0]?.id || '',
      notes: '',
      items: [{ supplyId: '', qty: 0, unit: '', cost: 0 }],
    });
  const setOcItem = (i, k, v) =>
    setOcForm((f) => ({ ...f, items: f.items.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) }));
  // Al elegir insumo: auto-rellena unidad (readonly) y costo unitario (editable).
  const setOcSupply = (i, supplyId) =>
    setOcForm((f) => {
      const s = supplies.find((x) => x.id === supplyId);
      return {
        ...f,
        items: f.items.map((r, idx) =>
          idx === i ? { ...r, supplyId, unit: s?.unit || '', cost: Number(s?.cost) || 0 } : r,
        ),
      };
    });
  const addOcItem = () => setOcForm((f) => ({ ...f, items: [...f.items, { supplyId: '', qty: 0, unit: '', cost: 0 }] }));
  const delOcItem = (i) => setOcForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const ocTotal = ocForm
    ? ocForm.items.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.cost) || 0), 0)
    : 0;

  function saveOC() {
    if (!ocForm.supplierId) return toast('Selecciona el proveedor', 'warn');
    if (!ocForm.warehouseId) return toast('Selecciona la bodega destino', 'warn');
    // Bloquea filas a medio llenar (insumo sin cantidad, o cantidad sin insumo) en vez de
    // filtrarlas en silencio.
    const incompleta = ocForm.items.some((it) => (!!it.supplyId) !== (Number(it.qty) > 0));
    if (incompleta) return toast('Completá o quitá el ítem incompleto', 'warn');
    const validItems = ocForm.items.filter((it) => it.supplyId && Number(it.qty) > 0);
    if (!validItems.length) return toast('Agrega al menos un ítem con insumo y cantidad', 'warn');
    const id = nextId('OC', 'oc', 0); // continúa después de OC-3003 del seed → OC-3004
    const sup = suppliers.find((s) => s.id === ocForm.supplierId);
    const items = validItems.map((it) => {
      const s = supplies.find((x) => x.id === it.supplyId);
      return { supplyId: it.supplyId, qty: Number(it.qty), unit: it.unit || s?.unit || '', cost: Number(it.cost) || 0, received: 0, status: 'pendiente' };
    });
    const total = items.reduce((a, it) => a + it.qty * it.cost, 0);
    add('purchaseOrders', {
      id, supplierId: ocForm.supplierId, supplier: sup?.name || '', date: ocForm.date, expectedDate: ocForm.expectedDate,
      warehouseId: ocForm.warehouseId, estado: 'abierta', total, createdBy: currentUser?.name || 'Almacén',
      notes: ocForm.notes, items,
    });
    toast(`Orden de compra ${id} creada`, 'ok');
    setOcForm(null);
  }

  // ── AMP-02: recepción de insumos contra OC (espejo de openSupplyReceiptForm/saveSupplyReceipt) ──
  const openOCs = purchaseOrders.filter((o) => !['cerrada', 'cancelada'].includes(o.estado));
  const openReceipt = () =>
    setRecForm({ purchaseOrderId: '', supplierId: '', remision: '', date: today(), warehouseId: insumoBodegas[0]?.id || '', photo: '', closePartial: false, items: [] });
  // Al elegir OC: carga sus ítems con saldo (qty - received); precarga la cantidad a recibir con el saldo.
  const onSelectOC = (ocId) => {
    const oc = purchaseOrders.find((o) => o.id === ocId);
    if (!oc) return setRecForm((f) => ({ ...f, purchaseOrderId: '', items: [] }));
    const items = (oc.items || []).map((it) => {
      const s = supplies.find((x) => x.id === it.supplyId);
      const saldo = (Number(it.qty) || 0) - (Number(it.received) || 0);
      return { supplyId: it.supplyId, unit: it.unit || s?.unit || '', cost: Number(it.cost) || 0, qty: saldo > 0 ? saldo : 0, saldo };
    });
    setRecForm((f) => ({ ...f, purchaseOrderId: ocId, supplierId: oc.supplierId, warehouseId: oc.warehouseId || f.warehouseId, items }));
  };
  const setRecItem = (i, k, v) =>
    setRecForm((f) => ({ ...f, items: f.items.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) }));
  const recTotal = recForm
    ? recForm.items.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.cost) || 0), 0)
    : 0;

  function saveReceipt() {
    if (!recForm.purchaseOrderId) return toast('Selecciona la Orden de Compra', 'warn');
    if (!recForm.photo?.trim()) return toast('Adjunta la foto de la remisión', 'warn');
    const recItems = recForm.items
      .filter((it) => Number(it.qty) > 0)
      .map((it) => ({ supplyId: it.supplyId, qty: Number(it.qty), cost: Number(it.cost) || 0, unit: it.unit || '' }));
    if (!recItems.length) return toast('Agrega al menos un ítem con cantidad > 0', 'warn');
    const id = nextId('REC', 'rcp', 3); // REC-001
    const date = recForm.date || today();
    const by = currentUser?.name || 'Almacén';
    const closePartial = recForm.closePartial;
    const ocId = recForm.purchaseOrderId;
    const warehouseId = recForm.warehouseId;
    const remision = recForm.remision;
    const photo = recForm.photo;
    setState((s) => {
      const oc = (s.purchaseOrders || []).find((o) => o.id === ocId);
      if (!oc) return s;
      const qtyBySupply = {};
      const costBySupply = {};
      recItems.forEach((it) => {
        qtyBySupply[it.supplyId] = (qtyBySupply[it.supplyId] || 0) + it.qty;
        if (it.cost > 0) costBySupply[it.supplyId] = it.cost;
      });
      // Insumos: sube stock + actualiza costo "última entrada" si difiere.
      const supplies2 = s.supplies.map((sup) => {
        const addQty = qtyBySupply[sup.id];
        if (!addQty) return sup;
        const next = { ...sup, stock: (sup.stock || 0) + addQty };
        const newCost = costBySupply[sup.id];
        if (newCost != null && newCost !== sup.cost) {
          next.cost = newCost; next.lastCostUpdate = date; next.lastCostFromReceipt = id;
        } else if (newCost != null) {
          next.lastCostUpdate = date;
        }
        return next;
      });
      // OC: avanza received/status por ítem y recalcula estado.
      const newItems = (oc.items || []).map((x) => {
        const addQty = qtyBySupply[x.supplyId];
        if (!addQty) return x;
        const received = (x.received || 0) + addQty;
        const status = received >= x.qty ? 'completo' : received > 0 ? 'parcial' : 'pendiente';
        return { ...x, received, status };
      });
      const allComplete = newItems.every((x) => (x.received || 0) >= x.qty);
      const estado = allComplete ? 'cerrada' : closePartial ? 'cerrada' : 'parcial';
      const purchaseOrders2 = s.purchaseOrders.map((o) => (o.id === oc.id ? { ...o, items: newItems, estado } : o));
      const receipt = {
        id, purchaseOrderId: oc.id, supplierId: oc.supplierId, date, remision,
        warehouseId, photo: { filename: photo }, items: recItems, registeredBy: by,
      };
      return { ...s, supplies: supplies2, purchaseOrders: purchaseOrders2, supplyReceipts: [receipt, ...(s.supplyReceipts || [])] };
    });
    toast(`Entrada ${id} registrada`, 'ok');
    setRecForm(null);
  }

  // ── AMP-03: salida/devolución de insumos (espejo de openSupplyIssueForm/rebuildIssueBOM/saveSupplyIssue) ──
  // OPs candidatas para consumo: verificadas, no stock, no terminales (espejo de renderIssueOpList:2569).
  const issOPs = orders.filter(
    (o) => o.verified && o.tipo !== 'stock' && !['entregado', 'cancelado', 'op_cerrada', 'despachado'].includes(o.estado),
  );
  // Recalcula los ítems automáticos del BOM (Σ bom.qty × order.qty por insumo) y conserva los manuales.
  const rebuildIssItems = (orderIds, manualItems) => {
    const agg = {};
    orderIds.forEach((id) => {
      const o = orders.find((x) => x.id === id);
      const p = o && products.find((x) => x.id === o.productId);
      (p?.bom || []).forEach((b) => {
        agg[b.supplyId] = (agg[b.supplyId] || 0) + (Number(b.qty) || 0) * (Number(o.qty) || 1);
      });
    });
    const autoItems = Object.entries(agg).map(([supplyId, qty]) => {
      const s = supplies.find((x) => x.id === supplyId);
      return { supplyId, qty, unit: s?.unitOut || s?.unit || '', auto: true };
    });
    return [...autoItems, ...manualItems];
  };
  const openIssue = () =>
    setIssForm({ type: 'salida', date: today(), warehouseId: insumoBodegas[0]?.id || '', orderIds: [], search: '', items: [] });
  const toggleIssOP = (id) =>
    setIssForm((f) => {
      const orderIds = f.orderIds.includes(id) ? f.orderIds.filter((x) => x !== id) : [...f.orderIds, id];
      return { ...f, orderIds, items: rebuildIssItems(orderIds, f.items.filter((it) => !it.auto)) };
    });
  const setIssItem = (i, k, v) =>
    setIssForm((f) => ({
      ...f,
      items: f.items.map((r, idx) => {
        if (idx !== i) return r;
        if (k === 'supplyId') {
          const s = supplies.find((x) => x.id === v);
          // Al cambiar el insumo en una fila auto, se vuelve manual para que el cambio
          // sobreviva a un re-toggle de OPs (que reconstruye solo las filas auto).
          return { ...r, supplyId: v, unit: s?.unitOut || s?.unit || '', auto: false };
        }
        return { ...r, [k]: v };
      }),
    }));
  const addIssItem = () => setIssForm((f) => ({ ...f, items: [...f.items, { supplyId: '', qty: '', unit: '', auto: false }] }));
  const delIssItem = (i) => setIssForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const supplyCost = (id) => Number(supplies.find((s) => s.id === id)?.cost) || 0;
  const issTotal = issForm
    ? issForm.items.reduce((a, it) => a + (Number(it.qty) || 0) * supplyCost(it.supplyId), 0)
    : 0;

  function saveIssue() {
    // Bloquea filas a medio llenar (insumo sin cantidad, o cantidad sin insumo).
    const incompleta = issForm.items.some((it) => (!!it.supplyId) !== (Number(it.qty) > 0));
    if (incompleta) return toast('Completá o quitá el ítem incompleto', 'warn');
    const items = issForm.items
      .filter((it) => it.supplyId && Number(it.qty) > 0)
      .map((it) => ({ supplyId: it.supplyId, qty: Number(it.qty), unit: it.unit || '' }));
    if (!items.length) return toast('Agrega al menos un ítem con cantidad > 0', 'warn');
    if (issForm.type === 'salida') {
      for (const it of items) {
        const ins = supplies.find((s) => s.id === it.supplyId);
        if (!ins || (ins.stock || 0) < it.qty) return toast(`Stock insuficiente: ${ins?.name || it.supplyId}`, 'error');
      }
    }
    const id = nextId('SAL', 'iss', 3); // SAL-001
    const { type, warehouseId, orderIds } = issForm;
    const date = issForm.date || today();
    const by = currentUser?.name || 'Almacén';
    setState((s) => {
      const delta = {};
      items.forEach((it) => { delta[it.supplyId] = (delta[it.supplyId] || 0) + (type === 'devolucion' ? it.qty : -it.qty); });
      const supplies2 = s.supplies.map((sup) => (delta[sup.id] != null ? { ...sup, stock: (sup.stock || 0) + delta[sup.id] } : sup));
      const issue = { id, type, date, warehouseId, orderIds, items, registeredBy: by };
      return { ...s, supplies: supplies2, supplyIssues: [issue, ...(s.supplyIssues || [])] };
    });
    toast(`${type === 'devolucion' ? 'Devolución' : 'Salida'} ${id} registrada`, 'ok');
    setIssForm(null);
  }

  const hasInsFilters = !!(insSearch || insCat || bodega);
  const hasOCFilters = !!(ocSearch || ocEstado || ocSupplier);
  const hasProvFilters = !!(provSearch || provCat);

  const supplyCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-muted">{r.id}</span> },
    {
      key: 'name',
      label: 'Nombre',
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
    { key: 'unit', label: 'U. entrada', render: (r) => <span className="text-muted">{r.unit}</span> },
    { key: 'unitOut', label: 'U. salida', render: (r) => <span className="text-muted">{r.unitOut || r.unit}</span> },
    { key: 'conv', label: 'Conv.', align: 'right', render: (r) => <span className="text-muted">{r.convFactor || 1}</span> },
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
          { id: 'entradas', label: '📥 Entradas' },
          { id: 'salidas', label: '📤 Salidas' },
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
                    entryQty: 1,
                    unit: 'Unidad',
                    outQty: 1,
                    unitOut: 'Unidad',
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
                    pais: 'Colombia',
                  })
                }
              >
                + Proveedor
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fProveedores.map((s) => {
              const ocCount = purchaseOrders.filter((o) => o.supplierId === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelSup(s)}
                  className="panel p-4 text-left transition hover:border-gold-accent"
                  title="Clic para ver el detalle del proveedor"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{s.name}</p>
                      <p className="font-mono text-[11px] text-muted">{s.id}</p>
                    </div>
                    <Chip variant="gold">{s.category}</Chip>
                  </div>
                  <p className="mt-2 text-xs text-muted">👤 {s.contact || '—'} · {s.phone || ''}</p>
                  <p className="text-xs text-muted">✉ {s.email || '—'}</p>
                  <p className="mt-1 text-xs text-muted">📍 {s.city || '—'} · {s.address || ''}</p>
                  <div className="mt-3 border-t border-white/10 pt-2 text-[11px] text-muted">
                    📄 {ocCount} OC(s) enviada(s)
                  </div>
                </button>
              );
            })}
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
              <button className="btn-gold" onClick={openOC}>+ Nueva orden de compra</button>
            </div>
          </div>
          <DataTable columns={ocCols} rows={fOC} getKey={(r) => r.id} onRowClick={setSelOC} />
        </>
      )}

      {/* TAB: ENTRADAS (AMP-02 · recepciones de insumo contra OC) */}
      {tab === 'entradas' && (
        <>
          <div className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">
                Recepciones de insumo asociadas a una OC. Las entregas parciales mantienen la OC abierta.
                <b className="text-amber-300"> La foto de remisión es obligatoria.</b>
              </span>
              <span className="ml-auto text-sm text-muted">{(supplyReceipts || []).length} entradas</span>
              <button className="btn-gold" onClick={openReceipt}>+ Registrar entrada</button>
            </div>
          </div>
          <div className="panel overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Entrada</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">OC</th>
                  <th className="px-3 py-2">Proveedor</th>
                  <th className="px-3 py-2">Insumos</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Remisión</th>
                  <th className="px-3 py-2">Foto</th>
                  <th className="px-3 py-2">Por</th>
                </tr>
              </thead>
              <tbody>
                {(supplyReceipts || []).map((r) => {
                  const total = (r.items || []).reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.cost) || 0), 0);
                  return (
                    <tr key={r.id} className="cursor-pointer border-b border-white/5 hover:bg-white/5" onDoubleClick={() => setSelRec(r)} title="Doble clic para ver el detalle">

                      <td className="px-3 py-2 font-mono text-xs text-gold-accent">{r.id}</td>
                      <td className="px-3 py-2 text-muted">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gold-accent">{r.purchaseOrderId || '—'}</td>
                      <td className="px-3 py-2 text-white">{supName(r.supplierId)}</td>
                      <td className="px-3 py-2 text-xs text-white">
                        {(r.items || []).map((it) => `${supplyName(it.supplyId)} ×${it.qty} ${it.unit || ''}`).join(', ')}
                      </td>
                      <td className="px-3 py-2 text-right text-gold-accent">{fmtCOP(total)}</td>
                      <td className="px-3 py-2 text-muted">{r.remision || '—'}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.photo?.filename
                          ? <span className="text-emerald-300">📸 {r.photo.filename}</span>
                          : <span className="text-red-400">✗ sin foto</span>}
                      </td>
                      <td className="px-3 py-2 text-muted">{r.registeredBy || '—'}</td>
                    </tr>
                  );
                })}
                {(supplyReceipts || []).length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Sin entradas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB: SALIDAS (AMP-03 · consumo a producción / devoluciones) */}
      {tab === 'salidas' && (
        <>
          <div className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">
                Registra salidas de insumos hacia producción (multi-OP con buscador) o devoluciones.
                El BOM se carga automático; la columna de cantidad entregada es manual y muestra
                unidad + costo (última entrada).
              </span>
              <span className="ml-auto text-sm text-muted">{(supplyIssues || []).length} salidas</span>
              <button className="btn-gold" onClick={openIssue}>+ Registrar salida</button>
            </div>
          </div>
          <div className="panel overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Salida</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">OPs</th>
                  <th className="px-3 py-2">Insumos (cant. manual · unidad · costo)</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Por</th>
                </tr>
              </thead>
              <tbody>
                {(supplyIssues || []).map((x) => {
                  const total = (x.items || []).reduce((a, it) => a + (Number(it.qty) || 0) * supplyCost(it.supplyId), 0);
                  return (
                    <tr key={x.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 font-mono text-xs text-gold-accent">{x.id}</td>
                      <td className="px-3 py-2 text-muted">{fmtDate(x.date)}</td>
                      <td className="px-3 py-2">
                        <Chip variant={x.type === 'devolucion' ? 'gold' : 'ok'}>{x.type || 'salida'}</Chip>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gold-accent">{(x.orderIds || []).join(', ') || '—'}</td>
                      {/* Paridad Demo6 renderAlmacenSalidas (~L2228): un item por línea con
                          qty+unidad destacados (Demo6 usa <b>) y costo unitario al final. */}
                      <td className="px-3 py-2 text-xs text-white">
                        <div className="space-y-0.5">
                          {(x.items || []).map((it, i) => {
                            const ins = supplies.find((s) => s.id === it.supplyId);
                            const unit = it.unit || ins?.unitOut || ins?.unit || '';
                            return (
                              <div key={i}>
                                {supplyName(it.supplyId)}
                                {' · '}
                                <strong className="text-white">
                                  {it.qty}
                                  {unit ? ` ${unit}` : ''}
                                </strong>
                                {' · '}
                                <span className="text-muted">{fmtCOP(supplyCost(it.supplyId))}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gold-accent">{fmtCOP(total)}</td>
                      <td className="px-3 py-2 text-muted">{x.registeredBy || '—'}</td>
                    </tr>
                  );
                })}
                {(supplyIssues || []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Sin salidas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
            <button className="btn-gold" onClick={saveSupply}>Crear</button>
          </>
        }
      >
        {supplyForm && (
          <div className="space-y-4">
            <FormGrid cols={1}>
              <Field label="Nombre *"><Input value={supplyForm.name} onChange={(e) => setSupplyForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            </FormGrid>

            {/* Entrada (cómo se compra) */}
            <div className="panel-2 rounded p-3" style={{ borderLeft: '3px solid #C9A961' }}>
              <p className="mb-2 text-xs font-semibold gold-title">📥 ENTRADA (cómo se compra el insumo)</p>
              <FormGrid cols={2}>
                <Field label="Cantidad *"><Input type="number" min="0.0001" step="any" value={supplyForm.entryQty} onChange={(e) => setSupplyForm((f) => ({ ...f, entryQty: e.target.value }))} /></Field>
                <Field label="Unidad de entrada *">
                  <Select value={supplyForm.unit} onChange={(e) => setSupplyForm((f) => ({ ...f, unit: e.target.value }))}>
                    {ALMACEN_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </Select>
                </Field>
              </FormGrid>
            </div>

            {/* Salida (cómo se consume) */}
            <div className="panel-2 rounded p-3" style={{ borderLeft: '3px solid #10b981' }}>
              <p className="mb-2 text-xs font-semibold gold-title">📤 SALIDA (cómo se consume en producción)</p>
              <FormGrid cols={2}>
                <Field label="Cantidad *"><Input type="number" min="0.0001" step="any" value={supplyForm.outQty} onChange={(e) => setSupplyForm((f) => ({ ...f, outQty: e.target.value }))} /></Field>
                <Field label="Unidad de salida *">
                  <Select value={supplyForm.unitOut} onChange={(e) => setSupplyForm((f) => ({ ...f, unitOut: e.target.value }))}>
                    {ALMACEN_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </Select>
                </Field>
              </FormGrid>
              <p className="mt-2 text-[11px] italic text-muted">
                Ej: 1 Caja de grapas → 144 Carriles · 1 Galón → 4 ¼ Galón. Conversión:{' '}
                {(Number(supplyForm.outQty) || 1) / (Number(supplyForm.entryQty) || 1)} {supplyForm.unitOut}/{supplyForm.unit}
              </p>
            </div>

            <FormGrid cols={2}>
              <Field label="Categoría *">
                <Select value={supplyForm.category} onChange={(e) => setSupplyForm((f) => ({ ...f, category: e.target.value }))}>
                  {SUPPLY_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Costo / Unidad *"><MoneyInput value={supplyForm.cost} onChange={(e) => setSupplyForm((f) => ({ ...f, cost: e.target.value }))} /></Field>
              <Field label="Proveedor">
                <Select value={supplyForm.supplierId} onChange={(e) => setSupplyForm((f) => ({ ...f, supplierId: e.target.value }))}>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Bodega *">
                <Select value={supplyForm.warehouseId} onChange={(e) => setSupplyForm((f) => ({ ...f, warehouseId: e.target.value }))}>
                  {insumoBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                </Select>
              </Field>
              <Field label="Stock"><Input type="number" value={supplyForm.stock} onChange={(e) => setSupplyForm((f) => ({ ...f, stock: e.target.value }))} /></Field>
              <Field label="Mínimo"><Input type="number" value={supplyForm.min} onChange={(e) => setSupplyForm((f) => ({ ...f, min: e.target.value }))} /></Field>
            </FormGrid>
          </div>
        )}
      </Modal>

      <Modal
        open={!!supForm}
        onClose={() => setSupForm(null)}
        title="Nuevo proveedor"
        footer={
          <>
            <button className="btn-outline" onClick={() => setSupForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveSupplier}>Crear</button>
          </>
        }
      >
        {supForm && (
          <FormGrid cols={2}>
            <Field label="Nombre *" className="sm:col-span-2"><Input value={supForm.name} onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="NIT/RUT"><Input value={supForm.nit} onChange={(e) => setSupForm((f) => ({ ...f, nit: e.target.value }))} /></Field>
            <Field label="Categoría">
              <Select value={supForm.category} onChange={(e) => setSupForm((f) => ({ ...f, category: e.target.value }))}>
                {SUPPLY_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Contacto"><Input value={supForm.contact} onChange={(e) => setSupForm((f) => ({ ...f, contact: e.target.value }))} /></Field>
            <Field label="Teléfono"><Input value={supForm.phone} onChange={(e) => setSupForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
            <Field label="Correo"><Input value={supForm.email} onChange={(e) => setSupForm((f) => ({ ...f, email: e.target.value }))} /></Field>
            <Field label="Ciudad"><Combobox value={supForm.city} onChange={(e) => setSupForm((f) => ({ ...f, city: e.target.value }))} /></Field>
            <Field label="País *"><Input value={supForm.pais} onChange={(e) => setSupForm((f) => ({ ...f, pais: e.target.value }))} /></Field>
            <Field label="Dirección *"><Input value={supForm.address} onChange={(e) => setSupForm((f) => ({ ...f, address: e.target.value }))} /></Field>
            <Field label="Actividad Económica *" className="sm:col-span-2"><Input value={supForm.actividadEconomica} onChange={(e) => setSupForm((f) => ({ ...f, actividadEconomica: e.target.value }))} placeholder="Ej: Comercio al por mayor de madera" /></Field>
          </FormGrid>
        )}
      </Modal>

      {/* AMP-01: Modal Nueva Orden de Compra */}
      <Modal
        open={!!ocForm}
        onClose={() => setOcForm(null)}
        title="📝 Nueva Orden de Compra"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setOcForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveOC}>Crear OC</button>
          </>
        }
      >
        {ocForm && (
          <div className="space-y-4">
            <FormGrid cols={2}>
              <Field label="Proveedor *" className="sm:col-span-2">
                <Select value={ocForm.supplierId} onChange={(e) => setOcForm((f) => ({ ...f, supplierId: e.target.value }))}>
                  <option value="">— Elegir —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Fecha emisión *"><Input type="date" value={ocForm.date} onChange={(e) => setOcForm((f) => ({ ...f, date: e.target.value }))} /></Field>
              <Field label="Fecha esperada *"><Input type="date" value={ocForm.expectedDate} onChange={(e) => setOcForm((f) => ({ ...f, expectedDate: e.target.value }))} /></Field>
              <Field label="Bodega destino *" className="sm:col-span-2">
                <Select value={ocForm.warehouseId} onChange={(e) => setOcForm((f) => ({ ...f, warehouseId: e.target.value }))}>
                  <option value="">— Elegir —</option>
                  {insumoBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                </Select>
              </Field>
              <Field label="Notas" className="sm:col-span-2"><Input value={ocForm.notes} onChange={(e) => setOcForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Referencia, prioridad, observaciones" /></Field>
            </FormGrid>

            <div className="panel-2 rounded p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold gold-title">Ítems de la orden</p>
                <button type="button" className="text-xs text-gold-accent hover:underline" onClick={addOcItem}>+ Agregar ítem</button>
              </div>
              <div className="space-y-2">
                {ocForm.items.map((it, i) => {
                  const sub = (Number(it.qty) || 0) * (Number(it.cost) || 0);
                  return (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <select value={it.supplyId} onChange={(e) => setOcSupply(i, e.target.value)} className="input-field flex-1 py-1 text-xs" style={{ minWidth: 160 }}>
                        <option value="">— insumo —</option>
                        {supplies.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                      </select>
                      <input value={it.unit} readOnly placeholder="unidad" className="input-field w-20 py-1 text-xs opacity-70" title="Unidad del insumo" />
                      <input type="number" min="0" step="1" value={it.qty} onChange={(e) => setOcItem(i, 'qty', e.target.value)} placeholder="cant." className="input-field w-20 py-1 text-xs" />
                      <MoneyInput value={it.cost} onChange={(e) => setOcItem(i, 'cost', e.target.value)} placeholder="costo" className="w-28 py-1 text-xs" title="Costo unitario" />
                      <span className="w-28 text-right text-xs tabular-nums text-muted" title="Total de línea (cant × costo)">{sub > 0 ? fmtCOP(sub) : '—'}</span>
                      <button type="button" className="text-red-300 hover:text-red-200" onClick={() => delOcItem(i)}>×</button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-muted">Total de la orden</span>
                <span className="text-lg font-bold text-gold-accent">{fmtCOP(ocTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* AMP-02: Modal Entrada de insumos (recepción contra OC) */}
      <Modal
        open={!!recForm}
        onClose={() => setRecForm(null)}
        title="📥 Entrada de insumos"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setRecForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveReceipt}>Registrar entrada</button>
          </>
        }
      >
        {recForm && (
          <div className="space-y-4">
            <FormGrid cols={2}>
              <Field label="Orden de Compra *" className="sm:col-span-2">
                <Select value={recForm.purchaseOrderId} onChange={(e) => onSelectOC(e.target.value)}>
                  <option value="">— Elegir OC abierta/parcial —</option>
                  {openOCs.map((o) => (
                    <option key={o.id} value={o.id}>{o.id} · {o.supplier} · {o.estado}</option>
                  ))}
                </Select>
              </Field>
              <Field label="N° remisión"><Input value={recForm.remision} onChange={(e) => setRecForm((f) => ({ ...f, remision: e.target.value }))} placeholder="REM-12345" /></Field>
              <Field label="Fecha"><Input type="date" value={recForm.date} onChange={(e) => setRecForm((f) => ({ ...f, date: e.target.value }))} /></Field>
              <Field label="Bodega destino">
                <Select value={recForm.warehouseId} onChange={(e) => setRecForm((f) => ({ ...f, warehouseId: e.target.value }))}>
                  {insumoBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                </Select>
              </Field>
              <Field label="Foto de remisión *">
                {recForm.photo ? (
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs text-emerald-300">📸 {recForm.photo}</span>
                    <button type="button" className="text-xs text-red-300 hover:underline" onClick={() => setRecForm((f) => ({ ...f, photo: '' }))}>Quitar</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-outline w-full text-xs"
                    onClick={() => setRecForm((f) => ({ ...f, photo: `remision_${(f.remision || 'SIN-REM').replace(/\s+/g, '-')}_${Date.now().toString(36)}.jpg` }))}
                  >
                    📎 Adjuntar foto
                  </button>
                )}
              </Field>
            </FormGrid>

            <div className="panel-2 rounded p-4">
              <p className="mb-3 text-sm font-semibold gold-title">Ítems a recibir</p>
              {recForm.items.length === 0 ? (
                <p className="text-xs italic text-muted">Selecciona una OC para cargar sus ítems pendientes.</p>
              ) : (
                <div className="space-y-2">
                  {recForm.items.map((it, i) => {
                    const sub = (Number(it.qty) || 0) * (Number(it.cost) || 0);
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <span className="flex-1 text-xs text-white" style={{ minWidth: 140 }}>{supplyName(it.supplyId)}</span>
                        <span className="w-16 text-right text-[11px] text-muted" title="Saldo pendiente">saldo {it.saldo}</span>
                        <input value={it.unit} readOnly className="input-field w-16 py-1 text-xs opacity-70" title="Unidad" />
                        <input type="number" min="0" value={it.qty} onChange={(e) => setRecItem(i, 'qty', e.target.value)} placeholder="recibir" className="input-field w-20 py-1 text-xs" title="Cantidad recibida" />
                        <MoneyInput value={it.cost} onChange={(e) => setRecItem(i, 'cost', e.target.value)} placeholder="costo" className="w-28 py-1 text-xs" title="Costo unitario" />
                        <span className="w-28 text-right text-xs tabular-nums text-muted">{sub > 0 ? fmtCOP(sub) : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <label className="flex items-center gap-2 text-xs text-white">
                  <input type="checkbox" className="accent-gold-accent" checked={recForm.closePartial} onChange={(e) => setRecForm((f) => ({ ...f, closePartial: e.target.checked }))} />
                  Cerrar OC (parcial)
                </label>
                <span className="text-lg font-bold text-gold-accent">{fmtCOP(recTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* AMP-03: Modal Salida / Devolución de insumos */}
      <Modal
        open={!!issForm}
        onClose={() => setIssForm(null)}
        title={issForm?.type === 'devolucion' ? '📤 Devolución de insumos' : '📤 Salida de insumos'}
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setIssForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveIssue}>Registrar</button>
          </>
        }
      >
        {issForm && (
          <div className="space-y-4">
            <FormGrid cols={3}>
              <Field label="Tipo *">
                <Select value={issForm.type} onChange={(e) => setIssForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="salida">Salida a producción</option>
                  <option value="devolucion">Devolución al almacén (+)</option>
                </Select>
              </Field>
              <Field label="Fecha *"><Input type="date" value={issForm.date} onChange={(e) => setIssForm((f) => ({ ...f, date: e.target.value }))} /></Field>
              <Field label="Bodega origen">
                <Select value={issForm.warehouseId} onChange={(e) => setIssForm((f) => ({ ...f, warehouseId: e.target.value }))}>
                  {insumoBodegas.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                </Select>
              </Field>
            </FormGrid>

            {/* Selección de OPs → BOM automático */}
            <div className="panel-2 rounded p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold gold-title">OPs en producción (carga el BOM)</p>
                <input
                  value={issForm.search}
                  onChange={(e) => setIssForm((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Buscar OP / cliente / producto / área…"
                  className="input-field w-64 py-1 text-xs"
                />
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {issOPs
                  .filter((o) => {
                    const q = issForm.search.toLowerCase();
                    if (!q) return true;
                    const pname = products.find((p) => p.id === o.productId)?.name || '';
                    return `${o.id} ${o.clientName || ''} ${pname} ${o.area || ''}`.toLowerCase().includes(q);
                  })
                  .map((o) => {
                    const p = products.find((x) => x.id === o.productId);
                    return (
                      <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs hover:bg-white/5">
                        <input type="checkbox" className="accent-gold-accent" checked={issForm.orderIds.includes(o.id)} onChange={() => toggleIssOP(o.id)} />
                        <span className="font-mono text-gold-accent">{o.id}</span>
                        <span className="text-white">{p?.name || '—'}</span>
                        <span className="text-muted">· {o.clientName || ''} ×{o.qty || 1} · {o.area || '—'}</span>
                      </label>
                    );
                  })}
                {issOPs.length === 0 && <p className="p-2 text-xs italic text-muted">Sin OPs activas.</p>}
              </div>
            </div>

            {/* Ítems (BOM auto + manual) */}
            <div className="panel-2 rounded p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold gold-title">Insumos (BOM auto + editable)</p>
                <button type="button" className="text-xs text-gold-accent hover:underline" onClick={addIssItem}>+ Ítem manual</button>
              </div>
              {issForm.items.length === 0 ? (
                <p className="text-xs italic text-muted">Marca OPs para cargar el BOM, o agrega ítems manuales.</p>
              ) : (
                <div className="space-y-2">
                  {/* Headers — paridad Demo6 grid 12 col (~L2528). */}
                  <div className="grid grid-cols-12 items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted">
                    <div className="col-span-4">Insumo</div>
                    <div className="col-span-2">Cant. manual</div>
                    <div className="col-span-2">Unidad</div>
                    <div className="col-span-2 text-right">Costo unit. (última)</div>
                    <div className="col-span-1 text-right">Subtotal</div>
                    <div className="col-span-1" aria-hidden />
                  </div>
                  {issForm.items.map((it, i) => {
                    const cost = supplyCost(it.supplyId);
                    const sub = (Number(it.qty) || 0) * cost;
                    const ins = supplies.find((s) => s.id === it.supplyId);
                    const stockInsuf =
                      issForm.type === 'salida' && ins && (ins.stock || 0) < (Number(it.qty) || 0);
                    return (
                      <div key={i} className="grid grid-cols-12 items-center gap-2">
                        {/* Insumo — editable siempre (paridad Demo6); badge BOM inline */}
                        <div className="col-span-4 flex items-center gap-1">
                          <select
                            value={it.supplyId}
                            onChange={(e) => setIssItem(i, 'supplyId', e.target.value)}
                            className="input-field flex-1 py-1 text-xs"
                          >
                            <option value="">— insumo —</option>
                            {supplies.map((s) => (
                              <option key={s.id} value={s.id}>{s.name} · stock {s.stock}</option>
                            ))}
                          </select>
                          {it.auto && (
                            <span
                              className="rounded border border-gold-accent/30 bg-gold-accent/10 px-1 text-[9px] font-semibold uppercase text-gold-accent"
                              title="Sugerido por BOM (se desmarca si cambias el insumo)"
                            >
                              BOM
                            </span>
                          )}
                        </div>
                        {/* Cant. manual + ⚠ stock insuficiente */}
                        <div className="col-span-2 flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.qty}
                            onChange={(e) => setIssItem(i, 'qty', e.target.value)}
                            placeholder="0"
                            className="input-field flex-1 py-1 text-xs"
                          />
                          {stockInsuf && (
                            <span
                              className="text-[11px] text-red-400"
                              title={`Stock insuficiente (${ins.stock})`}
                            >
                              ⚠
                            </span>
                          )}
                        </div>
                        {/* Unidad (read-only) */}
                        <input
                          value={it.unit}
                          readOnly
                          className="input-field col-span-2 py-1 text-xs opacity-70"
                          title="Unidad"
                        />
                        {/* Costo unit. (última) */}
                        <span
                          className="col-span-2 text-right text-xs tabular-nums text-muted"
                          title="Costo última entrada"
                        >
                          {fmtCOP(cost)}
                        </span>
                        {/* Subtotal */}
                        <span className="col-span-1 text-right text-xs tabular-nums text-white">
                          {sub > 0 ? fmtCOP(sub) : '—'}
                        </span>
                        {/* Acción (sin confirmación: modal es draft hasta Registrar) */}
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            className="text-red-300 hover:text-red-200"
                            onClick={() => delIssItem(i)}
                            title="Eliminar línea"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-muted">Valor total ({issForm.type})</span>
                <span className="text-lg font-bold text-gold-accent">{fmtCOP(issTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Detalle de proveedor (espejo de openSupplierDetail Demo6:2075) */}
      <SlidePanel
        open={!!selSup}
        onClose={() => setSelSup(null)}
        title={selSup?.name}
        subtitle={selSup ? `${selSup.id} · ${selSup.category || '—'}` : ''}
      >
        {selSup && (() => {
          const ocs = purchaseOrders.filter((o) => o.supplierId === selSup.id).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          const recs = (supplyReceipts || []).filter((r) => r.supplierId === selSup.id).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          const insumosLinkados = supplies.filter((i) => i.supplierId === selSup.id);
          const totalCompras = ocs.reduce((a, o) => a + (Number(o.total) || 0), 0);
          const ocsAbiertas = ocs.filter((o) => o.estado === 'abierta' || o.estado === 'parcial').length;
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['NIT/RUT', selSup.nit], ['Contacto', selSup.contact], ['Teléfono', selSup.phone],
                  ['Correo', selSup.email], ['Ciudad', selSup.city], ['País', selSup.pais],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                    <p className="text-[11px] uppercase text-muted">{k}</p>
                    <p className="mt-0.5 text-white">{v || '—'}</p>
                  </div>
                ))}
                <div className="col-span-2 rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">Actividad económica</p>
                  <p className="mt-0.5 text-white">{selSup.actividadEconomica || '—'}</p>
                </div>
                <div className="col-span-2 rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">Dirección</p>
                  <p className="mt-0.5 text-white">{selSup.address || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="panel-2 rounded p-3"><p className="text-[11px] text-muted">OCs históricas</p><p className="text-lg font-bold text-white">{ocs.length}</p></div>
                <div className="panel-2 rounded p-3"><p className="text-[11px] text-muted">OCs abiertas</p><p className="text-lg font-bold text-amber-300">{ocsAbiertas}</p></div>
                <div className="panel-2 rounded p-3"><p className="text-[11px] text-muted">Total comprado</p><p className="text-lg font-bold text-gold-accent">{fmtCOP(totalCompras)}</p></div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Órdenes de compra ({ocs.length})</p>
                <div className="space-y-1">
                  {ocs.length ? ocs.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded border border-white/5 bg-brand-bg/40 px-3 py-1.5 text-xs">
                      <span className="font-mono text-gold-accent">{o.id}</span>
                      <span className="text-muted">{fmtDate(o.date)}</span>
                      <EstadoBadge value={o.estado} />
                      <span className="text-gold-accent">{fmtCOP(o.total)}</span>
                    </div>
                  )) : <p className="text-xs italic text-muted">Sin OCs</p>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Entradas recibidas ({recs.length})</p>
                <div className="space-y-1">
                  {recs.length ? recs.map((r) => {
                    const tot = (r.items || []).reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.cost) || 0), 0);
                    return (
                      <div key={r.id} className="flex items-center justify-between rounded border border-white/5 bg-brand-bg/40 px-3 py-1.5 text-xs">
                        <span className="font-mono text-gold-accent">{r.id}</span>
                        <span className="text-muted">{fmtDate(r.date)}</span>
                        <span className="text-white">REM {r.remision || '—'}</span>
                        <span className="text-gold-accent">{fmtCOP(tot)}</span>
                      </div>
                    );
                  }) : <p className="text-xs italic text-muted">Sin entradas</p>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Insumos suministrados ({insumosLinkados.length})</p>
                <div className="space-y-1">
                  {insumosLinkados.length ? insumosLinkados.map((i) => (
                    <div key={i.id} className="flex items-center justify-between rounded border border-white/5 bg-brand-bg/40 px-3 py-1.5 text-xs">
                      <span className="text-white">{i.name}</span>
                      <span className="text-muted">{i.category}</span>
                      <span className="text-gold-accent">{fmtCOP(i.cost)}/{i.unit || ''}</span>
                    </div>
                  )) : <p className="text-xs italic text-muted">Sin insumos asociados</p>}
                </div>
              </div>
            </div>
          );
        })()}
      </SlidePanel>

      {/* Detalle de entrada (espejo de openReceiptDetail Demo6:2139) */}
      <SlidePanel
        open={!!selRec}
        onClose={() => setSelRec(null)}
        title={selRec?.id}
        subtitle={selRec ? `Entrada · ${supName(selRec.supplierId)}` : ''}
      >
        {selRec && (() => {
          const oc = purchaseOrders.find((o) => o.id === selRec.purchaseOrderId);
          const total = (selRec.items || []).reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.cost) || 0), 0);
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Fecha', fmtDate(selRec.date)], ['N° remisión', selRec.remision || '—'],
                  ['Bodega', wName(selRec.warehouseId)], ['Registró', selRec.registeredBy || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                    <p className="text-[11px] uppercase text-muted">{k}</p>
                    <p className="mt-0.5 text-white">{v}</p>
                  </div>
                ))}
              </div>
              {oc && (
                <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3" style={{ borderLeft: '3px solid #C9A961' }}>
                  <p className="text-[11px] uppercase text-gold-accent">🔗 Orden de Compra vinculada</p>
                  <p className="mt-0.5 text-white">{oc.id} · {oc.supplier || ''}</p>
                  <p className="text-[10px] text-muted">Estado OC: {oc.estado} · Total OC: {fmtCOP(oc.total)}</p>
                </div>
              )}
              <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase text-muted">Foto remisión</p>
                {selRec.photo?.filename
                  ? <p className="mt-0.5 text-xs text-emerald-300">📸 {selRec.photo.filename}</p>
                  : <p className="mt-0.5 text-xs text-red-400">✗ Sin foto de remisión</p>}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Ítems recibidos ({(selRec.items || []).length})</p>
                <div className="space-y-1">
                  {(selRec.items || []).map((it, i) => (
                    <div key={i} className="flex items-center justify-between rounded border border-white/5 bg-brand-bg/40 px-3 py-1.5 text-xs">
                      <span className="text-white">{supplyName(it.supplyId)}</span>
                      <span className="text-muted">{it.qty} {it.unit || ''}</span>
                      <span className="text-gold-accent">{fmtCOP((Number(it.qty) || 0) * (Number(it.cost) || 0))}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm">
                  <span className="text-muted">Total entrada</span>
                  <span className="font-bold text-gold-accent">{fmtCOP(total)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </SlidePanel>
    </div>
  );
}
