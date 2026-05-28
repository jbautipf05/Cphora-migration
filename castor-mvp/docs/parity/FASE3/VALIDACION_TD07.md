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

| Hook | Estado | Razón del aplazamiento |
|---|---|---|
| `postPayroll` | **Sin refactor** — sigue con `510506`/`250505`/`237005`/`261005`/`236505` consolidados | El seed `accountingMappings.payroll` tiene 18 campos detallados (provisiones desglosadas + aportes empleador EPS/ARL/parafiscales + pasivos por aporte) que referencian **17 cuentas que no existen en `pucCatalog.js`** (510527, 510533, 510536, 510539, 730527, 730530, 730533, 730536, 510560, 510569, 510570, 237006, 237010, 237030, 251005, 251505, 252005, 252505). Refactorizar este hook requiere: (1) ampliar PUC con esas 17 cuentas, (2) reescribir `postPayroll` para generar 1 línea por aporte/provisión (~120 líneas vs las ~50 actuales). Es un sub-proyecto, no un fix de cableado. |
| `postBankAdjustment` / `postWarrantyCost` | Sin refactor | Casos especiales: `postBankAdjustment` usa `accountingMappings.bank_adjustment` parcialmente; `postWarrantyCost` decide cuenta de crédito por `source==='caja'|'almacen'`. Ambos son refactors menores que pueden hacerse cuando se enfrente el caso de uso. |

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
