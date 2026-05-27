# HANDOFF — sesión 2026-05-26 (cierre Fase 2.5.1 + arranque Fase 2.5.2)

Documento de transferencia de contexto. Resume el estado al final de esta sesión para retomar en limpio.

---

## 1. DÓNDE ESTAMOS AHORA

- **Rama actual:** `claude/parity-fase-2-5-2` (worktree `…/.claude/worktrees/reverent-germain-305c21`).
- **`main` = `5249aaf`** (Fase 2.5.1 ya integrada). La rama nueva sale de ahí.
- **Working tree:** limpio (solo `.claude/launch.json` untracked = config local de Preview MCP, NO se commitea).
- **Sync:** rama y `origin` en 0/0.
- **`gh` AUTENTICADO** (cuenta `OmarCifuentes`, keyring, persistente).
- **Próximo paso:** arrancar **REG-H035-06 (Bloque B-básico)** cuando el usuario dé OK + responda 2 puntos abiertos (abajo).

## 2. QUÉ SE HIZO ESTA SESIÓN

1. **Auditoría pre-Fase 3** de lo cerrado en Fase 2.5 (EX-F2-04 + EX-F2-03, hechos antes, en main).
   → `docs/parity/FASE3/EVALUACION_PRE_INICIO.md`. Veredicto: bien hecho; EX-F2-03 decisión-A (precio de
   lista) **verificada fiel a Demo6**. Hallazgo de peso: gap §5.2.
2. **Fase 2.5.1 = EX-F2-05** (gap §5.2): en `Ventas.jsx submitSale`, **un `setState` atómico**
   (customers+quotes+leads) que en TODA conversión cotización→venta con `leadId` enlaza cliente↔lead
   (`customer.linkedLeadId` + `lead.linkedCustomerId`) y avanza `lead.estado='Compro'` (+ paso-4
   `quote.customerId`). Fiel a Demo6 `saveSale` (6004/6015/6180), con enum del seed React (`'Compro'`, no
   `'ganado'`). Se agregó `setState` al destructuring de `useApp()` en Ventas.
   - Validación 5/5 E2E (Preview MCP, 0 errores consola): `docs/parity/FASE3/VALIDACION_EX_F2_05.md`,
     reporte `docs/parity/FASE2_5_1/H-EX-F2-05.md`.
   - **Auditoría de cierre** (submitSale vs saveSale Demo6) → 2 hallazgos nuevos en
     `docs/parity/FASE2/HALLAZGOS_EXTRA.md`:
     - **EX-F2-06** (baja): `quote.pedidoId/orderId` no se setean en la conversión (sin consumidores en React).
     - **EX-F2-07 (importante para Fase 3 visual):** la venta NO reserva `finishedStock` ni registra
       `stockMoves` para ítems de stock; Demo6 `saveSale:6126-6145` sí. Evaluar al portar Almacén/Despacho.
3. **`gh` autenticado** con token fine-grained. **El token tiene Contents R/W pero NO Pull requests** →
   `gh pr create` falla. ⚠️ El token se pegó en texto plano en el chat → rotar si se comparte el transcript.
4. **Merge de 2.5.1 a main por PUSH DIRECTO (rebase, sin PR)** → `c877281..5249aaf`. Se inició
   `castor-mvp/CHANGELOG.md`. Rama `claude/parity-fase-3` borrada (local+remota). (OJO: PR#4 fue el merge
   de Fase 2.5 anterior, NO de 2.5.1.)
5. **Rama `claude/parity-fase-2-5-2`** creada desde main + `docs/INVENTARIO_FASE_2_5_2.md` commiteado.

## 3. PROTOCOLO PERMANENTE (actualizado esta sesión)

- **Cierre de fase = push directo a main por rebase, SIN PR**, tras validación humana del usuario. PR solo
  on-demand (cambios sensibles/refactors grandes; el usuario avisa). Flujo: rebase sobre `origin/main` →
  `git push origin <rama>:main` → borrar rama → crear rama siguiente desde main → entrada en `CHANGELOG.md`.
- **`castor-mvp/CHANGELOG.md`**: una entrada por cierre de fase (historial centralizado sin PRs).
- Resto de reglas siguen: 1 hallazgo/commit/push; reporte por hallazgo; auto-validación por bloque +
  pausas humanas; commit co-authored; nunca crear ramas con nombre autogenerado (renombrar a
  `claude/parity-faseN`).

## 4. TAREA ACTUAL — Fase 2.5.2 (12 regresiones del modal Nueva Venta H-035)

`docs/INVENTARIO_FASE_2_5_2.md` — **REG-H035-01..12** en `src/components/NuevaVentaModal.jsx`. Son
regresiones de Fase 2 (la auto-validación verificó existencia de campos sin validar funcionalidad).

**Orden de ejecución (refinado por dependencia: REG-07 condicional necesita los campos de A):**
1. **Bloque B-básico** → REG-06 (cliente: 11 obligatorios + formato tel/email), REG-08 (control general),
   REG-09 (pago), parte NO-condicional de REG-07 (≥1 ítem, producto, qty>0, precio>0). → **PAUSA humana.**
2. **Bloque A** (condicionales Stock/Producción) → REG-01 (color madera/metal/tejido), REG-02 (buscador
   telas), REG-04 (stock+ubicaciones), REG-03 (ruta), REG-05 (comentario — verificar, parece ya existir),
   + parte condicional de REG-07. → **PAUSA humana.**
3. **Bloque C** (estético) → REG-10 (dropdown con precio+stock), REG-11 (alineación), REG-12 (botón ×).

**HALLAZGO CLAVE: NO hace falta extender el seed.** Todo mapea a datos existentes (ver §5).

## 5. DATOS Y REFERENCIAS TÉCNICAS (verificadas)

**Seed React (`src/data/erpSeed.js`) — todo lo necesario ya existe:**
- Productos (`PRODUCTS`): tienen `areas` con el MISMO vocabulario que Demo6 → driver de condicionales:
  `'Preparación y pintura'`→Color Madera (p3,p4,p7); `'Pintura electrostática'`→Color Metal (p2,p6,p8);
  `'Tapicería'`→Tela (p1,p2,p3,p5,p6,p7); `'Tejido'`→color tejido (p5). También `price`, `stock`.
- Telas: `SUPPLIES` con `category:'Telas'` (IN-04 'Tela lino premium' $48.000/Mts, IN-05 'Boucle marfil'
  $62.000/Mts) — fuente del buscador (Demo6 filtra `supplies` por `category Telas`).
- `FINISHED_STOCK` (productId, warehouseId, qty, status) + `WAREHOUSES` (id→name, color) → indicador de stock.

**Demo6 (`Castor_Dashboard_Demo6.html`) — referencias para portar:**
- `COLOR_MADERA` (11 opciones) y `COLOR_METAL` (5) = arrays CONSTANTES, líneas **5521-5522** (no son seed).
- `renderSaleAcabados()` ~**5847-5865**: lógica condicional color/tela/tejido por `areas`.
- `onSaleItemProductChange()` ~**5809-5835**: indicador de stock ("✓ Disponible N uds · Ubicaciones: …")
  y ruta de proceso (`⚙ Bajo pedido · áreas: {areas.join(' → ')}`).
- `addSaleItemRow()` ~**5711**: fila de ítem; dropdown producto, precio readonly, %desc, comentario
  (placeholder "Ej: preferencias, detalles especiales, alto del respaldo, etc.").
- `saveSale()` **5975-6185**: orden de validaciones; reserva de stock ítems stock **6126-6145** (EX-F2-07).

**Patrones React reutilizables:**
- Validación estilo H-004: `src/views/Leads.jsx:172-182` (teléfono sin letras + ≥7 dígitos; objeto `errs`
  + bloqueo de submit + inline). Email: regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- Buscador autocompletado: `ProductPicker` en `Leads.jsx:48-87` (input + dropdown filtrado) → base para el
  buscador de telas.
- Primitivos de form: `src/components/form.jsx` (`Field`, `Input`, `Select`, `Textarea`, `FormGrid`).
- Estado actual del modal: item shape `{ productId, qty, disc, tipo:'produccion'|'stock', comment }`
  (`NuevaVentaModal.jsx:27`); dropdown label `{p.name} — {fmtCOP(p.price)}` (`:307`); submit sin
  validación real (`:115-117`); textarea comentario YA existe (`:327-333`); botón × YA existe (`:300`).

## 6. PUNTOS ABIERTOS (responder antes de codear)

1. **REG-H035-09 — ¿pago obligatorio?** Demo6 exige monto/método/cuenta/referencia/**soporte adjunto**;
   React hoy permite venta sin pago. ¿Romper esa flexibilidad por paridad? (recomendado: **sí**).
2. **Bloque A — ¿incluir 'Tejido' (4º acabado)?** Demo6 muestra selector de color para `areas.includes('Tejido')`
   (lo usa p5 Pouf Luna). El inventario solo lista madera/metal/tela. (recomendado: **sí**, mismo mecanismo).

REG-H035-06 (validaciones Cliente) NO depende de estos → se puede arrancar ya.

## 7. ENTORNO / GOTCHAS OPERATIVOS

- **Preview MCP:** `.claude/launch.json` en la RAÍZ del worktree, node-directo a vite, `cwd` absoluto a
  `…/castor-mvp` (sin esto, Vite arranca sin CSS). Reset de datos: `localStorage.removeItem('castor_cphora_v7')`
  + reload (NO el botón "Reset Data Demo" → `confirm()` cuelga). **Inputs controlados: setear UN campo por
  eval** (varios en un eval puede dejar el último valor pegado en otro campo — bug visto en Test E).
  Click y lectura en evals SEPARADOS. Native value setter + eventos `input`+`change`.
- **Lint/build:** `node node_modules/eslint/bin/eslint.js <archivo>` y `node node_modules/vite/bin/vite.js build`.
  `corepack pnpm install` regenera `pnpm-workspace.yaml` placeholder → borrarlo, no commitear.
- **gh:** autenticado; para PRs habría que agregar permiso "Pull requests" al token (hoy no lo tiene).

## 8. DEUDA / DIFERIDO

- **EX-F2-06, EX-F2-07** en `HALLAZGOS_EXTRA.md` (no tocar en 2.5.2). **EX-F2-07 = P0 al iniciar Fase 3 visual**
  (Almacén/Materia Prima/Innovación/Producción) — la venta debe reservar stock.
- Rama vieja `claude/parity-fase-2` (local+remota) sigue existiendo → candidata a limpieza (confirmar 0
  commits únicos vs main).
- Tras Fase 2.5.2 → Fase 3 visual en rama `claude/parity-fase-3-visual` desde main; esperar inventario.

## 9. DOCS CLAVE PARA RETOMAR
`docs/INVENTARIO_FASE_2_5_2.md` · `docs/parity/FASE2/HALLAZGOS_EXTRA.md` · `docs/parity/FASE3/EVALUACION_PRE_INICIO.md` ·
`docs/parity/FASE3/VALIDACION_EX_F2_05.md` · `docs/parity/FASE2_5_1/H-EX-F2-05.md` · `CHANGELOG.md` ·
memoria del proyecto (`castor-parity-mission.md`).
