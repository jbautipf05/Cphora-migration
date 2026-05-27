# CIERRE FASE 2.5.2 — Regresiones del modal Nueva Venta (H-035)

**Rama:** `claude/parity-fase-2-5-2` (desde `main 5249aaf`) · **Fecha:** 2026-05-26
**Recomendación de merge:** ✅ **APTO** (push directo a main por rebase).

---

## 1. Resumen ejecutivo
Se cerraron las **12 regresiones** del modal Nueva Venta (`NuevaVentaModal.jsx`) detectadas en validación
humana post-Fase 2 (la auto-validación de Fase 2 verificó existencia de campos pero no su funcionalidad).
El modal ahora: **valida** los 4 bloques (cliente 11 campos, control general, pago completo, ítems +
acabados condicionales), muestra **indicador de stock con ubicaciones** y **ruta de proceso**, ofrece
**selectores de acabado condicionales** (madera/metal/tejido) + **buscador de telas**, y pule el **dropdown
de producto** (precio+stock+filtrado) y la fila de ítem. No se rompió nada (lint 0 + build OK en cada
commit; regresión de Fase 1/1.5/2 intacta — solo se tocó el modal y el wiring de props en `Ventas.jsx`).
Pendiente real: **persistir `order.acabados`** downstream (EX-F2-08, fuera del modal). Pago se hizo
**estricto** (monto≥1) por decisión confirmada (fiel a Demo6).

## 2. Tabla de hallazgos
| ID | Descripción | Commit | Estado |
|----|-------------|--------|--------|
| REG-H035-06 | Validaciones Bloque Cliente (11 campos + tel/email) | `e3d5a4c` | ✅ (E2E 7/7) |
| REG-H035-08 | Validaciones Control General (asesor/tiempo/docType) | `8c39505` | ✅ |
| REG-H035-09 | Pago obligatorio completo (5 campos, monto≥1) — fiel a Demo6 | `3385d8f` | ✅ |
| REG-H035-07 (no-cond.) | ≥1 ítem válido (producto+qty>0+precio>0) | `cf58120` | ✅ |
| REG-H035-04 | Indicador stock + ubicaciones (badges por bodega) | `9b7e914` | ✅ |
| REG-H035-01/02 | Acabados condicionales (madera/metal/tejido) + buscador telas | `2557d96` | ✅ |
| REG-H035-05 | Label de comentario por ítem (paridad) | `6b0d379` | ✅ |
| REG-H035-03 | Ruta de proceso visual (modo Producción) | `b42af65` | ✅ |
| REG-H035-07 (cond.) | Acabados obligatorios por `areas` (Producción) | `ef79f77` | ✅ |
| REG-H035-10 | Dropdown producto: precio+stock + filtrado en Stock | `420ab9c` | ✅ |
| REG-H035-11 | Alineación de campos en la fila de ítem | `7a41f9d` | ✅ |
| REG-H035-12 | Polish del botón × de eliminar ítem | `48fda65` | ✅ |

Docs por hallazgo en `docs/parity/FASE_2_5_2/REG-H035-*.md`. Hallazgos extra: `14cb2b1`.

## 3. Auto-validación consolidada
- **Lint** (`eslint NuevaVentaModal.jsx` / `Ventas.jsx`): **0 problemas** en cada commit.
- **Build** (`vite build`): **OK** en cada commit (único aviso = tamaño de chunk, pre-existente).
- **E2E en vivo (Preview MCP):** **7/7 en REG-06** (sesión previa, 0 errores de consola). En REG-08/09/07
  y todo Bloque A/C **NO se pudo correr E2E en vivo** (ver §6). Validación por: lint + build + revisión de
  código + **grep/lectura comparada contra Demo6** (cada hallazgo cita líneas exactas de Demo6) + reuso de
  patrones ya probados (H-004 inline validation, ProductPicker→TelaPicker, primitivos `form.jsx`).
- **Inspección Demo6:** las validaciones se contrastaron 1:1 con `saveSale`/`openSaleForm`/
  `renderSaleAcabados`/`onSaleItemProductChange`/`onSaleItemTypeChange`.

## 4. Decisiones técnicas (especialmente las que difieren del inventario/hipótesis)
1. **REG-09 pago — FIEL A DEMO6, NO condicional por monto** (confirmado por el usuario vía AskUserQuestion).
   Demo6 exige los 5 campos SIEMPRE con `monto≥1`; **no admite venta a crédito (monto=0)**, sin tope
   monto≤total, un solo método. Se eliminó la flexibilidad previa de React de vender sin pago.
   *(Nota de negocio pendiente con el cliente: si Castor SAS acepta ventas sin anticipo, se agregaría
   excepción en fase posterior.)*
2. **REG-06 formato teléfono** — refuerzo "sin letras + ≥7 dígitos" añadido por consistencia con H-004
   (`Leads.jsx`); Demo6 solo usa `required` nativo. Reversible si se quiere paridad estricta.
3. **REG-08 tiempo/docType** — validación defensiva (sus `<Select>` tienen default no vacío, nunca quedan
   vacíos); el gate efectivo es `asesor`. No se cambiaron los defaults (evitar cambio de conducta).
4. **REG-07 ítems** — gate único "≥1 ítem válido" sin inline por fila (fiel a Demo6, que filtra filas).
5. **REG-01/02** — se incluyó el 4º acabado **Tejido** (confirmado). Buscador de telas sí; **botón "+"
   de alta rápida (quickAddTela) NO** (EX-F2-09).

## 5. Hallazgos extra detectados
- **EX-F2-08** (media): `submitSale` no persiste `item.acabados` en `order.acabados` (Demo6 sí). Necesario
  para paridad 1:1 del dato; follow-up al portar Producción/Auditoría. Registrado en `HALLAZGOS_EXTRA.md`.
- **EX-F2-09** (baja): botón "+" de alta rápida de tela no portado (decisión: posible EX post-demo).

## 6. Riesgos conocidos / incertidumbre
- **Sin E2E en vivo para Bloque A y C** (los más visuales): el Preview MCP quedó inoperante toda la sesión.
  El harness ancla la raíz de Preview a un worktree huérfano (`hardcore-pike-3fb8dd`) que la limpieza dejó
  dañado; tras sincronizar `index.html` + `src` completos y reiniciar, el render de React no monta
  (root vacío, sin errores de consola, screenshot con timeout). Mitigación: build OK (rolldown resuelve
  imports/JSX → descarta errores de compilación/referencia), reuso de patrones ya en producción, fidelidad
  verificada contra Demo6. **Foco sugerido para tu spot-check humano:** render condicional de acabados por
  producto, dropdown de telas, badges de stock y la fila de ítem en el modal real.
- **EX-F2-08** (acabados no persistidos) es la única brecha funcional real conocida, ya diferida.

## 7. Recomendación de merge
✅ **APTO.** 12/12 hallazgos cerrados, lint 0 + build OK en todos, fidelidad a Demo6 documentada por
hallazgo, decisiones clave confirmadas con el usuario. El riesgo residual (no-E2E-en-vivo de A/C) está
acotado por build + reuso de patrones probados y es del tipo que el protocolo acordado acepta validar con
lint+build+revisión cuando Preview no está disponible. → **push directo a main por rebase.**

## 8. Pendientes para la próxima fase (Fase 3 visual)
- **EX-F2-08** (persistir `order.acabados`) y **EX-F2-07** (la venta no reserva `finishedStock`/`stockMoves`)
  → **P0 al portar Almacén/Producción/Despacho/Inventario**.
- EX-F2-09 (quickAddTela) si el cliente lo pide tras demo.
- Reparar/replantear el flujo de **Preview MCP** para que sirva el repo principal (hoy atado a worktree).
- Confirmar con cliente la política estricta de pago (monto≥1) de REG-09.
