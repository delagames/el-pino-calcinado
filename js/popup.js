// Ventanita con la escena de un encargo, en pixel art a 128×64 nativo. Cada objeto
// tiene su guion (quién entra, qué lleva, qué pasa y cómo reacciona el huésped).
// El texto no se repite aquí: ya lo dice la caja de Manolo y Charizard.
import { loadSprite, Actor, DIR, addBuddy } from './sprites.js';

const W = 128, H = 64, FLOOR = 56, GUEST_X = 96;
// Junto al estanque no hay cuarto: hay césped, la charca y una mesita donde se dejan las cosas
const TABLE = { x: GUEST_X - 22, top: FLOOR - 9 };

const C = {
  L: '#100C14', W: '#F4EFE6', c: '#9FDFEF', B: '#4F8FAF', M: '#8F97A7', G: '#D7CFBF',
  D: '#4F2F1F', O: '#A75F37', R: '#C73F2F', Y: '#FFB347', P: '#E2577F', S: '#AFB7CF',
  K: '#6F4527', k: '#9F6A3F', b: '#C7873F', h: '#E7B76F', g: '#6F9F4F', y: '#F7D74F', p: '#E79FA7',
  n: '#2B3A7A', v: '#9F6FCF', e: '#3F6F3F', o: '#F79F3F', t: '#5F5F6F', r: '#7F1F1F',
};

// Letras de 3×5 para las onomatopeyas («CLIN», «DING», «TOC») y los carteles
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', Ñ: '111000110101101', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111',
  3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110', '?': '110001010000010', '*': '000101010101000', '+': '000010111010000',
  '-': '000000111000000', '.': '000000000000010', ',': '000000000010100', ':': '000010000010000', "'": '010010000000000',
  '!': '010010010000010', ' ': '000000000000000', '«': '000001010001000', '»': '000100010100000',
};
const textWidth = s => [...s].length * 4 - 1;
// pinta un texto con su contorno oscuro (o sin él), arriba a la izquierda en (x, y)
function texto(c, str, x, y, color = 'W', outline = 'L') {
  const glyphs = [...str.toUpperCase()].map(ch => FONT[ch] || FONT['?']);
  const pass = (col, ox, oy) => {
    c.fillStyle = C[col] || col;
    glyphs.forEach((gl, i) => { for (let j = 0; j < 15; j++) if (gl[j] === '1') c.fillRect(Math.round(x) + i * 4 + (j % 3) + ox, Math.round(y) + Math.floor(j / 3) + oy, 1, 1); });
  };
  if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) pass(outline, ox, oy);
  pass(color, 0, 0);
}
// un cartel hecho con letras: marco, fondo y texto (y palos si es pancarta)
function cartel(str, { bg = 'W', ink = 'R', palos = false } = {}) {
  const w = textWidth(str) + 4, rows = [];
  const blank = () => Array(w).fill(bg);
  for (let i = 0; i < 9; i++) rows.push(i === 0 || i === 8 ? Array(w).fill('L') : ['L', ...blank().slice(2), 'L']);
  [...str.toUpperCase()].forEach((ch, i) => { const gl = FONT[ch] || FONT['?']; for (let j = 0; j < 15; j++) if (gl[j] === '1') rows[2 + Math.floor(j / 3)][2 + i * 4 + (j % 3)] = ink; });
  const out = rows.map(r => r.join(''));
  if (palos) for (let i = 0; i < 6; i++) out.push('.L' + '.'.repeat(w - 4) + 'L.');
  return out;
}
// una manta (o sábana, o mantel) del tamaño que haga falta, a rayas
function manta(w, h, a = 'B', b = 'c') {
  return Array.from({ length: h }, (_, y) => y === 0 || y === h - 1 ? 'L'.repeat(w) : 'L' + (y % 2 ? a : b).repeat(w - 2) + 'L');
}
const flipArt = art => art.map(r => [...r].reverse().join(''));
const recolor = (art, map) => art.map(r => [...r].map(ch => map[ch] || ch).join(''));

// Objetos y símbolos en píxeles ('.' transparente)
const ART = {
  hielo: ['.LLLLLL.', 'LWWccccL', 'LWccccBL', 'LcccccBL', 'LccccBBL', '.LLLLLL.'],
  hielo2: ['.LLLL.', 'LWccBL', 'LcccBL', '.LLLL.'],
  hielo3: ['.LL.', 'LcBL', '.LL.'],
  leche: ['L.....L', 'LWWWWWL', 'LWWWWWL', 'LWWWWGL', '.LWWWL.', '.LLLLL.'],
  barreno: ['LLLLLLLLL', 'LBBcBBBBL', 'LMMMMMMML', '.LMMMMML.', '.LLLLLLL.'],
  maceta: ['LLLLLLLLL', 'LDDDDDDDL', 'LOOOOOOOL', '.LOOOOOL.', '.LLLLLLL.'],
  plato: ['..RRR..', '.RYRYR.', 'LWWWWWL', '.LLLLL.'],
  chistorra: ['.RRRRR.', 'RRYRRYR', 'LWWWWWL', '.LLLLL.'],
  // bocadillo de barra: pan con su corteza y miga, y el relleno asomando (lechuga, queso, jamón)
  // encargos de Mr. Mime y Gengar
  periodico: ['LLLLLLLL', 'LWWWWWWL', 'LWLLWLWL', 'LWWWWWWL', 'LWLLLLWL', 'LLLLLLLL'],
  vela: ['..Y..', '..R..', '.LWL.', '.LWL.', '.LWL.', 'LLLLL'],
  enfado: ['.R.R.', 'RR.RR', '.....', 'RR.RR', '.R.R.'],
  // platos de la cocina
  sopa: ['L.......L', 'LRRYRRRRL', '.LWWWWWL.', '..LLLLL..'],
  pan: ['.YYYYYY.', 'LhhhhhhL', 'LbbbbbbL', '.LLLLLL.'],
  estofado: ['L.......L', 'LDODDODDL', '.LWWWWWL.', '..LLLLL..'],
  potaje: ['L.......L', 'LYOYDYOYL', '.LWWWWWL.', '..LLLLL..'],
  pizza: ['..LLLLL..', '.LYRYRYL.', 'LYRYYRYYL', '.LYYRYYL.', '..LLLLL..'],
  tarta: ['..R.R.R..', '.LWWWWWL.', '.LPPPPPL.', 'LWWWWWWWL', '.LLLLLLL.'],
  zidra: ['...g...', '..YYY..', '.YRYRY.', 'LWWWWWL', '.LLLLL.'],
  panuelos: ['..WW..', '.LWWL.', 'LppppL', 'LpWWpL', 'LppppL', 'LLLLLL'],
  // encargos de Jynx, Bulbasaur y Eevee
  abanico: ['LLLLLLLLL', 'LRPRPRPRL', '.LRPRPRL.', '..LRPRL..', '...LkL...', '....L....'],
  regadera: ['......LL', 'LLLLL.Lc', 'LMMMMLLc', 'LMSSMML.', 'LMMMML..', '.LLLL...'],
  espejo: ['.LLLL.', 'LcWccL', 'LWccBL', 'LccBBL', '.LLLL.', '..Lk..', '..LL..'],
  quemado: ['.LLLLL.', 'LLDLLDL', 'LWWWWWL', '.LLLLL.'],
  bocadillo: ['...LLLLLLLLL...', '..LhhbhhbhhbL..', '.LbbbbbbbbbbbL.', 'LgyypgyypgyypgL', '.LbbbbbbbbbbbL.', '..LLLLLLLLLLL..'],
  // encargos de los huéspedes nuevos
  batido: ['.LLLL.', 'LMMMML', 'LWWWWL', 'LppppL', 'LppppL', 'LppppL', '.LLLL.'],
  betun: ['...LL...', '..LkkL..', '.LKKKKL.', 'LLLLLLLL', 'LDDDDDDL', 'LDYYYYDL', '.LLLLLL.'],
  balon: ['..LLL..', '.LOLOL.', 'LOOLOOL', 'LLLLLLL', 'LOOLOOL', '.LOLOL.', '..LLL..'],
  cafe: ['.W..W.', '..W..W', 'LLLLL.', 'LDDDLL', 'LWWWLL', 'LWWWL.', '.LLL..'],
  tapones: ['.LL...LL.', 'LyyL.LyyL', 'LyyL.LyyL', '.LL...LL.'],
  figura: ['..LL..', '.LRRL.', 'LBRRBL', '.LBBL.', '.L..L.', 'LLLLLL', 'LMMMML', 'LLLLLL'],
  ketchup: ['..LL..', '..LL..', '.LRRL.', 'LRRRRL', 'LRWWRL', 'LRRRRL', 'LRRRRL', '.LLLL.'],
  cuchara: ['.LLL.', 'LGGGL', 'LGGGL', '.LLL.', '..L..', '...L.', '...L.', '..L..'],
  corona: ['L.L.L.L', 'LYLYLYL', 'LYYYYYL', 'LYRYBYL', 'LLLLLLL'],
  prismaticos: ['LLL.LLL', 'LMLLLML', 'LMMMMML', 'LcL.LcL', 'LLL.LLL'],
  manta: ['LLLLLLLL', 'LBBBBBBL', 'LccccccL', 'LBBBBBBL', 'LccccccL', 'LLLLLLLL'],
  peluca: ['..LLL..', '.LYYYL.', 'LYYYYYL', 'LYLLLYL', 'LYL.LYL', '.L...L.'],
  flores: ['.P.R.P.', 'PRPRPRP', '.PgRgP.', '..ggg..', '..LgL..', '..LgL..', '..LLL..'],
  puerro: ['g..g', 'gg.g', '.ggg', '.gg.', 'LWWL', 'LWWL', 'LWWL', '.LL.'],
  mosto: ['.LL......', '.LL......', 'LggL.L.L.', 'LggL.LpL.', 'LgyL..L..', 'LggL.LLL.', 'LLLL.....'],
  casco: ['..LLLLL..', '.LyyyyyL.', 'LyyyLyyyL', 'LyyyLyyyL', 'LLLLLLLLL'],
  pancarta: ['LLLLLLLLL', 'LWRWRWRWL', 'LWWWWWWWL', 'LLLLLLLLL', '.L.....L.', '.L.....L.', '.L.....L.'],
  termometro: ['.LL.', 'LWWL', 'LWWL', 'LWRL', 'LWRL', 'LRRL', 'LRRL', '.LL.'],
  mochila: ['.LLLLLL.', 'LgggggLL', 'LgWWWgLL', 'LgggggLL', 'LgggggLL', '.LLLLLL.'],
  pulsador: ['..LLL..', '.LRRRL.', 'LLLLLLL', 'LMMMMML', 'LLLLLLL'],
  panuelico: ['LLLLLLLL', 'LRRRRRRL', '.LRRRRL.', '..LRRL..', '...LL...'],
  biberon: ['..L..', '.LPL.', '.LLL.', 'LWWWL', 'LWWWL', 'LcccL', 'LcccL', '.LLL.'],
  microfono: ['.LLL.', 'LMGML', 'LGMGL', '.LLL.', '..L..', '..L..', '.LLL.'],
  mando: ['.LLLL.', 'LMRMML', 'LMMMML', 'LMyMML', 'LMMMML', 'LMMMML', '.LLLL.'],
  paraguas: ['..LLLLL..', '.LRRWRRL.', 'LRRRWRRRL', 'LLLLLLLLL', '....L....', '....L....', '..L.L....', '...L.....'],
  sobre: ['LLLLLLLLL', 'LWLWWWLWL', 'LWWLWLWWL', 'LWWWLWWWL', 'LWWWWWWWL', 'LLLLLLLLL'],
  talonario: ['LLLLLLL', 'LWWWWWL', 'LWLLLWL', 'LWWWWWL', 'LWLLWWL', 'LRRRRRL', 'LLLLLLL'],
  linterna: ['.LLL.', 'LyyyL', 'LyWyL', '.LML.', '.LML.', '.LML.', '.LLL.'],
  chistera: ['.LLLLL.', '.LLLLL.', '.LRRRL.', '.LLLLL.', 'LLLLLLL'],
  maletin: ['..LLLL..', '..L..L..', 'LLLLLLLL', 'LDDDDDDL', 'LDDyyDDL', 'LDDDDDDL', 'LLLLLLLL'],
  extintor: ['.LL....', 'LMML...', '.LRL...', 'LRRRL..', 'LRWRL..', 'LRRRL..', 'LRRRL..', '.LLL...'],
  perfume: ['..LL..', '.LMML.', 'LLLLLL', 'LPPPPL', 'LPWPPL', 'LPPPPL', '.LLLL.'],
  botellin: ['..LL..', '..LL..', '.LkkL.', 'LkkkkL', 'LkWWkL', 'LkkkkL', '.LLLL.'],
  orejeras: ['..LLLL..', '.L....L.', 'L......L', 'LPL..LPL', 'LPL..LPL', '.L....L.'],
  manzana: ['...g..', '..Lg..', '.LRRL.', 'LRWRRL', 'LRRRRL', 'LRRRRL', '.LLLL.'],
  lupa: ['.LLL..', 'LcWcL.', 'LccBL.', 'LcBBL.', '.LLLL.', '....LL', '.....L'],
  tila: ['.W.W..', '..W...', 'LLLLL.', 'LgggLL', 'LgggLL', 'LgggL.', '.LLL..'],
  rosa: ['.LRL.', 'LRPRL', 'LRRRL', '.LgL.', '.gg..', '..g..', '..g..'],
  posit: ['LLLLLL', 'LyyyyL', 'LyLLyL', 'LyyyyL', 'LyLyyL', 'LLLLL.'],
  campanilla: ['..L..', '.LyL.', 'LyyyL', 'LyWyL', 'LyyyL', 'LLLLL', '..L..'],
  pano: ['LLLLLLL', 'LcWcWcL', 'LWcWcWL', 'LcWcWcL', 'LLLLLLL'],
  carpeta: ['LLLLLLL', 'LBBBBBL', 'L.WWWBL', 'LBWLWBL', 'L.WWWBL', 'LBBBBBL', 'LLLLLLL'],
  pinza: ['.LL.', 'LkkL', 'LkkL', '.LM.', 'LkkL', 'LkkL', '.LL.'],
  barrita: ['.L.', 'LgL', 'LgL', 'LWL', 'LgL', 'LgL', '.L.'],
  cesta: ['..LLLL..', '.L....L.', 'LLLLLLLL', 'LkbkbkbL', 'LbkbkbkL', '.LLLLLL.'],
  hucha: ['.LLLLL.', 'LMLLLML', 'LMMMMML', 'LMyyyML', 'LMMMMML', '.LLLLL.'],
  nariz: ['.LLL.', 'LRRRL', 'LRWRL', 'LRRRL', '.LLL.'],
  pendulo: ['L.....', '.L....', '..L...', '...L..', '...LL.', '..LyyL', '..LyyL', '...LL.'],
  taper: ['LLLLLLLL', 'LccccccL', 'LLLLLLLL', 'LWWWWWWL', 'LWOOOOWL', 'LWWWWWWL', 'LLLLLLLL'],
  cepillo: ['LLLLLL', 'LkkkkL', 'LLLLLL', 'L.L.L.', '......', '..LL..', '..kL..', '..kL..'],
  sabana: ['LLLLLLLLLL', 'LWWWWWWWWL', 'LWcWWcWWcL', 'LWWWWWWWWL', 'LWcWWcWWcL', 'LLLLLLLLLL'],
  gorro: ['.LLLLL.', 'LWWWWWL', 'LWWWWWL', '.LWWWL.', 'LLLLLLL', 'LWWWWWL', 'LLLLLLL'],
  cronometro: ['..LL..', '.LLLL.', 'LWWWWL', 'LWWLWL', 'LWLWWL', 'LWWWWL', '.LLLL.'],
  tinte: ['..LL..', '.LMML.', 'LPPPPL', 'LPWPPL', 'LPPPPL', 'LPPPPL', '.LLLL.'],
  antorcha: ['.Y.', 'YRY', 'RYR', 'LkL', '.k.', '.k.', '.k.'],
  taza: ['.....', 'LLLL.', 'LWWLL', 'LWWL.L', 'LWWLL', 'LLLL.'],
  tirita: ['.LLLLLLL.', 'LhhpWphhL', 'LhhpWphhL', '.LLLLLLL.'],
  heart: ['.PP.PP.', 'PPPPPPP', '.PPPPP.', '..PPP..', '...P...'],
  sad: ['.LLLLLLL.', 'LWWWBWWWL', 'LWWBBBWWL', 'LWBBBBBWL', 'LWWBBBWWL', '.LLLWLLL.', '....L....'],
  note: ['..LL', '..LW', '..L.', 'LLL.', 'LLL.'],
  sweat: ['.c.', 'cBc', 'cBc', '.c.'],
  vein: ['.R.R.', 'RR.RR', '.....', 'RR.RR', '.R.R.'],
  spark: ['..W..', '..W..', 'WWYWW', '..W..', '..W..'],
  spark2: ['.....', '..W..', '.WYW.', '..W..', '.....'],
  // piezas de las escenas personalizadas
  moneda: ['.LLL.', 'LyyyL', 'LyWyL', 'LyyyL', '.LLL.'],
  cartas: ['LLL.LLL.LLL', 'LWL.LRL.LYL', 'LRL.LWL.LWL', 'LWL.LYL.LRL', 'LLL.LLL.LLL'],
  tele: ['LLLLLLLLLLLL', 'LggggggggggL', 'LgWggggRgggL', 'LggggWgggggL', 'LgRgggggWggL', 'LggggggggggL', 'LLLLLLLLLLLL', '....LLLL....', '...LLLLLL...'],
  cuadro: ['...LLLLL', '.LLccccL', 'LcccgcL.', 'LcgggggL', 'LgggggL.', 'LLLLLL..'],
  gorrion: ['..LL..', '.LkWL.', 'LkkkoL', 'LkkkL.', '.LLL..', '.L.L..'],
  seta: ['.LLL.', 'LRWRL', 'LLLLL', '.LWL.', '.LLL.'],
  niscalo: ['.LLL.', 'LOoOL', '.LhL.', '.LL..'],
  helecho: ['g.g.g', '.ggg.', 'g.g.g', '.ggg.', '..g..'],
  caramelo: ['L.LLL.L', 'LLgWgLL', 'L.LLL.L'],
  hoja: ['..Lg', '.Lgg', 'Lgg.', 'L...'],
  folio: ['LLLLL', 'LWWWL', 'LWLLL', 'LWWWL', 'LWLWL', 'LLLLL'],
  interrogacion: ['.LLL.', 'LGGGL', 'LL.GL', '..LGL', '.LGL.', '.LL..', '.LGL.', '..L..'],
  bota: ['.LL...', '.LKL..', '.LKL..', 'LLKKL.', 'LKKKKL', 'LLLLLL'],
  bota2: ['.LL...', '.LWL..', '.LKL..', 'LLKWL.', 'LKKKKL', 'LLLLLL'],
  cachimba: ['LL...', 'LkL..', '.LkLL', '..LLL'],
  vaso: ['L...L', 'LcccL', 'LcWcL', 'LcccL', '.LLL.'],
  cubohielo: ['LLLLLLLLL', 'LcWccWcBL', 'LMMMMMMML', '.LMMMMML.', '.LLLLLLL.'],
  bolsahielo: ['..L..', '.LLL.', 'LcWcL', 'LccBL', '.LLL.'],
  termo: ['.LL.', 'LMML', 'LLLL', 'LggL', 'LgWL', 'LggL', 'LggL', '.LL.'],
  babero: ['LLLLLLLLL', 'LRWRWRWRL', '.LWRWRWL.', '..LRWRL..', '...LWL...', '....L....'],
  toalla: ['LLLLLLL', 'LWcWcWL', 'LWL.LWL', 'LcL.LcL', 'LWL.LWL', '.L...L.'],
  pegatina: ['P.P', 'PPP', '.P.'],
  sello: ['LLLL', 'LRRL', 'LRRL', 'LLLL'],
  arana: ['LLLL', 'LLLL'],
  zzz: ['BBB', '..B', '.B.', 'BBB'],
  mancha: ['.pp.', 'pppp', '.pp.'],
  puerta: ['LLLLLLLLL', 'LKKKKKKKL', 'LKkkkkkKL', 'LKkkkkkKL', 'LKKKKKKKL', 'LKkkkkkKL', 'LKkkkkyKL', 'LKkkkkkKL', 'LKKKKKKKL', 'LKkkkkkKL', 'LKkkkkkKL', 'LKkkkkkKL', 'LKKKKKKKL', 'LKkkkkkKL', 'LKkkkkkKL', 'LKkkkkkKL', 'LKkkkkkKL', 'LLLLLLLLL'],
  mosto2: ['.LL.', '.LL.', 'LggL', 'LggL', 'LgyL', 'LggL', 'LLLL'],
  copa: ['L...L', 'LpppL', '.LpL.', '..L..', '.LLL.'],
  sabanagrande: [],
  semilla: ['.L.', 'LyL', '.L.'],
  libreta: ['LLLLL', 'LyWWL', 'LyLLL', 'LyWWL', 'LyLWL', 'LLLLL'],
  multa: ['LLLL', 'LWRL', 'LRWL', 'LLLL'],
  hojaTema: ['LLLLLLL', 'LWWWWWL', 'LWLLLWL', 'LWWWWWL', 'LWLLWWL', 'LWWWWWL', 'LLLLLLL'],
  flash: ['.LLLL.', 'LMWWML', 'LMMMML', '.LLLL.'],
  furgoneta: ['..LLLLLLLLLLLLLLLLL...', '..LWWWWWWWWWWWWWWWL...', '.LLWRRWWRRWWRRWWWWLLL.', 'LcLWWWWWWWWWWWWWWWLWcL', 'LcLWWWWWWWWWWWWWWWLWcL', 'LLLWWWWWWWWWWWWWWWLWWL', 'LLLLLLLLLLLLLLLLLLLLLL', '..LMML..........LMML..', '..LLLL..........LLLL..'],
  rueda: ['.LL.', 'LMML', 'LMML', '.LL.'],
  botella: ['.L.', 'LRL', 'LRL', 'LRL'],
};
ART.sabanagrande = manta(26, 7, 'W', 'c');
// los ramos que miran a la ventana (Vileplume) y los chamuscados (Cubone)
ART.floresGiradas = ['P.R.P..', 'RPRPRP.', '.PRgP..', '..gg...', '..LgL..', '..LgL..', '..LLL..'];
ART.floresQuemadas = ['.P.L.P.', 'PRPLDRP', '.PgRgP.', '..ggg..', '..LgL..', '..LgL..', '..LLL..'];
ART.cucharaDoblada = ART.interrogacion;
ART.sobreSellado = ['LLLLLLLLL', 'LWLWWWLWL', 'LWWLPLWWL', 'LWWPPPWWL', 'LWWWPWWWL', 'LLLLLLLLL'];
ART.sobreVerde = ['LLLLLLLLL', 'LWLWWWLWL', 'LWWLgLWWL', 'LWWggLWWL', 'LWWWgWWWL', 'LLLLLLLLL'];
ART.maletinAbierto = ['LLLLLLLL', 'LDDDDDDL', 'LLLLLLLL', 'LWWWWWWL', 'LDDDDDDL', 'LLLLLLLL'];
ART.tazaLlena = ['.....', 'LLLL.', 'LDDLL', 'LWWL.L', 'LWWLL', 'LLLL.'];
ART.batidoMedio = ['.LLLL.', 'LMMMML', 'LWWWWL', 'LWWWWL', 'LWWWWL', 'LppppL', '.LLLL.'];
ART.mochilaCaliente = recolor(ART.mochila, { g: 'O' });
ART.figuraDerretida = ['..LL..', '.LRRL.', 'LBRRBL', '.LBBL.', '.L..L.', 'LLLLLL', 'LMMDDL', '.LLLLL'];
ART.tinteAzul = recolor(ART.tinte, { P: 'n' });
ART.extintorPegatina = ['.LL....', 'LMML...', '.LRL...', 'LRRRL..', 'LRyRL..', 'LRyRL..', 'LRRRL..', '.LLL...'];

function stamp(c, rows, x, y) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch !== '.') { c.fillStyle = C[ch]; c.fillRect(Math.round(x) + dx, Math.round(y) + dy, 1, 1); }
  }));
}

function disc(c, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    c.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

// ---------- el cuarto ----------

function pond(c, s) {
  // cielo de la hora, montañas, césped y la charca bajo el huésped
  const k = s.day ? 0 : s.tarde ? 1 : 2;   // día, atardecer o noche
  c.fillStyle = ['#77B7EF', '#C7678F', '#1F2742'][k]; c.fillRect(0, 0, W, H);
  c.fillStyle = ['#B7E3F7', '#FFA76F', '#253058'][k]; c.fillRect(0, 20, W, 14);
  c.fillStyle = ['#5F87BF', '#6F5F8F', '#28315A'][k];
  for (let x = 0; x < W; x++) { const h = Math.round(8 + 5 * Math.sin(x / 11) + 3 * Math.sin(x / 5)); c.fillRect(x, 36 - h, 1, h + 4); }
  if (k === 2) { c.fillStyle = C.W; for (const [x, y] of [[12, 6], [40, 10], [70, 4], [110, 12]]) c.fillRect(x, y, 1, 1); }
  c.fillStyle = ['#579F5F', '#5F7F4F', '#232B4E'][k]; c.fillRect(0, 38, W, H - 38);
  c.fillStyle = ['#3F7F4F', '#4F6343', '#1B2240'][k]; c.fillRect(0, 38, W, 1);
  // en el prado (sin charca ni mesita): el pino calcinado de la entrada y matas de hierba
  if (s.prado) {
    if (!s.cueva && s.pino !== false) { c.fillStyle = C.L; c.fillRect(18, 10, 3, 30); c.fillRect(14, 16, 11, 1); c.fillRect(15, 22, 9, 1); c.fillRect(13, 28, 13, 1); }
    c.fillStyle = ['#3F7F4F', '#4F6343', '#1B2240'][k];
    for (const x of [8, 44, 66, 90, 116]) { c.fillRect(x, 48, 1, 2); c.fillRect(x + 2, 47, 1, 3); c.fillRect(x + 4, 49, 1, 1); }
    if (s.nido) {
      // el pino calcinado de cerca: el tronco negro, dos ramas peladas y el nido arriba, donde duerme
      c.fillStyle = C.L; c.fillRect(GUEST_X - 3, 2, 6, FLOOR + 1 - 2);
      c.fillRect(GUEST_X - 16, 14, 13, 1); c.fillRect(GUEST_X + 3, 9, 14, 1); c.fillRect(GUEST_X + 3, 40, 10, 1);
      c.fillStyle = '#2A2430'; c.fillRect(GUEST_X - 2, 2, 1, FLOOR - 1);
      const nido = ['#8F6F3F', '#6F5737', '#3F3327'][k], paja = ['#B7975F', '#8F774F', '#57473A'][k];
      for (let dy = 0; dy < 5; dy++) { const hw = 14 - Math.abs(dy - 1) * 2; c.fillStyle = dy ? nido : paja; c.fillRect(GUEST_X - hw, FLOOR - 24 + dy, hw * 2, 1); }
      c.fillStyle = paja; for (const x of [-11, -6, -1, 4, 9]) c.fillRect(GUEST_X + x, FLOOR - 22, 2, 1);
    }
    if (s.cueva) {
      // la ladera de roca y, detrás del huésped, la boca oscura de la cueva
      const roca = ['#8F8577', '#6F5F67', '#2F2B3F'][k], veta = ['#6F675F', '#4F4450', '#22202F'][k], luz = ['#AFA597', '#8F7F87', '#3B3750'][k];
      for (let x = 50; x < W; x++) {
        const top = Math.round(Math.max(4, 34 - (x - 50) * 0.55 + 2 * Math.sin(x / 4)));
        c.fillStyle = roca; c.fillRect(x, top, 1, FLOOR + 1 - top);
        c.fillStyle = luz; c.fillRect(x, top, 1, 1);
      }
      c.fillStyle = veta;
      for (const [x, y, w] of [[60, 34, 6], [70, 24, 5], [118, 16, 6], [120, 40, 5], [58, 46, 4], [112, 50, 7]]) c.fillRect(x, y, w, 1);
      for (let y = FLOOR - 34; y <= FLOOR; y++) {
        const hw = y >= FLOOR - 16 ? 18 : Math.round(18 * Math.sqrt(Math.max(0, 1 - ((FLOOR - 16 - y) / 18) ** 2)));
        if (!hw) continue;
        c.fillStyle = veta; c.fillRect(GUEST_X - hw - 1, y, hw * 2 + 2, 1);
        c.fillStyle = '#14101A'; c.fillRect(GUEST_X - hw, y, hw * 2, 1);
      }
    }
    return;
  }
  for (let dy = 0; dy < 12; dy++) {
    const half = Math.round(26 * Math.sqrt(1 - (dy / 12.5) ** 2));
    c.fillStyle = dy < 2 ? '#9FDFEF' : dy < 6 ? '#4F8FAF' : '#376F8F';
    c.fillRect(GUEST_X - half, FLOOR - 6 + dy, half * 2, 1);
  }
  // la mesita de madera, al borde de la charca
  c.fillStyle = C.L; c.fillRect(TABLE.x - 8, TABLE.top, 16, 2); c.fillRect(TABLE.x - 7, TABLE.top + 2, 2, FLOOR - TABLE.top - 1); c.fillRect(TABLE.x + 5, TABLE.top + 2, 2, FLOOR - TABLE.top - 1);
  c.fillStyle = C.k; c.fillRect(TABLE.x - 7, TABLE.top, 14, 1);
}

function room(c, s) {
  if (s.outdoor) return pond(c, s);
  c.fillStyle = '#EFD7AF'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#F7E7C7';
  for (let x = 3; x < W; x += 6) c.fillRect(x, 2, 1, FLOOR - 16);
  c.fillStyle = '#D8B98B'; c.fillRect(0, 0, W, 2);
  // ventana: de noche, o de día con las contraventanas que se abren (s.shutter de 0 a 1)
  c.fillStyle = C.K; c.fillRect(8, 8, 24, 20);
  c.fillStyle = s.day ? '#BFE3F7' : '#1F2742'; c.fillRect(10, 10, 20, 16);
  if (s.day) { c.fillStyle = '#FFE7A7'; disc(c, 24, 14, 3); }
  else { c.fillStyle = '#28315A'; c.fillRect(10, 20, 20, 6); c.fillStyle = C.W; c.fillRect(13, 12, 1, 1); c.fillRect(25, 14, 1, 1); }
  c.fillStyle = C.K; c.fillRect(19, 10, 1, 16); c.fillRect(10, 17, 20, 1);
  if (s.shutter < 1) {
    const w = Math.round(10 * (1 - s.shutter));
    c.fillStyle = C.k; c.fillRect(10, 10, w, 16); c.fillRect(30 - w, 10, w, 16);
    c.fillStyle = C.K;
    for (let y = 12; y < 26; y += 3) { c.fillRect(10, y, w, 1); c.fillRect(30 - w, y, w, 1); }
  }
  // zócalo y suelo
  c.fillStyle = '#B7834F'; c.fillRect(0, FLOOR - 12, W, 12);
  c.fillStyle = '#CF9B63'; c.fillRect(0, FLOOR - 13, W, 1);
  c.fillStyle = '#8F6037';
  for (let x = 5; x < W; x += 6) c.fillRect(x, FLOOR - 12, 1, 12);
  c.fillStyle = '#9F6A3F'; c.fillRect(0, FLOOR, W, H - FLOOR);
  c.fillStyle = '#BF8757'; c.fillRect(0, FLOOR, W, 1);
}

// ---------- partículas ----------

const PARTICLES = {
  heart: { life: 1400, draw(c, p, k) { stamp(c, ART.heart, p.x + Math.sin(k * 7) * 2 - 3, p.y - k * 14); } },
  note: { life: 1500, draw(c, p, k) { stamp(c, ART.note, p.x + Math.sin(k * 5) * 3, p.y - k * 16); } },
  spark: { life: 500, draw(c, p, k) { stamp(c, k < 0.5 ? ART.spark : ART.spark2, p.x - 2, p.y - 2); } },
  drop: { life: 700, draw(c, p, k, t) {
    const y = p.y + p.vy * k * 0.7 + 90 * (k * 0.7) ** 2;
    if (y < FLOOR) { c.fillStyle = C.c; c.fillRect(Math.round(p.x + p.vx * k * 0.7), Math.round(y), 1, 2); }
  } },
  steam: { life: 1200, draw(c, p, k) {
    c.globalAlpha = 0.6 * (1 - k); c.fillStyle = C.W;
    c.fillRect(Math.round(p.x + Math.sin(k * 9 + p.seed) * 2), Math.round(p.y - k * 10), 1, 2);
    c.globalAlpha = 1;
  } },
  smoke: { life: 900, draw(c, p, k) {
    c.globalAlpha = 0.7 * (1 - k); c.fillStyle = C[p.color] || p.color || C.S;
    disc(c, p.x + p.dir * k * 6, p.y - k * 6, Math.round(1 + k * 3));
    c.globalAlpha = 1;
  } },
  // una palabra que sube y se desvanece («CLIN», «DING», «Z»)
  word: { life: 1300, draw(c, p, k) {
    c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    const sway = p.sway ? Math.sin(k * 6 + p.seed) * p.sway : 0;
    texto(c, p.text, p.x - textWidth(p.text) / 2 + sway, p.y - k * (p.rise ?? 7), p.color || 'W', p.outline ?? 'L');
    c.globalAlpha = 1;
  } },
  flame: { life: 600, draw(c, p, k) {
    c.fillStyle = k < 0.35 ? C.Y : k < 0.7 ? C.R : C.S;
    const s = k < 0.5 ? 2 : 1;
    c.fillRect(Math.round(p.x + p.vx * k), Math.round(p.y + p.vy * k - 6 * k), s, s);
  } },
  fw: { life: 1000, draw(c, p, k) {
    if (k > 0.6 && Math.floor(k * 20) % 2) return;
    c.fillStyle = C[p.col] || C.Y;
    c.fillRect(Math.round(p.x + Math.cos(p.ang) * p.sp * k), Math.round(p.y + Math.sin(p.ang) * p.sp * k + 10 * k * k), 1, 1);
  } },
  bird: { life: 2400, draw(c, p, k) {
    const x = Math.round(p.x + p.vx * k), y = Math.round(p.y + Math.sin(k * 10 + p.seed) * 2), up = Math.floor(k * 16) % 2;
    c.fillStyle = C[p.col] || C.L; c.fillRect(x, y, 1, 1); c.fillRect(x - 1, y - up, 1, 1); c.fillRect(x + 1, y - up, 1, 1);
  } },
  stars: { life: 1900, draw(c, p, k) {
    const star = ['..L..', '.LyL.', 'LyyyL', '.LyL.', 'L.L.L'];
    const total = p.n + (p.half ? 0.5 : 0), w = Math.ceil(total) * 6 - 1;
    const shown = Math.min(Math.ceil(total), Math.floor(k * 12) + 1);
    for (let i = 0; i < shown; i++) {
      const art = p.half && i === Math.ceil(total) - 1 ? star.map(r => r.slice(0, 3)) : star;
      stamp(c, art, p.x - w / 2 + i * 6, p.y - k * 4);
    }
  } },
  rain: { life: 450, draw(c, p, k) { c.fillStyle = C.c; c.fillRect(Math.round(p.x), Math.round(p.y + k * 9), 1, 2); } },
  confetti: { life: 1300, draw(c, p, k) {
    c.fillStyle = C[p.col] || C.P; c.fillRect(Math.round(p.x + Math.sin(k * 8 + p.seed) * 3 + (p.vx || 0) * k), Math.round(p.y + k * 22), p.size || 1, p.size || 1);
  } },
  fly: { life: 2600, draw(c, p, k) {
    const x = Math.round(p.x + Math.sin(k * 13 + p.seed) * 6), y = Math.round(p.y + Math.cos(k * 17) * 4);
    c.fillStyle = C.L; c.fillRect(x, y, 1, 1); if (Math.floor(k * 40) % 2) { c.fillStyle = C.W; c.fillRect(x - 1, y - 1, 1, 1); c.fillRect(x + 1, y - 1, 1, 1); }
  } },
  arcoiris: { life: 900, draw(c, p, k) {
    const cols = ['#E2577F', '#FFB347', '#F7D74F', '#6F9F4F', '#9FDFEF', '#4F8FAF', '#9F6FCF'];
    c.globalAlpha = 0.8 * (1 - k);
    cols.forEach((col, i) => { c.fillStyle = col; for (let dx = -6; dx <= 6; dx++) c.fillRect(Math.round(p.x + dx), Math.round(p.y + i + (dx * dx) / 12), 1, 1); });
    c.globalAlpha = 1;
  } },
  snow: { life: 900, draw(c, p, k) {
    c.fillStyle = k < 0.5 ? C.W : C.c;
    const x = Math.round(p.x + Math.sin(k * 6 + p.seed) * 2), y = Math.round(p.y + k * 8);
    c.fillRect(x, y, 1, 1); if (k < 0.4) { c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); }
  } },
  crumb: { life: 500, draw(c, p, k) {
    c.fillStyle = C.Y; c.fillRect(Math.round(p.x + p.vx * k), Math.round(p.y + 30 * k * k - 4 * k), 1, 1);
  } },
};

// un reloj de pared: esfera, doce y las dos agujas (que corren a p.speed vueltas por segundo)
function drawReloj(c, x, y, p, t) {
  if (p.fuera) {
    // fuera no hay reloj de pared: el paso del tiempo lo cuenta el sol (o la luna) cruzando el cielo
    const ang = (t / 1000) * p.speed * Math.PI * 2 / 12;
    const cx = Math.round(x) + 4 + Math.round(Math.sin(ang) * 8), cy = Math.round(y) + 6 - Math.round(Math.abs(Math.cos(ang)) * 3);
    c.fillStyle = p.fuera === 'dia' ? '#FFE7A7' : C.W; disc(c, cx, cy, 2);
    return;
  }
  const cx = Math.round(x) + 4, cy = Math.round(y) + 4;
  c.fillStyle = C.K; disc(c, cx, cy, 4); c.fillStyle = C.W; disc(c, cx, cy, 3);
  c.fillStyle = C.L; c.fillRect(cx, cy - 3, 1, 1);
  const a = (t / 1000) * p.speed * Math.PI * 2;
  for (const [ang, len] of [[a, 3], [a / 12, 2]]) for (let i = 1; i <= len; i++) c.fillRect(Math.round(cx + Math.sin(ang) * i), Math.round(cy - Math.cos(ang) * i), 1, 1);
}

// En SpriteCollab los pies quedan 6 px por debajo del centro del fotograma (como en sprites.js)
const FEET = 6;
const BOXES = new Map();
let shade = null, tintC = null;
const layer = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return cv; };

let running = null;
let cerrarAnterior = null;   // si una escena pisa a otra, la de antes se da por cerrada (quien la esperaba sigue)

export async function showScene({ guest, pide, helper, fase = 'noche', atendido = true, hab = null, proveedor = null, fallo = false }, onClose) {
  const box = document.querySelector('#popup');
  const canvas = document.querySelector('#popup-canvas');
  const c = canvas.getContext('2d');
  box.classList.remove('hidden');
  const token = {};
  const previa = cerrarAnterior; cerrarAnterior = null;
  running = token;
  previa?.();
  cerrarAnterior = () => onClose?.();

  let gs, ms, cs;
  try {
    [gs, ms, cs] = await Promise.all([
      loadSprite(guest.sprite, ['Idle', 'Walk', 'Eat', 'Hop', 'Sleep']),
      loadSprite('manolo', ['Idle', 'Walk', 'Sleep']),
      loadSprite('0006', ['Idle', 'Walk', 'Hop', 'Sleep', 'Shoot']),
    ]);
  } catch (err) {
    // sin conexión (o falta un sprite): no hay escena, pero el juego sigue
    console.warn('[escena]', err);
    if (running === token) { running = null; cerrarAnterior = null; box.classList.add('hidden'); onClose?.(); }
    return;
  }
  if (running !== token) return;

  // ---------- estado de la escena ----------
  // por la ventana se ve el cielo de la hora; el sol entra en su escena aunque sea tarde
  // dónde duerme: el cuarto que le dieron o, si no se sabe (las pruebas), el sitio que le toca por
  // tamaño (los de agua, al estanque; los enormes, a la cueva; los pájaros grandes, al nido del pino)
  const sitio = hab || (guest.tam === 'agua' ? 'estanque' : guest.duerme) || null;
  const s = { day: pide.objeto === 'sol' || fase === 'manana' || fase === 'dia', shutter: pide.objeto === 'sol' ? 0 : 1, beam: 0, outdoor: sitio === 'estanque', tarde: fase === 'tarde', lights: [] };
  // Snorlax no cabe por la puerta: todo lo suyo pasa fuera, junto al pino calcinado (y lo del nido, al pie del pino)
  if (guest.id === 'snorlax') s.outdoor = s.prado = true;
  // los del nido, arriba, en lo alto del pino calcinado (Manolo se lo sube desde abajo)
  if (sitio === 'nido') { s.outdoor = s.prado = s.nido = true; s.pino = false; }
  // los de la cueva de la ladera (Onix, Gyarados, Rhydon, Mewtwo): en la boca de la cueva
  if (sitio === 'cueva') s.outdoor = s.prado = s.cueva = true;
  const NIDO = FLOOR - 24;
  const guestA = new Actor(gs, { x: GUEST_X, y: s.nido ? NIDO : FLOOR, dir: DIR.left });
  await addBuddy(guestA, guest.acompanante, ['Idle', 'Walk', 'Hop']);
  const actors = [guestA];
  const props = [];          // { art, x, y, on: actor, front }
  const particles = [];      // { type, x, y, born, ... }
  const jitter = new Map();  // actor -> { until, amp }
  let now = performance.now();

  const make = (sprite, x) => { const a = new Actor(sprite, { x, y: FLOOR, dir: DIR.right }); actors.push(a); return a; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const walk = (a, x, speed = 40) => !actors.includes(a) ? Promise.resolve() : new Promise(r => a.walkTo(x, FLOOR, { dir: x < a.x ? DIR.left : DIR.right, speed, then: r }));
  const leave = a => walk(a, -24, 46).then(() => { const i = actors.indexOf(a); if (i >= 0) actors.splice(i, 1); });
  const emit = (type, x, y, extra = {}) => particles.push({ type, x, y, born: now, seed: Math.random() * 9, ...extra });
  const burst = (type, x, y, n, spread = 6) => {
    for (let i = 0; i < n; i++) emit(type, x, y, { vx: (Math.random() - 0.5) * spread * 2, vy: -10 - Math.random() * 14, dir: 1 });
  };
  const carry = (art, a) => { const p = { art, on: a }; props.push(p); return p; };
  // lanza un objeto en arco hasta (x, y del suelo)
  const toss = (p, x, ms = 450, height = 10) => new Promise(r => {
    if (s.outdoor && !s.prado && Math.abs(x - GUEST_X) < 30) x = TABLE.x;
    const base = s.outdoor && !s.prado && x === TABLE.x ? TABLE.top : FLOOR;
    const from = propPos(p), to = { x: x - p.art[0].length / 2, y: base - p.art.length };
    p.on = null;
    const t0 = now;
    p.anim = t => {
      const k = Math.min(1, (t - t0) / ms);
      p.x = from.x + (to.x - from.x) * k;
      p.y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * height;
      if (k >= 1) { p.anim = null; emit('spark', x, base - p.art.length); r(); }
    };
  });
  const shake = (a, ms, amp = 1) => jitter.set(a, { until: now + ms, amp });
  const react = (ms = 2200) => {
    const anim = pide.tipo === 'comida' && gs.anims.Eat ? 'Eat' : gs.anims.Hop ? 'Hop' : 'Idle';
    guestA.anim = anim;
    const t0 = now;
    const hearts = setInterval(() => {
      if (running !== token || now - t0 > ms) return clearInterval(hearts);
      emit('heart', guestA.x, guestA.bounds().y - 2);
      if (anim === 'Eat') burst('crumb', guestA.x - 6, FLOOR - 8, 3, 4);
    }, 420);
    return wait(ms).then(() => { guestA.anim = 'Idle'; });
  };

  function propPos(p) {
    if (!p.on) return { x: p.x, y: p.y };
    const bob = p.on.goal ? Math.floor(now / 150) % 2 : 0;
    if (p.at) {
      // puesto encima del cuerpo: en la cabeza, en la cara, al cuello, en la cola…
      const q = punto(p.on, p.at), w = p.art[0].length, h = p.art.length;
      const y = p.at === 'head' ? q.y - h + 2 : p.at === 'above' ? q.y - h - 1 : p.at === 'feet' ? q.y - h + 1 : q.y - h / 2;
      return { x: Math.round(q.x - w / 2 + (p.dx || 0)), y: Math.round(y + (p.dy || 0)) + bob };
    }
    const b = p.on.bounds();
    return { x: p.on.x - p.art[0].length / 2 + (p.dx || 0), y: b.y - p.art.length - 1 + bob + (p.dy || 0) };
  }

  // ---------- caja de cada sprite y puntos del cuerpo ----------
  // La caja de verdad (píxeles no transparentes) del fotograma, para ponerle cosas encima
  function caja(a) {
    const { a: an, col, row } = a.frame(now);
    const key = `${an.img.src}|${an.fw}|${row}|${col}`;
    let bx = BOXES.get(key);
    if (!bx) {
      const cv = document.createElement('canvas'); cv.width = an.fw; cv.height = an.fh;
      const k = cv.getContext('2d', { willReadFrequently: true });
      k.drawImage(an.img, col * an.fw, row * an.fh, an.fw, an.fh, 0, 0, an.fw, an.fh);
      const d = k.getImageData(0, 0, an.fw, an.fh).data;
      let x0 = an.fw, y0 = an.fh, x1 = -1, y1 = -1;
      for (let y = 0; y < an.fh; y++) for (let x = 0; x < an.fw; x++) if (d[(y * an.fw + x) * 4 + 3] > 60) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      bx = x1 < 0 ? { x0: 0, y0: 0, x1: an.fw - 1, y1: an.fh - 1 } : { x0, y0, x1, y1 };
      BOXES.set(key, bx);
    }
    const sc = a.scale || 1;
    const ox = a.x - an.fw / 2, oy = a.y - FEET - an.fh / 2;
    const tx = v => a.x + (ox + v - a.x) * sc, ty = v => a.y + (oy + v - a.y) * sc;
    const r = { x0: Math.round(tx(bx.x0)), y0: Math.round(ty(bx.y0)), x1: Math.round(tx(bx.x1)), y1: Math.round(ty(bx.y1)) };
    return { ...r, w: r.x1 - r.x0 + 1, h: r.y1 - r.y0 + 1 };
  }
  const mira = a => a.dir === DIR.right || a.dir === DIR.downRight || a.dir === DIR.upRight;
  function punto(a, at) {
    const b = caja(a), r = mira(a);
    const fx = k => (r ? b.x1 - k * b.w : b.x0 + k * b.w);   // k: de delante (0) a detrás (1)
    switch (at) {
      case 'head': return { x: fx(0.45), y: b.y0 };
      case 'above': return { x: fx(0.5), y: b.y0 };
      case 'face': return { x: fx(0.22), y: b.y0 + b.h * 0.32 };
      case 'neck': return { x: fx(0.42), y: b.y0 + b.h * 0.5 };
      case 'body': return { x: fx(0.5), y: b.y0 + b.h * 0.55 };
      case 'front': return { x: fx(0) + (r ? 3 : -3), y: b.y0 + b.h * 0.55 };
      case 'tail': return { x: fx(0.95), y: b.y0 + b.h * 0.7 };
      case 'feet': return { x: fx(0.45), y: b.y1 };
      default: return { x: a.x, y: b.y0 };
    }
  }

  // ---------- más verbos para los guiones ----------
  const HS = helper === 'charizard' ? cs : ms;        // quien hace el encargo
  const every = (ms, dur, fn) => new Promise(r => {
    const t0 = now; let i = 0;
    const id = setInterval(() => {
      if (running !== token || now - t0 >= dur) { clearInterval(id); return r(); }
      fn(i++);
    }, ms);
  });
  const later = (ms, fn) => setTimeout(() => { if (running === token) fn(); }, ms);
  const drop = p => { const i = props.indexOf(p); if (i >= 0) props.splice(i, 1); };
  const anim = (a, name) => { a.anim = a.sprite.anims[name] ? name : 'Idle'; };
  const idle = (...as) => as.forEach(a => { a.anim = 'Idle'; });
  const face = (a, d) => { a.dir = d === 'r' ? DIR.right : d === 'l' ? DIR.left : d === 'u' ? DIR.up : DIR.down; };
  const prop = (art, x, y, extra = {}) => { const p = { art, x, y, ...extra }; props.push(p); return p; };
  // un objeto apoyado en el suelo (o en la mesa del estanque) con el centro en x
  const enSuelo = (art, x, extra) => prop(art, Math.round(x - art[0].length / 2), (s.outdoor && !s.prado && Math.abs(x - TABLE.x) < 9 ? TABLE.top : FLOOR) - art.length, extra);
  // mueve un objeto suelto hasta (x, y) (arriba a la izquierda) en arco
  const moveTo = (p, x, y, ms = 420, height = 8) => new Promise(r => {
    const from = propPos(p); p.on = null; p.at = null; p.x = from.x; p.y = from.y;
    const t0 = now;
    p.anim = t => {
      const k = Math.min(1, (t - t0) / ms);
      p.x = from.x + (x - from.x) * k;
      p.y = from.y + (y - from.y) * k - Math.sin(k * Math.PI) * height;
      if (k >= 1) { p.anim = null; r(); }
    };
  });
  // vuela hasta un punto del cuerpo de alguien y se queda puesto ahí
  const ponA = async (p, a, at, { dx = 0, dy = 0, ms = 380, height = 6 } = {}) => {
    const dest = propPos({ art: p.art, on: a, at, dx, dy });
    await moveTo(p, dest.x, dest.y, ms, height);
    Object.assign(p, { on: a, at, dx, dy });
    emit('spark', dest.x + p.art[0].length / 2, dest.y);
  };
  // entra quien hace el encargo con el objeto y se planta delante del huésped
  const trae = async (art, { to = 62, speed = 36, sprite = HS, from = -20 } = {}) => {
    const a = make(sprite, from);
    const p = art ? carry(art, a) : null;
    await walk(a, to, speed);
    return { a, p };
  };
  const dejar = async (art, { to = 62, x = GUEST_X - 12, height = 8, sprite = HS } = {}) => {
    const { a, p } = await trae(art, { to, sprite });
    await toss(p, x, 420, height);
    return { a, p };
  };
  const ponerle = async (art, at = 'head', { sprite = HS, to = sprite === cs ? GUEST_X - 34 : GUEST_X - 24, dx = 0, dy = 0, on = guestA } = {}) => {
    const { a, p } = await trae(art, { to, sprite });
    await ponA(p, on, at, { dx, dy });
    return { a, p };
  };
  const arriba = a => caja(a).y0;
  const di = (text, a, { color = 'W', dy = 0, dx = 0, life, sway, rise } = {}) => {
    const q = a.x != null && a.sprite ? { x: punto(a, 'above').x, y: arriba(a) - 6 } : a;
    emit('word', q.x + dx, q.y + dy, { text, color, life, sway, rise });
  };
  // la nota en estrellas (cinco, o cuatro y media), encima de alguien
  const estrellas = (a, n = 5, half = false) => emit('stars', punto(a, 'above').x, arriba(a) - 8, { n, half, life: 1900 });
  const zzz = (a, dur = 2400, step = 600) => every(step, dur, i => di('Z', a, { color: 'B', dx: 4 + (i % 2) * 2, sway: 2, life: 1500, rise: 10 }));
  const corazones = (a, n = 4, step = 330) => { for (let i = 0; i < n; i++) later(i * step, () => emit('heart', punto(a, 'above').x, arriba(a) - 2)); };
  const chispas = (x, y, n = 5, w = 12, h = 10, step = 220) => { for (let i = 0; i < n; i++) later(i * step, () => emit('spark', x - w / 2 + Math.random() * w, y - Math.random() * h)); };
  const notas = (a, n = 4, step = 380) => { for (let i = 0; i < n; i++) later(i * step, () => emit('note', punto(a, 'above').x - 3 + (i % 3) * 3, arriba(a))); };
  const humo = (a, n = 3, { color, at = 'face', step = 220, dir } = {}) => { for (let i = 0; i < n; i++) later(i * step, () => { const q = punto(a, at); emit('smoke', q.x, q.y, { dir: dir ?? (mira(a) ? 1 : -1), color }); }); };
  const lagrimas = (a, n = 4, step = 300) => { for (let i = 0; i < n; i++) later(i * step, () => { const q = punto(a, 'face'); emit('drop', q.x + (mira(a) ? -1 : 1), q.y, { vx: mira(a) ? 3 : -3, vy: -4 }); }); };
  const sudor = (a, life = 1300) => emit('sweat', a.x, arriba(a), { stick: a, life });
  const vena = (a, life = 1600) => emit('vein', a.x, arriba(a), { stick: a, life });
  const fuego = (a, n = 8, { at = 'face', spread = 10 } = {}) => {
    anim(a, 'Shoot');
    const d = mira(a) ? 1 : -1;
    for (let i = 0; i < n; i++) later(i * 40, () => { const q = punto(a, at); emit('flame', q.x + d * 2, q.y, { vx: d * (10 + Math.random() * spread), vy: (Math.random() - 0.5) * 8 }); });
    return wait(600).then(() => { if (a.anim === 'Shoot') a.anim = 'Idle'; });
  };
  // salta en el sitio (sin animación propia: lo sube y lo baja)
  const brinca = (a, times = 1, hgt = 4, ms = 280) => new Promise(r => {
    const y0 = a.y, t0 = now;
    const id = setInterval(() => {
      const k = (now - t0) / ms;
      if (running !== token || k >= times) { clearInterval(id); a.y = y0; return r(); }
      a.y = y0 - Math.round(Math.sin((k % 1) * Math.PI) * hgt);
    }, 16);
  });
  // se dobla en una reverencia (o una flexión): baja y sube unas cuantas veces
  const agacha = (a, times = 3, ms = 420, d = 2) => new Promise(r => {
    const y0 = a.y, t0 = now;
    const id = setInterval(() => {
      const k = (now - t0) / ms;
      if (running !== token || k >= times) { clearInterval(id); a.y = y0; return r(); }
      a.y = y0 + ((k % 1) < 0.5 ? d : 0);
    }, 30);
  });
  const anochece = (to = 0.55, ms = 700) => {
    const from = s.dark || 0, t0 = now;
    return every(30, ms + 30, () => { s.dark = from + (to - from) * Math.min(1, (now - t0) / ms); }).then(() => { s.dark = to; });
  };
  const luz = l => { s.lights.push(l); return l; };
  const apagaLuz = l => { const i = s.lights.indexOf(l); if (i >= 0) s.lights.splice(i, 1); };
  const fogonazo = (ms = 500) => { s.flash = { t0: now, ms }; };
  const reloj = (x, y, speed = 1) => prop(Array(9).fill('.........'), x, y, { draw: drawReloj, speed, fuera: s.outdoor && (s.day ? 'dia' : 'noche') });
  const fin = async (...as) => {
    const ps = [];
    for (const [i, a] of as.filter(Boolean).entries()) { if (i) await wait(250); ps.push(leave(a)); }
    await Promise.all(ps);
  };

  // ---------- guiones ----------
  const SCRIPTS = {
    async hielo() {
      const ch = make(cs, -20);
      const ice = carry(ART.hielo, ch);
      // el cubito gotea y encoge mientras Charizard camina
      const drip = setInterval(() => { const q = propPos(ice); emit('drop', q.x + 3, q.y + ice.art.length, { vx: 0, vy: 0 }); }, 110);
      const shrink = [ART.hielo, ART.hielo2, ART.hielo3];
      const start = now;
      const melt = setInterval(() => { ice.art = shrink[Math.min(2, Math.floor((now - start) / 700))]; }, 100);
      await walk(ch, 62, 30);
      clearInterval(melt); clearInterval(drip);
      props.splice(props.indexOf(ice), 1);
      burst('drop', ch.x + 4, FLOOR - 16, 6, 5);
      s.puddle = { x: ch.x + 2, w: 2, born: now };
      await wait(350);
      emit('sweat', ch.x + 8, ch.bounds().y - 2, { stick: ch, life: 1300 });
      for (let i = 0; i < 3; i++) setTimeout(() => emit('smoke', ch.x + 10, ch.bounds().y + 8, { dir: 1 }), i * 250);
      await wait(1000);
      const ma = make(ms, -20);
      const ice2 = carry(ART.hielo, ma);
      await walk(ma, 44, 62);
      await toss(ice2, GUEST_X - 12, 500, 14);
      await react();
      await Promise.all([leave(ma), wait(300).then(() => leave(ch))]);
    },
    async barreno() {
      const ma = make(ms, -20);
      const tub = carry(ART.barreno, ma);
      const splash = setInterval(() => { if (Math.random() < 0.5) { const q = propPos(tub); burst('drop', q.x + 4, q.y, 1, 4); } }, 160);
      await walk(ma, 40, 24);
      // el tic del tipo agua: gota de sudor y tembleque
      emit('sweat', ma.x + 6, ma.bounds().y - 3, { stick: ma, life: 1200 });
      shake(ma, 700);
      await wait(1000);
      await walk(ma, 62, 24);
      clearInterval(splash);
      await toss(tub, GUEST_X - 13, 380, 4);
      burst('drop', GUEST_X - 13, FLOOR - 6, 8, 7);
      const t0 = now;
      const play = setInterval(() => {
        if (running !== token || now - t0 > 2200) return clearInterval(play);
        burst('drop', GUEST_X - 13, FLOOR - 6, 3, 6);
      }, 300);
      await react();
      await leave(ma);
    },
    async leche() {
      const ma = make(ms, -20);
      const glass = carry(ART.leche, ma);
      const steam = setInterval(() => { const q = propPos(glass); emit('steam', q.x + 2 + Math.random() * 3, q.y - 1); }, 140);
      await walk(ma, 62, 34);
      await toss(glass, GUEST_X - 12, 420, 8);
      await react(1500);
      clearInterval(steam);
      props.splice(props.indexOf(glass), 1);
      // ensaya un «la» muy bajito
      for (let i = 0; i < 3; i++) setTimeout(() => emit('note', guestA.x - 2 + i * 3, guestA.bounds().y), i * 380);
      guestA.anim = gs.anims.Hop ? 'Hop' : 'Idle';
      await wait(1400);
      guestA.anim = 'Idle';
      await leave(ma);
    },
    async mano() {
      // Manolo le rasca la oreja a Growlithe...
      const ma = make(ms, -20);
      await walk(ma, GUEST_X - 14, 40);
      const t0 = now;
      const scratch = setInterval(() => {
        if (running !== token || now - t0 > 3600) return clearInterval(scratch);
        ma.y = FLOOR - (Math.floor((now - t0) / 140) % 2);
        emit('heart', GUEST_X + 4, guestA.bounds().y);
      }, 280);
      const happy = react(3600);
      // ...y Charizard llega, lo ve y se enfada: vena, tembleque y humo por la nariz
      await wait(700);
      const ch = make(cs, -22);
      await walk(ch, 34, 36);
      emit('vein', ch.x + 6, ch.bounds().y - 6, { stick: ch, life: 2200 });
      shake(ch, 600, 1);
      const fume = setInterval(() => {
        if (running !== token || now - t0 > 3400) return clearInterval(fume);
        emit('smoke', ch.x + 11, ch.bounds().y + 7, { dir: 1 });
      }, 220);
      await happy;
      ma.y = FLOOR;
      // Charizard se da media vuelta, ofendido, y se va primero
      await leave(ch);
      await leave(ma);
    },
    async maceta() {
      const ma = make(ms, -20);
      const pot = carry(ART.maceta, ma);
      await walk(ma, 60, 36);
      await toss(pot, GUEST_X - 20, 420, 6);
      pot.front = true;
      // Oddish salta dentro de la maceta y se queda plantado
      guestA.anim = gs.anims.Hop ? 'Hop' : 'Idle';
      await new Promise(r => guestA.walkTo(GUEST_X - 20, FLOOR - 2, { dir: DIR.down, speed: 26, then: r }));
      for (let i = 0; i < 5; i++) setTimeout(() => emit('spark', GUEST_X - 26 + Math.random() * 12, FLOOR - 14 - Math.random() * 10), i * 260);
      await react(1800);
      await leave(ma);
    },
    async sol() {
      const ma = make(ms, -20);
      await walk(ma, 22, 40);
      ma.dir = DIR.up;
      await wait(250);
      // abre las contraventanas y entra el sol
      const t0 = now;
      await new Promise(r => {
        const open = setInterval(() => {
          s.shutter = Math.min(1, (now - t0) / 600);
          s.beam = s.shutter;
          if (s.shutter >= 1) { clearInterval(open); r(); }
        }, 30);
      });
      emit('spark', 24, 14);
      walk(ma, -24, 46);
      await new Promise(r => guestA.walkTo(74, FLOOR, { dir: DIR.left, speed: 22, then: r }));
      for (let i = 0; i < 6; i++) setTimeout(() => emit('spark', 64 + Math.random() * 20, FLOOR - 20 - Math.random() * 14), i * 300);
      await react(2000);
    },
    async comida() {
      const ma = make(ms, -20);
      const dish = carry(ART[pide.receta] || (pide.objeto === 'chistorra' ? ART.chistorra : ART.plato), ma);
      let ch = null;
      if (pide.objeto === 'chistorra') {
        // Charizard asoma por la izquierda y se le cae la baba
        ch = make(cs, -22);
        walk(ch, 8, 28).then(() => {
          ch.dir = DIR.right;
          const drool = setInterval(() => {
            if (running !== token || !ch || ch.goal) return clearInterval(drool);
            emit('drop', ch.x + 8, ch.bounds().y + 10, { vx: 0, vy: 0 });
          }, 450);
        });
      }
      await walk(ma, 62, 36);
      await toss(dish, GUEST_X - 12, 420, 8);
      await react(2400);
      props.splice(props.indexOf(dish), 1);
      await Promise.all([leave(ma), ch ? leave(ch) : null]);
    },
  };

  // comida que no era la que pedían (la cocina aún no funciona): bocadillo frío y cara larga
  SCRIPTS.frio = async () => {
    const ma = make(ms, -20);
    const dish = carry(ART.bocadillo, ma);
    const frost = setInterval(() => { const q = propPos(dish); emit('snow', q.x + Math.random() * 8, q.y - 2); }, 200);
    let ch = null;
    if (pide.objeto === 'chistorra') {
      // ¡la chistorra se queda en la despensa! Charizard lo celebra detrás
      ch = make(cs, -22);
      walk(ch, 14, 30).then(() => { ch.dir = DIR.right; });
    }
    await walk(ma, 62, 36);
    await toss(dish, GUEST_X - 12, 420, 6);
    clearInterval(frost);
    for (let i = 0; i < 4; i++) emit('snow', GUEST_X - 14 + Math.random() * 8, FLOOR - 8);
    // el huésped lo mira con pena
    s.sad = guestA;
    shake(ma, 400, 1);
    if (ch) { ch.anim = 'Hop' in cs.anims ? 'Hop' : 'Idle'; for (let i = 0; i < 4; i++) setTimeout(() => emit('heart', ch.x, ch.bounds().y), i * 350); }
    await wait(1300);
    s.sad = null;
    // se lo come a regañadientes y resopla
    if (gs.anims.Eat) { guestA.anim = 'Eat'; await wait(1100); }
    guestA.anim = 'Idle';
    for (let i = 0; i < 3; i++) setTimeout(() => emit('smoke', guestA.x - 8, guestA.bounds().y + 10, { dir: -1 }), i * 200);
    props.splice(props.indexOf(dish), 1);
    await wait(700);
    if (ch) ch.anim = 'Idle';
    await Promise.all([leave(ma), ch ? leave(ch) : null]);
  };

  // el plato quemado: Manolo se lo deja a Charizard, que se lo come encantado
  SCRIPTS.quemado = async () => {
    const ma = make(ms, -20);
    const dish = carry(ART.quemado, ma);
    const smoke = setInterval(() => { const q = propPos(dish); emit('smoke', q.x + 3, q.y - 1, { dir: 1 }); }, 220);
    await walk(ma, 62, 36);
    await toss(dish, GUEST_X - 12, 420, 6);
    clearInterval(smoke);
    guestA.anim = gs.anims.Hop ? 'Hop' : 'Idle';
    for (let i = 0; i < 6; i++) setTimeout(() => emit('heart', guestA.x, guestA.bounds().y), i * 330);
    await wait(2200);
    props.splice(props.indexOf(dish), 1);
    guestA.anim = 'Idle';
    await leave(ma);
  };

  // encargo genérico: lleva el objeto, se lo deja y el huésped lo celebra
  SCRIPTS.servicio = async () => {
    const ma = make(HS, -20);
    const thing = carry(ART[pide.objeto] || ART.plato, ma);
    await walk(ma, 62, 36);
    await toss(thing, GUEST_X - 12, 420, 8);
    await react();
    await leave(ma);
  };
  // el periódico: Mr. Mime lo lee en voz alta, enfadándose a cada página
  SCRIPTS.periodico = async () => {
    const ma = make(ms, -20);
    const paper = carry(ART.periodico, ma);
    await walk(ma, 62, 36);
    await toss(paper, GUEST_X - 12, 420, 8);
    for (let i = 0; i < 5; i++) setTimeout(() => emit('vein', guestA.x + 2, guestA.bounds().y - 4, { stick: guestA, life: 500 }), i * 520);
    shake(guestA, 2400, 1);
    await wait(2700);
    await leave(ma);
  };
  // la vela de Gengar: Manolo la apaga, el cuarto se queda a oscuras y Gengar lo celebra
  SCRIPTS.vela = async () => {
    const candle = { art: ART.vela, x: GUEST_X - 20, y: FLOOR - ART.vela.length };
    props.push(candle);
    const ma = make(ms, -20);
    await walk(ma, GUEST_X - 32, 36);
    await wait(500);
    candle.art = ART.vela.map((row, i) => (i < 2 ? '.....' : row));
    emit('smoke', candle.x + 2, candle.y, { dir: 1 });
    s.dark = 0.45;
    await react(2400);
    await leave(ma);
  };

  // ---------- escenas propias de cada encargo ----------
  const G = guestA;
  const isCh = HS === cs;
  const vapor = (p, dur, color) => every(150, dur, () => { const q = propPos(p); emit(color ? 'smoke' : 'steam', q.x + 1 + Math.random() * 3, q.y - 1, { dir: 1, color }); });
  const ponEspejo = async (opts = {}) => {
    const { a, p } = await trae(ART.espejo, { to: opts.to ?? 48 });
    await toss(p, 70, 380, 6); drop(p);
    const m = espejo(opts.x ?? 64, opts);
    emit('spark', m.x + m.w / 2, m.y + 2);
    return a;
  };
  // una manta a medida del huésped, que le cae encima mientras se duerme
  const arropar = async ({ cols = ['B', 'c'], frac = 0.5, wide = 0, sleep = true, art, at = 'body', dy } = {}) => {
    const { a, p } = await trae(art || ART.manta, { to: GUEST_X - 26 });
    if (sleep) anim(G, 'Sleep');
    const b = caja(G);
    p.art = art || manta(Math.max(8, b.w - 2 + wide), Math.max(5, Math.round(b.h * frac)), ...cols);
    await ponA(p, G, at, { dy: dy ?? Math.round(b.h * 0.2) });
    return { a, p };
  };
  const linternaCono = (p, target, spread = 8) => t => {
    const q = propPos(p), ox = q.x + (p.art === ART.linterna ? 2 : 0), oy = q.y + 1;
    const tg = typeof target === 'function' ? target(t) : target;
    return [[ox, oy], [tg.x, tg.y - spread], [tg.x, tg.y + spread]];
  };

  Object.assign(SCRIPTS, {
    // ===== el paño (y la toalla, la servilleta, el mantel) =====
    async pano() {
      const { a, p } = await ponerle(ART.pano, 'body');
      await every(130, 1800, i => { p.dx = i % 2 ? 2 : -2; if (i % 3 === 0) emit('spark', G.x - 6 + Math.random() * 12, arriba(G) + Math.random() * 10); });
      drop(p);
      chispas(G.x, arriba(G) + 8, 6, 18, 14);
      await react(1600);
      await fin(a);
    },
    async 'pano@machop'() {
      const { a, p } = await ponerle(ART.pano, 'body');
      await every(130, 1400, i => { p.dx = i % 2 ? 2 : -2; burst('drop', G.x, arriba(G) + 4, 1, 5); });
      p.art = ART.toalla; p.at = 'neck'; p.dy = -2; p.dx = 0;
      emit('spark', G.x, arriba(G) + 6);
      await wait(400);
      // tres flexiones más, por el paño
      for (let i = 0; i < 3; i++) { await agacha(G, 1, 420, 3); di(String(i + 1), G, { color: 'y' }); }
      await react(1200);
      await fin(a);
    },
    async 'pano@marinilla'() {
      const { a, p } = await ponerle(ART.pano, 'body');
      await every(130, 1200, i => { p.dx = i % 2 ? 2 : -2; });
      // el Poliwag la moja a ella… y acaban muertos de risa
      for (let i = 0; i < 3; i++) later(i * 250, () => burst('drop', G.x + 10, arriba(G) + 6, 5, 8));
      shake(G, 600, 1);
      await wait(900);
      drop(p);
      for (let i = 0; i < 3; i++) later(i * 300, () => { di('JA', G, { color: 'y', dx: -6 + i * 6 }); });
      await react(1800);
      await fin(a);
    },
    async 'pano@larvitar'() {
      const { a, p } = await dejar(ART.folio, { to: 60 });
      const clock = reloj(44, 5, 3);
      await fin(a);
      await anochece(0.45, 600);
      // escribe hasta las tres
      await every(260, 2200, i => { if (i % 2) emit('spark', p.x + 2, p.y); shake(G, 120, 1); });
      clock.speed = 0;
      await moveTo(p, 30, FLOOR - 15, 600, 10);
      const ma = make(ms, -20);
      await walk(ma, 22, 36);
      anochece(0, 500);
      corazones(ma, 3);
      await wait(1400);
      await fin(ma);
    },
    async 'pano@gyarados'() {
      const { a, p } = await ponerle(recolor(ART.babero, { R: 'g' }), 'face', { to: GUEST_X - 30, dy: 24, dx: -4 });
      await wait(300);
      if (pide.hecho.includes('foto')) {
        const ph = carry(ART.flash, a);
        await wait(400);
        fogonazo(400); emit('spark', a.x, arriba(a) - 4);
        await wait(500);
        fogonazo(400);
        drop(ph);
      }
      chispas(punto(G, 'neck').x, punto(G, 'neck').y, 5, 10, 6);
      await react(1800);
      await fin(a);
    },
    async 'pano@metapod'() {
      const { a, p } = await ponerle(ART.pano, 'body');
      await every(140, 1800, i => { p.dx = i % 2 ? 2 : -2; });
      drop(p);
      // no se mueve, pero brilla un poco más
      chispas(G.x, arriba(G) + 10, 8, 14, 16, 180);
      emit('spark', punto(G, 'above').x, arriba(G) - 2);
      await wait(1800);
      await fin(a);
    },
    async 'pano@fearow'() {
      const { a, p } = await ponerle(ART.pano, 'face');
      await every(120, 1600, i => { p.dx = i % 2 ? 2 : -2; });
      drop(p);
      const q = punto(G, 'face');
      for (let i = 0; i < 5; i++) later(i * 200, () => emit('spark', q.x - 2, q.y));
      await wait(800);
      espejo(52, { sc: 0.5 });
      await react(1600);
      await fin(a);
    },
    async 'pano@staryu'() {
      const { a, p } = await ponerle(ART.pano, 'body');
      await every(120, 1600, i => { p.dx = i % 2 ? 2 : -2; });
      drop(p);
      // el núcleo brilla tanto que Charizard tiene que entornar los ojos
      const ch = make(cs, -22);
      await walk(ch, 40, 40);
      await anochece(0.35, 300);
      const l = luz({ on: G, at: 'body', r: 6, glow: '#FFF7B7' });
      for (let i = 0; i < 4; i++) later(i * 250, () => { l.r = 6 + i * 4; });
      fogonazo(700);
      shake(ch, 1200, 1); sudor(ch);
      chispas(G.x, arriba(G) + 10, 8, 16, 16, 150);
      await wait(1800);
      apagaLuz(l); s.dark = 0;
      await fin(a, ch);
    },
    async 'pano@starmie'() {
      const { a, p } = await ponerle(ART.pano, 'body');
      await every(120, 1500, i => { p.dx = i % 2 ? 2 : -2; });
      drop(p);
      // brilla en siete colores
      const cols = ['P', 'o', 'y', 'g', 'c', 'B', 'v'];
      await every(110, 2200, i => { const q = punto(G, 'body'); emit('confetti', q.x - 12 + Math.random() * 24, arriba(G) - 4, { col: cols[i % 7], size: 2 }); if (i % 6 === 0) emit('arcoiris', q.x, arriba(G) - 6); });
      await wait(400);
      await fin(a);
    },
    async 'pano@lickitung'() {
      const mic = enSuelo(ART.microfono, GUEST_X - 16);
      const { a, p } = await ponerle(ART.pano, 'front', { dx: -2 });
      a.dir = DIR.right;
      // cuarenta minutos frotando el paño contra el micro: se duerme todo el mundo
      const clock = reloj(44, 5, 2);
      await every(160, 2400, i => { p.dx = -2 + (i % 2 ? 2 : -2); if (i % 4 === 0) di('FRF', mic, { color: 'G', life: 900 }); });
      anim(a, 'Sleep');
      zzz(a, 2200, 500);
      await anochece(0.35, 500);
      await wait(1900);
      clock.speed = 0;
      anim(a, 'Idle');
      s.dark = 0;
      await fin(a);
    },
    async 'pano@drowzee'() {
      const ch = make(cs, 26); anim(ch, 'Sleep');
      zzz(ch, 5000, 700);
      const { a, p } = await ponerle(ART.pano, 'face', { to: GUEST_X - 22 });
      await every(140, 1400, i => { p.dx = i % 2 ? 1 : -1; });
      drop(p);
      // y le pone nota al sueño de Charizard
      await wait(300);
      estrellas(ch, 4, true);
      later(600, () => emit('spark', ch.x + 10, arriba(ch) - 6));
      await wait(2000);
      idle(ch);
      await fin(a, ch);
    },
    async 'pano@onix'() {
      // el otro paño de Onix es la toalla del termal: mete la cabeza, luego un trozo, luego otro… y no queda agua
      if (pide.termal) return termal({ hondo: 4, alivio: async poza => {
        for (let i = 0; i < 2; i++) { await every(40, 320, () => { G.x -= 0.5; }); G.y = Math.min(FLOOR + 10, G.y + 3); burst('drop', 70, FLOOR - 4, 8, 10); await wait(350); }
        poza.vacia = true; poza.calor = false;
        burst('drop', 60, FLOOR - 4, 10, 14); burst('drop', 84, FLOOR - 4, 10, 14);
        await wait(300);
        di('AY', G, { color: 'S', life: 1100 });
        corazones(G, 2, 500);
      } });
      const { a, p } = await ponerle(ART.pano, 'front');
      // limpia lo que tiene a mano: el marco, la puerta y medio pasillo (en la cueva, la boca de roca)
      const [x0, x1, y0] = s.cueva ? [GUEST_X - 22, GUEST_X + 16, FLOOR - 36] : [14, 60, 12];
      await moveTo(p, x0, y0, 500, 6);
      for (let x = x0; x <= x1; x += 6) { await moveTo(p, x, y0 + (x % 12 ? 0 : 3), 180, 2); emit('spark', x + 3, y0); }
      drop(p);
      sudor(a);
      await wait(400);
      await agacha(G, 2, 500, 2);
      di('PERDON', G, { color: 'G' });
      await wait(1200);
      await fin(a);
    },
    async 'pano@vaporeon'() {
      const { a, p } = await ponerle(ART.toalla, 'body');
      await every(130, 1400, i => { p.dx = i % 2 ? 2 : -2; burst('drop', G.x, arriba(G) + 6, 1, 6); });
      // la toalla queda empapada
      p.art = recolor(ART.toalla, { W: 'B', c: 'B' });
      await moveTo(p, 52, FLOOR - 6, 400, 6);
      const drip = every(200, 2600, () => emit('drop', p.x + 3, p.y + 6, { vx: 0, vy: 0 }));
      const ch = make(cs, -22);
      await walk(ch, 34, 40);
      face(ch, 'r');
      for (let i = 0; i < 6; i++) later(i * 180, () => emit('steam', p.x + 2 + Math.random() * 4, p.y));
      await fuego(ch, 6, { at: 'tail' });
      p.art = ART.toalla;
      await drip;
      await react(1000);
      await fin(a, ch);
    },

    // ===== el espejo =====
    async espejo() {
      const a = await ponEspejo();
      chispas(70, FLOOR - 10, 5, 10, 14);
      await react(2200);
      s.espejo = null;
      await fin(a);
    },
    async 'espejo@gengar'() {
      const a = await ponEspejo();
      // de perfil, peinándose el pelo que no tiene
      for (let i = 0; i < 4; i++) { G.dir = i % 2 ? DIR.left : DIR.downLeft; await wait(400); }
      face(G, 'l');
      await every(150, 1200, i => { const q = punto(G, 'head'); emit('spark', q.x + (i % 2 ? 3 : -3), q.y + 1); });
      di('GUAPO', G, { color: 'v', life: 1600 });
      corazones(G, 3);
      await wait(1600);
      s.espejo = null;
      await fin(a);
    },
    async 'espejo@eevee'() {
      const a = await ponEspejo({ to: 36 });
      emit('spark', 70, FLOOR - 16);
      await wait(600);
      // le guiña el ojo al espejo y luego a Manolo, que se pone rojo como Charizard
      di('*', G, { color: 'y' });
      await wait(700);
      for (let i = 0; i < 3; i++) later(i * 160, () => emit('heart', 50 + i * 6, arriba(a) + 2));
      await wait(700);
      a.tint = { color: C.R, alpha: 0.35 };
      shake(a, 900, 1); sudor(a);
      await wait(1500);
      a.tint = null; s.espejo = null;
      await fin(a);
    },
    async 'espejo@machoke'() {
      const a = await ponEspejo({ wall: true, x: 58, y: 8, h: 24, w: 14 });
      // Machoke posa; Charizard se pone a posar a su lado (y en alas no le gana)
      await agacha(G, 2, 500, 1);
      await walk(a, 76, 36);
      face(a, 'r'); face(a, 'l');
      anim(a, 'Hop');
      for (let i = 0; i < 3; i++) later(i * 300, () => emit('spark', a.x - 8 + i * 8, arriba(a)));
      await wait(1000);
      idle(a);
      vena(G, 1500); shake(G, 800, 1);
      await agacha(G, 2, 400, 2);
      await wait(400);
      s.espejo = null;
      await fin(a);
    },
    async 'espejo@magikarp'() {
      const a = await ponEspejo();
      for (let i = 0; i < 4; i++) { di('GYARADOS', G, { color: 'R', life: 700, rise: 3 }); await wait(420); }
      // a la décima, salta… y se da con el techo
      const y0 = G.y;
      if (s.outdoor) {
        // en el estanque no hay techo: salta muy alto y cae de panza en el agua
        await brinca(G, 1, 22, 700);
        burst('drop', G.x, FLOOR - 4, 12, 12);
        di('PLAF', G, { color: 'c' });
      } else {
        const ty = G.y - (caja(G).y0 - 1);
        await every(16, 260, () => { G.y = Math.max(ty, G.y - 4); });
        emit('spark', G.x, 2); di('BONK', { x: G.x, y: 10 }, { color: 'y' });
        shake(G, 300, 1);
        await every(16, 300, () => { G.y = Math.min(y0, G.y + 5); });
      }
      G.y = y0;
      await wait(800);
      s.espejo = null;
      await fin(a);
    },
    async 'espejo@pikachu'() {
      const a = await ponEspejo();
      await react(900);
      // se firma un autógrafo y se lo pega en la frente
      const firma = prop(ART.folio, G.x - 10, FLOOR - 16);
      await wait(300);
      firma.art = ART.posit;
      await ponA(firma, G, 'head', { dy: 3, dx: -2 });
      chispas(G.x, arriba(G), 4, 10, 6);
      await wait(1500);
      s.espejo = null;
      await fin(a);
    },
    async 'espejo@starmie'() {
      const a = await ponEspejo({ to: 30 });
      const ch = make(cs, -22);
      await walk(ch, 16, 40);
      // gira despacio, el arcoíris rebota en la pared y Charizard intenta cazarlo
      let rx = 40;
      const arco = every(220, 3200, i => { rx = 30 + Math.abs(((i * 4) % 40) - 20); emit('arcoiris', rx, 14); });
      shake(G, 3000, 1);
      await walk(ch, 34, 40); anim(ch, 'Hop'); await wait(500);
      await walk(ch, 22, 40); anim(ch, 'Hop'); await wait(500);
      await walk(ch, 40, 40); anim(ch, 'Hop'); await wait(500);
      await arco;
      s.espejo = null;
      await fin(ch, a);
    },
    async 'espejo@koffing'() {
      const a = await ponEspejo();
      for (let i = 0; i < 4; i++) { di('BLA', G, { color: 'v', life: 600, rise: 3, dx: -4 + (i % 2) * 8 }); await wait(400); }
      // a la duodécima le sale de un tirón, y tose de la emoción
      di('LEMA!', G, { color: 'y', life: 1300 });
      corazones(G, 2);
      await wait(800);
      di('COF', G, { color: 'S' }); humo(G, 4, { color: 'v' }); shake(G, 500, 1);
      await wait(1200);
      s.espejo = null;
      await fin(a);
    },
    async 'espejo@caterpie'() {
      const a = await ponEspejo();
      face(G, 'u'); await wait(500); face(G, 'd'); await wait(500); face(G, 'l');
      await wait(300);
      di('APAÑADA', a, { color: 'y' });
      await wait(600);
      await react(1800);
      s.espejo = null;
      await fin(a);
    },
    async 'espejo@bellsprout'() {
      const a = await ponEspejo({ x: 6, to: 30 });
      leave(a);
      // desfila hacia él veinte veces, con cara de hambre
      for (let i = 0; i < 2; i++) {
        await walk(G, 30, 40); di('ÑAM', G, { color: 'g', life: 700 });
        await wait(200);
        await walk(G, GUEST_X, 40); face(G, 'l');
      }
      await wait(600);
      s.espejo = null;
    },
    async 'espejo@vulpix'() {
      const a = await ponEspejo();
      // repasa sus colas, encuentra un pelo rebelde y lo pone en su sitio
      face(G, 'r'); await wait(500);
      const q = punto(G, 'tail');
      emit('spark', q.x, q.y - 4); di('!', { x: q.x, y: q.y - 8 }, { color: 'y' });
      await wait(700);
      face(G, 'l');
      await wait(400);
      anim(G, 'Sleep'); zzz(G, 1800);
      await anochece(0.35, 500);
      await wait(1500);
      s.dark = 0; s.espejo = null;
      idle(G);
      await fin(a);
    },
    async 'espejo@dratini'() {
      const a = await ponEspejo();
      await wait(400);
      // esta semana va de rockera
      G.tint = { color: C.L, alpha: 0.3 };
      emit('spark', G.x, arriba(G));
      for (let i = 0; i < 4; i++) later(i * 300, () => emit('note', G.x - 4 + i * 3, arriba(G)));
      di('ROCK', G, { color: 'R' });
      const ch = make(cs, -22);
      await walk(ch, 22, 40);
      await agacha(ch, 2, 400, 2);
      await wait(600);
      s.espejo = null;
      await fin(ch, a);
    },
    async 'espejo@mewtwo'() {
      const a = await ponEspejo();
      leave(a);
      // un buen rato en silencio…
      for (let i = 0; i < 3; i++) { di('.', G, { color: 'G', dx: -4 + i * 4, life: 1200, rise: 2 }); await wait(500); }
      await wait(600);
      // …y al final se arregla la cola, como los demás
      face(G, 'r'); await wait(300);
      const q = punto(G, 'tail');
      chispas(q.x, q.y, 3, 4, 4, 200);
      await wait(700);
      face(G, 'l');
      await wait(800);
      s.espejo = null;
    },

    // ===== la manta =====
    async manta() {
      const { a } = await arropar();
      zzz(G, 2600);
      await anochece(0.3, 600);
      await wait(2000);
      await fin(a);
    },
    async 'manta@snorlax'() {
      // Charizard le echa la manta: solo le tapa la barriga
      anim(G, 'Sleep');
      const { a, p } = await trae(ART.manta, { to: GUEST_X - 30 });
      await ponA(p, G, 'body', { dy: 2 });
      zzz(G, 3600, 500);
      await wait(600);
      const ma = make(ms, -20);
      await walk(ma, 40, 30);
      // nadie se atreve a decírselo
      sudor(ma); sudor(a);
      face(a, 'l'); await wait(400); face(a, 'r'); face(ma, 'r');
      await wait(1600);
      await fin(a, ma);
    },
    async 'manta@lapras'() {
      const { a } = await arropar({ sleep: false, art: manta(16, 6), at: 'tail', dy: -4 });
      await wait(300);
      // le cuenta una historia de Johto y Manolo se duerme a la mitad
      a.dir = DIR.right;
      for (let i = 0; i < 4; i++) later(i * 380, () => emit('note', G.x - 6 + i * 2, arriba(G)));
      await wait(1500);
      anim(a, 'Sleep'); zzz(a, 2200, 500);
      await wait(2200);
      idle(a);
      await fin(a);
    },
    async 'manta@machamp'() {
      // tapa a la cabra… y a Machamp se le escapa una lágrima («es del humo»; no hay humo)
      const cabra = enSuelo(['.L..L.', 'LWLLWL', 'LWWWWL', '.LWWWWL', '.LWWWWL', '.L.L.L'], GUEST_X - 18);
      const { a, p } = await trae(ART.manta, { to: GUEST_X - 36 });
      await moveTo(p, cabra.x - 1, cabra.y + 1, 400, 6);
      p.front = true;
      await wait(300);
      await agacha(G, 1, 400, 1);
      lagrimas(G, 3, 400);
      await wait(1200);
      di('HUMO', G, { color: 'S' });
      a.dir = DIR.right; di('?', a, { color: 'y' });
      await wait(1400);
      await fin(a);
    },
    async 'manta@clefable'() {
      // por fin solo se oye a sí misma
      const ruido = every(260, 1500, i => di(['BLA', 'TOC', 'RRR'][i % 3], { x: 30 + (i * 17) % 60, y: 20 }, { color: 'S', life: 800 }));
      const { a } = await arropar({ sleep: false, frac: 0.7 });
      await ruido;
      await wait(400);
      notas(G, 3);
      corazones(G, 2, 500);
      await wait(1800);
      await fin(a);
    },
    async 'manta@mew'() {
      s.outdoor = s.prado = true;
      enSuelo(ART.furgoneta, 26);
      const { a, p } = await trae(ART.manta, { to: 50 });
      await toss(p, 44, 400, 6);
      await fin(a);
      // al rato desaparece la manta… y luego Mew
      await wait(500);
      chispas(44, FLOOR - 4, 3, 8, 4);
      drop(p);
      await wait(700);
      emit('spark', G.x, arriba(G) + 6);
      await every(40, 600, () => { G.alpha = Math.max(0, (G.alpha ?? 1) - 0.08); });
      G.hidden = true;
      // debajo de la furgoneta se oye un ronroneo

      for (let i = 0; i < 3; i++) later(i * 500, () => di('RRR', { x: 26, y: FLOOR - 4 }, { color: 'p', life: 900 }));
      await wait(2000);
    },
    async 'manta@marowak'() {
      const { a, p } = await dejar(ART.manta, { to: 58 });
      const p2 = prop(ART.manta, a.x - 4, arriba(a) - 7);
      await moveTo(p2, p.x, p.y - 6, 400, 6);
      // las dobla con mucho cuidado y les habla bajito
      await wait(400);
      for (let i = 0; i < 3; i++) later(i * 450, () => di('...', G, { color: 'G', life: 900, rise: 3 }));
      await agacha(G, 2, 600, 1);
      corazones(G, 2, 500);
      await wait(1000);
      await fin(a);
    },
    async 'manta@nidoking'() {
      const { a } = await arropar({ frac: 0.35, cols: ['R', 'p'] });
      // no les tapa ni los pies, pero se duermen abrazados
      corazones(G, 3, 400);
      zzz(G, 2400);
      await anochece(0.35, 600);
      await wait(1800);
      await fin(a);
    },
    async 'manta@charmander'() {
      const { a } = await arropar({ frac: 0.55, cols: ['R', 'W'] });
      await anochece(0.55, 700);
      // la cola fuera, como un farolillo
      luz({ on: G, at: 'tail', r: 7, flick: true, glow: '#FFB347' });
      zzz(G, 2400);
      await wait(2200);
      await fin(a);
    },
    async 'manta@starmie'() {
      const { a } = await arropar({ sleep: false, frac: 0.7 });
      await anochece(0.6, 700);
      // solo se escapa un hilillo de luz, como una lamparita de noche
      luz({ on: G, at: 'head', r: 3, glow: '#FFF7B7', dy: 2 });
      zzz(G, 2200);
      await wait(2200);
      await fin(a);
    },

    // ===== la linterna =====
    async linterna() {
      await anochece(0.6, 500);
      const { a, p } = await trae(ART.linterna, { to: 56 });
      const l = luz({ cone: linternaCono(p, () => punto(G, 'body')), glow: '#FFE7A7' });
      luz({ on: G, at: 'body', r: 8 });
      await wait(400);
      chispas(G.x, arriba(G) + 8, 4, 12, 12);
      await react(1800);
      apagaLuz(l);
      await fin(a);
    },
    async 'linterna@bulbasaur'() {
      const { a, p } = await ponerle(ART.linterna, 'front', { to: GUEST_X - 26 });
      await fin(a);
      // se encierra en el cuarto: por la rendija sale luz toda la noche… y un olor dulce
      const puerta = prop(ART.puerta, GUEST_X - 14, FLOOR - 18, { front: true });
      await anochece(0.6, 700);
      luz({ x: puerta.x - 1, y: FLOOR - 8, r: 2, glow: '#FFE7A7', flick: true });
      const clock = reloj(44, 5, 3);
      await every(260, 2600, i => emit('smoke', puerta.x - 2, FLOOR - 6 - (i % 3) * 3, { dir: -1, color: ['p', 'g'][i % 2] }));
      clock.speed = 0;
      di('LEO', puerta, { color: 'W', dx: 4, dy: -2 });
      await wait(1000);
    },
    async 'linterna@mew'() {
      s.outdoor = s.prado = true;
      enSuelo(ART.furgoneta, 30);
      await anochece(0.6, 400);
      const { a, p } = await trae(ART.linterna, { to: 48 });
      await toss(p, 52, 350, 4);
      luz({ cone: () => [[p.x + 2, p.y + 1], [GUEST_X - 16, FLOOR - 7], [GUEST_X - 16, FLOOR + 2]], glow: '#FFE7A7' });
      await fin(a);
      // una sombrita rosa en el barro, y Mew la mira toda la noche
      const sombra = prop(['.vvvv.', 'vvvvvv'], GUEST_X - 24, FLOOR - 1);
      luz({ on: G, at: 'body', r: 6 });
      await every(250, 2400, i => { sombra.x = GUEST_X - 24 + (i % 2); if (i % 3 === 0) emit('heart', G.x, arriba(G)); });
    },
    async 'linterna@pidgey'() {
      await anochece(0.6, 500);
      const { a, p } = await ponerle(ART.linterna, 'front', { to: GUEST_X - 26 });
      await fin(a);
      // se pasa la noche alumbrándose en la ventana: por fin se le ve
      espejo(14, { wall: true, y: 8, h: 18, w: 18, sc: 0.8 });
      luz({ on: G, at: 'body', r: 10, glow: '#FFE7A7' });
      luz({ x: 23, y: 17, r: 9 });
      await wait(600);
      corazones(G, 4, 400);
      await wait(2000);
      s.espejo = null;
    },
    async 'linterna@pidgeotto'() {
      await anochece(0.6, 500);
      const { a, p } = await ponerle(ART.linterna, 'front', { to: GUEST_X - 26 });
      await fin(a);
      // la ronda: a la despensa le dedica tres vueltas
      luz({ on: G, at: 'front', r: 9, glow: '#FFE7A7', dx: -4 });
      const puerta = prop(ART.puerta, 10, FLOOR - 18);
      for (let i = 0; i < 3; i++) { await walk(G, 30, 50); await walk(G, 60, 50); }
      di('OK', puerta, { color: 'y', dx: 4 });
      await walk(G, GUEST_X, 50); face(G, 'l');
      await wait(500);
    },
    async 'linterna@pidgeot'() {
      s.outdoor = s.prado = true;
      await anochece(0.55, 500);
      const { a, p } = await trae(ART.linterna, { to: 50 });
      // la cuelga del pino y ensaya el vuelo en formación
      await moveTo(p, 20, 10, 500, 8);
      luz({ prop: p, r: 9, glow: '#FFE7A7' });
      await fin(a);
      await walk(G, 70, 40); await brinca(G, 1, 6, 500);
      for (let i = 0; i < 12; i++) later(i * 120, () => emit('bird', 130 + (i % 4) * 4, 8 + (i % 5) * 4, { vx: -150, col: 'W', life: 2200 }));
      await brinca(G, 3, 6, 500);
      await walk(G, GUEST_X, 40); face(G, 'l');
      await wait(700);
    },
    async 'linterna@staryu'() {
      await anochece(0.55, 500);
      const ch = make(cs, -22); walk(ch, 24, 40);
      const { a, p } = await trae(ART.linterna, { to: 54 });
      a.dir = DIR.right;
      luz({ cone: linternaCono(p, () => punto(G, 'body')), glow: '#FFE7A7' });
      await wait(600);
      // brilla tanto que Charizard se tapa los ojos con las alas
      const l = luz({ on: G, at: 'body', r: 5, glow: '#FFF7B7' });
      await every(80, 800, i => { l.r = 5 + i; });
      fogonazo(800);
      face(ch, 'l'); shake(ch, 1400, 1); sudor(ch);
      chispas(G.x, arriba(G) + 10, 8, 18, 16, 140);
      await wait(1800);
      await fin(a, ch);
    },
    async 'linterna@golbat'() {
      await anochece(0.55, 400);
      const ch = make(cs, 30); face(ch, 'r');
      const { a, p } = await ponerle(ART.linterna, 'head', { to: GUEST_X - 36 });
      await fin(a);
      luz({ on: G, at: 'front', r: 8, glow: '#FFE7A7', dx: -6 });
      // y persigue a Charizard por el comedor diciendo «abra, abra»
      di('ABRA', G, { color: 'v' });
      const run = walk(ch, -30, 60);
      sudor(ch);
      await walk(G, 20, 55);
      di('ABRA', G, { color: 'v' });
      await run;
      await walk(G, GUEST_X, 55); face(G, 'l');
    },
    async 'linterna@weezing'() {
      s.outdoor = s.prado = true;
      await anochece(0.5, 400);
      const { a, p } = await ponerle(ART.linterna, 'front', { to: GUEST_X - 28 });
      await fin(a);
      luz({ on: G, at: 'body', r: 10, glow: '#FFE7A7' });
      // sale al bosque y vuelve a la hora con un Koffing pequeño debajo de cada cabeza
      await walk(G, 150, 45);
      const clock = reloj(44, 5, 3);
      await wait(1000);
      clock.speed = 0;
      const ks = await loadSprite('0109', ['Idle', 'Walk']);
      const k1 = make(ks, 158), k2 = make(ks, 170);
      k1.scale = k2.scale = 0.5;
      const back = walk(G, GUEST_X, 40);
      walk(k1, GUEST_X - 6, 40); walk(k2, GUEST_X + 8, 40);
      await back; face(G, 'l');
      corazones(G, 3);
      await wait(1500);
    },

    // ===== el café (y el té) =====
    async cafe() {
      const { a, p } = await dejar(ART.cafe, { to: 60 });
      vapor(p, 2400);
      await wait(500);
      anim(G, 'Eat');
      await wait(1100);
      await react(1500);
      drop(p);
      await fin(a);
    },
    async 'cafe@arcanine'() {
      const { a, p } = await dejar(ART.vaso, { to: 60 });
      vapor(p, 3000);
      await wait(400);
      // lo sopla muy serio… y se quema el hocico
      for (let i = 0; i < 3; i++) later(i * 300, () => emit('smoke', p.x + 2, p.y - 2, { dir: -1, color: 'W' }));
      await wait(1000);
      anim(G, 'Eat'); await wait(500);
      shake(G, 500, 1); di('AY', G, { color: 'R' }); sudor(G);
      idle(G);
      await wait(900);
      di('SERVICIO', G, { color: 'y', life: 1400 });
      await wait(1300);
      drop(p);
      await fin(a);
    },
    async 'cafe@mrmime'() {
      const { a, p } = await dejar(ART.cafe, { to: 62 });
      vapor(p, 1200);
      const clock = reloj(44, 5, 2);
      a.dir = DIR.right;
      // dos horas opinando de todo; Manolo asiente cada diez minutos
      for (let i = 0; i < 6; i++) {
        di(['BLA', 'PUES', 'BLA', 'OYE', 'BLA', 'Y YO'][i], G, { color: 'W', life: 800, rise: 4, dx: -4 + (i % 2) * 6 });
        if (i % 2) agacha(a, 1, 300, 1);
        await wait(450);
      }
      anim(G, 'Eat'); await wait(600); idle(G);
      clock.speed = 0; drop(p);
      await wait(500);
      await fin(a);
    },
    async 'cafe@magikarp'() {
      // un chorrito del aceite de la chistorra en el café
      const { a, p } = await dejar(ART.cafe, { to: 60 });
      const bote = carry(ART.botella, a);
      await wait(300);
      await every(90, 700, () => emit('drop', p.x + 3, p.y - 4, { vx: 0, vy: 0 }));
      p.art = recolor(ART.cafe, { W: 'O' });
      drop(bote);
      anim(G, 'Eat'); await wait(800); idle(G);
      di('DISRUPTIVO', G, { color: 'y', life: 1700 });
      chispas(G.x, arriba(G), 5, 14, 8);
      await wait(1700);
      drop(p);
      await fin(a);
    },
    async 'cafe@gyarados'() {
      const { a, p } = await dejar(ART.cafe, { to: 56 });
      vapor(p, 1600);
      await wait(500);
      anim(G, 'Eat'); await wait(900);
      // cierra los ojos: lo más auténtico que ha bebido nunca
      idle(G);
      corazones(G, 4, 350);
      di('AUTENTICO', G, { color: 'y', life: 1600 });
      await wait(1700);
      drop(p);
      await fin(a);
    },
    async 'cafe@graveler'() {
      const { a, p } = await dejar(ART.cafe, { to: 60 });
      vapor(p, 700);
      await wait(400);
      // de un trago…
      anim(G, 'Eat'); await wait(400); drop(p); idle(G);
      shake(G, 500, 1);
      await wait(300);
      // …y sale a dar una vuelta a la posada. Son las once de la noche
      reloj(44, 5, 0);
      anochece(0.45, 400);
      a.dir = DIR.right;
      await walk(G, 150, 80);
      sudor(a);
      di('?', a, { color: 'y' });
      await wait(900);
    },
    async 'cafe@pidgeotto'() {
      // se lo deja en el alféizar de la ventana, y Pidgeotto se lo toma allí, vigilando el camino
      const { a, p } = await trae(ART.cafe, { to: 40 });
      a.dir = DIR.left;
      if (!s.outdoor) await moveTo(p, 16, 28 - p.art.length, 400, 6); else await toss(p, GUEST_X - 12, 420, 8);
      await fin(a);
      if (!s.outdoor) { await walk(G, 40, 40); face(G, 'l'); }
      anim(G, 'Eat'); await wait(400); drop(p); idle(G);
      // sin quitarle ojo al camino: no pasa nadie. Él vigila igual
      for (let i = 0; i < 3; i++) { face(G, 'l'); await wait(600); face(G, 'u'); await wait(300); }
      face(G, 'l');
      di('...', G, { color: 'G' });
      await wait(1000);
    },
    async 'cafe@ninetales'() {
      // Charizard sube el té con el meñique estirado y sin acercarse a las colas
      const { a, p } = await trae(ART.taza, { to: GUEST_X - 44, speed: 20 });
      sudor(a);
      await toss(p, GUEST_X - 14, 600, 4);
      vapor(p, 2400);
      await wait(300);
      a.dir = DIR.left; await wait(200); a.dir = DIR.right;
      for (let i = 0; i < 3; i++) { anim(G, 'Eat'); await wait(350); idle(G); await wait(250); }
      di('MERCI', G, { color: 'p', life: 1500 });
      corazones(G, 2);
      await wait(1200);
      drop(p);
      await fin(a);
    },
  });

  const ARTX = {
    globo: ['.LLL.', 'LyyyL', 'LyLyL', 'LyyyL', '.LyL.', '..L..'],
    roca: ['..LLLL..', '.LMMMML.', 'LMMGMMML', 'LMMMMMML', 'LLLLLLLL'],
    positChistorra: ['LLLLLL', 'LyyyyL', 'LyRRyL', 'LRRyyL', 'LyyyyL', 'LLLLL.'],
    silla: ['L....', 'L....', 'LLLLL', 'LkkkL', 'L...L', 'L...L'],
    sofa: ['LLLLLLLLLLLLLL', 'LRRRRRRRRRRRRL', 'LRRRRRRRRRRRRL', 'LLLLLLLLLLLLLL', 'L............L'],
    cortina: ['LLLLL', 'LpppL', 'LpWpL', 'LpppL', 'LpWpL', 'LpppL', 'LpWpL', 'LpppL', '.LLL.'],
    lata: ['LLLLL', 'LSSSL', 'LSWSL', 'LSSSL', 'LLLLL'],
    blob: ['..LL..', '.LvvL.', 'LvLvLL', 'LvvvvL', '.LLLL.'],
    velaApagada: ['.....', '.....', '.LWL.', '.LWL.', '.LWL.', 'LLLLL'],
    cubitos: ['LL.LL', 'LcLcL', '.LL..'],
    seta: ART.seta,
    batidora: ['.LLLL.', 'LMMMML', 'LWWWWL', 'LppppL', 'LppppL', 'LLLLLL', 'LMMMML', 'LLLLLL'],
    vasoRojo: ['L...L', 'LRRRL', 'LRWRL', 'LRRRL', '.LLL.'],
    papelitos: ['W.W', '.W.', 'W.W'],
    caja: ['LLLLLLL', 'LWW.WWL', 'LpppppL', 'LpWWWpL', 'LpppppL', 'LLLLLLL'],
    cajaVacia: ['LLLLLLL', 'L.....L', 'LpppppL', 'LpWWWpL', 'LpppppL', 'LLLLLLL'],
    plato: ['..LLL..', '.LRWRL.', 'LWWWWWL', '.LLLLL.'],
    chimenea: ['LLLLLLLLLLLL', 'LMMMMMMMMMML', 'LLLLLLLLLLLL', '.LMMMMMMMML.', '.LMLLLLLLML.', '.LMLRYRYLML.', '.LMLYRYRLML.', '.LMLLLLLLML.', '.LLLLLLLLLL.'],
  };
  // un cuadro colgado torcido (cada columna un poco más alta que la anterior), con su paisajito
  const drawTorcido = (ctx, x, y) => {
    for (let col = 0; col < 14; col++) {
      const off = Math.round(-col * 0.25) + 3;
      for (let r = 0; r < 10; r++) {
        const edge = col === 0 || col === 13 || r === 0 || r === 9;
        const inner = col === 1 || col === 12 || r === 1 || r === 8;
        ctx.fillStyle = edge ? C.L : inner ? C.k : r < 5 ? C.c : (r === 5 && col % 4 === 1) || r > 5 ? C.g : C.c;
        ctx.fillRect(Math.round(x) + col, Math.round(y) + off + r, 1, 1);
      }
    }
    ctx.fillStyle = C.L; ctx.fillRect(Math.round(x) + 6, Math.round(y), 1, 2);
  };
  // El termal: una poza de agua junto al huésped; Charizard la calienta a fuego (o con tiento)
  // y el huésped se mete hasta donde le llegue (hondo: píxeles que se le hunden)
  const drawPoza = (ctx, x, y, p, t) => {
    const cx = Math.round(x) + 15, top = Math.round(y) + 2;
    for (let dy = 0; dy < 6; dy++) {
      const half = Math.round(15 * Math.sqrt(1 - (dy / 6.5) ** 2));
      ctx.fillStyle = dy === 0 ? C.L : p.vacia ? (dy < 3 ? '#8F6037' : '#6F4A2F') : dy < 2 ? (p.calor ? '#F7C7A7' : C.c) : dy < 4 ? (p.calor ? '#E78F6F' : C.B) : '#376F8F';
      ctx.fillRect(cx - half, top + dy, half * 2, 1);
    }
    ctx.fillStyle = C.M; for (const dx of [-16, -12, 12, 15]) ctx.fillRect(cx + dx, top - 1, 2, 2);
    if (p.calor && !p.vacia && Math.floor(t / 200) % 2) { ctx.fillStyle = C.W; ctx.fillRect(cx - 6 + (Math.floor(t / 400) % 3) * 5, top + 1, 1, 1); }
  };
  const termal = async ({ hondo = 6, suave = false, alivio } = {}) => {
    // el termal está fuera, a la derecha de la casa (lejos del pino): se baña ahí aunque duerma en la cueva
    Object.assign(s, { outdoor: true, prado: true, cueva: false, pino: false });
    // (el agua ya viene caliente del minijuego, donde Charizard la ha puesto a su punto: aquí solo se baña)
    const poza = prop(Array(8).fill('.'.repeat(30)), 55, FLOOR - 4, { draw: drawPoza, calor: true });
    const vaho = every(140, 9000, () => emit('steam', 58 + Math.random() * 26, FLOOR - 3));
    const { a } = await trae(null, { sprite: cs, to: 36 });
    face(a, 'r');
    if (suave) di('TIENTO', a, { color: 'y', life: 1000 });
    await wait(500);
    // el huésped se mete
    await walk(G, 72, suave ? 16 : 30);
    face(G, 'l');
    G.clip = [0, 0, W, FLOOR - 1];
    await every(50, hondo * 60, () => { G.y = Math.min(FLOOR + hondo, G.y + 1); });
    burst('drop', 70, FLOOR - 4, 6, 8);
    await wait(400);
    // si el minijuego salió mal, el agua no está a su punto: sale refunfuñando y chorreando
    if (fallo) {
      di('¡UF!', G, { color: 'R', life: 1200 });
      emit('vein', G.x, arriba(G), { stick: G, life: 1600 });
      await wait(900);
      G.clip = null; G.y = FLOOR;
      const goteo = every(120, 1400, () => burst('drop', G.x, arriba(G) + 6, 1, 4));
      await walk(G, 100, 26);
      await goteo;
      await fin(a);
      void vaho;
      return;
    }
    await alivio?.(poza);
    await wait(1400);
    G.clip = null; G.y = FLOOR;
    await fin(a);
    void vaho;
  };
  const torcido = () => prop(Array(13).fill('..............'), 48, 6, { draw: drawTorcido });
  const tele = () => prop(ART.tele, 8, FLOOR - 9);

  Object.assign(SCRIPTS, {
    // ===== las flores =====
    async flores() {
      const { a, p } = await dejar(ART.flores, { to: 60 });
      await wait(400);
      for (let i = 0; i < 3; i++) later(i * 300, () => emit('spark', p.x + 3, p.y - 1));
      di('MMM', G, { color: 'p' });
      await react(1800);
      await fin(a);
    },
    async 'flores@vileplume'() {
      const { a, p } = await dejar(ART.flores, { to: 60 });
      await fin(a);
      reloj(44, 5, 2);
      await wait(900);
      // al rato todas las flores se han girado hacia la ventana, mareadas
      p.art = ART.floresGiradas;
      await every(200, 1600, i => { p.x += i % 2 ? 1 : -1; if (i % 3 === 0) di('?', { x: p.x + 2, y: p.y - 2 }, { color: 'y', life: 700, rise: 4 }); });
      await wait(600);
    },
    async 'flores@jynx'() {
      const { a, p } = await dejar(recolor(ART.flores, { P: 'W' }), { to: 60, x: GUEST_X - 14 });
      await wait(300);
      // las huele, suspira y dice que no son claveles, pero que tienen arte
      di('AY', G, { color: 'p' });
      await wait(900);
      di('ARTE', G, { color: 'R', life: 1500 });
      for (let i = 0; i < 3; i++) later(i * 250, () => emit('note', G.x - 3 + i * 3, arriba(G)));
      await react(1600);
      await fin(a);
    },
    async 'flores@cubone'() {
      const { a, p } = await trae(ART.floresQuemadas, { to: GUEST_X - 38 });
      vapor(p, 1200, 'S');
      await toss(p, GUEST_X - 14, 420, 6);
      await wait(400);
      // solo se le han chamuscado dos, y esas son las que más le gustan a su madre
      emit('spark', p.x + 3, p.y); emit('spark', p.x + 4, p.y + 2);
      corazones(G, 4, 380);
      await wait(1600);
      await fin(a);
    },
    async 'flores@nidorino'() {
      const { a, p } = await dejar(ART.flores, { to: 60 });
      await wait(300);
      p.art = [...ART.flores.slice(0, 4), 'LcccccL', 'LcgcccL', '.LLLLL.'];
      emit('spark', p.x + 3, p.y + 4);
      await wait(400);
      corazones(G, 5, 330);
      await wait(1800);
      await fin(a);
    },
    async 'flores@butterfree'() {
      const { a, p } = await trae(ART.flores, { to: 34 });
      drop(p);
      const fl = [40, 58, 76].map(x => enSuelo(['.P.', 'PyP', '.g.', '.g.'], x));
      await fin(a);
      // se posa en cada flor, una a una, como si se despidiera
      for (const f of fl) {
        await walk(G, f.x + 1, 30);
        await brinca(G, 1, 3, 400);
        emit('heart', f.x + 1, f.y - 6);
        await wait(200);
      }
      await walk(G, GUEST_X, 30); face(G, 'l');
      await wait(500);
    },
    async 'flores@bellsprout'() {
      const { a, p } = await ponerle(['.W.', 'WyW', '.W.', '.g.'], 'head');
      await fin(a);
      // desfila por el pasillo y se cae al girar
      await walk(G, 40, 32);
      G.rot = -Math.PI / 2; shake(G, 300, 1); emit('spark', G.x, FLOOR - 6);
      await wait(800);
      G.rot = 0;
      chispas(G.x, arriba(G), 5, 12, 8);
      await agacha(G, 1, 500, 1);
      await walk(G, GUEST_X, 32); face(G, 'l');
      await wait(400);
    },

    // ===== el cepillo =====
    async cepillo() {
      const { a, p } = await ponerle(ART.cepillo, 'head', { dy: -2 });
      await every(140, 2000, i => { p.dx = i % 2 ? 3 : -3; if (i % 3 === 0) emit('spark', G.x - 4 + Math.random() * 8, arriba(G) + 2); });
      drop(p);
      await react(1600);
      await fin(a);
    },
    async 'cepillo@clefairy'() {
      const { a, p } = await ponerle(ART.cepillo, 'head', { dy: -2 });
      const song = every(380, 3000, i => emit('note', G.x - 3 + (i % 3) * 3, arriba(G)));
      await every(160, 1500, i => { p.dx = i % 2 ? 2 : -2; });
      // canta y un gorrión se posa en la ventana: dice que es su amigo
      const bird = prop(ART.gorrion, 40, 0);
      await moveTo(bird, 22, 20, 900, -6);
      emit('heart', 24, 18);
      await song;
      drop(p);
      await fin(a);
    },
    async 'cepillo@slowpoke'() {
      const { a, p } = await ponerle(ART.cepillo, 'tail', { to: GUEST_X - 38 });
      await every(160, 1800, i => { p.dx = i % 2 ? 2 : -2; });
      drop(p);
      await fin(a);
      // da las gracias tres minutos después, cuando Charizard ya se ha ido
      const clock = reloj(44, 5, 1.5);
      await wait(1300);
      clock.speed = 0;
      di('GRACIAS', G, { color: 'p', life: 1600 });
      await wait(1500);
    },
    async 'cepillo@spearow'() {
      const { a, p } = await ponerle(ART.cepillo, 'head', { dy: -2 });
      a.dir = DIR.right;
      const clock = reloj(44, 5, 2);
      await every(140, 1800, i => { p.dx = i % 2 ? 2 : -2; });
      drop(p); clock.speed = 0;
      chispas(punto(G, 'head').x, arriba(G), 4, 8, 4);
      await wait(600);
      // le queda perfecta. Luego mira la calva de Manolo y le da un poco de pena
      emit('spark', punto(a, 'head').x, arriba(a) + 1);
      s.sad = G;
      await wait(1600);
      s.sad = null;
      await fin(a);
    },
    async 'cepillo@golbat'() {
      const { a, p } = await ponerle(ART.cepillo, 'face');
      await fin(a);
      // contando los dientes: le salen todos
      for (let i = 1; i <= 5; i++) { p.dx = i % 2 ? 2 : -2; di(String(i), G, { color: 'W', life: 600, rise: 4, dx: -6 + i * 2 }); await wait(380); }
      drop(p);
      di('TODOS', G, { color: 'y' });
      await react(1400);
    },
    async 'cepillo@vulpix'() {
      const { a, p } = await ponerle(ART.cepillo, 'tail');
      a.dir = DIR.right;
      for (let i = 0; i < 6; i++) { p.dy = -4 + i * 2; p.dx = i % 2 ? 2 : -2; await wait(220); }
      // y, por costumbre, le pasa el cepillo a Manolo por la calva: suena a cristal
      await ponA(p, a, 'head', { dy: -1 });
      for (let i = 0; i < 3; i++) { p.dx = i % 2 ? 2 : -2; di('CLIN', a, { color: 'c', life: 700, rise: 4 }); await wait(350); }
      drop(p);
      sudor(a);
      await wait(700);
      await fin(a);
    },
    async 'cepillo@flareon'() {
      const { a, p } = await ponerle(ART.cepillo, 'head', { dy: -1 });
      await every(160, 1600, i => { p.dx = i % 2 ? 2 : -2; });
      drop(p);
      // se esponja tanto que no cabe por la puerta del cuarto
      await every(40, 700, i => { G.scale = 1 + Math.min(0.45, i * 0.03); });
      chispas(G.x, arriba(G) + 6, 6, 20, 12);
      sudor(a);
      await wait(1600);
      G.scale = 1;
      await fin(a);
    },

    // ===== el periódico =====
    async 'periodico@arbok'() {
      const { a, p } = await dejar(ART.periodico, { to: 60 });
      await fin(a);
      // lo lee de cola a cabeza y subraya tres cotilleos. Uno es de la posada
      face(G, 'r'); await wait(600); face(G, 'l'); await wait(400);
      for (let i = 0; i < 3; i++) { emit('spark', p.x + 2 + i * 2, p.y + 3); p.art = ART.periodico.map((r, y) => y === 2 + (i % 3) ? r.replace(/W/g, (m, k) => (k > i && k < 7 ? 'R' : 'W')) : r); await wait(500); }
      di('SSSS', G, { color: 'v', life: 1600 });
      await wait(1400);
    },
    async 'periodico@dodrio'() {
      const { a, p } = await dejar(ART.periodico, { to: 60 });
      await fin(a);
      // cada cabeza lee una página y no se ponen de acuerdo ni en qué día es
      const dias = ['LUN', 'JUE', 'DOM'];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { di(dias[(i + r) % 3], G, { color: 'W', dx: -10 + i * 10, life: 700, rise: 3 }); await wait(260); }
      vena(G, 900);
      await wait(500);
      await react(1400);
    },
    async 'periodico@victreebel'() {
      const { a, p } = await dejar(ART.periodico, { to: 60 });
      await fin(a);
      await wait(500);
      // no sale James, pero sale un globo con forma de Meowth: recorta la foto y se la guarda
      const foto = prop(ARTX.globo, p.x + 1, p.y - 2);
      emit('spark', p.x + 3, p.y);
      await wait(400);
      await ponA(foto, G, 'body');
      corazones(G, 3);
      await wait(1500);
    },
    async 'periodico@dragonair'() {
      s.day = false;
      const { a, p } = await dejar(ART.periodico, { to: 60 });
      await fin(a);
      di('SOLEADO', G, { color: 'y', life: 1500 });
      await wait(800);
      // a la mañana siguiente sale el sol. Por una vez, no ha tocado nada
      await anochece(0.5, 500);
      await wait(500);
      s.day = true;
      await anochece(0, 500);
      chispas(22, 18, 4, 12, 8);
      corazones(G, 3);
      await wait(1500);
    },

    // ===== el sobre =====
    async sobre() {
      const { a, p } = await ponerle(ART.sobre, 'front', { dy: 2 });
      await wait(500);
      p.art = ART.sobreSellado;
      emit('spark', punto(G, 'front').x, punto(G, 'front').y);
      await react(1800);
      await fin(a);
    },
    async 'sobre@ivysaur'() {
      const { a, p } = await ponerle(ART.sobre, 'front', { dy: 2 });
      await wait(400);
      const papel = prop(ART.folio, p.x, p.y - 10); await moveTo(papel, p.x + 2, p.y, 300, 2); drop(papel);
      // lo cierra con la lengua y lo sella con una hoja
      di('LAMP', G, { color: 'p', life: 700 });
      await wait(500);
      p.art = ART.sobreVerde; emit('spark', propPos(p).x + 4, propPos(p).y);
      await wait(400);
      di('EN REGLA', G, { color: 'g', life: 1500 });
      await wait(1400);
      await fin(a);
    },
    async 'sobre@nidorino'() {
      const { a, p } = await dejar(ART.sobre, { to: 58, x: 70 });
      await wait(300);
      for (let i = 0; i < 3; i++) { p.art = i === 2 ? ART.sobreSellado : ART.sobre.map((r, y) => y === 3 ? r.slice(0, 2 + i * 3) + 'P' + r.slice(3 + i * 3) : r); emit('heart', p.x + 4, p.y - 2); await wait(350); }
      await fin(a);
      // lo deja en la almohada; Nidorina lo encuentra y llora un ratito
      await anochece(0.4, 500);
      await wait(400);
      lagrimas(G, 4, 300);
      corazones(G, 3, 400);
      await wait(1600);
    },
    async 'sobre@caterpie'() {
      const { a, p } = await dejar(ART.sobre, { to: 60 });
      // un sobre con un pino dibujado: tres sellos y una pegatina de corazón, por si acaso
      p.art = ART.sobre.map((r, y) => y === 2 ? 'LWWgLLWWL'.slice(0, 9) : r);
      await wait(400);
      for (let i = 0; i < 3; i++) { const st = prop(ART.sello, G.x - 8, arriba(G)); await moveTo(st, p.x + 1 + i * 2, p.y - 3, 260, 4); emit('spark', st.x + 2, st.y); }
      const hz = prop(ART.pegatina, G.x - 8, arriba(G)); await moveTo(hz, p.x + 3, p.y + 2, 260, 4);
      corazones(G, 2);
      await wait(1300);
      await fin(a);
    },
    async 'sobre@metapod'() {
      // lo pasa por debajo de la puerta
      prop(ART.puerta, GUEST_X - 18, FLOOR - 18, { front: true });
      const { a, p } = await trae(ART.sobre, { to: GUEST_X - 32 });
      await moveTo(p, a.x + 2, FLOOR - 6, 300, 0);
      await moveTo(p, GUEST_X - 12, FLOOR - 6, 600, 0);
      p.hidden = true;
      await wait(700);
      // desde dentro, muy bajito: «Fortaleza». Suena a gracias
      di('FORTALEZA', { x: GUEST_X - 14, y: 22 }, { color: 'G', life: 1800, rise: 3 });
      await wait(800);
      corazones(a, 2);
      await wait(1000);
      await fin(a);
    },
    async 'sobre@butterfree'() {
      const { a, p } = await ponerle(ART.sobre, 'front', { dy: 4 });
      // lo cierra con polvo de las alas: brilla un poco y huele a primavera
      await every(120, 1400, () => { const q = propPos(p); emit('confetti', q.x + Math.random() * 9, q.y - 6, { col: ['y', 'W', 'p'][Math.floor(Math.random() * 3)] }); });
      p.art = recolor(ART.sobre, { W: 'y' });
      chispas(propPos(p).x + 4, propPos(p).y, 4, 8, 4);
      notas(G, 3);
      await wait(1500);
      await fin(a);
    },

    // ===== los pósits =====
    async posit() {
      const { a, p } = await trae(ART.posit, { to: 60 });
      await moveTo(p, 56, 20, 400, 6);
      emit('spark', 59, 20);
      await react(1800);
      await fin(a);
    },
    async 'posit@golduck'() {
      // lo pega en la chimenea (dentro, aunque duerma en el estanque): «Tema 1: no te agobies». Manolo lo deja ahí
      s.outdoor = false;
      if (/chimenea/.test(pide.hecho)) prop(ARTX.chimenea, 40, FLOOR - 9);
      const { a, p } = await trae(ART.posit, { to: 54 });
      await moveTo(p, 43, FLOOR - 15, 400, 6);
      emit('spark', 46, FLOOR - 15);
      di('TEMA 1', { x: 46, y: FLOOR - 18 }, { color: 'y', life: 1600 });
      await wait(600);
      a.dir = DIR.left; await wait(500);
      await react(1500);
      await fin(a);
    },
    async 'posit@alakazam'() {
      const cuchara = enSuelo(ART.cuchara, GUEST_X - 16);
      const { a, p } = await trae(ART.posit, { to: 60 });
      await fin(a);
      // escribe la letra que siempre falla y se la pega en la cuchara
      await moveTo(p, cuchara.x - 1, cuchara.y - 2, 400, 6);
      di('Ñ', { x: cuchara.x + 2, y: cuchara.y - 6 }, { color: 'y', life: 1400 });
      await anochece(0.5, 700);
      luz({ x: cuchara.x + 2, y: cuchara.y + 2, r: 5 });
      for (let i = 0; i < 3; i++) { di('.', G, { color: 'G', dx: -4 + i * 4, life: 1000, rise: 2 }); await wait(500); }
      await wait(800);
    },
    async 'posit@weedle'() {
      s.outdoor = s.prado = true;
      const van = enSuelo(proveedor === 'nuevo' ? ART.furgoneta.map(f => f.replace(/R/g, 'g')) : ART.furgoneta, 40);
      const { a, p } = await ponerle(ART.posit, 'front', { to: 70 });
      await fin(a);
      // llena de notas amables la furgoneta de Famadesa
      for (let i = 0; i < 6; i++) {
        const n = prop(ART.posit, G.x - 6, arriba(G) + 4);
        await moveTo(n, van.x + 3 + (i % 3) * 5, van.y + 2 + Math.floor(i / 3) * 3, 260, 6);
      }
      drop(p);
      // el conductor (que no es Manolo) se emociona dentro de la cabina
      const cab = { x: van.x + 20, y: van.y + 3 };
      await wait(400);
      for (let i = 0; i < 4; i++) later(i * 300, () => emit('drop', cab.x, cab.y, { vx: -3, vy: -4 }));
      for (let i = 0; i < 3; i++) later(200 + i * 330, () => emit('heart', cab.x, cab.y - 2));
      di('SNIF', cab, { color: 'W', dy: -4, life: 1200 });
      await wait(1700);
    },
    async 'posit@rhyhorn'() {
      const { a, p } = await ponerle(ART.posit, 'face', { dy: -2 });
      await fin(a);
      // se pone bizco para leerlo. Lo lee unas cuarenta veces
      for (let i = 0; i < 4; i++) { shake(G, 300, 1); di(i < 3 ? 'CENA' : '40', G, { color: 'y', life: 600, rise: 3 }); await wait(500); }
      di('?', G, { color: 'W' });
      await wait(900);
    },
    async 'posit@rhydon'() {
      const roca = enSuelo(ARTX.roca, 40);
      const { a, p } = await trae(ARTX.positChistorra, { to: 28 });
      a.dir = DIR.right;
      await moveTo(p, roca.x + 1, roca.y - 4, 400, 6);
      emit('spark', roca.x + 4, roca.y - 4);
      await wait(400);
      // ha dibujado una chistorra en vez de un «1»; a Rhydon le parece bien igual
      di('1?', p, { color: 'y', dx: 3, dy: -2 });
      await wait(800);
      await react(1500);
      await fin(a);
    },

    // ===== la campanilla =====
    async campanilla() {
      const { a, p } = await ponerle(ART.campanilla, 'front');
      await fin(a);
      for (let i = 0; i < 4; i++) { p.dx = i % 2 ? 1 : -1; di('DING', p, { color: 'y', dx: 2, life: 800 }); await wait(450); }
      await react(1400);
    },
    async 'campanilla@exeggcute'() {
      const { a, p } = await ponerle(ART.campanilla, 'head');
      leave(a);
      // las seis cabecitas la tocan por turnos hasta las tres…
      const clock = reloj(44, 5, 3);
      anochece(0.45, 600);
      for (let i = 0; i < 6; i++) { p.dx = -8 + (i % 6) * 3; di('DING', p, { color: 'y', dx: 2, life: 700, rise: 4 }); await wait(320); }
      clock.speed = 0;
      // …y Charizard acaba bailando la jota
      const ch = make(cs, -22);
      await walk(ch, 40, 50);
      anim(ch, 'Hop');
      for (let i = 0; i < 6; i++) { later(i * 300, () => { face(ch, i % 2 ? 'l' : 'r'); emit('note', ch.x, arriba(ch)); di('DING', p, { color: 'y', dx: 2, life: 500, rise: 3 }); }); }
      await wait(2000);
      idle(ch);
      await fin(ch);
    },
    async 'campanilla@kangaskhan'() {
      const { a, p } = await ponerle(ART.campanilla, 'front');
      await fin(a);
      // la cría la toca dos horas seguidas; Kangaskhan se duerme sentada, sonriendo
      const clock = reloj(44, 5, 2);
      const dings = every(300, 3600, i => di('DING', p, { color: 'y', dx: 2, life: 600, rise: 4 }));
      await wait(1200);
      anim(G, 'Sleep');
      zzz(G, 2400);
      corazones(G, 2, 800);
      await dings;
      clock.speed = 0;
    },
    async 'campanilla@rhyhorn'() {
      const { a, p } = await ponerle(ART.campanilla, 'front');
      await fin(a);
      const clock = reloj(44, 5, 1);
      for (let i = 0; i < 4; i++) { di('DING', p, { color: 'y', dx: 2, life: 700 }); emit('heart', G.x, arriba(G)); await wait(800); }
      clock.speed = 0;
    },
    async 'campanilla@weepinbell'() {
      const { a, p } = await ponerle(ART.campanilla, 'front');
      await fin(a);
      // tiene el mismo tono que él. Se miran. Ding
      di('DING', p, { color: 'y', dx: 2 }); await wait(500);
      di('DING', G, { color: 'y', dx: 4 }); await wait(700);
      face(G, 'd'); await wait(500); face(G, 'l');
      di('DING', { x: G.x - 4, y: arriba(G) - 8 }, { color: 'W', life: 1400 });
      chispas(G.x - 4, arriba(G), 3, 10, 6);
      await wait(1300);
    },
    async 'campanilla@victreebel'() {
      // se la cuelga de una hoja con el brazo muy estirado, sin acercar la cabeza
      const { a, p } = await trae(ART.campanilla, { to: GUEST_X - 44, speed: 22 });
      sudor(a);
      await ponA(p, G, 'front', { dy: -4 });
      await walk(a, 30, 50);
      a.dir = DIR.right;
      // ahora, cuando Victreebel se acerca, suena
      await walk(G, 70, 22);
      di('DING', p, { color: 'y', dx: 2 });
      await walk(a, -24, 60);
      await walk(G, GUEST_X, 30); face(G, 'l');
      await wait(300);
    },

    // ===== el hielo, para otros =====
    async 'hielo@electrode'() {
      tele();
      const { a, p } = await ponerle(ART.bolsahielo, 'head', { dy: 2 });
      shake(G, 3500, 1);
      // se derrite enseguida…
      await every(150, 1500, i => { const q = propPos(p); emit('drop', q.x + 2, q.y + 5, { vx: 0, vy: 0 }); emit('steam', q.x + 2, q.y); });
      p.art = ART.hielo3;
      await fin(a);
      // …pero aguanta el partido entero sin estallar
      for (let i = 0; i < 3; i++) { emit('spark', G.x - 6 + i * 6, arriba(G) + 4); await wait(400); }
      drop(p);
      di('FIN', { x: 14, y: FLOOR - 12 }, { color: 'y' });
      await react(1400);
    },
    async 'hielo@psyduck'() {
      const { a, p } = await ponerle(ART.bolsahielo, 'head', { dy: 3 });
      await fin(a);
      // sigue repasando con los ojos cerrados, cantando los artículos por lo bajo
      for (let i = 1; i <= 4; i++) { di(`ART ${i}`, G, { color: 'c', life: 800, rise: 3, dx: -4 + (i % 2) * 8 }); emit('note', G.x + 6, arriba(G)); emit('drop', propPos(p).x + 2, propPos(p).y + 5, { vx: 0, vy: 0 }); await wait(550); }
      await wait(500);
    },
    async 'hielo@magmar'() {
      const { a, p } = await dejar(ART.cubohielo, { to: 60 });
      const ch = make(cs, -22); walk(ch, 30, 50);
      await wait(500);
      // mete las manos: sale vapor por toda la cocina
      await every(60, 1400, () => emit('steam', p.x + Math.random() * 9, p.y - 1));
      for (let i = 0; i < 12; i++) later(i * 50, () => emit('smoke', p.x + Math.random() * 9, p.y - 4, { dir: Math.random() < 0.5 ? -1 : 1, color: 'W' }));
      p.art = ART.barreno;
      // Charizard se ríe tanto que se le escapa una llamarada
      await wait(300);
      face(ch, 'r');
      di('JA JA', ch, { color: 'y' }); shake(ch, 700, 1);
      await fuego(ch, 10);
      await wait(800);
      await fin(ch, a);
    },

    // ===== el micrófono =====
    async microfono() {
      const { a, p } = await ponerle(ART.microfono, 'front');
      await fin(a);
      notas(G, 6, 300);
      await react(2000);
    },
    async 'microfono@jigglypuff'() {
      const { a, p } = await ponerle(ART.microfono, 'front');
      a.dir = DIR.right;
      // canta una nana y Charizard ronca al segundo verso
      const song = every(380, 3600, i => emit('note', G.x - 3 + (i % 3) * 3, arriba(G)));
      await wait(1100);
      anim(a, 'Sleep');
      zzz(a, 2800, 450);
      await wait(600);
      // ella se infla… pero esta vez lo deja dormir
      vena(G, 900);
      await every(40, 500, i => { G.scale = 1 + Math.min(0.35, i * 0.03); });
      await wait(300);
      await every(40, 500, i => { G.scale = Math.max(1, 1.35 - i * 0.03); });
      G.scale = 1;
      corazones(G, 2);
      await song;
    },
    async 'microfono@meowth'() {
      const { a, p } = await ponerle(ART.microfono, 'front');
      await fin(a);
      // un mitin de una hora en el comedor
      const clock = reloj(44, 5, 1);
      for (let i = 0; i < 5; i++) { di(['CONVENIO', 'YA', 'BLA', 'HUELGA', 'YA'][i], G, { color: 'R', life: 800, rise: 4 }); shake(G, 200, 1); await wait(450); }
      clock.speed = 0;
      const ch = make(cs, -22);
      await walk(ch, 40, 50);
      anim(ch, 'Hop'); di('PLAS', ch, { color: 'y' });
      await wait(900);
      idle(ch);
      await fin(ch);
    },
    async 'microfono@lickitung'() {
      // Charizard de puntillas, con la cola tapada para que no crepite
      const { a, p } = await trae(ART.microfono, { to: GUEST_X - 34, speed: 16 });
      await ponA(p, G, 'front');
      await wait(400);
      di('PERFECTO', G, { color: 'p', life: 1500 });
      await agacha(G, 2, 400, 1);
      corazones(a, 2);
      await wait(700);
      await walk(a, -24, 18);
    },
    async 'microfono@haunter'() {
      const { a, p } = await ponerle(ART.microfono, 'front');
      a.dir = DIR.right;
      // tres chistes malos: Charizard se ríe de los tres
      for (let i = 0; i < 3; i++) {
        di('...', G, { color: 'v', life: 700, rise: 3 }); await wait(500);
        di('JA JA', a, { color: 'y', life: 700 }); shake(a, 400, 1); await wait(500);
      }
      // y los demás, del ruido que hace Charizard
      di('JE', { x: 30, y: 24 }, { color: 'W' }); di('JI', { x: 50, y: 18 }, { color: 'W' });
      await wait(1000);
      await fin(a);
    },

    // ===== el casco =====
    async casco() {
      const { a, p } = await ponerle(ART.casco, 'head', { dy: 2 });
      await fin(a);
      // tres golpecitos a la pared: «esto está torcido». Ya está contento
      await walk(G, 74, 30);
      for (let i = 0; i < 3; i++) { di('TOC', { x: 62, y: FLOOR - 20 }, { color: 'W', life: 600, rise: 3 }); emit('spark', 64, FLOOR - 14); await wait(400); }
      di('TORCIDO', G, { color: 'y', life: 1300 });
      await wait(700);
      await walk(G, GUEST_X, 30); face(G, 'l');
      await react(1200);
    },
    async 'casco@wartortle'() {
      espejo(42, { wall: true, y: 10, h: 22, w: 14, sc: 0.7 });
      const { a, p } = await ponerle(ART.casco, 'head', { dy: 3 });
      await fin(a);
      // saluda muy serio al espejo: las orejas peludas se le salen por los lados
      await walk(G, 60, 30);
      await agacha(G, 1, 600, 2);
      emit('spark', G.x - 6, arriba(G) + 2); emit('spark', G.x + 6, arriba(G) + 2);
      await wait(1200);
      s.espejo = null;
      await walk(G, GUEST_X, 30); face(G, 'l');
    },
    async 'casco@golem'() {
      torcido();
      const { a, p } = await ponerle(ART.casco, 'head', { dy: 2, to: GUEST_X - 32 });
      // le queda en lo alto como un sombrerito
      await fin(a);
      for (let i = 0; i < 3; i++) { di('TOC', { x: 54, y: 18 }, { color: 'W', life: 600, rise: 3 }); shake(G, 150, 1); await wait(450); }
      // y pone cara de sorpresa: sigue torcida
      di('!', G, { color: 'y', life: 1200 });
      await wait(1400);
    },
    async 'casco@diglett'() {
      const { a, p } = await ponerle(ART.casco, 'head', { dy: 3 });
      await fin(a);
      // asoma con él como un periscopio y hace guardia toda la noche
      await anochece(0.55, 700);
      luz({ on: G, at: 'head', r: 6, glow: '#FFE7A7' });
      const clock = reloj(44, 5, 3);
      for (let i = 0; i < 4; i++) { face(G, i % 2 ? 'l' : 'd'); await wait(500); }
      clock.speed = 0;
      face(G, 'l');
      await wait(600);
    },

    // ===== la regadera =====
    async regadera() {
      const { a, p } = await ponerle(ART.regadera, 'above', { dy: -4, dx: -4 });
      await every(70, 1500, () => { const q = propPos(p); emit('rain', q.x + 1 + Math.random() * 3, q.y + 6); });
      drop(p);
      // se estira de gusto y suelta un olor tan fuerte que Charizard estornuda una llama
      await every(40, 400, i => { G.scale = 1 + Math.min(0.15, i * 0.02); });
      humo(G, 6, { color: 'g', at: 'head', step: 150 });
      const ch = make(cs, -22); await walk(ch, 34, 50); face(ch, 'r');
      G.scale = 1;
      await wait(300);
      di('ACHIS', ch, { color: 'y' });
      await fuego(ch, 10);
      await react(1200);
      await fin(ch, a);
    },
    async 'regadera@bulbasaur'() {
      const { a, p } = await ponerle(ART.regadera, 'above', { dy: -2, dx: -4 });
      const rain = every(70, 2200, () => { const q = propPos(p); emit('rain', q.x + 1 + Math.random() * 3, q.y + 6); });
      // mira a los lados por si alguien lo ve. Nadie lo ve. Bueno, Charizard
      face(G, 'r'); await wait(500); face(G, 'l'); await wait(500);
      const ch = make(cs, -30); await walk(ch, 8, 30); face(ch, 'r');
      di('!', ch, { color: 'y' });
      await rain;
      drop(p);
      await wait(600);
      await fin(a, ch);
    },
    async 'regadera@venusaur'() {
      const { a, p } = await ponerle(ART.regadera, 'above', { dy: -2, dx: -8, to: GUEST_X - 40 });
      const rain = every(70, 1600, () => { const q = propPos(p); emit('rain', q.x + 1 + Math.random() * 3, q.y + 6); });
      await rain;
      drop(p);
      chispas(punto(G, 'head').x, arriba(G) + 4, 4, 14, 6);
      // Charizard se queda un rato oliéndola
      leave(a);
      const ch = make(cs, -22); await walk(ch, GUEST_X - 36, 40); face(ch, 'r');
      for (let i = 0; i < 3; i++) later(i * 400, () => emit('heart', ch.x + 4, arriba(ch)));
      await wait(1800);
      await fin(a, ch);
    },
    async 'regadera@parasect'() {
      const { a, p } = await ponerle(ART.regadera, 'above', { dy: -2, dx: -2 });
      await every(70, 1500, () => { const q = propPos(p); emit('rain', q.x + 1 + Math.random() * 3, q.y + 6); });
      drop(p);
      // la seta se pone tiesa y contenta; el bicho tiembla de frío, pero no dice nada
      chispas(punto(G, 'head').x, arriba(G) + 2, 4, 10, 4);
      shake(G, 1800, 1);
      await every(240, 1800, () => emit('snow', punto(G, 'feet').x + Math.random() * 8 - 4, caja(G).y1 - 10));
      await fin(a);
    },

    // ===== la pinza =====
    async pinza() {
      const { a, p } = await ponerle(ART.pinza, 'face', { dy: 1 });
      await fin(a);
      await react(1800);
    },
    async 'pinza@gloom'() {
      const stink = every(180, 4200, () => { const q = punto(G, 'head'); emit('smoke', q.x + Math.random() * 10 - 5, q.y + 4, { dir: Math.random() < 0.5 ? -1 : 1, color: 'g' }); });
      const { a, p } = await trae(ART.pinza, { to: 50 });
      await ponA(p, a, 'face', { dy: 2 });
      // Charizard se pone dos
      const ch = make(cs, -22);
      const p1 = carry(ART.pinza, ch), p2 = carry(ART.pinza, ch);
      await walk(ch, 26, 40); face(ch, 'r');
      Object.assign(p1, { on: ch, at: 'face', dx: -1 }); Object.assign(p2, { on: ch, at: 'face', dx: 3, dy: 2 });
      await wait(600);
      // Gloom, muy digna, dice que eso ya es exagerar
      vena(G, 1500);
      di('EXAGERAO', G, { color: 'p', life: 1600 });
      await stink;
      await fin(ch, a);
    },
    async 'pinza@slowbro'() {
      const { a, p } = await ponerle(ART.pinza, 'tail', { dy: -4 });
      await fin(a);
      // Shellder se la pone como un lazo y se mira en el agua (en el estanque, la suya; en un cuarto, un barreño).
      // Slowbro no se entera
      if (!s.outdoor) enSuelo(ART.barreno, 60);
      chispas(propPos(p).x + 2, propPos(p).y, 4, 6, 4);
      for (let i = 0; i < 3; i++) later(i * 400, () => emit('heart', propPos(p).x + 2, propPos(p).y - 2));
      await wait(1200);
      di('?', G, { color: 'W' });
      await wait(1200);
    },
    async 'pinza@gastly'() {
      const cort = prop(ARTX.cortina, 8, 8), cort2 = prop(ARTX.cortina, 27, 8);
      const { a, p } = await trae(ART.pinza, { to: 30 });
      a.dir = DIR.up;
      await moveTo(p, 18, 10, 300, 4);
      cort.x = 12; cort2.x = 23;
      await fin(a);
      // esa noche sopla el viento, pero Gastly amanece en su cuarto (un poco más estirado)
      await anochece(0.45, 500);
      const wind = every(80, 2200, () => emit('bird', 0, 10 + Math.random() * 40, { vx: 150, col: 'W', life: 700 }));
      await every(40, 2000, i => { G.scale = 1 + 0.12 * Math.sin(i / 3); G.x = GUEST_X + Math.round(2 * Math.sin(i / 2)); });
      await wind;
      G.scale = 1.12; G.x = GUEST_X;
      await anochece(0, 500);
      di('BUENOS DIAS', G, { color: 'v', life: 1400 });
      await wait(1200);
      G.scale = 1;
    },
    async 'pinza@vaporeon'() {
      s.outdoor = true;
      const { a, p } = await ponerle(ART.pinza, 'face', { dy: 1 });
      await fin(a);
      // se le queda la nariz roja, pero la vertical en el estanque le sale perfecta
      emit('spark', punto(G, 'face').x, punto(G, 'face').y);
      await brinca(G, 1, 16, 700);
      burst('drop', G.x, FLOOR - 4, 10, 8);
      await wait(300);
      di('10', G, { color: 'y', dx: -6 }); di('10', G, { color: 'y', dx: 6 });
      await react(1500);
    },

    // ===== la vela, encendida =====
    async 'vela@kadabra'() {
      const candle = enSuelo(ARTX.velaApagada, GUEST_X - 18);
      await anochece(0.5, 400);
      const { a } = await trae(null, { to: GUEST_X - 34 });
      await wait(300);
      candle.art = ART.vela; emit('spark', candle.x + 2, candle.y);
      luz({ prop: candle, r: 10, flick: true, glow: '#FFB347' });
      await fin(a);
      // le echa las cartas: la Torre, el Dragón y la Chistorra
      const cartas = [['LLL', 'LML', 'LML', 'LLL'], ['LLL', 'LRL', 'LRL', 'LLL'], ['LLL', 'LRL', 'LYL', 'LLL']];
      for (const [i, art] of cartas.entries()) { const cc = prop(art, G.x - 8, arriba(G) + 8); await moveTo(cc, 56 + i * 5, FLOOR - 6, 300, 6); luz({ x: 57 + i * 5, y: FLOOR - 3, r: 3 }); }
      await wait(300);
      di('BUENA', G, { color: 'y', life: 1400 });
      await wait(1400);
    },
    async 'vela@cubone'() {
      const candle = enSuelo(ARTX.velaApagada, GUEST_X - 18);
      await anochece(0.55, 400);
      const { a } = await trae(null, { to: GUEST_X - 34 });
      await wait(300);
      candle.art = ART.vela;
      luz({ prop: candle, r: 9, flick: true, glow: '#FFB347' });
      await fin(a);
      // le recita un verso a su madre, bajito
      for (let i = 0; i < 3; i++) later(i * 500, () => emit('note', G.x - 2, arriba(G)));
      await wait(800);
      // Charizard baja la llama de la cola, para no hacerle sombra
      const ch = make(cs, -22); await walk(ch, 30, 30); face(ch, 'r');
      const tl = luz({ on: ch, at: 'tail', r: 8, glow: '#FFB347' });
      await wait(500);
      await every(100, 800, i => { tl.r = Math.max(2, 8 - i); });
      di('SHH', ch, { color: 'W' });
      await wait(1500);
    },
    async 'vela@nidoran'() {
      const candle = enSuelo(ARTX.velaApagada, GUEST_X - 22);
      await anochece(0.55, 400);
      const { a } = await trae(null, { to: GUEST_X - 38 });
      await wait(300);
      candle.art = ART.vela;
      luz({ prop: candle, r: 10, flick: true, glow: '#FFB347' });
      await fin(a);
      // se miran, se ponen rojos y se dan un beso a la vez
      G.tint = { color: C.R, alpha: 0.25 };
      await wait(500);
      corazones(G, 5, 280);
      const ch = make(cs, -22); await walk(ch, 26, 30); face(ch, 'r');
      const tl = luz({ on: ch, at: 'tail', r: 8, glow: '#FFB347' });
      await every(100, 700, i => { tl.r = Math.max(2, 8 - i); });
      await wait(1500);
      G.tint = null;
    },

    // ===== los tapones =====
    async tapones() {
      const { a, p } = await ponerle(ART.tapones, 'head', { dy: 4 });
      await fin(a);
      anim(G, 'Sleep');
      zzz(G, 2400);
      await anochece(0.35, 600);
      await wait(1800);
    },
    async 'tapones@psyduck'() {
      const { a, p } = await ponerle(ART.tapones, 'head', { dy: 4 });
      a.dir = DIR.right;
      await wait(300);
      // repasa el tema 52 tan alto que lo oye toda la posada
      for (let i = 0; i < 4; i++) { di(i % 2 ? 'ART 3' : 'TEMA 52', G, { color: 'y', life: 700, rise: 5 }); shake(a, 300, 1); await wait(450); }
      sudor(a);
      await wait(500);
      await fin(a);
    },
    async 'tapones@chansey'() {
      const { a, p } = await ponerle(ART.tapones, 'head', { dy: 4 });
      await fin(a);
      // se duerme de pie…
      zzz(G, 1800);
      await anochece(0.35, 500);
      await wait(1600);
      // …alguien tose y se despierta igual. Es el oficio
      di('COF', { x: 30, y: 30 }, { color: 'W' });
      await wait(300);
      di('!', G, { color: 'y' }); brinca(G, 1, 3, 250);
      s.dark = 0;
      await wait(1200);
    },
    async 'tapones@zubat'() {
      const copas = [50, 58].map(x => enSuelo(ART.copa, x));
      const { a, p } = await ponerle(ART.tapones, 'head', { dy: 3 });
      await fin(a);
      await anochece(0.5, 600);
      // sueña con una fiesta: nadie se entera, salvo las copas, que tintinean
      zzz(G, 3000);
      await every(300, 2800, i => { emit('note', G.x - 3 + (i % 3) * 3, arriba(G) - 2); if (i % 2) { copas.forEach(c => { c.x += i % 4 === 1 ? 1 : -1; }); di('CLIN', copas[i % 2], { color: 'c', dx: 2, life: 500, rise: 3 }); } });
    },
    async 'tapones@weepinbell'() {
      const { a, p } = await ponerle(ART.tapones, 'head', { dy: 3 });
      await fin(a);
      // toca un «ding» y sonríe: por fin no se oye a sí mismo
      di('DING', G, { color: 'S', life: 900 });
      await wait(800);
      await react(1600);
    },

    // ===== la lupa =====
    async lupa() {
      const { a, p } = await ponerle(ART.lupa, 'front');
      await fin(a);
      for (let i = 0; i < 3; i++) { p.dy = i % 2 ? -2 : 2; await wait(400); }
      emit('spark', propPos(p).x + 2, propPos(p).y + 2);
      di('!', G, { color: 'y' });
      await react(1400);
    },
    async 'lupa@arcanine'() {
      const puerta = prop(ART.puerta, 10, FLOOR - 18);
      const { a, p } = await ponerle(ART.lupa, 'front');
      await fin(a);
      // examina la puerta de la despensa, encuentra una miga de chistorra… y se la come
      await walk(G, 36, 40);
      const miga = enSuelo(['RR', 'RY'], 24);
      for (let i = 0; i < 3; i++) { p.dy = i % 2 ? -3 : 3; await wait(350); }
      di('!', G, { color: 'y' });
      await wait(400);
      anim(G, 'Eat'); drop(miga); await wait(700); idle(G);
      di('PRUEBA', G, { color: 'R', life: 900 }); later(500, () => di('DESTRUIDA', G, { color: 'R', life: 1000 }));
      await wait(1400);
      await walk(G, GUEST_X, 40); face(G, 'l');
    },
    async 'lupa@geodude'() {
      const cuadro = torcido();
      const { a, p } = await ponerle(ART.lupa, 'front');
      await fin(a);
      // mira la pared un buen rato: «Torcida. En una semana, la arreglo»
      await walk(G, 66, 30);
      for (let i = 0; i < 3; i++) { p.dy = -4 - i * 2; await wait(400); }
      di('TORCIDA', G, { color: 'y', life: 1400 });
      await wait(1200);
      di('1 SEMANA', G, { color: 'W', life: 1300 });
      await wait(900);
      await walk(G, GUEST_X, 30); face(G, 'l');
    },
    async 'lupa@paras'() {
      const plato = enSuelo(ARTX.plato, GUEST_X - 16);
      const { a, p } = await ponerle(ART.lupa, 'front');
      await fin(a);
      // examina la seta del plato, frunce el ceño… y dice que no está mal
      p.dy = 4;
      vena(G, 1200);
      await wait(1400);
      di('NO ESTA MAL', G, { color: 'y', life: 1500 });
      corazones(G, 1);
      await wait(1500);
    },

    // ===== la taza =====
    async taza() {
      const { a, p } = await dejar(ART.tazaLlena, { to: 60 });
      await fin(a);
      // la mira, la toca con un dedo… y se duerme abrazado a la mesilla
      await wait(400);
      emit('spark', p.x + 2, p.y);
      await wait(500);
      anim(G, 'Sleep');
      zzz(G, 2600);
      corazones(G, 1);
      await wait(2400);
    },
    async 'taza@slowpoke'() {
      const { a, p } = await dejar(ART.tazaLlena, { to: 60 });
      await fin(a);
      const clock = reloj(44, 5, 2);
      // la mira tanto rato que, cuando bebe, ya está templada
      await vapor(p, 2000);
      clock.speed = 0;
      anim(G, 'Eat'); await wait(800); idle(G);
      di('PERFECTA', G, { color: 'p', life: 1500 });
      await wait(1300);
    },
    async 'taza@mewtwo'() {
      const { a, p } = await dejar(ART.taza, { to: 60 });
      await fin(a);
      // la llena de té con la mente, sin derramar una gota
      const halo = luz({ prop: p, r: 6, glow: '#9F6FCF' });
      s.dark = 0.15;
      await every(70, 1400, () => { emit('drop', p.x + 2, p.y - 10, { vx: 0, vy: 6 }); emit('spark', p.x + 2 + Math.random() * 3, p.y - 2); });
      p.art = ART.tazaLlena;
      apagaLuz(halo); s.dark = 0;
      // y luego se queda mirándola como si fuera un enigma
      di('?', G, { color: 'v', life: 1600 });
      await wait(1800);
    },

    // ===== la rosa =====
    async rosa() {
      espejo(56);
      const { a, p } = await ponerle(ART.rosa, 'face', { dy: 2, to: 36 });
      await fin(a);
      // recita el lema entero delante del espejo y se aplaude con el humo
      for (let i = 0; i < 3; i++) { di('BLA', G, { color: 'v', life: 600, rise: 3 }); await wait(400); }
      humo(G, 6, { color: 'v', at: 'head', step: 120 });
      di('PLAS', G, { color: 'y' });
      await wait(1500);
      s.espejo = null;
    },
    async 'rosa@weezing'() {
      const { a, p } = await ponerle(ART.rosa, 'head', { dx: -8, dy: 4 });
      const p2 = carry(ART.rosa, a);
      await ponA(p2, G, 'head', { dx: 6, dy: 2 });
      await fin(a);
      // siguen teniendo la misma cara, pero se les ve más elegantes
      chispas(G.x, arriba(G) + 4, 6, 20, 8);
      await react(1800);
    },
    async 'rosa@eevee'() {
      const ch = make(cs, -22);
      walk(ch, 30, 40);
      const { a, p } = await ponerle(ART.rosa, 'front', { to: 60 });
      // se la ofrece a Charizard, luego a Manolo y luego otra vez a Charizard
      for (const who of [ch, a, ch]) { await ponA(p, who, 'face', { dy: 2 }); emit('heart', who.x, arriba(who)); await wait(450); }
      // al final se la pone ella detrás de la oreja
      await ponA(p, G, 'head', { dx: 4, dy: 3 });
      corazones(G, 3);
      await wait(1300);
      await fin(a, ch);
    },

    // ===== la tila =====
    async tila() {
      shake(G, 6000, 1);
      const ch = make(cs, -22); walk(ch, 30, 40);
      const { a, p } = await dejar(ART.termo, { to: 60 });
      await wait(400);
      anim(G, 'Eat'); await wait(600); idle(G);
      // da un sorbito y deja de vibrar
      jitter.delete(G);
      corazones(G, 2);
      await wait(400);
      // Charizard, por si acaso, se aleja dos pasos igual
      face(ch, 'r');
      await walk(ch, 24, 20); await walk(ch, 18, 20); face(ch, 'r');
      sudor(ch);
      await wait(800);
      drop(p);
      await fin(a, ch);
    },
    async 'tila@starmie'() {
      await anochece(0.5, 400);
      const l = luz({ on: G, at: 'body', r: 12, glow: '#FFF7B7' });
      const { a, p } = await dejar(ART.tila, { to: 60 });
      vapor(p, 1800);
      await fin(a);
      for (let i = 0; i < 3; i++) { anim(G, 'Eat'); await wait(350); idle(G); await wait(200); }
      // por primera vez en semanas, el núcleo se le apaga un rato
      await every(100, 1200, i => { l.r = Math.max(0, 12 - i); });
      l.off = true;
      zzz(G, 1800);
      await wait(1800);
    },
    async 'tila@jolteon'() {
      const { a, p } = await dejar(ART.tila, { to: 60 });
      await wait(300);
      // se la bebe de golpe, se quema la lengua y suelta un chispazo
      anim(G, 'Eat'); await wait(400); drop(p); idle(G);
      di('AY', G, { color: 'R' });
      for (let i = 0; i < 10; i++) emit('fw', G.x, arriba(G) + 6, { ang: Math.random() * Math.PI * 2, sp: 12, col: 'y' });
      fogonazo(300); shake(a, 500, 1);
      await wait(900);
      // luego, eso sí, se queda tranquilo
      corazones(G, 2, 500);
      await wait(1200);
      await fin(a);
    },

    // ===== la carpeta =====
    async carpeta() {
      const { a, p } = await dejar(ART.carpeta, { to: 60 });
      await fin(a);
      const hoja = prop(ART.hojaTema, G.x - 8, arriba(G) + 4);
      await moveTo(hoja, p.x, p.y - 1, 500, 8);
      drop(hoja);
      emit('spark', p.x + 3, p.y);
      await react(1600);
    },
    async 'carpeta@golduck'() {
      const { a, p } = await dejar(ART.carpeta, { to: 60 });
      await fin(a);
      // «Tema 91: dormir también entra»
      const hoja = prop(ART.hojaTema, G.x - 8, arriba(G) + 4);
      di('TEMA 91', G, { color: 'c', life: 1300 });
      await wait(700);
      await moveTo(hoja, p.x, p.y - 1, 700, 6);
      drop(hoja);
      corazones(G, 3, 400);
      await wait(1500);
    },
    async 'carpeta@kakuna'() {
      const { a, p } = await dejar(ART.carpeta, { to: 60 });
      await fin(a);
      // la ordena por fechas, por colores y por orden alfabético… sin moverse ni un milímetro
      const hojas = ['W', 'y', 'p', 'c'].map((col, i) => prop(recolor(ART.folio, { W: col }), 20 + i * 12, 20 + (i % 2) * 6));
      for (const [i, h] of hojas.entries()) { await moveTo(h, p.x + 1, p.y - 2 - i, 320, 8); }
      hojas.forEach(drop);
      di('ABC', p, { color: 'y', dx: 3 });
      await wait(1400);
    },
    async 'carpeta@hypno'() {
      const { a, p } = await dejar(ART.carpeta, { to: 60 });
      await fin(a);
      await anochece(0.5, 500);
      // la llena esa misma noche: «Sueños del Pino»
      await every(200, 2200, i => { const z = prop(ART.zzz, 10 + (i * 23) % 50, 10 + (i * 7) % 20); moveTo(z, p.x + 2, p.y, 600, 4).then(() => drop(z)); });
      await anochece(0, 500);
      di('SUEÑOS', p, { color: 'v', dx: 3, life: 1500 });
      const ma = make(ms, -20); await walk(ma, 34, 40); face(ma, 'r');
      sudor(ma);
      await wait(1200);
      await fin(ma);
    },

    // ===== la chistera =====
    async chistera() {
      const { a, p } = await ponerle(ART.chistera, 'head', { dy: 4 });
      await fin(a);
      // le aplasta la cresta. Se la deja puesta igual
      shake(G, 400, 1);
      di('AY', G, { color: 'W' });
      await wait(800);
      await react(1600);
    },
    async 'chistera@fearow'() {
      const { a, p } = await ponerle(ART.chistera, 'head', { dy: 2 });
      const p2 = carry(ART.chistera, a);
      await ponA(p2, G, 'head', { dy: -3 });
      await fin(a);
      // parece un semáforo de etiqueta
      await wait(300);
      chispas(G.x, arriba(G) - 6, 4, 8, 8);
      await react(1800);
    },
    async 'chistera@ditto'() {
      const ks = await loadSprite('0064', ['Idle', 'Walk']);
      const { a, p } = await ponerle(ART.chistera, 'head', { dy: 3 });
      await fin(a);
      // se convierte en Kadabra…
      for (let i = 0; i < 6; i++) emit('spark', G.x - 8 + Math.random() * 16, arriba(G) + Math.random() * 16);
      fogonazo(300);
      G.sprite = ks; drop(p);
      await wait(500);
      // …y dobla una cuchara. La cuchara, de la impresión, se convierte en Ditto
      const sp = prop(ART.cuchara, GUEST_X - 22, FLOOR - 16);
      await wait(400);
      sp.art = ART.cucharaDoblada;
      await wait(600);
      emit('spark', sp.x + 2, sp.y + 2);
      sp.art = ARTX.blob; sp.y = FLOOR - 5;
      di('!', { x: sp.x + 3, y: sp.y - 4 }, { color: 'v' });
      await wait(1500);
    },
    // ===== la peluca =====
    async peluca() {
      const { a, p } = await ponerle(ART.peluca, 'head', { dy: 4 });
      a.dir = DIR.right;
      await wait(300);
      // se convierte en Manolo con melena…
      for (let i = 0; i < 6; i++) emit('spark', G.x - 8 + Math.random() * 16, arriba(G) + Math.random() * 16);
      fogonazo(300);
      G.sprite = ms;
      p.dy = 5;
      await wait(800);
      // …y Manolo se queda un buen rato mirándose, nostálgico
      for (let i = 0; i < 3; i++) later(i * 500, () => emit('heart', a.x, arriba(a)));
      lagrimas(a, 2, 600);
      await wait(2200);
      await fin(a);
    },

    // ===== el gorro =====
    async gorro() {
      const { a, p } = await ponerle(ART.gorro, 'head', { dy: 3 });
      a.dir = DIR.right;
      await wait(300);
      // un chiste de gorros: nadie se ríe. Él sí, mucho
      di('JE', G, { color: 'W' }); await wait(700);
      di('...', a, { color: 'G' });
      await wait(500);
      di('JA JA', G, { color: 'y' }); brinca(G, 3, 3, 250);
      await wait(1100);
      await fin(a);
    },
    async 'gorro@magmar'() {
      const { a, p } = await ponerle(ART.gorro, 'head', { dy: 3 });
      await fin(a);
      // se le chamusca la punta en un segundo… pero se lo deja puesto, muy serio
      await wait(300);
      p.art = ['.LDDL..', 'LWWWDWL', 'LWWWWWL', '.LWWWL.', 'LLLLLLL', 'LWWWWWL', 'LLLLLLL'];
      for (let i = 0; i < 6; i++) later(i * 80, () => { const q = propPos(p); emit('flame', q.x + 3, q.y, { vx: 0, vy: -6 }); });
      vapor(p, 1600, 'S');
      await wait(1500);
      di('...', G, { color: 'W' });
      await wait(900);
    },
    async 'gorro@charmeleon'() {
      const { a, p } = await ponerle(ART.gorro, 'head', { dy: 3 });
      await wait(300);
      // se lo quita, refunfuña…
      await moveTo(p, GUEST_X - 18, FLOOR - 7, 300, 4);
      humo(G, 3, { step: 200 });
      await fin(a);
      // …y, cuando cree que nadie lo mira, se lo vuelve a poner
      face(G, 'r'); await wait(500); face(G, 'l'); await wait(300);
      await ponA(p, G, 'head', { dy: 3 });
      corazones(G, 2);
      await wait(1200);
    },

    // ===== el paraguas =====
    async paraguas() {
      // la llama de la cola deja de temblarle
      const flick = every(120, 1600, () => { const q = punto(G, 'tail'); emit('flame', q.x, q.y - 2, { vx: (Math.random() - 0.5) * 8, vy: -4 }); });
      const { a, p } = await ponerle(ART.paraguas, 'above', { dy: 2 });
      await flick;
      emit('spark', punto(G, 'tail').x, punto(G, 'tail').y - 4);
      corazones(G, 3, 400);
      await wait(1800);
      await fin(a);
    },
    async 'paraguas@charmeleon'() {

      const { a, p } = await dejar(ART.paraguas, { to: 60 });
      await fin(a);
      // Charmeleon gruñe… pero la cola le brilla de gusto y lo delata
      humo(G, 3, { step: 200 });
      di('GRR', G, { color: 'R' });
      await wait(800);
      await anochece(0.3, 300);
      const l = luz({ on: G, at: 'tail', r: 4, glow: '#FFB347' });
      await every(80, 800, i => { l.r = 4 + i; });
      chispas(punto(G, 'tail').x, punto(G, 'tail').y, 4, 8, 6);
      await wait(1200);
    },
    async 'paraguas@dragonair'() {
      s.outdoor = true;
      const { a, p } = await ponerle(ART.paraguas, 'above', { dy: 4 });
      await fin(a);
      // debajo llueve un poquito
      await every(60, 1400, () => { const q = propPos(p); emit('rain', q.x + 1 + Math.random() * 7, q.y + 5); });
      // lo cierra muy deprisa y disimula
      await moveTo(p, GUEST_X - 16, FLOOR - 12, 200, 2);
      p.art = ['.L.', 'LRL', 'LRL', 'LRL', '.L.', '.L.', '.L.', 'L..'];
      face(G, 'u'); await wait(400); face(G, 'l');
      di('...', G, { color: 'c' });
      await wait(1200);
    },

    // ===== el talonario =====
    async talonario() {
      const { a, p } = await ponerle(ART.libreta, 'front');
      await fin(a);
      // la estrena multando a una mosca. Le desea buen día
      emit('fly', 50, 26);
      await wait(1000);
      const m = prop(ART.multa, punto(G, 'front').x, punto(G, 'front').y);
      await moveTo(m, 48, 24, 400, 6);
      di('BUEN DIA', G, { color: 'y', life: 1500 });
      await wait(1000);
      drop(m);
      await wait(400);
    },
    async 'talonario@kakuna'() {
      const { a, p } = await dejar(ART.libreta, { to: 60 });
      const p2 = carry(ART.libreta, a), p3 = carry(ART.libreta, a);
      await moveTo(p2, p.x, p.y - 6, 300, 4); await moveTo(p3, p.x, p.y - 12, 300, 4);
      await fin(a);
      // las sella sin mover nada. Nadie sabe cómo
      for (const q of [p, p2, p3]) { await wait(450); emit('spark', q.x + 2, q.y + 2); di('PAM', q, { color: 'R', dx: 2, life: 600, rise: 3 }); q.art = recolor(ART.libreta, { W: 'R' }); }
      await wait(1200);
    },
    async 'talonario@beedrill'() {
      const sillas = [prop(ARTX.silla, 26, FLOOR - 6), prop(ARTX.silla, 44, FLOOR - 6)];
      const { a, p } = await trae(ART.libreta, { to: 40 });
      // le lanza el talonario: lo caza al vuelo…
      await ponA(p, G, 'front', { ms: 300, height: 14 });
      await fin(a);
      // …y multa a dos sillas antes de que nadie parpadee
      for (const si of sillas) { const m = prop(ART.multa, punto(G, 'front').x, punto(G, 'front').y); await moveTo(m, si.x, si.y - 4, 180, 4); emit('spark', si.x + 2, si.y - 2); }
      di('ZAS', G, { color: 'y' });
      await wait(1400);
    },

    // ===== el balón =====
    async balon() {
      const { a, p } = await trae(ART.balon, { to: 56 });
      face(a, 'r');
      // lo bota tres veces; Voltorb se tapa los ojos en cada bote, por empatía
      await moveTo(p, 62, FLOOR - 7, 200, 0);
      for (let i = 0; i < 3; i++) {
        await moveTo(p, 62, FLOOR - 20, 220, 0); await moveTo(p, 62, FLOOR - 7, 220, 0);
        di('BOT', p, { color: 'W', life: 500, rise: 3 }); shake(G, 300, 1); face(G, 'u'); later(300, () => face(G, 'l'));
      }
      await wait(500);
      await ponA(p, a, 'above');
      corazones(G, 2);
      await wait(900);
      await fin(a);
    },
    async 'balon@growlithe'() {
      s.outdoor = s.prado = true;
      const { a, p } = await trae(ART.balon, { to: 30 });
      face(a, 'r');
      for (let i = 0; i < 3; i++) {
        // Charizard lo lanza por el prado y Growlithe lo trae
        await moveTo(p, 140, FLOOR - 12, 500, 16);
        await walk(G, 150, 90);
        p.on = G; p.at = 'face'; p.dx = -2; p.dy = 0;
        await walk(G, 44, 90);
        await moveTo(p, a.x + 2, arriba(a) - 8, 200, 4);
        Object.assign(p, { on: a, at: 'above', dx: 0, dy: 0 });
        di(String([1, 2, 40][i]), G, { color: 'y' });
      }
      // a la cuarenta y una, Charizard se hace el dormido
      anim(a, 'Sleep');
      zzz(a, 1800, 500);
      await wait(400);
      di('?', G, { color: 'W' });
      await wait(1600);
      idle(a);
    },

    // ===== el extintor =====
    async extintor() {
      const ch = make(cs, -22); walk(ch, 30, 40);
      const { a, p } = await dejar(ART.extintor, { to: 50, x: GUEST_X - 16 });
      a.dir = DIR.right; leave(a);
      await wait(400);
      // le lee las instrucciones en voz alta a Charizard, muy serio, dos veces
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 3; i++) { di(['PASO 1', 'PASO 2', 'PASO 3'][i], G, { color: 'W', life: 700, rise: 3 }); await wait(420); }
        sudor(ch);
      }
      face(ch, 'r');
      await agacha(ch, 1, 500, 2);
      await fin(ch);
    },
    async 'extintor@blastoise'() {
      const { a, p } = await dejar(ART.extintor, { to: 50, x: GUEST_X - 18 });
      await fin(a);
      // lo revisa, lo sacude…
      await every(80, 800, i => { p.x += i % 2 ? 1 : -1; });
      for (let i = 0; i < 5; i++) emit('smoke', p.x + 2, p.y, { dir: 1, color: 'W' });
      await wait(300);
      // …y le pone una pegatina: «Revisado. Con dragón al lado»
      p.art = ART.extintorPegatina;
      emit('spark', p.x + 2, p.y + 4);
      di('REVISADO', p, { color: 'y', dx: 3, life: 1500 });
      await wait(1500);
    },

    // ===== el perfume =====
    async perfume() {
      const stink = every(200, 4200, () => { const q = punto(G, 'head'); emit('smoke', q.x + Math.random() * 10 - 5, q.y + 4, { dir: -1, color: 'g' }); });
      const { a, p } = await dejar(recolor(ART.perfume, { P: 'W' }), { to: 58, x: GUEST_X - 16 });
      // Gloom lo llena…
      await every(120, 900, () => emit('smoke', p.x + 3, p.y - 2, { dir: -1, color: 'g' }));
      p.art = recolor(ART.perfume, { P: 'g' });
      // …y Manolo lo tapa muy deprisa
      await moveTo(p, a.x - 3, arriba(a) - 8, 200, 4); p.on = a; p.at = null;
      sudor(a);
      await wait(400);
      // aun así, al pasillo le llora un poco la pared
      await every(160, 1400, () => emit('drop', 6 + Math.random() * 40, 4, { vx: 0, vy: 0 }));
      await stink;
      await fin(a);
    },
    async 'perfume@vileplume'() {
      const { a, p } = await ponerle(ART.perfume, 'head', { dy: 2 });
      await fin(a);
      // se perfuma debajo de la pamela y el comedor entero huele a jardín
      await every(90, 1400, () => emit('confetti', 20 + Math.random() * 90, 6 + Math.random() * 8, { col: ['p', 'P', 'g', 'y'][Math.floor(Math.random() * 4)] }));
      drop(p);
      const ch = make(cs, -22); await walk(ch, 30, 50); face(ch, 'r');
      di('ACHIS', ch, { color: 'y' });
      await fuego(ch, 10);
      await wait(800);
      await fin(ch);
    },

    // ===== el abanico =====
    async abanico() {
      const { a, p } = await ponerle(ART.abanico, 'face', { dy: 2 });
      await fin(a);
      // lo abre de golpe, se tapa media cara y dice «gracias» como quien saluda a un estadio
      fogonazo(200);
      chispas(punto(G, 'face').x, punto(G, 'face').y, 4, 8, 6);
      await wait(400);
      di('GRACIAS', G, { color: 'R', life: 1600 });
      notas(G, 4, 300);
      await agacha(G, 1, 700, 1);
      await react(1200);
    },
    async 'abanico@ninetales'() {
      const { a, p } = await ponerle(ART.abanico, 'front', { to: GUEST_X - 34 });
      a.dir = DIR.right;
      const pipe = carry(ART.cachimba, a); Object.assign(pipe, { at: 'face', dx: 4, dy: 2 });
      const puff = every(260, 1600, () => { const q = propPos(pipe); emit('smoke', q.x + 4, q.y - 1, { dir: 1 }); });
      // se abanica con elegancia y, de paso, le apaga la cachimbita a Manolo
      await every(150, 1600, i => { p.dy = i % 2 ? -2 : 0; if (i > 5) emit('bird', punto(G, 'front').x - 4, propPos(pipe).y - 2 + (i % 3) * 3, { vx: -60, col: 'W', life: 500 }); });
      await puff;
      emit('smoke', propPos(pipe).x + 2, propPos(pipe).y, { dir: -1 });
      di('?', a, { color: 'W' });
      await wait(500);
      // pide perdón con mucha clase
      await agacha(G, 1, 700, 2);
      di('PARDON', G, { color: 'p' });
      await wait(1200);
      drop(pipe);
      await fin(a);
    },

    // ===== el mando =====
    async mando() {
      tele();
      const { a, p } = await ponerle(ART.mando, 'head', { dx: -8, dy: 2 });
      await fin(a);
      // se lo pasan de pico en pico durante una hora… y al final no ven nada
      const clock = reloj(44, 5, 2);
      for (let i = 0; i < 6; i++) { p.dx = [-8, 0, 8, 0][i % 4]; emit('spark', propPos(p).x + 3, propPos(p).y); await wait(330); }
      clock.speed = 0;
      di('DEBATE', G, { color: 'y', life: 1300 });
      await react(1300);
    },
    async 'mando@voltorb'() {
      const tv = tele();
      const { a, p } = await ponerle(ART.mando, 'front');
      await fin(a);
      shake(G, 2400, 1);
      for (let i = 0; i < 6; i++) { emit('spark', G.x - 6 + Math.random() * 12, arriba(G) + 4 + Math.random() * 8); await wait(250); }
      // a falta de un minuto, alguien mete un triple…
      di('+3', tv, { color: 'y', dx: 6, life: 1100 });
      await wait(500);
      // …y solo explota un poquito
      di('POF', G, { color: 'W' });
      for (let i = 0; i < 6; i++) emit('smoke', G.x - 4 + Math.random() * 8, arriba(G) + 6, { dir: Math.random() < 0.5 ? -1 : 1 });
      fogonazo(250);
      await wait(1300);
    },

    // ===== el cronómetro =====
    async cronometro() {
      // Charizard le trae el cronómetro y se quedan a jugar
      const { a, p } = await dejar(ART.cronometro, { to: 52, sprite: cs });
      face(a, 'r');
      // lo pone en la mesa y lo mira cada medio minuto; Charizard pierde el turno por pensar
      for (let i = 0; i < 4; i++) { face(G, 'd'); emit('spark', p.x + 3, p.y); await wait(350); face(G, 'l'); await wait(350); }
      di('?', a, { color: 'W' }); sudor(a);
      di('TURNO', G, { color: 'y', life: 1200 });
      await wait(1200);
      await fin(a);
    },
    async 'cronometro@jolteon'() {
      const { a, p } = await ponerle(ART.cronometro, 'front');
      face(a, 'r');
      // lo cronometra todo… y lo que tarda Charizard en dormirse: tres segundos
      for (const t of ['1', '2', '3']) { di(t, p, { color: 'y', dx: 3, life: 600 }); await wait(450); }
      anim(a, 'Sleep'); zzz(a, 1800, 500);
      di('3 S', G, { color: 'y', life: 1400 });
      await wait(1800);
      idle(a);
      await fin(a);
    },

    // ===== la corona =====
    async corona() {
      const papel = recolor(ART.corona, { Y: 'S', R: 'W', B: 'G' });
      const { a, p } = await ponerle(isCh ? ART.corona : papel, 'head', { dy: 2 });
      // saluda a Charizard como a un caballero de la corte (o Charizard le hace la reverencia)
      const ch = isCh ? a : make(cs, -22);
      if (!isCh) await walk(ch, 40, 40);
      face(ch, 'r');
      await agacha(G, 2, 500, 2);
      await agacha(ch, 1, 600, 2);
      chispas(punto(G, 'head').x, arriba(G), 4, 10, 6);
      if (/pasea/.test(pide.hecho)) { await walk(G, 70, 30); await walk(G, GUEST_X, 30); face(G, 'l'); }
      await react(1200);
      await fin(ch, isCh ? null : a);
    },

    // ===== la tirita =====
    async tirita() {
      // Charizard se la pone con muchísimo cuidado, sin mirar la cola como a un plato
      const { a, p } = await trae(ART.tirita, { to: GUEST_X - 36, speed: 18 });
      sudor(a);
      await ponA(p, G, 'tail', { dy: -2 });
      await fin(a);
      // «ay», al día siguiente, por protocolo
      await anochece(0.45, 500);
      await anochece(0, 500);
      di('AY', G, { color: 'W', life: 1400 });
      await wait(1300);
    },

    // ===== el mosto =====
    async mosto() {
      const { a, p } = await dejar(ART.mosto2, { to: 60 });
      await fin(a);
      // brindan, chocan los cuernos sin querer y se ríen como tontos
      const c1 = prop(ART.copa, G.x - 14, arriba(G) + 6), c2 = prop(ART.copa, G.x + 6, arriba(G) + 6);
      await Promise.all([moveTo(c1, G.x - 5, arriba(G) + 4, 300, 3), moveTo(c2, G.x - 1, arriba(G) + 4, 300, 3)]);
      di('CLIN', c1, { color: 'y', dx: 4 });
      await wait(300);
      emit('spark', G.x, arriba(G)); di('TOC', G, { color: 'W', dy: -4 }); shake(G, 400, 1);
      await wait(500);
      drop(c1); drop(c2);
      di('JA JA', G, { color: 'y' });
      await react(1600);
    },

    // ===== el botellín =====
    async botellin() {
      const { a, p } = await dejar(ART.botellin, { to: 60 });
      await wait(300);
      // se lo bebe de un trago y pide cinco estrellas, muy serio
      anim(G, 'Eat'); await wait(500); drop(p); idle(G);
      estrellas(G, 5);
      await wait(500);
      sudor(a);
      await wait(1200);
      await fin(a);
    },
    async 'botellin@graveler'() {
      const cuadro = prop(['..LLLLLLL', '.LMLLLLML', 'LMLL.LLML', 'LLL...LLL'], 52, FLOOR - 4);
      const { a, p } = await ponerle(ART.botellin, 'body', { dx: 4 });
      await fin(a);
      // da dos golpecitos al cuadro de la bici y dice «esto está torcido»
      await walk(G, 74, 30);
      for (let i = 0; i < 2; i++) { di('TOC', cuadro, { color: 'W', dx: 4, life: 600, rise: 3 }); await wait(450); }
      di('TORCIDO', G, { color: 'y', life: 1300 });
      await wait(1300);
    },

    // ===== la pancarta =====
    async pancarta() {
      const sign = /HUELGA|Dugtrio/i.test(pide.hecho) ? cartel('HUELGA') : cartel('CONVENIO YA', { palos: true });
      if (/chimenea/.test(pide.hecho)) { s.outdoor = false; prop(ARTX.chimenea, 40, FLOOR - 9); }
      const { a, p } = await trae(ART.pancarta, { to: 54 });
      p.art = sign;
      await ponA(p, G, 'above', { dy: 2 });
      await fin(a);
      // se manifiesta él solo delante de la chimenea
      for (let i = 0; i < 2; i++) { await walk(G, 60, 30); di('YA', G, { color: 'R' }); await walk(G, GUEST_X, 30); }
      const ch = make(cs, -22); await walk(ch, 40, 50);
      face(ch, 'r'); anim(ch, 'Hop');
      di('MERIENDA?', ch, { color: 'y', life: 1300 });
      await wait(1300);
      idle(ch);
      await fin(ch);
    },
    async 'pancarta@dugtrio'() {
      const { a, p } = await trae(ART.pancarta, { to: 54 });
      p.art = cartel('HUELGA');
      await ponA(p, G, 'above', { dy: 2, dx: -16 });
      const p2 = prop(cartel('MINERA'), G.x, 0); await ponA(p2, G, 'above', { dy: 2, dx: 10 });
      // la de la derecha dibuja una seta
      const p3 = prop(['LLLLLLL', 'LWLLLWL', 'LLRRRLL', 'LWLWLWL', 'LWWLWWL', 'LLLLLLL'], G.x, 0); await ponA(p3, G, 'above', { dy: -8, dx: 10 });
      await fin(a);
      await react(1800);
    },

    // ===== el pañuelico =====
    async panuelico() {
      espejo(14, { wall: true, y: 8, h: 18, w: 18, sc: 0.8 });
      const { a, p } = await ponerle(ART.panuelico, 'neck', { dy: -2 });
      await fin(a);
      // se mira en la ventana y se reconoce a la primera: se le saltan las lágrimas
      await walk(G, 50, 30);
      di('!', G, { color: 'y' });
      await wait(500);
      lagrimas(G, 4, 300);
      corazones(G, 3, 400);
      await wait(1600);
      s.espejo = null;
    },
    async 'panuelico@exeggcute'() {
      const { a, p } = await ponerle(ART.panuelico, 'head', { dx: -6, dy: 3 });
      await fin(a);
      // las otras cinco dicen que era la suya; al final se lo turnan cada media hora
      vena(G, 1200); di('MIO', G, { color: 'R', dx: 8 });
      await wait(900);
      const clock = reloj(44, 5, 2);
      for (let i = 0; i < 5; i++) { p.dx = [-6, 0, 6, -3, 3][i]; emit('spark', propPos(p).x + 4, propPos(p).y); await wait(420); }
      clock.speed = 0;
      corazones(G, 2);
      await wait(1000);
    },

    // ===== la cesta =====
    async cesta() {
      const { a, p } = await dejar(ART.cesta, { to: 60 });
      await fin(a);
      // le pone un helecho en el fondo, mete los níscalos de uno en uno y les habla
      const h = prop(ART.helecho, G.x - 6, arriba(G) + 6); await moveTo(h, p.x + 1, p.y - 3, 400, 6); drop(h);
      for (let i = 0; i < 3; i++) {
        const n = prop(ART.niscalo, 40 + i * 8, FLOOR - 4);
        await moveTo(n, p.x + 1 + i, p.y - 3, 300, 8);
        di('HOLA', n, { color: 'o', dx: 2, life: 600, rise: 3 });
      }
      p.art = ['..LLLL..', '.LoLOL..', 'LLLLLLLL', 'LkbkbkbL', 'LbkbkbkL', '.LLLLLL.'];
      await react(1400);
    },
    async 'cesta@parasect'() {
      const { a, p } = await ponerle(ART.cesta, 'front', { dy: 4 });
      // se la da al bicho, en la pata, mirándole a los ojos
      a.dir = DIR.right;
      await wait(600);
      emit('heart', punto(G, 'front').x, punto(G, 'front').y - 8);
      shake(G, 300, 1);
      await wait(700);
      // la seta no dice nada
      di('...', { x: punto(G, 'head').x, y: arriba(G) - 6 }, { color: 'G', life: 1400 });
      await wait(1400);
      await fin(a);
    },

    // ===== la hucha =====
    async hucha() {
      const { a, p } = await dejar(ART.hucha, { to: 60, x: GUEST_X - 16 });
      const coin = carry(ART.moneda, a);
      await moveTo(coin, p.x + 1, p.y - 6, 300, 6);
      await moveTo(coin, p.x + 1, p.y - 1, 150, 0);
      drop(coin);
      di('CLIN', p, { color: 'y', dx: 3 });
      await wait(400);
      if (/tres cabezas/.test(pide.hecho)) {
        // las tres cabezas dan las gracias a la vez, cada una en un tono: suena a acorde
        for (const dx of [-8, 0, 8]) emit('note', G.x + dx - 2, arriba(G) + 2);
        di('GRACIAS', G, { color: 'y', dy: -6, life: 1500 });
        await wait(1600);
      } else {
        // Diglett se emociona y se hunde un palmo, de vergüenza y de alegría
        corazones(G, 3, 300);
        G.clip = [0, 0, W, FLOOR + 1];
        await every(60, 600, () => { G.y = Math.min(FLOOR + 6, G.y + 1); });
        await wait(1200);
        G.y = FLOOR; G.clip = null;
      }
      await fin(a);
    },

    // ===== la nariz de payaso =====
    async nariz() {
      const { a, p } = await ponerle(ART.nariz, 'body', { dy: -2 });
      await fin(a);
      // por fin se sabe dónde tiene la cara
      emit('spark', propPos(p).x + 2, propPos(p).y);
      di('!', G, { color: 'y' });
      await react(1800);
    },
    async 'nariz@haunter'() {
      const { a, p } = await ponerle(ART.nariz, 'face', { dy: 2 });
      await fin(a);
      // hace una reverencia. No aplaude nadie. Él sí, con las dos manos
      await agacha(G, 1, 700, 3);
      await wait(400);
      di('...', { x: 30, y: 24 }, { color: 'G' });
      await wait(700);
      for (let i = 0; i < 3; i++) { di('PLAS', G, { color: 'v', life: 500, rise: 3 }); await wait(350); }
      await wait(600);
    },

    // ===== el péndulo =====
    async pendulo() {
      const ch = make(cs, -22); walk(ch, 34, 40);
      const { a, p } = await ponerle(ART.pendulo, 'front', { dy: -2 });
      if (a !== ch) await fin(a);
      // lo prueba con Charizard, que se duerme a la segunda
      face(ch, 'r');
      const swing = [ART.pendulo, flipArt(ART.pendulo)];
      for (let i = 0; i < 4; i++) { p.art = swing[i % 2]; p.dx = i % 2 ? -3 : 0; await wait(400); if (i === 1) { anim(ch, 'Sleep'); zzz(ch, 2400, 500); } }
      di('2', G, { color: 'y' });
      await wait(1600);
      idle(ch);
      await fin(ch);
    },
    async 'pendulo@hypno'() {
      const clock = reloj(44, 5, 0);
      clock.speed = 0.02;
      const { a, p } = await ponerle(ART.pendulo, 'front', { dy: -2 });
      await fin(a);
      // lo balancea una vez y el reloj de pared, sin péndulo, se pone en hora él solo
      p.art = flipArt(ART.pendulo); p.dx = -3; await wait(500); p.art = ART.pendulo; p.dx = 0;
      clock.speed = 3;
      luz({ x: 48, y: 9, r: 6 }); s.dark = 0.15;
      await wait(1100);
      clock.speed = 0; s.dark = 0;
      emit('spark', 48, 6); di('TIC', clock, { color: 'W', dx: 4 });
      await wait(1400);
    },

    // ===== el baño en el termal (el paño es la toalla del termal) =====
    async 'pano@geodude'() { await termal({ hondo: 9, alivio: () => { di('AAAH', G, { color: 'S', life: 1500 }); humo(G, 4, { color: 'S', at: 'head', step: 250 }); } }); },
    async 'pano@growlithe'() {
      await termal({ hondo: 6, alivio: async () => {
        // sale, se sacude encima de todos y huele a perro mojado, pero feliz
        G.clip = null; G.y = FLOOR;
        await walk(G, GUEST_X, 40); face(G, 'l');
        shake(G, 700, 2);
        for (let i = 0; i < 4; i++) later(i * 150, () => burst('drop', G.x, arriba(G) + 6, 6, 14));
        await wait(700);
        humo(G, 3, { color: 'g', at: 'head', step: 250 });
        corazones(G, 3);
      } });
    },
    async 'pano@magmar'() {
      await termal({ hondo: 7, alivio: async () => {
        // suspira y el agua sube dos grados más solo de tenerlo dentro
        di('AH', G, { color: 'o' });
        await every(60, 900, () => emit('steam', 58 + Math.random() * 26, FLOOR - 3));
        di('+2', { x: 70, y: FLOOR - 12 }, { color: 'R', life: 1300 });
      } });
    },
    async 'pano@vulpix'() {
      await termal({ hondo: 5, suave: true, alivio: async () => {
        // sale con las seis colas como recién peinadas
        G.clip = null; G.y = FLOOR;
        await walk(G, GUEST_X, 26); face(G, 'l');
        const q = punto(G, 'tail');
        chispas(q.x, q.y, 6, 10, 10, 160);
        corazones(G, 2, 500);
      } });
    },

    // ===== las orejeras =====
    async orejeras() {
      // todo le suena demasiado fuerte…
      const ruido = every(240, 1700, i => { di(['TOC', 'BLA', 'RRR', 'CLIN'][i % 4], { x: 24 + (i * 19) % 64, y: 18 + (i % 3) * 6 }, { color: 'S', life: 700 }); if (i % 2) shake(G, 200, 1); });
      const { a, p } = await ponerle(ART.orejeras, 'head', { dy: 5 });
      await ruido;
      await fin(a);
      // …se las pone, cierra los ojos y sonríe: por fin el mundo suena a tamaño normal
      di('AH', G, { color: 'p' });
      corazones(G, 3, 500);
      await wait(1800);
    },

    // ===== objetos de un solo huésped =====
    async manzana() {
      const vasos = [44, 52].map(x => enSuelo(ART.vaso, x));
      const temblor = every(80, 2600, i => vasos.forEach(v => { v.x += i % 2 ? 1 : -1; }));
      const { a, p } = await ponerle(ART.manzana, 'front', { dy: 2 });
      // la abraza, le da las gracias…
      corazones(G, 3, 300);
      await wait(1000);
      // …y se la come entera. Los vasos dejan de temblar
      anim(G, 'Eat'); burst('crumb', punto(G, 'front').x, punto(G, 'front').y, 4, 4); await wait(800); drop(p); idle(G);
      await temblor;
      di('GRACIAS', G, { color: 'p' });
      await wait(1200);
      await fin(a);
    },
    async panuelos() {
      const { a, p } = await trae(ARTX.caja, { to: 56 });
      await toss(p, GUEST_X - 16, 380, 6);
      // la vacía antes de que se cierre la puerta
      const out = every(70, 1400, i => emit('confetti', p.x + 3, p.y - 2, { col: i % 2 ? 'W' : 'p', size: 2 }));
      lagrimas(G, 5, 250);
      walk(a, -24, 46);
      await out;
      p.art = ARTX.cajaVacia;
      await wait(800);
    },
    async maletin() {
      const { a, p } = await dejar(ART.maletinAbierto, { to: 60 });
      await fin(a);
      // mete dentro el código, un caramelo de menta y nada más
      for (const art of [ART.folio, ART.caramelo]) { const q = prop(art, G.x - 8, arriba(G) + 6); await moveTo(q, p.x + 1, p.y - 2, 400, 8); drop(q); }
      await wait(300);
      // lo cierra con mucha ceremonia
      p.art = ART.maletin;
      chispas(p.x + 4, p.y, 5, 10, 6);
      di('CLAC', p, { color: 'W', dx: 4 });
      await wait(1500);
    },
    async batido() {
      const { a, p } = await trae(ARTX.batidora, { sprite: cs, to: 50 });
      face(a, 'l');
      // Charizard lo bate con la cola: la mitad acaba en el techo
      Object.assign(p, { on: a, at: 'tail', dx: 0, dy: -4 });
      await every(80, 900, i => { p.dy = -4 + (i % 2 ? -1 : 1); });
      for (let i = 0; i < 5; i++) { const q = propPos(p); const m = prop(ART.mancha, q.x + 2, q.y); await moveTo(m, 40 + i * 12, 2, 200, 0); }
      face(a, 'r');
      p.art = ART.batidoMedio;
      await ponA(p, G, 'front');
      // Machoke se bebe la otra mitad y flexiona: «Ya noto el bombeo»
      anim(G, 'Eat'); await wait(600); drop(p); idle(G);
      await agacha(G, 2, 400, 2);
      di('BOMBEO', G, { color: 'y', life: 1400 });
      await wait(1300);
      await fin(a);
    },
    async betun() {
      const botas = [enSuelo(ART.bota, GUEST_X - 22), enSuelo(ART.bota, GUEST_X - 15)];
      const { a } = await trae(ART.betun, { to: GUEST_X - 46 });
      face(a, 'l');
      // con betún y con la cola
      await every(120, 1500, i => { if (i % 2) emit('spark', botas[i % 4 < 2 ? 0 : 1].x + 2 + Math.random() * 3, FLOOR - 4); });
      botas.forEach(b => { b.art = ART.bota2; });
      // quedan brillando como la calva de Manolo; Machamp se cuadra, agradecido
      chispas(GUEST_X - 18, FLOOR - 2, 6, 12, 6, 160);
      await agacha(G, 1, 600, 1);
      corazones(G, 2);
      await wait(1200);
      await fin(a);
    },
    async figura() {
      const sofa = prop(ARTX.sofa, 20, FLOOR - 5);
      const fig = prop(ART.figuraDerretida, 26, FLOOR - 8);
      const { a } = await trae(null, { to: 36 });
      face(a, 'l');
      // encuentra la figura debajo del sofá (con la peana un poco derretida)
      await agacha(a, 2, 400, 2);
      emit('spark', fig.x + 3, fig.y);
      Object.assign(fig, { on: a, at: null });
      await walk(a, GUEST_X - 34, 36);
      await toss(fig, GUEST_X - 14, 380, 6);
      await wait(400);
      di('EDICION', G, { color: 'y', life: 900 }); later(600, () => di('LIMITADA', G, { color: 'y', life: 1000 }));
      chispas(fig.x + 3, fig.y, 4, 8, 6);
      await wait(1700);
      await fin(a);
    },
    async ketchup() {
      const vaso = enSuelo(ART.vaso, GUEST_X - 14);
      const { a, p } = await ponerle(ART.ketchup, 'front');
      // lo abraza, le firma un autógrafo…
      corazones(G, 2);
      const firma = prop(ART.folio, punto(G, 'front').x, punto(G, 'front').y - 4);
      await ponA(firma, a, 'above');
      // …y le echa kétchup a todo. Hasta al agua
      await every(60, 1200, () => emit('drop', punto(G, 'front').x, punto(G, 'front').y, { vx: -20 + Math.random() * 24, vy: -10 }));
      vaso.art = ARTX.vasoRojo;
      for (let i = 0; i < 3; i++) prop(['RR', 'R.'], 50 + i * 9, FLOOR - 1 - (i % 2));
      await wait(1000);
      await fin(a);
    },
    async cuchara() {
      const { a, p } = await trae(ART.cuchara, { to: 60 });
      drop(p);
      // le trae cinco cucharas: llegan a la mesa con forma de interrogación
      const cs5 = [0, 1, 2, 3, 4].map(i => prop(ART.cuchara, a.x - 2 + i, arriba(a) - 8));
      for (const [i, q] of cs5.entries()) moveTo(q, GUEST_X - 26 + i * 5, FLOOR - 8, 380, 8);
      await wait(500);
      cs5.forEach(q => { q.art = ART.cucharaDoblada; });
      emit('spark', GUEST_X - 16, FLOOR - 10);
      await wait(500);
      di('SIGNIFICA ALGO', G, { color: 'v', life: 1600 });
      sudor(a);
      await wait(1500);
      await fin(a);
    },
    async prismaticos() {
      const { a, p } = await ponerle(ART.prismaticos, 'face');
      await fin(a);
      // a los cinco minutos ya sabe quién ha repetido postre y quién no ha pagado el café
      const clock = reloj(44, 5, 2);
      await wait(800);
      clock.speed = 0;
      di('POSTRE', G, { color: 'y', life: 900 });
      await wait(800);
      di('CAFE', G, { color: 'y', life: 900 });
      await wait(800);
      di('SSSS', G, { color: 'v', life: 1200 });
      await wait(1000);
    },
    async taper() {
      const { a, p } = await dejar(recolor(ART.taper, { c: 'R' }), { to: 60 });
      const t2 = prop(recolor(ART.taper, { c: 'g' }), p.x, p.y - 7), t3 = prop(recolor(ART.taper, { c: 'B' }), p.x, p.y - 14);
      await fin(a);
      // los cuenta en voz baja, uno por cada Cubone que espera
      for (const [i, t] of [p, t2, t3].entries()) { di(String(i + 1), t, { color: 'W', dx: -3, life: 800, rise: 3 }); emit('spark', t.x + 4, t.y); await wait(550); }
      corazones(G, 3, 400);
      await wait(1400);
    },
    async puerro() {
      const ch = make(cs, 30); face(ch, 'r');
      const { a, p } = await ponerle(ART.puerro, 'front', { to: GUEST_X - 26 });
      await fin(a);
      // lo blande como una espada…
      for (let i = 0; i < 4; i++) { p.dy = i % 2 ? -4 : 2; p.dx = i % 2 ? -2 : 0; emit('spark', propPos(p).x, propPos(p).y); await wait(250); }
      // …y suelta un chiste tan malo que Charizard se va a la cocina
      di('JE JE', G, { color: 'y' });
      await wait(700);
      sudor(ch);
      await walk(ch, -26, 50);
    },
    async antorcha() {
      s.outdoor = s.prado = true;
      const ch = make(cs, 20); face(ch, 'r');
      const { a, p } = await ponerle(ART.antorcha, 'front', { to: 50 });
      face(a, 'r');
      const pipe = carry(ART.cachimba, a); Object.assign(pipe, { at: 'face', dx: 4, dy: 2 });
      // enciende una traca en el prado
      await wait(400);
      for (let i = 0; i < 8; i++) later(i * 180, () => { const x = 60 + Math.random() * 50, y = 10 + Math.random() * 14; for (let j = 0; j < 10; j++) emit('fw', x, y, { ang: j / 10 * Math.PI * 2, sp: 8, col: ['R', 'y', 'P', 'c'][i % 4] }); di('PUM', { x, y: y + 4 }, { color: 'W', life: 500, rise: 2 }); });
      await wait(500);
      // Charizard aplaude; a Manolo se le cae la cachimbita del susto
      anim(ch, 'Hop');
      shake(a, 500, 1);
      await moveTo(pipe, a.x - 2, FLOOR - 4, 400, 0);
      sudor(a);
      await wait(1600);
      idle(ch);
      await fin(a, ch);
    },
    async termometro() {
      const sopa = enSuelo(ART.sopa, 54);
      const ch = make(cs, -22); walk(ch, 18, 40);
      const { a, p } = await trae(ART.termometro, { to: 46 });
      face(a, 'r');
      await ponA(p, G, 'front');
      // le toma la temperatura a Manolo, a Charizard y a la sopa. Todo en orden
      for (const [who, at] of [[a, 'face'], [ch, 'face'], [sopa, null]]) {
        if (at) await ponA(p, who, at); else { await moveTo(p, sopa.x + 3, sopa.y - 6, 300, 4); }
        await wait(300);
        di('OK', at ? who : sopa, { color: 'g', dx: at ? 0 : 4 });
        await wait(400);
      }
      await ponA(p, G, 'front');
      // y se duerme tranquila
      anim(G, 'Sleep'); zzz(G, 1600);
      await wait(1500);
      await fin(a, ch);
    },
    async mochila() {
      const { a, p } = await dejar(ART.mochila, { to: GUEST_X - 38, x: GUEST_X - 22 });
      // se da la vuelta y le suelda la cremallera con la llama de la cola (no con la boca)
      face(a, 'l');
      await wait(250);
      await every(60, 1100, () => {
        const q = punto(a, 'tail');
        emit('flame', q.x, q.y, { vx: 10 + Math.random() * 8, vy: (Math.random() - 0.5) * 4 });
        if (Math.random() < 0.5) emit('spark', p.x + 2 + Math.random() * 4, p.y + 2);
      });
      p.art = ART.mochilaCaliente;
      vapor(p, 1800);
      await wait(400);
      estrellas(G, 5);
      corazones(G, 2);
      await wait(1600);
      await fin(a);
    },
    async pulsador() {
      const ch = make(cs, -22); walk(ch, 28, 40);
      const { a, p } = await dejar(ART.pulsador, { to: 58 });
      if (a !== ch) leave(a);
      // lo pulsa y define todo lo que ve durante una hora…
      for (const w of ['SILLA', 'MESA', 'DRAGON', 'MIEDO']) { di('DING', p, { color: 'y', dx: 3, life: 400, rise: 3 }); await wait(200); di(w, G, { color: 'W', life: 700, rise: 3 }); await wait(450); if (w === 'DRAGON') { sudor(ch); face(ch, 'l'); } }
      // …y Charizard acaba escondido
      await walk(ch, -26, 60);
    },
    async biberon() {
      const { a, p } = await trae(ART.biberon, { to: GUEST_X - 26 });
      // lo prueba en la muñeca, como un profesional
      await every(150, 600, () => emit('drop', a.x + 3, arriba(a) + 6, { vx: 0, vy: 0 }));
      await ponA(p, G, 'front');
      anim(G, 'Eat'); await wait(700); drop(p); idle(G);
      // «gracias, abuelo»
      di('GRACIAS', G, { color: 'p', dx: 4, life: 900 }); later(700, () => di('ABUELO', G, { color: 'p', dx: 4, life: 1000 }));
      await wait(900);
      corazones(a, 3);
      await wait(1200);
      await fin(a);
    },
    async barrita() {
      const { a, p } = await ponerle(ART.barrita, 'neck');
      await fin(a);
      await anochece(0.6, 500);
      luz({ prop: p, r: 7, glow: '#9FEF6F' });
      // bate las alas al ritmo de un bombo que solo oye él
      for (let i = 0; i < 6; i++) { await brinca(G, 1, 3, 300); di('PUM', G, { color: 'g', life: 400, rise: 3 }); }
      await wait(300);
    },
    async sabana() {
      const { a, p } = await trae(ART.sabana, { to: GUEST_X - 50 });
      face(a, 'r');
      // le cose cuatro sábanas con la cola y una aguja de lana
      const s2 = prop(ART.sabana, a.x - 18, FLOOR - 6), s3 = prop(ART.sabana, a.x - 8, FLOOR - 6);
      await fuego(a, 6, { at: 'tail' });
      await every(100, 700, () => emit('spark', a.x - 12 + Math.random() * 14, FLOOR - 4));
      drop(s2); drop(s3);
      // Onix se tapa hasta donde llega; por la poza asoma la punta de la cola, destapada
      p.art = ART.sabanagrande;
      await ponA(p, G, 'body', { dy: 4, dx: -2 });
      zzz(G, 2000);
      await wait(1800);
      await fin(a);
    },
    async tinte() {
      const { a, p } = await ponerle(ART.tinte, 'above', { dy: 0 });
      // de su época del gimnasio, de cuando tenía pelo: Dratini sale azul marino
      await every(80, 900, () => { const q = propPos(p); emit('drop', q.x + 3, q.y + 7, { vx: 0, vy: 0 }); });
      drop(p);
      G.tint = { color: C.n, alpha: 0.6 };
      fogonazo(250);
      await wait(400);
      di('GOTICA', G, { color: 'c', life: 900 }); later(700, () => di('DE MAR', G, { color: 'c', life: 1000 }));
      await wait(1500);
      await fin(a);
    },
  });

  // Los encargos de servicio tienen escena por objeto y, si hace falta, por huésped:
  // «objeto@especie» (la forma de ahora, p. ej. regadera@venusaur) o «objeto@id» (la historia).
  const clave = str => String(str || '').split(' y ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const propia = pide.tipo !== 'comida' && (SCRIPTS[`${pide.objeto}@${clave(guest.especie)}`] || SCRIPTS[`${pide.objeto}@${clave(guest.id)}`]);
  const script = pide.objeto === 'quemado' ? SCRIPTS.quemado : pide.tipo === 'comida' && atendido === 'frio' ? SCRIPTS.frio : propia || SCRIPTS[pide.objeto] || (pide.tipo === 'comida' ? SCRIPTS.comida : SCRIPTS.servicio);

  const close = () => {
    if (running !== token) return;
    running = null;
    cerrarAnterior = null;
    box.classList.add('hidden');
    onClose?.();
  };
  document.querySelector('#popup-close').onclick = close;

  // ---------- dibujo ----------
  // un actor con sus extras: más grande (scale), medio transparente (alpha) o teñido (tint)
  function drawActor(ctx, a, t) {
    const scaled = a.scale && a.scale !== 1;
    if (a.tint) {
      tintC ||= layer();
      const k = tintC.getContext('2d');
      k.clearRect(0, 0, W, H); k.imageSmoothingEnabled = false;
      a.tint = { ...a.tint }; const tint = a.tint; a.tint = null;
      drawActor(k, a, t);
      a.tint = tint;
      k.globalCompositeOperation = 'source-atop'; k.globalAlpha = tint.alpha ?? 0.55; k.fillStyle = tint.color; k.fillRect(0, 0, W, H);
      k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1;
      ctx.drawImage(tintC, 0, 0);
      return;
    }
    ctx.save();
    if (a.alpha != null) ctx.globalAlpha = a.alpha;
    if (scaled) { ctx.imageSmoothingEnabled = false; ctx.translate(a.x, a.y); ctx.scale(a.scale, a.scale); ctx.translate(-a.x, -a.y); }
    if (a.rot) { ctx.translate(a.x, a.y - 4); ctx.rotate(a.rot); ctx.translate(-a.x, -a.y + 4); }
    a.draw(ctx, t);
    ctx.restore();
  }
  // la noche (o el cuarto a oscuras) con agujeros de luz: velas, linternas, núcleos que brillan
  function drawDark(t) {
    shade ||= layer();
    const k = shade.getContext('2d');
    k.globalCompositeOperation = 'source-over';
    k.clearRect(0, 0, W, H);
    k.fillStyle = `rgba(16, 12, 20, ${s.dark})`; k.fillRect(0, 0, W, H);
    k.globalCompositeOperation = 'destination-out';
    const glows = [];
    for (const l of s.lights) {
      if (l.off) continue;
      const pp = l.prop && propPos(l.prop);
      const q = l.on ? punto(l.on, l.at || 'body') : pp ? { x: pp.x + l.prop.art[0].length / 2, y: pp.y + 1 } : { x: l.x, y: l.y };
      const x = q.x + (l.dx || 0), y = q.y + (l.dy || 0);
      const r = (typeof l.r === 'function' ? l.r(t) : l.r) + (l.flick ? (Math.floor(t / 120) % 2) : 0);
      if (l.cone) {
        const pts = l.cone(t);
        k.fillStyle = 'rgba(0,0,0,0.85)'; k.beginPath(); k.moveTo(...pts[0]); for (const pt of pts.slice(1)) k.lineTo(...pt); k.fill();
        if (l.glow) glows.push({ pts, color: l.glow });
        continue;
      }
      k.fillStyle = 'rgba(0,0,0,0.45)'; disc(k, x, y, r + 3);
      k.fillStyle = 'rgba(0,0,0,1)'; disc(k, x, y, r);
      if (l.glow) glows.push({ x, y, r, color: l.glow });
    }
    k.globalCompositeOperation = 'source-over';
    c.drawImage(shade, 0, 0);
    for (const g of glows) {
      c.globalAlpha = 0.22; c.fillStyle = g.color;
      if (g.pts) { c.beginPath(); c.moveTo(...g.pts[0]); for (const pt of g.pts.slice(1)) c.lineTo(...pt); c.fill(); }
      else disc(c, g.x, g.y, g.r);
      c.globalAlpha = 1;
    }
  }
  // un espejo de pie (o colgado) con el huésped reflejado dentro, mirando hacia fuera
  function drawMirror(t) {
    const m = s.espejo;
    c.fillStyle = C.L; c.fillRect(m.x - 1, m.y - 1, m.w + 2, m.h + 2);
    c.fillStyle = C.k; c.fillRect(m.x, m.y, m.w, m.h);
    c.fillStyle = '#BFE7F3'; c.fillRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
    const of = m.of || guestA;
    m.refl ||= new Actor(of.sprite, { x: 0, y: 0, dir: DIR.right });
    const r = m.refl;
    Object.assign(r, { anim: of.anim, dir: mira(of) ? DIR.left : DIR.right, x: m.x + m.w / 2, y: m.y + m.h - 2 });
    r.scale = m.sc ?? 0.6;
    c.save(); c.beginPath(); c.rect(m.x + 1, m.y + 1, m.w - 2, m.h - 2); c.clip();
    if (m.show !== false) { c.globalAlpha = 0.8; drawActor(c, r, t); }
    c.restore();
    c.fillStyle = C.W; c.globalAlpha = 0.7;
    c.fillRect(m.x + 2, m.y + 2, 1, 4); c.fillRect(m.x + 3, m.y + 2, 1, 2);
    c.globalAlpha = 1;
    if (!m.wall) { c.fillStyle = C.L; c.fillRect(m.x + 1, m.y + m.h + 1, 2, FLOOR - m.y - m.h - 1); c.fillRect(m.x + m.w - 3, m.y + m.h + 1, 2, FLOOR - m.y - m.h - 1); }
  }
  // fuera no hay pared donde colgarlo: el espejo de pared se queda de pie en el suelo
  const espejo = (x = 66, { w = 12, h = 20, wall = false, y, sc } = {}) => {
    if (s.outdoor && wall) { wall = false; y = FLOOR - h - 3; }
    s.espejo = { x, y: y ?? (wall ? 14 : FLOOR - h - 3), w, h, wall, sc }; return s.espejo;
  };

  function frame(t) {
    if (running !== token) return;
    now = t;
    room(c, s);
    if (s.beam) {
      c.globalAlpha = 0.28 * s.beam; c.fillStyle = '#FFE7A7';
      c.beginPath(); c.moveTo(10, 10); c.lineTo(30, 10); c.lineTo(92, FLOOR); c.lineTo(56, FLOOR); c.fill();
      c.globalAlpha = 1;
    }
    if (s.puddle) {
      const w = Math.min(10, 2 + (t - s.puddle.born) / 60);
      c.fillStyle = C.c; c.fillRect(Math.round(s.puddle.x - w / 2), FLOOR, Math.round(w), 1);
      c.fillStyle = C.B; c.fillRect(Math.round(s.puddle.x - w / 2 + 1), FLOOR + 1, Math.max(1, Math.round(w - 2)), 1);
    }
    for (const a of actors) a.update(t);
    for (const p of props) p.anim?.(t);
    const drawProp = (p, x, y) => p.hidden ? null : p.draw ? p.draw(c, x, y, p, t) : stamp(c, p.art, x, y);
    if (s.espejo) drawMirror(t);
    for (const p of props) if (!p.on && !p.front) drawProp(p, p.x, p.y);
    for (const a of actors) {
      if (a.hidden) continue;
      const j = jitter.get(a);
      const dx = j && t < j.until ? (Math.floor(t / 60) % 2 ? j.amp : -j.amp) : 0;
      a.x += dx; drawActor(c, a, t); a.x -= dx;
    }
    for (const p of props) {
      if (p.on) { const q = propPos(p); drawProp(p, q.x, q.y); }
      else if (p.front) drawProp(p, p.x, p.y);
    }
    if (s.dark) drawDark(t);
    if (s.flash) {
      const k = (t - s.flash.t0) / s.flash.ms;
      if (k >= 1) s.flash = null;
      else { c.globalAlpha = 0.85 * (1 - k); c.fillStyle = s.flash.color || '#FFFFFF'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    }
    if (s.sad) stamp(c, ART.sad, s.sad.x - 4, s.sad.bounds().y - 9 + (Math.floor(t / 400) % 2));
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const life = p.life || PARTICLES[p.type]?.life || 800;
      const k = (t - p.born) / life;
      if (k >= 1) { particles.splice(i, 1); continue; }
      if (p.type === 'sweat') {
        const b = p.stick.bounds();
        if (Math.floor(t / 200) % 3) stamp(c, ART.sweat, p.stick.x + 6, b.y - 1 + k * 3);
        continue;
      }
      if (p.type === 'vein') {
        // la vena de enfado late encima de la cabeza
        const b = p.stick.bounds();
        if (Math.floor(t / 180) % 2) stamp(c, ART.vein || ART.enfado, p.stick.x + 3, b.y - 4);
        continue;
      }
      PARTICLES[p.type].draw(c, p, k, t);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  await script();
  if (running === token) setTimeout(close, 900);
}
