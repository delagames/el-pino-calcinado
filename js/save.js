// Guardado en localStorage bajo una sola clave, más copias de los últimos días y un código de partida
// para pasarla a otro aparato (comprimida y en texto). Al arrancar se pide al navegador que no la borre.

const KEY = 'el-pino-calcinado';
const COPIAS = 'el-pino-calcinado-copias';
const VERSION = 1;
const DIAS_COPIA = 3;   // copias de días anteriores que se guardan

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
    const datos = { ...state, v: VERSION };
    localStorage.setItem(KEY, JSON.stringify(datos));
    guardarCopia(datos);
    return true;
  } catch {
    return false;
  }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento: no hay nada que borrar */ }
}

// ---------- copias automáticas: una por día (la última de ese día), las de hoy y los tres anteriores ----------
function leerCopias() {
  try { return JSON.parse(localStorage.getItem(COPIAS) || '[]'); } catch { return []; }
}
// (las copias de antes de que hubiera id de partida valen para la que haya)
const esDe = (c, partida) => !c.datos?.partida || c.datos.partida === partida;
// (solo las de esta partida, y sin los días «del futuro» si se ha vuelto atrás a una copia)
function guardarCopia(datos) {
  try {
    const lista = leerCopias().filter(c => esDe(c, datos.partida) && c.dia < datos.dia);
    lista.push({ dia: datos.dia, fecha: Date.now(), datos });
    lista.sort((a, b) => b.dia - a.dia);
    localStorage.setItem(COPIAS, JSON.stringify(lista.slice(0, DIAS_COPIA + 1)));
  } catch { /* si no cabe, se sigue sin copias: lo importante es la partida */ }
}
// las de días anteriores al que se está jugando (la del día de hoy es la propia partida)
export function copias() {
  const actual = load();
  const hoy = actual?.dia ?? Infinity;
  return leerCopias().filter(c => c.dia < hoy && esDe(c, actual?.partida)).slice(0, DIAS_COPIA);
}

// ---------- que el navegador no la borre cuando le falte sitio ----------
export async function pedirPersistencia() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* el navegador no lo permite: se sigue igual */ }
}

// ---------- código de partida: el JSON comprimido en texto, para copiarlo y pegarlo en otro aparato ----------
const b64 = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const deb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
async function pasar(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
export async function codigoDe(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream === 'undefined') return `PINO0-${b64(bytes)}`;
  return `PINO1-${b64(await pasar(bytes, new CompressionStream('gzip')))}`;
}
export async function textoDe(codigo) {
  const c = codigo.replace(/\s+/g, '');
  if (c.startsWith('{')) return codigo;   // también vale pegar la partida tal cual, en JSON
  const [, ver, cuerpo] = c.match(/^PINO([01])-([A-Za-z0-9_-]+)$/) || [];
  if (!cuerpo) throw new SyntaxError('código no válido');
  const bytes = deb64(cuerpo);
  return new TextDecoder().decode(ver === '1' ? await pasar(bytes, new DecompressionStream('gzip')) : bytes);
}
