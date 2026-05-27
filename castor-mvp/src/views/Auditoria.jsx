import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { EstadoBadge } from '../components/widgets';
import { fmtCOP, fmtDate, today, addDays, nowISO, uid } from '../lib/format';
import { IconShield, IconBox, IconDoc } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// Auditoría — espejo de PAGE_RENDERERS.auditoria (HTML líneas 7465-7610).
// KPIs · botón "Crear pedido stock Castor" · pedidos pendientes por verificar
// (modal detalle Crear OP / Rechazar / Editar) · productos nuevos · cierre OPs.
// ─────────────────────────────────────────────────────────────────────────────
export default function Auditoria() {
  const {
    orders, products, customers, payments, bankAccounts,
    employees, invoiceRequests, supplies, finishedStock, warehouses, quotes,
    update, add, nextId, setState, currentUser, pushNotification,
  } = useApp();
  const toast = useToast();

  const [detail, setDetail] = useState(null);   // pedido en modal detalle
  const [comment, setComment] = useState('');
  const [edit, setEdit] = useState(null);        // pedido en modal editar
  const [stock, setStock] = useState(null);      // form pedido stock
  const [detailProd, setDetailProd] = useState(null);     // H-106: producto nuevo en modal detalle
  const [detailCierre, setDetailCierre] = useState(null); // H-106: cierre de OP en modal detalle

  const prod = (id) => products.find((p) => p.id === id);
  const cust = (id) => customers.find((c) => c.id === id);

  const pendOp = useMemo(
    () => orders.filter((o) => !o.verified && o.tipo !== 'stock' && o.estado === 'pendiente_op'),
    [orders],
  );
  const newProds = useMemo(() => products.filter((p) => !p.verified), [products]);
  const cierreOps = useMemo(
    () => orders.filter((o) => o.verified && (o.estado === 'listo' || o.estado === 'op_cerrada') && !o.invoiced),
    [orders],
  );
  const reqFactura = useMemo(
    () => (invoiceRequests || []).filter((r) => r.estado === 'pendiente_auditoria'),
    [invoiceRequests],
  );
  const stockOps = useMemo(() => orders.filter((o) => o.tipo === 'stock'), [orders]);

  // Responsables candidatos para pedidos de producción interna.
  const prodEmployees = useMemo(
    () => employees.filter((e) => !['Comercial', 'Administrativo'].includes(e.area)),
    [employees],
  );

  // ── Acciones sobre pedidos ──
  const openDetail = (o) => { setDetail(o); setComment(o.auditComment || ''); };

  const auditCreateOp = () => {
    const o = detail;
    const c = comment.trim();
    update('orders', o.id, {
      verified: true,
      estado: 'produccion',
      area: 'Programación',
      opRejected: false,
      opRejectedReason: null,
      ...(c ? { auditComment: c } : {}),
    });
    toast(`OP ${o.id} creada · área inicial: Programación`, 'ok');
    setDetail(null);
  };

  const auditRejectOp = () => {
    const o = detail;
    const reason = comment.trim();
    if (!reason) return toast('Escribe el motivo del rechazo en el comentario', 'warn');
    update('orders', o.id, {
      opRejected: true,
      opRejectedReason: reason,
      opRejectedBy: currentUser?.name || 'Auditoría',
      opRejectedAt: nowISO(),
      auditComment: reason,
    });
    pushNotification({
      type: 'warning',
      text: `✗ Auditoría rechazó ${o.id}: ${reason.slice(0, 60)}${reason.length > 60 ? '…' : ''}`,
      targetUser: o.asesor,
      link: 'ventas',
      key: `rej_${o.id}`,
    });
    toast('Pedido rechazado — comercial notificado', 'ok');
    setDetail(null);
  };

  const verifyProduct = (id) => {
    update('products', id, { verified: true, lifecycleStatus: 'Activo' });
    toast('Producto verificado', 'ok');
  };
  const rejectProduct = (id) => {
    update('products', id, { verified: false, rejectedForInnovation: true });
    toast('Producto devuelto a Innovación', 'warn');
  };

  // ── Crear pedido stock Castor (producción interna) ──
  const openStockForm = () =>
    setStock({
      productId: products[0]?.id || '',
      qty: 1,
      tiempo: 20,
      asesor: prodEmployees[0]?.name || '',
      notas: '',
    });

  const saveStockOrder = () => {
    const p = prod(stock.productId);
    if (!p) return toast('Producto no encontrado', 'warn');
    const qty = Number(stock.qty) || 1;
    const opId = nextId('OP', 'op', 0);
    add('orders', {
      id: opId,
      productId: p.id,
      qty,
      clientName: 'Castor (stock interno)',
      customerId: null,
      tipo: 'stock',
      estado: 'produccion',
      area: (p.areas || [])[0] || 'Ebanistería',
      verified: true,
      orderDate: today(),
      dueDate: addDays(today(), Number(stock.tiempo) || 20),
      tiempo: Number(stock.tiempo) || 20,
      asesor: stock.asesor,
      total: (Number(p.price) || 0) * qty,
      paid: 100,
      notas: stock.notas || '',
      docType: 'remisión',
    });
    toast(`${opId} creada para stock Castor`, 'ok');
    setStock(null);
  };

  // ── Editar pedido antes de crear OP ──
  const openEdit = () => { setEdit({ ...detail }); setDetail(null); };
  const saveEdit = () => {
    update('orders', edit.id, {
      qty: Number(edit.qty) || 1,
      total: Number(edit.total) || 0,
      asesor: edit.asesor,
      productId: edit.productId,
    });
    toast(`Pedido ${edit.id} actualizado`, 'ok');
    setEdit(null);
  };

  // ── EX-F3-02: acciones reales de cierre de OP (cerrar → crear producto CEDI → aprobar facturar) ──
  // Espejo de Demo6: cerrarOP (6418), auditoriaCrearProductoCEDI (7608), auditApproveOp (7722).
  // Resuelve el productId de la OP: directo, o desde el primer ítem de la cotización.
  const resolveProductId = (o) => {
    if (o.productId) return o.productId;
    if (o.quoteId) {
      const qu = (quotes || []).find((q) => q.id === o.quoteId);
      if (qu?.items?.[0]?.productId) return qu.items[0].productId;
    }
    return '';
  };
  // Bodega CEDI (central de producto terminado).
  const cediWarehouse = () =>
    warehouses.find((w) => w.id === 'W-CEDI')
    || warehouses.find((w) => w.tipo === 'terminado' && /CEDI/i.test(`${w.code} ${w.name}`))
    || warehouses.find((w) => w.tipo === 'terminado');
  // Refresca el snapshot del modal de detalle si está abierto sobre esta OP.
  const refreshDetailCierre = (id, patch) => setDetailCierre((d) => (d && d.id === id ? { ...d, ...patch } : d));

  // 1) Cerrar OP (desde el modal "Ver"). Guard: área "Listo" y no cerrada aún.
  const cerrarOP = (o) => {
    if (o.area !== 'Listo') return toast('La OP debe estar en área "Listo" para cerrarla', 'warn');
    if (o.opClosed || o.estado === 'op_cerrada') return;
    const patch = { opClosed: true, estado: 'op_cerrada', closedAt: nowISO(), closedBy: currentUser?.name || 'Auditoría' };
    update('orders', o.id, patch); // setState atómico (1 slice)
    refreshDetailCierre(o.id, patch);
    toast(`OP ${o.id} cerrada · habilitado ingreso a inventario`, 'ok');
  };

  // 2) Crear producto en CEDI (fila). Guard: OP cerrada + sin ingreso previo. setState atómico.
  const crearProductoCEDI = (o) => {
    if (!(o.opClosed || o.estado === 'op_cerrada' || o.estado === 'listo' || o.estado === 'facturado'))
      return toast('Primero cierra la OP desde el modal "Ver"', 'warn');
    const productId = resolveProductId(o);
    if (!productId) return toast('La OP no tiene producto asociado', 'warn');
    if ((finishedStock || []).find((f) => f.orderId === o.id && f.source === 'produccion'))
      return toast('Ya existe el producto en CEDI para esta OP', 'info');
    const cedi = cediWarehouse();
    if (!cedi) return toast('No hay bodega CEDI configurada', 'error');
    const hasCustomer = !!(o.pedidoId || o.customerId);
    const classification = hasCustomer ? 'clientes' : 'stock_castor';
    const fsId = uid('FS');
    const smId = uid('SM');
    const date = today();
    const by = currentUser?.name || 'Auditoría';
    setState((s) => ({
      ...s,
      finishedStock: [
        {
          id: fsId, productId, warehouseId: cedi.id, qty: o.qty || 1,
          status: hasCustomer ? 'reservado' : 'disponible',
          orderId: o.id, pedidoId: o.pedidoId || null, customerId: o.customerId || null,
          clientName: o.clientName || '', source: 'produccion', classification,
          receptionStatus: 'pendiente_recepcion', requestedAt: date, requestedBy: by,
          readyDate: null, notes: `Producción OP ${o.id} · pendiente verificación de recepción en ${cedi.name}`,
        },
        ...(s.finishedStock || []),
      ],
      stockMoves: [
        // 'entrada_produccion_pendiente' = ingreso aún no verificado físicamente; la recepción en
        // CEDI (EX-F3-03, InventarioTerminado.confirmarRecepcion) lo convierte en 'entrada_produccion'.
        { id: smId, orderId: o.id, pedidoId: o.pedidoId || null, productId, qty: o.qty || 1, type: 'entrada_produccion_pendiente', date, warehouseId: cedi.id, reason: `Producción OP ${o.id}`, by },
        ...(s.stockMoves || []),
      ],
      orders: (s.orders || []).map((x) => (x.id === o.id ? { ...x, cediRequestedAt: date, cediClassification: classification } : x)),
    }));
    pushNotification({ type: 'warning', text: `📦 Verificar recepción en ${cedi.name}: ${prod(productId)?.name || 'Producto'} (OP ${o.id})`, link: 'inventario', key: `recep_${o.id}` });
    refreshDetailCierre(o.id, { cediRequestedAt: date, cediClassification: classification });
    toast(`📨 Producto enviado a ${cedi.name} (pendiente de recepción)`, 'ok');
  };

  // 3) Aprobar para facturar (fila). Guard: producto creado + no aprobada. setState atómico.
  const aprobarFacturar = (o) => {
    if (o.auditApproved) return;
    if (!(finishedStock || []).find((f) => f.orderId === o.id && f.source === 'produccion'))
      return toast('Primero crea el producto en CEDI', 'warn');
    const ireqId = nextId('IREQ', 'ireq'); // fuera del setState (bump de counter propio)
    const at = nowISO();
    const patch = { auditApproved: true, auditApprovedBy: currentUser?.name || 'Auditoría', auditApprovedAt: at };
    setState((s) => ({
      ...s,
      orders: (s.orders || []).map((x) => (x.id === o.id ? { ...x, ...patch } : x)),
      // Estado 'aprobada_auditoria' (fiel a auditApproveOp de Demo6:7734). NO contradice
      // o.auditApproved:true — la orden está aprobada Y su IREQ está aprobada (coherente). Es una
      // cola limpia hacia adelante: estado terminal bien definido que consumirá el módulo de
      // Facturación/Contabilidad cuando se construya (roadmap #5). La sección "Solicitudes de
      // facturación pendientes" (reqFactura, filtra 'pendiente_auditoria') es para el flujo
      // INVERSO (solicitudes que inicia Contabilidad y auditoría aún no aprobó) — hoy sin
      // productor, y está bien así. El feedback de esta acción lo da el chip de la fila (✓ Aprobada).
      invoiceRequests: [
        { id: ireqId, orderId: o.id, pedidoId: o.pedidoId || null, customerId: o.customerId || null, clientName: o.clientName, docType: o.docType || 'factura', amount: o.total, estado: 'aprobada_auditoria', requestedAt: at, requestedBy: 'Auditoría' },
        ...(s.invoiceRequests || []),
      ],
    }));
    pushNotification({ type: 'info', text: `OP ${o.id} aprobada — solicitud de ${o.docType || 'factura'} enviada a Contabilidad`, link: 'auditoria', key: `auditApr_${o.id}` });
    refreshDetailCierre(o.id, patch);
    toast(`OP ${o.id} aprobada · solicitud de facturación generada`, 'ok');
  };

  // ── Datos derivados del pedido en detalle ──
  const detailData = useMemo(() => {
    if (!detail) return null;
    const o = detail;
    const c = cust(o.customerId);
    const p = prod(o.productId);
    const pays = payments.filter((x) => x.orderId === o.id || (x.orderIds || []).includes(o.id));
    const totalPagado = pays.filter((x) => x.estado === 'confirmado').reduce((a, x) => a + (x.amount || 0), 0);
    return { o, c, p, pays, totalPagado, saldo: Math.max(0, (o.total || 0) - totalPagado) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, customers, products, payments]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pedidos S/OP" value={pendOp.length} hint="Esperando verificación" accent={pendOp.length ? '#ef4444' : '#10b981'} icon={<IconShield width={18} height={18} />} />
        <KpiCard label="Productos nuevos" value={newProds.length} hint="Por validar" accent={newProds.length ? '#f59e0b' : '#10b981'} icon={<IconBox width={18} height={18} />} />
        <KpiCard label="Solicitudes doc" value={reqFactura.length} hint="Factura/remisión" accent={reqFactura.length ? '#EAB308' : '#10b981'} icon={<IconDoc width={18} height={18} />} />
        <KpiCard label="Pedidos stock Castor" value={stockOps.length} hint="Producción interna" accent="#C9A961" icon={<IconBox width={18} height={18} />} />
      </div>

      {/* Botón crear pedido stock */}
      <div className="flex justify-end">
        <button className="btn-gold" onClick={openStockForm}>🏭 Crear pedido stock Castor</button>
      </div>

      {/* Solicitudes de facturación pendientes */}
      {reqFactura.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold gold-title">🧾 Solicitudes de facturación pendientes</h3>
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-brand-muted">
                <tr>
                  <th className="px-3 py-3 text-left">Req</th>
                  <th className="px-3 py-3 text-left">OP</th>
                  <th className="px-3 py-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Doc</th>
                  <th className="px-3 py-3 text-left">Solicitado</th>
                  <th className="px-3 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {reqFactura.map((r) => {
                  const o = orders.find((x) => x.id === r.orderId);
                  return (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="px-3 py-3 font-mono text-xs text-brand-gold">{r.id}</td>
                      <td className="px-3 py-3 font-mono text-xs text-brand-gold">{r.orderId}</td>
                      <td className="px-3 py-3 text-white">{o?.clientName || '—'}</td>
                      <td className="px-3 py-3"><EstadoBadge value={r.docType} /></td>
                      <td className="px-3 py-3 text-xs text-brand-muted">{fmtDate(r.requestedAt)} · {r.requestedBy || '—'}</td>
                      <td className="px-3 py-3 text-right">
                        <button className="btn-gold px-3 py-1 text-xs" onClick={() => { update('invoiceRequests', r.id, { estado: 'aprobada_auditoria' }); toast('OP cerrada y aprobada', 'ok'); }}>✓ Cerrar OP y aprobar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Pedidos pendientes por verificar */}
      <section>
        <h3 className="mb-1 font-semibold gold-title">🟧 Pedidos pendientes por verificar para crear OP</h3>
        <p className="mb-2 text-xs italic text-brand-muted">
          Doble clic en <b>Ver</b> para abrir el detalle con 3 opciones: Crear OP · Rechazar (con comentario) · Editar información.
        </p>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-brand-muted">
              <tr>
                <th className="px-3 py-3 text-left">Pedido</th>
                <th className="px-3 py-3 text-left">Cliente</th>
                <th className="px-3 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-right">Qty</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-left">Asesor</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendOp.length ? pendOp.map((o) => {
                const p = prod(o.productId);
                return (
                  <tr key={o.id} className="table-row border-b border-white/5" onDoubleClick={() => openDetail(o)}>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-gold">{o.id}</td>
                    <td className="px-3 py-3 text-white">{o.clientName}</td>
                    <td className="px-3 py-3 text-xs">{p ? p.name : '—'}</td>
                    <td className="px-3 py-3 text-right text-white">{o.qty || 1}</td>
                    <td className="px-3 py-3 text-right text-brand-gold-light">{fmtCOP(o.total)}</td>
                    <td className="px-3 py-3 text-xs text-brand-muted">{o.asesor || ''}</td>
                    <td className="px-3 py-3">
                      {o.opRejected
                        ? <span className="badge-danger rounded px-2 py-0.5 text-[11px]" title={o.opRejectedReason || ''}>✗ Rechazado</span>
                        : <span className="badge-warn rounded px-2 py-0.5 text-[11px]">⏳ Pendiente</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="btn-gold px-3 py-1 text-xs" onClick={() => openDetail(o)}>👁 Ver (Crear / Rechazar / Editar)</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="py-5 text-center text-xs italic text-brand-muted">Sin pedidos pendientes — todo verificado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Productos nuevos por verificar */}
      <section>
        <h3 className="mb-1 font-semibold gold-title">🟨 Productos nuevos por verificar</h3>
        <p className="mb-2 text-xs italic text-brand-muted">Doble clic en la fila (o <b>Ver</b>) para abrir el detalle del producto.</p>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-brand-muted">
              <tr>
                <th className="px-3 py-3 text-left">SKU</th>
                <th className="px-3 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-left">Categoría</th>
                <th className="px-3 py-3 text-right">Costo</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-right">Margen</th>
                <th className="px-3 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {newProds.length ? newProds.map((p) => {
                const margen = p.price ? Math.round((p.price - p.cost) / p.price * 100) : 0;
                return (
                  <tr key={p.id} className="table-row cursor-pointer border-b border-white/5" onDoubleClick={() => setDetailProd(p)} title="Doble clic para ver el detalle">
                    <td className="px-3 py-3 font-mono text-xs text-brand-gold">{p.sku}</td>
                    <td className="px-3 py-3 text-white">{p.photo || '📦'} {p.name}</td>
                    <td className="px-3 py-3"><span className="badge-gold rounded px-2 py-0.5 text-[11px]">{p.category}</span></td>
                    <td className="px-3 py-3 text-right text-brand-muted">{fmtCOP(p.cost)}</td>
                    <td className="px-3 py-3 text-right text-brand-gold-light">{fmtCOP(p.price)}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${margen > 30 ? 'text-emerald-400' : margen > 15 ? 'text-amber-400' : 'text-red-400'}`}>{margen}%</td>
                    <td className="px-3 py-3 text-right">
                      <button className="btn-outline mr-1 px-2 py-1 text-xs" onClick={() => setDetailProd(p)}>👁 Ver</button>
                      <button className="btn-gold mr-1 px-2 py-1 text-xs" onClick={() => verifyProduct(p.id)}>✓ Aprobar</button>
                      <button className="btn-outline px-2 py-1 text-xs" style={{ borderColor: '#ef4444', color: '#fca5a5' }} onClick={() => rejectProduct(p.id)}>✗ Rechazar</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="py-5 text-center text-xs italic text-brand-muted">Sin productos pendientes de validación</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cierre de OPs */}
      <section>
        <h3 className="mb-1 font-semibold gold-title">🟩 Cierre de OPs para que Contabilidad pueda facturar/remisionar</h3>
        <p className="mb-2 text-xs italic text-brand-muted">
          Flujo: <b className="text-amber-300">1) Ver</b> (revisar consumos · editar · cerrar OP) → <b className="text-emerald-300">2) Crear producto CEDI</b> → <b className="text-blue-300">3) Aprobar para facturar</b>.
        </p>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-brand-muted">
              <tr>
                <th className="px-3 py-3 text-left">OP</th>
                <th className="px-3 py-3 text-left">Cliente</th>
                <th className="px-3 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Costo máster</th>
                <th className="px-3 py-3 text-right">Costo real</th>
                <th className="px-3 py-3 text-right">Desv.</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cierreOps.length ? cierreOps.map((o) => {
                const p = prod(o.productId);
                const qty = Number(o.qty) || 1;
                const bom = p?.bom || [];
                const costoUnit = bom.reduce((a, b) => {
                  const s = supplies.find((x) => x.id === b.supplyId);
                  return a + (s ? (Number(s.cost) || 0) * (Number(b.qty) || 0) : 0);
                }, 0) || (Number(p?.cost) || 0);
                const costoMaster = costoUnit * qty;
                const aprobado = !!o.auditApproved;
                const opCerrada = o.opClosed || o.estado === 'op_cerrada';
                const productoCreado = !!(finishedStock || []).find((f) => f.orderId === o.id && f.source === 'produccion');
                let estadoChip;
                if (aprobado) estadoChip = <span className="badge-ok rounded px-2 py-0.5 text-[11px]">✓ Aprobada</span>;
                else if (productoCreado) estadoChip = <span className="badge-gold rounded px-2 py-0.5 text-[11px]">📦 En CEDI</span>;
                else if (opCerrada) estadoChip = <span className="badge-info rounded px-2 py-0.5 text-[11px]">🔒 OP cerrada</span>;
                else estadoChip = <span className="text-[11px] italic text-brand-muted">Pendiente</span>;
                return (
                  <tr key={o.id} className="table-row cursor-pointer border-b border-white/5" onDoubleClick={() => setDetailCierre(o)} title="Doble clic para ver el detalle del cierre">
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-gold">{o.id}</td>
                    <td className="px-3 py-3 text-white">{o.clientName}</td>
                    <td className="px-3 py-3 text-xs text-white">{p ? p.name : '—'} <span className="text-brand-muted">×{qty}</span></td>
                    <td className="px-3 py-3 text-right text-brand-gold-light">{fmtCOP(o.total)}</td>
                    <td className="px-3 py-3 text-right text-white">{fmtCOP(costoMaster)}</td>
                    <td className="px-3 py-3 text-right text-emerald-400">{fmtCOP(0)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-400">0%</td>
                    <td className="px-3 py-3">{estadoChip}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <button className="btn-outline px-2 py-1 text-xs" onClick={() => setDetailCierre(o)}>👁 Ver</button>
                        {opCerrada && !productoCreado && (
                          <button className="btn-outline px-2 py-1 text-xs" style={{ borderColor: '#10b981', color: '#6ee7b7' }} onClick={() => crearProductoCEDI(o)}>📥 Crear producto en CEDI</button>
                        )}
                        {productoCreado && <span className="text-[10px] text-emerald-300">✓ Producto en CEDI</span>}
                        {productoCreado && !aprobado && (
                          <button className="btn-gold px-2 py-1 text-xs" onClick={() => aprobarFacturar(o)}>🧾 Aprobado para facturar</button>
                        )}
                        {aprobado && <span className="text-[10px] text-blue-300">✓ Listo contabilidad</span>}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={9} className="py-5 text-center text-xs italic text-brand-muted">Sin OPs listas para auditoría</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal: Detalle del pedido para auditoría (img 3) ── */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detailData ? `Pedido ${detailData.o.id} · Detalle para auditoría` : ''}
        size="lg"
        footer={detailData && (
          <div className="grid w-full grid-cols-3 gap-2">
            <button className="btn-gold py-2 text-sm" onClick={auditCreateOp}>✓ Crear OP</button>
            <button className="rounded py-2 text-sm font-semibold text-white" style={{ background: '#b91c1c' }} onClick={auditRejectOp}>✗ Rechazar</button>
            <button className="btn-outline py-2 text-sm" style={{ borderColor: '#3b82f6', color: '#93c5fd' }} onClick={openEdit}>✎ Editar</button>
          </div>
        )}
      >
        {detailData && (() => {
          const { o, c, p, pays, totalPagado, saldo } = detailData;
          return (
            <div className="space-y-5">
              {/* Cliente + estado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-brand-border bg-[#0f1f36] p-4">
                  <div className="mb-2 text-xs uppercase text-brand-muted">Cliente</div>
                  <div className="font-semibold text-white">{o.clientName}</div>
                  <div className="mt-1 text-xs text-brand-muted">{c?.doc || '—'} · {c?.phone || ''}</div>
                  <div className="text-xs text-brand-muted">{c?.email || ''}</div>
                  <div className="text-xs text-brand-muted">{c?.city || ''}</div>
                </div>
                <div className="rounded-lg border border-brand-border bg-[#0f1f36] p-4">
                  <div className="mb-2 text-xs uppercase text-brand-muted">Estado del pedido</div>
                  <div className="font-semibold text-white">
                    {o.estado}{' '}
                    {o.verified
                      ? <span className="ml-2 text-xs text-emerald-400">✓ verificado</span>
                      : <span className="ml-2 text-xs text-amber-400">⚠ sin verificar</span>}
                  </div>
                  <div className="mt-1 text-xs text-brand-muted">Área actual: {o.area || '—'}</div>
                  <div className="text-xs text-brand-muted">Tipo: {o.tipo || 'producción'}</div>
                  <div className="text-xs text-brand-muted">Asesor: {o.asesor || '—'}</div>
                  <div className="text-xs text-brand-muted">Fecha: {fmtDate(o.orderDate || today())}</div>
                </div>
              </div>

              {/* Producto */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-white">Producto</h4>
                <div className="flex items-start justify-between rounded-lg border border-brand-border bg-[#0f1f36] p-4">
                  <div>
                    <div className="font-semibold text-white">{p ? `${p.photo || '📦'} ${p.name}` : '—'}</div>
                    <div className="text-xs text-brand-muted">{p?.sku || '—'} · {p?.category || ''}</div>
                    <div className="mt-1 text-xs text-brand-muted">{p?.description || ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-brand-muted">Cantidad</div>
                    <div className="text-lg font-bold text-white">{o.qty || 1}</div>
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-brand-border bg-[#0f1f36] p-3 text-center">
                  <div className="text-xs text-brand-muted">Total</div>
                  <div className="text-base font-bold text-brand-gold-light">{fmtCOP(o.total || 0)}</div>
                </div>
                <div className="rounded-lg border border-brand-border bg-[#0f1f36] p-3 text-center">
                  <div className="text-xs text-brand-muted">Pagado</div>
                  <div className="text-base font-bold text-emerald-400">{fmtCOP(totalPagado)}</div>
                </div>
                <div className="rounded-lg border border-brand-border bg-[#0f1f36] p-3 text-center">
                  <div className="text-xs text-brand-muted">Saldo</div>
                  <div className={`text-base font-bold ${saldo > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{fmtCOP(saldo)}</div>
                </div>
              </div>

              {/* Pagos registrados */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-white">Pagos registrados</h4>
                <div className="rounded-lg border border-brand-border bg-[#0f1f36] p-3">
                  {pays.length ? (
                    <table className="w-full text-xs">
                      <thead className="text-brand-muted">
                        <tr>
                          <th className="py-1 text-left">ID</th>
                          <th className="text-left">Fecha</th>
                          <th className="text-left">Método</th>
                          <th className="text-left">Cuenta</th>
                          <th className="text-right">Monto</th>
                          <th className="text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pays.map((pg) => {
                          const b = bankAccounts.find((x) => x.id === pg.bankId);
                          return (
                            <tr key={pg.id}>
                              <td className="py-1 font-mono text-brand-gold">{pg.id}</td>
                              <td>{fmtDate(pg.date)}</td>
                              <td className="text-white">{pg.method || '—'}</td>
                              <td className="text-brand-muted">{b ? `${b.bank} ${b.number}` : '—'}</td>
                              <td className="text-right text-brand-gold-light">{fmtCOP(pg.amount)}</td>
                              <td><EstadoBadge value={pg.estado} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-3 text-center text-xs italic text-brand-muted">Sin pagos registrados</div>
                  )}
                </div>
              </div>

              {/* Rechazo previo */}
              {o.opRejected && (
                <div className="rounded p-3" style={{ borderLeft: '3px solid #ef4444', background: '#2a0e14' }}>
                  <div className="text-xs font-semibold text-red-300">✗ Pedido rechazado previamente</div>
                  <div className="mt-1 text-[11px] italic text-red-200">"{o.opRejectedReason || ''}"</div>
                  <div className="mt-1 text-[10px] text-brand-muted">Por {o.opRejectedBy || '—'} · {fmtDate(o.opRejectedAt)}</div>
                </div>
              )}

              {/* Comentario de auditoría */}
              <div className="panel-2 rounded p-3">
                <div className="mb-2 text-xs font-semibold gold-title">💬 Comentario de auditoría (se guarda en el pedido)</div>
                <textarea
                  rows={2}
                  className="input-field text-xs"
                  placeholder="Observaciones, motivo de rechazo, notas internas..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <p className="text-right text-[11px] text-brand-muted">Rechazar → envía el pedido a corrección del comercial con el comentario.</p>
            </div>
          );
        })()}
      </Modal>

      {/* ── Modal: Crear pedido stock Castor (img 4) ── */}
      <Modal
        open={!!stock}
        onClose={() => setStock(null)}
        title="🏭 Crear pedido stock Castor"
        subtitle="Pedido de producción interna para reponer inventario (sin cliente). Al aprobarlo se crea la OP y pasa a Producción."
        size="md"
        footer={
          <>
            <button className="btn-outline" onClick={() => setStock(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveStockOrder}>Crear y aprobar</button>
          </>
        }
      >
        {stock && (
          <FormGrid cols={2}>
            <Field label="Producto *" className="sm:col-span-2">
              <Select value={stock.productId} onChange={(e) => setStock((s) => ({ ...s, productId: e.target.value }))}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.photo || '📦'} {p.name} · {p.sku} · stock {p.stock || 0}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cantidad *"><Input type="number" min="1" value={stock.qty} onChange={(e) => setStock((s) => ({ ...s, qty: e.target.value }))} /></Field>
            <Field label="Tiempo (días) *"><Input type="number" min="1" value={stock.tiempo} onChange={(e) => setStock((s) => ({ ...s, tiempo: e.target.value }))} /></Field>
            <Field label="Responsable *" className="sm:col-span-2">
              <Select value={stock.asesor} onChange={(e) => setStock((s) => ({ ...s, asesor: e.target.value }))}>
                {prodEmployees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label="Notas" className="sm:col-span-2">
              <textarea rows={2} className="input-field" placeholder="Razón del pedido, urgencia, etc." value={stock.notas} onChange={(e) => setStock((s) => ({ ...s, notas: e.target.value }))} />
            </Field>
          </FormGrid>
        )}
      </Modal>

      {/* ── Modal: Editar pedido ── */}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `✎ Editar pedido ${edit.id}` : ''}
        subtitle="Auditoría puede corregir datos antes de crear la OP."
        size="md"
        footer={
          <>
            <button className="btn-outline" onClick={() => setEdit(null)}>Cancelar</button>
            <button className="btn-gold" onClick={saveEdit}>Guardar cambios</button>
          </>
        }
      >
        {edit && (
          <FormGrid cols={2}>
            <Field label="Producto" className="sm:col-span-2">
              <Select value={edit.productId} onChange={(e) => setEdit((s) => ({ ...s, productId: e.target.value }))}>
                {products.filter((p) => p.verified).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Cantidad"><Input type="number" min="1" value={edit.qty} onChange={(e) => setEdit((s) => ({ ...s, qty: e.target.value }))} /></Field>
            <Field label="Total (COP)"><Input type="number" value={edit.total} onChange={(e) => setEdit((s) => ({ ...s, total: e.target.value }))} /></Field>
            <Field label="Asesor" className="sm:col-span-2"><Input value={edit.asesor || ''} onChange={(e) => setEdit((s) => ({ ...s, asesor: e.target.value }))} /></Field>
          </FormGrid>
        )}
      </Modal>

      {/* ── H-106 · Modal: Detalle de Producto Nuevo ── */}
      <Modal
        open={!!detailProd}
        onClose={() => setDetailProd(null)}
        title={detailProd ? `Producto ${detailProd.sku || ''} · Detalle para auditoría` : ''}
        size="lg"
        footer={detailProd && (
          <div className="flex w-full justify-end gap-2">
            <button className="btn-outline py-2 text-sm" style={{ borderColor: '#ef4444', color: '#fca5a5' }} onClick={() => { rejectProduct(detailProd.id); setDetailProd(null); }}>✗ Rechazar</button>
            <button className="btn-gold py-2 text-sm" onClick={() => { verifyProduct(detailProd.id); setDetailProd(null); }}>✓ Aprobar</button>
          </div>
        )}
      >
        {detailProd && (() => {
          const p = detailProd;
          const margen = p.price ? Math.round((p.price - p.cost) / p.price * 100) : 0;
          const bomRows = (p.bom || []).map((b) => {
            const s = supplies.find((x) => x.id === b.supplyId);
            return { name: s?.name || b.supplyId, qty: b.qty, unit: s?.unitOut || s?.unit || '', sub: s ? (Number(s.cost) || 0) * (Number(b.qty) || 0) : 0 };
          });
          const bomTotal = bomRows.reduce((a, r) => a + r.sub, 0);
          return (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-brand-border bg-[#0f1f36] text-4xl">{p.photo || '📦'}</div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white">{p.name}</div>
                  <div className="font-mono text-xs text-brand-muted">{p.sku}</div>
                  <div className="mt-1">
                    {p.verified
                      ? <span className="badge-ok rounded px-2 py-0.5 text-[11px]">✓ Verificado</span>
                      : p.rejectedByAudit
                        ? <span className="badge-danger rounded px-2 py-0.5 text-[11px]">✗ Rechazado</span>
                        : <span className="badge-warn rounded px-2 py-0.5 text-[11px]">⏳ Pendiente de verificación</span>}
                    <span className="badge-gold ml-1 rounded px-2 py-0.5 text-[11px]">{p.category || '—'}</span>
                  </div>
                </div>
              </div>

              {p.description && <p className="text-sm text-brand-muted">{p.description}</p>}

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ['Costo', fmtCOP(p.cost || 0)],
                  ['Precio', fmtCOP(p.price || 0)],
                  ['Margen', `${margen}%`],
                  ['Dimensiones', p.dimensions ? `${p.dimensions.ancho}×${p.dimensions.alto}×${p.dimensions.profundidad} cm` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-brand-border bg-[#0f1f36] p-3">
                    <div className="text-[11px] uppercase text-brand-muted">{k}</div>
                    <div className="mt-0.5 text-white">{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gold/80">Áreas de producción</div>
                <div className="flex flex-wrap gap-1">
                  {(p.areas || []).length
                    ? p.areas.map((a) => <span key={a} className="badge-gold rounded px-2 py-0.5 text-[11px]">{a}</span>)
                    : <span className="text-xs italic text-brand-muted">Sin áreas marcadas</span>}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gold/80">Receta (BOM) — materia prima</div>
                <div className="space-y-1">
                  {bomRows.length ? bomRows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0f1f36] px-3 py-2 text-sm">
                      <span className="text-white">{r.name}</span>
                      <span className="text-brand-muted">{r.qty} {r.unit}</span>
                      <span className="tabular-nums text-brand-gold-light">{fmtCOP(r.sub)}</span>
                    </div>
                  )) : <p className="text-xs italic text-brand-muted">Sin insumos en el BOM.</p>}
                </div>
                {bomRows.length > 0 && (
                  <div className="mt-2 flex justify-between border-t border-brand-border pt-2 text-sm">
                    <span className="text-brand-muted">Costo calculado (suma BOM)</span>
                    <span className="font-bold text-brand-gold">{fmtCOP(bomTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── H-106 · Modal: Detalle de Cierre de OP ── */}
      <Modal
        open={!!detailCierre}
        onClose={() => setDetailCierre(null)}
        title={detailCierre ? `Cierre OP ${detailCierre.id} · Detalle para auditoría` : ''}
        size="lg"
        footer={detailCierre && (
          <div className="flex w-full items-center justify-between">
            <div>
              {detailCierre.area === 'Listo' && !(detailCierre.opClosed || detailCierre.estado === 'op_cerrada') && (
                <button className="btn-gold py-2 text-sm" onClick={() => cerrarOP(detailCierre)}>🔒 Cerrar OP</button>
              )}
            </div>
            <button className="btn-outline py-2 text-sm" onClick={() => setDetailCierre(null)}>Cerrar</button>
          </div>
        )}
      >
        {detailCierre && (() => {
          const o = detailCierre;
          const p = prod(o.productId);
          const c = cust(o.customerId);
          const qty = Number(o.qty) || 1;
          const bomRows = (p?.bom || []).map((b) => {
            const s = supplies.find((x) => x.id === b.supplyId);
            return { name: s?.name || b.supplyId, qty: (Number(b.qty) || 0) * qty, unit: s?.unitOut || s?.unit || '', sub: s ? (Number(s.cost) || 0) * (Number(b.qty) || 0) * qty : 0 };
          });
          const costoMaster = bomRows.reduce((a, r) => a + r.sub, 0) || (Number(p?.cost) || 0) * qty;
          const opCerrada = o.opClosed || o.estado === 'op_cerrada';
          const productoCreado = !!(finishedStock || []).find((f) => f.orderId === o.id && f.source === 'produccion');
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {o.verified && <span className="badge-ok rounded px-2 py-0.5 text-[11px]">✓ Verificada</span>}
                <span className="badge-info rounded px-2 py-0.5 text-[11px]">{opCerrada ? '🔒 OP cerrada' : 'OP en proceso'}</span>
                {productoCreado && <span className="badge-gold rounded px-2 py-0.5 text-[11px]">📦 Producto en CEDI</span>}
                {o.auditApproved && <span className="badge-ok rounded px-2 py-0.5 text-[11px]">Aprobada para facturar</span>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {[
                  ['Cliente', o.clientName],
                  ['Documento', c?.doc || '—'],
                  ['Producto', `${p ? p.name : '—'} × ${qty}`],
                  ['Área', o.area || '—'],
                  ['Total', fmtCOP(o.total || 0)],
                  ['Costo máster (BOM×qty)', fmtCOP(costoMaster)],
                  ['Inicio', fmtDate(o.orderDate)],
                  ['Vence', o.dueDate ? fmtDate(o.dueDate) : '—'],
                  ['Asesor', o.asesor || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-brand-border bg-[#0f1f36] p-3">
                    <div className="text-[11px] uppercase text-brand-muted">{k}</div>
                    <div className="mt-0.5 text-white">{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gold/80">Consumo de materiales (BOM × cantidad)</div>
                <div className="space-y-1">
                  {bomRows.length ? bomRows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0f1f36] px-3 py-2 text-sm">
                      <span className="text-white">{r.name}</span>
                      <span className="text-brand-muted">{r.qty} {r.unit}</span>
                      <span className="tabular-nums text-brand-gold-light">{fmtCOP(r.sub)}</span>
                    </div>
                  )) : <p className="text-xs italic text-brand-muted">El producto no tiene BOM definido.</p>}
                </div>
                {bomRows.length > 0 && (
                  <div className="mt-2 flex justify-between border-t border-brand-border pt-2 text-sm">
                    <span className="text-brand-muted">Costo máster total</span>
                    <span className="font-bold text-brand-gold">{fmtCOP(costoMaster)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
