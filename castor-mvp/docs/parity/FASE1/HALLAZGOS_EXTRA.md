# Hallazgos extra (descubiertos durante Fase 1 — NO corregir sin OK)

Cosas observadas comparando Demo6 ↔ React que NO están en los 7 P0 declarados.

| # | Origen | Observación | Estado |
|---|--------|-------------|--------|
| EX-01 | H-001 | "+ Nuevo": Demo6 usa modal vs React dropdown | ✅ Resuelto — el usuario pidió modal; H-001 ahora usa Modal "Crear nuevo". |
| EX-02 | H-001 | Las opciones del menú "Nuevo" deben **abrir el formulario** (no sólo navegar) | ✅ Resuelto — 6 opciones abren el form vía `pendingForm`; 3 navegan (gaps, opción A). |
| EX-03 | H-001 | **No existe** un formulario standalone de **Pago** en React (el pago es por pedido). Demo6 tiene `openPaymentForm`. Hoy "💰 Pago" navega a Ventas. | ⏳ Pendiente fase posterior (construir form). |
| EX-04 | H-001 | **No existe** form de **registrar unidad terminada** en React (sólo traslados). Demo6 tiene `openFinishedForm`. Hoy "✓ Terminado" navega a Inventario. | ⏳ Pendiente fase posterior. |
| EX-05 | H-001 | **No existe** modal de **alta de cuenta bancaria**; se administran inline en Configuración Nómina. Demo6 tiene `openBankForm`. Hoy "🏦 Cuenta bancaria" navega a config-nomina. | ⏳ Pendiente fase posterior. |
| EX-06 | H-010 | "✎ Editar cotización" (detalle) abre el modal prellenado, pero `save()` **crea una cotización nueva** en vez de editar la existente (siempre usa `nextId`). **Pre-existente** (no introducido por esta tarea). Replicado tal cual; no corregido. | ⏳ Decidir aparte (¿implementar edición real?). |
