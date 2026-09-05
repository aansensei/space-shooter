// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// sw.js — Service Worker for offline play (see js/offline.js for the
// Settings-panel download UI that drives explicit "download this package"
// requests; this file only handles the SW lifecycle + serving).
//
// One cache, versioned by CACHE_NAME. Bump the version string whenever the
// CORE_FILES list changes so old clients pick up the new set on next visit.
const CACHE_VERSION = 'v196';
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
    'assets/images/site/gameplay.png',
    'assets/images/site/logo.png',
    'assets/images/site/pisces_banner.png',
    'assets/images/site/update-log-hero.png',
    'assets/images/game/weapons/1-longsword.png',
    'assets/images/game/weapons/2-spear.png',
    'assets/images/game/weapons/3-halberd.png',
    'assets/images/game/weapons/5-enuma-spear.png',
    'assets/images/game/effects/photokrystos-boomerang.png',
    'assets/images/game/effects/sentinel-shell.png',
    'assets/images/game/effects/rift-void.png',
    'assets/images/game/icons/walpurgis-icon.png',
    'assets/images/game/enemies/marchosias-hexagon-armor.png',
    'js/vendor/pixi.min.js',
    'js/audio.js',
    'js/background.js',
    'js/config.js',
    'js/entities/core.js',
    'js/entities/sentinel.js',
    'js/entities/veilshroud.js',
    'js/entities/egregor.js',
    'js/entities/leviathan.js',
    'js/entities/marchosias.js',
    'js/entities/misc-enemies.js',
    'js/entities/goliath.js',
    'js/input.js',
    'js/match-stats.js',
    'js/main.js',
    'js/pixi-renderer.js',
    'js/sigils/core.js',
    'js/sigils/aries.js',
    'js/sigils/taurus.js',
    'js/sigils/gemini.js',
    'js/sigils/cancer.js',
    'js/sigils/leo.js',
    'js/sigils/virgo.js',
    'js/sigils/libra.js',
    'js/sigils/scorpio.js',
    'js/sigils/sagittarius.js',
    'js/sigils/capricorn.js',
    'js/sigils/aquarius.js',
    'js/sigils/pisces.js',
    'js/sigils/than.js',
    'js/yuusha-party.js',
    'js/skills/skill-a.js',
    'js/skills/skill-s-spirit.js',
    'js/skills/skill-d.js',
    'js/skills/sigil-great-sage.js',
    'js/skills/sigil-cancer.js',
    'js/skills/skill-f.js',
    'js/skills/skill-g.js',
    'js/skills/skill-shift.js',
    'js/skills/misc-mechanics.js',
    'js/skills/sigil-libra.js',
    'js/skills/sigil-gemini.js',
    'js/skills/sigil-aries.js',
    'js/skills/sigil-virgo.js',
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
    'js/render/sigil-cancer.js',
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

// Lets the page ask which cache version is actually controlling it right now
// (see the version tag in the bottom-right corner of the main menu) - reads
// straight from CACHE_VERSION above so there's a single source of truth,
// nothing to keep in sync by hand.
self.addEventListener('message', (event) => {
    if (event.data === 'GET_VERSION') {
        event.source.postMessage({ type: 'PISCES_SW_VERSION', version: CACHE_VERSION });
    }
});

// Cache-first, falling back to network — and opportunistically caching
// whatever the network returns, so normal browsing (not just the explicit
// Settings download) fills in the cache over time too. Only same-origin GET
// requests are intercepted; everything else (analytics, POSTs, etc.) passes
// straight through untouched.
//
// ignoreSearch matters here: CORE_FILES/SFX_FILES (both this file's install
// step and offline.js's explicit download) cache every JS file under its
// bare path with no `?v=` query, but every real page request carries the
// current cache-busting query string. Without ignoreSearch, those requests
// never match the precached entry - the "Offline Package" download would
// silently fail to cover the app once truly offline, cache-missing every
// core script. CACHE_VERSION already forces a full cache wipe+reinstall on
// every real content change, so matching regardless of query string here
// doesn't risk serving stale content across a version bump.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    if (!req.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((res) => {
                // res.ok is true for the whole 2xx range, including 206
                // Partial Content — browsers issue ranged Range: requests
                // against audio/video elements (BGM playback/seeking hits
                // this constantly), and the Cache API throws on any attempt
                // to store a partial response. That threw on every single
                // BGM chunk, spamming unhandled promise rejections during
                // playback. Only full 200 responses are cacheable here.
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                }
                return res;
            }).catch(() => cached); // offline + not cached: nothing we can do
        })
    );
});
