// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) Legion call detail and ornamentation visual renderer (fx kind 15 to 19).

let _muiCallPillarCanvas = null;

function _muiBakeCallPillar() {
    if (_muiCallPillarCanvas) return _muiCallPillarCanvas;
    const w = 96;
    const h = 384;
    const c = _muiSurface(w, h);
    const g = c.getContext('2d');
    const halfW = w * 0.5;

    // Horizontal soft jade envelope with bright bone white central filament
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(61,219,176,0)');
    grad.addColorStop(0.24, 'rgba(11,59,58,0.18)');
    grad.addColorStop(0.38, 'rgba(61,219,176,0.38)');
    grad.addColorStop(0.47, 'rgba(234,247,242,0.85)');
    grad.addColorStop(0.50, 'rgba(234,247,242,0.98)');
    grad.addColorStop(0.53, 'rgba(234,247,242,0.85)');
    grad.addColorStop(0.62, 'rgba(61,219,176,0.38)');
    grad.addColorStop(0.76, 'rgba(11,59,58,0.18)');
    grad.addColorStop(1, 'rgba(61,219,176,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Vertical feathering from solid base to ethereal sky exit
    g.globalCompositeOperation = 'destination-in';
    const vGrad = g.createLinearGradient(0, 0, 0, h);
    vGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    vGrad.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    vGrad.addColorStop(0.85, 'rgba(255,255,255,0.95)');
    vGrad.addColorStop(1, 'rgba(255,255,255,0.70)');
    g.fillStyle = vGrad;
    g.fillRect(0, 0, w, h);

    _muiCallPillarCanvas = c;
    return c;
}

function _muiCalcWaveRadius(maxR, elapsed) {
    if (typeof _muiWindupRadius === 'function') {
        return _muiWindupRadius(maxR, elapsed);
    }
    const t = Math.min(1, Math.max(0, elapsed) / 450);
    const rest = 1 - t;
    return maxR * (1 - rest * rest * rest);
}

// Feature 1: Procedural call-sigil stroke drawing on floor or space (fx kind 15)
function _drawMuiCallSigilStroke(ctx, wave, age, gfx, reduced) {
    const dur = typeof MUI_WINDUP_MS !== 'undefined' ? MUI_WINDUP_MS : 500;
    if (age < 0 || age >= dur + 120) return;

    const strokeProg = _muiClamp(age / 240, 0, 1);
    const fullIllum = age < 240 ? strokeProg : (age < 440 ? 1 : _muiClamp(1 - (age - 440) / 180, 0, 1));
    if (fullIllum <= 0) return;

    const sigilR = Math.min(230, Math.max(120, wave.maxR * 0.22));
    const rot = age * 0.0028 * (1 - age * 0.0011);

    ctx.save();
    ctx.translate(wave.x, wave.y);
    if (gfx < 2 && !reduced) ctx.globalCompositeOperation = 'lighter';
    ctx.scale(1, 0.74);

    // 1. Procedural dual sweeping outer ring stroke
    const sweep = strokeProg * Math.PI;
    ctx.lineWidth = gfx === 0 ? 3.2 : 2.2;
    ctx.strokeStyle = '#3DDBB0';
    ctx.globalAlpha = 0.88 * fullIllum;

    ctx.beginPath();
    ctx.arc(0, 0, sigilR, rot, rot + sweep);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, sigilR, rot + Math.PI, rot + Math.PI + sweep);
    ctx.stroke();

    // 2. Burning stroke head sparks at the leading edges of the sweep
    if (!reduced && strokeProg < 0.99) {
        const headA1 = rot + sweep;
        const headA2 = rot + Math.PI + sweep;
        ctx.fillStyle = '#EAF7F2';
        ctx.globalAlpha = 0.96 * fullIllum;
        ctx.beginPath();
        ctx.arc(Math.cos(headA1) * sigilR, Math.sin(headA1) * sigilR, 3.6, 0, MUI_TAU);
        ctx.arc(Math.cos(headA2) * sigilR, Math.sin(headA2) * sigilR, 3.6, 0, MUI_TAU);
        ctx.fill();

        // Emit occasional etched line spark into pool
        if (gfx === 0 && (age % 50 < 16)) {
            _muiEmitFxHelper(15, wave.x + Math.cos(headA1) * sigilR, wave.y + Math.sin(headA1) * sigilR * 0.74, 280, 1.2, headA1, 0, 0);
        }
    }

    // 3. Inner concentric rings
    if (gfx < 2) {
        const innerProg = _muiClamp((age - 40) / 200, 0, 1);
        if (innerProg > 0) {
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = '#C9A24A';
            ctx.globalAlpha = 0.72 * innerProg * fullIllum;
            ctx.beginPath();
            ctx.arc(0, 0, sigilR * 0.76, -rot * 0.8, -rot * 0.8 + innerProg * MUI_TAU);
            ctx.stroke();

            ctx.lineWidth = 1.2;
            ctx.strokeStyle = '#EAF7F2';
            ctx.beginPath();
            ctx.arc(0, 0, sigilR * 0.44, rot * 1.2, rot * 1.2 + innerProg * MUI_TAU);
            ctx.stroke();
        }
    }

    // 4. Twelve celestial rune tick marks around perimeter
    if (gfx === 0 && !reduced) {
        const ticks = 12;
        for (let i = 0; i < ticks; i++) {
            const tickFrac = i / ticks;
            if (tickFrac > strokeProg) continue;
            const ta = rot + tickFrac * MUI_TAU;
            const cosTa = Math.cos(ta);
            const sinTa = Math.sin(ta);
            ctx.strokeStyle = (i % 3 === 0) ? '#EAF7F2' : '#3DDBB0';
            ctx.lineWidth = (i % 3 === 0) ? 2.4 : 1.4;
            ctx.globalAlpha = 0.78 * fullIllum;
            ctx.beginPath();
            ctx.moveTo(cosTa * (sigilR * 0.76), sinTa * (sigilR * 0.76));
            ctx.lineTo(cosTa * sigilR, sinTa * sigilR);
            ctx.stroke();
        }
    }

    // 5. Stylized inscribed goat horn talisman spirals in core
    if (gfx === 0 && fullIllum > 0.3) {
        ctx.strokeStyle = '#3DDBB0';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.55 * fullIllum;
        for (let h = 0; h < 4; h++) {
            const ha = rot + h * (Math.PI * 0.5);
            ctx.save();
            ctx.rotate(ha);
            ctx.beginPath();
            ctx.moveTo(sigilR * 0.12, 0);
            ctx.bezierCurveTo(sigilR * 0.24, -sigilR * 0.18, sigilR * 0.42, -sigilR * 0.14, sigilR * 0.38, sigilR * 0.08);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 6. Authentic art texture blend for high detail depth
    const sigilImg = !reduced && gfx < 2 ? _muiFxImg('call-sigil') : null;
    if (sigilImg && fullIllum > 0.2) {
        const expandScale = 1 + (1 - fullIllum) * 0.12;
        const half = sigilR * expandScale;
        ctx.save();
        ctx.rotate(rot);
        ctx.globalAlpha = 0.44 * fullIllum;
        ctx.drawImage(sigilImg, -half, -half, 2 * half, 2 * half);
        ctx.restore();
    }

    ctx.restore();
}

// Feature 2: Ascending pillar of jade light from player ship (fx kind 16)
function _drawMuiCallPillar(ctx, px, py, age, gfx, reduced) {
    if (age < 30 || age > 480) return;

    const pillarCanvas = _muiBakeCallPillar();
    const growth = _muiClamp((age - 30) / 75, 0, 1);
    const alpha = age < 120 ? growth : (age < 330 ? 1 : _muiClamp(1 - (age - 330) / 150, 0, 1));
    if (alpha <= 0) return;

    const beamHeight = py + 80;
    const currentH = beamHeight * growth;
    const topY = py - currentH;
    const jitter = (!reduced && gfx === 0) ? Math.sin(age * 0.04) * 2.5 : 0;
    const beamW = (gfx === 0 ? 92 : 64) * (0.88 + 0.12 * Math.sin(age * 0.03)) * (gfx === 0 ? 1 : 0.82);
    const coreW = (gfx === 0 ? 13 : 9) * alpha;

    ctx.save();
    if (gfx < 2 && !reduced) ctx.globalCompositeOperation = 'lighter';

    // 1. Broad jade envelope using baked column
    ctx.globalAlpha = 0.85 * alpha;
    ctx.drawImage(pillarCanvas, px - beamW * 0.5 + jitter, topY, beamW, currentH);

    // 2. High intensity bone white core beam
    ctx.strokeStyle = '#EAF7F2';
    ctx.lineWidth = coreW;
    ctx.globalAlpha = 0.92 * alpha;
    ctx.beginPath();
    ctx.moveTo(px + jitter, py);
    ctx.lineTo(px + jitter, topY);
    ctx.stroke();

    // 3. Vertical ascending energy strands
    if (gfx < 2 && !reduced && currentH > 40) {
        ctx.lineWidth = 1.4;
        for (let s = 0; s < 3; s++) {
            const strandX = px + (s - 1) * (beamW * 0.22);
            const strandSpeed = 2.4 + s * 0.6;
            const strandY = py - ((age * strandSpeed + s * 80) % currentH);
            ctx.strokeStyle = s === 1 ? '#EAF7F2' : '#3DDBB0';
            ctx.globalAlpha = 0.70 * alpha;
            ctx.beginPath();
            ctx.moveTo(strandX, strandY);
            ctx.lineTo(strandX, Math.max(topY, strandY - 32));
            ctx.stroke();
        }
    }

    // 4. Ship base eruption flare
    const baseR = (36 + (1 - alpha) * 12) * alpha;
    const S = _muiSprites();
    ctx.globalAlpha = 0.82 * alpha;
    ctx.drawImage(S.jadeGlow, px - baseR, py - baseR, baseR * 2, baseR * 2);

    // Emit light pillar particles into pool during peak phase
    if (gfx === 0 && !reduced && age > 80 && age < 300 && (age % 40 < 16)) {
        const sparkX = px + (Math.sin(age * 0.1) * beamW * 0.35);
        _muiEmitFxHelper(16, sparkX, py - Math.random() * (currentH * 0.6), 340, 1.3, 0, 0, -0.22);
    }

    ctx.restore();
}

// Feature 3: Goat horn radiant halo crown above player ship (fx kind 17)
function _drawMuiCallGoatCrown(ctx, px, py, age, gfx, reduced) {
    if (age < 80 || age > 510) return;

    const curl = _muiEaseOutCubic(_muiClamp((age - 80) / 130, 0, 1));
    const alpha = age < 210 ? curl : (age < 360 ? 1 : _muiClamp(1 - (age - 360) / 150, 0, 1));
    if (alpha <= 0) return;

    const crownY = py - 24;

    ctx.save();
    ctx.translate(px, crownY);
    if (gfx < 2 && !reduced) ctx.globalCompositeOperation = 'lighter';

    // Draw left and right curling goat horns symmetrically
    for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.scale(side * curl, curl);

        // Outer horn sweep curve
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-14, -18, -38, -32, -48, -14);
        ctx.bezierCurveTo(-54, 2, -40, 16, -32, 6);
        ctx.quadraticCurveTo(-42, -2, -38, -16);
        ctx.quadraticCurveTo(-26, -18, 0, 0);
        ctx.closePath();

        ctx.fillStyle = '#0B3B3A';
        ctx.globalAlpha = 0.52 * alpha;
        ctx.fill();

        ctx.strokeStyle = '#EAF7F2';
        ctx.lineWidth = gfx === 0 ? 2.0 : 1.4;
        ctx.globalAlpha = 0.90 * alpha;
        ctx.stroke();

        // Ancient bronze gold ridge rings along horn body
        if (gfx === 0 && !reduced) {
            ctx.strokeStyle = '#C9A24A';
            ctx.lineWidth = 1.6;
            ctx.globalAlpha = 0.82 * alpha;
            for (let r = 0; r < 3; r++) {
                const rx = -18 - r * 9;
                const ry = -22 + r * 4;
                ctx.beginPath();
                ctx.moveTo(rx - 2, ry - 5);
                ctx.lineTo(rx + 3, ry + 5);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // Central crown jade star diamond emblem between horns
    ctx.globalAlpha = 0.95 * alpha;
    ctx.fillStyle = '#EAF7F2';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(6, -10);
    ctx.lineTo(0, -2);
    ctx.lineTo(-6, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3DDBB0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Soft radiant halo glow behind crown
    if (gfx < 2) {
        const S = _muiSprites();
        ctx.globalAlpha = 0.40 * alpha;
        ctx.drawImage(S.jadeGlow, -42, -42, 84, 84);
    }

    // When horns dissolve near windup conclusion, emit dispersing halo motes
    if (gfx === 0 && !reduced && age > 360 && age < 440 && (age % 30 < 16)) {
        _muiEmitFxHelper(17, px - 36, crownY - 14, 380, 1.1, -0.6, -0.08, -0.05);
        _muiEmitFxHelper(17, px + 36, crownY - 14, 380, 1.1, 0.6, 0.08, -0.05);
    }

    ctx.restore();
}

// Feature 4: Enemies flash jade luminescence as shockwave sweeps over them (fx kind 18)
function _drawMuiCallEnemyFlash(ctx, wave, age, gfx, reduced) {
    if (typeof enemies === 'undefined' || !enemies || enemies.length === 0) return;

    const rWave = _muiCalcWaveRadius(wave.maxR, age);
    const sweepBand = 32;
    const S = _muiSprites();

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || e._markedForDeath || e._deathPhase) continue;
        if (e.type && (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain' || e.type === 'veilshroud_echo')) continue;

        // Detect shockwave collision on front if not already marked
        if (wave && age < 450) {
            const dx = e.x - wave.x;
            const dy = e.y - wave.y;
            const dist = Math.hypot(dx, dy);
            if (Math.abs(dist - rWave) < sweepBand && e._muiWaveSeen !== wave.id) {
                e._muiWaveSeen = wave.id;
                e._muiHitFlashMs = 150;
                if (gfx === 0 && !reduced) {
                    _muiEmitFxHelper(18, e.x, e.y, 320, 1.2, 0, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12);
                }
            }
        }

        if (!e._muiHitFlashMs || e._muiHitFlashMs <= 0) continue;
        const fp = _muiClamp(e._muiHitFlashMs / 150, 0, 1);
        const er = Math.max(16, (e.size || 40) * 0.5);

        ctx.save();
        if (gfx < 2 && !reduced) ctx.globalCompositeOperation = 'lighter';

        // 1. Expanding ethereal jade ripple ring
        const ripR = er * (1.0 + (1 - fp) * 0.75);
        ctx.strokeStyle = fp > 0.6 ? '#EAF7F2' : '#3DDBB0';
        ctx.lineWidth = (gfx === 0 ? 2.6 : 1.8) * fp;
        ctx.globalAlpha = fp * 0.85;
        ctx.beginPath();
        ctx.arc(e.x, e.y, ripR, 0, MUI_TAU);
        ctx.stroke();

        // 2. Smooth chromatic slide luminescence
        if (gfx < 2) {
            const glowR = er * (1.2 + (1 - fp) * 0.3);
            ctx.globalAlpha = fp * 0.55;
            ctx.drawImage(S.jadeGlow, e.x - glowR, e.y - glowR, glowR * 2, glowR * 2);
        }

        // 3. Bone jade rim halo around enemy core
        ctx.strokeStyle = fp > 0.5 ? '#EAF7F2' : '#0B3B3A';
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = fp * 0.65;
        ctx.beginPath();
        ctx.arc(e.x, e.y, er * 0.94, 0, MUI_TAU);
        ctx.stroke();

        ctx.restore();
    }
}

// Render pool particles for kinds 15 to 19
function _drawMuiCallParticles(ctx, gfx, reduced) {
    if (typeof window === 'undefined' || !window._muiFx) return;
    const pool = window._muiFx;
    const max = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : pool.length;

    for (let i = 0; i < max; i++) {
        const fx = pool[i];
        if (!fx || !fx.active) continue;
        if (fx.kind < 15 || fx.kind > 19) continue;
        const p = _muiClamp(fx.age / fx.life, 0, 1);
        const invP = 1 - p;

        ctx.save();
        ctx.translate(fx.x, fx.y);
        if (gfx < 2 && !reduced) ctx.globalCompositeOperation = 'lighter';

        if (fx.kind === 15) {
            // Call sigil stroke spark mote
            ctx.fillStyle = '#EAF7F2';
            ctx.globalAlpha = invP * 0.92;
            const rad = (2.8 * (1 - p * 0.4)) * fx.scale;
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, MUI_TAU);
            ctx.fill();
        } else if (fx.kind === 16) {
            // Ascending light pillar vertical diamond streak
            ctx.fillStyle = (i % 2 === 0) ? '#EAF7F2' : '#3DDBB0';
            ctx.globalAlpha = invP * 0.88;
            const streakH = (12 * (1 - p * 0.3)) * fx.scale;
            const streakW = 2.4 * fx.scale;
            ctx.beginPath();
            ctx.moveTo(0, -streakH);
            ctx.lineTo(streakW, 0);
            ctx.lineTo(0, streakH * 0.5);
            ctx.lineTo(-streakW, 0);
            ctx.closePath();
            ctx.fill();
        } else if (fx.kind === 17) {
            // Goat horn crown halo drifting mote
            ctx.fillStyle = (i % 3 === 0) ? '#C9A24A' : '#3DDBB0';
            ctx.globalAlpha = invP * 0.85;
            const sz = (3.2 * invP) * fx.scale;
            ctx.beginPath();
            ctx.arc(0, 0, sz, 0, MUI_TAU);
            ctx.fill();
        } else if (fx.kind === 18) {
            // Enemy shockwave luminescence spark
            ctx.fillStyle = '#3DDBB0';
            ctx.globalAlpha = invP * 0.90;
            const sparkR = (4.0 * invP) * fx.scale;
            ctx.beginPath();
            ctx.moveTo(0, -sparkR);
            ctx.lineTo(sparkR * 0.3, 0);
            ctx.lineTo(0, sparkR);
            ctx.lineTo(-sparkR * 0.3, 0);
            ctx.closePath();
            ctx.fill();
        } else if (fx.kind === 19) {
            // Auxiliary call detail ambient mote
            ctx.fillStyle = '#EAF7F2';
            ctx.globalAlpha = invP * 0.70;
            ctx.beginPath();
            ctx.arc(0, 0, 1.8 * fx.scale, 0, MUI_TAU);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Main entry function called in js/render/core.js right after _drawMuiCall()
function _drawMuiCallDetail() {
    const wave = typeof window !== 'undefined' ? window._muiWindupFx : null;
    const gfx = _muiGfxTier();
    const reduced = _muiReducedMotion();

    // 1. Render active windup visuals
    if (wave) {
        const age = window._muiClock - wave.start;
        const px = (typeof player !== 'undefined' && player) ? player.x : wave.x;
        const py = (typeof player !== 'undefined' && player) ? player.y : wave.y;

        _drawMuiCallSigilStroke(ctx, wave, age, gfx, reduced);
        _drawMuiCallPillar(ctx, px, py, age, gfx, reduced);
        _drawMuiCallGoatCrown(ctx, px, py, age, gfx, reduced);
        _drawMuiCallEnemyFlash(ctx, wave, age, gfx, reduced);
    }

    // 2. Render allocated particles (kinds 15 to 19)
    _drawMuiCallParticles(ctx, gfx, reduced);
}
