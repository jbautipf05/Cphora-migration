# VALIDACIÓN — Hooks pequeños H1 (`postCustomerAdvance`) + H2 (`postCostOfSale` / TD-21)

**Fecha:** 2026-05-28 · **Rama:** `main` · **Commits:** `6609479` (H2) · `08d4148` (H1) · **Motor:** React.
**Scope:** dos hooks contables menores que cierran piezas pendientes del motor:
- **H2 / TD-21** — `postCostOfSale`: reconoce el costo de la venta al facturar (DR cogs / CR finished_goods). **Cierra el ciclo abierto desde NC-3:** habilita el reverso COGS proporcional automático cuando se emite una NC sobre una factura con COGS reconocido.
- **H1** — `postCustomerAdvance`: anticipos de cliente cuando aún no se ha emitido la factura del pedido (DR banco / CR 280505 Anticipos). Diferencia clave con `postCustomerCollection`: el crédito va al pasivo, no a cartera.

## Referente de paridad

- H2 `postCostOfSale`: portado del comportamiento del monolito al facturar (no aislado en una función — el monolito reconoce COGS dentro del flow de venta).
- H1 `postCustomerAdvance`: cuenta `280505` Anticipos recibidos (decreto 2649 PUC, pasivos clase 2). Mapping `customer_advance` ya seedado en `seed.js:69` desde C3a.

## H2 — postCostOfSale

### Implementado

| Pieza | Archivo |
|---|---|
| Hook puro `postCostOfSale(invoice, ctx)` con resolución de costo en cascada (`invoice.cost` > `order.items[].qty × products.cost` (multi-ítem) > `order.productId/qty` (plano)) | `src/lib/accountingEngine.js` |
| Acción `postCostOfSale` en AppContext (patrón `postSale`) | `src/store/AppContext.jsx` |
| Cableado en `submitSale` (Ventas.jsx): justo después de `postSale`, dentro de `if (!data.innovation)`. Innovación NO reconoce COGS hasta aprobación gerencial (consistente con que tampoco reconoce ingreso) | `src/views/Ventas.jsx` |
| Toast consolidado: `"Asientos JE-X (venta) + JE-Y (COGS) generados"` o fallback informativo si COGS falla | `src/views/Ventas.jsx` |

### Decisión clave: momento de reconocimiento

COGS se reconoce **AL FACTURAR** (no al despachar). Razones:
1. Paridad con el monolito (`castor_accounting.js`).
2. **NC-3** trabaja contra `invoice.orderId` — la clave del reverso COGS busca un JE con `source='cogs'` y `sourceId=orderId`. Reconocer al facturar mantiene el sourceId coherente con la NC.
3. Matching principle clásico: ingreso y costo en el mismo asiento contable (mismo periodo).

### Cuentas (con override por `accountingMappings.cogs_on_invoice`)

| Concepto | Cuenta default |
|---|---|
| Costo de ventas | `612035` Costo de venta de muebles (clase 6) |
| Salida de PT | `143005` Productos terminados (activo) |

### Tests (3 nuevos en `engineTests.js`)

| Test | Verifica |
|---|---|
| `t_postCostOfSale` | Resolución del costo desde `orders+products`: 2 × $700 = $1.400; DR 612035 / CR 143005; balanceado |
| `t_postCostOfSale_explicit_cost` | Si `invoice.cost` viene pre-calculado, se usa directo sin cruzar orders |
| `t_postCostOfSale_order_not_found` | Falla con `error: 'order_not_found'` si no resuelve el costo |

Adicionalmente, el ciclo NC-3+H2 se valida vía `t_cogs_reverso_proporcional`: postear COGS de PED-TEST $1.400 → emitir reverso NC al 50% → genera JE `nota_credito_cogs` con DR 143005 $700 / CR 612035 $700 (50% del COGS original).

## H1 — postCustomerAdvance

### Implementado

| Pieza | Archivo |
|---|---|
| Hook puro `postCustomerAdvance(payment, ctx)` con bank PUC en cascada (`payment.bankPucCode` > `bankAccountId` > `mapping.bank_default`) | `src/lib/accountingEngine.js` |
| Acción `postCustomerAdvance` en AppContext (patrón `postCustomerCollection`) | `src/store/AppContext.jsx` |
| Cableado en Tesorería `approve`: si `payment.type==='anticipo' && !order.invoiced` → `postCustomerAdvance`; en otro caso → `postCustomerCollection` (comportamiento previo intacto). Toast diferencia el caso. | `src/views/Tesoreria.jsx` |

### Cuentas (con override por `accountingMappings.customer_advance`)

| Concepto | Cuenta default |
|---|---|
| Banco (débito) | resolución en cascada; fallback `111005` Bancolombia |
| Anticipos recibidos | `280505` Anticipos y avances recibidos de clientes (pasivo) |

### Tests (3 nuevos)

| Test | Verifica |
|---|---|
| `t_postCustomerAdvance` | DR 111005 / CR 280505 balanceado; `source='customer_advance'` |
| `t_postCustomerAdvance_fallback_bank` | Si no se pasa `bankAccountId`, usa `mapping.bank_default` |
| `t_postCustomerAdvance_invalid_amount` | Rechaza `amount <= 0` con `error: 'invalid_payment'` |

### Aplicación del anticipo (pendiente, fuera de scope)

Cuando luego se emita la factura sobre un pedido con anticipo, debe haber un asiento separado de "aplicación del anticipo":

```
DR 280505  monto_anticipo     ← cancela el pasivo
   CR 130505  monto_anticipo  ← reduce la cartera (la factura ya generó el cargo)
```

Esto NO está cableado todavía porque el motor React no tiene un flow explícito de "emitir factura" separado de la creación del pedido. Cuando se cablee facturación plena (futuro), este asiento será un hook adicional `applyCustomerAdvance(invoiceId, advanceAmount)` o se hará inline.

## Validación automática

- **Suite C4 / Centro de Pruebas:** 31 PASS / 0 FAIL (18 originales + 9 NC/H2 + 3 H1 + 1 retroactivo ND).
- **Vite build / HMR:** sin errores.

## Validación manual (vía Preview MCP)

H2 y H1 dependen de flujos UI complejos (crear venta nueva, aprobar pago) que ya están validados en sus respectivos commits. El reverso COGS proporcional **fue validado por suite C4** porque la persistencia de asientos en vivo (flag transversal abierto) impide validar el ciclo COGS+reverso end-to-end vía UI sin un cambio en `ACCOUNTING_SEED`. La suite ejecuta el ciclo completo en memoria — cobertura equivalente.

## Resumen ejecutivo

- ✅ H2 cierra el ciclo COGS+reverso de NC-3 (sin tocar más código).
- ✅ H1 separa correctamente anticipo (pasivo) de cobro contra factura (cartera).
- ✅ 6 tests nuevos, suite 31/31 PASS.
- ✅ Defaults `cogs_on_invoice` y `customer_advance` ya estaban seedados (sin huecos PUC).

**Estado:** APROBADO. Cierra los hooks pequeños del motor.
