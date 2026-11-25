// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Central audio system. All in-game and menu sounds route through this file.
// Volumes have three categories the settings panel exposes:
//   bgm    , menu track + randomized in-game BGM
//   sfx    , gameplay effects + the space "ingame.mp3" ambient loop
//   global , multiplied into both above (master)
// Persisted to localStorage as JSON under key 'audioVols'.
//
// Every sound in the game , one-shot sfx, sustained loops, and BGM , plays
// through decoded AudioBufferSourceNodes on the Web Audio rendering thread.
// This replaces an earlier design where each sound was a pooled/looping
// <audio> element: on at least one real iOS Safari device/version, actively
// playing HTMLMediaElements (looped background tracks, and separately the
// high-frequency one-shot sfx pools like autoshot/spirit-autofire) caused a
// severe main-thread stall between requestAnimationFrame callbacks , proven
// via on-device frame-timing logs, and confirmed by muting audio (which
// pauses/silences those elements) fully restoring normal FPS. Routing the
// continuous loops through Web Audio graph nodes alone didn't fix it either;
// only removing HTMLMediaElement playback from the sustained gameplay loop
// entirely did. The only remaining <audio> elements are short-lived
// "bridge" instances used to start BGM instantly while its buffer decodes
// (see _makeBufferLoop) , never a persistent, long-running element.

(function () {
    const STORAGE_KEY = 'audioVols';
    const STORAGE_KEY_BGM_SEL = 'audioBgmSelection';

    // Web Audio graph: everything except the Yog-Sothoth activation cue
    // ("shift-hold") routes through a shared duck-gain -> lowpass-filter
    // chain. Yog-Sothoth Domain and low-HP dazed state both drive this
    // chain to simulate the rest of the mix being smothered , muffled and
    // quiet , while each state's own signature cue (shift-hold) bypasses
    // the chain entirely via _bypassGain so it reads as the loudest,
    // clearest thing in the mix. Falls back to silent no-ops with no Web
    // Audio.
    const _AC = window.AudioContext || window.webkitAudioContext;
    const actx = _AC ? new _AC() : null;
    let _duckGain = null, _duckFilter = null, _bypassGain = null;
    let _masterLimiter = null, _masterClipper = null;
    const _duelLimitCurve = Float32Array.from({ length: 8193 }, (_, i) => Math.max(-.89, Math.min(.89, i / 4096 - 1)));
    const NORMAL_FREQ = 20000; // effectively unfiltered
    if (actx) {
        _masterLimiter = actx.createDynamicsCompressor();
        _masterLimiter.threshold.value = 0; _masterLimiter.knee.value = 0; _masterLimiter.ratio.value = 1;
        _masterLimiter.attack.value = .001; _masterLimiter.release.value = .08;
        _masterClipper = actx.createWaveShaper(); _masterClipper.oversample = '4x';
        _masterLimiter.connect(_masterClipper); _masterClipper.connect(actx.destination);
        _duckGain = actx.createGain();
        _duckFilter = actx.createBiquadFilter();
        _duckFilter.type = 'lowpass';
        _duckFilter.frequency.value = NORMAL_FREQ;
        _duckGain.gain.value = 1;
        _duckGain.connect(_duckFilter);
        _duckFilter.connect(_masterLimiter);

        _bypassGain = actx.createGain();
        _bypassGain.gain.value = 1;
        _bypassGain.connect(_masterLimiter);
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
    let _decoding = 0, _decodingBig = 0;
    // 2 = ui cues the player triggers right away, 1 = other short cues, 0 = music and the ambient bed.
    // Music is big, so it queues behind every short cue and only one runs at a time.
    function _decodePriority(src) {
        if (/\/bgm\/(?!egregor-opening)|ingame\.mp3/.test(src)) return 0;
        return /\/(click|hover|overlay|sigil-|new-wave|autoshot|enemy-|shield-hit|life-lost|skill-ready)/.test(src) ? 2 : 1;
    }
    function _queueDecode(load, priority = 1) {
        return new Promise(resolve => {
            const job = { load, resolve, priority };
            let at = _decodeQueue.length;
            while (at > 0 && _decodeQueue[at - 1].priority < priority) at--;
            _decodeQueue.splice(at, 0, job);
            _pumpDecodes();
        });
    }
    function _pumpDecodes() {
        while (_decoding < 4 && _decodeQueue.length) {
            const at = _decodeQueue.findIndex(j => j.priority > 0 || _decodingBig === 0);
            if (at < 0) return;
            const job = _decodeQueue.splice(at, 1)[0]; _decoding++;
            if (job.priority === 0) _decodingBig++;
            Promise.resolve().then(job.load).catch(() => null).then(buf => {
                _decoding--; if (job.priority === 0) _decodingBig--;
                job.resolve(buf); _pumpDecodes();
            });
        }
    }
    function _decodeBuffer(src, optional = false) {
        if (!actx) return Promise.resolve(null);
        if (_bufferCache[src]) return _bufferCache[src];
        const p = _queueDecode(() => fetch(src)
            .then(r => { if (!r.ok) { if (optional) return null; throw Error('Audio unavailable'); } return r.arrayBuffer(); })
            .then(ab => ab && actx.decodeAudioData(ab)), _decodePriority(src))
            .then(buf => {
                if (buf && _bufferCache[src] === p) _decodedBuffers[src] = buf;
                // Failed loads retain their settled promise until the next page load.
                return buf;
            })
            .catch(e => { if (!optional) console.warn('[Audio] buffer decode failed for ' + src, e); return null; });
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
    function _playVoice(src, gainValue, bypass, capped, optional = false, panX = null) {
        // ship voices are rare and carry the defeat and low health calls, so a busy fight never drops them
        capped = (capped || _duelActive) && !src.includes('/voice/');
        if (!actx || gainValue <= 0) return { cancel() {} };
        let cancelled = false, liveNode = null, liveGain = null, livePan = null;
        const start = buf => {
            if (!buf || cancelled || (capped && _liveVoices >= MAX_SFX_VOICES)) return;
            const g = actx.createGain();
            liveGain = g;
            g.gain.value = gainValue;
            const isVoice = src.includes('/voice/');
            const bus = _duelActive && !isVoice ? (bypass ? _duelCueBus : _duelSfxBus) : (bypass ? _bypassGain : _duckGain);
            if (actx.createStereoPanner && Number.isFinite(panX)) {
                try {
                    const screenW = (typeof canvas !== 'undefined' && canvas && canvas.width) ? canvas.width : 480;
                    const panVal = Math.max(-0.75, Math.min(0.75, (panX / screenW - 0.5) * 1.5));
                    const panner = actx.createStereoPanner();
                    panner.pan.value = panVal;
                    g.connect(panner);
                    panner.connect(bus);
                    livePan = panner;
                } catch (_) {
                    g.connect(bus);
                }
            } else {
                g.connect(bus);
            }
            if (isVoice) _duelDuck('voice', buf.duration);
            const node = actx.createBufferSource();
            node.buffer = buf;
            node.connect(g);
            if (capped) _liveVoices++;
            node.onended = () => {
                if (capped) _liveVoices = Math.max(0, _liveVoices - 1);
                try { g.disconnect(); } catch (_) {}
                if (livePan) { try { livePan.disconnect(); } catch (_) {} }
            };
            node.start(0);
            liveNode = node;
        };
        const ready = _decodedBuffers[src];
        if (ready) start(ready); else _decodeBuffer(src, optional).then(start);
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
    // can take a couple of seconds , long enough to be an audible startup
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
    function _makeBufferLoop(bypass = false, route = null) {
        const gainNode = actx ? actx.createGain() : null;
        if (gainNode) gainNode.connect(route || (bypass ? _bypassGain : _duckGain));
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
                // Manually stopping a source also fires onended per spec ,
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
        // the 14MB bed waits until the menu cues have had the bandwidth; play() fetches it itself if needed sooner
        if (actx) setTimeout(() => loop.prepare(), 6000);
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
    // gain) wins. low-hp is deliberately muffled further than Yog-Sothoth ,
    // "choáng" from taking near-fatal damage reads as more disorienting
    // than the domain's own time-distortion hum.
    const DUCK_LEVELS = {
        duelEvolution: { gain: 0.52, freq: 1400 },
        yogsothoth: { gain: 0.32, freq: 450 },
        lowhp:      { gain: 0.16, freq: 260 },
        // The duel keeps the boss cues and the arena mix readable, so its low health muffle is much lighter
        duelLowHp:  { gain: 0.62, freq: 3200 },
        // plain volume cut, no muffle filter - just wants the transform
        // sfx (bypass-routed) to read clearly, not a disorienting effect
        goliathTransform: { gain: 0.35, freq: NORMAL_FREQ },
        goliathSpawn: { gain: 0.35, freq: NORMAL_FREQ },
        muiWindup: { gain: 0.45, freq: 1800 },
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
    function enterMuiWindupDuck() { enterDuck('muiWindup'); }
    function exitMuiWindupDuck()  { exitDuck('muiWindup'); }

    // The duck still applies to everything else (bgm, ambient, sfx...) so
    // the domain still reads as muffling the outside world - the theme
    // itself is the one exception, routed through _bypassGain instead.
    function enterTimeDomain() { enterDuck('yogsothoth'); startYogDomainTheme(); }
    function exitTimeDomain()  { exitDuck('yogsothoth'); stopYogDomainTheme(); }
    function enterLowHpDuck()  { enterDuck('lowhp'); }
    function exitLowHpDuck()   { exitDuck('lowhp'); }

    // Per-clip base gain. Balance lives in the audio files themselves (gain
    // baked in with ffmpeg's volume filter) so the in-game sliders read as
    // "true 100%" at their default , this map is a 1.0 passthrough, kept as
    // a hook for future per-clip tweaks rather than a real attenuation table.
    // Values 0..1, multiplied by sfx * global.
    const TUTORIAL_OPTIONAL = {
        'tut-menu-select': { gain: 0.32, group: 'menu', optional: true, fallback: 'click' },
        'tut-run-start': { gain: 0.58, group: 'menu', optional: true },
        'tut-sigil-hover': { gain: 0.24, group: 'menu', optional: true, fallback: 'hover' },
        'tut-sigil-select': { gain: 0.42, group: 'menu', optional: true, fallback: 'click' },
        'tut-sigil-confirm': { gain: 0.62, group: 'menu', optional: true, fallback: 'sigil-confirm' },
        'tut-sigil-reroll': { gain: 0.46, group: 'menu', optional: true, fallback: 'sigil-confirm' },
        'tut-kanade-step': { gain: 0.32, group: 'kanade', optional: true },
        'tut-kanade-breath': { gain: 0.22, group: 'kanade', optional: true },
        'tut-gate-close': { gain: 0.67, group: 'kanade', optional: true },
        'tut-expression': { gain: 0.23, group: 'kanade', optional: true },
        'tut-speech-close': { gain: 0.34, group: 'dialogue', optional: true },
        'tut-line-skip': { gain: 0.26, group: 'dialogue', optional: true },
        'tut-toast-close': { gain: 0.26, group: 'dialogue', optional: true },
        'tut-reveal-a': { gain: 0.62, group: 'skills', optional: true, fallback: 'tut-reveal' },
        'tut-reveal-s': { gain: 0.57, group: 'skills', optional: true, fallback: 'tut-reveal' },
        'tut-reveal-d': { gain: 0.67, group: 'skills', optional: true, fallback: 'tut-reveal' },
        'tut-reveal-f': { gain: 0.68, group: 'skills', optional: true, fallback: 'tut-reveal' },
        'tut-reveal-g': { gain: 0.59, group: 'skills', optional: true, fallback: 'tut-reveal' },
        'tut-reveal-shift': { gain: 0.67, group: 'skills', optional: true, fallback: 'tut-reveal' },
        'tut-reveal-space': { gain: 0.61, group: 'skills', optional: true, fallback: 'tut-reveal' },
        'tut-skill-ready': { gain: 0.33, group: 'skills', optional: true, fallback: 'skill-ready' },
        'tut-shift-hold': { gain: 0.66, group: 'skills', optional: true, fallback: 'shift-hold' },
        'tut-shift-release': { gain: 0.44, group: 'skills', optional: true },
        'tut-steer-left': { gain: 0.25, group: 'skills', optional: true },
        'tut-steer-right': { gain: 0.25, group: 'skills', optional: true },
        'tut-target-form': { gain: 0.48, group: 'targets', optional: true },
        'tut-target-hit': { gain: 0.34, group: 'targets', optional: true },
        'tut-target-break': { gain: 0.6, group: 'targets', optional: true },
        'tut-warn-bullets': { gain: 0.48, group: 'spells', optional: true },
        'tut-warn-strip': { gain: 0.56, group: 'spells', optional: true, fallback: 'tut-warn' },
        'tut-warn-circle': { gain: 0.57, group: 'spells', optional: true, fallback: 'tut-warn' },
        'tut-warn-sector': { gain: 0.57, group: 'spells', optional: true, fallback: 'tut-warn' },
        'tut-warn-shift': { gain: 0.64, group: 'spells', optional: true, fallback: 'tut-warn' },
        'tut-fade-bullets': { gain: 0.29, group: 'spells', optional: true },
        'tut-fade-strip': { gain: 0.34, group: 'spells', optional: true },
        'tut-fade-circle': { gain: 0.35, group: 'spells', optional: true },
        'tut-fade-sector': { gain: 0.36, group: 'spells', optional: true },
        'tut-fade-shift': { gain: 0.45, group: 'spells', optional: true },
        'tut-near-miss': { gain: 0.42, group: 'feedback', optional: true },
        'tut-retry': { gain: 0.46, group: 'feedback', optional: true },
        'tut-hint': { gain: 0.34, group: 'feedback', optional: true },
        'tut-wait': { gain: 0.32, group: 'feedback', optional: true },
        'tut-skip': { gain: 0.43, group: 'feedback', optional: true },
        'tut-lesson-clear': { gain: 0.51, group: 'feedback', optional: true },
        'tut-license-transition': { gain: 0.63, group: 'license', optional: true },
        'tut-license-name': { gain: 0.24, group: 'license', optional: true },
        'tut-license-save': { gain: 0.48, group: 'license', optional: true, fallback: 'click' },
        'tut-license-reissue': { gain: 0.46, group: 'license', optional: true },
        'tut-license-close': { gain: 0.44, group: 'license', optional: true, fallback: 'click' },
        'tut-license-menu': { gain: 0.42, group: 'license', optional: true, fallback: 'click' },
        'tut-license-voyage': { gain: 0.48, group: 'license', optional: true, fallback: 'click' },
        'tut-pause': { gain: 0.39, group: 'system', optional: true },
        'tut-resume': { gain: 0.43, group: 'system', optional: true },
        'tut-exit': { gain: 0.44, group: 'system', optional: true },
    };
    const TUTORIAL_KANADE = ['kanade-gate-open', 'kanade-emerge', 'kanade-depart', 'kanade-summon'];
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
        'thaelis-parry': 1.0, 'thaelis-wave-hit': 0.9, 'thaelis-fall': 1.0, 'thaelis-slain': 1.0, 'thaelis-spawn': 0.9, 'thaelis-wave-fly': 0.45, 'thaelis-reborn': 1.2,
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
        'mui-legion-call': 0.95, 'mui-legion-burst': 1.0, 'mui-array-open': 0.85, 'mui-blade-summon': 0.55,
        'mui-blade-launch': 0.65, 'mui-iron-block': 0.85, 'mui-legion-end': 0.85,
        'mui-qi-ready': 0.75, 'mui-root-bind': 0.80, 'mui-blade-hit': 0.60,
        'mui-pool-echo': 0.70,
        // the zodiac cries: Mui's horn call when the Legion bursts, Ty's hiss when the Serpent Array opens
        'mui-warden-cry': 0.90, 'ty-serpent-cry': 0.90,
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
        'thaelis-fall', 'thaelis-slain',
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
        { id: 'egregor-theme',          title: 'Ruler of the Violet Domain',    src: 'assets/audio/bgm/egregor-theme.mp3',                    duelOnly: true },
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
        skillDChargeEl: null, // black hole charge hum (Skill D, 2s , distinct clip)
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
        thaelisIdleEl: null,   // thaelis idle bed = 3 gapless loops layered (ambience, armour + breath, axe rattle)
        thaelisGearEl: null,
        thaelisWeaponEl: null,
        urielIdleEl: null,    // Uriel ambient presence (wind hum + wing flap + breath), same native gapless loop
        urielSwordHoverEl: null, // Holy Sword's wind-rush texture while any blade is in flight
        raphaelIdleEl: null,  // Raphael ambient presence (gear-hum + choral drone + platform-rise + breath), same native gapless loop
        pool: {},            // sfx key → { src, bypass }
        // In-game BGM rotation pool the player picked in Settings (track ids,
        // excludes the menu-only "pisces" track , that one never plays in a
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

    // Load persisted BGM rotation selection (separate key , kept independent
    // of the volumes blob so neither format has to know about the other).
    try {
        const rawSel = localStorage.getItem(STORAGE_KEY_BGM_SEL);
        if (rawSel) {
            const arr = JSON.parse(rawSel);
            if (Array.isArray(arr)) state.selectedBgmIds = arr.filter(id => BGM_LIST.some(t => t.id === id && !t.menuOnly && !t.duelOnly));
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
    for (const [key, sound] of Object.entries(TUTORIAL_OPTIONAL)) SFX_BASE[key] = sound.gain;

    function sfxGain(k) {
        if (state.muted) return 0;
        if (FORCE_FULL_SFX.has(k)) return state.vol.global;
        return (SFX_BASE[k] || 0.5) * state.vol.sfx * state.vol.global;
    }

    // Prefetch/decode a one-shot sfx clip. size is a historical pool-depth
    // hint from the pre-Web-Audio pooled-<audio> design , playback no longer
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

    function _makePool(key, src, size = 3, bypass = false, optional = false) {
        state.pool[key] = { src, bypass, optional };
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
        const enemy = /^(tut-|ammit|egregor|dimension|goliath|dargruel|leviathan|uriel|raphael|phantom|veilshroud|kanade|stack-overflow|timeline-distortion|dau-|ty-|mui-)/;
        for (const key of Object.keys(state.pool)) if (!enemy.test(key) && !_duelSounds[key]) _decodeBuffer(state.pool[key].src);
    }
    // Decodes everything the title screen needs for its first seconds: the menu theme, the space bed that will play under it
    // and the interface cues. Resolves when all of them are ready, so the start prompt can wait for a complete mix.
    // onProgress(done, total) runs as each file finishes, decoded or not.
    function prepareMenu(onProgress) {
        const menu = BGM_LIST.find(t => t.menuOnly);
        if (state.menuSpaceIdx < 0) state.menuSpaceIdx = Math.floor(Math.random() * MENU_SPACE_SRC.length);
        const jobs = [_decodeBuffer(MENU_SPACE_SRC[state.menuSpaceIdx])];
        if (menu) jobs.push(_decodeBuffer(menu.src));
        for (const key of Object.keys(state.pool)) if (/^(click|hover|overlay)/.test(key)) jobs.push(_decodeBuffer(state.pool[key].src));
        const total = jobs.length;
        let done = 0;
        if (onProgress) onProgress(0, total);
        return Promise.all(jobs.map(job => job.then(() => { if (onProgress) onProgress(++done, total); })));
    }
    function prepareSigil(id) {
        if (id === 'dau' || id === 'ty' || id === 'mui') for (const key of Object.keys(state.pool)) if (key.startsWith(id + '-')) _decodeBuffer(state.pool[key].src, !!state.pool[key].optional);
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
        if (key.startsWith('tut-')) return _playAmmitCue(p.src, g, true, true, { group: 'scene', key });
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
    const SFX_KEY_REPEAT_MS = {
        'mui-blade-hit': 50,
        'mui-blade-launch': 60,
        'mui-blade-summon': 80,
        'mui-root-bind': 100,
        'mui-pool-echo': 75,
        'mui-iron-block': 110,
        'mui-qi-ready': 140,
    };
    const _sfxLastAt = {};
    function _sfxTooSoon(key) {
        const t = performance.now();
        const minGap = SFX_KEY_REPEAT_MS[key] || SFX_REPEAT_MS;
        if (t - (_sfxLastAt[key] || -Infinity) < minGap) return true;
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
    function _playAmmitCue(src, volume, bypass, capped, tutorial = null) {
        if (!actx) return;
        let slot = null;
        for (let i = 0; i < _ammitCues.length; i++) if (!_ammitCues[i].active) { slot = _ammitCues[i]; break; }
        if (!slot && bypass) { slot = _ammitCues[0]; _ammitStopCue(slot); }
        if (!slot) return;
        slot.active = true; slot.paused = false; slot.offset = 0; slot.volume = volume; slot.bypass = bypass; slot.capped = capped; slot.tutorial = !!tutorial;
        slot.tutorialGroup = tutorial?.group; slot.tutorialKey = tutorial?.key;
        const serial = slot.serial = ++_ammitCueSerial;
        const ready = _decodedBuffers[src];
        if (ready) { slot.buffer = ready; _ammitStartCue(slot); }
        else _decodeBuffer(src).then(function (buffer) {
            if (!slot.active || slot.serial !== serial) return;
            if (!buffer) { _ammitStopCue(slot); return; }
            slot.buffer = buffer; _ammitStartCue(slot);
        });
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

    // Duel voices share bounded lifetimes, priority buses and deterministic take selection.
    const DUEL_SOUNDS = [{"key":"egregor-idle-p1-bed","duration":19,"group":"ambience","stereo":true,"loop":true,"phase":1},{"key":"egregor-idle-p1-breath","duration":12.4,"group":"ambience","stereo":true,"loop":true,"phase":1},{"key":"egregor-idle-p1-murmur","duration":15.1,"group":"ambience","stereo":true,"loop":true,"phase":1},{"key":"egregor-idle-p1-growl-a","duration":3.1,"group":"effect","stereo":false},{"key":"egregor-idle-p1-growl-b","duration":2.5,"group":"effect","stereo":false},{"key":"egregor-idle-p1-coo-a","duration":2.1,"group":"effect","stereo":false},{"key":"egregor-idle-p1-coo-b","duration":1.8,"group":"effect","stereo":false},{"key":"egregor-idle-p1-roar","duration":4.1,"group":"large","stereo":false},{"key":"arena-bed-p1","duration":12,"group":"ambience","stereo":true,"loop":true,"phase":1},{"key":"arena-bed-p2","duration":12,"group":"ambience","stereo":true,"loop":true,"phase":2},{"key":"arena-bed-p3","duration":12,"group":"ambience","stereo":true,"loop":true,"phase":3},{"key":"boss-breath","duration":8,"group":"ambience","stereo":true,"loop":true},{"key":"boss-bullet-cancel","duration":0.3,"group":"effect","stereo":false},{"key":"boss-bullet-eye-a","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-eye"},{"key":"boss-bullet-eye-b","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-eye"},{"key":"boss-bullet-eye-c","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-eye"},{"key":"boss-bullet-ichor-a","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-ichor"},{"key":"boss-bullet-ichor-b","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-ichor"},{"key":"boss-bullet-ichor-c","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-ichor"},{"key":"boss-bullet-spore-a","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-spore"},{"key":"boss-bullet-spore-b","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-spore"},{"key":"boss-bullet-spore-c","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-spore"},{"key":"boss-bullet-thorn-a","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-thorn"},{"key":"boss-bullet-thorn-b","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-thorn"},{"key":"boss-bullet-thorn-c","duration":0.18,"group":"effect","stereo":false,"variants":"boss-bullet-thorn"},{"key":"boss-emerge-roar","duration":2.2,"group":"large","stereo":true},{"key":"boss-hit-a","duration":0.28,"group":"effect","stereo":false,"variants":"boss-hit"},{"key":"boss-hit-b","duration":0.28,"group":"effect","stereo":false,"variants":"boss-hit"},{"key":"boss-hit-c","duration":0.28,"group":"effect","stereo":false,"variants":"boss-hit"},{"key":"boss-hit-heavy","duration":0.55,"group":"large","stereo":true},{"key":"boss-invuln","duration":0.35,"group":"effect","stereo":false},{"key":"boss-volley","duration":0.4,"group":"effect","stereo":false},{"key":"chorus-whisper","duration":3,"group":"ambience","stereo":true,"loop":true},{"key":"evolve-charge","duration":3,"group":"large","stereo":true},{"key":"evolve-roar-p2","duration":2.4,"group":"large","stereo":true,"phase":2},{"key":"evolve-roar-p3","duration":2.4,"group":"large","stereo":true,"phase":3},{"key":"evolve-roar","duration":2.4,"group":"large","stereo":true},{"key":"eyebeam-charge","duration":1,"group":"effect","stereo":false},{"key":"eyebeam-end","duration":0.45,"group":"effect","stereo":false},{"key":"eyebeam-loop","duration":2,"group":"ambience","stereo":true,"loop":true},{"key":"graze-tick-a","duration":0.08,"group":"effect","stereo":false,"variants":"graze-tick"},{"key":"graze-tick-b","duration":0.08,"group":"effect","stereo":false,"variants":"graze-tick"},{"key":"graze-tick-c","duration":0.08,"group":"effect","stereo":false,"variants":"graze-tick"},{"key":"hp-layer-break","duration":1.1,"group":"large","stereo":true},{"key":"lock-on-beep","duration":0.2,"group":"ui","stereo":false},{"key":"mind-adapt","duration":1,"group":"effect","stereo":false},{"key":"mind-lock","duration":0.5,"group":"effect","stereo":false},{"key":"mind-scan","duration":0.8,"group":"effect","stereo":false},{"key":"mindlink-form","duration":0.85,"group":"effect","stereo":false},{"key":"nullslash-hit2","duration":0.55,"group":"large","stereo":true},{"key":"nullslash-slash2-p2","duration":0.95,"group":"large","stereo":true,"phase":2},{"key":"nullslash-slash2-p3","duration":0.95,"group":"large","stereo":true,"phase":3},{"key":"nullslash-slash2","duration":0.95,"group":"large","stereo":true},{"key":"nullslash-tear","duration":0.6,"group":"effect","stereo":false},{"key":"nullslash-windup2-p2","duration":1.5,"group":"large","stereo":true,"phase":2},{"key":"nullslash-windup2-p3","duration":1.5,"group":"large","stereo":true,"phase":3},{"key":"nullslash-windup2","duration":1.5,"group":"large","stereo":true},{"key":"orb-burst","duration":1,"group":"large","stereo":true},{"key":"orb-throw","duration":0.7,"group":"effect","stereo":false},{"key":"portal-crack","duration":2.4,"group":"large","stereo":true},{"key":"result-defeat","duration":4,"group":"ui","stereo":true},{"key":"result-victory","duration":4.5,"group":"ui","stereo":true},{"key":"sensor-sweep","duration":3,"group":"effect","stereo":true},{"key":"shield-break","duration":0.6,"group":"effect","stereo":false},{"key":"shield-restore","duration":0.5,"group":"ui","stereo":false},{"key":"spell-charge-p2","duration":1.3,"group":"large","stereo":true,"phase":2},{"key":"spell-charge-p3","duration":1.3,"group":"large","stereo":true,"phase":3},{"key":"spell-charge","duration":1.3,"group":"large","stereo":true},{"key":"spell-release-p2","duration":0.9,"group":"large","stereo":true,"phase":2},{"key":"spell-release-p3","duration":0.9,"group":"large","stereo":true,"phase":3},{"key":"spell-release","duration":0.9,"group":"large","stereo":true},{"key":"tendril-retract","duration":0.55,"group":"effect","stereo":false},{"key":"tendril-strike","duration":0.5,"group":"effect","stereo":false},{"key":"tendril-windup","duration":0.7,"group":"effect","stereo":false},{"key":"ui-back","duration":0.25,"group":"ui","stereo":false},{"key":"ui-card-hover-a","duration":0.12,"group":"ui","stereo":false,"variants":"ui-card-hover"},{"key":"ui-card-hover-b","duration":0.12,"group":"ui","stereo":false,"variants":"ui-card-hover"},{"key":"ui-card-hover-c","duration":0.12,"group":"ui","stereo":false,"variants":"ui-card-hover"},{"key":"ui-card-select","duration":0.5,"group":"ui","stereo":false},{"key":"ui-confirm-engage","duration":0.9,"group":"ui","stereo":false},{"key":"ui-locked","duration":0.35,"group":"ui","stereo":false},{"key":"ui-weapon-hover","duration":0.12,"group":"ui","stereo":false},{"key":"ui-weapon-select-axe","duration":0.5,"group":"ui","stereo":false},{"key":"ui-weapon-select-phantom","duration":0.5,"group":"ui","stereo":false},{"key":"ui-weapon-select-spear","duration":0.5,"group":"ui","stereo":false},{"key":"ui-weapon-select-sword","duration":0.5,"group":"ui","stereo":false},{"key":"ui-weapon-select-titan","duration":0.5,"group":"ui","stereo":false},{"key":"ui-weapon-select","duration":0.5,"group":"ui","stereo":false},{"key":"upheaval-erupt","duration":0.9,"group":"large","stereo":true},{"key":"upheaval-rumble","duration":1.1,"group":"large","stereo":true},{"key":"upheaval-slam","duration":0.7,"group":"large","stereo":true}];
    DUEL_SOUNDS.push(...[{"key":"egregor-idle-p2-bed","duration":20,"group":"ambience","stereo":true,"loop":true,"phase":2},{"key":"egregor-idle-p2-breath","duration":12,"group":"ambience","stereo":true,"loop":true,"phase":2},{"key":"egregor-idle-p2-murmur","duration":16,"group":"ambience","stereo":true,"loop":true,"phase":2},{"key":"egregor-idle-p2-growl-a","duration":3,"group":"effect","stereo":false},{"key":"egregor-idle-p2-growl-b","duration":2.48,"group":"effect","stereo":false},{"key":"egregor-idle-p2-coo-a","duration":2.2,"group":"effect","stereo":false},{"key":"egregor-idle-p2-coo-b","duration":2,"group":"effect","stereo":false},{"key":"egregor-idle-p2-roar","duration":4.08,"group":"large","stereo":false},{"key":"egregor-idle-p3-bed","duration":20,"group":"ambience","stereo":true,"loop":true,"phase":3},{"key":"egregor-idle-p3-breath","duration":14,"group":"ambience","stereo":true,"loop":true,"phase":3},{"key":"egregor-idle-p3-murmur","duration":16,"group":"ambience","stereo":true,"loop":true,"phase":3},{"key":"egregor-idle-p3-growl-a","duration":3.48,"group":"effect","stereo":false},{"key":"egregor-idle-p3-growl-b","duration":3,"group":"effect","stereo":false},{"key":"egregor-idle-p3-coo-a","duration":3,"group":"effect","stereo":false},{"key":"egregor-idle-p3-coo-b","duration":2.48,"group":"effect","stereo":false},{"key":"egregor-idle-p3-roar","duration":5.08,"group":"large","stereo":false}]);
    DUEL_SOUNDS.push({key:'duel-relic-sword-release',duration:.6,group:'effect',optional:true,stereo:false}, {key:'duel-relic-sword-return',duration:.8,group:'effect',optional:true,stereo:false});
    DUEL_SOUNDS.push(...[{"key":"duel-gapbar-warn","duration":1.1,"group":"effect","optional":true,"stereo":false},{"key":"duel-gapbar-sweep","duration":0.9,"group":"large","optional":true,"stereo":true},{"key":"duel-gapbar-fade","duration":0.5,"group":"effect","optional":true,"stereo":false},{"key":"duel-pillar-warn","duration":1.2,"group":"effect","optional":true,"stereo":false},{"key":"duel-pillar-drop","duration":0.6,"group":"large","optional":true,"stereo":true},{"key":"duel-pillar-slam","duration":0.8,"group":"large","optional":true,"stereo":true},{"key":"duel-pillar-fade","duration":0.6,"group":"effect","optional":true,"stereo":false},{"key":"egregor-chorus-form","duration":1.5,"group":"effect","optional":true,"stereo":false},{"key":"egregor-chorus-pulse","duration":0.9,"group":"effect","optional":true,"stereo":false},{"key":"egregor-mindlink-fade","duration":0.6,"group":"effect","optional":true,"stereo":false},{"key":"egregor-rift-warn","duration":1,"group":"effect","optional":true,"stereo":false},{"key":"egregor-rift-form","duration":1.2,"group":"large","optional":true,"stereo":true},{"key":"egregor-rift-fade","duration":0.7,"group":"effect","optional":true,"stereo":false},{"key":"egregor-sphere-warn","duration":0.35,"group":"effect","optional":true,"stereo":false},{"key":"egregor-cast-rune","duration":0.7,"group":"effect","optional":true,"stereo":false},{"key":"egregor-cast-release","duration":0.5,"group":"effect","optional":true,"stereo":false},{"key":"duel-cancel-shards","duration":0.3,"group":"effect","optional":true,"stereo":false},{"key":"egregor-evolution-shell","duration":1.5,"group":"large","optional":true,"stereo":true},{"key":"egregor-evolution-shards","duration":1.1,"group":"large","optional":true,"stereo":true},{"key":"egregor-death-fracture","duration":1.6,"group":"large","optional":true,"stereo":true},{"key":"egregor-death-ash","duration":1.4,"group":"large","optional":true,"stereo":true},{"key":"duel-ship-fireball","duration":1.2,"group":"large","optional":true,"stereo":true},{"key":"duel-ship-debris","duration":0.8,"group":"large","optional":true,"stereo":true},{"key":"duel-cockpit-five","duration":0.8,"group":"large","optional":true,"stereo":true},{"key":"duel-cockpit-three","duration":1,"group":"large","optional":true,"stereo":true},{"key":"duel-ship-report","duration":0.3,"group":"effect","optional":true,"stereo":false},{"key":"duel-opening-dust","duration":1.5,"group":"effect","optional":true,"stereo":false},{"key":"egregor-opening-ten-minds","duration":3.5,"group":"effect","optional":true,"stereo":false},{"key":"egregor-opening-glass","duration":1.2,"group":"effect","optional":true,"stereo":false},{"key":"egregor-opening-rays","duration":1.6,"group":"effect","optional":true,"stereo":false},{"key":"egregor-opening-unison","duration":1.5,"group":"effect","optional":true,"stereo":false},{"key":"egregor-opening-limb","duration":1.1,"group":"effect","optional":true,"stereo":false},{"key":"egregor-opening-breath","duration":1.3,"group":"effect","optional":true,"stereo":false},{"key":"egregor-opening-inscribe","duration":1.3,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-sword-cast","duration":1,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-sword-hit","duration":0.45,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-spear-cast","duration":0.6,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-spear-hit","duration":0.45,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-halberd-cast","duration":1,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-halberd-hit","duration":0.45,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-dagger_array-cast","duration":1,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-dagger_array-hit","duration":0.45,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-heavy_lance-cast","duration":1,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-heavy_lance-hit","duration":0.45,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-spear-release","duration":0.8,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-dagger_array-volley","duration":0.13,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-heavy_lance-impact","duration":0.9,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-cancel","duration":0.25,"group":"effect","optional":true,"stereo":false},{"key":"duel-relic-ready","duration":0.5,"group":"effect","optional":true,"stereo":false}]);
    DUEL_SOUNDS.push({"key":"egregor-eyebeam-fire","duration":0.65,"group":"effect","event":"Tia mắt bắt đầu gây nguy hiểm","material":"An ancient petrified eye opens and releases a compressed column of cavern pressure, cracked bronze friction and a deep organic hiss","file":"js/duel/duel-attacks.js","fn":"_syncSkillAudio / _updateSkills","optional":true,"stereo":false});
    DUEL_SOUNDS.push(
        { key: 'duel-portal-swallow', duration: 0.35, group: 'effect', stereo: false, optional: true },
        { key: 'duel-portal-emit', duration: 0.4, group: 'effect', stereo: false, optional: true },
        { key: 'duel-portal-swap-warn', duration: 1.2, group: 'effect', stereo: false, optional: true },
        { key: 'duel-portal-swap', duration: 1.1, group: 'large', stereo: true, optional: true },
        { key: 'duel-portal-cross', duration: 0.9, group: 'large', stereo: true, optional: true },
        { key: 'duel-safecell-lock', duration: 0.4, group: 'effect', stereo: false, optional: true }
    );
    const _duelSounds = Object.fromEntries(DUEL_SOUNDS.map(item => [item.key, item]));
    const _duelFamilies = {};
    for (const sound of DUEL_SOUNDS) if (sound.variants) {
        (_duelFamilies[sound.variants] || (_duelFamilies[sound.variants] = [])).push(sound.key);
    }
    const _duelVoices = new Set(), _duelLoops = new Map();
    const _duelLast = {}, _duelRound = {}, _duelGroupVolumes = { effect: 1, large: 1, ui: 1, ambience: 1 };
    let _duelActive = false, _duelPaused = false, _duelGeneration = 0, _duelPrepared = null;
    let _duelVoiceUntil = 0, _duelCueUntil = 0, _duelDuckTimer = null;
    let _duelAmbience = true;
    try { _duelAmbience = localStorage.getItem('duelAmbienceEnabled') !== 'false'; } catch (_) {}
    const _duelSfxBus = actx ? actx.createGain() : null;
    const _duelCueBus = actx ? actx.createGain() : null;
    const _duelMusicBus = actx ? actx.createGain() : null;
    if (actx) {
        _duelSfxBus.connect(_duckGain);
        _duelCueBus.connect(_bypassGain);
        _duelMusicBus.connect(_duckGain);
    }

    function _duelPriority() {
        if (!actx) return;
        const now = actx.currentTime;
        const voice = _duelActive && _duelVoiceUntil > now;
        const cue = _duelActive && _duelCueUntil > now;
        _duelSfxBus.gain.setTargetAtTime(voice ? .5012 : 1, now, voice ? .015 : .14);
        _duelCueBus.gain.setTargetAtTime(voice ? .5012 : 1, now, voice ? .015 : .14);
        _duelMusicBus.gain.setTargetAtTime(voice ? .5012 : cue ? .7079 : 1, now, voice || cue ? .025 : .22);
        clearTimeout(_duelDuckTimer);
        const next = Math.min(...[_duelVoiceUntil, _duelCueUntil].filter(t => t > now));
        if (Number.isFinite(next)) _duelDuckTimer = setTimeout(_duelPriority, Math.max(1, (next - now) * 1000 + 10));
    }
    function _duelDuck(kind, seconds) {
        if (!_duelActive || !actx) return;
        const until = actx.currentTime + seconds;
        if (kind === 'voice') _duelVoiceUntil = Math.max(_duelVoiceUntil, until);
        else _duelCueUntil = Math.max(_duelCueUntil, until);
        _duelPriority();
    }
    function prepareDuel() {
        if (!_duelPrepared) _duelPrepared = (async () => {
            _decodeBuffer(OPENING_MUSIC_SRC);
            const battleTheme = BGM_LIST.find(t => t.duelOnly);
            if (battleTheme) _decodeBuffer(battleTheme.src);
            const order = DUEL_SOUNDS.slice().sort((a, b) => {
                const rank = s => s.group === 'ui' ? 0 : /sensor|portal|emerge|lock-on/.test(s.key) ? 1 : s.loop ? 3 : 2;
                return rank(a) - rank(b) || a.duration - b.duration;
            });
            // the ship voices (defeat, low health, phase calls) are not duel sounds but play in every fight
            const voices = Object.keys(state.pool).filter(k => k.startsWith('vo-') || k.startsWith('duel-victory')).map(k => state.pool[k].src);
            const sources = order.filter(s => !s.optional).map(s => 'assets/audio/sfx/' + s.key + '.mp3');
            sources.splice(order.filter(s => s.group === 'ui' && !s.optional).length, 0, ...voices);
            // six at a time instead of one after another, so the wait is a few round trips rather than ninety
            let next = 0;
            const result = [];
            const worker = async () => { while (next < sources.length) result.push(await _decodeBuffer(sources[next++])); };
            await Promise.all(Array.from({ length: 6 }, worker));
            return result;
        })();
        return _duelPrepared;
    }
    // The short opening cue of the Showdown. It plays through the duel music bus while the opening scene runs, the
    // background music rests until it ends, and the loud hit in the cue lands as the rift tears open.
    const OPENING_MUSIC_SRC = 'assets/audio/bgm/egregor-opening.mp3';
    let _openingMusic = null;
    // The battle theme loops on the shared BGM player for the whole fight. Ramps scale the player volume between 0 and
    // the user's music volume, and any track switch or newer ramp cancels an older one.
    let _bgmRamp = 0;
    function _rampBgm(from, to, seconds, done) {
        const token = ++_bgmRamp, t0 = performance.now();
        const step = () => {
            if (token !== _bgmRamp || !state.bgmEl) return;
            const p = Math.min(1, (performance.now() - t0) / (seconds * 1000));
            state.bgmEl.volume = Math.min(1, bgmGain() * (from + (to - from) * p));
            if (p < 1) setTimeout(step, 50); else if (done) done();
        };
        step();
    }
    function startDuelBattleTheme() {
        const track = BGM_LIST.find(t => t.duelOnly);
        if (!actx || !_duelActive || !track) return;
        if (state.currentBgmId === track.id) {
            if (state.bgmEl.paused && !_pauseSnapshot) state.bgmEl.play().catch(() => {});
            return;
        }
        _switchBgm(track);
        _rampBgm(0, 1, 1.6);
    }
    function stopDuelBattleTheme(fadeSec) {
        const track = BGM_LIST.find(t => t.duelOnly);
        if (!track || state.currentBgmId !== track.id) return;
        if (!(fadeSec > 0)) { _bgmRamp++; stopBgm(); state.bgmEl.volume = bgmGain(); return; }
        _rampBgm(1, 0, fadeSec, () => { if (state.currentBgmId === track.id) stopBgm(); state.bgmEl.volume = bgmGain(); });
    }
    // once the opening cue is over the battle theme takes the music slot; outside a duel the rested music simply resumes
    function _afterOpeningMusic() {
        if (_duelActive && !_duelPaused) startDuelBattleTheme(); else resumeBgm();
    }
    function stopDuelOpeningMusic(fadeSec) {
        const m = _openingMusic;
        if (!m) return;
        _openingMusic = null;
        m.cancelled = true;
        if (m.node && m.gain) {
            const fade = fadeSec > 0 ? fadeSec : 0.02, t = actx.currentTime;
            try { m.gain.gain.cancelScheduledValues(t); m.gain.gain.setValueAtTime(m.gain.gain.value, t); m.gain.gain.linearRampToValueAtTime(0, t + fade); m.node.stop(t + fade + 0.02); } catch (_) {}
        }
        if (m.restedBgm) _afterOpeningMusic();
    }
    function playDuelOpeningMusic() {
        if (!actx || !_duelActive || state.muted) return null;
        stopDuelOpeningMusic(0);
        stopDuelBattleTheme(0);
        const m = { cancelled: false, node: null, gain: null, restedBgm: false, cancel(fade) { if (_openingMusic === m) stopDuelOpeningMusic(fade); else m.cancelled = true; } };
        _openingMusic = m;
        _decodeBuffer(OPENING_MUSIC_SRC).then(buffer => {
            if (!buffer || m.cancelled || _openingMusic !== m || _duelPaused) { if (_openingMusic === m) _openingMusic = null; return; }
            m.gain = actx.createGain(); m.gain.gain.value = bgmGain();
            m.gain.connect(_duelMusicBus);
            m.node = actx.createBufferSource(); m.node.buffer = buffer; m.node.connect(m.gain);
            m.node.onended = () => { try { m.gain.disconnect(); } catch (_) {} if (_openingMusic === m) { _openingMusic = null; if (m.restedBgm) _afterOpeningMusic(); } };
            m.node.start();
            pauseBgm(); m.restedBgm = true;
        });
        return m;
    }
    function setDuelAudioActive(value) {
        _duelActive = !!value;
        if (!_duelActive) { stopDuelAudio(); stopDuelBattleTheme(0); }
        if (_masterLimiter) {
            const now = actx.currentTime;
            _masterLimiter.threshold.setValueAtTime(_duelActive ? -3 : 0, now);
            _masterLimiter.ratio.setValueAtTime(_duelActive ? 20 : 1, now);
            _masterClipper.curve = _duelActive ? _duelLimitCurve : null;
        }
        _duelPriority();
    }
    function _duelWidth() { return typeof canvas !== 'undefined' && canvas ? canvas.width : 1280; }
    function _duelRate(key, phase) {
        const varied = /^(boss-hit|boss-bullet|graze|ui-card-hover|ui-weapon-hover)/.test(key);
        return varied ? 1 + (Math.random() * .08 - .04) : phase === 3 && /tendril|upheaval/.test(key) ? .96 : 1;
    }
    function _duelGain(sound, key) {
        return sfxGain(key) * _duelGroupVolumes[sound.group];
    }
    // boost scales the cue for the moments it has to stand above a loud mix (a form change roar)
    function playDuelSfx(key, x, y, phase = 1, boost = 1) {
        if (!actx || !_duelActive || _duelPaused || _timeFrozen || state.muted) return null;
        const family = _duelFamilies[key];
        const logical = family ? key : key.replace(/-[abc]$/, '');
        const interval = logical.startsWith('boss-hit') ? .1 : logical === 'boss-invuln' ? .15 : logical.startsWith('boss-bullet') ? .08 : logical === 'graze-tick' ? .12 : /hover/.test(logical) ? .08 : .035;
        const now = actx.currentTime;
        if (now - (_duelLast[logical] ?? -Infinity) < interval) return null;
        const preview = _duelSounds[key] || _duelSounds[family?.[0]];
        if ((_liveVoices >= MAX_SFX_VOICES || _duelVoices.size >= 20) && preview?.group === 'large') {
            const expendable = Array.from(_duelVoices).find(v => _duelSounds[v.key]?.group === 'effect');
            if (expendable?.cancel) expendable.cancel();
        }
        if (_liveVoices >= MAX_SFX_VOICES || _duelVoices.size >= 20) return null;
        const localCount = Array.from(_duelVoices).filter(v => v.logical === logical).length;
        if (localCount >= (/graze/.test(logical) ? 1 : 3)) return null;
        let actual = key;
        if (family) actual = family[(_duelRound[key] || 0) % family.length];
        if (phase >= 2 && _duelSounds[actual + '-p' + phase]) actual += '-p' + phase;
        const sound = _duelSounds[actual], pool = state.pool[actual];
        if (!sound || !pool) return null;
        const gainValue = _duelGain(sound, actual) * (boost > 0 ? boost : 1);
        if (gainValue <= 0) return null;
        _duelLast[logical] = now;
        if (family) _duelRound[key] = (_duelRound[key] || 0) + 1;
        const generation = _duelGeneration;
        const slot = { logical, key: actual, node: null, gain: null, pan: null, counted: false, cancelled: false };
        _duelVoices.add(slot);
        const cleanup = () => {
            if (slot.counted) { _liveVoices = Math.max(0, _liveVoices - 1); slot.counted = false; }
            for (const node of [slot.node, slot.gain, slot.pan]) if (node) try { node.disconnect(); } catch (_) {}
            _duelVoices.delete(slot);
        };
        const start = buffer => {
            if (!buffer || generation !== _duelGeneration || slot.cancelled || _duelPaused || state.muted || _liveVoices >= MAX_SFX_VOICES) { cleanup(); return; }
            const node = actx.createBufferSource(), gain = actx.createGain();
            slot.node = node; slot.gain = gain; node.buffer = buffer;
            node.playbackRate.value = _duelRate(actual, phase);
            const distance = sound.group === 'large' || sound.group === 'ui' ? 1 : Number.isFinite(x) ? Math.max(.55, _distanceGain(x, y)) : 1;
            gain.gain.value = gainValue * distance * (/boss-hit|bullet|graze/.test(actual) ? .94 + Math.random() * .06 : 1);
            node.connect(gain);
            if (actx.createStereoPanner && Number.isFinite(x)) {
                slot.pan = actx.createStereoPanner(); slot.pan.pan.value = Math.max(-.65, Math.min(.65, (x / _duelWidth() - .5) * 1.3));
                gain.connect(slot.pan); slot.pan.connect(pool.bypass ? _duelCueBus : _duelSfxBus);
            } else gain.connect(pool.bypass ? _duelCueBus : _duelSfxBus);
            slot.counted = true; _liveVoices++;
            node.onended = cleanup; node.start();
            if (sound.group === 'large') _duelDuck('cue', buffer.duration / node.playbackRate.value);
        };
        const ready = _decodedBuffers[pool.src];
        if (ready) start(ready); else _decodeBuffer(pool.src).then(start);
        slot.cancel = () => { slot.cancelled = true; if (slot.node) try { slot.node.stop(); } catch (_) {} cleanup(); };
        return slot;
    }
    function _duelLoopVolume(slot) {
        if (!actx || !slot.gain) return;
        const sound = _duelSounds[slot.key];
        slot.gain.gain.setTargetAtTime(_duelPaused || state.muted || (slot.ambient && !_duelAmbience) ? 0 : _duelGain(sound, slot.key), actx.currentTime, .05);
    }
    function startDuelLoop(key, x, ambient = false) {
        if (!actx || !_duelActive || _duelPaused || state.muted || (ambient && !_duelAmbience)) return;
        const old = _duelLoops.get(key);
        if (old) { if (old.pan && Number.isFinite(x)) old.pan.pan.setTargetAtTime(Math.max(-.65, Math.min(.65, (x / _duelWidth() - .5) * 1.3)), actx.currentTime, .1); return; }
        const sound = _duelSounds[key], pool = state.pool[key];
        if (!sound || !sound.loop || !pool) return;
        const slot = { key, ambient, node: null, gain: null, pan: null, cancelled: false, counted: false };
        _duelLoops.set(key, slot);
        const start = buffer => {
            if (!buffer || slot.cancelled || _duelLoops.get(key) !== slot || _duelPaused || _liveVoices >= MAX_SFX_VOICES) { stopDuelLoop(key); return; }
            slot.node = actx.createBufferSource(); slot.node.buffer = buffer; slot.node.loop = true;
            slot.gain = actx.createGain(); slot.gain.gain.value = 0; slot.node.connect(slot.gain);
            if (actx.createStereoPanner && Number.isFinite(x)) {
                slot.pan = actx.createStereoPanner(); slot.pan.pan.value = Math.max(-.65, Math.min(.65, (x / _duelWidth() - .5) * 1.3));
                slot.gain.connect(slot.pan); slot.pan.connect(_duelSfxBus);
            } else slot.gain.connect(_duelSfxBus);
            slot.counted = true; _liveVoices++;
            slot.node.start(); _duelLoopVolume(slot);
        };
        const buffer = _decodedBuffers[pool.src];
        if (buffer) start(buffer); else _decodeBuffer(pool.src).then(start);
    }
    function stopDuelLoop(key) {
        const slot = _duelLoops.get(key);
        if (!slot) return;
        slot.cancelled = true; _duelLoops.delete(key);
        if (slot.node) {
            const now = actx.currentTime;
            slot.gain.gain.cancelScheduledValues(now); slot.gain.gain.setValueAtTime(slot.gain.gain.value, now); slot.gain.gain.linearRampToValueAtTime(0, now + .025);
            const cleanup = () => {
                if (slot.counted) { _liveVoices = Math.max(0, _liveVoices - 1); slot.counted = false; }
                for (const node of [slot.node, slot.gain, slot.pan]) if (node) try { node.disconnect(); } catch (_) {}
            };
            slot.node.onended = cleanup;
            try { slot.node.stop(now + .03); } catch (_) { cleanup(); }
        }
    }
    function syncDuelLoops(playing, phase, x, beam, chorus) {
        if (!playing || _duelPaused || !_duelActive) { for (const key of Array.from(_duelLoops.keys())) stopDuelLoop(key); return; }
        const wanted = new Set();
        // every form has its own layered idle set (bed, breath and murmur)
        if (_duelAmbience && phase >= 1 && phase <= 3) { for (const part of ['bed', 'breath', 'murmur']) wanted.add('egregor-idle-p' + phase + '-' + part); }
        else if (_duelAmbience) { wanted.add('boss-breath'); wanted.add('arena-bed-p' + phase); }
        if (beam) wanted.add('eyebeam-loop');
        if (chorus) wanted.add('chorus-whisper');
        for (const key of _duelLoops.keys()) if (!wanted.has(key)) stopDuelLoop(key);
        for (const key of wanted) startDuelLoop(key, key === 'eyebeam-loop' ? x : undefined, /boss-breath|arena-bed|egregor-idle/.test(key));
    }
    function stopDuelAudio() {
        _duelGeneration++; _duelPaused = false;
        for (const slot of Array.from(_duelVoices)) if (slot.cancel) slot.cancel();
        for (const key of Array.from(_duelLoops.keys())) stopDuelLoop(key);
        _duelVoiceUntil = _duelCueUntil = 0; _duelPriority();
        for (const key of Object.keys(_duelLast)) delete _duelLast[key];
    }
    function setDuelGroupVolume(group, value) {
        if (!(group in _duelGroupVolumes)) return;
        _duelGroupVolumes[group] = Math.max(0, Math.min(1, value));
        for (const slot of _duelLoops.values()) _duelLoopVolume(slot);
    }
    function setDuelAmbienceEnabled(value) {
        _duelAmbience = !!value;
        try { localStorage.setItem('duelAmbienceEnabled', String(_duelAmbience)); } catch (_) {}
        if (!_duelAmbience) for (const [key, slot] of _duelLoops) if (slot.ambient) stopDuelLoop(key);
    }
    // Read-only view of which sustained loops are running right now and at what gain, for audits and tests.
    function debugLoops() {
        const names = ['ambientEl', 'engineEl', 'lowHpEl', 'menuSpaceEl', 'laserEl', 'chargingEl', 'skillFChargeEl', 'skillFFireEl', 'skillGLoopEl', 'crawlEl', 'bgmEl'];
        const out = {};
        for (const n of names) out[n.replace(/El$/, '')] = !!(state[n] && !state[n].paused);
        out.duelLoops = Array.from(_duelLoops.keys());
        out.timeFrozen = !!_timeFrozen;
        out.limiterReduction = _masterLimiter ? _masterLimiter.reduction : 0;
        out.muted = !!state.muted;
        out.volumes = { sfx: state.vol.sfx, global: state.vol.global, ambientGain: sfxGain('ambient'), engineGain: sfxGain('engine'), lowHpGain: sfxGain('low-hp') };
        return out;
    }
    function getDuelAudioStatus() {
        return { active: _duelActive, paused: _duelPaused, voices: _duelVoices.size, liveVoices: _liveVoices, maxVoices: MAX_SFX_VOICES,
            loops: Array.from(_duelLoops.keys()), decoded: DUEL_SOUNDS.filter(s => _decodedBuffers['assets/audio/sfx/' + s.key + '.mp3']).length,
            voiceDuck: !!(actx && _duelVoiceUntil > actx.currentTime), cueDuck: !!(actx && _duelCueUntil > actx.currentTime),
            mix: actx ? { normal: _duelSfxBus.gain.value, cue: _duelCueBus.gain.value, music: _duelMusicBus.gain.value, limiterRatio: _masterLimiter.ratio.value } : null,
            rounds: { ..._duelRound }, groups: { ..._duelGroupVolumes } };
    }

    function playSfx(key) {
        if (_duelSounds[key] || _duelFamilies[key]) return playDuelSfx(key);
        if (key.startsWith('tut-')) return playTutorialSfx(key);
        if (key === 'evolve-reveal') key = 'egregor-tempest-portal';
        if (_timeFrozen) return;
        const p = state.pool[key];
        if (!p) return;
        if (_sfxTooSoon(key)) return;
        const g = sfxGain(key);
        if (g <= 0) return;
        if (key.startsWith('ammit-')) return _playAmmitCue(p.src, g, p.bypass, true);
        return _playVoice(p.src, g, p.bypass, false, !!p.optional);
    }

    const tutorialLast = new Map();
    let tutorialGeneration = 0;
    function prepareTutorialSfx() {
        for (const key of Object.keys(state.pool)) if (key.startsWith('tut-') || TUTORIAL_KANADE.includes(key)) _decodeBuffer(state.pool[key].src);
    }

    function playTutorialSfx(key) {
        if (!actx || _timeFrozen || _hardPaused || state.muted) return;
        const spec = TUTORIAL_OPTIONAL[key], group = spec?.group || (key.startsWith('tut-type-') ? 'type' : 'scene');
        const src = spec ? 'assets/audio/sfx/' + key + '.mp3' : state.pool[key]?.src;
        if (!src) return;
        const now = actx.currentTime, elapsed = now - (tutorialLast.get(key) ?? -Infinity);
        const minimum = group === 'type' ? .035 : group === 'targets' || group === 'menu' ? .11 : .07;
        if (elapsed < minimum) return;
        tutorialLast.set(key, now);
        const generation = tutorialGeneration;
        function start(sound) {
            if (!sound || generation !== tutorialGeneration || _timeFrozen || _hardPaused) return;
            let total = 0, inGroup = 0;
            for (const slot of _ammitCues) if (slot.active && slot.tutorial) { total++; if (slot.tutorialGroup === group) inGroup++; }
            const limit = group === 'type' || group === 'dialogue' ? 2 : group === 'scene' ? 5 : 3;
            const gain = sfxGain(key);
            if (gain <= 0 || total >= 8 || inGroup >= limit) return;
            return _playAmmitCue(sound, gain, true, true, { group, key });
        }
        if (!spec?.optional || _decodedBuffers[src]) return start(src);
        const requestedAt = performance.now();
        _decodeBuffer(src, true).then(buffer => {
            if (performance.now() - requestedAt <= 300) start(buffer ? src : state.pool[spec.fallback]?.src);
        });
    }
    function stopTutorialSfx() {
        tutorialGeneration++;
        for (let i = 0; i < _ammitCues.length; i++) if (_ammitCues[i].tutorial) _ammitStopCue(_ammitCues[i]);
        tutorialLast.clear();
    }

    function playSfxAt(key, x, y, phase, boost) {
        if (_duelSounds[key] || _duelFamilies[key]) return playDuelSfx(key, x, y, phase, boost);
        if (_timeFrozen) return;
        const p = state.pool[key];
        if (!p) return;
        const cue = BOSS_CUE_SFX.has(key);
        const g = sfxGain(key) * (cue ? 1 : _distanceGain(x, y));
        if (g <= 0.005) return;
        if (_sfxTooSoon(key)) return;
        if (key.startsWith('ammit-')) return _playAmmitCue(p.src, g, p.bypass, !cue);
        return _playVoice(p.src, g, p.bypass, !cue, !!p.optional, typeof x === 'number' ? x : null);
    }

    // Voice announcer sequences. Several clips (an alert chime and the fragments of one sentence) are
    // scheduled end to end on the audio clock, so the whole sentence plays gap free at any frame rate.
    // Each part is [file name without extension, silence in seconds after it].
    const VOICE_DIR = 'assets/audio/voice/ship/';
    const VOICE_SEQUENCES = {
        contact: { parts: [['vo-chime', 0.15], ['vo-contact-1', 0.3], ['vo-contact-2', 0.6], ['vo-contact-3', 0]], fallbackSec: 6.3 }
    };
    SFX_BASE['vo-chime'] = 0.7;
    // The opening warning starts with one loud chime. Offsets are seconds from the start of the sequence; the
    // opening screen reads them too so its red pulses land on each chime.
    const ALARM_FIRST_CHIME_BOOST = 1.6;
    // a ship alarm: after the loud first chime the same chime repeats at a fixed interval until the opening ends
    const ALARM_TING_INTERVAL = 0.8;
    const ALARM_TING_TIMES = Array.from({ length: 14 }, (_, i) => (i + 1) * ALARM_TING_INTERVAL);
    function getAlarmTingTimes() { return ALARM_TING_TIMES.slice(); }
    SFX_BASE['vo-voice'] = 1.0;
    // These lines are recorded at the same level as the contact voice, so they play at its gain (the set clear line is
    // a little lower because it comes up every time an attack set is broken)
    SFX_BASE['vo-setclear'] = 0.85;
    SFX_BASE['vo-phase2'] = 1.0;
    SFX_BASE['vo-phase3'] = 1.0;
    SFX_BASE['vo-lowhp5'] = 1.0;
    SFX_BASE['vo-lowhp3'] = 1.0;
    SFX_BASE['vo-failed'] = 1.0;
    // the victory report is mastered at the defeat voice level; the music under it sits 8 dB lower in the file itself
    Object.assign(SFX_BASE, { 'vo-victory': 1.0, 'duel-victory-bloom': 1.0, 'duel-victory-seal': 1.0, 'duel-victory-fanfare': 1.0, 'duel-victory-afterglow': 1.0 });
    function _voicePartSrc(name) { return VOICE_DIR + name + '.mp3'; }
    // Total length in seconds. Uses the real decoded lengths once they are known, else the measured fallback.
    function getVoiceSequenceDuration(id) {
        const seq = VOICE_SEQUENCES[id];
        if (!seq) return 0;
        let total = 0;
        for (let i = 0; i < seq.parts.length; i++) {
            const buf = _decodedBuffers[_voicePartSrc(seq.parts[i][0])];
            if (!buf) return seq.fallbackSec;
            total += buf.duration + seq.parts[i][1];
        }
        return total;
    }
    // Decoded buffers and scheduled playback share the same part boundaries.
    function getVoiceSequenceOffset(id, partIndex) {
        const seq = VOICE_SEQUENCES[id];
        if (!seq) return 0;
        const index = Math.max(0, Math.min(seq.parts.length, partIndex | 0));
        const fallback = id === 'contact' ? [0, 0.62, 1.63, 4.73, 6.22] : null;
        let offset = 0;
        for (let i = 0; i < index; i++) {
            const buffer = _decodedBuffers[_voicePartSrc(seq.parts[i][0])];
            if (!buffer) return fallback ? fallback[index] : seq.fallbackSec;
            offset += buffer.duration + seq.parts[i][1];
        }
        return offset;
    }
    function prepareVoiceSequence(id) {
        const seq = VOICE_SEQUENCES[id];
        if (!seq) return Promise.resolve();
        return Promise.all(seq.parts.map(p => _decodeBuffer(_voicePartSrc(p[0])))).then(() => {});
    }
    // Returns { duration, cancel(fadeSec) }. A missing file or a muted game plays nothing and never throws.
    function playVoiceSequence(id) {
        const seq = VOICE_SEQUENCES[id];
        const handle = { duration: getVoiceSequenceDuration(id), startedAt: null, partOffsets: null, cancel() {} };
        if (!seq || !actx || state.muted) return handle;
        let cancelled = false;
        const live = [];
        let duckUntil = 0;
        Promise.all(seq.parts.map(p => _decodeBuffer(_voicePartSrc(p[0])))).then(bufs => {
            if (cancelled || bufs.some(b => !b)) return;
            let when = actx.currentTime + 0.05;
            handle.startedAt = performance.now() + 50;
            handle.partOffsets = Array.from({ length: seq.parts.length + 1 }, (_, i) => getVoiceSequenceOffset(id, i));
            let total = 0;
            const sequenceStart = when;
            for (let i = 0; i < bufs.length; i++) {
                const g = actx.createGain();
                g.gain.value = i === 0 ? sfxGain('vo-chime') * (id === 'contact' ? ALARM_FIRST_CHIME_BOOST : 1) : sfxGain('vo-voice');
                g.connect(_bypassGain);
                const node = actx.createBufferSource();
                node.buffer = bufs[i];
                node.connect(g);
                node.start(when);
                node.onended = () => { try { g.disconnect(); } catch (_) {} };
                live.push({ node, g });
                const step = bufs[i].duration + seq.parts[i][1];
                when += step;
                total += step;
            }
            if (id === 'contact') {
                for (let k = 0; k < ALARM_TING_TIMES.length; k++) {
                    const level = .85;
                    const g = actx.createGain();
                    g.gain.value = sfxGain('vo-chime') * level;
                    g.connect(_bypassGain);
                    const node = actx.createBufferSource();
                    node.buffer = bufs[0];
                    node.connect(g);
                    node.start(sequenceStart + ALARM_TING_TIMES[k]);
                    node.onended = () => { try { g.disconnect(); } catch (_) {} };
                    live.push({ node, g });
                }
            }
            handle.duration = total;
            _duelDuck('voice', total + .05);
            duckUntil = _duelVoiceUntil;
        });
        handle.cancel = function (fadeSec) {
            cancelled = true;
            if (duckUntil > 0 && _duelVoiceUntil === duckUntil) { _duelVoiceUntil = 0; _duelPriority(); }
            const fade = fadeSec > 0 ? fadeSec : 0;
            for (let i = 0; i < live.length; i++) {
                try {
                    if (fade > 0) {
                        const t = actx.currentTime;
                        live[i].g.gain.setValueAtTime(live[i].g.gain.value, t);
                        live[i].g.gain.linearRampToValueAtTime(0, t + fade);
                        live[i].node.stop(t + fade + 0.01);
                    } else live[i].node.stop();
                } catch (_) {}
            }
        };
        return handle;
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
        // a loop stopped on purpose must not come back when a pause that saw it playing ends
        if (_pauseSnapshot) { const k = refKey.replace(/El$/, ''); if (k in _pauseSnapshot) _pauseSnapshot[k] = false; }
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
    // The pause screen also suspends the whole audio context, so nothing started by any path (voice lines, sound
    // tails, loops no list knows about) can be heard while the game is paused. The short delay lets the loops
    // that were just stopped finish their fade first.
    let _hardPaused = false;
    function _wakeAudio() {
        if (!_hardPaused) return;
        _hardPaused = false;
        if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
    }
    function pauseAll(hardSilence) {
        if (hardSilence && actx && !_hardPaused) {
            _hardPaused = true;
            setTimeout(() => { if (_hardPaused && actx.state === 'running') actx.suspend().catch(() => {}); }, 80);
        }
        if (_duelActive) { stopDuelAudio(); _duelPaused = true; }
        _pauseAmmitCues();
        const _earlier = _pauseSnapshot;
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
        // a second pause while already paused sees every loop stopped, so it keeps what the first one saw
        if (_earlier) for (const k of Object.keys(_pauseSnapshot)) if (_earlier[k]) _pauseSnapshot[k] = true;
        [state.bgmEl, state.ambientEl, state.kanadeAmbienceEl, state.kanadeCollapseEl, state.kanadeMusicEl, state.menuSpaceEl, state.engineEl, state.laserEl, state.chargingEl, state.skillGLoopEl, state.skillDChargeEl, state.skillFChargeEl, state.skillFFireEl, state.blackholeEl, state.maouHakiEl, state.lowHpEl, state.nullSlashWindupEl, state.crawlEl, state.photokrystosIdleEl, state.goliathIdleEl, state.goliathVerdictChargeEl, state.cancerWhirlpoolEl, state.leviathanIdleEl, state.ammitIdleEl, state.thaelisIdleEl, state.thaelisGearEl, state.thaelisWeaponEl, state.urielIdleEl, state.urielSwordHoverEl, state.raphaelIdleEl]
            .forEach(el => { if (el) { try { el.pause(); } catch (_) {} } });
    }
    function resumeAll() {
        _wakeAudio();
        _duelPaused = false;
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
            ? BGM_LIST.filter(t => !t.menuOnly && !t.duelOnly && state.selectedBgmIds.includes(t.id))
            : BGM_LIST.filter(t => !t.menuOnly && !t.duelOnly);
        const pool = base.filter(t => t.id !== state.currentBgmId);
        if (pool.length === 0) return base[0] || BGM_LIST.find(t => !t.menuOnly && !t.duelOnly);
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
        const track = BGM_LIST.find(t => t.id === id && !t.menuOnly && !t.duelOnly);
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
        _bgmRamp++;
        state.bgmEl.pause();
        // Menu has only one track (loops itself forever). In-game tracks
        // shouldn't loop the same song all match , advance to a new random
        // in-game track instead once this one finishes.
        state.bgmEl.setSrc(track.src, !!(track.menuOnly || track.duelOnly));
        state.bgmEl.volume = bgmGain();
        state.currentBgmId = track.id;
        if (!track.menuOnly && !track.duelOnly) {
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
    // on disk, and _bufferCache never expires on its own , over a long
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
        for (const slot of _ammitCues) if (slot.active && slot.tutorial && slot.tutorialKey) {
            slot.volume = sfxGain(slot.tutorialKey);
            if (slot.gain) slot.gain.gain.value = slot.volume;
        }
        for (const slot of _duelLoops.values()) _duelLoopVolume(slot);
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

    // Ambient / engine helpers , start on game entry, stop on exit.
    // Brings the space ambience and the engine back if something left them stopped during a run.
    function ensureRunLoops() {
        if (state.muted || _timeFrozen) return;
        if (state.ambientEl && state.ambientEl.paused) startAmbient();
        if (state.engineEl && state.engineEl.paused) startEngine();
    }
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
    // a single looping buffer node just works , tick* are kept as no-op
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
    // 3 quiet loops of different lengths so they drift apart and the bed never repeats as one
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
    function startLowHp() { startLoop('lowHpEl', 'low-hp'); enterDuck(_duelActive ? 'duelLowHp' : 'lowhp'); }
    function stopLowHp()  { stopLoop('lowHpEl'); exitDuck('lowhp'); exitDuck('duelLowHp'); }
    // True when the heartbeat should be sounding but its loop is not running (a pause or a time stop dropped it)
    function lowHpNeedsRestart() { return !!(actx && state.lowHpEl && state.lowHpEl.paused && !state.muted && !_timeFrozen && !_hardPaused && !_pauseSnapshot); }

    // Prepare common cues and register the remaining sounds for their encounters.
    function _boot() {
        state.bgmEl = _makeBufferLoop(false, _duelMusicBus); // src set per-track in _switchBgm
        // Kick off the menu track's decode immediately on page load instead
        // of waiting for the "click anywhere to start" gesture , decoding a
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
        _makePool('ty-serpent-cry', 'assets/audio/sfx/ty-serpent-cry.mp3', 1, false, true);
        _makePool('mui-warden-cry', 'assets/audio/sfx/mui-warden-cry.mp3', 1, false, true);
        _makePool('mui-legion-call', 'assets/audio/sfx/mui-legion-call.mp3', 1, true, true);
        _makePool('mui-legion-burst', 'assets/audio/sfx/mui-legion-burst.mp3', 1, false, true);
        _makePool('mui-array-open', 'assets/audio/sfx/mui-array-open.mp3', 1, false, true);
        _makePool('mui-blade-summon', 'assets/audio/sfx/mui-blade-summon.mp3', 4, false, true);
        _makePool('mui-blade-launch', 'assets/audio/sfx/mui-blade-launch.mp3', 4, false, true);
        _makePool('mui-iron-block', 'assets/audio/sfx/mui-iron-block.mp3', 3, false, true);
        _makePool('mui-legion-end', 'assets/audio/sfx/mui-legion-end.mp3', 1, false, true);
        _makePool('mui-qi-ready', 'assets/audio/sfx/mui-qi-ready.mp3', 1, false, true);
        _makePool('mui-root-bind', 'assets/audio/sfx/mui-root-bind.mp3', 3, false, true);
        _makePool('mui-blade-hit', 'assets/audio/sfx/mui-blade-hit.mp3', 4, false, true);
        _makePool('mui-pool-echo', 'assets/audio/sfx/mui-pool-echo.mp3', 3, false, true);
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
        _makePool('thaelis-reborn', 'assets/audio/sfx/thaelis-reborn.mp3', 2);
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
        _makePool('vo-setclear', 'assets/audio/voice/ship/vo-setclear.mp3', 1, true);
        _makePool('vo-phase2', 'assets/audio/voice/ship/vo-phase2.mp3', 1, true);
        _makePool('vo-phase3', 'assets/audio/voice/ship/vo-phase3.mp3', 1, true);
        // bypass pools: the low health muffle filter never touches them
        _makePool('vo-lowhp5', 'assets/audio/voice/ship/vo-lowhp5.mp3', 1, true);
        _makePool('vo-lowhp3', 'assets/audio/voice/ship/vo-lowhp3.mp3', 1, true);
        _makePool('vo-failed', 'assets/audio/voice/ship/vo-failed.mp3', 1, true);
        _makePool('vo-victory', 'assets/audio/voice/ship/vo-victory.mp3', 1, true);
        for (const key of ['duel-victory-bloom', 'duel-victory-seal', 'duel-victory-fanfare', 'duel-victory-afterglow']) _makePool(key, 'assets/audio/sfx/' + key + '.mp3', 1, true);
        for (const sound of DUEL_SOUNDS) {
            const key = sound.key;
            SFX_BASE[key] = sound.group === 'ambience' ? .28 : sound.group === 'large' ? .82 : key.startsWith('boss-bullet') ? .28 : key.startsWith('graze') ? .12 : key.startsWith('boss-hit') ? .46 : sound.group === 'ui' ? .65 : .62;
            _makePool(key, 'assets/audio/sfx/' + key + '.mp3', 2, sound.group === 'large');
        }
        // Phase 1 idle set, set against the fight mix with the battle theme playing: the bed and murmur are the quiet
        // files, so they get the most lift; the breath and one-shots peak close to full scale, so only a little (the master
        // limiter catches the rest)
        Object.assign(SFX_BASE, { 'egregor-idle-p1-bed': 2.8, 'egregor-idle-p1-breath': 1.8, 'egregor-idle-p1-murmur': 2.6,
            'egregor-idle-p1-growl-a': 1.45, 'egregor-idle-p1-growl-b': 1.3, 'egregor-idle-p1-coo-a': 1.3, 'egregor-idle-p1-coo-b': 1.3, 'egregor-idle-p1-roar': 1.4 });
        // phases 2 and 3 were levelled to the phase 1 files, so they take the same gains; the second form's short click needs a little more
        for (const p of [2, 3]) for (const k of Object.keys(SFX_BASE).filter(k => k.startsWith('egregor-idle-p1-'))) SFX_BASE[k.replace('-p1-', '-p' + p + '-')] = SFX_BASE[k];
        SFX_BASE['egregor-idle-p2-coo-b'] = 1.7;
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
        prepareEnemy, prepareGameplay, prepareSigil, prepareDuel, prepareMenu,
        debugLoops, ensureRunLoops, playDuelSfx, startDuelLoop, stopDuelLoop, syncDuelLoops, stopDuelAudio, setDuelAudioActive,
        setDuelGroupVolume, setDuelAmbienceEnabled, getDuelAudioStatus,
        getDuelAmbienceEnabled: () => _duelAmbience,
        getDuelSounds: () => DUEL_SOUNDS.map(s => ({ ...s })),
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
        playSfx, playSfxAt, playTutorialSfx, stopTutorialSfx, prepareTutorialSfx,
        enterDuelEvolutionDuck: () => enterDuck('duelEvolution'),
        exitDuelEvolutionDuck: () => exitDuck('duelEvolution'),
        wakeAudio: _wakeAudio,
        playDuelOpeningMusic, stopDuelOpeningMusic, startDuelBattleTheme, stopDuelBattleTheme,
        getAlarmTingTimes,
        isAudioSuspendedByPause: () => _hardPaused,
        playVoiceSequence, getVoiceSequenceDuration, getVoiceSequenceOffset, prepareVoiceSequence,
        startAmbient, stopAmbient,
        startEngine,  stopEngine,
        startCharging, stopCharging,
        startSkillGLoop, stopSkillGLoop,
        startSkillDCharge, stopSkillDCharge,
        startSkillFCharge, stopSkillFCharge,
        startSkillFFire, stopSkillFFire,
        startDeathStar, stopDeathStar,
        startMaouHaki, stopMaouHaki,
        startLowHp, stopLowHp, lowHpNeedsRestart,
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
        enterMuiWindupDuck, exitMuiWindupDuck,
        unlockContext,
    };
})();
