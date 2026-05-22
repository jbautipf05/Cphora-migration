import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { movimientosPorCuenta, saldoPorNaturaleza, fmtCOP } from '../lib/accounting';
import { Panel, Badge, CLASS_LABELS, CLASS_COLORS } from '../components/ui';

// Indentación por nivel de cuenta (1=clase … 6=auxiliar).
const INDENT = { 1: 0, 2: 16, 4: 32, 6: 48 };

export default function PlanPUC() {
  const { pucAccounts, journalEntries, journalLines } = useApp();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);

  // Saldo final (acumulado) por cuenta auxiliar.
  const saldos = useMemo(() => {
    const mov = movimientosPorCuenta(journalLines, journalEntries, 'all');
    const out = {};
    for (const [code, m] of Object.entries(mov)) {
      out[code] = saldoPorNaturaleza(code, m.debe, m.haber);
    }
    return out;
  }, [journalLines, journalEntries]);

  // Saldo de cuentas padre = suma de sus auxiliares.
  const saldosConPadres = useMemo(() => {
    const out = { ...saldos };
    for (const acc of pucAccounts) {
      if (acc.level >= 6) continue;
      let total = 0;
      for (const leaf of pucAccounts) {
        if (leaf.level >= 6 && leaf.code.startsWith(acc.code) && saldos[leaf.code]) {
          total += saldos[leaf.code];
        }
      }
      out[acc.code] = total;
    }
    return out;
  }, [saldos, pucAccounts]);

  const term = query.trim().toLowerCase();

  // Cuando hay búsqueda, mostramos cuentas que matchean (planas, sin colapso).
  const filtered = useMemo(() => {
    let list = pucAccounts;
    if (term) {
      list = list.filter(
        (a) => a.code.includes(term) || a.name.toLowerCase().includes(term),
      );
    }
    if (onlyWithBalance) {
      list = list.filter((a) => Math.round(saldosConPadres[a.code] || 0) !== 0);
    }
    return list;
  }, [pucAccounts, term, onlyWithBalance, saldosConPadres]);

  // Visibilidad por colapso (solo cuando no hay búsqueda).
  const isVisible = (acc) => {
    if (term) return true;
    if (acc.level === 1) return true;
    // visible si ningún ancestro está colapsado
    let parent = acc.parentCode;
    while (parent) {
      if (collapsed.has(parent)) return false;
      parent = pucAccounts.find((a) => a.code === parent)?.parentCode || null;
    }
    return true;
  };

  const hasChildren = (code) => pucAccounts.some((a) => a.parentCode === code);

  const toggle = (code) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const visibleList = filtered.filter(isVisible);
  const totalAux = pucAccounts.filter((a) => a.level >= 6).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Catálogo jerárquico · {pucAccounts.length} cuentas ({totalAux} auxiliares), clases 1 a 7.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={onlyWithBalance}
              onChange={(e) => setOnlyWithBalance(e.target.checked)}
              className="accent-gold-accent"
            />
            Solo con saldo
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar código o nombre…"
            className="w-56 rounded-lg border border-white/10 bg-brand-bg/60 px-3 py-1.5 text-sm text-white outline-none focus:border-gold-accent/60"
          />
        </div>
      </div>

      {/* Leyenda de clases */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CLASS_LABELS).map(([cls, label]) => (
          <Badge key={cls} tone="muted">
            <span className="h-2 w-2 rounded-full" style={{ background: CLASS_COLORS[cls] }} />
            {cls} · {label}
          </Badge>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="-m-5">
          {visibleList.map((acc) => {
            const saldo = saldosConPadres[acc.code] || 0;
            const expandable = !term && hasChildren(acc.code);
            const isLeaf = acc.level >= 6;
            return (
              <div
                key={acc.code}
                className={`flex items-center gap-2 border-b border-white/5 px-4 py-2 transition hover:bg-white/5 ${
                  acc.level === 1 ? 'bg-brand-bg/40' : ''
                }`}
                style={{ paddingLeft: 16 + (INDENT[acc.level] || 0) }}
              >
                {expandable ? (
                  <button
                    onClick={() => toggle(acc.code)}
                    className="grid h-5 w-5 place-items-center rounded text-muted hover:text-white"
                  >
                    {collapsed.has(acc.code) ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="inline-block w-5 text-center">
                    {isLeaf && (
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: CLASS_COLORS[acc.classCode] }}
                      />
                    )}
                  </span>
                )}
                <span
                  className={`font-mono text-xs ${
                    acc.level <= 2 ? 'font-bold text-gold-accent' : 'text-gold-accent/70'
                  }`}
                >
                  {acc.code}
                </span>
                <span
                  className={`flex-1 truncate ${
                    acc.level === 1
                      ? 'text-sm font-bold uppercase tracking-wide text-white'
                      : acc.level === 2
                        ? 'text-sm font-semibold text-white/90'
                        : 'text-sm text-white/80'
                  }`}
                >
                  {acc.name}
                </span>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    Math.round(saldo) === 0 ? 'text-muted/50' : 'text-white'
                  }`}
                >
                  {fmtCOP(saldo)}
                </span>
              </div>
            );
          })}
          {visibleList.length === 0 && (
            <div className="px-4 py-10 text-center text-muted">Sin resultados.</div>
          )}
        </div>
      </Panel>
    </div>
  );
}
