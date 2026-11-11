// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// sw.js — Service Worker for offline play (see js/offline.js for the
// Settings-panel download UI that drives explicit "download this package"
// requests; this file only handles the SW lifecycle + serving).
//
// One cache, versioned by CACHE_NAME. Bump the version string whenever the
// CORE_FILES list changes so old clients pick up the new set on next visit.
const CACHE_VERSION = 'v644';
const CACHE_NAME = 'pisces-cache-' + CACHE_VERSION;

// App shell — everything needed for the game to boot and run at all.
// Keep in sync with js/offline.js's CORE_FILES (same list, used there to
// report package status/progress in the Settings UI).
const CORE_FILES = [
    'assets/audio/sfx/ammit-rift-crack.mp3',
    'assets/audio/sfx/ammit-rift-open.mp3',
    'assets/audio/sfx/ammit-emerge.mp3',
    'assets/audio/sfx/ammit-rift-close.mp3',
    'assets/audio/sfx/ammit-idle.mp3',
    'assets/audio/sfx/ammit-jaws-lock.mp3',
    'assets/audio/sfx/ammit-jaws-close.mp3',
    'assets/audio/sfx/ammit-jaws-bite.mp3',
    'assets/audio/sfx/ammit-scarab-hatch.mp3',
    'assets/audio/sfx/ammit-scarab-pop.mp3',
    'assets/audio/sfx/ammit-sandpit.mp3',
    'assets/audio/sfx/ammit-weigh-open.mp3',
    'assets/audio/sfx/ammit-weigh-tilt.mp3',
    'assets/audio/sfx/ammit-weigh-slam.mp3',
    'assets/audio/sfx/ammit-weigh-balanced.mp3',
    'assets/audio/sfx/ammit-claw-wind.mp3',
    'assets/audio/sfx/ammit-claw-strike.mp3',
    'assets/audio/sfx/ammit-stomp-wind.mp3',
    'assets/audio/sfx/ammit-stomp-slam.mp3',
    'assets/audio/sfx/ammit-feather-fall.mp3',
    'assets/audio/sfx/ammit-feather-return.mp3',
    'assets/audio/sfx/ammit-wrap-tear.mp3',
    'assets/audio/sfx/ammit-heart-devour.mp3',
    'assets/audio/sfx/ammit-enrage.mp3',
    'assets/audio/sfx/ammit-death-roar.mp3',

    './',
    'index.html',
    'guide.html',
    'manifest.json',
    'css/style.css',
    'css/recap.css',
    'assets/images/site/gameplay.png',
    'assets/images/site/logo.png',
    'assets/images/site/ncta-logo-white.webp',
    'assets/images/site/pisces_banner.png',
    'assets/images/site/update-log-hero.png',
    'assets/images/site/kanade-genesis.png',
    'assets/images/game/weapons/1-longsword.png',
    'assets/images/game/weapons/2-spear.png',
    'assets/images/game/weapons/3-halberd.png',
    'assets/images/game/weapons/5-enuma-spear.png',
    'assets/images/game/effects/photokrystos-boomerang.png',
    'assets/images/game/effects/sentinel-shell.png',
    'assets/images/game/effects/sol-arrow-primary.png',
    'assets/images/game/effects/sol-arrow-secondary.png',
    'assets/images/game/effects/rift-void.png',
    'assets/images/game/effects/rift-blood-garden.png',
    'assets/images/game/effects/yog-sothoth-starry-night.jpg',
    'assets/images/game/effects/skill-g-crest.png',
    'assets/images/game/icons/walpurgis-icon.png',
    'assets/images/game/icons/timeline-distortion-player.png',
    'assets/images/game/icons/timeline-distortion-enemy.png',
    'assets/images/game/effects/timeline-distortion-banner.png',
    'assets/images/game/icons/timeline-distortion-player-spacetime_flow.png',
    'assets/images/game/icons/timeline-distortion-enemy-spacetime_flow.png',
    'assets/images/game/effects/timeline-distortion-banner-spacetime_flow.png',
    'assets/images/game/icons/timeline-distortion-player-administrators_favor.png',
    'assets/images/game/icons/timeline-distortion-enemy-administrators_favor.png',
    'assets/images/game/effects/timeline-distortion-banner-administrators_favor.png',
    'assets/images/game/icons/timeline-distortion-player-adaptive_counter.png',
    'assets/images/game/icons/timeline-distortion-enemy-adaptive_counter.png',
    'assets/images/game/effects/timeline-distortion-banner-adaptive_counter.png',
    'assets/images/game/effects/kanade-halo.png',
    'assets/images/game/effects/frozen-realm.jpg',
    'assets/images/game/effects/kanade-gate-world.png',
    'assets/images/game/zodiac/zodiac_aquarius.png',
    'assets/images/game/zodiac/zodiac_aries.png',
    'assets/images/game/zodiac/zodiac_cancer.png',
    'assets/images/game/zodiac/zodiac_capricorn.png',
    'assets/images/game/zodiac/zodiac_gemini.png',
    'assets/images/game/zodiac/zodiac_leo.png',
    'assets/images/game/zodiac/zodiac_libra.png',
    'assets/images/game/zodiac/zodiac_pisces.png',
    'assets/images/game/zodiac/zodiac_sagittarius.png',
    'assets/images/game/zodiac/zodiac_scorpio.png',
    'assets/images/game/zodiac/zodiac_taurus.png',
    'assets/images/game/zodiac/zodiac_than.png',
    'assets/images/game/zodiac/zodiac_dau.png',
        'assets/images/game/zodiac/zodiac_ty.png',
    'assets/images/game/zodiac/zodiac_virgo.png',
    'assets/video/frozen-realm.mp4',
    'assets/images/game/icons/blood-arrow-stack.png',
    'assets/images/game/icons/dargruel-root-silence-debuff.png',
    'assets/images/game/icons/goliath-silence-debuff.png',
    'assets/images/game/icons/soul-reaver-debuff.png',
    'assets/images/game/sigils/cancer-whirlpool-oceanfloor.png',
    'assets/images/game/sigils/tidal-meter-frame.png',
    'assets/images/game/sigils/leo-meter-frame.png',
    'assets/images/game/sigils/capricorn-meter-frame.png',
    'assets/images/game/sigils/capricorn-mountain.png',
    'assets/images/game/sigils/ty-vortex-abyss.png',
    'assets/images/game/sigils/ty-chaos-corner.png',
    'assets/images/game/sigils/great-sage-gem-frame.png',
    'assets/images/game/enemies/marchosias-hexagon-armor.png',
    'assets/images/game/enemies/thaelis-cocoon.png',
    'assets/images/game/enemies/uriel-divine-core.png',
    'assets/images/game/enemies/uriel-holy-sword.png',
        'assets/images/game/enemies/ammit-pyramid.png',
        'assets/images/game/enemies/ammit-sprites/2-aura-0.png',
        'assets/images/game/enemies/ammit-sprites/2-aura-1.png',
        'assets/images/game/enemies/ammit-sprites/2-aura-2.png',
        'assets/images/game/enemies/ammit-sprites/2-body-0.png',
        'assets/images/game/enemies/ammit-sprites/2-body-1.png',
        'assets/images/game/enemies/ammit-sprites/2-body-2.png',
        'assets/images/game/enemies/ammit-sprites/2-chain.png',
        'assets/images/game/enemies/ammit-sprites/2-dust.png',
        'assets/images/game/enemies/ammit-sprites/2-feather.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-0.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-1.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-10.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-11.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-2.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-3.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-4.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-5.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-6.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-7.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-8.png',
        'assets/images/game/enemies/ammit-sprites/2-figure-9.png',
        'assets/images/game/enemies/ammit-sprites/2-figureFlash-0.png',
        'assets/images/game/enemies/ammit-sprites/2-figureFlash-1.png',
        'assets/images/game/enemies/ammit-sprites/2-figureFlash-2.png',
        'assets/images/game/enemies/ammit-sprites/2-figureFlash-3.png',
        'assets/images/game/enemies/ammit-sprites/2-glow.png',
        'assets/images/game/enemies/ammit-sprites/2-head.png',
        'assets/images/game/enemies/ammit-sprites/2-heart.png',
        'assets/images/game/enemies/ammit-sprites/2-iris-0.png',
        'assets/images/game/enemies/ammit-sprites/2-iris-1.png',
        'assets/images/game/enemies/ammit-sprites/2-jaw.png',
        'assets/images/game/enemies/ammit-sprites/2-jawLower.png',
        'assets/images/game/enemies/ammit-sprites/2-jawUpper.png',
        'assets/images/game/enemies/ammit-sprites/2-linen-0.png',
        'assets/images/game/enemies/ammit-sprites/2-linen-1.png',
        'assets/images/game/enemies/ammit-sprites/2-linen-2.png',
        'assets/images/game/enemies/ammit-sprites/2-linen-3.png',
        'assets/images/game/enemies/ammit-sprites/2-linen-4.png',
        'assets/images/game/enemies/ammit-sprites/2-linen-5.png',
        'assets/images/game/enemies/ammit-sprites/2-linen-6.png',
        'assets/images/game/enemies/ammit-sprites/2-mane-0.png',
        'assets/images/game/enemies/ammit-sprites/2-mane-1.png',
        'assets/images/game/enemies/ammit-sprites/2-nova.png',
        'assets/images/game/enemies/ammit-sprites/2-paw.png',
        'assets/images/game/enemies/ammit-sprites/2-sandPit.png',
        'assets/images/game/enemies/ammit-sprites/2-scaleBeam.png',
        'assets/images/game/enemies/ammit-sprites/2-scalePan.png',
        'assets/images/game/enemies/ammit-sprites/2-scalePillar.png',
        'assets/images/game/enemies/ammit-sprites/2-scarab.png',
        'assets/images/game/enemies/ammit-sprites/2-torso-0.png',
        'assets/images/game/enemies/ammit-sprites/2-torso-1.png',
        'assets/images/game/enemies/ammit-sprites/2-torso-2.png',
        'js/render/ammit-portal.js',
    'assets/images/game/enemies/raphael-wisdom-orb.png',
    'js/vendor/pixi.min.js',
    'js/canvas-guard.js',
    'js/audio.js',
    'js/background.js',
    'js/config.js',
    'js/timeline-distortion.js',
    'js/entities/core.js',
    'js/entities/sentinel.js',
    'js/entities/veilshroud.js',
    'js/entities/uriel.js',
    'js/entities/egregor.js',
    'js/entities/ammit.js',
    'js/entities/leviathan.js',
    'js/entities/marchosias.js',
    'js/entities/misc-enemies.js',
    'js/entities/raphael.js',
    'js/entities/goliath.js',
    'js/input.js',
    'js/main.js',
    'js/tutorial.js',
    'js/tutorial-license.js',
    'assets/audio/sfx/tut-beam.mp3',
    'assets/audio/sfx/tut-bullet-volley.mp3',
    'assets/audio/sfx/tut-burst.mp3',
    'assets/audio/sfx/tut-circle-charge.mp3',
    'assets/audio/sfx/tut-complete.mp3',
    'assets/audio/sfx/tut-domain-blast.mp3',
    'assets/audio/sfx/tut-domain-charge.mp3',
    'assets/audio/sfx/tut-fail.mp3',
    'assets/audio/sfx/tut-license-open.mp3',
    'assets/audio/sfx/tut-license-print.mp3',
    'assets/audio/sfx/tut-line.mp3',
    'assets/audio/sfx/tut-pass.mp3',
    'assets/audio/sfx/tut-reveal.mp3',
    'assets/audio/sfx/tut-seal.mp3',
    'assets/audio/sfx/tut-speech-open.mp3',
    'assets/audio/sfx/tut-stamp.mp3',
    'assets/audio/sfx/tut-sweep.mp3',
    'assets/audio/sfx/tut-toast.mp3',
    'assets/audio/sfx/tut-type-a.mp3',
    'assets/audio/sfx/tut-type-b.mp3',
    'assets/audio/sfx/tut-type-c.mp3',
    'assets/audio/sfx/tut-warn.mp3',
    'assets/images/game/tutorial/tut-hud.png',
    'assets/images/game/tutorial/tut-strip.png',
    'assets/images/game/tutorial/tut-circle.png',
    'assets/images/game/tutorial/tut-sector.png',
    'assets/images/game/tutorial/tut-yog.png',
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
    'js/sigils/dau.js',
        'js/sigils/ty.js',
    'js/yuusha-party.js',
    'js/skills/skill-a.js',
    'js/skills/skill-s-spirit.js',
    'js/skills/skill-d.js',
    'js/skills/sigil-great-sage.js',
    'js/skills/sigil-cancer.js',
    'js/skills/sigil-leo.js',
    'js/skills/sigil-dau.js',
    'js/skills/sigil-pisces.js',
    'js/skills/sigil-capricorn.js',
        'js/skills/sigil-ty.js',
    'js/skills/skill-f.js',
    'js/skills/skill-g.js',
    'js/skills/skill-shift.js',
    'js/skills/misc-mechanics.js',
    'js/skills/sigil-libra.js',
    'js/skills/sigil-gemini.js',
    'js/skills/sigil-aries.js',
    'js/skills/sigil-virgo.js',
    'js/render/core.js',
    'js/render/kanade-face.js',
    'js/render/kanade-cutscene.js',
    'js/render/enemy-raphael.js',
    'js/render/enemy-thaelis.js',
    'js/render/enemy-thaelis-warrior.js',
    'js/render/enemy-dargruel.js',
    'js/render/enemy-common.js',
    'js/render/enemy-egregor.js',
    'js/render/enemy-ammit.js',
    'js/render/enemy-goliath.js',
    'js/render/enemy-leviathan.js',
    'js/render/enemy-marchosias.js',
    'js/render/enemy-veilshroud.js',
    'js/render/enemy-uriel.js',
    'js/render/fx.js',
    'js/render/player.js',
    'js/render/skill-a.js',
    'js/render/skill-buttons.js',
    'js/recap.js',
    'js/render/skill-d.js',
    'js/render/skill-f.js',
    'js/render/sigil-cancer.js',
    'js/render/sigil-leo.js',
    'js/render/sigil-dau.js',
    'js/render/sigil-pisces.js',
    'js/render/sigil-capricorn.js',
        'js/render/sigil-ty.js',
    'js/render/skill-g.js',
    'js/render/skill-s-spirit.js',
    'assets/audio/sfx/ingame-slices.json',
];

const PRECACHE_FILES = CORE_FILES.filter(url => ![
    'assets/images/site/gameplay.png',
    'assets/images/site/pisces_banner.png',
    'assets/images/site/update-log-hero.png',
    'assets/images/site/kanade-genesis.png',
    'assets/video/frozen-realm.mp4',
].includes(url));

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Small batches bound update traffic while a match is running. Each file is fetched with cache: 'reload' so the browser's own HTTP cache can never hand the new version an older copy of a file.
            return (async () => {
                for (let i = 0; i < PRECACHE_FILES.length; i += 4) {
                    // Files stored by an earlier attempt are skipped, and each file gets one retry before the install is judged incomplete.
                    await Promise.all(PRECACHE_FILES.slice(i, i + 4).map(async (url) => {
                        if (await cache.match(url)) return;
                        for (let attempt = 0; attempt < 2; attempt++) {
                            try { await cache.add(new Request(url, { cache: 'reload' })); return; } catch (_) {}
                        }
                    }));
                }
                const present = await Promise.all(PRECACHE_FILES.map(url => cache.match(url)));
                if (!present.every(Boolean)) throw Error('Offline update incomplete');
            })();
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        // Retain the previous offline copy until every automatic file is present.
        caches.open(CACHE_NAME).then(async (cache) => {
            const present = await Promise.all(PRECACHE_FILES.map(url => cache.match(url)));
            return present.every(Boolean);
        }).then((hasShell) => {
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
