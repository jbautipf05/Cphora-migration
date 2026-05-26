# Bugs heredados del HTML (replicar, NO arreglar)

Comportamientos del HTML que parecen bugs. Por regla 2 se **replican igual** en
React y se anotan aquí para discusión posterior. No se "arreglan" sin permiso.

| # | Flujo | Comportamiento en Demo6 | Ubicación | Por qué parece bug |
|---|-------|-------------------------|-----------|--------------------|
| B1 | A | El precio unitario del ítem es `readonly` (no editable), incluso si el vendedor pacta otro precio | HTML 4668 / 5737 | Limita negociación; pero es intencional ("precio desde lista") → replicar |

_(se amplía a medida que aparezcan)_
