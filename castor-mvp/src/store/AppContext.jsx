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
  reverseJournalEntry as engReverse,
  applyJournalResult,
} from '../lib/accountingEngine';

// Slices contables: siempre se siembran desde el código (catálogo/asientos
// estáticos). La Contabilidad queda fuera de alcance hasta tener castor_accounting.js.
const ACCOUNTING_SEED = () => ({
  pucAccounts: PUC_CATALOG,
  journalEntries: SEED_JOURNAL_ENTRIES,
  journalLines: SEED_JOURNAL_LINES,
  fiscalPeriods: SEED_FISCAL_PERIODS,
  costCenters: SEED_COST_CENTERS,
});

function buildInitialState() {
  return {
    ...ACCOUNTING_SEED(),
    // Editables de contabilidad (sí se persisten)
    bankAccounts: SEED_BANK_ACCOUNTS,
    companyTaxProfile: SEED_TAX_PROFILE,
    payrollParams: SEED_PAYROLL_PARAMS,
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
    counters: { lead: 105, cot: 2002, ped: 1253, op: 5004, gar: 51, pag: 504, out: 32, emp: 7, inn: 2, mkt: 12, sup: 5, insumo: 8, oc: 3003, prod: 8, dsp: 2, fac: 2, rem: 14, cli: 4 },
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
