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
