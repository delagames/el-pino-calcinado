// La posada en corte (vista A), en pixel art con las convenciones de los sprites de
// SpriteCollab: se pinta a resolución nativa (1 píxel del mundo = 1 píxel de sprite)
// en un lienzo pequeño y se amplía con vecino más próximo, a escala entera cuando cabe.
// Lo fijo se pinta una vez; cada fotograma solo añade lo que se mueve.

export const WORLD = { w: 400, h: 280 };
// Parte del mundo que siempre tiene que verse entera (la posada, el pino y la luna);
// crece hacia arriba con cada planta que se construye
const FIT0 = { x: 10, y: 36, w: 352, h: 228 };
const NARROW_W = 250;   // ancho de mundo que se ve en vertical (la casa casi entera)
// Plantas de más (mejoras «planta-2» y «planta-3»): cada una mide PISO y empuja hacia
// arriba el tejado, la chimenea y la buhardilla (se dibujan desplazados LAYOUT.lift)
export const PISO = 56;
export const LAYOUT = { pisos: 0, lift: 0 };

const P = {
  noche: '#1F2742', cieloMedio: '#253058', cieloBajo: '#2C3860',
  estrella: '#F4EFE6', estrellaTenue: '#BFB7A7',
  luna: '#F4EFE6', lunaSombra: '#D7CFBF', lunaCrater: '#BFB7A7',
  montLejos: '#36416B', montLejosLuz: '#434F7E', nieve: '#8F98BF',
  montMedio: '#28315A', montMedioLuz: '#313B68',
  colinas: '#1B2240', colinasLuz: '#232B4E', suelo: '#161B31', sueloLuz: '#2B3456', losa: '#2F3759',
  contorno: '#100C14',
  pared: '#EFD7AF', paredLuz: '#F7E7C7', paredSombra: '#D8B98B',
  zocalo: '#B7834F', zocaloOscuro: '#8F6037', zocaloLuz: '#CF9B63',
  madera: '#9F6A3F', maderaLuz: '#BF8757', maderaOscura: '#6F4527', viga: '#4F2F1F', vigaOscura: '#371F15',
  piedra: '#7F7A87', piedraLuz: '#9F9AA7', piedraOscura: '#5F5A67',
  tejado: '#AF4F37', tejadoLuz: '#CF6F4F', tejadoOscuro: '#7F3323',
  buhardilla: '#2A2436', buhardillaLuz: '#3A3248', tabla: '#87603F', tablaLuz: '#A77F57',
  brasa: '#FFB347', brasaFuerte: '#E2653F', brasaHonda: '#9F2F17', chispa: '#FFF7BF',
  tizon: '#0F1324', canto: '#3F4A73',
  rojo: '#C73F2F', rojoOscuro: '#8F2717', azul: '#4F8FAF', azulOscuro: '#376F8F',
  verde: '#6F9F4F', verdeOscuro: '#4F7737', blanco: '#FFFFFF', marfil: '#F4EFE6',
  oro: '#DFAF3F', oroOscuro: '#A7772F', hoja: '#4F873F', hojaLuz: '#77AF57', maceta: '#A75F37',
  metal: '#5F6777', metalLuz: '#8F97A7',
};

// Cielo y paisaje de cada momento del día (la noche es la paleta de arriba)
const SKY_KEYS = ['noche', 'cieloMedio', 'cieloBajo', 'montLejos', 'montLejosLuz', 'nieve', 'montMedio', 'montMedioLuz',
  'colinas', 'colinasLuz', 'suelo', 'sueloLuz', 'losa', 'canto'];
const SKY = {
  noche: Object.fromEntries(SKY_KEYS.map(k => [k, P[k]])),
  manana: { noche: '#6F9FDF', cieloMedio: '#97C3E7', cieloBajo: '#F7D7A7', montLejos: '#7F97C7', montLejosLuz: '#9FB3DF',
    nieve: '#EFF3FF', montMedio: '#5F7FAF', montMedioLuz: '#7795C7', colinas: '#3F6F57', colinasLuz: '#4F875F',
    suelo: '#3F5F37', sueloLuz: '#5F874F', losa: '#8F8F87', canto: '#7F8FA7' },
  dia: { noche: '#4F97E7', cieloMedio: '#77B7EF', cieloBajo: '#B7E3F7', montLejos: '#87A7D7', montLejosLuz: '#A7C3E7',
    nieve: '#FFFFFF', montMedio: '#5F87BF', montMedioLuz: '#7FA7D7', colinas: '#3F7F4F', colinasLuz: '#579F5F',
    suelo: '#3F6F2F', sueloLuz: '#5F9747', losa: '#9F9F97', canto: '#8F9FB7' },
  tarde: { noche: '#4F4F8F', cieloMedio: '#C7678F', cieloBajo: '#FFA76F', montLejos: '#6F5F8F', montLejosLuz: '#8F77A7',
    nieve: '#F7C7B7', montMedio: '#4F3F6F', montMedioLuz: '#6F5787', colinas: '#2F2F4F', colinasLuz: '#3F3F5F',
    suelo: '#2F2B3F', sueloLuz: '#47405F', losa: '#57506F', canto: '#6F5F87' },
};
// Sol o luna: posición, radio y colores (centro, sombra o halo)
const BODY = {
  manana: { x: 60, y: 62, r: 11, col: '#FFF3C7', halo: '#FFE7A7' },
  dia: { x: 210, y: 22, r: 11, col: '#FFFBE7', halo: '#FFF3B7' },
  tarde: { x: 330, y: 132, r: 16, col: '#FFC787', halo: '#FF9F5F' },
};
// Cuánto se notan las luces de dentro según la hora
const LIT = { manana: 0.35, dia: 0.2, tarde: 0.75, noche: 1 };

export const GROUND = 246;
// El tejado va encima de la casa: su borde de abajo llega al forjado de la buhardilla (y 133)
const ROOF = { apex: [205, 53], eave: 133, slope: 0.64, thick: 12 };
const ATTIC_HALF = Math.floor((130 - ROOF.apex[1] - ROOF.thick) / ROOF.slope);
const ATTIC = [[205 - ATTIC_HALF, 130], [205, ROOF.apex[1] + ROOF.thick], [205 + ATTIC_HALF, 130]];

export const ROOMS = [
  { id: 'recepcion', nombre: 'Recepción', planta: 0, x: 94, y: 190, w: 72, h: 54 },
  { id: 'comedor', nombre: 'Comedor', planta: 0, x: 169, y: 190, w: 72, h: 54 },
  { id: 'cocina', nombre: 'Cocina', planta: 0, x: 244, y: 190, w: 72, h: 54 },
  { id: 'hab1', nombre: 'Habitación 1', planta: 1, color: 'rojo', x: 94, y: 134, w: 72, h: 52 },
  { id: 'hab2', nombre: 'Habitación 2', planta: 1, color: 'azul', x: 169, y: 134, w: 72, h: 52 },
  { id: 'hab3', nombre: 'Habitación 3', planta: 1, color: 'verde', x: 244, y: 134, w: 72, h: 52 },
  // el estanque solo existe con su mejora (fase 6); es una habitación al aire libre
  { id: 'estanque', nombre: 'Estanque', planta: 0, exterior: true, mejora: 'estanque', x: 326, y: 222, w: 38, h: 30 },
  { id: 'buhardilla', nombre: 'Buhardilla', planta: 2, cerrada: true, poly: ATTIC,
    x: ATTIC[0][0], y: ATTIC[1][1], w: ATTIC[2][0] - ATTIC[0][0], h: 130 - ATTIC[1][1] },
];

// Colores de las habitaciones y qué tipos duermen mejor en cada una
export const COLORES = {
  rojo: { nombre: 'roja', tipos: ['fuego', 'lucha'], manta: '#C73F2F', sombra: '#8F2717' },
  azul: { nombre: 'azul', tipos: ['agua', 'hielo'], manta: '#4F8FAF', sombra: '#376F8F' },
  verde: { nombre: 'verde', tipos: ['planta', 'bicho'], manta: '#6F9F4F', sombra: '#4F7737' },
  amarillo: { nombre: 'amarilla', tipos: ['normal', 'electrico', 'hada'], manta: '#DFAF3F', sombra: '#A7772F' },
  morado: { nombre: 'morada', tipos: ['fantasma', 'psiquico', 'veneno'], manta: '#8F4FAF', sombra: '#5F2F7F' },
  marron: { nombre: 'marrón', tipos: ['roca', 'tierra'], manta: '#A7774F', sombra: '#6F4527' },
};
// Las habitaciones de las plantas nuevas (se añaden a ROOMS al construirlas)
const PLANTAS = [
  [{ id: 'hab4', color: 'amarillo' }, { id: 'hab5', color: 'morado' }, { id: 'hab6', color: 'marron' }],
  [{ id: 'hab7', color: 'rojo' }, { id: 'hab8', color: 'azul' }, { id: 'hab9', color: 'verde' }],
];
const ATTIC_ROOM = ROOMS.find(r => r.id === 'buhardilla');

// Recoloca la casa para n plantas de más: añade sus habitaciones y sube la buhardilla
export function setPisos(n) {
  if (n === LAYOUT.pisos) return false;
  LAYOUT.pisos = n;
  LAYOUT.lift = n * PISO;
  for (let i = ROOMS.length - 1; i >= 0; i--) if (ROOMS[i].planta >= 2 && ROOMS[i].id !== 'buhardilla') ROOMS.splice(i, 1);
  PLANTAS.slice(0, n).forEach((fila, k) => fila.forEach(({ id, color }, j) => {
    ROOMS.push({ id, nombre: `Habitación ${id.slice(3)}`, planta: k + 2, color, x: [94, 169, 244][j], y: 134 - PISO * (k + 1), w: 72, h: 52 });
  }));
  ATTIC_ROOM.poly = ATTIC.map(([x, y]) => [x, y - LAYOUT.lift]);
  ATTIC_ROOM.y = ATTIC[1][1] - LAYOUT.lift;
  return true;
}

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// Letras de 3×5 para el rótulo de la furgoneta del reparto
const VAN_FONT = {
  ' ': ['...', '...', '...', '...', '...'], O: ['.X.', 'X.X', 'X.X', 'X.X', '.X.'], N: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'],
  P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'], C: ['.XX', 'X..', 'X..', 'X..', '.XX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'], A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'], M: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'], E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'], S: ['.XX', 'X..', '.X.', '..X', 'XX.'],
};
const VAN = { in: 2400, stop: 1600, out: 2200, park: -8 };   // tiempos (ms) y dónde aparca (x de la trasera)

// Globos sobre los personajes: qué piden, si esperan, si están contentos o tristes
const BUBBLE = ['.LLLLLLL.', 'LWWWWWWWL', 'LWWWWWWWL', 'LWWWWWWWL', 'LWWWWWWWL', 'LWWWWWWWL', '.LLLWLLL.', '....L....'];
const MOODS = {
  pide: { col: '#E2653F', rows: ['...X...', '...X...', '...X...', '.......', '...X...'] },
  espera: { col: '#5F6777', rows: ['.......', '.......', '.X.X.X.', '.......', '.......'] },
  charla: { col: '#4F8FAF', rows: ['..XXX..', '.....X.', '...XX..', '.......', '...X...'] },
  contento: { col: '#E2577F', rows: ['.XX.XX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'] },
  regular: { col: '#C7973F', rows: ['.......', '.X...X.', '.......', '.XXXXX.', '.......'] },
  triste: { col: '#4F8FAF', rows: ['...X...', '..XXX..', '.XXXXX.', '.XXXXX.', '..XXX..'] },
};

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function ridge(x, base, amp, seed) {
  return Math.round(base - amp * (0.55 * Math.sin(x / 69 + seed) + 0.3 * Math.sin(x / 28 + seed * 2.1)
    + 0.15 * Math.sin(x / 11 + seed * 3.7)));
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// ---------- primitivas de píxel (siempre a coordenadas enteras, sin suavizado) ----------

function rect(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function dot(c, x, y, col) { rect(c, x, y, 1, 1, col); }

function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    c.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

// Relleno de polígono por líneas, para que los bordes salgan en escalera limpia
function poly(c, pts, col) {
  c.fillStyle = col;
  const ys = pts.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [x1, y1] = pts[j], [x2, y2] = pts[i];
      if ((y1 <= yc) !== (y2 <= yc)) xs.push(x1 + (yc - y1) * (x2 - x1) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.round(xs[k]), b = Math.round(xs[k + 1]);
      if (b > a) c.fillRect(a, y, b - a, 1);
    }
  }
}

// Píxeles de una línea (Bresenham)
function linePixels(x0, y0, x1, y1) {
  const out = [];
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function line(c, x0, y0, x1, y1, col) {
  c.fillStyle = col;
  for (const [x, y] of linePixels(x0, y0, x1, y1)) c.fillRect(x, y, 1, 1);
}

// Contorno de un polígono, para el borde discontinuo de la habitación señalada
function perimeter(pts) {
  return pts.flatMap((p, i) => linePixels(...p, ...pts[(i + 1) % pts.length]));
}

// Cambia el tamaño de un lienzo solo si es distinto (cada cambio reserva memoria nueva)
export function fitCanvas(cv, w, h) {
  if (cv.width !== w) cv.width = w;
  if (cv.height !== h) cv.height = h;
}

export function createInnView(canvas) {
  const ctx = canvas.getContext('2d');
  const low = document.createElement('canvas');      // fotograma a resolución nativa
  const stat = document.createElement('canvas');     // capa fija
  const lc = low.getContext('2d'), sc = stat.getContext('2d');
  let v = { S: 1, dpr: 1, wx: 0, wy: 0, LW: 0, LH: 0 };
  let insets = { top: 0, right: 0, bottom: 0, left: 0 };
  let hover = null, running = false, paused = false, looping = false, drawn = 0, onHover = () => {};
  let actors = [];
  let time = 'noche';
  let highlight = new Set();   // habitaciones resaltadas (las libres, al dar habitación)
  let upgrades = new Set();    // mejoras compradas: cambian lo que se dibuja
  let van = null;              // la furgoneta de la chistorra, mientras reparte
  let crate = false;           // la caja de chistorra junto a la puerta (por la mañana)
  let rain = false;            // días de lluvia
  const has = id => upgrades.has(id);
  const exists = rm => !rm.mejora || has(rm.mejora);

  const r = rng(42);
  const stars = Array.from({ length: 220 }, () => ({
    x: Math.floor(-600 + r() * 1600), y: Math.floor(-180 + r() * 330), p: r() * Math.PI * 2,
    tw: r() < 0.2, dim: r() < 0.5,
  }));
  let narrow = false, pan = -18, panMax = 0;   // cámara: en vertical empieza mirando un poco hacia la puerta
  let camTarget = null;                        // a dónde se va moviendo sola la cámara (siguiendo a la furgoneta)
  let outlines = new Map();
  const buildOutlines = () => { outlines = new Map(ROOMS.map(rm => [rm, perimeter(rm.poly
    || [[rm.x, rm.y], [rm.x + rm.w - 1, rm.y], [rm.x + rm.w - 1, rm.y + rm.h - 1], [rm.x, rm.y + rm.h - 1]])])); };
  buildOutlines();

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
    // solo se cambia el tamaño de los lienzos si hace falta: reasignarlos en cada cambio del cuadro de
    // diálogo gastaba memoria y Safari del móvil, al pasar su límite, dejaba de dibujar
    fitCanvas(canvas, W, H);
    const aw = (canvas.clientWidth - insets.left - insets.right) * dpr;
    const ah = (canvas.clientHeight - insets.top - insets.bottom) * dpr;
    const FIT = { ...FIT0, y: FIT0.y - LAYOUT.lift, h: FIT0.h + LAYOUT.lift };
    // en vertical (el móvil) la cámara se acerca a la casa y se arrastra con el dedo para ver los lados
    narrow = aw < ah * 1.15;
    const fw = narrow ? NARROW_W : FIT.w;
    // en vertical la casa tiene que caber entera encima del cuadro de diálogo de verdad: con dos plantas
    // más es muy alta y, si el cuadro crece, se encoge un poco en vez de quedar tapada
    const ahReal = (canvas.clientHeight - insets.top - Math.max(insets.bottom, insets.dialog || 0)) * dpr;
    const fit = Math.min(aw / fw, (narrow ? ahReal : ah) / FIT.h);
    // a múltiplos enteros para que los píxeles salgan iguales; en el móvil (pantallas de mucha
    // densidad) se aprovecha todo el sitio, que redondear hacia abajo la dejaba mucho más pequeña
    const S = fit >= 2 && !narrow ? Math.floor(fit) : fit;
    const LW = Math.ceil(W / S) + 1, LH = Math.ceil(H / S) + 1;
    fitCanvas(low, LW, LH); fitCanvas(stat, LW, LH);
    const viewW = aw / S;
    panMax = narrow ? Math.max(0, (FIT0.w + 24 - viewW) / 2) : 0;
    pan = Math.max(-panMax, Math.min(panMax, pan));
    v = {
      S, dpr, LW, LH, aw,
      wx: Math.round((insets.left * dpr + aw / 2) / S - (FIT.x + FIT.w / 2 + pan)),
      // en vertical, la casa abajo, pegada al cuadro de diálogo de verdad (arriba queda cielo): si el
      // cuadro crece, la casa sube en vez de quedar tapada, sin cambiar el zum
      wy: Math.round((insets.top * dpr + (narrow
        ? Math.max(0, H - (insets.top + (insets.dialog || insets.bottom)) * dpr - FIT.h * S - 6 * dpr)
        : (ah - FIT.h * S) / 2)) / S - FIT.y),
    };
    paintStatic();
  }

  // mueve la cámara (en píxeles del mundo) sin cambiar el zum; «libre», sin los topes de arrastrar
  function setPan(p, libre = false) {
    const q = libre ? p : Math.max(-panMax, Math.min(panMax, p));
    if (Math.round(q) === Math.round(pan)) { pan = q; return; }
    pan = q;
    v.wx = Math.round((insets.left * v.dpr + v.aw / 2) / v.S - (FIT0.x + FIT0.w / 2 + pan));
    paintStatic();
  }

  function paintStatic() {
    const c = sc;
    c.setTransform(1, 0, 0, 1, 0, 0);
    paintSky(c);
    c.setTransform(1, 0, 0, 1, v.wx, v.wy);
    const x0 = -v.wx - 1, x1 = v.LW - v.wx + 1;
    if (time === 'noche') for (const s of stars) if (!s.tw && s.x >= x0 && s.x <= x1) dot(c, s.x, s.y, s.dim ? P.estrellaTenue : P.estrella);
    drawSkyBody(c);
    drawMountains(c, x0, x1);
    drawGround(c, x0, x1);
    drawBurntPine(c);
    drawInn(c);
  }

  // Cielo tramado en tres tintas, de arriba abajo
  function paintSky(c) {
    const img = c.createImageData(v.LW, v.LH);
    const cols = [hex(P.noche), hex(P.cieloMedio), hex(P.cieloBajo)];
    for (let y = 0; y < v.LH; y++) {
      const wy = y - v.wy;
      const t = Math.max(0, Math.min(1, (wy - 20) / 190)) * 2;
      const band = Math.min(1, Math.floor(t)), f = t - band;
      for (let x = 0; x < v.LW; x++) {
        const col = cols[band + (f * 16 > BAYER[wy & 3][(x - v.wx) & 3] + 0.5 ? 1 : 0)];
        const i = (y * v.LW + x) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  }

  // ---------- paisaje ----------

  function drawSkyBody(c) {
    if (rain) return;   // con lluvia no se ven ni el sol ni la luna
    c.save(); c.translate(0, -LAYOUT.lift);
    drawSkyBodyAt(c);
    c.restore();
  }

  function drawSkyBodyAt(c) {
    const b = BODY[time];
    if (b) {
      c.globalAlpha = 0.12; disc(c, b.x, b.y, b.r + 10, b.halo);
      c.globalAlpha = 0.2; disc(c, b.x, b.y, b.r + 5, b.halo);
      c.globalAlpha = 1;
      disc(c, b.x, b.y, b.r, b.halo);
      disc(c, b.x - 1, b.y - 1, b.r - 2, b.col);
      return;
    }
    const mx = 352, my = 40, mr = 15;
    c.globalAlpha = 0.06; disc(c, mx, my, mr + 12, P.luna);
    c.globalAlpha = 0.08; disc(c, mx, my, mr + 6, P.luna);
    c.globalAlpha = 1;
    disc(c, mx, my, mr, P.lunaSombra);
    disc(c, mx + 2, my - 2, mr - 2, P.luna);
    for (const [dx, dy, rr] of [[-5, -3, 2], [4, 5, 2], [5, -6, 1], [-2, 8, 1]]) disc(c, mx + dx, my + dy, rr, P.lunaCrater);
  }

  function drawMountains(c, x0, x1) {
    const layers = [
      { base: 150, amp: 40, seed: 1.3, col: P.montLejos, luz: P.montLejosLuz, snow: 124 },
      { base: 186, amp: 26, seed: 4.1, col: P.montMedio, luz: P.montMedioLuz },
      { base: 222, amp: 10, seed: 7.7, col: P.colinas, luz: P.colinasLuz, trees: true },
    ];
    for (const L of layers) {
      for (let x = x0; x <= x1; x++) {
        const y = ridge(x, L.base, L.amp, L.seed), yn = ridge(x + 1, L.base, L.amp, L.seed);
        rect(c, x, y, 1, 400, L.col);
        // la luna da por la derecha: las laderas que bajan hacia ella tienen canto claro
        if (yn > y) rect(c, x, y, 1, 3, L.luz);
        if (L.snow && y < L.snow) {
          const depth = Math.round((L.snow - y) * 0.6) + 1;
          for (let k = 0; k < depth; k++) if (k < depth - 1 || (x + y) % 2) dot(c, x, y + k, P.nieve);
        }
      }
      if (L.trees) {
        const tr = rng(9);
        for (let x = Math.floor(x0 / 9) * 9; x <= x1; x += 9) {
          const h = 7 + Math.floor(tr() * 8);
          if (x > 76 && x < 334) continue;
          const y = ridge(x, L.base, L.amp, L.seed) + 3;
          for (let k = 0; k < h; k++) rect(c, x - Math.floor(k / 2.6), y - h + k, Math.floor(k / 2.6) * 2 + 1, 1, P.colinas);
          rect(c, x, y, 1, 2, P.colinas);
        }
      }
    }
  }

  function drawGround(c, x0, x1) {
    rect(c, x0, GROUND, x1 - x0, 400, P.suelo);
    rect(c, x0, GROUND, x1 - x0, 1, P.sueloLuz);
    // losas del camino hasta la puerta
    for (const x of [14, 30, 46, 62, 76]) { rect(c, x, GROUND + 3, 10, 2, P.losa); rect(c, x + 1, GROUND + 2, 8, 1, P.losa); }
    const gr = rng(5);
    for (let x = Math.floor(x0 / 5) * 5; x <= x1; x += 5) {
      if (x > 84 && x < 326) continue;
      const h = 1 + Math.floor(gr() * 3);
      rect(c, x, GROUND - h, 1, h, P.colinasLuz);
    }
  }

  // El pino quemado de la entrada, el que da nombre a la posada (mismo dibujo que el logo)
  function pineShapes(tx, base, ps) {
    const T = (x, y) => [tx + x * ps, base + y * ps];
    const shapes = [[[-6, 0], [-2.5, -3], [-1.6, -24], [-0.8, -40], [-0.2, -45], [0.6, -42], [1.2, -44],
      [1.6, -40], [2.4, -24], [3.4, -3], [7, 0]].map(p => T(...p))];
    for (const [h, ll, lr] of [[40, 4, 5], [35, 7, -3], [30, 9, 8], [25, -3, 11], [20, 12, 12], [15, 14, -4], [11, 12, 15]]) {
      for (const [side, L0] of [[-1, ll], [1, lr]]) {
        const x0 = side * 1.2;
        if (L0 < 0) {
          const L = -L0;
          shapes.push([[x0, -h - 0.6], [x0 + side * L, -h + 0.4], [x0 + side * L, -h + 1.2], [x0, -h + 1.4]].map(p => T(...p)));
          continue;
        }
        const L = L0, pts = [[x0, -h - 1.2], [x0 + side * L, -h + L * 0.32]];
        const teeth = Math.max(2, Math.floor(L / 3.2));
        for (let i = 1; i <= teeth; i++) {
          const k = 1 - i / (teeth + 1);
          pts.push([x0 + side * (L * k + 0.8), -h + L * 0.32 * k + 2.4]);
          pts.push([x0 + side * (L * k - 0.8), -h + L * 0.32 * k + 1.0]);
        }
        pts.push([x0, -h + 1.8]);
        shapes.push(pts.map(p => T(...p)));
      }
    }
    return shapes;
  }

  const PINE = { x: 40, base: GROUND + 1, ps: 2.1 };

  function drawBurntPine(c) {
    const shapes = pineShapes(PINE.x, PINE.base, PINE.ps);
    for (const s of shapes) poly(c, s.map(([x, y]) => [x + 1, y]), P.canto);
    for (const s of shapes) poly(c, s, P.tizon);
  }

  // ---------- la posada ----------

  function roofHalf(y) { return (y - ROOF.apex[1]) / ROOF.slope; }

  // Filas de tejas escalonadas con su canto; keep(x, y) dice qué píxeles se pintan
  function drawRoof(c, keep) {
    const [ax, ay] = ROOF.apex;
    const put = (x, y, col) => { if (keep(x, y)) dot(c, x, y, col); };
    for (let y = ay; y <= ROOF.eave; y++) {
      const hw = Math.round(roofHalf(y));
      const row = (y - ay) % 5;
      const off = Math.floor((y - ay) / 5) % 2 ? 4 : 0;
      for (let x = ax - hw; x <= ax + hw; x++) {
        const joint = row !== 4 && (x - (ax - hw) - ((off + hw) % 8)) % 8 === 0 && x < ax + hw;
        put(x, y, row === 4 || joint ? P.tejadoOscuro : row === 0 ? P.tejadoLuz : P.tejado);
      }
      put(ax - hw - 1, y, P.contorno); put(ax + hw + 1, y, P.contorno);
      put(ax + hw, y, P.tejadoLuz);
    }
    const ew = Math.round(roofHalf(ROOF.eave));
    for (let x = ax - ew - 1; x <= ax + ew + 1; x++) put(x, ROOF.eave + 1, P.contorno);
    for (let x = ax - 1; x <= ax + 1; x++) put(x, ay - 1, P.contorno);
  }

  function drawInn(c) {
    const L = LAYOUT.lift;
    c.save(); c.translate(0, -L);
    // chimenea (el tejado tapa su base)
    rect(c, 268, 66, 12, 40, P.piedraOscura);
    rect(c, 269, 66, 2, 40, P.piedra);
    for (let y = 70; y < 104; y += 5) rect(c, 268, y, 12, 1, P.contorno);
    rect(c, 266, 62, 16, 4, P.piedraLuz);
    rect(c, 266, 65, 16, 1, P.piedraOscura);
    rect(c, 270, 61, 8, 1, P.contorno);

    c.restore();
    // estructura: muros, forjados (uno por planta) y cimientos
    rect(c, 90, 130 - L, 230, 116 + L, P.viga);
    rect(c, 89, 130 - L, 1, 116 + L, P.contorno); rect(c, 320, 130 - L, 1, 116 + L, P.contorno);
    for (let k = 0; k <= LAYOUT.pisos; k++) { rect(c, 90, 186 - k * PISO, 230, 1, P.vigaOscura); rect(c, 90, 189 - k * PISO, 230, 1, P.vigaOscura); }
    // el tejado, encima de todo; luego el forjado de la buhardilla por dentro
    c.save(); c.translate(0, -L);
    drawRoof(c, () => true);
    const [al, , ar] = ATTIC;
    rect(c, al[0], 130, ar[0] - al[0] + 1, 4, P.viga);
    rect(c, al[0], 133, ar[0] - al[0] + 1, 1, P.vigaOscura);
    c.restore();
    rect(c, 86, 244, 238, 9, P.piedra);
    rect(c, 86, 244, 238, 1, P.piedraLuz);
    rect(c, 86, 248, 238, 1, P.piedraOscura);
    for (let x = 90; x < 322; x += 11) { rect(c, x, 245, 1, 3, P.piedraOscura); rect(c, x + 5, 249, 1, 4, P.piedraOscura); }
    rect(c, 85, 244, 1, 9, P.contorno); rect(c, 324, 244, 1, 9, P.contorno);

    c.save(); c.translate(0, -L);
    drawAttic(c);
    c.restore();
    for (const room of ROOMS) if (!room.cerrada && !room.poly && !room.exterior) drawRoomShell(c, room);
    const [rec, com, coc] = ROOMS;
    drawRecepcion(c, rec);
    drawComedor(c, com);
    drawCocina(c, coc);
    // dormitorios: la manta y la alfombra son del color de la habitación
    for (const r of ROOMS.filter(r => r.color)) {
      const col = COLORES[r.color];
      drawBedroom(c, r, col.manta, col.sombra, r.x === 169 ? 'right' : 'left');
    }
    drawEntrance(c);
    drawUpgrades(c);
  }

  function drawRoomShell(c, r) {
    const fl = r.y + r.h;
    rect(c, r.x, r.y, r.w, r.h, P.pared);
    for (let x = r.x + 3; x < r.x + r.w; x += 6) rect(c, x, r.y + 3, 1, r.h - 17, P.paredLuz);
    rect(c, r.x, r.y, r.w, 2, P.paredSombra);
    // zócalo de madera y suelo
    rect(c, r.x, fl - 14, r.w, 14, P.zocalo);
    rect(c, r.x, fl - 15, r.w, 1, P.zocaloLuz);
    rect(c, r.x, fl - 16, r.w, 1, P.zocaloOscuro);
    for (let x = r.x + 5; x < r.x + r.w; x += 6) rect(c, x, fl - 14, 1, 12, P.zocaloOscuro);
    rect(c, r.x, fl - 2, r.w, 2, P.madera);
    rect(c, r.x, fl - 2, r.w, 1, P.maderaLuz);
  }

  function windowNight(c, x, y, w, h) {
    rect(c, x - 2, y - 2, w + 4, h + 4, P.maderaOscura);
    rect(c, x - 2, y - 2, w + 4, 1, P.contorno);
    rect(c, x, y, w, h, P.noche);
    rect(c, x, y + Math.floor(h / 2), w, Math.ceil(h / 2), P.cieloMedio);
    for (let i = 0; i < w; i++) {
      const mh = Math.round(h * 0.35 + Math.sin(i * 0.7 + x) * 1.5 + (i > w / 2 ? 1 : -1));
      rect(c, x + i, y + h - mh, 1, mh, P.montMedio);
    }
    if (time === 'noche') { dot(c, x + 2, y + 2, P.estrella); dot(c, x + w - 4, y + 4, P.estrellaTenue); }
    rect(c, x + Math.floor(w / 2), y, 1, h, P.maderaOscura);
    rect(c, x, y + Math.floor(h / 2), w, 1, P.maderaOscura);
    rect(c, x - 3, y + h + 2, w + 6, 2, P.zocaloLuz);
    rect(c, x - 3, y + h + 3, w + 6, 1, P.zocaloOscuro);
  }

  function drawRecepcion(c, r) {
    const fl = r.y + r.h - 2;
    // tablero de llaves
    rect(c, r.x + 44, r.y + 9, 22, 11, P.contorno);
    rect(c, r.x + 45, r.y + 10, 20, 9, P.madera);
    rect(c, r.x + 45, r.y + 10, 20, 1, P.maderaLuz);
    for (let i = 0; i < 3; i++) {
      const kx = r.x + 49 + i * 6;
      dot(c, kx, r.y + 12, P.contorno);
      rect(c, kx - 1, r.y + 13, 3, 2, P.oro); dot(c, kx, r.y + 13, P.oroOscuro);
      rect(c, kx, r.y + 15, 1, 3, P.oro); dot(c, kx + 1, r.y + 17, P.oro);
    }
    // mostrador
    rect(c, r.x + 37, fl - 19, 33, 19, P.contorno);
    rect(c, r.x + 38, fl - 18, 31, 18, P.maderaOscura);
    rect(c, r.x + 40, fl - 15, 12, 13, P.madera); rect(c, r.x + 55, fl - 15, 12, 13, P.madera);
    rect(c, r.x + 40, fl - 15, 12, 1, P.maderaLuz); rect(c, r.x + 55, fl - 15, 12, 1, P.maderaLuz);
    rect(c, r.x + 35, fl - 21, 37, 3, P.contorno);
    rect(c, r.x + 36, fl - 21, 35, 2, P.maderaLuz);
    // libro de visitas y timbre
    rect(c, r.x + 40, fl - 24, 10, 3, P.contorno);
    rect(c, r.x + 41, fl - 24, 8, 2, P.rojo); rect(c, r.x + 41, fl - 23, 8, 1, P.marfil);
    rect(c, r.x + 61, fl - 25, 6, 4, P.contorno);
    rect(c, r.x + 62, fl - 24, 4, 3, P.oro); dot(c, r.x + 62, fl - 24, P.chispa);
    dot(c, r.x + 64, fl - 26, P.contorno);
    // planta
    rect(c, r.x + 4, fl - 8, 9, 8, P.contorno);
    rect(c, r.x + 5, fl - 7, 7, 7, P.maceta); rect(c, r.x + 5, fl - 7, 7, 1, P.zocaloLuz);
    for (const [dx, dy, rr, col] of [[8, -12, 4, P.hoja], [5, -15, 3, P.hoja], [11, -16, 3, P.hoja],
      [8, -19, 2, P.hoja], [7, -13, 2, P.hojaLuz], [10, -17, 1, P.hojaLuz]]) disc(c, r.x + dx, fl + dy, rr, col);
    // farol de pared
    lampWall(c, r.x + 26, r.y + 18);
    r.lamp = [r.x + 26, r.y + 22];
    // alfombra
    rect(c, r.x + 14, fl - 1, 22, 1, P.rojo); rect(c, r.x + 14, fl, 22, 1, P.rojoOscuro);
  }

  function drawComedor(c, r) {
    const fl = r.y + r.h - 2;
    windowNight(c, r.x + 26, r.y + 9, 20, 14);
    // cuadro con la medalla del gimnasio de fuego que dejó Manolo
    rect(c, r.x + 5, r.y + 9, 11, 13, P.contorno);
    rect(c, r.x + 6, r.y + 10, 9, 11, P.marfil);
    for (const [dx, dy, w] of [[3, 1, 1], [3, 2, 2], [2, 3, 3], [2, 4, 4], [1, 5, 5], [1, 6, 5], [2, 7, 3]]) {
      rect(c, r.x + 6 + dx, r.y + 10 + dy, w, 1, P.brasaFuerte);
    }
    rect(c, r.x + 9, r.y + 15, 2, 2, P.brasa);
    rect(c, r.x + 8, r.y + 19, 5, 1, P.oro);
    // lámpara colgante
    rect(c, r.x + 60, r.y, 1, 8, P.contorno);
    rect(c, r.x + 56, r.y + 8, 9, 1, P.contorno);
    rect(c, r.x + 55, r.y + 9, 11, 3, P.metal);
    rect(c, r.x + 56, r.y + 9, 9, 1, P.metalLuz);
    r.lamp = [r.x + 60, r.y + 13];
    // dos mesas con taburetes
    for (const tx of [r.x + 18, r.x + 52]) {
      rect(c, tx - 9, fl - 13, 19, 3, P.contorno);
      rect(c, tx - 8, fl - 13, 17, 2, P.maderaLuz);
      rect(c, tx - 1, fl - 11, 3, 11, P.maderaOscura);
      rect(c, tx - 4, fl - 1, 9, 1, P.maderaOscura);
      for (const sx of [tx - 13, tx + 13]) {
        rect(c, sx - 3, fl - 8, 7, 2, P.contorno);
        rect(c, sx - 2, fl - 8, 5, 1, P.madera);
        rect(c, sx, fl - 6, 1, 6, P.maderaOscura);
      }
    }
  }

  function drawCocina(c, r) {
    const fl = r.y + r.h - 2;
    // ristra de chistorras colgada del techo
    for (let i = 0; i <= 38; i++) dot(c, r.x + 3 + i, r.y + 4 + Math.round(4 * Math.sin(Math.PI * i / 38)), P.viga);
    const nRistra = has('mas-chistorra') ? 9 : 6;
    for (let i = 0; i < nRistra; i++) {
      const sx = r.x + 6 + i * (nRistra === 9 ? 4 : 6), sy = r.y + 5 + Math.round(4 * Math.sin(Math.PI * (sx - r.x - 3) / 38));
      rect(c, sx - 1, sy, 3, 7, P.contorno);
      rect(c, sx, sy + 1, 1, 5, P.rojo);
      dot(c, sx, sy + 1, P.brasaFuerte);
    }
    // puerta de la despensa, con marcas de quemadura (Charizard jura que no ha sido él)
    rect(c, r.x + 2, fl - 28, 15, 28, P.contorno);
    rect(c, r.x + 3, fl - 27, 13, 27, P.madera);
    rect(c, r.x + 3, fl - 27, 13, 1, P.maderaLuz);
    rect(c, r.x + 9, fl - 27, 1, 27, P.maderaOscura);
    for (const [dx, dy, w, h] of [[5, -18, 4, 5], [11, -11, 3, 3], [4, -8, 2, 2], [12, -22, 2, 2]]) {
      rect(c, r.x + dx, fl + dy, w, h, P.tizon);
      dot(c, r.x + dx + w, fl + dy + 1, P.maderaOscura);
    }
    dot(c, r.x + 14, fl - 13, P.oro);
    if (has('cerrojo')) {   // candado de la despensa
      rect(c, r.x + 12, fl - 17, 5, 1, P.contorno); rect(c, r.x + 12, fl - 17, 1, 3, P.contorno); rect(c, r.x + 16, fl - 17, 1, 3, P.contorno);
      rect(c, r.x + 11, fl - 14, 7, 5, P.contorno); rect(c, r.x + 12, fl - 13, 5, 3, P.oro); dot(c, r.x + 14, fl - 12, P.contorno);
    }
    if (has('fogon-apoyo')) {   // fogón de apoyo sobre la encimera
      rect(c, r.x + 19, fl - 22, 16, 8, P.contorno); rect(c, r.x + 20, fl - 21, 14, 6, P.metal);
      rect(c, r.x + 22, fl - 19, 4, 2, '#1F1416'); rect(c, r.x + 28, fl - 19, 4, 2, '#1F1416');
    }
    // encimera con olla y tarros
    rect(c, r.x + 20, fl - 13, 14, 13, P.contorno);
    rect(c, r.x + 21, fl - 12, 12, 12, P.maderaOscura);
    rect(c, r.x + 19, fl - 14, 16, 2, P.maderaLuz);
    rect(c, r.x + 20, fl - 18, 3, 4, P.oro); rect(c, r.x + 20, fl - 19, 3, 1, P.maderaOscura);
    rect(c, r.x + 25, fl - 17, 3, 3, P.rojo); rect(c, r.x + 25, fl - 18, 3, 1, P.maderaOscura);
    rect(c, r.x + 29, fl - 19, 5, 5, P.contorno); rect(c, r.x + 30, fl - 18, 3, 3, P.metal);
    dot(c, r.x + 30, fl - 18, P.metalLuz);
    // fogón de piedra; Charizard se pondrá delante (él es el fuego)
    const hx = r.x + 48;
    rect(c, hx - 1, r.y, 26, r.h - 2, P.contorno);
    rect(c, hx, r.y, 24, r.h - 2, P.piedraOscura);
    for (let y = r.y + 3; y < fl - 20; y += 5) {
      rect(c, hx, y, 24, 1, P.contorno);
      for (let x = hx + ((y / 5) % 2 ? 2 : 6); x < hx + 24; x += 8) rect(c, x, y + 1, 1, 4, P.contorno);
      rect(c, hx + 1, y + 1, 1, 4, P.piedra);
    }
    rect(c, hx - 3, fl - 22, 30, 3, P.contorno);
    rect(c, hx - 2, fl - 22, 28, 2, P.piedraLuz);
    rect(c, hx + 3, fl - 18, 18, 18, P.contorno);
    rect(c, hx + 4, fl - 17, 16, 17, '#1F1416');
    rect(c, hx + 3, fl - 19, 18, 1, P.piedra);
    r.hearth = [hx + 12, fl];
  }

  function drawBedroom(c, r, manta, mantaOscura, side) {
    const fl = r.y + r.h - 2;
    const L = side === 'left';
    windowNight(c, L ? r.x + 48 : r.x + 6, r.y + 9, 18, 13);
    const bx = L ? r.x + 3 : r.x + r.w - 37;
    // cama: cabecero, pie, colchón, manta y almohada
    const head = L ? bx : bx + 31, foot = L ? bx + 31 : bx;
    rect(c, head, fl - 18, 4, 18, P.contorno); rect(c, head + 1, fl - 17, 2, 17, P.madera);
    rect(c, head + 1, fl - 17, 2, 1, P.maderaLuz);
    rect(c, foot, fl - 11, 4, 11, P.contorno); rect(c, foot + 1, fl - 10, 2, 10, P.madera);
    const mx = bx + 3, mw = 29;
    rect(c, mx, fl - 11, mw, 7, P.contorno);
    rect(c, mx, fl - 10, mw, 2, P.marfil);
    rect(c, mx, fl - 8, mw, 2, P.maderaOscura);
    const blx = L ? mx + 9 : mx;
    rect(c, blx, fl - 11, 20, 4, manta);
    rect(c, blx, fl - 11, 20, 1, P.marfil);
    rect(c, blx, fl - 8, 20, 1, mantaOscura);
    const pil = L ? mx + 1 : mx + mw - 8;
    rect(c, pil, fl - 13, 7, 3, P.contorno); rect(c, pil + 1, fl - 13, 5, 2, P.blanco);
    // mesilla con vela
    const nx = L ? bx + 38 : bx - 12;
    rect(c, nx, fl - 10, 9, 10, P.contorno);
    rect(c, nx + 1, fl - 9, 7, 9, P.maderaOscura);
    rect(c, nx, fl - 11, 9, 2, P.maderaLuz);
    rect(c, nx + 2, fl - 6, 5, 1, P.zocaloLuz);
    rect(c, nx + 4, fl - 14, 1, 3, P.marfil);
    r.candle = [nx + 4, fl - 15];
    // alfombra
    const rx = L ? r.x + 40 : r.x + 14;
    rect(c, rx, fl - 1, 18, 1, manta); rect(c, rx, fl, 18, 1, mantaOscura);
  }

  function lampWall(c, x, y) {
    rect(c, x, y - 2, 1, 2, P.contorno);
    rect(c, x - 3, y, 7, 7, P.contorno);
    rect(c, x - 2, y + 1, 5, 5, P.brasa);
    dot(c, x - 1, y + 2, P.chispa);
    rect(c, x - 2, y + 6, 5, 1, P.metal);
  }

  // La buhardilla reparada: pared, suelo, ventanuco abierto y su cama 
  function drawAtticRoom(c) {
    poly(c, ATTIC, P.pared);
    for (const x of [140, 170, 240, 270]) {
      const top = Math.round(ROOF.apex[1] + ROOF.thick + Math.abs(x - ROOF.apex[0]) * ROOF.slope);
      rect(c, x, top, 3, 130 - top, P.madera); rect(c, x + 2, top, 1, 130 - top, P.maderaOscura);
    }
    rect(c, ATTIC[0][0] + 6, 116, ATTIC[2][0] - ATTIC[0][0] - 12, 12, P.zocalo);
    rect(c, ATTIC[0][0] + 6, 115, ATTIC[2][0] - ATTIC[0][0] - 12, 1, P.zocaloLuz);
    rect(c, ATTIC[0][0], 128, ATTIC[2][0] - ATTIC[0][0], 2, P.madera);
    disc(c, 205, 96, 9, P.maderaOscura); disc(c, 205, 96, 7, P.noche);
    rect(c, 204, 89, 2, 15, P.maderaOscura); rect(c, 198, 95, 15, 2, P.maderaOscura);
    const bx = 150, bw = 32;
    rect(c, bx, 106, 4, 22, P.contorno); rect(c, bx + 1, 107, 2, 21, P.madera);
    rect(c, bx + bw, 116, 4, 12, P.contorno); rect(c, bx + bw + 1, 117, 2, 11, P.madera);
    rect(c, bx + 3, 117, bw - 2, 7, P.contorno); rect(c, bx + 3, 118, bw - 2, 2, P.marfil); rect(c, bx + 3, 120, bw - 2, 2, P.maderaOscura);
    rect(c, bx + 12, 117, bw - 13, 4, '#B7834F'); rect(c, bx + 12, 117, bw - 13, 1, P.marfil);
    rect(c, bx + 4, 114, 7, 3, P.contorno); rect(c, bx + 5, 114, 5, 2, P.blanco);
    rect(c, 222, 127, 30, 1, P.rojo); rect(c, 222, 128, 30, 1, P.rojoOscuro);
  }

  function drawAttic(c) {
    if (has('buhardilla')) return drawAtticRoom(c);
    poly(c, ATTIC, P.buhardilla);
    // vigas del tejado vistas desde dentro
    for (const x of [140, 170, 240, 270]) {
      const top = Math.round(ROOF.apex[1] + ROOF.thick + Math.abs(x - ROOF.apex[0]) * ROOF.slope);
      rect(c, x, top, 3, 130 - top, P.buhardillaLuz);
      rect(c, x + 2, top, 1, 130 - top, P.contorno);
    }
    // ventanuco redondo, tapiado
    disc(c, 205, 96, 9, P.maderaOscura);
    disc(c, 205, 96, 7, '#17131E');
    // tablones clavados
    for (const [x, y, w] of [[160, 102, 90], [134, 116, 142]]) {
      rect(c, x, y, w, 6, P.contorno);
      rect(c, x + 1, y + 1, w - 2, 4, P.tabla);
      rect(c, x + 1, y + 1, w - 2, 1, P.tablaLuz);
      for (const nx of [x + 3, x + w - 4]) dot(c, nx, y + 3, P.metalLuz);
    }
    for (let i = -1; i <= 1; i++) {
      line(c, 196, 87 + i, 214, 105 + i, P.tabla);
      line(c, 214, 87 + i, 196, 105 + i, P.tablaLuz);
    }
    // telarañas en las esquinas
    for (const [cx, dir] of [[ATTIC[0][0] + 10, 1], [ATTIC[2][0] - 10, -1]]) {
      line(c, cx, 129, cx + dir * 10, 121, P.estrellaTenue);
      line(c, cx + dir * 4, 129, cx + dir * 5, 125, P.estrellaTenue);
      line(c, cx + dir * 8, 129, cx + dir * 9, 123, P.estrellaTenue);
    }
  }

  // Lo que se ve de cada mejora por fuera y en recepción
  function drawUpgrades(c) {
    if (has('estanque')) {
      for (let dy = 0; dy < 7; dy++) {
        const half = Math.round(17 * Math.sqrt(1 - (dy / 7.5) ** 2));
        rect(c, 344 - half, GROUND + dy, half * 2, 1, dy < 1 ? P.cieloBajo : dy < 3 ? '#4F8FAF' : '#376F8F');
      }
      for (const x of [325, 330, 358, 363]) { rect(c, x, GROUND - 2, 4, 3, P.contorno); rect(c, x + 1, GROUND - 2, 2, 2, P.piedraLuz); }
      for (const [x, h] of [[322, 9], [324, 6], [366, 8], [368, 11]]) { rect(c, x, GROUND - h, 1, h, P.verdeOscuro); rect(c, x, GROUND - h, 1, 2, P.zocaloOscuro); }
    }
    if (has('termal')) {
      rect(c, 372, GROUND - 9, 22, 10, P.contorno); rect(c, 373, GROUND - 8, 20, 8, P.madera);
      for (let x = 374; x < 393; x += 4) rect(c, x, GROUND - 8, 1, 8, P.maderaOscura);
      rect(c, 373, GROUND - 9, 20, 2, '#9FDFEF');
    }
    if (has('jardin')) {
      for (const x of [104, 150, 196, 242, 288]) {
        disc(c, x, GROUND + 3, 4, P.hoja); disc(c, x - 1, GROUND + 2, 2, P.hojaLuz);
        for (const [dx, dy, col] of [[-2, 1, P.rojo], [2, 3, P.azul], [1, 0, P.rojo]]) dot(c, x + dx, GROUND + dy, col);
      }
    }
    if (has('chimenea')) {   // chimenea en recepción, donde estaba la planta
      const r = ROOMS[0], fl = r.y + r.h - 2;
      rect(c, r.x + 1, fl - 22, 20, 22, P.contorno); rect(c, r.x + 2, fl - 21, 18, 21, P.piedra);
      for (let y = fl - 18; y < fl; y += 4) rect(c, r.x + 2, y, 18, 1, P.piedraOscura);
      rect(c, r.x, fl - 23, 22, 3, P.piedraLuz);
      rect(c, r.x + 6, fl - 11, 10, 11, '#1F1416');
      r.fire = [r.x + 11, fl - 1];
    }
    if (has('macetas')) {   // macetas con flores bajo cada ventana de los dormitorios
      for (const r of ROOMS.filter(r => r.color)) {
        const L = r.x !== 169, wx = L ? r.x + 45 : r.x + 3, wy = r.y + 26;
        rect(c, wx, wy, 24, 3, P.contorno); rect(c, wx + 1, wy, 22, 2, P.maceta);
        for (let x = wx + 2; x < wx + 22; x += 4) { dot(c, x, wy - 1, P.hoja); dot(c, x + 1, wy - 2, [P.rojo, P.oro, P.marfil][(x >> 2) % 3]); }
      }
    }
    if (has('cuadro')) {    // la foto de Manolo de líder de gimnasio, con Charizard joven
      const r = ROOMS[1];
      rect(c, r.x + 52, r.y + 8, 16, 13, P.oro); rect(c, r.x + 53, r.y + 9, 14, 11, P.contorno);
      rect(c, r.x + 54, r.y + 10, 12, 9, '#C7673F'); rect(c, r.x + 54, r.y + 16, 12, 3, '#7F3323');
      rect(c, r.x + 56, r.y + 12, 2, 5, P.marfil); rect(c, r.x + 56, r.y + 11, 2, 1, '#FBB995');
      rect(c, r.x + 60, r.y + 12, 4, 4, P.brasaFuerte); dot(c, r.x + 64, r.y + 11, P.brasa);
    }
    if (has('alfombra')) {  // alfombra roja de la puerta al mostrador
      const r = ROOMS[0], fl = r.y + r.h - 2;
      rect(c, r.x, fl - 1, 40, 2, P.rojo); rect(c, r.x, fl, 40, 1, P.rojoOscuro);
      for (let x = r.x + 2; x < r.x + 40; x += 6) dot(c, x, fl - 1, P.oro);
    }
    if (has('banderines')) {   // banderines de colores cruzando el comedor
      const r = ROOMS[1];
      for (let i = 0; i < r.w; i++) dot(c, r.x + i, r.y + 4 + Math.round(4 * Math.sin(Math.PI * i / r.w)), P.viga);
      for (let i = 4; i < r.w - 4; i += 7) {
        const y = r.y + 5 + Math.round(4 * Math.sin(Math.PI * i / r.w)), col = [P.rojo, P.oro, P.azul, P.verde][(i / 7 | 0) % 4];
        rect(c, r.x + i, y, 5, 2, col); rect(c, r.x + i + 1, y + 2, 3, 1, col); dot(c, r.x + i + 2, y + 3, col);
      }
    }
    if (has('farolillos')) {
      for (let i = 0; i <= 230; i++) dot(c, 90 + i, 141 - LAYOUT.lift + Math.round(3 * Math.sin(Math.PI * ((i % 46) / 46))), P.viga);
    }
  }

  function drawEntrance(c) {
    // puerta abierta en el muro izquierdo
    rect(c, 90, 214, 4, 30, '#1F1416');
    rect(c, 82, 214, 8, 30, P.contorno);
    rect(c, 83, 215, 6, 29, P.madera);
    rect(c, 83, 215, 6, 1, P.maderaLuz);
    dot(c, 84, 229, P.oro);
    // tejadillo del porche
    for (let i = 0; i < 26; i++) {
      const y = 202 + Math.floor(i / 4);
      rect(c, 89 - i, y, 1, 3, P.tejadoOscuro);
      dot(c, 89 - i, y - 1, P.contorno);
      dot(c, 89 - i, y, P.tejado);
    }
    rect(c, 64, 208, 1, 4, P.contorno);
    rect(c, 66, 209, 3, 35, P.contorno); rect(c, 67, 209, 1, 35, P.viga);
    // cartel colgante con el nombre (líneas de letra: a este tamaño no se leería)
    rect(c, 70, 206, 1, 5, P.viga); rect(c, 84, 204, 1, 7, P.viga);
    rect(c, 68, 211, 19, 10, P.contorno);
    rect(c, 69, 212, 17, 8, P.madera);
    rect(c, 69, 212, 17, 1, P.maderaLuz);
    rect(c, 71, 214, 4, 1, P.marfil); rect(c, 76, 214, 8, 1, P.marfil);
    rect(c, 71, 217, 13, 1, P.marfil);
    // gancho del farolillo
    rect(c, 77, 205, 1, 2, P.contorno);
  }

  // ---------- lo que se mueve ----------

  function glow(c, x, y, rad, col, a) {
    a *= LIT[time];
    c.globalAlpha = a * 0.5; disc(c, x, y, rad, col);
    c.globalAlpha = a; disc(c, x, y, Math.round(rad * 0.55), col);
    c.globalAlpha = 1;
  }

  // Un fallo en un fotograma no puede parar la animación para siempre: se apunta y se sigue
  function frame(t) {
    if (!running) return;
    // tapada por la recepción, la cocina o el libro: se para el bucle hasta que vuelva
    if (paused) { looping = false; return; }
    try { drawFrame(t); } catch (err) { console.error('[escena]', err); }
    requestAnimationFrame(frame);
  }

  function drawFrame(t) {
    // el pixel art se anima a saltos: con ~30 fotogramas por segundo sobra (y el móvil lo agradece)
    if (t - drawn < 30) return;
    drawn = t;
    // la cámara se acerca poco a poco a donde tiene que mirar (y al acabar, vuelve)
    if (camTarget != null) {
      setPan(pan + (camTarget - pan) * 0.18, true);
      if (!van && Math.abs(camTarget - pan) < 0.5) { setPan(camTarget); camTarget = null; }
    }
    const c = lc;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(stat, 0, 0);
    c.setTransform(1, 0, 0, 1, v.wx, v.wy);
    const s = t / 1000;
    const x0 = -v.wx - 1, x1 = v.LW - v.wx + 1;

    // estrellas que titilan
    for (const st of stars) {
      if (time !== 'noche' || !st.tw || st.x < x0 || st.x > x1) continue;
      const k = Math.sin(s * 1.4 + st.p);
      if (k > 0.6) {
        dot(c, st.x, st.y, P.estrella);
        if (k > 0.92) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(c, st.x + dx, st.y + dy, P.canto);
      } else if (k > -0.3) dot(c, st.x, st.y, P.estrellaTenue);
    }

    // humo de la chimenea
    for (let i = 0; i < 5; i++) {
      const k = (s * 0.16 + i / 5) % 1;
      c.globalAlpha = 0.35 * (1 - k);
      disc(c, 274 + Math.round(Math.sin(k * 5 + i) * 2 + k * 18), Math.round(58 - LAYOUT.lift - k * 46), Math.round(2 + k * 6), '#AFB7CF');
    }
    c.globalAlpha = 1;

    const flick = Math.sin(s * 9) * Math.sin(s * 5.3) > 0.25;
    const [rec, com, coc] = ROOMS;
    // luz cálida de lámparas y velas, en escalones
    glow(c, rec.lamp[0], rec.lamp[1], 22, P.brasa, 0.12);
    glow(c, com.lamp[0], com.lamp[1], 24, P.brasa, 0.13);
    for (const h of ROOMS.filter(r => r.candle && exists(r))) {
      glow(c, h.candle[0], h.candle[1], 14, P.brasa, 0.13);
      dot(c, h.candle[0], h.candle[1], P.brasa);
      dot(c, h.candle[0], h.candle[1] - 1, flick ? P.chispa : P.brasa);
    }
    // mejoras con movimiento: fuego de la chimenea, vapor del termal, farolillos
    if (has('chimenea') && rec.fire) {
      const [fx, fy] = rec.fire;
      glow(c, fx, fy - 4, 16, P.brasaFuerte, 0.35 / LIT[time]);
      rect(c, fx - 4, fy - 2, 8, 2, P.brasaHonda);
      for (let i = -3; i <= 3; i += 2) rect(c, fx + i, fy - 3 - ((Math.floor(s * 8) + i * 7) & 3), 1, 2 + ((i + Math.floor(s * 6)) & 1), flick ? P.brasa : P.brasaFuerte);
    }
    if (has('termal')) for (let i = 0; i < 3; i++) {
      const k = (s * 0.4 + i / 3) % 1;
      c.globalAlpha = 0.5 * (1 - k); disc(c, 376 + i * 7 + Math.round(Math.sin(k * 6 + i) * 2), Math.round(GROUND - 11 - k * 12), 1 + Math.round(k * 2), P.marfil); c.globalAlpha = 1;
    }
    if (has('farolillos')) for (let i = 0; i < 10; i++) {
      const x = 92 + i * 25, y = 143 - LAYOUT.lift + Math.round(3 * Math.sin(Math.PI * (((x - 90) % 46) / 46)));
      const col = [P.rojo, P.oro, P.verde, P.azul][i % 4];
      if (time === 'noche' || time === 'tarde') glow(c, x, y + 2, 6, col, 0.25);
      rect(c, x - 1, y, 3, 4, P.contorno); dot(c, x, y + 1, col); dot(c, x, y + 2, col);
    }

    // ascuas del fogón
    const [hx, hy] = coc.hearth;
    glow(c, hx, hy - 6, 18, P.brasaFuerte, 0.2);
    rect(c, hx - 7, hy - 4, 14, 2, P.brasaHonda);
    rect(c, hx - 5, hy - 5, 10, 1, P.brasaFuerte);
    for (let i = -5; i <= 4; i += 3) dot(c, hx + i, hy - 5, ((i + Math.floor(s * 6)) & 3) ? P.brasaFuerte : P.brasa);
    rect(c, hx - 3, hy - 6, 2, 1, P.brasa); rect(c, hx + 1, hy - 6, 2, 1, flick ? P.chispa : P.brasa);
    // farolillo del porche
    glow(c, 77, 210, 14, P.brasa, 0.16);
    rect(c, 75, 207, 5, 6, P.contorno);
    rect(c, 76, 208, 3, 4, flick ? P.chispa : P.brasa);
    // brasa del pino quemado, que late despacio
    const beat = 0.5 + 0.5 * Math.sin(s * 1.7);
    const ex = PINE.x + 1, ey = PINE.base - 9;
    glow(c, ex, ey, 10, P.brasaFuerte, 0.1 + 0.12 * beat);
    for (let dy = -5; dy <= 5; dy++) {
      const half = Math.round(2.6 * Math.sqrt(1 - (dy / 5.5) ** 2));
      rect(c, ex - half, ey + dy, half * 2 + 1, 1, P.brasaHonda);
      if (half > 1) rect(c, ex - half + 1, ey + dy, half * 2 - 1, 1, dy > 1 ? (beat > 0.4 ? P.brasa : P.brasaFuerte) : P.brasaFuerte);
    }
    dot(c, ex, ey + 3, beat > 0.7 ? P.chispa : P.brasa);
    for (let i = 0; i < 3; i++) {
      const k = (s * 0.3 + i / 3) % 1;
      if (k < 0.85) dot(c, ex + Math.round(Math.sin(k * 8 + i * 2) * 4), Math.round(ey - 10 - k * 34), k < 0.4 ? P.brasa : P.brasaFuerte);
    }

    // la furgoneta del reparto y la caja que deja
    if (van) drawVan(c, t);
    if (crate) {
      rect(c, 72, GROUND - 7, 11, 7, P.contorno); rect(c, 73, GROUND - 6, 9, 6, P.madera);
      rect(c, 73, GROUND - 6, 9, 1, P.maderaLuz); rect(c, 77, GROUND - 6, 1, 6, P.maderaOscura);
      for (const x of [74, 76, 79]) { rect(c, x, GROUND - 9, 1, 3, P.rojo); dot(c, x, GROUND - 9, P.brasaFuerte); }
    }

    // personajes, de atrás adelante, con su globo y el borde si está elegido
    for (const a of actors) a.update(t);
    for (const a of [...actors].sort((p, q) => p.y - q.y)) a.draw(c, t);
    for (const a of actors) {
      const b = a.bounds();
      if (a.selected) {
        const off = Math.floor(t / 125);
        perimeter([[b.x - 2, b.y - 2], [b.x + b.w + 1, b.y - 2], [b.x + b.w + 1, b.y + b.h + 1], [b.x - 2, b.y + b.h + 1]])
          .forEach(([x, y], i) => { if ((i + off) % 6 < 3) dot(c, x, y, P.brasa); });
      }
      // acaba de ganar (o perder) un corazón: sube uno rosa, o cae uno roto
      if (a.pop && t - a.pop.t < 1400) {
        const k = (t - a.pop.t) / 1400, up = a.pop.up;
        const HP = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
        const hx = Math.round(a.x) - 3, hy = Math.round(b.y) - 10 + (up ? -k * 12 : k * 6);
        c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        HP.forEach((row, dy) => [...row].forEach((ch, dx) => {
          if (ch !== 'X' || (!up && dx === 3 && dy % 2 === 0)) return;   // el roto, con su grieta
          dot(c, hx + dx + (!up && dx > 3 ? 1 : 0), hy + dy, up ? (dy === 1 && dx === 1 ? '#FFC7D7' : '#E2577F') : '#5F6777');
        }));
        c.globalAlpha = 1;
      }
      // llorando (Larvitar con el corazón roto): dos lagrimitas que caen
      if (a.llora && !a.goal && time !== 'noche') for (const s of [-1, 1]) {
        const k = ((t / 600) + (s > 0 ? 0.5 : 0)) % 1;
        dot(c, Math.round(a.x + s * 3 + s * k * 2), Math.round(b.y + 7 + k * 7), k < 0.2 ? '#FFFFFF' : '#6FB7FF');
      }
      if (a.mood && !a.goal) drawMood(c, a.mood, Math.round(a.x) - 4, Math.round(b.y) - 11 + (Math.floor(t / 400) % 2));
      // al señalarlo: su felicidad, cinco corazoncitos encima
      if ((hover === a || a.selected) && a.hearts != null && time !== 'noche' && !a.goal) drawHearts(c, a.hearts, Math.round(a.x) - 14, Math.round(b.y) - (a.mood ? 17 : 7));
      // humo por la nariz (Charizard de morros)
      if (a.fuming) for (let i = 0; i < 2; i++) {
        const k = (t / 1100 + i / 2) % 1;
        c.globalAlpha = 0.6 * (1 - k);
        disc(c, Math.round(a.x + 8 + k * 6), Math.round(b.y + 6 - k * 9), Math.round(1 + k * 2), '#5F5A67');
        c.globalAlpha = 1;
      }
    }

    // lluvia: cielo algo más oscuro y gotas en diagonal por delante de todo
    if (rain) {
      c.globalAlpha = 0.18; c.fillStyle = '#100C14'; c.fillRect(x0, -40, x1 - x0, WORLD.h + 80); c.globalAlpha = 1;
      c.fillStyle = '#9FB7DF';
      for (let i = 0; i < 160; i++) {
        const gx = ((i * 73.3) % (x1 - x0 + 40)) + x0 - 20, sp = 180 + (i % 5) * 20;
        const gy = ((i * 37.1 + t / 1000 * sp) % (WORLD.h + 40)) - 40;
        c.fillRect(Math.round(gx - gy * 0.15), Math.round(gy), 1, 3);
      }
    }

    // habitaciones libres para elegir: borde que parpadea
    // habitaciones libres para elegir: se iluminan por dentro (latiendo) y llevan borde fijo
    if (highlight.size) {
      const pulse = 0.2 + 0.1 * Math.sin(s * 4);
      for (const rm of ROOMS) {
        if (!highlight.has(rm.id) || !exists(rm)) continue;
        c.globalAlpha = pulse; c.fillStyle = P.chispa;
        if (!rm.poly) c.fillRect(rm.x, rm.y, rm.w, rm.h);
        c.globalAlpha = 1;
        for (const [x, y] of outlines.get(rm)) c.fillRect(x, y, 1, 1);
      }
    }

    // habitación señalada: borde discontinuo que avanza
    if (hover && outlines.has(hover)) {
      const pts = outlines.get(hover), off = Math.floor(s * 8);
      c.fillStyle = P.brasa;
      pts.forEach(([x, y], i) => { if ((i + off) % 6 < 3) c.fillRect(x, y, 1, 1); });
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, v.LW, v.LH, 0, 0, v.LW * v.S, v.LH * v.S);
  }

  const LOGO_FAMADESA = new Image();
  LOGO_FAMADESA.src = 'assets/ui/famadesa.png';

  function drawVan(c, t) {
    const e = t - (van.t0 ??= t);
    let x, moving = true;
    if (e < VAN.in) { const k = e / VAN.in; x = -110 + (VAN.park + 110) * (1 - (1 - k) ** 2); }
    else if (e < VAN.in + VAN.stop) {
      x = VAN.park; moving = false;
      if (!crate && e > VAN.in + 400) { crate = true; van.onDrop?.(); }
    } else if (e < VAN.in + VAN.stop + VAN.out) { const k = (e - VAN.in - VAN.stop) / VAN.out; x = VAN.park - (VAN.park + 120) * k * k; }
    else { const done = van.done; if (van.pan0 != null) camTarget = van.pan0; van = null; done(); return; }
    // en vertical la furgoneta llega por fuera del encuadre: la cámara la sigue (sin pasarse de donde estaba)
    if (panMax > 0) camTarget = Math.min(van.pan0 ??= pan, x + 38 + (v.aw / v.S) * 0.15 - (FIT0.x + FIT0.w / 2));
    x = Math.round(x);
    // furgoneta grande: caja de 60 px y cabina de 16, rótulo con letras al doble
    const y = GROUND, top = y - 28, L = 60;
    rect(c, x, top, L, 24, P.contorno); rect(c, x + 1, top + 1, L - 2, 22, P.marfil);
    rect(c, x + 1, top + 1, L - 2, 1, P.blanco);
    rect(c, x + L, top + 7, 16, 17, P.contorno); rect(c, x + L + 1, top + 8, 14, 15, P.marfil);
    rect(c, x + L + 4, top + 10, 9, 6, '#9FDFEF'); rect(c, x + L + 4, top + 10, 3, 1, P.blanco);
    rect(c, x + L + 14, top + 18, 2, 3, P.oro);
    rect(c, x + L + 1, top + 17, 3, 1, P.piedraOscura);
    rect(c, x + 1, top + 16, L + 14, 3, P.rojo);
    rect(c, x + 1, top + 19, L + 14, 1, P.rojoOscuro);
    // Famadesa lleva su logo; los demás (Don Paco), el rótulo con letras al doble
    if (van.text === 'FAMADESA' && LOGO_FAMADESA.complete && LOGO_FAMADESA.naturalWidth) c.drawImage(LOGO_FAMADESA, x + 7, top + 1);
    else [...van.text].forEach((ch, i) => (VAN_FONT[ch] || VAN_FONT[' ']).forEach((row, dy) => [...row].forEach((px, dx) => {
      if (px === 'X') rect(c, x + 3 + i * 7 + dx * 2, top + 3 + dy * 2, 2, 2, P.rojo);
    })));
    rect(c, x, y - 5, L + 17, 2, P.contorno);
    // ruedas que giran mientras se mueve
    const spin = moving ? Math.floor(t / 80) % 4 : 0;
    for (const wx of [x + 12, x + L + 6]) {
      disc(c, wx, y - 3, 4, P.contorno); disc(c, wx, y - 3, 2, P.metal);
      const [dx, dy] = [[0, -3], [3, 0], [0, 3], [-3, 0]][spin]; dot(c, wx + dx, y - 3 + dy, P.metalLuz);
    }
    // humo del tubo de escape
    if (moving) for (let i = 0; i < 2; i++) {
      const k = (t / 500 + i / 2) % 1;
      c.globalAlpha = 0.5 * (1 - k); disc(c, Math.round(x - 2 - k * 8), Math.round(y - 4 - k * 5), 1 + Math.round(k * 2), '#9F9AA7'); c.globalAlpha = 1;
    }
  }

  function drawHearts(c, n, x, y) {
    const H = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
    c.fillStyle = P.contorno; c.fillRect(x - 1, y - 1, 30, 6);
    for (let i = 0; i < 5; i++) H.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch === 'X') dot(c, x + i * 6 + dx, y + dy, i < n ? '#E2577F' : '#5F6777');
    }));
  }

  function drawMood(c, mood, x, y) {
    const sym = MOODS[mood];
    if (!sym) return;
    BUBBLE.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== '.') dot(c, x + dx, y + dy, ch === 'L' ? P.contorno : P.marfil);
    }));
    sym.rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== '.') dot(c, x + 1 + dx, y + 1 + dy, sym.col);
    }));
  }

  // ---------- ratón ----------

  function toWorld(ev) {
    const rc = canvas.getBoundingClientRect();
    return [(ev.clientX - rc.left) * v.dpr / v.S - v.wx, (ev.clientY - rc.top) * v.dpr / v.S - v.wy];
  }

  function inPoly([x, y], pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function roomAt(p) {
    const actor = [...actors].reverse().find(a => {
      const b = a.bounds();
      return p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h;
    });
    if (actor) return actor;
    return ROOMS.filter(exists).find(rm => rm.poly ? inPoly(p, rm.poly)
      : p[0] >= rm.x && p[0] < rm.x + rm.w && p[1] >= rm.y && p[1] < rm.y + rm.h) || null;
  }

  // arrastrar para mover la cámara (solo en vertical); si se ha arrastrado, no cuenta como toque
  let drag = null, dragged = false;
  canvas.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, pan, on: false }; });
  window.addEventListener('pointerup', () => { if (drag?.on) { dragged = true; setTimeout(() => { dragged = false; }, 0); } drag = null; });
  canvas.addEventListener('pointermove', ev => {
    if (drag && panMax > 0) {
      const dx = ev.clientX - drag.x;
      if (Math.abs(dx) > 8) drag.on = true;
      if (drag.on) { setPan(drag.pan - dx * v.dpr / v.S); return; }
    }
  });
  canvas.addEventListener('pointermove', ev => {
    if (!running || drag?.on) return;
    const room = roomAt(toWorld(ev));
    if (room !== hover) {
      hover = room;
      canvas.style.cursor = room ? 'pointer' : 'default';
    }
    onHover(room, ev);
  });
  canvas.addEventListener('pointerleave', () => { hover = null; onHover(null); });

  window.addEventListener('resize', resize);

  return {
    resize,
    setInsets(val) { insets = { ...insets, ...val }; resize(); },
    setActors(list) { actors = list; },
    setHighlight(ids) { highlight = new Set(ids); },
    setPaused(on) {
      paused = on;
      if (!on && running && !looping) { looping = true; requestAnimationFrame(frame); }
    },
    setUpgrades(list) {
      const key = [...list].sort().join();
      if (key === [...upgrades].sort().join()) return;
      upgrades = new Set(list);
      ROOMS.find(r => r.id === 'buhardilla').cerrada = !has('buhardilla');
      // cada planta construida sube la casa (y hay que recolocar el encuadre)
      if (setPisos(has('planta-3') ? 2 : has('planta-2') ? 1 : 0)) { buildOutlines(); resize(); }
      else paintStatic();
    },
    // Momento del día: manana, dia, tarde o noche (cambia cielo, paisaje y luces)
    // La furgoneta de la chistorra: entra, deja la caja (onDrop) y se va; la promesa acaba al irse
    playVan(onDrop, text = 'FAMADESA') {
      return new Promise(done => { van = { t0: null, done, onDrop, text }; });
    },
    setRain(on) { if (on !== rain) { rain = on; paintStatic(); } },
    setTime(t) {
      if (t !== 'manana') crate = false;
      if (t === time || !LIT[t]) return;
      time = t;
      Object.assign(P, SKY[t]);
      paintStatic();
    },
    setInteractive(on) { canvas.style.pointerEvents = on ? 'auto' : 'none'; if (!on) { hover = null; onHover(null); } },
    // Punto del mundo (píxeles nativos) a píxeles CSS de la pantalla, y tamaño de un píxel nativo
    toScreen(x, y) { return { x: (x + v.wx) * v.S / v.dpr, y: (y + v.wy) * v.S / v.dpr, px: v.S / v.dpr }; },
    onHover(cb) { onHover = cb; },
    onClick(cb) { canvas.addEventListener('click', ev => { if (!dragged) cb(roomAt(toWorld(ev)), ev); }); },
    // ¿se puede mover la cámara? (en vertical) y llevarla a un sitio del mundo
    get movil() { return panMax > 0; },
    mirar(x) { if (panMax > 0) setPan(x - (FIT0.x + FIT0.w / 2)); },
    start() { if (!running) { running = true; looping = true; resize(); requestAnimationFrame(frame); } },
  };
}
