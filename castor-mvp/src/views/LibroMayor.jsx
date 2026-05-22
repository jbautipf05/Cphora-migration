import { Fragment, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtCOP, movimientosPorCuenta, saldoPorNaturaleza } from '../lib/accounting';
import { PUC_BY_CODE, PUC_CATALOG } from '../data/pucCatalog';
import { Panel, Badge } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';
import { fmtDate } from '../lib/format';

// Libro Mayor — saldo por cuenta auxiliar y desglose de movimientos.
// Espejo compacto de renderLibroMayor + renderAuxiliarCuenta del .js original.
export default function LibroMayor() {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [openCode, setOpenCode] = useState(null);

  // Calcula movimientos y saldos por cuenta auxiliar (level >= 6).
  const rows = useMemo(() => {
    const mov = movimientosPorCuenta(journalLines, journalEntries, period);
    const list = [];
    for (const [code, m] of Object.entries(mov)) {
      const acc = PUC_BY_CODE[code];
      if (!acc) continue;
      const saldo = saldoPorNaturaleza(code, m.debe, m.haber);
      list.push({
        code,
        name: acc.name,
        classCode: acc.classCode,
        nature: acc.nature,
        debe: m.debe,
        haber: m.haber,
        saldo,
        movimientos: m.debe + m.haber,
      });
    }
    list.sort((a, b) => a.code.localeCompare(b.code));
    return list;
  }, [journalEntries, journalLines, period]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) => r.code.includes(term) || r.name.toLowerCase().includes(term),
    );
  }, [rows, search]);

  // Detalle de líneas para la cuenta abierta.
  const detalle = useMemo(() => {
    if (!openCode) return [];
    const idsPeriodo = new Set(
      period === 'all'
        ? journalEntries.map((e) => e.id)
        : journalEntries.filter((e) => e.period === period).map((e) => e.id),
    );
    return journalLines
      .filter((l) => l.accountCode === openCode && idsPeriodo.has(l.journalId))
      .map((l) => {
        const je = journalEntries.find((e) => e.id === l.journalId);
        return { ...l, date: je?.date, concept: je?.concept };
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [openCode, journalLines, journalEntries, period]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (t, r) => {
          t.debe += r.debe;
          t.haber += r.haber;
          return t;
        },
        { debe: 0, haber: 0 },
      ),
    [filtered],
  );

  const totalCuentas = PUC_CATALOG.filter((a) => a.level >= 6).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {filtered.length} cuentas con movimiento · de {totalCuentas} auxiliares del PUC.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código o nombre…"
            className="w-64 rounded-lg border border-white/10 bg-brand-bg/60 px-3 py-2 text-sm text-white placeholder-muted/60 outline-none transition focus:border-gold-accent/60"
          />
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Cuenta</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Naturaleza</th>
                <th className="px-4 py-3 text-right font-medium">Debe</th>
                <th className="px-4 py-3 text-right font-medium">Haber</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const open = openCode === r.code;
                return (
                  <Fragment key={r.code}>
                    <tr
                      onClick={() => setOpenCode(open ? null : r.code)}
                      className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gold-accent">{r.code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{r.name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={r.nature === 'debito' ? 'blue' : 'gold'}>
                          {r.nature === 'debito' ? 'Débito' : 'Crédito'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-emerald-300">
                        {r.debe ? fmtCOP(r.debe) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-orange-300">
                        {r.haber ? fmtCOP(r.haber) : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${
                          r.saldo >= 0 ? 'text-white' : 'text-red-300'
                        }`}
                      >
                        {fmtCOP(r.saldo)}
                      </td>
                      <td className="px-2 py-3 text-center text-muted">{open ? '▾' : '▸'}</td>
                    </tr>
                    {open && (
                      <tr className="bg-brand-bg/40">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="mb-2 text-xs uppercase tracking-wide text-muted">
                            Movimientos · {detalle.length} líneas
                          </div>
                          {detalle.length === 0 ? (
                            <p className="text-sm text-muted">Sin movimientos en el periodo.</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                                  <th className="py-1">Fecha</th>
                                  <th className="py-1">Asiento</th>
                                  <th className="py-1">Concepto</th>
                                  <th className="py-1">Tercero</th>
                                  <th className="py-1 text-right">Debe</th>
                                  <th className="py-1 text-right">Haber</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalle.map((l) => (
                                  <tr key={l.id} className="border-t border-white/5">
                                    <td className="py-1 text-muted">{fmtDate(l.date)}</td>
                                    <td className="py-1 font-mono text-xs text-gold-accent/80">
                                      {l.journalId}
                                    </td>
                                    <td className="py-1 text-white/80">{l.concept || '—'}</td>
                                    <td className="py-1 text-muted">{l.thirdParty || '—'}</td>
                                    <td className="py-1 text-right font-mono tabular-nums text-emerald-300/90">
                                      {l.debit ? fmtCOP(l.debit) : ''}
                                    </td>
                                    <td className="py-1 text-right font-mono tabular-nums text-orange-300/90">
                                      {l.credit ? fmtCOP(l.credit) : ''}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Sin cuentas que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-sm text-white">
                    Totales
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300">
                    {fmtCOP(totals.debe)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-orange-300">
                    {fmtCOP(totals.haber)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-white">
                    {fmtCOP(totals.debe - totals.haber)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Panel>
    </div>
  );
}
