import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { fmtDateTime } from '../lib/format';
import { IconBell } from './icons';

const TYPE_DOT = {
  info: 'bg-sky-400',
  warning: 'bg-amber-400',
  warn: 'bg-amber-400',
  error: 'bg-red-500',
  ok: 'bg-emerald-400',
};

// Campana + dropdown de notificaciones (espejo de renderNotifBadge/Dropdown).
export default function Notifications({ onNavigate }) {
  const { notifications, markAllNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-brand-border text-brand-gold-light transition hover:border-brand-gold"
      >
        <IconBell width={18} height={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-brand-border bg-brand-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-brand-border px-3 py-2">
            <div className="text-sm font-semibold gold-title">Notificaciones</div>
            <button
              onClick={markAllNotificationsRead}
              className="text-[11px] text-brand-gold hover:underline"
            >
              Marcar leídas
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-brand-muted">Sin notificaciones.</p>
            )}
            {notifications.slice(0, 12).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (n.link && onNavigate) onNavigate(n.link);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2.5 border-b border-brand-border/60 px-3 py-2.5 text-left transition hover:bg-white/5 ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[n.type] || TYPE_DOT.info}`} />
                <span className="min-w-0">
                  <span className="block text-xs text-white">{n.text}</span>
                  <span className="block text-[10px] text-brand-muted">{fmtDateTime(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
