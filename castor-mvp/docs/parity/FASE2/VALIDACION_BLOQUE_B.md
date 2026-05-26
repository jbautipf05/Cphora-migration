# VALIDACIÓN BLOQUE B — Ventas (H-030 … H-035.3)

Auto-validación ejecutada al cierre del Bloque B (protocolo permanente, 7 secciones).
Entorno: Preview MCP `:5173` (vite node-directo), DEMO_TODAY=2026-04-16. Datos de prueba efímeros.

## Sección 1 — Smoke tests por hallazgo
| Hallazgo | Test | Resultado |
|---|---|---|
| H-030 | 4 KPIs con icono (svg) + subtítulo | ✅ |
| H-031 | Selector "Todos los asesores" presente | ✅ |
| H-032 | Botones "+ Nueva venta" y "+ Venta innovación"; sin "+ Nuevo pedido" | ✅ |
| H-033 | Headers PEDIDO/OPS/SALDO/PAGO/TIPO/VENCE; sin PRODUCTO/MEDIO/ESTADO; label "P-1245"; ayuda doble clic | ✅ |
| H-034 | Botón "+ Pago" en todas las filas | ✅ |
| H-035.1 | Modal: 4 píldoras + buscador + exprés + entrega+📋 + MEDIO/PDV/CIERRE/ABONO | ✅ |
| H-035.2 | "+ Agregar item" 1→2 ítems, radios Stock/Producción, X quitar | ✅ |
| H-035.3 | Bloque Registro de pago + caja de liquidación (subtotales/desc/total) | ✅ |

## Sección 2 — Integración funcional
- **Crear venta E2E** (modal → tabla): nombre + producto "Butaca Serenity" → "Registrar venta" →
  nueva fila `P-1254` (Total $2.850.000, Saldo $1.425.000, 50%, PRODUCCION, OPs=1). Filas 5→6. ✅
- **Pago respaldado (H-035.3):** la venta creó un registro `PAG-505` de $1.425.000 que respalda
  `order.paid=50` (no un % suelto). ✅
- **+ Pago inline (H-034):** sobre `P-1253` 50%→75%, saldo recalculado a $862.500. ✅
- **Buscador inteligente (H-035.1):** "Jose" → C-001 → autocompleta nombre/doc/celular/correo/ciudad. ✅
- **Monto recibido ↔ % Anticipo:** monto auto = 50% del total ($1.425.000), sync bidireccional. ✅
- **Filtro Asesor (H-031):** "Thalia Cifuentes" → 5→2 filas. ✅
- **Doble clic abre detalle (H-033):** título "P-1245". ✅

## Sección 3 — Regresión
- **Consola:** 0 errores tras navegar Ventas/Clientes/Inicio. ✅
- **Bloque A (Clientes):** KPIs Total/Con procesos/VIP/Postventa (=1), columna TELÉFONO, badge "Persona". ✅
- **Inicio (B1):** renderiza canvas (gráfico) + 4 KPIs. ✅
- **B2 (ADR-011):** `submitSale` resuelve/crea `customerId` FK; venta nueva enlaza cliente correctamente. ✅
- **B3 (fmtCOP):** montos formateados es-CO en toda la tabla. ✅
- **DataTable:** cambio aditivo `onRowDoubleClick` no afectó otras vistas (sin errores). ✅

## Sección 4 — Comparación visual
- Screenshots tomados (tabla Ventas + modal Nueva venta). Coinciden con Demo6: KPIs con icono+subtítulo,
  filtros compactos + Asesor, botones innovación/nueva venta, tabla P-/OPs/Saldo(rojo)/Pago(barra)/Vence,
  modal con bloque Cliente (píldoras, buscador, exprés, origen). No se sirvió Demo6 en paralelo esta vez;
  comparación contra el HTML fuente (líneas citadas en cada H-XXX.md).

## Sección 5 — Edge cases y persistencia
- **Submit vacío:** `submitSale` valida cliente e items (no crea pedido sin nombre/producto). ✅
- **Persistencia:** creada "Valida B" (P-1254) → reinicio del server (simula refresh) → la venta persiste
  (localStorage `castor_cphora_v7`). ✅
- **Reset/limpieza:** "Reset Data Demo" dispara un `confirm()` nativo que **bloquea Preview MCP**;
  se limpió vía `localStorage.removeItem` + reinicio (gotcha registrado en memoria).

## Sección 6 — Hallazgos extra
- **EX-F2-02** [DESCUBIERTO EN VALIDACIÓN H-034]: `paid%` del seed no respaldado por registros de pago;
  `savePayment` recalcula `paid` desde la suma de pagos (preexistente, no crítico). Registrado en
  `HALLAZGOS_EXTRA.md`. **Mitigado para ventas nuevas** por H-035.3 (crea PAG real que respalda el paid%).
- (EX-F2-01 `fmtDate` duplicada en widgets.jsx — registrado en Bloque A, sin cambios.)

## Sección 7 — Conclusión
- Tests ejecutados: **23** (8 smoke + 7 integración + 6 regresión + 2 edge/persistencia).
- Pasados: **23** · Fallidos: **0**.
- Hallazgos extra: **1 nuevo** (EX-F2-02), documentado, no bloqueante.
- **Estado del bloque: ✅ APROBADO.** Sin caveats bloqueantes.

### Caveats menores (para validación humana de fin de fase)
1. Multi-ítem se guarda en `order.items[]`; Produccion/Auditoría aún leen el modelo plano
   (`productId`/`qty` = primer ítem). Parity de esos módulos = fase posterior.
2. "+ Venta innovación" abre por ahora el modal estándar; el modal dedicado es H-036 (Bloque C).
3. Soporte de pago se simula con nombre de archivo (sin subida real — alcance).

**Avanzo al Bloque C (modal Venta Innovación, H-036.x) sin pausa humana, según protocolo.**
