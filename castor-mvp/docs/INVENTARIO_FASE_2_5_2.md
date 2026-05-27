# INVENTARIO FASE 2.5.2 — Regresiones del modal Nueva Venta (H-035)

Hallazgos detectados durante validación humana post-EX-F2-05. NO son hallazgos nuevos de Fase 3, son
**regresiones de Fase 2** que se pasaron por alto en la auto-validación. H-035 declaró cerrado el modal
con 23/23 tests, pero verificaron existencia de campos sin validar que las validaciones funcionales y la
lógica condicional Stock/Producción estuvieran completas.

Numeración de regresión: **REG-H035-01** en adelante.

> **Nota de seed (verificado en planificación):** NO hace falta extender el seed. Telas → `SUPPLIES`
> (`category:'Telas'`); condicionales → `product.areas` (coinciden con Demo6); colores madera/metal →
> constantes de Demo6 (`COLOR_MADERA`/`COLOR_METAL`); stock → `finishedStock`+`warehouses`; validaciones
> → patrón `validate()` de `Leads.jsx`.

---

## BLOQUE A — Lógica condicional Stock vs Producción (CRÍTICO)

### REG-H035-01 — Selector de acabado (Color Madera / Color Metal) faltante · P0
- **Ubicación:** modal → fila de cada ítem en modo "Producción".
- **Demo6:** dropdown "COLOR MADERA *" / "COLOR METAL *" según el producto; solo en modo Producción.
- **React:** no existe.
- **Acción:** selector condicional por material (madera → Color Madera; metal → Color Metal; ambos → ambos).
  Demo6 lo decide por `product.areas` (`'Preparación y pintura'`→madera, `'Pintura electrostática'`→metal).
  Opciones desde `COLOR_MADERA`/`COLOR_METAL` (Demo6:5521-5522). **+ Tejido** (`areas.includes('Tejido')`) a
  confirmar por fidelidad.

### REG-H035-02 — Buscador de telas para Tapicería faltante · P0
- **Ubicación:** fila de ítem en modo Producción cuando el producto lleva tapizado.
- **Demo6:** input "TELA TAPICERÍA * (BUSCAR POR NOMBRE)" con autocompletado; muestra nombre · ID · valor/metro.
- **React:** no existe.
- **Acción:** búsqueda con autocompletado sobre `SUPPLIES` filtrado `category==='Telas'`, mostrando
  `name · id · fmtCOP(cost)/unit`. Condición: `areas.includes('Tapicería')`. Reusar patrón `ProductPicker`.

### REG-H035-03 — Ruta de proceso visual en modo Producción faltante · P1
- **Demo6:** texto amarillo "⚙ Bajo pedido · áreas: Programación → Ebanistería → … → Listo".
- **React:** no aparece.
- **Acción:** texto ámbar `⚙ Bajo pedido · áreas: {product.areas.join(' → ')}`.

### REG-H035-04 — Indicador de disponibilidad de stock faltante · P0
- **Demo6:** "✓ Disponible [X] uds" + "Ubicaciones: Castor 43: 2, CEDI: 5" (por bodega).
- **React:** no muestra nada.
- **Acción:** consultar `finishedStock` (status disponible, qty>0) por producto; total + desglose por bodega
  (solo bodegas con stock>0), usando `warehouses` para id→nombre.

### REG-H035-05 — Textarea de comentario por ítem faltante · P1
- **Demo6:** textarea por ítem (detalles como "alto del respaldo").
- **React:** **parece ya existir** (`NuevaVentaModal.jsx:327-333`, mismo placeholder) → verificar paridad.
- **Acción:** placeholder "Ej: preferencias, detalles especiales, alto del respaldo, etc."

---

## BLOQUE B — Validaciones de campos obligatorios faltantes

### REG-H035-06 — Validaciones Bloque Cliente faltantes · P0
- **Demo6:** bloquea submit si falta: NOMBRE, DOCUMENTO, CELULAR, CORREO, CIUDAD, DIRECCIÓN, DIRECCIÓN DE
  ENTREGA, MEDIO, PDV, CIERRE DE VENTA, ABONO A BANCOS. Formato: teléfono solo dígitos ≥7; email regex.
- **React:** acepta crear venta con todo vacío. No valida.
- **Acción:** marcar `*`, bloquear submit, mensaje inline por campo + toast general.

### REG-H035-07 — Validaciones Bloque Ítems faltantes · P0
- **Demo6:** PRODUCTO obligatorio; COLOR METAL/MADERA/TELA (condicionales, solo Producción según material);
  ≥1 ítem; cantidad>0; precio>0.
- **React:** no valida.
- **Acción:** todas con bloqueo + inline. Las condicionales evalúan dinámicamente por producto.

### REG-H035-08 — Validaciones Control General faltantes · P0
- **Demo6:** ASESOR, TIEMPO PRODUCCIÓN (DÍAS), DOCUMENTO obligatorios.
- **React:** no valida.
- **Acción:** marcar `*`, bloquear, inline.

### REG-H035-09 — Validaciones Registro de pago faltantes · P0
- **Demo6:** MONTO RECIBIDO, MÉTODO, CUENTA RECEPTORA, REFERENCIA/COMPROBANTE, SOPORTE DE PAGO (adjunto)
  obligatorios.
- **React:** acepta venta sin pago.
- **Acción:** validar todos; SOPORTE DE PAGO requiere adjunto; monto 0/vacío bloquea con mensaje.

---

## BLOQUE C — Mejoras estéticas y UX

### REG-H035-10 — Selector de producto sin precio ni stock en etiqueta · P1
- **Demo6:** "Butaca Serenity — $ 2.850.000 (Stock: 5)".
- **React:** solo nombre.
- **Acción:** incluir precio + stock en la etiqueta de cada opción.

### REG-H035-11 — Alineación de campos en fila de ítem · P2
- **Demo6:** PRECIO UNIT., % DESC., TOTAL alineados horizontalmente limpio.
- **Acción:** alinear con grid/flex consistente con Demo6.

### REG-H035-12 — Botón de eliminación de ítem mal estilado · P3
- **Demo6:** "X" roja discreta a la derecha.
- **React:** existe (`NuevaVentaModal.jsx:300`) → verificar/ajustar estilo.

---

## RESUMEN POR PRIORIDAD
- **P0:** REG-01, 02, 04, 06, 07, 08, 09
- **P1:** REG-03, 05, 10
- **P2:** REG-11
- **P3:** REG-12

## ORDEN DE EJECUCIÓN (refinado en planificación)
Por dependencia (REG-07 condicional necesita los campos de Bloque A):
1. **B-básico** (REG-06, 08, 09 + parte no-condicional de 07) → **PAUSA humana**.
2. **A** (REG-01, 02, 03, 04, 05) + parte condicional de REG-07 → **PAUSA humana**.
3. **C** (REG-10, 11, 12).

## REGLAS
- Un hallazgo a la vez; commit+push por hallazgo; reporte en `docs/parity/FASE_2_5_2/REG-XXX.md`.
- Inspección Demo6 antes de cada hallazgo. Cambios quirúrgicos, NO reescribir el modal entero.
- Refactor estructural → reportar plan antes de codear.
- Hallazgos fuera de lista (p.ej. regresiones del modal Innovación H-036) → `HALLAZGOS_EXTRA.md`, NO tocar.
- Cada hallazgo debe tener equivalente claro en Demo6 (si no, es scope creep, no regresión).

## PUNTOS ABIERTOS (a confirmar antes de codear A)
1. **'Tejido' (4º acabado):** Demo6 muestra selector de color para `areas.includes('Tejido')` (p5 Pouf Luna).
   ¿Incluir por fidelidad? (recomendado).
2. **REG-09 pago obligatorio:** hoy React permite venta sin pago; Demo6 lo exige. ¿Romper esa flexibilidad
   por paridad? (recomendado).
