import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { groupJournal, fmtCOP } from '../lib/accounting';
import { PUC_BY_CODE } from '../data/pucCatalog';
import { Panel, Badge } from '../components/ui';
import PeriodFilter from '../components/PeriodFilter';

const SOURCE_LABELS = {
  apertura: 'Apertura',
  sale_invoice: 'Venta',
  cost_of_sale: 'Costo de venta',
  customer_collection: 'Cobro',
  supply_purchase: 'Compra',
  raw_material_consumption: 'Consumo MP',
  payroll: 'Nómina',
  depreciation: 'Depreciación',
  supplier_payment: 'Pago proveedor',
};

function EntryRow({ entry, open, onToggle }) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-gold-accent">{entry.id}</span>
        </td>
        <td className="px-4 py-3 text-sm text-muted">{entry.date}</td>
        <td className="px-4 py-3">
          <Badge tone="blue">{SOURCE_LABELS[entry.source] || entry.source}</Badge>
        </td>
        <td className="px-4 py-3 text-sm text-white">{entry.concept}</td>
        <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-emerald-300">
          {fmtCOP(entry.debe)}
        </td>
        <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-orange-300">
          {fmtCOP(entry.haber)}
        </td>
        <td className="px-2 py-3 text-center text-muted">{open ? '▾' : '▸'}</td>
      </tr>
      {open &&
        entry.lines.map((l) => {
          const acc = PUC_BY_CODE[l.accountCode];
          return (
            <tr key={l.id} className="border-b border-white/5 bg-brand-bg/40 text-sm">
              <td className="px-4 py-2" />
              <td className="px-4 py-2" colSpan={2}>
                <span className="font-mono text-xs text-muted">{l.accountCode}</span>{' '}
                <span className="text-white/90">{acc?.name || '—'}</span>
                {l.thirdParty && (
                  <span className="ml-2 text-xs text-muted">· {l.thirdParty}</span>
                )}
                {l.costCenter && (
                  <span className="ml-2 text-[11px] text-gold-accent/70">[{l.costCenter}]</span>
                )}
              </td>
              <td className="px-4 py-2 text-sm text-muted">
                {l.debit ? '' : ''}
              </td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-emerald-300/90">
                {l.debit ? fmtCOP(l.debit) : ''}
              </td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-orange-300/90">
                {l.credit ? fmtCOP(l.credit) : ''}
              </td>
              <td />
            </tr>
          );
        })}
    </>
  );
}

export default function LibroDiario({ search }) {
  const { journalEntries, journalLines } = useApp();
  const [period, setPeriod] = useState('all');
  const [openId, setOpenId] = useState(null);

  const grouped = useMemo(
    () => groupJournal(journalEntries, journalLines, period, search),
    [journalEntries, journalLines, period, search],
  );

  const totals = useMemo(
    () =>
      grouped.reduce(
        (t, e) => {
          t.debe += e.debe;
          t.haber += e.haber;
          return t;
        },
        { debe: 0, haber: 0 },
      ),
    [grouped],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {grouped.length} asientos · doble partida (clic para ver el detalle de líneas).
          {search ? ` Filtrando por “${search}”.` : ''}
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <Panel className="overflow-hidden">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Asiento</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Concepto</th>
                <th className="px-4 py-3 text-right font-medium">Debe</th>
                <th className="px-4 py-3 text-right font-medium">Haber</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {grouped.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  open={openId === e.id}
                  onToggle={() => setOpenId(openId === e.id ? null : e.id)}
                />
              ))}
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    No hay asientos para el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
            {grouped.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 font-semibold">
                  <td className="px-4 py-3 text-sm text-white" colSpan={4}>
                    Totales
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300">
                    {fmtCOP(totals.debe)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-orange-300">
                    {fmtCOP(totals.haber)}
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
