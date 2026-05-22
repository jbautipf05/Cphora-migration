import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Chip } from '../components/ui';
import { fmtDate, today, daysBetween, nowISO } from '../lib/format';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Field, Input, Select, Textarea, FormGrid } from '../components/form';
import { IconShield, IconPhone, IconCheck, IconUsers } from '../components/icons';

// ─────────────────────────────────────────────────────────────────────────────
// Postventa — espejo del HTML demo:
//   KPIs (Vencidos, Próximos, Completados, NPS) · Alertas por asesor
//   · Tabla "Pendientes (vencidos)" · "Próximos (programados)"
//   · Historial de contactos directos (registrar contacto manual)
// ─────────────────────────────────────────────────────────────────────────────
export default function Postventa() {
  const { postSales, setState, currentUser, nextId, add } = useApp();
  const toast = useToast();
  const [contactForm, setContactForm] = useState(null);
  const [completeForm, setCompleteForm] = useState(null); // { id, nps, notes }

  // Separar por estado contra hoy.
  const vencidos = useMemo(
    () =>
      postSales.filter((p) => {
        if (p.estado === 'completado') return false;
        const dd = daysBetween(today(), p.fechaObjetivo);
        return dd != null && dd <= 0;
      }),
    [postSales],
  );

  const proximos = useMemo(
    () =>
      postSales.filter((p) => {
        if (p.estado === 'completado') return false;
        const dd = daysBetween(today(), p.fechaObjetivo);
        return dd == null || dd > 0;
      }),
    [postSales],
  );

  const completados = postSales.filter((p) => p.estado === 'completado');

  // Alertas por asesor (cuántos vencidos / próximos tiene cada uno).
  const alertasPorAsesor = useMemo(() => {
    const map = {};
    for (const p of postSales) {
      if (p.estado === 'completado') continue;
      const dd = daysBetween(today(), p.fechaObjetivo);
      const key = p.asesor || '—';
      if (!map[key]) map[key] = { vencidos: 0, proximos: 0 };
      if (dd != null && dd <= 0) map[key].vencidos++;
      else map[key].proximos++;
    }
    return Object.entries(map).filter(([, v]) => v.vencidos > 0 || v.proximos > 0);
  }, [postSales]);

  // Historial de contactos completados con notas + NPS.
  const historial = useMemo(
    () =>
      completados
        .filter((p) => p.notes && p.notes.trim())
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 50),
    [completados],
  );

  const npsList = completados.filter((p) => p.nps != null).map((p) => p.nps);
  const npsProm = npsList.length
    ? (npsList.reduce((a, b) => a + b, 0) / npsList.length).toFixed(1)
    : '—';

  const completar = (p) => {
    setCompleteForm({ id: p.id, nps: 9, notes: '' });
  };
  const saveComplete = () => {
    setState((s) => ({
      ...s,
      postSales: s.postSales.map((p) =>
        p.id === completeForm.id
          ? {
              ...p,
              estado: 'completado',
              date: today(),
              nps: Number(completeForm.nps) || null,
              notes: completeForm.notes || '',
              completadoBy: currentUser?.name || 'Sistema',
            }
          : p,
      ),
    }));
    toast('Postventa completada', 'ok');
    setCompleteForm(null);
  };

  const saveContact = () => {
    if (!contactForm.clientName?.trim()) return toast('Indica el cliente', 'warn');
    const id = nextId('PS', 'ps', 2) || `PS-${Date.now().toString(36)}`;
    add('postSales', {
      id,
      orderId: contactForm.orderId || null,
      customerId: contactForm.customerId || null,
      clientName: contactForm.clientName,
      asesor: contactForm.asesor || currentUser?.name || '—',
      hito: 'directo',
      type: contactForm.type || 'llamada',
      date: today(),
      fechaObjetivo: today(),
      estado: 'completado',
      notes: contactForm.notes || '',
      nps: Number(contactForm.nps) || null,
    });
    toast('Contacto registrado', 'ok');
    setContactForm(null);
  };

  const hitoLabel = (h) =>
    h === '7d' ? 'Seguimiento 1 semana' : h === '6m' ? 'Seguimiento 6 meses' : h === '12m' ? 'Seguimiento 12 meses' : h === 'directo' ? 'Contacto directo' : h;
  const hitoColor = (h) =>
    h === '7d' ? 'danger' : h === '6m' ? 'info' : h === '12m' ? 'gold' : 'gray';

  const npsColor = (n) =>
    n == null ? 'text-muted' : n <= 6 ? 'text-red-300' : n <= 8 ? 'text-amber-300' : 'text-emerald-300';

  const renderRow = (p, isVencido) => {
    const dd = daysBetween(today(), p.fechaObjetivo);
    return (
      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-2">
            <Chip variant={hitoColor(p.hito)}>{p.hito}</Chip>
            <span className="text-xs text-white">{hitoLabel(p.hito)}</span>
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gold-accent">{p.orderId || '—'}</td>
        <td className="px-4 py-3 text-white">{p.clientName}</td>
        <td className="px-4 py-3 text-muted">{p.asesor || '—'}</td>
        <td className="px-4 py-3 text-muted">{fmtDate(p.fechaObjetivo)}</td>
        <td className={`px-4 py-3 font-semibold ${isVencido ? 'text-red-300' : 'text-sky-300'}`}>
          {dd == null ? '—' : dd <= 0 ? `Vencido ${Math.abs(dd)}d` : `${dd}d`}
        </td>
        <td className="px-4 py-3">
          <Chip variant={isVencido ? 'danger' : 'info'}>
            {isVencido ? 'pendiente' : 'programado'}
          </Chip>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => completar(p)}
            className="text-xs text-emerald-300 hover:underline"
          >
            ✓ Completar
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Vencidos (pendientes)"
          value={vencidos.length}
          hint={vencidos.length > 0 ? 'Acción urgente' : 'Sin pendientes'}
          accent="#ef4444"
          icon={<IconShield width={18} height={18} />}
        />
        <KpiCard
          label="Próximos"
          value={proximos.length}
          hint="Programados a futuro"
          accent="#C9A961"
          icon={<IconPhone width={18} height={18} />}
        />
        <KpiCard
          label="Completados"
          value={completados.length}
          hint="Histórico"
          accent="#10b981"
          icon={<IconCheck width={18} height={18} />}
        />
        <KpiCard
          label="NPS promedio"
          value={npsProm}
          hint={`${npsList.length} contactos`}
          accent="#3b82f6"
          icon={<IconUsers width={18} height={18} />}
        />
      </div>

      {/* Alertas a asesores */}
      <div className="panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Alertas a asesores</h3>
        {alertasPorAsesor.length === 0 ? (
          <p className="text-xs text-muted">Sin alertas activas — todos al día.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alertasPorAsesor.map(([asesor, v]) => (
              <div
                key={asesor}
                className="panel-2 rounded p-3 text-xs"
                style={v.vencidos > 0 ? { borderLeft: '3px solid #ef4444' } : undefined}
              >
                <p className="font-semibold text-white">{asesor}</p>
                {v.vencidos > 0 && (
                  <p className="text-red-300">
                    <span className="font-bold">{v.vencidos}</span> vencidos
                  </p>
                )}
                {v.proximos > 0 && (
                  <p className="text-muted">{v.proximos} próximos</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabla Pendientes (vencidos) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span> Pendientes (vencidos)
          </h3>
          <button
            onClick={() =>
              setContactForm({
                clientName: '',
                asesor: currentUser?.name || '',
                type: 'llamada',
                notes: '',
                nps: 9,
              })
            }
            className="rounded-lg border border-brand-border px-3 py-1.5 text-xs text-muted transition hover:border-gold-accent hover:text-white"
          >
            + Registrar contacto directo
          </button>
        </div>
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Hito</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Asesor</th>
                  <th className="px-4 py-3">Fecha objetivo</th>
                  <th className="px-4 py-3">Días</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {vencidos.map((p) => renderRow(p, true))}
                {vencidos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      Sin pendientes vencidos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabla Próximos (programados) */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          📅 Próximos (programados)
        </h3>
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Hito</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Asesor</th>
                  <th className="px-4 py-3">Fecha objetivo</th>
                  <th className="px-4 py-3">Días</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {proximos.map((p) => renderRow(p, false))}
                {proximos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      Sin próximos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historial de contactos directos */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-white">Historial de contactos directos</h3>
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3 text-right">NPS</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-muted">{fmtDate(p.date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gold-accent">{p.orderId || '—'}</td>
                    <td className="px-4 py-3">
                      <Chip variant="info">{p.type || 'llamada'}</Chip>
                    </td>
                    <td className="px-4 py-3 text-white">{p.notes}</td>
                    <td className={`px-4 py-3 text-right font-bold ${npsColor(p.nps)}`}>
                      {p.nps ?? '—'}
                    </td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      Sin historial de contactos directos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Completar */}
      <Modal
        open={!!completeForm}
        onClose={() => setCompleteForm(null)}
        title="Completar postventa"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setCompleteForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveComplete}>Guardar</button>
          </>
        }
      >
        {completeForm && (
          <FormGrid cols={1}>
            <Field label="NPS (0-10)">
              <Input
                type="number"
                min="0"
                max="10"
                value={completeForm.nps}
                onChange={(e) => setCompleteForm((f) => ({ ...f, nps: e.target.value }))}
              />
            </Field>
            <Field label="Notas del contacto">
              <Textarea
                rows={3}
                value={completeForm.notes}
                onChange={(e) => setCompleteForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="¿Qué dijo el cliente?"
              />
            </Field>
          </FormGrid>
        )}
      </Modal>

      {/* Modal Registrar contacto directo */}
      <Modal
        open={!!contactForm}
        onClose={() => setContactForm(null)}
        title="Registrar contacto directo"
        footer={
          <>
            <button className="btn-outline" onClick={() => setContactForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveContact}>Guardar</button>
          </>
        }
      >
        {contactForm && (
          <FormGrid cols={2}>
            <Field label="Cliente" className="sm:col-span-2">
              <Input
                value={contactForm.clientName}
                onChange={(e) => setContactForm((f) => ({ ...f, clientName: e.target.value }))}
              />
            </Field>
            <Field label="Pedido (opcional)">
              <Input
                value={contactForm.orderId || ''}
                onChange={(e) => setContactForm((f) => ({ ...f, orderId: e.target.value }))}
              />
            </Field>
            <Field label="Tipo">
              <Select
                value={contactForm.type}
                onChange={(e) => setContactForm((f) => ({ ...f, type: e.target.value }))}
              >
                {['llamada', 'whatsapp', 'correo', 'visita'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Asesor">
              <Input
                value={contactForm.asesor}
                onChange={(e) => setContactForm((f) => ({ ...f, asesor: e.target.value }))}
              />
            </Field>
            <Field label="NPS">
              <Input
                type="number"
                min="0"
                max="10"
                value={contactForm.nps}
                onChange={(e) => setContactForm((f) => ({ ...f, nps: e.target.value }))}
              />
            </Field>
            <Field label="Notas" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={contactForm.notes}
                onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Field>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
