# Changelog — castor-mvp

Historial centralizado de cierres de fase mergeados a `main` (push directo por rebase, sin PR).
El detalle de cada fase está en `docs/parity/`. Fases previas a 2.5.1 (1, 1.5, 2, 2.5): ver
`docs/parity/FASE*/CIERRE_*.md`.

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
