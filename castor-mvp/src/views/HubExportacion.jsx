import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Panel, Badge } from '../components/ui';
import { useToast } from '../components/Toast';
import { exportView } from '../lib/exportHelpers';
import PeriodFilter from '../components/PeriodFilter';

// C4 · Hub de exportación de reportes contables.
// Implementa CSV/JSON/XLSX (espejo de castor_accounting.js:4820-4915).
// FomPlus es el único exportador ERP soportado per spec v1.1 §7.15, pero el
// layout oficial está pendiente de confirmar con el proveedor — slot deshabilitado.

const VIEWS = [
  { id: 'journal_entries', title: 'Libro Diario', desc: 'Asientos contables con líneas, terceros y CC.' },
  { id: 'balance_prueba', title: 'Balance de Prueba', desc: 'Saldo inicial, movimientos y saldo final por cuenta.' },
  { id: 'cartera', title: 'Cartera (CxC)', desc: 'Facturas por cobrar con aging y saldo.' },
  { id: 'cxp', title: 'Cuentas por Pagar', desc: 'OCs por pagar con aging y saldo.' },
  { id: 'aux_iva', title: 'Auxiliar IVA', desc: 'Movimiento de IVA generado y descontable.' },
  { id: 'aux_retenciones', title: 'Auxiliar Retenciones', desc: 'Retenciones practicadas y recibidas (Fte/IVA/ICA).' },
];

const FORMATS = [
  { id: 'csv', label: 'CSV', tone: 'green' },
  { id: 'json', label: 'JSON', tone: 'blue' },
  { id: 'xlsx', label: 'Excel', tone: 'amber' },
];

export default function HubExportacion() {
  const app = useApp();
  const toast = useToast();
  const [period, setPeriod] = useState('all');

  // Conteo aprox. de filas por vista (para mostrar en el card).
  const counts = useMemo(() => {
    const filters = period && period !== 'all' ? { periodId: period } : {};
    const out = {};
    for (const v of VIEWS) {
      // estimación barata: usamos la longitud de la fuente principal
      if (v.id === 'journal_entries') out[v.id] = (app.journalLines || []).filter((l) => {
        if (!filters.periodId) return true;
        const je = (app.journalEntries || []).find((j) => j.id === l.journalId);
        return je && je.period === filters.periodId;
      }).length;
      else if (v.id === 'balance_prueba') out[v.id] = '~';
      else if (v.id === 'cartera') out[v.id] = (app.invoices || []).filter((i) => i.estado !== 'anulada').length;
      else if (v.id === 'cxp') out[v.id] = (app.purchaseOrders || []).filter((o) => o.estado !== 'cancelada').length;
      else if (v.id === 'aux_iva') out[v.id] = (app.journalLines || []).filter((l) => l.accountCode === '240805' || l.accountCode === '240810').length;
      else if (v.id === 'aux_retenciones') out[v.id] = (app.journalLines || []).filter((l) => /^(236540|236525|236515|236701|236801|135515|135517|135518)$/.test(l.accountCode)).length;
    }
    return out;
  }, [app.journalEntries, app.journalLines, app.invoices, app.purchaseOrders, period]);

  const onExport = (viewId, format) => {
    const filters = period && period !== 'all' ? { periodId: period } : {};
    try {
      const res = exportView(viewId, format, app, filters);
      toast(`Descargado ${viewId}.${format === 'xlsx' ? 'xls' : format} · ${res.rowCount} filas`, 'ok');
    } catch (e) {
      toast(`Error exportando ${viewId}: ${e.message}`, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-sm text-muted">
            Exportación de reportes contables a CSV, JSON o Excel (compat. es-CO). Filtra por periodo para
            limitar el alcance.{' '}
            <span className="font-semibold text-amber-300">Documento interno · No oficial DIAN.</span>
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {VIEWS.map((v) => (
          <Panel key={v.id} title={v.title} subtitle={v.desc}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">
                <span className="tabular-nums text-white/80">{counts[v.id]}</span>{' '}
                {typeof counts[v.id] === 'number' ? 'filas estimadas' : ''}
                {period !== 'all' && <span className="ml-1 text-brand-gold">· {period}</span>}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onExport(v.id, f.id)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/80 transition hover:border-gold-accent/40 hover:text-brand-gold"
                    title={`Descargar ${v.title} en ${f.label}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel
        title="FomPlus (pendiente)"
        subtitle="Exportador ERP único soportado según brief v1.1 §7.15"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs text-muted">
            El layout oficial de FomPlus está pendiente de confirmar con el proveedor antes de implementar el
            formato definitivo. Una vez se reciba la especificación, este slot generará el archivo con los
            headers y delimitador requeridos por FomPlus.
          </p>
          <Badge tone="amber">Pendiente layout</Badge>
        </div>
      </Panel>

      <p className="text-xs text-muted">
        El formato CSV usa BOM UTF-8 y separador <code className="text-brand-gold">,</code>. Excel usa BOM
        UTF-8 + separador <code className="text-brand-gold">;</code> (extensión <code>.xls</code>, abre en
        Excel-CO sin pasos extra).
      </p>
    </div>
  );
}
