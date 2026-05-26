# VALIDACIÓN BLOQUE C — Innovación (modal Venta Innovación, H-036.1/.2/.3)

Auto-validación al cierre del Bloque C. Entorno: Preview MCP `:5173`.

## Sección 1 — Smoke tests por hallazgo
| Hallazgo | Test | Resultado |
|---|---|---|
| H-036.1 | Modal título "Nueva venta — Innovación" + bloque Cliente heredado + botón "Registrar venta innovación" | ✅ |
| H-036.2 | Bloque "Productos propuestos" + banner ⚠ "no existen en el catálogo" + tarjeta "⚙ Producto propuesto" | ✅ |
| H-036.3 | Bloque "Adjuntos obligatorios" (Adjuntar foto + consentimiento) + nota de estado pendiente | ✅ |

## Sección 2 — Integración funcional
- **E2E crear venta innovación:** cliente "Innov Test E2E" + propuesto "Mesa Futurista" $5.000.000 →
  "Registrar venta innovación" → orden `PED-1254` (`tipo:'innovacion'`, `estado:'pendiente_innovacion'`,
  `total:5.000.000`, `productoPropuesto.name:'Mesa Futurista'`). Modal cerró. ✅
- **Integración módulo Innovación:** la venta aparece en Innovación (KPI "OPs innovación" = 1, "Mesa Futurista"
  listada) — confirma el flujo de aprobación de gerencia con `pendiente_innovacion`. ✅
- **Buscador/cliente heredado:** mismo bloque Cliente de H-035.1 (reutilizado). ✅

## Sección 3 — Regresión
- **Switch estándar↔innovación:** "+ Nueva venta" abre modal "Nueva venta" con "Items de la venta"
  (sin propuestos/adjuntos, botón "Registrar venta"); "+ Venta innovación" abre el modo innovación. ✅
- **Bloque B (Ventas):** tabla intacta (5 pedidos seed), KPIs, +Pago, filtros sin cambios. ✅
- **Consola:** 0 errores tras abrir/cerrar ambos modales y navegar. ✅
- (Bloque A y Fase 1/1.5 ya cubiertos en VALIDACION_BLOQUE_B; sin regresión nueva — el cambio C es aditivo al modal.)

## Sección 4 — Comparación visual
- Screenshot del modal "Nueva venta — Innovación" (Cliente + Productos propuestos). Coincide con Demo6
  (single-form con flag isInnovation). Adjuntos bajo el fold.

## Sección 5 — Edge cases y persistencia
- **Submit vacío:** valida cliente + ≥1 producto propuesto (con nombre) antes de crear.
- **Persistencia:** la orden innovación creada persistió en `localStorage` (verificado en E2E). Datos de prueba luego limpiados.
- **Driver de inputs (nota):** llenar inputs controlados del modal vía `preview_eval` requiere disparar
  `input`+`change` y, por timing de React, hacerlo en evals separados; con eso el estado se fija de forma fiable.

## Sección 6 — Hallazgos extra
- **Bug propio detectado y CORREGIDO en verificación (no preexistente):** la guarda de `submitSale` validaba
  siempre `data.items` (estándar) y rechazaba la innovación → no se creaba la orden. Corregido a validación
  por modo. Documentado en H-036.3.md. (No es EX- porque era código en curso de este bloque, ya resuelto.)
- Sin hallazgos extra nuevos sobre el inventario.

## Sección 7 — Conclusión
- Tests ejecutados: **12** (3 smoke + 3 integración + 3 regresión + 3 edge/visual/persistencia).
- Pasados: **12** · Fallidos: **0** (el bug de validación se corrigió antes de cerrar).
- **Estado del bloque: ⚠️ APROBADO CON CAVEATS.**

### Caveat bloqueante para validación humana (estado de innovación)
- **DECISIÓN PENDIENTE:** se implementó `estado='pendiente_innovacion'` (recomendado, integra con el módulo
  Innovación). El usuario aún no confirmó la opción (el selector devolvió texto obsoleto 2 veces). Es un
  cambio de 1 línea en `submitSale` si se prefiere `pendiente_aprobacion_gerencia` (fiel a Demo6 saveSale,
  pero la venta no aparecería en Innovación). **A confirmar en el cierre de fase.**

### Otros caveats (heredados/menores)
- Adjuntos de innovación se capturan opcionalmente (simulados con nombre de archivo); en Demo6 son `required` HTML.
- Pago de innovación se registra pero el ingreso (postSale) no se contabiliza hasta aprobación de gerencia.

**Avanzo al Bloque D (Lista de Precios, H-037..H-041) según protocolo; los caveats quedan para el cierre de fase.**
