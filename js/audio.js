// Música y efectos, sintetizados con WebAudio (sin archivos de sonido). La música es
// un chiptune tranquilo que cambia con la hora del día; los efectos son cortos y suaves.
// El audio arranca con el primer toque del jugador, como exigen los navegadores.

const PREF = 'el-pino-calcinado-audio';
let ctx = null, master, musicBus, sfxBus, rainNode = null, sizzleGain = null;
let prefs = { music: true, sfx: true };
let mood = 'manana', timer = null, nextBar = 0, bar = 0;

try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREF) || '{}') }; } catch { /* sin almacenamiento */ }

function savePrefs() {
  try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
}

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.22 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 0.5 : 0; sfxBus.connect(master);
  }
  // «suspended» o, en iPhone, «interrupted» (una llamada, otra app, la pantalla bloqueada): se reanuda
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

// Cualquier toque despierta el audio (el primero lo enciende; los siguientes lo reaniman si el móvil
// lo había parado), y también al volver a la pestaña o a la app
const despertar = () => { if (ensure() && !timer) startMusic(); };
window.addEventListener('pointerdown', despertar);
window.addEventListener('keydown', despertar);
document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx) despertar(); });
window.addEventListener('pageshow', () => { if (ctx) despertar(); });

export function getPrefs() { return { ...prefs }; }

export function setMusic(on) {
  prefs.music = on; savePrefs();
  if (ensure()) musicBus.gain.setTargetAtTime(on ? 0.22 : 0, ctx.currentTime, 0.1);
}

export function setSfx(on) {
  prefs.sfx = on; savePrefs();
  if (ensure()) sfxBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
}

// ---------- música ----------

const MIDI = n => 440 * 2 ** ((n - 69) / 12);
// Por hora: tempo (negras por minuto), progresión (grados sobre do) y si lleva melodía
const MOODS = {
  manana: { bpm: 84, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: true },
  dia: { bpm: 96, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], lead: true },
  tarde: { bpm: 76, chords: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]], lead: true },
  noche: { bpm: 62, chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], lead: false },
  cocina: { bpm: 112, chords: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]], lead: true },
  // Los eventos (las excursiones), cada uno con su tema. Además de lo de arriba:
  // beats (partes por compás), sub (notas del arpegio por parte), root (nota base), bass (vals, paso,
  // pedal, oompa), arp (qué nota del acorde en cada subdivisión; null sin arpegio), arpType, leadType,
  // scale (para la melodía al azar), melodia (compases fijos: semitonos sobre root+24 en corcheas,
  // null es silencio) y drum (k bombo, s caja, h charles, t timbal, . nada; una letra por subdivisión)
  feria: { bpm: 168, beats: 3, root: 48, bass: 'vals', arp: null, leadType: 'square', leadVol: 0.1,
    chords: [[0, 4, 7], [7, 11, 14], [5, 9, 12], [0, 4, 7]],
    melodia: [[7, null, 4, 7, 12, null], [11, null, 7, 11, 14, null], [9, null, 5, 9, 12, null], [7, 5, 4, 2, 0, null]] },
  playa: { bpm: 104, root: 50, leadType: 'triangle', arpType: 'triangle', drum: 'k.hhk.hh', scale: [0, 2, 4, 7, 9, 12, 14],
    chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]] },
  acuatico: { bpm: 104, beats: 3, root: 53, bass: 'vals', arpType: 'sine', leadType: 'sine', leadVol: 0.14,
    chords: [[0, 4, 7], [9, 12, 16], [2, 5, 9], [7, 11, 14]],
    melodia: [[12, null, 14, 16, null, null], [19, null, 16, 12, null, null], [14, null, 12, 9, null, null], [7, null, null, null, null, null]] },
  oeste: { bpm: 76, root: 45, bass: 'paso', arp: null, leadType: 'square', leadVol: 0.09, drum: 't..t.t..',
    chords: [[0, 3, 7], [0, 3, 7], [-2, 2, 5], [-5, -1, 2]],
    melodia: [[0, null, null, 7, null, null, 5, 3], [0, null, null, null, null, null, null, null], [0, null, 3, 5, 7, null, 10, null], [7, null, null, null, 5, 3, 2, null]] },
  verbena: { bpm: 120, root: 50, bass: 'oompa', arp: null, leadType: 'sawtooth', leadVol: 0.06, drum: 'k.s.k.s.',
    chords: [[0, 4, 7], [7, 11, 14], [7, 11, 14], [0, 4, 7]],
    melodia: [[12, null, 11, 12, 14, null, 12, null], [11, null, 9, 11, 7, null, null, null], [7, 9, 11, 12, 14, null, 17, null], [16, 14, 12, null, null, null, null, null]] },
  puntolimpio: { bpm: 112, sub: 4, root: 48, arp: [0, 2, 1, 2], arpType: 'square', drum: 'k..hk.h.k..hk.hh', scale: [0, 2, 4, 5, 7, 9, 12],
    chords: [[0, 4, 7], [0, 5, 9], [2, 7, 11], [0, 4, 7]] },
  visitasrocket: { bpm: 96, root: 45, bass: 'paso', arp: null, leadType: 'square', leadVol: 0.08, drum: 'h.h.h.hs',
    chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-1, 2, 7]],
    melodia: [[0, null, 3, null, 6, null, 7, null], [6, null, 3, null, 0, null, null, null], [0, 1, 0, null, 3, 4, 3, null], [7, null, 6, null, 0, null, null, null]] },
  dojo: { bpm: 96, root: 50, arp: null, leadType: 'triangle', drum: 'k...k.k.', scale: [0, 1, 5, 7, 8, 12, 13],
    chords: [[0, 7, 12], [0, 7, 12], [-2, 5, 10], [0, 7, 12]] },
  psiquicos: { bpm: 66, root: 48, arpType: 'sine', leadType: 'sine', scale: [0, 2, 4, 6, 8, 10, 12],
    chords: [[0, 4, 8], [2, 6, 10], [0, 4, 8], [-2, 2, 6]] },
  vendimia: { bpm: 132, beats: 3, root: 50, bass: 'pedal', arp: null, leadType: 'square', leadVol: 0.08, drum: 'k.hk.h', scale: [0, 2, 4, 5, 7, 9, 11, 12],
    chords: [[0, 4, 7], [-2, 2, 5], [0, 4, 7], [7, 11, 14]] },
  electricistas: { bpm: 126, sub: 4, root: 45, arp: [0, 1, 2, 1], arpType: 'sawtooth', lead: false, drum: 'k.h.k.h.k.h.k.hh',
    chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]] },
  fosiles: { bpm: 72, root: 45, arpType: 'triangle', leadType: 'triangle', drum: 't..t..t.', scale: [0, 3, 5, 7, 10, 12],
    chords: [[0, 3, 7], [-4, 0, 3], [0, 3, 7], [-5, -2, 2]] },
  pajaros: { bpm: 132, root: 45, leadType: 'square', leadVol: 0.1, drum: 'k.s.k.ss',
    chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]],
    melodia: [[12, null, 12, 15, 19, null, 17, 15], [17, null, 15, null, 12, null, null, null], [14, 15, 17, null, 19, null, 22, null], [19, null, null, null, null, null, null, null]] },
};
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

function note(freq, start, dur, { type = 'triangle', vol = 0.3, bus = musicBus, attack = 0.01 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(bus);
  o.start(start); o.stop(start + dur + 0.05);
}

// La percusión: ruido filtrado (caja, charles) o un seno que cae de tono (bombo, timbal)
let noiseBuf = null;
function drum(kind, t) {
  if (kind === 'k' || kind === 't') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const [f0, f1, d, v] = kind === 'k' ? [130, 42, 0.14, 0.5] : [190, 90, 0.2, 0.35];
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
    return;
  }
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
    const dd = noiseBuf.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  const [freq, d, v] = kind === 's' ? [1200, 0.13, 0.22] : [6500, 0.04, 0.1];
  src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f); f.connect(g); g.connect(musicBus); src.start(t); src.stop(t + d + 0.02);
}

function scheduleBar(t0) {
  const m = MOODS[mood] || MOODS.dia;
  const beat = 60 / m.bpm, beats = m.beats || 4, sub = m.sub || 2;
  const chord = m.chords[bar % m.chords.length];
  const root = m.root ?? 48;
  const bajo = n => MIDI(root + n - 12);
  // bajo: la tónica en las partes fuertes (o vals, paso, pedal…)
  if (m.bass === 'vals') {
    note(bajo(chord[0]), t0, beat * 0.9, { vol: 0.35 });
    for (let i = 1; i < beats; i++) for (const n of chord.slice(1)) note(MIDI(root + n), t0 + i * beat, beat * 0.4, { type: 'square', vol: 0.04 });
  } else if (m.bass === 'oompa') {
    for (let i = 0; i < beats; i++) {
      if (i % 2) for (const n of chord) note(MIDI(root + n), t0 + i * beat, beat * 0.35, { type: 'square', vol: 0.035 });
      else note(bajo(chord[i % 4 ? 2 : 0]), t0 + i * beat, beat * 0.6, { vol: 0.35 });
    }
  } else if (m.bass === 'paso') {
    for (let i = 0; i < beats; i++) note(bajo(chord[[0, 1, 2, 1][i % 4]]), t0 + i * beat, beat * 0.7, { vol: 0.3 });
  } else if (m.bass === 'pedal') {
    note(bajo(0), t0, beat * beats, { type: 'sawtooth', vol: 0.05, attack: 0.05 });
    note(bajo(7), t0, beat * beats, { type: 'sawtooth', vol: 0.03, attack: 0.05 });
  } else {
    note(bajo(chord[0]), t0, beat * 1.8, { vol: 0.35 });
    if (beats > 2) note(bajo(chord[0]), t0 + beat * 2, beat * 1.8, { vol: 0.28 });
  }
  // arpegio suave en corcheas (o en semicorcheas)
  if (m.arp !== null) {
    const pat = m.arp || [0, 1, 2, 1];
    for (let i = 0; i < beats * sub; i++) {
      note(MIDI(root + 12 + chord[pat[i % pat.length]]), t0 + i * beat / sub, beat / sub * 0.9, { type: m.arpType || 'square', vol: mood === 'noche' ? 0.04 : 0.06 });
    }
  }
  // la melodía: la de su tema si la tiene; si no, al azar sobre su escala, repetida cada cuatro compases
  const lt = { type: m.leadType || 'triangle', vol: m.leadVol || 0.12 };
  if (m.melodia) {
    const comp = m.melodia[bar % m.melodia.length];
    comp.forEach((n, i) => {
      if (n == null) return;
      let len = 1;
      while (i + len < comp.length && comp[i + len] == null) len++;
      note(MIDI(root + 24 + n), t0 + i * beat / 2, beat / 2 * len * 0.9, lt);
    });
  } else if (m.lead !== false) {
    const escala = m.scale || PENTA;
    let seed = (bar % 4) * 97 + 13;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < beats; i++) {
      if (rnd() < 0.3) continue;
      note(MIDI(root + 24 + escala[Math.floor(rnd() * escala.length)]), t0 + i * beat, beat * 0.9, lt);
    }
  }
  if (m.drum) [...m.drum].forEach((k, i) => { if (k !== '.') drum(k, t0 + i * beat * beats / m.drum.length); });
  bar += 1;
  return beat * beats;
}

function startMusic() {
  if (timer || !ctx) return;
  nextBar = ctx.currentTime + 0.1;
  timer = setInterval(() => {
    // si el audio estuvo parado un rato, no se intenta recuperar lo perdido: se sigue desde ahora
    if (nextBar < ctx.currentTime - 1) nextBar = ctx.currentTime + 0.05;
    while (nextBar < ctx.currentTime + 0.6) nextBar += scheduleBar(nextBar);
  }, 150);
}

// Cambia la música según la hora del día (o «cocina», o el evento que está pasando: «feria», «dojo»…)
export function setMood(m) {
  if (m === mood) return;
  mood = m;
  bar = 0;
}

// ---------- lluvia y chisporroteo (ruido) ----------

function noiseSource() {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

export function setRain(on) {
  if (!ensure()) return;
  if (on && !rainNode) {
    const src = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.6;
    g.gain.value = 0.08;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start();
    rainNode = { src, g };
  } else if (!on && rainNode) {
    rainNode.src.stop(); rainNode = null;
  }
}

// Chisporroteo de la cocina: más fuerte cuanto más llama (0-1); null lo apaga
export function sizzle(level) {
  if (!ctx) return;
  if (level == null) { if (sizzleGain) { sizzleGain.src.stop(); sizzleGain = null; } return; }
  if (!sizzleGain) {
    const src = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 2500;
    g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start();
    sizzleGain = { src, g };
  }
  sizzleGain.g.gain.setTargetAtTime(0.03 + level * 0.12, ctx.currentTime, 0.05);
}

// ---------- efectos ----------

export function sfx(name) {
  if (!ensure() || !prefs.sfx) return;
  const t = ctx.currentTime;
  const S = { bus: sfxBus };
  if (name === 'tap') note(MIDI(84), t, 0.06, { type: 'square', vol: 0.12, ...S });
  else if (name === 'bell') { note(MIDI(88), t, 0.8, { type: 'sine', vol: 0.3, ...S }); note(MIDI(95), t, 0.6, { type: 'sine', vol: 0.12, ...S }); }
  else if (name === 'coin') { note(MIDI(83), t, 0.08, { type: 'square', vol: 0.15, ...S }); note(MIDI(88), t + 0.08, 0.25, { type: 'square', vol: 0.15, ...S }); }
  else if (name === 'van') { note(MIDI(67), t, 0.18, { type: 'sawtooth', vol: 0.12, ...S }); note(MIDI(64), t + 0.22, 0.25, { type: 'sawtooth', vol: 0.12, ...S }); }
  else if (name === 'cheer') [0, 4, 7, 12].forEach((n, i) => note(MIDI(72 + n), t + i * 0.08, 0.2, { type: 'square', vol: 0.1, ...S }));
  else if (name === 'sad') [7, 4, 0].forEach((n, i) => note(MIDI(64 + n), t + i * 0.14, 0.3, { type: 'triangle', vol: 0.15, ...S }));
  // los de la intro
  else if (name === 'fuego') { sweep(180, 60, t, 0.7, { type: 'sawtooth', vol: 0.1, vib: 40 }); sweep(900, 200, t, 0.5, { type: 'square', vol: 0.03, vib: 90 }); }
  else if (name === 'agua') { for (let i = 0; i < 7; i++) sweep(300 + i * 90, 900 + i * 60, t + i * 0.06, 0.1, { type: 'sine', vol: 0.1 }); sweep(1200, 400, t + 0.3, 0.6, { type: 'triangle', vol: 0.05, vib: 60 }); }
  else if (name === 'golpe') { sweep(220, 50, t, 0.25, { type: 'square', vol: 0.18 }); sweep(160, 40, t + 0.04, 0.3, { type: 'sawtooth', vol: 0.1 }); }
  else if (name === 'tripa') { sweep(90, 140, t, 0.35, { type: 'triangle', vol: 0.18, vib: 18 }); sweep(120, 70, t + 0.4, 0.4, { type: 'triangle', vol: 0.16, vib: 25 }); }
  else if (name === 'pedo') { sweep(110, 75, t, 0.25, { type: 'sawtooth', vol: 0.16, vib: 30 }); sweep(95, 60, t + 0.22, 0.9, { type: 'sawtooth', vol: 0.16, vib: 45, f2: 85 }); }
}

// ---------- gritos de los Pokémon y la canción de Jigglypuff ----------

// Un tono que se desliza de f0 a f1 (y vuelta a f2 si se da), con vibrato opcional
function sweep(f0, f1, start, dur, { type = 'square', vol = 0.12, f2 = null, vib = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  if (f2 == null) o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  else { o.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.5); o.frequency.exponentialRampToValueAtTime(f2, start + dur); }
  if (vib) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = 7; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency);
    l.start(start); l.stop(start + dur + 0.05);
  }
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(sfxBus);
  o.start(start); o.stop(start + dur + 0.05);
}

// Cada Pokémon con su grito (inventado, en chiptune), por el número de su sprite
const CRIES = {
  '0006': t => { sweep(190, 90, t, 0.5, { type: 'sawtooth', vol: 0.14, vib: 12 }); sweep(120, 70, t + 0.05, 0.45, { type: 'square', vol: 0.06 }); },     // Charizard: gruñido
  '0066': t => { sweep(330, 300, t, 0.1); sweep(500, 440, t + 0.13, 0.16); },                                               // Machop: «¡ma-chop!»
  '0039': t => sweep(880, 1320, t, 0.45, { type: 'sine', vol: 0.16, f2: 990, vib: 20 }),                                    // Jigglypuff: «puuu-rin»
  '0143': t => sweep(140, 70, t, 0.9, { type: 'triangle', vol: 0.2, vib: 4 }),                                              // Snorlax: bostezo
  '0058': t => { sweep(620, 380, t, 0.1); sweep(620, 360, t + 0.16, 0.12); },                                               // Growlithe: dos ladridos
  '0007': t => [0, 0.08, 0.16].forEach((d, i) => sweep(500 + i * 160, 700 + i * 160, t + d, 0.07, { type: 'sine', vol: 0.12 })),   // Squirtle: burbujas
  '0131': t => sweep(300, 520, t, 1.1, { type: 'sine', vol: 0.14, f2: 360, vib: 8 }),                                      // Lapras: canto de ballena
  '0043': t => sweep(700, 980, t, 0.18, { type: 'triangle', vol: 0.12 }),                                                   // Oddish: piar
  '0122': t => { sweep(660, 640, t, 0.09); sweep(660, 640, t + 0.12, 0.09); sweep(880, 700, t + 0.24, 0.2); },            // Mr. Mime: «mi-mi-miiim»
  '0060': t => { sweep(260, 520, t, 0.09, { type: 'sine', vol: 0.14 }); sweep(240, 480, t + 0.14, 0.09, { type: 'sine', vol: 0.14 }); },   // Poliwag: blub blub
  '0094': t => [0, 0.12, 0.24].forEach((d, i) => sweep(520 - i * 60, 380 - i * 60, t + d, 0.1, { type: 'triangle', vol: 0.13, vib: 30 })), // Gengar: «je je je»
  '0246': t => sweep(320, 180, t, 0.8, { type: 'triangle', vol: 0.13, vib: 6 }),                                           // Larvitar: suspiro
  '0124': t => sweep(520, 780, t, 0.7, { type: 'sine', vol: 0.14, f2: 600, vib: 14 }),                                    // Jynx: quejío flamenco
  '0001': t => { sweep(260, 220, t, 0.12, { type: 'triangle', vol: 0.14 }); sweep(330, 240, t + 0.16, 0.22, { type: 'triangle', vol: 0.14 }); },  // Bulbasaur: «bul-ba»
  '0133': t => { sweep(700, 1050, t, 0.12, { type: 'sine', vol: 0.13 }); sweep(900, 1300, t + 0.16, 0.18, { type: 'sine', vol: 0.13, vib: 18 }); }, // Eevee: «i-viii»
  '0067': t => { sweep(300, 260, t, 0.12); sweep(420, 360, t + 0.15, 0.2, { vol: 0.12 }); },                               // Machoke: «¡ma-choke!»
  '0068': t => { sweep(220, 200, t, 0.1, { type: 'square', vol: 0.12 }); sweep(220, 200, t + 0.13, 0.1, { type: 'square', vol: 0.12 }); sweep(330, 300, t + 0.26, 0.25, { type: 'square', vol: 0.12 }); },   // Machamp: «¡un, dos, ¡AR!»
  '0100': t => { sweep(900, 300, t, 0.25, { type: 'square', vol: 0.1 }); sweep(120, 60, t + 0.22, 0.3, { type: 'sawtooth', vol: 0.12 }); },   // Voltorb: chispa y petardazo
  '0129': t => [0, 0.1, 0.2, 0.3].forEach(d => sweep(420, 380, t + d, 0.06, { type: 'triangle', vol: 0.1 })),                // Magikarp: plaf plaf plaf
  '0054': t => { sweep(520, 470, t, 0.16, { type: 'square', vol: 0.1 }); sweep(500, 430, t + 0.2, 0.3, { type: 'square', vol: 0.1, vib: 10 }); },   // Psyduck: «¿psy-aaa?»
  '0137': t => [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => sweep(600 + (i % 2) * 400, 600 + (i % 2) * 400, t + d, 0.05, { type: 'square', vol: 0.08 })),   // Porygon: pitidos de módem
  '0025': t => { sweep(880, 990, t, 0.1, { type: 'square', vol: 0.1 }); sweep(1040, 1320, t + 0.13, 0.25, { type: 'square', vol: 0.1 }); },   // Pikachu: «pika-chuuu»
  '0064': t => sweep(400, 900, t, 0.6, { type: 'sine', vol: 0.12, vib: 25 }),                                                // Kadabra: zumbido psíquico
  '0035': t => { sweep(1000, 1200, t, 0.1, { type: 'sine', vol: 0.12 }); sweep(1200, 1500, t + 0.13, 0.22, { type: 'sine', vol: 0.12, vib: 15 }); },   // Clefairy: «cle-fiii»
  '0024': t => sweep(1800, 1400, t, 0.6, { type: 'sawtooth', vol: 0.05 }),                                                  // Arbok: siseo
  '0151': t => sweep(1200, 1700, t, 0.5, { type: 'sine', vol: 0.1, f2: 1400, vib: 30 }),                                   // Mew: risita
  '0132': t => sweep(300, 500, t, 0.4, { type: 'triangle', vol: 0.12, vib: 40 }),                                           // Ditto: blandiblú
  '0104': t => { sweep(300, 250, t, 0.12, { type: 'triangle', vol: 0.13 }); sweep(260, 200, t + 0.16, 0.3, { type: 'triangle', vol: 0.13 }); },   // Cubone: «cu-bone»
  '0083': t => { sweep(700, 500, t, 0.08, { type: 'square', vol: 0.1 }); sweep(700, 480, t + 0.12, 0.1, { type: 'square', vol: 0.1 }); },   // Farfetch'd: cua cua
  '0079': t => sweep(200, 150, t, 1.3, { type: 'triangle', vol: 0.14, vib: 3 }),                                            // Slowpoke: «sloooow»
  '0074': t => { sweep(160, 120, t, 0.15, { type: 'square', vol: 0.12 }); sweep(140, 100, t + 0.2, 0.2, { type: 'square', vol: 0.12 }); },   // Geodude: «¡geo-dud!»
  '0052': t => sweep(700, 500, t, 0.35, { type: 'triangle', vol: 0.13, vib: 12 }),                                         // Meowth: miau
  '0113': t => { sweep(900, 1100, t, 0.12, { type: 'sine', vol: 0.12 }); sweep(1100, 900, t + 0.15, 0.2, { type: 'sine', vol: 0.12 }); },   // Chansey: «chan-sii»
  '0149': t => sweep(260, 420, t, 0.8, { type: 'triangle', vol: 0.15, vib: 6 }),                                           // Dragonite: rugido amable
  '0065': t => sweep(300, 1200, t, 0.7, { type: 'sine', vol: 0.11, vib: 30 }),                                             // Alakazam: zumbido que sube
  '0102': t => [0, 0.06, 0.12, 0.18, 0.24, 0.3].forEach((d, i) => sweep(600 + i * 70, 640 + i * 70, t + d, 0.05, { type: 'square', vol: 0.07 })),   // Exeggcute: seis a la vez
  '0115': t => sweep(220, 160, t, 0.5, { type: 'sawtooth', vol: 0.09 }),                                                  // Kangaskhan
  '0108': t => sweep(400, 250, t, 0.6, { type: 'sine', vol: 0.12, vib: 9 }),                                               // Lickitung: lametón
  '0085': t => [0, 0.12, 0.24].forEach((d, i) => sweep(800 - i * 120, 650 - i * 120, t + d, 0.09, { type: 'square', vol: 0.09 })),   // Dodrio: tres cabezas
  '0032': t => { sweep(600, 700, t, 0.1, { type: 'triangle', vol: 0.12 }); sweep(900, 1050, t + 0.14, 0.12, { type: 'sine', vol: 0.12 }); },   // los Nidoran: él y ella
};
CRIES.marinilla = CRIES['0060'];

export function cry(id) {
  if (!ensure() || !prefs.sfx) return;
  (CRIES[id] || (t => sweep(500, 700, t, 0.15, { type: 'triangle', vol: 0.1 })))(ctx.currentTime + 0.02);
}

// La nana de Jigglypuff: melodía propia en 3/4, dulce y con vibrato; la música baja mientras suena
const NANA = [[76, 1], [79, 1], [81, 1], [79, 2], [76, 1], [74, 2], [72, 1], [74, 1], [76, 1], [79, 3], [81, 1], [79, 1], [76, 1], [74, 2], [76, 1], [72, 3]];
export function cancion() {
  if (!ensure() || !prefs.sfx) return 0;
  const beat = 0.34;
  let t = ctx.currentTime + 0.05;
  for (const [n, d] of NANA) {
    sweep(MIDI(n), MIDI(n) * 1.002, t, d * beat * 0.95, { type: 'sine', vol: 0.18, vib: 6 });
    t += d * beat;
  }
  const len = t - ctx.currentTime;
  musicBus.gain.setTargetAtTime(0.04, ctx.currentTime, 0.1);
  musicBus.gain.setTargetAtTime(prefs.music ? 0.22 : 0, ctx.currentTime + len, 0.4);
  return len;
}
