import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Chip, TIPO_VENTA } from '../components/ui';
import { fmtCOP, fmtDate, today, addDays, daysUntil } from '../lib/format';
import { resolveCustomerId } from '../lib/migrations';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, ProgressBar, SlidePanel, ClearFiltersButton } from '../components/widgets';
import { IconCart, IconBank, IconCheck } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select } from '../components/form';
import NuevaVentaModal from '../components/NuevaVentaModal';
import { useToast } from '../components/Toast';

const METHODS = ['Transferencia', 'Tarjeta', 'Efectivo', 'Cheque'];
const ASESORES = ['Alexander Vivas', 'Thalia Cifuentes'];
const MEDIOS = ['TIENDA', 'LEAD', 'FERIA', 'REMARKETING', 'REFERIDO'];
const PDVS = ['CASTOR 43', 'CASTOR CTG', 'PAGINA WEB', 'GERENCIA'];

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
  const [asesor, setAsesor] = useState('');
  const [selId, setSelId] = useState(null);
  const [saleOpen, setSaleOpen] = useState(false); // H-035: modal Nueva venta
  const [saleInnovation, setSaleInnovation] = useState(false); // H-036: modo innovación
  const [pay, setPay] = useState(null); // {orderId, amount, method, bankId}

  // OPs rechazadas por auditoría (espejo HTML línea 5216).
  const rechazadas = useMemo(
    () => orders.filter((o) => o.opRejected && !o.verified),
    [orders],
  );

  const sel = orders.find((o) => o.id === selId) || null;
  const estados = useMemo(() => [...new Set(orders.map((o) => o.estado))], [orders]);
  const tipos = useMemo(() => [...new Set(orders.map((o) => o.tipo))], [orders]);
  const asesores = useMemo(
    () => [...new Set(orders.map((o) => o.asesor).filter(Boolean))].sort(),
    [orders],
  );
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
      if (asesor && o.asesor !== asesor) return false;
      if (
        t &&
        !`${o.id} ${o.clientName} ${o.asesor || ''} ${o.medio || ''} ${o.pdv || ''}`
          .toLowerCase()
          .includes(t)
      )
        return false;
      return true;
    });
  }, [orders, q, estado, tipo, medio, pdv, asesor]);

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

  // H-035: registrar venta desde NuevaVentaModal. Resuelve/crea cliente con datos completos
  // (B2/ADR-011: customerId FK canónica), ancla la fecha a DEMO_TODAY (B1) y contabiliza (postSale).
  function submitSale(data) {
    const clientName = data.custName.trim();
    if (!clientName) return toast('Indica el cliente', 'warn');
    // Validación según modo: innovación valida productos propuestos (por nombre); venta estándar, items con productId.
    const hasContent = data.innovation
      ? data.innovItems?.some((it) => it.name?.trim())
      : data.items?.some((it) => it.productId);
    if (!hasContent) return toast('Agrega al menos un producto', 'warn');
    const orderDate = today();

    let customerId = data.customerId || resolveCustomerId({ clientName }, { customers });
    if (!customerId) {
      customerId = nextId('C', 'cli', 3);
      add('customers', {
        id: customerId, name: clientName, tipo: 'lead',
        phone: data.custPhone || '', email: data.custEmail || '', city: data.custCity || '',
        address: data.custAddress || '', doc: data.custDoc || '', createdAt: orderDate,
        asesor: data.asesor, linkedLeadId: null,
      });
      toast(`Cliente ${customerId} creado`, 'ok');
    }

    const id = nextId('PED', 'ped');
    // H-035.3: el avance (paid%) se deriva del pago realmente registrado (no de un % suelto),
    // por lo que queda respaldado por un registro PAYMENTS (evita la inconsistencia EX-F2-02).
    const payAmount = Number(data.payAmount) || 0;
    const paidPct = data.total ? Math.min(100, Math.round((payAmount / data.total) * 100)) : 0;

    if (data.innovation) {
      // H-036.3: venta de innovación. Productos propuestos (aún sin catálogo); queda pendiente de
      // aprobación de gerencia. Estado = 'pendiente_innovacion' (DECISIÓN PENDIENTE DE CONFIRMACIÓN:
      // Demo6 saveSale usa 'pendiente_aprobacion_gerencia', pero el módulo Innovación filtra
      // 'pendiente_innovacion'; se eligió el que integra con el módulo — ver H-036.3.md).
      const innovItems = (data.innovItems || []).filter((it) => it.name?.trim());
      const fp = innovItems[0] || {};
      add('orders', {
        id, quoteId: null, customerId, clientName, asesor: data.asesor,
        total: data.total, paid: paidPct, tiempo: Number(data.tiempo) || 30,
        orderDate, estado: 'pendiente_innovacion', area: null, tipo: 'innovacion',
        docType: data.docType, deliveryAddress: data.deliveryAddress,
        medio: data.medio, pdv: data.pdv, cierreVenta: data.cierreVenta, abonoBancos: data.abonoBancos,
        verified: false, productId: '', qty: Number(fp.qty) || 1,
        productoPropuesto: { name: fp.name || '', desc: fp.desc || '', qty: Number(fp.qty) || 1, price: Number(fp.price) || 0 },
        innovItems,
        innovRefPhoto: data.innovRefPhoto || null, innovConsentPhoto: data.innovConsentPhoto || null,
      });
      toast(`Venta innovación ${id} registrada (pendiente de aprobación)`, 'ok');
    } else {
      const items = data.items.filter((it) => it.productId);
      const first = items[0];
      const tiposItem = [...new Set(items.map((it) => it.tipo))];
      const tipo = tiposItem.length > 1 ? 'mixto' : tiposItem[0] || 'produccion';
      add('orders', {
        id, quoteId: null, customerId, clientName, asesor: data.asesor,
        total: data.total, paid: paidPct, tiempo: Number(data.tiempo) || 30,
        orderDate, estado: tipo === 'stock' ? 'produccion' : 'pendiente_op',
        area: null, tipo, docType: data.docType, deliveryAddress: data.deliveryAddress,
        medio: data.medio, pdv: data.pdv, cierreVenta: data.cierreVenta, abonoBancos: data.abonoBancos,
        verified: false, productId: first.productId, qty: Number(first.qty) || 1,
        items, // H-035.2: ítems de la venta (multi-ítem)
      });
      toast(`Venta ${id} registrada`, 'ok');
    }

    // H-035.3: registrar el pago (abono) + asiento de cobro (aplica a venta estándar e innovación).
    if (payAmount > 0) {
      const pagId = nextId('PAG', 'pag');
      add('payments', {
        id: pagId, orderId: id, amount: payAmount, method: data.payMethod, bankId: data.payBankId,
        type: 'anticipo', date: orderDate, reference: data.payReference || pagId, estado: 'confirmado',
        soporte: data.paySoporte ? { filename: data.paySoporte } : null,
      });
      const collection = postCustomerCollection({
        id: pagId, date: orderDate, customerId, bankAccountId: data.payBankId, amount: payAmount, invoiceId: id,
      });
      if (collection?.ok) toast(`Asiento ${collection.journalEntry.id} de cobro generado`, 'ok');
    }

    // El asiento de venta (reconocimiento de ingreso) solo para ventas estándar; la innovación
    // queda pendiente de aprobación de gerencia (no se reconoce hasta aprobarse).
    if (!data.innovation) {
      const sale = postSale({
        id, date: orderDate, type: data.docType,
        customerId, customerName: clientName, total: data.total,
      });
      if (sale?.ok) toast(`Asiento contable ${sale.journalEntry.id} generado`, 'ok');
      else if (sale?.error) toast(`Aviso contable: ${sale.message || sale.error}`, 'warn');
    }

    setSaleOpen(false);
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

  // Nº de OPs asociadas (cosmético): items de la venta; hoy 1 por pedido (modelo plano).
  const opsCount = (r) => (Array.isArray(r.items) ? r.items.length : 1);
  // Fecha de vencimiento: usa dueDate o la deriva de orderDate + tiempo (días).
  const venceOf = (r) => r.dueDate || addDays(r.orderDate, r.tiempo || 30);

  // H-033: tabla reestructurada según Demo6:5285-5333. Se eliminan PRODUCTO/MEDIO/PDV/ESTADO;
  // se agregan OPs y VENCE; PEDIDO muestra etiqueta P-XXXX (id real PED- intacto, decisión cosmética);
  // la columna TIPO conserva el badge de React (azul Producción / verde Stock).
  const columns = [
    {
      key: 'id',
      label: 'Pedido',
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-brand-gold">
          {String(r.id).replace(/^PED-/, 'P-')}
          {r.tipo === 'innovacion' && <span className="rounded bg-amber-500/20 px-1 text-[9px] text-amber-300">INN</span>}
        </span>
      ),
    },
    { key: 'clientName', label: 'Cliente', render: (r) => <span className="text-white">{custName(r)}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-brand-muted">{r.asesor}</span> },
    {
      key: 'ops',
      label: 'OPs',
      sortValue: (r) => opsCount(r),
      render: (r) => (
        <div className="flex justify-center">
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-brand-gold-light">{opsCount(r)}</span>
        </div>
      ),
    },
    { key: 'total', label: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => <span className="font-semibold text-brand-gold-light">{fmtCOP(r.total)}</span> },
    {
      key: 'saldo',
      label: 'Saldo',
      align: 'right',
      sortValue: (r) => (r.total || 0) * (1 - (r.paid || 0) / 100),
      render: (r) => {
        const saldo = Math.max(0, Math.round((r.total || 0) * (1 - (r.paid || 0) / 100)));
        return <span className={`font-semibold ${saldo > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtCOP(saldo)}</span>;
      },
    },
    {
      key: 'pago',
      label: 'Pago',
      sortValue: (r) => r.paid,
      render: (r) => <ProgressBar value={r.paid} color={(r.paid || 0) >= 100 ? '#10b981' : '#38bdf8'} />,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortValue: (r) => r.tipo,
      // Mejora React preservada (inventario): badge azul Producción / verde Stock (NO texto plano).
      render: (r) => <Chip variant={TIPO_VENTA[r.tipo] || 'gray'}>{r.tipo}</Chip>,
    },
    {
      key: 'doc',
      label: 'Doc',
      sortValue: (r) => r.docType,
      render: (r) => <span className="text-xs uppercase text-brand-muted">{r.docType || '—'}</span>,
    },
    {
      key: 'vence',
      label: 'Vence',
      sortValue: (r) => venceOf(r),
      render: (r) => {
        const d = daysUntil(venceOf(r));
        if (d == null) return <span className="text-muted/50">—</span>;
        const settled = (r.paid || 0) >= 100 || r.estado === 'entregado' || r.estado === 'cancelado';
        const tone = settled
          ? 'bg-white/5 text-brand-muted'
          : d < 0
            ? 'bg-red-500/20 text-red-300'
            : d <= 7
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-emerald-500/20 text-emerald-300';
        return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>{d}d</span>;
      },
    },
    {
      // H-034: "+ Pago" inline — registra un abono contra el pedido sin abrir el detalle.
      key: 'acciones',
      label: '',
      sortable: false,
      render: (r) => (
        <button
          className="text-xs text-brand-gold hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setPay({ orderId: r.id, amount: '', method: 'Transferencia', bankId: bankAccounts[0]?.id });
          }}
        >
          + Pago
        </button>
      ),
    },
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
        <SelectFilter value={asesor} onChange={setAsesor} options={asesores} allLabel="Todos los asesores" />
        <ClearFiltersButton
          active={!!(q || estado || tipo || medio || pdv || asesor)}
          onClear={() => { setQ(''); setEstado(''); setTipo(''); setMedio(''); setPdv(''); setAsesor(''); }}
        />
        <span className="ml-auto text-sm text-brand-muted">{rows.length} pedidos</span>
        {/* H-032: renombrar a "+ Nueva venta" + agregar "+ Venta innovación".
            El modal específico de innovación se construye en H-036 (flag innovation). Demo6:5275-5276. */}
        <button className="btn-outline" onClick={() => { setSaleInnovation(true); setSaleOpen(true); }}>+ Venta innovación</button>
        <button className="btn-gold" onClick={() => { setSaleInnovation(false); setSaleOpen(true); }}>+ Nueva venta</button>
      </Toolbar>

      {/* H-033: ayuda de doble clic (Demo6:5280). */}
      <div className="text-[11px] text-brand-muted">💡 Doble clic en una fila abre el detalle del pedido con sus OPs.</div>
      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowDoubleClick={(r) => setSelId(r.id)} />

      <SlidePanel open={!!sel} onClose={() => setSelId(null)} title={sel ? String(sel.id).replace(/^PED-/, 'P-') : ''} subtitle={sel ? `${custName(sel)} · ${fmtDate(sel.orderDate)}` : ''}>
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

      {/* H-035: Modal Nueva venta (reemplaza el antiguo "Nuevo pedido"). */}
      <NuevaVentaModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        products={products}
        customers={customers}
        asesores={ASESORES}
        bankAccounts={bankAccounts}
        innovation={saleInnovation}
        onSubmit={submitSale}
      />

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
