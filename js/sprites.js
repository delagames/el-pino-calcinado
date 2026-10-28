// Carga de hojas de SpriteCollab con su AnimData.xml; vale igual para Pokémon y para
// Manolo (assets/sprites/<id>/). Cada hoja tiene una fila por dirección y un
// fotograma por columna; las duraciones van en ticks de 1/60 s.

export const DIR = { down: 0, downRight: 1, right: 2, upRight: 3, up: 4, upLeft: 5, left: 6, downLeft: 7 };

// En SpriteCollab los pies quedan 6 px por debajo del centro del fotograma
const FEET = 6;
const SHADOW_W = [8, 12, 18];
const BUDDY_DX = 11;   // separación del acompañante

const cache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

export function loadSprite(id, names = ['Idle', 'Sleep', 'Walk']) {
  const key = `${id}:${names.join(',')}`;
  if (!cache.has(key)) cache.set(key, fetchSprite(id, names));
  return cache.get(key);
}

async function fetchSprite(id, names) {
  const base = `assets/sprites/${id}`;
  const res = await fetch(`${base}/AnimData.xml`);
  if (!res.ok) throw new Error(`Falta ${base}/AnimData.xml`);
  const xml = new DOMParser().parseFromString(await res.text(), 'application/xml');
  const byName = {};
  for (const node of xml.querySelectorAll('Anim')) byName[node.querySelector('Name').textContent] = node;
  const anims = {};
  for (const name of names) {
    let node = byName[name];
    if (!node) continue;
    const copy = node.querySelector('CopyOf');
    if (copy) node = byName[copy.textContent];
    const sheet = node.querySelector('Name').textContent;
    const durations = [...node.querySelectorAll('Duration')].map(d => +d.textContent);
    const img = await loadImage(`${base}/${sheet}-Anim.png`);
    const fw = +node.querySelector('FrameWidth').textContent;
    const fh = +node.querySelector('FrameHeight').textContent;
    anims[name] = { img, fw, fh, durations, total: durations.reduce((a, b) => a + b, 0), rows: img.height / fh };
  }
  const shadow = +(xml.querySelector('ShadowSize')?.textContent ?? 1);
  return { id, anims, shadow };
}

// Le pone al actor su acompañante (de guests.json: «acompanante»), que le sigue a todas partes
export async function addBuddy(actor, id, names = ['Idle', 'Sleep', 'Walk']) {
  if (!id) return actor;
  actor.buddy = new Actor(await loadSprite(id, names), { offset: actor.offset + 260 });
  return actor;
}

export function portraitUrl(id, emotion = 'Normal') {
  return `assets/portraits/${id}/${emotion}.png`;
}

// Un personaje puesto en la escena: qué sprite, qué animación, hacia dónde mira y dónde
// están sus pies (en píxeles nativos de la vista).
export class Actor {
  constructor(sprite, { anim = 'Idle', dir = DIR.down, x = 0, y = 0, nombre = '', nota = '', offset = 0 } = {}) {
    Object.assign(this, { sprite, anim, dir, x, y, nombre, nota, offset });
    this.goal = null;      // a dónde camina
    this.mood = null;      // icono encima: 'pide', 'espera', 'contento', 'triste'
    this.selected = false;
    this.last = null;
  }

  get animData() {
    return this.sprite.anims[this.anim] || this.sprite.anims.Idle;
  }

  // Camina hasta (x, y) y al llegar se queda quieto mirando en dir; luego llama a then
  walkTo(x, y = this.y, { dir = DIR.down, then = null, speed = 32 } = {}) {
    this.goal = { x, y, dir, then, speed };
  }

  place(x, y, { anim = 'Idle', dir = DIR.down } = {}) {
    Object.assign(this, { x, y, anim, dir, goal: null });
  }

  update(ms) {
    const dt = this.last == null ? 0 : Math.min(100, ms - this.last);
    this.last = ms;
    const g = this.goal;
    if (!g) return;
    const dx = g.x - this.x, dy = g.y - this.y, d = Math.hypot(dx, dy);
    const step = g.speed * dt / 1000;
    if (d <= step) {
      this.place(g.x, g.y, { dir: g.dir });
      g.then?.(this);
      return;
    }
    this.x += dx / d * step;
    this.y += dy / d * step;
    this.anim = 'Walk';
    this.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? DIR.right : DIR.left) : (dy > 0 ? DIR.down : DIR.up);
  }

  frame(ms) {
    const a = this.animData;
    let tick = Math.floor((ms + this.offset) * 60 / 1000) % a.total;
    let col = 0;
    while (tick >= a.durations[col]) tick -= a.durations[col++];
    return { a, col, row: Math.min(this.dir, a.rows - 1) };
  }

  // Caja aproximada del cuerpo, para señalarlo con el ratón (con su acompañante, si lo hay)
  bounds() {
    const a = this.animData;
    const b = { x: this.x - a.fw / 2 + 4, y: this.y - FEET - a.fh / 2 + 4, w: a.fw - 8, h: a.fh / 2 + FEET - 2 };
    if (!this.buddy) return b;
    const bx = this.x + this.buddySide() * BUDDY_DX;
    const x0 = Math.min(b.x, bx - 8), x1 = Math.max(b.x + b.w, bx + 8);
    return { ...b, x: x0, w: x1 - x0 };
  }

  // El acompañante (el Poliwag de Marinilla) va a su lado, detrás según hacia dónde mira
  buddySide() {
    return this.dir === DIR.right || this.dir === DIR.downRight || this.dir === DIR.upRight ? -1 : 1;
  }

  draw(c, ms) {
    if (this.buddy) {
      const b = this.buddy;
      Object.assign(b, { x: this.x + this.buddySide() * BUDDY_DX, y: this.y + 1, dir: this.dir,
        anim: b.sprite.anims[this.anim] ? this.anim : 'Idle' });
      b.draw(c, ms);
    }
    const { a, col, row } = this.frame(ms);
    const sw = SHADOW_W[this.sprite.shadow] ?? 12;
    c.globalAlpha = 0.3;
    c.fillStyle = '#000000';
    c.fillRect(Math.round(this.x - sw / 2 + 1), Math.round(this.y - 1), sw - 2, 3);
    c.fillRect(Math.round(this.x - sw / 2), Math.round(this.y), sw, 1);
    c.globalAlpha = 1;
    c.drawImage(a.img, col * a.fw, row * a.fh, a.fw, a.fh,
      Math.round(this.x - a.fw / 2), Math.round(this.y - FEET - a.fh / 2), a.fw, a.fh);
  }
}
