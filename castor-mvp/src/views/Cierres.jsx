import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Badge } from '../components/ui';
import { fmtCOP } from '../lib/format';
import { useToast } from '../components/Toast';

// Cierres y reaperturas de periodo contable (C2a + C2b).
// Cerrar un periodo genera un asiento que cancela las clases 4/5/6/7 contra
// 360505 (resultado del ejercicio) y bloquea nuevos asientos en esa fecha.
// Reabrir reversa ese asiento. El cierre de año fiscal traslada 360505 → 370505.
export default function Cierres() {
  const {
    fiscalPeriods,
    journalEntries,
    journalLines,
    closeFiscalPeriod,
    reopenFiscalPeriod,
    closeFiscalYear,
  } = useApp();
  const toast = useToast();
  const [confirmYear, setConfirmYear] = useState(null);

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

  const years = useMemo(
    () => [...new Set((fiscalPeriods || []).map((p) => +String(p.id).slice(0, 4)))].sort(),
    [fiscalPeriods],
  );

  const abiertos = rows.filter((r) => r.estado !== 'cerrado').length;

  const onClose = (id) => {
    const res = closeFiscalPeriod(id);
    if (res.error) return toast(res.message || `No se pudo cerrar ${id}`, 'error');
    if (res.warning) return toast(`Periodo ${id} ya tenía cierre (${res.journalId})`, 'warn');
    if (res.empty) return toast(`Periodo ${id} cerrado · sin movimiento de resultados`, 'ok');
    const tipo = res.utilidad >= 0 ? 'utilidad' : 'pérdida';
    toast(`Periodo ${id} cerrado · ${tipo} ${fmtCOP(Math.abs(res.utilidad))} → 360505 (${res.journalEntry.id})`, 'ok');
  };

  const onReopen = (id) => {
    const res = reopenFiscalPeriod(id);
    if (res.error) return toast(res.message || `No se pudo reabrir ${id}`, 'error');
    const rev = res.reversal ? ` · cierre reversado (${res.reversal.journalEntry.id})` : '';
    toast(`Periodo ${id} reabierto${rev}`, 'warn');
  };

  const onCloseYear = (year) => {
    setConfirmYear(null);
    const res = closeFiscalYear(year);
    if (res.error) return toast(res.message || `No se pudo cerrar el año ${year}`, 'error');
    if (res.warning) return toast(`El año ${year} ya estaba cerrado (${res.journalId})`, 'warn');
    if (res.empty) return toast(`Año ${year} cerrado · sin saldo en 360505 a trasladar`, 'ok');
    const tipo = res.utilidad >= 0 ? 'utilidad' : 'pérdida';
    toast(`Año fiscal ${year} cerrado · ${tipo} ${fmtCOP(Math.abs(res.utilidad))} 360505 → 370505`, 'ok');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Cierres y reaperturas de periodo. Cerrar genera el asiento de cancelación de resultados; un periodo{' '}
          <b>cerrado</b> bloquea nuevos asientos en esa fecha.
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
                <th className="py-2 pr-2">Asiento de cierre</th>
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
                    <td className="py-2 pr-2 font-mono text-xs text-muted">{p.closingJournalEntryId || '—'}</td>
                    <td className="py-2 pr-2 text-right">
                      {cerrado ? (
                        <button className="text-xs text-amber-300 hover:underline" onClick={() => onReopen(p.id)}>
                          ↺ Reabrir
                        </button>
                      ) : (
                        <button className="text-xs text-brand-gold hover:underline" onClick={() => onClose(p.id)}>
                          🔒 Cerrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Cierre de año fiscal" subtitle="Traslada el saldo de 360505 (resultado del ejercicio) a 370505 (utilidades acumuladas)">
        <div className="flex flex-wrap items-center gap-3">
          {years.map((year) =>
            confirmYear === year ? (
              <div
                key={year}
                className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2"
              >
                <span className="text-xs text-amber-200">
                  ¿Cerrar el año {year}? Cierra los meses abiertos y traslada 360505 → 370505.
                </span>
                <button className="btn-gold px-3 py-1 text-xs" onClick={() => onCloseYear(year)}>
                  Sí, cerrar
                </button>
                <button className="text-xs text-muted hover:underline" onClick={() => setConfirmYear(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                key={year}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-gold-accent/40 hover:text-brand-gold"
                onClick={() => setConfirmYear(year)}
              >
                Cerrar año fiscal {year}
              </button>
            ),
          )}
        </div>
      </Panel>

      <p className="text-xs text-muted">
        El cierre mensual genera un asiento que cancela las cuentas de las clases 4, 5, 6 y 7 contra{' '}
        <code className="text-brand-gold">360505</code> (resultado del ejercicio). La reapertura reversa ese asiento.
        El cierre de año fiscal traslada <code className="text-brand-gold">360505</code> a{' '}
        <code className="text-brand-gold">370505</code> (utilidades acumuladas).
      </p>
    </div>
  );
}
