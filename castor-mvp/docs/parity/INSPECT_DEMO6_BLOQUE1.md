# INSPECCIÓN Demo6 — Bloque 1 (Cotización)

Método: Demo6 servido por HTTP (`vite . :5174`), inspeccionado con Preview MCP
(`preview_eval` + `getComputedStyle`). Fecha de captura: createdAt del sistema
`2026-05-26`. Todos los valores son **observados en vivo**, no leídos de fuente.

## 1. Botón "+ Nueva cotización" (página Cotizaciones)
- Selector: `button.btn-gold` (texto `+ Nueva cotización`).
- Estilos computados: `background-image: linear-gradient(135deg, rgb(201,169,97), rgb(168,141,75))`; `color: rgb(10,22,40)`; `border-radius: 8px`; `padding: 8px 16px`; `font-weight: 600`; `font-size: 14px`; `border: 0px`; `box-shadow: none`.
- Posición: `x≈1065, y≈133, w=162, h=37` → esquina superior derecha, dentro de contenedor `flex flex-wrap gap-3 items-center justify-between`.
- Handler: `onclick="openQuoteForm()"` (sin lead).

## 2. Botón "+ Nueva cotización" (perfil de lead)
- En `openLeadDetail('L-101')`: `<button class="btn-gold flex-1" onclick="openQuoteForm('L-101')">+ Nueva cotización</button>`.
- Botón contiguo `Editar`: `class="btn-outline" onclick="openLeadForm('L-101')"`.
- ⇒ Abre el **mismo modal** con el lead preseleccionado (no navega a otra pantalla).

## 3. Modal "Nueva cotización" (estructura DOM)
- Título (`h2.gold-title`): **"Nueva cotización"**.
- Orden de labels (de arriba a abajo): `Buscar lead` · `Asesor *` · `Canal *` · `Cliente *` · `Ciudad` · [caja lead nuevo:] `Celular` · `Correo` · `Documento de identidad` · `Dirección` · `Items` · `Descuento % *` · `Vigencia (días) *` · `Notas`.
- Resumen al pie: Subtotal / Descuento / Total (`#qf-sub` / `#qf-disc-amt` / `#qf-total`).
- Submit: `Cancelar` (btn-outline) + **`Crear`** (btn-gold). El footer **no** muestra total.

## 4. Buscador de lead
- Input `#qf-lead-search`, placeholder por defecto **"Escribe nombre del lead…"** (cambia por campo).
- Toggles (`[data-searchfield]`): `Nombre`(name) · `Celular`(phone) · `Correo`(email) · `Documento`(doc). El activo: `bg-brand-gold text-brand-navy font-semibold`; inactivos `panel-2 text-brand-muted`.
- Filtrado en vivo (`filterLeadResults`, máx 10): buscar `"ant"` (campo name) → `["L-101 · Antonio González Bogotá"]`. Buscar `"zzz"` → **"Sin coincidencias"**.

## 5. Tarjeta de lead seleccionado (`applyLeadSelection('L-101')`)
- `#qf-lead-selected` deja de estar `hidden`.
- `#qf-sel-name` = `"L-101 · Antonio González"`.
- `#qf-sel-sub` = `"📱 300 555 1122 · ✉ antonio@inmob.co · 🪪 CC 80.221.554 · Bogotá"`.
- Rellena: Cliente=`Antonio González`, Ciudad=`Bogotá`, Canal=`Llamada`, Asesor=`Alexander Vivas`.
- Botón "Quitar" (`clearLeadSelection`).

## 6. Caja "lead nuevo" (`#qf-new-lead-box`)
- Existe; visible cuando **no** hay lead seleccionado; se oculta (`hidden`) al seleccionar uno.
- Campos: `Celular` · `Correo` · `Documento de identidad` (ph "CC / NIT / CE") · `Dirección`.
- Al guardar sin lead, `saveQuote` crea el lead automáticamente.

## 7. Selector de productos e ítems
- Tipo: **`<select>` (dropdown)**, no autocomplete.
- Formato del label de opción: **`"Butaca Serenity — $ 2.850.000"`** (ojo: `fmtCOP` con **espacio tras `$`**).
- Fila de ítem (grid 12): `select[item_product[]]` (col-4) · `input[item_desc[]]` ph "Descripción" (col-4) · `input[item_qty[]]` (col-1) · `input[item_price[]]` **readonly** `bg-brand-navy/40 cursor-not-allowed` (col-2) · botón `×`.
- Al elegir producto: precio se autollena (readonly) y, si Descripción vacía, copia el nombre.
- Arrastre de productos de interés (`applyLeadSelection('L-101')`, 2 PI): se cargan 2 filas → `Sofá Emma 3 puestos ×2 ($4.650.000)` y `Butaca Serenity ×4 ($2.850.000)`; Subtotal `$ 20.700.000`.

## 8. Descuento / Vigencia
- Descuento: input number. Mensajes (`validateDiscount`): `15`→**"✓ Pre-aprobado (vendedor)"**; `30`→**"⚠ Requiere aprobación gerencia"**; `60`→**"✗ No permitido (>50%)"**.
- Vigencia: `<select>` opciones **"20 días","30 días","45 días","60 días","90 días"**, default 30. Mensaje (`validateVigencia`): `20`→**"⚠ Vigencia 20 días: requiere aprobación de gerencia"**; otros→"".

## 9. Botón "Crear" (submit del modal)
- `button.btn-gold` texto `Crear`, mismo estilo gold gradient; al pie del modal junto a `Cancelar`.

## 10. Lógica de guardado (`saveQuote`) — observado creando COT-2001
Escenario: lead L-101, 2 ítems, descuento 30, vigencia 30. createdAt `2026-05-26`.
- Crea 1 cotización, contador `cot 2000 → 2001`, id `COT-2001`.
- `requiresApproval=true`, `approvalReason="Descuento 30%"`, `estado="pendiente_aprob"` (porque descuento>20).
- `vigencia="2026-06-25"` (createdAt + 30 días), `vigenciaDias=30`.
- **7 seguimientos** con offsets **[3,7,14,21,35,45,60]** → fechas `2026-05-29, 06-02, 06-09, 06-16, 06-30, 07-10, 07-25`. Forma: `{id, n, fechaProxima, estado, notas, completadoAt}`.
- **Notificación** `type:"warning"`: "Cotización COT-2001 requiere aprobación de gerencia (Descuento 30%)".
- **Abre el detalle**: slide-panel de la cotización (`detailOpen=true`, `currentPage=cotizaciones`).
- Persistencia: `state.quotes.unshift(q)` + `save()` a localStorage.
