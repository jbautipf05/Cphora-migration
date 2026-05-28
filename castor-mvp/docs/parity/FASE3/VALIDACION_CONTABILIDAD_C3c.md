# VALIDACIÓN — Contabilidad C3c: Numeración de documentos (Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` (local · pendiente push) · **Motor:** React (configuración).
**Scope:** **C3c** — nuevo slice `docNumbering` con 4 consecutivos internos (FAC factura, REM remisión, NC nota crédito, ND nota débito), edición inline (sin modal), warning amber cuando un consecutivo alcanza >90% de su rango. Es **numeración interna NO oficial DIAN** — la facturación oficial se gestiona por proveedor tecnológico externo (fuera del MVP, ver brief §2.3 y §7.9). Cierra el bloque C3 (configuración contable).

## Referente de paridad
Portado de `castor_accounting.js`:
- Seed: [374-381](../../../../castor_accounting.js) (`seedDocNumbering`).
- UI tabla con inputs inline: [3160-3203](../../../../castor_accounting.js) (`renderConfigNumeracion`).
- Setter por campo: [3205-3214](../../../../castor_accounting.js) (`setNumeracion`, permissive con coerción por tipo).

## Implementado

| Pieza | Archivo |
|---|---|
| Seed `SEED_DOC_NUMBERING` (4 consecutivos FAC/REM/NC/ND) | `src/data/seed.js` |
| Slice editable persistido `docNumbering` | `src/store/AppContext.jsx` (buildInitialState) |
| Acción `setDocNumberingField(id, field, value)` con coerción por tipo (int / boolean / string) | `src/store/AppContext.jsx` |
| Vista con tabla editable inline, cálculo de `disponibles`, highlight amber al >90% usado | `src/views/NumeracionDocumentos.jsx` |
| Wiring: subvista `numeracion-docs` en CONTAB_SUBVIEWS + PAGE_META + ruta | `src/nav.js`, `src/App.jsx` |

### Decisiones / adaptaciones
- **Edición inline** (no modal): los 4 campos editables son simples (descripción, 3 enteros, 1 boolean) → un modal sería overkill. Espejo del monolito.
- **Acción única** `setDocNumberingField` en vez de `add/update/remove`: el catálogo es fijo (4 consecutivos), no se crean/borran — solo se editan. Esto difiere de C3a/C3b (que sí tienen add/update/remove); refleja la realidad del slice.
- **Permissive como el monolito:** no valida `rangeFrom > rangeTo` ni `currentNumber` fuera del rango. La spec del monolito documenta que el motor de facturación (futuro, en el MVP de producción) será quien rechace si la siguiente emisión cae fuera del rango. Aquí solo coerce a `Math.max(0, Math.floor(+value || 0))`.
- **`{ id, kind, prefix }`** redundantes en el seed: se preservan los tres por paridad con el monolito (`kind` y `prefix` coinciden en el seed). En React la **clave primaria es `id`** (consistente con `accountingMappings`, `taxRules`, `fiscalPeriods`); `kind` queda como metadato.
- **Formato `disponibles` con locale es-CO** (punto como separador de miles): `9.985` en vez de `9985`.

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores (1 warning preexistente `react-refresh` en AppContext) · `vite build` OK.
- ✅ **Render:** breadcrumb `Finanzas · Contabilidad · Numeración`; 4 filas con prefijos `FAC / REM / NC / ND` en mono dorado; 4 checkboxes Activa; nota "No oficial DIAN" resaltada en amber.
- ✅ **Cálculo de `disponibles`:** REM seed (rangeFrom=1, rangeTo=9999, current=14) → `9.985` disponibles. FAC (1..5000, current=0) → `5.000` disponibles. Sin warning porque used/total = 0.003 < 0.9.
- ✅ **Warning al >90%:** edito `FAC.currentNumber = 4600` → `used = 4600`, `total = 5000`, `usedRatio = 0.92` → fila se pinta con `bg-amber-500/5`, columna disponibles muestra `400 ⚠` en amber, columna notas muestra "90%+ usado".
- ✅ **Toggle `Activa`:** desmarcar el checkbox de FAC actualiza `docNumbering[NUM-FAC].active = false` en localStorage tras el debounce de 250ms.
- ✅ **Persistencia:** todos los cambios sobreviven a recarga (slice editable, fuera de `ACCOUNTING_SEED`).

## Cierre del bloque C3
- **C3a Mapeos:** `f906fb7` ✅ pusheado
- **C3b Reglas tributarias:** `e617166` ✅ pusheado
- **C3c Numeración de documentos:** este commit ✅ (a pushear)

Las 3 piezas de configuración contable de la spec §4.2 quedan completas. El motor todavía no las consume — el cableado para que `postSale` lea de `docNumbering` para asignar números, que `postSupplyPurchase` lea las reglas tributarias del slice `taxRules`, y que todos los hooks lean las cuentas de `accountingMappings`, es un refactor posterior (ligado a TD-07: centralizar códigos PUC).

## Pendiente de Contabilidad (último bloque)
- **C4:**
  - Hub de exportación con **FomPlus** (único exportador ERP soportado per spec §7.15 v1.1) + CSV / JSON / XLSX genéricos. **El layout oficial de FomPlus está pendiente de confirmar con el proveedor** antes de implementar el formato definitivo.
  - Dashboard de tests del módulo contable (los 40 unit tests + 3 smokes del motor original, expuestos en navegador).
- **Refactor posterior** (TD-07, fuera del scope C3/C4): cablear el motor a leer `accountingMappings` / `taxRules` / `docNumbering` en lugar de cuentas y tasas hardcoded.
