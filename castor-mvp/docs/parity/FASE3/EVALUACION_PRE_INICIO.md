# EVALUACIÓN PRE-INICIO FASE 3 — auditoría crítica de Fase 2.5

**Fecha:** 2026-05-26 · **Autor:** Claude (auditor, sesión del dueño original) · **Rama:** `claude/parity-fase-3`
**Alcance:** diagnóstico de lo cerrado en Fase 2.5 (EX-F2-04 + EX-F2-03) antes de arrancar Fase 3 visual.
**Regla cumplida:** NO se tocó código de la app; solo lectura/diagnóstico + verificación en vivo (Preview MCP).

> Auditoría honesta, sin complacencia. Donde hay divergencias o atajos, se marcan. EX-F2-04 fue
> implementado por mí (mismo modelo de antes); EX-F2-03 lo implementó el compañero — el grueso de la
> crítica aplica a EX-F2-03 y a una omisión heredada de H-035 que EX-F2-03 vuelve relevante.

---

## 1. Sincronización (Paso 1)

- `git pull --ff-only` OK: local `claude/parity-fase-3` avanzó `1e368f3..19eec61`.
- **Estado de rama:** local quedó **1 commit detrás de `origin/main`** (`c877281`), porque el
  `CIERRE_FASE_2_5.md` se commiteó **directo a main**, no en la rama. No hay divergencia (es ancestro
  lineal); solo falta ese doc. Working tree limpio (salvo `.claude/launch.json` local, no versionado).
- Toda Fase 2.5 se integró a main por **fast-forward** (historial lineal, sin commit de merge).

## 2. Qué se cerró exactamente (Paso 3a)

### EX-F2-04 — edición de cliente (lo implementé yo; coincide 1:1 con lo decidido)
Commits `edfe063` / `9ade721` / `abed07c` / `fcb284e`. UI inline en SlidePanel (Opción A), cascada
acotada de nombre a `orders`+`quotes` por `customerId` (atómica, un solo setState), `channel` nuevo +
migración separada `migrateCustomerChannel`, validaciones H-004, toggle Persona↔Institucional. **Sin
divergencias** respecto a `PROPUESTA_EDICION_CLIENTE.md`.

### EX-F2-03 — crear venta desde cotización (compañero)
Commits `ff77ae3` / `dc9ce0e` / `1f61db0` / `19eec61`. Implementación correcta del núcleo:
- `NuevaVentaModal` gana prop `prefill`; `useEffect([open])` siembra el form al abrir (vacío si no hay
  prefill). Se reusa el patrón de intent `pendingForm` (espejo de `openSaleForm(quoteId)` de Demo6).
- Botón "→ Crear venta" (solo en cotizaciones **aceptadas**) emite `{type:'sale', quoteId}` y navega a
  Ventas, que abre el modal **encima** del módulo (no es pantalla nueva). ✅ fiel a Demo6.
- `buildSalePrefill`: si la quote tiene `customerId` → copia el customer; si solo `leadId` → copia el
  lead (customerId vacío); si nada → solo `clientName`.
- `submitSale` escribe `quoteId` real + **paso-4 retroactivo** (fija `quote.customerId`).

### Cambios adicionales fuera de scope
**Ninguno.** El diff de código de toda Fase 2.5 (`14f0f85..origin/main`) toca exactamente 7 archivos
esperados (los de EX-F2-04 + `NuevaVentaModal`/`Cotizaciones`/`Ventas`). No hay refactors oportunistas
ni módulos tocados de más. ✅

## 3. Calidad técnica (Paso 3b)

**Lo bueno:**
- Decisiones documentadas respetadas: cascada 3.2 por `customerId`, modelo extendido, UI inline,
  migración separada (no se tocó `migrateCustomerFk`). ✅
- `customerId` en quotes ya existía (migración B2) y `NuevaCotizacionModal` ya lo seteaba → no se
  duplicó. El compañero lo aprovechó bien.
- `submitSale` con `quoteId: saleQuoteId || null` no rompe el flujo walk-in (queda `null`, igual que antes).

**Code smells / observaciones (menores):**
- `NuevaVentaModal.jsx`: `useEffect([open])` con `// eslint-disable-next-line react-hooks/set-state-in-effect`
  y `exhaustive-deps`. Es un sembrado intencional al abrir, pero son supresiones de lint. Aceptable,
  pero conviene tenerlo presente (el seeding depende de un efecto, no de props derivadas).
- `Ventas.jsx`: mismo patrón de `eslint-disable` en el `useEffect` que consume `pendingForm`. OK funcional.
- **No hay código duplicado nuevo** ni antipatrón grave. La cascada de EX-F2-04 sí es atómica (regla cumplida).

## 4. Cobertura de validación (Paso 3c)

- `VALIDACION_EX_F2_03.md`: existe, documenta 3 casos + decisiones A/B + pasos humanos.
- **Caso 3 (cotización sin lead ni customer) NO se ejecutó**: el doc dice "no hay quote así en el seed;
  se validará si se requiere". Queda como hueco de cobertura (bajo riesgo: el código tiene la rama).
- Lint/build OK declarados; 0 errores de consola declarados (lo confirmé yo, ver §6).
- `VALIDACION_EX_F2_04.md`: 22/22, 0 errores consola (mío, de la sesión previa).

## 5. Divergencias vs lo esperado / vs Demo6 (Paso 3e) — LO IMPORTANTE

### 5.1 Decisión A (precio desde lista, no preserva precio/descuento de la quote) — ✅ FIEL a Demo6
Casi lo marco como bug. **No lo es.** En Demo6 (`addSaleItemRow`, línea 5737) el campo precio es
`readonly` "desde lista" y `onSaleItemProductChange` lo recalcula desde el producto; el descuento global
de la cotización **tampoco** se traslada. La implementación React hace exactamente lo mismo (precio de
lista, `disc:0`). El total $10M del prefill de COT-2002 (vs $8.5M con 15% de la quote) es el
**comportamiento esperado y consistente con la fuente de verdad**. Decisión A: correcta.

### 5.2 ⚠️ DIVERGENCIA REAL — no se enlaza cliente↔lead ni se avanza el estado del lead
Al convertir una cotización **con lead pero sin customer** (caso COT-2001 → lead L-102), `submitSale`
(`Ventas.jsx:178-188`) crea el cliente con **`linkedLeadId: null`** y **no toca el lead**. Verificado en
vivo: tras la venta, `C-005.linkedLeadId = null`, `L-102.linkedCustomerId = null`, `L-102.estado` sigue
**"En gestión"**.

**Demo6 `saveSale` SÍ hace ambas cosas:**
- Línea 30: nuevo cliente con `linkedLeadId = quote.leadId` (enlaza cliente→lead).
- Línea 206: `if (q?.leadId) lead.estado = 'ganado'` (avanza el embudo).

**Impacto:**
- El lead queda "En gestión" para siempre tras ganarse la venta → embudo incorrecto (diverge de Demo6).
- Cliente y lead quedan **desconectados** → `resolveCustomerId(leadId)` para ese lead devuelve `null`;
  una futura cotización/pedido de ese lead no auto-resolvería al cliente ya existente (debilita B2).
- Rompe la convención del seed (L-105↔C-004 son bidireccionales; este flujo no la mantiene).

**Naturaleza:** la creación de cliente en `submitSale` es **heredada de H-035 (Fase 2)** — no la escribió
el compañero. PERO EX-F2-03 es lo que vuelve este camino (quote-con-lead → venta) alcanzable y rutinario
desde la UI. El compañero **añadió el paso-4** (setear `quote.customerId`, extensión propia de React que
Demo6 no tiene) pero **omitió las 2 cosas que Demo6 sí hace** (linkedLeadId + estado del lead), teniendo
el `srcQuote` (con su `leadId`) a mano en el mismo bloque. Es una omisión, no una mala decisión
deliberada — y **no quedó registrada como hallazgo**.

**Severidad:** media. NO es bug crítico clase B2 (sin crash, sin pérdida de datos). Es integridad de
datos / paridad de embudo.

### 5.3 Paso-4 retroactivo (setear quote.customerId) — extensión propia, no en Demo6
Demo6 no actualiza `quote.customerId`. La implementación React sí (justificado por el modelo FK B2/
ADR-011). Es una **mejora coherente**, no una divergencia-bug. Bien documentada.

## 6. Verificación funcional en vivo (Paso 4) — Preview MCP, seed limpio, 0 errores de consola

| Test | Resultado | Evidencia |
|------|-----------|-----------|
| **A — Cascada B2** (editar Carmiña) | ✅ | `PED-1245.clientName` y `COT-2002.clientName` → "Carmiña Chapman EDIT"; `COT-2001` queda "Laura Mendoza" |
| **B — Precarga venta desde cotización** (COT-2002) | ✅ | Modal "Nueva venta" abre encima de Ventas; cliente Carmiña + ítem Módulo Roma precargados; Total $10.000.000 (precio de lista, decisión A = fiel a Demo6) |
| **C — Paso-4 retroactivo** (COT-2001, sin customerId) | ✅ (con gap §5.2) | Se creó **C-005**; **PED-1254** con `quoteId='COT-2001'` + 3 ítems; **`COT-2001.customerId: null → C-005`**. PERO `C-005.linkedLeadId=null` y `L-102.estado` sigue "En gestión" |

Los 3 tests críticos **pasan**. El gap de §5.2 aparece como efecto colateral del Test C.

## 7. Riesgos / regresiones (Paso 3d)

- **Regresión Fase 1/1.5/2:** ninguna detectada. El flujo walk-in de `submitSale` no cambió de
  comportamiento (`quoteId:null` cuando no hay quote). La cascada de EX-F2-04 no tocó `migrateCustomerFk`.
- **HALLAZGOS_EXTRA nuevos:** el compañero **no registró ninguno**. El gap §5.2 debió registrarse y no
  se hizo → lo registro yo como recomendación (ver §9).
- **Higiene de git (cosmético, no bloquea):**
  - Handoff **duplicado**: `540a4de` creó `HANDOFF_FASE_2_5.md` **vacío** (0 inserciones) y `1e368f3`
    lo rellenó (253 líneas). Dos commits con el mismo mensaje.
  - `CIERRE_FASE_2_5.md` se commiteó **directo a main** (`c877281`), no en la rama → main quedó 1
    commit por delante de `origin/claude/parity-fase-3`.
  - El propio CIERRE afirma "main hasta `19eec61`" pero su commit es `c877281` (auto-inconsistencia menor).
  - Dos identidades de autor en los commits (handoffs por `OmarCifuentes`, código EX-F2-03 por
    `Juan Bautista Perez`). Informativo.

## 8. Recomendación sobre Fase 3 (Paso 5)

### a) ¿Seguro arrancar Fase 3 visual?
**⚠️ SÍ, con caveats.** El estado es funcional, sin bugs críticos ni regresiones. Los módulos visuales
de Fase 3 (Almacén, Materia Prima, Innovación, Producción) **no dependen** del enlace lead↔cliente, así
que el gap §5.2 no bloquea arrancar. Pero conviene resolverlo para no acumular deuda de integridad B2.

### b) Qué conviene resolver (ordenado por criticidad)
1. **(Media) Gap §5.2** — en `submitSale`, cuando hay `saleQuoteId` y se crea un cliente nuevo: setear
   `customer.linkedLeadId = srcQuote.leadId` y avanzar el estado del lead (a "Compro"/"ganado"), como
   `saveSale` de Demo6 (líneas 30 y 206). Fix pequeño y localizado (el `srcQuote` ya está en el bloque
   del paso-4). Ideal: primer P0 técnico de Fase 3, antes de lo visual.
2. **(Baja) Cobertura** — validar el Caso 3 de EX-F2-03 (cotización sin lead ni customer) creando una
   quote sin lead, o aceptar que está cubierto por código.
3. **(Cosmético) Higiene git** — no requiere acción retroactiva; solo cuidar a futuro (no commitear
   archivos vacíos; cerrar docs en la rama, no en main).

### c) ¿Rama actual o nueva?
- Fase 2.5 ya está en main; `claude/parity-fase-3` quedó integrada por fast-forward (sin commits únicos
  vs main, salvo que le falta el CIERRE `c877281`).
- **Recomendación:** sincronizar la rama con main (traer `c877281`) y, dado que el nombre `parity-fase-3`
  ya quedó "gastado" por la confusa Fase 2.5, **cortar una rama limpia desde `main` actualizado para la
  fase visual** (p. ej. `claude/parity-fase-3` recreada desde `c877281`, o el nombre que definas). Así el
  historial de la fase visual arranca limpio sobre todo lo de 2.5.
  - **Pro nueva:** historial claro, base = main al día, sin arrastrar el ruido de 2.5.
  - **Contra nueva:** un paso extra de branch.
  - **Pro reusar:** cero churn; pero hay que ff a `c877281` igual y conviven 2.5 + visual en la misma rama.
  - (Decisión tuya; ambas dan el mismo contenido de partida.)

## 9. Acción sugerida inmediata (para que YO no la olvide)
Registrar el gap §5.2 en `HALLAZGOS_EXTRA.md` como **EX-F2-05** (enlace cliente↔lead + estado del lead
en conversión quote→venta) — pendiente de tu OK, ya que la regla es no tocar nada en esta evaluación.

---

## Veredicto

Fase 2.5 está **bien hecha en lo esencial**: EX-F2-04 1:1 con lo pactado, EX-F2-03 con núcleo correcto y
fiel a Demo6 (incluida la decisión A, que verifiqué contra el HTML). El único hallazgo de peso es el
**gap §5.2** (no enlazar cliente↔lead ni avanzar el lead al convertir desde cotización), que diverge de
`saveSale` de Demo6 y debilita B2. No es crítico y no bloquea Fase 3, pero debería ser el primer arreglo.
El resto son cosméticos de git y un hueco menor de cobertura. **Recomendación: ⚠️ arrancar Fase 3 con el
§5.2 como P0 técnico previo a lo visual.**
