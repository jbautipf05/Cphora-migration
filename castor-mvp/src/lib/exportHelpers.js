// ─────────────────────────────────────────────────────────────────────────────
// exportHelpers.js — Helpers para C4 (hub de exportación).
//
// Formatos:
//   - csv  : BOM UTF-8 + separador `,` (delimitador estándar).
//   - xlsx : BOM UTF-8 + separador `;` (compat. Excel-CO; el archivo se baja
//            como .xls — Excel lo abre como hoja).
//   - json : array de objetos (header como keys), pretty-printed.
//
// Vistas (`buildExportRows(view, state)`):
//   journal_entries, balance_prueba, cartera, cxp, aux_iva, aux_retenciones.
//
// Portado de castor_accounting.js:4820-4915 (formato + _viewToRows). Las
// vistas reutilizan accounting.js (buildBalancePrueba) cuando aplica.
// ─────────────────────────────────────────────────────────────────────────────

import { PUC_BY_CODE } from '../data/pucCatalog';
import { buildBalancePrueba } from './accounting';
import { today } from './format';
import { yyyymm } from './accountingEngine';

// ── Format helpers ──────────────────────────────────────────────────────────
export function fmtNumberCOP(n) {
  const x = +n || 0;
  return x.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[,;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function rowsToCsv(rows, sep = ',') {
  return rows.map((r) => r.map(csvEscape).join(sep)).join('\r\n');
}

export function rowsToJson(rows) {
  if (!rows.length) return '[]';
  const [headers, ...body] = rows;
  const obj = body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
  return JSON.stringify(obj, null, 2);
}

// Descarga un texto como archivo. BOM UTF-8 para formatos CSV/XLSX (Excel-CO).
export function downloadText(filename, content, { withBOM = false, mime = 'text/plain' } = {}) {
  const bom = withBOM ? '﻿' : '';
  const blob = new Blob([bom + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// ── Aging helper (mismo cálculo que Cartera/CxP) ───────────────────────────
function agingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'corriente';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '>90';
}

function daysBetween(from, to) {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ── Builder principal ──────────────────────────────────────────────────────
// Devuelve { headers: string[], rows: string[][] } (header NO incluido en rows;
// para CSV/JSON se inyecta arriba en el dispatcher). Las celdas son strings ya
// formateadas (números con locale es-CO).
export function buildExportRows(view, state, filters = {}) {
  const periodId = filters.periodId || null; // null = todos
  const inPeriod = (date) => !periodId || yyyymm(date) === periodId;
  const t = today();

  switch (view) {
    case 'journal_entries': {
      const headers = ['JE', 'Fecha', 'Periodo', 'Origen', 'Documento', 'Línea', 'Cuenta', 'Cuenta nombre', 'Tercero', 'Centro costo', 'Débito', 'Crédito', 'Descripción', 'Estado'];
      const jes = state.journalEntries || [];
      const lines = (state.journalLines || []).slice().sort((a, b) =>
        (a.journalId || '').localeCompare(b.journalId || '') ||
        (a.lineNumber || 0) - (b.lineNumber || 0),
      );
      const rows = [];
      for (const l of lines) {
        const je = jes.find((j) => j.id === l.journalId);
        if (!je) continue;
        if (periodId && je.period !== periodId) continue;
        const acc = PUC_BY_CODE[l.accountCode];
        rows.push([
          je.id,
          je.date,
          je.period,
          je.source,
          je.sourceId,
          l.lineNumber,
          l.accountCode,
          acc ? acc.name : '',
          l.thirdParty || '',
          l.costCenter || '',
          fmtNumberCOP(l.debit),
          fmtNumberCOP(l.credit),
          l.description || '',
          je.status,
        ]);
      }
      return { headers, rows };
    }

    case 'balance_prueba': {
      const headers = ['Cuenta', 'Nombre', 'Clase', 'Saldo inicial', 'Débito periodo', 'Crédito periodo', 'Saldo final'];
      const bp = buildBalancePrueba(state.journalLines || [], state.journalEntries || [], periodId || 'all');
      const rows = bp.rows.map((r) => [
        r.code,
        r.name,
        r.classCode,
        fmtNumberCOP(r.saldoInicial),
        fmtNumberCOP(r.debe),
        fmtNumberCOP(r.haber),
        fmtNumberCOP(r.saldoFinal),
      ]);
      return { headers, rows };
    }

    case 'cartera': {
      const headers = ['Factura', 'Fecha', 'Vence', 'Cliente', 'Total', 'Pagado', 'Saldo', 'Días vencido', 'Tramo'];
      const invoices = (state.invoices || []).filter((i) => i.estado !== 'anulada');
      const payments = state.payments || [];
      const rows = [];
      for (const inv of invoices) {
        const orderId = inv.orderId || inv.pedidoId;
        const paid = payments
          .filter((p) => (p.invoiceId === inv.id || (orderId && p.orderId === orderId)) && p.estado === 'confirmado')
          .reduce((s, p) => s + (p.amount || 0), 0);
        const total = inv.amount || inv.total || 0;
        const saldo = total - paid;
        if (saldo <= 0) continue;
        const due = inv.dueDate || inv.emitDate || inv.date || t;
        const d = daysBetween(due, t);
        rows.push([
          inv.id,
          inv.emitDate || inv.date || '',
          due,
          inv.clientName || '',
          fmtNumberCOP(total),
          fmtNumberCOP(paid),
          fmtNumberCOP(saldo),
          d,
          agingBucket(d),
        ]);
      }
      return { headers, rows };
    }

    case 'cxp': {
      const headers = ['OC', 'Fecha', 'Vence', 'Proveedor', 'Total', 'Pagado', 'Saldo', 'Días vencido', 'Tramo'];
      const ocs = state.purchaseOrders || [];
      const outs = state.outgoingPayments || [];
      const rows = [];
      for (const oc of ocs) {
        if (oc.estado === 'cancelada') continue;
        const total = (oc.items || []).reduce((s, it) => s + (it.qty || 0) * (it.cost || it.unitCost || 0), 0) || oc.total || 0;
        const paid = outs
          .filter((p) => p.ocId === oc.id && p.estado === 'confirmado')
          .reduce((s, p) => s + (p.amount || 0), 0);
        const saldo = total - paid;
        if (saldo <= 0) continue;
        const due = oc.expectedDate || oc.date || t;
        const d = daysBetween(due, t);
        rows.push([
          oc.id,
          oc.date || '',
          due,
          oc.supplierName || '',
          fmtNumberCOP(total),
          fmtNumberCOP(paid),
          fmtNumberCOP(saldo),
          d,
          agingBucket(d),
        ]);
      }
      return { headers, rows };
    }

    case 'aux_iva': {
      const headers = ['JE', 'Fecha', 'Periodo', 'Origen', 'Documento', 'Cuenta', 'Tercero', 'Débito', 'Crédito', 'Tipo'];
      const jes = state.journalEntries || [];
      const rows = [];
      for (const l of state.journalLines || []) {
        if (l.accountCode !== '240805' && l.accountCode !== '240810') continue;
        const je = jes.find((j) => j.id === l.journalId);
        if (!je || !inPeriod(je.date)) continue;
        rows.push([
          je.id,
          je.date,
          je.period,
          je.source,
          je.sourceId,
          l.accountCode,
          l.thirdParty || '',
          fmtNumberCOP(l.debit),
          fmtNumberCOP(l.credit),
          l.accountCode === '240805' ? 'IVA generado' : 'IVA descontable',
        ]);
      }
      return { headers, rows };
    }

    case 'aux_retenciones': {
      const headers = ['JE', 'Fecha', 'Periodo', 'Origen', 'Documento', 'Cuenta', 'Tercero', 'Débito', 'Crédito', 'Tipo'];
      const reteCodes = {
        '236540': 'RteFte compras (practicada)',
        '236525': 'RteFte servicios (practicada)',
        '236515': 'RteFte honorarios (practicada)',
        '236701': 'ReteIVA (practicada)',
        '236801': 'ReteICA (practicada)',
        '135515': 'RteFte (recibida)',
        '135517': 'ReteIVA (recibida)',
        '135518': 'ReteICA (recibida)',
      };
      const jes = state.journalEntries || [];
      const rows = [];
      for (const l of state.journalLines || []) {
        if (!(l.accountCode in reteCodes)) continue;
        const je = jes.find((j) => j.id === l.journalId);
        if (!je || !inPeriod(je.date)) continue;
        rows.push([
          je.id,
          je.date,
          je.period,
          je.source,
          je.sourceId,
          l.accountCode,
          l.thirdParty || '',
          fmtNumberCOP(l.debit),
          fmtNumberCOP(l.credit),
          reteCodes[l.accountCode],
        ]);
      }
      return { headers, rows };
    }

    default:
      return { headers: ['Vista no soportada'], rows: [[view]] };
  }
}

// ── Dispatcher de exportación ─────────────────────────────────────────────
// formats: 'csv' | 'json' | 'xlsx'
export function exportView(view, format, state, filters = {}) {
  const { headers, rows } = buildExportRows(view, state, filters);
  const tag = filters.periodId ? `_${filters.periodId}` : '';
  const baseName = `${view}${tag}_${today()}`;

  if (format === 'json') {
    const content = rowsToJson([headers, ...rows]);
    downloadText(`${baseName}.json`, content, { mime: 'application/json' });
    return { ok: true, rowCount: rows.length };
  }
  if (format === 'xlsx') {
    // CSV con BOM y separador `;` — Excel-CO lo abre directo. Extensión .xls
    // para que Windows lo asocie con Excel. NO es xlsx binario real (eso
    // requeriría una lib pesada como sheetjs; queda pendiente para Supabase).
    const content = rowsToCsv([headers, ...rows], ';');
    downloadText(`${baseName}.xls`, content, { withBOM: true, mime: 'application/vnd.ms-excel' });
    return { ok: true, rowCount: rows.length };
  }
  // csv por defecto
  const content = rowsToCsv([headers, ...rows], ',');
  downloadText(`${baseName}.csv`, content, { withBOM: true, mime: 'text/csv' });
  return { ok: true, rowCount: rows.length };
}
