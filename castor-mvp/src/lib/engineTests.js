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
  postCustomerCollection,
  postSupplyPurchase,
  postSupplierPayment,
  postPayroll,
  postBankAdjustment,
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
  {
    id: 't_postPayroll',
    description: 'postPayroll genera asiento balanceado con neto + aportes + provisiones',
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
      assertHasLine(r, '510506', 'debit', 13200); // gasto = 10000 + 1500 + 1700
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
