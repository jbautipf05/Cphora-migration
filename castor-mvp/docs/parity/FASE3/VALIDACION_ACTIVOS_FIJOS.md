# VALIDACIÓN — Activos Fijos + Depreciación mensual (Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` (local · pendiente push) · **Motor:** React.
**Scope:** módulo completo de activos fijos según brief §7.12 y §4.1 — el último módulo operativo pendiente. Cubre el catálogo CRUD de activos con categorías (oficina/cómputo/transporte/construcciones/muebles/otros) y usages (admin/ventas/CIF), depreciación línea recta mensual idempotente, y asiento contable automático `postDepreciation` (hook nº 9 del motor cableado).

**Bonus arquitectónico:** la depreciación es el **primer hook que lee del slice `accountingMappings.depreciation`** (C3a) en vez de cuentas hardcoded — es el primer cableado real de TD-07. El motor mantiene defaults hardcoded como fallback para retro-compatibilidad.

## Referente de paridad
Portado de `castor_accounting.js`:
- Resolver de cuentas: [1851-1869](../../../../castor_accounting.js) (`_resolveDepreciationAccounts`).
- Cálculo mensual línea recta: [1875-1931](../../../../castor_accounting.js) (`runMonthlyDepreciation`).
- Asiento contable: [1938-1978](../../../../castor_accounting.js) (`postDepreciation`).
- Vista CRUD: [3891-3895](../../../../castor_accounting.js) (`renderActivosFijos`).
- Spec del brief: §7.12 (categorías, línea recta, run idempotente, mapeo de cuentas).

## Implementado

| Pieza | Archivo |
|---|---|
| Cuenta `159205` (dep. acum. construcciones) añadida al catálogo PUC | `src/data/pucCatalog.js` |
| Seed `SEED_FIXED_ASSETS` (7 activos representativos) + `SEED_DEPRECIATION_RUNS` vacío | `src/data/seed.js` |
| Función pura `calcDepreciationPreview(assets, periodId, runs)` con tope cost-salvage e idempotencia | `src/lib/accounting.js` |
| Función pura `postDepreciation(run, ctx)` + helper `resolveDepreciationAccounts` (lee `accountingMappings.depreciation` con fallback hardcoded) | `src/lib/accountingEngine.js` |
| Acciones `addFixedAsset` (valida required + asigna id AF-XXX), `updateFixedAsset`, `removeFixedAsset`, `runDepreciation(periodId)` (atómico: calc → post → apply JE → update depAcumulada → push run) | `src/store/AppContext.jsx` |
| Vista con KPIs (4 cards), CRUD inline + modal nuevo/editar, panel "Depreciación del mes" con preview tabular + confirm inline + historial de corridas | `src/views/ActivosFijos.jsx` |
| Wiring: subvista `activos-fijos` en CONTAB_SUBVIEWS + PAGE_META + ruta App.jsx | `src/nav.js`, `src/App.jsx` |
| Counter `af: 7` (siguiendo el seed) + ajuste `je: 12 → 11` por eliminación de JE seed | `src/store/AppContext.jsx` |

### Fix colateral del seed
El seed tenía `JE-000011 source='depreciation' sourceId='DEP-2026-04'` (depreciación pre-cargada de abril). Esto causaba que `runDepreciation('2026-04')` detectara la idempotencia y devolviera `warning='already_posted'` sin permitir al usuario correr el proceso desde la UI.

**Fix:** se eliminó ese JE del seed (y sus 4 líneas correspondientes). El `JE-000012` (pago a proveedor) se renombró a `JE-000011`. `counters.je: 12 → 11`. Los `depAcumulada` del seed `SEED_FIXED_ASSETS` ya reflejan el estado **PRE-abril** (números redondos), así que al correr la depreciación de abril desde la UI los saldos quedan correctos sin doble conteo.

## Cuentas usadas (defaults + override por `accountingMappings`)

| Usage | Gasto | Acumulada por categoría |
|---|---|---|
| `admin` | 516015 | oficina/muebles/otros → 159220, computación → 159225, transporte → 159240, construcciones → 159205 |
| `sales` / `ventas` | 526010 | (mismas categorías arriba) |
| `cif` / `produccion` | 730560 | (mismas categorías arriba) |

`asset.expenseAccountCode` y `asset.accumulatedAccountCode` permiten override por activo.

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores (1 warning preexistente `react-refresh` en AppContext) · `vite build` OK.
- ✅ **Suite C4 sigue intacta:** 18/18 PASS tras los cambios en el motor (postDepreciation nuevo no rompió nada existente).
- ✅ **Render:** breadcrumb `Finanzas · Contabilidad · Activos Fijos`; 4 KPIs (6/7 activos, $142M costo total, dep acum, valor en libros); tabla con 7 filas, badges de color por usage; panel "Depreciación del mes" con selector de periodo (default 2026-04) y preview correcta.
- ✅ **Preview correcta de depreciación abril 2026:** 6 activos (AF-007 inactivo excluido), cuota total `$1.497.619`. Verificado manualmente:
  - AF-001 oficina/admin: (5M-500k)/60 = 75.000
  - AF-002 cómputo/admin: (12M-1.2M)/36 = 300.000
  - AF-003 transporte/sales: (80M-20M)/84 = 714.286
  - AF-004 otros/cif: (35M-5M)/120 = 250.000
  - AF-005 cómputo/sales: (4M-400k)/36 = 100.000
  - AF-006 oficina/admin: (3.5M-0)/60 = 58.333
- ✅ **Corrida y contabilización:** click "Sí, correr" → genera `DEP-2026-04` con `JE-000012`, 12 líneas balanceadas en $1.497.619. Cuentas afectadas:
  - DB 516015 (admin): $433.333 (AF-001 + AF-002 + AF-006)
  - DB 526010 (sales): $814.286 (AF-003 + AF-005)
  - DB 730560 (CIF): $250.000 (AF-004)
  - CR 159220 (oficina/otros): $383.333
  - CR 159225 (cómputo): $400.000
  - CR 159240 (transporte): $714.286
- ✅ **Actualización de `depAcumulada`:** AF-001 pasa de $1.500.000 → $1.575.000 (+75k); AF-002 de $6.000.000 → $6.300.000 (+300k); AF-003 de $17.142.857 → $17.857.143 (+714k); etc.
- ✅ **Idempotencia:** segunda navegación al mes 2026-04 muestra preview "Ya hay corrida para 2026-04 (DEP-2026-04)" y deshabilita el botón "Correr y contabilizar".

## Pendiente / futuro

- **CC en líneas del asiento:** las líneas se generan con `costCenter` resuelto por usage (ADMIN/VENTAS/TALLER). El motor lo acepta y lo persiste, pero los reportes actuales no lo separan por CC.
- **Topado total:** cuando la `depAcumulada` alcanza el `cap = cost - salvageValue`, los meses subsiguientes no depreciarán ese activo (cuota = 0, skip). Cubierto por el código pero no probado explícitamente en esta validación (no hay activo cerca del tope en el seed).
- **Persistencia del JE en vivo:** sigue afectada por el flag transversal (los JEs no sobreviven a reload). En este módulo, la `depAcumulada` de los activos SÍ persiste (es estado editable), pero el JE de depreciación se pierde. Tras reload el usuario puede ver activos con depAcum nueva pero sin el JE de respaldo en Libro Diario, hasta que se resuelva el flag.
