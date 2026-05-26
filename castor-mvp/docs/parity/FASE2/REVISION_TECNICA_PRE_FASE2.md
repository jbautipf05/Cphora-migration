# Revisión técnica pre-Fase 2

> Pasada de **diagnóstico** (no se tocó código) sobre todo lo modificado en Fase 1
> + análisis preventivo de los módulos de Fase 2 (Clientes, Pedidos, OPs, Productos).
> Comandos ejecutados en orden: `/code-review` → `/tech-debt` → `/testing-strategy` → `/architecture`.
> Base de comparación: `castor-mvp/docs/AUDIT_REPORT.md` (tabla TD-01…TD-25, ADR-001…009, plan T1…T8).
> Fecha: 2026-05-26.

Archivos de Fase 1 revisados (12, vía `git diff b5e22ac~1..1d69662`):
`Header.jsx`, `Modal.jsx`, `NuevaCotizacionModal.jsx` (nuevo), `quotePdf.js` (nuevo),
`AppContext.jsx`, `Cotizaciones.jsx`, `Garantias.jsx`, `Inicio.jsx`, `Innovacion.jsx`,
`Leads.jsx`, `Postventa.jsx`, `RRHH.jsx`. Adyacentes inspeccionados: `format.js`,
`persistence.js`, `accountingEngine.js`, `nav.js`, y los módulos de Fase 2 (`Ventas.jsx`,
`Clientes.jsx`, `Produccion.jsx`) para la sección 4.

---

## Resumen ejecutivo

La calidad de Fase 1 es **buena a nivel de UI y paridad**: el patrón `pendingForm` (intent
transversal) es coherente, las validaciones inline de Leads son sólidas, la abstracción de
persistencia está bien pensada para el futuro Firebase, y el fix A27 quedó **consistente**
(todo el flujo de cotización ancla a `today()`/`DEMO_TODAY`).

Lo que la verificación visual **no** capturó y sí pesa para Fase 2:

1. **Anclaje de fecha inconsistente** (mismo defecto que A27, pero fuera del flujo ya
   corregido): `Leads` (creación vía formulario), `Ventas` (pedidos) y los pagos usan
   `nowISO()` (tiempo real) en vez de `today()` (DEMO_TODAY). Consecuencia concreta: **un
   pedido creado en la demo NO aparece en el gráfico de 6 meses de Inicio ni en las alertas
   de producción**, porque esos cálculos están anclados a abril 2026. → **BLOQUEANTE B1**.
2. **Relaciones por nombre, no por FK**: `Ventas` siempre guarda `customerId: null`, y
   `Clientes` reconstruye todo el historial cruzando por `clientName === c.name`. Editar el
   nombre de un cliente (algo plausible en Fase 2) **desvincula su historial en silencio**.
   → **BLOQUEANTE B2**.
3. **Duplicación**: `fmtCOP` existe en `lib/format.js` y en `lib/accounting.js`; `subtotal`/
   `total` están repetidos 2–3 veces y viven dentro de un componente React. Clientes y
   ListaPrecios (Fase 2) dependen de la copia de `accounting`. → BLOQUEANTE B3 / B4.

**Regla de pausa por bug crítico:** se evaluó cada hallazgo. **Ninguno** alcanza el umbral de
crash al guardar o pérdida de datos. Los riesgos más altos son de **correctitud** (fechas,
relaciones), corregibles con cambios pequeños, y se listan como bloqueantes. No se interrumpió
la revisión.

Convención de etiquetas: **[F1]** = introducido/expuesto por Fase 1 · **[PREEXISTENTE]** = ya
existía antes de Fase 1.

---

## 1. `/code-review` — hallazgos por archivo

Formato: `archivo:línea` → problema → severidad → fix sugerido.
Severidad: 🔴 crítica · 🟠 alta · 🟡 media · 🟢 baja.

| # | Archivo:línea | Problema | Sev | Etiqueta | Fix sugerido |
|---|---------------|----------|-----|----------|--------------|
| CR-01 | `NuevaCotizacionModal.jsx:191-194` | Tras `add('leads', …)` se hace `leads.find(x => x.id === lid)` sobre el array del render actual → para un lead **nuevo** `l` es `undefined` y el bloque de `update` se omite. Hoy es benigno (el lead nace `'En gestión'`), pero es un **stale-closure read** justo después de un `add`. | 🟡 | [F1] | No releer el estado; fijar `estado` dentro del propio `add`, o calcularlo antes de los `setState`. |
| CR-02 | `NuevaCotizacionModal.jsx:30-41` + `quotePdf.js:9-10` | `subtotal`/`total` definidos **2–3 veces** y exportados **desde un componente React**. Lógica de negocio acoplada a la capa UI. | 🟠 | [F1] | Extraer a `lib/quoteCalc.js` (`subtotal`, `total`, `QUOTE_SEG_OFFSETS`, `genQuoteSeguimientos`) e importar en el componente y en `quotePdf.js`. |
| CR-03 | `NuevaCotizacionModal.jsx:153-159` | Validación **incompleta vs. UI**: el form rotula "Asesor *" y "Canal *" pero `save()` solo exige `clientName` + ítems + descuento. Asimétrico con `Leads.validate` (que sí exige asesor). | 🟡 | [F1] | Validar `asesor`/`channel` en `save()`, o quitar el asterisco si Demo6 no los exige. |
| CR-04 | `NuevaCotizacionModal.jsx:58-81` vs `104-121` | `buildFromLead` y `applyLead` **duplican** el mapeo `productosInteres → items` y el toast de "productos arrastrados". | 🟢 | [F1] | Extraer `leadToItems(lead, products)` y reusar en ambos. |
| CR-05 | `Leads.jsx:64` y `:706`; `NuevaCotizacionModal.jsx` (patrón análogo) | `onBlur={() => setTimeout(() => setOpen(false), 150)}` **sin limpiar el timeout**. Si el componente desmonta dentro de esa ventana de 150 ms se ejecuta un `setState` tras unmount (warning de React + micro-leak). | 🟢 | [F1] | Guardar el id en `useRef` y `clearTimeout` en el cleanup del efecto / al seleccionar. |
| CR-06 | `Leads.jsx:197` | Lead creado vía formulario usa `createdAt: nowISO()`; el mismo lead creado desde el modal de cotización usa `today()` (`NuevaCotizacionModal.jsx:170`). **Misma entidad, dos orígenes de fecha.** | 🟠 | [PREEXISTENTE] (expuesto por A27) | Unificar a `today()`. Ver BLOQUEANTE B1. |
| CR-07 | `Cotizaciones.jsx:78-83` | Efecto que genera los 7 seguimientos diferidos depende de `[selId]` pero lee `sel` (eslint deshabilitado). Funciona porque `sel` se recomputa en el mismo render, pero es frágil ante cambios. | 🟢 | [F1] | Añadir `sel?.id`/`sel?.seguimientos` a deps o documentar la invariante. |
| CR-08 | `Cotizaciones.jsx:33-34, 124, 137-139` | `aceptadasSinPedido(r)` hace `orders.some(...)` por fila (O(filas × pedidos)); `subtotal`/`total` se recalculan en `sortValue` **y** en `render` por fila y por re-render. | 🟢 | [F1] | A escala demo es irrelevante; al crecer, indexar `orders` por `quoteId` (Set/Map) y memoizar totales por fila. |
| CR-09 | `AppContext.jsx:150-158` | `nextId` **retorna un valor calculado dentro del updater de `setState`** (asigna a `out` y lo devuelve). Anti-patrón: depende de que React ejecute el updater sincrónicamente. Bajo render concurrente / StrictMode / IDs async (Firebase) se rompe. | 🟠 | [PREEXISTENTE] | Calcular el contador fuera del updater (con `useRef`) o delegar la generación de IDs al backend cuando entre Firebase. |
| CR-10 | `NuevaCotizacionModal.jsx:188` | La cotización nace con `notasSeguimiento: []`, campo **muerto** (nunca se lee; las notas usan `notes_arr` en `Cotizaciones.jsx`). | 🟢 | [F1] | Eliminar el campo o consolidar el nombre con `notes_arr`. |
| CR-11 | `Cotizaciones.jsx:50-53` | `downloadPDF` llama `exportQuotePDF(...)` y **luego** muestra el toast "PDF generado" sin `try/catch`. Si jsPDF lanza, el toast no aparece y el error sube sin feedback claro (catch silencioso de facto). | 🟢 | [F1] | Envolver en `try/catch`; toast de error en el `catch`. |
| CR-12 | `Header.jsx:14-24` + consumidores | El intent `pendingForm` solo se limpia cuando la vista destino tiene un consumidor para ese `type`. Hoy las 3 opciones sin formulario usan `type: null` (no setean intent), así que no hay fuga; queda como **nota de diseño** para cuando se agreguen esos forms. | 🟢 | [F1] | Al agregar Pago/Terminado/Cuenta bancaria, añadir su consumidor o un "barrido" del intent al cambiar de vista. |

### Lo que está bien
- **Patrón `pendingForm`** (AppContext) reemplaza limpiamente las funciones globales de Demo6; es efímero y no se persiste (correcto).
- **A27 quedó consistente**: `genQuoteSeguimientos`, `createdAt`, `vigencia` y `verifySeguimiento` usan `today()` de punta a punta en el flujo de cotización.
- **Validaciones inline de Leads** (`validate` + estado `errors` + limpieza por campo) son robustas y bien aisladas.
- **`persistence.js`**: la abstracción por adaptador es exactamente el gancho correcto para Firebase; la limpieza pasiva de claves viejas es prolija.
- **Reutilización de `NuevaCotizacionModal`** en Cotizaciones y Leads sin duplicar el form (H-010) — buena decisión de componentización.

---

## 2. `/tech-debt` — delta incremental vs. TD-01…TD-25

> La tabla original (AUDIT_REPORT.md) es **casi enteramente contable** (motor/PUC/nómina),
> que está **fuera del alcance de paridad**. Fase 1 trabajó el bloque Comercial, en gran
> medida disjunto. Por eso el delta es acotado.

### 2.1 ¿Cuáles se resolvieron al hacer Fase 1?
- **Ninguno** de TD-01…TD-25 (todos son del dominio contable, no tocado). 
- Sí se resolvió el hallazgo **A27** (anclaje de fecha en cotizaciones) — que no era un TD numerado, sino de la auditoría de paridad.

### 2.2 ¿Cuáles empeoraron (o quedaron más expuestos)?
| TD | Estado | Por qué |
|----|--------|---------|
| **TD-05** (cero tests) | ⬆️ empeora | Fase 1 añadió lógica comercial no trivial (aprobación por descuento/vigencia, 7 seguimientos, autocreación de lead, PDF) **sin un solo test**. La superficie de regresión creció. |
| **TD-03** (solo cliente, sin atomicidad) | ⬆️ más expuesto | El patrón `add()` seguido de lectura del estado (CR-01) y `add('orders')` + `postSale()` no atómico (Ventas) hace más visible la falta de transacciones. |
| **TD-14** (wrappers duplicados en AppContext) | ↔️ sin cambio | No se tocó; sigue igual. |

### 2.3 Nuevos (TD-26 en adelante)
| TD | Ubicación | Tipo | Descripción | Sev | Esfuerzo | Relación |
|----|-----------|------|-------------|-----|----------|----------|
| **TD-26** | `lib/format.js:11` + `lib/accounting.js:42` | Código | **`fmtCOP`/`fmtNum` duplicados**. Fase 1 estandarizó las vistas comerciales en `format.js`, mientras 13 vistas (Clientes, ListaPrecios, contables) siguen importando de `accounting.js`. Dos implementaciones que pueden divergir. | 🟠 | S | — |
| **TD-27** | `NuevaCotizacionModal.jsx:30-31`, `quotePdf.js:9-10` | Código | **`subtotal`/`total` duplicados ×3** y alojados en un componente React (lógica de negocio en UI). | 🟠 | S | CR-02 |
| **TD-28** | `Leads.jsx:197`, `Ventas.jsx:85,118` | Diseño | **Anclaje de fecha inconsistente**: `nowISO()` (tiempo real) vs `today()` (DEMO_TODAY). Rompe gráficos/alertas de Inicio para datos creados en la demo. | 🟠 | S | A27, B1 |
| **TD-29** | `Ventas.jsx:87,101`, `Clientes.jsx:44-48` | Diseño | **Relaciones por nombre, no por FK**: `customerId: null` siempre; el join Cliente↔Pedido/Cotización/Lead se hace por `clientName`/`name`. Frágil ante renombres y homónimos; incompatible con un backend relacional. | 🔴 | M | B2 |
| **TD-30** | `AppContext.jsx:150-158` | Código | **`nextId` retorna desde el updater de `setState`** (anti-patrón concurrente). | 🟠 | S | CR-09 |
| **TD-31** | `Ventas.jsx:86-104` | Diseño | **`add('orders')` + `postSale()` no atómico**: si el asiento falla, el pedido ya quedó persistido sin contrapartida contable, sin rollback. | 🟠 | M | TD-06 |
| **TD-32** | `Leads.jsx:64,706` y modal | Código | **Timeouts de `onBlur` sin cleanup** (setState tras unmount). | 🟢 | S | CR-05 |

---

## 3. `/testing-strategy` — plan mínimo anti-regresión (Fase 1)

> Objetivo: que los hallazgos de Fase 1 **no reaparezcan**. No se escriben tests aquí; solo el
> plan. Complementa T1…T8 de AUDIT_REPORT (que son contables). Stack sugerido: **Vitest** (unit/
> integración sobre helpers y store) + **React Testing Library** para los pocos de componente.
> Máximo 10.

| # | Qué testear | Tipo | Prioridad | Cubre |
|---|-------------|------|-----------|-------|
| **TC-1** | `quoteCalc`: `subtotal`, `total` y monto de descuento (incl. redondeo y bloqueo `>50%`). | Unit | 🔴 Alta | CR-02, H-010 |
| **TC-2** | `genQuoteSeguimientos(createdAt)` → 7 fechas en offsets `[3,7,14,21,35,45,60]` calculadas desde `today()`/`DEMO_TODAY` (regresión directa de **A27**). | Unit | 🔴 Alta | A27, H-010 |
| **TC-3** | Lógica `requiresApproval = discount>20 || vigencia===20` y el `approvalReason` resultante. | Unit | 🟠 Alta | H-010 |
| **TC-4** | `Leads.validate`: nombre obligatorio, teléfono (sin letras, ≥7 dígitos), asesor obligatorio. | Unit | 🟡 Media | H-004 |
| **TC-5** | Integración store: crear cotización **sin** lead → crea lead **y** cotización con IDs secuenciales (`nextId`) **sin colisión**, ambos con `createdAt = today()`. | Integración | 🔴 Alta | H-010, CR-01, CR-09 |
| **TC-6** | `Header` "Crear nuevo": cada opción con `type` setea `pendingForm` y la vista destino abre su modal (las 6 con intent). | Componente | 🟡 Media | H-001 |
| **TC-7** | `NuevaCotizacionModal` reutilizado desde Leads abre/cierra **sin navegar** y dispara `onCreated`. | Componente | 🟡 Media | H-010 |
| **TC-8** | `leadValor = Σ(precio × qty)` a partir de `productosInteres`. | Unit | 🟢 Baja | H-003 |
| **TC-9** | `Inicio` (H-002) renderiza **todas** las bodegas, incluidas las de stock 0. | Componente | 🟢 Baja | H-002 |
| **TC-10** | `exportQuotePDF` **smoke**: no lanza con una cotización mínima (sin lead, ítems con/sin producto). | Unit/Integración | 🟡 Media | H-015, CR-11 |

Prioridad de implementación: **TC-1, TC-2, TC-5** primero (núcleo de cálculo + A27 + IDs), luego TC-3/TC-10, después el resto.

---

## 4. `/architecture` — revisión preventiva de Fase 2

Módulos objetivo y archivo real: **Clientes** → `Clientes.jsx` · **Pedidos** → `Ventas.jsx`
("Ventas y Pedidos") · **OPs** → `Produccion.jsx` (+ verificación en `Auditoria.jsx`) ·
**Productos** → catálogo `products` consumido por `ListaPrecios.jsx` / `Innovacion.jsx`.

### 4.1 Choques con el patrón aplicado en Fase 1
1. **Fechas (el más grave).** Fase 1 dejó el flujo de cotización anclado a `today()`. Pero
   `Ventas.saveOrder` usa `orderDate = nowISO().slice(0,10)` y `savePayment` igual. Como
   Inicio ancla su ventana de 6 meses y las alertas a `DEMO_TODAY` (abril 2026), **un pedido
   creado durante la demo cae fuera de ambos** y no se ve. Tocar la UI de Pedidos sin arreglar
   esto amplificaría la incoherencia. → **B1**.
2. **Modelo de relación.** El patrón de Fase 1 ya cruza por nombre en sitios (p. ej.
   `quotePdf` busca `customers.find(c => c.name === q.clientName)`), pero Clientes lo lleva al
   extremo: `orders.filter(o => o.customerId === c.id || o.clientName === c.name)`, con
   `customerId` **siempre null**. Cualquier feature de Fase 2 que permita **editar el nombre de
   un cliente** o **"crear pedido desde el cliente"** romperá el historial en silencio. → **B2**.

### 4.2 Duplicación que conviene unificar ANTES de tocar UI
- **`fmtCOP`/`fmtNum`** (TD-26): Clientes y ListaPrecios — ambos de Fase 2 — importan de
  `lib/accounting.js`, mientras Fase 1 usó `lib/format.js`. Unificar en una sola fuente evita
  que la moneda se formatee distinto entre módulos. → **B3**.
- **`subtotal`/`total`** (TD-27): Pedidos y Clientes calculan totales de pedido por su cuenta.
  Conviene extraer los cálculos comerciales a `lib/` antes de que un tercer módulo los copie. → **B4**.

### 4.3 ¿Hooks contables bien conectados o cableado fantasma?
**Conectados, no fantasma.** `Ventas.saveOrder` invoca `postSale(...)` (`Ventas.jsx:97`) y
`savePayment` invoca `postCustomerCollection(...)` (`Ventas.jsx:128`); los asientos llegan a
Libro Diario/Mayor. Salvedades arquitectónicas:
- **(a) No atómico** (TD-31): el pedido se persiste aunque el asiento falle; no hay rollback.
- **(b) Identidad débil**: a `postCustomerCollection` se le pasa `order?.customerId || order?.clientName`, es decir **un nombre como si fuera un id** — encaja con TD-29.
- **(c) Costo de venta ausente** (TD-21, ya catalogado): `postSale` no genera CMV → margen/inventario inflados.
- **OPs**: la máquina de estados del pedido (`pendiente_op → produccion → entregado`, más
  `opRejected/verified`) está **repartida** entre Ventas, Producción y Auditoría sin una única
  fuente de verdad. No bloquea cambios visuales, pero conviene mapearla antes de tocar OPs.

### 4.4 Decisiones de arquitectura a tomar (estilo ADR, sin ejecutar)
> Se mantienen dentro de este archivo único (según "Output esperado") en lugar de un
> `PRE_ANALISIS.md` separado.

- **ADR-PRE-1 — Anclaje único de fecha.** Adoptar `today()` como reloj de toda escritura de
  dominio en la demo (pedidos, pagos, leads). Alternativa descartada: dejar `nowISO()` y
  reanclar Inicio al mes real (rompería la coherencia del seed). Consecuencia: cambios de 1
  línea en `Ventas`/`Leads`; los datos nuevos vuelven a aparecer en Inicio.
- **ADR-PRE-2 — Identidad de cliente.** Al crear pedido/cotización, resolver y guardar
  `customerId` real (buscar cliente existente por doc/nombre o crearlo), dejando `clientName`
  como dato denormalizado de visualización. Alternativa descartada: seguir cruzando por nombre
  (frágil, no migra a Firebase). Consecuencia: habilita editar cliente sin perder historial y
  prepara el FK para el backend.

---

## BLOQUEANTES PARA FASE 2

> Lo que **sí o sí** conviene resolver antes de tocar la UI de Clientes/Pedidos/OPs/Productos.
> Ninguno es un fix grande; son de correctitud/consistencia y se hacen rápido.

| # | Bloqueante | Sev | Por qué bloquea | Esfuerzo |
|---|-----------|-----|-----------------|----------|
| **B1** | **Unificar anclaje de fecha a `today()`** en `Ventas.jsx:85` (`orderDate`), `Ventas.jsx:118` (fecha de pago) y `Leads.jsx:197` (`createdAt`). | 🟠 | Antes de tocar **Pedidos**: hoy un pedido creado en la demo no aparece en el gráfico de 6 meses ni en las alertas de Inicio (ambos anclados a DEMO_TODAY). Trabajar la UI sin esto haría "desaparecer" lo que se cree en la demo. | S (1 línea c/u) |
| **B2** | **Definir y aplicar `customerId` real** al crear pedido/cotización (ADR-PRE-2). | 🔴 | Antes de agregar edición de cliente o "nuevo pedido desde cliente" en **Clientes/Pedidos**: el join actual por `clientName` desvincula el historial en silencio al renombrar y colisiona con homónimos. | M |
| **B3** | **Unificar `fmtCOP`/`fmtNum`** en una sola fuente (`lib/format.js`) y re-exportar o eliminar la copia de `lib/accounting.js`. | 🟠 | **Clientes** y **ListaPrecios** (Fase 2) dependen hoy de la copia de `accounting`. Unificar evita formateo divergente de moneda entre módulos. | S |
| **B4** | **Extraer `subtotal`/`total`** (y helpers de cotización) a `lib/quoteCalc.js`. | 🟡 | Recomendado (no estricto): evita que Pedidos/Clientes copien una 4ª versión del cálculo. | S |

**No bloqueantes, pero vigilar** (no requieren acción pre-Fase 2):
- `nextId` retornando desde el updater (TD-30/CR-09): funciona hoy; **revisar obligatoriamente al integrar Firebase** o al activar render concurrente.
- Timeouts de `onBlur` sin cleanup (TD-32/CR-05) y `try/catch` en `downloadPDF` (CR-11): mejoras de robustez, abordables dentro del trabajo normal de Fase 2.
- Atomicidad `add+postSale` (TD-31): relevante junto con el trabajo de backend (TD-03/TD-06), no para cambios visuales.
