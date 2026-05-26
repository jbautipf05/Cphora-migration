# Bugs heredados del HTML (replicar, NO arreglar)

Comportamientos del HTML que parecen bugs. Por regla 2 se **replican igual** en
React y se anotan aquí para discusión posterior. No se "arreglan" sin permiso.

| # | Flujo | Comportamiento en Demo6 | Ubicación | Por qué parece bug |
|---|-------|-------------------------|-----------|--------------------|
| B1 | A | El precio unitario del ítem es `readonly` (no editable), incluso si el vendedor pacta otro precio | HTML 4668 / 5737 | Limita negociación; pero es intencional ("precio desde lista") → replicar |
| B2 | A | En el detalle de cotización, el `<select>` de Estado sólo tiene opciones `borrador/enviada/aceptada/rechazada`. Cuando `estado=pendiente_aprob` el valor no está entre las opciones y el navegador muestra **"borrador"** (engañoso). Verificado presente en **AMBOS** (Demo6 4862 y React) → inherited, no se corrige | HTML 4861-4863 · React Cotizaciones detalle | Confunde: una cotización pendiente de aprobación aparenta "borrador" |

_(se amplía a medida que aparezcan)_
