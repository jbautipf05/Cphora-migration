# ADR-001: Persistencia solo en cliente (localStorage), sin backend

**Status:** Accepted (de facto — no documentado hasta ahora)
**Date:** 2026-05-25
**Deciders:** Producto + Tech lead (pendiente de ratificación)

## Context

Toda la data del ERP y de la contabilidad vive en un único objeto en memoria
(`AppContext`) que se serializa a `localStorage` bajo la clave `castor_cphora_v7`,
con un debounce de 250 ms en cada cambio de estado
(`src/lib/persistence.js`, `src/store/AppContext.jsx`).

No existe servidor, API, autenticación ni base de datos. La app es una SPA pura
servida por Vite. La capa de persistencia se diseñó con un patrón *adapter*
(`{ load, save, reset }`) con la intención declarada de poder cambiar a
Firebase/Supabase “sin tocar las vistas”.

Fuerzas en juego:
- **A favor del cliente-solo:** velocidad de prototipado, cero costo de infra,
  demo autocontenida, fidelidad 1:1 con el monolito HTML original.
- **En contra:** el requisito real (PROJECT_CONTEXT §13) es un ERP/CRM contable
  **multiusuario** con backend, auth/roles e integraciones fiscales (DIAN,
  Siigo, WorldOffice, Helisa).

## Decision

Mantener la persistencia **solo en cliente (localStorage)** durante la fase MVP,
detrás de un adaptador intercambiable, difiriendo el backend a una fase posterior.

## Options Considered

### Option A: localStorage + adapter intercambiable (actual)
| Dimensión | Assessment |
|-----------|------------|
| Complejidad | Baja |
| Costo | Cero infra |
| Escalabilidad | **Nula** (un navegador, un dispositivo, ~5 MB) |
| Familiaridad equipo | Alta |

**Pros:** demo autocontenida; sin dependencias externas; iteración rápida de UI.
**Cons:** no soporta concurrencia ni multiusuario; `save` falla en silencio si el
almacenamiento se llena; sin backup ni trazabilidad durable; sin auth.

### Option B: Backend (Supabase) desde el inicio
| Dimensión | Assessment |
|-----------|------------|
| Complejidad | Media-alta |
| Costo | Plan gratuito → de pago |
| Escalabilidad | Alta (Postgres relacional, RLS) |
| Familiaridad equipo | Media |

**Pros:** multiusuario real; SQL encaja con partida doble y reportes; auth y RLS
nativos; auditoría durable.
**Cons:** ralentiza el prototipado; obliga a manejar async/estados de carga ya.

### Option C: Backend mockeado con contrato async desde ya
**Pros:** prepara la arquitectura para el backend sin pagar infra todavía.
**Cons:** trabajo de diseño anticipado; disciplina para no “colarse” a síncrono.

## Trade-off Analysis

El punto crítico **no documentado** es que la abstracción del adapter es
**engañosa**: su interfaz es **síncrona y de estado completo**, mientras que
Firebase/Supabase son **asíncronos, parciales y reactivos**. Por tanto, la
promesa de “cambiar de adapter sin tocar las vistas” **no se sostiene**: la
migración exigirá introducir estados de carga, hidratación parcial,
suscripciones en tiempo real, resolución de conflictos y *optimistic updates* —
ninguno de los cuales existe hoy. En la práctica, la migración tocará casi todas
las vistas y el store.

## Consequences

- **Más fácil hoy:** desarrollo de UI sin fricción de red ni auth.
- **Más difícil mañana:** la migración a backend es un refactor mayor, no un swap
  de adapter; la expectativa de “sin tocar vistas” debe corregirse en la
  planificación.
- **A revisar:** apenas haya un segundo usuario o se exija durabilidad/cierre
  fiscal real, esta decisión deja de ser viable y debe pasar a Option B/C.
- **Riesgo silencioso:** `save()` ignora errores de cuota; con datos crecientes
  puede haber pérdida de datos sin aviso al usuario.

## Action Items

1. [ ] Ratificar explícitamente el alcance “demo/MVP cliente-solo” con Producto.
2. [ ] Reescribir el contrato del adapter como **asíncrono** (`async load/save`)
       aunque la implementación siga siendo localStorage, para no acumular deuda.
3. [ ] Hacer visible el fallo de cuota de `save()` (toast/telemetría) en vez de
       tragarlo en silencio.
4. [ ] Definir el backend objetivo (ver ADR futuro de selección Supabase vs Firebase).
