// ───────────────────────────────────────────────────────────────────────────
// Capa de persistencia abstracta.
//
// Hoy: adaptador localStorage (igual que el demo, clave versionada).
// Mañana: basta con implementar otro adaptador con la misma interfaz
//   { load(): state|null, save(state): void, reset(): void }
// y cambiar `adapter` (p. ej. firebaseAdapter) — las vistas no se enteran.
// ───────────────────────────────────────────────────────────────────────────

// Bump cada vez que cambia el shape del state. Esto invalida automáticamente
// cualquier localStorage stale del usuario y vuelve a hidratar desde seed.
const STORAGE_KEY = 'castor_cphora_v7';

// Limpieza pasiva de versiones antiguas para que no acumulen basura.
try {
  ['castor_cphora_v3', 'castor_cphora_v4', 'castor_cphora_v5', 'castor_cphora_v6'].forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
} catch {}

const localStorageAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _savedAt: new Date().toISOString() }));
    } catch {
      /* almacenamiento lleno o no disponible — se ignora */
    }
  },
  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  },
};

// Adaptador activo. Para migrar a Firebase: crear firebaseAdapter con la misma
// interfaz y asignarlo aquí (o seleccionarlo por variable de entorno).
const adapter = localStorageAdapter;

export const loadState = () => adapter.load();
export const saveState = (state) => adapter.save(state);
export const resetState = () => adapter.reset();
