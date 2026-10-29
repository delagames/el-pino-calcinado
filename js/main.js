// Estados del juego: inicio, posada (vista A), mostrador (vista B), cocina (C) y noche.
// La posada ya tiene su bucle del día (inn.js). Todo se habla en el cuadro de diálogo de
// abajo: al tocar a un huésped dice lo que necesita y debajo salen tus respuestas.
import { createInnView, COLORES } from './scene.js';
import { createInn, hasSave, FASE_NOMBRE } from './inn.js';
import { copias, codigoDe, textoDe, pedirPersistencia } from './save.js';
import { portraitUrl } from './sprites.js';
import { showScene } from './popup.js';
import { createCounter } from './counter.js';
import { playIntro } from './intro.js';
import { playFinal } from './final.js';
import { descargarFondo, dibujaFondo, FOTOS } from './fondo.js';
import { runEntry } from './dialogue.js';
import { createKitchen, loadRecipes } from './kitchen.js';
import { loadGuestData, kantoVistos, pokedex, formaDe } from './guests.js';
import { loadDialogue } from './dialogue.js';
import { setMood, setRain as rainSound, sfx, getPrefs, setMusic, setSfx, cry, cancion, tarareo, sfxAnim } from './audio.js';

const $ = sel => document.querySelector(sel);

// Si a un Pokémon le falta un retrato (Mr. Mime solo tiene el Normal), se usa el Normal
document.addEventListener('error', ev => {
  const img = ev.target;
  if (img.tagName !== 'IMG') return;
  const m = img.src.match(/assets\/portraits\/([^/]+)\/(\w+)\.png$/);
  if (m && m[2] !== 'Normal') img.src = `assets/portraits/${m[1]}/Normal.png`;
}, true);

const scene = createInnView($('#scene'));
const counter = createCounter($('#counter-canvas'));
const kitchen = createKitchen($('#kitchen-canvas'));
window.__scene = scene;   // para probar la escena desde fuera
window.__kitchen = kitchen;
window.__juego = { inn: () => inn, talk: id => talk(id) };   // (para las pruebas)
let state = null;
let toastTimer = 0;
let inn = null;
let last = null;      // lo último que publicó la posada
let repitiendo = false;   // se está viendo o jugando algo de «Otra vez» (tras el final)

// Manolo y Charizard: carpeta de retratos y nombre
const CREW = { manolo: { sprite: 'manolo', nombre: 'Manolo' }, charizard: { sprite: '0006', nombre: 'Charizard' },
  snorlax: { sprite: '0143', nombre: 'Snorlax' } };

function layout() {
  if (state === 'inicio') scene.setInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  // el alto reservado abajo es fijo (--fit-h, o --bar-h): si el cuadro crece, crece hacia arriba sin
  // mover la casa; en vertical, solo si pasa de ese alto (casi nunca: los textos van en tandas) sube la casa
  else {
    const css = getComputedStyle(document.documentElement);
    const top = $('.topbar')?.offsetHeight || parseInt(css.getPropertyValue('--top-h'));
    document.documentElement.style.setProperty('--top-real', `${top}px`);
    const bottom = parseInt(css.getPropertyValue('--fit-h')) || parseInt(css.getPropertyValue('--bar-h'));
    scene.setInsets({ top, right: 0, bottom, left: 0, dialog: Math.max(bottom, $('.actions .dialog').offsetHeight + 12) });
  }
}

function go(next) {
  state = next;
  $('#start').classList.toggle('hidden', next !== 'inicio');
  $('#hud').classList.toggle('hidden', next === 'inicio');
  $('#stub').classList.toggle('hidden', next !== 'noche' && next !== 'demo' && next !== 'partida');
  $('#book').classList.toggle('hidden', next !== 'libro');
  $('#counter-view').classList.toggle('hidden', next !== 'mostrador');
  $('#kitchen-view').classList.toggle('hidden', next !== 'cocina');
  $('#advance').classList.toggle('hidden', next === 'mostrador' || next === 'cocina' || repitiendo);
  // recepción y cocina ocupan toda la pantalla (solo queda el cuadro de diálogo)
  document.body.classList.toggle('fullview', next === 'mostrador' || next === 'cocina');
  scene?.setPaused(next === 'mostrador' || next === 'cocina' || next === 'libro');
  scene.setInteractive(next === 'posada');
  hideToast();
  if (next === 'inicio') refreshStart();
  if (next === 'posada' && !repitiendo) inn?.wake();   // (si se vuelve a ver una escena tras el final, no empieza el día)
  layout();
}

// Tarjeta centrada (libro de visitas, fin del día)
function card(next, { title, html, button = 'Volver a la posada' }) {
  $('#stub-title').textContent = title;
  $('#stub-text').innerHTML = html;
  $('#stub-back').textContent = button;
  go(next);
  $('#stub-back').focus({ preventScroll: true });
  document.querySelector('#stub .card').scrollTop = 0;
}

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, Math.max(3200, text.length * 55));
}

function hideToast() {
  $('#toast').classList.add('hidden');
}
// tocar el aviso lo quita
$('#toast').addEventListener('click', hideToast);

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- cuadro de diálogo ----------

// Muestra quién habla, lo que dice y, si hay, las respuestas posibles
let lastVoice = null;
function dialog({ sprite, nombre, emotion = 'Normal', text, options = [], highlight = [], sub = '' }) {
  // cuando empieza a hablar un Pokémon (o le cambia la cara) se le oye, con el tono de su emoción;
  // si canta, canta de verdad (Jigglypuff y Wigglytuff, su nana; los demás, un tarareo)
  const canta = sprite !== 'manolo' && /♪|\btararea\b|\(canta\b/i.test(text);
  if (canta && (sprite === '0039' || sprite === '0040')) cancion();
  else if (canta) tarareo(sprite);
  else if (`${sprite}:${emotion}` !== lastVoice && sprite !== 'manolo' && (sprite !== '0006' || /gr+r/i.test(text))) cry(sprite, emotion);
  lastVoice = `${sprite}:${emotion}`;
  const face = $('#dialog-face');
  // la cara nueva no se ve hasta que carga (si no, un momento sale el nombre nuevo con la cara de antes);
  // si ese Pokémon no tiene retrato para esa emoción, el normal
  const url = portraitUrl(sprite, emotion);
  if (face.getAttribute('src') !== url) {
    face.style.visibility = 'hidden';
    face.onload = () => { face.style.visibility = ''; };
    face.onerror = emotion === 'Normal' ? () => { face.style.visibility = ''; } : () => { face.onerror = () => { face.style.visibility = ''; }; face.src = portraitUrl(sprite, 'Normal'); };
    face.src = url;
  }
  $('#dialog-name').textContent = nombre;
  $('#dialog-sub').textContent = sub;
  // los textos largos van en tandas (el cuadro no crece y no tapa la casa): se pasa a la siguiente
  // con ▸ o tocando el cuadro, y las respuestas salen con la última
  // (se mide con las respuestas ya puestas, que en el ordenador le quitan ancho al texto)
  pendiente = { options, highlight };
  tandas = [text]; tanda = 0;
  mostrarTanda();
  tandas = paginar(text);
  mostrarTanda();
}

const pantallaBaja = matchMedia('(max-width: 760px) and (max-height: 760px)');
let tandas = [], tanda = 0, pendiente = null;

// Parte el texto por frases (o por palabras, si una frase sola no cabe) en trozos de tres líneas (dos en móviles bajos)
function paginar(text) {
  const p = $('#dialog-text');
  const alto = parseFloat(getComputedStyle(p).lineHeight) * (pantallaBaja.matches ? 2 : 3) + 2;
  const cabe = t => { p.textContent = t; return p.scrollHeight <= alto; };
  if (cabe(text)) return [text];
  // las frases (sin cortar tras «Mr.» ni «Sr.»), y luego se llena cada tanda palabra a palabra si hace falta
  const frases = text.split(/(?<=[.!?…»)])(?<!\b(?:Mr|Sr|Sra|Dr)\.)\s+/);
  const out = [];
  let cur = '';
  for (const frase of frases) {
    const cand = cur ? `${cur} ${frase}` : frase;
    if (cabe(cand)) { cur = cand; continue; }
    // la frase entera no cabe con lo que hay: si lo que hay es muy poco (o la frase no cabe ni sola), se sigue
    // llenando esta tanda palabra a palabra; si no, la frase empieza tanda nueva
    if (cur && cur.length >= 40 && cabe(frase)) { out.push(cur); cur = frase; continue; }
    for (const palabra of frase.split(' ')) {
      const c2 = cur ? `${cur} ${palabra}` : palabra;
      if (cabe(c2) || !cur) cur = c2;
      else { out.push(cur); cur = palabra; }
    }
  }
  if (cur) out.push(cur);
  // que ninguna tanda acabe con una o dos palabras sueltas: se le pasan unas cuantas de la anterior
  for (let k = 1; k < out.length; k++) {
    let prev = out[k - 1].split(' '), here = out[k].split(' ');
    while (here.length < 4 && prev.length > 4 && cabe([prev.at(-1), ...here].join(' '))) {
      here = [prev.pop(), ...here];
    }
    out[k - 1] = prev.join(' '); out[k] = here.join(' ');
  }
  return out.length ? out : [text];
}

function mostrarTanda() {
  const ultima = tanda >= tandas.length - 1;
  $('#dialog-text').textContent = tandas[tanda];
  const box = $('#dialog-options');
  box.innerHTML = '';
  if (!ultima) {
    const b = document.createElement('button');
    b.textContent = '▸';
    b.className = 'secondary';
    b.setAttribute('aria-label', 'Seguir leyendo');
    b.addEventListener('click', siguienteTanda);
    box.append(b);
  } else {
    const { options } = pendiente;
    for (const [i, o] of options.entries()) {
      const b = document.createElement('button');
      b.textContent = o.label;
      if (i > 0 || o.secondary || options.length === 1) b.className = 'secondary';
      b.addEventListener('click', () => { sfx('tap'); closeChoice(); o.action?.(); });
      box.append(b);
    }
  }
  colocarAdvance();
  scene.setHighlight(ultima ? pendiente.highlight : []);
  layout();
  fitViews();
}

function siguienteTanda() {
  if (tanda >= tandas.length - 1) return;
  sfx('tap');
  tanda++;
  mostrarTanda();
}
// En vertical, el botón de pasar el día va dentro del cuadro, detrás de las respuestas: todos los
// botones se reparten las filas y ninguno pisa a otro
const estrecha = matchMedia('(max-width: 760px)');
const botonAdvance = $('#advance');   // se guarda: al vaciar las respuestas se lo llevaría por delante
function colocarAdvance() {
  if (estrecha.matches) $('#dialog-options').append(botonAdvance);
  else $('.actions').append(botonAdvance);
}
estrecha.addEventListener('change', colocarAdvance);
colocarAdvance();

// tocar el cuadro (fuera de los botones) también pasa a la siguiente tanda
$('#dialog').addEventListener('click', ev => { if (!ev.target.closest('button')) siguienteTanda(); });

// El mostrador y la cocina se encogen para dejar sitio al cuadro de diálogo, crezca lo que crezca
let lastDlgH = 0;
function fitViews() {
  const h = $('.actions').offsetHeight;
  if (h === lastDlgH) return;
  lastDlgH = h;
  document.documentElement.style.setProperty('--dlg-h', `${h}px`);
  window.dispatchEvent(new Event('resize'));
}
// también cuando cambia sin pasar por aquí (aparece el botón de pasar el día, gira la pantalla…)
new ResizeObserver(fitViews).observe($('.actions'));
window.addEventListener('resize', fitViews);   // (solo vuelve a avisar si el alto ha cambiado: no hace bucle)

function closeChoice() {
  $('#dialog-options').innerHTML = '';
  colocarAdvance();
  scene.setHighlight([]);
}

// Lo que dicen Manolo y Charizard (inn.js lo llama)
function say(who, emotion, text) {
  dialog({ ...CREW[who], emotion, text });
}

// Al tocar a un huésped: dice lo que necesita y tú contestas
function talk(id) {
  const h = last?.huespedes.find(x => x.id === id);
  if (!h) return;
  inn.focus(id);
  const who = { sprite: h.sprite, nombre: h.nombre };
  if (last.fase === 'noche') return dialog({ ...who, text: 'Zzz… zzz…' });
  // quien espera en la puerta pasa directo al mostrador (check-in)
  if (h.estado === 'puerta') return checkIn(id);
  // los de la excursión: si aún no se ha charlado con ellos, charla en grupo; si no, a lo suyo
  if (h.estado === 'excursion') return h.charla ? startTalk(id)
    : dialog({ ...who, emotion: 'Happy', text: '¡Qué sitio más bonito! Luego cenamos y nos vamos, que el autobús no espera.' });
  const charlar = h.charla ? [{ label: 'Charlar', action: () => startTalk(id) }] : [];
  const later = { label: 'Ahora no', action: () => { inn.focus(null); say('manolo', 'Normal', 'Enseguida vuelvo, ¿eh?'); } };
  // lo que necesita lo cuenta la primera vez que lo tocas en su cuarto; luego solo lo recuerda
  // Mr. Mime, de vez en cuando, se viene arriba
  const grito = h.id === 'mrmime' && Math.random() < 0.3 ? ' ¡Arriba Kanto!' : '';
  const pide = (h.oido ? h.recuerda : h.dice) + grito;
  inn.markHeard(id);
  if (!h.atendido && h.tipo === 'comida') {
    const cook = inn.cookFor(id);
    const cocinar = cook && !cook.falta
      ? [{ label: `Cocinar ${cook.recipe.nombre}`, action: () => startCook(id) },
        ...(cook.especial ? [{ label: `La especialidad: ${cook.especial.nombre}`, action: () => startCook(id, true) }] : []),
        ...(cook.ayudante ? [{ label: `Que cocine ${cook.ayudante}`, action: () => inn.cocinaAyudante(id) }] : [])]
      : cook?.huelga ? [{ label: 'Charizard está en huelga', action: () => say('charizard', 'Angry', 'Charizard se cruza de brazos en el porche. Sin chistorra no hay fuego.') }]
      : cook ? [{ label: 'No queda chistorra…', action: () => say('manolo', 'Sad', 'Se ha acabado la chistorra. Habrá que esperar al paquete de mañana.') }] : [];
    return dialog({ ...who, text: pide, options: [
      ...cocinar, { label: 'Algo frío de la despensa', action: () => inn.attendGuest(id) }, ...charlar, later,
    ] });
  }
  if (!h.atendido) {
    return dialog({ ...who, text: pide, options: [
      { label: '¡Marchando!', action: () => inn.attendGuest(id) }, ...charlar, later,
    ] });
  }
  // quien viene a descansar no pide nada: lo dice la primera vez y luego, a lo suyo
  if (h.chill && !h.oido && last.fase !== 'tarde') {
    inn.markHeard(id);
    return dialog({ ...who, emotion: 'Happy', text: RELAX[[...id].reduce((a, c) => a + c.charCodeAt(0), last.dia) % RELAX.length], options: charlar.length ? [...charlar, later] : [] });
  }
  if (h.sobremesa) return sobremesa(h, charlar);
  if (h.charla) return dialog({ ...who, emotion: 'Normal', text: '¿Tienes un momento? Me apetece charlar un rato.', options: [...charlar, later] });
  if (h.atendido === 'frio') return dialog({ ...who, emotion: 'Sad', text: 'Bueno… gracias, supongo. No era lo que me apetecía.' });
  dialog({ ...who, emotion: 'Happy', text: '¡Gracias! Aquí se está de maravilla.' });
}

// Lo que dice quien viene sin pedir nada (de relax)
const RELAX = [
  'Hoy no necesito nada, de verdad. He venido a no hacer nada y lo estoy bordando.',
  'Todo perfecto: cama, ventana y silencio. No me traigas nada, que me malacostumbro.',
  'Vengo a desconectar. Si alguien pregunta por mí, no estoy.',
  'Nada, nada, estoy de relax. Bueno… si pasa Charizard, que salude.',
  'Qué paz se respira aquí. No pido nada más, de verdad.',
  'Me voy a echar una siesta de las de pijama y orinal. Luego bajo.',
];

// Por la tarde, en el comedor: comenta la comida y cuenta algo suyo, o charla con otro
// huésped que coincide con él; si ya ha hablado hoy, solo se le ve a lo suyo
function sobremesa(h, charlar) {
  const s = h.sobremesa;
  const who = { sprite: h.sprite, nombre: h.nombre };
  const tail = charlar.length ? [...charlar, { label: 'Luego hablamos', action: () => inn.focus(null) }] : [];
  if (s.gesto) return dialog({ ...who, emotion: 'Normal', text: s.gesto, options: tail });
  inn.markSobremesa(h.id, s.pareja?.key);
  if (!s.pareja) return dialog({ ...who, emotion: s.emocion || 'Normal', text: [s.plato, s.texto].filter(Boolean).join(' '), options: tail });
  const line = i => {
    const [quien, emotion, text] = s.pareja.lineas[i];
    const g = last?.huespedes.find(x => x.id === quien);
    const speaker = CREW[quien] || (g ? { sprite: g.sprite, nombre: g.nombre } : who);
    const end = i === s.pareja.lineas.length - 1;
    dialog({ ...speaker, emotion, text, options: end ? tail : [{ label: 'Seguir ▸', action: () => line(i + 1) }] });
  };
  line(0);
}

// ---------- cocina (vista C) ----------

const JUEGO = { vuelta: 'Vuelta y vuelta en la parrilla', miel: 'Chorro de miel sobre la tostada', setas: 'Cortar setas al vuelo', espeton: 'Al espetón, girando',
  potaje: 'Elegir ingredientes y remover la marmita', kebab: 'Pasar el cortador por el rollo que gira', pizza: 'Amasar, estirar y poner los ingredientes', emplatar: 'Decorar el plato, cada cosa en su sitio' };

async function startCook(id, especial = false) {
  if (inn.ocupado?.()) return;
  const cook = inn.cookFor(id);
  if (!cook || cook.falta) return;
  const recipe = especial && cook.especial ? cook.especial : cook.recipe;
  go('cocina');
  setMood('cocina');
  say('manolo', 'Happy', especial ? `¡La especialidad de la casa: ${recipe.nombre}! Charizard, esto es para nota.` : `¡Vamos allá, Charizard! Una de ${recipe.nombre}.`);
  const { resultado, crudo } = await kitchen.cook(recipe, { moral: cook.moral, apoyo: cook.apoyo, nivel: cook.nivel, onStep: p => say('manolo', 'Normal', p.texto) });
  go('posada');
  inn.serveCooked(id, resultado, { crudo, receta: recipe.id });
}

// Los minijuegos de los sucesos (la inspección, el Team Rocket), en la cocina
const SUCESO_JUEGO = {
  limpiar: { nombre: 'la inspección', who: 'manolo', emocion: 'Worried', texto: '¡Que viene el inspector! Charizard, ¡la ceniza! Toca las manchas, rápido.' },
  rocket: { nombre: 'el Team Rocket', who: 'charizard', emocion: 'Angry', texto: '¡Grrr! El Team Rocket quiere llevarse la chistorra recién llegada. ¡Toca las sombras de la ventana para espantarlos!' },
  // los de los sucesos nuevos y algunos encargos (la posada puede cambiar el texto de entrada)
  lena: { nombre: 'la leña', who: 'manolo', emocion: 'Worried', texto: 'Con esta nevada hay que partir leña para la chimenea. Toca cuando el hacha pase por la marca. Los troncos con nudo, dos golpes seguidos.' },
  velas: { nombre: 'las velas', who: 'manolo', emocion: 'Worried', texto: '¡Se ha ido la luz! Con cada relámpago se apaga una vela. Toca las apagadas y Charizard las enciende. A los que duermen, ni tocarlos.' },
  estrellas: { nombre: 'los deseos', who: 'manolo', emocion: 'Happy', texto: '¡Lluvia de estrellas! Toca las fugaces y pide un deseo. Y si pasa una chistorra fugaz, que no se escape, que Charizard la tiene pedida.' },
  cafe: { nombre: 'el café', who: 'manolo', emocion: 'Happy', texto: 'Café a la malagueña, como en el Café Central: mantén pulsado para echar la leche y suelta justo en la raya.' },
  despensa: { nombre: 'la despensa', who: 'manolo', emocion: 'Worried', texto: 'Se oye masticar en la despensa… Arrastra la linterna y deja la luz encima de los ojos que brillan hasta pillarlo.' },
  planta: { nombre: 'la planta', who: 'manolo', emocion: 'Worried', texto: 'Riego la planta, pero con disimulo. Como pase la agente Mara y nos pille regando, Bulbasaur duerme en el calabozo.' },
  maletas: { nombre: 'las maletas', who: 'manolo', emocion: 'Sigh', texto: 'Cuántas maletas… Charizard las sube colgadas de la cola. Toca para soltar cada una encima de la pila.' },
  camino: { nombre: 'el camino', who: 'charizard', emocion: 'Happy', texto: 'Charizard mira el camino cortado, se crece y enciende la cola. Mantén pulsado y arrastra el fuego por la nieve, sin tocar el muñeco ni el cartel.' },
  termal: { nombre: 'el termal', who: 'manolo', emocion: 'Happy', texto: 'Al termal. Charizard, tú calientas: mantén pulsado para más fuego y suelta para que se enfríe. Cada uno lo quiere a su punto.' },
};
// opts: texto, who y emocion (para cambiar la frase de entrada), datos (lo que necesita el minijuego),
// nivel (0-1, lo difícil que es según los días) y moral (la de Charizard)
async function minijuego(juego, { texto, who, emocion, datos = {}, nivel = 0.3, moral = 6, volver = true } = {}) {
  const j = SUCESO_JUEGO[juego];
  go('cocina');
  setMood('cocina');
  const entrada = texto || j.texto;
  say(who || j.who, emocion || j.emocion, entrada);
  const res = await kitchen.cook({ id: juego, nombre: j.nombre, juego, pasos: [{ texto: entrada }], datos },
    { moral, nivel, onStep: p => say(p.who || 'manolo', p.emo || 'Normal', p.texto) });
  if (volver) go('posada');   // (en las pruebas no: allí no se pasa por la posada)
  return res;
}

// ---------- Charizard ----------

function charizardTalk() {
  const v = inn.charizardView();
  const options = [];
  if (v.puedeBuscar) options.push({ label: 'Iré a buscar otro proveedor', action: () => inn.searchSupplier() });
  if (v.chistorra > 0) options.push({ label: `Darle una chistorra (quedan ${v.chistorra})`, action: () => inn.feedCharizard() });
  options.push({ label: 'Nada, sigue a lo tuyo', action: () => {} });
  dialog({ ...CREW.charizard, emotion: v.line[0], text: v.line[1], options });
}

// ---------- charla en el mostrador (vista B) ----------

// Check-in en el mostrador: si tiene historia pendiente, se charla; luego pide lo suyo
// y se le busca habitación (en la casa, tocando una de las que parpadean)
// Dónde se le recibe: en el mostrador, o fuera si no cabe por la puerta (Snorlax, mientras
// no haya habitación grande) o vive en el agua (Lapras, junto al estanque)
function whereFor(h) {
  if (h.cameo) return 'fuera';   // la excursión, delante de la posada
  if (h.tam === 'agua') return 'estanque';
  if (h.tam === 'grande' || h.duerme) return 'fuera';   // y los de la cueva y el nido, que no caben
  return 'dentro';
}

async function checkIn(id) {
  const h = last?.huespedes.find(x => x.id === id);
  if (!h) return;
  if (h.charla) return startTalk(id, () => roomPrompt(id, true));
  go('mostrador');
  await counter.open({ sprite: h.sprite, buddy: h.acompanante, fase: last.fase, lugar: whereFor(h) });
  roomPrompt(id);
}

// En recepción solo se pide habitación (lo que necesita lo cuenta luego, en su cuarto)
function roomPrompt(id, trasCharla = false) {
  const h = last?.huespedes.find(x => x.id === id);
  if (!h || h.estado !== 'puerta') { counter.close(); return go('posada'); }
  const who = { sprite: h.sprite, nombre: h.nombre };
  // hacerle esperar le resta felicidad (una vez)
  const back = text => () => { inn.markHeard(id, 'espero'); counter.close(); go('posada'); inn.focus(null); say('manolo', 'Normal', text); };
  // decirle que no: se va de verdad, triste, y vuelve otro día
  const away = text => () => { counter.close(); go('posada'); say('manolo', 'Sad', text); inn.sendAway(id); };
  // el que no cabe por la puerta tampoco pide nada aquí: mira la puerta y se mira la barriga
  const noCabe = whereFor(h) === 'fuera' && !inn.freeRooms(id).length;
  const text = noCabe ? `(${h.nombre} mira la puerta. Luego se mira la barriga. Luego la puerta otra vez.)`
    : trasCharla ? 'Bueno… ¿y qué habitación me das?'
    : h.preguntado ? '¿Hay ya habitación para mí?'
    : h.visitas ? '¡Hola otra vez! ¿Tenéis sitio para esta noche?'
    : '¡Buenas! ¿Queda alguna habitación libre?';
  inn.markHeard(id, 'preguntado');
  counter.speak('huesped', 'Worried');
  if (noCabe) {
    return dialog({ ...who, emotion: 'Worried', text, options: [
      { label: 'No cabes en ninguna habitación', action: away('Lo siento, grandullón. Aquí no cabes por ninguna puerta. Vuelve cuando tengamos sitio para ti.') }] });
  }
  const free = inn.freeRooms(id);
  const options = free.length
    ? [{ label: 'A ver qué tengo libre…', action: () => pickRoom(id, free) },
      { label: 'Espera un momento', action: back('¡Ahora mismo te atiendo! Un segundito.') }]
    : [{ label: 'Lo siento, está todo lleno', action: away('Lo siento, hoy está todo lleno. ¡Vuelve otro día, que te guardo sitio!') }];
  dialog({ ...who, emotion: 'Worried', text, options });
}

// La habitación se elige en la casa: vuelve a la vista de la posada con las libres
// resaltadas y el huésped seleccionado; al tocar una, sube (inn.clickRoom)
function pickRoom(id, free) {
  const h = last?.huespedes.find(x => x.id === id);
  counter.close();
  go('posada');
  inn.focus(id);
  const quien = inn.manoloFuera?.() ? CREW.charizard : CREW.manolo;
  dialog({ ...quien, emotion: 'Normal', highlight: free.map(r => r.id),
    text: quien === CREW.charizard
      ? `Charizard mira las llaves colgadas y luego a ${h.nombre}. Toca la habitación que le das.`
      : `A ver… ¿dónde pongo a ${h.nombre}? Toca la habitación que le das.`,
    options: [{ label: 'Que espere un poco', action: () => { inn.markHeard(id, 'espero'); inn.focus(null); say('manolo', 'Normal', `${h.nombre}, espera un momento, que enseguida te atiendo.`); } }] });
}

async function startTalk(id, after = null, done = null) {
  const h = last?.huespedes.find(x => x.id === id);
  const talk = inn.beginTalk(id);
  if (!h || !talk) return done?.();
  go('mostrador');
  // en las excursiones, cada grupo con su decorado (la feria, la playa, el dojo…) y sin acompañante al lado
  await counter.open({ sprite: h.cameo ? h.miembros[0].sprite : h.sprite, buddy: h.cameo ? null : h.acompanante, fase: last.fase, lugar: whereFor(h), escenario: h.cameo ? h.id : null });
  // el subtítulo dice la visita real (la charla puede llegar en una visita posterior)
  const ORD = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima'];
  const resto = (talk.entry.subtitulo || '').replace(/^\S+ visita · /, '');
  const sub = h.cameo ? talk.entry.subtitulo || '' : `${ORD[talk.visita - 1] || `Visita ${talk.visita}`} visita${resto ? ` · ${resto}` : ''}`;
  charla(h, talk.entry, sub, {
    // (las frases que cambian si alguien trabaja ya en la posada: «plantilla:<id>»)
    mejoras: [...inn.mejoras(), ...inn.bookView().plantilla.map(x => `plantilla:${x}`)],
    applyEffects: ef => inn.applyEffects(id, ef),
    async onEnd() {
      // si la charla acaba con el huésped yéndose, no se sigue a la recepción
      const { seVa, oferta } = await inn.endTalk(id, talk.entry);
      if (oferta) return ofertaTrabajo(oferta, after);
      if (after && !seVa) return after();
      counter.close();
      go('posada');
      done?.();
    },
  });
}

// Recorre una charla en el mostrador: quién habla, su cara, su animación y las respuestas
// en los grupos, los pequeños (los hijos junto a sus padres) salen un poco más chicos
const PEQUENOS = new Set(['ponyta', 'rattata', 'tentacool', 'horsea', 'krabby', 'seel', 'goldeen', 'poliwhirl', 'sandshrew', 'venonat', 'grimer', 'ekans', 'mankey', 'magnemite', 'omanyte', 'kabuto', 'abra']);
let musicaEvento = false;   // mientras suena el tema de un evento, la hora no cambia la música
let enPlano = false;        // y mientras dura un plano corto con su música
function charla(h, entry, sub, { mejoras = [], applyEffects = () => {}, onEnd }) {
  // cada evento (las excursiones) con su música: la feria, el Oeste, el dojo…
  if (h.cameo) { musicaEvento = true; setMood(h.id); }
  const run = runEntry(entry, {
    mejoras,
    applyEffects,
    onEnd() {
      if (musicaEvento || enPlano) { musicaEvento = false; enPlano = false; setMood(last?.fase || 'manana'); }
      return onEnd();
    },
    onNode(node) {
      // «pareja»: habla el acompañante (Nidoran♀); el huésped, con su nombre de hablante si lo tiene
      // en los grupos de una noche habla cada miembro con su nombre (quien = su id)
      const miembro = h.miembros?.find(m => m.id === node.quien);
      const who = miembro ? { sprite: miembro.sprite, nombre: miembro.especie }
        : node.quien === 'huesped' ? { sprite: h.sprite, nombre: h.hablante || h.nombre }
        : node.quien === 'pareja' && h.acompanante ? { sprite: h.acompanante, nombre: h.acompananteNombre || h.nombre } : CREW[node.quien];
      // en los grupos sale delante el que habla; «anim» hace su animación (se duerme, baila…)
      if (miembro) counter.setGuest(miembro.sprite, null, {
        pequeno: PEQUENOS.has(miembro.id), lado: ['0138', '0139'].includes(miembro.sprite) });
      counter.sombrero(!/quita el sombrero|vuela el sombrero/i.test(node.texto));
      // los planos cortos (el toro, el tejado, la hoguera…), cada uno con su música mientras dura
      const plano = node.plano || (node.silueta ? 'toro' : null);
      counter.plano(plano);
      if (plano && plano !== 'toro') { enPlano = true; musicaEvento = true; setMood(`plano_${plano}`); }
      else if (enPlano) { enPlano = false; musicaEvento = !!h.cameo; setMood(h.cameo ? h.id : last?.fase || 'manana'); }
      if (node.cielo) counter.cielo(node.cielo);
      if (node.anim) setTimeout(() => sfxAnim(node.anim), 250);   // y la animación suena
      counter.speak(node.quien, node.emocion, node.anim, node.anim_quien && node.anim_quien !== node.quien ? quienSprite(node.anim_quien) : null);
      const options = node.opciones
        ? node.opciones.map((o, i) => ({ label: o.texto, action: () => run.choose(i) }))
        : [{ label: node.sigue ? 'Seguir ▸' : 'Terminar', action: () => run.advance() }];
      dialog({ ...who, emotion: node.emocion || 'Normal', text: node.texto, options, sub });
    },
  });
  // el sprite de quien hace la animación cuando no es el que habla
  function quienSprite(q) {
    const m = h.miembros?.find(x => x.id === q);
    return m ? m.sprite : q === 'huesped' ? h.sprite : q === 'pareja' ? h.acompanante : q === 'charizard' ? '0006' : null;
  }
}

// Quien termina su historia puede quedarse a trabajar en la posada (si hay plazas en la plantilla)
function ofertaTrabajo(o, after) {
  const seguir = () => { if (after) return after(); counter.close(); go('posada'); };
  if (o.lleno) {
    return dialog({ ...CREW.manolo, emotion: 'Sigh', text: `A ${o.nombre} le gustaría quedarse a trabajar (${o.puesto}), pero la plantilla está completa. Con unas taquillas nuevas cabría alguien más.`,
      options: [{ label: 'Seguir ▸', action: () => seguir() }] });
  }
  // a quien venía solo de paso (y ya se despedía) se le ofrece quedarse en vez de irse
  const pregunta = o.dePaso ? `¡Espera, ${o.nombre}! ¿Y si en vez de irte te quedas a trabajar con nosotros?` : `Oye, ${o.nombre}… ¿y si te quedas a trabajar con nosotros?`;
  dialog({ ...CREW.manolo, emotion: 'Happy', text: `${pregunta} Haría falta alguien: ${o.puesto} (${o.ventaja}).`,
    options: [
      { label: '¡Contratado!', action: () => { inn.contratar(o.id); dialog({ ...CREW.manolo, emotion: 'Happy', text: `¡Bienvenido a la plantilla, ${o.nombre}! Cachimbita, chistorra… y a currar.`, options: [{ label: 'Seguir ▸', action: () => seguir() }] }); } },
      { label: 'Que siga su camino', action: () => seguir() },
    ] });
}

// ---------- lo que publica la posada ----------

function render(v) {
  last = v;
  if (state !== 'cocina' && !musicaEvento) setMood(v.fase);
  rainSound(!!v.lluvia);
  $('#day').textContent = `Día ${v.dia} · ${FASE_NOMBRE[v.fase]}`;
  $('#stats').innerHTML = `${starsHtml(v.estrellas)} ${v.monedas} monedas · ${v.chistorra} chistorra${v.chistorra === 1 ? '' : 's'} · <img class="mini-cara" src="${portraitUrl('0006', v.charizard === 'de buen humor' ? 'Happy' : v.charizard === 'tranquilo' ? 'Normal' : 'Angry')}" alt="Charizard" title="Charizard"><span class="largo">Charizard </span>${esc(v.charizard)}`;
  $('#advance').textContent = v.advance;
}

// Fin del día: lo que ha pasado, la caja y la tienda de mejoras (las obras, una por noche)
let lastNight = null;
function heartsHtml(n) {
  return `<span class="hearts" title="${n} de 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`;
}

// Qué hace falta para que venga alguien que aún no ha pasado por la posada
function pista(g) {
  const need = g.aparece || {};
  const out = [];
  if (need.estrellas && (last?.estrellas || 1) < need.estrellas) out.push(`Solo para en posadas de ${starsHtml(need.estrellas)}`);
  if (need.mejora && !inn.mejoras().includes(need.mejora)) {
    const u = inn.upgradesView().find(x => x.id === need.mejora);
    out.push(`Busca un sitio con ${esc((u?.nombre || need.mejora).toLowerCase())}`);
  }
  if (need.dia_min && (last?.dia || 1) < need.dia_min) out.push('Aún es pronto: pasará más adelante');
  return out.length ? `<p class="pista">${out.join(' · ')}.</p>` : '<p class="pista">Cualquier día de estos sube por el camino.</p>';
}

// Las estrellas de la posada, como los corazones: cinco en pixel art
function starsHtml(n) {
  return `<span class="stars" title="${n} de 5 estrellas">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`;
}

// Fin del día: una fila por huésped con su cara, sus corazones y lo que ha dejado
function night(s) {
  if (lastNight !== s) sfx('coin');
  lastNight = s;
  const cara = f => f.excursion ? 'Happy' : f.corazones == null ? 'Sad' : f.corazones >= 4 ? 'Happy' : f.corazones <= 1 ? 'Angry' : 'Normal';
  const filas = s.filas.map(f => `<li>
      <img src="${portraitUrl(f.sprite, cara(f))}" onerror="this.onerror=null;this.src='${portraitUrl(f.sprite, 'Normal')}'" alt="" width="40" height="40">
      <div><strong>${esc(f.nombre)}</strong> ${f.corazones != null ? heartsHtml(f.corazones) : ''}
        <span>${esc(f.motivos.join(' · ') || 'una noche sin más')}${f.vuelve ? ` · ${esc(f.vuelve)}` : ''}</span></div>
      <div class="gana">${f.corazones != null ? `<b>+${f.paga + f.propina}</b><small>${f.propina ? `${f.propina} de propina` : 'sin propina'}</small>` : f.paga ? `<b>+${f.paga}</b>` : '<b>—</b>'}
        ${f.fama > 0 ? '<small class="fama-up">+1 de fama</small>' : f.fama < 0 ? '<small class="fama-down">−1 de fama</small>' : ''}</div>
    </li>`).join('');
  const html = (filas ? `<ul class="resumen">${filas}</ul>` : '')
    + s.lines.map(l => `<p class="suceso">${esc(l)}</p>`).join('')
    + `<p class="total">Hoy <b>+${s.ganado}</b> monedas · en la caja ${last?.monedas ?? s.monedas}</p>`
    + (s.subeEstrella ? `<p class="total">¡La posada sube a ${starsHtml(s.estrellas)}! Vendrán huéspedes nuevos.</p>` : '')
    + `<button id="to-shop" class="secondary">Mejoras${shopCount() ? ` (${shopCount()} al alcance)` : ''}</button>`
    // todos han contado su historia: el libro está completo y toca el final
    + (inn.libroCompleto() && !inn.finalVisto() ? '<p class="total">¡Libro de visitas completo! Todos los huéspedes han contado su historia.</p><button id="to-final">Ver el final</button>' : '');
  card('noche', { title: `Fin del día ${s.dia}`, html, button: 'Ver la posada de noche' });
  $('#to-shop').addEventListener('click', () => shop());
  $('#to-final')?.addEventListener('click', verFinal);
}

// ---------- la tienda de mejoras: por pestañas, cada una con lo que hace y su precio ----------
let shopTab = null;
const shopCount = () => inn.upgradesView().filter(u => u.puede).length;
async function shop() {
  const list = inn.upgradesView();
  const grupos = [...new Set(list.map(u => u.grupo))];
  // tras el final, una pestaña más: volver a ver escenas y jugar minijuegos sueltos, pagando
  if (inn.finalVisto()) grupos.push(TAB_FINAL);
  if (!grupos.includes(shopTab)) shopTab = grupos.find(g => list.some(u => u.grupo === g && u.puede)) || (inn.finalVisto() ? TAB_FINAL : grupos[0]);
  // las obras, una por noche (lo demás se compra mientras haya dinero)
  const yaHoy = shopTab === 'Obras' && list.some(u => u.bloqueada && !u.tiene && !u.falta);
  const v = last;
  let html = `<div class="shop-head">${starsHtml(v.estrellas)}<span>${v.monedas} monedas</span><button class="secondary volver-arriba" id="shop-back">Volver</button></div>`
    + (yaHoy ? '<p class="muted small">Una obra por noche: mañana, otra.</p>' : '')
    + `<nav class="shop-tabs">${grupos.map(g => `<button class="secondary${g === shopTab ? ' active' : ''}${g === TAB_FINAL ? ' tab-final' : ''}" data-tab="${esc(g)}">${esc(g)}</button>`).join('')}</nav>`;
  if (shopTab === TAB_FINAL) return otraVez(html, ctxPartida());
  html += '<ul class="shop">';
  for (const u of list.filter(x => x.grupo === shopTab)) {
    // las fotos de recuerdo, una vez compradas: se descargan para el móvil o el ordenador
    const right = u.tiene && u.foto ? `<span class="fondos"><button class="secondary" data-fondo="${u.foto}:movil">Móvil</button><button class="secondary" data-fondo="${u.foto}:ordenador">Ordenador</button></span>`
      : u.tiene ? '<span class="owned">Hecha</span>'
      : `<button data-buy="${u.id}" ${u.puede ? '' : 'disabled'}>${u.precio} monedas</button>`;
    const pts = u.puntos && !u.tiene ? `<i class="fama-chip">${starsHtml(1).replace('class="stars"', 'class="stars one"')}+${u.puntos}</i>` : '';
    const nota = u.falta ? `Antes hay que hacer: ${u.falta}` : u.faltanEstrellas ? `Solo para una posada de ${u.faltanEstrellas} estrellas.` : u.faltaRecuerdo && !u.tiene ? u.faltaRecuerdo : u.efecto;
    html += `<li class="${u.tiene ? 'done' : ''}"><div><strong>${esc(u.nombre)} ${pts}</strong><span>${esc(nota)}</span></div>${right}</li>`;
  }
  html += '</ul>';
  card('noche', { title: 'Mejoras', html, button: last?.fase === 'noche' ? 'Ver la posada de noche' : 'Volver a la posada' });
  for (const b of document.querySelectorAll('[data-buy]')) {
    b.addEventListener('click', async () => { if (await inn.buyUpgrade(b.dataset.buy)) shop(); });
  }
  enlazarFondos(() => inn.datosFoto());
  enlazarTienda();
}
// las pestañas y el «Volver» de arriba de la tienda
function enlazarTienda() {
  for (const b of document.querySelectorAll('.shop-tabs [data-tab]')) b.addEventListener('click', () => { shopTab = b.dataset.tab; shop(); });
  $('#shop-back').addEventListener('click', () => $('#stub-back').click());
}
// Los botones de descargar foto («foto:formato»); mientras se dibuja, el botón espera
function enlazarFondos(datos) {
  for (const b of document.querySelectorAll('[data-fondo]')) b.addEventListener('click', async () => {
    const [foto, tipo] = b.dataset.fondo.split(':');
    b.disabled = true;
    try { await descargarFondo(foto, tipo, datos()); } finally { b.disabled = false; }
  });
}

// ---------- tras el final: «Otra vez» (volver a ver escenas y jugar minijuegos sueltos, pagando) ----------
// Lo que se ve o se juega aquí no cambia la partida: solo cuesta monedas. Las escenas, solo las de quien ya ha
// pasado por la posada (los planos, si se ha visto su capítulo). Un minijuego perfecto se apunta en el récord;
// no da monedas, que esto es para gastar lo que sobra.
const TAB_FINAL = 'Otra vez';
const PRECIO = { minijuego: 30, plano: 60, evento: 50, encargo: 20 };
const mayuscula = t => t.charAt(0).toUpperCase() + t.slice(1);
let otraQuien = null;   // de quién se están viendo los encargos (se queda abierto al volver)

// Todo lo que se puede volver a ver o jugar, con lo que hay desbloqueado (ctx.todo: todo, para las pruebas)
async function repertorio(ctx) {
  const data = await loadGuestData();
  const recetas = (await loadRecipes()).recipes;
  const { libro = {}, vistas = {}, flags = {} } = ctx.book || {};
  const conocido = id => ctx.todo || !!libro[id];
  const visto = (id, e) => ctx.todo || (vistas[id] || []).includes(e);
  const minijuegos = [
    ...recetas.filter(r => !r.desbloquea || ctx.todo || flags[r.desbloquea]).map(r => ({ id: `receta:${r.id}`, nombre: mayuscula(r.nombre), jugar: fin => demoCocina(r.id, fin) })),
    ...MJ_DEMO.map(def => ({ id: `mj:${def[0]}`, nombre: def[1], jugar: fin => demoMinijuego(def, fin) })),
  ].map(x => ({ ...x, tipo: 'minijuego', precio: PRECIO.minijuego }));
  const planos = PLANOS_DEMO.filter(([id, e]) => visto(id, e))
    .map(def => ({ tipo: 'plano', precio: PRECIO.plano, nombre: def[3], jugar: fin => demoPlano(def, data, fin) }));
  const eventos = data.guests.filter(g => g.cameo && conocido(g.id))
    .map(g => ({ tipo: 'evento', precio: PRECIO.evento, nombre: g.especie, jugar: fin => demoEvento(g, fin) }));
  // los encargos de cada huésped conocido, en las formas que se le han visto
  const encargos = [];
  for (const g of data.guests) {
    if (g.cameo || !conocido(g.id)) continue;
    const formas = ctx.todo ? (g.evoluciones || []).length : (libro[g.id].forma || 0);
    const lista = [];
    for (const f of [g, ...(g.evoluciones || []).slice(0, formas).map(e => ({ ...g, ...e, base: g }))]) {
      for (const p of f.pide || []) if (p.tipo !== 'comida') {
        lista.push({ tipo: 'encargo', precio: PRECIO.encargo, nombre: f.base ? `${f.especie}: ${p.texto}` : p.texto, jugar: fin => verEncargo(f, p, fin) });
      }
    }
    if (lista.length) encargos.push({ quien: g.especie, lista });
  }
  return { minijuegos, planos, eventos, encargos };
}
function verEncargo(guest, pide, fin) {
  go('posada');
  showScene({ guest, pide, helper: pide.quien || 'manolo', fase: 'dia', atendido: true }, () => fin());
}

// El panel: head es la cabecera (la de la tienda, con sus pestañas, o la de las pruebas)
async function otraVez(head, ctx) {
  const r = await repertorio(ctx);
  const monedas = ctx.monedas(), records = ctx.records();
  const items = [];
  const boton = it => { items.push(it); return `<button class="secondary" data-otra="${items.length - 1}" ${monedas >= it.precio ? '' : 'disabled'}>${esc(it.nombre)}</button>`; };
  const seccion = (titulo, precio, lista, vacio) => `<h4 class="otra-h">${titulo} <small>· ${precio} monedas</small></h4>`
    + (lista.length ? `<p class="demo otra-chips">${lista.map(boton).join('')}</p>` : `<p class="muted small">${vacio}</p>`);
  const nEncargos = r.encargos.reduce((a, g) => a + g.lista.length, 0);
  if (!r.encargos[otraQuien]) otraQuien = null;
  const html = head
    + '<p class="muted small">Ya has visto el final. Con lo que sobra en la caja se puede volver a ver lo que pasó en la posada y jugar a los minijuegos sueltos. Nada de esto cambia la partida: solo cuesta monedas.</p>'
    + `<h4 class="otra-h">Minijuegos <small>· ${PRECIO.minijuego} monedas la partida</small></h4><p class="muted small">Si sale perfecto, se apunta en el récord (entre paréntesis, los perfectos).</p>`
    + '<p class="demo otra-chips otra-vez">' + r.minijuegos.map(it => {
      // el récord: cuántas veces ha salido perfecto
      const rec = records[it.id];
      items.push(it);
      return `<button class="secondary${rec?.perfectos ? ' record' : ''}" data-otra="${items.length - 1}" ${monedas >= it.precio ? '' : 'disabled'}>${esc(it.nombre)}${rec?.perfectos ? ` (${rec.perfectos})` : ''}</button>`;
    }).join('') + '</p>'
    + seccion('Planos de las historias', PRECIO.plano, r.planos, 'Aún no se ha visto ninguno.')
    + seccion('Excursiones', PRECIO.evento, r.eventos, 'Aún no ha subido ningún autobús.')
    // los encargos, por huésped: se toca su nombre y salen sus escenas debajo
    + `<h4 class="otra-h">Escenas de los encargos <small>· ${PRECIO.encargo} monedas cada una</small></h4>`
    + (nEncargos ? `<p class="muted small">${nEncargos} escenas de ${r.encargos.length} huéspedes. Toca uno para ver las suyas.</p>`
      + `<p class="demo otra-chips otra-quienes">${r.encargos.map((g, i) => `<button class="secondary${i === otraQuien ? ' active' : ''}" data-quien="${i}">${esc(g.quien)}</button>`).join('')}</p>`
      + r.encargos.map((g, i) => `<p class="demo otra-chips otra-escenas${i === otraQuien ? '' : ' hidden'}" data-escenas="${i}"><b class="otra-quien">${esc(g.quien)}</b>${g.lista.map(boton).join('')}</p>`).join('')
      : '<p class="muted small">Aún no ha pasado nadie por la posada.</p>');
  ctx.pintar(html);
  for (const b of document.querySelectorAll('[data-quien]')) b.addEventListener('click', () => {
    otraQuien = +b.dataset.quien;
    for (const x of document.querySelectorAll('[data-quien]')) x.classList.toggle('active', x === b);
    for (const x of document.querySelectorAll('[data-escenas]')) x.classList.toggle('hidden', +x.dataset.escenas !== otraQuien);
    document.querySelector(`[data-escenas="${otraQuien}"]`)?.scrollIntoView({ block: 'nearest' });
  });
  for (const b of document.querySelectorAll('[data-otra]')) b.addEventListener('click', () => {
    const it = items[b.dataset.otra];
    if (!ctx.pagar(it.precio)) return toast('No llega con lo que hay en la caja.');
    repitiendo = !ctx.demo;
    // (que no se quede en el cuadro lo último que se dijo)
    if (it.tipo !== 'minijuego') say('manolo', 'Happy', '¿Te acuerdas, Charizard? Fue así, tal cual.');
    it.jugar(res => {
      repitiendo = false;
      if (it.tipo === 'minijuego' && res) {
        const rec = ctx.apuntar(it.id, res.resultado);
        if (res.resultado === 'perfecto') toast(rec.perfectos > 1 ? `¡Perfecto! Ya van ${rec.perfectos}. Charizard pide que lo apuntéis en la pizarra de la cocina.` : '¡Perfecto! Apuntado en el récord. Charizard lo celebra echando humo.');
      }
      ctx.volver();
    });
  });
}
// En la partida: cobra de la caja y apunta los récords en el guardado
function ctxPartida() {
  return {
    book: inn.bookView(), monedas: () => last?.monedas ?? 0, pagar: n => inn.pagar(n),
    records: () => inn.records(), apuntar: (id, res) => inn.apuntarRecord(id, res),
    volver: () => { shopTab = TAB_FINAL; shop(); },
    pintar(html) {
      card('noche', { title: 'Mejoras', html, button: last?.fase === 'noche' ? 'Ver la posada de noche' : 'Volver a la posada' });
      enlazarTienda();
    },
  };
}

// ---------- libro de visitas (estilo Pokédex) y recetario ----------

let bookTab = 'libro', bookSel = null;

async function libro() {
  const data = await loadGuestData();
  const book = inn.bookView();
  $('#book-count').textContent = `Kanto: ${kantoVistos(book.libro)} / 151`;
  for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === bookTab);
  const list = $('#book-list'), detail = $('#book-detail');
  const scroll = list.scrollTop;   // al tocar un Pokémon, la lista se queda donde estaba
  list.innerHTML = '';
  if (bookTab === 'recetario') {
    const recipes = (await loadRecipes()).recipes;
    list.classList.add('hidden');
    detail.innerHTML = '<h3>Recetario</h3><ul class="recipes">' + recipes.filter(r => !r.especial || book.flags[r.desbloquea]).map(r => {
      const e = book.recetario[r.id];
      const caras = (e?.gustan || []).map(id => {
        const g = data.guests.find(x => x.id === id);
        return `<img src="${portraitUrl(g.sprite, 'Happy')}" alt="${esc(g.especie)}" title="${esc(g.especie)}" width="40" height="40">`;
      }).join('');
      return `<li><strong>${esc(r.nombre[0].toUpperCase() + r.nombre.slice(1))}</strong>`
        + (e ? `<span>${r.genero === 'f' ? 'Cocinada' : 'Cocinado'} ${e.veces || 0} ${e.veces === 1 ? 'vez' : 'veces'} · ${e.perfectos || 0} ${r.genero === 'f' ? 'perfecta' : 'perfecto'}${e.perfectos === 1 ? '' : 's'}</span>` : '<span>Aún no se ha cocinado.</span>')
        + `<span>${r.juego && r.juego !== 'llama' ? JUEGO[r.juego] : `Fuego: ${r.pasos.map(p => p.zona).join(' → ')}`}</span>`
        + (caras ? `<div class="faces">Les gusta: ${caras}</div>` : '') + '</li>';
    }).join('') + '</ul>';
    go('libro');
    return;
  }
  list.classList.remove('hidden');
  // la Pokédex entera: del 1 al 151 (más los de otras regiones que hayan pasado); cada número, con
  // la historia a la que pertenece (evoluciones, la pareja de Nidoran, los grupos de una noche)
  const porDex = new Map(pokedex(book.libro).map(f => [f.dex, f]));
  const filas = [...Array(151)].map((_, i) => porDex.get(i + 1) || { dex: i + 1, visto: false });
  for (const f of porDex.values()) if (f.dex > 151 && f.visto) filas.push(f);
  if (!filas.some(f => f.dex === bookSel)) bookSel = (filas.find(f => f.visto && f.guest) || filas[0]).dex;
  for (const f of filas) {
    const li = document.createElement('li');
    li.className = (f.dex === bookSel ? 'selected ' : '') + (f.visto ? '' : 'unseen');
    li.innerHTML = `<span class="dexno">#${String(f.dex).padStart(3, '0')}</span> ${f.visto ? esc(f.especie) : '???'}`;
    li.addEventListener('click', () => { bookSel = f.dex; libro(); });
    list.append(li);
  }
  list.scrollTop = scroll;
  const fila = filas.find(f => f.dex === bookSel);
  const num = `#${String(fila.dex).padStart(3, '0')}`;
  const g = fila.guest && data.guests.find(x => x.id === fila.guest);
  const e = g && book.libro[g.id];
  if (!fila.guest && fila.visto) {
    detail.innerHTML = `<div class="dex-card"><img class="dex-face" src="${portraitUrl(fila.sprite, 'Happy')}" alt="" width="40" height="40">
      <div><h3>${num} · ${esc(fila.especie)}</h3><p>Vive en la posada con Manolo. Come chistorra, sube maletas y quema cosas sin querer.</p></div></div>`;
  } else if (!g) {
    detail.innerHTML = `<div class="dex-card"><div class="dex-face unseen"></div>
      <div><h3>${num} · ???</h3><p class="muted">Aún no ha pasado por la posada. Nadie sabe nada de él… todavía.</p></div></div>`;
  } else if (!fila.visto) {
    detail.innerHTML = `<div class="dex-card"><img class="dex-face unseen" src="${portraitUrl(fila.sprite, 'Normal')}" alt="" width="40" height="40">
      <div><h3>${num} · ???</h3><p class="muted">${e ? 'Ya ha pasado por la posada, pero aún no se le ha visto así.' : 'Aún no ha pasado por la posada.'}</p>${e ? '' : pista(g)}</div></div>`;
  } else {
    const af = book.afinidad[g.id] || 0;
    const dlg = await loadDialogue(g.id);
    const capitulos = (book.vistas[g.id] || []).map(id => dlg?.entradas.find(x => x.id === id)?.subtitulo).filter(Boolean);
    const gusta = Object.entries(book.recetario).filter(([, r]) => r.gustan.includes(g.id)).map(([id]) => id);
    const recipes = (await loadRecipes()).recipes;
    const forma = (g.evoluciones || []).find(x => x.dex === fila.dex) || g;
    detail.innerHTML = `<div class="dex-card"><img class="dex-face" src="${portraitUrl(fila.sprite, af >= 3 ? 'Happy' : 'Normal')}" alt="" width="40" height="40">
      <div><h3>${num} · ${esc(fila.especie)}</h3>
      ${g.cameo ? `<p class="muted">Vino con ${esc(g.especie)}</p>` : ''}
      <p class="types">${(forma.tipos || g.tipos || []).map(t => `<span class="type type-${t}">${esc(t)}</span>`).join('')}</p>
      <p>${e.visitas} ${e.visitas === 1 ? 'visita' : 'visitas'} · la última, el día ${e.ultimo}</p>
      ${g.cameo ? '' : `<p>Afinidad ${heartsHtml(af)}</p>`}
      ${e.felicidad != null && !g.cameo ? `<p>Última estancia ${heartsHtml(e.felicidad)}</p>` : ''}</div></div>
      <p class="reason">${esc(g.razon)}</p>
      ${book.plantilla.includes(g.id) ? `<p class="reason">Trabaja en la posada: ${esc(g.empleo?.puesto || '')}.</p>` : ''}
      <h4>Su historia</h4>${g.aparece?.no_si && book.flags[g.aparece.no_si] ? '<p class="muted">Se ha quedado a vivir en la posada.</p>' : book.plantilla.includes(g.id) ? '<p class="muted">Historia completa: se quedó a trabajar en la posada.</p>' : book.terminados?.has(g.id) ? '<p class="muted">Historia completa: se despidió de la posada.</p>' : ''}${capitulos.length ? `<ol class="chapters">${capitulos.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : '<p class="muted">Aún no habéis charlado.</p>'}
      ${g.cameo ? '' : `<h4>Le gusta</h4><p>${gusta.length ? gusta.map(id => esc(recipes.find(r => r.id === id).nombre)).join(', ') : '<span class="muted">Todavía no lo sabes: cocínale algo rico.</span>'}</p>`}`;
  }
  go('libro');
}

for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { bookTab = b.dataset.tab; libro(); });
$('#book-close').addEventListener('click', () => go('posada'));

// ---------- exportar e importar la partida ----------

// ---------- tu partida: copias automáticas, código para otro aparato y archivo ----------
let confirmCopia = null;
async function panelPartida() {
  const lista = copias();
  const fecha = ms => new Date(ms).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const html = `<p class="muted small">La partida se guarda sola al acabar cada parte del día, y también la del final de los días anteriores.</p>
    <h4>Copias de días anteriores</h4>`
    + (lista.length ? `<ul class="copias">${lista.map((c, i) => `<li><span>Día ${c.dia} <small class="muted">· ${esc(fecha(c.fecha))}</small></span>
        <button class="secondary" data-copia="${i}">${confirmCopia === i ? '¿Seguro? Vuelves a ese día' : 'Volver a este día'}</button></li>`).join('')}</ul>`
      : '<p class="muted small">Aún no hay copias de otros días: se hacen solas al ir jugando.</p>')
    + `<h4>Pasar la partida a otro aparato</h4>
    <p class="muted small">Copia el código y pégalo aquí mismo en el otro aparato (móvil u ordenador).</p>
    <p class="demo"><button id="cod-copiar" ${hasSave() ? '' : 'disabled'}>Copiar código</button>${navigator.share ? `<button id="cod-compartir" class="secondary" ${hasSave() ? '' : 'disabled'}>Compartir</button>` : ''}</p>
    <textarea id="cod-texto" rows="3" placeholder="Pega aquí el código de la partida"></textarea>
    <p class="demo"><button id="cod-cargar" class="secondary">Cargar este código</button></p>
    <h4>En un archivo</h4>
    <p class="demo"><button id="start-export" class="secondary" ${hasSave() ? '' : 'disabled'}>Exportar partida</button><button id="start-import" class="secondary">Importar partida</button></p>`;
  card('partida', { title: 'Tu partida', html, button: 'Volver' });
  for (const b of document.querySelectorAll('[data-copia]')) b.addEventListener('click', async () => {
    const i = +b.dataset.copia;
    if (confirmCopia !== i) { confirmCopia = i; return panelPartida(); }
    confirmCopia = null;
    await inn.importState(JSON.stringify(lista[i].datos));
    refreshStart();
    go('inicio');
    toast(`Has vuelto al día ${lista[i].dia}.`);
  });
  const codigo = () => codigoDe(inn.exportState());
  $('#cod-copiar').addEventListener('click', async () => {
    const c = await codigo();
    try { await navigator.clipboard.writeText(c); toast('Código copiado. Pégalo en el otro aparato, en «Tu partida».'); }
    catch { $('#cod-texto').value = c; $('#cod-texto').select(); toast('Copia el código del recuadro.'); }
  });
  $('#cod-compartir')?.addEventListener('click', async () => {
    try { await navigator.share({ title: 'Mi partida de El Pino Calcinado', text: await codigo() }); } catch { /* cancelado */ }
  });
  $('#cod-cargar').addEventListener('click', async () => {
    const t = $('#cod-texto').value.trim();
    if (!t) return toast('Pega primero el código en el recuadro.');
    try {
      await inn.importState(await textoDe(t));
      refreshStart();
      go('inicio');
      toast(`Partida cargada: día ${last.dia}.`);
    } catch {
      toast('Ese código no es una partida de El Pino Calcinado (o le falta un trozo).');
    }
  });
  $('#start-export').addEventListener('click', exportarArchivo);
  $('#start-import').addEventListener('click', () => $('#import-file').click());
}
$('#start-partida').addEventListener('click', () => { confirmCopia = null; panelPartida(); });

function exportarArchivo() {
  const blob = new Blob([inn.exportState()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `el-pino-calcinado-dia-${last?.dia ?? 1}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#import-file').addEventListener('change', async ev => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    await inn.importState(await file.text());
    refreshStart();
    go('inicio');
    toast(`Partida importada: día ${last.dia}.`);
  } catch (err) {
    toast(err instanceof SyntaxError ? 'No se ha podido importar: ese archivo no es una partida de El Pino Calcinado.' : `No se ha podido importar: ${err.message}`);
  }
});

// ---------- portada ----------

let confirmReset = false;

function refreshStart() {
  const saved = hasSave();
  confirmReset = false;
  $('#start-open').textContent = saved && last ? `Continuar · día ${last.dia}` : saved ? 'Continuar' : 'Abrir la posada';
  $('#start-new').classList.toggle('hidden', !saved);
  $('#start-new').textContent = 'Nueva partida';
  $('#start-final').classList.toggle('hidden', !inn?.finalVisto());
}

// El final (también se puede volver a ver desde el inicio)
async function verFinal() {
  const primera = !inn.finalVisto();
  await playFinal(kantoVistos(inn.bookView().libro));
  inn.marcarFinal();
  refreshStart();
  if (state === 'noche') go('posada');
  if (primera) toast(`En la tienda hay una pestaña nueva, «${TAB_FINAL}»: volver a ver escenas y jugar a los minijuegos sueltos con lo que sobre en la caja.`);
}

// la primera vez (sin partida guardada) se cuenta la historia antes de abrir
// Pantalla completa: en Android y en el ordenador, con el botón (y sola al abrir la posada en el móvil).
// En iPhone no se puede desde Safari: hay que añadir el juego a la pantalla de inicio.
const tactil = matchMedia('(pointer: coarse)').matches;
const instalada = navigator.standalone || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
const puedeFS = !!document.documentElement.requestFullscreen && document.fullscreenEnabled;
function pantallaCompleta() {
  if (!puedeFS || document.fullscreenElement) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('portrait').catch(() => {})).catch(() => {});
}
$('#start-full').classList.toggle('hidden', !puedeFS || instalada);
$('#start-full').addEventListener('click', pantallaCompleta);
$('#ios-tip').classList.toggle('hidden', puedeFS || instalada || !/iPhone|iPod/.test(navigator.userAgent));

$('#start-open').addEventListener('click', async () => {
  if (tactil && !instalada) pantallaCompleta();
  if (!hasSave() && !introVista) { introVista = true; await playIntro(); }
  go('posada');
});
let introVista = false;
$('#start-story').addEventListener('click', () => playIntro());
$('#start-final').addEventListener('click', () => verFinal());

// Música y efectos, con su preferencia guardada
$('#opt-music').checked = getPrefs().music;
$('#opt-sfx').checked = getPrefs().sfx;
$('#opt-music').addEventListener('change', e => setMusic(e.target.checked));
$('#opt-sfx').addEventListener('change', e => setSfx(e.target.checked));

// que el navegador no borre la partida cuando le falte sitio
pedirPersistencia();

// Se puede instalar como app (PWA) y jugar sin conexión
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
$('#start-new').addEventListener('click', async () => {
  if (!confirmReset) {
    confirmReset = true;
    $('#start-new').textContent = '¿Seguro? Se borra la partida';
    return;
  }
  await inn.reset();
  await inn.begin();
  await playIntro();
  say('manolo', 'Happy', 'Todo listo. A ver quién sube hoy por el camino.');
  go('posada');
});

// ---------- eventos ----------

$('#hud-menu').addEventListener('click', () => go('inicio'));
$('#stub-back').addEventListener('click', () => { if (state === 'demo') location.href = location.pathname; else if (state === 'partida') go('inicio'); else go('posada'); });
$('[data-action="libro"]').addEventListener('click', libro);
// la tienda de mejoras, a mano a cualquier hora (si se pasó comprar algo por la noche)
$('[data-action="tienda"]').addEventListener('click', () => shop());
$('#advance').addEventListener('click', () => { closeChoice(); inn.advance(); });

scene.onHover((thing, ev) => {
  const tip = $('#tooltip');
  if (!thing) { tip.classList.add('hidden'); return; }
  let nota = thing.nota;
  if (nota == null) {
    const occupant = last?.huespedes.find(h => h.hab === thing.nombre);
    const col = COLORES[thing.color];
    nota = thing.cerrada ? 'cerrada' : occupant ? occupant.nombre : thing.color ? `libre · ${col.nombre}: les gusta a ${col.tipos.join(' y ')}` : '';
  }
  tip.innerHTML = `${esc(thing.nombre)}${nota ? ` <small>· ${esc(nota)}</small>` : ''}`;
  tip.classList.remove('hidden');
  // que no se salga por los lados (en el móvil la pantalla es estrecha)
  tip.style.whiteSpace = 'nowrap';
  const half = Math.min(tip.offsetWidth, innerWidth - 16) / 2;
  if (tip.offsetWidth > innerWidth - 16) tip.style.whiteSpace = 'normal';
  tip.style.maxWidth = `${innerWidth - 16}px`;
  tip.style.left = `${Math.max(8 + half, Math.min(innerWidth - 8 - half, ev.clientX))}px`;
  tip.style.top = ev.clientY + 'px';
  // con el dedo no hay «quitar el ratón»: la etiqueta se va sola
  clearTimeout(tip.timer);
  if (ev.pointerType === 'touch') tip.timer = setTimeout(() => tip.classList.add('hidden'), 1400);
});

scene.onClick(thing => {
  if (!thing || state !== 'posada') return;
  if (thing.huesped) talk(thing.huesped);
  else if (thing.sprite) inn.clickActor(thing);
  else inn.clickRoom(thing);
});

// ---------- pruebas: …/?demo enseña solo lo nuevo, sin tocar la partida ----------
// (los minijuegos nuevos, cada evento por separado y todas las animaciones)
// las pruebas (?demo, ?final) solo en el ordenador del autor, no en la versión publicada
const LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const DEMO = LOCAL && new URLSearchParams(location.search).has('demo');
const ENCARGOS = new URLSearchParams(location.search).has('encargos');   // ?demo&encargos: directo a las escenas de los encargos
async function demo() {
  const data = await loadGuestData();
  const grupos = data.guests.filter(g => g.cameo);
  const html = '<p class="muted small">Lo nuevo, para verlo suelto. Aquí no se guarda nada en tu partida.</p>'
    + '<h4>Cocina</h4><p class="demo">' + [['kebab', 'Kebab de chistorra'], ['pescado', 'Sopa de pescado']].map(([id, n]) => `<button class="secondary" data-demo-cocina="${id}">${n}</button>`).join('') + '</p>'
    + '<h4>Minijuegos nuevos</h4><p class="demo">' + MJ_DEMO.map(([id, n], i) => `<button class="secondary" data-demo-mj="${i}">${n}</button>`).join('') + '</p>'
    + '<h4>Eventos (por la mañana, cada uno con su decorado)</h4><p class="demo">' + grupos.map(g => `<button class="secondary" data-demo-evento="${g.id}">${esc(g.especie)}</button>`).join('') + '</p>'
    + '<h4>Planos cortos de las historias</h4><p class="demo">' + PLANOS_DEMO.map(([id, , , n], i) => `<button class="secondary" data-demo-plano="${i}">${n}</button>`).join('') + '</p>'
    + `<details class="demo" id="demo-encargos" ${ENCARGOS ? 'open' : ''}><summary>Escenas de los encargos (una por huésped)</summary><p class="demo"><button data-demo-encargos-todas>Verlas todas seguidas (Seguir pasa a la siguiente)</button></p><p class="demo">`
    + encargosDemo(data).map(([f, p], i) => `<button class="secondary" data-demo-encargo="${i}">${esc(f.especie)}: ${esc(p.objeto)}</button>`).join('') + '</p></details>'
    + '<h4>Recuerdos y lo de después del final</h4><p class="demo"><button class="secondary" data-demo-fotos>Las fotos de recuerdo</button><button class="secondary" data-demo-final>El panel «Otra vez» (tras el final)</button></p>'
    + '<h4>Animaciones</h4><p class="demo"><button class="secondary" data-demo-anims>Verlas todas</button></p>'
    + '<details class="demo"><summary>Sonidos (cada uno: normal, contento y triste)</summary><p class="demo"><button class="secondary" data-demo-nana>La nana de Jigglypuff</button>'
    + voces(data).map(v => `<button class="secondary" data-demo-grito="${v.sprite}">${esc(v.nombre)}</button>`).join('') + '</p></details>';
  card('demo', { title: 'Pruebas', html, button: 'Salir de las pruebas' });
  for (const b of document.querySelectorAll('[data-demo-cocina]')) b.addEventListener('click', () => demoCocina(b.dataset.demoCocina));
  for (const b of document.querySelectorAll('[data-demo-mj]')) b.addEventListener('click', () => demoMinijuego(MJ_DEMO[b.dataset.demoMj]));
  for (const b of document.querySelectorAll('[data-demo-evento]')) b.addEventListener('click', () => demoEvento(grupos.find(g => g.id === b.dataset.demoEvento)));
  $('[data-demo-anims]').addEventListener('click', demoAnims);
  $('[data-demo-fotos]').addEventListener('click', demoFotos);
  $('[data-demo-final]').addEventListener('click', demoFinal);
  if (ENCARGOS) $('#demo-encargos').scrollIntoView();
  $('[data-demo-encargos-todas]').addEventListener('click', () => demoEncargosSeguidos(encargosDemo(data)));
  for (const b of document.querySelectorAll('[data-demo-encargo]')) b.addEventListener('click', () => {
    const [guest, pide] = encargosDemo(data)[b.dataset.demoEncargo];
    go('posada');
    showScene({ guest, pide, helper: pide.quien || 'manolo', fase: 'dia', atendido: true }, () => demo());
  });
  for (const b of document.querySelectorAll('[data-demo-plano]')) b.addEventListener('click', () => demoPlano(PLANOS_DEMO[b.dataset.demoPlano], data));
  $('[data-demo-nana]').addEventListener('click', () => cancion());
  for (const b of document.querySelectorAll('[data-demo-grito]')) b.addEventListener('click', () => {
    ['Normal', 'Happy', 'Sad'].forEach((e, i) => setTimeout(() => cry(b.dataset.demoGrito, e), i * 900));
  });
}
// Todos los que hablan en el juego, una vez cada uno: huéspedes, sus evoluciones, acompañantes y grupos
function voces(data) {
  const out = new Map([['0006', 'Charizard']]);
  for (const g of data.guests) {
    if (g.cameo) { for (const m of g.miembros || []) out.set(m.sprite, m.especie); continue; }
    out.set(g.sprite, g.hablante || g.especie);
    if (/^\d+$/.test(g.acompanante || '')) out.set(g.acompanante, g.acompanante_especie || g.especie);
    for (const e of g.evoluciones || []) out.set(e.sprite, e.hablante || e.especie);
  }
  return [...out].map(([sprite, nombre]) => ({ sprite, nombre })).sort((a, b) => a.sprite.localeCompare(b.sprite));
}
// Los minijuegos de los sucesos y encargos, sueltos (con unos datos de ejemplo: el café de Mr. Mime, el termal de Geodude…)
const MJ_DEMO = [['lena', 'Leña para la nevada'], ['velas', 'Las velas del apagón', { n: 5 }], ['estrellas', 'Deseos en la lluvia de estrellas'],
  ['cafe', 'El café a la malagueña', { tipo: 'sombra', especie: 'Mr. Mime', sprite: '0122' }], ['despensa', '¿Quién se come la chistorra?', { culpable: '0006' }],
  ['planta', 'La planta del Bulbasaur', { modo: 'regadera', sprite: '0001' }], ['maletas', 'El Tetris de maletas'], ['camino', 'Abrir el camino'],
  ['termal', 'El punto del termal', { punto: 'hirviendo', sprite: '0074', especie: 'Geodude', psyduck: true }]];
async function demoMinijuego(def, despues = demo) {
  const r = await minijuegoSuelto(def);
  say('manolo', r.resultado === 'perfecto' ? 'Happy' : r.resultado === 'bien' ? 'Normal' : 'Sad',
    r.resultado === 'perfecto' ? '¡Perfecto!' : r.resultado === 'bien' ? `Bien${r.crudo ? ', por los pelos' : ''}.` : 'Mal: eso no ha salido.');
  despues(r);
}
// un minijuego de los sucesos, suelto, con sus datos de ejemplo (sin pasar por la posada)
const minijuegoSuelto = ([juego, , datos = {}]) => minijuego(juego, { datos, nivel: 0.3, volver: false });
async function demoCocina(id, despues = demo) {
  const recipe = (await loadRecipes()).recipes.find(r => r.id === id);
  go('cocina');
  setMood('cocina');
  say('manolo', 'Happy', `¡Vamos allá, Charizard! Una de ${recipe.nombre}.`);
  const r = await kitchen.cook(recipe, { moral: 6, nivel: 0.2, onStep: p => say('manolo', 'Normal', p.texto) });
  const { resultado, crudo } = r;
  say('manolo', resultado === 'quemado' ? 'Sad' : 'Happy', resultado === 'perfecto' ? '¡Perfecto!' : resultado === 'quemado' ? 'Se ha quemado (o echado a perder)…' : resultado === 'crudo' ? 'Sin hacer: así no se puede servir.' : crudo ? 'Bien, aunque algo crudo.' : 'Bien hecho.');
  despues(r);
}
async function demoEvento(g, despues = demo) {
  const dlg = await loadDialogue(g.id);
  const h = { id: g.id, sprite: g.sprite, nombre: g.especie, cameo: true, miembros: g.miembros };
  go('mostrador');
  await counter.open({ sprite: g.miembros[0].sprite, fase: 'manana', lugar: 'fuera', escenario: g.id });
  charla(h, dlg.entradas[0], dlg.entradas[0].subtitulo || '', { onEnd() { counter.close(); despues(); } });
}
// Los planos cortos: el momento suelto de su historia, con el huésped en la forma que tiene en ese capítulo
// las 200 escenas una detrás de otra: «Seguir» salta a la siguiente y «Parar» vuelve a la lista
function demoEncargosSeguidos(lista) {
  let i = 0, parado = false;
  const parar = document.createElement('button');
  parar.textContent = 'Parar';
  Object.assign(parar.style, { position: 'fixed', top: '96px', right: '8px', zIndex: 9999 });
  const rotulo = document.createElement('div');
  Object.assign(rotulo.style, { position: 'fixed', top: '92px', left: '0', right: '0', zIndex: 9998, color: '#FFF7BF',
    background: '#100C14E0', padding: '14px 100px 14px 12px', fontSize: '20px' });
  document.body.append(parar, rotulo);
  const acabar = () => { parado = true; parar.remove(); rotulo.remove(); $('#popup-close')?.click(); demo(); };
  parar.addEventListener('click', acabar);
  go('posada');
  const siguiente = () => {
    if (parado) return;
    if (i >= lista.length) return acabar();
    const [guest, pide] = lista[i];
    rotulo.textContent = `${i + 1}/${lista.length} · ${guest.especie}: ${pide.objeto}`;
    i += 1;
    showScene({ guest, pide, helper: pide.quien || 'manolo', fase: 'dia', atendido: true }, () => setTimeout(siguiente, 150));
  };
  siguiente();
}
// todos los encargos de servicio, de cada huésped y de cada una de sus formas
function encargosDemo(data) {
  const out = [];
  for (const g of data.guests) for (const f of [g, ...(g.evoluciones || []).map(e => ({ ...g, ...e, base: g }))])
    for (const p of f.pide || []) if (p.tipo !== 'comida') out.push([f, p]);
  return out;
}
const PLANOS_DEMO = [['charmander', 'v2', 'fin', 'El tejado (Charmeleon)'], ['jigglypuff', 'v3', 'canta', 'La canción de Jigglypuff'],
  ['psyduck', 'v3', 'hoguera', 'La hoguera de Psyduck'], ['gengar', 'v2', 'cante', 'El cante de Gengar'], ['jynx', 'v2', 'canta', 'La copla de Jynx'],
  ['magmar', 'v2', 'resultado', 'El duelo de Magmar'], ['machoke', 'v1', 'ventana', 'El posado de Machoke'], ['nidoran', 'v5', 'brindis', 'La boda de los Nidoran']];
async function demoPlano([id, entrada, nodo], data, despues = demo) {
  const dlg = await loadDialogue(id);
  const e = dlg.entradas.find(x => x.id === entrada);
  const g = formaDe(data.guests.find(x => x.id === id), e.cuando?.visita_min || 1);
  const h = { id, sprite: g.sprite, nombre: g.especie, hablante: g.hablante, acompanante: g.acompanante, acompananteNombre: g.acompanante_especie };
  const { sigue, opciones, ...n } = e.nodos[nodo];
  go('mostrador');
  await counter.open({ sprite: g.sprite, buddy: g.acompanante, fase: 'tarde', lugar: 'dentro' });
  charla(h, { nodos: { inicio: n } }, despues === demo ? `Pruebas · ${e.subtitulo || ''}` : e.subtitulo || '', { onEnd() { counter.close(); despues(); } });
}
// Las fotos de recuerdo, cada una en sus dos formatos, para verlas y descargarlas sin comprarlas.
// Salen con la partida guardada (su día y sus huéspedes) o, si no hay, con todos los huéspedes.
async function demoFotos() {
  const ups = (await (await fetch('data/upgrades.json')).json()).upgrades.filter(u => u.foto);
  const data = await loadGuestData();
  const propios = inn.datosFoto();
  const datos = propios.conocidos.length > 4 ? propios
    : { dia: propios.dia, sobrino: '0005', conocidos: data.guests.filter(g => !g.cameo).map(g => (g.evoluciones || []).at(-1)?.sprite || g.sprite) };
  const html = '<div class="shop-head"><span class="libre">Pruebas: se ven sin comprarlas</span><button class="secondary volver-arriba" id="fotos-volver">Volver</button></div>'
    + ups.map(u => `<section class="foto-demo"><h4>${esc(u.nombre)} <small>· ${u.precio} monedas</small></h4><p class="muted small">${esc(u.efecto)}${u.pista ? ` (${esc(u.pista)})` : ''}</p>`
      + `<div class="foto-ver" data-foto="${u.foto}"></div><p class="demo"><button class="secondary" data-fondo="${u.foto}:movil">Descargar para el móvil</button><button class="secondary" data-fondo="${u.foto}:ordenador">Descargar para el ordenador</button></p></section>`).join('');
  card('demo', { title: 'Fotos de recuerdo', html, button: 'Salir de las pruebas' });
  $('#fotos-volver').addEventListener('click', () => demo());
  enlazarFondos(() => datos);
  // las miniaturas, una a una (son grandes: 1080×2336 y 1920×1080)
  for (const caja of document.querySelectorAll('.foto-ver')) for (const tipo of ['movil', 'ordenador']) {
    const lienzo = await dibujaFondo(caja.dataset.foto, tipo, datos);
    if (!caja.isConnected) return;
    lienzo.className = `foto-${tipo}`;
    lienzo.title = `${FOTOS[caja.dataset.foto].titulo} (${tipo === 'movil' ? 'móvil' : 'ordenador'}: ${lienzo.width}×${lienzo.height})`;
    caja.append(lienzo);
  }
}
// El panel de «Otra vez» con todo abierto: aquí no se cobra ni se guarda nada (los récords, solo mientras dura)
const recordsDemo = {};
function demoFinal() {
  otraVez('<div class="shop-head"><span class="libre">Pruebas: todo abierto, no se cobra ni se guarda</span><button class="secondary volver-arriba" id="otra-volver">Volver</button></div>', {
    todo: true, demo: true, monedas: () => 99999, pagar: () => true, records: () => recordsDemo,
    apuntar(id, res) {
      const r = recordsDemo[id] ||= { jugadas: 0, perfectos: 0 };
      r.jugadas += 1;
      if (res === 'perfecto') r.perfectos += 1;
      return r;
    },
    volver: demoFinal,
    pintar(html) { card('demo', { title: 'Otra vez', html, button: 'Salir de las pruebas' }); $('#otra-volver').addEventListener('click', () => demo()); },
  });
}
function demoAnims() {
  const ANIMS = ['baila', 'duerme', 'gira', 'salta', 'vuela', 'tiembla', 'corazones', 'chispas', 'fuego', 'agua', 'humo', 'estrellas', 'notas', 'sudor', 'enfado', 'flash', 'confeti'];
  const nodos = Object.fromEntries(ANIMS.map((a, i) => [i ? a : 'inicio', { quien: 'huesped', emocion: 'Happy', texto: `Animación: ${a}.`, anim: a, ...(ANIMS[i + 1] ? { sigue: ANIMS[i + 1] } : {}) }]));
  const h = { id: 'pikachu', sprite: '0025', nombre: 'Pikachu' };
  go('mostrador');
  counter.open({ sprite: '0025', fase: 'dia', lugar: 'dentro' }).then(() =>
    charla(h, { nodos }, 'Pruebas · animaciones', { onEnd() { counter.close(); demo(); } }));
}

// para ver el final sin jugar entero: …/?final
if (LOCAL && new URLSearchParams(location.search).has('final')) playFinal(151).then(() => { location.href = location.pathname; });

window.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && state === 'inicio') go('posada');
  else if (ev.key === 'Escape') {
    if (state === 'mostrador' || state === 'cocina') return;
    if (state === 'posada' && $('#dialog-options').querySelector('button:not(#advance):not([aria-label])')) { closeChoice(); inn.focus(null); }
    else go(state === 'posada' ? 'inicio' : state === 'inicio' ? 'inicio' : 'posada');
  }
});

window.addEventListener('resize', layout);

// Espera a la fuente pixelada para que el cuadro tenga su alto real al colocar la vista
document.fonts.load('400 24px "Jersey 10"').catch(() => {}).finally(async () => {
  go('inicio');
  scene.start();
  try {
    say('manolo', 'Happy', 'Todo listo. A ver quién sube hoy por el camino.');
    inn = await createInn(scene, { update: render, toast, night, say, sfx, charizard: charizardTalk, minijuego,
      evento: id => new Promise(res => startTalk(id, null, res)),
      // la posada a la vista, sin charla, cocina ni escena de encargo encima (para lo que salta solo, como las maletas)
      libre: () => state === 'posada' && $('#popup').classList.contains('hidden'),
      decir: (who, emotion, text) => dialog({ ...who, emotion, text }),
      // (devuelve cuándo se cierra la escena, por si hay que esperar a que acabe)
      show: s => new Promise(res => { showScene(s, res); setTimeout(() => sfx(s.atendido === 'frio' ? 'sad' : 'cheer'), 1700); }) });
    await inn.begin();
    if (DEMO) { refreshStart(); return demo(); }
    if (last?.fase === 'tarde') say('manolo', 'Normal', 'Cae la tarde. Unos bajan al comedor, otros salen a pasear y alguno se queda en su cuarto.');
    else if (last?.fase === 'noche') say('manolo', 'Sigh', 'La posada duerme. Solo se oye crepitar el fogón.');
    refreshStart();
  } catch (err) {
    console.error(err);
  }
});
