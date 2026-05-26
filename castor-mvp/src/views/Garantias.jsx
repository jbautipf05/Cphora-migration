import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtDate, today } from '../lib/format';
import { Toolbar, DataTable, EstadoBadge, SlidePanel } from '../components/widgets';
import { IconShield, IconCheck, IconDoc } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, Textarea, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const ESTADOS = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];
const CAUSALES = ['Costura', 'Estructura', 'Pintura', 'Tapicería', 'Herraje', 'Transporte', 'Otro'];

const empty = () => ({
  orderId: '', clientName: '', comercial: '', motivo: '', causal: 'Costura',
  asignado: 'Taller Interno', estado: 'abierta',
});

export default function Garantias() {
  const { warranties, orders, update, add, nextId, pendingForm, setPendingForm } = useApp();
  const toast = useToast();
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(null);

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

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function save() {
    if (!form.orderId) return toast('Selecciona el pedido', 'warn');
    if (!form.motivo.trim()) return toast('Indica el motivo', 'warn');
    const id = nextId('GAR', 'gar', 3);
    add('warranties', { id, ...form, reportedAt: today(), resolucion: '' });
    toast(`Garantía ${id} registrada`, 'ok');
    setForm(null);
  }
  const onOrder = (orderId) => {
    const o = orders.find((x) => x.id === orderId);
    setForm((f) => ({ ...f, orderId, clientName: o?.clientName || '', comercial: o?.asesor || '' }));
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

  return (
    <div className="page space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Abiertos" value={kpis.abiertos} hint="En gestión" accent="#f59e0b" icon={<IconShield width={18} height={18} />} />
        <KpiCard label="Cerrados" value={kpis.cerrados} hint="Resueltos" accent="#10b981" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="Total" value={kpis.total} hint="Acumulado" accent="#C9A961" icon={<IconDoc width={18} height={18} />} />
      </div>

      <Toolbar>
        <span className="ml-auto text-sm text-brand-muted">{warranties.length} garantías</span>
        <button className="btn-gold" onClick={() => setForm(empty())}>+ Nueva garantía</button>
      </Toolbar>

      <DataTable columns={columns} rows={warranties} getKey={(r) => r.id} onRowClick={(r) => setSelId(r.id)} empty="Sin garantías reportadas." />

      <SlidePanel open={!!sel} onClose={() => setSelId(null)} title={sel?.id} subtitle={sel ? `${sel.clientName} · ${sel.estado.replace('_', ' ')}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><EstadoBadge value={sel.estado} /></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Pedido', sel.orderId], ['Comercial', sel.comercial], ['Causal', sel.causal], ['Asignado a', sel.asignado], ['Reportado', fmtDate(sel.reportedAt)]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-brand-muted">{k}</p><p className="mt-0.5 text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 text-sm">
              <p className="text-[11px] uppercase text-brand-muted">Motivo</p>
              <p className="mt-0.5 text-white">{sel.motivo}</p>
            </div>
            <Field label="Resolución">
              <Textarea rows={3} value={sel.resolucion || ''} onChange={(e) => update('warranties', sel.id, { resolucion: e.target.value })} />
            </Field>
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
    </div>
  );
}
