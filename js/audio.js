// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
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
    // Decoded buffers by src, so a one-shot can start without a promise hop.
    const _decodedBuffers = {};
    const _decodeQueue = [];
    let _decoding = 0;
    function _queueDecode(load) {
        return new Promise(resolve => {
            _decodeQueue.push({ load, resolve });
            _pumpDecodes();
        });
    }
    function _pumpDecodes() {
        while (_decoding < 3 && _decodeQueue.length) {
            const job = _decodeQueue.shift(); _decoding++;
            Promise.resolve().then(job.load).catch(() => null).then(buf => {
                _decoding--; job.resolve(buf); _pumpDecodes();
            });
        }
    }
    function _decodeBuffer(src) {
        if (!actx) return Promise.resolve(null);
        if (_bufferCache[src]) return _bufferCache[src];
        const p = _queueDecode(() => fetch(src)
            .then(r => { if (!r.ok) throw Error('Audio unavailable'); return r.arrayBuffer(); })
            .then(ab => actx.decodeAudioData(ab)))
            .then(buf => {
                if (buf && _bufferCache[src] === p) _decodedBuffers[src] = buf;
                if (!buf && _bufferCache[src] === p) delete _bufferCache[src];
                return buf;
            })
            .catch(e => { console.warn('[Audio] buffer decode failed for ' + src, e); return null; });
        _bufferCache[src] = p;
        return p;
    }

    // Cold one-shots wait for decoding and keep their cancellation handle.
    // returns a cancel handle - most callers ignore it, but a long one-shot
    // (gameover) needs to be killable if the player bails to menu mid-ring
    // Live positional one-shots. Past the cap a new combat sound is dropped:
    // dozens of overlapping hits are inaudible as separate sounds but each
    // costs nodes. Non-positional cues (wave, game over) are never capped.
    const MAX_SFX_VOICES = 24;
    let _liveVoices = 0;
    function _playVoice(src, gainValue, bypass, capped) {
        if (!actx || gainValue <= 0) return { cancel() {} };
        let cancelled = false, liveNode = null, liveGain = null;
        const start = buf => {
            if (!buf || cancelled || (capped && _liveVoices >= MAX_SFX_VOICES)) return;
            const g = actx.createGain();
            liveGain = g;
            g.gain.value = gainValue;
            g.connect(bypass ? _bypassGain : _duckGain);
            const node = actx.createBufferSource();
            node.buffer = buf;
            node.connect(g);
            if (capped) _liveVoices++;
            node.onended = () => { if (capped) _liveVoices = Math.max(0, _liveVoices - 1); try { g.disconnect(); } catch (_) {} };
            node.start(0);
            liveNode = node;
        };
        const ready = _decodedBuffers[src];
        if (ready) start(ready); else _decodeBuffer(src).then(start);
        return {
            // fadeSec above 0 ramps the voice down first so a cut mid-sound does not click
            cancel(fadeSec) {
                cancelled = true;
                if (!liveNode) return;
                try {
                    if (fadeSec > 0 && liveGain) {
                        const t = actx.currentTime;
                        liveGain.gain.setValueAtTime(liveGain.gain.value, t);
                        liveGain.gain.linearRampToValueAtTime(0, t + fadeSec);
                        liveNode.stop(t + fadeSec + 0.01);
                    } else liveNode.stop();
                } catch (_) {}
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
    // bypass routes the loop past the duck/filter chain, for a sound that is
    // its own moment rather than part of the gameplay mix. Everything else
    // sits on _duckGain so low-hp and the domain ducks can still muffle it.
    function _makeBufferLoop(bypass = false) {
        const gainNode = actx ? actx.createGain() : null;
        if (gainNode) gainNode.connect(bypass ? _bypassGain : _duckGain);
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
        let playToken = 0;

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
            // stopLoop/stopBgm seek to 0 through this so the next play() starts
            // from the top; without it a cut-short or finished cue would resume
            // from where it stopped (or from its very end, heard as silence)
            set currentTime(t) {
                const wasPlaying = playing;
                if (wasPlaying) this.pause();
                _savedPos = Math.max(0, t || 0);
                if (wasPlaying) this.play();
            },
            setSrc(src, loop = true) {
                bridgeSrc = src; bufferPromise = null; shouldLoop = loop;
                _savedPos = 0;
            },
            prepare() { return bridgeSrc ? _decodeBuffer(bridgeSrc) : Promise.resolve(); },
            setOnEnded(cb) { onEndedCb = cb; },
            play() {
                if (!actx || !bridgeSrc) return Promise.resolve();
                // already sounding: a second start would leave the first
                // source running underneath, heard as the track doubling
                if (playing) return Promise.resolve();
                if (!bufferPromise) bufferPromise = _decodeBuffer(bridgeSrc);
                playing = true;
                const myBufferPromise = bufferPromise;
                // A fresh decode takes real async time, so a quick stop+
                // restart of the SAME sound (charge canceled, then
                // retriggered before the first decode resolves) used to let
                // both play() calls' .then() callbacks pass the "stale
                // promise" check below (bufferPromise only changes on
                // setSrc(), not per play() call) and both swap in a live
                // AudioBufferSourceNode - two overlapping copies of the
                // same loop, heard as the sound doubling/repeating. A
                // per-call token lets only the MOST RECENT play() actually
                // swap in a source.
                const myToken = ++playToken;
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
                    if (!buf || myToken !== playToken) return;
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
                bufferPromise = null;
            },
        };
    }

    // Decode overlapping MP3 windows and schedule only their central samples.
    function _makeAmbientStream() {
        const src = 'assets/audio/sfx/ingame.mp3', fallback = _makeBufferLoop();
        fallback.setSrc(src);
        const gain = actx ? actx.createGain() : null;
        if (gain) gain.connect(_duckGain);
        let decoder, encoded, info, loading, failed = false, playing = false, volume = 1;
        let token = 0, filling = 0, saved = 0, began = 0, nextAt = 0, cursor = 0, offset = 0;
        let nodes = [];
        const parts = new Map();
        function stopNodes() {
            for (const n of nodes) { n.onended = null; try { n.stop(); n.disconnect(); } catch (_) {} }
            nodes = [];
        }
        function fail() {
            if (failed) return;
            if (playing && began) saved += Math.max(0, actx.currentTime - began);
            failed = true; token++; stopNodes(); parts.clear(); encoded = null; decoder = null;
            fallback.volume = volume; fallback.currentTime = saved;
            if (playing) fallback.play().catch(() => {});
            console.warn('[Audio] Ambient window decoding unavailable: using full track.');
        }
        function ready() {
            if (!loading) loading = Promise.all([
                fetch('assets/audio/sfx/ingame-slices.json').then(r => { if (!r.ok) throw Error('Ambient index unavailable'); return r.json(); }),
                fetch(src).then(r => { if (!r.ok) throw Error('Ambient unavailable'); return r.arrayBuffer(); }),
            ]).then(([manifest, bytes]) => {
                if (bytes.byteLength !== manifest.bytes) throw Error('Ambient index mismatch');
                decoder = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 1, manifest.rate);
                info = manifest; encoded = bytes;
            }).catch(fail);
            return loading;
        }
        function loadPart(index) {
            if (!parts.has(index)) {
                const p = info.parts[index];
                parts.set(index, _queueDecode(() => decoder.decodeAudioData(encoded.slice(p[0], p[1]))).then(buf => {
                    if (!buf) throw Error('Ambient window unavailable');
                    return buf;
                }));
            }
            return parts.get(index);
        }
        async function fill(id) {
            if (filling === id || failed || !playing || id !== token) return;
            filling = id;
            try {
                while (nodes.length < 2 && playing && id === token) {
                    const index = cursor, buf = await loadPart(index);
                    if (!playing || id !== token) return;
                    const part = info.parts[index], n = actx.createBufferSource();
                    const duration = part[3] / info.rate - offset;
                    n.buffer = buf; n.connect(gain); nodes.push(n);
                    n.onended = () => { n.disconnect(); nodes = nodes.filter(v => v !== n); fill(id); };
                    const at = Math.max(nextAt, actx.currentTime + .025);
                    if (!began) began = at;
                    n.start(at, part[2] / info.rate + offset, duration);
                    nextAt = at + duration; offset = 0; cursor = (cursor + 1) % info.parts.length;
                    parts.delete(index);
                }
                if (playing && id === token) loadPart(cursor).catch(fail);
            } catch (_) { if (id === token) fail(); }
            finally { if (filling === id) filling = 0; }
        }
        const loop = {
            get paused() { return failed ? fallback.paused : !playing; },
            get volume() { return volume; },
            set volume(v) { volume = v; if (gain) gain.gain.value = v; fallback.volume = v; },
            get duration() { return failed ? fallback.duration : info ? info.frames / info.rate : NaN; },
            set currentTime(v) {
                if (failed) { fallback.currentTime = v; return; }
                const active = playing; if (active) loop.pause(); saved = Math.max(0, v || 0); if (active) loop.play();
            },
            prepare() { return ready().then(() => failed ? null : Promise.all([loadPart(0), loadPart(1)])).catch(fail); },
            play() {
                if (failed) return fallback.play();
                if (!actx || playing) return Promise.resolve();
                playing = true; const id = ++token;
                return ready().then(() => {
                    if (failed || id !== token || !playing) return;
                    saved %= info.frames / info.rate; cursor = Math.floor(saved / 12); offset = saved - cursor * 12;
                    began = 0; nextAt = actx.currentTime + .025;
                    return fill(id);
                });
            },
            pause() {
                if (failed) { fallback.pause(); return; }
                if (playing && began) saved = (saved + Math.max(0, actx.currentTime - began)) % (info.frames / info.rate);
                playing = false; token++; stopNodes(); parts.clear();
            },
        };
        if (actx) loop.prepare();
        return loop;
    }

    // Yog-Sothoth Domain theme: a full-volume music bed, never ducked or
    // muffled - it IS the domain's own music, not something the domain's
    // usual lowpass duck should be dulling. Starts from a random point in
    // the track each activation (rather than always the same spot) and
    // fades in/out instead of snapping, so back-to-back activations don't
    // feel identical or abrupt. Deliberately its own small dedicated player
    // rather than another _makeBufferLoop() instance - random-start and
    // fade in/out aren't shared needs, so this stays isolated instead of
    // growing the shared factory's surface for a one-off.
    let _yogThemeSource = null, _yogThemeGain = null, _yogThemeToken = 0;
    const YOG_THEME_SRC = 'assets/audio/sfx/yog-sothoth-domain-theme.mp3';
    function startYogDomainTheme() {
        if (!actx || state.muted) return;
        const myToken = ++_yogThemeToken;
        _decodeBuffer(YOG_THEME_SRC).then(buf => {
            if (!buf || myToken !== _yogThemeToken) return; // stopped/retriggered before decode finished
            if (_yogThemeSource) { try { _yogThemeSource.stop(); } catch (_) {} }
            _yogThemeGain = actx.createGain();
            _yogThemeGain.connect(_bypassGain);
            _yogThemeSource = actx.createBufferSource();
            _yogThemeSource.buffer = buf;
            _yogThemeSource.loop = true;
            _yogThemeSource.connect(_yogThemeGain);
            _yogThemeSource.start(0, Math.random() * buf.duration);

            const targetVol = (SFX_BASE['yog-sothoth-domain-theme'] || 1.0) * state.vol.sfx * state.vol.global;
            const now = actx.currentTime;
            _yogThemeGain.gain.setValueAtTime(0, now);
            _yogThemeGain.gain.linearRampToValueAtTime(targetVol, now + 1.4);
        });
    }
    function stopYogDomainTheme() {
        _yogThemeToken++; // invalidates a still-decoding start() so it never plays after this
        if (_yogThemeGain && actx) {
            const now = actx.currentTime;
            _yogThemeGain.gain.cancelScheduledValues(now);
            _yogThemeGain.gain.setValueAtTime(_yogThemeGain.gain.value, now);
            _yogThemeGain.gain.linearRampToValueAtTime(0, now + 1.0);
        }
        const src = _yogThemeSource;
        _yogThemeSource = null;
        if (src) setTimeout(() => { try { src.stop(); } catch (_) {} }, 1050);
    }
    // Keeps the theme's actual output in step with the sfx/global sliders
    // while it's playing, same as refreshVolumes() does for every other loop.
    function _refreshYogThemeVolume() {
        if (_yogThemeGain && actx && !state.muted) {
            const targetVol = (SFX_BASE['yog-sothoth-domain-theme'] || 1.0) * state.vol.sfx * state.vol.global;
            _yogThemeGain.gain.setTargetAtTime(targetVol, actx.currentTime, 0.1);
        }
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

    // The duck still applies to everything else (bgm, ambient, sfx...) so
    // the domain still reads as muffling the outside world - the theme
    // itself is the one exception, routed through _bypassGain instead.
    function enterTimeDomain() { enterDuck('yogsothoth'); startYogDomainTheme(); }
    function exitTimeDomain()  { exitDuck('yogsothoth'); stopYogDomainTheme(); }
    function enterLowHpDuck()  { enterDuck('lowhp'); }
    function exitLowHpDuck()   { exitDuck('lowhp'); }

    // Per-clip base gain. Balance lives in the audio files themselves (gain
    // baked in with ffmpeg's volume filter) so the in-game sliders read as
    // "true 100%" at their default — this map is a 1.0 passthrough, kept as
    // a hook for future per-clip tweaks rather than a real attenuation table.
    // Values 0..1, multiplied by sfx * global.
    const SFX_BASE = {
        'tut-type-a': 0.45,
        'tut-type-b': 0.45,
        'tut-type-c': 0.45,
        'tut-line': 0.6,
        'tut-speech-open': 0.6,
        'tut-reveal': 0.8,
        'tut-toast': 0.7,
        'tut-circle-charge': 0.9,
        'tut-warn': 0.7,
        'tut-bullet-volley': 0.8,
        'tut-beam': 1,
        'tut-burst': 1,
        'tut-sweep': 1,
        'tut-domain-charge': 0.9,
        'tut-domain-blast': 1,
        'tut-pass': 0.9,
        'tut-fail': 0.9,
        'tut-complete': 0.9,
        'tut-license-open': 0.9,
        'tut-license-print': 0.7,
        'tut-stamp': 1,
        'tut-seal': 0.9,

        'ammit-rift-crack': 1.0,
        'ammit-rift-open': 1.0,
        'ammit-emerge': 1.0,
        'ammit-rift-close': 1.0,
        'ammit-idle': 0.16,
        'ammit-jaws-lock': 1.0,
        'ammit-jaws-close': 1.0,
        'ammit-jaws-bite': 1.0,
        'ammit-scarab-hatch': 1.0,
        'ammit-scarab-pop': 1.0,
        'ammit-sandpit': 1.0,
        'ammit-weigh-open': 1.0,
        'ammit-weigh-tilt': 1.0,
        'ammit-weigh-slam': 1.0,
        'ammit-weigh-balanced': 1.0,
        'ammit-claw-wind': 1.0,
        'ammit-claw-strike': 1.0,
        'ammit-stomp-wind': 1.0,
        'ammit-stomp-slam': 1.0,
        'ammit-feather-fall': 1.0,
        'ammit-feather-return': 1.0,
        'ammit-wrap-tear': 1.0,
        'ammit-heart-devour': 1.0,
        'ammit-enrage': 1.0,
        'ammit-death-roar': 1.0,

        autoshot: 1.0, charging: 1.0, 'skill-d-charge': 1.0, laser: 1.0,
        'enemy-hit': 0.25, 'enemy-death': 1.0, 'shield-hit': 1.0, 'life-lost': 1.0,
        // Same clip as enemy-death but boosted, for the Phantom Portal's
        // own collapse - reads as a real detonation, not just another kill.
        'veilshroud-portal-collapse': 1.6,
        click: 1.0, hover: 1.0, overlay: 1.0,
        // Kanade's boss-wave cutscene. The frozen ambience carries the whole
        // sequence and sits above the one-shots rather than under them; the
        // collapse layer is texture on top of it, kept well back so the
        // cracking colours the room without competing with the bed or the
        // beats landing on it. The bed's level lives in the file rather than
        // here: it is limited to -4.3 dBFS peak at -12.7 dB mean, so 1.55x
        // still lands under full scale. Raising this number instead would
        // only clip it.
        'kanade-time-freeze': 1.2, 'kanade-frozen-ambience': 1.55,
        'kanade-collapse-loop': 0.5, 'kanade-fermata': 0.8,
        'menu-space': 0.5,
        'kanade-gate-open': 1.0, 'kanade-emerge': 0.9, 'kanade-think': 0.8,
        'kanade-summon': 1.1, 'goliath-descend': 1.0,
        'stack-overflow-cast': 1.2, 'timeline-distortion-banner': 1.0,
        'kanade-depart': 0.9, 'kanade-time-resume': 1.0,
        // Engine loop kept quieter than the ambient space bed it plays under
        // (see engine.mp3 above) - a rocket thruster hum shouldn't compete
        // with it for attention. Ambient bumped +10% on top of its own 1.0.
        engine: 0.8, ambient: 1.1,
        'skill-ready': 1.0, 'skill-unlocked': 1.0,
        'sigil-open': 1.0, 'sigil-confirm': 1.0,
        'sentinel-spawn': 1.0, 'sentinel-explode': 1.0,
        'shift-hold': 1.0, 'shift-teleport': 1.0,
        coronation: 1.0, blackhole: 1.0,
        'spirit-autofire': 1.0, 'tesla-coil-form': 1.0, 'tesla-bolt-launch': 1.0,
        'skill-g-activate': 1.0, 'skill-g-loop': 1.0, 'skill-s-summon': 1.0,
        'skill-a-activate': 1.0, 'skill-a-orb-hit': 1.0, 'skill-a-orb-lock': 1.0,
        'skill-f-fire': 1.0, 'skill-f-charge': 1.0,
        'photokrystos-dnt-laser': 1.0, 'photokrystos-boomerang-throw': 1.0, 'photokrystos-boomerang-hit': 1.0,
        'spinner-bounce': 0.65,
        'spirit-finale-laser': 0.7,
        'great-sage-hit': 0.7,
        'spirit-arc-slash': 1.0,
        'thaelis-wave-charge': 1.0, 'thaelis-wave-sweep': 1.0, 'thaelis-ulysses-slash': 1.0,
        'thaelis-parry': 1.0, 'thaelis-wave-hit': 0.9, 'thaelis-fall': 1.0, 'thaelis-slain': 1.0, 'thaelis-spawn': 0.9, 'thaelis-wave-fly': 0.45,
        'thaelis-idle': 0.14, 'thaelis-idle-gear': 0.12, 'thaelis-idle-weapon': 0.1,
        gameover: 1.0, 'new-wave': 1.0,
        'maou-haki': 1.0, 'low-hp': 1.0, 'yog-parry': 1.0,
        'charged-shot': 1.0, 'wave-clear': 1.0,
        // Boosted above the usual 1.0 baseline per an explicit "make both
        // louder" request, on top of the source files already being
        // peak-normalized during import. Launch bumped again after the sfx
        // itself was replaced with a correct/louder recording.
        'blood-arrow-launch': 1.5, 'blood-arrow-impact': 1.3,
        'dimensional-rift': 1.0, 'dimension-break': 1.0,
        'egregor-nullslash-windup': 1.0, 'egregor-nullslash-slash': 1.0, 'egregor-nullslash-hit': 1.0,
        'egregor-crawl': 1.0, 'egregor-death-roar': 1.0, 'egregor-tempest-strike': 1.0,
        'chain-lightning': 0.7,
        'photokrystos-summon-converge': 1.0, 'photokrystos-summon-flash': 1.0, 'photokrystos-summon-holy': 1.0,
        'photokrystos-btm-firing': 1.0, 'photokrystos-btm-shockwave': 1.0, 'photokrystos-btm-kill': 1.0,
        'photokrystos-btm-warming': 1.0, 'photokrystos-idle': 1.0, 'photokrystos-vine-bind': 1.0,
        'laser-fire': 1.0, 'goliath-verdict-launch': 1.0,
        'dargruel-chain-launch': 1.0, 'dargruel-chain-root': 1.0,
        'metal-hit': 1.0, 'phantom-strike': 1.0, 'goliath-transform': 1.0,
        // Phantom cues were exported quiet, so most sit above 1.0 to land near phantom-strike
        'phantom-enter': 1.45, 'phantom-hold': 4.0, 'phantom-deflect': 2.0, 'phantom-exit': 1.2, 'phantom-lock': 3.2, 'phantom-charge': 0.7,
        'phantom-enter-b': 1.45, 'phantom-hold-b': 4.0, 'phantom-deflect-b': 2.0, 'phantom-exit-b': 1.2, 'phantom-lock-b': 3.2, 'phantom-charge-b': 0.7,
        'goliath-idle': 1.0, 'goliath-fracture-step': 1.0, 'goliath-verdict-impact': 1.0, 'goliath-verdict-charge': 1.0,
        'leviathan-perseverance': 1.0, 'goliath-death': 1.0, 'goliath-spawn': 1.0, 'goliath-kill-stamp': 1.0, 'goliath-kill-ambience': 1.0,
        'goliath-corrupted-meteor': 1.0, 'goliath-unbroken-wave': 1.0,
        'goliath-death-roar': 1.0, 'leviathan-death-roar': 1.0, 'leviathan-idle': 1.0,
        'raphael-idle': 1.0, 'raphael-wisdom-charge': 1.0, 'raphael-wisdom-launch': 1.15, 'raphael-wisdom-impact': 1.1,
        'uriel-idle': 1.0, 'uriel-sword-launch': 1.15, 'uriel-death-roar': 1.0,
        'uriel-sword-windup': 1.15, 'uriel-sword-impact': 1.15,
        'uriel-sword-hover': 0.6, // wind texture while the blade is actually in flight, not a lead cue
        'uriel-sword-launch-burst': 1.15, // layered under uriel-sword-launch for extra punch
        // camo-vanish's own clip already peaks at 0dBFS - any gain above 1.0
        // just hard-clips its loudest instant instead of getting louder, so
        // it stays at 1.0. camo-reappear peaks at barely a third of full
        // scale (measured via decodeAudioData), quietest of all 6 by far, so
        // it gets a much bigger push to actually read at a comparable volume.
        'uriel-camo-vanish': 1.0, 'uriel-camo-reappear': 2.4, 'uriel-barrier-spawn': 1.15,
        'yog-sothoth-domain-theme': 1.0,
        'gate-of-babylon': 1.0, 'enuma-elish-charge': 1.0, 'enuma-elish-release': 1.0,
        'cancer-whirlpool-spin': 1.0, 'cancer-whale-splash': 1.0, 'cancer-whale-bite': 1.0,
        // Dawn Herald. The charge cue repeats before every crow and its clip is
        // the loudest of the set, so it sits well under the crow it leads into.
        'dau-crow': 1.0, 'dau-wave': 0.8, 'dau-charge': 0.5,
        'dau-needle-hit': 0.6, 'dau-star-strike': 0.7, 'dau-reflect': 0.9,
    };

    // Positional sfx fall off with distance from the player ship. maxRangeFrac
    // is the fraction of the screen diagonal at which a sound is nearly
    // inaudible; minGain is the floor so distant events stay a faint cue
    // rather than disappearing entirely.
    const POS_MAX_RANGE_FRAC = 0.55;
    const POS_MIN_GAIN = 0.12;
    // Boss story beats: death roars, Goliath arriving, transforming, refusing
    // to die and breaking apart. A boss sits at the far end of the screen, so
    // falloff would leave these at the floor. They play at full level and are
    // never dropped at the voice cap. Each fires a few times per match.
    const BOSS_CUE_SFX = new Set([
        'ammit-death-roar', 'ammit-enrage', 'ammit-emerge', 'ammit-rift-open', 'ammit-rift-crack',
        'leviathan-death-roar', 'goliath-death-roar', 'egregor-death-roar', 'uriel-death-roar',
        'goliath-death', 'goliath-spawn', 'goliath-transform', 'goliath-unbroken-wave',
    ]);
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
        { id: 'pisces',                 title: 'Pisces (Menu Theme)',            src: 'assets/audio/bgm/pisces.mp3',                           menuOnly: true },
        { id: 'ascension',              title: 'Ascension of the Void Shrine',   src: 'assets/audio/bgm/ascension-of-the-void-shrine.mp3' },
        { id: 'dorian-autumn',          title: 'A Dorian Autumn Fair',           src: 'assets/audio/bgm/a-dorian-autumn-fair.mp3' },
        { id: 'love-never-ends',        title: 'A Love That Never Ends',         src: 'assets/audio/bgm/a-love-that-never-ends.mp3' },
        { id: 'anata',                  title: 'Anata',                          src: 'assets/audio/bgm/anata.mp3' },
        { id: 'echoes-silent-prayer',   title: 'Echoes of a Silent Prayer',      src: 'assets/audio/bgm/echoes-of-a-silent-prayer.mp3' },
        { id: 'endless-rainfall',       title: 'Endless Rainfall',               src: 'assets/audio/bgm/endless-rainfall.mp3' },
        { id: 'requiem-persian-spring', title: 'Requiem for a Persian Spring',   src: 'assets/audio/bgm/requiem-for-a-persian-spring.mp3' },
        { id: 'requiem-falling-stars',  title: 'Requiem of Falling Stars',       src: 'assets/audio/bgm/requiem-of-falling-stars.mp3' },
        { id: 'sorrow-thousand-blades', title: 'Sorrow of a Thousand Blades',    src: 'assets/audio/bgm/sorrow-of-a-thousand-blades.mp3' },
        { id: 'last-cicada',            title: "The Last Cicada's Song",         src: 'assets/audio/bgm/the-last-cicadas-song.mp3' },
        { id: 'summer-fades',           title: 'Where Summer Fades to Silence',  src: 'assets/audio/bgm/where-summer-fades-to-silence.mp3' },
        { id: 'hold-my-hand',           title: 'Please Hold My Hand',            src: 'assets/audio/bgm/please-hold-my-hand.mp3' },
        { id: 'unfair-world',           title: 'Where the Unfair World Keeps Its Secrets', src: 'assets/audio/bgm/where-the-unfair-world-keeps-its-secrets.mp3' },
        { id: 'owari-waltz',            title: 'Owari no Waltz',                 src: 'assets/audio/bgm/owari-no-waltz.mp3' },
        { id: 'peach-blossoms-duel',    title: 'Duel Beneath the Peach Blossoms', src: 'assets/audio/bgm/duel-beneath-the-peach-blossoms.mp3' },
        { id: 'dance-with-me',          title: 'Will You Dance With Me?',        src: 'assets/audio/bgm/will-you-dance-with-me.mp3' },
        { id: 'kyoushinron',            title: 'Kyoushinron',                   src: 'assets/audio/bgm/kyoushinron.mp3' },
        { id: 'bartholomew-fair',       title: 'Bartholomew Fair',              src: 'assets/audio/bgm/bartholomew-fair.mp3' },
        { id: 'resurrection',           title: 'Resurrection',                  src: 'assets/audio/bgm/resurrection.mp3' },
        { id: 'blue-sky',               title: 'Blue Sky',                      src: 'assets/audio/bgm/blue-sky.mp3' },
        { id: 'sousei-no-hi',           title: 'Sousei no Hi',                  src: 'assets/audio/bgm/sousei-no-hi.mp3' },
    ];

    const state = {
        vol: { bgm: 1.0, sfx: 1.0, global: 1.0 },
        muted: false,
        currentBgmId: null,
        bgmEl: null,
        ambientEl: null,     // ingame.mp3 space background (grouped under SFX)
        kanadeAmbienceEl: null, // looping bed under Kanade's frozen-time cutscene
        kanadeCollapseEl: null, // second bed layer: the world coming apart
        kanadeMusicEl: null,    // Fermata, the cutscene's score, played once over both beds
        menuSpaceEl: null,      // space ambience under the menu theme, on the sfx slider
        menuSpaceIdx: -1,
        menuSpaceHeld: false,   // paused by pauseBgm while a Music Archive track plays
        engineEl: null,      // engine loop
        laserEl: null,       // sustained laser loop
        chargingEl: null,    // charging hum loop (Space-hold overload laser, 3s)
        skillGLoopEl: null,  // Skill G Tesla Matrix ambient loop, held for the full 30s barrier
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
        leviathanIdleEl: null, // Leviathan flight ambience (wingbeat whoosh + scrap rattle), same native gapless loop
        ammitIdleEl: null,
        thaelisIdleEl: null,   // Thaelis idle bed, three native gapless loops layered together: ambience, armour and breath, rattling axe
        thaelisGearEl: null,
        thaelisWeaponEl: null,
        urielIdleEl: null,    // Uriel ambient presence (wind hum + wing flap + breath), same native gapless loop
        urielSwordHoverEl: null, // Holy Sword's wind-rush texture while any blade is in flight
        raphaelIdleEl: null,  // Raphael ambient presence (gear-hum + choral drone + platform-rise + breath), same native gapless loop
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
    function _makeTyPool(key, fallback) {
        const src = 'assets/audio/sfx/' + key + '.mp3';
        _makePool(key, 'assets/audio/sfx/' + fallback);
        if (!actx) return;
        _queueDecode(() => fetch(src).then(r => r.ok ? r.arrayBuffer() : null).then(ab => ab ? actx.decodeAudioData(ab) : null)).then(buf => {
            if (!buf) return;
            _decodedBuffers[src] = buf; _bufferCache[src] = Promise.resolve(buf); state.pool[key].src = src;
        }).catch(() => {});
    }

    function _makePool(key, src, size = 3, bypass = false) {
        state.pool[key] = { src, bypass };
        if (/^(click|hover|overlay|sigil-|new-wave|enemy-hit|enemy-death|autoshot|shield-hit|life-lost|skill-ready|dargruel-chain-launch|goliath-spawn)/.test(key)) _decodeBuffer(src);
    }

    function prepareEnemy(type) {
        const prefixes = { ammit: /^ammit/, thaelis: /^thaelis/, egregor: /^(egregor|dimension)/, veilshroud: /^(veilshroud|phantom)/, goliath: /^(goliath|phantom|egregor-null|leviathan-perseverance)/, dargruel: /^dargruel/, leviathan: /^leviathan/, uriel: /^uriel/, raphael: /^raphael/, marchosias: /^metal-hit/, kanade: /^(tut-|kanade|goliath-descend|stack-overflow|timeline-distortion)/ };
        const match = prefixes[type];
        if (!match) return;
        for (const key of Object.keys(state.pool)) if (match.test(key)) _decodeBuffer(state.pool[key].src);
        const refs = { ammit: ['ammitIdleEl'], thaelis: ['thaelisIdleEl', 'thaelisGearEl', 'thaelisWeaponEl'], egregor: ['crawlEl', 'nullSlashWindupEl'], goliath: ['goliathIdleEl', 'goliathVerdictChargeEl'], leviathan: ['leviathanIdleEl'], uriel: ['urielIdleEl', 'urielSwordHoverEl'], raphael: ['raphaelIdleEl'], kanade: ['kanadeAmbienceEl', 'kanadeCollapseEl', 'kanadeMusicEl'] };
        for (const ref of refs[type] || []) if (state[ref]) state[ref].prepare();
    }
    function prepareGameplay() {
        const enemy = /^(tut-|ammit|egregor|dimension|goliath|dargruel|leviathan|uriel|raphael|phantom|veilshroud|kanade|stack-overflow|timeline-distortion|dau-|ty-)/;
        for (const key of Object.keys(state.pool)) if (!enemy.test(key)) _decodeBuffer(state.pool[key].src);
    }
    function prepareSigil(id) {
        if (id === 'dau' || id === 'ty') for (const key of Object.keys(state.pool)) if (key.startsWith(id + '-')) _decodeBuffer(state.pool[key].src);
    }

    // Kanade's boss-wave cutscene stops time, and nothing is allowed to make a
    // sound while it does. pauseAll() alone only silences what was already
    // playing; the gate below also blocks anything fired afterwards from a
    // handler that runs outside the frozen game loop. `resume` false lifts the
    // gate without restarting anything, for when the player has the pause
    // overlay up and their own unpause will do it.
    let _timeFrozen = false;
    function setTimeFrozen(frozen, resume) {
        if (!!frozen === _timeFrozen) return;
        _timeFrozen = !!frozen;
        if (_timeFrozen) pauseAll();
        else if (resume !== false) resumeAll();
    }

    // Kanade's cutscene is the one thing that must still be heard while the
    // freeze holds the rest of the mix silent, so it gets its own entry point
    // that does not consult the gate. Everything else keeps going through
    // playSfx and stays blocked.
    function playCutsceneSfx(key) {
        const p = state.pool[key];
        if (!p) return;
        const g = sfxGain(key);
        if (g <= 0) return;
        if (key.startsWith('tut-')) return _playAmmitCue(p.src, g, true, false, true);
        if (key.startsWith('ammit-')) return _playAmmitCue(p.src, g, p.bypass, true);
        return _playVoice(p.src, g, p.bypass);
    }

    // The cutscene's bed is two layers playing together: the frozen ambience
    // carries the stillness, the collapse layer carries the world failing
    // under it. They are mixed separately so the collapse can swell in on the
    // beat the Distortion lands while the ambience holds steady.
    const KANADE_AMBIENCE_SRC = 'assets/audio/sfx/kanade-frozen-ambience.mp3';
    const KANADE_COLLAPSE_SRC = 'assets/audio/sfx/kanade-collapse-loop.mp3';
    // Fermata is cut to the 12.4s sequence: the piano opening runs under the
    // gate and her entrance, it falls silent for the summon and the cast, and
    // its swell lands just after the Distortion, then fades with the gate.
    const KANADE_MUSIC_SRC = 'assets/audio/sfx/kanade-fermata.mp3';

    function _startBedLayer(refKey, src, key, loop = true) {
        const el = state[refKey];
        if (!el || !el.paused) return;
        // Both beds open on a swell, so every showing should hear them from
        // the top. setSrc is what clears the saved loop position, and the
        // buffer is already cached by then, so this costs nothing.
        el.setSrc(src, loop);
        el.volume = Math.min(1, sfxGain(key));
        try { el.play().catch(() => {}); } catch (_) {}
    }

    function startCutsceneAmbience() {
        if (state.muted) return;
        _startBedLayer('kanadeAmbienceEl', KANADE_AMBIENCE_SRC, 'kanade-frozen-ambience');
        _startBedLayer('kanadeCollapseEl', KANADE_COLLAPSE_SRC, 'kanade-collapse-loop');
        _startBedLayer('kanadeMusicEl', KANADE_MUSIC_SRC, 'kanade-fermata', false);
    }

    // Scales each layer against its own configured level, so the cutscene can
    // shape the mix without having to know what those levels are.
    function setCutsceneBedGains(ambMul, collapseMul) {
        if (state.kanadeAmbienceEl) {
            state.kanadeAmbienceEl.volume =
                Math.min(1, sfxGain('kanade-frozen-ambience') * Math.max(0, ambMul));
        }
        if (state.kanadeCollapseEl) {
            state.kanadeCollapseEl.volume =
                Math.min(1, sfxGain('kanade-collapse-loop') * Math.max(0, collapseMul));
        }
    }

    // The start screen's space ambience: one of three takes of the same loop,
    // picked at random once per launch of the game and kept for every return
    // to the menu, so only one 30s take is ever decoded and held in memory.
    // It sits under the menu theme and follows the sfx slider, while the
    // theme follows the bgm slider.
    const MENU_SPACE_SRC = ['assets/audio/sfx/menu-space-1.mp3', 'assets/audio/sfx/menu-space-2.mp3', 'assets/audio/sfx/menu-space-3.mp3'];
    function startMenuSpace() {
        const el = state.menuSpaceEl;
        if (!el || !el.paused) return;
        if (state.menuSpaceIdx < 0) state.menuSpaceIdx = Math.floor(Math.random() * MENU_SPACE_SRC.length);
        el.setSrc(MENU_SPACE_SRC[state.menuSpaceIdx]);
        el.volume = Math.min(1, sfxGain('menu-space'));
        try { el.play().catch(() => {}); } catch (_) {}
    }
    // The hyperjump shapes it against its own configured level.
    function setMenuSpaceGain(mul) {
        if (state.menuSpaceEl) state.menuSpaceEl.volume = Math.min(1, sfxGain('menu-space') * Math.max(0, mul));
    }
    function stopMenuSpace() { state.menuSpaceHeld = false; stopLoop('menuSpaceEl'); }

    function stopCutsceneAmbience() {
        stopLoop('kanadeAmbienceEl');
        stopLoop('kanadeCollapseEl');
        stopLoop('kanadeMusicEl');
    }

    // The same sfx started again within this window would only stack on the
    // first one, louder and phasing, so it is skipped.
    const SFX_REPEAT_MS = 35;
    const _sfxLastAt = {};
    function _sfxTooSoon(key) {
        const t = performance.now();
        if (t - (_sfxLastAt[key] || -Infinity) < SFX_REPEAT_MS) return true;
        _sfxLastAt[key] = t;
        return false;
    }

    const _ammitCues = new Array(24);
    for (let i = 0; i < _ammitCues.length; i++) _ammitCues[i] = { active: false, paused: false, node: null, gain: null, buffer: null, offset: 0, started: 0, counted: false, serial: 0 };
    let _ammitCueSerial = 0;
    function _ammitStopCue(slot) {
        slot.active = false; slot.paused = false;
        const node = slot.node; slot.node = null;
        if (slot.counted) { _liveVoices = Math.max(0, _liveVoices - 1); slot.counted = false; }
        if (node) { node.onended = null; try { node.stop(); node.disconnect(); } catch (_) {} }
        slot.buffer = null;
    }
    function _ammitStartCue(slot) {
        if (!slot.active || slot.paused || !slot.buffer || !actx) return;
        if (slot.capped && _liveVoices >= MAX_SFX_VOICES) { _ammitStopCue(slot); return; }
        if (!slot.gain) slot.gain = actx.createGain();
        slot.gain.disconnect(); slot.gain.connect(slot.bypass ? _bypassGain : _duckGain); slot.gain.gain.value = slot.volume;
        const node = actx.createBufferSource(); node.buffer = slot.buffer; node.connect(slot.gain);
        slot.node = node; slot.started = actx.currentTime;
        if (slot.capped) { _liveVoices++; slot.counted = true; }
        node.onended = function () { if (slot.node === node && !slot.paused) _ammitStopCue(slot); };
        node.start(0, Math.min(slot.offset, Math.max(0, slot.buffer.duration - .001)));
    }
    function _playAmmitCue(src, volume, bypass, capped, tutorial = false) {
        if (!actx) return;
        let slot = null;
        for (let i = 0; i < _ammitCues.length; i++) if (!_ammitCues[i].active) { slot = _ammitCues[i]; break; }
        if (!slot && bypass) { slot = _ammitCues[0]; _ammitStopCue(slot); }
        if (!slot) return;
        slot.active = true; slot.paused = false; slot.offset = 0; slot.volume = volume; slot.bypass = bypass; slot.capped = capped; slot.tutorial = tutorial;
        const serial = slot.serial = ++_ammitCueSerial;
        const ready = _decodedBuffers[src];
        if (ready) { slot.buffer = ready; _ammitStartCue(slot); }
        else _decodeBuffer(src).then(function (buffer) { if (slot.active && slot.serial === serial) { slot.buffer = buffer; _ammitStartCue(slot); } });
        return { cancel() { if (slot.serial === serial) _ammitStopCue(slot); } };
    }
    function _pauseAmmitCues() {
        for (let i = 0; i < _ammitCues.length; i++) {
            const slot = _ammitCues[i]; if (!slot.active || slot.paused) continue;
            slot.paused = true;
            if (slot.node) { slot.offset += Math.max(0, actx.currentTime - slot.started); const node = slot.node; slot.node = null; try { node.stop(); } catch (_) {} }
            if (slot.counted) { _liveVoices = Math.max(0, _liveVoices - 1); slot.counted = false; }
        }
    }
    function _resumeAmmitCues() {
        for (let i = 0; i < _ammitCues.length; i++) { const slot = _ammitCues[i]; if (slot.active && slot.paused) { slot.paused = false; _ammitStartCue(slot); } }
    }
    function stopAmmitCues() { for (let i = 0; i < _ammitCues.length; i++) _ammitStopCue(_ammitCues[i]); }

    function playSfx(key) {
        if (_timeFrozen) return;
        const p = state.pool[key];
        if (!p) return;
        if (_sfxTooSoon(key)) return;
        const g = sfxGain(key);
        if (g <= 0) return;
        if (key.startsWith('tut-')) return _playAmmitCue(p.src, g, true, false, true);
        if (key.startsWith('ammit-')) return _playAmmitCue(p.src, g, p.bypass, true);
        return _playVoice(p.src, g, p.bypass);
    }

    // Positional variant: scales the base gain by distance from the player
    // ship (x, y in world/canvas coordinates), so explosions and events near
    // the player read louder than ones happening far up the screen.
    function playTutorialSfx(key) {
        const p = state.pool[key];
        if (!p || _timeFrozen || _sfxTooSoon(key)) return;
        const gain = sfxGain(key);
        if (gain > 0) return _playAmmitCue(p.src, gain, true, false, true);
    }
    function stopTutorialSfx() {
        for (let i = 0; i < _ammitCues.length; i++) if (_ammitCues[i].tutorial) _ammitStopCue(_ammitCues[i]);
    }

    function playSfxAt(key, x, y) {
        if (_timeFrozen) return;
        const p = state.pool[key];
        if (!p) return;
        const cue = BOSS_CUE_SFX.has(key);
        const g = sfxGain(key) * (cue ? 1 : _distanceGain(x, y));
        if (g <= 0.005) return;
        if (_sfxTooSoon(key)) return;
        if (key.startsWith('ammit-')) return _playAmmitCue(p.src, g, p.bypass, !cue);
        return _playVoice(p.src, g, p.bypass, !cue);
    }

    // Loop controls for sustained sfx (charging, laser, crawl, idle, ...). Idempotent.
    function startLoop(refKey, key) {
        if (_timeFrozen) return;
        const el = state[refKey];
        if (!el) return;
        // el is a real HTMLAudioElement here (unlike the AudioBufferSourceNode-
        // backed idle loops, whose gain node has no such limit) - its .volume
        // setter throws for anything outside [0,1], and a boosted gain like
        // ambient's 1.1 would otherwise crash every call site that starts it.
        el.volume = Math.min(1, sfxGain(key));
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
    // The Guide's Music Archive holds the menu theme and the space ambience
    // under it while a track plays, so the track is heard on its own.
    function pauseBgm() {
        if (state.bgmEl) { try { state.bgmEl.pause(); } catch (_) {} }
        if (state.menuSpaceEl && !state.menuSpaceEl.paused) {
            state.menuSpaceHeld = true;
            try { state.menuSpaceEl.pause(); } catch (_) {}
        }
    }
    function resumeBgm() {
        // while the whole mix is paused (pause screen), BGM stays down;
        // resumeAll() brings it back with everything else
        if (state.muted || _pauseSnapshot) return;
        if (state.bgmEl && state.bgmEl.paused) { try { state.bgmEl.play().catch(() => {}); } catch (_) {} }
        if (state.menuSpaceHeld) {
            state.menuSpaceHeld = false;
            if (state.menuSpaceEl) try { state.menuSpaceEl.play().catch(() => {}); } catch (_) {}
        }
    }

    // Full-mix pause: freezes bgm + every sustained loop and records what was
    // running so resumeAll only unpauses those. Used when the SYSTEM TERMINATED
    // overlay shows so the game goes silent while paused.
    let _pauseSnapshot = null;
    function pauseAll() {
        _pauseAmmitCues();
        _pauseSnapshot = {
            bgm:      !!(state.bgmEl      && !state.bgmEl.paused),
            ambient:  !!(state.ambientEl  && !state.ambientEl.paused),
            kanadeAmbience: !!(state.kanadeAmbienceEl && !state.kanadeAmbienceEl.paused),
            kanadeCollapse: !!(state.kanadeCollapseEl && !state.kanadeCollapseEl.paused),
            kanadeMusic: !!(state.kanadeMusicEl && !state.kanadeMusicEl.paused),
            menuSpace: !!(state.menuSpaceEl && !state.menuSpaceEl.paused),
            engine:   !!(state.engineEl   && !state.engineEl.paused),
            laser:    !!(state.laserEl    && !state.laserEl.paused),
            charging: !!(state.chargingEl && !state.chargingEl.paused),
            skillGLoop: !!(state.skillGLoopEl && !state.skillGLoopEl.paused),
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
            cancerWhirlpool: !!(state.cancerWhirlpoolEl && !state.cancerWhirlpoolEl.paused),
            leviathanIdle: !!(state.leviathanIdleEl && !state.leviathanIdleEl.paused),
            ammitIdle: !!(state.ammitIdleEl && !state.ammitIdleEl.paused),
            thaelisIdle: !!(state.thaelisIdleEl && !state.thaelisIdleEl.paused),
            thaelisGear: !!(state.thaelisGearEl && !state.thaelisGearEl.paused),
            thaelisWeapon: !!(state.thaelisWeaponEl && !state.thaelisWeaponEl.paused),
            urielIdle: !!(state.urielIdleEl && !state.urielIdleEl.paused),
            urielSwordHover: !!(state.urielSwordHoverEl && !state.urielSwordHoverEl.paused),
            raphaelIdle: !!(state.raphaelIdleEl && !state.raphaelIdleEl.paused),
        };
        [state.bgmEl, state.ambientEl, state.kanadeAmbienceEl, state.kanadeCollapseEl, state.kanadeMusicEl, state.menuSpaceEl, state.engineEl, state.laserEl, state.chargingEl, state.skillGLoopEl, state.skillDChargeEl, state.skillFChargeEl, state.skillFFireEl, state.blackholeEl, state.maouHakiEl, state.lowHpEl, state.nullSlashWindupEl, state.crawlEl, state.photokrystosIdleEl, state.goliathIdleEl, state.goliathVerdictChargeEl, state.cancerWhirlpoolEl, state.leviathanIdleEl, state.ammitIdleEl, state.thaelisIdleEl, state.thaelisGearEl, state.thaelisWeaponEl, state.urielIdleEl, state.urielSwordHoverEl, state.raphaelIdleEl]
            .forEach(el => { if (el) { try { el.pause(); } catch (_) {} } });
    }
    function resumeAll() {
        if (!_pauseSnapshot || state.muted) { _pauseSnapshot = null; return; }
        _resumeAmmitCues();
        const s = _pauseSnapshot;
        _pauseSnapshot = null;
        if (s.bgm      && state.bgmEl)      try { state.bgmEl.play().catch(() => {}); } catch (_) {}
        if (s.ambient  && state.ambientEl)  try { state.ambientEl.play().catch(() => {}); } catch (_) {}
        if (s.kanadeAmbience && state.kanadeAmbienceEl) try { state.kanadeAmbienceEl.play().catch(() => {}); } catch (_) {}
        if (s.kanadeCollapse && state.kanadeCollapseEl) try { state.kanadeCollapseEl.play().catch(() => {}); } catch (_) {}
        if (s.kanadeMusic && state.kanadeMusicEl) try { state.kanadeMusicEl.play().catch(() => {}); } catch (_) {}
        if (s.menuSpace && state.menuSpaceEl) try { state.menuSpaceEl.play().catch(() => {}); } catch (_) {}
        if (s.engine   && state.engineEl)   try { state.engineEl.play().catch(() => {}); } catch (_) {}
        if (s.laser    && state.laserEl)    try { state.laserEl.play().catch(() => {}); } catch (_) {}
        if (s.charging && state.chargingEl) try { state.chargingEl.play().catch(() => {}); } catch (_) {}
        if (s.skillGLoop && state.skillGLoopEl) try { state.skillGLoopEl.play().catch(() => {}); } catch (_) {}
        if (s.skillDCharge && state.skillDChargeEl) try { state.skillDChargeEl.play().catch(() => {}); } catch (_) {}
        if (s.skillFCharge && state.skillFChargeEl) try { state.skillFChargeEl.play().catch(() => {}); } catch (_) {}
        if (s.skillFFire && state.skillFFireEl) try { state.skillFFireEl.play().catch(() => {}); } catch (_) {}
        if (s.blackhole && state.blackholeEl) try { state.blackholeEl.play().catch(() => {}); } catch (_) {}
        if (s.maouHaki && state.maouHakiEl) try { state.maouHakiEl.play().catch(() => {}); } catch (_) {}
        if (s.lowHp && state.lowHpEl) try { state.lowHpEl.play().catch(() => {}); } catch (_) {}
        if (s.nullSlashWindup && state.nullSlashWindupEl) try { state.nullSlashWindupEl.play().catch(() => {}); } catch (_) {}
        if (s.crawl && state.crawlEl) try { state.crawlEl.play().catch(() => {}); } catch (_) {}
        if (s.photokrystosIdle && state.photokrystosIdleEl) try { state.photokrystosIdleEl.play().catch(() => {}); } catch (_) {}
        if (s.cancerWhirlpool && state.cancerWhirlpoolEl) try { state.cancerWhirlpoolEl.play().catch(() => {}); } catch (_) {}
        if (s.leviathanIdle && state.leviathanIdleEl) try { state.leviathanIdleEl.play().catch(() => {}); } catch (_) {}
        if (s.ammitIdle && state.ammitIdleEl) try { state.ammitIdleEl.play().catch(() => {}); } catch (_) {}
        if (s.thaelisIdle && state.thaelisIdleEl) try { state.thaelisIdleEl.play().catch(() => {}); } catch (_) {}
        if (s.thaelisGear && state.thaelisGearEl) try { state.thaelisGearEl.play().catch(() => {}); } catch (_) {}
        if (s.thaelisWeapon && state.thaelisWeaponEl) try { state.thaelisWeaponEl.play().catch(() => {}); } catch (_) {}
        if (s.urielIdle && state.urielIdleEl) try { state.urielIdleEl.play().catch(() => {}); } catch (_) {}
        if (s.urielSwordHover && state.urielSwordHoverEl) try { state.urielSwordHoverEl.play().catch(() => {}); } catch (_) {}
        if (s.raphaelIdle && state.raphaelIdleEl) try { state.raphaelIdleEl.play().catch(() => {}); } catch (_) {}
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
                if (state.currentBgmId !== track.id) return;
                // a one-track selection picks the same song again, which
                // _switchBgm would skip as "already loaded", so clear the id to replay it
                const next = _pickInGameBgm();
                if (next.id === track.id) state.currentBgmId = null;
                _switchBgm(next);
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
            if (!t.menuOnly && t.src !== keepSrc) {
                delete _bufferCache[t.src];
                delete _decodedBuffers[t.src];
            }
        });
    }

    // Apply current volumes to all live audio elements. These are all real
    // HTMLAudioElements (unlike the AudioBufferSourceNode-backed idle loops),
    // so their .volume setter throws for anything outside [0,1] - a boosted
    // gain like ambient's 1.1 would otherwise crash this on every slider move.
    function refreshVolumes() {
        if (state.bgmEl)     state.bgmEl.volume     = Math.min(1, bgmGain());
        if (state.ambientEl) state.ambientEl.volume = Math.min(1, sfxGain('ambient'));
        if (state.kanadeAmbienceEl) state.kanadeAmbienceEl.volume = Math.min(1, sfxGain('kanade-frozen-ambience'));
        if (state.kanadeCollapseEl) state.kanadeCollapseEl.volume = Math.min(1, sfxGain('kanade-collapse-loop'));
        if (state.kanadeMusicEl) state.kanadeMusicEl.volume = Math.min(1, sfxGain('kanade-fermata'));
        if (state.menuSpaceEl) state.menuSpaceEl.volume = Math.min(1, sfxGain('menu-space'));
        if (state.engineEl)  state.engineEl.volume  = Math.min(1, sfxGain('engine'));
        if (state.laserEl)   state.laserEl.volume   = Math.min(1, sfxGain('laser'));
        if (state.chargingEl) state.chargingEl.volume = Math.min(1, sfxGain('charging'));
        if (state.skillGLoopEl) state.skillGLoopEl.volume = Math.min(1, sfxGain('skill-g-loop'));
        if (state.skillDChargeEl) state.skillDChargeEl.volume = Math.min(1, sfxGain('skill-d-charge'));
        if (state.skillFChargeEl) state.skillFChargeEl.volume = Math.min(1, sfxGain('skill-f-charge'));
        if (state.skillFFireEl) state.skillFFireEl.volume = Math.min(1, sfxGain('skill-f-fire'));
        if (state.blackholeEl) state.blackholeEl.volume = Math.min(1, sfxGain('blackhole'));
        if (state.maouHakiEl) state.maouHakiEl.volume = Math.min(1, sfxGain('maou-haki'));
        if (state.lowHpEl) state.lowHpEl.volume = Math.min(1, sfxGain('low-hp'));
        if (state.nullSlashWindupEl) state.nullSlashWindupEl.volume = Math.min(1, sfxGain('egregor-nullslash-windup'));
        if (state.crawlEl) state.crawlEl.volume = Math.min(1, sfxGain('egregor-crawl'));
        if (state.photokrystosIdleEl) state.photokrystosIdleEl.volume = Math.min(1, sfxGain('photokrystos-idle'));
        _refreshYogThemeVolume();
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

    function startSkillGLoop(){ startLoop('skillGLoopEl', 'skill-g-loop'); }
    function stopSkillGLoop() { stopLoop('skillGLoopEl'); }
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
    // stubs since main.js/skills/*.js/entities.js still poll them every frame.
    function startEgregorCrawl() { startLoop('crawlEl', 'egregor-crawl'); }
    function stopEgregorCrawl()  { stopLoop('crawlEl'); }
    function tickEgregorCrawl()  {}
    function startPhotokrystosIdle() { startLoop('photokrystosIdleEl', 'photokrystos-idle'); }
    function stopPhotokrystosIdle()  { stopLoop('photokrystosIdleEl'); }
    function tickPhotokrystosIdle()  {}
    function startGoliathIdle() { startLoop('goliathIdleEl', 'goliath-idle'); }
    function stopGoliathIdle()  { stopLoop('goliathIdleEl'); }
    function startLeviathanIdle() { startLoop('leviathanIdleEl', 'leviathan-idle'); }
    function stopLeviathanIdle()  { stopLoop('leviathanIdleEl'); }
    // The normalized breathing bed stays below combat impacts.
    function startAmmitIdle() { startLoop('ammitIdleEl', 'ammit-idle'); }
    function stopAmmitIdle() { stopLoop('ammitIdleEl'); }
    // Thaelis keeps three quiet loops of different lengths under it, so they drift against each other and never repeat as one
    function startThaelisIdle() { startLoop('thaelisIdleEl', 'thaelis-idle'); startLoop('thaelisGearEl', 'thaelis-idle-gear'); startLoop('thaelisWeaponEl', 'thaelis-idle-weapon'); }
    function stopThaelisIdle() { stopLoop('thaelisIdleEl'); stopLoop('thaelisGearEl'); stopLoop('thaelisWeaponEl'); }
    function startUrielIdle() { startLoop('urielIdleEl', 'uriel-idle'); }
    function stopUrielIdle()  { stopLoop('urielIdleEl'); }
    function startRaphaelIdle() { startLoop('raphaelIdleEl', 'raphael-idle'); }
    function stopRaphaelIdle()  { stopLoop('raphaelIdleEl'); }
    function startUrielSwordHover() { startLoop('urielSwordHoverEl', 'uriel-sword-hover'); }
    function stopUrielSwordHover()  { stopLoop('urielSwordHoverEl'); }
    // One shared loop for however many Riptide Surge whirlpools are active
    // at once (up to 10 can spawn together) rather than one per instance.
    function startCancerWhirlpool() { startLoop('cancerWhirlpoolEl', 'cancer-whirlpool-spin'); }
    function stopCancerWhirlpool()  { stopLoop('cancerWhirlpoolEl'); }

    // Low-HP heartbeat: loops while lives < 5, and ducks/muffles the rest
    // of the mix (heavier than Yog-Sothoth's own duck) for the "choáng"
    // dazed feel. startLoop/stopLoop already handle the element itself;
    // the duck is a separate call since it affects the whole mix, not just
    // this one element.
    function startLowHp() { startLoop('lowHpEl', 'low-hp'); enterDuck('lowhp'); }
    function stopLowHp()  { stopLoop('lowHpEl'); exitDuck('lowhp'); }

    // Prepare common cues and register the remaining sounds for their encounters.
    function _boot() {
        state.bgmEl = _makeBufferLoop(); // src set per-track in _switchBgm
        // Kick off the menu track's decode immediately on page load instead
        // of waiting for the "click anywhere to start" gesture — decoding a
        // multi-MB mp3 takes real time, and _decodeBuffer's cache means the
        // later playMenuBgm() call just picks up the already-resolved buffer.
        const _menuTrack = BGM_LIST.find(t => t.menuOnly);
        if (_menuTrack) _decodeBuffer(_menuTrack.src);
        _makePool('autoshot',     'assets/audio/sfx/autoshot.mp3',    4);
        _makePool('enemy-hit',    'assets/audio/sfx/enemy-hit.wav',   6);
        _makePool('enemy-death',  'assets/audio/sfx/enemy-death.mp3', 3);
        _makePool('veilshroud-portal-collapse', 'assets/audio/sfx/enemy-death.mp3', 2);
        _makePool('shield-hit',   'assets/audio/sfx/shield-hit.wav',  3);
        _makePool('life-lost',    'assets/audio/sfx/life-lost.mp3',   2);
        _makePool('click',        'assets/audio/sfx/click.mp3',       3);
        _makePool('hover',        'assets/audio/sfx/hover.mp3',       4);
        _makePool('overlay',      'assets/audio/sfx/overlay.wav',     2);
        _makePool('skill-ready',    'assets/audio/sfx/skill-ready.mp3',    3);
        _makePool('skill-unlocked', 'assets/audio/sfx/skill-unlocked.mp3', 2);
        _makePool('sigil-open',       'assets/audio/sfx/sigil-open.mp3',       2);
        _makePool('sigil-confirm',    'assets/audio/sfx/sigil-confirm.mp3',    2);
        _makePool('sentinel-spawn',   'assets/audio/sfx/sentinel-spawn.mp3',   3);
        _makePool('sentinel-explode', 'assets/audio/sfx/sentinel-explode.mp3', 3);
        _makePool('shift-hold',       'assets/audio/sfx/shift-hold.mp3',       2, true);
        _makePool('shift-teleport',   'assets/audio/sfx/shift-teleport.mp3',   2);
        _makePool('coronation',       'assets/audio/sfx/coronation.mp3',       2);
        _makePool('spirit-autofire',  'assets/audio/sfx/spirit-autofire.mp3',  5); // fires ~42ms cadence, needs deep pool
        _makePool('tesla-coil-form',  'assets/audio/sfx/tesla-coil-form.mp3',  2);
        // Deep pool: a single volley can fire 5 bolts ~0.1s apart.
        _makePool('tesla-bolt-launch', 'assets/audio/sfx/tesla-bolt-launch.mp3', 5);
        _makePool('skill-g-activate', 'assets/audio/sfx/skill-g-activate.mp3', 1);
        _makePool('skill-a-activate', 'assets/audio/sfx/skill-a-activate.mp3', 2);
        _makeTyPool('ty-flame-full', 'skill-s-summon.mp3');
        _makeTyPool('ty-devour', 'dimension-break.mp3');
        _makeTyPool('ty-array-open', 'skill-s-summon.mp3');
        _makeTyPool('ty-array-pull', 'cancer-whirlpool-spin.mp3');
        _makeTyPool('ty-array-burst', 'goliath-verdict-impact.mp3');
        _makeTyPool('ty-serpents-rise', 'skill-s-summon.mp3');
        _makeTyPool('ty-bite', 'enemy-hit.wav');
        _makeTyPool('ty-scale-break', 'shield-hit.wav');
        _makePool('skill-s-summon', 'assets/audio/sfx/skill-s-summon.mp3', 2);
        _makePool('skill-a-orb-hit',  'assets/audio/sfx/skill-a-orb-hit.mp3',  4);
        _makePool('skill-a-orb-lock', 'assets/audio/sfx/skill-a-orb-lock.mp3', 4);
        _makePool('photokrystos-dnt-laser',       'assets/audio/sfx/photokrystos-dnt-laser.mp3',       2);
        _makePool('photokrystos-boomerang-throw', 'assets/audio/sfx/photokrystos-boomerang-throw.mp3', 3);
        _makePool('photokrystos-boomerang-hit',   'assets/audio/sfx/photokrystos-boomerang-hit.mp3',   3);
        _makePool('spinner-bounce', 'assets/audio/sfx/spinner-bounce.mp3', 3);
        _makePool('spirit-finale-laser', 'assets/audio/sfx/spirit-finale-laser.mp3', 4);
        _makePool('great-sage-hit', 'assets/audio/sfx/great-sage-hit.mp3', 4);
        _makePool('spirit-arc-slash', 'assets/audio/sfx/spirit-arc-slash.mp3', 3);
        _makePool('thaelis-wave-charge', 'assets/audio/sfx/thaelis-wave-charge.mp3', 3);
        _makePool('thaelis-wave-sweep', 'assets/audio/sfx/thaelis-wave-sweep.mp3', 3);
        _makePool('thaelis-ulysses-slash', 'assets/audio/sfx/thaelis-ulysses-slash.mp3', 3);
        _makePool('thaelis-parry', 'assets/audio/sfx/thaelis-parry.mp3', 3);
        _makePool('thaelis-wave-hit', 'assets/audio/sfx/thaelis-wave-hit.mp3', 4);
        _makePool('thaelis-fall', 'assets/audio/sfx/thaelis-fall.mp3', 2);
        _makePool('thaelis-slain', 'assets/audio/sfx/thaelis-slain.mp3', 2);
        _makePool('thaelis-spawn', 'assets/audio/sfx/thaelis-spawn.mp3', 2);
        _makePool('thaelis-wave-fly', 'assets/audio/sfx/thaelis-wave-fly.mp3', 3);
        _makePool('gameover',  'assets/audio/sfx/gameover.mp3',  1);
        _makePool('new-wave',  'assets/audio/sfx/new-wave.mp3',  2);
        _makePool('yog-parry', 'assets/audio/sfx/yog-parry.mp3', 2);
        _makePool('charged-shot', 'assets/audio/sfx/charged-shot.mp3', 2);
        // Blood Arrow (Libra): launch fires once per volley, impact fires
        // once per landed arrow (up to 5 in quick succession), hence the
        // deeper pool on the impact side.
        _makePool('blood-arrow-launch', 'assets/audio/sfx/blood-arrow-launch.mp3', 2);
        _makePool('blood-arrow-impact', 'assets/audio/sfx/blood-arrow-impact.mp3', 5);
        _makePool('wave-clear',   'assets/audio/sfx/wave-clear.mp3',   1);
        _makePool('dimensional-rift', 'assets/audio/sfx/dimensional-rift.mp3', 2);
        _makePool('dimension-break',  'assets/audio/sfx/dimension-break.mp3',  2);
        _makePool('egregor-nullslash-slash', 'assets/audio/sfx/egregor-nullslash-slash.mp3', 2);
        _makePool('egregor-nullslash-hit',   'assets/audio/sfx/egregor-nullslash-hit.mp3',   2);
        _makePool('ammit-rift-crack', 'assets/audio/sfx/ammit-rift-crack.mp3', 2, true);
        _makePool('ammit-rift-open', 'assets/audio/sfx/ammit-rift-open.mp3', 2, true);
        _makePool('ammit-emerge', 'assets/audio/sfx/ammit-emerge.mp3', 2, true);
        _makePool('ammit-rift-close', 'assets/audio/sfx/ammit-rift-close.mp3', 2);
        _makePool('ammit-jaws-lock', 'assets/audio/sfx/ammit-jaws-lock.mp3', 2);
        _makePool('ammit-jaws-close', 'assets/audio/sfx/ammit-jaws-close.mp3', 2);
        _makePool('ammit-jaws-bite', 'assets/audio/sfx/ammit-jaws-bite.mp3', 2);
        _makePool('ammit-scarab-hatch', 'assets/audio/sfx/ammit-scarab-hatch.mp3', 2);
        _makePool('ammit-scarab-pop', 'assets/audio/sfx/ammit-scarab-pop.mp3', 2);
        _makePool('ammit-sandpit', 'assets/audio/sfx/ammit-sandpit.mp3', 2);
        _makePool('ammit-weigh-open', 'assets/audio/sfx/ammit-weigh-open.mp3', 2);
        _makePool('ammit-weigh-tilt', 'assets/audio/sfx/ammit-weigh-tilt.mp3', 2);
        _makePool('ammit-weigh-slam', 'assets/audio/sfx/ammit-weigh-slam.mp3', 2);
        _makePool('ammit-weigh-balanced', 'assets/audio/sfx/ammit-weigh-balanced.mp3', 2);
        _makePool('ammit-claw-wind', 'assets/audio/sfx/ammit-claw-wind.mp3', 2);
        _makePool('ammit-claw-strike', 'assets/audio/sfx/ammit-claw-strike.mp3', 2);
        _makePool('ammit-stomp-wind', 'assets/audio/sfx/ammit-stomp-wind.mp3', 2);
        _makePool('ammit-stomp-slam', 'assets/audio/sfx/ammit-stomp-slam.mp3', 2);
        _makePool('ammit-feather-fall', 'assets/audio/sfx/ammit-feather-fall.mp3', 2);
        _makePool('ammit-feather-return', 'assets/audio/sfx/ammit-feather-return.mp3', 2);
        _makePool('ammit-wrap-tear', 'assets/audio/sfx/ammit-wrap-tear.mp3', 2);
        _makePool('ammit-heart-devour', 'assets/audio/sfx/ammit-heart-devour.mp3', 2);
        _makePool('ammit-enrage', 'assets/audio/sfx/ammit-enrage.mp3', 2, true);
        _makePool('ammit-death-roar', 'assets/audio/sfx/ammit-death-roar.mp3', 2, true);
        _makePool('egregor-death-roar',      'assets/audio/sfx/egregor-death-roar.mp3',      1, true); // bypass duck so it stays clear
        _makePool('egregor-tempest-strike',  'assets/audio/sfx/egregor-tempest-strike.mp3',  2);
        // Tempest cues. The -b and -c keys play the same file so three portals firing in one frame are not dropped by the per-key repeat guard.
        const _tempestGain = { plant: 1.0, veins: 0.9, portal: 1.0, warn: 1.0, burst: 1.2, slam: 0.9, retreat: 0.9, blocked: 1.0 };
        for (const cue of Object.keys(_tempestGain)) {
            const file = cue === 'blocked' ? 'egregor-nullslash-hit' : 'egregor-tempest-' + cue;
            for (const suffix of ['', '-b', '-c']) {
                SFX_BASE['egregor-tempest-' + cue + suffix] = _tempestGain[cue];
                _makePool('egregor-tempest-' + cue + suffix, 'assets/audio/sfx/' + file + '.mp3', 2);
            }
        }
        _makePool('chain-lightning',         'assets/audio/sfx/chain-lightning.mp3',         4);
        _makePool('photokrystos-summon-converge', 'assets/audio/sfx/photokrystos-summon-converge.mp3', 1);
        _makePool('photokrystos-summon-flash',    'assets/audio/sfx/photokrystos-summon-flash.mp3',    1);
        _makePool('photokrystos-summon-holy',     'assets/audio/sfx/photokrystos-summon-holy.mp3',     1);
        _makePool('photokrystos-btm-firing',      'assets/audio/sfx/photokrystos-btm-firing.mp3',      1);
        _makePool('photokrystos-btm-shockwave',   'assets/audio/sfx/photokrystos-btm-shockwave.mp3',   1);
        _makePool('photokrystos-btm-kill',        'assets/audio/sfx/photokrystos-btm-kill.mp3',        6);
        _makePool('photokrystos-btm-warming',     'assets/audio/sfx/photokrystos-btm-warming.mp3',     1);
        _makePool('photokrystos-vine-bind',       'assets/audio/sfx/photokrystos-vine-bind.mp3',       3);
        _makePool('laser-fire',             'assets/audio/sfx/laser-fire.mp3',             3);
        _makePool('goliath-verdict-launch', 'assets/audio/sfx/goliath-verdict-launch.mp3', 1);
        _makePool('dargruel-chain-launch',  'assets/audio/sfx/dargruel-chain-launch.mp3',  2);
        _makePool('dargruel-chain-root',    'assets/audio/sfx/dargruel-chain-root.mp3',    2);
        _makePool('metal-hit',              'assets/audio/sfx/metal-hit.mp3',              6);
        _makePool('phantom-strike',         'assets/audio/sfx/phantom-strike.mp3',         2);
        // The -b keys play the same files so two Phantoms changing state in one frame are not dropped by the per-key repeat guard.
        for (const cue of ['enter', 'hold', 'deflect', 'exit', 'lock', 'charge']) {
            for (const suffix of ['', '-b']) _makePool('phantom-' + cue + suffix, 'assets/audio/sfx/phantom-' + cue + '.mp3', 2);
        }
        _makePool('goliath-transform',      'assets/audio/sfx/goliath-transform.mp3',      1, true); // bypass duck so it stays clear
        _makePool('goliath-fracture-step',  'assets/audio/sfx/goliath-fracture-step.mp3',  2);
        _makePool('goliath-verdict-impact', 'assets/audio/sfx/goliath-verdict-impact.mp3', 2);
        _makePool('leviathan-perseverance', 'assets/audio/sfx/leviathan-perseverance.mp3', 2);
        _makePool('goliath-death',          'assets/audio/sfx/goliath-death.mp3',          1, true); // bypass duck so it stays clear
        _makePool('goliath-kill-stamp',     'assets/audio/sfx/goliath-kill-stamp.mp3',     4);
        _makePool('goliath-kill-ambience',  'assets/audio/sfx/goliath-kill-ambience.mp3',  1, true); // bypass duck so it stays clear
        _makePool('goliath-spawn',          'assets/audio/sfx/goliath-spawn.mp3',          1, true); // bypass duck so it stays clear, matches goliath-transform
        _makePool('goliath-corrupted-meteor', 'assets/audio/sfx/goliath-corrupted-meteor.mp3', 2);
        _makePool('goliath-death-roar',      'assets/audio/sfx/goliath-death-roar.mp3',      1, true); // bypass duck so it stays clear
        _makePool('leviathan-death-roar',    'assets/audio/sfx/leviathan-death-roar.mp3',    1, true); // bypass duck so it stays clear
        _makePool('uriel-sword-launch',     'assets/audio/sfx/uriel-sword-launch.mp3',     2);
        _makePool('uriel-sword-launch-burst', 'assets/audio/sfx/uriel-sword-launch-burst.mp3', 2);
        _makePool('uriel-sword-windup',     'assets/audio/sfx/uriel-sword-windup.mp3',     2);
        _makePool('uriel-sword-impact',     'assets/audio/sfx/uriel-sword-impact.mp3',     2);
        _makePool('uriel-camo-vanish',      'assets/audio/sfx/uriel-camo-vanish.mp3',      1);
        _makePool('uriel-camo-reappear',    'assets/audio/sfx/uriel-camo-reappear.mp3',    1);
        _makePool('uriel-barrier-spawn',    'assets/audio/sfx/uriel-barrier-spawn.mp3',    1);
        _makePool('uriel-death-roar',       'assets/audio/sfx/uriel-death-roar.mp3',       1, true); // bypass duck so it stays clear
        _makePool('raphael-wisdom-charge',  'assets/audio/sfx/raphael-wisdom-charge.mp3',  2);
        _makePool('raphael-wisdom-launch',  'assets/audio/sfx/raphael-wisdom-launch.mp3',  2);
        _makePool('raphael-wisdom-impact',  'assets/audio/sfx/raphael-wisdom-impact.mp3',  3);
        _makePool('goliath-unbroken-wave',  'assets/audio/sfx/goliath-unbroken-wave.mp3',  1);
        _makePool('gate-of-babylon',        'assets/audio/sfx/gate-of-babylon.mp3',        2);
        _makePool('enuma-elish-charge',     'assets/audio/sfx/enuma-elish-charge.mp3',     1);
        _makePool('enuma-elish-release',    'assets/audio/sfx/enuma-elish-release.mp3',    1);
        // Kanade's cutscene. All bypass-routed past the duck/filter chain: the
        // sequence stops the rest of the mix outright, so there is nothing to
        // duck against and the clips should read exactly as authored.
        _makePool('kanade-time-freeze',   'assets/audio/sfx/kanade-time-freeze.mp3',   1, true);
        _makePool('tut-type-a', 'assets/audio/sfx/tut-type-a.mp3', 3, true);
        _makePool('tut-type-b', 'assets/audio/sfx/tut-type-b.mp3', 3, true);
        _makePool('tut-type-c', 'assets/audio/sfx/tut-type-c.mp3', 3, true);
        _makePool('tut-line', 'assets/audio/sfx/tut-line.mp3', 3, true);
        _makePool('tut-speech-open', 'assets/audio/sfx/tut-speech-open.mp3', 3, true);
        _makePool('tut-reveal', 'assets/audio/sfx/tut-reveal.mp3', 3, true);
        _makePool('tut-toast', 'assets/audio/sfx/tut-toast.mp3', 3, true);
        _makePool('tut-circle-charge', 'assets/audio/sfx/tut-circle-charge.mp3', 3, true);
        _makePool('tut-warn', 'assets/audio/sfx/tut-warn.mp3', 3, true);
        _makePool('tut-bullet-volley', 'assets/audio/sfx/tut-bullet-volley.mp3', 3, true);
        _makePool('tut-beam', 'assets/audio/sfx/tut-beam.mp3', 3, true);
        _makePool('tut-burst', 'assets/audio/sfx/tut-burst.mp3', 3, true);
        _makePool('tut-sweep', 'assets/audio/sfx/tut-sweep.mp3', 3, true);
        _makePool('tut-domain-charge', 'assets/audio/sfx/tut-domain-charge.mp3', 3, true);
        _makePool('tut-domain-blast', 'assets/audio/sfx/tut-domain-blast.mp3', 3, true);
        _makePool('tut-pass', 'assets/audio/sfx/tut-pass.mp3', 3, true);
        _makePool('tut-fail', 'assets/audio/sfx/tut-fail.mp3', 3, true);
        _makePool('tut-complete', 'assets/audio/sfx/tut-complete.mp3', 3, true);
        _makePool('tut-license-open', 'assets/audio/sfx/tut-license-open.mp3', 3, true);
        _makePool('tut-license-print', 'assets/audio/sfx/tut-license-print.mp3', 3, true);
        _makePool('tut-stamp', 'assets/audio/sfx/tut-stamp.mp3', 3, true);
        _makePool('tut-seal', 'assets/audio/sfx/tut-seal.mp3', 3, true);
        _makePool('kanade-gate-open',     'assets/audio/sfx/kanade-gate-open.mp3',     1, true);
        _makePool('kanade-emerge',        'assets/audio/sfx/kanade-emerge.mp3',        1, true);
        _makePool('kanade-think',         'assets/audio/sfx/kanade-think.mp3',         1, true);
        _makePool('kanade-summon',        'assets/audio/sfx/kanade-summon.mp3',        1, true);
        _makePool('goliath-descend',      'assets/audio/sfx/goliath-descend.mp3',      1, true);
        _makePool('stack-overflow-cast',  'assets/audio/sfx/stack-overflow-cast.mp3',  1, true);
        _makePool('timeline-distortion-banner', 'assets/audio/sfx/timeline-distortion-banner.mp3', 1, true);
        _makePool('kanade-depart',        'assets/audio/sfx/kanade-depart.mp3',        1, true);
        _makePool('kanade-time-resume',   'assets/audio/sfx/kanade-time-resume.mp3',   1, true);

        _makePool('cancer-whale-splash', 'assets/audio/sfx/cancer-whale-splash.mp3', 3);
        _makePool('cancer-whale-bite',   'assets/audio/sfx/cancer-whale-bite.mp3',   4);
        _makePool('dau-crow',        'assets/audio/sfx/dau-crow.mp3',        1);
        _makePool('dau-wave',        'assets/audio/sfx/dau-wave.mp3',        1);
        _makePool('dau-charge',      'assets/audio/sfx/dau-charge.mp3',      1);
        _makePool('dau-needle-hit',  'assets/audio/sfx/dau-needle-hit.mp3',  6);
        _makePool('dau-star-strike', 'assets/audio/sfx/dau-star-strike.mp3', 4);
        _makePool('dau-reflect',     'assets/audio/sfx/dau-reflect.mp3',     3);

        state.ambientEl = _makeAmbientStream();
        // Bypass-routed, same as the ten one-shots above it. On the duck chain
        // it inherited whatever duck happened to be live when she stopped time
        // (low-hp alone cuts to 0.16 and muffles down to 260Hz, and pauseAll
        // silences the siren without ever releasing its duck), which left the
        // bed inaudible under a cutscene that has silenced everything else.
        state.kanadeAmbienceEl = _makeBufferLoop(true);
        state.kanadeCollapseEl = _makeBufferLoop(true);
        state.kanadeMusicEl = _makeBufferLoop(true);
        state.kanadeAmbienceEl.setSrc(KANADE_AMBIENCE_SRC);
        state.kanadeCollapseEl.setSrc(KANADE_COLLAPSE_SRC);
        state.kanadeMusicEl.setSrc(KANADE_MUSIC_SRC, false);
        state.menuSpaceEl = _makeBufferLoop();
        state.engineEl   = _makeBufferLoop();
        state.engineEl.setSrc('assets/audio/sfx/engine.mp3');
        state.laserEl    = _makeBufferLoop();
        state.laserEl.setSrc('assets/audio/sfx/laser.mp3');
        state.chargingEl = _makeBufferLoop();
        state.chargingEl.setSrc('assets/audio/sfx/charging.mp3');
        state.skillGLoopEl = _makeBufferLoop();
        state.skillGLoopEl.setSrc('assets/audio/sfx/skill-g-loop.mp3');
        state.skillDChargeEl = _makeBufferLoop();
        state.skillDChargeEl.setSrc('assets/audio/sfx/skill-d-charge.mp3');
        state.lowHpEl = _makeBufferLoop(); // heartbeat, loops while lives < 5
        state.lowHpEl.setSrc('assets/audio/sfx/low-hp.mp3');
        state.photokrystosIdleEl = _makeBufferLoop();
        state.photokrystosIdleEl.setSrc('assets/audio/sfx/photokrystos-idle.mp3');
        state.crawlEl = _makeBufferLoop();
        state.crawlEl.setSrc('assets/audio/sfx/egregor-crawl.mp3');
        state.goliathIdleEl = _makeBufferLoop();
        state.goliathIdleEl.setSrc('assets/audio/sfx/goliath-idle.mp3');
        state.cancerWhirlpoolEl = _makeBufferLoop(); // ambient bed shared across every whirlpool active at once, not per-instance
        state.cancerWhirlpoolEl.setSrc('assets/audio/sfx/cancer-whirlpool-spin.mp3');
        state.leviathanIdleEl = _makeBufferLoop();
        state.leviathanIdleEl.setSrc('assets/audio/sfx/leviathan-idle.mp3');
        state.ammitIdleEl = _makeBufferLoop();
        state.ammitIdleEl.setSrc('assets/audio/sfx/ammit-idle.mp3');
        state.thaelisIdleEl = _makeBufferLoop();
        state.thaelisIdleEl.setSrc('assets/audio/sfx/thaelis-idle.mp3');
        state.thaelisGearEl = _makeBufferLoop();
        state.thaelisGearEl.setSrc('assets/audio/sfx/thaelis-idle-gear.mp3');
        state.thaelisWeaponEl = _makeBufferLoop();
        state.thaelisWeaponEl.setSrc('assets/audio/sfx/thaelis-idle-weapon.mp3');
        state.urielIdleEl = _makeBufferLoop();
        state.urielIdleEl.setSrc('assets/audio/sfx/uriel-idle.mp3');
        state.urielSwordHoverEl = _makeBufferLoop();
        state.urielSwordHoverEl.setSrc('assets/audio/sfx/uriel-sword-hover.mp3');
        state.raphaelIdleEl = _makeBufferLoop();
        state.raphaelIdleEl.setSrc('assets/audio/sfx/raphael-idle.wav');
        // Not looped: play once at natural pace, cut short by stopLoop() when
        // the game event they track (charge window / on-screen lifetime /
        // sweep animation) ends rather than being pre-trimmed/time-stretched
        // to a fixed duration.
        state.skillFChargeEl = _makeBufferLoop();
        state.skillFChargeEl.setSrc('assets/audio/sfx/skill-f-charge.mp3', false);
        state.skillFFireEl = _makeBufferLoop();
        state.skillFFireEl.setSrc('assets/audio/sfx/skill-f-fire.mp3', false);
        state.blackholeEl = _makeBufferLoop();
        state.blackholeEl.setSrc('assets/audio/sfx/blackhole.mp3', false);
        // Looped (unlike its charge/fire neighbors above): the clip is a
        // fixed 3.5s, but the real shockwave's expansion time scales with
        // screen diagonal (radius/12 frames) plus a 500ms linger - on any
        // screen wider than a normal 16:9 monitor that easily runs past
        // 3.5s, so a one-shot clip went silent well before stopMaouHaki()
        // actually fired, well before the visual effect (and the shake/
        // bullet-clear it drives) was done.
        state.maouHakiEl = _makeBufferLoop();
        state.maouHakiEl.setSrc('assets/audio/sfx/maou-haki.mp3');
        state.nullSlashWindupEl = _makeBufferLoop();
        state.nullSlashWindupEl.setSrc('assets/audio/sfx/egregor-nullslash-windup.mp3', false);
        state.goliathVerdictChargeEl = _makeBufferLoop();
        state.goliathVerdictChargeEl.setSrc('assets/audio/sfx/goliath-verdict-charge.mp3', false);
    }

    _boot();

    window.AudioMgr = {
        prepareEnemy, prepareGameplay, prepareSigil,
        // BGM
        playMenuBgm, playRandomInGameBgm, playBgmById, stopBgm,
        pauseBgm, resumeBgm,
        pauseAll, resumeAll, setTimeFrozen,
        playCutsceneSfx, startCutsceneAmbience, setCutsceneBedGains, stopCutsceneAmbience,
        startMenuSpace, setMenuSpaceGain, stopMenuSpace,
        list: () => BGM_LIST.slice(),
        currentBgmId: () => state.currentBgmId,
        getSelectedBgmIds, isBgmSelected, toggleBgmSelection,

        // SFX
        playSfx, playSfxAt, playTutorialSfx, stopTutorialSfx,
        startAmbient, stopAmbient,
        startEngine,  stopEngine,
        startCharging, stopCharging,
        startSkillGLoop, stopSkillGLoop,
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
        startLeviathanIdle, stopLeviathanIdle,
        startAmmitIdle, stopAmmitIdle, stopAmmitCues,
        startThaelisIdle, stopThaelisIdle,
        startUrielIdle, stopUrielIdle,
        startUrielSwordHover, stopUrielSwordHover,
        startRaphaelIdle, stopRaphaelIdle,
        startCancerWhirlpool, stopCancerWhirlpool,
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
