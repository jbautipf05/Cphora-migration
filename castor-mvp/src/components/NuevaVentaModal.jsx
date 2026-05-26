import { useMemo, useState } from 'react';
import Modal from './Modal';
import { Field, Input, Select } from './form';
import { fmtCOP } from '../lib/format';

// H-035 — Modal "Nueva venta" (réplica de openSaleForm de Demo6:5530).
// Construido por bloques: H-035.1 Cliente · H-035.2 Items dinámicos · H-035.3 Registro de pago.
// La lógica de guardado (resolver/crear cliente, postSale) vive en Ventas vía onSubmit.

const MEDIOS = ['TIENDA', 'LEAD', 'FERIA', 'REMARKETING', 'REFERIDO'];
const PDVS = ['CASTOR 43', 'CASTOR CTG', 'PAGINA WEB', 'GERENCIA'];
const CIERRES = ['PRESENCIAL', 'VIRTUAL'];
const ABONOS = ['DATAFONO', 'TRANSFERENCIA', 'EFECTIVO', 'BOLD'];
const SEARCH_FIELDS = [
  { key: 'name', label: 'Nombre' },
  { key: 'phone', label: 'Celular' },
  { key: 'email', label: 'Correo' },
  { key: 'doc', label: 'Documento' },
];

const emptyForm = () => ({
  customerId: '',
  custName: '', custDoc: '', custPhone: '', custEmail: '', custCity: '', custAddress: '',
  deliveryAddress: '', medio: '', pdv: '', cierreVenta: '', abonoBancos: '',
  asesor: '', tiempo: 30, docType: 'factura', paid: 50,
  items: [{ productId: '', qty: 1, disc: 0, tipo: 'produccion', comment: '' }],
});

export default function NuevaVentaModal({ open, onClose, products = [], customers = [], asesores = [], onSubmit }) {
  const [f, setF] = useState(emptyForm());
  const [searchField, setSearchField] = useState('name');
  const [searchQ, setSearchQ] = useState('');

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setItem = (i, k, v) =>
    setF((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));

  // Buscador inteligente: filtra clientes por el campo elegido.
  const results = useMemo(() => {
    const t = searchQ.trim().toLowerCase();
    if (!t) return [];
    return customers
      .filter((c) => String(c[searchField] || '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [customers, searchField, searchQ]);

  const priceOf = (id) => products.find((p) => p.id === id)?.price || 0;
  const itemTotal = (it) => priceOf(it.productId) * (Number(it.qty) || 0) * (1 - (Number(it.disc) || 0) / 100);
  const total = f.items.reduce((a, it) => a + itemTotal(it), 0);

  function selectCustomer(c) {
    setF((p) => ({
      ...p,
      customerId: c.id,
      custName: c.name || '', custDoc: c.doc || '', custPhone: c.phone || '',
      custEmail: c.email || '', custCity: c.city || '', custAddress: c.address || '',
      deliveryAddress: p.deliveryAddress || c.address || '',
    }));
    setSearchQ('');
  }

  function reset() {
    setF(emptyForm());
    setSearchField('name');
    setSearchQ('');
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  function handleSubmit() {
    if (!f.custName.trim()) return;
    if (!f.items.some((it) => it.productId)) return;
    onSubmit?.({ ...f, total });
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nueva venta"
      size="lg"
      footer={
        <>
          <div className="mr-auto text-sm">
            <span className="text-brand-muted">Total: </span>
            <span className="font-semibold text-brand-gold">{fmtCOP(total)}</span>
          </div>
          <button className="btn-outline" onClick={handleClose}>Cancelar</button>
          <button className="btn-gold" onClick={handleSubmit}>Registrar venta</button>
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
            <Field label="Nombre *"><Input value={f.custName} onChange={(e) => set('custName', e.target.value)} /></Field>
            <Field label="Documento *"><Input value={f.custDoc} onChange={(e) => set('custDoc', e.target.value)} placeholder="CC / NIT" /></Field>
            <Field label="Celular *"><Input value={f.custPhone} onChange={(e) => set('custPhone', e.target.value)} /></Field>
            <Field label="Correo *"><Input type="email" value={f.custEmail} onChange={(e) => set('custEmail', e.target.value)} /></Field>
            <Field label="Ciudad *"><Input value={f.custCity} onChange={(e) => set('custCity', e.target.value)} /></Field>
            <Field label="Dirección *"><Input value={f.custAddress} onChange={(e) => set('custAddress', e.target.value)} /></Field>
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
            </Field>
            <Field label="MEDIO *">
              <Select value={f.medio} onChange={(e) => set('medio', e.target.value)}>
                <option value="">— Elegir —</option>
                {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="PDV *">
              <Select value={f.pdv} onChange={(e) => set('pdv', e.target.value)}>
                <option value="">— Elegir —</option>
                {PDVS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="CIERRE DE VENTA *">
              <Select value={f.cierreVenta} onChange={(e) => set('cierreVenta', e.target.value)}>
                <option value="">— Elegir —</option>
                {CIERRES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="ABONO A BANCOS *">
              <Select value={f.abonoBancos} onChange={(e) => set('abonoBancos', e.target.value)}>
                <option value="">— Elegir —</option>
                {ABONOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
          </div>
        </div>

        {/* Items + control general (mínimo en H-035.1; bloque dinámico llega en H-035.2). */}
        <div className="panel-2 rounded-lg p-4">
          <span className="mb-2 block text-sm font-semibold gold-title">Items de la venta</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Producto *">
              <Select value={f.items[0].productId} onChange={(e) => setItem(0, 'productId', e.target.value)}>
                <option value="">Selecciona…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtCOP(p.price)}</option>)}
              </Select>
            </Field>
            <Field label="Cantidad"><Input type="number" min="1" value={f.items[0].qty} onChange={(e) => setItem(0, 'qty', Number(e.target.value))} /></Field>
          </div>
        </div>

        {/* Control general (anticipo simple en H-035.1; bloque de pago completo en H-035.3). */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Asesor *">
            <Select value={f.asesor} onChange={(e) => set('asesor', e.target.value)}>
              <option value="">— Elegir —</option>
              {asesores.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label="Tiempo producción (días) *">
            <Select value={f.tiempo} onChange={(e) => set('tiempo', Number(e.target.value))}>
              {[20, 30, 45, 60, 90].map((v) => <option key={v} value={v}>{v} días</option>)}
            </Select>
          </Field>
          <Field label="Documento *">
            <Select value={f.docType} onChange={(e) => set('docType', e.target.value)}>
              <option value="factura">Factura</option>
              <option value="remisión">Remisión</option>
            </Select>
          </Field>
          <Field label="% Anticipo"><Input type="number" min="0" max="100" value={f.paid} onChange={(e) => set('paid', Number(e.target.value))} /></Field>
        </div>
      </div>
    </Modal>
  );
}
