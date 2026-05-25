# ADR-003: Slices contables re-sembrados desde código en cada hidratación

**Status:** Accepted (de facto) — ⚠️ **contradice una feature en producción; fix PENDIENTE (roadmap)**
**Date:** 2026-05-25
**Deciders:** Tech lead (requiere decisión)

## Context

Al arrancar, `hydrate()` reconstruye el estado mezclando el seed base, lo
persistido y, **por encima de todo**, vuelve a imponer los slices contables
estáticos (`src/store/AppContext.jsx`):

```js
function hydrate() {
  const base = buildInitialState();   // incluye ACCOUNTING_SEED()
  const saved = loadState();
  if (!saved) return base;
  return {
    ...base,
    ...saved,             // lo persistido (incluye asientos posteados en vivo) SÍ entra…
    ...ACCOUNTING_SEED(), // …pero esto los PISA de nuevo con los seeds estáticos
    counters: { ...base.counters, ...(saved.counters || {}) },
    currentUser: saved.currentUser || base.currentUser,
  };
}
```

Y `ACCOUNTING_SEED()` incluye **más que el catálogo estático**:

```js
const ACCOUNTING_SEED = () => ({
  pucAccounts: PUC_CATALOG,          // estático legítimo
  journalEntries: SEED_JOURNAL_ENTRIES, // ← transaccional, CRECE en vivo
  journalLines: SEED_JOURNAL_LINES,     // ← transaccional, CRECE en vivo
  fiscalPeriods: SEED_FISCAL_PERIODS,   // ← editable (cierre de período)
  costCenters: SEED_COST_CENTERS,       // ← editable (CRUD en UI)
});
```

La **intención documentada** (PROJECT_CONTEXT §14.3) es buena: el **catálogo PUC**
y los **asientos semilla** deben venir siempre del código para garantizar
consistencia. El problema es que se metieron en el **mismo slice** datos que
**crecen y se editan en vivo**.

## Decision (actual, de facto)

Re-sembrar `pucAccounts`, `journalEntries`, `journalLines`, `fiscalPeriods` y
`costCenters` desde código en **cada** hidratación, pisando lo persistido.

## Consecuencia real — bug arquitectónico (evidencia en código)

1. **Asientos en vivo no sobreviven a un refresh.** `postSale`,
   `postCustomerCollection` y `postManualEntry` actualizan `journalEntries` en
   memoria y se guardan en localStorage vía debounce, **pero al recargar
   `ACCOUNTING_SEED()` los descarta** y deja solo los 12 asientos semilla. La
   contabilidad “en vivo” es efímera.
2. **Centros de Costo:** las altas/ediciones/borrados (CRUD existente en la UI)
   **no persisten** entre recargas por la misma razón.
3. **Cierre de períodos desde UI** (requisito §13): no podría persistir mientras
   `fiscalPeriods` siga en `ACCOUNTING_SEED()`.

## Bug acoplado — contador de asientos (`counters.je` ausente)

`buildInitialState().counters` **no define la clave `je`**
(`AppContext.jsx`), pero el motor calcula el ID del próximo asiento como
`const nextJe = (counters.je || 0) + 1;` (`src/lib/accountingEngine.js`). Como el
seed ya usa `JE-000001`…`JE-000012`, el **primer asiento posteado en vivo nace
como `JE-000001`**, duplicando el asiento de apertura. La idempotencia se valida
por `source+sourceId` (no por `id`), así que nada lo frena. Los siguientes 12
postings colisionan con los seeds.

> Combinado, esto hace de la **persistencia contable el área más frágil de toda
> la arquitectura.**

## Opciones para resolver (a decidir — NO implementado aún)

### Option A: Separar catálogo estático de libro transaccional
- `pucAccounts` (y quizá un set de “asientos semilla inmutables”) siguen
  re-sembrados desde código.
- `journalEntries`, `journalLines`, `costCenters`, `fiscalPeriods` salen de
  `ACCOUNTING_SEED()` y se persisten/mezclan como el resto del estado (seed solo
  si no hay nada guardado).
- Inicializar `counters.je` al máximo correlativo existente al hidratar.

**Pros:** arregla persistencia y colisión de IDs; respeta la intención original
(PUC estático). **Cons:** requiere lógica de merge seed↔persistido para no
duplicar los asientos semilla.

### Option B: Mantener todo estático y aceptar contabilidad efímera
**Pros:** cero cambios. **Cons:** invalida las features de posteo en vivo y CRUD
contable; inaceptable si esas features se consideran reales.

## Consequences (de la decisión actual, sin fix)

- **Hoy:** catálogo PUC y asientos semilla siempre consistentes.
- **Roto:** posteos contables en vivo, CRUD de centros de costo y futuro cierre
  de período no son durables.
- **A revisar:** este ADR queda como **decisión pendiente**; el fix (Option A +
  inicialización de `counters.je`) entra en el **roadmap final**, no se aplica aún
  por decisión explícita del equipo en esta iteración.

## Action Items

1. [ ] **(roadmap)** Implementar Option A: sacar slices transaccionales de
       `ACCOUNTING_SEED()` y mezclar con lo persistido.
2. [ ] **(roadmap)** Inicializar `counters.je` desde el máximo `JE-NNNNNN`
       existente en hidratación.
3. [ ] **(roadmap)** Añadir prueba: postear un asiento → recargar → el asiento
       persiste y su ID no colisiona con seeds.
4. [ ] Hasta entonces, **anotar en la Ui/README** que la contabilidad en vivo es
       efímera para no inducir a error en demos.
