# VALIDACIÓN — Contabilidad C3b: Reglas tributarias (Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` (local · pendiente push) · **Motor:** React (configuración).
**Scope:** **C3b** — nuevo slice `taxRules` con CRUD de configuración para IVA (19/5/0), ReteFuente (compras 2.5%, servicios 3.5%, honorarios 11%), ReteIVA (15%) y ReteICA (Bogotá 9.66×1000). 8 reglas seed editables. Capa de configuración: el motor todavía no consume estas reglas; el cableado a `postSale`/`postSupplyPurchase`/`postCustomerCollection` es refactor posterior (ligado al cableado de `accountingMappings` C3a).

## Referente de paridad
Portado de `castor_accounting.js`:
- Seed: [361-372](../../../../castor_accounting.js) (`seedTaxRules`, 8 reglas).
- UI tabla: [3018-3064](../../../../castor_accounting.js) (`renderConfigImpuestos`).
- Modal de form: [3066-3104](../../../../castor_accounting.js) (`openTaxRuleForm`).
- Save con default exclusivo: [3106-3141](../../../../castor_accounting.js) (`saveTaxRule`).
- Delete con guard "en uso": [3143-3157](../../../../castor_accounting.js) (`deleteTaxRule`).

## Implementado

| Pieza | Archivo |
|---|---|
| Seed `SEED_TAX_RULES` (8 reglas: IVA-19/5/0, RTF-25/35/11, RIVA-15, RICA-BOG) | `src/data/seed.js` |
| Slice editable persistido `taxRules` | `src/store/AppContext.jsx` (buildInitialState) |
| Acciones `addTaxRule` · `updateTaxRule` · `removeTaxRule` | `src/store/AppContext.jsx` |
| Vista con tabla, badges por tipo, contadores, modal de form con tasa→% en vivo, confirm inline para borrar | `src/views/ReglasTributarias.jsx` |
| Wiring: subvista `reglas-tributarias` en CONTAB_SUBVIEWS + PAGE_META + ruta | `src/nav.js`, `src/App.jsx` |

### Adaptaciones a React
- "Cuenta auxiliar activa" en React = `acc.level >= 6 && acc.activa !== false`.
- **Confirm inline** para borrar (no `window.confirm` que cuelga el preview — mismo patrón que C2b/C3a).
- **Modal centrado** usando el componente compartido (`src/components/Modal.jsx`, size='sm'). Backdrop NO cierra al click (decisión del compañero, evita borrar datos por click accidental); cierra con la ✕ del header, Esc, o el botón Cancelar.
- **ID se uppercase** al guardar (`iva-12` → `IVA-12`) — mejora UX sobre el monolito.
- **Hint en vivo** debajo de la tasa: muestra el % equivalente al decimal (e.g. `0.16` → `= 16%`).
- **Convención del monolito preservada:** `type='iva'` setea `account_generated + account_descontable` (misma cuenta), `type='iva' + rate=0` setea `appliesToRemision=true`. Los otros tipos usan `account` singular.

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores (1 warning preexistente `react-refresh` en AppContext) · `vite build` OK.
- ✅ **Render:** breadcrumb `Finanzas · Contabilidad · Reglas Tributarias`; 8 filas; contador "3 IVA · 3 ReteFte · 1 ReteIVA · 1 ReteICA"; badges de colores por tipo (IVA azul, ReteFte violet, ReteIVA amber, ReteICA verde); orden estable por tipo→id.
- ✅ **Crear nueva regla:** `IVA-12` con `name='IVA 12% (prueba)'`, `rate=0.12`, `baseUVT=5`, sin cuenta → addTaxRule devuelve `{ok:true}`, `localStorage.taxRules` ahora tiene 9 reglas, la nueva con `account_generated:null + account_descontable:null` (correcto por ser tipo IVA sin cuenta asignada). Modal se cierra solo al éxito.
- ✅ **Editar + default exclusivo:** edito `IVA-12`, cambio rate a `0.16`, marco `isDefault`. Resultado: `IVA-12.isDefault=true`, `IVA-19.isDefault=false` (el seed lo tenía en true). La regla "un solo default por tipo" se enforza en `updateTaxRule` mapeando el resto del mismo `type`.
- ✅ **Eliminar:** click 🗑 muestra confirm inline `[Sí][No]` en la misma fila; al confirmar Sí, `removeTaxRule` devuelve `{ok}`, regla desaparece, total vuelve a 8.
- ✅ **Comportamiento esperado:** tras borrar la default (`IVA-12`), ningún IVA queda como default. No se auto-restaura — coherente con el monolito.
- ✅ **Persistencia:** todos los cambios sobreviven a recarga (el slice `taxRules` está fuera de `ACCOUNTING_SEED`).

### Validaciones del motor cubiertas por código (no triggerables desde la UI actual)
- **`invalid_account`** (cuenta no es auxiliar activa): el dropdown solo muestra cuentas válidas, así que la UI no lo dispara — pero el guard está en `addTaxRule`/`updateTaxRule` por si una integración futura intenta inyectar un código inválido.
- **`in_use`** al eliminar: chequea `invoices.taxBreakdown.ivaRuleId`, `supplyReceipts.taxBreakdown.ivaRuleId`, `payments.taxBreakdown.retenciones[].ruleId`, `outgoingPayments.taxBreakdown.retenciones[].ruleId`. En el seed actual nadie tiene `taxBreakdown` poblado (el motor React aún no consume las reglas), así que toda regla es borrable hoy. Cuando se cablee el motor a leer las reglas, este guard empezará a disparar realmente.
- **`duplicate_id`** al crear: si intentas crear `IVA-19` cuando ya existe, `addTaxRule` rechaza con toast de error.
- **`missing_id`**: campo ID vacío al guardar muestra toast `ID requerido` sin cerrar el modal.

## Pendiente de Contabilidad
- **C3c:** numeración de documentos (CRUD de 4 consecutivos FAC/REM/NC/ND; sembrado en `castor_accounting.js:374-381`). Edición inline (no modal — más simple que C3b).
- **C4:** hub de exportación + panel de tests del módulo contable. Para el exportador la spec v1.1 §7.15 confirma **FomPlus como único exportador ERP soportado** + los 3 genéricos (CSV/JSON/XLSX); **el layout oficial de FomPlus está pendiente de confirmar con el proveedor** antes de implementarlo.
- **Refactor posterior** (TD-07 / cierre del bloque C3): cablear el motor a leer `accountingMappings` (C3a) y `taxRules` (C3b) en lugar de cuentas y tasas hardcoded. Esto requiere ampliar el catálogo PUC para cerrar los 21 huecos listados en `VALIDACION_CONTABILIDAD_C3a.md`.
