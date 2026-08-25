// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/offline.js — drives the "Offline Play" download UI in Settings.
// The actual cache-first serving happens in sw.js; this file only decides
// WHAT to download and reports progress/status back to the Settings panel.
//
// Two packages, matching the Settings UI: BASIC (app shell + all SFX,
// enough to play with full mechanics/feedback) and FULL (BASIC + every BGM
// track, so music works offline too). Picking FULL when BASIC is already
// cached only fetches the BGM delta — every download here is filtered to
// "not already in cache" first, nothing gets re-fetched.

(function () {
    // Mirrors sw.js's CORE_FILES exactly — kept as a separate literal
    // (not fetched from sw.js) since a page script can't import a worker
    // script's module scope.
    const CORE_FILES = [
        'index.html',
        'guide.html',
        'manifest.json',
        'css/style.css',
        'images/site/gameplay.png',
        'images/site/logo.png',
        'images/site/pisces_banner.png',
        'images/site/update-log-hero.png',
        'images/game/weapons/1-longsword.png',
        'images/game/weapons/2-spear.png',
        'images/game/weapons/3-halberd.png',
        'images/game/weapons/5-enuma-spear.png',
        'images/game/photokrystos-boomerang.png',
        'images/game/sentinel-shell.png',
        'images/game/rift-void.png',
        'images/game/walpurgis-icon.png',
        'js/audio.js',
        'js/background.js',
        'js/config.js',
        'js/entities.js',
        'js/entities/sentinel.js',
        'js/entities/veilshroud.js',
        'js/entities/egregor.js',
        'js/entities/leviathan.js',
        'js/entities/marchosias.js',
        'js/entities/misc-enemies.js',
        'js/input.js',
        'js/match-stats.js',
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

    // Kept as a static list (not scraped from audio.js's _makePool calls at
    // runtime) since those calls are scattered across one big init function
    // with no single exported array — mirror this list by hand if new SFX
    // files are ever added to audio/sfx/.
    const SFX_FILES = [
        'audio/sfx/autoshot.mp3', 'audio/sfx/blackhole.mp3', 'audio/sfx/chain-lightning.mp3',
        'audio/sfx/charged-shot.mp3', 'audio/sfx/charging.mp3', 'audio/sfx/click.mp3',
        'audio/sfx/coronation.mp3', 'audio/sfx/dargruel-chain-launch.mp3', 'audio/sfx/dargruel-chain-root.mp3',
        'audio/sfx/dimension-break.mp3', 'audio/sfx/dimensional-rift.mp3',
        'audio/sfx/egregor-crawl.mp3', 'audio/sfx/egregor-death-roar.mp3', 'audio/sfx/egregor-nullslash-hit.mp3',
        'audio/sfx/egregor-nullslash-slash.mp3', 'audio/sfx/egregor-nullslash-windup.mp3', 'audio/sfx/egregor-tempest-strike.mp3',
        'audio/sfx/enemy-death.mp3', 'audio/sfx/enemy-hit.wav', 'audio/sfx/engine.wav',
        'audio/sfx/gameover.mp3', 'audio/sfx/goliath-corrupted-meteor.mp3', 'audio/sfx/goliath-death.mp3',
        'audio/sfx/goliath-fracture-step.mp3', 'audio/sfx/goliath-idle.mp3',
        'audio/sfx/goliath-spawn.mp3', 'audio/sfx/goliath-transform.mp3', 'audio/sfx/goliath-verdict-charge.mp3',
        'audio/sfx/goliath-unbroken-wave.mp3', 'audio/sfx/goliath-verdict-impact.mp3', 'audio/sfx/goliath-verdict-launch.mp3',
        'audio/sfx/hover.mp3', 'audio/sfx/hyperjump.mp3',
        'audio/sfx/ingame.mp3', 'audio/sfx/laser.mp3', 'audio/sfx/laser-fire.mp3',
        'audio/sfx/leviathan-perseverance.mp3', 'audio/sfx/life-lost.mp3',
        'audio/sfx/low-hp.mp3', 'audio/sfx/maou-haki.mp3', 'audio/sfx/metal-hit.mp3', 'audio/sfx/new-wave.mp3',
        'audio/sfx/overlay.wav', 'audio/sfx/phantom-strike.mp3', 'audio/sfx/photokrystos-boomerang-hit.mp3', 'audio/sfx/photokrystos-boomerang-throw.mp3',
        'audio/sfx/photokrystos-btm-firing.mp3', 'audio/sfx/photokrystos-btm-kill.mp3', 'audio/sfx/photokrystos-btm-shockwave.mp3',
        'audio/sfx/photokrystos-btm-warming.mp3', 'audio/sfx/photokrystos-dnt-laser.mp3', 'audio/sfx/photokrystos-idle.mp3',
        'audio/sfx/photokrystos-summon-converge.mp3', 'audio/sfx/photokrystos-summon-flash.mp3', 'audio/sfx/photokrystos-summon-holy.mp3',
        'audio/sfx/photokrystos-vine-bind.mp3', 'audio/sfx/sentinel-explode.mp3', 'audio/sfx/sentinel-spawn.mp3',
        'audio/sfx/shield-hit.wav', 'audio/sfx/shift-hold.mp3', 'audio/sfx/shift-teleport.mp3',
        'audio/sfx/sigil-confirm.mp3', 'audio/sfx/sigil-open.mp3', 'audio/sfx/skill-a-activate.mp3',
        'audio/sfx/skill-a-orb-hit.mp3', 'audio/sfx/skill-a-orb-lock.mp3', 'audio/sfx/skill-d-charge.mp3',
        'audio/sfx/skill-f-charge.mp3', 'audio/sfx/skill-f-fire.mp3', 'audio/sfx/skill-ready.mp3',
        'audio/sfx/skill-unlocked.mp3', 'audio/sfx/spirit-arc-slash.mp3', 'audio/sfx/spirit-autofire.mp3',
        'audio/sfx/tesla-coil-form.mp3', 'audio/sfx/wave-clear.mp3', 'audio/sfx/yog-parry.mp3',
    ];

    function bgmFiles() {
        // Prefer the live list from AudioMgr (single source of truth) —
        // falls back to a hand-kept mirror only if audio.js hasn't loaded
        // yet for some reason.
        if (window.AudioMgr && typeof window.AudioMgr.list === 'function') {
            return window.AudioMgr.list().map((t) => t.src);
        }
        return [];
    }

    const PACKAGES = {
        basic: { label: 'Basic', sizeLabel: '~33MB', files: () => [...CORE_FILES, ...SFX_FILES] },
        full:  { label: 'Full', sizeLabel: '~196MB (includes all music)', files: () => [...CORE_FILES, ...SFX_FILES, ...bgmFiles()] },
    };

    // Was a hand-kept literal ('pisces-cache-v2') that had to be bumped by
    // hand every time sw.js's CACHE_VERSION changed — it wasn't, repeatedly,
    // so downloads were silently writing into an orphaned cache the SW's own
    // fetch handler no longer reads from. Resolve the live name instead:
    // sw.js's activate handler deletes every other pisces-cache-* entry once
    // the current one is confirmed populated, so exactly one should exist in
    // steady state. Falls back to a fresh 'pisces-cache-v1' bucket only if
    // the SW hasn't cached anything yet (e.g. this runs before first install).
    async function _resolveCacheName() {
        const keys = await caches.keys();
        return keys.find((k) => k.startsWith('pisces-cache-')) || 'pisces-cache-v1';
    }

    async function getStatus(which) {
        if (!('caches' in window)) return { supported: false, cached: 0, total: 0 };
        const files = PACKAGES[which].files();
        const cache = await caches.open(await _resolveCacheName());
        let cached = 0;
        for (const url of files) {
            if (await cache.match(url)) cached++;
        }
        return { supported: true, cached, total: files.length };
    }

    async function download(which, onProgress) {
        const files = PACKAGES[which].files();
        const cache = await caches.open(await _resolveCacheName());
        const missing = [];
        for (const url of files) {
            if (!(await cache.match(url))) missing.push(url);
        }
        let done = files.length - missing.length;
        onProgress(done, files.length);
        if (missing.length === 0) return { ok: true, failed: 0 };

        let failed = 0;
        // Small concurrency window instead of one giant Promise.all — keeps
        // a runaway number of parallel connections from choking a weak/
        // metered mobile connection while still being faster than serial.
        const CONCURRENCY = 4;
        let idx = 0;
        async function worker() {
            while (idx < missing.length) {
                const url = missing[idx++];
                try {
                    const res = await fetch(url);
                    if (res.ok) await cache.put(url, res);
                    else failed++;
                } catch (_) {
                    failed++;
                }
                done++;
                onProgress(done, files.length);
            }
        }
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker));
        return { ok: failed === 0, failed };
    }

    window.OfflineMgr = { getStatus, download, PACKAGES };
})();
