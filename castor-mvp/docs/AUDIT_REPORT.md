# Informe de Auditoría — CASTOR · Cphora

**Fecha:** 2026-05-25 · **Alcance:** `castor-mvp/` (frontend ERP + Contabilidad)
**Tipo:** auditoría de arquitectura, deuda técnica, correctitud de código y estrategia de pruebas.
**Documento autocontenido** — no requiere leer el historial de la auditoría.

---

## 1. Resumen ejecutivo

**Estado general.** CASTOR · Cphora es un **MVP funcional** y visualmente fiel: una
SPA React (React 19 + Vite 8, JS plano) que reproduce un ERP con módulo contable de
partida doble para una fábrica de muebles colombiana. Su **mejor activo** es un motor
contable **puro** (`src/lib/`), bien separado de la UI y trivialmente testeable. Su
**mayor debilidad** es que ese activo crítico no tiene ninguna red de seguridad
(0% de tests) y que la persistencia de la contabilidad es frágil.

**Hallazgos más importantes (top 5, por riesgo):**

1. **Validaciones de cuenta muertas** (TD-18, crítica): el motor consulta campos que
   el catálogo PUC no tiene (`type`/`active`/`requiresThirdParty`), por lo que los
   guards de cuenta-título, cuenta-inactiva y tercero-requerido **nunca disparan**.
   Postear a una cuenta título descuadra la ecuación contable de forma **invisible**.
2. **Asientos en vivo no sobreviven a un refresh** (TD-02, crítica): la hidratación
   re-siembra los slices contables desde código, descartando lo posteado/persistido.
3. **Colisión de IDs de asiento** (TD-01, crítica): `counters.je` sin inicializar →
   el primer asiento en vivo nace `JE-000001`, duplicando la apertura.
4. **Persistencia solo en cliente, sin backend ni auth** (TD-03, crítica): un solo
   navegador/dispositivo; incompatible con el requisito de ERP contable multiusuario.
5. **Cero tests sobre lógica crítica** (TD-05, alta): ningún test cubre el motor de
   partida doble, los reportes ni la nómina.

**Arbitraje de mayor ROI (identificado en la estrategia de testing):** existe una
**asimetría favorable** poco común — la lógica de negocio más crítica (contabilidad)
es **pura y barata de testear**, pero tiene **0% de cobertura**. Cubrir `src/lib/`
con tests unitarios es el movimiento de mayor retorno de toda la remediación: ataca
la raíz de los bugs de correctitud (TD-01, TD-18, nómina) con el menor esfuerzo.

**¿Listo para producción? En una frase:** **No** — el sistema no está listo para
producción contable: pierde datos en vivo al recargar, sus validaciones contables
clave están inertes y carece de tests, backend, autenticación y multiusuario.

---

## 2. Inventario de artefactos generados (índice)

| Artefacto | Ruta | Contenido |
|-----------|------|-----------|
| ADRs (9) | [adr/](adr/) | Decisiones de arquitectura (001-009), con README índice |
| Arquitectura | [ARCHITECTURE.md](ARCHITECTURE.md) | Alto nivel, diagramas Mermaid, flujos críticos, refs a ADRs |
| Runbook | [RUNBOOK.md](RUNBOOK.md) | Build, deploy, rollback, incidentes, owners |
| README principal | [../README.md](../README.md) | Propósito, stack, correr local/tests, estructura |
| README del núcleo | [../src/lib/README.md](../src/lib/README.md) | Contrato I/O del motor contable + gotchas del code-review |
| Roadmap de remediación | [REMEDIATION_ROADMAP.md](REMEDIATION_ROADMAP.md) | Plan por fases 30/60/90 con criterios de salida |
| Backlog de tickets | [BACKLOG.md](BACKLOG.md) | Tickets accionables (TD-XX + T1-T10) por fase/prioridad |
| Contexto técnico | [../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) | Estado detallado del código (preexistente) |

---

## 3. Hallazgos críticos y altos consolidados

Severidad **crítica/alta** de todas las fuentes (tech-debt + code-review), por riesgo.
Una línea por hallazgo. (`ev.` = evidencia: 🟢 verificada en código.)

| Riesgo | Hallazgo | TD | ADR | Ref. código | Ev. |
|--------|----------|----|----|-------------|-----|
| 🔴 | Validaciones de cuenta muertas (título/inactiva/tercero): campos inexistentes en el catálogo | TD-18/19/20 | — | `accountingEngine.js:89,94,105` | 🟢 |
| 🔴 | Asientos posteados en vivo se descartan al recargar (re-seed) | TD-02 | ADR-003 | `AppContext.jsx:103-109` | 🟢 |
| 🔴 | Colisión de IDs: primer asiento en vivo = `JE-000001` | TD-01 | ADR-003 | `accountingEngine.js:122` + `AppContext.jsx:92` | 🟢 |
| 🔴 | Persistencia solo cliente, sin backend/concurrencia/auth | TD-03 | ADR-001 | `persistence.js` | 🟢 |
| 🟠 | Cero tests sobre el motor contable, reportes y nómina | TD-05 | ADR-004 | `src/lib/*` | 🟢 |
| 🟠 | Sin control de acceso por roles (`role` no protege nada) | TD-04 | ADR-006 | `AppContext.jsx:93` | 🟢 |
| 🟠 | `postSale` no registra costo de venta (margen/inventario inflados) | TD-21 | — | `accountingEngine.js:214-248` | 🟢 |
| 🟠 | `postPayroll` clasifica deducciones del empleado como retefuente (`236505`) | TD-22 | — | `accountingEngine.js:438-444` | 🟢 |
| 🟠 | Motor parcialmente cableado: 4 hooks sin botón en UI | TD-06 | — | `views/` (solo `postSale/collection/manual`) | 🟢 |
| 🟠 | Tercero requerido nunca exigido (CxC/CxP sin tercero) | TD-19 | — | `accountingEngine.js:105` | 🟢 |
| 🟠 | Ecuación contable puede romperse por bug (no dato) vía cuenta padre | TD-18 | — | `accounting.js:133` | 🟢 |

> **Resolución de contradicción (oficial):** `PROJECT_CONTEXT.md §6` afirma que el
> motor valida "cuentas activas/auxiliares, terceros requeridos". El code-review
> demostró que esas validaciones están **muertas** (TD-18/19/20). **Versión oficial:
> la del code-review** — `PROJECT_CONTEXT.md` describe la *intención*, no el
> comportamiento real, y debe corregirse (pendiente del equipo).

---

## 4. Tabla de deuda técnica completa (actualizada con TD-18+)

**Leyenda esfuerzo (días-persona, estimado):** S ≤1 · M 2-3 · L 4-8 · XL >8.
**Ev.:** 🟢 verificado en código · 🟡 sospecha/parcial.

| ID | Ubicación | Categoría | Descripción | Sev. | Esf. | Impacto si se ignora | ADR | Ev. |
|----|-----------|-----------|-------------|------|------|----------------------|-----|-----|
| TD-01 | `accountingEngine.js:122`; `AppContext.jsx:92` | Código | `counters.je` sin init → IDs duplicados | 🔴 | S | Libro descuadrado, IDs colisionan | ADR-003 | 🟢 |
| TD-02 | `AppContext.jsx:103-109` | Diseño | Re-seed descarta asientos/centros en vivo al recargar | 🔴 | M | Pérdida silenciosa de datos contables | ADR-003 | 🟢 |
| TD-03 | `persistence.js` + global | Diseño | Solo localStorage, sin backend/concurrencia | 🔴 | XL | Inviable multiusuario; sin durabilidad | ADR-001 | 🟢 |
| TD-04 | `AppContext.jsx:93`, vistas | Seguridad | `role` no controla acceso (sin RBAC) | 🟠 | L | Sin segregación de funciones | ADR-006 | 🟢 |
| TD-05 | `src/lib/` + global | Tests | Cero tests automatizados | 🟠 | M-L | Regresiones contables invisibles | ADR-004 | 🟢 |
| TD-06 | Motor vs `views/` | Diseño | 4 hooks contables sin cablear a UI | 🟠 | M | Divergencia ERP↔contabilidad | — | 🟢 |
| TD-07 | `accountingEngine.js` (códigos PUC) | Código | Códigos de cuenta mágicos dispersos | 🟠 | M | Cambios de plan propensos a error | ADR-004 | 🟢 |
| TD-08 | `accountingEngine.js:21-22` | Código | Dinero `float`, tolerancia 0.5 | 🟠 | M | Descuadres de centavos no detectados | ADR-007 | 🟢 |
| TD-09 | `README.md` | Docs | README obsoleto (npm/5 vistas/sin contab.) | 🟠 | S | Onboarding erróneo | — | ✅ **Resuelto en auditoría** |
| TD-10 | `accounting.js` reportes | Performance | Balances on-read O(n×cuentas), sin snapshots | 🟡 | L | Degradación; bloquea cierre de período | ADR-009 | 🟢 |
| TD-11 | Todo el proyecto | Código | Sin TypeScript en dominio sensible | 🟠 | XL | Bugs de tipo (TD-01/07/18) no atrapados | ADR-004 | 🟢 |
| TD-12 | `persistence.js:32-37` | Código | `save()` traga error de cuota | 🟡 | S | Pérdida de datos silenciosa | ADR-001 | 🟢 |
| TD-13 | `vite.config.js` / build | Performance | Sin code-splitting; **719 KB / 199 KB gzip** (verificado) | 🟢 | S | Carga inicial algo más lenta | — | 🟢 |
| TD-14 | `AppContext.jsx:198-271` | Código | 8 wrappers de acción duplicados | 🟢 | S | Mantenimiento repetitivo | ADR-002 | 🟢 |
| TD-15 | `persistence.js:12-21` | Diseño | "Migración" = bump destructivo de `STORAGE_KEY` | 🟢 | S | Descarte de datos al cambiar shape | ADR-008 | 🟢 |
| TD-16 | `App.jsx:74` + `nav.js` | Código | Sin router (vista = string) | 🟢 | M | Sin deep-links/back | ADR-005 | 🟢 |
| TD-17 | Raíz repo | Docs | Archivos referencia: `Demo6.html` **609.7 KB**, `castor_accounting.js` **359.6 KB** (verificado) | 🟢 | S | Confusión/peso del repo | — | 🟢 |
| **TD-18** | `accountingEngine.js:89` (+`accounting.js:133`) | Código | **Validación cuenta-título MUERTA** (`acc.type` inexistente); permite postear a cuentas padre y rompe la ecuación de forma invisible | 🔴 | S | Estados financieros incorrectos | (ADR-004) | 🟢 |
| **TD-19** | `accountingEngine.js:105` | Código | **Tercero requerido nunca exigido** (`requiresThirdParty` inexistente) | 🟠 | S-M | CxC/CxP sin tercero; auxiliares rotos | (ADR-004) | 🟢 |
| **TD-20** | `accountingEngine.js:94` | Código | **Validación cuenta-inactiva MUERTA** (`acc.active` vs `acc.activa`) | 🟡 | S | Cuentas inactivas postables | (ADR-004) | 🟢 |
| **TD-21** | `accountingEngine.js:214-248` | Diseño | `postSale` no genera costo de venta (vs seed) | 🟠 | M | Margen e inventario inflados | (TD-06) | 🟢 |
| **TD-22** | `accountingEngine.js:438-444` | Código | `postPayroll` acredita deducciones del empleado a retefuente (`236505`) en vez de aportes por pagar | 🟠 | M | Pasivos de nómina mal clasificados | — | 🟢 |
| **TD-23** | `accounting.js:196-224` | Código | Nómina (3 desviaciones): aux. transporte `<` debe ser `<=` 2 SMMLV; provisión de vacaciones incluye aux.; falta tope/piso de IBC (25/1 SMMLV) | 🟠 | M | Liquidación de nómina desviada de la norma | ADR-007 | 🟢 |
| **TD-24** | `accountingEngine.js:114-119` | Código | Período inexistente omite el control de cierre | 🟡 | S | Posteo en períodos no definidos sin control | — | 🟢 |
| **TD-25** | `accountingEngine.js:62-65` | Código | Retorno `warning` ambiguo: reposteo no da feedback al usuario | 🟡 | S | Operaciones duplicadas sin aviso | — | 🟢 |

**Sub-hallazgos menores del code-review (anclados, no perdidos):**
- *#13* pago a proveedor sin OC cae a gasto genérico (`510550`) → seguimiento bajo **TD-06**.
- *#14* códigos de banco hardcodeados en KPIs (`accounting.js:160`) → bajo **TD-07**.
- *#15* `buildBalancePrueba` descarta cuentas desconocidas (`accounting.js:99`) → bajo **TD-10**.
- *#17* `reverseJournalEntry` retorna error sin `message`; *#18* línea con crédito negativo + débito pasa; *#19* impureza temporal (`Date.now`/`today`) → **monitorear** (severidad baja).

### Agrupación

**(a) Quick wins — alta/crítica severidad, esfuerzo S/M:**
TD-01 (S), TD-02 (M), **TD-18 (S)**, **TD-19 (S-M)**, **TD-21 (M)**, **TD-22 (M)**, TD-12 (S), TD-13 (S), TD-20 (S), TD-24 (S), TD-25 (S). *(TD-09 ya resuelto.)*

**(b) Refactors estratégicos — alto impacto, esfuerzo L/XL:**
TD-03 (XL, backend), TD-04 (L, RBAC), TD-11 (XL, TypeScript), TD-05 (M-L, suite de tests), TD-10 (L, snapshots de cierre), TD-06 (M, cablear motor), TD-23 (M, normativa nómina).

**(c) Deuda tolerable — solo monitorear:**
TD-07 (hasta tipar), TD-08 (a volumen demo), TD-14, TD-15, TD-16, TD-17 + sub-hallazgos #17/#18/#19.

---

## 5. Plan de testing (resumen)

**Pirámide objetivo (calibrada, no canónica): 75 / 20 / 5.** Más unit de lo habitual
porque el valor está en funciones puras; E2E mínimo porque sin backend aporta poco.
Objetivos de cobertura: `src/lib/` **90%+**, `store/` ~70%, `views/` ~35-40%.

```
   E2E ~5%   ── 1-2 smokes del happy-path (fase tardía)
   Integr. ~20% ── hydrate/persistencia + 2-3 flujos de vista (RTL)
   Unit ~75% ── motor contable (engine + reportes + nómina)
```

**Tests priorizados por ROI** (esf. en días-persona):

| # | Objetivo | Tipo | Mitiga | Esf. |
|---|----------|------|--------|------|
| T1 | `postJournalEntry`: cuadre, ambos lados, **título/inactiva/tercero (rojo hasta fix)**, **período inexistente**, idempotencia/**contrato warning** | Unit | TD-18/19/20/24/25 | S→M* |
| T2 | `hydrate()` round-trip: postear→recargar→persiste y sin colisión | Integración | TD-01, TD-02 | M |
| T3 | `postSale`/`collection`: mapeo PUC, IVA factura/remisión, **costo de venta** | Unit | TD-06, TD-07, **TD-21** | S→M* |
| T4 | Reportes: `getSaldosPorClase` (ecuación), `buildBalancePrueba` (cuadre), `getSaldoCuenta` (padre) | Unit | TD-10, TD-18 | M |
| T5 | Nómina: Ley 1607, **aux `<=`**, **vacaciones sin aux**, **tope IBC**, **mapeo `postPayroll`** | Unit | TD-22, **TD-23** | M |
| T6 | Redondeo/dinero: `round`, `eqMoney(0.5)`, acumulación | Unit | TD-08 | S |
| T7 | `AsientosManuales`: cuadre en vivo + submit → toast | Componente | regresión flujo manual | M |
| T8 | `Ventas`: pedido → `postSale`/`collection` → toast | Componente | TD-06 | M |
| T9 | `reverseJournalEntry`: espejo + marca original | Unit | reverso | S |
| T10 | E2E smoke: abrir→crear pedido→ver en Libro Diario | E2E | integración | M |

`*` Esfuerzo ampliado respecto al plan original por incorporar los hallazgos `[NUEVO]`.

**Qué NO testear:** componentes presentacionales (`ui.jsx`, `icons.jsx`), estilos/Tailwind,
wrapper de Chart.js, `format.js` (más allá de un sanity-check), interno de `localStorage`
(mockear), `nav.js`/seeds estáticos, stubs deliberados, y E2E exhaustivos hasta tener backend.

**Herramientas:** Vitest (+ `@vitest/coverage-v8`), `@testing-library/react` + `user-event`
+ `jest-dom`, jsdom; Playwright solo para T10 (fase tardía); `fast-check` opcional para T6.
