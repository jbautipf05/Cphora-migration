# Architecture Decision Records — CASTOR · Cphora

Registro de decisiones arquitectónicas del proyecto. Cada ADR documenta una
decisión **ya tomada en el código** (de facto) o **propuesta**, con su contexto,
opciones y consecuencias, para que futuras sesiones no las re-deriven a ciegas.

> Convención: `ADR-NNN-titulo-kebab.md`. Estados: `Proposed` · `Accepted` ·
> `Deprecated` · `Superseded by ADR-XXX`.

| ADR | Título | Estado | Detalle |
|-----|--------|--------|---------|
| [001](ADR-001-persistencia-solo-cliente.md) | Persistencia solo en cliente (localStorage), sin backend | Accepted (de facto) | Completo |
| [002](ADR-002-estado-global-context-unico.md) | Estado global único en un React Context síncrono | Accepted (de facto) | Completo |
| [003](ADR-003-slices-contables-reseed.md) | Slices contables re-sembrados desde código | Accepted (de facto) ⚠️ contradicción activa | Completo |
| [004](ADR-004-sin-typescript.md) | Sin TypeScript en el dominio contable | Proposed | Plantilla |
| [005](ADR-005-sin-router.md) | Navegación sin router (vista como string) | Proposed | Plantilla |
| [006](ADR-006-sin-rbac.md) | Sin control de acceso por roles (RBAC) | Proposed | Plantilla |
| [007](ADR-007-dinero-como-float.md) | Dinero representado como `float` con tolerancia de cuadre | Proposed | Plantilla |
| [008](ADR-008-migracion-por-storage-key.md) | Migración de esquema vía bump de `STORAGE_KEY` | Proposed | Plantilla |
| [009](ADR-009-balances-derivados-on-read.md) | Balances contables derivados on-read | Proposed | Plantilla |
