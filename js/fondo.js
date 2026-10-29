// Las fotos de recuerdo (se compran en la tienda, en «Recuerdos»): momentos de la posada en pixel art para
// ponerlos de fondo de pantalla, a sangre (sin marco), en vertical para el móvil (1080×2336) o en horizontal
// para el ordenador (1920×1080). Solo llevan una firma pequeña en una esquina de abajo.
// Todo va a escala entera y sin suavizar: 1 píxel de dibujo = 4 de la foto; los sprites, a ×2 (8 de la foto).
// En el móvil, arriba va el reloj (ahí solo hay cielo) y abajo los iconos (ahí, suelo).
import { loadSprite, Actor, DIR } from './sprites.js';
import { rect, disc, pine } from './intro.js';

const MEDIDAS = { movil: [270, 584], ordenador: [480, 270] };   // en «píxeles de dibujo»
const FINAL = 4;                                                // 1 píxel de dibujo = 4 de la foto
const NEGRO = '#100C14', MARFIL = '#F4EFE6';

// ---------- piezas de dibujo ----------

function azar(semilla) {
  let s = semilla >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
// Un degradado por bandas, con la juntura tramada a cuadros (como en los juegos de 16 bits)
function degradado(c, x, y, w, h, cols) {
  const alto = h / cols.length;
  for (let i = 0; i < cols.length; i++) rect(c, x, y + Math.round(i * alto), w, Math.round((i + 1) * alto) - Math.round(i * alto), cols[i]);
  for (let i = 1; i < cols.length; i++) {
    const y0 = y + Math.round(i * alto);
    for (let px = 0; px < w; px++) {
      if (px % 4 === 0) rect(c, x + px, y0 - 3, 1, 1, cols[i]);
      if (px % 2 === 0) rect(c, x + px, y0 - 2, 1, 1, cols[i]);
      if (px % 4 !== 3) rect(c, x + px, y0 - 1, 1, 1, cols[i]);
      if (px % 2 === 1) rect(c, x + px, y0, 1, 1, cols[i - 1]);
      if (px % 4 === 2) rect(c, x + px, y0 + 1, 1, 1, cols[i - 1]);
    }
  }
}
// Una luz redonda: círculos casi transparentes, uno dentro de otro (anillos nítidos, sin difuminar)
function halo(c, cx, cy, r, col, a = 0.1, n = 4) {
  c.globalAlpha = a;
  for (let i = 0; i < n; i++) disc(c, cx, cy, Math.max(1, Math.round(r * (1 - i / n))), col);
  c.globalAlpha = 1;
}
function estrellas(c, w, h, n, semilla) {
  const r = azar(semilla);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h), v = r();
    rect(c, x, y, 1, 1, v < 0.2 ? '#FFF7BF' : v < 0.55 ? '#C7CDEF' : '#5F679F');
    // las más gordas, con su cruz de brillo
    if (v < 0.05) { rect(c, x - 2, y, 5, 1, '#6F77A7'); rect(c, x, y - 2, 1, 5, '#6F77A7'); rect(c, x - 1, y, 3, 1, '#C7CDEF'); rect(c, x, y - 1, 1, 3, '#C7CDEF'); rect(c, x, y, 1, 1, '#FFFFFF'); }
  }
}
// Una estrella fugaz con su estela
function fugaz(c, x, y, largo) {
  for (let i = 0; i < largo; i++) { c.globalAlpha = 1 - i / largo; rect(c, x + i, y - Math.round(i * 0.45), 1, 1, i < 3 ? '#FFFFFF' : '#C7CDEF'); }
  c.globalAlpha = 1;
}
// Una nube de píxeles: bolas blancas con la tripa en sombra
function nube(c, x, y, ancho, [luz, sombra, borde] = ['#FFFFFF', '#D7E3F3', '#B7C7DF']) {
  const r = azar(x * 7 + y);
  const bolas = [];
  for (let i = 0; i < Math.max(3, ancho / 9); i++) bolas.push([x + Math.round(r() * ancho), y - Math.round(r() * ancho * 0.18), 5 + Math.round(r() * ancho * 0.14)]);
  for (const [bx, by, br] of bolas) disc(c, bx, by + 1, br + 1, borde);
  for (const [bx, by, br] of bolas) disc(c, bx, by, br, sombra);
  for (const [bx, by, br] of bolas) disc(c, bx - 1, by - 2, br - 2, luz);
  rect(c, x - 4, y + 4, ancho + 8, 3, sombra); rect(c, x - 2, y + 7, ancho + 4, 1, borde);
}
// Montes al fondo, con el filo un poco más claro (y nieve en las cumbres, si se pide)
function montes(c, w, base, alto, col, semilla, { filo = null, nieve = null } = {}) {
  for (let x = 0; x < w; x++) {
    const hh = Math.round(alto * (0.6 + 0.4 * Math.sin(x / 26 + semilla) * Math.sin(x / 10 + semilla * 2)) + Math.sin(x / 3.1 + semilla) * 1.2);
    rect(c, x, base - hh, 1, 600, col);
    if (filo) rect(c, x, base - hh, 1, 1, filo);
    if (nieve && hh > alto * 0.62) rect(c, x, base - hh, 1, Math.round((hh - alto * 0.62) * 0.8) + 1, nieve);
  }
}
// Una fila de pinos lejanos, en silueta
function pinar(c, w, base, col, semilla, alto = 14) {
  const r = azar(semilla);
  for (let x = -4; x < w + 4; x += 5 + Math.floor(r() * 5)) {
    const a = Math.round(alto * (0.6 + r() * 0.5));
    for (let j = 0; j < a; j++) { const half = Math.floor(j / 2.4); rect(c, x - half, base - a + j, half * 2 + 1, 1, col); }
    rect(c, x, base, 1, 2, col);
  }
  rect(c, 0, base, w, 600, col);
}
// El suelo: el color, una franja de luz arriba, briznas, piedrecitas y (de día) florecillas
function suelo(c, w, y, h, { base, claro, oscuro, brizna, flores = null, semilla = 91 }) {
  rect(c, 0, y, w, h, base);
  for (let x = 0; x < w; x++) { rect(c, x, y, 1, 1, claro); if (x % 2) rect(c, x, y + 1, 1, 1, claro); if (x % 4 === 1) rect(c, x, y + 2, 1, 1, claro); }
  const r = azar(semilla);
  for (let i = 0; i < w * h / 14; i++) {
    const x = Math.floor(r() * w), yy = y + 3 + Math.floor(r() * (h - 3)), v = r();
    if (v < 0.5) { rect(c, x, yy, 1, 2, brizna); rect(c, x + 1, yy + 1, 1, 1, oscuro); }
    else if (v < 0.8) rect(c, x, yy, 1, 1, oscuro);
    else if (v < 0.9) { rect(c, x, yy, 3, 2, oscuro); rect(c, x, yy, 2, 1, claro); }   // una piedrecita
    else if (flores) { rect(c, x, yy, 1, 1, flores[i % flores.length]); rect(c, x, yy + 1, 1, 1, oscuro); }
  }
}
// El camino de tierra que baja de la puerta, más ancho cuanto más cerca, con su borde y sus chinas
function camino(c, cx, y0, y1, { col, borde, china }) {
  const r = azar(cx + y0);
  for (let y = y0; y < y1; y++) {
    const half = Math.round(11 + (y - y0) * 0.42);
    rect(c, cx - half, y, half * 2, 1, col);
    if (y % 2) { rect(c, cx - half - 1, y, 1, 1, borde); rect(c, cx + half, y, 1, 1, borde); }
    if (r() < 0.5) rect(c, cx - half + Math.floor(r() * half * 2), y, 1, 1, china);
  }
}

// Letras nítidas: la fuente (Jersey 10) va en una rejilla de 75 unidades y 1400 por em, así que a 18,67 px
// cada píxel de la letra cae justo en uno del lienzo (n = 2: el doble). Se escriben aparte y cada píxel
// queda lleno o vacío, sin suavizado. (y) es la línea de las letras. Devuelve el ancho.
const PX_LETRA = 1400 / 75;
function letras(c, s, x, y, { col = MARFIL, n = 1, align = 'left' } = {}) {
  const t = document.createElement('canvas'), g = t.getContext('2d');
  const size = PX_LETRA * n, fuente = `${size}px "Jersey 10", monospace`;
  g.font = fuente;
  const ancho = Math.round(g.measureText(s).width) + 2, alto = Math.ceil(size * 1.3);
  t.width = ancho; t.height = alto;
  g.font = fuente; g.fillStyle = col; g.textBaseline = 'alphabetic';
  const linea = Math.round(size);
  g.fillText(s, 1, linea);
  const im = g.getImageData(0, 0, ancho, alto);
  for (let i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] > 100 ? 255 : 0;
  g.putImageData(im, 0, 0);
  const dx = align === 'center' ? -Math.round(ancho / 2) : align === 'right' ? -ancho : 0;
  c.drawImage(t, Math.round(x) + dx, Math.round(y) - linea);
  return ancho;
}

// Un personaje (sprite de SpriteCollab) con los pies en (x, y), a escala entera: ×2, o ×1 si es enorme
// (Onix, Gyarados: a ×2 no caben). t: el instante de la animación (para pillar un paso a medias)
function pon(c, sprite, x, y, { dir = DIR.down, k = null, anim = 'Idle', sombra = true, t = 0 } = {}) {
  if (!sprite) return;
  const a = new Actor(sprite, { offset: 0 });
  a.place(0, 0, { dir, anim: sprite.anims[anim] ? anim : 'Idle' });
  a.sinSombra = !sombra;
  const e = k || escala(sprite);
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(e, e); a.draw(c, t); c.restore();
}
const escala = s => caja(s).alto > 56 ? 1 : 2;
// Lo que ocupa de verdad el primer fotograma (sin el hueco transparente): ancho y alto desde los pies
const cajas = new Map();
function caja(sprite, dir = DIR.down) {
  const key = `${sprite.id}:${dir}`;
  if (cajas.has(key)) return cajas.get(key);
  const a = sprite.anims.Idle;
  const t = document.createElement('canvas'); t.width = a.fw; t.height = a.fh;
  const g = t.getContext('2d', { willReadFrequently: true });
  g.drawImage(a.img, 0, Math.min(dir, a.rows - 1) * a.fh, a.fw, a.fh, 0, 0, a.fw, a.fh);
  const d = g.getImageData(0, 0, a.fw, a.fh).data;
  let x0 = a.fw, x1 = 0, y0 = a.fh;
  for (let y = 0; y < a.fh; y++) for (let x = 0; x < a.fw; x++) if (d[(y * a.fw + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
  // los pies quedan 6 px por debajo del centro del fotograma
  const r = { ancho: Math.max(4, x1 - x0 + 1), alto: Math.max(4, a.fh / 2 + 6 - y0) };
  cajas.set(key, r);
  return r;
}

// El pino calcinado (a ×2, como los personajes), con su brasa y su resplandor; con nieve si nieva
function pino(c, x, base, { nieve = false, noche = true } = {}) {
  if (noche) halo(c, x, base - 22, 22, '#E2653F', 0.07);
  c.save(); c.translate(x, base); c.scale(2, 2);
  pine(c, 0, 0, 0, { burnt: true });
  c.restore();
  // la corteza, cuarteada, y las ascuas de la brasa
  const r = azar(x);
  for (let j = 0; j < 50; j++) rect(c, x - 3 + Math.floor(r() * 7), base - 108 + Math.floor(r() * 100), 1, 2, r() < 0.5 ? '#1F2238' : '#05070F');
  rect(c, x - 1, base - 26, 3, 2, '#FFB347'); rect(c, x, base - 22, 1, 1, '#FFF7BF');
  if (nieve) for (let i = 0; i < 8; i++) {
    const y = base + (-52 + i * 6) * 2, w = Math.round((4 + i * 2.5) * 2);
    rect(c, x - w + 1, y + (i % 2) * 2 - 1, w - 2, 1, '#E8EEF7'); rect(c, x + 5, y + 1 - (i % 2) * 2, w - 3, 1, '#E8EEF7');
    rect(c, x - w + 3, y + (i % 2) * 2 - 2, w - 6, 1, '#FFFFFF');
  }
  if (nieve) { rect(c, x - 4, base - 114, 8, 2, '#E8EEF7'); rect(c, x - 3, base - 115, 6, 1, '#FFFFFF'); }
}

// Los colores de la casa según la luz
const LUZ = {
  noche: { tabla: ['#5F4031', '#553828', '#3A2619', '#6A4836'], teja: ['#B83E30', '#AE382B', '#8A2A22', '#6A201B', '#C9483A'], piedra: ['#57526A', '#4A4560', '#2F2B3A', '#6F6A82'], madera: '#3A2618' },
  dia: { tabla: ['#8A5A3F', '#7F5238', '#5A3826', '#9A6A4A'], teja: ['#C9483A', '#BD4234', '#9F3329', '#7A2620', '#E7735F'], piedra: ['#8A8497', '#7A748A', '#55516A', '#A9A3B5'], madera: '#5A3A26' },
};
// La posada: tejado de tejas con su cumbrera, chimenea de ladrillo con humo, paredes de tablones, viga,
// zócalo de piedras, dos plantas de ventanas con cortinas y jardineras, la puerta con sus herrajes, el
// farolillo y el letrero en el tejado. x a la izquierda de la pared, base en el suelo, w de ancho, hp de alto de pared.
// luz: 'noche', 'tarde' o 'dia'; nieve: con nieve en el tejado y carámbanos; letrero: el rótulo en el tejado
function posada(c, x, base, w, hp, { luz = 'noche', nieve = false, humo = true, letrero = true } = {}) {
  const y = base - hp, noche = luz === 'noche', P = LUZ[noche ? 'noche' : 'dia'];
  const r = azar(x * 13 + w);
  const alto = Math.round(w * 0.4), vuelo = 10;
  // la chimenea (detrás del tejado), de ladrillo, con su remate
  const chx = Math.round(x + w * 0.7), chy = y - Math.round(alto * 0.86), chw = 16, chh = Math.round(alto * 0.75);
  rect(c, chx - 1, chy - 1, chw + 2, chh + 1, NEGRO);
  for (let j = 0; j < chh; j++) for (let i = 0; i < chw; i++) {
    const fila = Math.floor(j / 3), junta = j % 3 === 2 || (i + (fila % 2) * 3) % 6 === 5;
    rect(c, chx + i, chy + j, 1, 1, junta ? (noche ? '#4A2622' : '#6F3A30') : i < 2 ? (noche ? '#9F5545' : '#C06A55') : (noche ? '#8A4638' : '#A85A48'));
  }
  rect(c, chx - 3, chy - 4, chw + 6, 4, NEGRO); rect(c, chx - 2, chy - 3, chw + 4, 2, noche ? '#5F5A67' : '#8F8A97'); rect(c, chx - 2, chy - 3, chw + 4, 1, noche ? '#7F7A87' : '#B7B2BF');
  if (nieve) { rect(c, chx - 3, chy - 6, chw + 6, 2, '#E8EEF7'); rect(c, chx - 2, chy - 7, chw + 4, 1, '#FFFFFF'); }
  if (humo) for (let i = 0; i < 7; i++) {
    const hx = chx + chw / 2 + i * 4 + (i % 2) * 2, hy = chy - 9 - i * 10, hr = 3 + Math.round(i * 1.3);
    c.globalAlpha = 0.42 - i * 0.05; disc(c, hx, hy, hr, noche ? '#6F779F' : '#D7D3E3'); disc(c, hx - 1, hy - 1, hr - 1, noche ? '#8F97B7' : '#F0EEF5'); c.globalAlpha = 1;
  }
  // el tejado: filas de tejas de 4 px, cada teja con su brillo y su junta; abajo, el alero de madera
  for (let i = 0; i <= alto; i++) {
    const half = Math.round((w / 2 + vuelo) * (1 - i / alto)), yy = y - i, x0 = Math.round(x + w / 2 - half);
    rect(c, x0 - 1, yy, half * 2 + 2, 1, NEGRO);
    if (half <= 0) continue;
    if (i < 2) { rect(c, x0, yy, half * 2, 1, i ? P.madera : '#2A1A10'); continue; }
    const fila = Math.floor((i - 2) / 4), j = (i - 2) % 4;
    if (nieve && i > 4) {
      rect(c, x0, yy, half * 2, 1, j === 0 ? '#C3CFE3' : '#E8EEF7');
      if (j === 3) for (let px = (fila % 2) * 5; px < half * 2; px += 11) rect(c, x0 + px, yy, 3, 1, '#FFFFFF');
      continue;
    }
    rect(c, x0, yy, half * 2, 1, j === 0 ? P.teja[3] : j === 1 ? P.teja[2] : P.teja[fila % 2]);
    // las juntas entre tejas (al tresbolillo) y el brillo de cada una
    for (let px = (fila % 2) * 4 + ((x0 - x) % 8 + 8) % 8; px < half * 2; px += 8) {
      if (j > 0) rect(c, x0 + px, yy, 1, 1, P.teja[3]);
      if (j === 3) rect(c, x0 + px + 1, yy, 3, 1, P.teja[4]);
    }
  }
  // la cumbrera
  rect(c, Math.round(x + w / 2) - 3, y - alto - 2, 6, 3, NEGRO); rect(c, Math.round(x + w / 2) - 2, y - alto - 1, 4, 1, nieve ? '#FFFFFF' : P.teja[4]);
  if (nieve) for (let px = -vuelo + 2; px < w + vuelo - 2; px += 4) rect(c, x + px, y + 1, 1, 1 + ((px * 7) % 5 + 5) % 5, '#CFE0F5');   // carámbanos
  // las paredes: tablones con su veta, la viga de en medio y los postes de las esquinas
  rect(c, x - 1, y + 1, w + 2, hp, NEGRO);
  for (let px = 0; px < w; px++) {
    const seam = px % 7 === 6;
    rect(c, x + px, y + 2, 1, hp - 2, seam ? P.tabla[2] : Math.floor(px / 7) % 2 ? P.tabla[0] : P.tabla[1]);
  }
  for (let i = 0; i < w * hp / 22; i++) { const vx = x + Math.floor(r() * w), vy = y + 3 + Math.floor(r() * (hp - 6)); if (vx % 7 !== 6) rect(c, vx, vy, 1, 2 + Math.floor(r() * 3), r() < 0.5 ? P.tabla[3] : P.tabla[2]); }
  rect(c, x, y + 2, w, 3, P.tabla[2]);   // la sombra del alero
  const viga = y + Math.round(hp * 0.5);
  rect(c, x, viga, w, 4, P.madera); rect(c, x, viga, w, 1, P.tabla[3]); rect(c, x, viga + 4, w, 1, NEGRO);
  rect(c, x, y + 2, 3, hp - 2, P.madera); rect(c, x + w - 3, y + 2, 3, hp - 2, P.madera);
  // el zócalo de piedras
  const zh = 10;
  rect(c, x, base - zh, w, zh, P.piedra[2]);
  for (let fila = 0; fila < 2; fila++) for (let px = -(fila * 5); px < w; px += 10) {
    const sx = Math.max(x, x + px + 1), ex = Math.min(x + w, x + px + 10), sy = base - zh + fila * 5 + 1;
    if (ex - sx < 2) continue;
    rect(c, sx, sy, ex - sx - 1, 4, P.piedra[r() < 0.5 ? 0 : 1]); rect(c, sx, sy, ex - sx - 1, 1, P.piedra[3]);
  }
  // ventanas: tres por planta; abajo, la del medio es la puerta
  const vw = 20, vh = 18;
  const pos = k => Math.round(x + 14 + k * ((w - 28 - vw) / 2));
  // (centradas en su planta: la de abajo, contando con el zócalo)
  const arriba = y + 4 + Math.round((hp / 2 - 4 - vh) / 2), abajo = viga + 4 + Math.round((hp / 2 - 14 - vh) / 2);
  for (const [f, vy] of [[0, arriba], [1, abajo]]) for (let k = 0; k < 3; k++) {
    if (f === 1 && k === 1) continue;
    const vx = pos(k);
    if (noche) halo(c, vx + vw / 2, vy + vh / 2, 20, '#FFB347', 0.05);
    rect(c, vx - 2, vy - 2, vw + 4, vh + 4, NEGRO); rect(c, vx - 1, vy - 1, vw + 2, vh + 2, '#7F4F2F');
    if (noche) { degradado(c, vx, vy, vw, vh, ['#FFE7A7', '#FFD77F', '#FFC35F', '#FFB347']); }
    else { rect(c, vx, vy, vw, vh, '#6FA3CB'); rect(c, vx, vy + vh - 6, vw, 6, '#5F93BB'); for (let d = 0; d < 6; d++) { rect(c, vx + 3 + d, vy + 2 + d, 1, 1, '#CFE9F7'); rect(c, vx + 12 + d, vy + 2 + d, 1, 1, '#A7D3EF'); } }
    // las cortinas, recogidas a los lados, y el marco en cruz
    for (const [cx, s] of [[vx, 1], [vx + vw - 4, -1]]) {
      rect(c, cx, vy, 4, vh, '#B8372B'); rect(c, cx + (s > 0 ? 3 : 0), vy + 2, 1, vh - 4, '#8F2A22');
      rect(c, cx + (s > 0 ? 1 : 2), vy, 1, vh, '#D9584A');
      rect(c, cx + (s > 0 ? 3 : 0), vy + 10, 1, 2, '#E7A73F');   // el alzapaños
    }
    rect(c, vx + vw / 2 - 1, vy, 2, vh, '#7F4F2F'); rect(c, vx, vy + 8, vw, 2, '#7F4F2F');
    // el alféizar y, abajo, la jardinera con flores
    rect(c, vx - 3, vy + vh + 2, vw + 6, 2, P.madera); rect(c, vx - 3, vy + vh + 2, vw + 6, 1, P.tabla[3]);
    if (nieve) rect(c, vx - 3, vy + vh + 1, vw + 6, 1, '#E8EEF7');
    else if (f === 1) {
      rect(c, vx - 1, vy + vh + 4, vw + 2, 5, '#5A3420'); rect(c, vx - 1, vy + vh + 4, vw + 2, 1, '#7A4A2A');
      for (let i = 0; i < vw; i += 3) { rect(c, vx + i, vy + vh + 2, 2, 2, '#3F7F3F'); rect(c, vx + i + 1, vy + vh + 1, 1, 1, ['#E2653F', '#F7A7C7', '#FFD77F'][(i / 3) % 3]); }
    }
  }
  // la puerta: tablones, herrajes, el ventanuco encendido y el pomo
  const dw = 24, dh = 38, dx = Math.round(x + w / 2 - dw / 2);
  rect(c, dx - 2, base - dh - 2, dw + 4, dh + 2, NEGRO); rect(c, dx - 1, base - dh - 1, dw + 2, dh + 1, P.madera);
  for (let px = 0; px < dw; px++) rect(c, dx + px, base - dh, 1, dh, px % 6 === 5 ? (noche ? '#4A2E18' : '#5A3820') : (noche ? '#6F4527' : '#8F5A33'));
  rect(c, dx, base - dh, 2, 2, NEGRO); rect(c, dx + dw - 2, base - dh, 2, 2, NEGRO);
  for (const hy of [base - dh + 6, base - 9]) { rect(c, dx, hy, 9, 2, '#2A2230'); rect(c, dx, hy, 9, 1, '#57526A'); }
  rect(c, dx + 7, base - dh + 6, 10, 8, NEGRO); rect(c, dx + 8, base - dh + 7, 8, 6, noche ? '#FFD77F' : '#7FB3D7'); rect(c, dx + 11, base - dh + 7, 2, 6, NEGRO);
  rect(c, dx + dw - 6, base - 19, 3, 3, '#C7973F'); rect(c, dx + dw - 6, base - 19, 1, 1, '#FFE7A7');
  // el escalón y el felpudo
  rect(c, dx - 6, base, dw + 12, 3, noche ? '#57526A' : '#9F98AA'); rect(c, dx - 6, base, dw + 12, 1, noche ? '#6F6A82' : '#B7B0C2'); rect(c, dx - 5, base + 3, dw + 10, 1, '#2F2B3A');
  rect(c, dx + 3, base - 1, dw - 6, 1, '#9F2F27');
  // el farolillo, colgado de su brazo de hierro a la izquierda de la puerta
  const fx = dx - 12, fy = base - dh + 2;
  rect(c, fx, fy - 3, 9, 1, NEGRO); rect(c, fx + 8, fy - 5, 1, 3, NEGRO); rect(c, fx + 1, fy - 2, 1, 2, NEGRO);
  if (noche) halo(c, fx + 1, fy + 5, 24, '#FFD77F', 0.06);
  rect(c, fx - 2, fy, 7, 10, NEGRO); rect(c, fx - 1, fy + 1, 5, 8, noche ? '#FFD77F' : '#E7D7A7'); rect(c, fx - 2, fy + 4, 7, 1, NEGRO);
  if (noche) rect(c, fx + 1, fy + 2, 1, 2, '#FFFFFF');
  // el letrero, clavado en el tejado
  if (letrero && w >= 120) {
    const lw = 104, lx = Math.round(x + w / 2 - lw / 2), ly = y - Math.round(alto * 0.45);
    rect(c, lx - 1, ly - 1, lw + 2, 18, NEGRO); rect(c, lx, ly, lw, 16, '#3A2618'); rect(c, lx, ly, lw, 1, '#5A3A26'); rect(c, lx, ly + 15, lw, 1, '#2A1A10');
    for (let px = 6; px < lw; px += 9) rect(c, lx + px, ly + 2, 1, 12, '#33210F');
    for (const nx of [lx + 2, lx + lw - 3]) { rect(c, nx, ly + 2, 1, 1, '#8F8A97'); rect(c, nx, ly + 13, 1, 1, '#8F8A97'); }
    letras(c, 'EL PINO CALCINADO', x + w / 2, ly + 12, { col: noche ? '#FFD77F' : MARFIL, align: 'center' });
  }
  // de noche, la luz de la puerta y las ventanas de abajo cae en el suelo
  if (noche) {
    c.globalAlpha = 0.1;
    for (let j = 1; j < 26; j++) rect(c, dx - 6 - j, base + 3 + j, dw + 12 + j * 2, 1, '#FFB347');
    for (const k of [0, 2]) for (let j = 1; j < 10; j++) rect(c, pos(k) - j, base + j, vw + j * 2, 1, '#FFB347');
    c.globalAlpha = 1;
  }
  return { puerta: dx + dw / 2 };
}

// El monigote de nieve, con nariz de chistorra (Charizard la mira con pena) y una cazuela de sombrero
function monigote(c, x, base) {
  disc(c, x, base - 12, 12, '#B9C6DC'); disc(c, x - 2, base - 14, 10, '#F4F7FC'); rect(c, x - 6, base - 19, 3, 2, '#FFFFFF');
  disc(c, x, base - 32, 8, '#B9C6DC'); disc(c, x - 1, base - 33, 7, '#F4F7FC');
  rect(c, x - 4, base - 36, 2, 2, NEGRO); rect(c, x + 2, base - 36, 2, 2, NEGRO);
  rect(c, x, base - 32, 8, 2, '#C0502F'); rect(c, x + 6, base - 32, 2, 2, '#8F2F1F'); rect(c, x + 2, base - 32, 1, 1, '#E7835F');
  for (let i = -3; i <= 3; i++) rect(c, x + i, base - 27 + Math.round(Math.abs(i) * -0.4), 1, 1, '#3F3A4A');
  rect(c, x - 9, base - 40, 19, 2, '#2F2B3A'); rect(c, x - 7, base - 46, 15, 6, '#57526A'); rect(c, x - 7, base - 46, 15, 1, '#7F7A8F');
  rect(c, x - 11, base - 44, 2, 2, '#2F2B3A'); rect(c, x + 10, base - 44, 2, 2, '#2F2B3A');
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) { rect(c, x + s * (9 + i), base - 22 - Math.round(i * 0.6), 1, 1, '#4F3427'); if (i === 8) rect(c, x + s * (9 + i), base - 26 - Math.round(i * 0.6), 1, 3, '#4F3427'); }
  for (let i = 0; i < 3; i++) rect(c, x - 1, base - 18 + i * 5, 2, 2, NEGRO);
  // la bufanda
  rect(c, x - 7, base - 25, 14, 3, '#C73F2F'); rect(c, x + 3, base - 23, 3, 8, '#C73F2F'); rect(c, x + 3, base - 18, 3, 1, '#FFD77F');
}
// Los banderines, colgados en curva entre dos puntos
function banderines(c, x0, y0, x1, y1, comba = 10) {
  const cols = ['#E2653F', '#FFD77F', '#5FA7E7', '#7FBF4F', '#E77FB7'];
  const n = Math.max(2, Math.round(x1 - x0));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + comba * 4 * t * (1 - t));
    rect(c, x, y, 1, 1, '#3F2A1F');
    if (i % 9 === 4) { const col = cols[(i / 9 | 0) % cols.length]; rect(c, x - 2, y + 1, 5, 2, col); rect(c, x - 1, y + 3, 3, 1, col); rect(c, x, y + 4, 1, 1, col); rect(c, x - 2, y + 1, 1, 1, '#FFFFFF'); }
  }
}
// Una nota musical (Manolo silba como si nada)
function nota(c, x, y, col = '#FFF7BF') {
  rect(c, x, y, 3, 2, col); rect(c, x + 2, y - 7, 1, 7, col); rect(c, x + 3, y - 7, 2, 1, col); rect(c, x + 4, y - 6, 1, 2, col);
}
// El coche de la agente Mara, de lado, mirando a la izquierda, con la sirena encendida
function cochePolicia(c, x, base) {
  // las luces de la sirena, que lo tiñen todo de azul y rojo
  halo(c, x + 30, base - 40, 44, '#3F6FFF', 0.07); halo(c, x + 44, base - 40, 44, '#FF3F3F', 0.07);
  // los faros, hacia delante (donde corre Bulbasaur)
  c.globalAlpha = 0.12;
  for (let i = 0; i < 70; i++) rect(c, x - i, base - 16 - Math.round(i * 0.22), 1, 4 + Math.round(i * 0.44), '#FFF7BF');
  c.globalAlpha = 1;
  rect(c, x - 1, base - 28, 82, 20, NEGRO);   // la carrocería
  rect(c, x, base - 27, 80, 18, '#F4EFE6'); rect(c, x, base - 11, 80, 2, '#D7D3E3');
  rect(c, x + 14, base - 41, 46, 14, NEGRO); rect(c, x + 15, base - 40, 44, 13, '#F4EFE6');   // la cabina
  rect(c, x + 17, base - 37, 18, 10, '#3F5F9F'); rect(c, x + 37, base - 37, 20, 10, '#3F5F9F');
  rect(c, x + 18, base - 36, 4, 1, '#9FC7EF'); rect(c, x + 38, base - 36, 4, 1, '#9FC7EF'); rect(c, x + 35, base - 37, 2, 10, NEGRO);
  // la franja azul con su rótulo
  rect(c, x, base - 27, 80, 15, '#2F4F9F'); rect(c, x, base - 27, 80, 1, '#4F6FBF');
  letras(c, 'POLICÍA', x + 40, base - 14, { col: MARFIL, align: 'center' });
  // la sirena: azul y roja
  rect(c, x + 26, base - 44, 22, 4, NEGRO); rect(c, x + 27, base - 43, 10, 3, '#4F8FFF'); rect(c, x + 37, base - 43, 10, 3, '#FF4F4F');
  rect(c, x + 28, base - 43, 3, 1, '#DFEFFF'); rect(c, x + 39, base - 43, 3, 1, '#FFDFDF');
  // los faros, el piloto y las ruedas
  rect(c, x - 1, base - 11, 3, 3, '#FFF7BF'); rect(c, x + 78, base - 11, 3, 3, '#C73F2F');
  for (const wx of [x + 16, x + 64]) { disc(c, wx, base - 6, 7, NEGRO); disc(c, wx, base - 6, 4, '#3F3A4A'); rect(c, wx - 1, base - 7, 2, 2, '#8F8A97'); }
  rect(c, x - 2, base - 2, 86, 2, NEGRO);   // la sombra
}

// ---------- las fotos ----------

// Un cielo de noche: estrellas sueltas de varios tamaños y brillos (más arriba que abajo), alguna gorda con su
// halo y algún destello en cruz
function cieloEstrellado(c, w, h, semilla) {
  const r = azar(semilla);
  for (let i = 0; i < w * h / 70; i++) {
    const x = Math.floor(r() * w), y = Math.floor(Math.pow(r(), 1.4) * h), v = r();
    rect(c, x, y, 1, 1, v < 0.55 ? '#2F3768' : v < 0.85 ? '#5F679F' : v < 0.96 ? '#A7AFDF' : '#E7EBFF');
  }
  for (let i = 0; i < w * h / 4200; i++) {
    const x = 3 + Math.floor(r() * (w - 6)), y = 3 + Math.floor(Math.pow(r(), 1.3) * h * 0.9);
    halo(c, x, y, 3, '#8F97C7', 0.18, 2);
    rect(c, x, y, 2, 2, r() < 0.4 ? '#FFF3C7' : '#E7EBFF'); rect(c, x, y, 1, 1, '#FFFFFF');
  }
  for (let i = 0; i < Math.max(2, w * h / 32000); i++) {
    const x = 6 + Math.floor(r() * (w - 12)), y = 6 + Math.floor(Math.pow(r(), 1.2) * h * 0.85);
    halo(c, x, y, 5, '#C7CDEF', 0.12, 2);
    rect(c, x - 4, y, 9, 1, '#5F679F'); rect(c, x, y - 4, 1, 9, '#5F679F');
    rect(c, x - 2, y, 5, 1, '#C7CDEF'); rect(c, x, y - 2, 1, 5, '#C7CDEF');
    rect(c, x - 1, y - 1, 1, 1, '#5F679F'); rect(c, x + 1, y + 1, 1, 1, '#5F679F'); rect(c, x + 1, y - 1, 1, 1, '#5F679F'); rect(c, x - 1, y + 1, 1, 1, '#5F679F');
    rect(c, x, y, 1, 1, '#FFFFFF');
  }
}
// El pino calcinado en grande (a ×3): la corteza cuarteada, la brasa viva dentro del tronco, su resplandor
// y las chispas que suben
function pinoBrasa(c, x, base) {
  halo(c, x, base - 40, 46, '#E2653F', 0.06, 5);
  c.save(); c.translate(x, base); c.scale(3, 3);
  pine(c, 0, 0, 0, { burnt: true });
  c.restore();
  const r = azar(x + 5);
  for (let j = 0; j < 90; j++) rect(c, x - 5 + Math.floor(r() * 11), base - 165 + Math.floor(r() * 160), 1, 2 + Math.floor(r() * 3), r() < 0.5 ? '#1F2238' : '#05070F');
  // la brasa: el hueco del tronco al rojo, con grietas encendidas que suben y bajan
  // (una raja irregular, más ancha en medio, con el corazón amarillo)
  for (let j = 0; j < 26; j++) {
    const yy = base - 48 + j, t = Math.sin(Math.PI * j / 26), a = Math.round(1 + t * 4 + ((j * 5) % 3 === 0 ? 1 : 0)), dx = (j % 4 === 0 ? 1 : 0) - (j % 7 === 0 ? 1 : 0);
    rect(c, x - a + dx, yy, a * 2 + 1, 1, '#1A0A08');
    if (a > 1) rect(c, x - a + 1 + dx, yy, a * 2 - 1, 1, '#9F2F17');
    if (a > 2) rect(c, x - a + 2 + dx, yy, a * 2 - 3, 1, '#E2653F');
    if (a > 3) rect(c, x - 1 + dx, yy, 3, 1, '#FFB347');
    if (a > 4) rect(c, x + dx, yy, 1, 1, '#FFF7BF');
  }
  for (const [gx, gy, gl] of [[-1, -52, 7], [1, -60, 5], [-2, -22, 6], [2, -16, 4]]) rect(c, x + gx, base + gy, 1, gl, '#C7471F');
  halo(c, x, base - 34, 16, '#FFB347', 0.12, 3);
  // las chispas que suben de la brasa
  for (const [sx, sy, col] of [[3, -58, '#FFB347'], [-4, -70, '#E2653F'], [6, -84, '#FFD77F'], [1, -96, '#E2653F'], [-6, -110, '#FFB347']]) rect(c, x + sx, base + sy, 1, 1, col);
  // la luz de la brasa en la hierba, al pie del tronco
  c.globalAlpha = 0.1; for (let j = 0; j < 8; j++) rect(c, x - 10 - j * 2, base + j, 21 + j * 4, 1, '#E2653F'); c.globalAlpha = 1;
}

// 1. De noche, en la puerta: la posada de cerca, con la luna grande y baja asomando por detrás del tejado,
// el pino calcinado con su brasa, la luz de las ventanas en la hierba, luciérnagas, y Manolo y Charizard
// en la puerta (la cola de Charizard alumbra la entrada)
async function fotoNoche(c, w, h, d) {
  const [ms, cs] = await Promise.all([loadSprite('manolo', ['Idle']), loadSprite('0006', ['Idle'])]);
  const m = d.movil;
  const base = m ? 500 : 234, hz = base - (m ? 120 : 80);
  // el cielo, más cálido hacia el horizonte (la luz del pueblo y de la luna)
  degradado(c, 0, 0, w, hz + 12, ['#070A1A', '#0A0E20', '#0D1226', '#10162D', '#141A34', '#181F3C', '#1D2444', '#232A4D', '#2B3056', '#34365E', '#3E3B63']);
  cieloEstrellado(c, w, hz, 7);
  fugaz(c, m ? 34 : 120, m ? 96 : 30, 10);
  const [px, pw, ph] = m ? [36, 214, 128] : [200, 214, 118];
  const alto = Math.round(pw * 0.4), techo = base - ph;
  // la luna llena, grande y baja, por detrás del tejado (asoma por la derecha de la cumbrera)
  const lx = Math.round(px + pw * (m ? 0.74 : 0.8)), ly = techo - Math.round(alto * (m ? 0.92 : 0.8)), lr = m ? 36 : 32;
  halo(c, lx, ly, lr * 3, '#8F97C7', 0.05, 6);
  halo(c, lx, ly, lr + 8, '#F4EFE6', 0.08, 2);
  disc(c, lx, ly, lr, '#D7D0C0'); disc(c, lx - 1, ly - 1, lr - 1, '#ECE6D8'); disc(c, lx - 3, ly - 3, lr - 6, '#F7F2E7');
  for (const [mx, my, mr] of [[0.3, -0.35, 0.2], [-0.4, 0.1, 0.24], [0.1, 0.42, 0.13], [0.5, 0.2, 0.12], [-0.15, -0.5, 0.1], [-0.5, -0.25, 0.08]])
    disc(c, Math.round(lx + mx * lr), Math.round(ly + my * lr), Math.max(2, Math.round(mr * lr)), '#DED6C5');
  rect(c, lx - Math.round(lr * 0.55), ly - Math.round(lr * 0.62), 5, 1, '#FFFFFF');
  // los montes y el pinar, en sombra, con el filo plateado por la luna
  montes(c, w, hz, m ? 40 : 30, '#20284E', 2, { filo: '#3A4478' });
  montes(c, w, hz + 16, m ? 26 : 20, '#181F40', 5, { filo: '#2A3360' });
  pinar(c, w, hz + 30, '#10152B', 4, 18);
  // la hierba, con las sombras de la noche
  suelo(c, w, base, h - base, { base: '#142019', claro: '#1F3226', oscuro: '#0C1510', brizna: '#294332', semilla: 44 });
  // la posada, de cerca; el camino hasta la puerta
  camino(c, px + pw / 2, base + 4, h, { col: '#2A2A26', borde: '#1C261C', china: '#3F3D36' });
  const { puerta } = posada(c, px, base, pw, ph, { luz: 'noche' });
  // la luz de las ventanas, en la hierba: manchas cálidas que se alargan hacia delante
  c.globalAlpha = 0.07;
  for (let j = 0; j < (h - base); j++) rect(c, puerta - 40 - j, base + 4 + j, 80 + j * 2, 1, '#FFB347');
  c.globalAlpha = 1;
  // el pino calcinado, delante a la izquierda (en el móvil) o a la derecha (en el ordenador)
  pinoBrasa(c, m ? 20 : 452, base + 4);
  // Manolo y Charizard en la puerta; la cola de Charizard alumbra la entrada
  halo(c, puerta + 58, base - 18, 46, '#FFB347', 0.08, 4);
  halo(c, puerta + 58, base - 18, 18, '#FFD77F', 0.1, 2);
  pon(c, ms, puerta - 28, base + 16, { k: 2 });
  pon(c, cs, puerta + 34, base + 16, { k: 2, dir: DIR.downLeft });
  // luciérnagas en la hierba y alrededor del pino
  const r = azar(3);
  for (let i = 0; i < (m ? 22 : 26); i++) {
    const fx = Math.floor(r() * w), fy = base - 50 + Math.floor(r() * (h - base + 40));
    if (fx > px && fx < px + pw && fy < base) continue;   // (no sobre la fachada)
    halo(c, fx, fy, 3, '#DFF77F', 0.16, 2); rect(c, fx, fy, 1, 1, '#EFFF9F');
  }
}

// 2. La foto de grupo: los huéspedes que han pasado por la posada, en filas delante de la casa, a la tarde
// (en el móvil caben menos, para que no se pisen)
async function fotoGrupo(c, w, h, d) {
  const m = d.movil;
  const porFila = m ? 4 : 9, filas = m ? 4 : 3, paso = m ? 50 : 34;
  const lista = (d.conocidos || []).slice(0, porFila * filas - 2);
  const [ms, cs, ...todos] = await Promise.all([loadSprite('manolo', ['Idle']), loadSprite('0006', ['Idle']),
    ...lista.map(s => loadSprite(s, ['Idle']).catch(() => null))]);
  const base = m ? 330 : 134, hz = base - (m ? 34 : 24);
  degradado(c, 0, 0, w, hz + 10, ['#38558F', '#4A649F', '#6372AB', '#8580B0', '#AA8FAF', '#CF9FA0', '#EBB28F', '#F5C98F']);
  halo(c, m ? 40 : 56, hz - 8, 46, '#FFE7A7', 0.09, 5); disc(c, m ? 40 : 56, hz - 8, 14, '#FFE7A7'); disc(c, m ? 40 : 56, hz - 8, 12, '#FFF3C7');
  const tonos = ['#FFE7D7', '#F7C7B7', '#D79FA7'];
  for (const [nx, ny, nw] of m ? [[140, 90, 60], [20, 150, 44], [170, 210, 40]] : [[170, 30, 70], [330, 46, 56], [420, 20, 36]]) nube(c, nx, ny, nw, tonos);
  montes(c, w, hz, m ? 30 : 26, '#7F6F9F', 4, { filo: '#9F8FB7' });
  montes(c, w, hz + 12, m ? 18 : 14, '#5F6F7F', 1, { filo: '#7F8F8F' });
  pinar(c, w, hz + 20, '#4F6A4F', 6, 12);
  suelo(c, w, base, h - base, { base: '#6F9F3F', claro: '#8FB74F', oscuro: '#5A8A33', brizna: '#9FC75F', flores: ['#FFFFFF', '#FFD77F', '#E77FB7'] });
  const pw = m ? 170 : 150, px = Math.round(w / 2 - pw / 2);
  posada(c, px, base, pw, m ? 92 : 66, { luz: 'tarde' });
  pino(c, m ? 22 : px - 40, base + 2, { noche: false });
  banderines(c, px - 4, base - (m ? 86 : 62), px + pw + 4, base - (m ? 86 : 62), 6);
  // las filas: los más altos detrás; Manolo y Charizard, en el centro de la de delante
  const gente = todos.map(s => s && { s, ...caja(s) }).filter(Boolean).sort((a, b) => b.alto * escala(b.s) - a.alto * escala(a.s));
  const delante = m ? 550 : 252;
  const filasG = [];
  const primera = gente.splice(-(porFila - 2));   // los más bajitos, delante
  filasG.push([...primera.slice(0, Math.floor(primera.length / 2)), { s: ms }, { s: cs, dir: DIR.downLeft }, ...primera.slice(Math.floor(primera.length / 2))]);
  while (gente.length) filasG.push(gente.splice(-porFila));
  for (let f = filasG.length - 1; f >= 0; f--) {
    const fila = filasG[f], y = delante - f * paso;
    const hueco = (w - 12) / fila.length;
    fila.forEach((p, i) => pon(c, p.s, Math.round(6 + hueco * (i + 0.5) + (f % 2 ? hueco / 4 : 0)), y, { dir: p.dir ?? DIR.down }));
  }
}

// 3. El tejado, al atardecer: Charizard y su sobrino sentados de espaldas, con las colas encendidas
async function fotoTejado(c, w, h, d) {
  const [cs, ss] = await Promise.all([loadSprite('0006', ['Idle']), loadSprite(d.sobrino || '0005', ['Idle'])]);
  const m = d.movil;
  const hz = m ? 380 : 150, cumbre = m ? 452 : 198;
  degradado(c, 0, 0, w, hz, ['#1A1A45', '#22214F', '#2F2757', '#3F2B63', '#4F2F6F', '#673770', '#7F3F6F', '#9F476B', '#BF5565', '#D7675F', '#E57F57', '#EF9957', '#F7B35F', '#FBC86F']);
  estrellas(c, w, m ? 150 : 50, m ? 70 : 50, 12);
  // el sol, bajando justo detrás de ellos
  const x0 = m ? 104 : 214, sx = x0 + 26, sy = hz - (m ? 44 : 34);
  halo(c, sx, sy, 80, '#FFD27A', 0.07, 5); disc(c, sx, sy, 24, '#FFE7A7'); disc(c, sx, sy, 21, '#FFF3C7');
  for (let i = 0; i < 4; i++) rect(c, sx - 20 + i * 3, sy + 6 + i * 4, 40 - i * 6, 1, '#FBC86F');   // las rayas del sol al ponerse
  for (const [nx, ny, nw] of m ? [[120, 220, 80], [16, 260, 60], [150, 300, 64], [30, 330, 40]] : [[230, 70, 100], [40, 96, 70], [300, 112, 80], [400, 60, 50]]) {
    rect(c, nx, ny, nw, 2, '#F79F6F'); rect(c, nx + 8, ny + 2, nw - 6, 2, '#9F4F6F'); rect(c, nx + 4, ny - 1, nw - 16, 1, '#FFC78F');
  }
  // pájaros que vuelven al nido
  for (const [bx, by] of m ? [[176, 150], [192, 162], [164, 168], [200, 140]] : [[330, 40], [346, 52], [318, 56], [360, 34]]) { rect(c, bx - 4, by, 3, 1, '#2F1F3F'); rect(c, bx + 2, by, 3, 1, '#2F1F3F'); rect(c, bx - 1, by + 1, 3, 1, '#2F1F3F'); rect(c, bx - 5, by - 1, 1, 1, '#2F1F3F'); rect(c, bx + 5, by - 1, 1, 1, '#2F1F3F'); }
  montes(c, w, hz, m ? 36 : 28, '#4F2F5F', 3, { filo: '#7F3F6F' });
  montes(c, w, hz + 12, m ? 22 : 18, '#3A2450', 8, { filo: '#4F2F5F' });
  pinar(c, w, hz + 22, '#2A1D40', 9, 16);
  rect(c, 0, hz + 22, w, cumbre - hz, '#22173A');
  // las luces del pueblo, abajo en el valle
  const rl = azar(8);
  for (let i = 0; i < 24; i++) rect(c, Math.floor(rl() * w), hz + 28 + Math.floor(rl() * (cumbre - hz - 34)), 1, 1, rl() < 0.5 ? '#FFD77F' : '#FFB347');
  // el tejado de tejas, de lado a lado, y la cumbrera
  for (let y = cumbre; y < h; y++) {
    const fila = Math.floor((y - cumbre) / 6), j = (y - cumbre) % 6;
    for (let x = -((fila % 2) * 6); x < w; x += 12) {
      rect(c, x, y, 11, 1, j === 5 ? '#5A1E1A' : j === 0 ? '#B84A3A' : fila % 2 ? '#9F3F2F' : '#8F372A');
      if (j > 0 && j < 5) rect(c, x + 11, y, 1, 1, '#5A1E1A');
      if (j === 1) rect(c, x + 1, y, 4, 1, '#D9604A');
    }
  }
  rect(c, 0, cumbre - 4, w, 6, '#5F1F1A'); rect(c, 0, cumbre - 4, w, 2, '#C9483A'); rect(c, 0, cumbre - 5, w, 1, NEGRO);
  for (let x = 0; x < w; x += 8) rect(c, x, cumbre - 4, 1, 6, '#4A1814');
  // la luz del sol en las tejas de arriba y la sombra de las de abajo (tramada)
  c.globalAlpha = 0.16; rect(c, 0, cumbre + 2, w, 14, '#F7B35F'); c.globalAlpha = 1;
  for (let y = cumbre + 30; y < h; y++) for (let x = (y % 2); x < w; x += 2) if (y - cumbre > 60 || (x + y) % 4 === 0) { c.globalAlpha = 0.14; rect(c, x, y, 1, 1, NEGRO); }
  c.globalAlpha = 1;
  const r = azar(33);
  for (let i = 0; i < 40; i++) { const mx = Math.floor(r() * w), my = cumbre + 10 + Math.floor(r() * (h - cumbre - 10)); rect(c, mx, my, 3, 1, '#5F7F3F'); rect(c, mx + 1, my - 1, 2, 1, '#7F9F4F'); }
  // la chimenea con su humo
  const chx = m ? 214 : 404;
  rect(c, chx - 1, cumbre - 46, 22, 46, NEGRO);
  for (let j = 0; j < 45; j++) for (let i = 0; i < 20; i++) rect(c, chx + i, cumbre - 45 + j, 1, 1, j % 4 === 3 || (i + (Math.floor(j / 4) % 2) * 4) % 8 === 7 ? '#5F2F2A' : i < 3 ? '#B86A55' : '#8F4A3A');
  rect(c, chx - 3, cumbre - 50, 26, 5, NEGRO); rect(c, chx - 2, cumbre - 49, 24, 3, '#7F7A8F');
  for (let i = 0; i < 6; i++) { c.globalAlpha = 0.38 - i * 0.05; disc(c, chx + 10 + i * 6, cumbre - 58 - i * 11, 3 + i * 1.5, '#C7B3C7'); c.globalAlpha = 1; }
  // el plato con las dos últimas chistorras, entre los dos (a medias, como buen tío)
  const px = x0 + 26, py = cumbre + 2;
  rect(c, px - 9, py, 19, 2, NEGRO); rect(c, px - 8, py - 1, 17, 1, '#E7E3EF'); rect(c, px - 6, py, 13, 1, '#B7B3C7');
  rect(c, px - 6, py - 4, 6, 3, '#9F3F27'); rect(c, px + 1, py - 4, 6, 3, '#B7472B'); rect(c, px - 5, py - 4, 2, 1, '#E7835F'); rect(c, px + 2, py - 4, 2, 1, '#FF9F6F');
  // sentados en la cumbrera, de espaldas, mirando cómo se pone el sol
  for (const x of [x0 - 8, x0 + 52]) halo(c, x, cumbre - 14, 24, '#FFB347', 0.1);
  pon(c, cs, x0, cumbre + 6, { dir: DIR.up, k: 2, sombra: false });
  pon(c, ss, x0 + 52, cumbre + 6, { dir: DIR.up, k: 2, sombra: false });
}

// 4. La nevada: la posada con nieve hasta las rodillas, el monigote con nariz de chistorra
// y Charizard derritiendo un corro de nieve con la cola
async function fotoNevada(c, w, h, d) {
  const [ms, cs] = await Promise.all([loadSprite('manolo', ['Idle']), loadSprite('0006', ['Idle'])]);
  const m = d.movil;
  const base = m ? 462 : 206, hz = base - (m ? 44 : 30);
  degradado(c, 0, 0, w, hz + 10, ['#10152F', '#141A38', '#181F40', '#1C2548', '#222C56', '#283464', '#2E3C70', '#36467C', '#3F5088']);
  estrellas(c, w, hz, m ? 90 : 110, 21);
  montes(c, w, hz, m ? 46 : 34, '#26305A', 6, { nieve: '#B9C6DC' });
  montes(c, w, hz + 14, m ? 26 : 20, '#1E2750', 2, { nieve: '#8F9FC3' });
  pinar(c, w, hz + 24, '#222B4F', 2, 14);
  suelo(c, w, base, h - base, { base: '#C9D5E7', claro: '#E8EEF7', oscuro: '#B3C3DB', brizna: '#DCE5F2', semilla: 5 });
  const [px, pw, ph] = m ? [56, 190, 106] : [250, 190, 100];
  camino(c, px + pw / 2, base + 4, h, { col: '#A3B3CF', borde: '#B9C6DC', china: '#8F9FBF' });
  posada(c, px, base, pw, ph, { luz: 'noche', nieve: true });
  pino(c, m ? 24 : 462, base + 2, { nieve: true });
  // el corro derretido alrededor de la cola de Charizard (y la hierba que asoma)
  const cx = m ? 200 : 136, cy = base + (m ? 66 : 40);
  rect(c, cx - 30, cy - 3, 60, 8, '#7F8FA7'); rect(c, cx - 24, cy - 5, 48, 12, '#6F7F97'); rect(c, cx - 18, cy - 3, 36, 8, '#3F6F4F');
  for (let i = 0; i < 14; i++) rect(c, cx - 16 + i * 2 + (i % 3), cy - 3 + (i % 4), 1, 2, '#5F8F5F');
  halo(c, cx + 4, cy - 16, 38, '#FFB347', 0.09);
  monigote(c, m ? 50 : cx - 50, cy + 6);
  pon(c, cs, cx, cy + 4, { k: 2, dir: DIR.downLeft });
  pon(c, ms, px + pw / 2, base + 16, { k: 2 });
  // pisadas en la nieve, de la puerta al monigote
  for (let i = 0; i < 6; i++) rect(c, px + pw / 2 - 10 - i * 8 * (m ? 1 : 2.4), base + 24 + i * (m ? 7 : 3), 3, 2, '#A3B3CF');
  // y los copos, delante de todo
  const r = azar(5);
  for (let i = 0; i < (m ? 420 : 380); i++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h), v = r();
    if (v < 0.12) { rect(c, x - 1, y, 3, 1, '#FFFFFF'); rect(c, x, y - 1, 1, 3, '#FFFFFF'); }
    else rect(c, x, y, v < 0.4 ? 2 : 1, v < 0.4 ? 2 : 1, v < 0.7 ? '#FFFFFF' : '#C7D3E7');
  }
}

// 5. La boda de los Nidoran: el arco de flores delante de la posada, la tarta de tres pisos,
// Manolo de padrino, Charizard de testigo y confeti
async function fotoBoda(c, w, h, d) {
  const m = d.movil;
  const invitados = (d.conocidos || []).filter(s => !['0029', '0030', '0031', '0032', '0033', '0034'].includes(s)).slice(0, m ? 4 : 5);
  const [ms, cs, novio, novia, ...gente] = await Promise.all([loadSprite('manolo', ['Idle']), loadSprite('0006', ['Idle']),
    loadSprite('0034', ['Idle']), loadSprite('0031', ['Idle']), ...invitados.map(s => loadSprite(s, ['Idle']).catch(() => null))]);
  const base = m ? 360 : 140, hz = base - (m ? 34 : 24);
  degradado(c, 0, 0, w, hz + 10, ['#3F7FCF', '#4789D5', '#5095DB', '#5FA1E1', '#6FADE7', '#81B9ED', '#93C7F1', '#A7D3F5', '#BBDFF7']);
  for (const [nx, ny, nw] of m ? [[40, 110, 56], [170, 180, 46], [70, 250, 36]] : [[60, 40, 60], [250, 26, 70], [390, 58, 44]]) nube(c, nx, ny, nw);
  montes(c, w, hz, m ? 30 : 24, '#7FA7C7', 9, { filo: '#9FC7DF' });
  montes(c, w, hz + 12, m ? 18 : 14, '#5F9F6F', 3, { filo: '#7FBF7F' });
  pinar(c, w, hz + 20, '#4F8F5F', 3, 12);
  suelo(c, w, base, h - base, { base: '#6FAF4F', claro: '#8FC75F', oscuro: '#5A9A3F', brizna: '#A7D76F', flores: ['#FFFFFF', '#FFD77F', '#E77FB7', '#F7A7C7'] });
  // la posada al fondo, entera (con su letrero), y el pino, con banderines de uno a otro
  const pw = m ? 150 : 150, px = m ? Math.round(w / 2 - pw / 2) : 24;
  posada(c, px, base, pw, m ? 80 : 70, { luz: 'dia' });
  const pinx = m ? 250 : 454;
  pino(c, pinx, base + 2, { noche: false });
  banderines(c, px + pw - 4, base - (m ? 70 : 60), pinx - 6, base - 90, 12);
  if (m) banderines(c, 8, base - 96, px + 4, base - 70, 8);
  // los invitados, en fila detrás de los novios
  const cx = m ? Math.round(w / 2) : 300;
  gente.filter(Boolean).forEach((s, i) => {
    const lado = i % 2 ? 1 : -1, n = Math.floor(i / 2);
    pon(c, s, Math.round(cx + lado * ((m ? 64 : 84) + (m ? 40 : 46) * n)), base + (m ? 34 : 24));
  });
  // el arco de flores: dos postes y medio círculo de flores por encima de las cabezas de los novios
  const ar = m ? 50 : 54, ay = base + (m ? 76 : 70), alto = m ? 82 : 84;
  for (const ppx of [cx - ar, cx + ar - 2]) { rect(c, ppx - 1, ay - alto, 4, alto, NEGRO); rect(c, ppx, ay - alto, 2, alto, '#8F5A33'); rect(c, ppx, ay - alto, 1, alto, '#AF7A4F'); }
  const flor = (fx, fy, a) => {
    disc(c, fx, fy, 4, '#2F7F3F'); disc(c, fx - 1, fy - 1, 3, '#4F9F4F'); rect(c, fx - 2, fy - 3, 1, 1, '#7FBF5F');
    const col = ['#FFFFFF', '#E77FB7', '#FFD77F', '#F7A7C7'][a % 4];
    rect(c, fx - 1, fy - 1, 3, 3, col); rect(c, fx, fy - 2, 1, 5, col); rect(c, fx - 2, fy, 5, 1, col); rect(c, fx, fy, 1, 1, '#FFB347');
  };
  for (let yy = ay - alto + 8; yy < ay - 8; yy += 10) { flor(cx - ar, yy, yy); flor(cx + ar - 1, yy + 4, yy + 1); }
  for (let a = 0; a <= 30; a++) {
    const ang = Math.PI * a / 30;
    flor(Math.round(cx - Math.cos(ang) * ar), Math.round(ay - alto - Math.sin(ang) * ar * 0.6), a);
  }
  // los novios, Charizard de testigo y Manolo de padrino
  pon(c, novio, cx - 20, ay, { k: 2 });
  pon(c, novia, cx + 22, ay, { k: 2 });
  pon(c, cs, cx - (m ? 84 : 110), ay + (m ? 54 : 10), { k: 2, dir: DIR.downRight });
  pon(c, ms, cx + (m ? 84 : 104), ay + (m ? 54 : 10), { k: 2, dir: DIR.downLeft });
  // la tarta de la boda, en su mesita con mantel
  const tx = m ? cx : 446, ty = m ? ay + 92 : ay + 14;
  rect(c, tx - 22, ty - 12, 44, 3, '#F4EFE6'); rect(c, tx - 22, ty - 9, 44, 6, '#E7E1D3'); for (let i = 0; i < 44; i += 4) rect(c, tx - 22 + i, ty - 3, 2, 1, '#E7E1D3');
  rect(c, tx - 19, ty - 3, 2, 12, '#8F5A33'); rect(c, tx + 17, ty - 3, 2, 12, '#8F5A33');
  rect(c, tx - 15, ty - 22, 30, 10, NEGRO); rect(c, tx - 14, ty - 21, 28, 9, '#F7D7E7');
  rect(c, tx - 11, ty - 31, 22, 9, NEGRO); rect(c, tx - 10, ty - 30, 20, 8, '#FFFFFF');
  rect(c, tx - 7, ty - 38, 14, 7, NEGRO); rect(c, tx - 6, ty - 37, 12, 6, '#F7D7E7');
  rect(c, tx - 14, ty - 18, 28, 2, '#E77FB7'); rect(c, tx - 10, ty - 27, 20, 2, '#E2653F'); rect(c, tx - 6, ty - 34, 12, 1, '#E77FB7');
  for (let i = 0; i < 28; i += 4) rect(c, tx - 14 + i, ty - 21, 2, 1, '#FFFFFF');
  rect(c, tx, ty - 43, 1, 5, '#F4EFE6'); rect(c, tx, ty - 45, 1, 2, '#FFB347'); halo(c, tx, ty - 45, 4, '#FFD77F', 0.3, 2);
  // confeti
  const q = azar(29);
  for (let i = 0; i < (m ? 220 : 240); i++) rect(c, Math.floor(q() * w), Math.floor(q() * (base + 90)), q() < 0.5 ? 2 : 1, q() < 0.5 ? 2 : 1, ['#E2653F', '#FFD77F', '#5FA7E7', '#E77FB7', '#FFFFFF'][i % 5]);
}

// 6. Bulbasaur huyendo de la policía: de noche, carretera abajo con su maceta y el coche de la agente Mara
// detrás, con la sirena puesta. En la puerta, Manolo silba como si nada y Charizard no quiere mirar.
async function fotoBulbasaur(c, w, h, d) {
  const [ms, cs, bs] = await Promise.all([loadSprite('manolo', ['Idle']), loadSprite('0006', ['Idle']), loadSprite('0001', ['Idle', 'Walk'])]);
  const m = d.movil;
  const base = m ? 330 : 150, hz = base - (m ? 40 : 28);
  degradado(c, 0, 0, w, hz + 10, ['#080B1C', '#0B0F22', '#0E1328', '#11172F', '#141B36', '#18203E', '#1C2547', '#212B50']);
  estrellas(c, w, hz, m ? 220 : 260, 44);
  const [lx, ly] = m ? [60, 200] : [64, 50];
  halo(c, lx, ly, 34, '#8F97C7', 0.05); disc(c, lx, ly, 11, '#E7E1D3'); disc(c, lx + 4, ly - 3, 10, '#0E1328');   // la luna en cuarto
  montes(c, w, hz, m ? 34 : 26, '#262E57', 7, { filo: '#343D6F' });
  pinar(c, w, hz + 14, '#141A33', 11, 14);
  suelo(c, w, base, h - base, { base: '#16231C', claro: '#22362A', oscuro: '#0F1914', brizna: '#2C4636', semilla: 17 });
  // la posada, arriba, con Manolo silbando en la puerta y Charizard de cara a la pared
  const [px, pw, ph] = m ? [96, 150, 86] : [300, 150, 84];
  const { puerta } = posada(c, px, base, pw, ph, { luz: 'noche' });
  pino(c, m ? 30 : 468, base + 2);
  // el camino de la puerta a la carretera (antes que Manolo y Charizard, para que no les pise los pies)
  const ry = m ? 470 : 236, rh = m ? 50 : 30;
  if (m) for (let y = base + 6; y < ry; y++) { const xx = Math.round(puerta - 20 - (y - base) * 0.55); rect(c, xx, y, 34, 1, '#2F3038'); rect(c, xx - 1, y, 1, 1, '#1F2028'); }
  else for (let y = base + 6; y < ry; y++) { const xx = Math.round(puerta - 16 - (y - base) * 1.2); rect(c, xx, y, 30, 1, '#2F3038'); }
  pon(c, ms, puerta - 24, base + 12, { k: 2 });
  for (const [nx, ny] of [[-40, -46], [-48, -58], [-38, -68]]) nota(c, puerta + nx, base + ny);
  pon(c, cs, puerta + 34, base + 10, { k: 2, dir: DIR.up });
  rect(c, puerta + 46, base - 58, 2, 4, '#7FBFFF'); rect(c, puerta + 45, base - 55, 4, 3, '#7FBFFF'); rect(c, puerta + 46, base - 55, 1, 1, '#FFFFFF');   // la gota de sudor
  // la carretera, con su raya
  rect(c, 0, ry, w, rh, '#2F3038'); rect(c, 0, ry, w, 2, '#4A4B55'); rect(c, 0, ry + rh - 2, w, 2, '#1F2028');
  for (let x = 4; x < w; x += 24) rect(c, x, ry + Math.round(rh / 2) - 1, 12, 2, '#C7C3A7');
  const rg = azar(3);
  for (let i = 0; i < w * rh / 30; i++) rect(c, Math.floor(rg() * w), ry + 2 + Math.floor(rg() * (rh - 4)), 1, 1, rg() < 0.5 ? '#3A3B45' : '#26272F');
  // la señal de curva peligrosa, que nadie mira
  const sx = m ? 236 : 220;
  rect(c, sx, ry - 34, 2, 34, '#8F8A97'); rect(c, sx - 8, ry - 50, 18, 16, NEGRO); rect(c, sx - 7, ry - 49, 16, 14, '#E7C73F'); rect(c, sx - 2, ry - 46, 6, 2, NEGRO); rect(c, sx + 2, ry - 44, 2, 6, NEGRO);
  // el coche de la agente Mara, detrás, y Bulbasaur, delante, corriendo con su maceta
  const carx = m ? 130 : 250, bx = m ? 66 : 110, by = ry + Math.round(rh * 0.62);
  cochePolicia(c, carx, ry + Math.round(rh * 0.55));
  // el polvo que levanta al correr y las rayas de velocidad
  for (let i = 0; i < 5; i++) { c.globalAlpha = 0.4 - i * 0.07; disc(c, bx + 26 + i * 7, by - 3 - (i % 2) * 3, 3 + i, '#8F8A97'); c.globalAlpha = 1; }
  for (const [ly2, lw] of [[-30, 22], [-20, 30], [-10, 18]]) rect(c, bx + 24, by + ly2, lw, 1, '#C7CDEF');
  pon(c, bs, bx, by, { k: 2, dir: DIR.left, anim: 'Walk', t: 120 });
  // la maceta, encima del bulbo, con la planta (bien verde, que la riega a escondidas)
  const mx = bx + 8, my = by - 36;
  rect(c, mx - 9, my - 1, 19, 13, NEGRO); rect(c, mx - 8, my, 17, 11, '#C7673F'); rect(c, mx - 10, my - 3, 21, 4, NEGRO); rect(c, mx - 9, my - 2, 19, 2, '#D7774F');
  rect(c, mx - 6, my + 2, 2, 7, '#E7875F'); rect(c, mx - 7, my - 1, 15, 1, '#3F2A1F');
  for (const [sx2, top] of [[-5, -22], [0, -28], [5, -20]]) {
    rect(c, mx + sx2, my + top, 1, -top, '#2F5F2F');
    for (const dy of [0, 6, 12]) { rect(c, mx + sx2 - 5, my + top + dy + 1, 5, 2, '#5F9F3F'); rect(c, mx + sx2 + 1, my + top + dy + 3, 5, 2, '#5F9F3F'); rect(c, mx + sx2 - 4, my + top + dy + 1, 2, 1, '#9FD76F'); rect(c, mx + sx2 + 4, my + top + dy + 3, 2, 1, '#9FD76F'); }
  }
}

// Lo que hay: cada foto con su título y cómo se dibuja
export const FOTOS = {
  noche: { titulo: 'De noche, en la puerta', dibuja: fotoNoche },
  grupo: { titulo: 'La foto de grupo', dibuja: fotoGrupo },
  tejado: { titulo: 'El tejado, al atardecer', dibuja: fotoTejado },
  nevada: { titulo: 'La nevada', dibuja: fotoNevada },
  boda: { titulo: 'La boda de los Nidoran', dibuja: fotoBoda },
  bulbasaur: { titulo: 'Bulbasaur huyendo de la policía', dibuja: fotoBulbasaur },
};

// La foto entera, a sangre, con la firma pequeña en la esquina de abajo a la derecha
// datos: { conocidos (sprites de los huéspedes, los de más visitas antes), sobrino (el sprite del de Charmander) }
async function dibuja(foto = 'noche', tipo = 'movil', datos = {}) {
  const [W, H] = MEDIDAS[tipo];
  const lienzo = document.createElement('canvas');
  lienzo.width = W; lienzo.height = H;
  const c = lienzo.getContext('2d');
  c.imageSmoothingEnabled = false;
  try { await document.fonts.load('20px "Jersey 10"'); } catch { /* sin la fuente se ve igual */ }
  await (FOTOS[foto] || FOTOS.noche).dibuja(c, W, H, { ...datos, movil: tipo === 'movil' });
  // a tamaño de foto, sin suavizar: píxeles nítidos
  const out = document.createElement('canvas');
  out.width = W * FINAL; out.height = H * FINAL;
  const f = out.getContext('2d');
  f.imageSmoothingEnabled = false;
  f.drawImage(lienzo, 0, 0, out.width, out.height);
  // la firma, discreta: a la mitad del píxel de dibujo, con su sombra, pegada a la esquina
  const fx = out.width - (tipo === 'movil' ? 36 : 28), fy = out.height - (tipo === 'movil' ? 34 : 64);
  f.globalAlpha = 0.55;
  letras(f, 'El Pino Calcinado · Manolo y Charizard', fx + 2, fy + 2, { col: NEGRO, n: 2, align: 'right' });
  f.globalAlpha = 0.8;
  letras(f, 'El Pino Calcinado · Manolo y Charizard', fx, fy, { col: MARFIL, n: 2, align: 'right' });
  f.globalAlpha = 1;
  return out;
}

// Genera la foto y la descarga (en el móvil, el navegador ofrece guardarla en la galería)
export async function descargarFondo(foto = 'noche', tipo = 'movil', datos = {}) {
  const out = await dibuja(foto, tipo, datos);
  const blob = await new Promise(res => out.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `el-pino-calcinado-${foto}-${tipo}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Para verla sin descargar (pruebas)
export { dibuja as dibujaFondo };
