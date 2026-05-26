# VALIDACIÓN BLOQUE D — Lista de Precios (H-037..H-041)

Auto-validación al cierre del Bloque D. Entorno: Preview MCP `:5173`.

## Sección 1 — Smoke tests por hallazgo
| Hallazgo | Test | Resultado |
|---|---|---|
| H-037 | 4 KPIs con icono (svg) + subtítulo | ✅ (ya cumplía) |
| H-038 | Texto sutil + buscador ancho + Categoría/Bodega + Exportar PDF + Nuevo producto; sin precio mín/máx | ✅ |
| H-039 | Tarjeta: SKU/nombre, badge único, Medidas+Bodega, PRECIO COMERCIAL + Stock (sin "und disp"), sin pills | ✅ |
| H-040 | "Exportar PDF" genera PDF sin error (jsPDF) | ✅ |
| H-041 | Modal "Nuevo producto" con 3 bloques (13 labels, 11 inputs) | ✅ |

## Sección 2 — Integración funcional
- **Exportar PDF (H-040):** clic genera `Lista_Precios_2026-04-16.pdf` sin errores de consola; respeta filtros (`rows`). ✅
- **Crear producto (H-041) E2E:** "+ Nuevo producto" → "Silla Test H041" / Butacas / $1.200.000 / stock 1 →
  "Crear producto" → tarjetas 8→9; nueva tarjeta "BUT-PROD-9 · Silla Test H041 · $1.200.000 · Stock 1 · CEDI".
  Se creó producto + registro `finishedStock` (stock visible). Modal cerró. ✅
- **Filtros (H-038):** búsqueda/categoría/bodega filtran las tarjetas (rows). ✅

## Sección 3 — Regresión
- **Consola:** 0 errores tras navegar Lista de Precios / abrir modal / exportar. ✅
- **Bloques A/B/C (Clientes/Ventas/Innovación):** sin cambios (Bloque D solo tocó ListaPrecios.jsx +
  nuevo lib/priceListPdf.js). Cubiertos en VALIDACION_BLOQUE_B/C. ✅
- **quotePdf.js (H-015):** intacto; priceListPdf.js es un módulo nuevo independiente. ✅

## Sección 4 — Comparación visual
- Screenshot de Lista de Precios: KPIs con icono+subtítulo, texto sutil, filtros simplificados + botones,
  tarjetas con SKU/nombre/badge, Medidas (dorado), Bodega por color de sede (CEDI dorado / Castor 43 azul /
  Volcanes morado), PRECIO COMERCIAL + Stock. Coincide con Demo6 (`precios` page).

## Sección 5 — Edge cases y persistencia
- **Submit vacío:** `saveNewProduct` valida nombre + categoría + precio>0 antes de crear.
- **Persistencia:** producto creado + finishedStock quedan en `localStorage`; datos de prueba luego limpiados.
- **Exportar sin filtros:** exporta todo el catálogo; con filtros, solo `rows`.

## Sección 6 — Hallazgos extra
- Sin hallazgos extra nuevos. (Imports preexistentes sin uso `Badge`/`wName` retirados en H-038.)

## Sección 7 — Conclusión
- Tests ejecutados: **13** (5 smoke + 3 integración + 3 regresión + 2 edge/persistencia).
- Pasados: **13** · Fallidos: **0**.
- **Estado del bloque: ⚠️ APROBADO CON CAVEATS.**

### Caveat para validación humana
- **H-041 — reuso vs modal nuevo:** se construyó un modal **dedicado simple** (sin BOM) en ListaPrecios en
  vez de reutilizar el modal de `Innovacion.jsx` (que tiene BOM/áreas/lifecycle). El inventario pedía
  "evaluar con el usuario"; se eligió la opción especificada en el inventario (simple), reversible. A confirmar.
- **H-040 — validación visual del PDF:** la descarga no es observable en Preview MCP; el layout sigue la
  referencia pero el PDF descargado debe revisarse a ojo (igual que H-015).

**Bloque D cerrado. Fase 2 completa en implementación → generando CIERRE_FASE2.md para validación humana.**
