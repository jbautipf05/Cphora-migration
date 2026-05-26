# CIERRE FASE 2 — Paridad Clientes / Ventas / Innovación / Lista de Precios

Rama: `claude/parity-fase-2` · Base: `main @ 874ec57` · Commits Fase 2: `e72f81c … (HEAD)`.
Metodología: hallazgo → inspección Demo6 → cambio → verificación Preview MCP → reporte `H-XXX.md` →
commit+push granular. Auto-validación por bloque (`VALIDACION_BLOQUE_{A..D}.md`).

## 1. Resumen ejecutivo
Se cerraron los **26 hallazgos** del inventario (H-016…H-041, con los grandes subdivididos en .1/.2/.3),
en 4 bloques: **Clientes**, **Ventas/Pedidos**, **Innovación** (modal venta innovación) y **Lista de Precios**.
Cambios principales: rediseño cosmético de tablas/tarjetas/detalle a paridad con Demo6; nuevo modal grande de
**Nueva venta** (Cliente con buscador + items dinámicos multi-ítem + registro de pago/liquidación), su variante
**Innovación** (productos propuestos + adjuntos), botón **"+ Pago" inline**, **Exportar PDF** de la lista de
precios, y modal **Nuevo producto**. Se respetó el alcance restringido y se preservaron las 2 mejoras React
marcadas (notas de cliente, badges TIPO de Ventas).

## 2. Hallazgos cerrados
**Clientes (Bloque A):** H-016 (KPIs+VIP+iconos, fix Postventa=1), H-017 (filtros labels+contenedor),
H-018 (col TELÉFONO), H-019 (PROCESOS número único), H-020 (badges Persona/Institucional),
H-021 (fechas sin relativo/sin cero), H-022 (quitar contador), H-023 (Carmiña $8.5M), H-024 (encabezado
detalle), H-025 (iconos contacto), H-026 (métricas detalle), H-027 (títulos dorados), H-028 (badge pedidos
cosmético), H-029 (título notas dorado, func. preservada).
**Ventas (Bloque B):** H-030 (KPIs), H-031 (filtro Asesor), H-032 (botones + Venta innovación), H-033
(tabla P-XXXX/OPs/Vence, TIPO preservado, doble-clic), H-034 (+Pago inline), H-035.1/.2/.3 (modal Nueva venta).
**Innovación (Bloque C):** H-036.1/.2/.3 (modal Venta Innovación: Cliente heredado + Productos propuestos +
Adjuntos + estado).
**Lista de Precios (Bloque D):** H-037 (KPIs, ya cumplía), H-038 (filtros+botones+texto), H-039 (tarjetas),
H-040 (Exportar PDF), H-041 (modal Nuevo producto).

## 3. Caveats acumulados (para revisión humana)
1. **[DECISIÓN — ✅ CONFIRMADA POR USUARIO]** Estado venta innovación (H-036.3): se mantiene
   `pendiente_innovacion` (Opción 2; funcional, aparece en módulo Innovación). Confirmado en prompt de
   pre-merge; razón: integra con el módulo Innovación.
2. **[DECISIÓN — ✅ CONFIRMADA POR USUARIO]** Modal Nuevo producto (H-041): se mantiene el modal dedicado
   simple (sin BOM) en Lista de Precios. Confirmado en prompt de pre-merge; razón: el inventario H-041 no
   incluía BOM; reversible si el cliente lo pide más adelante.
3. **IDs Pedido/OP cosméticos (H-028/H-033):** se mantuvo `PED-XXXX` como id/FK; etiqueta visual `P-XXXX` en
   tabla. NO se adoptó el modelo de 2 niveles de Demo6 (decisión aprobada al inicio).
4. **Multi-ítem `order.items[]`:** las ventas nuevas guardan `items[]`; Producción/Auditoría aún leen el modelo
   plano (`productId`/`qty` = primer ítem). Parity de esos módulos = fase posterior.
5. **PDF (H-040) y H-015:** la descarga del PDF no es observable en Preview MCP; layout sigue la referencia,
   requiere revisión visual del archivo descargado.
6. **Adjuntos innovación / imagen producto:** se capturan como nombre de archivo / emoji (sin subida real, por alcance).

## 4. HALLAZGOS_EXTRA detectados (no tocados; ver `HALLAZGOS_EXTRA.md`)
- **EX-F2-01:** copia duplicada de `fmtDate` (day:'2-digit') en `widgets.jsx` (clase B3). H-021 arregló
  `lib/format.js`; vistas que usen el de widgets seguirían con cero a la izquierda.
- **EX-F2-02:** `paid%` del seed no respaldado por registros de pago; `savePayment` recalcula desde la suma.
  Preexistente; **mitigado** para ventas nuevas (H-035.3 crea PAG real).
- (Bug propio en H-036.3 — validación de `submitSale` rechazaba innovación — detectado y **corregido** en verificación.)

## 5. Tests funcionales
- VALIDACION_BLOQUE_A: validación humana en vivo (14 hallazgos, aprobado por usuario).
- VALIDACION_BLOQUE_B: 23/23 ✅. · VALIDACION_BLOQUE_C: 12/12 ✅ (⚠ caveat estado). · VALIDACION_BLOQUE_D: 13/13 ✅ (⚠ caveat reuso).
- **Total auto-validación (B+C+D): 48/48 tests pasados, 0 fallidos.**

## 6. Regresión
- 0 errores de consola tras navegar todos los módulos en cada bloque.
- Fase 1 (modales/PDF cotización) y Fase 1.5 (B1 fechas, B2 customerId FK, B3 fmtCOP) intactas.
- Cambio aditivo `DataTable.onRowDoubleClick` sin impacto en otras vistas.

## 7. Screenshots clave (capturados durante la validación)
- Clientes: lista (KPIs+filtros+tabla con TELÉFONO) y detalle (encabezado dorado, métricas, secciones).
- Ventas: tabla (P-/OPs/Saldo/Pago/Vence) y modal Nueva venta (bloque Cliente).
- Innovación: modal "Nueva venta — Innovación" (Productos propuestos).
- Lista de Precios: KPIs + filtros + tarjetas rediseñadas (Bodega por color de sede).

## 8. Pendientes para Fase 3 / Fase 6
- Confirmar las 2 decisiones (estado innovación, reuso modal producto).
- Parity de Producción/Auditoría con `order.items[]` multi-ítem.
- EX-F2-01 (de-dup fmtDate widgets) y EX-F2-02 (paid% seed) — corrección técnica.
- Validación visual de PDFs descargados (H-040, H-015).
- CRs diferidos de Fase 1.5 (PENDIENTES_TECNICOS) + 10 tests.

## 9. Recomendación de merge
**⚠️ APTO PARA MERGE CON CONFIRMACIÓN.** Implementación completa y verificada (48/48 auto-tests, 0 errores de
consola, lint 0, build de producción limpio). Antes de mergear a `main`, conviene tu confirmación de las 2
decisiones abiertas (estado innovación H-036.3 · reuso modal producto H-041) — ambas reversibles en pocas líneas
y no bloquean el resto. Sin ellas, igualmente es mergeable (los valores elegidos son los funcionales/recomendados).
