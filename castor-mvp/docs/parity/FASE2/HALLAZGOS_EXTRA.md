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
