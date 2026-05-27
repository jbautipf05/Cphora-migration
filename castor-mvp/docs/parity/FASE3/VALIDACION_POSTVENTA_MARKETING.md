# VERIFICACIÓN DE PARIDAD — Postventa & Marketing (Fase 3)

**Fecha:** 2026-05-27 · **Rama:** `main` (local) · Verificación de paridad de los dos módulos que ya se veían completos.

## Marketing — ✅ a paridad (sin cambios)

Cubre todo lo de Demo6 (`PAGE_RENDERERS.marketing`, 6650): KPIs (Piezas/Productos vinculados/Tipos/Mostrando), filtros (Tipo·Formato·Producto·Desde·Hasta·Buscar + limpiar), biblioteca de tarjetas, detalle, alta con productos vinculados.

Deltas **cosméticos/menores** (no requieren acción):
- Detalle en **SlidePanel** (React) vs modal (Demo6).
- Ícono derivado del **tipo** (`TYPE_ICON`) vs emoji editable (`thumb`) en Demo6.
- Adjuntar archivo: inputs explícitos (filename/format/size) vs botón que autodetecta formato/tamaño.
- **Mejora React:** la descarga genera un archivo real (`.txt` con metadatos) en lugar del `toast` simulado de Demo6.

## Postventa — ✅ paridad alcanzada (1 gap implementado)

La UI ya estaba completa (KPIs, vencidos/próximos, completar, historial, NPS, alertas por asesor). El modelo React **consolida** en `postSales` (campo `hito`) lo que Demo6 separa en `followups` + `postSales` — decisión de simplificación que se mantiene.

### Gap implementado: auto-generación de seguimientos
Demo6 (`ensureFollowupSchedule`, 6490) crea de forma diferida los hitos **7d / 6m / 12m** para cada pedido `entregado`/`despachado`. React no lo hacía → entregar un pedido nuevo no poblaba Postventa.

**Solución (Postventa.jsx):** un `useEffect([orders])` que, en cada visita a Postventa, genera los `postSales` faltantes (hito `7d`/`6m`/`12m`) para los pedidos `entregado`/`despachado`. Fiel a Demo6:
- Base de fechas: `deliveredAt || dueDate || orderDate`. Offsets: 7 / 180 / 365 días.
- **Idempotente:** se indexa por `orderId+hito` con id estable `PS-<orderId>-<hito>`; solo agrega los que faltan, no duplica.
- **Sin tocar el flujo de entrega** (Despacho/Ventas son territorio del otro dev): se genera de forma diferida al abrir Postventa, igual que Demo6.

### Deltas menores NO implementados (anotados)
- Demo6 hace clic en el nombre del cliente → abre su perfil (`openCustomerProfile`). En React es texto plano (navegación cruzada a Clientes — mejora futura).
- Al completar, Demo6 escribe también en `customer.postSales` (historial por cliente). React mantiene un único historial global.

## Auto-validación (Preview MCP, 0 errores de consola)
- ✅ `eslint` sin errores · `vite build` OK.
- ✅ Al abrir Postventa, PED-1248 (entregado, ya tenía `7d` por seed) generó **6m** (2026-10-02) y **12m** (2027-04-05); total `postSales` 3→5.
- ✅ **Idempotencia:** navegar fuera y volver a Postventa **no** duplica (sigue en 5, sin ids repetidos).
- ✅ Marketing: revisado, sin cambios (a paridad).

## Conclusión
Marketing y Postventa quedan a paridad. Postventa gana la auto-programación de seguimientos posventa fiel a Demo6, contenida en su propia vista (sin dependencias cruzadas).
