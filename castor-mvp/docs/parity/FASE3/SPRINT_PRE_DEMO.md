# SPRINT PRE-DEMO — Resumen ejecutivo (Fase 3 visual)

> Documento de cabecera para leer la **noche antes de la demo**. Rama
> `claude/parity-fase-3-visual` (tip `95c25bc`). Pendiente de merge a `main` al aprobar.

---

## 1. Qué quedó hecho (resumen)

Sprint pre-demo enfocado en lo que el cliente toca/ve. **8 hallazgos cerrados** (H-100 a
H-107). Mitad eran mejoras reales; la otra mitad ya estaba implementada de Fases 2/2.5 y se
documentó como tal (ver §3). Todo validado por build + tests node + revisión + fidelidad a
Demo6. **No** se modificó la maquinaria estable (`PROD_ESTADOS`, filtro de Producción,
`Ventas.submitSale`).

## 2. Hallazgos cerrados (con hashes)

| # | Título | Tipo | Commit |
|---|--------|------|--------|
| **H-100** | Producción ya no "borra" la OP al actualizar su estado | 🟢 Fix crítico | `2dbf2b8` |
| **H-101** | Almacén: +Insumo/+Proveedor, sin +Producto | ✅ Ya existía (doc) | `ac1a32e` |
| **H-102** | Bodegas MP/PT separadas + relabel "Almacén #1/#2" | 🟡 Residual real | `3e79974` |
| **H-103** | Bodegas + inventario PT en Inventario Terminado | ✅ Ya existía (doc) | `beb8cf6` |
| **H-104a** | Innovación: modal Nuevo Producto con BOM + costo | 🟡 Núcleo ya existía + 2 deltas | `826fbcf` |
| **H-104b** | Quitar +Nuevo producto de Lista de Precios | 🟢 Decisión | `dff0536` (+ renumber `e2c5fcc`) |
| **H-105** | Producción: selector de área por `product.areas` | 🟢 Gap genuino | `ca3039f` |
| **H-106** | Auditoría: modales detalle (Producto Nuevo, Cierre OP) | 🟢 Gap genuino | `83093fc` |
| **H-107** | Despacho funcional (flujo A) + guard | 🟢 Gap genuino | `95c25bc` |

Detalle por hallazgo en `docs/parity/FASE3/H-XXX.md`.

## 3. FUNCIONALIDADES YA IMPLEMENTADAS PREVIO AL SPRINT

> Para defender en demo: *"sí, eso ya está hace semanas, viene de Fase 2/2.5"*. Refleja el
> progreso acumulado del proyecto, no solo este sprint.

- **H-101 (completo):** Almacén ya tenía **+Insumo** y **+Proveedor** con modales completos
  (validación, campos, toast). Nunca tuvo "+Producto". Cero código este sprint.
- **H-103 (completo):** las tarjetas de **bodegas PT** y la **tabla de inventario por producto**
  ya vivían en **Inventario Terminado**; Almacén ya era solo materia prima. Cero código.
- **H-104a (núcleo):** el **modal Nuevo Producto con BOM, áreas multi-select, costo automático
  y margen** ya existía en Innovación. El modelo (`products.bom`, `products.areas`,
  `supplies.cost`) ya estaba. Este sprint solo agregó 2 detalles de paridad (subtotal por fila
  + auto-relleno en vivo del costo).
- **H-102 (base):** las dos bodegas MP (`W-ALM1/2`) y el campo `tipo` (`insumos`/`terminado`)
  con selectores filtrados **ya existían**; este sprint solo relabeló a "Almacén #1/#2" y tapó
  una fuga de selector en Innovación.
- **H-106 (parte):** el **modal de detalle de Pedido** en Auditoría ya existía; este sprint
  agregó los 2 que faltaban (Producto Nuevo, Cierre de OP).

## 4. Decisiones críticas tomadas SIN input del cliente

1. **H-102 — no renombrar el campo técnico `tipo`** (`insumos`/`terminado`), solo el rótulo
   visible → "Almacén #1/#2". Evita un refactor transversal con riesgo de migración sin
   beneficio para el cliente. La separación MP/PT ya era real y total.
2. **H-104b — conservar el componente del modal simple** (H-041) en Lista de Precios; solo se
   quitó su botón. Por si el cliente vuelve a pedir alta ahí.
3. **H-105 — columnas no relevantes ocultan la card (no grey-out)**, vía restricción del
   selector de área. Y **se conserva el área actual** aunque no esté en `product.areas` (no
   perder OPs — lección H-100). Fallback a todas las áreas si el producto no tiene ninguna.
4. **H-106 — el modal de Cierre de OP es informativo (solo lectura)**; las acciones de cierre
   real se difieren (EX-F3-02). Trigger doble-clic + Ver (patrón de la app).
5. **H-107 — guard "solo despachar OPs en Listo/op_cerrada"** (mejora consciente sobre Demo6,
   que no lo previene por ser prototipo). Sin despacho parcial. Flujo B (recepción CEDI)
   diferido (EX-F3-03).

## 5. Qué quedó pendiente (diferido, con plan)

Registrado en `docs/parity/FASE2/HALLAZGOS_EXTRA.md`:
- **EX-F3-01** (baja): editor de BOM en el modal de **edición** de producto (el de alta ya lo
  tiene).
- **EX-F3-02** (media): acciones de **cierre de OP** en Auditoría (cerrar / crear producto CEDI
  / aprobar). Prerrequisito de EX-F3-03.
- **EX-F3-03** (media): **recepción CEDI / "stock listo a CEDI automático"** (flujo B de
  Despacho). Depende de EX-F3-02. Plan de 3 piezas documentado.
- Previos: EX-F2-06 (baja), EX-F2-08 (media, `order.acabados`), EX-F2-09 (baja).

## 6. Riesgos / limitaciones (transparencia)

- **⚠️ Sin validación visual en vivo:** el **Preview MCP estuvo inoperante todo el sprint**
  (ancla a un worktree huérfano dañado). Todo se validó con **lint por-archivo + build + tests
  node + revisión de código + fidelidad a Demo6**. **Recomendación fuerte:** hacer un
  **smoke-test manual** de los 7 módulos tocados antes de la demo (ver §7).
- **Deuda de lint preexistente** en varios archivos de `src` (imports/vars sin usar) — no
  introducida por el sprint, no tocada. `eslint .` global además falla por el worktree huérfano
  `.claude/worktrees/hardcore-pike-3fb8dd` (entorno, no código). Validé por-archivo.
- **`vite.config.js`** tiene un cambio tuyo sin commitear (allowedHosts ngrok) — intacto, no lo
  toqué.

## 7. Script de demo (paso a paso)

> Antes de empezar: si el estado se ve raro, resetear datos con
> `localStorage.removeItem('castor_cphora_v7')` + reload (NUNCA el botón "Reset Data Demo" →
> su `confirm()` cuelga).

**A) Producción — el bug crítico resuelto (H-100) + áreas por producto (H-105)**
1. Ir a **Producción**. Mostrar el tablero por áreas con las OPs.
2. Abrir una OP (doble clic / tarjeta) → en "Cambiar área", mostrar que el desplegable **solo
   ofrece las áreas del producto** (H-105), no las 9 siempre.
3. Mover **PED-1245 (Carmiña Chapman)** a **"Listo"**. **Antes se borraba el pedido; ahora
   permanece** en el tablero y su estado pasa a `listo` (H-100). *Este es el fix que reportó el
   cliente.*

**B) Despacho — flujo funcional (H-107)**
4. Ir a **Despacho**. La solicitud **DSP-01 (PED-1245)** ahora muestra el botón **🚚 Despachar**
   (antes del paso 3 mostraba "⏳ Esperando cierre de OPs en producción" — el guard).
5. Pulsar **🚚 Despachar** → la OP queda **despachada** (sale de Producción), su stock reservado
   pasa a despachado, y la solicitud cae al **histórico**.

**C) Innovación — Nuevo Producto con BOM (H-104a)**
6. Ir a **Innovación → + Nuevo producto**. Llenar nombre/categoría/precio.
7. Marcar **áreas de producción** (checkboxes). En **BOM**, agregar insumos: mostrar el
   **subtotal por fila** y el **"Costo final" auto-rellenándose en vivo** con el total + el
   **margen**. Guardar → el producto entra a **⏳ Auditoría**.

**D) Auditoría — ventanas de detalle (H-106)**
8. Ir a **Auditoría**. Doble clic (o **👁 Ver**) en el producto nuevo del paso 7 → **modal de
   detalle** (ficha + áreas + receta BOM con subtotales) → Aprobar.
9. Doble clic en una fila de **"Cierre de OPs"** → **modal de detalle del cierre** (costos
   máster, consumos). (El modal de detalle de **Pedido** ya existía: mostrarlo también.)

**E) Almacén / Inventario / Lista de Precios (H-101, H-102, H-103, H-104b)**
10. **Almacén (Materia prima):** botones **+Insumo** y **+Proveedor** (no +Producto); bodegas
    **"Almacén #1/#2"**; el selector de bodega del insumo solo lista MP.
11. **Inventario Terminado:** tarjetas de **bodegas PT** (CEDI, Castor 43, Castor Ctg, Volcanes)
    + tabla de inventario por producto.
12. **Lista de Precios:** ya **no** está el botón "+ Nuevo producto" (el alta vive en
    Innovación). Sigue con filtros + edición + export PDF.

## 8. Defensa de decisiones (preguntas probables del cliente)

- **"¿Por qué las bodegas dicen 'Almacén #1/#2' y no 'Insumos'?"** → Se ajustó al vocabulario
  que vos usás; internamente la separación materia prima vs producto terminado es total
  (cada selector solo muestra las bodegas que corresponden).
- **"¿Por qué no puedo despachar esta OP?"** → Porque todavía está en producción. El sistema
  solo deja despachar cuando la OP llegó a "Listo" (o está cerrada), para evitar despachos
  prematuros. *(Si necesitás despachar antes en algún caso, se agrega una excepción.)*
- **"El alta de producto, ¿dónde está?"** → En **Innovación**, con la receta de materiales (BOM)
  y cálculo de costo. Lista de Precios quedó como catálogo. *(Se decidió juntar el alta en un
  solo lugar; el formulario viejo sigue en el código por si lo querés reactivar.)*
- **"¿El pedido se sigue borrando en Producción?"** → No. Era un bug de filtro (el pedido nunca
  se borraba de la base, solo desaparecía de la vista al cambiar de estado). Corregido: ahora
  la OP permanece en el tablero durante todo su ciclo (producción → listo → cerrada).
- **"¿Y la recepción en CEDI / stock automático?"** → Es un flujo aparte (producción→CEDI) que
  dejamos planificado para el siguiente sprint (EX-F3-03); requiere primero el cierre de OP en
  Auditoría (EX-F3-02). El despacho a cliente ya funciona completo.

## 9. Recomendación

**El sprint cubre todo lo demo-crítico (H-100..H-107) y está sólido a nivel de lógica**
(build + tests + revisión). **La única acción pendiente antes de la demo es un smoke-test
manual** de los 7 módulos del §7, porque **no pude validar visualmente** (Preview MCP roto):
quiero que un par de ojos confirme el render real antes de presentar.

- Si el smoke-test pasa → **listo para demo** y para **merge a `main`**.
- Flujo B de Despacho (recepción CEDI) y editor de BOM en edición quedan como mejoras
  post-demo, sin bloquear.

**Sugerencia de cierre:** tras tu OK + smoke-test, mergear `claude/parity-fase-3-visual` a
`main` y añadir la entrada de cierre de Fase 3 al CHANGELOG (hoy está como "En progreso").
