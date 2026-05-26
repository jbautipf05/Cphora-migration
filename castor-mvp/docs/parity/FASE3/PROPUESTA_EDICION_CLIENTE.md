# PROPUESTA — UI de edición de cliente (EX-F2-04)

> **Estado:** ✅ **DECISIONES CONFIRMADAS por el usuario (2026-05-26).** Lista para codear EX-F2-04
> tras OK final. Origen: EX-F2-04 (descubierto en validación exhaustiva pre-merge de Fase 2).
> **NO se codea EX-F2-03 todavía** (va después; es más simple).

## Resumen de decisiones confirmadas

| Tema | Decisión |
|---|---|
| Encuadre | ✅ Mejora **nueva** (no paridad con Demo6). Se implementa para ejercer B2 desde UI + el cliente espera editar datos básicos. |
| UI | ✅ **Opción A** — edición *inline* en el SlidePanel del detalle. |
| Cascada de nombre | ✅ **Opción 3.2 acotada** — propagar a `customers`+`orders`+`quotes`; NO a facturas/pagos/notas; normalizar buscador de Ventas a `customerId`. |
| Campos editables | ✅ name, doc, phone, email, city, address, **channel** (nuevo), asesor, **tipo**; institucional: razonSocial, nit, contacto. |
| Validaciones | ✅ estilo H-004 + teléfono solo dígitos + email válido + nombre no vacío + (si institucional) razonSocial y NIT obligatorios. |

---

## 0. Encuadre — esto NO es paridad, es una mejora deliberada ✅ CONFIRMADO

**Demo6 tampoco tiene edición de cliente.** `openCustomerProfile` (`Demo6:4329`) solo expone el
detalle + `addCustomerNote` (`Demo6:4415`); no existe `editCustomer`/`saveCustomer`. React está
**a la par** con Demo6 hoy: ambos solo permiten "+ Nota".

Por la regla de misión, una mejora no-divergente "se anota, no se aplica". **El usuario decidió la
excepción explícitamente:** EX-F2-04 sube a P0 de Fase 3 porque (a) sin UI de edición **no hay forma
de ejercer el fix B2** (resolución de nombre por `customerId`) desde la interfaz — B2 solo se pudo
validar mutando estado a mano — y (b) el cliente igual espera poder editar datos básicos del
cliente. Es una **extensión de alcance consciente**, justificada por testabilidad/utilidad, no por
paridad con Demo6.

Implicación: como no hay referencia en Demo6, **el diseño es nuestro** (estética dorada del sistema,
sí; flujo/campos, a criterio confirmado arriba).

---

## 1. Modelo de datos — campos editables ✅ CONFIRMADO

`CUSTOMERS` (`src/data/erpSeed.js:67`). Decisión final:

| Campo          | Persona | Institucional | Editable | Nota |
|----------------|:-------:|:-------------:|:--------:|------|
| `id`           | C-001   | C-003         | **No**   | FK canónica B2 |
| `name`         | ✓       | ✓             | **Sí**   | Caso crítico de B2 → cascada (ver §3) |
| `tipo`         | lead    | institucional | **Sí**   | Cambia qué campos institucionales aplican (mostrar/ocultar) |
| `razonSocial`  | —       | ✓             | **Sí**   | Solo institucional; obligatorio si tipo=institucional |
| `nit`          | —       | ✓             | **Sí**   | Solo institucional; obligatorio si tipo=institucional |
| `contacto`     | —       | ✓             | **Sí**   | Solo institucional |
| `phone`        | ✓       | ✓             | **Sí**   | Validar solo dígitos |
| `email`        | ✓       | ✓             | **Sí**   | Validar formato |
| `doc`          | ✓       | ✓             | **Sí**   | ⚠ es llave de `resolveCustomerId` (ver §3) |
| `city`         | ✓       | ✓             | **Sí**   | |
| `address`      | ✓       | ✓             | **Sí**   | |
| `channel`      | —       | —             | **Sí**   | ⚠ **NO existe hoy en el modelo de cliente** — solo en `LEADS`. Hay que **introducir el campo** (ver nota ↓) |
| `asesor`       | ✓       | ✓             | **Sí**   | Select de empleados |
| `createdAt`    | ✓       | ✓             | **No**   | Fecha de alta |
| `linkedLeadId` | a veces | a veces       | **No**   | Relación interna |
| Histórico / métricas | calculado | calculado | **No** | Derivados (KPIs del panel) |
| `notes`        | array   | array         | **No** desde edición | Ya tiene "+ Nota" |

**Nota sobre `channel` (Canal — "cómo llegó"):** los clientes (`CUSTOMERS`) NO almacenan `channel`
hoy; solo los `LEADS` lo tienen. Hacerlo editable implica **agregar el campo** a clientes. Para los
clientes existentes quedaría vacío (o se podría derivar del lead vinculado vía `linkedLeadId` en una
migración suave). Lo señalo porque añade un campo nuevo al modelo, no solo edita uno existente.

**Infra ya disponible:** el panel ya muta clientes con `update('customers', sel.id, (c) => ({...}))`
para notas (`Clientes.jsx:489`). El mismo helper guarda los campos editados en un solo `update`.
El sub-formulario "crear cliente exprés" de `NuevaVentaModal.jsx` (H-035.1) es portable como base de
los inputs.

---

## 2. UI — Opción A: edición inline en el SlidePanel ✅ CONFIRMADO

Botón **✎ Editar** en el encabezado del SlidePanel del detalle (junto a ✕). Al activarlo, el bloque
de contacto (`Clientes.jsx:283-290`) y los datos editables pasan de texto a inputs; aparecen
**Guardar / Cancelar**. El resto del panel (KPIs, Leads, Cotizaciones, Garantías, Notas) sigue
visible. Estado local: `editing` + `draft` del cliente.

**Razones (confirmadas):** reutiliza el componente existente (menos código nuevo); mantiene contexto
(no abre modal sobre el panel); patrón familiar por el sistema de notas; mínima superficie de cambio.

(Opciones B modal dedicado y C panel-modo se descartaron — ver historial git de este archivo si se
necesita reconsiderar.)

---

## 3. Cascada de `name` — Opción 3.2 acotada ✅ CONFIRMADO

`clientName` está denormalizado en varias tablas y la resolución por `customerId` (B2) NO es
universal. Decisión confirmada:

**Al guardar un cambio de nombre, propagar el nombre nuevo a:**
- ✅ `customers[id].name` (la fuente)
- ✅ `orders[].clientName` donde `customerId === id` (tienen FK directa — propagación simple)
- ✅ `quotes[].clientName` del mismo cliente ⚠ (ver nota de resolución ↓)

**NO propagar a (snapshots históricos, se conservan tal cual):**
- ❌ `invoices` (facturas: documento contable emitido)
- ❌ `payments` (pagos históricos)
- ❌ `notes` viejas (registro del momento)

**Además:** ✅ normalizar el **buscador de la tabla Ventas** para que filtre por el nombre resuelto
(`custName(o)`, `Ventas.jsx:60`) en vez del `o.clientName` almacenado (`Ventas.jsx:72`), para que
buscar por el nombre nuevo funcione.

**⚠ Nota de resolución para `quotes`:** las cotizaciones **no tienen `customerId` directo** (enlazan
por `leadId` + `clientName`). Para propagar el nombre a `quotes` del cliente hay que resolver la
relación: cotizaciones cuyo `leadId` corresponda a un lead con `linkedCustomerId === id`, o cuyo
`customerId` (si existe en datos nuevos) === id, o —último recurso— match por nombre viejo exacto.
Es más difuso que `orders`. Recomiendo resolver por `leadId`→customer y por `customerId` si está
presente; el match por nombre solo como fallback.

**⚠ Sobre editar `doc`/`nit`:** son llaves de `resolveCustomerId`. Cambiarlos no rompe FKs ya
resueltas, pero altera futuras resoluciones por documento. Bajo riesgo; se permite editarlos.

---

## 4. Alcance del hallazgo EX-F2-04 (a codear tras OK final)

1. UI Opción A (inline en SlidePanel) con botón ✎ Editar → modo edición con Guardar/Cancelar.
2. Campos editables del §1 (incluye **agregar `channel` al modelo de cliente** + mostrar/ocultar
   bloque institucional según `tipo`).
3. Guardado: `update('customers', id, draft)` + cascada §3 (orders + quotes) + normalización del
   buscador de Ventas + `toast('Cliente actualizado','ok')`.
4. **Validaciones (estilo H-004):** nombre no vacío; teléfono solo dígitos; email formato válido;
   si `tipo === 'institucional'` → razonSocial y NIT obligatorios.
5. **Fuera de alcance:** borrar cliente, fusionar duplicados, propagar nombre a facturas/pagos.
6. **Validación E2E:** editar nombre de C-004 (Carmiña) → confirmar que PED-1245 muestra el nombre
   nuevo en tabla Ventas **y** en el buscador, que `customerId` no cambió, que la cotización
   COT-2002 (vía leadId L-105) refleja el nombre nuevo, y que la **factura histórica conserva** el
   nombre original. Probar también cambio de `tipo` Persona↔Institucional (aparecen/desaparecen
   campos institucionales) y validaciones (email inválido, teléfono con letras, razonSocial vacío en
   institucional).

---

## 5. Checklist de decisiones — TODAS RESUELTAS ✅

- [x] Enfoque UI: **A inline**
- [x] Cascada: **3.2 acotada** (customers + orders + quotes; NO facturas/pagos/notas)
- [x] Normalizar buscador de Ventas a nombre resuelto: **SÍ**
- [x] Editar `doc`/`nit`: **SÍ** (con nota §3)
- [x] Editar `tipo` Persona↔Institucional: **SÍ**
- [x] `name` en facturas emitidas como histórico (sin cascada): **SÍ**
- [x] Campo `channel` editable: **SÍ** (requiere introducir el campo en el modelo de cliente)

---

## Apéndice — referencias de código

- Detalle/SlidePanel cliente: `src/views/Clientes.jsx:248-524` (contacto `:283-290`, "+ Nota" `:486-501`).
- Reducer de mutación: `update('customers', id, fn)` ya usado en `:489`.
- Bloque "crear cliente exprés" reutilizable: `src/components/NuevaVentaModal.jsx` (H-035.1).
- Resolución B2: `src/lib/migrations.js` (`resolveCustomerId`), `Ventas.jsx:60` (`custName`), buscador `Ventas.jsx:72`.
- Modelo: `CUSTOMERS` `src/data/erpSeed.js:67` (sin `channel`), `LEADS` `:80` (con `channel`), `QUOTES` `:88` (sin `customerId` directo), `ORDERS` `:93` (con `customerId`).
- Demo6 (sin edición, solo referencia de detalle): `openCustomerProfile` `Demo6:4329`, `addCustomerNote` `Demo6:4415`.
