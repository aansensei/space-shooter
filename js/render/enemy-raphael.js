// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/enemy-raphael.js — extracted from render.js. Self-contained,
// no cross-file calls besides core.js's _mobPerf.

// Raphael's static-shaped pieces baked once and redrawn with drawImage
// instead of rebuilt every frame - same trick already used on Marchosias,
// Uriel and Dargruel. Genuinely per-frame-animated pieces (the pulse waves,
// the iris core's radius-pulsing glow, the continuously-squashing armillary
// rings, the center dot) stay live below; see each _get*Sprite's own
// comment for exactly what it covers.
//
// Padding note: every sprite's canvas is rounded up to an EVEN pixel size
// (Math.ceil(x/2)*2) so its own center - and thus everything baked into it
// - lands on a whole pixel instead of an x.5 one. An odd canvas size was
// tried first here and, exactly like the first pass at Marchosias's hex
// sprite, softened every edge under antialiasing even though the shape
// itself was otherwise identical - caught via pixel-diff before shipping.

// Group 1: aura zone background + red limit boundary ring. By far the
// single biggest draw call in this file (a gradient fill spanning most of
// the screen, plus an 18px-shadowBlur ring on top) and completely static
// for a given auraRadius (= canvas.width/2, which only changes on resize).
const _raphaelZoneSpriteCache = {};
function _getRaphaelZoneSprite(auraRadius, r, hasGlow) {
    const key = auraRadius.toFixed(0) + '_' + r.toFixed(1) + '_' + (hasGlow ? 1 : 0);
    const cached = _raphaelZoneSpriteCache[key];
    if (cached) return cached;

    // Pad generous enough for the 18px shadowBlur's visible falloff past
    // the boundary ring - a tighter pad clipped that glow at the sprite's
    // own edge (caught via pixel-diff), same issue and same fix as Uriel's
    // halo-ring sprite earlier.
    const half = Math.ceil((auraRadius + 40) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const cx = c.getContext('2d');
    cx.translate(half, half);

    const zoneGrad = cx.createRadialGradient(0, 0, r, 0, 0, auraRadius);
    zoneGrad.addColorStop(0, 'rgba(255,0,0,0.02)');
    zoneGrad.addColorStop(0.7, 'rgba(200,0,0,0.04)');
    zoneGrad.addColorStop(1, 'rgba(220,0,0,0.16)');
    cx.fillStyle = zoneGrad;
    cx.beginPath(); cx.arc(0, 0, auraRadius, 0, Math.PI * 2); cx.fill();

    cx.strokeStyle = 'rgba(255,40,40,0.85)';
    cx.lineWidth = 2.5;
    if (hasGlow) { cx.shadowColor = '#ff2200'; cx.shadowBlur = 18; }
    cx.beginPath(); cx.arc(0, 0, auraRadius, 0, Math.PI * 2); cx.stroke();
    cx.shadowBlur = 0;

    const sprite = { canvas: c, pad: half };
    _raphaelZoneSpriteCache[key] = sprite;
    return sprite;
}

// Group 2a: the rotating gold dashed inner ring - baked unrotated, caller
// applies ctx.rotate(now/5000) before drawing it.
const _raphaelDashRingSpriteCache = {};
function _getRaphaelDashRingSprite(auraRadius) {
    const key = auraRadius.toFixed(0);
    const cached = _raphaelDashRingSpriteCache[key];
    if (cached) return cached;

    const half = Math.ceil((auraRadius + 8) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const cx = c.getContext('2d');
    cx.translate(half, half);

    cx.strokeStyle = 'rgba(255,215,0,0.6)';
    cx.lineWidth = 2;
    cx.setLineDash([15, 12, 4, 12]);
    cx.beginPath(); cx.arc(0, 0, auraRadius - 6, 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]);

    const sprite = { canvas: c, pad: half };
    _raphaelDashRingSpriteCache[key] = sprite;
    return sprite;
}

// Group 2b: the 4 mechanical bracket locks - baked unrotated, caller
// applies ctx.rotate(-now/8000) before drawing it.
const _raphaelBracketSpriteCache = {};
function _getRaphaelBracketSprite(auraRadius) {
    const key = auraRadius.toFixed(0);
    const cached = _raphaelBracketSpriteCache[key];
    if (cached) return cached;

    const half = Math.ceil((auraRadius + 8) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const cx = c.getContext('2d');
    cx.translate(half, half);

    cx.strokeStyle = 'rgba(255,255,255,0.9)'; cx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        cx.beginPath();
        cx.arc(0, 0, auraRadius, i * Math.PI / 2 - 0.08, i * Math.PI / 2 + 0.08);
        cx.stroke();
        cx.fillStyle = '#FFD700';
        cx.beginPath();
        cx.arc(Math.cos(i * Math.PI / 2) * (auraRadius - 14),
            Math.sin(i * Math.PI / 2) * (auraRadius - 14), 2.5, 0, Math.PI * 2);
        cx.fill();
    }

    const sprite = { canvas: c, pad: half };
    _raphaelBracketSpriteCache[key] = sprite;
    return sprite;
}

// Group 3: main body shell (fill + stroke, rotationally symmetric so it's
// safe to bake alongside the seam lines that DO need rotation) + the 8
// radial seam lines. Baked unrotated, caller applies ctx.rotate(-now/4000).
const _raphaelShellSpriteCache = {};
function _getRaphaelShellSprite(r) {
    const key = r.toFixed(1);
    const cached = _raphaelShellSpriteCache[key];
    if (cached) return cached;

    const half = Math.ceil((r + 6) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const cx = c.getContext('2d');
    cx.translate(half, half);

    const shellGrad = cx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
    shellGrad.addColorStop(0, '#e0e0e0'); shellGrad.addColorStop(0.5, '#7a7a7a');
    shellGrad.addColorStop(0.85, '#2b2b2b'); shellGrad.addColorStop(1, '#050505');
    cx.fillStyle = shellGrad; cx.strokeStyle = '#444'; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(0, 0, r, 0, Math.PI * 2); cx.fill(); cx.stroke();

    cx.strokeStyle = 'rgba(0,0,0,0.7)'; cx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        cx.beginPath();
        cx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        cx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
        cx.stroke();
    }

    // A little extra surface detail so the shell doesn't read as bare gray
    // metal when the gold Custos ring isn't up to carry the look on its
    // own: a faint red equator groove (ties the plain shell back to the
    // glowing red iris/gear-teeth accent already used below) and a small
    // rivet node between each pair of seam lines.
    cx.strokeStyle = 'rgba(255,60,60,0.35)'; cx.lineWidth = 1;
    cx.beginPath(); cx.arc(0, 0, r * 0.68, 0, Math.PI * 2); cx.stroke();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const nx = Math.cos(a) * r * 0.7, ny = Math.sin(a) * r * 0.7;
        cx.fillStyle = '#1a1a1a';
        cx.beginPath(); cx.arc(nx, ny, r * 0.045, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = 'rgba(255,140,140,0.7)';
        cx.beginPath(); cx.arc(nx - r * 0.012, ny - r * 0.012, r * 0.018, 0, Math.PI * 2); cx.fill();
    }

    const sprite = { canvas: c, pad: half };
    _raphaelShellSpriteCache[key] = sprite;
    return sprite;
}

// Group 4: the iris's 6 mechanical gear teeth (drawn on top of the core
// glow - the backing disc UNDER that glow stays live, see the call site).
// Baked unrotated, caller applies ctx.rotate(now/2000).
const _raphaelIrisSpriteCache = {};
function _getRaphaelIrisGearSprite(innerR) {
    const key = innerR.toFixed(1);
    const cached = _raphaelIrisSpriteCache[key];
    if (cached) return cached;

    const half = Math.ceil((innerR + 4) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const cx = c.getContext('2d');
    cx.translate(half, half);

    cx.fillStyle = '#111'; cx.strokeStyle = '#ff8888'; cx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        cx.save(); cx.rotate((i / 6) * Math.PI * 2);
        cx.beginPath();
        cx.moveTo(innerR * 0.4, 0);
        cx.lineTo(innerR, -innerR * 0.4);
        cx.lineTo(innerR, innerR * 0.4);
        cx.closePath(); cx.fill(); cx.stroke();
        cx.restore();
    }

    const sprite = { canvas: c, pad: half };
    _raphaelIrisSpriteCache[key] = sprite;
    return sprite;
}

// Halo ray-burst: a ring of sharp light spikes radiating out from the body,
// like a stylized angelic halo (fitting for an entity actually named after
// an archangel) - baked once per radius, caller rotates it live for a slow
// dramatic spin. Static shape, so the same bake-then-rotate trick as every
// other sprite in this file applies.
const _raphaelHaloSpriteCache = {};
function _getRaphaelHaloSprite(r) {
    const key = r.toFixed(1);
    const cached = _raphaelHaloSpriteCache[key];
    if (cached) return cached;

    const outerR = r * 2.3;
    const half = Math.ceil((outerR + 10) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const cx = c.getContext('2d');
    cx.translate(half, half);

    const spikes = 16;
    for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        const long = i % 2 === 0;
        const tipR = long ? outerR : outerR * 0.68;
        const baseR = r * 0.95;
        const halfW = long ? r * 0.09 : r * 0.055;
        const perpA = a + Math.PI / 2;
        const bx = Math.cos(perpA) * halfW, by = Math.sin(perpA) * halfW;
        const baseX = Math.cos(a) * baseR, baseY = Math.sin(a) * baseR;
        const tipX = Math.cos(a) * tipR, tipY = Math.sin(a) * tipR;
        const g = cx.createLinearGradient(baseX, baseY, tipX, tipY);
        g.addColorStop(0, long ? 'rgba(255,220,140,0.85)' : 'rgba(255,180,90,0.6)');
        g.addColorStop(1, 'rgba(255,140,40,0)');
        cx.fillStyle = g;
        cx.beginPath();
        cx.moveTo(baseX + bx, baseY + by);
        cx.lineTo(tipX, tipY);
        cx.lineTo(baseX - bx, baseY - by);
        cx.closePath();
        cx.fill();
    }

    const sprite = { canvas: c, pad: half };
    _raphaelHaloSpriteCache[key] = sprite;
    return sprite;
}

// Core disc detail: the dark backing behind the glow, etched with fine
// radiating energy veins and a thin rim ring instead of one flat black
// fill - static per innerR (the veins don't animate, only the glow drawn
// on top of this does), so baked once like everything else here.
const _raphaelCoreDiscSpriteCache = {};
function _getRaphaelCoreDiscSprite(innerR) {
    const key = innerR.toFixed(1);
    const cached = _raphaelCoreDiscSpriteCache[key];
    if (cached) return cached;

    const half = Math.ceil((innerR + 4) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const cx = c.getContext('2d');
    cx.translate(half, half);

    cx.fillStyle = '#050000';
    cx.beginPath(); cx.arc(0, 0, innerR, 0, Math.PI * 2); cx.fill();

    const veins = 10;
    for (let i = 0; i < veins; i++) {
        const a = (i / veins) * Math.PI * 2;
        const len = innerR * (0.7 + (i % 3) * 0.08);
        const g = cx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
        g.addColorStop(0, 'rgba(255,120,40,0.9)');
        g.addColorStop(1, 'rgba(255,40,0,0)');
        cx.strokeStyle = g;
        cx.lineWidth = 1.2;
        cx.beginPath();
        cx.moveTo(0, 0);
        cx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        cx.stroke();
    }

    cx.strokeStyle = 'rgba(255,150,80,0.5)'; cx.lineWidth = 1;
    cx.beginPath(); cx.arc(0, 0, innerR * 0.92, 0, Math.PI * 2); cx.stroke();

    const sprite = { canvas: c, pad: half };
    _raphaelCoreDiscSpriteCache[key] = sprite;
    return sprite;
}

function drawRaphael(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const now = performance.now();
    const auraRadius = canvas.width / 2;
    const r = enemy.size;

    // 0. POWER AURA + HALO - a body-hugging "this thing is dangerous" glow,
    // always up regardless of Custos state (the huge screen-spanning zone
    // below is the gameplay hazard boundary, this is pure presence). The
    // glow reuses _getExplosionGlowSprite (render/core.js) baked once per
    // color at a fixed reference radius and scaled to the actual pulsing
    // radius via drawImage, instead of rebuilding a gradient every frame -
    // same trick that sprite already exists for.
    {
        const _auraPulse = 0.85 + 0.15 * Math.sin(now / 500);
        const _auraR = r * 3.2 * _auraPulse;
        const _glowTex = _getExplosionGlowSprite('rgba(255,150,40,0.55)');
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(_glowTex, -_auraR, -_auraR, _auraR * 2, _auraR * 2);
        ctx.globalCompositeOperation = 'source-over';

        const _halo = _getRaphaelHaloSprite(r);
        ctx.save();
        ctx.rotate(now / 6000);
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(now / 400);
        ctx.drawImage(_halo.canvas, -_halo.pad, -_halo.pad);
        ctx.restore();
    }

    // 1 + 2. AURA ZONE BACKGROUND + LIMIT BOUNDARY RING - baked, see
    // _getRaphaelZoneSprite above (by far the biggest single draw call here).
    const _zoneSprite = _getRaphaelZoneSprite(auraRadius, r, !_mobPerf);
    ctx.drawImage(_zoneSprite.canvas, -_zoneSprite.pad, -_zoneSprite.pad);

    // Rotating gold dashed inner ring - baked, see _getRaphaelDashRingSprite.
    {
        const _dashSprite = _getRaphaelDashRingSprite(auraRadius);
        ctx.save();
        ctx.rotate(now / 5000);
        ctx.drawImage(_dashSprite.canvas, -_dashSprite.pad, -_dashSprite.pad);
        ctx.restore();
    }

    // 4 mechanical bracket locks on aura edge - baked, see _getRaphaelBracketSprite.
    {
        const _bracketSprite = _getRaphaelBracketSprite(auraRadius);
        ctx.save();
        ctx.rotate(-now / 8000);
        ctx.drawImage(_bracketSprite.canvas, -_bracketSprite.pad, -_bracketSprite.pad);
        ctx.restore();
    }

    // 3. CIRCULAR PULSE WAVES (gold → red)
    if (!enemy._raphaelPulses) enemy._raphaelPulses = [];
    if (!enemy._lastPulseSpawn || now - enemy._lastPulseSpawn > 1500) {
        enemy._raphaelPulses.push({ startTime: now, duration: 1400, startR: r * 1.2, endR: auraRadius });
        enemy._lastPulseSpawn = now;
    }
    for (let pi = enemy._raphaelPulses.length - 1; pi >= 0; pi--) {
        const p = enemy._raphaelPulses[pi];
        const elapsed = now - p.startTime;
        const tp = elapsed / p.duration;
        if (tp >= 1) { enemy._raphaelPulses.splice(pi, 1); continue; }
        const easeT = 1 - Math.pow(1 - tp, 2.5);
        const currentR = p.startR + easeT * (p.endR - p.startR);
        const alpha = (1 - tp) * 0.75;
        const gCol = Math.floor(215 * (1 - tp));
        const pulseColor = `rgba(255,${gCol},0,${alpha})`;
        ctx.save();
        if (!_mobPerf) { ctx.shadowColor = pulseColor; ctx.shadowBlur = 10 * (1 - tp); }
        ctx.strokeStyle = pulseColor; ctx.lineWidth = 4 * (1 - tp) + 1;
        ctx.beginPath(); ctx.arc(0, 0, currentR, 0, Math.PI * 2); ctx.stroke();
        ctx.save();
        ctx.rotate(tp * Math.PI * 0.5);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([5 + tp * 15, 8 + tp * 5]);
        ctx.beginPath(); ctx.arc(0, 0, currentR * 0.94, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        if (!_mobPerf) {
            ctx.strokeStyle = `rgba(255,${gCol},0,${alpha * 0.25})`; ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            for (let s = 0; s < 12; s++) {
                const a = (s / 12) * Math.PI * 2 + now / 4000;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * p.startR, Math.sin(a) * p.startR);
                ctx.lineTo(Math.cos(a) * currentR, Math.sin(a) * currentR);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 4. CUSTOS AETERNUS SHIELD (gold, Iron Body)
    if (enemy.raphaelInvulnerable) {
        ctx.save();
        const shieldR = r * 1.6;
        const shieldPulse = 0.8 + 0.2 * Math.sin(now / 150);
        if (!_mobPerf) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 25; }
        ctx.strokeStyle = `rgba(255,215,0,${shieldPulse})`; ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(255,215,0,0.08)';
        ctx.beginPath(); ctx.arc(0, 0, shieldR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.rotate(now / 3000);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
        if (!_mobPerf) ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const nextA = ((i + 3) / 12) * Math.PI * 2;
            ctx.moveTo(Math.cos(a) * shieldR, Math.sin(a) * shieldR);
            ctx.lineTo(Math.cos(nextA) * shieldR, Math.sin(nextA) * shieldR);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        // 4.5 Custos layer pips - one per remaining hit out of the 25-hit
        // pool (see the raphaelCustosHits threshold in dealDamage,
        // entities/core.js), so the shield reads as a depleting resource at
        // a glance instead of an opaque on/off gate. Spent pips just fade
        // out rather than vanish, so the ring doesn't visibly "jump".
        {
            const _hitsLeft = Math.max(0, 25 - (enemy.raphaelCustosHits || 0));
            const _pipR = shieldR + 9;
            ctx.save();
            for (let i = 0; i < 25; i++) {
                const a = (i / 25) * Math.PI * 2 - Math.PI / 2;
                const _spent = i >= _hitsLeft;
                ctx.fillStyle = _spent ? 'rgba(255,215,0,0.12)' : `rgba(255,240,180,${0.75 + 0.25 * Math.sin(now / 200 + i)})`;
                if (!_mobPerf && !_spent) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 4; }
                ctx.beginPath();
                ctx.arc(Math.cos(a) * _pipR, Math.sin(a) * _pipR, _spent ? 1.1 : 1.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.restore();
        }
    }

    // 5. ARMILLARY RINGS
    ctx.save();
    if (!_mobPerf) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = 'rgba(200,200,220,0.8)'; ctx.lineWidth = 2.5;
    ctx.save();
    ctx.rotate(now / 1500);
    ctx.scale(1, 0.3 + 0.1 * Math.sin(now / 1000));
    ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(-now / 1800 + Math.PI / 4);
    ctx.scale(0.35 + 0.15 * Math.sin(now / 1200), 1);
    ctx.strokeStyle = 'rgba(255,100,100,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. MAIN BODY SHELL - fill/stroke/seams baked, see _getRaphaelShellSprite.
    // The shell circle is rotationally symmetric, so baking it together
    // with the seam lines (which do need the live rotation) and rotating
    // the whole sprite is visually identical to the original's
    // shell-static/seams-rotating split.
    {
        const _shellSprite = _getRaphaelShellSprite(r);
        ctx.save();
        ctx.rotate(-now / 4000);
        ctx.drawImage(_shellSprite.canvas, -_shellSprite.pad, -_shellSprite.pad);
        ctx.restore();
    }

    // 7. MECHANICAL IRIS + CORE
    const innerR = r * 0.45;
    // Backing disc + radiating energy veins - baked, see
    // _getRaphaelCoreDiscSprite above.
    const _coreDisc = _getRaphaelCoreDiscSprite(innerR);
    ctx.drawImage(_coreDisc.canvas, -_coreDisc.pad, -_coreDisc.pad);
    const coreBeat = 0.85 + 0.2 * Math.abs(Math.sin(now / 750));
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR * coreBeat);
    coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(0.2, '#ffdd44');
    coreGrad.addColorStop(0.5, '#ff2200'); coreGrad.addColorStop(1, 'transparent');
    if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 20; }
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, innerR * coreBeat, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Gear teeth baked, see _getRaphaelIrisGearSprite - drawn on top of the
    // core glow above, matching the original's draw order.
    {
        const _irisSprite = _getRaphaelIrisGearSprite(innerR);
        ctx.save();
        ctx.rotate(now / 2000);
        ctx.drawImage(_irisSprite.canvas, -_irisSprite.pad, -_irisSprite.pad);
        ctx.restore();
    }
    ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.2 * Math.sin(now / 100)})`;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();

    // Embers orbiting the core - 4 small sparks at staggered radii/speeds,
    // live (a handful of cheap arc fills, not worth a sprite).
    if (!_mobPerf) {
        ctx.fillStyle = 'rgba(255,200,120,0.85)';
        if (_gfxLevel < 2) { ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 5; }
        for (let e = 0; e < 4; e++) {
            const _ea = now / (900 + e * 220) + (e / 4) * Math.PI * 2;
            const _er = innerR * (1.15 + 0.12 * Math.sin(now / 400 + e));
            ctx.beginPath();
            ctx.arc(Math.cos(_ea) * _er, Math.sin(_ea) * _er, 1.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// Death burst: a divine-light dispersal instead of a plain generic
// explosion - a bright white-gold flash, the halo sprite itself blown
// outward and faded (reusing _getRaphaelHaloSprite rather than building new
// geometry), an expanding double ring shockwave, and falling embers
// drifting down with a slight gravity pull. One-shot, driven by
// burst.lifetime counting down from burst.maxLifetime (see
// raphaelDeathBursts in main.js). burst.size is already a radius, matching
// this file's own convention (const r = enemy.size in drawRaphael above).
function _drawRaphaelDeathBurst(burst) {
    const p = 1 - burst.lifetime / burst.maxLifetime; // 0 → 1
    const r0 = burst.size;
    ctx.save();
    ctx.translate(burst.x, burst.y);

    // Halo blown outward, scaling up while fading - the "shield/presence"
    // shattering apart, reusing the exact same baked sprite it had while alive.
    {
        const _halo = _getRaphaelHaloSprite(r0);
        const _haloScale = 1 + p * 1.8;
        const _haloAlpha = Math.max(0, 1 - p * 1.3);
        if (_haloAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = _haloAlpha;
            ctx.rotate(p * 1.4);
            ctx.drawImage(_halo.canvas, -_halo.pad * _haloScale, -_halo.pad * _haloScale, _halo.canvas.width * _haloScale, _halo.canvas.height * _haloScale);
            ctx.restore();
        }
    }

    // Bright core flash, fast fade
    if (p < 0.25) {
        const flashP = p / 0.25;
        const flashR = r0 * (0.5 + flashP * 1.6);
        const flashG = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
        flashG.addColorStop(0, `rgba(255,255,255,${(1 - flashP) * 0.95})`);
        flashG.addColorStop(0.5, `rgba(255,215,120,${(1 - flashP) * 0.6})`);
        flashG.addColorStop(1, 'rgba(255,180,60,0)');
        ctx.fillStyle = flashG;
        ctx.beginPath(); ctx.arc(0, 0, flashR, 0, Math.PI * 2); ctx.fill();
    }

    // Expanding double ring shockwave
    const ring1R = r0 * (0.6 + p * 3.2);
    ctx.strokeStyle = `rgba(255,230,180,${(1 - p) * 0.85})`;
    ctx.lineWidth = 3;
    if (!_mobPerf) { ctx.shadowColor = '#ffd76b'; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(0, 0, ring1R, 0, Math.PI * 2); ctx.stroke();
    const ring2P = Math.max(0, (p - 0.1) / 0.9);
    const ring2R = r0 * (0.4 + ring2P * 2.2);
    ctx.strokeStyle = `rgba(255,180,60,${(1 - ring2P) * 0.5})`;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, ring2R, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Falling embers, seeded once per burst so they don't reroll every frame
    if (!burst._embers) {
        burst._embers = [];
        for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = r0 * (0.02 + Math.random() * 0.03);
            burst._embers.push({ a, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - r0 * 0.01, seed: Math.random() });
        }
    }
    if (!_mobPerf) {
        ctx.fillStyle = `rgba(255,205,130,${(1 - p) * 0.9})`;
        for (const em of burst._embers) {
            const t = p * burst.maxLifetime / 16.7; // rough frame-count proxy for gravity accumulation
            const ex = em.vx * t, ey = em.vy * t + 0.05 * t * t * 0.02;
            ctx.beginPath(); ctx.arc(ex, ey, 1.6 + em.seed * 1.2, 0, Math.PI * 2); ctx.fill();
        }
    }

    ctx.restore();
}
// Enemy dispatcher
