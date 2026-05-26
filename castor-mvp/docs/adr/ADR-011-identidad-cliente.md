# ADR-011 — Identidad de cliente: `customerId` (FK) como canónico, `clientName` como denormalización de display

**Estado:** Propuesto · **Pendiente de OK explícito del usuario antes de codear (B2, Fase 1.5)**
**Fecha:** 2026-05-26
**Decisores:** Usuario/cliente + equipo de desarrollo
**Relacionado:** REVISION_TECNICA_PRE_FASE2 §BLOQUEANTES (B2) · TD-29 · ADR-010 (Firebase)

> ℹ️ **Nota de numeración (resuelta):** `ADR-010` reservaba "ADR-011" como placeholder para el
> *modelo de datos Firestore detallado*. Por decisión del usuario (2026-05-26) este ADR de
> identidad de cliente ocupa el **011**, y los placeholders de ADR-010 se corrieron:
> Firestore data-model → **ADR-012**, Cloud Functions → **ADR-013**, reglas de seguridad → **ADR-014**.

---

## Contexto — cómo se rompe HOY (concreto)

El modelo de datos **ya es FK-ready**, pero el código de creación en runtime no lo usa:

- **Pedidos del seed** (`erpSeed.js`) **sí** traen FK real:
  `PED-1245 … customerId: 'C-004'`, `PED-1248 … customerId: 'C-001'`, etc.
- **Pedidos creados en la app** la rompen: `Ventas.jsx:87` y `Auditoria.jsx:122` hardcodean
  **`customerId: null`** y solo guardan `clientName` (texto libre).
- **Cotizaciones** (seed y runtime) **no** tienen `customerId` en absoluto: enlazan por
  `leadId` + `clientName` (p. ej. `COT-2002 … leadId: 'L-105', clientName: 'Carmiña Chapman'`).
- **`Clientes.jsx:44-48`** reconstruye TODO el historial del cliente cruzando por **nombre**:
  ```js
  const ords = orders.filter(o => o.customerId === c.id || o.clientName === c.name);
  const cots = quotes.filter(qq => qq.clientName === c.name);
  const lds  = leads.filter(l => l.linkedCustomerId === c.id || l.name === c.name);
  ```

Consecuencias reales:
1. **Renombrar un cliente desvincula su historial en silencio.** Si en Fase 2 se agrega
   "editar cliente" y el usuario corrige "Carmiña Chapman" → "Carmiña Chapman Ruiz", todos los
   pedidos/cotizaciones que enlazaban por nombre **dejan de aparecer** en su ficha (los del
   seed con `customerId` sobreviven; los creados en runtime con `customerId: null`, no).
2. **Homónimos colisionan.** Dos clientes con el mismo nombre comparten historial.
3. **El motor contable recibe un nombre como id.** `Ventas.jsx:131` pasa
   `order?.customerId || order?.clientName` como `customerId` a `postCustomerCollection` →
   el "tercero" del asiento es un string de nombre, no un id (incompatible con auxiliares por
   tercero y con Firestore).
4. **No migra a Firebase (ADR-010).** Firestore quiere referencias por id de documento; el
   join por nombre no es viable en producción.

## Decisión recomendada

**`customerId` es la clave foránea canónica** en pedidos, cotizaciones y demás entidades que
refieran a un cliente. **`clientName` se conserva como dato denormalizado de display**
(coherente con la filosofía "denormalizar agresivamente" de ADR-010 para Firestore).

Reglas:
1. **Al crear** un pedido o cotización, **resolver y guardar `customerId`**:
   - si viene de un lead con `linkedCustomerId`, usar ése;
   - si no, buscar un cliente existente por documento (preferente) o por nombre exacto;
   - si no existe, **crear el cliente** (o dejar `customerId: null` solo para "walk-in"
     explícitos) y enlazarlo.
2. **Al mostrar**, resolver el nombre vía `customers.find(c => c.id === customerId)?.name`,
   con **fallback** a `clientName` almacenado (para datos legacy sin FK). Así, **editar el
   nombre del cliente se refleja** en el historial sin romper enlaces.
3. **El motor contable** recibe siempre `customerId` real como tercero.

## Opciones consideradas

### Opción A — `customerId` FK canónico + `clientName` display (recomendada)
| Dimensión | Evaluación |
|-----------|------------|
| Complejidad | Media (backfill + tocar puntos de creación) |
| Compatibilidad visual | Alta (la UI sigue mostrando el nombre) |
| Migración Firebase | Alta (FK por id es el patrón Firestore) |
| Riesgo | Bajo-medio (homónimos en el backfill) |

**Pros:** integridad referencial; renombrar no desvincula; tercero contable correcto; alineado
con ADR-010. **Contras:** requiere migración de datos legacy y disciplina en los puntos de creación.

### Opción B — Mantener join por nombre (status quo)
**Pros:** cero trabajo. **Contras:** todos los problemas del Contexto; **bloquea** editar cliente
y la migración a Firebase. **Descartada.**

### Opción C — Match por documento (`doc`/`nit`) en vez de id
**Pros:** estable ante renombres. **Contras:** documento puede faltar/editarse/duplicarse; sigue
sin ser una FK por id. Útil **solo como heurística de resolución** dentro de la Opción A, no como
identidad. **Descartada como identidad; adoptada como criterio de matching en el backfill.**

## Plan de migración de datos existentes

> Idempotente y no destructivo. Solo **rellena** `customerId` faltante; nunca borra `clientName`.

1. **Seed (`erpSeed.js`):**
   - Pedidos: ya tienen `customerId` → sin cambio.
   - Cotizaciones: backfill `customerId` resolviendo `leadId → lead.linkedCustomerId`; si no,
     match por `clientName`/`doc` contra `customers`. Las que no resuelvan quedan `customerId: null`
     (no se inventan enlaces).
2. **localStorage (al hidratar):** una rutina de migración **única e idempotente** en
   `hydrate()` (o un `migrations/` versionado) que, para cada pedido/cotización con
   `customerId` ausente o `null`, intente resolver por:
   `leadId → linkedCustomerId` → `doc` exacto → `name` exacto.
   - Si el match de nombre es **ambiguo** (>1 cliente) → dejar `null` y registrar en consola
     (no adivinar; evita unir homónimos).
   - Versionar la migración (p. ej. `_migrations: { customerFk: 1 }`) para no re-ejecutarla.
   - **Sin bump destructivo de `STORAGE_KEY`** (no perder los datos del usuario; cf. ADR-008).
3. **Hacia adelante:** `Ventas.saveOrder` y el guardado de cotización setean `customerId` en el
   momento de crear.

## Impacto por módulo

| Módulo | Impacto |
|--------|---------|
| **Pedidos (`Ventas.jsx`)** | `saveOrder` resuelve/crea cliente y setea `customerId`; `savePayment`/`postSale`/`postCustomerCollection` pasan el `customerId` real (deja de pasar el nombre). |
| **Cotizaciones (`NuevaCotizacionModal` / `Cotizaciones.jsx`)** | Al guardar, derivar `customerId` (vía lead o match). El flujo "autocrear lead" puede además enlazar lead↔cliente. |
| **Clientes (`Clientes.jsx`)** | `summary` pasa a basarse en `customerId`; el match por nombre queda solo como fallback legacy. Habilita "editar cliente" sin perder historial. |
| **PDF (`quotePdf.js`)** | Resolver cliente por `customerId` → luego `leadId` → luego nombre. |
| **OPs / Producción / Despacho / Garantías / Postventa** | Referencian `orderId`, no al cliente directo → heredan `order.customerId`. Impacto mínimo; revisar solo dónde muestran nombre. |
| **Contabilidad** | Tercero de CxC/CxP pasa a ser id real (mejora auxiliares por tercero; cf. TD-19). |

## Consecuencias
- **Más fácil:** editar cliente sin romper historial; auxiliares por tercero; migración a Firestore.
- **Más difícil:** disciplina en cada punto de creación; manejar "walk-in" sin cliente; resolver
  homónimos en el backfill.
- **A revisar luego:** unificar también el vínculo lead↔cliente (`linkedLeadId`/`linkedCustomerId`),
  hoy parcialmente poblado.

## Decisiones del usuario (2026-05-26)
- ✅ **Opción A** aprobada.
- ✅ **Walk-in:** crear el cliente automáticamente al **crear un pedido** sin match.
- ✅ **Display:** reflejar el nombre actual (resolver por `customerId`, fallback `clientName`).
- ✅ **Numeración:** placeholders de ADR-010 corridos a 012/013/014.

> **Matiz de implementación (cotizaciones):** una cotización es **pre-venta** (etapa de lead).
> Para no contaminar el embudo de Clientes con prospectos, B2 enlaza `customerId` en una
> cotización **solo si es resoluble** (lead con `linkedCustomerId`, o cliente existente por
> doc/nombre) y **NO** auto-crea cliente desde una cotización. El auto-crear aplica a **pedidos**
> (venta confirmada). Si el usuario prefiere auto-crear también desde cotización, se ajusta.

## Action items
1. [x] OK del usuario (Opción A + renumeración).
2. [ ] Rutina de migración idempotente (seed + localStorage), versionada, sin bump de `STORAGE_KEY`.
3. [ ] `Ventas.saveOrder`: resolver/crear `customerId`; ajustar `savePayment`/hooks contables.
4. [ ] Guardado de cotización: derivar `customerId` (solo si resoluble).
5. [ ] `Clientes.summary`: basar en `customerId` (nombre solo fallback).
6. [ ] Display por `customerId` con fallback a `clientName` (que el renombre se refleje).
7. [ ] Verificación: crear pedido → tiene `customerId`; renombrar cliente → su historial persiste.
