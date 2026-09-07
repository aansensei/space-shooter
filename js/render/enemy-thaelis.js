// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/render/enemy-thaelis.js — Thaelis's own visuals, split out of the old
// shared js/render/enemy-boss-thaelis.js (which also drew Dargruel through
// the same function, branching on enemy.type - see js/render/enemy-dargruel.js
// for that half). Calls drawPolygon() from fx.js. Also carries the
// Reincarnation Cocoon and its Guards - Thaelis's own death mechanic, not a
// separate enemy family, so it lives here rather than its own file.

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

function _drawThaelis(enemy) {
    const now = performance.now();
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

    // Tenacity Shield ring, vẽ thành vòng ngoài thân cho dễ nhìn dù bản
    // chất chỉ là enemy.shield như mọi enemy khác
    if ((enemy.shield || 0) > 0) {
        const _bMax = enemy._shieldPeak || enemy.shield;
        const _bFrac = enemy.shield / _bMax;
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
}

// Commissioned Cocoon sprite - dark chrysalis shell with glowing green
// veins, chroma-keyed to transparent. Drawn under all the procedural glow/
// particle layers below, the same layering order as Marchosias's own
// commissioned hexagon-armor texture.
const _thaelisCocoonImg = new Image();
_thaelisCocoonImg.src = 'assets/images/game/enemies/thaelis-cocoon.png';
_thaelisCocoonImg.decode().catch(() => {});

function _drawThaelisCocoon(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    const timerPct = Math.max(0, Math.min(1, (enemy._cocoonTimer || 0) / THAELIS_COCOON_DURATION));
    // Urgency ramps up as the timer runs out - pulse/particle rate speeds up
    // and the color drifts from calm green toward a hotter yellow-white the
    // closer it gets to cracking open.
    const urgency = 1 - timerPct;
    const pulseSpeed = 260 - urgency * 140;
    const pulse = 0.5 + 0.5 * Math.sin(now / pulseSpeed);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    // Untargetable hologram flicker on the whole body: a visual tell that
    // shots landing here don't do anything, only the 4 Guards do.
    ctx.globalAlpha *= 0.86 + 0.14 * Math.sin(now / 500);

    // 1. Outer void-glow aura, breathing slowly, tinting hotter with urgency
    const auraR = r * (1.7 + pulse * 0.15);
    const auraG = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, auraR);
    const auraHue = 140 - urgency * 90; // 140=green -> ~50=yellow as it nears hatching
    auraG.addColorStop(0, `hsla(${auraHue}, 90%, 55%, ${0.28 + pulse * 0.12})`);
    auraG.addColorStop(1, `hsla(${auraHue}, 90%, 50%, 0)`);
    ctx.fillStyle = auraG;
    if (!_mobPerf) { ctx.shadowColor = `hsl(${auraHue},90%,55%)`; ctx.shadowBlur = 24 + urgency * 20; }
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Twin counter-rotating containment rings (dashed), reading as an
    // energy field actively holding the Cocoon together
    if (!_mobPerf) {
        for (let ring = 0; ring < 2; ring++) {
            ctx.save();
            ctx.rotate((ring === 0 ? 1 : -1) * now / (900 - urgency * 400));
            ctx.strokeStyle = `hsla(${auraHue}, 95%, 65%, ${0.5 - ring * 0.15})`;
            ctx.lineWidth = 2 - ring * 0.6;
            ctx.setLineDash(ring === 0 ? [14, 10] : [4, 14]);
            ctx.shadowColor = `hsl(${auraHue},95%,65%)`; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.ellipse(0, 0, r * (1.32 - ring * 0.1), r * (1.5 - ring * 0.1), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
    }

    // 3. The commissioned Cocoon sprite itself, gently rocking as if
    // breathing/straining against its own shell
    const rock = Math.sin(now / 700) * 0.03;
    ctx.save();
    ctx.rotate(rock);
    if (_thaelisCocoonImg.complete && _thaelisCocoonImg.naturalWidth > 0) {
        const imgAspect = _thaelisCocoonImg.naturalWidth / _thaelisCocoonImg.naturalHeight;
        const drawH = r * 2.5, drawW = drawH * imgAspect;
        ctx.drawImage(_thaelisCocoonImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
        // Fallback while the image loads/if it fails: a plain dark ovoid so
        // the Cocoon is never invisible.
        ctx.fillStyle = '#151018';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 3.5 Untargetable tell: a "no-target" glyph orbiting above the Cocoon,
    // since it can't be hit by anything anymore - only its 4 Guards - so the
    // player doesn't waste shots on the body itself. The hologram-style
    // alpha flicker for the body itself is set at the very top of this
    // function, before the sprite draw.
    if (!_mobPerf) {
        ctx.save();
        ctx.translate(0, -r * 1.9);
        ctx.rotate(now / 1400);
        const noTargetAlpha = 0.55 + 0.25 * Math.sin(now / 420);
        ctx.strokeStyle = `rgba(200,255,220,${noTargetAlpha})`;
        ctx.lineWidth = 1.5;
        if (!_mobPerf) { ctx.shadowColor = '#c8ffdc'; ctx.shadowBlur = 6; }
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 4. Inner-crack glow bleeding through the shell's own seam, brighter as
    // HP drops (about to break) or as the timer runs low (about to hatch)
    const crackGlow = Math.max(1 - hpPct, urgency) * (0.6 + pulse * 0.4);
    if (crackGlow > 0.05) {
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9);
        cg.addColorStop(0, `hsla(${auraHue},100%,85%,${crackGlow * 0.6})`);
        cg.addColorStop(1, `hsla(${auraHue},100%,60%,0)`);
        ctx.fillStyle = cg;
        if (!_mobPerf) { ctx.shadowColor = `hsl(${auraHue},100%,80%)`; ctx.shadowBlur = 18 * crackGlow; }
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 1.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // 5. Drifting spore embers rising off the shell (FULL/MED only)
    if (!_mobPerf) {
        if (!enemy._cocoonEmbers) {
            enemy._cocoonEmbers = [];
            for (let i = 0; i < 14; i++) {
                enemy._cocoonEmbers.push({ a: Math.random() * Math.PI * 2, rr: 0.3 + Math.random() * 0.9, phase: Math.random() * Math.PI * 2, spd: 0.4 + Math.random() * 0.6 });
            }
        }
        for (const em of enemy._cocoonEmbers) {
            const ex = Math.cos(em.a) * r * em.rr;
            const eyBase = Math.sin(em.a) * r * em.rr * 1.3;
            const drift = ((now / 1000) * em.spd + em.phase) % 3;
            const ey = eyBase - drift * r * 0.6;
            const emAlpha = Math.max(0, 1 - drift / 3) * (0.5 + urgency * 0.4);
            if (emAlpha <= 0) continue;
            ctx.fillStyle = `hsla(${auraHue},100%,75%,${emAlpha})`;
            ctx.beginPath(); ctx.arc(ex, ey, 1.6 + Math.sin(now / 200 + em.phase) * 0.6, 0, Math.PI * 2); ctx.fill();
        }
    }

    // 6. Countdown arc: how much of the 9s window is left, read at a glance
    // without needing a separate HUD element
    ctx.rotate(-rock);
    ctx.strokeStyle = `hsla(${auraHue},90%,60%,0.85)`;
    ctx.lineWidth = 3;
    if (!_mobPerf) { ctx.shadowColor = `hsl(${auraHue},90%,60%)`; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.arc(0, 0, r * 1.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerPct); ctx.stroke();
    ctx.shadowBlur = 0;

    // 7. Urgency flash sparks once past 70% of the timer (FULL only) - a
    // sharp "it's about to happen" tell in the last stretch
    if (!_mobPerf && urgency > 0.7 && Math.random() < 0.15) {
        const sa = Math.random() * Math.PI * 2;
        ctx.strokeStyle = `hsla(${auraHue},100%,85%,0.8)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * r * 1.1, Math.sin(sa) * r * 1.3);
        ctx.lineTo(Math.cos(sa) * r * 1.7, Math.sin(sa) * r * 1.9);
        ctx.stroke();
    }

    // 8. Revival charge-up: past 60% of the timer, motes stream INWARD from
    // 4 fixed compass points (mirroring the 4 Guards feeding it) toward the
    // core, converging faster and brighter the closer it gets to cracking
    // open - the opposite motion of the outward embers above, reading as
    // "gathering power" rather than "venting it".
    if (urgency > 0.6) {
        const chargeT = (urgency - 0.6) / 0.4; // 0 at 60%, 1 at the very end
        if (!enemy._cocoonChargeMotes) {
            enemy._cocoonChargeMotes = [0, 1, 2, 3].map(i => ({ angle: (i / 4) * Math.PI * 2, phase: Math.random() }));
        }
        const inSpeed = 0.5 + chargeT * 1.8;
        for (const mote of enemy._cocoonChargeMotes) {
            const t = (now / 1000 * inSpeed + mote.phase) % 1; // 0 = far out, 1 = at core
            const dist = r * (2.2 - t * 2.2);
            const mx = Math.cos(mote.angle) * dist, my = Math.sin(mote.angle) * dist;
            const moteAlpha = chargeT * (0.3 + t * 0.7);
            ctx.fillStyle = `hsla(${auraHue},100%,80%,${moteAlpha})`;
            if (!_mobPerf) { ctx.shadowColor = `hsl(${auraHue},100%,80%)`; ctx.shadowBlur = 8 * chargeT; }
            ctx.beginPath(); ctx.arc(mx, my, 1.3 + t * 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Bright core buildup flash in the final stretch, peaking right
        // before it cracks open
        if (chargeT > 0.5) {
            const flashT = (chargeT - 0.5) / 0.5;
            const coreFlash = ctx.createRadialGradient(0, 0, 0, 0, 0, r * (0.5 + flashT * 0.6));
            coreFlash.addColorStop(0, `rgba(255,255,255,${flashT * (0.5 + 0.3 * Math.sin(now / 90))})`);
            coreFlash.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = coreFlash;
            ctx.beginPath(); ctx.arc(0, 0, r * (0.5 + flashT * 0.6), 0, Math.PI * 2); ctx.fill();
        }
    }

    ctx.restore();
}

function _drawThaelisGuard(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    const hpPct = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    const pulse = 0.5 + 0.5 * Math.sin(now / 220 + enemy.x);
    const cocoon = enemy._guardCocoon;

    // Energy tether to its Cocoon, drawn in world space BEFORE the local
    // translate below - a visible "life-link" now that killing this pylon
    // is what actually damages the Cocoon, not just a decorative guard.
    if (cocoon && cocoon.hp > 0) {
        ctx.save();
        const tetherPulse = 0.5 + 0.5 * Math.sin(now / 260 + enemy.x * 0.5);
        ctx.strokeStyle = `rgba(120,255,170,${0.25 + tetherPulse * 0.25})`;
        ctx.lineWidth = 1.5;
        if (!_mobPerf) { ctx.shadowColor = '#22cc55'; ctx.shadowBlur = 6; }
        ctx.setLineDash([3, 7]);
        ctx.lineDashOffset = -now / 40;
        ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(cocoon.x, cocoon.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Base glow pool on the ground the pylon rises from
    const baseG = ctx.createRadialGradient(0, r * 1.1, 0, 0, r * 1.1, r * 2.2);
    baseG.addColorStop(0, `rgba(120,255,170,${0.35 * hpPct})`);
    baseG.addColorStop(1, 'rgba(20,80,50,0)');
    ctx.fillStyle = baseG;
    ctx.beginPath(); ctx.ellipse(0, r * 1.1, r * 2.2, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();

    // Faceted crystal pylon body (hexagonal-ish silhouette, tapered top),
    // dimming as HP drops instead of just shrinking a bar over its head
    if (!_mobPerf) { ctx.shadowColor = '#22cc55'; ctx.shadowBlur = 8 + pulse * 6 * hpPct; }
    const bodyG = ctx.createLinearGradient(-r * 0.5, -r * 2.2, r * 0.5, r);
    bodyG.addColorStop(0, `rgba(235,255,240,${0.7 + 0.3 * hpPct})`);
    bodyG.addColorStop(0.45, `rgba(70, ${150 + 80 * hpPct}, ${100 + 40 * hpPct}, 1)`);
    bodyG.addColorStop(1, 'rgba(10,30,20,1)');
    ctx.fillStyle = bodyG;
    ctx.strokeStyle = 'rgba(200,255,220,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.2);
    ctx.lineTo(r * 0.55, -r * 0.9);
    ctx.lineTo(r * 0.45, r * 0.9);
    ctx.lineTo(0, r * 1.15);
    ctx.lineTo(-r * 0.45, r * 0.9);
    ctx.lineTo(-r * 0.55, -r * 0.9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Glowing core seam running up the middle
    ctx.strokeStyle = `rgba(230,255,235,${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf) { ctx.shadowColor = '#eaffea'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.moveTo(0, -r * 1.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
    ctx.shadowBlur = 0;

    // Floating rune ring orbiting the base, marking it as an active anchor
    if (!_mobPerf) {
        ctx.save();
        ctx.translate(0, r * 1.0);
        ctx.rotate(now / 700);
        ctx.strokeStyle = `rgba(150,255,190,${0.5 + 0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Bright apex light at the tip
    ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * pulse})`;
    if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.arc(0, -r * 2.2, 2 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
}
