# Mejoras propuestas (NO ejecutar sin permiso)

Ideas detectadas durante el trabajo de paridad que **no** son divergencias con
el HTML. Se anotan aquí y NO se aplican (regla de disciplina 1 y 6).

| # | Área | Propuesta | Motivo | Riesgo si se aplica |
|---|------|-----------|--------|---------------------|
| M1 | Navegación | Mecanismo `pendingForm` en AppContext para abrir modales preseleccionados al cambiar de vista | El HTML usa funciones globales; React necesita cableado equivalente | Bajo — es cableado de paridad, **sí se aplica** (no es refactor; ver SPEC Paso 4) |
| M2 | Datos seed | Los videos del cliente muestran productos "Sofá Gante"/"Mesa Consola" que no existen en Demo6 | Posible expectativa del cliente | No tocar: Demo6 es la fuente de verdad |

> M1 se ejecuta porque es estrictamente el equivalente al comportamiento del
> HTML, no una mejora arquitectónica. Queda anotado para transparencia.
