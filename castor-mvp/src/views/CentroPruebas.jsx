import { useState } from 'react';
import { Panel, Badge } from '../components/ui';
import { useToast } from '../components/Toast';
import { TESTS, runTest, runAllTests } from '../lib/engineTests';

// C4 · Centro de pruebas del motor contable React.
// Espejo simplificado de renderTestsDashboard (castor_accounting.js:6475).
// Los 18 tests cubren los casos críticos del motor: postJournalEntry (validaciones
// + idempotencia), postSale (factura/remisión), postCustomerCollection,
// postSupplyPurchase, postSupplierPayment, postBankAdjustment, postPayroll,
// reverseJournalEntry, closePeriod (empty + with movement), reopenPeriod
// (tolerante a JE ausente) y closeFiscalYear (transfer 360505→370505).
//
// Nota: los 40 unit tests del monolito (Cphora/tests/_run_tests_node.js) siguen
// disponibles para el cutover a Supabase; esta suite cubre el motor React.

export default function CentroPruebas() {
  const toast = useToast();
  const [results, setResults] = useState({}); // id -> result
  const [lastRunAt, setLastRunAt] = useState(null);
  const [running, setRunning] = useState(false);

  const passCount = Object.values(results).filter((r) => r.status === 'pass').length;
  const failCount = Object.values(results).filter((r) => r.status === 'fail').length;

  const onRunAll = () => {
    setRunning(true);
    // Pequeño defer para que el estado "running" alcance a renderizarse
    setTimeout(() => {
      const all = runAllTests();
      const next = Object.fromEntries(all.map((r) => [r.id, r]));
      setResults(next);
      setLastRunAt(new Date());
      setRunning(false);
      const ok = all.filter((r) => r.status === 'pass').length;
      const ko = all.filter((r) => r.status === 'fail').length;
      toast(`Pruebas: ${ok} ok / ${ko} fallos`, ko ? 'warn' : 'ok');
    }, 0);
  };

  const onRunOne = (id) => {
    const r = runTest(id);
    setResults((prev) => ({ ...prev, [id]: r }));
    setLastRunAt(new Date());
    toast(`Test ${id}: ${r.status}${r.error ? ' · ' + r.error : ''}`, r.status === 'pass' ? 'ok' : 'error');
  };

  const fmtTime = (d) =>
    d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            Suite de tests del motor contable React (validaciones, partida doble, idempotencia, cierres).
          </p>
          <p className="mt-1 text-xs text-muted">
            {TESTS.length} pruebas registradas · última ejecución:{' '}
            <span className="text-white/80">{fmtTime(lastRunAt)}</span>{' '}
            {lastRunAt && (
              <>
                · <span className="text-emerald-300">{passCount} ok</span> /{' '}
                <span className={failCount > 0 ? 'text-red-300' : 'text-muted'}>{failCount} fallos</span>
              </>
            )}
          </p>
        </div>
        <button
          className="btn-gold px-4 py-2 text-xs disabled:opacity-50"
          onClick={onRunAll}
          disabled={running}
        >
          {running ? 'Ejecutando…' : 'Ejecutar todo'}
        </button>
      </div>

      <Panel title="Pruebas del motor">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Descripción</th>
                <th className="py-2 pr-2 text-center">Estado</th>
                <th className="py-2 pr-2 text-right">Duración</th>
                <th className="py-2 pr-2">Mensaje</th>
                <th className="py-2 pr-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {TESTS.map((t) => {
                const r = results[t.id];
                const status = r?.status || '—';
                return (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2 pr-2 font-mono text-xs text-brand-gold">{t.id}</td>
                    <td className="py-2 pr-2 text-white/80">{t.description}</td>
                    <td className="py-2 pr-2 text-center">
                      {status === 'pass' && <Badge tone="green">PASS</Badge>}
                      {status === 'fail' && <Badge tone="red">FAIL</Badge>}
                      {status === '—' && <span className="text-xs text-muted">—</span>}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-xs text-muted">
                      {r ? `${r.durationMs} ms` : '—'}
                    </td>
                    <td className="py-2 pr-2 text-xs text-red-300">{r?.error || ''}</td>
                    <td className="py-2 pr-2 text-right">
                      <button
                        className="text-xs text-brand-gold hover:underline"
                        onClick={() => onRunOne(t.id)}
                      >
                        Ejecutar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-xs text-muted">
        Cada test crea su propia <i>fixture</i> (state contable mínimo: catálogo PUC + periodos + bancos) y
        ejecuta funciones puras del motor. Los 40 unit tests del monolito original siguen disponibles para el
        cutover a Supabase.
      </p>
    </div>
  );
}
