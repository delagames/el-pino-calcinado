// Service worker: la posada se puede instalar como app y jugar sin conexión.
// Primero intenta la red (así siempre se ve la última versión) y, si no hay, tira de la copia.
const CACHE = 'el-pino-calcinado-v31';
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/audio.js",
  "js/charizard.js",
  "js/counter.js",
  "js/dialogue.js",
  "js/final.js",
  "js/fondo.js",
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
  "data/dialogues/arbok.json",
  "data/dialogues/clefairy.json",
  "data/dialogues/cubone.json",
  "data/dialogues/ditto.json",
  "data/dialogues/farfetchd.json",
  "data/dialogues/kadabra.json",
  "data/dialogues/machamp.json",
  "data/dialogues/machoke.json",
  "data/dialogues/magikarp.json",
  "data/dialogues/mew.json",
  "data/dialogues/nidoran.json",
  "data/dialogues/pikachu.json",
  "data/dialogues/porygon.json",
  "data/dialogues/psyduck.json",
  "data/dialogues/slowpoke.json",
  "data/dialogues/voltorb.json",
  "data/dialogues/alakazam.json",
  "data/dialogues/chansey.json",
  "data/dialogues/dodrio.json",
  "data/dialogues/dragonite.json",
  "data/dialogues/exeggcute.json",
  "data/dialogues/geodude.json",
  "data/dialogues/kangaskhan.json",
  "data/dialogues/lickitung.json",
  "data/dialogues/meowth.json",
  "data/dialogues/caterpie.json",
  "data/dialogues/charmander.json",
  "data/dialogues/feria.json",
  "data/dialogues/pidgey.json",
  "data/dialogues/spearow.json",
  "data/dialogues/weedle.json",
  "data/dialogues/acuatico.json",
  "data/dialogues/bellsprout.json",
  "data/dialogues/diglett.json",
  "data/dialogues/dojo.json",
  "data/dialogues/dratini.json",
  "data/dialogues/drowzee.json",
  "data/dialogues/electricistas.json",
  "data/dialogues/gastly.json",
  "data/dialogues/hermanoseevee.json",
  "data/dialogues/koffing.json",
  "data/dialogues/magmar.json",
  "data/dialogues/oeste.json",
  "data/dialogues/onix.json",
  "data/dialogues/paras.json",
  "data/dialogues/playa.json",
  "data/dialogues/psiquicos.json",
  "data/dialogues/puntolimpio.json",
  "data/dialogues/rhyhorn.json",
  "data/dialogues/staryu.json",
  "data/dialogues/vendimia.json",
  "data/dialogues/verbena.json",
  "data/dialogues/visitasrocket.json",
  "data/dialogues/vulpix.json",
  "data/dialogues/zubat.json",
  "data/dialogues/fosiles.json",
  "data/dialogues/mewtwo.json",
  "data/dialogues/pajaros.json",
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
  "assets/logo/icono-512.png",
  "assets/sprites/0006/AnimData.xml",
  "assets/sprites/0006/Hop-Anim.png",
  "assets/sprites/0006/Idle-Anim.png",
  "assets/sprites/0006/Shoot-Anim.png",
  "assets/sprites/0006/Sleep-Anim.png",
  "assets/sprites/0006/Walk-Anim.png",
  "assets/sprites/manolo/AnimData.xml",
  "assets/sprites/manolo/Cook-Anim.png",
  "assets/sprites/manolo/Idle-Anim.png",
  "assets/sprites/manolo/Sleep-Anim.png",
  "assets/sprites/manolo/Walk-Anim.png"
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
  // «no-cache»: pregunta siempre al servidor si hay versión nueva (GitHub Pages deja los archivos
  // diez minutos en la caché del navegador y el móvil seguía con el CSS viejo); la página en sí no lo admite
  const req = ev.request.mode === 'navigate' ? ev.request : new Request(ev.request, { cache: 'no-cache' });
  const red = fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(ev.request, copy));
    }
    return res;
  });
  // con mala cobertura no se espera eternamente: a los 4 s, lo guardado (si lo hay); si no, lo que llegue
  const lento = new Promise(r => setTimeout(r, 4000)).then(() => caches.match(ev.request)).then(c => c || red);
  ev.respondWith(Promise.race([red, lento]).catch(() => caches.match(ev.request)));
});
