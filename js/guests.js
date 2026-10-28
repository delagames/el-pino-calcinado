// Carga de huéspedes (data/guests.json), condiciones de aparición y quién llega cada día.

let data = null;

export async function loadGuestData() {
  if (!data) data = await (await fetch('data/guests.json')).json();
  return data;
}

export function guestById(id) {
  return data.guests.find(g => g.id === id);
}

// Un huésped puede aparecer si la posada tiene lo que necesita (mejoras, fase 6), si ya
// es el día que toca y si no se ha quedado a vivir (Snorlax)
export function canAppear(guest, state) {
  const need = guest.aparece || {};
  if (need.mejora && !(state.mejoras || []).includes(need.mejora)) return false;
  if (need.dia_min && state.dia < need.dia_min) return false;
  if (need.no_si && (state.flags || {})[need.no_si]) return false;
  // los más especiales solo vienen a una posada con fama
  if (need.estrellas && (state.estrellas || 1) < need.estrellas) return false;
  return true;
}

// Cuántos llegan: 2 los primeros días y luego más, hasta una más que habitaciones hay
export function arrivalsFor(day, rooms = 3) {
  return Math.min(rooms + 1, 2 + Math.floor((day - 1) / 2));
}

// Generador con semilla: el mismo día sale siempre igual aunque se recargue
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Primero los que se fueron sin habitación; luego, al azar, evitando a los de ayer
export function pickArrivals(state) {
  const r = rng(state.dia * 7919 + 13);
  // quien se fue disgustado tarda en volver; quien se fue encantado vuelve antes
  const libro = state.libro || {};
  const mosqueado = id => (libro[id]?.felicidad ?? 3) <= 1 && state.dia - (libro[id]?.ultimo || 0) < 4;
  const pool = data.guests.filter(g => canAppear(g, state) && !mosqueado(g.id));
  const ayer = new Set(state.ayer || []);
  const first = (state.vuelven || []).filter(id => pool.some(g => g.id === id));
  // las mejoras atraen o espantan tipos: termal (fuego y roca sí, agua no), jardín (planta), farolillos
  const mejoras = new Set(state.mejoras || []);
  const pull = g => {
    const t = g.tipos || [];
    let k = 0;
    if (mejoras.has('termal')) k += t.some(x => x === 'fuego' || x === 'roca') ? -0.35 : t.includes('agua') ? 0.4 : 0;
    if (mejoras.has('jardin') && t.includes('planta')) k -= 0.35;
    if (g.atrae && mejoras.has(g.atrae)) k -= 0.35;
    if (state.lluvia && t.includes('agua')) k -= 0.35;   // con lluvia vienen más los de agua
    if ((libro[g.id]?.felicidad ?? 0) >= 4) k -= 0.4;
    // con tantos huéspedes, quien tiene su historia a medias vuelve antes (si no, no se acaba nunca)
    const visitas = libro[g.id]?.visitas || 0;
    if (visitas > 0 && visitas < (g.arco || 3)) k -= 0.25;
    return k;
  };
  const rest = pool.filter(g => !first.includes(g.id))
    .map(g => ({ id: g.id, k: r() + (ayer.has(g.id) ? 1 : 0) + pull(g) }))
    .sort((a, b) => a.k - b.k)
    .map(g => g.id);
  return [...first, ...rest].slice(0, arrivalsFor(state.dia, state.habitaciones || 3)).map(id => {
    const g = guestById(id);
    // encargos posibles hoy: sin los que ya no tienen sentido por una mejora y, si se puede,
    // distinto del de la visita anterior (para no repetir la misma escena)
    let opts = g.pide.map((p, i) => i).filter(i => !g.pide[i].no_si_mejora || !mejoras.has(g.pide[i].no_si_mejora));
    const last = (state.ultimoPide || {})[id];
    if (opts.length > 1) opts = opts.filter(i => i !== last);
    return { id, pide: opts[Math.floor(r() * opts.length)] ?? 0 };
  });
}
