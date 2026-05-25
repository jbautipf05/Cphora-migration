# ADR-008: Migración de esquema vía bump de `STORAGE_KEY`

**Status:** Proposed
**Date:** 2026-05-25
**Deciders:** Tech lead

## Context

La estrategia de evolución del esquema de estado es subir la versión de la clave
de localStorage (`STORAGE_KEY = 'castor_cphora_v7'`, `src/lib/persistence.js`).
Al bumpear `v7→v8`, el estado guardado bajo la clave anterior queda huérfano y la
app re-siembra desde cero; además se limpian pasivamente claves `v3`–`v6`.

Esto es simple y evita estados corruptos, pero **no es una migración: es un
descarte**. Cualquier dato del usuario se pierde al cambiar el shape. Aceptable
mientras la persistencia sea efímera/demo (ver ADR-001/003), pero peligroso si
en algún momento hay datos reales en cliente antes del backend.

## Decision

> _Pendiente._ (Propuesta: documentar que el bump es destructivo; cuando exista
> dato real, introducir migraciones versionadas o trasladar la verdad al backend.)

## Consequences

> _Pendiente de completar al aceptar la decisión._

## Action Items

1. [ ] _Pendiente._
