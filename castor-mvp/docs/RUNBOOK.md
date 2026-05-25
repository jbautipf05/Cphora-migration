# Runbook operacional — CASTOR · Cphora

> Baseline operacional al **2026-05-25**. Refleja el estado real: la app es una
> **SPA estática sin backend**, así que gran parte de la operación clásica
> (servidores, bases de datos, alertas) **no aplica todavía**. Lo que aún no
> existe se marca como **(no configurado)** para que el equipo lo complete, no
> para simular que existe.

## 1. Cuándo usar este runbook

- Publicar una nueva versión del frontend.
- Revertir a una versión anterior.
- Diagnosticar un problema reportado por un usuario (datos perdidos, app no carga,
  contabilidad descuadrada).

## 2. Prerrequisitos / accesos

| Recurso | Estado |
|---------|--------|
| Node + **pnpm** (vía corepack) | Requerido para build local |
| Repo `github.com/jbautipf05/Cphora-migration` | Acceso de escritura para publicar |
| Hosting estático (Vercel/Netlify/S3/…) | **(no configurado / por definir)** |
| CI/CD | **(no configurado)** — build y publicación son manuales |

## 3. Build y despliegue

La app compila a archivos estáticos en `dist/`. No hay proceso de servidor.

```bash
cd castor-mvp
pnpm install
pnpm build        # genera dist/  (index.html + assets/*.js,*.css)
pnpm preview      # verificación local del build antes de publicar
```

**Publicación (cuando se defina el hosting):** subir el contenido de `dist/` al
proveedor de hosting estático. Mientras no haya CI, es un paso **manual**:

1. `pnpm build` en una rama limpia y verificada (`pnpm lint` sin errores).
2. Verificar `pnpm preview` localmente (cargar, crear un pedido, ver el asiento).
3. Subir `dist/` al hosting / hacer merge a la rama que el hosting observe.

> El bundle es un único chunk (~719 KB / ~199 KB gzip). El warning de Vite por
> chunk > 500 KB es esperado (sin code-splitting). No es un error de build.

## 4. Rollback

Como el artefacto es estático e inmutable por versión:

- **Con hosting de inmutables (Vercel/Netlify):** promover el deploy anterior
  desde el panel del proveedor (rollback instantáneo, **(configurar)**).
- **Manual:** `git checkout <commit-anterior>` → `pnpm build` → re-publicar `dist/`.

> ⚠️ **El rollback de código NO revierte los datos del usuario.** Los datos viven
> en el `localStorage` del navegador de cada usuario, no en el servidor. Un
> rollback de la app no toca ni recupera datos locales.

## 5. Datos, "logs" y diagnóstico

No hay logs de servidor. La observabilidad es del lado del cliente:

| Qué | Dónde |
|-----|-------|
| Errores de runtime | **Consola del navegador** (DevTools). La consola del MVP es limpia: cualquier error ahí es señal real |
| Estado persistido | `localStorage`, clave **`castor_cphora_v7`** (DevTools → Application → Local Storage) |
| Última escritura | Campo `_savedAt` dentro del JSON de esa clave |
| Telemetría / APM | **(no configurado)** |

**Inspeccionar el estado de un usuario:** DevTools → Application → Local Storage →
`castor_cphora_v7` → copiar el JSON.

**Reset de datos:** botón "Reset Data Demo" en el Sidebar (acción `resetDemo`), o
manualmente borrar la clave `castor_cphora_v7` y recargar.

## 6. Alertas e incidentes

No hay alertas automáticas **(no configurado)**. Estos son los incidentes
previsibles según la auditoría y su respuesta manual:

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| **Asientos posteados desaparecen al recargar** | Re-seed de slices contables ([ADR-003](adr/ADR-003-slices-contables-reseed.md)) | Comportamiento conocido. No es corrupción. Fix pendiente en roadmap. No borrar datos del usuario |
| **IDs de asiento duplicados (`JE-000001`)** | `counters.je` sin inicializar (TD-01) | Conocido. No re-postear; esperar el fix del contador |
| **La app no carga / pantalla en blanco** | `localStorage` corrupto o lleno | DevTools → borrar clave `castor_cphora_v7` → recargar (se re-siembra). El `save` falla en silencio si la cuota se llena ([ADR-001](adr/ADR-001-persistencia-solo-cliente.md)) |
| **Balance/ecuación no cuadra** | Posible posteo a cuenta título (validación muerta, code-review #1/#6) o dato | Revisar el Libro Diario por asientos a cuentas padre; confirmar antes de atribuir a dato |
| **Cálculo de nómina sospechoso** | Desviaciones de normativa detectadas (aux. transporte, vacaciones, IBC — code-review #9/#10/#11) | Validar contra la norma antes de usar para liquidación real; el módulo es preview, no liquidador oficial |
| **Datos perdidos tras cambio de versión** | Bump de `STORAGE_KEY` descarta estado ([ADR-008](adr/ADR-008-migracion-por-storage-key.md)) | Esperado al subir el shape del estado; comunicar a usuarios antes de publicar un bump |

## 7. Owners por módulo

**(por completar)** — no asignados a la fecha. Mapa de módulos para asignación:

| Módulo | Owner sugerido por perfil |
|--------|---------------------------|
| Motor contable (`lib/`) | Perfil contable + dev senior |
| Estado/persistencia (`store/`, `lib/persistence.js`) | Dev senior front |
| Vistas ERP (`views/` comercial/operación) | Dev front |
| Vistas contabilidad (`views/` contables) | Dev front + contadora (validación) |
| Build/infra | (pendiente — depende del hosting elegido) |

## 8. Escalamiento

**(por definir)** — sin guardia ni canal de incidentes formal. Mientras tanto:
issues del repo `Cphora-migration` para bugs y seguimiento.
