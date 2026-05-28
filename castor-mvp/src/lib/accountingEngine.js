// ─────────────────────────────────────────────────────────────────────────────
// accountingEngine.js — Motor contable + hooks de dominio (versión React).
// Portado y compactado desde `castor_accounting.js` (~líneas 590-1100). A
// diferencia del original, todas las funciones son puras: NO usan `window`,
// NO mutan estado externo y NO hacen render. Reciben el slice mínimo necesario
// y devuelven `{ ok, journalEntry, lines }` o `{ error, message }`.
//
// Convenciones (espejo del seed React):
//   journalEntry  = { id, date, period, source, sourceId, concept, status, totalDebit, totalCredit, createdAt }
//   journalLine   = { id, journalId, accountCode, debit, credit, thirdParty?, costCenter? }
//
// Para integrarlo, el caller (AppContext) hace algo como:
//   const res = postJournalEntry({...payload}, { pucAccounts, journalEntries, fiscalPeriods, counters });
//   if (res.ok) dispatch({ type: 'APPEND_JE', je: res.journalEntry, lines: res.lines, counters: res.counters });
// ─────────────────────────────────────────────────────────────────────────────

import { PUC_BY_CODE } from '../data/pucCatalog';
import { nowISO, today } from './format';
import { movimientosPorCuenta } from './accounting';

// ── utils ────────────────────────────────────────────────────────────────────
const round = (n) => Math.round((+n || 0) * 100) / 100;
const eqMoney = (a, b, tol = 0.5) => Math.abs((+a || 0) - (+b || 0)) <= tol;

export function yyyymm(dateStr) {
  if (!dateStr) return '';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : '';
}

function findAccount(code, pucAccounts) {
  // Permite buscar primero en pucAccounts del state, fallback al catálogo importado.
  if (pucAccounts && pucAccounts.length) {
    return pucAccounts.find((a) => a.code === code) || PUC_BY_CODE[code] || null;
  }
  return PUC_BY_CODE[code] || null;
}

function findPeriod(date, fiscalPeriods) {
  const id = yyyymm(date);
  return (fiscalPeriods || []).find((p) => p.id === id) || null;
}

// ── postJournalEntry ────────────────────────────────────────────────────────
// payload: { date, source, sourceId, concept|description, lines, force?, status? }
// ctx:     { pucAccounts?, journalEntries, fiscalPeriods?, counters }
// Retorna: { ok, journalEntry, lines, counters } | { error, message } | { warning, journalId }
export function postJournalEntry(payload, ctx) {
  if (!payload) return { error: 'no_payload', message: 'Falta el payload' };
  const { date, source, sourceId } = payload;
  const concept = payload.concept || payload.description || '';
  const lines = Array.isArray(payload.lines) ? payload.lines : [];

  if (!date) return { error: 'missing_date', message: 'Falta la fecha del asiento' };
  if (!source) return { error: 'missing_source', message: 'Falta el origen del asiento' };
  if (!sourceId) return { error: 'missing_sourceId', message: 'Falta el ID de origen' };
  if (lines.length < 2)
    return { error: 'too_few_lines', message: 'Se requieren al menos 2 líneas' };

  const { pucAccounts, journalEntries = [], fiscalPeriods = [], counters = {} } = ctx || {};

  // Idempotencia: ya existe asiento posted con ese source/sourceId?
  const dup = journalEntries.find(
    (j) => j.source === source && j.sourceId === sourceId && j.status === 'posted',
  );
  if (dup) return { warning: 'already_posted', journalId: dup.id };

  // Validar partida doble
  let totDebit = 0;
  let totCredit = 0;
  for (const ln of lines) {
    totDebit += +ln.debit || 0;
    totCredit += +ln.credit || 0;
  }
  if (!eqMoney(totDebit, totCredit)) {
    return {
      error: 'unbalanced',
      message: `DB ${totDebit.toFixed(0)} ≠ CR ${totCredit.toFixed(0)}`,
    };
  }
  if (totDebit <= 0) return { error: 'zero_total', message: 'Totales en cero' };

  // Validar cada línea
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln.accountCode)
      return { error: 'line_missing_account', message: `Línea ${i + 1} sin cuenta` };
    const acc = findAccount(ln.accountCode, pucAccounts);
    if (!acc) return { error: 'unknown_account', message: `Cuenta ${ln.accountCode} no existe` };
    if (acc.type && acc.type !== 'auxiliar')
      return {
        error: 'titulo_account',
        message: `Cuenta ${ln.accountCode} es título; no admite movimiento`,
      };
    if (acc.active === false)
      return { error: 'inactive_account', message: `Cuenta ${ln.accountCode} inactiva` };
    const d = +ln.debit || 0;
    const c = +ln.credit || 0;
    if (d > 0 && c > 0)
      return {
        error: 'line_both_sides',
        message: `Línea ${i + 1} no puede tener débito y crédito a la vez`,
      };
    if (d <= 0 && c <= 0)
      return { error: 'line_zero', message: `Línea ${i + 1} con valor 0` };
    if (acc.requiresThirdParty && !ln.thirdParty) {
      return {
        error: 'missing_third_party',
        message: `Cuenta ${ln.accountCode} requiere tercero (línea ${i + 1})`,
      };
    }
  }

  // Validar periodo
  const period = findPeriod(date, fiscalPeriods);
  const periodStatus = period?.estado || period?.status;
  if (period && periodStatus === 'cerrado' && !payload.force) {
    return { error: 'closed_period', message: `Periodo ${period.id} cerrado` };
  }
  const periodId = period ? period.id : yyyymm(date);

  // Asignar JE-ID
  const nextJe = (counters.je || 0) + 1;
  const jeId = 'JE-' + String(nextJe).padStart(6, '0');

  const journalEntry = {
    id: jeId,
    date,
    period: periodId,
    source,
    sourceId,
    concept,
    status: payload.status || 'posted',
    totalDebit: round(totDebit),
    totalCredit: round(totCredit),
    createdAt: nowISO(),
  };

  const journalLines = lines.map((ln, idx) => ({
    id: `${jeId}-L${idx + 1}`,
    journalId: jeId,
    lineNumber: idx + 1,
    accountCode: ln.accountCode,
    debit: round(ln.debit || 0),
    credit: round(ln.credit || 0),
    thirdParty: ln.thirdParty || null,
    costCenter: ln.costCenter || payload.costCenter || null,
    description: ln.description || concept || '',
  }));

  return {
    ok: true,
    journalEntry,
    lines: journalLines,
    counters: { ...counters, je: nextJe },
  };
}

// ── postManualEntry ─────────────────────────────────────────────────────────
// Wrapper para asientos manuales (mismo formato, source='manual').
export function postManualEntry(payload, ctx) {
  return postJournalEntry(
    {
      ...payload,
      source: 'manual',
      sourceId: payload.sourceId || `MAN-${Date.now().toString(36)}`,
    },
    ctx,
  );
}

// ── reverseJournalEntry ─────────────────────────────────────────────────────
// Crea un asiento espejo (intercambia debe/haber) y marca el original como reversed.
export function reverseJournalEntry(jeId, reason, ctx) {
  const { journalEntries = [], journalLines = [] } = ctx || {};
  const je = journalEntries.find((j) => j.id === jeId);
  if (!je) return { error: 'not_found' };
  if (je.status === 'reversed') return { error: 'already_reversed' };

  const lines = journalLines.filter((l) => l.journalId === jeId);
  const mirror = lines.map((l) => ({
    accountCode: l.accountCode,
    debit: l.credit,
    credit: l.debit,
    thirdParty: l.thirdParty,
    costCenter: l.costCenter,
    description: `Reverso: ${l.description || ''}`,
  }));

  const res = postJournalEntry(
    {
      date: today(),
      source: 'reversal',
      sourceId: jeId + ':REV',
      concept: `Reverso de ${jeId}${reason ? ' · ' + reason : ''}`,
      lines: mirror,
      force: true,
    },
    ctx,
  );

  if (!res.ok) return res;
  return {
    ok: true,
    journalEntry: res.journalEntry,
    lines: res.lines,
    counters: res.counters,
    reversedOriginalId: jeId,
  };
}

// ── postSale (versión simplificada) ─────────────────────────────────────────
// invoice: { id, date, type:'factura'|'remisión', customerId, customerName, base, iva, total, costoVenta? }
// Genera un asiento estándar: CxR DR / Ingresos CR / IVA CR  + (opcional) Costo DR / Inventario CR.
export function postSale(invoice, ctx) {
  if (!invoice || !invoice.id || !invoice.total)
    return { error: 'invalid_invoice', message: 'Factura incompleta' };

  const isRemision = invoice.type === 'remisión' || invoice.type === 'remision';
  const ivaRate = isRemision ? 0 : 0.19;
  const base = invoice.base ?? invoice.total / (1 + ivaRate);
  const iva = invoice.iva ?? invoice.total - base;
  const total = invoice.total;
  // 412035 ("Industria de muebles") existe en el catálogo PUC React curado;
  // 413505 (del monolito) no está. Si no se ajusta el catálogo, todo postSale
  // sin `cuentaIngreso` explícito fallaba con unknown_account. Detectado por
  // el centro de pruebas C4. Mismo patrón que los fixes 510550→539595 (C2c).
  const cuentaIngreso = invoice.cuentaIngreso || '412035';
  const cuentaIVA = '240805';
  const cuentaCxR = '130505';

  const lines = [
    {
      accountCode: cuentaCxR,
      debit: total,
      credit: 0,
      thirdParty: invoice.customerId || invoice.customerName,
    },
    { accountCode: cuentaIngreso, debit: 0, credit: round(base) },
  ];
  if (iva > 0) lines.push({ accountCode: cuentaIVA, debit: 0, credit: round(iva) });

  return postJournalEntry(
    {
      date: invoice.date || today(),
      source: 'sale',
      sourceId: invoice.id,
      concept: `${isRemision ? 'Remisión' : 'Factura'} ${invoice.id}`,
      lines,
    },
    ctx,
  );
}

// ── postCustomerCollection ──────────────────────────────────────────────────
// payment: { id, date, customerId, bankAccountId|bankPucCode, amount, invoiceId? }
export function postCustomerCollection(payment, ctx) {
  if (!payment || !payment.amount)
    return { error: 'invalid_payment', message: 'Pago incompleto' };
  const bankPuc = payment.bankPucCode || resolveBankPuc(payment.bankAccountId, ctx);
  if (!bankPuc) return { error: 'missing_bank', message: 'Cuenta bancaria no resuelta' };

  return postJournalEntry(
    {
      date: payment.date || today(),
      source: 'payment_in',
      sourceId: payment.id,
      concept: `Cobro ${payment.id}${payment.invoiceId ? ' · ' + payment.invoiceId : ''}`,
      lines: [
        { accountCode: bankPuc, debit: payment.amount, credit: 0 },
        {
          accountCode: '130505',
          debit: 0,
          credit: payment.amount,
          thirdParty: payment.customerId,
        },
      ],
    },
    ctx,
  );
}

function resolveBankPuc(bankId, ctx) {
  const b = (ctx?.bankAccounts || []).find((x) => x.id === bankId);
  return b?.pucCode || null;
}

// ── postSupplyPurchase ──────────────────────────────────────────────────────
// Recibe `receipt = { id, date, supplierId, supplierName, items:[{qty,cost}]|amount, ivaRate? }`.
// Genera: Inventario MP DR / IVA descontable DR (si aplica) / Retenciones CR / CxP CR.
// Versión simplificada del original: usa cuentas 140505 (MP), 240810 (IVA desc),
// 236540 (Rete compras), 220505 (CxP nacionales).
export function postSupplyPurchase(receipt, ctx) {
  if (!receipt) return { error: 'no_receipt' };
  const items = Array.isArray(receipt.items)
    ? receipt.items
    : Array.isArray(receipt.detalle)
      ? receipt.detalle
      : [];
  let base = 0;
  for (const it of items) {
    const q = +it.qty || +it.cantidad || 0;
    const c = +it.cost || +it.unitCost || +it.unitPrice || 0;
    base += q * c;
  }
  if (!base && receipt.amount) base = +receipt.amount || 0;
  if (base <= 0) return { error: 'no_base', message: 'Base imponible cero' };

  const ivaRate = receipt.ivaRate ?? 0.19;
  const reteRate = receipt.reteRate ?? 0.025; // Rete-fte compras 2.5% por defecto
  const iva = round(base * ivaRate);
  const reteFte = round(base * reteRate);
  const totalNeto = round(base + iva - reteFte);

  const thirdParty = receipt.supplierId || receipt.supplierName || null;
  const supplierLabel = receipt.supplierName || receipt.supplierId || 'Proveedor';

  const lines = [
    {
      accountCode: '140505',
      debit: round(base),
      credit: 0,
      description: `MP ${receipt.id || ''}`,
    },
  ];
  if (iva > 0) {
    lines.push({
      accountCode: '240810',
      debit: iva,
      credit: 0,
      description: `IVA descontable ${receipt.id || ''}`,
    });
  }
  if (reteFte > 0) {
    lines.push({
      accountCode: '236540',
      debit: 0,
      credit: reteFte,
      thirdParty,
      description: 'Retención compras',
    });
  }
  lines.push({
    accountCode: '220505',
    debit: 0,
    credit: totalNeto,
    thirdParty,
    description: `CxP ${supplierLabel}`,
  });

  return postJournalEntry(
    {
      date: receipt.date || today(),
      source: 'purchase',
      sourceId: receipt.id,
      concept: `Compra MP · ${supplierLabel}`,
      lines,
    },
    ctx,
  );
}

// ── postSupplierPayment ─────────────────────────────────────────────────────
// outgoing: { id, date, beneficiario, beneficiarioId, bankAccountId|bankPucCode, amount, purchaseOrderId? }
export function postSupplierPayment(outgoing, ctx) {
  if (!outgoing || !outgoing.amount)
    return { error: 'invalid_payment', message: 'Pago incompleto' };
  const amount = +outgoing.amount;
  const bankPuc = outgoing.bankPucCode || resolveBankPuc(outgoing.bankAccountId, ctx);
  if (!bankPuc) return { error: 'missing_bank', message: 'Cuenta bancaria no resuelta' };

  // Si está ligado a OC descarga CxP; si no, gasto diverso (fallback). 539595 existe en
  // el catálogo React (510550 no). El mapeo fino por tipo de pago queda para "Mapeos
  // operación→cuenta" en Contabilidad.
  const debitAccount = outgoing.purchaseOrderId ? '220505' : '539595';
  const thirdParty = outgoing.beneficiarioId || outgoing.beneficiario || null;

  return postJournalEntry(
    {
      date: outgoing.date || today(),
      source: 'payment_out',
      sourceId: outgoing.id,
      concept: `Pago a ${outgoing.beneficiario || 'tercero'}`,
      lines: [
        {
          accountCode: debitAccount,
          debit: amount,
          credit: 0,
          thirdParty,
          description: `Pago ${outgoing.id || ''}`,
        },
        { accountCode: bankPuc, debit: 0, credit: amount, description: 'Egreso banco' },
      ],
    },
    ctx,
  );
}

// ── postPayroll ─────────────────────────────────────────────────────────────
// run: { id, periodId, total, totalNeto, totalAportes, totalProvisiones }
// Genera asiento simplificado: Gasto nómina DR / Pasivo a pagar CR (neto + retenciones).
// Versión muy reducida del runPayroll/postPayroll del original (líneas 1629-1842).
export function postPayroll(run, ctx) {
  if (!run || !run.id) return { error: 'invalid_run', message: 'Run de nómina inválido' };
  const totalSalarios = round(run.totalSalarios || run.total || 0);
  const totalNeto = round(run.totalNeto || totalSalarios);
  const totalAportes = round(run.totalAportes || 0);
  const totalProvisiones = round(run.totalProvisiones || 0);
  if (totalSalarios <= 0)
    return { error: 'zero_amount', message: 'Total de nómina cero' };

  const gasto = totalSalarios + totalAportes + totalProvisiones;
  const aportesPorPagar = totalAportes;
  const provisionesPorPagar = totalProvisiones;
  const retencionEmp = round(gasto - totalNeto - aportesPorPagar - provisionesPorPagar);

  const lines = [
    {
      accountCode: '510506',
      debit: round(gasto),
      credit: 0,
      description: 'Gasto nómina periodo',
    },
    {
      accountCode: '250505',
      debit: 0,
      credit: totalNeto,
      description: 'Salarios por pagar',
    },
  ];
  if (aportesPorPagar > 0)
    lines.push({
      accountCode: '237005',
      debit: 0,
      credit: aportesPorPagar,
      description: 'Aportes EPS/Pensión',
    });
  if (provisionesPorPagar > 0)
    lines.push({
      accountCode: '261005', // provisión cesantías/prima/vacaciones (existe en el catálogo y lo usa el seed)
      debit: 0,
      credit: provisionesPorPagar,
      description: 'Provisión cesantías/prima/vacaciones',
    });
  if (retencionEmp > 0)
    lines.push({
      accountCode: '236505',
      debit: 0,
      credit: retencionEmp,
      description: 'Retención laboral',
    });

  return postJournalEntry(
    {
      date: run.date || today(),
      source: 'payroll',
      sourceId: run.id,
      concept: `Nómina ${run.periodId || ''}`,
      lines,
    },
    ctx,
  );
}

// ── postWarrantyCost ──────────────────────────────────────────────────────────
// Costo manual de un caso de garantía (espejo de castor_accounting.js:1387).
//   warranty:  { id, customerId?, clientName }
//   costEntry: { id, amount, source:'caja'|'almacen', concept?, date? }
// source==='caja'    → DB 519540 / CR 110510 (caja menor) por amount.
// source==='almacen' → DB 519540 / CR 140505 (materias primas) por amount.
// La cuenta de gasto 519540 lleva el cliente como tercero. Idempotente por costEntry.id.
export function postWarrantyCost(warranty, costEntry, ctx) {
  if (!warranty || !costEntry)
    return { error: 'invalid_args', message: 'Faltan datos de garantía o costo' };
  const amount = round(costEntry.amount);
  if (amount <= 0) return { error: 'zero_amount', message: 'Monto de costo en cero' };

  const fromAlmacen = costEntry.source === 'almacen';
  const creditAccount = fromAlmacen ? '140505' : '110510';
  const thirdParty = warranty.customerId || warranty.clientName || null;
  const concept = costEntry.concept || costEntry.description || 'Costo de garantía';

  return postJournalEntry(
    {
      date: costEntry.date || today(),
      source: 'warranty_cost',
      sourceId: costEntry.id,
      concept: `Garantía ${warranty.id} · ${concept}`,
      lines: [
        { accountCode: '519540', debit: amount, credit: 0, thirdParty, description: concept },
        {
          accountCode: creditAccount,
          debit: 0,
          credit: amount,
          description: fromAlmacen ? 'Consumo de almacén' : 'Caja menor',
        },
      ],
    },
    ctx,
  );
}

// ── postBankAdjustment ────────────────────────────────────────────────────────
// Conciliación / ajuste manual de saldo bancario (espejo de adjustBank, Demo6:3765).
//   adj: { id, bankId|bankPucCode, delta (+/-), concept, date? }
// delta > 0 → DB 1110-XX / CR 425095 (ingreso por ajuste).
// delta < 0 → DB 539595 / CR 1110-XX (gasto por ajuste).
// El banco va como tercero en la línea de la cuenta 1110-XX. Idempotente por adj.id.
export function postBankAdjustment(adj, ctx) {
  if (!adj) return { error: 'no_adj', message: 'Falta el ajuste' };
  const delta = +adj.delta || 0;
  if (!delta) return { error: 'zero_delta', message: 'Ajuste en cero' };
  const bankPuc = adj.bankPucCode || resolveBankPuc(adj.bankId, ctx);
  if (!bankPuc) return { error: 'missing_bank', message: 'Cuenta bancaria no resuelta' };

  const amount = round(Math.abs(delta));
  const concept = adj.concept || 'Ajuste / conciliación bancaria';
  const bankLine = (debit, credit) => ({ accountCode: bankPuc, debit, credit, thirdParty: adj.bankId || null, description: concept });
  const lines = delta > 0
    ? [bankLine(amount, 0), { accountCode: '425095', debit: 0, credit: amount, description: 'Ingreso por ajuste' }]
    : [{ accountCode: '539595', debit: amount, credit: 0, description: 'Gasto por ajuste' }, bankLine(0, amount)];

  return postJournalEntry(
    {
      date: adj.date || today(),
      source: 'bank_adjustment',
      sourceId: adj.id,
      concept: `Conciliación · ${concept}`,
      lines,
    },
    ctx,
  );
}

// ── postDepreciation (Activos fijos) ──────────────────────────────────────────
// Portado de castor_accounting.js:1851 (_resolveDepreciationAccounts) y :1938
// (postDepreciation). Genera el asiento del run mensual: por cada activo,
// DB cuenta de gasto / CR cuenta de depreciación acumulada por `item.monto`.
// Las cuentas se resuelven leyendo `ctx.accountingMappings.depreciation` (slice
// C3a), con fallback hardcoded para compat. Es el primer cableado real de
// TD-07: la depreciación lee de la configuración editable en vez de constantes.
// Idempotente por (source='depreciation', sourceId=run.id).

const DEPRECIATION_DEFAULTS = {
  expense_admin: '516015',
  expense_sales: '526010',
  expense_cif: '730560',
  accumulated_oficina: '159220',
  accumulated_computacion: '159225',
  accumulated_transporte: '159240',
  accumulated_construcciones: '159205',
};

function resolveDepreciationAccounts(asset, accountingMappings) {
  const m = { ...DEPRECIATION_DEFAULTS, ...(accountingMappings?.depreciation || {}) };
  const usage = String(asset.usage || 'admin').toLowerCase();
  let expense = m.expense_admin;
  if (usage === 'sales' || usage === 'ventas') expense = m.expense_sales;
  else if (usage === 'cif' || usage === 'produccion' || usage === 'producción') expense = m.expense_cif;
  if (asset.expenseAccountCode) expense = asset.expenseAccountCode;

  const cat = String(asset.category || '').toLowerCase();
  let accumulated = m.accumulated_oficina || m.accumulated;
  if (/comput/.test(cat)) accumulated = m.accumulated_computacion || accumulated;
  else if (/transp|veh/.test(cat)) accumulated = m.accumulated_transporte || accumulated;
  else if (/constr|edif/.test(cat)) accumulated = m.accumulated_construcciones || accumulated;
  if (asset.accumulatedAccountCode) accumulated = asset.accumulatedAccountCode;

  return { expense, accumulated };
}

export function postDepreciation(run, ctx) {
  if (!run || !run.id) return { error: 'invalid_run', message: 'Run inválido' };
  const items = run.items || run.assets;
  if (!Array.isArray(items) || !items.length)
    return { error: 'no_items', message: 'Run sin activos' };
  const { fixedAssets = [], costCenters = [], accountingMappings } = ctx || {};

  const lines = [];
  for (const item of items) {
    const asset = fixedAssets.find((a) => a.id === item.assetId);
    if (!asset) continue;
    const accs = resolveDepreciationAccounts(asset, accountingMappings);
    // Cost center opcional por usage (admin/ventas/cif → ADMIN/VENTAS/TALLER).
    let cc = null;
    const usage = String(asset.usage || '').toLowerCase();
    const findCC = (id) => costCenters.find((c) => c.id === id || c.code === id)?.id || null;
    if (usage === 'admin') cc = findCC('ADMIN');
    else if (usage === 'sales' || usage === 'ventas') cc = findCC('VENTAS');
    else if (usage === 'cif' || usage === 'produccion' || usage === 'producción') cc = findCC('TALLER');

    const label = `${asset.id}${asset.name ? ' · ' + asset.name : ''}`;
    lines.push({
      accountCode: accs.expense,
      debit: item.monto,
      credit: 0,
      costCenter: cc,
      description: `Depreciación ${label}`,
    });
    lines.push({
      accountCode: accs.accumulated,
      debit: 0,
      credit: item.monto,
      costCenter: cc,
      description: `Dep. acumulada ${label}`,
    });
  }
  if (!lines.length) return { error: 'no_lines', message: 'Sin líneas a postear' };

  return postJournalEntry(
    {
      date: run.periodId + '-28',
      source: 'depreciation',
      sourceId: run.id,
      concept: `Depreciación ${run.periodId} · ${items.length} activo(s)`,
      lines,
    },
    ctx,
  );
}

// ── Notas crédito / Notas débito (§7.9) ───────────────────────────────────────
// Portado de castor_accounting.js:5870-6099. A diferencia del monolito (que
// muta state.notasCredito/Debito y maneja idempotencia interna), aquí el hook
// sólo construye y postea el asiento; el caller (AppContext) asigna el número
// (nextDocNumber), persiste el registro NC/ND y bumpea docNumbering.
// Idempotencia: el caller verifica JE previo con mismo source+sourceId.
// Cuentas leídas de accountingMappings con fallback a defaults; IVA resuelta
// vía taxRules (regla isDefault) con fallback a 19% — mismo patrón TD-07 light
// que postDepreciation. Reverso COGS proporcional vendrá en NC-3.
const NC_DEFAULTS = { sales_returns: '417505', iva_generated: '240805', receivable: '130505' };
const ND_DEFAULTS = { receivable: '130505', revenue: '412035', iva_generated: '240805' };

function resolveDefaultIvaRule(taxRules) {
  if (!Array.isArray(taxRules)) return null;
  return taxRules.find((r) => r.type === 'iva' && r.isDefault) || null;
}

// Cruza invoice → customerId real (FK). Prioriza invoice.customerId; si no
// existe (caso de los seeds actuales) cruza invoice.orderId → orders[].customerId.
// Fallback: clientName como cadena (peor identidad, pero no rompe el asiento).
function resolveInvoiceCustomer(invoice, orders) {
  if (invoice?.customerId) return invoice.customerId;
  if (invoice?.orderId && Array.isArray(orders)) {
    const order = orders.find((o) => o.id === invoice.orderId);
    if (order?.customerId) return order.customerId;
  }
  return invoice?.clientName || null;
}

// Base + IVA proporcional al monto NC/ND sobre el total. Si era remisión o
// la regla de IVA es 0%, devuelve { base: monto, iva: 0 }.
function splitBaseIva({ amount, invoice, taxRules }) {
  const isRemision = invoice?.type === 'remisión' || invoice?.type === 'remision';
  const ivaRule = isRemision ? null : resolveDefaultIvaRule(taxRules);
  const rate = ivaRule ? +ivaRule.rate || 0 : isRemision ? 0 : 0.19;
  if (rate <= 0) return { base: round(amount), iva: 0, ivaRule, rate };
  const base = round(amount / (1 + rate));
  const iva = round(amount - base);
  return { base, iva, ivaRule, rate };
}

// emitNotaCredito({ invoice, amount, ncNumber, motivo, date? }, ctx)
// DR sales_returns (base) + DR iva_generated (reverso IVA) / CR receivable (monto).
// El caller decide si es total (amount = invoice.total) o parcial (amount < total).
export function emitNotaCredito(payload, ctx) {
  if (!payload) return { error: 'no_payload', message: 'Falta payload' };
  const { invoice, amount, ncNumber, motivo, date } = payload;
  if (!invoice?.id) return { error: 'invalid_invoice', message: 'Factura inválida' };
  if (!ncNumber) return { error: 'missing_nc_number', message: 'Falta número NC' };
  if (!motivo || !String(motivo).trim())
    return { error: 'missing_motivo', message: 'Motivo requerido' };
  const total = +(invoice.total != null ? invoice.total : invoice.amount) || 0;
  if (total <= 0) return { error: 'invoice_zero', message: 'Factura sin monto' };
  const monto = round(+amount || 0);
  if (monto <= 0) return { error: 'amount_zero', message: 'Monto NC ≤ 0' };
  if (monto > total + 0.5)
    return { error: 'amount_exceeds_invoice', message: `Monto NC ${monto} excede factura ${total}` };

  const m = ctx?.accountingMappings?.nota_credito || NC_DEFAULTS;
  const { base, iva, ivaRule } = splitBaseIva({ amount: monto, invoice, taxRules: ctx?.taxRules });
  const thirdParty = resolveInvoiceCustomer(invoice, ctx?.orders);

  const lines = [
    {
      accountCode: m.sales_returns,
      debit: base,
      credit: 0,
      thirdParty,
      description: `NC ${ncNumber} · Devolución venta ${invoice.id}`,
    },
  ];
  if (iva > 0) {
    const ivaAccount = ivaRule?.account_generated || m.iva_generated;
    lines.push({
      accountCode: ivaAccount,
      debit: iva,
      credit: 0,
      description: `NC ${ncNumber} · Reverso IVA`,
    });
  }
  lines.push({
    accountCode: m.receivable,
    debit: 0,
    credit: monto,
    thirdParty,
    description: `NC ${ncNumber} · Crédito a cliente`,
  });

  return postJournalEntry(
    {
      date: date || invoice.emitDate || today(),
      source: 'nota_credito',
      sourceId: ncNumber,
      concept: `Nota crédito ${ncNumber} · ${motivo}`,
      lines,
    },
    ctx,
  );
}

// emitNotaDebito({ invoice, amount, ndNumber, motivo, date? }, ctx)
// DR receivable (monto) / CR revenue (base) + CR iva_generated (IVA).
// Casos típicos: cobro de intereses, ajuste de precio al alza, gastos al cliente.
export function emitNotaDebito(payload, ctx) {
  if (!payload) return { error: 'no_payload', message: 'Falta payload' };
  const { invoice, amount, ndNumber, motivo, date } = payload;
  if (!invoice?.id) return { error: 'invalid_invoice', message: 'Factura inválida' };
  if (!ndNumber) return { error: 'missing_nd_number', message: 'Falta número ND' };
  if (!motivo || !String(motivo).trim())
    return { error: 'missing_motivo', message: 'Motivo requerido' };
  const monto = round(+amount || 0);
  if (monto <= 0) return { error: 'amount_zero', message: 'Monto ND ≤ 0' };

  const m = ctx?.accountingMappings?.nota_debito || ND_DEFAULTS;
  const { base, iva, ivaRule } = splitBaseIva({ amount: monto, invoice, taxRules: ctx?.taxRules });
  const thirdParty = resolveInvoiceCustomer(invoice, ctx?.orders);

  const lines = [
    {
      accountCode: m.receivable,
      debit: monto,
      credit: 0,
      thirdParty,
      description: `ND ${ndNumber} · Cargo a cliente`,
    },
    {
      accountCode: m.revenue,
      debit: 0,
      credit: base,
      thirdParty,
      description: `ND ${ndNumber} · Mayor venta ${invoice.id}`,
    },
  ];
  if (iva > 0) {
    const ivaAccount = ivaRule?.account_generated || m.iva_generated;
    lines.push({
      accountCode: ivaAccount,
      debit: 0,
      credit: iva,
      description: `ND ${ndNumber} · IVA`,
    });
  }

  return postJournalEntry(
    {
      date: date || invoice.emitDate || today(),
      source: 'nota_debito',
      sourceId: ndNumber,
      concept: `Nota débito ${ndNumber} · ${motivo}`,
      lines,
    },
    ctx,
  );
}

// postCostOfSaleReversal({ invoice, ncNumber, ratio, date? }, ctx)
// Reverso parcial COGS por NC (castor_accounting.js:5965-5990). Solo aplica si
// existe JE previo con source='cogs' + sourceId=invoice.orderId. Hoy no hay
// COGS porque postCostOfSale (H2/TD-21) aún no está cableado — el hook
// devuelve { skip:'no_cogs_je' } y la NC principal funciona igual. Cuando H2
// esté listo, este hook se activa automáticamente sin tocar NC-4.
// Asiento: DR finished_goods (recibe PT) / CR cogs (cancela costo) × ratio.
export function postCostOfSaleReversal(payload, ctx) {
  const { invoice, ncNumber, ratio, date } = payload || {};
  if (!invoice?.id) return { error: 'invalid_invoice' };
  if (!ncNumber) return { error: 'missing_nc_number' };
  if (!(+ratio > 0)) return { error: 'invalid_ratio' };

  const orderId =
    invoice.orderId || (Array.isArray(invoice.orderIds) ? invoice.orderIds[0] : null);
  if (!orderId) return { skip: 'no_order' };

  const journals = ctx?.journalEntries || [];
  const lines = ctx?.journalLines || [];
  const cogsJE = journals.find((j) => j.source === 'cogs' && j.sourceId === orderId);
  if (!cogsJE) return { skip: 'no_cogs_je' };

  let originalCogs = 0;
  for (const l of lines) {
    if (l.journalId === cogsJE.id && +l.debit > 0) originalCogs += +l.debit;
  }
  const revAmount = round(originalCogs * ratio);
  if (revAmount <= 0.5) return { skip: 'amount_too_small' };

  const m = ctx?.accountingMappings?.cogs_on_invoice || {
    cogs: '612035',
    finished_goods: '143005',
  };

  return postJournalEntry(
    {
      date: date || today(),
      source: 'nota_credito_cogs',
      sourceId: ncNumber,
      concept: `Reverso COGS por NC ${ncNumber}`,
      lines: [
        {
          accountCode: m.finished_goods,
          debit: revAmount,
          credit: 0,
          description: `Reingreso PT por NC ${ncNumber}`,
        },
        {
          accountCode: m.cogs,
          debit: 0,
          credit: revAmount,
          description: `Reverso COGS por NC ${ncNumber}`,
        },
      ],
    },
    ctx,
  );
}

// ── Cierre de periodo / año fiscal (C2b) ──────────────────────────────────────
// Portado de castor_accounting.js:5650-5865, adaptado a las convenciones React
// (cuentas con level/nature/classCode; periodos con `estado`; journalEntry.period).
// Divergencia deliberada: el monolito cancela el saldo ACUMULADO a la fecha de
// cierre; aquí se cancela el MOVIMIENTO DEL PERIODO (clases 4/5/6/7 de ese mes),
// porque el seed React marca meses 'cerrado' SIN su asiento de cierre y el
// acumulado los contaría doble. No se valida rol (no hay RBAC todavía — TD-04).
const lastDayOfPeriod = (periodId) => {
  const m = String(periodId).match(/^(\d{4})-(\d{2})$/);
  if (!m) return today();
  const y = +m[1];
  const mo = +m[2];
  const day = new Date(y, mo, 0).getDate();
  return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const periodAfter = (periodId, fiscalPeriods) => {
  const m = String(periodId).match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  let y = +m[1];
  let mo = +m[2] + 1;
  if (mo > 12) {
    mo = 1;
    y++;
  }
  const nextId = `${y}-${String(mo).padStart(2, '0')}`;
  return (fiscalPeriods || []).find((p) => p.id === nextId) || null;
};

const periodEstado = (p) => p && (p.estado || p.status);

// ── closePeriod ──────────────────────────────────────────────────────────────
// Genera un asiento que cancela las cuentas auxiliares de clases 4/5/6/7 con
// movimiento en el periodo contra 360505 (utilidad/pérdida del ejercicio).
// Idempotente por source='closing' + sourceId=periodId. Devuelve el JE para que
// el caller lo aplique y marque el periodo 'cerrado'.
export function closePeriod(periodId, ctx) {
  const { pucAccounts, journalEntries = [], journalLines = [], fiscalPeriods = [] } = ctx || {};
  const period = fiscalPeriods.find((p) => p.id === periodId);
  if (!period) return { error: 'period_not_found', message: `Periodo ${periodId} no existe` };
  if (periodEstado(period) === 'cerrado')
    return { error: 'period_not_open', message: `Periodo ${periodId} ya está cerrado` };

  const dup = journalEntries.find(
    (j) => j.source === 'closing' && j.sourceId === periodId && j.status === 'posted',
  );
  if (dup) return { warning: 'already_closed', journalId: dup.id };

  const mov = movimientosPorCuenta(journalLines, journalEntries, periodId);
  const lines = [];
  let totIngresos = 0;
  let totEgresos = 0;
  for (const [code, m] of Object.entries(mov)) {
    const acc = findAccount(code, pucAccounts);
    if (!acc || acc.level < 6 || !/^[4567]$/.test(String(acc.classCode))) continue;
    const saldo = round(acc.nature === 'debito' ? m.debe - m.haber : m.haber - m.debe);
    if (Math.abs(saldo) < 0.5) continue;
    if (acc.nature === 'debito') {
      // Gasto/costo (saldo normal deudor): se cancela acreditando.
      lines.push({
        accountCode: code,
        debit: saldo < 0 ? -saldo : 0,
        credit: saldo > 0 ? saldo : 0,
        description: `Cierre ${periodId} · ${acc.name}`,
      });
      totEgresos += saldo;
    } else {
      // Ingreso (saldo normal acreedor): se cancela debitando.
      lines.push({
        accountCode: code,
        debit: saldo > 0 ? saldo : 0,
        credit: saldo < 0 ? -saldo : 0,
        description: `Cierre ${periodId} · ${acc.name}`,
      });
      totIngresos += saldo;
    }
  }

  if (lines.length === 0) return { ok: true, empty: true, journalEntry: null, lines: [], utilidad: 0 };

  const utilidad = round(totIngresos - totEgresos);
  if (Math.abs(utilidad) >= 0.5) {
    if (utilidad > 0)
      lines.push({ accountCode: '360505', debit: 0, credit: utilidad, description: `Utilidad del ejercicio · ${periodId}` });
    else
      lines.push({ accountCode: '360505', debit: -utilidad, credit: 0, description: `Pérdida del ejercicio · ${periodId}` });
  }

  const res = postJournalEntry(
    {
      date: lastDayOfPeriod(periodId),
      source: 'closing',
      sourceId: periodId,
      concept: `Cierre periodo ${periodId}`,
      lines,
    },
    ctx,
  );
  if (!res.ok) return res;
  return { ...res, utilidad };
}

// ── reopenPeriod ─────────────────────────────────────────────────────────────
// Reabre un periodo cerrado y reversa su asiento de cierre (si sigue presente —
// puede no estarlo por el flag de no-persistencia de asientos). Guard: no se
// puede reabrir si el periodo siguiente está cerrado (debe reabrirse primero).
export function reopenPeriod(periodId, ctx) {
  const { journalEntries = [], fiscalPeriods = [] } = ctx || {};
  const period = fiscalPeriods.find((p) => p.id === periodId);
  if (!period) return { error: 'period_not_found', message: `Periodo ${periodId} no existe` };
  if (periodEstado(period) !== 'cerrado')
    return { error: 'period_not_closed', message: `Periodo ${periodId} no está cerrado` };

  const next = periodAfter(periodId, fiscalPeriods);
  if (next && periodEstado(next) === 'cerrado')
    return { error: 'next_period_closed', message: `Reabra primero ${next.id} antes de ${periodId}` };

  let reversal = null;
  if (period.closingJournalEntryId) {
    const je = journalEntries.find((j) => j.id === period.closingJournalEntryId);
    if (je && je.status === 'posted') {
      const rev = reverseJournalEntry(period.closingJournalEntryId, `Reapertura periodo ${periodId}`, ctx);
      if (rev.error) return rev;
      reversal = rev;
    }
  }
  return { ok: true, reversal };
}

// ── closeFiscalYear ──────────────────────────────────────────────────────────
// Cierra los meses abiertos del año (threading del estado de trabajo) y traslada
// el saldo de 360505 → 370505 (utilidades acumuladas). Idempotente por
// source='fiscal_year_close' + sourceId=year. Devuelve un plan para que el caller
// lo aplique de forma atómica: { jesToAppend, periodPatches, counters }.
export function closeFiscalYear(year, ctx) {
  const yyyy = +year;
  if (!yyyy) return { error: 'invalid_year', message: 'Año inválido' };
  const { fiscalPeriods = [], journalEntries = [] } = ctx || {};
  const periods = fiscalPeriods.filter((p) => +String(p.id).slice(0, 4) === yyyy);
  if (periods.length === 0) return { error: 'no_periods_for_year', message: `No hay periodos de ${yyyy}` };

  const existing = journalEntries.find(
    (j) => j.source === 'fiscal_year_close' && j.sourceId === String(yyyy) && j.status === 'posted',
  );
  if (existing) return { warning: 'already_closed_year', journalId: existing.id };

  let work = { ...ctx };
  const jesToAppend = [];
  const periodPatches = {};
  for (const p of periods) {
    if (periodEstado(p) === 'cerrado') continue;
    const r = closePeriod(p.id, work);
    if (r.error) return { error: 'period_close_failed', periodId: p.id, detail: r };
    if (r.ok && r.journalEntry) {
      jesToAppend.push({ je: r.journalEntry, lines: r.lines });
      work = {
        ...work,
        journalEntries: [r.journalEntry, ...(work.journalEntries || [])],
        journalLines: [...(work.journalLines || []), ...r.lines],
        counters: { ...work.counters, ...r.counters },
      };
    }
    periodPatches[p.id] = {
      estado: 'cerrado',
      closedAt: nowISO(),
      closingJournalEntryId: r.journalEntry?.id || null,
    };
  }

  // Saldo 360505 acumulado (naturaleza crédito): positivo = utilidad.
  const mov = movimientosPorCuenta(work.journalLines || [], work.journalEntries || [], 'all');
  const m360 = mov['360505'] || { debe: 0, haber: 0 };
  const saldo360505 = round(m360.haber - m360.debe);

  let counters = work.counters;
  if (Math.abs(saldo360505) >= 0.5) {
    const lines =
      saldo360505 > 0
        ? [
            { accountCode: '360505', debit: saldo360505, credit: 0, description: `Cierre fiscal ${yyyy} · traslado utilidad` },
            { accountCode: '370505', debit: 0, credit: saldo360505, description: `Utilidades acumuladas ${yyyy}` },
          ]
        : [
            { accountCode: '370505', debit: -saldo360505, credit: 0, description: `Pérdida fiscal ${yyyy} · traslado` },
            { accountCode: '360505', debit: 0, credit: -saldo360505, description: `Cancelación pérdida ${yyyy}` },
          ];
    const res = postJournalEntry(
      {
        date: `${yyyy}-12-31`,
        source: 'fiscal_year_close',
        sourceId: String(yyyy),
        concept: `Cierre ejercicio fiscal ${yyyy}`,
        lines,
        force: true,
      },
      work,
    );
    if (!res.ok) return res;
    jesToAppend.push({ je: res.journalEntry, lines: res.lines });
    counters = res.counters;
  }

  return {
    ok: true,
    year: yyyy,
    jesToAppend,
    periodPatches,
    counters,
    utilidad: saldo360505,
    empty: jesToAppend.length === 0,
  };
}

// ── Aplicador genérico — actualiza estado del AppContext de forma inmutable ─
// Útil cuando el caller solo quiere "aplicar" el resultado al setState reducer.
export function applyJournalResult(state, res) {
  if (!res?.ok) return state;
  return {
    ...state,
    journalEntries: [res.journalEntry, ...(state.journalEntries || [])],
    journalLines: [...(state.journalLines || []), ...res.lines],
    counters: { ...state.counters, ...(res.counters || {}) },
  };
}
