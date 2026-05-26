# CIERRE FASE 1 — Inicio · Leads · Cotizaciones (P0)

Todos los hallazgos **P0** del `INVENTARIO_FASE1.md` resueltos, verificados en vivo
(Preview MCP) y pusheados a `claude/xenodochial-jackson-f556b5`.

## Resumen ejecutivo
Se cerró el flujo comercial Lead → Cotización del dashboard: el Inicio muestra todas
las bodegas, el botón "+ Nuevo" abre un modal con 9 accesos rápidos que abren el
formulario correspondiente, el form de Lead quedó completo (radio Tipo, institucional
con Contacto, editor de productos de interés con autocompletado y valor auto) y con
validaciones inline, la cotización se abre **en contexto** desde el lead sin navegar,
el form de cotización quedó a paridad con Demo6, y la descarga de PDF ahora genera un
**PDF real con el diseño Castor** (jsPDF).

## Hallazgos P0 (orden de ataque)
| # | Hallazgo | Estado | Commit |
|---|----------|--------|--------|
| H-002 | Inicio: tarjeta Inventario terminado muestra las 6 bodegas | ✅ | 65dd265 |
| H-001 | Botón "+ Nuevo" → modal "Crear nuevo" con 9 opciones que abren el form | ✅ | 82e3de9 / b2bdfd4 |
| H-010 | "+ Nueva cotización" desde Lead abre el modal **en contexto** (sin navegar) | ✅ | 0f3dafb |
| H-004 | Validaciones del form de Lead (obligatorios + teléfono) con errores inline | ✅ | 30f8ddf |
| H-003 | Modal de Lead completo (Tipo radio, Contacto, productos + valor auto) | ✅ | 6168a0e |
| H-011 | Re-auditoría del form de cotización vs Demo6 (+ ancho `max-w-3xl`) | ✅ | a4eaf58 |
| H-015 | PDF de cotización con diseño Castor (jsPDF, port de Demo6) | ✅ | 7e7a492 |

Detalle por hallazgo en `H-0XX.md`. Pausas obligatorias (H-010, H-003) validadas
por el usuario.

## Cambios estructurales notables
- **`pendingForm`** (AppContext): intent transversal para abrir modales en contexto
  (usado por header y Leads → Cotizaciones).
- **`components/NuevaCotizacionModal.jsx`**: modal de cotización extraído y reutilizable
  (Cotizaciones + Leads).
- **`components/Header.jsx`**: dropdown → modal "Crear nuevo".
- **`lib/quotePdf.js`** + dependencia **`jspdf@4.2.1`** (vía pnpm).
- **`Modal.jsx`**: nuevo tamaño `3xl`.

## Decisiones del usuario aplicadas
- A26 (título h2/700 vs h3/600): NO corregir → `MEJORAS_PROPUESTAS.md` (M3).
- A28 (counter seed), A29 (acciones detalle cotización): no tocar / `PENDIENTES_BLOQUE2.md`.
- Menú "+ Nuevo": modal + abrir formularios; gaps (Pago/Terminado/Cuenta bancaria) navegan.
- Productos de interés: buscador con autocompletado (no `<select>`).

## Pendientes (fuera de los P0 de Fase 1)
- **P1:** H-005 (autocompletar leads anteriores), H-009 (orden notas), H-012 (filtro
  Asesor en Cotizaciones), H-013 (descuentos rápidos), H-014 ("Quitar lead" limpia).
- **P2:** H-006 (dato secundario en ficha), H-008 (ícono "Contactar nuevamente").
- **Hallazgos extra (`HALLAZGOS_EXTRA.md`):** EX-03/04/05 (forms faltantes: Pago suelto,
  Registrar terminado, Cuenta bancaria), EX-06 ("Editar cotización" duplica), EX-07
  (lead no genera 6 seguimientos al crear).

## Validación manual recomendada
- **H-015:** abrir un PDF descargado y compararlo con `Cotizacion_COT-2001_Laura_Mendoza.pdf`
  (no se pudo rasterizar en el entorno; emojis no renderizan en jsPDF, igual que Demo6).
- Repaso visual general de los 3 módulos en el dev server.
