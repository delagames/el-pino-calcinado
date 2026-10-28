// El final: cuando todos los huéspedes han contado su historia, el libro de visitas está completo.
// Manolo y Charizard se hacen de oro, compran Famadesa y salen en los paquetes de chistorra.
// Mismo sistema de escenas que la intro (lienzo de 240×135 y cuadro de texto debajo).
import { loadSprite, Actor, DIR } from './sprites.js';
import { playScenes, imagen, W, H, OFF, rect, disc, oval, sky, mountains, text, pine } from './intro.js';

function coin(c, x, y) {
  disc(c, x, y, 3, '#7F4F17'); disc(c, x, y, 2, '#FFD74F'); rect(c, x - 1, y - 1, 1, 1, '#FFF7BF');
}
// saco de monedas, atado arriba y con una moneda pintada
function saco(c, x, y) {
  oval(c, x, y, 9, 8, '#100C14'); oval(c, x, y, 8, 7, '#C7873F'); rect(c, x - 3, y - 10, 7, 3, '#100C14'); rect(c, x - 2, y - 9, 5, 1, '#9F6A3F');
  rect(c, x - 2, y - 7, 5, 2, '#9F6A3F'); coin(c, x, y + 1);
}
function chispas(c, t, x0, y0, w, h, n = 10) {
  for (let i = 0; i < n; i++) {
    const p = (t / 700 + i / n) % 1, x = x0 + ((i * 53) % w), y = y0 + ((i * 31) % h);
    if (p < 0.5) { const s = p < 0.25 ? 1 : 2; rect(c, x - s, y, s * 2 + 1, 1, '#FFF7BF'); rect(c, x, y - s, 1, s * 2 + 1, '#FFF7BF'); }
  }
}
// retrato con su marco, como en el cuadro de diálogo
function retrato(c, img, x, y, s = 40) {
  rect(c, x - 2, y - 2, s + 4, s + 4, '#100C14'); rect(c, x - 1, y - 1, s + 2, s + 2, '#FFB347');
  if (img) c.drawImage(img, 0, 0, img.width, img.height, x, y, s, s);
}
// La furgoneta de Famadesa, la misma del juego, al doble. Manolo conduce (su sprite, visto por la
// ventanilla: lo de debajo lo tapa la puerta, que se dibuja por delante) y Charizard va en el techo.
const FS = 2, FL = 60, FTOP = -28;
function furgoFondo(c, x, y, t, a) {
  const r = (dx, dy, w, h, col) => rect(c, x + dx * FS, y + dy * FS, w * FS, h * FS, col);
  r(0, FTOP, FL, 24, '#100C14'); r(1, FTOP + 1, FL - 2, 22, '#F4EFE6'); r(1, FTOP + 1, FL - 2, 1, '#FFFFFF');
  r(FL, FTOP + 7, 16, 17, '#100C14'); r(FL + 1, FTOP + 8, 14, 15, '#F4EFE6');
  r(FL + 4, FTOP + 10, 9, 6, '#9FDFEF');
  r(1, FTOP + 16, FL + 14, 3, '#C73F2F'); r(1, FTOP + 19, FL + 14, 1, '#8F2717');
  if (a.logo) c.drawImage(a.logo, 0, 0, a.logo.width, a.logo.height, x + 7 * FS, y + (FTOP + 1) * FS, a.logo.width * FS, a.logo.height * FS);
}
function furgoDelante(c, x, y, t) {
  const r = (dx, dy, w, h, col) => rect(c, x + dx * FS, y + dy * FS, w * FS, h * FS, col);
  // la cabina alrededor de la ventanilla y la puerta, por delante de Manolo
  r(FL, FTOP + 7, 16, 3, '#100C14'); r(FL + 1, FTOP + 8, 14, 2, '#F4EFE6');
  r(FL, FTOP + 10, 4, 6, '#F4EFE6'); r(FL, FTOP + 10, 1, 6, '#100C14');
  r(FL + 13, FTOP + 10, 3, 6, '#F4EFE6'); r(FL + 15, FTOP + 10, 1, 6, '#100C14');
  r(FL + 4, FTOP + 10, 3, 1, '#FFFFFF');
  r(FL, FTOP + 16, 16, 8, '#100C14'); r(FL + 1, FTOP + 16, 14, 7, '#F4EFE6');
  r(FL + 1, FTOP + 16, 14, 3, '#C73F2F'); r(FL + 1, FTOP + 19, 14, 1, '#8F2717');
  r(FL + 14, FTOP + 18, 2, 3, '#DFAF3F'); r(FL + 3, FTOP + 21, 3, 1, '#5F5A67');
  r(0, -5, FL + 17, 2, '#100C14');
  const spin = Math.floor(t / 80) % 4;
  for (const wx of [12, FL + 6]) {
    disc(c, x + wx * FS, y - 3 * FS, 4 * FS, '#100C14'); disc(c, x + wx * FS, y - 3 * FS, 2 * FS, '#5F6777');
    const [dx, dy] = [[0, -3], [3, 0], [0, 3], [-3, 0]][spin]; rect(c, x + (wx + dx) * FS, y + (-3 + dy) * FS, FS, FS, '#8F97A7');
  }
  for (let i = 0; i < 2; i++) {
    const k = (t / 500 + i / 2) % 1;
    c.globalAlpha = 0.5 * (1 - k); disc(c, x - (2 + k * 8) * FS, y - (4 + k * 5) * FS, (1 + Math.round(k * 2)) * FS, '#9F9AA7'); c.globalAlpha = 1;
  }
}
// una chistorra, tumbada o de pie: tripa roja con brillo y la cuerdecita en las puntas
function chistorra(c, x, y, de_pie = false) {
  if (de_pie) {
    rect(c, x, y, 5, 11, '#100C14'); rect(c, x + 1, y + 1, 3, 9, '#C73F2F'); rect(c, x + 1, y + 2, 1, 7, '#E7877F');
    rect(c, x + 2, y, 1, 1, '#F4EFE6'); rect(c, x + 2, y + 10, 1, 1, '#F4EFE6');
  } else {
    rect(c, x, y, 11, 5, '#100C14'); rect(c, x + 1, y + 1, 9, 3, '#C73F2F'); rect(c, x + 2, y + 1, 7, 1, '#E7877F');
    rect(c, x, y + 2, 1, 1, '#F4EFE6'); rect(c, x + 10, y + 2, 1, 1, '#F4EFE6');
  }
}

const SCENES = [
  {
    lines: [
      { text: '¡Has completado el libro de visitas!', sfx: 'cheer' },
      { text: 'Todos los huéspedes han pasado por El Pino Calcinado y han contado su historia.' },
      { who: 'Manolo', text: 'Charizard… creo que lo hemos conseguido.' },
    ],
    draw(c, t, a, k, now, ks) {
      rect(c, 0, 0, W, H, '#1B2238');
      for (let i = 0; i < 40; i++) rect(c, (i * 61) % W, (i * 37) % 60, 1, 1, Math.floor(t / 400 + i) % 5 ? '#AFB7CF' : '#FFF7BF');
      // el libro de visitas, con pinta de Pokédex
      rect(c, 64, 14, 112, 98, '#100C14'); rect(c, 65, 15, 110, 96, '#C73F2F'); rect(c, 65, 15, 110, 3, '#E2653F');
      disc(c, 80, 28, 7, '#100C14'); disc(c, 80, 28, 6, '#4FB7EF'); rect(c, 78, 25, 2, 2, '#F4EFE6');
      for (const [dx, col] of [[94, '#FF5F5F'], [102, '#FFD74F'], [110, '#6FDF6F']]) { disc(c, dx, 25, 3, '#100C14'); disc(c, dx, 25, 2, col); }
      rect(c, 78, 42, 84, 54, '#100C14'); rect(c, 80, 44, 80, 50, '#9FDFEF');
      text(c, 'LIBRO DE VISITAS', 86, 55, '#283048', 9);
      text(c, `${a.n} / 151`, 94, 74, '#283048', 16);
      if (Math.floor(t / 450) % 2 || k > 0) text(c, '¡COMPLETO!', 98, 88, '#C73F2F', 10);
      chispas(c, t, 70, 20, 100, 80, 12);
      a.manolo.place(38, 118, { dir: DIR.right });
      if (k === 0 || k === 2) a.chari.place(204, 120, { anim: 'Hop', dir: DIR.left }); else a.chari.place(204, 120, { dir: DIR.left });
    },
  },
  {
    lines: [
      { text: 'La posada se hizo famosa en todo Kanto. Las monedas ya no cabían en la caja.', sfx: 'coin' },
      { who: 'Manolo', text: 'Charizard, con todo esto nos da para… para lo que siempre hemos soñado.' },
      { who: 'Charizard', text: '¡Grrraaar!' },
    ],
    draw(c, t, a, k) {
      rect(c, 0, 0, W, H, '#E7C79F');
      for (let x = 0; x < W; x += 12) rect(c, x, 0, 1, 92, '#C7A77F');
      rect(c, 0, 92, W, 43, '#6F4527'); rect(c, 0, 92, W, 1, '#9F6A3F');
      // la mesa llena de montones de monedas, y más que caen del cielo
      rect(c, 82, 80, 76, 6, '#100C14'); rect(c, 83, 80, 74, 4, '#9F6A3F'); rect(c, 88, 86, 4, 12, '#6F4527'); rect(c, 148, 86, 4, 12, '#6F4527');
      for (let p = 0; p < 6; p++) { const alto = 2 + ((p * 3 + k * 2) % 5) + k; for (let h = 0; h < alto; h++) coin(c, 92 + p * 12, 76 - h * 3); }
      saco(c, 70, 100); saco(c, 172, 102); saco(c, 186, 108);
      for (let i = 0; i < 18; i++) { const y = ((t / 7 + i * 47) % 150) - 12, x = (i * 71) % W; coin(c, x, y); }
      a.manolo.place(54, 112, { dir: DIR.right });
      a.chari.place(196, 116, { anim: k === 2 ? 'Hop' : 'Idle', dir: DIR.left });
    },
  },
  {
    lines: [
      { text: 'Una mañana, Manolo y Charizard bajaron al valle con una maleta llena de monedas.' },
      { who: 'Manolo', text: 'Buenos días. Venimos a comprar la fábrica. Entera. Con la furgoneta incluida.' },
      { text: '¡Famadesa tiene dueños nuevos!', sfx: 'cheer' },
    ],
    draw(c, t, a, k, now, ks) {
      sky(c, '#9FD7F7', '#D7F0C7', 56);
      mountains(c, '#8FA7C7', 70, 22, 3);
      rect(c, 0, 92, W, 43, '#A7D78F'); rect(c, 0, 104, W, 10, '#8F97A7'); rect(c, 0, 108, W, 1, '#F4EFE6');
      // la fábrica, con su chimenea y el rótulo
      rect(c, 128, 40, 98, 58, '#100C14'); rect(c, 129, 41, 96, 56, '#C7CFDF');
      for (let x = 129; x < 225; x += 16) { rect(c, x, 34, 16, 7, '#100C14'); rect(c, x + 1, 35, 14, 5, '#8F97A7'); }
      rect(c, 206, 12, 10, 24, '#100C14'); rect(c, 207, 13, 8, 23, '#8F97A7');
      for (let i = 0; i < 4; i++) { const p = (t / 1400 + i / 4) % 1; c.globalAlpha = 0.7 * (1 - p); disc(c, 211 + p * 14, 10 - p * 12, Math.round(2 + p * 4), '#F4EFE6'); c.globalAlpha = 1; }
      rect(c, 150, 46, 50, 22, '#100C14'); rect(c, 151, 47, 48, 20, '#F4EFE6');
      if (a.logo) c.drawImage(a.logo, 153, 49);
      rect(c, 168, 74, 18, 24, '#100C14'); rect(c, 169, 75, 16, 23, '#5F6777');
      for (const wx of [136, 200]) { rect(c, wx, 74, 14, 10, '#100C14'); rect(c, wx + 1, 75, 12, 8, '#9FDFEF'); }
      if (k >= 2) {
        // ¡VENDIDA!: cartel cruzado y confeti
        rect(c, 140, 58, 74, 14, '#100C14'); rect(c, 141, 59, 72, 12, '#C73F2F');
        text(c, 'VENDIDA', 156, 69, '#F4EFE6', 12);
        for (let i = 0; i < 24; i++) { const y = ((t / 9 + i * 29) % 140) - 10; rect(c, (i * 47) % W, y, 2, 2, ['#FFD74F', '#E2577F', '#6FDF6F', '#4FB7EF'][i % 4]); }
      }
      // bajan por el camino, Manolo con la maleta
      const x = k === 0 ? 30 + Math.min(70, ks / 40) : 140;
      const andando = k === 0 && ks < 2800;
      a.manolo.place(x, 106, { anim: andando ? 'Walk' : 'Idle', dir: DIR.right });
      a.chari.place(x - 28, 108, { anim: andando ? 'Walk' : k >= 2 ? 'Hop' : 'Idle', dir: DIR.right });
      a.maleta = { x: x + 8, y: 100 };
    },
    front(c, t, a) {
      const { x, y } = a.maleta;
      rect(c, x, y - 8, 14, 10, '#100C14'); rect(c, x + 1, y - 7, 12, 8, '#6F4527'); rect(c, x + 5, y - 10, 4, 2, '#100C14'); coin(c, x + 7, y - 3);
    },
  },
  {
    lines: [
      { text: 'Esa noche, con Famadesa ya en sus manos, Manolo y Charizard se fueron a dormir.' },
      { text: 'Y empezó a llover chistorra. Sin parar.', sfx: 'cheer' },
      { who: 'Manolo', text: 'Charizard… si esto es un sueño, no me despiertes.' },
      { who: 'Charizard', text: '(Charizard abre la boca y no la vuelve a cerrar en toda la noche.)' },
    ],
    draw(c, t, a, k, now, ks) {
      rect(c, 0, 0, W, H, '#2B2F55');
      for (let x = 0; x < W; x += 16) rect(c, x, 0, 1, 100, '#262A4D');
      // la ventana con la luna
      rect(c, 22, 18, 34, 28, '#100C14'); rect(c, 24, 20, 30, 24, '#1B2238'); disc(c, 42, 30, 5, '#F4EFE6'); rect(c, 38, 20, 1, 24, '#100C14'); rect(c, 24, 31, 30, 1, '#100C14');
      rect(c, 0, 100, W, 35, '#4F3A2F'); rect(c, 0, 100, W, 1, '#6F4527');
      // la cama: cabecero, colchón y almohadas
      rect(c, 60, 52, 124, 50, '#100C14'); rect(c, 62, 54, 120, 46, '#9F6A3F'); rect(c, 66, 58, 112, 2, '#C7873F');
      rect(c, 60, 82, 124, 22, '#100C14'); rect(c, 62, 84, 120, 18, '#F4EFE6');
      rect(c, 70, 78, 40, 9, '#100C14'); rect(c, 71, 79, 38, 7, '#FFFFFF'); rect(c, 134, 78, 40, 9, '#100C14'); rect(c, 135, 79, 38, 7, '#FFFFFF');
      a.manolo.place(92, 92, { anim: 'Sleep', dir: DIR.down });
      a.chari.place(152, 94, { anim: 'Sleep', dir: DIR.down });
      a.desde ??= now;
      if (k === 0) a.desde = now;
    },
    front(c, t, a, k, now) {
      // la manta por delante, hasta el cuello
      rect(c, 60, 92, 124, 14, '#100C14'); rect(c, 62, 93, 120, 12, '#C73F2F');
      for (let x = 66; x < 180; x += 10) rect(c, x, 93, 5, 12, '#D7574F');
      rect(c, 62, 93, 120, 1, '#F4EFE6');
      if (k < 1) return;
      // llueve chistorra: unas caen y otras se van amontonando encima de la manta y por el suelo
      const pasado = now - a.desde;
      const montón = Math.min(36, Math.floor(pasado / 120));   // que se les sigan viendo las caras
      for (let i = 0; i < montón; i++) {
        const x = 58 + ((i * 47) % 124), y = 92 - Math.floor(i / 16) * 3 + ((i * 13) % 3);
        chistorra(c, i % 9 === 0 ? (i * 37) % W : x, i % 9 === 0 ? 118 + (i % 3) * 4 : y, i % 4 === 0);
      }
      for (let i = 0; i < 26; i++) { const y = ((t / 5 + i * 41) % 130) - 12; chistorra(c, (i * 89 + 13) % W, y, i % 3 === 0); }
    },
  },
  {
    lines: [
      { text: 'Desde entonces, en cada paquete de chistorra de Kanto salen dos caras conocidas.' },
      { who: 'Manolo', text: 'Me han sacado favorecido. Charizard dice que a él no le han cogido el perfil bueno.' },
      { who: 'Charizard', text: '(Charizard se come el paquete de muestra. Por si acaso.)' },
    ],
    draw(c, t, a, k) {
      rect(c, 0, 0, W, H, '#2F2A3F');
      rect(c, 0, 112, W, 23, '#6F4527'); rect(c, 0, 112, W, 1, '#9F6A3F');
      // el paquete: cabecera roja, ventana con las chistorras y las dos caras
      rect(c, 18, 12, 204, 104, '#100C14'); rect(c, 20, 14, 200, 100, '#F4EFE6');
      rect(c, 20, 14, 200, 20, '#C73F2F'); rect(c, 20, 33, 200, 1, '#7F1F17');
      text(c, 'CHISTORRA', 30, 30, '#F4EFE6', 16); text(c, 'El Pino Calcinado', 130, 29, '#FFD74F', 9);
      rect(c, 28, 42, 92, 54, '#100C14'); rect(c, 30, 44, 88, 50, '#F7E7D7');
      for (let i = 0; i < 3; i++) {
        const y = 50 + i * 15;
        rect(c, 33, y, 82, 11, '#100C14'); rect(c, 34, y + 1, 80, 9, k === 2 && i === 1 ? '#F7E7D7' : '#C73F2F');
        if (!(k === 2 && i === 1)) { rect(c, 36, y + 2, 76, 1, '#E7877F'); for (let x = 42; x < 110; x += 9) rect(c, x, y + 5, 1, 1, '#FFE7D7'); }
      }
      retrato(c, a.caraM, 128, 44); retrato(c, a.caraC, 174, 44);
      text(c, 'Cachimbita, chistorra y a dormir', 30, 108, '#283048', 9);
      text(c, 'Famadesa', 176, 108, '#C73F2F', 9);
      chispas(c, t, 20, 14, 200, 100, 8);
      a.manolo.place(OFF, OFF, {}); a.chari.place(OFF, OFF, {});
    },
  },
  {
    lines: [
      { text: 'Y la furgoneta sigue subiendo cada mañana al Pino Calcinado. Ahora la conducen ellos.' },
      { who: 'Manolo', text: '¡Charizard, agárrate bien ahí arriba, que viene una curva!' },
    ],
    draw(c, t, a, k) {
      sky(c, '#F7C78F', '#F7E7BF', 58);
      disc(c, 190, 40, 12, '#FFE79F');
      mountains(c, '#B78F9F', 72, 24, 1); mountains(c, '#8F6F8F', 84, 14, 4);
      rect(c, 0, 94, W, 41, '#7FA75F'); rect(c, 0, 104, W, 12, '#8F97A7'); rect(c, 0, 109, W, 1, '#F4EFE6');
      pine(c, 214, 100, t, { burnt: true });
      // la furgoneta cruza la carretera: Manolo al volante y Charizard en el techo
      const x = Math.round(((t / 14) % (W + 200)) - 170);
      furgoFondo(c, x, 118, t, a);
      a.manolo.place(x + (FL + 9) * FS, 118 + (FTOP + 10) * FS + 26, { dir: DIR.right });
      a.chari.place(x + 30 * FS, 118 + FTOP * FS + 2, { anim: k === 1 ? 'Hop' : 'Idle', dir: DIR.right });
      a.furgoX = x;
    },
    front(c, t, a) {
      furgoDelante(c, a.furgoX, 118, t);
    },
  },
  {
    lines: [
      { text: 'Y en la posada, todo sigue igual.' },
      { who: 'Manolo', text: 'Cachimbita, chistorra y a dormir.' },
      { text: 'Gracias por jugar a El Pino Calcinado.' },
    ],
    draw(c, t, a, k) {
      rect(c, 0, 0, W, H, '#141A33');
      for (let i = 0; i < 60; i++) rect(c, (i * 67) % W, (i * 29) % 70, 1, 1, Math.floor(t / 300 + i) % 7 ? '#5F6A9F' : '#F4EFE6');
      disc(c, 200, 26, 9, '#F4EFE6'); disc(c, 197, 24, 8, '#141A33');
      mountains(c, '#232B4F', 86, 20, 2);
      rect(c, 0, 100, W, 35, '#1F2F2A');
      // la posada de noche, con las ventanas encendidas
      rect(c, 110, 58, 84, 44, '#100C14'); rect(c, 111, 59, 82, 42, '#4F3A2F');
      for (let i = 0; i < 12; i++) { const w = 46 - i * 3.8; rect(c, 152 - w, 58 - i * 2.2, w * 2, 3, '#7F2F27'); }   // el tejado
      for (const [wx, wy] of [[120, 66], [146, 66], [172, 66], [120, 82], [172, 82]]) { rect(c, wx, wy, 10, 9, '#100C14'); rect(c, wx + 1, wy + 1, 8, 7, Math.floor(t / 900 + wx) % 6 ? '#FFD77F' : '#FFB347'); }
      rect(c, 146, 84, 12, 17, '#100C14'); rect(c, 147, 85, 10, 16, '#6F4527');
      pine(c, 70, 102, t, { burnt: true });
      a.manolo.place(96, 106, { anim: k >= 1 ? 'Sleep' : 'Idle', dir: DIR.down });
      a.chari.place(208, 108, { anim: k >= 1 ? 'Sleep' : 'Idle', dir: DIR.down });
      if (k >= 2) { text(c, 'FIN', 103, 40, '#100C14', 28); text(c, 'FIN', 101, 38, '#FFB347', 28); }
    },
  },
];

// n: cuántos huéspedes hay en el libro (para la pantalla del principio)
export async function playFinal(n = 151) {
  const [ms, cs, caraM, caraC, logo] = await Promise.all([
    loadSprite('manolo', ['Idle', 'Walk', 'Sleep']),
    loadSprite('0006', ['Idle', 'Walk', 'Sleep', 'Hop']),
    imagen('assets/portraits/manolo/Happy.png'),
    imagen('assets/portraits/0006/Happy.png'),
    imagen('assets/ui/famadesa.png'),
  ]);
  const actors = { chari: new Actor(cs, { offset: 300 }), manolo: new Actor(ms), caraM, caraC, logo, n, maleta: { x: OFF, y: OFF } };
  return playScenes(SCENES, actors, { lastLabel: 'Volver a la posada' });
}
