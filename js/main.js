// Estados del juego: inicio, posada (vista A), mostrador (vista B), cocina (C) y noche.
// La posada ya tiene su bucle del día (inn.js). Todo se habla en el cuadro de diálogo de
// abajo: al tocar a un huésped dice lo que necesita y debajo salen tus respuestas.
import { createInnView, COLORES } from './scene.js';
import { createInn, hasSave, FASE_NOMBRE } from './inn.js';
import { portraitUrl } from './sprites.js';
import { showScene } from './popup.js';
import { createCounter } from './counter.js';
import { playIntro } from './intro.js';
import { playFinal } from './final.js';
import { runEntry } from './dialogue.js';
import { createKitchen, loadRecipes } from './kitchen.js';
import { loadGuestData, kantoVistos } from './guests.js';
import { loadDialogue } from './dialogue.js';
import { setMood, setRain as rainSound, sfx, getPrefs, setMusic, setSfx, cry, cancion } from './audio.js';

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
let state = null;
let toastTimer = 0;
let inn = null;
let last = null;      // lo último que publicó la posada

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
  $('#stub').classList.toggle('hidden', next !== 'noche');
  $('#book').classList.toggle('hidden', next !== 'libro');
  $('#counter-view').classList.toggle('hidden', next !== 'mostrador');
  $('#kitchen-view').classList.toggle('hidden', next !== 'cocina');
  $('#advance').classList.toggle('hidden', next === 'mostrador' || next === 'cocina');
  // recepción y cocina ocupan toda la pantalla (solo queda el cuadro de diálogo)
  document.body.classList.toggle('fullview', next === 'mostrador' || next === 'cocina');
  scene?.setPaused(next === 'mostrador' || next === 'cocina' || next === 'libro');
  scene.setInteractive(next === 'posada');
  hideToast();
  if (next === 'inicio') refreshStart();
  if (next === 'posada') inn?.wake();
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
  // cuando empieza a hablar un Pokémon se le oye; Jigglypuff, si canta, canta de verdad
  if (sprite !== lastVoice && sprite !== 'manolo') {
    if (sprite === '0039' && /cant|tarare|canci/i.test(text)) cancion();
    else if (sprite !== '0006' || /gr+r/i.test(text)) cry(sprite);
  }
  lastVoice = sprite;
  const face = $('#dialog-face');
  // si ese Pokémon no tiene retrato para esa emoción, el normal
  face.onerror = emotion === 'Normal' ? null : () => { face.onerror = null; face.src = portraitUrl(sprite, 'Normal'); };
  face.src = portraitUrl(sprite, emotion);
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
  const out = [];
  let cur = '';
  const meter = (pieza, sep) => {
    const cand = cur ? cur + sep + pieza : pieza;
    if (cabe(cand)) { cur = cand; return true; }
    if (cur) { out.push(cur); cur = ''; }
    if (cabe(pieza)) { cur = pieza; return true; }
    return false;
  };
  for (const frase of text.split(/(?<=[.!?…»)])\s+/)) {
    if (!meter(frase, ' ')) for (const palabra of frase.split(' ')) if (!meter(palabra, ' ')) cur = palabra;
  }
  if (cur) out.push(cur);
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
      ? [{ label: `Cocinar ${cook.recipe.nombre}`, action: () => startCook(id) }]
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
  if (h.sobremesa) return sobremesa(h, charlar);
  if (h.charla) return dialog({ ...who, emotion: 'Normal', text: '¿Tienes un momento? Me apetece charlar un rato.', options: [...charlar, later] });
  if (h.atendido === 'frio') return dialog({ ...who, emotion: 'Sad', text: 'Bueno… gracias, supongo. No era lo que me apetecía.' });
  dialog({ ...who, emotion: 'Happy', text: '¡Gracias! Aquí se está de maravilla.' });
}

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
  potaje: 'Elegir ingredientes y remover la marmita', pizza: 'Amasar, estirar y poner los ingredientes', emplatar: 'Decorar el plato, cada cosa en su sitio' };

async function startCook(id) {
  const cook = inn.cookFor(id);
  if (!cook || cook.falta) return;
  const nombre = cook.recipe.nombre;
  go('cocina');
  setMood('cocina');
  say('manolo', 'Happy', `¡Vamos allá, Charizard! Una de ${nombre}. Mantén pulsado para avivar el fuego.`);
  const { resultado, crudo } = await kitchen.cook(cook.recipe, { moral: cook.moral, apoyo: cook.apoyo, nivel: cook.nivel, onStep: p => say('manolo', 'Normal', p.texto) });
  go('posada');
  inn.serveCooked(id, resultado, { crudo });
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
  if (h.tam === 'agua') return 'estanque';
  if (h.tam === 'grande') return 'fuera';
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
  const noCabe = whereFor(h) === 'fuera';
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

async function startTalk(id, after = null) {
  const h = last?.huespedes.find(x => x.id === id);
  const talk = inn.beginTalk(id);
  if (!h || !talk) return;
  go('mostrador');
  await counter.open({ sprite: h.sprite, buddy: h.acompanante, fase: last.fase, lugar: whereFor(h) });
  // el subtítulo dice la visita real (la charla puede llegar en una visita posterior)
  const ORD = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima'];
  const resto = (talk.entry.subtitulo || '').replace(/^\S+ visita · /, '');
  const sub = `${ORD[talk.visita - 1] || `Visita ${talk.visita}`} visita${resto ? ` · ${resto}` : ''}`;
  const run = runEntry(talk.entry, {
    mejoras: inn.mejoras(),
    applyEffects: ef => inn.applyEffects(id, ef),
    onNode(node) {
      // «pareja»: habla el acompañante (Nidoran♀); el huésped, con su nombre de hablante si lo tiene
      const who = node.quien === 'huesped' ? { sprite: h.sprite, nombre: h.hablante || h.nombre }
        : node.quien === 'pareja' && h.acompanante ? { sprite: h.acompanante, nombre: h.acompananteNombre || h.nombre } : CREW[node.quien];
      counter.speak(node.quien, node.emocion);
      const options = node.opciones
        ? node.opciones.map((o, i) => ({ label: o.texto, action: () => run.choose(i) }))
        : [{ label: node.sigue ? 'Seguir ▸' : 'Terminar', action: () => run.advance() }];
      dialog({ ...who, emotion: node.emocion || 'Normal', text: node.texto, options, sub });
    },
    async onEnd() {
      // si la charla acaba con el huésped yéndose, no se sigue a la recepción
      const { seVa } = await inn.endTalk(id, talk.entry);
      if (after && !seVa) return after();
      counter.close();
      go('posada');
    },
  });
}

// ---------- lo que publica la posada ----------

function render(v) {
  last = v;
  if (state !== 'cocina') setMood(v.fase);
  rainSound(!!v.lluvia);
  $('#day').textContent = `Día ${v.dia} · ${FASE_NOMBRE[v.fase]}`;
  $('#stats').innerHTML = `${starsHtml(v.estrellas)} ${v.monedas} monedas · ${v.chistorra} chistorra${v.chistorra === 1 ? '' : 's'} · Charizard ${esc(v.charizard)}`;
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
  const cara = f => f.corazones == null ? 'Sad' : f.corazones >= 4 ? 'Happy' : f.corazones <= 1 ? 'Angry' : 'Normal';
  const filas = s.filas.map(f => `<li>
      <img src="${portraitUrl(f.sprite, cara(f))}" onerror="this.onerror=null;this.src='${portraitUrl(f.sprite, 'Normal')}'" alt="" width="40" height="40">
      <div><strong>${esc(f.nombre)}</strong> ${f.corazones != null ? heartsHtml(f.corazones) : ''}
        <span>${esc(f.motivos.join(' · ') || 'una noche sin más')}${f.vuelve ? ` · ${esc(f.vuelve)}` : ''}</span></div>
      <div class="gana">${f.corazones != null ? `<b>+${f.paga + f.propina}</b><small>${f.propina ? `${f.propina} de propina` : 'sin propina'}</small>` : '<b>—</b>'}
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
function shop() {
  const list = inn.upgradesView();
  const grupos = [...new Set(list.map(u => u.grupo))];
  if (!grupos.includes(shopTab)) shopTab = grupos.find(g => list.some(u => u.grupo === g && u.puede)) || grupos[0];
  // las obras, una por noche (lo demás se compra mientras haya dinero)
  const yaHoy = shopTab === 'Obras' && list.some(u => u.bloqueada && !u.tiene && !u.falta);
  const v = last;
  let html = `<div class="shop-head">${starsHtml(v.estrellas)}<span>${v.monedas} monedas</span></div>`
    + (yaHoy ? '<p class="muted small">Una obra por noche: mañana, otra.</p>' : '')
    + `<nav class="shop-tabs">${grupos.map(g => `<button class="secondary${g === shopTab ? ' active' : ''}" data-tab="${esc(g)}">${esc(g)}</button>`).join('')}</nav><ul class="shop">`;
  for (const u of list.filter(x => x.grupo === shopTab)) {
    const right = u.tiene ? '<span class="owned">Hecha</span>'
      : `<button data-buy="${u.id}" ${u.puede ? '' : 'disabled'}>${u.precio} monedas</button>`;
    const pts = u.puntos && !u.tiene ? `<i class="fama-chip">${starsHtml(1).replace('class="stars"', 'class="stars one"')}+${u.puntos}</i>` : '';
    html += `<li class="${u.tiene ? 'done' : ''}"><div><strong>${esc(u.nombre)} ${pts}</strong><span>${esc(u.falta ? `Antes hay que hacer: ${u.falta}` : u.efecto)}</span></div>${right}</li>`;
  }
  html += '</ul>';
  card('noche', { title: 'Mejoras', html, button: 'Ver la posada de noche' });
  for (const b of document.querySelectorAll('[data-buy]')) {
    b.addEventListener('click', async () => { if (await inn.buyUpgrade(b.dataset.buy)) shop(); });
  }
  for (const b of document.querySelectorAll('.shop-tabs [data-tab]')) b.addEventListener('click', () => { shopTab = b.dataset.tab; shop(); });
}

// ---------- libro de visitas (estilo Pokédex) y recetario ----------

let bookTab = 'libro', bookSel = null;

async function libro() {
  const data = await loadGuestData();
  const book = inn.bookView();
  const guests = [...data.guests].sort((a, b) => a.dex - b.dex);
  const seen = guests.filter(g => book.libro[g.id]);
  $('#book-count').textContent = `Kanto: ${kantoVistos(book.libro)} / 151`;
  for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === bookTab);
  const list = $('#book-list'), detail = $('#book-detail');
  const scroll = list.scrollTop;   // al tocar un Pokémon, la lista se queda donde estaba
  list.innerHTML = '';
  if (bookTab === 'recetario') {
    const recipes = (await loadRecipes()).recipes;
    list.classList.add('hidden');
    detail.innerHTML = '<h3>Recetario</h3><ul class="recipes">' + recipes.map(r => {
      const e = book.recetario[r.id];
      const caras = (e?.gustan || []).map(id => {
        const g = data.guests.find(x => x.id === id);
        return `<img src="${portraitUrl(g.sprite, 'Happy')}" alt="${esc(g.especie)}" title="${esc(g.especie)}" width="40" height="40">`;
      }).join('');
      return `<li><strong>${esc(r.nombre[0].toUpperCase() + r.nombre.slice(1))}</strong>`
        + (e ? `<span>Cocinada ${e.veces} ${e.veces === 1 ? 'vez' : 'veces'} · ${e.perfectos} perfecta${e.perfectos === 1 ? '' : 's'}</span>` : '<span>Aún no se ha cocinado.</span>')
        + `<span>${r.juego && r.juego !== 'llama' ? JUEGO[r.juego] : `Fuego: ${r.pasos.map(p => p.zona).join(' → ')}`}</span>`
        + (caras ? `<div class="faces">Les gusta: ${caras}</div>` : '') + '</li>';
    }).join('') + '</ul>';
    go('libro');
    return;
  }
  list.classList.remove('hidden');
  if (!bookSel || !guests.some(g => g.id === bookSel)) bookSel = (seen[0] || guests[0]).id;
  for (const g of guests) {
    const visto = !!book.libro[g.id];
    const li = document.createElement('li');
    li.className = (g.id === bookSel ? 'selected ' : '') + (visto ? '' : 'unseen');
    li.innerHTML = `<span class="dexno">#${String(g.dex).padStart(3, '0')}</span> ${visto ? esc(g.especie) : '???'}`;
    li.addEventListener('click', () => { bookSel = g.id; libro(); });
    list.append(li);
  }
  list.scrollTop = scroll;
  const g = guests.find(x => x.id === bookSel);
  const e = book.libro[g.id];
  if (!e) {
    detail.innerHTML = `<div class="dex-card"><img class="dex-face unseen" src="${portraitUrl(g.sprite, 'Normal')}" alt="" width="40" height="40">
      <div><h3>#${String(g.dex).padStart(3, '0')} · ???</h3><p class="muted">Aún no ha pasado por la posada.</p>${pista(g)}</div></div>`;
  } else {
    const af = book.afinidad[g.id] || 0;
    const dlg = await loadDialogue(g.id);
    const capitulos = (book.vistas[g.id] || []).map(id => dlg?.entradas.find(x => x.id === id)?.subtitulo).filter(Boolean);
    const gusta = Object.entries(book.recetario).filter(([, r]) => r.gustan.includes(g.id)).map(([id]) => id);
    const recipes = (await loadRecipes()).recipes;
    detail.innerHTML = `<div class="dex-card"><img class="dex-face" src="${portraitUrl(g.sprite, af >= 3 ? 'Happy' : 'Normal')}" alt="" width="40" height="40">
      <div><h3>#${String(g.dex).padStart(3, '0')} · ${esc(g.especie)}</h3>
      <p class="types">${(g.tipos || []).map(t => `<span class="type type-${t}">${esc(t)}</span>`).join('')}</p>
      <p>${e.visitas} ${e.visitas === 1 ? 'visita' : 'visitas'} · la última, el día ${e.ultimo}</p>
      <p>Afinidad ${heartsHtml(af)}</p>
      ${e.felicidad != null ? `<p>Última estancia ${heartsHtml(e.felicidad)}</p>` : ''}</div></div>
      <p class="reason">${esc(g.razon)}</p>
      <h4>Su historia</h4>${g.aparece?.no_si && book.flags[g.aparece.no_si] ? '<p class="muted">Se ha quedado a vivir en la posada.</p>' : book.terminados?.has(g.id) ? '<p class="muted">Historia completa: se despidió de la posada.</p>' : ''}${capitulos.length ? `<ol class="chapters">${capitulos.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : '<p class="muted">Aún no habéis charlado.</p>'}
      <h4>Le gusta</h4><p>${gusta.length ? gusta.map(id => esc(recipes.find(r => r.id === id).nombre)).join(', ') : '<span class="muted">Todavía no lo sabes: cocínale algo rico.</span>'}</p>`;
  }
  go('libro');
}

for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { bookTab = b.dataset.tab; libro(); });
$('#book-close').addEventListener('click', () => go('posada'));

// ---------- exportar e importar la partida ----------

$('#start-export').addEventListener('click', () => {
  const blob = new Blob([inn.exportState()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `el-pino-calcinado-dia-${last?.dia ?? 1}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#start-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async ev => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    await inn.importState(await file.text());
    refreshStart();
    toast(`Partida importada: día ${last.dia}.`);
  } catch (err) {
    toast(`No se ha podido importar: ${err.message}`);
  }
});

// ---------- portada ----------

let confirmReset = false;

function refreshStart() {
  const saved = hasSave();
  confirmReset = false;
  $('#start-open').textContent = saved && last ? `Continuar · día ${last.dia}` : saved ? 'Continuar' : 'Abrir la posada';
  $('#start-new').classList.toggle('hidden', !saved);
  $('#start-export').classList.toggle('hidden', !saved);
  $('#start-new').textContent = 'Nueva partida';
  $('#start-final').classList.toggle('hidden', !inn?.finalVisto());
}

// El final (también se puede volver a ver desde el inicio)
async function verFinal() {
  await playFinal(kantoVistos(inn.bookView().libro));
  inn.marcarFinal();
  refreshStart();
  if (state === 'noche') go('posada');
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
$('#stub-back').addEventListener('click', () => go('posada'));
$('[data-action="libro"]').addEventListener('click', libro);
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

// ---------- entrada con contraseña (mientras está en pruebas) ----------
// Solo para que no entre quien se tope con el enlace: se comprueba en el navegador y se recuerda en este aparato.
// Se guarda la huella de la contraseña (FNV-1a), no la palabra.
const PASE = '537e3882', PASE_KEY = 'el-pino-calcinado-pase';
const huella = t => { let h = 0x811c9dc5; for (const c of t) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const dentro = () => { try { return localStorage.getItem(PASE_KEY) === PASE; } catch { return false; } };
const cerrado = () => !$('#gate').classList.contains('hidden');
// para ver el final sin jugar entero: …/?final (directo, nada más pasar la contraseña)
const soloFinal = new URLSearchParams(location.search).has('final');
const verSoloFinal = () => { if (soloFinal && !cerrado()) playFinal(151).then(() => { location.href = location.pathname; }); };
if (dentro()) $('#gate').classList.add('hidden');
else $('#gate-pass').focus();
verSoloFinal();
$('#gate').addEventListener('submit', ev => {
  ev.preventDefault();
  if (huella($('#gate-pass').value.trim().toLowerCase()) !== PASE) { $('#gate-error').classList.remove('hidden'); $('#gate-pass').select(); return; }
  try { localStorage.setItem(PASE_KEY, PASE); } catch { /* sin almacenamiento: habrá que ponerla cada vez */ }
  $('#gate').classList.add('hidden');
  verSoloFinal();
});

window.addEventListener('keydown', ev => {
  if (cerrado()) return;
  if (ev.key === 'Enter' && state === 'inicio') go('posada');
  else if (ev.key === 'Escape') {
    if (state === 'mostrador' || state === 'cocina') return;
    if (state === 'posada' && $('#dialog-options').querySelector('button:not(#advance)')) { closeChoice(); inn.focus(null); }
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
    inn = await createInn(scene, { update: render, toast, night, say, sfx, charizard: charizardTalk,
      show: s => { showScene(s); setTimeout(() => sfx(s.atendido === 'frio' ? 'sad' : 'cheer'), 1700); } });
    await inn.begin();
    if (last?.fase === 'tarde') say('manolo', 'Normal', 'Cae la tarde. Unos bajan al comedor, otros salen a pasear y alguno se queda en su cuarto.');
    else if (last?.fase === 'noche') say('manolo', 'Sigh', 'La posada duerme. Solo se oye crepitar el fogón.');
    refreshStart();
  } catch (err) {
    console.error(err);
  }
});
