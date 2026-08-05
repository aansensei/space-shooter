// sw.js — Service Worker for offline play (see js/offline.js for the
// Settings-panel download UI that drives explicit "download this package"
// requests; this file only handles the SW lifecycle + serving).
//
// One cache, versioned by CACHE_NAME. Bump the version string whenever the
// CORE_FILES list changes so old clients pick up the new set on next visit.
const CACHE_VERSION = 'v9';
const CACHE_NAME = 'pisces-cache-' + CACHE_VERSION;

// App shell — everything needed for the game to boot and run at all.
// Keep in sync with js/offline.js's CORE_FILES (same list, used there to
// report package status/progress in the Settings UI).
const CORE_FILES = [
    './',
    'index.html',
    'guide.html',
    'manifest.json',
    'css/style.css',
    'images/gameplay.png',
    'images/logo.png',
    'images/pisces_banner.png',
    'js/audio.js',
    'js/background.js',
    'js/config.js',
    'js/entities.js',
    'js/input.js',
    'js/main.js',
    'js/pixi-renderer.js',
    'js/sigils.js',
    'js/skills.js',
    'js/render/core.js',
    'js/render/enemy-aegis-core.js',
    'js/render/enemy-boss-thaelis.js',
    'js/render/enemy-common.js',
    'js/render/enemy-egregor.js',
    'js/render/enemy-goliath.js',
    'js/render/enemy-leviathan.js',
    'js/render/enemy-marchosias.js',
    'js/render/enemy-veilshroud.js',
    'js/render/fx.js',
    'js/render/player.js',
    'js/render/skill-a.js',
    'js/render/skill-buttons.js',
    'js/render/skill-d.js',
    'js/render/skill-f.js',
    'js/render/skill-g.js',
    'js/render/skill-s-spirit.js',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Best-effort: a single failed file (e.g. offline on first
            // install) shouldn't block the rest of the shell from caching.
            return Promise.all(
                CORE_FILES.map((url) => cache.add(url).catch(() => {}))
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        // If install ran while offline, cache.add() for every CORE_FILES
        // entry silently failed (caught above) and CACHE_NAME is empty or
        // partial. Deleting the old cache unconditionally in that case would
        // wipe the last working offline copy with nothing to replace it —
        // exactly the "reverts to a broken state while offline" bug. Only
        // clean up old caches once the new one actually has the app shell;
        // otherwise leave old caches in place as a fallback (the fetch
        // handler's global caches.match() already checks across all caches,
        // so they keep serving requests until a future online update
        // finishes populating CACHE_NAME).
        caches.open(CACHE_NAME).then((cache) => cache.match('index.html')).then((hasShell) => {
            if (!hasShell) return;
            return caches.keys().then((names) =>
                Promise.all(
                    names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
                )
            );
        }).then(() => self.clients.claim())
    );
});

// Cache-first, falling back to network — and opportunistically caching
// whatever the network returns, so normal browsing (not just the explicit
// Settings download) fills in the cache over time too. Only same-origin GET
// requests are intercepted; everything else (analytics, POSTs, etc.) passes
// straight through untouched.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    if (!req.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((res) => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return res;
            }).catch(() => cached); // offline + not cached: nothing we can do
        })
    );
});
