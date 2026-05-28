import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Panel, Badge } from '../components/ui';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtCOP } from '../lib/format';
import { calcDepreciationPreview } from '../lib/accounting';

// Activos Fijos + Depreciación mensual.
// Portado de castor_accounting.js (renderActivosFijos:3891 + runMonthlyDepreciation:1875
// + postDepreciation:1938). Brief §7.12 y §4.1. CRUD de activos con categorías
// (oficina/computacion/transporte/construcciones/muebles/otros), método línea
// recta (vida útil en meses), corrida mensual idempotente, asiento DB gasto /
// CR acumulada por activo. Las cuentas se resuelven leyendo `accountingMappings.
// depreciation` (slice C3a) con fallback hardcoded — primer cableado real de TD-07.

const CATEGORIES = [
  { id: 'oficina', label: 'Oficina' },
  { id: 'computacion', label: 'Cómputo' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'construcciones', label: 'Construcciones' },
  { id: 'muebles', label: 'Muebles' },
  { id: 'otros', label: 'Otros' },
];

const USAGES = [
  { id: 'admin', label: 'Admin', tone: 'blue' },
  { id: 'sales', label: 'Ventas', tone: 'violet' },
  { id: 'cif', label: 'Producción (CIF)', tone: 'amber' },
];

const EMPTY_FORM = {
  name: '',
  category: 'oficina',
  usage: 'admin',
  cost: 0,
  salvageValue: 0,
  usefulLifeMonths: 60,
  depAcumulada: 0,
  estado: 'activo',
  startDate: '',
};

export default function ActivosFijos() {
  const {
    fixedAssets,
    depreciationRuns,
    fiscalPeriods,
    addFixedAsset,
    updateFixedAsset,
    removeFixedAsset,
    runDepreciation,
  } = useApp();
  const toast = useToast();

  // Modal nuevo/editar
  const [editingId, setEditingId] = useState(null); // null = closed, '' = new, 'AF-001' = editing
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Periodo para corrida de depreciación. Default: primer periodo abierto.
  const openPeriods = useMemo(
    () => (fiscalPeriods || []).filter((p) => p.estado !== 'cerrado').map((p) => p.id),
    [fiscalPeriods],
  );
  const [period, setPeriod] = useState(openPeriods[0] || '2026-04');
  const [confirmRun, setConfirmRun] = useState(false);

  // KPIs agregados
  const kpis = useMemo(() => {
    const list = fixedAssets || [];
    const active = list.filter((a) => a.estado === 'activo');
    const totalCost = list.reduce((s, a) => s + (+a.cost || 0), 0);
    const totalDepAcum = list.reduce((s, a) => s + (+a.depAcumulada || 0), 0);
    return {
      count: list.length,
      activeCount: active.length,
      totalCost,
      totalDepAcum,
      netBookValue: totalCost - totalDepAcum,
    };
  }, [fixedAssets]);

  // Preview de depreciación para el periodo seleccionado
  const preview = useMemo(
    () => calcDepreciationPreview(fixedAssets || [], period, depreciationRuns || []),
    [fixedAssets, depreciationRuns, period],
  );

  const sortedAssets = useMemo(
    () => [...(fixedAssets || [])].sort((a, b) => a.id.localeCompare(b.id)),
    [fixedAssets],
  );

  const sortedRuns = useMemo(
    () => [...(depreciationRuns || [])].sort((a, b) => b.periodId.localeCompare(a.periodId)),
    [depreciationRuns],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
  };
  const openEdit = (a) => {
    setForm({
      name: a.name || '',
      category: a.category || 'oficina',
      usage: a.usage || 'admin',
      cost: a.cost || 0,
      salvageValue: a.salvageValue || 0,
      usefulLifeMonths: a.usefulLifeMonths || 60,
      depAcumulada: a.depAcumulada || 0,
      estado: a.estado || 'activo',
      startDate: a.startDate || '',
    });
    setEditingId(a.id);
  };
  const close = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const onSave = () => {
    const cost = +form.cost || 0;
    const useful = +form.usefulLifeMonths || 0;
    if (!form.name.trim()) return toast('Nombre requerido', 'error');
    if (cost <= 0) return toast('Costo debe ser > 0', 'error');
    if (useful <= 0) return toast('Vida útil debe ser > 0 meses', 'error');

    const payload = {
      name: form.name.trim(),
      category: form.category,
      usage: form.usage,
      cost,
      salvageValue: +form.salvageValue || 0,
      usefulLifeMonths: useful,
      depAcumulada: +form.depAcumulada || 0,
      estado: form.estado,
      startDate: form.startDate || null,
    };

    if (editingId) {
      updateFixedAsset(editingId, payload);
      toast(`Activo ${editingId} actualizado`, 'ok');
    } else {
      const res = addFixedAsset(payload);
      if (res?.error) return toast(res.message || 'No se pudo crear', 'error');
      toast(`Activo ${res.id} creado`, 'ok');
    }
    close();
  };

  const onDelete = (id) => {
    removeFixedAsset(id);
    setConfirmDelete(null);
    toast(`Activo ${id} eliminado`, 'warn');
  };

  const onRun = () => {
    setConfirmRun(false);
    const res = runDepreciation(period);
    if (res?.error) return toast(res.message || `No se pudo correr ${period}`, 'error');
    if (res?.warning === 'already_run') return toast(`Depreciación ${period} ya corrida (${res.runId})`, 'warn');
    toast(`Depreciación ${period} contabilizada · ${fmtCOP(res.total)} · ${res.itemCount} activo(s) · ${res.journalEntryId}`, 'ok');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Activos" value={`${kpis.activeCount} / ${kpis.count}`} hint="activos / total" />
        <KpiCard label="Costo total" value={fmtCOP(kpis.totalCost)} hint="al alta" />
        <KpiCard label="Dep. acumulada" value={fmtCOP(kpis.totalDepAcum)} hint="histórica" accent="#fb923c" />
        <KpiCard label="Valor en libros" value={fmtCOP(kpis.netBookValue)} hint="costo − depreciación" accent="#C9A961" />
      </div>

      {/* Tabla CRUD de activos */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Activos fijos depreciables. Método línea recta (vida útil en meses); el residual no se deprecia.
          </p>
          <button className="btn-gold px-3 py-2 text-xs" onClick={openNew}>
            + Nuevo activo
          </button>
        </div>
        <Panel title="Catálogo de activos">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-2">ID</th>
                  <th className="py-2 pr-2">Nombre</th>
                  <th className="py-2 pr-2">Categoría</th>
                  <th className="py-2 pr-2">Uso</th>
                  <th className="py-2 pr-2 text-right">Costo</th>
                  <th className="py-2 pr-2 text-right">Residual</th>
                  <th className="py-2 pr-2 text-right">Vida útil</th>
                  <th className="py-2 pr-2 text-right">Dep. acum.</th>
                  <th className="py-2 pr-2 text-center">Estado</th>
                  <th className="py-2 pr-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssets.map((a) => {
                  const cat = CATEGORIES.find((c) => c.id === a.category);
                  const usg = USAGES.find((u) => u.id === a.usage);
                  const isConfirming = confirmDelete === a.id;
                  return (
                    <tr key={a.id} className="border-b border-white/5">
                      <td className="py-2 pr-2 font-mono text-xs text-brand-gold">{a.id}</td>
                      <td className="py-2 pr-2 text-white/80">{a.name}</td>
                      <td className="py-2 pr-2 text-xs text-muted">{cat?.label || a.category}</td>
                      <td className="py-2 pr-2">
                        <Badge tone={usg?.tone || 'muted'}>{usg?.label || a.usage}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{fmtCOP(a.cost)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-muted">{fmtCOP(a.salvageValue)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-muted">{a.usefulLifeMonths} m</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-amber-300">{fmtCOP(a.depAcumulada)}</td>
                      <td className="py-2 pr-2 text-center">
                        <Badge tone={a.estado === 'activo' ? 'green' : 'muted'}>{a.estado}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-[10px] text-amber-200">¿Eliminar?</span>
                            <button className="text-xs text-red-300 hover:underline" onClick={() => onDelete(a.id)}>
                              Sí
                            </button>
                            <button className="text-xs text-muted hover:underline" onClick={() => setConfirmDelete(null)}>
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-3">
                            <button className="text-xs text-brand-gold hover:underline" onClick={() => openEdit(a)}>
                              ✎ Editar
                            </button>
                            <button className="text-xs text-red-300 hover:underline" onClick={() => setConfirmDelete(a.id)}>
                              🗑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedAssets.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-xs text-muted">
                      Sin activos. Usa <b>+ Nuevo activo</b> para crear uno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Corrida mensual de depreciación */}
      <Panel
        title="Depreciación del mes"
        subtitle="Calcula y contabiliza la cuota lineal de cada activo activo (idempotente por periodo)."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              <span className="label">Periodo</span>
              <select
                className="input-field"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {openPeriods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {openPeriods.length === 0 && <option value="">— Sin periodos abiertos —</option>}
              </select>
            </label>
            <div className="text-xs text-muted">
              {preview.error && (
                <span className="text-red-300">
                  {preview.error === 'no_assets' && 'Sin activos activos.'}
                  {preview.error === 'no_assets_to_depreciate' && 'Ningún activo con cuota válida (todos topados).'}
                  {preview.error === 'invalid_period' && 'Periodo inválido.'}
                </span>
              )}
              {preview.warning === 'already_run' && (
                <span className="text-amber-300">
                  Ya hay corrida para {period} ({preview.runId}). Vuelve a correr cambiando de periodo.
                </span>
              )}
              {preview.ok && (
                <span>
                  Cuota total: <span className="font-semibold tabular-nums text-brand-gold">{fmtCOP(preview.total)}</span>{' '}
                  · <span className="text-white/80">{preview.items.length}</span> activo(s)
                </span>
              )}
            </div>
            <div className="ml-auto">
              {confirmRun ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                  <span className="text-xs text-amber-200">¿Correr y contabilizar {period}?</span>
                  <button className="btn-gold px-3 py-1 text-xs" onClick={onRun}>
                    Sí, correr
                  </button>
                  <button className="text-xs text-muted hover:underline" onClick={() => setConfirmRun(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  className="btn-gold px-3 py-2 text-xs disabled:opacity-50"
                  disabled={!preview.ok}
                  onClick={() => setConfirmRun(true)}
                >
                  Correr y contabilizar
                </button>
              )}
            </div>
          </div>

          {preview.ok && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-muted">
                    <th className="py-2 pr-2">Activo</th>
                    <th className="py-2 pr-2">Categoría / Uso</th>
                    <th className="py-2 pr-2 text-right">Dep. acum. previa</th>
                    <th className="py-2 pr-2 text-right">Cuota mes</th>
                    <th className="py-2 pr-2 text-right">Dep. acum. nueva</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((it) => (
                    <tr key={it.assetId} className="border-b border-white/5">
                      <td className="py-2 pr-2">
                        <span className="font-mono text-brand-gold">{it.assetId}</span>{' '}
                        <span className="text-white/70">· {it.assetName}</span>
                      </td>
                      <td className="py-2 pr-2 text-muted">
                        {it.category} · {it.usage}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-muted">{fmtCOP(it.depAcumPrev)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-brand-gold">{fmtCOP(it.monto)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{fmtCOP(it.depAcumNueva)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {/* Historial de corridas */}
      {sortedRuns.length > 0 && (
        <Panel title="Corridas anteriores">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-2">Run</th>
                  <th className="py-2 pr-2">Periodo</th>
                  <th className="py-2 pr-2">Corrido</th>
                  <th className="py-2 pr-2 text-right">Activos</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 pr-2">Asiento</th>
                </tr>
              </thead>
              <tbody>
                {sortedRuns.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2 pr-2 font-mono text-brand-gold">{r.id}</td>
                    <td className="py-2 pr-2 text-white/80">{r.periodId}</td>
                    <td className="py-2 pr-2 text-muted">{r.runAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-muted">{(r.items || []).length}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-brand-gold">{fmtCOP(r.total)}</td>
                    <td className="py-2 pr-2 font-mono text-xs text-muted">{r.journalEntryId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Modal nuevo/editar */}
      <Modal
        open={editingId !== null}
        onClose={close}
        size="md"
        title={editingId ? `Editar ${editingId}` : 'Nuevo activo fijo'}
        subtitle="Línea recta · vida útil en meses."
        footer={
          <>
            <button className="text-xs text-muted hover:underline" onClick={close}>
              Cancelar
            </button>
            <button className="btn-gold px-4 py-2 text-xs" onClick={onSave}>
              Guardar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Camioneta de despacho"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Uso</label>
              <select
                className="input-field"
                value={form.usage}
                onChange={(e) => setForm({ ...form, usage: e.target.value })}
              >
                {USAGES.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Costo (COP)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="input-field tabular-nums"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Valor residual</label>
              <input
                type="number"
                min="0"
                step="1"
                className="input-field tabular-nums"
                value={form.salvageValue}
                onChange={(e) => setForm({ ...form, salvageValue: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Vida útil (meses)</label>
              <input
                type="number"
                min="1"
                step="1"
                className="input-field tabular-nums"
                value={form.usefulLifeMonths}
                onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Dep. acumulada actual</label>
              <input
                type="number"
                min="0"
                step="1"
                className="input-field tabular-nums"
                value={form.depAcumulada}
                onChange={(e) => setForm({ ...form, depAcumulada: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select
                className="input-field"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo (dado de baja)</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha de inicio</label>
              <input
                type="date"
                className="input-field"
                value={form.startDate || ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
