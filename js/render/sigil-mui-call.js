// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) Legion call and windup visual renderer (fx kind 10..14).

var _muiCallVignette = null;
var _muiCallVignetteW = 0;
var _muiCallVignetteH = 0;
var _muiLastWindupId = -1;

function _muiGetCallVignette(w, h) {
    if (_muiCallVignette && _muiCallVignetteW === w && _muiCallVignetteH === h) {
        return _muiCallVignette;
    }
    _muiCallVignetteW = w;
    _muiCallVignetteH = h;
    _muiCallVignette = document.createElement('canvas');
    _muiCallVignette.width = w;
    _muiCallVignette.height = h;
    var g = _muiCallVignette.getContext('2d');
    var cx = w / 2;
    var cy = h / 2;
    var maxR = Math.hypot(cx, cy);
    var grad = g.createRadialGradient(cx, cy, maxR * 0.42, cx, cy, maxR);
    grad.addColorStop(0, 'rgba(11,59,58,0)');
    grad.addColorStop(0.72, 'rgba(11,59,58,0.32)');
    grad.addColorStop(1, 'rgba(11,59,58,0.78)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    return _muiCallVignette;
}

function _drawMuiWindup() {
    var wave = window._muiWindupFx;
    if (!wave) return;
    var age = window._muiClock - wave.start;
    var gfx = _muiGfxTier();
    var reduced = _muiReducedMotion();
    var S = _muiSprites();

    // 1. Inhale rhythm (age 0 to 150 ms): suction particles and convergent light rays
    if (wave.id !== _muiLastWindupId) {
        _muiLastWindupId = wave.id;
        wave._inhaleSpawned = false;
        wave._burstSpawned = false;
        wave._shookBurst = false;
    }

    if (!wave._inhaleSpawned && !reduced && gfx < 2) {
        wave._inhaleSpawned = true;
        var moteCount = gfx === 0 ? 14 : 7;
        for (var m = 0; m < moteCount; m++) {
            var ang = (m / moteCount) * MUI_TAU + (m % 3) * 0.25;
            var dist = 180 + (m % 4) * 45;
            var sx = wave.x + Math.cos(ang) * dist;
            var sy = wave.y + Math.sin(ang) * dist;
            var sp = dist / 135;
            var vx = -Math.cos(ang) * sp;
            var vy = -Math.sin(ang) * sp;
            _muiEmitFxHelper(10, sx, sy, 140, 0.9 + (m % 3) * 0.35, ang, vx, vy);
        }
    }

    // Atmosphere vignette dimming during inhale anticipation
    if (!reduced && gfx < 2 && age < 140) {
        var vigAlpha = (age < 70 ? age / 70 : 1 - (age - 70) / 70) * 0.45;
        if (vigAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = vigAlpha;
            ctx.drawImage(_muiGetCallVignette(canvas.width, canvas.height), 0, 0);
            ctx.restore();
        }
    }

    // Inward convergent light rays streaming towards player ship
    if (!reduced && gfx < 2 && age < 150) {
        var rayProg = age / 150;
        var rayAlpha = (1 - rayProg) * 0.75;
        var rayR0 = 260 * (1 - rayProg * 0.85);
        var rayR1 = Math.max(12, 35 * (1 - rayProg));
        var rayCount = gfx === 0 ? 8 : 4;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = MUI_COLOR_JADE;
        ctx.lineWidth = gfx === 0 ? 1.8 : 1.2;
        ctx.globalAlpha = rayAlpha;
        for (var rIdx = 0; rIdx < rayCount; rIdx++) {
            var rAngle = (rIdx / rayCount) * MUI_TAU + age * 0.003;
            var cosA = Math.cos(rAngle);
            var sinA = Math.sin(rAngle);
            ctx.beginPath();
            ctx.moveTo(wave.x + cosA * rayR0, wave.y + sinA * rayR0);
            ctx.lineTo(wave.x + cosA * rayR1, wave.y + sinA * rayR1);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Gathering jade soul orb at core during inhale
    if (age < 150) {
        var coreProg = age / 150;
        var coreAlpha = coreProg * 0.85;
        var coreScale = 0.5 + coreProg * 1.2;
        ctx.save();
        ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
        ctx.globalAlpha = coreAlpha;
        if (S && S.jadeGlow) {
            var cSize = 64 * coreScale;
            ctx.drawImage(S.jadeGlow, wave.x - cSize / 2, wave.y - cSize / 2, cSize, cSize);
        }
        ctx.restore();
    }

    // 2. Bloom burst flash and explosion release (age 120 to 240 ms)
    if (age >= 120 && age <= 240) {
        var burstAge = age - 120;
        var burstFade = 1 - burstAge / 120;
        var burstFadeSq = burstFade * burstFade;

        // Screen flash overlay
        if (!reduced && gfx < 2 && window._fxOpts?.screenFlash !== false) {
            ctx.save();
            ctx.globalAlpha = 0.22 * burstFadeSq;
            ctx.fillStyle = MUI_COLOR_BONE;
            ctx.fillRect(-12, -12, canvas.width + 24, canvas.height + 24);
            ctx.restore();
        }

        // Central bloom burst flare
        ctx.save();
        ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
        ctx.globalAlpha = 0.95 * burstFadeSq;
        if (S && S.jadeGlow) {
            var bSize = (gfx === 0 ? 190 : 130) * (0.8 + 0.4 * (1 - burstFade));
            ctx.drawImage(S.jadeGlow, wave.x - bSize / 2, wave.y - bSize / 2, bSize, bSize);
        }
        ctx.restore();

        // Spawn burst sparks once at detonation
        if (!wave._burstSpawned && !reduced && gfx < 2) {
            wave._burstSpawned = true;
            var sparkCount = gfx === 0 ? 10 : 5;
            for (var s = 0; s < sparkCount; s++) {
                var sAng = (s / sparkCount) * MUI_TAU + (s % 2) * 0.314;
                var sSp = 0.35 + (s % 3) * 0.12;
                var sVx = Math.cos(sAng) * sSp;
                var sVy = Math.sin(sAng) * sSp;
                _muiEmitFxHelper(12, wave.x, wave.y, 280, 1.0, sAng, sVx, sVy);
            }
        }
    }

    // 3. Screen shake during windup explosion
    if (!wave._shookBurst && age >= 120) {
        wave._shookBurst = true;
        if (typeof _setShake === 'function'
            && window._screenShakeEnabled !== false
            && !reduced) {
            var shakeIntensity = (gfx === 2 || (typeof _mobPerf !== 'undefined' && _mobPerf)) ? 3 : 7;
            _setShake(shakeIntensity, 260);
        }
    }

    // 4. Main shockwave ring expansion and chasing ripple rings
    var ringCount = reduced ? 1 : 3 - gfx;
    var mainRadius = _muiWindupRadius(wave.maxR, age);

    ctx.save();
    ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
    ctx.translate(wave.x, wave.y);

    // Optional call sigil ground engraving disc (fallback if detail renderer not active)
    var img = !reduced && gfx < 2 ? _muiFxImg('call-sigil') : null;
    if (img && age < MUI_WINDUP_MS) {
        var half = mainRadius * 1.1;
        ctx.save();
        ctx.rotate(age * 0.007);
        ctx.globalAlpha = 0.54 * (1 - age / MUI_WINDUP_MS);
        ctx.drawImage(img, -half, -half, 2 * half, 2 * half);
        ctx.restore();
    }

    // Expansion rings loop (Ring 0 is main ring, Rings 1 and 2 are chasing ripples)
    for (var i = ringCount - 1; i >= 0; i--) {
        var ringDelay = i === 0 ? 0 : (i === 1 ? 55 : 110);
        var ringAge = age - ringDelay;
        if (ringAge <= 0 || ringAge >= MUI_WINDUP_MS) continue;
        var r = i === 0 ? mainRadius : _muiWindupRadius(wave.maxR, ringAge);
        var fade = 1 - ringAge / MUI_WINDUP_MS;
        var fadeSqrt = Math.sqrt(fade);

        if (i === 0) {
            // Main shockwave ring: bone white core with jade luminous halo
            if (gfx === 0 && !reduced) {
                // Outer jade glow halo
                ctx.strokeStyle = MUI_COLOR_JADE;
                ctx.lineWidth = 11;
                ctx.globalAlpha = 0.28 * fade;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0, r - 3), 0, MUI_TAU);
                ctx.stroke();

                // Space warp refractive inner rim contrast
                ctx.strokeStyle = MUI_COLOR_DARK;
                ctx.lineWidth = 2.2;
                ctx.globalAlpha = 0.42 * fade;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0, r - 5), 0, MUI_TAU);
                ctx.stroke();

                // Radial wavefront spoke crests
                var spokeCount = 14;
                var spokeRot = ringAge * 0.004;
                ctx.strokeStyle = MUI_COLOR_BONE;
                ctx.lineWidth = 1.4;
                ctx.globalAlpha = 0.55 * fade;
                for (var spIdx = 0; spIdx < spokeCount; spIdx++) {
                    var spAng = (spIdx / spokeCount) * MUI_TAU + spokeRot;
                    var spCos = Math.cos(spAng);
                    var spSin = Math.sin(spAng);
                    ctx.beginPath();
                    ctx.moveTo(spCos * (r - 7), spSin * (r - 7));
                    ctx.lineTo(spCos * (r + 7), spSin * (r + 7));
                    ctx.stroke();
                }
            }
            // Core bone white ring
            ctx.strokeStyle = MUI_COLOR_BONE;
            ctx.lineWidth = ringCount === 1 ? 2.5 : 4;
            ctx.globalAlpha = 0.98 * fadeSqrt;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, MUI_TAU);
            ctx.stroke();
        } else if (i === 1) {
            // First chasing ripple: primary jade echo ring
            ctx.strokeStyle = MUI_COLOR_JADE;
            ctx.lineWidth = 2.4;
            ctx.globalAlpha = 0.82 * fadeSqrt;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, MUI_TAU);
            ctx.stroke();
        } else {
            // Second chasing ripple: ancient bronze gold echo ring
            ctx.strokeStyle = MUI_COLOR_GOLD;
            ctx.lineWidth = 2.0;
            ctx.globalAlpha = 0.72 * fadeSqrt;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, MUI_TAU);
            ctx.stroke();
        }
    }

    // 5. Seamless visual handover to blades phase (age 420 to 620 ms)
    if (age >= 420 && age <= MUI_WINDUP_TAIL_MS) {
        var handProgress = (age - 420) / (MUI_WINDUP_TAIL_MS - 420);
        var handAlpha = (1 - handProgress) * (gfx < 2 && !reduced ? 0.65 : 0.4);
        if (handAlpha > 0.01) {
            // Soft residual jade halo stabilizing around ship
            ctx.save();
            ctx.globalAlpha = handAlpha;
            ctx.strokeStyle = MUI_COLOR_JADE;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, 0, 48 + handProgress * 22, 0, MUI_TAU);
            ctx.stroke();
            if (S && S.jadeGlow && gfx < 2 && !reduced) {
                var hSize = 88;
                ctx.globalAlpha = handAlpha * 0.45;
                ctx.drawImage(S.jadeGlow, -hSize / 2, -hSize / 2, hSize, hSize);
            }
            ctx.restore();
        }
    }

    ctx.restore();

    // 6. Draw active particle motes owned by N1 A (kinds 10..14)
    var fxPool = window._muiFx;
    if (fxPool) {
        var fxMax = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : fxPool.length;
        for (var fIdx = 0; fIdx < fxMax; fIdx++) {
            var fx = fxPool[fIdx];
            if (!fx || !fx.active) continue;
            var k = fx.kind;
            if (k < 10 || k > 14) continue;
            var p = _muiClamp(fx.age / fx.life, 0, 1);
            var inv = 1 - p;

            if (k === 10) {
                // Inhale suction mote: rushing inward towards ship center
                ctx.save();
                ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
                ctx.fillStyle = fx.seed > 0.5 ? MUI_COLOR_JADE : MUI_COLOR_BONE;
                ctx.globalAlpha = 0.88 * Math.sin(p * Math.PI);
                var moteR = Math.max(1, (fx.scale || 1) * 3.2 * inv);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, moteR, 0, MUI_TAU);
                ctx.fill();
                ctx.restore();
            } else if (k === 11) {
                // Inhale convergent ray streamer
                ctx.save();
                ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
                ctx.strokeStyle = MUI_COLOR_JADE;
                ctx.lineWidth = Math.max(1, (fx.scale || 1) * 2 * inv);
                ctx.globalAlpha = 0.72 * Math.sin(p * Math.PI);
                ctx.beginPath();
                ctx.moveTo(fx.x, fx.y);
                ctx.lineTo(fx.x - fx.vx * 24, fx.y - fx.vy * 24);
                ctx.stroke();
                ctx.restore();
            } else if (k === 12) {
                // Bloom burst spark: radiating outward with deceleration
                ctx.save();
                ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
                ctx.fillStyle = fx.seed > 0.35 ? MUI_COLOR_JADE : MUI_COLOR_GOLD;
                ctx.globalAlpha = 0.92 * inv;
                var sparkR = Math.max(1, (fx.scale || 1) * 3.5 * inv);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, sparkR, 0, MUI_TAU);
                ctx.fill();
                ctx.restore();
            } else if (k === 13) {
                // Shockwave crest spark
                ctx.save();
                ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
                ctx.fillStyle = MUI_COLOR_BONE;
                ctx.globalAlpha = 0.75 * inv;
                var crestR = Math.max(1, (fx.scale || 1) * 2.2 * inv);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, crestR, 0, MUI_TAU);
                ctx.fill();
                ctx.restore();
            } else if (k === 14) {
                // Chasing ripple spark
                ctx.save();
                ctx.globalCompositeOperation = gfx < 2 && !reduced ? 'lighter' : 'source-over';
                ctx.fillStyle = MUI_COLOR_GOLD;
                ctx.globalAlpha = 0.68 * inv;
                var ripR = Math.max(1, (fx.scale || 1) * 1.8 * inv);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, ripR, 0, MUI_TAU);
                ctx.fill();
                ctx.restore();
            }
        }
    }
}

function _drawMuiCall() {
    _drawMuiWindup();
}
