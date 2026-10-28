// Service worker: la posada se puede instalar como app y jugar sin conexión.
// Primero intenta la red (así siempre se ve la última versión) y, si no hay, tira de la copia.
const CACHE = 'el-pino-calcinado-v1';
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/audio.js",
  "js/charizard.js",
  "js/counter.js",
  "js/dialogue.js",
  "js/guests.js",
  "js/inn.js",
  "js/intro.js",
  "js/kitchen.js",
  "js/main.js",
  "js/popup.js",
  "js/save.js",
  "js/scene.js",
  "js/sprites.js",
  "data/buenosdias.json",
  "data/sobremesa.json",
  "data/guests.json",
  "data/recipes.json",
  "data/upgrades.json",
  "data/dialogues/bulbasaur.json",
  "data/dialogues/eevee.json",
  "data/dialogues/gengar.json",
  "data/dialogues/growlithe.json",
  "data/dialogues/jynx.json",
  "data/dialogues/jigglypuff.json",
  "data/dialogues/larvitar.json",
  "data/dialogues/lapras.json",
  "data/dialogues/machop.json",
  "data/dialogues/marina.json",
  "data/dialogues/mrmime.json",
  "data/dialogues/oddish.json",
  "data/dialogues/snorlax.json",
  "data/dialogues/squirtle.json",
  "assets/ui/Jersey10-OFL.txt",
  "assets/ui/Jersey10-Regular.ttf",
  "assets/ui/boton-pulsado.png",
  "assets/ui/famadesa.png",
  "assets/ui/boton-secundario-pulsado.png",
  "assets/ui/boton-secundario.png",
  "assets/ui/boton.png",
  "assets/ui/globo.png",
  "assets/ui/ventana.png",
  "assets/logo/logo-principal-transparente.svg",
  "assets/logo/logo-marca.svg",
  "assets/logo/icono.svg",
  "assets/logo/icono-192.png",
  "assets/logo/icono-512.png"
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET' || !ev.request.url.startsWith(self.location.origin)) return;
  ev.respondWith(fetch(ev.request).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(ev.request, copy));
    }
    return res;
  }).catch(() => caches.match(ev.request)));
});
