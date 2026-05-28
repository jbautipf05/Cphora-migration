# EX-F3-04 · Puente Inventario→Despacho (🚚 Solicitar / 📅 Programar)

## Contexto

Hasta ahora, una OP de cliente que llegaba a CEDI (FS recibido, OP `listo`) se quedaba
sin acción visible para empujar el flujo: no había botón en **Inventario Terminado** que
crease la `dispatchRequest` que **Despacho** filtra (`estado === 'pendiente'`). El único
camino era inyectar la solicitud por seed o vía consola. Este hallazgo cierra ese puente:
dos acciones en la pestaña **Clientes (pendiente despacho)** que materializan los espejos
de Demo6 `solicitarDespachoDesdeInventario` (1325) y `programarDespachoCliente` (1354).

## Cambios

### `src/views/InventarioTerminado.jsx`

1. **Imports**: añadir `addDays` desde `lib/format` (para el default `today()+2` del modal).
2. **`useApp`**: extender el destructuring con `orders`, `dispatchRequests`, `nextId` (los
   tres ya estaban en el provider; solo se consumen aquí).
3. **Nuevo `useMemo` `dispatchedOrderIds`**: `Set` con todos los `orderId` (y `orderIds[]`)
   que ya aparecen en `dispatchRequests`. Es la base del guard anti-duplicado y del badge
   "✓ Despacho solicitado" que reemplaza los botones cuando ya existe la solicitud.
4. **Nuevo `buildDispatchPayload(fs)`**: factoriza el shape común a ambas acciones. Resuelve:
   - `customerId` desde `fs.customerId` con fallback a `order.customerId`.
   - `clientName` desde `fs.clientName` → `order.clientName` → `customer.name` → `'—'`.
   - `ciudad` desde `customer.city`.
   - `address` desde `order.deliveryAddress` con fallback a `customer.address`.
   - `id` vía `nextId('DSP', 'dsp', 3)` (pad 3 → `DSP-003`).
   - `estado: 'pendiente'` (clave: `Despacho.jsx:65` filtra exactamente ese valor).
   - `pedidoId: fs.pedidoId || fs.orderId` (en este app `order.id === pedidoId`).
   - Campos de auditoría: `requestedAt: nowISO()`, `requestedBy: currentUser?.name || 'Inventario'`.
5. **`solicitarDespacho(fs)`** (🚚): guard anti-dup → `setState` inmutable con la nueva
   solicitud al frente de `dispatchRequests`. No abre modal: Demo6:1325 tampoco pedía
   datos extra (`despacho inmediato`).
6. **`programarDespacho()`** (📅): lee `programarForm` (estado nuevo `{ fsId, fecha, motivo }`),
   valida fecha + guard, e inserta `{ ...buildDispatchPayload(fs), scheduledDate, scheduleNotes? }`.
7. **Botones en la celda de acciones** de cada fila (tabla `rows.map`): condicionados a
   `vista === 'clientes' && r.orderId && r.receptionStatus === 'recibido'` y al guard
   anti-dup. Si ya hay solicitud: badge gris "✓ Despacho solicitado". Junto a ellos se
   mantiene "↔ Trasladar" (sin cambios).
8. **Modal "📅 Programar despacho"**: estructura idéntica al modal de Traslado (Cancelar /
   Confirmar). Campos: `Fecha programada` (`<input type="date">` con default `today()+2`)
   y `Motivo / nota (opcional)`. Es la **mejora consciente sobre Demo6** — Demo6:1354
   usaba `prompt('Fecha...')`, aquí se eleva a un date-picker real con validación.

## Decisiones

| # | Decisión | Razón |
|---|----------|-------|
| 1 | `estado: 'pendiente'` (no `'solicitado'` que algunos forks usaban) | `Despacho.jsx:65` filtra `d.estado === 'pendiente'`. Tocar Despacho sería out-of-scope. |
| 2 | Padding 3 en `nextId('DSP','dsp',3)` → `DSP-003` | Counter `dsp` ya estaba en 2 (seed). Pequeña inconsistencia visual vs. seed `DSP-01/02` (pad 2), pero alinea con el pattern moderno de los counters del app (e.g. `RCP-001`, `ISS-001`). |
| 3 | Solicitar **sin modal**, Programar **con modal** | Demo6:1325 era ejecutivo (un click → solicitud). Demo6:1354 pedía fecha vía `prompt`. La mejora aquí es elevar SOLO `prompt → modal+date-picker`, sin agregar fricción al flujo express. |
| 4 | Guard anti-dup por `orderId` (no por `finishedStockId`) | El guard de Despacho.jsx usa orderIdsOf; despachar dos veces la misma OP rompe la consistencia de estado del pedido. Si una OP tiene varios FS (multi-bodega), el primero gana — el resto se reserva para casos no contemplados aún. |
| 5 | `scheduleNotes` solo si hay motivo (no se guarda string vacío) | Mantiene el payload limpio para futuras migraciones a backend. |
| 6 | `ciudad`/`address` resueltos en build, no en runtime | Snapshot al momento de solicitar (igual que las facturas). Si el cliente cambia de dirección luego, el despacho conserva la que se solicitó. |
| 7 | Modal estilísticamente alineado al de Traslado | Consistencia visual con el resto del view (Field/Input/Select de `components/form`, footer Cancelar + btn-gold). |

## Validación

- **Lint**: `pnpm exec eslint src/views/InventarioTerminado.jsx` → 0 errores, 3 warnings
  (`react-hooks/exhaustive-deps` en useMemos preexistentes — no introducidos por este hallazgo).
- **Build**: `pnpm build` → OK (1.90s, 278 módulos).
- **Tests node ad-hoc** (`scripts/test-bridge-despacho.mjs`, no commiteado): 25/25 pasan.
  Cubren: shape del payload (todos los campos), guard anti-dup en ambas acciones,
  `reqReady=true` post-solicitud (la OP queda en `listo`), `deliveryAddress` con fallback,
  contador auto-incrementado con pad 3, rechazo de Programar sin fecha.
- **Preview MCP**: no operativo en esta sesión (limitación de entorno). Validación
  funcional vía lint + build + tests + revisión cruzada con Demo6:1325 y Demo6:1354.

## Flujo end-to-end (verificado en código)

```
Venta → Pedido (pendiente_op)
  → Auditoría auditCreateOp → estado:produccion
  → Producción mueve áreas → "Listo" → estado:listo (H-100)
  → Auditoría cierra OP → op_cerrada + auditoriaCrearProductoCEDI
    → finishedStock { receptionStatus: 'pendiente_recepcion', orderId, ... }
  → Inventario confirmarRecepcion → receptionStatus:'recibido', stock+, OP→'listo'
  → [AQUÍ ENTRA EX-F3-04]
    · 🚚 Solicitar  → dispatchRequest { estado:'pendiente' } sin scheduledDate
    · 📅 Programar  → dispatchRequest { estado:'pendiente', scheduledDate, scheduleNotes? }
  → Despacho.jsx ve la solicitud en pendientes, reqReady=true (OP en 'listo')
  → 🚚 Despachar → estado:despachado + reserva→despachado (H-107)
```

## Out of scope (anotado, no incluido)

- **Re-despacho parcial**: si una OP tuviera varios FS en distintas bodegas, hoy el primer
  Solicitar/Programar bloquea los demás. Demo6 no contempla este caso (mismo
  comportamiento). Si se necesita, pasaría a usar `orderIds[]` y dispatchRequest por FS.
- **Edición de la fecha programada**: tras crear la solicitud, no hay UI para mover la fecha.
  Demo6 tampoco lo tiene (era un `prompt` único). Pendiente para una mejora posterior.
- **Despacho parcial por cantidad** (despachar 1 de 3 de la misma OP): fuera del alcance.

## Commit

Branch: `claude/parity-fase-3-solicitar-despacho` (desde `main` en `5a7c74e`).
