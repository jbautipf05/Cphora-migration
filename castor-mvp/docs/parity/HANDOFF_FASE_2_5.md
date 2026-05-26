# HANDOFF FASE 2.5 — Transferencia de continuidad

## 1. Contexto rápido del proyecto

Estamos haciendo paridad visual y funcional entre `Castor_Dashboard_Demo6.html` (HTML original) y `castor-mvp` (versión React). El trabajo se divide en fases incrementales, cada una con su rama dedicada.

**Estado actual:**
- Fase 1: ✅ cerrada y mergeada a main
- Fase 1.5: ✅ cerrada y mergeada a main (bugs técnicos: B1, B2, B3, nextId)
- Fase 2: ✅ cerrada y mergeada a main (PR #3 — Clientes, Ventas, Innovación, Lista de Precios)
- **Fase 2.5: 🟡 EN CURSO** — EX-F2-04 cerrado por Claude, EX-F2-03 pendiente

---

## 2. En qué rama y worktree estás trabajando
Rama actual: claude/parity-fase-3
Worktree:    .claude/worktrees/reverent-germain-305c21/castor-mvp/

**Aclaración importante:** el directorio se llama "reverent-germain-305c21" (nombre autogenerado del entorno) pero la rama es "claude/parity-fase-3". Es cosmético. NO renombres ni el directorio ni la rama.

Para arrancar:

```powershell
\CASTOR\Cphora-migration\castor-mvp\.claude\worktrees\reverent-germain-305c21\castor-mvp
git status
git log --oneline -6
```

Deberías ver al menos estos 4 commits recientes de EX-F2-04:
- `fcb284e` docs(fase-3): VALIDACION_EX_F2_04
- `abed07c` feat(customer-edit): UI inline de edicion en SlidePanel
- `9ade721` feat(customer): cascada acotada de nombre a orders+quotes
- `edfe063` refactor(data): extender modelo customers con channel

---

## 3. Lo que TENÉS QUE HACER (en orden)

### Paso 1 — Validación humana de EX-F2-04 (10 min)

Claude implementó la edición de cliente con cascada B2 completa. Auto-validó con 22/22 tests pero falta verificación humana porque toca modelo de datos.

**a) Arrancar la app:**

```powershell
\CASTOR\Cphora-migration\castor-mvp\.claude\worktrees\reverent-germain-305c21\castor-mvp
corepack pnpm@latest run dev
```

Abrí `localhost:5173` en el navegador.

**b) Test crítico de cascada (5 min) — el más importante:**

1. Andá a módulo Clientes
2. Buscá "Carmiña Chapman" (es C-004, tiene cotización y pedido asociados)
3. Click en el cliente → abre SlidePanel del detalle
4. Click en botón "✎ Editar"
5. Cambiá el nombre a "Carmiña Test 1"
6. Guardá

**Verificaciones de cascada (todas deben pasar):**

- [ ] En el detalle del cliente, sección Ventas/Pedidos → PED-1245 muestra "Carmiña Test 1"
- [ ] En el detalle del cliente, sección Cotizaciones → COT-2002 muestra "Carmiña Test 1"
- [ ] Andá a módulo Ventas/Pedidos → buscá PED-1245 → debe mostrar "Carmiña Test 1"
- [ ] Andá a módulo Cotizaciones → buscá COT-2002 → debe mostrar "Carmiña Test 1"
- [ ] COT-2001 (Laura Mendoza) NO debería cambiar (queda histórica, sin customerId)

**Test del buscador (importante):**

- [ ] En módulo Ventas, escribí "Test 1" en el buscador
- [ ] Debe encontrar PED-1245 (esto valida que el buscador resuelve por customerId, no por string viejo)

**c) Test de validaciones (2 min):**

Volvé al modal de edición de cualquier cliente:

- [ ] Nombre vacío → debe mostrar error y bloquear guardado
- [ ] Teléfono "abc123" → debe mostrar error
- [ ] Email "noesunmail" → debe mostrar error
- [ ] Toggle tipo a Institucional → deben aparecer campos Razón Social, NIT, Contacto
- [ ] Institucional sin Razón Social → debe bloquear

**d) Test campo channel (1 min):**

- [ ] Editá un cliente, cambiá Canal a "Instagram", guardá
- [ ] Cerrá detalle, reabrí: channel persiste

**e) Test cancelar (1 min):**

- [ ] Editá un cliente, cambiá varios campos
- [ ] Click "Cancelar"
- [ ] Reabrí detalle: cambios NO se guardaron

**Si TODO pasa:** seguí al Paso 2 (aprobar y arrancar EX-F2-03).
**Si ALGO falla:** mandale a Claude el prompt de "NO aprobado" (sección 4 de este doc).

### Paso 2 — Aprobar EX-F2-04 y arrancar EX-F2-03

Si la validación pasó, copiá y pegá este prompt en el chat de Claude:

EX-F2-04 validado humanamente. Resultados:
✅ Cascada de nombre: PED-1245 y COT-2002 reflejan "Carmiña Test 1"
✅ COT-2001 queda histórica sin cambios
✅ Buscador de Ventas resuelve por customerId correctamente
✅ Validaciones bloquean nombre vacío, teléfono con letras, email inválido
✅ Institucional sin Razón Social bloquea
✅ Toggle Persona↔Institucional funciona
✅ Campo channel editable y persiste
✅ Cancelar descarta cambios sin guardar
EX-F2-04 APROBADO. Procedé con EX-F2-03 (precarga modal Nueva Venta
desde Cotización + paso-4 retroactivo de customerId).
Recordatorios para EX-F2-03:

El paso-4 retroactivo está en scope. Cuando se convierte una quote
a venta y se crea un customer nuevo, hay que actualizar
retroactivamente el customerId de la quote.
Flujo a implementar:

Usuario en detalle de cotización → click "→ Crear venta"
Debe abrir modal H-035 (Nueva Venta) precargado con datos del
cliente y los ítems de la cotización
quoteId vinculado al pedido nuevo para trazabilidad


Casos a contemplar:

Cotización con customerId existente → precarga normal
Cotización con leadId pero sin customerId → precarga del lead, al
guardar venta crea customer y setea customerId retroactivamente
Cotización sin lead ni customer → modal vacío, comportamiento default


Inspección previa antes de codear:

Verificá el código actual del botón "→ Crear venta" en Cotizaciones.jsx
Verificá el flujo actual de Ventas cuando recibe context de cotización
Verificá si hay alguna lógica de quoteId ya implementada parcialmente
Mostrá qué encontraste antes de arrancar a codear


Mantener disciplina del protocolo:

Commits granulares
Auto-validación al cierre con tests específicos
Si algo no encaja, pausá antes de codear

### Paso 3 — Validar EX-F2-03 cuando Claude termine

Cuando Claude reporte cierre de EX-F2-03 con auto-validación, hacé esta validación humana (5 min):

1. Andá a Cotizaciones
2. Abrí cualquier cotización con cliente vinculado (ej: COT-2002 de Carmiña)
3. Click en "→ Crear venta"
4. Verificá:
   - [ ] Se abre modal de Nueva Venta (NO te lleva a otra pantalla)
   - [ ] El cliente está precargado con los datos correctos
   - [ ] Los ítems están precargados (productos, cantidades, precios)
   - [ ] El quoteId está vinculado al pedido (verificable en localStorage)
5. Confirmá la venta
6. Verificá: el pedido nuevo aparece con el cliente correcto

**Caso especial — cotización con lead sin customer:**

1. Buscá COT-2001 (Laura Mendoza, sin customerId, lead sin convertir)
2. Click "→ Crear venta"
3. Verificá que precarga datos del lead
4. Confirmá venta
5. Verificá: customer nuevo creado, customerId actualizado en COT-2001 (paso-4 retroactivo)

### Paso 4 — Cuando ambos EX cierren

**NO mergees a main sin avisarme primero.** Mandame mensaje cuando ambos estén cerrados y yo decido el momento del PR.

---

## 4. Si algo falla durante la validación

Mandale a Claude este prompt (ajustá lo que pasó):

EX-F2-04 NO aprobado. Encontré problemas en la validación humana:
[Descripción específica del problema, idealmente con ejemplo concreto]
Hallazgo: [qué esperabas vs qué viste]
NO arranques EX-F2-03. Corregí esto primero.
Diagnóstico antes de fix: explicame por qué crees que pasó esto sin
codear todavía. Si es algo que requiere cambio de plan o tiene
implicaciones más amplias, pausá antes de tocar nada.

---

## 5. Decisiones técnicas YA TOMADAS (NO re-discutir con Claude)

Estas decisiones están firmes. Si Claude las cuestiona, recordáselas:

1. **Cascada de nombre solo a `orders` y `quotes`**, NO a facturas (son documentos históricos, no se reescriben)
2. **Campo `channel` agregado a CUSTOMERS** (no existía antes, se agregó como parte de EX-F2-04)
3. **`customerId` en quotes YA EXISTE** desde Fase 1.5 (no duplicar lógica de migración)
4. **UI de edición es inline en SlidePanel** (Opción A, no modal flotante separado)
5. **Paso-4 retroactivo** (customerId al convertir quote→venta) va en EX-F2-03, no en EX-F2-04
6. **Buscador de Ventas resuelve por customerId**, no por nombre

---

## 6. Reglas estrictas del trabajo con Claude

- **NO crear ramas nuevas.** Trabajar siempre en `claude/parity-fase-3`
- **NO mergear a main** hasta que ambos EX cierren Y yo dé el OK
- **NO arreglar cosas fuera del scope** de EX-F2-04 / EX-F2-03 (anotar en `docs/parity/FASE2/HALLAZGOS_EXTRA.md` sin tocar código)
- **NO commitear** `.claude/` ni `vite.config.js` modificado (son configs locales)
- **Un hallazgo a la vez**, commit + push después de cada cambio
- **Reporte compacto** por hallazgo en `docs/parity/FASE3/H-XXX.md`
- **Si Claude detecta algo inesperado**, debe PAUSAR antes de codear

---

## 7. Archivos clave para leer (en este orden si necesitás contexto)

1. `docs/parity/FASE2/CIERRE_FASE2.md` — qué se cerró en Fase 2
2. `docs/parity/FASE2/HALLAZGOS_EXTRA.md` — EX-F2-03 y EX-F2-04 documentados
3. `docs/parity/FASE3/PROPUESTA_EDICION_CLIENTE.md` — decisiones de EX-F2-04
4. `docs/parity/FASE3/VALIDACION_EX_F2_04.md` — auto-validación que hizo Claude

---

## 8. Cosas que pueden parecer bug pero NO lo son (by design)

- **COT-2001 NO se actualiza al editar cliente** → es histórica, no tiene customerId. Comportamiento esperado.
- **Cotizaciones creadas sin lead vinculado quedan con customerId: null** → es by-design según ADR-011 (el cliente se crea recién al registrar la venta).
- **El directorio del worktree se llama "reverent-germain-305c21"** → cosmético, la rama real es `claude/parity-fase-3`. NO tocar.
- **Hay archivo `.claude/` untracked** → configs locales del entorno de Claude. NO commitear.

---

## 9. Si Claude pausa con decisión técnica que no entendés

**Mejor consultarme que decidir solo.** Las decisiones técnicas pueden tener implicaciones que solo se ven con contexto histórico del proyecto.

Mandame:
- Screenshot de la pausa
- Una línea de qué estaba haciendo Claude cuando paró
- Las opciones que ofrece

Yo te respondo en [tiempo razonable según tu canal de contacto].

---

## 10. Contacto

- **Mi canal:** [poné tu WhatsApp / Slack / email / lo que uses]
- **Urgencias** (todo roto, no podés avanzar): [otro canal si tenés]
- **Disponibilidad esperada:** [horario en que podés responder]

Suerte con la fase. El protocolo funciona bien si lo respetás. Cualquier duda, mejor pregunta de más que de menos.