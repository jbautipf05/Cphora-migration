# HANDOFF — sesión 2026-05-26 (cierre Fase 2.5.2 + EX-F2-07 + arranque Fase 3)

Documento de transferencia de contexto. Resume el estado al final de esta sesión para retomar en limpio.

---

## 1. DÓNDE ESTAMOS AHORA

- **Rama actual:** `claude/parity-fase-3-visual` (tip `c45b535`), tracking `origin`, 0/0.
- **`main` = `5a6b8d7`** (Fase 2.5.2 completa integrada por push directo/FF, sin PR). `origin/main` igual.
- **Working tree:** `vite.config.js` **modificado SIN commitear** (cambio del USUARIO: `server.allowedHosts`
  para ngrok — es suyo, NO commitear ni revertir; se arrastra entre ramas). `.claude/worktrees/` untracked
  (dirs huérfanos inocuos, ver §7).
- **`gh` AUTENTICADO** (cuenta `OmarCifuentes`, keyring, persistente). Token tiene Contents R/W pero NO
  Pull requests → se integra por **push directo a main** (no PR). ⚠️ El usuario dijo que rotaría el token.
- **Próximo paso:** **ESPERAR** el inventario de **Fase 3 visual**, que el usuario pasa **MÓDULO POR
  MÓDULO**: primero **ALMACÉN**, luego MATERIA PRIMA, etc. **NO arrancar nada de Fase 3 hasta recibir el
  módulo explícitamente.**

## 2. QUÉ SE HIZO ESTA SESIÓN

1. **Fase 2.5.2 COMPLETA y en main** (`5a6b8d7`): 12 regresiones del modal Nueva Venta (`NuevaVentaModal.jsx`),
   REG-H035-06..12. Validaciones por bloque (cliente 11 campos, control general, **pago obligatorio completo
   monto≥1 fiel a Demo6 — sin venta a crédito**, ítems ≥1 válido) + condicionales Stock/Producción (indicador
   de stock con ubicaciones, ruta de proceso, **acabados** madera/metal/tejido + buscador de telas, validación
   condicional) + UX (dropdown precio/stock+filtrado, alineación, botón ×). Cierre: `docs/parity/FASE_2_5_2/
   CIERRE_FASE_2_5_2.md` + entrada CHANGELOG. Recomendación ✅ APTO → push directo a main.
2. **EX-F2-07 RESUELTO** (`c45b535`, en `claude/parity-fase-3-visual`): la venta ahora reserva `finishedStock`
   (FIFO, `reservado`+`orderId`/`pedidoId`, split en parcial), guard de suficiencia previo, baja
   `products[].stock` y registra `stockMoves` `'salida_venta'`, en `setState` atómico. Innovación/producción
   no tocan inventario. Validado con **test node 17/17** + lint + build. Detalle `docs/parity/FASE3/EX-F2-07.md`.
3. **Housekeeping git:** se trabajó en el REPO PRINCIPAL (no worktrees). Ramas zombie borradas
   (`claude/parity-fase-2` local+remota; `claude/hardcore-pike-3fb8dd` local). El usuario borró
   `origin/claude/parity-fase-2-5-2` él mismo. Rama `claude/parity-fase-3-visual` creada desde main.
4. **HALLAZGOS_EXTRA** actualizado: EX-F2-07 ✅ RESUELTO; nuevos EX-F2-08 y EX-F2-09 (ver §8).

## 3. PROTOCOLO PERMANENTE — AUTOMATIZACIÓN TOTAL (cambio clave de esta sesión)

El usuario delegó validación completa. **Claude:** implementa todos los hallazgos del inventario;
auto-valida con todo lo disponible (preview si se puede, lint, build, grep vs Demo6, test node);
**commits granulares + push automático**; **avanza entre bloques SIN pedir aprobación**; genera reporte de
cierre de fase; **decide push directo a main por rebase/FF al cierre si la recomendación es ✅**.
**Usuario:** pasa inventarios (por módulo en Fase 3); aprueba merge SOLO al cierre de FASE; valida ~30 min
cada 3-5 días. **SOLO PAUSAR en 4 casos:** (1) decisión técnica ambigua que requiere criterio humano;
(2) bug crítico de integridad irresoluble; (3) alcance que se expande >4h; (4) inventario inconsistente con
el código real. **NO molestar por:** cierre de bloque, hallazgo extra menor (→ HALLAZGOS_EXTRA y seguir),
decisión donde Demo6 da respuesta clara (decidir + documentar), limitación de herramienta (improvisar,
NO preguntar cómo validar). **Reporte de cierre `CIERRE_FASE_X.md`** (lo único que lee el usuario) con 8
secciones: resumen, tabla hallazgos, auto-validación, decisiones, extras, riesgos, recomendación ✅/⚠️/❌,
pendientes. Si ✅ → push directo a main + crear rama siguiente. Si ⚠️/❌ → pedir input ANTES de mergear.
(Detalle completo en memoria `castor-parity-mission.md`.)

## 4. TAREA ACTUAL — Fase 3 visual (esperando inventario por módulos)

Módulos visuales nuevos a portar (orden del usuario): **ALMACÉN → MATERIA PRIMA → …** El usuario arma el
inventario `.md` de cada módulo y lo pasa. EX-F2-07 (pre-trabajo) ya está hecho. **P0 al tocar inventario:**
ya está la reserva de stock en la venta (EX-F2-07) — Almacén/Inventario/Despacho ya pueden depender de
`finishedStock`/`stockMoves` actualizados por ventas nuevas.

## 5. DATOS Y REFERENCIAS TÉCNICAS (verificadas esta sesión)

- **Estado global** (`src/store/AppContext.jsx`): `useApp()` expone `{...state, add, update, nextId,
  setState, postSale, postCustomerCollection, …}`. `setState((s)=>next)` es functional + persiste a
  localStorage (debounce 250ms). `nextId(prefix, counterKey, pad)` usa `countersRef` síncrono (robusto a
  varias llamadas/handler). `counters` NO tiene `mov`; los ids runtime usan `uid(prefix)` de `lib/format.js`
  (`uid` = `${p}-${ts36}${rand}`). Slices clave: `finishedStock`, `stockMoves`, `products`, `warehouses`,
  `supplies`, `orders`, `customers`, `quotes`, `leads`, `payments`.
- **Seed (`src/data/erpSeed.js`):** `FINISHED_STOCK` = `{id,productId,orderId,warehouseId,qty,status,
  readyDate,notes}`, status `disponible|reservado|en_transito`. `STOCK_MOVES` = `{id,productId|supplyId,
  type,qty,date,reason,by,warehouseId}`, types `entrada|salida` (+ runtime `traslado` y ahora `salida_venta`).
  `PRODUCTS` tienen `stock` (numérico, denormalizado; la disponibilidad real se computa de `finishedStock`
  disponible) y `areas` (driver de acabados). `WAREHOUSES` = `{id,code,name,color,…}` (badges usan `code`+`color`).
- **Consumidores de stock:** `InventarioTerminado.jsx` (KPIs + traslado, ÚNICO lugar que mutaba
  `finishedStock`/`stockMoves` antes de EX-F2-07), `Inicio.jsx` (KPI qty + rollup bodega), `ListaPrecios.jsx`
  (stockByProduct + crea finishedStock al alta de producto), `AlmacenMP.jsx` (tabla stockMoves),
  `NuevaVentaModal.jsx` (disponibilidad REG-04/10), `Despacho.jsx` (solo dispatchRequests, NO toca stock).
- **`submitSale` (`Ventas.jsx`):** setState atómico cliente/quote/lead (EX-F2-05) → `add('orders')` →
  `add('payments')` si pago → **setState atómico de reserva de stock (EX-F2-07)** → postSale/postCustomerCollection.
- **Demo6 refs (saveSale):** validación cliente `5982-5985`; control `5641-5643`; pago `5649-5664`; ítems
  `6090-6102`; **reserva stock `6103-6106` (guard) + `6126-6145`**; acabados `renderSaleAcabados:5841-5868`,
  constantes COLOR_* `5521-5523`; indicador/ruta `onSaleItemProductChange:5818-5839`; dropdown stock
  `onSaleItemTypeChange:5805-5813`; telas `filterTelaSearch/pickTela:5893-5908`.

## 6. PUNTOS ABIERTOS / DECISIONES PENDIENTES CON EL USUARIO

- **Política de pago estricta (REG-09):** monto≥1, sin venta a crédito. **Confirmar con el cliente Castor
  SAS** si aceptan ventas sin anticipo; si sí → excepción en fase posterior.
- **`stockMoves.type='salida_venta'`:** vocabulario de Demo6 (React usaba entrada/salida/traslado). Al portar
  Almacén/Inventario quizá convenga un label para ese tipo (cosmético).

## 7. ENTORNO / GOTCHAS OPERATIVOS

- **NO usar worktrees** (regla permanente del usuario). Trabajar SIEMPRE en el repo principal
  `C:/Users/omita/Desktop/Trabajo/CASTOR/Cphora-migration/castor-mvp` (el usuario lo abrevia
  "C:/Cphora-migration/castor-mvp" — es el MISMO). Si el harness asigna un worktree autogenerado, hacer
  `git checkout <rama>` en el repo principal; si requiere algo especial, pedir permiso.
- **El cwd del shell del harness se resetea** a `…/.claude/worktrees/hardcore-pike-3fb8dd` tras cada Bash
  ("Shell cwd was reset to …"). Usar `cd "…/Cphora-migration/castor-mvp"` + rutas absolutas. Hay 2 dirs
  huérfanos en `.claude/worktrees/` (deregistrados de git, `git worktree list` solo muestra el repo
  principal) — inocuos; borrarlos en frío si molestan.
- **⚠️ Preview MCP INOPERANTE toda esta sesión.** El harness ancla la raíz de Preview al worktree huérfano
  dañado y rechaza `cwd` fuera de esa raíz → no sirve el repo principal. Tras sincronizar `index.html`+`src`
  completos y reiniciar, React NO monta (root vacío, sin errores de consola, screenshot con timeout).
  **Mientras no se resuelva: validar con lint + build + revisión de código + grep vs Demo6 + test node**
  (NO pedir al usuario cómo validar — improvisar). Si se logra reparar (servir el repo principal), hacerlo.
- **Build/lint:** `node node_modules/eslint/bin/eslint.js <archivo>` y `node node_modules/vite/bin/vite.js
  build`. Un worktree/clon fresco NO trae deps: `corepack pnpm install` (regenera `pnpm-workspace.yaml`
  placeholder → borrarlo, NO commitear; faltaba `jspdf` y rompía el build → install lo arregla).
- **Demo6 HTML** está en la RAÍZ del repo: `…/Cphora-migration/Castor_Dashboard_Demo6.html` (NO dentro de
  castor-mvp/). Reset de datos del preview: `localStorage.removeItem('castor_cphora_v7')` + reload (NUNCA el
  botón "Reset Data Demo" → `confirm()` cuelga).

## 8. DEUDA / DIFERIDO (en HALLAZGOS_EXTRA.md)

- **EX-F2-06** (baja): `quote.pedidoId/orderId` no se setean en conversión quote→venta; sin consumidores.
- **EX-F2-08** (media): `submitSale` no persiste `item.acabados` en `order.acabados` (Demo6 sí). **P0 al
  portar Producción/Auditoría** que leen acabados. Los acabados ya se capturan en el modal (REG-01/02).
- **EX-F2-09** (baja): botón "+" de alta rápida de tela (`quickAddTela`) no portado; posible EX post-demo.
- **Divergencia EX-F2-07** (documentada, no es deuda): registro consumido entero conserva `qty` con
  `reservado` (Demo6 lo deja en `qty:0`) por los KPIs de inventario en vivo de React.

## 9. DOCS CLAVE PARA RETOMAR
`docs/parity/FASE_2_5_2/CIERRE_FASE_2_5_2.md` (+ `REG-H035-*.md`) · `docs/parity/FASE3/EX-F2-07.md` ·
`docs/parity/FASE2/HALLAZGOS_EXTRA.md` · `castor-mvp/CHANGELOG.md` · memoria del proyecto
(`castor-parity-mission.md` — incluye el protocolo de automatización total y la regla no-worktrees).
