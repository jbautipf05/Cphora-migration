# CIERRE FASE 2.5 — Resumen ejecutivo

**Fecha de cierre:** 2026-05-26
**Rama de trabajo:** `claude/parity-fase-3`
**Estado:** ✅ cerrada, mergeada a `main` y pusheada a GitHub.

---

## 1. Contexto general

- Fase 2.5 se trabajó íntegramente en la rama `claude/parity-fase-3`.
- Al cierre se **mergeó a `main`** (fast-forward, sin commit de merge: el historial quedó lineal).
- `main` ya fue **pusheado a GitHub** (`origin/main` = `19eec61`).
- Fase 2.5 abordó los dos hallazgos extra que quedaron documentados pero sin implementar al cerrar
  la Fase 2: **EX-F2-04** y **EX-F2-03** (ver `docs/parity/FASE2/HALLAZGOS_EXTRA.md`).

---

## 2. Qué se cerró

### EX-F2-04 — Edición de cliente (UI inline)
- Edición **inline en el SlidePanel** del detalle de cliente (no modal flotante; Opción A).
- **Cascada de nombre** por `customerId` hacia `orders` y `quotes` (B2 completo) — NO a facturas
  (documentos históricos).
- **Validaciones**: nombre obligatorio, teléfono numérico, email válido; Institucional exige Razón Social.
- Campo **`channel`** agregado al modelo de clientes (+ migración idempotente).
- **Cancelar** descarta cambios sin guardar.

### EX-F2-03 — Crear venta desde cotización
- "→ Crear venta" (solo en cotizaciones **aceptadas**) abre el modal **Nueva venta (H-035) precargado
  encima del módulo Ventas** (no navega a otra pantalla).
- Precarga de cliente/lead + ítems/cantidades; precio recalculado desde la lista (decisión A).
- El pedido nuevo guarda **`quoteId`** para trazabilidad.
- **Caso Carmiña (COT-2002)**: cotización con `customerId` existente → precarga del customer.
- **Caso Laura Mendoza (COT-2001)**: cotización con `leadId` sin `customerId` → precarga del lead; al
  registrar crea el cliente y aplica el **paso-4 retroactivo** (fija `customerId` en la cotización origen).
- Caso sin lead ni customer → modal con solo el nombre, comportamiento default.

---

## 3. Qué validó Claude (proceso por hallazgo)

- **Inspección previa** del código antes de tocar nada (botón origen, flujo de Ventas, modelo de datos).
- **Implementación** acotada al scope, en commits granulares.
- **Auto-validación** funcional vía Preview MCP (localhost:5173), recorriendo los casos de cada EX.
- **Lint/build**: `eslint .` sin errores en los archivos tocados + `vite build` OK.
- **Preview sin errores de consola** durante todos los recorridos.
- **Commits realizados** uno por cambio (ver sección 5).

Detalle: `docs/parity/FASE3/VALIDACION_EX_F2_04.md` y `docs/parity/FASE3/VALIDACION_EX_F2_03.md`.

---

## 4. Qué validó humanamente el usuario

### EX-F2-04 (completo)
- Cascada de nombre: PED-1245 y COT-2002 reflejan el rename; COT-2001 queda histórica sin cambios.
- Buscador de Ventas resuelve por `customerId`.
- Validaciones bloquean nombre vacío, teléfono con letras, email inválido; Institucional sin Razón Social bloquea.
- Toggle Persona↔Institucional, campo `channel` editable/persistente, y Cancelar sin guardar.

### EX-F2-03 (completo)
- **COT-2002 (Carmiña Chapman)**: modal abre encima de Ventas sin navegación rara; cliente e ítems
  (Módulo Roma, Pouf Luna) precargados; venta registrada y pedido nuevo visible.
- **COT-2001 (Laura Mendoza)**: aceptar → crear venta; lead e ítems (Sofá Emma, Butaca Serenity,
  Silla Atlanta) precargados; venta registrada y pedido nuevo visible; paso-4 retroactivo aplicado.
- **Toolbar "+ Nueva venta"**: abre el modal **vacío**, sin arrastrar precarga anterior; total inicia en $0.

**Conclusión:** EX-F2-04 APROBADO y EX-F2-03 APROBADO humanamente.

---

## 5. Commits relevantes

### EX-F2-03
| Hash | Descripción |
|---|---|
| `ff77ae3` | feat: NuevaVentaModal acepta prop `prefill` |
| `dc9ce0e` | feat: botón "Crear venta" emite intent cotización→venta |
| `1f61db0` | feat: Ventas consume intent + `quoteId` + paso-4 retroactivo |
| `19eec61` | docs: VALIDACION_EX_F2_03 |

### EX-F2-04
| Hash | Descripción |
|---|---|
| `edfe063` | refactor(data): extender modelo customers con `channel` + migración |
| `9ade721` | feat(customer): cascada acotada de nombre a orders+quotes (B2) |
| `abed07c` | feat(customer-edit): UI inline de edición en el SlidePanel + validaciones |
| `fcb284e` | docs: VALIDACION_EX_F2_04 |
| `629f221` | docs: PROPUESTA_EDICION_CLIENTE (decisiones confirmadas) |

---

## 6. Estado final

- `main` actualizado hasta **`19eec61`** y sincronizado con `origin/main`.
- **Sin merge pendiente** (la rama `claude/parity-fase-3` quedó integrada por fast-forward).
- Los **archivos untracked** siguen **fuera de scope y no fueron tocados**:
  `castor-mvp/pnpm-workspace.yaml`, `castor-mvp/src/lib/castor_accounting.js`,
  `castor-mvp/src/lib/engine.js`, `castor-mvp/src/lib/engineShims.js`.
- **Fase 2.5 queda cerrada.**
- Listo para **definir el primer pendiente real de Fase 3**.
