# VALIDACIÓN — Garantías a paridad Demo6 (Fase 3)

**Fecha:** 2026-05-27 · **Rama:** `main` (local, commits sin push) · **Motor:** React (`accountingEngine.js`), por decisión del usuario.
**Scope:** llevar el módulo Garantías de un CRUD básico (~30%) a paridad con `Castor_Dashboard_Demo6.html` (6798-7081), incluyendo el cableado contable que faltaba.

## Bloques implementados (commits granulares)

| Bloque | Qué | Commit |
|---|---|---|
| G1 | Modelo `warranties` extendido (diagnosticoAt, solucionAt, cierreAt, comunicaciones[], fotos[], generatedOpId, opCostos[], productId, qty, asesor) + migración idempotente `migrateWarrantyFields` | `3f1a68b` |
| G2 | Hook `postWarrantyCost` en `accountingEngine.js` + acción en AppContext (DB 519540 / CR 110510 caja \| 140505 almacén, cliente como tercero) | `ba8808e` |
| G3 | Detalle enriquecido: tarjetas Cliente/Pedido, cronología 4 fechas, estado, resolución, comunicaciones (alta inline), fotos mock, cerrar caso | `8499442` |
| G4 | OP de garantía (`order tipo:'garantia'`) + costos manuales (modal concepto/monto/fuente) → cada costo dispara `postWarrantyCost`; tabla + total | `a74fae9` |
| G5 | Modal "Nuevo caso" a paridad: asesor, selector Factura/Remisión que autollena cliente/pedido/customerId, product-picker por compras del cliente, 12 causales, asignar a taller | `be006b6` |

## Auto-validación

- ✅ `eslint` sin errores en los 4 archivos tocados (`migrations.js`, `AppContext.jsx`, `erpSeed.js`, `accountingEngine.js`, `Garantias.jsx`).
- ✅ `vite build` OK.
- ✅ **Preview MCP (localhost:5173), flujo contable crítico end-to-end** (0 errores de consola):
  - Abrir GAR-051 → panel con todas las secciones (cronología, comunicaciones, fotos, OP de garantía).
  - Estado → `abierta` habilita "⚙ Generar OP" → crea **OP-5005** (`tipo:'garantia'`, `estado:'produccion'`, `productId p1`).
  - "+ Agregar costo" (Cambio de tela, $200.000, caja) →
    - `warranty.opCostos` = `[{WCE-001, 200000, caja, by Alexander Vivas}]` ✅
    - `order.costosManual` = `[{Cambio de tela, 200000}]`, `order.total` = 200000 ✅
    - Asiento `warranty_cost`: **DB 519540 = 200000 (tercero "Jose Ramírez") / CR 110510 = 200000**, balanceado ✅
  - Modal "Nuevo caso": FAC-001 autollena Jose Ramírez/PED-1248; product-picker muestra solo lo comprado por el cliente (Butaca Serenity, Silla Atlanta); 12 causales; asesor/taller ✅

## Decisiones

- **Motor contable:** se extendió el motor React (`accountingEngine.js`), no el monolito `castor_accounting.js` (decisión del usuario para la fase de paridad).
- **Fotos:** mock (nombre autogenerado). La subida real de archivos es fase Supabase Storage.
- **`customerId` en la garantía:** se persiste (resuelto vía factura→pedido) para que `postWarrantyCost` use el cliente como tercero canónico.

## ⚠️ Hallazgo: colisión de IDs de asiento (pre-existente, NO tocado)

Al validar, el asiento de garantía nació **`JE-000001`**, **colisionando** con el "Saldo de apertura ejercicio 2026" (también `JE-000001`).

- **Causa:** el seed (`AppContext.jsx` counters) **no inicializa `counters.je`**, y `postJournalEntry` calcula el próximo id como `(counters.je || 0) + 1`. Así, el **primer asiento en vivo de cualquier hook** (postSale, postCustomerCollection, postWarrantyCost…) nace `JE-000001` y duplica la apertura.
- **Es pre-existente y transversal:** documentado como **TD-01 / ADR-003** en `src/lib/README.md`; afecta a Ventas (postSale) y a Tesorería igual que a Garantías. **No lo introduce esta entrega.**
- **No se tocó** porque vive en el motor/seed compartido (territorio cruzado con el otro desarrollador) y excede el scope de Garantías.
- **Fix recomendado (a confirmar):** inicializar `counters.je` al máximo `je` existente al hidratar el estado (o derivar el próximo id de `journalEntries` en `postJournalEntry`). Es un cambio chico pero de motor compartido → requiere acuerdo.

## Touchpoint con otros módulos

G4 crea órdenes `tipo:'garantia'` que aparecen en **Producción** (fiel a Demo6: las OP de garantía fluyen por producción). Es esperado.

## Pendientes / notas menores

- El selector "Asignar a taller" lista `Taller Interno` + empleados con `area==='Producción'`; en el seed actual no hay empleados con esa etiqueta exacta (cae elegante a solo "Taller Interno"). Verificar etiqueta de área de empleados si se quiere poblar.
