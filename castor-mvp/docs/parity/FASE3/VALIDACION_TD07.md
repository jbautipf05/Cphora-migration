# VALIDACIÓN — Refactor TD-07 parcial: motor lee `accountingMappings` + `taxRules` (Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` · **Commits:** `59e059f..fd28734` (4 commits: R-1, R-2a, fix seed, R-2b) · **Motor:** React.
**Scope:** segunda fase del cableado del motor contable al slice de **configuración** (`accountingMappings` + `taxRules`). Antes de esta sesión, solo `postDepreciation` y los hooks nuevos (NC/ND, postCostOfSale, postCustomerAdvance) leían de mappings. Tras esta sesión, el flujo comercial central también lo hace.

**Bonus:** se cierra **1 de los 21 huecos del catálogo PUC** (529595 → 539595, inconsistencia entre seed y motor). Los 19 huecos restantes son del bloque payroll y se mantienen documentados como pendientes.

## Referente

- **Capa de configuración (C3a/C3b):** `seed.js:61-138` (`SEED_ACCOUNTING_MAPPINGS`), `seed.js:146-155` (`SEED_TAX_RULES`).
- **Reglas de cascada acordadas:** override por payload > `taxRules.isDefault` (cuando aplica) > `accountingMappings.<section>` > defaults hardcoded en el hook.
- **Patrón ya usado:** `resolveDepreciationAccounts` en `postDepreciation` (Activos Fijos `0f887e1`) — primer hook con esta cascada. NC/ND, COGS y customer-advance se sumaron en esta tanda.

## Antes / Después del refactor TD-07

| Hook | Antes | Después |
|---|---|---|
| `postSale` | Hardcoded `412035`/`240805`/`130505`, IVA 19% fijo | Lee `accountingMappings.sale_invoice` / `.sale_remision` + `taxRules.isDefault` (rate + account_generated). Override `invoice.cuentaIngreso` preservado para back-compat. |
| `postCustomerCollection` | Hardcoded `130505` | Lee `accountingMappings.customer_collection.receivable` con fallback. |
| `postSupplyPurchase` | Hardcoded `140505`/`240810`/`236540`/`220505`, IVA 19% / RTF 2.5% fijos | Lee `accountingMappings.supply_purchase` + reglas IVA (`account_descontable`) y RTF (regla `RTF-25` o `conceptCode='COMP'`). Overrides `receipt.ivaRate` / `reteRate` preservados. |
| `postSupplierPayment` | Hardcoded `220505`/`539595` | Lee `accountingMappings.supplier_payment.payable / .expense_default`. |
| Seed `supplier_payment.expense_default` | `529595` (inexistente en PUC) | `539595` (cuenta que el motor ya usaba). |

## Hooks ya cableados (sesión anterior)

| Hook | Mapping | Commit |
|---|---|---|
| `postDepreciation` | `accountingMappings.depreciation` (8 cuentas por usage × categoría) | Activos Fijos `0f887e1` |
| `emitNotaCredito` | `accountingMappings.nota_credito` + `taxRules` (IVA proporcional) | NC-2 `805ae8a` |
| `emitNotaDebito` | `accountingMappings.nota_debito` + `taxRules` | NC-2 `805ae8a` |
| `postCostOfSaleReversal` | `accountingMappings.cogs_on_invoice` | NC-3 `508d113` |
| `postCostOfSale` | `accountingMappings.cogs_on_invoice` | H2 `6609479` |
| `postCustomerAdvance` | `accountingMappings.customer_advance` | H1 `08d4148` |

## Hooks pendientes

> **Actualización post-cierre (commits posteriores a este doc):**
> - `postPayroll` cerrado en **TD-07b** (`b0ab705..9fddd67`, 7 commits). Se descubrió que el plan original (desglose detallado de 18 cuentas) infringía el brief §7.11 que dice textualmente *"asiento consolidado con devengado, provisiones, aportes empleador y pasivos"*. Plan revisado solo requirió 1 cuenta PUC nueva (`730530`) y consolida por categoría admin/sales/MOD. Ver `VALIDACION_TD07B.md`.
> - `postWarrantyCost` y `postBankAdjustment` cerrados en **R-3** (`587b579`): ambos leen ahora `accountingMappings.warranty_cost` / `.bank_adjustment` con fallback a defaults (`WARRANTY_COST_DEFAULTS`, `BANK_ADJUSTMENT_DEFAULTS`).
>
> **Estado final del motor: 11/11 hooks cableados a `accountingMappings`.** Cero deuda contable antes del backend (ver tabla "Cierre TD-07 completo" al final).

## Lo que NO cambió

- **Firma pública de los hooks**: caller (AppContext + Ventas + Tesorería) sigue invocando igual.
- **Tests del Centro de Pruebas**: la suite C4 corre con `makeCtx()` que aporta `accountingMappings` + `taxRules` completos. Los hooks refactorizados ahora *prefieren* leer de ahí, pero los tests que NO pasan mappings (los pre-refactor) siguen funcionando vía los defaults hardcoded.
- **Overrides por payload**: todos los hooks conservan los overrides existentes (`invoice.cuentaIngreso`, `receipt.ivaRate`, `receipt.reteRate`, `payment.bankPucCode`) para tests y casos especiales.

## Validación automática

- **Suite C4 / Centro de Pruebas:** **31 PASS / 0 FAIL** tras los 4 commits del refactor (sin cambios en los tests existentes).
- **Vite HMR:** sin errores en consola, sin invalidaciones inesperadas.

Tests específicamente impactados (que validan retro-compatibilidad):
- `t_postSale_factura` — 1190 → 130505 DR + 412035 CR + 240805 CR balanceado ✓
- `t_postSale_remision` — sin línea de IVA ✓
- `t_postCustomerCollection` — 111005 DR / 130505 CR ✓
- `t_postSupplyPurchase` — items 10 × 100 = 1000 base + 190 IVA - 25 RTF = 1165 neto en 220505 ✓
- `t_postSupplierPayment` (con OC) — 220505 DR / 111005 CR ✓

## Hueco PUC cerrado

`supplier_payment.expense_default`: `529595` (inexistente) → `539595` (existe en PUC). 20 huecos quedan, todos del bloque payroll, listados en `VALIDACION_CONTABILIDAD_C3a.md`.

## Resumen ejecutivo

- ✅ 4 hooks del flujo comercial cableados a la capa de configuración (`postSale`, `postCustomerCollection`, `postSupplyPurchase`, `postSupplierPayment`).
- ✅ Suite C4 intacta (31/31 PASS) — los tests existentes validan retro-compatibilidad.
- ✅ Patrón consistente con `postDepreciation` + hooks NC/COGS/anticipo (cascada: override > taxRules > mapping > default).
- ✅ Fix de inconsistencia de seed: 1 hueco PUC cerrado.
- ⏸ `postPayroll` documentado como pendiente con justificación clara (requiere ampliar PUC + reescritura).

**Estado:** APROBADO. TD-07 cerrado en su mayor parte (5 hooks principales + 3 hooks de los nuevos = 8 hooks cableados sobre 11 totales del motor).

## Pendientes claros para próxima sesión

1. **`postPayroll` detallado** (TD-07b): ampliar PUC con 17 cuentas + reescribir hook para asientos detallados.
2. **`postBankAdjustment`** cableado parcial — verificar si lee `bank_adjustment.diff_positive / diff_negative` correctamente.
3. **`postWarrantyCost`**: cuenta de gasto `519540` está hardcoded; el seed tiene `accountingMappings.warranty_cost.warranty_expense`. Cableado trivial.
4. **Flag de persistencia de asientos** (transversal, coordinar con Omar): los JE de los hooks no sobreviven al reload — bloquea validación e2e con UI de flujos contables (ciclo COGS+reverso, etc.).

---

## Cierre TD-07 completo (actualización 2026-05-28)

Tras esta validación se cerraron también `postPayroll` (TD-07b) y los dos cableados menores (R-3). **El motor ahora tiene 11/11 hooks cableados a `accountingMappings`.**

### Tabla resumen 11/11

| # | Hook | Mapping | Sesión / Commit |
|---|---|---|---|
| 1 | `postDepreciation` | `accountingMappings.depreciation` | Activos Fijos `0f887e1` |
| 2 | `emitNotaCredito` | `accountingMappings.nota_credito` + `taxRules` | NC-2 `805ae8a` |
| 3 | `emitNotaDebito` | `accountingMappings.nota_debito` + `taxRules` | NC-2 `805ae8a` |
| 4 | `postCostOfSaleReversal` | `accountingMappings.cogs_on_invoice` | NC-3 `508d113` |
| 5 | `postCostOfSale` | `accountingMappings.cogs_on_invoice` | H2 `6609479` |
| 6 | `postCustomerAdvance` | `accountingMappings.customer_advance` | H1 `08d4148` |
| 7 | `postSale` | `accountingMappings.sale_invoice/sale_remision` + `taxRules` | R-1 `59e059f` |
| 8 | `postCustomerCollection` | `accountingMappings.customer_collection` | R-1 `59e059f` |
| 9 | `postSupplyPurchase` | `accountingMappings.supply_purchase` + `taxRules` (IVA desc, RTF compras) | R-2a `f55de71` |
| 10 | `postSupplierPayment` | `accountingMappings.supplier_payment` | R-2b `fd28734` |
| 11 | `postPayroll` | `accountingMappings.payroll` (consolidado por categoría) | TD-07b-4 `4d1f259` |
| **+** | `postWarrantyCost` | `accountingMappings.warranty_cost` | R-3a `587b579` |
| **+** | `postBankAdjustment` | `accountingMappings.bank_adjustment` | R-3b `587b579` |

> Nota: `postWarrantyCost` y `postBankAdjustment` son **hooks adicionales** que ya tenían defaults razonables; cablearlos completa la simetría de TD-07 aunque no estaban en la lista original de "11 críticos".

### Suite C4 final

- **35 PASS / 0 FAIL** — todos los refactors validados por retro-compatibilidad sin modificar tests existentes (salvo `t_postPayroll_consolidado_backcompat` que se actualizó cuando el shape del asiento cambió en TD-07b-4).

### Cero deuda contable

Antes de comenzar el backend (Firestore, ver `ADR-010`), el motor está **completamente cableado a la capa de configuración persistida** (`accountingMappings` + `taxRules`). Esto significa que las decisiones de modelado del backend pueden enfocarse en:
- Cómo persistir `journalEntries`/`journalLines` (flag transversal abierto).
- Idempotencia distribuida (cliente puede emitir 2× antes de que llegue al server).
- Locking de periodos cerrados (transacciones Firestore).
- Migración del seed estático a colecciones reales.

Sin riesgo de tener que rehacer mappings: ya están en su forma final, leídos por el motor, validados por la suite.

### 19 huecos PUC remanentes — documentados como NO necesarios

`VALIDACION_CONTABILIDAD_C3a.md` listaba 21 huecos; 2 cerrados (`159205` en Activos Fijos, `529595→539595` en R-2). Los 19 restantes son TODOS del bloque payroll detallado (provisiones desglosadas por tipo + aportes empleador por tipo + pasivos por aporte). El brief §7.11 dice textualmente *"asiento consolidado con devengado, provisiones, aportes empleador y pasivos"* — el detalle atómico NO es requerido. Si en el futuro se quiere desglose para reportes, se puede ampliar PUC + añadir tipo de aporte/provisión al breakdown sin romper el shape actual del asiento.
