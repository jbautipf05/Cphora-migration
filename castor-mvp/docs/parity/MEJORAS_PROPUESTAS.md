# Mejoras propuestas (NO ejecutar sin permiso)

Ideas detectadas durante el trabajo de paridad que **no** son divergencias con
el HTML. Se anotan aquí y NO se aplican (regla de disciplina 1 y 6).

| # | Área | Propuesta | Motivo | Riesgo si se aplica |
|---|------|-----------|--------|---------------------|
| M1 | Navegación | Mecanismo `pendingForm` en AppContext para abrir modales preseleccionados al cambiar de vista | El HTML usa funciones globales; React necesita cableado equivalente | Bajo — es cableado de paridad, **sí se aplica** (no es refactor; ver SPEC Paso 4) |
| M2 | Datos seed | Los videos del cliente muestran productos "Sofá Gante"/"Mesa Consola" que no existen en Demo6 | Posible expectativa del cliente | No tocar: Demo6 es la fuente de verdad |
| M3 (A26) | Estética modal | Título del modal "Nueva cotización": Demo6 usa `<h2>` font-weight 700; React usa `<h3>` font-weight 600 (color `rgb(230,215,168)` y size 18px coinciden) | Cosmético menor; el título se ve levemente menos bold | Decisión del usuario: **NO corregir** (Bloque 1) |

> M1 se ejecuta porque es estrictamente el equivalente al comportamiento del
> HTML, no una mejora arquitectónica. Queda anotado para transparencia.

---

## Mejoras declaradas por el usuario (mantener React, NO replicar Demo6)

Provienen del `INVENTARIO_FASE1.md`. Son decisiones intencionales: React mejora
sobre Demo6 y se mantiene.

| # | Área | Decisión |
|---|------|----------|
| MEJORA-001 (H-007) | Ficha de lead — layout de datos de contacto | React tiene mejor división visual que Demo6 → **mantener React**, no replicar Demo6 |
| MEJORA-002 (H-029) | Tabla de Cotizaciones con campos extra | React muestra estado, fecha de creación y vigencia en la tabla → **mantener** (mejora sobre Demo6) |
