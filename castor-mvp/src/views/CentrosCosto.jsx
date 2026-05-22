import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel } from '../components/ui';
import { Field, Input } from '../components/form';
import { useToast } from '../components/Toast';
import { IconPlus, IconTrash } from '../components/icons';

// Centros de costo — CRUD básico.
// Espejo de renderConfigCC() del castor_accounting.js (líneas 3283-3431).
export default function CentrosCosto() {
  const { costCenters, journalLines, setCollection } = useApp();
  const toast = useToast();
  const [nuevo, setNuevo] = useState({ id: '', name: '' });

  // Conteo de uso por CC para mostrar referencias y bloquear borrado.
  const usoPorCC = useMemo(() => {
    const map = {};
    for (const l of journalLines) {
      if (l.costCenter) map[l.costCenter] = (map[l.costCenter] || 0) + 1;
    }
    return map;
  }, [journalLines]);

  const handleAdd = () => {
    const code = nuevo.id.trim().toUpperCase();
    const name = nuevo.name.trim();
    if (!code) return toast('Código requerido', 'warn');
    if (!name) return toast('Nombre requerido', 'warn');
    if (costCenters.some((c) => c.id === code))
      return toast(`Ya existe el centro ${code}`, 'error');
    setCollection('costCenters', [...costCenters, { id: code, name }]);
    setNuevo({ id: '', name: '' });
    toast(`Centro ${code} creado`, 'ok');
  };

  const handleRename = (id, newName) => {
    setCollection(
      'costCenters',
      costCenters.map((c) => (c.id === id ? { ...c, name: newName } : c)),
    );
  };

  const handleDelete = (id) => {
    if (usoPorCC[id])
      return toast(`No se puede eliminar: ${usoPorCC[id]} líneas lo usan`, 'error');
    if (!confirm(`¿Eliminar centro de costo ${id}?`)) return;
    setCollection(
      'costCenters',
      costCenters.filter((c) => c.id !== id),
    );
    toast(`Centro ${id} eliminado`, 'ok');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Centros de costo · usados para clasificar líneas de asiento y reportes por área.
      </p>

      <Panel title="Nuevo centro de costo">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr_auto]">
          <Field label="Código">
            <Input
              value={nuevo.id}
              onChange={(e) => setNuevo((n) => ({ ...n, id: e.target.value }))}
              placeholder="Ej: CEDI"
            />
          </Field>
          <Field label="Nombre">
            <Input
              value={nuevo.name}
              onChange={(e) => setNuevo((n) => ({ ...n, name: e.target.value }))}
              placeholder="Ej: Centro de distribución"
            />
          </Field>
          <div className="flex items-end">
            <button onClick={handleAdd} className="btn-gold inline-flex items-center gap-2">
              <IconPlus width={14} height={14} /> Crear
            </button>
          </div>
        </div>
      </Panel>

      <Panel title={`Centros de costo (${costCenters.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2">Código</th>
                <th className="py-2 pr-2">Nombre</th>
                <th className="py-2 pr-2 text-right">Líneas que lo usan</th>
                <th className="py-2 pr-2" />
              </tr>
            </thead>
            <tbody>
              {costCenters.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="py-2 pr-2 font-mono text-xs text-gold-accent">{c.id}</td>
                  <td className="py-2 pr-2">
                    <input
                      defaultValue={c.name}
                      onBlur={(e) =>
                        e.target.value !== c.name && handleRename(c.id, e.target.value)
                      }
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-white transition focus:border-white/20 focus:bg-brand-bg/40"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right font-mono tabular-nums text-muted">
                    {usoPorCC[c.id] || 0}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={!!usoPorCC[c.id]}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-muted transition hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                      title={usoPorCC[c.id] ? 'En uso · no se puede borrar' : 'Eliminar'}
                    >
                      <IconTrash width={12} height={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {costCenters.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">
                    Sin centros de costo. Crea el primero arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
