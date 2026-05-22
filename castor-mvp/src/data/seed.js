// Seed inicial del módulo de Contabilidad.
// Extraído / reconstruido a partir de:
//   · Castor_Dashboard_Demo6.html  → bankAccounts, companyTaxProfile, operaciones (FAC/REM/PED/nómina)
//   · CASTOR_1.PDF (Doc 1 §7.8/§7.11, Doc 2)  → cuentas v1.1, params PAYROLL_2026, mapeo de asientos
//
// Cada asiento (journalEntry) tiene débitos = créditos, por lo que la
// ecuación contable A = P + Patrimonio + Utilidad cuadra por construcción.
// Cuando llegue Supabase, este objeto se reemplaza por la hidratación en login.

import { PAYROLL_2026 } from '../lib/accounting';

// ── Cuentas bancarias por defecto (corrección v1.1 del brief §7.8) ──
export const SEED_BANK_ACCOUNTS = [
  { id: 'B-01', bank: 'Bancolombia', type: 'Corriente', number: '****4521', holder: 'Castor SAS', balance: 148500000, color: '#FFCC00', pucCode: '111005' },
  { id: 'B-02', bank: 'BBVA', type: 'Empresarial', number: '****1122', holder: 'Castor SAS', balance: 85750000, color: '#004481', pucCode: '111010' },
  { id: 'B-03', bank: 'Bold', type: 'Recaudo', number: '****8800', holder: 'Castor SAS', balance: 23400000, color: '#111827', pucCode: '111015' },
  { id: 'B-04', bank: 'Lulo Bank', type: 'Ahorros', number: '****7777', holder: 'Castor SAS', balance: 18200000, color: '#FF5A36', pucCode: '111020' },
];

// ── Perfil tributario (Demo6 seed + payrollParams v1.1) ──
export const SEED_TAX_PROFILE = {
  nit: '900XXXXXXX-X',
  razonSocial: 'Castor SAS',
  responsableIVA: true,
  periodicidadIVA: 'bimestral',
  regimenTributario: 'ordinario',
  responsableICA: true,
  ciudadICA: 'Bogotá',
  tarifaICAporMil: 9.66,
  autoretenedor: false,
  uvtVigente: 49799,
};

// ── Parámetros de nómina (defaults PAYROLL_2026, totalmente editables · §7.11) ──
// Se siembran desde la constante real del núcleo contable.
export const SEED_PAYROLL_PARAMS = { ...PAYROLL_2026 };

// ── Periodos fiscales (2026-01..04; primeros tres cerrados) ──
export const SEED_FISCAL_PERIODS = [
  { id: '2026-01', label: 'Enero 2026', estado: 'cerrado' },
  { id: '2026-02', label: 'Febrero 2026', estado: 'cerrado' },
  { id: '2026-03', label: 'Marzo 2026', estado: 'cerrado' },
  { id: '2026-04', label: 'Abril 2026', estado: 'abierto' },
];

// ── Centros de costo ──
export const SEED_COST_CENTERS = [
  { id: 'CEDI', name: 'CEDI' },
  { id: 'TALLER', name: 'Taller / Producción' },
  { id: 'VENTAS', name: 'Ventas' },
  { id: 'ADMIN', name: 'Administración' },
  { id: 'CTG', name: 'Cartagena' },
  { id: 'VOL', name: 'Volcanes' },
];

// ── Asientos contables (Libro Diario) ──
// Helper para construir un asiento balanceado y sus líneas.
let _lineSeq = 0;
const L = (journalId, accountCode, debit, credit, extra = {}) => ({
  id: `JL-${String(++_lineSeq).padStart(4, '0')}`,
  journalId,
  accountCode,
  debit: debit || 0,
  credit: credit || 0,
  thirdParty: extra.thirdParty || null,
  costCenter: extra.costCenter || null,
});

const ENTRIES = [
  {
    je: { id: 'JE-000001', date: '2026-01-01', period: '2026-01', source: 'apertura', sourceId: 'OPEN-2026', concept: 'Saldo de apertura ejercicio 2026', status: 'posted' },
    lines: [
      ['111005', 148500000, 0],
      ['111010', 85750000, 0],
      ['111015', 23400000, 0],
      ['111020', 18200000, 0],
      ['143005', 60000000, 0],
      ['140505', 40000000, 0],
      ['152405', 18000000, 0],
      ['152805', 9000000, 0],
      ['159220', 0, 4800000],
      ['310505', 0, 397450000],
      ['370505', 0, 600000],
    ],
  },
  {
    je: { id: 'JE-000002', date: '2026-02-20', period: '2026-02', source: 'sale_invoice', sourceId: 'FAC-002', concept: 'Venta factura FAC-002 · Adriano Villadiego', status: 'posted' },
    lines: [
      ['130505', 18900000, 0, { thirdParty: 'Adriano Villadiego' }],
      ['412035', 0, 15882353],
      ['240805', 0, 3017647],
    ],
  },
  {
    je: { id: 'JE-000003', date: '2026-02-20', period: '2026-02', source: 'cost_of_sale', sourceId: 'FAC-002', concept: 'Costo de venta FAC-002 · Módulo Roma', status: 'posted' },
    lines: [
      ['612035', 4600000, 0, { costCenter: 'VENTAS' }],
      ['143005', 0, 4600000],
    ],
  },
  {
    je: { id: 'JE-000004', date: '2026-03-10', period: '2026-03', source: 'sale_invoice', sourceId: 'REM-014', concept: 'Remisión REM-014 · María Delgado (sin IVA)', status: 'posted' },
    lines: [
      ['130505', 12200000, 0, { thirdParty: 'María Delgado' }],
      ['412035', 0, 12200000],
    ],
  },
  {
    je: { id: 'JE-000005', date: '2026-03-25', period: '2026-03', source: 'supply_purchase', sourceId: 'OC-3003', concept: 'Compra OC-3003 · Pinturas Industriales SA', status: 'posted' },
    lines: [
      ['140505', 2240000, 0],
      ['240810', 425600, 0],
      ['220505', 0, 2609600, { thirdParty: 'Pinturas Industriales SA' }],
      ['236540', 0, 56000, { thirdParty: 'Pinturas Industriales SA' }],
    ],
  },
  {
    je: { id: 'JE-000006', date: '2026-03-30', period: '2026-03', source: 'raw_material_consumption', sourceId: 'ISS-021', concept: 'Salida de insumos a producción · OP Módulo Roma', status: 'posted' },
    lines: [
      ['710505', 5200000, 0, { costCenter: 'TALLER' }],
      ['140505', 0, 5200000],
    ],
  },
  {
    je: { id: 'JE-000007', date: '2026-04-06', period: '2026-04', source: 'sale_invoice', sourceId: 'FAC-001', concept: 'Venta factura FAC-001 · Jose Ramírez', status: 'posted' },
    lines: [
      ['130505', 7850000, 0, { thirdParty: 'Jose Ramírez' }],
      ['412035', 0, 6596639],
      ['240805', 0, 1253361],
    ],
  },
  {
    je: { id: 'JE-000008', date: '2026-04-06', period: '2026-04', source: 'cost_of_sale', sourceId: 'FAC-001', concept: 'Costo de venta FAC-001 · Butaca Serenity', status: 'posted' },
    lines: [
      ['612035', 3600000, 0, { costCenter: 'VENTAS' }],
      ['143005', 0, 3600000],
    ],
  },
  {
    je: { id: 'JE-000009', date: '2026-04-06', period: '2026-04', source: 'customer_collection', sourceId: 'PAG-502', concept: 'Cobro FAC-001 · Jose Ramírez (Bancolombia)', status: 'posted' },
    lines: [
      ['111005', 7850000, 0],
      ['130505', 0, 7850000, { thirdParty: 'Jose Ramírez' }],
    ],
  },
  {
    je: { id: 'JE-000010', date: '2026-04-30', period: '2026-04', source: 'payroll', sourceId: 'NOM-2026-04', concept: 'Nómina abril 2026 (devengado + provisiones + aportes)', status: 'posted' },
    lines: [
      ['720505', 4200000, 0, { costCenter: 'TALLER' }],
      ['510506', 21900000, 0, { costCenter: 'ADMIN' }],
      ['510568', 4312242, 0, { costCenter: 'ADMIN' }],
      ['510530', 5697630, 0, { costCenter: 'ADMIN' }],
      ['250505', 0, 24012000],
      ['237005', 0, 6400242],
      ['261005', 0, 5697630],
    ],
  },
  {
    je: { id: 'JE-000011', date: '2026-04-30', period: '2026-04', source: 'depreciation', sourceId: 'DEP-2026-04', concept: 'Depreciación mensual abril 2026 (línea recta)', status: 'posted' },
    lines: [
      ['516015', 300000, 0, { costCenter: 'ADMIN' }],
      ['526010', 250000, 0, { costCenter: 'VENTAS' }],
      ['159220', 0, 300000],
      ['159225', 0, 250000],
    ],
  },
  {
    je: { id: 'JE-000012', date: '2026-04-30', period: '2026-04', source: 'supplier_payment', sourceId: 'OUT-031', concept: 'Pago proveedor OC-3003 · Pinturas Industriales SA', status: 'posted' },
    lines: [
      ['220505', 2609600, 0, { thirdParty: 'Pinturas Industriales SA' }],
      ['111005', 0, 2609600],
    ],
  },
];

export const SEED_JOURNAL_ENTRIES = ENTRIES.map((e) => e.je);
export const SEED_JOURNAL_LINES = ENTRIES.flatMap((e) =>
  e.lines.map(([code, d, c, extra]) => L(e.je.id, code, d, c, extra)),
);
