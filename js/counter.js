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

export function createCounter(canvas) {
  const c = canvas.getContext('2d');
  let guest = null, chari = null, fase = 'noche', running = false, speaking = null, hopUntil = 0, guestScale = 2, drawn = 0;
  let llora = false, ojos = null;   // si el huésped está llorando y dónde tiene los ojos
  let lugar = 'dentro';   // 'dentro' (mostrador), 'fuera' (frente al pino) o 'estanque'

  async function open({ sprite, buddy = null, fase: f, lugar: l = 'dentro' }) {
    fase = f;
    lugar = l;
    const [gs, cs] = await Promise.all([loadSprite(sprite, ['Idle', 'Hop']), loadSprite('0006', ['Idle', 'Hop'])]);
    // el huésped va en primer plano: a ×2 si cabe, a ×1 si es muy grande (Gengar flota alto).
    // Se mide su cuerpo real para que asome de la barra siempre igual.
    const a = gs.anims.Idle, body = measure(a.img, a.fw, a.fh);
    // fuera se le ve entero, de pie en el césped (o en el agua del estanque)
    const ground = lugar === 'dentro' ? BAR + 9 : lugar === 'estanque' ? 74 : 72;
    guestScale = (body.bottom - body.top) * 2 <= (lugar === 'dentro' ? 58 : 62) ? 2 : 1;
    const feetY = ground / guestScale + 6 + a.fh / 2 - body.bottom;
    guest = new Actor(gs, { x: (lugar === 'dentro' ? 84 : 80) / guestScale - (buddy ? 9 : 0), y: feetY, dir: DIR.down });
    // a un tercio de la cabeza, más o menos: de ahí caen las lágrimas
    ojos = { x: guest.x * guestScale, y: (feetY - 6 - a.fh / 2 + body.top + (body.bottom - body.top) * 0.3) * guestScale, sep: Math.min(10, (body.bottom - body.top) * 0.18) * guestScale };
    llora = false;
    await addBuddy(guest, buddy, ['Idle', 'Hop']);
    chari = new Actor(cs, { x: lugar === 'dentro' ? 26 : 38, y: lugar === 'dentro' ? BAR + 10 : 70, dir: DIR.downRight });
    if (!running) { running = true; requestAnimationFrame(frame); }
    resize();
  }

  function close() { running = false; }

  // Quién habla y con qué cara: el que habla contento da un saltito
  function speak(who, emotion) {
    speaking = who;
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
    canvas.width = W; canvas.height = H;
    canvas.style.width = `${W * S / dpr}px`;
    canvas.style.height = `${H * S / dpr}px`;
  }

  function frame(t) {
    if (!running) return;
    if (t - drawn < 30) { requestAnimationFrame(frame); return; }   // ~30 fps bastan
    drawn = t;
    if (lugar === 'dentro') backdrop(c, fase, t);
    else outside(c, fase, t, lugar === 'estanque');
    if (performance.now() > hopUntil) for (const a of [guest, chari]) if (a && a.anim === 'Hop') a.anim = 'Idle';
    c.imageSmoothingEnabled = false;
    for (const a of [chari, guest]) {
      if (!a) continue;
      // el que no habla queda un poco en sombra
      c.globalAlpha = speaking && speaking !== 'manolo' && a !== (speaking === 'huesped' ? guest : chari) ? 0.75 : 1;
      if (a === guest) { c.save(); c.scale(guestScale, guestScale); a.draw(c, t); c.restore(); }
      else a.draw(c, t);
      c.globalAlpha = 1;
    }
    if (llora && ojos) tears(c, t, ojos);
    if (lugar === 'dentro') counterFront(c);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => running && resize());
  return { open, close, speak };
}
