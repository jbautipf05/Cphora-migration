import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { Field, Input, MoneyInput, Select } from './form';
import { useToast } from './Toast';
import { fmtCOP } from '../lib/format';

// H-035 — Modal "Nueva venta" (réplica de openSaleForm de Demo6:5530).
// Construido por bloques: H-035.1 Cliente · H-035.2 Items dinámicos · H-035.3 Registro de pago.
// La lógica de guardado (resolver/crear cliente, postSale) vive en Ventas vía onSubmit.

const MEDIOS = ['TIENDA', 'LEAD', 'FERIA', 'REMARKETING', 'REFERIDO'];
const PDVS = ['CASTOR 43', 'CASTOR CTG', 'PAGINA WEB', 'GERENCIA'];
const CIERRES = ['PRESENCIAL', 'VIRTUAL'];
const ABONOS = ['DATAFONO', 'TRANSFERENCIA', 'EFECTIVO', 'BOLD'];
const PAY_METHODS = ['Transferencia', 'Tarjeta', 'Efectivo', 'Cheque'];
const SEARCH_FIELDS = [
  { key: 'name', label: 'Nombre' },
  { key: 'phone', label: 'Celular' },
  { key: 'email', label: 'Correo' },
  { key: 'doc', label: 'Documento' },
];
// REG-H035-06 — formato de correo (mismo regex que H-004 en Leads.jsx).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// REG-H035-01 — acabados condicionales por `product.areas` (constantes de Demo6:5521-5523).
const COLOR_MADERA = ['Natural', 'Natural oscuro', 'Natural oscuro Claro', 'Natural oscuro Rojizo', 'Marmoleado', 'Marmoleado Matte (sin brillos)', 'Blanco perlado', 'Champagne', 'Negro', 'Wash beige', 'Otro'];
const COLOR_METAL = ['Negro', 'Plateado', 'Dorado', 'Bronce Damasco', 'Martillado negro'];
const COLOR_TEJIDO = ['Blanco', 'Beige', 'Caramelo', 'Mostaza', 'Amarillo', 'Naranja', 'Rojo', 'Rojo Vino', 'Vino tinto', 'Gris claro', 'Gris Medio', 'Verde militar', 'Azul oscuro', 'Azul metálico', 'Negro', 'Verde aguamarina', 'Azul intenso', 'Verde pastel', 'Coral'];
// Áreas (de Demo6) que disparan cada acabado condicional, solo en modo Producción.
const ACAB_AREAS = ['Preparación y pintura', 'Pintura electrostática', 'Tapicería', 'Tejido'];

const emptyForm = () => ({
  customerId: '',
  custName: '', custDoc: '', custPhone: '', custEmail: '', custCity: '', custAddress: '',
  deliveryAddress: '', medio: '', pdv: '', cierreVenta: '', abonoBancos: '',
  asesor: '', tiempo: 30, docType: 'factura', paid: 50,
  items: [{ productId: '', qty: 1, disc: 0, tipo: 'produccion', comment: '', colorMadera: '', colorMaderaOtro: '', colorMetal: '', telaId: '', colorTejido: '' }],
  // H-036.2: productos propuestos (modo innovación)
  innovItems: [{ name: '', desc: '', qty: 1, price: 0, areas: '', comment: '' }],
  // H-035.3: registro de pago
  payMethod: 'Transferencia', payBankId: '', payReference: '', paySoporte: '',
  payManual: false, payAmount: '',
  // H-036.3: adjuntos obligatorios (innovación)
  innovRefPhoto: '', innovConsentPhoto: '',
});

// REG-H035-02 — buscador de telas con autocompletado (espejo de filterTelaSearch/pickTela
// de Demo6:5893-5908; reusa el patrón ProductPicker de Leads.jsx). Filtra SUPPLIES `Telas`.
function TelaPicker({ telas, value, onChange }) {
  const selected = telas.find((t) => t.id === value);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const t = q.toLowerCase().trim();
    return (t ? telas.filter((x) => `${x.name} ${x.id}`.toLowerCase().includes(t)) : telas).slice(0, 15);
  }, [telas, q]);
  return (
    <div className="relative">
      <input
        className="input-field text-xs"
        placeholder="Escribe el nombre de la tela..."
        value={open ? q : selected?.name || ''}
        onFocus={() => { setOpen(true); setQ(''); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto scrollbar-thin rounded-lg border border-brand-border bg-brand-panel shadow-2xl">
          {results.length === 0 ? (
            <div className="p-2 text-center text-xs italic text-brand-muted">Sin coincidencias</div>
          ) : (
            results.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={() => { onChange(t.id); setOpen(false); setQ(''); }}
                className="flex w-full justify-between gap-2 px-3 py-1.5 text-left text-xs text-brand-muted transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-white">{t.name}</span>
                <span className="text-brand-muted">· {t.id} · {fmtCOP(t.cost)}/{t.unit || 'Mts'}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NuevaVentaModal({ open, onClose, products = [], customers = [], asesores = [], bankAccounts = [], finishedStock = [], warehouses = [], supplies = [], innovation = false, prefill = null, onSubmit }) {
  const [f, setF] = useState(emptyForm());
  const [searchField, setSearchField] = useState('name');
  const [searchQ, setSearchQ] = useState('');
  const [errors, setErrors] = useState({}); // REG-H035-06: errores inline del Bloque Cliente (patrón H-004)
  const toast = useToast();

  // EX-F2-03: al abrir, sembrar el form con la precarga (cotización→venta) o
  // dejarlo vacío. La precarga llega ya en el shape del form (cliente + items),
  // así que basta mergearla sobre emptyForm(). Se siembra solo en la transición
  // de apertura para no pisar la edición del usuario.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setF(prefill ? { ...emptyForm(), ...prefill } : emptyForm());
      setSearchField('name');
      setSearchQ('');
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // REG-H035-06: al editar un campo, limpia su error inline (espejo de Leads.jsx:151-154).
  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  // REG-H035-07: limpieza de errores de ítems. clearAllItemErrs se usa al agregar/quitar filas
  // (los índices se corren); el clear por fila se hace inline en setItem.
  const clearAllItemErrs = () =>
    setErrors((e) => {
      const ks = Object.keys(e).filter((k) => k === 'items' || k.startsWith('item_'));
      if (!ks.some((k) => e[k])) return e;
      const next = { ...e };
      ks.forEach((k) => { next[k] = undefined; });
      return next;
    });
  const setItem = (i, k, v) => {
    setF((p) => ({
      ...p,
      items: p.items.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it, [k]: v };
        // REG-H035-01: al cambiar producto o pasar a Stock, los acabados dejan de aplicar → resetear.
        if (k === 'productId' || (k === 'tipo' && v === 'stock')) {
          next.colorMadera = ''; next.colorMaderaOtro = ''; next.colorMetal = ''; next.telaId = ''; next.colorTejido = '';
        }
        return next;
      }),
    }));
    // REG-H035-07: limpia el error general + los acabados de ESTA fila al editarla.
    setErrors((e) => {
      const ks = ['items', `item_${i}_madera`, `item_${i}_metal`, `item_${i}_tela`, `item_${i}_tejido`];
      if (!ks.some((k) => e[k])) return e;
      const next = { ...e };
      ks.forEach((k) => { next[k] = undefined; });
      return next;
    });
  };
  const addItem = () => {
    setF((p) => ({ ...p, items: [...p.items, { productId: '', qty: 1, disc: 0, tipo: 'produccion', comment: '', colorMadera: '', colorMaderaOtro: '', colorMetal: '', telaId: '', colorTejido: '' }] }));
    clearAllItemErrs();
  };
  const removeItem = (i) => {
    setF((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
    clearAllItemErrs();
  };
  // H-036.2: helpers de productos propuestos
  const setInnovItem = (i, k, v) =>
    setF((p) => ({ ...p, innovItems: p.innovItems.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addInnovItem = () =>
    setF((p) => ({ ...p, innovItems: [...p.innovItems, { name: '', desc: '', qty: 1, price: 0, areas: '', comment: '' }] }));
  const removeInnovItem = (i) => setF((p) => ({ ...p, innovItems: p.innovItems.filter((_, idx) => idx !== i) }));
  // REG-H035-06: render del error inline de un campo (mismo estilo que Leads.jsx H-004).
  const errLine = (k) => errors[k] && <span className="mt-1 block text-xs text-red-400">{errors[k]}</span>;

  // Buscador inteligente: filtra clientes por el campo elegido.
  const results = useMemo(() => {
    const t = searchQ.trim().toLowerCase();
    if (!t) return [];
    return customers
      .filter((c) => String(c[searchField] || '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [customers, searchField, searchQ]);

  const priceOf = (id) => products.find((p) => p.id === id)?.price || 0;
  // REG-H035-04 — disponibilidad de stock por ítem (fiel a onSaleItemProductChange:5828-5833).
  const stockLocations = (productId) =>
    finishedStock.filter((fs) => fs.productId === productId && fs.status === 'disponible' && fs.qty > 0);
  const stockAvail = (productId) => stockLocations(productId).reduce((a, fs) => a + fs.qty, 0);
  // REG-H035-10 — opciones del dropdown de producto: en Stock solo los que tienen disponibilidad
  // (+ "stock: N" en la etiqueta), en Producción todos (espejo de onSaleItemTypeChange:5805-5813).
  // Mantiene visible el producto ya seleccionado aunque quede fuera del filtro de stock.
  const productOptions = (tipo, selectedId) => {
    let list = tipo === 'stock'
      ? products.map((p) => ({ p, avail: stockAvail(p.id) })).filter((x) => x.avail > 0)
      : products.map((p) => ({ p, avail: null }));
    if (selectedId && !list.some((x) => x.p.id === selectedId)) {
      const p = products.find((x) => x.id === selectedId);
      if (p) list = [{ p, avail: tipo === 'stock' ? stockAvail(p.id) : null }, ...list];
    }
    return list;
  };
  const renderStockInfo = (it) => {
    if (it.tipo !== 'stock' || !it.productId) return null;
    const locs = stockLocations(it.productId);
    const avail = locs.reduce((a, fs) => a + fs.qty, 0);
    const qty = Number(it.qty) || 0;
    const badges = locs.map((fs) => {
      const w = warehouses.find((x) => x.id === fs.warehouseId);
      const color = w?.color || '#2A4061';
      return (
        <span
          key={fs.id}
          className="mr-1 mb-1 inline-block rounded px-2 py-0.5"
          style={{ background: `${color}33`, color, border: `1px solid ${color}66` }}
        >
          {w?.code || w?.name || fs.warehouseId}: {fs.qty}
        </span>
      );
    });
    return (
      <div className="mt-2 text-[11px] text-brand-muted">
        {avail >= qty ? (
          <><span className="text-emerald-300">✓ Disponible {avail} uds</span> · Ubicaciones: {badges.length ? badges : '—'}</>
        ) : (
          <><span className="text-red-400">✗ Stock insuficiente (disp: {avail}, solicitado: {qty})</span> · {badges.length ? badges : '—'}</>
        )}
      </div>
    );
  };

  // REG-H035-03 — ruta de proceso en modo Producción (fiel a onSaleItemProductChange:5835).
  const renderRouteInfo = (it) => {
    if (it.tipo !== 'produccion' || !it.productId) return null;
    const areas = products.find((p) => p.id === it.productId)?.areas || [];
    return (
      <div className="mt-2 text-[11px] text-brand-muted">
        <span className="text-amber-300">⚙ Bajo pedido</span> · áreas: {areas.length ? areas.join(' → ') : '—'}
      </div>
    );
  };

  // REG-H035-01/02 — acabados condicionales por `product.areas`, solo en modo Producción
  // (espejo de renderSaleAcabados:5841-5868). Telas = SUPPLIES categoría Telas/Textiles.
  const telas = useMemo(() => supplies.filter((s) => s.category === 'Telas' || s.category === 'Textiles'), [supplies]);
  const renderAcabados = (it, i) => {
    if (it.tipo === 'stock' || !it.productId) return null;
    const product = products.find((p) => p.id === it.productId);
    const areas = product?.areas || [];
    if (!areas.some((a) => ACAB_AREAS.includes(a))) return null;
    return (
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {areas.includes('Preparación y pintura') && (
          <div>
            <span className="label text-[10px]">Color madera *</span>
            <Select value={it.colorMadera} onChange={(e) => setItem(i, 'colorMadera', e.target.value)} className="text-xs">
              <option value="">— elegir —</option>
              {COLOR_MADERA.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {it.colorMadera === 'Otro' && (
              <Input value={it.colorMaderaOtro} onChange={(e) => setItem(i, 'colorMaderaOtro', e.target.value)} placeholder='Especificar "Otro"' className="mt-1 text-xs" />
            )}
            {errLine(`item_${i}_madera`)}
          </div>
        )}
        {areas.includes('Pintura electrostática') && (
          <div>
            <span className="label text-[10px]">Color metal *</span>
            <Select value={it.colorMetal} onChange={(e) => setItem(i, 'colorMetal', e.target.value)} className="text-xs">
              <option value="">— elegir —</option>
              {COLOR_METAL.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {errLine(`item_${i}_metal`)}
          </div>
        )}
        {areas.includes('Tapicería') && (
          <div>
            <span className="label text-[10px]">Tela tapicería * (buscar por nombre)</span>
            <TelaPicker telas={telas} value={it.telaId} onChange={(id) => setItem(i, 'telaId', id)} />
            {errLine(`item_${i}_tela`)}
          </div>
        )}
        {areas.includes('Tejido') && (
          <div>
            <span className="label text-[10px]">Color tejido *</span>
            <Select value={it.colorTejido} onChange={(e) => setItem(i, 'colorTejido', e.target.value)} className="text-xs">
              <option value="">— elegir —</option>
              {COLOR_TEJIDO.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {errLine(`item_${i}_tejido`)}
          </div>
        )}
      </div>
    );
  };
  const itemTotal = (it) => priceOf(it.productId) * (Number(it.qty) || 0) * (1 - (Number(it.disc) || 0) / 100);
  const innovItemTotal = (it) => (Number(it.qty) || 0) * (Number(it.price) || 0);
  // H-035.3 / H-036.2: liquidación (en innovación, los propuestos son producción estimada).
  const stdTotal = f.items.reduce((a, it) => a + itemTotal(it), 0);
  const innovTotal = f.innovItems.reduce((a, it) => a + innovItemTotal(it), 0);
  const total = innovation ? innovTotal : stdTotal;
  const subStock = innovation ? 0 : f.items.filter((it) => it.tipo === 'stock').reduce((a, it) => a + itemTotal(it), 0);
  const subProd = innovation ? innovTotal : f.items.filter((it) => it.tipo === 'produccion').reduce((a, it) => a + itemTotal(it), 0);
  const discTotal = innovation
    ? 0
    : f.items.reduce((a, it) => a + priceOf(it.productId) * (Number(it.qty) || 0) * ((Number(it.disc) || 0) / 100), 0);
  const suggestedPay = Math.round((total * (Number(f.paid) || 0)) / 100);
  const effectivePay = f.payManual ? Number(f.payAmount) || 0 : suggestedPay;

  function selectCustomer(c) {
    setF((p) => ({
      ...p,
      customerId: c.id,
      custName: c.name || '', custDoc: c.doc || '', custPhone: c.phone || '',
      custEmail: c.email || '', custCity: c.city || '', custAddress: c.address || '',
      deliveryAddress: p.deliveryAddress || c.address || '',
    }));
    // REG-H035-06: seleccionar cliente rellena los campos núcleo → limpia sus errores.
    setErrors((e) => ({
      ...e,
      custName: undefined, custDoc: undefined, custPhone: undefined,
      custEmail: undefined, custCity: undefined, custAddress: undefined, deliveryAddress: undefined,
    }));
    setSearchQ('');
  }

  function reset() {
    setF(emptyForm());
    setSearchField('name');
    setSearchQ('');
    setErrors({});
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  // REG-H035-06 — validación del Bloque Cliente. Demo6 (openSaleForm:5567-5600)
  // exige los 11 campos con `required` nativo + type=email (validación on-submit,
  // sin formato de teléfono). Aquí se replica el set obligatorio con el patrón
  // inline de H-004 (Leads.jsx): on-submit, mensaje rojo bajo el campo, se limpia
  // al editar. El refuerzo de formato tel (sin letras, ≥7 dígitos) + email regex es
  // el mismo enhancement documentado de H-004 (Demo6 sólo usa required nativo).
  function validateClient(v) {
    const errs = {};
    if (!v.custName.trim()) errs.custName = 'El nombre es obligatorio';
    if (!v.custDoc.trim()) errs.custDoc = 'El documento es obligatorio';
    const phone = (v.custPhone || '').trim();
    const numDigits = (phone.match(/\d/g) || []).length;
    if (!phone) errs.custPhone = 'El celular es obligatorio';
    else if (/[a-zA-Z]/.test(phone)) errs.custPhone = 'El celular no puede contener letras';
    else if (numDigits < 7) errs.custPhone = 'El celular debe tener al menos 7 dígitos';
    const email = (v.custEmail || '').trim();
    if (!email) errs.custEmail = 'El correo es obligatorio';
    else if (!EMAIL_RE.test(email)) errs.custEmail = 'Correo con formato inválido';
    if (!v.custCity.trim()) errs.custCity = 'La ciudad es obligatoria';
    if (!v.custAddress.trim()) errs.custAddress = 'La dirección es obligatoria';
    if (!v.deliveryAddress.trim()) errs.deliveryAddress = 'La dirección de entrega es obligatoria';
    if (!v.medio) errs.medio = 'Selecciona un medio';
    if (!v.pdv) errs.pdv = 'Selecciona un PDV';
    if (!v.cierreVenta) errs.cierreVenta = 'Selecciona el cierre de venta';
    if (!v.abonoBancos) errs.abonoBancos = 'Selecciona el abono a bancos';
    return errs;
  }

  // REG-H035-08 — Control General. Demo6 (openSaleForm:5641-5643) exige asesor,
  // tiempo y docType con `required` nativo (docType además con backstop JS en
  // saveSale:5984). En React tiempo/docType arrancan con default no vacío (30 /
  // 'factura'), así que su validación es defensiva; asesor sí puede quedar vacío.
  function validateControl(v) {
    const errs = {};
    if (!v.asesor) errs.asesor = 'Selecciona un asesor';
    if (!v.tiempo) errs.tiempo = 'Selecciona el tiempo de producción';
    if (!v.docType) errs.docType = 'Selecciona el tipo de documento';
    return errs;
  }

  // REG-H035-09 — Registro de pago. Demo6 (openSaleForm:5649-5661 "Todos los campos
  // son obligatorios"; backstop soporte en saveSale:5985) exige los 5 campos SIEMPRE,
  // con monto≥1; NO admite venta sin pago ni tope monto≤total, y un solo método por
  // venta. Decisión usuario 2026-05-26: FIEL A DEMO6 (se elimina la flexibilidad
  // previa de React de registrar venta sin pago). El monto efectivo es el sugerido
  // (anticipo%·total) salvo edición manual.
  function validatePayment(v) {
    const errs = {};
    const amount = v.payManual ? Number(v.payAmount) || 0 : suggestedPay;
    if (amount < 1) errs.payAmount = 'El monto recibido debe ser al menos 1';
    if (!v.payMethod) errs.payMethod = 'Selecciona un método';
    if (!(v.payBankId || bankAccounts[0]?.id)) errs.payBankId = 'Selecciona la cuenta receptora';
    if (!v.payReference.trim()) errs.payReference = 'La referencia / comprobante es obligatoria';
    if (!v.paySoporte) errs.paySoporte = 'Adjunta el soporte de pago';
    return errs;
  }

  // REG-H035-07 (parte NO condicional) — Ítems de venta. Demo6 (saveSale:6090-6102)
  // descarta filas con !producto || qty<=0 || precio<=0 y exige ≥1 ítem válido
  // ('Agrega al menos un item válido'). Se replica como un único gate (sin inline por
  // fila, igual que Demo6). La validación condicional de acabados (color/tela/tejido)
  // es del Bloque A, fuera de este hallazgo. No aplica a innovación (innovItems aparte).
  function validateItems(v) {
    if (innovation) return {};
    const errs = {};
    let hasValid = false;
    v.items.forEach((it, i) => {
      if (it.productId && (Number(it.qty) || 0) > 0 && priceOf(it.productId) > 0) hasValid = true;
      // REG-H035-07 condicional: acabados obligatorios por `areas`, solo en Producción con producto
      // (espejo de los `required` de renderSaleAcabados). Demo6 los exige al guardar.
      if (it.productId && it.tipo === 'produccion') {
        const areas = products.find((p) => p.id === it.productId)?.areas || [];
        if (areas.includes('Preparación y pintura')) {
          if (!it.colorMadera) errs[`item_${i}_madera`] = 'Selecciona el color de madera';
          else if (it.colorMadera === 'Otro' && !it.colorMaderaOtro.trim()) errs[`item_${i}_madera`] = 'Especifica el color "Otro"';
        }
        if (areas.includes('Pintura electrostática') && !it.colorMetal) errs[`item_${i}_metal`] = 'Selecciona el color de metal';
        if (areas.includes('Tapicería') && !it.telaId) errs[`item_${i}_tela`] = 'Selecciona la tela de tapicería';
        if (areas.includes('Tejido') && !it.colorTejido) errs[`item_${i}_tejido`] = 'Selecciona el color de tejido';
      }
    });
    if (!hasValid) errs.items = 'Agrega al menos un ítem válido (producto, cantidad > 0 y precio > 0)';
    return errs;
  }

  function handleSubmit() {
    const errs = { ...validateClient(f), ...validateControl(f), ...validatePayment(f), ...validateItems(f) };
    if (Object.keys(errs).length) {
      setErrors(errs);
      return toast('Revisa los campos marcados', 'warn');
    }
    setErrors({});
    // Innovación: guarda mínima preexistente (validación completa de innovItems fuera del alcance de REG-07).
    if (innovation && !f.innovItems.some((it) => it.name.trim())) return;
    onSubmit?.({
      ...f,
      innovation,
      total,
      payAmount: effectivePay,
      payBankId: f.payBankId || bankAccounts[0]?.id || '',
    });
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={innovation ? 'Nueva venta — Innovación' : 'Nueva venta'}
      size="lg"
      footer={
        <>
          <div className="mr-auto text-sm">
            <span className="text-brand-muted">Total: </span>
            <span className="font-semibold text-brand-gold">{fmtCOP(total)}</span>
          </div>
          <button className="btn-outline" onClick={handleClose}>Cancelar</button>
          <button className="btn-gold" onClick={handleSubmit}>{innovation ? 'Registrar venta innovación' : 'Registrar venta'}</button>
        </>
      }
    >
      <div className="space-y-5">
        {/* ── H-035.1: Bloque Cliente ── */}
        <div className="panel-2 rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold gold-title">Cliente</span>
            <div className="flex gap-1 text-xs">
              {SEARCH_FIELDS.map((sf) => (
                <button
                  key={sf.key}
                  type="button"
                  onClick={() => setSearchField(sf.key)}
                  className={`rounded px-3 py-1 font-semibold ${
                    searchField === sf.key ? 'bg-brand-gold text-brand-bg' : 'panel-2 text-brand-muted'
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
          </div>

          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar cliente existente…"
            className="input-field mb-2"
          />
          {results.length > 0 && (
            <div className="mb-2 max-h-32 space-y-1 overflow-y-auto scrollbar-thin">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="flex w-full items-center justify-between rounded bg-brand-bg/40 px-3 py-1.5 text-left text-xs transition hover:bg-brand-bg/70"
                >
                  <span><span className="font-mono text-brand-gold">{c.id}</span> · <span className="text-white">{c.name}</span></span>
                  <span className="text-brand-muted">{c.city || '—'}</span>
                </button>
              ))}
            </div>
          )}

          <div className="my-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-brand-border" />
            <span className="text-[11px] text-brand-muted">— o crear/editar —</span>
            <div className="h-px flex-1 bg-brand-border" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre *"><Input value={f.custName} onChange={(e) => set('custName', e.target.value)} />{errLine('custName')}</Field>
            <Field label="Documento *"><Input value={f.custDoc} onChange={(e) => set('custDoc', e.target.value)} placeholder="CC / NIT" />{errLine('custDoc')}</Field>
            <Field label="Celular *"><Input value={f.custPhone} onChange={(e) => set('custPhone', e.target.value)} />{errLine('custPhone')}</Field>
            <Field label="Correo *"><Input type="email" value={f.custEmail} onChange={(e) => set('custEmail', e.target.value)} />{errLine('custEmail')}</Field>
            <Field label="Ciudad *"><Input value={f.custCity} onChange={(e) => set('custCity', e.target.value)} />{errLine('custCity')}</Field>
            <Field label="Dirección *"><Input value={f.custAddress} onChange={(e) => set('custAddress', e.target.value)} />{errLine('custAddress')}</Field>
            <Field
              className="sm:col-span-2"
              label={
                <>
                  Dirección de entrega *
                  <button
                    type="button"
                    onClick={() => set('deliveryAddress', f.custAddress)}
                    className="ml-2 text-[10px] text-brand-gold hover:underline"
                  >
                    📋 = Dirección
                  </button>
                </>
              }
            >
              <Input value={f.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} />
              {errLine('deliveryAddress')}
            </Field>
            <Field label="MEDIO *">
              <Select value={f.medio} onChange={(e) => set('medio', e.target.value)}>
                <option value="">— Elegir —</option>
                {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              {errLine('medio')}
            </Field>
            <Field label="PDV *">
              <Select value={f.pdv} onChange={(e) => set('pdv', e.target.value)}>
                <option value="">— Elegir —</option>
                {PDVS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              {errLine('pdv')}
            </Field>
            <Field label="CIERRE DE VENTA *">
              <Select value={f.cierreVenta} onChange={(e) => set('cierreVenta', e.target.value)}>
                <option value="">— Elegir —</option>
                {CIERRES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              {errLine('cierreVenta')}
            </Field>
            <Field label="ABONO A BANCOS *">
              <Select value={f.abonoBancos} onChange={(e) => set('abonoBancos', e.target.value)}>
                <option value="">— Elegir —</option>
                {ABONOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              {errLine('abonoBancos')}
            </Field>
          </div>
        </div>

        {/* ── H-035.2 / H-036.2: items estándar (venta) o productos propuestos (innovación) ── */}
        {innovation ? (
          <div className="panel-2 rounded-lg p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold gold-title">Productos propuestos</span>
              <button type="button" onClick={addInnovItem} className="text-xs text-brand-gold hover:underline">+ Agregar item</button>
            </div>
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-300">
              ⚠ Los productos aún no existen en el catálogo. Se crearán en el módulo de Innovación y{' '}
              <b>deben ser aprobados por gerencia</b> antes de entrar a producción.
            </div>
            <div className="space-y-3">
              {f.innovItems.map((it, i) => (
                <div key={i} className="panel rounded-lg p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-brand-gold">⚙ Producto propuesto (innovación)</span>
                    <button type="button" onClick={() => removeInnovItem(i)} className="text-lg text-red-400" title="Quitar">×</button>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-5"><span className="label text-[10px]">Nombre propuesto *</span><Input value={it.name} onChange={(e) => setInnovItem(i, 'name', e.target.value)} className="text-xs" /></div>
                    <div className="col-span-12 sm:col-span-7"><span className="label text-[10px]">Descripción *</span><Input value={it.desc} onChange={(e) => setInnovItem(i, 'desc', e.target.value)} className="text-xs" /></div>
                    <div className="col-span-4 sm:col-span-3"><span className="label text-[10px]">Cantidad *</span><Input type="number" min="1" value={it.qty} onChange={(e) => setInnovItem(i, 'qty', Number(e.target.value))} className="text-xs" /></div>
                    <div className="col-span-8 sm:col-span-4"><span className="label text-[10px]">Precio estimado unit. *</span><MoneyInput value={it.price} onChange={(e) => setInnovItem(i, 'price', Number(e.target.value))} className="text-xs" /></div>
                    <div className="col-span-12 sm:col-span-5"><span className="label text-[10px]">Áreas estimadas</span><Input value={it.areas} onChange={(e) => setInnovItem(i, 'areas', e.target.value)} placeholder="Ebanistería, Tapicería…" className="text-xs" /></div>
                    <div className="col-span-12"><span className="label text-[10px]">Comentario</span><textarea value={it.comment} onChange={(e) => setInnovItem(i, 'comment', e.target.value)} rows={1} placeholder="Notas específicas del producto (opcional)" className="input-field text-xs" /></div>
                  </div>
                </div>
              ))}
              {f.innovItems.length === 0 && <p className="text-xs italic text-brand-muted">Sin productos propuestos.</p>}
            </div>
          </div>
        ) : (
          <div className="panel-2 rounded-lg p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold gold-title">Items de la venta</span>
            <button type="button" onClick={addItem} className="text-xs text-brand-gold hover:underline">+ Agregar item</button>
          </div>
          <p className="mb-3 text-[11px] text-brand-muted">
            Puedes mezclar items de <b className="text-emerald-300">stock</b> (entrega inmediata) con items de{' '}
            <b className="text-amber-300">producción</b> bajo pedido.
          </p>
          <div className="space-y-3">
            {f.items.map((it, i) => (
              <div key={i} className="panel rounded-lg p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      <input type="radio" name={`itype_${i}`} checked={it.tipo === 'stock'} onChange={() => setItem(i, 'tipo', 'stock')} />
                      <span className="text-emerald-300">Stock</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" name={`itype_${i}`} checked={it.tipo === 'produccion'} onChange={() => setItem(i, 'tipo', 'produccion')} />
                      <span className="text-amber-300">Producción</span>
                    </label>
                  </div>
                  <button type="button" onClick={() => removeItem(i)} className="text-lg leading-none text-red-400 transition hover:text-red-300" title="Quitar item">×</button>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-4">
                    <span className="label text-[10px]">Producto *</span>
                    <Select value={it.productId} onChange={(e) => setItem(i, 'productId', e.target.value)} className="text-xs">
                      <option value="">{it.tipo === 'stock' ? '— Producto en stock —' : '— Producto —'}</option>
                      {productOptions(it.tipo, it.productId).map(({ p, avail }) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {avail != null ? `stock: ${avail} — ` : ''}{fmtCOP(p.price)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <span className="label text-[10px]">Cantidad</span>
                    <Input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, 'qty', Number(e.target.value))} className="text-xs" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <span className="label text-[10px]">Precio unit.</span>
                    <MoneyInput readOnly value={priceOf(it.productId)} title="Precio desde lista" className="cursor-not-allowed bg-brand-navy/40 text-xs" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <span className="label text-[10px]">% Desc.</span>
                    <Input type="number" min="0" max="100" value={it.disc} onChange={(e) => setItem(i, 'disc', Number(e.target.value))} className="text-xs" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <span className="label text-[10px]">Total</span>
                    <div className="input-field flex items-center justify-end bg-brand-navy/30 text-xs font-semibold text-brand-gold-light">{fmtCOP(itemTotal(it))}</div>
                  </div>
                </div>
                {renderStockInfo(it)}
                {renderRouteInfo(it)}
                {renderAcabados(it, i)}
                {/* REG-H035-05: label de comentario por ítem a paridad con Demo6 (addSaleItemRow:5750). */}
                <div className="mt-2">
                  <span className="label text-[10px]">Comentario (opcional, específico de este producto)</span>
                  <textarea
                    value={it.comment}
                    onChange={(e) => setItem(i, 'comment', e.target.value)}
                    rows={1}
                    placeholder="Ej: preferencias, detalles especiales, alto del respaldo, etc."
                    className="input-field text-xs"
                  />
                </div>
              </div>
            ))}
            {f.items.length === 0 && <p className="text-xs italic text-brand-muted">Sin items. Usa “+ Agregar item”.</p>}
          </div>
          {errLine('items')}
          </div>
        )}

        {/* ── H-036.3: Adjuntos obligatorios (solo innovación) ── */}
        {innovation && (
          <div className="panel-2 rounded-lg p-4" style={{ border: '1px solid #C9A961' }}>
            <span className="mb-2 block text-sm font-semibold gold-title">🖼 Adjuntos obligatorios (innovación)</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="label">Foto de referencia *</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => set('innovRefPhoto', `ref_${Date.now().toString(36)}.jpg`)} className="btn-outline text-xs">📸 Adjuntar foto</button>
                  <span className="text-xs">{f.innovRefPhoto ? <span className="text-emerald-300">✓ {f.innovRefPhoto}</span> : <span className="text-brand-muted">Sin adjuntar</span>}</span>
                </div>
              </div>
              <div>
                <span className="label">Foto consentimiento cliente *</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => set('innovConsentPhoto', `consent_${Date.now().toString(36)}.jpg`)} className="btn-outline text-xs">📝 Adjuntar consentimiento</button>
                  <span className="text-xs">{f.innovConsentPhoto ? <span className="text-emerald-300">✓ {f.innovConsentPhoto}</span> : <span className="text-brand-muted">Sin adjuntar</span>}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-amber-300">⚠ La venta quedará en estado <b>pendiente</b> de aprobación de gerencia hasta ser aprobada.</div>
          </div>
        )}

        {/* Control general (anticipo simple en H-035.1; bloque de pago completo en H-035.3). */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Asesor *">
            <Select value={f.asesor} onChange={(e) => set('asesor', e.target.value)}>
              <option value="">— Elegir —</option>
              {asesores.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
            {errLine('asesor')}
          </Field>
          <Field label="Tiempo producción (días) *">
            <Select value={f.tiempo} onChange={(e) => set('tiempo', Number(e.target.value))}>
              {[20, 30, 45, 60, 90].map((v) => <option key={v} value={v}>{v} días</option>)}
            </Select>
            {errLine('tiempo')}
          </Field>
          <Field label="Documento *">
            <Select value={f.docType} onChange={(e) => set('docType', e.target.value)}>
              <option value="factura">Factura</option>
              <option value="remisión">Remisión</option>
            </Select>
            {errLine('docType')}
          </Field>
          <Field label="% Anticipo"><Input type="number" min="0" max="100" value={f.paid} onChange={(e) => { setF((p) => ({ ...p, paid: Number(e.target.value), payManual: false })); setErrors((er) => (er.payAmount ? { ...er, payAmount: undefined } : er)); }} /></Field>
        </div>

        {/* ── H-035.3: Bloque Registro de pago ── */}
        <div className="panel-2 rounded-lg p-4" style={{ border: '1px solid #C9A961' }}>
          <span className="mb-3 block text-sm font-semibold gold-title">💰 Registro de pago</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Monto recibido *">
              <MoneyInput
                value={f.payManual ? f.payAmount : suggestedPay}
                onChange={(e) => { setF((p) => ({ ...p, payManual: true, payAmount: e.target.value })); setErrors((er) => (er.payAmount ? { ...er, payAmount: undefined } : er)); }}
              />
              {errLine('payAmount')}
            </Field>
            <Field label="Método *">
              <Select value={f.payMethod} onChange={(e) => set('payMethod', e.target.value)}>
                {PAY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              {errLine('payMethod')}
            </Field>
            <Field label="Cuenta receptora *">
              <Select value={f.payBankId || bankAccounts[0]?.id || ''} onChange={(e) => set('payBankId', e.target.value)}>
                {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bank} · {b.type}</option>)}
              </Select>
              {errLine('payBankId')}
            </Field>
            <Field className="sm:col-span-3" label="Referencia / comprobante *">
              <Input value={f.payReference} onChange={(e) => set('payReference', e.target.value)} placeholder="Nº transacción, voucher…" />
              {errLine('payReference')}
            </Field>
            <div className="sm:col-span-3">
              <span className="label">Soporte de pago *</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set('paySoporte', `soporte_${Date.now().toString(36)}.pdf`)}
                  className="btn-outline text-xs"
                >
                  📎 Adjuntar soporte
                </button>
                <span className="text-xs text-brand-muted">
                  {f.paySoporte ? <span className="text-emerald-300">✓ {f.paySoporte}</span> : 'Sin adjuntar'}
                </span>
              </div>
              {errLine('paySoporte')}
            </div>
          </div>
        </div>

        {/* Caja de liquidación */}
        <div className="panel-2 rounded-lg p-4">
          <div className="mb-1 flex justify-between text-sm"><span className="text-brand-muted">Subtotal stock</span><span className="text-white">{fmtCOP(subStock)}</span></div>
          <div className="mb-1 flex justify-between text-sm"><span className="text-brand-muted">Subtotal producción</span><span className="text-white">{fmtCOP(subProd)}</span></div>
          <div className="mb-1 flex justify-between text-sm"><span className="text-brand-muted">Descuento total</span><span className="text-red-400">-{fmtCOP(discTotal)}</span></div>
          <div className="mt-2 flex justify-between border-t border-brand-border pt-2 text-base"><span className="font-bold gold-title">Total venta</span><span className="font-bold text-brand-gold">{fmtCOP(total)}</span></div>
        </div>
      </div>
    </Modal>
  );
}
