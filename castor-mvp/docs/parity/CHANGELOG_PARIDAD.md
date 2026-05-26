# CHANGELOG de paridad — castor-mvp ↔ Demo6

Registro por flujo de divergencias detectadas, eliminadas y pendientes.
IDs de divergencia → ver `SPEC_FLUJO_<X>.md`, Paso 3.

---

## Flujo A — Lead → Cotización → Pedido → Pago

**Estado:** en progreso.

### Divergencias detectadas
25 (A1–A25). Críticas: A1, A2, A3, A13, A14, A15, A16, A17, A21.

### Eliminadas

**Bloque 1 · Modal "Nueva cotización" + cableado lead→cotización (aplicado)**

Mecanismo transversal: `pendingForm` añadido en `src/store/AppContext.jsx`
(estado efímero + setter expuesto en el value). No persiste.

| ID | Qué se hizo | Archivo · líneas |
|----|-------------|------------------|
| A1 | Lead "+ Nueva cotización" ahora setea `pendingForm({type:'quote',leadId})` y navega; Cotizaciones lo consume y abre el modal con el lead preseleccionado (`openQuoteForm`) | `Leads.jsx` (botón en slide-panel) · `Cotizaciones.jsx` (`openQuoteForm`, efecto `pendingForm`) |
| A2 | Panel "Buscar lead" con toggle Nombre/Celular/Correo/Documento + buscador en vivo (máx 10) + tarjeta del lead seleccionado con "Quitar" | `Cotizaciones.jsx` (`leadResults`, modal) |
| A3 | Al elegir un resultado (`applyLead`) se rellena cliente/ciudad/canal/asesor y se **arrastran** los productos de interés (toast "N producto(s) arrastrado(s)") | `Cotizaciones.jsx` (`applyLead`) |
| A4 | Caja punteada "lead nuevo" (Celular/Correo/Documento/Dirección) visible si no hay lead; `save()` crea el lead automáticamente | `Cotizaciones.jsx` (modal + `save`) |
| A5 | Opciones de producto ahora `Nombre — $precio` | `Cotizaciones.jsx` (ítems del modal) |
| A6 | Fila de ítem = Producto · **Descripción** · Cantidad · **Precio readonly** · × | `Cotizaciones.jsx` (ítems del modal) |
| A7 | Mensaje inline de descuento ✓≤20 / ⚠≤50 / ✗>50 (`discMsg`) | `Cotizaciones.jsx` |
| A8 | Aviso de vigencia 20 días + opciones "N días" (`vigMsg`) | `Cotizaciones.jsx` |
| A9 | Resumen Subtotal / Descuento / Total live dentro del modal | `Cotizaciones.jsx` (modal) |
| A10 | Footer sin total; submit **"Crear"** | `Cotizaciones.jsx` (footer) |
| A11 | `save()` con aprobación (`discount>20 || vig===20` → `pendiente_aprob` + notificación), 7 seguimientos persistidos `[3,7,14,21,35,45,60]`, lead nuevo, toast por variante y **abre el detalle** | `Cotizaciones.jsx` (`save`) |
| A12 | Detalle: 7 seguimientos persistidos (offsets correctos), color/estado/label espejo HTML, **verificar funcional** con textarea de nota; generación diferida para cotizaciones seed | `Cotizaciones.jsx` (`verifySeguimiento`, efecto, panel detalle) |
| A25 (parcial) | CHANNELS/ASESORES del modal alineados a `LEAD_CHANNELS`/`LEAD_ASESORES` del HTML | `Cotizaciones.jsx` (constantes) |

Verificado: `vite build` ✓ (68 módulos, sin errores) · `eslint` ✓ (0 errores).

### Cómo verificar manualmente (Bloque 1)
1. **Lead → Cotización:** Leads → abrir un lead (p.ej. con productos de interés) → "+ Nueva cotización". Debe **abrirse el modal de cotización** (no quedarse en la lista) con cliente, ciudad, canal, asesor rellenos y los productos cargados + toast de arrastre.
2. **Autocompletado:** Cotizaciones → "+ Nueva cotización" → en "Buscar lead" escribir una letra (p.ej. "j"); la lista filtra; cambiar el toggle a Celular/Correo/Documento cambia el placeholder y el campo de búsqueda. Clic en un resultado → autollena y muestra la tarjeta del lead.
3. **Lead nuevo:** sin seleccionar lead, llenar Cliente + caja "lead nuevo" + ≥1 ítem → "Crear". Debe crear el lead (toast "Lead L-XXX creado") y la cotización.
4. **Ítems:** elegir producto → precio se autollena (readonly) y Descripción toma el nombre; el resumen Subtotal/Descuento/Total se actualiza.
5. **Validaciones:** Descuento 30 → "⚠ Requiere aprobación gerencia"; 60 → "✗ No permitido"; Vigencia 20 → aviso. Crear con descuento 30 → toast de aprobación + estado `pendiente_aprob` + se abre el detalle.
6. **Seguimientos:** en el detalle, 7 hitos con fechas reales; "✓ Verificar" abre textarea, guarda y marca completado.

### Pendientes
- Bloque 2 (Venta · críticas): A13–A21 — reconstruir modal "Nueva venta" (buscador cliente, campos completos, MEDIO/PDV/CIERRE/ABONO, ítems múltiples stock/producción, registro de pago inline) + precarga desde cotización + botón "→ Crear venta" condicionado.
- Bloque 3 (resto): A22 (PAY_METHODS), A23 (seguimientos lead: orden + nota), A24 (lista cotizaciones del lead), A25 (alinear LEAD_* también en `Leads.jsx`).

### Post-verificación (auto-verificación dual Demo6 ↔ React)

Divergencias **descubiertas** durante la verificación del Bloque 1 (ver
`VERIFICACION_BLOQUE_1.md`) y su disposición:

| ID | Disposición | Detalle |
|----|-------------|---------|
| **A27** (anclaje de fechas) | ✅ **CORREGIDO** | `save()` y `genQuoteSeguimientos` ahora usan `today()` (DEMO_TODAY) en vez de `nowISO()` para `createdAt`, base de seguimientos, vigencia y `createdAt` del lead nuevo (espejo de `saveQuote` de Demo6). `verifySeguimiento` ya usaba `today()`. Verificado en vivo: `createdAt=2026-04-16`, seguimientos `04-19…06-15`, etiquetas relativas coherentes **"En 3d…En 60d"** (antes "En 47d…"), `completadoAt=2026-04-16 ≥ createdAt`. Archivo: `Cotizaciones.jsx`. Build+lint OK. |
| A26 (título h2/700 vs h3/600) | ⏸ NO corregir | → `MEJORAS_PROPUESTAS.md` (M3) |
| A28 (counter cot seed 2000 vs 2002) | ⏸ NO corregir | Dato seed, fuera de alcance |
| A29 (acciones detalle cotización) | ⏸ Diferido | → `PENDIENTES_BLOQUE2.md` |
| B2 (select estado muestra "borrador" con `pendiente_aprob`) | ⏸ Heredado | → `BUGS_HEREDADOS.md` (presente en ambos) |
