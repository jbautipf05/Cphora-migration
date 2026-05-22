import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge, Chip } from '../components/ui';
import { PROD_AREAS } from '../data/erpSeed';
import { Tabs, fmtDate, daysUntil, SearchBox, SelectFilter, ClearFiltersButton, SlidePanel } from '../components/widgets';
import { fmtCOP } from '../lib/format';

// Vista Producción con 3 modos (espejo del HTML demo, líneas ~6294-6296):
//   - tarjetas: kanban por área (vista más visual, opción por defecto)
//   - compacto: tabla densa con cambio de área inline
//   - heatmap : barra de saturación por área con conteo y % de capacidad
export default function Produccion() {
  const { orders, products, customers, setState } = useApp();
  const [mode, setMode] = useState('tarjetas');
  const [sortBy, setSortBy] = useState('vence');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [productoFilter, setProductoFilter] = useState('');
  const [asesorFilter, setAsesorFilter] = useState('');
  const [selOP, setSelOP] = useState(null); // OP seleccionada para detalle

  const asesores = useMemo(
    () => [...new Set(orders.map((o) => o.asesor).filter(Boolean))],
    [orders],
  );

  // OPs = pedidos en producción (incluye 'produccion' y 'pendiente_op').
  // Aplica filtros de búsqueda/área/producto/asesor.
  const ops = useMemo(() => {
    const t = search.toLowerCase();
    return orders
      .filter((o) => o.estado === 'produccion' || o.estado === 'pendiente_op')
      .filter((o) => {
        if (areaFilter && o.area !== areaFilter) return false;
        if (productoFilter && o.productId !== productoFilter) return false;
        if (asesorFilter && o.asesor !== asesorFilter) return false;
        if (t) {
          const txt = `${o.id} ${o.clientName || ''} ${o.asesor || ''} ${o.area || ''}`.toLowerCase();
          if (!txt.includes(t)) return false;
        }
        return true;
      });
  }, [orders, search, areaFilter, productoFilter, asesorFilter]);
  const pName = (id) => products.find((p) => p.id === id)?.name || id;
  const cName = (o) => customers.find((c) => c.id === o.customerId)?.name || o.clientName;

  const hasFilters = !!(search || areaFilter || productoFilter || asesorFilter);
  const clearAll = () => { setSearch(''); setAreaFilter(''); setProductoFilter(''); setAsesorFilter(''); };

  // Alertas: OPs vencidas o ≤7 días.
  const alertas = useMemo(
    () =>
      ops
        .filter((o) => {
          const d = daysUntil(o.dueDate);
          return d !== null && d <= 7;
        })
        .sort((a, b) => (daysUntil(a.dueDate) ?? 999) - (daysUntil(b.dueDate) ?? 999)),
    [ops],
  );

  // Ordenamiento global compartido por las 3 vistas.
  const opsSorted = useMemo(() => {
    const arr = [...ops];
    switch (sortBy) {
      case 'vence':
        return arr.sort((a, b) => (a.dueDate || '￿').localeCompare(b.dueDate || '￿'));
      case 'diasAsc':
        return arr.sort((a, b) => (daysUntil(a.dueDate) ?? 999) - (daysUntil(b.dueDate) ?? 999));
      case 'diasDesc':
        return arr.sort((a, b) => (daysUntil(b.dueDate) ?? -999) - (daysUntil(a.dueDate) ?? -999));
      case 'cliente':
        return arr.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
      default:
        return arr;
    }
  }, [ops, sortBy]);

  const kpis = useMemo(() => {
    const activas = ops.length;
    const alertas = ops.filter((o) => {
      const d = daysUntil(o.dueDate);
      return d !== null && d <= 7;
    }).length;
    const listos = orders.filter((o) => o.area === 'Listo').length;
    const promDias =
      ops.length > 0
        ? Math.round(
            ops.reduce((a, o) => a + (daysUntil(o.dueDate) ?? 0), 0) / ops.length,
          )
        : 0;
    return { activas, alertas, listos, promDias };
  }, [ops, orders]);

  const byArea = useMemo(() => {
    const map = Object.fromEntries(PROD_AREAS.map((a) => [a, []]));
    for (const o of opsSorted) (map[o.area] = map[o.area] || []).push(o);
    return map;
  }, [opsSorted]);

  // Saturación por área para el heatmap: % relativo al área más cargada.
  const saturacion = useMemo(() => {
    const counts = PROD_AREAS.map((a) => ({ area: a, count: byArea[a]?.length || 0 }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    // Capacidad de referencia: aprox 8 OPs por área (configurable). Si todas
    // las áreas están vacías se evita división por cero.
    const CAPACIDAD = 8;
    return counts.map((c) => ({
      ...c,
      pctMax: (c.count / max) * 100,
      pctCapacidad: Math.min(100, (c.count / CAPACIDAD) * 100),
      color:
        c.count >= CAPACIDAD ? '#ef4444' : c.count >= CAPACIDAD * 0.7 ? '#f59e0b' : '#10b981',
    }));
  }, [byArea]);

  const moveArea = (id, area) =>
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === id ? { ...o, area } : o)),
    }));

  const diasBadge = (o) => {
    const d = daysUntil(o.dueDate);
    if (d === null) return <Badge tone="muted">sin fecha</Badge>;
    return (
      <Badge tone={d <= 3 ? 'red' : d <= 7 ? 'gold' : 'green'}>
        {d <= 0 ? 'Vencido' : `${d} días`}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="OPs activas" value={kpis.activas} accent="#38bdf8" />
        <KpiCard label="Alertas ≤7 días" value={kpis.alertas} accent="#f87171" />
        <KpiCard label="Tiempo prom. (días)" value={kpis.promDias} accent="#C9A961" />
        <KpiCard label="Listos" value={kpis.listos} accent="#34d399" />
      </div>

      {/* Panel Alertas (HTML línea 6213+) */}
      {alertas.length > 0 && (
        <div className="panel p-4" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-red-300">⚠ Alertas cierre de tiempo</h3>
            <span className="text-[11px] text-muted">{alertas.length} OP(s)</span>
          </div>
          <div className="space-y-2">
            {alertas.map((o) => {
              const d = daysUntil(o.dueDate);
              return (
                <button
                  key={o.id}
                  onClick={() => setSelOP(o)}
                  className="panel-2 flex w-full items-center justify-between rounded p-3 text-left transition hover:border-red-400/40"
                  style={{ borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  <div>
                    <div className="font-semibold text-white">
                      <span className="font-mono text-xs text-gold-accent">{o.id}</span> ·{' '}
                      {o.clientName}
                    </div>
                    <div className="text-xs text-muted">
                      Iniciado {fmtDate(o.orderDate)} · Vence {fmtDate(o.dueDate)} · Área:{' '}
                      {o.area || '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${d <= 3 ? 'text-red-400' : 'text-amber-400'}`}>
                      {d <= 0 ? 'Vencido' : `${d}d`}
                    </div>
                    <div className="text-[10px] text-muted">restantes</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="OP, cliente, asesor…" />
          <SelectFilter value={areaFilter} onChange={setAreaFilter} options={PROD_AREAS} allLabel="Todas las áreas" />
          <SelectFilter value={productoFilter} onChange={setProductoFilter} options={products.map((p) => p.id)} allLabel="Todos los productos" />
          <SelectFilter value={asesorFilter} onChange={setAsesorFilter} options={asesores} allLabel="Todos los asesores" />
          <ClearFiltersButton active={hasFilters} onClear={clearAll} />
          <span className="ml-auto text-sm text-muted">{ops.length} OPs</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: 'tarjetas', label: '📇 Tarjetas' },
            { id: 'compacto', label: '📋 Compacto' },
            { id: 'heatmap', label: '🌡 Heatmap' },
          ]}
          active={mode}
          onChange={setMode}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-white/10 bg-brand-bg/60 px-3 py-2 text-sm text-white outline-none focus:border-gold-accent/60"
        >
          <option value="vence">Vence próximas</option>
          <option value="diasAsc">Días restantes (menor)</option>
          <option value="diasDesc">Días restantes (mayor)</option>
          <option value="cliente">Cliente A→Z</option>
        </select>
      </div>

      {/* ─── MODO TARJETAS (kanban por área) ─── */}
      {mode === 'tarjetas' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PROD_AREAS.map((area) => (
            <div key={area} className="w-60 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{area}</p>
                <span className="text-xs text-gold-accent">{byArea[area]?.length || 0}</span>
              </div>
              <div className="space-y-2">
                {(byArea[area] || []).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelOP(o)}
                    className="panel block w-full p-3 text-left transition hover:border-gold-accent"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gold-accent">{o.id}</span>
                      {diasBadge(o)}
                    </div>
                    <p className="mt-1 text-sm text-white">{o.clientName}</p>
                    <p className="text-xs text-muted">{pName(o.productId)} ×{o.qty}</p>
                  </button>
                ))}
                {(byArea[area] || []).length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-muted/60">
                    —
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODO COMPACTO (tabla densa con cambio de área inline) ─── */}
      {mode === 'compacto' && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">OP</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">Vence</th>
                  <th className="px-3 py-2 font-medium">Días</th>
                  <th className="px-3 py-2 font-medium">Área</th>
                </tr>
              </thead>
              <tbody>
                {opsSorted.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                    <td
                      className="cursor-pointer px-3 py-2 font-mono text-xs text-gold-accent hover:underline"
                      onClick={() => setSelOP(o)}
                    >
                      {o.id}
                    </td>
                    <td className="px-3 py-2 text-white">{o.clientName}</td>
                    <td className="px-3 py-2 text-muted">
                      {pName(o.productId)} ×{o.qty}
                    </td>
                    <td className="px-3 py-2 text-muted">{fmtDate(o.dueDate)}</td>
                    <td className="px-3 py-2">{diasBadge(o)}</td>
                    <td className="px-3 py-2">
                      <select
                        value={o.area || ''}
                        onChange={(e) => moveArea(o.id, e.target.value)}
                        className="rounded-lg border border-white/10 bg-brand-bg/60 px-2 py-1 text-xs text-white outline-none focus:border-gold-accent/60"
                      >
                        <option value="">—</option>
                        {PROD_AREAS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {opsSorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted">
                      Sin OPs activas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SLIDE PANEL · Detalles de OP ─── */}
      <SlidePanel
        open={!!selOP}
        onClose={() => setSelOP(null)}
        title={selOP?.id}
        subtitle={selOP ? `${selOP.clientName} · ${pName(selOP.productId)}` : ''}
      >
        {selOP && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {diasBadge(selOP)}
              <Chip variant={selOP.estado === 'produccion' ? 'info' : 'warn'}>{selOP.estado}</Chip>
              {selOP.tipo && <Chip variant="gold">{selOP.tipo}</Chip>}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Cliente', cName(selOP)],
                ['Producto', `${pName(selOP.productId)} × ${selOP.qty}`],
                ['Área', selOP.area || '—'],
                ['Asesor', selOP.asesor || '—'],
                ['Inicio', fmtDate(selOP.orderDate)],
                ['Vence', fmtDate(selOP.dueDate)],
                ['Tiempo (días)', selOP.tiempo || '—'],
                ['Pago', `${selOP.paid || 0}%`],
                ['Total', fmtCOP(selOP.total || 0)],
                ['Documento', selOP.docType || '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-brand-bg/40 p-3">
                  <p className="text-[11px] uppercase text-muted">{k}</p>
                  <p className="mt-0.5 text-white">{v}</p>
                </div>
              ))}
            </div>

            {selOP.deliveryAddress && (
              <div className="rounded-lg border border-white/5 bg-brand-bg/40 p-3 text-sm">
                <p className="text-[11px] uppercase text-muted">Entrega</p>
                <p className="mt-0.5 text-white">{selOP.deliveryAddress}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-accent/80">
                Cambiar área
              </p>
              <select
                value={selOP.area || ''}
                onChange={(e) => {
                  moveArea(selOP.id, e.target.value);
                  setSelOP((o) => ({ ...o, area: e.target.value }));
                }}
                className="input-field"
              >
                <option value="">— sin asignar —</option>
                {PROD_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* ─── MODO HEATMAP (saturación por área) ─── */}
      {mode === 'heatmap' && (
        <div className="panel p-5">
          <p className="mb-3 text-sm text-muted">
            Saturación por área · capacidad referencia = 8 OPs por área. Verde &lt;70%, ámbar &lt;100%, rojo ≥ capacidad.
          </p>
          <div className="space-y-3">
            {saturacion.map((s) => (
              <div key={s.area}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{s.area}</span>
                    <Badge
                      tone={s.color === '#ef4444' ? 'red' : s.color === '#f59e0b' ? 'gold' : 'green'}
                    >
                      {s.count} OPs
                    </Badge>
                  </div>
                  <span className="text-xs tabular-nums text-muted">
                    {Math.round(s.pctCapacidad)}% capacidad
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(s.pctCapacidad, 2)}%`, background: s.color }}
                  />
                </div>
                {/* Lista compacta de OPs en el área (max 5 visibles) */}
                {s.count > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(byArea[s.area] || []).slice(0, 5).map((o) => (
                      <span
                        key={o.id}
                        className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-muted"
                        title={`${o.clientName} · ${pName(o.productId)}`}
                      >
                        {o.id}
                      </span>
                    ))}
                    {s.count > 5 && (
                      <span className="text-[10px] text-muted">+{s.count - 5} más</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
