// ─────────────────────────────────────────────────────────────────────────────
// engineTests.js — Suite de tests del motor contable React (C4 · Centro de
// pruebas). Inspirada en castor_accounting.js:6541+ pero adaptada al motor
// puro de React (cada hook recibe ctx y devuelve {ok, journalEntry, lines,
// counters} sin mutar estado).
//
// Para tests que necesitan estado acumulado (idempotency, reverse, close)
// se usa `applyToCtx(ctx, res)` que crea un nuevo ctx con el JE aplicado.
//
// Cada test devuelve { id, description, status: 'pass'|'fail', durationMs,
// error: string|null }. La suite NO necesita Node — corre en el navegador.
// Los 40 unit tests del monolito (Cphora/tests/_run_tests_node.js) siguen
// disponibles para el cutover a Supabase; esta suite cubre los casos
// críticos del motor React.
// ─────────────────────────────────────────────────────────────────────────────

import { PUC_CATALOG } from '../data/pucCatalog';
import {
  postJournalEntry,
  postSale,
  postCostOfSale,
  postCustomerCollection,
  postCustomerAdvance,
  postSupplyPurchase,
  postSupplierPayment,
  postPayroll,
  postBankAdjustment,
  emitNotaCredito,
  emitNotaDebito,
  postCostOfSaleReversal,
  reverseJournalEntry,
  closePeriod,
  reopenPeriod,
  closeFiscalYear,
} from './accountingEngine';

// ── Fixtures + helpers ─────────────────────────────────────────────────────
function makeCtx() {
  return {
    pucAccounts: PUC_CATALOG,
    journalEntries: [],
    journalLines: [],
    fiscalPeriods: [
      { id: '2026-01', label: 'Enero 2026', estado: 'cerrado' },
      { id: '2026-02', label: 'Febrero 2026', estado: 'abierto' },
      { id: '2026-04', label: 'Abril 2026', estado: 'abierto' },
    ],
    counters: { je: 0 },
    bankAccounts: [{ id: 'B-01', bank: 'Bancolombia', pucCode: '111005' }],
    // Fixtures para postCostOfSale + emitNotaCredito/Debito + reverso COGS
    products: [
      { id: 'p-test', sku: 'TEST', name: 'Test Product', price: 1190, cost: 700 },
    ],
    orders: [
      { id: 'PED-TEST', customerId: 'C-001', productId: 'p-test', qty: 2 },
    ],
    customers: [{ id: 'C-001', name: 'Cliente Test' }],
    accountingMappings: {
      cogs_on_invoice: { cogs: '612035', finished_goods: '143005' },
      nota_credito: { sales_returns: '417505', iva_generated: '240805', receivable: '130505' },
      nota_debito: { receivable: '130505', revenue: '412035', iva_generated: '240805' },
      customer_advance: { bank_default: '111005', advance_received: '280505' },
    },
    taxRules: [
      { id: 'IVA-19', type: 'iva', name: 'IVA 19%', rate: 0.19, account_generated: '240805', isDefault: true },
    ],
  };
}

function applyToCtx(ctx, res) {
  if (!res?.ok) return ctx;
  return {
    ...ctx,
    journalEntries: [res.journalEntry, ...ctx.journalEntries],
    journalLines: [...ctx.journalLines, ...res.lines],
    counters: { ...ctx.counters, ...(res.counters || {}) },
  };
}

function assertOk(res, msg) {
  if (!res?.ok) throw new Error(`${msg || 'expected ok'}: ${JSON.stringify(res)}`);
}
function assertError(res, code) {
  if (res?.error !== code) throw new Error(`expected error='${code}', got ${JSON.stringify(res)}`);
}
function assertWarning(res, code) {
  if (res?.warning !== code) throw new Error(`expected warning='${code}', got ${JSON.stringify(res)}`);
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'expected equal'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}
function assertBalanced(res) {
  const d = (res.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
  const c = (res.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(d - c) > 0.5) throw new Error(`unbalanced ${d} vs ${c}`);
}
function assertHasLine(res, code, side, amount) {
  const ln = (res.lines || []).find((l) => l.accountCode === code);
  if (!ln) throw new Error(`missing line ${code}`);
  const v = side === 'debit' ? ln.debit : ln.credit;
  if (Math.abs(v - amount) > 0.5) throw new Error(`${code}.${side} = ${v}, expected ${amount}`);
}

// ── Suite ──────────────────────────────────────────────────────────────────
export const TESTS = [
  // postJournalEntry ────────────────────────────────────────────────────────
  {
    id: 't_pje_balanced',
    description: 'postJournalEntry acepta líneas balanceadas',
    fn: (ctx) => {
      const r = postJournalEntry(
        {
          date: '2026-04-15', source: 'manual', sourceId: 'TST-1', concept: 'test',
          lines: [
            { accountCode: '110505', debit: 1000, credit: 0 },
            { accountCode: '130505', debit: 0, credit: 1000 },
          ],
        },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertEqual(r.journalEntry.totalDebit, 1000);
    },
  },
  {
    id: 't_pje_unbalanced',
    description: 'postJournalEntry rechaza desbalanceado',
    fn: (ctx) => {
      const r = postJournalEntry(
        {
          date: '2026-04-15', source: 'manual', sourceId: 'TST-2',
          lines: [
            { accountCode: '110505', debit: 1000, credit: 0 },
            { accountCode: '130505', debit: 0, credit: 900 },
          ],
        },
        ctx,
      );
      assertError(r, 'unbalanced');
    },
  },
  {
    id: 't_pje_unknown_account',
    description: 'postJournalEntry rechaza cuenta inexistente',
    fn: (ctx) => {
      const r = postJournalEntry(
        {
          date: '2026-04-15', source: 'manual', sourceId: 'TST-3',
          lines: [
            { accountCode: '999999', debit: 1000, credit: 0 },
            { accountCode: '110505', debit: 0, credit: 1000 },
          ],
        },
        ctx,
      );
      assertError(r, 'unknown_account');
    },
  },
  {
    id: 't_pje_closed_period',
    description: 'postJournalEntry rechaza fecha en periodo cerrado',
    fn: (ctx) => {
      // 2026-01 está cerrado en la fixture
      const r = postJournalEntry(
        {
          date: '2026-01-15', source: 'manual', sourceId: 'TST-4',
          lines: [
            { accountCode: '110505', debit: 1000, credit: 0 },
            { accountCode: '130505', debit: 0, credit: 1000 },
          ],
        },
        ctx,
      );
      assertError(r, 'closed_period');
    },
  },
  {
    id: 't_pje_too_few_lines',
    description: 'postJournalEntry rechaza menos de 2 líneas',
    fn: (ctx) => {
      const r = postJournalEntry(
        {
          date: '2026-04-15', source: 'manual', sourceId: 'TST-5',
          lines: [{ accountCode: '110505', debit: 1000, credit: 0 }],
        },
        ctx,
      );
      assertError(r, 'too_few_lines');
    },
  },
  {
    id: 't_pje_idempotency',
    description: 'Dos llamadas con mismo (source,sourceId) no duplican (warning)',
    fn: (ctx) => {
      const payload = {
        date: '2026-04-15', source: 'sale', sourceId: 'IDEM-1',
        lines: [
          { accountCode: '110505', debit: 1000, credit: 0 },
          { accountCode: '130505', debit: 0, credit: 1000 },
        ],
      };
      const r1 = postJournalEntry(payload, ctx);
      assertOk(r1, 'primer post');
      const ctx2 = applyToCtx(ctx, r1);
      const r2 = postJournalEntry(payload, ctx2);
      assertWarning(r2, 'already_posted');
      assertEqual(r1.journalEntry.id, r2.journalId, 'mismo JE id');
    },
  },

  // postSale ────────────────────────────────────────────────────────────────
  {
    id: 't_postSale_factura',
    description: 'postSale (factura) genera CxR/Ingreso/IVA balanceado',
    fn: (ctx) => {
      const r = postSale(
        { id: 'FAC-001', date: '2026-04-15', type: 'factura', customerId: 'C-001', customerName: 'Cliente Test', total: 1190 },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '130505', 'debit', 1190);
      assertHasLine(r, '412035', 'credit', 1000); // base = 1190 / 1.19
      assertHasLine(r, '240805', 'credit', 190); // IVA 19%
    },
  },
  {
    id: 't_postSale_remision',
    description: 'postSale (remisión) genera asiento sin IVA',
    fn: (ctx) => {
      const r = postSale(
        { id: 'REM-001', date: '2026-04-15', type: 'remisión', customerId: 'C-001', customerName: 'Cliente', total: 1000 },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '130505', 'debit', 1000);
      assertHasLine(r, '412035', 'credit', 1000);
      if (r.lines.find((l) => l.accountCode === '240805')) throw new Error('remisión no debería generar línea IVA');
    },
  },

  // postCustomerCollection ─────────────────────────────────────────────────
  {
    id: 't_postCustomerCollection',
    description: 'postCustomerCollection: DB banco / CR 130505',
    fn: (ctx) => {
      const r = postCustomerCollection(
        { id: 'PAG-001', date: '2026-04-15', customerId: 'C-001', bankAccountId: 'B-01', amount: 5000 },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '111005', 'debit', 5000);
      assertHasLine(r, '130505', 'credit', 5000);
    },
  },

  // postSupplyPurchase ──────────────────────────────────────────────────────
  {
    id: 't_postSupplyPurchase',
    description: 'postSupplyPurchase: DB MP+IVA / CR rete+CxP balanceado',
    fn: (ctx) => {
      const r = postSupplyPurchase(
        { id: 'OC-001', date: '2026-04-15', supplierId: 'P-001', supplierName: 'Prov', items: [{ qty: 10, cost: 100 }] },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '140505', 'debit', 1000); // base
      assertHasLine(r, '240810', 'debit', 190); // IVA 19% descontable
      assertHasLine(r, '236540', 'credit', 25); // RteFte 2.5%
      assertHasLine(r, '220505', 'credit', 1165); // CxP neto = 1000+190-25
    },
  },

  // postSupplierPayment ────────────────────────────────────────────────────
  {
    id: 't_postSupplierPayment',
    description: 'postSupplierPayment (con OC): DB 220505 / CR banco',
    fn: (ctx) => {
      const r = postSupplierPayment(
        { id: 'OUT-001', date: '2026-04-15', beneficiario: 'Prov', beneficiarioId: 'P-001', bankAccountId: 'B-01', amount: 1000, purchaseOrderId: 'OC-001' },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '220505', 'debit', 1000);
      assertHasLine(r, '111005', 'credit', 1000);
    },
  },

  // postBankAdjustment ─────────────────────────────────────────────────────
  {
    id: 't_postBankAdjustment_positive',
    description: 'postBankAdjustment delta>0: DB banco / CR 425095',
    fn: (ctx) => {
      const r = postBankAdjustment(
        { id: 'ADJ-001', date: '2026-04-15', bankId: 'B-01', delta: 500, concept: 'ajuste +' },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '111005', 'debit', 500);
      assertHasLine(r, '425095', 'credit', 500);
    },
  },

  // postPayroll ────────────────────────────────────────────────────────────
  // TD-07b: tras el refactor a asiento consolidado por categoría (§7.11), el
  // shape consolidado (back-compat) trata todo como admin. El devengado va a
  // 510506 (base+aux = totalSalarios), las provisiones a 510530, los aportes
  // empleador a 510568, los pasivos a 250505/236505/237005/261005.
  {
    id: 't_postPayroll_consolidado_backcompat',
    description: 'postPayroll con shape consolidado: devengado→510506, provisiones→510530, aportes→510568',
    fn: (ctx) => {
      const r = postPayroll(
        {
          id: 'NOM-2026-04', date: '2026-04-30', periodId: '2026-04',
          totalSalarios: 10000, totalNeto: 9000, totalAportes: 1500, totalProvisiones: 1700,
        },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '510506', 'debit', 10000); // devengado (base+aux)
      assertHasLine(r, '510530', 'debit', 1700); // provisiones admin+sales
      assertHasLine(r, '510568', 'debit', 1500); // aportes empleador admin+sales
      assertHasLine(r, '250505', 'credit', 9000); // neto
      assertHasLine(r, '237005', 'credit', 1500); // aportes por pagar
      assertHasLine(r, '261005', 'credit', 1700); // provisiones por pagar
    },
  },
  {
    id: 't_postPayroll_admin_only',
    description: 'postPayroll byCategory admin-only: 510506+510530+510568',
    fn: (ctx) => {
      const r = postPayroll(
        {
          id: 'NOM-2026-04-A', periodId: '2026-04', date: '2026-04-30',
          byCategory: {
            admin: { base: 10000, aux: 200, neto: 9400, aportesEmpr: 1500, provisiones: 1700, retencionEmp: 800 },
            sales: { base: 0, aux: 0, neto: 0, aportesEmpr: 0, provisiones: 0, retencionEmp: 0 },
            mod:   { base: 0, aux: 0, neto: 0, aportesEmpr: 0, provisiones: 0, retencionEmp: 0 },
          },
        },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '510506', 'debit', 10200); // devengado admin = base+aux
      assertHasLine(r, '510530', 'debit', 1700);
      assertHasLine(r, '510568', 'debit', 1500);
      assertHasLine(r, '250505', 'credit', 9400);
      assertHasLine(r, '236505', 'credit', 800);
      // no debe haber líneas de sales ni MOD
      if (r.lines.find((l) => l.accountCode === '520506')) throw new Error('admin-only no debe tener 520506');
      if (r.lines.find((l) => l.accountCode === '720505')) throw new Error('admin-only no debe tener 720505');
      if (r.lines.find((l) => l.accountCode === '730530')) throw new Error('admin-only no debe tener 730530');
    },
  },
  {
    id: 't_postPayroll_sales_only',
    description: 'postPayroll byCategory sales-only: 520506 + provisiones/aportes admin+sales',
    fn: (ctx) => {
      const r = postPayroll(
        {
          id: 'NOM-2026-04-S', periodId: '2026-04', date: '2026-04-30',
          byCategory: {
            admin: { base: 0, aux: 0, neto: 0, aportesEmpr: 0, provisiones: 0, retencionEmp: 0 },
            sales: { base: 6500, aux: 0, neto: 5980, aportesEmpr: 1300, provisiones: 1100, retencionEmp: 520 },
            mod:   { base: 0, aux: 0, neto: 0, aportesEmpr: 0, provisiones: 0, retencionEmp: 0 },
          },
        },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '520506', 'debit', 6500); // devengado ventas
      assertHasLine(r, '510530', 'debit', 1100); // provisiones admin+ventas (consolidado)
      assertHasLine(r, '510568', 'debit', 1300); // aportes admin+ventas (consolidado)
      if (r.lines.find((l) => l.accountCode === '510506')) throw new Error('sales-only no debe tener 510506');
      if (r.lines.find((l) => l.accountCode === '730530')) throw new Error('sales-only no debe tener 730530 (es MOD)');
    },
  },
  {
    id: 't_postPayroll_mod_only',
    description: 'postPayroll byCategory MOD-only: 720505+730530+720570',
    fn: (ctx) => {
      const r = postPayroll(
        {
          id: 'NOM-2026-04-M', periodId: '2026-04', date: '2026-04-30',
          byCategory: {
            admin: { base: 0, aux: 0, neto: 0, aportesEmpr: 0, provisiones: 0, retencionEmp: 0 },
            sales: { base: 0, aux: 0, neto: 0, aportesEmpr: 0, provisiones: 0, retencionEmp: 0 },
            mod:   { base: 4200, aux: 200, neto: 4064, aportesEmpr: 700, provisiones: 800, retencionEmp: 336 },
          },
        },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '720505', 'debit', 4400); // devengado MOD = base+aux
      assertHasLine(r, '730530', 'debit', 800); // provisiones MOD (cuenta nueva TD-07b-1)
      assertHasLine(r, '720570', 'debit', 700); // aportes MOD consolidado
      if (r.lines.find((l) => l.accountCode === '510506')) throw new Error('MOD-only no debe tener 510506');
      if (r.lines.find((l) => l.accountCode === '510530')) throw new Error('MOD-only no debe tener 510530 (admin/sales)');
    },
  },
  {
    id: 't_postPayroll_mix_idempotency',
    description: 'postPayroll mix admin+sales+MOD: 7 cuentas balanceadas + idempotencia',
    fn: (ctx) => {
      const payload = {
        id: 'NOM-2026-04-X', periodId: '2026-04', date: '2026-04-30',
        byCategory: {
          admin: { base: 10000, aux: 200, neto: 9400, aportesEmpr: 1500, provisiones: 1700, retencionEmp: 800 },
          sales: { base: 6500, aux: 0, neto: 5980, aportesEmpr: 1300, provisiones: 1100, retencionEmp: 520 },
          mod:   { base: 4200, aux: 200, neto: 4064, aportesEmpr: 700, provisiones: 800, retencionEmp: 336 },
        },
      };
      const r1 = postPayroll(payload, ctx);
      assertOk(r1);
      assertBalanced(r1);
      // 3 líneas de devengado + 2 provisiones + 2 aportes + 4 pasivos = 11 líneas
      assertEqual(r1.lines.length, 11, 'mix tiene 3+2+2+4 lineas');
      assertHasLine(r1, '510506', 'debit', 10200);
      assertHasLine(r1, '520506', 'debit', 6500);
      assertHasLine(r1, '720505', 'debit', 4400);
      assertHasLine(r1, '510530', 'debit', 2800); // 1700 + 1100
      assertHasLine(r1, '730530', 'debit', 800);
      assertHasLine(r1, '510568', 'debit', 2800); // 1500 + 1300
      assertHasLine(r1, '720570', 'debit', 700);
      // idempotencia: re-postear con mismo sourceId devuelve warning
      const ctx2 = applyToCtx(ctx, r1);
      const r2 = postPayroll(payload, ctx2);
      assertWarning(r2, 'already_posted');
      assertEqual(r1.journalEntry.id, r2.journalId, 'mismo JE id');
    },
  },

  // reverseJournalEntry ────────────────────────────────────────────────────
  {
    id: 't_reverse_je',
    description: 'reverseJournalEntry crea espejo (DB↔CR)',
    fn: (ctx) => {
      const r1 = postJournalEntry(
        {
          date: '2026-04-15', source: 'manual', sourceId: 'REV-1',
          lines: [
            { accountCode: '110505', debit: 500, credit: 0 },
            { accountCode: '130505', debit: 0, credit: 500 },
          ],
        },
        ctx,
      );
      assertOk(r1);
      const ctx2 = applyToCtx(ctx, r1);
      const rv = reverseJournalEntry(r1.journalEntry.id, 'test', ctx2);
      assertOk(rv);
      assertBalanced(rv);
      // El espejo tiene CR 110505 y DB 130505
      assertHasLine(rv, '110505', 'credit', 500);
      assertHasLine(rv, '130505', 'debit', 500);
    },
  },

  // closePeriod ────────────────────────────────────────────────────────────
  {
    id: 't_closePeriod_empty',
    description: 'closePeriod sobre periodo sin movimiento de resultados → empty (sin JE)',
    fn: (ctx) => {
      // 2026-02 abierto, sin movimiento → empty
      const r = closePeriod('2026-02', ctx);
      assertOk(r);
      if (r.journalEntry) throw new Error('no debería generar JE');
      assertEqual(r.empty, true);
    },
  },
  {
    id: 't_closePeriod_generates_je',
    description: 'closePeriod con movimiento P&L → JE balanceado a 360505',
    fn: (ctx) => {
      // Postea una venta en abril (ingreso 1000) para tener movimiento
      const sale = postSale(
        { id: 'FAC-X', date: '2026-04-15', type: 'remisión', customerId: 'C', customerName: 'C', total: 1000 },
        ctx,
      );
      const ctx2 = applyToCtx(ctx, sale);
      const r = closePeriod('2026-04', ctx2);
      assertOk(r);
      assertBalanced(r);
      // utilidad esperada = ingresos (1000) - egresos (0) = 1000 → CR 360505 1000
      assertHasLine(r, '360505', 'credit', 1000);
      assertEqual(r.utilidad, 1000);
    },
  },
  {
    id: 't_closeFiscalYear',
    description: 'closeFiscalYear traslada 360505 → 370505 tras cerrar abril',
    fn: (ctx) => {
      const sale = postSale(
        { id: 'FAC-Y', date: '2026-04-15', type: 'remisión', customerId: 'C', customerName: 'C', total: 2000 },
        ctx,
      );
      const ctx2 = applyToCtx(ctx, sale);
      const r = closeFiscalYear(2026, ctx2);
      assertOk(r);
      assertEqual(r.utilidad, 2000, 'utilidad anual');
      // Hay 2 JEs: el monthly close de abril + el year transfer
      assertEqual(r.jesToAppend.length, 2);
      const transferJe = r.jesToAppend[r.jesToAppend.length - 1];
      const transferLines = transferJe.lines;
      const l360 = transferLines.find((l) => l.accountCode === '360505');
      const l370 = transferLines.find((l) => l.accountCode === '370505');
      if (!l360 || !l370) throw new Error('faltan líneas 360505/370505');
      assertEqual(l360.debit, 2000, '360505 DB');
      assertEqual(l370.credit, 2000, '370505 CR');
    },
  },
  {
    id: 't_reopenPeriod_tolerates_missing_je',
    description: 'reopenPeriod sin closingJournalEntryId reabre sin fallar',
    fn: (ctx) => {
      // Marca 2026-04 cerrado SIN haber generado closing JE (simula reload)
      const ctxClosed = {
        ...ctx,
        fiscalPeriods: ctx.fiscalPeriods.map((p) =>
          p.id === '2026-04' ? { ...p, estado: 'cerrado', closingJournalEntryId: null } : p,
        ),
      };
      const r = reopenPeriod('2026-04', ctxClosed);
      assertOk(r);
      assertEqual(r.reversal, null, 'sin reversal porque no había closing JE');
    },
  },

  // postCostOfSale (H2 / TD-21) ────────────────────────────────────────────
  {
    id: 't_postCostOfSale',
    description: 'postCostOfSale: DR cogs / CR finished_goods con costo calculado',
    fn: (ctx) => {
      // PED-TEST: productId=p-test (cost=700) × qty=2 → COGS=1400
      const r = postCostOfSale({ id: 'PED-TEST', orderId: 'PED-TEST', date: '2026-04-15' }, ctx);
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '612035', 'debit', 1400);
      assertHasLine(r, '143005', 'credit', 1400);
      assertEqual(r.journalEntry.source, 'cogs');
      assertEqual(r.journalEntry.sourceId, 'PED-TEST');
    },
  },
  {
    id: 't_postCostOfSale_explicit_cost',
    description: 'postCostOfSale acepta invoice.cost pre-calculado',
    fn: (ctx) => {
      const r = postCostOfSale(
        { id: 'PED-TEST', orderId: 'PED-TEST', cost: 999, date: '2026-04-15' },
        ctx,
      );
      assertOk(r);
      assertHasLine(r, '612035', 'debit', 999);
      assertHasLine(r, '143005', 'credit', 999);
    },
  },
  {
    id: 't_postCostOfSale_order_not_found',
    description: 'postCostOfSale falla si orderId no existe y no hay invoice.cost',
    fn: (ctx) => {
      const r = postCostOfSale({ id: 'PED-MISSING', orderId: 'PED-MISSING' }, ctx);
      assertError(r, 'order_not_found');
    },
  },

  // emitNotaCredito / emitNotaDebito (§7.9 NC-2) ───────────────────────────
  {
    id: 't_emitNC_factura_total',
    description: 'emitNotaCredito (factura, total): base+IVA balanceado',
    fn: (ctx) => {
      const invoice = { id: 'FAC-TEST', orderId: 'PED-TEST', type: 'factura', total: 1190, emitDate: '2026-04-10' };
      const r = emitNotaCredito({ invoice, amount: 1190, ncNumber: 'NC-001', motivo: 'Devolución' }, ctx);
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '417505', 'debit', 1000);
      assertHasLine(r, '240805', 'debit', 190);
      assertHasLine(r, '130505', 'credit', 1190);
      assertEqual(r.journalEntry.source, 'nota_credito');
      assertEqual(r.journalEntry.sourceId, 'NC-001');
    },
  },
  {
    id: 't_emitNC_remision_sin_iva',
    description: 'emitNotaCredito sobre remisión: sin línea de IVA',
    fn: (ctx) => {
      const invoice = { id: 'REM-TEST', orderId: 'PED-TEST', type: 'remisión', total: 1000, emitDate: '2026-04-10' };
      const r = emitNotaCredito({ invoice, amount: 1000, ncNumber: 'NC-002', motivo: 'Anulación' }, ctx);
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '417505', 'debit', 1000);
      assertHasLine(r, '130505', 'credit', 1000);
      if (r.lines.find((l) => l.accountCode === '240805')) throw new Error('remisión no debería tener IVA');
    },
  },
  {
    id: 't_emitNC_periodo_cerrado_usa_hoy',
    description: 'emitNotaCredito sobre factura en periodo cerrado usa today() (no rompe cierres)',
    fn: (ctx) => {
      const invoice = { id: 'FAC-OLD', orderId: 'PED-TEST', type: 'factura', total: 1190, emitDate: '2026-01-15' };
      const r = emitNotaCredito({ invoice, amount: 1190, ncNumber: 'NC-003', motivo: 'Devolución tardía' }, ctx);
      assertOk(r);
      // No debe usar la fecha del periodo cerrado (2026-01)
      if (r.journalEntry.date.startsWith('2026-01')) {
        throw new Error('NC no debería contabilizarse en periodo cerrado');
      }
    },
  },
  {
    id: 't_emitNC_amount_exceeds',
    description: 'emitNotaCredito falla si monto > total de la factura',
    fn: (ctx) => {
      const invoice = { id: 'FAC-T', orderId: 'PED-TEST', type: 'factura', total: 1190, emitDate: '2026-04-10' };
      const r = emitNotaCredito({ invoice, amount: 2000, ncNumber: 'NC-004', motivo: 'X' }, ctx);
      assertError(r, 'amount_exceeds_invoice');
    },
  },
  {
    id: 't_emitND_balanced',
    description: 'emitNotaDebito: DR receivable / CR revenue+IVA balanceado',
    fn: (ctx) => {
      const invoice = { id: 'FAC-T', orderId: 'PED-TEST', type: 'factura', total: 1190, emitDate: '2026-04-10' };
      const r = emitNotaDebito({ invoice, amount: 238, ndNumber: 'ND-001', motivo: 'Intereses' }, ctx);
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '130505', 'debit', 238);
      assertHasLine(r, '412035', 'credit', 200);
      assertHasLine(r, '240805', 'credit', 38);
    },
  },

  // Ciclo completo NC + reverso COGS (NC-3 + H2) ───────────────────────────
  {
    id: 't_cogs_reverso_proporcional',
    description: 'postCostOfSaleReversal genera reverso COGS proporcional cuando hay JE de cogs previo',
    fn: (ctx) => {
      // 1) Postear COGS para PED-TEST (1400)
      const cogs = postCostOfSale({ id: 'PED-TEST', orderId: 'PED-TEST', date: '2026-04-15' }, ctx);
      assertOk(cogs);
      const ctx2 = applyToCtx(ctx, cogs);
      // 2) Simular NC parcial 50% → ratio=0.5 → reverso COGS=700
      const invoice = { id: 'FAC-TEST', orderId: 'PED-TEST', type: 'factura', total: 1190 };
      const rev = postCostOfSaleReversal({ invoice, ncNumber: 'NC-001', ratio: 0.5 }, ctx2);
      assertOk(rev);
      assertBalanced(rev);
      assertHasLine(rev, '143005', 'debit', 700);
      assertHasLine(rev, '612035', 'credit', 700);
      assertEqual(rev.journalEntry.source, 'nota_credito_cogs');
      assertEqual(rev.journalEntry.sourceId, 'NC-001');
    },
  },
  {
    id: 't_cogs_reverso_skip_si_no_hay_cogs',
    description: 'postCostOfSaleReversal devuelve skip si no hay JE de cogs previo',
    fn: (ctx) => {
      const invoice = { id: 'FAC-TEST', orderId: 'PED-TEST', type: 'factura', total: 1190 };
      const rev = postCostOfSaleReversal({ invoice, ncNumber: 'NC-001', ratio: 0.5 }, ctx);
      if (rev.skip !== 'no_cogs_je') throw new Error(`expected skip='no_cogs_je', got ${JSON.stringify(rev)}`);
    },
  },

  // postCustomerAdvance (H1) ────────────────────────────────────────────────
  {
    id: 't_postCustomerAdvance',
    description: 'postCustomerAdvance: DB banco / CR 280505 anticipo',
    fn: (ctx) => {
      const r = postCustomerAdvance(
        { id: 'PAG-ADV-1', date: '2026-04-15', customerId: 'C-001', bankAccountId: 'B-01', amount: 5000, orderId: 'PED-TEST' },
        ctx,
      );
      assertOk(r);
      assertBalanced(r);
      assertHasLine(r, '111005', 'debit', 5000);
      assertHasLine(r, '280505', 'credit', 5000);
      assertEqual(r.journalEntry.source, 'customer_advance');
      assertEqual(r.journalEntry.sourceId, 'PAG-ADV-1');
    },
  },
  {
    id: 't_postCustomerAdvance_fallback_bank',
    description: 'postCustomerAdvance usa bank_default si no resuelve bankAccountId',
    fn: (ctx) => {
      const r = postCustomerAdvance(
        { id: 'PAG-ADV-2', date: '2026-04-15', customerId: 'C-001', amount: 3000 },
        ctx,
      );
      assertOk(r);
      assertHasLine(r, '111005', 'debit', 3000); // bank_default del mapping
      assertHasLine(r, '280505', 'credit', 3000);
    },
  },
  {
    id: 't_postCustomerAdvance_invalid_amount',
    description: 'postCustomerAdvance falla si amount ≤ 0',
    fn: (ctx) => {
      const r = postCustomerAdvance({ id: 'PAG-X', amount: 0 }, ctx);
      assertError(r, 'invalid_payment');
    },
  },
];

// ── Runners ────────────────────────────────────────────────────────────────
export function runTest(id) {
  const t = TESTS.find((x) => x.id === id);
  if (!t) return { id, status: 'fail', durationMs: 0, error: 'test no encontrado' };
  const t0 = performance.now();
  try {
    t.fn(makeCtx());
    return { id, status: 'pass', durationMs: Math.round(performance.now() - t0), error: null };
  } catch (e) {
    return { id, status: 'fail', durationMs: Math.round(performance.now() - t0), error: e.message };
  }
}

export function runAllTests() {
  return TESTS.map((t) => runTest(t.id));
}
