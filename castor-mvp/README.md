# CASTOR · Cphora — MVP

ERP + módulo de **Contabilidad** para **Castor SAS** (fábrica de muebles premium,
Colombia). SPA en React + Vite migrada desde un prototipo monolítico HTML. Datos
en memoria con persistencia en `localStorage`; **sin backend** (aún).

> Estado: **MVP funcional**. La contabilidad (partida doble, libros, balances,
> nómina) está implementada de forma nativa en React. Ver el alcance real y la
> deuda conocida en [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) y
> [docs/adr/](docs/adr/).

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19 |
| Build/dev | Vite 8 |
| Estilos | Tailwind CSS 3.4 (paleta `brand.*`, navy + gold; fuente Inter) |
| Gráficos | Chart.js 4 |
| Lint | ESLint 10 (react-hooks, react-refresh) |
| Gestor de paquetes | **pnpm** (NO npm) |

JavaScript plano (sin TypeScript · ver [ADR-004](docs/adr/ADR-004-sin-typescript.md)),
ESM, sin router (la vista es un string en `App.jsx` · ver
[ADR-005](docs/adr/ADR-005-sin-router.md)). Locale `es-CO`.

## Correr en local

```bash
cd castor-mvp
pnpm install        # o: corepack pnpm install  (si pnpm no está en PATH)
pnpm dev            # http://localhost:5173
pnpm build          # build de producción → dist/  (bundle ~719 KB / ~199 KB gzip)
pnpm preview        # sirve el build
pnpm lint           # eslint
```

> Si `pnpm` no está en el PATH, anteponer `corepack` (p. ej. `corepack pnpm dev`).

## Correr tests

**Aún no hay tests ni framework de testing instalado.** El plan de pruebas
(Vitest + Testing Library, foco en `src/lib/`) está definido pero no ejecutado.
Una vez configurado, los comandos previstos serán:

```bash
pnpm test           # vitest (watch)        ← pendiente de configurar
pnpm coverage       # vitest run --coverage ← pendiente de configurar
```

Prioridad de cobertura: `src/lib/` (motor contable puro) primero. Ver el plan y
el porqué en [docs/adr/](docs/adr/) y el resumen de arquitectura.

## Estructura de carpetas

```
castor-mvp/
├── index.html              # entry HTML (carga Inter por CDN)
├── vite.config.js          # config Vite (solo plugin react)
├── tailwind.config.js      # paleta brand.* + fuente Inter
├── eslint.config.js        # reglas eslint
├── PROJECT_CONTEXT.md      # contexto técnico extenso (estado real del código)
├── docs/                   # documentación de proyecto (este baseline)
│   ├── adr/                # Architecture Decision Records (001–009)
│   ├── ARCHITECTURE.md     # vista de alto nivel + flujos + diagramas
│   └── RUNBOOK.md          # operación: build, deploy, rollback, incidentes
└── src/
    ├── main.jsx            # render raíz + árbol de providers
    ├── App.jsx             # mapa de vistas (VIEWS) + layout
    ├── nav.js              # estructura del menú, breadcrumbs y metadatos de página
    ├── index.css           # clases base clonadas del prototipo (.panel, .kpi-card…)
    ├── store/              # estado global (AppContext) + acciones + hidratación
    ├── lib/                # lógica pura: motor contable, reportes, persistencia, formato
    ├── data/               # seeds (ERP + contable) y catálogo PUC
    ├── components/         # UI compartida (tablas, modales, formularios, iconos)
    └── views/              # 29 vistas (17 ERP + 12 contabilidad)
```

`src/lib/` tiene su propio [README](src/lib/README.md) con el contrato y los
*gotchas* del motor contable (lectura obligatoria antes de tocarlo).

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — diseño del sistema y flujos críticos.
- [docs/adr/](docs/adr/) — decisiones arquitectónicas (por qué las cosas son como son).
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — operación y respuesta a incidentes.
- [src/lib/README.md](src/lib/README.md) — motor contable: entradas/salidas y riesgos.
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — contexto técnico detallado y deuda conocida.

## Repositorio

`github.com/jbautipf05/Cphora-migration` · rama `main` · el proyecto vive en `castor-mvp/`.
