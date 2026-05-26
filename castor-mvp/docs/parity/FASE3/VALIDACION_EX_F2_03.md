# VALIDACIÓN EX-F2-03 — Precarga modal Nueva Venta desde Cotización + paso-4 retroactivo

**Rama:** `claude/parity-fase-3` · **Fecha:** 2026-05-26
**Scope:** abrir el modal H-035 (Nueva Venta) **precargado** desde el detalle de una cotización
aceptada, con `quoteId` para trazabilidad, y el **paso-4 retroactivo** de `customerId` sobre la
cotización origen cuando la venta auto-crea un cliente.

## Diagnóstico (estado previo)

- `Cotizaciones.jsx:290` — "→ Crear venta" solo hacía `onNavigate('ventas')` (navegaba, sin precargar).
- `NuevaVentaModal.jsx` — `useState(emptyForm())`, sin prop de precarga.
- `Ventas.submitSale` — escribía `quoteId: null` hardcodeado en ambas ramas (estándar / innovación).
- No había consumo de `pendingForm` en Ventas.

## Cambios

1. **`NuevaVentaModal.jsx`** — nueva prop `prefill`; `useEffect([open])` siembra el form con la
   precarga (merge sobre `emptyForm()`) o lo deja vacío. Se siembra solo en la transición de apertura.
2. **`Cotizaciones.jsx`** — el botón emite intent `setPendingForm({ type:'sale', quoteId })` + navega
   a Ventas. El modal abre **encima** del módulo Ventas (no es una pantalla nueva).
3. **`Ventas.jsx`** —
   - Consume `pendingForm.type==='sale'`: arma el prefill desde la quote y abre el modal (no innovación).
   - `buildSalePrefill(quote)`: si la quote tiene `customerId` → copia el `customer`; si solo tiene
     `leadId` → copia el `lead` (con `customerId` vacío para que `submitSale` cree el cliente); si no
     hay ninguno → solo `clientName`. Ítems: precio recalculado desde la lista, `disc:0`,
     `tipo:'produccion'` (**decisión A**).
   - `submitSale` ahora escribe `quoteId: saleQuoteId || null`.
   - **Paso-4 retroactivo:** tras resolver/crear el cliente, si la venta vino de una cotización y el
     `customerId` resultante difiere del de la quote, `update('quotes', quoteId, { customerId })`.
   - Los botones de toolbar ("+ Nueva venta" / "+ Venta innovación") limpian el prefill.

## Decisiones confirmadas

- **A) Precio/descuento:** el modal mantiene su diseño (precio read-only desde lista, `disc` por ítem).
  No se preserva el precio histórico de la quote. **Diferencia de totales esperada** (ej. COT-2002:
  quote 8.5M con 15% desc. → prefill 10M a precio de lista). Documentado como comportamiento esperado.
- **B) Visibilidad del botón:** "→ Crear venta" solo aparece en cotizaciones `aceptada` (sin cambios).
  Para validar el caso lead-sin-customer se acepta COT-2001 primero.

## Auto-validación (Preview MCP, localhost:5173, 0 errores de consola)

### Caso 1 — cotización con `customerId` existente (COT-2002 → C-004)
- ✅ "→ Crear venta" abre el modal "Nueva venta" **encima** de Ventas (no navega a otra pantalla).
- ✅ Cliente precargado: Carmiña Chapman, doc `CC 45.662.980`, tel, email, ciudad, dirección y
  dirección de entrega.
- ✅ Ítems precargados: Módulo Roma ×1 ($7.400.000) + Pouf Luna ×4 ($650.000). Asesor: Alexander Vivas.
- ✅ Total precargado $10.000.000 (precio de lista; difiere del total histórico de la quote — decisión A).
- ✅ Al registrar: **PED-1254** creado con `quoteId='COT-2002'`, `customerId='C-004'`, 2 ítems.
- ✅ COT-2002.customerId permanece `C-004` (ya enlazado; sin cambio).

### Caso 2 — cotización con `leadId` sin `customerId` (COT-2001 → lead L-102)
- ✅ Tras aceptar COT-2001, "→ Crear venta" abre el modal precargado con datos del **lead**
  (Laura Mendoza, doc, tel, email, Medellín, dirección), 3 ítems, asesor Thalia Cifuentes.
- ✅ Al registrar: cliente **C-005** creado a partir del lead.
- ✅ **PED-1255** creado con `quoteId='COT-2001'`, `customerId='C-005'`, 3 ítems.
- ✅ **Paso-4 retroactivo:** COT-2001.customerId pasó de `null` → `C-005` (coincide con el del pedido).

### Caso 3 — cotización sin lead ni customer
- Cubierto por la rama `{ ...base, custName: quote.clientName }` de `buildSalePrefill` (modal con solo
  el nombre, `customerId` vacío → `submitSale` crea el cliente al guardar). No hay quote así en el seed
  (todas tienen `leadId`); se validará con una cotización creada sin lead si se requiere.

### Calidad
- ✅ `eslint .` sin errores en los 3 archivos.
- ✅ `vite build` OK (warning de tamaño de chunk preexistente, no relacionado).

## Pasos para validación humana

1. Cotizaciones → abrir **COT-2002** → "→ Crear venta".
   - Confirmar: modal "Nueva venta" abre encima (no cambia de pantalla), cliente Carmiña + 2 ítems precargados.
   - Registrar → en Ventas aparece el pedido nuevo con cliente Carmiña; en localStorage el pedido tiene
     `quoteId: "COT-2002"`.
2. Cotizaciones → abrir **COT-2001** (Laura Mendoza) → **Aceptar** → "→ Crear venta".
   - Confirmar: precarga datos del lead, 3 ítems.
   - Registrar → se crea un cliente nuevo; en localStorage `COT-2001.customerId` queda fijado y coincide
     con el `customerId` del pedido nuevo (paso-4 retroactivo).
3. Toolbar de Ventas → "+ Nueva venta" abre el modal **vacío** (sin arrastrar la precarga anterior).
