// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/render/sigil-cancer.js — Cancer sigil VFX: Tidal Flow's Riptide Surge
// (tide meter, whirlpool, killer-whale bite) and Lunar Aegis's Ocean Hunter
// (execute lunge). Mechanic/state lives in js/skills.js (_tidalSurgeEffects,
// _tidalSurgeMeter) and js/entities/core.js (_oceanHunterBites queue).
// Tier-scaled the same way as every other effect here: _gfxLevel<1 = FULL
// only extras, _gfxLevel<2 = FULL+MED, !_mobPerf gates shadowBlur.

// Commissioned shell/coral frame overlaid on the fill bar (same convention
// as Great Sage's gem-slot frame, js/render/player.js) - the source art is
// 1376x768 with a true transparent capsule cutout at x:[0.1294,0.8700],
// y:[0.4206,0.5781] (measured directly off the asset, same approach as
// Great Sage's GREAT_SAGE_GEM_FRAME_HOLE_FRAC), so the fill bar drawn
// underneath lines up exactly with the opening instead of guessing.
const _tidalMeterFrameImg = new Image();
_tidalMeterFrameImg.src = 'assets/images/game/tidal-meter-frame.png';
const TIDAL_METER_FRAME_ASPECT = 768 / 1376;
const TIDAL_METER_HOLE_FRAC = { x0: 0.1294, x1: 0.8700, y0: 0.4206, y1: 0.5781 };

// Stationary horizontal bar above the player ship - only shown once Tidal
// Flow is actually equipped, so players without it see no change. Stacks
// above Great Sage's own gem-slot frame (js/render/player.js) instead of
// drawing on top of it when both sigils are equipped at once.
function _drawTidalSurgeMeter() {
    if (!_hasBuff('trieu_hoi')) return;
    const w = 110, h = w * TIDAL_METER_FRAME_ASPECT;
    const clearAbove = window._greatSageFrameClearance || 0;
    const x = player.x - w / 2, y = player.y - player.height / 2 - h - 6 - clearAbove;

    const holeX = x + w * TIDAL_METER_HOLE_FRAC.x0;
    const holeY = y + h * TIDAL_METER_HOLE_FRAC.y0;
    const holeW = w * (TIDAL_METER_HOLE_FRAC.x1 - TIDAL_METER_HOLE_FRAC.x0);
    const holeH = h * (TIDAL_METER_HOLE_FRAC.y1 - TIDAL_METER_HOLE_FRAC.y0);

    ctx.save();
    // Clip strictly to the frame's own opening so the fill (and its glow)
    // can never bleed past the slot, no matter the shadowBlur amount.
    ctx.beginPath();
    ctx.rect(holeX, holeY, holeW, holeH);
    ctx.clip();

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(holeX, holeY, holeW, holeH);

    const ratio = Math.max(0, Math.min(1, _tidalSurgeMeter / TIDAL_SURGE_METER_MAX));
    const fillW = ratio * holeW;
    if (fillW > 0) {
        const grad = ctx.createLinearGradient(holeX, holeY, holeX + holeW, holeY);
        grad.addColorStop(0, '#0f5f57'); grad.addColorStop(1, '#a7fff0');
        ctx.fillStyle = grad;
        if (_gfxLevel < 1) { ctx.shadowColor = '#5eead4'; ctx.shadowBlur = 3; }
        ctx.fillRect(holeX, holeY, fillW, holeH);
        ctx.shadowBlur = 0;
    }
    ctx.restore();

    if (_tidalMeterFrameImg.complete && _tidalMeterFrameImg.naturalWidth > 0) {
        ctx.save();
        if (!_mobPerf) {
            const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 500);
            ctx.shadowColor = '#5eead4';
            ctx.shadowBlur = 10 + pulse * 6;
            // A second pass at a slightly bigger blur reads as a proper soft
            // glow halo instead of a thin single-pass edge glow.
            ctx.drawImage(_tidalMeterFrameImg, x, y, w, h);
        }
        ctx.drawImage(_tidalMeterFrameImg, x, y, w, h);
        ctx.restore();
    }
}

// Layered rotating rings simulate a real vortex - ported directly from the
// reference demo's drawWhirlpool. popAmount (0 normally, spikes at the bite/
// snap moment then decays) kicks the rings and foam rim outward as the whale
// breaches the surface. Full detail only at FULL, down to a plain static
// ring at PER.
function _drawWhirlpool(w, now) {
    const t = w.rot || 0;
    const popAmount = w.popAmount || 0;
    ctx.save();
    ctx.globalAlpha = w.alpha != null ? w.alpha : 1;

    if (_mobPerf) {
        ctx.strokeStyle = 'rgba(94,234,212,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w.x, w.y, 96, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        return;
    }

    const ringCount = _gfxLevel === 0 ? 8 : (_gfxLevel === 1 ? 4 : 2);
    if (_gfxLevel < 2) {
        const coreG = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 60);
        coreG.addColorStop(0, 'rgba(1,6,10,0.95)');
        coreG.addColorStop(0.5, 'rgba(4,14,22,0.6)');
        coreG.addColorStop(1, 'rgba(4,14,22,0)');
        ctx.fillStyle = coreG;
        ctx.beginPath(); ctx.arc(w.x, w.y, 60, 0, Math.PI * 2); ctx.fill();
    }

    // FULL only: a soft ambient glow halo behind the whole vortex, brightest
    // at the core and fading out past the rim - reads as light scattering
    // through churning water instead of a flat dark hole.
    if (_gfxLevel === 0) {
        ctx.save();
        const haloR = 150 + popAmount * 25;
        const halo = ctx.createRadialGradient(w.x, w.y, 20, w.x, w.y, haloR);
        halo.addColorStop(0, 'rgba(94,234,212,0.22)');
        halo.addColorStop(0.55, 'rgba(94,234,212,0.08)');
        halo.addColorStop(1, 'rgba(94,234,212,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(w.x, w.y, haloR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    for (let i = 0; i < ringCount; i++) {
        const popRadius = popAmount * (20 + i * 10);
        const r = 30 + i * (_gfxLevel === 0 ? 15 : 25) + popRadius;
        const dir = i % 2 === 0 ? 1 : -1;
        const speed = 0.8 + i * 0.12;
        const layerAlpha = 0.3 + (i / ringCount) * 0.7;
        ctx.strokeStyle = i % 2 === 0 ? `rgba(94,234,212,${0.5 * layerAlpha})` : `rgba(15,95,87,${0.8 * layerAlpha})`;
        ctx.lineWidth = _gfxLevel === 0 ? 2 + i * 0.3 : 3;
        // Each spinning band gets its own soft glow at FULL - brighter teal
        // rings glow more than the darker deep-water ones, like light
        // catching the moving surface instead of a flat stroked line.
        if (_gfxLevel === 0) {
            ctx.shadowColor = i % 2 === 0 ? '#5eead4' : '#0f5f57';
            ctx.shadowBlur = 5 + layerAlpha * 6;
        }

        ctx.beginPath();
        const startA = t * dir * speed;
        const endA = startA + Math.PI * (1.4 + Math.sin(now / 400 + i) * 0.4);
        for (let a = startA; a <= endA + 0.1; a += 0.2) {
            let distort = 0;
            if (_gfxLevel === 0) {
                distort = Math.sin(a * 4 + now / 300) * (r * 0.08) + Math.cos(a * 3 - now / 200) * (r * 0.05);
            }
            const px = w.x + Math.cos(a) * (r + distort), py = w.y + Math.sin(a) * (r + distort);
            if (a === startA) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        if (_gfxLevel === 0) ctx.shadowBlur = 0;
    }

    const rimR = 132 + popAmount * 30;
    if (_gfxLevel === 0) {
        ctx.save();
        ctx.globalAlpha *= 0.4;
        ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 1.2;
        ctx.shadowColor = '#eaffff'; ctx.shadowBlur = 4; // faint caustic shimmer on each streak
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 - t * 1.5;
            const swirl = Math.sin(t * 2 + i) * 10;
            ctx.beginPath();
            ctx.moveTo(w.x + Math.cos(a) * 30, w.y + Math.sin(a) * 30);
            ctx.quadraticCurveTo(w.x + Math.cos(a + 0.5) * 80, w.y + Math.sin(a + 0.5) * 80 + swirl, w.x + Math.cos(a) * 140, w.y + Math.sin(a) * 140);
            ctx.stroke();
        }
        ctx.restore();

        // A single bright specular glint orbiting the rim, like a reflection
        // of light catching the churning surface at one point as it spins.
        ctx.save();
        const hlA = t * 1.1;
        const hlR = rimR * 0.72;
        const hlX = w.x + Math.cos(hlA) * hlR, hlY = w.y + Math.sin(hlA) * hlR;
        ctx.translate(hlX, hlY);
        ctx.rotate(hlA + Math.PI / 2);
        ctx.globalAlpha *= 0.55 + 0.35 * Math.sin(now / 220);
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16;
        ctx.fillStyle = '#eaffff';
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    if (_gfxLevel < 2) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + popAmount * 0.5})`;
        if (_gfxLevel === 0) { ctx.shadowColor = '#eaffff'; ctx.shadowBlur = 6; } // foam clumps get a soft glow instead of a flat white dot
        for (let a = 0; a < Math.PI * 2; a += 0.12) {
            const clump = Math.sin(a * 6 + t) * Math.cos(a * 3 - t * 1.5);
            if (clump > 0.1) {
                const distort = Math.sin(a * 4 + now / 300) * 8;
                const rr = rimR + distort;
                ctx.beginPath();
                ctx.arc(w.x + Math.cos(a) * rr, w.y + Math.sin(a) * rr, clump * (4 + popAmount * 6), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        if (_gfxLevel === 0) ctx.shadowBlur = 0;
    } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w.x, w.y, rimR, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore();
}

// Killer-whale, front-half bezier silhouette with real form shading - ported
// directly from the reference demo's drawDetailedWhale (cancer-tidal-surge-
// demo.html), TIER 0-3 mapped to _gfxLevel 0/1/2 + _mobPerf. facing=1 faces
// +x; rot rotates the whole thing (breaching straight up uses rot=-PI/2).
// jawOpen 0-1 drives the bite, flex -1..1 drives the breach/bite/dive pose.
function _drawKillerWhale(x, y, scale, facing, rot, jawOpen, flex) {
    flex = flex || 0;
    const now = performance.now();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale((facing || 1) * scale, scale);

    const hF = flex * 8;
    const tF = -flex * 12;

    const bodyPath = new Path2D();
    bodyPath.moveTo(60, 8 + hF);
    bodyPath.bezierCurveTo(55, 2 + hF, 48, -12 + hF, 35, -16 + hF);
    bodyPath.bezierCurveTo(28, -18 + hF, 22, -20 + hF * 0.5, 15, -20);
    bodyPath.bezierCurveTo(0, -20, -30, -18, -60, -12 + tF * 0.5);
    bodyPath.bezierCurveTo(-80, -8 + tF, -95, -2 + tF, -100, 0 + tF * 1.5);
    bodyPath.bezierCurveTo(-90, 4 + tF, -80, 10 + tF, -60, 14 + tF * 0.5);
    bodyPath.bezierCurveTo(-30, 20, 0, 24, 20, 20 + hF * 0.2);
    bodyPath.bezierCurveTo(30, 18 + hF * 0.5, 40, 14 + hF, 45, 12 + hF);
    bodyPath.lineTo(60, 8 + hF);
    bodyPath.closePath();

    if (_mobPerf) {
        ctx.fillStyle = '#0b0f16';
        ctx.fill(bodyPath);
        ctx.restore();
        return;
    }

    // 1. form-shadow gradient across the body
    const bodyGrad = ctx.createLinearGradient(0, -25, 0, 25);
    bodyGrad.addColorStop(0, '#1c2836');
    bodyGrad.addColorStop(0.3, '#101722');
    bodyGrad.addColorStop(0.7, '#070a0f');
    bodyGrad.addColorStop(1, '#020304');
    ctx.fillStyle = bodyGrad;
    ctx.fill(bodyPath);

    // fade the tail cleanly into darkness
    const tailDarken = ctx.createLinearGradient(0, 0, -100, 0);
    tailDarken.addColorStop(0, 'rgba(4,9,18,0)');
    tailDarken.addColorStop(1, 'rgba(4,9,18,1)');
    ctx.fillStyle = tailDarken;
    ctx.fill(bodyPath);

    ctx.save();
    ctx.clip(bodyPath);

    // 2. white belly patch + 3. eye patch
    let whiteGrad = null;
    if (_gfxLevel < 2) {
        const bellyPath = new Path2D();
        bellyPath.moveTo(45, 12 + hF);
        bellyPath.bezierCurveTo(25, 10 + hF * 0.5, 10, 8, -5, 10);
        bellyPath.bezierCurveTo(-20, 12, -40, 16, -60, 14 + tF * 0.5);
        bellyPath.lineTo(-60, 35 + tF);
        bellyPath.lineTo(45, 35 + hF);
        bellyPath.closePath();

        whiteGrad = ctx.createLinearGradient(0, -5, 0, 25);
        whiteGrad.addColorStop(0, '#ffffff');
        whiteGrad.addColorStop(0.4, '#b4d4dc');
        whiteGrad.addColorStop(0.8, '#5a737d');
        whiteGrad.addColorStop(1, '#2a3a42');
        ctx.fillStyle = whiteGrad;
        ctx.fill(bellyPath);
        ctx.fillStyle = tailDarken;
        ctx.fill(bellyPath);

        const eyePatch = new Path2D();
        eyePatch.moveTo(35, -4 + hF);
        eyePatch.bezierCurveTo(28, -12 + hF, 18, -10 + hF * 0.5, 12, -4);
        eyePatch.bezierCurveTo(10, 2, 22, 4 + hF * 0.5, 30, 0 + hF);
        eyePatch.closePath();
        ctx.fillStyle = whiteGrad;
        ctx.fill(eyePatch);
    }

    if (_gfxLevel === 0) {
        // 4. rim-light highlight along the top edge
        const rimGrad = ctx.createLinearGradient(0, -25, 0, 0);
        rimGrad.addColorStop(0, 'rgba(180,240,255,0.7)');
        rimGrad.addColorStop(1, 'rgba(180,240,255,0)');
        ctx.strokeStyle = rimGrad;
        ctx.lineWidth = 6;
        ctx.stroke(bodyPath);

        // 5. wet specular streak on the melon
        const specPath = new Path2D();
        specPath.moveTo(52, -4 + hF);
        specPath.bezierCurveTo(45, -14 + hF, 30, -18 + hF, 10, -18);
        specPath.lineTo(10, -30);
        specPath.lineTo(60, -30);
        specPath.closePath();
        const specGrad = ctx.createLinearGradient(30, -18, 30, -5);
        specGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
        specGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = specGrad;
        ctx.fill(specPath);
    }
    ctx.restore(); // remove body clip

    // 6. pectoral flipper
    const pecFlex = Math.sin(now / 400) * 0.1 - flex * 0.2;
    ctx.save();
    ctx.translate(15, 12 + hF * 0.2);
    ctx.rotate(0.2 + pecFlex);
    const pecPath = new Path2D();
    pecPath.moveTo(0, -4);
    pecPath.bezierCurveTo(-10, -2, -25, 15, -30, 25);
    pecPath.bezierCurveTo(-20, 20, -5, 5, 8, 2);
    pecPath.closePath();
    const pecGrad = ctx.createLinearGradient(0, 0, -20, 20);
    pecGrad.addColorStop(0, '#101722');
    pecGrad.addColorStop(1, '#020304');
    ctx.fillStyle = pecGrad;
    ctx.fill(pecPath);
    if (_gfxLevel === 0) {
        const pecAO = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        pecAO.addColorStop(0, 'rgba(0,0,0,0.8)');
        pecAO.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pecAO;
        ctx.fill(pecPath);
    }
    ctx.restore();

    // 7. lower jaw + mouth interior
    const jawPivotX = 35, jawPivotY = 13 + hF * 0.8;
    const actualJawOpen = jawOpen * 0.7;

    if (actualJawOpen > 0.05) {
        ctx.fillStyle = '#3a0c12';
        ctx.beginPath();
        ctx.moveTo(jawPivotX, jawPivotY);
        ctx.lineTo(60, 8 + hF);
        ctx.lineTo(jawPivotX + Math.cos(actualJawOpen) * 25, jawPivotY + Math.sin(actualJawOpen) * 25);
        ctx.fill();

        if (_gfxLevel === 0) {
            const throatGrad = ctx.createRadialGradient(jawPivotX, jawPivotY, 0, jawPivotX, jawPivotY, 20);
            throatGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
            throatGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = throatGrad;
            ctx.fill();
        }

        ctx.fillStyle = '#8a3a45';
        const tongueA = actualJawOpen * 0.8;
        ctx.beginPath();
        ctx.ellipse(jawPivotX + Math.cos(tongueA) * 10, jawPivotY + Math.sin(tongueA) * 10, 6, 2.5, tongueA, 0, Math.PI * 2);
        ctx.fill();

        if (_gfxLevel < 2) {
            ctx.fillStyle = '#eef6f8';
            for (let i = 0; i < 6; i++) {
                const p = i / 5;
                const tx = jawPivotX + (60 - jawPivotX) * p, ty = jawPivotY + (8 + hF - jawPivotY) * p;
                ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 1.5, ty + 3); ctx.lineTo(tx - 3, ty); ctx.fill();
            }
        }
    }

    // lower jaw exterior
    ctx.save();
    ctx.translate(jawPivotX, jawPivotY);
    ctx.rotate(actualJawOpen);
    const jawPath = new Path2D();
    jawPath.moveTo(0, 0);
    jawPath.lineTo(24, -3);
    jawPath.bezierCurveTo(26, 0, 22, 6, 12, 6);
    jawPath.bezierCurveTo(5, 6, -5, 4, -10, 0);
    jawPath.closePath();
    const jawGrad = ctx.createLinearGradient(0, -4, 0, 6);
    jawGrad.addColorStop(0, '#070a0f');
    jawGrad.addColorStop(0.4, '#c8dee2');
    jawGrad.addColorStop(1, '#5a737d');
    ctx.fillStyle = jawGrad;
    ctx.fill(jawPath);
    if (_gfxLevel === 0) {
        const jawAO = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        jawAO.addColorStop(0, 'rgba(0,0,0,0.8)');
        jawAO.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = jawAO;
        ctx.fill(jawPath);
    }
    if (_gfxLevel < 2 && actualJawOpen > 0) {
        ctx.fillStyle = '#eef6f8';
        for (let i = 1; i < 6; i++) {
            const tx = i * 4;
            ctx.beginPath(); ctx.moveTo(tx, -2.5); ctx.lineTo(tx - 1, -5.5); ctx.lineTo(tx - 2, -2.5); ctx.fill();
        }
    }
    ctx.restore();

    // eye (+ catchlight at FULL)
    const eyeX = 26, eyeY = -3 + hF;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 1.5, 1.0, -0.1, 0, Math.PI * 2); ctx.fill();
    if (_gfxLevel === 0) {
        ctx.fillStyle = '#6ab8cc';
        ctx.beginPath(); ctx.arc(eyeX + 0.4, eyeY, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(eyeX + 0.6, eyeY - 0.3, 0.3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

// Center-screen prompt while a Riptide Surge is banked and ready - same box
// style as Great Sage's own release prompt (js/render/skill-f.js), EN/VI via
// window._lang like every other bilingual HUD string in this codebase.
function _drawTidalSurgeReadyPrompt() {
    if (!window._tidalSurgeReady) return;
    const now = performance.now();
    const pulse = 0.7 + 0.3 * Math.sin(now / 320);
    const cx = canvas.width / 2, cy = canvas.height * 0.5;
    const vi = window._lang === 'vi';
    const label = vi ? 'TRIỀU CƯỜNG SẴN SÀNG' : 'TIDE READY';
    const sub = vi ? 'Space: triệu hồi xoáy nước' : 'Space: summon the whirlpool';

    ctx.save();
    ctx.font = 'bold 13px "Courier New", Consolas, monospace';
    const labelW = ctx.measureText(label).width;
    const boxW = Math.max(labelW, 160) + 40, boxH = 40;

    ctx.fillStyle = 'rgba(8,14,20,0.6)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8); ctx.fill(); }
    else ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    ctx.strokeStyle = `rgba(94,234,212,${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf) { ctx.shadowColor = '#5eead4'; ctx.shadowBlur = 10 * pulse; }
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8); ctx.stroke(); }
    else ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px "Courier New", Consolas, monospace';
    ctx.fillStyle = `rgba(167,255,240,${0.75 + 0.25 * pulse})`;
    ctx.fillText(label, cx, cy - 8);
    ctx.font = '11px "Courier New", Consolas, monospace';
    ctx.fillStyle = 'rgba(200,240,235,0.85)';
    ctx.fillText(sub, cx, cy + 10);
    ctx.restore();
}

// One expanding, fading wave-crash ring. age<0 means it hasn't started yet
// (no-op); age>life means it's finished (no-op).
function _drawWaveRipple(x, y, age, life, maxR, width, color) {
    if (age < 0 || age > life) return;
    const p = age / life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * (1 - p * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, p * maxR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// Full "Tidal Surge" sequence: whirlpool spawns, pulls enemies (motion
// handled in _updateTidalSurge, js/skills.js), whale breaches at the bite
// moment, then everything fades. One draw pass per active whirlpool.
function _drawTidalSurgeEffects() {
    if (!_tidalSurgeEffects.length) return;
    const now = performance.now();
    for (const w of _tidalSurgeEffects) {
        let alpha = 1;
        if (w.phase === 'spawn') alpha = Math.min(1, w.timer / 250);
        else if (w.phase === 'fade') alpha = Math.max(0, 1 - w.timer / 400);
        else if (w.phase === 'bite') alpha = Math.max(0, 1 - w.timer / 900) * 0.9 + 0.1;

        _drawWhirlpool({ x: w.x, y: w.y, alpha, rot: w.rot, popAmount: w.popAmount }, now);

        if (w.phase === 'bite') {
            const bt = w.timer;
            let whaleY, jawOpen, flex, rot = -Math.PI / 2;
            const scale = 3;
            if (bt < 350) {
                const p = bt / 350, ease = p * p * (3 - 2 * p);
                whaleY = w.y + 150 - ease * 110; jawOpen = 0;
                flex = Math.sin(p * Math.PI) * 0.4;
            } else if (bt < 600) {
                const p = (bt - 350) / 250;
                whaleY = w.y + 40 - Math.sin(p * Math.PI / 2) * 20; jawOpen = Math.sin(p * Math.PI);
                flex = Math.sin((1 + p) * Math.PI) * 0.3;
            } else {
                const p = (bt - 600) / 300, ease = p * p;
                whaleY = w.y + 20 + ease * 170; jawOpen = 0;
                flex = -0.5 + p * 0.3;
            }
            ctx.save();
            // Only the front half breaches - clip everything below the
            // whirlpool's own water line so the rest stays "underwater".
            ctx.beginPath();
            ctx.rect(-canvas.width, -canvas.height * 2, canvas.width * 3, canvas.height * 2 + w.y);
            ctx.clip();
            ctx.globalAlpha = bt < 600 ? 1 : Math.max(0, 1 - (bt - 600) / 300);
            _drawKillerWhale(w.x, whaleY, scale, 1, rot, jawOpen, flex);
            ctx.restore();

            if (w.burst && bt >= 400 && bt < 500) {
                ctx.save();
                ctx.globalAlpha = 1 - (bt - 400) / 100;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(w.x, w.y - 30, 90, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        // Two expanding wave-crash rings, one wide/fast (white) and one
        // slower/wider (teal), timed off w.burstAt rather than the phase
        // timer above, so they keep spreading and fading through the whole
        // 'fade' phase instead of cutting off the instant 'bite' ends.
        if (w.burst) {
            const rippleAge = now - w.burstAt;
            _drawWaveRipple(w.x, w.y, rippleAge, 700, 260, 8, '#ffffff');
            _drawWaveRipple(w.x, w.y, rippleAge, 1000, 320, 4, '#5eead4');
        }
    }
}

// Ocean Hunter: a whale lunges in from whichever screen edge is closer,
// bites once, exits the far edge. Queue entries are one-shot and self-prune.
function _drawOceanHunterBites() {
    if (!_oceanHunterBites || !_oceanHunterBites.length) return;
    const now = performance.now();
    for (let i = _oceanHunterBites.length - 1; i >= 0; i--) {
        const b = _oceanHunterBites[i];
        const age = now - b.spawnAt;
        if (age > b.duration) { _oceanHunterBites.splice(i, 1); continue; }
        const p = age / b.duration;
        const facing = b.fromLeft ? 1 : -1;
        const startX = b.fromLeft ? -80 : canvas.width + 80;
        const endX = b.fromLeft ? canvas.width + 80 : -80;
        // ease in to the bite point (~40% through), then continue out
        let x;
        if (p < 0.4) x = startX + (b.x - startX) * (p / 0.4);
        else x = b.x + (endX - b.x) * ((p - 0.4) / 0.6);
        const jawOpen = p < 0.28 ? 1 : Math.max(0, 1 - (p - 0.28) / 0.15);
        const flex = p < 0.28 ? 0.4 : -0.3;

        // Skims the surface too - clip below the water line at the prey's
        // own depth, with a couple of faint surface-skim lines at MED-.
        const waterY = b.y + 15;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-canvas.width, -canvas.height * 2, canvas.width * 3, canvas.height * 2 + waterY);
        ctx.clip();
        _drawKillerWhale(x, b.y, 2.4, facing, 0, jawOpen, flex);
        ctx.restore();

        if (_gfxLevel >= 1) {
            ctx.save();
            ctx.globalAlpha = p > 0.6 ? Math.max(0, 1 - (p - 0.6) / 0.4) : 1;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x - 140, waterY, 180, 2);
            ctx.fillRect(x - 80, waterY + 2, 90, 2);
            ctx.restore();
        }

        // Splash at the snap: a quick white flash plus two expanding
        // wave-crash rings from the bite point, same shape as the
        // whirlpool's own bite splash. Timed off the jaw snap (p=0.28)
        // rather than spawn, and kept short enough (350ms max ring life)
        // to always finish within this entry's own 500ms total lifetime.
        const biteAge = age - b.duration * 0.28;
        if (biteAge >= 0) {
            if (biteAge < 90) {
                ctx.save();
                ctx.globalAlpha = 1 - biteAge / 90;
                ctx.fillStyle = '#eaffff';
                ctx.beginPath(); ctx.arc(b.x, waterY, 55, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            _drawWaveRipple(b.x, waterY, biteAge, 250, 150, 6, '#ffffff');
            _drawWaveRipple(b.x, waterY, biteAge, 350, 200, 3, '#5eead4');
        }
    }
}

// Brief red/cyan channel-split flash on a big hit - set via
// window._sigilChromFlashEnd (a timestamp, like every other timed effect
// flag in this codebase), drawn once at the very end of the frame so it
// tints everything already rendered instead of just one effect.
function _drawSigilChromFlash() {
    const end = window._sigilChromFlashEnd || 0;
    const now = performance.now();
    if (now >= end) return;
    const t = Math.max(0, Math.min(1, (end - now) / 400));
    ctx.save();
    ctx.globalAlpha = t * 0.15;
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = t * 0.10;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Ambient ocean current lines + drifting light-shaft caustics across the
// whole screen - ported from the reference demo's drawOceanAmbience. Only
// shown for Tidal Flow players, drawn as a background wash behind everything
// else (called from the same spot the starfield background draws).
function _drawCancerOceanAmbience() {
    if (!_hasBuff('trieu_hoi')) return;
    const now = performance.now();
    ctx.save();
    const waveLayers = _gfxLevel === 0 ? 6 : (_gfxLevel === 1 ? 4 : (_gfxLevel === 2 ? 2 : 0));
    ctx.globalAlpha = _gfxLevel === 0 ? 0.06 : 0.045;
    ctx.strokeStyle = '#5eead4';
    for (let i = 0; i < waveLayers; i++) {
        ctx.beginPath();
        const step = _gfxLevel === 0 ? 16 : 28;
        for (let x = 0; x <= canvas.width; x += step) {
            const y = canvas.height - 20 - i * 14 + Math.sin(x * 0.02 + now / 900 + i) * 6
                + (_gfxLevel === 0 ? Math.sin(x * 0.055 - now / 500 + i * 1.7) * 2.5 : 0);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    if (_gfxLevel === 0) {
        ctx.globalAlpha = 0.035;
        ctx.fillStyle = '#bff5ff';
        for (let i = 0; i < 4; i++) {
            const cx = ((now / 60 + i * 260) % (canvas.width + 200)) - 100;
            ctx.save();
            ctx.translate(cx, 0);
            ctx.rotate(0.12);
            ctx.fillRect(-18, -20, 36, canvas.height + 40);
            ctx.restore();
        }
    }
    ctx.restore();
}
