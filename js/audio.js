// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Central audio system. All in-game and menu sounds route through this file.
// Volumes have three categories the settings panel exposes:
//   bgm    – menu track + randomized in-game BGM
//   sfx    – gameplay effects + the space "ingame.mp3" ambient loop
//   global – multiplied into both above (master)
// Persisted to localStorage as JSON under key 'audioVols'.
//
// Every sound in the game — one-shot sfx, sustained loops, and BGM — plays
// through decoded AudioBufferSourceNodes on the Web Audio rendering thread.
// This replaces an earlier design where each sound was a pooled/looping
// <audio> element: on at least one real iOS Safari device/version, actively
// playing HTMLMediaElements (looped background tracks, and separately the
// high-frequency one-shot sfx pools like autoshot/spirit-autofire) caused a
// severe main-thread stall between requestAnimationFrame callbacks — proven
// via on-device frame-timing logs, and confirmed by muting audio (which
// pauses/silences those elements) fully restoring normal FPS. Routing the
// continuous loops through Web Audio graph nodes alone didn't fix it either;
// only removing HTMLMediaElement playback from the sustained gameplay loop
// entirely did. The only remaining <audio> elements are short-lived
// "bridge" instances used to start BGM instantly while its buffer decodes
// (see _makeBufferLoop) — never a persistent, long-running element.

(function () {
    const STORAGE_KEY = 'audioVols';
    const STORAGE_KEY_BGM_SEL = 'audioBgmSelection';

    // Web Audio graph: everything except the Yog-Sothoth activation cue
    // ("shift-hold") routes through a shared duck-gain -> lowpass-filter
    // chain. Yog-Sothoth Domain and low-HP dazed state both drive this
    // chain to simulate the rest of the mix being smothered — muffled and
    // quiet — while each state's own signature cue (shift-hold) bypasses
    // the chain entirely via _bypassGain so it reads as the loudest,
    // clearest thing in the mix. Falls back to silent no-ops with no Web
    // Audio.
    const _AC = window.AudioContext || window.webkitAudioContext;
    const actx = _AC ? new _AC() : null;
    let _duckGain = null, _duckFilter = null, _bypassGain = null;
    const NORMAL_FREQ = 20000; // effectively unfiltered
    if (actx) {
        _duckGain = actx.createGain();
        _duckFilter = actx.createBiquadFilter();
        _duckFilter.type = 'lowpass';
        _duckFilter.frequency.value = NORMAL_FREQ;
        _duckGain.gain.value = 1;
        _duckGain.connect(_duckFilter);
        _duckFilter.connect(actx.destination);

        _bypassGain = actx.createGain();
        _bypassGain.gain.value = 1;
        _bypassGain.connect(actx.destination);
    }

    // Decode-once, cache-forever buffer store. Every sound (sfx and BGM
    // alike) is fetched and decoded exactly once per distinct file; all
    // playback afterward just spins up a fresh AudioBufferSourceNode
    // against the cached AudioBuffer, which is cheap and fully supports
    // overlapping concurrent instances of the same clip (autoshot firing
    // faster than one copy can finish, etc.) with no pooling required.
    const _bufferCache = {};
    function _decodeBuffer(src) {
        if (!actx) return Promise.resolve(null);
        if (_bufferCache[src]) return _bufferCache[src];
        const p = fetch(src)
            .then(r => r.arrayBuffer())
            .then(ab => actx.decodeAudioData(ab))
            .catch(e => { console.warn('[Audio] buffer decode failed for ' + src, e); return null; });
        _bufferCache[src] = p;
        return p;
    }

    // Fire-and-forget one-shot playback (sfx pools, positional sfx). Skips
    // silently if the buffer hasn't decoded yet — sfx are prefetched at
    // boot, so in practice this only matters for a sound triggered in the
    // first instant after page load, and a single missed cue there is a
    // fair trade against ever blocking on decode mid-gameplay.
    // returns a cancel handle - most callers ignore it, but a long one-shot
    // (gameover) needs to be killable if the player bails to menu mid-ring
    function _playVoice(src, gainValue, bypass) {
        if (!actx || gainValue <= 0) return { cancel() {} };
        let cancelled = false, liveNode = null;
        _decodeBuffer(src).then(buf => {
            if (!buf || cancelled) return;
            const g = actx.createGain();
            g.gain.value = gainValue;
            g.connect(bypass ? _bypassGain : _duckGain);
            const node = actx.createBufferSource();
            node.buffer = buf;
            node.connect(g);
            node.start(0);
            liveNode = node;
        });
        return {
            cancel() {
                cancelled = true;
                if (liveNode) { try { liveNode.stop(); } catch (_) {} }
            }
        };
    }

    // Minimal HTMLAudioElement-shaped wrapper (paused/volume/play/pause/
    // currentTime) so existing call sites (startLoop/stopLoop, pauseAll/
    // resumeAll, refreshVolumes, setMuted) work unmodified against it.
    // AudioBufferSourceNode can only be started once ever, so play()
    // creates a fresh node from the cached decoded buffer each time.
    // loop param supports BGM's non-looping in-game tracks (advance to a
    // new random track via setOnEnded's callback) vs always-looping sounds
    // (menu track / ambient / engine / laser / charging / heartbeat / ...).
    //
    // A cold decode (a multi-MB BGM file that hasn't been prefetched yet)
    // can take a couple of seconds — long enough to be an audible startup
    // delay if the player clicks "anywhere to start" before it resolves.
    // play() covers that gap with a plain streaming <audio> "bridge" that
    // starts immediately; once the real buffer decode resolves, playback
    // swaps to the AudioBufferSourceNode at the matching position and the
    // bridge element is torn down. The bridge only ever lives for that
    // short decode window, never for the sustained duration of a track, so
    // it doesn't reintroduce the long-lived-<audio>-loop stall this whole
    // rewrite exists to avoid.
    function _makeBufferLoop() {
        const gainNode = actx ? actx.createGain() : null;
        if (gainNode) gainNode.connect(_duckGain);
        let source = null;
        let bufferPromise = null;
        let playing = false;
        let shouldLoop = true;
        let onEndedCb = null;
        let bridgeSrc = null;
        let bridgeEl = null;
        let curVolume = 1;
        let _savedPos = 0;
        let _srcStartCtx = 0;
        let _srcOffset = 0;

        function _swapToBuffer(buf, myBufferPromise) {
            if (!playing || bufferPromise !== myBufferPromise) return;
            const fromBridge = bridgeEl ? bridgeEl.currentTime : _savedPos;
            if (bridgeEl) { try { bridgeEl.pause(); } catch (_) {} bridgeEl = null; }
            source = actx.createBufferSource();
            source.buffer = buf;
            source.loop = shouldLoop;
            source.connect(gainNode);
            if (!shouldLoop) {
                source.onended = () => { if (playing) { playing = false; if (onEndedCb) onEndedCb(); } };
            }
            const offset = shouldLoop ? (fromBridge % buf.duration) : Math.min(fromBridge, Math.max(0, buf.duration - 0.05));
            _srcStartCtx = actx.currentTime;
            _srcOffset = offset;
            source.start(0, offset);
        }

        return {
            get paused() { return !playing; },
            get volume() { return curVolume; },
            set volume(v) {
                curVolume = v;
                if (gainNode) gainNode.gain.value = v;
                if (bridgeEl) bridgeEl.volume = v;
            },
            get duration() { return source && source.buffer ? source.buffer.duration : NaN; },
            setSrc(src, loop = true) {
                bridgeSrc = src; bufferPromise = _decodeBuffer(src); shouldLoop = loop;
                _savedPos = 0;
            },
            setOnEnded(cb) { onEndedCb = cb; },
            play() {
                if (!actx || !bufferPromise) return Promise.resolve();
                playing = true;
                const myBufferPromise = bufferPromise;
                bridgeEl = new Audio(bridgeSrc);
                bridgeEl.loop = shouldLoop;
                bridgeEl.volume = curVolume;
                bridgeEl.preload = 'auto';
                if (_savedPos > 0) { try { bridgeEl.currentTime = _savedPos; } catch (_) {} }
                if (!shouldLoop) {
                    bridgeEl.addEventListener('ended', () => {
                        if (playing && bridgeEl) { playing = false; if (onEndedCb) onEndedCb(); }
                    });
                }
                const playPromise = bridgeEl.play().catch(() => {});
                myBufferPromise.then(buf => {
                    if (!buf) return;
                    _swapToBuffer(buf, myBufferPromise);
                });
                return playPromise;
            },
            pause() {
                playing = false;
                if (source && actx && source.buffer) {
                    const elapsed = actx.currentTime - _srcStartCtx;
                    const dur = source.buffer.duration;
                    _savedPos = shouldLoop
                        ? ((_srcOffset + elapsed) % dur)
                        : Math.min(_srcOffset + elapsed, dur);
                } else if (bridgeEl) {
                    _savedPos = bridgeEl.currentTime;
                }
                if (bridgeEl) { try { bridgeEl.pause(); } catch (_) {} bridgeEl = null; }
                // Manually stopping a source also fires onended per spec —
                // clear it first so pausing/switching never misfires the
                // "track finished, advance to a new one" callback.
                if (source) { try { source.onended = null; source.stop(); } catch (_) {} source = null; }
            },
        };
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
        // plain volume cut, no muffle filter - just wants the transform
        // sfx (bypass-routed) to read clearly, not a disorienting effect
        goliathTransform: { gain: 0.35, freq: NORMAL_FREQ },
        goliathSpawn: { gain: 0.35, freq: NORMAL_FREQ },
    };
    const _activeDucks = new Set();
    function _duckTarget() {
        let target = { gain: 1, freq: NORMAL_FREQ };
        for (const key of _activeDucks) {
            const d = DUCK_LEVELS[key];
            if (d && d.gain < target.gain) target = d;
        }
        return target;
    }
    function _applyDuckState() {
        if (!actx) return;
        const target = _duckTarget();
        const now = actx.currentTime;
        _duckGain.gain.cancelScheduledValues(now);
        _duckGain.gain.setTargetAtTime(target.gain, now, 0.15);
        _duckFilter.frequency.cancelScheduledValues(now);
        _duckFilter.frequency.setTargetAtTime(target.freq, now, 0.15);
    }
    function enterDuck(key) { _activeDucks.add(key); _applyDuckState(); }
    function exitDuck(key)  { _activeDucks.delete(key); _applyDuckState(); }

    // bgm shares _duckGain with everything else, so this naturally pulls
    // the music down too - wanted now, was compensated out before
    function enterGoliathTransformDuck() { enterDuck('goliathTransform'); }
    function exitGoliathTransformDuck()  { exitDuck('goliathTransform'); }
    // Separate key from goliathTransform (not reused) so a short timed duck
    // around the one-shot spawn cue can never prematurely cancel the much
    // longer transform duck if the two ever overlapped.
    function enterGoliathSpawnDuck() { enterDuck('goliathSpawn'); }
    function exitGoliathSpawnDuck()  { exitDuck('goliathSpawn'); }

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
        'enemy-hit': 0.25, 'enemy-death': 1.0, 'shield-hit': 1.0, 'life-lost': 1.0,
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
        'photokrystos-boomerang-bounce': 0.65, 'spinner-bounce': 0.65,
        'spirit-finale-laser': 0.7,
        'spirit-arc-slash': 1.0,
        gameover: 1.0, 'new-wave': 1.0,
        'maou-haki': 1.0, 'low-hp': 1.0, 'yog-parry': 1.0,
        'charged-shot': 1.0, 'wave-clear': 1.0,
        'dimensional-rift': 1.0, 'dimension-break': 1.0,
        'egregor-nullslash-windup': 1.0, 'egregor-nullslash-slash': 1.0, 'egregor-nullslash-hit': 1.0,
        'egregor-crawl': 1.0, 'egregor-death-roar': 1.0, 'egregor-tempest-strike': 1.0,
        'chain-lightning': 1.0,
        'photokrystos-summon-converge': 1.0, 'photokrystos-summon-flash': 1.0, 'photokrystos-summon-holy': 1.0,
        'photokrystos-btm-firing': 1.0, 'photokrystos-btm-shockwave': 1.0, 'photokrystos-btm-kill': 1.0,
        'photokrystos-btm-warming': 1.0, 'photokrystos-idle': 1.0, 'photokrystos-vine-bind': 1.0,
        'laser-fire': 1.0, 'goliath-verdict-launch': 1.0,
        'dargruel-chain-launch': 1.0, 'dargruel-chain-root': 1.0,
        'metal-hit': 1.0, 'phantom-strike': 1.0, 'goliath-transform': 1.0,
        'goliath-idle': 1.0, 'goliath-fracture-step': 1.0, 'goliath-verdict-impact': 1.0, 'goliath-verdict-charge': 1.0,
        'leviathan-perseverance': 1.0, 'goliath-death': 1.0, 'goliath-spawn': 1.0,
        'goliath-corrupted-meteor': 1.0, 'goliath-unbroken-wave': 1.0,
        'gate-of-babylon': 1.0, 'enuma-elish-charge': 1.0, 'enuma-elish-release': 1.0,
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

    // 21 in-game BGM tracks + the menu-only track ("Pisces" = soundtrack1.mp3).
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
        { id: 'last-cicada',            title: "The Last Cicada's Song",         src: 'audio/bgm/the-last-cicadas-song.mp3' },
        { id: 'summer-fades',           title: 'Where Summer Fades to Silence',  src: 'audio/bgm/where-summer-fades-to-silence.mp3' },
        { id: 'hold-my-hand',           title: 'Please Hold My Hand',            src: 'audio/bgm/please-hold-my-hand.mp3' },
        { id: 'unfair-world',           title: 'Where the Unfair World Keeps Its Secrets', src: 'audio/bgm/where-the-unfair-world-keeps-its-secrets.mp3' },
        { id: 'owari-waltz',            title: 'Owari no Waltz',                 src: 'audio/bgm/owari-no-waltz.mp3' },
        { id: 'peach-blossoms-duel',    title: 'Duel Beneath the Peach Blossoms', src: 'audio/bgm/duel-beneath-the-peach-blossoms.mp3' },
        { id: 'dance-with-me',          title: 'Will You Dance With Me?',        src: 'audio/bgm/will-you-dance-with-me.mp3' },
        { id: 'kyoushinron',            title: 'Kyoushinron',                   src: 'audio/bgm/kyoushinron.mp3' },
        { id: 'bartholomew-fair',       title: 'Bartholomew Fair',              src: 'audio/bgm/bartholomew-fair.mp3' },
        { id: 'resurrection',           title: 'Resurrection',                  src: 'audio/bgm/resurrection.mp3' },
        { id: 'blue-sky',               title: 'Blue Sky',                      src: 'audio/bgm/blue-sky.mp3' },
        { id: 'sousei-no-hi',           title: 'Sousei no Hi',                  src: 'audio/bgm/sousei-no-hi.mp3' },
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
        goliathVerdictChargeEl: null, // Goliath Absolute Verdict channel hum, cut short exactly when the 3s channel completes and the orb fires
        crawlEl: null,        // Egregor crawl texture, a native gapless AudioBufferSourceNode loop
        photokrystosIdleEl: null, // Phōtokrystos flight/movement texture, same native gapless loop
        goliathIdleEl: null, // Goliath True Form ambient breathing/hum, same native gapless loop
        pool: {},            // sfx key → { src, bypass }
        // In-game BGM rotation pool the player picked in Settings (track ids,
        // excludes the menu-only "pisces" track — that one never plays in a
        // match). Empty = random from the FULL in-game pool (default).
        selectedBgmIds: [],
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

    // Load persisted BGM rotation selection (separate key — kept independent
    // of the volumes blob so neither format has to know about the other).
    try {
        const rawSel = localStorage.getItem(STORAGE_KEY_BGM_SEL);
        if (rawSel) {
            const arr = JSON.parse(rawSel);
            if (Array.isArray(arr)) state.selectedBgmIds = arr.filter(id => BGM_LIST.some(t => t.id === id && !t.menuOnly));
        }
    } catch (_) {}

    function persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.vol)); } catch (_) {}
    }

    function bgmGain()  { return state.muted ? 0 : state.vol.bgm    * state.vol.global; }
    // Goliath's spawn/transform cues stay at full volume no matter how low
    // the player has the SFX slider set - they're one-time story beats, not
    // ambient loops, and getting drowned out by a low SFX setting undercuts
    // the moment. Mute and the global slider still apply.
    const FORCE_FULL_SFX = new Set(['goliath-spawn', 'goliath-transform']);
    function sfxGain(k) {
        if (state.muted) return 0;
        if (FORCE_FULL_SFX.has(k)) return state.vol.global;
        return (SFX_BASE[k] || 0.5) * state.vol.sfx * state.vol.global;
    }

    // Prefetch/decode a one-shot sfx clip. size is a historical pool-depth
    // hint from the pre-Web-Audio pooled-<audio> design — playback no longer
    // pools discrete elements (a fresh AudioBufferSourceNode per play()
    // supports unlimited overlapping instances natively) so it's unused now,
    // kept only so the many call sites below don't need touching.
    // bypass routes straight past the duck/filter chain (see shift-hold).
    function _makePool(key, src, size = 3, bypass = false) {
        _decodeBuffer(src);
        state.pool[key] = { src, bypass };
    }

    function playSfx(key) {
        const p = state.pool[key];
        if (!p) return;
        const g = sfxGain(key);
        if (g <= 0) return;
        return _playVoice(p.src, g, p.bypass);
    }

    // Positional variant: scales the base gain by distance from the player
    // ship (x, y in world/canvas coordinates), so explosions and events near
    // the player read louder than ones happening far up the screen.
    function playSfxAt(key, x, y) {
        const p = state.pool[key];
        if (!p) return;
        const g = sfxGain(key) * _distanceGain(x, y);
        if (g <= 0.005) return;
        _playVoice(p.src, g, p.bypass);
    }

    // Loop controls for sustained sfx (charging, laser, crawl, idle, ...). Idempotent.
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
            crawl: !!(state.crawlEl && !state.crawlEl.paused),
            photokrystosIdle: !!(state.photokrystosIdleEl && !state.photokrystosIdleEl.paused),
            goliathIdle: !!(state.goliathIdleEl && !state.goliathIdleEl.paused),
            goliathVerdictCharge: !!(state.goliathVerdictChargeEl && !state.goliathVerdictChargeEl.paused),
        };
        [state.bgmEl, state.ambientEl, state.engineEl, state.laserEl, state.chargingEl, state.skillDChargeEl, state.skillFChargeEl, state.skillFFireEl, state.blackholeEl, state.maouHakiEl, state.lowHpEl, state.nullSlashWindupEl, state.crawlEl, state.photokrystosIdleEl, state.goliathIdleEl, state.goliathVerdictChargeEl]
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
        if (s.crawl && state.crawlEl) try { state.crawlEl.play().catch(() => {}); } catch (_) {}
        if (s.photokrystosIdle && state.photokrystosIdleEl) try { state.photokrystosIdleEl.play().catch(() => {}); } catch (_) {}
    }

    // BGM: pick a random in-game track (excludes menu-only tracks and the
    // currently-playing track if a previous one existed). Restricted to the
    // player's Settings selection when non-empty; falls back to the full
    // in-game pool the instant the selection is emptied out.
    function _pickInGameBgm() {
        const base = state.selectedBgmIds.length > 0
            ? BGM_LIST.filter(t => !t.menuOnly && state.selectedBgmIds.includes(t.id))
            : BGM_LIST.filter(t => !t.menuOnly);
        const pool = base.filter(t => t.id !== state.currentBgmId);
        if (pool.length === 0) return base[0] || BGM_LIST.find(t => !t.menuOnly);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function persistBgmSelection() {
        try { localStorage.setItem(STORAGE_KEY_BGM_SEL, JSON.stringify(state.selectedBgmIds)); } catch (_) {}
    }
    function getSelectedBgmIds() { return state.selectedBgmIds.slice(); }
    function isBgmSelected(id) { return state.selectedBgmIds.includes(id); }
    // Toggle a track in/out of the rotation pool. Returns the new selected-on
    // state (true = now in the pool) so the UI can update without a re-query.
    function toggleBgmSelection(id) {
        const track = BGM_LIST.find(t => t.id === id && !t.menuOnly);
        if (!track) return false;
        const idx = state.selectedBgmIds.indexOf(id);
        let nowOn;
        if (idx === -1) { state.selectedBgmIds.push(id); nowOn = true; }
        else { state.selectedBgmIds.splice(idx, 1); nowOn = false; }
        persistBgmSelection();
        return nowOn;
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
        // Same track already loaded, whether it's actively playing or just
        // paused (e.g. the pause screen froze it via pauseAll()) - either
        // way a real track switch isn't wanted, only resumeAll()/pauseAll()
        // should touch play state while it's the current track. Used to
        // only check "!paused", so re-requesting the same track while
        // paused fell through to setSrc()+play(), which resets its saved
        // position and restarted it from 0 instead of leaving it alone.
        if (state.currentBgmId === track.id) return;
        state.bgmEl.pause();
        // Menu has only one track (loops itself forever). In-game tracks
        // shouldn't loop the same song all match — advance to a new random
        // in-game track instead once this one finishes.
        state.bgmEl.setSrc(track.src, !!track.menuOnly);
        state.bgmEl.volume = bgmGain();
        state.currentBgmId = track.id;
        if (!track.menuOnly) {
            state.bgmEl.setOnEnded(() => {
                if (state.currentBgmId === track.id) playRandomInGameBgm();
            });
        }
        state.bgmEl.play().catch(() => {});
        _evictStaleBgmBuffers(track.src);
    }

    // Decoded BGM buffers (raw PCM) run far larger in memory than the mp3
    // on disk, and _bufferCache never expires on its own — over a long
    // session of random in-game tracks this grows unbounded. Only the
    // track that's actually playing (plus the menu theme, reused on every
    // return to the title screen) needs to stay decoded; every other
    // in-game track's buffer is dropped so it re-decodes next time it's
    // picked instead of sitting in memory unused.
    function _evictStaleBgmBuffers(keepSrc) {
        BGM_LIST.forEach(t => {
            if (!t.menuOnly && t.src !== keepSrc) delete _bufferCache[t.src];
        });
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
        if (state.crawlEl) state.crawlEl.volume = sfxGain('egregor-crawl');
        if (state.photokrystosIdleEl) state.photokrystosIdleEl.volume = sfxGain('photokrystos-idle');
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
        // refreshVolumes() only zeroes gain for sounds started AFTER this
        // point - a one-shot already mid-playback (its own gain node was
        // fixed at start time) keeps going since _duckGain/_bypassGain are
        // the only path to actx.destination and neither was touched. Hard
        // mute both here so nothing already in flight survives the toggle.
        if (actx && _duckGain && _bypassGain) {
            const now = actx.currentTime;
            _duckGain.gain.cancelScheduledValues(now);
            _bypassGain.gain.cancelScheduledValues(now);
            if (state.muted) {
                _duckGain.gain.setTargetAtTime(0, now, 0.05);
                _bypassGain.gain.setTargetAtTime(0, now, 0.05);
            } else {
                _duckGain.gain.setTargetAtTime(_duckTarget().gain, now, 0.05);
                _bypassGain.gain.setTargetAtTime(1, now, 0.05);
            }
        }
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
    function startDeathStar()   { startLoop('blackholeEl', 'blackhole'); }
    function stopDeathStar()    { stopLoop('blackholeEl'); }
    function startMaouHaki()    { startLoop('maouHakiEl', 'maou-haki'); }
    function stopMaouHaki()     { stopLoop('maouHakiEl'); }
    function startNullSlashWindup() { startLoop('nullSlashWindupEl', 'egregor-nullslash-windup'); }
    function stopNullSlashWindup()  { stopLoop('nullSlashWindupEl'); }
    function startGoliathVerdictCharge() { startLoop('goliathVerdictChargeEl', 'goliath-verdict-charge'); }
    function stopGoliathVerdictCharge()  { stopLoop('goliathVerdictChargeEl'); }
    function startLaser()   { startLoop('laserEl', 'laser'); }
    function stopLaser()    { stopLoop('laserEl'); }

    // Egregor crawl / Phōtokrystos idle: continuous background textures.
    // AudioBufferSourceNode.loop is sample-accurate and gapless, so unlike
    // the old HTMLAudioElement version (which needed two alternating clips
    // crossfaded across their final quarter to hide the loop-point seam),
    // a single looping buffer node just works — tick* are kept as no-op
    // stubs since main.js/skills.js/entities.js still poll them every frame.
    function startEgregorCrawl() { startLoop('crawlEl', 'egregor-crawl'); }
    function stopEgregorCrawl()  { stopLoop('crawlEl'); }
    function tickEgregorCrawl()  {}
    function startPhotokrystosIdle() { startLoop('photokrystosIdleEl', 'photokrystos-idle'); }
    function stopPhotokrystosIdle()  { stopLoop('photokrystosIdleEl'); }
    function tickPhotokrystosIdle()  {}
    function startGoliathIdle() { startLoop('goliathIdleEl', 'goliath-idle'); }
    function stopGoliathIdle()  { stopLoop('goliathIdleEl'); }

    // Low-HP heartbeat: loops while lives < 5, and ducks/muffles the rest
    // of the mix (heavier than Yog-Sothoth's own duck) for the "choáng"
    // dazed feel. startLoop/stopLoop already handle the element itself;
    // the duck is a separate call since it affects the whole mix, not just
    // this one element.
    function startLowHp() { startLoop('lowHpEl', 'low-hp'); enterDuck('lowhp'); }
    function stopLowHp()  { stopLoop('lowHpEl'); exitDuck('lowhp'); }

    // Boot: prefetch/decode one-shot sfx and set up singleton loops.
    function _boot() {
        state.bgmEl = _makeBufferLoop(); // src set per-track in _switchBgm
        // Kick off the menu track's decode immediately on page load instead
        // of waiting for the "click anywhere to start" gesture — decoding a
        // multi-MB mp3 takes real time, and _decodeBuffer's cache means the
        // later playMenuBgm() call just picks up the already-resolved buffer.
        const _menuTrack = BGM_LIST.find(t => t.menuOnly);
        if (_menuTrack) _decodeBuffer(_menuTrack.src);
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
        _makePool('photokrystos-boomerang-bounce', 'audio/sfx/photokrystos-boomerang-bounce.mp3', 3);
        _makePool('spinner-bounce', 'audio/sfx/spinner-bounce.mp3', 3);
        _makePool('spirit-finale-laser', 'audio/sfx/spirit-finale-laser.mp3', 4);
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
        _makePool('egregor-tempest-strike',  'audio/sfx/egregor-tempest-strike.mp3',  2);
        _makePool('chain-lightning',         'audio/sfx/chain-lightning.mp3',         4);
        _makePool('photokrystos-summon-converge', 'audio/sfx/photokrystos-summon-converge.mp3', 1);
        _makePool('photokrystos-summon-flash',    'audio/sfx/photokrystos-summon-flash.mp3',    1);
        _makePool('photokrystos-summon-holy',     'audio/sfx/photokrystos-summon-holy.mp3',     1);
        _makePool('photokrystos-btm-firing',      'audio/sfx/photokrystos-btm-firing.mp3',      1);
        _makePool('photokrystos-btm-shockwave',   'audio/sfx/photokrystos-btm-shockwave.mp3',   1);
        _makePool('photokrystos-btm-kill',        'audio/sfx/photokrystos-btm-kill.mp3',        6);
        _makePool('photokrystos-btm-warming',     'audio/sfx/photokrystos-btm-warming.mp3',     1);
        _makePool('photokrystos-vine-bind',       'audio/sfx/photokrystos-vine-bind.mp3',       3);
        _makePool('laser-fire',             'audio/sfx/laser-fire.mp3',             3);
        _makePool('goliath-verdict-launch', 'audio/sfx/goliath-verdict-launch.mp3', 1);
        _makePool('dargruel-chain-launch',  'audio/sfx/dargruel-chain-launch.mp3',  2);
        _makePool('dargruel-chain-root',    'audio/sfx/dargruel-chain-root.mp3',    2);
        _makePool('metal-hit',              'audio/sfx/metal-hit.mp3',              6);
        _makePool('phantom-strike',         'audio/sfx/phantom-strike.mp3',         2);
        _makePool('goliath-transform',      'audio/sfx/goliath-transform.mp3',      1, true); // bypass duck so it stays clear
        _makePool('goliath-fracture-step',  'audio/sfx/goliath-fracture-step.mp3',  2);
        _makePool('goliath-verdict-impact', 'audio/sfx/goliath-verdict-impact.mp3', 2);
        _makePool('leviathan-perseverance', 'audio/sfx/leviathan-perseverance.mp3', 2);
        _makePool('goliath-death',          'audio/sfx/goliath-death.mp3',          1);
        _makePool('goliath-spawn',          'audio/sfx/goliath-spawn.mp3',          1, true); // bypass duck so it stays clear, matches goliath-transform
        _makePool('goliath-corrupted-meteor', 'audio/sfx/goliath-corrupted-meteor.mp3', 2);
        _makePool('goliath-unbroken-wave',  'audio/sfx/goliath-unbroken-wave.mp3',  1);
        _makePool('gate-of-babylon',        'audio/sfx/gate-of-babylon.mp3',        2);
        _makePool('enuma-elish-charge',     'audio/sfx/enuma-elish-charge.mp3',     1);
        _makePool('enuma-elish-release',    'audio/sfx/enuma-elish-release.mp3',    1);

        state.ambientEl  = _makeBufferLoop();
        state.ambientEl.setSrc('audio/sfx/ingame.mp3');
        state.engineEl   = _makeBufferLoop();
        state.engineEl.setSrc('audio/sfx/engine.wav');
        state.laserEl    = _makeBufferLoop();
        state.laserEl.setSrc('audio/sfx/laser.mp3');
        state.chargingEl = _makeBufferLoop();
        state.chargingEl.setSrc('audio/sfx/charging.mp3');
        state.skillDChargeEl = _makeBufferLoop();
        state.skillDChargeEl.setSrc('audio/sfx/skill-d-charge.mp3');
        state.lowHpEl = _makeBufferLoop(); // heartbeat, loops while lives < 5
        state.lowHpEl.setSrc('audio/sfx/low-hp.mp3');
        state.photokrystosIdleEl = _makeBufferLoop();
        state.photokrystosIdleEl.setSrc('audio/sfx/photokrystos-idle.mp3');
        state.crawlEl = _makeBufferLoop();
        state.crawlEl.setSrc('audio/sfx/egregor-crawl.mp3');
        state.goliathIdleEl = _makeBufferLoop();
        state.goliathIdleEl.setSrc('audio/sfx/goliath-idle.mp3');
        // Not looped: play once at natural pace, cut short by stopLoop() when
        // the game event they track (charge window / on-screen lifetime /
        // sweep animation) ends rather than being pre-trimmed/time-stretched
        // to a fixed duration.
        state.skillFChargeEl = _makeBufferLoop();
        state.skillFChargeEl.setSrc('audio/sfx/skill-f-charge.mp3', false);
        state.skillFFireEl = _makeBufferLoop();
        state.skillFFireEl.setSrc('audio/sfx/skill-f-fire.mp3', false);
        state.blackholeEl = _makeBufferLoop();
        state.blackholeEl.setSrc('audio/sfx/blackhole.mp3', false);
        state.maouHakiEl = _makeBufferLoop();
        state.maouHakiEl.setSrc('audio/sfx/maou-haki.mp3', false);
        state.nullSlashWindupEl = _makeBufferLoop();
        state.nullSlashWindupEl.setSrc('audio/sfx/egregor-nullslash-windup.mp3', false);
        state.goliathVerdictChargeEl = _makeBufferLoop();
        state.goliathVerdictChargeEl.setSrc('audio/sfx/goliath-verdict-charge.mp3', false);
    }

    _boot();

    window.AudioMgr = {
        // BGM
        playMenuBgm, playRandomInGameBgm, playBgmById, stopBgm,
        pauseBgm, resumeBgm,
        pauseAll, resumeAll,
        list: () => BGM_LIST.slice(),
        currentBgmId: () => state.currentBgmId,
        getSelectedBgmIds, isBgmSelected, toggleBgmSelection,

        // SFX
        playSfx, playSfxAt,
        startAmbient, stopAmbient,
        startEngine,  stopEngine,
        startCharging, stopCharging,
        startSkillDCharge, stopSkillDCharge,
        startSkillFCharge, stopSkillFCharge,
        startSkillFFire, stopSkillFFire,
        startDeathStar, stopDeathStar,
        startMaouHaki, stopMaouHaki,
        startLowHp, stopLowHp,
        startNullSlashWindup, stopNullSlashWindup,
        startGoliathVerdictCharge, stopGoliathVerdictCharge,
        startEgregorCrawl, stopEgregorCrawl, tickEgregorCrawl,
        startPhotokrystosIdle, stopPhotokrystosIdle, tickPhotokrystosIdle,
        startGoliathIdle, stopGoliathIdle,
        startLaser,   stopLaser,

        // Volumes / mute
        setVolume, getVolume,
        setMuted, isMuted: () => state.muted,
        refreshVolumes,

        // Yog-Sothoth time-domain effect + Web Audio unlock
        enterTimeDomain, exitTimeDomain,
        enterGoliathTransformDuck, exitGoliathTransformDuck,
        enterGoliathSpawnDuck, exitGoliathSpawnDuck,
        unlockContext,
    };
})();
