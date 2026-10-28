// Guardado en localStorage bajo una sola clave. Exportar e importar JSON llegan en la fase 6.

const KEY = 'el-pino-calcinado';
const VERSION = 1;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.v === VERSION ? data : null;
  } catch {
    return null;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, v: VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento: no hay nada que borrar */ }
}
