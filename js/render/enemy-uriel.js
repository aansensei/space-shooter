// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/render/enemy-uriel.js — Uriel's body (wings, halo, tracking eye row,
// divine-relic core), Camouflage shield dome, Holy Sword projectile, and
// its on-death Protection barrier. Ported from the standalone preview demo
// (misc/uriel-preview-demo.html) into real enemy-state-driven rendering.
// Depends on render/core.js (ctx, _mobPerf, _gfxLevel) + entities/uriel.js
// (window._urielHolySwords / _urielBarriers). Loads after enemy-common.js.

const _urielCoreImg = new Image();
_urielCoreImg.src = 'assets/images/game/enemies/uriel-divine-core.png';
const _urielSwordImg = new Image();
_urielSwordImg.src = 'assets/images/game/enemies/uriel-holy-sword.png';

const URIEL_GOLD = '#ffd76b', URIEL_WHITE = '#fffaf0', URIEL_BLUE = '#7aa8ff';

// Covenant King's granted buff, drawn on every OTHER enemy that currently
// holds it (called from enemy-common.js's drawEnemy(), not from Uriel's own
// render). Brighter/thicker while a Uriel Iron Body layer still sits ready
// to absorb a hit; dims to a thin standby ring while that layer is spent
// and waiting out its 5s re-grant timer, so the two states read apart.
function _drawUrielBuffRing(enemy) {
    const now = performance.now();
    const r = (enemy.size || 20) / 2 + 8;
    const hasIB = !!enemy._urielIB;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(now / 2600);
    ctx.strokeStyle = hasIB ? 'rgba(255,225,130,0.9)' : 'rgba(255,225,130,0.35)';
    ctx.lineWidth = hasIB ? 2 : 1.3;
    ctx.setLineDash([5, 5]);
    if (!_mobPerf && _gfxLevel < 2 && hasIB) { ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = 8; }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function _urielBlink(enemy, idx, now) {
    if (!enemy._eyeBlinks) enemy._eyeBlinks = Array.from({ length: 7 }, () => 4000 + Math.random() * 4000);
    const cycle = enemy._eyeBlinks[idx];
    const phase = (now % cycle) / cycle;
    return phase > 0.96 ? Math.abs(Math.sin((phase - 0.96) / 0.04 * Math.PI)) : 1;
}

function _drawUrielEye(enemy, ex, ey, w, h, targetAng, idx, now) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(1, Math.max(0.06, _urielBlink(enemy, idx, now)));

    // Deep shadow under the eye for integration into the relic surface.
    ctx.fillStyle = 'rgba(10,8,5,0.6)';
    ctx.beginPath(); ctx.ellipse(0, h * 0.15, w * 1.1, h * 1.1, 0, 0, Math.PI * 2); ctx.fill();

    // Outer lid/socket with metallic rim.
    const socketG = ctx.createLinearGradient(0, -h, 0, h);
    socketG.addColorStop(0, '#ffe599'); socketG.addColorStop(0.5, '#b38230'); socketG.addColorStop(1, '#33220a');
    ctx.fillStyle = socketG;
    ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); ctx.fill();

    // Inner dark recess.
    ctx.fillStyle = '#0f0a05';
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.92, h * 0.92, 0, 0, Math.PI * 2); ctx.fill();

    // Lash/rim highlight.
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -h * 0.1, w * 0.95, h * 0.95, 0, Math.PI, Math.PI * 2); ctx.stroke();

    // Sclera glow with depth.
    const sclera = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h));
    sclera.addColorStop(0, 'rgba(255,250,230,1)');
    sclera.addColorStop(0.5, 'rgba(255,210,130,0.8)');
    sclera.addColorStop(1, 'rgba(120,60,10,0.2)');
    ctx.fillStyle = sclera;
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.88, h * 0.88, 0, 0, Math.PI * 2); ctx.fill();

    const maxOff = Math.min(w, h) * 0.35;
    const ix = Math.cos(targetAng) * maxOff, iy = Math.sin(targetAng) * maxOff;
    const irisR = Math.min(w, h) * 0.42;
    ctx.save();
    ctx.translate(ix, iy);

    // Outer iris dark rim.
    ctx.fillStyle = '#102040';
    ctx.beginPath(); ctx.arc(0, 0, irisR * 1.07, 0, Math.PI * 2); ctx.fill();

    // Iris radial gradient.
    const irisG = ctx.createRadialGradient(0, 0, irisR * 0.2, 0, 0, irisR);
    irisG.addColorStop(0, '#aaddff'); irisG.addColorStop(0.6, '#4477ff'); irisG.addColorStop(1, '#002288');
    ctx.fillStyle = irisG;
    ctx.beginPath(); ctx.arc(0, 0, irisR, 0, Math.PI * 2); ctx.fill();

    // Radial striations.
    ctx.strokeStyle = 'rgba(200,240,255,0.4)'; ctx.lineWidth = 0.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * irisR * 0.3, Math.sin(a) * irisR * 0.3);
        ctx.lineTo(Math.cos(a) * irisR * 0.9, Math.sin(a) * irisR * 0.9);
        ctx.stroke();
    }

    // Pupil + inner glow.
    ctx.fillStyle = '#050a14';
    ctx.beginPath(); ctx.arc(0, 0, irisR * 0.4, 0, Math.PI * 2); ctx.fill();
    const pupilG = ctx.createRadialGradient(0, 0, 0, 0, 0, irisR * 0.4);
    pupilG.addColorStop(0, 'rgba(122,168,255,0.6)'); pupilG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pupilG;
    ctx.beginPath(); ctx.arc(0, 0, irisR * 0.4, 0, Math.PI * 2); ctx.fill();

    // Sharp specular highlights.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(-irisR * 0.3, -irisR * 0.3, irisR * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(irisR * 0.4, irisR * 0.3, irisR * 0.1, 0, Math.PI * 2); ctx.fill();

    ctx.restore(); // end iris translation

    // Volumetric glow spilling out of the eye.
    if (!_mobPerf && _gfxLevel < 2) {
        const spill = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 1.5);
        spill.addColorStop(0, 'rgba(255,230,150,0.3)'); spill.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = spill;
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath(); ctx.ellipse(0, 0, w * 1.3, h * 1.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
}

function _drawUrielWing(side, i, sway, flare, r) {
    const spread = (0.30 + i * 0.30 + flare * 0.22) * side;
    ctx.save();
    ctx.rotate(spread + sway);
    const len = r * (1.5 + i * 0.35 + flare * 0.4);
    const baseX = r * 0.45 * side;

    ctx.beginPath();
    ctx.moveTo(baseX, -r * 0.08);
    ctx.quadraticCurveTo(len * 0.55 * side, len * -0.34, len * side, len * -0.06);
    ctx.quadraticCurveTo(len * 0.5 * side, len * 0.1, baseX * 0.7, r * 0.12);
    const baseG = ctx.createLinearGradient(baseX, 0, len * side, 0);
    baseG.addColorStop(0, 'rgba(255,225,160,0.2)');
    baseG.addColorStop(1, 'rgba(255,255,255,0.7)');
    ctx.fillStyle = baseG;
    if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = 10 + flare * 6; }
    ctx.fill();
    ctx.shadowBlur = 0;

    const numFeathers = _mobPerf ? 5 : (9 + i * 2);
    for (let f = 0; f < numFeathers; f++) {
        const t = f / (numFeathers - 1);
        const fx = baseX * 0.7 * (1 - t) * (1 - t) + 2 * (len * 0.5 * side) * (1 - t) * t + (len * side) * t * t;
        const fy = (r * 0.12) * (1 - t) * (1 - t) + 2 * (len * 0.1) * (1 - t) * t + (len * -0.06) * t * t;
        const featherLen = r * (0.4 + (1 - t) * 0.5 + flare * 0.2);
        const featherAng = (side > 0 ? 0.2 : -0.2) + t * (side > 0 ? -0.4 : 0.4);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(featherAng);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(featherLen * 0.3 * side, featherLen * 0.5, featherLen * 0.1 * side, featherLen);
        ctx.quadraticCurveTo(featherLen * -0.1 * side, featherLen * 0.5, 0, 0);
        const fGrad = ctx.createLinearGradient(0, 0, featherLen * 0.1 * side, featherLen);
        fGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        fGrad.addColorStop(0.3, 'rgba(255,215,130,0.85)');
        fGrad.addColorStop(1, 'rgba(200,120,30,0)');
        ctx.fillStyle = fGrad;
        ctx.fill();

        // Rim light.
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Central barb.
        ctx.strokeStyle = 'rgba(255,230,180,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(featherLen * 0.05 * side, featherLen * 0.9);
        ctx.stroke();

        ctx.restore();
    }
    ctx.restore();
}

function _drawUriel(enemy) {
    if (enemy._stealthed) return;
    const now = performance.now();
    const r = enemy.size / 2;
    const breathe = 0.94 + 0.06 * Math.sin(now / 900);
    const shieldActive = enemy._camoPhase === 'shielded';
    const flare = (enemy._swordCharging || enemy._swordFiring) ? 1 : 0;
    const targetAng = Math.atan2(player.y - enemy.y, player.x - enemy.x);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const auraG = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.8);
    auraG.addColorStop(0, `rgba(255,240,200,${0.32 * breathe})`);
    auraG.addColorStop(0.4, `rgba(255,190,100,${0.14 * breathe})`);
    auraG.addColorStop(1, 'rgba(255,215,150,0)');
    ctx.fillStyle = auraG;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2); ctx.fill();

    for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
            const sway = Math.sin(now / 700 + i * 0.9 + (side > 0 ? 3 : 0)) * 0.1;
            _drawUrielWing(side, i, sway, flare, r);
        }
    }

    for (let ring = 0; ring < 2; ring++) {
        const rr = r * (1.35 + ring * 0.28);
        const spin = (now / (2600 + ring * 900)) * (ring === 0 ? 1 : -1);
        ctx.save();
        ctx.rotate(spin);
        const isGold = ring === 0;
        const baseColor = isGold ? '255,215,130' : '122,168,255';
        const highlight = isGold ? '255,250,230' : '200,230,255';
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = isGold ? URIEL_GOLD : URIEL_BLUE; ctx.shadowBlur = 10; }
        ctx.strokeStyle = `rgba(${baseColor},${0.6 * breathe})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(${highlight},${0.85 * breathe})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, rr - 2, 0, Math.PI * 2); ctx.stroke();

        // Engraved segments / runes around the ring.
        const segments = ring === 0 ? 12 : 8;
        ctx.lineWidth = 2.5;
        for (let s = 0; s < segments; s++) {
            const ang = (s / segments) * Math.PI * 2;
            ctx.save();
            ctx.rotate(ang);
            ctx.strokeStyle = `rgba(${highlight},0.95)`;
            ctx.beginPath(); ctx.arc(0, 0, rr, -0.08, 0.08); ctx.stroke();
            ctx.strokeStyle = `rgba(${baseColor},0.8)`;
            ctx.beginPath(); ctx.moveTo(rr - 6, 0); ctx.lineTo(rr + 6, 0); ctx.stroke();
            ctx.restore();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Core: the divine relic art, not a sphere. Stationary aside from a
    // slight idle sway, breathing with the rest of the body.
    if (_urielCoreImg.complete && _urielCoreImg.naturalWidth) {
        const coreSize = r * 2.4;
        const sway = Math.sin(now / 2600) * 0.035;
        ctx.save();
        ctx.globalAlpha = breathe;
        ctx.rotate(sway);
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = 'rgba(5,3,0,0.6)'; ctx.shadowBlur = 14; }
        ctx.drawImage(_urielCoreImg, -coreSize / 2, -coreSize / 2, coreSize, coreSize);
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = 22; ctx.drawImage(_urielCoreImg, -coreSize / 2, -coreSize / 2, coreSize, coreSize); }
        ctx.shadowBlur = 0;
        const bleedPulse = 0.5 + 0.5 * Math.sin(now / 500);
        ctx.globalCompositeOperation = 'screen';
        const bleedG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 0.22);
        bleedG.addColorStop(0, `rgba(255,250,225,${0.5 * bleedPulse})`);
        bleedG.addColorStop(1, 'rgba(255,180,80,0)');
        ctx.fillStyle = bleedG;
        ctx.beginPath(); ctx.arc(0, 0, coreSize * 0.22, 0, Math.PI * 2); ctx.fill();

        // A slow specular glint sweeping across the facets, selling real
        // material shine instead of a static painted texture.
        const glintAng = (now / 3200) % (Math.PI * 2);
        ctx.save();
        ctx.rotate(glintAng);
        const glintG = ctx.createLinearGradient(-coreSize * 0.5, 0, coreSize * 0.5, 0);
        glintG.addColorStop(0, 'rgba(255,255,255,0)');
        glintG.addColorStop(0.5, 'rgba(255,255,255,0.3)');
        glintG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glintG;
        ctx.fillRect(-coreSize * 0.5, -coreSize * 0.06, coreSize, coreSize * 0.12);
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    if (enemy._swordCharging) {
        const p = Math.min(1, (now - enemy._swordChargeStart) / 500);
        ctx.globalAlpha = 0.5 + 0.5 * p;
        ctx.fillStyle = URIEL_WHITE;
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_WHITE; ctx.shadowBlur = 16 + p * 16; }
        ctx.beginPath(); ctx.arc(0, 0, r * (0.3 + p * 0.5), 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    if (enemy._swordFiring) {
        const p = Math.max(0, 1 - (now - enemy._swordReleaseAt) / 250);
        ctx.globalAlpha = p;
        const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
        fg.addColorStop(0, 'rgba(255,255,255,0.9)');
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Camouflage windup: a light gather-in glow right before it vanishes,
    // instead of snapping straight to invisible.
    if (enemy._camoPhase === 'stealthing') {
        const p = Math.min(1, (enemy._camoTimer || 0) / 300);
        ctx.globalAlpha = 1 - p * 0.35;
        ctx.fillStyle = URIEL_BLUE;
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_BLUE; ctx.shadowBlur = 12 + p * 14; }
        ctx.beginPath(); ctx.arc(0, 0, r * (0.25 + p * 0.3), 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // Tracking eye row: outer eyes drawn first so the center one always
    // layers on top, never the other way around.
    const eyeN = 7;
    const eyeMid = (eyeN - 1) / 2;
    const order = Array.from({ length: eyeN }, (_, k) => k).sort((a, b) => Math.abs(b - eyeMid) - Math.abs(a - eyeMid));
    for (const idx of order) {
        const t = (idx - eyeMid) / eyeMid;
        const taper = 1 - Math.abs(t) * 0.55;
        const ex = t * r * 0.95;
        const ey = Math.abs(t) * r * 0.16;
        _drawUrielEye(enemy, ex, ey, r * 0.35 * taper, r * 0.22 * taper, targetAng, idx, now);
    }

    if (shieldActive) {
        const sp = 1 - Math.max(0, (enemy._camoTimer || 0)) / 2000;
        const sr = r * 1.62;
        ctx.save();
        ctx.globalAlpha = 0.85 * (1 - sp * 0.3);
        const domeG = ctx.createRadialGradient(0, 0, sr * 0.4, 0, 0, sr);
        domeG.addColorStop(0, 'rgba(122,168,255,0.05)');
        domeG.addColorStop(0.8, 'rgba(122,168,255,0.22)');
        domeG.addColorStop(1, 'rgba(190,215,255,0.55)');
        ctx.fillStyle = domeG;
        ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(now / 4000);
        const facetN = _mobPerf ? 5 : 10;
        // Shadow set once for the whole ring instead of per facet.
        // 10 shadowBlur toggles a frame here was a real cost for a 2s effect.
        const facetGlow = !_mobPerf && _gfxLevel < 2;
        if (facetGlow) { ctx.shadowColor = URIEL_BLUE; ctx.shadowBlur = 8; }
        for (let f = 0; f < facetN; f++) {
            const a0 = (f / facetN) * Math.PI * 2, a1 = ((f + 0.82) / facetN) * Math.PI * 2;
            ctx.save();
            ctx.strokeStyle = `rgba(210,230,255,${0.5 + 0.25 * Math.sin(now / 300 + f)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(0, 0, sr, a0, a1); ctx.stroke();
            ctx.restore();

            // Hexagonal/facet joint glint.
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.arc(Math.cos(a0) * sr, Math.sin(a0) * sr, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(230,240,255,0.9)'; ctx.lineWidth = 2;
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_WHITE; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    ctx.restore();

    // The following are drawn in world space (not nested in the translate
    // above) since they're anchored to the body's absolute position at the
    // moment they were triggered, same as the standalone preview demo.
    _drawUrielScanRings(enemy);
    _drawUrielSelfPulses(enemy, r);
    _drawUrielChargeMotes(enemy);
    _drawUrielIronBursts(enemy, r);
}

// Covenant King's every-1s horde scan: a gold ring expanding out from the body.
function _drawUrielScanRings(enemy) {
    for (const ring of enemy._fxScanRings || []) {
        ctx.save();
        ctx.globalAlpha = (1 - ring.t / 1.1) * 0.5;
        ctx.strokeStyle = URIEL_GOLD; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, ring.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
}

// Self Iron Body's every-2s refresh: a soft white ring pulse.
function _drawUrielSelfPulses(enemy, r) {
    for (const p of enemy._fxSelfPulses || []) {
        ctx.save();
        ctx.globalAlpha = (1 - p.t / 0.5) * 0.8;
        ctx.strokeStyle = URIEL_WHITE; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r * (1 + p.t * 0.4), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
}

// Judgment's charge-up: individual motes gathering in and converging on
// the body, layered under the simple expanding glow drawn in _drawUriel.
function _drawUrielChargeMotes(enemy) {
    const motes = enemy._fxChargeMotes;
    if (!motes || !motes.length) return;
    // Shadow set once for the whole batch instead of per mote.
    if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = 8; }
    ctx.fillStyle = URIEL_WHITE;
    for (const m of motes) {
        if (m.cx === undefined) continue;
        ctx.globalAlpha = Math.min(1, m.t / m.dur * 2);
        ctx.beginPath(); ctx.arc(m.cx, m.cy, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// A hit landing on the body (Against Chaos evade failed): a hexagonal
// facet ring flashes outward with crack fragments, the "iron body just
// ate that" tell.
function _drawUrielIronBursts(enemy, r) {
    for (const b of enemy._fxIronBursts || []) {
        const p = b.t / 0.5;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.globalAlpha = Math.max(0, 1 - p);
        const flashR = r * (0.6 + p * 1.3);
        const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
        fg.addColorStop(0, 'rgba(255,255,255,0.9)');
        fg.addColorStop(0.5, 'rgba(255,225,150,0.4)');
        fg.addColorStop(1, 'rgba(255,225,150,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(0, 0, flashR, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = `rgba(255,236,190,${1 - p})`;
        ctx.lineWidth = 2;
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = 10; }
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r0 = r * (0.9 + p * 0.5), r1 = r * (1.3 + p * 1.1);
            ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
            ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Ambient idle motes drifting off the body, the odd sparkle flung from a
// flying Holy Sword, and the sparkle burst a barrier disperses into.
function _drawUrielMotes() {
    const motes = window._urielMotes;
    if (!motes || !motes.length) return;
    const glowOn = !_mobPerf && _gfxLevel < 2;
    if (glowOn) ctx.shadowColor = URIEL_GOLD;
    for (const m of motes) {
        ctx.globalAlpha = Math.max(0, m.life);
        if (m.glow) {
            ctx.fillStyle = '#ffffff';
            if (glowOn) ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(m.x, m.y, 2.0, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = URIEL_GOLD;
            if (glowOn) ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function _drawUrielHolySwords() {
    const swords = window._urielHolySwords;
    if (!swords || !swords.length) return;
    const now = performance.now();
    for (const s of swords) {
        if (s.trail && s.trail.length > 1 && !_mobPerf) {
            ctx.save();
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const trailLen = s.trail.length;
            // Glow and crisp strokes are drawn as two separate passes instead
            // of alternating shadowBlur per segment. With up to ~17 segments
            // per sword, that was up to 34 shadowBlur toggles a frame, per
            // sword in flight.
            if (_gfxLevel < 2) {
                ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = 10;
                for (let i = 1; i < trailLen; i++) {
                    const pt1 = s.trail[i - 1], pt2 = s.trail[i];
                    const alpha = (i / trailLen) * s.life;
                    ctx.beginPath(); ctx.moveTo(pt1.x, pt1.y); ctx.lineTo(pt2.x, pt2.y);
                    ctx.strokeStyle = `rgba(255,230,150,${alpha * 0.8})`;
                    ctx.lineWidth = 8 * (i / trailLen);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }
            for (let i = 1; i < trailLen; i++) {
                const pt1 = s.trail[i - 1], pt2 = s.trail[i];
                const alpha = (i / trailLen) * s.life;
                ctx.beginPath(); ctx.moveTo(pt1.x, pt1.y); ctx.lineTo(pt2.x, pt2.y);
                ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
                ctx.lineWidth = 3 * (i / trailLen);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.ang + Math.PI / 2);
        if (_urielSwordImg.complete && _urielSwordImg.naturalWidth) {
            const sw = 108, sh = 108 * (_urielSwordImg.naturalHeight / _urielSwordImg.naturalWidth);
            if (!_mobPerf && _gfxLevel < 2) {
                ctx.globalCompositeOperation = 'screen';
                ctx.shadowColor = URIEL_WHITE; ctx.shadowBlur = 22;
                ctx.drawImage(_urielSwordImg, -sw / 2, -sh / 2, sw, sh);
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = (!_mobPerf && _gfxLevel < 2) ? 18 : 0;
            ctx.drawImage(_urielSwordImg, -sw / 2, -sh / 2, sw, sh);
            ctx.shadowBlur = 0;
        }
        ctx.restore();
        if (s._releaseFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, s._releaseFlash);
            const fg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 70);
            fg.addColorStop(0, 'rgba(255,255,255,0.9)');
            fg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(s.x, s.y, 70, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
}

function _drawUrielBarriers() {
    const barriers = window._urielBarriers;
    if (!barriers || !barriers.length) return;
    const now = performance.now();
    for (const b of barriers) {
        const elapsed = b.maxLife - b.life;
        let scaleY = 1, alpha = 1;
        if (elapsed < 350) { scaleY = elapsed / 350; alpha = scaleY; }
        else if (b.life < 450) { scaleY = Math.max(0, b.life / 450); alpha = scaleY; }

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.scale(1, scaleY);
        ctx.globalAlpha = alpha;

        const w = b.w * 1.2, hgt = b.h;
        const bgGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.75);
        bgGlow.addColorStop(0, 'rgba(255,250,230,0.4)');
        bgGlow.addColorStop(0.4, 'rgba(122,168,255,0.22)');
        bgGlow.addColorStop(1, 'rgba(122,168,255,0)');
        ctx.fillStyle = bgGlow;
        ctx.beginPath(); ctx.ellipse(0, 0, w * 0.75, hgt * 0.9, 0, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'screen';
        const panelCount = 5;
        const panelW = w / panelCount;
        for (let i = 0; i < panelCount; i++) {
            const px = -w / 2 + i * panelW + panelW / 2;
            const shimmer = Math.sin(now / 300 + i * 1.5);
            const pg = ctx.createLinearGradient(0, -hgt / 2, 0, hgt / 2);
            pg.addColorStop(0, `rgba(122,168,255,${0.1 + shimmer * 0.05})`);
            pg.addColorStop(0.5, `rgba(255,230,150,${0.4 + shimmer * 0.1})`);
            pg.addColorStop(1, `rgba(122,168,255,${0.1 + shimmer * 0.05})`);
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.moveTo(px - panelW * 0.45, hgt / 2 * 0.8);
            ctx.lineTo(px - panelW * 0.45, -hgt / 2 * 0.2);
            ctx.quadraticCurveTo(px - panelW * 0.45, -hgt / 2 * 0.8, px, -hgt / 2 * 1.1);
            ctx.quadraticCurveTo(px + panelW * 0.45, -hgt / 2 * 0.8, px + panelW * 0.45, -hgt / 2 * 0.2);
            ctx.lineTo(px + panelW * 0.45, hgt / 2 * 0.8);
            ctx.lineTo(px, hgt / 2 * 1.0);
            ctx.closePath();
            ctx.fill();
        }

        // Abstract floating runes, rising and clipped to the barrier silhouette.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-w / 2, -hgt / 2 * 0.5);
        ctx.quadraticCurveTo(0, -hgt * 0.9, w / 2, -hgt / 2 * 0.5);
        ctx.lineTo(w / 2, hgt / 2 * 0.5);
        ctx.quadraticCurveTo(0, hgt * 0.9, -w / 2, hgt / 2 * 0.5);
        ctx.closePath();
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5;
        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_WHITE; ctx.shadowBlur = 8; }
        for (let rn = 0; rn < 7; rn++) {
            const rx = -w / 2 + (w / 7) * rn + (w / 14);
            const ry = hgt / 2 - ((now / 15 + rn * 45) % (hgt * 1.5));
            ctx.beginPath();
            ctx.moveTo(rx - 4, ry - 4);
            ctx.lineTo(rx + 4, ry - 4);
            ctx.moveTo(rx, ry - 4);
            ctx.lineTo(rx, ry + 6);
            if (rn % 2 === 0) { ctx.lineTo(rx + 4, ry + 10); }
            else { ctx.moveTo(rx - 3, ry); ctx.lineTo(rx + 3, ry + 4); }
            ctx.stroke();
        }
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';

        if (!_mobPerf && _gfxLevel < 2) { ctx.shadowColor = URIEL_GOLD; ctx.shadowBlur = 10; }
        ctx.strokeStyle = 'rgba(255,215,107,0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-w / 2, hgt / 2 * 0.6);
        ctx.lineTo(-w / 2, -hgt / 2 * 0.6);
        ctx.quadraticCurveTo(-w / 4, -hgt / 2 * 0.8, 0, -hgt / 2 * 1.3);
        ctx.quadraticCurveTo(w / 4, -hgt / 2 * 0.8, w / 2, -hgt / 2 * 0.6);
        ctx.lineTo(w / 2, hgt / 2 * 0.6);
        ctx.quadraticCurveTo(w / 4, hgt / 2 * 0.8, 0, hgt / 2 * 1.3);
        ctx.quadraticCurveTo(-w / 4, hgt / 2 * 0.8, -w / 2, hgt / 2 * 0.6);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner accent line.
        ctx.strokeStyle = 'rgba(255,250,230,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 6, -hgt / 2 * 0.5);
        ctx.quadraticCurveTo(0, -hgt / 2 * 1.1, w / 2 - 6, -hgt / 2 * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 6, hgt / 2 * 0.5);
        ctx.quadraticCurveTo(0, hgt / 2 * 1.1, w / 2 - 6, hgt / 2 * 0.5);
        ctx.stroke();

        const scanT = (Math.sin(now / 1400) + 1) / 2;
        const scanX = -w / 2 + w * scanT;
        const rayG = ctx.createLinearGradient(scanX - 25, 0, scanX + 25, 0);
        rayG.addColorStop(0, 'rgba(255,255,255,0)');
        rayG.addColorStop(0.5, 'rgba(255,245,200,0.8)');
        rayG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = rayG;
        ctx.beginPath();
        ctx.moveTo(scanX - 8, -hgt / 2 * 1.3);
        ctx.lineTo(scanX + 8, -hgt / 2 * 1.3);
        ctx.lineTo(scanX + 35, hgt / 2 * 1.3);
        ctx.lineTo(scanX - 35, hgt / 2 * 1.3);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

function _drawUrielEffects() {
    _drawUrielMotes();
    _drawUrielHolySwords();
    _drawUrielBarriers();
}
