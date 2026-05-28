import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PUC_CATALOG } from '../data/pucCatalog';
import {
  SEED_BANK_ACCOUNTS,
  SEED_TAX_PROFILE,
  SEED_PAYROLL_PARAMS,
  SEED_FISCAL_PERIODS,
  SEED_COST_CENTERS,
  SEED_JOURNAL_ENTRIES,
  SEED_JOURNAL_LINES,
  SEED_ACCOUNTING_MAPPINGS,
  SEED_TAX_RULES,
  SEED_DOC_NUMBERING,
  SEED_FIXED_ASSETS,
  SEED_DEPRECIATION_RUNS,
  SEED_NOTAS_CREDITO,
  SEED_NOTAS_DEBITO,
} from '../data/seed';
import {
  WAREHOUSES,
  PRODUCTS,
  SUPPLIERS,
  SUPPLIES,
  PURCHASE_ORDERS,
  CUSTOMERS,
  INVOICES,
  LEADS,
  QUOTES,
  ORDERS,
  FINISHED_STOCK,
  PAYMENTS,
  OUTGOING_PAYMENTS,
  WARRANTIES,
  POST_SALES,
  EMPLOYEES,
  STOCK_MOVES,
  INNOVATION,
  AUDITS,
  MARKETING_ASSETS,
  DISPATCH_REQUESTS,
} from '../data/erpSeed';
import { loadState, saveState, resetState } from '../lib/persistence';
import { migrateCustomerFk, migrateCustomerChannel, migrateWarehouseLabels, migrateWarrantyFields } from '../lib/migrations';
import { nowISO, uid } from '../lib/format';
import {
  postJournalEntry as engPostJE,
  postManualEntry as engPostManual,
  postSale as engPostSale,
  postCustomerCollection as engPostCollection,
  postSupplyPurchase as engPostSupplyPurchase,
  postSupplierPayment as engPostSupplierPayment,
  postPayroll as engPostPayroll,
  postWarrantyCost as engPostWarrantyCost,
  postBankAdjustment as engPostBankAdjustment,
  postDepreciation as engPostDepreciation,
  emitNotaCredito as engEmitNotaCredito,
  emitNotaDebito as engEmitNotaDebito,
  postCostOfSaleReversal as engPostCogsReversal,
  reverseJournalEntry as engReverse,
  closePeriod as engClosePeriod,
  reopenPeriod as engReopenPeriod,
  closeFiscalYear as engCloseFiscalYear,
  applyJournalResult,
} from '../lib/accountingEngine';
import { calcDepreciationPreview, nextDocNumber } from '../lib/accounting';

// Slices contables: siempre se siembran desde el código (catálogo/asientos
// estáticos). La Contabilidad queda fuera de alcance hasta tener castor_accounting.js.
const ACCOUNTING_SEED = () => ({
  pucAccounts: PUC_CATALOG,
  journalEntries: SEED_JOURNAL_ENTRIES,
  journalLines: SEED_JOURNAL_LINES,
  costCenters: SEED_COST_CENTERS,
});

function buildInitialState() {
  return {
    ...ACCOUNTING_SEED(),
    // Editables de contabilidad (sí se persisten)
    bankAccounts: SEED_BANK_ACCOUNTS,
    companyTaxProfile: SEED_TAX_PROFILE,
    payrollParams: SEED_PAYROLL_PARAMS,
    // C2a: los periodos fiscales son estado editable (abrir/cerrar) → se persisten
    // (a diferencia del catálogo PUC / asientos, que sí se re-siembran del código).
    fiscalPeriods: SEED_FISCAL_PERIODS,
    // C3a: mapeo de cuentas por evento (editable, persistido). Capa de configuración;
    // el motor sigue usando cuentas hardcoded (cablearlo a leer aquí es refactor posterior).
    accountingMappings: SEED_ACCOUNTING_MAPPINGS,
    // C3b: reglas tributarias (IVA, ReteFte, ReteIVA, ReteICA). Editable persistido.
    // Restricción: un solo `isDefault` por `type`. Capa de configuración; el motor
    // todavía no las consume (cablearlo es refactor posterior junto a accountingMappings).
    taxRules: SEED_TAX_RULES,
    // C3c: numeración interna de documentos (FAC/REM/NC/ND). Editable persistido.
    // "Numeración interna · No oficial DIAN" — la facturación oficial se gestiona
    // por proveedor tecnológico externo (fuera del MVP).
    docNumbering: SEED_DOC_NUMBERING,
    // Activos fijos + corridas de depreciación. Editables persistidos. La
    // depreciación lineal mensual se corre desde la vista ActivosFijos; cada
    // run genera su asiento contable (postDepreciation) idempotente por periodId.
    fixedAssets: SEED_FIXED_ASSETS,
    depreciationRuns: SEED_DEPRECIATION_RUNS,
    // Notas crédito y débito (§7.9). Editables persistidos. Cada registro
    // contiene el journalEntryId del asiento principal y (en NC) el id del
    // reverso COGS si aplica.
    notasCredito: SEED_NOTAS_CREDITO,
    notasDebito: SEED_NOTAS_DEBITO,
    // ERP — Comercial / Operación / Finanzas / Admin
    warehouses: WAREHOUSES,
    products: PRODUCTS,
    suppliers: SUPPLIERS,
    supplies: SUPPLIES,
    purchaseOrders: PURCHASE_ORDERS,
    supplyReceipts: [],
    supplyIssues: [],
    customers: CUSTOMERS,
    invoices: INVOICES,
    invoiceRequests: [],
    leads: LEADS,
    quotes: QUOTES,
    orders: ORDERS,
    finishedStock: FINISHED_STOCK,
    payments: PAYMENTS,
    outgoingPayments: OUTGOING_PAYMENTS,
    warranties: WARRANTIES,
    postSales: POST_SALES,
    employees: EMPLOYEES,
    stockMoves: STOCK_MOVES,
    innovation: INNOVATION,
    audits: AUDITS,
    marketingAssets: MARKETING_ASSETS,
    dispatchRequests: DISPATCH_REQUESTS,
    notifications: [],
    counters: { lead: 105, cot: 2002, ped: 1253, op: 5004, gar: 51, pag: 504, out: 32, emp: 7, inn: 2, mkt: 12, sup: 5, insumo: 8, oc: 3003, prod: 8, dsp: 2, fac: 2, rem: 14, cli: 4, rcp: 0, je: 11, iss: 0, af: 7 },
    currentUser: { id: 'u1', name: 'Alexander Vivas', role: 'gerencia' },
  };
}

// Reconstruye el estado: base del seed + lo persistido (sin pisar los slices
// contables estáticos, que siempre vienen del código).
function hydrate() {
  const base = buildInitialState();
  const saved = loadState();
  const merged = !saved
    ? base
    : {
        ...base,
        ...saved,
        ...ACCOUNTING_SEED(), // catálogo/asientos estáticos siempre desde código
        counters: { ...base.counters, ...(saved.counters || {}) },
        currentUser: saved.currentUser || base.currentUser,
      };
  // Migraciones idempotentes (no destructivas, versionadas en _migrations):
  //  · customerId (FK) en pedidos/cotizaciones (ADR-011 / B2)
  //  · channel en clientes derivado del lead vinculado (EX-F2-04)
  //  · relabel de bodegas MP a "Almacén #1/#2" (H-102)
  return migrateWarrantyFields(migrateWarehouseLabels(migrateCustomerChannel(migrateCustomerFk(merged))));
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(hydrate);

  // Intent de navegación transversal: equivale a las funciones globales
  // openQuoteForm(leadId) / openSaleForm({quoteId}) del HTML. Una vista lo
  // setea antes de navegar y la vista destino lo consume y lo limpia al montar.
  // Es UI efímera (no se persiste).
  const [pendingForm, setPendingForm] = useState(null);

  // Persiste el estado completo cada vez que cambia (debounced).
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveState(state), 250);
    return () => clearTimeout(timer.current);
  }, [state]);

  // CR-09 / TD-30: espejo síncrono de los contadores. nextId() antes leía y
  // devolvía el id desde DENTRO del updater de setState, lo que solo funciona
  // para el primer setState del tick (eager-eval de React); una segunda llamada
  // en el mismo handler devolvía undefined. Con este ref, nextId calcula el id
  // de forma síncrona y consecutiva sin depender de ese detalle.
  const countersRef = useRef(state.counters);
  useEffect(() => {
    countersRef.current = state.counters;
  }, [state.counters]);

  const actions = useMemo(
    () => ({
      // ── CRUD genérico por colección ──
      add: (collection, item) =>
        setState((s) => ({ ...s, [collection]: [item, ...(s[collection] || [])] })),
      addLast: (collection, item) =>
        setState((s) => ({ ...s, [collection]: [...(s[collection] || []), item] })),
      update: (collection, id, patch) =>
        setState((s) => ({
          ...s,
          [collection]: (s[collection] || []).map((x) =>
            x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x,
          ),
        })),
      remove: (collection, id) =>
        setState((s) => ({ ...s, [collection]: (s[collection] || []).filter((x) => x.id !== id) })),
      setCollection: (collection, value) => setState((s) => ({ ...s, [collection]: value })),

      // EX-F2-04 / B2 completo: edita un cliente y, si cambió el NOMBRE, propaga el
      // nombre nuevo (cascada acotada) a la denormalización clientName de pedidos y
      // cotizaciones del MISMO customerId. NO toca facturas/pagos/notas (snapshots
      // históricos). Todo en UN SOLO setState para que la cascada sea atómica
      // (evita el problema de updates separados visto con nextId en Fase 1.5).
      updateCustomer: (id, patch) =>
        setState((s) => {
          const cust = (s.customers || []).find((c) => c.id === id);
          if (!cust) return s;
          const newName = patch.name;
          const nameChanged =
            typeof newName === 'string' && newName !== cust.name;
          return {
            ...s,
            customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            orders: nameChanged
              ? (s.orders || []).map((o) =>
                  o.customerId === id ? { ...o, clientName: newName } : o,
                )
              : s.orders,
            quotes: nameChanged
              ? (s.quotes || []).map((qt) =>
                  qt.customerId === id ? { ...qt, clientName: newName } : qt,
                )
              : s.quotes,
          };
        }),

      // Genera un id incremental tipo "PED-1254" y avanza el contador.
      // Calcula el id de forma síncrona desde countersRef (bump inmediato), por
      // lo que soporta varias llamadas en el mismo evento sin colisión ni undefined.
      nextId: (prefix, counterKey, pad = 0) => {
        const n = (countersRef.current[counterKey] || 0) + 1;
        countersRef.current = { ...countersRef.current, [counterKey]: n };
        setState((s) => ({ ...s, counters: { ...s.counters, [counterKey]: n } }));
        return `${prefix}-${pad ? String(n).padStart(pad, '0') : n}`;
      },

      // ── Notificaciones ──
      pushNotification: (n) =>
        setState((s) => ({
          ...s,
          notifications: [
            { id: uid('N'), createdAt: nowISO(), read: false, type: 'info', ...n },
            ...s.notifications,
          ].slice(0, 50),
        })),
      markAllNotificationsRead: () =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      // ── Contabilidad editable (se mantiene de la fase previa) ──
      saveTaxAndPayroll: ({ companyTaxProfile, payrollParams }) =>
        setState((s) => ({
          ...s,
          companyTaxProfile: companyTaxProfile ?? s.companyTaxProfile,
          payrollParams: payrollParams ?? s.payrollParams,
        })),
      addBankAccount: (acc) =>
        setState((s) => ({
          ...s,
          bankAccounts: [...s.bankAccounts, { ...acc, id: `B-${Date.now().toString(36)}` }],
        })),
      updateBankAccount: (id, patch) =>
        setState((s) => ({
          ...s,
          bankAccounts: s.bankAccounts.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeBankAccount: (id) =>
        setState((s) => ({ ...s, bankAccounts: s.bankAccounts.filter((b) => b.id !== id) })),

      // ── Mapeos operación → cuenta (C3a) ─────────────────────────────────
      // Edición instantánea por celda; valida que la cuenta sea auxiliar (level≥6)
      // y activa antes de aceptar. code='' desasigna el mapeo (válido).
      setMapping: (section, key, code) => {
        let outcome;
        setState((s) => {
          if (code) {
            const acc = (s.pucAccounts || []).find((a) => a.code === code);
            if (!acc || acc.level < 6 || acc.activa === false) {
              outcome = { error: 'invalid_account', message: `Cuenta ${code} no es auxiliar activa` };
              return s;
            }
          }
          outcome = { ok: true };
          return {
            ...s,
            accountingMappings: {
              ...(s.accountingMappings || {}),
              [section]: { ...((s.accountingMappings || {})[section] || {}), [key]: code },
            },
          };
        });
        return outcome;
      },
      resetMappings: () => setState((s) => ({ ...s, accountingMappings: SEED_ACCOUNTING_MAPPINGS })),

      // ── Reglas tributarias (C3b) ─────────────────────────────────────────
      // Tres acciones CRUD. add/update validan cuenta auxiliar activa y enforzan
      // "un solo default por type". remove valida que la regla no esté siendo
      // usada por documentos vía taxBreakdown (espejo de castor_accounting.js:3143).
      addTaxRule: (rule) => {
        let outcome;
        setState((s) => {
          const id = String(rule?.id || '').trim();
          if (!id) {
            outcome = { error: 'missing_id', message: 'ID requerido' };
            return s;
          }
          if ((s.taxRules || []).find((r) => r.id === id)) {
            outcome = { error: 'duplicate_id', message: `ID ${id} ya existe` };
            return s;
          }
          const acc = rule.account || rule.account_generated || rule.account_descontable;
          if (acc) {
            const a = (s.pucAccounts || []).find((x) => x.code === acc);
            if (!a || a.level < 6 || a.activa === false) {
              outcome = { error: 'invalid_account', message: `Cuenta ${acc} no es auxiliar activa` };
              return s;
            }
          }
          outcome = { ok: true, id };
          let next = [...(s.taxRules || []), rule];
          if (rule.isDefault) {
            next = next.map((r) =>
              r.id !== id && r.type === rule.type ? { ...r, isDefault: false } : r,
            );
          }
          return { ...s, taxRules: next };
        });
        return outcome;
      },
      updateTaxRule: (id, patch) => {
        let outcome;
        setState((s) => {
          const existing = (s.taxRules || []).find((r) => r.id === id);
          if (!existing) {
            outcome = { error: 'not_found', message: `Regla ${id} no existe` };
            return s;
          }
          const merged = { ...existing, ...patch };
          const acc = merged.account || merged.account_generated || merged.account_descontable;
          if (acc) {
            const a = (s.pucAccounts || []).find((x) => x.code === acc);
            if (!a || a.level < 6 || a.activa === false) {
              outcome = { error: 'invalid_account', message: `Cuenta ${acc} no es auxiliar activa` };
              return s;
            }
          }
          outcome = { ok: true };
          let next = (s.taxRules || []).map((r) => (r.id === id ? merged : r));
          if (merged.isDefault) {
            next = next.map((r) =>
              r.id !== id && r.type === merged.type ? { ...r, isDefault: false } : r,
            );
          }
          return { ...s, taxRules: next };
        });
        return outcome;
      },
      removeTaxRule: (id) => {
        let outcome;
        setState((s) => {
          const used =
            (s.invoices || []).some((i) => i.taxBreakdown?.ivaRuleId === id) ||
            (s.supplyReceipts || []).some((r) => r.taxBreakdown?.ivaRuleId === id) ||
            (s.payments || []).some((p) =>
              (p.taxBreakdown?.retenciones || []).some((r) => r.ruleId === id),
            ) ||
            (s.outgoingPayments || []).some((p) =>
              (p.taxBreakdown?.retenciones || []).some((r) => r.ruleId === id),
            );
          if (used) {
            outcome = { error: 'in_use', message: `Regla ${id} está en uso por documentos` };
            return s;
          }
          outcome = { ok: true };
          return { ...s, taxRules: (s.taxRules || []).filter((r) => r.id !== id) };
        });
        return outcome;
      },

      // ── Numeración de documentos (C3c) ───────────────────────────────────
      // Edición inline campo a campo. Coerce a int para campos numéricos,
      // boolean para `active`. Espejo de setNumeracion (castor_accounting.js:3205).
      setDocNumberingField: (id, field, value) =>
        setState((s) => ({
          ...s,
          docNumbering: (s.docNumbering || []).map((d) => {
            if (d.id !== id) return d;
            let v;
            if (field === 'rangeFrom' || field === 'rangeTo' || field === 'currentNumber') {
              v = Math.max(0, Math.floor(+value || 0));
            } else if (field === 'active') {
              v = !!value;
            } else {
              v = value;
            }
            return { ...d, [field]: v };
          }),
        })),

      // ── Activos fijos + depreciación mensual ─────────────────────────────
      // CRUD básico + runDepreciation que: calcula la cuota mensual por activo,
      // postea el asiento balanceado (DB gasto / CR acumulada), actualiza
      // fixedAssets.depAcumulada y registra el run en depreciationRuns. Todo
      // en un setState atómico. Idempotente por periodId.
      addFixedAsset: (asset) => {
        let outcome;
        setState((s) => {
          if (!asset?.name || !asset?.category || !asset?.usage) {
            outcome = { error: 'invalid_asset', message: 'name, category y usage son requeridos' };
            return s;
          }
          const cost = +asset.cost || 0;
          const useful = +asset.usefulLifeMonths || 0;
          if (cost <= 0) {
            outcome = { error: 'invalid_cost', message: 'cost debe ser > 0' };
            return s;
          }
          if (useful <= 0) {
            outcome = { error: 'invalid_useful_life', message: 'usefulLifeMonths debe ser > 0' };
            return s;
          }
          const n = (s.counters?.af || 0) + 1;
          const id = `AF-${String(n).padStart(3, '0')}`;
          const newAsset = {
            id,
            name: String(asset.name).trim(),
            category: asset.category,
            usage: asset.usage,
            cost,
            salvageValue: +asset.salvageValue || 0,
            usefulLifeMonths: useful,
            depAcumulada: +asset.depAcumulada || 0,
            estado: asset.estado || 'activo',
            startDate: asset.startDate || null,
          };
          outcome = { ok: true, id };
          return {
            ...s,
            fixedAssets: [...(s.fixedAssets || []), newAsset],
            counters: { ...s.counters, af: n },
          };
        });
        return outcome;
      },
      updateFixedAsset: (id, patch) =>
        setState((s) => ({
          ...s,
          fixedAssets: (s.fixedAssets || []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeFixedAsset: (id) =>
        setState((s) => ({
          ...s,
          fixedAssets: (s.fixedAssets || []).filter((a) => a.id !== id),
        })),
      runDepreciation: (periodId) => {
        let outcome;
        setState((s) => {
          const calc = calcDepreciationPreview(s.fixedAssets, periodId, s.depreciationRuns);
          if (calc.error || calc.warning) {
            outcome = calc;
            return s;
          }
          const runDraft = {
            id: 'DEP-' + periodId,
            periodId,
            runAt: nowISO(),
            items: calc.items,
            total: calc.total,
            journalEntryId: null,
          };
          const post = engPostDepreciation(runDraft, s);
          if (!post.ok) {
            outcome = post;
            return s;
          }
          const applied = applyJournalResult(s, post);
          const run = { ...runDraft, journalEntryId: post.journalEntry.id };
          outcome = {
            ok: true,
            runId: run.id,
            journalEntryId: post.journalEntry.id,
            total: run.total,
            itemCount: run.items.length,
          };
          return {
            ...applied,
            fixedAssets: (applied.fixedAssets || []).map((a) => {
              const item = calc.items.find((it) => it.assetId === a.id);
              return item ? { ...a, depAcumulada: item.depAcumNueva } : a;
            }),
            depreciationRuns: [run, ...(applied.depreciationRuns || [])],
          };
        });
        return outcome;
      },

      // ── Notas crédito / Notas débito (§7.9) ──────────────────────────────
      // Orquestación completa (numeración → idempotencia → asiento → reverso
      // COGS si aplica → registro NC/ND → update de factura → bump del
      // contador), todo en un setState atómico. Patrón calcado de
      // runDepreciation. amount opcional: si se omite, NC/ND total.
      emitNotaCredito: ({ invoiceId, amount, motivo }) => {
        let outcome;
        setState((s) => {
          const invoice = (s.invoices || []).find((i) => i.id === invoiceId);
          if (!invoice) {
            outcome = { error: 'invoice_not_found', message: `Factura ${invoiceId} no existe` };
            return s;
          }
          if (!motivo || !String(motivo).trim()) {
            outcome = { error: 'missing_motivo', message: 'Motivo requerido' };
            return s;
          }
          const total = +(invoice.total != null ? invoice.total : invoice.amount) || 0;
          const monto =
            amount === undefined || amount === null || amount === '' ? total : +amount;
          if (!(monto > 0)) {
            outcome = { error: 'amount_zero', message: 'Monto NC ≤ 0' };
            return s;
          }

          const num = nextDocNumber('NC', s.docNumbering);
          if (num.error) {
            outcome = num;
            return s;
          }

          // Idempotencia por si la acción se dispara dos veces antes de que
          // el bump del contador llegue al state (defensa en profundidad).
          const dup = (s.journalEntries || []).find(
            (j) => j.source === 'nota_credito' && j.sourceId === num.id,
          );
          if (dup) {
            outcome = { warning: 'already_posted', journalId: dup.id };
            return s;
          }

          const post = engEmitNotaCredito(
            { invoice, amount: monto, ncNumber: num.id, motivo },
            s,
          );
          if (!post.ok) {
            outcome = post;
            return s;
          }
          let next = applyJournalResult(s, post);

          // Reverso COGS proporcional (hoy devuelve skip por no haber JE de
          // cogs — se activa solo cuando H2/TD-21 esté cableado).
          const ratio = monto / total;
          const cogsRev = engPostCogsReversal(
            { invoice, ncNumber: num.id, ratio },
            next,
          );
          let cogsRevJEId = null;
          if (cogsRev?.ok) {
            next = applyJournalResult(next, cogsRev);
            cogsRevJEId = cogsRev.journalEntry?.id || null;
          }

          const isTotal = Math.abs(monto - total) < 0.5;
          const montoRound = Math.round(monto * 100) / 100;
          const ncRecord = {
            id: num.id,
            ncNumber: num.id,
            invoiceId,
            motivo: String(motivo).trim(),
            fecha: post.journalEntry.date,
            monto: montoRound,
            isTotal,
            journalEntryId: post.journalEntry.id,
            cogsReversalJournalEntryId: cogsRevJEId,
            createdBy: s.currentUser?.name || 'sistema',
            createdAt: nowISO(),
          };

          outcome = {
            ok: true,
            ncNumber: num.id,
            journalEntryId: post.journalEntry.id,
            cogsReversalJournalEntryId: cogsRevJEId,
            monto: montoRound,
            isTotal,
          };

          return {
            ...next,
            notasCredito: [ncRecord, ...(next.notasCredito || [])],
            docNumbering: (next.docNumbering || []).map((d) =>
              d.id === num.counterId ? { ...d, currentNumber: num.number } : d,
            ),
            invoices: (next.invoices || []).map((i) => {
              if (i.id !== invoiceId) return i;
              if (isTotal) {
                return { ...i, estado: 'anulada', anuladaPor: num.id };
              }
              return {
                ...i,
                notasCredito: [
                  ...(i.notasCredito || []),
                  { ncId: num.id, monto: montoRound, fecha: ncRecord.fecha },
                ],
              };
            }),
          };
        });
        return outcome;
      },

      emitNotaDebito: ({ invoiceId, amount, motivo }) => {
        let outcome;
        setState((s) => {
          const invoice = (s.invoices || []).find((i) => i.id === invoiceId);
          if (!invoice) {
            outcome = { error: 'invoice_not_found', message: `Factura ${invoiceId} no existe` };
            return s;
          }
          if (!motivo || !String(motivo).trim()) {
            outcome = { error: 'missing_motivo', message: 'Motivo requerido' };
            return s;
          }
          const monto = +amount;
          if (!(monto > 0)) {
            outcome = { error: 'amount_zero', message: 'Monto ND debe ser > 0' };
            return s;
          }

          const num = nextDocNumber('ND', s.docNumbering);
          if (num.error) {
            outcome = num;
            return s;
          }

          const dup = (s.journalEntries || []).find(
            (j) => j.source === 'nota_debito' && j.sourceId === num.id,
          );
          if (dup) {
            outcome = { warning: 'already_posted', journalId: dup.id };
            return s;
          }

          const post = engEmitNotaDebito(
            { invoice, amount: monto, ndNumber: num.id, motivo },
            s,
          );
          if (!post.ok) {
            outcome = post;
            return s;
          }
          const next = applyJournalResult(s, post);

          const montoRound = Math.round(monto * 100) / 100;
          const ndRecord = {
            id: num.id,
            ndNumber: num.id,
            invoiceId,
            motivo: String(motivo).trim(),
            fecha: post.journalEntry.date,
            monto: montoRound,
            journalEntryId: post.journalEntry.id,
            createdBy: s.currentUser?.name || 'sistema',
            createdAt: nowISO(),
          };

          outcome = {
            ok: true,
            ndNumber: num.id,
            journalEntryId: post.journalEntry.id,
            monto: montoRound,
          };

          return {
            ...next,
            notasDebito: [ndRecord, ...(next.notasDebito || [])],
            docNumbering: (next.docNumbering || []).map((d) =>
              d.id === num.counterId ? { ...d, currentNumber: num.number } : d,
            ),
            invoices: (next.invoices || []).map((i) =>
              i.id === invoiceId
                ? {
                    ...i,
                    notasDebito: [
                      ...(i.notasDebito || []),
                      { ndId: num.id, monto: montoRound, fecha: ndRecord.fecha },
                    ],
                  }
                : i,
            ),
          };
        });
        return outcome;
      },

      // Restablece a los valores seed (botón "Reset Data Demo").
      resetDemo: () => {
        resetState();
        setState(buildInitialState());
      },

      // ── Motor contable ──────────────────────────────────────────────────
      // Cada acción devuelve el `res` del motor (ok / error) para que la UI
      // muestre el toast o feedback. El state se aplica inmutablemente.
      postJournalEntry: (payload) => {
        let outcome;
        setState((s) => {
          outcome = engPostJE(payload, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postManualEntry: (payload) => {
        let outcome;
        setState((s) => {
          outcome = engPostManual(payload, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postSale: (invoice) => {
        let outcome;
        setState((s) => {
          outcome = engPostSale(invoice, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postCustomerCollection: (payment) => {
        let outcome;
        setState((s) => {
          outcome = engPostCollection(payment, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postSupplyPurchase: (receipt) => {
        let outcome;
        setState((s) => {
          outcome = engPostSupplyPurchase(receipt, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postSupplierPayment: (outgoing) => {
        let outcome;
        setState((s) => {
          outcome = engPostSupplierPayment(outgoing, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postPayroll: (run) => {
        let outcome;
        setState((s) => {
          outcome = engPostPayroll(run, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postWarrantyCost: (warranty, costEntry) => {
        let outcome;
        setState((s) => {
          outcome = engPostWarrantyCost(warranty, costEntry, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      postBankAdjustment: (adj) => {
        let outcome;
        setState((s) => {
          outcome = engPostBankAdjustment(adj, s);
          return applyJournalResult(s, outcome);
        });
        return outcome;
      },
      reverseJournalEntry: (jeId, reason) => {
        let outcome;
        setState((s) => {
          outcome = engReverse(jeId, reason, s);
          if (!outcome?.ok) return s;
          // Aplica el reverso y marca el original como 'reversed'.
          const applied = applyJournalResult(s, outcome);
          return {
            ...applied,
            journalEntries: applied.journalEntries.map((j) =>
              j.id === outcome.reversedOriginalId
                ? { ...j, status: 'reversed', reversedBy: outcome.journalEntry.id }
                : j,
            ),
          };
        });
        return outcome;
      },

      // ── Cierres de periodo / año fiscal (C2b) ────────────────────────────
      // El asiento de cierre se postea ANTES de marcar el periodo cerrado (su
      // fecha cae dentro del periodo); todo en un setState atómico.
      closeFiscalPeriod: (periodId) => {
        let outcome;
        setState((s) => {
          outcome = engClosePeriod(periodId, s);
          if (outcome.error || outcome.warning) return s;
          const next = outcome.journalEntry ? applyJournalResult(s, outcome) : s;
          return {
            ...next,
            fiscalPeriods: next.fiscalPeriods.map((p) =>
              p.id === periodId
                ? {
                    ...p,
                    estado: 'cerrado',
                    closedAt: nowISO(),
                    closingJournalEntryId: outcome.journalEntry?.id || null,
                  }
                : p,
            ),
          };
        });
        return outcome;
      },
      reopenFiscalPeriod: (periodId) => {
        let outcome;
        setState((s) => {
          outcome = engReopenPeriod(periodId, s);
          if (outcome.error) return s;
          let next = s;
          if (outcome.reversal?.ok) {
            const applied = applyJournalResult(s, outcome.reversal);
            next = {
              ...applied,
              journalEntries: applied.journalEntries.map((j) =>
                j.id === outcome.reversal.reversedOriginalId
                  ? { ...j, status: 'reversed', reversedBy: outcome.reversal.journalEntry.id }
                  : j,
              ),
            };
          }
          return {
            ...next,
            fiscalPeriods: next.fiscalPeriods.map((p) =>
              p.id === periodId
                ? { ...p, estado: 'abierto', closingJournalEntryId: null, reopenedAt: nowISO() }
                : p,
            ),
          };
        });
        return outcome;
      },
      closeFiscalYear: (year) => {
        let outcome;
        setState((s) => {
          outcome = engCloseFiscalYear(year, s);
          if (outcome.error || outcome.warning) return s;
          let next = { ...s };
          for (const { je, lines } of outcome.jesToAppend) {
            next = {
              ...next,
              journalEntries: [je, ...next.journalEntries],
              journalLines: [...next.journalLines, ...lines],
            };
          }
          return {
            ...next,
            counters: { ...next.counters, ...outcome.counters },
            fiscalPeriods: next.fiscalPeriods.map((p) =>
              outcome.periodPatches[p.id] ? { ...p, ...outcome.periodPatches[p.id] } : p,
            ),
          };
        });
        return outcome;
      },
    }),
    [],
  );

  const value = useMemo(
    () => ({ ...state, ...actions, setState, pendingForm, setPendingForm }),
    [state, actions, pendingForm],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
