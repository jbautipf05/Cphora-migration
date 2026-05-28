import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Badge } from '../components/ui';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

// C3b · Reglas tributarias (IVA / ReteFte / ReteIVA / ReteICA).
// Portado de castor_accounting.js:3018-3157 (renderConfigImpuestos + openTaxRuleForm
// + saveTaxRule + deleteTaxRule). CRUD de configuración: las reglas se persisten
// y la UI enforza "un solo default por tipo". El motor todavía no las consume —
// el cableado a postSale/postSupplyPurchase/postCustomerCollection es un refactor
// posterior, ligado al cableado de accountingMappings (C3a).

const TYPES = ['iva', 'rete_fuente', 'rete_iva', 'rete_ica'];
const TYPE_LABELS = { iva: 'IVA', rete_fuente: 'ReteFte', rete_iva: 'ReteIVA', rete_ica: 'ReteICA' };
const TYPE_TONES = { iva: 'blue', rete_fuente: 'violet', rete_iva: 'amber', rete_ica: 'green' };

const EMPTY_FORM = { id: '', type: 'iva', name: '', rate: 0, baseUVT: 0, account: '', isDefault: false };

const accountOf = (r) => r.account || r.account_generated || r.account_descontable || '';

export default function ReglasTributarias() {
  const { taxRules, pucAccounts, addTaxRule, updateTaxRule, removeTaxRule } = useApp();
  const toast = useToast();
  // editingId: null = modal cerrado; '' = nueva regla; 'IVA-19' = editando esa
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const auxAll = useMemo(
    () =>
      (pucAccounts || [])
        .filter((a) => a.level >= 6 && a.activa !== false)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [pucAccounts],
  );

  const sortedRules = useMemo(() => {
    return [...(taxRules || [])].sort((a, b) => {
      const ti = TYPES.indexOf(a.type) - TYPES.indexOf(b.type);
      if (ti !== 0) return ti;
      return a.id.localeCompare(b.id);
    });
  }, [taxRules]);

  const counts = useMemo(() => {
    const byType = {};
    for (const r of taxRules || []) byType[r.type] = (byType[r.type] || 0) + 1;
    return byType;
  }, [taxRules]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
  };

  const openEdit = (r) => {
    setForm({
      id: r.id,
      type: r.type,
      name: r.name || '',
      rate: r.rate ?? 0,
      baseUVT: r.baseUVT ?? 0,
      account: accountOf(r),
      isDefault: !!r.isDefault,
    });
    setEditingId(r.id);
  };

  const close = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const onSave = () => {
    const id = String(form.id || '').trim().toUpperCase();
    if (!id) {
      toast('ID requerido', 'error');
      return;
    }
    const name = String(form.name || '').trim();
    const rate = Math.max(0, Math.min(1, +form.rate || 0));
    const baseUVT = Math.max(0, Math.floor(+form.baseUVT || 0));
    const account = String(form.account || '').trim();

    // Convención del monolito: type='iva' usa account_generated+account_descontable;
    // los demás tipos usan `account`. Espejo de saveTaxRule (3122-3129).
    const rule = { id, type: form.type, name, rate, isDefault: !!form.isDefault };
    if (baseUVT > 0) rule.baseUVT = baseUVT;
    if (form.type === 'iva') {
      rule.account_generated = account || null;
      rule.account_descontable = account || null;
      if (rate === 0) rule.appliesToRemision = true;
    } else {
      rule.account = account || null;
    }

    const isNew = editingId === '';
    const res = isNew ? addTaxRule(rule) : updateTaxRule(editingId, rule);
    if (res?.error) {
      toast(res.message || `No se pudo guardar ${id}`, 'error');
      return;
    }
    toast(`Regla ${id} ${isNew ? 'creada' : 'actualizada'}`, 'ok');
    close();
  };

  const onDelete = (id) => {
    const res = removeTaxRule(id);
    setConfirmDelete(null);
    if (res?.error) {
      toast(res.message || `No se pudo eliminar ${id}`, res.error === 'in_use' ? 'warn' : 'error');
      return;
    }
    toast(`Regla ${id} eliminada`, 'ok');
  };

  const ratePct = ((+form.rate || 0) * 100).toFixed(3).replace(/\.?0+$/, '');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            Reglas de IVA y retenciones (Fuente / IVA / ICA). Los cambios se aplican a operaciones futuras.
          </p>
          <p className="mt-1 text-xs text-muted">
            {(taxRules || []).length} reglas ·{' '}
            {TYPES.map((t) => `${counts[t] || 0} ${TYPE_LABELS[t]}`).join(' · ')}
          </p>
        </div>
        <button className="btn-gold px-3 py-2 text-xs" onClick={openNew}>
          + Nueva regla
        </button>
      </div>

      <Panel title="Reglas de impuestos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Tipo</th>
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2 pr-2 text-right">Tasa</th>
                <th className="py-2 pr-2">Cuenta</th>
                <th className="py-2 pr-2 text-center">Base UVT</th>
                <th className="py-2 pr-2 text-center">Default</th>
                <th className="py-2 pr-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedRules.map((r) => {
                const accCode = accountOf(r);
                const acc = accCode ? auxAll.find((a) => a.code === accCode) : null;
                const accLabel = acc ? `${accCode} · ${acc.name}` : accCode || '—';
                const isConfirming = confirmDelete === r.id;
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2 pr-2 font-mono text-xs text-brand-gold">{r.id}</td>
                    <td className="py-2 pr-2">
                      <Badge tone={TYPE_TONES[r.type] || 'muted'}>{TYPE_LABELS[r.type] || r.type}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-white/80">{r.name || '—'}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {((r.rate || 0) * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs text-muted" title={acc?.name || ''}>
                      {accCode || <span className="text-amber-300">—</span>}
                    </td>
                    <td className="py-2 pr-2 text-center text-xs text-muted">{r.baseUVT || '—'}</td>
                    <td className="py-2 pr-2 text-center">
                      {r.isDefault ? <span className="text-brand-gold">★</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-[10px] text-amber-200">¿Eliminar {r.id}?</span>
                          <button
                            className="text-xs text-red-300 hover:underline"
                            onClick={() => onDelete(r.id)}
                          >
                            Sí
                          </button>
                          <button
                            className="text-xs text-muted hover:underline"
                            onClick={() => setConfirmDelete(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-3">
                          <button
                            className="text-xs text-brand-gold hover:underline"
                            onClick={() => openEdit(r)}
                            title={accLabel}
                          >
                            ✎ Editar
                          </button>
                          <button
                            className="text-xs text-red-300 hover:underline"
                            onClick={() => setConfirmDelete(r.id)}
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedRules.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-xs text-muted">
                    No hay reglas. Usa <b>+ Nueva regla</b> para crear una.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal
        open={editingId !== null}
        onClose={close}
        size="sm"
        title={editingId ? `Editar regla ${editingId}` : 'Nueva regla de impuesto'}
        subtitle="Los cambios se aplican a operaciones futuras."
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ID *</label>
              <input
                className="input-field font-mono"
                value={form.id}
                readOnly={!!editingId}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="IVA-19"
              />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                className="input-field"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nombre</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="IVA 19%"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tasa (0..1)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                className="input-field tabular-nums"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-muted">= {ratePct}%</p>
            </div>
            <div>
              <label className="label">Base UVT</label>
              <input
                type="number"
                step="1"
                min="0"
                className="input-field tabular-nums"
                value={form.baseUVT}
                onChange={(e) => setForm({ ...form, baseUVT: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-muted">0 = sin base mínima</p>
            </div>
          </div>
          <div>
            <label className="label">Cuenta vinculada</label>
            <select
              className="input-field text-xs"
              value={form.account}
              onChange={(e) => setForm({ ...form, account: e.target.value })}
            >
              <option value="">—</option>
              {auxAll.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} · {a.name}
                </option>
              ))}
            </select>
            {form.type === 'iva' && (
              <p className="mt-1 text-[10px] text-muted">
                Para IVA se usa la misma cuenta como generado (CR ventas) y descontable (DB compras).
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Default para su tipo (desmarcará otras reglas {TYPE_LABELS[form.type]})
          </label>
        </div>
      </Modal>
    </div>
  );
}
