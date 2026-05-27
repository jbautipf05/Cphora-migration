# VALIDACIÓN — Tesorería (Fase 3)

**Fecha:** 2026-05-27 · **Rama:** `main` (local) · **Motor:** React, por decisión del usuario.
**Scope:** **T3** (CRUD de cuentas bancarias) + **T1/T2/T4** (cableado contable), este último habilitado tras el cierre de **TD-01** por el otro desarrollador (`counters.je=12`).

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

## T1/T2/T4 — implementado (TD-01 ya resuelto)

- **T1 — Pagos entrantes:** `Aprobar` ahora marca confirmado, **acredita el banco**, recalcula `paid%` del pedido y dispara `postCustomerCollection`. `reject` queda en estado simple (solo aplica a pendientes, nunca posteó asiento).
- **T2 — Pagos salientes:** `Confirmar` marca confirmado, **debita el banco** y dispara `postSupplierPayment`. `annulOut` re-acredita el banco si estaba confirmado (reversa del asiento = follow-up).
- **T4 — Conciliación:** nuevo hook **`postBankAdjustment`** en `accountingEngine.js` + acción en AppContext + botón "⚖ Conciliar" por tarjeta con modal de ajuste (delta ± concepto). `delta>0` → DB `1110-XX` / CR `425095`; `delta<0` → DB `539595` / CR `1110-XX`; banco como tercero.

### Fix colateral del motor (necesario para T2)
`postSupplierPayment` usaba como fallback (egreso sin OC) la cuenta `510550`, que **no existe** en el catálogo PUC React → el asiento fallaba con `unknown_account`. Se cambió el fallback a **`539595`** (Otros gastos diversos, sí existe). El mapeo fino por tipo de pago (nómina vs proveedor) corresponde a "Mapeos operación→cuenta" en Contabilidad.

### Auto-validación T1/T2/T4 (Preview MCP, 0 errores de consola)
- ✅ **TD-01 confirmado resuelto en vivo:** los asientos en vivo nacen `JE-000013`+ (no colisionan con el seed `JE-000001..012`); sin IDs de asiento duplicados.
- ✅ **T1:** aprobar PAG-504 (11.34M, B-01) → banco 148.5M→159.84M, `JE-000013` (DB 111005 / CR 130505 tercero C-003), `paid%` recalculado.
- ✅ **T2:** confirmar OUT-032 (24.012M, B-02) → banco 85.75M→61.738M, `JE` (DB 539595 tercero "Nómina abril" / CR 111010).
- ✅ **T4:** conciliar Bold +$5.000.000 → banco 23.4M→28.4M, `JE` (DB 111015 tercero B-03 / CR 425095).
- ✅ `eslint` sin errores · `vite build` OK.

## Pasos para validación humana

1. Finanzas → Tesorería → "+ Nueva cuenta" → crear una → confirmar que aparece la tarjeta y, en Contabilidad → Plan PUC, la auxiliar `1110-XX` nueva.
2. "✎ Editar" una cuenta → cambiar tipo/color → guardar → persiste.
3. "🗑 Eliminar" sobre una cuenta con saldo (p.ej. Bancolombia) → debe **bloquear**. Crear una vacía y eliminarla → debe **permitir**.
