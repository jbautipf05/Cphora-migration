# VALIDACIÓN — Contabilidad C1: reportes de saldos (Fase 3)

**Fecha:** 2026-05-27 · **Rama:** `main` (local) · **Motor:** React (lectura sobre `lib/accounting` + state).
**Scope:** primera fase de los huecos de Contabilidad — **3 reportes de solo lectura** sobre datos existentes. No postean asientos (cero riesgo contable, sin relación con TD-01).

## Implementado

| Reporte | Vista | Fuente | Aging |
|---|---|---|---|
| **Cartera (CxC)** | `src/views/Cartera.jsx` | `invoices` (no pagada/anulada) − `payments` confirmados del pedido | por `dueDate` vs `today()` |
| **CxP** | `src/views/CxP.jsx` | `purchaseOrders` − `outgoingPayments` confirmados (`ocId`) | por `expectedDate` vs `today()` |
| **Aux Retenciones** | `src/views/AuxRetenciones.jsx` | `journalLines` de 236540/236801 (practicadas) y 135515/517/518 (sufridas) | por periodo (`PeriodFilter`) |

Cada uno: KPIs + resumen por tramo/cuenta + tabla de detalle. Tramos de antigüedad: corriente / 1-30 / 31-60 / 61-90 / >90.
Wiring: `nav.js` (3 ítems en `CONTAB_SUBVIEWS` + `PAGE_META`) y `App.jsx` (imports + rutas).

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores · `vite build` OK.
- ✅ **Cartera:** total por cobrar $23.780.000 (2 docs); FAC-002 $18.900.000 vencida 27d (tramo 1-30, anclado a DEMO_TODAY ≈ 2026-04-16); REM-014 saldo $4.880.000 corriente (pagó $7.320.000 de $12.200.000); FAC-001 (pagada) excluida; % vencido 79%.
- ✅ **CxP:** total por pagar $20.300.000 (OC-3001 $12.5M + OC-3002 $7.8M, corrientes); OC-3003 saldo $0 (pago ≥ total) excluida.
- ✅ **Aux Retenciones:** practicadas $56.000 (1 línea 236540 en el seed), sufridas $0; filtro de periodo funciona.

## Notas

- El aging usa `today()` (DEMO_TODAY, anclado ~2026-04-16 por B1), no la fecha real del sistema — consistente con el resto del ERP.
- Cartera: saldo por pedido (1 factura/pedido en el seed). Si hubiera varias facturas por pedido, el prorrateo de pagos sería un refinamiento futuro.
- CxP: usa `expectedDate` de la OC como vencimiento (no hay término de pago por proveedor en el modelo actual).

## Pendiente de Contabilidad (próximas fases)
- **C2:** cierres/reaperturas de periodo, cierre fiscal anual, contabilización de nómina (`postPayroll`).
- **C3:** mapeos operación→cuenta, reglas tributarias (CRUD), numeración de documentos.
- **C4:** hub de exportación (FomPlus — requiere layout) + dashboard de tests.
