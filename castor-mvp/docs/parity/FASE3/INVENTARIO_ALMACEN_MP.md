# Inventario / auditoría — Almacén (Materia Prima) · `src/views/AlmacenMP.jsx`

Estado de paridad del módulo Almacén MP vs Demo6, y hallazgos AMP-xx.

## Polish (rama `almacen-polish`, 6 commits)

- **C1** (⚠): validación de ítem incompleto (OC/Salida) + el **backdrop del Modal ya no cierra**
  (compartido; Escape se mantiene). AMP-02 excluido del check (qty=0 = recepción parcial).
- **C2** (⚠): modal Nuevo Insumo con bloques Entrada/Salida → `convFactor`. **Costeo BOM
  intacto** (cost×qty; conv/unitOut solo display).
- **C3-5**: detalle/tarjetas de proveedor; campos Nuevo Proveedor (Actividad Económica*, País*,
  NIT/RUT, Correo); foto de entrada como botón "Adjuntar" + detalle de entrada.
- **C6**: OC qty default 0, placeholder de notas, bodega destino en línea completa; asteriscos;
  botones de alta "Crear".
- **⛔ PENDIENTE DE DECISIÓN — relabel bodegas a "Insumos 1/2":** el plan del C6 lo pedía, pero
  **contradice H-102** (el cliente pidió "Almacén #1/#2", ya en `main`) y **`migrateWarehouseLabels`
  lo anularía** (fuerza "Almacén #1/#2" sobre cualquier code que empiece con "Insumos"). No
  ejecutado; requiere confirmación de si se revierte H-102 (implicaría también revertir esa
  migración). Ver reporte.

## Auditoría del módulo (estado actual)

| Capacidad | Estado | Nota |
|-----------|--------|------|
| KPIs (proveedores, insumos, OC abiertas, valor, bajos) | ✅ | — |
| Tarjetas de bodegas MP (`tipo:'insumos'`) con SKUs/unidades/valor/críticos | ✅ | H-102/H-103 |
| Tab **Insumos**: listado + filtros + **alta (+ Insumo)** | ✅ | `saveSupply` |
| Tab **Proveedores**: listado + filtros + **alta (+ Proveedor)** | ✅ | `saveSupplier` |
| Tab **Órdenes de Compra**: listado + filtros + detalle (SlidePanel) | ✅ | solo lectura hasta AMP-01 |
| Tab **OC: alta (+ Nueva orden de compra)** | ✅ **AMP-01** | — |
| Tab **Movimientos**: listado de `stockMoves` | ✅ | solo lectura |
| Tab **Entradas: recepción de OC → stock + costo + avance OC + ledger** | ✅ **AMP-02** | — |
| Tab **Salidas: consumo a producción (BOM auto) / devolución → ajusta stock** | ✅ **AMP-03** | este hallazgo |

> **Almacén MP core COMPLETO:** OC (AMP-01) → Entradas (AMP-02) → Salidas (AMP-03). Ambos slices
> muertos (`supplyReceipts`, `supplyIssues`) resucitados.

---

## AMP-01 — Alta de Orden de Compra · ✅ RESUELTO

**Ubicación:** `src/views/AlmacenMP.jsx`. Espejo de Demo6 `openPurchaseOrderForm` (2757) /
`savePurchaseOrder` (~2840-2863).

El tab "Órdenes de Compra" era solo lectura; se agregó el alta.

**Implementado:**
- Botón **"+ Nueva orden de compra"** en el toolbar del tab OC (estilo de +Insumo/+Proveedor).
- Modal **"📝 Nueva Orden de Compra"** (`Modal`/`Field`/`Input`/`Select`/`FormGrid`):
  - Campos: **Proveedor\*** (select `suppliers`), **Fecha emisión\*** (default `today()`),
    **Fecha esperada\*** (default `today()+15`), **Bodega destino\*** (select de bodegas
    `tipo:'insumos'`), **Notas**.
  - **Ítems multi-línea**: select de insumo (`supplies`) → al elegir auto-rellena **unidad**
    (`supply.unit`, readonly) y **costo unitario** (`supply.cost`, editable); **cantidad**;
    **total de línea** (`qty×cost`) en vivo. "+ Agregar ítem" y "×" por fila. **Total OC** en
    vivo (suma de líneas).
- Handler `saveOC` → `add('purchaseOrders', …)` con el **shape exacto del seed**
  (`erpSeed.js:62`): `{ id, supplierId, supplier:<nombre>, date, expectedDate, warehouseId,
  estado:'abierta', total, createdBy, notes, items:[{ supplyId, qty, unit, cost, received:0,
  status:'pendiente' }] }`.

**Decisiones técnicas:**
- **Id:** `nextId('OC','oc',0)`. El seed deja `counters.oc = 3003`, así que la primera OC nueva
  es **`OC-3004`** (sin colisión con `OC-3001..3003`). Verificado en test.
- **Validación (gate estilo REG-H035):** proveedor obligatorio + bodega obligatoria + **≥1 ítem
  válido** (insumo + `qty>0`); los ítems sin insumo o con `qty≤0` se descartan. Toast `warn` si
  falla.
- `supplier` se denormaliza al **nombre** del proveedor (como el seed), además de `supplierId`.
- Bodega destino filtrada a `tipo:'insumos'` (las OC de MP entran a Almacén #1/#2, no a PT).

**No se tocó:** `submitSale`, `PROD_ESTADOS`, validación de Ventas, `vite.config.js`, hooks
contables. **Entradas/Salidas** quedan para **AMP-02/AMP-03**.

**Limpieza:** se quitaron 2 imports muertos preexistentes (`Badge`, `Toolbar`) para dejar el
archivo en `eslint` 0.

**Validación:** test node de `saveOC` **10/10** (4 gates de validación, id `OC-3004`/`OC-3005`
sin colisión, filtrado de ítem inválido, shape exacto de OC e ítem, total = suma de líneas) +
`eslint src/views/AlmacenMP.jsx` **0** + `vite build` **OK**. No probado en vivo (Preview MCP roto).

---

## AMP-02 — Entrada de insumos (recepción contra OC) · ✅ RESUELTO

**Ubicación:** `src/views/AlmacenMP.jsx` (+ `AppContext.jsx`: counter `rcp`). Espejo de Demo6
`openSupplyReceiptForm` (2236) / `saveSupplyReceipt` (2430) / `renderAlmacenEntradas` (2191).

Cierra el flujo de compra: recibir mercancía → sube stock de insumo, actualiza costo "última
entrada", avanza la OC y **resucita `supplyReceipts`** (antes estado muerto / sin productor).

**Implementado:**
- **Counter `rcp:0`** en `buildInitialState().counters` (AppContext:93); ids vía
  `nextId('REC','rcp',3)` → **REC-001**, REC-002, …
- Botón **"+ Registrar entrada"** + modal **"📥 Entrada de insumos"**: seleccionar OC (estado ≠
  cerrada/cancelada) → carga sus ítems con **saldo** (`qty - received`) y precarga la cantidad a
  recibir con el saldo (editable). Campos: Remisión, Fecha (`today()`), Bodega destino (de la OC o
  select de bodegas `tipo:'insumos'`), **Foto de remisión (obligatoria)**, checkbox "Cerrar OC
  (parcial)". Por ítem: insumo+unidad readonly, **costo unit. editable** (default el de la OC),
  cantidad recibida, total de línea; **total** en vivo.
- **`saveReceipt`** en **UN `setState` atómico** (cascada B2): crea `supplyReceipts[{ id,
  purchaseOrderId, supplierId, date, remision, warehouseId, photo:{filename}, items:[{supplyId,
  qty, cost, unit}], registeredBy }]`; por ítem `supply.stock += qty` y si `cost>0 && ≠ actual`
  → `supply.cost = cost` + `lastCostUpdate`/`lastCostFromReceipt`; en la OC `item.received += qty`
  y `status = received≥qty?'completo':received>0?'parcial':'pendiente'`; **estado OC**: todo
  completo → `cerrada`; checkbox → `cerrada`; si no → `parcial`.
- **Tab "Entradas"** que lista `supplyReceipts` (REC, fecha, OC, proveedor, insumos×qty, total,
  remisión, foto, por) → **no es write-only**.
- **Validación (gate):** OC obligatoria + foto obligatoria + ≥1 ítem `qty>0` (ítems `qty≤0` se
  descartan); toast `warn`.

**Diferido (documentado, NO hecho):**
- **NO se crea `stockMove`** para insumos — Demo6 tampoco lo hace; el ledger de entrada es
  `supplyReceipts`.
- **NO `postSupplyPurchase`** (hook contable) — fuera de alcance.
- **NO el flex de telas +10m** (Demo6 2471-2482): si lo recibido supera el saldo, simplemente
  `received += qty` (status `completo`), sin ampliar la OC. Follow-up mediano.

**Validación:** test node `saveReceipt` **14/14** (3 gates; REC-001/REC-002 sin colisión; stock
+qty; costo "última entrada"; received/status por ítem; OC abierta→parcial→cerrada; closePartial;
`supplyReceipts` creado y visible) + `eslint` 0 errores + `vite build` OK.

## AMP-03 — Salida de insumos a producción + devoluciones · ✅ RESUELTO

**Ubicación:** `src/views/AlmacenMP.jsx` (+ `AppContext.jsx`: counter `iss`). Espejo de Demo6
`openSupplyIssueForm` (2514) / `rebuildIssueBOM` (2586) / `saveSupplyIssue` (2641).

Cierra el core de Almacén MP y **resucita `supplyIssues`** (antes estado muerto).

**Implementado:**
- **Counter `iss:0`** en `counters`; ids `nextId('SAL','iss',3)` → **SAL-001**, SAL-002, …
- Botón **"+ Registrar salida"** + modal **"📤 Salida/Devolución de insumos"**: tipo
  (salida/devolución), fecha (`today()`), bodega origen (`tipo:'insumos'`), **buscador + checkboxes
  de OPs** (verificadas, no stock, no terminales — espejo de `renderIssueOpList:2569`). Al marcar
  OPs, **auto-agrega los insumos del BOM** (`Σ bom.qty × order.qty` por insumo, filas marcadas
  "BOM"); permite también **ítems manuales**. Por ítem: insumo → unidad (readonly) + costo (última
  entrada) + cantidad + subtotal en vivo; total.
- **`saveIssue`** en **UN `setState` atómico**: crea `supplyIssues[{ id, type, date, warehouseId,
  orderIds, items:[{supplyId, qty, unit}], registeredBy }]`; ajusta `supply.stock += (devolución ?
  +qty : −qty)`.
- **Tab "Salidas"** que lista `supplyIssues` (SAL, tipo, fecha, OPs, insumos×qty, valor, por) →
  **no es write-only**.
- **Validación (gate):** ≥1 ítem `qty>0`; si `type==='salida'`, **stock suficiente por ítem**
  (`supply.stock ≥ qty`) o toast `error` y aborta (la devolución NO valida stock).

**Diferido (documentado, NO hecho):**
- **Hooks contables** `postRawMaterialConsumption` / `postRawMaterialReturn` (Demo6 2661-2662):
  Contabilidad fuera de alcance (forward-reference).

**Validación:** test node `saveIssue` **9/9** (BOM auto 1 OP + multi-OP; gate; guard de stock en
salida; salida descuenta; devolución suma; SAL-001/SAL-002 sin colisión; devolución sin guard) +
`eslint` 0 errores + `vite build` OK.

## Pendientes (roadmap Almacén MP)
- **AMP-02 flex telas** (diferido): ampliar la OC cuando se recibe más metros de tela que el saldo.
- **Costo real en Auditoría:** ahora que `supplyIssues` existe (AMP-03), las columnas "Costo
  real"/"Desv." del cierre de OP (EX-F3-02, hoy en 0) podrían calcularse desde los consumos reales
  (`supplyIssues` por `orderId`). Follow-up.
- **Hooks contables** de Almacén MP (compra/consumo/devolución de MP) cuando se aborde Contabilidad.
