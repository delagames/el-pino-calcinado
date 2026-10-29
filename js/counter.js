// Vista B: el mostrador (sección 4 de DISEÑO.md). El huésped en primer plano detrás
// de la barra, Charizard a un lado, y de fondo la ventana con las montañas, la estantería
// y el farolillo. Manolo no sale en plano: es quien mira. Pixel art a 160×80 nativo.
import { loadSprite, Actor, DIR, addBuddy } from './sprites.js';

const W = 160, H = 80, BAR = 58;   // fila donde empieza la barra del mostrador

const SKY = {
  manana: ['#97C3E7', '#F7D7A7', '#7F97C7'], dia: ['#77B7EF', '#B7E3F7', '#87A7D7'],
  tarde: ['#C7678F', '#FFA76F', '#6F5F8F'], noche: ['#1F2742', '#2C3860', '#36416B'],
};
const LIT = { manana: 0.3, dia: 0.2, tarde: 0.7, noche: 1 };

function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

function backdrop(c, fase, t) {
  // pared con papel de rayas y viga
  rect(c, 0, 0, W, H, '#EFD7AF');
  for (let x = 3; x < W; x += 6) rect(c, x, 4, 1, BAR - 10, '#F7E7C7');
  rect(c, 0, 0, W, 4, '#4F2F1F'); rect(c, 0, 4, W, 1, '#371F15');
  // ventana con montañas y el cielo de la hora
  const [top, low, mont] = SKY[fase] || SKY.noche;
  rect(c, 52, 9, 44, 30, '#6F4527'); rect(c, 52, 9, 44, 1, '#100C14');
  rect(c, 54, 11, 40, 13, top); rect(c, 54, 24, 40, 13, low);
  c.fillStyle = mont;
  for (let i = 0; i < 40; i++) {
    const h = Math.round(7 + 4 * Math.sin(i / 5) + 2 * Math.sin(i / 2.3));
    c.fillRect(54 + i, 37 - h, 1, h);
  }
  if (fase === 'noche') { rect(c, 60, 14, 1, 1, '#F4EFE6'); rect(c, 85, 16, 1, 1, '#F4EFE6'); disc(c, 86, 15, 3, '#F4EFE6'); }
  else disc(c, fase === 'tarde' ? 88 : 66, fase === 'tarde' ? 30 : 15, 3, '#FFF3C7');
  rect(c, 73, 11, 2, 26, '#6F4527'); rect(c, 54, 23, 40, 2, '#6F4527');
  rect(c, 49, 39, 50, 3, '#CF9B63'); rect(c, 49, 41, 50, 1, '#8F6037');
  // estantería con tarros y la ristra de chistorra
  rect(c, 112, 22, 40, 3, '#9F6A3F'); rect(c, 112, 25, 40, 1, '#6F4527');
  for (const [x, col] of [[115, '#DFAF3F'], [122, '#C73F2F'], [129, '#6F9F4F'], [136, '#E9E2D2'], [143, '#DFAF3F']]) {
    rect(c, x, 14, 5, 8, '#100C14'); rect(c, x + 1, 15, 3, 7, col); rect(c, x, 13, 5, 1, '#6F4527');
  }
  for (let i = 0; i < 5; i++) {
    const x = 114 + i * 8, y = 30 + Math.round(3 * Math.sin(Math.PI * i / 4));
    rect(c, x, y, 3, 8, '#100C14'); rect(c, x + 1, y + 1, 1, 6, '#C73F2F');
  }
  rect(c, 112, 30, 40, 1, '#4F2F1F');
  // farolillo colgado, con su luz
  rect(c, 22, 5, 1, 9, '#100C14');
  const flick = Math.sin(t / 110) * Math.sin(t / 190) > 0.2;
  c.globalAlpha = 0.12 * LIT[fase]; disc(c, 22, 20, 18, '#FFB347'); c.globalAlpha = 0.18 * LIT[fase]; disc(c, 22, 20, 10, '#FFB347');
  c.globalAlpha = 1;
  rect(c, 18, 14, 9, 11, '#100C14'); rect(c, 19, 15, 7, 9, flick ? '#FFF7BF' : '#FFB347'); rect(c, 19, 24, 7, 1, '#5F6777');
}

// Fuera, delante del pino calcinado: para quien no cabe por la puerta (Snorlax) o vive en
// el agua (Lapras, junto al estanque)
const GRASS = { manana: ['#4F875F', '#3F6F57'], dia: ['#579F5F', '#3F7F4F'], tarde: ['#5F7F4F', '#4F6343'], noche: ['#232B4E', '#1B2240'] };
function outside(c, fase, t, pond) {
  const [top, low, mont] = SKY[fase] || SKY.noche;
  rect(c, 0, 0, W, 34, top); rect(c, 0, 34, W, 26, low);
  for (let y = 30; y < 38; y += 2) for (let x = (y / 2) % 2; x < W; x += 2) rect(c, x, y, 1, 1, low);
  c.fillStyle = mont;
  for (let x = 0; x < W; x++) {
    const h = Math.round(16 + 7 * Math.sin(x / 17 + 1) + 4 * Math.sin(x / 7));
    c.fillRect(x, 58 - h, 1, h);
  }
  if (fase === 'noche') { disc(c, 132, 12, 5, '#F4EFE6'); for (const [x, y] of [[20, 8], [60, 14], [100, 6], [150, 20]]) rect(c, x, y, 1, 1, '#F4EFE6'); }
  else disc(c, fase === 'tarde' ? 140 : fase === 'manana' ? 46 : 90, fase === 'tarde' ? 40 : 12, 4, '#FFF3C7');
  const [g1, g2] = GRASS[fase] || GRASS.noche;
  rect(c, 0, 58, W, 22, g1); rect(c, 0, 58, W, 1, g2);
  for (let x = 3; x < W; x += 7) rect(c, x, 56 + (x % 3), 1, 3, g2);
  // la fachada de la posada a la derecha: muro de madera, puerta y farolillo
  rect(c, 122, 14, 38, 46, '#4F2F1F'); rect(c, 121, 14, 1, 46, '#100C14');
  rect(c, 132, 30, 18, 30, '#100C14'); rect(c, 133, 31, 16, 29, '#6F4527'); rect(c, 140, 31, 1, 29, '#4F2F1F');
  rect(c, 146, 46, 2, 2, '#DFAF3F');
  rect(c, 116, 12, 44, 3, '#7F3323'); rect(c, 116, 11, 44, 1, '#100C14');
  rect(c, 125, 17, 5, 7, '#100C14'); rect(c, 126, 18, 3, 5, Math.sin(t / 130) > -0.3 ? '#FFB347' : '#FFF7BF');
  // el pino quemado a la izquierda, con la brasa que late
  rect(c, 14, 4, 6, 56, '#0F1324'); rect(c, 19, 4, 1, 56, '#3F4A73');
  for (const [y, l, s] of [[10, 8, -1], [14, 10, 1], [20, 12, -1], [26, 6, 1], [32, 14, -1], [38, 9, 1], [44, 12, -1]]) {
    for (let i = 0; i < l; i++) rect(c, s < 0 ? 14 - i : 20 + i, y + Math.floor(i / 3), 1, 2, '#0F1324');
  }
  rect(c, 10, 58, 14, 2, '#0F1324');
  const beat = 0.5 + 0.5 * Math.sin(t / 590);
  rect(c, 15, 48, 4, 8, '#9F2F17'); rect(c, 16, 49, 2, 6, beat > 0.5 ? '#FFB347' : '#E2653F');
  if (pond) {
    // el estanque delante
    for (let dy = 0; dy < 12; dy++) {
      const half = Math.round(48 * Math.sqrt(1 - (dy / 12.5) ** 2));
      rect(c, 80 - half, 66 + dy, half * 2, 1, dy < 2 ? low : dy < 6 ? '#4F8FAF' : '#376F8F');
    }
    for (let i = 0; i < 4; i++) rect(c, 50 + i * 18 + Math.round(Math.sin(t / 400 + i) * 2), 70 + (i % 2) * 3, 4, 1, '#9FDFEF');
  }
}

// El plano del toro (Tauros en la feria): solo el cielo, el cerro y su silueta negra de perfil,
// como el toro de los carteles de carretera. Píxeles del toro al doble
function planoToro(c, fase, t) {
  const [top, low, mont] = SKY[fase] || SKY.noche;
  rect(c, 0, 0, W, 40, top); rect(c, 0, 40, W, 40, low);
  for (let y = 36; y < 44; y += 2) for (let x = (y / 2) % 2; x < W; x += 2) rect(c, x, y, 1, 1, low);
  disc(c, 128, 20, 6, '#FFF3C7');
  c.fillStyle = mont;
  for (let x = 0; x < W; x++) { const h = Math.round(10 + 4 * Math.sin(x / 13) + 2 * Math.sin(x / 5)); c.fillRect(x, 66 - h, 1, h); }
  // el cerro, redondo, y el césped de delante
  for (let dy = 0; dy < 26; dy++) { const half = Math.round(70 * Math.sqrt(1 - ((26 - dy) / 26.5) ** 2)); rect(c, 80 - half, 54 + dy, half * 2, 1, dy < 2 ? '#7F9F4F' : '#5F7F3F'); }
  for (let x = 14; x < 146; x += 9) rect(c, x, 58 + Math.round(Math.abs(x - 80) / 7) + (x % 3), 1, 2, '#4F6F37');
  // el toro, quieto (solo se le mueve el rabo)
  const k = 2, x0 = 80 - 15 * k, y0 = 55 - TORO.arte.length * k;
  TORO.arte.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch === 'X') rect(c, x0 + dx * k, y0 + dy * k, k, k, '#100C14'); }));
  if (Math.floor(t / 700) % 2) rect(c, x0 + 29 * k, y0 + 9 * k, k, k * 2, '#100C14');
}
const TORO = { arte: [
  'X.....X.......................',
  'X....X........................',
  '.X..X.........................',
  '..XXXX........................',
  '..XXXXXXX.....................',
  '.XXXXXXXXXXXXXXXXXXXXXX.......',
  'XXXXXXXXXXXXXXXXXXXXXXXXX.....',
  'XXXXXXXXXXXXXXXXXXXXXXXXXX...X',
  '.XXXXXXXXXXXXXXXXXXXXXXXXXX.X.',
  '..XXXXXXXXXXXXXXXXXXXXXXXXXX..',
  '...XXXXXXXXXXXXXXXXXXXXXXXXX..',
  '....XXXXXXXXXXXXXXXXXXXXXXX...',
  '....XXXX..XX.......XXX.XXXX...',
  '....XX....XX.......XX...XX....',
  '....XX....XX.......XX...XX....',
  '....X.....X........X.....X....',
] };

// El sombrero vaquero de los del Oeste, encima de la cabeza (k: lo que mide cada píxel)
const SOMBRERO = ['....LLLLLL....', '...LBBBBBBL...', '...LBBBBBBL...', '...LDDDDDDL...', 'LLLLBBBBBBLLLL', 'LBBBBBBBBBBBBL', '.LLLLLLLLLLLL.'];
function sombrero(c, x, y, k) {
  const col = { L: '#100C14', B: '#9F6A3F', D: '#4F2F1F' };
  const x0 = Math.round(x - SOMBRERO[0].length * k / 2), y0 = Math.round(y - (SOMBRERO.length - 3) * k);
  SOMBRERO.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch !== '.') rect(c, x0 + dx * k, y0 + dy * k, k, k, col[ch]); }));
}

// Decorados de los eventos (las excursiones): cada grupo monta lo suyo delante de la posada, entre
// el pino (x 14-20) y la fachada (x 122): al fondo, detrás de los personajes. El suelo empieza en y 58.
function guirnalda(c, x0, y0, x1, y1, comba, t, cols, paso = 6, banderin = false) {
  const n = Math.floor((x1 - x0) / paso);
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = Math.round(x0 + (x1 - x0) * k), y = Math.round(y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * comba);
    rect(c, x, y, 2, 1, '#100C14');
    if (i === n) break;
    const col = cols[i % cols.length];
    if (banderin) { rect(c, x, y + 1, 4, 2, col); rect(c, x + 1, y + 3, 2, 1, col); }
    else { const on = Math.floor(t / 400 + i) % 3 !== 0; rect(c, x + 2, y + 1, 2, 2, on ? col : '#5F5A67'); if (on) { c.globalAlpha = 0.3; rect(c, x + 1, y, 4, 4, col); c.globalAlpha = 1; } }
  }
}
// un cable de la luz, combado entre dos puntos
function cable(c, x0, y0, x1, y1, comba) {
  for (let x = x0; x <= x1; x++) { const k = (x - x0) / Math.max(1, x1 - x0); rect(c, x, Math.round(y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * comba), 1, 1, '#100C14'); }
}
function arte(c, rows, x, y, pal) {
  rows.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch !== '.') rect(c, x + dx, y + dy, 1, 1, pal[ch]); }));
}
const ESCENARIO = {
  // la feria: bombillas del pino a la casa y un tiovivo a rayas
  feria(c, t) {
    guirnalda(c, 20, 12, 122, 15, 8, t, ['#FFD27A', '#F7577F', '#9FD7FF', '#A7D76F']);
    const x = 104, gira = Math.floor(t / 250) % 2;
    for (let i = 0; i < 9; i++) rect(c, x - i, 24 + i, i * 2 + 1, 1, (i + gira) % 2 ? '#C73F2F' : '#F4EFE6');
    rect(c, x - 9, 33, 19, 1, '#100C14');
    rect(c, x, 34, 1, 22, '#DFAF3F');
    for (const [dx, up] of [[-6, gira], [5, 1 - gira]]) { rect(c, x + dx, 34, 1, 12 + up * 2, '#DFAF3F'); rect(c, x + dx - 2, 46 + up * 2, 5, 3, '#F4EFE6'); rect(c, x + dx - 2, 46 + up * 2, 1, 1, '#100C14'); }
    rect(c, x - 11, 56, 23, 2, '#7F3323');
  },
  // la playa: sombrilla, toalla y cubo con pala
  playa(c, t) {
    const x = 104;
    for (let i = 0; i < 7; i++) rect(c, x - 2 - i * 2, 22 + i, 5 + i * 4, 1, Math.floor(i / 2) % 2 ? '#F4EFE6' : '#C73F2F');
    rect(c, x, 29, 1, 29, '#9F9AA7');
    rect(c, x - 16, 60, 20, 4, '#4F8FDF'); for (let i = 0; i < 20; i += 4) rect(c, x - 16 + i, 60, 2, 4, '#FFD27A');
    rect(c, x + 8, 55, 6, 5, '#100C14'); rect(c, x + 9, 55, 4, 4, '#F08F3F'); rect(c, x + 13, 50, 1, 6, '#E2653F');
    disc(c, 64 + Math.round(Math.sin(t / 500) * 2), 61, 2, '#F7577F'); rect(c, 63 + Math.round(Math.sin(t / 500) * 2), 59, 2, 1, '#F4EFE6');
    // los guiris: la toalla reservando la sombra del pino (negra, roja y amarilla) y el cartel hacia la Malagueta
    for (const [i, col] of ['#100C14', '#C73F2F', '#FFD23F'].entries()) rect(c, 1, 61 + i, 12, 1, col);
    rect(c, 0, 60, 14, 1, '#100C14'); rect(c, 0, 64, 14, 1, '#100C14');
    rect(c, 117, 30, 1, 28, '#6F4527');
    arte(c, ['XXXXXXXX..', 'XWWWWWWWX.', 'XWBBWBBWWX', 'XWWWWWWWX.', 'XXXXXXXX..'], 108, 28, { X: '#100C14', W: '#F4EFE6', B: '#4F8FDF' });
  },
  // el ballet acuático: banderines azules y blancos sobre el estanque, y surtidores
  acuatico(c, t) {
    guirnalda(c, 20, 10, 122, 12, 6, t, ['#4F8FDF', '#F4EFE6', '#9FDFEF'], 6, true);
    // el cartel de Selwo Marina con su delfín, en un poste junto a la casa, y el aro de los saltos sobre el agua
    rect(c, 114, 36, 1, 22, '#6F4527');
    rect(c, 104, 22, 18, 15, '#100C14'); rect(c, 105, 23, 16, 13, '#2F6FBF'); rect(c, 105, 32, 16, 4, '#9FDFEF');
    arte(c, ['.....X....', '...XXX....', '.XXXXXXX.X', 'XXWXXXXXXX', '.XXXXXX..X', '....X.....'], 108, 25, { X: '#9FD7FF', W: '#100C14' });
    for (let a = 0; a < Math.PI * 2; a += 0.35) rect(c, Math.round(96 + Math.cos(a) * 5), Math.round(52 + Math.sin(a) * 6), 1, 1, Math.floor(a * 2) % 2 ? '#F4EFE6' : '#E2453F');
    for (const x of [44, 116]) for (let i = 0; i < 4; i++) {
      const k = ((t / 600) + i / 4) % 1;
      rect(c, x + Math.round((i - 1.5) * k * 6), Math.round(66 - Math.sin(k * Math.PI) * 14), 2, 2, i % 2 ? '#9FDFEF' : '#F4EFE6');
    }
  },
  // el Oeste: cactus, cartel del saloon y un matojo que rueda
  oeste(c, t) {
    arte(c, ['...LL...', '...GL...', 'L..GL...', 'GL.GL.LL', 'GL.GL.GL', 'GLLGLLGL', '.GGGGGG.', '...GL...', '...GL...', '...GL...', '...GL...', '...GL...'], 54, 46, { L: '#3F6F3F', G: '#6F9F4F' });
    rect(c, 110, 38, 1, 20, '#6F4527'); rect(c, 119, 38, 1, 20, '#6F4527');
    rect(c, 108, 33, 14, 7, '#100C14'); rect(c, 109, 34, 12, 5, '#B7834F');
    for (let i = 0; i < 4; i++) rect(c, 110 + i * 3, 36, 2, 1, '#4F2F1F');
    const x = ((t / 30) % 140) - 10, y = 54 - Math.abs(Math.sin(t / 200)) * 4;
    disc(c, Math.round(x), Math.round(y), 3, '#9F7F4F'); rect(c, Math.round(x) - 1, Math.round(y) - 1, 2, 1, '#6F5F37');
  },
  // la verbena: banderines de papel en zigzag, farolillos y un cohete en el cielo
  verbena(c, t) {
    guirnalda(c, 20, 10, 122, 14, 7, t, ['#C73F2F', '#FFD27A', '#6F9F4F', '#4F8FDF', '#F7A7C7'], 5, true);
    guirnalda(c, 20, 20, 122, 22, 6, t, ['#FFB347', '#F7577F'], 10);
    const k = (t % 3000) / 3000;
    if (k < 0.5) rect(c, 70, Math.round(34 - k * 50), 1, 2, '#FFF7BF');
    else for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = (k - 0.5) * 20; c.globalAlpha = 1 - (k - 0.5) * 2; rect(c, Math.round(70 + Math.cos(a) * r), Math.round(9 + Math.sin(a) * r), 1, 1, ['#FFD27A', '#F7577F', '#9FD7FF'][i % 3]); }
    c.globalAlpha = 1;
  },
  // el punto limpio: los tres contenedores de reciclar
  puntolimpio(c) {
    [['#FFD23F', '#B7972F'], ['#4F8FDF', '#2F4F9F'], ['#6F9F4F', '#3F6F3F']].forEach(([a, b], i) => {
      const x = 92 + i * 10;
      rect(c, x, 42, 9, 16, '#100C14'); rect(c, x + 1, 44, 7, 13, a); rect(c, x, 41, 9, 3, b); rect(c, x + 3, 47, 3, 1, '#F4EFE6');
    });
    rect(c, 122 - 4, 52, 4, 6, '#100C14'); rect(c, 119, 53, 2, 4, '#7F7F7F');
  },
  // la visita del Team Rocket: el globo con cara de gato y un cartel con la R
  visitasrocket(c, t) {
    const y = 8 + Math.round(Math.sin(t / 700) * 2), x = 98;
    disc(c, x, y + 6, 8, '#100C14'); disc(c, x, y + 6, 7, '#F2DCA0');
    rect(c, x - 7, y - 2, 3, 3, '#F2DCA0'); rect(c, x + 5, y - 2, 3, 3, '#F2DCA0');
    disc(c, x, y + 2, 2, '#DFAF3F'); rect(c, x - 3, y + 6, 1, 2, '#100C14'); rect(c, x + 3, y + 6, 1, 2, '#100C14');
    rect(c, x - 3, y + 15, 1, 6, '#100C14'); rect(c, x + 3, y + 15, 1, 6, '#100C14'); rect(c, x - 4, y + 21, 9, 4, '#8F5F37');
    rect(c, 106, 32, 13, 15, '#100C14'); rect(c, 107, 33, 11, 13, '#F4EFE6');
    arte(c, ['XXXX.', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'], 110, 36, { X: '#C73F2F' });
    rect(c, 112, 47, 1, 11, '#6F4527');
  },
  // el dojo: tatami en el césped, saco de boxeo colgado del pino y el cartel con el círculo rojo
  dojo(c, t) {
    rect(c, 50, 59, 56, 6, '#100C14'); rect(c, 51, 59, 54, 5, '#C7B76F'); for (let x = 51; x < 105; x += 9) rect(c, x, 59, 1, 5, '#8F7F3F');
    const sw = Math.round(Math.sin(t / 500) * 2);
    rect(c, 118, 18, 1, 40, '#6F4527'); rect(c, 110, 18, 9, 1, '#6F4527');
    rect(c, 111, 19, 1, 6, '#4F4F57'); rect(c, 109 + sw, 25, 6, 14, '#100C14'); rect(c, 110 + sw, 26, 4, 12, '#C73F2F'); rect(c, 110 + sw, 26, 1, 12, '#E2653F');
    rect(c, 56, 40, 1, 18, '#6F4527'); rect(c, 50, 30, 13, 11, '#100C14'); rect(c, 51, 31, 11, 9, '#F4EFE6'); disc(c, 56, 35, 3, '#C73F2F');
  },
  // los psíquicos: mesita con bola de cristal, cucharas que flotan y destellos
  psiquicos(c, t) {
    rect(c, 98, 48, 16, 2, '#100C14'); rect(c, 99, 48, 14, 1, '#8F4FAF'); rect(c, 100, 50, 1, 8, '#4F2F1F'); rect(c, 111, 50, 1, 8, '#4F2F1F');
    disc(c, 106, 43, 4, '#100C14'); disc(c, 106, 43, 3, Math.sin(t / 300) > 0 ? '#B77FDF' : '#9FD7FF'); rect(c, 105, 41, 1, 1, '#FFFFFF');
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * 22, y = 24 + Math.round(Math.sin(t / 400 + i * 2) * 3);
      rect(c, x, y, 1, 5, '#C7C3D3'); rect(c, x - 1, y - 2, 3, 2, '#E7E7EF');
    }
    for (let i = 0; i < 5; i++) if ((Math.floor(t / 200) + i) % 4 === 0) rect(c, 30 + i * 18, 16 + (i * 7) % 20, 1, 1, '#FFF7BF');
  },
  // la vendimia: la parra con racimos, un cesto de uvas y el tonel
  vendimia(c) {
    for (const x of [30, 58, 86]) rect(c, x, 36, 1, 22, '#6F4527');
    rect(c, 30, 36, 57, 1, '#6F4527');
    for (let x = 30; x < 88; x += 5) { rect(c, x, 37, 4, 3, '#6F9F4F'); if (x % 10 === 0) { rect(c, x + 1, 40, 3, 2, '#8F4FAF'); rect(c, x + 2, 42, 1, 2, '#5F2F7F'); } }
    rect(c, 100, 46, 14, 12, '#100C14'); rect(c, 101, 47, 12, 10, '#9F6A3F'); rect(c, 101, 49, 12, 1, '#57576F'); rect(c, 101, 54, 12, 1, '#57576F');
    rect(c, 92, 53, 8, 5, '#B7834F'); for (let i = 0; i < 4; i++) rect(c, 93 + i * 2, 51, 2, 2, '#8F4FAF');
  },
  // los electricistas: poste con cables al pino y a la casa, caja de herramientas y cono
  electricistas(c, t) {
    rect(c, 110, 14, 2, 44, '#6F4527'); rect(c, 104, 16, 14, 2, '#6F4527');
    cable(c, 20, 18, 105, 17, 6); cable(c, 116, 17, 122, 20, 1);
    if (Math.floor(t / 150) % 9 === 0) { rect(c, 106, 14, 2, 2, '#FFF7BF'); rect(c, 115, 18, 2, 2, '#FFD23F'); }
    rect(c, 98, 54, 12, 4, '#100C14'); rect(c, 99, 54, 10, 3, '#C73F2F'); rect(c, 102, 52, 4, 2, '#100C14');
    rect(c, 114, 51, 3, 7, '#F08F3F'); rect(c, 113, 57, 5, 1, '#F08F3F'); rect(c, 114, 54, 3, 1, '#F4EFE6');
  },
  // los fósiles: una excavación con huesos, el ámbar y la pala clavada
  // los veteranos de La Legión: la pancarta del encuentro entre el pino y la casa, y el mástil con su banderín
  fosiles(c, t) {
    cable(c, 20, 14, 38, 16, 1); cable(c, 102, 16, 122, 14, 1);
    rect(c, 38, 13, 64, 11, '#100C14'); rect(c, 39, 14, 62, 9, '#3F6F3F'); rect(c, 39, 14, 62, 1, '#F4EFE6'); rect(c, 39, 22, 62, 1, '#F4EFE6');
    for (let x = 43; x < 98; x += 4) rect(c, x, 17, 2 + (x % 3 === 0 ? 1 : 0), 3, '#F4EFE6');   // las letras, de lejos
    rect(c, 112, 20, 1, 38, '#9F9AA7'); rect(c, 111, 19, 3, 1, '#DFAF3F');
    const ondea = Math.round(Math.sin(t / 300) * 1.5);
    for (let k = 0; k < 9; k++) rect(c, 113 + k, 21 + Math.round(k / 3) + (k > 4 ? ondea : 0), 1, 6 - Math.round(k / 2), k % 3 === 2 ? '#C73F2F' : '#3F6F3F');
    rect(c, 102, 55, 4, 4, '#100C14'); rect(c, 103, 55, 2, 3, '#FFB347');   // el ámbar viejo de Aerodactyl
  },
  // los pájaros legendarios: nubes, copos que caen y alguna pluma con chispa
  // la guerra de los pájaros: el cielo partido en tres (nieve desde la izquierda, fuego desde la derecha,
  // rayos en medio) que chocan sobre la posada; cada parte se calma cuando su pájaro come (CIELO)
  pajaros(c, t) {
    const nieve = CIELO.has('nieve'), fuego = CIELO.has('fuego'), rayo = CIELO.has('rayo');
    if (!nieve && !fuego && !rayo) {   // en calma: un par de nubes blancas y la nieve que queda en el suelo
      for (const [x, y] of [[40, 10], [96, 8]]) { disc(c, x, y, 4, '#F4EFE6'); disc(c, x + 5, y + 1, 3, '#F4EFE6'); disc(c, x - 5, y + 1, 3, '#E7E7EF'); }
      for (let x = 0; x < 122; x += 3) rect(c, x, 58, 2, 1 + (x % 2), '#E7EFF7');
      return;
    }
    // nubarrones, más negros cuanta más guerra queda
    c.globalAlpha = 0.25 + 0.12 * CIELO.size; rect(c, 0, 0, W, 58, '#3F4757'); c.globalAlpha = 1;
    for (let x = 0; x < W; x += 9) disc(c, x, 3 + (x % 3), 7, '#5F6777');
    if (nieve) {
      c.globalAlpha = 0.35; rect(c, 0, 0, 60, 58, '#9FDFEF'); c.globalAlpha = 1;
      for (let i = 0; i < 26; i++) { const k = ((t / 3000) + (i * 37 % 26) / 26) % 1; rect(c, Math.round((i * 53) % W + Math.sin(k * 7 + i) * 3), Math.round(k * 62), 2, 2, '#F4EFE6'); }
      for (let x = 0; x < 122; x += 3) rect(c, x, 58, 2, 1 + (x % 2), '#E7EFF7');
      // bolas de hielo que salen de la izquierda hacia el centro
      for (let i = 0; i < 4; i++) {
        const k = ((t / 1300) + i / 4) % 1, x = Math.round(6 + k * 72), y = Math.round(14 + i * 6 + Math.sin(k * 6 + i) * 3);
        disc(c, x, y, 3, '#2F4F9F'); disc(c, x, y, 2, '#C7EFFF'); rect(c, x - 1, y - 1, 1, 1, '#FFFFFF');
        if (k > 0.92) for (let a = 0; a < 6; a++) rect(c, x + Math.round(Math.cos(a) * 5), y + Math.round(Math.sin(a) * 4), 1, 1, '#FFFFFF');
      }
    }
    if (fuego) {
      c.globalAlpha = 0.3; rect(c, 100, 0, 60, 58, '#FF8F3F'); c.globalAlpha = 1;
      // bolas de fuego que vienen de la derecha, con su estela
      for (let i = 0; i < 4; i++) {
        const k = ((t / 1150) + i / 4) % 1, x = Math.round(154 - k * 72), y = Math.round(16 + i * 6 + Math.sin(k * 5 + i) * 3);
        for (let e = 1; e < 4; e++) { c.globalAlpha = 0.6 - e * 0.15; disc(c, x + e * 3, y, 2, '#E2653F'); }
        c.globalAlpha = 1; disc(c, x, y, 3, '#8F2717'); disc(c, x, y, 2, '#FFB347'); rect(c, x - 1, y - 1, 1, 1, '#FFF7BF');
        if (k > 0.92) for (let a = 0; a < 6; a++) rect(c, x + Math.round(Math.cos(a) * 5), y + Math.round(Math.sin(a) * 4), 1, 1, '#FFD27A');
      }
    }
    if (rayo) {
      // un rayo en zigzag cada poco, en sitios distintos, con su destello
      const golpe = Math.floor(t / 900), fase = t % 900;
      if (fase < 160) {
        let x = 50 + (golpe * 37) % 60, y = 4;
        c.fillStyle = '#FFF7BF';
        while (y < 52) { const nx = x + ((y / 6) % 2 ? 4 : -4); for (let s2 = 0; s2 < 6; s2++) c.fillRect(Math.round(x + (nx - x) * s2 / 6), y + s2, 2, 1); x = nx; y += 6; }
        if (fase < 60) { c.globalAlpha = 0.35; rect(c, 0, 0, W, H, '#FFFFFF'); c.globalAlpha = 1; }
      }
      for (let i = 0; i < 3; i++) if ((Math.floor(t / 120) + i) % 5 === 0) rect(c, 70 + i * 9, 20 + (i * 7) % 14, 2, 2, '#FFD23F');
    }
  },
};

// ---------- planos cortos: un momento especial de una charla, a pantalla completa ----------
// Un nodo con «plano» cambia la escena entera por un dibujo propio durante esa frase (con su música,
// en main.js) y al pasar de frase se vuelve a lo de siempre. ctx: { guest, chari, k } (k: escala del huésped)

// Pinta a un personaje en (x, y) de la vista, a la escala k, mirando a dir (y con otra animación si se pide)
function actorEn(c, a, x, y, k, t, { dir = null, anim = null, quieto = false, solo = false } = {}) {
  if (!a) return;
  const x0 = a.x, y0 = a.y, d0 = a.dir, an0 = a.anim, b0 = a.buddy;
  if (solo) a.buddy = null;
  if (quieto) t = -a.offset;   // siempre el primer fotograma
  // (y) es donde le quedan los pies de verdad: el fotograma suele tener hueco por debajo del cuerpo
  a.x = x / k; a.y = y / k + (a.ajuste || 0);
  if (dir != null) a.dir = dir;
  if (anim && a.sprite.anims[anim]) a.anim = anim;
  else if (a.anim === 'Hop') a.anim = 'Idle';   // en los planos nadie da saltitos de alegría (saldrían en el aire)
  a.sinSombra = true;
  c.save(); c.scale(k, k); a.draw(c, t); c.restore();
  a.x = x0; a.y = y0; a.dir = d0; a.anim = an0; a.sinSombra = false; a.buddy = b0;
}
// Lo mismo, pero en silueta negra (contra la luna)
const lienzoSombra = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function siluetaEn(c, a, x, y, k, t, opts) {
  if (!a || !lienzoSombra) return;
  if (lienzoSombra.width !== W || lienzoSombra.height !== H) { lienzoSombra.width = W; lienzoSombra.height = H; }
  const s = lienzoSombra.getContext('2d');
  s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, W, H);
  s.imageSmoothingEnabled = false;
  actorEn(s, a, x, y, k, t, opts);
  s.globalCompositeOperation = 'source-in'; s.fillStyle = '#100C14'; s.fillRect(0, 0, W, H);
  c.drawImage(lienzoSombra, 0, 0);
}
function cieloDe(c, cols, alto = 60) {
  const h = Math.ceil(alto / cols.length);
  cols.forEach((col, i) => rect(c, 0, i * h, W, h, col));
}
function estrellitas(c, t, n = 14, alto = 40) {
  for (let i = 0; i < n; i++) if ((Math.floor(t / 400) + i) % 5) rect(c, (i * 47) % W, (i * 29) % alto, 1, 1, '#F4EFE6');
}
function brillo(c, x, y, r, col, a = 0.3) { c.globalAlpha = a; disc(c, Math.round(x), Math.round(y), r, col); c.globalAlpha = 1; }
function llamas(c, cx, base, ancho, alto, t) {
  for (let i = -ancho; i <= ancho; i++) {
    const h = Math.max(1, Math.round(alto * (1 - Math.abs(i) / (ancho + 1)) + Math.sin(t / 70 + i * 1.9) * 2));
    rect(c, cx + i, base - h, 1, h, '#E2653F'); rect(c, cx + i, base - h * 0.6, 1, h * 0.6, '#FFB347');
    if (h > 4) rect(c, cx + i, base - h * 0.3, 1, h * 0.3, '#FFF7BF');
  }
}
function escenario(c, t, telon = '#7F1F2F') {
  rect(c, 0, 0, W, H, '#140F24');
  for (let x = 0; x < 30; x += 4) { rect(c, x, 0, 3, 60, telon); rect(c, W - 3 - x, 0, 3, 60, telon); }
  rect(c, 0, 0, W, 6, telon); for (let x = 0; x < W; x += 8) disc(c, x + 4, 6, 3, telon);
  rect(c, 0, 60, W, 20, '#4F2F1F'); for (let x = 0; x < W; x += 12) rect(c, x, 60, 1, 20, '#3F2317'); rect(c, 0, 60, W, 1, '#8F5F37');
  // el foco
  c.globalAlpha = 0.18; c.fillStyle = '#FFF7BF';
  for (let y = 0; y < 66; y++) { const half = 6 + y * 0.45; c.fillRect(Math.round(80 - half), y, Math.round(half * 2), 1); }
  c.globalAlpha = 0.3; disc(c, 80, 66, 20, '#FFF7BF'); c.globalAlpha = 1;
}
const PLANOS = {
  // el toro del cartel, en el cerro (feria)
  toro: (c, fase, t) => planoToro(c, fase, t),
  // Charmeleon y Charizard, sentados de espaldas en el tejado al atardecer, con las colas encendidas
  tejado(c, fase, t, { guest, chari }) {
    cieloDe(c, ['#2F2757', '#4F2F6F', '#7F3F6F', '#BF5F5F', '#E2834F', '#F7B35F'], 60);
    estrellitas(c, t, 10, 18);
    disc(c, 34, 50, 9, '#FFD27A');
    c.fillStyle = '#3F2F57';
    for (let x = 0; x < W; x++) { const h = Math.round(10 + 6 * Math.sin(x / 15) + 3 * Math.sin(x / 6)); c.fillRect(x, 56 - h, 1, h); }
    // el tejado de tejas, de lado a lado
    for (let y = 56; y < H; y++) for (let x = 0; x < W; x += 6) rect(c, x + ((y >> 2) % 2) * 3, y, 5, 1, (y >> 2) % 2 ? '#9F3F2F' : '#7F2F23');
    rect(c, 0, 56, W, 1, '#100C14');
    rect(c, 132, 38, 8, 18, '#100C14'); rect(c, 133, 39, 6, 17, '#7F7F8F');
    for (let i = 0; i < 3; i++) { const k = ((t / 2200) + i / 3) % 1; brillo(c, 136 + k * 6, 36 - k * 20, 2 + k * 3, '#C7C3D3', 0.5 * (1 - k)); }
    const pulso = 0.25 + 0.1 * Math.sin(t / 300);
    for (const x of [66, 94]) brillo(c, x, 52, 8, '#FFB347', pulso);
    // sentados, quietos, mirando el atardecer (solo se les mueve la luz de la cola)
    actorEn(c, chari, 66, 60, 1, t, { dir: DIR.up, quieto: true });
    actorEn(c, guest, 94, 60, 1, t, { dir: DIR.up, quieto: true });
  },

  // la canción entera de Jigglypuff: el foco, el micro y Charizard cabeceando de sueño
  concierto(c, fase, t, { guest, chari, manolo }) {
    escenario(c, t, '#5F1F4F');
    rect(c, 79, 30, 2, 22, '#9F9AA7'); disc(c, 80, 29, 2, '#5F5A67');
    actorEn(c, guest, 80, 56, 1.5, t);
    for (let i = 0; i < 3; i++) { const q = ((t / 1600) + i / 3) % 1; c.globalAlpha = 1 - q; pinta(c, 'nota', 92 + i * 10 + Math.sin(q * 7) * 3, 34 - q * 26, i % 2 ? '#F7A7C7' : '#FFD27A'); }
    c.globalAlpha = 1;
    // en primera fila, de espaldas, Manolo y Charizard aguantando el sueño: cabecean, se les cierran los ojos y vuelven
    const cabeceo = (fase0) => { const q = ((t / 1700) + fase0) % 1; return q < 0.7 ? Math.round(q / 0.7 * 4) : 0; };
    const dm = cabeceo(0), dc = cabeceo(0.45);
    rect(c, 0, 72, W, 8, '#1F1A22');
    actorEn(c, manolo, 58, 86 + dm, 1, t, { dir: DIR.up, quieto: true });
    actorEn(c, chari, 102, 86 + dc, 1, t, { dir: DIR.up, quieto: true });
    if (dm >= 3) pinta(c, 'zeta', 64, 52, '#F4EFE6');
    if (dc >= 3) pinta(c, 'zeta', 110, 50, '#F4EFE6');
  },

  // la hoguera de los apuntes de Psyduck, de noche: arden en cuatro colores
  hoguera(c, fase, t, { guest, chari }) {
    cieloDe(c, ['#0F1324', '#151B33', '#1B2240'], 58);
    estrellitas(c, t, 18, 50);
    // una estrella fugaz que cruza el cielo de vez en cuando
    const fug = (t % 4200) / 900;
    if (fug < 1) for (let i = 0; i < 8; i++) { c.globalAlpha = (1 - i / 8) * (1 - fug * 0.5); rect(c, Math.round(20 + fug * 90 - i * 3), Math.round(8 + fug * 16 - i * 0.6), 2, 1, '#FFF7BF'); }
    c.globalAlpha = 1;
    rect(c, 0, 58, W, 22, '#1F2B23');
    brillo(c, 80, 62, 26, '#E2653F', 0.18); brillo(c, 80, 62, 14, '#FFB347', 0.2);
    rect(c, 68, 62, 24, 3, '#4F2F1F'); rect(c, 70, 64, 20, 2, '#3F2317');
    llamas(c, 80, 63, 9, 20, t);
    const COL = ['#F7577F', '#FFD27A', '#6F9F4F', '#4F8FDF'];
    for (let i = 0; i < 10; i++) {
      const q = ((t / 2600) + i / 10) % 1;
      c.globalAlpha = 1 - q;
      rect(c, Math.round(76 + Math.sin(q * 9 + i) * 10 + (i % 3) * 3), Math.round(46 - q * 44), 3, 2, q > 0.6 ? '#5F5A67' : COL[i % 4]);
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 6; i++) if ((Math.floor(t / 90) + i) % 4 === 0) rect(c, 72 + i * 3, 30 - (i * 7) % 14, 1, 1, '#FFF7BF');
    actorEn(c, guest, 42, 70, 1, t, { dir: DIR.right, quieto: true });
    actorEn(c, chari, 122, 70, 1, t, { dir: DIR.left, quieto: true });
  },

  // el cante de Gengar: un tablao con farolillos, palmas y Charizard llevando el compás con la cola
  tablao(c, fase, t, { guest, chari, k }) {
    escenario(c, t, '#7F1F2F');
    guirnalda(c, 24, 12, 136, 12, 5, t, ['#FFD27A', '#F7577F', '#FFB347']);
    actorEn(c, guest, 80, 70, Math.min(1.5, k), t);
    actorEn(c, chari, 28, 72, 1, t, { dir: DIR.downRight });
    if (Math.floor(t / 280) % 2) for (const [x, y] of [[62, 40], [98, 42]]) pinta(c, 'estrella', x, y, '#FFF7BF');
    if (Math.floor(t / 280) % 2 === 0) { rect(c, 36, 74, 3, 1, '#C7C3D3'); rect(c, 40, 73, 2, 1, '#C7C3D3'); }
    for (let i = 0; i < 2; i++) { const q = ((t / 1400) + i / 2) % 1; c.globalAlpha = 1 - q; pinta(c, 'nota', 104 + i * 12, 34 - q * 24, '#FFD27A'); }
    c.globalAlpha = 1;
  },
  // la copla de Jynx: el mantón de flecos detrás, el foco y las castañuelas
  copla(c, fase, t, { guest, k }) {
    escenario(c, t, '#3F1F4F');
    // el mantón colgado al fondo, con sus flores y sus flecos
    for (let y = 0; y < 28; y++) { const half = 44 - y * 1.5; rect(c, 80 - half, 10 + y, half * 2, 1, '#C73F2F'); }
    for (const [x, y] of [[60, 16], [80, 22], [100, 16], [70, 28], [90, 28]]) { disc(c, x, y, 3, '#FFD27A'); rect(c, x - 1, y - 1, 2, 2, '#F7577F'); }
    for (let x = 38; x < 122; x += 3) rect(c, x, 10 + Math.max(0, 28 - Math.abs(x - 80) / 1.5) | 0, 1, 4, '#FFD27A');
    actorEn(c, guest, 80, 70, Math.min(1.5, k), t);
    // las castañuelas, a golpe de compás
    if (Math.floor(t / 200) % 3 === 0) { for (const x of [58, 102]) { rect(c, x, 46, 3, 2, '#7F4F2F'); rect(c, x + 1, 45, 1, 1, '#100C14'); } }
    for (let i = 0; i < 2; i++) { const q = ((t / 1500) + i / 2) % 1; c.globalAlpha = 1 - q; pinta(c, 'nota', 112 + i * 10, 40 - q * 26, '#FFD27A'); }
    c.globalAlpha = 1;
  },

  // el duelo de Magmar: la parrilla de cerca, con la chistorra negra carbón y la dorada de Charizard
  parrilla(c, fase, t) {
    rect(c, 0, 0, W, H, '#1F1A22');
    brillo(c, 80, 70, 60, '#E2653F', 0.22);
    for (let x = 6; x < W - 6; x += 3) rect(c, x, 60 + Math.round(Math.sin(x + t / 200) * 1), 2, 2, Math.sin(x * 3 + t / 150) > 0 ? '#FFB347' : '#E2653F');
    for (let y = 34; y <= 54; y += 4) rect(c, 10, y, W - 20, 1, '#9F9AA7');
    rect(c, 10, 34, 1, 21, '#5F5A67'); rect(c, W - 11, 34, 1, 21, '#5F5A67');
    // la de Magmar, carbón con ceniza, humeando
    rect(c, 22, 40, 50, 9, '#100C14'); rect(c, 23, 41, 48, 7, '#2F2626');
    for (let i = 0; i < 9; i++) rect(c, 26 + i * 5, 42 + (i % 2) * 3, 2, 1, '#5F5A67');
    for (let i = 0; i < 4; i++) { const q = ((t / 1800) + i / 4) % 1; brillo(c, 30 + i * 11 + Math.sin(q * 6) * 3, 36 - q * 30, 2 + q * 4, '#7F7F8F', 0.5 * (1 - q)); }
    // la de Charizard, dorada, con su brillo
    rect(c, 88, 40, 50, 9, '#100C14'); rect(c, 89, 41, 48, 7, '#C7772F'); rect(c, 89, 41, 48, 2, '#E7A75F');
    for (let i = 0; i < 6; i++) rect(c, 92 + i * 8, 44, 3, 1, '#8F4F1F');
    if (Math.floor(t / 300) % 2) pinta(c, 'estrella', 128, 34, '#FFF7BF');
  },
  // el posado de Machoke a la luz de la luna, en silueta, en la ventana
  posado(c, fase, t, { guest, k, postura }) {
    rect(c, 0, 0, W, H, '#2F1F17');
    rect(c, 30, 4, 100, 64, '#100C14'); rect(c, 32, 6, 96, 60, '#1B2240');
    estrellitas(c, t, 10, 60);
    disc(c, 80, 34, 24, '#E7E7EF'); disc(c, 80, 34, 22, '#F4EFE6'); disc(c, 72, 28, 4, '#E7E7EF'); disc(c, 88, 40, 3, '#E7E7EF');
    rect(c, 79, 6, 2, 60, '#100C14'); rect(c, 32, 35, 96, 2, '#100C14');
    for (let y = 4; y < 70; y += 3) { rect(c, 18 + (y % 6 ? 1 : 0), y, 12, 3, '#7F2F23'); rect(c, 130 - (y % 6 ? 1 : 0), y, 12, 3, '#7F2F23'); }
    // marcando bíceps (su animación de cargar fuerza), en silueta contra la luna; si aún no ha cargado, quieto
    if (postura) siluetaEn(c, postura, 80, 66, Math.min(1.5, k), t, { dir: DIR.down });
    else siluetaEn(c, guest, 80, 66, Math.min(1.5, k), t, { quieto: true });
    for (let i = 0; i < 4; i++) if ((Math.floor(t / 250) + i) % 3 === 0) pinta(c, 'estrella', 50 + i * 20, 12 + (i % 2) * 40, '#FFF7BF');
    rect(c, 26, 66, 108, 4, '#6F4527'); rect(c, 26, 66, 108, 1, '#9F6A3F');
  },

  // el brindis de la boda de los Nidoran: banderines, la tarta de tres pisos y confeti
  boda(c, fase, t, { guest }) {
    cieloDe(c, ['#97C3E7', '#B7E3F7', '#F7D7A7'], 60);
    guirnalda(c, 0, 6, W, 8, 5, t, ['#F7577F', '#F4EFE6', '#FFD27A', '#9FD7FF'], 6, true);
    rect(c, 0, 60, W, 20, '#579F5F');
    // el arco de flores, con los novios debajo
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.12) {
      const x = Math.round(62 + Math.cos(a) * 30), y = Math.round(64 + Math.sin(a) * 40);
      disc(c, x, y, 2, Math.round(a * 10) % 3 ? '#F7A7C7' : '#F4EFE6'); rect(c, x, y, 1, 1, '#FFD27A');
    }
    rect(c, 31, 26, 2, 40, '#6F9F4F'); rect(c, 91, 26, 2, 40, '#6F9F4F');
    // la tarta de tres pisos, a la derecha
    rect(c, 106, 56, 44, 4, '#100C14'); rect(c, 107, 56, 42, 3, '#F4EFE6');
    for (const [w, y] of [[24, 46], [18, 38], [12, 31]]) { rect(c, 128 - w / 2 - 1, y - 1, w + 2, 10, '#100C14'); rect(c, 128 - w / 2, y, w, 9, '#F7E7F7'); rect(c, 128 - w / 2, y + 6, w, 1, '#F7A7C7'); }
    rect(c, 127, 25, 2, 5, '#F4EFE6'); llamas(c, 128, 25, 1, 3, t);
    // los novios, frente a frente; cada poco se acercan y se dan un beso
    const beso = (t % 2400) < 900;
    const d = beso ? 2 : 0;
    actorEn(c, guest, 52 + d, 66, 1, t, { dir: DIR.right, solo: true, quieto: true });
    actorEn(c, guest.buddy, 72 - d, 66, 1, t, { dir: DIR.left, quieto: true });
    rect(c, 69 - d, 38, 8, 2, '#F4EFE6'); c.globalAlpha = 0.6; rect(c, 72 - d, 40, 6, 12, '#F4EFE6'); c.globalAlpha = 1;   // el velo de la novia
    if (beso) pinta(c, 'corazon', 60, 34 - Math.floor((t % 2400) / 150), '#F7577F');
    efecto(c, { tipo: 'confeti' }, t, { x: 80, y: 20, h: 20 });
  },

};

function counterFront(c) {
  // la barra del mostrador, por delante de todo
  rect(c, 0, BAR, W, H - BAR, '#6F4527');
  rect(c, 0, BAR - 3, W, 4, '#100C14'); rect(c, 0, BAR - 3, W, 3, '#BF8757'); rect(c, 0, BAR - 3, W, 1, '#D7A777');
  for (let x = 6; x < W; x += 38) { rect(c, x, BAR + 4, 30, H - BAR - 8, '#9F6A3F'); rect(c, x, BAR + 4, 30, 1, '#BF8757'); }
  // libro de visitas y timbre sobre la barra
  rect(c, 98, BAR - 7, 16, 4, '#100C14'); rect(c, 99, BAR - 7, 14, 3, '#C73F2F'); rect(c, 99, BAR - 6, 14, 1, '#F4EFE6');
  rect(c, 124, BAR - 8, 7, 5, '#100C14'); rect(c, 125, BAR - 7, 5, 4, '#DFAF3F'); rect(c, 125, BAR - 7, 1, 1, '#FFF7BF');
  rect(c, 127, BAR - 9, 1, 1, '#100C14');
}

// Filas y columnas con píxeles del primer fotograma (mirando de frente); se mide una vez por hoja
const medidas = new WeakMap();
function measure(img, fw, fh) {
  if (!medidas.has(img)) medidas.set(img, medir(img, fw, fh));
  return medidas.get(img);
}
function medir(img, fw, fh) {
  const cv = document.createElement('canvas');
  cv.width = fw; cv.height = fh;
  const x = cv.getContext('2d');
  x.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);
  const d = x.getImageData(0, 0, fw, fh).data;
  let top = fh, bottom = 0;
  for (let y = 0; y < fh; y++) for (let i = 0; i < fw; i++) if (d[(y * fw + i) * 4 + 3] > 0) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  // y lo que llega a ocupar en todos los fotogramas (las alas de Articuno al batir), para que quepa
  const n = Math.max(1, Math.floor(img.width / fw));
  const all = document.createElement('canvas'); all.width = fw * n; all.height = fh;
  const ax = all.getContext('2d'); ax.drawImage(img, 0, 0, fw * n, fh, 0, 0, fw * n, fh);
  const da = ax.getImageData(0, 0, fw * n, fh).data;
  let alto = 0, ancho = 0;
  for (let f = 0; f < n; f++) {
    let t = fh, b = 0, l = fw, r = 0;
    for (let y = 0; y < fh; y++) for (let i = 0; i < fw; i++) if (da[(y * fw * n + f * fw + i) * 4 + 3] > 0) { t = Math.min(t, y); b = Math.max(b, y); l = Math.min(l, i); r = Math.max(r, i); }
    alto = Math.max(alto, b - t); ancho = Math.max(ancho, r - l);
  }
  return { top, bottom, alto, ancho };
}

// Lágrimas a chorro, dos regueros que caen desde los ojos (por delante del huésped)
function tears(c, t, { x, y, sep }) {
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const k = ((t / 700) + i / 4 + (s > 0 ? 0.12 : 0)) % 1;
    const dx = x + s * (sep + k * 6), dy = y + k * 22 + k * k * 10;
    c.globalAlpha = 1 - k * 0.6;
    c.fillStyle = '#100C14'; c.fillRect(Math.round(dx) - 1, Math.round(dy) - 1, 4, 5);
    c.fillStyle = k < 0.15 ? '#FFFFFF' : '#6FB7FF'; c.fillRect(Math.round(dx), Math.round(dy), 2, 3);
    c.fillStyle = '#BFE7FF'; c.fillRect(Math.round(dx), Math.round(dy), 1, 1);
  }
  c.globalAlpha = 1;
}

// Qué queda de la tormenta en la guerra de los pájaros (cada nodo puede cambiarlo con «cielo»)
let CIELO = new Set(['nieve', 'fuego', 'rayo']);

// Los efectos de las animaciones de los eventos, en pixel art: corazones, Zzz, chispas, confeti…
// (cab: lo alto del que la hace, en píxeles de la vista; ms: desde que empezó)
const DIBUJO = {
  corazon: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  nota: ['..XX', '..XX', '..X.', 'XXX.', 'XX..'],
  zeta: ['XXXX', '..X.', '.X..', 'XXXX'],
  estrella: ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],
  gota: ['.X.', 'XXX', 'XXX', '.X.'],
  enfado: ['X.X.X', '.....', 'X...X', '.....', 'X.X.X'],
};
function pinta(c, forma, x, y, col, borde = '#100C14') {
  const rows = DIBUJO[forma];
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = borde;
  rows.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch === 'X') { c.fillRect(x + dx - 1, y + dy, 3, 1); c.fillRect(x + dx, y + dy - 1, 1, 3); } }));
  c.fillStyle = col;
  rows.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch === 'X') c.fillRect(x + dx, y + dy, 1, 1); }));
}
function efecto(c, fx, ms, cab) {
  if (!cab) return;
  const { x, y, h } = cab;
  const ciclo = (n, per) => [...Array(n)].map((_, i) => ((ms / per) + i / n) % 1);
  switch (fx.tipo) {
    case 'duerme':
      ciclo(3, 1800).forEach(k => { c.globalAlpha = 1 - k; pinta(c, 'zeta', x + 6 + k * 14, y - 2 - k * 16, '#F4EFE6'); });
      break;
    case 'corazones':
      ciclo(4, 1600).forEach((k, i) => { c.globalAlpha = 1 - k * 0.8; pinta(c, 'corazon', x - 12 + i * 7 + Math.sin(k * 6 + i) * 3, y + 4 - k * 22, '#F7577F'); });
      break;
    case 'notas':
      ciclo(3, 1500).forEach((k, i) => { c.globalAlpha = 1 - k * 0.8; pinta(c, 'nota', x + (i % 2 ? 10 : -14) + Math.sin(k * 8) * 3, y + 2 - k * 20, i % 2 ? '#FFD27A' : '#9FD7FF'); });
      break;
    case 'estrellas':
      ciclo(5, 1200).forEach((k, i) => { c.globalAlpha = Math.sin(k * Math.PI); pinta(c, 'estrella', x + Math.cos(i * 1.3) * (12 + i * 2), y + h * 0.4 + Math.sin(i * 2.1) * h * 0.5, '#FFF7BF'); });
      break;
    case 'sudor':
      pinta(c, 'gota', x + 9, y + 2 + (ms % 1400) / 1400 * 8, '#6FB7FF');
      break;
    case 'enfado':
      if (ms % 900 < 600) pinta(c, 'enfado', x + 8, y - 2, '#E2453F', '#7F1F17');
      break;
    case 'chispas':
      for (let i = 0; i < 4; i++) {
        if ((Math.floor(ms / 90) + i) % 3) continue;
        const a = i * 1.7 + Math.floor(ms / 270);
        let px = x + Math.cos(a) * 14, py = y + h * 0.5 + Math.sin(a) * h * 0.5;
        c.fillStyle = i % 2 ? '#FFF7BF' : '#FFD23F';
        for (let j = 0; j < 4; j++) { c.fillRect(Math.round(px), Math.round(py), 2, 2); px += j % 2 ? 2 : -2; py += 2; }
      }
      break;
    case 'fuego':
      ciclo(8, 700).forEach((k, i) => {
        const r = Math.max(1, Math.round(3 * (1 - k)));
        c.fillStyle = k < 0.3 ? '#FFF7BF' : k < 0.6 ? '#FFB347' : '#E2653F';
        c.fillRect(Math.round(x + 6 + k * 26), Math.round(y + h * 0.3 + Math.sin(i * 2.4) * k * 6 - k * 6), r, r);
      });
      break;
    case 'agua':
      ciclo(8, 900).forEach((k, i) => {
        const a = -Math.PI / 2 + (i - 3.5) * 0.35;
        const ax = Math.round(x + Math.cos(a) * k * 22), ay = Math.round(y + Math.sin(a) * k * 22 + k * k * 20);
        c.fillStyle = '#1F3F6F'; c.fillRect(ax - 1, ay - 1, 4, 4);
        c.fillStyle = i % 2 ? '#9FDFEF' : '#4F8FDF'; c.fillRect(ax, ay, 2, 2);
      });
      break;
    case 'humo':
      ciclo(4, 1600).forEach((k, i) => { c.globalAlpha = 0.85 * (1 - k); disc(c, Math.round(x - 6 + i * 4 + k * 4), Math.round(y + 4 - k * 18), 3 + Math.round(k * 4), '#5F5A67'); disc(c, Math.round(x - 6 + i * 4 + k * 4), Math.round(y + 4 - k * 18), 2 + Math.round(k * 4), '#9F9AA7'); });
      break;
    case 'flash': {
      const k = (ms % 2200) / 350;
      if (k < 1) { c.globalAlpha = 0.8 * (1 - k); c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H); }
      break;
    }
    case 'confeti': {
      const COL = ['#F7577F', '#FFD27A', '#6F9F4F', '#4F8FDF', '#B77FDF', '#F4EFE6'];
      for (let i = 0; i < 26; i++) {
        const k = ((ms / 2400) + (i * 37 % 26) / 26) % 1;
        c.fillStyle = COL[i % COL.length];
        c.fillRect(Math.round((i * 53) % W + Math.sin(k * 9 + i) * 4), Math.round(k * (H + 6)) - 4, 2, Math.floor(ms / 120 + i) % 2 ? 2 : 1);
      }
      break;
    }
  }
  c.globalAlpha = 1;
}

export function createCounter(canvas) {
  const c = canvas.getContext('2d');
  let guest = null, chari = null, fase = 'noche', running = false, speaking = null, hopUntil = 0, guestScale = 2, drawn = 0;
  let llora = false, ojos = null;   // si el huésped está llorando y dónde tiene los ojos
  let lugar = 'dentro';   // 'dentro' (mostrador), 'fuera' (frente al pino) o 'estanque'
  let decor = null;       // el decorado del evento (las excursiones), si lo hay
  let sinSombrero = false; // en el Oeste, cuando se lo quita (o se le vuela)
  let plano = null;        // un plano corto a pantalla completa (el toro, el tejado, la hoguera…), si lo hay
  let manolo = null;       // Manolo, que solo sale en algún plano (en el mostrador es quien mira)
  const posturas = {};     // animaciones de más para algún plano (el bíceps de Machoke), por sprite

  const ANIMS = ['Idle', 'Hop', 'Sleep'];
  let guestSprite = null, cabeza = null, fx = null;   // fx: la animación del momento («anim» de un nodo)

  async function open({ sprite, buddy = null, fase: f, lugar: l = 'dentro', escenario = null }) {
    fase = f;
    lugar = l;
    decor = ESCENARIO[escenario] ? escenario : null;
    CIELO = new Set(['nieve', 'fuego', 'rayo']);   // cada evento empieza con la tormenta entera
    plano = null;
    fx = null;
    llora = false;
    const cs = await loadSprite('0006', ANIMS);
    if (!manolo) loadSprite('manolo', ['Idle', 'Sleep']).then(s => { manolo = new Actor(s, { dir: DIR.up }); }).catch(() => {});
    guestSprite = null;
    await setGuest(sprite, buddy);
    chari = new Actor(cs, { x: lugar === 'dentro' ? 26 : 38, y: lugar === 'dentro' ? BAR + 10 : 70, dir: DIR.downRight });
    const ci = cs.anims.Idle; chari.ajuste = 6 + ci.fh / 2 - measure(ci.img, ci.fw, ci.fh).bottom;
    if (!running) { running = true; requestAnimationFrame(frame); }
    resize();
  }

  // Pone delante a un huésped (en los grupos, al miembro que habla en cada momento)
  // «pequeno»: el pequeño del grupo (el hijo junto a su padre), un poco más chico; «lado»: de perfil
  // (a Omanyte y Omastar, de frente, no se les ve la cara)
  async function setGuest(sprite, buddy = null, { pequeno = false, lado = false } = {}) {
    if (!sprite || sprite === guestSprite) return;
    guestSprite = sprite;
    const gs = await loadSprite(sprite, ANIMS);
    if (guestSprite !== sprite) return;   // mientras cargaba ya se ha pedido otro
    // el huésped va en primer plano: a ×2 si cabe, a ×1 si es muy grande (Gengar flota alto).
    // Se mide su cuerpo real para que asome de la barra siempre igual.
    const a = gs.anims.Idle, body = measure(a.img, a.fw, a.fh);
    // fuera se le ve entero, de pie en el césped (o en el agua del estanque)
    const ground = lugar === 'dentro' ? BAR + 9 : lugar === 'estanque' ? 74 : 72;
    const cabe = lugar === 'dentro' ? 58 : 62;
    // a ×2 si cabe; si no, a ×1; los enormes (Articuno con las alas abiertas), aún más pequeños
    let scale = [2, 1, 0.75, 0.5].find(k => (body.bottom - body.top) * k <= cabe && (k < 2 || body.alto * k <= cabe + 6) && body.alto * k <= 70 && body.ancho * k <= 96) || 0.5;
    if (pequeno) scale = scale === 2 ? 1.5 : scale * 0.75;
    const feetY = ground / scale + 6 + a.fh / 2 - body.bottom;
    const g = new Actor(gs, { x: (lugar === 'dentro' ? 84 : 80) / scale - (buddy ? 9 : 0), y: feetY, dir: lado ? DIR.downLeft : DIR.down });
    await addBuddy(g, buddy, ANIMS);
    if (guestSprite !== sprite) return;
    g.ajuste = 6 + a.fh / 2 - body.bottom;   // de los pies de verdad al punto de apoyo del fotograma (para los planos)
    guest = g;
    guestScale = scale;
    // a un tercio de la cabeza, más o menos: de ahí caen las lágrimas
    ojos = { x: g.x * scale, y: (feetY - 6 - a.fh / 2 + body.top + (body.bottom - body.top) * 0.3) * scale, sep: Math.min(10, (body.bottom - body.top) * 0.18) * scale };
    cabeza = { x: g.x * scale, y: (feetY - 6 - a.fh / 2 + body.top) * scale, h: (body.bottom - body.top) * scale };
  }

  function close() { running = false; }

  // Quién habla y con qué cara: el que habla contento da un saltito. «anim»: la animación del
  // momento (se duerme, baila, chispas…), sobre el que habla o sobre otro («otro»: su sprite)
  function speak(who, emotion, anim = null, otro = null) {
    speaking = who;
    if (otro && otro !== '0006') setGuest(otro);
    fx = anim ? { tipo: anim, t0: performance.now(), sobre: otro === '0006' || (!otro && who === 'charizard') ? 'chari' : 'guest' } : null;
    if (anim) { llora = false; return; }
    if (who === 'huesped') llora = ['Crying', 'Sad', 'Teary-Eyed'].includes(emotion);
    const a = who === 'huesped' ? guest : who === 'charizard' ? chari : null;
    // los grandes (a ×1) no saltan: se saldrían del cuadro
    if (a && emotion === 'Happy' && a.sprite.anims.Hop && !(a === guest && guestScale === 1)) { a.anim = 'Hop'; hopUntil = performance.now() + 1200; }
  }

  function resize() {
    // hueco libre: hasta donde empieza el cuadro de diálogo (medido, que su alto cambia con el texto)
    const parent = canvas.parentElement, cs = getComputedStyle(parent);
    const dlg = document.querySelector('.actions .dialog');
    const libre = dlg?.offsetHeight ? dlg.getBoundingClientRect().top - parent.getBoundingClientRect().top : parent.clientHeight - parseFloat(cs.paddingBottom);
    const box = { width: parent.clientWidth - 16, height: libre - 16 };
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(box.width * dpr / W, box.height * dpr / H);
    const S = Math.max(1, fit >= 2 ? Math.floor(fit * 4) / 4 : Math.floor(fit));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    canvas.style.width = `${W * S / dpr}px`;
    canvas.style.height = `${H * S / dpr}px`;
  }

  // un fallo en un fotograma se apunta y se sigue: que no se quede congelado el mostrador
  function frame(t) {
    if (!running) return;
    try { drawFrame(t); } catch (err) { console.error('[mostrador]', err); }
    requestAnimationFrame(frame);
  }

  function drawFrame(t) {
    if (t - drawn < 30) return;   // ~30 fps bastan
    drawn = t;
    // un plano aparte (el toro en el cerro): ocupa toda la escena y luego se vuelve a donde estábamos
    if (plano && PLANOS[plano]) {
      c.imageSmoothingEnabled = false;
      PLANOS[plano](c, fase, t, { guest, chari, manolo, k: guestScale, postura: postura(guest, plano) });
      return;
    }
    if (lugar === 'dentro') backdrop(c, fase, t);
    else outside(c, fase, t, lugar === 'estanque' || decor === 'acuatico');
    if (decor) ESCENARIO[decor](c, t, fase);
    const now = performance.now();
    if (now > hopUntil) for (const a of [guest, chari]) if (a && (a.anim === 'Hop' || a.anim === 'Sleep')) a.anim = 'Idle';
    c.imageSmoothingEnabled = false;
    const blanco = fx && (fx.sobre === 'chari' ? chari : guest);
    // quien habla: Charizard, o el huésped (que en los grupos es el miembro que tiene la palabra)
    const hablante = speaking === 'charizard' ? chari : speaking === 'manolo' ? null : guest;
    for (const a of [chari, guest]) {
      if (!a) continue;
      // el que no habla queda un poco en sombra (salvo el que hace la animación)
      c.globalAlpha = hablante && a !== hablante && a !== blanco ? 0.75 : 1;
      const k = a === guest ? guestScale : 1;
      const [dx, dy, dir] = a === blanco ? mover(a, now - fx.t0) : [0, 0, null];
      const x0 = a.x, y0 = a.y, d0 = a.dir;
      a.x += dx / k; a.y += dy / k;
      if (dir != null) a.dir = dir;
      if (a === guest) { c.save(); c.scale(guestScale, guestScale); a.draw(c, t); c.restore(); }
      else a.draw(c, t);
      a.x = x0; a.y = y0; a.dir = d0;
      c.globalAlpha = 1;
      // en el Oeste, los dos van con su sombrero de vaquero puesto
      if (a === guest && decor === 'oeste' && cabeza && !sinSombrero) sombrero(c, cabeza.x + dx, cabeza.y + dy, guestScale);
    }
    if (llora && ojos) tears(c, t, ojos);
    if (lugar === 'dentro') counterFront(c);
    if (fx) efecto(c, fx, now - fx.t0, fx.sobre === 'chari' ? { x: chari.x, y: chari.y - 30, h: 24 } : cabeza);
  }

  // Algunos planos usan una animación que no se carga siempre (Machoke marcando bíceps): se pide la primera vez
  function postura(a, p) {
    const pide = { posado: 'Charge' }[p];
    if (!pide || !a) return null;
    const id = a.sprite.id, key = `${id}:${pide}`;
    if (!(key in posturas)) {
      posturas[key] = null;
      loadSprite(id, ['Idle', pide]).then(s => { posturas[key] = s.anims[pide] ? new Actor(s, { anim: pide }) : null; }).catch(() => {});
    }
    if (posturas[key]) posturas[key].ajuste = a.ajuste;
    return posturas[key];
  }

  // Lo que se mueve el que hace la animación: [dx, dy, dirección] en píxeles de la vista
  function mover(a, ms) {
    const tipo = fx.tipo;
    if (tipo === 'duerme' && a.sprite.anims.Sleep) a.anim = 'Sleep';
    else if (a.anim === 'Sleep' || (a.anim === 'Hop' && performance.now() > hopUntil)) a.anim = 'Idle';
    if (tipo === 'baila') return [Math.round(Math.sin(ms / 160) * 3), -Math.round(Math.abs(Math.sin(ms / 160)) * 4), Math.floor(ms / 320) % 2 ? DIR.downLeft : DIR.downRight];
    if (tipo === 'gira') return [0, 0, [DIR.down, DIR.downRight, DIR.right, DIR.upRight, DIR.up, DIR.upLeft, DIR.left, DIR.downLeft][Math.floor(ms / 90) % 8]];
    if (tipo === 'vuela') { const s2 = ms / 1000; return [0, s2 < 1 ? -Math.round(s2 * 90) : s2 < 2.6 ? -90 : s2 < 3.6 ? -Math.round((3.6 - s2) * 90) : 0, s2 < 3.6 ? DIR.up : null]; }
    if (tipo === 'salta') { const k = (ms % 1400) / 600; return [0, k < 1 ? -Math.round(Math.sin(k * Math.PI) * 14) : 0, null]; }
    if (tipo === 'tiembla' || (tipo === 'enfado' && ms % 900 < 300)) return [Math.floor(ms / 40) % 2 ? 1 : -1, 0, null];
    if (tipo === 'duerme' && !a.sprite.anims.Sleep) return [0, 2, null];
    return [0, 0, null];
  }

  window.addEventListener('resize', () => running && resize());
  return { open, close, speak, setGuest, sombrero: puesto => { sinSombrero = !puesto; }, plano: p => { plano = p || null; },
    cielo: lista => { CIELO = new Set(lista); } };
}
