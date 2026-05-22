# Castor · Cphora — MVP Frontend (Módulo de Contabilidad)

Migración del prototipo `Castor_Dashboard_Demo6.html` a React + Vite + Tailwind.
Esta primera fase entrega el **módulo de Contabilidad** como un MVP reactivo (estado
en memoria con hooks de React), listo para sustituir los datos simulados por
Supabase en la siguiente fase.

## Stack

- **Vite + React 19** (JavaScript)
- **Tailwind CSS v3** con la paleta del brief: `brand-bg #0A1628`, `panel-bg #152943`,
  `gold-accent #C9A961`, `muted #8A9BB8`, fuente **Inter**.
- Estado global con **Context + `useState`/`useEffect`**, persistido en `localStorage`
  (simula el `save()` del demo).

## Cómo correr

```bash
cd castor-mvp
npm install        # solo la primera vez
npm run dev        # http://localhost:5173
npm run build      # build de producción
```

## Vistas del módulo (sidebar)

1. **Dashboard Contable** — KPIs reactivos (ingresos, egresos, utilidad, bancos),
   ecuación contable con verificación de cuadre y composición de egresos. Filtro por periodo.
2. **Libro Diario** — tabla dinámica de asientos de doble partida, expandibles a líneas,
   con filtro por periodo y búsqueda global.
3. **Balance de Prueba** — 8 columnas (saldo inicial · debe · haber · saldo final) por
   cuenta auxiliar, con verificación visual del cuadre y de la ecuación contable.
4. **Plan PUC** — catálogo jerárquico (clases 1-7), colapsable, con saldos que se agregan
   hacia las cuentas padre. Búsqueda y filtro "solo con saldo".
5. **Nómina y Perfil Tributario** — formulario 100% controlado y funcional. Todos los
   parámetros (`PAYROLL_2026`: SMMLV, auxilio, %, provisiones), el perfil tributario y las
   **cuentas bancarias por defecto (Bancolombia, BBVA, Bold, Lulo Bank)** son editables.
   "Guardar cambios" actualiza el estado en memoria. Incluye preview de nómina que
   **recalcula en vivo** al editar cualquier parámetro.

## Arquitectura (preparada para Supabase)

```
src/
  data/
    pucCatalog.js   # catálogo PUC clases 1-7 (cuentas auxiliares del brief)
    seed.js         # bancos v1.1, perfil tributario, PAYROLL_2026, asientos seed
  lib/
    accounting.js   # motor de cálculo cliente: saldos, balance de prueba,
                    #   getSaldosPorClase (ecuación contable), KPIs, nómina
  store/
    AppContext.jsx  # estado + handlers (saveTaxAndPayroll, CRUD bancos, resetDemo)
  components/        # Sidebar, Header, UI, PeriodFilter, iconos
  views/            # las 5 vistas
```

Los **handlers** (`saveTaxAndPayroll`, `addBankAccount`, `updateBankAccount`,
`removeBankAccount`) y las funciones de `lib/accounting.js` están aislados para que en
la Fase 2 solo se reemplace la fuente de datos (seed → consultas Supabase) y los
handlers escriban vía `upsert`, sin tocar las vistas.

## Nota importante sobre el motor contable

El motor real `castor_accounting.js` (7.259 líneas) **no venía incluido** en el repo —
en `Castor_Dashboard_Demo6.html` sus funciones (`seedPucCatalog`, `getSaldoCuenta`,
`runPayroll`, …) se invocan con `typeof === 'function'` pero su definición vive en ese
archivo aparte. Mientras se obtiene, `lib/accounting.js` reproduce fielmente la lógica
documentada en `CASTOR_1.PDF` (Doc 2): naturaleza de cuentas, saldos por clase, ecuación
`A = P + Patrimonio + Utilidad`, y el cálculo de nómina con exoneración Ley 1607. Cuando
se entregue el motor oficial, se importa como módulo y se reemplazan estas funciones 1:1.
