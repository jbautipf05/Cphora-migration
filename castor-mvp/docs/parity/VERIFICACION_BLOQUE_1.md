# VERIFICACIÓN Bloque 1 — Flujo A (Cotización)

Método: Demo6 servido por HTTP en `:5174` y app React en `:5173`, ambos
conducidos con **Preview MCP** (`preview_eval` para DOM/estado/handlers,
`getComputedStyle` para estilos, `preview_screenshot` para evidencia visual).
Ground-truth de Demo6 obtenido creando COT-2001 en vivo. Fecha real del sistema
≈ 2026-05-26.

> ⚠️ **Hallazgo de protocolo (corregido durante esta verificación):** mi primer
> intento de levantar la app servía vite con `cwd = raíz del worktree`, y como
> los globs de `tailwind.config.js` son relativos (`./src/**/*`), Tailwind
> escaneaba 0 archivos y **purgaba todo el CSS** → la app corría **sin estilos**.
> Mis screenshots iniciales del checkpoint anterior eran de una app sin estilar.
> Se corrigió fijando `cwd = castor-mvp` en `.claude/launch.json`. Tras el fix,
> `.btn-gold` computa el gradiente dorado correcto. **Toda la verificación de
> estilos de abajo es post-fix y válida.** (Demo6 no se ve afectado: usa Tailwind
> por CDN.)

---

## Resumen ejecutivo

El Bloque 1 **funciona y reproduce el comportamiento de Demo6** en lo esencial:
el modal "Nueva cotización" tiene el buscador de lead con toggles + autocompletado
por campo, autollena y arrastra productos de interés, crea lead nuevo cuando no
hay selección, valida descuento/vigencia con los mismos mensajes, genera los **7
seguimientos con offsets exactos [3,7,14,21,35,45,60]**, marca aprobación y
notificación, persiste en localStorage y abre el detalle. Estilos clave
(btn-gold, toggles, modal) son **idénticos** a Demo6 a nivel de estilo computado.
Se detectaron **4 divergencias no previstas** (A26–A29), una de severidad **Media**
(anclaje de fechas: `save()` usa `nowISO()` mientras el resto de la app usa un
`today()` fijo `2026-04-16`, lo que produce `completadoAt` y etiquetas de días
relativos incoherentes). **Conclusión: ⚠️ APROBADO CON OBSERVACIONES.**

---

## Paso 3 — Tabla de paridad (propiedad por propiedad)

| Elemento | Propiedad | Demo6 | React | ¿Coincide? | Sev. si no |
|----------|-----------|-------|-------|------------|------------|
| Botón "+ Nueva cotización" (lista) | background-image | `linear-gradient(135deg,#C9A961,#A88D4B)` | igual | ✅ | — |
| | color | `rgb(10,22,40)` | `rgb(10,22,40)` | ✅ | — |
| | border-radius | `8px` | `8px` | ✅ | — |
| | padding | `8px 16px` | `8px 16px` | ✅ | — |
| | font-weight | `600` | `600` | ✅ | — |
| | font-size | `14px` | `14px` | ✅ | — |
| | posición | esquina sup. derecha (`justify-between`) | igual | ✅ | — |
| Botón "+ Nueva cotización" (perfil lead) | handler | `openQuoteForm('L-XXX')` abre modal preseleccionado | `setPendingForm({type:'quote',leadId})`+navega→abre modal preseleccionado | ✅ | — |
| Modal | título texto | "Nueva cotización" | "Nueva cotización" | ✅ | — |
| | heading tag / weight | `h2` / `700` | `h3` / `600` | ❌ | **A26 Baja** |
| | título color/size | `rgb(230,215,168)` / 18px | igual | ✅ | — |
| Buscar lead | toggles | Nombre/Celular/Correo/Documento | igual | ✅ | — |
| | toggle activo bg/color | `rgb(201,169,97)` / `rgb(31,58,95)` | igual | ✅ | — |
| | toggle inactivo bg/color | `rgb(28,53,88)` / `rgb(138,155,184)` | igual | ✅ | — |
| | placeholder (Nombre) | "Escribe nombre del lead…" | igual | ✅ | — |
| | placeholder (Celular) | "Escribe celular…" | igual | ✅ | — |
| | filtrado por campo | filtra por name/phone/email/doc | igual (verificado phone) | ✅ | — |
| | sin coincidencias | "Sin coincidencias" | "Sin coincidencias" | ✅ | — |
| Tarjeta lead sel. | nombre | "L-101 · Antonio González" | igual | ✅ | — |
| | sub (contacto) | "📱… ✉… 🪪… · ciudad" | igual | ✅ | — |
| | botón quitar | "Quitar" | "Quitar" | ✅ | — |
| Grid campos | orden | Asesor*/Canal*/Cliente*/Ciudad | igual | ✅ | — |
| | Asesor opciones | "— Elegir —" + 6 LEAD_ASESORES | igual | ✅ | — |
| | Canal opciones | 8 LEAD_CHANNELS | igual | ✅ | — |
| Caja "lead nuevo" | visibilidad | visible sin lead, oculta con lead | igual | ✅ | — |
| | campos | Celular/Correo/Documento de identidad/Dirección | igual | ✅ | — |
| Ítems | selector producto | `<select>` (dropdown) | `<select>` | ✅ | — |
| | formato opción | "Butaca Serenity — $ 2.850.000" | idéntico (incl. espacio tras `$`) | ✅ | — |
| | campos fila | Producto/Descripción/Cantidad/Precio | igual | ✅ | — |
| | Precio readonly + title | readonly, "Precio desde lista (no editable)" | readonly, "Precio desde lista (no editable)" | ✅ | — |
| Descuento | msg ≤20 | "✓ Pre-aprobado (vendedor)" | idéntico | ✅ | — |
| | msg ≤50 | "⚠ Requiere aprobación gerencia" | idéntico | ✅ | — |
| | msg >50 / >100 | "✗ No permitido (>50%)" | idéntico | ✅ | — |
| Vigencia | opciones | "20 días"…"90 días", default 30 | idéntico | ✅ | — |
| | msg 20 | "⚠ Vigencia 20 días: requiere aprobación de gerencia" | idéntico | ✅ | — |
| Resumen | filas | Subtotal / Descuento / Total | idéntico | ✅ | — |
| Submit | texto | "Crear" | "Crear" | ✅ | — |
| | estilo | btn-gold | btn-gold (idéntico) | ✅ | — |
| | footer total | sin total en footer | sin total en footer | ✅ | — |
| save() | id / contador | COT-2001 (cot 2000→2001) | COT-2003 (cot 2002→2003) | ⚠️ | **A28 Baja** (seed counter) |
| | createdAt fuente | `today()` (date) | `nowISO()` (timestamp) | ❌ | **A27 Media** |
| | estado aprobación | `pendiente_aprob` si desc>20 ∥ vig=20 | igual | ✅ | — |
| | approvalReason | "Descuento 30%" | "Descuento 30%" | ✅ | — |
| | 7 seguimientos offsets | [3,7,14,21,35,45,60] | [3,7,14,21,35,45,60] | ✅ | — |
| | seguimiento shape | {id,n,fechaProxima,estado,notas,completadoAt} | idéntico | ✅ | — |
| | notificación | warning a gerencia | idéntica | ✅ | — |
| | abre detalle | sí (slide-panel) | sí (slide-panel) | ✅ | — |

---

## Paso 4 — Ejecución end-to-end de A1–A12 + A25

| ID | Cambio reclamado | Pasos ejecutados | Esperado | Obtenido | Estado |
|----|------------------|------------------|----------|----------|--------|
| A1 | Lead "+ Nueva cotización" abre modal preseleccionado | Leads → click fila Antonio → click "+ Nueva cotización" | modal con lead L-101 cargado | modal abre; cliente "Antonio González", asesor "Alexander Vivas", canal "Llamada", tarjeta lead visible | ✅ |
| A2 | Buscador de lead con toggles + autocompletado | abrir modal → escribir/cambiar toggle | filtra en vivo por campo | "ant"→Antonio; toggle Celular ph "Escribe celular…", "300"→L-101 por teléfono | ✅ |
| A3 | Autollenado + arrastre de productos | seleccionar lead | rellena campos + arrastra PI | cliente/ciudad/canal/asesor llenos; 2 ítems (Sofá Emma ×2, Butaca ×4) | ✅ |
| A4 | Caja "lead nuevo" + alta automática | crear sin lead, con cliente "Cliente Prueba" + datos + ítem | crea lead | lead **L-106** creado, estado "En gestión", 1 nota, contador 105→106 | ✅ |
| A5 | Opción producto "Nombre — $precio" | leer opciones del select | con precio | "Butaca Serenity — $ 2.850.000" | ✅ |
| A6 | Descripción + Precio readonly | inspeccionar fila ítem | desc editable, precio readonly | desc presente; precio readonly title "Precio desde lista (no editable)" | ✅ |
| A7 | Mensajes de descuento | set 15/30/60/150 | ✓/⚠/✗/✗ | exactos como Demo6 | ✅ |
| A8 | Mensaje de vigencia + "N días" | set vig 20 | aviso | "⚠ Vigencia 20 días…"; opciones "N días" | ✅ |
| A9 | Resumen Subtotal/Descuento/Total live | abrir modal | 3 filas | presentes; render "$ 0" formato con espacio | ✅ |
| A10 | Submit "Crear", sin total en footer | inspeccionar footer | "Cancelar"+"Crear" | exacto | ✅ |
| A11 | save() aprobación + 7 seg. + abre detalle | crear con desc 30 | pendiente_aprob, notif, 7 seg, abre detalle | todo ✅ (ver Paso 6) | ✅ |
| A12 | Verificar seguimiento con nota | detalle → "✓ Verificar" → nota → confirmar | seg completado con nota | seg #1 → completado, notas "Cliente contactado, interesado" | ⚠️ (completadoAt incoherente → A27) |
| A25 | Canal/Asesor alineados a HTML | leer opciones | 8 canales / 6 asesores | exactos | ✅ |

---

## Paso 5 — Casos límite

| Caso | Resultado | Estado |
|------|-----------|--------|
| Buscar lead inexistente ("zzz") | "Sin coincidencias" | ✅ |
| Toggle Nombre/Celular/Correo/Documento | placeholder y filtrado cambian por campo (verificado Celular→teléfono) | ✅ |
| Caja "lead nuevo" sin match | aparece y crea lead L-106 correctamente | ✅ |
| Producto con cantidad 0 / ítem vacío | `save()` lo descarta; si no queda ítem válido → bloquea | ✅ |
| Descuento > 100% (150) | mensaje "✗ No permitido (>50%)" y `save()` **bloquea** (0 añadidos) | ✅ |
| Vigencia 0 / negativa | imposible: es `<select>` [20,30,45,60,90] (igual que Demo6) | ✅ (por diseño) |
| Crear con 0 ítems | bloquea, toast "Agrega al menos un item válido" | ✅ |
| Crear sin lead pero con cliente | NO bloquea: crea lead nuevo (correcto, espejo Demo6) | ✅ |
| Crear sin cliente | bloquea, toast "Indica el cliente" | ✅ |
| Productos de interés (L-101, 2 PI) | se arrastran 2 ítems con qty/precio correctos | ✅ |

---

## Paso 6 — Persistencia y side effects (creando COT-2003, desc 30)

| Aspecto | Demo6 (COT-2001) | React (COT-2003) | ¿Coincide? |
|---------|------------------|------------------|------------|
| localStorage | `state` → `save()` | key `castor_cphora_v7` (debounce 250ms) | ✅ (mecanismo equivalente) |
| estado | pendiente_aprob | pendiente_aprob | ✅ |
| requiresApproval / reason | true / "Descuento 30%" | true / "Descuento 30%" | ✅ |
| 7 seguimientos (fechas) | 05-29,06-02,06-09,06-16,06-30,07-10,07-25 | idénticas | ✅ |
| seguimiento shape | {id,n,fechaProxima,estado,notas,completadoAt} | idéntico | ✅ |
| notificación | warning gerencia | warning gerencia (texto idéntico) | ✅ |
| abre detalle | slide-panel | slide-panel | ✅ |
| aparece en lista | sí | sí (COT-2003 en tabla) | ✅ |
| vigencia | createdAt+30 = 06-25 | 06-25 | ✅ |
| id / contador | COT-2001 (2000→2001) | COT-2003 (2002→2003) | ⚠️ A28 |
| createdAt | "2026-05-26" (date) | "2026-05-26T01:13:23Z" (timestamp) | ⚠️ A27 |

---

## REQUIERE VALIDACIÓN MANUAL

1. **Comparación pixel-a-pixel**: no tengo visual-diff automático; la coincidencia
   visual se afirma por **estilo computado** (idéntico) + screenshots a ojo, no por
   diff de imágenes. Conviene una pasada visual humana del modal lado a lado.
2. **Screenshot del Demo6**: el navegador de Preview sí captura `:5173` y `:5174`,
   pero no pude embeber aquí la captura del Demo6 modal (sí inspeccioné su DOM/estilos).
   Las capturas embebidas son de la app React.
3. **Toasts (texto/posición/duración)**: verifiqué que el `save()` bloquea y que
   aparecen los textos de validación, pero no medí duración ni posición exacta del
   toast vs Demo6.
4. **Hover/active states** de botones y filas no se verificaron (solo estado base).

---

## DIVERGENCIAS DETECTADAS NO PREVISTAS (no estaban en A1–A25)

- **A26 — Baja.** Título del modal: Demo6 `<h2>` `font-weight:700`; React `<h3>`
  `font-weight:600`. Color (`rgb(230,215,168)`) y tamaño (18px) coinciden. Efecto:
  el título se ve levemente menos bold. *(No corregir aún — documentado.)*

- **A27 — Media.** **Anclaje de fechas en cotizaciones nuevas.** Demo6 `saveQuote`
  usa `today()` para `createdAt` y como base de los seguimientos, y en Demo6
  `today()` = **fecha real** (2026-05-26) → todo coherente. En React, `today()`
  está **fijado** a `DEMO_TODAY = '2026-04-16'` (intencional para el seed), pero mi
  `save()` de Bloque 1 usó `nowISO()` (timestamp real) para `createdAt` y para la
  base de los seguimientos. Consecuencias observadas:
  - El detalle calcula `daysBetween(today(), fechaProxima)` contra 2026-04-16, así
    que un seguimiento del 02-jun se muestra como **"En 47d"** (en Demo6 sería ~"En 7d").
  - `verifySeguimiento` fija `completadoAt = today() = 2026-04-16`, una fecha
    **anterior** al `createdAt` (25-may) del propio documento (visible en screenshot:
    Seguimiento #1 "✓ 16 de abr de 2026").
  - **Mirror fiel sugerido (a decidir):** usar `today()` (no `nowISO()`) para
    `createdAt` y base de seguimientos en `save()`, y para `completadoAt` en verify,
    para que todo quede anclado al mismo "hoy" del demo. Raíz: `DEMO_TODAY` en
    `lib/format.js` ya diverge del `today()` real de Demo6 (divergencia preexistente
    de toda la app); Bloque 1 la agravó al mezclar `nowISO()` con `today()`.

- **A28 — Baja (seed).** `counters.cot` inicial difiere: Demo6 = 2000, React = 2002
  → el próximo id difiere (COT-2001 vs COT-2003). Es dato seed, fuera del alcance de
  Bloque 1. (Posible patrón en otros contadores — revisar en un bloque de seed.)

- **A29 — Media (preexistente, fuera de Bloque 1).** El **detalle** de cotización en
  React muestra botones "Aceptar/Rechazar/Enviar"; Demo6 usa el `<select>` de estado
  + "PDF" + "→ Crear venta" (sólo si aceptada). Además, cuando `estado=pendiente_aprob`
  el `<select>` muestra "borrador" (el valor no está entre las opciones) — **quirk
  presente en AMBOS** (Demo6 y React), por lo que se anota como heredado. El detalle
  no era parte del alcance declarado de Bloque 1 (corresponde a Bloque 2/posterior).

---

## Huecos del propio protocolo de auto-verificación

1. **El entorno de preview puede correr la app sin CSS** si el `cwd`/config de
   Tailwind no está bien (me pasó). **Mitigación adoptada:** verificar siempre, como
   primer paso, que `.btn-gold` (u otra clase de componente) computa su estilo
   esperado antes de confiar en cualquier screenshot.
2. **`preview_resize` rompe los screenshots** de la sesión (timeout). **Mitigación:**
   no usar `resize`; si se usa, reiniciar el server.
3. **Sin visual-diff**: la paridad estética se sostiene en estilos computados +
   inspección a ojo, no en comparación de imágenes pixel a pixel.
4. **Simular input de React** requiere el setter nativo + `dispatchEvent('input')`;
   clicks por texto pueden colisionar cuando hay varios botones con la misma etiqueta
   (me pasó con "✓ Verificar"): hay que desambiguar por proximidad al elemento.

---

## Conclusión

**⚠️ APROBADO CON OBSERVACIONES.**

Bloque 1 cumple su alcance declarado (A1–A12 + A25): el flujo Lead→Cotización
reproduce el de Demo6 en estructura, estilos computados, validaciones, autocompletado,
arrastre de productos, alta de lead, aprobación, 7 seguimientos con offsets exactos,
notificación, persistencia y apertura de detalle. **Todos los A1–A12 + A25 quedan
✅**, con una salvedad funcional en A12/A11: el **anclaje de fechas (A27, Media)**
produce `completadoAt` y etiquetas de días relativos incoherentes por usar `nowISO()`
en vez del `today()` fijo del demo.

Recomendación antes de Bloque 2: decidir A27 (cambiar `save()`/verify a `today()`).
A26/A28 son cosméticos/seed. A29 es preexistente y corresponde a un bloque posterior.
Ninguna divergencia nueva fue corregida (según la instrucción); todas quedan
documentadas para tu decisión.
