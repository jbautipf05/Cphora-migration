import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, nowISO, addDays, today } from '../lib/format';
import { resolveCustomerId } from '../lib/migrations';
import Modal from './Modal';
import { Field, Input, MoneyInput, Select, Textarea, FormGrid } from './form';
import { useToast } from './Toast';

// Modal "Nueva cotización" reutilizable (H-010). Se usa desde Cotizaciones y desde
// el perfil de Lead (sin navegar). Props:
//   open          → visible
//   leadId        → preselecciona un lead y arrastra sus productos de interés
//   initialForm   → form prellenado (caso "editar" desde el detalle); excluye leadId
//   onClose()     → cerrar
//   onCreated(id) → tras crear la cotización (Cotizaciones abre el detalle; Leads no)

// Listas espejo del HTML (LEAD_CHANNELS 3776 / LEAD_ASESORES 3778).
const CHANNELS = ['Llamada', 'WhatsApp', 'Instagram', 'Pagina Web', 'Facebook', 'Tienda 43', 'Tienda Ctg', 'Referidos'];
const ASESORES = ['Thalia Cifuentes', 'Alexander Vivas', 'Keyla Cardozo', 'Luz Angela Mendivil', 'Lisseth Ceballos', 'Valentina Olmos'];
const VIGENCIAS = [20, 30, 45, 60, 90];
const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 30, 40, 50]; // descuentos rápidos (H-013, mejora)
const LEAD_SEARCH_FIELDS = [
  { key: 'name', label: 'Nombre', ph: 'Escribe nombre del lead…' },
  { key: 'phone', label: 'Celular', ph: 'Escribe celular…' },
  { key: 'email', label: 'Correo', ph: 'Escribe correo…' },
  { key: 'doc', label: 'Documento', ph: 'Escribe documento…' },
];
// Offsets de los 7 seguimientos programados (espejo HTML 4753).
export const QUOTE_SEG_OFFSETS = [3, 7, 14, 21, 35, 45, 60];

export const subtotal = (q) => q.items.reduce((a, i) => a + i.qty * i.price, 0);
export const total = (q) => Math.round(subtotal(q) * (1 - q.discount / 100));

export const genQuoteSeguimientos = (baseDate) =>
  QUOTE_SEG_OFFSETS.map((d, i) => ({
    id: `QS-${Date.now().toString(36)}-${i}`,
    n: i + 1,
    fechaProxima: addDays((baseDate || today()).slice(0, 10), d),
    estado: 'pendiente',
    notas: '',
    completadoAt: null,
  }));

const emptyForm = () => ({
  leadId: '', clientName: '', city: '', channel: 'Llamada', asesor: '',
  items: [{ productId: '', qty: 1, price: 0, desc: '' }], discount: 0, vigenciaDias: 30, notes: '',
  newLeadPhone: '', newLeadEmail: '', newLeadDoc: '', newLeadAddress: '',
});

export default function NuevaCotizacionModal({ open, leadId = null, initialForm = null, onClose, onCreated }) {
  const { products, leads, customers, add, update, nextId, pushNotification } = useApp();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [leadField, setLeadField] = useState('name');
  const [leadQuery, setLeadQuery] = useState('');
  const [customDisc, setCustomDisc] = useState(false); // "Otro" descuento (H-013)

  // Construye el form al abrir (espejo de openQuoteForm(leadId)).
  function buildFromLead() {
    const lead = leadId ? leads.find((l) => l.id === leadId) : null;
    const f = emptyForm();
    if (lead) {
      f.leadId = lead.id;
      f.clientName = lead.name || '';
      f.city = lead.city || '';
      if (lead.channel) f.channel = lead.channel;
      if (lead.asesor) f.asesor = lead.asesor;
      const pis = lead.productosInteres || [];
      if (pis.length) {
        f.items = pis.map((pi) => {
          const p = products.find((x) => x.id === pi.productId);
          return { productId: pi.productId, qty: pi.qty || 1, price: p?.price || 0, desc: p?.name || '' };
        });
      }
    }
    setLeadField('name');
    setLeadQuery('');
    setForm(f);
    if (lead?.productosInteres?.length) {
      toast(`${lead.productosInteres.length} producto(s) arrastrado(s) del lead`, 'ok');
    }
  }

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (initialForm) { setLeadField('name'); setLeadQuery(''); setForm({ ...initialForm }); setCustomDisc(!DISCOUNT_PRESETS.includes(Number(initialForm.discount || 0))); }
      else { buildFromLead(); setCustomDisc(false); }
    } else {
      setForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId, initialForm]);

  const selLead = form?.leadId ? leads.find((l) => l.id === form.leadId) : null;

  const leadResults = useMemo(() => {
    const ql = leadQuery.toLowerCase().trim();
    const base = ql
      ? leads.filter((l) => String(l[leadField] || '').toLowerCase().includes(ql))
      : leads;
    return base.slice(0, 10);
  }, [leads, leadField, leadQuery]);

  function applyLead(lead) {
    setForm((f) => {
      const nf = { ...f, leadId: lead.id, clientName: lead.name || '', city: lead.city || '' };
      if (lead.channel) nf.channel = lead.channel;
      if (lead.asesor) nf.asesor = lead.asesor;
      const pis = lead.productosInteres || [];
      if (pis.length) {
        nf.items = pis.map((pi) => {
          const p = products.find((x) => x.id === pi.productId);
          return { productId: pi.productId, qty: pi.qty || 1, price: p?.price || 0, desc: p?.name || '' };
        });
      }
      return nf;
    });
    if (lead.productosInteres?.length) {
      toast(`${lead.productosInteres.length} producto(s) arrastrado(s) del lead`, 'ok');
    }
  }
  // H-014 (mejora): "Quitar" limpia toda la info autollenada del lead
  // (cliente, ciudad, canal, asesor y productos arrastrados).
  const clearLead = () => setForm((f) => ({
    ...f, leadId: '', clientName: '', city: '', channel: 'Llamada', asesor: '',
    items: [{ productId: '', qty: 1, price: 0, desc: '' }],
  }));

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (i, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', qty: 1, price: 0, desc: '' }] }));
  const rmItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }));
  const onProduct = (i, productId) => {
    const p = products.find((x) => x.id === productId);
    setItem(i, { productId, price: p?.price || 0, desc: p?.name || '' });
  };

  const formSub = form ? subtotal(form) : 0;
  const formDiscAmt = form ? Math.round((formSub * (Number(form.discount) || 0)) / 100) : 0;
  const formTotal = form ? total(form) : 0;
  const discMsg = !form
    ? null
    : form.discount <= 20
      ? { t: '✓ Pre-aprobado (vendedor)', c: 'text-emerald-400' }
      : form.discount <= 50
        ? { t: '⚠ Requiere aprobación gerencia', c: 'text-amber-400' }
        : { t: '✗ No permitido (>50%)', c: 'text-red-400' };
  const vigMsg = form && Number(form.vigenciaDias) === 20
    ? '⚠ Vigencia 20 días: requiere aprobación de gerencia'
    : '';

  function save() {
    if (!form.clientName.trim()) return toast('Indica el cliente', 'warn');
    const items = form.items.filter((it) => it.productId && it.qty > 0 && it.price > 0);
    if (!items.length) return toast('Agrega al menos un item válido', 'error');
    const discount = Number(form.discount) || 0;
    if (discount > 50) return toast('Descuento >50% no permitido', 'error');
    const vigDias = Number(form.vigenciaDias) || 30;

    // Crea el lead automáticamente si no se seleccionó uno (espejo saveQuote 4715).
    let lid = form.leadId || null;
    if (!lid && form.clientName.trim()) {
      lid = nextId('L', 'lead');
      add('leads', {
        id: lid, name: form.clientName.trim(), tipo: 'lead', company: '—',
        phone: form.newLeadPhone || '', email: form.newLeadEmail || '', doc: form.newLeadDoc || '',
        address: form.newLeadAddress || '', city: form.city || '', channel: form.channel,
        clasificacion: 'medio', estado: 'En gestión', asesor: form.asesor, valor: 0,
        productosInteres: [], createdAt: today(),
        notes: [{ at: nowISO(), by: form.asesor || 'Sistema', text: 'Lead creado desde cotización.' }],
        seguimientos: [],
      });
      toast(`Lead ${lid} creado`, 'ok');
    }

    const requiresApproval = discount > 20 || vigDias === 20;
    const approvalReason = requiresApproval
      ? `${vigDias === 20 ? 'Vigencia 20 días' : ''}${discount > 20 ? `${vigDias === 20 ? ' + ' : ''}Descuento ${discount}%` : ''}`
      : '';
    const id = nextId('COT', 'cot');
    const createdAt = today(); // anclar al "hoy" del demo (DEMO_TODAY), espejo de saveQuote() de Demo6
    // B2 (ADR-011): enlazar customerId si es resoluble (lead vinculado o cliente existente).
    // Una cotización es pre-venta → NO se auto-crea cliente acá (eso ocurre al crear el pedido).
    const customerId = resolveCustomerId({ clientName: form.clientName.trim(), leadId: lid }, { customers, leads });
    add('quotes', {
      id, leadId: lid, customerId, clientName: form.clientName.trim(), city: form.city || '', channel: form.channel,
      items, discount, notes: form.notes || '', asesor: form.asesor,
      estado: requiresApproval ? 'pendiente_aprob' : 'borrador', requiresApproval, approvalReason,
      createdAt, vigenciaDias: vigDias, vigencia: addDays(createdAt.slice(0, 10), vigDias),
      seguimientos: genQuoteSeguimientos(createdAt), notasSeguimiento: [],
    });

    if (lid) {
      const l = leads.find((x) => x.id === lid);
      if (l && l.estado !== 'Compro') update('leads', lid, { estado: 'En gestión' });
    }
    if (requiresApproval) {
      pushNotification({
        type: 'warning',
        text: `Cotización ${id} requiere aprobación de gerencia (${approvalReason})`,
        targetUser: 'Alexander Vivas', link: 'cotizaciones', key: `cotAprob-${id}`,
      });
    }
    toast(
      requiresApproval
        ? `Cotización ${id} creada · ⚠ Requiere aprobación de gerencia (${approvalReason})`
        : 'Cotización creada con 7 seguimientos programados',
      requiresApproval ? 'warn' : 'ok',
    );
    onCreated?.(id);
    onClose?.();
  }

  return (
    <Modal
      open={open && !!form}
      onClose={onClose}
      title="Nueva cotización"
      size="3xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-gold" onClick={save}>Crear</button>
        </>
      }
    >
      {form && (
        <div className="space-y-5">
          {/* Buscar lead (espejo HTML 4527) */}
          <div className="panel-2 rounded-lg border border-brand-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold gold-title">Buscar lead</span>
              <div className="flex gap-1 text-xs">
                {LEAD_SEARCH_FIELDS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => { setLeadField(f.key); setLeadQuery(''); }}
                    className={`rounded px-3 py-1 ${leadField === f.key ? 'bg-brand-gold font-semibold text-brand-navy' : 'panel-2 text-brand-muted'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              value={leadQuery}
              onChange={(e) => setLeadQuery(e.target.value)}
              placeholder={LEAD_SEARCH_FIELDS.find((f) => f.key === leadField)?.ph}
              className="mb-3"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
              {leadResults.length === 0 ? (
                <div className="p-2 text-center text-xs italic text-brand-muted">Sin coincidencias</div>
              ) : (
                leadResults.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => applyLead(l)}
                    className="flex w-full justify-between rounded p-2 text-left text-xs panel-2 hover:bg-brand-navy/30"
                  >
                    <span><span className="font-mono text-brand-gold">{l.id}</span> · <span className="text-white">{l.name}</span></span>
                    <span className="text-brand-muted">
                      {leadField === 'phone' ? l.phone : leadField === 'email' ? l.email : leadField === 'doc' ? l.doc : l.city || ''}
                    </span>
                  </button>
                ))
              )}
            </div>
            {selLead && (
              <div className="mt-3 panel rounded p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">{selLead.id} · {selLead.name}</div>
                    <div className="text-xs text-brand-muted">
                      📱 {selLead.phone || '—'} · ✉ {selLead.email || '—'} · 🪪 {selLead.doc || '—'} · {selLead.city || '—'}
                    </div>
                  </div>
                  <button type="button" onClick={clearLead} className="text-xs text-red-400 hover:underline">Quitar</button>
                </div>
              </div>
            )}
          </div>

          <FormGrid cols={2}>
            <Field label="Asesor *">
              <Select value={form.asesor} onChange={(e) => setF('asesor', e.target.value)}>
                <option value="">— Elegir —</option>
                {ASESORES.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </Field>
            <Field label="Canal *">
              <Select value={form.channel} onChange={(e) => setF('channel', e.target.value)}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Cliente *"><Input value={form.clientName} onChange={(e) => setF('clientName', e.target.value)} /></Field>
            <Field label="Ciudad"><Input value={form.city} onChange={(e) => setF('city', e.target.value)} /></Field>
          </FormGrid>

          {/* Caja lead nuevo (espejo HTML 4558) — sólo si no hay lead seleccionado */}
          {!form.leadId && (
            <div className="panel-2 rounded-lg p-4" style={{ border: '1px dashed #C9A961' }}>
              <p className="mb-2 text-xs font-semibold text-brand-gold">
                📝 Si es un lead nuevo, completa sus datos (se creará automáticamente)
              </p>
              <FormGrid cols={2}>
                <Field label="Celular"><Input value={form.newLeadPhone} onChange={(e) => setF('newLeadPhone', e.target.value)} /></Field>
                <Field label="Correo"><Input type="email" value={form.newLeadEmail} onChange={(e) => setF('newLeadEmail', e.target.value)} /></Field>
                <Field label="Documento de identidad"><Input placeholder="CC / NIT / CE" value={form.newLeadDoc} onChange={(e) => setF('newLeadDoc', e.target.value)} /></Field>
                <Field label="Dirección" className="sm:col-span-2"><Input value={form.newLeadAddress} onChange={(e) => setF('newLeadAddress', e.target.value)} /></Field>
              </FormGrid>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label !mb-0">Items</span>
              <button className="text-xs text-brand-gold hover:underline" onClick={addItem}>+ Agregar item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 items-start gap-2">
                  <div className="col-span-4">
                    <Select value={it.productId} onChange={(e) => onProduct(i, e.target.value)} className="!text-xs">
                      <option value="">— Producto —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtCOP(p.price)}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input value={it.desc} onChange={(e) => setItem(i, { desc: e.target.value })} placeholder="Descripción" className="!text-xs" />
                  </div>
                  <div className="col-span-1">
                    <Input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} className="!text-xs" />
                  </div>
                  <div className="col-span-2">
                    <MoneyInput readOnly value={it.price} title="Precio desde lista (no editable)" className="!text-xs cursor-not-allowed bg-brand-navy/40" />
                  </div>
                  <button className="col-span-1 text-lg text-red-400" onClick={() => rmItem(i)}>×</button>
                </div>
              ))}
            </div>
          </div>

          <FormGrid cols={2}>
            <Field label="Descuento % *">
              <Select
                value={customDisc ? 'otro' : String(form.discount)}
                onChange={(e) => {
                  if (e.target.value === 'otro') { setCustomDisc(true); }
                  else { setCustomDisc(false); setF('discount', Number(e.target.value)); }
                }}
              >
                {DISCOUNT_PRESETS.map((d) => <option key={d} value={d}>{d}%</option>)}
                <option value="otro">Otro…</option>
              </Select>
              {customDisc && (
                <Input
                  type="number" min="0" max="100" value={form.discount}
                  onChange={(e) => setF('discount', Number(e.target.value))}
                  placeholder="Descuento personalizado %" className="mt-2"
                />
              )}
              {discMsg && <span className={`mt-1 block text-xs ${discMsg.c}`}>{discMsg.t}</span>}
            </Field>
            <Field label="Vigencia (días) *">
              <Select value={form.vigenciaDias} onChange={(e) => setF('vigenciaDias', Number(e.target.value))}>
                {VIGENCIAS.map((v) => <option key={v} value={v}>{v} días</option>)}
              </Select>
              {vigMsg && <span className="mt-1 block text-xs text-amber-400">{vigMsg}</span>}
            </Field>
          </FormGrid>
          <Field label="Notas"><Textarea rows={2} value={form.notes} onChange={(e) => setF('notes', e.target.value)} /></Field>

          {/* Resumen live (espejo HTML 4576) */}
          <div className="panel-2 rounded-lg p-4 text-sm">
            <div className="mb-1 flex justify-between"><span className="text-brand-muted">Subtotal</span><span className="font-semibold text-white">{fmtCOP(formSub)}</span></div>
            <div className="mb-1 flex justify-between"><span className="text-brand-muted">Descuento</span><span className="font-semibold text-red-400">-{fmtCOP(formDiscAmt)}</span></div>
            <div className="mt-2 flex justify-between border-t border-brand-border pt-2 text-base"><span className="font-bold gold-title">Total</span><span className="font-bold text-brand-gold">{fmtCOP(formTotal)}</span></div>
          </div>
        </div>
      )}
    </Modal>
  );
}
