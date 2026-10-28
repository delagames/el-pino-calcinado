// La foto de recuerdo (se compra en la tienda): Manolo y Charizard en la puerta de la posada, de noche,
// con el pino calcinado. Se genera en pixel art y se descarga para ponerla de fondo de pantalla:
// en vertical para el móvil (1080×2336) o en horizontal para el ordenador (1920×1080).
import { loadSprite, Actor, DIR } from './sprites.js';
import { imagen, rect, disc, pine } from './intro.js';

const MEDIDAS = { movil: [135, 292], ordenador: [240, 135] };   // en «píxeles de dibujo»
const ZOOM = 2, FINAL = 4;                                      // 1 píxel de dibujo = 2 del lienzo = 8 de la foto

function cielo(c, w, h, horizonte) {
  const bandas = ['#0F1428', '#141A33', '#181F3D', '#1D2447', '#232B52'];
  for (let i = 0; i < bandas.length; i++) rect(c, 0, (horizonte * i) / bandas.length, w, horizonte / bandas.length + 1, bandas[i]);
  rect(c, 0, horizonte, w, h - horizonte, '#232B52');
  let s = 7;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < w * horizonte / 90; i++) rect(c, Math.floor(r() * w), Math.floor(r() * horizonte), 1, 1, r() < 0.2 ? '#FFF7BF' : '#8F97C7');
}
function montes(c, w, base, alto, col, semilla) {
  for (let x = 0; x < w; x++) {
    const hh = Math.round(alto * (0.6 + 0.4 * Math.sin(x / 13 + semilla) * Math.sin(x / 5 + semilla * 2)));
    rect(c, x, base - hh, 1, 200, col);
  }
}
// la posada de noche: paredes de madera, ventanas encendidas, tejado rojo, chimenea con humo y la puerta
function posada(c, x, y, w, h) {
  rect(c, x - 1, y - 1, w + 2, h + 2, '#100C14'); rect(c, x, y, w, h, '#5F4031');
  for (let i = x + 3; i < x + w; i += 6) rect(c, i, y, 1, h, '#4F3427');
  const alto = Math.round(w * 0.42);
  for (let i = 0; i <= alto; i++) {
    const half = Math.round((w / 2 + 6) * (1 - i / alto));
    rect(c, x + w / 2 - half, y - i, half * 2, 1, i % 3 === 0 ? '#9F2F27' : '#C73F2F');
  }
  rect(c, x + w * 0.72, y - alto * 0.8, 7, alto * 0.5, '#100C14'); rect(c, x + w * 0.72 + 1, y - alto * 0.8 + 1, 5, alto * 0.5, '#5F5A67');
  for (let i = 0; i < 4; i++) { c.globalAlpha = 0.5 - i * 0.1; disc(c, x + w * 0.72 + 4 + i * 3, y - alto * 0.8 - 4 - i * 5, 2 + i, '#AFB7CF'); c.globalAlpha = 1; }
  const vw = 9, vh = 8, filas = Math.max(1, Math.floor((h - 16) / 16));
  for (let f = 0; f < filas; f++) for (let k = 0; k < 3; k++) {
    const vx = x + 8 + k * ((w - 16 - vw) / 2), vy = y + 5 + f * 16;
    if (f === filas - 1 && k === 1) continue;
    rect(c, vx - 1, vy - 1, vw + 2, vh + 2, '#100C14'); rect(c, vx, vy, vw, vh, (f + k) % 3 ? '#FFD77F' : '#FFB347');
    rect(c, vx + Math.floor(vw / 2), vy, 1, vh, '#9F6A3F');
  }
  const dw = 10, dh = 14;
  rect(c, x + w / 2 - dw / 2 - 1, y + h - dh - 1, dw + 2, dh + 1, '#100C14'); rect(c, x + w / 2 - dw / 2, y + h - dh, dw, dh, '#6F4527');
  rect(c, x + w / 2 + 2, y + h - dh / 2, 1, 1, '#FFD77F');
  // el farolillo de la puerta
  rect(c, x + w / 2 - dw / 2 - 5, y + h - dh - 2, 3, 4, '#FFD77F');
}

async function dibuja(tipo) {
  const [W, H] = MEDIDAS[tipo];
  const lienzo = document.createElement('canvas');
  lienzo.width = W * ZOOM; lienzo.height = H * ZOOM;
  const c = lienzo.getContext('2d');
  c.imageSmoothingEnabled = false;
  const [ms, cs, logo] = await Promise.all([
    loadSprite('manolo', ['Idle']), loadSprite('0006', ['Idle']), imagen('assets/logo/logo-principal-transparente.svg'),
  ]);
  c.save(); c.scale(ZOOM, ZOOM);
  const movil = tipo === 'movil';
  // el escenario
  const horizonte = movil ? 200 : 100, suelo = movil ? 230 : 110;
  cielo(c, W, H, horizonte);
  disc(c, movil ? 112 : 206, movil ? 122 : 22, 7, '#F4EFE6'); disc(c, movil ? 109 : 203, movil ? 120 : 20, 6, '#0F1428');
  montes(c, W, horizonte - 6, movil ? 26 : 20, '#262E57', 2);
  montes(c, W, horizonte + 4, movil ? 18 : 14, '#1C2340', 5);
  rect(c, 0, suelo, W, H - suelo, '#1F2F2A'); rect(c, 0, suelo, W, 1, '#2F4A3F');
  const [px, pw, ph] = movil ? [38, 86, 48] : [142, 76, 38];
  posada(c, px, suelo - ph, pw, ph);
  // el pino calcinado, con su brasa, a la escala de los personajes
  c.save(); c.translate(movil ? 17 : 228, suelo + 1); c.scale(1.5, 1.5); pine(c, 0, 0, 0, { burnt: true }); c.restore();
  // Manolo y Charizard en la puerta, un poco más grandes (×1,5)
  for (const [sprite, x, dir] of [[ms, px + pw / 2 - 15, DIR.down], [cs, px + pw / 2 + 17, DIR.downLeft]]) {
    const a = new Actor(sprite, { offset: 0 });
    c.save(); c.translate(x, suelo + 6); c.scale(1.5, 1.5); a.place(0, 0, { dir }); a.draw(c, 0); c.restore();
  }
  c.restore();
  // el logo (ya lleva el lema), a su tamaño de pixel art: 270×186 en el lienzo, para que no se deforme
  if (logo) c.drawImage(logo, movil ? 0 : 4, movil ? 16 : 4, 270, 186);
  // a tamaño de foto, sin suavizar: píxeles nítidos
  const foto = document.createElement('canvas');
  foto.width = lienzo.width * FINAL; foto.height = lienzo.height * FINAL;
  const f = foto.getContext('2d');
  f.imageSmoothingEnabled = false;
  f.drawImage(lienzo, 0, 0, foto.width, foto.height);
  return foto;
}

// Genera la foto y la descarga (en el móvil, el navegador ofrece guardarla en la galería)
export async function descargarFondo(tipo = 'movil') {
  const foto = await dibuja(tipo);
  const blob = await new Promise(res => foto.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `el-pino-calcinado-${tipo}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Para verla sin descargar (pruebas)
export { dibuja as dibujaFondo };
