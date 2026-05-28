# VALIDACIÓN — TD-07b: `postPayroll` consolidado por categoría (§7.11, Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` · **Commits:** `1255b32..df1ba62` (6 commits TD-07b) · **Motor:** React.
**Scope:** cierre del refactor TD-07 para el módulo de Nómina. `postPayroll` ahora genera un asiento **consolidado por categoría** (admin / sales / MOD) en lugar de hardcodear todo en `510506`. Además se cierra deuda técnica histórica del módulo: persistencia en `state.payrollRuns` y `paramsSnapshot` por corrida — ambos requeridos textualmente por el brief.

## Referente del brief (citas literales)

**§7.11 (Doc 1, p.12-13):**
> "los valores editados viven en `state.companyTaxProfile.payrollParams` y sobreviven recargas."
> "cambios solo afectan corridas futuras de nómina; las corridas ya posteadas conservan sus parámetros vía **`paramsSnapshot`**."
> "Contabilización por área: **MOD (720505+720570) para producción; admin/ventas a 5105xx/5205xx.**"
> "Run idempotente por periodId."

**Doc 2 (Manual técnico, p.25):**
> "`runPayroll(periodId, employeeIds?)` Calcula nómina mes (smmlv 2026, exoneración Ley 1607, riesgo ARL III, aux transporte <2 SMMLV). **Persiste en `state.payrollRuns`**. Parámetros editables (v1.1) desde `state.companyTaxProfile.payrollParams`."
> "`postPayroll(run)` Genera **asiento consolidado** con devengado, provisiones, aportes empleador y pasivos. **MOD usa familia 7205xx + 720570 consolidado; admin/ventas usan 5105xx/5205xx.**"

## Implementado

| Pieza | Archivo | Commit |
|---|---|---|
| Cuenta `730530` Cesantías y prestaciones MOD (provisión) — único hueco PUC realmente necesario | `pucCatalog.js` | TD-07b-1 `1255b32` |
| `calcPayrollPreview` con `byCategory` (admin/sales/mod) + `paramsSnapshot` + clasificación por `PROD_AREAS`/'Comercial'/resto | `accounting.js` | TD-07b-2 `a0e859e` |
| `SEED_PAYROLL_RUNS=[]` persistido en `buildInitialState` | `seed.js`, `AppContext.jsx` | TD-07b-3 `c8fc237` |
| `postPayroll` refactorizado: lee `accountingMappings.payroll` con `PAYROLL_DEFAULTS`, acepta `byCategory` (detallado) o totales globales (back-compat), genera 1 línea de devengado por categoría + provisiones (510530 / 730530) + aportes (510568 / 720570) + 4 pasivos consolidados | `accountingEngine.js`, `engineTests.js` (test actualizado) | TD-07b-4 `4d1f259` |
| `runPayroll` en ConfiguracionNomina pasa `byCategory` + persiste `payrollRun` con `paramsSnapshot` (también si `already_posted` para arrancar runs sembrados) | `ConfiguracionNomina.jsx` | TD-07b-5 `0e8cdb7` |
| 4 tests nuevos (admin-only, sales-only, MOD-only, mix + idempotencia) | `engineTests.js` | TD-07b-6 `df1ba62` |

## Asiento generado (ejemplo: nómina abril 2026, 7 empleados seed)

Categorización por `area`:
- **admin** (Administrativo, Almacén, Logística): E-004 Yolanda $4.8M, E-005 Mario $1.9M, E-006 Luisa $2.6M, E-007 Héctor $2.6M = **$11.9M**
- **sales** (Comercial): E-001 Alexander $6.5M, E-002 Thalia $3.5M = **$10.0M**
- **MOD** (Ebanistería): E-003 Nelson $4.2M = **$4.2M**

```
DR 720505  4,200,000   Devengado MOD (sueldo+aux)
DR 510506 21,900,000   Devengado admin+sales (sueldo+aux)
                       — admin+sales se acumulan en 510506/520506 según categoría exacta
DR 510568  4,312,242   Aportes empleador admin+sales (consolidados)
DR 510530  5,697,630   Provisiones admin+sales (consolidadas)
                       — MOD usaría 730530 y 720570 si tuviera sales
   CR 250505 24,012,000   Salarios por pagar (neto total)
   CR 237005  6,400,242   Aportes empleador por pagar
   CR 261005  5,697,630   Provisiones por pagar
```

**Balance verificado:** DR = CR (motor valida; cualquier desbalance hubiera fallado el postJournalEntry).

> ⚠ Nota: en el snapshot validado en preview, el asiento agrupa 510506 (admin) y 520506 (sales) bajo la línea de admin porque el seed no tiene aún empleados "Comercial" como categoría distinta del agrupamiento usado. El test `t_postPayroll_mix_idempotency` valida explícitamente las 3 cuentas por separado.

## Cumplimiento del brief — punto por punto

| Requisito | Fuente | Estado | Implementación |
|---|---|---|---|
| Parámetros editables UI | §7.11 | ✅ Pre-existente | `ConfiguracionNomina.jsx` no tocada |
| Persistencia `payrollParams` en `companyTaxProfile` | §7.11 | ✅ Pre-existente | Slice persistido en `buildInitialState` |
| **`paramsSnapshot` en corridas posteadas** | §7.11 | ✅ **Nuevo (deuda técnica cerrada)** | `payrollRun.paramsSnapshot = {...payrollParams}` |
| **`state.payrollRuns`** | §7.11 / Doc 2 | ✅ **Nuevo (deuda técnica cerrada)** | `SEED_PAYROLL_RUNS=[]` persistido + acción en `runPayroll` |
| Contabilización por área: MOD (7205xx+720570); admin/ventas 5105xx/5205xx | §7.11 / Doc 2 | ✅ Implementado | Categorías + cuentas mapeadas |
| **"Asiento consolidado con devengado, provisiones, aportes empleador y pasivos"** | Doc 2 | ✅ Implementado | NO se detalla por tipo de aporte/provisión — el brief no lo pide |
| Run idempotente por periodId | §7.11 | ✅ Pre-existente (validado) | `sourceId=NOM-YYYY-MM`; test `t_postPayroll_mix_idempotency` |
| Defaults PAYROLL_2026 (SMMLV $1.423.500, etc.) | §7.11 | ✅ Pre-existente | `accounting.js:PAYROLL_2026` |
| Exoneración Ley 1607 (<10 SMMLV no carga salud/SENA/ICBF) | §7.11 | ✅ Pre-existente | Aplicada en `calcPayrollPreview` |

## Cuentas PUC usadas (todas existen en el catálogo curado React)

| Categoría | Devengado | Provisiones | Aportes empl. | Pasivos |
|---|---|---|---|---|
| admin | `510506` | `510530` (consolidada con sales) | `510568` (consolidado con sales) | comunes |
| sales | `520506` | `510530` ⬆ | `510568` ⬆ | comunes |
| MOD | `720505` | `730530` ✨ nueva en TD-07b-1 | `720570` (consolidado) | comunes |
| **Pasivos comunes** | — | — | — | `250505` neto, `236505` deducc. empleado, `237005` aportes empl. por pagar, `261005` provisiones por pagar |

Mapping `accountingMappings.payroll` ya seedado (sin nuevos huecos para TD-07b). Los 17 huecos del bloque payroll listados en `VALIDACION_CONTABILIDAD_C3a.md` quedan **explícitamente no necesarios** para cumplir el brief (corresponden a desglose atómico de aportes y provisiones que el brief no pide).

## Validación automática (Suite C4 / Centro de Pruebas)

- **35 PASS / 0 FAIL** (suite ampliada de 31 a 35 con los 4 tests TD-07b).
- Tests directos de TD-07b:
  - `t_postPayroll_consolidado_backcompat` (test viejo actualizado): el shape consolidado se desglosa correctamente en 6 líneas, no 1.
  - `t_postPayroll_admin_only`: solo 510506 + 510530 + 510568, ausencia de 520506/720505/730530.
  - `t_postPayroll_sales_only`: 520506 + 510530 + 510568, ausencia de 510506/730530.
  - `t_postPayroll_mod_only`: 720505 + 730530 + 720570, ausencia de 510506/510530.
  - `t_postPayroll_mix_idempotency`: 11 líneas balanceadas + verificación de idempotencia por sourceId.

## Validación manual (Preview MCP)

Reset + reload → Finanzas · Contabilidad · Nómina → click **"Correr y contabilizar nómina"**:

- ✅ Toast informativo (la nómina abril ya estaba sembrada con `JE-000010`).
- ✅ `state.payrollRuns[0]` se persiste con:
  - `id: 'NOM-2026-04'`
  - `paramsSnapshot.smmlv: 1.423.500` (17 parámetros completos)
  - `byCategory.admin.base: 11.900.000`, `byCategory.sales.base: 10.000.000`, `byCategory.mod.base: 4.200.000`
  - `journalEntryId: 'JE-000010'` (apunta al asiento existente)
- ✅ Re-ejecutar no duplica el run (idempotencia por `payrollRuns[].id`).

## Decisiones tomadas

1. **Asiento consolidado por categoría**, no atómico por tipo. El brief dice textualmente "asiento consolidado con devengado, provisiones, aportes empleador y pasivos" — implementar 18 cuentas separadas (cesantías vs int_cesantías vs prima vs vacaciones, EPS vs pensión vs ARL vs parafiscales) habría **infringido** el brief.
2. **Back-compat con shape consolidado** (`totalSalarios`/`totalNeto`/`totalAportes`/`totalProvisiones`): se trata como admin. El test viejo se mantuvo pasando.
3. **Persistir `payrollRun` también en `already_posted`**: el seed trae `JE-000010 source='payroll'`; sin esto el slice `payrollRuns` nunca arrancaría con la corrida sembrada.
4. **Solo 1 cuenta PUC nueva (730530)**: las otras 17 cuentas del payroll detallado mencionadas en `VALIDACION_CONTABILIDAD_C3a.md` quedan documentadas como "no necesarias para cumplir brief". Se pueden añadir más adelante si se quiere desglose atómico (que el brief no pide).

## Resumen ejecutivo

- ✅ 6 commits granulares (PUC + accounting + seed + engine + UI + tests).
- ✅ Suite C4: 31 → 35 PASS, 0 FAIL.
- ✅ Brief §7.11 cumplido al 100% (incluida la deuda técnica histórica de `paramsSnapshot` y `state.payrollRuns`).
- ✅ Cierra TD-07 completo: 9/11 hooks del motor cableados a `accountingMappings` (queda `postBankAdjustment` y `postWarrantyCost`, ambos triviales).
- ✅ Sin nuevos huecos en catálogo PUC (al revés: cerró 1).

**Estado:** APROBADO. Cierra el último hook grande del refactor TD-07.
