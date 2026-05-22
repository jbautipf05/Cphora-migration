import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

const STORAGE_KEY = 'castor_cphora_contab_v1';

function buildInitialState() {
  return {
    // Contabilidad
    pucAccounts: PUC_CATALOG,
    journalEntries: SEED_JOURNAL_ENTRIES,
    journalLines: SEED_JOURNAL_LINES,
    bankAccounts: SEED_BANK_ACCOUNTS,
    fiscalPeriods: SEED_FISCAL_PERIODS,
    costCenters: SEED_COST_CENTERS,
    companyTaxProfile: SEED_TAX_PROFILE,
    payrollParams: SEED_PAYROLL_PARAMS,
    // ERP — Comercial / Operación / Finanzas / Admin
    warehouses: WAREHOUSES,
    products: PRODUCTS,
    suppliers: SUPPLIERS,
    supplies: SUPPLIES,
    purchaseOrders: PURCHASE_ORDERS,
    customers: CUSTOMERS,
    invoices: INVOICES,
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
    currentUser: { id: 'u1', name: 'Alexander Vivas', role: 'gerencia' },
  };
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Hidratación: localStorage (simula persistencia) → fallback al seed.
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // El catálogo PUC y los asientos siempre vienen del código (seed),
        // solo persistimos lo editable por el usuario.
        return {
          ...buildInitialState(),
          bankAccounts: parsed.bankAccounts ?? SEED_BANK_ACCOUNTS,
          companyTaxProfile: parsed.companyTaxProfile ?? SEED_TAX_PROFILE,
          payrollParams: parsed.payrollParams ?? SEED_PAYROLL_PARAMS,
        };
      }
    } catch {
      /* ignora estado corrupto */
    }
    return buildInitialState();
  });

  // Persiste lo editable cada vez que cambia (simula el save() del demo).
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          bankAccounts: state.bankAccounts,
          companyTaxProfile: state.companyTaxProfile,
          payrollParams: state.payrollParams,
        }),
      );
    } catch {
      /* almacenamiento no disponible */
    }
  }, [state.bankAccounts, state.companyTaxProfile, state.payrollParams]);

  // ── Handlers (listos para enrutar a Supabase en la siguiente fase) ──
  const actions = useMemo(
    () => ({
      // Guarda perfil tributario + parámetros de nómina (Configuración).
      saveTaxAndPayroll: ({ companyTaxProfile, payrollParams }) =>
        setState((s) => ({
          ...s,
          companyTaxProfile: companyTaxProfile ?? s.companyTaxProfile,
          payrollParams: payrollParams ?? s.payrollParams,
        })),

      // CRUD de cuentas bancarias (§7.8).
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
      resetDemo: () => setState(buildInitialState()),
    }),
    [],
  );

  const value = useMemo(() => ({ ...state, ...actions, setState }), [state, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
