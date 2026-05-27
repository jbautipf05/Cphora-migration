import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Chip } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { fmtDate, today, nowISO } from '../lib/format';
import { ClearFiltersButton } from '../components/widgets';
import { IconBox, IconDashboard, IconCheck, IconShield, IconBank } from '../components/icons';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';

// ─────────────────────────────────────────────────────────────────────────────
// Inventario Terminado — espejo de renderInventario() (HTML líneas 1106-1559)
// Tarjetas por bodega + tabs (Stock Castor / Reservado clientes) + filtros
// avanzados + tabla con foto, SKU, costo, valor comercial, cantidad, ingreso,
// estado y acción "Trasladar".
// ─────────────────────────────────────────────────────────────────────────────
export default function InventarioTerminado() {
  const { finishedStock, products, warehouses, customers, setState, currentUser } = useApp();
  const toast = useToast();
  const [bodega, setBodega] = useState(''); // '' = todas
  const [vista, setVista] = useState('stock'); // stock | clientes
  const [search, setSearch] = useState('');
  const [productoFilter, setProductoFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [todasAlaVez, setTodasAlaVez] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [trasladoForm, setTrasladoForm] = useState(null); // { ids:[...], destino, motivo }

  const ptWarehouses = warehouses.filter((w) => w.tipo === 'terminado');
  const wById = (id) => warehouses.find((w) => w.id === id);
  const wName = (id) => wById(id)?.code || id;
  const prod = (id) => products.find((p) => p.id === id);
  const customerName = (id) => customers.find((c) => c.id === id)?.name;

  // KPIs globales: unidades, disponibles, valor a precio venta.
  const kpis = useMemo(() => {
    const priceOf = (id) => prod(id)?.price || 0;
    const unidades = finishedStock.reduce((a, f) => a + f.qty, 0);
    const disp = finishedStock
      .filter((f) => f.status === 'disponible' && !f.orderId)
      .reduce((a, f) => a + f.qty, 0);
    const valor = finishedStock.reduce((a, f) => a + f.qty * priceOf(f.productId), 0);
    const pendientes = finishedStock.filter((f) => f.status === 'en_transito').length;
    return { unidades, disp, valor, pendientes };
  }, [finishedStock, products]);

  // EX-F3-03: ingresos de producción esperando verificación de recepción en CEDI.
  const pendientesRecep = useMemo(
    () => finishedStock.filter((f) => f.receptionStatus === 'pendiente_recepcion'),
    [finishedStock],
  );

  // Confirma la recepción física en CEDI (espejo de verifyCEDIReception, Demo6:7691-7720). En UN
  // setState atómico (cascada B2): marca el finishedStock 'recibido', suma al stock maestro del
  // producto, deja la OP 'listo' y convierte el stockMove pendiente en entrada definitiva.
  const confirmarRecepcion = (fsId) => {
    const f = finishedStock.find((x) => x.id === fsId);
    if (!f) return;
    if (f.receptionStatus === 'recibido') return toast('Ya estaba marcado como recibido', 'info');
    const date = today();
    const at = nowISO();
    const by = currentUser?.name || 'Logística';
    setState((s) => {
      const rec = s.finishedStock.find((x) => x.id === fsId);
      if (!rec) return s;
      const { qty = 0, productId: pid, warehouseId: wid, orderId: oid } = rec;
      return {
        ...s,
        finishedStock: s.finishedStock.map((x) =>
          x.id === fsId ? { ...x, receptionStatus: 'recibido', readyDate: date, receivedAt: at, receivedBy: by } : x,
        ),
        // Suma al maestro UNA sola vez. El conteo de unidades de Inventario/Inicio sale de
        // finishedStock (NO de product.stock), así que esto no duplica en ningún KPI.
        products: s.products.map((p) =>
          p.id === pid ? { ...p, stock: (p.stock || 0) + (Number(qty) || 0), warehouseId: p.warehouseId || wid } : p,
        ),
        orders: s.orders.map((o) => (oid && o.id === oid ? { ...o, estado: 'listo' } : o)),
        stockMoves: (s.stockMoves || []).map((m) =>
          m.orderId === oid && m.type === 'entrada_produccion_pendiente'
            ? { ...m, type: 'entrada_produccion', verifiedAt: date, verifiedBy: by }
            : m,
        ),
      };
    });
    toast('✓ Recepción confirmada · producto disponible en CEDI', 'ok');
  };

  // Resumen por bodega usado en las tarjetas (líneas, terminados, valor).
  const summaryByW = useMemo(() => {
    const map = {};
    for (const w of ptWarehouses) {
      const items = finishedStock.filter((f) => f.warehouseId === w.id);
      const qty = items.reduce((a, f) => a + f.qty, 0);
      const val = items.reduce((a, f) => a + f.qty * (prod(f.productId)?.price || 0), 0);
      map[w.id] = { lineas: items.length, qty, val };
    }
    return map;
  }, [finishedStock, ptWarehouses, products]);

  // Filtros aplicados sobre la tabla.
  const rows = useMemo(() => {
    const t = search.toLowerCase();
    return finishedStock.filter((fs) => {
      if (bodega && fs.warehouseId !== bodega) return false;
      if (vista === 'stock' && fs.orderId) return false;
      if (vista === 'clientes' && !fs.orderId) return false;
      if (productoFilter && fs.productId !== productoFilter) return false;
      if (orderFilter && !(`${fs.orderId || ''} ${fs.pedidoId || ''}`).toLowerCase().includes(orderFilter.toLowerCase()))
        return false;
      if (clientFilter && fs.customerId !== clientFilter) return false;
      if (t) {
        const txt = `${prod(fs.productId)?.name || ''} ${fs.id} ${fs.orderId || ''} ${fs.clientName || ''}`.toLowerCase();
        if (!txt.includes(t)) return false;
      }
      return true;
    });
  }, [finishedStock, bodega, vista, search, productoFilter, orderFilter, clientFilter, products]);

  const hasFilters =
    !!(search || bodega || productoFilter || orderFilter || clientFilter);

  const clearAll = () => {
    setSearch('');
    setBodega('');
    setProductoFilter('');
    setOrderFilter('');
    setClientFilter('');
    setSelected(new Set());
  };

  // Selección múltiple para traslado masivo.
  const toggleSelect = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  // Aplica traslado a los items seleccionados.
  // NOTA: generamos los IDs FUERA del callback de setState para evitar
  // nested setState (nextId hace su propio setState internamente).
  const applyTraslado = () => {
    const destino = trasladoForm.destino;
    if (!destino) return toast('Selecciona bodega destino', 'warn');
    if (!trasladoForm.ids?.length) return toast('Selecciona items', 'warn');
    const tsBase = Date.now().toString(36);
    const idsSet = new Set(trasladoForm.ids);
    const userName = currentUser?.name || 'Sistema';
    setState((s) => {
      const moves = trasladoForm.ids.map((id, i) => {
        const fs = s.finishedStock.find((x) => x.id === id);
        return {
          id: `MOV-${tsBase}-${i}`,
          type: 'traslado',
          finishedStockId: id,
          productId: fs?.productId,
          qty: fs?.qty,
          fromWarehouseId: fs?.warehouseId,
          toWarehouseId: destino,
          reason: trasladoForm.motivo || 'Traslado manual',
          by: userName,
          date: new Date().toISOString().slice(0, 10),
        };
      });
      return {
        ...s,
        finishedStock: s.finishedStock.map((fs) =>
          idsSet.has(fs.id) ? { ...fs, warehouseId: destino, status: 'en_transito' } : fs,
        ),
        stockMoves: [...moves, ...(s.stockMoves || [])],
      };
    });
    toast(`${trasladoForm.ids.length} item(s) trasladados a ${wName(destino)}`, 'ok');
    setSelected(new Set());
    setTrasladoForm(null);
  };

  const statusVariant = (status) => {
    if (status === 'disponible') return 'ok';
    if (status === 'reservado') return 'gold';
    if (status === 'en_transito') return 'info';
    return 'gray';
  };

  return (
    <div className="space-y-5">
      {/* KPIs superiores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Unidades terminadas" value={kpis.unidades} accent="#10b981" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="Disponibles venta" value={kpis.disp} accent="#C9A961" icon={<IconBox width={18} height={18} />} />
        <KpiCard label="Valor inventario" value={fmtCOP(kpis.valor)} accent="#3b82f6" icon={<IconBank width={18} height={18} />} />
        <KpiCard label="En tránsito" value={kpis.pendientes} accent="#f59e0b" icon={<IconShield width={18} height={18} />} />
      </div>

      {/* EX-F3-03: pendientes de recepción en CEDI (producción esperando verificación) */}
      {pendientesRecep.length > 0 && (
        <div className="panel p-4" style={{ borderLeft: '4px solid #C9A961' }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gold-accent">📦 Pendiente de recepción en CEDI</h3>
            <span className="text-xs text-muted">{pendientesRecep.length} por verificar</span>
          </div>
          <div className="space-y-2">
            {pendientesRecep.map((f) => {
              const p = prod(f.productId);
              return (
                <div key={f.id} className="panel-2 flex flex-wrap items-center justify-between gap-2 rounded p-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white">
                      {p?.photo || '📦'} {p?.name || f.productId} <span className="text-muted">×{f.qty}</span>
                    </div>
                    <div className="text-[11px] text-muted">
                      OP <span className="font-mono text-gold-accent">{f.orderId || '—'}</span> · {wName(f.warehouseId)}
                      {f.clientName ? ` · ${f.clientName}` : ' · stock libre'}
                    </div>
                  </div>
                  <button
                    onClick={() => confirmarRecepcion(f.id)}
                    className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10"
                  >
                    ✓ Confirmar recepción
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Título de bodegas */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-white">Bodegas producto terminado</span>
        <span className="text-xs text-muted">(clic: filtrar · doble clic: detalle)</span>
      </div>

      {/* Tarjetas de bodegas (incluye "Todas" como selector) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Card Todas */}
        <button
          onClick={() => setBodega('')}
          className={`panel p-4 text-left transition hover:border-gold-accent ${
            bodega === '' ? 'border-gold-accent ring-2 ring-gold-accent/30' : ''
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="grid h-10 w-10 place-items-center rounded-lg"
                style={{ background: '#C9A96122', border: '1px solid #C9A96155', color: '#C9A961' }}
              >
                <IconDashboard width={18} height={18} />
              </div>
              <div>
                <div className="font-bold" style={{ color: '#C9A961' }}>
                  Todas
                </div>
                <div className="text-[11px] text-muted">Resumen total</div>
              </div>
            </div>
            <span className="text-[10px] text-muted">click</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="panel-2 rounded p-2">
              <div className="text-[10px] uppercase text-muted">Bodegas</div>
              <div className="text-lg font-bold text-white">{ptWarehouses.length}</div>
            </div>
            <div className="panel-2 rounded p-2">
              <div className="text-[10px] uppercase text-muted">Terminados</div>
              <div className="text-lg font-bold text-emerald-400">{kpis.unidades}</div>
            </div>
            <div className="panel-2 col-span-2 rounded p-2">
              <div className="text-[10px] uppercase text-muted">Valor comercial total</div>
              <div className="text-sm font-bold text-gold-accent">{fmtCOP(kpis.valor)}</div>
            </div>
          </div>
        </button>

        {/* Cards por bodega */}
        {ptWarehouses.map((w) => {
          const s = summaryByW[w.id] || { lineas: 0, qty: 0, val: 0 };
          const active = bodega === w.id;
          return (
            <button
              key={w.id}
              onClick={() => setBodega(active ? '' : w.id)}
              className={`panel p-4 text-left transition hover:border-gold-accent ${
                active ? 'ring-2 ring-gold-accent/30' : ''
              }`}
              style={active ? { borderColor: w.color } : undefined}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-lg"
                    style={{
                      background: `${w.color}22`,
                      border: `1px solid ${w.color}55`,
                      color: w.color,
                    }}
                  >
                    <IconBox width={18} height={18} />
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: w.color }}>
                      {w.code}
                    </div>
                    <div className="text-[11px] text-muted">{w.name}</div>
                  </div>
                </div>
                {active && (
                  <span className="text-[10px] font-bold" style={{ color: w.color }}>
                    ACTIVO
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="panel-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">Terminados</div>
                  <div className="text-lg font-bold text-emerald-400">{s.qty}</div>
                </div>
                <div className="panel-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">Líneas</div>
                  <div className="text-lg font-bold text-white">{s.lineas}</div>
                </div>
                <div className="panel-2 col-span-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">Valor comercial</div>
                  <div className="text-sm font-semibold" style={{ color: w.color }}>
                    {fmtCOP(s.val)}
                  </div>
                </div>
                <div className="panel-2 col-span-2 rounded p-2">
                  <div className="text-[10px] uppercase text-muted">Responsable</div>
                  <div className="text-sm font-medium text-white">{w.responsable}</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-muted">📍 {w.address}</div>
            </button>
          );
        })}
      </div>

      {/* Tabs + Filtros */}
      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setVista('stock')}
            className={vista === 'stock' ? 'btn-gold' : 'btn-ghost'}
          >
            📦 Stock Castor (disponibles para venta)
          </button>
          <button
            onClick={() => setVista('clientes')}
            className={vista === 'clientes' ? 'btn-gold' : 'btn-ghost'}
          >
            👥 Clientes (pendiente despacho)
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, OP, cliente…"
            className="input-field w-64"
          />
          <select value={bodega} onChange={(e) => setBodega(e.target.value)} className="input-field w-auto">
            <option value="">Todas las bodegas</option>
            {ptWarehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code}</option>
            ))}
          </select>
          <select
            value={productoFilter}
            onChange={(e) => setProductoFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            placeholder="Filtrar por OP/Pedido…"
            className="input-field w-44"
          />
          {vista === 'clientes' && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="">Todos los clientes</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <label className="ml-1 flex items-center gap-1 text-xs text-muted">
            <input
              type="checkbox"
              checked={todasAlaVez}
              onChange={(e) => setTodasAlaVez(e.target.checked)}
              className="accent-gold-accent"
            />
            Todas a la vez
          </label>
          <ClearFiltersButton active={hasFilters} onClear={clearAll} />
          {selected.size > 0 && (
            <button
              onClick={() =>
                setTrasladoForm({ ids: Array.from(selected), destino: '', motivo: '' })
              }
              className="btn-gold ml-auto"
            >
              ↔ Trasladar {selected.size} seleccionado(s)
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-gold-accent"
                  />
                </th>
                <th className="px-3 py-3">Foto</th>
                <th className="px-3 py-3">Producto</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Bodega</th>
                {vista === 'clientes' && <th className="px-3 py-3">Cliente</th>}
                <th className="px-3 py-3 text-right">Costo</th>
                <th className="px-3 py-3 text-right">Valor comercial</th>
                <th className="px-3 py-3 text-right">Cant.</th>
                <th className="px-3 py-3">Ingreso</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = prod(r.productId);
                const w = wById(r.warehouseId);
                return (
                  <tr key={r.id} className="table-row border-b border-white/5">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="accent-gold-accent"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="product-photo grid h-10 w-10 place-items-center rounded text-xl">
                        {p?.photo || '📦'}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-white">{p?.name}</div>
                      {p?.dimensions && (
                        <div className="text-[10px] text-muted">
                          {typeof p.dimensions === 'object'
                            ? `${p.dimensions.ancho}×${p.dimensions.alto}×${p.dimensions.profundidad} cm`
                            : p.dimensions}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{p?.sku}</td>
                    <td className="px-3 py-3">
                      <span
                        className="warehouse-pill"
                        style={{
                          color: w?.color,
                          borderColor: `${w?.color}55`,
                          background: `${w?.color}1f`,
                        }}
                      >
                        {w?.code}
                      </span>
                    </td>
                    {vista === 'clientes' && (
                      <td className="px-3 py-3 text-muted">
                        {r.clientName || customerName(r.customerId) || '—'}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                      {fmtCOP((p?.cost || 0) * r.qty)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-white">
                      {fmtCOP((p?.price || 0) * r.qty)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-white">
                      {r.qty}
                    </td>
                    <td className="px-3 py-3 text-muted">{fmtDate(r.readyDate || r.entryDate)}</td>
                    <td className="px-3 py-3">
                      <Chip variant={statusVariant(r.status)}>{r.status || 'disponible'}</Chip>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setTrasladoForm({ ids: [r.id], destino: '', motivo: '' })}
                        className="text-xs text-gold-accent hover:underline"
                      >
                        ↔ Trasladar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-muted">
                    Sin unidades en esta vista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de traslado */}
      <Modal
        open={!!trasladoForm}
        onClose={() => setTrasladoForm(null)}
        title={`Trasladar ${trasladoForm?.ids?.length || 0} item(s)`}
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setTrasladoForm(null)}>
              Cancelar
            </button>
            <button className="btn-gold" onClick={applyTraslado}>
              Confirmar traslado
            </button>
          </>
        }
      >
        {trasladoForm && (
          <FormGrid cols={1}>
            <Field label="Bodega destino">
              <Select
                value={trasladoForm.destino}
                onChange={(e) =>
                  setTrasladoForm((f) => ({ ...f, destino: e.target.value }))
                }
              >
                <option value="">— elegir —</option>
                {ptWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Motivo">
              <Input
                value={trasladoForm.motivo}
                onChange={(e) =>
                  setTrasladoForm((f) => ({ ...f, motivo: e.target.value }))
                }
                placeholder="Ej: reubicación por demanda"
              />
            </Field>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
