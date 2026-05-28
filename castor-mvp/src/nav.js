// Estructura jerárquica del menú — espejo del ERP original, por bloques operativos.

export const CONTAB_SUBVIEWS = [
  { id: 'dashboard', label: 'Dashboard Contable' },
  { id: 'libro-diario', label: 'Libro Diario' },
  { id: 'libro-mayor', label: 'Libro Mayor' },
  { id: 'balance-prueba', label: 'Balance de Prueba' },
  { id: 'balance-general', label: 'Balance General' },
  { id: 'estado-resultados', label: 'Estado de Resultados' },
  { id: 'cartera', label: 'Cartera (CxC)' },
  { id: 'cxp', label: 'Cuentas por Pagar' },
  { id: 'aux-iva', label: 'Auxiliar IVA' },
  { id: 'aux-retenciones', label: 'Auxiliar Retenciones' },
  { id: 'plan-puc', label: 'Plan PUC' },
  { id: 'asientos-manuales', label: 'Asientos Manuales' },
  { id: 'cierres', label: 'Cierres de Periodo' },
  { id: 'centros-costo', label: 'Centros de Costo' },
  { id: 'config-perfil', label: 'Perfil Tributario' },
  { id: 'config-nomina', label: 'Nómina' },
  { id: 'mapeos-cuentas', label: 'Mapeo de Cuentas' },
  { id: 'reglas-tributarias', label: 'Reglas Tributarias' },
  { id: 'numeracion-docs', label: 'Numeración Documentos' },
  { id: 'exportar', label: 'Hub de Exportación' },
  { id: 'pruebas-contables', label: 'Centro de Pruebas' },
];

export const NAV = [
  { type: 'item', id: 'inicio', label: 'Inicio', icon: '🏠' },
  {
    type: 'group',
    label: 'Comercial',
    items: [
      { id: 'leads', label: 'Leads', icon: '👥' },
      { id: 'clientes', label: 'Clientes', icon: '🤝' },
      { id: 'cotizaciones', label: 'Cotizaciones', icon: '💬' },
      { id: 'lista-precios', label: 'Lista de precios', icon: '🏷️' },
      { id: 'ventas', label: 'Ventas', icon: '🛍️' },
      { id: 'postventa', label: 'Postventa', icon: '📞' },
      { id: 'marketing', label: 'Marketing', icon: '📢' },
    ],
  },
  {
    type: 'group',
    label: 'Operación',
    items: [
      { id: 'produccion', label: 'Producción', icon: '🛠️' },
      { id: 'inventario', label: 'Inventario Terminado', icon: '📦' },
      { id: 'despacho', label: 'Despacho', icon: '🚚' },
      { id: 'almacen', label: 'Almacén (Materia prima)', icon: '🪵' },
      { id: 'garantias', label: 'Garantías', icon: '🛡️' },
    ],
  },
  {
    type: 'group',
    label: 'Finanzas',
    items: [
      { id: 'tesoreria', label: 'Tesorería', icon: '🏦' },
      { id: 'contabilidad', label: 'Contabilidad', icon: '💰', children: CONTAB_SUBVIEWS },
    ],
  },
  {
    type: 'group',
    label: 'Admin',
    items: [
      { id: 'auditoria', label: 'Auditoría', icon: '🔍' },
      { id: 'innovacion', label: 'Innovación', icon: '💡' },
      { id: 'rrhh', label: 'RRHH', icon: '🧑' },
    ],
  },
];

// Lookup plano id → { label, group, icon }
const FLAT = {};
for (const node of NAV) {
  if (node.type === 'item') FLAT[node.id] = { label: node.label, icon: node.icon, group: null };
  if (node.type === 'group') {
    for (const it of node.items) {
      FLAT[it.id] = { label: it.label, icon: it.icon, group: node.label };
      if (it.children) {
        for (const c of it.children) {
          FLAT[c.id] = { label: c.label, icon: it.icon, group: `${node.label} · ${it.label}` };
        }
      }
    }
  }
}

export const navInfo = (id) => FLAT[id] || { label: id, icon: '•', group: null };
export const CONTAB_IDS = CONTAB_SUBVIEWS.map((s) => s.id);

// Títulos y breadcrumb por página (espejo de PAGE_META del demo).
// Cada entrada: { title, bc } — copiada 1:1 del HTML Demo6 (línea ~998).
const PAGE_META = {
  inicio: { title: 'Panel de Control', bc: 'Inicio' },
  leads: { title: 'Gestión de Leads', bc: 'Comercial · Leads' },
  clientes: { title: 'Clientes', bc: 'Comercial · Clientes' },
  cotizaciones: { title: 'Cotizaciones', bc: 'Comercial · Cotizaciones' },
  'lista-precios': { title: 'Lista de Precios', bc: 'Comercial · Lista de Precios' },
  ventas: { title: 'Ventas y Pedidos', bc: 'Comercial · Ventas' },
  postventa: { title: 'Postventa', bc: 'Comercial · Postventa' },
  marketing: { title: 'Marketing', bc: 'Comercial · Marketing' },
  produccion: { title: 'Producción', bc: 'Operación · Producción' },
  inventario: { title: 'Inventario Terminado', bc: 'Operación · Producto terminado' },
  despacho: { title: 'Despacho', bc: 'Operación · Despacho' },
  almacen: { title: 'Almacén · Bodegas', bc: 'Operación · Almacén' },
  garantias: { title: 'Garantías', bc: 'Operación · Garantías' },
  tesoreria: { title: 'Tesorería', bc: 'Finanzas · Tesorería' },
  auditoria: { title: 'Auditoría', bc: 'Admin · Auditoría' },
  innovacion: { title: 'Innovación', bc: 'Admin · Innovación' },
  rrhh: { title: 'Recursos Humanos', bc: 'Admin · RRHH' },
  // Submódulos de Contabilidad (cuelgan de Finanzas · Contabilidad)
  dashboard: { title: 'Dashboard Contable', bc: 'Finanzas · Contabilidad · Dashboard' },
  'libro-diario': { title: 'Libro Diario', bc: 'Finanzas · Contabilidad · Libro Diario' },
  'libro-mayor': { title: 'Libro Mayor', bc: 'Finanzas · Contabilidad · Libro Mayor' },
  'balance-prueba': { title: 'Balance de Prueba', bc: 'Finanzas · Contabilidad · Balance de Prueba' },
  'balance-general': { title: 'Balance General', bc: 'Finanzas · Contabilidad · Balance General' },
  'estado-resultados': { title: 'Estado de Resultados', bc: 'Finanzas · Contabilidad · P&L' },
  cartera: { title: 'Cartera (CxC)', bc: 'Finanzas · Contabilidad · Cartera' },
  cxp: { title: 'Cuentas por Pagar', bc: 'Finanzas · Contabilidad · CxP' },
  'aux-iva': { title: 'Auxiliar IVA', bc: 'Finanzas · Contabilidad · Aux IVA' },
  'aux-retenciones': { title: 'Auxiliar Retenciones', bc: 'Finanzas · Contabilidad · Aux Retenciones' },
  'plan-puc': { title: 'Plan PUC', bc: 'Finanzas · Contabilidad · Plan PUC' },
  'asientos-manuales': { title: 'Asientos Manuales', bc: 'Finanzas · Contabilidad · Asientos Manuales' },
  cierres: { title: 'Cierres de Periodo', bc: 'Finanzas · Contabilidad · Cierres' },
  'centros-costo': { title: 'Centros de Costo', bc: 'Finanzas · Contabilidad · Centros de Costo' },
  'config-perfil': { title: 'Perfil Tributario', bc: 'Finanzas · Contabilidad · Perfil Tributario' },
  'config-nomina': { title: 'Nómina y Parámetros', bc: 'Finanzas · Contabilidad · Nómina' },
  'mapeos-cuentas': { title: 'Mapeo de Cuentas por Evento', bc: 'Finanzas · Contabilidad · Mapeo de Cuentas' },
  'reglas-tributarias': { title: 'Reglas Tributarias', bc: 'Finanzas · Contabilidad · Reglas Tributarias' },
  'numeracion-docs': { title: 'Numeración de Documentos', bc: 'Finanzas · Contabilidad · Numeración' },
  exportar: { title: 'Hub de Exportación', bc: 'Finanzas · Contabilidad · Exportación' },
  'pruebas-contables': { title: 'Centro de Pruebas', bc: 'Finanzas · Contabilidad · Pruebas' },
};

export function pageMeta(id) {
  const info = navInfo(id);
  const meta = PAGE_META[id];
  if (meta) return { title: meta.title, breadcrumb: meta.bc, icon: info.icon };
  // Fallback: si no hay meta explícita, deriva del grupo.
  const title = info.label;
  const breadcrumb = info.group ? `${info.group} · ${info.label}` : 'Inicio';
  return { title, breadcrumb, icon: info.icon };
}
