import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP, fmtDate, nowISO, daysBetween, today } from '../lib/format';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, SlidePanel, ClearFiltersButton } from '../components/widgets';
import { IconDoc, IconCheck, IconBank } from '../components/icons';
import { useToast } from '../components/Toast';
import NuevaCotizacionModal, { genQuoteSeguimientos, subtotal, total } from '../components/NuevaCotizacionModal';

const ESTADOS = ['borrador', 'enviada', 'aceptada', 'rechazada'];

// Convierte una cotización existente al shape del form (para "Editar cotización":
// abre el modal prellenado). Nota: save() del modal crea una NUEVA cotización
// (comportamiento heredado, ver HALLAZGOS_EXTRA EX-06).
const quoteToForm = (qq) => ({
  leadId: qq.leadId || '', clientName: qq.clientName || '', city: qq.city || '',
  channel: qq.channel || 'Llamada', asesor: qq.asesor || '',
  items: qq.items?.length ? qq.items.map((it) => ({ ...it })) : [{ productId: '', qty: 1, price: 0, desc: '' }],
  discount: qq.discount || 0, vigenciaDias: qq.vigenciaDias || 30, notes: qq.notes || '',
  newLeadPhone: '', newLeadEmail: '', newLeadDoc: '', newLeadAddress: '',
});

export default function Cotizaciones({ onNavigate }) {
  const {
    quotes, orders, products, update, currentUser, pendingForm, setPendingForm,
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
  const [quoteModal, setQuoteModal] = useState(null); // null | {} | {leadId} | {initialForm}
  const [segVerify, setSegVerify] = useState({ id: null, nota: '' }); // verificar seguimiento

  const sel = quotes.find((x) => x.id === selId) || null;
  const canales = useMemo(() => [...new Set(quotes.map((x) => x.channel))], [quotes]);

  // Consume el intent del header/Leads ("+ Nueva cotización") → abre el modal.
  useEffect(() => {
    if (pendingForm?.type === 'quote') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuoteModal({ leadId: pendingForm.leadId || null });
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
        <button className="btn-gold" onClick={() => setQuoteModal({})}>+ Nueva cotización</button>
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
                  onClick={() => setQuoteModal({ initialForm: quoteToForm(sel) })}
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

      {/* Modal nueva cotización — componente reutilizable (H-010) */}
      <NuevaCotizacionModal
        open={!!quoteModal}
        leadId={quoteModal?.leadId || null}
        initialForm={quoteModal?.initialForm || null}
        onClose={() => setQuoteModal(null)}
        onCreated={(id) => setSelId(id)}
      />
    </div>
  );
}
