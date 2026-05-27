// ───────────────────────────────────────────────────────────────────────────
// Migraciones idempotentes del estado (seed + localStorage).
// Reglas: NO destructivas (solo RELLENAN datos faltantes), versionadas en
// state._migrations[clave], y SIN bump de STORAGE_KEY (no se pierden datos del
// usuario). Ver ADR-011 (identidad de cliente / B2).
// ───────────────────────────────────────────────────────────────────────────

// Resuelve el customerId canónico de un registro (pedido/cotización) por, en orden:
//   1) lead vinculado (leadId → lead.linkedCustomerId)
//   2) documento exacto (doc/nit) contra customers — solo si es único
//   3) nombre exacto contra customers — solo si es único (evita unir homónimos)
// Devuelve null si no se puede resolver sin ambigüedad.
export function resolveCustomerId({ clientName, doc, leadId } = {}, { customers = [], leads = [] } = {}) {
  if (leadId) {
    const lead = leads.find((l) => l.id === leadId);
    if (lead?.linkedCustomerId) return lead.linkedCustomerId;
  }
  if (doc) {
    const byDoc = customers.filter((c) => c.doc && c.doc === doc);
    if (byDoc.length === 1) return byDoc[0].id;
  }
  if (clientName) {
    const byName = customers.filter((c) => c.name === clientName);
    if (byName.length === 1) return byName[0].id;
  }
  return null;
}

const CUSTOMER_FK_VERSION = 1;

// Rellena customerId en pedidos y cotizaciones que no lo tengan, resolviendo por
// lead/doc/nombre. Idempotente: se marca en state._migrations.customerFk.
export function migrateCustomerFk(state) {
  if (!state) return state;
  if ((state._migrations?.customerFk || 0) >= CUSTOMER_FK_VERSION) return state;

  const ctx = { customers: state.customers || [], leads: state.leads || [] };
  const backfill = (rec) => {
    if (rec.customerId) return rec; // ya tiene FK → no tocar
    const id = resolveCustomerId(
      { clientName: rec.clientName, doc: rec.doc || rec.nit, leadId: rec.leadId },
      ctx,
    );
    // Si no resuelve, deja customerId: null explícito (shape uniforme, no inventa enlaces).
    return { ...rec, customerId: id };
  };

  return {
    ...state,
    orders: (state.orders || []).map(backfill),
    quotes: (state.quotes || []).map(backfill),
    _migrations: { ...(state._migrations || {}), customerFk: CUSTOMER_FK_VERSION },
  };
}

const CUSTOMER_CHANNEL_VERSION = 1;

// Rellena el campo `channel` (canal por el que llegó el cliente) en clientes que
// no lo tengan: lo deriva del lead vinculado (linkedLeadId → lead.channel) y, si
// no hay lead, deja '' (shape uniforme). Idempotente: state._migrations.customerChannel.
// EX-F2-04: el modelo de cliente no traía `channel` (solo los leads lo tenían).
export function migrateCustomerChannel(state) {
  if (!state) return state;
  if ((state._migrations?.customerChannel || 0) >= CUSTOMER_CHANNEL_VERSION) return state;

  const leads = state.leads || [];
  const backfill = (c) => {
    if (c.channel) return c; // ya tiene canal → no tocar
    const lead = c.linkedLeadId ? leads.find((l) => l.id === c.linkedLeadId) : null;
    return { ...c, channel: lead?.channel || '' };
  };

  return {
    ...state,
    customers: (state.customers || []).map(backfill),
    _migrations: { ...(state._migrations || {}), customerChannel: CUSTOMER_CHANNEL_VERSION },
  };
}

const WAREHOUSE_LABELS_VERSION = 1;

// H-102: relabela las dos bodegas de materia prima al vocabulario del cliente
// ("Almacén #1/#2"). El seed ya trae los nuevos rótulos, pero hydrate() hace
// {...base, ...saved}, así que un localStorage previo conserva los antiguos
// ("Insumos 1/2"). Esta migración los actualiza también en estado persistido,
// sin tocar el campo técnico `tipo` ni ninguna otra bodega. Idempotente.
const WAREHOUSE_RELABEL = {
  'W-ALM1': 'Almacén #1',
  'W-ALM2': 'Almacén #2',
};
export function migrateWarehouseLabels(state) {
  if (!state) return state;
  if ((state._migrations?.warehouseLabels || 0) >= WAREHOUSE_LABELS_VERSION) return state;

  return {
    ...state,
    warehouses: (state.warehouses || []).map((w) => {
      const label = WAREHOUSE_RELABEL[w.id];
      // Solo relabela si sigue con el rótulo antiguo (no pisa un nombre que el
      // usuario hubiera personalizado a algo distinto de "Insumos N").
      if (!label || !/^Insumos\b/.test(w.code || '')) return w;
      return { ...w, code: label, name: label };
    }),
    _migrations: { ...(state._migrations || {}), warehouseLabels: WAREHOUSE_LABELS_VERSION },
  };
}

const WARRANTY_FIELDS_VERSION = 1;

// EX-GAR (Fase 3): el modelo de garantías se enriqueció a paridad con Demo6
// (cronología de 4 fechas, comunicaciones, fotos, y OP de garantía con costos
// manuales que disparan postWarrantyCost). El seed ya trae los campos nuevos,
// pero un localStorage previo conserva el shape viejo; esta migración rellena los
// faltantes sin pisar datos existentes. Idempotente: state._migrations.warrantyFields.
export function migrateWarrantyFields(state) {
  if (!state) return state;
  if ((state._migrations?.warrantyFields || 0) >= WARRANTY_FIELDS_VERSION) return state;

  const orders = state.orders || [];
  const backfill = (w) => {
    const ord = w.orderId ? orders.find((o) => o.id === w.orderId) : null;
    return {
      // Defaults primero; los valores existentes del registro ganan (no se pisan).
      diagnosticoAt: '', solucionAt: '', cierreAt: '',
      comunicaciones: [], fotos: [], generatedOpId: null, opCostos: [],
      productId: ord?.productId || '', qty: 1, asesor: w.comercial || w.asesor || '',
      ...w,
    };
  };

  return {
    ...state,
    warranties: (state.warranties || []).map(backfill),
    _migrations: { ...(state._migrations || {}), warrantyFields: WARRANTY_FIELDS_VERSION },
  };
}
