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

// Empleados (Demo6 seed) — alimentan el preview de nómina.
const SEED_EMPLOYEES = [
  { id: 'E-001', name: 'Alexander Vivas', role: 'Gerente Comercial', area: 'Ventas', salario: 6500000 },
  { id: 'E-002', name: 'Thalia Cifuentes', role: 'Asesora Comercial', area: 'Ventas', salario: 3500000 },
  { id: 'E-003', name: 'Nelson Díaz', role: 'Jefe de Taller', area: 'Producción', salario: 4200000 },
  { id: 'E-004', name: 'Yolanda Reyes', role: 'Contadora', area: 'Contabilidad', salario: 4800000 },
  { id: 'E-005', name: 'Mario Estrada', role: 'Auxiliar Almacén', area: 'Almacén', salario: 1900000 },
  { id: 'E-006', name: 'Luisa Ortega', role: 'Coord. Bodega Ctg', area: 'Almacén', salario: 2600000 },
  { id: 'E-007', name: 'Héctor Pulido', role: 'Coord. Bodega Volcanes', area: 'Almacén', salario: 2600000 },
];

const STORAGE_KEY = 'castor_cphora_contab_v1';

function buildInitialState() {
  return {
    pucAccounts: PUC_CATALOG,
    journalEntries: SEED_JOURNAL_ENTRIES,
    journalLines: SEED_JOURNAL_LINES,
    bankAccounts: SEED_BANK_ACCOUNTS,
    fiscalPeriods: SEED_FISCAL_PERIODS,
    costCenters: SEED_COST_CENTERS,
    employees: SEED_EMPLOYEES,
    companyTaxProfile: SEED_TAX_PROFILE,
    payrollParams: SEED_PAYROLL_PARAMS,
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
