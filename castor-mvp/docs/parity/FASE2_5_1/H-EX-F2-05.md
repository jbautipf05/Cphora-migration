# H-EX-F2-05 — enlazar cliente↔lead + avanzar estado del lead en conversión quote→venta

**Fase 2.5.1** · rama `claude/parity-fase-3` · 2026-05-26

## Diagnóstico

Al convertir una cotización en venta (EX-F2-03), `submitSale` (`src/views/Ventas.jsx`) creaba/resolvía
el cliente pero **no enlazaba cliente↔lead ni avanzaba el estado del lead**. Divergía de `saveSale` de
Demo6 (`6004` `customer.linkedLeadId`; `6015` backfill; `6180` `lead.estado='ganado'`), dejaba el embudo
de leads incorrecto y debilitaba B2 (`resolveCustomerId(leadId)` no encontraba al cliente). Detectado en
la auditoría pre-Fase 3 (`EVALUACION_PRE_INICIO.md`, §5.2). Decisión del usuario: arreglar fiel a Demo6
(en **toda** conversión con `leadId`, no solo cuando se crea cliente nuevo).

## Cambio aplicado

`src/views/Ventas.jsx`:
- Destructuring de `useApp()`: + `setState`.
- `submitSale`: se reemplazó el bloque de creación/resolución de cliente + paso-4 por un **único
  `setState` atómico** (customers + quotes + leads):
  - `existing = data.customerId || resolveCustomerId(...)`; `isNewCustomer`; `customerId` síncrono
    (`nextId`); `srcQuote`/`srcLeadId` desde la cotización origen.
  - **customers**: nuevo con `linkedLeadId = srcLeadId || null`; existente → backfill `linkedLeadId`
    solo si está vacío.
  - **quotes** (paso-4): `quote.customerId = customerId` si difiere.
  - **leads**: si hay `srcLeadId` → `estado:'Compro'` (siempre, idempotente) + `linkedCustomerId`
    backfill (`l.linkedCustomerId || customerId`).
  - `toast('Cliente … creado')` solo si `isNewCustomer`.
- Enum del lead: `'Compro'` (seed React), NO `'ganado'` (Demo6). Backfill condicional (no sobrescribe).
- `add('orders')`/pagos siguen igual, después, usando `customerId` (valor local).

## Verificación

- Lint `eslint src/views/Ventas.jsx`: 0 errores / 0 warnings nuevos. Build `vite build`: limpio.
- 5 tests E2E (Preview MCP, seed limpio, 0 errores consola) — ver `docs/parity/FASE3/VALIDACION_EX_F2_05.md`:
  A cliente nuevo · B cliente existente (no-op) · C cliente existente + lead en otro estado (caso clave) ·
  D walk-in (no-regresión) · E end-to-end (bidireccional OK).

## Edge cases

- Walk-in (sin quote): `srcLeadId=null` → no toca leads/quotes; cliente nuevo `linkedLeadId=null`. ✅
- Cliente existente con lead ya enlazado y 'Compro': no-op (backfill condicional + estado idempotente). ✅
- Cliente existente con lead en otro estado: avanza el lead sin duplicar cliente. ✅

## Auditoría de cierre (flujos adyacentes vs Demo6)

Registrados en `HALLAZGOS_EXTRA.md`: **EX-F2-06** (`quote.pedidoId/orderId` no seteados, sin
consumidores, deuda baja) y **EX-F2-07** (la venta no reserva `finishedStock` ni registra `stockMoves`
para ítems de stock — alta relevancia para Fase 3 visual). Observaciones menores: pago `estado`
`confirmado` vs `pendiente` de Demo6; innovación modelada vía `orders` vs `state.innovation`.

## Estado

✅ **RESUELTO.** Pendiente: validación humana del usuario (~5 min) y OK para merge a `main`. NO mergeado
aún (regla). Tras el merge → crear `claude/parity-fase-3-visual` desde main para la fase visual.
