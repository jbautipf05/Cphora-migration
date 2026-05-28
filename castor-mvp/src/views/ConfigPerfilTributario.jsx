import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Badge } from '../components/ui';
import { Field, Input, MoneyInput, Select } from '../components/form';
import { useToast } from '../components/Toast';

// Configuración del perfil tributario de la empresa.
// Espejo de renderConfigPerfil() del castor_accounting.js (líneas 3216-3282).
const PERIODICIDADES = ['bimestral', 'cuatrimestral', 'anual'];
const REGIMENES = ['ordinario', 'especial', 'sin_animo_de_lucro'];

export default function ConfigPerfilTributario() {
  const { companyTaxProfile, saveTaxAndPayroll } = useApp();
  const toast = useToast();
  const [form, setForm] = useState({ ...companyTaxProfile });
  const [dirty, setDirty] = useState(false);

  const setF = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleSave = () => {
    saveTaxAndPayroll({ companyTaxProfile: form });
    setDirty(false);
    toast('Perfil tributario guardado', 'ok');
  };

  const handleReset = () => {
    setForm({ ...companyTaxProfile });
    setDirty(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Datos fiscales de la empresa · usados en facturas, retenciones e informes DIAN.
        </p>
        {dirty && <Badge tone="gold">Cambios sin guardar</Badge>}
      </div>

      <Panel title="Identificación de la empresa">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIT">
            <Input value={form.nit} onChange={(e) => setF('nit', e.target.value)} />
          </Field>
          <Field label="Razón social">
            <Input value={form.razonSocial} onChange={(e) => setF('razonSocial', e.target.value)} />
          </Field>
          <Field label="Régimen tributario">
            <Select
              value={form.regimenTributario}
              onChange={(e) => setF('regimenTributario', e.target.value)}
            >
              {REGIMENES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="UVT vigente (2026)">
            <MoneyInput
              value={form.uvtVigente}
              onChange={(e) => setF('uvtVigente', Number(e.target.value))}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="IVA">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Responsable de IVA">
            <Select
              value={String(form.responsableIVA)}
              onChange={(e) => setF('responsableIVA', e.target.value === 'true')}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </Select>
          </Field>
          <Field label="Periodicidad IVA">
            <Select
              value={form.periodicidadIVA}
              onChange={(e) => setF('periodicidadIVA', e.target.value)}
            >
              {PERIODICIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Autorretenedor">
            <Select
              value={String(form.autoretenedor)}
              onChange={(e) => setF('autoretenedor', e.target.value === 'true')}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title="ICA (Industria y Comercio)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Responsable de ICA">
            <Select
              value={String(form.responsableICA)}
              onChange={(e) => setF('responsableICA', e.target.value === 'true')}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </Select>
          </Field>
          <Field label="Ciudad ICA">
            <Input value={form.ciudadICA} onChange={(e) => setF('ciudadICA', e.target.value)} />
          </Field>
          <Field label="Tarifa ICA (× mil)">
            <Input
              type="number"
              step="0.01"
              value={form.tarifaICAporMil}
              onChange={(e) => setF('tarifaICAporMil', Number(e.target.value))}
            />
          </Field>
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-outline" onClick={handleReset} disabled={!dirty}>
          Descartar
        </button>
        <button type="button" className="btn-gold" onClick={handleSave} disabled={!dirty}>
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
