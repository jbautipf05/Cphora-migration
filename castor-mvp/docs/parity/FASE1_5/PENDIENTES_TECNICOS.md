# Pendientes técnicos (Fase 1.5)

Hallazgos de la revisión técnica que **NO** se abordan en Fase 1.5 (solo B1/B3/B2).
Quedan registrados para retomarlos más adelante. Detalle completo de cada uno en
[`../FASE2/REVISION_TECNICA_PRE_FASE2.md`](../FASE2/REVISION_TECNICA_PRE_FASE2.md).

## Code-review (CRs) diferidos
| # | Archivo:línea | Resumen | Sev | Estado |
|---|---------------|---------|-----|--------|
| CR-01 | `NuevaCotizacionModal.jsx:191-194` | `leads.find` lee estado stale tras `add` (benigno hoy) | 🟡 | pendiente |
| CR-02 | `NuevaCotizacionModal.jsx:30-31`, `quotePdf.js:9-10` | `subtotal`/`total` duplicados ×3 y en componente → mover a `lib/` (≈ B4) | 🟠 | pendiente |
| CR-03 | `NuevaCotizacionModal.jsx:153-159` | Validación del modal asimétrica vs UI (no exige Asesor/Canal marcados con *) | 🟡 | pendiente |
| CR-04 | `NuevaCotizacionModal.jsx:58-81 / 104-121` | `buildFromLead` y `applyLead` duplican mapeo de productos | 🟢 | pendiente |
| CR-05 | `Leads.jsx:64,706` + modal | `onBlur` con `setTimeout` sin cleanup (setState tras unmount) | 🟢 | pendiente |
| CR-07 | `Cotizaciones.jsx:78-83` | Efecto con deps incompletas (lee `sel`, dep `[selId]`) | 🟢 | pendiente |
| CR-08 | `Cotizaciones.jsx:33-34,124,137-139` | `aceptadasSinPedido` O(filas×pedidos) + totales recomputados | 🟢 | pendiente |
| CR-09 | `AppContext.jsx:150-158` | `nextId` retornaba desde el updater de `setState` (anti-patrón) | 🟠 | ✅ **resuelto en B2** (espejo síncrono en `useRef`) |
| CR-10 | `NuevaCotizacionModal.jsx:188` | Campo muerto `notasSeguimiento` (las notas usan `notes_arr`) | 🟢 | pendiente |
| CR-11 | `Cotizaciones.jsx:50-53` | `downloadPDF` sin `try/catch` (error de jsPDF sin feedback) | 🟢 | pendiente |
| CR-12 | `Header.jsx:14-24` + consumidores | `pendingForm` colgaría si se agregan forms sin consumidor (no aplica hoy) | 🟢 | pendiente |

**Resuelto en Fase 1.5:** CR-06 (Leads `createdAt` con `nowISO`) → corregido por **B1**.

## Otros diferidos (ya documentados, no re-documentar)
- **TD-26 … TD-32**: en el documento de revisión técnica (§2.3). TD-26 (fmtCOP) resuelto por **B3**;
  **TD-29** (relaciones por nombre) resuelto por **B2**; **TD-30** (`nextId` anti-patrón) resuelto por **B2**.
- **10 tests propuestos** (§3 del documento): se escriben en **Fase 6**, no ahora.
- **ADR preventivo "fecha única"**: puede esperar (solo se escribe ahora el ADR-011 de identidad de cliente).
- **B4** (extraer `subtotal`/`total` a `lib/`): recomendado, no bloqueante; pendiente.
