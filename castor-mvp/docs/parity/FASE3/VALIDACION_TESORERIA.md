# VALIDACIÓN — Tesorería (Fase 3)

**Fecha:** 2026-05-27 · **Rama:** `main` (local) · **Motor:** React, por decisión del usuario.
**Scope de esta entrega:** **T3 — CRUD de cuentas bancarias (§7.8 v1.1)**. El resto (T1/T2/T4, que generan asientos) queda **diferido** por dependencia de TD-01 (ver abajo).

## Diagnóstico previo

Tesorería tenía KPIs, tarjetas de banco (solo lectura), 2 gráficos, tabs entrantes/salientes y aprobar/rechazar/registrar — pero **las acciones no tocaban el motor contable ni el saldo**, y **no había CRUD de bancos**.

## T3 — implementado (commit único)

CRUD completo de cuentas bancarias en `Tesoreria.jsx`, fiel a §7.8 (v1.1) y a Demo6 (`openBankForm`/`saveBank`/`deleteBank`):

- **Crear:** modal (banco, tipo, nº, titular, saldo inicial, color). Asigna `pucCode` automático con `ensureBankPucAccount` (próxima auxiliar `1110-XX` libre) y **da de alta la cuenta PUC** en `pucAccounts` (shape del catálogo: nature débito, parent 1110, level 6).
- **Editar:** banco/tipo/nº/titular/color. **No** toca saldo ni pucCode (derivan de movimientos/contabilidad).
- **Eliminar:** **bloqueado** si la cuenta tiene `balance ≠ 0`, pagos entrantes/salientes (`payments`/`outgoingPayments`) o asientos (`journalLines` sobre su `pucCode`). Si está limpia, se elimina.
- **Sin asientos contables** → seguro frente a TD-01.

## Auto-validación (Preview MCP, localhost:5173, 0 errores de consola)

- ✅ `eslint` sin errores · `vite build` OK.
- ✅ **Crear** "Davivienda" (saldo $5.000.000) → cuenta `B-…` con `pucCode 111025` + se creó la auxiliar PUC `111025` ("Davivienda Corriente", débito, parent 1110, level 6).
- ✅ **PUC auto-incremental:** una 2ª cuenta nueva tomó `111030` (siguiente libre).
- ✅ **Editar** Davivienda (Corriente → Ahorros): persiste, preservando `pucCode` y `balance`.
- ✅ **Eliminar bloqueado:** Bancolombia (saldo + pagos) NO se elimina (toast de aviso, conteo intacto).
- ✅ **Eliminar permitido:** cuenta "Tmp" (saldo 0, sin movimientos) se elimina correctamente.

## ⛔ Diferido por TD-01 (acordado con el usuario)

Los bloques que **cablean el motor** quedan pendientes hasta resolver **TD-01** (colisión de IDs de asiento, ver `VALIDACION_GARANTIAS.md` y `lib/README.md`). Wirearlos ahora produciría asientos con id duplicado:

- **T1 — Pagos entrantes:** `Aprobar` debe acreditar el saldo del banco, actualizar `paid%` del pedido y disparar `postCustomerCollection`.
- **T2 — Pagos salientes:** `Confirmar` debe debitar el banco y disparar `postSupplierPayment`.
- **T4 — Conciliación:** falta el hook `postBankAdjustment` (no existe en el motor React) + modal de ajuste (delta ± concepto → DB/CR `1110-XX` vs `425095`/`539595`, banco como tercero).

**Recomendación:** una vez resuelto TD-01 (1-2 líneas: `counters.je = max je existente` al hidratar), T1/T2/T4 son directos (los hooks `postCustomerCollection`/`postSupplierPayment` ya existen; solo falta `postBankAdjustment`).

## Pasos para validación humana

1. Finanzas → Tesorería → "+ Nueva cuenta" → crear una → confirmar que aparece la tarjeta y, en Contabilidad → Plan PUC, la auxiliar `1110-XX` nueva.
2. "✎ Editar" una cuenta → cambiar tipo/color → guardar → persiste.
3. "🗑 Eliminar" sobre una cuenta con saldo (p.ej. Bancolombia) → debe **bloquear**. Crear una vacía y eliminarla → debe **permitir**.
