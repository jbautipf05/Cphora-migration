import { navInfo } from '../nav';
import { IconSearch, IconBell, IconPlus } from './icons';

export default function Header({ view, search, setSearch }) {
  const info = navInfo(view);
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/5 bg-brand-bg/80 px-8 py-4 backdrop-blur">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted">
          {info.group ? (
            <>
              {info.group} <span className="text-muted/50">/</span>{' '}
              <span className="text-gold-accent/80">{info.label}</span>
            </>
          ) : (
            <span className="text-gold-accent/80">Castor · Cphora</span>
          )}
        </p>
        <h1 className="truncate text-xl font-bold text-white">
          {info.icon} {info.label}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden md:block">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-72 rounded-lg border border-white/10 bg-panel-bg/60 py-2 pl-9 pr-3 text-sm text-white placeholder-muted/60 outline-none transition focus:border-gold-accent/60"
          />
        </div>
        <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted transition hover:text-white">
          <IconBell width={18} height={18} />
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            3
          </span>
        </button>
        <button className="btn-gold">
          <IconPlus width={16} height={16} />
          Nuevo
        </button>
      </div>
    </header>
  );
}
