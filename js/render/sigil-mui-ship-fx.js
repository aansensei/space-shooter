// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) ship motion trails, countdown arc and departure motes visual renderer (fx kind 45 to 49).
if (typeof window !== 'undefined') {
    window._muiShipFxArcActive = true;
}

var _muiShipGhostCanvas = null;
var _muiPlumeGradNormal = null;
var _muiPlumeGradLegion = null;
var _muiPlumeCoreGrad = null;

var _muiShipFxState = {
    lastX: 0,
    lastY: 0,
    lastStampT: 0,
    lastPlumeT: 0,
    lastTickT: 0,
    lastRemainMs: 0,
    initialized: false
};

function _muiGetShipGhostSprite() {
    if (_muiShipGhostCanvas) return _muiShipGhostCanvas;
    var w = 56;
    var h = 56;
    var c = typeof _muiSurface === 'function' ? _muiSurface(w, h) : document.createElement('canvas');
    c.width = w;
    c.height = h;
    var g = c.getContext('2d');
    var cx = w * 0.5;
    var cy = h * 0.5;

    g.save();
    g.translate(cx, cy);

    g.strokeStyle = '#3DDBB0';
    g.lineWidth = 1.6;
    g.fillStyle = 'rgba(11, 59, 58, 0.45)';
    g.beginPath();
    g.moveTo(0, -22);
    g.lineTo(18, 14);
    g.lineTo(7, 18);
    g.lineTo(0, 11);
    g.lineTo(-7, 18);
    g.lineTo(-18, 14);
    g.closePath();
    g.fill();
    g.stroke();

    g.strokeStyle = '#EAF7F2';
    g.lineWidth = 1.0;
    g.beginPath();
    g.moveTo(0, -18);
    g.lineTo(0, 10);
    g.stroke();

    g.strokeStyle = 'rgba(61, 219, 176, 0.8)';
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(14, 12);
    g.moveTo(0, -6);
    g.lineTo(-14, 12);
    g.stroke();

    g.restore();
    _muiShipGhostCanvas = c;
    return c;
}

function _muiInitPlumeGrads(targetCtx) {
    if (_muiPlumeGradNormal) return;
    var gN = targetCtx.createLinearGradient(0, 0, 0, 20);
    gN.addColorStop(0, '#EAF7F2');
    gN.addColorStop(0.25, '#3DDBB0');
    gN.addColorStop(0.7, 'rgba(11, 59, 58, 0.4)');
    gN.addColorStop(1, 'rgba(11, 59, 58, 0)');
    _muiPlumeGradNormal = gN;

    var gL = targetCtx.createLinearGradient(0, 0, 0, 36);
    gL.addColorStop(0, '#FFFFFF');
    gL.addColorStop(0.2, '#EAF7F2');
    gL.addColorStop(0.5, '#3DDBB0');
    gL.addColorStop(0.8, 'rgba(11, 59, 58, 0.5)');
    gL.addColorStop(1, 'rgba(11, 59, 58, 0)');
    _muiPlumeGradLegion = gL;

    var gC = targetCtx.createLinearGradient(0, 0, 0, 16);
    gC.addColorStop(0, '#FFFFFF');
    gC.addColorStop(1, 'rgba(234, 247, 242, 0)');
    _muiPlumeCoreGrad = gC;
}

function _drawMuiShipFx() {
    if (typeof player === 'undefined' || !player) return;
    if (typeof _hasBuff !== 'function' || !_hasBuff('quy_mon_diem_quan')) return;

    var TAU = Math.PI * 2;
    var gfx = typeof _muiGfxTier === 'function' ? _muiGfxTier() : 0;
    var reduced = typeof _muiReducedMotion === 'function' ? _muiReducedMotion() : false;
    var S = typeof _muiSprites === 'function' ? _muiSprites() : null;
    var t = window._muiClock || 0;
    var remainMs = window._muiRemainMs || 0;
    var legionActive = remainMs > 0;
    var legionTotalMs = typeof MUI_LEGION_MS !== 'undefined' ? MUI_LEGION_MS : 5000;

    if (!_muiShipFxState.initialized) {
        _muiShipFxState.lastX = player.x;
        _muiShipFxState.lastY = player.y;
        _muiShipFxState.lastStampT = t;
        _muiShipFxState.lastPlumeT = t;
        _muiShipFxState.lastTickT = t;
        _muiShipFxState.lastRemainMs = remainMs;
        _muiShipFxState.initialized = true;
    }

    _muiInitPlumeGrads(ctx);

    var dx = player.x - _muiShipFxState.lastX;
    var dy = player.y - _muiShipFxState.lastY;
    var movedDist = Math.sqrt(dx * dx + dy * dy);

    // 1. Ghostly ship speed afterimages during haste movement (kind 46)
    if (gfx < 2 && !reduced) {
        var stampInterval = legionActive ? 42 : 72;
        var distThresh = legionActive ? 3.5 : 6.0;
        if ((movedDist >= distThresh || (legionActive && movedDist > 1.0)) && (t - _muiShipFxState.lastStampT >= stampInterval)) {
            _muiShipFxState.lastStampT = t;
            _muiShipFxState.lastX = player.x;
            _muiShipFxState.lastY = player.y;
            if (typeof _muiEmitFxHelper === 'function') {
                _muiEmitFxHelper(46, player.x, player.y, legionActive ? 320 : 220, 1.0, 0, player.vx * 0.05 || 0, player.vy * 0.05 || 0);
            }
        }
    }

    // 2. Dual jade engine thruster trail plumes (continuous draw plus kind 47 sparks)
    var flameH = legionActive ? (reduced ? 26 : 34 + Math.sin(t * 0.08) * 3) : (reduced ? 14 : 18 + Math.sin(t * 0.06) * 2);
    ctx.save();
    ctx.globalCompositeOperation = gfx < 2 ? 'lighter' : 'source-over';

    // Left nozzle at (-6, 26) relative to player
    ctx.save();
    ctx.translate(player.x - 6, player.y + 26);
    ctx.fillStyle = legionActive ? _muiPlumeGradLegion : _muiPlumeGradNormal;
    ctx.beginPath();
    var jitterL = reduced ? 0 : Math.sin(t * 0.09) * 1.5;
    ctx.moveTo(-2.8, 0);
    ctx.quadraticCurveTo(jitterL, flameH * 0.5, 0, flameH);
    ctx.lineTo(2.8, 0);
    ctx.closePath();
    ctx.fill();
    if (gfx === 0 && _muiPlumeCoreGrad) {
        ctx.fillStyle = _muiPlumeCoreGrad;
        ctx.beginPath();
        ctx.moveTo(-1.2, 0);
        ctx.lineTo(0, flameH * 0.5);
        ctx.lineTo(1.2, 0);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // Right nozzle at (+6, 26) relative to player
    ctx.save();
    ctx.translate(player.x + 6, player.y + 26);
    ctx.fillStyle = legionActive ? _muiPlumeGradLegion : _muiPlumeGradNormal;
    ctx.beginPath();
    var jitterR = reduced ? 0 : Math.sin(t * 0.09 + 2.1) * 1.5;
    ctx.moveTo(-2.8, 0);
    ctx.quadraticCurveTo(jitterR, flameH * 0.5, 0, flameH);
    ctx.lineTo(2.8, 0);
    ctx.closePath();
    ctx.fill();
    if (gfx === 0 && _muiPlumeCoreGrad) {
        ctx.fillStyle = _muiPlumeCoreGrad;
        ctx.beginPath();
        ctx.moveTo(-1.2, 0);
        ctx.lineTo(0, flameH * 0.5);
        ctx.lineTo(1.2, 0);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    ctx.restore();

    // Emit thruster plume motes (kind 47)
    if (gfx < 2 && !reduced && t - _muiShipFxState.lastPlumeT >= (legionActive ? 38 : 75)) {
        _muiShipFxState.lastPlumeT = t;
        if (typeof _muiEmitFxHelper === 'function') {
            var side = (window._muiFxSeq || 0) % 2 === 0 ? -6 : 6;
            var sparkVx = (Math.sin(t * 0.02) * 0.04) + ((Math.random ? Math.random() : 0.5) - 0.5) * 0.03;
            var sparkVy = (legionActive ? 0.16 : 0.10) + ((Math.random ? Math.random() : 0.5) * 0.06);
            _muiEmitFxHelper(47, player.x + side, player.y + 26, legionActive ? 260 : 180, 1.0, 0, sparkVx, sparkVy);
        }
    }

    // 3. Exquisite countdown arc over ship with mini bead counters for remaining Legion time
    if (legionActive) {
        var frac = typeof _muiClamp === 'function' ? _muiClamp(remainMs / legionTotalMs, 0, 1) : Math.max(0, Math.min(1, remainMs / legionTotalMs));
        var arcR = (player.width || 44) * 0.95 + 10;
        var SPAN = Math.PI * 1.25;
        var START_ANG = -Math.PI / 2 - SPAN * 0.5;
        var END_ANG = -Math.PI / 2 + SPAN * 0.5;
        var activeEndAng = START_ANG + frac * SPAN;

        ctx.save();

        // Faint underlying track with ancient bronze tint
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = '#C9A24A';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(player.x, player.y, arcR, START_ANG, END_ANG);
        ctx.stroke();

        // Secondary inner guide track
        if (gfx === 0) {
            ctx.globalAlpha = 0.18;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.arc(player.x, player.y, arcR - 3.5, START_ANG, END_ANG);
            ctx.stroke();
        }

        // Active countdown arc
        if (frac > 0.001) {
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

            // Outer jade glow halo
            ctx.globalAlpha = 0.85;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = gfx === 0 ? 3.4 : 2.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(player.x, player.y, arcR, START_ANG, activeEndAng);
            ctx.stroke();

            // Inner bone white core filament
            ctx.globalAlpha = 0.95;
            ctx.strokeStyle = '#EAF7F2';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, arcR, START_ANG, activeEndAng);
            ctx.stroke();

            // Tip cursor bead
            var tipX = player.x + Math.cos(activeEndAng) * arcR;
            var tipY = player.y + Math.sin(activeEndAng) * arcR;
            if (gfx < 2 && S && S.jadeGlow) {
                ctx.globalAlpha = 0.8;
                ctx.drawImage(S.jadeGlow, tipX - 10, tipY - 10, 20, 20);
            }
            ctx.fillStyle = '#EAF7F2';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2.6, 0, TAU);
            ctx.fill();

            // Emit tick motes (kind 45) from tip
            if (gfx < 2 && !reduced && t - _muiShipFxState.lastTickT >= 130) {
                _muiShipFxState.lastTickT = t;
                if (typeof _muiEmitFxHelper === 'function') {
                    _muiEmitFxHelper(45, tipX, tipY, 340, 1.0, 0, 0, -0.04);
                }
            }
        }

        // 5 Mini bead counters along the arc for remaining seconds
        var orbImg = typeof _muiFxImg === 'function' ? _muiFxImg('iron-orb') : null;
        for (var b = 0; b < 5; b++) {
            var beadFrac = (b + 1) / 5;
            var beadAng = START_ANG + beadFrac * SPAN;
            var bx = player.x + Math.cos(beadAng) * arcR;
            var by = player.y + Math.sin(beadAng) * arcR;
            var beadThreshold = (b + 1) * 1000;
            var isLit = remainMs >= beadThreshold - 950;
            var isCurrent = isLit && remainMs < beadThreshold + 50;

            if (isLit) {
                var beadPulse = isCurrent && !reduced ? (0.8 + 0.25 * Math.sin(t * 0.012)) : 1.0;
                if (gfx < 2 && S && S.jadeGlow) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.65 * beadPulse;
                    ctx.drawImage(S.jadeGlow, bx - 8, by - 8, 16, 16);
                    ctx.restore();
                }
                if (orbImg) {
                    ctx.globalAlpha = 0.9 * beadPulse;
                    ctx.drawImage(orbImg, bx - 5, by - 5, 10, 10);
                } else {
                    ctx.globalAlpha = 0.95;
                    ctx.fillStyle = '#3DDBB0';
                    ctx.beginPath();
                    ctx.arc(bx, by, 3.2 * beadPulse, 0, TAU);
                    ctx.fill();
                    ctx.fillStyle = '#EAF7F2';
                    ctx.beginPath();
                    ctx.arc(bx, by, 1.5 * beadPulse, 0, TAU);
                    ctx.fill();
                }
            } else {
                // Expired bead: faint celestial socket
                ctx.globalAlpha = 0.32;
                ctx.fillStyle = '#0B3B3A';
                ctx.beginPath();
                ctx.arc(bx, by, 2.0, 0, TAU);
                ctx.fill();
                ctx.strokeStyle = '#3DDBB0';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.arc(bx, by, 2.8, 0, TAU);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // 4. Graceful spirit dissipation particle effect when Legion concludes naturally
    if (_muiShipFxState.lastRemainMs > 0 && remainMs <= 0) {
        if (_muiShipFxState.lastRemainMs <= 150 && (window._muiClock || 0) > 2000) {
            // Legion concluded this frame! Emit dissipation motes (kind 48) and departure ring (kind 49)
            var moteCount = gfx === 0 ? 16 : (gfx === 1 ? 10 : 6);
            if (typeof _muiEmitFxHelper === 'function') {
                for (var m = 0; m < moteCount; m++) {
                    var mAng = (m / moteCount) * TAU + ((Math.random ? Math.random() : 0.5) - 0.5) * 0.4;
                    var mSpeed = 0.06 + ((Math.random ? Math.random() : 0.5) * 0.12);
                    var mvx = Math.cos(mAng) * mSpeed * 0.7;
                    var mvy = Math.sin(mAng) * mSpeed * 0.5 - 0.08;
                    var mLife = 650 + ((Math.random ? Math.random() : 0.5) * 260);
                    var mScale = 0.8 + ((Math.random ? Math.random() : 0.5) * 0.6);
                    var offsetX = Math.cos(mAng) * 16;
                    var offsetY = Math.sin(mAng) * 12;
                    _muiEmitFxHelper(48, player.x + offsetX, player.y + offsetY, mLife, mScale, 0, mvx, mvy);
                }
                _muiEmitFxHelper(49, player.x, player.y, 480, 1.0, 0, 0, 0);
            }
        }
    }
    _muiShipFxState.lastRemainMs = remainMs;

    // 5. Render active FX pool items for kinds 45 to 49
    if (typeof window !== 'undefined' && window._muiFx) {
        var fxPool = window._muiFx;
        var maxFx = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : fxPool.length;
        var ghostImg = _muiGetShipGhostSprite();

        for (var i = 0; i < maxFx; i++) {
            var fx = fxPool[i];
            if (!fx || !fx.active) continue;
            var kind = fx.kind;
            if (kind < 45 || kind > 49) continue;

            var p = typeof _muiClamp === 'function' ? _muiClamp(fx.age / fx.life, 0, 1) : Math.max(0, Math.min(1, fx.age / fx.life));

            if (kind === 46) {
                // Ghostly ship speed afterimage stamp
                var afterAlpha = (1 - p) * (gfx === 0 ? 0.46 : 0.32);
                if (afterAlpha > 0.01) {
                    ctx.save();
                    if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = afterAlpha;
                    if (gfx === 0 && S && S.jadeGlow) {
                        ctx.drawImage(S.jadeGlow, fx.x - 24, fx.y - 24, 48, 48);
                    }
                    if (ghostImg) {
                        ctx.drawImage(ghostImg, fx.x - 28, fx.y - 28);
                    }
                    ctx.restore();
                }
            } else if (kind === 45) {
                // Countdown tick spark mote
                var tickAlpha = (1 - p) * 0.85;
                ctx.save();
                if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = tickAlpha;
                ctx.fillStyle = '#EAF7F2';
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, (1 - p * 0.5) * 2.2, 0, TAU);
                ctx.fill();
                ctx.restore();
            } else if (kind === 47) {
                // Thruster plume flame particle
                var plumeAlpha = (1 - p) * 0.72;
                var plumeR = (1 - p) * (gfx === 0 ? 3.4 : 2.4);
                ctx.save();
                if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = plumeAlpha;
                ctx.fillStyle = '#3DDBB0';
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, plumeR, 0, TAU);
                ctx.fill();
                if (gfx === 0) {
                    ctx.fillStyle = '#EAF7F2';
                    ctx.beginPath();
                    ctx.arc(fx.x, fx.y, plumeR * 0.45, 0, TAU);
                    ctx.fill();
                }
                ctx.restore();
            } else if (kind === 48) {
                // Spirit dissipation mote
                var dissAlpha = Math.sin(p * Math.PI) * 0.88;
                var driftX = Math.sin(fx.seed + fx.age * 0.007) * (7.0 * p);
                var motX = fx.x + driftX;
                var motY = fx.y;
                var motR = (1 - p * 0.35) * (fx.scale || 1.0) * 3.2;

                ctx.save();
                if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = dissAlpha;
                if (gfx === 0 && S && S.jadeGlow) {
                    ctx.drawImage(S.jadeGlow, motX - 10, motY - 10, 20, 20);
                }
                ctx.fillStyle = '#EAF7F2';
                ctx.beginPath();
                ctx.arc(motX, motY, motR * 0.55, 0, TAU);
                ctx.fill();
                ctx.fillStyle = '#3DDBB0';
                ctx.beginPath();
                ctx.arc(motX, motY, motR, 0, TAU);
                ctx.fill();
                ctx.restore();
            } else if (kind === 49) {
                // Departure expanding aura ring
                var depAlpha = (1 - p) * 0.65;
                var depRad = 16 + p * 68;
                ctx.save();
                if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = depAlpha;
                ctx.strokeStyle = '#3DDBB0';
                ctx.lineWidth = 2.2 * (1 - p * 0.5);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, depRad, 0, TAU);
                ctx.stroke();
                if (gfx === 0) {
                    ctx.strokeStyle = '#EAF7F2';
                    ctx.lineWidth = 1.0 * (1 - p);
                    ctx.beginPath();
                    ctx.arc(fx.x, fx.y, depRad * 0.82, 0, TAU);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
    }
}
