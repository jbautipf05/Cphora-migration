# Roadmap de Remediación 30/60/90 — CASTOR · Cphora

> Plan por **fases con criterios de salida medibles**, no por fechas de calendario.
> Las ventanas (3 días / 30 / 60 / 90) son **estimaciones** de esfuerzo relativo, no
> compromisos. Referencias: deuda técnica [AUDIT_REPORT.md §4](AUDIT_REPORT.md),
> tests T1-T10 [§5](AUDIT_REPORT.md), decisiones [adr/](adr/).

**Principio rector:** primero la red de seguridad (tests), luego los fixes críticos
*detrás* de un characterization test, luego estabilización y por último madurez.
No se aplica ningún fix de correctitud sin un test que lo fije antes o a la vez.

---

## Fase 0 — Pre-trabajo (estimado: días 1-3)

**Objetivo:** que exista infraestructura de pruebas y CI antes de tocar lógica.
Sin esto, todo fix posterior carece de red de seguridad.

**Ítems:**
- **INFRA-1**: instalar y configurar Vitest + `@testing-library/react` + `user-event`
  + `jest-dom` + jsdom; scripts `test` y `coverage`; bloque `test` en `vite.config.js`.
- **INFRA-2**: CI mínimo (p. ej. GitHub Actions) que corra `pnpm lint` + `pnpm test`
  en cada push/PR a `main`. Bloquear merge si fallan.

**Criterios de salida (medibles):**
- `pnpm test` corre y reporta (aunque sea 1 test trivial verde).
- `pnpm coverage` genera reporte.
- Un push de prueba dispara CI y su resultado (verde/rojo) aparece en el PR.

**Riesgo si se omite:** cualquier fix de las fases siguientes se haría a ciegas;
los bugs críticos (TD-01, TD-18) podrían “arreglarse” introduciendo regresiones sin
que nadie lo note. **Es el bloqueante de todo el roadmap.**

---

## Fase 1 — Fundación (estimado: 30 días)

**Objetivo:** cubrir el motor contable con tests unitarios y resolver los hallazgos
**críticos** detrás de esa red. Al cerrar la fase, los tres bugs críticos de
correctitud están corregidos *y verificados*.

**Ítems — tests primero:**
- **T1** (unit `postJournalEntry`): incluye los casos de validación muerta
  (título/inactiva/tercero) como *characterization* — estarán **en rojo** y
  documentan el comportamiento actual roto.
- **T2** (integración `hydrate` round-trip): characterization de TD-01 + TD-02.
- **T4** (unit reportes: ecuación, balance, saldo padre).
- **T6** (unit redondeo/dinero).

**Ítems — fixes (solo después de que T2 y los casos de T1 estén escritos):**
- **TD-01** (`counters.je`): inicializar al máximo correlativo en hidratación.
- **TD-02** (re-seed): separar catálogo PUC estático del libro transaccional;
  mezclar `journalEntries/journalLines/costCenters/fiscalPeriods` con lo persistido.
- **TD-18** (validación cuenta-título muerta): reemplazar el guard por `acc.level < 6`.

**Criterios de salida (medibles):**
- Cobertura de `src/lib/accountingEngine.js` y `src/lib/accounting.js` **≥ 85%**.
- **T2 pasa de rojo a verde** tras aplicar TD-01 + TD-02 (demuestra que un asiento
  posteado persiste y su ID no colisiona tras recargar).
- Los casos título/inactiva de **T1 pasan a verde** tras TD-18.
- Ecuación contable cuadra en una suite que incluye un asiento a cuenta padre.

**Riesgo si se omite:** la contabilidad sigue perdiendo datos al recargar y
produciendo IDs duplicados y estados financieros incorrectos — el sistema es
inutilizable para contabilidad real.

---

## Fase 2 — Estabilización (estimado: 60 días)

**Objetivo:** cubrir los flujos restantes y resolver los **quick wins de severidad
alta**; empezar a ejecutar ajustes derivados de los ADRs.

**Ítems — tests:**
- **T3** (postSale/collection + costo de venta), **T5** (nómina + mapeo postPayroll),
  **T7** (AsientosManuales), **T8** (Ventas), **T9** (reverso).

**Ítems — fixes (quick wins alta severidad):**
- **TD-19** (exigir tercero: añadir `requiresThirdParty` al catálogo + guard).
- **TD-21** (postSale registra costo de venta cuando `costoVenta > 0`).
- **TD-22** (postPayroll: separar deducciones del empleado de retefuente).
- **TD-20** (unificar `activa`/`active`), **TD-24** (política de período inexistente),
  **TD-25** (normalizar contrato de retorno `warning`), **TD-12** (exponer fallo de
  cuota de `save`), **TD-13** (code-splitting con `React.lazy` + Rolldown).

**Ítems — arquitectura (derivados de ADRs):**
- **TD-06** (cablear `postSupplyPurchase/SupplierPayment/Payroll/reverse` a la UI).
- **TD-23** (corregir las 3 desviaciones de nómina vs normativa).

**Criterios de salida (medibles):**
- T3, T5, T7, T8, T9 en verde.
- Cobertura `src/lib/` **≥ 90%**; `store/` **≥ 70%**.
- Todos los hallazgos de severidad **alta** del informe cerrados o con ticket en curso.
- Los 4 hooks contables disponibles desde la UI (TD-06).

**Riesgo si se omite:** persisten desviaciones de nómina frente a la norma y la
divergencia ERP↔contabilidad; las ventas en vivo siguen sin reflejar costo/inventario.

---

## Fase 3 — Madurez (estimado: 90 días)

**Objetivo:** confianza end-to-end, refactors estratégicos y **decisiones de fondo**
sobre backend y deuda tolerable.

**Ítems — tests:**
- **T10** (E2E smoke con Playwright del happy-path).

**Ítems — refactors estratégicos:**
- **TD-03**: **decisión** sobre backend (Supabase recomendado) y reescritura del
  adaptador como asíncrono. Es un proyecto en sí mismo; aquí se decide y se arranca.
- **TD-04** (RBAC, depende de auth/backend) · **TD-11** (TypeScript incremental,
  empezando por `src/lib/`) · **TD-10** (snapshots de saldo para cierre de período).

**Ítems — revisión de deuda tolerable:**
- Revisar TD-07, TD-08, TD-14, TD-15, TD-16, TD-17 y decidir cuáles abordar.

**Criterios de salida (medibles):**
- T10 en verde en CI.
- Decisión documentada (ADR actualizado) sobre backend, con un *spike* o PoC iniciado.
- Plan de adopción de TypeScript acordado (al menos `src/lib/` tipado).

**Riesgo si se omite:** el sistema se queda en MVP permanente: nunca soporta
multiusuario, auth ni durabilidad real, que son requisitos del producto.

---

## Resumen de dependencias entre fases

```
Fase 0 (infra/CI)
   └─► Fase 1: T1,T2,T4,T6  →  fix TD-01, TD-02, TD-18
          └─► Fase 2: T3,T5,T7,T8,T9  →  fix TD-19/21/22/20/24/25/12/13/06/23
                 └─► Fase 3: T10  →  TD-03/04/11/10 + revisión tolerables
```

TD-04 (RBAC) **depende de** TD-03 (backend/auth). TD-21/22/23 (correctitud) **dependen
de** sus tests (T3/T5) escritos primero. Ningún fix de Fase 1 procede sin Fase 0.
