import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Badge } from '../components/ui';
import { fmtCOP } from '../lib/format';
import { useToast } from '../components/Toast';

// Cierres y reaperturas de periodo contable. Cerrar un periodo bloquea el posteo
// de asientos en él (el motor valida `closed_period` en postJournalEntry).
// El cierre fiscal anual (cancelar resultados → utilidad) es una fase aparte (C2b).
export default function Cierres() {
  const { fiscalPeriods, journalEntries, journalLines, update } = useApp();
  const toast = useToast();

  const rows = useMemo(() => {
    return [...(fiscalPeriods || [])]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((p) => {
        const jes = (journalEntries || []).filter((j) => j.period === p.id);
        const ids = new Set(jes.map((j) => j.id));
        const debe = (journalLines || [])
          .filter((l) => ids.has(l.journalId))
          .reduce((a, l) => a + (l.debit || 0), 0);
        return { ...p, nAsientos: jes.length, movimiento: debe };
      });
  }, [fiscalPeriods, journalEntries, journalLines]);

  const setEstado = (id, estado) => {
    update('fiscalPeriods', id, { estado });
    toast(`Periodo ${id} ${estado === 'cerrado' ? 'cerrado' : 'reabierto'}`, estado === 'cerrado' ? 'ok' : 'warn');
  };

  const abiertos = rows.filter((r) => r.estado !== 'cerrado').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Cierres y reaperturas de periodo. Un periodo <b>cerrado</b> bloquea nuevos asientos en esa fecha.
        </p>
        <Badge tone={abiertos ? 'amber' : 'green'}>{abiertos} abierto(s)</Badge>
      </div>

      <Panel title="Periodos contables">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2">Periodo</th>
                <th className="py-2 pr-2">Estado</th>
                <th className="py-2 pr-2 text-right">Asientos</th>
                <th className="py-2 pr-2 text-right">Movimiento (débito)</th>
                <th className="py-2 pr-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const cerrado = p.estado === 'cerrado';
                return (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2 pr-2 text-white">{p.label || p.id}</td>
                    <td className="py-2 pr-2">
                      <Badge tone={cerrado ? 'muted' : 'green'}>{cerrado ? 'cerrado' : 'abierto'}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-muted">{p.nAsientos}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-white/80">{fmtCOP(p.movimiento)}</td>
                    <td className="py-2 pr-2 text-right">
                      {cerrado ? (
                        <button className="text-xs text-amber-300 hover:underline" onClick={() => setEstado(p.id, 'abierto')}>↺ Reabrir</button>
                      ) : (
                        <button className="text-xs text-brand-gold hover:underline" onClick={() => setEstado(p.id, 'cerrado')}>🔒 Cerrar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
