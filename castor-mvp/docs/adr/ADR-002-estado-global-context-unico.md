# ADR-002: Estado global único en un React Context síncrono

**Status:** Accepted (de facto — no documentado hasta ahora)
**Date:** 2026-05-25
**Deciders:** Tech lead (pendiente de ratificación)

## Context

`AppContext` es la *single source of truth* para los ~40 slices del sistema
(comercial, operación, finanzas, admin y contabilidad). El `value` del provider
se recompone con `useMemo(() => ({ ...state, ...actions, setState }), [state, actions])`
(`src/store/AppContext.jsx`). Como `state` es un único objeto, **cualquier**
mutación produce un nuevo `value` y notifica a **todos** los consumidores de
`useApp()`.

Las acciones son un CRUD genérico por colección (`add`, `update`, `remove`,
`setCollection`, `nextId`) más las acciones contables que delegan en el motor
puro. La navegación entre vistas se hace por estado local en `App.jsx`, y cada
vista usa `useMemo` para derivar lo que necesita del estado global.

## Decision

Usar **un solo React Context** como store global de toda la aplicación, sin
librería de estado externa ni segmentación por dominio, confiando en `useMemo`
por vista para acotar el costo de re-render.

## Options Considered

### Option A: Context único + useMemo por vista (actual)
| Dimensión | Assessment |
|-----------|------------|
| Complejidad | Baja |
| Costo | Cero deps |
| Escalabilidad | Media-baja (re-render global en cada cambio) |
| Familiaridad equipo | Alta |

**Pros:** simple, sin dependencias, fácil de razonar para un MVP; las acciones
contables quedan centralizadas y el motor sigue siendo puro/testeable.
**Cons:** cada mutación re-renderiza todos los consumidores; no hay selectores;
no escala a edición concurrente ni a datos remotos reactivos.

### Option B: Store con selectores (Zustand / Jotai)
**Pros:** suscripción granular; re-render solo de lo que cambió; ergonómico.
**Cons:** nueva dependencia; reescritura del acceso al estado en las vistas.

### Option C: useReducer + split de contexts por dominio
**Pros:** sin deps; aísla re-renders por dominio; reducer testeable.
**Cons:** más *boilerplate*; coordinación entre contexts.

### Option D: React Query / TanStack Query (cuando exista backend)
**Pros:** caché, estados de carga, invalidación y sync server-state nativos.
**Cons:** solo aplica con backend; cambia el modelo mental del estado.

## Trade-off Analysis

Para el tamaño actual (seeds pequeños, un usuario), el re-render global es
imperceptible y `useMemo` por vista lo mitiga. El problema aparece en dos frentes
futuros: (1) vistas grandes y datos crecientes harán notable el re-render
amplio; (2) el modelo **síncrono de estado-completo** es incompatible con el
*server-state* asíncrono que traerá el backend (ver ADR-001). La decisión es
correcta para hoy pero tiene fecha de caducidad ligada a esos dos hitos.

## Consequences

- **Más fácil hoy:** un solo lugar para leer/mutar; cero dependencias.
- **Más difícil mañana:** introducir granularidad obligará a migrar el acceso al
  estado en muchas vistas; convivir con server-state pedirá React Query o similar.
- **A revisar:** cuando se mida un re-render problemático o al introducir backend.

## Action Items

1. [ ] Documentar el patrón de acceso (`useApp()` + `useMemo` por vista) para
       que las vistas nuevas no rompan la mitigación de re-render.
2. [ ] Al introducir backend, evaluar React Query para el server-state y dejar
       el Context solo para UI/estado local (ver ADR-001).
3. [ ] Si surge un cuello de botella de render antes del backend, evaluar
       Option B/C de forma acotada.
