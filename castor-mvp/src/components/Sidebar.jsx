import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { NAV, CONTAB_IDS } from '../nav';

function NavButton({ active, onClick, icon, label, depth = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 rounded-lg py-2 pr-3 text-left text-sm transition ${
        active
          ? 'bg-gold-accent/15 text-white shadow-[inset_2px_0_0_0_#C9A961]'
          : 'text-muted hover:bg-white/5 hover:text-white'
      }`}
      style={{ paddingLeft: 12 + depth * 16 }}
    >
      <span className="w-5 text-center text-base leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function Sidebar({ view, setView }) {
  const { currentUser, resetDemo } = useApp();
  const [contabOpen, setContabOpen] = useState(CONTAB_IDS.includes(view));
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-[#0c1c33]">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-accent font-extrabold text-brand-bg shadow-lg">
          C
        </div>
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-wide text-white">CASTOR</p>
          <p className="text-[11px] font-medium text-gold-accent/80">Cphora · ERP</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((node, i) => {
          if (node.type === 'item') {
            return (
              <NavButton
                key={node.id}
                active={view === node.id}
                onClick={() => setView(node.id)}
                icon={node.icon}
                label={node.label}
              />
            );
          }
          return (
            <div key={node.label} className={i > 0 ? 'pt-3' : ''}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
                {node.label}
              </p>
              {node.items.map((it) => {
                if (it.children) {
                  const childActive = it.children.some((c) => c.id === view);
                  return (
                    <div key={it.id}>
                      <button
                        onClick={() => setContabOpen((o) => !o)}
                        className={`group flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-2 text-left text-sm transition ${
                          childActive
                            ? 'text-white'
                            : 'text-muted hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="w-5 text-center text-base leading-none">{it.icon}</span>
                        <span className="font-medium">{it.label}</span>
                        <span className="ml-auto text-xs text-muted">{contabOpen ? '▾' : '▸'}</span>
                      </button>
                      {contabOpen && (
                        <div className="mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                          {it.children.map((c) => (
                            <NavButton
                              key={c.id}
                              active={view === c.id}
                              onClick={() => setView(c.id)}
                              icon="·"
                              label={c.label}
                              depth={0.5}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <NavButton
                    key={it.id}
                    active={view === it.id}
                    onClick={() => setView(it.id)}
                    icon={it.icon}
                    label={it.label}
                  />
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Agregar rápido */}
      <div className="relative border-t border-white/5 p-3">
        {quickOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-xl border border-white/10 bg-panel-bg shadow-2xl">
            {[
              ['leads', '👥 Nuevo lead'],
              ['cotizaciones', '💬 Nueva cotización'],
              ['ventas', '🛍️ Nuevo pedido'],
              ['dashboard', '💰 Nuevo asiento'],
            ].map(([id, label]) => (
              <button
                key={label}
                onClick={() => {
                  setView(id);
                  setQuickOpen(false);
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-muted transition hover:bg-white/5 hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setQuickOpen((o) => !o)} className="btn-gold w-full">
          ➕ Agregar rápido
        </button>
      </div>

      {/* Footer usuario */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-panel-bg text-sm font-semibold text-gold-accent">
            {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{currentUser.name}</p>
            <p className="text-[11px] capitalize text-muted">{currentUser.role}</p>
          </div>
          <button
            onClick={() => {
              if (confirm('¿Restablecer los datos de demostración?')) resetDemo();
            }}
            className="ml-auto rounded-lg border border-white/10 px-2 py-1 text-[10px] text-muted transition hover:border-red-500/40 hover:text-red-300"
          >
            Reset
          </button>
        </div>
      </div>
    </aside>
  );
}
