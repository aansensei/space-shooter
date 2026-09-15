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
    // r only sets the gradient's inner radius (where the red danger-zone
    // starts, right at the enemy's own edge) - a few pixels of difference
    // there is imperceptible against a gradient spanning hundreds of
    // pixels, but keying on r's exact value (enemy.size, randomized per
    // spawn) meant this ~1360px sprite - by far the single biggest draw
    // call in this file, gradient fill plus an 18px shadowBlur ring -
    // never actually hit cache between different Raphaels and got
    // rebaked from scratch on every single spawn, a real stutter caught
    // via the game's own [LONGTASK]/[PIXI] perf warnings. Bucketing r to
    // the nearest 5px keeps the cache effectively static for a given
    // auraRadius, matching what this function's own header comment
    // already claimed should be true.
    const key = auraRadius.toFixed(0) + '_' + (Math.round(r / 5) * 5) + '_' + (hasGlow ? 1 : 0);
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

        // A brief white pulse on the shield ring itself when a hit was just
        // blocked (see enemy._custosFlashUntil, entities/core.js) - shorter
        // than the 175ms hit throttle so at most one is ever visible at
        // once, unlike the old reused addExplosion() call this replaced.
        if (enemy._custosFlashUntil && now < enemy._custosFlashUntil) {
            const _flashP = 1 - Math.max(0, enemy._custosFlashUntil - now) / 140;
            ctx.save();
            ctx.globalAlpha = 1 - _flashP;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, shieldR * (0.9 + _flashP * 0.25), 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // 4.5 Custos layer pips - one per remaining hit out of the 20-hit
        // pool (see the raphaelCustosHits threshold in dealDamage,
        // entities/core.js), so the shield reads as a depleting resource at
        // a glance instead of an opaque on/off gate. Spent pips just fade
        // out rather than vanish, so the ring doesn't visibly "jump".
        {
            const _hitsLeft = Math.max(0, 20 - (enemy.raphaelCustosHits || 0));
            const _pipR = shieldR + 9;
            ctx.save();
            for (let i = 0; i < 20; i++) {
                const a = (i / 20) * Math.PI * 2 - Math.PI / 2;
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
    // The core reads as "the thing powering Wisdom King" - it burns
    // brighter and beats faster for as long as this Raphael has a Wisdom
    // Orb gathering or in flight (see the `enemy` reference stashed on each
    // orb, entities/raphael.js), not just during the gather telegraph.
    const _wisdomSkillActive = raphaelWisdomOrbs.some(o => o.enemy === enemy && (o.phase === 'gather' || o.phase === 'launch'));
    const coreBeat = (0.85 + 0.2 * Math.abs(Math.sin(now / (_wisdomSkillActive ? 400 : 750)))) * (_wisdomSkillActive ? 1.3 : 1);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR * coreBeat);
    coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(0.2, _wisdomSkillActive ? '#ffe27a' : '#ffdd44');
    coreGrad.addColorStop(0.5, _wisdomSkillActive ? '#ffb020' : '#ff2200'); coreGrad.addColorStop(1, 'transparent');
    if (!_mobPerf) { ctx.shadowColor = _wisdomSkillActive ? '#ffcf5c' : '#ff2200'; ctx.shadowBlur = _wisdomSkillActive ? 34 : 20; }
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
// Wisdom Orb: gathers in place (light dust pulling inward, a seam cracking
// open to show the orb before launch), then flies as the AI-art orb image,
// rotated along its travel angle with a short directional light trail.
// Zones are the small scorched patches the orb leaves on each Sentinel it
// pierces (raphaelWisdomZones, see updateRaphaelWisdomZones in
// entities/raphael.js) - drawn separately below.
// The four Greek letters etched on the orb art itself (see the AI-art
// prompt this asset was generated from) - reused here as a small rotating
// glyph ring so the "wisdom" theme reads in the effects too, not just the
// texture. rot is in radians and free-running (independent of the orb's
// travel angle) so the ring keeps spinning steadily regardless of heading.
const _raphaelWisdomGlyphs = ['α', 'σ', 'ω', 'φ'];
function _drawRaphaelWisdomGlyphRing(radius, rot, alpha) {
    ctx.save();
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!_mobPerf) { ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 8; }
    ctx.fillStyle = `rgba(255,232,160,${alpha})`;
    for (let i = 0; i < 4; i++) {
        const a = rot + i * (Math.PI / 2);
        ctx.fillText(_raphaelWisdomGlyphs[i], Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.restore();
}

function _drawRaphaelWisdomOrb(o) {
    // Sparkle afterimage trail: stamped dots at the orb's actual world
    // position, sampled every 40ms - drawn before translate/rotate since
    // o.x/o.y are already absolute canvas coordinates, same convention the
    // spinner's speed-boost trail uses (render/skill-s-spirit.js).
    if (o.phase === 'launch' && !_mobPerf) {
        if (!o._sparkTrail) o._sparkTrail = [];
        const nowT = performance.now();
        if (nowT - (o._lastSparkStamp || 0) > 40) {
            o._sparkTrail.push({ x: o.x, y: o.y });
            o._lastSparkStamp = nowT;
            if (o._sparkTrail.length > 8) o._sparkTrail.shift();
        }
        for (let i = 0; i < o._sparkTrail.length; i++) {
            const t = o._sparkTrail[i];
            const a = (i + 1) / (o._sparkTrail.length + 1) * 0.5;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = '#ffe27a';
            ctx.beginPath(); ctx.arc(t.x, t.y, 4.5 + i * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // Loose embers peeling off and actually left behind in world space
        // (unlike the stamped afterimage above, which just re-traces the
        // orb's own path) - each spark keeps its own scatter velocity plus a
        // slight bias opposite the orb's heading, so they read as debris
        // shed while flying rather than a second copy of the trail.
        if (!o._embers2) o._embers2 = [];
        if (performance.now() - (o._lastEmber2At || 0) > 30) {
            o._lastEmber2At = performance.now();
            const a = Math.random() * Math.PI * 2;
            o._embers2.push({
                x: o.x, y: o.y,
                vx: Math.cos(a) * (0.4 + Math.random() * 0.8) - Math.cos(o.ang) * 0.6,
                vy: Math.sin(a) * (0.4 + Math.random() * 0.8) - Math.sin(o.ang) * 0.6,
                life: 380, maxLife: 380,
            });
            if (o._embers2.length > 16) o._embers2.shift();
        }
        for (let i = o._embers2.length - 1; i >= 0; i--) {
            const em = o._embers2[i];
            em.life -= 16.7;
            if (em.life <= 0) { o._embers2.splice(i, 1); continue; }
            em.x += em.vx; em.y += em.vy + 0.02;
            const emP = em.life / em.maxLife;
            ctx.fillStyle = `rgba(255,${210 - emP * 40},130,${emP * 0.8})`;
            ctx.beginPath(); ctx.arc(em.x, em.y, 1.2 * emP + 0.3, 0, Math.PI * 2); ctx.fill();
        }
    }

    ctx.save();
    ctx.translate(o.x, o.y);

    if (o.phase === 'gather') {
        const p = 1 - o.gatherTimer / RAPHAEL_WISDOM_GATHER_MS; // 0 -> 1
        ctx.rotate(o.ang);

        // Danger-line telegraph: a dashed red line straight down the exact
        // path this orb is about to fire along, visible for the whole
        // ~0.65s gather window instead of only once the orb is already
        // moving - the player gets real time to read the line and step off
        // it before anything launches. Brightens as the gather builds so it
        // reads as an escalating warning, not a static decoration.
        if (!_mobPerf) {
            ctx.save();
            ctx.globalAlpha = 0.25 + p * 0.5;
            ctx.strokeStyle = 'rgba(255,60,60,0.9)';
            ctx.lineWidth = 2;
            ctx.setLineDash([14, 12]);
            ctx.lineDashOffset = -p * 40; // dashes crawl outward, reinforcing direction
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2200, 0); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Dust motes pulled inward along the launch angle, seeded once.
        if (!o._motes) {
            o._motes = [];
            for (let i = 0; i < 13; i++) {
                const a = Math.random() * Math.PI * 2;
                o._motes.push({ a, dist: 30 + Math.random() * 26, seed: Math.random() });
            }
        }
        ctx.fillStyle = `rgba(255,226,122,${0.15 + p * 0.5})`;
        for (const m of o._motes) {
            const d = m.dist * (1 - p * 0.85);
            ctx.beginPath();
            ctx.arc(Math.cos(m.a) * d, Math.sin(m.a) * d, 1.4 + m.seed * 1.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // A soft ambient glow building underneath the seam, so the gather
        // reads as charging up rather than just the seam+motes alone. In
        // the last 20% of the telegraph it blooms harder and throws out a
        // burst of light rays - a distinct "peak" right before the gate
        // actually releases, instead of building at a flat rate the whole
        // way and cutting straight to the launch flash.
        const _peakP = p > 0.8 ? (p - 0.8) / 0.2 : 0; // 0 -> 1 over the final stretch
        if (!_mobPerf) {
            const glowR = (10 + p * 34) * (1 + _peakP * 0.7);
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            glow.addColorStop(0, `rgba(255,225,150,${p * 0.35 + _peakP * 0.4})`);
            glow.addColorStop(1, 'rgba(255,220,140,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();

            if (_peakP > 0) {
                ctx.save();
                ctx.globalAlpha = _peakP * 0.7;
                ctx.strokeStyle = 'rgba(255,240,195,0.9)';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2 + p * 3;
                    const rayLen = 16 + _peakP * 28;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
                    ctx.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // A ring of the orb's own etched glyphs, spinning up and drawing
        // inward as the gate opens - the "wisdom" tell before anything fires.
        if (!_mobPerf) _drawRaphaelWisdomGlyphRing(10 + p * 15, p * 5, p * 0.85);

        // A full portal ring forming around the whole gather point (not just
        // the vertical seam) - grows from a pinpoint to a wide circle as the
        // gate opens, reading as an actual portal rather than only a crack.
        if (!_mobPerf) {
            const portalR = 6 + p * 40;
            ctx.save();
            ctx.globalAlpha = p * 0.55;
            ctx.strokeStyle = 'rgba(255,230,170,0.9)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 5]);
            ctx.lineDashOffset = p * 20;
            ctx.beginPath(); ctx.arc(0, 0, portalR, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Crackling lightning tendrils reaching out from the portal in its
        // final stretch - a jagged, high-energy tell distinct from the soft
        // glow/rays above, seeded once per orb so they don't reroll every frame.
        if (!_mobPerf && _peakP > 0) {
            if (!o._tendrils) {
                o._tendrils = [];
                for (let i = 0; i < 5; i++) {
                    const baseAng = Math.random() * Math.PI * 2;
                    const segs = [];
                    let len = 0;
                    for (let s = 0; s < 4; s++) { len += 8 + Math.random() * 8; segs.push({ len, jitter: (Math.random() - 0.5) * 10 }); }
                    o._tendrils.push({ baseAng, segs });
                }
            }
            ctx.save();
            ctx.globalAlpha = _peakP * 0.8;
            ctx.strokeStyle = 'rgba(220,240,255,0.95)';
            ctx.lineWidth = 1.2;
            if (!_mobPerf) { ctx.shadowColor = '#bfe8ff'; ctx.shadowBlur = 6; }
            for (const t of o._tendrils) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (const seg of t.segs) {
                    const perpAng = t.baseAng + Math.PI / 2;
                    const x = Math.cos(t.baseAng) * seg.len * _peakP + Math.cos(perpAng) * seg.jitter;
                    const y = Math.sin(t.baseAng) * seg.len * _peakP + Math.sin(perpAng) * seg.jitter;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // A seam of light cracking open, bowing apart as the gate opens.
        const seamW = 3 + p * 5, seamH = 36 * (0.3 + p * 0.7);
        if (!_mobPerf) { ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 16 * p; }
        ctx.strokeStyle = `rgba(255,235,180,${0.5 + p * 0.5})`;
        ctx.lineWidth = seamW;
        ctx.beginPath(); ctx.moveTo(0, -seamH / 2); ctx.lineTo(0, seamH / 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // The orb itself, glimpsed through the seam, fading and scaling in.
        if (p > 0.35 && _raphaelWisdomOrbImg.complete && _raphaelWisdomOrbImg.naturalWidth) {
            const revealP = (p - 0.35) / 0.65;
            const s = 51 * (0.4 + revealP * 0.6);
            ctx.save();
            ctx.globalAlpha = revealP * 0.9;
            ctx.drawImage(_raphaelWisdomOrbImg, -s / 2, -s / 2, s, s);
            ctx.restore();
        }
        ctx.restore();
        return;
    }

    // Launch-instant flash: a quick bright ring at the exact moment the
    // gate releases, fading out over ~260ms - reads as a distinct "release"
    // beat rather than the orb just appearing already at full flight speed.
    if (!_mobPerf && o._launchAt) {
        const since = performance.now() - o._launchAt;
        if (since < 260) {
            const fp = since / 260;
            const flashR = 12 + fp * 48;
            const flashG = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
            flashG.addColorStop(0, `rgba(255,255,255,${(1 - fp) * 0.9})`);
            flashG.addColorStop(0.6, `rgba(255,224,140,${(1 - fp) * 0.5})`);
            flashG.addColorStop(1, 'rgba(255,200,80,0)');
            ctx.fillStyle = flashG;
            ctx.beginPath(); ctx.arc(0, 0, flashR, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(255,235,180,${(1 - fp) * 0.8})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(0, 0, flashR * 0.7, 0, Math.PI * 2); ctx.stroke();
        }
    }

    // Launch phase: directional light trail behind the orb, then the image
    // itself rotated to face its travel direction.
    if (!_mobPerf) {
        const trailLen = 36 + o.speed * 2.6;
        const tg = ctx.createLinearGradient(0, 0, -Math.cos(o.ang) * trailLen, -Math.sin(o.ang) * trailLen);
        tg.addColorStop(0, 'rgba(255,226,122,0.55)');
        tg.addColorStop(1, 'rgba(255,226,122,0)');
        ctx.strokeStyle = tg;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-Math.cos(o.ang) * trailLen, -Math.sin(o.ang) * trailLen); ctx.stroke();

        // A ring of the orb's own etched glyphs, still slowly orbiting while
        // it flies - continuity with the gather phase's ring.
        _drawRaphaelWisdomGlyphRing(30, performance.now() / 450, 0.5);

        // A pulsing high-contrast danger ring around the orb itself, so it
        // reads clearly against busy/bright backgrounds (nebula, other
        // effects) instead of blending into its own warm glow - the whole
        // point being it stays easy to spot and dodge while it's actually
        // in flight, not just during the gather telegraph.
        const _ringPulse = 0.6 + 0.4 * Math.sin(performance.now() / 90);
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.3 * _ringPulse;
        ctx.strokeStyle = `rgba(255,${60 + _ringPulse * 120},${60 + _ringPulse * 120},0.9)`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 20 + _ringPulse * 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // A wide soft outer glow bed underneath everything else, so the orb
        // reads as a real presence on screen rather than just a bright dot -
        // separate from (and larger than) the tight core glow drawn with the
        // image below.
        {
            const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
            outerGlow.addColorStop(0, 'rgba(255,210,120,0.22)');
            outerGlow.addColorStop(1, 'rgba(255,210,120,0)');
            ctx.fillStyle = outerGlow;
            ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
        }

        // A pair of Saturn-style rings orbiting the orb at different speeds
        // and tilts, echoing Raphael's own armillary-ring body - the orb
        // reads as a fragment of Raphael itself, not a generic fireball.
        const _orbitNow = performance.now();
        for (let ri = 0; ri < 2; ri++) {
            ctx.save();
            ctx.rotate(_orbitNow / (900 + ri * 500) * (ri === 0 ? 1 : -1));
            ctx.scale(1, 0.35);
            ctx.strokeStyle = ri === 0 ? 'rgba(255,235,190,0.55)' : 'rgba(191,232,255,0.4)';
            ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.arc(0, 0, 26 + ri * 8, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }

    ctx.rotate(o.ang);
    if (_raphaelWisdomOrbImg.complete && _raphaelWisdomOrbImg.naturalWidth) {
        const s = 57;
        if (!_mobPerf) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.shadowColor = '#fff3c4'; ctx.shadowBlur = 20;
            ctx.drawImage(_raphaelWisdomOrbImg, -s / 2, -s / 2, s, s);
            ctx.restore();
        }
        ctx.shadowColor = '#ffcf5c'; ctx.shadowBlur = (!_mobPerf) ? 16 : 0;
        ctx.drawImage(_raphaelWisdomOrbImg, -s / 2, -s / 2, s, s);
        ctx.shadowBlur = 0;
    }
    ctx.restore();
}
function _drawRaphaelWisdomOrbs() {
    for (const o of raphaelWisdomOrbs) _drawRaphaelWisdomOrb(o);
}

// Scorched patches the Wisdom Orb leaves on each Sentinel it pierces - a
// pulsing translucent ring that fades out over its life.
function _drawRaphaelWisdomZone(z) {
    const p = 1 - z.life / z.maxLife; // 0 -> 1
    const pulse = 0.85 + Math.sin(p * Math.PI * 6) * 0.15;
    ctx.save();
    ctx.translate(z.x, z.y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, z.radius * pulse);
    g.addColorStop(0, `rgba(255,190,80,${(1 - p) * 0.28})`);
    g.addColorStop(0.7, `rgba(255,150,40,${(1 - p) * 0.16})`);
    g.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, z.radius * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,220,150,${(1 - p) * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, z.radius * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}
function _drawRaphaelWisdomZones() {
    for (const z of raphaelWisdomZones) _drawRaphaelWisdomZone(z);
}

// Enemy dispatcher
