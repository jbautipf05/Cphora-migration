import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Chip, TIPO_VENTA, TIPO_DOC, MEDIO_VENTA, PDV_VARIANT } from '../components/ui';
import { fmtCOP, fmtDate, today } from '../lib/format';
import { resolveCustomerId } from '../lib/migrations';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, ProgressBar, SlidePanel, ClearFiltersButton } from '../components/widgets';
import { IconCart, IconBank, IconCheck } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const METHODS = ['Transferencia', 'Tarjeta', 'Efectivo', 'Cheque'];
const ASESORES = ['Alexander Vivas', 'Thalia Cifuentes'];
const MEDIOS = ['TIENDA', 'LEAD', 'FERIA', 'REMARKETING', 'REFERIDO'];
const PDVS = ['CASTOR 43', 'CASTOR CTG', 'PAGINA WEB', 'GERENCIA'];

const emptyOrder = () => ({
  clientName: '', asesor: 'Alexander Vivas', productId: '', qty: 1,
  tipo: 'produccion', docType: 'factura', deliveryAddress: '', paid: 0, tiempo: 30,
});

export default function Ventas() {
  const {
    orders,
    products,
    customers,
    payments,
    invoices,
    bankAccounts,
    add,
    update,
    nextId,
    postSale,
    postCustomerCollection,
  } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [medio, setMedio] = useState('');
  const [pdv, setPdv] = useState('');
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(null);
  const [pay, setPay] = useState(null); // {orderId, amount, method, bankId}

  // OPs rechazadas por auditoría (espejo HTML línea 5216).
  const rechazadas = useMemo(
    () => orders.filter((o) => o.opRejected && !o.verified),
    [orders],
  );

  const sel = orders.find((o) => o.id === selId) || null;
  const estados = useMemo(() => [...new Set(orders.map((o) => o.estado))], [orders]);
  const tipos = useMemo(() => [...new Set(orders.map((o) => o.tipo))], [orders]);
  const pName = (id) => products.find((p) => p.id === id)?.name || id;
  // B2 (ADR-011): nombre a mostrar resuelto por customerId (refleja renombres);
  // fallback al clientName almacenado para datos legacy sin FK.
  const custName = (o) => customers.find((c) => c.id === o.customerId)?.name || o.clientName;

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return orders.filter((o) => {
      if (estado && o.estado !== estado) return false;
      if (tipo && o.tipo !== tipo) return false;
      if (medio && o.medio !== medio) return false;
      if (pdv && o.pdv !== pdv) return false;
      if (
        t &&
        !`${o.id} ${o.clientName} ${o.asesor || ''} ${o.medio || ''} ${o.pdv || ''}`
          .toLowerCase()
          .includes(t)
      )
        return false;
      return true;
    });
  }, [orders, q, estado, tipo, medio, pdv]);

  const kpis = useMemo(() => {
    const valor = orders.reduce((a, o) => a + (o.total || 0), 0);
    const cobrado = orders.reduce((a, o) => a + (o.total || 0) * (o.paid / 100), 0);
    return {
      pedidos: orders.length,
      valor,
      cobrado,
      saldo: valor - cobrado,
      recaudoPct: Math.round((cobrado / valor) * 100 || 0),
    };
  }, [orders]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const formTotal = form ? (products.find((p) => p.id === form.productId)?.price || 0) * form.qty : 0;

  function saveOrder() {
    if (!form.clientName.trim()) return toast('Indica el cliente', 'warn');
    if (!form.productId) return toast('Selecciona un producto', 'warn');
    const id = nextId('PED', 'ped');
    // B1 (Fase 1.5): anclar a today()/DEMO_TODAY igual que A27, para que el pedido
    // caiga dentro de la ventana de Inicio (gráfico 6 meses / alertas).
    const orderDate = today();
    const clientName = form.clientName.trim();

    // B2 (ADR-011): resolver el cliente y guardar customerId (FK canónica). Si no
    // existe (walk-in), se crea automáticamente. clientName queda como denormalización.
    let customerId = resolveCustomerId({ clientName }, { customers });
    if (!customerId) {
      customerId = nextId('C', 'cli', 3);
      add('customers', {
        id: customerId, name: clientName, tipo: 'lead', phone: '', email: '',
        city: '', address: form.deliveryAddress || '', doc: '', createdAt: today(),
        asesor: form.asesor, linkedLeadId: null,
      });
      toast(`Cliente ${customerId} creado`, 'ok');
    }

    add('orders', {
      id, quoteId: null, customerId, clientName, asesor: form.asesor,
      total: formTotal, paid: Number(form.paid) || 0, tiempo: Number(form.tiempo) || 30,
      orderDate, estado: form.tipo === 'stock' ? 'produccion' : 'pendiente_op',
      area: null, tipo: form.tipo, docType: form.docType, deliveryAddress: form.deliveryAddress,
      verified: false, productId: form.productId, qty: Number(form.qty) || 1,
    });
    toast(`Pedido ${id} creado`, 'ok');

    // Contabiliza la venta automáticamente (CxR DR / Ingresos CR / IVA CR si factura).
    // El asiento queda visible en Libro Diario y Libro Mayor en tiempo real.
    const sale = postSale({
      id,
      date: orderDate,
      type: form.docType, // 'factura' | 'remisión'
      customerId, // B2: tercero real (id), no el nombre
      customerName: clientName,
      total: formTotal,
    });
    if (sale?.ok) {
      toast(`Asiento contable ${sale.journalEntry.id} generado`, 'ok');
    } else if (sale?.error) {
      toast(`Aviso contable: ${sale.message || sale.error}`, 'warn');
    }
    setForm(null);
  }

  function savePayment() {
    const order = orders.find((o) => o.id === pay.orderId);
    const amount = Number(pay.amount) || 0;
    if (amount <= 0) return toast('Monto inválido', 'warn');
    const id = nextId('PAG', 'pag');
    const date = today(); // B1 (Fase 1.5): anclar el pago al "hoy" del demo
    add('payments', {
      id, orderId: pay.orderId, amount, method: pay.method, bankId: pay.bankId,
      type: 'abono', date, reference: id, estado: 'confirmado',
    });
    const totalPagado = payments.filter((p) => p.orderId === pay.orderId).reduce((a, p) => a + p.amount, 0) + amount;
    update('orders', pay.orderId, { paid: Math.min(100, Math.round((totalPagado / (order.total || 1)) * 100)) });
    toast(`Pago ${fmtCOP(amount)} registrado`, 'ok');

    // Contabiliza el cobro (Banco DR / CxR CR) si hay cuenta bancaria.
    const collection = postCustomerCollection({
      id,
      date,
      customerId: order?.customerId || order?.clientName,
      bankAccountId: pay.bankId,
      amount,
      invoiceId: pay.orderId,
    });
    if (collection?.ok) {
      toast(`Asiento ${collection.journalEntry.id} de cobro generado`, 'ok');
    } else if (collection?.error && collection.error !== 'missing_bank') {
      toast(`Aviso contable: ${collection.message || collection.error}`, 'warn');
    }
    setPay(null);
  }

  const columns = [
    { key: 'id', label: 'Pedido', render: (r) => <span className="font-mono text-xs text-brand-gold">{r.id}</span> },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{custName(r)}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-brand-muted">{r.asesor}</span> },
    { key: 'producto', label: 'Producto', render: (r) => <span className="text-brand-muted">{pName(r.productId)} ×{r.qty}</span> },
    { key: 'total', label: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => <span className="text-white">{fmtCOP(r.total)}</span> },
    {
      key: 'saldo',
      label: 'Saldo',
      align: 'right',
      sortValue: (r) => (r.total || 0) * (1 - (r.paid || 0) / 100),
      render: (r) => {
        const saldo = (r.total || 0) * (1 - (r.paid || 0) / 100);
        return (
          <span className={saldo > 0 ? 'text-amber-300' : 'text-emerald-300'}>
            {fmtCOP(saldo)}
          </span>
        );
      },
    },
    { key: 'pago', label: 'Pago', sortValue: (r) => r.paid, render: (r) => <ProgressBar value={r.paid} /> },
    {
      key: 'tipo',
      label: 'Tipo',
      sortValue: (r) => r.tipo,
      render: (r) => <Chip variant={TIPO_VENTA[r.tipo] || 'gray'}>{r.tipo}</Chip>,
    },
    {
      key: 'medio',
      label: 'Medio',
      sortValue: (r) => r.medio,
      render: (r) => r.medio ? <Chip variant={MEDIO_VENTA[r.medio] || 'gray'}>{r.medio}</Chip> : <span className="text-muted/50">—</span>,
    },
    {
      key: 'pdv',
      label: 'PDV',
      sortValue: (r) => r.pdv,
      render: (r) => r.pdv ? <Chip variant={PDV_VARIANT[r.pdv] || 'gray'}>{r.pdv}</Chip> : <span className="text-muted/50">—</span>,
    },
    {
      key: 'doc',
      label: 'Doc',
      sortValue: (r) => r.docType,
      render: (r) => <Chip variant={TIPO_DOC[r.docType] || 'gray'}>{r.docType}</Chip>,
    },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Banner OPs rechazadas — espejo HTML línea 5218 */}
      {rechazadas.length > 0 && (
        <div className="panel p-4" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-red-300">
              ✗ OPs rechazadas por auditoría — requieren corrección
            </h3>
            <span className="text-[11px] text-brand-muted">{rechazadas.length} pedido(s)</span>
          </div>
          <div className="space-y-2">
            {rechazadas.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelId(o.id)}
                className="panel-2 w-full rounded p-3 text-left transition hover:border-red-400/40"
                style={{ borderLeft: '3px solid #ef4444' }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-brand-gold">{o.id}</span>
                  <span className="font-medium text-white">{custName(o) || ''}</span>
                  <span className="text-xs text-brand-muted">{pName(o.productId)} ×{o.qty || 1}</span>
                  {o.asesor && (
                    <span className="badge-gold rounded px-2 py-0.5 text-[10px]">
                      {o.asesor}
                    </span>
                  )}
                </div>
                {o.opRejectedReason && (
                  <p className="mt-1 text-xs italic text-red-200">"{o.opRejectedReason}"</p>
                )}
                {(o.opRejectedBy || o.opRejectedAt) && (
                  <p className="mt-1 text-[10px] text-brand-muted">
                    Rechazado por {o.opRejectedBy || '—'} · {fmtDate(o.opRejectedAt)}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* H-030: iconos + subtítulos (patrón H-016). Ver Demo6:5246-5249. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pedidos totales" value={kpis.pedidos} hint="Histórico" accent="#C9A961" icon={<IconCart width={18} height={18} />} />
        <KpiCard label="Valor ventas" value={fmtCOP(kpis.valor)} hint="Suma" accent="#10b981" icon={<IconBank width={18} height={18} />} />
        <KpiCard label="Cobrado" value={fmtCOP(kpis.cobrado)} hint={`${kpis.recaudoPct}% recaudo`} accent="#3b82f6" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="Saldo pendiente" value={fmtCOP(kpis.saldo)} hint="Por cobrar" accent="#ef4444" icon={<IconBank width={18} height={18} />} />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar pedido, cliente, asesor, medio, PDV…" />
        <SelectFilter value={estado} onChange={setEstado} options={estados} allLabel="Todos los estados" />
        <SelectFilter value={tipo} onChange={setTipo} options={tipos} allLabel="Todos los tipos" />
        <SelectFilter value={medio} onChange={setMedio} options={MEDIOS} allLabel="Todos los medios" />
        <SelectFilter value={pdv} onChange={setPdv} options={PDVS} allLabel="Todos los PDV" />
        <ClearFiltersButton
          active={!!(q || estado || tipo || medio || pdv)}
          onClear={() => { setQ(''); setEstado(''); setTipo(''); setMedio(''); setPdv(''); }}
        />
        <span className="ml-auto text-sm text-brand-muted">{rows.length} pedidos</span>
        <button className="btn-gold" onClick={() => setForm(emptyOrder())}>+ Nuevo pedido</button>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={(r) => setSelId(r.id)} />

      <SlidePanel open={!!sel} onClose={() => setSelId(null)} title={sel?.id} subtitle={sel ? `${custName(sel)} · ${fmtDate(sel.orderDate)}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge value={sel.estado} />
              <EstadoBadge value={sel.tipo} />
              <Select
                className="ml-auto !w-auto !py-1 text-xs"
                value={sel.estado}
                onChange={(e) => update('orders', sel.id, { estado: e.target.value })}
              >
                {['pendiente_op', 'produccion', 'entregado', 'cancelado'].map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['Total', fmtCOP(sel.total)], ['Pagado', `${sel.paid}%`], ['Doc', sel.docType]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-brand-muted">{k}</p>
                  <p className="mt-0.5 font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-3 text-sm">
              <p className="text-[11px] uppercase text-brand-muted">Producto · OP</p>
              <p className="mt-0.5 text-white">{pName(sel.productId)} × {sel.qty} · área {sel.area || '—'}</p>
              <p className="mt-1 text-xs text-brand-muted">Entrega: {sel.deliveryAddress}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-light/80">Pagos</p>
                <button className="btn-outline !py-1 !text-xs" onClick={() => setPay({ orderId: sel.id, amount: '', method: 'Transferencia', bankId: bankAccounts[0]?.id })}>
                  + Registrar pago
                </button>
              </div>
              <div className="space-y-1.5">
                {payments.filter((p) => p.orderId === sel.id).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-bg/40 px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-brand-gold">{p.id}</span>
                    <span className="text-brand-muted">{p.method}</span>
                    <span className="text-white">{fmtCOP(p.amount)}</span>
                    <EstadoBadge value={p.estado} />
                  </div>
                ))}
                {payments.filter((p) => p.orderId === sel.id).length === 0 && <p className="text-sm text-brand-muted">Sin pagos.</p>}
              </div>
            </div>
            {invoices.filter((i) => i.orderId === sel.id).map((i) => (
              <div key={i.id} className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 p-3 text-sm">
                <p className="text-brand-gold">Documento emitido: {i.id} · {fmtCOP(i.amount)} · <span className="capitalize">{i.estado}</span></p>
                <p className="mt-0.5 text-[11px] text-brand-muted">Numeración interna · No oficial DIAN</p>
              </div>
            ))}
          </div>
        )}
      </SlidePanel>

      {/* Modal nuevo pedido */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Nuevo pedido"
        footer={
          <>
            <div className="mr-auto text-sm"><span className="text-brand-muted">Total: </span><span className="font-semibold text-brand-gold">{fmtCOP(formTotal)}</span></div>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveOrder}>Guardar</button>
          </>
        }
      >
        {form && (
          <FormGrid cols={2}>
            <Field label="Cliente" className="sm:col-span-2"><Input value={form.clientName} onChange={(e) => setF('clientName', e.target.value)} /></Field>
            <Field label="Producto" className="sm:col-span-2">
              <Select value={form.productId} onChange={(e) => setF('productId', e.target.value)}>
                <option value="">Selecciona…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtCOP(p.price)}</option>)}
              </Select>
            </Field>
            <Field label="Cantidad"><Input type="number" min="1" value={form.qty} onChange={(e) => setF('qty', Number(e.target.value))} /></Field>
            <Field label="Asesor">
              <Select value={form.asesor} onChange={(e) => setF('asesor', e.target.value)}>
                {ASESORES.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </Field>
            <Field label="Tipo">
              <Select value={form.tipo} onChange={(e) => setF('tipo', e.target.value)}>
                <option value="produccion">Producción</option>
                <option value="stock">Stock</option>
              </Select>
            </Field>
            <Field label="Documento">
              <Select value={form.docType} onChange={(e) => setF('docType', e.target.value)}>
                <option value="factura">Factura</option>
                <option value="remisión">Remisión</option>
              </Select>
            </Field>
            <Field label="Anticipo %"><Input type="number" min="0" max="100" value={form.paid} onChange={(e) => setF('paid', Number(e.target.value))} /></Field>
            <Field label="Tiempo (días)"><Input type="number" min="0" value={form.tiempo} onChange={(e) => setF('tiempo', Number(e.target.value))} /></Field>
            <Field label="Dirección de entrega" className="sm:col-span-2"><Input value={form.deliveryAddress} onChange={(e) => setF('deliveryAddress', e.target.value)} /></Field>
          </FormGrid>
        )}
      </Modal>

      {/* Modal registrar pago */}
      <Modal
        open={!!pay}
        onClose={() => setPay(null)}
        title="Registrar pago"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setPay(null)}>Cancelar</button>
            <button className="btn-gold" onClick={savePayment}>Registrar</button>
          </>
        }
      >
        {pay && (
          <div className="space-y-4">
            <Field label="Monto (COP)"><Input type="number" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} /></Field>
            <Field label="Método">
              <Select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Cuenta destino">
              <Select value={pay.bankId} onChange={(e) => setPay((p) => ({ ...p, bankId: e.target.value }))}>
                {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bank} {b.type}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
