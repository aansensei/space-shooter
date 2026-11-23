(function (root) {
    'use strict';

    const TAU = Math.PI * 2;
    const palettes = ['#7de8f4', '#d3a5ff', '#ffc18a'];
    const sprites = new Map();
    const plates = new Map();
    const clamp = value => Math.max(0, Math.min(1, value));
    const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
    const envelope = (time, start, end, fade = .25) => ease((time - start) / fade) * ease((end - time) / fade);

    function options() {
        const fx = window._fxOpts || {};
        return {
            particles: fx.particles !== false,
            glow: fx.glow !== false,
            motion: !fx.reducedMotion,
            low: typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2
        };
    }

    function sprite(key, width, height, paint) {
        if (!sprites.has(key)) {
            const layer = document.createElement('canvas');
            layer.width = width;
            layer.height = height;
            paint(layer.getContext('2d'), width, height);
            sprites.set(key, layer);
        }
        return sprites.get(key);
    }

    function plate(ctx, x, y, width, height, cut) {
        const key = [Math.ceil(width), Math.ceil(height), cut].join('/');
        let layer = plates.get(key);
        if (!layer) {
            layer = document.createElement('canvas');
            layer.width = Math.ceil(width) + 24; layer.height = Math.ceil(height) + 24;
            root.DuelTheme.drawObsidianPlate(layer.getContext('2d'), 12, 12, width, height, { cut, ember: 0 });
            if (plates.size >= 12) plates.delete(plates.keys().next().value);
            plates.set(key, layer);
        }
        ctx.drawImage(layer, x - 12, y - 12);
    }

    function halo(color) {
        return sprite('halo/' + color, 256, 256, (g, w, h) => {
            const light = g.createRadialGradient(128, 128, 0, 128, 128, 126);
            light.addColorStop(0, '#ffffff99');
            light.addColorStop(.15, color + '99');
            light.addColorStop(.5, color + '32');
            light.addColorStop(1, color + '00');
            g.fillStyle = light;
            g.fillRect(0, 0, w, h);
        });
    }

    function vignette() {
        return sprite('vignette', 512, 288, (g, w, h) => {
            const edge = g.createRadialGradient(w / 2, h * .43, h * .24, w / 2, h * .43, w * .54);
            edge.addColorStop(0, '#05071000');
            edge.addColorStop(.6, '#130d2538');
            edge.addColorStop(1, '#02040dee');
            g.fillStyle = edge; g.fillRect(0, 0, w, h);
        });
    }

    function bossMask(phase) {
        return sprite('boss/' + phase, 900, 700, g => {
            root.drawDuelEgregor(g, 450, 225, { phase, phaseMorph: phase - 1, time: 2.3, playerX: 450, playerY: 670 });
            g.globalCompositeOperation = 'source-in';
            g.fillStyle = palettes[phase - 1]; g.fillRect(0, 0, 900, 700);
            g.globalCompositeOperation = 'source-over';
        });
    }

    function glyphRing() {
        return sprite('ring', 420, 420, g => {
            g.translate(210, 210);
            g.strokeStyle = '#d6c3ef'; g.lineWidth = 1;
            for (const radius of [152, 174, 193]) {
                g.beginPath(); g.arc(0, 0, radius, 0, TAU); g.stroke();
            }
            for (let i = 0; i < 40; i++) {
                g.save(); g.rotate(i / 40 * TAU);
                const long = i % 5 === 0;
                g.beginPath(); g.moveTo(158, 0); g.lineTo(long ? 189 : 180, 0); g.stroke();
                if (long) {
                    g.beginPath(); g.moveTo(185, -5); g.lineTo(196, 0); g.lineTo(185, 5); g.stroke();
                }
                g.restore();
            }
        });
    }

    function glow(ctx, x, y, radius, color, alpha) {
        if (alpha <= 0 || radius <= 0) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(.85, alpha);
        ctx.drawImage(halo(color), x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();
    }

    function ring(ctx, x, y, radius, color, alpha, angle = 0, squash = 1) {
        if (alpha <= 0 || radius <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * squash, 0, 0, TAU); ctx.stroke();
        ctx.restore();
    }

    function runes(ctx, x, y, radius, alpha, rotation, squash = 1) {
        ctx.save(); ctx.translate(x, y); ctx.scale(1, squash); ctx.rotate(rotation);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.drawImage(glyphRing(), -radius, -radius, radius * 2, radius * 2);
        ctx.restore();
    }

    function stars(ctx, x, y, radius, time, pull, color, opts) {
        if (!opts.particles) return;
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1;
        const count = opts.low ? 14 : 42;
        for (let i = 0; i < count; i++) {
            const angle = i * 2.399963;
            const cycle = (i * .137 + time * .34) % 1;
            const distance = radius * (pull ? 1 - cycle : cycle);
            const length = (8 + cycle * 28) * (opts.motion ? 1 : .15);
            ctx.globalAlpha = Math.sin(cycle * Math.PI) * .65;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
            ctx.lineTo(x + Math.cos(angle) * (distance + length), y + Math.sin(angle) * (distance + length));
            ctx.stroke();
        }
        ctx.restore();
    }

    function fracture(ctx, x, y, radius, amount, color, time, opts) {
        if (amount <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
        for (let i = 0; i < (opts.low ? 5 : 11); i++) {
            const angle = i * 2.399963;
            ctx.beginPath(); ctx.moveTo(0, 0);
            for (let step = 1; step <= 6; step++) {
                const r = radius * step / 6 * amount;
                const a = angle + Math.sin(i * 9 + step * 4.1) * .16;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * .66);
            }
            ctx.strokeStyle = color; ctx.lineWidth = opts.glow ? 3 : 1.2;
            ctx.globalAlpha = amount * (opts.motion ? .55 + .1 * Math.sin(time * 8 + i) : .55);
            ctx.stroke();
            if (opts.glow && !opts.low) {
                ctx.strokeStyle = '#fffae8'; ctx.lineWidth = .75; ctx.globalAlpha *= .8; ctx.stroke();
            }
        }
        ctx.restore();
    }

    function letterbox(ctx, w, h, amount, color) {
        const size = h * .065 * clamp(amount);
        ctx.fillStyle = '#03040b'; ctx.fillRect(0, 0, w, size); ctx.fillRect(0, h - size, w, size);
        ctx.globalAlpha = clamp(amount) * .65; ctx.fillStyle = color;
        ctx.fillRect(0, size, w, 1); ctx.fillRect(0, h - size, w, 1); ctx.globalAlpha = 1;
    }

    function camera(ctx, w, h, x, y, zoom, tilt) {
        if (Math.abs(zoom - 1) < .001 && Math.abs(tilt) < .001) return;
        const frame = sprite('camera', 960, 540, () => {});
        const g = frame.getContext('2d');
        g.setTransform(frame.width / w, 0, 0, frame.height / h, 0, 0);
        g.clearRect(0, 0, w, h);
        g.fillStyle = '#030713'; g.fillRect(0, 0, w, h);
        for (const id of ['bgCanvas', 'pixiCanvas']) {
            const background = document.getElementById(id);
            if (background?.width && background?.height) g.drawImage(background, 0, 0, w, h);
        }
        g.drawImage(ctx.canvas, 0, 0, w, h);
        ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
        ctx.drawImage(frame, 0, 0, w, h); ctx.restore();
    }

    function label(ctx, text, x, y, size, color, title = false, maxWidth) {
        const theme = root.DuelTheme;
        ctx.font = title ? theme.getTitleFont(size, 700) : theme.getBodyFont(size, 600);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
        if (maxWidth) ctx.fillText(text, x, y, maxWidth);
        else ctx.fillText(text, x, y);
    }

    function prepareOpening(w, h) {
        openingAlarmVignette(); openingRay('#ffbd7d'); openingRay('#b18aff');
        dimensionImage(); dimensionFallback(); openingWound(); openingMist(); bossMask(1); glyphRing();
        for (const color of ['#66dfe9', '#ff7b7f', '#9162d8', '#ffc18a', '#ffce84', '#76dce9', '#fee0a2']) halo(color);
        sprite('opening/frame', 960, 540, () => {});
        const emergence = sprite('opening/emergence', w, h, () => {});
        if (emergence.width !== w || emergence.height !== h) { emergence.width = w; emergence.height = h; }
    }

    function openingClock(time, session) {
        const marks = session._openingVoiceMarks || [0, .62, 1.63, 4.73, 6.22];
        const voiced = session._openingVoiceStarted && !session._openingSkipped && Number.isFinite(session._openingVoiceStartedAt);
        const voice = voiced ? (performance.now() - session._openingVoiceStartedAt) / 1000 : -1;
        // the warning layers fade out over 0.3 s after the last mark instead of vanishing in one frame
        const alarm = voice >= marks[1] && voice < marks[3] + .3;
        const escalation = alarm ? ease((voice - marks[1]) / Math.max(.1, marks[3] - marks[1])) : 0;
        const tail = voice > marks[3] ? clamp((voice - marks[3]) / .3) : 0;
        return { marks, voice, alarm, escalation, tail, continuous: voiced ? voice + .9 : time };
    }

    function openingPose(w, h, time, session) {
        const target = session.bossPos || { x: w / 2, y: h * .18 };
        const giant = h * .76 / 240;
        const emerge = ease((Math.min(time, 4.67) - 3.8) / .82);
        const returnToField = ease((time - 4.83) / 1.37);
        const motion = !window._fxOpts?.reducedMotion;
        return {
            x: target.x,
            y: motion ? (h * .32 - h * .025 * emerge) * (1 - returnToField) + target.y * returnToField : target.y,
            scale: motion ? (giant * (.64 + emerge * .36)) * (1 - returnToField) + returnToField : 1,
            alpha: ease((time - 3.8) / .3),
            roar: motion ? envelope(time, 4.75, 6.15, .25) : 0,
            frozen: motion && time >= 4.67 && time < 4.75,
            settled: time >= 6.2
        };
    }

    function openingAlarmVignette() {
        return sprite('opening/red-edge', 512, 288, (g, w, h) => {
            const red = g.createRadialGradient(w / 2, h * .46, h * .19, w / 2, h * .46, w * .53);
            red.addColorStop(0, '#37051a00');
            red.addColorStop(.42, '#7e0b2232');
            red.addColorStop(.76, '#d5213c99');
            red.addColorStop(1, '#4b061cf2');
            g.fillStyle = red; g.fillRect(0, 0, w, h);
        });
    }

    function openingRay(color) {
        return sprite('opening/ray/' + color, 128, 512, (g, w, h) => {
            const ray = g.createLinearGradient(0, 0, 0, h);
            ray.addColorStop(0, color + 'c9');
            ray.addColorStop(.3, color + '55');
            ray.addColorStop(1, color + '00');
            g.fillStyle = ray;
            g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
            const soft=g.createLinearGradient(0,0,w,0);soft.addColorStop(0,'#0000');soft.addColorStop(.38,'#000b');soft.addColorStop(.5,'#000f');soft.addColorStop(.62,'#000b');soft.addColorStop(1,'#0000');
            g.globalCompositeOperation='destination-in';g.fillStyle=soft;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
        });
    }

    // The picture seen through the portal. A painted PNG replaces the generated fallback once it has loaded.
    const DIMENSION_SRC = 'assets/images/duel/egregor/opening-dimension.png';
    const dimensionArt = { state: 'idle', image: null };
    function dimensionImage() {
        if (dimensionArt.state === 'idle' && typeof Image !== 'undefined') {
            dimensionArt.state = 'loading';
            const img = new Image();
            img.onload = () => { dimensionArt.state = 'ready'; };
            img.onerror = () => { dimensionArt.state = 'missing'; dimensionArt.image = null; };
            img.src = DIMENSION_SRC;
            dimensionArt.image = img;
        }
        return dimensionArt.state === 'ready' ? dimensionArt.image : null;
    }

    function dimensionFallback() {
        return sprite('opening/dimension-fallback', 960, 600, (g, w, h) => {
            const base = g.createRadialGradient(w * .5, h * .5, 10, w * .5, h * .5, w * .62);
            base.addColorStop(0, '#2a1450'); base.addColorStop(.5, '#10082a'); base.addColorStop(1, '#04010c');
            g.fillStyle = base; g.fillRect(0, 0, w, h);
            g.globalCompositeOperation = 'lighter';
            const tints = ['#5b2a9e', '#1c6f86', '#a3416a', '#3d2f9a'];
            for (let i = 0; i < 16; i++) {
                const x = hash(i + 900) * w, y = hash(i + 940) * h, r = 120 + hash(i + 980) * 190;
                const cloud = g.createRadialGradient(x, y, 0, x, y, r);
                cloud.addColorStop(0, tints[i % 4] + '66'); cloud.addColorStop(1, tints[i % 4] + '00');
                g.fillStyle = cloud; g.fillRect(0, 0, w, h);
            }
            for (let arm = 0; arm < 3; arm++) {
                for (let i = 0; i < 150; i++) {
                    const t = i / 150, a = arm * TAU / 3 + t * 5.2, r = 14 + t * w * .46;
                    const x = w / 2 + Math.cos(a) * r + (hash(i * 3 + arm) - .5) * 34 * t;
                    const y = h / 2 + Math.sin(a) * r * .62 + (hash(i * 5 + arm) - .5) * 24 * t;
                    g.fillStyle = (i % 2 ? '#c9b2ff' : '#7fd8ee') + (hash(i + arm * 77) > .8 ? 'dd' : '55');
                    g.beginPath(); g.arc(x, y, .8 + hash(i + 31 * arm) * 2.2, 0, TAU); g.fill();
                }
            }
            const core = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 130);
            core.addColorStop(0, '#fff2d8cc'); core.addColorStop(.25, '#ffc18a55'); core.addColorStop(1, '#ffc18a00');
            g.fillStyle = core; g.fillRect(0, 0, w, h);
            for (let i = 0; i < 220; i++) {
                g.fillStyle = '#ffffff' + (hash(i + 5) > .85 ? 'ee' : '66');
                g.fillRect(hash(i + 1400) * w, hash(i + 1700) * h, 1 + hash(i + 2) * 1.6, 1 + hash(i + 3) * 1.6);
            }
        });
    }

    // Draws the dimension inside the portal ellipse: it turns slowly, a second copy drifts the other way for depth,
    // light streaks rush outward from the centre and a dark falloff near the rim gives the opening depth.
    function openingDimension(ctx, x, y, rx, ry, time, alpha, opts) {
        if (alpha <= .001) return;
        const art = dimensionImage() || dimensionFallback();
        const iw = art.naturalWidth || art.width, ih = art.naturalHeight || art.height;
        const drift = opts.motion ? time : 2.2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.clip();
        const cover = Math.max(rx * 2 / iw, ry * 2 / ih) * 1.4;
        ctx.save();
        ctx.translate(x + Math.sin(drift * .5) * rx * .03, y + Math.cos(drift * .4) * ry * .03);
        ctx.rotate(drift * .04); ctx.scale(cover * (1 + .04 * Math.sin(drift * .8)), cover * (1 + .04 * Math.sin(drift * .8)));
        ctx.drawImage(art, -iw / 2, -ih / 2);
        ctx.restore();
        if (!opts.low) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * .3;
            ctx.translate(x, y); ctx.rotate(-drift * .07); const deep = cover * 1.75;
            ctx.scale(deep, deep); ctx.drawImage(art, -iw / 2, -ih / 2);
            ctx.restore();
        }
        if (opts.particles) {
            ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
            const count = opts.low ? 12 : 30;
            for (let i = 0; i < count; i++) {
                const angle = hash(i + 61) * TAU, p = (drift * .55 + hash(i + 7)) % 1;
                const r0 = p * p, r1 = Math.min(1.05, p * p + .06 + p * .22);
                ctx.globalAlpha = alpha * Math.sin(p * Math.PI) * .55;
                ctx.strokeStyle = i % 3 ? '#cdb8ff' : '#ffd9a8'; ctx.lineWidth = .8 + p * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * rx * r0, Math.sin(angle) * ry * r0);
                ctx.lineTo(Math.cos(angle) * rx * r1, Math.sin(angle) * ry * r1);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(1, ry / rx);
        const fall = ctx.createRadialGradient(0, 0, rx * .45, 0, 0, rx);
        fall.addColorStop(0, '#02010800'); fall.addColorStop(.72, '#02010826'); fall.addColorStop(1, '#020108d0');
        ctx.fillStyle = fall; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
        ctx.restore();
    }

    function openingBackground(ctx, w, h, time, clock, opts) {
        const fade = 1 - ease((time - 6.25) / 1.05);
        if (fade <= .001) return;
        const frame = sprite('opening/frame', 960, 540, () => {});
        const g = frame.getContext('2d');
        g.setTransform(960 / w, 0, 0, 540 / h, 0, 0);
        g.fillStyle = '#040714'; g.fillRect(0, 0, w, h);
        for (const name of ['bgCanvas', 'pixiCanvas']) {
            const bg = document.getElementById(name);
            if (bg?.width) g.drawImage(bg, 0, 0, w, h);
        }
        const push = clock.alarm ? .055 * clock.escalation : time >= 2.2 ? .055 * (1 - ease((time - 2.2) / .7)) : 0;
        const zoom = opts.motion ? 1 + push + .22 * envelope(time, 2.2, 6.2, .9) : 1;
        ctx.save(); ctx.globalAlpha = fade;
        ctx.translate(w / 2, h * .31); ctx.scale(zoom, zoom); ctx.translate(-w / 2, -h * .31);
        ctx.drawImage(frame, 0, 0, w, h); ctx.restore();
        ctx.save(); ctx.globalAlpha = fade * (.10 + (clock.alarm ? .48 * clock.escalation : .36 * envelope(time, 2.2, 6.1, .6)));
        ctx.fillStyle = '#070617'; ctx.fillRect(0, 0, w, h); ctx.restore();
        const distortion = envelope(time, 2.25, 4.95, .5);
        if (!opts.low && opts.motion && opts.glow && distortion > .001) {
            ctx.save(); ctx.globalAlpha = distortion * .26;
            for (let i = 0; i < 12; i++) {
                const y = h * .08 + i * h * .042, band = h * .032;
                const offset = Math.sin(i * 2.1 + time * 11) * 7 * distortion;
                ctx.drawImage(frame, 0, y / h * 540, 960, band / h * 540, offset, y, w, band);
            }
            ctx.restore();
        }
    }

    function openingSystems(ctx, w, h, time, clock, opts) {
        const t = root.DuelUI.t, alpha = envelope(clock.continuous, .02, 2.6, .4);
        if (alpha <= 0) return;
        const x = w * .075, y = h * .69, font = Math.min(18, Math.max(14, h * .021));
        ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
            const active = ease((clock.continuous - .1 - i * .21) / .28);
            const ry = y + i * (font + 11);
            ctx.globalAlpha = active * alpha;
            ctx.strokeStyle = '#a2f5eb'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + 5, ry + 5); ctx.lineTo(x + 13, ry - 6); ctx.stroke();
            ctx.font = root.DuelTheme.getBodyFont(font, 600); ctx.fillStyle = '#b3e1df';
            ctx.fillText(t(['duel.fx.system', 'duel.fx.shield', 'duel.fx.armament'][i]), x + 25, ry);
        }
        const ship = typeof player !== 'undefined' ? player : { x: w / 2, y: h - 65 };
        ring(ctx, ship.x, ship.y, 62 + ease(clock.continuous / 1.3) * h * .22, '#82dfe9', alpha * .45, 0, .8);
        if (opts.glow) glow(ctx, ship.x, ship.y, 100, '#66dfe9', alpha * .25);
        ctx.restore();
    }

    function openingAlarm(ctx, w, h, clock, opts) {
        const { voice, marks, alarm, escalation: p } = clock;
        if (voice < 0) return;
        const t = root.DuelUI.t;
        if (voice < marks[1]) {
            const sweep = clamp(voice / Math.max(.01, marks[1]));
            ctx.save(); ctx.globalAlpha = Math.sin(sweep * Math.PI) * .55;
            ctx.fillStyle = '#aeeef7'; ctx.fillRect(0, h * (.13 + sweep * .63), w, opts.glow ? 3 : 1); ctx.restore();
        }
        if (!alarm) return;
        const alpha = ease((voice - marks[1]) / .12) * (1 - clock.tail);
        // every warning chime (the loud first one and the rising ones after it) throbs the red edge of the screen
        const tings = (root.AudioMgr && root.AudioMgr.getAlarmTingTimes) ? root.AudioMgr.getAlarmTingTimes() : [];
        let pulse = Math.exp(-voice * 7);
        for (let i = 0; i < tings.length; i++) if (voice >= tings[i]) pulse = Math.max(pulse, Math.exp(-(voice - tings[i]) * 7));
        if (!opts.motion) pulse *= .3;
        ctx.save();
        ctx.globalAlpha = alpha * (opts.motion ? .65 + .14 * Math.sin(voice * 10) : .7 + p * .15);
        ctx.drawImage(openingAlarmVignette(), 0, 0, w, h);
        ctx.strokeStyle = '#ff3b52'; ctx.lineWidth = 4 + p * 4 + pulse * 6; ctx.strokeRect(5, 5, w - 10, h - 10);
        ctx.globalAlpha = alpha * pulse * .2; ctx.fillStyle = '#ff1c3a'; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = alpha;
        const y = h * .405, size = Math.min(116, h * .143), title = t('duel.opening.warning');
        const jitter = opts.motion && window._screenShakeEnabled !== false ? Math.sin(voice * 58) * (1 + p * 1.6) : 0;
        if (!opts.low && opts.motion && opts.glow) {
            ctx.globalAlpha = alpha * .55;
            label(ctx, title, w / 2 + jitter - 3, y, size, '#7a0016', true, w * .85);
            label(ctx, title, w / 2 + jitter + 3, y + 1, size, '#ff9a8a', true, w * .85);
        }
        ctx.globalAlpha = alpha;
        label(ctx, title, w / 2 + jitter, y, size, '#ff4457', true, w * .85);
        const message = t('duel.opening.warningSub');
        const count = Math.floor(clamp((voice - marks[2]) / Math.max(.1, marks[3] - marks[2] - .3)) * message.length);
        label(ctx, message.slice(0, count), w / 2, y + size * .72, Math.max(15, h * .024), '#f3b6bd', false, w * .82);
        label(ctx, t('duel.opening.calamity'), w / 2, h * .59, Math.max(13, h * .022), '#ffd9a1');
        label(ctx, t('duel.fx.range') + ' ' + Math.round(64000 * (1 - p) + 180).toLocaleString() + ' km',
            w * .22, h * .66, Math.max(13, h * .02), '#f0b9bc');
        label(ctx, t('duel.fx.mass') + ' ' + Math.round(4700000 * p).toLocaleString(),
            w * .78, h * .66, Math.max(13, h * .02), '#f0b9bc');
        if (opts.motion) {
            ctx.globalAlpha = .18 * alpha; ctx.fillStyle = '#e98a96';
            const scanY = h * (.18 + (voice * .29 % .63)); ctx.fillRect(w * .06, scanY, w * .88, 2);
        }
        ctx.restore();
    }

    function openingGravity(ctx, w, h, time, clock, opts) {
        const warning = clock.alarm ? clock.escalation : 0;
        const released = ease((time - 2.2) / .9);
        const fade = 1 - ease((time - 5.1) / 1.2);
        if ((!clock.alarm && time < 2.2) || fade <= 0) return;
        const x = w / 2, y = h * .31, continuous = opts.motion ? clock.continuous : 1.4;
        const intensity = Math.max(warning, released) * fade;
        const rays = opts.low ? 3 : 8;
        if (opts.glow) for (let i = 0; i < rays; i++) {
            ctx.save(); ctx.translate(x, y);
            ctx.rotate((i / rays) * TAU + (opts.motion ? Math.sin(continuous * .18 + i) * .2 : 0));
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = intensity * (i % 2 ? .38 : .24);
            ctx.drawImage(openingRay(i % 2 ? '#ffbd7d' : '#b18aff'), -w * .07, 0, w * .14, h * 1.05);
            ctx.restore();
        }
        if (opts.particles) {
            ctx.save(); ctx.strokeStyle = '#dfc4f1';
            for (let i = 0; i < (opts.low ? 24 : 78); i++) {
                const angle = i * 2.399963, cycle = (i * .137 + continuous * (.16 + warning * .35)) % 1;
                const radius = (1 - cycle) * Math.max(w, h) * .73;
                const length = opts.motion ? 8 + (warning + released) * 60 : 4;
                ctx.globalAlpha = Math.sin(cycle * Math.PI) * intensity * .68; ctx.lineWidth = 1 + i % 3 * .35;
                ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * .75);
                ctx.lineTo(x + Math.cos(angle) * (radius + length), y + Math.sin(angle) * (radius + length) * .75); ctx.stroke();
            }
            ctx.restore();
        }
        if (clock.alarm) {
            const contactY = h * (.12 + warning * .15);
            if (opts.glow) glow(ctx, x, contactY, 45 + warning * 75, '#ff7b7f', .48 * intensity);
            ring(ctx, x, contactY, 8 + warning * 33, '#ffc1a9', .8 * intensity);
            for (let i = 0; i < 3; i++) {
                const wave = opts.motion ? (clock.voice * .48 + i * .32) % 1 : i * .25;
                ring(ctx, x, contactY, 22 + wave * w * .22, '#e6758b', (1 - wave) * .34 * intensity, 0, .55);
            }
        }
    }

    function openingWound() {
        return sprite('opening/wound-r4',1024,640,(g,w,h)=>{
            g.translate(w/2,h/2);
            const path=(scale)=>{g.beginPath();for(let i=0;i<=160;i++){const a=i/160*TAU,r=1+.025*Math.sin(i*1.73)+.018*Math.sin(i*3.31);const x=Math.cos(a)*w*.43*r*scale,y=Math.sin(a)*h*.36*r*scale;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.closePath();};
            const voidFill=g.createRadialGradient(0,-15,5,0,0,w*.47);
            voidFill.addColorStop(0,'#03030b00');voidFill.addColorStop(.7,'#12081800');voidFill.addColorStop(.92,'#1a0c1a77');voidFill.addColorStop(1,'#97694bcc');
            path(1);g.fillStyle=voidFill;g.fill();g.strokeStyle='#06050c';g.lineWidth=26;g.stroke();
            path(1.015);g.strokeStyle='#614232';g.lineWidth=10;g.stroke();
            path(1.025);g.strokeStyle='#d4a473';g.lineWidth=2;g.stroke();
            path(.973);g.strokeStyle='#9166b1';g.lineWidth=3;g.stroke();
            for(let i=0;i<75;i++){const angle=i*TAU/75,r=1.02+hash(i+500)*.06;
                const x=Math.cos(angle)*w*.43*r,y=Math.sin(angle)*h*.36*r;
                g.strokeStyle=i%3?'#b28a5e':'#9b76bb';g.globalAlpha=.25+hash(i+502)*.45;g.lineWidth=.8+hash(i)*1.5;
                g.beginPath();g.moveTo(x,y);g.lineTo(x*Math.max(.78,1-hash(i+503)*.2),y*(.85+hash(i+506)*.1));g.stroke();
            }
            g.globalAlpha=.7;g.strokeStyle='#d0ad7c';g.lineWidth=1.2;
            for(let i=0;i<18;i++){const angle=i*TAU/18;g.save();g.translate(Math.cos(angle)*w*.46,Math.sin(angle)*h*.405);g.rotate(angle+Math.PI/2);
                g.beginPath();g.moveTo(-4,-4);g.lineTo(0,4);g.lineTo(4,-4);g.moveTo(-4,0);g.lineTo(4,0);g.stroke();g.restore();}
        });
    }

    function openingPortal(ctx, w, h, time, clock, opts) {
        const progress = ease((time - 2.2) / 1.05);
        const fade = 1 - ease((time - 4.83) / .95);
        if (progress <= 0 || fade <= 0) return;
        const x = w / 2, y = h * .31, radius = w * .335 * progress, ry = h * .255 * progress;
        ctx.save(); ctx.globalAlpha = fade;
        ctx.fillStyle = '#04010b'; ctx.beginPath(); ctx.ellipse(x, y, radius, ry, 0, 0, TAU); ctx.fill();
        if (opts.glow) {
            glow(ctx, x, y, radius * 1.25, '#9162d8', fade * .52);
            glow(ctx, x, y + ry * .6, radius * .65, '#ffc18a', fade * .27);
        }
        openingDimension(ctx, x, y, radius * .99, ry * .99, time, fade * ease((time - 2.35) / .55), opts);
        ctx.save();ctx.globalAlpha=fade;
        ctx.drawImage(openingWound(),x-radius*1.19,y-ry*1.39,radius*2.38,ry*2.78);
        ctx.restore();
        ctx.globalAlpha = fade * envelope(time, 2.2, 3.45, .25);
        ctx.strokeStyle = '#fff0d2'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
            const px = x + (i / 20 - .5) * w * .76 * progress;
            const py = y + (i % 2 ? 1 : -1) * h * .012 * progress;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
    }

    // Each tentacle is a bezier spine given in portal units (x by the portal half width, y by its half height) that
    // reaches out of the dimension, over the rim and curls toward the ship. The body is rebuilt every frame from
    // sampled spine points so it can taper to a point, sway along its length and carry a row of suckers.
    const TENTACLES = [
        { side: -1, p: [[.28, -.1], [.95, -1.25], [1.5, .1], [1.05, 1.7]], girth: .047, phase: 0 },
        { side: 1, p: [[.28, -.1], [.95, -1.25], [1.5, .1], [1.05, 1.7]], girth: .047, phase: 1.7 },
        { side: -1, p: [[.1, .35], [.55, 1.15], [1.15, 1.2], [1.4, 2.05]], girth: .032, phase: 3.1 },
        { side: 1, p: [[.1, .35], [.55, 1.15], [1.15, 1.2], [1.4, 2.05]], girth: .032, phase: 4.4 }
    ];

    function openingLimbs(ctx, w, h, time, opts) {
        const grip = envelope(time, 3.25, 5.35, .45);
        if (grip <= 0) return;
        const open = ease((time - 2.2) / 1.05);
        const cx = w / 2, cy = h * .31, rx = w * .335 * open, ry = h * .255 * open;
        const samples = opts.low ? 18 : 32;
        const list = opts.low ? TENTACLES.slice(0, 2) : TENTACLES;
        list.forEach((spec, index) => {
            const reach = ease((time - 3.15 - index * .1) / .85);
            if (reach <= .01) return;
            const pt = spec.p.map(([px, py]) => [cx + spec.side * px * rx, cy + py * ry]);
            const bez = u => {
                const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
                return [a * pt[0][0] + b * pt[1][0] + c * pt[2][0] + d * pt[3][0], a * pt[0][1] + b * pt[1][1] + c * pt[2][1] + d * pt[3][1]];
            };
            const left = [], right = [], spine = [];
            const sway = opts.motion ? 1 : 0, base = h * spec.girth;
            for (let i = 0; i <= samples; i++) {
                const t = i / samples, u = t * reach, p = bez(u), q = bez(Math.min(1, u + .01));
                let nx = -(q[1] - p[1]), ny = q[0] - p[0];
                const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
                const wave = Math.sin(time * 2.3 + t * 5.5 + spec.phase) * h * .016 * t * sway;
                const x = p[0] + nx * wave, y = p[1] + ny * wave;
                const width = base * (1 - t * .94) * (.45 + .55 * ease(t / .16)) * (.6 + .4 * Math.min(1, reach * 2));
                spine.push([x, y, nx, ny, width, t]);
                left.push([x + nx * width, y + ny * width]); right.push([x - nx * width, y - ny * width]);
            }
            ctx.save(); ctx.globalAlpha = grip * .96;
            const head = spine[0], tip = spine[spine.length - 1];
            const skin = ctx.createLinearGradient(head[0], head[1], tip[0], tip[1]);
            skin.addColorStop(0, '#06141b'); skin.addColorStop(.5, '#1d5560'); skin.addColorStop(1, '#2b8089');
            ctx.fillStyle = skin; ctx.strokeStyle = '#7fc2c9'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
            for (const [x, y] of left) ctx.lineTo(x, y);
            for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
            ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.arc(head[0], head[1], head[4], 0, TAU); ctx.fill();
            ctx.globalAlpha = grip * .55; ctx.stroke(); ctx.globalAlpha = grip * .96;
            ctx.strokeStyle = '#a8e4e6'; ctx.lineWidth = 1; ctx.globalAlpha = grip * .22;
            ctx.beginPath(); spine.forEach(([x, y, nx, ny, wd], i) => { const px = x + nx * wd * .35, py = y + ny * wd * .35; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
            ctx.stroke(); ctx.globalAlpha = grip * .96;
            for (let i = 3; i < spine.length - 2; i += 2) {
                const [x, y, nx, ny, wd, t] = spine[i], r = Math.max(1.2, wd * .3);
                const sx = x + nx * wd * .38 * spec.side, sy = y + ny * wd * .38 * spec.side;
                ctx.fillStyle = '#9bc9c8'; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * .82, 0, 0, TAU); ctx.fill();
                ctx.fillStyle = '#0a1a22'; ctx.beginPath(); ctx.ellipse(sx, sy, r * .5, r * .42, 0, 0, TAU); ctx.fill();
                if (opts.glow && i % 4 === 3) glow(ctx, sx, sy, r * 4, '#76dce9', grip * (.18 + .12 * Math.sin(time * 5 + i)));
            }
            if (opts.glow) glow(ctx, tip[0], tip[1], base * 1.6, '#9bf0ff', grip * .35 * reach);
            ctx.restore();
        });
    }

    // Crackling energy crawls around the rim, debris is thrown out of the dimension toward the screen and shock
    // rings roll outward when the portal tears open, when the limbs grip and when the Egregor arrives.
    function openingPortalFx(ctx, w, h, time, opts) {
        const open = ease((time - 2.2) / 1.05), fade = 1 - ease((time - 4.83) / .95);
        if (open <= .01 || fade <= .01) return;
        const cx = w / 2, cy = h * .31, rx = w * .335 * open, ry = h * .255 * open;
        ctx.save(); ctx.globalAlpha = fade;
        for (const start of [2.2, 3.4, 3.85]) {
            const p = (time - start) / .95;
            if (p > 0 && p < 1) ring(ctx, cx, cy, rx * (1.02 + p * .55), start === 3.85 ? '#ffd9a8' : '#cdb6ff', (1 - p) * .55, 0, ry / rx);
        }
        if (opts.motion && opts.glow) {
            const bucket = Math.floor(time * 16), arcs = opts.low ? 2 : 5, energy = envelope(time, 2.35, 4.7, .35);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
            for (let a = 0; a < arcs; a++) {
                const from = hash(bucket * 7 + a * 13) * TAU, span = .35 + hash(bucket + a * 5) * .5;
                const trace = pass => {
                    ctx.beginPath();
                    for (let i = 0; i <= 14; i++) {
                        const ang = from + span * i / 14, jitter = 1 + (hash(bucket * 31 + a * 17 + i) - .5) * .09;
                        const px = cx + Math.cos(ang) * rx * 1.03 * jitter, py = cy + Math.sin(ang) * ry * 1.03 * jitter;
                        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
                    }
                    ctx.stroke();
                };
                ctx.strokeStyle = '#9162d8'; ctx.lineWidth = 5; ctx.globalAlpha = .22 * energy * fade; trace();
                ctx.strokeStyle = '#f1e6ff'; ctx.lineWidth = 1.3; ctx.globalAlpha = .85 * energy * fade; trace();
            }
            ctx.restore();
        }
        if (opts.particles) {
            const count = opts.low ? 14 : 36, burst = envelope(time, 2.4, 4.7, .4);
            for (let i = 0; i < count; i++) {
                const angle = hash(i + 200) * TAU, p = (time * .45 + hash(i + 260)) % 1;
                const dist = .55 + p * 1.25, size = 1 + p * 3.4;
                ctx.globalAlpha = fade * burst * Math.sin(p * Math.PI) * .8;
                ctx.fillStyle = i % 3 ? '#c9b2ff' : '#ffd7a3';
                ctx.save(); ctx.translate(cx + Math.cos(angle) * rx * dist, cy + Math.sin(angle) * ry * dist);
                ctx.rotate(angle + p * 3); ctx.fillRect(-size, -size * .45, size * 2, size * .9); ctx.restore();
            }
        }
        ctx.restore();
    }

    function openingBoss(ctx, w, h, time, session, opts) {
        const pose = openingPose(w, h, time, session);
        if (time >= 3.8) {
            ctx.save(); ctx.globalAlpha = pose.alpha;
            const state = { scale: pose.scale, roar: pose.roar, frozen: pose.frozen, charge: pose.roar * .38, time };
            if (pose.alpha < .999) {
                const layer = sprite('opening/emergence', w, h, () => {});
                if (layer.width !== w || layer.height !== h) { layer.width = w; layer.height = h; }
                const g = layer.getContext('2d');
                g.clearRect(0, 0, w, h);
                session._renderBoss(g, { x: pose.x, y: pose.y }, state);
                ctx.drawImage(layer, 0, 0);
            } else {
                session._renderBoss(ctx, { x: pose.x, y: pose.y }, state);
            }
            ctx.restore();
        } else if (time >= 2.65) {
            const reveal = ease((time - 2.65) / .5);
            const mask = sprite('opening/shadow', 900, 700, g => {
                g.drawImage(bossMask(1), 0, 0);
                g.globalCompositeOperation = 'source-in'; g.fillStyle = '#07121b'; g.fillRect(0, 0, 900, 700);
            });
            ctx.save(); ctx.globalAlpha = reveal * .94;
            ctx.drawImage(mask, pose.x - 450 * pose.scale, pose.y - 225 * pose.scale, 900 * pose.scale, 700 * pose.scale);
            ctx.restore();
            for (let i = 0; i < 4; i++) {
                const open = ease((time - 2.85 - i * .12) / .28);
                const ex = pose.x + [-47, -18, 18, 47][i] * pose.scale;
                const ey = pose.y - (i === 0 || i === 3 ? 13 : 23) * pose.scale;
                if (opts.glow) glow(ctx, ex, ey, 16 * pose.scale, '#ffce84', open * .7);
                ctx.save(); ctx.globalAlpha = open; ctx.fillStyle = '#fff0b0';
                ctx.beginPath(); ctx.ellipse(ex, ey, 5 * pose.scale, 2.3 * pose.scale, 0, 0, TAU); ctx.fill(); ctx.restore();
            }
        }
        if (time >= 4.75 && time < 6.1) {
            const elapsed = time - 4.75;
            for (let i = 0; i < (opts.low ? 2 : 4); i++) {
                const p = clamp((elapsed - i * .07) / 1.1);
                ring(ctx, pose.x, pose.y, 40 + p * w * .72, i % 2 ? '#ffc284' : '#dac4ff', (1 - p) * .9, 0, .7);
            }
            if (opts.motion && opts.glow && elapsed < .05) {
                ctx.save(); ctx.globalAlpha = .28 * (1 - elapsed / .05); ctx.fillStyle = '#fff5dc';
                ctx.fillRect(0, 0, w, h); ctx.restore();
            }
        }
    }

    function openingShip(ctx, w, h, time, clock, opts) {
        const ship = typeof player !== 'undefined' ? player : { x: w / 2, y: h - 65 };
        const repaint = 1 - ease((time - 6.25) / 1.05);
        const danger = clock.alarm ? clock.escalation : envelope(time, 2.2, 6.25, .5);
        if (repaint > .001) {
            const jitter = opts.motion && window._screenShakeEnabled !== false ? Math.sin(clock.continuous * 43) * danger * 1.4 : 0;
            ctx.save();
            if (ctx.canvas.id === 'gameCanvas' && typeof root.drawPlayer === 'function') {
                root.drawPlayer(1, 0, { x: ship.x + jitter, y: ship.y });
            } else {
                ctx.strokeStyle = '#8fe8ff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 19); ctx.lineTo(ship.x + 14, ship.y + 13);
                ctx.lineTo(ship.x, ship.y + 6); ctx.lineTo(ship.x - 14, ship.y + 13); ctx.closePath(); ctx.stroke();
            }
            ctx.restore();
        }
        if (danger > .001 && time < 6.6) {
            ring(ctx, ship.x, ship.y, 31 + danger * 12, '#9bf0ff', .35 + danger * .5);
            if (opts.glow) glow(ctx, ship.x, ship.y, 75, '#76dce9', danger * .4);
        }
    }

    // A colossal silhouette that grows out of the contact point while the warning escalates, so the danger is seen
    // as well as read. It sits under the warning text and keeps growing until the portal opens.
    function openingLooming(ctx, w, h, time, clock, opts) {
        const grow = clock.alarm ? clock.escalation : (time >= 2.2 ? 1 : 0);
        const fade = 1 - ease((time - 2.2) / .75);
        if (grow <= .01 || fade <= .01) return;
        const shadow = sprite('opening/shadow', 900, 700, g => {
            g.drawImage(bossMask(1), 0, 0);
            g.globalCompositeOperation = 'source-in'; g.fillStyle = '#07121b'; g.fillRect(0, 0, 900, 700);
        });
        const scale = (.1 + 2.5 * Math.pow(grow, 1.7)) * (opts.low ? .85 : 1);
        const cx = w / 2, cy = h * (.02 + grow * .3);
        ctx.save(); ctx.globalAlpha = (.12 + .6 * grow) * fade;
        ctx.drawImage(shadow, cx - 450 * scale * h / 700, cy - 225 * scale * h / 700, 900 * scale * h / 700, 700 * scale * h / 700);
        ctx.restore();
        if (grow > .5) {
            const open = ease((grow - .5) / .3) * fade;
            for (let i = 0; i < 4; i++) {
                const ex = cx + [-47, -18, 18, 47][i] * scale * h / 700;
                const ey = cy - (i === 0 || i === 3 ? 13 : 23) * scale * h / 700;
                if (opts.glow) glow(ctx, ex, ey, 26 * scale * h / 700 + 8, '#ffb96e', open * .8);
                ctx.save(); ctx.globalAlpha = open; ctx.fillStyle = '#fff1bd';
                ctx.beginPath(); ctx.ellipse(ex, ey, 6 * scale * h / 700 + 1.5, 2.6 * scale * h / 700 + .8, 0, 0, TAU); ctx.fill(); ctx.restore();
            }
        }
    }

    // Cracks spreading across the whole screen as space gives way: they grow with the warning, finish as the
    // portal tears open, then fade as the boss arrives.
    function openingRupture(ctx, w, h, time, clock, opts) {
        const build = clock.alarm ? clock.escalation * .8 : (time >= 2.2 ? .8 + .2 * ease((time - 2.2) / .5) : 0);
        const fade = 1 - ease((time - 3.2) / 1.1);
        if (build <= .02 || fade <= .01) return;
        const x = w / 2, y = h * .31;
        fracture(ctx, x, y, w * .95, build, '#ffd9a1', opts.motion ? clock.continuous : 1.4, opts);
        if (opts.glow) glow(ctx, x, y, 60 + build * 150, '#fff2cf', build * .55 * fade * (opts.motion ? .8 + .2 * Math.sin(clock.continuous * 14) : 1));
        // the scene clock is held at 2.2 while the voice warning plays, so the flash is timed from the release
        const sinceRelease = clock.voice >= 0 ? clock.voice - clock.marks[3] : time - 2.2;
        const flash = sinceRelease >= 0 ? ease(1 - sinceRelease / .28) : 0;
        if (flash > 0 && opts.motion) {
            ctx.save(); ctx.globalAlpha = flash * .7; ctx.fillStyle = '#fff3d8'; ctx.fillRect(0, 0, w, h); ctx.restore();
        }
    }

    // Colour fringing for a few frames at the big beats (rupture, arrival): the finished frame is copied and laid
    // back over itself shifted left and right.
    function openingAberration(ctx, w, h, amount, opts) {
        if (amount <= .01 || !opts.motion || opts.low) return;
        const snap = sprite('opening/snap', 960, 540, () => {});
        const g = snap.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 960, 540);
        g.drawImage(ctx.canvas, 0, 0, 960, 540);
        const shift = 5 + amount * 13;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .2 * amount;
        ctx.drawImage(snap, -shift, 0, w, h); ctx.drawImage(snap, shift, 0, w, h);
        ctx.restore();
    }

    // Speed lines bursting from the boss when it lands in the arena
    function openingImpact(ctx, w, h, time, session, opts) {
        const p = clamp((time - 4.75) / .5);
        if (p <= 0 || p >= 1 || !opts.motion) return;
        const pose = openingPose(w, h, time, session);
        ctx.save(); ctx.strokeStyle = '#fff1d0'; ctx.lineCap = 'round';
        const count = opts.low ? 14 : 34;
        for (let i = 0; i < count; i++) {
            const angle = i / count * TAU + Math.sin(i * 7.7) * .08;
            const inner = 90 + p * Math.max(w, h) * .55, outer = inner + 60 + (i % 3) * 70;
            ctx.globalAlpha = (1 - p) * (i % 2 ? .75 : .45); ctx.lineWidth = 1.5 + (i % 3);
            ctx.beginPath(); ctx.moveTo(pose.x + Math.cos(angle) * inner, pose.y + Math.sin(angle) * inner * .7);
            ctx.lineTo(pose.x + Math.cos(angle) * outer, pose.y + Math.sin(angle) * outer * .7); ctx.stroke();
        }
        ctx.restore();
    }

    function openingName(ctx, w, h, time) {
        const alpha = envelope(time, 5.05, 6.6, .25);
        if (alpha <= 0) return;
        const opts = options();
        const width = Math.min(w * .78, 1000), height = Math.min(144, h * .18), y = h * .52;
        // the scene darkens behind the name, which lands with a quick scale slam and rising embers
        ctx.save(); ctx.globalAlpha = alpha * .5; ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, w, h); ctx.restore();
        if (opts.particles) {
            ctx.save(); ctx.fillStyle = '#ffcf8a';
            for (let i = 0; i < (opts.low ? 10 : 28); i++) {
                const life = ((time - 5.05) * .55 + i * .173) % 1;
                const ex = w / 2 + (((i * 97) % 100) / 100 - .5) * width * 1.05 + Math.sin(life * 6 + i) * 14;
                const ey = y + height / 2 - life * h * .32;
                ctx.globalAlpha = alpha * Math.sin(life * Math.PI) * .8; ctx.fillRect(ex, ey, 2 + i % 2, 2 + i % 2);
            }
            ctx.restore();
        }
        const slam = opts.motion ? 1 + .24 * (1 - ease((time - 5.05) / .22)) : 1;
        ctx.save(); ctx.translate(w / 2, y); ctx.scale(slam, slam); ctx.translate(-w / 2, -y);
        ctx.globalAlpha = alpha;
        runes(ctx,w/2,y,height*.95,alpha*.36,opts.motion?time*.12:0,.7);
        ctx.strokeStyle='#a97e5f';ctx.lineWidth=1;
        for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(w/2+side*width*.16,y+height*.48);ctx.lineTo(w/2+side*width*.43,y+height*.48);ctx.stroke();}
        if(opts.glow)glow(ctx,w/2,y,width*.42,'#ffc18a',alpha*.12);
        const t = root.DuelUI.t;
        label(ctx, t('duel.opening.title'), w / 2, y - height * .08, Math.min(49, h * .064), '#f3ddb1', true, width - 55);
        label(ctx, t('duel.opening.titleSub'), w / 2, y + height * .27, Math.min(17, h * .023), '#d6adc7');
        const progress = ease((time - 5.05) / .45), x = (w - width) / 2 + progress * width;
        ctx.globalAlpha = alpha * (1 - progress) * .8; ctx.fillStyle = '#fff0b0';
        ctx.fillRect(x - 2, y - height / 2 + 7, 2, height - 14);
        ctx.restore();
    }

    function openingHUD(ctx, w, h, time, session, opts) {
        if (time < 6.4) return;
        const fill = ease((time - 6.4) / .72);
        if (time >= 7.35) {
            session._renderMatchHUD(ctx, w, h, 1);
        } else {
            const bw = Math.min(500, w * .44);
            const regions = [
                { x: (w - bw) / 2 - 24, y: 0, width: bw + 100, height: 75, at: 6.4 },
                { x: w - 214, y: 0, width: 214, height: 128, at: 6.64 },
                { x: 0, y: h - 100, width: 290, height: 100, at: 6.9 }
            ];
            for (const region of regions) {
                const visible = ease((time - region.at) / .3);
                if (visible <= 0) continue;
                ctx.save(); ctx.beginPath(); ctx.rect(region.x, region.y, region.width, region.height); ctx.clip();
                ctx.globalAlpha = visible; session._renderMatchHUD(ctx, w, h, fill); ctx.restore();
            }
        }
        if (fill < 1 && opts.glow) {
            const bw = Math.min(500, w * .44);
            glow(ctx, (w - bw) / 2 + fill * bw, 42, 26, '#fee0a2', .6);
        }
        for (let i = 0; i < 3; i++) {
            const p = clamp((time - 6.95 - i * .13) / .45);
            if (p > 0 && p < 1) ring(ctx, 48 + i * 60, h - 48, 25 + (opts.motion ? p * 11 : 0), '#d9f8eb', (1 - p) * .85);
        }
        const alpha = envelope(time, 7.65, 8.4, .15);
        if (alpha > 0) {
            ctx.save(); ctx.globalAlpha = alpha;
            label(ctx, root.DuelUI.t('duel.opening.engage'), w / 2, h * .53, Math.min(70, h * .09), '#ffe4aa', true, w * .8);
            const half = Math.min(w * .23, 330);
            ctx.strokeStyle = '#bda573'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(w / 2 - half, h * .53 + 50); ctx.lineTo(w / 2 + half, h * .53 + 50); ctx.stroke();
            ctx.restore();
        }
    }


    function openingMist() {
        return sprite('opening/mist-r3',512,192,(g,w,h)=>{
            for(let i=0;i<11;i++){
                const x=hash(i+52)*w,y=hash(i+72)*h,r=40+hash(i+11)*90;
                const fog=g.createRadialGradient(x,y,0,x,y,r);
                fog.addColorStop(0,i%2?'#79999732':'#b37c6630');fog.addColorStop(1,'#16111900');
                g.fillStyle=fog;g.fillRect(0,0,w,h);
            }
        });
    }

    function openingDepth(ctx,w,h,time,clock,opts,foreground) {
        const fade=1-ease((time-5.8)/1.5);
        if(fade<=0)return;
        const t=opts.motion?clock.continuous:1;
        ctx.save();
        if(!foreground){
            if(!opts.low && opts.glow){
                ctx.globalAlpha=fade*.38;
                ctx.drawImage(openingMist(),-w*.15+Math.sin(t*.11)*w*.08,h*.09,w*1.3,h*.65);
                ctx.drawImage(openingMist(),-w*.08-Math.sin(t*.15)*w*.12,h*.47,w*1.3,h*.32);
            }
            if(opts.particles)for(let i=0;i<(opts.low?20:74);i++){
                const z=.2+hash(i+17)*.8,cycle=(hash(i+29)+t*(.025+z*.025))%1;
                const angle=hash(i+34)*TAU,r=(1-cycle)*w*(.3+z*.6);
                ctx.globalAlpha=fade*Math.sin(cycle*Math.PI)*(.12+z*.24);
                ctx.fillStyle=i%4?'#d3b798':'#93c5c5';
                ctx.fillRect(w*.5+Math.cos(angle)*r,h*.31+Math.sin(angle)*r*.55,1+z*2.4,1+z*2.4);
            }
        }else{
            if(opts.particles)for(let i=0;i<(opts.low?3:10);i++){
                const travel=(hash(i+220)+t*(.055+hash(i+19)*.035))%1;
                const x=w*(hash(i+87)*1.4-.2)+(travel-.5)*w*.24,y=h*(1-travel)*1.4-h*.2;
                const size=5+hash(i+77)*16;
                ctx.save();ctx.translate(x,y);ctx.rotate(hash(i)*TAU+(opts.motion?t*.07:0));
                ctx.globalAlpha=fade*Math.sin(travel*Math.PI)*.3;ctx.fillStyle='#0b0b12';ctx.strokeStyle='#ae8e7860';
                ctx.beginPath();ctx.moveTo(-size,-size*.3);ctx.lineTo(size*.5,-size);ctx.lineTo(size,size*.7);ctx.lineTo(-size*.3,size);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
            }
            if(opts.glow){ctx.globalAlpha=fade*.2;ctx.drawImage(vignette(),0,0,w,h);}
        }
        ctx.restore();
    }

    function openingMinds(ctx,w,h,time,clock,session,opts) {
        const gather=ease((time-3.5)/1.05), born=clock.alarm?ease((clock.voice-clock.marks[1])/.7):ease((time-2.1)/.3);
        const fade=(1-ease((time-4.55)/.3))*born;
        if(fade<=.001)return;
        const t=opts.motion?clock.continuous:0,pose=openingPose(w,h,time,session);
        ctx.save();
        for(let i=0;i<10;i++){
            const a=i*TAU/10+t*.14, r=w*(.29+.026*Math.sin(i*2+t*.4))*(1-gather);
            const x=w/2+Math.cos(a)*r,y=h*.31+Math.sin(a)*r*.48;
            const tx=pose.x+(i%5-2)*9,ty=pose.y-22;
            ctx.globalAlpha=fade*(opts.motion ? .58+.2*Math.sin(t*2.1+i*1.7) : .65);
            ctx.strokeStyle=i%2?'#b494ae':'#d8b67a';ctx.lineWidth=1;
            if(!opts.low){ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+Math.sin(a)*50,y+45,tx-20,ty+70,tx,ty);ctx.stroke();}
            const size=(8+2*Math.sin(i))*(1-gather*.5);
            if(opts.glow)glow(ctx,x,y,size*4,i%2?'#9162d8':'#ffc18a',fade*.2);
            ctx.fillStyle='#080a12';ctx.beginPath();ctx.ellipse(x,y,size*1.8,size*.7,a*.1,0,TAU);ctx.fill();ctx.stroke();
            ctx.fillStyle='#f7d99a';ctx.beginPath();ctx.ellipse(x,y,size*.25,size*.55,0,0,TAU);ctx.fill();
        }
        ctx.restore();
    }

    function openingTearSkin(ctx,w,h,time,opts) {
        const open=ease((time-2.2)/.9),fade=1-ease((time-4.8)/.8);
        if(open*fade<=0)return;
        ctx.save();ctx.translate(w/2,h*.31);ctx.globalAlpha=open*fade;
        const radius=w*.33*open;
        for(const side of [-1,1]){
            ctx.strokeStyle='#0b0712';ctx.lineWidth=18;ctx.beginPath();
            for(let i=0;i<=32;i++){const a=-Math.PI/2+i*Math.PI/32,r=radius*(1+.03*Math.sin(i*7.13));
                const x=side*Math.cos(a)*r,y=Math.sin(a)*r*.51;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
            ctx.stroke();ctx.strokeStyle=side<0?'#d99a71':'#a27bc2';ctx.lineWidth=1.5;ctx.stroke();
        }
        ctx.restore();
    }

    function updateOpeningAudio(session,now) {
        const time=session.preBattleElapsed,voice=session._openingVoiceStartedAt?(now-session._openingVoiceStartedAt)/1000:-1;
        const marks=session._openingVoiceMarks||[0,.62,1.63,4.73,6.22];
        const seen=session._openingR3Sounds||(session._openingR3Sounds=new Set());
        for(const [key,ready]of [
            ['duel-opening-dust',time>=.15],['egregor-opening-ten-minds',voice>=marks[1]+.2],
            ['egregor-opening-glass',time>=2.35],['egregor-opening-rays',time>=2.7],
            ['egregor-opening-unison',time>=3.5],['egregor-opening-limb',time>=3.65],
            ['egregor-opening-breath',time>=4.3],['egregor-opening-inscribe',time>=5.05]]){
            if(ready&&!seen.has(key)){seen.add(key);root.AudioMgr?.playSfx(key);}
        }
    }

    function renderOpening(ctx, w, h, time, session) {
        const opts = options(), clock = openingClock(time, session);
        ctx.save();
        // the world shakes harder as the warning escalates, and again at the rupture and the arrival
        const shake = opts.motion && window._screenShakeEnabled !== false
            ? (clock.alarm ? .8 + 6.5 * clock.escalation * clock.escalation : 0)
              + 11 * envelope(time, 2.2, 2.75, .12) + 13 * envelope(time, 4.75, 5.25, .1)
            : 0;
        ctx.save();
        if (shake > .05) ctx.translate(Math.sin(clock.continuous * 71) * shake, Math.cos(clock.continuous * 57) * shake * .7);
        openingBackground(ctx, w, h, time, clock, opts);
        openingDepth(ctx,w,h,time,clock,opts,false);
        openingGravity(ctx, w, h, time, clock, opts);
        openingLooming(ctx, w, h, time, clock, opts);
        openingRupture(ctx, w, h, time, clock, opts);
        openingPortal(ctx, w, h, time, clock, opts);
        openingTearSkin(ctx,w,h,time,opts);
        openingMinds(ctx,w,h,time,clock,session,opts);
        openingLimbs(ctx, w, h, time, opts);
        openingPortalFx(ctx, w, h, time, opts);
        openingBoss(ctx, w, h, time, session, opts);
        openingImpact(ctx, w, h, time, session, opts);
        openingDepth(ctx,w,h,time,clock,opts,true);
        openingShip(ctx, w, h, time, clock, opts);
        openingSystems(ctx, w, h, time, clock, opts);
        ctx.restore();
        const aberration = Math.max(envelope(time, 2.2, 2.6, .08), envelope(time, 4.75, 5.15, .08));
        openingAberration(ctx, w, h, aberration, opts);
        const bars = Math.max(clock.alarm ? .65 + clock.escalation * .35 : 0, envelope(time, .05, 6.9, .65));
        if (time < 6.9) letterbox(ctx, w, h, bars, clock.alarm ? '#b04c59' : '#be9170');
        openingAlarm(ctx, w, h, clock, opts);
        openingName(ctx, w, h, time);
        openingHUD(ctx, w, h, time, session, opts);
        ctx.restore();
    }

    function transitionWorld(ctx, session, w, h, pos, foreground) {
        const opts = options(), phase = session.state === 'phase_transition';
        const time = session.transitionElapsed, nextPhase = session.transitionInfo?.phase || 1;
        const color = phase ? palettes[Math.max(0, nextPhase - 1)] :
            root.DuelTheme.getAttackBarState(session.transitionInfo?.nextIndex || 1, 1, 1).color;
        ctx.save();
        if (!foreground) {
            if (phase) {
                ctx.fillStyle = '#080917'; ctx.globalAlpha = .56 * envelope(time, 0, session.transitionDuration, .4);
                ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
                if (opts.glow) glow(ctx, pos.x, pos.y, 300, color, .28 + .18 * ease(time / 2.6));
            }
            const charge = ease(time / (phase ? 2.6 : 1));
            runes(ctx, pos.x, pos.y + 34, phase ? 140 + charge * 55 : 90 + charge * 30,
                .55 * envelope(time, 0, phase ? 4.5 : 1.3, .15), opts.motion ? time * .3 : 0, .55);
            ring(ctx, pos.x, pos.y + 34, phase ? 169 + charge * 55 : 112 + charge * 30,
                color, .65 * envelope(time, 0, phase ? 4.5 : 1.3, .15), 0, .55);
            if (phase) {
                stars(ctx, pos.x, pos.y, Math.min(w, h) * .77, opts.motion ? time : 1, time < 2.6, color, opts);
                if (nextPhase === 3) finalRift(ctx, pos, w, time, opts);
                if (time > 2.6 && time < 4.35 && !opts.low && opts.motion) {
                    const split = Math.sin(clamp((time - 2.6) / 1.75) * Math.PI);
                    const mask = bossMask(nextPhase);
                    for (let i = 0; i < 10; i++) {
                        const angle = i / 10 * TAU;
                        const distance = opts.motion ? split * (60 + i % 3 * 24) : 0;
                        ctx.globalAlpha = split * .075;
                        ctx.drawImage(mask, pos.x - 450 + Math.cos(angle) * distance, pos.y - 225 + Math.sin(angle) * distance * .6);
                    }
                    ctx.globalAlpha = 1;
                }
            }
        } else if (phase) {
            const mask = bossMask(nextPhase);
            if (opts.glow) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = envelope(time, 2.75, session.transitionDuration, .6) * (nextPhase === 3 ? .58 : .5);
                ctx.drawImage(mask, pos.x - 450, pos.y - 225);
                ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
            }
            const charge = envelope(time, .45, 2.83, .5);
            ctx.save();
            const shape = bossMask(nextPhase);
            ctx.globalAlpha = charge * .28;
            if (opts.glow) ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(shape, pos.x - 450, pos.y - 225);
            ctx.restore();
            fracture(ctx, pos.x, pos.y, 119, charge, color, time, opts);
            if (time > 2.6 && time < 3.65) {
                const p = (time - 2.6) / 1.05;
                ring(ctx, pos.x, pos.y, 32 + p * w * .62, color, (1 - p) * .8, 0, .66);
                if (opts.glow && opts.motion && p < .065) {
                    ctx.globalAlpha = (1 - p / .065) * .32;
                    ctx.fillStyle = '#efddff'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
                }
            }
        }
        ctx.restore();
    }

    function finalRift(ctx, pos, w, time, opts) {
        const amount = envelope(time, .7, 4.55, .8);
        const half = w * .48 * amount, y = pos.y - 18;
        ctx.save(); ctx.globalAlpha = amount * .85;
        ctx.fillStyle = '#020109'; ctx.beginPath(); ctx.moveTo(pos.x - half, y);
        ctx.bezierCurveTo(pos.x - half * .3, y - amount * 70, pos.x + half * .3, y - amount * 70, pos.x + half, y);
        ctx.bezierCurveTo(pos.x + half * .3, y + amount * 55, pos.x - half * .3, y + amount * 55, pos.x - half, y); ctx.fill();
        ctx.strokeStyle = '#ffb78b'; ctx.lineWidth = 2; ctx.stroke();
        if (opts.glow) {
            ctx.strokeStyle = '#fff0c7'; ctx.lineWidth = .8;
            ctx.beginPath(); ctx.moveTo(pos.x - half, y); ctx.bezierCurveTo(pos.x - half * .3, y - 70 * amount, pos.x + half * .3, y - 70 * amount, pos.x + half, y); ctx.stroke();
        }
        ctx.restore();
    }

    function evolutionCamera(ctx, w, h, time, x, y) {
        const opts = options();
        if (!opts.motion) return;
        const gather = ease(time / 2.6), leave = 1 - ease((time - 2.6) / 1.75);
        const recoil = Math.sin(clamp((time - 2.6) / .35) * Math.PI) * .035;
        ctx.save(); ctx.translate(0, h * .065 * gather * leave);
        camera(ctx, w, h, x, y, 1 + .18 * gather * leave - recoil, opts.low ? 0 : Math.sin(time * .8) * .008 * leave);
        ctx.restore();
    }

    function evolutionOverlay(ctx, w, h, session) {
        const time = session.transitionElapsed, duration = session.transitionDuration;
        const phase = session.transitionInfo.phase, color = palettes[phase - 1], opts = options();
        ctx.save();
        letterbox(ctx, w, h, envelope(time, 0, duration - .15, .5), color);
        ctx.globalAlpha = .7 * envelope(time, 0, duration, .4);
        ctx.drawImage(vignette(), 0, 0, w, h); ctx.globalAlpha = 1;
        const titleTime = duration - 1.18;
        if (time > titleTime) {
            const p = ease((time - titleTime) / .4), fade = 1 - ease((time - duration + .22) / .22);
            const bw = Math.min(580, w * .7), y = h * .58;
            ctx.save(); ctx.globalAlpha = p * fade;
            plate(ctx, (w - bw) / 2, y - 42, bw, 86, 22);
            runes(ctx, w / 2, y, 70, .32, opts.motion ? time * .1 : 0, .6);
            label(ctx, root.DuelUI.t('duel.phase.' + phase + '.title'), w / 2, y - 5, 27, '#f8e7b7', true, bw - 25);
            label(ctx, root.DuelUI.t('duel.fx.evolved'), w / 2, y + 25, 11, color);
            ctx.restore();
            const ship = typeof player !== 'undefined' ? player : { x: w / 2, y: h - 65 };
            ring(ctx, ship.x, ship.y, 28 + p * 26, '#8df3f5', p * fade * .9);
            if (opts.glow) glow(ctx, ship.x, ship.y, 80, '#8ef5f7', p * fade * .2);
        }
        ctx.restore();
    }

    function spellCard(ctx, w, h, info, elapsed) {
        if (!info) return;
        const opts = options(), id = info.nextIndex || 1;
        const color = root.DuelTheme.getAttackBarState(id, 1, 1).color;
        const fade = envelope(elapsed, .12, 1.3, .18);
        ctx.save();
        if (opts.glow) {
            ctx.globalAlpha = envelope(elapsed, 0, .26, .08) * .5;
            ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(3, 3, w - 6, h - 6);
        }
        const width = Math.min(350, w * .31), height = 80;
        const slide = opts.motion ? 20 * (1 - ease((elapsed - .12) / .3)) : 0;
        const x = w - width - 24 + slide, y = h * .29;
        ctx.globalAlpha = fade;
        plate(ctx, x, y, width, height, 12);
        ctx.fillStyle = color; ctx.fillRect(x + 8, y + 12, 2, height - 24);
        const t = root.DuelUI.t;
        label(ctx, t('duel.fx.sequence') + ' ' + id + ' / 18', x + width / 2, y + 17, 10, color);
        label(ctx, t('duel.attack.' + id), x + width / 2, y + 39, 17, '#eee1c7', true, width - 30);
        label(ctx, t(info.isFinalClimax ? 'duel.fx.final' : 'duel.fx.reforming'), x + width / 2, y + 62, 10, '#b6bdcf', false, width - 24);
        ctx.restore();
    }

    const CAST_COLORS = {
        tendril_lash: '#ff6a78', tempest: '#c27bff', upheaval: '#ffa45e', eye_beams: '#ffd36b', null_slash: '#ff4f7d',
        rift: '#a99bff', chorus: '#ff9bd8', mind_link: '#7fe3ff', thought_sphere: '#8dffd0', volley: '#ff7a7a'
    };

    const RIBBON_COUNT = { tendril_lash: 6, tempest: 4, upheaval: 5, eye_beams: 3, null_slash: 5, rift: 4, chorus: 6, mind_link: 3, thought_sphere: 3 };

    // Living ribbons of the skill's colour reach out of the Egregor toward its target as the skill winds up, flare when it
    // fires, and draw back as it recovers. Each ribbon sways on its own and tapers to a point.
    function emitRibbons(ctx, x, y, cue, color, opts, level, index) {
        const count = RIBBON_COUNT[cue.kind] || 3;
        if (level <= .02) return;
        const base = Math.atan2(cue.dirY, cue.dirX), reach = (cue.kind === 'upheaval' ? 330 : 250) * level;
        const steps = opts.low ? 8 : 14;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
        if (opts.glow) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
        for (let r = 0; r < count; r++) {
            const spread = (r - (count - 1) / 2) * .34;
            const angle = base + spread;
            const sx = x + Math.cos(base + spread * 1.6 + Math.PI / 2) * 28 * (spread >= 0 ? 1 : -1) * .4, sy = y + 14;
            const nx = -Math.sin(angle), ny = Math.cos(angle);
            let px = sx, py = sy;
            for (let s = 1; s <= steps; s++) {
                const u = s / steps;
                const sway = (opts.motion ? Math.sin(u * 5.5 + cue.age * 7 + r * 1.9 + index) : 0) * 22 * u * (.5 + level);
                const qx = sx + Math.cos(angle) * reach * u + nx * sway, qy = sy + Math.sin(angle) * reach * u + ny * sway;
                ctx.globalAlpha = Math.min(1, level * 1.2) * (1 - u * .35);
                ctx.lineWidth = Math.max(1, (cue.stage === 'fire' ? 9 : 6) * (1 - u));
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
                px = qx; py = qy;
            }
        }
        ctx.restore();
    }

    // The four eyes flare in the skill's colour while it charges
    function emitEyeFlares(ctx, x, y, color, opts, level) {
        if (level <= .02) return;
        const xs = [-47, -18, 18, 47];
        for (let i = 0; i < 4; i++) {
            const ex = x + xs[i], ey = y - (i === 0 || i === 3 ? 13 : 23);
            if (opts.glow) glow(ctx, ex, ey, 14 + 20 * level, color, .55 * level);
            ctx.save(); ctx.globalAlpha = level * .9; ctx.fillStyle = '#fff1d0';
            ctx.beginPath(); ctx.ellipse(ex, ey, 3 + 2 * level, 1.6 + level, 0, 0, TAU); ctx.fill(); ctx.restore();
        }
    }

    // Every Egregor skill announces itself: while it winds up a rune ring turns around the boss, ribbons of light
    // reach out of it toward the target and its eyes flare; when it fires the ribbons blaze and shock rings burst out.
    function skillCast(ctx, session, w, h, pos) {
        const cues = session.attacks && session.attacks.cues;
        if (!cues || !cues.length || session.state !== 'playing') return;
        const opts = options();
        for (let i = 0; i < cues.length; i++) {
            const cue = cues[i];
            if (cue.age < 0) continue;
            const color = CAST_COLORS[cue.kind] || '#ff6a78';
            const major = cue.kind !== 'volley';
            const x = pos.x, y = pos.y;
            const wind = clamp(cue.wind), sinceFire = cue.age - cue.windup;
            const fading = cue.stage === 'recover' ? 1 - clamp((cue.age - cue.windup - cue.active) / Math.max(.1, cue.recover)) : 1;
            if (cue.stage === 'prepare' || cue.stage === 'fire' || cue.stage === 'recover') {
                const radius = (major ? 62 : 34) + wind * (major ? 78 : 30);
                if (major) runes(ctx, x, y, radius, (.18 + .5 * wind) * fading, opts.motion ? cue.age * (i % 2 ? -1.6 : 1.3) : 0, .62);
                if (opts.glow) glow(ctx, x, y, radius * 1.3, color, (major ? .2 : .1) * wind * fading);
                if (cue.stage === 'prepare') {
                    stars(ctx, x, y, major ? 190 : 110, opts.motion ? cue.age * 1.6 : 1, true, color, opts);
                    ctx.save(); ctx.globalAlpha = wind * .45; ctx.strokeStyle = color; ctx.lineWidth = major ? 2 : 1;
                    ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.moveTo(x + cue.dirX * 46, y + cue.dirY * 46);
                    ctx.lineTo(x + cue.dirX * (46 + wind * (major ? 210 : 120)), y + cue.dirY * (46 + wind * (major ? 210 : 120)));
                    ctx.stroke(); ctx.restore();
                }
            }
            if (cue.stage === 'fire' || (cue.stage === 'recover' && sinceFire < cue.active + .6)) {
                const p = clamp(sinceFire / (cue.active + .55));
                const rings = major ? (opts.low ? 2 : 3) : 1;
                for (let r = 0; r < rings; r++) {
                    const q = clamp(p - r * .12);
                    ring(ctx, x, y, 36 + q * (major ? 250 : 120), r % 2 ? '#fff0d6' : color, (1 - q) * .85, 0, .66);
                }
                if (opts.glow && p < .2) glow(ctx, x, y, 90 + p * 280, color, (1 - p / .2) * (major ? .75 : .3));
            }
            if (major) {
                const level = cue.stage === 'prepare' ? wind * .55 : cue.stage === 'fire' ? .55 + clamp(cue.fire) * .45 : .55 * fading;
                emitRibbons(ctx, x, y, cue, color, opts, level, i);
                emitEyeFlares(ctx, x, y, color, opts, cue.stage === 'prepare' ? wind : cue.stage === 'fire' ? 1 : fading);
            }
        }
    }

    function ambientPlayer(ctx, session, w, h) {
        if (session.state !== 'playing') return;
        const opts = options(), ship = typeof player !== 'undefined' ? player : null;
        if (!ship) return;
        const time = session.stats.timeSec || 0;
        ctx.save();
        if (opts.particles) {
            ctx.fillStyle = '#8ceafb';
            for (let i = 0; i < (opts.low ? 4 : 10); i++) {
                const p = (time * 2.4 + i * .11) % 1;
                ctx.globalAlpha = (1 - p) * .44;
                const side = i % 2 ? 1 : -1;
                ctx.fillRect(ship.x + side * (5 + p * 7), ship.y + 20 + p * 39, 1.5, 2 + p * 3);
            }
        }
        const graze = session._fxGraze || 0;
        if (graze > 0) {
            const p = 1 - graze / .32;
            ring(ctx, ship.x, ship.y, 16 + (opts.motion ? p * 27 : 0), '#cffbff', (1 - p) * .8);
        }
        if (session.lives > 0 && session.lives < 5) {
            ctx.globalAlpha = opts.motion ? .11 + .045 * Math.sin(time * 4.8) : .12;
            ctx.fillStyle = '#c43d66'; ctx.fillRect(0, 0, 4, h); ctx.fillRect(w - 4, 0, 4, h);
            ctx.globalAlpha *= .6; ctx.fillRect(0, h - 6, w, 6);
        }
        ctx.restore();
    }

    function damageNumbers(ctx, session) {
        if (session.state !== 'playing' || !session._fxDamage.length) return;
        const opts = options();
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = root.DuelTheme.getBodyFont(12, 700);
        for (const number of session._fxDamage) {
            const p = 1 - number.life / .65;
            ctx.globalAlpha = Math.min(1, number.life / .2);
            ctx.fillStyle = '#fff2b7';
            ctx.fillText(Math.round(number.amount).toLocaleString(), number.x, number.y - 16 - (opts.motion ? p * 70 : 0));
        }
        ctx.restore();
    }

    function readyPulse(ctx, w, h, session) {
        const opts = options();
        for (const [remaining, x] of [[session._fxShiftReady, 48], [session._fxFReady, 168]]) {
            if (!(remaining > 0)) continue;
            const p = 1 - remaining / .6;
            ring(ctx, x, h - 48, 25 + (opts.motion ? p * 13 : 0), '#d9f5eb', (1 - p) * .85);
        }
    }

    const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

    function cockpitGlow(w, h, color) {
        return sprite('cockpit/glow/' + color + '/' + w + 'x' + h, w, h, (g) => {
            const edge = 110;
            const sides = [[0, 0, 0, edge, 0, 0, w, edge], [0, h, 0, h - edge, 0, h - edge, w, edge], [0, 0, edge, 0, 0, 0, edge, h], [w, 0, w - edge, 0, w - edge, 0, edge, h]];
            for (const [x0, y0, x1, y1, rx, ry, rw, rh] of sides) {
                const grad = g.createLinearGradient(x0, y0, x1, y1);
                grad.addColorStop(0, color + 'cc'); grad.addColorStop(.45, color + '33'); grad.addColorStop(1, color + '00');
                g.fillStyle = grad; g.fillRect(rx, ry, rw, rh);
            }
        });
    }

    // A cockpit warning frame around the whole screen, in amber once the ship is down to 5 lives and in red at 3: a
    // chamfered border that draws itself in, corner brackets, hazard stripes at 3, a lives gauge down the left edge,
    // a flickering status column on the right, and for the first 2.6 s a red malfunction message. After that the frame
    // stays as a pulsing border for as long as the lives stay that low.
    function cockpitAlarm(ctx, w, h, session, forced) {
        const state = forced || session._cockpit;
        if (!state) return;
        const opts = options(), now = performance.now(), age = (now - state.at) / 1000;
        const crit = state.level <= 3, color = crit ? '#ff3b52' : '#ffb347';
        const pulse = opts.motion ? .6 + .4 * Math.sin(now / 1000 * (crit ? 2.6 : 1.3) * TAU) : .8;
        const intro = ease(age / .5), m = 10, c = 30;
        const lives = forced ? 0 : session.lives;
        ctx.save();
        if (opts.glow) { ctx.globalAlpha = intro * (crit ? .5 + .4 * pulse : .3 + .3 * pulse); ctx.drawImage(cockpitGlow(w, h, color), 0, 0); }
        const path = () => {
            ctx.beginPath(); ctx.moveTo(m + c, m); ctx.lineTo(w - m - c, m); ctx.lineTo(w - m, m + c); ctx.lineTo(w - m, h - m - c);
            ctx.lineTo(w - m - c, h - m); ctx.lineTo(m + c, h - m); ctx.lineTo(m, h - m - c); ctx.lineTo(m, m + c); ctx.closePath();
        };
        const perimeter = 2 * (w + h) - 8 * c + 4 * Math.SQRT2 * c;
        ctx.strokeStyle = color; ctx.lineWidth = crit ? 4 : 3; ctx.globalAlpha = (.75 + .25 * pulse) * Math.min(1, intro * 1.4);
        ctx.setLineDash([perimeter * intro, perimeter]); path(); ctx.stroke(); ctx.setLineDash([]);
        // corner brackets and rivets
        if (intro > .6) {
            ctx.lineWidth = 2; ctx.globalAlpha = .8 * ease((intro - .6) / .4);
            for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                const x = sx > 0 ? m + 14 : w - m - 14, y = sy > 0 ? m + 14 : h - m - 14;
                ctx.beginPath(); ctx.moveTo(x, y + sy * 52); ctx.lineTo(x, y + sy * 14); ctx.lineTo(x + sx * 14, y); ctx.lineTo(x + sx * 52, y); ctx.stroke();
                ctx.fillStyle = color; ctx.fillRect(x + sx * 20 - 2, y + sy * 20 - 2, 4, 4);
            }
        }
        // hazard stripes along the top and bottom edges at the critical level
        if (crit && intro > .3) {
            ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = (.28 + .3 * pulse) * intro;
            const slide = opts.motion ? (now * .03) % 36 : 0;
            for (const y0 of [0, h - 7]) {
                ctx.beginPath(); ctx.rect(m + c, y0, w - 2 * (m + c), 7); ctx.clip();
                for (let x = m + c - 36 + slide; x < w - m - c; x += 36) {
                    ctx.beginPath(); ctx.moveTo(x, y0 + 7); ctx.lineTo(x + 12, y0 + 7); ctx.lineTo(x + 19, y0); ctx.lineTo(x + 7, y0); ctx.closePath(); ctx.fill();
                }
                ctx.restore(); ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = (.28 + .3 * pulse) * intro;
            }
            ctx.restore();
        }
        // lives gauge on the left edge and a status column on the right
        const gaugeTop = h * .3, step = h * .4 / 8;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const filled = i >= 8 - lives, y = gaugeTop + i * step;
            ctx.globalAlpha = intro * (filled ? .95 : .3); ctx.strokeStyle = color; ctx.fillStyle = color;
            ctx.strokeRect(m + 8, y, 12, step - 5); if (filled) ctx.fillRect(m + 8, y, 12, step - 5);
        }
        for (let i = 0; i < 6; i++) {
            const level = opts.motion ? .35 + .65 * Math.abs(Math.sin(now * .002 * (1 + i * .37) + i * 2 + (crit ? Math.sin(now * .03 + i) * 2 : 0))) : .6;
            ctx.globalAlpha = intro * .8; ctx.fillStyle = color;
            const bx = w - m - 18, by = gaugeTop + i * (h * .4 / 6);
            ctx.fillRect(bx, by + 14 * (1 - level), 8, 14 * level);
        }
        // opening flash and the malfunction message
        const flash = ease(1 - age / .28);
        if (flash > 0 && opts.motion) { ctx.globalAlpha = flash * .22; ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); }
        ctx.restore();
    }

    // A ship report in the top left corner, like the status panels of a sci-fi game: it shows the line the ship computer
    // is speaking, typed in under a red tag, and fades once the voice has finished. One report at a time.
    const REPORT_STYLE = { warning: '#ffb347', critical: '#ff3b52', report: '#ff7a86', failure: '#ff3b52' };
    function shipReport(ctx, w, h, session) {
        const r = session._report;
        if (!r) return;
        const opts = options(), t = root.DuelUI.t, now = performance.now(), age = (now - r.at) / 1000;
        if (age > r.duration + .6) { session._report = null; return; }
        const alpha = ease(age / .25) * ease((r.duration + .5 - age) / .5);
        if (alpha <= 0.01) return;
        const color = REPORT_STYLE[r.tag] || '#ff3b52';
        const width = Math.min(410, w * .34), pad = 14, x = 22, tipsShowing = session._tipsShow && session.state === 'playing' && session.stats.timeSec < 5, y = tipsShowing ? 266 : Math.max(96, h * .16);
        const full = t('duel.report.' + r.id), tagText = t('duel.report.tag.' + r.tag);
        const shown = full.slice(0, Math.min(full.length, Math.floor(age * 38)));
        const size = Math.max(13, Math.min(16, h * .021));
        ctx.save(); ctx.font = root.DuelTheme.getBodyFont(size, 600);
        const words = shown.split(' '), lines = [];
        let line = '';
        for (const word of words) { const next = line ? line + ' ' + word : word; if (line && ctx.measureText(next).width > width - pad * 2 - 6) { lines.push(line); line = word; } else line = next; }
        if (line) lines.push(line);
        const fullLines = Math.max(1, Math.ceil(full.length * size * .52 / (width - pad * 2 - 6)));
        const height = pad * 2 + 22 + Math.max(lines.length, fullLines) * (size + 5);
        const flicker = opts.motion && age < .6 ? .55 + .45 * Math.abs(Math.sin(age * 38)) : 1;
        ctx.globalAlpha = alpha * flicker;
        ctx.fillStyle = 'rgba(22, 2, 9, .86)'; ctx.beginPath();
        ctx.moveTo(x + 12, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + height - 12); ctx.lineTo(x + width - 12, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.globalAlpha = alpha * flicker * .8; ctx.stroke();
        ctx.globalAlpha = alpha * flicker; ctx.fillStyle = color; ctx.fillRect(x, y + 12, 4, height - 24);
        // tag row: warning triangle, tag, a status light that blinks while the line is being spoken
        ctx.beginPath(); ctx.moveTo(x + pad + 7, y + pad); ctx.lineTo(x + pad + 14, y + pad + 12); ctx.lineTo(x + pad, y + pad + 12); ctx.closePath(); ctx.stroke();
        ctx.fillRect(x + pad + 6, y + pad + 4, 2, 4); ctx.fillRect(x + pad + 6, y + pad + 9, 2, 2);
        ctx.font = root.DuelTheme.getBodyFont(12, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        ctx.fillText(tagText, x + pad + 24, y + pad + 7);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        if (age < r.duration && (!opts.motion || Math.floor(age * 3) % 2 === 0)) ctx.fillRect(x + width - pad - 8, y + pad + 3, 8, 8);
        ctx.globalAlpha = alpha * flicker * .45; ctx.fillRect(x + pad, y + pad + 20, width - pad * 2, 1);
        ctx.globalAlpha = alpha * flicker; ctx.fillStyle = '#ff8b96'; ctx.font = root.DuelTheme.getBodyFont(size, 600); ctx.textBaseline = 'top';
        for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x + pad + 4, y + pad + 28 + i * (size + 5));
        ctx.restore();
    }

    // The ship is gone: the red cockpit frame flares on its own (the mission failed report itself is the corner panel)
    function missionFailed(ctx, w, h, time) {
        const alpha = ease((time - .35) / .4);
        if (alpha <= 0) return;
        ctx.save(); ctx.globalAlpha = alpha;
        cockpitAlarm(ctx, w, h, null, { level: 3, at: performance.now() - 900 });
        ctx.restore();
    }

    // The Egregor's death: its body flashes white and cracks, then comes apart in vertical strips that rise and
    // fade as embers, while rings of light spread from it and a last flash closes the scene.
    function bossDeath(ctx, session, w, h, pos) {
        const opts = options(), time = session.burstTotalTime || 0;
        const layer = sprite('death/layer', w, h, () => {});
        if (layer.width !== w || layer.height !== h) { layer.width = w; layer.height = h; }
        const g = layer.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
        session._renderBoss(g, pos, null, ctx);
        const flash = ease(1 - time / .3);
        const left = Math.max(0, Math.floor(pos.x - 340)), top = Math.max(0, Math.floor(pos.y - 230));
        const right = Math.min(w, Math.ceil(pos.x + 340)), bottom = Math.min(h, Math.ceil(pos.y + 340));
        if (time < .3 || !opts.motion) {
            ctx.drawImage(layer, 0, 0, w, h);
            if (flash > 0 && opts.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash * .7; ctx.drawImage(layer, 0, 0, w, h); ctx.restore(); }
        } else {
            const stripW = 11;
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, top); ctx.rect(0, bottom, w, h - bottom);
            ctx.rect(0, top, left, bottom - top); ctx.rect(right, top, w - right, bottom - top); ctx.clip();
            ctx.drawImage(layer, 0, 0, w, h); ctx.restore();
            for (let x = left, i = 0; x < right; x += stripW, i++) {
                const distance = Math.abs(x - pos.x) / 340;
                const local = clamp((time - .3 - hash(i) * .55 - distance * .3) / .75);
                if (local >= 1) continue;
                const rise = local * local * (70 + hash(i + 40) * 140), sway = Math.sin(i * 1.7 + time * 6) * local * 10;
                ctx.save(); ctx.globalAlpha = 1 - local;
                ctx.drawImage(layer, x, top, Math.min(stripW, right - x), bottom - top, x + sway, top - rise, Math.min(stripW, right - x), bottom - top);
                ctx.restore();
            }
        }
        fracture(ctx, pos.x, pos.y, 270, ease(time / .45) * (1 - ease((time - .85) / .35)), '#fff1c8', time, opts);
        if (opts.particles) {
            ctx.save(); ctx.fillStyle = '#ffcf8a';
            for (let i = 0; i < (opts.low ? 16 : 46); i++) {
                const life = clamp((time - .3 - hash(i + 80) * .8) / 1.2);
                if (life <= 0 || life >= 1) continue;
                ctx.globalAlpha = Math.sin(life * Math.PI) * .9;
                ctx.fillRect(pos.x + (hash(i) - .5) * 560 + Math.sin(life * 7 + i) * 14,
                    pos.y + (hash(i + 20) - .35) * 300 - life * 190, 2 + i % 3, 2 + i % 3);
            }
            ctx.restore();
        }
        for (let k = 0; k < (opts.low ? 3 : 5); k++) {
            const p = clamp((time - .25 - k * .34) / .9);
            if (p > 0 && p < 1) ring(ctx, pos.x, pos.y, 40 + p * w * .6, k % 2 ? '#ff5a6b' : '#ffd98a', (1 - p) * .85, 0, .72);
        }
        const last = envelope(time, 1.7, 2.2, .1);
        if (last > 0) { ctx.save(); ctx.globalAlpha = last * .55; ctx.fillStyle = '#fff6e0'; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    }

    // The ship's death: a fireball, a white-hot flash, debris flying out, and red shock rings. The ship itself is no
    // longer drawn once it has blown up.
    function shipDeath(ctx, w, h, time, pos, opts) {
        const fire = envelope(time, 0, .9, .08);
        if (opts.glow) {
            glow(ctx, pos.x, pos.y, 50 + time * 230, '#ff6a3a', .75 * fire);
            glow(ctx, pos.x, pos.y, 30 + time * 120, '#fff1c8', .9 * envelope(time, 0, .35, .05));
        }
        for (let k = 0; k < 2; k++) {
            const p = clamp((time - k * .15) / .9);
            if (p > 0 && p < 1) ring(ctx, pos.x, pos.y, 20 + p * w * .38, k ? '#ff9a6a' : '#ff3b52', (1 - p) * .9, 0, .75);
        }
        if (opts.motion) {
            ctx.save();
            for (let i = 0; i < (opts.low ? 10 : 22); i++) {
                const life = clamp(time / 1.1);
                if (life >= 1) break;
                const angle = i * 2.399963, speed = 150 + hash(i) * 190;
                const dx = Math.cos(angle) * speed * time, dy = Math.sin(angle) * speed * time * .8 + 220 * time * time;
                ctx.save(); ctx.translate(pos.x + dx, pos.y + dy); ctx.rotate(angle + time * (4 + i % 5));
                ctx.globalAlpha = (1 - life) * .95; ctx.fillStyle = i % 3 ? '#8fe8ff' : '#2b3c52'; ctx.strokeStyle = '#d6f6ff';
                const s = 4 + hash(i + 9) * 7;
                ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * .7, s * .6); ctx.lineTo(-s * .5, -s * .7); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }
        const flash = envelope(time, 0, .22, .04);
        if (flash > 0 && opts.motion) { ctx.save(); ctx.globalAlpha = flash * .4; ctx.fillStyle = '#ffe9d2'; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    }

    function ending(ctx, w, h, session) {
        if (session.state !== 'victory_burst' && session.state !== 'defeat_burst') return;
        const win = session.state === 'victory_burst', opts = options();
        const time = session.burstTotalTime || 0, pos = win ? session.bossPos : player;
        const color = win ? '#e9c981' : '#9dd5ef';
        ctx.save();
        if (!win) { shipDeath(ctx, w, h, time, pos, opts); missionFailed(ctx, w, h, time); }
        if (opts.glow) glow(ctx, pos.x, pos.y, 100 + time * 100, color, .55 * envelope(time, 0, win ? 2.2 : 1.2, .2));
        ring(ctx, pos.x, pos.y, 30 + (opts.motion ? time * 180 : 0), color, Math.max(0, 1 - time / 1.2), 0, .7);
        stars(ctx, pos.x, pos.y, Math.min(w, h) * .7, opts.motion ? time : .5, false, color, opts);
        const dim = ease((time - (win ? 1.6 : .75)) / .5);
        ctx.globalAlpha = dim * .65; ctx.fillStyle = '#030610'; ctx.fillRect(0, 0, w, h);
        ctx.restore();
        shipReport(ctx, w, h, session);
    }

    root.DuelCinematics = {
        renderOpening, updateOpeningAudio, prepareOpening, openingPose, skillCast, bossDeath, cockpitAlarm, shipReport, transitionWorld, evolutionCamera, evolutionOverlay, spellCard,
        ambientPlayer, damageNumbers, readyPulse, ending,
        debug: () => ({
            cachedSprites: sprites.size + plates.size,
            pixels: [...sprites.values(), ...plates.values()].reduce((n, c) => n + c.width * c.height, 0)
        })
    };
})(typeof globalThis !== 'undefined' ? globalThis : this);
