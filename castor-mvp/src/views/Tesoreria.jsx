import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP, fmtDate, today } from '../lib/format';
import { Tabs, DataTable, EstadoBadge } from '../components/widgets';
import Chart from '../components/Chart';
import { IconBank, IconCheck, IconShield, IconBook } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const METHODS = ['Transferencia', 'Efectivo', 'Cheque', 'Tarjeta'];

export default function Tesoreria() {
  const { bankAccounts, payments, outgoingPayments, suppliers, employees, update, add, nextId } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('entrantes');
  const [out, setOut] = useState(null);

  const bankName = (id) => bankAccounts.find((b) => b.id === id)?.bank || id;

  const kpis = useMemo(() => {
    const caja = bankAccounts.reduce((a, b) => a + b.balance, 0);
    const ingConf = payments.filter((p) => p.estado === 'confirmado').reduce((a, p) => a + p.amount, 0);
    const pend = payments.filter((p) => p.estado === 'pendiente').reduce((a, p) => a + p.amount, 0);
    const egr = outgoingPayments.filter((p) => p.estado === 'confirmado').reduce((a, p) => a + p.amount, 0);
    return { caja, ingConf, pend, neto: ingConf - egr };
  }, [bankAccounts, payments, outgoingPayments]);

  // Gráfico "Saldos por cuenta (M COP)" — barras horizontales por cuenta.
  const banksChart = useMemo(() => ({
    labels: bankAccounts.map((b) => `${b.bank} ${b.type}`),
    datasets: [{
      data: bankAccounts.map((b) => b.balance / 1e6),
      backgroundColor: bankAccounts.map((b) => b.color),
      borderRadius: 6,
    }],
  }), [bankAccounts]);

  // Gráfico "Flujo de ingresos" — línea de pagos entrantes ordenados por fecha.
  const cashflowChart = useMemo(() => {
    const sorted = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    return {
      labels: sorted.map((p) => fmtDate(p.date)),
      datasets: [{
        label: 'Ingresos (M COP)',
        data: sorted.map((p) => p.amount / 1e6),
        borderColor: '#C9A961',
        backgroundColor: 'rgba(201,169,97,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#C9A961',
      }],
    };
  }, [payments]);

  const approve = (id) => { update('payments', id, { estado: 'confirmado' }); toast('Pago confirmado', 'ok'); };
  const reject = (id) => { update('payments', id, { estado: 'rechazado' }); toast('Pago rechazado', 'warn'); };
  const confirmOut = (id) => { update('outgoingPayments', id, { estado: 'confirmado' }); toast('Egreso confirmado', 'ok'); };
  const annulOut = (id) => { update('outgoingPayments', id, { estado: 'anulado' }); toast('Egreso anulado', 'warn'); };

  const setO = (k, v) => setOut((o) => ({ ...o, [k]: v }));
  const benefList = out?.tipo === 'empleado' ? employees.map((e) => e.name) : suppliers.map((s) => s.name);
  function saveOut() {
    if (!out.beneficiario) return toast('Selecciona beneficiario', 'warn');
    if (!(Number(out.amount) > 0)) return toast('Monto inválido', 'warn');
    const id = nextId('OUT', 'out', 3);
    add('outgoingPayments', {
      id, tipo: out.tipo, beneficiario: out.beneficiario, concepto: out.concepto, ocId: null,
      amount: Number(out.amount), method: out.method, bankId: out.bankId, estado: 'pendiente',
      date: out.date, reference: out.reference || id,
    });
    toast(`Egreso ${id} registrado`, 'ok');
    setOut(null);
  }

  const inCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-brand-gold">{r.id}</span> },
    { key: 'orderId', label: 'Pedido', render: (r) => <span className="text-brand-muted">{r.orderId}</span> },
    { key: 'amount', label: 'Monto', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.amount)}</span> },
    { key: 'method', label: 'Método', render: (r) => <span className="text-brand-muted">{r.method}</span> },
    { key: 'bank', label: 'Cuenta', render: (r) => <span className="text-brand-muted">{bankName(r.bankId)}</span> },
    { key: 'date', label: 'Fecha', render: (r) => <span className="text-brand-muted">{fmtDate(r.date)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
    {
      key: 'acc', label: '', render: (r) =>
        r.estado === 'pendiente' ? (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button className="rounded bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/25" onClick={() => approve(r.id)}>Aprobar</button>
            <button className="rounded bg-red-500/15 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/25" onClick={() => reject(r.id)}>Rechazar</button>
          </div>
        ) : null,
    },
  ];

  const outCols = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-brand-gold">{r.id}</span> },
    { key: 'tipo', label: 'Tipo', render: (r) => <span className="capitalize text-brand-muted">{r.tipo}</span> },
    { key: 'beneficiario', label: 'Beneficiario', render: (r) => <span className="text-white">{r.beneficiario}</span> },
    { key: 'concepto', label: 'Concepto', render: (r) => <span className="text-brand-muted">{r.concepto}</span> },
    { key: 'amount', label: 'Monto', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.amount)}</span> },
    { key: 'bank', label: 'Cuenta', render: (r) => <span className="text-brand-muted">{bankName(r.bankId)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
    {
      key: 'acc', label: '', render: (r) => (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          {r.estado === 'pendiente' && <button className="rounded bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/25" onClick={() => confirmOut(r.id)}>Confirmar</button>}
          {r.estado !== 'anulado' && <button className="rounded bg-red-500/15 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/25" onClick={() => annulOut(r.id)}>Anular</button>}
        </div>
      ),
    },
  ];

  return (
    <div className="page space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Caja total bancos" value={fmtCOP(kpis.caja)} hint={`${bankAccounts.length} cuentas`} accent="#C9A961" icon={<IconBank width={18} height={18} />} />
        <KpiCard label="Ingresos confirmados" value={fmtCOP(kpis.ingConf)} hint={`${payments.filter((p) => p.estado === 'confirmado').length} pagos`} accent="#10b981" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="Pendientes de aprobar" value={fmtCOP(kpis.pend)} hint={`${payments.filter((p) => p.estado === 'pendiente').length} ingresos`} accent={kpis.pend ? '#f59e0b' : '#3b82f6'} icon={<IconShield width={18} height={18} />} />
        <KpiCard label="Neto del período" value={fmtCOP(kpis.neto)} hint="Utilidad caja" accent="#3b82f6" icon={<IconBook width={18} height={18} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bankAccounts.map((b) => (
          <div key={b.id} className="panel relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: b.color }} />
            <p className="text-sm font-semibold text-white">{b.bank}</p>
            <p className="text-xs text-brand-muted">{b.type} · {b.number}</p>
            <p className="mt-3 text-xl font-bold tabular-nums text-white">{fmtCOP(b.balance)}</p>
            <p className="mt-1 text-[11px] text-brand-muted">{b.holder || ''} · PUC {b.pucCode}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="mb-4 font-semibold text-brand-gold">Saldos por cuenta (M COP)</h3>
          <Chart type="bar" data={banksChart} height={280} options={{
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { grid: { color: '#2A4061' } }, y: { grid: { display: false } } },
          }} />
        </div>
        <div className="panel p-5">
          <h3 className="mb-4 font-semibold text-brand-gold">Flujo de ingresos</h3>
          <Chart type="line" data={cashflowChart} height={280} options={{
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: '#2A4061' } }, x: { grid: { display: false } } },
          }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Tabs tabs={[{ id: 'entrantes', label: '⬇ Pagos entrantes' }, { id: 'salientes', label: '⬆ Pagos salientes' }]} active={tab} onChange={setTab} />
        {tab === 'salientes' && (
          <button className="btn-gold" onClick={() => setOut({ tipo: 'proveedor', beneficiario: '', concepto: '', amount: '', method: 'Transferencia', bankId: bankAccounts[0]?.id, date: today(), reference: '' })}>
            + Registrar pago
          </button>
        )}
      </div>

      {tab === 'entrantes' && <DataTable columns={inCols} rows={payments} getKey={(r) => r.id} />}
      {tab === 'salientes' && <DataTable columns={outCols} rows={outgoingPayments} getKey={(r) => r.id} />}

      <Modal
        open={!!out}
        onClose={() => setOut(null)}
        title="Registrar pago saliente"
        footer={
          <>
            <button className="btn-outline" onClick={() => setOut(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveOut}>Registrar</button>
          </>
        }
      >
        {out && (
          <FormGrid cols={2}>
            <Field label="Tipo">
              <Select value={out.tipo} onChange={(e) => setO('tipo', e.target.value) || setO('beneficiario', '')}>
                <option value="proveedor">Proveedor</option>
                <option value="empleado">Empleado</option>
              </Select>
            </Field>
            <Field label="Beneficiario">
              <Select value={out.beneficiario} onChange={(e) => setO('beneficiario', e.target.value)}>
                <option value="">Selecciona…</option>
                {benefList.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Concepto" className="sm:col-span-2"><Input value={out.concepto} onChange={(e) => setO('concepto', e.target.value)} /></Field>
            <Field label="Monto (COP)"><Input type="number" value={out.amount} onChange={(e) => setO('amount', e.target.value)} /></Field>
            <Field label="Método">
              <Select value={out.method} onChange={(e) => setO('method', e.target.value)}>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Cuenta origen">
              <Select value={out.bankId} onChange={(e) => setO('bankId', e.target.value)}>
                {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bank} {b.type}</option>)}
              </Select>
            </Field>
            <Field label="Fecha"><Input type="date" value={out.date} onChange={(e) => setO('date', e.target.value)} /></Field>
            <Field label="Referencia" className="sm:col-span-2"><Input value={out.reference} onChange={(e) => setO('reference', e.target.value)} /></Field>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
