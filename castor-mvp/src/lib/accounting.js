// ───────────────────────────────────────────────────────────────────────────
// Núcleo contable del lado del cliente.
// Funciones puras sobre (cuentas PUC, asientos, líneas). Reemplazables 1:1 por
// castor_accounting.js (getSaldoCuenta, getSaldosPorClase, runPayroll, etc.)
// cuando se conecte el motor real + Supabase.
// ───────────────────────────────────────────────────────────────────────────

import { PUC_BY_CODE, PUC_CATALOG } from '../data/pucCatalog';

// ── Constante de nómina Colombia 2026 (defaults reales del negocio · §7.11) ──
// Es la fuente de verdad del cálculo de nómina. El usuario puede sobrescribir
// estos valores desde Configuración → state.payrollParams (paramsSnapshot).
export const PAYROLL_2026 = Object.freeze({
  smmlv: 1423500,
  auxTransporte: 200000,
  auxTransporteTopeSmmlv: 2,
  saludEmpleado: 4,
  saludEmpleador: 8.5,
  pensionEmpleado: 4,
  pensionEmpleador: 12,
  arlPorcentaje: 0.522,
  arlNivelRiesgo: 'III',
  sena: 2,
  icbf: 3,
  cajaCompensacion: 4,
  exoneracionLey1607Smmlv: 10,
  provCesantias: 8.33,
  provIntCesantias: 1,
  provPrima: 8.33,
  provVacaciones: 4.17,
});

// ── Bancos por defecto v1.1 (§7.8) — referencia del núcleo ──
export const DEFAULT_BANKS_V11 = ['Bancolombia', 'BBVA', 'Bold', 'Lulo Bank'];

// fmtCOP / fmtNum: fuente única en lib/format.js. Se re-exportan aquí por
// compatibilidad con las vistas contables que ya importan desde este módulo
// (B3 / TD-26). Antes había una copia idéntica acá que podía divergir.
export { fmtCOP, fmtNum } from './format';

// Saldo de una cuenta auxiliar según su naturaleza.
// saldo = naturaleza 'debito' ? (debe - haber) : (haber - debe)
export function saldoPorNaturaleza(code, debe, haber) {
  const acc = PUC_BY_CODE[code];
  const nature = acc?.nature || 'debito';
  return nature === 'debito' ? debe - haber : haber - debe;
}

// Filtra líneas por periodo (si se pasa) usando la cabecera del asiento.
function linesForPeriod(lines, entries, period) {
  if (!period || period === 'all') return lines;
  const ids = new Set(entries.filter((e) => e.period === period).map((e) => e.id));
  return lines.filter((l) => ids.has(l.journalId));
}

// Movimientos (debe/haber) acumulados por cuenta auxiliar.
export function movimientosPorCuenta(lines, entries, period) {
  const scoped = linesForPeriod(lines, entries, period);
  const map = {};
  for (const l of scoped) {
    if (!map[l.accountCode]) map[l.accountCode] = { debe: 0, haber: 0 };
    map[l.accountCode].debe += l.debit;
    map[l.accountCode].haber += l.credit;
  }
  return map;
}

// Balance de prueba: una fila por cuenta auxiliar con movimiento.
// Columnas: saldo inicial, movimientos del periodo (debe/haber), saldo final.
export function buildBalancePrueba(lines, entries, period) {
  // Movimientos hasta el inicio del periodo (saldo inicial) y dentro del periodo.
  const periodList = [...new Set(entries.map((e) => e.period))].sort();
  const idx = period && period !== 'all' ? periodList.indexOf(period) : -1;
  const prevPeriods = idx > 0 ? periodList.slice(0, idx) : [];

  const movPeriodo = movimientosPorCuenta(lines, entries, period);

  // Saldo inicial = suma de movimientos de periodos anteriores.
  const movPrevios = {};
  for (const p of prevPeriods) {
    const m = movimientosPorCuenta(lines, entries, p);
    for (const [code, v] of Object.entries(m)) {
      if (!movPrevios[code]) movPrevios[code] = { debe: 0, haber: 0 };
      movPrevios[code].debe += v.debe;
      movPrevios[code].haber += v.haber;
    }
  }

  const codes = new Set([...Object.keys(movPeriodo), ...Object.keys(movPrevios)]);
  const rows = [];
  for (const code of codes) {
    const acc = PUC_BY_CODE[code];
    if (!acc) continue;
    const prev = movPrevios[code] || { debe: 0, haber: 0 };
    const cur = movPeriodo[code] || { debe: 0, haber: 0 };
    const saldoInicial = saldoPorNaturaleza(code, prev.debe, prev.haber);
    const saldoFinal = saldoPorNaturaleza(code, prev.debe + cur.debe, prev.haber + cur.haber);
    rows.push({
      code,
      name: acc.name,
      classCode: acc.classCode,
      saldoInicial,
      debe: cur.debe,
      haber: cur.haber,
      saldoFinal,
    });
  }
  rows.sort((a, b) => a.code.localeCompare(b.code));

  const totals = rows.reduce(
    (t, r) => {
      t.debe += r.debe;
      t.haber += r.haber;
      return t;
    },
    { debe: 0, haber: 0 },
  );
  return { rows, totals, cuadra: Math.round(totals.debe - totals.haber) === 0 };
}

// Saldos por clase (1..7) y verificación de la ecuación contable.
export function getSaldosPorClase(lines, entries, period) {
  const mov = movimientosPorCuenta(lines, entries, period);
  const porClase = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const [code, v] of Object.entries(mov)) {
    const acc = PUC_BY_CODE[code];
    if (!acc || acc.level < 6) continue; // solo auxiliares (hojas)
    porClase[acc.classCode] = (porClase[acc.classCode] || 0) + (v.debe - v.haber);
  }
  const activo = porClase[1];
  const pasivo = -porClase[2];
  const patrimonio = -porClase[3];
  const ingresos = -porClase[4];
  const gastos = porClase[5] + porClase[6] + porClase[7];
  const utilidad = ingresos - gastos;
  return {
    activo,
    pasivo,
    patrimonio,
    ingresos,
    gastos,
    utilidad,
    ecuacionCuadra: Math.round(activo - (pasivo + patrimonio + utilidad)) === 0,
    diferencia: activo - (pasivo + patrimonio + utilidad),
  };
}

// KPIs del dashboard contable.
export function getKPIs(lines, entries, period) {
  const { ingresos, gastos, utilidad } = getSaldosPorClase(lines, entries, period);
  const mov = movimientosPorCuenta(lines, entries, period);
  // Egresos de caja/bancos = créditos netos de cuentas 1110.
  let saldoBancos = 0;
  const movTotal = movimientosPorCuenta(lines, entries, 'all');
  for (const code of ['111005', '111010', '111015', '111020']) {
    const m = movTotal[code] || { debe: 0, haber: 0 };
    saldoBancos += m.debe - m.haber;
  }
  const numAsientos = (period && period !== 'all'
    ? entries.filter((e) => e.period === period)
    : entries
  ).length;
  return { ingresos, egresos: gastos, utilidad, saldoBancos, numAsientos, mov };
}

// Líneas agrupadas por asiento, para el Libro Diario.
export function groupJournal(entries, lines, period, search) {
  const term = (search || '').trim().toLowerCase();
  return entries
    .filter((e) => !period || period === 'all' || e.period === period)
    .filter((e) => {
      if (!term) return true;
      return (
        e.id.toLowerCase().includes(term) ||
        e.concept.toLowerCase().includes(term) ||
        (e.sourceId || '').toLowerCase().includes(term)
      );
    })
    .map((e) => {
      const eLines = lines.filter((l) => l.journalId === e.id);
      const debe = eLines.reduce((a, l) => a + l.debit, 0);
      const haber = eLines.reduce((a, l) => a + l.credit, 0);
      return { ...e, lines: eLines, debe, haber };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));
}

// ── Cálculo de nómina (preview) según parámetros editables ──
// Reproduce las reglas PAYROLL_2026 + exoneración Ley 1607 (<10 SMMLV).
export function calcPayrollPreview(employees, params) {
  const topeExoneracion = params.exoneracionLey1607Smmlv * params.smmlv;
  const topeAux = params.auxTransporteTopeSmmlv * params.smmlv;
  const pct = (v) => (v || 0) / 100;

  const filas = employees.map((emp) => {
    const base = emp.salario;
    const exonera = base < topeExoneracion;
    const aux = base < topeAux ? params.auxTransporte : 0;

    const saludEmp = base * pct(params.saludEmpleado);
    const pensionEmp = base * pct(params.pensionEmpleado);
    const totalDeduccionesEmp = saludEmp + pensionEmp;
    const neto = base + aux - totalDeduccionesEmp;

    const saludEmpr = exonera ? 0 : base * pct(params.saludEmpleador);
    const pensionEmpr = base * pct(params.pensionEmpleador);
    const arl = base * pct(params.arlPorcentaje);
    const sena = exonera ? 0 : base * pct(params.sena);
    const icbf = exonera ? 0 : base * pct(params.icbf);
    const caja = base * pct(params.cajaCompensacion);
    const aportesEmpr = saludEmpr + pensionEmpr + arl + sena + icbf + caja;

    const baseProv = base + aux;
    const provisiones =
      baseProv * pct(params.provCesantias) +
      baseProv * pct(params.provIntCesantias) +
      baseProv * pct(params.provPrima) +
      baseProv * pct(params.provVacaciones);

    return {
      id: emp.id,
      name: emp.name,
      area: emp.area,
      base,
      aux,
      saludEmp,
      pensionEmp,
      neto,
      aportesEmpr,
      provisiones,
      exonera,
      costoTotal: base + aux + aportesEmpr + provisiones,
    };
  });

  const totales = filas.reduce(
    (t, f) => {
      t.base += f.base;
      t.aux += f.aux;
      t.neto += f.neto;
      t.aportesEmpr += f.aportesEmpr;
      t.provisiones += f.provisiones;
      t.costoTotal += f.costoTotal;
      return t;
    },
    { base: 0, aux: 0, neto: 0, aportesEmpr: 0, provisiones: 0, costoTotal: 0 },
  );
  return { filas, totales };
}

// ── Saldo de una cuenta (incluye padres por prefijo) ──
export function getSaldoCuenta(code, lines, entries, period = 'all') {
  const mov = movimientosPorCuenta(lines, entries, period);
  const acc = PUC_BY_CODE[code];
  if (!acc) return 0;
  if (acc.level >= 6) {
    const m = mov[code] || { debe: 0, haber: 0 };
    return saldoPorNaturaleza(code, m.debe, m.haber);
  }
  // Cuenta padre: suma de auxiliares con su prefijo.
  let total = 0;
  for (const [c, m] of Object.entries(mov)) {
    if (c.startsWith(code)) total += saldoPorNaturaleza(c, m.debe, m.haber);
  }
  return total;
}

// ── Depreciación lineal mensual (preview) ──────────────────────────────────
// Calcula la cuota de depreciación mensual de cada activo activo según el
// método de línea recta: depMes = (cost - salvageValue) / usefulLifeMonths.
// Respeta el tope `cost - salvageValue` (no deprecia más del valor depreciable).
// Idempotente: si ya hay run para el periodo, devuelve {warning, runId}.
// Función pura: no muta `assets` ni `depreciationRuns`.
export function calcDepreciationPreview(assets, periodId, depreciationRuns) {
  if (!periodId || !/^\d{4}-\d{2}$/.test(periodId)) {
    return { error: 'invalid_period', message: 'periodId debe ser YYYY-MM' };
  }
  const existing = (depreciationRuns || []).find((r) => r.periodId === periodId);
  if (existing) return { warning: 'already_run', runId: existing.id };

  const active = (assets || []).filter((a) => a.estado === 'activo');
  if (!active.length) return { error: 'no_assets', message: 'Sin activos fijos activos' };

  const items = [];
  let total = 0;
  for (const a of active) {
    const cost = +a.cost || 0;
    const salvage = +a.salvageValue || 0;
    const useful = +a.usefulLifeMonths || 0;
    if (useful <= 0 || cost <= 0) continue;
    const depMensual = Math.round((cost - salvage) / useful);
    if (depMensual <= 0) continue;
    const depAcumPrev = Math.round(+a.depAcumulada || 0);
    const cap = Math.round(cost - salvage);
    let monto = depMensual;
    let depAcumNueva = depAcumPrev + depMensual;
    if (depAcumNueva > cap) {
      monto = Math.max(0, cap - depAcumPrev);
      depAcumNueva = depAcumPrev + monto;
    }
    if (monto <= 0) continue;
    items.push({
      assetId: a.id,
      assetName: a.name || '',
      category: a.category || '',
      usage: a.usage || '',
      monto,
      depAcumPrev,
      depAcumNueva,
    });
    total += monto;
  }
  if (!items.length) return { error: 'no_assets_to_depreciate', message: 'Ningún activo con cuota válida' };
  return { ok: true, periodId, items, total };
}

// ── Estado del motor contable (reemplaza la alerta "no cargado") ──
// Devuelve OK siempre que el catálogo PUC y los asientos estén presentes.
export function accountingStatus(state) {
  const cuentas = (state?.pucAccounts || PUC_CATALOG).length;
  const auxiliares = (state?.pucAccounts || PUC_CATALOG).filter((a) => a.level >= 6).length;
  const asientos = (state?.journalEntries || []).length;
  const { ecuacionCuadra } = getSaldosPorClase(
    state?.journalLines || [],
    state?.journalEntries || [],
    'all',
  );
  return {
    ok: cuentas > 0 && asientos > 0,
    version: 'v1.1',
    cuentas,
    auxiliares,
    asientos,
    ecuacionCuadra,
    bancos: DEFAULT_BANKS_V11,
  };
}

// ── nextDocNumber: helper puro de numeración interna (C3c · §7.9) ──
// Calcula el siguiente número para un kind (FAC/REM/NC/ND) leyendo el
// docNumbering del state. NO muta: el caller (acción de AppContext) es quien
// hace el bump de currentNumber después de un postJournalEntry exitoso.
// Devuelve { id, number, counterId } o { error, message }.
export function nextDocNumber(kind, docNumbering) {
  const counter = (docNumbering || []).find((d) => d.kind === kind);
  if (!counter) return { error: 'unknown_kind', message: `No hay contador para ${kind}` };
  if (!counter.active) return { error: 'inactive', message: `Contador ${kind} inactivo` };
  const next = (+counter.currentNumber || 0) + 1;
  const from = +counter.rangeFrom || 1;
  const to = +counter.rangeTo || 9999;
  if (next < from || next > to) {
    return { error: 'out_of_range', message: `${kind} fuera de rango [${from}-${to}]` };
  }
  const id = `${counter.prefix}-${String(next).padStart(3, '0')}`;
  return { id, number: next, counterId: counter.id };
}
