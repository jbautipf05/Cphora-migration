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
