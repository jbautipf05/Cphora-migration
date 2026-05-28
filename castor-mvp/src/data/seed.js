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

// ── Mapeo de cuentas por evento (C3a · portado de castor_accounting.js:308-359) ──
// Define qué cuenta PUC usa cada evento operativo. Es estado editable persistido
// (la UI permite restaurar este default). Por ahora vive como capa de configuración:
// los hooks del motor aún usan cuentas hardcoded; el cableado posterior (que el motor
// lea estos mapeos) es un refactor aparte ligado a TD-07 (centralizar códigos PUC).
export const SEED_ACCOUNTING_MAPPINGS = {
  sale_invoice: {
    receivable: '130505',
    revenue: '412035',
    iva_generated: '240805',
    discount_account: '417505',
  },
  sale_remision: { receivable: '130505', revenue: '412035' },
  customer_advance: { bank_default: '111005', advance_received: '280505' },
  customer_collection: {
    bank_default: '111005',
    receivable: '130505',
    advance_received: '280505',
    rete_fuente_received: '135515',
    rete_iva_received: '135517',
    rete_ica_received: '135518',
  },
  supply_purchase: {
    inventory_raw: '140505',
    iva_descontable: '240810',
    payable: '220505',
    rete_fuente_practiced: '236540',
    rete_iva_practiced: '236701',
    rete_ica_practiced: '236801',
  },
  supply_consumption: { raw_consumed: '710505', inventory_raw: '140505', wip: '141005' },
  finished_goods_in: { finished_goods: '143005', wip: '141005', raw_inventory: '140505' },
  cogs_on_invoice: { cogs: '612035', finished_goods: '143005' },
  supplier_payment: { payable: '220505', bank_default: '111005', expense_default: '529595' },
  payroll: {
    salary_admin: '510506',
    salary_sales: '520506',
    salary_mod: '720505',
    transport_aux: '510527',
    // Provisiones admin (áreas no MOD)
    cesantias_provision: '510530',
    int_cesantias_provision: '510533',
    prima_provision: '510536',
    vacaciones_provision: '510539',
    // Provisiones MOD (Producción)
    cesantias_provision_mod: '730527',
    int_cesantias_provision_mod: '730530',
    prima_provision_mod: '730533',
    vacaciones_provision_mod: '730536',
    // Aportes empleador admin
    eps_employer: '510560',
    pension_employer: '510568',
    arl_employer: '510569',
    parafiscales_employer: '510570',
    // Aportes empleador MOD (consolidado en 720570)
    employer_charges_mod: '720570',
    // Pasivos
    rete_fuente_employee: '236505',
    eps_payable: '237005',
    pension_payable: '237006',
    arl_payable: '237010',
    parafiscales_payable: '237030',
    cesantias_payable: '251005',
    int_cesantias_payable: '251505',
    prima_payable: '252005',
    vacaciones_payable: '252505',
    salary_payable: '250505',
  },
  warranty_cost: { warranty_expense: '519540', cash: '110510', raw_used: '140505' },
  depreciation: {
    expense_admin: '516015',
    expense_sales: '526010',
    expense_cif: '730560',
    accumulated: '159220',
    accumulated_oficina: '159220',
    accumulated_computacion: '159225',
    accumulated_transporte: '159240',
    accumulated_construcciones: '159205',
  },
  bank_adjustment: { diff_positive: '425095', diff_negative: '539595' },
  gmf_4x1000: { gmf_expense: '530595' },
  nota_credito: { sales_returns: '417505', iva_generated: '240805', receivable: '130505' },
  nota_debito: { receivable: '130505', revenue: '412035', iva_generated: '240805' },
};

// ── Reglas tributarias (C3b · portado de castor_accounting.js:361-372) ──
// 8 reglas seed: 3 IVAs (19/5/0), 3 ReteFte (compras/servicios/honorarios),
// ReteIVA, ReteICA Bogotá. Editable persistido. Restricción: un solo `isDefault`
// por `type` (la UI lo enforza). Las reglas tipo `iva` usan account_generated +
// account_descontable; las demás usan `account` singular.
export const SEED_TAX_RULES = [
  { id: 'IVA-19', type: 'iva', name: 'IVA 19%', rate: 0.19, account_generated: '240805', account_descontable: '240810', isDefault: true },
  { id: 'IVA-5', type: 'iva', name: 'IVA 5%', rate: 0.05, account_generated: '240805', account_descontable: '240810' },
  { id: 'IVA-0', type: 'iva', name: 'IVA 0% / excluido', rate: 0, account_generated: null, account_descontable: null, appliesToRemision: true },
  { id: 'RTF-25', type: 'rete_fuente', name: 'Compras 2.5%', rate: 0.025, account: '236540', baseUVT: 27, conceptCode: 'COMP' },
  { id: 'RTF-35', type: 'rete_fuente', name: 'Servicios 3.5%', rate: 0.035, account: '236525', baseUVT: 4, conceptCode: 'SERV' },
  { id: 'RTF-11', type: 'rete_fuente', name: 'Honorarios 11%', rate: 0.11, account: '236515', baseUVT: 0, conceptCode: 'HON' },
  { id: 'RIVA-15', type: 'rete_iva', name: 'ReteIVA 15%', rate: 0.15, account: '236701', appliesOver: 'iva' },
  { id: 'RICA-BOG', type: 'rete_ica', name: 'ReteICA Bogotá 9.66×1000', rate: 0.00966, account: '236801', baseUVT: 27 },
];

// ── Activos fijos (módulo · portado del shape del monolito castor_accounting.js) ──
// 7 activos representativos del negocio Castor: mezcla de categorías
// (oficina/computacion/transporte/otros) y usages (admin/sales/cif). El campo
// `depAcumulada` refleja meses ya depreciados desde el `startDate` (simula que
// la empresa lleva operando ~3 años antes de la implementación del ERP).
// La depreciación es línea recta: depMensual = (cost - salvageValue) / usefulLifeMonths.
export const SEED_FIXED_ASSETS = [
  { id: 'AF-001', name: 'Escritorios y mobiliario oficina', category: 'oficina', usage: 'admin', cost: 5000000, salvageValue: 500000, usefulLifeMonths: 60, depAcumulada: 1500000, estado: 'activo', startDate: '2024-04-01' },
  { id: 'AF-002', name: 'Equipos de cómputo gerencia', category: 'computacion', usage: 'admin', cost: 12000000, salvageValue: 1200000, usefulLifeMonths: 36, depAcumulada: 6000000, estado: 'activo', startDate: '2024-04-01' },
  { id: 'AF-003', name: 'Camioneta de despacho Bogotá', category: 'transporte', usage: 'sales', cost: 80000000, salvageValue: 20000000, usefulLifeMonths: 84, depAcumulada: 17142857, estado: 'activo', startDate: '2024-04-01' },
  { id: 'AF-004', name: 'Torno industrial taller', category: 'otros', usage: 'cif', cost: 35000000, salvageValue: 5000000, usefulLifeMonths: 120, depAcumulada: 6000000, estado: 'activo', startDate: '2024-04-01' },
  { id: 'AF-005', name: 'POS showroom Castor 43', category: 'computacion', usage: 'sales', cost: 4000000, salvageValue: 400000, usefulLifeMonths: 36, depAcumulada: 2000000, estado: 'activo', startDate: '2024-04-01' },
  { id: 'AF-006', name: 'Cámaras de seguridad CEDI', category: 'oficina', usage: 'admin', cost: 3500000, salvageValue: 0, usefulLifeMonths: 60, depAcumulada: 233333, estado: 'activo', startDate: '2026-01-01' },
  { id: 'AF-007', name: 'Licencias software contable (legado)', category: 'otros', usage: 'admin', cost: 2500000, salvageValue: 0, usefulLifeMonths: 36, depAcumulada: 2500000, estado: 'inactivo', startDate: '2022-01-01' },
];

// Corridas de depreciación (historial). Seed vacío — se va llenando al correr
// el proceso desde la vista ActivosFijos.
export const SEED_DEPRECIATION_RUNS = [];

// ── Numeración de documentos (C3c · portado de castor_accounting.js:374-381) ──
// 4 consecutivos internos: FAC (factura), REM (remisión), NC (nota crédito),
// ND (nota débito). Editable persistido. NO oficial DIAN — la facturación oficial
// se gestiona en sistema externo (proveedor tecnológico autorizado, fuera del MVP).
export const SEED_DOC_NUMBERING = [
  { id: 'NUM-FAC', kind: 'FAC', prefix: 'FAC', rangeFrom: 1, rangeTo: 5000, currentNumber: 0, active: true, description: 'Facturas de venta · numeración interna' },
  { id: 'NUM-REM', kind: 'REM', prefix: 'REM', rangeFrom: 1, rangeTo: 9999, currentNumber: 14, active: true, description: 'Remisiones · numeración interna' },
  { id: 'NUM-NC', kind: 'NC', prefix: 'NC', rangeFrom: 1, rangeTo: 999, currentNumber: 0, active: true, description: 'Notas crédito · numeración interna' },
  { id: 'NUM-ND', kind: 'ND', prefix: 'ND', rangeFrom: 1, rangeTo: 999, currentNumber: 0, active: true, description: 'Notas débito · numeración interna' },
];

// ── Notas crédito / Notas débito (§7.9 · portado de castor_accounting.js:5870-6099) ──
// Editables persistidos. Empiezan vacíos: se llenan al emitir desde Ventas. Cada
// registro lleva su journalEntryId (asiento principal) y, en el caso de NC con
// reverso COGS, también cogsReversalJournalEntryId.
export const SEED_NOTAS_CREDITO = [];
export const SEED_NOTAS_DEBITO = [];

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
  // Nota: el JE histórico de depreciación de abril (DEP-2026-04) fue eliminado del
  // seed para que el usuario pueda correr el proceso desde la vista ActivosFijos
  // sin colisión por idempotencia. Los `depAcumulada` del SEED_FIXED_ASSETS
  // reflejan el estado PRE-abril.
  {
    je: { id: 'JE-000011', date: '2026-04-30', period: '2026-04', source: 'supplier_payment', sourceId: 'OUT-031', concept: 'Pago proveedor OC-3003 · Pinturas Industriales SA', status: 'posted' },
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
