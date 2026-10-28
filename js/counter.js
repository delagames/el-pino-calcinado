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
  else disc(c, fase === 'tarde' ? 140 : fase === 'manana' ? 26 : 90, fase === 'tarde' ? 40 : 12, 4, '#FFF3C7');
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
  },
  // el ballet acuático: banderines azules y blancos sobre el estanque, y surtidores
  acuatico(c, t) {
    guirnalda(c, 20, 10, 122, 12, 6, t, ['#4F8FDF', '#F4EFE6', '#9FDFEF'], 6, true);
    for (const x of [44, 116]) for (let i = 0; i < 4; i++) {
      const k = ((t / 600) + i / 4) % 1;
      rect(c, x + Math.round((i - 1.5) * k * 6), Math.round(66 - Math.sin(k * Math.PI) * 14), 2, 2, i % 2 ? '#9FDFEF' : '#F4EFE6');
    }
  },
  // el Oeste: cactus, cartel del saloon y un matojo que rueda
  oeste(c, t) {
    arte(c, ['...LL...', '...GL...', 'L..GL...', 'GL.GL.LL', 'GL.GL.GL', 'GLLGLLGL', '.GGGGGG.', '...GL...', '...GL...', '...GL...', '...GL...', '...GL...'], 100, 46, { L: '#3F6F3F', G: '#6F9F4F' });
    rect(c, 26, 38, 1, 20, '#6F4527'); rect(c, 36, 38, 1, 20, '#6F4527');
    rect(c, 24, 34, 15, 7, '#100C14'); rect(c, 25, 35, 13, 5, '#B7834F');
    for (let i = 0; i < 4; i++) rect(c, 27 + i * 3, 37, 2, 1, '#4F2F1F');
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
    rect(c, 30, 54, 5, 4, '#7F7F4F'); rect(c, 31, 53, 3, 1, '#9F9F6F');
  },
  // la visita del Team Rocket: el globo con cara de gato y un cartel con la R
  visitasrocket(c, t) {
    const y = 8 + Math.round(Math.sin(t / 700) * 2), x = 98;
    disc(c, x, y + 6, 8, '#100C14'); disc(c, x, y + 6, 7, '#F2DCA0');
    rect(c, x - 7, y - 2, 3, 3, '#F2DCA0'); rect(c, x + 5, y - 2, 3, 3, '#F2DCA0');
    disc(c, x, y + 2, 2, '#DFAF3F'); rect(c, x - 3, y + 6, 1, 2, '#100C14'); rect(c, x + 3, y + 6, 1, 2, '#100C14');
    rect(c, x - 3, y + 15, 1, 6, '#100C14'); rect(c, x + 3, y + 15, 1, 6, '#100C14'); rect(c, x - 4, y + 21, 9, 4, '#8F5F37');
    rect(c, 28, 30, 13, 15, '#100C14'); rect(c, 29, 31, 11, 13, '#F4EFE6');
    arte(c, ['XXXX.', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'], 32, 34, { X: '#C73F2F' });
    rect(c, 34, 45, 1, 13, '#6F4527');
  },
  // el dojo: tatami en el césped, saco de boxeo colgado del pino y el cartel con el círculo rojo
  dojo(c, t) {
    rect(c, 50, 59, 56, 6, '#100C14'); rect(c, 51, 59, 54, 5, '#C7B76F'); for (let x = 51; x < 105; x += 9) rect(c, x, 59, 1, 5, '#8F7F3F');
    const sw = Math.round(Math.sin(t / 500) * 2);
    rect(c, 26, 22, 1, 8, '#4F4F57'); rect(c, 24 + sw, 30, 6, 14, '#100C14'); rect(c, 25 + sw, 31, 4, 12, '#C73F2F'); rect(c, 25 + sw, 31, 1, 12, '#E2653F');
    rect(c, 106, 36, 1, 22, '#6F4527'); rect(c, 100, 26, 13, 11, '#100C14'); rect(c, 101, 27, 11, 9, '#F4EFE6'); disc(c, 106, 31, 3, '#C73F2F');
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
    rect(c, 70, 14, 2, 44, '#6F4527'); rect(c, 64, 16, 14, 2, '#6F4527');
    guirnalda(c, 20, 18, 64, 17, 4, t, ['#100C14'], 8, true);
    guirnalda(c, 78, 17, 122, 20, 4, t, ['#100C14'], 8, true);
    if (Math.floor(t / 150) % 9 === 0) { rect(c, 66, 14, 2, 2, '#FFF7BF'); rect(c, 75, 18, 2, 2, '#FFD23F'); }
    rect(c, 98, 54, 12, 4, '#100C14'); rect(c, 99, 54, 10, 3, '#C73F2F'); rect(c, 102, 52, 4, 2, '#100C14');
    rect(c, 114, 51, 3, 7, '#F08F3F'); rect(c, 113, 57, 5, 1, '#F08F3F'); rect(c, 114, 54, 3, 1, '#F4EFE6');
  },
  // los fósiles: una excavación con huesos, el ámbar y la pala clavada
  fosiles(c) {
    for (let i = 0; i < 8; i++) rect(c, 94 - i * 2, 50 + i, 18 + i * 4, 1, i < 2 ? '#8F6037' : '#6F4527');
    rect(c, 90, 52, 6, 2, '#F4EFE6'); rect(c, 89, 51, 2, 1, '#F4EFE6'); rect(c, 95, 51, 2, 1, '#F4EFE6');
    rect(c, 102, 55, 4, 4, '#100C14'); rect(c, 103, 55, 2, 3, '#FFB347');
    disc(c, 110, 53, 3, '#100C14'); disc(c, 110, 53, 2, '#C7B78F'); rect(c, 109, 53, 2, 1, '#8F7F5F');
    rect(c, 116, 38, 1, 18, '#6F4527'); rect(c, 114, 50, 5, 6, '#9F9AA7');
  },
  // los pájaros legendarios: nubes, copos que caen y alguna pluma con chispa
  pajaros(c, t) {
    for (const [x, y] of [[40, 10], [92, 6], [70, 18]]) { const dx = Math.round(Math.sin(t / 2000 + x) * 3); disc(c, x + dx, y, 4, '#F4EFE6'); disc(c, x + dx + 5, y + 1, 3, '#F4EFE6'); disc(c, x + dx - 5, y + 1, 3, '#E7E7EF'); }
    for (let i = 0; i < 6; i++) { const k = ((t / 4000) + i / 6) % 1; rect(c, 28 + i * 16 + Math.round(Math.sin(k * 8) * 3), Math.round(k * 56), 1, 1, '#9FDFEF'); }
    for (let i = 0; i < 2; i++) { const k = ((t / 5000) + i / 2) % 1; const x = 50 + i * 40 + Math.round(Math.sin(k * 6) * 6), y = Math.round(k * 54);
      rect(c, x, y, 3, 1, i ? '#FFD23F' : '#4F8FDF'); rect(c, x + 1, y + 1, 3, 1, i ? '#FFD23F' : '#4F8FDF'); }
    if (Math.floor(t / 120) % 25 === 0) arte(c, ['.XX', 'XX.', '.XX', 'XX.'], 108, 8, { X: '#FFF7BF' });
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

// Filas y columnas con píxeles del primer fotograma (mirando de frente)
function measure(img, fw, fh) {
  const cv = document.createElement('canvas');
  cv.width = fw; cv.height = fh;
  const x = cv.getContext('2d');
  x.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);
  const d = x.getImageData(0, 0, fw, fh).data;
  let top = fh, bottom = 0;
  for (let y = 0; y < fh; y++) for (let i = 0; i < fw; i++) if (d[(y * fw + i) * 4 + 3] > 0) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  return { top, bottom };
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
        c.fillStyle = i % 2 ? '#9FDFEF' : '#4F8FDF';
        c.fillRect(Math.round(x + Math.cos(a) * k * 22), Math.round(y + Math.sin(a) * k * 22 + k * k * 20), 2, 2);
      });
      break;
    case 'humo':
      ciclo(4, 1600).forEach((k, i) => { c.globalAlpha = 0.7 * (1 - k); disc(c, Math.round(x - 6 + i * 4 + k * 4), Math.round(y + 4 - k * 18), 2 + Math.round(k * 4), '#C7C3D3'); });
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
  let silueta = false;     // de perfil y en negro sobre un cerro, como el toro de los carteles de carretera (Tauros)

  const ANIMS = ['Idle', 'Hop', 'Sleep'];
  let guestSprite = null, cabeza = null, fx = null;   // fx: la animación del momento («anim» de un nodo)

  async function open({ sprite, buddy = null, fase: f, lugar: l = 'dentro', escenario = null }) {
    fase = f;
    lugar = l;
    decor = ESCENARIO[escenario] ? escenario : null;
    silueta = false;
    fx = null;
    llora = false;
    const cs = await loadSprite('0006', ANIMS);
    guestSprite = null;
    await setGuest(sprite, buddy);
    chari = new Actor(cs, { x: lugar === 'dentro' ? 26 : 38, y: lugar === 'dentro' ? BAR + 10 : 70, dir: DIR.downRight });
    if (!running) { running = true; requestAnimationFrame(frame); }
    resize();
  }

  // Pone delante a un huésped (en los grupos, al miembro que habla en cada momento)
  async function setGuest(sprite, buddy = null) {
    if (!sprite || sprite === guestSprite) return;
    guestSprite = sprite;
    const gs = await loadSprite(sprite, ANIMS);
    if (guestSprite !== sprite) return;   // mientras cargaba ya se ha pedido otro
    // el huésped va en primer plano: a ×2 si cabe, a ×1 si es muy grande (Gengar flota alto).
    // Se mide su cuerpo real para que asome de la barra siempre igual.
    const a = gs.anims.Idle, body = measure(a.img, a.fw, a.fh);
    // fuera se le ve entero, de pie en el césped (o en el agua del estanque)
    const ground = lugar === 'dentro' ? BAR + 9 : lugar === 'estanque' ? 74 : 72;
    const scale = (body.bottom - body.top) * 2 <= (lugar === 'dentro' ? 58 : 62) ? 2 : 1;
    const feetY = ground / scale + 6 + a.fh / 2 - body.bottom;
    const g = new Actor(gs, { x: (lugar === 'dentro' ? 84 : 80) / scale - (buddy ? 9 : 0), y: feetY, dir: DIR.down });
    await addBuddy(g, buddy, ANIMS);
    if (guestSprite !== sprite) return;
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
    const S = Math.max(1, Math.floor(Math.min(box.width * dpr / W, box.height * dpr / H)));
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
    if (silueta) { planoToro(c, fase, t); return; }
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

  // Lo que se mueve el que hace la animación: [dx, dy, dirección] en píxeles de la vista
  function mover(a, ms) {
    const tipo = fx.tipo;
    if (tipo === 'duerme' && a.sprite.anims.Sleep) a.anim = 'Sleep';
    else if (a.anim === 'Sleep' || (a.anim === 'Hop' && performance.now() > hopUntil)) a.anim = 'Idle';
    if (tipo === 'baila') return [Math.round(Math.sin(ms / 160) * 3), -Math.round(Math.abs(Math.sin(ms / 160)) * 4), Math.floor(ms / 320) % 2 ? DIR.downLeft : DIR.downRight];
    if (tipo === 'gira') return [0, 0, [DIR.down, DIR.downRight, DIR.right, DIR.upRight, DIR.up, DIR.upLeft, DIR.left, DIR.downLeft][Math.floor(ms / 90) % 8]];
    if (tipo === 'salta') { const k = (ms % 1400) / 600; return [0, k < 1 ? -Math.round(Math.sin(k * Math.PI) * 14) : 0, null]; }
    if (tipo === 'tiembla' || (tipo === 'enfado' && ms % 900 < 300)) return [Math.floor(ms / 40) % 2 ? 1 : -1, 0, null];
    if (tipo === 'duerme' && !a.sprite.anims.Sleep) return [0, 2, null];
    return [0, 0, null];
  }

  window.addEventListener('resize', () => running && resize());
  return { open, close, speak, setGuest, sombrero: puesto => { sinSombrero = !puesto; }, silueta: si => { silueta = !!si; } };
}
