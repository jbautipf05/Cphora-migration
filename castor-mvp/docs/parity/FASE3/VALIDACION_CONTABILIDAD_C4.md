# VALIDACIÓN — Contabilidad C4: Hub de exportación + Centro de pruebas (Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` (local · pendiente push) · **Motor:** React.
**Scope:** **C4** — dos vistas nuevas que cierran el bloque Contabilidad de Fase 3:
- **Hub de Exportación** (CSV / JSON / Excel-CO sobre 6 reportes) — espejo simplificado de `renderExportHub` (castor_accounting.js:4784-5597).
- **Centro de Pruebas** (18 unit tests del motor React, runner en navegador) — espejo de `renderTestsDashboard` (castor_accounting.js:6475-6519).

**Decisión documentada sobre FomPlus:** la spec v1.1 §7.15 lo establece como **único exportador ERP soportado**, pero el layout oficial está pendiente de confirmar con el proveedor. En este commit el slot queda **visible con badge "Pendiente layout"** — no se implementa el formato hasta tener la especificación oficial. Se mantiene compatibilidad con los 3 genéricos (CSV/JSON/Excel) que ya cubren todas las vistas.

## Implementado

| Pieza | Archivo |
|---|---|
| Helpers de export: `rowsToCsv`, `rowsToJson`, `downloadText`, `fmtNumberCOP`, `buildExportRows` (6 vistas), `exportView` dispatcher | `src/lib/exportHelpers.js` |
| Vista del hub: grid de cards (Libro Diario, Balance de Prueba, Cartera, CxP, Aux IVA, Aux Retenciones) + filtro de periodo + slot FomPlus | `src/views/HubExportacion.jsx` |
| Suite de 18 tests del motor con fixtures aisladas + runners `runTest(id)` / `runAllTests()` | `src/lib/engineTests.js` |
| Vista del centro de pruebas: tabla con resultado por test + duración + botones Ejecutar uno / todos | `src/views/CentroPruebas.jsx` |
| Wiring: subvistas `exportar` y `pruebas-contables` en CONTAB_SUBVIEWS + PAGE_META + rutas | `src/nav.js`, `src/App.jsx` |

### Vistas exportables (6)
1. `journal_entries` — Libro Diario (una fila por línea de asiento, con tercero/CC/débito/crédito).
2. `balance_prueba` — Saldo inicial + movimientos + saldo final por cuenta (reusa `buildBalancePrueba` de `accounting.js`).
3. `cartera` — Facturas con saldo, días vencidos y tramo de aging (corriente / 1-30 / 31-60 / 61-90 / >90).
4. `cxp` — OCs con saldo y aging.
5. `aux_iva` — Movimientos de 240805 (IVA generado) y 240810 (descontable).
6. `aux_retenciones` — Movimientos de 236540/525/515/701/801 (practicadas) y 135515/517/518 (recibidas).

### Formatos
- **CSV** · BOM UTF-8 + separador `,` · escape de comillas y newlines.
- **Excel** · BOM UTF-8 + separador `;` · extensión `.xls` (Excel-CO abre directo).
- **JSON** · array de objetos con headers como keys, pretty-printed (indent 2).

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores (1 warning preexistente `react-refresh` en AppContext) · `vite build` OK.
- ✅ **Render del hub:** breadcrumb `Finanzas · Contabilidad · Exportación`; 6 cards con título + descripción + contador de filas + 3 botones (CSV/JSON/Excel); panel "FomPlus (pendiente)" con badge amber; filtro de periodo funcional.
- ✅ **Contadores:** Libro Diario muestra 44 filas estimadas (líneas del seed); Cartera/CxP/Aux IVA muestran 3; Aux Retenciones muestra 1 (la línea 236540 del seed).
- ✅ **Click CSV Libro Diario:** sin errores de consola, la descarga se dispara vía blob URL (anchor con `download` attribute).
- ✅ **Centro de pruebas:** 18 tests registrados; "Ejecutar todo" pasa **18/18 PASS** en ~50ms.

### Cobertura de la suite de tests (18)

| ID | Qué cubre |
|---|---|
| `t_pje_balanced` | postJournalEntry acepta partida doble balanceada |
| `t_pje_unbalanced` | rechaza `unbalanced` |
| `t_pje_unknown_account` | rechaza `unknown_account` |
| `t_pje_closed_period` | rechaza `closed_period` (fecha en 2026-01) |
| `t_pje_too_few_lines` | rechaza con < 2 líneas |
| `t_pje_idempotency` | segundo post con mismo `(source, sourceId)` devuelve `warning='already_posted'` con mismo JE id |
| `t_postSale_factura` | DB 130505 / CR 412035 / CR 240805 balanceado |
| `t_postSale_remision` | sin línea de IVA |
| `t_postCustomerCollection` | DB banco / CR 130505 |
| `t_postSupplyPurchase` | DB 140505+240810 / CR 236540+220505 (1000 + 190 - 25 = 1165 neto) |
| `t_postSupplierPayment` | DB 220505 (con OC) / CR banco |
| `t_postBankAdjustment_positive` | DB banco / CR 425095 |
| `t_postPayroll` | gasto = 13.200 (salarios + aportes + provisiones) balanceado |
| `t_reverse_je` | reverseJournalEntry crea espejo (DB↔CR) balanceado |
| `t_closePeriod_empty` | periodo sin movimiento P&L → `empty=true` sin JE |
| `t_closePeriod_generates_je` | con venta de 1000 → cancela 412035, CR 360505 1000, `utilidad=1000` |
| `t_closeFiscalYear` | tras cerrar abril traslada 360505 → 370505 (DB 360505 / CR 370505 por la utilidad anual) |
| `t_reopenPeriod_tolerates_missing_je` | reopenPeriod con `closingJournalEntryId=null` reabre sin fallar (paridad con el flag de no-persistencia) |

## Fix colateral descubierto por el centro de pruebas

La primera corrida arrojó **4 fallos en cascada**: `t_postSale_factura`, `t_postSale_remision`, `t_closePeriod_generates_je`, `t_closeFiscalYear`. Causa raíz única:

**`postSale` defaulted a la cuenta `'413505'` que NO existe en el catálogo PUC React** (el catálogo está curado para el MVP; el código `413505` "Comercio al por mayor" sí está en el monolito). Cualquier `postSale` sin `cuentaIngreso` explícito fallaba con `unknown_account` → no se generaba el asiento → los tests aguas abajo (closePeriod, closeFiscalYear) no veían movimiento P&L.

**Fix:** `accountingEngine.js:224` → `cuentaIngreso default '413505' → '412035'` (que existe en `pucCatalog.js` como "Industria de muebles"). Mismo patrón que los fixes previos `510550→539595` (C2c postSupplierPayment) y `251005→261005` (C2c postPayroll).

Tras el fix: **18/18 PASS**. Este hallazgo confirma el valor del centro de pruebas: detectó un bug latente que solo se habría visto cuando un usuario creara una factura real desde la UI sin pasar `cuentaIngreso` explícito.

## Pendiente

- **C4 + FomPlus:** confirmar el layout oficial con el proveedor para implementar el formato definitivo. El slot ya está visible en el hub con la nota correspondiente.
- **Refactor posterior** (fuera del scope C4): cablear el motor a leer `accountingMappings` / `taxRules` (cierre del bloque C3 referenciado en TD-07). Con eso, `postSale` leerá la cuenta de ingreso del slice `accountingMappings.sale_invoice.revenue` (en vez del default hardcoded) y `postSupplyPurchase` leerá las tasas de `taxRules` (en vez del 19% / 2.5% fijos).
- **Tests adicionales sugeridos** (no críticos para el MVP): postWarrantyCost, postBankAdjustment con delta negativo, casos límite de líneas con 0/0 o ambos lados positivos.

## Bloque Fase 3 contabilidad — cerrado

| Bloque | Commits |
|---|---|
| C1 reportes (Cartera, CxP, Aux Retenciones) | pre-existentes |
| C2a cierres de periodo (toggle estado) | `e2ce19e` |
| C2b cierre fiscal (genera asiento de cancelación) | `3e54dce` |
| C2c contabilizar nómina | `c7b7858` |
| C3a mapeo de cuentas por evento | `f906fb7` |
| C3b reglas tributarias | `e617166` |
| C3c numeración de documentos | `21641cd` |
| **C4 hub de exportación + centro de pruebas** | **este commit** |
