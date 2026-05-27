# VALIDACIÓN — Contabilidad C2: Cierres + Nómina (Fase 3)

**Fecha:** 2026-05-27 · **Rama:** `main` (local) · **Motor:** React (escritura).
**Scope:** **C2a** (cierre/reapertura de periodo) + **C2c** (contabilización de nómina). El cierre fiscal anual (**C2b**) queda para una pieza aparte.

## C2a — Cierre/reapertura de periodo

- **Persistencia:** se sacó `fiscalPeriods` del re-seed de `ACCOUNTING_SEED` (en `AppContext`) y se movió a los editables persistidos (junto a `bankAccounts`/`companyTaxProfile`/`payrollParams`). Los periodos son estado editable, no catálogo estático.
- **Subvista `Cierres.jsx`:** lista los periodos con estado, nº de asientos y movimiento, y botones **Cerrar/Reabrir** (`update('fiscalPeriods', id, {estado})`). Cableada en `nav.js` + `App.jsx`.
- El bloqueo de posteo en periodo cerrado ya lo aplica el motor (`postJournalEntry → closed_period`).

## C2c — Contabilización de nómina

- Botón **"Correr y contabilizar nómina"** en `ConfiguracionNomina` → `postPayroll`. Mapeo para que cuadre el asiento: `totalSalarios = base + aux` (devengado bruto), `totalNeto = neto`, así la retención (deducciones del empleado = `base+aux − neto`) sale positiva y la partida doble balancea.
- **Idempotente por periodo:** `sourceId = NOM-<YYYY-MM>` → re-correr el mismo periodo no duplica el asiento.

### Fix colateral del motor (necesario para C2c)
`postPayroll` usaba **251005** (provisiones) y **236505** (retención laboral), ausentes del catálogo PUC React → un asiento nuevo fallaba con `unknown_account`. Correcciones mínimas:
- Motor: `251005 → 261005` ("Cesantías/prima/vacaciones provisión", que **sí existe** y es la que usa el seed).
- Catálogo: se **agregó** `236505` ("Rentas de trabajo · retención laboral") bajo 2365.
- La retención laboral agrupa las deducciones del empleado (salud+pensión+retefuente) en una sola cuenta — simplificación del motor React; el split fino corresponde a "Mapeos operación→cuenta" (C3).

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores · `vite build` OK.
- ✅ **C2a cierre + persistencia:** cerrar Abril 2026 → `estado='cerrado'`; **tras recargar la página sigue cerrado** (antes del fix se reseteaba al seed).
- ✅ **C2a bloqueo:** `postJournalEntry` con fecha en un periodo cerrado devuelve `closed_period` ("Periodo 2026-04 cerrado").
- ✅ **C2c idempotencia:** abril ya viene con nómina en el seed (JE-000010, modelo rico) → el botón devuelve `already_posted` sin duplicar.
- ✅ **C2c creación (periodo nuevo):** `postPayroll` para 2099-12 genera asiento **balanceado** (TD=TC=$37.897.872): DB 510506 / CR 250505 (neto) + 237005 (aportes) + 261005 (provisiones) + 236505 (retención). Cuentas resuelven OK.

## Pendiente de Contabilidad
- **C2b:** cierre fiscal anual (cancelar resultados 4/5/6/7 → 360505 → 370505).
- **C3:** mapeos operación→cuenta, reglas tributarias (CRUD), numeración de documentos.
- **C4:** hub de exportación (FomPlus — requiere layout) + dashboard de tests.

## Flag pre-existente (coordinar con el otro dev)
Los **asientos en vivo** (`journalEntries`/`journalLines`) se re-siembran del código en cada `hydrate` (`ACCOUNTING_SEED`), por lo que **no persisten entre recargas** — afecta a AsientosManuales, postSale (Ventas), Garantías, Tesorería y la nómina recién contabilizada. Es transversal y pre-existente; **no se tocó** (decisión del usuario: flag y coordinar). `fiscalPeriods` sí se hizo persistente porque era requisito de C2a.
