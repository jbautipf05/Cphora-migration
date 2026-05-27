import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP, fmtDate, today, uid } from '../lib/format';
import { Tabs, DataTable, EstadoBadge } from '../components/widgets';
import Chart from '../components/Chart';
import { IconBank, IconCheck, IconShield, IconBook } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const METHODS = ['Transferencia', 'Efectivo', 'Cheque', 'Tarjeta'];
const BANK_TYPES = ['Corriente', 'Ahorros', 'Empresarial', 'Recaudo', 'Efectivo'];

const emptyBank = () => ({ mode: 'new', id: null, bank: '', type: 'Corriente', number: '****', holder: 'Castor SAS', balance: 0, color: '#C9A961' });

export default function Tesoreria() {
  const {
    bankAccounts, payments, outgoingPayments, orders, suppliers, employees, pucAccounts, journalLines,
    update, add, setState, nextId,
    postCustomerCollection, postSupplierPayment, postBankAdjustment,
  } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('entrantes');
  const [out, setOut] = useState(null);
  const [bankForm, setBankForm] = useState(null); // CRUD de cuentas (§7.8)
  const [adjForm, setAdjForm] = useState(null); // conciliación / ajuste de saldo (T4)

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

  // T1 — Aprobar pago entrante: estado + acreditar banco + paid% del pedido + asiento de cobro.
  const approve = (id) => {
    const p = payments.find((x) => x.id === id);
    if (!p || p.estado === 'confirmado') return;
    const order = orders.find((o) => o.id === p.orderId);
    setState((s) => {
      const np = s.payments.map((x) =>
        x.id === id ? { ...x, estado: 'confirmado', approvedAt: today(), approvedBy: s.currentUser?.name || 'Tesorería' } : x,
      );
      const nb = s.bankAccounts.map((b) => (b.id === p.bankId ? { ...b, balance: (b.balance || 0) + (p.amount || 0) } : b));
      let no = s.orders;
      if (order) {
        const sumPag = np.filter((x) => x.orderId === p.orderId && x.estado === 'confirmado').reduce((a, x) => a + (x.amount || 0), 0);
        const pct = order.total ? Math.min(100, Math.round((sumPag / order.total) * 100)) : 0;
        no = s.orders.map((o) => (o.id === p.orderId ? { ...o, paid: pct } : o));
      }
      return { ...s, payments: np, bankAccounts: nb, orders: no };
    });
    const res = postCustomerCollection({ id, date: today(), customerId: order?.customerId || null, bankAccountId: p.bankId, amount: p.amount, invoiceId: p.orderId });
    if (res?.ok) toast(`Ingreso aprobado · asiento ${res.journalEntry.id}`, 'ok');
    else toast(`Ingreso aprobado (aviso contable: ${res?.message || res?.error || '—'})`, 'warn');
  };
  // reject solo aplica a pendientes (nunca se posteó asiento) → estado simple.
  const reject = (id) => { update('payments', id, { estado: 'rechazado' }); toast('Pago rechazado', 'warn'); };

  // T2 — Confirmar pago saliente: estado + debitar banco + asiento de egreso.
  const confirmOut = (id) => {
    const p = outgoingPayments.find((x) => x.id === id);
    if (!p || p.estado === 'confirmado') return;
    setState((s) => ({
      ...s,
      outgoingPayments: s.outgoingPayments.map((x) => (x.id === id ? { ...x, estado: 'confirmado', confirmedAt: today() } : x)),
      bankAccounts: s.bankAccounts.map((b) => (b.id === p.bankId ? { ...b, balance: Math.max(0, (b.balance || 0) - (p.amount || 0)) } : b)),
    }));
    const res = postSupplierPayment({ id, date: p.date || today(), beneficiario: p.beneficiario, beneficiarioId: p.beneficiario, bankAccountId: p.bankId, amount: p.amount, purchaseOrderId: p.ocId || null });
    if (res?.ok) toast(`Egreso confirmado · asiento ${res.journalEntry.id}`, 'ok');
    else toast(`Egreso confirmado (aviso contable: ${res?.message || res?.error || '—'})`, 'warn');
  };
  // annulOut: si estaba confirmado, re-acredita el banco (revertir el asiento queda como follow-up).
  const annulOut = (id) => {
    const p = outgoingPayments.find((x) => x.id === id);
    if (!p || p.estado === 'anulado') return;
    setState((s) => ({
      ...s,
      outgoingPayments: s.outgoingPayments.map((x) => (x.id === id ? { ...x, estado: 'anulado' } : x)),
      bankAccounts: p.estado === 'confirmado'
        ? s.bankAccounts.map((b) => (b.id === p.bankId ? { ...b, balance: (b.balance || 0) + (p.amount || 0) } : b))
        : s.bankAccounts,
    }));
    toast('Egreso anulado', 'warn');
  };

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

  // ── Bank CRUD (§7.8) ────────────────────────────────────────────────────────
  // Próxima auxiliar PUC de bancos 1110-XX libre (espejo de ensureBankPucAccount).
  function nextBankPuc() {
    const used = (pucAccounts || []).filter((a) => /^1110\d\d$/.test(a.code)).map((a) => +a.code.slice(4));
    const next = (used.length ? Math.max(...used) : 0) + 5;
    return '1110' + String(next).padStart(2, '0');
  }
  const setB = (k, v) => setBankForm((f) => ({ ...f, [k]: v }));

  function saveBank() {
    if (!bankForm.bank.trim()) return toast('Indica el banco', 'warn');
    if (bankForm.mode === 'edit') {
      // Editar no toca saldo ni pucCode (esos derivan de movimientos/contabilidad).
      update('bankAccounts', bankForm.id, {
        bank: bankForm.bank.trim(), type: bankForm.type, number: bankForm.number,
        holder: bankForm.holder, color: bankForm.color,
      });
      toast('Cuenta actualizada', 'ok');
    } else {
      const pucCode = nextBankPuc();
      // ensureBankPucAccount: crea la auxiliar 1110-XX si no existe (shape del catálogo).
      if (!(pucAccounts || []).some((a) => a.code === pucCode)) {
        add('pucAccounts', { code: pucCode, name: `${bankForm.bank.trim()} ${bankForm.type}`, nature: 'debito', classCode: '1', level: 6, parentCode: '1110', activa: true });
      }
      add('bankAccounts', {
        id: uid('B'), bank: bankForm.bank.trim(), type: bankForm.type, number: bankForm.number || '****',
        holder: bankForm.holder || 'Castor SAS', balance: Number(bankForm.balance) || 0,
        color: bankForm.color || '#C9A961', pucCode,
      });
      toast(`Cuenta creada · PUC ${pucCode}`, 'ok');
    }
    setBankForm(null);
  }

  // Eliminar bloqueado si la cuenta tiene saldo o movimientos/asientos asociados (§7.8).
  function deleteBank(b) {
    const hasIn = payments.some((p) => p.bankId === b.id);
    const hasOut = outgoingPayments.some((p) => p.bankId === b.id);
    const hasJE = (journalLines || []).some((l) => l.accountCode === b.pucCode);
    if (b.balance !== 0 || hasIn || hasOut || hasJE) {
      return toast('No se puede eliminar: la cuenta tiene saldo o movimientos asociados', 'warn');
    }
    setState((s) => ({ ...s, bankAccounts: s.bankAccounts.filter((x) => x.id !== b.id) }));
    toast(`Cuenta ${b.bank} eliminada`, 'ok');
  }

  // T4 — Conciliación: ajusta el saldo (+/-) y genera el asiento de ajuste.
  function saveAdjust() {
    const delta = Number(adjForm.delta) || 0;
    if (!delta) return toast('Ingresa un ajuste distinto de 0', 'warn');
    if (!adjForm.concept.trim()) return toast('Indica el concepto', 'warn');
    setState((s) => ({
      ...s,
      bankAccounts: s.bankAccounts.map((b) => (b.id === adjForm.bankId ? { ...b, balance: Math.max(0, (b.balance || 0) + delta) } : b)),
    }));
    const res = postBankAdjustment({ id: uid('BADJ'), bankId: adjForm.bankId, delta, concept: adjForm.concept.trim(), date: today() });
    if (res?.ok) toast(`Saldo ajustado · asiento ${res.journalEntry.id}`, 'ok');
    else toast(`Saldo ajustado (aviso contable: ${res?.message || res?.error || '—'})`, 'warn');
    setAdjForm(null);
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

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-brand-gold">Cuentas bancarias</h3>
        <button className="btn-gold" onClick={() => setBankForm(emptyBank())}>+ Nueva cuenta</button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bankAccounts.map((b) => (
          <div key={b.id} className="panel relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: b.color }} />
            <p className="text-sm font-semibold text-white">{b.bank}</p>
            <p className="text-xs text-brand-muted">{b.type} · {b.number}</p>
            <p className="mt-3 text-xl font-bold tabular-nums text-white">{fmtCOP(b.balance)}</p>
            <p className="mt-1 text-[11px] text-brand-muted">{b.holder || ''} · PUC {b.pucCode}</p>
            <div className="mt-3 flex gap-3 border-t border-white/5 pt-2">
              <button className="text-[11px] text-brand-gold hover:underline" onClick={() => setBankForm({ mode: 'edit', ...b })}>✎ Editar</button>
              <button className="text-[11px] text-sky-300 hover:underline" onClick={() => setAdjForm({ bankId: b.id, delta: '', concept: '' })}>⚖ Conciliar</button>
              <button className="text-[11px] text-red-300 hover:underline" onClick={() => deleteBank(b)}>🗑 Eliminar</button>
            </div>
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

      {/* CRUD de cuenta bancaria (§7.8) */}
      <Modal
        open={!!bankForm}
        onClose={() => setBankForm(null)}
        title={bankForm?.mode === 'edit' ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setBankForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveBank}>{bankForm?.mode === 'edit' ? 'Guardar' : 'Crear'}</button>
          </>
        }
      >
        {bankForm && (
          <FormGrid cols={1}>
            <Field label="Banco *"><Input value={bankForm.bank} onChange={(e) => setB('bank', e.target.value)} /></Field>
            <Field label="Tipo">
              <Select value={bankForm.type} onChange={(e) => setB('type', e.target.value)}>
                {BANK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Nº cuenta (4 últimos)"><Input value={bankForm.number} onChange={(e) => setB('number', e.target.value)} /></Field>
            <Field label="Titular"><Input value={bankForm.holder} onChange={(e) => setB('holder', e.target.value)} /></Field>
            {bankForm.mode === 'new' && (
              <Field label="Saldo inicial (COP)"><Input type="number" min="0" value={bankForm.balance} onChange={(e) => setB('balance', e.target.value)} /></Field>
            )}
            <Field label="Color (hex)"><Input value={bankForm.color} onChange={(e) => setB('color', e.target.value)} placeholder="#C9A961" /></Field>
            {bankForm.mode === 'new' && (
              <p className="text-[11px] text-brand-muted">Se creará automáticamente la auxiliar PUC <b className="text-brand-gold-light">{nextBankPuc()}</b> (1110-XX).</p>
            )}
          </FormGrid>
        )}
      </Modal>

      {/* Conciliación / ajuste de saldo (T4) */}
      <Modal
        open={!!adjForm}
        onClose={() => setAdjForm(null)}
        title={adjForm ? `Conciliar ${bankName(adjForm.bankId)}` : 'Conciliar'}
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setAdjForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveAdjust}>Aplicar</button>
          </>
        }
      >
        {adjForm && (
          <FormGrid cols={1}>
            <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 text-sm">
              Saldo actual: <b className="text-brand-gold">{fmtCOP(bankAccounts.find((b) => b.id === adjForm.bankId)?.balance || 0)}</b>
            </div>
            <Field label="Ajuste (+/- COP)"><Input type="number" value={adjForm.delta} onChange={(e) => setAdjForm((f) => ({ ...f, delta: e.target.value }))} placeholder="Ej: 5000000 o -2000000" /></Field>
            <Field label="Concepto"><Input value={adjForm.concept} onChange={(e) => setAdjForm((f) => ({ ...f, concept: e.target.value }))} /></Field>
            <p className="text-[11px] text-brand-muted">
              {(Number(adjForm.delta) || 0) >= 0 ? 'Genera DB 1110-XX / CR 425095 (ingreso por ajuste).' : 'Genera DB 539595 / CR 1110-XX (gasto por ajuste).'}
            </p>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
