import { useApp } from '../store/AppContext';
import {
  IconDashboard,
  IconBook,
  IconScale,
  IconLayers,
  IconSettings,
} from './icons';

export const ACCOUNTING_VIEWS = [
  { id: 'dashboard', label: 'Dashboard Contable', icon: IconDashboard },
  { id: 'libro-diario', label: 'Libro Diario', icon: IconBook },
  { id: 'balance-prueba', label: 'Balance de Prueba', icon: IconScale },
  { id: 'plan-puc', label: 'Plan PUC', icon: IconLayers },
  { id: 'config-nomina', label: 'Nómina y Perfil Tributario', icon: IconSettings },
];

export default function Sidebar({ view, setView }) {
  const { currentUser, resetDemo } = useApp();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-[#0c1c33]">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-accent font-extrabold text-brand-bg shadow-lg">
          C
        </div>
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-wide text-white">CASTOR</p>
          <p className="text-[11px] font-medium text-gold-accent/80">Cphora · Contabilidad</p>
        </div>
      </div>

      {/* Sección de módulo */}
      <div className="px-5 pb-2 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted/70">
          Módulo Contabilidad
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {ACCOUNTING_VIEWS.map((v) => {
          const Icon = v.icon;
          const active = v.id === view;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                active
                  ? 'bg-gold-accent/15 text-white shadow-[inset_2px_0_0_0_#C9A961]'
                  : 'text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon
                width={18}
                height={18}
                className={active ? 'text-gold-accent' : 'text-muted group-hover:text-white'}
              />
              <span>{v.label}</span>
            </button>
          );
        })}
      </nav>

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
        </div>
        <button
          onClick={() => {
            if (confirm('¿Restablecer los datos de demostración a su estado inicial?')) resetDemo();
          }}
          className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-muted transition hover:border-red-500/40 hover:text-red-300"
        >
          Reset Data Demo
        </button>
      </div>
    </aside>
  );
}
