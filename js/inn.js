// La posada: el bucle del día (sección 3 de DISEÑO.md). Mañana llegan los huéspedes,
// de día se les da habitación y se les atiende, por la tarde bajan al comedor y por
// la noche se cobra, se apunta en el libro y se duerme. Se guarda al acabar cada fase.
import { loadSprite, Actor, DIR } from './sprites.js';
import { ROOMS, GROUND, COLORES } from './scene.js';
import { loadGuestData, guestById, guestBase, pickArrivals, setVisitas, canAppear, formaDe } from './guests.js';
import { load, save, clear } from './save.js';
import { loadDialogue, nextEntry } from './dialogue.js';
import { MORAL_INICIAL, CHISTORRA_DIARIA, humor, moodLine, feedLine, nightEvents } from './charizard.js';
import { loadRecipes, recipeById } from './kitchen.js';

export const FASES = ['manana', 'dia', 'tarde', 'noche'];
export const FASE_NOMBRE = { manana: 'mañana', dia: 'día', tarde: 'tarde', noche: 'noche' };

const PRECIO = 10;           // por noche
// propina según la felicidad con la que se va (0-5 corazones)
const PROPINA = [0, 0, 2, 4, 7, 11];

const FELIZ = ['furioso', 'disgustado', 'regular', 'a gusto', 'contento', 'encantado'];
// Lo que más le gusta a cada uno de la decoración: si está puesta, duerme más a gusto
const GUSTOS = {
  jigglypuff: 'farolillos', gengar: 'farolillos', mrmime: 'banderines', eevee: 'banderines',
  oddish: 'macetas', bulbasaur: 'macetas', machop: 'cuadro', growlithe: 'cuadro',
  jynx: 'alfombra', marina: 'alfombra', squirtle: 'estanque', larvitar: 'chimenea',
  machoke: 'cuadro', machamp: 'banderines', voltorb: 'banderines', magikarp: 'estanque', psyduck: 'estanque',
  porygon: 'farolillos', pikachu: 'banderines', kadabra: 'farolillos', clefairy: 'alfombra', arbok: 'chimenea',
  mew: 'macetas', ditto: 'cuadro', cubone: 'chimenea', farfetchd: 'macetas', slowpoke: 'estanque',
  nidoran: 'farolillos',
  geodude: 'cuadro', meowth: 'banderines', chansey: 'macetas', dragonite: 'alfombra', alakazam: 'farolillos',
  exeggcute: 'banderines', kangaskhan: 'chimenea', lickitung: 'chimenea', dodrio: 'alfombra',
};
const DECOR_NOMBRE = { farolillos: 'los farolillos', banderines: 'los banderines', macetas: 'las macetas', cuadro: 'el cuadro del gimnasio', alfombra: 'la alfombra roja', estanque: 'la charca', chimenea: 'la chimenea' };

// ROOMS cambia al construir plantas: se busca siempre en la lista viva
const ROOM = new Proxy({}, { get: (_, id) => ROOMS.find(r => r.id === id) });
const BASE_ROOMS = ['hab1', 'hab2', 'hab3'];
const PLANTA_ROOMS = { 'planta-2': ['hab4', 'hab5', 'hab6'], 'planta-3': ['hab7', 'hab8', 'hab9'] };
// Estrellas de la posada: puntos de fama de las mejoras hechas (obras y decoración) más el
// boca a boca: cada huésped que se va encantado suma uno, y cada uno que se va furioso resta
const ESTRELLAS = [0, 8, 20, 34, 52];   // puntos para 1, 2, 3, 4 y 5 estrellas
const BOCA = 4;                          // huéspedes encantados (de boca a boca) por cada punto de fama
const FLOOR0 = GROUND - 4;                        // suelo de la planta baja
const QUEUE = [80, 62, 44, 27];                  // sitios de la cola en la puerta (el resto espera en el camino)
const DOOR = 92;
const BED_X = { hab1: 114, hab2: 224, hab3: 264, buhardilla: 170, estanque: 344, cueva: 15, nido: 41 }; // centro de cada cama, para dormir
const STAND_X = { hab1: 150, hab2: 186, hab3: 302, buhardilla: 236, estanque: 344, cueva: 15, nido: 41 }; // de pie, en el hueco libre
// Sitios de fuera (con su mejora): la charca, la cueva de la ladera y el nido en lo alto del pino.
// En la cueva y el nido solo duermen los que lo piden («duerme» en guests.json); los enormes solo
// asoman por la boca de la cueva (se dibujan recortados)
const FUERA = new Set(['estanque', 'cueva', 'nido']);
const SUELO = { estanque: [GROUND - 2, GROUND - 1], cueva: [GROUND + 1, GROUND], nido: [164, 164] };   // [durmiendo, de pie]
const BOCA_CUEVA = [4, 210, 21, 37];
// las plantas de arriba repiten la distribución de la primera
for (const [a, b, c2] of [['hab4', 'hab5', 'hab6'], ['hab7', 'hab8', 'hab9']]) {
  Object.assign(BED_X, { [a]: BED_X.hab1, [b]: BED_X.hab2, [c2]: BED_X.hab3 });
  Object.assign(STAND_X, { [a]: STAND_X.hab1, [b]: STAND_X.hab2, [c2]: STAND_X.hab3 });
}
const SEATS = [180, 205, 230];                    // sitios del comedor por la tarde (tres, sin pisarse)
// Por la tarde cada uno hace lo suyo: comedor, su cuarto o un paseo (probabilidades por carácter)
const TARDE = {
  larvitar: { cuarto: 0.6, comedor: 0.3 },
  oddish: { paseo: 0.6, comedor: 0.3 },
  growlithe: { paseo: 0.5, comedor: 0.4 },
  machop: { paseo: 0.45, comedor: 0.45 },
  gengar: { comedor: 0.85, paseo: 0.1 },
  mrmime: { comedor: 0.85, paseo: 0.05 },
  jigglypuff: { comedor: 0.75, paseo: 0.1 },
  squirtle: { comedor: 0.5, paseo: 0.1 },
  marina: { paseo: 0.4, comedor: 0.5 },
  jynx: { comedor: 0.8, cuarto: 0.15 },
  bulbasaur: { paseo: 0.55, comedor: 0.3 },
  eevee: { comedor: 0.8, paseo: 0.1 },
  machoke: { paseo: 0.5, comedor: 0.4 },
  machamp: { paseo: 0.45, comedor: 0.45 },
  voltorb: { comedor: 0.7, paseo: 0.2 },
  magikarp: { comedor: 0.75, paseo: 0.1 },
  psyduck: { cuarto: 0.6, comedor: 0.3 },
  porygon: { comedor: 0.8, cuarto: 0.15 },
  pikachu: { comedor: 0.7, paseo: 0.2 },
  kadabra: { comedor: 0.8, cuarto: 0.1 },
  clefairy: { comedor: 0.6, paseo: 0.3 },
  arbok: { comedor: 0.9, paseo: 0.05 },
  mew: { cuarto: 0.5, paseo: 0.4 },
  ditto: { comedor: 0.8, paseo: 0.1 },
  cubone: { cuarto: 0.5, paseo: 0.3 },
  farfetchd: { comedor: 0.6, paseo: 0.3 },
  slowpoke: { cuarto: 0.4, comedor: 0.4 },
  nidoran: { cuarto: 0.6, paseo: 0.3 },   // la pareja: a su buhardilla en cuanto pueden
  geodude: { paseo: 0.5, comedor: 0.4 },
  meowth: { comedor: 0.8, paseo: 0.1 },
  chansey: { cuarto: 0.7, comedor: 0.2 },
  dragonite: { paseo: 0.6, comedor: 0.3 },
  alakazam: { comedor: 0.6, cuarto: 0.3 },
  exeggcute: { comedor: 0.9, paseo: 0.05 },
  kangaskhan: { cuarto: 0.5, comedor: 0.4 },
  lickitung: { cuarto: 0.5, comedor: 0.4 },
  dodrio: { comedor: 0.85, paseo: 0.1 },
};
const TARDE_DEF = { comedor: 0.6, paseo: 0.15 };
const PASEO_X = [54, 334, 352, 384];              // fuera: entre el pino y el porche, y a la derecha de la casa

// Dónde están los residentes en cada fase
// Los empleados, cada uno en su puesto: cocina, comedor, recepción o fuera
const PUESTO_X = { cocina: [262, 186], animo: [166, 186], maletas: [142, 186], obras: [380, GROUND], propina: [212, 186], chistorra: [372, GROUND], limpieza: [276, 186] };
const RESIDENT_SPOTS = {
  charizard: {
    manana: { x: 101, y: FLOOR0, nota: 'vigila la puerta' },
    dia: { x: 297, y: FLOOR0, nota: 'junto al fogón' },
    tarde: { x: 297, y: FLOOR0, nota: 'junto al fogón' },
    noche: { x: 297, y: FLOOR0, anim: 'Sleep', nota: 'dormido junto al fogón' },
  },
  manolo: {
    manana: { x: 124, y: FLOOR0, nota: 'en recepción' },
    dia: { x: 124, y: FLOOR0, nota: 'en recepción' },
    tarde: { x: 124, y: FLOOR0, nota: 'en recepción' },
    noche: { x: 124, y: FLOOR0, anim: 'Sleep', nota: 'se ha dormido en el mostrador' },
  },
  // desde que se quedó, Snorlax duerme junto al pino de la entrada (a su izquierda, sin tapar la cola)
  snorlax: Object.fromEntries(['manana', 'dia', 'tarde', 'noche'].map(f => [f, { x: 12, y: GROUND, anim: 'Sleep', nota: 'duerme junto al pino' }])),
};
const SNORLAX = { id: 'snorlax', especie: 'Snorlax', sprite: '0143' };

function newGame() {
  return { dia: 1, fase: 'manana', monedas: 0, chistorra: CHISTORRA_DIARIA, hoy: [], llegados: false,
    libro: {}, vuelven: [], ayer: [], mejoras: [], afinidad: {}, flags: {}, vistas: {},
    moral: MORAL_INICIAL, recetario: {}, plantilla: [],
    partida: Math.random().toString(36).slice(2, 10) };   // (para que las copias de días no se mezclen con otra partida)
}

// Los empleados: quien termina su historia puede quedarse a trabajar (si tiene «empleo»), con una ventaja
const PLANTILLA_BASE = 3;
const VENTAJA = {
  animo: 'el que llega triste sube un corazón', cocina: 'cocina un plato al día', maletas: 'sube las maletas',
  obras: 'las obras cuestan menos', propina: 'los huéspedes dejan más propina', chistorra: 'trae chistorra cada mañana',
  limpieza: 'aprueba sola la inspección',
};
// Los sucesos (uno cada 4 o 5 días): la inspección, el Team Rocket, la nevada, la tormenta con
// apagón y la lluvia de estrellas. La excursión va aparte: un autobús cada 3 días mientras queden
// grupos de una noche por venir (si compitiera con los demás, la partida duraba más de 150 días)
// los minijuegos con fuego (en los demás, un plato malo «se echa a perder», no «se quema»)
const FUEGO = new Set(['llama', 'vuelta', 'espeton', 'kebab', 'pizza']);
const SUCESOS = { inspeccion: 1, rocket: 1, nevada: 1, apagon: 1, estrellas: 1 };
const CADA_BUS = 3;

export function hasSave() {
  return !!load();
}

export async function createInn(scene, ui) {
  const data = await loadGuestData();
  let st = { ...newGame(), ...(load() || {}) };
  // partidas guardadas con huéspedes que ya no existen como tales (Moltres pasó a la guerra de los pájaros)
  const existe = id => data.guests.some(g => g.id === id);
  const sanear = () => {
    st.hoy = st.hoy.filter(h => existe(h.id));
    st.vuelven = (st.vuelven || []).filter(existe);
    st.ayer = (st.ayer || []).filter(existe);
    st.plantilla = (st.plantilla || []).filter(existe);
    // Snorlax, que se quedó a vivir junto al pino, no entraba en el libro de visitas
    if (st.flags?.snorlax_se_queda && !st.libro?.snorlax) st.libro = { ...st.libro, snorlax: { visitas: 1, ultimo: st.dia, felicidad: 5, mejor: 5 } };
  };
  sanear();
  // en qué visita va cada huésped (para su forma si evoluciona): la de hoy si está, si no la última
  // (por capítulos de su historia: la forma de su próximo capítulo; si una visita no se charla, no evoluciona)
  setVisitas(id => { const h = st.hoy.find(x => x.id === id); return h?.visita ?? ((st.vistas[id]?.length || 0) + (h ? 1 : 0)); });
  // los arcos de cada huésped (los que no tienen archivo quedan en null)
  const recetasData = await loadRecipes();
  const upgradesData = (await (await fetch('data/upgrades.json')).json()).upgrades;
  const buenosDias = (await (await fetch('data/buenosdias.json')).json()).lineas;
  const sobremesaData = await (await fetch('data/sobremesa.json')).json();
  const manoloAway = () => st.manoloFuera === st.dia && st.fase !== 'tarde' && st.fase !== 'noche';
  const has = id => st.mejoras.includes(id);
  // lo que pasa en un encargo según lo construido (p. ej. junto a la chimenea, solo si la hay)
  const hechoDe = p => (p.sin_mejora && !has(p.sin_mejora.mejora) ? p.sin_mejora.hecho : p.hecho);
  // la escena del encargo, con ese texto y el proveedor de ahora (la furgoneta que sube)
  const mostrar = o => ui.show?.({ ...o, pide: o.pide.hecho ? { ...o.pide, hecho: hechoDe(o.pide) } : o.pide, proveedor: st.proveedor });

  // Habitaciones que hay ahora mismo y quién cabe en cada una (Snorlax en ninguna: vive en el pino)
  function bedrooms() {
    return [...BASE_ROOMS, ...Object.entries(PLANTA_ROOMS).flatMap(([m, ids]) => (has(m) ? ids : [])),
      ...(has('buhardilla') ? ['buhardilla'] : []), ...(has('estanque') ? ['estanque'] : []),
      ...(has('cueva') ? ['cueva'] : []), ...(has('nido') ? ['nido'] : [])];
  }
  // las habitaciones de la casa, más una por los sitios de fuera (charca, cueva, nido) si hay alguno
  function cuartosDeVerdad() {
    const b = bedrooms();
    return b.filter(r => !FUERA.has(r)).length + (b.some(r => FUERA.has(r)) ? 1 : 0);
  }
  function fits(id, roomId) {
    const info = guestById(id);
    if (info.tam === 'grande') return false;
    if (info.tam === 'agua') return roomId === 'estanque';
    if (info.duerme) return roomId === info.duerme;          // los enormes, a la cueva; los pájaros grandes, al nido
    if (roomId === 'cueva' || roomId === 'nido') return false;
    if (info.solo_hab) return roomId === info.solo_hab;   // la pareja de Nidoran: solo la buhardilla
    if (roomId === 'estanque') return (info.tipos || []).includes('agua');
    return true;
  }
  const dialogues = Object.fromEntries(await Promise.all(data.guests.map(async g => [g.id, await loadDialogue(g.id)])));
  let selected = null;
  const actors = new Map();   // id -> Actor (residentes y huéspedes)
  const sprites = {};

  async function spriteFor(id) {
    if (!sprites[id]) sprites[id] = await loadSprite(id, ['Idle', 'Walk', 'Sleep']);
    return sprites[id];
  }

  // ---------- estrellas de la posada ----------
  function puntos() {
    return st.mejoras.reduce((a, id) => a + (upgradesData.find(u => u.id === id)?.puntos || 0), 0) + Math.floor((st.boca || 0) / BOCA);
  }
  function estrellas() {
    const p = puntos();
    return ESTRELLAS.filter(n => p >= n).length;
  }
  function syncEstrellas() {
    st.estrellas = estrellas();
    st.habitaciones = cuartosDeVerdad();
  }

  const sucesoHoy = id => st.suceso?.dia === st.dia && st.suceso.id === id;
  const empleado = v => (st.plantilla || []).some(id => guestById(id)?.empleo?.ventaja === v);
  const plazas = () => PLANTILLA_BASE + (has('taquillas') ? 2 : 0);
  // Los minijuegos de los sucesos y de algunos encargos (la leña, las velas, el café…): más difíciles
  // con los días, como la cocina. Devuelven perfecto, bien o «mal» (crudo o quemado: no salió)
  const nivelDia = () => Math.min(1, Math.max(0, (st.dia - 2) / 12));
  const jugar = (juego, opts = {}) => (ui.minijuego ? ui.minijuego(juego, { nivel: nivelDia(), moral: st.huelga ? 2 : st.moral, ...opts }) : Promise.resolve(null));
  const nota = r => (!r ? null : r.resultado === 'crudo' || r.resultado === 'quemado' ? 'mal' : r.resultado);
  let jugando = false;   // (que no se lance otro minijuego encima de uno en curso)
  function tiempo() {
    if (sucesoHoy('nevada') || st.nieve === st.dia) return 'nieve';
    if (sucesoHoy('apagon') && st.fase === 'noche') return 'tormenta';
    if (sucesoHoy('estrellas') && st.fase === 'noche') return 'estrellas';
    return null;
  }

  function publish() {
    scene.setTime(st.fase);
    scene.setRain(!!st.lluvia || tiempo() === 'tormenta');
    scene.setWeather?.(tiempo());
    scene.setUpgrades(st.mejoras);
    scene.setActors([...actors.values()]);
    ui.update(view());
  }

  function persist() {
    if (!save(st)) ui.toast('No se ha podido guardar la partida en este navegador.');
  }

  // ---------- personajes en escena ----------

  async function placeResidents() {
    const residentes = st.flags.snorlax_se_queda ? [...data.residentes, SNORLAX] : data.residentes;
    for (const r of residentes) {
      let spot = RESIDENT_SPOTS[r.id]?.[st.fase];
      if (r.id === 'charizard' && st.huelga) spot = { x: 60, y: GROUND, anim: st.fase === 'noche' ? 'Sleep' : 'Idle', nota: 'en huelga en el porche' };
      if (r.id === 'manolo' && manoloAway()) { actors.delete('manolo'); continue; }
      if (!spot) continue;
      let a = actors.get(r.id);
      if (!a) {
        a = new Actor(await spriteFor(r.sprite), { nombre: r.nombre || r.especie, offset: actors.size * 700 });
        a.residente = r.id;
        actors.set(r.id, a);
      }
      a.place(spot.x, spot.y, { anim: spot.anim || 'Idle' });
      a.nota = spot.nota;
      // con la moral baja, Charizard echa humo por la nariz
      if (r.id === 'charizard') {
        a.fuming = (st.huelga || humor(st.moral) === 'mal') && st.fase !== 'noche';
        if (a.fuming && !st.huelga) a.nota = 'de morros';
      }
    }
    // la plantilla: los que se quedaron a trabajar, cada uno en su puesto (si hoy no está de huésped)
    for (const [i, id] of (st.plantilla || []).entries()) {
      const key = `empleado-${id}`, info = guestById(id);
      if (!info || st.hoy.some(h => h.id === id)) { actors.delete(key); continue; }
      let a = actors.get(key);
      if (!a) {
        a = new Actor(await spriteFor(info.sprite), { nombre: info.hablante || info.especie, offset: 900 + i * 300 });
        a.residente = key;
        actors.set(key, a);
      }
      const [x, y] = PUESTO_X[info.empleo?.ventaja] || [200 + i * 10, 186];
      const antes = st.plantilla.slice(0, i).filter(o => guestById(o)?.empleo?.ventaja === info.empleo?.ventaja).length;
      a.place(x - antes * 16, y === 186 ? FLOOR0 : y, { anim: st.fase === 'noche' ? 'Sleep' : 'Idle' });
      a.nota = `trabaja aquí: ${info.empleo?.puesto || 'de todo'}`;
    }
  }

  // Contrata a quien acaba de terminar su historia (si quedan plazas)
  function contratar(id) {
    st.plantilla = st.plantilla || [];
    if (st.plantilla.includes(id) || st.plantilla.length >= plazas()) return false;
    st.plantilla.push(id);
    persist();
    placeResidents().then(publish);
    return true;
  }

  // El ayudante de cocina hace un plato al día él solo (sale bien, sin minijuego)
  function ayudanteCocina() {
    if (!empleado('cocina')) return null;
    const hoy = st.ayudantes?.dia === st.dia ? st.ayudantes.usados : [];
    const id = st.plantilla.find(x => guestById(x)?.empleo?.ventaja === 'cocina' && !hoy.includes(x));
    if (!id) return null;
    ayudanteCocina.ultimo = id;
    return guestById(id)?.hablante || guestById(id)?.especie;
  }
  function cocinaAyudante(id) {
    if (!ayudanteCocina()) return false;
    if (st.ayudantes?.dia !== st.dia) st.ayudantes = { dia: st.dia, usados: [] };
    st.ayudantes.usados.push(ayudanteCocina.ultimo);
    serveCooked(id, 'bien', { cocinero: ayudanteCocina.ultimo });
    return true;
  }

  // Dónde pasa la tarde cada uno. Se decide una vez al día (con semilla) y se guarda.
  function eleccionTarde(g) {
    if (g.tardeDia !== st.dia) {
      let seed = st.dia * 7919 + [...g.id].reduce((a, ch) => a + ch.charCodeAt(0) * 31, 0);
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const r = seed / 4294967296;
      const p = TARDE[g.id] || TARDE_DEF;
      g.tarde = r < p.comedor ? 'comedor' : r < p.comedor + (p.paseo || 0) ? 'paseo' : 'cuarto';
      g.tardeDia = st.dia;
    }
    return g.tarde;
  }
  function paseoSpots() {
    // los sitios de fuera que no ocupan el estanque ni el baño termal
    const cola = st.hoy.some(h => h.estado === 'puerta') || st.huelga;
    return PASEO_X.filter(x => !(cola && x < 90) && !(has('estanque') && x > 320 && x < 368) && !(has('termal') && x > 368) && x < 362);
  }
  const quiere = lugar => st.hoy.filter(h => h.estado === 'habitacion' && !FUERA.has(h.hab) && eleccionTarde(h) === lugar);
  // en el comedor caben tres y fuera hay los sitios que hay: el resto se queda en su cuarto
  const enComedor = () => quiere('comedor').slice(0, SEATS.length);
  const dePaseo = () => quiere('paseo').slice(0, paseoSpots().length);
  function tardeDe(g) {
    if (st.fase !== 'tarde' || g.estado !== 'habitacion') return null;
    return enComedor().includes(g) ? 'comedor' : dePaseo().includes(g) ? 'paseo' : 'cuarto';
  }

  // Sitio en la cola de la puerta: tres huecos (dos si Charizard hace huelga en el porche);
  // los demás esperan en el camino, fuera de la vista, y se acercan cuando queda sitio
  function queueX(i) {
    // (con Snorlax viviendo junto al pino, el último sitio no cabe)
    const slots = st.huelga ? [82, 40] : st.flags.snorlax_se_queda ? QUEUE.slice(0, 3) : QUEUE;
    return slots[i] ?? -40 - (i - slots.length) * 26;
  }

  function guestSpot(g) {
    // los de la excursión, de picnic fuera de la casa: a la derecha (si no está ocupada) o junto al pino
    if (g.estado === 'excursion') return { x: !has('estanque') ? 362 : !has('termal') ? 384 : 369, y: GROUND, anim: 'Idle' };
    if (g.estado === 'puerta') {
      const i = st.hoy.filter(h => h.estado === 'puerta').indexOf(g);
      return { x: queueX(i), y: GROUND, anim: 'Idle' };
    }
    const room = ROOM[g.hab];
    if (st.fase === 'noche') return { x: BED_X[g.hab], y: SUELO[g.hab]?.[0] ?? room.y + room.h - 8, anim: 'Sleep' };
    if (st.fase === 'tarde') {
      const donde = tardeDe(g);
      if (donde === 'comedor') return { x: SEATS[enComedor().indexOf(g)], y: FLOOR0, anim: 'Idle' };
      if (donde === 'paseo') return { x: paseoSpots()[dePaseo().indexOf(g)], y: GROUND, anim: 'Idle' };
      // si no, en su cuarto (o en el estanque, quien vive en el agua)
    }
    return { x: STAND_X[g.hab], y: SUELO[g.hab]?.[1] ?? room.y + room.h - 2, anim: 'Idle' };
  }

  function moodOf(g) {
    if (st.fase === 'noche') return null;
    if (g.estado === 'excursion') return charlaOf(g) ? 'charla' : 'contento';
    if (g.estado === 'puerta') return guestById(g.id).tam === 'grande' && charlaOf(g) ? 'charla' : 'espera';
    if (!g.atendido) return 'pide';
    const f = felicidad(g);
    if (f <= 1) return 'triste';
    // por la tarde, el bocadillo avisa de que tiene algo que contar en el comedor
    return charlaOf(g) || (st.fase === 'tarde' && !g.sobremesa && sobremesaOf(g) && !sobremesaOf(g).fuera) ? 'charla' : f >= 4 ? 'contento' : 'regular';
  }

  // ---------- charlas (vista B) ----------

  function talkCtx(id) {
    return { visita: (st.libro[id]?.visitas || 0) + 1, afinidad: st.afinidad[id] || 0, flags: st.flags };
  }

  // La entrada de arco que toca hoy con este huésped (una por visita)
  function charlaOf(g) {
    if (g.charlado || st.fase === 'noche') return null;
    const e = nextEntry(dialogues[g.id], talkCtx(g.id), st.vistas[g.id]);
    // con la nieve nadie puede irse: los capítulos de paso esperan a otra visita
    if (e?.de_paso && g.estado !== 'puerta') return null;
    return e;
  }

  // Quien ya ha contado toda su historia (ha visto su último capítulo) se despide y no vuelve:
  // así dejan sitio a otros y no se repite
  function terminados() {
    return new Set(data.guests.filter(g => (dialogues[g.id]?.entradas || [])
      .some(e => e.fin_arco && (st.vistas[g.id] || []).includes(e.id))).map(g => g.id));
  }

  function beginTalk(id) {
    const g = st.hoy.find(h => h.id === id);
    const entry = g && charlaOf(g);
    if (!entry) return null;
    selected = null;
    return { entry, visita: talkCtx(id).visita };
  }

  // Se va sin quedarse (le dijiste que no, o está todo lleno): vuelve otro día
  // Quien charló en la puerta pero se va sin pasar la noche: esa visita no cuenta. Vuelve con la misma forma
  // y repite la charla (sin volver a dar cariño ni monedas por las mismas respuestas), así no se salta su estancia
  function sinNoche(g) {
    if (!g?.capitulo || g.capDePaso || g.estado !== 'puerta') return;
    const vistas = [...(st.vistas[g.id] || [])];
    const i = vistas.lastIndexOf(g.capitulo);
    if (i >= 0) vistas.splice(i, 1);
    st.vistas[g.id] = vistas;
    st.repite = { ...st.repite, [g.id]: g.capitulo };
  }

  function sendAway(id) {
    const g = st.hoy.find(h => h.id === id);
    if (!g) return;
    sinNoche(g);
    st.hoy = st.hoy.filter(h => h !== g);
    if (!st.vuelven.includes(id)) st.vuelven.push(id);
    const a = actors.get(id);
    if (a) { a.mood = 'triste'; a.walkTo(-40, GROUND, { dir: DIR.left, speed: 40, then: () => { actors.delete(id); publish(); } }); }
    for (const h of st.hoy.filter(x => x.estado === 'puerta')) {
      const s2 = guestSpot(h);
      actors.get(h.id)?.walkTo(s2.x, s2.y, { then: () => refreshGuest(h) });
    }
    selected = null;
    persist();
    publish();
  }

  // Para no repetir: «preguntado» = ya pidió habitación en recepción; «oido» = ya contó en su
  // cuarto lo que necesita
  // ---------- sobremesa: lo que cuentan por la tarde en el comedor ----------

  // Una cosa nueva por tarde: primero las charlas entre dos que coinciden (una sola vez),
  // luego sus frases en orden; si ya ha hablado hoy, solo se le ve hacer lo suyo
  function sobremesaOf(g) {
    if (st.fase !== 'tarde' || g.estado !== 'habitacion' || !g.atendido) return null;
    // si ha evolucionado y tiene líneas propias para esa forma («id:número»), esas
    const mine = sobremesaData.huespedes[`${g.id}:${guestById(g.id).dex}`] || sobremesaData.huespedes[g.id];
    if (!mine) return null;
    // quien no baja al comedor no cuenta nada: se le ve a lo suyo, en su cuarto o de paseo. Los que
    // duermen fuera (charca, cueva, nido) no caben en el comedor: charlan en la puerta de su sitio,
    // y los del comedor salen a verlos (así sus charlas en pareja también salen)
    const deFuera = FUERA.has(g.hab);
    const lugar = deFuera ? 'comedor' : tardeDe(g);
    if (lugar !== 'comedor') return { gesto: mine[lugar] ? alDia(mine[lugar], [g.id]) : `(${guestById(g.id).especie} ${lugar === 'paseo' ? 'ha salido a dar un paseo' : 'se ha quedado en su cuarto'}.)`, fuera: true };
    if (g.sobremesa) return { gesto: alDia(mine.gesto, [g.id]) };
    const here = new Set([...enComedor(), ...st.hoy.filter(h => h.estado === 'habitacion' && FUERA.has(h.hab) && h.atendido)].map(h => h.id));
    const pareja = sobremesaData.parejas.find(p => (p.a === g.id || p.b === g.id) && here.has(p.a) && here.has(p.b)
      && !st.flags[`sobremesa_${p.a}_${p.b}`]);
    if (pareja) return { pareja: { key: `sobremesa_${pareja.a}_${pareja.b}`, lineas: pareja.lineas.map(([q, e, t]) => [q, e, alDia(t, [pareja.a, pareja.b])]) } };
    const n = (st.sobremesa ||= {})[g.id] || 0;
    const base = mine.lineas[n % mine.lineas.length];
    const linea = { ...base, texto: alDia(base.texto, [g.id]) };
    const comio = guestById(g.id).pide[g.pide]?.tipo === 'comida';
    const plato = comio ? sobremesaData.plato[g.atendido === 'perfecto' ? 'perfecto' : g.atendido === 'frio' ? 'frio' : 'bien'] : null;
    return { ...linea, plato };
  }

  // Las charlas de la tarde se escribieron con el nombre de su primera forma: si alguno ya ha evolucionado,
  // se le llama por el de ahora (Growlithe → Arcanine), sin tocar los nombres de formas que aún no tiene
  function alDia(texto, ids) {
    if (!texto) return texto;
    for (const id of ids) {
      const g = guestBase(id);
      if (!g?.evoluciones?.length) continue;
      const formas = [g.especie, ...g.evoluciones.map(e => e.especie).filter(Boolean)];
      const ahora = guestById(id).especie, i = formas.indexOf(ahora);
      for (const viejo of formas.slice(0, Math.max(0, i))) if (viejo !== ahora) texto = cambiaPalabra(texto, viejo, ahora);
    }
    return texto;
  }
  // cambia una palabra entera (no «Growlithes» ni dentro de otra), sin expresiones regulares
  function cambiaPalabra(texto, viejo, nuevo) {
    const letra = ch => !!ch && ch.toLowerCase() !== ch.toUpperCase();
    let out = '', i = 0;
    for (let j = texto.indexOf(viejo); j >= 0; j = texto.indexOf(viejo, j + viejo.length)) {
      if (letra(texto[j - 1]) || letra(texto[j + viejo.length])) continue;
      out += texto.slice(i, j) + nuevo;
      i = j + viejo.length;
    }
    return out + texto.slice(i);
  }

  function markSobremesa(id, parejaKey = null) {
    const g = st.hoy.find(h => h.id === id);
    if (!g || g.sobremesa) return;
    g.sobremesa = true;
    if (parejaKey) st.flags[parejaKey] = true;
    else { st.sobremesa ||= {}; st.sobremesa[id] = (st.sobremesa[id] || 0) + 1; }
    refreshGuest(g);
    persist();
    publish();
  }

  function markHeard(id, what = 'oido') {
    const g = st.hoy.find(h => h.id === id);
    if (g && !g[what]) { g[what] = true; persist(); }
  }

  function applyEffects(id, ef) {
    if (ef.se_va) leavesAfterTalk = id;
    // (si está repitiendo una charla que ya tuvo, el cariño y las monedas ya se dieron la otra vez)
    const repite = !!st.repite?.[id];
    if (ef.afinidad && !repite) st.afinidad[id] = Math.max(0, Math.min(5, (st.afinidad[id] || 0) + ef.afinidad));
    if (ef.flags) Object.assign(st.flags, ef.flags);
    if (ef.monedas && !repite) st.monedas += ef.monedas;
  }

  let leavesAfterTalk = null;
  async function endTalk(id, entry) {
    const g = st.hoy.find(h => h.id === id);
    if (g) g.charlado = true;
    // si la charla acaba con el huésped marchándose, no cuenta como vista: la repetirá
    if (leavesAfterTalk === id) {
      leavesAfterTalk = null;
      sendAway(id);
      // al que se ha ido con un desaire le cuesta unos días volver (no vuelve al día siguiente el primero de la cola)
      st.desaire = { ...st.desaire, [id]: st.dia + 4 };
      return { seVa: true };
    }
    st.vistas[id] = [...(st.vistas[id] || []), entry.id];
    if (g) { g.capitulo = entry.id; g.capDePaso = !!entry.de_paso; }
    if (st.repite?.[id]) { const { [id]: _, ...resto } = st.repite; st.repite = resto; }
    const infoE = guestById(id);
    const oferta = entry.fin_arco && infoE?.empleo && !(st.plantilla || []).includes(id)
      ? { id, nombre: infoE.hablante || infoE.especie, puesto: infoE.empleo.puesto, ventaja: VENTAJA[infoE.empleo.ventaja], dePaso: !!entry.de_paso, lleno: (st.plantilla || []).length >= plazas() } : null;
    // Snorlax se queda a vivir junto al pino
    if (id === 'snorlax' && st.flags.snorlax_se_queda) {
      // (y entra en el libro de visitas, aunque no duerma en ningún cuarto)
      const e = st.libro.snorlax || { visitas: 0, ultimo: 0 };
      e.visitas += 1; e.ultimo = st.dia; e.felicidad = 5; e.mejor = 5;
      st.libro.snorlax = e;
      st.hoy = st.hoy.filter(h => h.id !== 'snorlax');
      actors.delete('snorlax');
      await placeResidents();
      for (const h of st.hoy.filter(x => x.estado === 'puerta')) {
        const s2 = guestSpot(h);
        actors.get(h.id)?.place(s2.x, s2.y);
      }
    }
    // quien venía solo de paso (o el grupo de la excursión) se despide y se va: deja sitio a otros
    if (g && (g.estado === 'excursion' || (entry.de_paso && g.estado === 'puerta'))) {
      despedir(g);
      return { seVa: true, oferta };
    }
    for (const h of st.hoy) refreshGuest(h);
    persist();
    publish();
    return { seVa: false, oferta };
  }

  // Se va tras la charla, sin dormir: cuenta como visita en el libro y sale en el resumen de la noche
  function despedir(g) {
    const info = guestById(g.id);
    st.hoy = st.hoy.filter(h => h !== g);
    st.vuelven = st.vuelven.filter(x => x !== g.id);
    const entry = st.libro[g.id] || { visitas: 0, ultimo: 0 };
    entry.visitas += 1;
    entry.ultimo = st.dia;
    entry.forma = Math.max(entry.forma || 0, (guestBase(g.id).evoluciones || []).filter(e => e.visita <= (g.visita || 1)).length);
    st.libro[g.id] = entry;
    // el grupo de la excursión paga lo que ha tomado
    const paga = g.estado === 'excursion' ? 4 * (info.miembros || []).length : 0;
    st.monedas += paga;
    st.dePaso = (st.dePaso?.dia === st.dia ? st.dePaso : { dia: st.dia, filas: [] });
    st.dePaso.filas.push({ sprite: info.sprite, nombre: info.especie, corazones: null, excursion: g.estado === 'excursion', paga, propina: 0, fama: 0,
      motivos: [g.estado === 'excursion' ? 'vinieron de excursión por la mañana y se fueron en el autobús' : esPlural(g.id) ? 'vinieron de paso: charlasteis y siguieron su camino' : 'vino de paso: charlasteis y siguió su camino'] });
    const a = actors.get(g.id);
    if (a) { a.mood = 'contento'; a.walkTo(-40, GROUND, { dir: DIR.left, speed: 40, then: () => { actors.delete(g.id); publish(); } }); }
    for (const h of st.hoy.filter(x => x.estado === 'puerta')) {
      const s2 = guestSpot(h);
      actors.get(h.id)?.walkTo(s2.x, s2.y, { then: () => refreshGuest(h) });
    }
    selected = null;
    persist();
    publish();
  }

  async function guestActor(g) {
    let a = actors.get(g.id);
    if (!a) {
      const info = guestById(g.id);
      a = new Actor(await spriteFor(info.sprite), { nombre: info.especie, offset: actors.size * 530 });
      if (info.acompanante) a.buddy = new Actor(await spriteFor(info.acompanante), { offset: actors.size * 530 + 260 });
      a.huesped = g.id;
      actors.set(g.id, a);
    }
    return a;
  }

  async function placeGuests() {
    for (const g of st.hoy) {
      const a = await guestActor(g);
      const s = guestSpot(g);
      a.place(s.x, s.y, { anim: s.anim });
      refreshGuest(g);
    }
  }

  function refreshGuest(g) {
    const a = actors.get(g.id);
    if (!a) return;
    // si sube o baja de corazones, se le ve: un corazón que sube (o uno roto que cae)
    const antes = a.hearts, ahora = felicidad(g);
    if (antes != null && ahora != null && ahora !== antes && st.fase !== 'noche') a.pop = { t: performance.now(), up: ahora > antes };
    a.mood = moodOf(g);
    a.clip = g.estado === 'habitacion' && g.hab === 'cueva' ? BOCA_CUEVA : null;
    // Larvitar llora por las esquinas hasta que pasa página (o hasta que se va contento)
    a.llora = g.id === 'larvitar' && !st.flags.larvitar_supera && felicidad(g) < 4;
    a.hearts = felicidad(g);
    a.nota = notaOf(g);
    a.selected = selected === g.id;
  }

  // ---------- felicidad (0-5 corazones) ----------
  // Sale de cómo se le ha tratado hoy: si se le atendió (y cómo salió el plato), si se le
  // hizo esperar en la puerta, si se charló con él y de qué humor está Charizard
  // (de buen humor les sube las maletas; de morros los recibe echando humo).
  function felicidad(g) {
    if (g.estado !== 'habitacion') return null;
    let f = 1;
    const at = g.atendido;
    if (at === 'perfecto') f += 2;
    else if (at === 'frio') f += 0;          // de la despensa: no suma, pero ya no resta
    else if (at && !g.crudo && !g.fallo) f += 1;   // (si el minijuego del encargo salió mal, no suma)
    else if (!at && st.fase === 'noche') f -= 1;
    if (g.charlado) f += 1;
    if (colorGusta(g)) f += 1;
    if (decorGusta(g)) f += 1;
    f -= Math.min(2, (g.espero ? 1 : 0) + (g.esperaFases || 0));
    const h = g.recibido || (st.huelga ? 'mal' : humor(st.moral));
    if (h === 'bien') f += 1;
    else if (h === 'mal') f -= 1;
    if (h !== 'bien' && empleado('maletas')) f += 1;   // un empleado le sube las maletas
    f += g.extra || 0;                                   // la especialidad, la tormenta, las estrellas…
    if (empleado('animo') && f <= 2) f += 1;             // la enfermera de la plantilla le anima
    return Math.max(0, Math.min(5, f));
  }

  // ¿Duerme en una habitación de su color? (roja: fuego y lucha; azul: agua; verde: planta…)
  function colorGusta(g) {
    const col = COLORES[ROOM[g.hab]?.color];
    return !!col && (guestById(g.id).tipos || []).some(t => col.tipos.includes(t));
  }

  function decorGusta(g) {
    return !!GUSTOS[g.id] && has(GUSTOS[g.id]);
  }

  // Por qué está así, para el libro y el resumen de la noche
  function motivos(g) {
    const m = [];
    const les = esPlural(g.id) ? 'les' : 'le';
    if (decorGusta(g)) { const d = DECOR_NOMBRE[GUSTOS[g.id]]; m.push(`${les} ${/^l[oa]s /.test(d) ? 'encantaron' : 'encantó'} ${d}`); }
    if (colorGusta(g)) m.push(`${les} encantó la habitación ${COLORES[ROOM[g.hab].color].nombre}`);
    if (g.atendido === 'perfecto') m.push('el plato le salió perfecto');
    else if (g.atendido === 'frio') m.push('comió algo frío');
    else if (g.fallo) m.push(g.fallo);
    else if (g.crudo) m.push('el plato salió algo crudo');
    else if (g.chill) m.push(esPlural(g.id) ? 'vinieron a descansar, sin pedir nada' : 'vino a descansar, sin pedir nada');
    else if (g.atendido === true) m.push(`${esPlural(g.id) ? 'les' : 'le'} trajiste lo que ${esPlural(g.id) ? 'pedían' : 'pedía'}`);
    else if (!g.atendido) m.push('nadie le atendió');
    m.push(...(g.mj || []));   // lo de los minijuegos: el café de pizarra, las maletas, la chimenea…
    if (g.charlado) m.push('charlasteis un rato');
    if (g.espero || g.esperaFases) m.push('le hiciste esperar en la puerta');
    const h = g.recibido || (st.huelga ? 'mal' : humor(st.moral));
    if (h === 'bien') m.push('Charizard le subió las maletas');
    else if (h === 'mal') m.push('Charizard le recibió echando humo');
    return m;
  }

  // los que vienen en pareja (Nidoran♂ y Nidoran♀, Marinilla y su Poliwag): el resumen va en plural
  function esPlural(id) {
    const info = guestById(id);
    return !!info.acompanante || / y /.test(info.especie);
  }

  function notaOf(g) {
    if (g.estado === 'excursion') return 'de excursión';
    if (g.estado === 'puerta') return guestById(g.id).tam === 'grande' ? 'no cabe por la puerta' : 'espera habitación';
    const hab = ROOM[g.hab].nombre.toLowerCase();
    if (st.fase === 'noche') return `duerme en la ${hab}`;
    const f = felicidad(g);
    const donde = { comedor: 'en el comedor', paseo: 'de paseo' }[tardeDe(g)] || hab;
    return `${g.atendido ? FELIZ[f] : 'pide algo'} · ${donde}`;
  }

  // ---------- la mañana: llegan ----------

  // En qué visita va: la de su próximo capítulo (si se ha saltado uno que pedía afinidad, la del
  // siguiente), para que la forma con la que llega (si evoluciona) cuadre con lo que va a contar
  function visitaProxima(id) {
    const e = nextEntry(dialogues[id], talkCtx(id), st.vistas[id]);
    return Math.max((st.vistas[id]?.length || 0) + 1, e?.cuando?.visita_min || 0);
  }

  async function arrive() {
    if (st.fase !== 'manana') return;   // si se pasó de fase antes de que llegasen, ya no suben
    syncEstrellas();
    // la excursión: el grupo baja del autobús, se le ve su evento entero y se va; luego suben los demás
    const bus = st.bus?.dia === st.dia ? st.bus : sucesoHoy('excursion') ? st.suceso : null;   // (o la de una partida antigua)
    const grupo = bus && !bus.grupo && cameosPendientes()[0];
    let g = st.hoy.find(h => h.estado === 'excursion' && charlaOf(h));   // (uno a medias, si se recargó la página)
    if (grupo && !g) {
      bus.grupo = grupo.id;
      g = { id: grupo.id, pide: 0, estado: 'excursion', hab: null, atendido: true, visita: 1 };
      st.hoy.push(g);
    }
    if (g) {
      const a = await guestActor(g);
      a.place(guestSpot(g).x, GROUND);
      refreshGuest(g);
      persist();
      publish();
      if (ui.evento) await ui.evento(g.id);
    }
    if (st.fase !== 'manana') return;
    st.llegados = true;
    // tras el final (todo el libro completo), los de siempre vuelven de visita, ya sin historia nueva
    const ocupadas = st.hoy.length;   // los que se quedaron por la nevada
    // con el camino nevado no sube nadie: solo están los de anoche
    // (si Charizard ha abierto el camino a fuego, sube alguno: dos como mucho, o uno si quedó a medias)
    const abierto = st.camino?.dia === st.dia ? st.camino.abierto : 0;
    const llegan = st.nieve === st.dia && !abierto ? [] : pickArrivals(st, st.finalVisto ? new Set() : terminados(), visitaProxima)
      .filter(l => !st.hoy.some(h => h.id === l.id) && !((st.desaire?.[l.id] || 0) > st.dia)).slice(0, Math.max(0, Math.min(st.nieve === st.dia ? abierto : 99, cuartosDeVerdad() + 1 - ocupadas)));
    st.vuelven = st.vuelven.filter(id => !llegan.some(l => l.id === id));
    for (const [i, l] of llegan.entries()) {
      // quien no pide nada viene a descansar: ya está atendido
      const chill = l.pide == null;
      const h = { id: l.id, pide: l.pide, dex: l.dex, chill, estado: 'puerta', hab: null, atendido: chill, visita: visitaProxima(l.id) };
      st.hoy.push(h);
      const a = await guestActor(h);
      a.place(-24 - i * 26, GROUND, { anim: 'Walk', dir: DIR.right });
      a.mood = null;
      a.walkTo(queueX(i), GROUND, { then: () => { refreshGuest(h); publish(); } });
    }
    persist();
    publish();
    if (llegan.length) {
      const nombres = llegan.map(l => guestById(l.id).especie);
      const sitios = st.huelga ? 2 : st.flags.snorlax_se_queda ? 3 : QUEUE.length;
      const esperan = nombres.length > sitios ? ` Los que no caben en la puerta esperan en el camino y se acercan cuando queda sitio.` : '';
      ui.say('charizard', 'Surprised', `¡Grrr! Charizard avisa: ${nombres.length === 1 ? 'llega' : 'llegan'} ${listar(nombres)} por el camino. Tócalos para atenderlos.${esperan}`);
    }
  }

  // ---------- acciones ----------

  function select(id) {
    focus(selected === id ? null : id);
  }

  // El huésped con el que se está hablando (o nadie, con null)
  function focus(id) {
    selected = id;
    for (const g of st.hoy) refreshGuest(g);
    publish();
  }

  function clickRoom(room) {
    if (room.cerrada) return ui.toast('La buhardilla está tapiada. Habrá que repararla algún día.');
    const occupant = st.hoy.find(g => g.hab === room.id);
    if (!bedrooms().includes(room.id)) {
      return ui.toast(room.id === 'cocina' ? 'Charizard vigila el fogón. La cocina abre más adelante.' : `${room.nombre}: todo en orden.`);
    }
    const g = st.hoy.find(h => h.id === selected);
    if (!g || g.estado !== 'puerta') {
      if (occupant) return ui.toast(`${room.nombre}: la ocupa ${guestById(occupant.id).especie}.`);
      return ui.toast(`${room.nombre}: libre. Toca a un huésped de la puerta para darle habitación.`);
    }
    if (st.fase === 'noche') return;
    if (occupant) return ui.toast(`${room.nombre} ya está ocupada por ${guestById(occupant.id).especie}.`);
    if (!fits(g.id, room.id)) {
      const info = guestById(g.id);
      if (room.id === 'estanque') return ui.say('manolo', 'Normal', `El estanque es para los de agua. ${info.especie} mejor en una cama.`);
      if (info.solo_hab) return ui.say('manolo', 'Happy', info.solo_hab_dice || `${info.especie} solo quieren la ${ROOM[info.solo_hab].nombre.toLowerCase()}.`);
      if (info.duerme) return ui.say('manolo', 'Sigh', `${info.especie} no cabe en la casa: necesita ${info.duerme === 'cueva' ? 'la cueva' : 'el nido del pino'}.`);
      if (room.id === 'cueva' || room.id === 'nido') return ui.say('manolo', 'Normal', `${room.id === 'cueva' ? 'La cueva' : 'El nido'} es para los que no caben en casa. ${info.especie}, mejor en una cama.`);
      return ui.say('manolo', 'Sigh', info.tam === 'agua' ? `${info.especie} necesita agua de verdad: solo le vale el estanque.`
        : `${info.especie} no cabe en la ${room.nombre.toLowerCase()}. Ni en ninguna, la verdad.`);
    }
    assign(g, room);
  }

  function assign(g, room) {
    ui.sfx?.('bell');
    if (g.pide != null) ((st.historialPide ||= {})[`${g.id}:${g.dex ?? guestById(g.id).dex}`] ||= []).push(g.pide);
    g.estado = 'habitacion';
    g.recibido = st.huelga ? 'mal' : humor(st.moral);   // cómo estaba Charizard cuando llegó (las maletas, el humo)
    g.hab = room.id;
    selected = null;
    const a = actors.get(g.id);
    a.mood = null;
    // entra por la puerta y aparece en su habitación
    a.walkTo(DOOR, GROUND, { dir: DIR.right, then: () => {
      const s = guestSpot(g);
      a.place(s.x, s.y, { anim: s.anim });
      refreshGuest(g);
      // los que siguen en la puerta se arriman
      for (const h of st.hoy.filter(x => x.estado === 'puerta')) {
        const s2 = guestSpot(h);
        actors.get(h.id).walkTo(s2.x, s2.y, { then: () => refreshGuest(h) });
      }
      publish();
    } });
    for (const h of st.hoy) refreshGuest(h);
    a.mood = null;
    persist();
    publish();
    if (manoloAway()) ui.say('charizard', 'Normal', `Charizard señala con la cola: ${room.id === 'estanque' ? 'al estanque' : `a la ${room.nombre.toLowerCase()}`}. Sin palabras, pero se entiende.`);
    else ui.say('manolo', 'Happy', room.id === 'estanque'
      ? `${guestById(g.id).especie}, el estanque es todo tuyo. ¡Al agua!`
      : `${guestById(g.id).especie}, te doy la ${room.nombre.toLowerCase()}. ¡Sube, que está la cama hecha!`);
    if (tetrisDeMaletas(g)) esperarLibre(() => subirMaletas(g), 1600);
  }

  // El Tetris de maletas: al dar habitación a quien trae mucho equipaje (o a cualquiera, si Charizard
  // está de morros), si no hay mozo de las maletas en la plantilla ni Charizard de buen humor
  // (entonces las sube él sin rechistar). Una vez al día como mucho.
  // espera a que la pantalla sea la posada, sin charla ni cocina en marcha (como mucho ~20 s; si no, se deja)
  function esperarLibre(fn, ms, intentos = 20) {
    setTimeout(() => {
      if (!jugando && (ui.libre?.() ?? true)) fn();
      else if (intentos > 0) esperarLibre(fn, 1000, intentos - 1);
    }, ms);
  }
  function tetrisDeMaletas(g) {
    const h = humor(st.moral);
    if (jugando || st.maletasDia === st.dia || st.huelga || empleado('maletas') || h === 'bien' || FUERA.has(g.hab)) return false;
    if (st.fase !== 'manana' && st.fase !== 'dia') return false;
    if (guestById(g.id).equipaje) return true;
    // de morros, alguna vez sube él también las de los demás (no a diario: como mucho cada tres días)
    return h === 'mal' && st.dia - (st.maletasDia || -9) >= 3 && Math.random() < 0.35;
  }
  async function subirMaletas(g) {
    if (jugando || !st.hoy.includes(g) || st.maletasDia === st.dia) return;
    jugando = true;
    st.maletasDia = st.dia;
    const info = guestById(g.id);
    const morros = humor(st.moral) === 'mal';
    const r = await jugar('maletas', { texto: `${info.especie} trae ${info.equipaje ? 'equipaje para un mes' : 'sus maletas'}. Charizard${morros ? ', de morros,' : ''} las sube colgadas de la cola: toca para soltar cada maleta encima de la pila.` });
    jugando = false;
    const res = nota(r) || 'bien';
    if (res === 'perfecto') { g.propinaExtra = (g.propinaExtra || 0) + 5; (g.mj ||= []).push('sus maletas subieron como en el Tetris'); }
    if (res === 'mal') { g.extra = (g.extra || 0) - 1; (g.mj ||= []).push('sus maletas rodaron por la escalera'); }
    ui.say('manolo', res === 'mal' ? 'Sad' : 'Happy', res === 'perfecto' ? `Seis maletas arriba y ni una por la escalera. Esto es el Tetris de toda la vida. ${info.especie} deja propina por el arte.`
      : res === 'bien' ? 'Las maletas, arriba. Alguna un poco torcida, pero nada que no arregle un empujón.'
      : `Las maletas han acabado rodando por la escalera. ${info.especie} las recoge una a una, con cara de pocos amigos.`);
    refreshGuest(g);
    persist();
    publish();
  }

  function attend() {
    const g = st.hoy.find(h => h.id === selected);
    if (!g) return ui.toast('Toca a un huésped para ver qué necesita.');
    const info = guestById(g.id);
    if (g.estado === 'puerta') return ui.toast(`${info.especie} aún espera en la puerta: dale primero una habitación.`);
    if (st.fase === 'noche') return ui.toast('Es de noche: todo el mundo duerme.');
    if (g.atendido) return ui.toast(`${info.especie} ya tiene lo que quería.`);
    const pide = info.pide[g.pide];
    const juego = juegoDelEncargo(g, info, pide);
    if (juego) return encargoConJuego(g, info, pide, juego);
    let line;
    if (pide.tipo === 'comida') {
      g.atendido = 'frio';
      line = ['manolo', 'Worried', `${info.especie} quería ${pide.plato}. Le saco algo frío de la despensa, que no hay tiempo de cocinar.`];
    } else {
      g.atendido = true;
      line = [pide.quien || 'manolo', pide.gesto || 'Happy', hechoDe(pide)];
    }
    ui.say(...line);
    mostrar({ guest: info, pide, helper: line[0], fase: st.fase, atendido: g.atendido, hab: g.hab });
    refreshGuest(g);
    persist();
    publish();
  }

  // Algunos encargos de servicio tienen su minijuego: el café (a la malagueña), la planta de
  // Bulbasaur (regadera o linterna, sin que la vea la agente Mara) y el baño en el termal
  function juegoDelEncargo(g, info, pide) {
    if (pide.tipo === 'comida' || !ui.minijuego) return null;
    if (pide.objeto === 'cafe' && !/\bté(?![a-zñáéíóú])/i.test(`${pide.texto} ${pide.dice}`)) return 'cafe';
    if (g.id === 'bulbasaur' && (pide.objeto === 'regadera' || pide.objeto === 'linterna')) return 'planta';
    if (pide.termal && has('termal')) return 'termal';
    return null;
  }
  async function encargoConJuego(g, info, pide, juego) {
    if (jugando) return;
    jugando = true;
    selected = null;
    const quien = info.hablante || info.especie;
    let datos, texto, who, emocion;
    if (juego === 'cafe') {
      // el café que pide (o uno al azar, siempre el mismo para cada uno)
      const tipos = ['solo', 'corto', 'mitad', 'sombra', 'nube'];
      const tipo = pide.cafe || tipos[[...g.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % tipos.length];
      datos = { tipo, especie: info.especie, sprite: info.sprite };
      texto = `Marchando un ${tipo} para ${info.especie}, como en el Café Central de Málaga. Mantén pulsado para echar y suelta justo en la raya.`;
    } else if (juego === 'planta') {
      // en su última visita (Venusaur) la «flor» ya es legal: la agente Mara solo saluda
      const legal = info.dex === 3;
      datos = { modo: pide.objeto, sprite: info.sprite, legal };
      texto = legal ? '¡Agua para la flor, y a la vista de todos! Que pase la agente Mara, que hoy no tenemos nada que esconder.'
        : pide.objeto === 'linterna' ? 'La linterna, a ratos. Como asome el coche de la agente Mara y la vea encendida, Bulbasaur duerme en el calabozo.'
        : 'Riego la planta, pero con disimulo. Si asoma la agente Mara por la carretera y nos pilla regando, Bulbasaur duerme en el calabozo.';
    } else {
      // el termal: cada uno a su punto; a veces se cuela un Psyduck y hay que enfriarlo de golpe
      datos = { punto: pide.termal, sprite: info.sprite, especie: info.especie, psyduck: Math.random() < 0.35 };
      texto = `${info.especie} quiere el termal ${pide.termal}. Charizard, tú calientas: mantén pulsado para más fuego y suelta para que se enfríe.`;
    }
    // la planta: primero se le da la regadera (o la linterna), con su escena, y luego se riega a escondidas
    const antes = juego === 'planta';
    if (antes) {
      ui.say(pide.quien || 'manolo', pide.gesto || 'Happy', hechoDe(pide));
      await mostrar({ guest: info, pide, helper: pide.quien || 'manolo', fase: st.fase, atendido: true, hab: g.hab });
    }
    const r = await jugar(juego, { datos, texto, who, emocion });
    jugando = false;
    const res = nota(r) || 'bien';
    g.atendido = true;
    let line = antes ? ['manolo', 'Happy', `La planta, ${pide.objeto === 'linterna' ? 'alumbrada' : 'regada'} y sin que nadie se entere. ${quien} se queda mirándola muy orgulloso.`]
      : [pide.quien || 'manolo', pide.gesto || 'Happy', hechoDe(pide)];
    if (juego === 'cafe') {
      if (res === 'perfecto') { g.extra = (g.extra || 0) + 1; g.propinaExtra = (g.propinaExtra || 0) + 5; (g.mj ||= []).push(`el café, un ${datos.tipo} de pizarra`); line = ['manolo', 'Happy', `Un ${datos.tipo} de pizarra. ${info.especie} lo prueba, cierra los ojos y deja la propina debajo del platillo.`]; }
      if (res === 'mal' || (r?.suyo && r.suyo !== 'good')) {
        const corto = r?.suyo === 'cold';
        g.fallo = corto ? 'su café se quedó corto' : 'le pusiste un manchado en vez de su café';
        line = ['manolo', 'Sad', corto ? `Eso no llega ni a ${datos.tipo}: se ha quedado en un dedal. ${info.especie} lo mira, lo mira otra vez y suspira.`
          : `Eso no es un ${datos.tipo}: eso es un manchado. ${info.especie} pone cara de domingo por la tarde.`];
      }
    } else if (juego === 'planta') {
      if (res === 'perfecto') { g.extra = (g.extra || 0) + 1; st.afinidad[g.id] = Math.min(5, (st.afinidad[g.id] || 0) + 1); (g.mj ||= []).push('la planta quedó en su punto'); line = ['manolo', 'Happy', `Ni una gota de más y sin que nos vea nadie. ${quien} le da una palmadita a la maceta y te guiña un ojo.`]; }
      if (res === 'mal') { g.fallo = 'la planta se quedó a medio regar'; line = ['manolo', 'Sad', `La planta se ha quedado a medio regar. ${quien} la mira con pena y le da agua con el dedo, gota a gota.`]; }
      if (r?.legal && res !== 'mal') line = ['manolo', 'Happy', `La agente Mara ha visto la flor y le ha dado la enhorabuena a ${quien}. Por fin, todo en regla.`];
      if (r?.fianzas) {
        const fianza = Math.min(st.monedas, 5 * r.fianzas);
        st.monedas -= fianza;
        (g.mj ||= []).push(`${r.fianzas === 1 ? 'una noche' : 'dos noches'} en el calabozo (${fianza} monedas de fianza)`);
      }
      if (r?.pillado) {
        const multa = Math.min(st.monedas, 15);
        st.monedas -= multa;
        (g.mj ||= []).push('le pilló la agente Mara');
        ui.decir?.({ sprite: info.sprite, nombre: quien }, 'Worried', `¿Esto? Perejil, agente. Para el estofado. Pregunte a quien quiera. (La agente Mara pone una multa de ${multa} monedas igual.)`);
        line = null;
      }
    } else {
      if (res === 'perfecto') { g.extra = (g.extra || 0) + 1; g.propinaExtra = (g.propinaExtra || 0) + 5; (g.mj ||= []).push(`el termal, ${datos.punto} como le gusta`); line = ['manolo', 'Happy', `El agua, ${datos.punto} y en su punto. ${info.especie} se queda en remojo con los ojos cerrados y deja propina en la toalla.`]; }
      if (res === 'mal') { g.fallo = 'el termal no estaba a su gusto'; line = ['manolo', 'Sad', `El agua no estaba ${datos.punto} ni de lejos. ${info.especie} sale del termal refunfuñando y chorreando.`]; }
    }
    if (line) ui.say(...line);
    if (!antes) mostrar({ guest: info, pide, helper: pide.quien || 'manolo', fase: st.fase, atendido: g.atendido, hab: g.hab, fallo: res === 'mal' });
    refreshGuest(g);
    persist();
    publish();
  }

  // ---------- cocina, chistorra y Charizard ----------

  // Lo que se puede cocinar para este huésped (si pidió comida y aún no se le sirvió)
  function cookFor(id) {
    const g = st.hoy.find(h => h.id === id);
    if (!g || g.atendido || g.estado !== 'habitacion' || st.fase === 'noche') return null;
    const pide = guestById(id).pide[g.pide];
    if (pide.tipo !== 'comida') return null;
    const recipe = recipeById(pide.receta);
    if (st.huelga) return { recipe, falta: true, huelga: true, moral: st.moral };
    // la cocina se complica con los días (más rápida y más exigente) y es más amable con Charizard contento
    const nivel = Math.min(1, Math.max(0, (st.dia - 2) / 12));
    // la especialidad de la casa, si alguna historia la ha desbloqueado: el mismo plato, más difícil
    const especial = recetasData.recipes.find(r => r.base === recipe.id && r.desbloquea && st.flags[r.desbloquea]) || null;
    return { recipe, especial, falta: (recipe.chistorra || 0) > st.chistorra, moral: st.moral, apoyo: has('fogon-apoyo'), nivel, ayudante: ayudanteCocina() };
  }

  // Sirve lo que salió de la cocina: perfecto, bien o quemado
  // Sirve lo que salió de la cocina: perfecto, bien (o algo crudo), crudo (sin hacer) o quemado.
  // En los platos sin fuego (tarta, pan con miel, potaje…) no se «quema»: se echa a perder.
  // «cocinero»: el ayudante de la plantilla, si lo hizo él
  function serveCooked(id, resultado, { crudo = false, receta = null, cocinero = null } = {}) {
    const g = st.hoy.find(h => h.id === id);
    const info = guestById(id);
    const pide = info.pide[g.pide];
    const recipe = recipeById(receta || pide.receta);
    // la especialidad, si sale perfecta, le deja más contento
    if (recipe.especial && resultado === 'perfecto') g.extra = (g.extra || 0) + 1;
    st.chistorra -= recipe.chistorra || 0;
    const r = st.recetario[recipe.id] || { veces: 0, perfectos: 0, gustan: [] };
    r.veces = (r.veces || 0) + 1;
    r.gustan ||= [];
    if (resultado === 'perfecto') r.perfectos = (r.perfectos || 0) + 1;
    // solo se sabe que le gusta si el plato salió bien de verdad
    const bueno = resultado === 'perfecto' || (resultado === 'bien' && !crudo);
    if (bueno && recipe.preferidos.includes(id) && !r.gustan.includes(id)) r.gustan.push(id);
    st.recetario[recipe.id] = r;
    const f = recipe.genero === 'f', la = f ? 'la' : 'el';
    const Nombre = recipe.nombre[0].toUpperCase() + recipe.nombre.slice(1);
    const fuego = FUEGO.has(recipe.juego);
    if (resultado === 'quemado' || resultado === 'crudo') {
      // lo quemado (o lo que se echó a perder) se lo come Charizard encantado; al huésped le toca algo frío
      g.atendido = 'frio';
      if (resultado === 'quemado') st.moral = Math.min(10, st.moral + 2);
      ui.say('charizard', 'Happy', resultado === 'crudo'
        ? `${Nombre} sin hacer: así no se puede servir. Charizard se ${f ? 'la' : 'lo'} come igual, y a ${info.especie} le toca un bocadillo frío.`
        : `${fuego ? 'Se ha quemado' : 'Se ha echado a perder'} ${la} ${recipe.nombre}. Charizard se ${f ? 'la' : 'lo'} come encantado, y a ${info.especie} le toca un bocadillo frío.`);
      mostrar({ guest: { sprite: '0006', especie: 'Charizard' }, pide: { tipo: 'comida', objeto: 'quemado' }, helper: 'manolo', fase: st.fase, atendido: true });
    } else {
      g.atendido = resultado;
      g.crudo = crudo;
      if (resultado === 'perfecto' && recipe.preferidos.includes(id)) st.afinidad[id] = Math.min(5, (st.afinidad[id] || 0) + 1);
      const ayudante = cocinero && guestById(cocinero);
      const texto = resultado === 'perfecto'
        ? `¡${Nombre} ${f ? 'perfecta' : 'perfecto'}! ${info.especie} no deja ni las migas.`
        : crudo ? `${Nombre} ${f ? 'lista' : 'listo'}. ${fuego ? 'Le ha faltado un poco de fuego' : 'No ha quedado del todo fino'}, pero se come.`
        : ayudante ? `${Nombre}, ${f ? 'hecha' : 'hecho'} por ${ayudante.hablante || ayudante.especie}. ¡Y está ${f ? 'rica' : 'rico'}!`
        : `${Nombre} ${f ? 'lista' : 'listo'}. No ${f ? 'es la mejor' : 'es el mejor'} de mi vida, pero está ${f ? 'rica' : 'rico'}.`;
      if (ayudante) ui.decir?.({ sprite: ayudante.sprite, nombre: ayudante.hablante || ayudante.especie }, 'Happy', texto);
      else ui.say('manolo', 'Happy', texto);
      mostrar({ guest: info, pide, helper: 'manolo', fase: st.fase, atendido: resultado, hab: g.hab });
    }
    refreshGuest(g);
    placeResidents().then(publish);
    persist();
    publish();
  }


  function charizardView() {
    if (st.huelga) {
      return { chistorra: 0, huelga: true, puedeBuscar: st.proveedor === 'cortado',
        line: ['Angry', 'Charizard está en huelga, sentado en el porche con un cartel: «SIN CHISTORRA NO HAY FUEGO». No enciende el fogón.'] };
    }
    // sin reparto: se puede salir a buscar proveedor antes de la huelga cuando la despensa va justa (o pasan los días)
    const puedeBuscar = st.proveedor === 'cortado' && (st.chistorra <= 3 || st.dia >= 14);
    return { chistorra: st.chistorra, puedeBuscar, line: moodLine(st.moral, st.dia) };
  }

  function searchSupplier() {
    st.proveedor = 'buscando';
    ui.say('manolo', 'Happy', 'Está bien, está bien. Mañana a primera hora salgo a buscar otro proveedor. Por primera vez en años, voy a salir de la posada.');
    persist();
    publish();
  }

  async function feedCharizard() {
    if (st.chistorra <= 0) return ui.say('charizard', 'Sad', 'No queda chistorra en la despensa. Charizard mira el paquete vacío como quien mira una foto antigua.');
    st.chistorra -= 1;
    const antes = humor(st.moral);
    st.moral = Math.min(10, st.moral + 3);
    ui.say('charizard', ...feedLine(st.moral));
    // lo que cambia se dice claro: el humor de Charizard se nota en toda la posada
    const ahora = humor(st.moral);
    if (ahora !== antes) {
      ui.toast(ahora === 'bien'
        ? 'Charizard está de buen humor: sube las maletas (+1 de felicidad a cada huésped) y en la cocina la llama va dócil.'
        : 'Charizard ya no está de morros: deja de echar humo a los huéspedes y la llama ya no tiembla.');
    } else if (ahora === 'bien') ui.toast('Charizard sigue de buen humor. Le dura más, pero esa chistorra ya no podrá ir a la cocina.');
    else ui.toast('Charizard se anima un poco. Una más y se le pasa del todo.');
    for (const g of st.hoy) refreshGuest(g);
    await placeResidents();
    persist();
    publish();
  }

  // ---------- pasar de fase ----------

  async function advance() {
    if (st.fase === 'manana' && (!st.llegados || arriving)) return ui.toast('Espera, que aún está subiendo gente por el camino.');
    const i = FASES.indexOf(st.fase);
    if (st.fase === 'noche') return nextDay();
    // quien se queda esperando en la puerta de una hora a otra se va mosqueando
    for (const g of st.hoy) if (g.estado === 'puerta') g.esperaFases = (g.esperaFases || 0) + 1;
    st.fase = FASES[i + 1];
    selected = null;
    if (st.fase === 'tarde') {
      const cansados = st.hoy.filter(g => g.estado === 'puerta');
      for (const g of cansados) {
        sinNoche(g);
        st.hoy = st.hoy.filter(h => h !== g);
        if (!st.vuelven.includes(g.id)) st.vuelven.push(g.id);
        (st.cansados ||= { dia: st.dia, ids: [] }).dia === st.dia ? st.cansados.ids.push(g.id) : (st.cansados = { dia: st.dia, ids: [g.id] });
        const a = actors.get(g.id);
        if (a) { a.mood = 'triste'; a.walkTo(-40, GROUND, { dir: DIR.left, speed: 40, then: () => { actors.delete(g.id); publish(); } }); }
      }
      if (cansados.length) ui.toast(`${listar(cansados.map(g => guestById(g.id).especie))} se ${cansados.length === 1 ? 'ha cansado' : 'han cansado'} de esperar en la puerta. ${cansados.length === 1 ? 'Volverá' : 'Volverán'} otro día.`);
    }
    await placeResidents();
    if (st.fase === 'noche') {
      await sucesoDeLaNoche();
      const summary = closeDay();
      await placeGuests();
      persist();
      publish();
      ui.say('manolo', 'Sigh', 'Se cierra la puerta. Cachimbita, chistorra y a dormir.');
      ui.night(summary);
      return;
    }
    await placeGuests();
    persist();
    publish();
    if (st.fase === 'tarde' && st.manoloFuera === st.dia && st.proveedor === 'buscando') {
      st.proveedor = 'nuevo';
      st.huelga = false;
      st.chistorra += 3;
      st.moral = Math.min(10, st.moral + 5);
      await placeResidents();
      const m = actors.get('manolo');
      if (m) { m.place(-20, GROUND, { anim: 'Walk', dir: DIR.right }); m.walkTo(DOOR, GROUND, { then: () => placeResidents().then(publish) }); }
      ui.say('manolo', 'Happy', '¡He vuelto! He encontrado a Don Paco, un charcutero del valle. Desde mañana, chistorra todos los días. Y de regalo, tres para Charizard.');
      persist();
      publish();
    } else if (st.fase === 'tarde') ui.say('manolo', 'Normal', 'Cae la tarde. Unos bajan al comedor, otros salen a pasear y alguno se queda en su cuarto.');
    if (st.fase === 'dia') ui.say('charizard', ...moodLine(st.moral, st.dia));
  }

  // La inspección de Sanidad: limpiar la cocina a tiempo (o la aprueba sola el empleado de la limpieza)
  async function inspeccion() {
    st.suceso.hecho = true;
    const limpio = empleado('limpieza');
    const r = limpio ? { resultado: 'perfecto' } : await ui.minijuego?.('limpiar');
    const res = r?.resultado === 'crudo' ? 'quemado' : r?.resultado || 'bien';   // sin limpiar nada, multa
    if (res === 'perfecto') { st.boca = (st.boca || 0) + BOCA; syncEstrellas(); }
    if (res === 'quemado') st.monedas = Math.max(0, st.monedas - 20);
    st.suceso.linea = res === 'perfecto' ? `La inspección de Sanidad, aprobada con nota${limpio ? ' (la plantilla lo dejó todo reluciente)' : ''}: +1 de fama.`
      : res === 'bien' ? 'La inspección de Sanidad, aprobada por los pelos.' : 'La inspección de Sanidad encontró ceniza hasta en el techo: 20 monedas de multa.';
    persist();
    publish();
  }

  // El Team Rocket viene a por la chistorra recién llegada: con el cerrojo no hay nada que hacer; si no, a espantarlos
  async function rocket() {
    st.suceso.hecho = true;
    if (has('cerrojo')) st.suceso.linea = 'El Team Rocket intentó llevarse la chistorra, pero el cerrojo aguantó. Se les oyó gritar «¡el Team Rocket vuela otra vez!».';
    else {
      const r = await ui.minijuego?.('rocket');
      const roba = !r ? 0 : r.resultado === 'perfecto' ? 0 : Math.min(st.chistorra, r.resultado === 'bien' ? 1 : 3);
      st.chistorra -= roba;
      st.suceso.linea = roba ? `El Team Rocket se llevó ${roba} ${roba === 1 ? 'chistorra' : 'chistorras'}. Charizard jura venganza.`
        : 'El Team Rocket vino a por la chistorra y salió volando. Charizard aún se ríe.';
    }
    persist();
    publish();
  }

  // La nevada: antes de que suban los huéspedes hay que partir leña para la chimenea. Lo que sale se
  // nota por la noche (closeDay): calentitos los que se quedan por la nieve, o frío y Charizard de estufa
  async function lena() {
    st.suceso.hecho = true;
    const res = nota(await jugar('lena')) || 'bien';
    st.suceso.lena = res;
    st.suceso.linea = res === 'perfecto' ? `Leña para la nevada: la chimenea ardió toda la noche (+${has('chimenea') ? 2 : 1} a los que se quedan por la nieve).`
      : res === 'bien' ? 'Leña para la nevada: alguna astilla torcida, pero hubo fuego toda la noche.'
      : 'Leña para la nevada: poca y mal partida. Hizo frío (−1 a todos) y Charizard tuvo que hacer de estufa, de morros.';
    persist();
    publish();
    ui.say('manolo', res === 'mal' ? 'Sad' : 'Happy', res === 'perfecto' ? 'Leña para toda la noche. La chimenea va a arder hasta mañana: los que se queden por la nieve, calentitos.'
      : res === 'bien' ? 'Algo de leña hay. No es para tirar cohetes, pero tampoco para pasar frío.'
      : 'Poca leña y mal partida. Esta noche Charizard tendrá que hacer de estufa, y ya le veo la cara.');
  }

  // La mañana siguiente a la nevada: Charizard abre el camino a fuego. Si sale bien sube la furgoneta
  // (la chistorra del día) y algún huésped; si no, sigue cortado y solo están los de anoche
  async function abrirCamino() {
    st.camino = { dia: st.dia, abierto: 0 };
    const r = await jugar('camino');
    const res = nota(r) || 'mal';
    const reparte = st.proveedor !== 'cortado' && st.proveedor !== 'buscando';
    st.camino.abierto = res === 'perfecto' ? 2 : res === 'bien' ? 1 : 0;
    const coletilla = r?.muneco ? ' Del muñeco de nieve solo queda la zanahoria.' : r?.cartel ? ' Y el cartel, tostado: ahora sí que es El Pino Calcinado.' : '';
    st.camino.linea = res === 'perfecto' ? `Camino abierto a fuego: subió la furgoneta y algún huésped.${coletilla}`
      : res === 'bien' ? `Media calzada abierta a fuego: no subió la furgoneta, pero alguien llegó a pie.${coletilla}`
      : `El camino siguió cortado por la nieve: solo se quedaron los de anoche.${coletilla}`;
    persist();
    publish();
    ui.say('manolo', res === 'mal' ? 'Sad' : 'Happy', (res === 'perfecto' ? '¡Camino abierto! Para algo es útil el fuego. Y Charizard ya asa una chistorra en la cuneta, a la brasa.'
      : res === 'bien' ? 'Media calzada abierta. La furgoneta no sube, pero alguno a pie sí llegará.'
      : 'Ni con fuego. El camino sigue cortado: hoy solo los de anoche.') + coletilla);
    if (res === 'perfecto' && reparte) {
      await new Promise(ok => setTimeout(ok, 3000));
      const n = CHISTORRA_DIARIA + (has('mas-chistorra') ? 2 : 0);
      st.chistorra += n; st.reparto = n;
      persist();
      publish();
      await scene.playVan(() => ui.sfx?.('van') || ui.say('charizard', 'Happy', `La furgoneta sube por el camino recién abierto: ${n} chistorras más. Charizard la escolta hasta la puerta, muy digno.`), st.proveedor === 'nuevo' ? 'DON PACO' : 'FAMADESA');
    }
  }

  // Lo que pasa a primera hora, antes de que suban los huéspedes: la inspección, el Team Rocket, la
  // leña de la nevada o, la mañana después de nevar, abrir el camino
  async function sucesoDeLaManana() {
    if (st.nieve === st.dia && st.camino?.dia !== st.dia) {
      await abrirCamino();
      await new Promise(r => setTimeout(r, 3500));
      return;
    }
    if (st.suceso?.dia !== st.dia || st.suceso.hecho) return;
    if (st.suceso.id === 'nevada') {
      await lena();
      await new Promise(r => setTimeout(r, 3500));
      return;
    }
    if (st.suceso.id === 'inspeccion') await inspeccion();
    else if (st.suceso.id === 'rocket') await rocket();
    else return;
    ui.say('manolo', /multa|se llevó/.test(st.suceso.linea) ? 'Sad' : 'Happy', st.suceso.linea);
    await new Promise(r => setTimeout(r, 3500));   // que dé tiempo a leerlo antes de que lleguen
  }

  // Lo que pasa al cerrar, antes de hacer cuentas: las velas del apagón, los deseos de la lluvia de
  // estrellas o, alguna noche sin cerrojo, pillar a quien se come la chistorra de la despensa
  async function sucesoDeLaNoche() {
    st.ladron = null;
    let seed = st.dia * 7307 + 3;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const intento = !has('cerrojo') && st.chistorra > 0 && rnd() < 0.35;
    // (las noches de apagón o de estrellas no da tiempo a vigilar la despensa: si alguien va, se la lleva)
    if (sucesoHoy('apagon')) {
      // un eléctrico en la posada o Charizard de buen humor dan más tiempo antes de que se note la oscuridad
      const luz = humor(st.moral) === 'bien' || st.hoy.some(g => (guestById(g.id).tipos || []).includes('electrico'));
      const r = await jugar('velas', { datos: { luz, n: st.hoy.filter(g => g.estado === 'habitacion').length } });
      st.suceso.velas = nota(r);
      st.suceso.luz = luz;
      if (intento) st.ladron = { auto: true };
      return;
    }
    if (sucesoHoy('estrellas')) {
      const r = await jugar('estrellas');
      st.suceso.deseos = r ? { res: nota(r), chistorra: !!r.chistorra } : null;
      if (intento) st.ladron = { auto: true };
      return;
    }
    if (!intento) return;
    // casi siempre es Charizard; alguna vez Snorlax sonámbulo (si vive en el pino) o Meowth, el del sindicato
    const x = rnd();
    const quien = st.flags.snorlax_se_queda && x < 0.2 ? 'snorlax' : (st.plantilla || []).includes('meowth') && x >= 0.2 && x < 0.4 ? 'meowth' : 'charizard';
    const r = ui.minijuego ? await jugar('despensa', { datos: { culpable: { charizard: '0006', snorlax: '0143', meowth: '0052' }[quien] } }) : null;
    st.ladron = r ? { quien, res: nota(r) } : { auto: true };
  }

  function closeDay() {
    const lines = [], filas = [];
    let ganado = 0, fama = 0;
    // la tormenta (con apagón) y la lluvia de estrellas, antes de contar los corazones
    const enCasa = st.hoy.filter(g => g.estado === 'habitacion');
    if (sucesoHoy('apagon')) {
      // con las velas del minijuego: perfecto, +1 a todos; bien, todo sigue igual; mal, −1
      const v = st.suceso.velas;
      if (v) {
        const d = v === 'perfecto' ? 1 : v === 'mal' ? -1 : 0;
        for (const g of enCasa) { g.extra = (g.extra || 0) + d; if (d) (g.mj ||= []).push(d > 0 ? 'durmió a la luz de las velas' : 'pasó la tormenta a oscuras'); }
        const ayuda = st.suceso.luz ? ' (con algo de ayuda eléctrica)' : '';
        lines.push(v === 'perfecto' ? `Tormenta y apagón: Charizard fue encendiendo velas a chispazos${ayuda} y nadie se enteró. Todos durmieron a gusto (+1).`
          : v === 'bien' ? `Tormenta y apagón: alguna vela se quedó apagada un rato${ayuda}, pero la noche pasó sin más.`
          : 'Tormenta y apagón: la posada se quedó a oscuras y nadie pegó ojo (−1 a todos).');
      } else {
        const luz = humor(st.moral) === 'bien' || st.hoy.some(g => (guestById(g.id).tipos || []).includes('electrico'));
        for (const g of st.hoy) g.extra = (g.extra || 0) + (luz ? 1 : -1);
        lines.push(luz ? 'Tormenta y apagón: con la cola de Charizard (y algún eléctrico) la posada no se quedó a oscuras. Todos a gusto.'
          : 'Tormenta y apagón: la posada se quedó a oscuras y nadie pegó ojo.');
      }
    }
    if (sucesoHoy('estrellas')) {
      for (const g of st.hoy) g.extra = (g.extra || 0) + 1;
      // los deseos: perfecto, +1 de fama; y si se pilló la chistorra fugaz (o salió perfecto), una chistorra más mañana
      const d = st.suceso.deseos;
      if (d?.res === 'perfecto') { st.boca = (st.boca || 0) + BOCA; lines.push('Lluvia de estrellas: todos salieron a verla y se pidieron deseos a puñados. Se corre la voz de la posada (+1 de fama).'); }
      else lines.push('Lluvia de estrellas: todos salieron a verla. Hasta Charizard pidió un deseo (chistorra).');
      if (d?.res === 'perfecto' || d?.chistorra) { st.chistorraExtra = st.dia + 1; lines.push('Charizard pidió una chistorra a la estrella fugaz y, mira por dónde, mañana habrá una más en la despensa.'); }
    }
    // la leña de la nevada: los que se quedan por la nieve, calentitos (o con frío)
    if (sucesoHoy('nevada') && st.suceso.lena && st.suceso.lena !== 'bien') {
      const d = st.suceso.lena === 'perfecto' ? (has('chimenea') ? 2 : 1) : -1;
      for (const g of enCasa) { g.extra = (g.extra || 0) + d; (g.mj ||= []).push(d > 0 ? 'la chimenea ardió toda la noche' : 'pasó frío por falta de leña'); }
      if (d < 0) st.moral = Math.max(0, st.moral - 2);   // Charizard, de estufa toda la noche
    }
    if (st.camino?.dia === st.dia && st.camino.linea) lines.push(st.camino.linea);
    if (st.suceso?.dia === st.dia && st.suceso.linea) lines.push(st.suceso.linea);
    for (const g of [...st.hoy]) {
      const info = guestById(g.id);
      // el grupo de la excursión: cena, paga y se va con el autobús
      if (g.estado === 'excursion') {
        st.hoy.splice(st.hoy.indexOf(g), 1);
        const entry = st.libro[g.id] || { visitas: 0, ultimo: 0 };
        entry.visitas += 1; entry.ultimo = st.dia; st.libro[g.id] = entry;
        const paga = 4 * (info.miembros || []).length;
        ganado += paga;
        const a = actors.get(g.id);
        a?.walkTo(-40, GROUND, { dir: DIR.left, then: () => { actors.delete(g.id); publish(); } });
        filas.push({ sprite: info.sprite, nombre: info.especie, corazones: null, excursion: true, paga, propina: 0, fama: 0, motivos: ['vinieron de excursión y se fueron con el autobús'] });
        continue;
      }
      if (g.estado === 'puerta') {
        // se va triste y vuelve otro día
        st.hoy.splice(st.hoy.indexOf(g), 1);
        if (!st.vuelven.includes(g.id)) st.vuelven.push(g.id);
        const a = actors.get(g.id);
        a.mood = 'triste';
        a.walkTo(-40, GROUND, { dir: DIR.left, then: () => { actors.delete(g.id); publish(); } });
        filas.push({ sprite: info.sprite, nombre: info.especie, corazones: null, monedas: 0, motivos: [esPlural(g.id) ? 'se fueron sin habitación: volverán otro día' : 'se fue sin habitación: volverá otro día'] });
        continue;
      }
      const f = felicidad(g);
      const propina = Math.ceil((PROPINA[f] + (has('chimenea') && f >= 2 ? 2 : 0) + (g.propinaExtra || 0)) * (empleado('propina') ? 1.15 : 1));
      // el que se va furioso paga a regañadientes la mitad
      const paga = f === 0 ? PRECIO / 2 : PRECIO;
      ganado += paga + propina;
      // boca a boca: los encantados dan fama a la posada; los furiosos la quitan
      const antesFama = Math.floor((st.boca || 0) / BOCA);
      const db = f === 5 ? 1 : f === 0 && (st.boca || 0) > 0 ? -1 : 0;
      st.boca = (st.boca || 0) + db;
      const df = Math.floor(st.boca / BOCA) - antesFama;   // sale «+1 de fama» solo cuando se completa un punto
      fama += df;
      const entry = st.libro[g.id] || { visitas: 0, ultimo: 0 };
      entry.visitas += 1;
      entry.ultimo = st.dia;
      entry.forma = Math.max(entry.forma || 0, (guestById(g.id).base?.evoluciones || []).filter(e => e.visita <= (g.visita || 1)).length);
      entry.felicidad = f;
      entry.mejor = Math.max(entry.mejor || 0, f);
      st.libro[g.id] = entry;
      // encantado: le coge cariño (cuenta para sus historias) y vuelve antes
      if (f === 5) st.afinidad[g.id] = Math.min(5, (st.afinidad[g.id] || 0) + 1);
      // y aunque no salga encantado: quien se va contento tres veces también le va cogiendo cariño (si no, su historia no avanza nunca)
      else if (f >= 3) {
        entry.tibio = (entry.tibio || 0) + 1;
        if (entry.tibio >= 3) { entry.tibio = 0; st.afinidad[g.id] = Math.min(5, (st.afinidad[g.id] || 0) + 1); }
      }
      filas.push({ sprite: info.sprite, nombre: info.especie, corazones: f, estado: FELIZ[f], paga, propina, fama: df,
        motivos: motivos(g), vuelve: f >= 4 ? 'volverá pronto' : f <= 1 ? 'tardará en volver' : '' });
    }
    st.monedas += ganado;
    // los que vinieron de paso y la excursión de la mañana (ya pagaron al irse)
    if (!filas.length) lines.push('Hoy no ha dormido nadie en la posada.');
    if (st.cansados?.dia === st.dia) for (const id of st.cansados.ids) {
      const info = guestById(id);
      filas.push({ sprite: info.sprite, nombre: info.especie, corazones: null, monedas: 0, paga: 0, propina: 0, fama: 0, motivos: [esPlural(id) ? 'se cansaron de esperar en la puerta: volverán otro día' : 'se cansó de esperar en la puerta: volverá otro día'] });
    }
    if (st.dePaso?.dia === st.dia) { filas.push(...st.dePaso.filas); ganado += st.dePaso.filas.reduce((x, f) => x + f.paga, 0); }
    let seed = st.dia * 104729 + 7;
    lines.push(...nightEvents(st, () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296), st.ladron));
    st.ladron = null;
    const antes = st.estrellas;
    syncEstrellas();
    return { dia: st.dia, filas, lines, ganado, fama, monedas: st.monedas, estrellas: st.estrellas, subeEstrella: st.estrellas > antes };
  }

  async function nextDay() {
    // con la nevada nadie puede irse: se quedan otra noche (y vuelven a pagar)
    const nevo = sucesoHoy('nevada');
    const quedan = nevo ? st.hoy.filter(g => g.estado === 'habitacion') : [];
    // (primero la visita nueva, que puede traer otra forma con otros encargos; luego el encargo, de los de esa forma)
    // (sin evolucionar mientras está atrapado por la nieve: la forma nueva quizá no cabe en su cuarto; ya evolucionará
    // en su próxima visita de verdad)
    const visitaNieve = g => { const v = visitaProxima(g.id); return formaDe(guestBase(g.id), v).dex === formaDe(guestBase(g.id), g.visita || 1).dex ? v : g.visita; };
    for (const g of quedan) Object.assign(g, { visita: visitaNieve(g), atendido: !!g.chill, charlado: false, espero: false, esperaFases: 0, extra: 0, sobremesa: false, oido: false, fallo: null, mj: [], propinaExtra: 0, crudo: false });
    for (const g of quedan) {
      const forma = guestById(g.id);
      // si ha evolucionado mientras nevaba, su muñeco se rehace con la forma nueva
      if (g.dex !== forma.dex) actors.delete(g.id);
      g.dex = forma.dex;
      if (g.pide == null) continue;
      // el siguiente encargo (sin los que solo tienen sentido con una mejora que no hay, como el termal)
      const p = forma.pide, antes = Math.min(g.pide, p.length - 1);
      g.pide = antes;
      // (y sin los que no pegan con lo construido, como el barreño de Squirtle si ya hay estanque)
      const vale = q => !(q.solo_si_mejora && !has(q.solo_si_mejora)) && !(q.no_si_mejora && has(q.no_si_mejora));
      do g.pide = (g.pide + 1) % p.length; while (!vale(p[g.pide]) && g.pide !== antes);
    }
    // por la mañana se van los de anoche
    const leaving = st.hoy.filter(g => !quedan.includes(g)).map(g => g.id);
    for (const id of leaving) {
      const a = actors.get(id);
      a.place(DOOR, GROUND, { anim: 'Idle', dir: DIR.left });
      a.mood = 'contento';
      a.walkTo(-40, GROUND, { dir: DIR.left, then: () => { actors.delete(id); publish(); } });
    }
    const dia = st.dia + 1;
    // el proveedor (sección 5): un día Famadesa deja de servir; sin chistorra, Charizard hace huelga
    let carta = false;
    if (!st.proveedor && dia >= 7) { st.proveedor = 'cortado'; carta = true; }
    // Manolo sale de madrugada a buscar proveedor y a primera hora ya está de vuelta con Don Paco: el día es normal
    // y la furgoneta nueva sube esa misma mañana
    const vuelve = st.proveedor === 'buscando';
    if (vuelve) { st.proveedor = 'nuevo'; st.huelga = false; st.moral = Math.min(10, st.moral + 5); }
    const sale = false;
    const sinReparto = st.proveedor === 'cortado' || st.proveedor === 'buscando';
    // con la nevada tampoco sube la furgoneta (la chistorra del empleado sí, que ya vive aquí)
    const paquete = (sinReparto || nevo ? 0 : CHISTORRA_DIARIA + (st.mejoras.includes('mas-chistorra') ? 2 : 0)) + (empleado('chistorra') ? 2 : 0);
    const reparto = sinReparto || nevo ? 0 : paquete - (empleado('chistorra') ? 2 : 0);   // lo que trae la furgoneta
    let seed = dia * 9973 + 5;
    let lluvia = dia > 1 && ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) < 0.25;
    // (la chistorra que se pidió anoche a la estrella fugaz)
    const deseo = st.chistorraExtra === dia ? 1 : 0;
    st = { ...st, dia, fase: 'manana', hoy: quedan, llegados: false, ayer: leaving,
      chistorra: st.chistorra + paquete + deseo, paquete, reparto, lluvia, manoloFuera: sale ? dia : st.manoloFuera };
    if (nevo) st.nieve = dia;
    if (quedan.length) await placeGuests();
    const suceso = carta || sale || nevo || vuelve ? null : elegirSuceso(dia, reparto > 0);
    if (nevo || suceso === 'nevada' || suceso === 'estrellas') lluvia = st.lluvia = false;
    if (suceso) { st.suceso = { id: suceso, dia }; st.ultimoSuceso = dia; }
    if (!carta && !nevo && !sale && cameosPendientes().length && dia - (st.ultimoBus || 0) >= CADA_BUS) { st.bus = { dia }; st.ultimoBus = dia; }
    st.huelga = sinReparto && st.chistorra === 0;
    // los días seguidos que Charizard lleva de morros (para que Manolo avise: les quita un corazón a todos)
    st.morros = humor(st.moral) === 'mal' && !st.huelga ? (st.morros || 0) + 1 : 0;
    const avisaMorros = st.morros >= 2 && st.chistorra > 0 && st.dia - (st.avisoMorros || -9) >= 3;
    selected = null;
    await placeResidents();
    persist();
    publish();
    if (vuelve) ui.say('manolo', 'Happy', 'He salido de madrugada a buscar otro proveedor… ¡y ya estoy de vuelta! Don Paco, un charcutero del valle: chistorra todos los días. Mira, ya sube su furgoneta.');
    else if (carta) ui.say('charizard', 'Surprised', 'Hoy no ha venido la furgoneta. Ha llegado una carta: «Famadesa deja de servir en la montaña». Charizard la lee tres veces, del derecho y del revés.');
    else if (sale) ui.say('charizard', 'Worried', 'Manolo ha salido de madrugada a buscar otro proveedor. Es la primera vez que sale de la posada. Hoy la recepción la lleva Charizard.');
    else if (st.huelga) ui.say('charizard', 'Angry', 'Charizard sigue en huelga en el porche. Sin chistorra no hay fuego.');
    else if (nevo) ui.say('manolo', 'Surprised', '¡Sigue nevando! El camino está cortado: ni baja nadie al valle ni sube nadie, ni la furgoneta. Los de anoche se quedan otro día. Mejor para la caja.');
    else if (suceso) ui.say(...AVISO[suceso]);
    else if (avisaMorros) {
      // (solo cuenta como dado si se ha visto: si esa mañana sale otro mensaje, se avisa otro día)
      st.avisoMorros = st.dia; persist();
      ui.say('manolo', 'Worried', `Charizard lleva ${st.morros} días de morros y se nota en los huéspedes: ninguno sale encantado. Dale una chistorra, hombre, que en la despensa hay ${st.chistorra}.`);
    }
    else if (lluvia) ui.say('manolo', 'Sigh', 'Llueve. Manolo se queda un rato mirando por la ventana. Hoy vendrán los de agua.');
    else ui.say(...buenosDias[(st.dia - 2) % buenosDias.length]);
    wake();
  }

  const AVISO = {
    excursion: ['charizard', 'Surprised', '¡Grrr! Charizard ha visto un autobús de excursión subiendo por la carretera.'],
    inspeccion: ['manolo', 'Worried', 'Ha llegado una carta: hoy, a primera hora, viene la inspección de Sanidad. ¡Charizard, la ceniza!'],
    rocket: ['charizard', 'Worried', 'Charizard ha encontrado huellas raras junto a la despensa… y una R pintada en la puerta. Alguien espera a la furgoneta.'],
    nevada: ['manolo', 'Surprised', '¡Ha nevado! La montaña está blanca. Si sigue así, mañana nadie podrá bajar al valle.'],
    apagon: ['manolo', 'Worried', 'Se está poniendo el cielo negro. Esta noche habrá tormenta, y de las gordas.'],
    estrellas: ['manolo', 'Happy', 'Dicen en la radio que esta noche hay lluvia de estrellas. Habrá que salir a verla.'],
  };

  // Los grupos de una noche que aún no han venido y ya pueden (los de menos día mínimo, antes)
  const cameosPendientes = () => data.guests.filter(g => g.cameo && !terminados().has(g.id) && canAppear(g, st))
    .sort((a, b) => (a.aparece?.dia_min || 0) - (b.aparece?.dia_min || 0));

  // ¿Toca suceso hoy? Uno cada 4 o 5 días, sin repetir el último; la excursión, más a menudo
  function elegirSuceso(dia, furgoneta = true) {
    // (cada partida, su calendario de sucesos: la semilla lleva el id de la partida; al recargar sale lo mismo)
    const sal = [...(st.partida || '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
    let seed = (dia * 4447 + 11 + sal) >>> 0;
    const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const hace = dia - (st.ultimoSuceso || 0);
    if (dia < 4 || hace < 4 || (hace === 4 && r() < 0.5)) return null;
    const ok = { inspeccion: dia >= 5, rocket: dia >= 6 && furgoneta, nevada: dia >= 6, apagon: dia >= 5, estrellas: true };
    const lista = Object.entries(SUCESOS).filter(([id]) => ok[id] && id !== st.suceso?.id);
    const total = lista.reduce((a, [, w]) => a + w, 0);
    let x = r() * total;
    for (const [id, w] of lista) { x -= w; if (x <= 0) return id; }
    return lista.at(-1)?.[0] || null;
  }

  // ---------- lo que ve la interfaz ----------

  function view() {
    return {
      dia: st.dia, fase: st.fase, monedas: st.monedas, chistorra: st.chistorra, selected,
      llegados: !!st.llegados, nevado: st.nieve === st.dia,
      libro: st.libro,
      advance: { manana: 'Pasar al día', dia: 'Pasar a la tarde', tarde: 'Cerrar el día', noche: 'Siguiente día' }[st.fase],
      lluvia: !!st.lluvia,
      estrellas: estrellas(), puntos: puntos(), siguiente: ESTRELLAS[estrellas()] ?? null,
      charizard: st.huelga ? 'en huelga' : { mal: 'de morros', normal: 'tranquilo', bien: 'de buen humor' }[humor(st.moral)],
      huespedes: st.hoy.map(g => {
        const info = guestById(g.id);
        const pide = info.pide[g.pide] || {};
        return { id: g.id, sprite: info.sprite, nombre: info.especie, estado: g.estado,
          hab: g.hab && ROOM[g.hab].nombre, pide: pide.texto, dice: pide.dice, tipo: pide.tipo, atendido: g.atendido, chill: !!g.chill,
          grande: info.tam === 'grande', tam: info.tam || 'normal', charla: !!charlaOf(g), oido: !!g.oido, preguntado: !!g.preguntado,
          acompanante: info.acompanante || info.miembros?.[1]?.sprite || null, acompananteNombre: info.acompanante_especie || null,
          hablante: info.hablante || info.especie, miembros: info.miembros || null, cameo: !!info.cameo, duerme: info.duerme || null, recuerda: pide.recuerda || pide.dice, visitas: st.libro[g.id]?.visitas || 0, sobremesa: sobremesaOf(g) };
      }),
    };
  }

  // ---------- arranque ----------

  async function begin() {
    syncEstrellas();
    scene.setUpgrades(st.mejoras);
    await placeResidents();
    await placeGuests();
    publish();
  }

  // Al entrar en la posada por la mañana, si aún no ha llegado nadie, llegan
  let arriving = false;
  function wake() {
    if (st.fase !== 'manana' || st.llegados || arriving) return;
    arriving = true;
    setTimeout(async () => {
      // primero llega la furgoneta con la chistorra; luego, los huéspedes
      const paquete = st.dia === 1 ? CHISTORRA_DIARIA : (st.reparto ?? st.paquete ?? CHISTORRA_DIARIA);
      if (paquete === 0) await new Promise(r => setTimeout(r, 3800));   // sin reparto: da tiempo a leer la noticia
      const traeEmpleado = st.dia > 1 && st.reparto != null && st.paquete > st.reparto;
      if (traeEmpleado) {
        const id = st.plantilla.find(x => guestById(x)?.empleo?.ventaja === 'chistorra');
        ui.toast(`${guestById(id)?.hablante || guestById(id)?.especie} ha bajado al pueblo y vuelve con 2 chistorras más.`);
      }
      if (paquete > 0 && st.nieve !== st.dia) {
        const rotulo = st.proveedor === 'nuevo' ? 'DON PACO' : 'FAMADESA';
        await scene.playVan(() => ui.sfx?.('van') || ui.say('charizard', 'Happy', `¡Ha llegado la furgoneta de la chistorra! ${paquete} más en la despensa, y Charizard ya las ha contado dos veces.`), rotulo);
      }
      await sucesoDeLaManana();
      await arrive();
      arriving = false;
    }, 700);
  }

  async function reset() {
    clear();
    st = newGame();
    for (const id of [...actors.keys()]) if (!data.residentes.some(r => r.id === id)) actors.delete(id);
    selected = null;
  }

  // Para el menú de cada huésped: habitaciones libres, dar habitación y atender
  function freeRooms(guestId) {
    return bedrooms().filter(id => !st.hoy.some(g => g.hab === id) && (!guestId || fits(guestId, id)))
      .map(id => ({ id, nombre: ROOM[id].nombre }));
  }

  // ---------- mejoras (sección 7): se compra lo que alcance; obras, solo una por noche ----------

  function upgradesView() {
    return upgradesData.filter(u => !u.retirada).map(u => {
      // no se levantan dos plantas del tirón: una obra por noche
      const bloqueada = u.grupo === 'Obras' && st.obraHoy === st.dia;
      const precio = u.grupo === 'Obras' && empleado('obras') ? Math.round(u.precio * 0.8) : u.precio;
      // las fotos de recuerdo con alguien concreto: hasta que no ha pasado (o no se ha visto su capítulo), no se hacen
      const [capId, capEntrada] = (u.capitulo || '').split(':');
      // (tras: que haya pasado; capitulo: «id:entrada» vista; historia: que se haya visto algún capítulo suyo)
      const faltaRecuerdo = (u.tras && !st.libro[u.tras]) || (u.capitulo && !(st.vistas[capId] || []).includes(capEntrada))
        || (u.historia && !(st.vistas[u.historia] || []).length) ? u.pista : null;
      return { ...u, precio, tiene: has(u.id), bloqueada, faltaRecuerdo,
      puede: !has(u.id) && st.monedas >= precio && (!u.requiere || has(u.requiere)) && !bloqueada && estrellas() >= (u.estrellas || 0) && !faltaRecuerdo,
      falta: u.requiere && !has(u.requiere) ? upgradesData.find(x => x.id === u.requiere).nombre : null,
      faltanEstrellas: estrellas() < (u.estrellas || 0) ? u.estrellas : null,
      };
    });
  }

  async function buyUpgrade(id) {
    const u = upgradesView().find(x => x.id === id);
    if (!u || !u.puede) return false;
    const antes = estrellas();
    st.monedas -= u.precio;
    st.mejoras.push(id);
    if (u.grupo === 'Obras') st.obraHoy = st.dia;
    syncEstrellas();
    const sube = st.estrellas > antes;
    ui.say('manolo', 'Happy', `¡Hecho! ${u.nombre}. ${u.efecto}` + (sube ? ` ¡La posada ya tiene ${st.estrellas} estrellas! Se correrá la voz.` : ''));
    // una planta nueva sube el tejado: se recoloca la casa y quien duerma arriba
    scene.setUpgrades(st.mejoras);
    await placeGuests();
    await placeResidents();
    persist();
    publish();
    return true;
  }

  function assignTo(id, roomId) {
    const g = st.hoy.find(h => h.id === id);
    if (g?.estado === 'puerta' && freeRooms().some(r => r.id === roomId)) assign(g, ROOM[roomId]);
  }

  function attendGuest(id) {
    selected = id;
    attend();
  }

  return {
    felicidadDe: id => { const g = st.hoy.find(h => h.id === id); return g ? felicidad(g) : null; },
    begin, wake, reset, select, focus, attend, advance, clickRoom, freeRooms, assignTo, attendGuest,
    manoloFuera: manoloAway, beginTalk, applyEffects, endTalk, sendAway, markHeard, markSobremesa, mejoras: () => [...st.mejoras], cookFor, serveCooked, charizardView, feedCharizard, upgradesView, buyUpgrade, searchSupplier,
    exportState: () => JSON.stringify({ ...st, v: 1 }, null, 2),
    async importState(text) {
      const data = JSON.parse(text);
      if (data.v !== 1 || typeof data.dia !== 'number') throw new Error('No es una partida de El Pino Calcinado');
      for (const id of [...actors.keys()]) actors.delete(id);
      st = { ...newGame(), ...data };
      sanear();
      selected = null; jugando = false; leavesAfterTalk = null; arriving = false;
      persist();
      await begin();
    },
    // el final: cuando todos han contado su historia
    libroCompleto: () => terminados().size >= data.guests.length,
    finalVisto: () => !!st.finalVisto,
    marcarFinal() { st.finalVisto = true; persist(); },
    // lo que se compra tras el final (volver a ver escenas, jugar minijuegos sueltos): solo cuesta monedas
    pagar(precio) {
      if (st.monedas < precio) return false;
      st.monedas -= precio;
      persist();
      publish();
      return true;
    },
    // el récord de cada minijuego suelto (cuántas veces ha salido perfecto): no cambia nada más de la partida
    records: () => ({ ...(st.records || {}) }),
    apuntarRecord(id, resultado) {
      const r = { jugadas: 0, perfectos: 0, ...(st.records?.[id] || {}) };
      r.jugadas += 1;
      if (resultado === 'perfecto') r.perfectos += 1;
      st.records = { ...(st.records || {}), [id]: r };
      persist();
      return r;
    },
    // para las fotos de recuerdo: el día, quién ha pasado por la posada (en la forma de su última visita, los de
    // más visitas antes; luego los de las excursiones) y en qué va el sobrino de Charizard
    datosFoto() {
      const solos = [], grupos = [];
      for (const g of data.guests) {
        const e = st.libro[g.id];
        if (!e) continue;
        if (g.cameo) { for (const m of g.miembros || []) grupos.push(m.sprite); continue; }
        const forma = (g.evoluciones || [])[(e.forma || 0) - 1];
        solos.push({ sprite: forma?.sprite || g.sprite, visitas: e.visitas || 0 });
        const pareja = forma?.acompanante || g.acompanante;
        if (/^\d+$/.test(pareja || '')) solos.push({ sprite: pareja, visitas: e.visitas || 0 });
      }
      const conocidos = [...new Set([...solos.sort((a, b) => b.visitas - a.visitas).map(x => x.sprite), ...grupos])];
      const ch = data.guests.find(g => g.id === 'charmander');
      const sobrino = (ch?.evoluciones || [])[(st.libro.charmander?.forma || 0) - 1]?.sprite || ch?.sprite || '0004';
      return { dia: st.dia, conocidos, sobrino };
    },
    bookView: () => ({ libro: st.libro, afinidad: st.afinidad, vistas: st.vistas, recetario: st.recetario, flags: st.flags, terminados: terminados(), plantilla: st.plantilla || [] }),
    contratar, cocinaAyudante, plazasPlantilla: plazas,
    ocupado: () => jugando,   // hay un minijuego de la posada en marcha (no se cocina encima)
    actorOf: id => actors.get(id),
    clickActor(a) {
      if (a.huesped) select(a.huesped);
      else if (a.residente === 'charizard') ui.charizard?.();
      else if (a.residente === 'manolo') ui.say('manolo', 'Happy', 'Manolo se pasa la mano por la calva: «Aquí: cachimbita, chistorra y a dormir».');
      else if (a.residente === 'snorlax') ui.say('snorlax', 'Normal', 'Zzz… (Snorlax ronca junto al pino. Desde que vive en la entrada, nadie levanta la voz en la posada.)');
      else if (a.residente?.startsWith('empleado-')) {
        // cada vez que se le toca dice una de sus frases de currar, por orden
        const id = a.residente.slice(9), info = guestById(id);
        const frases = info.empleo.frases || guestBase(id)?.empleo?.frases || [`Aquí estoy, de ${info.empleo.puesto}.`];
        st.frasesEmpleo ||= {};
        const n = st.frasesEmpleo[id] = (st.frasesEmpleo[id] || 0) + 1;
        ui.decir?.({ sprite: info.sprite, nombre: info.hablante || info.especie }, 'Happy', frases[(n - 1) % frases.length]);
      }
    },
    get fase() { return st.fase; },
    view,
  };
}

function listar(nombres) {
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0];
}
