# ADR-010 — Backend: Firebase (Firestore) en lugar de Supabase

**Estado:** Propuesto · Pendiente de aprobación formal del cliente
**Fecha:** 2026-05-25
**Decisores:** Cliente (Castor SAS) + equipo de desarrollo
**Supersede:** Cualquier mención previa de Supabase en documentación heredada del Demo6

## Contexto

El brief original (PDF v1.1, 2026-05-21) especificaba Supabase como backend.
Posterior a esa fecha, el cliente comunicó preferencia por Firebase debido a
USD $300 de crédito Google Cloud disponibles que pueden trasladarse a Firebase.

El proyecto castor-mvp actual no tiene backend conectado — opera 100% sobre
localStorage con datos seed. Esta es la primera decisión real de persistencia.

## Decisión

Adoptar **Firebase** como plataforma de backend, específicamente:
- **Firestore** como base de datos (NoSQL, documental)
- **Firebase Auth** para autenticación
- **Cloud Functions** para lógica que no debe correr cliente
- **Firebase Storage** para soportes (pagos, garantías, marketing)
- **Firebase Hosting** o Vercel para el frontend (a decidir)

## Trade-offs aceptados conscientemente

Firestore es NoSQL y la contabilidad de doble partida fue originalmente diseñada
asumiendo un backend relacional (Postgres). Esto implica los siguientes costos
que el equipo asume:

1. **Sin joins nativos.** Reportes como Libro Auxiliar (movimientos de una cuenta
   con tercero y centro de costo) requieren múltiples lecturas o denormalización.
2. **Agregaciones pesadas en cliente o Cloud Function.** Balance de Prueba,
   Balance General, P&G y Aging implican recorrer journal_lines completo. En
   Postgres son SUM con GROUP BY; en Firestore hay que materializar índices o
   computar en Cloud Function.
3. **Costo por operación.** Firestore cobra por documento leído. Un reporte mal
   diseñado que recorra 10K asientos puede ser costoso. Mitigación: cachear
   reportes en colecciones dedicadas (`balance_cache`, `aging_cache`)
   actualizadas por Cloud Function triggers.
4. **Transacciones de doble partida.** Asegurar que DB=CR al insertar un asiento
   requiere transacciones de Firestore (hasta 500 operaciones) o batched writes.
   Patrón a seguir: una transacción por journalEntry que escribe entry + lines
   en un solo commit atómico.
5. **Ecuación contable A=P+Pat+Util.** En Postgres es un SELECT. En Firestore
   se mantendrá como Cloud Function programada que recalcula y persiste el
   resultado en un documento `accounting_health/current`.
6. **Migración a otro backend.** Si en el futuro se necesita migrar a Postgres
   (por costo o complejidad), el modelo Firestore no se traduce trivialmente.

## Alternativas consideradas

- **Supabase (original):** Mejor ajuste técnico para contabilidad. Descartado por
  decisión comercial del cliente (créditos Google).
- **Firebase Realtime Database:** Más viejo, peor para datos estructurados.
  Descartado.
- **Híbrido (Firebase Auth + Postgres separado):** Mayor complejidad operativa
  para un equipo pequeño. Descartado.

## Modelo de datos Firestore (lineamientos)

A detallarse en ADR-012. Lineamientos preliminares:
- Colección raíz por entidad principal (`customers`, `products`, `orders`, etc.)
- `journalEntries` como colección, con subcolección `lines` por entry
- Denormalizar agresivamente para reportes: cada línea lleva accountCode,
  thirdPartyName, costCenter ya copiados (no joins)
- Colección `aggregations/` con docs precomputados: balance_general,
  balance_prueba, aging_customers, aging_suppliers
- Seguridad por reglas Firestore basadas en custom claims de Auth (rol del usuario)

## Consecuencias

**Positivas:** sin costo de servidor el primer año (créditos), Auth integrado,
Realtime nativo más simple que Supabase, hosting incluido.

**Negativas:** complejidad de reportes contables, costo recurrente potencial si
el volumen crece, lock-in a Google Cloud, equipo debe aprender Firestore.

**Pendientes:**
- ADR-011: identidad de cliente (customerId FK) — *ocupa el número 011*
- ADR-012: modelo de datos Firestore detallado
- ADR-013: estrategia de Cloud Functions para agregaciones contables
- ADR-014: reglas de seguridad por rol
- Validación de costo estimado con el cliente antes de pasar de mockup a producción