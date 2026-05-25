# `src/lib/` — Núcleo de dominio (puro)

Lógica de negocio **pura**: sin React, sin `localStorage`, sin DOM, sin red. Es el
activo más crítico del sistema y el más testeable. **Léelo antes de modificar
cualquier cosa contable.** Decisiones de fondo en [../../docs/adr/](../../docs/adr/);
flujos en [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).

## Archivos

| Archivo | Rol |
|---------|-----|
| `accountingEngine.js` | **Escritura** de partida doble: valida y arma asientos |
| `accounting.js` | **Lectura**: saldos, balances, ecuación contable, KPIs, nómina (preview) |
| `persistence.js` | Adaptador `localStorage` (única excepción a "sin I/O") |
| `format.js` | `fmtCOP`, fechas, `uid` — helpers de presentación/formato |

---

## `accountingEngine.js`

**Propósito:** convertir operaciones de negocio en asientos de partida doble
validados. Funciones puras: reciben el *slice* mínimo del estado (`ctx`) y
**devuelven un resultado, no mutan nada**.

**Entradas / salidas (contrato):**

```
postJournalEntry(payload, ctx) ─►
   { ok: true, journalEntry, lines, counters }   // éxito
 | { error, message }                             // validación fallida
 | { warning, journalId }                         // idempotencia (ya posteado)
```

- `payload`: `{ date, source, sourceId, concept|description, lines[], force?, status? }`
- `ctx`: `{ pucAccounts?, journalEntries, fiscalPeriods?, counters, bankAccounts? }`
- Hooks de dominio (mismo contrato): `postSale`, `postCustomerCollection`,
  `postSupplyPurchase`, `postSupplierPayment`, `postPayroll`, `postManualEntry`,
  `reverseJournalEntry`. `applyJournalResult(state, res)` aplica el resultado al
  estado de forma inmutable (lo usa `AppContext`).

**Dependencias:** `data/pucCatalog.js` (`PUC_BY_CODE`) y `format.js`
(`nowISO`, `today`). Nada más.

**Validaciones que SÍ funcionan:** cuadre DB≈CR (tolerancia 0.5), totales > 0,
línea sin cuenta, cuenta inexistente, línea con débito y crédito a la vez, línea
en cero, idempotencia por `source+sourceId`, período cerrado (si el período existe).

### ⚠️ Gotchas conocidos (de la auditoría / code-review)

| # | Gotcha | Detalle |
|---|--------|---------|
| 🔴 1 | **Validación de cuenta-título MUERTA** | El engine consulta `acc.type`/`acc.active`/`acc.requiresThirdParty`, pero el catálogo usa `level`/`activa` y **no** define esos campos. Resultado: se puede postear a cuentas título (nivel < 6), a cuentas "inactivas" y **sin tercero**, pese a que el código pretende impedirlo. Verificar antes de confiar en esas validaciones |
| 🔴 2 | **Colisión de IDs (`counters.je`)** | `counters` no trae `je` → el primer asiento en vivo nace `JE-000001`, duplicando la apertura (TD-01 / [ADR-003](../../docs/adr/ADR-003-slices-contables-reseed.md)) |
| 🟠 3 | **`postSale` no registra costo de venta** | Solo CxR/Ingreso/IVA; no descarga inventario ni reconoce COGS (el seed sí lo hace). Margen e inventario quedan inflados en ventas en vivo |
| 🟠 4 | **`postPayroll` clasifica mal las deducciones** | Salud/pensión del empleado se acreditan a `236505` (retención en la fuente) en vez de aportes por pagar del trabajador |
| 🟡 5 | **Período inexistente = sin control de cierre** | Si la fecha cae fuera de los períodos sembrados, el guard de "cerrado" se omite |
| 🟡 6 | **Retorno `warning` ambiguo** | La idempotencia devuelve `{warning}` (ni `ok` ni `error`); callers que solo ramifican en `ok`/`error` **no dan feedback** ante un reposteo |
| 🟡 7 | **Tolerancia `eqMoney` = 0.5** | Medio peso de holgura puede enmascarar descuadres reales (TD-08 / [ADR-007](../../docs/adr/ADR-007-dinero-como-float.md)) |
| 🟡 8 | **Solo 3 hooks cableados a UI** | `postSupplyPurchase/SupplierPayment/Payroll` y `reverseJournalEntry` no se disparan desde ninguna vista (TD-06) |

---

## `accounting.js`

**Propósito:** derivar reportes contables **on-read** desde asientos + líneas. No
persiste saldos; todo se recalcula ([ADR-009](../../docs/adr/ADR-009-balances-derivados-on-read.md)).

**Funciones clave (entradas → salida):**

- `getSaldosPorClase(lines, entries, period)` → saldos por clase 1–7 + `ecuacionCuadra`.
- `buildBalancePrueba(lines, entries, period)` → filas con saldo inicial/mov/final + `cuadra`.
- `getSaldoCuenta(code, lines, entries, period)` → saldo de una cuenta (agrega hijos por prefijo si es padre).
- `getKPIs(...)`, `groupJournal(...)`, `calcPayrollPreview(employees, params)`.

**Dependencias:** `data/pucCatalog.js`. Nota: usa **`PUC_BY_CODE` (catálogo
estático)**, no `state.pucAccounts` — divergiría si alguien editara cuentas en runtime.

### ⚠️ Gotchas conocidos

| # | Gotcha | Detalle |
|---|--------|---------|
| 🟠 1 | **Ecuación puede romperse por bug, no por dato** | `getSaldosPorClase` excluye `level < 6`; combinado con la validación-título muerta del engine, un asiento a cuenta padre descuadra la ecuación de forma invisible |
| 🟡 2 | **`buildBalancePrueba` descarta cuentas desconocidas** | `if (!acc) continue` oculta líneas a códigos fuera del catálogo → el balance puede no cuadrar contra el Libro Diario. Además no filtra por `level` (inconsistente con `getSaldosPorClase`) |
| 🟡 3 | **KPIs con códigos de banco hardcodeados** | `saldoBancos` solo suma `111005/111010/111015/111020`; un banco con otro `pucCode` no entra |
| 🟠 4 | **Nómina: desviaciones de normativa** | Aux. transporte usa `<` en vez de `<=` 2 SMMLV; la provisión de vacaciones incluye aux. transporte (no debería); falta tope/piso de IBC (25/1 SMMLV). Es **preview**, no liquidador oficial — validar antes de uso legal |

> ✅ **Correcto y verificado:** la exoneración Ley 1607 (exonera salud-empleador,
> SENA e ICBF cuando `base < 10 SMMLV`, manteniendo caja de compensación) está
> bien implementada.

---

## `persistence.js` y `format.js`

- `persistence.js`: adaptador `localStorage` (clave `castor_cphora_v7`). **`save()`
  traga errores de cuota en silencio** (TD-12). Pensado para cambiarse a backend,
  pero su interfaz es **síncrona** ([ADR-001](../../docs/adr/ADR-001-persistencia-solo-cliente.md)).
- `format.js`: `fmtCOP` (es-CO), fechas y `uid`. Expone `DEMO_TODAY = '2026-04-16'`
  (fecha fija para escenarios reproducibles). `today()`/`nowISO()` introducen una
  dependencia temporal — al testear el engine, inyectar la fecha para reproducibilidad.

## Al modificar este directorio

1. Mantener las funciones **puras** (sin React/IO/DOM salvo `persistence.js`).
2. Si cambias el contrato de retorno, actualiza los callers en `store/AppContext.jsx`
   y las vistas (`Ventas.jsx`, `AsientosManuales.jsx`).
3. Estos archivos son el objetivo #1 del plan de testing — acompaña el cambio con tests.
