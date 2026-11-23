// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) Dong Son spirit array pools visual renderer (fx kind 30..34).

let _muiPoolInkDisc = null;

function _muiGetPoolInkDisc() {
    if (_muiPoolInkDisc) return _muiPoolInkDisc;
    if (typeof document === 'undefined') return null;
    const c = _muiSurface(256, 256);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 12, 128, 128, 126);
    grad.addColorStop(0, 'rgba(20,84,78,0.72)');
    grad.addColorStop(0.55, 'rgba(11,59,58,0.52)');
    grad.addColorStop(0.85, 'rgba(75,42,107,0.36)');
    grad.addColorStop(0.97, 'rgba(11,59,58,0.18)');
    grad.addColorStop(1, 'rgba(11,59,58,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(128, 128, 126, 0, MUI_TAU);
    g.fill();
    _muiPoolInkDisc = c;
    return c;
}

function _drawMuiArray() {
    const arr = window._muiArray;
    if (!arr || !arr.active) return;
    const S = _muiSprites();
    const gfx = _muiGfxTier();
    const reduced = _muiReducedMotion();
    const t = window._muiClock || 0;

    let openFrac = 1;
    let alpha = 1;
    const openMs = typeof MUI_ARRAY_OPEN_MS !== 'undefined' ? MUI_ARRAY_OPEN_MS : 400;
    const fadeMs = arr.fadeMs || 600;

    if (arr.age < openMs) {
        openFrac = _muiSmooth(arr.age / openMs);
        alpha = 0.25 + 0.75 * openFrac;
    } else if (arr.age > arr.duration) {
        const closeT = _muiClamp((arr.age - arr.duration) / fadeMs, 0, 1);
        openFrac = 1 - _muiSmooth(closeT);
        alpha = 1 - closeT;
    }
    if (openFrac <= 0.005 || alpha <= 0.005) return;

    // Drum source: art image when decoded, baked fallback otherwise
    const drumSrc = _muiImgReady(_muiDrumImg) ? _muiDrumImg : S.drum;
    const pulse = 0.72 + 0.28 * Math.sin(t * 0.006);
    const zones = arr.zones;

    // Draw active particle effects in fx kind range 30 to 34
    _drawMuiPoolFx(gfx, reduced, alpha);

    // Dynamic particle emission across lifecycle
    _muiUpdatePoolParticles(arr, zones, openMs, gfx, reduced, t);

    // Draw the 8 array zones
    for (let z = 0; z < zones.length; z++) {
        _drawMuiArrayZone(zones[z], z, S, gfx, reduced, t, openFrac, alpha, drumSrc, pulse);
    }
}

// One small pool: concentric bronze drum face, ink bloom fluid opening, sequential lighting, jade flames, breathing resonance, and damage ripples
function _drawMuiArrayZone(zone, index, S, gfx, reduced, t, openFrac, alpha, drumSrc, pulse) {
    const cx = zone.x, cy = zone.y;
    // Each pool blooms outward from its center with staggered timing
    const stagger = _muiClamp(openFrac * 1.35 - index * 0.045, 0, 1);
    const bloomFrac = _muiEaseOutCubic(stagger);
    const R = zone.r * (0.12 + 0.88 * bloomFrac);
    if (R < 3) return;

    const dir = index % 2 === 0 ? 1 : -1;
    const spin = reduced ? 0 : t * 0.00045 * dir + index * 0.785;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Ink bloom fluid disc base
    const inkDisc = _muiGetPoolInkDisc();
    if (inkDisc) {
        ctx.drawImage(inkDisc, cx - R, cy - R, R * 2, R * 2);
    } else {
        const disc = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
        disc.addColorStop(0, 'rgba(17,74,70,0.65)');
        disc.addColorStop(0.62, 'rgba(11,59,58,0.50)');
        disc.addColorStop(0.9, 'rgba(75,42,107,0.34)');
        disc.addColorStop(1, 'rgba(11,59,58,0.04)');
        ctx.fillStyle = disc;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, MUI_TAU);
        ctx.fill();
    }

    // Fluid ink bloom fringe during opening phase
    if (gfx === 0 && stagger < 0.98 && !reduced) {
        const fringeP = 1 - stagger;
        ctx.save();
        ctx.globalAlpha = alpha * fringeP * 0.55;
        ctx.strokeStyle = '#3DDBB0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let a = 0; a <= 16; a++) {
            const radAngle = (a / 16) * MUI_TAU;
            const wobble = Math.sin(radAngle * 5 + index + t * 0.004) * (R * 0.07);
            const rCur = R + wobble;
            const px = cx + Math.cos(radAngle) * rCur;
            const py = cy + Math.sin(radAngle) * rCur;
            if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    // 2. Concentric bronze drum face with smooth rotation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.globalAlpha = alpha * (gfx >= 2 ? 0.55 : 0.82);
    ctx.drawImage(drumSrc, -R, -R, R * 2, R * 2);
    ctx.restore();

    // 3. Concentric drum faces sequential lighting and breathing resonance pulse
    if (gfx < 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Concentric sequential lighting wave during opening
        if (stagger < 1.0) {
            const sweepR = R * _muiClamp(stagger * 1.15, 0.05, 0.98);
            ctx.globalAlpha = alpha * (1 - stagger * 0.5) * 0.75;
            ctx.strokeStyle = '#EAF7F2';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(cx, cy, sweepR, 0, MUI_TAU);
            ctx.stroke();

            // Warm bronze illumination trailing behind sweep
            ctx.globalAlpha = alpha * 0.45;
            ctx.strokeStyle = '#C9A24A';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.arc(cx, cy, sweepR * 0.72, 0, MUI_TAU);
            ctx.stroke();
        }

        // Drum breathing resonance pulse wave
        const breathPhase = ((t * 0.00065 + index * 0.18) % 1);
        ctx.globalAlpha = alpha * (1 - breathPhase) * 0.48 * pulse;
        ctx.strokeStyle = index % 2 === 0 ? '#3DDBB0' : '#EAF7F2';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (0.12 + 0.86 * breathPhase), 0, MUI_TAU);
        ctx.stroke();

        ctx.restore();
    }

    // 4. Damage pulse ripple waves inside zones (synchronized to 400ms tick cycle)
    const arr = window._muiArray;
    if (arr && arr.active && openFrac > 0.8 && gfx < 2) {
        const damageTickMs = 400;
        const tickPhase = ((arr.age % damageTickMs) / damageTickMs);
        const waveRadius = R * (0.1 + 0.88 * _muiEaseOutQuad(tickPhase));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Primary damage pulse ripple wave
        ctx.globalAlpha = alpha * (1 - tickPhase) * (gfx === 0 ? 0.72 : 0.52);
        ctx.strokeStyle = '#3DDBB0';
        ctx.lineWidth = 2.2 * (1 - tickPhase * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, waveRadius, 0, MUI_TAU);
        ctx.stroke();

        // Secondary ripple echo in FULL graphics tier
        if (gfx === 0 && tickPhase > 0.16) {
            const echoPhase = tickPhase - 0.16;
            const echoRadius = R * (0.1 + 0.88 * _muiEaseOutQuad(echoPhase));
            ctx.globalAlpha = alpha * (1 - echoPhase) * 0.38;
            ctx.strokeStyle = '#C9A24A';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy, echoRadius, 0, MUI_TAU);
            ctx.stroke();
        }

        // Rim impact gong flash when the damage wave reaches perimeter
        if (tickPhase > 0.82) {
            const hitNorm = (tickPhase - 0.82) / 0.18;
            const flashPower = Math.sin(hitNorm * Math.PI) * alpha * 0.65;
            ctx.globalAlpha = flashPower;
            ctx.strokeStyle = '#EAF7F2';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.arc(cx, cy, R - 1, 0, MUI_TAU);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 5. Outer Jade rim with ancient bronze inner line
    ctx.globalAlpha = alpha * 0.92;
    ctx.strokeStyle = '#3DDBB0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 1, 0, MUI_TAU);
    ctx.stroke();

    ctx.globalAlpha = alpha * (0.42 + 0.32 * pulse);
    ctx.strokeStyle = '#C9A24A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 5, 0, MUI_TAU);
    ctx.stroke();

    // 6. Full detail: drifting spirit motes and glowing goat skull with burning jade flame eyes
    if (gfx === 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (!reduced) {
            // Ethereal spirit motes drifting over the drum face
            for (let i = 0; i < 5; i++) {
                const p = ((t * (0.00038 + (i % 3) * 0.00011) + i * 0.2 + index * 0.13) % 1);
                const ang = i * 2.399963 + index;
                const rad = R * (0.2 + 0.6 * ((i * 0.618) % 1));
                ctx.globalAlpha = Math.sin(p * Math.PI) * alpha * 0.68;
                ctx.fillStyle = i % 3 === 0 ? '#EAF7F2' : '#3DDBB0';
                ctx.beginPath();
                ctx.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad - p * R * 0.4, 1.5 + (i % 2), 0, MUI_TAU);
                ctx.fill();
            }
        }

        // Goat skull positioning above drum rim
        const skullSize = R * 0.62;
        const skullX = cx;
        const skullY = cy - R - skullSize * 0.22;

        // Background jade spirit halo behind skull
        ctx.globalAlpha = alpha * 0.42 * (0.78 + 0.22 * Math.sin(t * 0.007 + index));
        ctx.drawImage(S.jadeGlow, skullX - skullSize * 0.9, skullY - skullSize * 0.8, skullSize * 1.8, skullSize * 1.6);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        const skullImg = _muiFxImg('goat-skull') || S.skull;
        ctx.drawImage(skullImg, skullX - skullSize * 0.5, skullY - skullSize * 0.5, skullSize, skullSize);

        // Burning jade flame eye sockets
        _drawMuiGoatSkullFlames(skullX, skullY, skullSize, alpha, t, index, reduced);

        ctx.restore();
    } else if (gfx === 1) {
        // Medium tier: simplified skull and eye glow
        const skullSize = R * 0.58;
        const skullX = cx;
        const skullY = cy - R - skullSize * 0.22;
        ctx.save();
        ctx.globalAlpha = alpha;
        const skullImg = _muiFxImg('goat-skull') || S.skull;
        ctx.drawImage(skullImg, skullX - skullSize * 0.5, skullY - skullSize * 0.5, skullSize, skullSize);
        _drawMuiGoatSkullFlames(skullX, skullY, skullSize, alpha, t, index, true);
        ctx.restore();
    }

    ctx.restore();
}

// Goat skull fiery eye sockets burning jade flame
function _drawMuiGoatSkullFlames(skullX, skullY, skullSize, alpha, t, index, staticMode) {
    const eyeOffset = skullSize * 0.125;
    const eyeY = skullY - skullSize * 0.015;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let side = -1; side <= 1; side += 2) {
        const ex = skullX + side * eyeOffset;
        const ey = eyeY;

        if (staticMode) {
            // Calm steady jade glow for reduced motion or medium tier
            ctx.globalAlpha = alpha * 0.85;
            ctx.fillStyle = '#3DDBB0';
            ctx.beginPath();
            ctx.arc(ex, ey, skullSize * 0.045, 0, MUI_TAU);
            ctx.fill();

            ctx.fillStyle = '#EAF7F2';
            ctx.beginPath();
            ctx.arc(ex, ey, skullSize * 0.02, 0, MUI_TAU);
            ctx.fill();
        } else {
            // Natural dynamic canvas flame animation
            const f1 = Math.sin(t * 0.018 + index * 1.6 + side * 2.1);
            const f2 = Math.cos(t * 0.029 - index * 0.8 + side * 1.3);
            const flameH = skullSize * (0.16 + 0.06 * f1 + 0.03 * f2);
            const flameW = skullSize * 0.065;
            const tipX = ex + (f2 * flameW * 0.45);
            const tipY = ey - flameH;

            // Outer jade spirit flame body
            ctx.globalAlpha = alpha * 0.88;
            ctx.fillStyle = '#3DDBB0';
            ctx.beginPath();
            ctx.moveTo(ex - flameW, ey + flameW * 0.3);
            ctx.quadraticCurveTo(ex - flameW * 0.9, ey - flameH * 0.55, tipX, tipY);
            ctx.quadraticCurveTo(ex + flameW * 0.9, ey - flameH * 0.55, ex + flameW, ey + flameW * 0.3);
            ctx.closePath();
            ctx.fill();

            // Inner white-hot spirit flame core
            ctx.globalAlpha = alpha * 0.95;
            ctx.fillStyle = '#EAF7F2';
            const coreH = flameH * 0.58;
            const coreW = flameW * 0.48;
            ctx.beginPath();
            ctx.moveTo(ex - coreW, ey + coreW * 0.2);
            ctx.quadraticCurveTo(ex - coreW * 0.8, ey - coreH * 0.5, ex + (f2 * coreW * 0.25), ey - coreH);
            ctx.quadraticCurveTo(ex + coreW * 0.8, ey - coreH * 0.5, ex + coreW, ey + coreW * 0.2);
            ctx.closePath();
            ctx.fill();
        }
    }

    ctx.restore();
}

// Lifecycle particle emission for array zones
function _muiUpdatePoolParticles(arr, zones, openMs, gfx, reduced, t) {
    if (gfx >= 2 || reduced || !zones || !zones.length) return;

    if (typeof arr._n3aLastTime === 'undefined') {
        arr._n3aLastTime = t;
        arr._n3aLastDamageTick = Math.floor(arr.age / 400);
    }

    const dt = t - arr._n3aLastTime;
    arr._n3aLastTime = t;
    if (dt <= 0 || dt > 100) return;

    // 1. Opening ink bloom fluid motes (kind 30)
    if (arr.age < openMs && Math.random() < 0.35) {
        const zIdx = Math.floor(Math.random() * zones.length);
        const z = zones[zIdx];
        const ang = Math.random() * MUI_TAU;
        const dist = Math.random() * z.r * 0.8;
        const spd = 0.03 + Math.random() * 0.05;
        _muiEmitFxHelper(
            30,
            z.x + Math.cos(ang) * dist,
            z.y + Math.sin(ang) * dist,
            280 + Math.random() * 160,
            1.0 + Math.random() * 0.8,
            ang,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd
        );
    }

    // 2. Damage pulse ripples (kind 32)
    const curTick = Math.floor(arr.age / 400);
    if (curTick > arr._n3aLastDamageTick && arr.age < arr.duration) {
        arr._n3aLastDamageTick = curTick;
        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            _muiEmitFxHelper(32, z.x, z.y, 380, z.r, 0, 0, 0);
        }
    }

    // 3. Goat skull flame sparks (kind 33, FULL tier only)
    if (gfx === 0 && arr.age < arr.duration && Math.random() < 0.28) {
        const zIdx = Math.floor(Math.random() * zones.length);
        const z = zones[zIdx];
        const side = Math.random() < 0.5 ? -1 : 1;
        const skullSize = z.r * 0.62;
        const ex = z.x + side * skullSize * 0.125;
        const ey = z.y - z.r - skullSize * 0.235;
        const spd = -(0.04 + Math.random() * 0.06);
        _muiEmitFxHelper(
            33,
            ex + (Math.random() - 0.5) * 4,
            ey,
            240 + Math.random() * 140,
            1.2 + Math.random() * 0.6,
            0,
            (Math.random() - 0.5) * 0.02,
            spd
        );
    }

    // 4. Closing dissolution mist particles (kind 34)
    if (arr.age >= arr.duration && Math.random() < 0.45) {
        const zIdx = Math.floor(Math.random() * zones.length);
        const z = zones[zIdx];
        const ang = Math.random() * MUI_TAU;
        const dist = Math.random() * z.r * 0.9;
        _muiEmitFxHelper(
            34,
            z.x + Math.cos(ang) * dist,
            z.y + Math.sin(ang) * dist,
            340 + Math.random() * 200,
            1.0 + Math.random() * 0.9,
            0,
            (Math.random() - 0.5) * 0.03,
            -(0.02 + Math.random() * 0.04)
        );
    }
}

// Render particle fx kinds 30 to 34
function _drawMuiPoolFx(gfx, reduced, baseAlpha) {
    if (typeof window === 'undefined' || !window._muiFx) return;
    const pool = window._muiFx;
    const max = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : pool.length;

    for (let i = 0; i < max; i++) {
        const fx = pool[i];
        if (!fx || !fx.active) continue;
        const kind = fx.kind;
        if (kind < 30 || kind > 34) continue;

        const p = _muiClamp(fx.age / fx.life, 0, 1);
        ctx.save();

        if (kind === 30) {
            // Ink bloom fluid motes
            const fade = Math.sin(p * Math.PI) * baseAlpha;
            const r = (3 + fx.scale * 4) * (0.4 + 0.6 * p);
            ctx.globalAlpha = fade * 0.62;
            ctx.fillStyle = fx.seed % 2 < 1 ? '#3DDBB0' : '#0B3B3A';
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, r, 0, MUI_TAU);
            ctx.fill();
        } else if (kind === 31) {
            // Drum breathing resonance pulse wave
            if (gfx < 2) {
                const ringP = _muiSmooth(p);
                const r = fx.scale * (0.15 + 0.85 * ringP);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = (1 - ringP) * baseAlpha * 0.45;
                ctx.strokeStyle = '#C9A24A';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, r, 0, MUI_TAU);
                ctx.stroke();
            }
        } else if (kind === 32) {
            // Damage pulse ripple wave
            if (gfx < 2) {
                const waveP = _muiEaseOutQuad(p);
                const r = fx.scale * (0.1 + 0.9 * waveP);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = (1 - waveP) * baseAlpha * 0.72;
                ctx.strokeStyle = '#3DDBB0';
                ctx.lineWidth = 2.4 * (1 - waveP * 0.5);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, r, 0, MUI_TAU);
                ctx.stroke();
            }
        } else if (kind === 33) {
            // Goat skull fiery eye spark
            if (gfx === 0 && !reduced) {
                const sparkP = 1 - p;
                const r = (1.5 + fx.scale * 1.5) * sparkP;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = sparkP * baseAlpha * 0.88;
                ctx.fillStyle = p < 0.4 ? '#EAF7F2' : '#3DDBB0';
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, r, 0, MUI_TAU);
                ctx.fill();
            }
        } else if (kind === 34) {
            // Dissolution mist motes during pool closing
            const mistFade = Math.sin(p * Math.PI) * baseAlpha;
            const r = (4 + fx.scale * 6) * (0.5 + 0.5 * p);
            ctx.globalAlpha = mistFade * 0.48;
            ctx.fillStyle = fx.seed % 2 < 1 ? '#0B3B3A' : '#4B2A6B';
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, r, 0, MUI_TAU);
            ctx.fill();
        }

        ctx.restore();
    }
}
