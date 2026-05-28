# VALIDACIÓN — Notas Crédito y Débito (§7.9, Fase 3)

**Fecha:** 2026-05-28 · **Rama:** `main` · **Commits:** `36681d9..a334de1` (6 commits NC + 1 fix de periodos cerrados) + `6609479` (tests + cierre ciclo COGS) · **Motor:** React.
**Scope:** módulo completo Notas Crédito / Débito del brief §7.9. Emisión desde Ventas (modal sobre factura), asiento contable, idempotencia, reverso COGS proporcional automático (activado por H2), vista de listado para auditoría.

**Bonus arquitectónico:** segundo cableado de TD-07 — los hooks NC/ND leen `accountingMappings.nota_credito` / `nota_debito` (C3a) con fallback a defaults; IVA se resuelve vía regla `taxRules.isDefault` (C3b) con fallback 19%. Mismo patrón que `postDepreciation`.

## Referente de paridad

Portado de `castor_accounting.js`:
- `emitNotaCredito`: [5877-6023](../../../../castor_accounting.js) (decisión clave: si la factura está en periodo cerrado, contabilizar en el periodo abierto vigente — "no rompe cierres pasados").
- `emitNotaDebito`: [6030-6099](../../../../castor_accounting.js).
- Reverso COGS proporcional: [5965-5990](../../../../castor_accounting.js).
- Numeración interna NC/ND: [378-379](../../../../castor_accounting.js).
- Spec del brief: §7.9.

## Implementado

| Pieza | Archivo | Commit |
|---|---|---|
| `SEED_NOTAS_CREDITO=[]` / `SEED_NOTAS_DEBITO=[]` + helper puro `nextDocNumber(kind, docNumbering)` | `src/data/seed.js`, `src/lib/accounting.js` | NC-1 `36681d9` |
| Hooks puros `emitNotaCredito` / `emitNotaDebito` (leen `accountingMappings` con fallback; IVA via `taxRules.isDefault`) | `src/lib/accountingEngine.js` | NC-2 `805ae8a` |
| Hook `postCostOfSaleReversal` (skip si no hay JE `source='cogs'`) | `src/lib/accountingEngine.js` | NC-3 `508d113` |
| Acciones `emitNotaCredito` / `emitNotaDebito` en AppContext (numerar → idempotencia → asiento → reverso → registro → bump counter → update factura, todo atómico) | `src/store/AppContext.jsx` | NC-4 `2ceae62` |
| Fix `resolveDocDate`: si invoice cae en periodo cerrado, usa today() | `src/lib/accountingEngine.js` | fix `ef139e2` |
| `NotaCreditoDebitoModal` compartido (modo NC/ND, radio total/parcial, preview base+IVA) + botones inline en detalle de pedido | `src/components/NotaCreditoDebitoModal.jsx`, `src/views/Ventas.jsx` | NC-5 `eb3f5d7` |
| Vista listado con KPIs, buscador + filtro tipo, dos tablas (NC / ND) con badge Total/Parcial + link a JE | `src/views/NotasCreditoDebito.jsx`, `src/App.jsx`, `src/nav.js` | NC-6 `a334de1` |
| 7 tests del motor (NC, ND, reverso COGS, periodos cerrados, idempotencia, error paths) | `src/lib/engineTests.js` | parte de `6609479` |

## Cuentas usadas (defaults + override por `accountingMappings`)

| Evento | Asiento | Cuentas |
|---|---|---|
| `nota_credito` | DR base + DR IVA / CR receivable | `417505` Devoluciones · `240805` IVA generado · `130505` Clientes |
| `nota_debito` | DR receivable / CR base + CR IVA | `130505` · `412035` Venta muebles · `240805` |
| `nota_credito_cogs` (reverso) | DR finished_goods / CR cogs × ratio | `143005` PT · `612035` Costo de venta |

Las cuentas se resuelven en cascada: `taxRules.account_generated` (IVA) > `accountingMappings.nota_credito/debito` > defaults hardcoded. Todas las cuentas ya estaban en `pucCatalog.js` (sin huecos).

## Validación automática (suite C4 / Centro de Pruebas, 31/31 PASS)

Tests específicos NC/ND (cada uno con su propia fixture en `makeCtx()`):

| Test | Verifica |
|---|---|
| `t_emitNC_factura_total` | DR 417505 base + DR 240805 IVA / CR 130505 monto, balanceado |
| `t_emitNC_remision_sin_iva` | NC sobre remisión no genera línea de IVA |
| `t_emitNC_periodo_cerrado_usa_hoy` | Si `invoice.emitDate` está en periodo cerrado, contabiliza en today() |
| `t_emitNC_amount_exceeds` | Rechaza monto > total de la factura |
| `t_emitND_balanced` | DR 130505 / CR 412035 base + CR 240805 IVA |
| `t_cogs_reverso_proporcional` | Con JE `source='cogs'` previo, genera reverso proporcional balanceado |
| `t_cogs_reverso_skip_si_no_hay_cogs` | Sin JE de cogs previo, devuelve `skip:'no_cogs_je'` (silencioso) |

## Validación manual (Preview MCP, 0 errores de consola)

### Caso 1 — NC total sobre FAC-001
- `localStorage.removeItem('castor_cphora_v7')` → reload.
- Ventas → detalle PED-1248 (Jose Ramírez, FAC-001 $7.850.000 pagada) → `+ Nota crédito` → motivo "Devolución completa por defecto de fábrica" → tipo Total → Emitir.
- **Resultado:** NC-001 emitida, FAC-001 marca `estado='anulada'` + `anuladaPor='NC-001'`, `docNumbering[NUM-NC].currentNumber: 0→1`.
- **Asiento JE-000012:** DR 417505 $6.596.638.66 (tercero C-001) + DR 240805 $1.253.361.34 / CR 130505 $7.850.000 (tercero C-001). Balanceado.
- `customerId` resuelto vía `invoice.orderId='PED-1248'` → `orders.find(...).customerId='C-001'`.

### Caso 2 — ND sobre FAC-002 (periodo cerrado)
- Reset + reload. Ventas → detalle PED-1252 (Adriano Villadiego, FAC-002 $18.900.000 vencida, emitida 2026-02-20) → `+ Nota débito` → monto $238.000 → motivo "Intereses por mora 2% sobre saldo vencido" → Emitir.
- **Resultado:** ND-001 emitida con fecha `2026-04-16` (today, periodo abierto) en vez de la fecha original de la factura (`2026-02-20`, periodo cerrado).
- **Asiento JE-000012 en periodo 2026-04:** DR 130505 $238.000 / CR 412035 $200.000 base + CR 240805 $38.000 IVA. Balanceado.
- Sin el fix de `resolveDocDate` esto fallaba silenciosamente porque `postJournalEntry` rechaza fechas en periodos cerrados.

### Caso 3 — Vista listado
- Tras Caso 1 y 2: navegar `Finanzas · Contabilidad · Notas Crédito/Débito`.
- KPIs: NCS EMITIDAS 1 · VALOR NCS $7.850.000 · NDS EMITIDAS 1 · VALOR NDS $238.000.
- Tabla NC con NC-001 (Total, rojo), tabla ND con ND-001 — ambas con link al JE.

## Decisiones tomadas

1. **NC parcial por monto (no por ítem)** en MVP. El monolito acepta ambos modos pero parcial-por-monto cubre el 90% de casos y es más simple de UI.
2. **Modal único NC/ND** con switch `mode` (no dos modales separados). Reduce código duplicado y mantiene la UX consistente.
3. **NC sobre factura en periodo cerrado** se contabiliza en today() (decisión heredada del monolito): no rompe cierres pasados pero mantiene la referencia a la factura original.
4. **Reverso COGS como hook separado** (no embebido en `emitNotaCredito`). Permite que NC funcione antes de tener H2 cableado (caso histórico) y se active automático cuando H2 entre.
5. **Idempotencia por `source+sourceId`** (no por hash de contenido). El número NC/ND único es la clave natural; refleja también el monolito.

## Limitaciones conocidas (heredadas del proyecto)

- **Persistencia de asientos en vivo:** los `journalEntries` se re-siembran desde `ACCOUNTING_SEED` en cada `hydrate` (flag transversal abierto, `AppContext.jsx:138`). Los JE de NC/ND no sobreviven al reload — mismo comportamiento que el resto de los hooks del motor. Documentado para coordinar el fix con el compañero (Omar).
- El registro NC/ND en `notasCredito`/`notasDebito` SÍ persiste (es un slice no contable, está en `buildInitialState` directo).

## Resumen ejecutivo

- ✅ 6 commits granulares + 1 fix descubierto en testing + 1 commit de cierre con tests retroactivos.
- ✅ 7 archivos tocados: seed, accounting (helper), accountingEngine (hooks), AppContext (acciones), Ventas (UI), Modal nuevo, vista listado nueva, nav/App (routing).
- ✅ 7 tests nuevos en suite C4 (todos PASS, suite total 31/31).
- ✅ Validado end-to-end en Preview MCP con asientos correctos, customerId resuelto vía FK, factura anulada, fix de periodos cerrados.
- ✅ Sin huecos en catálogo PUC.
- 🔗 Activa el cierre del ciclo con H2 (`postCostOfSale`) — sin tocar más código.

**Estado:** APROBADO. Cierra el último módulo operativo del brief.
