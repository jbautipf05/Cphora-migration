// Estructura jerárquica del menú — espejo del ERP original, por bloques operativos.

export const CONTAB_SUBVIEWS = [
  { id: 'dashboard', label: 'Dashboard Contable' },
  { id: 'libro-diario', label: 'Libro Diario' },
  { id: 'balance-prueba', label: 'Balance de Prueba' },
  { id: 'plan-puc', label: 'Plan PUC' },
  { id: 'config-nomina', label: 'Nómina y Perfil Tributario' },
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
