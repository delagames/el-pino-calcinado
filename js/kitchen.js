// Vista C: la cocina (sección 6 de DISEÑO.md). Charizard es el fogón y cada receta tiene
// su propio minijuego (campo «juego» de data/recipes.json), todos con un solo dedo:
// - llama:   mantener pulsado aviva el fuego; cada paso pide una zona (sopa de bayas).
// - vuelta:  la raya sube y baja; tocar cuando pasa por el medio para darle la vuelta a la chistorra.
// - miel:    el tarro va y viene; mantener pulsado para echar miel sobre el pan.
// - setas:   las setas pasan por la tabla; tocar cuando están bajo el cuchillo.
// - espeton: tocar para girar la baya; mantener pulsado para retirarla cuando esté hecha.
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
      if (b) recipesData.recipes[i] = { ...b, preferidos: [], ...r, especial: true };
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
  for (let x = 3; x < 130; x += 6) rect(c, x, 4, 1, 50, '#F7E7C7');
  rect(c, 0, 0, W, 4, '#4F2F1F');
  // campana de piedra del fogón
  rect(c, 34, 4, 66, 22, '#5F5A67');
  for (let y = 7; y < 26; y += 5) { rect(c, 34, y, 66, 1, '#100C14'); for (let x = 36 + (y % 2) * 4; x < 100; x += 9) rect(c, x, y + 1, 1, 4, '#100C14'); }
  rect(c, 30, 26, 74, 3, '#9F9AA7'); rect(c, 30, 29, 74, 1, '#100C14');
  // ristra de chistorras y estantería
  for (let i = 0; i < 4; i++) { rect(c, 108 + i * 6, 8, 3, 9, '#100C14'); rect(c, 109 + i * 6, 9, 1, 7, '#C73F2F'); }
  rect(c, 104, 7, 28, 1, '#4F2F1F');
  // suelo y zócalo
  rect(c, 0, 56, 130, 24, '#B7834F'); rect(c, 0, 55, 130, 1, '#CF9B63');
  for (let x = 5; x < 130; x += 6) rect(c, x, 56, 1, 24, '#8F6037');
  rect(c, 0, 72, 130, 8, '#9F6A3F'); rect(c, 0, 72, 130, 1, '#BF8757');
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
function pips(c, list, current) {
  list.forEach((p, i) => {
    const col = p === 'good' ? '#6F9F4F' : p === 'hot' ? '#C73F2F' : p === 'cold' ? '#9F9AA7' : i === current ? '#FFB347' : '#5F5A67';
    rect(c, UI.x + i * 9, 62, 7, 7, '#100C14'); rect(c, UI.x + 1 + i * 9, 63, 5, 5, col);
  });
}

function grade({ acierto, hot = 0, cold = 0 }) {
  acierto = clamp(acierto);
  const resultado = acierto >= 0.6 ? 'perfecto' : acierto >= 0.3 || cold >= hot ? 'bien' : 'quemado';
  return { resultado, acierto, crudo: resultado === 'bien' && acierto < 0.3 };
}

// ---------- los minijuegos ----------
// Cada uno: { hint, update(dt, t, input) → resultado o null, draw(c, t), sound() }.
// input = { holding, taps } (taps: pulsaciones nuevas en este fotograma).

// La llama: cada paso pide una zona del fuego durante unos segundos
function llama(recipe, base, k, say) {
  const zonas = Object.fromEntries(Object.entries(base.zonas).map(([n, [lo, hi]]) => [n, [lo - k.ancho, hi + k.ancho]]));
  const s = { f: 0.25, step: 0, stepT: 0, good: 0, total: 0, hot: 0, cold: 0, marks: recipe.pasos.map(() => null) };
  let stepGood = 0, stepTotal = 0;
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
        else if (s.f >= hi) s.hot += dt;
        else s.cold += dt;
      }
      s.stepT += dt;
      if (s.stepT >= paso.segundos / k.vel) {
        s.marks[s.step] = stepGood / Math.max(0.01, stepTotal) >= 0.5 ? 'good' : 'cold';
        stepGood = stepTotal = 0;
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
  const w = 0.12 + k.ancho;                      // media franja verde (más estrecha los últimos días)
  const lo = 0.5 - w, hi = 0.5 + w;
  const s = { sides: [0, 0], down: 0, flips: [], flipT: 0, pos: 0, dir: 1, speed: 0, waited: 0 };
  // la raya recorre la barra entera en ~0,8 s (y más deprisa con los días y con cada vuelta)
  const newSpeed = () => (1.15 + 0.3 * Math.random()) * k.vel * (1 + 0.1 * s.flips.length);
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
        const good = list.filter(m => m.cut === 'good').length;
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
  tomate: { art: ['..LGL..', '.LRRRL.', 'LRYrYRL', 'LRrRrRL', 'LRYrYRL', '.LRRRL.', '..LLL..'] },
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
  const malos = ['calcetin', 'pokeball', 'bota', 'magikarp'];
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
          if (ING[it.id].trampa) { s.bad += 1; say(`¡Eso es ${n}! Eso no va en el potaje…`); }
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
      rect(c, POT.x - 13, POT.y - 6, 26, 14, '#100C14'); rect(c, POT.x - 12, POT.y - 5, 24, 12, '#57576F');
      rect(c, POT.x - 11, POT.y - 5, 22, 3, s.bad ? '#7F7F4F' : '#C7873F');
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
        return { acierto: (amasar + estirar + poner) / 3, hot: (s.roto ? 1 : 0) + s.fuera + (s.estirado > R0 + 4 ? 1 : 0),
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
  const manchas = Array.from({ length: N }, (_, i) => ({ x: 20 + ((i * 37 + Math.random() * 20) % 110), y: 14 + ((i * 23 + Math.random() * 14) % 50), r: 3 + (i % 3), tipo: i % 3 ? 'ceniza' : 'grasa', ok: false, brillo: 0 }));
  const s = { t: 0, manchas };
  return {
    hint: 'Toca la ceniza y la grasa antes de que llegue el inspector',
    update(dt, t, { taps }) {
      s.t += dt;
      for (const m of manchas) m.brillo = Math.max(0, m.brillo - dt);
      for (const p of taps) {
        if (!p) continue;
        const m = manchas.filter(m => !m.ok).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (m && Math.hypot(m.x - p.x, m.y - p.y) <= m.r + 7) { m.ok = true; m.brillo = 0.5; }
      }
      const hechas = manchas.filter(m => m.ok).length;
      if (hechas === N || s.t > T) return { acierto: hechas / N, hot: 0, cold: N - hechas };
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
  const s = { t: 0, n: 0, sombra: null, espera: 0.8, bien: 0, mal: 0, susto: 0 };
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
        if (taps.some(p => !p || (Math.abs(p.x - (vx + 10)) < 16 && Math.abs(p.y - (vy + 14)) < 18))) { s.bien += 1; s.susto = 0.4; s.sombra = null; s.espera = 0.4 + Math.random() * 0.7; }
        else if (s.sombra.vida <= 0) { s.mal += 1; s.sombra = null; s.espera = 0.4 + Math.random() * 0.7; }
      }
      if (s.n >= N && !s.sombra) return { acierto: s.bien / N, hot: s.mal, cold: 0 };
      return null;
    },
    draw(c, t) {
      // de noche: la despensa a oscuras y tres ventanas con luna
      c.globalAlpha = 0.55; rect(c, 0, 0, W, H, '#100C24'); c.globalAlpha = 1;
      for (const [i, [x, y]] of VEN.entries()) {
        rect(c, x - 1, y - 1, 22, 30, '#100C14'); rect(c, x, y, 20, 28, '#1B2238');
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

const GAMES = { llama, vuelta, miel, setas, espeton, potaje, pizza, emplatar, limpiar, rocket };
// qué hay que hacer en cada uno, para la cuenta atrás
const COMO = {
  llama: 'Mantén pulsado para más fuego y suelta para bajarlo.',
  vuelta: 'Toca cuando la raya pase por el verde del medio.',
  miel: 'Mantén pulsado cuando el tarro esté sobre la tostada.',
  setas: 'Toca cuando la seta pase bajo el cuchillo.',
  espeton: 'Toca para girar la baya; mantén pulsado para sacarla.',
  potaje: 'Toca solo lo que va en el potaje.',
  pizza: 'Amasa, estira y pon los ingredientes.',
  emplatar: 'Arrastra cada cosa a su sitio en la tarta.',
  limpiar: 'Toca las manchas antes de que llegue el inspector.',
  rocket: 'Toca las sombras de la ventana para espantarlas.',
};
// los de preparar: Charizard mira desde un lado en vez de hacer de fogón debajo
const PREP = new Set(['setas', 'potaje', 'pizza', 'emplatar', 'limpiar', 'rocket']);

export function createKitchen(canvas) {
  const c = canvas.getContext('2d');
  const hint = canvas.parentElement.querySelector('.kitchen-hint');
  let chari = null, running = false, holding = false, taps = [], pos = null, session = 0, game = null;

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
    const S = Math.max(1, Math.floor(Math.min(box.width * dpr / W, box.height * dpr / H)));
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
    // en las setas el puchero está a la izquierda: Charizard se pone debajo del puchero
    chari = recipe.juego === 'setas' ? new Actor(cs, { x: 24, y: 83, dir: DIR.up })
      : prep ? new Actor(cs, { x: 14, y: 72, dir: DIR.downRight }) : new Actor(cs, { x: CX, y: 81, dir: DIR.up });
    Object.assign(UI, prep ? { x: 34, w: 92 } : { x: 6, w: 44 });
    const shaky = moral <= 3 && !apoyo;
    const docil = moral >= 7;
    // ventanas: el fogón de apoyo y Charizard contento las ensanchan; los días las estrechan
    const k = { nivel, shaky, docil, ancho: (apoyo ? 0.05 : 0) + (docil ? 0.04 : 0) - 0.04 * nivel,
      vel: 1 + 0.35 * nivel, grace: GRACE - 0.3 * nivel };
    const say = texto => onStep({ texto });
    game = null;
    const make = () => { const g = (GAMES[recipe.juego] || llama)(recipe, base, k, say); g.juego = recipe.juego || 'llama'; return g; };
    // durante la cuenta atrás ya se explica qué hay que hacer (en corto)
    if (hint) hint.textContent = `¡Preparados…! ${COMO[recipe.juego] || COMO.llama}`;
    let shown = null;
    resize();
    running = true; holding = false; taps = []; pos = null;
    const token = (session += 1);
    return new Promise(resolve => {
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
          if (r) { result = grade(r); setTimeout(() => { if (session === token) { running = false; sizzle(null); } resolve(result); }, 900); }
        }
        if (game && hint && game.hint !== shown) { shown = game.hint; hint.textContent = shown; }
        sizzle(game ? game.sound() : 0);
        kitchenBack(c);
        chari.draw(c, t);
        if (game) game.draw(c, t);
        else countdownOverlay(Math.ceil(countdown / 0.8));
      }
      requestAnimationFrame(frame);
    });
  }

  // peek: el estado del minijuego en curso (para las pruebas)
  return { cook, stop() { running = false; }, peek: () => game && { ...game.state, juego: game.juego } };
}
