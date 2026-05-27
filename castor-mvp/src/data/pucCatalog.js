// Catálogo PUC colombiano (clases 1-7) — versión curada para el MVP.
// Fiel a las cuentas auxiliares que nombra el brief (§7, Doc 2 del PDF):
// 130505, 412035, 240805/240810, 612035, 143005/141005/140505, 710505,
// 720505/720570, 159220/159225/159240, 236540, 280505, 360505/370505, etc.
//
// nature: 'debito' | 'credito'  -> determina el signo del saldo.
//   saldo = nature==='debito' ? (debe - haber) : (haber - debe)
// Las cuentas de "naturaleza contraria" (depreciación acumulada, IVA
// descontable, devoluciones en ventas) llevan su naturaleza real, no la
// de su clase.

const A = (code, name, nature) => ({
  code,
  name,
  nature,
  classCode: code[0],
  level: code.length, // 1=clase, 2=grupo, 4=cuenta, 6=auxiliar
  parentCode:
    code.length === 1
      ? null
      : code.length === 2
        ? code.slice(0, 1)
        : code.length === 4
          ? code.slice(0, 2)
          : code.slice(0, 4),
  activa: true,
});

export const PUC_CATALOG = [
  // ───────────────── CLASE 1 · ACTIVO ─────────────────
  A('1', 'ACTIVO', 'debito'),
  A('11', 'DISPONIBLE', 'debito'),
  A('1105', 'CAJA', 'debito'),
  A('110505', 'Caja general', 'debito'),
  A('110510', 'Caja menor', 'debito'),
  A('1110', 'BANCOS', 'debito'),
  A('111005', 'Bancolombia · Cuenta Corriente', 'debito'),
  A('111010', 'BBVA · Empresarial', 'debito'),
  A('111015', 'Bold', 'debito'),
  A('111020', 'Lulo Bank', 'debito'),
  A('13', 'DEUDORES', 'debito'),
  A('1305', 'CLIENTES', 'debito'),
  A('130505', 'Clientes nacionales', 'debito'),
  A('1355', 'ANTICIPO DE IMPUESTOS Y CONTRIBUCIONES', 'debito'),
  A('135515', 'Retención en la fuente (recibida)', 'debito'),
  A('135517', 'Retención de IVA (recibida)', 'debito'),
  A('135518', 'Retención de ICA (recibida)', 'debito'),
  A('14', 'INVENTARIOS', 'debito'),
  A('1405', 'MATERIAS PRIMAS', 'debito'),
  A('140505', 'Materias primas', 'debito'),
  A('1410', 'PRODUCTOS EN PROCESO', 'debito'),
  A('141005', 'Productos en proceso', 'debito'),
  A('1430', 'PRODUCTOS TERMINADOS', 'debito'),
  A('143005', 'Productos terminados', 'debito'),
  A('15', 'PROPIEDADES PLANTA Y EQUIPO', 'debito'),
  A('1524', 'EQUIPO DE OFICINA', 'debito'),
  A('152405', 'Muebles y equipo de oficina', 'debito'),
  A('1528', 'EQUIPO DE CÓMPUTO Y COMUNICACIÓN', 'debito'),
  A('152805', 'Equipo de cómputo', 'debito'),
  A('1592', 'DEPRECIACIÓN ACUMULADA', 'credito'),
  A('159220', 'Equipo de oficina (dep. acum.)', 'credito'),
  A('159225', 'Equipo de cómputo (dep. acum.)', 'credito'),
  A('159240', 'Flota y equipo de transporte (dep. acum.)', 'credito'),

  // ───────────────── CLASE 2 · PASIVO ─────────────────
  A('2', 'PASIVO', 'credito'),
  A('22', 'PROVEEDORES', 'credito'),
  A('2205', 'PROVEEDORES NACIONALES', 'credito'),
  A('220505', 'Proveedores nacionales', 'credito'),
  A('23', 'CUENTAS POR PAGAR', 'credito'),
  A('2365', 'RETENCIÓN EN LA FUENTE', 'credito'),
  A('236505', 'Rentas de trabajo (retención laboral)', 'credito'),
  A('236540', 'Compras (ReteFte 2.5%)', 'credito'),
  A('2367', 'IMPUESTO A LAS VENTAS RETENIDO', 'credito'),
  A('236701', 'ReteIVA (15%)', 'credito'),
  A('2368', 'RETENCIÓN DE ICA', 'credito'),
  A('236801', 'ReteICA Bogotá', 'credito'),
  A('2370', 'RETENCIONES Y APORTES DE NÓMINA', 'credito'),
  A('237005', 'Aportes EPS / Pensión / Parafiscales', 'credito'),
  A('2408', 'IMPUESTO SOBRE LAS VENTAS POR PAGAR', 'credito'),
  A('240805', 'IVA generado', 'credito'),
  A('240810', 'IVA descontable', 'debito'),
  A('25', 'OBLIGACIONES LABORALES', 'credito'),
  A('2505', 'SALARIOS POR PAGAR', 'credito'),
  A('250505', 'Salarios por pagar', 'credito'),
  A('26', 'PASIVOS ESTIMADOS Y PROVISIONES', 'credito'),
  A('2610', 'PARA OBLIGACIONES LABORALES', 'credito'),
  A('261005', 'Cesantías, prima, vacaciones (provisión)', 'credito'),
  A('28', 'OTROS PASIVOS', 'credito'),
  A('2805', 'ANTICIPOS Y AVANCES RECIBIDOS', 'credito'),
  A('280505', 'Anticipos de clientes', 'credito'),

  // ─────────────── CLASE 3 · PATRIMONIO ───────────────
  A('3', 'PATRIMONIO', 'credito'),
  A('31', 'CAPITAL SOCIAL', 'credito'),
  A('3105', 'CAPITAL SUSCRITO Y PAGADO', 'credito'),
  A('310505', 'Capital social', 'credito'),
  A('36', 'RESULTADOS DEL EJERCICIO', 'credito'),
  A('3605', 'UTILIDAD DEL EJERCICIO', 'credito'),
  A('360505', 'Utilidad del ejercicio', 'credito'),
  A('37', 'RESULTADOS DE EJERCICIOS ANTERIORES', 'credito'),
  A('3705', 'UTILIDADES ACUMULADAS', 'credito'),
  A('370505', 'Utilidades acumuladas', 'credito'),

  // ─────────────── CLASE 4 · INGRESOS ─────────────────
  A('4', 'INGRESOS', 'credito'),
  A('41', 'OPERACIONALES', 'credito'),
  A('4120', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'credito'),
  A('412035', 'Venta de muebles', 'credito'),
  A('4175', 'DEVOLUCIONES EN VENTAS', 'debito'),
  A('417505', 'Devoluciones en ventas', 'debito'),
  A('42', 'NO OPERACIONALES', 'credito'),
  A('4250', 'RECUPERACIONES', 'credito'),
  A('425095', 'Ingresos diversos', 'credito'),

  // ──────────────── CLASE 5 · GASTOS ──────────────────
  A('5', 'GASTOS', 'debito'),
  A('51', 'OPERACIONALES DE ADMINISTRACIÓN', 'debito'),
  A('5105', 'GASTOS DE PERSONAL', 'debito'),
  A('510506', 'Sueldos (administración)', 'debito'),
  A('510530', 'Cesantías y prestaciones (provisión)', 'debito'),
  A('510568', 'Aportes patronales', 'debito'),
  A('5160', 'DEPRECIACIONES', 'debito'),
  A('516015', 'Equipo de oficina (gasto dep.)', 'debito'),
  A('52', 'OPERACIONALES DE VENTAS', 'debito'),
  A('5205', 'GASTOS DE PERSONAL', 'debito'),
  A('520506', 'Sueldos (ventas)', 'debito'),
  A('5260', 'DEPRECIACIONES', 'debito'),
  A('526010', 'Equipo de cómputo (gasto dep.)', 'debito'),
  A('5195', 'DIVERSOS', 'debito'),
  A('519540', 'Garantías y reparaciones', 'debito'),
  A('53', 'NO OPERACIONALES', 'debito'),
  A('5395', 'GASTOS DIVERSOS', 'debito'),
  A('539595', 'Otros gastos no operacionales', 'debito'),

  // ──────────── CLASE 6 · COSTOS DE VENTAS ────────────
  A('6', 'COSTOS DE VENTAS', 'debito'),
  A('61', 'COSTO DE VENTAS Y DE PRESTACIÓN DE SERVICIOS', 'debito'),
  A('6120', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'debito'),
  A('612035', 'Costo de venta de muebles', 'debito'),

  // ────────── CLASE 7 · COSTOS DE PRODUCCIÓN ──────────
  A('7', 'COSTOS DE PRODUCCIÓN', 'debito'),
  A('71', 'MATERIA PRIMA', 'debito'),
  A('7105', 'MATERIA PRIMA', 'debito'),
  A('710505', 'Consumo de materia prima', 'debito'),
  A('72', 'MANO DE OBRA DIRECTA', 'debito'),
  A('7205', 'MANO DE OBRA DIRECTA', 'debito'),
  A('720505', 'Salarios mano de obra directa', 'debito'),
  A('720570', 'Aportes mano de obra directa', 'debito'),
  A('73', 'COSTOS INDIRECTOS', 'debito'),
  A('7305', 'COSTOS INDIRECTOS DE FABRICACIÓN', 'debito'),
  A('730560', 'Depreciaciones (CIF)', 'debito'),
];

export const PUC_BY_CODE = Object.fromEntries(PUC_CATALOG.map((a) => [a.code, a]));
