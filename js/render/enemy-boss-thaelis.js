// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/enemy-boss-thaelis.js — extracted from render.js (Apostle/Thaelis boss
// visuals). Calls drawPolygon() from fx.js.

// Static-bitmap cache for Thaelis's 2 counter-rotating polygons and its
// center core - none of them ever change shape or color (unlike the
// apostle, Thaelis has no HP-driven hue), only their rotation animates, so
// each bakes once as a single global bitmap and gets ctx.rotate() applied
// live at blit time. Halo, the 6 orbiting dots, and the low-HP glow stay
// live (see _drawThaelisOrbitDots below for why the dots specifically
// can't use this trick); the Tenacity Barrier ring stays live since it
// tracks real per-instance shield state, not a time cycle.
let _thaelisOuterPolySprite = null, _thaelisInnerPolySprite = null, _thaelisCoreSprite = null;
// Baked oversized (real Thaelis radius maxes out around 75px - baseSize up
// to 30, size = baseSize*5, r = size/2) so every blit downscales instead of
// upscaling a low-res bitmap, which is what caused the jagged/blurry edges.
// _THAELIS_OVERSAMPLE scales every ABSOLUTE (non-r-relative) pixel value
// baked below - line widths, shadowBlur radii, dot sizes, small fixed
// offsets - by the same ratio the reference radius was inflated by, so a
// Thaelis at the typical real size (~62.5, the midpoint of 50-75) comes out
// pixel-identical to the original un-cached numbers after downscaling.
const _THAELIS_REF_R = 150;
const _THAELIS_TYPICAL_R = 62.5;
const _THAELIS_OVERSAMPLE = _THAELIS_REF_R / _THAELIS_TYPICAL_R;
function _bakePolygonLocal(c, radius, sides, color1, color2) {
    const grad = c.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    c.fillStyle = grad;
    c.strokeStyle = color1; c.lineWidth = 2 * _THAELIS_OVERSAMPLE; c.globalAlpha = 0.6;
    c.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const px = radius * Math.cos(angle), py = radius * Math.sin(angle);
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.closePath(); c.fill();
    c.globalAlpha = 1;
    c.stroke();
}
function _getThaelisOuterPolySprite() {
    if (_thaelisOuterPolySprite) return _thaelisOuterPolySprite;
    const pad = Math.ceil(_THAELIS_REF_R * 1.2);
    const off = document.createElement('canvas');
    off.width = off.height = pad * 2;
    const c = off.getContext('2d');
    c.translate(pad, pad);
    _bakePolygonLocal(c, _THAELIS_REF_R, 8, '#FFD700', '#FFA500');
    _thaelisOuterPolySprite = { canvas: off, pad, r: _THAELIS_REF_R };
    return _thaelisOuterPolySprite;
}
function _getThaelisInnerPolySprite() {
    if (_thaelisInnerPolySprite) return _thaelisInnerPolySprite;
    const rr = _THAELIS_REF_R * 0.55;
    const pad = Math.ceil(rr * 1.2);
    const off = document.createElement('canvas');
    off.width = off.height = pad * 2;
    const c = off.getContext('2d');
    c.translate(pad, pad);
    _bakePolygonLocal(c, rr, 8, '#FFA500', '#FFD700');
    _thaelisInnerPolySprite = { canvas: off, pad, r: _THAELIS_REF_R }; // scaled against the OUTER reference radius so both layers share one scale factor
    return _thaelisInnerPolySprite;
}
function _getThaelisCoreSprite() {
    if (_thaelisCoreSprite) return _thaelisCoreSprite;
    const rr = _THAELIS_REF_R * 0.28;
    const pad = Math.ceil(rr * 1.15);
    const off = document.createElement('canvas');
    off.width = off.height = pad * 2;
    const c = off.getContext('2d');
    c.translate(pad, pad);
    const cg = c.createRadialGradient(0, 0, 0, 0, 0, rr);
    cg.addColorStop(0, 'white'); cg.addColorStop(0.5, '#FFD700'); cg.addColorStop(1, '#FFA500');
    c.fillStyle = cg;
    c.shadowColor = '#FFD700'; c.shadowBlur = 15 * _THAELIS_OVERSAMPLE;
    c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2); c.fill();
    _thaelisCoreSprite = { canvas: off, pad, r: _THAELIS_REF_R };
    return _thaelisCoreSprite;
}
// Orbit dots sit at r+18 - a CONSTANT offset from the body radius, not a
// multiple of it. A cached bitmap can only be scaled uniformly, so baking
// this at a reference size and scaling it for every real Thaelis size (r
// varies 50-75) drifts the dots away from where the low-HP glow ring (still
// live, r+12..r+22) expects them to sit - the "dots should touch the glow
// edge" relationship only survives at one calibration size. Left live,
// exactly matching the original formula; 6 small circle fills were never
// the expensive part of this draw anyway.
function _drawThaelisOrbitDots(enemy, rotation) {
    const r = enemy.size / 2;
    const orbitR2 = r + 18;
    if (!_mobPerf) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10; }
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 6; i++) {
        const a = rotation + (i / 6) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(enemy.x + Math.cos(a) * orbitR2, enemy.y + Math.sin(a) * orbitR2, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
}
function _blitThaelisSprite(spr, enemy, rotation, alpha) {
    const s = (enemy.size / 2) / spr.r;
    if (alpha !== undefined) { ctx.save(); ctx.globalAlpha = alpha; }
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (rotation) ctx.rotate(rotation);
    ctx.drawImage(spr.canvas, -spr.pad * s, -spr.pad * s, spr.canvas.width * s, spr.canvas.height * s);
    ctx.restore();
    if (alpha !== undefined) ctx.restore();
}

function _drawBossOrThaelis(enemy) {
    const now = performance.now();
    const isBoss = enemy.type === 'dargruel';

    // Thaelis keeps old render
    if (!isBoss) {
        const rotSpeed = 3000;
        const rotation = now / rotSpeed;
        const color1 = '#FFD700';
        const r = enemy.size / 2;

        const haloAlpha = 0.15 + 0.1 * Math.abs(Math.sin(now / 400));
        ctx.save();
        ctx.fillStyle = `rgba(255,200,0,${haloAlpha})`;
        if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        _blitThaelisSprite(_getThaelisOuterPolySprite(), enemy, rotation);
        _blitThaelisSprite(_getThaelisInnerPolySprite(), enemy, -rotation * 1.3, 0.55);
        _blitThaelisSprite(_getThaelisCoreSprite(), enemy, 0);
        const hpPct2 = enemy.hp / enemy.maxHp;
        if (hpPct2 < 0.6) {
            const pulse2 = Math.abs(Math.sin(now / 180)) * 10;
            ctx.save(); ctx.fillStyle = `rgba(255,215,0,0.22)`;
            if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 25;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 12 + pulse2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        _drawThaelisOrbitDots(enemy, rotation * 1.5);

        // Tenacity Barrier ring, lớp khiên riêng, hiển thị bên ngoài Thaelis
        if ((enemy._tenacityBarrier || 0) > 0) {
            const _bMax = enemy._tenacityBarrierMax || enemy._tenacityBarrier;
            const _bFrac = enemy._tenacityBarrier / _bMax;
            const _bR = r + 16 + 3 * Math.sin(now / 100);
            const _bPulse = 0.70 + 0.30 * Math.sin(now / 80);
            ctx.save();
            // Outer glow
            if (!_mobPerf) { ctx.shadowColor = '#ffee33'; ctx.shadowBlur = 20 + 8 * Math.sin(now / 130); }
            // Full barrier ring (solid)
            ctx.strokeStyle = `rgba(255,230,40,${_bPulse * 0.9})`;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, _bR, 0, Math.PI * 2); ctx.stroke();
            // Depleting arc overlay (shows remaining HP fraction)
            if (_bFrac < 0.999) {
                ctx.strokeStyle = `rgba(80,40,0,0.65)`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, _bR, -Math.PI / 2 + _bFrac * Math.PI * 2, -Math.PI / 2 + Math.PI * 2);
                ctx.stroke();
            }
            // Inner shimmer ring
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(255,255,160,${_bPulse * 0.45})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, _bR - 6, 0, Math.PI * 2); ctx.stroke();
            // Rotating energy sparks on the ring
            if (!_mobPerf) {
                ctx.fillStyle = `rgba(255,240,80,${_bPulse * 0.85})`;
                for (let _i = 0; _i < 6; _i++) {
                    const _sA = (now / 500) + _i * Math.PI / 3;
                    ctx.beginPath();
                    ctx.arc(enemy.x + Math.cos(_sA) * _bR, enemy.y + Math.sin(_sA) * _bR, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        return;
    }

    // NEW DARGRUEL DESIGN
    const r = enemy.size / 2;
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);
    const hpPct = enemy.hp / enemy.maxHp;
    // Rage: how far into its last 50% HP the boss is, 0 at full/half HP up
    // to 1 near death - drives the eye dilating and how visible the
    // corruption cracks below are, instead of both just following a hard
    // hp<40% cutoff like the crackle already did.
    const rageT = Math.max(0, Math.min(1, 1 - hpPct / 0.5));
    // One-shot flash right as a Demon Gift threshold fires (90/70/50/30/1%,
    // see _demonGiftFlashAt in entities/core.js), decaying over ~900ms -
    // every threshold reads as a real punctuation instead of blending into
    // the passive low-HP crackle.
    const demonFlash = enemy._demonGiftFlashAt ? Math.max(0, 1 - (now - enemy._demonGiftFlashAt) / 900) : 0;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // 1. Abyss aura (outer glow) - swells hard on a Demon Gift flash
    ctx.fillStyle = `rgba(138,43,226,${0.12 + 0.08 * pulse + demonFlash * 0.35})`;
    if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 25 + demonFlash * 30; }
    ctx.beginPath(); ctx.arc(0, 0, r * (1.5 + demonFlash * 0.6), 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    if (demonFlash > 0) {
        // Bright white-violet body flash, a fast expanding ring, and a
        // radial burst of jagged bolts - the visual equivalent of the
        // Demon Gift heal pulse it's throwing out to every ally on screen.
        ctx.save();
        ctx.globalAlpha = demonFlash;
        ctx.fillStyle = 'rgba(230,200,255,0.9)';
        ctx.beginPath(); ctx.arc(0, 0, r * (1 - demonFlash) * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,110,255,0.9)';
        ctx.lineWidth = 3;
        if (!_mobPerf) { ctx.shadowColor = '#df88ff'; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.arc(0, 0, r * (1.1 + (1 - demonFlash) * 1.4), 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        for (let bi = 0; bi < 6; bi++) {
            const ba = (bi / 6) * Math.PI * 2 + bi * 0.9;
            let bx = 0, by = 0, ba2 = ba;
            ctx.strokeStyle = `rgba(220,170,255,${demonFlash * 0.85})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(bx, by);
            for (let s = 0; s < 3; s++) {
                ba2 += (Math.sin(bi * 7.1 + s * 3.3) % 1) * 0.6;
                bx += Math.cos(ba2) * r * 0.5;
                by += Math.sin(ba2) * r * 0.5;
                ctx.lineTo(bx, by);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    // 2. Maître Suprême shield ring, scales with sentinel count
    const activeSentinels = typeof sentinels !== 'undefined' ? sentinels.length : 0;
    if (activeSentinels > 0) {
        const drLevel = Math.min(activeSentinels, 18);
        ctx.save();
        ctx.rotate(now / 1200);
        ctx.strokeStyle = `rgba(180,0,255,${0.3 + 0.03 * drLevel})`;
        ctx.lineWidth = 2 + drLevel * 0.15;
        ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // 3. Main octagon body - AanSensei's call: keep the original angular
    // silhouette, don't melt it into a sphere. Chains now wrap the plate
    // as armor bands instead of replacing its shape, contrast is pushed
    // much harder (deep black shadow + a hard rim light) so the plate
    // reads as a thick, looming slab instead of a flat gradient wash.
    const rot = now / 3500;
    ctx.rotate(rot);
    const octPath = (mul) => {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = Math.cos(a) * r * mul, py = Math.sin(a) * r * mul;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
    };

    octPath(1);
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    bodyGrad.addColorStop(0, '#22004a');
    bodyGrad.addColorStop(0.55, '#12001f');
    bodyGrad.addColorStop(0.85, '#050009');
    bodyGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    // A big black shadowBlur here would soften the plate's own outline
    // against the dark backdrop and read as a smaller silhouette, not more
    // contrast - keep the outline crisp and put the contrast into the
    // stroke color/width instead.
    ctx.strokeStyle = '#6a0dad';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Hard rim light just inside the outline, the kind of sharp highlight
    // that sells a thick beveled plate catching strong light from one side.
    octPath(0.985);
    if (!_mobPerf) { ctx.shadowColor = '#c86eff'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = 'rgba(210,150,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3.4 Surface plating detail: panel seams, rivets, and small glowing
    // runes etched into the body itself.
    ctx.save();
    octPath(1);
    ctx.clip();
    ctx.strokeStyle = 'rgba(138,43,226,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(100,20,180,0.22)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
        const a1 = (i / 8) * Math.PI * 2;
        const a2 = ((i + 3) / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a1) * r * 0.9, Math.sin(a1) * r * 0.9);
        ctx.lineTo(Math.cos(a2) * r * 0.9, Math.sin(a2) * r * 0.9);
        ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rx = Math.cos(a) * r * 0.95, ry = Math.sin(a) * r * 0.95;
        ctx.fillStyle = 'rgba(5,0,10,0.95)';
        ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220,180,255,0.6)';
        ctx.beginPath(); ctx.arc(rx - 0.6, ry - 0.6, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    const runePulse = 0.6 + 0.4 * Math.sin(now / 500);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        ctx.save();
        ctx.translate(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
        ctx.rotate(a);
        if (!_mobPerf) { ctx.shadowColor = '#c86eff'; ctx.shadowBlur = 8 * runePulse; }
        ctx.strokeStyle = `rgba(220,170,255,${0.5 + 0.5 * runePulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 3.6 Chain wraps: a handful of dashed bands laid over the plate like
    // meridian lines on a globe - round-capped dashes read as a row of
    // link beads without needing per-link geometry. Clipped to the octagon
    // so nothing spills past the plate's own edge; the Cosmic Eye paints
    // its own opaque disc over the middle later, so no hole needs cutting
    // here.
    ctx.save();
    octPath(1);
    ctx.clip();
    const chainBandCount = 6;
    for (let bi = 0; bi < chainBandCount; bi++) {
        const bandRot = (bi / chainBandCount) * Math.PI;
        const bandSquash = 0.2 + ((bi * 37) % 5) / 5 * 0.55;
        const linkW = r * 0.1;
        ctx.save();
        ctx.rotate(bandRot);
        ctx.scale(1, bandSquash);
        ctx.lineCap = 'round';
        ctx.setLineDash([linkW * 1.5, linkW * 0.55]);
        ctx.strokeStyle = 'rgba(2,0,6,0.95)';
        ctx.lineWidth = linkW;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(190,110,255,0.75)';
        ctx.lineWidth = linkW * 0.45;
        if (!_mobPerf) { ctx.shadowColor = '#c86eff'; ctx.shadowBlur = 6; }
        ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
        ctx.restore();
    }
    ctx.restore();

    // Loose chain ends hanging off each of the octagon's 8 corners,
    // swaying gently - the chains actually spilling off the plate rather
    // than just decorating its face.
    for (let ti = 0; ti < 8; ti++) {
        const ta = (ti / 8) * Math.PI * 2 + Math.PI / 8;
        const sway = Math.sin(now / 900 + ti * 1.7) * 0.22;
        ctx.save();
        ctx.rotate(ta + sway);
        ctx.translate(r * 0.99, 0);
        ctx.rotate(Math.PI / 2);
        const tailLen = r * (0.24 + (ti % 3) * 0.07);
        ctx.lineCap = 'round';
        ctx.setLineDash([r * 0.08, r * 0.035]);
        ctx.strokeStyle = 'rgba(2,0,6,0.95)';
        ctx.lineWidth = r * 0.08;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, tailLen); ctx.stroke();
        ctx.strokeStyle = 'rgba(190,110,255,0.75)';
        ctx.lineWidth = r * 0.045;
        if (!_mobPerf) { ctx.shadowColor = '#c86eff'; ctx.shadowBlur = 7; }
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, tailLen); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
        ctx.restore();
    }

    // 3.5 Corruption cracks: a fixed set of fracture lines, generated once
    // and cached on the enemy itself, that reveal progressively as HP
    // drops instead of all appearing (or not) at once - reads as the body
    // actually breaking apart over the fight rather than just the existing
    // crackle sparks flaring up under one hard 40% cutoff.
    if (!enemy._corruptionCracks) {
        const crackCount = 7;
        const cracks = [];
        for (let i = 0; i < crackCount; i++) {
            const startA = Math.random() * Math.PI * 2;
            const startR = Math.random() * r * 0.25;
            let a2 = startA + (Math.random() - 0.5) * 1.2;
            let px = Math.cos(startA) * startR, py = Math.sin(startA) * startR;
            const pts = [[px, py]];
            const segCount = 3 + Math.floor(Math.random() * 3);
            const totalLen = r * (0.7 + Math.random() * 0.5);
            for (let s = 0; s < segCount; s++) {
                a2 += (Math.random() - 0.5) * 0.7;
                const segLen = totalLen / segCount;
                px += Math.cos(a2) * segLen; py += Math.sin(a2) * segLen;
                pts.push([px, py]);
            }
            cracks.push({ pts, revealHpPct: 0.9 - (i / crackCount) * 0.8, width: 1 + Math.random() * 1.5 });
        }
        enemy._corruptionCracks = cracks;
    }
    ctx.save();
    octPath(1);
    ctx.clip();
    ctx.lineCap = 'round';
    for (const crack of enemy._corruptionCracks) {
        const alpha = Math.max(0, Math.min(1, (crack.revealHpPct - hpPct) / 0.08));
        if (alpha <= 0) continue;
        ctx.strokeStyle = `rgba(5,0,15,${alpha * 0.8})`;
        ctx.lineWidth = crack.width + 1.5;
        ctx.beginPath();
        ctx.moveTo(crack.pts[0][0], crack.pts[0][1]);
        for (let p = 1; p < crack.pts.length; p++) ctx.lineTo(crack.pts[p][0], crack.pts[p][1]);
        ctx.stroke();
        ctx.strokeStyle = `rgba(200,110,255,${alpha * 0.7})`;
        ctx.lineWidth = crack.width * 0.4;
        if (!_mobPerf) { ctx.shadowColor = '#c86eff'; ctx.shadowBlur = 4; }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 4. Counter-rotating inner octagon + veins
    ctx.save();
    ctx.rotate(-rot * 2.5);
    if (!_mobPerf) { ctx.shadowColor = '#8A2BE2'; ctx.shadowBlur = 8; }
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        i === 0 ? ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75)
            : ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
    }
    ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(168,85,247,0.5)';
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
        ctx.lineTo(Math.cos(a + Math.PI) * r * 0.75, Math.sin(a + Math.PI) * r * 0.75);
        ctx.stroke();
    }
    ctx.restore();

    // 5. Cosmic Eye — galaxy vortex that drifts toward the player
    const coreR = r * 0.35;
    const _screenAngle = (typeof player !== 'undefined' && player)
        ? Math.atan2(player.y - enemy.y, player.x - enemy.x) : 0;
    const _localAngle = _screenAngle - rot;
    const _dX = Math.cos(_localAngle) * coreR * 0.17;
    const _dY = Math.sin(_localAngle) * coreR * 0.17;
    const _galaxyRot = now / 2000;
    const _framePulse = 0.75 + 0.25 * Math.sin(now / 280);

    if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 22; }
    const _aG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 1.6);
    _aG.addColorStop(0, 'rgba(120,30,200,0.5)');
    _aG.addColorStop(1, 'rgba(60,0,100,0)');
    ctx.fillStyle = _aG;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Clip to circle; fill deep space background
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    const _bgG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    _bgG.addColorStop(0, '#1e0040');
    _bgG.addColorStop(0.5, '#0d0022');
    _bgG.addColorStop(1, '#04000c');
    ctx.fillStyle = _bgG; ctx.fill(); ctx.clip();

    // Nebula clouds drifting slowly within the eye, behind the spiral arms
    // - gives the vortex some atmospheric depth instead of bare arms over
    // a flat gradient backdrop.
    for (let _n = 0; _n < 4; _n++) {
        const _nPhase = now / 5000 + _n * 1.7;
        const _nR = coreR * (0.35 + (_n % 2) * 0.2);
        const _nx = Math.cos(_nPhase) * coreR * 0.35, _ny = Math.sin(_nPhase * 0.8) * coreR * 0.35;
        const _nColor = _n % 2 === 0 ? '150,60,220' : '90,20,160';
        const _nG = ctx.createRadialGradient(_nx, _ny, 0, _nx, _ny, _nR);
        _nG.addColorStop(0, `rgba(${_nColor},0.22)`);
        _nG.addColorStop(1, `rgba(${_nColor},0)`);
        ctx.fillStyle = _nG;
        ctx.beginPath(); ctx.arc(_nx, _ny, _nR, 0, Math.PI * 2); ctx.fill();
    }

    // Galaxy spiral arms
    ctx.save();
    ctx.translate(_dX, _dY); ctx.rotate(_galaxyRot);
    for (let _arm = 0; _arm < 3; _arm++) {
        ctx.save(); ctx.rotate((_arm / 3) * Math.PI * 2);
        for (let _seg = 1; _seg <= 8; _seg++) {
            ctx.strokeStyle = `rgba(210,140,255,${Math.max(0, 0.52 - _seg * 0.055)})`;
            ctx.lineWidth = Math.max(0.5, coreR * 0.08 - _seg * 0.5);
            const _sA = _seg * 0.22;
            ctx.beginPath(); ctx.arc(0, 0, coreR * _seg * 0.1, _sA, _sA + 0.5); ctx.stroke();
        }
        ctx.restore();
    }
    if (!_mobPerf) {
        for (let _s = 0; _s < 16; _s++) {
            const _sAng = (_s / 16) * Math.PI * 2 + _galaxyRot * 0.3;
            const _sR = coreR * (0.1 + (_s % 5) * 0.15);
            ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(now / 380 + _s * 1.7))})`;
            ctx.beginPath();
            ctx.arc(Math.cos(_sAng) * _sR, Math.sin(_sAng) * _sR, 0.6 + (_s % 3) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Pupil: soft glow halo then hard bright center. Dilates and shifts
    // from violet toward blood-red as rageT climbs (last 50% HP), instead
    // of a fixed calm iris the whole fight.
    const _irisR = coreR * 0.38 * (1 + rageT * 0.45);
    const _rageMidR = Math.round(200 + (255 - 200) * rageT);
    const _rageMidG = Math.round(120 + (40 - 120) * rageT);
    const _rageMidB = Math.round(255 + (50 - 255) * rageT);
    if (!_mobPerf) { ctx.shadowColor = rageT > 0.5 ? '#ff5555' : '#cc88ff'; ctx.shadowBlur = 14; }
    const _coreG = ctx.createRadialGradient(_dX, _dY, 0, _dX, _dY, _irisR);
    _coreG.addColorStop(0, 'rgba(255,255,255,1)');
    _coreG.addColorStop(0.3, `rgba(${_rageMidR},${_rageMidG},${_rageMidB},0.8)`);
    _coreG.addColorStop(0.7, `rgba(${Math.round(100 + 120 * rageT)},0,${Math.round(200 - 140 * rageT)},0.35)`);
    _coreG.addColorStop(1, 'rgba(60,0,140,0)');
    ctx.fillStyle = _coreG;
    ctx.beginPath(); ctx.arc(_dX, _dY, _irisR, 0, Math.PI * 2); ctx.fill();
    // Hard white dot
    if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18; }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(_dX, _dY, coreR * 0.10 * (1 + rageT * 0.3), 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore(); // end clip

    // Ornate frame rings
    if (!_mobPerf) { ctx.shadowColor = '#bb55ff'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = `rgba(185,95,255,${_framePulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(140,55,220,${_framePulse * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 0.87, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Cardinal tick marks on frame
    for (let _i = 0; _i < 8; _i++) {
        const _a = (_i / 8) * Math.PI * 2, _card = _i % 2 === 0;
        ctx.strokeStyle = `rgba(200,110,255,${_framePulse * (_card ? 0.9 : 0.45)})`;
        ctx.lineWidth = _card ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(_a) * coreR * (_card ? 0.9 : 0.93), Math.sin(_a) * coreR * (_card ? 0.9 : 0.93));
        ctx.lineTo(Math.cos(_a) * coreR * (_card ? 1.1 : 1.05), Math.sin(_a) * coreR * (_card ? 1.1 : 1.05));
        ctx.stroke();
    }

    // 5.5 Four directional triangles
    ctx.save();
    ctx.rotate(now / 2500);
    const triDist = coreR + 8, triSize = 14, triWidth = 12;
    const triPulse = 0.6 + 0.4 * Math.sin(now / 100);
    ctx.fillStyle = `rgba(223,136,255,${triPulse})`;
    if (!_mobPerf) { ctx.shadowColor = '#df88ff'; ctx.shadowBlur = 10; }
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.translate(triDist, 0);
        ctx.beginPath();
        ctx.moveTo(triSize, 0);
        ctx.lineTo(0, -triWidth / 2);
        ctx.lineTo(0, triWidth / 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. Chain nodes (4 ports)
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const px = Math.cos(a) * r * 0.88, py = Math.sin(a) * r * 0.88;
        ctx.fillStyle = '#07001a'; ctx.strokeStyle = '#9900ff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(223,136,255,${0.6 + 0.4 * pulse})`;
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // Low HP energy crackle
    if (hpPct < 0.4) {
        const crackleCount = Math.floor((1 - hpPct / 0.4) * 4) + 2;
        for (let c = 0; c < crackleCount; c++) {
            const a0 = (now / 180 + c * Math.PI * 2 / crackleCount) % (Math.PI * 2);
            const a1 = a0 + 0.4 + Math.sin(now / 90 + c) * 0.2;
            const cr = r + 8 + Math.sin(now / 120 + c * 1.7) * 4;
            ctx.strokeStyle = `rgba(255,80,255,${0.6 + 0.4 * Math.sin(now / 80 + c)})`;
            ctx.lineWidth = 1;
            if (!_mobPerf) { ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(0, 0, cr, a0, a1); ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}


