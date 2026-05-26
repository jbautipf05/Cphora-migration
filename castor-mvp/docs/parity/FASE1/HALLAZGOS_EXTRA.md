# Hallazgos extra (descubiertos durante Fase 1 — NO corregir sin OK)

Cosas observadas comparando Demo6 ↔ React que NO están en los 7 P0 declarados.
Documentadas para decisión del usuario; no se tocan por iniciativa propia.

| # | Origen | Observación | Severidad estimada |
|---|--------|-------------|--------------------|
| EX-01 | H-001 | El botón "+ Nuevo" en Demo6 es un **modal centrado** ("Crear nuevo"); en React es un **dropdown**. Se alinearon las 9 opciones (orden/labels), pero el form-factor difiere. | Baja (cosmético/UX) |
| EX-02 | H-001 | En Demo6 cada opción del menú "Nuevo" **abre el formulario** correspondiente (openLeadForm, openQuoteForm, …); en React **navega al módulo**. Aplica también a las 4 opciones que ya existían. Hacerlo "abrir en contexto" requiere cablear `pendingForm` en ~8 vistas. Se relaciona con H-010/H-011. | Media (UX, fricción) |
