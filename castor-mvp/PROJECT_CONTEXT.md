# CASTOR MVP — Contexto del Proyecto

> Documento de contexto técnico para continuar el desarrollo en nuevas sesiones.
> Refleja el **estado funcional real** del código (no un plan ni un ideal).
> Última actualización: 2026-05-25. Rama: `main`.

---

## 1. Resumen en una línea

ERP + módulo de Contabilidad para **Castor SAS** (muebles, Colombia), migrado desde un
prototipo monolítico HTML (`Castor_Dashboard_Demo6.html`) a una SPA **React + Vite + Tailwind**.
Datos en memoria/seed con persistencia en `localStorage`. **Sin backend** (aún).

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| UI | React | ^19.2.6 |
| DOM | react-dom | ^19.2.6 |
| Build/dev | Vite | ^8.0.12 |
| Estilos | Tailwind CSS | ^3.4.19 |
| Gráficos | Chart.js | ^4.5.1 |
| PostCSS | postcss + autoprefixer | 8.5 / 10.5 |
| Lint | eslint + plugins react-hooks / react-refresh | ^10.3.0 |
| Gestor de paquetes | **pnpm** (pnpm-lock.yaml; NO usar npm) | 11.2.2 |

- ESM (`"type": "module"`). Sin TypeScript. Sin router (navegación por estado interno).
- Fuente: Inter (Google Fonts). Idioma/locale: `es-CO`. Tema oscuro con acentos dorados.

---

## 3. Cómo correr el proyecto

```bash
cd castor-mvp
pnpm install          # (o: corepack pnpm install)
pnpm dev              # http://localhost:5173
pnpm build            # build de producción a dist/
pnpm preview          # sirve el build
pnpm lint             # eslint
```

> El `README.md` aún dice `npm` — está **desactualizado**, el proyecto usa **pnpm**.
> Si `pnpm` no está en PATH, usar `corepack pnpm <cmd>`.

---

## 4. Arquitectura actual

- **SPA de una sola página** sin react-router. La vista activa se guarda como string
  en estado de `App.jsx` (`view`). El sidebar cambia ese estado.
- **Estado global único** vía React Context (`AppContext`) — *single source of truth*
  para TODOS los módulos (comercial, operación, finanzas, admin y contabilidad).
- **Persistencia** vía adaptador `localStorage` (patrón intercambiable a Firebase/Supabase).
- **Motor contable** = funciones puras en `src/lib/` (sin estado propio); las vistas
  llaman a las acciones del contexto, que aplican el resultado al estado inmutable.
- **Seed/hidratación**: al cargar, se construye el estado base desde seeds de código y
  se mezcla con lo persistido. Los slices contables estáticos (PUC + asientos semilla)
  **siempre** se recargan desde código (no se persisten); el resto sí se persiste.

Árbol de providers (`src/main.jsx`):
```
<StrictMode>
  <AppProvider>        // estado global + acciones
    <ToastProvider>    // notificaciones toast
      <App />
```

---

## 5. Estructura de carpetas importante

```
castor-mvp/
├── index.html                 # entry; title "Castor · Cphora — Contabilidad"
├── package.json               # scripts + deps (pnpm)
├── vite.config.js             # solo plugin react
├── tailwind.config.js         # paleta brand.* (navy + gold), fuente Inter
├── postcss.config.js          # tailwind + autoprefixer
├── eslint.config.js           # recommended + react-hooks + react-refresh
└── src/
    ├── main.jsx               # render + providers
    ├── App.jsx                # mapa VIEWS{id->componente}, layout
    ├── nav.js                 # estructura del menú + breadcrumbs (NAV, pageMeta)
    ├── index.css              # clases clonadas del demo (.panel, .kpi-card, .badge-*, .btn-gold…)
    ├── store/
    │   └── AppContext.jsx     # estado global + todas las acciones + hidratación
    ├── lib/
    │   ├── accounting.js      # funciones de LECTURA contable (reportes/KPIs)
    │   ├── accountingEngine.js# motor de ESCRITURA de partida doble (postJournalEntry…)
    │   ├── persistence.js     # adaptador localStorage (STORAGE_KEY = 'castor_cphora_v7')
    │   └── format.js          # fmtCOP, fmtDate, DEMO_TODAY='2026-04-16', addDays, daysBetween…
    ├── data/
    │   ├── erpSeed.js         # seeds ERP (~90+ registros)
    │   ├── seed.js            # seeds contables (bancos, PUC posts, periodos, nómina, tax)
    │   └── pucCatalog.js      # 91 cuentas PUC (clases 1–7) + índice PUC_BY_CODE
    ├── components/            # UI compartida (ver §8)
    └── views/                 # 29 vistas (17 ERP + 12 contabilidad) (ver §6)
```

Archivos de **referencia** en la raíz del repo (un nivel arriba de `castor-mvp/`),
**NO importados por la app**: `castor_accounting.js` (~359 KB, motor original monolito),
`Castor_Dashboard_Demo6.html` (~609 KB, prototipo UI), `CASTOR_1.PDF` (spec).

---

## 6. Funcionalidades que YA existen y funcionan

### Contabilidad (motor nativo en React, NO depende de castor_accounting.js)
- **Motor de partida doble** (`accountingEngine.js`): valida débito≈crédito (tolerancia 0.5),
  idempotencia por `source/sourceId`, cuentas activas/auxiliares, terceros requeridos,
  bloqueo de períodos cerrados (salvo `force`). Funciones: `postJournalEntry`, `postManualEntry`,
  `postSale`, `postCustomerCollection`, `postSupplyPurchase`, `postSupplierPayment`,
  `postPayroll`, `reverseJournalEntry`, `applyJournalResult`.
- **Vistas de solo lectura (funcionando):** Dashboard Contable, Libro Diario (asientos
  expandibles + búsqueda + filtro período), Libro Mayor (por cuenta, movimientos expandibles),
  Balance de Prueba (saldo inicial+mov+final, cuadre), Balance General (ecuación A=P+Pat+Util),
  Estado de Resultados (Ing−Costos−Gastos), Auxiliar IVA (generado/descontable/neto).
- **Vistas interactivas (CRUD/escritura):**
  - **Asientos Manuales**: formulario con cuadre en tiempo real → `postManualEntry`.
  - **Plan PUC**: árbol colapsable + búsqueda + saldos acumulados.
  - **Centros de Costo**: alta/edición/borrado (protegido si está en uso).
  - **Perfil Tributario** y **Configuración Nómina**: editan tax profile, parámetros de
    nómina (con preview en vivo de `calcPayrollPreview`) y cuentas bancarias.
- **Seed contable**: 12 asientos balanceados (apertura, ventas con/sin IVA, compra de
  insumos con retención, consumo de materia prima, cobro, nómina, depreciación, pago a
  proveedor) + 91 cuentas PUC + 4 períodos fiscales (ene–mar cerrados, abr abierto) +
  6 centros de costo + 4 bancos + perfil tributario + parámetros de nómina 2026.

### Integración ERP → Contabilidad (verificado en código)
- **Ventas** contabiliza automáticamente:
  - Crear pedido (factura/remisión) → `postSale()` → CxR DR / Ingresos CR / IVA CR.
  - Registrar pago → `postCustomerCollection()` → Banco DR / CxR CR.
  - El asiento aparece en Libro Diario/Mayor en tiempo real; muestra toast con el ID del asiento.
- Las funciones `postSupplyPurchase`, `postSupplierPayment`, `postPayroll` existen y están
  probadas vía seed, pero **aún no están cableadas** a botones en Almacén/Tesorería/Nómina
  (solo se disparan hoy desde seed). `reverseJournalEntry` no tiene botón en UI.

### Módulos ERP (todos renderizan sin errores; consola limpia)
- **CRUD completo / workflow funcional:** Leads (panel detalle + seguimientos + recontacto),
  Cotizaciones (items, descuento, seguimientos, "PDF" como descarga .txt), Ventas (+contab.),
  Postventa (completar hitos, registrar contacto, NPS), Marketing (assets, descarga stub),
  Almacén MP (insumos/proveedores/OC/movimientos con CRUD), Garantías, Auditoría
  (Crear OP / Rechazar / Editar + "Crear pedido stock Castor"), Innovación (productos en
  desarrollo, ciclo de vida, alta con BOM, ficha master), RRHH (alta empleado).
- **Workflows parciales:** Producción (kanban por área + tabla + heatmap, mover de área),
  Inventario Terminado (tarjetas por bodega, traslados), Despacho (marcar despachado).
- **Solo lectura:** Inicio (KPIs + 2 gráficos), Clientes (panel detalle de 7 secciones),
  Lista de Precios (catálogo con stock por bodega).

### Gráficos (Chart.js)
- **Inicio**: barras (ventas) + doughnut (leads por clasificación).
- **Tesorería**: barras horizontales (saldos por banco) + línea (flujo de ingresos).

---

## 7. Flujo principal de la aplicación

```
Lead → Cotización → Pedido (Ventas) ──(postSale)──► Asiento de venta
                         │
                         ▼
   Auditoría: verificar pedido → Crear OP (o Rechazar/Editar)
                         │
                         ▼
   Producción (kanban por áreas) → Inventario Terminado → Despacho
                         │
   Pago (Ventas) ──(postCustomerCollection)──► Asiento de cobro
                         │
                         ▼
        Postventa (hitos 7d/6m/12m, NPS) · Garantías

Producto nuevo: Innovación (alta + BOM) → Auditoría (verificar) →
                estado "Activo" → aparece en Lista de Precios → vendible

Compras: Almacén MP (proveedores, OC, recepción, consumo de insumos)
Tesorería: cuentas bancarias, pagos entrantes/salientes
Contabilidad: refleja todo en Libro Diario/Mayor/Balances/IVA
```

Estados de pedido típicos: `pendiente_op → produccion → listo/op_cerrada → entregado/facturado`.

---

## 8. Componentes críticos (`src/components/`)

| Archivo | Exporta | Rol |
|---------|---------|-----|
| `ui.jsx` | `KpiCard`, `Badge`, `Chip` + mapas de variantes (`TIPO_LEAD`, `TIPO_VENTA`, `TIPO_DOC`, `MEDIO_VENTA`, `PDV_VARIANT`) | Tarjetas KPI (degradado .kpi-card), chips/badges de color |
| `widgets.jsx` | `DataTable` (orden por columnas), `Toolbar`, `SearchBox`, `SelectFilter`, `EstadoBadge`, `ProgressBar`, `SlidePanel`, `Tabs`, `ClearFiltersButton`, `fmtDate` | Tabla genérica + filtros + panel lateral de detalle |
| `Modal.jsx` | `Modal` | Modal centrado (title/subtitle/footer, tamaños sm/md/lg/xl) |
| `Chart.jsx` | `Chart` | Wrapper declarativo de Chart.js (bar/line/doughnut) |
| `Toast.jsx` | `ToastProvider`, `useToast()` | Notificaciones toast |
| `Sidebar.jsx` | `Sidebar` | Menú con grupos + submenú Contabilidad |
| `Header.jsx` | `Header` | Breadcrumb, búsqueda, "+ Nuevo", campana |
| `Notifications.jsx` | `Notifications` | Lista de notificaciones |
| `form.jsx` | `Field`, `Input`, `Select`, `Textarea`, `FormGrid` | Inputs y grillas de formulario |
| `icons.jsx` | ~26 íconos SVG (`IconBank`, `IconUsers`, `IconShield`, `IconBox`, `IconCheck`, `IconDoc`, `IconBulb`…) | Íconos reutilizables |
| `PeriodFilter.jsx` | `PeriodFilter` | Selector de período fiscal (contabilidad) |

`AppContext.jsx` y `accountingEngine.js` son los dos archivos más críticos del sistema.

---

## 9. Estado del store (AppContext) — qué contiene

**Slices contables (estáticos):** `pucAccounts`, `journalEntries`, `journalLines`,
`fiscalPeriods`, `costCenters`.
**Contables (editables/persistidos):** `bankAccounts`, `companyTaxProfile`, `payrollParams`.
**Comercial:** `leads`, `customers`, `quotes`, `orders`, `invoices`, `invoiceRequests`.
**Operación:** `products`, `warehouses`, `finishedStock`, `stockMoves`, `suppliers`,
`supplies`, `purchaseOrders`, `supplyReceipts`, `supplyIssues`, `dispatchRequests`.
**Finanzas:** `payments`, `outgoingPayments`.
**Admin/otros:** `employees`, `warranties`, `postSales`, `innovation`, `audits`,
`marketingAssets`, `notifications`, `counters`, `currentUser`.

**Acciones (`useApp()`):** `add`, `addLast`, `update`, `remove`, `setCollection`,
`nextId(prefix, counterKey, pad)`, `pushNotification`, `resetDemo`, `setState`,
`saveTaxAndPayroll`, `addBankAccount`/`updateBankAccount`/`removeBankAccount`, y las
contables (`postJournalEntry`, `postManualEntry`, `postSale`, `postCustomerCollection`,
`postSupplyPurchase`, `postSupplierPayment`, `postPayroll`, `reverseJournalEntry`).

**Counters:** `{ lead, cot, ped, op:5004, gar, pag, out, emp, inn, mkt, sup, insumo, oc, prod, dsp, fac, rem }`.

---

## 10. APIs / integraciones externas

- **Ninguna API remota.** No hay backend, REST, GraphQL ni autenticación.
- **Google Fonts** (Inter) por CDN en `index.html`.
- **Persistencia local:** `localStorage`, clave `castor_cphora_v7` (limpia v3–v6 al cargar).
- Adaptador de persistencia diseñado para cambiarse a Firebase/Supabase sin tocar vistas.

---

## 11. Estado del UI/UX

- Tema oscuro fiel al prototipo HTML: paleta `brand.*` (navy `#0A1628`/`#152943` + gold `#C9A961`).
- Clases base clonadas 1:1 en `index.css` (`.panel`, `.kpi-card` con degradado y hover-lift,
  `.btn-gold`, `.badge-danger/warn/ok/info/gold`, `.input-field`, `.table-row` con hover dorado,
  `.slide-panel`, `.warehouse-pill`, `.product-photo`).
- KPIs homogéneos (degradado + ícono SVG con borde teñido del color de acento).
- Hover de filas dorado homogéneo en todas las tablas (vía `DataTable` y tablas propias).
- Modales para CRUD, paneles laterales (SlidePanel) para detalle, toasts para feedback.
- Animación `fadeIn` al cambiar de vista. Responsive con grids Tailwind.

---

## 12. Problemas conocidos / inconsistencias

- **README desactualizado**: indica `npm` (usar pnpm) y dice que la contabilidad "no está
  incluida aún" — ya está implementada de forma nativa.
- **Comentario obsoleto** en `AppContext.jsx` (~línea 50): "La Contabilidad queda fuera de
  alcance hasta tener castor_accounting.js" — ya no aplica.
- **"PDF" de Cotizaciones y "descarga" de Marketing** son stubs (generan/descargan .txt, no PDF real).
- `castor_accounting.js` (raíz) quedó **commiteado** pero no se usa; conviene moverlo a
  `/referencia` o documentarlo como tal para evitar confusión.
- Bundle ~700 KB (warning de Vite por chunk > 500 KB; sin code-splitting).
- Sin tests automatizados.

---

## 13. Qué falta por implementar

- **Cablear el resto del motor contable a la UI:** botones para `postSupplyPurchase`
  (recepción de OC en Almacén), `postSupplierPayment` (Tesorería salientes),
  `postPayroll` (corrida de nómina) y `reverseJournalEntry` (anular asiento).
- **Backend/persistencia real** (Firebase/Supabase) + autenticación y roles.
- **Exportación** de reportes (CSV/Excel/PDF real) y libros; hubs Siigo/WorldOffice/Helisa.
- **Cierre de períodos** desde UI, notas crédito/débito, activos fijos, retenciones detalladas.
- **Depreciación** generada desde UI (hoy solo en seed).
- Code-splitting para reducir el bundle. Tests.

---

## 14. Decisiones técnicas importantes

1. **Reimplementación, no port literal**: el monolito `castor_accounting.js` usa `window.state`
   global + `renderPage()`/innerHTML; no es importable en React. La lógica se reescribió en
   módulos ES puros (`accounting.js` lectura, `accountingEngine.js` escritura).
2. **Single source of truth** en `AppContext` para toda la app (no un store por módulo).
3. **Slices contables estáticos siempre desde código** (no se persisten) para garantizar
   catálogo/asientos consistentes; el resto del estado sí se persiste.
4. **STORAGE_KEY versionada** (`v7`): subir la versión invalida estado viejo/corrupto y
   re-siembra; limpia claves anteriores. Subirla al cambiar el shape del estado.
5. **`DEMO_TODAY = '2026-04-16'`** fija la "fecha de hoy" para escenarios reproducibles.
6. **Paleta centralizada** en `tailwind.config.js` (`brand.*`); clases del demo en `index.css`.
7. **pnpm** como gestor (migrado desde npm).

---

## 15. Riesgos / deuda técnica

- **Acoplamiento por estado único**: todo en un Context; cambios masivos re-renderizan amplio
  (mitigado con `useMemo` por vista). A futuro, considerar selectores/segmentación.
- **Sin tipos (JS plano)**: códigos de cuenta, IDs y períodos sin type-safety.
- **Persistencia frágil**: localStorage puede llenarse/corromperse; mitigado con key versionada.
- **Lógica de negocio duplicada** entre el HTML de referencia y el código React: si cambia la
  spec, hay que sincronizar manualmente.
- **Engine parcialmente cableado**: riesgo de divergencia entre lo que el ERP registra y lo que
  la contabilidad refleja (hoy solo ventas/cobros/manuales generan asientos en vivo).
- `castor_accounting.js` commiteado en el repo aumenta el peso y puede confundir.

---

## 16. Referencias rápidas para nuevas sesiones

- **Gestor de paquetes:** pnpm (no npm).
- **Vista nueva:** crear en `src/views/`, registrar en `src/App.jsx` (mapa VIEWS) y `src/nav.js`.
- **Estado nuevo:** añadir slice en `buildInitialState()` de `AppContext.jsx`; si cambia el
  shape, subir `STORAGE_KEY` en `persistence.js`.
- **Contabilizar algo nuevo:** usar/extender `accountingEngine.js` y exponer la acción en
  `AppContext`; llamar desde la vista (ver patrón en `Ventas.jsx` líneas ~97 y ~128).
- **Estilos:** preferir las clases del demo en `index.css` y la paleta `brand.*`.
- **Repo:** github.com/jbautipf05/Cphora-migration · rama `main` · el proyecto vive en `castor-mvp/`.
