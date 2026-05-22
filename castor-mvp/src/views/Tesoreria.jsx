import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { Tabs, DataTable, EstadoBadge, fmtDate } from '../components/widgets';

export default function Tesoreria() {
  const { bankAccounts, payments, outgoingPayments } = useApp();
  const [tab, setTab] = useState('entrantes');

  const bankName = (id) => bankAccounts.find((b) => b.id === id)?.bank || id;

  const kpis = useMemo(() => {
    const caja = bankAccounts.reduce((a, b) => a + b.balance, 0);
    const ingConf = payments.filter((p) => p.estado === 'confirmado').reduce((a, p) => a + p.amount, 0);
    const pend = payments.filter((p) => p.estado === 'pendiente').reduce((a, p) => a + p.amount, 0);
    const egr = outgoingPayments.filter((p) => p.estado === 'confirmado').reduce((a, p) => a + p.amount, 0);
    return { caja, ingConf, pend, neto: ingConf - egr };
  }, [bankAccounts, payments, outgoingPayments]);

  const inCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'orderId', label: 'Pedido', render: (r) => <span className="text-muted">{r.orderId}</span> },
    { key: 'amount', label: 'Monto', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.amount)}</span> },
    { key: 'method', label: 'Método', render: (r) => <span className="text-muted">{r.method}</span> },
    { key: 'bank', label: 'Cuenta', render: (r) => <span className="text-muted">{bankName(r.bankId)}</span> },
    { key: 'date', label: 'Fecha', render: (r) => <span className="text-muted">{fmtDate(r.date)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  const outCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'tipo', label: 'Tipo', render: (r) => <span className="capitalize text-muted">{r.tipo}</span> },
    { key: 'beneficiario', label: 'Beneficiario', render: (r) => <span className="text-white">{r.beneficiario}</span> },
    { key: 'concepto', label: 'Concepto', render: (r) => <span className="text-muted">{r.concepto}</span> },
    { key: 'amount', label: 'Monto', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.amount)}</span> },
    { key: 'bank', label: 'Cuenta', render: (r) => <span className="text-muted">{bankName(r.bankId)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Caja total bancos" value={fmtCOP(kpis.caja)} accent="#C9A961" />
        <KpiCard label="Ingresos confirmados" value={fmtCOP(kpis.ingConf)} accent="#34d399" />
        <KpiCard label="Pendientes de aprobar" value={fmtCOP(kpis.pend)} accent="#f87171" />
        <KpiCard label="Neto del período" value={fmtCOP(kpis.neto)} accent="#38bdf8" />
      </div>

      {/* Cuentas bancarias */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bankAccounts.map((b) => (
          <div key={b.id} className="panel relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: b.color }} />
            <p className="text-sm font-semibold text-white">{b.bank}</p>
            <p className="text-xs text-muted">{b.type} · {b.number}</p>
            <p className="mt-3 text-xl font-bold tabular-nums text-white">{fmtCOP(b.balance)}</p>
            <p className="mt-1 text-[11px] text-muted">{b.holder} · PUC {b.pucCode}</p>
          </div>
        ))}
      </div>

      <Tabs tabs={[{ id: 'entrantes', label: '⬇ Pagos entrantes' }, { id: 'salientes', label: '⬆ Pagos salientes' }]} active={tab} onChange={setTab} />

      {tab === 'entrantes' && <DataTable columns={inCols} rows={payments} getKey={(r) => r.id} />}
      {tab === 'salientes' && <DataTable columns={outCols} rows={outgoingPayments} getKey={(r) => r.id} />}
    </div>
  );
}
