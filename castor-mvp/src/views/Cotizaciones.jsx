import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP, fmtDate, nowISO, addDays, daysBetween, today } from '../lib/format';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, SlidePanel, ClearFiltersButton } from '../components/widgets';
import { IconDoc, IconCheck, IconBank } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, Textarea, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const ESTADOS = ['borrador', 'enviada', 'aceptada', 'rechazada'];
// Listas espejo del HTML (LEAD_CHANNELS 3776 / LEAD_ASESORES 3778).
const CHANNELS = ['Llamada', 'WhatsApp', 'Instagram', 'Pagina Web', 'Facebook', 'Tienda 43', 'Tienda Ctg', 'Referidos'];
const ASESORES = ['Thalia Cifuentes', 'Alexander Vivas', 'Keyla Cardozo', 'Luz Angela Mendivil', 'Lisseth Ceballos', 'Valentina Olmos'];
const VIGENCIAS = [20, 30, 45, 60, 90];
const LEAD_SEARCH_FIELDS = [
  { key: 'name', label: 'Nombre', ph: 'Escribe nombre del lead…' },
  { key: 'phone', label: 'Celular', ph: 'Escribe celular…' },
  { key: 'email', label: 'Correo', ph: 'Escribe correo…' },
  { key: 'doc', label: 'Documento', ph: 'Escribe documento…' },
];
// Offsets de los 7 seguimientos programados (espejo HTML 4753).
const QUOTE_SEG_OFFSETS = [3, 7, 14, 21, 35, 45, 60];

const subtotal = (q) => q.items.reduce((a, i) => a + i.qty * i.price, 0);
const total = (q) => Math.round(subtotal(q) * (1 - q.discount / 100));

const genQuoteSeguimientos = (baseDate) =>
  QUOTE_SEG_OFFSETS.map((d, i) => ({
    id: `QS-${Date.now().toString(36)}-${i}`,
    n: i + 1,
    fechaProxima: addDays((baseDate || nowISO()).slice(0, 10), d),
    estado: 'pendiente',
    notas: '',
    completadoAt: null,
  }));

const emptyForm = () => ({
  leadId: '', clientName: '', city: '', channel: 'Llamada', asesor: '',
  items: [{ productId: '', qty: 1, price: 0, desc: '' }], discount: 0, vigenciaDias: 30, notes: '',
  newLeadPhone: '', newLeadEmail: '', newLeadDoc: '', newLeadAddress: '',
});

export default function Cotizaciones({ onNavigate }) {
  const {
    quotes, orders, products, leads, add, update, nextId, currentUser,
    pushNotification, pendingForm, setPendingForm,
  } = useApp();
  const toast = useToast();
  const [noteText, setNoteText] = useState('');

  // Cotizaciones aceptadas sin pedido asociado (espejo del indicador ● del HTML).
  const aceptadasSinPedido = (q) =>
    q.estado === 'aceptada' && !orders.some((o) => o.quoteId === q.id);

  const addNoteToQuote = () => {
    if (!noteText.trim() || !sel) return;
    update('quotes', sel.id, (q) => ({
      notes_arr: [
        ...(q.notes_arr || []),
        { at: nowISO(), by: currentUser?.name || 'Sistema', text: noteText.trim() },
      ],
    }));
    setNoteText('');
    toast('Nota agregada', 'ok');
  };

  // Descarga PDF simulada: genera un .txt con resumen de la cotización
  const downloadPDF = (qu) => {
    const lines = [
      `CASTOR · Cotización ${qu.id}`,
      `Cliente: ${qu.clientName}`,
      `Canal: ${qu.channel} · Asesor: ${qu.asesor}`,
      `Fecha: ${qu.createdAt?.slice(0, 10)} · Vigencia: ${qu.vigencia} (${qu.vigenciaDias}d)`,
      `Estado: ${qu.estado}`,
      '',
      'Items:',
      ...qu.items.map((it) => {
        const p = products.find((x) => x.id === it.productId);
        return `  ${p?.name || it.productId} · ${it.qty} × ${fmtCOP(it.price)} = ${fmtCOP(it.qty * it.price)}`;
      }),
      '',
      `Subtotal:    ${fmtCOP(subtotal(qu))}`,
      `Descuento:   -${fmtCOP((subtotal(qu) * qu.discount) / 100)} (${qu.discount}%)`,
      `Total:       ${fmtCOP(total(qu))}`,
      '',
      `Notas: ${qu.notes || '—'}`,
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cotizacion_${qu.id}_${(qu.clientName || '').replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast('PDF generado (simulado)', 'ok');
  };
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [canal, setCanal] = useState('');
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(null);
  const [leadField, setLeadField] = useState('name');
  const [leadQuery, setLeadQuery] = useState('');
  const [segVerify, setSegVerify] = useState({ id: null, nota: '' }); // verificar seguimiento

  const sel = quotes.find((x) => x.id === selId) || null;
  const canales = useMemo(() => [...new Set(quotes.map((x) => x.channel))], [quotes]);
  const selLead = form?.leadId ? leads.find((l) => l.id === form.leadId) : null;

  // Resultados del buscador de lead (espejo de filterLeadResults, máx 10).
  const leadResults = useMemo(() => {
    const ql = leadQuery.toLowerCase().trim();
    const base = ql
      ? leads.filter((l) => String(l[leadField] || '').toLowerCase().includes(ql))
      : leads;
    return base.slice(0, 10);
  }, [leads, leadField, leadQuery]);

  // Abre el modal con un lead preseleccionado (espejo de openQuoteForm(leadId)).
  function openQuoteForm(leadId) {
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

  // Consume el intent de navegación dejado por Leads ("+ Nueva cotización").
  useEffect(() => {
    if (pendingForm?.type === 'quote') {
      // Consumir un intent externo es justamente sincronizar con un sistema
      // externo (la otra vista); abrir el modal aquí es intencional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openQuoteForm(pendingForm.leadId);
      setPendingForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingForm]);

  // Genera de forma diferida los 7 seguimientos de cotizaciones seed que no los
  // tengan, igual que el HTML al abrir openQuoteDetail (4806).
  useEffect(() => {
    if (sel && !sel.seguimientos) {
      update('quotes', sel.id, { seguimientos: genQuoteSeguimientos(sel.createdAt) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

  // Selección de lead dentro del modal (clic en un resultado del buscador).
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
  const clearLead = () => setForm((f) => ({ ...f, leadId: '', clientName: '', city: '' }));

  // Verificar/cerrar un seguimiento de la cotización (con nota opcional).
  function verifySeguimiento(quoteId, segId, nota) {
    update('quotes', quoteId, (qq) => ({
      seguimientos: (qq.seguimientos || []).map((s) =>
        s.id === segId
          ? { ...s, estado: 'completado', completadoAt: today(), notas: nota?.trim() || s.notas }
          : s,
      ),
    }));
    setSegVerify({ id: null, nota: '' });
    toast('Seguimiento verificado', 'ok');
  }

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return quotes.filter((c) => {
      if (estado && c.estado !== estado) return false;
      if (canal && c.channel !== canal) return false;
      if (t && !`${c.id} ${c.clientName} ${c.asesor}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [quotes, q, estado, canal]);

  const aceptadas = quotes.filter((c) => c.estado === 'aceptada').length;

  // ── Form helpers ──
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
  // Mensaje inline de descuento (espejo de validateDiscount 4690).
  const discMsg = !form
    ? null
    : form.discount <= 20
      ? { t: '✓ Pre-aprobado (vendedor)', c: 'text-emerald-400' }
      : form.discount <= 50
        ? { t: '⚠ Requiere aprobación gerencia', c: 'text-amber-400' }
        : { t: '✗ No permitido (>50%)', c: 'text-red-400' };
  // Mensaje inline de vigencia (espejo de validateVigencia 4697).
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
    let leadId = form.leadId || null;
    if (!leadId && form.clientName.trim()) {
      leadId = nextId('L', 'lead');
      add('leads', {
        id: leadId, name: form.clientName.trim(), tipo: 'lead', company: '—',
        phone: form.newLeadPhone || '', email: form.newLeadEmail || '', doc: form.newLeadDoc || '',
        address: form.newLeadAddress || '', city: form.city || '', channel: form.channel,
        clasificacion: 'medio', estado: 'En gestión', asesor: form.asesor, valor: 0,
        productosInteres: [], createdAt: nowISO(),
        notes: [{ at: nowISO(), by: form.asesor || 'Sistema', text: 'Lead creado desde cotización.' }],
        seguimientos: [],
      });
      toast(`Lead ${leadId} creado`, 'ok');
    }

    const requiresApproval = discount > 20 || vigDias === 20;
    const approvalReason = requiresApproval
      ? `${vigDias === 20 ? 'Vigencia 20 días' : ''}${discount > 20 ? `${vigDias === 20 ? ' + ' : ''}Descuento ${discount}%` : ''}`
      : '';
    const id = nextId('COT', 'cot');
    const createdAt = nowISO();
    add('quotes', {
      id, leadId, clientName: form.clientName.trim(), city: form.city || '', channel: form.channel,
      items, discount, notes: form.notes || '', asesor: form.asesor,
      estado: requiresApproval ? 'pendiente_aprob' : 'borrador', requiresApproval, approvalReason,
      createdAt, vigenciaDias: vigDias, vigencia: addDays(createdAt.slice(0, 10), vigDias),
      seguimientos: genQuoteSeguimientos(createdAt), notasSeguimiento: [],
    });

    // Mantiene el estado del lead en gestión (no degrada un "Compro").
    if (leadId) {
      const l = leads.find((x) => x.id === leadId);
      if (l && l.estado !== 'Compro') update('leads', leadId, { estado: 'En gestión' });
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
    setForm(null);
    setSelId(id); // abre el detalle (espejo de openQuoteDetail al final de saveQuote)
  }

  function updateEstado(id, nuevo) {
    update('quotes', id, { estado: nuevo });
    toast(`Cotización ${nuevo}`, 'ok');
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortValue: (r) => r.id,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-gold">
          {r.id}
          {aceptadasSinPedido(r) && (
            <span
              title="Aceptada · pendiente de crear pedido"
              className="inline-block h-2 w-2 rounded-full bg-amber-400"
            />
          )}
        </span>
      ),
    },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'channel', label: 'Canal', render: (r) => <span className="text-brand-muted">{r.channel}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-brand-muted">{r.asesor}</span> },
    { key: 'items', label: 'Items', align: 'right', sortValue: (r) => r.items.length, render: (r) => <span className="text-brand-muted">{r.items.length}</span> },
    { key: 'subtotal', label: 'Subtotal', align: 'right', sortValue: (r) => subtotal(r), render: (r) => <span className="text-brand-muted">{fmtCOP(subtotal(r))}</span> },
    { key: 'desc', label: 'Desc.', align: 'right', sortValue: (r) => r.discount, render: (r) => <span className="text-brand-muted">{r.discount}%</span> },
    { key: 'total', label: 'Total', align: 'right', sortValue: (r) => total(r), render: (r) => <span className="text-white">{fmtCOP(total(r))}</span> },
    { key: 'estado', label: 'Estado', sortValue: (r) => r.estado, render: (r) => <EstadoBadge value={r.estado} /> },
    { key: 'fecha', label: 'Creación', sortValue: (r) => r.createdAt, render: (r) => <span className="text-brand-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'vigencia', label: 'Vigencia', sortValue: (r) => r.vigencia, render: (r) => <span className="text-brand-muted">{fmtDate(r.vigencia)}</span> },
  ];

  return (
    <div className="page space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Cotizaciones" value={quotes.length} accent="#D4B876" icon={<IconDoc width={18} height={18} />} />
        <KpiCard label="Aceptadas (crear pedido)" value={aceptadas} accent="#10b981" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="Valor en cotización" value={fmtCOP(quotes.reduce((a, c) => a + total(c), 0))} accent="#C9A961" icon={<IconBank width={18} height={18} />} />
      </div>

      {aceptadas > 0 && (
        <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold">
          {aceptadas} cotización(es) aceptada(s) pendiente(s) de crear pedido.
        </div>
      )}

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar ID, cliente, asesor…" />
        <SelectFilter value={estado} onChange={setEstado} options={ESTADOS} allLabel="Todos los estados" />
        <SelectFilter value={canal} onChange={setCanal} options={canales} allLabel="Todos los canales" />
        <ClearFiltersButton
          active={!!(q || estado || canal)}
          onClear={() => { setQ(''); setEstado(''); setCanal(''); }}
        />
        <span className="ml-auto text-sm text-brand-muted">{rows.length} cotizaciones</span>
        <button className="btn-gold" onClick={() => openQuoteForm()}>+ Nueva cotización</button>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={(r) => setSelId(r.id)} />

      <SlidePanel
        open={!!sel}
        onClose={() => setSelId(null)}
        title={sel?.clientName}
        subtitle={sel ? `${sel.id} · ${sel.city || sel.channel}` : ''}
      >
        {sel && (
          <div className="space-y-5">
            {/* Cabecera con metadatos */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Fecha</p>
                <p className="mt-0.5 text-white">{fmtDate(sel.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Vigencia</p>
                <p className="mt-0.5 text-white">{fmtDate(sel.vigencia)} <span className="text-xs text-muted">({sel.vigenciaDias} días)</span></p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Canal</p>
                <p className="mt-0.5 text-white">{sel.channel}</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Asesor</p>
                <p className="mt-0.5 text-white">{sel.asesor}</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Estado</p>
                <select
                  value={sel.estado}
                  onChange={(e) => update('quotes', sel.id, { estado: e.target.value })}
                  className="input-field mt-1 !py-1 text-xs"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-light/80">Items</p>
                <button
                  onClick={() => setForm({ ...sel, _editId: sel.id })}
                  className="text-xs text-gold-accent hover:underline"
                >
                  ✎ Editar cotización
                </button>
              </div>
              <div className="space-y-2">
                {sel.items.map((it, i) => {
                  const p = products.find((x) => x.id === it.productId);
                  return (
                    <div
                      key={i}
                      className="panel-2 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{p?.name || it.desc || it.productId}</p>
                          <p className="text-[11px] text-brand-muted">{it.qty} × {fmtCOP(it.price)}</p>
                        </div>
                        <span className="shrink-0 text-base font-bold text-gold-accent">
                          {fmtCOP(it.qty * it.price)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totales */}
            <div className="panel-2 rounded-lg p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted">Subtotal</span>
                <span className="text-white">{fmtCOP(subtotal(sel))}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Descuento ({sel.discount}%)</span>
                <span className="text-red-300">-{fmtCOP((subtotal(sel) * sel.discount) / 100)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-base font-semibold">
                <span className="text-white">Total</span>
                <span className="text-gold-accent">{fmtCOP(total(sel))}</span>
              </div>
            </div>

            {sel.notes && (
              <p className="text-sm italic text-muted">{sel.notes}</p>
            )}

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2">
              {sel.estado === 'borrador' && (
                <button className="btn-outline flex-1" onClick={() => updateEstado(sel.id, 'enviada')}>Enviar</button>
              )}
              {sel.estado !== 'aceptada' && sel.estado !== 'rechazada' && (
                <button className="btn-gold flex-1" onClick={() => updateEstado(sel.id, 'aceptada')}>Aceptar</button>
              )}
              {sel.estado === 'aceptada' && (
                <button className="btn-gold flex-1" onClick={() => onNavigate?.('ventas')}>→ Crear venta</button>
              )}
              {sel.estado !== 'rechazada' && (
                <button
                  className="btn-outline flex-1 !border-red-400/40 !text-red-300 hover:!bg-red-500/10"
                  onClick={() => updateEstado(sel.id, 'rechazada')}
                >
                  Rechazar
                </button>
              )}
            </div>

            {/* Seguimientos programados (7 persistidos, espejo HTML 4882) */}
            <div className="panel-2 rounded-lg p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                📅 Seguimientos programados (7 en 2 meses)
              </p>
              <div className="space-y-2">
                {(sel.seguimientos || []).map((s) => {
                  const dd = daysBetween(today(), s.fechaProxima);
                  const done = s.estado === 'completado';
                  const color = done ? '#10b981' : dd <= 0 ? '#ef4444' : dd <= 3 ? '#f59e0b' : '#3b82f6';
                  const label = done
                    ? `✓ ${fmtDate(s.completadoAt)}`
                    : dd <= 0 ? `Vencido ${Math.abs(dd)}d` : `En ${dd}d`;
                  return (
                    <div
                      key={s.id}
                      className="rounded p-2"
                      style={{ borderLeft: `4px solid ${color}`, background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white">
                            Seguimiento #{s.n} · {fmtDate(s.fechaProxima)}
                          </p>
                          <p className="text-[10px]" style={{ color }}>{label}</p>
                        </div>
                        {s.estado === 'pendiente' && (
                          <button
                            className="text-[11px] text-gold-accent hover:underline"
                            onClick={() => setSegVerify({ id: segVerify.id === s.id ? null : s.id, nota: '' })}
                          >
                            ✓ Verificar
                          </button>
                        )}
                      </div>
                      {s.notas && (
                        <p className="mt-1 text-[11px] italic text-brand-muted">"{s.notas}"</p>
                      )}
                      {segVerify.id === s.id && (
                        <div className="mt-2">
                          <textarea
                            value={segVerify.nota}
                            onChange={(e) => setSegVerify((v) => ({ ...v, nota: e.target.value }))}
                            placeholder="Nota del seguimiento..."
                            rows={2}
                            className="input-field text-xs"
                          />
                          <div className="mt-1 flex gap-1">
                            <button
                              className="btn-gold !py-1 !px-2 text-[11px]"
                              onClick={() => verifySeguimiento(sel.id, s.id, segVerify.nota)}
                            >
                              ✓ Verificar
                            </button>
                            <button
                              className="btn-outline !py-1 !px-2 text-[11px]"
                              onClick={() => setSegVerify({ id: null, nota: '' })}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div className="panel-2 rounded-lg p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                📝 Notas de la cotización
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Agregar nota..."
                className="input-field mb-2 min-h-[60px]"
              />
              <button onClick={addNoteToQuote} className="btn-gold w-full">
                + Agregar nota
              </button>
              <div className="mt-3 space-y-2 text-xs">
                {(sel.notes_arr || []).length === 0 && (
                  <p className="italic text-muted">Sin notas.</p>
                )}
                {(sel.notes_arr || []).map((n, i) => (
                  <div
                    key={i}
                    className="rounded border-l-2 border-gold-accent bg-brand-bg/40 p-2 pl-3"
                  >
                    <p className="text-white">{n.text}</p>
                    <p className="mt-1 text-[10px] text-muted">{n.by} · {fmtDate(n.at)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón PDF */}
            <button onClick={() => downloadPDF(sel)} className="btn-outline w-full">
              📄 PDF
            </button>
          </div>
        )}
      </SlidePanel>

      {/* Modal nueva cotización */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Nueva cotización"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
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
                      <Input type="number" readOnly value={it.price} title="Precio desde lista (no editable)" className="!text-xs cursor-not-allowed bg-brand-navy/40" />
                    </div>
                    <button className="col-span-1 text-lg text-red-400" onClick={() => rmItem(i)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <FormGrid cols={2}>
              <Field label="Descuento % *">
                <Input type="number" min="0" max="100" value={form.discount} onChange={(e) => setF('discount', Number(e.target.value))} />
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
    </div>
  );
}
