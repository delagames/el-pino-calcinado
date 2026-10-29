// Vista C: la cocina (sección 6 de DISEÑO.md). Charizard es el fogón y cada receta tiene
// su propio minijuego (campo «juego» de data/recipes.json), todos con un solo dedo:
// - llama:   mantener pulsado aviva el fuego; cada paso pide una zona (sopa de bayas).
// - vuelta:  la raya sube y baja; tocar cuando pasa por el medio para darle la vuelta a la chistorra.
// - miel:    el tarro va y viene; mantener pulsado para echar miel sobre el pan.
// - setas:   las setas pasan por la tabla; tocar cuando están bajo el cuchillo.
// - espeton: tocar para girar la baya; mantener pulsado para retirarla cuando esté hecha.
// Y los de los sucesos y algunos encargos (más abajo, con su ESCENA): la leña de la nevada, las velas del
// apagón, los deseos de las estrellas, el café a la malagueña, la despensa a oscuras, la planta de
// Bulbasaur, el Tetris de maletas, abrir el camino nevado y el punto del termal.
// Todos acaban en { resultado: 'perfecto' | 'bien' | 'quemado', acierto, crudo }: solo se
// quema si fallas por exceso (fuego, miel, cortes a lo loco); si te quedas corto sale
// normal pero algo crudo. Con los días todo va más deprisa y las ventanas se estrechan;
// con Charizard contento son más anchas, y con Charizard de morros la llama tiembla.
import { loadSprite, Actor, DIR } from './sprites.js';
import { sizzle } from './audio.js';

const W = 160, H = 80;
const BAR = { x: 140, y: 8, w: 10, h: 62 };   // la barra de la derecha
const GRACE = 0.7;                              // segundos de cada paso de la llama que no cuentan
const CX = 67;                                  // centro del fogón
// dónde van los cuadritos de progreso y la barra de tiempo: a la izquierda en los de fuego
// (Charizard está debajo del fogón) y a la derecha de Charizard en los de preparar
const UI = { x: 6, w: 44 };

let recipesData = null;
export async function loadRecipes() {
  if (!recipesData) {
    recipesData = await (await fetch('data/recipes.json')).json();
    // las especialidades («base»): el mismo minijuego que su plato, más difícil, con su nombre
    for (const [i, r] of recipesData.recipes.entries()) {
      const b = r.base && recipesData.recipes.find(x => x.id === r.base);
      if (b) recipesData.recipes[i] = { ...b, ...r, preferidos: r.preferidos || b.preferidos, especial: true };
    }
  }
  return recipesData;
}
export function recipeById(id) {
  return recipesData?.recipes.find(r => r.id === id);
}

function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, k) => a + (b - a) * k;
function mix(c1, c2, k) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(c1), p(c2)];
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(k))).toString(16).padStart(2, '0')).join('');
}
// de crudo a dorado a quemado, según el punto (0 crudo, ~0.75 dorado, 1.1+ carbón)
function doneness(k, raw, gold) {
  return k < 0.75 ? mix(raw, gold, k / 0.75) : mix(gold, '#2F1F17', (k - 0.75) / 0.4);
}

function kitchenBack(c) {
  rect(c, 0, 0, W, H, '#EFD7AF');
  for (let x = 3; x < W; x += 6) rect(c, x, 4, 1, 50, '#F7E7C7');
  rect(c, 0, 0, W, 4, '#4F2F1F');
  // campana de piedra del fogón
  rect(c, 34, 4, 66, 22, '#5F5A67');
  for (let y = 7; y < 26; y += 5) { rect(c, 34, y, 66, 1, '#100C14'); for (let x = 36 + (y % 2) * 4; x < 100; x += 9) rect(c, x, y + 1, 1, 4, '#100C14'); }
  rect(c, 30, 26, 74, 3, '#9F9AA7'); rect(c, 30, 29, 74, 1, '#100C14');
  // ristra de chistorras y estantería
  for (let i = 0; i < 4; i++) { rect(c, 108 + i * 6, 8, 3, 9, '#100C14'); rect(c, 109 + i * 6, 9, 1, 7, '#C73F2F'); }
  rect(c, 104, 7, 28, 1, '#4F2F1F');
  // suelo y zócalo
  rect(c, 0, 56, W, 24, '#B7834F'); rect(c, 0, 55, W, 1, '#CF9B63');
  for (let x = 5; x < W; x += 6) rect(c, x, 56, 1, 24, '#8F6037');
  rect(c, 0, 72, W, 8, '#9F6A3F'); rect(c, 0, 72, W, 1, '#BF8757');
}

function flameShape(c, cx, base, f, t, shaky) {
  // la llama de Charizard: alto y color según la intensidad
  const h = 4 + f * 22;
  for (let i = -6; i <= 6; i++) {
    const wob = Math.sin(t / 70 + i * 1.7) * (shaky ? 3 : 1.5);
    const hh = Math.max(1, h * (1 - Math.abs(i) / 7) + wob);
    rect(c, cx + i, base - hh, 1, hh, f > 0.7 ? '#E2653F' : f > 0.4 ? '#FFB347' : '#FFD27A');
    if (hh > 4) rect(c, cx + i, base - hh * 0.55, 1, hh * 0.55, f > 0.7 ? '#FFB347' : '#FFF7BF');
  }
}

// barra vertical con una ventana buena [lo, hi] y la marca del valor actual
function meter(c, v, lo, hi, t, { low = '#5F5A67', good = '#6F9F4F', high = '#C73F2F' } = {}) {
  const zy = k => BAR.y + BAR.h * (1 - clamp(k));
  rect(c, BAR.x - 2, BAR.y - 2, BAR.w + 4, BAR.h + 4, '#100C14');
  rect(c, BAR.x, zy(1), BAR.w, zy(hi) - zy(1), high);
  rect(c, BAR.x, zy(hi), BAR.w, zy(lo) - zy(hi), good);
  rect(c, BAR.x, zy(lo), BAR.w, zy(0) - zy(lo), low);
  if (Math.floor(t / 250) % 2) { c.strokeStyle = '#FFF7BF'; c.lineWidth = 1; c.strokeRect(BAR.x - 1.5, zy(hi) + 0.5, BAR.w + 3, zy(lo) - zy(hi) - 1); }
  rect(c, BAR.x - 4, zy(v) - 1, BAR.w + 8, 2, '#F4EFE6');
}

// cuadraditos de progreso abajo a la izquierda: verde bien, naranja ahora, rojo pasado, gris crudo
function pips(c, list, current, y = 62) {
  list.forEach((p, i) => {
    const col = p === 'good' ? '#6F9F4F' : p === 'hot' ? '#C73F2F' : p === 'cold' ? '#9F9AA7' : i === current ? '#FFB347' : '#5F5A67';
    rect(c, UI.x + i * 9, y, 7, 7, '#100C14'); rect(c, UI.x + 1 + i * 9, y + 1, 5, 5, col);
  });
}

function grade({ acierto, hot = 0, cold = 0, extra = {} }) {
  acierto = clamp(acierto);
  // por debajo de lo justo: algo crudo si al menos se intentó; si no, sin hacer (o quemado, si te pasaste)
  const resultado = acierto >= 0.6 ? 'perfecto' : acierto >= 0.3 ? 'bien'
    : hot > cold ? 'quemado' : acierto >= 0.12 ? 'bien' : 'crudo';
  // («extra»: lo que cuenta cada minijuego de los sucesos, como quién se comía la chistorra)
  return { ...extra, resultado, acierto, crudo: resultado === 'bien' && acierto < 0.3 };
}

// ---------- los minijuegos ----------
// Cada uno: { hint, update(dt, t, input) → resultado o null, draw(c, t), sound() }.
// input = { holding, taps } (taps: pulsaciones nuevas en este fotograma).

// La llama: cada paso pide una zona del fuego durante unos segundos
function llama(recipe, base, k, say) {
  const zonas = Object.fromEntries(Object.entries(base.zonas).map(([n, [lo, hi]]) => [n, [lo - k.ancho, hi + k.ancho]]));
  const s = { f: 0.25, step: 0, stepT: 0, good: 0, total: 0, hot: 0, cold: 0, marks: recipe.pasos.map(() => null) };
  let stepGood = 0, stepTotal = 0, stepHot = 0;
  say(recipe.pasos[0].texto);
  return {
    hint: 'Mantén pulsado: más fuego · suelta: menos. Que la raya quede en la zona',
    update(dt, t, { holding }) {
      s.f += (holding ? 0.6 : -0.42) * k.vel * dt;
      s.f += (Math.sin(t / 230) * 0.6 + Math.sin(t / 97) * 0.4) * (k.shaky ? 0.35 : 0.06) * dt;
      s.f = clamp(s.f);
      const paso = recipe.pasos[s.step];
      const [lo, hi] = zonas[paso.zona];
      if (s.stepT >= k.grace) {
        s.total += dt; stepTotal += dt;
        if (s.f >= lo && (s.f < hi || hi >= 1)) { s.good += dt; stepGood += dt; }   // a tope cuenta como «fuerte»
        else if (s.f >= hi) { s.hot += dt; stepHot += dt; }
        else s.cold += dt;
      }
      s.stepT += dt;
      if (s.stepT >= paso.segundos / k.vel) {
        s.marks[s.step] = stepGood / Math.max(0.01, stepTotal) >= 0.5 ? 'good' : stepHot > (stepTotal - stepGood) / 2 ? 'hot' : 'cold';
        stepGood = stepTotal = stepHot = 0;
        s.step += 1; s.stepT = 0;
        if (s.step >= recipe.pasos.length) return { acierto: s.good / Math.max(0.01, s.total), hot: s.hot, cold: s.cold };
        say(recipe.pasos[s.step].texto);
      }
      return null;
    },
    draw(c, t) {
      flameShape(c, CX, 47, s.f, t, k.shaky);
      rect(c, 54, 45, 26, 4, '#100C14'); rect(c, 55, 45, 24, 2, '#57576F'); rect(c, 79, 46, 10, 2, '#100C14');
      // la olla: hierve si te pasas
      olla(c, 67, 34, 22, 11, '#C7577F', t, s.f);
      // bayas flotando en el caldo
      for (const [bx, col] of [[61, '#4F8FDF'], [66, '#E2653F'], [72, '#8F4FAF']]) {
        const by = 35 + (Math.floor(t / 400 + bx) % 2);
        rect(c, bx - 1, by - 1, 4, 3, '#100C14'); rect(c, bx, by - 1, 2, 2, col); rect(c, bx, by - 1, 1, 1, '#FFF7BF');
      }
      const paso = recipe.pasos[s.step];
      if (paso) {
        const [lo, hi] = zonas[paso.zona];
        meter(c, s.f, lo, hi, t, { good: '#FFB347', high: '#C73F2F' });
        rect(c, UI.x, 72, UI.w * (1 - s.stepT / (paso.segundos / k.vel)), 2, '#FFB347');
      }
      pips(c, s.marks, s.step);
    },
    state: s,
    sound: () => s.f,
  };
}

// Vuelta y vuelta: la raya sube y baja por la barra sin parar; hay que tocar cuando pasa por el
// verde, en el medio. Abajo (gris) se queda cruda; arriba (rojo) se quema. Cada vuelta, un poco más rápida.
function vuelta(recipe, base, k, say) {
  const N = 4;
  const w = 0.12 + k.ancho * 0.5;                // media franja verde (algo más estrecha los últimos días)
  const lo = 0.5 - w, hi = 0.5 + w;
  const s = { sides: [0, 0], down: 0, flips: [], flipT: 0, pos: 0, dir: 1, speed: 0, waited: 0 };
  // la raya recorre la barra entera en ~0,8 s (y más deprisa con los días y con cada vuelta)
  const newSpeed = () => (1.15 + 0.3 * Math.random()) * (1 + 0.2 * k.nivel) * (1 + 0.08 * s.flips.length);
  s.speed = newSpeed();
  say(recipe.pasos[0].texto);
  return {
    hint: 'Toca cuando la raya pase por el verde del medio',
    update(dt, t, { taps }) {
      s.flipT = Math.max(0, s.flipT - dt);
      s.waited += dt;
      const wob = k.shaky ? 1 + 0.4 * Math.sin(t / 160) : 1;
      s.pos += s.dir * s.speed * wob * dt;
      const rebota = s.pos >= 1 || s.pos <= 0;
      if (s.pos >= 1) { s.pos = 2 - s.pos; s.dir = -1; }
      if (s.pos <= 0) { s.pos = -s.pos; s.dir = 1; }
      // con los días (o en la especialidad), la raya cambia de velocidad en cada rebote
      if (rebota && k.nivel >= 0.5) s.speed = newSpeed() * (0.75 + Math.random() * 0.6);
      const judge = s.pos < lo ? 'cold' : s.pos > hi ? 'hot' : 'good';
      // si no se toca en un buen rato, se quema sola
      if (taps.length || s.waited > 6) {
        const j = taps.length ? judge : 'hot';
        s.flips.push(j);
        say(j === 'good' ? '¡En su punto! Vuelta.' : j === 'cold' ? 'Uy, le faltaba un poco. Vuelta.' : '¡Que se pasa! Vuelta, vuelta.');
        // la cara que se estaba haciendo sube a la vista con el color que ha cogido
        s.sides[s.down] = j === 'good' ? 0.75 : j === 'cold' ? 0.4 : 1.1;
        if (s.flips.length >= N) {
          const good = s.flips.filter(f => f === 'good').length;
          return { acierto: good / N, hot: s.flips.filter(f => f === 'hot').length, cold: s.flips.filter(f => f === 'cold').length };
        }
        s.down = 1 - s.down;
        s.pos = 0; s.dir = 1; s.waited = 0;
        s.speed = newSpeed();
        s.flipT = 0.3;
      }
      return null;
    },
    draw(c, t) {
      flameShape(c, CX, 50, 0.75, t, k.shaky);
      // parrilla y chistorra; salta un poco al darle la vuelta
      rect(c, 50, 44, 34, 1, '#100C14'); for (let x = 51; x < 84; x += 4) rect(c, x, 44, 1, 3, '#100C14');
      const up = Math.round(Math.sin(s.flipT / 0.3 * Math.PI) * 6);
      const top = doneness(s.sides[1 - s.down], '#D7473F', '#7F2F17');
      const y0 = 39 - up;
      // tripa con los extremos redondeados y una cuerdecita en cada punta
      rect(c, 53, y0 + 1, 28, 4, '#100C14'); rect(c, 54, y0, 26, 6, '#100C14');
      rect(c, 54, y0 + 1, 26, 4, top);
      rect(c, 55, y0 + 1, 24, 1, mix(top, '#FFD7C7', 0.45));            // brillo de la grasa
      rect(c, 54, y0 + 4, 26, 1, mix(top, '#100C14', 0.35));            // sombra de abajo
      for (let x = 57; x < 79; x += 4) rect(c, x + (x % 3), y0 + 2 + (x % 2), 1, 1, mix(top, '#FFE7D7', 0.6));   // la grasa a puntitos
      for (const x of [61, 67, 73]) rect(c, x, y0 + 1, 1, 4, mix(top, '#100C14', 0.5));   // los pliegues de la tripa
      if (s.sides[1 - s.down] > 0.45) for (const x of [58, 64, 70, 76]) rect(c, x, y0 + 2, 2, 1, '#2F1717');   // marcas de la parrilla
      rect(c, 51, y0 + 2, 3, 1, '#F4EFE6'); rect(c, 80, y0 + 2, 3, 1, '#F4EFE6');
      // humo según por dónde va la raya: blanco en su punto, gris si se está pasando
      if (s.pos > lo) for (let i = 0; i < 3; i++) rect(c, 60 + i * 6, 36 - ((t / 80 + i * 3) % 7) - up, 1, 1, s.pos > hi ? '#5F5A67' : '#F4EFE6');
      meter(c, s.pos, lo, hi, t);
      pips(c, [...s.flips, ...Array(N - s.flips.length).fill(null)], s.flips.length);
    },
    state: s,
    sound: () => 0.55 + s.pos * 0.3,
  };
}

// El chorro de miel: el tarro va y viene sobre la tostada; mantener pulsado para echar
function miel(recipe, base, k, say) {
  const SEG = 6, X0 = 50, X1 = 84;
  const s = { x: CX, seg: Array(SEG).fill(0), spill: 0, over: 0, t: 0, drops: [], toast: 0 };
  const DUR = 8 / Math.sqrt(k.vel);
  say(recipe.pasos[0].texto);
  return {
    hint: 'Mantén pulsado cuando el tarro esté sobre la tostada',
    update(dt, t, { holding }) {
      s.t += dt;
      s.toast = Math.min(1, s.toast + dt / 1.2);
      // el tarro se mueve de lado a lado, cada vez más rápido (y a trompicones si Charizard está de morros)
      const w = (1.6 + 0.8 * k.nivel) * (1 + 0.25 * Math.sin(s.t * 0.9));
      s.x = CX + 26 * Math.sin(s.t * w + (k.shaky ? Math.sin(s.t * 5) * 0.3 : 0));
      if (holding) {
        const i = Math.floor((s.x - X0) / ((X1 - X0) / SEG));
        const pour = 2.2 * dt;
        if (i >= 0 && i < SEG) {
          const before = s.seg[i];
          s.seg[i] += pour;
          s.over += Math.max(0, s.seg[i] - 1.25) - Math.max(0, before - 1.25);
        } else s.spill += pour;
        if (Math.random() < 0.5) s.drops.push({ x: s.x, y: 22, vy: 30 });
      }
      for (const d of s.drops) { d.y += d.vy * dt; d.vy += 120 * dt; }
      s.drops = s.drops.filter(d => d.y < 46);
      if (s.t >= DUR || s.seg.every(v => v >= 1 && v <= 1.25)) {
        const cover = s.seg.reduce((a, v) => a + Math.min(1, v), 0) / SEG;
        const mess = (s.spill + s.over * 2) / SEG;
        return { acierto: cover - mess * 0.9, hot: mess * 2, cold: 1 - cover };
      }
      return null;
    },
    draw(c, t) {
      flameShape(c, CX, 52, 0.35, t, false);
      // la tostada, dorándose al principio, y la miel por tramos
      rect(c, X0 - 2, 40, X1 - X0 + 4, 8, '#100C14');
      rect(c, X0 - 1, 41, X1 - X0 + 2, 6, mix('#B7773F', '#6F3F1F', s.toast));        // corteza
      rect(c, X0, 42, X1 - X0, 4, mix('#F7E7B7', '#D7974F', s.toast));               // miga
      for (let x = X0 + 3; x < X1 - 2; x += 5) rect(c, x, 43 + (x % 2), 1, 1, mix('#D7C78F', '#9F672F', s.toast));   // agujeritos
      const sw = (X1 - X0) / SEG;
      s.seg.forEach((v, i) => {
        if (v <= 0) return;
        const col = v > 1.25 ? '#C7772F' : '#FFC73F';
        rect(c, X0 + i * sw, 42 - (v > 1 ? 1 : 0), sw, Math.max(1, Math.min(3, v * 3)), col);
        if (v > 1.25) rect(c, X0 + i * sw + 1, 46, 1, 3, '#FFC73F');   // chorrea por el borde
      });
      // el tarro
      const x = Math.round(s.x);
      // tarro panzudo boca abajo: tapa de tela de cuadros arriba, etiqueta y la boca abajo
      rect(c, x - 6, 6, 12, 4, '#100C14'); rect(c, x - 5, 7, 10, 2, '#C73F2F'); rect(c, x - 4, 7, 2, 1, '#F4EFE6'); rect(c, x, 7, 2, 1, '#F4EFE6'); rect(c, x - 2, 8, 2, 1, '#F4EFE6'); rect(c, x + 2, 8, 2, 1, '#F4EFE6');
      rect(c, x - 6, 10, 12, 10, '#100C14'); rect(c, x - 5, 10, 10, 9, '#E7972F');
      rect(c, x - 4, 11, 2, 6, '#FFD77F');                                             // brillo del cristal
      rect(c, x - 3, 13, 7, 3, '#F4EFE6'); rect(c, x - 2, 14, 1, 1, '#100C14'); rect(c, x, 14, 2, 1, '#FFC73F'); rect(c, x + 2, 14, 1, 1, '#100C14');   // etiqueta con abeja
      rect(c, x - 2, 19, 4, 3, '#100C14'); rect(c, x - 1, 20, 2, 2, '#E7972F');
      for (const d of s.drops) rect(c, d.x, d.y, 1, 2, '#FFC73F');
      // barra: cuánto se ha cubierto y cuánto se ha manchado
      const cover = s.seg.reduce((a, v) => a + Math.min(1, v), 0) / SEG;
      meter(c, cover, 0.9, 1, t, { low: '#5F5A67', good: '#FFC73F', high: '#FFC73F' });
      rect(c, UI.x, 72, UI.w * (1 - s.t / DUR), 2, '#FFB347');
      const mess = (s.spill + s.over * 2) / SEG;
      for (let i = 0; i < Math.min(12, Math.round(mess * 10)); i++) rect(c, 34 + i * 4, 64, 3, 3, '#C7772F');
    },
    state: s,
    sound: () => 0.3,
  };
}

// Cortar setas: pasan por la tabla; tocar cuando la seta está bajo el cuchillo
function setas(recipe, base, k, say) {
  const N = 8, KNIFE = 60;
  const win = 4 + k.ancho * 40;
  const speed = 34 * k.vel;
  let x = W + 10;
  const list = Array.from({ length: N }, () => { const s = { x, cut: null }; x += 22 + Math.random() * 18; return s; });
  // con los días, una seta podrida (verdosa, con manchas): esa no se corta, se deja pasar
  if (k.nivel >= 0.4) list[3 + Math.floor(Math.random() * 4)].podrida = true;
  const s = { knife: 0, hot: 0, list };
  say(recipe.pasos[0].texto);
  return {
    hint: 'Toca cuando la seta esté bajo el cuchillo',
    update(dt, t, { taps }) {
      taps = taps.length;
      s.knife = Math.max(0, s.knife - dt);
      for (const m of list) m.x -= speed * (k.shaky ? 1 + 0.35 * Math.sin(t / 200) : 1) * dt;
      if (taps) {
        s.knife = 0.18;
        const m = list.filter(m => !m.cut).sort((a, b) => Math.abs(a.x - KNIFE) - Math.abs(b.x - KNIFE))[0];
        const d = m ? Math.abs(m.x - KNIFE) : 99;
        if (m?.podrida && d <= 12) { m.cut = 'podrida'; s.hot += 1; say('¡Esa estaba podrida! Al cubo de la basura.'); }
        else if (d <= win) { m.cut = 'good'; }
        else if (d <= 12) { m.cut = 'cold'; say('Cortada de cualquier manera… Bueno, al puchero.'); }
        else { s.hot += 1; say('¡Cuidado, que cortas la tabla!'); }
      }
      for (const m of list) if (!m.cut && m.x < KNIFE - 12) {
        if (m.podrida) { m.cut = 'good'; say('Bien visto: esa estaba podrida.'); }
        else { m.cut = 'cold'; say('Se ha escapado una entera. Irá así al puchero.'); }
      }
      if (list.every(m => m.cut) && list[list.length - 1].x < 20) {
        // (dejar pasar la podrida vale si se ha estado cortando; sin tocar nada no hay mérito)
        const cortadas = list.filter(m => m.cut === 'good' && !m.podrida).length;
        const good = cortadas ? list.filter(m => m.cut === 'good').length : 0;
        return { acierto: good / N - s.hot * 0.06, hot: s.hot, cold: list.filter(m => m.cut === 'cold').length };
      }
      return null;
    },
    draw(c, t) {
      // la tabla a lo largo y el puchero al fuego a la izquierda
      flameShape(c, 24, 54, 0.4, t, k.shaky);
      olla(c, 24, 40, 20, 11, '#8F5F37', t, 0.4);
      rect(c, 36, 44, 94, 7, '#100C14'); rect(c, 37, 45, 92, 5, '#D7A76F'); rect(c, 37, 45, 92, 1, '#E7C78F');
      for (const m of list) {
        if (m.x > 132 || m.x < 34) continue;
        const mx = Math.round(m.x);
        if (m.cut === 'good') {          // en dos mitades limpias: se ve el corte
          for (const dx of [-6, 1]) {
            rect(c, mx + dx, 37, 5, 8, '#100C14'); rect(c, mx + dx + 1, 38, 3, 2, '#A7673F'); rect(c, mx + dx + 1, 40, 3, 4, '#F7E7D7');
            rect(c, mx + dx + (dx < 0 ? 3 : 1), 40, 1, 4, '#E7D7B7');
          }
        } else {
          // sombrero redondo con brillo y el pie
          const cap = m.podrida ? '#6F7F3F' : m.cut === 'cold' ? '#7F5F47' : '#A7673F';
          rect(c, mx - 3, 34, 7, 1, '#100C14'); rect(c, mx - 5, 35, 11, 4, '#100C14'); rect(c, mx - 4, 39, 9, 1, '#100C14');
          rect(c, mx - 2, 35, 5, 1, cap); rect(c, mx - 4, 36, 9, 3, cap);
          rect(c, mx - 2, 35, 2, 1, m.podrida ? '#9FAF5F' : '#D7976F'); rect(c, mx - 3, 36, 2, 1, m.podrida ? '#9FAF5F' : '#D7976F');
          if (m.podrida) { rect(c, mx + 1, 36, 1, 1, '#3F4F1F'); rect(c, mx - 2, 37, 1, 1, '#3F4F1F'); rect(c, mx + 3, 37, 1, 1, '#3F4F1F'); }
          rect(c, mx - 3, 39, 7, 1, '#E7D7B7');                                         // las láminas de debajo
          rect(c, mx - 2, 40, 5, 5, '#100C14'); rect(c, mx - 1, 40, 3, 4, '#F7E7D7'); rect(c, mx + 1, 40, 1, 4, '#D7C7A7');
        }
      }
      // el cuchillo baja al tocar
      const down = s.knife > 0 ? 6 : 0;
      rect(c, KNIFE - 2, 22 + down, 5, 15, '#100C14'); rect(c, KNIFE - 1, 23 + down, 3, 12, '#B7BFCF'); rect(c, KNIFE - 1, 23 + down, 1, 12, '#EFF7FF');
      rect(c, KNIFE, 35 + down, 1, 1, '#B7BFCF');
      rect(c, KNIFE - 3, 13 + down, 7, 10, '#100C14'); rect(c, KNIFE - 2, 14 + down, 5, 8, '#6F3F23'); rect(c, KNIFE - 2, 14 + down, 1, 8, '#9F673F');
      rect(c, KNIFE, 16 + down, 1, 1, '#DFE7EF'); rect(c, KNIFE, 19 + down, 1, 1, '#DFE7EF');
      rect(c, KNIFE - win, 52, win * 2 + 1, 1, '#FFF7BF');
      pips(c, list.map(m => m.cut), list.findIndex(m => !m.cut));
    },
    state: s,
    sound: () => 0.2,
  };
}

// El espetón: la cara de abajo se asa; tocar para girar y mantener pulsado para retirarla
function espeton(recipe, base, k, say) {
  const lo = 0.6 - k.ancho, hi = 0.95 + k.ancho;
  const s = { heat: [0, 0, 0, 0], down: 0, spin: 0, hold: 0, t: 0 };
  const MAX = 14;
  let tapped = 0;
  say(recipe.pasos[0].texto);
  const finish = () => {
    const marks = s.heat.map(h => (h < lo ? 'cold' : h > hi ? 'hot' : 'good'));
    return { acierto: marks.filter(m => m === 'good').length / 4, hot: marks.filter(m => m === 'hot').length, cold: marks.filter(m => m === 'cold').length };
  };
  return {
    hint: 'Toca: girar la baya · mantén pulsado: sacarla cuando esté dorada',
    update(dt, t, { holding, taps }) {
      s.t += dt;
      // Charizard respira: el fuego sube y baja a oleadas
      const breath = 0.8 + 0.45 * Math.sin(s.t * 1.7) + (k.shaky ? 0.3 * Math.sin(s.t * 6) : 0);
      s.heat[s.down] += 0.36 * k.vel * breath * dt;
      for (let i = 0; i < 4; i++) if (i !== s.down) s.heat[i] += 0.03 * dt;
      s.spin = Math.max(0, s.spin - dt);
      if (taps.length) { tapped = 0; s.down = (s.down + 1) % 4; s.spin = 0.2; }
      // mantener (sin soltar) más de medio segundo la retira
      s.hold = holding ? s.hold + dt : 0;
      if (s.hold > 0.55 || s.t > MAX || s.heat.some(h => h > 1.35)) {
        const r = finish();
        if (s.heat.some(h => h > 1.35)) r.hot = (r.hot || 0) + 3;   // una cara hecha carbón
        say(r.hot ? '¡Se ha tostado demasiado por un lado!' : r.cold ? 'Le falta por algún lado, pero se come.' : '¡Dorada por los cuatro costados!');
        return r;
      }
      return null;
    },
    draw(c, t) {
      flameShape(c, CX, 52, 0.7, t, k.shaky);
      // el espetón y la baya, girando: se ven la cara de arriba y la de abajo
      rect(c, 40, 37, 56, 1, '#100C14'); rect(c, 95, 35, 3, 5, '#4F2F1F');
      const ang = s.spin / 0.2;
      const top = s.heat[(s.down + 2) % 4], front = s.heat[(s.down + 3) % 4], bottom = s.heat[s.down];
      const cy = 37;
      for (let dy = -6; dy <= 6; dy++) {
        const half = Math.round(Math.sqrt(36 - dy * dy) * 1.2);
        const k2 = dy < -2 ? top : dy > 2 ? bottom : front;
        rect(c, CX - half, cy + dy, half * 2, 1, doneness(k2, '#F7D74F', '#C7572F'));
      }
      // contorno, los gajos que giran y la hojita de arriba
      for (const dy of [-7, 7]) rect(c, CX - 4, cy + dy, 8, 1, '#100C14');
      for (let dy = -6; dy <= 6; dy++) { const half = Math.round(Math.sqrt(Math.max(0, 36 - dy * dy)) * 1.2); rect(c, CX - half - 1, cy + dy, 1, 1, '#100C14'); rect(c, CX + half, cy + dy, 1, 1, '#100C14'); }
      for (let i = 0; i < 3; i++) {
        const gx = Math.round(CX + Math.sin(ang + i * 2.1) * 6);
        if (Math.cos(ang + i * 2.1) > 0) rect(c, gx, cy - 4, 1, 9, 'rgba(143,87,23,0.55)');
      }
      rect(c, CX - 3 + Math.round(ang * 3), cy - 5, 2, 1, '#FFF7BF');
      rect(c, CX, cy - 9, 1, 2, '#4F2F1F'); rect(c, CX - 1, cy - 9, 1, 2, '#100C14'); rect(c, CX, cy - 10, 4, 2, '#100C14'); rect(c, CX, cy - 9, 1, 1, '#6F9F4F'); rect(c, CX + 1, cy - 10, 2, 1, '#A7D76F');
      // cuatro barras, una por cara (la de abajo, marcada)
      for (let i = 0; i < 4; i++) {
        const bx = 104 + i * 9, h = clamp(s.heat[i] / 1.35) * 44;
        rect(c, bx - 1, 9, 7, 48, '#100C14');
        rect(c, bx, 10 + 46 * (1 - hi / 1.35), 5, 46 * (hi - lo) / 1.35, '#3F5F3F');
        rect(c, bx, 56 - h, 5, h, doneness(s.heat[i], '#F7D74F', '#C7572F'));
        if (i === s.down) rect(c, bx, 59, 5, 2, '#FFB347');
      }
      if (s.hold > 0) rect(c, UI.x, 72, UI.w * clamp(s.hold / 0.55), 2, '#6F9F4F');
      else rect(c, UI.x, 72, UI.w * (1 - s.t / MAX), 2, '#FFB347');
    },
    state: s,
    sound: () => 0.4 + 0.3 * s.heat[s.down],
  };
}

// Una olla con asas, brillo y el caldo arriba (cx: centro, y: borde de arriba); hierve con el fuego
function olla(c, cx, y, w, h, caldo, t, f) {
  const x = cx - w / 2;
  rect(c, x - 3, y + 2, w + 6, 4, '#100C14'); rect(c, x - 2, y + 3, 2, 2, '#57576F'); rect(c, x + w, y + 3, 2, 2, '#57576F');   // asas
  rect(c, x, y, w, h, '#100C14');
  rect(c, x + 1, y + 1, w - 2, h - 2, '#7F87A7');
  rect(c, x + 2, y + 3, 2, h - 5, '#B7BFD7');                      // brillo
  rect(c, x + w - 4, y + 3, 2, h - 5, '#575F7F');                  // sombra
  rect(c, x + 1, y + 1, w - 2, 2, caldo); rect(c, x + 2, y + 1, w - 6, 1, mix(caldo, '#FFFFFF', 0.3));
  if (f > 0.5) for (let i = 0; i < 4; i++) rect(c, x + 3 + i * (w - 6) / 3, y - 2 - ((t / (f > 0.75 ? 60 : 120) + i * 3) % 6), 1, 1, '#F4EFE6');
}

// ---------- minijuegos de preparar (Charizard mira desde un lado o pone la llama) ----------

// Dibujitos de ingredientes (unos 11×10 píxeles, con contorno y volumen): cada letra es un color
const INK = { L: '#100C14', W: '#F4EFE6', w: '#C7C3D3', R: '#C73F2F', r: '#E2653F', D: '#8F2717', Y: '#FFD27A', y: '#D7A74F',
  O: '#F08F3F', o: '#B75F27', G: '#6F9F4F', g: '#3F6F3F', H: '#A7D76F', B: '#7F4F2F', b: '#4F2F1F', T: '#B7834F',
  P: '#F7A7C7', p: '#E2577F', K: '#5F5A67', C: '#4F8FDF', c: '#2F4F9F', U: '#9FD7FF', V: '#8F4FAF', v: '#5F2F7F',
  E: '#F2DCA0', e: '#C7A767', F: '#FFF7BF' };
function sprite(c, rows, x, y) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch !== '.') rect(c, x + dx, y + dy, 1, 1, INK[ch]); }));
}
const ING = {
  garbanzos: { nombre: 'garbanzos', art: ['...LLL.LLL..', '..LEFELEFEL.', '.LLEEeLEEeLL', 'LEFELLLLLEFE', 'LEEeLEFELEEe', '.LLLLEEeLLLL', 'LbBBBLLLBBBL', 'LBTTTTTTTTBL', '.LBTTTTTTBL.', '..LLLLLLLL..'] },
  chorizo: { nombre: 'chorizo', art: ['L.........L', 'wL.LLLLL.Lw', '.LLrRRRRLL.', 'LRrRWRRRWRL', 'LRRRRRWRRDL', 'LRWRRRRRRDL', '.LDRRRRRDL.', '..LLLLLLL..'] },
  patata: { nombre: 'patata', art: ['...LLLLL...', '.LLTEETTL..', 'LTEETTTTTL.', 'LTETbTTTTTL', 'LTTTTTTbTTL', 'LTTbTTTTTBL', '.LTTTTTTBBL', '..LBBBBBBL.', '...LLLLLL..'] },
  zanahoria: { nombre: 'zanahoria', art: ['.......LGL.', '......LGHGL', '....LLLgGL.', '...LOOOLgL.', '..LOFOOoL..', '..LOOoOOL..', '.LOOOOoL...', '.LOoOOOL...', 'LOOOoL.....', 'LoOL.......', '.LL........'] },
  calcetin: { nombre: 'un calcetín', art: ['..LLLLL....', '..LRRRL....', '..LWWWL....', '..LRRRL....', '..LWWWL....', '..LWWwL....', '.LWWWWwLL..', 'LWWWWWWWWL.', 'LwWWWWWWRL.', '.LLLLLLLLL.'], trampa: true },
  pokeball: { nombre: 'una Poké Ball', art: ['...LLLLL...', '.LLRRRRRLL.', 'LRFRRRRRRDL', 'LRRRLLLRRDL', 'LLLLWFWLLLL', 'LWWWLLLWwwL', 'LWWWWWWWwwL', '.LLWWWWwLL.', '...LLLLL...'], trampa: true },
  bota: { nombre: 'una bota vieja', art: ['.LLLLL.....', '.LBTBL.....', '.LBWBL.....', '.LBTBL.....', '.LBWBL.....', '.LBBBBLLL..', '.LBBBBBBBL.', 'LBBBBBBBTBL', 'LKKKKKKKKKL', '.LLLLLLLLL.'], trampa: true },
  magikarp: { nombre: 'un Magikarp', art: ['.....LL.......', '....LYOL....LL', '..LLOOOOLL.LOL', '.LOOOOOOOOLLOL', 'LOWLOOrOOrOOL.', 'LOLLOOOrOOOOL.', 'LFOOOOOOrOOOL.', '.LYFFFFOOOLLOL', '..LLFLLLLL.LOL', '...LYL......LL', '....L.........'], trampa: true },
  pescado: { nombre: 'pescado', art: ['.....LLL....', '...LLwWWL..L', '..LwWWWWWLLL', '.LWLWWwWWWwL', 'LWWWWWWWwwLL', '.LwwwwwwwwL.', '..LLLLLLLL..'] },
  gamba: { nombre: 'gambas', art: ['L.L........', '.L.LLLL....', '..LrOrOL...', '.LOrOrOOL..', '.LOOrOrOL..', '..LLOrOL...', '....LOOL...', '...LrOL....', '...LLL.....'] },
  mejillon: { nombre: 'mejillones', art: ['.LL.....LL.', 'LcKL...LKcL', 'LKcKL.LKcKL', 'LcKOL.LOKcL', '.LKOOLOOKL.', '..LKOOOKL..', '...LKOKL...', '....LKL....', '.....L.....'] },
  cebolla: { nombre: 'cebolla', art: ['.....L.....', '....LGL....', '...LLgLL...', '..LEWEEWL..', '.LEWEEEWeL.', '.LWEEWEEeL.', '.LEEWEEeeL.', '..LEEEeeL..', '...LLLLL...'] },
  patito: { nombre: 'un patito de goma', art: ['...LLL.....', '..LYYYL....', '..LYLYLL...', '..LYYYOOL..', '...LYYLL...', '.LLYYYYYLL.', 'LYYYYYYYYyL', 'LyYYYYYYyyL', '.LLLLLLLLL.'], trampa: true },
  tomate: { nombre: 'tomate', art: ['..LGL..', '.LRRRL.', 'LRYrYRL', 'LRrRrRL', 'LRYrYRL', '.LRRRL.', '..LLL..'] },
  queso: { art: ['.....L.', '...LLYL', '.LLYYYL', 'LYyYYYL', 'LYYYYyL', 'LyYYyYL', 'LLLLLLL'] },
  rodaja: { art: ['.LLLLL.', 'LRWRRRL', 'LRRRWRL', 'LRWRRRL', '.LLLLL.'] },
  baya: { art: ['..LgL..', '.LLGLL.', 'LCUCCcL', 'LCCCCcL', 'LCCCccL', '.LccL..', '..LL...'] },
  fresa: { art: ['LGHGHGL', '.LGGGL.', 'LRFRrRL', 'LRRYRRL', '.LRRYRL', '..LRRL.', '...LL..'] },
  nata: { art: ['...LL..', '..LWL..', '.LWWwL.', 'LWWWWWL', 'LWwWWwL', '.LLLLL.'] },
  menta: { art: ['.L...L.', 'LHL.LHL', 'LGHLHGL', '.LGGGL.', '..LgL..', '...L...'] },
};
// ancho y alto de un ingrediente, para centrarlo y para tocarlo
const isz = id => ({ w: Math.max(...ING[id].art.map(r => r.length)), h: ING[id].art.length });
// se dibuja centrado en (x, y)
const ing = (c, id, x, y) => { const { w, h } = isz(id); sprite(c, ING[id].art, Math.round(x - w / 2), Math.round(y - h / 2)); };

// Marmita de potaje: elegir de la estantería los ingredientes buenos y luego remover
function potaje(recipe, base, k, say) {
  const buenos = recipe.ingredientes || ['garbanzos', 'chorizo', 'patata', 'zanahoria'];
  const malos = recipe.trampas || ['calcetin', 'pokeball', 'bota', 'magikarp'];
  const caldo = recipe.caldo || '#C7873F';
  const ids = [...buenos, ...malos].sort(() => Math.random() - 0.5);
  // cada cosa, centrada en su balda (x, y es su centro)
  const shelf = ids.map((id, i) => ({ id, x: 95 + (i % 4) * 16, y: 24 + Math.floor(i / 4) * 22 + (5.5 - isz(id).h / 2), gone: false, fly: null }));
  const POT = { x: 42, y: 44 };
  const s = { fase: 'elegir', t: 0, good: 0, bad: 0, ang: 0, turns: 0, splash: 0, lastA: null, shelf };
  const g = {
    hint: `Toca solo: ${buenos.map(i => ING[i].nombre).join(', ')}`,
    state: s,
    update(dt, t, inp) {
      s.t += dt;
      for (const it of shelf) if (it.fly) it.fly.k = Math.min(1, it.fly.k + dt * 2.5);
      if (s.fase === 'elegir') {
        for (const p of inp.taps) {
          // hay que señalar con el dedo o el ratón: con la barra espaciadora no se elige
          const it = p && shelf.find(o => !o.gone && Math.abs(p.x - o.x) <= 8 && Math.abs(p.y - o.y) <= 7);
          if (!it) continue;
          it.gone = true; it.fly = { k: 0, x0: it.x, y0: it.y };
          const n = ING[it.id].nombre;
          if (ING[it.id].trampa) { s.bad += 1; say(`¡Eso es ${n}! Eso no va en ${recipe.genero === 'f' ? 'la' : 'el'} ${recipe.nombre}…`); }
          else { s.good += 1; say(`${n[0].toUpperCase()}${n.slice(1)}, a la marmita.`); }
        }
        if (s.good >= buenos.length || s.t > 10 / k.vel) {
          s.fase = 'remover'; s.t = 0;
          g.hint = 'Mantén pulsado y da vueltas a la marmita, despacio';
          say('Ahora a remover. Despacito y con vueltas redondas.');
        }
        return null;
      }
      // remover: cuenta el giro alrededor de la marmita
      if (inp.holding) {
        let da = 0;
        if (inp.pos) {
          const a = Math.atan2(inp.pos.y - POT.y, inp.pos.x - POT.x);
          const d = Math.hypot(inp.pos.y - POT.y, inp.pos.x - POT.x);
          if (s.lastA != null && d > 3 && d < 30) {
            da = a - s.lastA;
            if (da > Math.PI) da -= 2 * Math.PI;
            if (da < -Math.PI) da += 2 * Math.PI;
            da = Math.abs(da);
          }
          s.lastA = a;
        } else da = 5 * dt;    // con teclado se remueve solo
        if (dt > 0 && da / dt > 16) s.splash += dt;    // demasiado deprisa: salpica
        s.ang += da;
      } else s.lastA = null;
      s.turns = s.ang / (Math.PI * 2);
      if (s.turns >= 4 || s.t > 8 / k.vel) {
        const elegir = Math.max(0, s.good / buenos.length - s.bad * 0.3);
        const remover = Math.min(1, s.turns / 4) - Math.min(0.6, s.splash);
        return { acierto: elegir * 0.6 + remover * 0.4, hot: s.bad + s.splash * 3, cold: (buenos.length - s.good) + (4 - Math.min(4, s.turns)) * 0.5 };
      }
      return null;
    },
    draw(c, t) {
      // estantería a la derecha
      rect(c, 85, 7, 68, 47, '#100C14'); rect(c, 86, 8, 66, 45, '#8F5F37'); rect(c, 87, 9, 64, 43, '#6F4527');
      for (const y of [30, 52]) { rect(c, 86, y, 66, 2, '#B7834F'); rect(c, 86, y + 2, 66, 1, '#4F2F1F'); }
      for (const it of shelf) {
        if (!it.gone) { ing(c, it.id, it.x, it.y); continue; }
        if (it.fly && it.fly.k < 1) {
          const kk = it.fly.k;
          ing(c, it.id, lerp(it.fly.x0, POT.x, kk), lerp(it.fly.y0, POT.y - 8, kk) - Math.sin(kk * Math.PI) * 14);
        }
      }
      // la marmita sobre la llama de Charizard
      flameShape(c, POT.x, 60, 0.5, t, k.shaky);
      olla(c, POT.x, POT.y - 6, 26, 14, s.bad ? '#7F7F4F' : caldo, t, 0.5);
      if (s.fase === 'remover') {
        const a = s.ang;
        const cx = POT.x + Math.cos(a) * 8;
        rect(c, cx, POT.y - 20, 2, 15, '#B7834F');
        if (s.splash > 0 && Math.floor(t / 100) % 2) for (let i = 0; i < 4; i++) rect(c, POT.x - 10 + i * 7, POT.y - 10 - (i % 2) * 3, 1, 2, '#C7873F');
        for (let i = 0; i < 4; i++) { rect(c, UI.x + i * 9, 66, 7, 7, '#100C14'); rect(c, UI.x + 1 + i * 9, 67, 5, 5, s.turns > i + 1 ? '#6F9F4F' : s.turns > i ? '#FFB347' : '#5F5A67'); }
      } else {
        for (let i = 0; i < buenos.length; i++) { rect(c, UI.x + i * 9, 66, 7, 7, '#100C14'); rect(c, UI.x + 1 + i * 9, 67, 5, 5, i < s.good ? '#6F9F4F' : '#5F5A67'); }
        for (let i = 0; i < s.bad; i++) { rect(c, 78 + i * 9, 66, 7, 7, '#100C14'); rect(c, 79 + i * 9, 67, 5, 5, '#C73F2F'); }
      }
    },
    sound: () => (s.fase === 'remover' ? 0.35 : 0.2),
  };
  say(recipe.pasos[0].texto);
  return g;
}

// Pizza: amasar a toques alternos (izquierda, derecha), estirar sin romperla y poner los ingredientes
function pizza(recipe, base, k, say) {
  const C0 = { x: 64, y: 37 }, R0 = 21;
  const spots = Array.from({ length: 6 }, (_, i) => ({ x: C0.x + Math.cos(i * 1.05 + 0.3) * 12, y: C0.y + Math.sin(i * 1.05 + 0.3) * 8, got: null }));
  const s = { fase: 'amasar', t: 0, kneads: 0, lastSide: 0, squish: 0, r: 6, tear: 0, roto: false, held: false, estirado: null, spots, fuera: 0, bake: 0 };
  const NK = 14;
  const g = {
    hint: 'Amasa: toca a izquierda y derecha, alternando',
    state: s,
    update(dt, t, inp) {
      s.t += dt;
      s.squish = Math.max(0, s.squish - dt * 4);
      if (s.fase === 'amasar') {
        for (const p of inp.taps) {
          const side = p ? (p.x < C0.x ? -1 : 1) : (s.lastSide ? -s.lastSide : 1);
          if (side !== s.lastSide) { s.kneads += 1; s.lastSide = side; s.squish = 1; }
        }
        if (s.kneads >= NK || s.t > 7 / k.vel) {
          s.fase = 'estirar'; s.t = 0; s.r = 6;
          g.hint = 'Estira: arrastra desde la masa hasta el círculo';
          say('Ahora a estirarla. Con cariño, que se rompe.');
        }
        return null;
      }
      if (s.fase === 'estirar') {
        if (inp.holding) {
          const target = inp.pos ? Math.hypot(inp.pos.x - C0.x, (inp.pos.y - C0.y) * 1.4) : s.r + 4;
          if (target > s.r) s.r = Math.min(target, s.r + 9 * dt);
          if (target - s.r > 9) s.tear += dt; else s.tear = Math.max(0, s.tear - dt * 0.5);
          if (s.tear > 0.7 && !s.roto) { s.roto = true; say('¡Se ha roto! Bueno, se tapa con queso.'); }
          s.held = true;
        } else if (s.held) s.estirado = s.r;
        if (s.estirado != null || s.t > 9 / k.vel || s.r > R0 + 8) {
          s.estirado = s.estirado ?? s.r;
          const enc = Math.min(1, Math.max(0.35, (s.estirado - 3) / 12));
          for (const o of spots) { o.x = C0.x + (o.x - C0.x) * enc; o.y = C0.y + (o.y - C0.y) * enc; }
          s.fase = 'poner'; s.t = 0;
          g.hint = 'Toca los círculos que brillan';
          say(Math.abs(s.estirado - R0) <= 3 ? '¡Redonda y finita!' : s.estirado < R0 ? 'Ha quedado gordita. Para Snorlax, mejor.' : 'Muy fina… casi transparente.');
        }
        return null;
      }
      if (s.fase === 'poner') {
        for (const p of inp.taps) {
          const free = spots.filter(o => !o.got);
          if (!free.length) break;
          if (!p) continue;
          const near = free.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
          const d = Math.hypot(near.x - p.x, near.y - p.y);
          const inPizza = Math.hypot(p.x - C0.x, (p.y - C0.y) * 1.4) <= s.estirado;
          if (d <= 5) near.got = 'good';
          else if (inPizza) near.got = 'cold';
          else { s.fuera += 1; say('¡Al suelo! Charizard se lo come, eso sí.'); }
        }
        if (spots.every(o => o.got) || s.t > 8 / k.vel) { s.fase = 'horno'; s.t = 0; say('¡Charizard, fuego! Al horno.'); }
        return null;
      }
      // al horno con el aliento de Charizard
      s.bake += dt;
      if (s.bake > 1.4) {
        const amasar = Math.min(1, s.kneads / NK);
        const estirar = s.roto ? 0.2 : Math.max(0, 1 - Math.abs(s.estirado - R0) / 8);
        const poner = spots.filter(o => o.got === 'good').length / spots.length - s.fuera * 0.1;
        return { acierto: poner > 0 ? (amasar + estirar + poner) / 3 : Math.min(0.1, (amasar + estirar) / 3), hot: (s.roto ? 1 : 0) + s.fuera + (s.estirado > R0 + 4 ? 1 : 0),
          cold: (1 - amasar) * 2 + (s.estirado < R0 - 4 ? 1 : 0) + spots.filter(o => !o.got).length * 0.5 };
      }
      return null;
    },
    draw(c, t) {
      // mesa enharinada
      rect(c, 36, 56, 60, 4, '#100C14'); rect(c, 37, 56, 58, 2, '#D7A76F');
      for (let i = 0; i < 12; i++) rect(c, 40 + ((i * 37) % 52), 54 + (i % 3), 1, 1, '#F4EFE6');
      if (s.fase === 'amasar') {
        const sq = s.squish * 3;
        const w = 12 + sq, h = 8 - sq / 2;
        // la bola de masa, con contorno, brillo arriba y sombra abajo
        const rows = [];
        for (let dy = -Math.round(h); dy <= 0; dy++) rows.push([dy, Math.round(w * Math.sqrt(Math.max(0, 1 - (dy / (h + 0.5)) ** 2)))]);
        const ox = C0.x + s.lastSide * sq, base = C0.y + 12;
        for (const [dy, half] of rows) rect(c, ox - half - 1, base + dy - 1, half * 2 + 2, 2, '#100C14');
        rect(c, C0.x - w - 1, base, w * 2 + 2, 2, '#100C14');
        for (const [dy, half] of rows) rect(c, ox - half, base + dy, half * 2, 1, dy > -2 ? '#D7B78F' : dy < -h + 2 ? '#FFF7E7' : '#F7E7C7');
        // la mano de Manolo apretando: palma, dedos, pulgar y la manga
        const hx = s.lastSide < 0 ? C0.x - 13 : C0.x + 5, hy = C0.y + 1 - (s.squish > 0.5 ? 0 : 3);
        rect(c, hx - 1, hy - 1, 10, 8, '#100C14'); rect(c, hx, hy, 8, 6, '#FBB995');
        for (const fx of [2, 4, 6]) rect(c, hx + fx, hy + 3, 1, 3, '#D78F6F');
        rect(c, hx + (s.lastSide < 0 ? 8 : -2), hy + 1, 2, 3, '#100C14'); rect(c, hx + (s.lastSide < 0 ? 8 : -1), hy + 2, 1, 2, '#FBB995');
        rect(c, hx, hy - 1, 8, 2, '#28315A');
        for (let i = 0; i < NK; i++) rect(c, 34 + i * 4, 66, 3, 3, i < s.kneads ? '#6F9F4F' : '#5F5A67');
        return;
      }
      const r = s.fase === 'estirar' ? s.r : s.estirado;
      // guía del tamaño bueno mientras se estira
      if (s.fase === 'estirar') for (let a = 0; a < Math.PI * 2; a += 0.12) rect(c, C0.x + Math.cos(a) * R0, C0.y + Math.sin(a) * R0 / 1.4, 1, 1, Math.floor(t / 250) % 2 ? '#FFF7BF' : '#C7973F');
      const ry = Math.floor(r / 1.4);
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.round(Math.sqrt(Math.max(0, r * r - (dy * 1.4) ** 2)));
        rect(c, C0.x - half, C0.y + dy, half * 2, 1, s.fase === 'horno' ? mix('#F7E7C7', '#D7974F', s.bake / 1.4) : '#F7E7C7');
      }
      if (s.fase !== 'estirar') {
        for (let dy = -ry + 1; dy < ry; dy++) {
          const half = Math.round(Math.sqrt(Math.max(0, (r - 2) ** 2 - (dy * 1.4) ** 2)));
          rect(c, C0.x - half, C0.y + dy, half * 2, 1, '#E2653F');
        }
      }
      if (s.roto) { rect(c, C0.x + 3, C0.y - 2, 3, 2, '#D7A76F'); rect(c, C0.x + 4, C0.y - 1, 1, 1, '#100C14'); }
      if (s.fase === 'poner' || s.fase === 'horno') {
        spots.forEach((o, i) => {
          const id = ['queso', 'tomate', 'rodaja'][i % 3];
          if (o.got) ing(c, id, o.x + (o.got === 'cold' ? 2 : 0), o.y + (o.got === 'cold' ? 1 : 0));
          else {
            // la sombra de lo que va ahí, que parpadea
            c.globalAlpha = Math.floor(t / 300) % 2 ? 0.55 : 0.3; ing(c, id, o.x, o.y); c.globalAlpha = 1;
          }
        });
      }
      if (s.fase === 'horno') for (let i = 0; i < 8; i++) rect(c, 22 + ((t / 15 + i * 9) % 26), 34 + Math.sin(t / 90 + i) * 4, 2, 1, i % 2 ? '#FFB347' : '#E2653F');
    },
    sound: () => (s.fase === 'horno' ? 0.8 : 0.1),
  };
  say(recipe.pasos[0].texto);
  return g;
}

// Emplatar: arrastrar cada cosa a su sitio en la tarta (la de bayas de Jigglypuff)
function emplatar(recipe, base, k, say) {
  const PLATE = { x: 60, y: 40 };
  const kinds = ['baya', 'fresa', 'baya', 'nata', 'menta', 'fresa'];
  // x, y: centro de cada cosa
  const targets = [[-14, -6], [-5, -9], [5, -9], [14, -6], [0, -15], [0, 0]].map(([dx, dy], i) => ({ x: PLATE.x + dx, y: PLATE.y + dy, kind: kinds[i], got: false }));
  const tray = kinds.map((kind, i) => ({ kind, x: 106 + (i % 3) * 14, y: 27 + Math.floor(i / 3) * 16, home: null, placed: null }));
  tray.forEach(o => { o.home = { x: o.x, y: o.y }; });
  const s = { t: 0, drag: null, good: 0, off: 0, fall: 0, tray, targets };
  const DUR = 16 / k.vel;
  const place = (o, tg) => { tg.got = true; o.placed = 'good'; o.x = tg.x; o.y = tg.y; s.good += 1; };
  const g = {
    hint: 'Arrastra cada cosa a su sombra en la tarta',
    state: s,
    update(dt, t, inp) {
      s.t += dt;
      // coger con el dedo
      if (inp.holding && !s.drag && inp.pos) {
        const o = tray.find(o => !o.placed && Math.abs(inp.pos.x - o.x) <= 7 && Math.abs(inp.pos.y - o.y) <= 7);
        if (o) s.drag = o;
      }
      if (s.drag && inp.pos && inp.holding) { s.drag.x = inp.pos.x; s.drag.y = inp.pos.y; }
      if (s.drag && !inp.holding) {
        const o = s.drag;
        s.drag = null;
        const free = targets.filter(tg => !tg.got && tg.kind === o.kind);
        const dist = tg => Math.hypot(tg.x - o.x, tg.y - o.y);
        const near = free.sort((a, b) => dist(a) - dist(b))[0];
        const onCake = Math.hypot(o.x - PLATE.x, (o.y - PLATE.y) * 1.6) <= 24;
        if (near && dist(near) <= 5) place(o, near);
        else if (onCake) { o.placed = 'off'; s.off += 1; }
        else if (o.x < 94) { o.placed = 'fall'; s.fall += 1; say('¡Al suelo! Charizard se lo come de un bocado.'); }
        else { o.x = o.home.x; o.y = o.home.y; }   // vuelve a la bandeja
      }
      if (tray.every(o => o.placed) || s.t > DUR) {
        return { acierto: s.good / tray.length - s.fall * 0.1, hot: s.fall, cold: s.off + tray.filter(o => !o.placed).length };
      }
      return null;
    },
    draw(c, t) {
      // bandeja, plato y tarta
      rect(c, 96, 16, 48, 38, '#100C14'); rect(c, 97, 17, 46, 36, '#C7C3D3'); rect(c, 98, 18, 44, 34, '#9F9AA7');
      for (let dy = -7; dy <= 7; dy++) { const half = Math.round(30 * Math.sqrt(1 - (dy / 7.5) ** 2)); rect(c, PLATE.x - half, PLATE.y + 10 + dy, half * 2, 1, dy < -5 ? '#F4EFE6' : '#C7C3D3'); }
      // bizcocho con su cobertura rosa por encima
      rect(c, PLATE.x - 22, PLATE.y - 2, 44, 11, '#100C14'); rect(c, PLATE.x - 21, PLATE.y - 1, 42, 9, '#D7974F'); rect(c, PLATE.x - 21, PLATE.y + 3, 42, 1, '#F7E7C7');
      for (let dy = -12; dy <= 0; dy++) { const half = Math.round(22 * Math.sqrt(1 - (dy / 12.5) ** 2)); rect(c, PLATE.x - half, PLATE.y - 2 + dy, half * 2, 1, dy === -12 ? '#100C14' : dy < -8 ? '#FFC7D7' : '#F7A7C7'); }
      for (let i = 0; i < 7; i++) rect(c, PLATE.x - 20 + i * 6, PLATE.y - 2, 3, 2 + (i % 2), '#F7A7C7');
      for (const tg of targets) if (!tg.got) {
        c.globalAlpha = 0.3 + 0.15 * Math.sin(t / 200); ing(c, tg.kind, tg.x, tg.y); c.globalAlpha = 1;
      }
      for (const o of tray) if (o.placed !== 'fall' && o !== s.drag) ing(c, o.kind, o.x, o.y);
      if (s.drag) ing(c, s.drag.kind, s.drag.x, s.drag.y - 1);
      rect(c, UI.x, 72, UI.w * Math.max(0, 1 - s.t / DUR), 2, '#FFB347');
    },
    sound: () => 0,
  };
  say(recipe.pasos[0].texto);
  return g;
}

// La inspección de Sanidad: la ceniza y la grasa que deja Charizard; tocarlas antes de que llegue el inspector
function limpiar(recipe, base, k) {
  const N = 10, T = 14 / k.vel;
  const manchas = Array.from({ length: N }, (_, i) => ({ x: 44 + ((i * 37 + Math.random() * 20) % 108), y: 14 + ((i * 23 + Math.random() * 14) % 50), r: 3 + (i % 3), tipo: i % 3 ? 'ceniza' : 'grasa', ok: false, brillo: 0 }));
  const s = { t: 0, manchas, fallos: 0 };
  return {
    hint: 'Toca la ceniza y la grasa antes de que llegue el inspector (sin restregar a lo loco)',
    update(dt, t, { taps }) {
      s.t += dt;
      for (const m of manchas) m.brillo = Math.max(0, m.brillo - dt);
      for (const p of taps) {
        if (!p) continue;
        const m = manchas.filter(m => !m.ok).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (m && Math.hypot(m.x - p.x, m.y - p.y) <= m.r + 3) { m.ok = true; m.brillo = 0.5; }
        else { s.fallos += 1; s.t += 0.5; }   // restregar donde no hay nada esparce la ceniza: el inspector se acerca
      }
      const hechas = manchas.filter(m => m.ok).length;
      if (hechas === N || s.t > T) return { acierto: hechas / N - 0.04 * s.fallos, hot: N - hechas, cold: 0 };
      return null;
    },
    draw(c, t) {
      for (const m of manchas) {
        if (m.ok) { if (m.brillo > 0) { rect(c, m.x - 3, m.y, 7, 1, '#FFF7BF'); rect(c, m.x, m.y - 3, 1, 7, '#FFF7BF'); } continue; }
        const col = m.tipo === 'grasa' ? '#8F6F2F' : '#4F4A57';
        for (let dy = -m.r; dy <= m.r; dy++) { const w = Math.round(Math.sqrt(m.r * m.r - dy * dy)); rect(c, m.x - w, m.y + dy, w * 2 + 1, 1, col); }
        rect(c, m.x - 1, m.y - 1, 1, 1, m.tipo === 'grasa' ? '#C7A75F' : '#6F6A77');
      }
      // el reloj del inspector, arriba
      rect(c, UI.x, 4, UI.w, 3, '#100C14'); rect(c, UI.x, 4, UI.w * Math.max(0, 1 - s.t / T), 3, '#C73F2F');
    },
    state: s,
    sound: () => 0,
  };
}

// El Team Rocket viene a por la chistorra: sombras en la ventana de la despensa; tocarlas para espantarlas
function rocket(recipe, base, k) {
  const N = 8, VEN = [[38, 14], [70, 14], [102, 14]];
  const s = { t: 0, n: 0, sombra: null, espera: 0.8, bien: 0, mal: 0, falsas: 0, susto: 0 };
  const ventana = p => VEN.findIndex(([vx, vy]) => Math.abs(p.x - (vx + 10)) <= 11 && Math.abs(p.y - (vy + 14)) <= 15);
  return {
    hint: 'Toca las sombras de la ventana antes de que se lleven la chistorra',
    update(dt, t, { taps }) {
      s.t += dt; s.susto = Math.max(0, s.susto - dt);
      if (!s.sombra) {
        s.espera -= dt;
        if (s.espera <= 0) { s.sombra = { v: Math.floor(Math.random() * 3), vida: (1.15 - 0.03 * s.n) / k.vel }; s.n += 1; }
      } else {
        s.sombra.vida -= dt;
        const [vx, vy] = VEN[s.sombra.v];
        if (taps.some(p => p && ventana(p) === s.sombra.v)) { s.bien += 1; s.susto = 0.4; s.sombra = null; s.espera = 0.4 + Math.random() * 0.7; }
        else if (s.sombra.vida <= 0) { s.mal += 1; s.sombra = null; s.espera = 0.4 + Math.random() * 0.7; }
      }
      for (const p of taps) if (p && (!s.sombra || ventana(p) !== s.sombra.v) && !(s.susto > 0.35)) s.falsas += 1;
      if (s.n >= N && !s.sombra) return { acierto: (s.bien - 0.5 * s.falsas) / N, hot: s.mal + s.falsas, cold: 0 };
      return null;
    },
    draw(c, t) {
      // por la mañana: la despensa en penumbra y tres ventanas con el cielo de fuera
      c.globalAlpha = 0.25; rect(c, 0, 0, W, H, '#100C24'); c.globalAlpha = 1;
      for (const [i, [x, y]] of VEN.entries()) {
        rect(c, x - 1, y - 1, 22, 30, '#100C14'); rect(c, x, y, 20, 28, '#97C3E7'); rect(c, x, y + 18, 20, 10, '#B7E3F7');
        rect(c, x + 9, y, 1, 28, '#100C14'); rect(c, x, y + 13, 20, 1, '#100C14');
        if (s.sombra?.v === i) {
          // la silueta: dos cabezas (una con melena y otra con el pelo hacia atrás) y una R en el pecho
          rect(c, x + 3, y + 8, 6, 20, '#000000'); rect(c, x + 11, y + 9, 6, 19, '#000000');
          rect(c, x + 2, y + 4, 8, 7, '#000000'); rect(c, x + 11, y + 5, 7, 6, '#000000'); rect(c, x + 1, y + 6, 2, 9, '#000000');
          rect(c, x + 5, y + 16, 2, 3, '#C73F2F'); rect(c, x + 13, y + 16, 2, 3, '#C73F2F');
        }
      }
      if (s.susto > 0) { rect(c, 60, 50, 3, 3, '#FFF7BF'); rect(c, 90, 48, 3, 3, '#FFF7BF'); }
      for (let i = 0; i < N; i++) rect(c, UI.x + i * 5, 72, 4, 4, i < s.bien ? '#6F9F4F' : i < s.bien + s.mal ? '#C73F2F' : '#5F5A67');
    },
    state: s,
    sound: () => 0,
  };
}

// El kebab: el rollo gira junto a la parrilla de Charizard y se va dorando por franjas. Hay que
// pasar el cortador (mantener pulsado y arrastrar arriba y abajo) por las franjas doradas para que
// caigan los cachos en el pan; lo pálido sale crudo y lo que se deja demasiado, quemado.
function kebab(recipe, base, k, say) {
  const N = 10, BANDS = 5;
  const ROLL = { x: 96, top: 12, h: 40 };
  const bh = ROLL.h / BANDS;
  // cada franja se dora a su ritmo (en el medio pega más la llama)
  const bands = [...Array(BANDS)].map((_, i) => ({ d: 0.15 + Math.random() * 0.2, vel: (0.16 + 0.07 * (2 - Math.abs(i - 2))) * k.vel * (0.85 + Math.random() * 0.3), cut: 0 }));
  const lo = 0.55 - k.ancho, hi = 1 + k.ancho;
  const s = { knifeY: null, slices: [], falling: [], hot: 0, cold: 0, good: 0, t: 0, lastY: null };
  const ancho = y => 13 - (y - ROLL.top) / ROLL.h * 5;   // más gordo arriba, como los de verdad
  say(recipe.pasos[0].texto);
  return {
    hint: 'Mantén pulsado y pasa el cortador por lo dorado',
    update(dt, t, { holding, pos }) {
      s.t += dt;
      for (const b of bands) { b.d = Math.min(1.5, b.d + b.vel * dt * (k.shaky ? 1 + 0.5 * Math.sin(t / 300) : 1)); b.cut = Math.max(0, b.cut - dt); }
      for (const f of s.falling) f.k = Math.min(1, f.k + dt * 2.2);
      s.falling = s.falling.filter(f => f.k < 1 || !s.slices.push(f.d));
      if (holding) {
        // con el ratón o el dedo, el cortador va a donde apuntes; con la barra, baja solo
        const y = pos ? Math.max(ROLL.top, Math.min(ROLL.top + ROLL.h - 1, pos.y)) : ROLL.top + ((s.t * 40) % ROLL.h);
        const from = s.lastY ?? y;
        for (const [i, b] of bands.entries()) {
          const y0 = ROLL.top + i * bh, y1 = y0 + bh;
          // se corta la franja por la que pasa el cortador (si no se acaba de cortar)
          if (b.cut > 0 || Math.max(from, y) < y0 || Math.min(from, y) > y1) continue;
          if (s.slices.length + s.falling.length >= N) break;   // el pan ya está lleno
          b.cut = 0.5;
          const j = b.d < lo ? 'cold' : b.d > hi ? 'hot' : 'good';
          s[j] += 1;
          s.falling.push({ d: b.d, k: 0, y: (y0 + y1) / 2 });
          if (j === 'hot') say('¡Eso está negro! Charizard, menos fuego…');
          else if (j === 'cold') say('Uy, eso aún estaba crudo.');
          else if (s.good % 3 === 1) say('¡Así, finito y dorado!');
          b.d = 0.1 + Math.random() * 0.15;   // debajo, la carne aún está cruda
        }
        s.knifeY = y; s.lastY = y;
      } else { s.knifeY = null; s.lastY = null; }
      if (s.slices.length + s.falling.length >= N && !s.falling.length) {
        return { acierto: s.good / N - (s.hot + s.cold) * 0.06, hot: s.hot, cold: s.cold };
      }
      // si no se corta nada en mucho rato, se quema el rollo
      if (s.t > 22 / k.vel) return { acierto: s.good / N, hot: s.hot + 2, cold: s.cold };
      return null;
    },
    draw(c, t) {
      // la parrilla vertical detrás, con la llama de Charizard
      rect(c, 116, 8, 10, 48, '#100C14'); rect(c, 117, 9, 8, 46, '#5F5A67');
      for (let y = 11; y < 54; y += 4) rect(c, 118, y, 6, 2, Math.sin(t / 150 + y) > 0 ? '#E2653F' : '#FFB347');
      // el pincho, la bandeja y el rollo girando
      rect(c, ROLL.x, 6, 1, 52, '#9F9AA7');
      rect(c, ROLL.x - 12, 54, 25, 3, '#100C14'); rect(c, ROLL.x - 11, 54, 23, 2, '#9F9AA7');
      for (const [i, b] of bands.entries()) {
        const y0 = ROLL.top + i * bh;
        for (let y = Math.round(y0); y < Math.round(y0 + bh); y++) {
          const w = ancho(y);
          rect(c, ROLL.x - w - 1, y, w * 2 + 3, 1, '#100C14');
          // las vetas giran: rayas que pasan de un lado al otro
          for (let x = -w; x <= w; x++) {
            const veta = Math.sin((x / w) * 1.4 + t / 260 + y * 0.7) > 0.55;
            const col = doneness(b.d, '#E7A7A7', '#C7772F');
            rect(c, ROLL.x + x, y, 1, 1, veta ? mix(col, '#100C14', 0.25) : x > w - 2 ? mix(col, '#FFF7BF', 0.3) : col);
          }
        }
        if (b.cut > 0.3) rect(c, ROLL.x - ancho(y0) - 3, Math.round(y0 + bh / 2), 2, 1, '#FFF7BF');
      }
      // los cachos que caen al pan
      const PAN = { x: 58, y: 58 };
      for (const f of s.falling) {
        const x = lerp(ROLL.x - 10, PAN.x, f.k), y = lerp(f.y, PAN.y - 4, f.k) - Math.sin(f.k * Math.PI) * 6;
        rect(c, x - 2, y - 1, 5, 3, '#100C14'); rect(c, x - 1, y, 3, 1, doneness(f.d, '#E7A7A7', '#C7772F'));
      }
      // el pan de pita con lo que ya ha caído
      rect(c, PAN.x - 15, PAN.y - 2, 31, 8, '#100C14'); rect(c, PAN.x - 14, PAN.y - 1, 29, 6, '#E7C78F'); rect(c, PAN.x - 14, PAN.y + 3, 29, 2, '#C79F5F');
      s.slices.forEach((d, i) => { rect(c, PAN.x - 12 + (i % 9) * 3, PAN.y - 3 - Math.floor(i / 9) * 2 + (i % 2), 3, 2, doneness(d, '#E7A7A7', '#C7772F')); });
      // el cortador (la maquinita redonda con mango)
      if (s.knifeY != null) {
        const y = Math.round(s.knifeY), x = ROLL.x - ancho(y) - 7;
        rect(c, x - 12, y - 1, 9, 3, '#100C14'); rect(c, x - 11, y, 7, 1, '#3F3F4F');
        rect(c, x - 3, y - 4, 7, 9, '#100C14'); rect(c, x - 2, y - 3, 5, 7, '#B7BFCF'); rect(c, x - 1, y - 3, 1, 7, '#EFF7FF');
      }
      for (let i = 0; i < N; i++) {
        const d = s.slices[i];
        const col = d == null ? '#5F5A67' : d < lo ? '#9F9AA7' : d > hi ? '#C73F2F' : '#6F9F4F';
        rect(c, UI.x + i * 9, 66, 7, 7, '#100C14'); rect(c, UI.x + 1 + i * 9, 67, 5, 5, col);
      }
    },
    state: s,
    sound: () => (s.knifeY != null ? 0.45 : 0.25),
  };
}

// ---------- los minijuegos de los sucesos y de algunos encargos ----------
// (la leña de la nevada, las velas del apagón, los deseos de la lluvia de estrellas, el café a la
// malagueña, el ladrón de la despensa, la planta de Bulbasaur, el Tetris de maletas, abrir el camino
// nevado y el punto del termal). Cada uno tiene su escenario en ESCENA (el fondo, dónde se pone
// Charizard y qué otros sprites salen) y recibe en recipe.datos lo que le manda la posada.

function disc(c, x, y, r, col) {
  for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); rect(c, x - w, y + dy, w * 2 + 1, 1, col); }
}
// los copos que caen, delante de todo
function copos(c, t, n = 28) {
  for (let i = 0; i < n; i++) {
    const y = ((i * 37 + t / 1000 * (8 + (i % 4) * 4)) % (H + 6)) - 3;
    const x = (i * 61 + Math.sin(t / 900 + i) * 3 + t / 1000 * 4) % W;
    rect(c, x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2, '#FFFFFF');
  }
}
// el pino calcinado de la entrada: tronco negro y cuatro ramas peladas (con nieve encima, si nieva)
function pino(c, x, base, h, nieve = false) {
  rect(c, x - 2, base - h, 4, h, '#100C14'); rect(c, x - 1, base - h, 1, h, '#2F2A2F');
  for (const [dy, lado, l] of [[7, -1, 7], [13, 1, 8], [20, -1, 9], [27, 1, 6]]) {
    const y = base - h + dy, x0 = lado < 0 ? x - 1 - l : x + 2;
    rect(c, x0, y, l, 1, '#100C14');
    rect(c, lado < 0 ? x0 : x0 + l - 1, y - 2, 1, 2, '#100C14');
    if (nieve) rect(c, x0, y - 1, l, 1, '#F4F7FF');
  }
  if (nieve) rect(c, x - 2, base - h - 1, 4, 1, '#F4F7FF');
}
// la sierra del fondo (con la cima nevada si se pasa color)
function montes(c, y0, col, cima = null) {
  for (let x = 0; x < W; x++) {
    const h = Math.round(14 + 9 * Math.sin(x / 23 + 1) + 5 * Math.sin(x / 9.5));
    rect(c, x, y0 - h, 1, h, col);
    if (cima && h > 17) rect(c, x, y0 - h, 1, Math.min(4, h - 17), cima);
  }
}
// un sprite extra (Manolo, el huésped, Psyduck…) en (x, y), mirando a dir
function pinta(c, a, x, y, t, dir = DIR.down) {
  if (!a) return;
  a.x = x; a.y = y; a.dir = dir;
  a.draw(c, t);
}
// la barrita del tiempo que queda
const reloj = (c, k01, y = 77, col = '#FFB347') => { rect(c, UI.x, y, UI.w, 2, '#5F5A67'); rect(c, UI.x, y, UI.w * clamp(1 - k01), 2, col); };

// ----- 1. Leña para la nevada -----
function fondoNieve(c) {
  for (let y = 0; y < 52; y += 4) rect(c, 0, y, W, 4, mix('#8FA3BF', '#D7E1EC', y / 52));
  montes(c, 50, '#B7C5D7', '#F4F7FF');
  rect(c, 0, 50, W, 30, '#E7EEF7'); rect(c, 0, 50, W, 1, '#FFFFFF');
  for (let x = 2; x < W; x += 13) rect(c, x, 60 + (x % 4) * 4, 6, 1, '#C7D3E3');
  pino(c, 7, 58, 46, true);
  // la leñera: tejadillo nevado y troncos apilados
  rect(c, 134, 24, 26, 34, '#100C14'); rect(c, 135, 26, 24, 31, '#4F2F1F');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
    const cx = 140 + x * 7 + (y % 2) * 3, cy = 32 + y * 6;
    disc(c, cx, cy, 2, '#100C14'); disc(c, cx, cy, 1, '#C7975F'); rect(c, cx, cy, 1, 1, '#8F5F37');
  }
  rect(c, 131, 21, 29, 4, '#100C14'); rect(c, 132, 22, 28, 2, '#6F4527'); rect(c, 131, 20, 29, 1, '#FFFFFF');
}
function lena(recipe, base, k, say) {
  const N = 6, X0 = 60, X1 = 108, LY = 46;          // por dónde va el hacha y la altura del tronco
  const win = Math.max(3, 4 + k.ancho * 30);          // media marca buena, en píxeles
  const nudos = new Set();
  while (nudos.size < (k.nivel >= 0.5 ? 2 : 1)) nudos.add(1 + Math.floor(Math.random() * (N - 1)));
  const s = { i: 0, ax: X0, dir: 1, speed: 0, mark: 0, golpes: 0, nudo: false, marks: [], waited: 0, anim: 0, cae: null, sigue: false, piezas: [], pila: 0, t: 0, win, grieta: null };
  const marca = () => 70 + Math.random() * 28;
  const tronco = () => {
    Object.assign(s, { mark: marca(), golpes: 0, nudo: nudos.has(s.i), waited: 0, grieta: null });
    s.ax = Math.random() < 0.5 ? X0 : X1; s.dir = s.ax === X0 ? 1 : -1;
    s.speed = (32 + 10 * Math.random()) * (1 + 0.2 * k.nivel) * (1 + 0.06 * s.i);
    if (s.i === 3) say('Se me está escarchando la calva. ¡Charizard, arrímate un poco!');
  };
  tronco();
  const BIEN = ['¡Zas! A la primera.', '¡Leña! Así se parte, sí señor.', 'Limpio, limpio. Como mi calva.'];
  return {
    hint: 'Toca cuando el hacha pase por la marca del tronco',
    state: s,
    update(dt, t, { taps }) {
      s.t += dt;
      for (const p of s.piezas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 170 * dt; }
      s.piezas = s.piezas.filter(p => p.y < 72);
      if (s.anim > 0) {
        s.anim -= dt;
        if (s.anim <= 0) {
          s.cae = null;
          if (s.sigue) {
            s.sigue = false; s.i += 1;
            if (s.i >= N) {
              const n = j => s.marks.filter(m => m === j).length;
              return { acierto: n('good') / N, hot: n('hot'), cold: n('cold') };
            }
            tronco();
          }
        }
        return null;
      }
      s.waited += dt;
      s.ax += s.dir * s.speed * (k.shaky ? 1 + 0.4 * Math.sin(t / 160) : 1) * dt;
      if (s.ax >= X1 || s.ax <= X0) {
        s.ax = clamp(s.ax, X0, X1); s.dir *= -1;
        if (k.nivel >= 0.5) s.speed = (28 + 24 * Math.random()) * k.vel * (1 + 0.1 * s.i);   // a trompicones
      }
      // si no se da ningún golpe en un rato, el tronco se queda sin partir
      if (!taps.length && s.waited < 3.5) return null;
      const good = taps.length > 0 && Math.abs(s.ax - s.mark) <= win;
      s.cae = { x: s.ax, good };
      s.anim = 0.45;
      if (good && s.nudo && s.golpes === 0) {
        // el tronco con nudo pide otro golpe seguido, en una marca nueva
        s.golpes = 1; s.grieta = s.mark; s.mark = marca(); s.waited = 0; s.speed *= 1.2; s.anim = 0.3;
        say('¡Tiene nudo! Otro golpe, en la marca nueva.');
        return null;
      }
      const j = good ? 'good' : taps.length ? 'hot' : 'cold';
      s.marks.push(j); s.sigue = true;
      if (good) {
        s.pila += 1;
        s.piezas.push({ x: s.mark - 12, y: LY - 3, vx: -45, vy: -60 }, { x: s.mark + 2, y: LY - 3, vx: 45, vy: -60 });
        say(BIEN[s.pila % BIEN.length]);
      } else if (j === 'hot') say(s.golpes ? 'El nudo ha podido con el hacha. Ese, a medias.' : '¡Al lado! Se ha quedado clavada en la corteza.');
      else say('Charizard propone quemar el pino de la entrada. Total, ya está calcinado.', 'charizard', 'Happy');
      return null;
    },
    draw(c, t) {
      // el tocón, con su capita de nieve
      rect(c, 70, 53, 32, 13, '#100C14'); rect(c, 71, 54, 30, 11, '#7F4F2F'); rect(c, 71, 54, 30, 2, '#C7975F');
      for (const x of [75, 82, 90, 97]) rect(c, x, 57, 1, 7, '#5F3F27');
      // el tronco tumbado (si no se acaba de partir)
      if (!(s.cae?.good && s.sigue)) {
        rect(c, 62, LY - 5, 48, 10, '#100C14'); rect(c, 63, LY - 4, 46, 8, '#8F5F37');
        for (let x = 66; x < 106; x += 5) rect(c, x, LY - 3 + (x % 2) * 3, 3, 1, '#6F4527');
        for (const x of [63, 106]) { rect(c, x, LY - 4, 3, 8, '#E7C78F'); rect(c, x + 1, LY - 2, 1, 3, '#B7834F'); }
        rect(c, 64, LY - 6, 44, 1, '#FFFFFF');
        if (s.nudo) { disc(c, 86, LY, 2, '#4F2F1F'); rect(c, 86, LY, 1, 1, '#2F1F17'); }
        if (s.grieta != null) rect(c, Math.round(s.grieta), LY - 4, 1, 8, '#2F1F17');
        // la marca de tiza donde hay que dar, y lo que vale (parpadea)
        rect(c, Math.round(s.mark), LY - 4, 1, 8, '#F4EFE6');
        if (Math.floor(t / 250) % 2) rect(c, Math.round(s.mark - win), LY + 6, Math.round(win * 2) + 1, 1, '#FFF7BF');
      }
      for (const p of s.piezas) { rect(c, p.x, p.y, 11, 7, '#100C14'); rect(c, p.x + 1, p.y + 1, 9, 5, '#8F5F37'); rect(c, p.x + 1, p.y + 1, 2, 5, '#E7C78F'); }
      // el hacha: arriba mientras va y viene; clavada al caer
      const x = Math.round(s.cae ? s.cae.x : s.ax);
      const hy = s.cae ? LY - 10 : LY - 24;
      // mango de madera, con la cabeza abajo: el ojo, la cuña que se abre hacia la derecha y el filo brillante
      rect(c, x - 1, hy - 15, 3, 22, '#100C14'); rect(c, x, hy - 14, 1, 20, '#B7834F');
      rect(c, x - 3, hy, 3, 4, '#100C14'); rect(c, x - 2, hy + 1, 1, 2, '#6F6A77');
      for (let i = 0; i < 6; i++) {
        const alto = 4 + Math.round(i * 0.9), y0 = hy + 2 - Math.floor(alto / 2);
        rect(c, x + 1 + i, y0 - 1, 1, alto + 2, '#100C14');
        rect(c, x + 1 + i, y0, 1, alto, i > 3 ? '#EFF7FF' : '#9F9AA7');
      }
      rect(c, x + 7, hy - 3, 1, 10, '#100C14');
      rect(c, x + 1, hy + 1, 3, 1, '#C7C2CF');
      if (s.cae && !s.cae.good) for (let i = 0; i < 3; i++) rect(c, x - 4 + i * 4, hy - 2 - i, 1, 1, '#E7C78F');
      // la leña ya partida, en un montón junto a Charizard
      for (let i = 0; i < s.pila; i++) { const px = 38 + (i % 3) * 8, py = 69 - Math.floor(i / 3) * 4; rect(c, px, py, 8, 4, '#100C14'); rect(c, px + 1, py + 1, 6, 2, '#C7975F'); }
      // Manolo, con la calva cada vez más escarchada
      pinta(c, k.spr.manolo, 122, 68, t, DIR.downLeft);
      for (let i = 0; i < Math.min(6, Math.floor(s.t / 2)); i++) rect(c, 118 + (i * 3) % 8, 41 + (i % 2), 1, 1, '#FFFFFF');
      pips(c, [...s.marks, ...Array(N - s.marks.length).fill(null)], s.marks.length, 71);
      copos(c, t);
    },
    sound: () => 0,
  };
}

// ----- 2. Las velas del apagón -----
function fondoTormenta(c, t) {
  for (let y = 0; y < H; y += 4) rect(c, 0, y, W, 4, mix('#0F1226', '#2A2F4A', y / H));
  montes(c, 68, '#171A2F');
  rect(c, 0, 68, W, 12, '#1F1A17');
  for (let i = 0; i < 46; i++) { const x = (i * 41 + t / 7) % (W + 20) - 10, y = (i * 23 + t / 3) % H; rect(c, x, y, 1, 3, '#4F5F8F'); }
}
function velas(recipe, base, k, say) {
  const HX = 38, RW = 38, FY = [38, 66], FH = 26;
  const d = recipe.datos || {};
  const paciencia = (1.5 + (d.luz ? 0.9 : 0)) / k.vel;     // cuánto aguanta una vela apagada sin que se note
  const NF = 6 + Math.round(2 * k.nivel);                  // relámpagos
  const ocupadas = new Set([...Array(6).keys()].sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.min(6, d.n ?? 4))));
  const cuartos = [...Array(6)].map((_, i) => {
    const rx = HX + (i % 3) * RW, fy = FY[Math.floor(i / 3)];
    return { i, rx, fy, cx: rx + 6, cy: fy - 3, lit: true, dark: 0, fallo: false, cama: ocupadas.has(i), despierto: 0, chispa: 0 };
  });
  const s = { t: 0, rayos: 0, next: 1.2, flash: 0, bolt: 0, total: 0, good: 0, miss: 0, woken: 0, cuartos, paciencia };
  return {
    hint: 'Toca las velas apagadas · a los que duermen, ni tocarlos',
    state: s,
    update(dt, t, { taps }) {
      s.t += dt; s.flash = Math.max(0, s.flash - dt);
      for (const r of cuartos) { r.despierto = Math.max(0, r.despierto - dt); r.chispa = Math.max(0, r.chispa - dt); }
      s.next -= dt;
      if (s.next <= 0 && s.rayos < NF) {
        s.rayos += 1; s.flash = 0.18; s.bolt = HX + 10 + Math.random() * 100;
        const encendidas = cuartos.filter(r => r.lit).sort(() => Math.random() - 0.5);
        const n = 1 + (k.nivel >= 0.4 && Math.random() < 0.5 ? 1 : 0);
        for (const r of encendidas.slice(0, n)) { r.lit = false; r.dark = 0; r.fallo = false; s.total += 1; }
        s.next = (1.6 + Math.random() * 0.9) / k.vel;
      }
      for (const r of cuartos) if (!r.lit) {
        r.dark += dt;
        if (!r.fallo && r.dark > paciencia) { r.fallo = true; s.miss += 1; say('¡Esa vela! Que se despierta alguien a oscuras.'); }
      }
      for (const p of taps) {
        if (!p) continue;
        const vela = cuartos.find(r => Math.abs(p.x - r.cx) <= 6 && p.y >= r.cy - 11 && p.y <= r.cy + 4);
        if (vela) {
          if (!vela.lit) { vela.lit = true; vela.chispa = 0.3; if (!vela.fallo) s.good += 1; }
          continue;
        }
        const cama = cuartos.find(r => r.cama && p.x >= r.rx + 14 && p.x <= r.rx + 35 && p.y >= r.fy - 13 && p.y <= r.fy);
        if (cama && !cama.despierto) { cama.despierto = 1.2; s.woken += 1; say('¡Shh! A los que duermen, ni tocarlos.'); }
      }
      const resueltas = cuartos.every(r => r.lit || r.fallo);
      if ((s.rayos >= NF && resueltas && s.next < 0.6) || s.t > 30) {
        return { acierto: s.good / Math.max(1, s.total) - s.woken * 0.15, hot: s.miss + s.woken, cold: 0 };
      }
      return null;
    },
    draw(c, t) {
      // la casa en corte: tejado, dos plantas de tres cuartos
      for (let i = 0; i < 7; i++) rect(c, HX - 5 + i * 3, 11 - i, RW * 3 + 10 - i * 6, 1, i ? '#3F2A2F' : '#100C14');
      rect(c, HX - 2, 11, RW * 3 + 4, 57, '#100C14');
      for (const r of cuartos) {
        rect(c, r.rx, r.fy - FH, RW - 1, FH, r.lit ? '#9F774F' : '#1F2440');
        if (r.lit) { rect(c, r.cx - 5, r.cy - 12, 11, 13, '#C79F67'); rect(c, r.cx - 3, r.cy - 10, 7, 9, '#E7BF7F'); }
        // la cama y quien duerme en ella
        const bx = r.rx + 15;
        rect(c, bx, r.fy - 5, 19, 5, '#100C14'); rect(c, bx + 1, r.fy - 4, 17, 2, r.lit ? '#C7577F' : '#5F2F4F');
        rect(c, bx + 1, r.fy - 7, 5, 2, r.lit ? '#F4EFE6' : '#7F7F9F');
        if (r.cama) {
          const sube = r.despierto ? 2 : 0;
          disc(c, bx + 4, r.fy - 7 - sube, 2, r.lit ? '#E7A77F' : '#6F5F7F');
          rect(c, bx + 6, r.fy - 6, 10, 2, r.lit ? '#A73F5F' : '#4F2F4F');
          if (r.despierto) { rect(c, bx + 4, r.fy - 17, 1, 4, '#E2653F'); rect(c, bx + 4, r.fy - 12, 1, 1, '#E2653F'); }
          else { const zy = r.fy - 12 - Math.floor((t / 400 + r.i) % 3); rect(c, bx + 8, zy, 3, 1, '#F4EFE6'); rect(c, bx + 9, zy + 1, 1, 1, '#F4EFE6'); rect(c, bx + 8, zy + 2, 3, 1, '#F4EFE6'); }
        }
        // la vela: encendida, o humeando y avisando de que hay que tocarla
        rect(c, r.cx - 2, r.cy + 1, 5, 1, '#9F9AA7');
        rect(c, r.cx - 1, r.cy - 4, 3, 5, '#100C14'); rect(c, r.cx, r.cy - 3, 1, 4, '#F4EFE6'); rect(c, r.cx, r.cy - 5, 1, 1, '#100C14');
        if (r.lit) { const f = Math.floor(t / 130 + r.i) % 2; rect(c, r.cx, r.cy - 8 - f, 1, 3, '#FFD27A'); rect(c, r.cx, r.cy - 6, 1, 1, '#FFB347'); }
        else {
          rect(c, r.cx, r.cy - 7 - Math.floor((t / 120) % 4), 1, 1, '#7F7F9F');
          if (Math.floor(t / 220) % 2) for (const [dx, dy] of [[-4, -4], [4, -4], [0, -10], [0, 3]]) rect(c, r.cx + dx, r.cy + dy, 1, 1, r.fallo ? '#E2653F' : '#FFF7BF');
        }
        if (r.chispa > 0) {   // la chispa de la cola de Charizard, que vuela hasta la vela
          const kk = 1 - r.chispa / 0.3;
          rect(c, lerp(26, r.cx, kk), lerp(52, r.cy - 7, kk) - Math.sin(kk * Math.PI) * 8, 2, 2, '#FFB347');
        }
      }
      for (const fy of FY) rect(c, HX - 2, fy, RW * 3 + 4, 2, '#4F2F1F');
      for (let i = 1; i < 3; i++) rect(c, HX + i * RW - 1, 12, 1, 56, '#100C14');
      // el relámpago
      if (s.flash > 0) {
        let x = s.bolt;
        for (let y = 0; y < 10; y += 2) { rect(c, x, y, 1, 2, '#FFFFFF'); x += Math.sin(y * 7 + s.bolt) > 0 ? 1 : -1; }
        c.globalAlpha = s.flash / 0.18 * 0.55; rect(c, 0, 0, W, H, '#E7EEFF'); c.globalAlpha = 1;
      }
      reloj(c, s.rayos / NF, 72, '#9FA7D7');
    },
    sound: () => 0,
  };
}

// ----- 3. Deseos en la lluvia de estrellas -----
function fondoEstrellas(c, t) {
  for (let y = 0; y < H; y += 4) rect(c, 0, y, W, 4, mix('#080A1F', '#2F2A5A', y / H));
  for (let i = 0; i < 44; i++) { const x = (i * 53 + 7) % W, y = (i * 29) % 54; if ((i + Math.floor(t / 600)) % 7) rect(c, x, y, 1, 1, i % 3 ? '#7F87B7' : '#F4EFE6'); }
  montes(c, 66, '#14152B');
  rect(c, 0, 66, W, 14, '#0F0E1A');
  pino(c, 148, 68, 34);
  // los huéspedes, en el prado mirando al cielo (siluetas)
  for (const [x, r] of [[64, 4], [75, 3], [88, 5], [102, 3], [114, 4]]) { disc(c, x, 70 - r * 2, r, '#07060D'); rect(c, x - r, 70 - r, r * 2 + 1, r + 2, '#07060D'); }
}
function estrellas(recipe, base, k, say) {
  const N = 10, CHIS = 6;                       // diez estrellas y, tras la sexta, la chistorra fugaz
  const s = { t: 0, salidas: 0, next: 0.6, list: [], chisSalida: false, caught: 0, chis: false, chisFuera: false, brillos: [] };
  const sale = chistorra => {
    const v = k.vel * (chistorra ? 1.45 : 1 + 0.03 * s.salidas);
    s.list.push({ x: 60 + Math.random() * 110, y: -6 + Math.random() * 18, vx: -(52 + Math.random() * 22) * v, vy: (26 + Math.random() * 12) * v, chistorra });
  };
  const DESEOS = ['Pido… que no vuelva a entrar un Gyarados por esa puerta.', '¡Otra! Pido que me crezca algo de pelo. Aunque sea una ceja.', 'Pido que Famadesa no suba los precios.', '¡Deseo concedido! O eso dicen.'];
  return {
    hint: 'Toca las estrellas fugaces · ¡que no se escape la chistorra!',
    state: s,
    update(dt, t, { taps }) {
      s.t += dt;
      s.next -= dt;
      if (s.next <= 0 && s.salidas < N) {
        if (s.salidas === CHIS && !s.chisSalida) { s.chisSalida = true; sale(true); }
        else { sale(false); s.salidas += 1; }
        s.next = (1.0 + Math.random() * 0.5) / k.vel;
      }
      for (const e of s.list) { e.x += e.vx * dt; e.y += e.vy * dt; }
      for (const b of s.brillos) b.k -= dt;
      s.brillos = s.brillos.filter(b => b.k > 0);
      for (const p of taps) {
        if (!p) continue;
        const e = s.list.find(e => Math.hypot(e.x - p.x, e.y - p.y) <= (e.chistorra ? 11 : 9));
        if (!e) continue;
        e.fuera = true; s.brillos.push({ x: e.x, y: e.y, k: 0.4, oro: e.chistorra });
        if (e.chistorra) { s.chis = true; say('Charizard atrapa la chistorra fugaz al vuelo. Era su deseo, y se lo ha concedido él solito.', 'charizard', 'Happy'); }
        else { s.caught += 1; if (s.caught % 3 === 1) say(DESEOS[Math.floor(s.caught / 3) % DESEOS.length]); }
      }
      for (const e of s.list) if (!e.fuera && (e.x < -12 || e.y > 66)) {
        e.fuera = true;
        if (e.chistorra) { s.chisFuera = true; say('La chistorra fugaz se pierde tras el monte. Charizard se queda mirando el cielo, muy serio.', 'charizard', 'Sad'); }
      }
      s.list = s.list.filter(e => !e.fuera);
      if (s.salidas >= N && s.chisSalida && !s.list.length && !s.brillos.length) {
        return { acierto: s.caught / N * 0.75 + (s.chis ? 0.25 : 0), hot: 0, cold: N - s.caught, extra: { chistorra: s.chis } };
      }
      return null;
    },
    draw(c, t) {
      for (const e of s.list) {
        const n = Math.hypot(e.vx, e.vy), ux = -e.vx / n, uy = -e.vy / n;
        for (let i = 1; i < 10; i++) rect(c, e.x + ux * i * 1.6, e.y + uy * i * 1.6, 1, 1, e.chistorra ? (i % 2 ? '#FFD27A' : '#FFF7BF') : mix('#F4EFE6', '#2F2A5A', i / 10));
        if (e.chistorra) {
          rect(c, e.x - 4, e.y - 2, 9, 4, '#FFD27A'); rect(c, e.x - 3, e.y - 1, 7, 2, '#C73F2F'); rect(c, e.x - 2, e.y - 1, 2, 1, '#F7A7A7');
        } else { rect(c, e.x - 1, e.y - 1, 3, 3, '#FFF7BF'); rect(c, e.x, e.y, 1, 1, '#FFFFFF'); }
      }
      for (const b of s.brillos) {
        const r = Math.round((0.4 - b.k) * 18);
        for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) rect(c, b.x + dx, b.y + dy, 1, 1, b.oro ? '#FFD27A' : '#FFF7BF');
      }
      pips(c, [...Array(N)].map((_, i) => (i < s.caught ? 'good' : null)), -1, 71);
      rect(c, UI.x + N * 9 + 3, 71, 9, 7, '#100C14'); rect(c, UI.x + N * 9 + 4, 72, 7, 5, s.chis ? '#FFD27A' : s.chisFuera ? '#5F5A67' : '#7F2F2F');
    },
    sound: () => 0,
  };
}

// ----- 4. Una nube, un sombra: el café a la malagueña -----
// Cuánto café lleva el vaso de partida y hasta dónde va la leche (el tablero del Café Central de Málaga)
export const CAFES = { solo: { base: 0, meta: 0.6 }, corto: { base: 0.5, meta: 0.68 }, mitad: { base: 0.42, meta: 0.84 }, sombra: { base: 0.26, meta: 0.86 }, nube: { base: 0.12, meta: 0.88 } };
const ORDEN_CAFE = ['solo', 'corto', 'mitad', 'sombra', 'nube'];
const PIZARRA = [[9, 12], [21, 12], [33, 12], [15, 30], [27, 30]];
function fondoBarra(c) {
  rect(c, 0, 0, W, H, '#E7D3B0');
  for (let y = 36; y < 58; y += 6) for (let x = (y % 12 ? 4 : 0) - 4; x < W; x += 8) rect(c, x, y, 7, 5, '#D7BF97');
  rect(c, 0, 0, W, 4, '#4F2F1F');
  // la pizarra
  rect(c, 3, 6, 44, 44, '#6F4527'); rect(c, 5, 8, 40, 40, '#1F2F27');
  // la cafetera del bar y la estantería de tazas
  rect(c, 104, 12, 52, 2, '#6F4527');
  for (let i = 0; i < 6; i++) { rect(c, 106 + i * 8, 7, 6, 5, '#100C14'); rect(c, 107 + i * 8, 8, 4, 4, '#F4EFE6'); rect(c, 111 + i * 8, 9, 1, 2, '#100C14'); }
  rect(c, 112, 20, 30, 20, '#100C14'); rect(c, 113, 21, 28, 18, '#B7BFCF'); rect(c, 114, 22, 3, 16, '#EFF7FF'); rect(c, 120, 26, 14, 3, '#100C14'); rect(c, 125, 29, 4, 4, '#100C14');
}
function vasito(c, x, y, tipo, h = 11) {
  // un vaso pintado con tiza: café abajo y leche hasta la raya
  const { base: b, meta: m } = CAFES[tipo];
  const ih = h - 2;
  const cafe = tipo === 'solo' ? m : b;
  rect(c, x, y, 1, h, '#F4EFE6'); rect(c, x + 6, y, 1, h, '#F4EFE6'); rect(c, x, y + h - 1, 7, 1, '#F4EFE6');
  rect(c, x + 1, y + 1 + ih - Math.round(ih * m), 5, Math.round(ih * m) - Math.round(ih * cafe), '#E7D3B7');
  rect(c, x + 1, y + 1 + ih - Math.round(ih * cafe), 5, Math.round(ih * cafe), '#8F5F37');
  for (let i = 0; i < 3; i++) rect(c, x + i * 3 - 1, y + h + 2, 2, 1, '#C7C3D3');   // el nombre, en tiza
}
function cafe(recipe, base, k, say) {
  const d = recipe.datos || {};
  const otros = ORDEN_CAFE.filter(x => x !== d.tipo).sort(() => Math.random() - 0.5);
  const pedidos = [d.tipo && CAFES[d.tipo] ? d.tipo : otros.pop(), otros[0], otros[1]];
  const tol = Math.max(0.03, 0.055 + k.ancho * 0.5);
  const s = { i: 0, tipo: pedidos[0], level: 0, coffee: 0, poured: 0, t: 0, vt: 0, pausa: 0, marks: [], meta: 0, tol, derrame: false };
  const GL = { x: 82, top: 24, bot: 54 };    // el vaso: por dentro, 12 de ancho
  const vaso = () => {
    const c0 = CAFES[s.tipo];
    Object.assign(s, { meta: c0.meta, coffee: c0.base, level: c0.base, poured: 0, vt: 0, derrame: false });
    g.hint = `${s.i ? 'Para la barra' : `El de ${d.especie || 'tu cliente'}`}: un ${s.tipo}. Mantén pulsado y suelta en la raya`;
  };
  const juzga = j => {
    s.marks.push(j); s.pausa = 0.9;
    const n = s.tipo;
    say(j === 'good' ? (s.i ? `Un ${n} de pizarra. ¡Otro!` : `Un ${n} como Dios manda, de los del Café Central.`)
      : j === 'cold' ? (n === 'solo' ? 'Eso es un dedal, no un solo.' : 'Le falta leche: eso no llega ni a cortado.')
      : s.derrame ? '¡Que se sale! Leche por toda la barra.' : 'Te has pasado: eso ya es un manchado.');
  };
  const g = {
    hint: '',
    state: s,
    update(dt, t, { holding }) {
      s.t += dt;
      if (s.pausa > 0) {
        s.pausa -= dt;
        if (s.pausa <= 0) {
          s.i += 1;
          if (s.i >= 3) {
            const peso = [2, 1, 1], ok = s.marks.map((m, i) => (m === 'good' ? peso[i] : 0)).reduce((a, b) => a + b, 0);
            return { acierto: ok / 4, hot: s.marks.filter(m => m === 'hot').length, cold: s.marks.filter(m => m === 'cold').length, extra: { suyo: s.marks[0], tipo: pedidos[0] } };
          }
          s.tipo = pedidos[s.i]; vaso();
        }
        return null;
      }
      s.vt += dt;
      s.on = holding;
      if (holding) {
        // la leche sale a borbotones los últimos días
        const flujo = 0.22 * k.vel * (k.nivel >= 0.4 ? 1 + 0.45 * Math.sin(s.t * 4.3) : 1) * (k.shaky ? 1 + 0.3 * Math.sin(t / 90) : 1);
        s.level += flujo * dt; s.poured += flujo * dt;
        if (s.tipo === 'solo') s.coffee = s.level;
        if (s.level >= 1) { s.level = 1; s.derrame = true; juzga('hot'); }
      } else if (s.poured > 0.02) {
        const dif = s.level - s.meta;
        juzga(Math.abs(dif) <= tol ? 'good' : dif < 0 ? 'cold' : 'hot');
      }
      if (s.pausa <= 0 && s.vt > 6 / Math.sqrt(k.vel)) juzga(s.poured > 0.02 && Math.abs(s.level - s.meta) <= tol ? 'good' : 'cold');
      return null;
    },
    draw(c, t) {
      // la pizarra con los cinco cafés; el que toca, recuadrado
      for (const [i, tipo] of ORDEN_CAFE.entries()) {
        const [x, y] = PIZARRA[i];
        vasito(c, x, y, tipo);
        if (tipo === s.tipo && Math.floor(t / 300) % 2) { c.strokeStyle = '#FFD27A'; c.lineWidth = 1; c.strokeRect(x - 2.5, y - 2.5, 12, 19); }
      }
      // quien lo pide, al otro lado de la barra
      pinta(c, k.spr[d.sprite], 151, 66, t, DIR.left);   // (a la derecha de la cafetera, sin meterse debajo)
      rect(c, 0, 56, W, 2, '#B7834F'); rect(c, 0, 58, W, 22, '#6F4527');
      for (let x = 8; x < W; x += 24) rect(c, x, 62, 18, 14, '#5F3F27');
      // el plato, el vaso y lo que lleva dentro
      rect(c, GL.x - 6, GL.bot + 1, 25, 2, '#100C14'); rect(c, GL.x - 5, GL.bot + 1, 23, 1, '#F4EFE6');
      const h = GL.bot - GL.top, y = v => GL.bot - Math.round(h * v);
      rect(c, GL.x, y(s.level), 12, y(s.coffee) - y(s.level), '#E7CFAF');
      rect(c, GL.x, y(s.coffee), 12, GL.bot - y(s.coffee), '#3F1F10');
      if (s.level > s.coffee + 0.02) rect(c, GL.x, y(s.level), 12, 1, '#FFF7E7');
      rect(c, GL.x - 1, GL.top - 1, 1, h + 2, '#C7D7E7'); rect(c, GL.x + 12, GL.top - 1, 1, h + 2, '#C7D7E7'); rect(c, GL.x - 1, GL.bot, 14, 1, '#C7D7E7');
      rect(c, GL.x + 1, GL.top + 2, 1, h - 4, '#FFFFFF');
      // la raya: hasta aquí
      if (s.pausa <= 0 || Math.floor(t / 150) % 2) { rect(c, GL.x - 4, y(s.meta), 3, 1, '#C73F2F'); rect(c, GL.x + 14, y(s.meta), 3, 1, '#C73F2F'); }
      // la lechera (o la cafetera, para el solo) y el chorro
      const echando = s.pausa <= 0 && s.on;
      const jx = 96, jy = echando ? 8 : 4;
      if (s.tipo === 'solo') { rect(c, jx, jy, 10, 12, '#100C14'); rect(c, jx + 1, jy + 1, 8, 10, '#57576F'); rect(c, jx + 9, jy + 3, 3, 5, '#100C14'); rect(c, jx - 3, jy + 9, 4, 2, '#100C14'); }
      else { rect(c, jx, jy, 10, 12, '#100C14'); rect(c, jx + 1, jy + 1, 8, 10, '#B7BFCF'); rect(c, jx + 2, jy + 2, 2, 8, '#EFF7FF'); rect(c, jx + 10, jy + 3, 2, 6, '#100C14'); rect(c, jx - 3, jy + 9, 4, 2, '#100C14'); }
      if (echando) rect(c, GL.x + 10, jy + 11, 1, y(s.level) - jy - 11, s.tipo === 'solo' ? '#3F1F10' : '#F4EFE6');
      if (s.derrame) for (let i = 0; i < 5; i++) rect(c, GL.x - 4 + i * 5, GL.bot + 2 + (i % 2), 3, 1, '#F4EFE6');
      pips(c, [...s.marks, ...Array(3 - s.marks.length).fill(null)], s.marks.length, 64);
      if (s.pausa <= 0) reloj(c, s.vt / (6 / Math.sqrt(k.vel)), 74);
    },
    sound: () => 0,
  };
  vaso();
  return g;
}

// ----- 5. ¿Quién se come la chistorra? -----
function fondoDespensa(c) {
  rect(c, 0, 0, W, H, '#6F4F37');
  for (let x = 0; x < W; x += 10) rect(c, x, 0, 1, 64, '#5F3F2A');
  rect(c, 0, 64, W, 16, '#4F3527');
  for (const y of [26, 50]) { rect(c, 8, y, 144, 3, '#100C14'); rect(c, 8, y, 144, 2, '#B7834F'); }
  for (let i = 0; i < 9; i++) { const x = 13 + i * 16; rect(c, x, 17, 8, 9, '#100C14'); rect(c, x + 1, 18, 6, 8, ['#C7573F', '#E7B74F', '#6F9F4F'][i % 3]); rect(c, x + 1, 16, 6, 2, '#F4EFE6'); rect(c, x + 2, 20, 1, 4, '#FFF7BF'); }
  for (let i = 0; i < 5; i++) { const x = 17 + i * 26; rect(c, x, 38, 13, 12, '#100C14'); rect(c, x + 1, 39, 11, 11, '#C7A76F'); rect(c, x + 4, 37, 5, 2, '#8F6F3F'); rect(c, x + 3, 43, 7, 1, '#9F7F4F'); }
  rect(c, 16, 4, 128, 1, '#100C14');
  for (let i = 0; i < 9; i++) { rect(c, 20 + i * 15, 5, 3, 8, '#100C14'); rect(c, 21 + i * 15, 6, 1, 6, '#C73F2F'); }
  for (let i = 0; i < 4; i++) { rect(c, 30 + i * 30, 66, 14, 9, '#100C14'); rect(c, 31 + i * 30, 67, 12, 8, '#9F7F4F'); }
}
// la oscuridad con el círculo de la linterna (a tiras, para que quede pixelado)
function oscuro(c, bx, by, R) {
  for (let y = 0; y < H; y++) {
    const dy = y + 0.5 - by;
    const w = Math.abs(dy) < R ? Math.sqrt(R * R - dy * dy) : -1;
    const w2 = Math.abs(dy) < R + 3 ? Math.sqrt((R + 3) ** 2 - dy * dy) : -1;
    c.globalAlpha = 0.93;
    if (w2 < 0) rect(c, 0, y, W, 1, '#05040A');
    else { rect(c, 0, y, Math.max(0, bx - w2), 1, '#05040A'); rect(c, bx + w2, y, W, 1, '#05040A'); }
    c.globalAlpha = 0.5;
    if (w2 >= 0) {
      if (w < 0) rect(c, bx - w2, y, w2 * 2, 1, '#05040A');
      else { rect(c, bx - w2, y, w2 - w, 1, '#05040A'); rect(c, bx + w, y, w2 - w, 1, '#05040A'); }
    }
  }
  c.globalAlpha = 1;
}
function despensa(recipe, base, k, say) {
  const d = recipe.datos || {};
  const N = 4, R = Math.round(13 - 2 * k.nivel);
  const SPOTS = [[24, 12], [58, 10], [100, 12], [136, 11], [33, 34], [70, 33], [112, 35], [46, 58], [96, 59], [136, 57]];
  const need = (0.8 + 0.15 * k.nivel) * Math.sqrt(k.vel);  // segundos de luz encima para pillarlo
  const life = (3 - 0.3 * k.nivel) / k.vel;
  const s = { t: 0, bx: 80, by: 40, ojos: null, n: 0, caught: 0, espera: 0.8, prog: 0, flash: 0, fin: false, marks: [], R };
  const aparece = () => {
    const libres = SPOTS.filter(p => !s.ojos || p !== s.ojos.p);
    const p = libres[Math.floor(Math.random() * libres.length)];
    s.ojos = { p, x: p[0], y: p[1], vida: life, salto: k.nivel >= 0.5 };
    s.prog = 0; s.n += 1;
  };
  return {
    hint: 'Arrastra la linterna y deja la luz encima de los ojos',
    state: s,
    update(dt, t, { holding, pos }) {
      s.t += dt; s.flash = Math.max(0, s.flash - dt);
      // la linterna va donde el dedo; con la barra espaciadora, se arrima sola a los ojos
      if (holding && pos) { s.bx = clamp(pos.x, 0, W); s.by = clamp(pos.y, 0, H); }
      else if (holding && s.ojos) { s.bx += Math.sign(s.ojos.x - s.bx) * Math.min(Math.abs(s.ojos.x - s.bx), 40 * dt); s.by += Math.sign(s.ojos.y - s.by) * Math.min(Math.abs(s.ojos.y - s.by), 40 * dt); }
      if (!s.ojos) {
        s.espera -= dt;
        if (s.espera <= 0) {
          if (s.n >= N) {
            s.fin = s.caught * 2 >= N;
            return { acierto: s.caught / N, hot: N - s.caught, cold: 0, extra: { culpable: d.culpable || '0006' } };
          }
          aparece();
        }
        return null;
      }
      const o = s.ojos;
      o.vida -= dt;
      if (Math.hypot(o.x - s.bx, o.y - s.by) <= R - 3) s.prog += dt;
      else s.prog = Math.max(0, s.prog - dt * 0.5);
      // los últimos días, al notar la luz, se escabulle a otro escondite (una vez)
      if (o.salto && s.prog > need * 0.45) { o.salto = false; const p = SPOTS[(SPOTS.indexOf(o.p) + 3) % SPOTS.length]; Object.assign(o, { p, x: p[0], y: p[1] }); o.vida += 0.8; }
      if (s.prog >= need) {
        s.caught += 1; s.marks.push('good'); s.flash = 0.35; s.ojos = null; s.espera = 0.6;
        say(['¡Te vi! Ahí detrás de los tarros.', '¡Quieto ahí! ¿Eso que masticas qué es?', '¡Pillado otra vez!', '¡A la luz, ladronzuelo!'][s.caught - 1] || '¡Pillado!');
      } else if (o.vida <= 0) {
        s.marks.push('hot'); s.ojos = null; s.espera = 0.5;
        say('Se ha escabullido. Se oye masticar en la oscuridad…');
      }
      return null;
    },
    draw(c, t) {
      if (s.fin) {
        // ¡pillado!: se enciende la luz y ahí está, con la chistorra
        const a = k.spr[d.culpable || '0006'];
        pinta(c, a, 80, 72, t, DIR.down);
        // la chistorra en la boca (y, si es Charizard, los carrillos llenos)
        if ((d.culpable || '0006') === '0006') for (const x of [73, 87]) { disc(c, x, 50, 3, '#100C14'); disc(c, x, 50, 2, '#F08F3F'); rect(c, x - 1, 49, 1, 1, '#FFC79F'); }
        rect(c, 72, 52, 17, 4, '#100C14'); rect(c, 73, 53, 15, 2, '#C73F2F'); rect(c, 74, 53, 4, 1, '#F7A7A7'); rect(c, 88, 53, 2, 1, '#F4EFE6');
        return;
      }
      oscuro(c, s.bx, s.by, R);
      if (s.ojos) {
        const o = s.ojos, parpadeo = Math.floor((t + o.x * 37) / 1400) % 6 === 0;
        if (!parpadeo) { rect(c, o.x - 3, o.y, 2, 1, '#FFE74F'); rect(c, o.x + 2, o.y, 2, 1, '#FFE74F'); rect(c, o.x - 3, o.y - 1, 1, 1, '#FFF7BF'); rect(c, o.x + 2, o.y - 1, 1, 1, '#FFF7BF'); }
        // lo que falta para pillarlo, en un arquito encima
        if (s.prog > 0) rect(c, o.x - 5, o.y - 5, 11 * clamp(s.prog / need), 1, '#FFF7BF');
      }
      // el foco de la linterna
      rect(c, s.bx, s.by, 1, 1, '#FFF7BF');
      if (s.flash > 0) { c.globalAlpha = s.flash; rect(c, 0, 0, W, H, '#FFF7BF'); c.globalAlpha = 1; }
      pips(c, [...s.marks, ...Array(N - s.marks.length).fill(null)], s.marks.length, 72);
    },
    sound: () => 0,
  };
}

// ----- 6. La planta del Bulbasaur -----
function fondoCuarto(c) {
  rect(c, 0, 0, W, H, '#B7C78F');
  for (let x = 4; x < W; x += 8) rect(c, x, 0, 2, 66, '#A7B77F');
  rect(c, 0, 66, W, 14, '#8F5F37'); rect(c, 0, 66, W, 1, '#B7834F');
  for (let x = 6; x < W; x += 12) rect(c, x, 67, 1, 13, '#6F4527');
  // la ventana, con la carretera de noche
  rect(c, 11, 5, 64, 32, '#4F2F1F'); rect(c, 13, 7, 60, 28, '#1F2F5F');
  for (let i = 0; i < 9; i++) rect(c, 15 + (i * 23) % 56, 9 + (i * 7) % 10, 1, 1, '#9FA7D7');
  for (let x = 13; x < 73; x++) { const h = Math.round(5 + 3 * Math.sin(x / 7)); rect(c, x, 27 - h, 1, h, '#172347'); }
  rect(c, 13, 27, 60, 5, '#3F3F4F'); for (let x = 15; x < 73; x += 8) rect(c, x, 29, 4, 1, '#C7C3D3');
  rect(c, 13, 32, 60, 3, '#2F4F2F');
  rect(c, 42, 7, 2, 28, '#4F2F1F');
}
function planta(recipe, base, k, say) {
  const d = recipe.datos || {};
  const luz = d.modo === 'linterna', legal = !!d.legal;
  const INTENTOS = 3, RIEGOS = 3, T = 12;          // tres intentos; en cada uno, tres riegos antes de que se acabe el tiempo
  const RIEGO = 0.7, PASA = 1.3 / k.vel, CARCEL = 2.4;
  // el coche de la agente Mara pasa cuando le da la gana: sin aviso y con huecos al azar, cortos (regar a lo loco
  // acaba en la trena), pero siempre más largos que un riego (quien espera a que pase, riega a salvo)
  const hueco = () => 1.25 + Math.random() * 1.6 / k.vel;
  const s = { t: 0, riegos: 0, riego: 0, coche: null, prox: 0.4 + Math.random() * 1.4, carcel: 0, presos: 0,
    marks: [], gotas: [], saludo: false };
  const nuevoIntento = () => { s.t = 0; s.riegos = 0; s.riego = 0; s.coche = null; s.prox = 0.4 + Math.random() * 1.4; s.gotas = []; };
  return {
    hint: luz ? 'Toca para dar luz a la planta · que no te vea la agente Mara' : 'Toca para regar · que no te vea la agente Mara',
    state: s,
    update(dt, t, { taps }) {
      // a la trena: Bulbasaur entre rejas y, si quedan intentos, se vuelve a empezar
      if (s.carcel > 0) {
        s.carcel -= dt;
        if (s.carcel > 0) return null;
        if (s.presos >= INTENTOS) return { acierto: 0, hot: 3, cold: 0, extra: { pillado: true, legal, fianzas: INTENTOS - 1 } };   // (las dos fianzas de antes también se pagan)
        nuevoIntento();
        say(s.presos === 1 ? 'Fianza pagada: cinco monedas. Otra vez, y ahora con más disimulo.' : 'Otras cinco de fianza. Último intento: como nos vuelva a ver, ya no hay fianza que valga.');
        return null;
      }
      if (s.coche == null) s.t += dt;   // mientras pasa el coche, el reloj espera
      // el coche: aparece, cruza la ventana y se va
      if (s.coche == null) { s.prox -= dt; if (s.prox <= 0) s.coche = 0; }
      else { s.coche += dt; if (s.coche >= PASA) { s.coche = null; s.prox = hueco(); } }
      if (taps.length && s.riego <= 0 && s.riegos < RIEGOS) s.riego = RIEGO;
      if (s.riego > 0) {
        if (!luz && Math.random() < 0.7) s.gotas.push({ x: 102 + Math.random() * 4, y: 34, vy: 20 });
        if (s.coche != null) {
          if (legal) {
            if (!s.saludo) { s.saludo = true; say('La agente Mara pasa, frena y saluda: «¡Qué flor más bonita!». Hoy no hay nada que esconder.'); }
          } else {
            s.presos += 1; s.marks.push('hot'); s.carcel = CARCEL; s.riego = 0; s.gotas = [];
            say(luz ? '¡La agente Mara! Ha visto la luz desde la carretera. Bulbasaur, a la trena.' : '¡La agente Mara! Lo ha visto todo desde la carretera. Bulbasaur, a la trena.');
            return null;
          }
        }
        s.riego -= dt;
        if (s.riego <= 0 && ++s.riegos >= RIEGOS) {
          s.marks.push('good');
          return { acierto: s.presos === 0 ? 1 : s.presos === 1 ? 0.5 : 0.35, hot: s.presos, cold: 0, extra: { pillado: false, legal, fianzas: s.presos } };
        }
      }
      for (const g of s.gotas) { g.y += g.vy * dt; g.vy += 140 * dt; }
      s.gotas = s.gotas.filter(g => g.y < 58);
      if (s.t >= T) {
        say('Se ha ido la tarde y la planta, a medio regar.');
        return { acierto: s.riegos * 0.04, hot: 0, cold: 1, extra: { pillado: false, legal, seca: true } };
      }
      return null;
    },
    draw(c, t) {
      if (s.carcel > 0) return celda(c, t, k.spr[d.sprite || '0001'], 1 - s.carcel / CARCEL);
      // el coche de la agente Mara por la carretera (dentro de la ventana)
      c.save(); c.beginPath(); c.rect(13, 7, 60, 28); c.clip();
      if (s.coche != null) {
        const x = Math.round(lerp(-5, 75, s.coche / PASA));
        rect(c, x, 23, 16, 6, '#100C14'); rect(c, x + 1, 24, 14, 4, '#F4EFE6'); rect(c, x + 4, 21, 8, 3, '#100C14'); rect(c, x + 5, 22, 6, 2, '#4F8FDF');
        const az = Math.floor(t / 120) % 2;
        rect(c, x + 6, 20, 2, 1, az ? '#4F8FDF' : '#C73F2F'); rect(c, x + 8, 20, 2, 1, az ? '#C73F2F' : '#4F8FDF');
        rect(c, x + 2, 28, 3, 2, '#100C14'); rect(c, x + 11, 28, 3, 2, '#100C14');
      }
      c.restore();
      // Bulbasaur, que vigila de reojo
      pinta(c, k.spr[d.sprite || '0001'], 70, 74, t, DIR.right);
      // la maceta, la tierra (más oscura cuanto más regada) y la planta, que se endereza con cada riego
      const px = 104, v = s.riegos / RIEGOS;
      rect(c, px - 9, 58, 19, 12, '#100C14'); rect(c, px - 8, 59, 17, 10, '#C7673F'); rect(c, px - 9, 57, 19, 3, '#100C14'); rect(c, px - 8, 58, 17, 1, '#D7774F');
      rect(c, px - 7, 59, 15, 1, mix('#7F5F3F', '#2F1F17', v));
      const hoja = v < 0.34 ? '#A7A74F' : '#6F9F4F', luzHoja = v < 0.34 ? '#C7C76F' : '#A7D76F';
      const caida = v < 0.34 ? 2 : v < 0.67 ? 1 : 0;
      for (const [sx, top] of [[-4, 44], [0, 40], [4, 45]]) {
        rect(c, px + sx, top + caida, 1, 58 - top - caida, '#3F6F3F');
        for (const dy of [0, 4, 8]) { rect(c, px + sx - 3, top + dy + caida + (sx < 0 ? 1 : 0), 3, 2, hoja); rect(c, px + sx + 1, top + dy + 2 + caida, 3, 2, hoja); rect(c, px + sx - 2, top + dy + caida, 1, 1, luzHoja); }
      }
      if (legal) { disc(c, px, 38, 3, '#F7A7C7'); disc(c, px, 38, 1, '#E2577F'); }
      // la regadera (inclinada mientras riega) o la linterna (encendida)
      const on = s.riego > 0;
      if (luz) {
        rect(c, 118, 28, 12, 5, '#100C14'); rect(c, 119, 29, 10, 3, '#57576F'); rect(c, 116, 27, 3, 7, '#100C14'); rect(c, 117, 28, 1, 5, on ? '#FFF7BF' : '#9F9AA7');
        if (on) { c.globalAlpha = 0.35; for (let y = 30; y < 58; y++) { const w = (y - 30) * 0.5 + 1; rect(c, lerp(116, px, (y - 30) / 28) - w, y, w * 2, 1, '#FFF7BF'); } c.globalAlpha = 1; }
      } else {
        const dy = on ? 4 : 0;
        rect(c, 112, 28 + dy, 13, 9, '#100C14'); rect(c, 113, 29 + dy, 11, 7, '#4F8F5F'); rect(c, 114, 30 + dy, 2, 5, '#7FBF8F');
        rect(c, 115, 24 + dy, 7, 1, '#100C14'); rect(c, 114, 25 + dy, 1, 3, '#100C14'); rect(c, 122, 25 + dy, 1, 3, '#100C14');
        for (let i = 0; i < 6; i++) rect(c, 111 - i, 34 + dy - i, 2, 1, '#100C14');
        rect(c, 103, 26 + dy, 3, 4, '#100C14'); rect(c, 104, 27 + dy, 1, 2, '#7FBF8F');
        for (const g of s.gotas) rect(c, g.x, g.y, 1, 2, '#9FD7FF');
      }
      // los riegos que lleva (gotas azules) y los intentos (rojo: a la trena)
      for (let i = 0; i < RIEGOS; i++) { rect(c, 96 + i * 6, 72, 5, 5, '#100C14'); rect(c, 97 + i * 6, 73, 3, 3, i < s.riegos ? '#4F8FDF' : '#5F5A67'); }
      pips(c, [...s.marks, ...Array(INTENTOS - s.marks.length).fill(null)], s.marks.length, 71);
      reloj(c, s.t / T, 74);
    },
    sound: () => 0,
  };
}
// Bulbasaur entre rejas, con su cartel de preso, mientras la sirena da vueltas
function celda(c, t, spr, f) {
  rect(c, 0, 0, W, H, '#4F4A57');
  for (let y = 0; y < 66; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < W; x += 12) rect(c, x, y, 11, 5, '#5F5A67');
  rect(c, 0, 66, W, 14, '#37333F'); rect(c, 0, 66, W, 1, '#2A2730');
  // ventanuco con rejas y el catre
  rect(c, 112, 10, 20, 12, '#100C14'); rect(c, 113, 11, 18, 10, '#1F2F5F'); for (let x = 116; x < 132; x += 4) rect(c, x, 11, 1, 10, '#100C14');
  rect(c, 112, 56, 36, 4, '#100C14'); rect(c, 113, 56, 34, 2, '#8F5F37'); rect(c, 114, 60, 2, 6, '#100C14'); rect(c, 144, 60, 2, 6, '#100C14');
  // el preso y, en la pared, su cartel con el número
  pinta(c, spr, 80, 72, t, DIR.down);
  rect(c, 72, 40, 16, 7, '#100C14'); rect(c, 73, 41, 14, 5, '#F4EFE6');
  for (let i = 0; i < 4; i++) rect(c, 75 + i * 3, 42, 2, 3, '#100C14');
  rect(c, 79, 37, 2, 3, '#100C14');
  // la sirena que entra por la puerta y los barrotes, que caen al principio
  if (Math.floor(t / 160) % 2) { c.globalAlpha = 0.18; rect(c, 0, 0, W, H, Math.floor(t / 320) % 2 ? '#4F8FDF' : '#C73F2F'); c.globalAlpha = 1; }
  const baja = Math.round(Math.min(1, f * 4) * 70) - 70;
  for (let x = 56; x <= 104; x += 6) { rect(c, x, baja, 2, 70, '#100C14'); rect(c, x, baja, 1, 70, '#9F9AA7'); }
  rect(c, 54, baja + 6, 54, 2, '#100C14'); rect(c, 54, baja + 50, 54, 2, '#100C14');
}

// ----- 7. El Tetris de maletas -----
function fondoRecepcion(c) {
  rect(c, 0, 0, W, H, '#E7C79F');
  for (let x = 0; x < W; x += 16) rect(c, x, 0, 8, 40, '#DFBF93');
  rect(c, 0, 40, W, 26, '#B7834F'); for (let x = 0; x < W; x += 12) rect(c, x, 40, 1, 26, '#9F6A3F');
  rect(c, 0, 40, W, 1, '#6F4527');
  rect(c, 0, 66, 110, 3, '#100C14'); rect(c, 0, 66, 110, 2, '#8F5F37');
  // la escalera que baja a la recepción
  for (let i = 0; i < 6; i++) { rect(c, 108 + i * 9, 66 + i * 4, 9, 4, '#100C14'); rect(c, 108 + i * 9, 66 + i * 4, 9, 2, '#9F6A3F'); }
  rect(c, 108, 52, 1, 14, '#4F2F1F'); for (let i = 0; i < 6; i++) rect(c, 112 + i * 9, 54 + i * 4, 1, 12, '#4F2F1F');
  rect(c, 108, 52, 54, 1, '#4F2F1F');
  // el cuadro del gimnasio
  rect(c, 12, 10, 18, 14, '#100C14'); rect(c, 13, 11, 16, 12, '#C73F2F'); rect(c, 18, 14, 6, 6, '#FFB347');
}
function maletas(recipe, base, k, say) {
  const N = 6, CART = { x: 80, y: 64 }, HANG = 34;   // la maleta cuelga a esta altura
  const COLS = ['#C73F2F', '#4F8FDF', '#6F9F4F', '#E7B74F', '#8F4FAF', '#B7834F'];
  const s = { i: 0, ph: Math.random() * 6, cx: 80, w: 0, h: 0, col: '#C73F2F', cae: null, pila: [], fuera: [], marks: [], vt: 0, topX: CART.x, topW: 34, topY: CART.y, pausa: 0 };
  s.cx = 80 + 42 * Math.sin(s.ph);   // donde está Charizard desde el primer fotograma
  const nueva = () => { Object.assign(s, { w: 14 + Math.round(Math.random() * 8), h: 4 + (Math.random() < 0.5 ? 1 : 0), col: COLS[s.i % COLS.length], vt: 0 }); };
  nueva();
  const suelta = () => { s.cae = { x: s.cx, y: HANG, vy: 0 }; };
  return {
    hint: 'Toca para soltar la maleta encima de la pila',
    state: s,
    update(dt, t, { taps }) {
      // Charizard va y viene por el rellano con la maleta colgada de la cola
      const w = (1.5 + 0.08 * s.i) * (1 + 0.2 * k.nivel) * (k.nivel >= 0.5 ? 1 + 0.2 * Math.sin(t / 700) : 1);
      if (!s.cae) s.ph += w * dt * (k.shaky ? 1 + 0.4 * Math.sin(t / 150) : 1);
      s.cx = 80 + 42 * Math.sin(s.ph);
      if (k.chari) { k.chari.x = s.cx - 4; k.chari.y = 24; }
      for (const f of s.fuera) { f.x += 40 * dt; f.vy += 200 * dt; f.y += f.vy * dt; if (f.y > 66 + (f.x - 108) / 9 * 4 && f.x > 108) { f.y = 66 + (f.x - 108) / 9 * 4; f.vy = -30; } }
      s.fuera = s.fuera.filter(f => f.x < W + 20);
      if (s.pausa > 0) {
        s.pausa -= dt;
        if (s.pausa <= 0) {
          s.i += 1;
          if (s.i >= N) {
            const n = j => s.marks.filter(m => m === j).length;
            const ac = (n('good') + 0.4 * n('cold')) / N;
            return { acierto: n('hot') ? Math.min(ac, 0.5) : ac, hot: n('hot'), cold: n('cold') };
          }
          nueva();
        }
        return null;
      }
      if (!s.cae) {
        s.vt += dt;
        // si no se toca, Charizard se harta y la suelta donde caiga (y se va rodando)
        if (taps.length || s.vt > 5) { suelta(); s.cae.sola = !taps.length; }
        return null;
      }
      s.cae.vy += 260 * dt; s.cae.y += s.cae.vy * dt;
      if (s.cae.y + s.h >= s.topY) {
        const off = s.cae.x - s.topX;
        if (s.cae.sola || Math.abs(off) > s.topW / 2 - 1) {
          s.marks.push('hot'); s.fuera.push({ x: s.cae.x, y: s.topY - s.h, vy: -40, w: s.w, h: s.h, col: s.col });
          say(['¡Escaleras abajo! Esa ya no sube.', '¡Otra que se va rodando!', 'Charizard mira la maleta bajar la escalera. Ni se inmuta.'][s.marks.filter(m => m === 'hot').length % 3], s.marks.length % 2 ? 'manolo' : 'charizard');
        } else {
          const j = Math.abs(off) <= 4 + k.ancho * 40 ? 'good' : 'cold';
          s.marks.push(j);
          s.pila.push({ x: s.cae.x, y: s.topY - s.h, w: s.w, h: s.h, col: s.col });
          s.topX = s.cae.x; s.topW = s.w; s.topY -= s.h;
          if (j === 'cold') say('Torcida, pero aguanta. Como yo.');
          else if (s.pila.length === 3) say('¡Encaja como en el Tetris! Venga, otra.');
        }
        s.cae = null; s.pausa = 0.5;
      }
      return null;
    },
    draw(c, t) {
      const maleta = (x, y, w, h, col) => {
        x = Math.round(x - w / 2); y = Math.round(y);
        rect(c, x, y, w, h, '#100C14'); rect(c, x + 1, y + 1, w - 2, h - 2, col);
        rect(c, x + 1, y + 1, w - 2, 1, mix(col, '#FFFFFF', 0.35)); rect(c, x + 3, y + 1, 1, h - 2, mix(col, '#100C14', 0.4)); rect(c, x + w - 4, y + 1, 1, h - 2, mix(col, '#100C14', 0.4));
        rect(c, x + w / 2 - 2, y - 2, 4, 2, '#100C14');
      };
      // el carrito de las maletas
      rect(c, CART.x - 18, CART.y, 36, 3, '#100C14'); rect(c, CART.x - 17, CART.y, 34, 1, '#C7C3D3');
      for (const x of [CART.x - 14, CART.x + 12]) disc(c, x, CART.y + 3, 1, '#100C14');
      for (const m of s.pila) maleta(m.x, m.y, m.w, m.h, m.col);
      for (const f of s.fuera) maleta(f.x, f.y, f.w, f.h, f.col);
      // la que cuelga de la cola de Charizard (o la que cae)
      if (s.pausa <= 0) {
        const mx = s.cae ? s.cae.x : s.cx, my = s.cae ? s.cae.y : HANG;
        // la cuerda, de la punta de la cola al asa
        if (!s.cae) { const n = 10; for (let i = 0; i <= n; i++) rect(c, lerp(s.cx + 9, s.cx, i / n), lerp(20, HANG - 2, i / n), 1, 1, '#4F2F1F'); }
        maleta(mx, my, s.w, s.h, s.col);
      }
      pips(c, [...s.marks, ...Array(N - s.marks.length).fill(null)], s.marks.length, 72);
      if (!s.cae && s.pausa <= 0) reloj(c, s.vt / 5, 70);
    },
    sound: () => 0,
  };
}

// ----- 8. Abrir el camino -----
function fondoCamino(c) {
  for (let y = 0; y < 40; y += 4) rect(c, 0, y, W, 4, mix('#A7B7CF', '#E7EEF7', y / 40));
  montes(c, 40, '#C7D3E3', '#FFFFFF');
  rect(c, 0, 44, W, 22, '#4F4A57'); for (let x = 4; x < W; x += 12) rect(c, x, 55, 6, 1, '#C7C3D3');
  rect(c, 0, 66, W, 14, '#E7EEF7'); rect(c, 0, 66, W, 1, '#9FAFC7'); rect(c, 0, 43, W, 1, '#9FAFC7');
  rect(c, 0, 34, W, 9, '#E7EEF7');
  // los hitos de la cuneta, blancos y negros, marcan por dónde va la carretera
  for (let x = 40; x < W; x += 20) for (const y of [38, 67]) { rect(c, x, y, 2, 6, '#100C14'); rect(c, x, y + 1, 2, 2, '#F4F7FF'); }
  pino(c, 6, 44, 30, true);
}
function camino(recipe, base, k, say) {
  const X0 = 44, X1 = 156, Y0 = 44, Y1 = 66, CS = 4;
  const cells = [];
  for (let y = Y0; y < Y1; y += CS) for (let x = X0; x < X1; x += CS) cells.push({ x, y, hp: 1 });
  const lejos = (a, b) => Math.abs(a - b) > 26;
  let mx = 60 + Math.random() * 80, cx;
  do cx = 60 + Math.random() * 84; while (!lejos(mx, cx));
  const T = 15 / Math.sqrt(k.vel);
  const s = { t: 0, cells, muneco: { x: Math.round(mx), y: 38, m: 0 }, cartel: { x: Math.round(cx), y: 74, b: 0 }, fx: null, fy: null, vapor: [], cleared: 0, avisoM: false, avisoC: false };
  const BOCA = { x: 30, y: 46 };
  return {
    hint: 'Mantén pulsado y arrastra el fuego por la nieve · ¡ojo con el muñeco y el cartel!',
    state: s,
    update(dt, t, { holding, pos }) {
      s.t += dt;
      for (const v of s.vapor) { v.y -= 12 * dt; v.k -= dt; }
      s.vapor = s.vapor.filter(v => v.k > 0);
      if (holding) {
        // con la barra espaciadora, el chorro barre solo la carretera en zigzag
        const p = pos || { x: X0 + ((s.t * 30) % (X1 - X0)), y: Y0 + 2 + Math.abs(((s.t * 9) % 36) - 18) };
        s.fx = p.x; s.fy = p.y;
        for (const ce of cells) if (ce.hp > 0 && Math.hypot(ce.x + 2 - p.x, ce.y + 2 - p.y) <= 7) {
          ce.hp -= 2.4 * dt;
          if (Math.random() < 0.08) s.vapor.push({ x: ce.x + 2, y: ce.y, k: 0.6 });
        }
        const m = s.muneco, ca = s.cartel;
        if (m.m < 1 && Math.hypot(p.x - m.x, p.y - m.y) <= 9) { m.m += 1.6 * dt; if (m.m >= 1 && !s.avisoM) { s.avisoM = true; say('¡El muñeco de nieve! Lo habían hecho los huéspedes… Ya solo queda la zanahoria.'); } }
        if (ca.b < 1 && Math.hypot(p.x - ca.x, p.y - ca.y) <= 9) { ca.b += 1.6 * dt; if (ca.b >= 1 && !s.avisoC) { s.avisoC = true; say('¡El cartel! Ahora sí que pone El Pino Calcinado, y bien calcinado.'); } }
      } else { s.fx = null; }
      s.cleared = cells.filter(ce => ce.hp <= 0).length / cells.length;
      if (s.cleared >= 0.98 || s.t >= T) {
        const mu = s.muneco.m >= 1, ca = s.cartel.b >= 1;
        return { acierto: clamp((s.cleared - 0.35) / 0.55) - (mu ? 0.35 : 0) - (ca ? 0.25 : 0), hot: (mu ? 1 : 0) + (ca ? 1 : 0), cold: 1 - s.cleared, extra: { muneco: mu, cartel: ca } };
      }
      return null;
    },
    draw(c, t) {
      for (const ce of cells) {
        if (ce.hp <= 0) { if ((ce.x + ce.y) % 12 === 0) rect(c, ce.x + 1, ce.y + 1, 2, 1, '#6F6A87'); continue; }
        rect(c, ce.x, ce.y, CS, CS, ce.hp > 0.5 ? '#FFFFFF' : '#B7C3D7');
        if (ce.hp > 0.5 && (ce.x * 7 + ce.y) % 5 === 0) rect(c, ce.x + 1, ce.y + 1, 1, 1, '#C7D7EF');
      }
      // el muñeco de nieve de los huéspedes (se va encogiendo si le da el fuego)
      const m = s.muneco, enc = Math.round(clamp(m.m) * 5);
      if (m.m < 1) {
        disc(c, m.x, m.y + 2 + enc, 4 - Math.min(2, enc), '#100C14'); disc(c, m.x, m.y + 2 + enc, 3 - Math.min(2, enc), '#FFFFFF');
        if (enc < 4) { disc(c, m.x, m.y - 4 + enc, 2, '#100C14'); rect(c, m.x - 1, m.y - 5 + enc, 3, 2, '#FFFFFF'); rect(c, m.x + 1, m.y - 4 + enc, 2, 1, '#F08F3F'); rect(c, m.x - 2, m.y - 8 + enc, 5, 2, '#100C14'); }
      } else { rect(c, m.x - 3, m.y + 5, 7, 1, '#9FD7FF'); rect(c, m.x, m.y + 4, 2, 1, '#F08F3F'); }
      // el cartel de la posada
      const ca = s.cartel, quemado = ca.b >= 1;
      rect(c, ca.x, ca.y - 2, 1, 6, '#4F2F1F');
      rect(c, ca.x - 8, ca.y - 8, 17, 7, '#100C14'); rect(c, ca.x - 7, ca.y - 7, 15, 5, mix('#C7975F', '#2F1F17', clamp(ca.b)));
      if (!quemado) { rect(c, ca.x - 5, ca.y - 5, 8, 1, '#4F2F1F'); rect(c, ca.x + 3, ca.y - 6, 1, 3, '#4F2F1F'); rect(c, ca.x + 4, ca.y - 5, 1, 1, '#4F2F1F'); }
      // el chorro de fuego de Charizard hasta el dedo
      if (s.fx != null) {
        const n = Math.ceil(Math.hypot(s.fx - BOCA.x, s.fy - BOCA.y) / 2);
        for (let i = 0; i <= n; i++) {
          const kk = i / n, j = Math.sin(t / 40 + i) * 1.5 * kk;
          rect(c, lerp(BOCA.x, s.fx, kk), lerp(BOCA.y, s.fy, kk) + j, 2, 2, i % 3 ? '#FFB347' : '#E2653F');
        }
        disc(c, Math.round(s.fx), Math.round(s.fy), 4, '#E2653F'); disc(c, Math.round(s.fx), Math.round(s.fy), 2, '#FFD27A');
      }
      for (const v of s.vapor) rect(c, v.x, v.y, 1, 1, '#FFFFFF');
      reloj(c, s.t / T, 78, '#C73F2F');
      rect(c, UI.x, 76, UI.w * s.cleared, 1, '#6F9F4F');
      copos(c, t, 14);
    },
    sound: () => (s.fx != null ? 0.7 : 0),
  };
}

// ----- 9. El punto del termal -----
export const PUNTOS = { templado: [0.3, 0.52], caliente: [0.52, 0.74], hirviendo: [0.76, 0.94] };
function fondoTermal(c) {
  for (let y = 0; y < 50; y += 4) rect(c, 0, y, W, 4, mix('#8F6F9F', '#F7B77F', y / 50));
  montes(c, 50, '#6F5F7F');
  rect(c, 0, 48, W, 32, '#7F7A77');
  for (let i = 0; i < 14; i++) { const x = (i * 29) % W, y = 52 + (i * 13) % 26; rect(c, x, y, 5, 2, '#6F6A67'); rect(c, x, y, 5, 1, '#9F9A97'); }
  pino(c, 150, 50, 30);
}
function termal(recipe, base, k, say) {
  const d = recipe.datos || {};
  const [plo, phi] = PUNTOS[d.punto] || PUNTOS.caliente;
  const DUR = 11 / Math.sqrt(k.vel);
  const psy = d.psyduck ? { t0: DUR * (0.38 + Math.random() * 0.15), dur: 2.6 / Math.sqrt(k.vel) } : null;
  const s = { t: 0, f: 0.15, good: 0, total: 0, hot: 0, cold: 0, psyAhora: false, avisado: false, lo: 0, hi: 0 };
  const zona = () => {
    if (psy && s.t >= psy.t0 && s.t <= psy.t0 + psy.dur) return [0, 0.22 + k.ancho];
    return [plo - k.ancho, phi + k.ancho];
  };
  return {
    hint: `Mantén pulsado: más fuego · suelta: se enfría. Lo quiere ${d.punto || 'caliente'}`,
    state: s,
    update(dt, t, { holding }) {
      s.t += dt;
      s.f += (holding ? 0.5 : -0.36) * k.vel * dt;
      s.f += Math.sin(t / 260) * (k.shaky ? 0.3 : 0.05) * dt;
      s.f = clamp(s.f);
      if (holding) s.calentado = true;
      const [lo, hi] = zona();
      s.lo = lo; s.hi = hi;
      const ahora = !!psy && s.t >= psy.t0 && s.t <= psy.t0 + psy.dur;
      if (ahora && !s.avisado) { s.avisado = true; say('¡Un Psyduck en el termal! Se me cierra el ojo… ¡Baja el fuego, baja!', 'manolo', 'Surprised'); }
      if (!ahora && s.psyAhora) say('Ya se ha ido el Psyduck. ¡Otra vez a su punto!');
      s.psyAhora = ahora;
      // tras el primer segundo (y medio segundo de reacción cuando entra o sale el pato) cuenta el punto
      const reaccion = psy && (Math.abs(s.t - psy.t0) < 0.5 || Math.abs(s.t - psy.t0 - psy.dur) < 0.5);
      if (s.t > 1 && !reaccion) {
        s.total += dt;
        const bien = s.f >= lo && s.f <= hi;
        if (bien) s.good += dt; else if (s.f > hi) s.hot += dt; else s.cold += dt;
        if (s.psyAhora) { s.psyT = (s.psyT || 0) + dt; if (bien) s.psyBien = (s.psyBien || 0) + dt; }
      }
      // (sin encender el fuego ni una vez no hay baño que valga)
      if (s.t >= DUR) {
        let ac = s.calentado ? s.good / Math.max(0.01, s.total) : 0;
        // si se coció al Psyduck, como mucho «bien»
        if (s.psyT > 0.3 && (s.psyBien || 0) / s.psyT < 0.6) ac = Math.min(ac, 0.45);
        return { acierto: ac, hot: s.hot, cold: s.cold };
      }
      return null;
    },
    draw(c, t) {
      const PX0 = 40, PX1 = 124, WY = 53;
      // la poza de piedra
      rect(c, PX0 - 3, WY - 3, PX1 - PX0 + 6, 18, '#100C14'); rect(c, PX0 - 2, WY - 2, PX1 - PX0 + 4, 16, '#5F5A67');
      const agua = mix('#4F8FDF', '#E2653F', s.f);
      rect(c, PX0, WY, PX1 - PX0, 12, mix(agua, '#100C14', 0.25));
      // quien se baña (y el Psyduck que se cuela), metidos hasta el pecho
      pinta(c, k.spr[d.sprite || '0074'], 80, 63, t, DIR.down);
      if (s.psyAhora) pinta(c, k.spr['0054'], 112, 63, t, DIR.downLeft);
      c.globalAlpha = 0.85; rect(c, PX0, WY + 4, PX1 - PX0, 9, agua); c.globalAlpha = 1;
      rect(c, PX0, WY + 3, PX1 - PX0, 1, mix(agua, '#FFFFFF', 0.4));
      for (let x = PX0 - 3; x < PX1 + 3; x += 6) { rect(c, x, WY + 12, 6, 4, '#100C14'); rect(c, x + 1, WY + 12, 4, 3, x % 12 ? '#7F7A77' : '#9F9A97'); }
      // el vapor, según lo caliente que esté
      for (let i = 0; i < Math.round(s.f * 10); i++) rect(c, PX0 + 6 + (i * 17) % 76, WY - 3 - ((t / (90 - s.f * 40) + i * 5) % 14), 1, 2, '#F4EFE6');
      // el horno de piedra donde sopla Charizard
      rect(c, 26, 54, 12, 14, '#100C14'); rect(c, 27, 55, 10, 12, '#6F6A67'); rect(c, 29, 61, 6, 5, '#100C14');
      if (s.f > 0.05) flameShape(c, 32, 66, s.f * 0.4, t, k.shaky);
      meter(c, s.f, s.lo, s.hi, t, { low: '#4F8FDF', good: '#FFB347', high: '#C73F2F' });
      reloj(c, s.t / DUR, 74);
    },
    sound: () => 0.2 + s.f * 0.5,
  };
}

// Dónde pasa cada minijuego nuevo: el fondo, Charizard (o nadie) y los sprites que hacen falta
const ESCENA = {
  lena: { fondo: fondoNieve, chari: { x: 24, y: 70, dir: DIR.right }, ui: { x: 104, w: 54 }, spr: () => ['manolo'] },
  velas: { fondo: fondoTormenta, chari: { x: 15, y: 79, dir: DIR.right }, ui: { x: 38, w: 114 } },
  estrellas: { fondo: fondoEstrellas, chari: { x: 32, y: 84, dir: DIR.up }, ui: { x: 40, w: 100 } },
  cafe: { fondo: fondoBarra, chari: null, ui: { x: 52, w: 60 }, spr: d => [d.sprite || '0122'] },
  despensa: { fondo: fondoDespensa, chari: null, ui: { x: 62, w: 40 }, spr: d => [d.culpable || '0006'] },
  planta: { fondo: fondoCuarto, chari: null, ui: { x: 6, w: 60 }, spr: d => [d.sprite || '0001'] },
  maletas: { fondo: fondoRecepcion, chari: { x: 76, y: 24, dir: DIR.down }, ui: { x: 6, w: 54 } },
  camino: { fondo: fondoCamino, chari: { x: 18, y: 64, dir: DIR.right }, ui: { x: 46, w: 108 } },
  termal: { fondo: fondoTermal, chari: { x: 14, y: 72, dir: DIR.right }, ui: { x: 40, w: 84 }, spr: d => [d.sprite || '0074', '0054'] },
};

const GAMES = { llama, vuelta, miel, setas, espeton, potaje, pizza, emplatar, limpiar, rocket, kebab,
  lena, velas, estrellas, cafe, despensa, planta, maletas, camino, termal };
// qué hay que hacer en cada uno, para la cuenta atrás
const COMO = {
  llama: 'Mantén pulsado para más fuego y suelta para bajarlo.',
  vuelta: 'Toca cuando la raya pase por el verde del medio.',
  miel: 'Mantén pulsado cuando el tarro esté sobre la tostada.',
  setas: 'Toca cuando la seta pase bajo el cuchillo.',
  espeton: 'Toca para girar la baya; mantén pulsado para sacarla.',
  potaje: 'Toca solo lo que va en la olla.',
  kebab: 'Mantén pulsado y pasa el cortador por lo dorado.',
  pizza: 'Amasa, estira y pon los ingredientes.',
  emplatar: 'Arrastra cada cosa a su sitio en la tarta.',
  limpiar: 'Toca las manchas antes de que llegue el inspector.',
  rocket: 'Toca las sombras de la ventana para espantarlas.',
  lena: 'Toca cuando el hacha pase por la marca del tronco.',
  velas: 'Toca las velas apagadas. ¡A los que duermen, no!',
  estrellas: 'Toca las estrellas fugaces (y la chistorra dorada).',
  cafe: 'Mantén pulsado para echar y suelta en la raya.',
  despensa: 'Arrastra la linterna y deja la luz sobre los ojos.',
  planta: 'Toca para regar, pero que no te vea la agente Mara.',
  maletas: 'Toca para soltar la maleta encima de la pila.',
  camino: 'Mantén pulsado y arrastra el fuego por la nieve.',
  termal: 'Mantén pulsado para calentar y suelta para enfriar.',
};
// los de preparar: Charizard mira desde un lado en vez de hacer de fogón debajo
const PREP = new Set(['setas', 'potaje', 'pizza', 'emplatar', 'limpiar', 'rocket', 'kebab']);

export function createKitchen(canvas) {
  const c = canvas.getContext('2d');
  const hint = canvas.parentElement.querySelector('.kitchen-hint');
  let chari = null, running = false, holding = false, taps = [], pos = null, session = 0, game = null;
  let pendiente = null;   // cómo cerrar el cocinado en curso si otro lo pisa

  // cada toque nuevo se apunta con su posición en el lienzo (null si es la barra espaciadora)
  function press(on, p = null) {
    if (on && !holding) taps.push(p);
    holding = on;
  }
  const toCanvas = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); pos = toCanvas(e); press(true, pos); });
  canvas.addEventListener('pointermove', e => { pos = toCanvas(e); });
  window.addEventListener('pointerup', () => press(false));
  window.addEventListener('keydown', e => { if (e.code === 'Space' && running) { e.preventDefault(); if (!e.repeat) { pos = null; press(true); } } });
  window.addEventListener('keyup', e => { if (e.code === 'Space') press(false); });

  function resize() {
    // hueco libre: hasta donde empieza el cuadro de diálogo (medido, que su alto cambia con el texto)
    const parent = canvas.parentElement, cs = getComputedStyle(parent);
    const extra = (hint?.offsetHeight || 0) + 6;   // y la línea de ayuda
    const dlg = document.querySelector('.actions .dialog');
    const libre = dlg?.offsetHeight ? dlg.getBoundingClientRect().top - parent.getBoundingClientRect().top : parent.clientHeight - parseFloat(cs.paddingBottom);
    const box = { width: parent.clientWidth - 16, height: libre - 16 - extra };
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(box.width * dpr / W, box.height * dpr / H);
    const S = Math.max(1, fit >= 2 ? Math.floor(fit * 4) / 4 : Math.floor(fit));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    canvas.style.width = `${W * S / dpr}px`;
    canvas.style.height = `${H * S / dpr}px`;
  }
  window.addEventListener('resize', () => running && resize());

  function countdownOverlay(n) {
    c.fillStyle = '#100C14'; c.globalAlpha = 0.35; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    const D = { 1: ['.X.', 'XX.', '.X.', '.X.', 'XXX'], 2: ['XX.', '..X', '.X.', 'X..', 'XXX'], 3: ['XX.', '..X', '.X.', '..X', 'XX.'] }[n];
    if (D) D.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') rect(c, 58 + x * 6, 22 + y * 6, 6, 6, '#FFB347'); }));
  }

  // Cocina una receta con su minijuego. moral: 0-10 de Charizard; nivel: 0-1 según los días.
  // onStep(paso) avisa de lo que dice Manolo en cada momento.
  async function cook(recipe, { moral = 5, apoyo = false, nivel = 0, onStep = () => {} } = {}) {
    // la especialidad: el mismo juego, más rápido, más exigente y con sus giros desde el principio
    if (recipe.especial) nivel = Math.min(1, nivel + 0.5);
    const base = await loadRecipes();
    const cs = await loadSprite('0006', ['Idle']);
    // en los de fuego Charizard hace de fogón, debajo; en los de preparar mira desde la izquierda
    const prep = PREP.has(recipe.juego);
    // los de los sucesos y encargos tienen su escenario; en las setas el puchero está a la izquierda
    // (Charizard se pone debajo del puchero)
    const esc = ESCENA[recipe.juego];
    const datos = recipe.datos || {};
    chari = esc ? (esc.chari ? new Actor(cs, { ...esc.chari }) : null)
      : recipe.juego === 'setas' ? new Actor(cs, { x: 24, y: 83, dir: DIR.up })
      : prep ? new Actor(cs, { x: 19, y: 72, dir: DIR.downRight }) : new Actor(cs, { x: CX, y: 81, dir: DIR.up });
    Object.assign(UI, esc?.ui || (prep ? { x: 34, w: 92 } : { x: 6, w: 44 }));
    // los sprites que salen además de Charizard (Manolo, el huésped, el Psyduck que se cuela…)
    const spr = {};
    for (const id of esc?.spr?.(datos) || []) {
      try { spr[id] = new Actor(await loadSprite(id, ['Idle']), {}); } catch (err) { console.warn('[cocina]', err); }
    }
    const fondo = esc?.fondo || kitchenBack;
    const shaky = moral <= 3 && !apoyo;
    const docil = moral >= 7;
    // ventanas: el fogón de apoyo y Charizard contento las ensanchan; los días las estrechan
    const k = { nivel, shaky, docil, ancho: (apoyo ? 0.05 : 0) + (docil ? 0.04 : 0) - 0.04 * nivel,
      vel: 1 + 0.35 * nivel, grace: GRACE - 0.3 * nivel, chari, spr };
    // (who y emo: quién lo dice, si no es Manolo, y con qué cara)
    const say = (texto, who, emo) => onStep({ texto, who, emo });
    game = null;
    const make = () => { const g = (GAMES[recipe.juego] || llama)(recipe, base, k, say); g.juego = recipe.juego || 'llama'; return g; };
    // durante la cuenta atrás ya se explica qué hay que hacer (en corto)
    const como = recipe.juego === 'planta' && recipe.datos?.modo === 'linterna' ? 'Toca para dar luz, pero que no te vea la agente Mara.' : COMO[recipe.juego] || COMO.llama;
    if (hint) hint.textContent = `¡Preparados…! ${como}`;
    let shown = null;
    resize();
    running = true; holding = false; taps = []; pos = null;
    pendiente?.();
    const token = (session += 1);
    return new Promise(resolve => {
      pendiente = () => resolve(grade({ acierto: 0, hot: 0, cold: 1 }));
      let last = null, countdown = 2.4, result = null;
      // un fallo en un fotograma se apunta y se sigue: si no, la cocina se quedaba colgada
      function frame(t) {
        if (!running || session !== token) return;
        try { step(t); } catch (err) { console.error('[cocina]', err); }
        requestAnimationFrame(frame);
      }
      function step(t) {
        const dt = last == null ? 0 : Math.min(0.05, (t - last) / 1000);
        last = t;
        if (countdown > 0) {
          countdown -= dt;
          if (countdown <= 0) { game = make(); taps = []; }
        } else if (game && !result) {
          const input = { holding, taps, pos };
          taps = [];
          const r = game.update(dt, t, input);
          if (r) { result = grade(r); setTimeout(() => { if (session === token) { running = false; sizzle(null); pendiente = null; } resolve(result); }, 900); }
        }
        if (game && hint && game.hint !== shown) { shown = game.hint; hint.textContent = shown; }
        sizzle(game ? game.sound() : 0);
        fondo(c, t);
        chari?.draw(c, t);
        if (game) game.draw(c, t);
        else countdownOverlay(Math.ceil(countdown / 0.8));
      }
      requestAnimationFrame(frame);
    });
  }

  // peek: el estado del minijuego en curso (para las pruebas)
  return { cook, stop() { running = false; }, peek: () => game && { ...game.state, juego: game.juego } };
}
