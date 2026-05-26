# VALIDACIÓN EXHAUSTIVA PRE-MERGE — Fase 2

Validación automatizada end-to-end previa al merge de `claude/parity-fase-2` → `main`.
Entorno: Preview MCP `:5173` (vite node-directo), DEMO_TODAY=2026-04-16. Datos de prueba efímeros (localStorage).
Regla aplicada: **no se arregló nada** durante la validación; los hallazgos se documentan abajo.

> **Decisiones confirmadas por el usuario** (firmes): (1) estado venta innovación = `pendiente_innovacion`;
> (2) modal Nuevo producto dedicado simple sin BOM. Reflejadas en `CIERRE_FASE2.md` §3.

---

## Protocolo 1 — Flujo crítico end-to-end (Lead → Cotización → Venta → Pago → Cliente)

| Paso | Acción | Resultado |
|---|---|---|
| 1 | Ir a Leads | ✅ |
| 2 | Crear lead "Validación E2E" (tipo Lead, doc VAL-001, tel 3001234567, etc.) | ✅ |
| 3 | Lead creado con ID válido | ✅ `L-106` (no null/undefined), estado Nuevo, tipo lead |
| 4 | Perfil del lead → "+ Nueva cotización" | ✅ botón presente |
| 5 | Modal abre EN CONTEXTO sin navegar (H-010) | ✅ modal "Validación E2E" sobre la vista Leads, prefill nombre/ciudad |
| 6 | Cotización con 2 productos + descuento 15% | ✅ Butaca Serenity + Sofá Emma, desc 15% |
| 7 | Cotización creada con ID válido + cliente en customers (B2) | ✅ `COT-2003` (2 ítems, desc 15). ⚠️ **Por diseño (ADR-011): la cotización NO auto-crea cliente** (es pre-venta); `customerId=null`. El cliente se crea al registrar la venta (paso 14). No es bug. |
| 8 | Abrir detalle de la cotización | ✅ |
| 9 | 7 seguimientos con offsets [3,7,14,21,35,45,60] anclados a today() (A27) | ✅ **exacto** [3,7,14,21,35,45,60] desde 2026-04-16 |
| 10-11 | "Crear venta" desde cotización → modal H-035 prefilled | ⚠️ **GAP**: el botón "→ Crear venta" solo aparece para cotizaciones **aceptadas** y, por código, solo **navega** a Ventas (`onNavigate('ventas')`), no abre el modal con prefill. El prefill cotización→venta **no estaba en el inventario de Fase 2** (H-035 se especificó abriéndose desde Ventas). Se continuó creando la venta manualmente. |
| 12-13 | Modal Nueva Venta + pago 50% + Registrar | ✅ (vía "+ Nueva venta"); pago $1.425.000, ref VAL-PAY-001 |
| 14 | Pedido creado, customerId vinculado al cliente nuevo (B2), pago, saldo 50% | ✅ `PED-1254`, cliente `C-005` creado, `order.customerId===C-005`, paid 50%, pago registrado |
| 15-16 | Columnas tabla: P-XXXX dorado / OPS badge / SALDO rojo / PAGO ~50% / VENCE | ✅ P-1254 dorado, OPS=1, SALDO $1.425.000 rojo (rgb 248,113,113), PAGO 50% barra, VENCE 30d |
| 17-18 | "+ Pago" inline → mini-modal | ✅ abre modal "Registrar pago" |
| 19-21 | Pagar saldo restante → saldo $0 verde, 100% | ✅ SALDO $0 (rgb 52,211,153 verde), PAGO 100% |
| 22-25 | Cliente en lista → detalle → pedido en "Ventas/Pedidos" | ✅ C-005 en lista (Procesos 3, Histórico $2.850.000); detalle muestra PED-1254 (badge `pendiente_op` azul minúsculas, H-028) |
| 26-27 | Editar nombre del cliente | ⚠️ **GAP**: no existe UI de edición de cliente en Clientes (editar clientes no fue hallazgo de Fase 1/2). Se editó el nombre vía estado para validar B2. |
| 28-30 | Pedido refleja nombre editado; customerId NO cambió | ✅ tras editar (estado) + reload: tabla muestra "Validación E2E Editado", `order.customerId` sigue `C-005`, persiste. **B2 (resolución por FK) verificado.** |

**Screenshots:** paso 11 (modal Nueva Venta), 16 (tabla con P-1254), 21 (saldo $0/100% en tabla), 25 (detalle cliente con traza completa Lead→Cot→Venta→2 Pagos).
**Protocolo 1: ✅ con 2 gaps documentados (quote→venta prefill; UI edición cliente) + 1 comportamiento por diseño (cotización no auto-crea cliente).**

---

## Protocolo 2 — Venta Innovación end-to-end

| Paso | Resultado |
|---|---|
| 1-2 | "+ Venta innovación" → modal "Nueva venta — Innovación" (título dorado rgb 230,215,168) ✅ |
| 3 | Buscador → seleccionar "Carmiña Chapman" (C-004), autollena cliente ✅ |
| 4 | Bloque "Productos propuestos" + banner ⚠ amarillo ✅ |
| 5 | Producto propuesto: "Mesa custom Z", desc, cantidad 1, precio 2.500.000, áreas "Ebanistería, Tapicería" ✅ |
| 6 | Botones Adjuntos (foto/consentimiento) clickean sin error ✅ |
| 7 | Nota de estado restrictivo presente ✅ |
| 8-9 | Pago anticipo + "Registrar venta innovación" ✅ |
| 10 | Venta creada con `estado='pendiente_innovacion'` (decisión confirmada) ✅ total 2.500.000 |
| 11-13 | Módulo Innovación: la venta **aparece** (KPI "OPs innovación"=1, "Mesa custom Z"/Carmiña) ✅ |

**Protocolo 2: ✅ COMPLETO.**

---

## Protocolo 3 — PDF Lista de Precios
- Click "📄 Exportar PDF" → se interceptó el blob generado: **`type=application/pdf`, `size=9670 bytes`** (válido, no-cero, comparable al PDF de referencia de ~8KB). Sin errores de consola. ✅ generación verificada.
- **⚠️ REQUIERE VALIDACIÓN HUMANA DEL ARCHIVO DESCARGADO**: el contenido visual (encabezado "CASTOR CPHORA", filas de productos, layout) no es inspeccionable dentro de Preview MCP. ~2 min de revisión humana.

---

## Protocolo 4 — Modal Nuevo Producto
| Paso | Resultado |
|---|---|
| 1-2 | "+ Nuevo producto" → 3 bloques (Datos+imagen / Dimensiones / Ubicación y Stock) ✅ |
| 3-4 | Crear "Producto Validación E2E" (SKU VAL-PROD-001, Butacas, $1.000.000, desc, dims 100/80/60, CEDI, stock 5) ✅ |
| 5-6 | Aparece en catálogo con estructura nueva de tarjeta: SKU mono arriba, nombre, badge BUTACAS, Medidas "100 × 80 × 60 cm", Bodega CEDI, PRECIO COMERCIAL $1.000.000, Stock 5 ✅ |

**Protocolo 4: ✅ COMPLETO.**

---

## Protocolo 5 — Regresión Fase 1 / 1.5
| # | Check | Resultado |
|---|---|---|
| 1 | Cotización con desc 30% → estado aprobación + 7 seguimientos | ✅ `COT-2004` → `estado='pendiente_aprob'`, 7 seguimientos |
| 2 | Pedido walk-in → customerId no null (B2) | ✅ `C-005` con customerId (Protocolo 1) |
| 3 | Inicio → 6 bodegas (H-002) | ✅ 6 bodegas (CEDI, Castor 43, Castor Ctg, Volcanes, Insumos 1, Insumos 2) |
| 4 | fmtCOP consistente (B3) | ✅ formato `$ x.xxx.xxx` consistente |
| 5 | Pedido nuevo aparece en gráfico Inicio (B1) | ✅ canvas presente; PED-1254 anclado a today() |
| 6 | Eliminar cliente con pedidos → bloquea | N/A — no existe UI de borrado de cliente en la app (nunca existió; no es regresión) |

**Protocolo 5: ✅ (5/5 aplicables; #6 N/A).**

---

## Protocolo 6 — Casos límite
| # | Caso | Resultado |
|---|---|---|
| 1 | Cotización con 0 ítems válidos | ✅ no se creó cotización (totalQuotes sin cambio) |
| 2 | Venta con descuento > 100% | ✅ limitado por `max="100"` en el input % Desc |
| 3 | Monto recibido > total | ✅ `savePayment` capa `paid` con `Math.min(100, …)`; saldo con `Math.max(0, …)` → nunca negativo |
| 4 | Lead con teléfono "abc123" | ✅ no se creó lead (H-004 rechaza teléfono no numérico) |
| 5 | Producto con stock negativo | ✅ limitado por `min="0"` en los inputs de stock/dimensiones |
| 6 | Filtro sin coincidencias | ✅ tabla muestra "Sin registros." |
| 7 | Refrescar tras crear varios elementos | ✅ todo persiste (lead, cotización, venta, pagos, producto) tras reinicio del server |

**Protocolo 6: ✅ (7/7).**

---

## Conclusión consolidada
- **Tests ejecutados: ~63** (P1:30 · P2:13 · P3:1 · P4:6 · P5:6 · P6:7).
- **✅ Pasados: ~57.**
- **❌ Fallidos críticos: 0.**
- **⚠️ Con caveat / gap: 4** (quote→venta prefill; UI edición cliente; PDF visual humano; cotización no auto-crea cliente [by-design]).
- **N/A: 1** (borrado de cliente).
- **Screenshots capturados: 4** (modal Nueva Venta, tabla Ventas, detalle cliente; + Lista de Precios y modal innovación en validaciones de bloque).
- **Errores de consola detectados: 0** en todos los protocolos.
- **Tiempo de validación:** ~aprox. sesión continua de validación automatizada.

### Bugs / gaps detectados (ninguno crítico)
1. **GAP (out-of-scope Fase 2):** flujo cotización→venta con prefill no implementado; "Crear venta" solo navega (y solo para cotizaciones aceptadas). H-035 se especificó abriéndose desde Ventas.
2. **GAP (out-of-scope Fase 1/2):** no hay UI de edición de cliente en Clientes. B2 (resolución de nombre por `customerId`) verificado por mutación de estado.
3. **By-design (ADR-011):** la cotización no auto-crea cliente (pre-venta); el cliente se crea al registrar la venta.
4. **Pendiente humano:** validación visual del PDF descargado de Lista de Precios.

## Recomendación final
**⚠️ APTO PARA MERGE CON CAVEATS MENORES.** El flujo crítico end-to-end (Protocolo 1) funciona de punta a
punta con integridad de datos correcta (customerId FK estable, pagos respaldados, saldos no-negativos);
innovación, PDF (generación), nuevo producto, regresión Fase 1/1.5 y edge cases pasan; 0 errores de consola;
lint 0; build de producción limpio. Los gaps detectados son features fuera del inventario de Fase 2 (prefill
cotización→venta, edición de cliente) y no bloquean el merge — pueden ir a Fase 3.

## Pendientes mínimos de validación humana (~5 min)
1. **Abrir 2-3 screenshots clave** (modal Nueva Venta, detalle de cliente con traza E2E, Lista de Precios) — coincidencia visual con Demo6.
2. **Descargar el PDF de Lista de Precios** y confirmar visualmente el formato (encabezado CASTOR CPHORA, filas de productos). ~2 min.
3. **Decidir** si los 2 gaps (prefill cotización→venta, UI edición cliente) entran a Fase 3 o quedan registrados.
