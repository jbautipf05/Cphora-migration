# Backlog de Tickets — CASTOR · Cphora

> Tickets accionables derivados de la auditoría. Ordenados por **fase** y, dentro de
> cada fase, por **prioridad** (P0 > P1 > P2 > P3). Esfuerzo (S/M/L/XL) es estimación.
> Contexto: [AUDIT_REPORT.md](AUDIT_REPORT.md) · [REMEDIATION_ROADMAP.md](REMEDIATION_ROADMAP.md).

> **Ya resuelto durante la auditoría:** `[TD-09] README desactualizado` — cerrado
> (README, ARCHITECTURE, RUNBOOK y README de `src/lib` actualizados). No requiere ticket.

---

## Fase 0 — Pre-trabajo

```
[INFRA-1] Configurar infraestructura de tests (Vitest + RTL + jsdom)
Tipo: infra
Prioridad: P0
Esfuerzo: M
Fase: 0
Depende de: —
Descripción: Instalar vitest, @vitest/coverage-v8, @testing-library/react,
  @testing-library/user-event, @testing-library/jest-dom, jsdom. Añadir scripts
  "test" y "coverage" en package.json y bloque test:{environment:'jsdom', setupFiles}
  en vite.config.js.
Criterio de aceptación: `pnpm test` ejecuta al menos un test verde; `pnpm coverage`
  genera reporte de cobertura.
Referencias: AUDIT_REPORT.md §5; README.md "Correr tests".
```

```
[INFRA-2] CI mínimo que corra lint + tests en cada push
Tipo: infra
Prioridad: P0
Esfuerzo: S
Fase: 0
Depende de: INFRA-1
Descripción: Pipeline (p. ej. GitHub Actions) que ejecute `pnpm lint` y `pnpm test`
  en push/PR a main y bloquee el merge si fallan.
Criterio de aceptación: un PR de prueba muestra el check de CI (verde/rojo) y un
  test fallando impide el merge.
Referencias: REMEDIATION_ROADMAP.md Fase 0.
```

---

## Fase 1 — Fundación

```
[T1] Suite unit de postJournalEntry (incl. validaciones muertas)
Tipo: test
Prioridad: P0
Esfuerzo: M
Fase: 1
Depende de: INFRA-1
Descripción: Cubrir cuadre DB=CR, línea ambos lados, línea en cero, totales en cero,
  idempotencia y contrato de retorno (ok/error/warning). Incluir como characterization
  los casos hoy rotos: posteo a cuenta título, a cuenta inactiva, sin tercero, y a
  período inexistente (estarán en rojo hasta TD-18/19/20/24).
Criterio de aceptación: suite verde para lo que ya funciona; casos de validación
  muerta marcados como pendientes (skip/expected-fail) con referencia al TD que los cierra.
Referencias: accountingEngine.js:47-156; TD-18/19/20/24/25.
```

```
[T2] Integración hydrate() round-trip (characterization de TD-01/TD-02)
Tipo: test
Prioridad: P0
Esfuerzo: M
Fase: 1
Depende de: INFRA-1
Descripción: Mockear localStorage; postear un asiento, serializar/deserializar,
  re-hidratar y afirmar (a) que el asiento persiste y (b) que su ID no colisiona con
  los seeds. Inicialmente en rojo (documenta el bug).
Criterio de aceptación: el test existe y queda rojo; pasará a verde tras TD-01+TD-02.
Referencias: AppContext.jsx:99-110; TD-01, TD-02; ADR-003.
```

```
[T4] Unit de reportes contables
Tipo: test
Prioridad: P1
Esfuerzo: M
Fase: 1
Depende de: INFRA-1
Descripción: getSaldosPorClase (ecuación A=P+Pat+Util y ecuacionCuadra),
  buildBalancePrueba (cuadre, saldo inicial/mov/final), getSaldoCuenta (agregación de
  cuenta padre por prefijo). Incluir un asiento a cuenta padre para verificar el efecto.
Criterio de aceptación: suite verde; el caso de cuenta padre documenta el efecto de TD-18.
Referencias: accounting.js:76-152, 258-272; TD-10, TD-18.
```

```
[T6] Unit de redondeo y dinero
Tipo: test
Prioridad: P1
Esfuerzo: S
Fase: 1
Depende de: INFRA-1
Descripción: Comportamiento de round() y eqMoney(tol=0.5): casos límite y acumulación
  de redondeo en asientos de muchas líneas. (Opcional: fast-check para property-based.)
Criterio de aceptación: tests verdes que documentan el alcance de la tolerancia 0.5.
Referencias: accountingEngine.js:21-22; TD-08; ADR-007.
```

```
[TD-01] Inicializar counters.je para evitar colisión de IDs
Tipo: bug
Prioridad: P0
Esfuerzo: S
Fase: 1
Depende de: T2
Descripción: En la hidratación, inicializar counters.je al máximo correlativo de
  JE-NNNNNN existente, de modo que el primer asiento en vivo no nazca como JE-000001.
Criterio de aceptación: T2 verde; postear N asientos genera IDs únicos y monótonos sin
  colisionar con los seeds.
Referencias: accountingEngine.js:122; AppContext.jsx:92; ADR-003.
```

```
[TD-02] Separar catálogo PUC estático del libro transaccional persistido
Tipo: bug
Prioridad: P0
Esfuerzo: M
Fase: 1
Depende de: T2, TD-01
Descripción: Sacar journalEntries/journalLines/costCenters/fiscalPeriods de
  ACCOUNTING_SEED() (que hoy los re-impone en cada hidratación) y mezclarlos con lo
  persistido; mantener solo pucCatalog (y, si se desea, asientos semilla inmutables)
  como re-sembrados desde código.
Criterio de aceptación: T2 verde; un asiento posteado y un centro de costo editado
  sobreviven a un reload.
Referencias: AppContext.jsx:51-57, 103-109; ADR-003.
```

```
[TD-18] Corregir validación de cuenta-título muerta
Tipo: bug
Prioridad: P0
Esfuerzo: S
Fase: 1
Depende de: T1
Descripción: El guard usa acc.type (inexistente en el catálogo). Reemplazar por
  acc.level < 6 para rechazar posteos a cuentas título/padre.
Criterio de aceptación: los casos de título de T1 pasan a verde; postear a '11' o '1105'
  retorna error 'titulo_account'; la ecuación no se rompe por posteo a cuenta padre.
Referencias: accountingEngine.js:89; accounting.js:133.
```

---

## Fase 2 — Estabilización

```
[T3] Unit de postSale / postCustomerCollection (incl. costo de venta)
Tipo: test
Prioridad: P1
Esfuerzo: M
Fase: 2
Depende de: INFRA-1
Descripción: Verificar mapeo de cuentas PUC, split de IVA (factura 19% vs remisión 0%),
  banco→CxR en cobro, y la aserción de líneas de costo de venta (hoy ausentes → rojo
  hasta TD-21).
Criterio de aceptación: suite verde salvo el caso de costo de venta (pendiente de TD-21).
Referencias: accountingEngine.js:214-276; TD-06, TD-07, TD-21.
```

```
[T5] Unit de nómina (preview + mapeo de postPayroll)
Tipo: test
Prioridad: P1
Esfuerzo: M
Fase: 2
Depende de: INFRA-1
Descripción: calcPayrollPreview: exoneración Ley 1607 (<10 SMMLV), aux. transporte
  (límite 2 SMMLV, boundary), deducciones empleado, provisiones (base de vacaciones),
  tope/piso de IBC. Además, mapeo de cuentas de postPayroll (deducciones del empleado).
Criterio de aceptación: casos correctos en verde; los casos de TD-22/TD-23 marcados
  como pendientes hasta su fix.
Referencias: accounting.js:196-255; accountingEngine.js:396-456; TD-22, TD-23.
```

```
[T7] Componente AsientosManuales (cuadre en vivo + submit)
Tipo: test
Prioridad: P2
Esfuerzo: M
Fase: 2
Depende de: INFRA-1
Descripción: RTL: el cuadre se actualiza al editar líneas; submit llama postManualEntry
  y muestra toast OK/error.
Criterio de aceptación: interacción simulada produce el toast esperado y la acción correcta.
Referencias: views/AsientosManuales.jsx.
```

```
[T8] Componente Ventas (pedido → asiento)
Tipo: test
Prioridad: P2
Esfuerzo: M
Fase: 2
Depende de: INFRA-1
Descripción: RTL: crear pedido dispara postSale; registrar pago dispara
  postCustomerCollection; se muestran toasts con el ID del asiento.
Criterio de aceptación: el flujo simulado genera las acciones y toasts esperados.
Referencias: views/Ventas.jsx:81-142; TD-06.
```

```
[T9] Unit de reverseJournalEntry
Tipo: test
Prioridad: P2
Esfuerzo: S
Fase: 2
Depende de: INFRA-1
Descripción: Verificar asiento espejo (debe↔haber), marca del original como reversed,
  y que un segundo reverso se rechaza.
Criterio de aceptación: suite verde para reverso simple y doble-reverso bloqueado.
Referencias: accountingEngine.js:173-209.
```

```
[TD-19] Exigir tercero en cuentas que lo requieren
Tipo: bug
Prioridad: P1
Esfuerzo: S-M
Fase: 2
Depende de: T1
Descripción: Añadir requiresThirdParty al catálogo PUC en las cuentas pertinentes
  (130505, 220505, 2365xx, etc.) y mantener/activar el guard del engine.
Criterio de aceptación: postear a 130505 sin tercero retorna error 'missing_third_party';
  el caso correspondiente de T1 pasa a verde.
Referencias: accountingEngine.js:105; pucCatalog.js.
```

```
[TD-21] postSale debe registrar el costo de venta
Tipo: bug
Prioridad: P1
Esfuerzo: M
Fase: 2
Depende de: T3
Descripción: Cuando invoice.costoVenta > 0, generar las líneas 612035 DR / 143005 CR
  (o un asiento source:'cost_of_sale' asociado), como hace el seed.
Criterio de aceptación: el caso de costo de venta de T3 pasa a verde; una venta en vivo
  descarga inventario y reconoce COGS.
Referencias: accountingEngine.js:214-248; TD-06.
```

```
[TD-22] postPayroll: clasificar correctamente las deducciones del empleado
Tipo: bug
Prioridad: P1
Esfuerzo: M
Fase: 2
Depende de: T5
Descripción: Salud/pensión del empleado no deben acreditarse a 236505 (retención en la
  fuente). Separar la retefuente real de las deducciones de seguridad social del
  empleado y acreditar a la cuenta correcta. Requiere que el run traiga el desglose.
Criterio de aceptación: el asiento de nómina acredita cada concepto a su cuenta; T5 verde.
Referencias: accountingEngine.js:438-444.
```

```
[TD-06] Cablear los hooks contables restantes a la UI
Tipo: feature
Prioridad: P1
Esfuerzo: M
Fase: 2
Depende de: —
Descripción: Añadir disparadores en UI para postSupplyPurchase (recepción OC en Almacén),
  postSupplierPayment (Tesorería salientes), postPayroll (corrida de nómina) y
  reverseJournalEntry (anular asiento).
Criterio de aceptación: cada hook puede ejecutarse desde su vista y genera el asiento
  correspondiente, visible en Libro Diario.
Referencias: accountingEngine.js; views/AlmacenMP.jsx, Tesoreria.jsx, RRHH/ConfiguracionNomina.jsx.
```

```
[TD-23] Corregir desviaciones de cálculo de nómina vs normativa
Tipo: bug
Prioridad: P2
Esfuerzo: M
Fase: 2
Depende de: T5
Descripción: (a) Aux. transporte: usar base <= 2*SMMLV (no <). (b) Provisión de
  vacaciones: base sin auxilio de transporte. (c) Aplicar tope/piso de IBC
  (min 25*SMMLV, máx sobre 1*SMMLV) en salud/pensión.
Criterio de aceptación: los casos de TD-23 en T5 pasan a verde y coinciden con la norma.
Referencias: accounting.js:204, 219-224, 196-217; ADR-007.
```

```
[TD-20] Unificar campo activa/active en validación de cuenta
Tipo: bug
Prioridad: P2
Esfuerzo: S
Fase: 2
Depende de: T1
Descripción: El engine lee acc.active; el catálogo usa activa. Unificar el nombre y
  reactivar el guard de cuenta inactiva.
Criterio de aceptación: una cuenta marcada inactiva no admite movimiento; caso de T1 verde.
Referencias: accountingEngine.js:94; pucCatalog.js:26.
```

```
[TD-24] Definir política para posteo en período inexistente
Tipo: refactor
Prioridad: P2
Esfuerzo: S
Fase: 2
Depende de: T1
Descripción: Hoy una fecha fuera de los períodos sembrados omite el control de cierre.
  Decidir y aplicar: rechazar, o crear el período como 'abierto' explícitamente.
Criterio de aceptación: política documentada e implementada; T1 cubre el caso.
Referencias: accountingEngine.js:114-119.
```

```
[TD-25] Normalizar el contrato de retorno (warning ambiguo)
Tipo: refactor
Prioridad: P2
Esfuerzo: S
Fase: 2
Depende de: T1
Descripción: La idempotencia retorna {warning} (ni ok ni error) y los callers no dan
  feedback. Normalizar (p. ej. {ok:false, code:'already_posted', journalId}) y que la UI
  informe "ya contabilizado".
Criterio de aceptación: un reposteo muestra aviso al usuario; contrato cubierto por T1.
Referencias: accountingEngine.js:62-65; views/Ventas.jsx:105-109.
```

```
[TD-12] Exponer fallo de cuota de localStorage en save()
Tipo: bug
Prioridad: P2
Esfuerzo: S
Fase: 2
Depende de: —
Descripción: save() traga el error en catch{}. Emitir feedback (toast/telemetría)
  cuando la escritura falle por cuota o indisponibilidad.
Criterio de aceptación: al forzar un fallo de localStorage, el usuario recibe aviso.
Referencias: persistence.js:32-37; ADR-001.
```

```
[TD-13] Code-splitting para reducir el bundle
Tipo: refactor
Prioridad: P2
Esfuerzo: S
Fase: 2
Depende de: —
Descripción: Aplicar React.lazy por vista y/o build.rolldownOptions.output.codeSplitting;
  separar Chart.js en su propio chunk. Bundle actual: 719 KB (199 KB gzip), un solo chunk.
Criterio de aceptación: el build produce múltiples chunks y desaparece el warning de
  chunk > 500 KB (o se reduce el chunk inicial de forma medible).
Referencias: vite.config.js; build verificado 2026-05-25.
```

---

## Fase 3 — Madurez

```
[T10] E2E smoke del happy-path
Tipo: test
Prioridad: P2
Esfuerzo: M
Fase: 3
Depende de: INFRA-1
Descripción: Playwright: abrir la app, navegar a Ventas, crear un pedido y verlo
  reflejado en el Libro Diario.
Criterio de aceptación: el smoke corre en CI y pasa de forma estable.
Referencias: AUDIT_REPORT.md §5.
```

```
[TD-03] Decisión e inicio de backend (persistencia real + adaptador async)
Tipo: feature
Prioridad: P1
Esfuerzo: XL
Fase: 3
Depende de: —
Descripción: Decidir backend (Supabase recomendado por SQL/RLS). Reescribir el contrato
  del adaptador de persistencia como asíncrono. Es un proyecto en sí; aquí se decide y
  se inicia (spike/PoC).
Criterio de aceptación: ADR de selección de backend actualizado y aceptado; PoC que
  lee/escribe un slice contra el backend elegido.
Referencias: persistence.js; ADR-001.
```

```
[TD-04] Control de acceso por roles (RBAC)
Tipo: feature
Prioridad: P1
Esfuerzo: L
Fase: 3
Depende de: TD-03
Descripción: Definir matriz de roles/permisos (gerencia/comercial/contabilidad/…) y
  aplicarla a navegación y acciones; integrar con la auth del backend.
Criterio de aceptación: un rol sin permiso no puede postear asientos ni ver nómina;
  navegación filtrada por rol.
Referencias: AppContext.jsx:93; ADR-006.
```

```
[TD-11] Adopción incremental de TypeScript (empezando por src/lib/)
Tipo: refactor
Prioridad: P2
Esfuerzo: XL
Fase: 3
Depende de: —
Descripción: Introducir TS de forma incremental; tipar primero el motor contable y las
  formas de los slices del store (códigos de cuenta, IDs, períodos, dinero).
Criterio de aceptación: src/lib/ tipado y compilando sin errores; tipos para journalEntry/
  journalLine/account.
Referencias: ADR-004.
```

```
[TD-10] Snapshots de saldo para cierre de período
Tipo: refactor
Prioridad: P2
Esfuerzo: L
Fase: 3
Depende de: TD-02
Descripción: Mantener la derivación on-read para reportes en caliente, pero persistir
  snapshots inmutables del saldo al cerrar un período.
Criterio de aceptación: cerrar un período guarda un snapshot que no cambia si se editan
  asientos posteriores; el cierre se puede ejecutar desde UI.
Referencias: accounting.js; ADR-009.
```

```
[TD-07] Centralizar códigos de cuenta PUC (eliminar strings mágicos)
Tipo: refactor
Prioridad: P3
Esfuerzo: M
Fase: 3
Depende de: —
Descripción: Reemplazar los códigos de cuenta hardcodeados (130505, 240805, bancos en
  KPIs, etc.) por constantes/mapa central. Incluye el sub-hallazgo de bancos
  hardcodeados en getKPIs (derivarlos de bankAccounts[].pucCode).
Criterio de aceptación: no quedan códigos PUC literales dispersos en lib/; KPIs derivan
  bancos del estado.
Referencias: accountingEngine.js; accounting.js:160-164.
```

```
[TD-08] Evaluar representación de dinero (enteros/decimal)
Tipo: refactor
Prioridad: P3
Esfuerzo: M
Fase: 3
Depende de: T6
Descripción: Evaluar enteros-centavos o decimal.js para cálculos contables y revisar la
  tolerancia eqMoney (0.5). Documentar la decisión.
Criterio de aceptación: decisión documentada (ADR-007 actualizado); si se cambia, T6 cubre
  la nueva representación.
Referencias: accountingEngine.js:21-22; ADR-007.
```

```
[TD-14] Reducir boilerplate de las acciones contables
Tipo: refactor
Prioridad: P3
Esfuerzo: S
Fase: 3
Depende de: —
Descripción: Los 8 wrappers de acción casi idénticos en AppContext pueden generarse con
  un helper común.
Criterio de aceptación: las acciones contables se definen vía un helper sin duplicar el
  patrón setState+applyJournalResult.
Referencias: AppContext.jsx:198-271; ADR-002.
```

```
[TD-15] Documentar/abordar la migración destructiva de STORAGE_KEY
Tipo: docs
Prioridad: P3
Esfuerzo: S
Fase: 3
Depende de: —
Descripción: Documentar que el bump de STORAGE_KEY descarta datos; cuando haya dato real,
  introducir migración versionada o trasladar la verdad al backend.
Criterio de aceptación: nota explícita en persistence.js y en docs; decisión registrada.
Referencias: persistence.js:12-21; ADR-008.
```

```
[TD-16] Evaluar introducción de router
Tipo: refactor
Prioridad: P3
Esfuerzo: M
Fase: 3
Depende de: —
Descripción: Evaluar react-router para deep-links, back del navegador y permisos por ruta
  (relacionado con RBAC).
Criterio de aceptación: decisión documentada (ADR-005 actualizado); si se adopta, las
  vistas son direccionables por URL.
Referencias: App.jsx:74; nav.js; ADR-005.
```

```
[TD-17] Mover/ignorar archivos de referencia de la raíz del repo
Tipo: docs
Prioridad: P3
Esfuerzo: S
Fase: 3
Depende de: —
Descripción: castor_accounting.js (359.6 KB) y Castor_Dashboard_Demo6.html (609.7 KB) no
  se importan; moverlos a /referencia o añadir a .gitignore documentando su rol.
Criterio de aceptación: la raíz del repo no contiene los archivos de referencia sueltos,
  o están claramente documentados como referencia.
Referencias: raíz del repo (verificado 2026-05-25).
```
