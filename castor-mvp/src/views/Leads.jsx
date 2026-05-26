import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Chip, TIPO_LEAD } from '../components/ui';
import { fmtCOP, fmtDate, fmtDateTime, nowISO, daysBetween, today } from '../lib/format';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, SlidePanel, ClearFiltersButton } from '../components/widgets';
import Modal from '../components/Modal';
import NuevaCotizacionModal from '../components/NuevaCotizacionModal';
import { Field, Input, Select, Textarea, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';
import { IconBell, IconUsers } from '../components/icons';

const TIPOS_SEG = ['llamada', 'whatsapp', 'correo', 'visita'];

// Próximo seguimiento pendiente/programado más cercano (espejo del HTML).
const proxSeguimiento = (l) => {
  const segs = (l.seguimientos || []).filter(
    (s) => s.estado === 'pendiente' || s.estado === 'programado',
  );
  if (!segs.length) return null;
  return segs.sort((a, b) => (a.fechaProxima || '').localeCompare(b.fechaProxima || ''))[0];
};

// Chip de clasificación (alto/medio/bajo) — usa las clases de index.css.
function ClasifChip({ value }) {
  const cls =
    value === 'alto' ? 'chip-alto' : value === 'medio' ? 'chip-medio' : 'chip-bajo';
  return (
    <span className={`${cls} rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize`}>
      {value}
    </span>
  );
}

const ESTADOS = ['Nuevo', 'En gestión', 'Compro', 'No interesado'];
const CLASIF = ['alto', 'medio', 'bajo'];
const CHANNELS = ['Llamada', 'Pagina Web', 'Instagram', 'WhatsApp', 'Tienda 43', 'Feria', 'Referido'];
const ASESORES = ['Alexander Vivas', 'Thalia Cifuentes'];

const EMPTY = {
  name: '', tipo: 'lead', razonSocial: '', nit: '', contacto: '', phone: '', email: '', doc: '',
  address: '', city: '', channel: 'Llamada', clasificacion: 'medio', estado: 'Nuevo',
  asesor: '', valor: 0, productosInteres: [],
};

// Buscador de producto con autocompletado para "Productos de interés" del lead
// (reemplaza un <select> de cientos de items). Espejo de leadProductoRowHTML/
// filterLeadProductoList de Demo6. H-003.
function ProductPicker({ products, value, onChange }) {
  const selected = products.find((p) => p.id === value);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const t = q.toLowerCase().trim();
    return (t ? products.filter((p) => p.name.toLowerCase().includes(t)) : products).slice(0, 12);
  }, [products, q]);
  return (
    <div className="relative">
      <input
        className="input-field py-1 text-xs"
        placeholder="Buscar producto por nombre..."
        value={open ? q : selected?.name || ''}
        onFocus={() => { setOpen(true); setQ(''); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto scrollbar-thin rounded-lg border border-brand-border bg-brand-panel shadow-2xl">
          {results.length === 0 ? (
            <div className="p-2 text-center text-xs italic text-brand-muted">Sin coincidencias</div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => { onChange(p.id); setOpen(false); setQ(''); }}
                className="flex w-full justify-between gap-2 px-3 py-1.5 text-left text-xs text-brand-muted transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-white">{p.name}</span>
                <span className="text-brand-gold">{fmtCOP(p.price)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Leads() {
  const { leads, products, add, update, nextId, currentUser, pendingForm, setPendingForm } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [clasif, setClasif] = useState('');
  const [tipo, setTipo] = useState('');
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(null); // null | {…} (modal abierto)
  const [errors, setErrors] = useState({}); // errores de validación inline (H-004)
  const [note, setNote] = useState('');
  const [segForm, setSegForm] = useState({ tipo: 'llamada', fechaProxima: '', texto: '' });
  const [recontactForm, setRecontactForm] = useState(null); // {leadId, fecha, nota}
  const [quoteOpen, setQuoteOpen] = useState(false); // modal "Nueva cotización" en contexto (H-010)

  const sel = leads.find((l) => l.id === selId) || null;

  // Intent del header "+ Nuevo" → abrir el form de nuevo lead (H-001).
  useEffect(() => {
    if (pendingForm?.type === 'lead') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrors({});
      setForm({ ...EMPTY });
      setPendingForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingForm]);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return leads.filter((l) => {
      if (estado && l.estado !== estado) return false;
      if (clasif && l.clasificacion !== clasif) return false;
      if (tipo && l.tipo !== tipo) return false;
      if (t && !`${l.id} ${l.name} ${l.razonSocial || ''}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [leads, q, estado, clasif, tipo]);

  const hasFilters = !!(q || estado || clasif || tipo);
  const clearAll = () => { setQ(''); setEstado(''); setClasif(''); setTipo(''); };

  const kpis = useMemo(() => ({
    total: leads.length,
    gestion: leads.filter((l) => l.estado === 'En gestión').length,
    alto: leads.filter((l) => l.clasificacion === 'alto').length,
    valor: leads.reduce((a, l) => a + (l.valor || 0), 0),
  }), [leads]);

  // Leads marcados para recontactar (espejo de renderLeads HTML línea 3792).
  const recontactarLeads = useMemo(
    () =>
      leads
        .filter((l) => l.recontactar)
        .sort((a, b) => (a.recontactarFecha || '').localeCompare(b.recontactarFecha || '')),
    [leads],
  );

  // Setea un campo del form y limpia su error inline si lo tenía (H-004).
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  // Productos de interés (editor) + valor estimado auto (H-003).
  const addPI = () => setForm((f) => ({ ...f, productosInteres: [...(f.productosInteres || []), { productId: '', qty: 1 }] }));
  const setPI = (i, patch) =>
    setForm((f) => ({ ...f, productosInteres: (f.productosInteres || []).map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const rmPI = (i) => setForm((f) => ({ ...f, productosInteres: (f.productosInteres || []).filter((_, j) => j !== i) }));
  // Valor estimado = Σ(precio × cantidad), espejo de leadValorFromProductos de Demo6.
  const leadValor = (form?.productosInteres || []).reduce((s, it) => {
    const p = products.find((x) => x.id === it.productId);
    return s + (p ? p.price * (Number(it.qty) || 0) : 0);
  }, 0);

  // Valida los campos obligatorios del lead (espejo de los * de Demo6) + formato
  // de teléfono. Nota: Demo6 sólo usa `required` nativo (sin chequeo de dígitos);
  // el chequeo de teléfono se agrega por lógica (H-004). "Solo dígitos" se
  // interpreta como "sin letras + ≥7 dígitos" para no romper teléfonos con
  // espacios del seed ("300 555 1122").
  function validate(f) {
    const errs = {};
    if (!f.name.trim()) errs.name = 'El nombre es obligatorio';
    const phone = (f.phone || '').trim();
    const numDigits = (phone.match(/\d/g) || []).length;
    if (!phone) errs.phone = 'El teléfono es obligatorio';
    else if (/[a-zA-Z]/.test(phone)) errs.phone = 'El teléfono no puede contener letras';
    else if (numDigits < 7) errs.phone = 'El teléfono debe tener al menos 7 dígitos';
    if (!f.asesor) errs.asesor = 'Selecciona un asesor';
    return errs;
  }

  function save() {
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return toast('Revisa los campos marcados', 'warn');
    }
    setErrors({});
    const payload = { ...form, valor: leadValor, productosInteres: form.productosInteres || [] };
    if (form.id) {
      update('leads', form.id, payload);
      toast('Lead actualizado', 'ok');
    } else {
      const id = nextId('L', 'lead');
      add('leads', { ...payload, id, createdAt: nowISO(), notes: [] });
      toast(`Lead ${id} creado`, 'ok');
    }
    setForm(null);
  }

  function addNote() {
    if (!note.trim()) return;
    update('leads', selId, (l) => ({
      notes: [...(l.notes || []), { at: nowISO(), by: currentUser.name, text: note.trim() }],
    }));
    setNote('');
    toast('Nota agregada', 'ok');
  }

  function addSeguimiento() {
    if (!segForm.texto.trim() || !segForm.fechaProxima) {
      return toast('Tipo, fecha y descripción son obligatorios', 'warn');
    }
    update('leads', selId, (l) => ({
      seguimientos: [
        ...(l.seguimientos || []),
        {
          id: `S-${Date.now().toString(36)}`,
          at: nowISO(),
          by: currentUser.name,
          tipo: segForm.tipo,
          fechaProxima: segForm.fechaProxima,
          texto: segForm.texto.trim(),
          estado: 'pendiente',
        },
      ],
    }));
    setSegForm({ tipo: 'llamada', fechaProxima: '', texto: '' });
    toast('Seguimiento registrado', 'ok');
  }

  function completeSeguimiento(segId) {
    update('leads', selId, (l) => ({
      seguimientos: (l.seguimientos || []).map((s) =>
        s.id === segId
          ? { ...s, estado: 'completado', completadoAt: nowISO(), completadoBy: currentUser.name }
          : s,
      ),
    }));
    toast('Seguimiento marcado como completado', 'ok');
  }

  function saveRecontact() {
    if (!recontactForm.fecha) return toast('Indica la fecha', 'warn');
    update('leads', recontactForm.leadId, {
      recontactar: true,
      recontactarAt: nowISO(),
      recontactarBy: currentUser.name,
      recontactarFecha: recontactForm.fecha,
      recontactarNota: recontactForm.nota,
    });
    toast('Marcado para recontactar', 'ok');
    setRecontactForm(null);
  }
  function clearRecontact(leadId) {
    update('leads', leadId, {
      recontactar: false,
      recontactarClearedAt: nowISO(),
    });
    toast('Recontacto resuelto', 'ok');
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-gold">
          {r.id}
          {r.recontactar && (
            <IconBell
              width={12}
              height={12}
              className="text-amber-400"
              title="Contactar nuevamente"
            />
          )}
        </span>
      ),
    },
    { key: 'name', label: 'Nombre', render: (r) => <span className="text-white">{r.name}</span> },
    {
      key: 'tipo',
      label: 'Tipo',
      sortValue: (r) => r.tipo,
      render: (r) => <Chip variant={TIPO_LEAD[r.tipo] || 'gray'}>{r.tipo}</Chip>,
    },
    { key: 'channel', label: 'Canal', render: (r) => <span className="text-brand-muted">{r.channel}</span> },
    {
      key: 'clasificacion',
      label: 'Clasif.',
      sortValue: (r) => ({ alto: 3, medio: 2, bajo: 1 })[r.clasificacion] || 0,
      render: (r) => <ClasifChip value={r.clasificacion} />,
    },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-brand-muted">{r.asesor}</span> },
    {
      key: 'prox',
      label: 'Próx. seguimiento',
      sortValue: (r) => proxSeguimiento(r)?.fechaProxima || '',
      render: (r) => {
        const s = proxSeguimiento(r);
        if (!s) return <span className="text-brand-muted/50">—</span>;
        const dd = daysBetween(today(), s.fechaProxima);
        const color = dd <= 0 ? 'text-red-300' : dd <= 2 ? 'text-amber-300' : 'text-emerald-300';
        return (
          <span className={`text-xs ${color}`}>
            {fmtDate(s.fechaProxima)}
            <span className="ml-1 text-[10px] opacity-70">
              {dd === 0 ? 'hoy' : dd > 0 ? `+${dd}d` : `${dd}d`}
            </span>
          </span>
        );
      },
    },
    { key: 'valor', label: 'Valor est.', align: 'right', sortValue: (r) => r.valor, render: (r) => <span className="text-white">{fmtCOP(r.valor)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Leads totales" value={kpis.total} accent="#38bdf8" icon={<IconUsers width={18} height={18} />} />
        <KpiCard label="En gestión" value={kpis.gestion} accent="#C9A961" />
        <KpiCard label="Clasificación alta" value={kpis.alto} accent="#34d399" />
        <KpiCard label="Valor estimado" value={fmtCOP(kpis.valor)} accent="#a78bfa" />
      </div>

      {/* Recontactar — espejo del panel "Leads pendientes de recontactar" del HTML */}
      {recontactarLeads.length > 0 && (
        <div className="panel p-4" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-amber-300">
              <IconBell width={16} height={16} /> Pendientes de recontactar
            </h3>
            <span className="text-[11px] text-brand-muted">{recontactarLeads.length} lead(s)</span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {recontactarLeads.map((l) => {
              const dd = daysBetween(today(), l.recontactarFecha);
              const color =
                dd == null ? '#94a3b8' : dd <= 0 ? '#ef4444' : dd <= 2 ? '#f59e0b' : '#10b981';
              return (
                <button
                  key={l.id}
                  onClick={() => setSelId(l.id)}
                  className="panel-2 rounded p-3 text-left transition hover:border-amber-400/40"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{l.name}</div>
                      <div className="font-mono text-[10px] text-brand-muted">{l.id}</div>
                    </div>
                    {l.recontactarFecha && (
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] text-brand-muted">
                          {fmtDate(l.recontactarFecha)}
                        </div>
                        {dd != null && (
                          <div className="text-[10px]" style={{ color }}>
                            {dd === 0 ? 'hoy' : dd > 0 ? `+${dd}d` : `${dd}d`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {l.recontactarNota && (
                    <p className="mt-2 truncate text-[11px] italic text-brand-muted">
                      "{l.recontactarNota}"
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, razón social, ID…" />
        <SelectFilter value={estado} onChange={setEstado} options={ESTADOS} allLabel="Todos los estados" />
        <SelectFilter value={clasif} onChange={setClasif} options={CLASIF} allLabel="Toda clasificación" />
        <SelectFilter value={tipo} onChange={setTipo} options={['lead', 'institucional']} allLabel="Todos los tipos" />
        <ClearFiltersButton active={hasFilters} onClear={clearAll} />
        <span className="ml-auto text-sm text-brand-muted">{rows.length} leads</span>
        <button className="btn-gold" onClick={() => { setErrors({}); setForm({ ...EMPTY }); }}>+ Nuevo lead</button>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={(r) => setSelId(r.id)} />

      <SlidePanel
        open={!!sel}
        onClose={() => setSelId(null)}
        title={
          sel ? (
            <span className="block">
              <span className="inline-flex items-center gap-2">{sel.name}</span>
              {/* Dato secundario (razón social / empresa) bajo el nombre — espejo HTML 3910 (H-006) */}
              <span className="block text-sm font-normal text-brand-muted">
                {sel.tipo === 'institucional' ? (sel.razonSocial || '—') : (sel.company || '—')}
              </span>
            </span>
          ) : ''
        }
        subtitle={
          sel ? (
            <span className="inline-flex items-center gap-2 text-xs">
              <span className="font-mono">{sel.id}</span>
              <Chip variant={TIPO_LEAD[sel.tipo] || 'gray'}>{sel.tipo}</Chip>
              {sel.city && <span className="text-muted">· {sel.city}</span>}
            </span>
          ) : ''
        }
      >
        {sel && (
          <div className="space-y-5">
            {/* Campos grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Teléfono</p>
                <p className="mt-0.5 text-white">{sel.phone || '—'}</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Email</p>
                <p className="mt-0.5 truncate text-white">{sel.email || '—'}</p>
              </div>
              {sel.tipo === 'institucional' ? (
                <>
                  <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-brand-muted">NIT</p>
                    <p className="mt-0.5 text-white">{sel.nit || '—'}</p>
                  </div>
                  <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-brand-muted">Contacto</p>
                    <p className="mt-0.5 text-white">{sel.contacto || '—'}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-brand-muted">Documento</p>
                  <p className="mt-0.5 text-white">{sel.doc || '—'}</p>
                </div>
              )}
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Canal</p>
                <p className="mt-0.5 text-white">{sel.channel || '—'}</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Clasificación</p>
                <div className="mt-1">
                  <Chip variant={sel.clasificacion === 'alto' ? 'danger' : sel.clasificacion === 'medio' ? 'warn' : 'ok'}>
                    {sel.clasificacion}
                  </Chip>
                </div>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Estado</p>
                <select
                  value={sel.estado}
                  onChange={(e) => update('leads', sel.id, { estado: e.target.value })}
                  className="input-field mt-1 !py-1 text-xs"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Asesor</p>
                <p className="mt-0.5 text-white">{sel.asesor}</p>
              </div>
              <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-brand-muted">Valor estimado</p>
                <p className="mt-0.5 text-lg font-semibold text-brand-gold">{fmtCOP(sel.valor)}</p>
              </div>
            </div>

            {/* Productos de interés */}
            <div className="panel-2 rounded-lg p-3">
              <p className="mb-2 text-sm font-semibold text-brand-gold-light">Productos de interés</p>
              <div className="space-y-1.5">
                {(sel.productosInteres || []).length === 0 && (
                  <p className="text-sm text-brand-muted">Sin productos asociados.</p>
                )}
                {(sel.productosInteres || []).map((pi, i) => {
                  const p = products.find((x) => x.id === pi.productId);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-bg/40 px-3 py-2 text-sm"
                    >
                      <span className="text-white">
                        {p?.name || pi.productId} × {pi.qty}
                      </span>
                      <span className="text-brand-gold">{fmtCOP((p?.price || 0) * pi.qty)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recontactar panel */}
            {sel.recontactar && (
              <div className="panel-2 rounded-lg p-3" style={{ borderLeft: '3px solid #f59e0b', background: '#2d1f0e' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <IconBell width={14} height={14} /> Pendiente de contactar nuevamente
                    </div>
                    {sel.recontactarFecha && (
                      <div className="mt-1 text-[11px] text-brand-muted">
                        Fecha objetivo: <b className="text-white">{fmtDate(sel.recontactarFecha)}</b>
                      </div>
                    )}
                    {sel.recontactarNota && (
                      <p className="mt-1 truncate text-[11px] italic text-brand-muted">"{sel.recontactarNota}"</p>
                    )}
                    {sel.recontactarAt && (
                      <div className="mt-1 text-[10px] text-brand-muted">
                        Marcado {fmtDateTime(sel.recontactarAt)} por {sel.recontactarBy || '—'}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => clearRecontact(sel.id)}
                    className="btn-outline shrink-0 !py-1 !px-2 text-[11px]"
                  >
                    ✓ Contactado
                  </button>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-gold flex-1"
                onClick={() => setQuoteOpen(true)}
              >
                + Nueva cotización
              </button>
              <button className="btn-outline" onClick={() => { setErrors({}); setForm({ ...sel }); }}>
                ✎ Editar
              </button>
              <button
                className="btn-outline inline-flex items-center gap-1.5"
                style={{ borderColor: '#f59e0b', color: '#fbbf24' }}
                onClick={() => setRecontactForm({ leadId: sel.id, fecha: sel.recontactarFecha || '', nota: sel.recontactarNota || '' })}
              >
                <IconBell width={14} height={14} /> {sel.recontactar ? 'Editar recontacto' : 'Contactar nuevamente'}
              </button>
            </div>

            {/* Seguimientos */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gold-light/80">
                Seguimientos ({(sel.seguimientos || []).length})
              </p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Select
                  value={segForm.tipo}
                  onChange={(e) => setSegForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="!py-1 text-xs"
                >
                  {TIPOS_SEG.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Input
                  type="date"
                  value={segForm.fechaProxima}
                  onChange={(e) => setSegForm((f) => ({ ...f, fechaProxima: e.target.value }))}
                  className="!py-1 text-xs"
                />
                <Input
                  value={segForm.texto}
                  onChange={(e) => setSegForm((f) => ({ ...f, texto: e.target.value }))}
                  placeholder="Descripción…"
                  className="col-span-2 !py-1 text-xs"
                />
                <button className="btn-gold col-span-2 !py-1.5 text-xs" onClick={addSeguimiento}>
                  + Registrar seguimiento
                </button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin pr-1">
                {(sel.seguimientos || []).length === 0 && (
                  <p className="text-xs italic text-brand-muted">Sin seguimientos.</p>
                )}
                {[...(sel.seguimientos || [])]
                  .sort((a, b) => (b.fechaProxima || '').localeCompare(a.fechaProxima || ''))
                  .map((s) => {
                    const isCompleted = s.estado === 'completado';
                    const dd = daysBetween(today(), s.fechaProxima);
                    return (
                      <div
                        key={s.id}
                        className="rounded-lg border border-brand-border bg-brand-bg/40 p-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs capitalize text-white">{s.tipo}</span>
                          <Chip variant={isCompleted ? 'ok' : dd <= 0 ? 'danger' : 'info'}>
                            {isCompleted ? 'completado' : 'programado'}
                          </Chip>
                        </div>
                        <p className="mt-1 text-xs text-white/90">{s.texto}</p>
                        <p className="mt-1 text-[10px] text-brand-muted">
                          {fmtDate(s.fechaProxima)} · {s.by}
                        </p>
                        {!isCompleted && (
                          <button
                            onClick={() => completeSeguimiento(s.id)}
                            className="mt-1 text-[10px] text-emerald-300 hover:underline"
                          >
                            ✓ Marcar completado
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Historial de notas */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gold-light/80">
                Historial de notas
              </p>
              <div className="mb-3 flex gap-2">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar nota…" />
                <button className="btn-gold shrink-0" onClick={addNote}>Añadir</button>
              </div>
              <div className="space-y-2">
                {(sel.notes || []).length === 0 && <p className="text-sm text-brand-muted">Sin notas.</p>}
                {/* Notas más recientes primero (espejo de [...l.notes].reverse() de Demo6) — H-009 */}
                {[...(sel.notes || [])].reverse().map((n, i) => (
                  <div key={i} className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 text-sm">
                    <p className="text-white/90">{n.text}</p>
                    <p className="mt-1 text-[11px] text-brand-muted">{n.by} · {fmtDate(n.at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Modal Recontactar */}
      <Modal
        open={!!recontactForm}
        onClose={() => setRecontactForm(null)}
        title="🔔 Contactar nuevamente"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setRecontactForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveRecontact}>Guardar</button>
          </>
        }
      >
        {recontactForm && (
          <FormGrid cols={1}>
            <Field label="Fecha objetivo">
              <Input
                type="date"
                value={recontactForm.fecha}
                onChange={(e) => setRecontactForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </Field>
            <Field label="Nota / motivo">
              <Textarea
                rows={3}
                value={recontactForm.nota}
                onChange={(e) => setRecontactForm((f) => ({ ...f, nota: e.target.value }))}
                placeholder="Motivo del recontacto..."
              />
            </Field>
          </FormGrid>
        )}
      </Modal>

      {/* Modal crear / editar */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Editar ${form.id}` : 'Nuevo lead'}
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={save}>Guardar</button>
          </>
        }
      >
        {form && (
          <FormGrid cols={2}>
            <Field label="Nombre *" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              {errors.name && <span className="mt-1 block text-xs text-red-400">{errors.name}</span>}
            </Field>
            <Field label="Tipo *">
              <div className="flex gap-4 pt-1.5">
                <label className="flex items-center gap-2 text-sm text-white">
                  <input type="radio" name="lead-tipo" value="lead" checked={form.tipo === 'lead'} onChange={() => set('tipo', 'lead')} /> Lead
                </label>
                <label className="flex items-center gap-2 text-sm text-white">
                  <input type="radio" name="lead-tipo" value="institucional" checked={form.tipo === 'institucional'} onChange={() => set('tipo', 'institucional')} /> Lead institucional
                </label>
              </div>
            </Field>
            <Field label="Clasificación *">
              <Select value={form.clasificacion} onChange={(e) => set('clasificacion', e.target.value)}>
                {CLASIF.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            {form.tipo === 'institucional' && (
              <>
                <Field label="Razón social"><Input value={form.razonSocial} onChange={(e) => set('razonSocial', e.target.value)} /></Field>
                <Field label="NIT"><Input value={form.nit} onChange={(e) => set('nit', e.target.value)} /></Field>
                <Field label="Contacto"><Input value={form.contacto} onChange={(e) => set('contacto', e.target.value)} /></Field>
              </>
            )}
            <Field label="Teléfono *">
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              {errors.phone && <span className="mt-1 block text-xs text-red-400">{errors.phone}</span>}
            </Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Documento"><Input value={form.doc} onChange={(e) => set('doc', e.target.value)} /></Field>
            <Field label="Ciudad"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Dirección" className="sm:col-span-2"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Canal *">
              <Select value={form.channel} onChange={(e) => set('channel', e.target.value)}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Asesor *">
              <Select value={form.asesor} onChange={(e) => set('asesor', e.target.value)}>
                <option value="">— Elegir —</option>
                {ASESORES.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
              {errors.asesor && <span className="mt-1 block text-xs text-red-400">{errors.asesor}</span>}
            </Field>
            <Field label="Estado *">
              <Select value={form.estado} onChange={(e) => set('estado', e.target.value)}>
                {ESTADOS.map((e2) => <option key={e2} value={e2}>{e2}</option>)}
              </Select>
            </Field>

            {/* Productos de interés — editor con autocompletado (H-003) */}
            <div className="sm:col-span-2">
              <span className="label">Productos de interés</span>
              <div className="space-y-2">
                {(form.productosInteres || []).map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <ProductPicker products={products} value={it.productId} onChange={(id) => setPI(i, { productId: id })} />
                    </div>
                    <Input type="number" min="1" value={it.qty} onChange={(e) => setPI(i, { qty: Number(e.target.value) })} className="!w-20 !py-1 text-xs" />
                    <button type="button" onClick={() => rmPI(i)} className="text-lg text-brand-muted hover:text-red-400">×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addPI} className="btn-outline mt-2 !py-1 !text-xs">+ Agregar producto</button>
            </div>

            <Field label="Valor estimado (COP)" hint="Calculado de los productos de interés">
              <Input type="number" readOnly value={leadValor} title="Auto — no editable" className="cursor-not-allowed bg-brand-navy/40" />
            </Field>
          </FormGrid>
        )}
      </Modal>

      {/* Modal "Nueva cotización" en contexto del lead (H-010): abre sin salir de
          Leads; al guardar/cerrar volvés al perfil del lead. */}
      <NuevaCotizacionModal
        open={quoteOpen}
        leadId={sel?.id || null}
        onClose={() => setQuoteOpen(false)}
        onCreated={() => setQuoteOpen(false)}
      />
    </div>
  );
}
