# ADR-009: Balances contables derivados on-read

**Status:** Proposed
**Date:** 2026-05-25
**Deciders:** Tech lead + Contabilidad

## Context

Todos los saldos y reportes (balance de prueba, balance general, estado de
resultados, KPIs) se **recomputan en cada lectura** recorriendo todas las líneas
del libro (`movimientosPorCuenta`, `buildBalancePrueba`, `getSaldosPorClase` en
`src/lib/accounting.js`). No se persisten saldos ni snapshots; el saldo siempre
se deriva de las líneas. El enfoque es limpio, sin estado redundante y correcto
para el volumen actual, pero es O(líneas × cuentas) por render.

Choca con el requisito de **cierre de período** (PROJECT_CONTEXT §13): un cierre
contable necesita **snapshots inmutables** del saldo al corte, no un recálculo
que cambia si se modifican asientos pasados. También escalará mal cuando el libro
crezca a miles de líneas.

## Decision

> _Pendiente._ (Propuesta: mantener derivación on-read para reportes en caliente,
> pero introducir snapshots de saldo persistidos al cerrar un período.)

## Consequences

> _Pendiente de completar al aceptar la decisión._

## Action Items

1. [ ] _Pendiente._
