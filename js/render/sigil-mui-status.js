// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) enemy status, hold and slow effects visual renderer (fx kind 35..39).

var _muiLastStatusFxFrame = -1;
var _muiTalismanCache = null;

function _muiGetTalismanSurface() {
    if (_muiTalismanCache) return _muiTalismanCache;
    var w = 64, h = 112;
    var c = _muiSurface(w, h);
    var g = c.getContext('2d');
    var cx = w * 0.5;

    var bw = 48, bh = 84;
    var bx = (w - bw) * 0.5;
    var by = 16;

    // Background parchment
    g.fillStyle = 'rgba(11, 59, 58, 0.92)';
    g.fillRect(bx, by, bw, bh);

    // Bronze outer border
    g.strokeStyle = '#C9A24A';
    g.lineWidth = 2.2;
    g.strokeRect(bx, by, bw, bh);

    // Jade inner border
    g.strokeStyle = '#3DDBB0';
    g.lineWidth = 1.2;
    g.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Hanging cap
    g.fillStyle = '#C9A24A';
    g.fillRect(cx - 16, by - 5, 32, 5);

    // Hanging loop
    g.strokeStyle = '#C9A24A';
    g.lineWidth = 1.8;
    g.beginPath();
    g.arc(cx, by - 6, 4.5, 0, MUI_TAU);
    g.stroke();

    // Three celestial star dots
    g.fillStyle = '#EAF7F2';
    g.beginPath();
    g.arc(cx, by + 14, 2.2, 0, MUI_TAU);
    g.arc(cx - 6, by + 22, 1.8, 0, MUI_TAU);
    g.arc(cx + 6, by + 22, 1.8, 0, MUI_TAU);
    g.fill();

    // Mystic lightning thunder ward rune (Loi Phu)
    g.strokeStyle = '#3DDBB0';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(cx - 7, by + 32);
    g.lineTo(cx + 7, by + 40);
    g.lineTo(cx - 5, by + 47);
    g.lineTo(cx + 6, by + 54);
    g.lineTo(cx, by + 62);
    g.stroke();

    // Cinnabar bronze seal stamp
    var sw = 22, sh = 22;
    var sx = (w - sw) * 0.5;
    var sy = by + bh - sw - 5;
    g.fillStyle = 'rgba(201, 162, 74, 0.95)';
    g.fillRect(sx, sy, sw, sh);

    g.strokeStyle = '#0B3B3A';
    g.lineWidth = 1.4;
    g.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
    g.beginPath();
    g.moveTo(cx, sy + 3);
    g.lineTo(cx, sy + sh - 3);
    g.moveTo(sx + 4, sy + sh * 0.5);
    g.lineTo(sx + sw - 4, sy + sh * 0.5);
    g.stroke();

    _muiTalismanCache = c;
    return c;
}

function _drawMuiStatusFx() {
    if (typeof window === 'undefined' || !window._muiFx) return;
    var frame = window._muiClock || 0;
    if (frame === _muiLastStatusFxFrame) return;
    _muiLastStatusFxFrame = frame;

    var fxPool = window._muiFx;
    var fxMax = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : fxPool.length;
    var gfx = _muiGfxTier();
    var reduced = _muiReducedMotion();
    var S = _muiSprites();

    for (var i = 0; i < fxMax; i++) {
        var fx = fxPool[i];
        if (!fx || !fx.active) continue;
        var k = fx.kind;
        if (k < 35 || k > 39) continue;

        var p = _muiClamp(fx.age / fx.life, 0, 1);

        if (k === 35) {
            // Kind 35: Enemy zone entry greeting water ripple
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.scale(1, 0.42);
            var r1 = fx.scale * (0.28 + 1.45 * _muiEaseOutQuad(p));
            var alpha1 = (1 - p) * 0.85;

            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha1;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = Math.max(1, 2.4 * (1 - p * 0.5));
            ctx.beginPath();
            ctx.arc(0, 0, r1, 0, MUI_TAU);
            ctx.stroke();

            if (p > 0.12) {
                var pSub = (p - 0.12) / 0.88;
                var r2 = fx.scale * (0.18 + 0.95 * _muiEaseOutQuad(pSub));
                ctx.globalAlpha = (1 - pSub) * 0.6;
                ctx.strokeStyle = '#EAF7F2';
                ctx.lineWidth = Math.max(1, 1.4 * (1 - pSub));
                ctx.beginPath();
                ctx.arc(0, 0, r2, 0, MUI_TAU);
                ctx.stroke();
            }
            ctx.restore();
        } else if (k === 37) {
            // Kind 37: Dominant hold chain shattering shards
            ctx.save();
            ctx.translate(fx.x, fx.y);
            var spin = (fx.angle || 0) + fx.age * 0.014;
            ctx.rotate(spin);
            var alphaShard = (1 - p) * 0.92;
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alphaShard;

            var shardColor = (fx.seed > 0.5) ? '#3DDBB0' : '#EAF7F2';
            ctx.fillStyle = shardColor;
            var sw = 6.5 * (1 - p * 0.4);
            var sh = 3.0 * (1 - p * 0.3);
            ctx.fillRect(-sw * 0.5, -sh * 0.5, sw, sh);

            ctx.strokeStyle = '#0B3B3A';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(-sw * 0.5, -sh * 0.5, sw, sh);
            ctx.restore();
        } else if (k === 38) {
            // Kind 38: Floating talisman seal stamp pulse spark
            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            var alphaTal = (1 - p) * 0.8;
            ctx.globalAlpha = alphaTal;
            var radTal = fx.scale * (0.8 + p * 0.8);
            ctx.strokeStyle = '#C9A24A';
            ctx.lineWidth = 1.2 * (1 - p);
            ctx.beginPath();
            ctx.arc(0, 0, radTal, 0, MUI_TAU);
            ctx.stroke();
            ctx.restore();
        } else if (k === 39 && gfx < 2) {
            // Kind 39: Slow phase jade mist mote
            ctx.save();
            ctx.translate(fx.x, fx.y);
            var alphaMist = (1 - p) * 0.32;
            ctx.globalAlpha = alphaMist;
            var szMist = fx.scale * (1.0 + p * 1.4);
            if (S && S.mist) {
                ctx.drawImage(S.mist, -szMist * 0.5, -szMist * 0.3, szMist, szMist * 0.6);
            } else {
                ctx.fillStyle = '#0B3B3A';
                ctx.beginPath();
                ctx.arc(0, 0, szMist * 0.4, 0, MUI_TAU);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

function _drawMuiEnemyStatus(enemy) {
    if (!enemy || enemy.hp <= 0) return;
    var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    var rooted = enemy._muiHoldMs > 0;
    var slowed = !rooted && enemy._muiSlowEnd > now;
    var flashed = enemy._muiHitFlashMs > 0;

    // Detect zone entry for greeting water ripple (kind 35)
    var inZone = (enemy._muiArrayUntil || 0) > now;
    if (inZone && !enemy._muiInZone) {
        enemy._muiInZone = true;
        var footYEntry = enemy.y + Math.max(14, (enemy.size || 40) * 0.5) * 0.72;
        _muiEmitFxHelper(35, enemy.x, footYEntry, 450, Math.max(14, (enemy.size || 40) * 0.5), 0, 0, 0);
    } else if (!inZone && enemy._muiInZone) {
        enemy._muiInZone = false;
    }

    if (window._muiClock === 0 || (!rooted && (window._muiRemainMs || 0) === 0 && (window._muiWindupMs || 0) === 0)) {
        enemy._muiWasRooted = false;
        enemy._muiInZone = false;
    }

    // Detect hold transition for chain shattering shards (kind 37)
    if (enemy._muiWasRooted && !rooted) {
        enemy._muiWasRooted = false;
        var rShatter = Math.max(14, (enemy.size || 40) * 0.5);
        var footYShatter = enemy.y + rShatter * 0.72;
        var shardCount = _muiGfxTier() === 0 ? 8 : 5;
        for (var k = 0; k < shardCount; k++) {
            var ang = k * (MUI_TAU / shardCount) + (Math.random() - 0.5) * 0.3;
            var spd = 0.12 + Math.random() * 0.15;
            var vx = Math.cos(ang) * spd;
            var vy = Math.sin(ang) * spd * 0.45 - 0.05;
            _muiEmitFxHelper(37, enemy.x + Math.cos(ang) * (rShatter * 1.05), footYShatter + Math.sin(ang) * (rShatter * 0.35), 420 + Math.random() * 160, 1.0, ang, vx, vy);
        }
    } else if (rooted) {
        enemy._muiWasRooted = true;
    }

    // Render active status FX particles once per frame
    _drawMuiStatusFx();

    if (!rooted && !slowed && !flashed) return;

    var S = _muiSprites();
    var gfx = _muiGfxTier();
    var reduced = _muiReducedMotion();
    var t = window._muiClock || 0;
    var r = Math.max(14, (enemy.size || 40) * 0.5);
    var footY = enemy.y + r * 0.72;

    // 1. Slowed phase: spiritual afterimages, clinging jade mist, and sluggish trail
    if (slowed) {
        var slowRemain = enemy._muiSlowEnd - now;
        var slowFade = _muiClamp(slowRemain / 400, 0, 1);

        // Spiritual afterimages trailing enemy movement
        if (gfx < 2 && !reduced) {
            var mdx = (enemy.x - (enemy._muiPrevX !== undefined ? enemy._muiPrevX : enemy.x));
            var mdy = (enemy.y - (enemy._muiPrevY !== undefined ? enemy._muiPrevY : enemy.y));
            var mdist = Math.hypot(mdx, mdy);
            var ndx = mdist > 0.1 ? (mdx / mdist) : 0;
            var ndy = mdist > 0.1 ? (mdy / mdist) : 1;

            ctx.save();
            ctx.translate(enemy.x - ndx * 12, enemy.y - ndy * 12);
            ctx.globalAlpha = 0.22 * slowFade;
            ctx.fillStyle = '#0B3B3A';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.94, 0, MUI_TAU);
            ctx.fill();
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            if (gfx === 0) {
                ctx.translate(-ndx * 10, -ndy * 10);
                ctx.globalAlpha = 0.11 * slowFade;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.86, 0, MUI_TAU);
                ctx.fill();
            }
            ctx.restore();

            if (!enemy._muiNextMist || now >= enemy._muiNextMist) {
                enemy._muiNextMist = now + 140;
                _muiEmitFxHelper(39, enemy.x + (Math.random() - 0.5) * r * 0.8, footY + (Math.random() - 0.5) * 4, 550, r * 0.7, 0, -ndx * 0.015, -ndy * 0.015);
            }
        }
        enemy._muiPrevX = enemy.x;
        enemy._muiPrevY = enemy.y;

        // Dark teal dimming under foot
        ctx.save();
        ctx.globalAlpha = 0.28 * slowFade;
        ctx.fillStyle = '#0B3B3A';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r * 0.96, 0, MUI_TAU);
        ctx.fill();

        // Clinging jade mist at base
        if (gfx < 2 && S && S.mist) {
            ctx.globalAlpha = 0.44 * slowFade;
            var mw = r * 2.6;
            var mh = mw * 0.44;
            var shift1 = (t * 0.018) % 24;
            ctx.drawImage(S.mist, enemy.x - mw * 0.5 + shift1 - 12, footY - mh * 0.5, mw, mh);
            if (gfx === 0) {
                ctx.globalAlpha = 0.26 * slowFade;
                var shift2 = (-t * 0.022) % 24;
                ctx.drawImage(S.mist, enemy.x - mw * 0.45 + shift2 - 12, footY - mh * 0.4, mw * 0.9, mh * 0.8);
            }
        }
        ctx.restore();
    }

    // 2. Rooted (Dominant hold): tightening spectral locking chains, fracturing, and talisman seal stamp
    if (rooted) {
        var holdMs = enemy._muiHoldMs;
        var fade = _muiClamp(holdMs / 200, 0, 1);
        var totalHold = typeof MUI_ROOT_MS !== 'undefined' ? MUI_ROOT_MS : 1500;
        var elapsedHold = Math.max(0, totalHold - holdMs);

        // Tightening phase: first 150ms tightening from wide to snug lock
        var tightenFrac = _muiClamp(elapsedHold / 150, 0, 1);
        var easeTighten = _muiEaseOutQuad(tightenFrac);
        var rx = r * (2.1 - 0.95 * easeTighten);
        var ry = Math.max(8, rx * 0.38);

        // Fracturing phase: last 300ms of hold
        var fracturing = holdMs < 300;
        var fracP = fracturing ? (1 - holdMs / 300) : 0;
        var fractureJitter = fracturing && !reduced ? ((Math.sin(t * 0.09) > 0 ? 1.4 : -1.4) * fracP) : 0;

        ctx.save();
        ctx.globalAlpha = 0.9 * fade;
        if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

        var ringImg = _muiFxImg('root-ring');
        var rot = t * 0.0035;

        if (ringImg) {
            var rs = rx * 2.5;
            ctx.save();
            ctx.translate(enemy.x + fractureJitter, footY);
            ctx.scale(1, 0.42);
            ctx.rotate(rot);
            ctx.drawImage(ringImg, -rs * 0.5, -rs * 0.5, rs, rs);
            ctx.restore();
        }

        // Procedural locking chains and runes
        ctx.save();
        ctx.translate(enemy.x + fractureJitter, footY);

        // Outer jade locking chain ellipse
        ctx.strokeStyle = fracturing && Math.sin(t * 0.08) > 0.2 ? '#EAF7F2' : '#3DDBB0';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([7, 4]);
        ctx.lineDashOffset = -t * 0.04;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, MUI_TAU);
        ctx.stroke();

        // Inner bone white vortex arc
        ctx.setLineDash([]);
        ctx.strokeStyle = '#EAF7F2';
        ctx.lineWidth = 1.4;
        var arcRot = rot * 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.68, ry * 0.68, 0, arcRot, arcRot + Math.PI * 1.15);
        ctx.stroke();

        // 4 locking chain anchor pins at quarterly angles batched in one path
        ctx.beginPath();
        for (var k = 0; k < 4; k++) {
            var pinAng = arcRot * 0.8 + k * (Math.PI * 0.5);
            var pinX = Math.cos(pinAng) * rx;
            var pinY = Math.sin(pinAng) * ry;
            ctx.moveTo(pinX + 2.6, pinY);
            ctx.arc(pinX, pinY, 2.6, 0, MUI_TAU);
        }
        ctx.fillStyle = '#C9A24A';
        ctx.fill();

        // Tier 0 3D torso wrap chains
        if (gfx === 0 && !reduced && tightenFrac >= 0.8) {
            ctx.strokeStyle = 'rgba(61, 219, 176, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([6, 3]);
            ctx.lineDashOffset = t * 0.03;
            ctx.beginPath();
            ctx.moveTo(-rx * 0.7, 0);
            ctx.quadraticCurveTo(-rx * 0.4, -r * 0.8, 0, -r * 0.6);
            ctx.quadraticCurveTo(rx * 0.4, -r * 0.4, rx * 0.7, 0);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Stress fracture crack lines during final 300ms
        if (fracturing && gfx < 2) {
            ctx.strokeStyle = 'rgba(234, 247, 242, ' + (0.6 + 0.4 * Math.sin(t * 0.07)) + ')';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-rx * 0.6, -ry * 0.2);
            ctx.lineTo(-rx * 0.3, ry * 0.4);
            ctx.lineTo(0, -ry * 0.3);
            ctx.lineTo(rx * 0.5, ry * 0.3);
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();

        // 3. Talisman seal stamp floating above held enemy head
        var headY = enemy.y - r * 1.2;
        var bob = reduced ? 0 : Math.sin(t * 0.0055 + enemy.x * 0.08) * 3.5;
        var talY = headY + bob;
        var talW = _muiClamp(r * 0.72, 22, 36);
        var talH = talW * 1.75;

        ctx.save();
        // Soft jade aura behind talisman
        if (gfx < 2 && S && S.jadeGlow) {
            ctx.globalCompositeOperation = 'lighter';
            var auraPulse = reduced ? 0.45 : (0.4 + 0.25 * Math.sin(t * 0.008));
            ctx.globalAlpha = auraPulse * fade;
            ctx.drawImage(S.jadeGlow, enemy.x - talW * 1.2, talY - talH * 0.75, talW * 2.4, talH * 2.0);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.globalAlpha = 0.92 * fade;
        var talSurf = _muiGetTalismanSurface();
        ctx.drawImage(talSurf, enemy.x - talW * 0.5, talY - talH * 0.5, talW, talH);

        // Spiritual tether line descending to enemy head
        if (gfx < 2) {
            ctx.strokeStyle = 'rgba(61, 219, 176, 0.42)';
            ctx.lineWidth = 1.0;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.moveTo(enemy.x, talY + talH * 0.5);
            ctx.lineTo(enemy.x, enemy.y - r * 0.4);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    // 4. Short jade flash from soul blade hit or windup wave
    if (flashed) {
        var fp = _muiClamp(enemy._muiHitFlashMs / 150, 0, 1);
        ctx.save();
        if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fp * 0.65;
        ctx.strokeStyle = '#EAF7F2';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r * (1.02 + (1 - fp) * 0.2), 0, MUI_TAU);
        ctx.stroke();
        if (gfx < 2 && S && S.jadeGlow) {
            ctx.globalAlpha = fp * 0.42;
            ctx.drawImage(S.jadeGlow, enemy.x - r * 1.2, enemy.y - r * 1.2, r * 2.4, r * 2.4);
        }
        ctx.restore();
    }
}

function _drawMuiStatus(enemy) {
    if (enemy) {
        _drawMuiEnemyStatus(enemy);
    } else {
        _drawMuiStatusFx();
    }
}
