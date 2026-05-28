# VALIDACIÓN — Contabilidad C3a: Mapeo de cuentas por evento (Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` (local · pendiente push) · **Motor:** React (configuración).
**Scope:** **C3a** — nuevo slice `accountingMappings` con CRUD de configuración para definir qué cuenta PUC usa cada evento operativo (sale_invoice, supply_purchase, payroll, etc.). 17 secciones, ~78 campos editables. Es una **capa de configuración**: el motor React aún usa cuentas hardcoded; el cableado para que el motor lea estos mapeos es un refactor posterior (ligado a TD-07).

## Referente de paridad
Portado de `castor_accounting.js`:
- Seed: [308-359](../../../../castor_accounting.js) (`seedAccountingMappings`).
- UI (paneles por operación + select filtrado por clase + status OK/no postable/sin asignar + restaurar defecto): [2947-3015](../../../../castor_accounting.js) (`renderConfigMapeos`).
- Filtro por clase PUC según field key: [2929-2945](../../../../castor_accounting.js) (`_classFilterFor`) — portado tal cual.

## Implementado

| Pieza | Archivo |
|---|---|
| Seed `SEED_ACCOUNTING_MAPPINGS` (17 secciones, ~78 campos) | `src/data/seed.js` |
| Slice editable persistido `accountingMappings` (no se re-siembra en hydrate) | `src/store/AppContext.jsx` (buildInitialState) |
| Acciones `setMapping(section, key, code)` (valida cuenta auxiliar activa) y `resetMappings()` | `src/store/AppContext.jsx` |
| Vista CRUD (paneles por evento, select filtrado, status OK/no postable/sin asignar, restaurar defecto con confirmación inline) + helper `classFilterFor` | `src/views/MapeosCuentas.jsx` |
| Wiring: subvista `mapeos-cuentas` en CONTAB_SUBVIEWS + PAGE_META + ruta | `src/nav.js`, `src/App.jsx` |

### Adaptaciones a React
- Cuenta "auxiliar activa" en React = `acc.level >= 6 && acc.activa !== false` (el monolito usa `acc.type === 'auxiliar' && acc.active`, convención distinta).
- "Restaurar defecto" usa **confirmación inline** (no `window.confirm`, que cuelga el preview — mismo patrón que C2b).
- `setMapping('')` (string vacío) es válido para **desasignar** un mapeo, igual que el monolito.

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores (1 warning preexistente `react-refresh` en AppContext) · `vite build` OK.
- ✅ **Render:** breadcrumb `Finanzas · Contabilidad · Mapeo de Cuentas`, 16 paneles de operación, 78 selects (= total de field keys del seed), contador `57 asignadas · 0 sin asignar · 21 no postable · 16 eventos`.
- ✅ **Editar mapeo + persistencia:** cambio `sale_invoice.revenue` de `412035` a `417505` (otra cuenta clase 4 — el filtro funciona) → `localStorage.castor_cphora_v7.accountingMappings.sale_invoice.revenue === '417505'`, resto del objeto intacto.
- ✅ **Restaurar defecto:** click "Restaurar defecto" → confirm inline `[Sí, restaurar][Cancelar]` → click `Sí` → `sale_invoice.revenue` vuelve a `412035`, `supply_purchase.payable` sigue en `220505` (seed).
- ✅ **Filtro por clase** (`classFilterFor`): el dropdown de `revenue` muestra solo 4 cuentas (clase 4 del catálogo curado React), no las ~50 auxiliares totales.

## Gap del catálogo PUC React (información, no defecto)

21 de los ~78 mappings semilla referencian códigos PUC que **no existen en el catálogo React curado** (`src/data/pucCatalog.js`). La vista los marca como "cuenta no postable" en rojo. La mayoría son del bloque `payroll` (provisiones desglosadas + aportes empleador EPS/ARL/parafiscales + pasivos por aporte). El motor React actual evita el problema usando cuentas consolidadas (e.g., `261005` por todas las provisiones, `237005` por todos los aportes); ver fix de C2c.

Listado completo:

| Sección.Campo | Código faltante |
|---|---|
| `supplier_payment.expense_default` | 529595 |
| `payroll.transport_aux` | 510527 |
| `payroll.int_cesantias_provision` | 510533 |
| `payroll.prima_provision` | 510536 |
| `payroll.vacaciones_provision` | 510539 |
| `payroll.cesantias_provision_mod` | 730527 |
| `payroll.int_cesantias_provision_mod` | 730530 |
| `payroll.prima_provision_mod` | 730533 |
| `payroll.vacaciones_provision_mod` | 730536 |
| `payroll.eps_employer` | 510560 |
| `payroll.arl_employer` | 510569 |
| `payroll.parafiscales_employer` | 510570 |
| `payroll.pension_payable` | 237006 |
| `payroll.arl_payable` | 237010 |
| `payroll.parafiscales_payable` | 237030 |
| `payroll.cesantias_payable` | 251005 |
| `payroll.int_cesantias_payable` | 251505 |
| `payroll.prima_payable` | 252005 |
| `payroll.vacaciones_payable` | 252505 |
| `depreciation.accumulated_construcciones` | 159205 |
| `gmf_4x1000.gmf_expense` | 530595 |

Implicación práctica: estos 21 mappings no se podrán cablear al motor hasta que se añadan al catálogo PUC, **o** se ajusten en la UI a cuentas alternativas válidas (el usuario puede sobrescribirlos). No bloquea C3a — es información que la propia vista expone.

## Pendiente de Contabilidad
- **C3b:** reglas tributarias (CRUD — array, 8 reglas seed IVA/RTF/RIVA/RICA; sembrado en `castor_accounting.js:361-372`).
- **C3c:** numeración de documentos (CRUD — 4 consecutivos FAC/REM/NC/ND; sembrado en `castor_accounting.js:374-381`). Reutilizar patrón `money-inputs` del compañero para los campos numéricos.
- **C4:** hub de exportación (Siigo/World Office/Helisa/Contapyme + CSV/JSON/Excel/SQL) + panel de tests.
- **Refactor posterior (TD-07 / propio C3 de cierre):** cablear el motor a leer `accountingMappings` en lugar de cuentas hardcoded (requiere ampliar el catálogo PUC para cubrir los 21 huecos listados arriba, o consolidar el seed a las cuentas que sí existen).
