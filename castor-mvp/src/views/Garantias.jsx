import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP, fmtDate, today, nowISO, addDays } from '../lib/format';
import { Toolbar, DataTable, SlidePanel } from '../components/widgets';
import { IconShield, IconCheck, IconDoc } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, Textarea, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const ESTADOS = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];
// Causales del HTML Demo6 (GAR_CAUSALES, línea 6812).
const CAUSALES = ['Detalle de pintura', 'Maltrato logística', 'Golpes', 'Espuma vencida', 'Pegas abiertas', 'Costura', 'Tela en mal estado', 'Pieza desajustada', 'Desnivelado', 'Error en medidas', 'Estructura', 'Otros'];
const VIAS = [
  { v: 'llamada', label: '📞 Llamada' },
  { v: 'whatsapp', label: '💬 WhatsApp' },
  { v: 'correo', label: '✉ Correo' },
  { v: 'visita', label: '🏠 Visita' },
  { v: 'nota', label: '📝 Nota' },
];
const VIA_ICON = { llamada: '📞', whatsapp: '💬', correo: '✉', visita: '🏠', nota: '📝' };

const empty = () => ({
  orderId: '', clientName: '', comercial: '', motivo: '', causal: 'Costura',
  asignado: 'Taller Interno', estado: 'abierta',
});

export default function Garantias() {
  const { warranties, orders, products, customers, update, add, nextId, currentUser, postWarrantyCost, pendingForm, setPendingForm } = useApp();
  const toast = useToast();
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(null);
  const [comm, setComm] = useState({ via: 'llamada', texto: '' });
  const [costForm, setCostForm] = useState(null); // { warrantyId, concept, amount, source }

  const sel = warranties.find((w) => w.id === selId) || null;

  // Intent del header "+ Nuevo" → abrir el form de nueva garantía (H-001).
  useEffect(() => {
    if (pendingForm?.type === 'garantia') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(empty());
      setPendingForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingForm]);

  const kpis = useMemo(() => ({
    abiertos: warranties.filter((w) => w.estado !== 'cerrada' && w.estado !== 'resuelta').length,
    cerrados: warranties.filter((w) => w.estado === 'cerrada' || w.estado === 'resuelta').length,
    total: warranties.length,
  }), [warranties]);

  const changeEstado = (id, estado) => update('warranties', id, { estado });

  // Edita un campo simple de la garantía (cronología, estado, resolución).
  const updateField = (id, field, value) => {
    update('warranties', id, { [field]: value });
    if (field === 'estado') toast(`${id} → ${value.replace('_', ' ')}`, 'ok');
  };

  // Cierra el caso: estado=cerrada + fecha de cierre, y cierra el panel.
  const cerrarCaso = (id) => {
    update('warranties', id, { estado: 'cerrada', cierreAt: today() });
    toast(`${id} cerrada`, 'ok');
    setSelId(null);
  };

  // Comunicaciones (espejo de addWarrantyComm, Demo6:7075). Se prepende al historial.
  const addComm = (id) => {
    if (!comm.texto.trim()) return toast('Escribe el detalle', 'warn');
    update('warranties', id, (w) => ({
      comunicaciones: [
        { at: nowISO(), by: currentUser?.name || 'Comercial', via: comm.via, texto: comm.texto.trim() },
        ...(w.comunicaciones || []),
      ],
    }));
    setComm({ via: 'llamada', texto: '' });
    toast('Comunicación registrada', 'ok');
  };

  // Fotos mock (espejo de attachWarrantyPhoto/removeWarrantyPhoto, Demo6:7060-7073).
  // Subida real de archivos = fase Supabase Storage; aquí se simula el nombre.
  const attachPhoto = (id, current) => {
    const filename = `evidencia-${(current || []).length + 1}.jpg`;
    update('warranties', id, (w) => ({
      fotos: [...(w.fotos || []), { filename, size: `${(Math.random() * 4 + 0.5).toFixed(2)} MB`, uploadedAt: nowISO() }],
    }));
    toast('Foto adjuntada', 'ok');
  };
  const removePhoto = (id, idx) =>
    update('warranties', id, (w) => ({ fotos: (w.fotos || []).filter((_, i) => i !== idx) }));

  // Genera una OP de garantía desde el caso (espejo de generarOpDesdeGarantia,
  // Demo6:6882). Crea un pedido tipo:'garantia' que fluye por Producción.
  function generarOp(w) {
    if (w.estado !== 'abierta') return toast('La OP sólo se genera con el caso ABIERTO', 'warn');
    if (w.generatedOpId) return toast(`Ya existe OP ${w.generatedOpId}`, 'info');
    const opId = nextId('OP', 'op');
    const p = products.find((x) => x.id === w.productId);
    const areas = p?.areas && p.areas.length ? p.areas : ['Ebanistería', 'Listo'];
    add('orders', {
      id: opId, pedidoId: null, quoteId: null, customerId: null, clientName: w.clientName,
      total: 0, paid: 0, tiempo: 15, orderDate: today(), dueDate: addDays(today(), 15),
      estado: 'produccion', area: areas[0] || 'Ebanistería', asesor: w.comercial || w.asesor || '',
      tipo: 'garantia', verified: true, docType: 'remisión',
      productId: w.productId, qty: Number(w.qty) || 1, garantiaId: w.id,
      costosManual: [], comment: `Garantía ${w.id} · Causal: ${w.causal || '—'} · ${w.motivo || ''}`,
    });
    update('warranties', w.id, { generatedOpId: opId });
    toast(`OP ${opId} creada desde ${w.id} · cargar costos manual`, 'ok');
  }

  // Agrega un costo manual a la OP de garantía y dispara postWarrantyCost
  // (espejo de cargarCostoGarantiaOp, Demo6:6904). Actualiza también el total de la OP.
  function saveCosto() {
    if (!costForm.concept.trim()) return toast('Indica el concepto', 'warn');
    const amount = Number(costForm.amount) || 0;
    if (amount <= 0) return toast('Monto inválido', 'warn');
    const w = warranties.find((x) => x.id === costForm.warrantyId);
    if (!w || !w.generatedOpId) return toast('Primero genera la OP', 'warn');
    const ceId = nextId('WCE', 'wce', 3);
    const costEntry = {
      id: ceId, concept: costForm.concept.trim(), description: costForm.concept.trim(),
      amount, source: costForm.source, at: nowISO(), date: today(), by: currentUser?.name || '—',
    };
    update('warranties', w.id, (ww) => ({ opCostos: [...(ww.opCostos || []), costEntry] }));
    update('orders', w.generatedOpId, (o) => ({
      costosManual: [...(o.costosManual || []), { concept: costEntry.concept, amount, at: costEntry.at }],
      total: (o.total || 0) + amount,
    }));
    const res = postWarrantyCost(w, costEntry);
    if (res?.ok) toast(`Costo "${costEntry.concept}" · asiento ${res.journalEntry.id}`, 'ok');
    else toast(`Costo agregado (aviso contable: ${res?.message || res?.error || '—'})`, 'warn');
    setCostForm(null);
  }

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function save() {
    if (!form.orderId) return toast('Selecciona el pedido', 'warn');
    if (!form.motivo.trim()) return toast('Indica el motivo', 'warn');
    const id = nextId('GAR', 'gar', 3);
    add('warranties', {
      id, ...form, comercial: form.comercial || form.asesor || '',
      reportedAt: today(), diagnosticoAt: '', solucionAt: '', cierreAt: '',
      resolucion: '', comunicaciones: [], fotos: [], generatedOpId: null, opCostos: [],
    });
    toast(`Garantía ${id} registrada`, 'ok');
    setForm(null);
  }
  const onOrder = (orderId) => {
    const o = orders.find((x) => x.id === orderId);
    setForm((f) => ({ ...f, orderId, clientName: o?.clientName || '', comercial: o?.asesor || '', productId: o?.productId || '' }));
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-brand-gold">{r.id}</span> },
    { key: 'orderId', label: 'Pedido', render: (r) => <span className="text-brand-muted">{r.orderId}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{r.clientName}</span> },
    { key: 'motivo', label: 'Motivo', render: (r) => <span className="text-brand-muted">{r.motivo}</span> },
    { key: 'reportado', label: 'Reportado', render: (r) => <span className="text-brand-muted">{fmtDate(r.reportedAt)}</span> },
    { key: 'asignado', label: 'Asignado', render: (r) => <span className="text-brand-muted">{r.asignado}</span> },
    {
      key: 'estado', label: 'Estado',
      render: (r) => (
        <select
          value={r.estado}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => changeEstado(r.id, e.target.value)}
          className="rounded-lg border border-brand-border bg-brand-bg/60 px-2 py-1 text-xs text-white outline-none focus:border-brand-gold"
        >
          {ESTADOS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      ),
    },
  ];

  const selOrder = sel ? orders.find((o) => o.id === sel.orderId) || {} : {};
  const selProduct = sel ? products.find((p) => p.id === (sel.productId || selOrder.productId)) || {} : {};
  const selCust = sel ? customers.find((c) => c.id === selOrder.customerId) || {} : {};

  return (
    <div className="page space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Abiertos" value={kpis.abiertos} hint="En gestión" accent="#f59e0b" icon={<IconShield width={18} height={18} />} />
        <KpiCard label="Cerrados" value={kpis.cerrados} hint="Resueltos" accent="#10b981" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="Total" value={kpis.total} hint="Acumulado" accent="#C9A961" icon={<IconDoc width={18} height={18} />} />
      </div>

      <Toolbar>
        <span className="text-xs italic text-brand-muted">Los casos de garantía los reporta el equipo comercial responsable de cada venta.</span>
        <span className="ml-auto text-sm text-brand-muted">{warranties.length} garantías</span>
        <button className="btn-gold" onClick={() => setForm(empty())}>+ Nuevo caso</button>
      </Toolbar>

      <DataTable columns={columns} rows={warranties} getKey={(r) => r.id} onRowClick={(r) => setSelId(r.id)} empty="Sin garantías reportadas." />

      <SlidePanel open={!!sel} onClose={() => setSelId(null)} title={sel?.id} subtitle={sel ? `${sel.clientName} · ${sel.estado.replace('_', ' ')}` : ''}>
        {sel && (
          <div className="space-y-5">
            {/* Cliente + Pedido afectado */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase text-brand-muted">Cliente</p>
                <p className="font-semibold text-white">{sel.clientName}</p>
                <p className="text-xs text-brand-muted">📱 {selCust.phone || '—'} · ✉ {selCust.email || '—'}</p>
                <p className="text-xs text-brand-muted">📍 {selCust.city || '—'}</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase text-brand-muted">Pedido afectado</p>
                <p className="font-mono text-xs text-brand-gold">{sel.orderId}</p>
                <p className="text-sm text-white">{selProduct.name || '—'}</p>
                <p className="text-xs text-brand-muted">{fmtCOP(selOrder.total || 0)}</p>
              </div>
            </div>

            {/* Motivo + responsables */}
            <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 text-sm">
              <p className="text-[11px] uppercase text-brand-muted">Motivo del reporte</p>
              <p className="text-white">{sel.motivo}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-brand-muted">Comercial: </span><span className="text-white">{sel.comercial || '—'}</span></div>
                <div><span className="text-brand-muted">Causal: </span><span className="text-white">{sel.causal || '—'}</span></div>
                <div><span className="text-brand-muted">Asignado a: </span><span className="text-white">{sel.asignado || '—'}</span></div>
              </div>
            </div>

            {/* Cronología (4 fechas) + estado + resolución */}
            <div className="panel-2 rounded-lg p-4">
              <p className="mb-3 text-sm font-semibold gold-title">⏱ Cronología</p>
              <div className="grid grid-cols-2 gap-3">
                {[['Reporte', 'reportedAt'], ['Diagnóstico', 'diagnosticoAt'], ['Solución', 'solucionAt'], ['Cierre', 'cierreAt']].map(([label, field]) => (
                  <Field key={field} label={label}>
                    <Input type="date" value={sel[field] || ''} onChange={(e) => updateField(sel.id, field, e.target.value)} className="!py-1 text-xs" />
                  </Field>
                ))}
              </div>
              <div className="mt-3">
                <Field label="Estado">
                  <Select value={sel.estado} onChange={(e) => updateField(sel.id, 'estado', e.target.value)} className="!py-1 text-xs">
                    {ESTADOS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Resolución / notas internas">
                  <Textarea rows={3} value={sel.resolucion || ''} onChange={(e) => updateField(sel.id, 'resolucion', e.target.value)} placeholder="Describa diagnóstico y acciones…" />
                </Field>
              </div>
            </div>

            {/* Evidencia fotográfica (mock) */}
            <div className="panel-2 rounded-lg p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold gold-title">📷 Evidencia fotográfica</p>
                <button onClick={() => attachPhoto(sel.id, sel.fotos)} className="btn-outline !py-1 !px-3 text-xs">📎 Adjuntar foto</button>
              </div>
              {(sel.fotos || []).length ? (
                <div className="flex flex-wrap gap-2">
                  {sel.fotos.map((f, i) => (
                    <span key={i} className="flex items-center gap-2 rounded bg-sky-500/15 px-2 py-1 text-[11px] text-sky-300">
                      <span>📷 {f.filename}</span>
                      <button onClick={() => removePhoto(sel.id, i)} className="text-red-400 hover:text-red-300">×</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-brand-muted">Sin fotos adjuntadas</p>
              )}
            </div>

            {/* Historial de comunicación */}
            <div className="panel-2 rounded-lg p-4">
              <p className="mb-3 text-sm font-semibold gold-title">💬 Historial de comunicación</p>
              <div className="mb-3 max-h-48 space-y-2 overflow-y-auto scrollbar-thin">
                {(sel.comunicaciones || []).length ? (
                  sel.comunicaciones.map((c, i) => (
                    <div key={i} className="rounded border border-brand-border bg-brand-bg/40 p-2">
                      <div className="flex justify-between text-[11px] text-brand-muted">
                        <span>{VIA_ICON[c.via] || '📝'} {c.via} · {c.by || '—'}</span>
                        <span>{fmtDate(c.at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-white">{c.texto}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-brand-muted">Sin comunicaciones registradas</p>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Select value={comm.via} onChange={(e) => setComm((c) => ({ ...c, via: e.target.value }))} className="col-span-1 !py-1 text-xs">
                  {VIAS.map((v) => <option key={v.v} value={v.v}>{v.label}</option>)}
                </Select>
                <Input value={comm.texto} onChange={(e) => setComm((c) => ({ ...c, texto: e.target.value }))} placeholder="Detalle…" className="col-span-2 !py-1 text-xs" />
                <button className="btn-gold !py-1 text-xs" onClick={() => addComm(sel.id)}>+ Registrar</button>
              </div>
            </div>

            {/* OP de garantía (costos manuales) → dispara postWarrantyCost */}
            <div className="panel-2 rounded-lg p-4" style={{ border: '1px solid #C9A961' }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold gold-title">🏭 OP de garantía (costos manuales)</p>
                {!sel.generatedOpId && sel.estado === 'abierta' && (
                  <button className="btn-gold !py-1 !px-3 text-xs" onClick={() => generarOp(sel)}>⚙ Generar OP</button>
                )}
              </div>
              {sel.generatedOpId ? (
                <>
                  <p className="mb-1 text-xs text-white">OP asociada: <span className="font-mono text-brand-gold">{sel.generatedOpId}</span></p>
                  <p className="mb-2 text-[11px] text-brand-muted">Producto: {selProduct.name || '—'} ×{sel.qty || 1} · Causal: {sel.causal || '—'}</p>
                  {(sel.opCostos || []).length ? (
                    <table className="mb-2 w-full text-xs">
                      <thead className="text-brand-muted">
                        <tr><th className="py-1 text-left">Concepto</th><th className="text-left">Fuente</th><th className="text-right">Monto</th><th className="text-right">Fecha</th></tr>
                      </thead>
                      <tbody>
                        {sel.opCostos.map((c) => (
                          <tr key={c.id} className="border-t border-brand-border">
                            <td className="py-1 text-white">{c.concept}</td>
                            <td className="text-brand-muted">{c.source === 'almacen' ? 'Almacén' : 'Caja'}</td>
                            <td className="text-right text-brand-gold-light">{fmtCOP(c.amount)}</td>
                            <td className="text-right text-brand-muted">{fmtDate((c.at || '').slice(0, 10))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="mb-2 text-[11px] italic text-brand-muted">Sin costos cargados aún</p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white">Total costos: <b className="text-brand-gold-light">{fmtCOP((sel.opCostos || []).reduce((a, c) => a + c.amount, 0))}</b></p>
                    <button className="btn-outline !py-1 !px-3 text-xs" onClick={() => setCostForm({ warrantyId: sel.id, concept: '', amount: '', source: 'caja' })}>+ Agregar costo</button>
                  </div>
                </>
              ) : sel.estado === 'abierta' ? (
                <p className="text-[11px] italic text-brand-muted">Al generar OP, los costos se cargarán manualmente.</p>
              ) : (
                <p className="text-[11px] italic text-amber-300">La OP sólo se genera cuando el caso está ABIERTO.</p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              <button className="btn-outline flex-1" onClick={() => setSelId(null)}>Cerrar</button>
              {sel.estado !== 'cerrada' && (
                <button className="btn-gold flex-1" onClick={() => cerrarCaso(sel.id)}>✓ Cerrar caso</button>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Nueva garantía"
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={save}>Guardar</button>
          </>
        }
      >
        {form && (
          <FormGrid cols={2}>
            <Field label="Pedido" className="sm:col-span-2">
              <Select value={form.orderId} onChange={(e) => onOrder(e.target.value)}>
                <option value="">Selecciona pedido…</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.clientName}</option>)}
              </Select>
            </Field>
            <Field label="Cliente"><Input value={form.clientName} onChange={(e) => setF('clientName', e.target.value)} /></Field>
            <Field label="Comercial"><Input value={form.comercial} onChange={(e) => setF('comercial', e.target.value)} /></Field>
            <Field label="Causal">
              <Select value={form.causal} onChange={(e) => setF('causal', e.target.value)}>
                {CAUSALES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Asignado a"><Input value={form.asignado} onChange={(e) => setF('asignado', e.target.value)} /></Field>
            <Field label="Motivo" className="sm:col-span-2"><Textarea rows={3} value={form.motivo} onChange={(e) => setF('motivo', e.target.value)} /></Field>
          </FormGrid>
        )}
      </Modal>

      {/* Modal: agregar costo manual a la OP de garantía */}
      <Modal
        open={!!costForm}
        onClose={() => setCostForm(null)}
        title="Agregar costo de garantía"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setCostForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveCosto}>Agregar</button>
          </>
        }
      >
        {costForm && (
          <FormGrid cols={1}>
            <Field label="Concepto"><Input value={costForm.concept} onChange={(e) => setCostForm((f) => ({ ...f, concept: e.target.value }))} placeholder="Tela, mano de obra, espuma…" /></Field>
            <Field label="Monto (COP)"><Input type="number" min="0" value={costForm.amount} onChange={(e) => setCostForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
            <Field label="Fuente del costo">
              <Select value={costForm.source} onChange={(e) => setCostForm((f) => ({ ...f, source: e.target.value }))}>
                <option value="caja">Caja menor (CR 110510)</option>
                <option value="almacen">Almacén / MP (CR 140505)</option>
              </Select>
            </Field>
            <p className="text-[11px] text-brand-muted">Genera asiento DB 519540 / CR {costForm.source === 'almacen' ? '140505' : '110510'}, con el cliente como tercero.</p>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
