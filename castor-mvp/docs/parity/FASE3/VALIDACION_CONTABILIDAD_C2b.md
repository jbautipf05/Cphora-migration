# VALIDACIÓN — Contabilidad C2b: Cierre fiscal (Fase 3)

**Fecha:** 2026-05-27 · **Rama:** `main` (local) · **Motor:** React (escritura).
**Scope:** **C2b** — el cierre de periodo ahora **genera el asiento de cancelación de resultados** (clases 4/5/6/7 → 360505), la reapertura lo **reversa**, y se añade el **cierre de año fiscal** (360505 → 370505). Completa el C2a, que solo hacía el toggle de estado.

## Referente de paridad
Demo6 carga `castor_accounting.js` (`<script>` en línea 11), que es la fuente de las features contables. Portado de:
- `closePeriod` ([castor_accounting.js:5650-5760](../../../../castor_accounting.js)) — cancela 4/5/6/7 → 360505.
- `reopenPeriod` (5773) — reversa el asiento de cierre; guard "no reabrir si el siguiente está cerrado".
- `closeFiscalYear` (5809-5865) — traslada 360505 → 370505 tras cerrar los meses abiertos del año.
- Texto autoritativo de comportamiento: `castor_accounting.js:6180`.

## Implementado

| Pieza | Archivo | Notas |
|---|---|---|
| `closePeriod` / `reopenPeriod` / `closeFiscalYear` (puras) | `src/lib/accountingEngine.js` | Reutilizan `movimientosPorCuenta` de `accounting.js`. |
| Wrappers `closeFiscalPeriod` / `reopenFiscalPeriod` / `closeFiscalYear` | `src/store/AppContext.jsx` | Aplican el JE y parchean `fiscalPeriods` (estado + `closingJournalEntryId` + `closedAt`) en un `setState` atómico. El asiento se postea **antes** de marcar cerrado (su fecha cae dentro del periodo). |
| UI de cierre/reapertura + cierre de año + columna "Asiento de cierre" + confirmación inline | `src/views/Cierres.jsx` | Sin `window.confirm` (cuelga el preview); confirmación inline. |

### Divergencia deliberada vs el monolito
El monolito cancela el saldo **acumulado a la fecha** de cierre. Aquí se cancela el **movimiento del periodo** (clases 4/5/6/7 de ese mes), porque el seed React marca Ene–Mar `cerrado` **sin** su asiento de cierre y el acumulado los contaría doble. Documentado en el encabezado de la sección en `accountingEngine.js`.

### Decisiones
- **Sin guard de rol** (gerencia/contabilidad). No hay RBAC todavía (TD-04); el guard sería código muerto (el único usuario es `gerencia`). Se añadirá con RBAC.
- **`reopenPeriod` tolera asiento ausente:** si `closingJournalEntryId` apunta a un JE que ya no está (ver flag de persistencia), reabre el estado igual sin fallar.

## Auto-validación (Preview MCP, 0 errores de consola)

- ✅ `eslint` sin errores (1 warning preexistente `react-refresh` en AppContext) · `vite build` OK.
- ✅ **Cerrar abril 2026:** ingresos $6.596.639 (412035) vs egresos $40.259.872 (7 cuentas 5/6/7) → **JE-000013** balanceado (TD=TC=$40.259.872), 9 líneas, **DB 360505 $33.663.233** (pérdida). Periodo → `cerrado`, `closingJournalEntryId=JE-000013`, fecha `2026-04-30`.
- ✅ **Reabrir abril:** **JE-000014** espejo (source `reversal`, balanceado, mismo monto); JE-000013 → `status='reversed'` (`reversedBy=JE-000014`); periodo → `abierto`, `closingJournalEntryId=null`.
- ✅ **Cerrar año fiscal 2026:** re-cierra abril (**JE-000015**) y postea **JE-000016** (`fiscal_year_close`, `2026-12-31`): **DB 370505 / CR 360505 $33.663.233**. **Saldo 360505 neto = 0**; 370505 neto = −$33.063.233 (incluye un saldo previo de +$600.000 del seed). La pareja reversada JE-13/JE-14 netea a cero y no corrompe el saldo. Los 4 periodos de 2026 quedan `cerrado`.
- ✅ La ecuación contable se preserva (todos los asientos cuadran DB=CR).

## Flag de persistencia (transversal, pre-existente — coordinar con el otro dev)
Los asientos en vivo (incluidos estos de cierre) se re-siembran del código en cada `hydrate` (`ACCOUNTING_SEED`), por lo que **no persisten entre recargas**; `fiscalPeriods` (estado) **sí** persiste (C2a). Consecuencia: tras recargar, un periodo puede figurar `cerrado` con su `closingJournalEntryId` apuntando a un asiento ya ausente. Por eso `reopenPeriod` tolera el JE ausente. Es el mismo flag que afecta a postSale/Garantías/Tesorería/nómina; **no se tocó** (decisión: flag y coordinar).

## Pendiente de Contabilidad
- **C3:** mapeos operación→cuenta, reglas tributarias (CRUD), numeración de documentos (3 slices nuevos; sembrados en `castor_accounting.js:308-381`).
- **C4:** hub de exportación (Demo6 exporta a Siigo/World Office/Helisa/Contapyme + CSV/JSON/Excel/SQL — **no "FomPlus"**, que no existe en el referente) + panel de tests del módulo contable.
