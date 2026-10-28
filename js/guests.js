// Carga de huéspedes (data/guests.json), condiciones de aparición y quién llega cada día.

let data = null;

export async function loadGuestData() {
  if (!data) data = await (await fetch('data/guests.json')).json();
  return data;
}

// Los huéspedes pueden evolucionar en su propia historia («evoluciones»: desde qué visita salen con
// otra especie, número y sprite). La posada dice en qué visita va cada uno (setVisitas) y guestById
// devuelve la forma de ahora; guestBase, la ficha tal cual.
let visitaDe = () => 1;
export function setVisitas(fn) { visitaDe = fn; }

export function guestBase(id) {
  return data.guests.find(g => g.id === id);
}

export function formaDe(g, visita) {
  const evo = (g.evoluciones || []).filter(e => e.visita <= visita).at(-1);
  return evo ? { ...g, ...evo, base: g } : g;
}

export function guestById(id) {
  const g = guestBase(id);
  return g && g.evoluciones ? formaDe(g, visitaDe(id)) : g;
}

// Las filas de la Pokédex (el libro de visitas): cada número con la historia a la que pertenece.
// Una historia cubre varios números si el huésped evoluciona, si viene con acompañante (la pareja de
// Nidoran) o si es un grupo de una noche (cameo). Charizard vive aquí: siempre visto.
export function pokedex(libro) {
  const filas = new Map();
  const add = (dex, especie, sprite, guest, visto) => {
    if (!dex) return;
    const antes = filas.get(dex);
    if (!antes || (visto && !antes.visto)) filas.set(dex, { dex, especie, sprite, guest, visto });
  };
  add(6, 'Charizard', '0006', null, true);
  for (const g of data.guests) {
    const e = libro[g.id];
    if (g.cameo) { for (const m of g.miembros || []) add(m.dex, m.especie, m.sprite, g.id, !!e); continue; }
    const formas = [{ visita: 1, ...g }, ...(g.evoluciones || [])];
    formas.forEach((f, i) => {
      const forma = i ? { ...g, ...f } : g;
      // visto si ya ha pasado con esa forma (las partidas antiguas, sin «forma», van por visitas)
      const alcanzada = e?.forma ?? (g.evoluciones || []).filter(x => x.visita <= (e?.visitas || 0)).length;
      const visto = !!e && (i === 0 || alcanzada >= i);
      add(forma.dex, forma.hablante || forma.especie, forma.sprite, g.id, visto);
      if (/^\d+$/.test(forma.acompanante || '')) add(+forma.acompanante, forma.acompanante_especie || forma.especie, forma.acompanante, g.id, visto);
    });
  }
  return [...filas.values()].sort((a, b) => a.dex - b.dex);
}

// La meta del juego: los 151 de Kanto en el libro de visitas (los de otras regiones, como
// Larvitar, se apuntan pero no suman)
export function kantoVistos(libro) {
  return pokedex(libro).filter(f => f.visto && f.dex <= 151).length;
}

// Un huésped puede aparecer si la posada tiene lo que necesita (mejoras, fase 6), si ya
// es el día que toca y si no se ha quedado a vivir (Snorlax)
export function canAppear(guest, state) {
  const need = guest.aparece || {};
  if (need.mejora && !(state.mejoras || []).includes(need.mejora)) return false;
  if (need.dia_min && state.dia < need.dia_min) return false;
  if (need.no_si && (state.flags || {})[need.no_si]) return false;
  // algunos solo vienen cuando ya ha pasado algo en otra historia (los hermanos de Eevee, Mewtwo)
  if (need.si_flags?.some(f => !(state.flags || {})[f])) return false;
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

// Primero los que se fueron sin habitación; luego, al azar, evitando a los de ayer.
// «terminados»: los que ya contaron toda su historia y se despidieron; no vuelven
export function pickArrivals(state, terminados = new Set()) {
  const r = rng(state.dia * 7919 + 13);
  // quien se fue disgustado tarda en volver; quien se fue encantado vuelve antes
  const libro = state.libro || {};
  const mosqueado = id => (libro[id]?.felicidad ?? 3) <= 1 && state.dia - (libro[id]?.ultimo || 0) < 4;
  // los grupos de una noche (cameos) no suben solos: llegan con la excursión
  // (se mira la forma con la que vendría: si evoluciona en algo que necesita el nido, hace falta el nido)
  const proxima = id => ((state.vistas || {})[id]?.length || 0) + 1;   // el capítulo (y la forma) con que vendría
  const pool = data.guests.filter(g => !g.cameo && canAppear(formaDe(g, proxima(g.id)), state) && !mosqueado(g.id) && !terminados.has(g.id));
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
    // la forma con la que viene en esta visita (si evoluciona, pide lo de su nueva forma)
    const g = formaDe(guestBase(id), proxima(id));
    // encargos posibles hoy: sin los que ya no tienen sentido por una mejora y, si se puede,
    // distinto del de la visita anterior (para no repetir la misma escena)
    let opts = g.pide.map((p, i) => i).filter(i => !g.pide[i].no_si_mejora || !mejoras.has(g.pide[i].no_si_mejora));
    const last = (state.ultimoPide || {})[id];
    if (opts.length > 1) opts = opts.filter(i => i !== last);
    return { id, pide: opts[Math.floor(r() * opts.length)] ?? 0 };
  });
}
