# Pendientes para Bloque 2 (Venta / detalle de cotización)

Divergencias detectadas pero **fuera del alcance** del Bloque 1, a resolver en
el bloque del flujo de Venta / detalle de cotización.

| ID | Área | Divergencia | Severidad |
|----|------|-------------|-----------|
| A29 | Detalle de cotización (acciones) | El detalle en React muestra botones **Aceptar / Rechazar / Enviar**; Demo6 usa el `<select>` de estado + botón **PDF** + **"→ Crear venta (autollena…)"** (sólo si `estado==='aceptada' && !hasOrder`). Hay que alinear las acciones del detalle al modelo de Demo6, incluido el botón "→ Crear venta" que abre el modal de venta heredando la cotización (esto es justamente el corazón del Bloque 2). | Media |

> Nota: el quirk del `<select>` de estado mostrando "borrador" cuando el valor es
> `pendiente_aprob` está documentado como **heredado (B2)** en `BUGS_HEREDADOS.md`
> (presente en Demo6 y React) — no se corrige.
