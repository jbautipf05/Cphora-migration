# ADR-006: Sin control de acceso por roles (RBAC)

**Status:** Proposed
**Date:** 2026-05-25
**Deciders:** Producto + Tech lead

## Context

El modelo ya contempla un rol: `currentUser = { id, name, role: 'gerencia' }`
(`src/store/AppContext.jsx`). Sin embargo, `role` **no controla el acceso a
nada**: solo se muestra en el Sidebar y se usa como etiqueta de autor en notas,
seguimientos y auditoría (`currentUser?.name`). Cualquier usuario ve y edita
todos los módulos.

Un ERP contable exige **segregación de funciones**: la contadora, el área
comercial y gerencia no deberían tener los mismos permisos (p. ej. postear
asientos, cerrar períodos o ver nómina). El requisito de auth/roles está listado
explícitamente en PROJECT_CONTEXT §13. Esta decisión está además acoplada a
ADR-001 (auth requiere backend) y ADR-005 (permisos por ruta).

## Decision

> _Pendiente._ (Propuesta: definir matriz de roles/permisos y aplicarla a
> navegación y acciones, junto con la introducción de auth/backend.)

## Consequences

> _Pendiente de completar al aceptar la decisión._

## Action Items

1. [ ] _Pendiente._
