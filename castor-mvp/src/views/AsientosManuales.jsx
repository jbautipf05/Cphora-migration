import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useToast } from '../components/Toast';
import { Panel, Badge } from '../components/ui';
import { PUC_CATALOG, PUC_BY_CODE } from '../data/pucCatalog';
import { fmtCOP } from '../lib/accounting';
import { today } from '../lib/format';
import { MoneyInput } from '../components/form';
import { IconPlus, IconTrash, IconCheck } from '../components/icons';

// Cuentas auxiliares (level 6) disponibles para asientos manuales.
const ACCOUNTS = PUC_CATALOG.filter((a) => a.level >= 6);

const blankLine = () => ({
  accountCode: '',
  debit: 0,
  credit: 0,
  thirdParty: '',
  description: '',
});

export default function AsientosManuales() {
  const { postManualEntry } = useApp();
  const toast = useToast();

  const [date, setDate] = useState(today());
  const [concept, setConcept] = useState('');
  const [lines, setLines] = useState([blankLine(), blankLine()]);
  const [lastResult, setLastResult] = useState(null);

  const totals = useMemo(
    () =>
      lines.reduce(
        (t, l) => {
          t.debe += +l.debit || 0;
          t.haber += +l.credit || 0;
          return t;
        },
        { debe: 0, haber: 0 },
      ),
    [lines],
  );
  const cuadra = totals.debe === totals.haber && totals.debe > 0;

  const updateLine = (i, patch) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLine = () => setLines((ls) => [...ls, blankLine()]);
  const removeLine = (i) =>
    setLines((ls) => (ls.length <= 2 ? ls : ls.filter((_, idx) => idx !== i)));

  const reset = () => {
    setDate(today());
    setConcept('');
    setLines([blankLine(), blankLine()]);
    setLastResult(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!concept.trim()) return toast('Falta el concepto', 'warn');
    if (!cuadra) return toast('El asiento no cuadra', 'error');
    const payload = {
      date,
      concept,
      lines: lines
        .filter((l) => l.accountCode && (+l.debit > 0 || +l.credit > 0))
        .map((l) => ({
          accountCode: l.accountCode,
          debit: +l.debit || 0,
          credit: +l.credit || 0,
          thirdParty: l.thirdParty || null,
          description: l.description || null,
        })),
    };
    const res = postManualEntry(payload);
    setLastResult(res);
    if (res?.ok) {
      toast(`Asiento ${res.journalEntry.id} contabilizado`, 'ok');
      reset();
    } else {
      toast(res?.message || 'No se pudo contabilizar', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Panel
        title="Nuevo asiento manual"
        subtitle="Validación de partida doble · sólo cuentas auxiliares activas."
        actions={
          <Badge tone={cuadra ? 'green' : 'red'}>
            {cuadra ? '✓ Cuadra' : `Diferencia ${fmtCOP(totals.debe - totals.haber)}`}
          </Badge>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Concepto</label>
            <input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Descripción del asiento"
              className="input-field"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2">Cuenta</th>
                <th className="py-2">Tercero</th>
                <th className="py-2 text-right">Debe</th>
                <th className="py-2 text-right">Haber</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const acc = PUC_BY_CODE[l.accountCode];
                return (
                  <tr key={i} className="border-t border-white/5 align-top">
                    <td className="py-2 pr-2">
                      <select
                        value={l.accountCode}
                        onChange={(e) => updateLine(i, { accountCode: e.target.value })}
                        className="input-field"
                      >
                        <option value="">— elegir —</option>
                        {ACCOUNTS.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                      </select>
                      {acc?.requiresThirdParty && (
                        <p className="mt-1 text-[10px] text-amber-400">Requiere tercero</p>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={l.thirdParty}
                        onChange={(e) => updateLine(i, { thirdParty: e.target.value })}
                        placeholder="Tercero"
                        className="input-field"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <MoneyInput
                        value={l.debit}
                        onChange={(e) =>
                          updateLine(i, { debit: e.target.value, credit: 0 })
                        }
                        className="text-right tabular-nums"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <MoneyInput
                        value={l.credit}
                        onChange={(e) =>
                          updateLine(i, { credit: e.target.value, debit: 0 })
                        }
                        className="text-right tabular-nums"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 2}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-muted transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                        title="Eliminar línea"
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 font-semibold">
                <td colSpan={2} className="py-2 text-white">
                  Totales
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-emerald-300">
                  {fmtCOP(totals.debe)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-orange-300">
                  {fmtCOP(totals.haber)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addLine}
            className="btn-outline inline-flex items-center gap-2"
          >
            <IconPlus width={14} height={14} /> Añadir línea
          </button>
          <button
            type="button"
            onClick={reset}
            className="btn-ghost"
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={!cuadra}
            className="btn-gold ml-auto inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconCheck width={14} height={14} /> Contabilizar
          </button>
        </div>

        {lastResult && !lastResult.ok && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <strong>Error:</strong> {lastResult.message || lastResult.error}
          </div>
        )}
      </Panel>
    </form>
  );
}
