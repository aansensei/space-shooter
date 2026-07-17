// Central audio system. All in-game and menu sounds route through this file.
// Volumes have three categories the settings panel exposes:
//   bgm    – menu track + randomized in-game BGM
//   sfx    – gameplay effects + the space "ingame.mp3" ambient loop
//   global – multiplied into both above (master)
// Persisted to localStorage as JSON under key 'audioVols'.

(function () {
    const STORAGE_KEY = 'audioVols';

    // Per-clip base gain. High-frequency sounds are attenuated so they don't
    // pile up and clip the mix. Values 0..1, multiplied by sfx * global.
    const SFX_BASE = {
        autoshot:      0.18,   // fires every 135ms, keep quiet
        charging:      0.75,   // sustained hum while holding Space, needs to feel present
        laser:         0.50,   // long overload beam, keep from dominating the mix
        'charged-fire':0.65,   // one-shot burst on Space-release <3s
        'enemy-hit':   0.22,   // very frequent
        'enemy-death': 0.55,
        'shield-hit':  0.55,
        'life-lost':   0.85,
        click:         0.50,
        hover:         0.30,   // tiny tick on button/card hover, keep discreet
        overlay:       0.55,
        engine:        0.20,   // ambient loop, subtle
        ambient:       0.35,   // ingame.mp3 space background
        'skill-ready':    0.55, // any skill cooldown just finished
        'skill-unlocked': 0.70, // charge-based skill (Primeval / Tesla) hit 100
    };

    // 12 in-game BGM tracks + the menu-only track ("Pisces" = soundtrack1.mp3).
    // Menu track is excluded from the in-game random pool.
    const BGM_LIST = [
        { id: 'pisces',                 title: 'Pisces (Menu Theme)',            src: 'audio/soundtrack1.mp3',                          menuOnly: true },
        { id: 'ascension',              title: 'Ascension of the Void Shrine',   src: 'audio/bgm/ascension-of-the-void-shrine.mp3' },
        { id: 'dorian-autumn',          title: 'A Dorian Autumn Fair',           src: 'audio/bgm/a-dorian-autumn-fair.mp3' },
        { id: 'love-never-ends',        title: 'A Love That Never Ends',         src: 'audio/bgm/a-love-that-never-ends.mp3' },
        { id: 'anata',                  title: 'Anata',                          src: 'audio/bgm/anata.mp3' },
        { id: 'echoes-silent-prayer',   title: 'Echoes of a Silent Prayer',      src: 'audio/bgm/echoes-of-a-silent-prayer.mp3' },
        { id: 'endless-rainfall',       title: 'Endless Rainfall',               src: 'audio/bgm/endless-rainfall.mp3' },
        { id: 'requiem-persian-spring', title: 'Requiem for a Persian Spring',   src: 'audio/bgm/requiem-for-a-persian-spring.mp3' },
        { id: 'requiem-falling-stars',  title: 'Requiem of Falling Stars',       src: 'audio/bgm/requiem-of-falling-stars.mp3' },
        { id: 'sorrow-thousand-blades', title: 'Sorrow of a Thousand Blades',    src: 'audio/bgm/sorrow-of-a-thousand-blades.mp3' },
        { id: 'native-faith',           title: "Suwako's Theme – Native Faith",  src: 'audio/bgm/suwakos-theme-native-faith.mp3' },
        { id: 'last-cicada',            title: "The Last Cicada's Song",         src: 'audio/bgm/the-last-cicadas-song.mp3' },
        { id: 'summer-fades',           title: 'Where Summer Fades to Silence',  src: 'audio/bgm/where-summer-fades-to-silence.mp3' },
    ];

    const state = {
        vol: { bgm: 0.7, sfx: 0.7, global: 1.0 },
        muted: false,
        currentBgmId: null,
        bgmEl: null,
        ambientEl: null,     // ingame.mp3 space background (grouped under SFX)
        engineEl: null,      // engine loop
        laserEl: null,       // sustained laser loop
        chargingEl: null,    // charging hum loop
        pool: {},            // sfx key → Audio pool (rotated for rapid re-fires)
        poolIdx: {},
    };

    // Load persisted volumes.
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const j = JSON.parse(raw);
            if (typeof j.bgm    === 'number') state.vol.bgm    = j.bgm;
            if (typeof j.sfx    === 'number') state.vol.sfx    = j.sfx;
            if (typeof j.global === 'number') state.vol.global = j.global;
        }
    } catch (_) {}

    function persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.vol)); } catch (_) {}
    }

    function bgmGain()  { return state.muted ? 0 : state.vol.bgm    * state.vol.global; }
    function sfxGain(k) { return state.muted ? 0 : (SFX_BASE[k] || 0.5) * state.vol.sfx * state.vol.global; }

    // Preload one-shot pool. Size 4 covers overlap for autoshot at 135ms cadence.
    function _makePool(key, src, size = 3) {
        const arr = [];
        for (let i = 0; i < size; i++) {
            const a = new Audio(src);
            a.preload = 'auto';
            arr.push(a);
        }
        state.pool[key] = arr;
        state.poolIdx[key] = 0;
    }

    function playSfx(key) {
        const pool = state.pool[key];
        if (!pool) return;
        const g = sfxGain(key);
        if (g <= 0) return;
        const a = pool[state.poolIdx[key]];
        state.poolIdx[key] = (state.poolIdx[key] + 1) % pool.length;
        try {
            a.volume = g;
            a.currentTime = 0;
            a.play().catch(() => {});
        } catch (_) {}
    }

    // Loop controls for sustained sfx (charging, laser). Idempotent.
    function startLoop(refKey, key) {
        const el = state[refKey];
        if (!el) return;
        el.volume = sfxGain(key);
        if (state.muted) return; // stay silent until unmute; setMuted resumes them
        if (el.paused) { try { el.currentTime = 0; el.play().catch(() => {}); } catch (_) {} }
    }
    function stopLoop(refKey) {
        const el = state[refKey];
        if (!el) return;
        try { el.pause(); el.currentTime = 0; } catch (_) {}
    }

    // Pause/resume the current BGM without clearing currentBgmId. Used when the
    // music-archive preview plays a track and needs the main BGM to duck out,
    // then come back when the preview stops.
    function pauseBgm() {
        if (state.bgmEl) { try { state.bgmEl.pause(); } catch (_) {} }
    }
    function resumeBgm() {
        if (state.muted) return;
        if (state.bgmEl && state.bgmEl.paused) { try { state.bgmEl.play().catch(() => {}); } catch (_) {} }
    }

    // BGM: pick a random in-game track (excludes menu-only tracks and the
    // currently-playing track if a previous one existed).
    function _pickInGameBgm() {
        const pool = BGM_LIST.filter(t => !t.menuOnly && t.id !== state.currentBgmId);
        if (pool.length === 0) return BGM_LIST.find(t => !t.menuOnly);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function playBgmById(id) {
        const track = BGM_LIST.find(t => t.id === id);
        if (!track) return;
        _switchBgm(track);
    }
    function playRandomInGameBgm() {
        const track = _pickInGameBgm();
        if (track) _switchBgm(track);
    }
    function playMenuBgm() {
        const menu = BGM_LIST.find(t => t.menuOnly);
        if (menu) _switchBgm(menu);
    }
    function stopBgm() {
        if (state.bgmEl) { try { state.bgmEl.pause(); state.bgmEl.currentTime = 0; } catch (_) {} }
        state.currentBgmId = null;
    }

    function _switchBgm(track) {
        if (state.bgmEl && state.currentBgmId === track.id && !state.bgmEl.paused) return;
        if (state.bgmEl) { try { state.bgmEl.pause(); } catch (_) {} }
        const el = new Audio(track.src);
        el.loop = true;
        el.volume = bgmGain();
        state.bgmEl = el;
        state.currentBgmId = track.id;
        try { el.play().catch(() => {}); } catch (_) {}
    }

    // Apply current volumes to all live audio elements.
    function refreshVolumes() {
        if (state.bgmEl)     state.bgmEl.volume     = bgmGain();
        if (state.ambientEl) state.ambientEl.volume = sfxGain('ambient');
        if (state.engineEl)  state.engineEl.volume  = sfxGain('engine');
        if (state.laserEl)   state.laserEl.volume   = sfxGain('laser');
        if (state.chargingEl) state.chargingEl.volume = sfxGain('charging');
    }

    function setVolume(cat, v) {
        v = Math.max(0, Math.min(1, v));
        if (cat === 'bgm' || cat === 'sfx' || cat === 'global') {
            state.vol[cat] = v;
            persist();
            refreshVolumes();
        }
    }
    function getVolume(cat) { return state.vol[cat] != null ? state.vol[cat] : 1.0; }

    function setMuted(m) {
        state.muted = !!m;
        refreshVolumes();
        if (state.muted) {
            [state.bgmEl, state.ambientEl, state.engineEl, state.laserEl, state.chargingEl]
                .forEach(e => { if (e) try { e.pause(); } catch (_) {} });
        } else {
            if (state.bgmEl)     try { state.bgmEl.play().catch(() => {}); } catch (_) {}
            if (state.ambientEl) try { state.ambientEl.play().catch(() => {}); } catch (_) {}
            if (state.engineEl)  try { state.engineEl.play().catch(() => {}); } catch (_) {}
        }
    }

    // Ambient / engine helpers — start on game entry, stop on exit.
    function startAmbient() { startLoop('ambientEl', 'ambient'); }
    function stopAmbient()  { stopLoop('ambientEl'); }
    function startEngine()  { startLoop('engineEl', 'engine'); }
    function stopEngine()   { stopLoop('engineEl'); }
    function startCharging(){ startLoop('chargingEl', 'charging'); }
    function stopCharging() { stopLoop('chargingEl'); }
    function startLaser()   { startLoop('laserEl', 'laser'); }
    function stopLaser()    { stopLoop('laserEl'); }

    // Boot: create pooled one-shots and singleton loops.
    function _boot() {
        _makePool('autoshot',     'audio/sfx/autoshot.mp3',    4);
        _makePool('enemy-hit',    'audio/sfx/enemy-hit.wav',   6);
        _makePool('enemy-death',  'audio/sfx/enemy-death.mp3', 3);
        _makePool('shield-hit',   'audio/sfx/shield-hit.wav',  3);
        _makePool('life-lost',    'audio/sfx/life-lost.mp3',   2);
        _makePool('click',        'audio/sfx/click.mp3',       3);
        _makePool('hover',        'audio/sfx/hover.mp3',       4);
        _makePool('overlay',      'audio/sfx/overlay.wav',     2);
        _makePool('skill-ready',    'audio/sfx/skill-ready.mp3',    3);
        _makePool('skill-unlocked', 'audio/sfx/skill-unlocked.mp3', 2);
        // Reuse laser.mp3 as a one-shot burst for charged-shot release. The
        // sound cuts off at CHARGED_FIRE_MS to feel like a discrete "boom"
        // rather than the full 12s sustain the laser loop uses.
        _makePool('charged-fire', 'audio/sfx/laser.mp3',       3);

        state.ambientEl  = _mkLoop('audio/ingame.mp3');
        state.engineEl   = _mkLoop('audio/sfx/engine.wav');
        state.laserEl    = _mkLoop('audio/sfx/laser.mp3');
        state.chargingEl = _mkLoop('audio/sfx/charging.mp3');
    }
    const CHARGED_FIRE_MS = 700;

    function playChargedShot() {
        const pool = state.pool['charged-fire'];
        if (!pool) return;
        const g = sfxGain('charged-fire');
        if (g <= 0) return;
        const a = pool[state.poolIdx['charged-fire']];
        state.poolIdx['charged-fire'] = (state.poolIdx['charged-fire'] + 1) % pool.length;
        try {
            a.volume = g;
            a.currentTime = 0;
            a.play().catch(() => {});
            setTimeout(() => { try { a.pause(); } catch (_) {} }, CHARGED_FIRE_MS);
        } catch (_) {}
    }
    function _mkLoop(src) {
        const a = new Audio(src);
        a.loop = true;
        a.preload = 'auto';
        return a;
    }

    _boot();

    window.AudioMgr = {
        // BGM
        playMenuBgm, playRandomInGameBgm, playBgmById, stopBgm,
        pauseBgm, resumeBgm,
        list: () => BGM_LIST.slice(),
        currentBgmId: () => state.currentBgmId,

        // SFX
        playSfx,
        playChargedShot,
        startAmbient, stopAmbient,
        startEngine,  stopEngine,
        startCharging, stopCharging,
        startLaser,   stopLaser,

        // Volumes / mute
        setVolume, getVolume,
        setMuted, isMuted: () => state.muted,
        refreshVolumes,
    };
})();
