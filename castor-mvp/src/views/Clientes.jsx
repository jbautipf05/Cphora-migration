import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard, Badge, Chip } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { fmtDate, daysBetween, today, nowISO } from '../lib/format';
import { DataTable, SlidePanel, ClearFiltersButton } from '../components/widgets';
import { IconUsers, IconCheck, IconBadge, IconPhone } from '../components/icons';
import { useToast } from '../components/Toast';

export default function Clientes() {
  const {
    customers,
    orders,
    leads,
    quotes,
    postSales,
    payments,
    warranties,
    update,
    currentUser,
  } = useApp();
  const toast = useToast();
  const [noteText, setNoteText] = useState('');
  const [q, setQ] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [asesor, setAsesor] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [sel, setSel] = useState(null);

  const ciudades = useMemo(
    () => [...new Set(customers.map((c) => c.city).filter(Boolean))],
    [customers],
  );
  const asesores = useMemo(
    () => [...new Set(customers.map((c) => c.asesor).filter(Boolean))],
    [customers],
  );

  // Resumen por cliente: pedidos, cotizaciones, leads vinculados, postventa.
  const summary = useMemo(() => {
    const map = {};
    for (const c of customers) {
      const ords = orders.filter(
        (o) => o.customerId === c.id || o.clientName === c.name,
      );
      const cots = quotes.filter((qq) => qq.clientName === c.name);
      const lds = leads.filter((l) => l.linkedCustomerId === c.id || l.name === c.name);
      const psv = (postSales || []).filter(
        (p) => p.customerId === c.id || p.clientName === c.name,
      );
      const psvAbiertos = psv.filter((p) => p.estado && p.estado !== 'resuelta');
      const ultimo = [
        ...ords.map((o) => o.orderDate),
        ...cots.map((qq) => qq.createdAt?.slice(0, 10)),
        ...lds.map((l) => l.createdAt?.slice(0, 10)),
      ]
        .filter(Boolean)
        .sort()
        .pop();
      const historico = ords.reduce((a, o) => a + (o.total || 0), 0);
      const procesos = ords.length + cots.length + lds.length;
      const tieneActivos =
        ords.some((o) => o.estado && !['entregado', 'cancelado'].includes(o.estado)) ||
        cots.some((qq) => qq.estado === 'borrador' || qq.estado === 'enviada') ||
        lds.some((l) => l.estado === 'En gestión' || l.estado === 'Nuevo');
      const estadoCli = historico >= 20000000 ? 'vip' : tieneActivos ? 'activo' : 'inactivo';
      map[c.id] = {
        pedidos: ords,
        cotizaciones: cots,
        leadsVinc: lds,
        postventa: psv,
        postventaAbiertos: psvAbiertos.length,
        historico,
        procesos,
        ultimo,
        estadoCli,
      };
    }
    return map;
  }, [customers, orders, quotes, leads, postSales]);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return customers.filter((c) => {
      const s = summary[c.id];
      if (ciudad && c.city !== ciudad) return false;
      if (asesor && c.asesor !== asesor) return false;
      if (tipo && c.tipo !== tipo) return false;
      if (estado && s?.estadoCli !== estado) return false;
      if (t && !`${c.name} ${c.doc || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase().includes(t))
        return false;
      return true;
    });
  }, [customers, q, ciudad, asesor, tipo, estado, summary]);

  const kpis = useMemo(() => {
    const totals = Object.values(summary);
    return {
      total: customers.length,
      activos: totals.filter((s) => s.procesos > 0).length,
      // VIP: histórico ≥ $20M (igual que Demo6 customerTotalHist >= 20000000).
      vip: totals.filter((s) => s.historico >= 20000000).length,
      // Postventa pendiente: nº de CLIENTES con ≥1 seguimiento 'pendiente' (Demo6:4258),
      // no la suma total de seguimientos abiertos (bug previo que daba 3).
      pendientesPostventa: customers.filter((c) =>
        (postSales || []).some(
          (p) => (p.customerId === c.id || p.clientName === c.name) && p.estado === 'pendiente',
        ),
      ).length,
    };
  }, [customers, summary, postSales]);

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span>,
    },
    {
      key: 'name',
      label: 'Nombre',
      render: (r) => (
        <span className="inline-flex items-center gap-2 text-white">
          {r.name}
          {summary[r.id]?.estadoCli === 'vip' && <Badge tone="gold">VIP</Badge>}
        </span>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortValue: (r) => r.tipo,
      // Demo6 (clientes): institucional → badge-info (azul) "Institucional"; resto → badge-ok
      // (verde) "Persona", con mayúscula inicial (sin uppercase). Ver Demo6:4312.
      render: (r) => {
        const inst = r.tipo === 'institucional';
        return (
          <Chip variant={inst ? 'info' : 'ok'} uppercase={false}>
            {inst ? 'Institucional' : 'Persona'}
          </Chip>
        );
      },
    },
    { key: 'doc', label: 'Documento', render: (r) => <span className="text-muted">{r.doc}</span> },
    { key: 'city', label: 'Ciudad', render: (r) => <span className="text-muted">{r.city}</span> },
    // H-018: columna TELÉFONO entre Ciudad y Asesor (Demo6:4287).
    { key: 'phone', label: 'Teléfono', render: (r) => <span className="text-muted">{r.phone || '—'}</span> },
    { key: 'asesor', label: 'Asesor', render: (r) => <span className="text-muted">{r.asesor}</span> },
    {
      key: 'procesos',
      label: 'Procesos',
      align: 'right',
      sortValue: (r) => summary[r.id]?.procesos || 0,
      // Demo6 (Demo6:4317): número único consolidado, dorado si >0 (suma de sub-procesos).
      render: (r) => {
        const n = summary[r.id]?.procesos || 0;
        return <span className={`font-bold ${n ? 'text-gold-accent' : 'text-muted/50'}`}>{n}</span>;
      },
    },
    {
      key: 'hist',
      label: 'Histórico',
      align: 'right',
      sortValue: (r) => summary[r.id]?.historico || 0,
      render: (r) => <span className="text-white">{fmtCOP(summary[r.id]?.historico || 0)}</span>,
    },
    {
      key: 'ultimo',
      label: 'Última interacción',
      sortValue: (r) => summary[r.id]?.ultimo || '',
      render: (r) => {
        const u = summary[r.id]?.ultimo;
        if (!u) return <span className="text-muted/50">—</span>;
        // Demo6 muestra solo la fecha limpia, sin texto relativo "hace Nd".
        return <span className="text-xs text-muted">{fmtDate(u)}</span>;
      },
    },
  ];

  const selSummary = sel ? summary[sel.id] : null;

  return (
    <div className="space-y-5">
      {/* H-016: orden y tarjetas según Demo6:4261-4264 (Total → Con procesos → VIP → Postventa),
          con subtítulos e iconos. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total clientes" value={kpis.total} hint="En la base" accent="#C9A961" icon={<IconUsers width={18} height={18} />} />
        <KpiCard label="Con procesos activos" value={kpis.activos} hint="Lead/Cot/Venta/Postventa" accent="#3b82f6" icon={<IconCheck width={18} height={18} />} />
        <KpiCard label="VIP" value={kpis.vip} hint="Histórico ≥ $20M" accent="#f59e0b" icon={<IconBadge width={18} height={18} />} />
        <KpiCard label="Postventa pendiente" value={kpis.pendientesPostventa} hint="Seguimientos abiertos" accent={kpis.pendientesPostventa ? '#ef4444' : '#10b981'} icon={<IconPhone width={18} height={18} />} />
      </div>

      {/* H-017: filtros con labels (mayúsc. pequeñas), buscador ancho y contenedor unificado.
          Réplica de Demo6:4267-4276 (panel + grid 6 cols, Buscar = col-span-2). */}
      <div className="panel mb-5 p-4">
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="col-span-2">
            <label className="label">Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre, doc, teléfono..."
              className="input-field py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="input-field py-1.5 text-sm">
              <option value="">Todas</option>
              {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Asesor</label>
            <select value={asesor} onChange={(e) => setAsesor(e.target.value)} className="input-field py-1.5 text-sm">
              <option value="">Todos</option>
              {asesores.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-field py-1.5 text-sm">
              <option value="">Todos</option>
              <option value="lead">Persona</option>
              <option value="institucional">Institucional</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="input-field py-1.5 text-sm">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="vip">VIP</option>
            </select>
          </div>
        </div>
        <ClearFiltersButton
          active={!!(q || ciudad || asesor || tipo || estado)}
          onClear={() => { setQ(''); setCiudad(''); setAsesor(''); setTipo(''); setEstado(''); }}
          label="× Limpiar filtros"
        />
      </div>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} onRowClick={setSel} />

      <SlidePanel
        open={!!sel}
        onClose={() => { setSel(null); setNoteText(''); }}
        title={
          sel ? (
            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-xs text-brand-gold">{sel.id}</span>
              <Chip variant={sel.tipo === 'institucional' ? 'info' : 'ok'} uppercase={false}>
                {sel.tipo === 'institucional' ? 'Institucional' : 'Persona'}
              </Chip>
              {selSummary?.estadoCli === 'vip' && <Badge tone="gold">VIP</Badge>}
            </span>
          ) : ''
        }
        subtitle={sel ? <span className="text-lg font-bold text-gold-accent">{sel.name}</span> : ''}
      >
        {sel && selSummary && (() => {
          const cliPagos = payments.filter((p) =>
            selSummary.pedidos.some((o) => o.id === p.orderId),
          );
          const cliGarantias = (warranties || []).filter(
            (w) => selSummary.pedidos.some((o) => o.id === w.orderId),
          );
          const cliPostventa = (postSales || []).filter(
            (p) => p.customerId === sel.id || selSummary.pedidos.some((o) => o.id === p.orderId),
          );
          const pendientesPSV = cliPostventa.filter((p) => p.estado !== 'completado').length;
          const totalCobrado = cliPagos.reduce((a, p) => a + (p.amount || 0), 0);
          const saldoPendiente = selSummary.pedidos.reduce(
            (a, o) => a + (o.total || 0) * (1 - (o.paid || 0) / 100),
            0,
          );
          return (
            <div className="space-y-4">
              {/* Header con info de contacto */}
              <div className="space-y-1 text-sm">
                {sel.phone && (
                  <p className="text-white">📱 <span className="text-white">{sel.phone}</span> · ✉ <span className="text-white">{sel.email}</span> · 🪪 <span className="text-white">{sel.doc}</span> · 📍 <span className="text-white">{sel.city}</span></p>
                )}
                {sel.address && <p className="text-muted">🏠 {sel.address}</p>}
                {sel.address && <p className="text-muted">🚚 Entrega: {sel.address}</p>}
                <p className="text-muted">Asesor: <span className="font-medium text-white">{sel.asesor}</span></p>
              </div>

              {/* KPIs */}
              {/* H-026: títulos con mayúscula inicial (sin uppercase), Histórico dorado,
                  Saldo rojo/coral vivo. Ver Demo6:4364-4366. */}
              <div className="grid grid-cols-3 gap-2">
                <div className="panel-2 rounded-lg p-3">
                  <p className="text-[11px] text-muted">Histórico</p>
                  <p className="mt-0.5 text-lg font-bold text-gold-accent">{fmtCOP(selSummary.historico)}</p>
                </div>
                <div className="panel-2 rounded-lg p-3">
                  <p className="text-[11px] text-muted">Saldo</p>
                  <p className={`mt-0.5 text-lg font-bold ${saldoPendiente > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {fmtCOP(saldoPendiente)}
                  </p>
                </div>
                <div className="panel-2 rounded-lg p-3">
                  <p className="text-[11px] text-muted">Procesos activos</p>
                  <p className="mt-0.5 text-lg font-bold text-white">{selSummary.procesos}</p>
                </div>
              </div>

              {/* Sección Leads */}
              <div className="panel-2 rounded-lg p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-accent">
                  🔥 Leads ({selSummary.leadsVinc.length})
                </p>
                {selSummary.leadsVinc.length === 0 ? (
                  <p className="text-xs italic text-muted">Sin leads asociados</p>
                ) : (
                  <div className="space-y-1">
                    {selSummary.leadsVinc.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-gold-accent">{l.id}</span>
                        <span className="text-muted">{l.estado}</span>
                        <span className="text-white">{fmtCOP(l.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección Cotizaciones */}
              <div className="panel-2 rounded-lg p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-accent">
                  📄 Cotizaciones ({selSummary.cotizaciones.length})
                </p>
                {selSummary.cotizaciones.length === 0 ? (
                  <p className="text-xs italic text-muted">Sin cotizaciones</p>
                ) : (
                  <div className="space-y-1.5">
                    {selSummary.cotizaciones.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded bg-brand-bg/40 px-2 py-1 text-xs">
                        <span className="font-mono text-gold-accent">{c.id}</span>
                        <Chip variant={c.estado === 'aceptada' ? 'ok' : c.estado === 'enviada' ? 'info' : 'gray'}>
                          {c.estado}
                        </Chip>
                        <span className="text-muted">{fmtDate(c.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección Ventas / Pedidos */}
              <div className="panel-2 rounded-lg p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-accent">
                  🛒 Ventas / Pedidos ({selSummary.pedidos.length})
                </p>
                {selSummary.pedidos.length === 0 ? (
                  <p className="text-xs italic text-muted">Sin pedidos</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-muted">
                        <th className="py-1">Pedido</th>
                        <th className="py-1">Estado</th>
                        <th className="py-1">Doc</th>
                        <th className="py-1 text-right">Total</th>
                        <th className="py-1 text-right">Saldo</th>
                        <th className="py-1">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selSummary.pedidos.map((o) => {
                        const saldo = (o.total || 0) * (1 - (o.paid || 0) / 100);
                        return (
                          <tr key={o.id} className="border-t border-white/5">
                            <td className="py-1 font-mono text-gold-accent">{o.id}</td>
                            <td className="py-1">
                              {/* H-028: badge minúsculas + azul (info), id PED- se mantiene (decisión cosmética). Demo6:4381 */}
                              <Chip variant="info" uppercase={false}>
                                {o.estado}
                              </Chip>
                            </td>
                            <td className="py-1 uppercase text-muted">{o.docType}</td>
                            <td className="py-1 text-right text-white">{fmtCOP(o.total)}</td>
                            <td className={`py-1 text-right ${saldo > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                              {fmtCOP(saldo)}
                            </td>
                            <td className="py-1 text-muted">{fmtDate(o.orderDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Sección Pagos */}
              <div className="panel-2 rounded-lg p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-accent">
                  💰 Pagos ({cliPagos.length})
                </p>
                {cliPagos.length === 0 ? (
                  <p className="text-xs italic text-muted">Sin pagos</p>
                ) : (
                  <div className="space-y-1">
                    {cliPagos.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-gold-accent">{p.id}</span>
                        <span className="text-muted">{p.method}</span>
                        <span className="text-white">{fmtCOP(p.amount)}</span>
                      </div>
                    ))}
                    <p className="border-t border-white/10 pt-1 text-right text-xs">
                      Total cobrado: <span className="font-semibold text-emerald-300">{fmtCOP(totalCobrado)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Sección Postventa */}
              <div className="panel-2 rounded-lg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gold-accent">
                    📞 Postventa ({cliPostventa.length})
                  </p>
                  {pendientesPSV > 0 && (
                    <span className="text-xs text-amber-300">{pendientesPSV} pendientes</span>
                  )}
                </div>
                {cliPostventa.length === 0 ? (
                  <p className="text-xs italic text-muted">Sin postventa</p>
                ) : (
                  <div className="space-y-1.5">
                    {cliPostventa.map((p) => {
                      const dd = daysBetween(today(), p.fechaObjetivo);
                      const vencido = p.estado === 'pendiente' && dd <= 0;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded bg-brand-bg/40 px-2 py-1 text-xs"
                        >
                          <span className={vencido ? 'font-semibold text-red-300' : 'text-white'}>
                            {p.hito} · Seguimiento {p.hito === '7d' ? '1 semana' : p.hito === '6m' ? '6 meses' : '12 meses'}
                          </span>
                          <span className="text-muted">{fmtDate(p.fechaObjetivo)}</span>
                          {p.estado === 'pendiente' ? (
                            <button className="text-emerald-300 hover:underline">Completar</button>
                          ) : (
                            <Chip variant={p.estado === 'completado' ? 'ok' : 'info'}>{p.estado}</Chip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sección Garantías */}
              <div className="panel-2 rounded-lg p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-accent">
                  🛡 Garantías ({cliGarantias.length})
                </p>
                {cliGarantias.length === 0 ? (
                  <p className="text-xs italic text-muted">Sin garantías registradas</p>
                ) : (
                  <div className="space-y-1">
                    {cliGarantias.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-gold-accent">{g.id}</span>
                        <span className="text-muted">{g.motivo}</span>
                        <Chip variant={g.estado === 'cerrada' ? 'ok' : 'warn'}>{g.estado}</Chip>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notas */}
              <div className="panel-2 rounded-lg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gold-accent">
                    📝 Notas y seguimientos
                  </p>
                  <button
                    onClick={() => {
                      if (!noteText.trim()) return;
                      update('customers', sel.id, (c) => ({
                        notes: [
                          ...(c.notes || []),
                          { at: nowISO(), by: currentUser?.name || 'Sistema', text: noteText.trim() },
                        ],
                      }));
                      setNoteText('');
                      toast('Nota agregada', 'ok');
                    }}
                    className="text-xs text-gold-accent hover:underline"
                  >
                    + Nota
                  </button>
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Agregar nota..."
                  className="input-field mb-2 min-h-[50px] text-xs"
                />
                <div className="space-y-1">
                  {(sel.notes || []).length === 0 && (
                    <p className="text-xs italic text-muted">Sin notas</p>
                  )}
                  {(sel.notes || []).map((n, i) => (
                    <div key={i} className="rounded border-l-2 border-gold-accent bg-brand-bg/40 p-2 pl-3 text-xs">
                      <p className="text-white">{n.text}</p>
                      <p className="mt-1 text-[10px] text-muted">{n.by} · {fmtDate(n.at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </SlidePanel>
    </div>
  );
}
