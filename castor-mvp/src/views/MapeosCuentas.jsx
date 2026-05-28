import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel } from '../components/ui';
import { useToast } from '../components/Toast';

// C3a · Mapeo de cuentas por evento.
// Portado de castor_accounting.js:2927-3015 (renderConfigMapeos + _classFilterFor +
// setMapeo + resetMapeos). Define qué cuenta PUC usa cada evento operativo. Los
// cambios se persisten al instante (estado editable, no se re-siembra en hydrate).
// El motor todavía usa cuentas hardcoded; el cableado posterior es un refactor
// aparte (relacionado con TD-07: centralizar códigos PUC).

// Hint para filtrar el dropdown de cuentas por categoría natural del field key.
// Portado tal cual de castor_accounting.js:2929-2945.
function classFilterFor(key) {
  if (/revenue|venta/i.test(key)) return '4';
  if (/cogs|costo/i.test(key)) return '6';
  if (/inventory_raw|raw|wip|finished_goods|inventario/i.test(key)) return '14';
  if (/iva_generated|iva_descontable|rete|payable|salary_payable|impuesto/i.test(key)) return '2';
  if (/receivable|cartera|advance_received|bank|cash/i.test(key)) {
    if (/payable|advance_received|impuesto/i.test(key)) return '2';
    if (/receivable|cartera/i.test(key)) return '13';
    if (/bank|cash/i.test(key)) return '11';
    return '1';
  }
  if (/expense|gasto/i.test(key)) return '5';
  if (/discount|sales_returns/i.test(key)) return '4';
  if (/depreciation|cif|mod/i.test(key)) return '5';
  return '';
}

export default function MapeosCuentas() {
  const { accountingMappings, pucAccounts, setMapping, resetMappings } = useApp();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  // Cuentas auxiliares activas, ordenadas por código.
  const auxAll = useMemo(
    () =>
      (pucAccounts || [])
        .filter((a) => a.level >= 6 && a.activa !== false)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [pucAccounts],
  );

  const candidatesFor = (key) => {
    const prefix = classFilterFor(key);
    const filtered = prefix ? auxAll.filter((a) => a.code.startsWith(prefix)) : auxAll;
    return filtered.length ? filtered : auxAll;
  };

  const onChange = (section, key, code) => {
    const res = setMapping(section, key, code);
    if (res?.error) return toast(res.message, 'error');
    toast(`Mapeo ${section}.${key} → ${code || '—'}`, 'ok');
  };

  const onReset = () => {
    setConfirmReset(false);
    resetMappings();
    toast('Mapeos restaurados a valores por defecto', 'ok');
  };

  const sections = Object.keys(accountingMappings || {});
  // Contadores informativos
  const totals = useMemo(() => {
    let assigned = 0;
    let total = 0;
    let invalid = 0;
    for (const sec of sections) {
      for (const [, code] of Object.entries(accountingMappings[sec] || {})) {
        total++;
        if (!code) continue;
        const acc = auxAll.find((a) => a.code === code);
        if (acc) assigned++;
        else invalid++;
      }
    }
    return { assigned, total, invalid, sinAsignar: total - assigned - invalid };
  }, [accountingMappings, auxAll, sections]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            Define qué cuenta PUC usa cada evento operativo. Los cambios se guardan al instante.
          </p>
          <p className="mt-1 text-xs text-muted">
            <span className="text-emerald-300">{totals.assigned}</span> asignadas ·{' '}
            <span className="text-amber-300">{totals.sinAsignar}</span> sin asignar
            {totals.invalid > 0 ? (
              <>
                {' '}
                · <span className="text-red-300">{totals.invalid}</span> no postable
              </>
            ) : null}{' '}
            · {sections.length} eventos
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
            <span className="text-xs text-amber-200">¿Restaurar todos los mapeos al valor por defecto?</span>
            <button className="btn-gold px-3 py-1 text-xs" onClick={onReset}>
              Sí, restaurar
            </button>
            <button className="text-xs text-muted hover:underline" onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 transition hover:border-gold-accent/40 hover:text-brand-gold"
            onClick={() => setConfirmReset(true)}
          >
            Restaurar defecto
          </button>
        )}
      </div>

      {sections.map((sec) => (
        <Panel key={sec} title={sec}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-2">Campo</th>
                  <th className="py-2 pr-2">Cuenta</th>
                  <th className="py-2 pr-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(accountingMappings[sec] || {}).map(([k, v]) => {
                  const acc = v ? auxAll.find((a) => a.code === v) : null;
                  const ok = !!acc;
                  const candidates = candidatesFor(k);
                  return (
                    <tr key={k} className="border-b border-white/5">
                      <td className="py-2 pr-2 font-mono text-xs text-white/80">{k}</td>
                      <td className="py-2 pr-2">
                        <select
                          className="input-field text-xs"
                          value={v || ''}
                          onChange={(e) => onChange(sec, k, e.target.value)}
                        >
                          <option value="">—</option>
                          {candidates.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code} · {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2 text-[11px]">
                        {ok ? (
                          <span className="text-emerald-300">OK · {acc.name}</span>
                        ) : v ? (
                          <span className="text-red-300">cuenta no postable</span>
                        ) : (
                          <span className="text-amber-300">sin asignar</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}
