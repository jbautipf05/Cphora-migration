# RRHH-01 — Expandir formulario y modelo de Empleado · ✅ RESUELTO

**Ubicación:** `src/views/RRHH.jsx` + `src/data/erpSeed.js`. Espejo de Demo6 `openEmployeeForm`
(8853) / `saveEmployee` (8882) / `RRHH_AREAS` (8848) / `RRHH_SEXOS` (8851).

El alta de empleado capturaba ~10 campos; ahora maneja los **21** de contratación legal
colombiana.

## Implementado
- **Form "Nuevo empleado"** (modal `size="lg"`, `FormGrid cols={3}`): se agregaron Sexo*,
  Dirección, Ciudad, Fecha de nacimiento, Fecha de retiro, ARL, Fondo de pensión, EPS (Salud),
  Caja de compensación, Bono, Lugar de trabajo; Email movido al final en fila ancho completo.
  Relabels: "Cédula"→**"CC *"**, "Salario (COP)"→**"Salario *"**; botón **"Guardar"→"Crear"**.
- **`empty()`** inicializa los 21 campos; **`save()`** persiste TODO vía `{ id, ...form }` (con
  `salario`/`bono` normalizados a número). Fecha de ingreso autopuesta con `today()`.
- **Gate de obligatorios (\*)**: Nombre, CC, Cargo, Área, Sexo, Celular, Fecha de ingreso, Tipo
  de contrato, Estado, Salario → toast `warn` si falta (patrón de los otros modales).
- **Tabla**: "Cargo"→**"Rol"**; **badge de área con color** (`AREA_COLORS`).
- **Seed `EMPLOYEES`**: los 7 empleados extendidos al shape completo (cc, celular, sexo,
  dirección, ciudad, fechas, tipoContrato, ARL/EPS/pensión/caja reales de ejemplo, bono, lugar
  de trabajo) → coherencia entre sembrados y creados.

## DECISIONES SIN INPUT DEL CLIENTE (curación sobre Demo6)
1. **Áreas (13):** se portó `RRHH_AREAS` pero con **ortografía CURADA** consistente con el resto
   de la app: `Almacen`→**`Almacén`** (con tilde) y `Pintura electroestatica`→**`Pintura
   electrostática`**. El resto se mantiene. *Nota:* esta lista de áreas de RRHH es **distinta de
   `PROD_AREAS`** (áreas de Producción) — no se tocó esa.
2. **Sexo:** Demo6 traía `['Hombre','Mujer','Therian']` (placeholder jocoso). Se curó a
   **`['Hombre','Mujer','Otro']`**.

## No tocado
`ConfiguracionNomina.jsx` (sobre-cumple), el buscador/filtro de RRHH, `PROD_AREAS`, `submitSale`,
`vite.config.js`.

## Validación
Test node **17/17** (empty() = 21 campos; gate bloquea por cada obligatorio; salario no numérico
bloquea; `{id,...form}` persiste todos los campos nuevos) + `eslint` `RRHH.jsx`/`erpSeed.js` **0**
+ `vite build` **OK**. No probado en vivo (Preview MCP roto).
