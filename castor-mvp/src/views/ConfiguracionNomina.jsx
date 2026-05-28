import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { calcPayrollPreview, fmtCOP } from '../lib/accounting';
import { Panel, Badge } from '../components/ui';
import { IconCheck, IconPlus, IconTrash } from '../components/icons';
import { MoneyInput } from '../components/form';
import { useToast } from '../components/Toast';
import { today } from '../lib/format';

// ── Inputs controlados reutilizables ──
function TextField({ label, value, onChange, type = 'text', suffix, ...rest }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? e.target.valueAsNumber || 0 : e.target.value)}
          className="input-field"
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

// MoneyField — wrapper local para campos de dinero con separadores de miles.
// Mismo API que TextField type="number" (onChange recibe Number) pero usa MoneyInput.
function MoneyField({ label, value, onChange, suffix, ...rest }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <MoneyInput
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-brand-bg/40 px-3 py-2.5">
      <span className="text-sm text-white/90">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-gold-accent' : 'bg-white/10'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

export default function ConfiguracionNomina() {
  const { companyTaxProfile, payrollParams, bankAccounts, employees, saveTaxAndPayroll, setState, postPayroll } = useApp();
  const toast = useToast();

  // Draft local: todos los campos son editables; se confirma al Guardar.
  const [tax, setTax] = useState(() => ({ ...companyTaxProfile }));
  const [params, setParams] = useState(() => ({ ...payrollParams }));
  const [banks, setBanks] = useState(() => bankAccounts.map((b) => ({ ...b })));
  const [savedAt, setSavedAt] = useState(null);

  const setTaxField = (k, v) => setTax((t) => ({ ...t, [k]: v }));
  const setParamField = (k, v) => setParams((p) => ({ ...p, [k]: v }));
  const setBankField = (id, k, v) =>
    setBanks((bs) => bs.map((b) => (b.id === id ? { ...b, [k]: v } : b)));

  // Preview de nómina recalculado en vivo a partir de los parámetros del draft.
  const preview = useMemo(() => calcPayrollPreview(employees, params), [employees, params]);

  // C2c: contabiliza la nómina del periodo actual (postPayroll). totalSalarios = devengado
  // bruto (base + aux) para que la retención (deducciones del empleado) cuadre el asiento.
  // Idempotente por periodo (sourceId NOM-<YYYY-MM>): re-correr no duplica el asiento.
  const runPayroll = () => {
    const periodId = today().slice(0, 7);
    const t = preview.totales;
    const res = postPayroll({
      id: `NOM-${periodId}`, periodId, date: today(),
      totalSalarios: (t.base || 0) + (t.aux || 0),
      totalNeto: t.neto || 0,
      totalAportes: t.aportesEmpr || 0,
      totalProvisiones: t.provisiones || 0,
    });
    if (res?.ok) toast(`Nómina ${periodId} contabilizada · asiento ${res.journalEntry.id}`, 'ok');
    else if (res?.warning === 'already_posted') toast(`La nómina ${periodId} ya estaba contabilizada (${res.journalId})`, 'info');
    else toast(`Aviso contable: ${res?.message || res?.error || '—'}`, 'warn');
  };

  const dirty = useMemo(
    () =>
      JSON.stringify(tax) !== JSON.stringify(companyTaxProfile) ||
      JSON.stringify(params) !== JSON.stringify(payrollParams) ||
      JSON.stringify(banks) !== JSON.stringify(bankAccounts),
    [tax, params, banks, companyTaxProfile, payrollParams, bankAccounts],
  );

  const handleSave = () => {
    saveTaxAndPayroll({ companyTaxProfile: tax, payrollParams: params });
    setState((s) => ({ ...s, bankAccounts: banks.map((b) => ({ ...b, balance: Number(b.balance) || 0 })) }));
    setSavedAt(new Date());
  };

  const handleAddBank = () => {
    const id = `B-${Date.now().toString(36)}`;
    setBanks((bs) => [
      ...bs,
      { id, bank: 'Nueva cuenta', type: 'Ahorros', number: '****0000', holder: 'Castor SAS', balance: 0, color: '#2F5585', pucCode: '1110XX' },
    ]);
  };

  const handleRemoveBank = (id) => setBanks((bs) => bs.filter((b) => b.id !== id));

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de acciones */}
      <div className="sticky top-0 z-[5] -mx-8 flex items-center gap-3 border-b border-white/5 bg-brand-bg/80 px-8 py-3 backdrop-blur">
        <p className="text-sm text-muted">
          Todos los campos son editables. Al guardar, el estado se actualiza en memoria
          (sobrevive recargas vía localStorage).
        </p>
        <div className="ml-auto flex items-center gap-3">
          {savedAt && !dirty && (
            <Badge tone="green">
              <IconCheck width={12} height={12} /> Guardado{' '}
              {savedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
          {dirty && <Badge tone="gold">Cambios sin guardar</Badge>}
          <button onClick={handleSave} disabled={!dirty} className="btn-gold">
            <IconCheck width={16} height={16} />
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Perfil tributario */}
      <Panel title="Perfil tributario de la empresa" subtitle="Castor SAS · es-CO · COP">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TextField label="NIT" value={tax.nit} onChange={(v) => setTaxField('nit', v)} />
          <TextField label="Razón social" value={tax.razonSocial} onChange={(v) => setTaxField('razonSocial', v)} />
          <SelectField
            label="Régimen tributario"
            value={tax.regimenTributario}
            onChange={(v) => setTaxField('regimenTributario', v)}
            options={[
              { value: 'ordinario', label: 'Ordinario' },
              { value: 'simple', label: 'Régimen Simple (SIMPLE)' },
              { value: 'especial', label: 'Especial' },
            ]}
          />
          <SelectField
            label="Periodicidad IVA"
            value={tax.periodicidadIVA}
            onChange={(v) => setTaxField('periodicidadIVA', v)}
            options={[
              { value: 'bimestral', label: 'Bimestral' },
              { value: 'cuatrimestral', label: 'Cuatrimestral' },
              { value: 'anual', label: 'Anual' },
            ]}
          />
          <TextField label="Ciudad ICA" value={tax.ciudadICA} onChange={(v) => setTaxField('ciudadICA', v)} />
          <TextField
            label="Tarifa ICA (× mil)"
            type="number"
            step="0.01"
            value={tax.tarifaICAporMil}
            onChange={(v) => setTaxField('tarifaICAporMil', v)}
            suffix="‰"
          />
          <MoneyField
            label="UVT vigente"
            value={tax.uvtVigente}
            onChange={(v) => setTaxField('uvtVigente', v)}
            suffix="COP"
          />
          <div className="space-y-3 md:col-span-2 lg:col-span-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Toggle label="Responsable de IVA" checked={tax.responsableIVA} onChange={(v) => setTaxField('responsableIVA', v)} />
              <Toggle label="Responsable de ICA" checked={tax.responsableICA} onChange={(v) => setTaxField('responsableICA', v)} />
              <Toggle label="Autorretenedor" checked={tax.autoretenedor} onChange={(v) => setTaxField('autoretenedor', v)} />
            </div>
          </div>
        </div>
      </Panel>

      {/* Parámetros de nómina */}
      <Panel
        title="Parámetros de nómina (PAYROLL_2026)"
        subtitle="Defaults editables · §7.11 · cambios aplican a corridas futuras"
      >
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Bases salariales</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MoneyField label="SMMLV" value={params.smmlv} onChange={(v) => setParamField('smmlv', v)} suffix="COP" />
              <MoneyField label="Auxilio de transporte" value={params.auxTransporte} onChange={(v) => setParamField('auxTransporte', v)} suffix="COP" />
              <TextField label="Tope auxilio (× SMMLV)" type="number" step="0.5" value={params.auxTransporteTopeSmmlv} onChange={(v) => setParamField('auxTransporteTopeSmmlv', v)} />
              <TextField label="Exoneración Ley 1607 (× SMMLV)" type="number" value={params.exoneracionLey1607Smmlv} onChange={(v) => setParamField('exoneracionLey1607Smmlv', v)} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Seguridad social (%)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField label="Salud empleado" type="number" step="0.1" value={params.saludEmpleado} onChange={(v) => setParamField('saludEmpleado', v)} suffix="%" />
              <TextField label="Salud empleador" type="number" step="0.1" value={params.saludEmpleador} onChange={(v) => setParamField('saludEmpleador', v)} suffix="%" />
              <TextField label="Pensión empleado" type="number" step="0.1" value={params.pensionEmpleado} onChange={(v) => setParamField('pensionEmpleado', v)} suffix="%" />
              <TextField label="Pensión empleador" type="number" step="0.1" value={params.pensionEmpleador} onChange={(v) => setParamField('pensionEmpleador', v)} suffix="%" />
              <TextField label={`ARL (riesgo ${params.arlNivelRiesgo})`} type="number" step="0.001" value={params.arlPorcentaje} onChange={(v) => setParamField('arlPorcentaje', v)} suffix="%" />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Parafiscales (%)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField label="SENA" type="number" step="0.1" value={params.sena} onChange={(v) => setParamField('sena', v)} suffix="%" />
              <TextField label="ICBF" type="number" step="0.1" value={params.icbf} onChange={(v) => setParamField('icbf', v)} suffix="%" />
              <TextField label="Caja de compensación" type="number" step="0.1" value={params.cajaCompensacion} onChange={(v) => setParamField('cajaCompensacion', v)} suffix="%" />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">Provisiones prestaciones (%)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField label="Cesantías" type="number" step="0.01" value={params.provCesantias} onChange={(v) => setParamField('provCesantias', v)} suffix="%" />
              <TextField label="Intereses cesantías" type="number" step="0.01" value={params.provIntCesantias} onChange={(v) => setParamField('provIntCesantias', v)} suffix="%" />
              <TextField label="Prima" type="number" step="0.01" value={params.provPrima} onChange={(v) => setParamField('provPrima', v)} suffix="%" />
              <TextField label="Vacaciones" type="number" step="0.01" value={params.provVacaciones} onChange={(v) => setParamField('provVacaciones', v)} suffix="%" />
            </div>
          </div>
        </div>
      </Panel>

      {/* Preview de nómina en vivo */}
      <Panel
        title="Vista previa de nómina"
        subtitle="Recalculada en vivo con los parámetros de arriba · 7 empleados"
        actions={
          <button onClick={runPayroll} className="btn-gold">
            Correr y contabilizar nómina
          </button>
        }
      >
        <div className="-m-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 text-right font-medium">Salario</th>
                <th className="px-4 py-3 text-right font-medium">Aux. transp.</th>
                <th className="px-4 py-3 text-right font-medium">Neto a pagar</th>
                <th className="px-4 py-3 text-right font-medium">Aportes empl.</th>
                <th className="px-4 py-3 text-right font-medium">Provisiones</th>
                <th className="px-4 py-3 text-right font-medium">Costo total</th>
              </tr>
            </thead>
            <tbody>
              {preview.filas.map((f) => (
                <tr key={f.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 text-white/90">
                    {f.name}
                    {f.exonera && (
                      <span className="ml-2 text-[10px] text-emerald-300/70">exon. 1607</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{f.area}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-white/80">{fmtCOP(f.base)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted">{f.aux ? fmtCOP(f.aux) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-emerald-300">{fmtCOP(f.neto)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-orange-300/90">{fmtCOP(f.aportesEmpr)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-sky-300/90">{fmtCOP(f.provisiones)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-white">{fmtCOP(f.costoTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 font-semibold">
                <td className="px-4 py-3 text-white" colSpan={2}>Totales</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-white/80">{fmtCOP(preview.totales.base)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">{fmtCOP(preview.totales.aux)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300">{fmtCOP(preview.totales.neto)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-orange-300">{fmtCOP(preview.totales.aportesEmpr)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sky-300">{fmtCOP(preview.totales.provisiones)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-gold-accent">{fmtCOP(preview.totales.costoTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* Cuentas bancarias por defecto */}
      <Panel
        title="Cuentas bancarias por defecto"
        subtitle="§7.8 · editables · auxiliar PUC 1110-XX por cuenta"
        actions={
          <button onClick={handleAddBank} className="btn-ghost">
            <IconPlus width={16} height={16} />
            Agregar cuenta
          </button>
        }
      >
        <div className="space-y-3">
          {banks.map((b) => (
            <div
              key={b.id}
              className="grid grid-cols-2 items-end gap-3 rounded-lg border border-white/5 bg-brand-bg/40 p-3 md:grid-cols-12"
            >
              <div className="md:col-span-1 flex items-center justify-center">
                <input
                  type="color"
                  value={b.color}
                  onChange={(e) => setBankField(b.id, 'color', e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                  title="Color"
                />
              </div>
              <div className="md:col-span-3">
                <TextField label="Banco" value={b.bank} onChange={(v) => setBankField(b.id, 'bank', v)} />
              </div>
              <div className="md:col-span-2">
                <TextField label="Tipo" value={b.type} onChange={(v) => setBankField(b.id, 'type', v)} />
              </div>
              <div className="md:col-span-2">
                <TextField label="Número" value={b.number} onChange={(v) => setBankField(b.id, 'number', v)} />
              </div>
              <div className="md:col-span-3">
                <MoneyField label="Saldo" value={b.balance} onChange={(v) => setBankField(b.id, 'balance', v)} suffix="COP" />
              </div>
              <div className="md:col-span-1 flex justify-center">
                <button
                  onClick={() => handleRemoveBank(b.id)}
                  disabled={Math.round(b.balance) !== 0}
                  title={
                    Math.round(b.balance) !== 0
                      ? 'No se puede eliminar: la cuenta tiene saldo / movimientos'
                      : 'Eliminar cuenta'
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted transition hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          La eliminación se bloquea si la cuenta tiene saldo distinto de cero (regla §7.8). Cada
          cuenta nueva crearía su auxiliar 1110-XX al integrar el motor real.
        </p>
      </Panel>
    </div>
  );
}
