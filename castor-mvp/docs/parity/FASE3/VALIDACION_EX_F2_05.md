# VALIDACIÓN EX-F2-05 — enlazar cliente↔lead + avanzar estado del lead en conversión quote→venta

**Fase:** 2.5.1 · **Rama:** `claude/parity-fase-3` · **Fecha:** 2026-05-26
**Cambio:** `src/views/Ventas.jsx` `submitSale` — un único `setState` atómico que, en toda conversión
quote→venta con `leadId`, enlaza cliente↔lead (`customer.linkedLeadId` + `lead.linkedCustomerId`) y
avanza `lead.estado='Compro'`, además del paso-4 (`quote.customerId`). Fiel a `saveSale` de Demo6
(`6004/6015/6180`), con el enum del seed React (`'Compro'`, no `'ganado'`).

## Resumen ejecutivo

**Estado: ✅ APROBADO.** 5/5 tests E2E en vivo (Preview MCP, seed limpio), **0 errores de consola**;
lint 0, build limpio. La auditoría de cierre detectó un gap adyacente nuevo (EX-F2-07, fuera de scope).

## Tests (Preview MCP, localhost:5173)

| Test | Escenario | Resultado |
|------|-----------|-----------|
| **A** | **Cliente nuevo** — COT-2001 (Laura, lead L-102 sin customer): aceptar → crear venta → registrar | ✅ C-005 con `linkedLeadId=L-102`; `L-102.estado: En gestión→Compro`; `L-102.linkedCustomerId=C-005`; PED-1254 `quoteId=COT-2001`, 3 ítems; `COT-2001.customerId=C-005` |
| **B** | **Cliente existente** — COT-2002 (Carmiña, C-004, L-105 ya 'Compro'/enlazado) | ✅ NO se crea cliente (5→5); PED-1255 `customerId=C-004`; `C-004.linkedLeadId=L-105` y `L-105.estado='Compro'` sin cambio. **No-op observable en seed, código correcto** |
| **C** | **Cliente existente + lead en otro estado (caso clave)** — setup: forzar `L-105.estado='En gestión'` + inyectar COT-2099 (leadId L-105, customerId C-004, aceptada); convertir | ✅ `L-105.estado: En gestión→Compro`; **sin duplicar C-004** (4→4); PED `customerId=C-004`; `COT-2099.customerId=C-004`. Es el caso que el scope estrecho NO cubría |
| **D** | **Walk-in** (sin quote) — "+ Nueva venta" con cliente manual + ítem | ✅ C-005 con `linkedLeadId=null` (correcto, no hay lead); PED `quoteId=null`; ningún lead tocado. **No-regresión** |
| **E** | **End-to-end** — cotización nueva con cliente/lead nuevo (L-106, customerId=null) → aceptar → venta | ✅ `L-106.estado='Compro'`, `L-106.linkedCustomerId=C-005`; C-005 `linkedLeadId=L-106`; `COT-2003.customerId=C-005`; PED `quoteId=COT-2003`. **Bidireccional OK** |

Notas:
- Test C requiere setup manual (el seed no tiene un lead enlazado con estado≠'Compro'); sin el setup
  pasaría trivialmente (L-105 ya está 'Compro'). Se forzó vía `localStorage` + reload.
- Test E: el modal de cotización guardó el nombre como "Bogotá" por un glitch al setear varios inputs
  controlados en un solo eval (cosmético, irrelevante para EX-F2-05; el lead/quote nuevos se crearon
  correctamente con `customerId=null`). El flujo de conversión y el linking se verificaron OK.

## Calidad

- Lint: `eslint src/views/Ventas.jsx` → 0 errores, 0 warnings nuevos.
- Build: `vite build` → limpio (274 módulos).
- Preview: 0 errores de consola en todos los recorridos.
- **Atomicidad:** customer + quote + lead se actualizan en un único updater de `setState` (sin lecturas
  de estado intermedio; `customerId`/`srcLeadId` son valores síncronos). `add('orders')`/pagos siguen
  después usando `customerId` (valor local). Walk-in y no-regresión intactos.

## Auditoría de cierre — `submitSale` (React) vs `saveSale` (Demo6, 5975-6185)

Comparación de TODOS los flujos adyacentes (instrucción del usuario). Hallazgos:

| Mutación de Demo6 saveSale | React submitSale | Estado |
|----------------------------|------------------|--------|
| customer.linkedLeadId (6004/6015) | ✅ ahora (EX-F2-05) | Resuelto |
| lead.estado='ganado' (6180) | ✅ ahora ='Compro' (EX-F2-05) | Resuelto |
| lead.linkedCustomerId | ✅ ahora (extensión React B2) | Resuelto |
| quote.customerId (paso-4) | ✅ (EX-F2-03) | OK |
| quote.pedidoId / quote.orderId (6179) | ❌ no | **EX-F2-06** (deuda, sin consumidores) |
| finishedStock reserva + stockMoves 'salida_venta' + baja stock maestro, ítems stock (6126-6145) | ❌ no | **EX-F2-07 (NUEVO)** — alta relevancia Fase 3 visual (Almacén/Despacho/Inventario) |
| Pedido 2 niveles P-XXXX + OP-XXXX | modelo plano PED-XXXX + items[] | Divergencia COSMÉTICA ya decidida (memoria/INVENTARIO_FASE2) |
| Pago anticipo `estado:'pendiente'` (Tesorería aprueba) | `estado:'confirmado'` (`submitSale` ~248) | Observación: divergencia preexistente H-035.3; verificar al portar Tesorería (Fase E) |
| innovación → `state.innovation.push(...estado:'pendiente_aprobacion_gerencia')` | modela vía `orders` (estado `'pendiente_innovacion'`) | Diferencia arquitectónica (React lee Innovación desde orders); verificar al portar módulo Innovación |

Todos los hallazgos nuevos quedaron registrados en `docs/parity/FASE2/HALLAZGOS_EXTRA.md`
(EX-F2-06, EX-F2-07).

## Conclusión

**✅ APROBADO.** EX-F2-05 cierra el gap §5.2 de la auditoría pre-Fase 3 de forma fiel a Demo6 (con el
enum correcto del seed) y robusta para B2. Caveat: **EX-F2-07** (inventario en la venta) es el gap
adyacente de mayor relevancia para Fase 3 visual y debe evaluarse al portar Almacén/Despacho/Producción.
