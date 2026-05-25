# ADR-005: Navegación sin router (vista como string en estado)

**Status:** Proposed
**Date:** 2026-05-25
**Deciders:** Tech lead

## Context

La app no usa react-router. La vista activa es un string en el estado local de
`App.jsx` (`const [view, setView] = useState('inicio')`) y el Sidebar muta ese
estado. Consecuencias: no hay URLs profundas ni enlaces compartibles, el botón
“atrás” del navegador no funciona como navegación, y no se puede recargar en una
vista concreta. Es aceptable para un demo de pantalla única, pero conviene que
sea una decisión consciente y no inercia del monolito HTML original.

## Decision

> _Pendiente._ (Propuesta: evaluar react-router cuando se requieran deep-links,
> permisos por ruta —ver ADR-006— o estados de vista compartibles.)

## Consequences

> _Pendiente de completar al aceptar la decisión._

## Action Items

1. [ ] _Pendiente._
