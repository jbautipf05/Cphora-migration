import { useApp } from '../store/AppContext';
import { Panel } from '../components/ui';

// C3c · Numeración interna de documentos (FAC/REM/NC/ND).
// Portado de castor_accounting.js:3159-3214 (renderConfigNumeracion + setNumeracion).
// Edición inline campo a campo (cada celda actualiza el slice al instante).
// Warning amber en la fila cuando el rango lleva >90% usado.
// Las reglas son las del monolito: permissive (no valida rangeFrom>rangeTo ni
// currentNumber fuera del rango); el motor de futura facturación lo hará al
// emitir el siguiente documento.
export default function NumeracionDocumentos() {
  const { docNumbering, setDocNumberingField } = useApp();
  const rows = docNumbering || [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Numeración consecutiva interna por prefijo.{' '}
        <span className="font-semibold text-amber-300">No oficial DIAN</span> · la facturación oficial se
        gestiona en el sistema externo (proveedor tecnológico autorizado, fuera del MVP).
      </p>

      <Panel title="Consecutivos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2">Prefijo</th>
                <th className="py-2 pr-2">Descripción</th>
                <th className="py-2 pr-2 text-right">Desde</th>
                <th className="py-2 pr-2 text-right">Hasta</th>
                <th className="py-2 pr-2 text-right">Actual</th>
                <th className="py-2 pr-2 text-right">Disponibles</th>
                <th className="py-2 pr-2 text-center">Activa</th>
                <th className="py-2 pr-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const rangeFrom = +s.rangeFrom || 0;
                const rangeTo = +s.rangeTo || 0;
                const currentNumber = +s.currentNumber || 0;
                const used = currentNumber - rangeFrom + 1;
                const total = rangeTo - rangeFrom + 1;
                const left = total - used;
                const usedRatio = total > 0 ? used / total : 0;
                const warn = usedRatio > 0.9;
                return (
                  <tr key={s.id} className={`border-b border-white/5 ${warn ? 'bg-amber-500/5' : ''}`}>
                    <td className="py-2 pr-2 font-mono text-brand-gold">{s.prefix}</td>
                    <td className="py-2 pr-2">
                      <input
                        className="input-field text-xs"
                        value={s.description || ''}
                        onChange={(e) => setDocNumberingField(s.id, 'description', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input-field text-xs text-right tabular-nums w-24"
                        value={rangeFrom}
                        onChange={(e) => setDocNumberingField(s.id, 'rangeFrom', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input-field text-xs text-right tabular-nums w-24"
                        value={rangeTo}
                        onChange={(e) => setDocNumberingField(s.id, 'rangeTo', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input-field text-xs text-right tabular-nums w-24"
                        value={currentNumber}
                        onChange={(e) => setDocNumberingField(s.id, 'currentNumber', e.target.value)}
                      />
                    </td>
                    <td
                      className={`py-2 pr-2 text-right tabular-nums ${warn ? 'font-semibold text-amber-300' : 'text-muted'}`}
                    >
                      {left.toLocaleString('es-CO')}
                      {warn ? ' ⚠' : ''}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!s.active}
                        onChange={(e) => setDocNumberingField(s.id, 'active', e.target.checked)}
                      />
                    </td>
                    <td className="py-2 pr-2 text-xs">
                      {warn && <span className="text-amber-300">90%+ usado</span>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-xs text-muted">
                    Sin numeraciones configuradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-xs text-muted">
        Próximo número emitido = <code className="text-brand-gold">currentNumber + 1</code>. Cuando se conecte la
        facturación oficial DIAN se reemplaza esta numeración interna con la resolución autorizada por el
        proveedor tecnológico.
      </p>
    </div>
  );
}
