# Changelog — castor-mvp

Historial centralizado de cierres de fase mergeados a `main` (push directo por rebase, sin PR).
El detalle de cada fase está en `docs/parity/`. Fases previas a 2.5.1 (1, 1.5, 2, 2.5): ver
`docs/parity/FASE*/CIERRE_*.md`.

## [En progreso] - Fase 3 (sprint pre-demo) — rama `claude/parity-fase-3-visual`
Numeración consistente del sprint (se cierra a `main` con `SPRINT_PRE_DEMO.md`):
- **H-100** ✅ Producción ya no "borra" la OP al actualizar su estado (whitelist de estado →
  ciclo de vida completo + sync `estado='listo'` al llegar a "Listo"). `Produccion.jsx`.
- **H-101** ✅ *Ya satisfecho en Fase 2/2.5*: Almacén ya tiene +Insumo/+Proveedor y no tiene
  +Producto. Cero código.
- **H-102** ✅ Bodegas MP/PT (ya separadas por `tipo`): relabel display "Insumos 1/2" →
  "Almacén #1/#2" + migración idempotente + filtro PT en selector de bodega de Innovación.
- **H-103** ✅ *Ya satisfecho en Fase 2/2.5*: bodegas + inventario por producto (PT) ya viven
  en Inventario Terminado; Almacén es solo MP. Cero código.
- **H-104a** ✅ Modal Nuevo Producto con BOM + costo en Innovación (núcleo ya existía):
  subtotal por fila + auto-relleno en vivo del costo final (paridad con Demo6).
- **H-104b** ✅ Quitar +Nuevo producto de Lista de Precios (alta solo en Innovación; modal
  H-041 conservado sin entry point). *Cerrado originalmente como "H-104" (commit `dff0536`),
  renumerado a H-104b.*
- **H-105** ✅ Producción filtra el selector de área de cada OP por `product.areas` (espejo de
  `areasOfProduct` de Demo6); las tarjetas no caen en columnas no pertinentes.
- **H-106** ✅ Auditoría: modales de detalle de Producto Nuevo y de Cierre de OP (el de Pedido
  ya existía). Doble clic + botón Ver.
- **H-107** ✅ Despacho funcional (flujo A): 🚚 Despachar marca la OP `despachado` + consume la
  reserva de `finishedStock` (reservado→despachado) + pasa la solicitud a histórico (setState
  atómico). Guard: solo despachable si las OPs están en `listo`/`op_cerrada` (mejora sobre Demo6).
  Flujo B (recepción CEDI) diferido como EX-F3-03.

## [2026-05-26] - Fase 2.5.2 (REG-H035-01..12 — modal Nueva Venta)
- 12 regresiones del modal Nueva Venta (`NuevaVentaModal.jsx`) cerradas. Validaciones por bloque
  (cliente 11 campos + tel/email; control general; **pago completo obligatorio, monto≥1, fiel a Demo6 —
  sin venta a crédito**; ítems ≥1 válido) + lógica condicional Stock/Producción (indicador de stock con
  ubicaciones, ruta de proceso, **acabados condicionales** color madera/metal/tejido + buscador de telas,
  validación condicional de acabados) + UX (dropdown con precio/stock+filtrado, alineación de fila, botón ×).
- Decisiones confirmadas con el usuario: pago fiel a Demo6 (estricto); incluir 4º acabado Tejido.
- Extras registrados: EX-F2-08 (persistir `order.acabados` downstream) y EX-F2-09 (quickAddTela diferido).
- Validación: lint 0 + build OK en todos los commits; REG-06 E2E 7/7. Caveat: Bloque A/C sin E2E en vivo
  (Preview MCP inoperante por worktree huérfano) → validado por build + fidelidad a Demo6 + patrones probados.
- Detalle: `docs/parity/FASE_2_5_2/CIERRE_FASE_2_5_2.md` (+ `REG-H035-*.md`).

## [2026-05-26] - Fase 2.5.1 (EX-F2-05)
- Conversión cotización→venta: ahora enlaza cliente↔lead (`customer.linkedLeadId` + `lead.linkedCustomerId`)
  y avanza el estado del lead a "Compro" en toda conversión con lead, en un `setState` atómico (fiel a
  Demo6 `saveSale`). Resuelve el gap §5.2 de la auditoría pre-Fase 3.
- Auditoría de cierre: registrados EX-F2-06 (`quote.pedidoId/orderId`) y EX-F2-07 (la venta no reserva
  `finishedStock`/`stockMoves`) en `HALLAZGOS_EXTRA.md`.
- Detalle: `docs/parity/FASE2_5_1/H-EX-F2-05.md`, `docs/parity/FASE3/VALIDACION_EX_F2_05.md`,
  `docs/parity/FASE3/EVALUACION_PRE_INICIO.md`.
