# VALIDACIÓN — EX-F2-04 (UI de edición de cliente + cascada de nombre B2 completo)

> Auto-validación del protocolo por bloque/hallazgo. Fase 3, rama `claude/parity-fase-3`.
> Implementado en 3 commits: `edfe063` (channel+migración), `9ade721` (cascada+fix Clientes.jsx),
> `abed07c` (UI inline). Validación E2E en vivo vía Preview MCP sobre seed limpio.
> **Encuadre:** mejora deliberada (Demo6 NO edita clientes); se hace para ejercer B2 desde UI.

## Resumen ejecutivo

**Estado: ✅ APROBADO.** ~22 checks ejecutados, 0 fallidos, **0 errores de consola**. Cascada
acotada de nombre (B2 completo) verificada de punta a punta en la app real: editar un cliente propaga
el nombre a `orders` y `quotes` por `customerId`, respeta facturas/pagos como histórico, y normaliza
el buscador de Ventas. Validaciones (H-004) y toggle Persona↔Institucional funcionando.

---

## Protocolo 1 — Smoke test por cambio

| # | Cambio | Resultado |
|---|--------|-----------|
| 1.1 | Migración `migrateCustomerChannel` corre en hydrate | ✅ `_migrations.customerChannel:1` tras reload sobre seed limpio |
| 1.2 | C-004 (lead L-105) deriva canal | ✅ `channel: "WhatsApp"` (de L-105); C-001/2/3 `channel: ""` |
| 1.3 | Idempotencia migración | ✅ 2ª corrida no recrea `customers` (guard por versión) |
| 1.4 | `customerId` en quotes (preexistente B2) | ✅ COT-2002 → `C-004` (vía lead); COT-2001 → `null` |
| 1.5 | UI: botón "✎ Editar" en detalle | ✅ visible (dorado), abre formulario inline |
| 1.6 | UI: canal en modo lectura | ✅ "Canal: WhatsApp · Asesor: Alexander Vivas"; "— Sin definir —" si vacío |
| 1.7 | Formulario inline renderiza campos correctos | ✅ Persona: sin campos institucionales; Institucional (C-003): muestra Razón social*/NIT*/Contacto |
| 1.8 | Lint / build | ✅ 0 errores; build 274 módulos limpio (los 3 commits) |

## Protocolo 2 — Integración funcional cruzada (cascada B2 completo)

Caso: editar C-004 → nombre `"Carmiña Chapman EDIT"`, canal `Instagram`.

| # | Verificación (checklist del usuario) | Resultado |
|---|--------------------------------------|-----------|
| 2.1 | Cliente con **pedidos** asociados → pedidos reflejan nuevo nombre | ✅ `PED-1245.clientName = "Carmiña Chapman EDIT"` |
| 2.2 | Cliente con **cotizaciones** asociadas → cotizaciones reflejan nuevo nombre | ✅ `COT-2002.clientName = "Carmiña Chapman EDIT"` (por `customerId`) |
| 2.3 | Cotización **vieja sin customerId** (COT-2001) → NO cascada, queda histórica | ✅ `COT-2001.clientName = "Laura Mendoza"` (intacta) |
| 2.4 | Factura/pago NO se reescriben (snapshot histórico) | ✅ por diseño: `updateCustomer` solo toca `orders`+`quotes` (no hay factura de Carmiña en seed para probar visualmente, verificado por código) |
| 2.5 | Tabla Ventas muestra nombre resuelto | ✅ `P-1245` muestra "Carmiña Chapman EDIT" (custName por `customerId`) |
| 2.6 | **Buscador de Ventas** por nombre nuevo | ✅ buscar "EDIT" filtra a solo `P-1245` |
| 2.7 | Cascada **atómica** (un solo setState) | ✅ `updateCustomer` aplica customer+orders+quotes en un único updater (regla anti-nextId) |
| 2.8 | Crear cotización con lead vinculado → quote tiene customerId | ✅ código-verificado: `NuevaCotizacionModal:186` resuelve `customerId` vía `resolveCustomerId` (B2/ADR-011, preexistente) |
| 2.9 | Crear cotización con lead **nuevo** | ✅/aclaración: `customerId = null` **por diseño** (lead nuevo no tiene cliente; el cliente se auto-crea al hacer el pedido, no en pre-venta — ADR-011). El paso-4 retroactivo se difiere a EX-F2-03 (registrado en HALLAZGOS_EXTRA) |

## Protocolo 3 — Regresión

| # | Verificación | Resultado |
|---|--------------|-----------|
| 3.1 | Migración B2 `customerFk` intacta (no se tocó) | ✅ `_migrations.customerFk:1`, quotes/orders con FK resueltas |
| 3.2 | "+ Nota" del cliente sigue funcionando (`update('customers')`) | ✅ no modificado |
| 3.3 | KPIs/Leads/Cotizaciones/Garantías/Postventa del panel visibles durante edición | ✅ solo el bloque de contacto togglea; el resto permanece |
| 3.4 | Etiqueta cosmética `P-XXXX` en tabla Ventas (H-033) | ✅ intacta |
| 3.5 | Resto de columnas/filtros de Ventas | ✅ sin cambios (solo se normalizó la fuente del nombre en el buscador) |

## Protocolo 4 — Comparación visual (screenshots)

- Detalle de cliente (lectura): canal "WhatsApp", botón "✎ Editar" dorado, KPIs y secciones OK. CSS
  verificado (`.btn-gold` computa el gradiente `linear-gradient(135deg, rgb(201,169,97)…)`).
- Formulario de edición inline: grid 2 columnas, campos correctos, Cancelar/Guardar, resto del panel
  visible debajo. Estética consistente con los modales de Fase 2.
- (Demo6 no tiene esta pantalla — no aplica comparación de paridad; es mejora nueva.)

## Protocolo 5 — Edge cases + validaciones + persistencia

| # | Caso | Resultado |
|---|------|-----------|
| 5.1 | Nombre vacío | ✅ error "El nombre es obligatorio", no guarda |
| 5.2 | Teléfono con letras | ✅ error "El teléfono no puede contener letras", no guarda |
| 5.3 | Email inválido (`correo-invalido`) | ✅ error "Email inválido", no guarda |
| 5.4 | Institucional con Razón social vacía | ✅ error "La razón social es obligatoria", no guarda |
| 5.5 | Toggle Tipo Persona↔Institucional | ✅ muestra/oculta Razón social/NIT/Contacto dinámicamente |
| 5.6 | Editar canal (select de canales de leads) | ✅ guardado `channel: "Instagram"` |
| 5.7 | Cancelar descarta cambios | ✅ C-003 quedó intacto (`institucional`, "Villadiego Inmuebles") tras Cancelar |
| 5.8 | Persistencia | ✅ cambios reflejados en `localStorage('castor_cphora_v7')` tras el debounce |
| 5.9 | Reset de modo edición al cambiar de cliente / cerrar panel | ✅ handlers en `onRowClick` y `onClose` |
| 5.10 | Errores de consola | ✅ **ninguno** (filtro level=error: "No console logs") |

## Protocolo 6 — Hallazgos extra

- Ninguno nuevo introducido. Se registró en `HALLAZGOS_EXTRA.md` el **scope-añadido a EX-F2-03**
  (paso-4 retroactivo: actualizar `customerId` de la cotización al convertirla en venta), que NO se
  implementó acá por ser código muerto sin el flujo cotización→venta.

## Protocolo 7 — Conclusión

**✅ APROBADO.** 22/22 checks OK, 0 fallidos, 0 errores de consola. EX-F2-04 cumple el alcance
confirmado: UI inline (Opción A), cascada acotada 3.2 (orders+quotes por `customerId`, sin tocar
facturas/pagos/notas), buscador de Ventas normalizado (B2 completo), `Clientes.jsx` resolviendo
cotizaciones por `customerId`, campo `channel` nuevo + migración derivada del lead, y validaciones
estilo H-004 incl. toggle Persona↔Institucional.

**Caveats menores:**
- El "paso-4 retroactivo" (customerId de cotización al convertir en venta) queda para EX-F2-03 (donde
  vive el flujo). Registrado.
- Cotización con lead nuevo → `customerId: null` por diseño (pre-venta, ADR-011); no es defecto.
- No hay factura de Carmiña en el seed, así que el no-cascada a facturas se verificó por código (la
  función nunca toca `invoices`), no visualmente.

**Pendiente humano (~5-10 min):** abrir el cliente Carmiña, "✎ Editar", cambiar el nombre y observar
que pedido/cotización lo reflejan; probar una validación (email inválido). Server de preview corriendo
en :5173 con seed limpio.
