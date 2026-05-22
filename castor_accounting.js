/* ==========================================================================
 * castor_accounting.js  —  Módulo contable PUC para Castor (Fase 1)
 * --------------------------------------------------------------------------
 * Andamiaje + motor contable + hooks núcleo + tests + UI MVP.
 * Depende de funciones globales de Demo6: state, save, uid, today, nowISO,
 *   fmtDate, fmtCOP, escape, kpiCard, showModal, closeModal, toast,
 *   pushNotification, renderPage.
 * Todo se exporta a window al final.
 * ========================================================================== */
(function(){ 'use strict';

/* ------------------------------------------------------------------ utils */
function _round(n) { return Math.round((+n||0)*100)/100; }
function _r0(n)    { return Math.round(+n||0); }
function _eqMoney(a, b, tol) { tol = (tol==null?0.5:tol); return Math.abs((+a||0)-(+b||0)) <= tol; }
function _yyyymm(dateStr) {
  if (!dateStr) return '';
  const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) {
    // fallback parse YYYY-MM-DD
    const m = String(dateStr).match(/^(\d{4})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}` : '';
  }
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function _todayStr() {
  if (typeof today === 'function') return today();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _nowISO() {
  if (typeof nowISO === 'function') return nowISO();
  return new Date().toISOString();
}
function _fmtCOP(n) {
  if (typeof fmtCOP === 'function') return fmtCOP(n);
  return '$' + (Math.round(+n||0)).toLocaleString('es-CO');
}
function _fmtDate(d) {
  if (typeof fmtDate === 'function') return fmtDate(d);
  return d || '—';
}
function _escape(s) {
  if (typeof escape === 'function' && escape !== window.escape) return escape(s);
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function _toast(msg, kind) { if (typeof toast === 'function') toast(msg, kind||'info'); }
function _save(target) {
  if (typeof save === 'function' && (!target || target === window.state)) save();
}

/* ============================================================== SEEDS PUC */
/**
 * seedPucCatalog — ~120 cuentas distribuidas en clases 1..7.
 * Niveles: 1=clase, 2=grupo, 4=cuenta, 6=subcuenta.
 * Cuentas raíz/agrupadoras → type:'titulo'; hojas → type:'auxiliar'.
 */
function seedPucCatalog() {
  // tabla compacta: [code, name, requiresThirdParty?, requiresCostCenter?, taxRelated?]
  // type/level/parentCode/classCode/nature se calculan abajo según el code.
  // 4175/417505 → naturaleza débito (excepción a la regla de clase 4).
  // 1592/159205/etc → naturaleza crédito (excepción a regla de clase 1).
  const raw = [
    /* CLASE 1 — ACTIVO */
    ['1','Activo'],
    ['11','Disponible'],
    ['1105','Caja'],
    ['110505','Caja general',false,false],
    ['110510','Cajas menores',false,false],
    ['1110','Bancos'],
    ['111005','Bancos nacionales',false,false],
    ['13','Deudores'],
    ['1305','Clientes'],
    ['130505','Clientes nacionales',true,false],
    ['1330','Anticipos y avances'],
    ['133005','A proveedores',true,false],
    ['1355','Anticipo impuestos y contribuciones'],
    ['135515','Retención en la fuente',true,false,'rete_fte_received'],
    ['135517','Retención de IVA',true,false,'rete_iva_received'],
    ['135518','Retención de ICA',true,false,'rete_ica_received'],
    ['1380','Deudores varios'],
    ['138005','Deudores varios',true,false],
    ['14','Inventarios'],
    ['1405','Materias primas'],
    ['140505','Materias primas',false,false],
    ['1410','Productos en proceso'],
    ['141005','Productos en proceso',false,true],
    ['1430','Productos terminados'],
    ['143005','Productos terminados',false,false],
    ['1435','Mercancías no fabricadas'],
    ['143505','Mercancías no fabricadas',false,false],
    ['1455','Materiales, repuestos y accesorios'],
    ['145505','Repuestos y accesorios',false,false],
    ['15','Propiedades, planta y equipo'],
    ['1504','Terrenos'],
    ['150405','Terrenos',false,false],
    ['1516','Construcciones y edificaciones'],
    ['151605','Construcciones',false,false],
    ['1524','Equipo de oficina'],
    ['152405','Muebles y enseres',false,false],
    ['1528','Equipo de cómputo'],
    ['152805','Equipo de procesamiento de datos',false,false],
    ['1540','Flota y equipo de transporte'],
    ['154005','Autos, camionetas y camperos',false,false],
    ['1592','Depreciación acumulada'],
    ['159205','Construcciones y edificaciones',false,false],
    ['159220','Equipo de oficina',false,false],
    ['159225','Equipo de cómputo',false,false],
    ['159240','Flota y equipo de transporte',false,false],

    /* CLASE 2 — PASIVO */
    ['2','Pasivo'],
    ['21','Obligaciones financieras'],
    ['2105','Bancos nacionales'],
    ['210505','Sobregiros',true,false],
    ['22','Proveedores'],
    ['2205','Nacionales'],
    ['220505','Proveedores nacionales',true,false],
    ['23','Cuentas por pagar'],
    ['2335','Costos y gastos por pagar'],
    ['233525','Honorarios',true,false],
    ['2365','Retención en la fuente'],
    ['236505','Salarios y pagos laborales',true,false,'rete_fte_practiced'],
    ['236515','Honorarios',true,false,'rete_fte_practiced'],
    ['236525','Servicios',true,false,'rete_fte_practiced'],
    ['236540','Compras',true,false,'rete_fte_practiced'],
    ['236570','Otras retenciones',true,false,'rete_fte_practiced'],
    ['2367','Impuesto a las ventas retenido'],
    ['236701','ReteIVA practicada',true,false,'rete_iva_practiced'],
    ['2368','Impuesto de industria y comercio retenido'],
    ['236801','ReteICA practicada',true,false,'rete_ica_practiced'],
    ['2370','Retenciones y aportes nómina'],
    ['237005','Aportes EPS',true,false],
    ['237006','Aportes pensión',true,false],
    ['237010','Aportes ARL',true,false],
    ['237025','Embargos judiciales',true,false],
    ['237030','Libranzas',true,false],
    ['237035','Sindicatos',true,false],
    ['24','Impuestos, gravámenes y tasas'],
    ['2404','De renta y complementarios'],
    ['240405','Vigencia fiscal corriente',false,false],
    ['2408','Impuesto sobre las ventas por pagar'],
    ['240805','IVA generado',false,false,'iva_generated'],
    ['240810','IVA descontable',false,false,'iva_descontable'],
    ['2412','De industria y comercio'],
    ['241205','Vigencia fiscal corriente',false,false],
    ['25','Obligaciones laborales'],
    ['2505','Salarios por pagar'],
    ['250505','Salarios por pagar',true,false],
    ['2510','Cesantías consolidadas'],
    ['251005','Ley 50',true,false],
    ['2515','Intereses sobre cesantías'],
    ['251505','Intereses cesantías',true,false],
    ['2520','Prima de servicios'],
    ['252005','Prima de servicios',true,false],
    ['2525','Vacaciones consolidadas'],
    ['252505','Vacaciones',true,false],
    ['28','Otros pasivos'],
    ['2805','Anticipos y avances recibidos'],
    ['280505','De clientes',true,false],

    /* CLASE 3 — PATRIMONIO */
    ['3','Patrimonio'],
    ['31','Capital social'],
    ['3105','Capital suscrito y pagado'],
    ['311505','Capital autorizado',false,false],
    ['32','Superávit de capital'],
    ['320505','Prima en colocación de acciones',false,false],
    ['33','Reservas'],
    ['330505','Reserva legal',false,false],
    ['36','Resultados del ejercicio'],
    ['3605','Utilidad del ejercicio'],
    ['360505','Utilidad del ejercicio',false,false],
    ['37','Resultados de ejercicios anteriores'],
    ['3705','Utilidades acumuladas'],
    ['370505','Utilidades acumuladas',false,false],

    /* CLASE 4 — INGRESOS */
    ['4','Ingresos'],
    ['41','Operacionales'],
    ['4120','Industria manufacturera — fabricación de muebles'],
    ['412005','Fabricación general',true,true],
    ['412035','Fabricación muebles',true,true],
    ['4135','Comercio al por mayor'],
    ['413505','Reventa de mercancías',true,true],
    ['4175','Devoluciones en ventas (DB)'],
    ['417505','Devoluciones en ventas',true,true],
    ['42','No operacionales'],
    ['4210','Financieros'],
    ['421005','Intereses',true,false],
    ['4250','Recuperaciones'],
    ['425095','Diversos / ajustes positivos',true,false],
    ['4295','Diversos'],
    ['429505','Otros ingresos diversos',true,false],

    /* CLASE 5 — GASTOS OPERACIONALES */
    ['5','Gastos'],
    ['51','Operacionales de administración'],
    ['5105','Gastos de personal'],
    ['510506','Sueldos administración',true,true],
    ['510515','Horas extras y recargos',true,true],
    ['510527','Auxilio de transporte',true,true],
    ['510530','Cesantías',true,true],
    ['510533','Intereses sobre cesantías',true,true],
    ['510536','Prima de servicios',true,true],
    ['510539','Vacaciones',true,true],
    ['510560','EPS aportes empleador',true,true],
    ['510568','Aportes pensión',true,true],
    ['510569','Aportes ARL',true,true],
    ['510570','Aportes parafiscales',true,true],
    ['5120','Honorarios'],
    ['512005','Honorarios',true,true],
    ['5135','Servicios'],
    ['513525','Acueducto y alcantarillado',false,true],
    ['513530','Energía eléctrica',false,true],
    ['513535','Teléfono',false,true],
    ['5140','Gastos legales'],
    ['514005','Notariales',false,false],
    ['5145','Mantenimiento y reparaciones'],
    ['514505','Mantenimiento',true,true],
    ['5160','Depreciaciones'],
    ['516010','Construcciones',false,true],
    ['516015','Equipo de oficina',false,true],
    ['516020','Equipo de cómputo',false,true],
    ['516025','Flota y equipo de transporte',false,true],
    ['5195','Diversos'],
    ['519540','Garantías y servicio post-venta',true,true],
    ['519595','Otros gastos diversos',false,true],
    ['52','Operacionales de ventas'],
    ['5205','Gastos de personal — ventas'],
    ['520506','Sueldos ventas',true,true],
    ['5260','Depreciaciones — ventas'],
    ['526010','Depreciación equipo ventas',false,true],
    ['53','No operacionales'],
    ['5305','Financieros'],
    ['530525','Comisiones bancarias',false,false],
    ['530595','Gastos bancarios — GMF 4×1000',false,false,'gmf'],
    ['5315','Gastos extraordinarios'],
    ['531505','Gastos extraordinarios',false,false],
    ['539595','Diversos / ajustes negativos',true,false],

    /* CLASE 6 — COSTO DE VENTAS */
    ['6','Costos de ventas'],
    ['6120','Industria manufacturera'],
    ['612005','Costo de ventas — general',false,true],
    ['612035','Costo de ventas — muebles',false,true],
    ['6135','Comercio al por mayor'],
    ['613505','Costo reventa de mercancías',false,true],

    /* CLASE 7 — COSTOS DE PRODUCCIÓN */
    ['7','Costos de producción'],
    ['71','Materia prima'],
    ['7105','Materia prima'],
    ['710505','Consumo de materia prima',false,true],
    ['72','Mano de obra directa'],
    ['7205','MOD'],
    ['720505','Sueldos MOD',true,true],
    ['720506','Horas extras MOD',true,true],
    ['720570','Aportes parafiscales MOD',true,true],
    ['73','Costos indirectos de fabricación'],
    ['7305','CIF'],
    ['730505','Materiales indirectos',false,true],
    ['730527','Cesantías MOD',true,true],
    ['730530','Intereses cesantías MOD',true,true],
    ['730533','Prima de servicios MOD',true,true],
    ['730535','Servicios CIF',false,true],
    ['730536','Vacaciones MOD',true,true],
    ['730560','Depreciación CIF',false,true],
    ['730595','Otros CIF',false,true]
  ];

  const out = [];
  for (const row of raw) {
    const code = row[0];
    const name = row[1];
    const reqTP = row[2] === undefined ? false : !!row[2];
    const reqCC = row[3] === undefined ? false : !!row[3];
    const taxRelated = row[4] || null;
    const len = code.length;
    let level = 6;
    if (len === 1) level = 1;
    else if (len === 2) level = 2;
    else if (len === 4) level = 4;
    else if (len === 6) level = 6;
    else if (len >= 8) level = 8;
    const classCode = code[0];
    let nature = 'debito';
    if (['2','3','4'].includes(classCode)) nature = 'credito';
    // Excepciones puntuales:
    if (code === '4175' || code === '417505') nature = 'debito';                       // devoluciones en ventas
    if (/^1592\d*$/.test(code)) nature = 'credito';                                    // depreciación acumulada
    if (code === '240810') nature = 'debito';                                          // IVA descontable: contra-pasivo de naturaleza débito
    const type = (level >= 6) ? 'auxiliar' : 'titulo';
    let parentCode = null;
    if (level === 2) parentCode = code.slice(0,1);
    else if (level === 4) parentCode = code.slice(0,2);
    else if (level === 6) parentCode = code.slice(0,4);
    else if (level === 8) parentCode = code.slice(0,6);
    out.push({
      code, level, parentCode, name, classCode, nature, type,
      active:true, system:true,
      requiresThirdParty:reqTP, requiresCostCenter:reqCC, taxRelated
    });
  }
  return out;
}

function seedAccountingMappings() {
  return {
    sale_invoice:       { receivable:'130505', revenue:'412035', iva_generated:'240805', discount_account:'417505' },
    sale_remision:      { receivable:'130505', revenue:'412035' },
    customer_advance:   { bank_default:'111005', advance_received:'280505' },
    customer_collection:{
      bank_default:'111005', receivable:'130505', advance_received:'280505',
      rete_fuente_received:'135515', rete_iva_received:'135517', rete_ica_received:'135518'
    },
    supply_purchase:    {
      inventory_raw:'140505', iva_descontable:'240810', payable:'220505',
      rete_fuente_practiced:'236540', rete_iva_practiced:'236701', rete_ica_practiced:'236801'
    },
    supply_consumption: { raw_consumed:'710505', inventory_raw:'140505', wip:'141005' },
    finished_goods_in:  { finished_goods:'143005', wip:'141005', raw_inventory:'140505' },
    cogs_on_invoice:    { cogs:'612035', finished_goods:'143005' },
    supplier_payment:   { payable:'220505', bank_default:'111005', expense_default:'529595' },
    payroll:            {
      salary_admin:'510506', salary_sales:'520506', salary_mod:'720505',
      transport_aux:'510527',
      // Provisiones admin (areas no MOD: Contabilidad, Almacén, Ventas, etc.)
      cesantias_provision:'510530', int_cesantias_provision:'510533',
      prima_provision:'510536', vacaciones_provision:'510539',
      // Provisiones MOD (Producción)
      cesantias_provision_mod:'730527', int_cesantias_provision_mod:'730530',
      prima_provision_mod:'730533', vacaciones_provision_mod:'730536',
      // Aportes empleador admin
      eps_employer:'510560', pension_employer:'510568',
      arl_employer:'510569', parafiscales_employer:'510570',
      // Aportes empleador MOD (consolidado en 720570)
      employer_charges_mod:'720570',
      // Pasivos
      rete_fuente_employee:'236505', eps_payable:'237005',
      pension_payable:'237006', arl_payable:'237010',
      parafiscales_payable:'237030',
      cesantias_payable:'251005', int_cesantias_payable:'251505',
      prima_payable:'252005', vacaciones_payable:'252505',
      salary_payable:'250505'
    },
    warranty_cost:      { warranty_expense:'519540', cash:'110510', raw_used:'140505' },
    depreciation:       {
      expense_admin:'516015', expense_sales:'526010', expense_cif:'730560',
      accumulated:'159220',
      accumulated_oficina:'159220', accumulated_computacion:'159225',
      accumulated_transporte:'159240', accumulated_construcciones:'159205'
    },
    bank_adjustment:    { diff_positive:'425095', diff_negative:'539595' },
    gmf_4x1000:         { gmf_expense:'530595' },
    nota_credito:       { sales_returns:'417505', iva_generated:'240805', receivable:'130505' },
    nota_debito:        { receivable:'130505', revenue:'412035', iva_generated:'240805' }
  };
}

function seedTaxRules() {
  return [
    { id:'IVA-19', type:'iva', name:'IVA 19%', rate:0.19, account_generated:'240805', account_descontable:'240810', isDefault:true },
    { id:'IVA-5',  type:'iva', name:'IVA 5%',  rate:0.05, account_generated:'240805', account_descontable:'240810' },
    { id:'IVA-0',  type:'iva', name:'IVA 0% / excluido', rate:0,    account_generated:null, account_descontable:null, appliesToRemision:true },
    { id:'RTF-25', type:'rete_fuente', name:'Compras 2.5%',   rate:0.025, account:'236540', baseUVT:27, conceptCode:'COMP' },
    { id:'RTF-35', type:'rete_fuente', name:'Servicios 3.5%', rate:0.035, account:'236525', baseUVT:4,  conceptCode:'SERV' },
    { id:'RTF-11', type:'rete_fuente', name:'Honorarios 11%', rate:0.11,  account:'236515', baseUVT:0,  conceptCode:'HON'  },
    { id:'RIVA-15',type:'rete_iva',    name:'ReteIVA 15%',    rate:0.15,  account:'236701', appliesOver:'iva' },
    { id:'RICA-BOG',type:'rete_ica',   name:'ReteICA Bogotá 9.66×1000', rate:0.00966, account:'236801', baseUVT:27 }
  ];
}

function seedDocNumbering() {
  return [
    { id:'NUM-FAC', kind:'FAC', prefix:'FAC', rangeFrom:1, rangeTo:5000, currentNumber:0,  active:true, description:'Numeración interna · No oficial DIAN' },
    { id:'NUM-REM', kind:'REM', prefix:'REM', rangeFrom:1, rangeTo:9999, currentNumber:14, active:true, description:'Numeración interna · No oficial DIAN' },
    { id:'NUM-NC',  kind:'NC',  prefix:'NC',  rangeFrom:1, rangeTo:999,  currentNumber:0,  active:true, description:'Numeración interna · No oficial DIAN' },
    { id:'NUM-ND',  kind:'ND',  prefix:'ND',  rangeFrom:1, rangeTo:999,  currentNumber:0,  active:true, description:'Numeración interna · No oficial DIAN' }
  ];
}

function seedCostCenters() {
  return [
    { id:'CC-CEDI',   code:'CEDI',   name:'Centro de distribución', active:true },
    { id:'CC-TALLER', code:'TALLER', name:'Taller de producción',   active:true },
    { id:'CC-VENTAS', code:'VENTAS', name:'Ventas',                 active:true },
    { id:'CC-ADMIN',  code:'ADMIN',  name:'Administración',         active:true },
    { id:'CC-CTG',    code:'CTG',    name:'Castor Cartagena',       active:true },
    { id:'CC-VOL',    code:'VOL',    name:'Volcanes',               active:true }
  ];
}

function seedFiscalPeriods() {
  return [
    { id:'2026-01', year:2026, month:1, status:'cerrado', closedAt:'2026-02-05', closedBy:'Sistema' },
    { id:'2026-02', year:2026, month:2, status:'cerrado', closedAt:'2026-03-05', closedBy:'Sistema' },
    { id:'2026-03', year:2026, month:3, status:'cerrado', closedAt:'2026-04-05', closedBy:'Sistema' },
    { id:'2026-04', year:2026, month:4, status:'abierto', closedAt:null,         closedBy:null }
  ];
}

// Perfil tributario por defecto: usado por migrateAccountingV1 (siembra inicial)
// y por renderConfigPerfil como fallback si la migración aún no corrió.
function _defaultTaxProfile() {
  return {
    nit:'900XXXXXXX-X', razonSocial:'Castor SAS',
    responsableIVA:true, periodicidadIVA:'bimestral', regimenTributario:'ordinario',
    responsableICA:true, ciudadICA:'Bogotá', tarifaICAporMil:9.66,
    autoretenedor:false, uvtVigente:49799
  };
}

/* ====================================================== HELPERS PUC/STATE */
function _S(target) { return target || (window.state||{}); }

function _findAccount(code, target) {
  const st = _S(target);
  return (st.pucAccounts||[]).find(a => a.code === code) || null;
}

function _accountIsPostable(code, target) {
  const a = _findAccount(code, target);
  return !!(a && a.type === 'auxiliar' && a.active);
}

function _periodForDate(dateStr, target) {
  const st = _S(target);
  const yymm = _yyyymm(dateStr);
  return (st.fiscalPeriods||[]).find(p => p.id === yymm) || null;
}

function _ensurePeriod(dateStr, target) {
  const st = _S(target);
  const yymm = _yyyymm(dateStr);
  if (!yymm) return null;
  let p = (st.fiscalPeriods||[]).find(x => x.id === yymm);
  if (!p) {
    p = { id:yymm, year:+yymm.slice(0,4), month:+yymm.slice(5,7), status:'abierto', closedAt:null, closedBy:null };
    if (!st.fiscalPeriods) st.fiscalPeriods = [];
    st.fiscalPeriods.push(p);
  }
  return p;
}

/* ===================================================== ENSURE BANK PUCSUB */
function ensureBankPucAccount(bank, target) {
  const st = _S(target);
  if (!bank) return null;
  if (bank.pucCode && _findAccount(bank.pucCode, st)) return bank.pucCode;
  if (!st.pucAccounts) st.pucAccounts = [];
  // buscar primer 1110-XX libre, partiendo de 05 secuencial
  let n = 5;
  const used = new Set((st.pucAccounts||[]).filter(a=>/^1110\d{2}$/.test(a.code)||/^1110-\d{2}$/.test(a.code)).map(a=>a.code));
  let code = '1110-' + String(n).padStart(2,'0');
  while (used.has(code)) {
    n++;
    code = '1110-' + String(n).padStart(2,'0');
    if (n > 99) break;
  }
  const acc = {
    code, level:6, parentCode:'1110',
    name:`Banco ${bank.bank||''} ${bank.number||''}`.trim(),
    classCode:'1', nature:'debito', type:'auxiliar',
    active:true, system:false, requiresThirdParty:false, requiresCostCenter:false,
    taxRelated:null
  };
  st.pucAccounts.push(acc);
  bank.pucCode = code;
  return code;
}

function _bankPucForId(bankId, target) {
  const st = _S(target);
  const b = (st.bankAccounts||[]).find(x => x.id === bankId);
  if (!b) return null;
  return ensureBankPucAccount(b, st);
}

/* ============================================================ TAX HELPERS */
/**
 * calcTaxBreakdown(value, opts):
 *   opts.mode         = 'inclusive' | 'exclusive'
 *   opts.rate         = 0.19 (override directo)
 *   opts.ivaRule      = objeto regla taxRules (preferido sobre rate)
 *   opts.retenciones  = lista de reglas rete_* (calcula sobre base)
 *   opts.descuentoPct = 0..1 sobre la base
 * Retorna: {base, descuento, baseAfter, iva, total, retenciones:[{ruleId,account,base,amount}], totalRetenciones, totalNeto}
 */
function calcTaxBreakdown(value, opts) {
  const o = opts || {};
  const ivaRule = o.ivaRule || null;
  const rate = (ivaRule != null) ? (+ivaRule.rate||0) : (o.rate==null?0.19:+o.rate);
  const descPct = (+o.descuentoPct||0);
  let base, iva, total, baseAfter, descuento;
  if (o.mode === 'inclusive') {
    total = +value || 0;
    base  = rate > 0 ? total / (1 + rate) : total;
    iva   = total - base;
    descuento = base * descPct;
    baseAfter = base - descuento;
    if (descPct > 0) { total = baseAfter + baseAfter * rate; iva = total - baseAfter; }
  } else {
    base = +value || 0;
    descuento = base * descPct;
    baseAfter = base - descuento;
    iva = baseAfter * rate;
    total = baseAfter + iva;
  }

  // Retenciones (siempre calculadas sobre baseAfter, salvo retIVA que aplica sobre el IVA)
  const retOut = [];
  let totalRet = 0;
  const retList = Array.isArray(o.retenciones) ? o.retenciones : [];
  for (const r of retList) {
    if (!r) continue;
    const ruleId = r.id || r.ruleId || null;
    const baseAplicable = r.appliesOver === 'iva' ? iva : baseAfter;
    const amount = _round(baseAplicable * (+r.rate||0));
    if (amount <= 0) continue;
    retOut.push({
      ruleId,
      account: r.account || null,
      type: r.type || null,
      base: _round(baseAplicable),
      rate: +r.rate||0,
      amount
    });
    totalRet += amount;
  }
  const totalNeto = _round(total - totalRet);

  return {
    base: _round(base),
    descuento: _round(descuento),
    baseAfter: _round(baseAfter),
    iva: _round(iva),
    total: _round(total),
    retenciones: retOut,
    totalRetenciones: _round(totalRet),
    totalNeto
  };
}

/**
 * _resolveIvaRule(invoice, target) — devuelve la regla IVA aplicable a un documento
 *   - prioridad: invoice.ivaRuleId > regla appliesToRemision si type==='remisión' > IVA-19 default si type==='factura'
 */
function _resolveIvaRule(invoice, target) {
  const st = _S(target);
  const rules = st.taxRules || seedTaxRules();
  if (invoice && invoice.ivaRuleId) {
    const r = rules.find(x => x.id === invoice.ivaRuleId && x.type === 'iva');
    if (r) return r;
  }
  if (invoice && invoice.type === 'remisión') {
    const r = rules.find(x => x.type === 'iva' && x.appliesToRemision);
    if (r) return r;
  }
  // factura por defecto → IVA-19
  return rules.find(x => x.type === 'iva' && x.id === 'IVA-19') ||
         rules.find(x => x.type === 'iva' && x.isDefault) ||
         rules.find(x => x.type === 'iva') || null;
}

/**
 * _resolveRetencionRules(ids, target) — recibe lista de ids y devuelve reglas válidas
 */
function _resolveRetencionRules(ids, target) {
  const st = _S(target);
  const rules = st.taxRules || seedTaxRules();
  return (Array.isArray(ids) ? ids : []).map(id => rules.find(r => r.id === id))
    .filter(r => r && /^rete_/.test(r.type));
}

/* ====================================================== DOC NUMBERING API */
function nextDocNumber(kind, target) {
  const st = _S(target);
  const seqs = st.docNumbering || [];
  const seq = seqs.find(s => s.kind === kind && s.active);
  if (!seq) return { error:'no_active_sequence', message:`No hay secuencia activa para ${kind}` };
  const next = (+seq.currentNumber||0) + 1;
  if (next > seq.rangeTo) {
    return { error:'range_exhausted', message:`Rango ${kind} agotado (${seq.rangeFrom}-${seq.rangeTo})` };
  }
  seq.currentNumber = next;
  return { ok:true, number:next, id:`${seq.prefix}-${String(next).padStart(4,'0')}` };
}

/* ================================================= MOTOR · postJournalEntry */
/**
 * postJournalEntry(payload)
 *   payload:
 *     date       (YYYY-MM-DD)   requerido
 *     source     string         requerido (sale|purchase|payment_in|payment_out|...)
 *     sourceId   string         requerido
 *     description string
 *     lines      [{accountCode, debit, credit, thirdParty?, costCenter?, description?}]
 *     costCenter (override líneas que no traen)
 *     status     'posted'|'draft'   default 'posted'
 *     force      bool   ignora periodo cerrado
 *
 * Retorna: { ok:true, journalId, je } | { error, message } | { warning:'already_posted', journalId }
 */
function postJournalEntry(payload, target) {
  const st = _S(target);
  if (!payload) return { error:'no_payload' };
  const { date, source, sourceId, description } = payload;
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (!date)  return { error:'missing_date' };
  if (!source) return { error:'missing_source' };
  if (!sourceId) return { error:'missing_sourceId' };
  if (lines.length < 2) return { error:'too_few_lines', message:'Se requieren al menos 2 líneas' };

  // Idempotencia: ya existe asiento posted con ese source/sourceId?
  const dup = (st.journalEntries||[]).find(j => j.source===source && j.sourceId===sourceId && j.status==='posted');
  if (dup) return { warning:'already_posted', journalId:dup.id };

  // Validar partida doble
  let totDebit = 0, totCredit = 0;
  for (const ln of lines) {
    totDebit  += (+ln.debit  || 0);
    totCredit += (+ln.credit || 0);
  }
  if (!_eqMoney(totDebit, totCredit)) {
    return { error:'unbalanced', message:`DB ${_fmtCOP(totDebit)} ≠ CR ${_fmtCOP(totCredit)}` };
  }
  if (totDebit <= 0) {
    return { error:'zero_total', message:'El asiento tiene totales en cero' };
  }

  // Validar cada línea contra el catálogo
  for (let i=0; i<lines.length; i++) {
    const ln = lines[i];
    if (!ln.accountCode) return { error:'line_missing_account', message:`Línea ${i+1} sin cuenta` };
    const acc = _findAccount(ln.accountCode, st);
    if (!acc) return { error:'unknown_account', message:`Cuenta ${ln.accountCode} no existe` };
    if (acc.type !== 'auxiliar') return { error:'titulo_account', message:`Cuenta ${ln.accountCode} es título; no admite movimiento` };
    if (!acc.active) return { error:'inactive_account', message:`Cuenta ${ln.accountCode} inactiva` };
    const d = +ln.debit || 0, c = +ln.credit || 0;
    if (d > 0 && c > 0) return { error:'line_both_sides', message:`Línea ${i+1} no puede tener débito y crédito a la vez` };
    if (d <= 0 && c <= 0) return { error:'line_zero', message:`Línea ${i+1} con valor 0` };
    if (acc.requiresThirdParty && !ln.thirdParty) {
      return { error:'missing_third_party', message:`Cuenta ${ln.accountCode} requiere tercero (línea ${i+1})` };
    }
  }

  // Validar periodo
  const period = _periodForDate(date, st);
  if (period && period.status === 'cerrado' && !payload.force) {
    return { error:'closed_period', message:`Periodo ${period.id} cerrado` };
  }
  // Si no existe el periodo, crearlo abierto (Fase 1: tolerante)
  const periodId = period ? period.id : (_ensurePeriod(date, st)||{}).id || _yyyymm(date);

  // Asignar JE-ID
  if (!st.counters) st.counters = {};
  if (!st.counters.je) st.counters.je = 0;
  st.counters.je++;
  const jeId = 'JE-' + String(st.counters.je).padStart(6,'0');

  if (!st.journalEntries) st.journalEntries = [];
  if (!st.journalLines)   st.journalLines = [];

  const je = {
    id:jeId,
    date,
    source, sourceId,
    description: description || '',
    periodId,
    currency:'COP',
    status: payload.status || 'posted',
    reverses:null, reversedBy:null,
    totalDebit: _round(totDebit),
    totalCredit: _round(totCredit),
    createdAt: _nowISO(),
    createdBy: (st.currentUser && st.currentUser.name) || 'Sistema',
    postedAt: _nowISO(),
    postedBy: (st.currentUser && st.currentUser.name) || 'Sistema'
  };
  st.journalEntries.unshift(je);

  // Crear líneas
  lines.forEach((ln, idx) => {
    const lineId = `${jeId}-L${idx+1}`;
    st.journalLines.push({
      id: lineId,
      journalId: jeId,
      lineNumber: idx + 1,
      accountCode: ln.accountCode,
      debit: _round(ln.debit||0),
      credit: _round(ln.credit||0),
      thirdParty: ln.thirdParty || null,
      costCenter: ln.costCenter || payload.costCenter || null,
      description: ln.description || description || '',
      sourceLink: ln.sourceLink || null
    });
  });

  // Marker para sync estructurado a Supabase (Fase 2). Reinicializa si llegó
  // como {} desde JSON.parse (Set no es serializable a localStorage/blob).
  if (!st._dirtyJournals || typeof st._dirtyJournals.add !== 'function') {
    st._dirtyJournals = new Set();
  }
  st._dirtyJournals.add(jeId);

  return { ok:true, journalId:jeId, je };
}

function reverseJournalEntry(jeId, reason, target) {
  const st = _S(target);
  const je = (st.journalEntries||[]).find(j => j.id === jeId);
  if (!je) return { error:'not_found' };
  if (je.status === 'reversed') return { error:'already_reversed' };

  const lines = (st.journalLines||[]).filter(l => l.journalId === jeId);
  const mirrorLines = lines.map(l => ({
    accountCode: l.accountCode,
    debit: l.credit,
    credit: l.debit,
    thirdParty: l.thirdParty,
    costCenter: l.costCenter,
    description: `Reverso: ${l.description||''}`,
    sourceLink: l.sourceLink
  }));

  const res = postJournalEntry({
    date: _todayStr(),
    source: 'reversal',
    sourceId: jeId + ':REV',
    description: `Reverso de ${jeId}${reason?' · '+reason:''}`,
    lines: mirrorLines,
    force: true
  }, st);
  if (res.error) return res;
  je.status = 'reversed';
  je.reversedBy = res.journalId;
  je.reversedAt = _nowISO();
  je.reversedReason = reason || '';
  // marcar el reverso apuntando al original
  const rev = st.journalEntries.find(j => j.id === res.journalId);
  if (rev) { rev.reverses = jeId; }
  // El reverso ya quedó dirty por postJournalEntry; marcar también el
  // original cuyo status acaba de mutar de 'posted' a 'reversed'.
  if (!st._dirtyJournals || typeof st._dirtyJournals.add !== 'function') {
    st._dirtyJournals = new Set();
  }
  st._dirtyJournals.add(jeId);
  return { ok:true, journalId:res.journalId };
}

function findJournalBySource(source, sourceId, target) {
  const st = _S(target);
  return (st.journalEntries||[]).find(j => j.source===source && j.sourceId===sourceId && j.status==='posted') || null;
}

/* ============================================================ HOOKS · VENTA */
/**
 * postSale(invoice) — `invoice.type` ∈ {'factura','remisión'}.
 * Si factura: IVA inclusive 19% sobre `invoice.amount` o `invoice.total`.
 * Si remisión: IVA 0%, total = base.
 * También invoca postCostOfSale si se puede resolver.
 */
function postSale(invoice, target) {
  const st = _S(target);
  if (!invoice) return { error:'no_invoice' };
  const map = (st.accountingMappings || seedAccountingMappings());
  const total = +(invoice.total != null ? invoice.total : invoice.amount) || 0;
  if (total <= 0) return { error:'invoice_zero', message:'Factura sin monto' };

  const cust = (st.customers||[]).find(c => c.id === invoice.customerId) || null;
  const tp = cust ? { type:'customer', id:cust.id, name:cust.name||invoice.clientName||'', doc:cust.doc||null } :
                    { type:'customer', id:invoice.customerId||null, name:invoice.clientName||'', doc:invoice.nit||null };

  // Resolver regla IVA: factura→IVA-19 (o invoice.ivaRuleId); remisión→IVA-0
  const ivaRule = _resolveIvaRule(invoice, st);
  const rate = ivaRule ? (+ivaRule.rate || 0) : 0;

  // El monto que llega es inclusive (precio cara al cliente); si rate=0 → todo es base
  const br = calcTaxBreakdown(total, { mode:'inclusive', ivaRule });

  let lines = [];
  if (rate > 0) {
    const m = map.sale_invoice;
    const ivaAccount = (ivaRule && ivaRule.account_generated) || m.iva_generated;
    lines = [
      { accountCode: m.receivable,    debit: br.total, credit: 0,        thirdParty:tp, description:`Factura ${invoice.id}` },
      { accountCode: m.revenue,       debit: 0,        credit: br.base,  thirdParty:tp, description:`Venta ${invoice.id}`, costCenter:invoice.costCenter||null },
      { accountCode: ivaAccount,      debit: 0,        credit: br.iva,   description:`IVA ${ivaRule?ivaRule.id:''} ${invoice.id}` }
    ];
  } else {
    const m = map.sale_remision;
    lines = [
      { accountCode: m.receivable, debit: total, credit: 0,     thirdParty:tp, description:`${invoice.type==='remisión'?'Remisión':'Factura'} ${invoice.id}` },
      { accountCode: m.revenue,    debit: 0,     credit: total, thirdParty:tp, description:`${invoice.type==='remisión'?'Remisión':'Venta'} ${invoice.id}`, costCenter:invoice.costCenter||null }
    ];
  }

  // Persistir desglose en el invoice (mutación visible en UI)
  invoice.taxBreakdown = {
    ivaRuleId: ivaRule ? ivaRule.id : null,
    base:  br.base,
    iva:   br.iva,
    total: br.total,
    retenciones: []
  };

  const date = invoice.emitDate || invoice.issuedAt || _todayStr();
  const res = postJournalEntry({
    date,
    source: 'sale',
    sourceId: invoice.id,
    description: `${invoice.type==='remisión'?'Remisión':'Factura'} ${invoice.id} · ${tp.name}`,
    lines
  }, st);

  // Costo de venta (siempre que tengamos orderId/orderIds)
  try {
    const orderIds = invoice.orderIds || (invoice.orderId ? [invoice.orderId] : []);
    orderIds.forEach(oid => postCostOfSale(oid, st));
  } catch (e) { /* ignore */ }

  return res;
}

function postCostOfSale(orderId, target) {
  const st = _S(target);
  if (!orderId) return { error:'no_orderId' };
  // Idempotencia adicional por (cogs, orderId)
  const dup = findJournalBySource('cogs', orderId, st);
  if (dup) return { warning:'already_posted', journalId:dup.id };
  const map = st.accountingMappings || seedAccountingMappings();
  const o = (st.orders||[]).find(x => x.id === orderId);
  if (!o) return { error:'order_not_found' };
  // Fase 3 — preferir el costo registrado en finishedStock para cerrar el loop 1430→6120
  // con el costo real de producción. Si no existe (Fase 1-2), caer al cálculo desde products[].
  let cost = 0;
  const fsArr = (st.finishedStock||st.finishedStocks||[]);
  const fs = fsArr.find(s => s.orderId === orderId && (+s.cost||+s.unitCost||+s.totalCost||0) > 0);
  if (fs) {
    if (+fs.totalCost > 0) cost = +fs.totalCost;
    else if (+fs.cost > 0) cost = +fs.cost * (+fs.qty||1);
    else if (+fs.unitCost > 0) cost = +fs.unitCost * (+fs.qty||1);
  }
  // costo = sum(state.products[].cost * order.qty) si no hay finishedStock
  if (cost <= 0 && o.productId) {
    const p = (st.products||[]).find(p => p.id === o.productId);
    if (p) cost = (+p.cost || 0) * (+o.qty || 1);
  }
  // si no hay productId, intentar via items
  if (!cost && Array.isArray(o.items)) {
    cost = o.items.reduce((a, it) => {
      const p = (st.products||[]).find(p => p.id === it.productId);
      return a + ((p ? +p.cost : 0) * (+it.qty||0));
    }, 0);
  }
  if (cost <= 0) return { error:'no_cost' };
  const m = map.cogs_on_invoice;
  const lines = [
    { accountCode: m.cogs,           debit: cost, credit: 0,    description:`COGS ${orderId}` },
    { accountCode: m.finished_goods, debit: 0,    credit: cost, description:`Salida PT ${orderId}` }
  ];
  return postJournalEntry({
    date: o.deliveryDate || _todayStr(),
    source: 'cogs',
    sourceId: orderId,
    description: `Costo de venta ${orderId}`,
    lines
  }, st);
}

/* =========================================================== HOOK · COBRO */
function postCustomerCollection(payment, target) {
  const st = _S(target);
  if (!payment) return { error:'no_payment' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.customer_collection;
  const taxRules = st.taxRules || seedTaxRules();

  const bankCode = _bankPucForId(payment.bankId, st) || m.bank_default;
  const amount = +payment.amount || 0;
  if (amount <= 0) return { error:'zero_amount' };

  // Tercero
  const customerId = payment.customerId || null;
  const cust = customerId ? (st.customers||[]).find(c => c.id === customerId) : null;
  const tp = cust ? { type:'customer', id:cust.id, name:cust.name, doc:cust.doc } :
                    { type:'customer', id:customerId, name:payment.clientName||payment.customerName||'Cliente', doc:null };

  // 1) Retenciones explícitas (lista [{ruleId|type, amount, account?}])
  let retenciones = Array.isArray(payment.retenciones) ? payment.retenciones.slice() : [];

  // 2) Si no se pasaron retenciones y el cliente es retenedor → calcular automáticamente.
  //    actividadRetencion: 'COMP'|'SERV'|'HON' → buscamos la regla rete_fuente cuyo conceptCode coincide.
  if (retenciones.length === 0 && cust && cust.retenedor === true) {
    // Para autocálculo necesitamos la base sin IVA del documento referenciado.
    // Si el payment trae invoiceId tomamos el desglose del invoice; si no, asumimos amount como inclusive.
    let baseRet = 0, ivaRet = 0;
    const linkedInvId = payment.invoiceId || (payment.invoiceIds && payment.invoiceIds[0]) || null;
    const inv = linkedInvId ? (st.invoices||[]).find(i => i.id === linkedInvId) : null;
    if (inv && inv.taxBreakdown) {
      // proporción si el cobro es parcial
      const ratio = (+inv.taxBreakdown.total > 0) ? (amount / inv.taxBreakdown.total) : 1;
      baseRet = (+inv.taxBreakdown.base || 0) * ratio;
      ivaRet  = (+inv.taxBreakdown.iva  || 0) * ratio;
    } else {
      // fallback: asumir 19% inclusive si actividadRetencion sugiere venta gravada
      const presumedRate = 0.19;
      baseRet = amount / (1 + presumedRate);
      ivaRet  = amount - baseRet;
    }
    const conceptMap = { COMP:'RTF-25', SERV:'RTF-35', HON:'RTF-11' };
    const rtfRuleId = conceptMap[(cust.actividadRetencion||'COMP').toUpperCase()] || 'RTF-25';
    const rtfRule = taxRules.find(r => r.id === rtfRuleId && r.type === 'rete_fuente');
    if (rtfRule && baseRet > 0) {
      const v = _round(baseRet * (+rtfRule.rate||0));
      // No fijar account aquí: rtfRule.account es la cuenta PRACTICADA (236xxx).
      // Para retenciones que el CLIENTE practica a Castor, el resolver de líneas
      // (más abajo) elegirá m.rete_fuente_received (135515) basado en r.type.
      if (v > 0) retenciones.push({ ruleId:rtfRule.id, type:rtfRule.type, amount:v });
    }
    // ReteIVA: si el cliente practica reteIVA, asumimos 15% del IVA
    if (cust.practicaReteIVA && ivaRet > 0) {
      const rivaRule = taxRules.find(r => r.id === 'RIVA-15' && r.type === 'rete_iva');
      if (rivaRule) {
        const v = _round(ivaRet * (+rivaRule.rate||0));
        // Idem: no fijar account; resolver elegirá m.rete_iva_received (135517).
        if (v > 0) retenciones.push({ ruleId:rivaRule.id, type:rivaRule.type, amount:v });
      }
    }
  }

  // Construir líneas de retenciones — el cliente practica retenciones a Castor;
  // Castor las registra como anticipos en el activo (135515/17/18), NO en 236xxx
  // (esa última es para retenciones que Castor practica a otros).
  let retTotal = 0;
  const retLines = [];
  for (const r of retenciones) {
    const v = +r.amount || 0;
    if (v <= 0) continue;
    let acc = r.account; // permitir override explícito
    let type = r.type;
    if (!type && r.ruleId) {
      const rule = taxRules.find(x => x.id === r.ruleId);
      if (rule) type = rule.type;
    }
    // Mapear tipo → cuenta receivable correspondiente
    if (!acc) {
      if (type === 'rete_fuente') acc = m.rete_fuente_received;
      else if (type === 'rete_iva') acc = m.rete_iva_received;
      else if (type === 'rete_ica') acc = m.rete_ica_received;
    }
    if (!acc) continue;
    retLines.push({
      accountCode: acc, debit: v, credit: 0,
      thirdParty: tp, description:`Retención ${r.ruleId||type||''}`
    });
    retTotal += v;
  }

  // Lado crédito: si es anticipo sin invoiceId → 280505; si no → 130505
  const isAnticipo = (payment.type === 'anticipo' || payment.tipo === 'anticipo') && !payment.invoiceId;
  const creditAccount = isAnticipo ? m.advance_received : m.receivable;

  const lines = [
    { accountCode: bankCode, debit: amount - retTotal, credit: 0, thirdParty:tp, description:`Cobro ${payment.id||''}` },
    ...retLines,
    { accountCode: creditAccount, debit: 0, credit: amount, thirdParty:tp, description: isAnticipo?`Anticipo ${payment.id||''}`:`Aplica cartera ${payment.id||''}` }
  ];

  // Persistir desglose en el payment para visualización
  payment.taxBreakdown = {
    bruto: amount,
    retenciones: retenciones.map(r => ({ ruleId:r.ruleId||null, type:r.type||null, amount:+r.amount||0 })),
    totalRetenciones: retTotal,
    neto: amount - retTotal
  };

  return postJournalEntry({
    date: payment.date || payment.approvedAt || _todayStr(),
    source: 'payment_in',
    sourceId: payment.id,
    description: `Cobro cliente ${tp.name}`,
    lines
  }, st);
}

function postCustomerAdvance(payment, target) {
  const p = Object.assign({}, payment, { type:'anticipo', invoiceId:null });
  return postCustomerCollection(p, target);
}

/* ====================================================== HOOK · COMPRA MP */
function postSupplyPurchase(receipt, target) {
  const st = _S(target);
  if (!receipt) return { error:'no_receipt' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.supply_purchase;
  const taxRules = st.taxRules || seedTaxRules();

  // base = sum items.qty * cost (excluyendo IVA)
  const items = Array.isArray(receipt.items) ? receipt.items :
                Array.isArray(receipt.detalle) ? receipt.detalle : [];
  let base = 0;
  for (const it of items) {
    const q = +it.qty || +it.cantidad || 0;
    const c = +it.cost || +it.unitCost || +it.unitPrice || 0;
    base += q * c;
  }
  if (!base && receipt.amount) base = +receipt.amount || 0;
  if (base <= 0) return { error:'no_base' };

  // Resolver regla IVA y retenciones a practicar
  const ivaRuleId = receipt.ivaRuleId || 'IVA-19';
  const ivaRule = taxRules.find(r => r.id === ivaRuleId && r.type === 'iva') || null;
  const retIds = Array.isArray(receipt.retenciones) ? receipt.retenciones : ['RTF-25'];
  const retRules = _resolveRetencionRules(retIds, st);

  const br = calcTaxBreakdown(base, { mode:'exclusive', ivaRule, retenciones: retRules });

  const sup = receipt.supplierId ? (st.suppliers||[]).find(s => s.id === receipt.supplierId) : null;
  const tp = sup ? { type:'supplier', id:sup.id, name:sup.name, doc:sup.nit||null } :
                   { type:'supplier', id:receipt.supplierId||null, name:receipt.supplierName||'Proveedor', doc:null };

  const lines = [
    { accountCode: m.inventory_raw, debit: br.base, credit: 0, description:`MP ${receipt.id||''}` }
  ];
  if (br.iva > 0) {
    const ivaAccount = (ivaRule && ivaRule.account_descontable) || m.iva_descontable;
    lines.push({ accountCode: ivaAccount, debit: br.iva, credit: 0, description:`IVA descontable ${receipt.id||''}` });
  }
  // Retenciones practicadas: cada una al crédito en la cuenta de la regla
  br.retenciones.forEach(r => {
    if (!r || r.amount <= 0 || !r.account) return;
    lines.push({ accountCode: r.account, debit: 0, credit: r.amount, thirdParty:tp, description:`Retención ${r.ruleId||''}` });
  });
  // Cuenta por pagar al neto (total bruto − retenciones practicadas)
  lines.push({ accountCode: m.payable, debit: 0, credit: br.totalNeto, thirdParty:tp, description:`CxP ${receipt.id||''}` });

  // Persistir desglose en el receipt
  receipt.taxBreakdown = {
    ivaRuleId: ivaRule ? ivaRule.id : null,
    base:  br.base,
    iva:   br.iva,
    total: br.total,
    retenciones: br.retenciones.map(r => ({ ruleId:r.ruleId, account:r.account, amount:r.amount })),
    totalRetenciones: br.totalRetenciones,
    neto: br.totalNeto
  };

  return postJournalEntry({
    date: receipt.date || receipt.receivedAt || _todayStr(),
    source: 'purchase',
    sourceId: receipt.id,
    description: `Compra MP · ${tp.name}`,
    lines
  }, st);
}

/* ====================================================== HOOK · PAGO PROVEEDOR */
function postSupplierPayment(outgoing, target) {
  const st = _S(target);
  if (!outgoing) return { error:'no_outgoing' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.supplier_payment;
  const amount = +outgoing.amount || 0;
  if (amount <= 0) return { error:'zero_amount' };
  const bankCode = _bankPucForId(outgoing.bankId, st) || m.bank_default;

  // Tercero: proveedor o empleado u otro
  let tp = null;
  if (outgoing.tipo === 'proveedor' && outgoing.beneficiarioId) {
    const s = (st.suppliers||[]).find(x => x.id === outgoing.beneficiarioId);
    if (s) tp = { type:'supplier', id:s.id, name:s.name, doc:s.nit||null };
  } else if (outgoing.tipo === 'empleado' && outgoing.beneficiarioId) {
    const e = (st.employees||[]).find(x => x.id === outgoing.beneficiarioId);
    if (e) tp = { type:'employee', id:e.id, name:e.name, doc:e.cedula||null };
  }
  if (!tp) tp = { type:'other', id:outgoing.beneficiarioId||null, name:outgoing.beneficiario||'Tercero', doc:null };

  // Si está vinculado a OC → descarga payable; si no → carga expense_default
  const debitAccount = outgoing.purchaseOrderId ? m.payable : m.expense_default;
  const lines = [
    { accountCode: debitAccount, debit: amount, credit: 0, thirdParty:tp, description:`Pago ${outgoing.id||''}` },
    { accountCode: bankCode,     debit: 0,      credit: amount, description:`Egreso banco` }
  ];

  // Nota Fase 2: outgoing.retencionesPracticadas se ignora aquí porque las retenciones
  // por compras ya se causaron en postSupplyPurchase. Si en el futuro se necesita causar
  // retenciones en pago (sin OC), se procesan análogamente con los mappings.

  return postJournalEntry({
    date: outgoing.date || outgoing.confirmedAt || _todayStr(),
    source: 'payment_out',
    sourceId: outgoing.id,
    description: `Pago a ${tp.name}`,
    lines
  }, st);
}

/* ===================================================== HOOK · AJUSTE BANCO */
function postBankAdjustment(arg, target) {
  const st = _S(target);
  const a = arg || {};
  const bankId = a.bankId;
  const delta = +a.delta || 0;
  const concept = a.concept || 'Ajuste banco';
  if (!bankId || delta === 0) return { error:'invalid' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.bank_adjustment;
  const bankCode = _bankPucForId(bankId, st);
  if (!bankCode) return { error:'no_bank_code' };

  // Tercero: el propio banco — para satisfacer requiresThirdParty en 425095/539595
  const bank = (st.bankAccounts||[]).find(b => b.id === bankId);
  const tp = { type:'other', id:bankId, name: bank?.name || ('Banco '+bankId), doc:null };

  let lines;
  if (delta > 0) {
    lines = [
      { accountCode: bankCode,         debit: delta, credit: 0,     description:concept, thirdParty: tp },
      { accountCode: m.diff_positive,  debit: 0,     credit: delta, description:concept, thirdParty: tp }
    ];
  } else {
    const v = -delta;
    lines = [
      { accountCode: m.diff_negative,  debit: v, credit: 0, description:concept, thirdParty: tp },
      { accountCode: bankCode,         debit: 0, credit: v, description:concept, thirdParty: tp }
    ];
  }

  return postJournalEntry({
    date: _todayStr(),
    source: 'adjustment',
    sourceId: 'BAJ-' + bankId + '-' + Date.now(),
    description: concept,
    lines
  }, st);
}

/* ====================================================== COST CENTER HELPER */
/**
 * _resolveCostCenter(area, target) — mapea el string libre `area` (de la OP) al
 * `code` de un centro de costo activo de `state.costCenters`.
 * Reglas:
 *   - 'CEDI' → 'CEDI'
 *   - cualquier estación de producción ('Carpintería', 'Preparación', 'Tapicería',
 *     'Metal Mecánica', 'Pintura electrostática', 'Tejido', 'Ensamble', 'Empaque',
 *     'Programación') → 'TALLER'
 *   - default → null (no se inyecta CC)
 * Devuelve el `code` (string), no el id.
 */
function _resolveCostCenter(area, target) {
  if (!area) return null;
  const st = _S(target);
  const a = String(area).toLowerCase().trim();
  const ccs = st.costCenters || [];
  function pick(code) {
    const cc = ccs.find(c => c.code === code && c.active !== false);
    return cc ? cc.code : null;
  }
  if (/^cedi$/.test(a)) return pick('CEDI');
  // estaciones de producción → TALLER
  if (/(carpinter|preparac|tapicer|metal\s*mec|pintura|tejido|ensamble|empaque|programac)/.test(a)) {
    return pick('TALLER');
  }
  return null;
}

/* ===================================================== HOOK · CONSUMO MP */
/**
 * postRawMaterialConsumption(issue, target) — registra DB 710505 / CR 140505
 *   issue: { id, type:'salida', items:[{supplyId, qty, unit?}], orderIds?:[], date? }
 *   - costoTotal = Σ qty * supply.cost
 *   - Idempotente por (consumption, issue.id).
 *   - Si orderIds.length===1 inyecta costCenter resuelto vía _resolveCostCenter(order.area).
 */
function postRawMaterialConsumption(issue, target) {
  const st = _S(target);
  if (!issue) return { error:'no_issue' };
  if (!issue.id) return { error:'missing_id' };
  const items = Array.isArray(issue.items) ? issue.items : [];
  if (!items.length) return { error:'no_items' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.supply_consumption;

  // costo total = Σ qty * supply.cost
  let costoTotal = 0;
  for (const it of items) {
    const sup = (st.supplies||[]).find(s => s.id === it.supplyId);
    const c = sup ? (+sup.cost || 0) : (+it.cost || 0);
    costoTotal += (+it.qty || 0) * c;
  }
  costoTotal = _round(costoTotal);
  if (costoTotal <= 0) return { error:'no_cost', message:'Consumo con costo cero' };

  // Centro de costo si la salida apunta a una sola OP
  let cc = null;
  const orderIds = Array.isArray(issue.orderIds) ? issue.orderIds : [];
  if (orderIds.length === 1) {
    const o = (st.orders||[]).find(x => x.id === orderIds[0]);
    if (o) cc = _resolveCostCenter(o.area, st);
  }

  const lines = [
    { accountCode: m.raw_consumed,  debit: costoTotal, credit: 0, costCenter: cc, description:`Consumo MP ${issue.id}` },
    { accountCode: m.inventory_raw, debit: 0, credit: costoTotal, description:`Salida MP ${issue.id}` }
  ];

  const res = postJournalEntry({
    date: issue.date || _todayStr(),
    source: 'consumption',
    sourceId: issue.id,
    description: `Consumo de materia prima ${issue.id}`,
    lines, costCenter: cc
  }, st);

  if (res.ok) issue.journalEntryId = res.journalId;
  return res;
}

/* ================================================== HOOK · DEVOLUCIÓN MP */
/**
 * postRawMaterialReturn(issue, target) — análogo invertido.
 *   DB 140505 / CR 710505 con costo total. Source: 'consumption_return'.
 */
function postRawMaterialReturn(issue, target) {
  const st = _S(target);
  if (!issue) return { error:'no_issue' };
  if (!issue.id) return { error:'missing_id' };
  const items = Array.isArray(issue.items) ? issue.items : [];
  if (!items.length) return { error:'no_items' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.supply_consumption;

  let costoTotal = 0;
  for (const it of items) {
    const sup = (st.supplies||[]).find(s => s.id === it.supplyId);
    const c = sup ? (+sup.cost || 0) : (+it.cost || 0);
    costoTotal += (+it.qty || 0) * c;
  }
  costoTotal = _round(costoTotal);
  if (costoTotal <= 0) return { error:'no_cost', message:'Devolución con costo cero' };

  let cc = null;
  const orderIds = Array.isArray(issue.orderIds) ? issue.orderIds : [];
  if (orderIds.length === 1) {
    const o = (st.orders||[]).find(x => x.id === orderIds[0]);
    if (o) cc = _resolveCostCenter(o.area, st);
  }

  const lines = [
    { accountCode: m.inventory_raw, debit: costoTotal, credit: 0, description:`Devolución MP ${issue.id}` },
    { accountCode: m.raw_consumed,  debit: 0, credit: costoTotal, costCenter: cc, description:`Reverso consumo ${issue.id}` }
  ];

  const res = postJournalEntry({
    date: issue.date || _todayStr(),
    source: 'consumption_return',
    sourceId: issue.id,
    description: `Devolución de materia prima ${issue.id}`,
    lines, costCenter: cc
  }, st);

  if (res.ok) issue.journalEntryId = res.journalId;
  return res;
}

/* ================================================== HOOK · PRODUCTO TERMINADO */
/**
 * postFinishedGoods(stock, target) — recibe el objeto creado por
 *   auditoriaCrearProductoCEDI: { id, orderId, productId, qty, cost? }.
 *
 * Decisión Fase 3 (documentada en plan §Fase 3 punto A.3):
 *   La cuenta 141005 (WIP) acumularía CRs sin contrapartida directa porque el
 *   flujo completo 71→1410→1430→6120 requiere un asiento intermedio
 *   DB 141005 / CR 710505 que en producción real se cierra con costos de
 *   MOD/CIF (Fase 4). Mientras tanto disparamos DOS asientos por PT:
 *     JE-A: DB 141005 / CR 710505  (cierre de costo de producción a WIP)
 *     JE-B: DB 143005 / CR 141005  (entrada al inventario de PT)
 *   Así 141005 queda en cero por OP y 710505 se balancea con 143005 vía WIP.
 *   En Fase 4, los deltas de MOD/CIF se ajustarán con asientos adicionales.
 *   Idempotencia: (fg_in, stock.id) cubre JE-B; (fg_wip_close, stock.id) cubre JE-A.
 */
function postFinishedGoods(stock, target) {
  const st = _S(target);
  if (!stock) return { error:'no_stock' };
  if (!stock.id) return { error:'missing_id' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.finished_goods_in;

  // Resolver costo total — PRIORIDAD: costo real consumido (de la consumption JE
  // asociada a la misma orden) > stock.totalCost > stock.cost*qty > products[].cost*qty.
  // Esto previene desbalances en 710505: la cuenta cierra al monto realmente
  // consumido, no a una estimación BOM que puede divergir. Si no hay consumption
  // previa para la orden, cae en los fallbacks (compatibilidad Fase 3 simplificada).
  let costoTotal = 0;
  if (stock.orderId) {
    const issues = (st.supplyIssues||[]).filter(iss =>
      iss.type === 'salida' &&
      Array.isArray(iss.orderIds) &&
      iss.orderIds.includes(stock.orderId)
    );
    let consumed = 0;
    issues.forEach(iss => {
      (iss.items||[]).forEach(it => {
        const sup = (st.supplies||[]).find(s => s.id === it.supplyId);
        if (sup) consumed += (+it.qty||0) * (+sup.cost||0);
      });
    });
    if (consumed > 0) costoTotal = consumed;
  }
  if (costoTotal <= 0 && +stock.totalCost > 0) costoTotal = +stock.totalCost;
  if (costoTotal <= 0 && +stock.cost > 0) costoTotal = +stock.cost * (+stock.qty || 1);
  if (costoTotal <= 0 && +stock.unitCost > 0) costoTotal = +stock.unitCost * (+stock.qty || 1);
  if (costoTotal <= 0 && stock.productId) {
    const p = (st.products||[]).find(x => x.id === stock.productId);
    if (p && +p.cost > 0) costoTotal = +p.cost * (+stock.qty || 1);
  }
  costoTotal = _round(costoTotal);
  if (costoTotal <= 0) return { error:'no_cost', message:'PT con costo cero' };

  // Centro de costo derivado de la OP origen (si existe) — siempre TALLER cuando hay producción
  let cc = null;
  if (stock.orderId) {
    const o = (st.orders||[]).find(x => x.id === stock.orderId);
    if (o) cc = _resolveCostCenter(o.area, st);
  }
  if (!cc) cc = _resolveCostCenter('CEDI', st); // fallback al CC del depósito

  const dup1 = findJournalBySource('fg_wip_close', stock.id, st);
  const dup2 = findJournalBySource('fg_in', stock.id, st);
  if (dup1 && dup2) return { warning:'already_posted', journalId:dup2.id };

  // JE-A: cierre de costo de producción a WIP — DB 141005 / CR 710505
  let resA = dup1 ? { ok:true, journalId:dup1.id } : null;
  if (!dup1) {
    resA = postJournalEntry({
      date: stock.requestedAt || stock.date || _todayStr(),
      source: 'fg_wip_close',
      sourceId: stock.id,
      description: `Cierre WIP por PT ${stock.id}`,
      lines: [
        { accountCode: m.wip,         debit: costoTotal, credit: 0, costCenter: cc, description:`Cierre costo producción ${stock.id}` },
        { accountCode: '710505',      debit: 0, credit: costoTotal, costCenter: cc, description:`Reverso a WIP ${stock.id}` }
      ],
      costCenter: cc
    }, st);
    if (resA.error) return resA;
  }

  // JE-B: entrada de PT — DB 143005 / CR 141005
  let resB = dup2 ? { ok:true, journalId:dup2.id } : null;
  if (!dup2) {
    resB = postJournalEntry({
      date: stock.requestedAt || stock.date || _todayStr(),
      source: 'fg_in',
      sourceId: stock.id,
      description: `Ingreso PT ${stock.id}`,
      lines: [
        { accountCode: m.finished_goods, debit: costoTotal, credit: 0, description:`PT ingresado ${stock.id}` },
        { accountCode: m.wip,            debit: 0, credit: costoTotal, costCenter: cc, description:`Salida WIP a PT ${stock.id}` }
      ],
      costCenter: cc
    }, st);
    if (resB.error) return resB;
  }

  // Persistir costo en el stock para que postCostOfSale pueda usarlo después
  if (!(+stock.cost > 0) && !(+stock.totalCost > 0) && !(+stock.unitCost > 0)) {
    stock.totalCost = costoTotal;
  }
  if (resB && resB.ok) stock.journalEntryId = resB.journalId;

  return { ok:true, journalId: resB.journalId, journalIdWipClose: resA.journalId };
}

/* ===================================================== HOOK · COSTO GARANTÍA */
/**
 * postWarrantyCost(warranty, costEntry, target) — registra un cargo manual a
 * un caso de garantía.
 *   costEntry: { id?, amount, source:'caja'|'almacen', supplyId?, qty?, description? }
 *   - source==='caja'    → DB 519540 / CR 110510 por amount
 *   - source==='almacen' → DB 519540 / CR 140505 por qty * supply.cost
 *   Idempotente por (warranty, warranty.id + ':' + costEntry.id).
 */
function postWarrantyCost(warranty, costEntry, target) {
  const st = _S(target);
  if (!warranty) return { error:'no_warranty' };
  if (!warranty.id) return { error:'missing_warranty_id' };
  if (!costEntry) return { error:'no_cost_entry' };
  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.warranty_cost;

  const ceId = costEntry.id || ('CE-' + (warranty.opCostos||[]).indexOf(costEntry));
  const sourceId = warranty.id + ':' + ceId;

  // Resolver monto
  let amount = +costEntry.amount || 0;
  let creditAccount = m.cash;
  const src = (costEntry.source || 'caja').toLowerCase();
  if (src === 'almacen') {
    creditAccount = m.raw_used;
    if (!(amount > 0)) {
      const sup = costEntry.supplyId ? (st.supplies||[]).find(s => s.id === costEntry.supplyId) : null;
      const c = sup ? (+sup.cost || 0) : 0;
      amount = (+costEntry.qty || 0) * c;
    }
  }
  amount = _round(amount);
  if (amount <= 0) return { error:'zero_amount', message:'Costo de garantía sin valor' };

  // Tercero — la cuenta 519540 requiere tercero. Resolvemos:
  //   1) cliente directo de la garantía si está poblado
  //   2) cliente vinculado a la OP origen (warranty.orderId → order.customerId)
  //   3) placeholder con el id de la garantía como referencia
  let tp = null;
  if (warranty.customerId) {
    const cust = (st.customers||[]).find(c => c.id === warranty.customerId);
    if (cust) tp = { type:'customer', id:cust.id, name:cust.name||warranty.clientName||'', doc:cust.doc||null };
  }
  if (!tp && warranty.orderId) {
    const ord = (st.orders||[]).find(o => o.id === warranty.orderId);
    if (ord && ord.customerId) {
      const cust = (st.customers||[]).find(c => c.id === ord.customerId);
      if (cust) tp = { type:'customer', id:cust.id, name:cust.name||warranty.clientName||'', doc:cust.doc||null };
    }
  }
  if (!tp) {
    tp = { type:'other', id:warranty.id, name:warranty.clientName || ('Garantía '+warranty.id), doc:null };
  }

  // CC: garantías típicamente cargan a TALLER
  const cc = _resolveCostCenter('Empaque', st) || null;

  const lines = [
    { accountCode: m.warranty_expense, debit: amount, credit: 0, costCenter: cc, thirdParty: tp, description:`Garantía ${warranty.id} · ${costEntry.description||costEntry.concept||''}` },
    { accountCode: creditAccount,      debit: 0, credit: amount, thirdParty: tp, description:`Costo garantía ${warranty.id}` }
  ];

  return postJournalEntry({
    date: costEntry.date || warranty.solucionAt || _todayStr(),
    source: 'warranty',
    sourceId,
    description: `Costo de garantía ${warranty.id}`,
    lines, costCenter: cc
  }, st);
}

/* ===================================================== HOOK · ASIENTO MANUAL */
function postManualEntry(payload, target) {
  const st = _S(target);
  const p = payload || {};
  const lines = Array.isArray(p.lines) ? p.lines : [];
  if (lines.length < 2) return { error:'too_few_lines', message:'Mínimo 2 líneas' };
  let totD=0, totC=0;
  for (const l of lines) { totD += +l.debit||0; totC += +l.credit||0; }
  if (totD === 0 && totC === 0) return { error:'zero_total', message:'Sumas en cero' };
  if (!_eqMoney(totD, totC)) return { error:'unbalanced', message:`DB ${_fmtCOP(totD)} ≠ CR ${_fmtCOP(totC)}` };

  if (!st.counters) st.counters = {};
  if (!st.counters.jeManual) st.counters.jeManual = 0;
  st.counters.jeManual++;
  const sourceId = 'JEM-' + String(st.counters.jeManual).padStart(4,'0');

  return postJournalEntry({
    date: p.date || _todayStr(),
    source: 'manual',
    sourceId,
    description: p.description || 'Asiento manual',
    lines, costCenter: p.costCenter || null
  }, st);
}

/* ====================================================== FASE 4 · NÓMINA Y AF
 *
 * Constantes parametrizables (Colombia · año 2026). Se inyectan en
 * state.companyTaxProfile.payrollParams en migrateAccountingV1 para que sean
 * editables. Riesgo ARL III aplica a fábrica de muebles.
 */
const PAYROLL_2026 = {
  smmlv:           1423500,    // SMMLV 2026 referencia
  auxTransporte:    200000,    // Auxilio transporte 2026
  saludEmp:           0.04,
  saludEmpr:          0.085,
  pensionEmp:         0.04,
  pensionEmpr:        0.12,
  arlIII:             0.00522, // riesgo III industria mueblera
  sena:               0.02,
  icbf:               0.03,
  caja:               0.04,    // total parafiscales = 0.09
  cesantiasProv:      0.0833,
  intCesantiasProv:   0.01,
  primaProv:          0.0833,
  vacacionesProv:     0.0417,
  exoneracionParafiscalesUmbralSMMLV: 10  // Ley 1607: < 10 SMMLV exonera salud(8.5%) + sena + icbf
};

/**
 * _resolvePayrollAccountSet(area, target) → conjunto de cuentas PUC del empleado
 * según el área. Devuelve null si el área no es reconocida (admin como fallback).
 * Castor Fase 4 - simplificación aceptada: 'Ventas' usa cuentas admin (5105xx)
 * para provisiones/aportes; sólo 'Producción' usa la familia MOD (720505 + 7305xx
 * + 720570). Resto (Contabilidad/Almacén/Administración) usa admin por defecto.
 */
function _resolvePayrollAccountSet(area, target) {
  const st = _S(target);
  const map = (st.accountingMappings && st.accountingMappings.payroll) || (seedAccountingMappings().payroll);
  const a = String(area||'').toLowerCase().trim();
  const isMOD = /^producci/.test(a);
  const isVentas = /^ventas$/.test(a);
  const salaryAccount = isMOD ? map.salary_mod : (isVentas ? map.salary_sales : map.salary_admin);
  return {
    isMOD,
    salary: salaryAccount,
    transport_aux: map.transport_aux,
    cesantias_provision:        isMOD ? map.cesantias_provision_mod        : map.cesantias_provision,
    int_cesantias_provision:    isMOD ? map.int_cesantias_provision_mod    : map.int_cesantias_provision,
    prima_provision:            isMOD ? map.prima_provision_mod            : map.prima_provision,
    vacaciones_provision:       isMOD ? map.vacaciones_provision_mod       : map.vacaciones_provision,
    eps_employer:               isMOD ? map.employer_charges_mod : map.eps_employer,
    pension_employer:           isMOD ? map.employer_charges_mod : map.pension_employer,
    arl_employer:               isMOD ? map.employer_charges_mod : map.arl_employer,
    parafiscales_employer:      isMOD ? map.employer_charges_mod : map.parafiscales_employer,
    rete_fuente_employee:       map.rete_fuente_employee,
    eps_payable:                map.eps_payable,
    pension_payable:            map.pension_payable,
    arl_payable:                map.arl_payable,
    parafiscales_payable:       map.parafiscales_payable,
    cesantias_payable:          map.cesantias_payable,
    int_cesantias_payable:      map.int_cesantias_payable,
    prima_payable:              map.prima_payable,
    vacaciones_payable:         map.vacaciones_payable,
    salary_payable:             map.salary_payable
  };
}

/**
 * _resolveSalaryAccount(employee) — devuelve la cuenta PUC del salario según área.
 * 'Producción' → 720505 MOD; 'Ventas' → 520506; otras → 510506.
 */
function _resolveSalaryAccount(employee, target) {
  return _resolvePayrollAccountSet(employee && employee.area, target).salary;
}

/**
 * _resolveCostCenterEmployee(area, target) — para nómina, mapea áreas reales
 * (Ventas/Producción/Contabilidad/Almacén) a centros de costo. No usa el
 * helper genérico _resolveCostCenter porque éste mapea estaciones de
 * producción, no áreas de empleados.
 */
function _resolveCostCenterEmployee(area, target) {
  const st = _S(target);
  const ccs = st.costCenters || [];
  const a = String(area||'').toLowerCase().trim();
  function pick(code) {
    const cc = ccs.find(c => c.code === code && c.active !== false);
    return cc ? cc.code : null;
  }
  if (/^ventas$/.test(a)) return pick('VENTAS');
  if (/^producci/.test(a)) return pick('TALLER');
  if (/^almac/.test(a))  return pick('CEDI');
  if (/^contab|admin/.test(a)) return pick('ADMIN');
  return null;
}

/**
 * _payrollParams(target) — devuelve la copia activa de PAYROLL_2026 (con
 * overrides desde companyTaxProfile.payrollParams si existen).
 */
function _payrollParams(target) {
  const st = _S(target);
  const params = (st.companyTaxProfile && st.companyTaxProfile.payrollParams) || null;
  if (!params) return Object.assign({}, PAYROLL_2026);
  return Object.assign({}, PAYROLL_2026, params);
}

/**
 * _calcEmployeePayroll(employee, params) → cifras numéricas del periodo para 1 empleado.
 * No persiste nada. Se reutiliza para preview en UI y para el cálculo de runPayroll.
 */
function _calcEmployeePayroll(employee, params) {
  const e = employee || {};
  const p = params || PAYROLL_2026;
  const salario = _r0(+e.salario || 0);
  const aplicaAuxTpte = salario > 0 && salario < (2 * p.smmlv);
  const auxTpte = aplicaAuxTpte ? _r0(p.auxTransporte) : 0;
  const baseAportes = salario;          // sin aux transporte
  const baseProv    = salario + auxTpte;// con aux transporte
  const exonera = salario > 0 && salario < (p.exoneracionParafiscalesUmbralSMMLV * p.smmlv);

  const saludEmp   = _r0(baseAportes * p.saludEmp);
  const pensionEmp = _r0(baseAportes * p.pensionEmp);
  const reteFte    = 0; // Fase 4: simplificado, sin RFT calculado por empleado.

  const saludEmpr   = exonera ? 0 : _r0(baseAportes * p.saludEmpr);
  const pensionEmpr = _r0(baseAportes * p.pensionEmpr);
  const arl         = _r0(baseAportes * p.arlIII);
  const sena        = exonera ? 0 : _r0(baseAportes * p.sena);
  const icbf        = exonera ? 0 : _r0(baseAportes * p.icbf);
  const caja        = _r0(baseAportes * p.caja);
  const parafiscales = sena + icbf + caja; // caja NO se exonera

  const cesantias    = _r0(baseProv * p.cesantiasProv);
  const intCesantias = _r0(baseProv * p.intCesantiasProv);
  const prima        = _r0(baseProv * p.primaProv);
  const vacaciones   = _r0(baseProv * p.vacacionesProv);

  const totalDevengado = salario + auxTpte;
  const totalDeducciones = saludEmp + pensionEmp + reteFte;
  const neto = totalDevengado - totalDeducciones;

  return {
    employeeId: e.id || null,
    name: e.name || '',
    area: e.area || '',
    salario, auxTpte, totalDevengado,
    deducciones: { salud: saludEmp, pension: pensionEmp, reteFte, total: totalDeducciones },
    aportes:     { saludEmpr, pensionEmpr, arl, sena, icbf, caja, parafiscales,
                   total: saludEmpr + pensionEmpr + arl + parafiscales },
    provisiones: { cesantias, intCesantias, prima, vacaciones,
                   total: cesantias + intCesantias + prima + vacaciones },
    neto,
    exoneraSyP: exonera,
    aplicaAuxTpte
  };
}

/* ============================================================ runPayroll */
/**
 * runPayroll(periodId, employeeIds, target)
 *   periodId: 'YYYY-MM' (obligatorio)
 *   employeeIds: array opcional (default: empleados activos)
 *   - Idempotente: si ya hay run para periodId → {warning:'already_run', runId}
 *   - Persiste en state.payrollRuns
 *   - state.counters.payrollRun++
 */
function runPayroll(periodId, employeeIds, target) {
  const st = _S(target);
  if (!periodId || !/^\d{4}-\d{2}$/.test(periodId)) {
    return { error:'invalid_period', message:'periodId debe ser YYYY-MM' };
  }
  if (!Array.isArray(st.payrollRuns)) st.payrollRuns = [];
  const existing = st.payrollRuns.find(r => r.periodId === periodId);
  if (existing) return { warning:'already_run', runId: existing.id };

  const all = (st.employees || []).filter(e => e.estado === 'activo');
  const list = (Array.isArray(employeeIds) && employeeIds.length)
    ? all.filter(e => employeeIds.includes(e.id))
    : all;
  if (!list.length) return { error:'no_employees', message:'Sin empleados activos para nómina' };

  const params = _payrollParams(st);
  const calcs = list.map(e => _calcEmployeePayroll(e, params));

  // Totales del run
  const tot = {
    salario: 0, auxTpte: 0, totalDevengado: 0,
    deducciones: 0, aportes: 0, provisiones: 0, neto: 0
  };
  calcs.forEach(c => {
    tot.salario += c.salario;
    tot.auxTpte += c.auxTpte;
    tot.totalDevengado += c.totalDevengado;
    tot.deducciones += c.deducciones.total;
    tot.aportes += c.aportes.total;
    tot.provisiones += c.provisiones.total;
    tot.neto += c.neto;
  });

  if (!st.counters) st.counters = {};
  if (!st.counters.payrollRun) st.counters.payrollRun = 0;
  st.counters.payrollRun++;

  const run = {
    id: 'NOM-' + periodId,
    periodId,
    runAt: _nowISO(),
    employees: calcs,
    totals: tot,
    journalEntryId: null,
    paramsSnapshot: Object.assign({}, params)
  };
  st.payrollRuns.unshift(run);
  return { ok:true, runId: run.id, run };
}

/* ============================================================ postPayroll */
/**
 * postPayroll(run, target) — genera asiento contable consolidado del run.
 *   - Idempotente por (source='payroll', sourceId=run.id)
 *   - Persiste run.journalEntryId
 *   - Inyecta CC por área en cada línea
 *
 * Estructura del asiento por empleado:
 *   Devengado (DB): salario, aux tpte
 *   Provisiones (DB): cesantías, int cesantías, prima, vacaciones
 *   Aportes empleador (DB): salud_empr, pensión_empr, ARL, parafiscales
 *   Pasivos (CR): salud, pensión, ARL, parafiscales, cesantías, int cesantías,
 *                  prima, vacaciones, neto, rete fte (si > 0)
 */
function postPayroll(run, target) {
  const st = _S(target);
  if (!run) return { error:'no_run' };
  if (!run.id) return { error:'missing_run_id' };
  if (!Array.isArray(run.employees) || !run.employees.length) {
    return { error:'no_employees', message:'Run sin empleados' };
  }

  const lines = [];
  // Acumuladores consolidados por cuenta para legibilidad del JE
  for (const c of run.employees) {
    const emp = (st.employees||[]).find(x => x.id === c.employeeId) || { id:c.employeeId, name:c.name, area:c.area };
    const accSet = _resolvePayrollAccountSet(emp.area, st);
    const cc = _resolveCostCenterEmployee(emp.area, st);
    const tp = { type:'employee', id:emp.id, name:emp.name||'', doc:emp.doc||null };
    const tag = `Nómina ${run.periodId} · ${emp.name||emp.id}`;

    /* DEVENGADO (DB) */
    if (c.salario > 0) {
      lines.push({ accountCode: accSet.salary, debit: c.salario, credit:0,
                   thirdParty: tp, costCenter: cc, description: `Sueldo ${tag}` });
    }
    if (c.auxTpte > 0) {
      lines.push({ accountCode: accSet.transport_aux, debit: c.auxTpte, credit:0,
                   thirdParty: tp, costCenter: cc, description: `Aux transporte ${tag}` });
    }

    /* PROVISIONES (DB) */
    if (c.provisiones.cesantias > 0) {
      lines.push({ accountCode: accSet.cesantias_provision, debit: c.provisiones.cesantias, credit:0,
                   thirdParty: tp, costCenter: cc, description: `Provisión cesantías ${tag}` });
    }
    if (c.provisiones.intCesantias > 0) {
      lines.push({ accountCode: accSet.int_cesantias_provision, debit: c.provisiones.intCesantias, credit:0,
                   thirdParty: tp, costCenter: cc, description: `Prov. int cesantías ${tag}` });
    }
    if (c.provisiones.prima > 0) {
      lines.push({ accountCode: accSet.prima_provision, debit: c.provisiones.prima, credit:0,
                   thirdParty: tp, costCenter: cc, description: `Provisión prima ${tag}` });
    }
    if (c.provisiones.vacaciones > 0) {
      lines.push({ accountCode: accSet.vacaciones_provision, debit: c.provisiones.vacaciones, credit:0,
                   thirdParty: tp, costCenter: cc, description: `Provisión vacaciones ${tag}` });
    }

    /* APORTES EMPLEADOR (DB) — para MOD se consolidan en 720570 */
    if (accSet.isMOD) {
      const totalEmprMOD = c.aportes.saludEmpr + c.aportes.pensionEmpr + c.aportes.arl + c.aportes.parafiscales;
      if (totalEmprMOD > 0) {
        lines.push({ accountCode: accSet.eps_employer, debit: totalEmprMOD, credit:0,
                     thirdParty: tp, costCenter: cc,
                     description: `Aportes empleador MOD ${tag} (salud+pensión+ARL+parafiscales)` });
      }
    } else {
      if (c.aportes.saludEmpr > 0) {
        lines.push({ accountCode: accSet.eps_employer, debit: c.aportes.saludEmpr, credit:0,
                     thirdParty: tp, costCenter: cc, description: `Salud empleador ${tag}` });
      }
      if (c.aportes.pensionEmpr > 0) {
        lines.push({ accountCode: accSet.pension_employer, debit: c.aportes.pensionEmpr, credit:0,
                     thirdParty: tp, costCenter: cc, description: `Pensión empleador ${tag}` });
      }
      if (c.aportes.arl > 0) {
        lines.push({ accountCode: accSet.arl_employer, debit: c.aportes.arl, credit:0,
                     thirdParty: tp, costCenter: cc, description: `ARL ${tag}` });
      }
      if (c.aportes.parafiscales > 0) {
        lines.push({ accountCode: accSet.parafiscales_employer, debit: c.aportes.parafiscales, credit:0,
                     thirdParty: tp, costCenter: cc, description: `Parafiscales SENA+ICBF+Caja ${tag}` });
      }
    }

    /* PASIVOS (CR) */
    // EPS placeholder como tercero genérico para pasivos parafiscales
    const tpEPS    = { type:'other', id:'EPS', name:'EPS placeholder', doc:null };
    const tpAFP    = { type:'other', id:'AFP', name:'Fondo pensional placeholder', doc:null };
    const tpARL    = { type:'other', id:'ARL', name:'ARL Sura/Positiva placeholder', doc:null };
    const tpParafis= { type:'other', id:'PARAFIS', name:'SENA/ICBF/Caja placeholder', doc:null };
    const tpDIAN   = { type:'other', id:'DIAN', name:'DIAN', doc:null };

    if (c.neto > 0) {
      lines.push({ accountCode: accSet.salary_payable, debit:0, credit: c.neto,
                   thirdParty: tp, costCenter: cc, description: `Neto a pagar ${tag}` });
    }
    if (c.provisiones.cesantias > 0) {
      lines.push({ accountCode: accSet.cesantias_payable, debit:0, credit: c.provisiones.cesantias,
                   thirdParty: tp, costCenter: cc, description: `CxP cesantías ${tag}` });
    }
    if (c.provisiones.intCesantias > 0) {
      lines.push({ accountCode: accSet.int_cesantias_payable, debit:0, credit: c.provisiones.intCesantias,
                   thirdParty: tp, costCenter: cc, description: `CxP int cesantías ${tag}` });
    }
    if (c.provisiones.prima > 0) {
      lines.push({ accountCode: accSet.prima_payable, debit:0, credit: c.provisiones.prima,
                   thirdParty: tp, costCenter: cc, description: `CxP prima ${tag}` });
    }
    if (c.provisiones.vacaciones > 0) {
      lines.push({ accountCode: accSet.vacaciones_payable, debit:0, credit: c.provisiones.vacaciones,
                   thirdParty: tp, costCenter: cc, description: `CxP vacaciones ${tag}` });
    }
    const saludTotal   = c.deducciones.salud   + c.aportes.saludEmpr;
    const pensionTotal = c.deducciones.pension + c.aportes.pensionEmpr;
    if (saludTotal > 0) {
      lines.push({ accountCode: accSet.eps_payable, debit:0, credit: saludTotal,
                   thirdParty: tpEPS, costCenter: cc, description: `Aportes salud ${tag}` });
    }
    if (pensionTotal > 0) {
      lines.push({ accountCode: accSet.pension_payable, debit:0, credit: pensionTotal,
                   thirdParty: tpAFP, costCenter: cc, description: `Aportes pensión ${tag}` });
    }
    if (c.aportes.arl > 0) {
      lines.push({ accountCode: accSet.arl_payable, debit:0, credit: c.aportes.arl,
                   thirdParty: tpARL, costCenter: cc, description: `ARL por pagar ${tag}` });
    }
    if (c.aportes.parafiscales > 0) {
      lines.push({ accountCode: accSet.parafiscales_payable, debit:0, credit: c.aportes.parafiscales,
                   thirdParty: tpParafis, costCenter: cc, description: `Parafiscales por pagar ${tag}` });
    }
    if (c.deducciones.reteFte > 0) {
      lines.push({ accountCode: accSet.rete_fuente_employee, debit:0, credit: c.deducciones.reteFte,
                   thirdParty: tpDIAN, costCenter: cc, description: `Rete fte empleado ${tag}` });
    }
  }

  if (!lines.length) return { error:'no_lines', message:'Run sin líneas a contabilizar' };

  const date = (run.periodId ? run.periodId + '-28' : _todayStr()); // 28 del mes (mid-period safe)
  const res = postJournalEntry({
    date,
    source: 'payroll',
    sourceId: run.id,
    description: `Nómina ${run.periodId} · ${run.employees.length} empleado(s)`,
    lines
  }, st);

  if (res.ok || res.journalId) {
    run.journalEntryId = res.journalId;
  }
  return res;
}

/* ============================================== runMonthlyDepreciation/postDepreciation */

/**
 * _resolveDepreciationAccounts(asset, target) → {expense, accumulated}
 *   Por uso: 'admin' → 516015/159220 (oficina), 'sales' → 526010/159220, 'cif' → 730560/159220.
 *   Por categoría adicional, override de cuenta acumulada:
 *     'computacion' → 159225, 'transporte' → 159240, 'construcciones' → 159205.
 */
function _resolveDepreciationAccounts(asset, target) {
  const st = _S(target);
  const map = (st.accountingMappings && st.accountingMappings.depreciation) || (seedAccountingMappings().depreciation);
  const usage = String(asset.usage||'admin').toLowerCase();
  let expense = map.expense_admin;
  if (usage === 'sales' || usage === 'ventas') expense = map.expense_sales;
  else if (usage === 'cif' || usage === 'produccion' || usage === 'producción') expense = map.expense_cif;
  // Si el usuario especificó accountCode (gasto) en el activo, lo respetamos
  if (asset.expenseAccountCode) expense = asset.expenseAccountCode;

  const cat = String(asset.category||'').toLowerCase();
  let accumulated = map.accumulated_oficina || map.accumulated;
  if (/comput/.test(cat))      accumulated = map.accumulated_computacion || accumulated;
  else if (/transp|veh/.test(cat)) accumulated = map.accumulated_transporte || accumulated;
  else if (/constr|edif/.test(cat)) accumulated = map.accumulated_construcciones || accumulated;
  if (asset.accumulatedAccountCode) accumulated = asset.accumulatedAccountCode;

  return { expense, accumulated };
}

/**
 * runMonthlyDepreciation(periodId, target) — calcula depreciación del mes.
 * Idempotente por periodId. Persiste en state.depreciationRuns.
 */
function runMonthlyDepreciation(periodId, target) {
  const st = _S(target);
  if (!periodId || !/^\d{4}-\d{2}$/.test(periodId)) {
    return { error:'invalid_period', message:'periodId debe ser YYYY-MM' };
  }
  if (!Array.isArray(st.depreciationRuns)) st.depreciationRuns = [];
  const existing = st.depreciationRuns.find(r => r.periodId === periodId);
  if (existing) return { warning:'already_run', runId: existing.id };

  const assets = (st.fixedAssets || []).filter(a => a.estado === 'activo');
  if (!assets.length) return { error:'no_assets', message:'Sin activos fijos activos' };

  const out = [];
  let total = 0;
  for (const a of assets) {
    const cost      = +a.cost || 0;
    const salvage   = +a.salvageValue || 0;
    const useful    = +a.usefulLifeMonths || 0;
    if (useful <= 0 || cost <= 0) continue;
    const depMensual = _r0((cost - salvage) / useful);
    if (depMensual <= 0) continue;
    const depAcumPrev = _r0(+a.depAcumulada || 0);
    let depAcumNueva  = depAcumPrev + depMensual;
    const cap = _r0(cost - salvage);
    let monto = depMensual;
    if (depAcumNueva > cap) {
      monto = Math.max(0, cap - depAcumPrev);
      depAcumNueva = depAcumPrev + monto;
    }
    if (monto <= 0) continue;
    out.push({ assetId:a.id, monto, depAcumPrev, depAcumNueva });
    total += monto;
  }
  if (!out.length) return { error:'no_assets_to_depreciate', message:'Ningún activo con cuota válida' };

  if (!st.counters) st.counters = {};
  if (!st.counters.depRun) st.counters.depRun = 0;
  st.counters.depRun++;

  const run = {
    id: 'DEP-' + periodId,
    periodId,
    runAt: _nowISO(),
    assets: out,
    totals: { monto: total, count: out.length },
    journalEntryId: null
  };
  st.depreciationRuns.unshift(run);

  // Aplicar nuevas dep acum al state.fixedAssets
  for (const item of out) {
    const a = (st.fixedAssets||[]).find(x => x.id === item.assetId);
    if (a) a.depAcumulada = item.depAcumNueva;
  }

  return { ok:true, runId: run.id, run };
}

/**
 * postDepreciation(run, target) — genera el asiento del run.
 *   Por cada asset: DB expense_account / CR accumulated_account.
 *   Idempotente por (source='depreciation', sourceId=run.id).
 */
function postDepreciation(run, target) {
  const st = _S(target);
  if (!run) return { error:'no_run' };
  if (!run.id) return { error:'missing_run_id' };
  if (!Array.isArray(run.assets) || !run.assets.length) {
    return { error:'no_assets', message:'Run sin activos' };
  }

  const lines = [];
  for (const item of run.assets) {
    const asset = (st.fixedAssets||[]).find(a => a.id === item.assetId);
    if (!asset) continue;
    const accs = _resolveDepreciationAccounts(asset, st);
    // CC opcional según uso
    let cc = null;
    const usage = String(asset.usage||'').toLowerCase();
    if (usage === 'admin')    cc = (st.costCenters||[]).find(c => c.code==='ADMIN' && c.active!==false)?.code || null;
    else if (usage === 'sales' || usage === 'ventas') cc = (st.costCenters||[]).find(c => c.code==='VENTAS' && c.active!==false)?.code || null;
    else if (usage === 'cif' || usage === 'produccion' || usage === 'producción') cc = (st.costCenters||[]).find(c => c.code==='TALLER' && c.active!==false)?.code || null;

    lines.push({ accountCode: accs.expense, debit: item.monto, credit: 0,
                 costCenter: cc, description:`Depreciación ${asset.id} · ${asset.name||''}` });
    lines.push({ accountCode: accs.accumulated, debit: 0, credit: item.monto,
                 costCenter: cc, description:`Dep acum ${asset.id} · ${asset.name||''}` });
  }
  if (!lines.length) return { error:'no_lines' };

  const date = run.periodId + '-28';
  const res = postJournalEntry({
    date,
    source: 'depreciation',
    sourceId: run.id,
    description: `Depreciación ${run.periodId} · ${run.assets.length} activo(s)`,
    lines
  }, st);

  if (res.ok || res.journalId) {
    run.journalEntryId = res.journalId;
  }
  return res;
}

/* ============================================================ MIGRACIÓN V1 */
function migrateAccountingV1() {
  const st = _S();
  if (!st) return;
  st.flags = st.flags || {};
  // Garantías idempotentes Fase 4 — corren siempre, no protegidas por accountingV1Done.
  // Esto permite que estados pre-Fase4 obtengan los arrays nuevos al recargar.
  if (!Array.isArray(st.fixedAssets))      st.fixedAssets = [];
  if (!Array.isArray(st.payrollRuns))      st.payrollRuns = [];
  if (!Array.isArray(st.depreciationRuns)) st.depreciationRuns = [];
  if (!st.counters) st.counters = {};
  if (!('payrollRun' in st.counters)) st.counters.payrollRun = 0;
  if (!('depRun' in st.counters))     st.counters.depRun = 0;
  if (!('asset' in st.counters))      st.counters.asset = 0;
  if (st.companyTaxProfile && !st.companyTaxProfile.payrollParams) {
    st.companyTaxProfile.payrollParams = Object.assign({}, PAYROLL_2026);
  }
  // Upgrades incrementales Fase 4 → solo si V1 ya estaba completo (state legacy
  // pre-F4). Sin esto, una pucAccounts:[] vacía recibiría 4 cuentas y luego el
  // seed completo se saltaría por length>0 — bug detectado en validación E2E.
  if (st.flags.accountingV1Done) {
    // Mappings nuevos sin sobreescribir si el usuario los modificó
    if (st.accountingMappings) {
      const seedM = seedAccountingMappings();
      if (st.accountingMappings.payroll) {
        Object.keys(seedM.payroll).forEach(k => {
          if (!(k in st.accountingMappings.payroll)) st.accountingMappings.payroll[k] = seedM.payroll[k];
        });
      }
      if (st.accountingMappings.depreciation) {
        Object.keys(seedM.depreciation).forEach(k => {
          if (!(k in st.accountingMappings.depreciation)) st.accountingMappings.depreciation[k] = seedM.depreciation[k];
        });
      }
    }
    // Cuentas PUC nuevas (730527/730530/730533/730536) si faltan
    if (Array.isArray(st.pucAccounts)) {
      const need = [
        ['730527','Cesantías MOD'],
        ['730530','Intereses cesantías MOD'],
        ['730533','Prima de servicios MOD'],
        ['730536','Vacaciones MOD']
      ];
      for (const [code, name] of need) {
        if (!st.pucAccounts.find(a => a.code === code)) {
          st.pucAccounts.push({
            code, level:6, parentCode:'7305', name, classCode:'7', nature:'debito', type:'auxiliar',
            active:true, system:true, requiresThirdParty:true, requiresCostCenter:true, taxRelated:null
          });
        }
      }
    }
    return;
  }

  // Inicializar arrays/seeds si están vacíos
  if (!Array.isArray(st.pucAccounts) || st.pucAccounts.length === 0) {
    st.pucAccounts = seedPucCatalog();
  }
  // accountingMappings: Demo6 lo inicializa como `{}` cuando seedAccountingMappings
  // no está disponible al construir el seed; check estricto por keys, no por truthy.
  if (!st.accountingMappings || Object.keys(st.accountingMappings).length === 0) {
    st.accountingMappings = seedAccountingMappings();
  }
  if (!Array.isArray(st.taxRules) || st.taxRules.length === 0) st.taxRules = seedTaxRules();
  if (!Array.isArray(st.docNumbering) || st.docNumbering.length === 0) st.docNumbering = seedDocNumbering();
  if (!Array.isArray(st.costCenters) || st.costCenters.length === 0) st.costCenters = seedCostCenters();
  if (!Array.isArray(st.fiscalPeriods) || st.fiscalPeriods.length === 0) st.fiscalPeriods = seedFiscalPeriods();
  if (!Array.isArray(st.journalEntries)) st.journalEntries = [];
  if (!Array.isArray(st.journalLines)) st.journalLines = [];
  // Fase 4 — arrays nuevos para nómina y activos fijos
  if (!Array.isArray(st.fixedAssets))      st.fixedAssets = [];
  if (!Array.isArray(st.payrollRuns))      st.payrollRuns = [];
  if (!Array.isArray(st.depreciationRuns)) st.depreciationRuns = [];
  if (!st.counters) st.counters = {};
  if (!('je' in st.counters)) st.counters.je = 0;
  if (!('jeManual' in st.counters)) st.counters.jeManual = 0;
  if (!('payrollRun' in st.counters)) st.counters.payrollRun = 0;
  if (!('depRun' in st.counters)) st.counters.depRun = 0;
  if (!('asset' in st.counters)) st.counters.asset = 0;
  if (!st.companyTaxProfile) st.companyTaxProfile = _defaultTaxProfile();
  // Fase 4 — parámetros de nómina parametrizables
  if (!st.companyTaxProfile.payrollParams) {
    st.companyTaxProfile.payrollParams = Object.assign({}, PAYROLL_2026);
  }

  // Asegurar pucCode por banco
  (st.bankAccounts||[]).forEach(b => { try { ensureBankPucAccount(b, st); } catch(e){} });

  // Re-generar journal a partir de seeds (idempotente por source/sourceId)
  // 1) Pagos confirmados de clientes
  (st.payments||[]).filter(p => p.estado === 'confirmado').forEach(p => {
    try { postCustomerCollection(p, st); } catch(e){ console.warn('migrate collection',e); }
  });
  // 2) Pagos salientes confirmados
  (st.outgoingPayments||[]).filter(p => p.estado === 'confirmado').forEach(p => {
    try { postSupplierPayment(p, st); } catch(e){ console.warn('migrate out',e); }
  });
  // 3) Facturas/remisiones existentes
  (st.invoices||[]).forEach(inv => {
    try { postSale(inv, st); } catch(e){ console.warn('migrate sale',e); }
  });

  st.flags.accountingV1Done = true;
}

/* ============================================================== UI · UTILS */
/**
 * _iterAccountLines(target, opts, fn) — recorre journalLines filtrando por estado JE,
 * (opcional) accountCode, fechas y status. Llama fn({line, je}) por cada coincidencia.
 *
 * opts: {
 *   code?: string,                  // si se da, filtra por accountCode exacto
 *   asOfDate?: string,              // je.date <= asOfDate
 *   from?: string, to?: string,     // rango je.date inclusive
 *   includeReversed?: boolean       // true: 'posted'|'reversed' (saldos);
 *                                   // false (default): solo 'posted' (rangos/movimientos/cierre)
 * }
 *
 * Centraliza el patrón duplicado en getSaldoCuenta, getSaldoCuentaRango,
 * getMovimientosCuenta, _assertAccountBalance, closePeriod, _saldosByAccount.
 */
function _iterAccountLines(target, opts, fn) {
  const st = _S(target);
  const o = opts || {};
  const lines = st.journalLines || [];
  const jes   = st.journalEntries || [];
  // index JE por id para lookup O(1) en lugar de O(N*M)
  const jeById = {};
  for (let i = 0; i < jes.length; i++) jeById[jes[i].id] = jes[i];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (o.code && l.accountCode !== o.code) continue;
    const je = jeById[l.journalId];
    if (!je) continue;
    if (o.includeReversed) {
      if (je.status !== 'posted' && je.status !== 'reversed') continue;
    } else {
      if (je.status !== 'posted') continue;
    }
    if (o.asOfDate && je.date > o.asOfDate) continue;
    if (o.from && je.date < o.from) continue;
    if (o.to && je.date > o.to) continue;
    fn(l, je);
  }
}

function _saldosByAccount(target) {
  const out = {};
  _iterAccountLines(target, { includeReversed:true }, (l) => {
    const o = out[l.accountCode] || (out[l.accountCode] = { code:l.accountCode, debit:0, credit:0 });
    o.debit += +l.debit || 0;
    o.credit += +l.credit || 0;
  });
  return out;
}

function _saldoOf(code, target) {
  const acc = _findAccount(code, target);
  if (!acc) return 0;
  const s = _saldosByAccount(target)[code] || { debit:0, credit:0 };
  return acc.nature === 'debito' ? (s.debit - s.credit) : (s.credit - s.debit);
}

/* ============================================================ SUBSIDEBAR */
function renderContabSubnav() {
  const cur = window.contabSection || 'dashboard';
  const item = (id, label, enabled) => {
    const active = cur === id;
    const classes = active
      ? 'block px-3 py-2 rounded text-sm bg-brand-navy text-brand-gold font-semibold'
      : enabled
        ? 'block px-3 py-2 rounded text-sm text-brand-cream hover:bg-brand-navy hover:text-brand-gold cursor-pointer'
        : 'block px-3 py-2 rounded text-sm text-brand-muted opacity-50 cursor-not-allowed';
    const onclick = enabled ? `onclick="setContabSection('${id}')"` : '';
    const badge = enabled ? '' : '<span class="text-[10px] ml-1">(próx.)</span>';
    return `<a ${onclick} class="${classes}">${label}${badge}</a>`;
  };
  return `
    <div class="space-y-1">
      <div class="text-[10px] uppercase text-brand-muted px-2 mt-2 mb-1 tracking-wider">Operación</div>
      ${item('dashboard',    'Dashboard',          true)}
      ${item('libro-diario', 'Libro Diario',       true)}
      ${item('libro-mayor',  'Libro Mayor',        true)}
      ${item('auxiliar',     'Auxiliar cuenta',    true)}
      ${item('manuales',     'Asientos manuales',  true)}
      ${item('facturacion',  'Facturación',        true)}
      <div class="text-[10px] uppercase text-brand-muted px-2 mt-3 mb-1 tracking-wider">Reportes</div>
      ${item('balance-prueba','Balance prueba',    true)}
      ${item('balance-gen',  'Balance General',    true)}
      ${item('pyg',          'P&G',                true)}
      ${item('cartera',      'Cartera',            true)}
      ${item('cxp',          'Cuentas por pagar',  true)}
      ${item('aux-iva',      'Aux IVA',            true)}
      ${item('aux-ret',      'Aux Retenciones',    true)}
      <div class="text-[10px] uppercase text-brand-muted px-2 mt-3 mb-1 tracking-wider">Exportación</div>
      ${item('exporta',      'Hub de Exportación', true)}
      <div class="text-[10px] uppercase text-brand-muted px-2 mt-3 mb-1 tracking-wider">Procesos</div>
      ${item('nomina',       'Nómina',             true)}
      ${item('activos',      'Activos fijos',      true)}
      ${item('cierre',       'Cierre periodo',     true)}
      <div class="text-[10px] uppercase text-brand-muted px-2 mt-3 mb-1 tracking-wider">Configuración</div>
      ${item('config-puc',   'Plan PUC',           true)}
      ${item('config-mapeos','Mapeos',             true)}
      ${item('config-imp',   'Impuestos',          true)}
      ${item('config-num',   'Numeración',         true)}
      ${item('config-per',   'Periodos',           true)}
      ${item('config-cc',    'Centros costo',      true)}
      ${item('config-perfil','Perfil tributario',  true)}
      <div class="text-[10px] uppercase text-brand-muted px-2 mt-3 mb-1 tracking-wider">Calidad</div>
      ${item('tests',        'Pruebas',            true)}
    </div>`;
}

function renderContabSection() {
  const sec = window.contabSection || 'dashboard';
  switch (sec) {
    case 'dashboard':     return renderDashboardContable();
    case 'libro-diario':  return renderLibroDiario();
    case 'libro-mayor':   return renderLibroMayor();
    case 'auxiliar':      return renderAuxiliarCuenta();
    case 'manuales':      return renderManuales();
    case 'facturacion':   {
      const facs = (window.state.invoices||[]).filter(i => i.type==='factura' || i.docType==='factura');
      const rems = (window.state.invoices||[]).filter(i => i.type==='remisión' || i.docType==='remisión');
      return (typeof renderContabilidadFacturacion==='function')
        ? renderContabilidadFacturacion(facs, rems)
        : '<div class="panel p-6">Vista de facturación no disponible.</div>';
    }
    case 'config-puc':    return renderConfigPUC();
    case 'config-mapeos': return renderConfigMapeos();
    case 'config-imp':    return renderConfigImpuestos();
    case 'config-num':    return renderConfigNumeracion();
    case 'config-cc':     return renderConfigCC();
    case 'config-perfil': return renderConfigPerfil();
    case 'aux-iva':       return renderAuxIVA();
    case 'aux-ret':       return renderAuxRetenciones();
    case 'balance-prueba': return renderBalancePrueba();
    case 'balance-gen':   return renderBalanceGeneral();
    case 'pyg':           return renderPyG();
    case 'cartera':       return renderCartera();
    case 'cxp':           return renderCxP();
    case 'exporta':       return renderExportHub();
    case 'nomina':        return renderNomina();
    case 'activos':       return renderActivosFijos();
    case 'tests':         return renderTestsDashboard();
    case 'cierre':
    case 'config-per':    return renderConfigPeriodos();
    default:              return `<div class="panel p-6"><p class="text-amber-300">Sección "${_escape(sec)}" pendiente para fases siguientes.</p></div>`;
  }
}

/* ============================================================ DASHBOARD */
function renderDashboardContable() {
  const st = _S();
  const yymm = _yyyymm(_todayStr());
  let ingresos=0, egresos=0;
  _iterAccountLines(st, {}, (l, je) => {
    if (_yyyymm(je.date) !== yymm) return;
    const code = l.accountCode || '';
    if (/^4/.test(code)) ingresos += (+l.credit||0) - (+l.debit||0);
    else if (/^[567]/.test(code)) egresos += (+l.debit||0) - (+l.credit||0);
  });
  // Cartera = saldo 1305* (suma de auxiliares)
  let cartera = 0, cxp = 0, ivaGen = _saldoOf('240805'), ivaDes = _saldoOf('240810');
  (st.pucAccounts||[]).forEach(a => {
    if (a.type !== 'auxiliar') return;
    if (/^1305/.test(a.code)) cartera += _saldoOf(a.code);
    if (/^(2205|2335)/.test(a.code)) cxp += _saldoOf(a.code);
  });
  const ivaNeto = ivaGen - ivaDes;
  const utilidad = ingresos - egresos;

  const kc = (typeof kpiCard==='function') ? kpiCard : (t,v,s)=>`<div class="panel p-4"><div class="text-xs text-brand-muted">${t}</div><div class="text-xl font-bold text-brand-gold">${v}</div><div class="text-[10px] text-brand-muted">${s||''}</div></div>`;

  return `
    <div class="mb-4">
      <h2 class="font-bold gold-title text-lg">Dashboard contable</h2>
      <p class="text-xs text-brand-muted">Periodo ${yymm} · ${(st.journalEntries||[]).length} asientos · ${(st.journalLines||[]).length} líneas</p>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      ${kc('Ingresos del mes', _fmtCOP(ingresos), 'Suma cuentas 4*', 'cart', '#10b981')}
      ${kc('Egresos del mes',  _fmtCOP(egresos),  'Suma 5/6/7*',   'cart', '#ef4444')}
      ${kc('Utilidad mes',     _fmtCOP(utilidad), 'Ingresos − Egresos', 'doc', utilidad>=0?'#10b981':'#ef4444')}
      ${kc('Cartera',          _fmtCOP(cartera),  'Saldo 1305*',   'shield', '#C9A961')}
      ${kc('CxP',              _fmtCOP(cxp),      'Saldo 2205+2335','shield','#f59e0b')}
      ${kc('IVA generado',     _fmtCOP(ivaGen),   '240805',        'doc',   '#C9A961')}
      ${kc('IVA descontable',  _fmtCOP(ivaDes),   '240810',        'doc',   '#C9A961')}
      ${kc('IVA neto',         _fmtCOP(ivaNeto),  'Generado − Descontable','doc', ivaNeto>=0?'#f59e0b':'#10b981')}
    </div>
    <div class="panel p-6">
      <p class="text-brand-muted text-sm">Gráficos y alertas se incorporarán en fases siguientes.</p>
    </div>
  `;
}

/* =========================================================== LIBRO DIARIO */
function _filtersDiario() {
  if (!window._diarioFilters) {
    const today = _todayStr();
    const yy = today.slice(0,7);
    window._diarioFilters = { from: yy + '-01', to: today, search:'', source:'', status:'' };
  }
  return window._diarioFilters;
}
window.setDiarioFilter = function(k, v) {
  const f = _filtersDiario();
  f[k] = v;
  if (typeof renderPage === 'function') renderPage();
};

function renderLibroDiario() {
  const st = _S();
  const f = _filtersDiario();
  const entries = (st.journalEntries||[]).filter(j => {
    if (f.from && j.date < f.from) return false;
    if (f.to && j.date > f.to) return false;
    if (f.source && j.source !== f.source) return false;
    if (f.status && j.status !== f.status) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!`${j.id} ${j.sourceId} ${j.description}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sources = ['', ...new Set((st.journalEntries||[]).map(j => j.source))];

  return `
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-bold gold-title text-lg">Libro Diario</h2>
      <button onclick="window.onRefreshFromSupabase && window.onRefreshFromSupabase()"
              class="btn-outline text-xs"
              title="Trae JEs nuevos o actualizados desde Supabase y los mergea en el state local">
        🔄 Sincronizar desde Supabase
      </button>
    </div>
    <div class="panel p-3 mb-3 grid grid-cols-1 md:grid-cols-5 gap-2">
      <div><label class="label">Desde</label><input type="date" class="input-field" value="${f.from}" onchange="setDiarioFilter('from',this.value)"></div>
      <div><label class="label">Hasta</label><input type="date" class="input-field" value="${f.to}" onchange="setDiarioFilter('to',this.value)"></div>
      <div><label class="label">Buscar</label><input class="input-field" value="${_escape(f.search)}" oninput="setDiarioFilter('search',this.value)" placeholder="ID, descripción, ref."></div>
      <div><label class="label">Origen</label>
        <select class="input-field" onchange="setDiarioFilter('source',this.value)">
          ${sources.map(s=>`<option value="${s}" ${f.source===s?'selected':''}>${s||'(todos)'}</option>`).join('')}
        </select>
      </div>
      <div><label class="label">Estado</label>
        <select class="input-field" onchange="setDiarioFilter('status',this.value)">
          <option value="" ${!f.status?'selected':''}>(todos)</option>
          <option value="posted" ${f.status==='posted'?'selected':''}>Contabilizado</option>
          <option value="reversed" ${f.status==='reversed'?'selected':''}>Reversado</option>
        </select>
      </div>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted">
        <tr>
          <th class="px-3 py-2 text-left">JE</th>
          <th class="px-3 py-2 text-left">Fecha</th>
          <th class="px-3 py-2 text-left">Origen</th>
          <th class="px-3 py-2 text-left">Ref.</th>
          <th class="px-3 py-2 text-left">Descripción</th>
          <th class="px-3 py-2 text-right">Debe</th>
          <th class="px-3 py-2 text-right">Haber</th>
          <th class="px-3 py-2 text-center">Estado</th>
          <th class="px-3 py-2 text-right">Acción</th>
        </tr>
      </thead>
      <tbody>
        ${entries.length===0 ? `<tr><td colspan="9" class="px-3 py-6 text-center text-brand-muted">Sin asientos en el rango.</td></tr>` :
          entries.map(j => `<tr class="table-row" ondblclick="openJournalEntryModal('${j.id}')">
            <td class="px-3 py-2 font-mono text-brand-gold text-xs">${j.id}</td>
            <td class="px-3 py-2 text-xs text-brand-muted">${_fmtDate(j.date)}</td>
            <td class="px-3 py-2 text-xs">${_escape(j.source)}</td>
            <td class="px-3 py-2 text-xs">${_escape(j.sourceId||'')}</td>
            <td class="px-3 py-2 text-white">${_escape(j.description||'')}</td>
            <td class="px-3 py-2 text-right text-emerald-400">${_fmtCOP(j.totalDebit)}</td>
            <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(j.totalCredit)}</td>
            <td class="px-3 py-2 text-center"><span class="badge-${j.status==='posted'?'ok':j.status==='reversed'?'warn':'danger'} text-[10px] px-2 py-0.5 rounded">${j.status}</span></td>
            <td class="px-3 py-2 text-right">
              <button onclick="openJournalEntryModal('${j.id}')" class="text-xs text-brand-gold hover:underline">Ver</button>
              ${j.status==='posted' ? `<button onclick="onReverseJE('${j.id}')" class="text-xs text-red-400 hover:underline ml-2">Reversar</button>` : ''}
            </td>
          </tr>`).join('')
        }
      </tbody>
    </table></div>
  `;
}

window.onReverseJE = function(jeId) {
  const reason = prompt('Motivo del reverso:'); if (reason==null) return;
  const r = reverseJournalEntry(jeId, reason);
  if (r.error) { _toast('Error: '+r.error,'error'); return; }
  _save();
  if (typeof renderPage === 'function') renderPage();
  _toast('Asiento reversado · '+r.journalId, 'ok');
};

window.openJournalEntryModal = function(jeId) {
  const st = _S();
  const je = (st.journalEntries||[]).find(j => j.id === jeId); if (!je) return;
  const lines = (st.journalLines||[]).filter(l => l.journalId === jeId);
  const html = `<div class="panel rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto" style="background:#152943">
    <div class="flex justify-between mb-4">
      <h2 class="text-lg font-bold gold-title">Asiento ${je.id}</h2>
      <button type="button" onclick="closeModal('modal-je')" class="text-brand-muted text-2xl">×</button>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
      <div><div class="text-brand-muted">Fecha</div><div class="text-white">${_fmtDate(je.date)}</div></div>
      <div><div class="text-brand-muted">Periodo</div><div class="text-white">${je.periodId||'—'}</div></div>
      <div><div class="text-brand-muted">Origen</div><div class="text-white">${_escape(je.source)} · ${_escape(je.sourceId||'')}</div></div>
      <div><div class="text-brand-muted">Estado</div><div class="text-white">${je.status}${je.reverses?` (reversa ${je.reverses})`:''}${je.reversedBy?` (reversado por ${je.reversedBy})`:''}</div></div>
      <div class="col-span-2 md:col-span-4"><div class="text-brand-muted">Descripción</div><div class="text-white">${_escape(je.description||'')}</div></div>
    </div>
    <div class="overflow-x-auto"><table class="w-full text-xs">
      <thead class="text-brand-muted">
        <tr><th class="px-2 py-2 text-left">#</th><th class="px-2 py-2 text-left">Cuenta</th><th class="px-2 py-2 text-left">Tercero</th><th class="px-2 py-2 text-left">CC</th><th class="px-2 py-2 text-right">Debe</th><th class="px-2 py-2 text-right">Haber</th><th class="px-2 py-2 text-left">Detalle</th></tr>
      </thead>
      <tbody>${lines.map(l=>{
        const a = _findAccount(l.accountCode);
        return `<tr class="border-t border-brand-border">
          <td class="px-2 py-2">${l.lineNumber}</td>
          <td class="px-2 py-2 font-mono">${l.accountCode} <span class="text-brand-muted text-[10px]">${a?_escape(a.name):''}</span></td>
          <td class="px-2 py-2">${l.thirdParty?_escape(l.thirdParty.name||''):'—'}</td>
          <td class="px-2 py-2">${l.costCenter?_escape(l.costCenter):'—'}</td>
          <td class="px-2 py-2 text-right text-emerald-400">${l.debit>0?_fmtCOP(l.debit):'—'}</td>
          <td class="px-2 py-2 text-right text-red-400">${l.credit>0?_fmtCOP(l.credit):'—'}</td>
          <td class="px-2 py-2 text-brand-muted">${_escape(l.description||'')}</td>
        </tr>`;
      }).join('')}
        <tr class="border-t-2 border-brand-gold font-semibold">
          <td colspan="4" class="px-2 py-2 text-right">Totales</td>
          <td class="px-2 py-2 text-right text-emerald-400">${_fmtCOP(je.totalDebit)}</td>
          <td class="px-2 py-2 text-right text-red-400">${_fmtCOP(je.totalCredit)}</td>
          <td></td>
        </tr>
      </tbody>
    </table></div>
    <div class="mt-4 flex justify-end gap-2">
      ${je.status==='posted' ? `<button onclick="onReverseJE('${je.id}'); closeModal('modal-je')" class="btn-outline text-red-400">Reversar</button>` : ''}
      <button onclick="closeModal('modal-je')" class="btn-gold">Cerrar</button>
    </div>
  </div>`;
  if (typeof showModal === 'function') showModal('modal-je', html);
};

/* ============================================================== LIBRO MAYOR */
function renderLibroMayor() {
  const st = _S();
  const groups = {};
  _iterAccountLines(st, {}, (l) => {
    const acc = _findAccount(l.accountCode); if (!acc) return;
    const g = groups[l.accountCode] || (groups[l.accountCode] = { acc, debit:0, credit:0, lines:0 });
    g.debit += +l.debit||0;
    g.credit += +l.credit||0;
    g.lines++;
  });
  const codes = Object.keys(groups).sort();
  return `
    <div class="mb-3"><h2 class="font-bold gold-title text-lg">Libro Mayor</h2><p class="text-xs text-brand-muted">Saldos acumulados por cuenta (todos los asientos contabilizados).</p></div>
    <div class="panel overflow-hidden"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted"><tr>
        <th class="px-3 py-2 text-left">Cuenta</th>
        <th class="px-3 py-2 text-left">Nombre</th>
        <th class="px-3 py-2 text-center">Naturaleza</th>
        <th class="px-3 py-2 text-right">Movimientos</th>
        <th class="px-3 py-2 text-right">Debe</th>
        <th class="px-3 py-2 text-right">Haber</th>
        <th class="px-3 py-2 text-right">Saldo</th>
      </tr></thead>
      <tbody>
        ${codes.length===0?`<tr><td colspan="7" class="px-3 py-6 text-center text-brand-muted">Sin movimientos.</td></tr>`:
          codes.map(c=>{
            const g = groups[c];
            const saldo = g.acc.nature==='debito' ? (g.debit-g.credit) : (g.credit-g.debit);
            return `<tr class="table-row">
              <td class="px-3 py-2 font-mono text-brand-gold">${c}</td>
              <td class="px-3 py-2 text-white">${_escape(g.acc.name)}</td>
              <td class="px-3 py-2 text-center text-xs">${g.acc.nature}</td>
              <td class="px-3 py-2 text-right text-xs text-brand-muted">${g.lines}</td>
              <td class="px-3 py-2 text-right text-emerald-400">${_fmtCOP(g.debit)}</td>
              <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(g.credit)}</td>
              <td class="px-3 py-2 text-right font-semibold ${saldo>=0?'text-brand-gold':'text-red-400'}">${_fmtCOP(saldo)}</td>
            </tr>`;
          }).join('')
        }
      </tbody>
    </table></div>
  `;
}

/* ========================================================== AUXILIAR CUENTA */
function _filtersAuxiliar() {
  if (!window._auxFilters) {
    const today = _todayStr();
    window._auxFilters = { code:'', from: today.slice(0,7)+'-01', to: today };
  }
  return window._auxFilters;
}
window.setAuxFilter = function(k,v) {
  _filtersAuxiliar()[k] = v;
  if (typeof renderPage==='function') renderPage();
};

function renderAuxiliarCuenta() {
  const st = _S();
  const f = _filtersAuxiliar();
  const accounts = (st.pucAccounts||[]).filter(a => a.type==='auxiliar').sort((a,b)=>a.code.localeCompare(b.code));
  let rows = [];
  let saldo = 0;
  if (f.code) {
    const acc = _findAccount(f.code);
    const ls = (st.journalLines||[]).filter(l => l.accountCode === f.code).map(l => {
      const je = (st.journalEntries||[]).find(j => j.id === l.journalId);
      return { line:l, je };
    }).filter(x => x.je && x.je.status==='posted' && (!f.from || x.je.date >= f.from) && (!f.to || x.je.date <= f.to))
      .sort((a,b) => a.je.date.localeCompare(b.je.date) || a.line.lineNumber - b.line.lineNumber);
    if (acc) {
      ls.forEach(({line,je}) => {
        const d = +line.debit||0, c = +line.credit||0;
        saldo += (acc.nature==='debito') ? (d-c) : (c-d);
        rows.push({ je, line, d, c, saldo });
      });
    }
  }
  return `
    <div class="mb-3"><h2 class="font-bold gold-title text-lg">Auxiliar por cuenta</h2></div>
    <div class="panel p-3 mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
      <div><label class="label">Cuenta</label>
        <select class="input-field" onchange="setAuxFilter('code',this.value)">
          <option value="">— seleccionar —</option>
          ${accounts.map(a=>`<option value="${a.code}" ${f.code===a.code?'selected':''}>${a.code} · ${_escape(a.name)}</option>`).join('')}
        </select>
      </div>
      <div><label class="label">Desde</label><input type="date" class="input-field" value="${f.from}" onchange="setAuxFilter('from',this.value)"></div>
      <div><label class="label">Hasta</label><input type="date" class="input-field" value="${f.to}" onchange="setAuxFilter('to',this.value)"></div>
    </div>
    ${f.code ? `
      <div class="panel overflow-hidden"><table class="w-full text-xs">
        <thead class="text-brand-muted uppercase"><tr>
          <th class="px-2 py-2 text-left">Fecha</th>
          <th class="px-2 py-2 text-left">JE</th>
          <th class="px-2 py-2 text-left">Origen</th>
          <th class="px-2 py-2 text-left">Tercero</th>
          <th class="px-2 py-2 text-right">Debe</th>
          <th class="px-2 py-2 text-right">Haber</th>
          <th class="px-2 py-2 text-right">Saldo</th>
        </tr></thead>
        <tbody>
          ${rows.length===0?`<tr><td colspan="7" class="px-2 py-6 text-center text-brand-muted">Sin movimientos.</td></tr>`:
            rows.map(r=>`<tr class="table-row">
              <td class="px-2 py-2 text-brand-muted">${_fmtDate(r.je.date)}</td>
              <td class="px-2 py-2 font-mono text-brand-gold">${r.je.id}</td>
              <td class="px-2 py-2">${_escape(r.je.source)}/${_escape(r.je.sourceId||'')}</td>
              <td class="px-2 py-2">${r.line.thirdParty?_escape(r.line.thirdParty.name):'—'}</td>
              <td class="px-2 py-2 text-right text-emerald-400">${r.d>0?_fmtCOP(r.d):'—'}</td>
              <td class="px-2 py-2 text-right text-red-400">${r.c>0?_fmtCOP(r.c):'—'}</td>
              <td class="px-2 py-2 text-right font-semibold ${r.saldo>=0?'text-brand-gold':'text-red-400'}">${_fmtCOP(r.saldo)}</td>
            </tr>`).join('')
          }
        </tbody>
      </table></div>` : `<div class="panel p-6 text-brand-muted text-sm">Selecciona una cuenta para ver el auxiliar.</div>`
    }
  `;
}

/* =========================================================== ASIENTOS MANUALES */
function renderManuales() {
  const st = _S();
  const list = (st.journalEntries||[]).filter(j => j.source === 'manual');
  return `
    <div class="flex justify-between items-center mb-3">
      <h2 class="font-bold gold-title text-lg">Asientos manuales</h2>
      <button onclick="openManualJournalForm()" class="btn-gold">+ Nuevo asiento manual</button>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted"><tr>
        <th class="px-3 py-2 text-left">JE</th>
        <th class="px-3 py-2 text-left">Fecha</th>
        <th class="px-3 py-2 text-left">Ref.</th>
        <th class="px-3 py-2 text-left">Descripción</th>
        <th class="px-3 py-2 text-right">Debe</th>
        <th class="px-3 py-2 text-right">Haber</th>
        <th class="px-3 py-2 text-center">Estado</th>
        <th></th>
      </tr></thead>
      <tbody>
        ${list.length===0?`<tr><td colspan="8" class="px-3 py-6 text-center text-brand-muted">Sin asientos manuales aún.</td></tr>`:
          list.map(j=>`<tr class="table-row" ondblclick="openJournalEntryModal('${j.id}')">
            <td class="px-3 py-2 font-mono text-brand-gold">${j.id}</td>
            <td class="px-3 py-2 text-xs text-brand-muted">${_fmtDate(j.date)}</td>
            <td class="px-3 py-2 text-xs">${_escape(j.sourceId)}</td>
            <td class="px-3 py-2 text-white">${_escape(j.description||'')}</td>
            <td class="px-3 py-2 text-right text-emerald-400">${_fmtCOP(j.totalDebit)}</td>
            <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(j.totalCredit)}</td>
            <td class="px-3 py-2 text-center"><span class="badge-${j.status==='posted'?'ok':'warn'} text-[10px] px-2 py-0.5 rounded">${j.status}</span></td>
            <td class="px-3 py-2 text-right"><button onclick="openJournalEntryModal('${j.id}')" class="text-xs text-brand-gold hover:underline">Ver</button></td>
          </tr>`).join('')
        }
      </tbody>
    </table></div>
  `;
}

window.openManualJournalForm = function() {
  const st = _S();
  if (!window._manualJE) {
    window._manualJE = {
      date: _todayStr(),
      description: '',
      costCenter: '',
      lines: [
        { accountCode:'', debit:0, credit:0, description:'' },
        { accountCode:'', debit:0, credit:0, description:'' }
      ]
    };
  }
  _renderManualModal();
};

function _renderManualModal() {
  const st = _S();
  const m = window._manualJE;
  const accounts = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && a.active).sort((a,b)=>a.code.localeCompare(b.code));
  const ccs = st.costCenters || [];
  const totalD = m.lines.reduce((a,l)=>a+(+l.debit||0),0);
  const totalC = m.lines.reduce((a,l)=>a+(+l.credit||0),0);
  const balanced = _eqMoney(totalD, totalC) && totalD > 0;
  const html = `<div class="panel rounded-xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto" style="background:#152943">
    <div class="flex justify-between mb-4">
      <h2 class="text-lg font-bold gold-title">Nuevo asiento manual</h2>
      <button type="button" onclick="cancelManualJournal()" class="text-brand-muted text-2xl">×</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
      <div><label class="label">Fecha</label><input id="mje-date" type="date" class="input-field" value="${m.date}"></div>
      <div><label class="label">Centro de costo</label>
        <select id="mje-cc" class="input-field">
          <option value="">—</option>
          ${ccs.map(c=>`<option value="${c.id}" ${m.costCenter===c.id?'selected':''}>${_escape(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="md:col-span-1"><label class="label">Descripción</label><input id="mje-desc" class="input-field" value="${_escape(m.description)}" placeholder="Concepto del asiento"></div>
    </div>
    <div class="overflow-x-auto"><table class="w-full text-xs">
      <thead class="text-brand-muted uppercase">
        <tr>
          <th class="px-2 py-2 text-left">#</th>
          <th class="px-2 py-2 text-left">Cuenta</th>
          <th class="px-2 py-2 text-right">Debe</th>
          <th class="px-2 py-2 text-right">Haber</th>
          <th class="px-2 py-2 text-left">Detalle</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${m.lines.map((l,idx)=>`<tr>
          <td class="px-2 py-1">${idx+1}</td>
          <td class="px-2 py-1">
            <select onchange="updateManualLine(${idx},'accountCode',this.value)" class="input-field text-xs">
              <option value="">— cuenta —</option>
              ${accounts.map(a=>`<option value="${a.code}" ${l.accountCode===a.code?'selected':''}>${a.code} · ${_escape(a.name)}</option>`).join('')}
            </select>
          </td>
          <td class="px-2 py-1 text-right"><input type="number" min="0" step="0.01" value="${l.debit||0}" oninput="updateManualLine(${idx},'debit',this.value)" class="input-field text-right text-xs"></td>
          <td class="px-2 py-1 text-right"><input type="number" min="0" step="0.01" value="${l.credit||0}" oninput="updateManualLine(${idx},'credit',this.value)" class="input-field text-right text-xs"></td>
          <td class="px-2 py-1"><input value="${_escape(l.description||'')}" oninput="updateManualLine(${idx},'description',this.value)" class="input-field text-xs"></td>
          <td class="px-2 py-1"><button onclick="removeManualLine(${idx})" class="text-red-400 text-xs" ${m.lines.length<=2?'disabled':''}>−</button></td>
        </tr>`).join('')}
      </tbody>
      <tfoot class="font-semibold border-t-2 border-brand-gold">
        <tr>
          <td colspan="2" class="px-2 py-2 text-right">Totales</td>
          <td class="px-2 py-2 text-right text-emerald-400">${_fmtCOP(totalD)}</td>
          <td class="px-2 py-2 text-right text-red-400">${_fmtCOP(totalC)}</td>
          <td colspan="2" class="px-2 py-2">
            <span class="badge-${balanced?'ok':'danger'} text-[11px] px-2 py-1 rounded">${balanced?'BALANCEADO':'DESBALANCEADO ('+_fmtCOP(totalD-totalC)+')'}</span>
          </td>
        </tr>
      </tfoot>
    </table></div>
    <div class="mt-3 flex justify-between">
      <button onclick="addManualLine()" class="btn-outline text-xs">+ Línea</button>
      <div class="flex gap-2">
        <button onclick="cancelManualJournal()" class="btn-outline">Cancelar</button>
        <button onclick="postManualJournal()" class="btn-gold" ${(!balanced||m.lines.length<2)?'disabled':''}>Contabilizar</button>
      </div>
    </div>
  </div>`;
  if (typeof showModal === 'function') showModal('modal-manual-je', html);
}

window.updateManualLine = function(idx, field, value) {
  const m = window._manualJE; if (!m || !m.lines[idx]) return;
  // sincronizar inputs sueltos del header
  const dEl = document.getElementById('mje-date');     if (dEl) m.date = dEl.value;
  const ccEl = document.getElementById('mje-cc');      if (ccEl) m.costCenter = ccEl.value;
  const descEl = document.getElementById('mje-desc');  if (descEl) m.description = descEl.value;
  if (field === 'debit' || field === 'credit') {
    const v = +value || 0;
    m.lines[idx][field] = v;
    if (v > 0 && field === 'debit') m.lines[idx].credit = 0;
    if (v > 0 && field === 'credit') m.lines[idx].debit = 0;
  } else {
    m.lines[idx][field] = value;
  }
  _renderManualModal();
};
window.addManualLine = function() {
  const m = window._manualJE; if (!m) return;
  const dEl = document.getElementById('mje-date');     if (dEl) m.date = dEl.value;
  const ccEl = document.getElementById('mje-cc');      if (ccEl) m.costCenter = ccEl.value;
  const descEl = document.getElementById('mje-desc');  if (descEl) m.description = descEl.value;
  m.lines.push({ accountCode:'', debit:0, credit:0, description:'' });
  _renderManualModal();
};
window.removeManualLine = function(idx) {
  const m = window._manualJE; if (!m) return;
  if (m.lines.length <= 2) return;
  m.lines.splice(idx,1);
  _renderManualModal();
};
window.cancelManualJournal = function() {
  window._manualJE = null;
  if (typeof closeModal==='function') closeModal('modal-manual-je');
};
window.postManualJournal = function() {
  const m = window._manualJE; if (!m) return;
  const dEl = document.getElementById('mje-date');     if (dEl) m.date = dEl.value;
  const ccEl = document.getElementById('mje-cc');      if (ccEl) m.costCenter = ccEl.value;
  const descEl = document.getElementById('mje-desc');  if (descEl) m.description = descEl.value;
  const cleanLines = m.lines.filter(l => l.accountCode && ((+l.debit>0)||(+l.credit>0)));
  const r = postManualEntry({
    date: m.date,
    description: m.description || 'Asiento manual',
    costCenter: m.costCenter || null,
    lines: cleanLines.map(l => ({
      accountCode:l.accountCode,
      debit:+l.debit||0,
      credit:+l.credit||0,
      description:l.description||''
    }))
  });
  if (r.error) { _toast('Error: '+(r.message||r.error),'error'); return; }
  _save();
  window._manualJE = null;
  if (typeof closeModal==='function') closeModal('modal-manual-je');
  if (typeof renderPage==='function') renderPage();
  _toast('Asiento ' + r.journalId + ' contabilizado','ok');
};

/* =============================================================== CONFIG PUC */
function _accountHasMovement(code, target) {
  const st = _S(target);
  return (st.journalLines||[]).some(l => l.accountCode === code);
}

function renderConfigPUC() {
  const st = _S();
  const all = st.pucAccounts || [];
  const byParent = {};
  all.forEach(a => {
    const p = a.parentCode || '_root';
    (byParent[p] = byParent[p] || []).push(a);
  });
  Object.keys(byParent).forEach(k => byParent[k].sort((a,b)=>a.code.localeCompare(b.code)));

  function nodeHtml(a) {
    const children = byParent[a.code] || [];
    const isTitle = a.type === 'titulo';
    const indent = (a.level || 1);
    const padding = `padding-left: ${(indent-1)*16}px`;
    const tag = isTitle ? '<span class="text-[10px] text-brand-muted">[título]</span>'
                        : '<span class="text-[10px] text-brand-gold">[auxiliar]</span>';
    const checked = a.active ? 'checked' : '';
    const isSystem = !!a.system;
    const canAddAux = (a.level === 6); // se permite agregar nivel 8 bajo nivel 6
    const editBtn = isSystem ? '' :
      `<button onclick="openEditPucAccount('${a.code}')" class="text-xs text-brand-gold hover:underline mr-2" title="Editar nombre/banderas">✎</button>`;
    const newAuxBtn = canAddAux ?
      `<button onclick="openNewPucAuxiliar('${a.code}')" class="text-xs text-emerald-300 hover:underline" title="Crear auxiliar nivel 8">+ aux</button>` : '';
    const head = `<tr class="border-b border-brand-border ${isTitle?'bg-brand-panel-2':''}">
      <td class="px-2 py-1 font-mono text-${isTitle?'brand-gold':'white'}" style="${padding}">${a.code}${isSystem?'<span class="text-[9px] text-brand-muted ml-1">[sys]</span>':''}</td>
      <td class="px-2 py-1">${_escape(a.name)} ${tag}</td>
      <td class="px-2 py-1 text-center text-xs">${a.classCode}</td>
      <td class="px-2 py-1 text-center text-xs">${a.nature}</td>
      <td class="px-2 py-1 text-center text-xs">${a.requiresThirdParty?'Sí':'—'}</td>
      <td class="px-2 py-1 text-center"><label class="inline-flex items-center gap-1 text-xs"><input type="checkbox" ${checked} onchange="togglePucActive('${a.code}')"> ${a.active?'Activa':'Inactiva'}</label></td>
      <td class="px-2 py-1 text-right whitespace-nowrap">${editBtn}${newAuxBtn}</td>
    </tr>`;
    return head + children.map(nodeHtml).join('');
  }

  const roots = (byParent['_root'] || []).sort((a,b)=>a.code.localeCompare(b.code));
  const totalAccounts = all.length;
  const auxiliares = all.filter(a => a.type==='auxiliar').length;

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Plan Único de Cuentas (PUC)</h2>
        <p class="text-xs text-brand-muted">${totalAccounts} cuentas · ${auxiliares} auxiliares · ${all.filter(a=>!a.system).length} personalizadas. Cuentas [sys] solo se activan/desactivan; las personalizadas son editables.</p>
      </div>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-xs">
      <thead class="text-brand-muted uppercase">
        <tr>
          <th class="px-2 py-2 text-left">Código</th>
          <th class="px-2 py-2 text-left">Nombre</th>
          <th class="px-2 py-2 text-center">Clase</th>
          <th class="px-2 py-2 text-center">Naturaleza</th>
          <th class="px-2 py-2 text-center">Tercero</th>
          <th class="px-2 py-2 text-center">Estado</th>
          <th class="px-2 py-2 text-right">Acción</th>
        </tr>
      </thead>
      <tbody>
        ${roots.map(nodeHtml).join('')}
      </tbody>
    </table></div>
  `;
}
window.togglePucActive = function(code) {
  const st = _S();
  const a = (st.pucAccounts||[]).find(x => x.code === code); if (!a) return;
  // Si se intenta desactivar y tiene movimientos → bloquear
  if (a.active && _accountHasMovement(code, st)) {
    _toast('No se puede desactivar: la cuenta tiene movimientos.', 'warn');
    if (typeof renderPage==='function') renderPage();
    return;
  }
  a.active = !a.active;
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast(`Cuenta ${code} ${a.active?'activada':'desactivada'}`, 'ok');
};

window.openEditPucAccount = function(code) {
  const st = _S();
  const a = (st.pucAccounts||[]).find(x => x.code === code); if (!a) return;
  if (a.system) { _toast('Las cuentas del sistema no se editan, solo se activan/desactivan.', 'warn'); return; }
  const html = `<div class="panel rounded-xl shadow-2xl w-full max-w-md p-6" style="background:#152943">
    <div class="flex justify-between mb-4">
      <h2 class="text-lg font-bold gold-title">Editar cuenta ${a.code}</h2>
      <button onclick="closeModal('modal-pucedit')" class="text-brand-muted text-2xl">×</button>
    </div>
    <div class="space-y-3">
      <div><label class="label">Nombre</label><input id="pe-name" class="input-field" value="${_escape(a.name)}"></div>
      <div class="grid grid-cols-2 gap-2">
        <label class="text-xs flex items-center gap-2"><input id="pe-tp" type="checkbox" ${a.requiresThirdParty?'checked':''}> Requiere tercero</label>
        <label class="text-xs flex items-center gap-2"><input id="pe-cc" type="checkbox" ${a.requiresCostCenter?'checked':''}> Requiere CC</label>
      </div>
      <div><label class="label">Tax related (opcional)</label>
        <select id="pe-tax" class="input-field">
          <option value="">—</option>
          ${['iva_generated','iva_descontable','rete_fte_received','rete_fte_practiced','rete_iva_received','rete_iva_practiced','rete_ica_received','rete_ica_practiced','gmf'].map(t=>`<option value="${t}" ${a.taxRelated===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal('modal-pucedit')" class="btn-outline">Cancelar</button>
      <button onclick="savePucEdit('${code}')" class="btn-gold">Guardar</button>
    </div>
  </div>`;
  if (typeof showModal==='function') showModal('modal-pucedit', html);
};

window.savePucEdit = function(code) {
  const st = _S();
  const a = (st.pucAccounts||[]).find(x => x.code === code); if (!a) return;
  const name = (document.getElementById('pe-name')?.value || '').trim();
  if (!name) { _toast('Nombre vacío', 'error'); return; }
  a.name = name;
  a.requiresThirdParty = !!document.getElementById('pe-tp')?.checked;
  a.requiresCostCenter = !!document.getElementById('pe-cc')?.checked;
  const tx = document.getElementById('pe-tax')?.value || '';
  a.taxRelated = tx || null;
  _save();
  if (typeof closeModal==='function') closeModal('modal-pucedit');
  if (typeof renderPage==='function') renderPage();
  _toast(`Cuenta ${code} actualizada`, 'ok');
};

window.openNewPucAuxiliar = function(parentCode) {
  const st = _S();
  const parent = (st.pucAccounts||[]).find(x => x.code === parentCode);
  if (!parent || parent.level !== 6) { _toast('Solo se pueden crear auxiliares bajo cuentas nivel 6.', 'warn'); return; }
  // Sugerir código siguiente parentCode + '01' iterativo
  let n = 1;
  let suggested;
  while (true) {
    suggested = parentCode + String(n).padStart(2,'0');
    if (!(st.pucAccounts||[]).find(a => a.code === suggested)) break;
    n++;
    if (n > 99) { suggested = parentCode + '99'; break; }
  }
  const html = `<div class="panel rounded-xl shadow-2xl w-full max-w-md p-6" style="background:#152943">
    <div class="flex justify-between mb-4">
      <h2 class="text-lg font-bold gold-title">Nueva auxiliar bajo ${parentCode}</h2>
      <button onclick="closeModal('modal-pucnew')" class="text-brand-muted text-2xl">×</button>
    </div>
    <div class="space-y-3">
      <div><label class="label">Código (8 dígitos sugerido)</label><input id="pn-code" class="input-field font-mono" value="${suggested}"></div>
      <div><label class="label">Nombre *</label><input id="pn-name" class="input-field" placeholder="Nombre de la auxiliar"></div>
      <div class="text-xs text-brand-muted">Naturaleza heredada: <span class="text-brand-gold">${parent.nature}</span> · Clase ${parent.classCode}</div>
      <div class="grid grid-cols-2 gap-2">
        <label class="text-xs flex items-center gap-2"><input id="pn-tp" type="checkbox"> Requiere tercero</label>
        <label class="text-xs flex items-center gap-2"><input id="pn-cc" type="checkbox"> Requiere CC</label>
      </div>
      <div><label class="label">Tax related (opcional)</label>
        <select id="pn-tax" class="input-field">
          <option value="">—</option>
          ${['iva_generated','iva_descontable','rete_fte_received','rete_fte_practiced','rete_iva_received','rete_iva_practiced','rete_ica_received','rete_ica_practiced','gmf'].map(t=>`<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal('modal-pucnew')" class="btn-outline">Cancelar</button>
      <button onclick="savePucNewAux('${parentCode}')" class="btn-gold">Crear</button>
    </div>
  </div>`;
  if (typeof showModal==='function') showModal('modal-pucnew', html);
};

window.savePucNewAux = function(parentCode) {
  const st = _S();
  const parent = (st.pucAccounts||[]).find(x => x.code === parentCode); if (!parent) return;
  const code = (document.getElementById('pn-code')?.value || '').trim();
  const name = (document.getElementById('pn-name')?.value || '').trim();
  if (!code || !name) { _toast('Código y nombre requeridos', 'error'); return; }
  if (!code.startsWith(parentCode)) { _toast('El código debe iniciar con '+parentCode, 'error'); return; }
  if ((st.pucAccounts||[]).find(a => a.code === code)) { _toast('Código ya existe', 'error'); return; }
  const acc = {
    code, level: 8, parentCode,
    name, classCode: parent.classCode, nature: parent.nature, type:'auxiliar',
    active:true, system:false,
    requiresThirdParty: !!document.getElementById('pn-tp')?.checked,
    requiresCostCenter: !!document.getElementById('pn-cc')?.checked,
    taxRelated: document.getElementById('pn-tax')?.value || null
  };
  st.pucAccounts.push(acc);
  _save();
  if (typeof closeModal==='function') closeModal('modal-pucnew');
  if (typeof renderPage==='function') renderPage();
  _toast(`Auxiliar ${code} creada`, 'ok');
};

/* ============================================================ CONFIG MAPEOS */
// Hint para filtrar dropdown de cuentas por categoría natural del mapping key
function _classFilterFor(key) {
  // categorías comunes → primer dígito de la cuenta sugerido
  if (/revenue|venta/i.test(key))                                  return '4';
  if (/cogs|costo/i.test(key))                                     return '6';
  if (/inventory_raw|raw|wip|finished_goods|inventario/i.test(key)) return '14';
  if (/iva_generated|iva_descontable|rete|payable|salary_payable|impuesto/i.test(key)) return '2';
  if (/receivable|cartera|advance_received|bank|cash/i.test(key)) {
    if (/payable|advance_received|impuesto/i.test(key)) return '2';
    if (/receivable|cartera/i.test(key))                return '13';
    if (/bank|cash/i.test(key))                          return '11';
    return '1';
  }
  if (/expense|gasto/i.test(key))                                  return '5';
  if (/discount|sales_returns/i.test(key))                         return '4';
  if (/depreciation|cif|mod/i.test(key))                            return '5';
  return '';
}

function renderConfigMapeos() {
  const st = _S();
  if (!st.accountingMappings) st.accountingMappings = seedAccountingMappings();
  const m = st.accountingMappings;
  const sections = Object.keys(m);
  const auxAll = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && a.active).sort((a,b)=>a.code.localeCompare(b.code));

  function selectFor(secKey, k, v) {
    const filterPrefix = _classFilterFor(k);
    const candidates = filterPrefix ? auxAll.filter(a => a.code.startsWith(filterPrefix)) : auxAll;
    const lst = candidates.length ? candidates : auxAll;
    return `<select onchange="setMapeo('${secKey}','${k}',this.value)" class="input-field text-xs">
      <option value="">—</option>
      ${lst.map(a=>`<option value="${a.code}" ${v===a.code?'selected':''}>${a.code} · ${_escape(a.name)}</option>`).join('')}
    </select>`;
  }

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Mapeo de cuentas por evento</h2>
        <p class="text-xs text-brand-muted">Define qué cuenta PUC usa cada evento operativo. Cambios se guardan al instante.</p>
      </div>
      <button onclick="resetMapeos()" class="btn-outline text-xs">Restaurar defecto</button>
    </div>
    ${sections.map(sec => `
      <div class="panel mb-3">
        <div class="px-3 py-2 border-b border-brand-border bg-brand-panel-2"><h3 class="text-sm font-semibold text-brand-gold">${_escape(sec)}</h3></div>
        <table class="w-full text-xs">
          <tbody>
            ${Object.entries(m[sec]).map(([k,v])=>{
              const acc = _findAccount(v);
              const ok = acc && acc.type==='auxiliar' && acc.active;
              return `<tr class="border-b border-brand-border">
                <td class="px-3 py-2 text-brand-muted w-1/4">${_escape(k)}</td>
                <td class="px-3 py-2 w-2/4">${selectFor(sec, k, v)}</td>
                <td class="px-3 py-2 ${ok?'text-emerald-300':'text-red-400'} text-[10px]">${ok?'OK · '+_escape(acc.name):(v?'cuenta no postable':'sin asignar')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  `;
}

window.setMapeo = function(sec, key, code) {
  const st = _S();
  if (!st.accountingMappings) st.accountingMappings = seedAccountingMappings();
  const acc = _findAccount(code, st);
  if (code && (!acc || acc.type !== 'auxiliar' || !acc.active)) {
    _toast(`Cuenta ${code} no es auxiliar activa`, 'error');
    return;
  }
  st.accountingMappings[sec] = st.accountingMappings[sec] || {};
  st.accountingMappings[sec][key] = code;
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast(`Mapeo ${sec}.${key} → ${code||'—'}`, 'ok');
};

window.resetMapeos = function() {
  if (typeof confirm==='function' && !confirm('¿Restaurar mapeos a valores por defecto?')) return;
  const st = _S();
  st.accountingMappings = seedAccountingMappings();
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast('Mapeos restaurados', 'ok');
};

/* ========================================================== CONFIG IMPUESTOS */
function renderConfigImpuestos() {
  const st = _S();
  if (!Array.isArray(st.taxRules) || !st.taxRules.length) st.taxRules = seedTaxRules();
  const rules = st.taxRules;

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Reglas de impuestos</h2>
        <p class="text-xs text-brand-muted">${rules.length} reglas · IVA, retenciones de fuente / IVA / ICA.</p>
      </div>
      <button onclick="openTaxRuleForm()" class="btn-gold text-xs">+ Nueva regla</button>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-xs">
      <thead class="text-brand-muted uppercase">
        <tr>
          <th class="px-2 py-2 text-left">ID</th>
          <th class="px-2 py-2 text-left">Tipo</th>
          <th class="px-2 py-2 text-left">Nombre</th>
          <th class="px-2 py-2 text-right">Tasa</th>
          <th class="px-2 py-2 text-left">Cuenta</th>
          <th class="px-2 py-2 text-center">Base UVT</th>
          <th class="px-2 py-2 text-center">Default</th>
          <th class="px-2 py-2 text-right">Acción</th>
        </tr>
      </thead>
      <tbody>
        ${rules.map(r => {
          const accCode = r.account || r.account_generated || r.account_descontable || '';
          return `<tr class="border-b border-brand-border">
            <td class="px-2 py-2 font-mono text-brand-gold">${_escape(r.id)}</td>
            <td class="px-2 py-2 text-xs">${_escape(r.type)}</td>
            <td class="px-2 py-2">${_escape(r.name||'')}</td>
            <td class="px-2 py-2 text-right">${(((+r.rate||0)*100).toFixed(2))}%</td>
            <td class="px-2 py-2 font-mono text-xs">${accCode||'—'}</td>
            <td class="px-2 py-2 text-center text-xs">${r.baseUVT||'—'}</td>
            <td class="px-2 py-2 text-center">${r.isDefault?'★':''}</td>
            <td class="px-2 py-2 text-right">
              <button onclick="openTaxRuleForm('${r.id}')" class="text-xs text-brand-gold hover:underline">✎</button>
              <button onclick="deleteTaxRule('${r.id}')" class="text-xs text-red-400 hover:underline ml-2">🗑</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  `;
}

window.openTaxRuleForm = function(id) {
  const st = _S();
  const existing = id ? (st.taxRules||[]).find(r => r.id === id) : null;
  const r = existing || { id:'', type:'iva', name:'', rate:0, account:'', baseUVT:0, isDefault:false };
  const auxAll = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && a.active).sort((a,b)=>a.code.localeCompare(b.code));
  const html = `<div class="panel rounded-xl shadow-2xl w-full max-w-md p-6" style="background:#152943">
    <div class="flex justify-between mb-4">
      <h2 class="text-lg font-bold gold-title">${existing?'Editar regla '+id:'Nueva regla de impuesto'}</h2>
      <button onclick="closeModal('modal-tax')" class="text-brand-muted text-2xl">×</button>
    </div>
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="label">ID *</label><input id="tx-id" class="input-field font-mono" value="${_escape(r.id)}" ${existing?'readonly':''}></div>
        <div><label class="label">Tipo</label>
          <select id="tx-type" class="input-field">
            ${['iva','rete_fuente','rete_iva','rete_ica'].map(t=>`<option value="${t}" ${r.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div><label class="label">Nombre</label><input id="tx-name" class="input-field" value="${_escape(r.name||'')}"></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="label">Tasa (0..1)</label><input id="tx-rate" type="number" step="0.001" min="0" max="1" class="input-field" value="${r.rate||0}"></div>
        <div><label class="label">Base UVT</label><input id="tx-uvt" type="number" step="1" min="0" class="input-field" value="${r.baseUVT||0}"></div>
      </div>
      <div><label class="label">Cuenta vinculada</label>
        <select id="tx-acc" class="input-field text-xs">
          <option value="">—</option>
          ${auxAll.map(a=>`<option value="${a.code}" ${(r.account===a.code||r.account_generated===a.code||r.account_descontable===a.code)?'selected':''}>${a.code} · ${_escape(a.name)}</option>`).join('')}
        </select>
      </div>
      <label class="text-xs flex items-center gap-2"><input id="tx-def" type="checkbox" ${r.isDefault?'checked':''}> Default para su tipo</label>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal('modal-tax')" class="btn-outline">Cancelar</button>
      <button onclick="saveTaxRule('${id||''}')" class="btn-gold">Guardar</button>
    </div>
  </div>`;
  if (typeof showModal==='function') showModal('modal-tax', html);
};

window.saveTaxRule = function(existingId) {
  const st = _S();
  if (!Array.isArray(st.taxRules)) st.taxRules = seedTaxRules();
  const id = (document.getElementById('tx-id')?.value||'').trim();
  if (!id) { _toast('ID requerido', 'error'); return; }
  const type = document.getElementById('tx-type')?.value || 'iva';
  const name = (document.getElementById('tx-name')?.value || '').trim();
  const rate = +document.getElementById('tx-rate')?.value || 0;
  const baseUVT = +document.getElementById('tx-uvt')?.value || 0;
  const account = document.getElementById('tx-acc')?.value || '';
  const isDefault = !!document.getElementById('tx-def')?.checked;

  if (!existingId && st.taxRules.find(r => r.id === id)) {
    _toast('ID ya existe', 'error'); return;
  }
  const idx = st.taxRules.findIndex(r => r.id === (existingId || id));
  const rule = { id, type, name, rate, baseUVT, isDefault };
  if (type === 'iva') {
    rule.account_generated = account || null;
    rule.account_descontable = account || null;
    if (rate === 0) rule.appliesToRemision = true;
  } else {
    rule.account = account || null;
  }
  if (idx >= 0) st.taxRules[idx] = Object.assign({}, st.taxRules[idx], rule);
  else st.taxRules.push(rule);

  // Si esta es default, desmarcar otras del mismo tipo
  if (isDefault) {
    st.taxRules.forEach(r => { if (r.id !== rule.id && r.type === type) r.isDefault = false; });
  }
  _save();
  if (typeof closeModal==='function') closeModal('modal-tax');
  if (typeof renderPage==='function') renderPage();
  _toast(`Regla ${id} guardada`, 'ok');
};

window.deleteTaxRule = function(id) {
  const st = _S();
  if (!Array.isArray(st.taxRules)) return;
  // Validar que no esté usada en asientos (rastreado por taxBreakdown? simplemente avisar)
  const used = (st.invoices||[]).some(i => i.taxBreakdown && i.taxBreakdown.ivaRuleId === id) ||
               (st.supplyReceipts||[]).some(r => r.taxBreakdown && r.taxBreakdown.ivaRuleId === id) ||
               (st.payments||[]).some(p => p.taxBreakdown && (p.taxBreakdown.retenciones||[]).some(r => r.ruleId === id)) ||
               (st.outgoingPayments||[]).some(p => p.taxBreakdown && (p.taxBreakdown.retenciones||[]).some(r => r.ruleId === id));
  if (used) { _toast('Regla en uso por documentos. No se puede eliminar.', 'warn'); return; }
  if (typeof confirm==='function' && !confirm(`¿Eliminar regla ${id}?`)) return;
  st.taxRules = st.taxRules.filter(r => r.id !== id);
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast(`Regla ${id} eliminada`, 'ok');
};

/* ========================================================== CONFIG NUMERACIÓN */
function renderConfigNumeracion() {
  const st = _S();
  if (!Array.isArray(st.docNumbering) || !st.docNumbering.length) st.docNumbering = seedDocNumbering();
  const rows = st.docNumbering;
  return `
    <div class="mb-3">
      <h2 class="font-bold gold-title text-lg">Numeración de documentos</h2>
      <p class="text-xs text-brand-muted">Numeración consecutiva interna por prefijo. <span class="text-amber-300">No oficial DIAN</span> · la facturación oficial se gestiona en sistema externo.</p>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-xs">
      <thead class="text-brand-muted uppercase">
        <tr>
          <th class="px-2 py-2 text-left">Prefijo</th>
          <th class="px-2 py-2 text-left">Descripción</th>
          <th class="px-2 py-2 text-right">Desde</th>
          <th class="px-2 py-2 text-right">Hasta</th>
          <th class="px-2 py-2 text-right">Actual</th>
          <th class="px-2 py-2 text-right">Disponibles</th>
          <th class="px-2 py-2 text-center">Activa</th>
          <th class="px-2 py-2"></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(s => {
          const used = (+s.currentNumber||0) - (+s.rangeFrom||0) + 1;
          const total = (+s.rangeTo||0) - (+s.rangeFrom||0) + 1;
          const left  = total - used;
          const usedRatio = total > 0 ? used/total : 0;
          const warn = usedRatio > 0.9;
          return `<tr class="border-b border-brand-border ${warn?'bg-amber-900/10':''}">
            <td class="px-2 py-2 font-mono text-brand-gold">${s.prefix}</td>
            <td class="px-2 py-2"><input class="input-field text-xs" value="${_escape(s.description||'')}" onchange="setNumeracion('${s.kind}','description',this.value)"></td>
            <td class="px-2 py-2 text-right"><input type="number" class="input-field text-xs text-right w-20" value="${s.rangeFrom}" onchange="setNumeracion('${s.kind}','rangeFrom',this.value)"></td>
            <td class="px-2 py-2 text-right"><input type="number" class="input-field text-xs text-right w-24" value="${s.rangeTo}" onchange="setNumeracion('${s.kind}','rangeTo',this.value)"></td>
            <td class="px-2 py-2 text-right"><input type="number" class="input-field text-xs text-right w-20" value="${s.currentNumber}" onchange="setNumeracion('${s.kind}','currentNumber',this.value)"></td>
            <td class="px-2 py-2 text-right ${warn?'text-amber-300 font-semibold':'text-brand-muted'}">${left}${warn?' ⚠':''}</td>
            <td class="px-2 py-2 text-center"><input type="checkbox" ${s.active?'checked':''} onchange="setNumeracion('${s.kind}','active',this.checked)"></td>
            <td class="px-2 py-2 text-xs">${warn?'<span class="text-amber-300">90%+ usado</span>':''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  `;
}

window.setNumeracion = function(kind, field, value) {
  const st = _S();
  if (!Array.isArray(st.docNumbering)) return;
  const s = st.docNumbering.find(x => x.kind === kind); if (!s) return;
  if (field === 'rangeFrom' || field === 'rangeTo' || field === 'currentNumber') s[field] = +value || 0;
  else if (field === 'active') s[field] = !!value;
  else s[field] = value;
  _save();
  if (typeof renderPage==='function') renderPage();
};

/* ========================================================== CONFIG PERFIL */
function renderConfigPerfil() {
  const st = _S();
  if (!st.companyTaxProfile) st.companyTaxProfile = _defaultTaxProfile();
  const p = st.companyTaxProfile;
  return `
    <div class="mb-3">
      <h2 class="font-bold gold-title text-lg">Perfil tributario</h2>
      <p class="text-xs text-brand-muted">Datos generales de la empresa para cálculos contables.</p>
    </div>
    <div class="panel p-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label class="label">NIT</label><input id="cp-nit" class="input-field" value="${_escape(p.nit||'')}"></div>
        <div><label class="label">Razón social</label><input id="cp-rs" class="input-field" value="${_escape(p.razonSocial||'')}"></div>
        <div>
          <label class="label">Régimen tributario</label>
          <select id="cp-reg" class="input-field">
            ${['ordinario','simple','no_responsable'].map(o=>`<option value="${o}" ${p.regimenTributario===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">Periodicidad IVA</label>
          <select id="cp-piva" class="input-field">
            ${['bimestral','cuatrimestral','anual'].map(o=>`<option value="${o}" ${p.periodicidadIVA===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">UVT vigente (COP)</label><input id="cp-uvt" type="number" class="input-field" value="${p.uvtVigente||0}">
        </div>
        <div>
          <label class="label">Tarifa ICA (×1000)</label><input id="cp-ica" type="number" step="0.01" class="input-field" value="${p.tarifaICAporMil||0}">
        </div>
        <div>
          <label class="label">Ciudad ICA</label><input id="cp-cica" class="input-field" value="${_escape(p.ciudadICA||'')}">
        </div>
        <div class="grid grid-cols-3 gap-2 mt-2">
          <label class="text-xs flex items-center gap-2"><input id="cp-iva" type="checkbox" ${p.responsableIVA?'checked':''}> Responsable IVA</label>
          <label class="text-xs flex items-center gap-2"><input id="cp-rica" type="checkbox" ${p.responsableICA?'checked':''}> Responsable ICA</label>
          <label class="text-xs flex items-center gap-2"><input id="cp-arf" type="checkbox" ${p.autoretenedor?'checked':''}> Autorretenedor</label>
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <button onclick="saveTaxProfile()" class="btn-gold">Guardar perfil</button>
      </div>
    </div>
  `;
}

window.saveTaxProfile = function() {
  const st = _S();
  if (!st.companyTaxProfile) st.companyTaxProfile = {};
  const p = st.companyTaxProfile;
  p.nit = (document.getElementById('cp-nit')?.value || '').trim();
  p.razonSocial = (document.getElementById('cp-rs')?.value || '').trim();
  p.regimenTributario = document.getElementById('cp-reg')?.value;
  p.periodicidadIVA = document.getElementById('cp-piva')?.value;
  p.uvtVigente = +document.getElementById('cp-uvt')?.value || 0;
  p.tarifaICAporMil = +document.getElementById('cp-ica')?.value || 0;
  p.ciudadICA = (document.getElementById('cp-cica')?.value || '').trim();
  p.responsableIVA = !!document.getElementById('cp-iva')?.checked;
  p.responsableICA = !!document.getElementById('cp-rica')?.checked;
  p.autoretenedor  = !!document.getElementById('cp-arf')?.checked;
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast('Perfil tributario actualizado', 'ok');
};

/* ============================================================ CONFIG CC */
const _SEEDED_CC_CODES = ['CEDI','TALLER','VENTAS','ADMIN','CTG','VOL'];

function _ccHasMovement(code, target) {
  const st = _S(target);
  return (st.journalLines||[]).some(l => l.costCenter === code);
}
function _ccHasMovementInOpenPeriod(code, target) {
  const st = _S(target);
  const lines = (st.journalLines||[]);
  const jeMap = {};
  (st.journalEntries||[]).forEach(j => { jeMap[j.id] = j; });
  return lines.some(l => {
    if (l.costCenter !== code) return false;
    const je = jeMap[l.journalId]; if (!je) return false;
    const p = (st.fiscalPeriods||[]).find(x => x.id === je.periodId);
    return p && p.status === 'abierto';
  });
}

function renderConfigCC() {
  const st = _S();
  if (!Array.isArray(st.costCenters) || st.costCenters.length === 0) {
    st.costCenters = seedCostCenters();
  }
  const ccs = st.costCenters.slice().sort((a,b)=>a.code.localeCompare(b.code));
  const total = ccs.length;
  const activos = ccs.filter(c => c.active !== false).length;
  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Centros de costo</h2>
        <p class="text-xs text-brand-muted">${total} centros · ${activos} activos. Los centros del sistema (${_SEEDED_CC_CODES.join(', ')}) tienen código bloqueado; el nombre y el estado son editables. Los movimientos se inyectan automáticamente en consumos MP, producto terminado y costo de venta.</p>
      </div>
      <button onclick="openNewCostCenter()" class="btn-gold text-sm">+ Nuevo centro de costo</button>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted">
        <tr>
          <th class="px-3 py-2 text-left">Código</th>
          <th class="px-3 py-2 text-left">Nombre</th>
          <th class="px-3 py-2 text-center">Movimientos</th>
          <th class="px-3 py-2 text-center">Estado</th>
          <th class="px-3 py-2 text-right">Acción</th>
        </tr>
      </thead>
      <tbody>
        ${ccs.map(c => {
          const seeded = _SEEDED_CC_CODES.indexOf(c.code) >= 0;
          const moves = (st.journalLines||[]).filter(l => l.costCenter === c.code).length;
          const checked = c.active !== false ? 'checked' : '';
          const codeCell = seeded
            ? `<span class="font-mono text-brand-gold">${_escape(c.code)}<span class="text-[9px] text-brand-muted ml-1">[sys]</span></span>`
            : `<span class="font-mono text-brand-gold">${_escape(c.code)}</span>`;
          const delBtn = (!seeded && moves === 0)
            ? `<button onclick="deleteCostCenter('${_escape(c.code)}')" class="text-xs text-red-400 hover:underline ml-2" title="Eliminar (sin movimientos)">🗑</button>`
            : '';
          return `<tr class="border-b border-brand-border">
            <td class="px-3 py-2">${codeCell}</td>
            <td class="px-3 py-2">
              <input value="${_escape(c.name||'')}" onchange="renameCostCenter('${_escape(c.code)}', this.value)" class="input-field py-1 text-xs">
            </td>
            <td class="px-3 py-2 text-center text-xs">${moves}</td>
            <td class="px-3 py-2 text-center">
              <label class="inline-flex items-center gap-1 text-xs">
                <input type="checkbox" ${checked} onchange="toggleCostCenterActive('${_escape(c.code)}')">
                ${c.active !== false ? 'Activo' : 'Inactivo'}
              </label>
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">${delBtn}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  `;
}

window.openNewCostCenter = function() {
  const html = `<div class="panel rounded-xl shadow-2xl w-full max-w-md p-6" style="background:#152943">
    <div class="flex justify-between mb-4">
      <h2 class="text-lg font-bold gold-title">Nuevo centro de costo</h2>
      <button onclick="closeModal('modal-ccnew')" class="text-brand-muted text-2xl">×</button>
    </div>
    <div class="space-y-3">
      <div><label class="label">Código *</label>
        <input id="cc-code" class="input-field font-mono uppercase" maxlength="6" placeholder="3 a 6 caracteres mayúsculas">
        <p class="text-[11px] text-brand-muted mt-1">3-6 caracteres en mayúsculas. Único.</p>
      </div>
      <div><label class="label">Nombre *</label><input id="cc-name" class="input-field" placeholder="Nombre del centro de costo"></div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal('modal-ccnew')" class="btn-outline">Cancelar</button>
      <button onclick="saveNewCostCenter()" class="btn-gold">Crear</button>
    </div>
  </div>`;
  if (typeof showModal==='function') showModal('modal-ccnew', html);
};

window.saveNewCostCenter = function() {
  const st = _S();
  if (!Array.isArray(st.costCenters)) st.costCenters = seedCostCenters();
  const code = (document.getElementById('cc-code')?.value || '').trim().toUpperCase();
  const name = (document.getElementById('cc-name')?.value || '').trim();
  if (!code || !name) { _toast('Código y nombre requeridos', 'error'); return; }
  if (!/^[A-Z0-9]{3,6}$/.test(code)) { _toast('Código: 3-6 caracteres A-Z/0-9', 'error'); return; }
  if (st.costCenters.some(c => c.code === code)) { _toast('Código ya existe', 'error'); return; }
  st.costCenters.push({ id:'CC-'+code, code, name, active:true });
  _save();
  if (typeof closeModal==='function') closeModal('modal-ccnew');
  if (typeof renderPage==='function') renderPage();
  _toast(`Centro de costo ${code} creado`, 'ok');
};

window.renameCostCenter = function(code, newName) {
  const st = _S();
  const cc = (st.costCenters||[]).find(c => c.code === code); if (!cc) return;
  const nm = (newName||'').trim();
  if (!nm) { _toast('Nombre vacío', 'error'); return; }
  cc.name = nm;
  _save();
  _toast(`CC ${code}: nombre actualizado`, 'ok');
};

window.toggleCostCenterActive = function(code) {
  const st = _S();
  const cc = (st.costCenters||[]).find(c => c.code === code); if (!cc) return;
  // No permitir desactivar si tiene movimientos en periodo abierto
  if (cc.active !== false && _ccHasMovementInOpenPeriod(code, st)) {
    _toast('No se puede desactivar: tiene movimientos en el periodo abierto.', 'warn');
    if (typeof renderPage==='function') renderPage();
    return;
  }
  cc.active = !(cc.active !== false);
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast(`CC ${code} ${cc.active?'activado':'desactivado'}`, 'ok');
};

window.deleteCostCenter = function(code) {
  const st = _S();
  if (_SEEDED_CC_CODES.indexOf(code) >= 0) { _toast('Centro del sistema: no se puede eliminar (solo desactivar).', 'warn'); return; }
  if (_ccHasMovement(code, st)) { _toast('No se puede eliminar: tiene movimientos.', 'warn'); return; }
  if (typeof confirm === 'function' && !confirm(`¿Eliminar centro de costo ${code}?`)) return;
  st.costCenters = (st.costCenters||[]).filter(c => c.code !== code);
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast(`CC ${code} eliminado`, 'ok');
};

/* ============================================================ AUX IVA */
function _filtersAuxIVA() {
  if (!window._auxIVAFilter) {
    window._auxIVAFilter = { period: _yyyymm(_todayStr()) };
  }
  return window._auxIVAFilter;
}
window.setAuxIVAPeriod = function(p) {
  _filtersAuxIVA().period = p;
  if (typeof renderPage==='function') renderPage();
};

function renderAuxIVA() {
  const st = _S();
  const f = _filtersAuxIVA();
  const periods = (st.fiscalPeriods||[]).map(p => p.id).sort().reverse();

  // IVA generado: facturas del periodo con taxBreakdown
  const facturas = (st.invoices||[]).filter(i => {
    const d = i.emitDate || i.issuedAt || '';
    return _yyyymm(d) === f.period && i.taxBreakdown && (+i.taxBreakdown.iva > 0);
  });
  // IVA descontable: supplyReceipts del periodo
  const compras = (st.supplyReceipts||[]).filter(r => {
    const d = r.date || r.receivedAt || '';
    return _yyyymm(d) === f.period && r.taxBreakdown && (+r.taxBreakdown.iva > 0);
  });

  const totGenBase = facturas.reduce((a,i)=>a+(+i.taxBreakdown.base||0),0);
  const totGenIva  = facturas.reduce((a,i)=>a+(+i.taxBreakdown.iva||0),0);
  const totGenTot  = facturas.reduce((a,i)=>a+(+i.taxBreakdown.total||0),0);

  const totDesBase = compras.reduce((a,r)=>a+(+r.taxBreakdown.base||0),0);
  const totDesIva  = compras.reduce((a,r)=>a+(+r.taxBreakdown.iva||0),0);
  const totDesTot  = compras.reduce((a,r)=>a+(+r.taxBreakdown.total||0),0);

  const neto = totGenIva - totDesIva;

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Auxiliar de IVA</h2>
        <p class="text-xs text-brand-muted">Periodo ${f.period} · ${facturas.length} ventas con IVA · ${compras.length} compras con IVA descontable.</p>
      </div>
      <div class="flex gap-2 items-center">
        <select onchange="setAuxIVAPeriod(this.value)" class="input-field text-xs">
          ${periods.map(p=>`<option value="${p}" ${f.period===p?'selected':''}>${p}</option>`).join('')}
        </select>
        <button onclick="exportFormulario300()" class="btn-outline text-xs">📤 Exportar 300 (CSV)</button>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
      <div class="panel p-3">
        <div class="text-xs text-brand-muted">IVA generado (240805)</div>
        <div class="text-2xl font-bold text-emerald-400">${_fmtCOP(totGenIva)}</div>
        <div class="text-[10px] text-brand-muted">Base ${_fmtCOP(totGenBase)} · Total ${_fmtCOP(totGenTot)}</div>
      </div>
      <div class="panel p-3">
        <div class="text-xs text-brand-muted">IVA descontable (240810)</div>
        <div class="text-2xl font-bold text-amber-300">${_fmtCOP(totDesIva)}</div>
        <div class="text-[10px] text-brand-muted">Base ${_fmtCOP(totDesBase)} · Total ${_fmtCOP(totDesTot)}</div>
      </div>
      <div class="panel p-3 md:col-span-2 ${neto>=0?'border border-emerald-700':'border border-amber-700'}">
        <div class="text-xs text-brand-muted">Saldo neto del periodo</div>
        <div class="text-2xl font-bold ${neto>=0?'text-emerald-400':'text-amber-300'}">${_fmtCOP(neto)}</div>
        <div class="text-[10px] text-brand-muted">${neto>=0?'Saldo a pagar a la DIAN':'Saldo a favor del contribuyente'}</div>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div class="panel overflow-hidden">
        <div class="px-3 py-2 border-b border-brand-border bg-brand-panel-2"><h3 class="text-sm font-semibold text-brand-gold">IVA generado · ${facturas.length} doc.</h3></div>
        <table class="w-full text-xs">
          <thead class="text-brand-muted uppercase"><tr>
            <th class="px-2 py-2 text-left">Doc.</th>
            <th class="px-2 py-2 text-left">Cliente</th>
            <th class="px-2 py-2 text-right">Base</th>
            <th class="px-2 py-2 text-right">IVA</th>
            <th class="px-2 py-2 text-right">Total</th>
          </tr></thead>
          <tbody>
            ${facturas.length===0?`<tr><td colspan="5" class="px-2 py-4 text-center text-brand-muted">Sin facturas en el periodo.</td></tr>`:
              facturas.map(i=>`<tr class="border-b border-brand-border">
                <td class="px-2 py-1 font-mono text-brand-gold">${i.id}</td>
                <td class="px-2 py-1">${_escape(i.clientName||'—')}</td>
                <td class="px-2 py-1 text-right">${_fmtCOP(i.taxBreakdown.base)}</td>
                <td class="px-2 py-1 text-right text-emerald-300">${_fmtCOP(i.taxBreakdown.iva)}</td>
                <td class="px-2 py-1 text-right">${_fmtCOP(i.taxBreakdown.total)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot class="font-semibold border-t-2 border-brand-gold">
            <tr><td colspan="2" class="px-2 py-2 text-right">Totales</td>
                <td class="px-2 py-2 text-right">${_fmtCOP(totGenBase)}</td>
                <td class="px-2 py-2 text-right text-emerald-400">${_fmtCOP(totGenIva)}</td>
                <td class="px-2 py-2 text-right">${_fmtCOP(totGenTot)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div class="panel overflow-hidden">
        <div class="px-3 py-2 border-b border-brand-border bg-brand-panel-2"><h3 class="text-sm font-semibold text-brand-gold">IVA descontable · ${compras.length} doc.</h3></div>
        <table class="w-full text-xs">
          <thead class="text-brand-muted uppercase"><tr>
            <th class="px-2 py-2 text-left">Recibo</th>
            <th class="px-2 py-2 text-left">Proveedor</th>
            <th class="px-2 py-2 text-right">Base</th>
            <th class="px-2 py-2 text-right">IVA</th>
            <th class="px-2 py-2 text-right">Total</th>
          </tr></thead>
          <tbody>
            ${compras.length===0?`<tr><td colspan="5" class="px-2 py-4 text-center text-brand-muted">Sin compras en el periodo.</td></tr>`:
              compras.map(r=>`<tr class="border-b border-brand-border">
                <td class="px-2 py-1 font-mono text-brand-gold">${_escape(r.id||'')}</td>
                <td class="px-2 py-1">${_escape(r.supplierName||r.supplier||'—')}</td>
                <td class="px-2 py-1 text-right">${_fmtCOP(r.taxBreakdown.base)}</td>
                <td class="px-2 py-1 text-right text-amber-300">${_fmtCOP(r.taxBreakdown.iva)}</td>
                <td class="px-2 py-1 text-right">${_fmtCOP(r.taxBreakdown.total)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot class="font-semibold border-t-2 border-brand-gold">
            <tr><td colspan="2" class="px-2 py-2 text-right">Totales</td>
                <td class="px-2 py-2 text-right">${_fmtCOP(totDesBase)}</td>
                <td class="px-2 py-2 text-right text-amber-400">${_fmtCOP(totDesIva)}</td>
                <td class="px-2 py-2 text-right">${_fmtCOP(totDesTot)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

window.exportFormulario300 = function() {
  const st = _S();
  const f = _filtersAuxIVA();
  const facs = (st.invoices||[]).filter(i => _yyyymm(i.emitDate||i.issuedAt) === f.period && i.taxBreakdown && +i.taxBreakdown.iva > 0);
  const cmps = (st.supplyReceipts||[]).filter(r => _yyyymm(r.date||r.receivedAt) === f.period && r.taxBreakdown && +r.taxBreakdown.iva > 0);
  const lines = [['tipo','documento','tercero','base','iva','total','fecha']];
  facs.forEach(i => lines.push(['IVA_GENERADO', i.id, i.clientName||'', i.taxBreakdown.base, i.taxBreakdown.iva, i.taxBreakdown.total, i.emitDate||i.issuedAt||'']));
  cmps.forEach(r => lines.push(['IVA_DESCONTABLE', r.id||'', r.supplierName||r.supplier||'', r.taxBreakdown.base, r.taxBreakdown.iva, r.taxBreakdown.total, r.date||r.receivedAt||'']));
  const csv = lines.map(row => row.map(c => `"${String(c==null?'':c).replace(/"/g,'""')}"`).join(',')).join('\n');
  try {
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `formulario300_${f.period}.csv`; a.click();
    URL.revokeObjectURL(url);
    _toast('Formulario 300 (mock) exportado', 'ok');
  } catch(e) { _toast('Export falló: '+(e.message||e), 'error'); }
};

/* ============================================================ AUX RETENCIONES */
function _filtersAuxRet() {
  if (!window._auxRetFilter) window._auxRetFilter = { period: _yyyymm(_todayStr()) };
  return window._auxRetFilter;
}
window.setAuxRetPeriod = function(p) {
  _filtersAuxRet().period = p;
  if (typeof renderPage==='function') renderPage();
};

function renderAuxRetenciones() {
  const st = _S();
  const f = _filtersAuxRet();
  const periods = (st.fiscalPeriods||[]).map(p => p.id).sort().reverse();

  // Helper: agrupar journalLines por tercero+ruleId para una cuenta del PUC en el periodo
  function rowsForAccount(codeRegex) {
    const out = [];
    _iterAccountLines(st, {}, (l, je) => {
      if (!codeRegex.test(l.accountCode||'')) return;
      if (_yyyymm(je.date) !== f.period) return;
      const amount = (+l.debit||0) + (+l.credit||0);
      if (!amount) return;
      out.push({
        date: je.date,
        accountCode: l.accountCode,
        thirdParty: l.thirdParty ? (l.thirdParty.name||'') : '—',
        doc: je.sourceId,
        debit: +l.debit||0,
        credit: +l.credit||0,
        description: l.description||''
      });
    });
    return out.sort((a,b) => a.date.localeCompare(b.date));
  }

  const rfPracticada = rowsForAccount(/^2365/);   // ReteFte practicada (compras)
  const rfRecibida   = rowsForAccount(/^135515/); // ReteFte recibida (ventas)
  const rivaPracticada = rowsForAccount(/^236701/);
  const rivaRecibida   = rowsForAccount(/^135517/);
  const ricaPracticada = rowsForAccount(/^236801/);
  const ricaRecibida   = rowsForAccount(/^135518/);

  function table(title, rows, color) {
    const totD = rows.reduce((a,r)=>a+r.debit,0);
    const totC = rows.reduce((a,r)=>a+r.credit,0);
    return `<div class="panel overflow-hidden mb-3">
      <div class="px-3 py-2 border-b border-brand-border bg-brand-panel-2 flex justify-between">
        <h3 class="text-sm font-semibold text-brand-gold">${_escape(title)} · ${rows.length} mov.</h3>
        <span class="text-xs ${color}">DB ${_fmtCOP(totD)} · CR ${_fmtCOP(totC)}</span>
      </div>
      <table class="w-full text-xs">
        <thead class="text-brand-muted uppercase"><tr>
          <th class="px-2 py-2 text-left">Fecha</th>
          <th class="px-2 py-2 text-left">Cuenta</th>
          <th class="px-2 py-2 text-left">Tercero</th>
          <th class="px-2 py-2 text-left">Ref.</th>
          <th class="px-2 py-2 text-right">Debe</th>
          <th class="px-2 py-2 text-right">Haber</th>
        </tr></thead>
        <tbody>
          ${rows.length===0?`<tr><td colspan="6" class="px-2 py-3 text-center text-brand-muted">Sin movimientos.</td></tr>`:
            rows.map(r=>`<tr class="border-b border-brand-border">
              <td class="px-2 py-1 text-brand-muted">${_fmtDate(r.date)}</td>
              <td class="px-2 py-1 font-mono">${r.accountCode}</td>
              <td class="px-2 py-1">${_escape(r.thirdParty)}</td>
              <td class="px-2 py-1">${_escape(r.doc||'')}</td>
              <td class="px-2 py-1 text-right text-emerald-300">${r.debit>0?_fmtCOP(r.debit):'—'}</td>
              <td class="px-2 py-1 text-right text-red-300">${r.credit>0?_fmtCOP(r.credit):'—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Auxiliar de retenciones</h2>
        <p class="text-xs text-brand-muted">Movimientos de retenciones del periodo ${f.period}.</p>
      </div>
      <div class="flex gap-2 items-center">
        <select onchange="setAuxRetPeriod(this.value)" class="input-field text-xs">
          ${periods.map(p=>`<option value="${p}" ${f.period===p?'selected':''}>${p}</option>`).join('')}
        </select>
        <button onclick="generarCertificadosRet()" class="btn-outline text-xs">📤 Generar certificados (mock)</button>
      </div>
    </div>
    ${table('ReteFte practicada (236xxx)',  rfPracticada,    'text-amber-300')}
    ${table('ReteFte recibida (135515)',     rfRecibida,      'text-emerald-300')}
    ${table('ReteIVA practicada (236701)',  rivaPracticada,  'text-amber-300')}
    ${table('ReteIVA recibida (135517)',     rivaRecibida,    'text-emerald-300')}
    ${table('ReteICA practicada (236801)',  ricaPracticada,  'text-amber-300')}
    ${table('ReteICA recibida (135518)',     ricaRecibida,    'text-emerald-300')}
  `;
}

window.generarCertificadosRet = function() {
  const f = _filtersAuxRet();
  _toast(`Certificados de retenciones del periodo ${f.period} generados (mock)`, 'ok');
};

/* ===================================================== UI · NÓMINA (FASE 4) */
function _filtersNomina() {
  if (!window._fNom) {
    const today = _todayStr();
    const yymm = _yyyymm(today) || '2026-04';
    window._fNom = { period: yymm };
  }
  return window._fNom;
}

window.setNominaPeriod = function(p) {
  _filtersNomina().period = p;
  if (typeof renderPage==='function') renderPage();
};

function renderNomina() {
  const st = _S();
  if (!Array.isArray(st.payrollRuns)) st.payrollRuns = [];
  const f = _filtersNomina();
  const params = _payrollParams(st);
  const period = f.period;
  const run = st.payrollRuns.find(r => r.periodId === period);
  const periods = [];
  // ofrecer 12 periodos atrás desde hoy
  const t = new Date();
  for (let i=0; i<12; i++) {
    const d = new Date(t.getFullYear(), t.getMonth()-i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const periodOptions = periods.map(p => `<option value="${p}" ${p===period?'selected':''}>${p}</option>`).join('');

  // Lista de empleados activos para preview
  const activeEmps = (st.employees||[]).filter(e => e.estado === 'activo');
  const calcs = run ? run.employees : activeEmps.map(e => _calcEmployeePayroll(e, params));
  const tot = run ? run.totals : (() => {
    const t = { salario:0, auxTpte:0, totalDevengado:0, deducciones:0, aportes:0, provisiones:0, neto:0 };
    calcs.forEach(c => {
      t.salario += c.salario; t.auxTpte += c.auxTpte; t.totalDevengado += c.totalDevengado;
      t.deducciones += c.deducciones.total; t.aportes += c.aportes.total;
      t.provisiones += c.provisiones.total; t.neto += c.neto;
    });
    return t;
  })();

  const headerBtn = run
    ? `<div class="flex items-center gap-2">
        ${run.journalEntryId ? `<span class="badge bg-emerald-700 text-white">Contabilizado · ${_escape(run.journalEntryId)}</span>` : '<span class="badge bg-amber-700 text-white">No contabilizado</span>'}
        ${run.journalEntryId ? `<button onclick="onVerJEnomina('${_escape(run.journalEntryId)}')" class="btn-secondary text-xs">Ver asiento</button>` : `<button onclick="onContabilizarNomina('${_escape(run.id)}')" class="btn-gold text-xs">Contabilizar</button>`}
        <button onclick="onEliminarNominaRun('${_escape(run.id)}')" class="btn-danger text-xs">Eliminar run</button>
       </div>`
    : `<button onclick="onGenerarNomina()" class="btn-gold text-sm">Generar nómina</button>`;

  const filaEmp = (c) => {
    return `<tr class="border-b border-brand-navy/30">
      <td class="px-2 py-1 text-xs">${_escape(c.name)} <span class="text-brand-muted">(${_escape(c.area||'')})</span></td>
      <td class="px-2 py-1 text-xs text-right">${_fmtCOP(c.salario)}</td>
      <td class="px-2 py-1 text-xs text-right">${c.auxTpte>0 ? _fmtCOP(c.auxTpte) : '—'}</td>
      <td class="px-2 py-1 text-xs text-right font-semibold">${_fmtCOP(c.totalDevengado)}</td>
      <td class="px-2 py-1 text-xs text-right text-red-300">${_fmtCOP(c.deducciones.total)}</td>
      <td class="px-2 py-1 text-xs text-right text-amber-300">${_fmtCOP(c.aportes.total)}</td>
      <td class="px-2 py-1 text-xs text-right text-amber-300">${_fmtCOP(c.provisiones.total)}</td>
      <td class="px-2 py-1 text-xs text-right text-emerald-300 font-semibold">${_fmtCOP(c.neto)}</td>
    </tr>`;
  };

  return `
    <div class="mb-3 flex flex-wrap items-end gap-3 justify-between">
      <div>
        <h2 class="font-bold gold-title text-lg">Nómina</h2>
        <p class="text-xs text-brand-muted">Cálculo y contabilización mensual · SMMLV 2026 ${_fmtCOP(params.smmlv)} · Aux tpte ${_fmtCOP(params.auxTransporte)} · ARL III ${(params.arlIII*100).toFixed(3)}%</p>
      </div>
      <div class="flex items-end gap-2">
        <div>
          <label class="label">Periodo</label>
          <select class="input-field" onchange="setNominaPeriod(this.value)">${periodOptions}</select>
        </div>
        ${headerBtn}
      </div>
    </div>

    <div class="panel p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-brand-cream">${run ? `Run ${_escape(run.id)} · ${_escape(run.runAt||'')}` : `Preview ${period} · ${calcs.length} empleado(s) activos`}</h3>
        <span class="text-xs text-brand-muted">${run ? 'Persistido' : 'No persistido — no aparece en libros hasta "Generar nómina"'}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-brand-navy/50 text-brand-muted">
            <tr>
              <th class="px-2 py-1 text-left text-xs uppercase">Empleado</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Salario</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Aux Tpte</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Total devengado</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Deducciones</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Aportes empr.</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Provisiones</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Neto a pagar</th>
            </tr>
          </thead>
          <tbody>
            ${calcs.length ? calcs.map(filaEmp).join('') : `<tr><td colspan="8" class="px-2 py-4 text-center text-brand-muted text-sm">Sin empleados activos.</td></tr>`}
          </tbody>
          <tfoot class="bg-brand-navy/30 text-brand-cream font-semibold">
            <tr>
              <td class="px-2 py-2 text-xs">Totales</td>
              <td class="px-2 py-2 text-xs text-right">${_fmtCOP(tot.salario)}</td>
              <td class="px-2 py-2 text-xs text-right">${_fmtCOP(tot.auxTpte)}</td>
              <td class="px-2 py-2 text-xs text-right">${_fmtCOP(tot.totalDevengado)}</td>
              <td class="px-2 py-2 text-xs text-right text-red-300">${_fmtCOP(tot.deducciones)}</td>
              <td class="px-2 py-2 text-xs text-right text-amber-300">${_fmtCOP(tot.aportes)}</td>
              <td class="px-2 py-2 text-xs text-right text-amber-300">${_fmtCOP(tot.provisiones)}</td>
              <td class="px-2 py-2 text-xs text-right text-emerald-300">${_fmtCOP(tot.neto)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="panel p-4 mt-4">
      <h3 class="font-semibold text-brand-cream mb-2 text-sm">Histórico de corridas</h3>
      ${(st.payrollRuns||[]).length ? `
        <table class="w-full text-sm">
          <thead class="bg-brand-navy/50 text-brand-muted">
            <tr>
              <th class="px-2 py-1 text-left text-xs uppercase">Run</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Periodo</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Empleados</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Total neto</th>
              <th class="px-2 py-1 text-left text-xs uppercase">JE</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${st.payrollRuns.map(r => `
              <tr class="border-b border-brand-navy/30">
                <td class="px-2 py-1 text-xs">${_escape(r.id)}</td>
                <td class="px-2 py-1 text-xs">${_escape(r.periodId)}</td>
                <td class="px-2 py-1 text-xs text-right">${(r.employees||[]).length}</td>
                <td class="px-2 py-1 text-xs text-right">${_fmtCOP((r.totals||{}).neto||0)}</td>
                <td class="px-2 py-1 text-xs">${r.journalEntryId ? `<a class="text-brand-gold underline cursor-pointer" onclick="onVerJEnomina('${_escape(r.journalEntryId)}')">${_escape(r.journalEntryId)}</a>` : '—'}</td>
                <td class="px-2 py-1 text-xs">
                  <button onclick="setNominaPeriod('${_escape(r.periodId)}')" class="btn-secondary text-xs mr-1">Ver</button>
                  ${!r.journalEntryId ? `<button onclick="onContabilizarNomina('${_escape(r.id)}')" class="btn-gold text-xs mr-1">Contabilizar</button>` : ''}
                  <button onclick="onEliminarNominaRun('${_escape(r.id)}')" class="btn-danger text-xs">Eliminar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : `<p class="text-xs text-brand-muted">Aún no hay corridas registradas.</p>`}
    </div>
  `;
}

window.onGenerarNomina = function() {
  const st = _S();
  const f = _filtersNomina();
  const res = runPayroll(f.period, null, st);
  if (res.error) { _toast(res.message || res.error, 'error'); return; }
  if (res.warning) { _toast(`Ya existe nómina para ${f.period}`, 'warn'); return; }
  // Auto-contabilizar
  const post = postPayroll(res.run, st);
  if (post.error) {
    _toast(`Run creado pero asiento falló: ${post.message||post.error}`, 'warn');
  } else {
    _toast(`Nómina ${f.period} generada y contabilizada`, 'ok');
  }
  _save();
  if (typeof renderPage==='function') renderPage();
};

window.onContabilizarNomina = function(runId) {
  const st = _S();
  const run = (st.payrollRuns||[]).find(r => r.id === runId);
  if (!run) { _toast('Run no encontrado', 'error'); return; }
  const post = postPayroll(run, st);
  if (post.error) { _toast(post.message||post.error, 'error'); return; }
  _toast(`Asiento ${run.journalEntryId} generado`, 'ok');
  _save();
  if (typeof renderPage==='function') renderPage();
};

window.onEliminarNominaRun = function(runId) {
  const st = _S();
  if (typeof confirm==='function' && !confirm(`¿Eliminar el run ${runId}? Si está contabilizado, primero reverse el asiento manualmente.`)) return;
  const run = (st.payrollRuns||[]).find(r => r.id === runId);
  if (!run) { _toast('Run no encontrado', 'error'); return; }
  // Si el JE existe y está posted, no permitir eliminar — sugerir reversar
  if (run.journalEntryId) {
    const je = (st.journalEntries||[]).find(j => j.id === run.journalEntryId);
    if (je && je.status === 'posted') {
      _toast('Reverse el asiento antes de eliminar el run', 'warn');
      return;
    }
  }
  st.payrollRuns = (st.payrollRuns||[]).filter(r => r.id !== runId);
  _toast(`Run ${runId} eliminado`, 'ok');
  _save();
  if (typeof renderPage==='function') renderPage();
};

window.onVerJEnomina = function(jeId) {
  if (typeof window.openJournalEntryModal === 'function') {
    window.openJournalEntryModal(jeId);
  } else {
    _toast('Modal de asiento no disponible en este contexto', 'warn');
  }
};

/* ============================================== UI · ACTIVOS FIJOS (FASE 4) */
function renderActivosFijos() {
  const st = _S();
  if (!Array.isArray(st.fixedAssets)) st.fixedAssets = [];
  const assets = st.fixedAssets;
  const yymm = _yyyymm(_todayStr()) || '2026-04';
  const lastDepRun = (st.depreciationRuns||[]).find(r => r.periodId === yymm);

  const filaActivo = (a) => {
    const cost = +a.cost||0;
    const dep  = +a.depAcumulada||0;
    const val  = Math.max(0, cost - dep);
    const hasMov = (st.journalLines||[]).some(l => (l.sourceLink && l.sourceLink.assetId === a.id) || (a.depAcumulada > 0));
    return `<tr class="border-b border-brand-navy/30">
      <td class="px-2 py-1 text-xs">${_escape(a.id)}</td>
      <td class="px-2 py-1 text-xs">${_escape(a.name||'')}</td>
      <td class="px-2 py-1 text-xs">${_escape(a.category||'')}</td>
      <td class="px-2 py-1 text-xs">${_escape(a.accountCode||'')}</td>
      <td class="px-2 py-1 text-xs text-right">${_fmtCOP(cost)}</td>
      <td class="px-2 py-1 text-xs">${_escape(a.acquiredAt||'')}</td>
      <td class="px-2 py-1 text-xs text-right">${a.usefulLifeMonths||0} m</td>
      <td class="px-2 py-1 text-xs text-right text-amber-300">${_fmtCOP(dep)}</td>
      <td class="px-2 py-1 text-xs text-right text-emerald-300">${_fmtCOP(val)}</td>
      <td class="px-2 py-1 text-xs">${a.estado==='activo' ? '<span class="badge bg-emerald-700 text-white">activo</span>' : '<span class="badge bg-zinc-600 text-white">baja</span>'}</td>
      <td class="px-2 py-1 text-xs">
        ${!hasMov ? `<button onclick="onEliminarActivo('${_escape(a.id)}')" class="btn-danger text-xs">Eliminar</button>` : '<span class="text-brand-muted text-xs">en uso</span>'}
      </td>
    </tr>`;
  };

  return `
    <div class="mb-3 flex flex-wrap items-end gap-3 justify-between">
      <div>
        <h2 class="font-bold gold-title text-lg">Activos fijos</h2>
        <p class="text-xs text-brand-muted">${assets.length} activo(s) · Periodo abierto ${yymm} · ${lastDepRun ? `Depreciación ${yymm} corrida (${_fmtCOP(lastDepRun.totals.monto)})` : 'Sin depreciación corrida en este periodo'}</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="openNuevoActivo()" class="btn-gold text-sm">+ Nuevo activo</button>
        <button onclick="onCorrerDepreciacion()" ${lastDepRun ? 'disabled' : ''} class="${lastDepRun ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-gold'} text-sm">Correr depreciación ${yymm}</button>
      </div>
    </div>

    <div class="panel p-4">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-brand-navy/50 text-brand-muted">
            <tr>
              <th class="px-2 py-1 text-left text-xs uppercase">ID</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Nombre</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Categoría</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Cuenta</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Costo</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Adq.</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Vida útil</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Dep acum</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Valor libros</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Estado</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${assets.length ? assets.map(filaActivo).join('') : `<tr><td colspan="11" class="px-2 py-6 text-center text-brand-muted text-sm">Sin activos fijos registrados.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel p-4 mt-4">
      <h3 class="font-semibold text-brand-cream mb-2 text-sm">Histórico depreciaciones</h3>
      ${(st.depreciationRuns||[]).length ? `
        <table class="w-full text-sm">
          <thead class="bg-brand-navy/50 text-brand-muted">
            <tr>
              <th class="px-2 py-1 text-left text-xs uppercase">Run</th>
              <th class="px-2 py-1 text-left text-xs uppercase">Periodo</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Activos</th>
              <th class="px-2 py-1 text-right text-xs uppercase">Total</th>
              <th class="px-2 py-1 text-left text-xs uppercase">JE</th>
            </tr>
          </thead>
          <tbody>
            ${st.depreciationRuns.map(r => `
              <tr class="border-b border-brand-navy/30">
                <td class="px-2 py-1 text-xs">${_escape(r.id)}</td>
                <td class="px-2 py-1 text-xs">${_escape(r.periodId)}</td>
                <td class="px-2 py-1 text-xs text-right">${(r.assets||[]).length}</td>
                <td class="px-2 py-1 text-xs text-right">${_fmtCOP((r.totals||{}).monto||0)}</td>
                <td class="px-2 py-1 text-xs">${r.journalEntryId ? `<a class="text-brand-gold underline cursor-pointer" onclick="onVerJEnomina('${_escape(r.journalEntryId)}')">${_escape(r.journalEntryId)}</a>` : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : `<p class="text-xs text-brand-muted">Sin corridas de depreciación.</p>`}
    </div>
  `;
}

window.openNuevoActivo = function() {
  if (typeof showModal !== 'function') { _toast('Modal no disponible', 'warn'); return; }
  const html = `
    <div class="p-4 max-w-lg">
      <h3 class="text-lg font-bold text-brand-gold mb-3">Nuevo activo fijo</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label class="label">Nombre</label><input id="af-name" class="input-field" placeholder="Ej. Computador Dell"></div>
        <div>
          <label class="label">Categoría</label>
          <select id="af-cat" class="input-field" onchange="window._afCatChanged && window._afCatChanged()">
            <option value="oficina">Equipo de oficina</option>
            <option value="computacion">Equipo de cómputo</option>
            <option value="transporte">Flota y transporte</option>
            <option value="maquinaria">Maquinaria y equipo</option>
            <option value="muebles">Muebles y enseres</option>
            <option value="construcciones">Construcciones</option>
          </select>
        </div>
        <div><label class="label">Cuenta PUC</label><input id="af-acc" class="input-field" value="152405" readonly></div>
        <div><label class="label">Costo (COP)</label><input id="af-cost" type="number" class="input-field" min="0"></div>
        <div><label class="label">Valor residual (COP)</label><input id="af-salv" type="number" class="input-field" min="0" value="0"></div>
        <div><label class="label">Fecha adquisición</label><input id="af-date" type="date" class="input-field" value="${_todayStr()}"></div>
        <div><label class="label">Vida útil (meses)</label><input id="af-life" type="number" class="input-field" min="1" value="60"></div>
        <div>
          <label class="label">Uso</label>
          <select id="af-use" class="input-field">
            <option value="admin">Administración</option>
            <option value="sales">Ventas</option>
            <option value="cif">Producción / CIF</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button onclick="closeModal()" class="btn-secondary">Cancelar</button>
        <button onclick="saveNuevoActivo()" class="btn-gold">Crear activo</button>
      </div>
    </div>`;
  showModal(html);
  // Auto-actualizar la cuenta PUC según categoría
  window._afCatChanged = function() {
    const cat = document.getElementById('af-cat')?.value;
    const acc = ({oficina:'152405', computacion:'152805', transporte:'154005', maquinaria:'152405', muebles:'152405', construcciones:'151605'})[cat] || '152405';
    const el = document.getElementById('af-acc');
    if (el) el.value = acc;
  };
};

window.saveNuevoActivo = function() {
  const st = _S();
  const name = (document.getElementById('af-name')?.value||'').trim();
  const category = document.getElementById('af-cat')?.value || 'oficina';
  const accountCode = document.getElementById('af-acc')?.value || '152405';
  const cost = +document.getElementById('af-cost')?.value || 0;
  const salvageValue = +document.getElementById('af-salv')?.value || 0;
  const acquiredAt = document.getElementById('af-date')?.value || _todayStr();
  const usefulLifeMonths = +document.getElementById('af-life')?.value || 60;
  const usage = document.getElementById('af-use')?.value || 'admin';
  if (!name || cost <= 0 || usefulLifeMonths <= 0) {
    _toast('Datos incompletos: nombre, costo > 0, vida útil > 0', 'error'); return;
  }
  if (!Array.isArray(st.fixedAssets)) st.fixedAssets = [];
  if (!st.counters) st.counters = {};
  if (!st.counters.asset) st.counters.asset = 0;
  st.counters.asset++;
  const id = 'AF-' + String(st.counters.asset).padStart(3,'0');
  st.fixedAssets.push({
    id, name, category, accountCode, cost, salvageValue, acquiredAt,
    usefulLifeMonths, usage, depAcumulada: 0, estado:'activo', createdAt: _nowISO()
  });
  if (typeof closeModal === 'function') closeModal();
  _toast(`Activo ${id} creado`, 'ok');
  _save();
  if (typeof renderPage==='function') renderPage();
};

window.onCorrerDepreciacion = function() {
  const st = _S();
  const yymm = _yyyymm(_todayStr()) || '2026-04';
  const res = runMonthlyDepreciation(yymm, st);
  if (res.error) { _toast(res.message||res.error, 'error'); return; }
  if (res.warning) { _toast(`Ya existe depreciación para ${yymm}`, 'warn'); return; }
  const post = postDepreciation(res.run, st);
  if (post.error) {
    _toast(`Run creado pero asiento falló: ${post.message||post.error}`, 'warn');
  } else {
    _toast(`Depreciación ${yymm} corrida y contabilizada (${_fmtCOP(res.run.totals.monto)})`, 'ok');
  }
  _save();
  if (typeof renderPage==='function') renderPage();
};

window.onEliminarActivo = function(assetId) {
  const st = _S();
  if (typeof confirm==='function' && !confirm(`¿Eliminar activo ${assetId}? Solo se permite si no tiene movimientos.`)) return;
  const a = (st.fixedAssets||[]).find(x => x.id === assetId);
  if (!a) { _toast('Activo no encontrado', 'error'); return; }
  if ((+a.depAcumulada||0) > 0) { _toast('El activo tiene depreciación; no se puede eliminar', 'warn'); return; }
  st.fixedAssets = (st.fixedAssets||[]).filter(x => x.id !== assetId);
  _toast(`Activo ${assetId} eliminado`, 'ok');
  _save();
  if (typeof renderPage==='function') renderPage();
};

/* ================================================================== FASE 5
 * HELPERS · REPORTES · CARTERA/CXP · HUB EXPORTACIÓN
 * Pura UI/reportes/exports — no muta operación.
 * ========================================================================== */

/* -------------------------------------------- helpers de saldo y movimientos */

/**
 * getSaldoCuenta(code, asOfDate, target) — saldo a fecha.
 * Recorre journalLines del code, filtra JEs posted con je.date <= asOfDate,
 * suma DB/CR y devuelve saldo según naturaleza.
 * Default asOfDate = hoy.
 */
function getSaldoCuenta(code, asOfDate, target) {
  const st = _S(target);
  const acc = _findAccount(code, st);
  if (!acc) return 0;
  const date = asOfDate || _todayStr();
  let d = 0, c = 0;
  // Convención contable: un asiento reversado queda en libros junto a su reverso,
  // ambos suman a cero. Por eso usamos includeReversed=true (excluye solo draft/cancelled).
  _iterAccountLines(st, { code, asOfDate:date, includeReversed:true }, (l) => {
    d += +l.debit||0; c += +l.credit||0;
  });
  return acc.nature === 'debito' ? (d - c) : (c - d);
}

/**
 * getSaldoCuentaRango(code, from, to, target)
 * Saldo inicial al day(from)-1, débitos+créditos del rango, saldo final al `to`.
 */
function getSaldoCuentaRango(code, from, to, target) {
  const st = _S(target);
  const acc = _findAccount(code, st);
  if (!acc) return { saldoInicial:0, debitos:0, creditos:0, saldoFinal:0 };
  // saldo inicial: hasta el día anterior a `from`
  const dPrev = (function(){
    if (!from) return null;
    try { const d = new Date(from); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }
    catch(e) { return null; }
  })();
  const saldoInicial = dPrev ? getSaldoCuenta(code, dPrev, st) : 0;
  let d = 0, c = 0;
  _iterAccountLines(st, { code, from, to }, (l) => {
    d += +l.debit||0; c += +l.credit||0;
  });
  const movimiento = acc.nature === 'debito' ? (d - c) : (c - d);
  return { saldoInicial, debitos:d, creditos:c, saldoFinal: saldoInicial + movimiento };
}

/**
 * getMovimientosCuenta(code, from, to, target) — líneas posted con info JE + saldo corrido.
 */
function getMovimientosCuenta(code, from, to, target) {
  const st = _S(target);
  const acc = _findAccount(code, st);
  if (!acc) return [];
  const out = [];
  _iterAccountLines(st, { code, from, to }, (l, je) => out.push({ line:l, je }));
  out.sort((a,b) => a.je.date.localeCompare(b.je.date) || (a.line.lineNumber||0) - (b.line.lineNumber||0));
  // saldo corrido desde saldoInicial al inicio del rango
  let saldo = (function(){
    if (!from) return 0;
    try { const d = new Date(from); d.setDate(d.getDate()-1); return getSaldoCuenta(code, d.toISOString().slice(0,10), st); }
    catch(e) { return 0; }
  })();
  return out.map(({line,je}) => {
    const dbt = +line.debit||0, crt = +line.credit||0;
    saldo += (acc.nature==='debito') ? (dbt - crt) : (crt - dbt);
    return {
      jeId: je.id, date: je.date, source: je.source, sourceId: je.sourceId,
      description: line.description || je.description || '',
      thirdParty: line.thirdParty || null, costCenter: line.costCenter || null,
      debit: dbt, credit: crt, saldoCorrido: saldo
    };
  });
}

/**
 * agingByThirdParty(accountCodeOrPrefix, asOfDate, target)
 * Agrupa saldos por thirdParty.id en cuentas que matchean el prefix (ej: '130505').
 * Calcula edad desde je.date en buckets 0-30/31-60/61-90/90+.
 */
function agingByThirdParty(accountCodeOrPrefix, asOfDate, target) {
  const st = _S(target);
  const date = asOfDate || _todayStr();
  // determinar prefijo o code exacto
  const codeRegex = new RegExp('^' + String(accountCodeOrPrefix||'').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Aceptar lista de codes o regex match
  const map = new Map();
  function bucket(daysOld) {
    if (daysOld <= 30) return 'b030';
    if (daysOld <= 60) return 'b3160';
    if (daysOld <= 90) return 'b6190';
    return 'b90plus';
  }
  function dayDiff(a, b) {
    try {
      const dA = new Date(a), dB = new Date(b);
      return Math.floor((dB - dA) / (1000*60*60*24));
    } catch(e) { return 0; }
  }
  _iterAccountLines(st, { asOfDate:date }, (l, je) => {
    if (!codeRegex.test(l.accountCode||'')) return;
    const acc = _findAccount(l.accountCode, st); if (!acc) return;
    const tp = l.thirdParty || { id:'_anon', name:'(sin tercero)', doc:null };
    const tpId = tp.id || '_anon';
    const r = map.get(tpId) || { thirdPartyId:tpId, name:tp.name||'(sin nombre)', doc:tp.doc||null,
      saldoTotal:0, b030:0, b3160:0, b6190:0, b90plus:0 };
    const d = +l.debit||0, c = +l.credit||0;
    // signo del movimiento al saldo según naturaleza
    const delta = acc.nature==='debito' ? (d - c) : (c - d);
    r.saldoTotal += delta;
    const days = Math.max(0, dayDiff(je.date, date));
    const b = bucket(days);
    r[b] += delta;
    map.set(tpId, r);
  });
  return Array.from(map.values()).filter(r => Math.abs(r.saldoTotal) > 0.01)
    .sort((a,b) => Math.abs(b.saldoTotal) - Math.abs(a.saldoTotal));
}

/**
 * getSaldosPorClase(asOfDate, target) — totales por clase 1..7 a fecha.
 *
 * Suma con el signo natural de la CLASE (no de la cuenta), de modo que las cuentas
 * contra (como 240810 IVA descontable, naturaleza débito dentro de clase 2) reduzcan
 * el agregado de su clase. Esto preserva la ecuación contable:
 *    Activo = Pasivo + Patrimonio + Utilidad
 * con tolerancia de redondeo.
 */
function getSaldosPorClase(asOfDate, target) {
  const st = _S(target);
  const date = asOfDate || _todayStr();
  const totals = { '1':0, '2':0, '3':0, '4':0, '5':0, '6':0, '7':0 };
  // Por eficiencia: una sola pasada, acumulando en el code.
  // Reversado cuenta junto al reverso (suman a cero); excluir solo draft/cancelled.
  const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar');
  const balByCode = {};
  _iterAccountLines(st, { asOfDate:date, includeReversed:true }, (l) => {
    const o = balByCode[l.accountCode] || (balByCode[l.accountCode] = { d:0, c:0 });
    o.d += +l.debit||0; o.c += +l.credit||0;
  });
  // Naturaleza por clase: 1/5/6/7 = débito; 2/3/4 = crédito
  function classNature(cls) { return /^[1567]$/.test(cls) ? 'debito' : 'credito'; }
  accs.forEach(a => {
    const o = balByCode[a.code] || { d:0, c:0 };
    const cls = a.classCode;
    if (totals[cls] === undefined) return;
    const sign = classNature(cls) === 'debito' ? (o.d - o.c) : (o.c - o.d);
    totals[cls] += sign;
  });
  return totals;
}

/**
 * getUtilidadAcumulada(asOfDate, target) — clase 4 - (5+6+7) hasta fecha (inclusive).
 * (El parámetro `periodId` se acepta como alias: si llega un yyyy-mm, se usa último día del mes.)
 */
function getUtilidadAcumulada(periodOrDate, target) {
  let asOf = periodOrDate;
  if (typeof periodOrDate === 'string' && /^\d{4}-\d{2}$/.test(periodOrDate)) {
    // último día del mes
    const [y, m] = periodOrDate.split('-').map(n=>+n);
    const d = new Date(y, m, 0); // 0 día del mes siguiente = último del mes
    asOf = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  const t = getSaldosPorClase(asOf, target);
  return (t['4']||0) - ((t['5']||0) + (t['6']||0) + (t['7']||0));
}

/* ============================================================ REPORTES UI */

function _filtersBalancePrueba() {
  if (!window._fBalPru) window._fBalPru = { to: _todayStr() };
  return window._fBalPru;
}
window.setBalancePruebaFilter = function(k, v) {
  _filtersBalancePrueba()[k] = v;
  if (typeof renderPage==='function') renderPage();
};

function renderBalancePrueba() {
  const st = _S();
  const f = _filtersBalancePrueba();
  const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar').sort((a,b)=>a.code.localeCompare(b.code));
  // una sola pasada para acumulados
  const balByCode = {};
  _iterAccountLines(st, { asOfDate: f.to }, (l) => {
    const o = balByCode[l.accountCode] || (balByCode[l.accountCode] = { d:0, c:0 });
    o.d += +l.debit||0; o.c += +l.credit||0;
  });
  const rows = [];
  let totDb = 0, totCr = 0;
  accs.forEach(a => {
    const o = balByCode[a.code] || { d:0, c:0 };
    if (Math.abs(o.d) < 0.01 && Math.abs(o.c) < 0.01) return; // sin movimiento
    const saldo = a.nature==='debito' ? (o.d - o.c) : (o.c - o.d);
    if (Math.abs(saldo) < 0.01 && o.d === 0 && o.c === 0) return;
    rows.push({ acc: a, debit: o.d, credit: o.c, saldo });
    totDb += o.d; totCr += o.c;
  });
  // agrupar por clase
  const byClass = { '1':[], '2':[], '3':[], '4':[], '5':[], '6':[], '7':[] };
  rows.forEach(r => { if (byClass[r.acc.classCode]) byClass[r.acc.classCode].push(r); });
  const classNames = { '1':'ACTIVO', '2':'PASIVO', '3':'PATRIMONIO', '4':'INGRESOS',
                       '5':'GASTOS', '6':'COSTOS DE VENTAS', '7':'COSTOS DE PRODUCCIÓN' };

  function classRows(cls) {
    const arr = byClass[cls];
    if (!arr.length) return '';
    let sd = 0, sc = 0;
    arr.forEach(r => { sd += r.debit; sc += r.credit; });
    return `
      <tr class="bg-brand-panel-2"><td colspan="6" class="px-3 py-2 text-brand-gold font-semibold">${cls} · ${classNames[cls]||''}</td></tr>
      ${arr.map(r => `<tr class="table-row">
        <td class="px-3 py-1 font-mono text-brand-gold">${r.acc.code}</td>
        <td class="px-3 py-1">${_escape(r.acc.name)}</td>
        <td class="px-3 py-1 text-center text-xs">${r.acc.nature}</td>
        <td class="px-3 py-1 text-right text-emerald-300">${_fmtCOP(r.debit)}</td>
        <td class="px-3 py-1 text-right text-red-300">${_fmtCOP(r.credit)}</td>
        <td class="px-3 py-1 text-right font-semibold ${r.saldo>=0?'text-brand-gold':'text-red-400'}">${_fmtCOP(r.saldo)}</td>
      </tr>`).join('')}
      <tr class="border-t border-brand-border"><td colspan="3" class="px-3 py-1 text-right text-xs">Subtotal ${cls}</td>
        <td class="px-3 py-1 text-right">${_fmtCOP(sd)}</td>
        <td class="px-3 py-1 text-right">${_fmtCOP(sc)}</td>
        <td class="px-3 py-1 text-right font-semibold">${_fmtCOP(arr.reduce((a,r)=>a+r.saldo,0))}</td></tr>
    `;
  }

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Balance de prueba</h2>
        <p class="text-xs text-brand-muted">Cuentas con movimiento al ${_fmtDate(f.to)} · ${rows.length} cuentas</p>
      </div>
      <div class="flex gap-2 items-end">
        <div><label class="label">Hasta</label><input type="date" class="input-field text-xs" value="${f.to}" onchange="setBalancePruebaFilter('to',this.value)"></div>
        <button onclick="exportReporte('balance_prueba','csv')" class="btn-outline text-xs">📤 Exportar CSV</button>
      </div>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-xs">
      <thead class="text-brand-muted uppercase"><tr>
        <th class="px-3 py-2 text-left">Código</th>
        <th class="px-3 py-2 text-left">Nombre</th>
        <th class="px-3 py-2 text-center">Naturaleza</th>
        <th class="px-3 py-2 text-right">Débitos</th>
        <th class="px-3 py-2 text-right">Créditos</th>
        <th class="px-3 py-2 text-right">Saldo</th>
      </tr></thead>
      <tbody>
        ${rows.length===0?`<tr><td colspan="6" class="px-3 py-6 text-center text-brand-muted">Sin movimientos al corte.</td></tr>`:
          ['1','2','3','4','5','6','7'].map(classRows).join('')}
      </tbody>
      <tfoot class="font-semibold border-t-2 border-brand-gold">
        <tr>
          <td colspan="3" class="px-3 py-2 text-right">Totales</td>
          <td class="px-3 py-2 text-right text-emerald-400">${_fmtCOP(totDb)}</td>
          <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(totCr)}</td>
          <td class="px-3 py-2 text-right ${_eqMoney(totDb,totCr)?'text-brand-gold':'text-red-400'}">${_eqMoney(totDb,totCr)?'✓ cuadrado':'✗ DESBALANCEADO'}</td>
        </tr>
      </tfoot>
    </table></div>
  `;
}

/* -------------------------------------------------------- Balance General */
function _filtersBalanceGen() {
  if (!window._fBalGen) window._fBalGen = { to: _todayStr() };
  return window._fBalGen;
}
window.setBalanceGenFilter = function(k, v) {
  _filtersBalanceGen()[k] = v;
  if (typeof renderPage==='function') renderPage();
};

function renderBalanceGeneral() {
  const st = _S();
  const f = _filtersBalanceGen();
  const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && /^[123]/.test(a.code))
                .sort((a,b) => a.code.localeCompare(b.code));
  const utilidadEjercicio = getUtilidadAcumulada(f.to, st);
  // saldo por code
  const balByCode = {};
  _iterAccountLines(st, { asOfDate: f.to }, (l) => {
    const o = balByCode[l.accountCode] || (balByCode[l.accountCode] = { d:0, c:0 });
    o.d += +l.debit||0; o.c += +l.credit||0;
  });
  // Saldo por la naturaleza de la CLASE (no de la cuenta) — así las cuentas contra
  // (p. ej. 240810 IVA descontable, débito en clase 2) reducen el agregado de su clase
  // y el balance cuadra con la ecuación contable.
  function classNature(cls) { return /^[1567]$/.test(cls) ? 'debito' : 'credito'; }
  function saldoClassOf(a) {
    const o = balByCode[a.code] || { d:0, c:0 };
    return classNature(a.classCode)==='debito' ? (o.d - o.c) : (o.c - o.d);
  }
  // agrupar por subcuenta (4 dígitos, e.g. 1305)
  const groups = {};
  accs.forEach(a => {
    const s = saldoClassOf(a);
    if (Math.abs(s) < 0.01) return;
    const grp = a.code.slice(0,4);
    const g = groups[grp] || (groups[grp] = { code:grp, classCode:a.classCode, total:0, accounts:[] });
    g.accounts.push({ acc:a, saldo:s });
    g.total += s;
  });
  const grpsByClass = { '1':[], '2':[], '3':[] };
  Object.values(groups).forEach(g => { if (grpsByClass[g.classCode]) grpsByClass[g.classCode].push(g); });
  Object.values(grpsByClass).forEach(arr => arr.sort((a,b)=>a.code.localeCompare(b.code)));

  let totalActivo = 0, totalPasivo = 0, totalPatrimonio = 0;
  grpsByClass['1'].forEach(g => totalActivo += g.total);
  grpsByClass['2'].forEach(g => totalPasivo += g.total);
  grpsByClass['3'].forEach(g => totalPatrimonio += g.total);
  // Sumar utilidad del ejercicio al patrimonio
  totalPatrimonio += utilidadEjercicio;

  const cuadre = totalActivo - (totalPasivo + totalPatrimonio);
  const cuadrado = _eqMoney(cuadre, 0, 0.5);

  function renderGroup(g) {
    return `
      <tr class="bg-brand-panel-2 border-t border-brand-border">
        <td class="px-3 py-1 font-mono text-brand-gold">${g.code}</td>
        <td class="px-3 py-1 font-semibold" colspan="2">Grupo ${g.code}</td>
        <td class="px-3 py-1 text-right font-semibold">${_fmtCOP(g.total)}</td>
      </tr>
      ${g.accounts.map(({acc,saldo})=>`<tr>
        <td class="px-3 py-1 font-mono text-xs text-brand-muted pl-6">${acc.code}</td>
        <td class="px-3 py-1 text-xs" colspan="2">${_escape(acc.name)}</td>
        <td class="px-3 py-1 text-right text-xs">${_fmtCOP(saldo)}</td>
      </tr>`).join('')}
    `;
  }

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Balance General</h2>
        <p class="text-xs text-brand-muted">Estado de situación financiera al ${_fmtDate(f.to)}.</p>
      </div>
      <div class="flex gap-2 items-end">
        <div><label class="label">Hasta</label><input type="date" class="input-field text-xs" value="${f.to}" onchange="setBalanceGenFilter('to',this.value)"></div>
        <button onclick="exportReporte('balance_general','csv')" class="btn-outline text-xs">📤 Exportar CSV</button>
      </div>
    </div>
    ${cuadrado?'':`<div class="panel p-3 mb-3 border border-red-500 bg-red-900/30">
      <strong class="text-red-300">⚠ El balance no cuadra:</strong> Activo ${_fmtCOP(totalActivo)} ≠ Pasivo + Patrimonio ${_fmtCOP(totalPasivo+totalPatrimonio)} (diferencia ${_fmtCOP(cuadre)}).
    </div>`}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div class="panel overflow-hidden">
        <div class="px-3 py-2 border-b border-brand-border bg-brand-panel-2">
          <h3 class="text-sm font-semibold text-brand-gold">ACTIVO</h3>
        </div>
        <table class="w-full text-sm">
          <tbody>
            ${grpsByClass['1'].length===0?`<tr><td class="px-3 py-3 text-brand-muted text-center" colspan="4">Sin saldos.</td></tr>`:
              grpsByClass['1'].map(renderGroup).join('')}
          </tbody>
          <tfoot class="font-bold border-t-2 border-brand-gold">
            <tr><td colspan="3" class="px-3 py-2 text-right">TOTAL ACTIVO</td>
                <td class="px-3 py-2 text-right text-brand-gold">${_fmtCOP(totalActivo)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div class="panel overflow-hidden">
        <div class="px-3 py-2 border-b border-brand-border bg-brand-panel-2">
          <h3 class="text-sm font-semibold text-brand-gold">PASIVO + PATRIMONIO</h3>
        </div>
        <table class="w-full text-sm">
          <tbody>
            <tr class="bg-brand-panel-2"><td class="px-3 py-1 font-semibold text-amber-300" colspan="3">PASIVO</td><td></td></tr>
            ${grpsByClass['2'].length===0?`<tr><td class="px-3 py-2 text-brand-muted text-center" colspan="4">Sin saldos.</td></tr>`:
              grpsByClass['2'].map(renderGroup).join('')}
            <tr class="border-t-2 border-brand-border font-semibold"><td colspan="3" class="px-3 py-1 text-right">Total pasivo</td>
              <td class="px-3 py-1 text-right text-amber-300">${_fmtCOP(totalPasivo)}</td></tr>
            <tr class="bg-brand-panel-2"><td class="px-3 py-1 font-semibold text-emerald-300" colspan="3">PATRIMONIO</td><td></td></tr>
            ${grpsByClass['3'].length===0?`<tr><td class="px-3 py-1 text-brand-muted text-center pl-6" colspan="4">(Sin capital social registrado)</td></tr>`:
              grpsByClass['3'].map(renderGroup).join('')}
            <tr><td class="px-3 py-1 font-mono text-xs text-brand-muted pl-6">3605</td>
                <td class="px-3 py-1 text-xs italic" colspan="2">Utilidad del ejercicio (calculada)</td>
                <td class="px-3 py-1 text-right text-xs ${utilidadEjercicio>=0?'text-emerald-300':'text-red-300'}">${_fmtCOP(utilidadEjercicio)}</td></tr>
            <tr class="border-t-2 border-brand-border font-semibold"><td colspan="3" class="px-3 py-1 text-right">Total patrimonio</td>
              <td class="px-3 py-1 text-right text-emerald-300">${_fmtCOP(totalPatrimonio)}</td></tr>
          </tbody>
          <tfoot class="font-bold border-t-2 border-brand-gold">
            <tr><td colspan="3" class="px-3 py-2 text-right">TOTAL PASIVO + PATRIMONIO</td>
                <td class="px-3 py-2 text-right text-brand-gold">${_fmtCOP(totalPasivo+totalPatrimonio)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

/* ----------------------------------------------------- Estado de Resultados */
function _filtersPyG() {
  if (!window._fPyg) {
    const today = _todayStr();
    const ym = today.slice(0,7);
    window._fPyg = { from: ym + '-01', to: today };
  }
  return window._fPyg;
}
window.setPyGFilter = function(k, v) {
  _filtersPyG()[k] = v;
  if (typeof renderPage==='function') renderPage();
};

function renderPyG() {
  const st = _S();
  const f = _filtersPyG();
  const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && /^[4567]/.test(a.code))
                .sort((a,b)=>a.code.localeCompare(b.code));
  // saldo del rango (movimiento neto)
  const balByCode = {};
  _iterAccountLines(st, { from: f.from, to: f.to }, (l) => {
    const o = balByCode[l.accountCode] || (balByCode[l.accountCode] = { d:0, c:0 });
    o.d += +l.debit||0; o.c += +l.credit||0;
  });
  // Naturaleza por clase (no por cuenta) para que cuentas contra (devoluciones 4175*)
  // resten correctamente del agregado de ingresos.
  function classNatureP(cls) { return /^[1567]$/.test(cls) ? 'debito' : 'credito'; }
  function saldoOf(a) {
    const o = balByCode[a.code] || { d:0, c:0 };
    return classNatureP(a.classCode)==='debito' ? (o.d - o.c) : (o.c - o.d);
  }
  // agrupar por subcuenta (4 dígitos)
  const grps = { '4':{}, '5':{}, '6':{}, '7':{} };
  accs.forEach(a => {
    const s = saldoOf(a);
    if (Math.abs(s) < 0.01) return;
    const cls = a.classCode;
    const grp = a.code.slice(0,4);
    const g = grps[cls][grp] || (grps[cls][grp] = { code:grp, total:0, accounts:[] });
    g.accounts.push({ acc:a, saldo:s });
    g.total += s;
  });
  function totalCls(cls) {
    return Object.values(grps[cls]).reduce((a,g)=>a+g.total, 0);
  }
  const ingresos    = totalCls('4');
  const costosVta   = totalCls('6');
  const costosProd  = totalCls('7');
  const gastos      = totalCls('5');
  const utilidadBruta = ingresos - costosVta - costosProd;
  const utilidadOp   = utilidadBruta - gastos;
  const utilidadAntesImp = utilidadOp; // F5 simplificado

  function renderClass(cls, color) {
    const arr = Object.values(grps[cls]).sort((a,b)=>a.code.localeCompare(b.code));
    if (!arr.length) return `<tr><td colspan="3" class="px-3 py-2 text-brand-muted italic text-center">Sin movimientos.</td></tr>`;
    return arr.map(g => `
      <tr class="bg-brand-panel-2 border-t border-brand-border">
        <td class="px-3 py-1 font-mono text-brand-gold">${g.code}</td>
        <td class="px-3 py-1 font-semibold">Grupo ${g.code}</td>
        <td class="px-3 py-1 text-right font-semibold ${color}">${_fmtCOP(g.total)}</td>
      </tr>
      ${g.accounts.map(({acc,saldo})=>`<tr>
        <td class="px-3 py-1 font-mono text-xs text-brand-muted pl-6">${acc.code}</td>
        <td class="px-3 py-1 text-xs">${_escape(acc.name)}</td>
        <td class="px-3 py-1 text-right text-xs">${_fmtCOP(saldo)}</td>
      </tr>`).join('')}`
    ).join('');
  }

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Estado de resultados (P&G)</h2>
        <p class="text-xs text-brand-muted">Periodo ${_fmtDate(f.from)} – ${_fmtDate(f.to)}</p>
      </div>
      <div class="flex gap-2 items-end">
        <div><label class="label">Desde</label><input type="date" class="input-field text-xs" value="${f.from}" onchange="setPyGFilter('from',this.value)"></div>
        <div><label class="label">Hasta</label><input type="date" class="input-field text-xs" value="${f.to}" onchange="setPyGFilter('to',this.value)"></div>
        <button onclick="exportReporte('pyg','csv')" class="btn-outline text-xs">📤 Exportar CSV</button>
      </div>
    </div>
    <div class="panel overflow-hidden">
      <table class="w-full text-sm">
        <thead class="text-xs uppercase text-brand-muted">
          <tr><th class="px-3 py-2 text-left">Código</th><th class="px-3 py-2 text-left">Concepto</th><th class="px-3 py-2 text-right">Valor</th></tr>
        </thead>
        <tbody>
          <tr class="bg-brand-panel-2"><td class="px-3 py-2 font-bold text-emerald-400" colspan="3">INGRESOS OPERACIONALES (4)</td></tr>
          ${renderClass('4','text-emerald-300')}
          <tr class="border-t-2 border-brand-border font-semibold"><td colspan="2" class="px-3 py-2 text-right">Total ingresos</td>
            <td class="px-3 py-2 text-right text-emerald-400">${_fmtCOP(ingresos)}</td></tr>

          <tr class="bg-brand-panel-2"><td class="px-3 py-2 font-bold text-red-300" colspan="3">COSTOS DE VENTAS (6)</td></tr>
          ${renderClass('6','text-red-300')}
          <tr class="border-t border-brand-border font-semibold"><td colspan="2" class="px-3 py-2 text-right">Total costos venta</td>
            <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(costosVta)}</td></tr>

          <tr class="bg-brand-panel-2"><td class="px-3 py-2 font-bold text-red-300" colspan="3">COSTOS DE PRODUCCIÓN (7)</td></tr>
          ${renderClass('7','text-red-300')}
          <tr class="border-t border-brand-border font-semibold"><td colspan="2" class="px-3 py-2 text-right">Total costos producción</td>
            <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(costosProd)}</td></tr>

          <tr class="border-t-2 border-brand-border font-bold"><td colspan="2" class="px-3 py-2 text-right text-brand-gold">UTILIDAD BRUTA</td>
            <td class="px-3 py-2 text-right ${utilidadBruta>=0?'text-emerald-400':'text-red-400'}">${_fmtCOP(utilidadBruta)}</td></tr>

          <tr class="bg-brand-panel-2"><td class="px-3 py-2 font-bold text-amber-300" colspan="3">GASTOS OPERACIONALES (5)</td></tr>
          ${renderClass('5','text-amber-300')}
          <tr class="border-t border-brand-border font-semibold"><td colspan="2" class="px-3 py-2 text-right">Total gastos</td>
            <td class="px-3 py-2 text-right text-amber-300">${_fmtCOP(gastos)}</td></tr>
        </tbody>
        <tfoot class="font-bold border-t-4 border-brand-gold bg-brand-panel-2">
          <tr><td colspan="2" class="px-3 py-3 text-right text-brand-gold">UTILIDAD OPERACIONAL</td>
            <td class="px-3 py-3 text-right ${utilidadOp>=0?'text-emerald-400':'text-red-400'}">${_fmtCOP(utilidadOp)}</td></tr>
          <tr><td colspan="2" class="px-3 py-3 text-right text-brand-gold">UTILIDAD ANTES DE IMPUESTOS</td>
            <td class="px-3 py-3 text-right ${utilidadAntesImp>=0?'text-emerald-400':'text-red-400'}">${_fmtCOP(utilidadAntesImp)}</td></tr>
        </tfoot>
      </table>
    </div>
  `;
}

/* ------------------------------------------------- CARTERA (aging clientes) */
function _filtersCartera() {
  if (!window._fCartera) window._fCartera = { to: _todayStr(), search:'', bucket:'' };
  return window._fCartera;
}
window.setCarteraFilter = function(k, v) {
  _filtersCartera()[k] = v;
  if (typeof renderPage==='function') renderPage();
};

function renderCartera() {
  const st = _S();
  const f = _filtersCartera();
  let rows = agingByThirdParty('130505', f.to, st);
  if (f.search) {
    const q = f.search.toLowerCase();
    rows = rows.filter(r => (`${r.name||''} ${r.doc||''} ${r.thirdPartyId||''}`).toLowerCase().includes(q));
  }
  if (f.bucket) {
    rows = rows.filter(r => Math.abs(r[f.bucket]||0) > 0.01);
  }
  const tot = { saldo:0, b030:0, b3160:0, b6190:0, b90plus:0 };
  rows.forEach(r => { tot.saldo+=r.saldoTotal; tot.b030+=r.b030; tot.b3160+=r.b3160; tot.b6190+=r.b6190; tot.b90plus+=r.b90plus; });

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Cartera por antigüedad</h2>
        <p class="text-xs text-brand-muted">Saldos de 130505 al ${_fmtDate(f.to)} agrupados por cliente.</p>
      </div>
      <div class="flex gap-2 items-end">
        <div><label class="label">Hasta</label><input type="date" class="input-field text-xs" value="${f.to}" onchange="setCarteraFilter('to',this.value)"></div>
        <div><label class="label">Cliente</label><input class="input-field text-xs" value="${_escape(f.search||'')}" oninput="setCarteraFilter('search',this.value)" placeholder="Nombre o doc."></div>
        <div><label class="label">Bucket</label>
          <select class="input-field text-xs" onchange="setCarteraFilter('bucket',this.value)">
            <option value="" ${!f.bucket?'selected':''}>(todos)</option>
            <option value="b030" ${f.bucket==='b030'?'selected':''}>0-30</option>
            <option value="b3160" ${f.bucket==='b3160'?'selected':''}>31-60</option>
            <option value="b6190" ${f.bucket==='b6190'?'selected':''}>61-90</option>
            <option value="b90plus" ${f.bucket==='b90plus'?'selected':''}>90+</option>
          </select>
        </div>
        <button onclick="exportReporte('cartera','csv')" class="btn-outline text-xs">📤 Exportar CSV</button>
      </div>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted"><tr>
        <th class="px-3 py-2 text-left">Cliente</th>
        <th class="px-3 py-2 text-left">Doc.</th>
        <th class="px-3 py-2 text-right">Saldo total</th>
        <th class="px-3 py-2 text-right">0-30</th>
        <th class="px-3 py-2 text-right">31-60</th>
        <th class="px-3 py-2 text-right">61-90</th>
        <th class="px-3 py-2 text-right">90+</th>
      </tr></thead>
      <tbody>
        ${rows.length===0?`<tr><td colspan="7" class="px-3 py-6 text-center text-brand-muted">Sin saldos vencidos.</td></tr>`:
          rows.map(r=>`<tr class="table-row">
            <td class="px-3 py-2 text-white">${_escape(r.name||'(sin nombre)')}</td>
            <td class="px-3 py-2 font-mono text-xs text-brand-muted">${_escape(r.doc||'—')}</td>
            <td class="px-3 py-2 text-right font-semibold ${r.saldoTotal>=0?'text-brand-gold':'text-red-400'}">${_fmtCOP(r.saldoTotal)}</td>
            <td class="px-3 py-2 text-right text-emerald-300">${_fmtCOP(r.b030)}</td>
            <td class="px-3 py-2 text-right text-amber-300">${_fmtCOP(r.b3160)}</td>
            <td class="px-3 py-2 text-right text-orange-300">${_fmtCOP(r.b6190)}</td>
            <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(r.b90plus)}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot class="font-bold border-t-2 border-brand-gold">
        <tr><td colspan="2" class="px-3 py-2 text-right">Totales</td>
          <td class="px-3 py-2 text-right text-brand-gold">${_fmtCOP(tot.saldo)}</td>
          <td class="px-3 py-2 text-right text-emerald-400">${_fmtCOP(tot.b030)}</td>
          <td class="px-3 py-2 text-right text-amber-400">${_fmtCOP(tot.b3160)}</td>
          <td class="px-3 py-2 text-right text-orange-400">${_fmtCOP(tot.b6190)}</td>
          <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(tot.b90plus)}</td>
        </tr>
      </tfoot>
    </table></div>
  `;
}

/* ----------------------------------------------------- CUENTAS POR PAGAR */
function _filtersCxP() {
  if (!window._fCxp) window._fCxp = { to: _todayStr(), search:'', bucket:'' };
  return window._fCxp;
}
window.setCxPFilter = function(k, v) {
  _filtersCxP()[k] = v;
  if (typeof renderPage==='function') renderPage();
};

function renderCxP() {
  const st = _S();
  const f = _filtersCxP();
  // 220505 (proveedores nacionales) + 2335* (costos y gastos por pagar)
  const r1 = agingByThirdParty('220505', f.to, st);
  const r2 = agingByThirdParty('2335',   f.to, st);
  // merge por thirdPartyId
  const merged = new Map();
  function add(arr) {
    arr.forEach(r => {
      const key = r.thirdPartyId;
      const cur = merged.get(key) || { thirdPartyId:key, name:r.name, doc:r.doc,
        saldoTotal:0, b030:0, b3160:0, b6190:0, b90plus:0 };
      cur.saldoTotal += r.saldoTotal;
      cur.b030 += r.b030; cur.b3160 += r.b3160; cur.b6190 += r.b6190; cur.b90plus += r.b90plus;
      if (r.name && r.name !== '(sin nombre)') cur.name = r.name;
      if (r.doc) cur.doc = r.doc;
      merged.set(key, cur);
    });
  }
  add(r1); add(r2);
  let rows = Array.from(merged.values()).filter(r => Math.abs(r.saldoTotal) > 0.01);
  if (f.search) {
    const q = f.search.toLowerCase();
    rows = rows.filter(r => (`${r.name||''} ${r.doc||''} ${r.thirdPartyId||''}`).toLowerCase().includes(q));
  }
  if (f.bucket) rows = rows.filter(r => Math.abs(r[f.bucket]||0) > 0.01);
  rows.sort((a,b) => Math.abs(b.saldoTotal) - Math.abs(a.saldoTotal));

  const tot = { saldo:0, b030:0, b3160:0, b6190:0, b90plus:0 };
  rows.forEach(r => { tot.saldo+=r.saldoTotal; tot.b030+=r.b030; tot.b3160+=r.b3160; tot.b6190+=r.b6190; tot.b90plus+=r.b90plus; });

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Cuentas por pagar</h2>
        <p class="text-xs text-brand-muted">Saldos de 220505 + 2335* al ${_fmtDate(f.to)} agrupados por proveedor.</p>
      </div>
      <div class="flex gap-2 items-end">
        <div><label class="label">Hasta</label><input type="date" class="input-field text-xs" value="${f.to}" onchange="setCxPFilter('to',this.value)"></div>
        <div><label class="label">Proveedor</label><input class="input-field text-xs" value="${_escape(f.search||'')}" oninput="setCxPFilter('search',this.value)" placeholder="Nombre o NIT"></div>
        <div><label class="label">Bucket</label>
          <select class="input-field text-xs" onchange="setCxPFilter('bucket',this.value)">
            <option value="" ${!f.bucket?'selected':''}>(todos)</option>
            <option value="b030" ${f.bucket==='b030'?'selected':''}>0-30</option>
            <option value="b3160" ${f.bucket==='b3160'?'selected':''}>31-60</option>
            <option value="b6190" ${f.bucket==='b6190'?'selected':''}>61-90</option>
            <option value="b90plus" ${f.bucket==='b90plus'?'selected':''}>90+</option>
          </select>
        </div>
        <button onclick="exportReporte('cxp','csv')" class="btn-outline text-xs">📤 Exportar CSV</button>
      </div>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted"><tr>
        <th class="px-3 py-2 text-left">Proveedor</th>
        <th class="px-3 py-2 text-left">Doc.</th>
        <th class="px-3 py-2 text-right">Saldo total</th>
        <th class="px-3 py-2 text-right">0-30</th>
        <th class="px-3 py-2 text-right">31-60</th>
        <th class="px-3 py-2 text-right">61-90</th>
        <th class="px-3 py-2 text-right">90+</th>
      </tr></thead>
      <tbody>
        ${rows.length===0?`<tr><td colspan="7" class="px-3 py-6 text-center text-brand-muted">Sin saldos por pagar.</td></tr>`:
          rows.map(r=>`<tr class="table-row">
            <td class="px-3 py-2 text-white">${_escape(r.name||'(sin nombre)')}</td>
            <td class="px-3 py-2 font-mono text-xs text-brand-muted">${_escape(r.doc||'—')}</td>
            <td class="px-3 py-2 text-right font-semibold ${r.saldoTotal>=0?'text-amber-300':'text-emerald-300'}">${_fmtCOP(r.saldoTotal)}</td>
            <td class="px-3 py-2 text-right text-emerald-300">${_fmtCOP(r.b030)}</td>
            <td class="px-3 py-2 text-right text-amber-300">${_fmtCOP(r.b3160)}</td>
            <td class="px-3 py-2 text-right text-orange-300">${_fmtCOP(r.b6190)}</td>
            <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(r.b90plus)}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot class="font-bold border-t-2 border-brand-gold">
        <tr><td colspan="2" class="px-3 py-2 text-right">Totales</td>
          <td class="px-3 py-2 text-right text-amber-400">${_fmtCOP(tot.saldo)}</td>
          <td class="px-3 py-2 text-right text-emerald-400">${_fmtCOP(tot.b030)}</td>
          <td class="px-3 py-2 text-right text-amber-400">${_fmtCOP(tot.b3160)}</td>
          <td class="px-3 py-2 text-right text-orange-400">${_fmtCOP(tot.b6190)}</td>
          <td class="px-3 py-2 text-right text-red-400">${_fmtCOP(tot.b90plus)}</td>
        </tr>
      </tfoot>
    </table></div>
  `;
}

/* ============================================================ HUB EXPORTACIÓN
 * Vistas exportables (`view`) y formatos (`format`) soportados:
 *
 *   Vistas:
 *     - journal_entries        (libro diario completo, una fila por línea)
 *     - invoices               (facturas con desglose IVA/retenciones)
 *     - payments               (pagos cliente recibidos)
 *     - outgoing_payments      (pagos a proveedores)
 *     - aux_iva                (auxiliar IVA del periodo)
 *     - aux_retenciones        (auxiliar retenciones del periodo)
 *     - cartera                (aging de clientes)
 *     - cxp                    (aging de proveedores)
 *     - inventory_movements    (consumos / devoluciones MP)
 *     - payroll_runs           (corridas de nómina)
 *     - balance_general        (BG estructurado)
 *     - pyg                    (P&G estructurado)
 *     - balance_prueba         (BP por cuenta)
 *     - fixed_assets           (activos fijos)
 *
 *   Formatos:
 *     - csv          (UTF-8 BOM, delimitador `,`, separador decimal local es-CO)
 *     - json         (pretty-printed)
 *     - xlsx         (CSV-with-BOM marcado .xls — Excel reconoce; XLSX real
 *                     requiere lib externa que NO se incluye en F5)
 *     - siigo        (CSV pipe-delimitado, headers Siigo Cloud)
 *     - world_office (CSV pipe-delimitado, headers WO)
 *     - helisa       (CSV pipe-delimitado, headers Helisa Móvil)
 *     - contapyme    (CSV pipe-delimitado, headers Contapyme)
 *
 * Referencia (descripción interna, URLs ilustrativas):
 *   https://siigonube.siigo.com/help/import/journal_entries
 *   https://worldoffice.cloud/help/comprobantes/cargue
 *   https://helisaweb.com/integraciones/import-comprobantes
 *   https://contapyme.com/soporte/importacion-asientos
 */

function _fmtNumberCOP(n) {
  // formato es-CO: separador miles ".", decimal "," — para exportes pago humano-legible
  const x = +n || 0;
  return x.toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:2 });
}

function _csvEscape(v) {
  const s = (v == null) ? '' : String(v);
  if (/[,;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function _pipeEscape(v) {
  return (v == null) ? '' : String(v).replace(/[|\r\n]/g, ' ');
}

function _toCSV(rows, sep) {
  sep = sep || ',';
  return rows.map(r => r.map(_csvEscape).join(sep)).join('\r\n');
}
function _toPipe(rows) {
  return rows.map(r => r.map(_pipeEscape).join('|')).join('\r\n');
}

/**
 * _viewToRows(view, filters, target) — produce un array de filas (header + datos)
 * con los headers en español apropiados a cada vista.
 */
function _viewToRows(view, filters, target) {
  const st = _S(target);
  filters = filters || {};
  const periodId = filters.periodId || _yyyymm(_todayStr());
  const inPeriod = (date) => _yyyymm(date) === periodId;
  const fromTo = (date) => {
    if (filters.from && date < filters.from) return false;
    if (filters.to && date > filters.to) return false;
    return true;
  };

  switch (view) {
    case 'journal_entries': {
      const headers = ['JE','Fecha','Periodo','Origen','Documento','Línea','Cuenta','Cuenta nombre','Tercero','Tercero doc','Centro costo','Débito','Crédito','Descripción','Estado'];
      const rows = [headers];
      const lines = (st.journalLines||[]).slice().sort((a,b) => (a.journalId||'').localeCompare(b.journalId||'') || (a.lineNumber||0)-(b.lineNumber||0));
      lines.forEach(l => {
        const je = (st.journalEntries||[]).find(j => j.id === l.journalId);
        if (!je) return;
        if (filters.periodId && je.periodId !== filters.periodId) return;
        if (!filters.periodId && (filters.from || filters.to) && !fromTo(je.date)) return;
        const acc = _findAccount(l.accountCode, st);
        rows.push([
          je.id, je.date, je.periodId, je.source, je.sourceId,
          l.lineNumber, l.accountCode, acc?acc.name:'',
          l.thirdParty ? (l.thirdParty.name||'') : '',
          l.thirdParty ? (l.thirdParty.doc||'') : '',
          l.costCenter || '',
          _fmtNumberCOP(l.debit), _fmtNumberCOP(l.credit),
          l.description || '', je.status
        ]);
      });
      return rows;
    }
    case 'invoices': {
      const headers = ['ID','Tipo','Fecha','Cliente','NIT','Base','IVA','Total','Retenciones'];
      const rows = [headers];
      (st.invoices||[]).forEach(i => {
        const d = i.emitDate || i.issuedAt || '';
        if (filters.periodId && _yyyymm(d) !== filters.periodId) return;
        const tb = i.taxBreakdown || {};
        rows.push([i.id, i.type||'factura', d, i.clientName||'', i.nit||'', _fmtNumberCOP(tb.base||0),
          _fmtNumberCOP(tb.iva||0), _fmtNumberCOP(tb.total||i.amount||0),
          _fmtNumberCOP((tb.totalRetenciones||0))]);
      });
      return rows;
    }
    case 'payments': {
      const headers = ['ID','Fecha','Cliente','Banco','Monto','Estado','Factura'];
      const rows = [headers];
      (st.payments||[]).forEach(p => {
        if (filters.periodId && _yyyymm(p.date) !== filters.periodId) return;
        rows.push([p.id, p.date||'', p.payerName||p.customerName||'', p.bankId||'', _fmtNumberCOP(p.amount), p.estado||'', p.invoiceId||(p.orderIds||[]).join(';')]);
      });
      return rows;
    }
    case 'outgoing_payments': {
      const headers = ['ID','Fecha','Beneficiario','Concepto','Banco','Monto','Estado'];
      const rows = [headers];
      (st.outgoingPayments||[]).forEach(p => {
        if (filters.periodId && _yyyymm(p.date) !== filters.periodId) return;
        rows.push([p.id, p.date||'', p.beneficiario||'', p.concepto||'', p.bankId||'', _fmtNumberCOP(p.amount), p.estado||'']);
      });
      return rows;
    }
    case 'aux_iva': {
      // headers explícitos para auxiliar IVA: una fila por línea posted en 240805 (IVA generado)
      // o 240810 (IVA descontable). El campo `iva` es signado:
      //   - IVA generado (cta crédito 240805): signed = credit − debit (positivo = generado, negativo = devolución).
      //   - IVA descontable (cta débito 240810): signed = -(debit − credit) (negativo = descontable, resta del neto).
      // De este modo la suma de la columna `iva` = saldo(240805) − saldo(240810) (IVA neto a pagar).
      const headers = ['tipo','id_documento','tercero','base','iva','total','fecha'];
      const rows = [headers];
      _iterAccountLines(st, {}, (l, je) => {
        if (!/^2408(05|10)$/.test(l.accountCode||'')) return;
        if (filters.periodId && je.periodId !== filters.periodId) return;
        const tipo = l.accountCode === '240805' ? 'IVA_GENERADO' : 'IVA_DESCONTABLE';
        const dbt = +l.debit||0, crt = +l.credit||0;
        const ivaSigned = (l.accountCode === '240805') ? (crt - dbt) : -(dbt - crt);
        const ivaAbs = Math.abs(ivaSigned);
        const base = ivaAbs / 0.19; // asume IVA 19% para reconstruir base
        const total = base + ivaAbs;
        rows.push([
          tipo,
          je.sourceId || je.id,
          l.thirdParty?(l.thirdParty.name||''):'',
          _fmtNumberCOP(base),
          _fmtNumberCOP(ivaSigned),
          _fmtNumberCOP(total),
          je.date
        ]);
      });
      return rows;
    }
    case 'aux_retenciones': {
      const headers = ['JE','Fecha','Documento','Cuenta','Tercero','Doc','Débito','Crédito','Tipo'];
      const rows = [headers];
      _iterAccountLines(st, {}, (l, je) => {
        const code = l.accountCode||'';
        const isRetenc = /^(2365|2367|2368|13551[5-8])/.test(code);
        if (!isRetenc) return;
        if (filters.periodId && je.periodId !== filters.periodId) return;
        const tipo = /^2365/.test(code) ? 'RTF_PRACTICADA' :
                     /^236701/.test(code) ? 'RIVA_PRACTICADA' :
                     /^236801/.test(code) ? 'RICA_PRACTICADA' :
                     /^135515/.test(code) ? 'RTF_RECIBIDA' :
                     /^135517/.test(code) ? 'RIVA_RECIBIDA' :
                     /^135518/.test(code) ? 'RICA_RECIBIDA' : 'OTRA';
        rows.push([je.id, je.date, je.sourceId, code,
          l.thirdParty?(l.thirdParty.name||''):'',
          l.thirdParty?(l.thirdParty.doc||''):'',
          _fmtNumberCOP(l.debit), _fmtNumberCOP(l.credit), tipo]);
      });
      return rows;
    }
    case 'cartera': {
      const headers = ['Cliente','Doc','Saldo total','0-30','31-60','61-90','90+'];
      const rows = [headers];
      const arr = agingByThirdParty('130505', filters.to||null, st);
      arr.forEach(r => {
        rows.push([r.name||'', r.doc||'', _fmtNumberCOP(r.saldoTotal),
          _fmtNumberCOP(r.b030), _fmtNumberCOP(r.b3160),
          _fmtNumberCOP(r.b6190), _fmtNumberCOP(r.b90plus)]);
      });
      return rows;
    }
    case 'cxp': {
      const headers = ['Proveedor','Doc','Saldo total','0-30','31-60','61-90','90+'];
      const rows = [headers];
      const r1 = agingByThirdParty('220505', filters.to||null, st);
      const r2 = agingByThirdParty('2335', filters.to||null, st);
      const merged = new Map();
      [r1, r2].forEach(arr => arr.forEach(r => {
        const cur = merged.get(r.thirdPartyId) || { name:r.name, doc:r.doc, s:0, a:0, b:0, c:0, d:0 };
        cur.s += r.saldoTotal; cur.a += r.b030; cur.b += r.b3160; cur.c += r.b6190; cur.d += r.b90plus;
        if (r.doc) cur.doc = r.doc; if (r.name && r.name !== '(sin nombre)') cur.name = r.name;
        merged.set(r.thirdPartyId, cur);
      }));
      Array.from(merged.values()).filter(r => Math.abs(r.s) > 0.01).forEach(r => {
        rows.push([r.name||'', r.doc||'', _fmtNumberCOP(r.s),
          _fmtNumberCOP(r.a), _fmtNumberCOP(r.b),
          _fmtNumberCOP(r.c), _fmtNumberCOP(r.d)]);
      });
      return rows;
    }
    case 'inventory_movements': {
      const headers = ['ID','Fecha','Tipo','Insumo','Qty','Costo unit','Total'];
      const rows = [headers];
      (st.supplyIssues||[]).forEach(s => {
        if (filters.periodId && _yyyymm(s.date) !== filters.periodId) return;
        (s.items||[]).forEach(it => {
          const sup = (st.supplies||[]).find(x => x.id === it.supplyId) || {};
          rows.push([s.id, s.date||'', s.type||'salida', sup.name||it.supplyId||'',
            _fmtNumberCOP(it.qty), _fmtNumberCOP(sup.cost||0),
            _fmtNumberCOP((+it.qty||0)*(+sup.cost||0))]);
        });
      });
      return rows;
    }
    case 'payroll_runs': {
      const headers = ['Run','Periodo','Fecha','Empleados','Devengado','Deducciones','Neto','JE'];
      const rows = [headers];
      (st.payrollRuns||[]).forEach(r => {
        if (filters.periodId && r.periodId !== filters.periodId) return;
        const t = r.totals || {};
        rows.push([r.id, r.periodId, r.date||'', (r.employees||[]).length,
          _fmtNumberCOP(t.devengado||0), _fmtNumberCOP(t.deducciones||0),
          _fmtNumberCOP(t.neto||0), r.journalEntryId||'']);
      });
      return rows;
    }
    case 'balance_general': {
      const headers = ['Sección','Código','Cuenta','Saldo'];
      const rows = [headers];
      const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && /^[123]/.test(a.code))
                     .sort((a,b)=>a.code.localeCompare(b.code));
      const date = filters.to || _todayStr();
      let totA=0, totP=0, totPat=0;
      accs.forEach(a => {
        const s = getSaldoCuenta(a.code, date, st);
        if (Math.abs(s) < 0.01) return;
        const sec = a.classCode==='1'?'ACTIVO':a.classCode==='2'?'PASIVO':'PATRIMONIO';
        rows.push([sec, a.code, a.name, _fmtNumberCOP(s)]);
        if (a.classCode==='1') totA+=s;
        else if (a.classCode==='2') totP+=s;
        else if (a.classCode==='3') totPat+=s;
      });
      const utilidad = getUtilidadAcumulada(date, st);
      rows.push(['PATRIMONIO','3605','Utilidad del ejercicio (calculada)', _fmtNumberCOP(utilidad)]);
      rows.push(['','','TOTAL ACTIVO', _fmtNumberCOP(totA)]);
      rows.push(['','','TOTAL PASIVO+PATRIMONIO', _fmtNumberCOP(totP+totPat+utilidad)]);
      return rows;
    }
    case 'pyg': {
      const headers = ['Sección','Código','Cuenta','Movimiento'];
      const rows = [headers];
      const from = filters.from || (_yyyymm(_todayStr())+'-01');
      const to = filters.to || _todayStr();
      const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && /^[4567]/.test(a.code))
                     .sort((a,b)=>a.code.localeCompare(b.code));
      let ing=0, gas=0, cv=0, cp=0;
      accs.forEach(a => {
        const r = getSaldoCuentaRango(a.code, from, to, st);
        const m = r.saldoFinal - r.saldoInicial;
        if (Math.abs(m) < 0.01) return;
        const sec = a.classCode==='4'?'INGRESOS':a.classCode==='5'?'GASTOS':a.classCode==='6'?'COSTOS_VENTA':'COSTOS_PRODUCCION';
        rows.push([sec, a.code, a.name, _fmtNumberCOP(m)]);
        if (a.classCode==='4') ing+=m;
        else if (a.classCode==='5') gas+=m;
        else if (a.classCode==='6') cv+=m;
        else if (a.classCode==='7') cp+=m;
      });
      rows.push(['','','UTILIDAD BRUTA', _fmtNumberCOP(ing-cv-cp)]);
      rows.push(['','','UTILIDAD OPERACIONAL', _fmtNumberCOP(ing-cv-cp-gas)]);
      return rows;
    }
    case 'balance_prueba': {
      const headers = ['Código','Cuenta','Naturaleza','Débitos','Créditos','Saldo'];
      const rows = [headers];
      const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar').sort((a,b)=>a.code.localeCompare(b.code));
      const balByCode = {};
      const date = filters.to || _todayStr();
      _iterAccountLines(st, { asOfDate: date }, (l) => {
        const o = balByCode[l.accountCode] || (balByCode[l.accountCode] = { d:0, c:0 });
        o.d += +l.debit||0; o.c += +l.credit||0;
      });
      accs.forEach(a => {
        const o = balByCode[a.code] || { d:0, c:0 };
        if (Math.abs(o.d) < 0.01 && Math.abs(o.c) < 0.01) return;
        const s = a.nature==='debito' ? (o.d - o.c) : (o.c - o.d);
        rows.push([a.code, a.name, a.nature, _fmtNumberCOP(o.d), _fmtNumberCOP(o.c), _fmtNumberCOP(s)]);
      });
      return rows;
    }
    case 'fixed_assets': {
      const headers = ['ID','Nombre','Categoría','Costo','Vida(m)','Adquirido','Dep. acumulada','Estado'];
      const rows = [headers];
      (st.fixedAssets||[]).forEach(a => {
        rows.push([a.id, a.name, a.category||'', _fmtNumberCOP(a.cost||0),
          a.usefulLifeMonths||'', a.acquiredAt||'',
          _fmtNumberCOP(a.depAcumulada||0), a.estado||'']);
      });
      return rows;
    }
  }
  return [['(vista no implementada)']];
}

/**
 * exportToCSV(view, filters, target) — devuelve {filename, content, mime} listo para descarga.
 * Usa BOM UTF-8 (﻿) para que Excel abra correctamente con tildes.
 */
function exportToCSV(view, filters, target) {
  const rows = _viewToRows(view, filters || {}, target);
  const csv = '﻿' + _toCSV(rows, ',');
  const periodId = (filters && filters.periodId) || 'all';
  return { filename:`${view}_${periodId}.csv`, content:csv, mime:'text/csv;charset=utf-8' };
}
function exportToJSON(view, filters, target) {
  const rows = _viewToRows(view, filters || {}, target);
  if (rows.length < 1) return { filename:`${view}.json`, content:'[]', mime:'application/json' };
  const headers = rows[0];
  const data = rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i]; });
    return o;
  });
  const periodId = (filters && filters.periodId) || 'all';
  return { filename:`${view}_${periodId}.json`, content: JSON.stringify(data, null, 2), mime:'application/json' };
}
function exportToXLSX(view, filters, target) {
  // Sin lib externa: CSV con BOM UTF-8 marcado .csv (Excel lo abre limpio en columnas con coma).
  const rows = _viewToRows(view, filters || {}, target);
  // Para Excel se prefiere ; en es-CO
  const csv = '﻿' + _toCSV(rows, ';');
  const periodId = (filters && filters.periodId) || 'all';
  return { filename:`${view}_${periodId}.xls.csv`, content:csv, mime:'application/vnd.ms-excel' };
}

/**
 * exportSiigoFormat — solo journal_entries.
 * Headers Siigo Cloud (separador `;` para Excel-CO):
 *   Tipo;Fecha;Prefijo;Documento;Sucursal;NitTercero;CuentaPUC;Detalle;Debito;Credito;CentroCosto
 * Una fila por journalLine. Acepta firma legacy `exportSiigoFormat(view, periodId)` y
 * la firma alternativa `exportSiigoFormat(periodId)`.
 */
function exportSiigoFormat(viewOrPeriod, periodIdMaybe, target) {
  // Soportar la firma `exportSiigoFormat(periodId, target)` además de
  // `exportSiigoFormat(view, periodId, target)`.
  let periodId;
  if (periodIdMaybe == null && typeof viewOrPeriod === 'string' && /^\d{4}-\d{2}$/.test(viewOrPeriod)) {
    periodId = viewOrPeriod;
  } else {
    periodId = periodIdMaybe;
  }
  const st = _S(target);
  const rows = [['Tipo','Fecha','Prefijo','Documento','Sucursal','NitTercero','CuentaPUC','Detalle','Debito','Credito','CentroCosto']];
  const lines = (st.journalLines||[]).slice().sort((a,b) => (a.journalId||'').localeCompare(b.journalId||'') || (a.lineNumber||0) - (b.lineNumber||0));
  lines.forEach(l => {
    const je = (st.journalEntries||[]).find(j => j.id === l.journalId);
    if (!je || je.status !== 'posted') return;
    if (periodId && je.periodId !== periodId) return;
    const sourceId = je.sourceId || '';
    const dashIdx = sourceId.indexOf('-');
    const prefijo = dashIdx > 0 ? sourceId.slice(0, dashIdx) : (je.source||'').slice(0,3).toUpperCase();
    const documento = dashIdx > 0 ? sourceId.slice(dashIdx+1) : sourceId;
    rows.push([
      (je.source||'CMP').toUpperCase().slice(0,4),
      je.date,
      prefijo,
      documento,
      'PRINCIPAL',
      l.thirdParty ? (l.thirdParty.doc||'') : '',
      l.accountCode,
      (l.description||je.description||'').slice(0, 80),
      _fmtNumberCOP(l.debit),
      _fmtNumberCOP(l.credit),
      l.costCenter || ''
    ]);
  });
  return { filename:`siigo_${periodId||'all'}.csv`, content: _toCSV(rows, ';'), mime:'text/csv;charset=utf-8' };
}

/**
 * exportWorldOfficeFormat — headers WO: Tipo|Numero|Fecha|Cuenta|NIT|CC|Detalle|Debe|Haber
 */
function exportWorldOfficeFormat(view, periodId, target) {
  const st = _S(target);
  const rows = [['Tipo','Numero','Fecha','Cuenta','NIT','CC','Detalle','Debe','Haber']];
  const lines = (st.journalLines||[]).slice().sort((a,b) => (a.journalId||'').localeCompare(b.journalId||''));
  lines.forEach(l => {
    const je = (st.journalEntries||[]).find(j => j.id === l.journalId);
    if (!je || je.status !== 'posted') return;
    if (periodId && je.periodId !== periodId) return;
    rows.push([
      (je.source||'').toUpperCase().slice(0,3) || 'CMP',
      je.id, je.date, l.accountCode,
      l.thirdParty ? (l.thirdParty.doc||'') : '',
      l.costCenter || '',
      (l.description||je.description||'').slice(0, 80),
      _fmtNumberCOP(l.debit), _fmtNumberCOP(l.credit)
    ]);
  });
  return { filename:`world_office_${periodId||'all'}.csv`, content: _toPipe(rows), mime:'text/csv;charset=utf-8' };
}

/**
 * exportHelisaFormat — headers Helisa: Comprobante|Documento|Fecha|Cuenta|Tercero|Centro|Descripcion|Debito|Credito|Base
 */
function exportHelisaFormat(view, periodId, target) {
  const st = _S(target);
  const rows = [['Comprobante','Documento','Fecha','Cuenta','Tercero','Centro','Descripcion','Debito','Credito','Base']];
  const lines = (st.journalLines||[]).slice().sort((a,b) => (a.journalId||'').localeCompare(b.journalId||''));
  lines.forEach(l => {
    const je = (st.journalEntries||[]).find(j => j.id === l.journalId);
    if (!je || je.status !== 'posted') return;
    if (periodId && je.periodId !== periodId) return;
    const base = (+l.debit||0) + (+l.credit||0);
    rows.push([
      je.id, je.sourceId||'', je.date, l.accountCode,
      l.thirdParty ? (l.thirdParty.doc||l.thirdParty.id||'') : '',
      l.costCenter || '',
      (l.description||je.description||'').slice(0, 80),
      _fmtNumberCOP(l.debit), _fmtNumberCOP(l.credit), _fmtNumberCOP(base)
    ]);
  });
  return { filename:`helisa_${periodId||'all'}.csv`, content: _toPipe(rows), mime:'text/csv;charset=utf-8' };
}

/**
 * exportContapymeFormat — headers Contapyme: Tipo|NumeroDoc|Fecha|Codigo|TerceroNIT|CC|Concepto|Debito|Credito
 */
function exportContapymeFormat(view, periodId, target) {
  const st = _S(target);
  const rows = [['Tipo','NumeroDoc','Fecha','Codigo','TerceroNIT','CC','Concepto','Debito','Credito']];
  const lines = (st.journalLines||[]).slice().sort((a,b) => (a.journalId||'').localeCompare(b.journalId||''));
  lines.forEach(l => {
    const je = (st.journalEntries||[]).find(j => j.id === l.journalId);
    if (!je || je.status !== 'posted') return;
    if (periodId && je.periodId !== periodId) return;
    rows.push([
      (je.source||'CMP').toUpperCase().slice(0,4),
      je.sourceId || je.id, je.date, l.accountCode,
      l.thirdParty ? (l.thirdParty.doc||'') : '',
      l.costCenter || '',
      (l.description||je.description||'').slice(0, 80),
      _fmtNumberCOP(l.debit), _fmtNumberCOP(l.credit)
    ]);
  });
  return { filename:`contapyme_${periodId||'all'}.csv`, content: _toPipe(rows), mime:'text/csv;charset=utf-8' };
}

/**
 * exportSupabaseSQL(target) — bundle completo del state contable como SQL.
 * Genera INSERT idempotentes para las 13 tablas + 2 vistas del schema Supabase.
 * Equivale al script `_migrate_to_supabase.js` pero corre desde el motor.
 * Pre-requisito: el destino debe tener `supabase_schema.sql` aplicado primero.
 */
function exportSupabaseSQL(target) {
  const st = _S(target);
  const sqlEsc = (v) => {
    if (v == null) return 'null';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (v instanceof Date) return `'${v.toISOString()}'`;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    return `'${String(v).replace(/'/g, "''")}'`;
  };
  const row = (cols, obj) => '(' + cols.map(c => sqlEsc(obj[c])).join(', ') + ')';
  const bulk = (table, cols, rows, opts) => {
    if (!rows || !rows.length) return `-- ${table}: sin datos\n`;
    const o = opts || {};
    const conflict = o.conflictKey || cols[0];
    const action = o.conflictAction || 'do nothing';
    return `insert into ${table} (${cols.join(', ')}) values\n  ` +
           rows.map(r => row(cols, r)).join(',\n  ') +
           `\non conflict (${conflict}) ${action};\n\n`;
  };
  const out = [];
  out.push('-- ============================================================');
  out.push('-- Castor · bundle SQL Supabase generado desde el motor');
  out.push(`-- Fecha: ${_nowISO()}`);
  out.push('-- Pre-requisito: aplicar primero supabase_schema.sql');
  out.push('-- ============================================================');
  out.push('begin;\n');

  // 1. PUC accounts (orden topológico)
  const accs = (st.pucAccounts || []).slice().sort((a,b) => a.code.length - b.code.length);
  out.push('-- PUC accounts');
  out.push(bulk('puc_accounts',
    ['code','level','parent_code','name','class_code','nature','type','active','system','requires_third_party','requires_cost_center','tax_related'],
    accs.map(a => ({
      code:a.code, level:a.level, parent_code:a.parentCode||null, name:a.name,
      class_code:a.classCode, nature:a.nature, type:a.type,
      active:a.active!==false, system:!!a.system,
      requires_third_party:!!a.requiresThirdParty, requires_cost_center:!!a.requiresCostCenter,
      tax_related:a.taxRelated||null
    })),
    { conflictKey:'code', conflictAction:'do update set name=excluded.name, active=excluded.active' }));

  // 2. Mappings (flatten)
  const mapRows = [];
  Object.entries(st.accountingMappings || {}).forEach(([category, keys]) => {
    if (!keys || typeof keys !== 'object') return;
    Object.entries(keys).forEach(([key, code]) => {
      if (typeof code === 'string') mapRows.push({ category, key, account_code:code });
    });
  });
  out.push('-- Accounting mappings');
  out.push(bulk('accounting_mappings', ['category','key','account_code'], mapRows,
    { conflictKey:'category, key', conflictAction:'do update set account_code=excluded.account_code' }));

  // 3. Tax rules
  out.push('-- Tax rules');
  out.push(bulk('tax_rules',
    ['id','type','name','rate','account_generated','account_descontable','account','base_uvt','concept_code','applies_to_remision','applies_over','is_default','active'],
    (st.taxRules||[]).map(r => ({
      id:r.id, type:r.type, name:r.name, rate:+r.rate||0,
      account_generated:r.account_generated||null, account_descontable:r.account_descontable||null,
      account:r.account||null, base_uvt:r.baseUVT||0, concept_code:r.conceptCode||null,
      applies_to_remision:!!r.appliesToRemision, applies_over:r.appliesOver||null,
      is_default:!!r.isDefault, active:r.active!==false
    })),
    { conflictKey:'id', conflictAction:'do update set rate=excluded.rate, active=excluded.active' }));

  // 4. Doc numbering
  out.push('-- Doc numbering');
  out.push(bulk('doc_numbering',
    ['kind','prefix','range_from','range_to','current_number','active','description'],
    (st.docNumbering||[]).map(d => ({
      kind:d.kind, prefix:d.prefix, range_from:d.rangeFrom||1, range_to:d.rangeTo||9999,
      current_number:d.currentNumber||0, active:d.active!==false, description:d.description||null
    })),
    { conflictKey:'kind', conflictAction:'do update set current_number=greatest(doc_numbering.current_number, excluded.current_number)' }));

  // 5. Cost centers
  out.push('-- Cost centers');
  out.push(bulk('cost_centers', ['id','code','name','active'],
    (st.costCenters||[]).map(c => ({ id:c.id, code:c.code, name:c.name, active:c.active!==false }))));

  // 6. Fiscal periods (sin closing_journal_entry_id)
  out.push('-- Fiscal periods');
  out.push(bulk('fiscal_periods',
    ['id','year','month','status','closed_at','closed_by','reopened_at','reopened_by'],
    (st.fiscalPeriods||[]).map(p => ({
      id:p.id, year:p.year, month:p.month, status:p.status,
      closed_at:p.closedAt||null, closed_by:p.closedBy||null,
      reopened_at:p.reopenedAt||null, reopened_by:p.reopenedBy||null
    })),
    { conflictKey:'id', conflictAction:'do update set status=excluded.status, closed_at=excluded.closed_at' }));

  // 7. Journal entries
  out.push('-- Journal entries');
  out.push(bulk('journal_entries',
    ['id','date','source','source_id','description','period_id','currency','status','reverses','reversed_by','reversed_at','reversed_reason','total_debit','total_credit','created_at','created_by','posted_at','posted_by'],
    (st.journalEntries||[]).map(j => ({
      id:j.id, date:j.date, source:j.source, source_id:j.sourceId||null,
      description:j.description||null, period_id:j.periodId||null,
      currency:j.currency||'COP', status:j.status||'posted',
      reverses:j.reverses||null, reversed_by:j.reversedBy||null,
      reversed_at:j.reversedAt||null, reversed_reason:j.reversedReason||null,
      total_debit:+j.totalDebit||0, total_credit:+j.totalCredit||0,
      created_at:j.createdAt||null, created_by:j.createdBy||null,
      posted_at:j.postedAt||null, posted_by:j.postedBy||null
    })),
    { conflictKey:'id' }));

  // 8. Link fiscal periods to closing JEs (después de JEs por dependencia)
  const linked = (st.fiscalPeriods||[]).filter(p => p.closingJournalEntryId);
  if (linked.length) {
    out.push('-- Link fiscal periods to closing JEs');
    linked.forEach(p => {
      out.push(`update fiscal_periods set closing_journal_entry_id=${sqlEsc(p.closingJournalEntryId)} where id=${sqlEsc(p.id)};`);
    });
    out.push('');
  }

  // 9. Journal lines
  out.push('-- Journal lines');
  out.push(bulk('journal_lines',
    ['id','journal_id','account_code','debit','credit','third_party_type','third_party_id','third_party_name','third_party_doc','cost_center','description','source_link_module','source_link_id'],
    (st.journalLines||[]).map(l => ({
      id:l.id, journal_id:l.journalId, account_code:l.accountCode,
      debit:+l.debit||0, credit:+l.credit||0,
      third_party_type:l.thirdParty?.type||null, third_party_id:l.thirdParty?.id||null,
      third_party_name:l.thirdParty?.name||null, third_party_doc:l.thirdParty?.doc||null,
      cost_center:l.costCenter||null, description:l.description||null,
      source_link_module:l.sourceLink?.module||null, source_link_id:l.sourceLink?.id||null
    })),
    { conflictKey:'id' }));

  // 10. Fixed assets
  out.push('-- Fixed assets');
  out.push(bulk('fixed_assets',
    ['id','name','category','account_code','cost','salvage_value','acquired_at','useful_life_months','usage','dep_acumulada','estado','baja_at','baja_reason'],
    (st.fixedAssets||[]).map(a => ({
      id:a.id, name:a.name, category:a.category||null, account_code:a.accountCode||null,
      cost:+a.cost||0, salvage_value:+a.salvageValue||0, acquired_at:a.acquiredAt||null,
      useful_life_months:a.usefulLifeMonths||12, usage:a.usage||'admin',
      dep_acumulada:+a.depAcumulada||0, estado:a.estado||'activo',
      baja_at:a.bajaAt||null, baja_reason:a.bajaReason||null
    }))));

  // 11. Depreciation runs
  out.push('-- Depreciation runs');
  out.push(bulk('depreciation_runs',
    ['id','period_id','run_at','assets','totals','journal_entry_id','created_by'],
    (st.depreciationRuns||[]).map(r => ({
      id:r.id, period_id:r.periodId||null, run_at:r.runAt||null,
      assets:r.assets||[], totals:r.totals||null,
      journal_entry_id:r.journalEntryId||null, created_by:r.createdBy||null
    }))));

  // 12. Payroll runs
  out.push('-- Payroll runs');
  out.push(bulk('payroll_runs',
    ['id','period_id','run_at','employees','totals','journal_entry_id','created_by'],
    (st.payrollRuns||[]).map(r => ({
      id:r.id, period_id:r.periodId||null, run_at:r.runAt||null,
      employees:r.employees||[], totals:r.totals||null,
      journal_entry_id:r.journalEntryId||null, created_by:r.createdBy||null
    }))));

  // 13. Notas crédito
  out.push('-- Notas crédito');
  out.push(bulk('notas_credito',
    ['id','nc_number','invoice_id','motivo','fecha','monto','base','iva','items','is_total','journal_entry_id','cogs_reversal_journal_entry_id','created_by','created_at'],
    (st.notasCredito||[]).map(n => ({
      id:n.id, nc_number:n.ncNumber, invoice_id:n.invoiceId||null,
      motivo:n.motivo||'', fecha:n.fecha, monto:+n.monto||0,
      base:+n.base||0, iva:+n.iva||0, items:n.items||[],
      is_total:!!n.isTotal, journal_entry_id:n.journalEntryId||null,
      cogs_reversal_journal_entry_id:n.cogsReversalJournalEntryId||null,
      created_by:n.createdBy||null, created_at:n.createdAt||null
    }))));

  // 14. Notas débito
  out.push('-- Notas débito');
  out.push(bulk('notas_debito',
    ['id','nd_number','invoice_id','motivo','fecha','monto','base','iva','items','journal_entry_id','created_by','created_at'],
    (st.notasDebito||[]).map(n => ({
      id:n.id, nd_number:n.ndNumber, invoice_id:n.invoiceId||null,
      motivo:n.motivo||'', fecha:n.fecha, monto:+n.monto||0,
      base:+n.base||0, iva:+n.iva||0, items:n.items||[],
      journal_entry_id:n.journalEntryId||null,
      created_by:n.createdBy||null, created_at:n.createdAt||null
    }))));

  // 15. Company tax profile
  if (st.companyTaxProfile) {
    out.push('-- Company tax profile');
    const ctp = st.companyTaxProfile;
    out.push(bulk('company_tax_profile',
      ['id','nit','razon_social','responsable_iva','periodicidad_iva','regimen_tributario','responsable_ica','ciudad_ica','tarifa_ica_por_mil','autoretenedor','uvt_vigente','payroll_params'],
      [{
        id:1, nit:ctp.nit||null, razon_social:ctp.razonSocial||null,
        responsable_iva:!!ctp.responsableIVA, periodicidad_iva:ctp.periodicidadIVA||'bimestral',
        regimen_tributario:ctp.regimenTributario||'ordinario',
        responsable_ica:!!ctp.responsableICA, ciudad_ica:ctp.ciudadICA||null,
        tarifa_ica_por_mil:+ctp.tarifaICAporMil||9.66,
        autoretenedor:!!ctp.autoretenedor, uvt_vigente:ctp.uvtVigente||49799,
        payroll_params:ctp.payrollParams||null
      }],
      { conflictKey:'id', conflictAction:'do update set updated_at=now()' }));
  }

  out.push('commit;\n');
  out.push('-- ============================================================');
  out.push('-- RESUMEN');
  out.push(`-- puc_accounts:        ${(st.pucAccounts||[]).length}`);
  out.push(`-- accounting_mappings: ${mapRows.length}`);
  out.push(`-- tax_rules:           ${(st.taxRules||[]).length}`);
  out.push(`-- journal_entries:     ${(st.journalEntries||[]).length}`);
  out.push(`-- journal_lines:       ${(st.journalLines||[]).length}`);
  out.push(`-- payroll_runs:        ${(st.payrollRuns||[]).length}`);
  out.push(`-- depreciation_runs:   ${(st.depreciationRuns||[]).length}`);
  out.push('-- ============================================================');

  return {
    filename: `castor_supabase_${_todayStr()}.sql`,
    content: out.join('\n'),
    mime: 'application/sql;charset=utf-8'
  };
}

/**
 * _downloadFile(filename, content, mime) — helper de descarga (browser-only).
 * En Node los polyfills dejan esto en no-op silencioso (no lo invocan los tests).
 */
function _downloadFile(filename, content, mime) {
  try {
    if (typeof Blob !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL) {
      // Entorno Node — sin descarga
      return false;
    }
    const blob = new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    if (a.setAttribute) a.setAttribute('download', filename);
    a.download = filename;
    a.click();
    if (URL.revokeObjectURL) URL.revokeObjectURL(url);
    return true;
  } catch(e) { return false; }
}

window.exportReporte = function(view, format, filters) {
  filters = filters || {};
  let res;
  switch (format) {
    case 'json':         res = exportToJSON(view, filters); break;
    case 'xlsx':         res = exportToXLSX(view, filters); break;
    case 'siigo':        res = exportSiigoFormat(view, filters.periodId); break;
    case 'world_office': res = exportWorldOfficeFormat(view, filters.periodId); break;
    case 'helisa':       res = exportHelisaFormat(view, filters.periodId); break;
    case 'contapyme':    res = exportContapymeFormat(view, filters.periodId); break;
    case 'supabase_sql': res = exportSupabaseSQL(); break; // bundle completo, ignora view/filters
    case 'csv':
    default:             res = exportToCSV(view, filters); break;
  }
  if (_downloadFile(res.filename, res.content, res.mime)) {
    _toast(`Exportado ${res.filename}`, 'ok');
  } else {
    _toast(`Export ${res.filename} no disponible en este entorno`, 'warn');
  }
  return res;
};

/* -------------------------------------------------------- HUB DE EXPORTACIÓN */
function _hubFilters() {
  if (!window._fHub) window._fHub = { periodId: _yyyymm(_todayStr()) };
  return window._fHub;
}
window.setHubPeriod = function(p) { _hubFilters().periodId = p; if (typeof renderPage==='function') renderPage(); };

function renderExportHub() {
  const st = _S();
  const f = _hubFilters();
  const periods = (st.fiscalPeriods||[]).map(p => p.id).sort().reverse();

  // Cards: nombre, view-id, has-period (true/false), fmts soportados
  const cards = [
    { name:'Libro Diario',           view:'journal_entries',   period:true,  fmts:['csv','json','xlsx','siigo','world_office','helisa','contapyme'] },
    { name:'Asientos por periodo',   view:'journal_entries',   period:true,  fmts:['csv','json','xlsx'] },
    { name:'Facturas + IVA',         view:'invoices',          period:true,  fmts:['csv','json','xlsx'] },
    { name:'Pagos recibidos',        view:'payments',          period:true,  fmts:['csv','json','xlsx'] },
    { name:'Pagos a proveedores',    view:'outgoing_payments', period:true,  fmts:['csv','json','xlsx'] },
    { name:'Aux IVA del periodo',    view:'aux_iva',           period:true,  fmts:['csv','json','xlsx'] },
    { name:'Aux Retenciones',        view:'aux_retenciones',   period:true,  fmts:['csv','json','xlsx'] },
    { name:'Cartera (aging)',        view:'cartera',           period:false, fmts:['csv','json','xlsx'] },
    { name:'CxP (aging)',            view:'cxp',               period:false, fmts:['csv','json','xlsx'] },
    { name:'Movs. inventario',       view:'inventory_movements', period:true, fmts:['csv','json','xlsx'] },
    { name:'Nóminas',                view:'payroll_runs',      period:true,  fmts:['csv','json','xlsx'] },
    { name:'Balance General',        view:'balance_general',   period:false, fmts:['csv','json','xlsx'] },
    { name:'P&G',                    view:'pyg',               period:false, fmts:['csv','json','xlsx'] },
    { name:'Balance de prueba',      view:'balance_prueba',    period:false, fmts:['csv','json','xlsx'] },
    { name:'Activos fijos',          view:'fixed_assets',      period:false, fmts:['csv','json','xlsx'] }
  ];

  function btnFmt(view, fmt, period) {
    const labels = { csv:'CSV', json:'JSON', xlsx:'Excel',
                     siigo:'Siigo', world_office:'World Office', helisa:'Helisa', contapyme:'Contapyme',
                     supabase_sql:'SQL Supabase' };
    const filtersStr = period ? `{periodId:'${f.periodId}'}` : `{}`;
    return `<button onclick="exportReporte('${view}','${fmt}', ${filtersStr})"
      class="btn-outline text-[11px] px-2 py-1">${labels[fmt]||fmt}</button>`;
  }

  return `
    <div class="mb-3 flex justify-between items-start">
      <div>
        <h2 class="font-bold gold-title text-lg">Hub de Exportación</h2>
        <p class="text-xs text-brand-muted">Descarga la data contable en CSV/JSON/Excel y formatos específicos de Siigo, World Office, Helisa y Contapyme.</p>
        <p class="text-[10px] text-amber-300 mt-1">Importante: la facturación oficial DIAN se hace en el sistema externo destino. Esta exportación solo alimenta esos sistemas.</p>
      </div>
      <div class="flex gap-2 items-end">
        <div><label class="label">Periodo</label>
          <select class="input-field text-xs" onchange="setHubPeriod(this.value)">
            ${periods.map(p=>`<option value="${p}" ${f.periodId===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="panel p-4 mb-4 border border-brand-gold/40" style="background:linear-gradient(135deg,#152943 0%,#1a3a5c 100%);">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-sm font-semibold text-brand-gold">📦 Bundle Supabase SQL</h3>
        <span class="text-[9px] text-emerald-300">snapshot completo</span>
      </div>
      <p class="text-[11px] text-brand-cream mb-2">Descarga un archivo SQL único con todas las tablas contables (PUC, mappings, asientos, líneas, nóminas, depreciaciones, NCs, NDs, perfil tributario). Idempotente — listo para pegar en Supabase SQL Editor después de aplicar el schema.</p>
      ${btnFmt('bundle','supabase_sql', false)}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      ${cards.map(c => `
        <div class="panel p-4">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-sm font-semibold text-brand-gold">${_escape(c.name)}</h3>
            ${c.period ? `<span class="text-[9px] text-brand-muted">${f.periodId}</span>` : `<span class="text-[9px] text-emerald-300">a fecha</span>`}
          </div>
          <p class="text-[10px] text-brand-muted mb-2">view: <code class="text-brand-gold">${c.view}</code></p>
          <div class="flex flex-wrap gap-1">
            ${c.fmts.map(fmt => btnFmt(c.view, fmt, c.period)).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="panel p-3 mt-4 text-[11px] text-brand-muted">
      <strong class="text-brand-gold">Notas técnicas:</strong> Excel (XLSX) se entrega como CSV con BOM UTF-8 y separador <code>;</code> para abrir limpiamente en Office es-CO. Los formatos Siigo/WO/Helisa/Contapyme son <strong>pipe-delimitados</strong>. La numeración interna de documentos y el cálculo de IVA/retenciones siguen las reglas del PUC colombiano (Decreto 2650/1993).
    </div>
  `;
}

/* ========================================================================
 *                              FASE 6
 *   Cierres mensuales + notas crédito/débito + libros PDF internos
 * ====================================================================== */

/* ---------- helpers periodo ---------- */
function _findPeriod(periodId, target) {
  const st = _S(target);
  return (st.fiscalPeriods||[]).find(p => p.id === periodId) || null;
}
function _periodAfter(periodId, target) {
  const st = _S(target);
  const m = String(periodId||'').match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  let y = +m[1], mm = +m[2] + 1;
  if (mm > 12) { mm = 1; y++; }
  const next = `${y}-${String(mm).padStart(2,'0')}`;
  return (st.fiscalPeriods||[]).find(p => p.id === next) || null;
}
function _userCanClose(target) {
  const st = _S(target);
  // Si state no tiene currentUser → modo dev → asumimos 'gerencia'.
  const role = st.currentUser && st.currentUser.role;
  if (!role) return true; // dev mode
  return role === 'gerencia' || role === 'contabilidad';
}
function _userCanReopen(target) {
  const st = _S(target);
  const role = st.currentUser && st.currentUser.role;
  if (!role) return true; // dev mode
  return role === 'gerencia';
}
function _userName(target) {
  const st = _S(target);
  return (st.currentUser && st.currentUser.name) || 'Sistema';
}

/* ---------- closePeriod ---------- */
/**
 * closePeriod(periodId, target)
 * Genera un único asiento de cierre que traslada los saldos de las cuentas
 * auxiliares de las clases 4, 5, 6 y 7 contra 360505.
 *
 * Idempotente: si ya existe un JE 'closing' con sourceId=periodId activo
 * (status='posted'), retorna { warning:'already_closed' }.
 *
 * Requiere:
 *   - Periodo abierto.
 *   - currentUser.role ∈ ['gerencia','contabilidad'] (o sin currentUser → dev mode).
 *   - Todos los asientos del periodo en status='posted' (ningún 'draft').
 */
function closePeriod(periodId, target) {
  const st = _S(target);
  const period = _findPeriod(periodId, st);
  if (!period) return { error:'period_not_found' };
  if (period.status !== 'abierto') return { error:'period_not_open' };
  if (!_userCanClose(st)) return { error:'forbidden', message:'Rol no autorizado para cierre' };

  // Idempotencia
  const existing = (st.journalEntries||[]).find(j =>
    j.source==='closing' && j.sourceId===periodId && j.status==='posted');
  if (existing) return { warning:'already_closed', journalId: existing.id };

  // Verificar que no hay asientos draft del periodo
  const drafts = (st.journalEntries||[]).filter(j => j.periodId === periodId && j.status === 'draft');
  if (drafts.length > 0) {
    return { error:'pending_drafts', message:`Periodo ${periodId} tiene ${drafts.length} asiento(s) en borrador.` };
  }

  // Recorrer cuentas auxiliares de las clases 4-7 con saldo distinto de cero
  const accs = (st.pucAccounts||[]).filter(a =>
    a.type === 'auxiliar' &&
    a.classCode &&
    /^[4567]$/.test(String(a.classCode))
  );

  // Calcular fecha de cierre: último día del mes
  const m = String(periodId).match(/^(\d{4})-(\d{2})$/);
  let closingDate = _todayStr();
  if (m) {
    const y = +m[1], mo = +m[2];
    const lastDay = new Date(y, mo, 0).getDate();
    closingDate = `${y}-${String(mo).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  }

  const lines = [];
  let totIngresos = 0, totEgresos = 0;
  for (const a of accs) {
    // saldo de la cuenta hasta closingDate (incluye el periodo a cerrar).
    // Excluir asientos previos de cierre/reverso del propio periodo no aplica aquí
    // porque si ya hubo cierre activo se devolvió warning arriba.
    let d = 0, c = 0;
    // Convención contable: incluir reversados + reversas (suman cero), igual que
    // getSaldoCuenta. Si excluimos solo los reversados se queda la cara del
    // reverso sin contraparte y el saldo queda inflado.
    _iterAccountLines(st, { code:a.code, asOfDate:closingDate, includeReversed:true }, (l) => {
      d += +l.debit||0; c += +l.credit||0;
    });
    // saldo según naturaleza
    const saldo = (a.nature === 'debito') ? (d - c) : (c - d);
    if (Math.abs(saldo) < 0.5) continue;
    // Asientos de cierre son agregados; no aplica un tercero específico.
    const closingTp = { type:'other', id:'CIERRE', name:'Cierre de periodo' };
    if (a.nature === 'debito') {
      // Cuenta de gasto/costo — saldo deudor → CR cuenta, DB 360505 (saldo abnormal: invierte)
      const absSaldo_d = Math.abs(saldo);
      if (saldo > 0) {
        lines.push({ accountCode: a.code, debit: 0, credit: _round(absSaldo_d), thirdParty: closingTp, description: `Cierre ${periodId} · ${a.name}` });
      } else {
        lines.push({ accountCode: a.code, debit: _round(absSaldo_d), credit: 0, thirdParty: closingTp, description: `Cierre ${periodId} · ${a.name} (saldo abnormal)` });
      }
      totEgresos += saldo;
    } else {
      // Cuenta de ingreso — saldo acreedor → DB cuenta, CR 360505 (saldo abnormal: invierte)
      const absSaldo_c = Math.abs(saldo);
      if (saldo > 0) {
        lines.push({ accountCode: a.code, debit: _round(absSaldo_c), credit: 0, thirdParty: closingTp, description: `Cierre ${periodId} · ${a.name}` });
      } else {
        lines.push({ accountCode: a.code, debit: 0, credit: _round(absSaldo_c), thirdParty: closingTp, description: `Cierre ${periodId} · ${a.name} (saldo abnormal)` });
      }
      totIngresos += saldo;
    }
  }

  // utilidad = ingresos − egresos (puede ser positiva o negativa)
  const utilidad = _round(totIngresos - totEgresos);

  if (lines.length === 0 || Math.abs(utilidad) < 0.5) {
    // Sin movimiento real: marcamos cerrado sin JE
    period.status = 'cerrado';
    period.closedAt = _nowISO();
    period.closedBy = _userName(st);
    period.closingJournalEntryId = null;
    _save(st);
    return { ok:true, journalEntryId:null, utilidad: 0, empty:true };
  }

  // Línea balanceadora 360505
  if (utilidad >= 0) {
    // utilidad positiva → CR 360505
    lines.push({ accountCode:'360505', debit:0, credit: _round(utilidad), description:`Utilidad del ejercicio · ${periodId}` });
  } else {
    // pérdida → DB 360505
    lines.push({ accountCode:'360505', debit: _round(-utilidad), credit:0, description:`Pérdida del ejercicio · ${periodId}` });
  }

  const res = postJournalEntry({
    date: closingDate,
    source: 'closing',
    sourceId: periodId,
    description: `Cierre periodo ${periodId}`,
    lines
  }, st);
  if (res.error) return res;

  // Marcar periodo cerrado
  period.status = 'cerrado';
  period.closedAt = _nowISO();
  period.closedBy = _userName(st);
  period.closingJournalEntryId = res.journalId;
  delete period.reopenedAt;
  delete period.reopenedBy;

  _save(st);
  return { ok:true, journalEntryId: res.journalId, utilidad };
}

/* ---------- reopenPeriod ---------- */
/**
 * reopenPeriod(periodId, target)
 * Reversa el JE de cierre (closingJournalEntryId), reabre el periodo.
 * Solo permitido si no hay un periodo posterior cerrado.
 * Permisos: solo 'gerencia'.
 */
function reopenPeriod(periodId, target) {
  const st = _S(target);
  const period = _findPeriod(periodId, st);
  if (!period) return { error:'period_not_found' };
  if (period.status !== 'cerrado') return { error:'period_not_closed' };
  if (!_userCanReopen(st)) return { error:'forbidden', message:'Solo gerencia puede reabrir periodos' };

  // Verificar que no hay periodo posterior cerrado
  const next = _periodAfter(periodId, st);
  if (next && next.status === 'cerrado') {
    return { error:'next_period_closed', message:`Reabra primero ${next.id} antes de ${periodId}` };
  }

  let revJeId = null;
  if (period.closingJournalEntryId) {
    const rev = reverseJournalEntry(period.closingJournalEntryId, `Reapertura periodo ${periodId}`, st);
    if (rev.error) return rev;
    revJeId = rev.journalId;
  }

  period.status = 'abierto';
  period.reopenedAt = _nowISO();
  period.reopenedBy = _userName(st);
  delete period.closedAt;
  delete period.closedBy;
  delete period.closingJournalEntryId;

  _save(st);
  return { ok:true, reversalJournalEntryId: revJeId };
}

/* ---------- closeFiscalYear ---------- */
/**
 * closeFiscalYear(year, target) — Bonus: cierra los 12 periodos del año
 * y traslada el saldo de 360505 a 370505 (utilidades acumuladas).
 */
function closeFiscalYear(year, target) {
  const st = _S(target);
  const yyyy = +year;
  if (!yyyy) return { error:'invalid_year' };
  if (!_userCanClose(st)) return { error:'forbidden' };

  const periods = (st.fiscalPeriods||[]).filter(p => p.year === yyyy);
  if (periods.length === 0) return { error:'no_periods_for_year' };

  // Idempotencia para el cierre anual
  const existing = (st.journalEntries||[]).find(j =>
    j.source==='fiscal_year_close' && j.sourceId===String(yyyy) && j.status==='posted');
  if (existing) return { warning:'already_closed_year', journalId: existing.id };

  const closedIds = [];
  for (const p of periods) {
    if (p.status === 'abierto') {
      const r = closePeriod(p.id, st);
      if (r.error) return { error:'period_close_failed', detail:r };
      if (r.journalEntryId) closedIds.push(r.journalEntryId);
    }
  }

  // saldo 360505 a fin de año
  const lastDay = `${yyyy}-12-31`;
  const saldo360505 = getSaldoCuenta('360505', lastDay, st); // debito - credito; cuenta es naturaleza crédito → ya invierte
  // 360505 es naturaleza crédito, getSaldoCuenta retorna (credit-debit); positivo = utilidad
  if (Math.abs(saldo360505) < 0.5) {
    return { ok:true, year: yyyy, periodsClosed: closedIds, journalEntryId:null, message:'Sin saldo a trasladar' };
  }

  let lines;
  if (saldo360505 > 0) {
    // utilidad: DB 360505 / CR 370505
    lines = [
      { accountCode:'360505', debit: _round(saldo360505), credit:0, description:`Cierre fiscal ${yyyy} · traslado utilidad` },
      { accountCode:'370505', debit: 0, credit: _round(saldo360505), description:`Utilidades acumuladas ${yyyy}` }
    ];
  } else {
    // pérdida: DB 370505 / CR 360505
    lines = [
      { accountCode:'370505', debit: _round(-saldo360505), credit:0, description:`Pérdida fiscal ${yyyy} · traslado` },
      { accountCode:'360505', debit:0, credit: _round(-saldo360505), description:`Cancelación pérdida ${yyyy}` }
    ];
  }
  const res = postJournalEntry({
    date: lastDay,
    source: 'fiscal_year_close',
    sourceId: String(yyyy),
    description: `Cierre ejercicio fiscal ${yyyy}`,
    lines,
    force: true
  }, st);
  if (res.error) return res;

  _save(st);
  return { ok:true, year:yyyy, periodsClosed:closedIds, journalEntryId: res.journalId, utilidad: saldo360505 };
}

/* ============================================================ NOTAS CRÉDITO/DÉBITO */

/**
 * emitNotaCredito(invoiceId, motivo, items, target)
 * - items: [] → NC total. Si parcial: array {productId, qty, amount}.
 *
 * DECISIÓN: si la factura está en periodo cerrado, la NC se contabiliza en el
 * periodo abierto vigente más reciente (no rompe cierres pasados).
 */
function emitNotaCredito(invoiceId, motivo, items, target) {
  const st = _S(target);
  if (!invoiceId) return { error:'no_invoiceId' };
  if (!motivo || !String(motivo).trim()) return { error:'missing_motivo', message:'Motivo es requerido' };

  const invoice = (st.invoices||[]).find(x => x.id === invoiceId);
  if (!invoice) return { error:'invoice_not_found' };
  const validStates = ['emitida','pagada','vencida','pendiente'];
  if (invoice.estado && !validStates.includes(invoice.estado)) {
    // Permitimos también cuando no hay estado (algunos seeds no lo definen)
    return { error:'invoice_state_invalid', message:`Estado ${invoice.estado} no admite NC` };
  }

  // Asignar número NC
  const num = nextDocNumber('NC', st);
  if (num.error) return num;

  // Calcular monto y desglose IVA
  const totalInvoice = +(invoice.total != null ? invoice.total : invoice.amount) || 0;
  if (totalInvoice <= 0) return { error:'invoice_zero' };

  let monto;
  const itemList = Array.isArray(items) ? items : [];
  const isTotal = itemList.length === 0;
  if (isTotal) {
    monto = totalInvoice;
  } else {
    monto = itemList.reduce((a, it) => a + (+(it && it.amount)||0), 0);
    if (monto <= 0) return { error:'items_zero' };
    if (monto > totalInvoice + 0.5) return { error:'amount_exceeds_invoice', message:`Monto NC ${monto} excede factura ${totalInvoice}` };
  }

  // Idempotencia: ¿ya existe una NC con este ncNumber?
  const dup = findJournalBySource('nota_credito', num.id, st);
  if (dup) return { warning:'already_posted', journalId: dup.id };

  // Resolver fecha y periodo. Si el periodo de la factura está cerrado, usar hoy
  const map = st.accountingMappings || seedAccountingMappings();
  const ncMap = map.nota_credito || { sales_returns:'417505', iva_generated:'240805', receivable:'130505' };
  const cust = (st.customers||[]).find(c => c.id === invoice.customerId) || null;
  const tp = cust ? { type:'customer', id:cust.id, name:cust.name||invoice.clientName||'', doc:cust.doc||null }
                  : { type:'customer', id:invoice.customerId||null, name:invoice.clientName||'', doc:invoice.nit||null };

  // ¿la factura tenía IVA? Resolver regla
  const ivaRule = _resolveIvaRule(invoice, st);
  const rate = ivaRule ? (+ivaRule.rate || 0) : 0;

  // calcular base/IVA proporcional al monto NC sobre el total
  const ratio = monto / totalInvoice;
  let base, iva;
  if (rate > 0) {
    // factura con IVA inclusive → base = monto/(1+rate)
    base = _round(monto / (1 + rate));
    iva  = _round(monto - base);
  } else {
    base = _round(monto);
    iva = 0;
  }

  // Construir líneas del JE de NC
  const ncLines = [];
  ncLines.push({ accountCode: ncMap.sales_returns, debit: base, credit: 0, thirdParty: tp,
    description:`NC ${num.id} · Devolución venta ${invoice.id}`, costCenter: invoice.costCenter || null });
  if (iva > 0) {
    const ivaAccount = (ivaRule && ivaRule.account_generated) || ncMap.iva_generated;
    ncLines.push({ accountCode: ivaAccount, debit: iva, credit: 0,
      description:`NC ${num.id} · Reverso IVA ${ivaRule?ivaRule.id:''}` });
  }
  ncLines.push({ accountCode: ncMap.receivable, debit:0, credit: _round(monto), thirdParty: tp,
    description:`NC ${num.id} · Crédito a ${tp.name}` });

  // Determinar fecha del JE: si el periodo de la factura está cerrado, usar hoy.
  let jeDate = invoice.emitDate || invoice.issuedAt || _todayStr();
  const invPeriod = _periodForDate(jeDate, st);
  if (invPeriod && invPeriod.status === 'cerrado') {
    jeDate = _todayStr();
  }

  const ncRes = postJournalEntry({
    date: jeDate,
    source: 'nota_credito',
    sourceId: num.id,
    description: `Nota crédito ${num.id} · ${motivo}`,
    lines: ncLines
  }, st);
  if (ncRes.error) return ncRes;

  // Reverso parcial COGS si la factura tenía COGS asociado
  let cogsRevId = null;
  const orderId = invoice.orderId || (Array.isArray(invoice.orderIds) ? invoice.orderIds[0] : null);
  if (orderId) {
    const cogsJE = findJournalBySource('cogs', orderId, st);
    if (cogsJE) {
      const cogsLines = (st.journalLines||[]).filter(l => l.journalId === cogsJE.id);
      // Calcular costo original total (suma del débito del COGS)
      let originalCogs = 0;
      cogsLines.forEach(l => { if (+l.debit > 0) originalCogs += +l.debit; });
      const revCogsAmount = _round(originalCogs * ratio);
      if (revCogsAmount > 0.5) {
        const cogsMap = map.cogs_on_invoice || { cogs:'612035', finished_goods:'143005' };
        const revRes = postJournalEntry({
          date: jeDate,
          source: 'nota_credito_cogs',
          sourceId: num.id,
          description: `Reverso COGS por NC ${num.id}`,
          lines: [
            { accountCode: cogsMap.finished_goods, debit: revCogsAmount, credit:0, description:`Reingreso PT por NC ${num.id}` },
            { accountCode: cogsMap.cogs,           debit:0, credit: revCogsAmount, description:`Reverso COGS por NC ${num.id}` }
          ]
        }, st);
        if (!revRes.error) cogsRevId = revRes.journalId;
      }
    }
  }

  // Registrar la NC en state.notasCredito
  if (!Array.isArray(st.notasCredito)) st.notasCredito = [];
  const ncRecord = {
    id: num.id,
    ncNumber: num.id,
    invoiceId: invoice.id,
    motivo: String(motivo),
    fecha: jeDate,
    monto: _round(monto),
    base: _round(base),
    iva: _round(iva),
    items: itemList,
    isTotal,
    journalEntryId: ncRes.journalId,
    cogsReversalJournalEntryId: cogsRevId,
    createdBy: _userName(st),
    createdAt: _nowISO()
  };
  st.notasCredito.unshift(ncRecord);

  // Actualizar la factura
  if (isTotal) {
    invoice.estado = 'anulada';
    invoice.anuladaPor = num.id;
  } else {
    invoice.notasCredito = invoice.notasCredito || [];
    invoice.notasCredito.push({ ncId: num.id, monto: _round(monto), fecha: jeDate });
  }

  _save(st);
  return { ok:true, ncNumber: num.id, journalEntryId: ncRes.journalId, cogsReversalJournalEntryId: cogsRevId, monto:_round(monto), record: ncRecord };
}

/**
 * emitNotaDebito(invoiceId, motivo, items, target)
 * Genera DB 130505 / CR 412035 + CR 240805 (incremento al cobro).
 * Source: 'nota_debito'.
 */
function emitNotaDebito(invoiceId, motivo, items, target) {
  const st = _S(target);
  if (!invoiceId) return { error:'no_invoiceId' };
  if (!motivo || !String(motivo).trim()) return { error:'missing_motivo' };
  const invoice = (st.invoices||[]).find(x => x.id === invoiceId);
  if (!invoice) return { error:'invoice_not_found' };

  const num = nextDocNumber('ND', st);
  if (num.error) return num;

  const itemList = Array.isArray(items) ? items : [];
  let monto;
  if (itemList.length === 0) {
    monto = +(invoice.total != null ? invoice.total : invoice.amount) || 0;
  } else {
    monto = itemList.reduce((a, it) => a + (+(it && it.amount)||0), 0);
  }
  if (monto <= 0) return { error:'amount_zero' };

  const dup = findJournalBySource('nota_debito', num.id, st);
  if (dup) return { warning:'already_posted', journalId: dup.id };

  const map = st.accountingMappings || seedAccountingMappings();
  const m = map.sale_invoice || { receivable:'130505', revenue:'412035', iva_generated:'240805' };

  const cust = (st.customers||[]).find(c => c.id === invoice.customerId) || null;
  const tp = cust ? { type:'customer', id:cust.id, name:cust.name||invoice.clientName||'' }
                  : { type:'customer', id:invoice.customerId||null, name:invoice.clientName||'' };
  const ivaRule = _resolveIvaRule(invoice, st);
  const rate = ivaRule ? (+ivaRule.rate||0) : 0;
  let base, iva;
  if (rate > 0) {
    base = _round(monto / (1 + rate));
    iva  = _round(monto - base);
  } else { base = _round(monto); iva = 0; }

  const lines = [];
  lines.push({ accountCode: m.receivable, debit: _round(monto), credit:0, thirdParty: tp,
    description:`ND ${num.id} · Cargo a ${tp.name}` });
  lines.push({ accountCode: m.revenue, debit:0, credit: base, thirdParty: tp,
    description:`ND ${num.id} · Mayor venta ${invoice.id}`, costCenter: invoice.costCenter || null });
  if (iva > 0) {
    const ivaAccount = (ivaRule && ivaRule.account_generated) || m.iva_generated;
    lines.push({ accountCode: ivaAccount, debit:0, credit: iva,
      description:`ND ${num.id} · IVA ${ivaRule?ivaRule.id:''}` });
  }

  let jeDate = invoice.emitDate || invoice.issuedAt || _todayStr();
  const invPeriod = _periodForDate(jeDate, st);
  if (invPeriod && invPeriod.status === 'cerrado') jeDate = _todayStr();

  const res = postJournalEntry({
    date: jeDate,
    source: 'nota_debito',
    sourceId: num.id,
    description: `Nota débito ${num.id} · ${motivo}`,
    lines
  }, st);
  if (res.error) return res;

  if (!Array.isArray(st.notasDebito)) st.notasDebito = [];
  st.notasDebito.unshift({
    id:num.id, ndNumber:num.id, invoiceId:invoice.id, motivo:String(motivo),
    fecha:jeDate, monto:_round(monto), base:_round(base), iva:_round(iva),
    items:itemList, journalEntryId:res.journalId, createdBy:_userName(st), createdAt:_nowISO()
  });

  _save(st);
  return { ok:true, ndNumber:num.id, journalEntryId:res.journalId, monto:_round(monto) };
}

/* ============================================================ RENDER PERIODOS */
function renderConfigPeriodos() {
  const st = _S();
  const periods = (st.fiscalPeriods||[]).slice().sort((a,b) => (a.id||'').localeCompare(b.id||''));
  const canClose  = _userCanClose(st);
  const canReopen = _userCanReopen(st);
  const yearsSet = new Set(periods.map(p => p.year));
  const years = Array.from(yearsSet).sort();

  // Calcular utilidad por periodo (saldo de 360505 acumulado al final del periodo)
  // Más simple: si el periodo está cerrado y tiene closingJournalEntryId, computar desde el JE.
  function utilidadDelPeriodo(p) {
    if (!p.closingJournalEntryId) return null;
    // saldo de 360505 generado por el JE de cierre
    const lines = (st.journalLines||[]).filter(l => l.journalId === p.closingJournalEntryId && l.accountCode === '360505');
    if (lines.length === 0) return 0;
    let d=0,c=0; lines.forEach(l => { d += +l.debit||0; c += +l.credit||0; });
    return c - d; // 360505 es naturaleza crédito → utilidad si CR>DB
  }
  function rowFor(p) {
    const util = utilidadDelPeriodo(p);
    const utilHtml = util==null ? '<span class="text-brand-muted">—</span>'
      : util >= 0 ? `<span class="text-emerald-400">${_fmtCOP(util)}</span>`
                  : `<span class="text-red-400">${_fmtCOP(util)}</span>`;
    const statusBadge = p.status==='cerrado'
      ? `<span class="badge-danger px-2 py-0.5 rounded text-[11px]">CERRADO</span>`
      : `<span class="badge-ok px-2 py-0.5 rounded text-[11px]">ABIERTO</span>`;
    const monthName = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][p.month||0] || '—';
    let actions = '';
    if (p.status === 'abierto' && canClose) {
      actions += `<button onclick="onClosePeriodConfirm('${p.id}')" class="btn-outline text-xs">Cerrar mes</button>`;
    }
    if (p.status === 'cerrado' && canReopen) {
      actions += `<button onclick="onReopenPeriodConfirm('${p.id}')" class="btn-outline text-xs text-amber-300">Reabrir</button>`;
    }
    actions += ` <button onclick="onLibroPDF('balances','${p.id}')" class="btn-outline text-xs" title="Balances PDF">📄 Balances</button>`;
    actions += ` <button onclick="onLibroPDF('diario','${p.id}')" class="btn-outline text-xs" title="Libro Diario PDF">📒 Diario</button>`;
    return `<tr class="table-row">
      <td class="px-3 py-2 font-mono text-xs text-brand-gold">${_escape(p.id)}</td>
      <td class="px-3 py-2 text-xs text-white">${monthName}</td>
      <td class="px-3 py-2 text-xs text-brand-muted">${p.year||''}</td>
      <td class="px-3 py-2 text-center">${statusBadge}</td>
      <td class="px-3 py-2 text-xs text-brand-muted">${p.closedAt?_fmtDate(p.closedAt):'—'}</td>
      <td class="px-3 py-2 text-xs text-white">${_escape(p.closedBy||'—')}</td>
      <td class="px-3 py-2 text-right text-xs">${utilHtml}</td>
      <td class="px-3 py-2">${actions}</td>
    </tr>`;
  }

  const yearButtons = years.map(y => {
    const allClosed = periods.filter(p => p.year === y).every(p => p.status === 'cerrado');
    if (!allClosed || !canClose) return '';
    return `<button onclick="onCloseFiscalYear(${y})" class="btn-gold text-xs">Cerrar año fiscal ${y}</button>`;
  }).filter(Boolean).join(' ');

  return `
    <div class="flex justify-between items-center mb-3">
      <div>
        <h2 class="font-bold gold-title text-lg">Periodos contables</h2>
        <p class="text-xs text-brand-muted">${periods.length} periodos · cierre mensual contra 360505 · reapertura solo gerencia</p>
      </div>
      <div class="flex gap-2">${yearButtons}</div>
    </div>
    <div class="panel overflow-hidden mb-4"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted">
        <tr>
          <th class="px-3 py-2 text-left">ID</th>
          <th class="px-3 py-2 text-left">Mes</th>
          <th class="px-3 py-2 text-left">Año</th>
          <th class="px-3 py-2 text-center">Status</th>
          <th class="px-3 py-2 text-left">Cierre</th>
          <th class="px-3 py-2 text-left">Cerrado por</th>
          <th class="px-3 py-2 text-right">Utilidad</th>
          <th class="px-3 py-2 text-left">Acciones</th>
        </tr>
      </thead>
      <tbody>${periods.map(rowFor).join('')}</tbody>
    </table></div>
    <div class="panel p-3 text-[11px] text-brand-muted">
      <strong class="text-brand-gold">Notas:</strong> El cierre mensual genera un asiento que traslada el saldo de las cuentas de las clases 4, 5, 6 y 7 a la cuenta <code>360505</code> (resultado del ejercicio). Una vez cerrado, no se admiten nuevos asientos en ese periodo. La reapertura reversa el asiento de cierre. El cierre de año fiscal traslada <code>360505</code> a <code>370505</code> (utilidades acumuladas).
    </div>
  `;
}

/* ---------- handlers UI ---------- */
window.onClosePeriodConfirm = function(periodId) {
  const st = _S();
  const period = (st.fiscalPeriods||[]).find(p => p.id === periodId);
  if (!period) { _toast('Periodo no encontrado','error'); return; }
  // Preview: contar JE del periodo y suma de movimiento clase 4-7
  const accs = (st.pucAccounts||[]).filter(a => a.type==='auxiliar' && /^[4567]$/.test(String(a.classCode)));
  let totIngresos=0, totEgresos=0;
  accs.forEach(a => {
    const s = _saldoOf(a.code, st);
    if (Math.abs(s) < 0.5) return;
    if (a.nature === 'debito') totEgresos += s;
    else totIngresos += s;
  });
  const util = totIngresos - totEgresos;
  const html = `<div class="panel rounded-xl shadow-2xl w-full max-w-lg p-6" style="background:#152943">
    <div class="flex justify-between mb-3"><h2 class="text-lg font-bold gold-title">Cierre periodo ${_escape(periodId)}</h2><button onclick="closeModal('modal-close-period')" class="text-brand-muted text-2xl">×</button></div>
    <div class="text-sm text-brand-cream mb-4">
      <div class="flex justify-between"><span>Ingresos (clase 4):</span><span class="text-emerald-400 font-mono">${_fmtCOP(totIngresos)}</span></div>
      <div class="flex justify-between"><span>Costos+Gastos (clase 5,6,7):</span><span class="text-red-400 font-mono">${_fmtCOP(totEgresos)}</span></div>
      <div class="flex justify-between border-t border-brand-border mt-2 pt-2 font-semibold"><span>Utilidad ejercicio:</span><span class="${util>=0?'text-emerald-400':'text-red-400'} font-mono">${_fmtCOP(util)}</span></div>
    </div>
    <p class="text-xs text-amber-300 mb-3">⚠ Esta acción genera un asiento de cierre. Una vez cerrado, no se podrán registrar nuevos asientos en este periodo.</p>
    <label class="flex items-center text-xs text-brand-cream mb-3"><input type="checkbox" id="ck-close-confirm" class="mr-2"> Confirmo el cierre del periodo ${_escape(periodId)}</label>
    <div class="flex justify-end gap-2">
      <button onclick="closeModal('modal-close-period')" class="btn-outline">Cancelar</button>
      <button onclick="(function(){const c=document.getElementById('ck-close-confirm'); if(!c||!c.checked){_toast&&_toast('Marca la confirmación','warn');return;} closeModal('modal-close-period'); _doClosePeriod('${periodId}');})()" class="btn-gold">Generar cierre</button>
    </div>
  </div>`;
  if (typeof showModal === 'function') showModal('modal-close-period', html);
  else _doClosePeriod(periodId);
};
window._doClosePeriod = function(periodId) {
  const r = closePeriod(periodId);
  if (r.error) { _toast('Error: '+(r.message||r.error),'error'); return; }
  if (r.warning) { _toast(r.warning,'warn'); }
  if (r.ok) {
    _toast(`Periodo ${periodId} cerrado · Utilidad ${_fmtCOP(r.utilidad||0)}`, 'ok');
  }
  if (typeof renderPage==='function') renderPage();
};
window.onReopenPeriodConfirm = function(periodId) {
  const txt = (typeof prompt==='function') ? prompt(`Escribe REABRIR para confirmar la reapertura de ${periodId}`) : 'REABRIR';
  if (String(txt||'').trim().toUpperCase() !== 'REABRIR') { _toast('Reapertura cancelada','info'); return; }
  const r = reopenPeriod(periodId);
  if (r.error) { _toast('Error: '+(r.message||r.error),'error'); return; }
  _toast(`Periodo ${periodId} reabierto`, 'ok');
  if (typeof renderPage==='function') renderPage();
};
window.onCloseFiscalYear = function(year) {
  if (typeof confirm==='function' && !confirm(`¿Cerrar el año fiscal ${year}? Esta acción traslada 360505 → 370505.`)) return;
  const r = closeFiscalYear(year);
  if (r.error) { _toast('Error: '+(r.message||r.error),'error'); return; }
  _toast(`Año ${year} cerrado · Utilidad ${_fmtCOP(r.utilidad||0)}`, 'ok');
  if (typeof renderPage==='function') renderPage();
};

/* ============================================================ LIBROS PDF (jsPDF) */
/**
 * renderLibroPDF(kind, periodId, target)
 * kind ∈ ['diario','mayor','inventarios','balances'].
 * En navegador: dispara descarga del PDF.
 * Sin jsPDF (Node test harness): retorna {filename, content_text}.
 */
function renderLibroPDF(kind, periodId, target) {
  const st = _S(target);
  const watermark = 'DOCUMENTO INTERNO · NO OFICIAL DIAN';
  const lines = [];
  const push = (s) => lines.push(s);
  const sep = () => push('-'.repeat(64));
  const period = periodId || _yyyymm(_todayStr());

  // calcular rango fechas del periodo
  const m = String(period).match(/^(\d{4})-(\d{2})$/);
  let from = period+'-01', to = period+'-31';
  if (m) {
    const y=+m[1], mo=+m[2];
    const lastDay = new Date(y, mo, 0).getDate();
    to = `${y}-${String(mo).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  }

  push(watermark);
  push('CASTOR · Libros internos');
  if (kind === 'diario') {
    push('LIBRO DIARIO · ' + period);
    sep();
    const jes = (st.journalEntries||[]).filter(j => j.periodId === period && j.status === 'posted')
      .sort((a,b) => (a.date||'').localeCompare(b.date||''));
    jes.forEach(je => {
      push(`${je.id}  ${je.date}  ${je.source}/${je.sourceId}  ${je.description||''}`);
      const ls = (st.journalLines||[]).filter(l => l.journalId === je.id);
      ls.forEach(l => {
        const dCol = l.debit > 0 ? _fmtCOP(l.debit) : '';
        const cCol = l.credit > 0 ? _fmtCOP(l.credit) : '';
        push(`    ${l.accountCode}  ${(l.description||'').slice(0,40).padEnd(40)}  ${dCol.padStart(14)}  ${cCol.padStart(14)}`);
      });
      push(`    TOTAL                                              ${_fmtCOP(je.totalDebit).padStart(14)}  ${_fmtCOP(je.totalCredit).padStart(14)}`);
      sep();
    });
    push(`Total asientos: ${jes.length}`);
  } else if (kind === 'mayor') {
    push('LIBRO MAYOR · ' + period);
    sep();
    const codes = Array.from(new Set((st.journalLines||[]).filter(l => {
      const je = (st.journalEntries||[]).find(j => j.id === l.journalId);
      return je && je.periodId === period && je.status === 'posted';
    }).map(l => l.accountCode))).sort();
    codes.forEach(code => {
      const r = getSaldoCuentaRango(code, from, to, st);
      const acc = _findAccount(code, st);
      push(`${code}  ${acc?acc.name:''}`);
      push(`  Saldo inicial: ${_fmtCOP(r.saldoInicial)} · DB ${_fmtCOP(r.debitos)} · CR ${_fmtCOP(r.creditos)} · Saldo final: ${_fmtCOP(r.saldoFinal)}`);
    });
  } else if (kind === 'inventarios') {
    push('LIBRO DE INVENTARIOS · ' + to);
    sep();
    push('Insumos (state.supplies)');
    (st.supplies||[]).forEach(s => {
      push(`  ${s.id||s.sku||''}  ${s.name||''}  qty:${s.qty||0}  costo:${_fmtCOP(s.cost||0)}`);
    });
    push('Productos (state.products)');
    (st.products||[]).forEach(p => {
      push(`  ${p.id||p.sku||''}  ${p.name||''}  qty:${p.stock||0}  costo:${_fmtCOP(p.cost||0)}  precio:${_fmtCOP(p.price||0)}`);
    });
  } else if (kind === 'balances') {
    push('BALANCE GENERAL + P&G · ' + period);
    sep();
    const cls = getSaldosPorClase ? getSaldosPorClase(to, st) : null;
    if (cls) {
      const get = (k) => cls[k] || 0;
      push(`ACTIVO     (clase 1): ${_fmtCOP(get('1'))}`);
      push(`PASIVO     (clase 2): ${_fmtCOP(get('2'))}`);
      push(`PATRIMONIO (clase 3): ${_fmtCOP(get('3'))}`);
      sep();
      push(`INGRESOS   (clase 4): ${_fmtCOP(get('4'))}`);
      push(`GASTOS     (clase 5): ${_fmtCOP(get('5'))}`);
      push(`COSTOVENTA (clase 6): ${_fmtCOP(get('6'))}`);
      push(`COSTOPROD  (clase 7): ${_fmtCOP(get('7'))}`);
      const utilidad = get('4') - get('5') - get('6') - get('7');
      push(`UTILIDAD del periodo: ${_fmtCOP(utilidad)}`);
    } else {
      push('Helper getSaldosPorClase no disponible.');
    }
  }
  push('');
  push(watermark);

  const content = lines.join('\n');
  const filename = `castor_libro_${kind}_${period}.pdf`;

  // Si jsPDF está disponible, generar PDF; si no, fallback texto.
  const jspdfNs = (typeof window !== 'undefined') ? (window.jspdf || (window.jsPDF ? { jsPDF: window.jsPDF } : null)) : null;
  if (jspdfNs && jspdfNs.jsPDF) {
    try {
      const doc = new jspdfNs.jsPDF({ unit:'pt', format:'letter' });
      const margin = 36, lineH = 11;
      let y = margin;
      const pageH = doc.internal.pageSize.getHeight();
      const pageW = doc.internal.pageSize.getWidth();
      doc.setFont('Courier','normal'); doc.setFontSize(9);
      function watermarkPage() {
        doc.setTextColor(220,220,220);
        doc.setFontSize(36);
        try { doc.text(watermark, pageW/2, pageH/2, { align:'center', angle:35 }); } catch(e){}
        doc.setTextColor(0,0,0);
        doc.setFontSize(9);
      }
      watermarkPage();
      lines.forEach(t => {
        if (y > pageH - margin) { doc.addPage(); y = margin; watermarkPage(); }
        doc.text(t, margin, y);
        y += lineH;
      });
      doc.save(filename);
      return { ok:true, filename };
    } catch (e) {
      // Si falla la librería, devolver el texto como fallback
      return { ok:true, filename, content_text: content, fallback:true, error: String(e&&e.message||e) };
    }
  }
  // Sin jsPDF (Node test): retornar contenido textual
  return { ok:true, filename, content_text: content, fallback:true };
}

window.onLibroPDF = function(kind, periodId) {
  const r = renderLibroPDF(kind, periodId);
  if (r && r.fallback) {
    _toast(`Libro ${kind} generado (texto, jsPDF no disponible)`, 'warn');
  } else if (r && r.ok) {
    _toast(`Libro ${kind} generado: ${r.filename}`, 'ok');
  } else if (r && r.error) {
    _toast('Error: '+r.error,'error');
  }
};

/* ================================================================== TESTS */
window._TESTS = window._TESTS || [];

function _test(id, description, fn) {
  // evitar duplicados al recargar
  const idx = window._TESTS.findIndex(t => t.id === id);
  const entry = { id, description, fn };
  if (idx >= 0) window._TESTS[idx] = entry; else window._TESTS.push(entry);
}

function _makeFixture() {
  const st = _S();
  // clon limpio
  const f = JSON.parse(JSON.stringify(st || {}));
  f.journalEntries = [];
  f.journalLines = [];
  f.counters = Object.assign({}, f.counters||{});
  f.counters.je = 0;
  f.counters.jeManual = 0;
  // resetear secuencias para tests deterministas
  const baseNum = (Array.isArray(f.docNumbering) && f.docNumbering.length) ? f.docNumbering : seedDocNumbering();
  f.docNumbering = baseNum.map(s => Object.assign({}, s, { currentNumber: s.kind === 'REM' ? 14 : 0 }));
  // seed PUC si falta
  if (!Array.isArray(f.pucAccounts) || f.pucAccounts.length === 0) f.pucAccounts = seedPucCatalog();
  if (!f.accountingMappings) f.accountingMappings = seedAccountingMappings();
  if (!Array.isArray(f.taxRules) || f.taxRules.length === 0) f.taxRules = seedTaxRules();
  if (!Array.isArray(f.costCenters) || f.costCenters.length === 0) f.costCenters = seedCostCenters();
  if (!Array.isArray(f.fiscalPeriods) || f.fiscalPeriods.length === 0) f.fiscalPeriods = seedFiscalPeriods();
  // garantizar cuentas bancarias
  (f.bankAccounts||[]).forEach(b => { try { ensureBankPucAccount(b, f); } catch(e){} });
  return f;
}

function _assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    if (typeof actual === 'number' && typeof expected === 'number') {
      if (_eqMoney(actual, expected)) return;
    }
    throw new Error(`${msg||'Assertion failed'}: esperado ${JSON.stringify(expected)} obtuvo ${JSON.stringify(actual)}`);
  }
}
function _assertExists(value, msg) {
  if (value == null || value === false) throw new Error(msg||'Expected truthy');
}
function _assertError(result, expectedCode, msg) {
  if (!result || !result.error) throw new Error(`${msg||'Expected error'}; obtuvo ${JSON.stringify(result)}`);
  if (expectedCode && result.error !== expectedCode) {
    throw new Error(`${msg||'Wrong error code'}: esperado ${expectedCode} obtuvo ${result.error}`);
  }
}
function _assertJournalBalanced(jeOrId, fixture) {
  const id = (typeof jeOrId === 'string') ? jeOrId : (jeOrId && jeOrId.id);
  const je = (fixture.journalEntries||[]).find(j => j.id === id);
  _assertExists(je, `JE ${id} no existe`);
  const ls = (fixture.journalLines||[]).filter(l => l.journalId === id);
  let d=0,c=0; ls.forEach(l => { d+=+l.debit||0; c+=+l.credit||0; });
  if (!_eqMoney(d,c)) throw new Error(`JE ${id} desbalanceado: DB ${d} CR ${c}`);
}
function _assertAccountBalance(code, expected, fixture, asOfDate) {
  const acc = (fixture.pucAccounts||[]).find(a => a.code === code);
  if (!acc) throw new Error(`Cuenta ${code} no existe`);
  let d=0,c=0;
  // Reversado cuenta junto con su reverso (suman a cero); excluir solo draft/cancelled.
  _iterAccountLines(fixture, { code, asOfDate, includeReversed:true }, (l) => {
    d += +l.debit||0; c += +l.credit||0;
  });
  const saldo = acc.nature==='debito' ? (d-c) : (c-d);
  if (!_eqMoney(saldo, expected)) {
    throw new Error(`Saldo ${code}: esperado ${expected} obtuvo ${saldo} (DB ${d}, CR ${c})`);
  }
}

function runTest(id) {
  const t = window._TESTS.find(x => x.id === id);
  if (!t) return { id, status:'fail', error:'no_test' };
  const t0 = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const fx = _makeFixture();
    t.fn(fx);
    const t1 = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
    return { id:t.id, description:t.description, status:'pass', durationMs: Math.round(t1-t0), error:null };
  } catch(e) {
    const t1 = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
    return { id:t.id, description:t.description, status:'fail', durationMs: Math.round(t1-t0), error: e.message || String(e) };
  }
}

function runAllTests() {
  const results = window._TESTS.map(t => runTest(t.id));
  const st = _S();
  st._lastTestRun = { at: _nowISO(), results };
  _save();
  return results;
}

function renderTestsDashboard() {
  const st = _S();
  const last = st._lastTestRun;
  const results = (last && last.results) || [];
  const passCount = results.filter(r => r.status==='pass').length;
  const failCount = results.filter(r => r.status==='fail').length;
  return `
    <div class="flex justify-between items-center mb-3">
      <div>
        <h2 class="font-bold gold-title text-lg">Pruebas del módulo contable</h2>
        <p class="text-xs text-brand-muted">${(window._TESTS||[]).length} pruebas registradas · última ejecución: ${last?_fmtDate(last.at):'—'} · <span class="text-emerald-400">${passCount} ok</span> / <span class="text-red-400">${failCount} fallos</span></p>
      </div>
      <button onclick="onRunAllTests()" class="btn-gold">Ejecutar todo</button>
    </div>
    <div class="panel overflow-hidden"><table class="w-full text-sm">
      <thead class="text-xs uppercase text-brand-muted">
        <tr>
          <th class="px-3 py-2 text-left">ID</th>
          <th class="px-3 py-2 text-left">Descripción</th>
          <th class="px-3 py-2 text-center">Estado</th>
          <th class="px-3 py-2 text-right">Duración</th>
          <th class="px-3 py-2 text-left">Mensaje</th>
          <th class="px-3 py-2"></th>
        </tr>
      </thead>
      <tbody>
        ${(window._TESTS||[]).map(t => {
          const r = results.find(x => x.id === t.id);
          const status = r ? r.status : '—';
          const badge = status==='pass' ? `<span class="badge-ok px-2 py-0.5 rounded text-[11px]">PASS</span>`
                      : status==='fail' ? `<span class="badge-danger px-2 py-0.5 rounded text-[11px]">FAIL</span>`
                      : `<span class="text-brand-muted text-[11px]">—</span>`;
          return `<tr class="table-row">
            <td class="px-3 py-2 font-mono text-xs text-brand-gold">${_escape(t.id)}</td>
            <td class="px-3 py-2 text-white text-xs">${_escape(t.description)}</td>
            <td class="px-3 py-2 text-center">${badge}</td>
            <td class="px-3 py-2 text-right text-xs">${r?(r.durationMs+' ms'):'—'}</td>
            <td class="px-3 py-2 text-xs text-red-400">${r&&r.error?_escape(r.error):''}</td>
            <td class="px-3 py-2 text-right"><button onclick="onRunTest('${t.id}')" class="btn-outline text-xs">Ejecutar</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  `;
}

window.onRunAllTests = function() {
  const r = runAllTests();
  if (typeof renderPage==='function') renderPage();
  const ok = r.filter(x=>x.status==='pass').length, ko = r.filter(x=>x.status==='fail').length;
  _toast(`Pruebas: ${ok} ok / ${ko} fallos`, ko ? 'warn' : 'ok');
};
window.onRunTest = function(id) {
  const r = runTest(id);
  const st = _S();
  st._lastTestRun = st._lastTestRun || { at: _nowISO(), results: [] };
  const idx = st._lastTestRun.results.findIndex(x => x.id === id);
  if (idx >= 0) st._lastTestRun.results[idx] = r; else st._lastTestRun.results.push(r);
  st._lastTestRun.at = _nowISO();
  _save();
  if (typeof renderPage==='function') renderPage();
  _toast(`Test ${id}: ${r.status}`, r.status==='pass'?'ok':'error');
};

/* ============================================================ TESTS · FASE 1 */

_test('t_pje_balanced_ok', 'postJournalEntry valida partida doble OK', (fx) => {
  const r = postJournalEntry({
    date:'2026-04-15', source:'manual', sourceId:'TST-1',
    description:'Test balanced',
    lines:[
      { accountCode:'110505', debit:1000, credit:0 },
      { accountCode:'130505', debit:0, credit:1000, thirdParty:{type:'customer', id:'X', name:'X'} }
    ]
  }, fx);
  _assertExists(r.ok && r.journalId, 'Esperado ok=true');
  _assertJournalBalanced(r.journalId, fx);
});

_test('t_pje_unbalanced_rejects', 'postJournalEntry rechaza desbalanceado', (fx) => {
  const r = postJournalEntry({
    date:'2026-04-15', source:'manual', sourceId:'TST-2',
    lines:[
      { accountCode:'110505', debit:1000, credit:0 },
      { accountCode:'130505', debit:0, credit:900, thirdParty:{type:'customer', id:'X', name:'X'} }
    ]
  }, fx);
  _assertError(r, 'unbalanced');
});

_test('t_pje_unknown_account_rejects', 'postJournalEntry rechaza cuenta inexistente', (fx) => {
  const r = postJournalEntry({
    date:'2026-04-15', source:'manual', sourceId:'TST-3',
    lines:[
      { accountCode:'999999', debit:1000, credit:0 },
      { accountCode:'110505', debit:0, credit:1000 }
    ]
  }, fx);
  _assertError(r, 'unknown_account');
});

_test('t_pje_titulo_account_rejects', 'postJournalEntry rechaza cuenta tipo título', (fx) => {
  const r = postJournalEntry({
    date:'2026-04-15', source:'manual', sourceId:'TST-4',
    lines:[
      { accountCode:'1', debit:1000, credit:0 },                               // clase: título
      { accountCode:'110505', debit:0, credit:1000 }
    ]
  }, fx);
  _assertError(r, 'titulo_account');
});

_test('t_pje_closed_period_rejects', 'postJournalEntry rechaza periodo cerrado', (fx) => {
  // 2026-01 está cerrado en seedFiscalPeriods
  const r = postJournalEntry({
    date:'2026-01-15', source:'manual', sourceId:'TST-5',
    lines:[
      { accountCode:'110505', debit:1000, credit:0 },
      { accountCode:'130505', debit:0, credit:1000, thirdParty:{type:'customer', id:'X', name:'X'} }
    ]
  }, fx);
  _assertError(r, 'closed_period');
});

_test('t_pje_idempotency', 'Dos llamadas con mismo (source,sourceId) no duplican', (fx) => {
  const payload = {
    date:'2026-04-15', source:'sale', sourceId:'TST-IDEM-1',
    lines:[
      { accountCode:'130505', debit:1000, credit:0, thirdParty:{type:'customer', id:'X', name:'X'} },
      { accountCode:'412035', debit:0, credit:1000, thirdParty:{type:'customer', id:'X', name:'X'}, costCenter:'CC-VENTAS' }
    ]
  };
  const r1 = postJournalEntry(payload, fx);
  _assertExists(r1.ok, 'Primer post ok');
  const r2 = postJournalEntry(payload, fx);
  _assertEqual(r2.warning, 'already_posted', 'Segundo post debe avisar');
  _assertEqual(r1.journalId, r2.journalId, 'IDs iguales');
  const count = fx.journalEntries.filter(j => j.source==='sale' && j.sourceId==='TST-IDEM-1').length;
  _assertEqual(count, 1, 'Solo un asiento');
});

_test('t_reverse_je', 'reverseJournalEntry crea espejo y marca original', (fx) => {
  const r1 = postJournalEntry({
    date:'2026-04-15', source:'manual', sourceId:'TST-REV-1',
    lines:[
      { accountCode:'110505', debit:500, credit:0 },
      { accountCode:'130505', debit:0, credit:500, thirdParty:{type:'customer', id:'X', name:'X'} }
    ]
  }, fx);
  _assertExists(r1.ok, 'Post inicial');
  const rv = reverseJournalEntry(r1.journalId, 'test', fx);
  _assertExists(rv.ok, 'Reverso ok');
  const orig = fx.journalEntries.find(j => j.id === r1.journalId);
  const rev = fx.journalEntries.find(j => j.id === rv.journalId);
  _assertEqual(orig.status, 'reversed', 'Original reversed');
  _assertEqual(orig.reversedBy, rv.journalId, 'reversedBy apunta a reverso');
  _assertEqual(rev.reverses, r1.journalId, 'reverses apunta a original');
  // saldo neto debe ser 0 en cuentas afectadas
  _assertAccountBalance('110505', 0, fx);
  _assertAccountBalance('130505', 0, fx);
});

_test('t_sale_factura_19', 'Factura $11.900.000 inclusive → DB 130505 / CR 412035 + CR 240805', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-TST', name:'Cliente TST', doc:'900TST' });
  const inv = { id:'FAC-TEST-19', type:'factura', customerId:'C-TST', clientName:'Cliente TST', amount:11900000, emitDate:'2026-04-15' };
  const r = postSale(inv, fx);
  _assertExists(r.ok, 'Sale ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('130505', 11900000, fx);
  _assertAccountBalance('412035', 10000000, fx);
  _assertAccountBalance('240805', 1900000, fx);
});

_test('t_sale_remision_0', 'Remisión genera DB 130505 / CR 412035 sin IVA', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-TR', name:'Cliente TR', doc:'900TR' });
  const inv = { id:'REM-TEST-0', type:'remisión', customerId:'C-TR', clientName:'Cliente TR', amount:5000000, emitDate:'2026-04-15' };
  const r = postSale(inv, fx);
  _assertExists(r.ok, 'Remisión ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('130505', 5000000, fx);
  _assertAccountBalance('412035', 5000000, fx);
  _assertAccountBalance('240805', 0, fx);
});

_test('t_cogs_on_invoice', 'Factura/remisión genera DB 612035 / CR 143005', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-COGS', name:'Cli COGS', doc:'900CO' });
  fx.products = fx.products || [];
  fx.products.push({ id:'p-cogs', sku:'X', name:'Mueble X', cost:1500000, price:3000000 });
  fx.orders = fx.orders || [];
  fx.orders.push({ id:'OP-COGS-1', productId:'p-cogs', qty:2, customerId:'C-COGS', total:6000000 });
  const inv = { id:'FAC-COGS-1', type:'factura', customerId:'C-COGS', clientName:'Cli COGS', amount:5950000, emitDate:'2026-04-15', orderId:'OP-COGS-1', orderIds:['OP-COGS-1'] };
  const r = postSale(inv, fx);
  _assertExists(r.ok, 'Sale ok');
  // 2 productos x 1.500.000 = 3.000.000
  _assertAccountBalance('612035', 3000000, fx);
  _assertAccountBalance('143005', -3000000, fx); // crédito (saldo deudor negativo)
});

_test('t_customer_collection_full', 'Cobro total → DB 1110-XX / CR 130505', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-PAY', name:'Cli Pay', doc:'900PAY' });
  // garantizar al menos un banco
  if (!fx.bankAccounts || !fx.bankAccounts.length) {
    fx.bankAccounts = [{ id:'B-T', bank:'BancoT', number:'****', balance:0 }];
  }
  const bank = fx.bankAccounts[0];
  ensureBankPucAccount(bank, fx);
  const pay = { id:'PAG-T1', customerId:'C-PAY', bankId:bank.id, amount:1000000, date:'2026-04-15', estado:'confirmado' };
  const r = postCustomerCollection(pay, fx);
  _assertExists(r.ok, 'Cobro ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance(bank.pucCode, 1000000, fx);
  _assertAccountBalance('130505', -1000000, fx); // crédito a cliente
});

_test('t_customer_advance', 'Anticipo sin factura → CR 280505', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-ANT', name:'Cli Ant', doc:'900AN' });
  if (!fx.bankAccounts || !fx.bankAccounts.length) {
    fx.bankAccounts = [{ id:'B-T2', bank:'BT2', number:'****', balance:0 }];
  }
  const bank = fx.bankAccounts[0];
  ensureBankPucAccount(bank, fx);
  const adv = { id:'PAG-ANT-1', customerId:'C-ANT', bankId:bank.id, amount:500000, date:'2026-04-15', type:'anticipo' };
  const r = postCustomerAdvance(adv, fx);
  _assertExists(r.ok, 'Anticipo ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('280505', 500000, fx); // CR (cuenta naturaleza crédito)
  _assertAccountBalance(bank.pucCode, 500000, fx);
});

_test('t_supplier_payment', 'Pago a proveedor con OC → DB 220505 / CR 1110-XX', (fx) => {
  fx.suppliers = fx.suppliers || [];
  fx.suppliers.push({ id:'SUP-T', name:'Prov T', nit:'800XYZ' });
  if (!fx.bankAccounts || !fx.bankAccounts.length) {
    fx.bankAccounts = [{ id:'B-T3', bank:'BT3', number:'****', balance:0 }];
  }
  const bank = fx.bankAccounts[0];
  ensureBankPucAccount(bank, fx);
  const o = { id:'POUT-T1', tipo:'proveedor', beneficiarioId:'SUP-T', beneficiario:'Prov T', amount:2000000, bankId:bank.id, date:'2026-04-15', estado:'confirmado', purchaseOrderId:'OC-1' };
  const r = postSupplierPayment(o, fx);
  _assertExists(r.ok, 'Pago ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('220505', -2000000, fx); // CR neto (porque inicia sin saldo y el pago debita la CxP, dejando saldo deudor neto contra "no había nada que pagar"; el test acepta que el debit reduce CR, queda DB 2M)
  _assertAccountBalance(bank.pucCode, -2000000, fx);
});

_test('t_doc_numbering_increments', 'nextDocNumber("FAC") incrementa', (fx) => {
  const r1 = nextDocNumber('FAC', fx);
  _assertExists(r1.ok, 'r1 ok');
  _assertEqual(r1.number, 1, 'Primer FAC=1');
  const r2 = nextDocNumber('FAC', fx);
  _assertEqual(r2.number, 2, 'Segundo FAC=2');
  _assertEqual(r2.id, 'FAC-0002', 'ID con padding');
  // REM empieza en 14
  const rrem = nextDocNumber('REM', fx);
  _assertEqual(rrem.number, 15, 'REM siguiente=15');
});

_test('t_doc_numbering_blocks_when_exhausted', 'Rango agotado bloquea emisión', (fx) => {
  const seq = fx.docNumbering.find(s => s.kind === 'NC');
  seq.currentNumber = seq.rangeTo; // ya en el último
  const r = nextDocNumber('NC', fx);
  _assertError(r, 'range_exhausted');
});

_test('t_legacy_seed_journal', 'migrateAccountingV1 produce libro coherente desde seed', (fx) => {
  // simulate fresh state with some payments + invoices but no journal yet
  fx.flags = fx.flags || {};
  fx.flags.accountingV1Done = false;
  fx.journalEntries = [];
  fx.journalLines = [];
  fx.payments = fx.payments || [];
  fx.payments.push({ id:'PAG-LG1', customerId:(fx.customers||[{id:null}])[0]?.id, bankId:(fx.bankAccounts||[{id:null}])[0]?.id, amount:300000, date:'2026-04-10', estado:'confirmado' });
  fx.invoices = fx.invoices || [];
  fx.invoices.push({ id:'FAC-LG1', type:'factura', customerId:(fx.customers||[{id:null}])[0]?.id, clientName:'Test', amount:1190000, emitDate:'2026-04-08' });
  // monkey-patch global state: ya estamos en fx, así que invocamos manualmente con redirección
  const _orig = window.state;
  window.state = fx;
  try {
    migrateAccountingV1();
  } finally {
    window.state = _orig;
  }
  _assertExists(fx.flags.accountingV1Done, 'Flag set');
  _assertExists(fx.journalEntries.length >= 2, 'Asientos generados');
});

_test('t_ensure_bank_account_creates_auxiliar', 'Nuevo banco crea cuenta 1110-XX única', (fx) => {
  const before = fx.pucAccounts.filter(a => /^1110/.test(a.code)).length;
  const newBank = { id:'B-NEW', bank:'BancoNuevo', number:'****9999' };
  fx.bankAccounts = fx.bankAccounts || [];
  fx.bankAccounts.push(newBank);
  const code = ensureBankPucAccount(newBank, fx);
  _assertExists(code, 'Code asignado');
  _assertEqual(newBank.pucCode, code, 'pucCode persistido');
  const after = fx.pucAccounts.filter(a => /^1110/.test(a.code)).length;
  _assertEqual(after, before + 1, 'Solo una cuenta nueva');
  // segunda vez no duplica
  const code2 = ensureBankPucAccount(newBank, fx);
  _assertEqual(code2, code, 'Idempotente');
});

/* ============================================================ TESTS · FASE 2 */

_test('t_customer_collection_with_retenciones', 'Cobro 23.8M con ReteFte 500k + ReteIVA 570k → DB banco 22.73M + DB 135515 500k + DB 135517 570k / CR 130505 23.8M', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-RET', name:'Cli Ret', doc:'900RET' });
  if (!fx.bankAccounts || !fx.bankAccounts.length) {
    fx.bankAccounts = [{ id:'B-RET', bank:'BancoRet', number:'****', balance:0 }];
  }
  const bank = fx.bankAccounts[0];
  ensureBankPucAccount(bank, fx);
  const pay = {
    id:'PAG-RET-1',
    customerId:'C-RET',
    bankId:bank.id,
    amount:23800000,
    date:'2026-04-15',
    estado:'confirmado',
    invoiceId:'FAC-RET-X',
    retenciones: [
      { ruleId:'RTF-25',  amount:500000 },
      { ruleId:'RIVA-15', amount:570000 }
    ]
  };
  const r = postCustomerCollection(pay, fx);
  _assertExists(r.ok, 'Cobro ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance(bank.pucCode, 22730000, fx); // 23.8M − 500k − 570k
  _assertAccountBalance('135515',       500000, fx);
  _assertAccountBalance('135517',       570000, fx);
  _assertAccountBalance('130505',    -23800000, fx); // CR completo
});

_test('t_supply_purchase_with_iva_rete', 'Compra base 10M + IVA 19% + RTF-25 → DB 140505 10M + DB 240810 1.9M / CR 220505 11.65M + CR 236540 250k', (fx) => {
  fx.suppliers = fx.suppliers || [];
  fx.suppliers.push({ id:'SUP-IVA', name:'Prov IVA', nit:'800IVA' });
  const recv = {
    id:'REC-IVA-1',
    supplierId:'SUP-IVA',
    date:'2026-04-15',
    items: [{ qty:10, cost:1000000 }],   // base 10.000.000
    ivaRuleId:'IVA-19',
    retenciones:['RTF-25']
  };
  const r = postSupplyPurchase(recv, fx);
  _assertExists(r.ok, 'Compra ok');
  _assertJournalBalanced(r.journalId, fx);
  // 140505 nature débito → saldo = DB - CR = 10M
  _assertAccountBalance('140505', 10000000, fx);
  // 240810 nature débito (excepción contra-pasivo) → saldo = DB - CR = 1.9M
  _assertAccountBalance('240810',  1900000, fx);
  // 236540 nature crédito → saldo = CR - DB = 250k
  _assertAccountBalance('236540',   250000, fx);
  // 220505 nature crédito → saldo = CR - DB = 11.65M
  _assertAccountBalance('220505', 11650000, fx);
  // taxBreakdown persistido
  _assertEqual(recv.taxBreakdown.iva,   1900000, 'IVA en breakdown');
  _assertEqual(recv.taxBreakdown.totalRetenciones, 250000, 'rete total');
  _assertEqual(recv.taxBreakdown.neto, 11650000, 'neto');
});

/* ============================================================ TESTS · FASE 3 */

_test('t_raw_material_consumption', 'Salida MP qty=10 cost=$1k → DB 710505 10k / CR 140505 10k', (fx) => {
  fx.supplies = fx.supplies || [];
  fx.supplies.push({ id:'IN-RAW', name:'Madera', cost:1000, stock:100 });
  const issue = { id:'SAL-RAW-1', type:'salida', date:'2026-04-15', items:[{ supplyId:'IN-RAW', qty:10 }] };
  const r = postRawMaterialConsumption(issue, fx);
  _assertExists(r.ok, 'Consumo ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('710505', 10000, fx);  // débito → saldo = DB - CR = 10k
  _assertAccountBalance('140505', -10000, fx); // débito → saldo = DB - CR = -10k (crédito)
  // source y journalEntryId persistidos
  const je = fx.journalEntries.find(j => j.id === r.journalId);
  _assertEqual(je.source, 'consumption', 'source consumption');
  _assertEqual(issue.journalEntryId, r.journalId, 'journalEntryId persistido');
  // Idempotencia
  const r2 = postRawMaterialConsumption(issue, fx);
  _assertEqual(r2.warning, 'already_posted', 'Idempotente');
});

_test('t_raw_material_return', 'Devolución MP qty=5 cost=$2k → DB 140505 10k / CR 710505 10k', (fx) => {
  fx.supplies = fx.supplies || [];
  fx.supplies.push({ id:'IN-RET', name:'Espuma', cost:2000, stock:50 });
  const issue = { id:'SAL-RET-1', type:'devolucion', date:'2026-04-15', items:[{ supplyId:'IN-RET', qty:5 }] };
  const r = postRawMaterialReturn(issue, fx);
  _assertExists(r.ok, 'Devolución ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('140505', 10000, fx);  // DB
  _assertAccountBalance('710505', -10000, fx); // CR (debit-nature → DB - CR = -10k)
  const je = fx.journalEntries.find(j => j.id === r.journalId);
  _assertEqual(je.source, 'consumption_return', 'source consumption_return');
});

_test('t_finished_goods_in', 'PT qty=2 cost=$500k → JE-A DB 141005 1M / CR 710505 1M y JE-B DB 143005 1M / CR 141005 1M (141005 saldo neto = 0)', (fx) => {
  const stock = { id:'FS-PT-1', orderId:null, productId:null, qty:2, cost:500000, date:'2026-04-15' };
  const r = postFinishedGoods(stock, fx);
  _assertExists(r.ok, 'PT ok');
  _assertExists(r.journalId, 'JE-B id');
  _assertExists(r.journalIdWipClose, 'JE-A id');
  _assertJournalBalanced(r.journalId, fx);
  _assertJournalBalanced(r.journalIdWipClose, fx);
  // Saldo 141005 = DB 1M (JE-A) − CR 1M (JE-B) = 0
  _assertAccountBalance('141005', 0, fx);
  // Saldo 710505 = -1M (CR en JE-A)
  _assertAccountBalance('710505', -1000000, fx);
  // Saldo 143005 = +1M (DB en JE-B)
  _assertAccountBalance('143005', 1000000, fx);
  // Idempotencia
  const r2 = postFinishedGoods(stock, fx);
  _assertEqual(r2.warning, 'already_posted', 'Idempotente');
});

_test('t_warranty_cost_caja', 'Garantía con costEntry source=caja amount=$200k → DB 519540 / CR 110510 = 200k', (fx) => {
  const w = { id:'WAR-1', clientName:'Cli W', customerId:null, solucionAt:'2026-04-15' };
  const ce = { id:'CE-1', amount:200000, source:'caja', description:'Reposición', date:'2026-04-15' };
  const r = postWarrantyCost(w, ce, fx);
  _assertExists(r.ok, 'Costo garantía ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('519540', 200000, fx);  // DB
  _assertAccountBalance('110510', -200000, fx); // CR (cuenta deudora → -200k)
  const je = fx.journalEntries.find(j => j.id === r.journalId);
  _assertEqual(je.source, 'warranty', 'source warranty');
});

_test('t_warranty_cost_almacen', 'Garantía source=almacen qty=5 cost=$10k → DB 519540 / CR 140505 = 50k', (fx) => {
  fx.supplies = fx.supplies || [];
  fx.supplies.push({ id:'IN-WG', name:'Tela', cost:10000, stock:100 });
  const w = { id:'WAR-2', clientName:'Cli W2', customerId:null };
  const ce = { id:'CE-2', source:'almacen', supplyId:'IN-WG', qty:5, description:'Tela reposición' };
  const r = postWarrantyCost(w, ce, fx);
  _assertExists(r.ok, 'Costo garantía almacén ok');
  _assertJournalBalanced(r.journalId, fx);
  _assertAccountBalance('519540', 50000, fx);  // DB 5 * 10k
  _assertAccountBalance('140505', -50000, fx); // CR 50k
});

_test('t_cost_center_resolution', 'mapeo de áreas → códigos CC', (fx) => {
  _assertEqual(_resolveCostCenter('Carpintería', fx),         'TALLER', 'Carpintería → TALLER');
  _assertEqual(_resolveCostCenter('CEDI', fx),                'CEDI',   'CEDI → CEDI');
  _assertEqual(_resolveCostCenter('Tapicería', fx),           'TALLER', 'Tapicería → TALLER');
  _assertEqual(_resolveCostCenter('Metal Mecánica', fx),      'TALLER', 'Metal Mecánica → TALLER');
  _assertEqual(_resolveCostCenter('Pintura electrostática', fx),'TALLER', 'Pintura → TALLER');
  _assertEqual(_resolveCostCenter('Programación', fx),        'TALLER', 'Programación → TALLER');
  _assertEqual(_resolveCostCenter('xxx', fx),                 null,     'xxx → null');
  _assertEqual(_resolveCostCenter('', fx),                    null,     'vacío → null');
  _assertEqual(_resolveCostCenter(null, fx),                  null,     'null → null');
});

/* ----------------------------------- FASE 4 · NÓMINA Y DEPRECIACIÓN ----- */

_test('t_payroll_full', 'Nómina MOD salario 2M < 2 SMMLV (aux tpte) < 10 SMMLV (exonera salud empr+SENA+ICBF). JE balanceado y saldos por cuenta.', (fx) => {
  // Empleado MOD único
  fx.employees = [{ id:'E-MOD-1', name:'Operario Test', area:'Producción', estado:'activo', salario:2000000, hiredAt:'2025-01-01' }];
  fx.payrollRuns = [];
  fx.depreciationRuns = [];
  fx.fixedAssets = [];
  fx.companyTaxProfile = fx.companyTaxProfile || {};
  // No establecer payrollParams: usa defaults PAYROLL_2026

  const r = runPayroll('2026-04', null, fx);
  _assertExists(r.run, 'Run creado');
  const post = postPayroll(r.run, fx);
  _assertEqual(!!post.journalId, true, 'JE generado');
  _assertJournalBalanced(post.journalId, fx);

  // Cálculos esperados
  // baseAportes = 2.000.000; baseProv = 2.200.000 (con aux tpte)
  // saludEmp 4% = 80.000
  // pensionEmp 4% = 80.000
  // saludEmpr 8.5% → exonerado (sal<10 SMMLV) = 0
  // pensionEmpr 12% = 240.000
  // arl 0.522% = 10.440
  // sena/icbf exonerados → 0
  // caja 4% = 80.000 (no se exonera)
  // parafiscales total = 80.000
  // cesantías 8.33% * 2.2M = 183.260
  // intCes 1% * 2.2M = 22.000
  // prima 8.33% * 2.2M = 183.260
  // vacaciones 4.17% * 2M = 83.400 (vac sólo sobre salario, no aux tpte... wait, plan dice baseProv = salario + auxTpte)
  // Re-check: spec dice baseProvisiones = salario + auxTpte, así que vacaciones = 4.17% * 2.200.000 = 91.740
  // neto = 2M + 200k - 80k - 80k = 2.040.000

  _assertAccountBalance('720505', 2000000, fx, null);  // salario MOD
  _assertAccountBalance('510527', 200000, fx, null);   // aux tpte
  _assertAccountBalance('250505', 2040000, fx, null);  // neto a pagar
  _assertAccountBalance('237005',   80000, fx, null);  // salud (sólo empleado, empr exonerado)
  // 720570 consolida todos los aportes empleador MOD = pensión + arl + parafiscales (saludEmpr=0)
  const aportesMODEsperado = Math.round(2000000*0.12) + Math.round(2000000*0.00522) + Math.round(2000000*0.04);
  _assertAccountBalance('720570', aportesMODEsperado, fx, null);
  // Provisiones MOD
  _assertAccountBalance('730527', Math.round(2200000*0.0833), fx, null);   // cesantías
  _assertAccountBalance('730530', Math.round(2200000*0.01),   fx, null);   // int cesantías
  _assertAccountBalance('730533', Math.round(2200000*0.0833), fx, null);   // prima
  _assertAccountBalance('730536', Math.round(2200000*0.0417), fx, null);   // vacaciones

  // Run flag
  _assertEqual(r.run.journalEntryId, post.journalId, 'run.journalEntryId persistido');

  // Idempotencia
  const r2 = runPayroll('2026-04', null, fx);
  _assertEqual(!!r2.warning, true, 'Segunda corrida → warning');
});

_test('t_payroll_high_salary_no_exonera', 'Nómina admin salario 20M > 10 SMMLV: salud 8.5% + sena 2% + icbf 3% sí se cargan. Sin aux tpte (>2 SMMLV).', (fx) => {
  fx.employees = [{ id:'E-EJEC-1', name:'Ejecutivo Test', area:'Contabilidad', estado:'activo', salario:20000000, hiredAt:'2024-01-01' }];
  fx.payrollRuns = [];
  fx.companyTaxProfile = fx.companyTaxProfile || {};

  // Usar 2026-05 que no está en el seed (se crea abierto automáticamente).
  const r = runPayroll('2026-05', null, fx);
  _assertExists(r.run, 'Run creado');
  const post = postPayroll(r.run, fx);
  _assertEqual(!!post.journalId, true, 'JE generado');
  _assertJournalBalanced(post.journalId, fx);

  // Sin aux tpte
  _assertAccountBalance('510527', 0, fx, null);
  _assertAccountBalance('510506', 20000000, fx, null);  // salario admin

  // Aportes empleador (no exonerados)
  const saludEmpr   = Math.round(20000000 * 0.085);
  const pensionEmpr = Math.round(20000000 * 0.12);
  const arl         = Math.round(20000000 * 0.00522);
  const sena        = Math.round(20000000 * 0.02);
  const icbf        = Math.round(20000000 * 0.03);
  const caja        = Math.round(20000000 * 0.04);
  _assertAccountBalance('510560', saludEmpr,   fx, null); // salud empleador
  _assertAccountBalance('510568', pensionEmpr, fx, null); // pensión empleador
  _assertAccountBalance('510569', arl,         fx, null); // ARL
  _assertAccountBalance('510570', sena+icbf+caja, fx, null); // parafiscales consolidados

  // Salud por pagar = saludEmp 4% + saludEmpr 8.5% (no exonerado)
  const saludEmp = Math.round(20000000 * 0.04);
  _assertAccountBalance('237005', saludEmp + saludEmpr, fx, null);
});

_test('t_depreciation_monthly', 'Activo cost=12M, vida=60m, uso=cif → dep mensual 200k. 2 corridas → 400k acum.', (fx) => {
  fx.fixedAssets = [{
    id:'AF-T01', name:'Mesa industrial', category:'maquinaria', accountCode:'152405',
    cost:12000000, salvageValue:0, acquiredAt:'2025-01-01', usefulLifeMonths:60,
    usage:'cif', depAcumulada:0, estado:'activo', createdAt:'2025-01-01T00:00:00Z'
  }];
  fx.depreciationRuns = [];

  // Periodos 2026-05 y 2026-06 (no en seed → se crean abiertos)
  const r1 = runMonthlyDepreciation('2026-05', fx);
  _assertExists(r1.run, 'Run-1 creado');
  _assertEqual(r1.run.totals.monto, 200000, 'Dep mensual = 200k');
  const p1 = postDepreciation(r1.run, fx);
  _assertEqual(!!p1.journalId, true, 'JE-1 generado');
  _assertJournalBalanced(p1.journalId, fx);
  _assertAccountBalance('730560', 200000, fx, null);  // expense_cif
  _assertAccountBalance('159220', 200000, fx, null);  // accumulated (categoría=maquinaria → 159220 default)

  // Segunda corrida
  const r2 = runMonthlyDepreciation('2026-06', fx);
  _assertExists(r2.run, 'Run-2 creado');
  _assertEqual(r2.run.totals.monto, 200000, 'Dep mensual run-2 = 200k');
  const p2 = postDepreciation(r2.run, fx);
  _assertEqual(!!p2.journalId, true, 'JE-2 generado');

  // Saldos acumulados
  _assertAccountBalance('730560', 400000, fx, null);
  _assertAccountBalance('159220', 400000, fx, null);

  // depAcumulada del activo
  const af = fx.fixedAssets.find(a => a.id === 'AF-T01');
  _assertEqual(af.depAcumulada, 400000, 'depAcumulada del activo = 400k');

  // Idempotencia mismo periodo
  const r3 = runMonthlyDepreciation('2026-06', fx);
  _assertEqual(!!r3.warning, true, '3a corrida del mismo periodo → warning');
});

/* ====================================================== TESTS · FASE 5 (6 nuevos) */

_test('t_aging_cartera_buckets', 'Cartera distribuye en cubetas 0-30 / 31-60 / 61-90 / 91+ correctamente', (fx) => {
  const asOf = '2026-04-30';
  // Reabrir periodos anteriores para poder postear JEs con fechas viejas (test-only)
  (fx.fiscalPeriods||[]).forEach(p => { p.status = 'abierto'; });
  // Garantizar que 2025-12 y 2026-01..03 existen abiertos (para cobertura 91+ días)
  ['2025-12','2026-01','2026-02','2026-03'].forEach(id => {
    if (!(fx.fiscalPeriods||[]).find(p => p.id === id)) {
      fx.fiscalPeriods.push({ id, year:+id.slice(0,4), month:+id.slice(5,7), status:'abierto', closedAt:null, closedBy:null });
    }
  });
  fx.customers = fx.customers || [];
  // 4 clientes: 10 d, 45 d, 75 d, 120 d antes de asOf
  const cases = [
    { id:'C-A', name:'Cli A', daysAgo:10,  amount:1000000, expectedBucket:'b030' },
    { id:'C-B', name:'Cli B', daysAgo:45,  amount:2000000, expectedBucket:'b3160' },
    { id:'C-C', name:'Cli C', daysAgo:75,  amount:3000000, expectedBucket:'b6190' },
    { id:'C-D', name:'Cli D', daysAgo:120, amount:4000000, expectedBucket:'b90plus' }
  ];
  cases.forEach(c => fx.customers.push({ id:c.id, name:c.name, doc:'900'+c.id }));
  // Crear 4 facturas con fecha emisión = asOf - daysAgo
  function dateMinus(asOfStr, days) {
    const d = new Date(asOfStr); d.setDate(d.getDate() - days);
    return d.toISOString().slice(0,10);
  }
  cases.forEach((c, i) => {
    const inv = {
      id:`FAC-AGING-${i+1}`, type:'remisión',
      customerId:c.id, clientName:c.name, amount:c.amount,
      emitDate: dateMinus(asOf, c.daysAgo)
    };
    const r = postSale(inv, fx);
    _assertExists(r.ok, `factura ${inv.id} ok`);
  });
  const aging = agingByThirdParty('130505', asOf, fx);
  _assertEqual(aging.length, 4, '4 terceros con saldo');
  cases.forEach(c => {
    const row = aging.find(a => a.thirdPartyId === c.id);
    _assertExists(row, `Cliente ${c.id} en aging`);
    _assertEqual(row[c.expectedBucket], c.amount, `Cliente ${c.id} en bucket ${c.expectedBucket}`);
    // los demás buckets deben ser 0
    ['b030','b3160','b6190','b90plus'].filter(b => b !== c.expectedBucket).forEach(b => {
      _assertEqual(row[b], 0, `Cliente ${c.id} bucket ${b}=0`);
    });
  });
  // total cuadra con saldo 1305 a fecha
  const totalAging = aging.reduce((a,r) => a + r.saldoTotal, 0);
  const saldo1305 = getSaldoCuenta('130505', asOf, fx);
  _assertEqual(totalAging, saldo1305, 'Suma aging = saldo 130505');
});

_test('t_balance_general_quadrature', 'Balance General cuadra: Activo = Pasivo + Patrimonio + Utilidad tras venta+cobro+compra', (fx) => {
  // fixture limpio sin movimientos
  const asOf = '2026-04-30';
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-BG', name:'Cli BG', doc:'900BG' });
  fx.suppliers = fx.suppliers || [];
  fx.suppliers.push({ id:'SUP-BG', name:'Prov BG', nit:'800BG' });
  if (!fx.bankAccounts || !fx.bankAccounts.length) {
    fx.bankAccounts = [{ id:'B-BG', bank:'BancoBG', number:'****', balance:0 }];
  }
  const bank = fx.bankAccounts[0];
  ensureBankPucAccount(bank, fx);

  // 1. Venta factura 1.190.000 inclusive (base 1M + IVA 190k)
  const inv = { id:'FAC-BG-1', type:'factura', customerId:'C-BG', clientName:'Cli BG',
                amount:1190000, emitDate:'2026-04-10' };
  postSale(inv, fx);
  // 2. Cobro parcial 500k
  const pay = { id:'PAG-BG-1', customerId:'C-BG', bankId:bank.id, amount:500000,
                date:'2026-04-15', estado:'confirmado' };
  postCustomerCollection(pay, fx);
  // 3. Compra MP base 800k + IVA 19% = 952k a Prov BG
  const recv = { id:'REC-BG-1', supplierId:'SUP-BG', date:'2026-04-20',
                 items:[{ qty:1, cost:800000 }], ivaRuleId:'IVA-19' };
  postSupplyPurchase(recv, fx);

  // Sumar saldos por clase
  const totals = getSaldosPorClase(asOf, fx);
  const activo     = totals['1']||0;
  const pasivo     = totals['2']||0;
  const patrimonio = totals['3']||0;
  const utilidad   = getUtilidadAcumulada(asOf, fx); // clase 4 - (5+6+7)
  // Ecuación contable: Activo = Pasivo + Patrimonio + Utilidad
  const lhs = activo;
  const rhs = pasivo + patrimonio + utilidad;
  if (Math.abs(lhs - rhs) > 0.5) {
    throw new Error(`Balance no cuadra: Activo=${activo} ≠ Pasivo+Patrimonio+Utilidad=${rhs} (diff ${lhs-rhs})`);
  }
});

_test('t_pyg_utility_matches_close', 'Utilidad P&G del periodo = Σingresos − Σgastos (manual)', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-PG', name:'Cli PG', doc:'900PG' });
  if (!fx.bankAccounts || !fx.bankAccounts.length) {
    fx.bankAccounts = [{ id:'B-PG', bank:'BPG', number:'****', balance:0 }];
  }
  const bank = fx.bankAccounts[0];
  ensureBankPucAccount(bank, fx);

  // Tres facturas (remisión sin IVA para simplicidad — todo va a 412035)
  const ingresos = [3000000, 2500000, 1500000];
  ingresos.forEach((amt, i) => {
    postSale({ id:`REM-PG-${i+1}`, type:'remisión', customerId:'C-PG', clientName:'Cli PG',
               amount:amt, emitDate:`2026-04-${String(5+i).padStart(2,'0')}` }, fx);
  });
  // Dos asientos manuales contra gasto (clase 5) — el plan PUC requiere tercero
  // en algunas cuentas operativas, así que pasamos un tercero genérico.
  const tp = { type:'other', id:'X-PG', name:'Caja menor', doc:'INT' };
  postManualEntry({
    date:'2026-04-15', description:'Gasto admin 1',
    lines:[
      { accountCode:'510515', debit: 800000, credit:0, thirdParty:tp },
      { accountCode:'110505', debit: 0, credit: 800000, thirdParty:tp }
    ]
  }, fx);
  postManualEntry({
    date:'2026-04-18', description:'Gasto admin 2',
    lines:[
      { accountCode:'510515', debit: 1200000, credit:0, thirdParty:tp },
      { accountCode:'110505', debit: 0, credit: 1200000, thirdParty:tp }
    ]
  }, fx);

  const sumIng = ingresos.reduce((a,b)=>a+b, 0); // 7.000.000
  const sumGas = 800000 + 1200000;                // 2.000.000
  const utilEsperada = sumIng - sumGas;           // 5.000.000

  const utilCalc = getUtilidadAcumulada('2026-04-30', fx);
  if (Math.abs(utilCalc - utilEsperada) > 0.5) {
    throw new Error(`Utilidad P&G ${utilCalc} ≠ ${utilEsperada} (manual)`);
  }
});

_test('t_export_csv_journal', 'exportToCSV("journal_entries") emite BOM + headers + filas por línea', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-EX', name:'Cli EX', doc:'900EX' });
  // crear 2 ventas en 2026-04 → cada una genera 1 JE con N líneas
  postSale({ id:'REM-EX-1', type:'remisión', customerId:'C-EX', clientName:'Cli EX',
             amount:1000000, emitDate:'2026-04-10' }, fx);
  postSale({ id:'REM-EX-2', type:'remisión', customerId:'C-EX', clientName:'Cli EX',
             amount:2000000, emitDate:'2026-04-15' }, fx);

  const res = exportToCSV('journal_entries', { periodId:'2026-04' }, fx);
  _assertExists(res && res.content, 'res.content existe');
  // BOM UTF-8 al inicio
  if (res.content.charCodeAt(0) !== 0xFEFF) throw new Error('Falta BOM UTF-8 al inicio');
  // headers presentes
  const lines = res.content.split('\r\n');
  const header = lines[0].replace(/^﻿/, '');
  ['JE','Fecha','Periodo','Cuenta','Débito','Crédito','Descripción','Estado'].forEach(h => {
    if (!header.includes(h)) throw new Error(`Header no contiene "${h}"`);
  });
  // # filas = # líneas posted del periodo + 1 (header)
  const periodLines = (fx.journalLines||[]).filter(l => {
    const je = (fx.journalEntries||[]).find(j => j.id === l.journalId);
    return je && je.status === 'posted' && je.periodId === '2026-04';
  });
  // descontar la última línea vacía si la hay
  const dataLines = lines.filter(s => s.length > 0);
  _assertEqual(dataLines.length, periodLines.length + 1, '#filas == #líneas+1');
});

_test('t_export_siigo_format', 'exportSiigoFormat respeta headers exactos separador `;`', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-SG', name:'Cli SG', doc:'900SG' });
  // generar al menos un JE en 2026-04
  postSale({ id:'FAC-SG-1', type:'factura', customerId:'C-SG', clientName:'Cli SG',
             amount:11900000, emitDate:'2026-04-10' }, fx);
  // Firma exportSiigoFormat(periodId)
  const res = exportSiigoFormat('2026-04', undefined, fx);
  _assertExists(res && res.content, 'res.content existe');
  const lines = res.content.split('\r\n').filter(s => s.length > 0);
  const expected = 'Tipo;Fecha;Prefijo;Documento;Sucursal;NitTercero;CuentaPUC;Detalle;Debito;Credito;CentroCosto';
  if (lines[0] !== expected) {
    throw new Error(`Header Siigo distinto. Esperado: "${expected}". Obtuvo: "${lines[0]}"`);
  }
  // al menos una fila por journalLine del periodo
  const periodLines = (fx.journalLines||[]).filter(l => {
    const je = (fx.journalEntries||[]).find(j => j.id === l.journalId);
    return je && je.status === 'posted' && je.periodId === '2026-04';
  });
  _assertEqual(lines.length, periodLines.length + 1, '#filas Siigo == #líneas+1');
});

_test('t_export_aux_iva_period', 'exportToCSV("aux_iva") suma IVA = saldo 240805 − 240810 del periodo', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-IVA', name:'Cli IVA', doc:'900IVA' });
  fx.suppliers = fx.suppliers || [];
  fx.suppliers.push({ id:'SUP-IVA-EX', name:'Prov IVA EX', nit:'800IVE' });
  // Venta con IVA → 240805 CR
  postSale({ id:'FAC-IVA-1', type:'factura', customerId:'C-IVA', clientName:'Cli IVA',
             amount:11900000, emitDate:'2026-04-10' }, fx);
  // Compra con IVA → 240810 DB
  postSupplyPurchase({ id:'REC-IVA-EX', supplierId:'SUP-IVA-EX', date:'2026-04-12',
                       items:[{ qty:1, cost:1000000 }], ivaRuleId:'IVA-19' }, fx);

  const res = exportToCSV('aux_iva', { periodId:'2026-04' }, fx);
  _assertExists(res && res.content, 'content existe');
  const lines = res.content.split('\r\n').filter(s => s.length > 0);
  // headers según spec
  const header = lines[0].replace(/^﻿/, '');
  const expectedHeaders = 'tipo,id_documento,tercero,base,iva,total,fecha';
  if (header !== expectedHeaders) {
    throw new Error(`Headers aux_iva. Esperado "${expectedHeaders}". Obtuvo "${header}"`);
  }
  // sumar columna IVA (índice 4)
  function parseNum(s) {
    if (!s) return 0;
    // '1.900.000' → 1900000  o  '1.900.000,00' → 1900000.00
    const cleaned = String(s).replace(/\./g, '').replace(',', '.');
    return +cleaned || 0;
  }
  let sumIva = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    sumIva += parseNum(cols[4]);
  }
  const saldoNeto = getSaldoCuenta('240805', '2026-04-30', fx) - getSaldoCuenta('240810', '2026-04-30', fx);
  if (Math.abs(sumIva - saldoNeto) > 1) {
    throw new Error(`Σiva ${sumIva} ≠ saldo neto 240805-240810 ${saldoNeto}`);
  }
});

/* ============================================================ TESTS · FASE 6 */

_test('t_close_period_balanced', 'Cierre 2026-04 cuadra clase 4-7 contra 360505 y deja periodo cerrado', (fx) => {
  // Fixture: 1 venta + 1 gasto manual en periodo abierto 2026-04
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-CL1', name:'Cli CL1', doc:'900CL' });
  // Venta factura 11.9M (10M base + 1.9M IVA)
  postSale({ id:'FAC-CL1', type:'factura', customerId:'C-CL1', clientName:'Cli CL1',
             amount:11900000, emitDate:'2026-04-15' }, fx);
  // Gasto manual: DB 513535 (Teléfono) 500k / CR 110505 (caja general) 500k
  const _g = postJournalEntry({
    date:'2026-04-20', source:'manual', sourceId:'TST-G1',
    description:'Gasto telecomunicaciones',
    lines:[
      { accountCode:'513535', debit:500000, credit:0, costCenter:'CC-ADMIN', description:'Tel abril' },
      { accountCode:'110505', debit:0, credit:500000, description:'Pago caja' }
    ]
  }, fx);
  _assertExists(_g.ok, `gasto manual: ${JSON.stringify(_g)}`);

  // Cerrar 2026-04
  const r = closePeriod('2026-04', fx);
  _assertExists(r.ok, `closePeriod ok: ${JSON.stringify(r)}`);
  _assertExists(r.journalEntryId, 'journalEntryId existe');
  _assertJournalBalanced(r.journalEntryId, fx);

  // utilidad ≈ 10.000.000 (ingreso) − 500.000 (gasto) = 9.500.000
  if (Math.abs(r.utilidad - 9500000) > 1) {
    throw new Error(`Utilidad esperada 9.500.000 obtuvo ${r.utilidad}`);
  }
  // Saldo 360505 = utilidad
  _assertAccountBalance('360505', 9500000, fx);

  // Periodo marcado cerrado
  const p = (fx.fiscalPeriods||[]).find(x => x.id === '2026-04');
  _assertEqual(p.status, 'cerrado', 'periodo cerrado');
  _assertExists(p.closedAt, 'closedAt asignado');
  _assertEqual(p.closingJournalEntryId, r.journalEntryId, 'closingJournalEntryId persistido');

  // Saldos de las cuentas 4 y 5 deben quedar en cero tras el cierre
  _assertAccountBalance('412035', 0, fx);
  _assertAccountBalance('513535', 0, fx);
});

_test('t_close_period_blocks_new_je', 'Tras cerrar 2026-04, postSale con date 2026-04-15 es rechazado', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-CL2', name:'Cli CL2', doc:'900CL2' });
  // Venta original
  postSale({ id:'FAC-CL2', type:'factura', customerId:'C-CL2', clientName:'Cli CL2',
             amount:11900000, emitDate:'2026-04-10' }, fx);
  const r1 = closePeriod('2026-04', fx);
  _assertExists(r1.ok, 'cierre ok');

  // Intentar nueva venta dentro del periodo cerrado
  const r2 = postSale({ id:'FAC-CL2-B', type:'factura', customerId:'C-CL2',
                        clientName:'Cli CL2', amount:1190000, emitDate:'2026-04-15' }, fx);
  // postSale invoca postJournalEntry; el error de periodo cerrado se propaga
  if (!r2 || !r2.error || r2.error !== 'closed_period') {
    throw new Error(`Esperado closed_period; obtuvo ${JSON.stringify(r2)}`);
  }
});

_test('t_reopen_period', 'reopenPeriod reversa el cierre y permite nuevos asientos', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-CL3', name:'Cli CL3', doc:'900CL3' });
  postSale({ id:'FAC-CL3', type:'factura', customerId:'C-CL3', clientName:'Cli CL3',
             amount:11900000, emitDate:'2026-04-10' }, fx);
  const r1 = closePeriod('2026-04', fx);
  _assertExists(r1.ok, 'cierre ok');

  // Reabrir
  const r2 = reopenPeriod('2026-04', fx);
  _assertExists(r2.ok, `reopenPeriod ok: ${JSON.stringify(r2)}`);
  _assertExists(r2.reversalJournalEntryId, 'reversalJournalEntryId existe');

  // Saldo 360505 vuelve a 0 (cierre + reverso)
  _assertAccountBalance('360505', 0, fx);

  // Periodo abierto
  const p = (fx.fiscalPeriods||[]).find(x => x.id === '2026-04');
  _assertEqual(p.status, 'abierto', 'periodo abierto');
  _assertExists(p.reopenedAt, 'reopenedAt asignado');
  if (p.closingJournalEntryId) throw new Error('closingJournalEntryId no fue limpiado');

  // Posterior posteo en abril debe ser admitido
  const r3 = postJournalEntry({
    date:'2026-04-25', source:'manual', sourceId:'TST-POSTREOPEN',
    description:'Asiento post reapertura',
    lines:[
      { accountCode:'110505', debit:1000, credit:0 },
      { accountCode:'130505', debit:0, credit:1000, thirdParty:{type:'customer', id:'X', name:'X'} }
    ]
  }, fx);
  _assertExists(r3.ok, `posteo post-reapertura ok: ${JSON.stringify(r3)}`);
});

_test('t_nota_credito_reverses_sale', 'NC total sobre factura 11.9M reversa venta + COGS', (fx) => {
  fx.customers = fx.customers || [];
  fx.customers.push({ id:'C-NC', name:'Cli NC', doc:'900NC' });
  fx.products = fx.products || [];
  fx.products.push({ id:'p-nc', sku:'NCX', name:'Mueble NC', cost:800000, price:5950000 });
  fx.orders = fx.orders || [];
  fx.orders.push({ id:'OP-NC-1', productId:'p-nc', qty:1, customerId:'C-NC', total:5950000 });
  // Venta original con COGS
  const inv = { id:'FAC-NC-1', type:'factura', customerId:'C-NC', clientName:'Cli NC',
                amount:11900000, emitDate:'2026-04-10', orderId:'OP-NC-1', orderIds:['OP-NC-1'] };
  fx.invoices = fx.invoices || [];
  fx.invoices.push(inv);
  const r0 = postSale(inv, fx);
  _assertExists(r0.ok, `postSale: ${JSON.stringify(r0)}`);
  // saldos antes de NC
  _assertAccountBalance('130505', 11900000, fx);
  _assertAccountBalance('412035', 10000000, fx);
  _assertAccountBalance('240805', 1900000, fx);
  _assertAccountBalance('612035', 800000, fx);
  _assertAccountBalance('143005', -800000, fx);

  // Emitir NC total
  const r = emitNotaCredito('FAC-NC-1', 'Devolución total', [], fx);
  _assertExists(r.ok, `NC emitida ok: ${JSON.stringify(r)}`);
  if (!/^NC-\d+/.test(String(r.ncNumber||''))) {
    throw new Error(`ncNumber formato NC-XXX esperado, obtuvo ${r.ncNumber}`);
  }
  _assertJournalBalanced(r.journalEntryId, fx);

  // Tras NC total: 130505 = 0, 412035 = 10M, 240805 = 1.9M (revenue queda contra 417505)
  _assertAccountBalance('130505', 0, fx);
  _assertAccountBalance('240805', 0, fx);
  _assertAccountBalance('417505', 10000000, fx);  // devoluciones en venta
  // COGS reverso: 612035 vuelve a 0, 143005 vuelve a 0
  _assertAccountBalance('612035', 0, fx);
  _assertAccountBalance('143005', 0, fx);

  // Registro persistido en state.notasCredito
  const rec = (fx.notasCredito||[]).find(n => n.ncNumber === r.ncNumber);
  _assertExists(rec, 'registro NC en state.notasCredito');
  _assertEqual(rec.invoiceId, 'FAC-NC-1', 'invoiceId persistido');
  _assertEqual(rec.monto, 11900000, 'monto persistido');
});

_test('t_dirty_marker_on_post', 'postJournalEntry marca el JE recién creado en _dirtyJournals para sync estructurado', (fx) => {
  fx._dirtyJournals = new Set();
  const r = postJournalEntry({
    date:'2026-04-15', source:'manual', sourceId:'TST-DM-1',
    description:'Test dirty marker',
    lines:[
      { accountCode:'110505', debit:1000, credit:0 },
      { accountCode:'130505', debit:0, credit:1000, thirdParty:{type:'customer', id:'X', name:'X'} }
    ]
  }, fx);
  _assertExists(r.ok && r.journalId, `postJE ok esperado: ${JSON.stringify(r)}`);
  _assertExists(fx._dirtyJournals && typeof fx._dirtyJournals.has === 'function',
    '_dirtyJournals debe ser un Set');
  _assertEqual(fx._dirtyJournals.size, 1, 'debe haber 1 JE marcado');
  _assertEqual(fx._dirtyJournals.has(r.journalId), true,
    `JE ${r.journalId} debe estar en _dirtyJournals`);
});

_test('t_dirty_marker_on_reverse', 'reverseJournalEntry deja AMBOS ids (original + reverso) en _dirtyJournals', (fx) => {
  fx._dirtyJournals = new Set();
  const r0 = postJournalEntry({
    date:'2026-04-15', source:'manual', sourceId:'TST-DR-1',
    description:'Test reverse dirty',
    lines:[
      { accountCode:'110505', debit:1000, credit:0 },
      { accountCode:'130505', debit:0, credit:1000, thirdParty:{type:'customer', id:'X', name:'X'} }
    ]
  }, fx);
  _assertExists(r0.ok, 'postJE inicial ok');
  fx._dirtyJournals.clear(); // reseteo para validar solo el efecto del reverse

  const r = reverseJournalEntry(r0.journalId, 'test', fx);
  _assertExists(r.ok && r.journalId, `reverse ok esperado: ${JSON.stringify(r)}`);
  _assertEqual(fx._dirtyJournals.size, 2, 'debe haber 2 JEs marcados (original + reverso)');
  _assertEqual(fx._dirtyJournals.has(r0.journalId), true,
    'el JE original debe estar marcado (status pasó a reversed)');
  _assertEqual(fx._dirtyJournals.has(r.journalId), true,
    'el JE de reverso debe estar marcado');
});

/* =============================================================== EXPORTS */
window.seedPucCatalog          = seedPucCatalog;
window.seedAccountingMappings  = seedAccountingMappings;
window.seedTaxRules            = seedTaxRules;
window.seedDocNumbering        = seedDocNumbering;
window.seedCostCenters         = seedCostCenters;
window.seedFiscalPeriods       = seedFiscalPeriods;

window.calcTaxBreakdown        = calcTaxBreakdown;
window.nextDocNumber           = nextDocNumber;
window.ensureBankPucAccount    = ensureBankPucAccount;

window.postJournalEntry        = postJournalEntry;
window.reverseJournalEntry     = reverseJournalEntry;
window.findJournalBySource     = findJournalBySource;

window.postSale                = postSale;
window.postCostOfSale          = postCostOfSale;
window.postCustomerCollection  = postCustomerCollection;
window.postCustomerAdvance     = postCustomerAdvance;
window.postSupplyPurchase      = postSupplyPurchase;
window.postSupplierPayment     = postSupplierPayment;
window.postBankAdjustment      = postBankAdjustment;
window.postManualEntry         = postManualEntry;
window.postRawMaterialConsumption = postRawMaterialConsumption;
window.postRawMaterialReturn   = postRawMaterialReturn;
window.postFinishedGoods       = postFinishedGoods;
window.postWarrantyCost        = postWarrantyCost;
window._resolveCostCenter      = _resolveCostCenter;

// Fase 4 — nómina y depreciación
window.PAYROLL_2026            = PAYROLL_2026;
window.runPayroll              = runPayroll;
window.postPayroll             = postPayroll;
window.runMonthlyDepreciation  = runMonthlyDepreciation;
window.postDepreciation        = postDepreciation;
window._calcEmployeePayroll    = _calcEmployeePayroll;
window._resolveSalaryAccount   = _resolveSalaryAccount;
window._resolvePayrollAccountSet = _resolvePayrollAccountSet;
window._resolveCostCenterEmployee = _resolveCostCenterEmployee;

window.migrateAccountingV1     = migrateAccountingV1;

window.renderContabSubnav      = renderContabSubnav;
window.renderContabSection     = renderContabSection;
window.renderDashboardContable = renderDashboardContable;
window.renderLibroDiario       = renderLibroDiario;
window.renderLibroMayor        = renderLibroMayor;
window.renderAuxiliarCuenta    = renderAuxiliarCuenta;
window.renderManuales          = renderManuales;
window.renderConfigPUC         = renderConfigPUC;
window.renderConfigMapeos      = renderConfigMapeos;
window.renderConfigImpuestos   = renderConfigImpuestos;
window.renderConfigNumeracion  = renderConfigNumeracion;
window.renderConfigCC          = renderConfigCC;
window.renderConfigPerfil      = renderConfigPerfil;
window.renderAuxIVA            = renderAuxIVA;
window.renderAuxRetenciones    = renderAuxRetenciones;
window.renderNomina            = renderNomina;
window.renderActivosFijos      = renderActivosFijos;
window.renderTestsDashboard    = renderTestsDashboard;

window.runAllTests             = runAllTests;
window.runTest                 = runTest;
window._test                   = _test;
window._makeFixture            = _makeFixture;
window._assertEqual            = _assertEqual;
window._assertExists           = _assertExists;
window._assertError            = _assertError;
window._assertJournalBalanced  = _assertJournalBalanced;
window._assertAccountBalance   = _assertAccountBalance;

/* Fase 5 — reportes financieros y hub de exportación */
window.getSaldoCuenta          = getSaldoCuenta;
window.getSaldoCuentaRango     = getSaldoCuentaRango;
window.getMovimientosCuenta    = getMovimientosCuenta;
window.agingByThirdParty       = agingByThirdParty;
window.getSaldosPorClase       = getSaldosPorClase;
window.getUtilidadAcumulada    = getUtilidadAcumulada;
window.renderBalancePrueba     = renderBalancePrueba;
window.renderBalanceGeneral    = renderBalanceGeneral;
window.renderPyG               = renderPyG;
window.renderCartera           = renderCartera;
window.renderCxP               = renderCxP;
window.renderExportHub         = renderExportHub;
window.exportToCSV             = exportToCSV;
window.exportToJSON            = exportToJSON;
window.exportToXLSX            = exportToXLSX;
window.exportSiigoFormat       = exportSiigoFormat;
window.exportWorldOfficeFormat = exportWorldOfficeFormat;
window.exportHelisaFormat      = exportHelisaFormat;
window.exportContapymeFormat   = exportContapymeFormat;
window.exportSupabaseSQL       = exportSupabaseSQL;
window._viewToRows             = _viewToRows;

/* Fase 6 — cierres + notas crédito/débito + libros PDF */
window.closePeriod             = closePeriod;
window.reopenPeriod            = reopenPeriod;
window.closeFiscalYear         = closeFiscalYear;
window.emitNotaCredito         = emitNotaCredito;
window.emitNotaDebito          = emitNotaDebito;
window.renderConfigPeriodos    = renderConfigPeriodos;
window.renderLibroPDF          = renderLibroPDF;

})();
