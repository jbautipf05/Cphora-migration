# ADR-007: Dinero representado como `float` con tolerancia de cuadre

**Status:** Proposed
**Date:** 2026-05-25
**Deciders:** Tech lead + Contabilidad

## Context

Los montos se manejan como números de punto flotante de JS. El motor redondea a
dos decimales (`round = n => Math.round((+n||0)*100)/100`) y valida el cuadre
débito≈crédito con una **tolerancia de 0.5** (`eqMoney(a, b, tol = 0.5)`) en
`src/lib/accountingEngine.js`. Funciona para los seeds actuales, pero la
acumulación de error de coma flotante y una tolerancia de medio peso son un
riesgo en un libro contable que debe cuadrar al centavo. La alternativa estándar
es representar dinero en **enteros (centavos)** o usar una librería decimal.

## Decision

> _Pendiente._ (Propuesta: evaluar enteros-centavos o `decimal.js` para los
> cálculos contables; documentar por qué la tolerancia de 0.5 es o no aceptable.)

## Consequences

> _Pendiente de completar al aceptar la decisión._

## Action Items

1. [ ] _Pendiente._
