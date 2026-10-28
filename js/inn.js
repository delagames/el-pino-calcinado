// La posada: el bucle del día (sección 3 de DISEÑO.md). Mañana llegan los huéspedes,
// de día se les da habitación y se les atiende, por la tarde bajan al comedor y por
// la noche se cobra, se apunta en el libro y se duerme. Se guarda al acabar cada fase.
import { loadSprite, Actor, DIR } from './sprites.js';
import { ROOMS, GROUND, COLORES } from './scene.js';
import { loadGuestData, guestById, pickArrivals, setVisitas, canAppear } from './guests.js';
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
const ESTRELLAS = [0, 5, 12, 22, 34];   // puntos para 1, 2, 3, 4 y 5 estrellas
const FLOOR0 = GROUND - 4;                        // suelo de la planta baja
const QUEUE = [80, 60, 40];                      // sitios de la cola en la puerta (el resto espera en el camino)
const DOOR = 92;
const BED_X = { hab1: 114, hab2: 224, hab3: 264, buhardilla: 170, estanque: 344, cueva: 15, nido: 41 }; // centro de cada cama, para dormir
const STAND_X = { hab1: 150, hab2: 186, hab3: 302, buhardilla: 236, estanque: 344, cueva: 15, nido: 41 }; // de pie, en el hueco libre
// Sitios de fuera (con su mejora): la charca, la cueva de la ladera y el nido en lo alto del pino.
// En la cueva y el nido solo duermen los que lo piden («duerme» en guests.json); los enormes solo
// asoman por la boca de la cueva (se dibujan recortados)
const FUERA = new Set(['estanque', 'cueva', 'nido']);
const SUELO = { estanque: [GROUND + 1, GROUND + 2], cueva: [GROUND + 1, GROUND], nido: [164, 164] };   // [durmiendo, de pie]
const BOCA_CUEVA = [0, 200, 30, 47];
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
const PUESTO_X = { cocina: [262, 186], animo: [150, 186], maletas: [146, 186], obras: [380, GROUND], propina: [212, 186], chistorra: [372, GROUND], limpieza: [276, 186] };
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
    moral: MORAL_INICIAL, recetario: {}, plantilla: [] };
}

// Los empleados: quien termina su historia puede quedarse a trabajar (si tiene «empleo»), con una ventaja
const PLANTILLA_BASE = 3;
const VENTAJA = {
  animo: 'el que llega triste sube un corazón', cocina: 'cocina un plato al día', maletas: 'sube las maletas',
  obras: 'las obras cuestan menos', propina: 'cobra más propina, por convenio', chistorra: 'trae chistorra cada mañana',
  limpieza: 'aprueba sola la inspección',
};
// Los sucesos (uno cada 4 o 5 días): la inspección, el Team Rocket, la nevada, la tormenta con
// apagón y la lluvia de estrellas. La excursión va aparte: un autobús cada 3 días mientras queden
// grupos de una noche por venir (si compitiera con los demás, la partida duraba más de 150 días)
const SUCESOS = { inspeccion: 1, rocket: 1, nevada: 1, apagon: 1, estrellas: 1 };
const CADA_BUS = 3;

export function hasSave() {
  return !!load();
}

export async function createInn(scene, ui) {
  const data = await loadGuestData();
  let st = { ...newGame(), ...(load() || {}) };
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

  // Habitaciones que hay ahora mismo y quién cabe en cada una (Snorlax en ninguna: vive en el pino)
  function bedrooms() {
    return [...BASE_ROOMS, ...Object.entries(PLANTA_ROOMS).flatMap(([m, ids]) => (has(m) ? ids : [])),
      ...(has('buhardilla') ? ['buhardilla'] : []), ...(has('estanque') ? ['estanque'] : []),
      ...(has('cueva') ? ['cueva'] : []), ...(has('nido') ? ['nido'] : [])];
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
    return st.mejoras.reduce((a, id) => a + (upgradesData.find(u => u.id === id)?.puntos || 0), 0) + (st.boca || 0);
  }
  function estrellas() {
    const p = puntos();
    return ESTRELLAS.filter(n => p >= n).length;
  }
  function syncEstrellas() {
    st.estrellas = estrellas();
    st.habitaciones = bedrooms().length;
  }

  const sucesoHoy = id => st.suceso?.dia === st.dia && st.suceso.id === id;
  const empleado = v => (st.plantilla || []).some(id => guestById(id)?.empleo?.ventaja === v);
  const plazas = () => PLANTILLA_BASE + (has('taquillas') ? 2 : 0);
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
      a.place(x + i * 4, y === 186 ? FLOOR0 : y, { anim: st.fase === 'noche' ? 'Sleep' : 'Idle' });
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
    if (!empleado('cocina') || st.ayudanteHoy === st.dia) return null;
    const id = st.plantilla.find(x => guestById(x)?.empleo?.ventaja === 'cocina');
    return guestById(id)?.hablante || guestById(id)?.especie;
  }
  function cocinaAyudante(id) {
    if (!ayudanteCocina()) return false;
    st.ayudanteHoy = st.dia;
    serveCooked(id, 'bien');
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
    const slots = st.huelga ? [82, 40] : QUEUE;
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
    return nextEntry(dialogues[g.id], talkCtx(g.id), st.vistas[g.id]);
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
  function sendAway(id) {
    const g = st.hoy.find(h => h.id === id);
    if (!g) return;
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
    // quien no baja al comedor no cuenta nada: se le ve a lo suyo, en su cuarto o de paseo
    const lugar = tardeDe(g);
    if (lugar !== 'comedor') return { gesto: mine[lugar] || `(${guestById(g.id).especie} ${lugar === 'paseo' ? 'ha salido a dar un paseo' : 'se ha quedado en su cuarto'}.)`, fuera: true };
    if (g.sobremesa) return { gesto: mine.gesto };
    const here = new Set(enComedor().map(h => h.id));
    const pareja = sobremesaData.parejas.find(p => (p.a === g.id || p.b === g.id) && here.has(p.a) && here.has(p.b)
      && !st.flags[`sobremesa_${p.a}_${p.b}`]);
    if (pareja) return { pareja: { key: `sobremesa_${pareja.a}_${pareja.b}`, lineas: pareja.lineas } };
    const n = (st.sobremesa ||= {})[g.id] || 0;
    const linea = mine.lineas[n % mine.lineas.length];
    const comio = guestById(g.id).pide[g.pide].tipo === 'comida';
    const plato = comio ? sobremesaData.plato[g.atendido === 'perfecto' ? 'perfecto' : g.atendido === 'frio' ? 'frio' : 'bien'] : null;
    return { ...linea, plato };
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
    if (ef.afinidad) st.afinidad[id] = Math.max(0, Math.min(5, (st.afinidad[id] || 0) + ef.afinidad));
    if (ef.flags) Object.assign(st.flags, ef.flags);
    if (ef.monedas) st.monedas += ef.monedas;
  }

  let leavesAfterTalk = null;
  async function endTalk(id, entry) {
    const g = st.hoy.find(h => h.id === id);
    if (g) g.charlado = true;
    // si la charla acaba con el huésped marchándose, no cuenta como vista: la repetirá
    if (leavesAfterTalk === id) {
      leavesAfterTalk = null;
      sendAway(id);
      return { seVa: true };
    }
    st.vistas[id] = [...(st.vistas[id] || []), entry.id];
    const infoE = guestById(id);
    const oferta = entry.fin_arco && infoE?.empleo && !(st.plantilla || []).includes(id)
      ? { id, nombre: infoE.hablante || infoE.especie, puesto: infoE.empleo.puesto, ventaja: VENTAJA[infoE.empleo.ventaja], lleno: (st.plantilla || []).length >= plazas() } : null;
    // Snorlax se queda a vivir junto al pino
    if (id === 'snorlax' && st.flags.snorlax_se_queda) {
      st.hoy = st.hoy.filter(h => h.id !== 'snorlax');
      actors.delete('snorlax');
      await placeResidents();
      for (const h of st.hoy.filter(x => x.estado === 'puerta')) {
        const s2 = guestSpot(h);
        actors.get(h.id)?.place(s2.x, s2.y);
      }
    }
    for (const h of st.hoy) refreshGuest(h);
    persist();
    publish();
    return { seVa: false, oferta };
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
    else if (at && !g.crudo) f += 1;
    else if (!at && st.fase === 'noche') f -= 1;
    if (g.charlado) f += 1;
    if (colorGusta(g)) f += 1;
    if (decorGusta(g)) f += 1;
    f -= Math.min(2, (g.espero ? 1 : 0) + (g.esperaFases || 0));
    const h = st.huelga ? 'mal' : humor(st.moral);
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
    if (decorGusta(g)) m.push(`le encantó ${DECOR_NOMBRE[GUSTOS[g.id]]}`);
    if (colorGusta(g)) m.push(`le encantó la habitación ${COLORES[ROOM[g.hab].color].nombre}`);
    if (g.atendido === 'perfecto') m.push('el plato le salió perfecto');
    else if (g.atendido === 'frio') m.push('comió algo frío');
    else if (g.crudo) m.push('el plato salió algo crudo');
    else if (!g.atendido) m.push('nadie le atendió');
    if (g.charlado) m.push('charlasteis un rato');
    if (g.espero || g.esperaFases) m.push('le hiciste esperar en la puerta');
    const h = st.huelga ? 'mal' : humor(st.moral);
    if (h === 'bien') m.push('Charizard le subió las maletas');
    else if (h === 'mal') m.push('Charizard le recibió echando humo');
    return m;
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

  async function arrive() {
    st.llegados = true;
    syncEstrellas();
    // tras el final (todo el libro completo), los de siempre vuelven de visita, ya sin historia nueva
    const ocupadas = st.hoy.length;   // los que se quedaron por la nevada
    const llegan = pickArrivals(st, st.finalVisto ? new Set() : terminados())
      .filter(l => !st.hoy.some(h => h.id === l.id)).slice(0, Math.max(0, bedrooms().length + 1 - ocupadas));
    st.vuelven = st.vuelven.filter(id => !llegan.some(l => l.id === id));
    st.ultimoPide = st.ultimoPide || {};
    for (const [i, l] of llegan.entries()) {
      st.ultimoPide[l.id] = l.pide;
      const g = { id: l.id, pide: l.pide, estado: 'puerta', hab: null, atendido: false, visita: (st.vistas[l.id]?.length || 0) + 1 };
      st.hoy.push(g);
      const a = await guestActor(g);
      a.place(-24 - i * 26, GROUND, { anim: 'Walk', dir: DIR.right });
      a.mood = null;
      a.walkTo(queueX(i), GROUND, { then: () => { refreshGuest(g); publish(); } });
    }
    // la excursión: el grupo baja del autobús y se queda delante de la posada
    const bus = st.bus?.dia === st.dia ? st.bus : sucesoHoy('excursion') ? st.suceso : null;   // (o la de una partida antigua)
    const grupo = bus && !bus.grupo && cameosPendientes()[0];
    if (grupo) {
      bus.grupo = grupo.id;
      const g = { id: grupo.id, pide: 0, estado: 'excursion', hab: null, atendido: true, visita: 1 };
      st.hoy.push(g);
      const a = await guestActor(g);
      a.place(-30, GROUND, { anim: 'Walk', dir: DIR.right });
      a.walkTo(guestSpot(g).x, GROUND, { then: () => { refreshGuest(g); publish(); } });
    }
    persist();
    publish();
    if (grupo) ui.say('charizard', 'Happy', `¡Grrr! Ha llegado el autobús: ${grupo.especie}. Vienen a pasar el día, cenar y ver el pino. Tócalos para saludarlos.`);
    else if (llegan.length) {
      const nombres = llegan.map(l => guestById(l.id).especie);
      ui.say('charizard', 'Surprised', `¡Grrr! Charizard avisa: ${nombres.length === 1 ? 'llega' : 'llegan'} ${listar(nombres)} por el camino. Tócalos para atenderlos.`);
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
    g.estado = 'habitacion';
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
  }

  function attend() {
    const g = st.hoy.find(h => h.id === selected);
    if (!g) return ui.toast('Toca a un huésped para ver qué necesita.');
    const info = guestById(g.id);
    if (g.estado === 'puerta') return ui.toast(`${info.especie} aún espera en la puerta: dale primero una habitación.`);
    if (st.fase === 'noche') return ui.toast('Es de noche: todo el mundo duerme.');
    if (g.atendido) return ui.toast(`${info.especie} ya tiene lo que quería.`);
    const pide = info.pide[g.pide];
    let line;
    if (pide.tipo === 'comida') {
      g.atendido = 'frio';
      line = ['manolo', 'Worried', `${info.especie} quería ${pide.plato}. Le saco algo frío de la despensa, que no hay tiempo de cocinar.`];
    } else {
      g.atendido = true;
      line = [pide.quien || 'manolo', pide.gesto || 'Happy', pide.hecho];
    }
    ui.say(...line);
    ui.show?.({ guest: info, pide, helper: line[0], fase: st.fase, atendido: g.atendido, hab: g.hab });
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
  function serveCooked(id, resultado, { crudo = false, receta = null } = {}) {
    const g = st.hoy.find(h => h.id === id);
    const info = guestById(id);
    const pide = info.pide[g.pide];
    const recipe = recipeById(receta || pide.receta);
    // la especialidad, si sale perfecta, le deja más contento
    if (recipe.especial && resultado === 'perfecto') g.extra = (g.extra || 0) + 1;
    st.chistorra -= recipe.chistorra || 0;
    const r = st.recetario[recipe.id] || { veces: 0, perfectos: 0, gustan: [] };
    r.veces += 1;
    if (resultado === 'perfecto') r.perfectos += 1;
    if (resultado !== 'quemado' && recipe.preferidos.includes(id) && !r.gustan.includes(id)) r.gustan.push(id);
    st.recetario[recipe.id] = r;
    const f = recipe.genero === 'f';
    const Nombre = recipe.nombre[0].toUpperCase() + recipe.nombre.slice(1);
    if (resultado === 'quemado') {
      // el plato quemado se lo come Charizard encantado, y al huésped le toca algo frío
      g.atendido = 'frio';
      st.moral = Math.min(10, st.moral + 2);
      ui.say('charizard', 'Happy', `Se ha quemado ${f ? 'la' : 'el'} ${recipe.nombre}. Charizard se ${f ? 'la' : 'lo'} come encantado, y a ${info.especie} le toca un bocadillo frío.`);
      ui.show?.({ guest: { sprite: '0006', especie: 'Charizard' }, pide: { tipo: 'comida', objeto: 'quemado' }, helper: 'manolo', fase: st.fase, atendido: true });
    } else {
      g.atendido = resultado;
      g.crudo = crudo;
      if (resultado === 'perfecto' && recipe.preferidos.includes(id)) st.afinidad[id] = Math.min(5, (st.afinidad[id] || 0) + 1);
      ui.say('manolo', 'Happy', resultado === 'perfecto'
        ? `¡${Nombre} ${f ? 'perfecta' : 'perfecto'}! ${info.especie} no deja ni las migas.`
        : crudo ? `${Nombre} ${f ? 'lista' : 'listo'}. Le ha faltado un poco de fuego, pero se come.`
        : `${Nombre} ${f ? 'lista' : 'listo'}. No ${f ? 'es la mejor' : 'es el mejor'} de mi vida, pero está ${f ? 'rica' : 'rico'}.`);
      ui.show?.({ guest: info, pide, helper: 'manolo', fase: st.fase, atendido: resultado, hab: g.hab });
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
    return { chistorra: st.chistorra, line: moodLine(st.moral, st.dia) };
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
    const i = FASES.indexOf(st.fase);
    if (st.fase === 'noche') return nextDay();
    // quien se queda esperando en la puerta de una hora a otra se va mosqueando
    for (const g of st.hoy) if (g.estado === 'puerta') g.esperaFases = (g.esperaFases || 0) + 1;
    // el Team Rocket viene al cerrar: con el cerrojo no hay nada que hacer; si no, a espantarlos
    if (FASES[i + 1] === 'noche' && sucesoHoy('rocket') && !st.suceso.hecho) {
      st.suceso.hecho = true;
      if (has('cerrojo')) st.suceso.linea = 'El Team Rocket intentó llevarse la chistorra, pero el cerrojo aguantó. Se les oyó gritar «¡el Team Rocket vuela otra vez!».';
      else {
        const r = await ui.minijuego?.('rocket');
        const roba = !r ? 0 : r.resultado === 'perfecto' ? 0 : Math.min(st.chistorra, r.resultado === 'bien' ? 1 : 3);
        st.chistorra -= roba;
        st.suceso.linea = roba ? `El Team Rocket se llevó ${roba} ${roba === 1 ? 'chistorra' : 'chistorras'}. Charizard jura venganza.`
          : 'El Team Rocket vino a por la chistorra y salió volando. Charizard aún se ríe.';
      }
    }
    st.fase = FASES[i + 1];
    selected = null;
    await placeResidents();
    if (st.fase === 'noche') {
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
    if (st.fase === 'dia' && sucesoHoy('inspeccion') && !st.suceso.hecho) return inspeccion();
    if (st.fase === 'dia') ui.say('charizard', ...moodLine(st.moral, st.dia));
  }

  // La inspección de Sanidad: limpiar la cocina a tiempo (o la aprueba sola el empleado de la limpieza)
  async function inspeccion() {
    st.suceso.hecho = true;
    const limpio = empleado('limpieza');
    const r = limpio ? { resultado: 'perfecto' } : await ui.minijuego?.('limpiar');
    const res = r?.resultado || 'bien';
    if (res === 'perfecto') { st.boca = (st.boca || 0) + 1; syncEstrellas(); }
    if (res === 'quemado') st.monedas = Math.max(0, st.monedas - 20);
    st.suceso.linea = res === 'perfecto' ? `La inspección de Sanidad, aprobada con nota${limpio ? ' (la plantilla lo dejó todo reluciente)' : ''}: +1 de fama.`
      : res === 'bien' ? 'La inspección de Sanidad, aprobada por los pelos.' : 'La inspección de Sanidad encontró ceniza hasta en el techo: 20 monedas de multa.';
    persist();
    publish();
    ui.say('manolo', res === 'quemado' ? 'Sad' : 'Happy', st.suceso.linea);
  }

  function closeDay() {
    const lines = [], filas = [];
    let ganado = 0, fama = 0;
    // la tormenta (con apagón) y la lluvia de estrellas, antes de contar los corazones
    if (sucesoHoy('apagon')) {
      const luz = humor(st.moral) === 'bien' || st.hoy.some(g => (guestById(g.id).tipos || []).includes('electrico'));
      for (const g of st.hoy) g.extra = (g.extra || 0) + (luz ? 1 : -1);
      lines.push(luz ? 'Tormenta y apagón: con la cola de Charizard (y algún eléctrico) la posada no se quedó a oscuras. Todos a gusto.'
        : 'Tormenta y apagón: la posada se quedó a oscuras y nadie pegó ojo.');
    }
    if (sucesoHoy('estrellas')) {
      for (const g of st.hoy) g.extra = (g.extra || 0) + 1;
      lines.push('Lluvia de estrellas: todos salieron a verla. Hasta Charizard pidió un deseo (chistorra).');
    }
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
        filas.push({ sprite: info.sprite, nombre: info.especie, corazones: null, excursion: true, paga, propina: 0, fama: 0, motivos: ['vinieron de excursión, cenaron y se fueron con el autobús'] });
        continue;
      }
      if (g.estado === 'puerta') {
        // se va triste y vuelve otro día
        st.hoy.splice(st.hoy.indexOf(g), 1);
        if (!st.vuelven.includes(g.id)) st.vuelven.push(g.id);
        const a = actors.get(g.id);
        a.mood = 'triste';
        a.walkTo(-40, GROUND, { dir: DIR.left, then: () => { actors.delete(g.id); publish(); } });
        filas.push({ sprite: info.sprite, nombre: info.especie, corazones: null, monedas: 0, motivos: ['se fue sin habitación: volverá otro día'] });
        continue;
      }
      const f = felicidad(g);
      const propina = Math.ceil((PROPINA[f] + (has('chimenea') && f >= 2 ? 2 : 0)) * (empleado('propina') ? 1.15 : 1));
      // el que se va furioso paga a regañadientes la mitad
      const paga = f === 0 ? PRECIO / 2 : PRECIO;
      ganado += paga + propina;
      // boca a boca: los encantados dan fama a la posada; los furiosos la quitan
      const df = f === 5 ? 1 : f === 0 && (st.boca || 0) > 0 ? -1 : 0;
      st.boca = (st.boca || 0) + df;
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
      filas.push({ sprite: info.sprite, nombre: info.especie, corazones: f, estado: FELIZ[f], paga, propina, fama: df,
        motivos: motivos(g), vuelve: f >= 4 ? 'volverá pronto' : f <= 1 ? 'tardará en volver' : '' });
    }
    st.monedas += ganado;
    if (!filas.length) lines.push('Hoy no ha dormido nadie en la posada.');
    let seed = st.dia * 104729 + 7;
    lines.push(...nightEvents(st, () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)));
    const antes = st.estrellas;
    syncEstrellas();
    return { dia: st.dia, filas, lines, ganado, fama, monedas: st.monedas, estrellas: st.estrellas, subeEstrella: st.estrellas > antes };
  }

  async function nextDay() {
    // con la nevada nadie puede irse: se quedan otra noche (y vuelven a pagar)
    const nevo = sucesoHoy('nevada');
    const quedan = nevo ? st.hoy.filter(g => g.estado === 'habitacion') : [];
    for (const g of quedan) Object.assign(g, { atendido: false, charlado: false, espero: false, esperaFases: 0, extra: 0, sobremesa: false, oido: false });
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
    const sale = st.proveedor === 'buscando';
    const sinReparto = st.proveedor === 'cortado' || st.proveedor === 'buscando';
    const paquete = (sinReparto ? 0 : CHISTORRA_DIARIA + (st.mejoras.includes('mas-chistorra') ? 2 : 0)) + (empleado('chistorra') ? 2 : 0);
    let seed = dia * 9973 + 5;
    const lluvia = dia > 1 && ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) < 0.25;
    st = { ...st, dia, fase: 'manana', hoy: quedan, llegados: false, ayer: leaving,
      chistorra: st.chistorra + paquete, paquete, lluvia, manoloFuera: sale ? dia : st.manoloFuera };
    if (nevo) st.nieve = dia;
    if (quedan.length) await placeGuests();
    const suceso = carta || sale || nevo ? null : elegirSuceso(dia);
    if (suceso) { st.suceso = { id: suceso, dia }; st.ultimoSuceso = dia; }
    if (!carta && cameosPendientes().length && dia - (st.ultimoBus || 0) >= CADA_BUS) { st.bus = { dia }; st.ultimoBus = dia; }
    st.huelga = sinReparto && st.chistorra === 0;
    selected = null;
    await placeResidents();
    persist();
    publish();
    if (carta) ui.say('charizard', 'Surprised', 'Hoy no ha venido la furgoneta. Ha llegado una carta: «Famadesa deja de servir en la montaña». Charizard la lee tres veces, del derecho y del revés.');
    else if (sale) ui.say('charizard', 'Worried', 'Manolo ha salido de madrugada a buscar otro proveedor. Es la primera vez que sale de la posada. Hoy la recepción la lleva Charizard.');
    else if (st.huelga) ui.say('charizard', 'Angry', 'Charizard sigue en huelga en el porche. Sin chistorra no hay fuego.');
    else if (nevo) ui.say('manolo', 'Surprised', '¡Sigue nevando! Nadie se atreve a bajar al valle: los de anoche se quedan otro día. Mejor para la caja.');
    else if (suceso) ui.say(...AVISO[suceso]);
    else if (lluvia) ui.say('manolo', 'Sigh', 'Llueve. Manolo se queda un rato mirando por la ventana. Hoy vendrán los de agua.');
    else ui.say(...buenosDias[(st.dia - 2) % buenosDias.length]);
    wake();
  }

  const AVISO = {
    excursion: ['charizard', 'Surprised', '¡Grrr! Charizard ha visto un autobús de excursión subiendo por la carretera.'],
    inspeccion: ['manolo', 'Worried', 'Ha llegado una carta: hoy, a mediodía, viene la inspección de Sanidad. ¡Charizard, la ceniza!'],
    rocket: ['charizard', 'Worried', 'Charizard ha encontrado huellas raras junto a la despensa… y una R pintada en la puerta.'],
    nevada: ['manolo', 'Surprised', '¡Ha nevado! La montaña está blanca. Si sigue así, mañana nadie podrá bajar al valle.'],
    apagon: ['manolo', 'Worried', 'Se está poniendo el cielo negro. Esta noche habrá tormenta, y de las gordas.'],
    estrellas: ['manolo', 'Happy', 'Dicen en la radio que esta noche hay lluvia de estrellas. Habrá que salir a verla.'],
  };

  // Los grupos de una noche que aún no han venido y ya pueden (los de menos día mínimo, antes)
  const cameosPendientes = () => data.guests.filter(g => g.cameo && !terminados().has(g.id) && canAppear(g, st))
    .sort((a, b) => (a.aparece?.dia_min || 0) - (b.aparece?.dia_min || 0));

  // ¿Toca suceso hoy? Uno cada 4 o 5 días, sin repetir el último; la excursión, más a menudo
  function elegirSuceso(dia) {
    let seed = dia * 4447 + 11;
    const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const hace = dia - (st.ultimoSuceso || 0);
    if (dia < 4 || hace < 4 || (hace === 4 && r() < 0.5)) return null;
    const ok = { inspeccion: dia >= 5, rocket: dia >= 6, nevada: dia >= 6, apagon: dia >= 5, estrellas: true };
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
      libro: st.libro,
      advance: { manana: 'Pasar al día', dia: 'Pasar a la tarde', tarde: 'Cerrar el día', noche: 'Siguiente día' }[st.fase],
      lluvia: !!st.lluvia,
      estrellas: estrellas(), puntos: puntos(), siguiente: ESTRELLAS[estrellas()] ?? null,
      charizard: st.huelga ? 'en huelga' : { mal: 'de morros', normal: 'tranquilo', bien: 'de buen humor' }[humor(st.moral)],
      huespedes: st.hoy.map(g => {
        const info = guestById(g.id);
        const pide = info.pide[g.pide] || {};
        return { id: g.id, sprite: info.sprite, nombre: info.especie, estado: g.estado,
          hab: g.hab && ROOM[g.hab].nombre, pide: pide.texto, dice: pide.dice, tipo: pide.tipo, atendido: g.atendido,
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
      const paquete = st.dia === 1 ? CHISTORRA_DIARIA : (st.paquete ?? CHISTORRA_DIARIA);
      if (paquete === 0) await new Promise(r => setTimeout(r, 3800));   // sin reparto: da tiempo a leer la noticia
      if (paquete > 0) {
        const rotulo = st.proveedor === 'nuevo' ? 'DON PACO' : 'FAMADESA';
        await scene.playVan(() => ui.sfx?.('van') || ui.say('charizard', 'Happy', `¡Ha llegado la furgoneta de la chistorra! ${paquete} más en la despensa, y Charizard ya las ha contado dos veces.`), rotulo);
      }
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
      return { ...u, precio, tiene: has(u.id), bloqueada,
      puede: !has(u.id) && st.monedas >= precio && (!u.requiere || has(u.requiere)) && !bloqueada,
      falta: u.requiere && !has(u.requiere) ? upgradesData.find(x => x.id === u.requiere).nombre : null,
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
      selected = null;
      persist();
      await begin();
    },
    // el final: cuando todos han contado su historia
    libroCompleto: () => terminados().size >= data.guests.length,
    finalVisto: () => !!st.finalVisto,
    marcarFinal() { st.finalVisto = true; persist(); },
    bookView: () => ({ libro: st.libro, afinidad: st.afinidad, vistas: st.vistas, recetario: st.recetario, flags: st.flags, terminados: terminados(), plantilla: st.plantilla || [] }),
    contratar, cocinaAyudante, plazasPlantilla: plazas,
    actorOf: id => actors.get(id),
    clickActor(a) {
      if (a.huesped) select(a.huesped);
      else if (a.residente === 'charizard') ui.charizard?.();
      else if (a.residente === 'manolo') ui.say('manolo', 'Happy', 'Manolo se pasa la mano por la calva: «Aquí: cachimbita, chistorra y a dormir».');
      else if (a.residente === 'snorlax') ui.say('snorlax', 'Normal', 'Zzz… (Snorlax ronca junto al pino. Desde que vive en la entrada, nadie levanta la voz en la posada.)');
      else if (a.residente?.startsWith('empleado-')) {
        const info = guestById(a.residente.slice(9));
        ui.decir?.({ sprite: info.sprite, nombre: info.hablante || info.especie }, 'Happy',
          `Aquí, currando: ${info.empleo.puesto}. (${VENTAJA[info.empleo.ventaja][0].toUpperCase()}${VENTAJA[info.empleo.ventaja].slice(1)}.)`);
      }
    },
    get fase() { return st.fase; },
    view,
  };
}

function listar(nombres) {
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0];
}
