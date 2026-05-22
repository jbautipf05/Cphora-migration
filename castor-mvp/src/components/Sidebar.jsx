import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { NAV, CONTAB_IDS } from '../nav';
import { addDays, daysUntil } from '../lib/format';
import { SIDEBAR_ICONS } from './icons';

// Render del icono asociado al id de menú. Cae a un punto si no existe mapping.
function NavIcon({ id }) {
  const Cmp = SIDEBAR_ICONS[id];
  if (!Cmp) return <span className="block w-4 text-center text-xs leading-none">·</span>;
  return <Cmp width={16} height={16} className="shrink-0" />;
}

function Badge({ children, tone }) {
  const tones = {
    gold: 'bg-brand-gold/80 text-brand-bg font-bold',
    muted: 'bg-white/10 text-brand-muted',
    green: 'bg-emerald-500/20 text-emerald-300 font-semibold',
    red: 'bg-red-500 text-white font-semibold',
    amber: 'bg-amber-500 text-white font-semibold',
  };
  return (
    <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${tones[tone] || tones.muted}`}>
      {children}
    </span>
  );
}

// Calcula los badges dinámicos del demo a partir del estado.
function useBadges() {
  const { leads, quotes, finishedStock, orders, warranties } = useApp();
  const finishedQty = finishedStock.reduce((a, f) => a + f.qty, 0);
  const prodAlerts = orders.filter((o) => {
    if (o.estado !== 'produccion') return false;
    const due = o.dueDate || (o.orderDate && o.tiempo ? addDays(o.orderDate, o.tiempo) : null);
    const d = daysUntil(due);
    return d !== null && d <= 7;
  }).length;
  const garAbiertas = warranties.filter((w) => w.estado !== 'cerrada').length;
  return {
    leads: leads.length ? { tone: 'gold', value: leads.length } : null,
    cotizaciones: quotes.length ? { tone: 'muted', value: quotes.length } : null,
    inventario: finishedQty ? { tone: 'green', value: finishedQty } : null,
    produccion: prodAlerts ? { tone: 'red', value: prodAlerts } : null,
    garantias: garAbiertas ? { tone: 'amber', value: garAbiertas } : null,
  };
}

export default function Sidebar({ view, setView }) {
  const { currentUser, resetDemo } = useApp();
  const [contabOpen, setContabOpen] = useState(CONTAB_IDS.includes(view));
  const badges = useBadges();

  const Link = ({ id, label, depth = 0, iconOverride }) => (
    <a
      onClick={() => setView(id)}
      className={`sidebar-link flex items-center gap-3 px-6 py-2.5 ${view === id ? 'active' : ''}`}
      style={depth ? { paddingLeft: 24 + depth * 16 } : undefined}
    >
      {iconOverride ?? <NavIcon id={id} />}
      <span>{label}</span>
      {badges[id] && <Badge tone={badges[id].tone}>{badges[id].value}</Badge>}
    </a>
  );

  return (
    <aside
      className="flex w-64 shrink-0 flex-col overflow-y-auto scrollbar-thin bg-brand-bg-2"
      style={{ borderRight: '1px solid #2A4061' }}
    >
      {/* Marca */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid #2A4061' }}>
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-lg text-lg font-bold text-brand-bg"
            style={{ background: 'linear-gradient(135deg,#C9A961,#A88D4B)', boxShadow: '0 4px 12px rgba(201,169,97,0.35)' }}
          >
            C
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide text-white">CASTOR</div>
            <div className="text-xs text-brand-gold-light/70">Cphora · Demo 3</div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 text-sm">
        {NAV.map((node) => {
          if (node.type === 'item') {
            return <Link key={node.id} id={node.id} label={node.label} />;
          }
          return (
            <div key={node.label}>
              <div className="px-6 pb-2 pt-5 text-[10px] uppercase tracking-widest text-brand-gold-light/50">
                {node.label}
              </div>
              {node.items.map((it) => {
                if (it.children) {
                  const childActive = it.children.some((c) => c.id === view);
                  return (
                    <div key={it.id}>
                      <a
                        onClick={() => setContabOpen((o) => !o)}
                        className={`sidebar-link flex items-center gap-3 px-6 py-2.5 ${childActive ? 'active' : ''}`}
                      >
                        <NavIcon id={it.id} />
                        <span>{it.label}</span>
                        <span className="ml-auto text-xs">{contabOpen ? '▾' : '▸'}</span>
                      </a>
                      {contabOpen &&
                        it.children.map((c) => (
                          <Link
                            key={c.id}
                            id={c.id}
                            label={c.label}
                            depth={1}
                            iconOverride={
                              <span className="block w-4 text-center text-xs leading-none text-brand-gold-light/40">·</span>
                            }
                          />
                        ))}
                    </div>
                  );
                }
                return <Link key={it.id} id={it.id} label={it.label} />;
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer usuario */}
      <div
        className="space-y-2 px-6 py-4 text-xs text-brand-muted"
        style={{ borderTop: '1px solid #2A4061' }}
      >
        <div>
          Usuario: <span className="font-medium text-white">{currentUser.name}</span>
        </div>
        <div>
          Rol: <span className="capitalize text-brand-gold-light">{currentUser.role}</span>
        </div>
        <button
          onClick={() => {
            if (confirm('¿Restablecer los datos de demostración?')) resetDemo();
          }}
          className="mt-2 w-full rounded bg-white/5 px-3 py-1.5 text-[11px] text-brand-muted transition hover:bg-white/10"
        >
          ⟲ Reset Data Demo
        </button>
      </div>
    </aside>
  );
}
