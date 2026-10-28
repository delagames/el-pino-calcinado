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
};

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
  tirita: ['.LLLLLLL.', 'LhhpWphhL', 'LhhpWphhL', '.LLLLLLL.'],
  heart: ['.PP.PP.', 'PPPPPPP', '.PPPPP.', '..PPP..', '...P...'],
  sad: ['.LLLLLLL.', 'LWWWBWWWL', 'LWWBBBWWL', 'LWBBBBBWL', 'LWWBBBWWL', '.LLLWLLL.', '....L....'],
  note: ['..LL', '..LW', '..L.', 'LLL.', 'LLL.'],
  sweat: ['.c.', 'cBc', 'cBc', '.c.'],
  vein: ['.R.R.', 'RR.RR', '.....', 'RR.RR', '.R.R.'],
  spark: ['..W..', '..W..', 'WWYWW', '..W..', '..W..'],
  spark2: ['.....', '..W..', '.WYW.', '..W..', '.....'],
};

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
    c.globalAlpha = 0.7 * (1 - k); c.fillStyle = C.S;
    disc(c, p.x + p.dir * k * 6, p.y - k * 6, Math.round(1 + k * 3));
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

let running = null;

export async function showScene({ guest, pide, helper, fase = 'noche', atendido = true, hab = null }, onClose) {
  const box = document.querySelector('#popup');
  const canvas = document.querySelector('#popup-canvas');
  const c = canvas.getContext('2d');
  box.classList.remove('hidden');
  const token = {};
  running = token;

  const [gs, ms, cs] = await Promise.all([
    loadSprite(guest.sprite, ['Idle', 'Walk', 'Eat', 'Hop']),
    loadSprite('manolo', ['Idle', 'Walk']),
    loadSprite('0006', ['Idle', 'Walk']),
  ]);
  if (running !== token) return;

  // ---------- estado de la escena ----------
  // por la ventana se ve el cielo de la hora; el sol entra en su escena aunque sea tarde
  const s = { day: pide.objeto === 'sol' || fase === 'manana' || fase === 'dia', shutter: pide.objeto === 'sol' ? 0 : 1, beam: 0, outdoor: hab === 'estanque', tarde: fase === 'tarde' };
  const guestA = new Actor(gs, { x: GUEST_X, y: FLOOR, dir: DIR.left });
  await addBuddy(guestA, guest.acompanante, ['Idle', 'Walk', 'Hop']);
  const actors = [guestA];
  const props = [];          // { art, x, y, on: actor, front }
  const particles = [];      // { type, x, y, born, ... }
  const jitter = new Map();  // actor -> { until, amp }
  let now = performance.now();

  const make = (sprite, x) => { const a = new Actor(sprite, { x, y: FLOOR, dir: DIR.right }); actors.push(a); return a; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const walk = (a, x, speed = 40) => new Promise(r => a.walkTo(x, FLOOR, { dir: x < a.x ? DIR.left : DIR.right, speed, then: r }));
  const leave = a => walk(a, -24, 46).then(() => actors.splice(actors.indexOf(a), 1));
  const emit = (type, x, y, extra = {}) => particles.push({ type, x, y, born: now, seed: Math.random() * 9, ...extra });
  const burst = (type, x, y, n, spread = 6) => {
    for (let i = 0; i < n; i++) emit(type, x, y, { vx: (Math.random() - 0.5) * spread * 2, vy: -10 - Math.random() * 14, dir: 1 });
  };
  const carry = (art, a) => { const p = { art, on: a }; props.push(p); return p; };
  // lanza un objeto en arco hasta (x, y del suelo)
  const toss = (p, x, ms = 450, height = 10) => new Promise(r => {
    if (s.outdoor && Math.abs(x - GUEST_X) < 30) x = TABLE.x;
    const base = s.outdoor && x === TABLE.x ? TABLE.top : FLOOR;
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
    const b = p.on.bounds();
    return { x: p.on.x - p.art[0].length / 2, y: b.y - p.art.length - 1 + (p.on.goal ? Math.floor(now / 150) % 2 : 0) };
  }

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
    const ma = make(ms, -20);
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

  const script = pide.objeto === 'quemado' ? SCRIPTS.quemado : pide.tipo === 'comida' && atendido === 'frio' ? SCRIPTS.frio : SCRIPTS[pide.objeto] || (pide.tipo === 'comida' ? SCRIPTS.comida : SCRIPTS.servicio);

  const close = () => {
    if (running !== token) return;
    running = null;
    box.classList.add('hidden');
    onClose?.();
  };
  document.querySelector('#popup-close').onclick = close;

  // ---------- dibujo ----------
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
    for (const p of props) if (!p.on && !p.front) stamp(c, p.art, p.x, p.y);
    for (const a of actors) {
      const j = jitter.get(a);
      const dx = j && t < j.until ? (Math.floor(t / 60) % 2 ? j.amp : -j.amp) : 0;
      a.x += dx; a.draw(c, t); a.x -= dx;
    }
    for (const p of props) {
      if (p.on) { const q = propPos(p); stamp(c, p.art, q.x, q.y); }
      else if (p.front) stamp(c, p.art, p.x, p.y);
    }
    if (s.dark) { c.globalAlpha = s.dark; c.fillStyle = '#100C14'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
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
