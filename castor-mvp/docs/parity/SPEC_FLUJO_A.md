# SPEC — Flujo A · Lead → Cotización → Pedido → Pago

> Fuente de verdad: `Castor_Dashboard_Demo6.html` (líneas citadas).
> Espejo React: `castor-mvp/src/views/{Leads,Cotizaciones,Ventas}.jsx`.
> Nota: los videos del cliente se grabaron contra un demo anterior (mencionan
> "Sofá Gante / Mesa Consola" que **no existen** en Demo6). Donde el video y el
> HTML difieran, **manda el HTML** (regla 5). El video sirve para saber *qué
> flujo evalúa* el cliente, no los datos exactos.

---

## PASO 1 — Spec de referencia del HTML

### Pantallas / artefactos involucrados

| # | Artefacto | Ubicación HTML | Disparador |
|---|-----------|----------------|------------|
| 1 | Slide-panel detalle de lead (`openLeadDetail`) | 3904–4001 | clic en fila de Leads |
| 2 | Modal "Editar L-XXX" (`openLeadForm`) | (form lead) | botón **Editar** (3948) |
| 3 | Sección Seguimientos del lead | 3959–3985 | dentro del slide-panel |
| 4 | Vista Cotizaciones + botón "+ Nueva cotización" | 4470 | sidebar → Cotizaciones |
| 5 | Modal "Nueva cotización" (`openQuoteForm`) | 4521–4590 | botón btn-gold (4470 / 3947) |
| 6 | Buscar lead + autocompletado (`filterLeadResults`/`applyLeadSelection`) | 4527–4656 | dentro del modal |
| 7 | Filas de ítems (`addQuoteItemRow`/`onQuoteProductChange`/`recalcQuote`) | 4658–4689 | "+ Agregar item" (4568) |
| 8 | Validaciones descuento/vigencia | 4690–4702 | oninput / onchange |
| 9 | `saveQuote` (aprobación, 7 seguimientos, lead nuevo) | 4703–4755 | submit "Crear" |
| 10 | Slide-panel detalle de cotización (`openQuoteDetail`) | ~4806–4932 | clic en fila Cotizaciones |
| 11 | Botón "→ Crear venta" (`convertQuoteToOrder`) | 4927 / 4987–4990 | sólo si `estado==='aceptada' && !hasOrder` |
| 12 | Vista Ventas + botón "+ Nueva venta" | 5276 | sidebar → Ventas y Pedidos |
| 13 | Modal "Nueva venta" / "Nueva venta (desde COT-XXXX)" (`openSaleForm`) | 5530–5687 | btn-gold (5276) o desde cotización |
| 14 | Buscar cliente (`filterCustResults`/`setSaleCustField`) | 5553–5564 | dentro del modal venta |
| 15 | Filas de ítems venta stock/producción (`addSaleItemRow`) | 5711–5760 | "+ Agregar item" (5608) |
| 16 | Bloque "💰 Registro de pago" | 5647–5664 | dentro del modal venta |
| 17 | `saveSale` | (post 5839) | submit "Registrar venta" |

### Interacciones paso a paso (ABC)

**Etapa 1 · Ver y editar lead**
- A. Clic en fila de la tabla Leads → abre slide-panel desde la derecha.
- B. Panel muestra: chip id+tipo, nombre, teléfono, email, doc/ciudad (o NIT/contacto si institucional), canal, clasificación (chip), **estado** (select editable), asesor, **valor estimado** (oro). Productos de interés (si hay), banner recontactar (si aplica).
- C. Fila de botones (3946): **`+ Nueva cotización`** (btn-gold, ancho flex-1) · **`Editar`** (btn-outline) · **`🔔 Contactar nuevamente`** (btn-outline ámbar).
- D. `+ Nueva cotización` → `openQuoteForm(l.id)`: abre el modal de cotización **con el lead ya seleccionado** (no navega a otra pantalla).
- E. `Editar` → `openLeadForm(l.id)`: abre modal **"Editar L-XXX"** con todos los campos.
- F. Lista "Cotizaciones (N)" del lead (3953) si tiene; clic abre detalle de cotización.
- G. Seguimientos (3959): form (tipo/fechaProxima/texto → "+ Registrar seguimiento"); lista **orden ascendente** por fechaProxima; cada uno con borde de color según estado/vencimiento, badge de estado, y si no está completado, un mini-form con **textarea de notas** + botón "✓ Verificar / completar".
- H. Historial de notas (3987): textarea + "Agregar nota"; lista reverse-cronológica.

**Etapa 2 · Nueva cotización**
- A. Cotizaciones → **`+ Nueva cotización`** (btn-gold). Modal título "Nueva cotización".
- B. Panel "Buscar lead": 4 botones toggle de campo (**Nombre** activo oro / Celular / Correo / Documento) + input que **filtra en vivo** (`oninput`) y muestra hasta 10 resultados; placeholder cambia según campo.
- C. Clic en un resultado → `applyLeadSelection`: rellena Cliente y Ciudad, fija canal y asesor del lead, **arrastra productos de interés** a los ítems (toast "N producto(s) arrastrado(s)"), muestra tarjeta del lead seleccionado con botón "Quitar", oculta la caja "lead nuevo".
- D. Si NO se selecciona lead: se muestra caja punteada "📝 Si es un lead nuevo…" con Celular/Correo/Documento/Dirección; al guardar se **crea el lead automáticamente**.
- E. Grid: Asesor* (select, "— Elegir —" + LEAD_ASESORES) · Canal* (LEAD_CHANNELS) · Cliente* (input) · Ciudad (input).
- F. Ítems: cada fila (grid 12) = Producto (select 4, opciones `Nombre — $precio`) · Descripción (4) · Cantidad (1, default 1) · Precio (2, **readonly**, autollenado desde lista) · "×" (1). "+ Agregar item" añade fila.
- G. Al elegir producto → `onQuoteProductChange`: setea Precio readonly y, si Descripción vacía, copia el nombre; recalcula.
- H. Descuento %* (default 0) con mensaje inline: ≤20 "✓ Pre-aprobado (vendedor)" verde · ≤50 "⚠ Requiere aprobación gerencia" ámbar · >50 "✗ No permitido (>50%)" rojo.
- I. Vigencia (días)* select [20,30,45,60,90] **default 30**, sufijo " días"; si 20 → "⚠ Vigencia 20 días: requiere aprobación de gerencia".
- J. Notas (textarea). Panel resumen **Subtotal / Descuento (-$) / Total** (live).
- K. Footer: **`Cancelar`** (btn-outline) · **`Crear`** (btn-gold). (No muestra total en el footer.)
- L. `saveQuote`: valida ≥1 ítem con qty>0 y price>0; descuento>50 bloquea. `requiresApproval = discount>20 || vigDias===20` → estado `pendiente_aprob` y notificación a gerencia; si no, `borrador`. Genera **7 seguimientos** con offsets `[3,7,14,21,35,45,60]` días. Crea lead si no había. Cierra modal, toast (variante según aprobación) y **abre el detalle de la cotización** (`openQuoteDetail`).

**Etapa 3 · Cotización → Venta**
- A. Detalle de cotización: panel "📅 Seguimientos programados (7 en 2 meses)" (4882) con cada hito (#n · fecha), color por estado/vencimiento, y "✓ Verificar" que despliega textarea de nota.
- B. Botón inferior **`→ Crear venta (autollena productos y cliente)`** (btn-gold) **sólo** si `estado==='aceptada' && !hasOrder` (4927). Si ya hay pedido → chip "✓ Venta creada".
- C. Clic → `convertQuoteToOrder` → `closeSlidePanel(); openSaleForm({quoteId})`: abre modal venta con datos heredados.

**Etapa 4 · Nueva venta + pago**
- A. Título: "Nueva venta" o **"Nueva venta (desde COT-XXXX)"** (5546).
- B. Panel "Cliente": toggle Nombre/Celular/Correo/Documento + buscador en vivo (`filterCustResults`); "o crear/editar"; campos Nombre*, Documento*, Celular*, Correo*, Ciudad*, Dirección*, **Dirección de entrega*** (con botón "📋 = Dirección" que copia), **MEDIO*** (TIENDA/LEAD/FERIA/REMARKETING/REFERIDO), **PDV*** (CASTOR 43/CASTOR CTG/PAGINA WEB/GERENCIA), **CIERRE DE VENTA*** (PRESENCIAL/VIRTUAL), **ABONO A BANCOS*** (DATAFONO/TRANSFERENCIA/EFECTIVO/BOLD). Si viene de cotización, Nombre/Ciudad/Celular/Correo/Doc/Dirección se **precargan** del lead/cotización.
- C. Ítems: por fila radio **Stock** / **Producción** (default Producción), Producto* (select, filtra a stock disponible si Stock), Cantidad, Precio unit. (readonly), % Desc., Total; info de stock/áreas; acabados (madera/metal/tejido) según producto; Comentario. "+ Agregar item". Si viene de cotización, se cargan sus ítems.
- D. Grid: Asesor* · Tiempo producción (días)* default 30 · Documento* (Factura/Remisión) · % Anticipo (default 50).
- E. **💰 Registro de pago** (obligatorio, inline): Monto recibido* (autollena = total×anticipo% salvo edición manual) · Método* (Transferencia/Efectivo/Link de pago/Tarjeta/Addi) · Cuenta receptora* (bankAccounts) · Referencia* · Soporte* (adjuntar). Aviso "pendiente hasta que Tesorería lo apruebe".
- F. Resumen: **Subtotal stock / Subtotal producción / Descuento total / Total venta**.
- G. Footer: **`Cancelar`** · **`Registrar venta`** (btn-gold).

### Paleta / estética relevante (de Demo6)
- Botón primario de acción: `.btn-gold` (oro `#C9A961`/`#D4B876` sobre navy). Secundario `.btn-outline`. Terciario `.btn-primary`.
- Paneles: `.panel` (navy `#152943`) y `.panel-2`; bordes `#2A4061`; títulos `.gold-title`.
- Modales centrados con backdrop; slide-panel entra desde la derecha.
- Inputs `.input-field`; labels `.label`. Chips `chip-alto/medio/bajo`, badges `badge-ok/warn/danger/info`.
- LEAD_CHANNELS (3776) = Llamada, WhatsApp, Instagram, Pagina Web, Facebook, Tienda 43, Tienda Ctg, Referidos.
- LEAD_ESTADOS (3777) = Nuevo, En gestión, No interesado, Compro.
- LEAD_ASESORES (3778) = Thalia Cifuentes, Alexander Vivas, Keyla Cardozo, Luz Angela Mendivil, Lisseth Ceballos, Valentina Olmos.
- PAY_METHODS (5524) = Transferencia, Efectivo, Link de pago, Tarjeta, Addi.

---

## PASO 2 — Inventario en castor-mvp

### `src/views/Leads.jsx` (637 líneas)
- Slide-panel de detalle **fiel**: todos los campos, productos de interés, banner recontactar, seguimientos (form + lista), historial de notas, modal "Editar L-XXX" (título correcto, 579).
- `+ Nueva cotización` (436) → `onNavigate('cotizaciones')` — **sólo cambia de vista**, no abre modal preseleccionado.
- Constantes locales: `ESTADOS` (orden distinto), `CHANNELS` (7, distintos), `ASESORES` (2).
- Seguimientos: orden **descendente** (485); verificar = sólo "✓ Marcar completado" (sin textarea de nota, 504).
- No renderiza la lista "Cotizaciones (N)" del lead.

### `src/views/Cotizaciones.jsx` (450 líneas)
- KPIs + toolbar + tabla + slide-panel de detalle + modal "Nueva cotización".
- Modal (380–447): campos Cliente (input plano), Ciudad, Canal, Asesor; ítems = Producto (sólo nombre) + Cantidad + total de línea + "×" (sin Descripción ni Precio unit. visible); Descuento %, Vigencia (días, "20" sin sufijo); Notas. Footer "Cancelar" / **"Guardar"** con total a la izquierda.
- `save()` (121): estado siempre `'borrador'`, sin aprobación, sin seguimientos persistidos, toast genérico, **no** abre el detalle.
- Seguimientos (slide-panel, 311): calculados al vuelo a `i*8` días (no persistidos), "✓ Verificar" sin handler.
- Detalle: botones Enviar/Aceptar/Rechazar + (si aceptada) **"→ Crear venta"** → `onNavigate('ventas')` (299) — navega, no abre modal.

### `src/views/Ventas.jsx` (392 líneas)
- Modal **"Nuevo pedido"** (315): un solo Producto (select `Nombre — $precio`), Cantidad, Asesor, Tipo, Documento, Anticipo %, Tiempo, Dirección de entrega. Footer "Cancelar"/**"Guardar"**.
- **No** hay: buscador de cliente, campos de cliente, MEDIO/PDV/CIERRE/ABONO, ítems múltiples, stock/producción, acabados, ni registro de pago inline.
- Registro de pago = **modal separado** "Registrar pago" (362) abierto desde el detalle del pedido (288).
- `saveOrder` no recibe `quoteId` ni precarga desde cotización; `MEDIOS`/`PDVS` existen como filtros pero el form no los setea.
- `METHODS` = Transferencia/Tarjeta/Efectivo/Cheque (≠ HTML).

### Store / datos
- `AppContext` expone `customers`, `bankAccounts`, `finishedStock`, `products`, `leads`, `quotes`, `orders`, `payments`, `add/addLast/update/nextId/pushNotification`. Navegación = `setView(name)`; sólo `libro-diario` recibe un 2º arg (`search`). **No hay** mecanismo de "intent" para abrir un modal preseleccionado al cambiar de vista.

---

## PASO 3 — Tabla de divergencias

| ID | Elemento | HTML (Demo6) | React actual | Divergencia | Severidad |
|----|----------|--------------|--------------|-------------|-----------|
| A1 | Lead → "+ Nueva cotización" | `openQuoteForm(l.id)` abre modal con lead preseleccionado y productos arrastrados | `onNavigate('cotizaciones')` sólo cambia de vista | No abre el modal; el cliente queda en la lista | **Crítica** |
| A2 | Modal cotización · Buscar lead | Panel con toggle Nombre/Celular/Correo/Doc + autocompletado en vivo + tarjeta seleccionada | Input "Cliente" de texto plano | Falta el buscador/autocompletado (flujo del Video 2: "f" → fredy) | **Crítica** |
| A3 | Autollenado al elegir lead | Rellena cliente/ciudad/canal/asesor + arrastra productos | No existe | Sin auto-relleno | **Crítica** |
| A4 | Caja "lead nuevo" + creación auto | Caja punteada; crea lead en `saveQuote` | No existe; nunca crea lead | Falta alta de lead desde cotización | Alta |
| A5 | Opción de producto (ítems cotización) | `Nombre — $precio` | Sólo `Nombre` | No se ve el precio en el dropdown (Video) | Alta |
| A6 | Fila de ítem (cotización) | Producto · **Descripción** · Cantidad · **Precio readonly** · × | Producto · Cantidad · total · × | Faltan Descripción y Precio unit. | Alta |
| A7 | Validación de descuento | Mensaje inline ✓/⚠/✗ según % | Input numérico sin mensaje | Falta feedback de aprobación | Alta |
| A8 | Validación de vigencia | Aviso si 20 días; opciones "N días" | Sin aviso; opciones "N" | Falta aviso + sufijo | Media |
| A9 | Resumen en modal cotización | Subtotal / Descuento / Total (live) dentro del modal | Sólo "Total" en footer | Falta desglose live | Alta |
| A10 | Botón submit cotización | **"Crear"**, sin total en footer | **"Guardar"**, total en footer | Texto y layout | Media |
| A11 | `saveQuote` (aprobación + 7 seg.) | Aprobación, 7 seguimientos persistidos `[3,7,14,21,35,45,60]`, notificación, abre detalle | `borrador` siempre, sin seg. persistidos, no abre detalle | Lógica de guardado | Alta |
| A12 | Seguimientos en detalle cotización | 7 persistidos, fechas reales, verificar con nota | Calculados `i*8`, no persistidos, "Verificar" sin acción | Fechas y funcionalidad | Media |
| A13 | Cotización → "→ Crear venta" | btn sólo si `aceptada && !hasOrder`, label "(autollena…)", abre modal venta con `quoteId` | "→ Crear venta" navega a Ventas | No abre modal heredado (Video 2) | **Crítica** |
| A14 | Título modal venta | "Nueva venta" / "Nueva venta (desde COT-XXXX)" | "Nuevo pedido" | Texto del título | **Crítica** |
| A15 | Buscar cliente (modal venta) | Toggle + autocompletado `filterCustResults` | No existe | Falta buscador de cliente | **Crítica** |
| A16 | Campos de cliente (modal venta) | Nombre/Doc/Celular/Correo/Ciudad/Dirección + **Dirección de entrega** (copy) + MEDIO/PDV/CIERRE/ABONO | Sólo `clientName` texto | Faltan ~10 campos | **Crítica** |
| A17 | Ítems venta múltiples + stock/producción | Multi-ítem, radio Stock/Producción, acabados, comentario, info de stock | Un solo producto + cantidad | Estructura de ítems | **Crítica** |
| A18 | Registro de pago inline | Bloque dentro del modal venta (Monto/Método/Cuenta/Referencia/Soporte) | Modal separado abierto desde el detalle | Pago no se captura al crear (clics extra) | Alta |
| A19 | Resumen modal venta | Subtotal stock / Subtotal prod / Descuento / Total | Sólo Total | Falta desglose | Media |
| A20 | Submit venta | "Registrar venta" | "Guardar" | Texto | Media |
| A21 | Precarga desde cotización | Cliente + ítems heredados | No recibe `quoteId` | Sin herencia | **Crítica** |
| A22 | PAY_METHODS | Transferencia/Efectivo/Link de pago/Tarjeta/Addi | Transferencia/Tarjeta/Efectivo/Cheque | Lista distinta | Baja |
| A23 | Seguimientos lead — orden y verificar | Ascendente + textarea de nota | Descendente + sólo "completado" | Orden y captura de nota | Media |
| A24 | Lista "Cotizaciones (N)" en lead | Presente | Ausente | Falta sección | Media |
| A25 | LEAD_ESTADOS / CHANNELS / ASESORES | 4 / 8 / 6 valores | 4(orden) / 7 / 2 | Listas desalineadas | Baja |

---

## PASO 4 — Plan de cambios (orden por severidad)

> Mecanismo transversal requerido (no es refactor arquitectónico, es el cableado
> que en el HTML dan las funciones globales `openQuoteForm`/`openSaleForm`):
> **intent de navegación** `pendingForm` en `AppContext` ({type:'quote',leadId} |
> {type:'sale',quoteId}) que la vista destino consume al montar y limpia.

**Bloque 1 · Críticas — Cotización (este turno)**
1. `pendingForm` en AppContext + consumo en Cotizaciones/Ventas. *(habilita A1, A13/A21)*
2. Reconstruir modal "Nueva cotización": buscador de lead con toggle + autocompletado + tarjeta seleccionada + autollenado (A2, A3); caja "lead nuevo" + alta auto (A4).
3. Ítems con opción `Nombre — $precio` (A5), Descripción + Precio readonly (A6).
4. Validación descuento (A7) + vigencia/sufijo (A8); desglose Subtotal/Descuento/Total live (A9); submit "Crear" (A10).
5. `save()` con aprobación + 7 seguimientos persistidos + abrir detalle (A11, A12).
6. Lead "+ Nueva cotización" → `pendingForm({type:'quote',leadId})` + navegar (A1).

**Bloque 2 · Críticas — Venta (siguiente turno)**
7. Reconstruir modal venta: título dinámico (A14), buscador de cliente (A15), todos los campos + Dirección de entrega/MEDIO/PDV/CIERRE/ABONO (A16), ítems múltiples stock/producción (A17), registro de pago inline (A18), desglose de totales (A19), submit "Registrar venta" (A20).
8. Precarga desde cotización vía `pendingForm({type:'sale',quoteId})` (A21); botón detalle cotización condicionado a `aceptada && !hasOrder` (A13).

**Bloque 3 · Altas/Medias/Bajas restantes**
9. PAY_METHODS (A22), seguimientos lead orden+nota (A23), lista cotizaciones del lead (A24), alinear LEAD_* (A25).

Pasos 5–7 (aplicar / verificar / log) se ejecutan por bloque y se registran en `CHANGELOG_PARIDAD.md`.
