# ADR-004: Sin TypeScript en el dominio contable

**Status:** Proposed
**Date:** 2026-05-25
**Deciders:** Tech lead

## Context

El proyecto es JavaScript plano (ESM, sin TypeScript). El dominio contable opera
sobre datos de alta sensibilidad a errores de tipo: códigos PUC mágicos como
`'130505'`/`'240805'`, IDs (`JE-NNNNNN`, `PED-NNNN`), períodos (`'2026-04'`) y
montos. No hay verificación estática que detecte una cuenta inexistente, un
campo mal nombrado en un slice o un contador no inicializado (ver ADR-003, donde
`counters.je` ausente es justo la clase de error que TS atraparía).

El mayor ROI estaría en tipar primero `src/lib/` (motor contable puro) y las
formas de los slices del store.

## Decision

> _Pendiente._ (Propuesta: introducir TypeScript de forma incremental,
> empezando por `src/lib/` y los tipos de estado del `AppContext`.)

## Consequences

> _Pendiente de completar al aceptar la decisión._

## Action Items

1. [ ] _Pendiente._
