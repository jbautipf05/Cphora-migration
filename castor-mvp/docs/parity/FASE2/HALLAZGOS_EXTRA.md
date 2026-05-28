# Hallazgos extra detectados durante Fase 2 (NO tocar — registro)

Hallazgos no listados en `INVENTARIO_FASE2.md`. Se anotan SIN modificar (regla operativa 4).

---

## EX-F2-01 — Copia duplicada de `fmtDate` en `widgets.jsx` (clase B3) · descubierto en H-021/H-017

**Ubicación:** `src/components/widgets.jsx:5-10`.

`widgets.jsx` define su propia `fmtDate` con `day: '2-digit'` (cero a la izquierda), además
de re-implementar `daysUntil` con `DEMO_TODAY` hardcodeado. Es una copia paralela de los helpers
de `src/lib/format.js` (la fuente única consolidada en B3/TD-26). El fix de **H-021** (paridad de
fechas con Demo6, `day:'numeric'`) se aplicó solo a `lib/format.js`; cualquier vista que importe
`fmtDate` desde `widgets.jsx` seguirá mostrando días con cero a la izquierda → divergencia con
Demo6 y con Clientes.

**Por qué no se toca ahora:** fuera del alcance de los hallazgos del inventario; tocarlo afecta
módulos aún no revisados (Fase 3+). Es de la misma clase que B3 (de-dup de helpers).

**Recomendación:** unificar `widgets.jsx` para re-exportar/usar `lib/format.js` (eliminar la copia),
junto con los CR diferidos de de-dup. Candidato a Fase 6 o a una Fase 1.5-bis si urge la paridad
de fechas en otros módulos.

---

## EX-F2-02 — `paid%` del seed no respaldado por registros de pago [DESCUBIERTO EN VALIDACIÓN H-034]

**Ubicación:** `src/data/erpSeed.js` (ORDERS) + `Ventas.savePayment` (`src/views/Ventas.jsx`).

Varias órdenes del seed traen `paid: N%` sin registros `PAYMENTS` que sumen ese porcentaje
(p.ej. `PED-1253` paid:50 sin ningún PAG; `PED-1245` paid:60 con `PAG-501` de 9.180.000 que supera
el total 8.500.000). `savePayment` **recalcula** `order.paid = round(Σ pagos del pedido / total)`,
ignorando el `paid` inicial del seed. Efecto: al registrar el primer abono vía "+ Pago" (inline o
detalle), el `paid%` "salta" al valor derivado de los registros (puede bajar o subir respecto al seed).

**Severidad:** baja — NO es bug crítico clase B2 (no hay crash ni pérdida de datos). Es comportamiento
**preexistente** a H-034 (la lógica vive en `savePayment`, usada también por el botón del detalle desde
antes). H-034 solo agrega un disparador inline a la misma función.

**Por qué no se toca:** fuera del inventario; tocar la consistencia seed↔pagos o la fórmula de `paid`
es un cambio de datos/lógica que requiere OK. Demo6 modela los pagos con `pedidoId` y suma confirmados,
con su propia consolidación — reconciliarlo es trabajo aparte.

**Recomendación:** o bien sembrar registros `PAYMENTS` coherentes con cada `paid%`, o bien que
`savePayment` parta del `paid` existente + delta. Evaluar en Fase 6 / corrección técnica.

---

## EX-F2-03 — Flujo cotización→venta sin prefill [DESCUBIERTO EN VALIDACIÓN EXHAUSTIVA pre-merge]

**Ubicación:** `src/views/Cotizaciones.jsx:290` (botón "→ Crear venta").

El botón "→ Crear venta" del detalle de cotización (a) solo aparece para cotizaciones **aceptadas** y
(b) solo **navega** a Ventas (`onNavigate('ventas')`); NO abre el modal de Nueva Venta (H-035) precargado
con el cliente y los ítems de la cotización (como hace `openSaleForm(quoteId)` en Demo6:5683).

**Por qué no se toca:** fuera del inventario de Fase 2 (H-035 se especificó abriéndose desde Ventas, sin
prefill desde cotización). No es bug; es una feature no incluida.

**Recomendación:** Fase 3 — pasar `quoteId` a `NuevaVentaModal` y precargar cliente + ítems (NuevaVentaModal
ya soporta items[]; faltaría el wiring de prefill). Reutilizable el patrón de Demo6.

**SCOPE AÑADIDO (decidido en EX-F2-04, 2026-05-26):** cuando se implemente este flujo
cotización→venta, debe incluir el **paso-4 retroactivo**: si al crear la venta desde una cotización se
auto-crea un cliente nuevo (`Ventas.submitSale`), actualizar retroactivamente el `customerId` de la
cotización origen (que estaba en `null` por ser pre-venta). Hoy ese código NO existe porque "→ Crear
venta" solo navega y las ventas nuevas se crean con `quoteId: null` (`Ventas.jsx:131,148`) — construirlo
en EX-F2-04 habría sido código muerto. Vive naturalmente acá, donde sí hay flujo cotización→venta. Con
esto, la cascada de B2 (nombre por `customerId`) alcanzaría también las cotizaciones que originaron ventas.

---

## EX-F2-04 — Sin UI de edición de cliente [DESCUBIERTO EN VALIDACIÓN EXHAUSTIVA pre-merge]

**Ubicación:** `src/views/Clientes.jsx` (detalle de cliente / SlidePanel).

El detalle de cliente no tiene acción de editar (solo cierre ✕ y "+ Nota"). No se puede cambiar nombre,
teléfono, etc. de un cliente desde la UI. (La resolución de nombre por `customerId` — B2 — sí funciona:
verificado mutando el estado y confirmando que el pedido refleja el nombre nuevo sin cambiar el FK.)

**Por qué no se toca:** editar clientes no fue hallazgo de Fase 1 ni de Fase 2 (no está en el inventario).

**Recomendación:** Fase 3 — modal de edición de cliente (reutilizable parte del bloque Cliente de H-035.1).

**✅ RESUELTO en Fase 3 (2026-05-26).** Implementado como mejora deliberada (Demo6 tampoco edita
clientes) para poder ejercer B2 desde la UI. Solución: edición **inline** en el SlidePanel (no modal),
con cascada acotada del nombre a `orders`+`quotes` por `customerId` (B2 completo). Ver
`docs/parity/FASE3/VALIDACION_EX_F2_04.md` y `PROPUESTA_EDICION_CLIENTE.md`.

---

## EX-F2-05 — Conversión quote→venta no enlaza cliente↔lead ni avanza estado del lead [DETECTADO EN AUDITORÍA PRE-FASE 3] · ✅ RESUELTO en Fase 2.5.1

**Ubicación:** `src/views/Ventas.jsx` `submitSale` (bloque de resolución/creación de cliente).

- **Naturaleza:** gap heredado de H-035 (Fase 2) que EX-F2-03 volvió alcanzable y rutinario desde la UI.
- **Comparación con Demo6:** `saveSale` línea **6004** setea `customer.linkedLeadId = quote.leadId`;
  **6015** lo backfillea en cliente existente; **6180** `if (q?.leadId) l.estado='ganado'`.
- **Estado React previo:** cliente creado con `linkedLeadId=null`; el lead quedaba en su estado original
  (p.ej. "En gestión"); cliente↔lead desconectados → `resolveCustomerId(leadId)` (`migrations.js:16`)
  devolvía `null` para ese lead (debilita B2).
- **Severidad:** media (no crítico, no bloquea, sin crash/pérdida de datos; rompe paridad de embudo y B2).

**✅ Fix (Fase 2.5.1, 2026-05-26):** en `submitSale`, dentro de **un único `setState` atómico** (mismo
principio que la cascada B2 de `updateCustomer`), en **toda** conversión quote→venta con `leadId`
(decisión del usuario: fiel a Demo6, no solo cuando se crea cliente nuevo):
- cliente nuevo → `linkedLeadId = srcQuote.leadId`; cliente existente → backfill `linkedLeadId` si falta;
- `lead.estado = 'Compro'` (enum del seed React; Demo6 usa `'ganado'`) — siempre, idempotente;
- `lead.linkedCustomerId = lead.linkedCustomerId || customerId` (bidireccional, necesidad de React por
  ADR-011; Demo6 no lo hace);
- (se mantiene el paso-4: `quote.customerId`).
Validado E2E (5 tests) en `docs/parity/FASE3/VALIDACION_EX_F2_05.md`.

---

## EX-F2-06 — `quote.pedidoId` / `quote.orderId` no se setean en conversión quote→venta [DETECTADO EN AUDITORÍA EX-F2-05]

**Ubicación:** `src/views/Ventas.jsx` `submitSale`.

- **Comparación con Demo6:** `saveSale` línea **6179**: `q.pedidoId = pedidoId; q.orderId = createdIds[0]`
  (link cotización→pedido). React solo setea el inverso (`order.quoteId`), no el directo.
- **Consumidores actuales en React:** **ninguno** (verificado por grep en `Cotizaciones.jsx`/`quotePdf.js`).
- **Severidad:** baja (sin impacto funcional actual).
- **Plan:** NO arreglar ahora. Registrar como deuda; reevaluar cuando un módulo de Fase 3+ lea estos campos.

---

## EX-F2-07 — La venta no reserva `finishedStock` ni registra `stockMoves` para ítems de stock [DETECTADO EN AUDITORÍA DE CIERRE EX-F2-05]

**Ubicación:** `src/views/Ventas.jsx` `submitSale` (rama de venta estándar).

- **Comparación con Demo6:** `saveSale` líneas **6126-6145**: para cada ítem `type==='stock'`, Demo6
  descuenta `finishedStock` (marca `status:'reservado'`, asigna `orderId`/`pedidoId`), baja el `stock`
  del producto maestro y registra un `stockMoves` `type:'salida_venta'`.
- **Estado React:** `submitSale` **no toca** `finishedStock`, `products[].stock` ni `stockMoves` al vender.
- **Severidad:** media — **alta relevancia para Fase 3 visual** (Almacén/Materia Prima/Despacho/Producción
  e Inventario dependen de estos registros). Vender stock no reserva ni mueve inventario.
- **Plan:** evaluar al portar los módulos de inventario/despacho en Fase 3. Verificar si la reserva debe
  ocurrir en la venta (como Demo6) o en otro punto del flujo de despacho del modelo React.

**✅ RESUELTO (2026-05-26, pre-trabajo Fase 3, rama `claude/parity-fase-3-visual`).** `submitSale` ahora,
para venta estándar: (1) valida suficiencia de stock antes de mutar (guard, fiel a `saveSale:6103-6106`);
(2) en un `setState` atómico reserva `finishedStock` (FIFO entre bodegas → `reservado` + `orderId`/`pedidoId`,
con split en consumo parcial), baja `products[].stock` y registra `stockMoves` `'salida_venta'` (fiel a
`saveSale:6126-6145`). Innovación/producción no afectan inventario. Divergencia documentada: el registro
consumido entero conserva su `qty` con `status:'reservado'` (Demo6 lo deja en `qty:0`) porque React calcula
KPIs de inventario en vivo. Validado: test de algoritmo node 17/17 + lint + build. Detalle:
`docs/parity/FASE3/EX-F2-07.md`.

---

## EX-F2-08 — Mostrar los acabados del pedido donde se necesitan · ✅ RESUELTO (premisa corregida)

**Ubicación:** `src/views/Produccion.jsx` y `src/views/Ventas.jsx` (solo render).

- **CORRECCIÓN DE LA PREMISA ORIGINAL:** el título viejo ("los acabados no se persisten en
  `order.acabados`") era **incorrecto**. Los acabados **SÍ se persisten** — pero **planos en cada
  `order.items[i]`** (`colorMadera`, `colorMaderaOtro`, `colorMetal`, `telaId`, `colorTejido`), no
  bajo un objeto `order.acabados:{}` como en Demo6. El verdadero gap era que **no se renderizaban
  en ningún lado**. Este hallazgo agrega el **display** (no toca la persistencia, que ya funciona).
- **Implementado (solo render):** helper `acabadosParts(item)` (en ambas vistas) que lee los
  campos planos del ítem y devuelve solo los presentes; resuelve `telaId → nombre` vía `supplies`
  (categoría Telas), mostrando el nombre y no el id; "Otro" usa `colorMaderaOtro`. Si no hay
  ninguno, no se muestra el bloque.
  - **Producción** (SlidePanel `selOP`): bloque "Acabados" leyendo `selOP.items?.[0]`.
  - **Ventas** (SlidePanel `sel`): bloque "Acabados" **por ítem** (prefija el nombre del producto
    si es multi-ítem).
- **NO se tocó:** la persistencia (`submitSale`), `NuevaVentaModal`, la validación REG-H035,
  `PROD_ESTADOS`. **NO se normalizó** a `acabados:{}` (diferido a un pase futuro #6 si se quiere
  paridad de *shape* con Demo6; hoy el dato plano es suficiente para mostrarlo).
- **Validación:** test node del helper 8/8 (telaId→nombre, "Otro", ausencia, orden) + `eslint` 0 +
  `vite build` OK.

---

## EX-F2-09 — Alta rápida de tela ("+" quickAddTela) no portada [DECISIÓN FASE 2.5.2 REG-02]

**Ubicación:** modal Nueva Venta, buscador de tela de tapicería (`NuevaVentaModal` `TelaPicker`).

- **Comparación con Demo6:** `renderSaleAcabados` incluye un botón "+" (`quickAddTela`, `:5877`) que pide
  nombre/costo por `prompt()` y crea una nueva tela en `supplies` al vuelo.
- **Estado React:** REG-H035-02 implementó el **buscador con autocompletado** (lo que pedía el inventario:
  "reusar ProductPicker"), pero **NO el botón "+"** de alta rápida (muta inventario; usa `prompt()`).
- **Severidad:** baja (conveniencia; el buscador cubre las telas del seed).
- **Plan (decisión del usuario 2026-05-26):** no agregar por ahora; si el cliente lo pide tras la demo,
  incorporarlo como EX. Registrado para trazabilidad.

---

## EX-F3-01 — Editor de BOM en el modal de EDICIÓN de producto (Innovación) · ✅ RESUELTO (ampliado: paridad completa del modal de edición)

**Ubicación:** `src/views/Innovacion.jsx` — modal "Editar ficha (master card)".

- El modal de **Nuevo producto** tenía tabla BOM + costo automático (H-104a); el modal de
  **edición** no tenía editor de BOM. Resuelto con paridad completa vs `openProductMasterEdit`
  de Demo6 (8388-8507), reusando el patrón del modal Nuevo.

**Entregado (9 puntos + header):**
1. Editor BOM en edición (dropdown insumo + qty + subtotal por fila + "+ Agregar" + "×").
   `openEdit` inicializa `edit.bom` desde `p.bom`; `saveEdit` persiste `bom` filtrando filas sin
   insumo o `qty≤0` (antes **no** guardaba `bom`).
2. Costo auto-rellenado desde el BOM con flag `costTouched` (override manual respetado; campo no
   deshabilitado).
3. Línea "Costo calculado (suma insumos)" gris + total en dorado bajo la tabla.
4. Margen con color dinámico: verde >30 / ámbar >15 / rojo ≤15.
5. Botón verificado en el footer (izq): "✓ Marcar verificado" / "⏳ Enviar a auditoría"
   (`toggleEditVerified`, espejo de `toggleProductVerified`).
6. Asteriscos en labels obligatorios (Nombre *, Costo final *, Precio venta *).
7. Footer relabel: "Costo"→"Costo final *", "Precio"→"Precio venta *".
8. Botón principal: "Guardar ficha" → "💾 Guardar cambios".
9. Medidas en 1 fila de 5 columnas (se agregó `cols=5` a `FormGrid`, antes caía a 2).
- **Header (adicional pedido por el usuario):** overline "Master card · Producto" + título más
  grande, vía prop opcional `overline` en `components/Modal.jsx` (aditivo).

**Decisión técnica:** en `openEdit` el costo arranca con el `p.cost` guardado y `costTouched:false`;
se re-sincroniza al total del BOM **al editar el BOM** (no al mero abrir), igual que el modal
Nuevo. Diverge levemente de Demo6 (que recalcula al abrir) para **no pisar** un costo guardado
sin que el usuario toque nada. Documentado.

---

## EX-F3-02 — Acciones de cierre de OP en Auditoría (cerrar / crear producto CEDI / aprobar) · ✅ RESUELTO

**Ubicación:** `src/views/Auditoria.jsx` — tabla "Cierre de OPs" + modal detalle de cierre.

H-106 dejó el modal de detalle (read-only). Ahora se portaron las **3 acciones progresivas**
(espejo de Demo6: `cerrarOP` 6418, `auditoriaCrearProductoCEDI` 7608, `auditApproveOp` 7722),
cada mutación en un `setState` atómico (cascada B2):

1. **🔒 Cerrar OP** (botón en el modal "Ver"). Guard: `area==='Listo'` y no cerrada. Efecto:
   `opClosed:true, estado:'op_cerrada', closedAt, closedBy`.
2. **📥 Crear producto en CEDI** (botón fila, visible si `opCerrada && !productoCreado`). Guard:
   OP cerrada + no duplicar. Efecto: inserta `finishedStock` `{source:'produccion',
   warehouseId:CEDI, qty, status: hasCustomer?'reservado':'disponible', classification,
   receptionStatus:'pendiente_recepcion', orderId, pedidoId, customerId, clientName}` + un
   `stockMove {type:'entrada_produccion'}` + marca `order.cediRequestedAt/cediClassification`.
   Resuelve `productId` directo o desde el primer ítem de la cotización.
3. **🧾 Aprobado para facturar** (botón fila, visible si `productoCreado && !auditApproved`).
   Efecto: `order.auditApproved/By/At` + crea `invoiceRequest` para Contabilidad.

**DECISIONES SIN INPUT DEL CLIENTE / divergencias con Demo6 (documentadas):**
- **`invoiceRequest.estado = 'aprobada_auditoria'`** (fiel a `auditApproveOp` de Demo6:7734).
  Coherencia: NO contradice `o.auditApproved:true` — la orden está aprobada **y** su IREQ está
  aprobada. Es una **cola limpia hacia adelante** (estado terminal bien definido) que consumirá el
  módulo de **Facturación/Contabilidad** cuando se construya (roadmap #5); **no es un cabo suelto
  contradictorio**, es un estado que espera a un consumidor futuro conocido. El **feedback de UI**
  lo da el chip de la fila (`✓ Aprobada` / `✓ Listo contabilidad`), no hace falta que aparezca en
  "Solicitudes de facturación pendientes". Esa sección (`reqFactura`, filtra `pendiente_auditoria`)
  es para el **flujo inverso** —solicitudes que inicia Contabilidad y auditoría aún no aprobó—, hoy
  sin productor, y está bien que quede así.
- **`hasCustomer = !!(o.pedidoId || o.customerId)`** para `reservado`/`disponible` (igual que
  Demo6). El spec mencionaba solo `pedidoId`, pero las órdenes React no traen `pedidoId` (usan
  `id` + `customerId`); usar solo `pedidoId` marcaría pedidos de cliente como `disponible` →
  incorrecto.
- **`stockMove.type = 'entrada_produccion_pendiente'`** (ajustado al cerrar EX-F3-03; fiel a
  Demo6) — la recepción en CEDI (EX-F3-03) lo convierte en `'entrada_produccion'`. En la creación
  **NO se suma a `product.stock`**: eso ocurre al verificar la recepción (EX-F3-03). El
  `finishedStock` ya queda visible en Inventario Terminado desde la creación.
- **Ids:** `finishedStock`/`stockMove` con `uid('FS')`/`uid('SM')` (consistente con EX-F2-07 y
  `uid('FS')` de Demo6); `invoiceRequest` con `nextId('IREQ','ireq')` (id legible, como Demo6).

**Gaps documentados (NO inventados):**
- Columnas **"Costo real" / "Desv."** de la tabla de cierre siguen en `0` / `0%`: dependen de
  `supplyIssues` (consumo real de producción), **no poblado** en React (sin módulo de salidas a
  producción). Demo6 lo calcula desde `supplyIssues` (7568-7570). Gap declarado; sin inventar.
- **EX-F3-03** (recepción CEDI): ✅ RESUELTO (ver abajo).

---

## EX-F3-03 — Recepción CEDI / "stock listo va a CEDI automáticamente" · ✅ RESUELTO

**Ubicación:** `src/views/InventarioTerminado.jsx` (acción + UI) + ajuste menor en
`src/views/Auditoria.jsx` (tipo del stockMove). Espejo de `verifyCEDIReception` (Demo6:7691-7720).

Cierra el ciclo que EX-F3-02 dejó listo: los `finishedStock` con
`receptionStatus:'pendiente_recepcion'` (creados al "Crear producto en CEDI") se confirman como
recibidos.

**Implementado:**
- **Acción `confirmarRecepcion(fsId)`** (1 `setState` atómico): `finishedStock` →
  `receptionStatus:'recibido'` + `readyDate/receivedAt/receivedBy`; **suma `f.qty` al stock
  maestro** `products[productId].stock` (y `warehouseId` si faltaba); **OP → `estado:'listo'`**
  (fiel a Demo6:7707; sigue despachable, `reqReady` acepta `listo`); convierte el
  `stockMove` `entrada_produccion_pendiente` → `entrada_produccion` + `verifiedAt/verifiedBy`.
  Guard: si ya está `'recibido'` → toast info, no-op.
- **UI:** banner "📦 Pendiente de recepción en CEDI" que lista los pendientes (producto, OP,
  bodega, cliente / stock libre) con botón "✓ Confirmar recepción". Desaparece cuando no hay
  pendientes (contador en la cabecera del banner).
- **Ajuste en `crearProductoCEDI` (EX-F3-02):** el `stockMove` se crea como
  `entrada_produccion_pendiente` (se convierte en definitivo al recibir). Seguro: `stockMoves`
  solo se **muestra** como label en `AlmacenMP` (`moveCols`); ningún conteo de stock sale de
  `stockMoves` (el inventario se cuenta desde `finishedStock`/`product.stock`).

**No-doble-conteo (verificado):** el conteo de unidades de Inventario Terminado e Inicio sale
**solo de `finishedStock`**; `product.stock` no se agrega junto a `finishedStock` en ningún KPI
(grep confirmado: `Inicio`, `ListaPrecios`, `InventarioTerminado` cuentan `finishedStock`;
`product.stock` solo se usa como display y se decrementa en venta EX-F2-07). Sumar al maestro en
la recepción incrementa `product.stock` exactamente una vez sin duplicar.

**Ciclo cerrado de punta a punta:** Producción ("Listo") → Auditoría (cerrar OP → crear producto
CEDI [pendiente] → aprobar facturar [IREQ `aprobada_auditoria`]) → Inventario (confirmar
recepción → stock maestro + OP `listo` + move definitivo) → Despacho (flujo A). Sin estados
intermedios contradictorios; ningún `finishedStock` queda atascado en `pendiente_recepcion` sin
forma de recibirlo.

**Validación:** test node del ciclo 7/7 (recibido, +1 al maestro, sin doble conteo, OP listo,
move convertido, guard idempotente, sin pendientes atascados) + `eslint` 0 errores en los
archivos tocados + `vite build` OK.

## EX-F3-04 — Puente Inventario→Despacho (🚚 Solicitar / 📅 Programar desde la pestaña Clientes) · ✅ RESUELTO

**Síntoma:** una OP de cliente recibida en CEDI (`receptionStatus === 'recibido'`, OP en
`listo`) no tenía botón en Inventario Terminado para crear la `dispatchRequest` que Despacho
filtra (`estado === 'pendiente'`). El ciclo quedaba completo pero sin trigger UI; la única
vía era inyectar la solicitud por seed/consola. Demo6 cubría esto con dos funciones a un
click: `solicitarDespachoDesdeInventario` (1325) y `programarDespachoCliente` (1354).

**Resolución:** en `InventarioTerminado.jsx`, en la celda de acciones de cada fila de la
pestaña Clientes, dos botones condicionados a `vista==='clientes' && r.orderId &&
r.receptionStatus==='recibido'`:

1. **🚚 Solicitar** — inserta una `dispatchRequest` `{ id: DSP-NNN (pad 3), finishedStockId,
   orderId, pedidoId, customerId, clientName, productId, qty, ciudad, address,
   estado:'pendiente', requestedAt, requestedBy }` en un setState inmutable. Sin modal
   (fiel a Demo6:1325 que era ejecutivo).
2. **📅 Programar** — abre modal con `<input type="date">` (default `today()+2`) + Motivo
   opcional. Misma solicitud + `scheduledDate` y `scheduleNotes?`. **Mejora consciente
   sobre Demo6**: Demo6:1354 usaba `prompt('Fecha...')`; aquí se eleva a date-picker real
   con validación.

**Guard anti-duplicado:** `useMemo` `dispatchedOrderIds` agrega todos los `orderId` (y
`orderIds[]`) ya presentes en `dispatchRequests`. Si el `orderId` de la fila está en el
Set, los botones se reemplazan por un badge `✓ Despacho solicitado`. Ambos handlers
revalidan el guard al confirmar (defensa en profundidad).

**Resolución de campos** (en `buildDispatchPayload`):
- `customerId` desde `fs.customerId` con fallback a `order.customerId`.
- `clientName` desde `fs.clientName` → `order.clientName` → `customer.name` → `'—'`.
- `ciudad` desde `customer.city`.
- `address` desde `order.deliveryAddress` con fallback a `customer.address`.
- `pedidoId: fs.pedidoId || fs.orderId` (en este app `order.id === pedidoId`).

**Estado `'pendiente'`** (no `'solicitado'`): clave para que la solicitud aparezca en la
tabla pendiente de `Despacho.jsx:65`. La OP, al estar en `listo`, satisface `reqReady`,
así que el botón "🚚 Despachar" en Despacho aparece habilitado de inmediato.

**Validación:** test node ad-hoc (no commiteado) 25/25 pasan: shape del payload (todos los
campos), guard anti-dup en ambas acciones, `reqReady=true` post-solicitud, `deliveryAddress`
con fallback, counter `dsp` pad 3, rechazo de Programar sin fecha + `eslint` 0 errores en
`InventarioTerminado.jsx` + `vite build` OK.

**Detalle:** `docs/parity/FASE3/EX-F3-04-SOLICITAR-DESPACHO.md`.
