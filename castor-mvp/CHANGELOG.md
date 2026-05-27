# Changelog — castor-mvp

Historial centralizado de cierres de fase mergeados a `main` (push directo por rebase, sin PR).
El detalle de cada fase está en `docs/parity/`. Fases previas a 2.5.1 (1, 1.5, 2, 2.5): ver
`docs/parity/FASE*/CIERRE_*.md`.

## [2026-05-26] - Fase 2.5.1 (EX-F2-05)
- Conversión cotización→venta: ahora enlaza cliente↔lead (`customer.linkedLeadId` + `lead.linkedCustomerId`)
  y avanza el estado del lead a "Compro" en toda conversión con lead, en un `setState` atómico (fiel a
  Demo6 `saveSale`). Resuelve el gap §5.2 de la auditoría pre-Fase 3.
- Auditoría de cierre: registrados EX-F2-06 (`quote.pedidoId/orderId`) y EX-F2-07 (la venta no reserva
  `finishedStock`/`stockMoves`) en `HALLAZGOS_EXTRA.md`.
- Detalle: `docs/parity/FASE2_5_1/H-EX-F2-05.md`, `docs/parity/FASE3/VALIDACION_EX_F2_05.md`,
  `docs/parity/FASE3/EVALUACION_PRE_INICIO.md`.
