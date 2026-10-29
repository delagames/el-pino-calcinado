// La intro: de dónde viene Manolo, por qué se llama así la posada y qué pasó con el pino.
// Seis escenas en pixel art (lienzo de 240×135 ampliado) con los sprites del juego y un
// cuadro de texto a lo Pokémon debajo. Cada escena tiene varias frases; lo que pasa en el
// dibujo depende de la frase que se esté leyendo. Se pasa tocando, con Espacio o Intro, y se
// puede saltar entera. El jugador ve la verdad (el pedo); a los huéspedes Manolo les cuenta
// lo del estornudo, y Lapras lo sabe en su tercera visita.
import { loadSprite, Actor, DIR } from './sprites.js';
import { sfx, cry } from './audio.js';

export const W = 240, H = 135;
export const OFF = -999;   // fuera de escena

export function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
export function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); c.fillRect(Math.round(cx - h), Math.round(cy + y), h * 2 + 1, 1); }
}
export function oval(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++) { const h = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry))); c.fillRect(Math.round(cx - h), Math.round(cy + y), h * 2 + 1, 1); }
}
export function sky(c, top, low, horizon = 50) {
  rect(c, 0, 0, W, H, low);
  for (let y = 0; y < horizon; y++) if (y < horizon * 0.6 || y % 2) rect(c, 0, y, W, 1, top);
}
export function mountains(c, col, base, amp, seed) {
  for (let x = 0; x < W; x++) { const h = Math.round(amp * (0.6 + 0.4 * Math.sin(x / 17 + seed) * Math.sin(x / 7 + seed * 2))); rect(c, x, base - h, 1, H, col); }
}
export function text(c, s, x, y, col = '#283048', size = 10) {
  c.font = `${size}px "Jersey 10", monospace`;
  c.fillStyle = col;
  c.fillText(s, x, y);
}
// el pino: verde, ardiendo (de 0 a 1, cuánto arde) o ya calcinado con su brasa
export function pine(c, x, base, t, { burnt = false, fire = 0 } = {}) {
  const trunk = burnt ? '#0F1324' : '#5F3A23', leaf = burnt ? '#0F1324' : '#2F6F3F', leaf2 = '#3F8F4F';
  rect(c, x - 2, base - 56, 4, 56, trunk);
  for (let i = 0; i < 8; i++) {
    const y = base - 52 + i * 6, w = 4 + i * 2.5;
    if (burnt) { rect(c, x - w, y + (i % 2), w, 1, leaf); rect(c, x + 2, y + 1 - (i % 2), w, 1, leaf); }
    else { rect(c, x - w, y, w * 2 + 1, 5, leaf); rect(c, x - w + 2, y, w, 1, leaf2); }
  }
  if (burnt) {
    const beat = 0.5 + 0.5 * Math.sin(t / 590);
    rect(c, x - 1, base - 14, 3, 7, '#9F2F17'); rect(c, x, base - 13, 1, 5, beat > 0.5 ? '#FFB347' : '#E2653F');
  }
  // el fuego sube de abajo arriba por la copa: lenguas que parpadean
  if (fire > 0) for (let i = 0; i < 90; i++) {
    const row = 7 - (i % 9);
    if (row < 0 || row < 8 - fire * 9) continue;
    const w = 4 + row * 2.5, y = base - 52 + row * 6;
    const fx = x - w + ((i * 29 + Math.floor(t / 90) * 7) % Math.ceil(w * 2)), lick = (t / 40 + i * 7) % 8;
    rect(c, fx, y - lick, 3, 3 + (8 - lick) / 2, i % 3 === 0 ? '#FFF7BF' : i % 2 ? '#FFB347' : '#E2653F');
  }
}
// un bocadillo con una exclamación sobre alguien, como en los juegos
export function bubble(c, x, y, ch = '!') {
  rect(c, x - 6, y - 12, 13, 11, '#100C14'); rect(c, x - 5, y - 11, 11, 9, '#F8F8F8'); rect(c, x - 1, y - 2, 3, 2, '#100C14');
  text(c, ch, x - 2, y - 3, '#C73F2F', 10);
}
// Barra de vida a lo combate Pokémon: nombre, nivel y los PS que bajan
function hpBox(c, x, y, name, hp) {
  rect(c, x, y, 80, 21, '#283048'); rect(c, x + 1, y + 1, 78, 19, '#F8F0D8');
  text(c, name, x + 4, y + 9); text(c, 'Nv50', x + 58, y + 9);
  rect(c, x + 14, y + 12, 61, 5, '#283048'); text(c, 'PS', x + 3, y + 18, '#E2653F', 9);
  const col = hp > 0.5 ? '#5FD77F' : hp > 0.2 ? '#F7C73F' : '#E2453F';
  rect(c, x + 15, y + 13, 59 * Math.max(0, hp), 3, col);
}
// pone una animación que empezó en el instante since (el Actor la repetiría: se corta a mano)
function play(actor, anim, dir, x, y, since) {
  actor.place(x, y, { anim, dir });
  actor.offset = -since;
}

// Cada frase: quién habla (nada = narrador), lo que dice y el efecto que suena al empezar.
// draw(c, t, actores, frase, ahora, ms desde que empezó la frase)
const SCENES = [
  {
    lines: [
      { text: 'Hace años, en Pueblo Ceniza, Manolo era el líder del gimnasio de tipo fuego.' },
      { who: 'Manolo', text: '¡Charizard, Lanzallamas!', sfx: 'fuego' },
      { text: 'Él y su Charizard llenaban el gimnasio cada tarde.' },
    ],
    draw(c, t, a, k, now, ks) {
      rect(c, 0, 0, W, H, '#3F1F27');
      for (let x = 10; x < W; x += 44) { rect(c, x, 10, 20, 38, '#C73F2F'); rect(c, x + 7, 20, 6, 10, '#FFB347'); rect(c, x, 48, 20, 2, '#8F2717'); }
      rect(c, 0, 92, W, 43, '#6F4527'); rect(c, 0, 92, W, 1, '#9F6A3F');
      a.manolo.place(84, 100, { dir: DIR.right });
      if (k === 1) {
        play(a.chari, ks < 700 ? 'Shoot' : 'Idle', DIR.right, 120, 102, now - ks);
        if (ks > 250) for (let i = 0; i < 26; i++) {
          const p = ((ks - 250) / 600 + i / 26) % 1, x = 131 + p * 100;
          if (x < 131 + (ks - 250) / 4) rect(c, x, 84 + Math.sin(p * 9 + t / 60) * 3 * p, 3 + p * 5, 3 + p * 4, i % 3 ? '#FFB347' : i % 2 ? '#E2653F' : '#FFF7BF');
        }
      } else {
        a.chari.place(120, 102, { dir: k ? DIR.down : DIR.right });
        for (let i = 0; i < 5; i++) rect(c, 128 + i * 3, 74 - ((t / 70 + i * 4) % 14), 2, 3, i % 2 ? '#FFB347' : '#E2653F');
      }
    },
    // el público aplaude, por delante
    front(c, t) {
      for (let i = 0; i < 22; i++) { const x = 5 + i * 11, j = Math.floor(t / 180 + i) % 2; disc(c, x, 120 - j, 4, '#28315A'); rect(c, x - 4, 123 - j, 9, 12, '#28315A'); if (j) rect(c, x - 6, 114, 2, 4, '#28315A'); }
    },
  },
  {
    lines: [
      { text: 'Ganaba casi siempre. Casi: contra los de agua perdía siempre. Y un día llegó un retador con un Gyarados.' },
      { text: '¡El Gyarados del retador usó Hidrobomba!', sfx: 'agua' },
      { text: '¡Es muy eficaz!', sfx: 'golpe' },
      { text: '¡Charizard se ha debilitado!', sfx: 'sad' },
      { who: 'Manolo', text: '(Desde aquel día, cada vez que Manolo ve un tipo agua se le cierra un ojo.)' },
    ],
    draw(c, t, a, k, now, ks) {
      // campo de combate: cielo, dos peanas de hierba y las barras de vida
      sky(c, '#9FD7F7', '#D7F0C7', 60);
      rect(c, 0, 60, W, 75, '#A7D78F');
      oval(c, 178, 82, 46, 9, '#7FB76F'); oval(c, 178, 81, 42, 7, '#97CF7F');
      oval(c, 66, 124, 52, 10, '#7FB76F'); oval(c, 66, 123, 48, 8, '#97CF7F');
      if (k === 1 && ks < 1100) play(a.gyarados, 'Shoot', DIR.downLeft, 180, 84, now - ks);
      else a.gyarados.place(180, 84, { dir: DIR.downLeft });
      a.manolo.place(OFF, OFF, {});
      // Charizard, de espaldas: quieto, recibiendo el golpe o debilitado
      if (k >= 3) a.chari.place(OFF, OFF, {});
      else if ((k === 1 && ks > 750) || k === 2) {
        play(a.chari, 'Hurt', DIR.upRight, 66, 124, now - (k === 1 ? ks - 750 : ks + 400));
        if (k === 1 && Math.floor(t / 80) % 2) a.chari.place(OFF, OFF, {});   // parpadea al recibir el golpe
      } else a.chari.place(66, 124, { dir: DIR.upRight });
    },
    front(c, t, a, k, now, ks) {
      // la hidrobomba, de la boca de Gyarados a Charizard
      if (k === 1 && ks > 350) {
        const p = Math.min(1, (ks - 350) / 450);
        for (let i = 0; i < 44; i++) {
          const q = i / 44;
          if (q > p || (ks > 1100 && q < (ks - 1100) / 300)) continue;
          const x = 158 - q * 90, y = 48 + q * 50 + Math.sin(q * 20 + t / 40) * 2;
          rect(c, x, y, 5, 4, i % 3 ? '#4F8FDF' : '#BFEFFF');
        }
        if (ks > 750 && ks < 1500) for (let i = 0; i < 8; i++) { const p2 = (ks - 750) / 750; disc(c, 66 + Math.cos(i) * 20 * p2, 102 + Math.sin(i * 2) * 10 * p2 - p2 * 6, 2, '#BFEFFF'); }
      }
      // debilitado: se hunde tras la peana
      if (k === 3 && ks < 700) {
        c.save(); c.beginPath(); c.rect(0, 0, W, 122); c.clip();
        a.chari.place(66, 124 + (ks / 700) * 50, { anim: 'Hurt', dir: DIR.upRight }); a.chari.draw(c, now);
        a.chari.place(OFF, OFF, {});
        c.restore();
      }
      const hp = k <= 1 ? 1 : k === 2 ? 1 - Math.min(1, ks / 900) * 0.92 : 0;
      hpBox(c, 8, 10, 'GYARADOS', 1);
      hpBox(c, 152, 96, 'CHARIZARD', hp);
      if (k === 4 && a.face) {
        // Manolo con el ojo cerrado, en primer plano
        rect(c, 0, 0, W, H, 'rgba(16,12,20,0.6)');
        rect(c, W / 2 - 42, 22, 84, 84, '#FFB347'); rect(c, W / 2 - 41, 23, 82, 82, '#100C14');
        c.drawImage(a.face, W / 2 - 40, 24, 80, 80);
      }
    },
  },
  {
    lines: [
      { text: 'Aquella misma noche colgó la medalla. Subió a la montaña con Charizard, sin rumbo, hasta que se acabó el camino.' },
      { text: 'Charizard llevaba todo el día callado, con la tripa revuelta de los nervios del combate…', sfx: 'tripa' },
    ],
    draw(c, t, a, k) {
      sky(c, '#C7678F', '#FFA76F', 56);
      disc(c, 186, 58, 12, '#FFC787');
      mountains(c, '#6F5F8F', 88, 36, 1);
      mountains(c, '#4F3F6F', 106, 20, 4);
      rect(c, 0, 106, W, 29, '#2F2B3F');
      const x = 30 + ((t / 30) % 200);
      a.manolo.place(x, 118, { anim: 'Walk', dir: DIR.right }); a.chari.place(x - 26, 120, { anim: 'Walk', dir: DIR.right });
    },
    front(c, t, a, k) {
      if (k === 1 && Math.floor(t / 500) % 2) bubble(c, a.chari.x, a.chari.y - 34, '~');
    },
  },
  {
    lines: [
      { text: 'Arriba del todo había un pino precioso, el más alto del monte. Se sentaron a descansar a su lado.' },
      { who: 'Charizard', text: '¡PRRRRRRRT!', sfx: 'pedo' },
      { text: 'Se le escapó. Y la llama de la cola hizo el resto.', sfx: 'fuego' },
      { text: 'El pino ardió entero en un momento. Por la mañana solo quedaba el tronco negro, con una brasa dentro que no se apagaba.' },
      { who: 'Manolo', text: '¡Buaaah, locooo! Se me ha ocurrido una idea: aquí vamos a montar una posada.' },
    ],
    draw(c, t, a, k, now, ks) {
      const day = k >= 3 && (k > 3 || ks > 2600);
      sky(c, day ? '#E7879F' : '#1F2742', day ? '#FFC79F' : '#253058', 60);
      if (!day) { for (let i = 0; i < 34; i++) rect(c, (i * 53) % W, (i * 29) % 60, 1, 1, '#F4EFE6'); disc(c, 34, 22, 8, '#F4EFE6'); }
      else disc(c, 40, 56, 12, '#FFE7A7');
      mountains(c, day ? '#8F6F8F' : '#28315A', 104, 22, 2);
      rect(c, 0, 104, W, 31, day ? '#3F3F4F' : '#161B31');
      const fire = k === 2 ? Math.min(1, Math.max(0, ks - 650) / 800) : k === 3 && !day ? 1 : 0;
      pine(c, 182, 112, t, { burnt: day, fire });
      if (fire) rect(c, 0, 0, W, H, `rgba(255,140,60,${fire * 0.14})`);
      // Charizard de espaldas al pino (se le escapa por detrás) y Manolo a la izquierda
      if (k === 2 && ks < 600) play(a.chari, 'Hurt', DIR.left, 140, 116, now - ks);
      else a.chari.place(140, 116, { dir: k >= 3 ? DIR.right : DIR.left });
      a.manolo.place(76, 114, { dir: DIR.right });
    },
    front(c, t, a, k, now, ks) {
      // la nube del pedo, que sale por detrás
      if (k === 1 || (k === 2 && ks < 500)) {
        const p = k === 1 ? Math.min(1, ks / 700) : 1;
        c.globalAlpha = 0.8;
        for (let i = 0; i < 7; i++) {
          const wob = Math.sin(t / 120 + i) * 1.5;
          disc(c, 153 + i * 3 * p + wob, 110 - (i % 3) * 3 * p, Math.round(2 + p * (2 + (i % 3))), i % 2 ? '#9FAF5F' : '#B7C77F');
        }
        c.globalAlpha = 1;
      }
      // la llama de la cola la prende: bola de fuego hasta el pino
      if (k === 2 && ks > 300 && ks < 900) {
        const p = (ks - 300) / 600, x = 156 + p * 26, y = 106 - p * 14;
        disc(c, x, y, Math.round(4 + p * 4), '#E2653F'); disc(c, x, y, Math.round(2 + p * 3), '#FFB347'); disc(c, x, y, 1, '#FFF7BF');
      }
      if (k === 1) { bubble(c, 140, 78, '!'); if (ks > 400) bubble(c, 76, 76, '?'); }
      if (k === 2 && ks < 900) bubble(c, 140, 78, '!');
      if (k === 3 && ks < 2600) { bubble(c, 76, 76, '!'); if (ks > 700) bubble(c, 140, 78, '…'); }
      if (k === 4 && Math.floor(t / 300) % 2) bubble(c, 76, 76, '!');
    },
  },
  {
    lines: [
      { text: 'Y la montaron. Con sus manos, al lado del pino, y la llamaron como él: El Pino Calcinado.' },
    ],
    draw(c, t, a) {
      sky(c, '#4F97E7', '#B7E3F7', 60);
      mountains(c, '#87A7D7', 88, 30, 1);
      rect(c, 0, 106, W, 29, '#3F6F2F');
      pine(c, 44, 112, t, { burnt: true });
      // la posada, de dos plantas, con su tejado rojo y su cartel
      const k = Math.min(1, (t % 7000) / 3500);
      const h = Math.round(52 * k);
      rect(c, 84, 110 - h, 96, h, '#4F2F1F');
      if (k >= 1) {
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { rect(c, 92 + i * 30, 66 + j * 22, 22, 16, '#EFD7AF'); rect(c, 100 + i * 30, 70 + j * 22, 7, 6, '#77B7EF'); }
        for (let y = 0; y < 20; y++) rect(c, 132 - y * 3 - 4, 58 - 20 + y, y * 6 + 8, 1, y % 4 === 3 ? '#7F3323' : '#AF4F37');
        rect(c, 62, 86, 16, 9, '#9F6A3F'); rect(c, 64, 88, 12, 1, '#F4EFE6'); rect(c, 64, 91, 8, 1, '#F4EFE6');
      } else for (let i = 0; i < 4; i++) rect(c, 90 + ((t / 7 + i * 23) % 84), 110 - h - 3, 2, 2, '#C7A77F');   // virutas: obra
      a.manolo.place(200, 118, { dir: DIR.left }); a.chari.place(222, 120, { dir: DIR.left });
    },
  },
  {
    lines: [
      { who: 'Manolo', text: 'Aquí la regla es una sola: ¡cachimbita, chistorra y a dormir!' },
      { text: 'A los huéspedes, eso sí, Manolo les cuenta que lo del pino fue un estornudo. Charizard le sigue el rollo.' },
      { text: 'Ahora la posada es tuya. La meta: que pasen por aquí los 151 Pokémon de Kanto y llenar el libro de visitas con sus historias.' },
      { text: 'Que no falte la chistorra… y ojo con los de agua.' },
    ],
    draw(c, t, a, k) {
      rect(c, 0, 0, W, H, '#1B2238');
      rect(c, 0, 100, W, 35, '#4F2F1F');
      // la cachimba humeando y la chistorra en la mesa
      rect(c, 88, 82, 64, 18, '#6F4527'); rect(c, 88, 82, 64, 1, '#9F6A3F');
      rect(c, 100, 72, 8, 10, '#5F6777'); rect(c, 103, 64, 2, 8, '#8F97A7');
      for (let i = 0; i < 3; i++) { const p = ((t / 1200) + i / 3) % 1; c.globalAlpha = 0.6 * (1 - p); disc(c, 104 + Math.sin(p * 6) * 3, 60 - p * 30, Math.round(2 + p * 3), '#AFB7CF'); c.globalAlpha = 1; }
      rect(c, 120, 77, 20, 5, '#100C14'); rect(c, 121, 78, 18, 3, '#C73F2F');
      if (k < 2) { a.manolo.place(66, 106, { dir: DIR.right }); a.chari.place(176, 108, { dir: DIR.left }); }
      else { a.manolo.place(66, 106, { anim: 'Sleep', dir: DIR.down }); a.chari.place(176, 108, { anim: 'Sleep', dir: DIR.down }); }
    },
    front(c, t, a, k) {
      if (k === 1 && Math.floor(t / 700) % 2) bubble(c, 176, 76, '…');
      if (k === 2) for (let i = 0; i < 3; i++) { const p = ((t / 900) + i / 3) % 1; rect(c, 186 + p * 8, 82 - p * 22, 3, 1, '#F4EFE6'); }
    },
  },
];

export const imagen = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

export async function playIntro() {
  const [ms, cs, gs] = await Promise.all([
    loadSprite('manolo', ['Idle', 'Walk', 'Sleep']),
    loadSprite('0006', ['Idle', 'Walk', 'Sleep', 'Shoot', 'Hurt']),
    loadSprite('0130', ['Idle', 'Shoot']),
  ]);
  const face = await imagen('assets/portraits/manolo/Pain.png');
  // el orden es el de dibujo: Gyarados detrás, luego Charizard y Manolo delante
  const actors = { gyarados: new Actor(gs), chari: new Actor(cs, { offset: 300 }), manolo: new Actor(ms), face };
  // el Gyarados solo sale en el combate
  return playScenes(SCENES, actors, { lastLabel: 'Abrir la posada', each: a => a.gyarados.place(OFF, OFF, {}) });
}

// Reproduce una historia en escenas (la intro, el final): lienzo, cuadro de texto y botones.
// actors: los sprites (Actor) que se dibujan, más lo que necesiten las escenas
export async function playScenes(SCENES, actors, { lastLabel = 'Seguir ▸', each = () => {} } = {}) {
  const sprites = Object.values(actors).filter(a => a instanceof Actor);
  for (const a of sprites) a.place(OFF, OFF, {});
  try { await document.fonts.load('10px "Jersey 10"'); } catch { /* sin la fuente se ve igual */ }
  const box = document.createElement('section');
  box.id = 'intro';
  box.innerHTML = `<canvas width="${W}" height="${H}"></canvas>
    <div class="intro-box"><strong class="intro-who"></strong><p class="intro-text"></p><span class="intro-more">▼</span></div>
    <div class="intro-buttons"><button class="secondary intro-skip">Saltar</button><button class="intro-next">Seguir ▸</button></div>`;
  document.body.appendChild(box);
  const canvas = box.querySelector('canvas'), c = canvas.getContext('2d');
  const textEl = box.querySelector('.intro-text'), whoEl = box.querySelector('.intro-who'), moreEl = box.querySelector('.intro-more');
  const fit = () => {
    // a múltiplos enteros si cabe; si no (móvil en vertical), lo que quepa
    const raw = Math.min((window.innerWidth - 24) / W, (window.innerHeight - 230) / H);
    const S = raw >= 2 ? Math.floor(raw) : Math.max(0.5, raw);
    canvas.style.width = `${Math.round(W * S)}px`; canvas.style.height = `${Math.round(H * S)}px`;
  };
  fit();
  window.addEventListener('resize', fit);
  let i = 0, k = 0, t0 = performance.now(), k0 = t0, typed = 0, done = false;
  const line = () => SCENES[i].lines[k];
  const onLine = () => { const l = line(); if (l.sfx) sfx(l.sfx); else if (l.who === 'Charizard') cry('0006'); };
  return new Promise(resolve => {
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
      delete window.__intro;
      box.remove();
      resolve();
    };
    const next = () => {
      if (typed < line().text.length) { typed = line().text.length; return; }   // primero se completa el texto
      k += 1; typed = 0; k0 = performance.now();
      if (k >= SCENES[i].lines.length) {
        i += 1; k = 0; t0 = k0;
        if (i >= SCENES.length) return finish();
      }
      onLine();
      const last = i === SCENES.length - 1 && k === SCENES[i].lines.length - 1;
      box.querySelector('.intro-next').textContent = last ? lastLabel : 'Seguir ▸';
    };
    const onKey = e => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); next(); } else if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', next);
    box.querySelector('.intro-box').addEventListener('click', next);
    box.querySelector('.intro-next').addEventListener('click', next);
    box.querySelector('.intro-skip').addEventListener('click', finish);
    // para las pruebas: saltar a una frase concreta
    window.__intro = { ir(e, f) { i = e; k = f; t0 = k0 = performance.now(); typed = 999; onLine(); }, get pos() { return [i, k]; } };
    let antes = 0, escrito = null;
    function frame(now) {
      if (done) return;
      requestAnimationFrame(frame);
      if (now - antes < 30) return;   // ~30 fps bastan (como en la posada)
      antes = now;
      const t = now - t0, ks = now - k0;
      const sc = SCENES[i];
      c.imageSmoothingEnabled = false;
      each(actors);
      sc.draw(c, t, actors, k, now, ks);
      for (const a of sprites) if (a.x > OFF) a.draw(c, now);
      sc.front?.(c, t, actors, k, now, ks);
      // fundido de entrada en cada escena
      if (t < 400) { c.globalAlpha = 1 - t / 400; rect(c, 0, 0, W, H, '#100C14'); c.globalAlpha = 1; }
      const l = line();
      typed = Math.min(l.text.length, Math.max(typed, Math.floor(ks / 26)));
      // el cuadro de texto solo se toca cuando cambia algo
      const vis = typed >= l.text.length && Math.floor(now / 400) % 2 ? 'visible' : 'hidden';
      const clave = `${l.who}|${typed}|${l.text.length}|${vis}|${i}|${k}`;
      if (clave !== escrito) {
        escrito = clave;
        whoEl.textContent = l.who || '';
        whoEl.classList.toggle('hidden', !l.who);
        textEl.textContent = l.text.slice(0, typed);
        moreEl.style.visibility = vis;
      }
    }
    onLine();
    requestAnimationFrame(frame);
  });
}
