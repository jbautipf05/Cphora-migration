import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import {
  Toolbar,
  SearchBox,
  SelectFilter,
  DataTable,
  EstadoBadge,
  fmtDate,
  ClearFiltersButton,
} from '../components/widgets';
import { useToast } from '../components/Toast';
import { IconCart, IconCheck, IconBox, IconShield } from '../components/icons';

// ─────────────────────────────────────────────────────────────────────────────
// Despacho — espejo de renderDespacho() del HTML.
// Dos tablas: pendientes + histórico (despachados). Filtros search + ciudad.
// ─────────────────────────────────────────────────────────────────────────────
export default function Despacho() {
  const { dispatchRequests, setState, currentUser } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  const ciudades = useMemo(
    () => [...new Set(dispatchRequests.map((d) => d.ciudad || d.city).filter(Boolean))],
    [dispatchRequests],
  );

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return dispatchRequests.filter((d) => {
      const c = d.ciudad || d.city;
      if (city && c !== city) return false;
      if (
        t &&
        !`${d.clientName || ''} ${d.orderId || ''} ${d.pedidoId || ''} ${c || ''}`
          .toLowerCase()
          .includes(t)
      )
        return false;
      return true;
    });
  }, [dispatchRequests, q, city]);

  const pendientes = filtered.filter((d) => d.estado === 'pendiente');
  const historico = filtered
    .filter((d) => d.estado === 'despachado')
    .sort((a, b) => (b.dispatchedAt || '').localeCompare(a.dispatchedAt || ''))
    .slice(0, 80);

  const kpis = useMemo(
    () => ({
      pendientes: dispatchRequests.filter((d) => d.estado === 'pendiente').length,
      despachados: dispatchRequests.filter((d) => d.estado === 'despachado').length,
      ciudades: ciudades.length,
      total: dispatchRequests.length,
    }),
    [dispatchRequests, ciudades],
  );

  const despachar = (id) => {
    setState((s) => ({
      ...s,
      dispatchRequests: s.dispatchRequests.map((d) =>
        d.id === id
          ? {
              ...d,
              estado: 'despachado',
              dispatchedAt: new Date().toISOString(),
              dispatchedBy: currentUser?.name || 'Sistema',
            }
          : d,
      ),
    }));
    toast('Despacho registrado', 'ok');
  };

  const hasFilters = !!(q || city);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pendientes"
          value={kpis.pendientes}
          hint="Por despachar"
          accent={kpis.pendientes > 0 ? '#f59e0b' : '#10b981'}
          icon={<IconCart width={18} height={18} />}
        />
        <KpiCard
          label="Despachados"
          value={kpis.despachados}
          hint="Histórico"
          accent="#10b981"
          icon={<IconCheck width={18} height={18} />}
        />
        <KpiCard
          label="Ciudades"
          value={kpis.ciudades}
          hint="Únicas"
          accent="#3b82f6"
          icon={<IconBox width={18} height={18} />}
        />
        <KpiCard
          label="Total solicitudes"
          value={kpis.total}
          hint="Acumulado"
          accent="#C9A961"
          icon={<IconShield width={18} height={18} />}
        />
      </div>

      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar cliente, pedido, ciudad…" />
          <SelectFilter value={city} onChange={setCity} options={ciudades} allLabel="Todas las ciudades" />
          <ClearFiltersButton active={hasFilters} onClear={() => { setQ(''); setCity(''); }} />
          <span className="ml-auto text-sm text-muted">
            {pendientes.length} pendientes · {historico.length} en histórico
          </span>
        </div>
      </div>

      {/* Tabla Pendientes */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          🚚 Despachos pendientes
          <span className="text-xs font-normal text-muted">({pendientes.length})</span>
        </h3>
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Solicitud</th>
                  <th className="px-4 py-3">Pedido/OP</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Ciudad</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Solicitado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pendientes.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-[rgba(201,169,97,0.06)]">
                    <td className="px-4 py-3 font-mono text-xs text-gold-accent">{d.id}</td>
                    <td className="px-4 py-3 text-muted">
                      <span className="text-white">{d.pedidoId || d.orderId}</span>
                      {d.opId && <span className="ml-1 text-[10px]">· {d.opId}</span>}
                    </td>
                    <td className="px-4 py-3 text-white">{d.clientName}</td>
                    <td className="px-4 py-3 text-muted">{d.ciudad || d.city}</td>
                    <td className="px-4 py-3 text-muted">{d.address}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(d.requestedAt || d.solicitedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => despachar(d.id)}
                        className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10"
                      >
                        🚚 Despachar
                      </button>
                    </td>
                  </tr>
                ))}
                {pendientes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      Sin solicitudes pendientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabla Histórico */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          📜 Histórico de despachos
          <span className="text-xs font-normal text-muted">({historico.length})</span>
        </h3>
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Solicitud</th>
                  <th className="px-4 py-3">Pedido/OP</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Ciudad</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Despachado</th>
                  <th className="px-4 py-3">Por</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-[rgba(201,169,97,0.06)]">
                    <td className="px-4 py-3 font-mono text-xs text-gold-accent/70">{d.id}</td>
                    <td className="px-4 py-3 text-muted">
                      <span className="text-white">{d.pedidoId || d.orderId}</span>
                      {d.opId && <span className="ml-1 text-[10px]">· {d.opId}</span>}
                    </td>
                    <td className="px-4 py-3 text-white">{d.clientName}</td>
                    <td className="px-4 py-3 text-muted">{d.ciudad || d.city}</td>
                    <td className="px-4 py-3 text-muted">{d.address}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(d.dispatchedAt)}</td>
                    <td className="px-4 py-3 text-muted">{d.dispatchedBy || '—'}</td>
                  </tr>
                ))}
                {historico.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      Sin despachos en histórico
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
