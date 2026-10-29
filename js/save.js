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

// ¿deja este navegador guardar? (escribe y lee una prueba; con las cookies bloqueadas o en algunos modos privados, no)
export function sePuedeGuardar() {
  try {
    localStorage.setItem('el-pino-calcinado-prueba', '1');
    const ok = localStorage.getItem('el-pino-calcinado-prueba') === '1';
    localStorage.removeItem('el-pino-calcinado-prueba');
    return ok;
  } catch {
    return false;
  }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento: no hay nada que borrar */ }
}

// ---------- copias automáticas: una por día (la última de ese día), de cada partida por separado ----------
// Cargar otra partida, empezar de cero o volver a un día no borra las copias de nadie: cada partida guarda
// las suyas (hasta seis días) y se conservan las de las dos últimas partidas además de la de ahora.
const POR_PARTIDA = DIAS_COPIA + 3, OTRAS = 2;
function leerCopias() {
  try { return JSON.parse(localStorage.getItem(COPIAS) || '[]'); } catch { return []; }
}
function guardarCopia(datos) {
  try {
    const p = datos.partida;
    // (las de antes de que hubiera id de partida ya no se saben de quién son: fuera)
    const resto = leerCopias().filter(c => c.datos?.partida && !(c.datos.partida === p && c.dia === datos.dia));
    const mias = [{ dia: datos.dia, fecha: Date.now(), datos }, ...resto.filter(c => c.datos.partida === p)]
      .sort((a, b) => b.dia - a.dia).slice(0, POR_PARTIDA);
    // de las otras partidas, las de las dos que se jugaron más recientemente
    const otras = resto.filter(c => c.datos.partida !== p);
    const recientes = [...new Set(otras.sort((a, b) => b.fecha - a.fecha).map(c => c.datos.partida))].slice(0, OTRAS);
    localStorage.setItem(COPIAS, JSON.stringify([...mias, ...otras.filter(c => recientes.includes(c.datos.partida))]));
  } catch { /* si no cabe, se sigue sin copias: lo importante es la partida */ }
}
// las copias de la partida que se está jugando, menos la del día en que está (esa es la propia partida);
// si se ha vuelto a un día anterior, también salen los días de después, para poder volver a ellos
export function copias() {
  const actual = load();
  if (!actual) return [];
  return leerCopias().filter(c => c.datos?.partida === actual.partida && c.dia !== actual.dia)
    .sort((a, b) => b.dia - a.dia).slice(0, DIAS_COPIA + 2);
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
