// Central audio system. All in-game and menu sounds route through this file.
// Volumes have three categories the settings panel exposes:
//   bgm    – menu track + randomized in-game BGM
//   sfx    – gameplay effects + the space "ingame.mp3" ambient loop
//   global – multiplied into both above (master)
// Persisted to localStorage as JSON under key 'audioVols'.

(function () {
    const STORAGE_KEY = 'audioVols';

    // Web Audio graph: everything except the Yog-Sothoth activation cue
    // ("shift-hold") routes through a shared duck-gain -> lowpass-filter
    // chain. Yog-Sothoth Domain and low-HP dazed state both drive this
    // chain to simulate the rest of the mix being smothered — muffled and
    // quiet — while each state's own signature cue (shift-hold / heartbeat)
    // bypasses the chain entirely so it reads as the loudest, clearest
    // thing in the mix. Falls back to silent no-ops with no Web Audio.
    const _AC = window.AudioContext || window.webkitAudioContext;
    const actx = _AC ? new _AC() : null;
    let _duckGain = null, _duckFilter = null;
    const NORMAL_FREQ = 20000; // effectively unfiltered
    if (actx) {
        _duckGain = actx.createGain();
        _duckFilter = actx.createBiquadFilter();
        _duckFilter.type = 'lowpass';
        _duckFilter.frequency.value = NORMAL_FREQ;
        _duckGain.gain.value = 1;
        _duckGain.connect(_duckFilter);
        _duckFilter.connect(actx.destination);
    }

    // Wraps an <audio> element into the Web Audio graph. bypass=true skips
    // the duck/filter chain (routes straight to destination) for sounds that
    // must stay loud and clear no matter what — currently just shift-hold.
    // Connecting an element to createMediaElementSource silences its normal
    // direct output, so every managed element must go through here once.
    function _routeToGraph(el, bypass) {
        if (!actx) return;
        try {
            const src = actx.createMediaElementSource(el);
            src.connect(bypass ? actx.destination : _duckGain);
        } catch (_) {} // already routed, or codec/CORS edge case — sound still plays, just unfiltered
    }

    function unlockContext() {
        if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
    }

    // Multiple independent states can want to duck the mix at once (e.g.
    // dropping to low HP while Yog-Sothoth is already active). Each has its
    // own gain/filter target; whichever active duck is most intense (lowest
    // gain) wins. low-hp is deliberately muffled further than Yog-Sothoth —
    // "choáng" from taking near-fatal damage reads as more disorienting
    // than the domain's own time-distortion hum.
    const DUCK_LEVELS = {
        yogsothoth: { gain: 0.32, freq: 450 },
        lowhp:      { gain: 0.16, freq: 260 },
    };
    const _activeDucks = new Set();
    function _applyDuckState() {
        if (!actx) return;
        let target = { gain: 1, freq: NORMAL_FREQ };
        for (const key of _activeDucks) {
            const d = DUCK_LEVELS[key];
            if (d && d.gain < target.gain) target = d;
        }
        const now = actx.currentTime;
        _duckGain.gain.cancelScheduledValues(now);
        _duckGain.gain.setTargetAtTime(target.gain, now, 0.15);
        _duckFilter.frequency.cancelScheduledValues(now);
        _duckFilter.frequency.setTargetAtTime(target.freq, now, 0.15);
    }
    function enterDuck(key) { _activeDucks.add(key); _applyDuckState(); }
    function exitDuck(key)  { _activeDucks.delete(key); _applyDuckState(); }

    function enterTimeDomain() { enterDuck('yogsothoth'); }
    function exitTimeDomain()  { exitDuck('yogsothoth'); }
    function enterLowHpDuck()  { enterDuck('lowhp'); }
    function exitLowHpDuck()   { exitDuck('lowhp'); }

    // Per-clip base gain. Balance lives in the audio files themselves (gain
    // baked in with ffmpeg's volume filter) so the in-game sliders read as
    // "true 100%" at their default — this map is a 1.0 passthrough, kept as
    // a hook for future per-clip tweaks rather than a real attenuation table.
    // Values 0..1, multiplied by sfx * global.
    const SFX_BASE = {
        autoshot: 1.0, charging: 1.0, 'skill-d-charge': 1.0, laser: 1.0,
        'enemy-hit': 1.0, 'enemy-death': 1.0, 'shield-hit': 1.0, 'life-lost': 1.0,
        click: 1.0, hover: 1.0, overlay: 1.0, engine: 1.0, ambient: 1.0,
        'skill-ready': 1.0, 'skill-unlocked': 1.0,
        'sigil-open': 1.0, 'sigil-confirm': 1.0,
        'sentinel-spawn': 1.0, 'sentinel-explode': 1.0,
        'shift-hold': 1.0, 'shift-teleport': 1.0,
        coronation: 1.0, blackhole: 1.0,
        'spirit-autofire': 1.0, 'tesla-coil-form': 1.0,
        'skill-a-activate': 1.0, 'skill-a-orb-hit': 1.0, 'skill-a-orb-lock': 1.0,
        'skill-f-fire': 1.0, 'skill-f-charge': 1.0,
        'photokrystos-dnt-laser': 1.0, 'photokrystos-boomerang-throw': 1.0, 'photokrystos-boomerang-hit': 1.0,
        'spirit-arc-slash': 1.0,
        gameover: 1.0, 'new-wave': 1.0,
        'maou-haki': 1.0, 'low-hp': 1.0, 'yog-parry': 1.0,
        'charged-shot': 1.0, 'wave-clear': 1.0,
        'dimensional-rift': 1.0, 'dimension-break': 1.0,
        'egregor-nullslash-windup': 1.0, 'egregor-nullslash-slash': 1.0, 'egregor-nullslash-hit': 1.0,
        'egregor-crawl': 1.0, 'egregor-death-roar': 1.0,
    };

    // Positional sfx fall off with distance from the player ship. maxRangeFrac
    // is the fraction of the screen diagonal at which a sound is nearly
    // inaudible; minGain is the floor so distant events stay a faint cue
    // rather than disappearing entirely.
    const POS_MAX_RANGE_FRAC = 0.55;
    const POS_MIN_GAIN = 0.12;
    function _distanceGain(x, y) {
        if (typeof player === 'undefined' || typeof canvas === 'undefined') return 1;
        const dist = Math.hypot(x - player.x, y - player.y);
        const maxRange = Math.hypot(canvas.width, canvas.height) * POS_MAX_RANGE_FRAC;
        if (maxRange <= 0) return 1;
        const t = Math.min(1, dist / maxRange);
        return 1 - t * (1 - POS_MIN_GAIN);
    }

    // 12 in-game BGM tracks + the menu-only track ("Pisces" = soundtrack1.mp3).
    // Menu track is excluded from the in-game random pool.
    const BGM_LIST = [
        { id: 'pisces',                 title: 'Pisces (Menu Theme)',            src: 'audio/bgm/pisces.mp3',                           menuOnly: true },
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
        { id: 'hold-my-hand',           title: 'Please Hold My Hand',            src: 'audio/bgm/please-hold-my-hand.mp3' },
        { id: 'unfair-world',           title: 'Where the Unfair World Keeps Its Secrets', src: 'audio/bgm/where-the-unfair-world-keeps-its-secrets.mp3' },
        { id: 'owari-waltz',            title: 'Owari no Waltz',                 src: 'audio/bgm/owari-no-waltz.mp3' },
        { id: 'peach-blossoms-duel',    title: 'Duel Beneath the Peach Blossoms', src: 'audio/bgm/duel-beneath-the-peach-blossoms.mp3' },
        { id: 'dance-with-me',          title: 'Will You Dance With Me?',        src: 'audio/bgm/will-you-dance-with-me.mp3' },
        { id: 'kyoushinron',            title: 'Kyoushinron',                   src: 'audio/bgm/kyoushinron.mp3' },
    ];

    const state = {
        vol: { bgm: 1.0, sfx: 1.0, global: 1.0 },
        muted: false,
        currentBgmId: null,
        bgmEl: null,
        ambientEl: null,     // ingame.mp3 space background (grouped under SFX)
        engineEl: null,      // engine loop
        laserEl: null,       // sustained laser loop
        chargingEl: null,    // charging hum loop (Space-hold overload laser, 3s)
        skillDChargeEl: null, // black hole charge hum (Skill D, 2s — distinct clip)
        skillFChargeEl: null, // Skill F charge-up cue, cut short at natural pace (not looped)
        skillFFireEl: null,   // Skill F slash cue, cut short when the sweep animation ends (not looped)
        blackholeEl: null,    // black hole ambience, cut short when the hole leaves the screen (not looped)
        maouHakiEl: null,     // Dargruel Maou Haki shockwave cue, cut short when the wave finishes expanding (not looped)
        lowHpEl: null,        // low-HP heartbeat loop (lives < 5), looped while the state holds
        nullSlashWindupEl: null, // Egregor Null Slash windup drone, cut short exactly when the strike phase begins (variable 1-3s duration)
        crawlElA: null, crawlElB: null, // Egregor crawl texture: two alternating one-shots, overlapped so the loop point never reads as silence
        pool: {},            // sfx key → Audio pool (rotated for rapid re-fires)
        poolIdx: {},
    };
    let _crawlActive = false;
    let _crawlCur = null; // 'A' or 'B' — which element we're currently watching for near-end

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
    // bypass routes straight past the duck/filter chain (see shift-hold).
    function _makePool(key, src, size = 3, bypass = false) {
        const arr = [];
        for (let i = 0; i < size; i++) {
            const a = new Audio(src);
            a.preload = 'auto';
            _routeToGraph(a, bypass);
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

    // Positional variant: scales the base gain by distance from the player
    // ship (x, y in world/canvas coordinates), so explosions and events near
    // the player read louder than ones happening far up the screen.
    function playSfxAt(key, x, y) {
        const pool = state.pool[key];
        if (!pool) return;
        const g = sfxGain(key) * _distanceGain(x, y);
        if (g <= 0.005) return;
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

    // Full-mix pause: freezes bgm + every sustained loop and records what was
    // running so resumeAll only unpauses those. Used when the SYSTEM TERMINATED
    // overlay shows so the game goes silent while paused.
    let _pauseSnapshot = null;
    function pauseAll() {
        _pauseSnapshot = {
            bgm:      !!(state.bgmEl      && !state.bgmEl.paused),
            ambient:  !!(state.ambientEl  && !state.ambientEl.paused),
            engine:   !!(state.engineEl   && !state.engineEl.paused),
            laser:    !!(state.laserEl    && !state.laserEl.paused),
            charging: !!(state.chargingEl && !state.chargingEl.paused),
            skillDCharge: !!(state.skillDChargeEl && !state.skillDChargeEl.paused),
            skillFCharge: !!(state.skillFChargeEl && !state.skillFChargeEl.paused),
            skillFFire: !!(state.skillFFireEl && !state.skillFFireEl.paused),
            blackhole: !!(state.blackholeEl && !state.blackholeEl.paused),
            maouHaki: !!(state.maouHakiEl && !state.maouHakiEl.paused),
            lowHp: !!(state.lowHpEl && !state.lowHpEl.paused),
            nullSlashWindup: !!(state.nullSlashWindupEl && !state.nullSlashWindupEl.paused),
            crawlA: !!(state.crawlElA && !state.crawlElA.paused),
            crawlB: !!(state.crawlElB && !state.crawlElB.paused),
        };
        [state.bgmEl, state.ambientEl, state.engineEl, state.laserEl, state.chargingEl, state.skillDChargeEl, state.skillFChargeEl, state.skillFFireEl, state.blackholeEl, state.maouHakiEl, state.lowHpEl, state.nullSlashWindupEl, state.crawlElA, state.crawlElB]
            .forEach(el => { if (el) { try { el.pause(); } catch (_) {} } });
    }
    function resumeAll() {
        if (!_pauseSnapshot || state.muted) { _pauseSnapshot = null; return; }
        const s = _pauseSnapshot;
        _pauseSnapshot = null;
        if (s.bgm      && state.bgmEl)      try { state.bgmEl.play().catch(() => {}); } catch (_) {}
        if (s.ambient  && state.ambientEl)  try { state.ambientEl.play().catch(() => {}); } catch (_) {}
        if (s.engine   && state.engineEl)   try { state.engineEl.play().catch(() => {}); } catch (_) {}
        if (s.laser    && state.laserEl)    try { state.laserEl.play().catch(() => {}); } catch (_) {}
        if (s.charging && state.chargingEl) try { state.chargingEl.play().catch(() => {}); } catch (_) {}
        if (s.skillDCharge && state.skillDChargeEl) try { state.skillDChargeEl.play().catch(() => {}); } catch (_) {}
        if (s.skillFCharge && state.skillFChargeEl) try { state.skillFChargeEl.play().catch(() => {}); } catch (_) {}
        if (s.skillFFire && state.skillFFireEl) try { state.skillFFireEl.play().catch(() => {}); } catch (_) {}
        if (s.blackhole && state.blackholeEl) try { state.blackholeEl.play().catch(() => {}); } catch (_) {}
        if (s.maouHaki && state.maouHakiEl) try { state.maouHakiEl.play().catch(() => {}); } catch (_) {}
        if (s.lowHp && state.lowHpEl) try { state.lowHpEl.play().catch(() => {}); } catch (_) {}
        if (s.nullSlashWindup && state.nullSlashWindupEl) try { state.nullSlashWindupEl.play().catch(() => {}); } catch (_) {}
        if (s.crawlA && state.crawlElA) try { state.crawlElA.play().catch(() => {}); } catch (_) {}
        if (s.crawlB && state.crawlElB) try { state.crawlElB.play().catch(() => {}); } catch (_) {}
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
        _routeToGraph(el, false);
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
        if (state.skillDChargeEl) state.skillDChargeEl.volume = sfxGain('skill-d-charge');
        if (state.skillFChargeEl) state.skillFChargeEl.volume = sfxGain('skill-f-charge');
        if (state.skillFFireEl) state.skillFFireEl.volume = sfxGain('skill-f-fire');
        if (state.blackholeEl) state.blackholeEl.volume = sfxGain('blackhole');
        if (state.maouHakiEl) state.maouHakiEl.volume = sfxGain('maou-haki');
        if (state.lowHpEl) state.lowHpEl.volume = sfxGain('low-hp');
        if (state.nullSlashWindupEl) state.nullSlashWindupEl.volume = sfxGain('egregor-nullslash-windup');
        if (state.crawlElA) state.crawlElA.volume = sfxGain('egregor-crawl');
        if (state.crawlElB) state.crawlElB.volume = sfxGain('egregor-crawl');
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
    function startSkillDCharge(){ startLoop('skillDChargeEl', 'skill-d-charge'); }
    function stopSkillDCharge() { stopLoop('skillDChargeEl'); }
    function startSkillFCharge(){ startLoop('skillFChargeEl', 'skill-f-charge'); }
    function stopSkillFCharge() { stopLoop('skillFChargeEl'); }
    function startSkillFFire()  { startLoop('skillFFireEl', 'skill-f-fire'); }
    function stopSkillFFire()   { stopLoop('skillFFireEl'); }
    function startBlackhole()   { startLoop('blackholeEl', 'blackhole'); }
    function stopBlackhole()    { stopLoop('blackholeEl'); }
    function startMaouHaki()    { startLoop('maouHakiEl', 'maou-haki'); }
    function stopMaouHaki()     { stopLoop('maouHakiEl'); }
    function startNullSlashWindup() { startLoop('nullSlashWindupEl', 'egregor-nullslash-windup'); }
    function stopNullSlashWindup()  { stopLoop('nullSlashWindupEl'); }
    function startLaser()   { startLoop('laserEl', 'laser'); }
    function stopLaser()    { stopLoop('laserEl'); }

    // Egregor crawl: two alternating one-shots, cross-started so the texture
    // never has a silent gap at the loop point ("khi 1 lần sắp hết thì cho 1
    // lượt khác chồng lên"). startEgregorCrawl is idempotent — safe to call
    // every frame while an Egregor is alive. tickEgregorCrawl must be polled
    // each frame to detect when the playing element is nearing its end.
    function startEgregorCrawl() {
        if (_crawlActive) return;
        _crawlActive = true;
        _crawlCur = 'A';
        const el = state.crawlElA;
        if (!el) return;
        try { el.volume = sfxGain('egregor-crawl'); el.currentTime = 0; el.play().catch(() => {}); } catch (_) {}
    }
    function stopEgregorCrawl() {
        _crawlActive = false;
        _crawlCur = null;
        [state.crawlElA, state.crawlElB].forEach(el => { if (el) { try { el.pause(); el.currentTime = 0; } catch (_) {} } });
    }
    function tickEgregorCrawl() {
        if (!_crawlActive) return;
        const curEl  = _crawlCur === 'A' ? state.crawlElA : state.crawlElB;
        const nextEl = _crawlCur === 'A' ? state.crawlElB : state.crawlElA;
        if (!curEl || !nextEl) return;
        const g = sfxGain('egregor-crawl');
        curEl.volume = g; nextEl.volume = g;
        if (curEl.duration && !isNaN(curEl.duration) && (curEl.duration - curEl.currentTime) <= 0.28 && nextEl.paused) {
            try { nextEl.currentTime = 0; nextEl.play().catch(() => {}); } catch (_) {}
            _crawlCur = (_crawlCur === 'A') ? 'B' : 'A';
        }
    }

    // Low-HP heartbeat: loops while lives < 5, and ducks/muffles the rest
    // of the mix (heavier than Yog-Sothoth's own duck) for the "choáng"
    // dazed feel. startLoop/stopLoop already handle the element itself;
    // the duck is a separate call since it affects the whole mix, not just
    // this one element.
    function startLowHp() { startLoop('lowHpEl', 'low-hp'); enterDuck('lowhp'); }
    function stopLowHp()  { stopLoop('lowHpEl'); exitDuck('lowhp'); }

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
        _makePool('sigil-open',       'audio/sfx/sigil-open.mp3',       2);
        _makePool('sigil-confirm',    'audio/sfx/sigil-confirm.mp3',    2);
        _makePool('sentinel-spawn',   'audio/sfx/sentinel-spawn.mp3',   3);
        _makePool('sentinel-explode', 'audio/sfx/sentinel-explode.mp3', 3);
        _makePool('shift-hold',       'audio/sfx/shift-hold.mp3',       2, true);
        _makePool('shift-teleport',   'audio/sfx/shift-teleport.mp3',   2);
        _makePool('coronation',       'audio/sfx/coronation.mp3',       2);
        _makePool('spirit-autofire',  'audio/sfx/spirit-autofire.mp3',  5); // fires ~42ms cadence, needs deep pool
        _makePool('tesla-coil-form',  'audio/sfx/tesla-coil-form.mp3',  2);
        _makePool('skill-a-activate', 'audio/sfx/skill-a-activate.mp3', 2);
        _makePool('skill-a-orb-hit',  'audio/sfx/skill-a-orb-hit.mp3',  4);
        _makePool('skill-a-orb-lock', 'audio/sfx/skill-a-orb-lock.mp3', 4);
        _makePool('photokrystos-dnt-laser',       'audio/sfx/photokrystos-dnt-laser.mp3',       2);
        _makePool('photokrystos-boomerang-throw', 'audio/sfx/photokrystos-boomerang-throw.mp3', 3);
        _makePool('photokrystos-boomerang-hit',   'audio/sfx/photokrystos-boomerang-hit.mp3',   3);
        _makePool('spirit-arc-slash', 'audio/sfx/spirit-arc-slash.mp3', 3);
        _makePool('gameover',  'audio/sfx/gameover.mp3',  1);
        _makePool('new-wave',  'audio/sfx/new-wave.mp3',  2);
        _makePool('yog-parry', 'audio/sfx/yog-parry.mp3', 2);
        _makePool('charged-shot', 'audio/sfx/charged-shot.mp3', 2);
        _makePool('wave-clear',   'audio/sfx/wave-clear.mp3',   1);
        _makePool('dimensional-rift', 'audio/sfx/dimensional-rift.mp3', 2);
        _makePool('dimension-break',  'audio/sfx/dimension-break.mp3',  2);
        _makePool('egregor-nullslash-slash', 'audio/sfx/egregor-nullslash-slash.mp3', 2);
        _makePool('egregor-nullslash-hit',   'audio/sfx/egregor-nullslash-hit.mp3',   2);
        _makePool('egregor-death-roar',      'audio/sfx/egregor-death-roar.mp3',      1);

        state.ambientEl  = _mkLoop('audio/sfx/ingame.mp3');
        state.engineEl   = _mkLoop('audio/sfx/engine.wav');
        state.laserEl    = _mkLoop('audio/sfx/laser.mp3');
        state.chargingEl = _mkLoop('audio/sfx/charging.mp3');
        state.skillDChargeEl = _mkLoop('audio/sfx/skill-d-charge.mp3');
        state.lowHpEl    = _mkLoop('audio/sfx/low-hp.mp3'); // heartbeat, loops while lives < 5
        // Not looped: play once at natural pace, cut short by stopLoop() when
        // the game event they track (charge window / on-screen lifetime /
        // sweep animation) ends rather than being pre-trimmed/time-stretched
        // to a fixed duration.
        state.skillFChargeEl = _mkOnce('audio/sfx/skill-f-charge.mp3');
        state.skillFFireEl   = _mkOnce('audio/sfx/skill-f-fire.mp3');
        state.blackholeEl    = _mkOnce('audio/sfx/blackhole.mp3');
        state.maouHakiEl     = _mkOnce('audio/sfx/maou-haki.mp3');
        state.nullSlashWindupEl = _mkOnce('audio/sfx/egregor-nullslash-windup.mp3');
        state.crawlElA = _mkOnce('audio/sfx/egregor-crawl.mp3');
        state.crawlElB = _mkOnce('audio/sfx/egregor-crawl.mp3');
    }
    function _mkLoop(src) {
        const a = new Audio(src);
        a.loop = true;
        a.preload = 'auto';
        _routeToGraph(a, false);
        return a;
    }
    function _mkOnce(src) {
        const a = new Audio(src);
        a.preload = 'auto';
        _routeToGraph(a, false);
        return a;
    }

    _boot();

    window.AudioMgr = {
        // BGM
        playMenuBgm, playRandomInGameBgm, playBgmById, stopBgm,
        pauseBgm, resumeBgm,
        pauseAll, resumeAll,
        list: () => BGM_LIST.slice(),
        currentBgmId: () => state.currentBgmId,

        // SFX
        playSfx, playSfxAt,
        startAmbient, stopAmbient,
        startEngine,  stopEngine,
        startCharging, stopCharging,
        startSkillDCharge, stopSkillDCharge,
        startSkillFCharge, stopSkillFCharge,
        startSkillFFire, stopSkillFFire,
        startBlackhole, stopBlackhole,
        startMaouHaki, stopMaouHaki,
        startLowHp, stopLowHp,
        startNullSlashWindup, stopNullSlashWindup,
        startEgregorCrawl, stopEgregorCrawl, tickEgregorCrawl,
        startLaser,   stopLaser,

        // Volumes / mute
        setVolume, getVolume,
        setMuted, isMuted: () => state.muted,
        refreshVolumes,

        // Yog-Sothoth time-domain effect + Web Audio unlock
        enterTimeDomain, exitTimeDomain,
        unlockContext,
    };
})();
