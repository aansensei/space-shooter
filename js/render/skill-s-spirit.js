// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/skill-s-spirit.js — extracted from render.js (Remembrance Spirit /
// Photokrystos: normal spirit, silk tail, primeval summon fx, boomerang,
// blade-arc projectile). Self-contained, no cross-file calls besides core.js.

// Normal spirit body sprites (halo rings, petal, crystal fragment), baked
// once per distinct size — only 2 sizes ever occur (15 idle / 30 finishing)
// — so the per-frame draw is pure drawImage/rotate calls with zero
// shadowBlur or gradient creation. Mirrors the fix that solved Death Star's
// frame-time regression: bake the blur once offscreen, reuse the bitmap.
const _normalSpiritSpriteCache = {};
function _getSpiritSprites(size) {
    if (_normalSpiritSpriteCache[size]) return _normalSpiritSpriteCache[size];

    const haloR = size * 2.4;
    const outerRingDim = Math.ceil(haloR * 2.9);
    const outerRingC = document.createElement('canvas');
    outerRingC.width = outerRingC.height = outerRingDim;
    const orctx = outerRingC.getContext('2d');
    orctx.translate(outerRingDim / 2, outerRingDim / 2);
    orctx.strokeStyle = 'rgba(255,130,255,0.95)';
    orctx.lineWidth = 2.5;
    orctx.setLineDash([size * 0.6, size * 0.2, size * 0.1, size * 0.3]);
    orctx.shadowColor = '#ff00ff'; orctx.shadowBlur = 24;
    orctx.beginPath(); orctx.arc(0, 0, haloR, 0, Math.PI * 2); orctx.stroke();
    orctx.shadowBlur = 24;
    orctx.beginPath(); orctx.arc(0, 0, haloR, 0, Math.PI * 2); orctx.stroke();

    // Inner ring + its 3 orbiting nodes baked as one rigid unit — they
    // rotate together in the reference, so one sprite covers both.
    const innerR = haloR * 0.75;
    const innerDim = Math.ceil(innerR * 2.9);
    const innerC = document.createElement('canvas');
    innerC.width = innerC.height = innerDim;
    const ictx = innerC.getContext('2d');
    ictx.translate(innerDim / 2, innerDim / 2);
    ictx.strokeStyle = 'rgba(220,90,255,0.8)';
    ictx.lineWidth = 1.5;
    ictx.shadowColor = '#aa00ff'; ictx.shadowBlur = 18;
    ictx.beginPath(); ictx.arc(0, 0, innerR, 0, Math.PI * 2); ictx.stroke();
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const nx = Math.cos(a) * innerR, ny = Math.sin(a) * innerR;
        ictx.shadowColor = '#ffffff'; ictx.shadowBlur = 14;
        ictx.fillStyle = '#ffffff';
        ictx.beginPath(); ictx.arc(nx, ny, 3.5, 0, Math.PI * 2); ictx.fill();
        ictx.shadowColor = '#ff00ff'; ictx.shadowBlur = 14;
        ictx.fillStyle = 'rgba(255,0,255,0.95)';
        ictx.beginPath(); ictx.arc(nx, ny, 6, 0, Math.PI * 2); ictx.fill();
    }

    const pSize = size * 0.35;
    const petalDim = Math.ceil(pSize * 4.2);
    const petalC = document.createElement('canvas');
    petalC.width = petalC.height = petalDim;
    const pctx = petalC.getContext('2d');
    pctx.translate(petalDim / 2, petalDim / 2);
    const pGrad = pctx.createLinearGradient(0, -pSize, 0, pSize);
    pGrad.addColorStop(0, 'rgba(255,255,255,1)');
    pGrad.addColorStop(0.4, 'rgba(255,80,255,0.95)');
    pGrad.addColorStop(1, 'rgba(180,0,255,0)');
    pctx.fillStyle = pGrad;
    pctx.shadowColor = '#ff00ff'; pctx.shadowBlur = 20;
    pctx.beginPath();
    pctx.moveTo(0, -pSize);
    pctx.bezierCurveTo(pSize * 0.65, -pSize * 0.2, pSize * 0.65, pSize * 0.8, 0, pSize * 1.3);
    pctx.bezierCurveTo(-pSize * 0.65, pSize * 0.8, -pSize * 0.65, -pSize * 0.2, 0, -pSize);
    pctx.fill();

    const dSize = size * 0.28;
    const fragDim = Math.ceil(dSize * 4.4);
    const fragC = document.createElement('canvas');
    fragC.width = fragC.height = fragDim;
    const fctx = fragC.getContext('2d');
    fctx.translate(fragDim / 2, fragDim / 2);
    fctx.fillStyle = 'rgba(255,170,255,0.9)';
    fctx.strokeStyle = 'rgba(255,255,255,0.95)';
    fctx.lineWidth = 1.2;
    fctx.shadowColor = '#ff88ff'; fctx.shadowBlur = 15;
    fctx.beginPath();
    fctx.moveTo(0, -dSize); fctx.lineTo(dSize * 0.6, 0); fctx.lineTo(0, dSize); fctx.lineTo(-dSize * 0.6, 0);
    fctx.closePath(); fctx.fill(); fctx.stroke();
    fctx.shadowBlur = 0;
    fctx.lineWidth = 0.8; fctx.strokeStyle = 'rgba(255,255,255,0.5)';
    fctx.beginPath(); fctx.moveTo(0, -dSize); fctx.lineTo(0, dSize); fctx.stroke();

    const coreDim = Math.ceil(size * 3.4);
    const coreC = document.createElement('canvas');
    coreC.width = coreC.height = coreDim;
    const cctx = coreC.getContext('2d');
    cctx.translate(coreDim / 2, coreDim / 2);
    const coreGrad = cctx.createRadialGradient(0, 0, 0, 0, 0, size);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, '#ffaaff');
    coreGrad.addColorStop(0.65, '#cc44ff');
    coreGrad.addColorStop(1, 'rgba(60,0,100,0)');
    cctx.fillStyle = coreGrad;
    cctx.shadowColor = '#ff33ff'; cctx.shadowBlur = 50;
    cctx.beginPath(); cctx.arc(0, 0, size, 0, Math.PI * 2); cctx.fill();
    cctx.shadowBlur = 50;
    cctx.beginPath(); cctx.arc(0, 0, size, 0, Math.PI * 2); cctx.fill();

    const sprites = {
        outerRing: outerRingC, outerRingDim,
        innerRing: innerC, innerDim,
        petal: petalC, petalDim,
        frag: fragC, fragDim,
        core: coreC, coreDim,
    };
    _normalSpiritSpriteCache[size] = sprites;
    return sprites;
}

function _drawNormalSpirit(spirit) {
    if (!spirit) return;
    const now = performance.now();
    const timeRemaining = spirit.duration - (gameElapsedTime - spirit.spawnGameTime);
    const age = gameElapsedTime - spirit.spawnGameTime;

    ctx.save();

    // TITLE + HEXAGRAM, hiện trên đầu player, chỉ lần đầu
    // Chỉ render cho spirit đầu tiên trong mảng để tránh vẽ đè nhiều lần
    if (spirits.length > 0 && spirit === spirits[spirits.length - 1]) {
        const elapsed = now - lastSkillS;
        const textT = Math.min(elapsed / 150, 1) * Math.max(0, 1 - (elapsed - 150) / 1250);
        if (textT > 0.02) {
            const tx = player.x;
            const ty = player.y - 100;

            ctx.save();

            // HEXAGRAM bao quanh player, cùng fade với textT
            {
                const hexR = 55 + 5 * Math.sin(now / 400);
                const rot1 = now / 2200, rot2 = -now / 1800;
                ctx.globalAlpha = textT * 0.65;
                ctx.translate(player.x, player.y);

                // outer dashed circle
                ctx.strokeStyle = 'rgba(255,100,255,0.55)';
                ctx.lineWidth = 1.2; ctx.setLineDash([7, 5]);
                ctx.beginPath(); ctx.arc(0, 0, hexR * 1.3, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);

                // 2 tam giác ngược chiều
                for (let tri = 0; tri < 2; tri++) {
                    const rot = tri === 0 ? rot1 : rot2;
                    ctx.strokeStyle = tri === 0 ? 'rgba(255,80,255,0.85)' : 'rgba(200,0,255,0.7)';
                    ctx.lineWidth = 1.6;
                    if (!_mobPerf) ctx.shadowColor = '#ff00ff'; if (!_mobPerf) ctx.shadowBlur = 10;
                    ctx.beginPath();
                    for (let i = 0; i < 3; i++) {
                        const a = rot + (i / 3) * Math.PI * 2 + (tri === 1 ? Math.PI : 0);
                        i === 0 ? ctx.moveTo(Math.cos(a) * hexR, Math.sin(a) * hexR)
                            : ctx.lineTo(Math.cos(a) * hexR, Math.sin(a) * hexR);
                    }
                    ctx.closePath(); ctx.stroke();
                }

                // 6 điểm sáng đỉnh
                if (!_mobPerf) ctx.shadowBlur = 6;
                for (let i = 0; i < 6; i++) {
                    const a = rot1 + (i / 6) * Math.PI * 2;
                    ctx.fillStyle = `rgba(255,180,255,${0.8 + 0.2 * Math.sin(now / 250 + i)})`;
                    ctx.beginPath(); ctx.arc(Math.cos(a) * hexR, Math.sin(a) * hexR, 3, 0, Math.PI * 2); ctx.fill();
                }
                ctx.shadowBlur = 0;
            }

            ctx.restore();
            ctx.save();

            // CHỮ phía trước hexagram
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.24;
            ctx.font = 'bold 85px serif';
            ctx.fillStyle = '#ff44ff';
            if (!_mobPerf) ctx.shadowColor = '#cc00cc'; if (!_mobPerf) ctx.shadowBlur = 40;
            ctx.fillText('星王召靈審滅', tx, ty - 8);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 22px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            if (!_mobPerf) ctx.shadowColor = '#ff00ff'; if (!_mobPerf) ctx.shadowBlur = 22;
            ctx.fillText('SUMMONED SPIRIT JUDGMENT', tx, ty - 50);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 12px monospace';
            ctx.fillStyle = '#ff88ff';
            if (!_mobPerf) ctx.shadowBlur = 8;
            ctx.fillText('— Tinh Vương: Triệu Linh Diệt Phán —', tx, ty - 30);

            ctx.restore();
        }
    }

    // Finale charge aura
    if (spirit.isFinishing && spirit.finaleState === 'charging') {
        const chargeRatio = 1 - spirit.finaleChargeTime / 2500;
        ctx.fillStyle = "rgba(200,0,50,0.15)";
        ctx.beginPath(); ctx.arc(spirit.x, spirit.y, canvas.width * chargeRatio, 0, Math.PI * 2); ctx.fill();
    }

    const size = spirit.isFinishing ? 30 : 15;
    const sprites = _getSpiritSprites(size);

    // Gentle float bob, visual only — duration bar below stays anchored to
    // the spirit's real x/y so it doesn't wobble with the body.
    const floatOffset = Math.sin(now / 500) * (size * 0.25);
    const sx = spirit.x, sy = spirit.y + floatOffset;

    ctx.save();
    ctx.translate(sx, sy);

    // Soft background glow behind the halo — 2 stacked passes (wide dim
    // wash + tighter brighter core) read noticeably punchier than 1 flat pass.
    const bgR = size * 5.2;
    const bgGlow = _getGlowSprite('rgba(200,20,255,0.42)', bgR);
    if (bgGlow) ctx.drawImage(bgGlow, -bgR, -bgR);
    const bgR2 = size * 2.6;
    const bgGlow2 = _getGlowSprite('rgba(255,120,255,0.35)', bgR2);
    if (bgGlow2) ctx.drawImage(bgGlow2, -bgR2, -bgR2);

    // Outer dashed halo ring — baked sprite, just rotate + drawImage
    ctx.save();
    ctx.rotate(now / 1200);
    ctx.drawImage(sprites.outerRing, -sprites.outerRingDim / 2, -sprites.outerRingDim / 2);
    ctx.restore();

    // Inner ring + its 3 orbiting nodes, baked together since they rotate as one unit
    ctx.save();
    ctx.rotate(-now / 800);
    ctx.drawImage(sprites.innerRing, -sprites.innerDim / 2, -sprites.innerDim / 2);
    ctx.restore();

    // Trailing petals, baked sprite positioned/rotated live
    const petalCount = 6;
    for (let i = 0; i < petalCount; i++) {
        const a = now / 1000 + (i / petalCount) * Math.PI * 2;
        const px = Math.cos(a) * (size * 1.35);
        const py = Math.sin(a) * (size * 0.65) + Math.sin(now / 400 + i) * (size / 6);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.drawImage(sprites.petal, -sprites.petalDim / 2, -sprites.petalDim / 2);
        ctx.restore();
    }

    // Crystal fragments, baked sprite orbiting the body
    const fragCount = 4;
    for (let i = 0; i < fragCount; i++) {
        const fPhase = now / 600 + i * 1.5;
        const fDist = size * 1.05 + Math.sin(fPhase * 2.5) * (size * 0.15);
        const fx = Math.cos(fPhase) * fDist;
        const fy = Math.sin(fPhase) * fDist;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(now / 350 + i);
        ctx.drawImage(sprites.frag, -sprites.fragDim / 2, -sprites.fragDim / 2);
        ctx.restore();
    }

    // Main core — baked glow sprite, live flicker star + highlight on top
    ctx.drawImage(sprites.core, -sprites.coreDim / 2, -sprites.coreDim / 2);

    ctx.save();
    ctx.rotate(now / -1200);
    const starAlpha = 0.6 + 0.3 * Math.sin(now / 150);
    ctx.fillStyle = `rgba(255,255,255,${starAlpha})`;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.lineTo(0, -size * 1.1);
        ctx.lineTo(size * 0.12, -size * 0.25);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(-size * 0.15, -size * 0.15, size * 0.25, size * 0.12, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end translate(sx, sy)

    // duration bar
    const bw = 42, bh = 5;
    const bx = spirit.x - bw / 2, by = spirit.y - size - 16;
    ctx.fillStyle = '#222'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'white'; ctx.fillRect(bx, by, bw * (timeRemaining / spirit.duration), bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);

    // glory indicator
    if (gloryForJusticeActive) {
        ctx.fillStyle = 'lime';
        if (!_mobPerf) ctx.shadowColor = 'lime'; if (!_mobPerf) ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(spirit.x - 5, spirit.y - size - 26);
        ctx.lineTo(spirit.x + 5, spirit.y - size - 26);
        ctx.lineTo(spirit.x, spirit.y - size - 36);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Domain purple ally tint
    if (skillShiftActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(140,0,255,0.32)';
        ctx.beginPath(); ctx.arc(spirit.x, spirit.y, size * 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,100,255,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(spirit.x, spirit.y, size * 1.3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}


// PHŌTOKRYSTOS RENDER
function drawSpirit(spirit) {
    if (!spirit) return;
    if (spirit.isPhotokrystos) { drawPhotokrystos(spirit); return; }
    _drawNormalSpirit(spirit);
}

// PHOTOKRYSTOS, Silk Tail (DNT firing)
function _drawPhotoSilkTail(sx, sy, behindAngle, now, progress) {
    const alpha = Math.min(1, progress * 2.5);
    if (alpha < 0.01) return;
    const bDx = Math.cos(behindAngle), bDy = Math.sin(behindAngle);
    const pDx = -bDy, pDy = bDx;
    const t = now / 1000;

    const strands = [
        { off:  0,  len: 155, w: 2.6, ph: 0.0, rgb: [255, 255, 255] },
        { off: -9,  len: 130, w: 2.0, ph: 0.7, rgb: [200, 255, 220] },
        { off:  9,  len: 130, w: 2.0, ph: 1.4, rgb: [200, 255, 220] },
        { off: -20, len: 105, w: 1.5, ph: 1.1, rgb: [100, 255, 160] },
        { off:  20, len: 105, w: 1.5, ph: 1.8, rgb: [100, 255, 160] },
        { off: -33, len:  80, w: 1.0, ph: 0.4, rgb: [45,  255, 115] },
        { off:  33, len:  80, w: 1.0, ph: 2.1, rgb: [45,  255, 115] },
        { off:  4,  len: 185, w: 0.8, ph: 2.8, rgb: [220, 255, 235] },
        { off: -4,  len: 185, w: 0.8, ph: 3.5, rgb: [220, 255, 235] },
    ];

    ctx.save();
    ctx.lineCap = 'round';
    if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 7; }

    for (const s of strands) {
        const amp  = 14 + Math.abs(s.off) * 0.6;
        const w1   = Math.sin(t * 3.6 + s.ph)           * amp;
        const w2   = Math.sin(t * 2.9 + s.ph + 1.3)     * amp * 1.5;
        const w3   = Math.sin(t * 4.3 + s.ph + 2.8)     * amp * 0.7;
        const d1   = s.len * 0.28;
        const cp1x = sx + bDx * d1 + pDx * (s.off + w1);
        const cp1y = sy + bDy * d1 + pDy * (s.off + w1);
        const d2   = s.len * 0.62;
        const cp2x = sx + bDx * d2 + pDx * (s.off + w2);
        const cp2y = sy + bDy * d2 + pDy * (s.off + w2);
        const ex   = sx + bDx * s.len + pDx * (s.off + w3);
        const ey   = sy + bDy * s.len + pDy * (s.off + w3);
        const [r, g, b] = s.rgb;
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0,    `rgba(${r},${g},${b},${0.92 * alpha})`);
        grad.addColorStop(0.35, `rgba(${r},${g},${b},${0.65 * alpha})`);
        grad.addColorStop(0.70, `rgba(${r},${g},${b},${0.28 * alpha})`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = s.w;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawPhotokrystos(spirit) {
    const now = performance.now();
    ctx.save();
    const sx = spirit.x, sy = spirit.y;
    const size = 18.2; // 20% larger than normal (15)
    const t = now / 1000;

    // DNT: smooth body rotation toward locked target
    if (!spirit._dntSpiritRot) spirit._dntSpiritRot = 0;
    const _dntRotTarget = (spirit._dntState === 'aiming' || spirit._dntState === 'firing')
        ? (spirit._dntAngle || 0) + Math.PI / 2  // front gem faces dntAngle
        : 0;                                       // idle: return upright
    const _dntRotSpeed = spirit._dntState === 'aiming'     ? 0.14
                       : spirit._dntState === 'firing'      ? 0.06
                       : spirit._dntState === 'recovering'  ? 0.04 : 0.03;
    let _dntRotDiff = _dntRotTarget - spirit._dntSpiritRot;
    while (_dntRotDiff >  Math.PI) _dntRotDiff -= Math.PI * 2;
    while (_dntRotDiff < -Math.PI) _dntRotDiff += Math.PI * 2;
    spirit._dntSpiritRot += _dntRotDiff * _dntRotSpeed;

    // 8-star summoning announcement (same as normal spirit title)
    if (spirits.length > 0 && spirit === spirits[spirits.length - 1]) {
        const elapsed = gameElapsedTime - spirit.spawnGameTime;
        const textT = elapsed < 1500 ? Math.min(elapsed / 150, 1) * Math.max(0, 1 - (elapsed - 150) / 1250) : 0;
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.globalAlpha = textT * 0.28;
            ctx.font = 'bold 90px serif'; ctx.fillStyle = '#00ff88';
            if (!_mobPerf) { ctx.shadowColor = '#00cc55'; ctx.shadowBlur = 50; }
            ctx.fillText('開天立地', player.x, player.y - 110);
            ctx.globalAlpha = textT * 0.95;
            ctx.font = 'bold 20px "Arial Black", sans-serif'; ctx.fillStyle = '#ffffff';
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 24; }
            ctx.fillText('PRIMEVAL CREATION — Phōtokrystos', player.x, player.y - 62);
            ctx.globalAlpha = textT * 0.8;
            ctx.font = 'italic 11px monospace'; ctx.fillStyle = '#a0ffcc';
            ctx.fillText('— Khai Thiên Lập Địa —', player.x, player.y - 44);
            ctx.restore();
        }
    }

    // BTM flame cone
    if (spirit._btmPhase === 'warming' || spirit._btmPhase === 'firing') {
        const btmRatio = spirit._btmPhase === 'warming'
            ? Math.min(1, spirit._btmTimer / 1200)
            : Math.min(1, spirit._btmTimer / 3500);

        // Warming phase: dramatic flight aura
        if (spirit._btmPhase === 'warming') {
            const wp = btmRatio; // 0→1
            ctx.save();
            // Expanding energy ring
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 30 * wp; }
            for (let ring = 0; ring < 3; ring++) {
                const ringR = (50 + ring * 35) * wp;
                const ringA = Math.max(0, 0.7 - ring * 0.2) * (1 - wp * 0.5);
                ctx.strokeStyle = `rgba(0,255,136,${ringA})`;
                ctx.lineWidth = 4 - ring;
                ctx.beginPath(); ctx.arc(sx, sy, ringR, 0, Math.PI * 2); ctx.stroke();
            }
            // Speed trail lines toward center
            if (!_mobPerf) {
                const cx2 = canvas.width / 2, cy2 = canvas.height * 0.35;
                const dx2 = cx2 - sx, dy2 = cy2 - sy;
                const len = Math.hypot(dx2, dy2) || 1;
                for (let li = 0; li < 5; li++) {
                    const frac = 0.2 + li * 0.15;
                    ctx.strokeStyle = `rgba(167,255,197,${(0.6 - li * 0.1) * wp})`;
                    ctx.lineWidth = 2 - li * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(sx + (dx2 / len) * frac * 60, sy + (dy2 / len) * frac * 60);
                    ctx.lineTo(sx - (dx2 / len) * (frac * 40 + li * 8), sy - (dy2 / len) * (frac * 40 + li * 8));
                    ctx.stroke();
                }
            }
            // Wing glow pulse
            const wPulse = 0.5 + 0.5 * Math.sin(now / 80); // fast pulse
            ctx.globalAlpha = wp * wPulse * 0.5;
            ctx.fillStyle = 'rgba(0,255,136,1)';
            ctx.beginPath(); ctx.arc(sx, sy, 30 * (1 + wp * 0.5), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            ctx.restore();
        }

        ctx.save();
        // Full-screen barrier overlay (mobile: solid color, desktop: gradient)
        const barrierAlpha = btmRatio * 0.18;
        if (_mobPerf) {
            ctx.fillStyle = `rgba(0,200,80,${barrierAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            const barrierGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            barrierGrad.addColorStop(0, `rgba(150,255,200,${barrierAlpha * 1.4})`);
            barrierGrad.addColorStop(0.5, `rgba(0,255,120,${barrierAlpha})`);
            barrierGrad.addColorStop(1, `rgba(0,80,40,${barrierAlpha * 0.5})`);
            ctx.fillStyle = barrierGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // Barrier border + ornaments (mobile: border only)
        ctx.strokeStyle = `rgba(0,255,136,${0.7 * btmRatio})`; ctx.lineWidth = 3;
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20 * btmRatio; }
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        if (!_mobPerf) {
            const cLen = 30;
            const corners = [[4, 4], [canvas.width - 4, 4], [4, canvas.height - 4], [canvas.width - 4, canvas.height - 4]];
            const cDirs = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
            ctx.strokeStyle = `rgba(167,255,197,${0.9 * btmRatio})`; ctx.lineWidth = 2.5;
            for (let ci = 0; ci < 4; ci++) {
                const [cx3, cy3] = corners[ci]; const [dx3, dy3] = cDirs[ci];
                ctx.beginPath(); ctx.moveTo(cx3, cy3); ctx.lineTo(cx3 + dx3 * cLen, cy3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx3, cy3); ctx.lineTo(cx3, cy3 + dy3 * cLen); ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;

        // Lightning bolts: one per enemy each tick
        if (spirit._btmPhase === 'firing' && spirit._btmLightnings && spirit._btmLightnings.length > 0) {
            for (const tgt of spirit._btmLightnings) {
                // Lightning bolt from top of screen to enemy
                const lx = tgt.x, ly = tgt.y;
                const topY = 0;
                const segs = 7;
                ctx.strokeStyle = _mobPerf ? `rgba(180,255,220,${0.8})` : `rgba(200,255,230,0.95)`;
                ctx.lineWidth = _mobPerf ? 1.5 : 2.5;
                if (!_mobPerf) { ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 12; }
                ctx.beginPath(); ctx.moveTo(lx, topY);
                for (let li = 1; li < segs; li++) {
                    const frac = li / segs;
                    const jitter = (Math.random() - 0.5) * 40 * (1 - frac);
                    ctx.lineTo(lx + jitter, topY + (ly - topY) * frac);
                }
                ctx.lineTo(lx, ly); ctx.stroke();
                // Flash at impact point
                if (!_mobPerf) {
                    ctx.fillStyle = 'rgba(220,255,240,0.6)';
                    ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2); ctx.fill();
                }
                ctx.shadowBlur = 0;
            }
        }
        ctx.restore();
    }

    // Danger? Not Today!, laser beam
    if (spirit._dntState === 'aiming' || spirit._dntState === 'firing') {
        const angle  = spirit._dntAngle;
        const bDx    = Math.cos(angle), bDy = Math.sin(angle);

        // Screen-edge endpoint
        let maxT = Infinity;
        if (bDx >  0.0001) maxT = Math.min(maxT, (canvas.width  - sx) / bDx);
        else if (bDx < -0.0001) maxT = Math.min(maxT, -sx / bDx);
        if (bDy >  0.0001) maxT = Math.min(maxT, (canvas.height - sy) / bDy);
        else if (bDy < -0.0001) maxT = Math.min(maxT, -sy / bDy);
        const endX = sx + bDx * maxT;
        const endY = sy + bDy * maxT;

        ctx.save();

        if (spirit._dntState === 'aiming') {
            // Charge-up: dashed aim line + swelling glow
            const aimP = Math.min(1, spirit._dntTimer / 100);
            ctx.globalAlpha = aimP;
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20; }
            ctx.strokeStyle = `rgba(160,255,190,0.8)`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 7]);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.setLineDash([]);
            // Swelling glow at origin
            const swellG = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20 * aimP);
            swellG.addColorStop(0, 'rgba(255,255,255,0.9)');
            swellG.addColorStop(0.4, 'rgba(100,255,160,0.6)');
            swellG.addColorStop(1, 'rgba(0,200,80,0)');
            ctx.fillStyle = swellG;
            ctx.beginPath(); ctx.arc(sx, sy, 20 * aimP, 0, Math.PI * 2); ctx.fill();

        } else { // 'firing'
            const pulse = 0.75 + 0.25 * Math.sin(now / 25); // very fast shimmer

            // Outer diffuse cone (wide, fades along length)
            const outerGrad = ctx.createLinearGradient(sx, sy, endX, endY);
            outerGrad.addColorStop(0,   `rgba(0,255,100,${0.45 * pulse})`);
            outerGrad.addColorStop(0.35, `rgba(0,200,70,${0.25 * pulse})`);
            outerGrad.addColorStop(1,    'rgba(0,80,30,0)');
            ctx.strokeStyle = outerGrad;
            ctx.lineWidth = 48 * pulse;
            ctx.lineCap = 'round';
            if (!_mobPerf) { ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 28; }
            ctx.globalAlpha = 0.55;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();

            // Mid glow
            ctx.lineWidth = 18 * pulse;
            ctx.strokeStyle = `rgba(60,255,120,${0.85 * pulse})`;
            ctx.globalAlpha = 0.75;
            if (!_mobPerf) { ctx.shadowColor = '#80ffb0'; ctx.shadowBlur = 14; }
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();

            // Core beam, bright white-green, thin
            ctx.lineWidth = 5.5 * pulse;
            ctx.strokeStyle = `rgba(240,255,245,${0.95})`;
            ctx.globalAlpha = 1;
            if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.shadowBlur = 0;

            // Muzzle flash (dragon-spit origin)
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 35; }
            const muzzleR = 14 + 7 * pulse;
            const mg = ctx.createRadialGradient(sx, sy, 0, sx, sy, muzzleR);
            mg.addColorStop(0, 'rgba(255,255,255,1)');
            mg.addColorStop(0.3, 'rgba(160,255,200,0.8)');
            mg.addColorStop(1, 'rgba(0,200,80,0)');
            ctx.fillStyle = mg;
            ctx.globalAlpha = pulse;
            ctx.beginPath(); ctx.arc(sx, sy, muzzleR, 0, Math.PI * 2); ctx.fill();

            // Beam-end bloom
            ctx.globalAlpha = 0.35 * pulse;
            const bloomG = ctx.createRadialGradient(endX, endY, 0, endX, endY, 22);
            bloomG.addColorStop(0, 'rgba(200,255,220,0.9)');
            bloomG.addColorStop(1, 'rgba(0,180,60,0)');
            ctx.fillStyle = bloomG;
            ctx.beginPath(); ctx.arc(endX, endY, 22, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;

            // Beam particles (desktop only)
            if (!_mobPerf && Math.random() < 0.65) {
                const frac = 0.08 + Math.random() * 0.85;
                const px2 = sx + (endX - sx) * frac;
                const py2 = sy + (endY - sy) * frac;
                const perp = angle + Math.PI / 2;
                const spread = (Math.random() - 0.5) * 20;
                const _p = _acquireParticle();
                _p.x = px2 + Math.cos(perp) * spread;
                _p.y = py2 + Math.sin(perp) * spread;
                _p.vx = (Math.random() - 0.5) * 1.5;
                _p.vy = (Math.random() - 0.5) * 1.5;
                _p.lifetime = 150 + Math.random() * 200;
                _p.maxLifetime = _p.lifetime;
                _p.size = 1.5 + Math.random() * 2.5;
                _p.color = ['#a0ffcc', '#00ff88', '#ffffff', '#60ffb0'][Math.floor(Math.random() * 4)];
                particles.push(_p);
            }
        }

        ctx.restore();
    }

    // Silk tail: flowing ribbons behind spirit during DNT firing
    if (spirit._dntState === 'firing' && spirit._dntAngle !== undefined) {
        _drawPhotoSilkTail(sx, sy, spirit._dntAngle + Math.PI, now, spirit._dntTimer / 1000);
    }

    // Wing flap: oscillate scaleX
    const wingFlap = Math.cos(t * (Math.PI * 2 / 4)); // 4s period
    const wingScale = 0.55 + 0.45 * Math.abs(wingFlap); // 0.55–1.0
    const wingBright = 1 + 0.5 * (1 - Math.abs(wingFlap));

    // Rotation transform: body/wings/aura rotate to face DNT target
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(spirit._dntSpiritRot);
    ctx.translate(-sx, -sy);

    // Outer aura
    if (!_mobPerf) { ctx.shadowColor = 'rgba(45,255,115,0.7)'; ctx.shadowBlur = 22; }
    const auraG = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2.8);
    auraG.addColorStop(0, 'rgba(45,255,115,0.18)');
    auraG.addColorStop(0.5, 'rgba(45,255,115,0.06)');
    auraG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraG;
    ctx.beginPath(); ctx.arc(sx, sy, size * 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Tail
    const tailFloat = Math.sin(t * (Math.PI * 2 / 4)) * 6; // 0→6→0
    ctx.save(); ctx.translate(sx, sy);
    const tg1 = ctx.createLinearGradient(0, 0, 0, size * 3.5);
    tg1.addColorStop(0, 'rgba(112,255,170,0.85)');
    tg1.addColorStop(0.6, 'rgba(25,204,90,0.5)');
    tg1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg1; ctx.globalAlpha = 0.85;
    // Center tail
    ctx.beginPath(); ctx.moveTo(0, size * 0.8); ctx.bezierCurveTo(size * 0.4, size * 2, size * 0.5, size * 2.8, 0 + tailFloat * 0.3, size * 3.5); ctx.bezierCurveTo(-size * 0.5, size * 2.8, -size * 0.4, size * 2, 0, size * 0.8); ctx.closePath(); ctx.fill();
    // Left tail feather
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(-size * 0.2, size * 0.9); ctx.bezierCurveTo(-size * 0.8, size * 2, -size, size * 2.8, -size * 0.4 + tailFloat * 0.2, size * 3.2); ctx.bezierCurveTo(-size * 0.2, size * 2.5, 0, size * 1.8, -size * 0.2, size * 0.9); ctx.closePath(); ctx.fill();
    // Right tail feather
    ctx.beginPath(); ctx.moveTo(size * 0.2, size * 0.9); ctx.bezierCurveTo(size * 0.8, size * 2, size, size * 2.8, size * 0.4 + tailFloat * 0.2, size * 3.2); ctx.bezierCurveTo(size * 0.2, size * 2.5, 0, size * 1.8, size * 0.2, size * 0.9); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Left Wing
    ctx.save(); ctx.translate(sx, sy); ctx.scale(wingScale, 1);
    if (!_mobPerf) { ctx.shadowColor = 'rgba(167,255,197,0.8)'; ctx.shadowBlur = 15 * wingBright; }
    const wg1 = ctx.createLinearGradient(-size * 1.8, -size * 0.5, 0, size * 0.5);
    wg1.addColorStop(0, `rgba(230,255,240,${0.9 * wingScale})`);
    wg1.addColorStop(0.4, `rgba(77,255,145,${0.7 * wingScale})`);
    wg1.addColorStop(1, 'rgba(0,102,42,0.1)');
    ctx.fillStyle = wg1;
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.5, -size * 0.8, -size * 2.2, -size * 0.3, -size * 2.2, size * 0.6); ctx.bezierCurveTo(-size * 1.2, size * 0.8, -size * 0.5, size * 0.6, -size * 0.1, size * 0.2); ctx.closePath(); ctx.fill();
    // Wing detail lines
    ctx.strokeStyle = `rgba(167,255,197,${0.7 * wingScale})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.2, -size * 0.5, -size * 1.8, size * 0.1, -size * 2, size * 0.5); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-size * 0.25, size * 0); ctx.bezierCurveTo(-size, -size * 0.3, -size * 1.5, size * 0.2, -size * 1.8, size * 0.6); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();

    // Right Wing
    ctx.save(); ctx.translate(sx, sy); ctx.scale(-wingScale, 1); // mirror
    if (!_mobPerf) { ctx.shadowColor = 'rgba(167,255,197,0.8)'; ctx.shadowBlur = 15 * wingBright; }
    ctx.fillStyle = wg1;
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.5, -size * 0.8, -size * 2.2, -size * 0.3, -size * 2.2, size * 0.6); ctx.bezierCurveTo(-size * 1.2, size * 0.8, -size * 0.5, size * 0.6, -size * 0.1, size * 0.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(167,255,197,${0.7 * wingScale})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.2, -size * 0.5, -size * 1.8, size * 0.1, -size * 2, size * 0.5); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-size * 0.25, size * 0); ctx.bezierCurveTo(-size, -size * 0.3, -size * 1.5, size * 0.2, -size * 1.8, size * 0.6); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();

    // Crystal body
    ctx.save(); ctx.translate(sx, sy);
    const bodyFloat = Math.sin(t * (Math.PI * 2 / 4)) * 3;
    ctx.translate(0, bodyFloat);
    // Heavy glow filter equivalent
    if (!_mobPerf) { ctx.shadowColor = '#a7ffc5'; ctx.shadowBlur = 18; }
    // Core glow
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    cg.addColorStop(0, 'rgba(255,255,255,1)');
    cg.addColorStop(0.3, 'rgba(167,255,197,0.9)');
    cg.addColorStop(0.7, 'rgba(45,255,115,0.4)');
    cg.addColorStop(1, 'rgba(10,77,34,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();

    // Hexagonal body
    const bodyG = ctx.createRadialGradient(-size * 0.2, -size * 0.3, 0, 0, 0, size * 0.9);
    bodyG.addColorStop(0, '#ccffe0'); bodyG.addColorStop(0.5, '#4dff91'); bodyG.addColorStop(1, 'rgba(0,50,20,0.3)');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    const pts = [[0, -size * 0.9], [size * 0.35, -size * 0.45], [size * 0.35, size * 0.45], [0, size * 0.9], [-size * 0.35, size * 0.45], [-size * 0.35, -size * 0.45]];
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
    ctx.closePath(); ctx.fill();

    // Spine line
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -size * 0.85); ctx.lineTo(0, size * 0.85); ctx.stroke();

    // Top gem
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -size * 1.1); ctx.lineTo(size * 0.22, -size * 0.9); ctx.lineTo(0, -size * 0.7); ctx.lineTo(-size * 0.22, -size * 0.9); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // Inner highlight ellipse
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-size * 0.18, -size * 0.22, size * 0.28, size * 0.16, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore(); // end rotation transform

    // Particle trail (triangles from wings)
    if (!_mobPerf && Math.random() < 0.35) {
        const wRel = wingFlap; // -1..1
        if (Math.abs(wRel) < 0.3) { // wings moving fast (near 0)
            for (const side of [-1, 1]) {
                const _tp = _acquireParticle();
                _tp.x = sx + side * size * 1.4; _tp.y = sy - size * 0.2;
                _tp.vx = side * (0.3 + Math.random()) * 0.5; _tp.vy = 0.5 + Math.random() * 1.5;
                const _tlt = 600 + Math.random() * 400;
                _tp.lifetime = _tlt; _tp.maxLifetime = 1000;
                _tp.size = 2.5 + Math.random() * 3;
                _tp.color = ['#ffffff', '#a7ffc5', '#2dff73', '#4dff91'][Math.floor(Math.random() * 4)];
                _tp._isTriangle = true;
                _tp._rotation = Math.random() * Math.PI * 2;
                _tp._rotSpeed = (Math.random() - 0.5) * 0.1;
                particles.push(_tp);
            }
        }
    }

    // Duration bar
    if (!spirit._btmStarted) {
        const _cAge = spirit._combatStartTime ? (gameElapsedTime - spirit._combatStartTime) : 0;
        const timeRemaining = Math.max(0, spirit.duration - _cAge);
        const bw = 50, bh = 5;
        const bx = sx - bw / 2, by = sy - size * 1.8 - 20;
        ctx.fillStyle = '#111'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#1a3a1a'; ctx.fillRect(bx, by, bw, bh);
        const ratio = timeRemaining / spirit.duration;
        const barC = ratio > 0.5 ? '#2dff73' : ratio > 0.25 ? '#ffcc00' : '#ff4444';
        ctx.fillStyle = barC; ctx.fillRect(bx, by, bw * ratio, bh);
        ctx.strokeStyle = 'rgba(45,255,115,0.5)'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);
        // Text label
        ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(167,255,197,0.85)'; ctx.font = '8px monospace';
        ctx.fillText('Phōtokrystos', sx, by - 4);
    }

    // Domain tint
    if (skillShiftActive) {
        ctx.save(); ctx.fillStyle = 'rgba(140,0,255,0.28)';
        ctx.beginPath(); ctx.arc(sx, sy, size * 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,100,255,0.65)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, size * 1.3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

// Helper: rename old drawSpirit to _drawNormalSpirit

// PRIMEVAL SUMMONING CIRCLE
function drawPrimevalSummonEffect(eff) {
    const now = performance.now();
    const cx2 = eff.x, cy2 = eff.y;
    ctx.save();

    if (eff.phase === 'converge') {
        const progress = Math.min(1, eff.timer / 1800);
        const R = 80 + 20 * (1 - progress);

        // 8-pointed star (octagram)
        ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(progress * Math.PI * 0.5);
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20; }
        for (let star = 0; star < 2; star++) {
            ctx.save(); ctx.rotate(star * Math.PI / 4);
            ctx.strokeStyle = `rgba(0,255,136,${0.75 * progress})`; ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const r2 = i % 2 === 0 ? R : R * 0.42;
                i === 0 ? ctx.moveTo(Math.cos(a) * r2, Math.sin(a) * r2) : ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            }
            ctx.closePath(); ctx.stroke();
            // Inner ring
            ctx.strokeStyle = `rgba(167,255,197,${0.4 * progress})`; ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(0, 0, R * 0.68, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        // 8 ornament dots
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const pR = R + 10;
            ctx.fillStyle = `rgba(255,255,255,${0.8 * progress})`;
            ctx.beginPath(); ctx.arc(Math.cos(a) * pR, Math.sin(a) * pR, 3.5, 0, Math.PI * 2); ctx.fill();
            // Spoke lines from center
            ctx.strokeStyle = `rgba(45,255,115,${0.25 * progress})`; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.35, Math.sin(a) * R * 0.35); ctx.stroke();
        }
        // Outer dashed circle
        ctx.strokeStyle = `rgba(45,255,115,${0.5 * progress})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(0, 0, R + 18, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Energy convergence particles
        if (!_mobPerf) {
            const numStreams = 12;
            for (let i = 0; i < numStreams; i++) {
                const a = (i / numStreams) * Math.PI * 2 + now / 2000;
                const streamDist = (R + 60) * (1 - progress * 0.7);
                const px = cx2 + Math.cos(a) * streamDist;
                const py = cy2 + Math.sin(a) * streamDist;
                ctx.globalAlpha = 0.5 * progress;
                ctx.fillStyle = '#a7ffc5';
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
                // Trail to center
                ctx.strokeStyle = `rgba(45,255,115,${0.3 * progress})`; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx2, cy2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Kanji text
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = progress * 0.85;
        ctx.font = 'bold 28px serif'; ctx.fillStyle = '#ffffff';
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20; }
        ctx.fillText('開天立地', cx2, cy2 - R - 30);
        ctx.globalAlpha = progress * 0.7;
        ctx.font = 'bold 13px "Arial Black", sans-serif'; ctx.fillStyle = '#a7ffc5';
        ctx.fillText('PRIMEVAL CREATION', cx2, cy2 - R - 12);
        ctx.globalAlpha = progress * 0.6;
        ctx.font = 'italic 9px monospace'; ctx.fillStyle = '#70ffaa';
        ctx.fillText('— Khai Thiên Lập Địa —', cx2, cy2 - R);
        ctx.restore();

    } else if (eff.phase === 'flash') {
        const flashP = Math.min(1, eff.timer / 400);
        ctx.fillStyle = `rgba(167,255,197,${(1 - flashP) * 0.65})`;
        ctx.beginPath(); ctx.arc(cx2, cy2, 120 + flashP * 80, 0, Math.PI * 2); ctx.fill();
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 60 * (1 - flashP); }
        ctx.strokeStyle = `rgba(255,255,255,${(1 - flashP) * 0.9})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx2, cy2, 50 + flashP * 150, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// PHOTOBRANG RENDER, 4-blade shuriken
// Boomerang sprite: generated reference render, chroma-keyed and trimmed
// the same way as the Aries divine weapons. Baked oversized (see PROMPT.md
// in the reference folder) so drawImage always scales it down to the real
// gameplay radius (b._radius, 48-58px), never up, and stays crisp.
const _photoBrangImg = new Image();
_photoBrangImg.src = 'assets/images/game/effects/photokrystos-boomerang.png';
_photoBrangImg.decode().catch(() => {}); // force async decode now, not on first draw

function drawPhotoBrang(b) {
    const now = performance.now();
    const R = b._radius || 48;

    // Wind-tear streaks: aligned to the flight direction (not the spin), so
    // they read as air being cut rather than spinning with the blade.
    const travelAngle = Math.atan2(b.vy, b.vx);
    const spd = Math.hypot(b.vx, b.vy);
    if (!_mobPerf && spd > 2) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(travelAngle + Math.PI); // streaks trail behind travel direction
        const streakAlpha = Math.min(0.5, spd / 40);
        for (let s = 0; s < 3; s++) {
            const off = (s - 1) * 10;
            const len = R * (1.3 + s * 0.35);
            const grad = ctx.createLinearGradient(0, off, len, off);
            grad.addColorStop(0, `rgba(220,255,235,${streakAlpha})`);
            grad.addColorStop(1, 'rgba(220,255,235,0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.5 - s * 0.5;
            ctx.beginPath(); ctx.moveTo(0, off); ctx.lineTo(len, off); ctx.stroke();
        }
        ctx.restore();
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    if (_photoBrangImg.complete && _photoBrangImg.naturalWidth) {
        // Breathing aura: a soft radial gradient halo behind the blade,
        // not shadowBlur (cheaper, and reads as a real aura instead of a
        // blurred edge). A bit bigger/brighter on the Song Lười extra
        // throws so combo blades read as more charged, not just larger.
        if (!_mobPerf) {
            const pulse = 0.6 + 0.4 * Math.sin(now / 180);
            const haloR = R * (1.7 + pulse * 0.5);
            const halo = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, haloR);
            halo.addColorStop(0, `rgba(120,255,180,${0.45 + pulse * 0.25})`);
            halo.addColorStop(0.6, `rgba(45,255,115,${0.22 + pulse * 0.15})`);
            halo.addColorStop(1, 'rgba(45,255,115,0)');
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI * 2); ctx.fill();
        }
        ctx.drawImage(_photoBrangImg, -R, -R, R * 2, R * 2);
    } else {
        // Sprite not loaded yet (first instant after page load) - fall back
        // to a plain glowing disc rather than skipping the draw entirely,
        // so a boomerang never goes fully invisible mid-flight.
        ctx.fillStyle = 'rgba(45,255,115,0.6)';
        ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

// Crescent shape for the mini arc blade: a smooth outer arc (leading edge)
// closed by a jagged chevron inner edge (trailing edge - the "fractured/
// serrated" motif) instead of a plain half-ring.
function _drawMiniBladeCrescent(x, y, sa, ea, r, teethScale, strokeColor) {
    const innerR = r * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, sa, ea);
    const teeth = 6;
    for (let i = 0; i <= teeth; i++) {
        const t = i / teeth;
        const a = ea - (ea - sa) * t;
        const rr = (i % 2 === 0 ? innerR : innerR * 0.7) * teethScale;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.stroke(); }
}

// Blade arc
function drawBladeArcProjectile(arc) {
    const now = performance.now();
    ctx.save();
    const angle = Math.atan2(arc.vy, arc.vx);
    const sa = angle - Math.PI / 2, ea = angle + Math.PI / 2;

    // Spinner's mini arc blade: an electric-cyan serrated crescent, distinct
    // from the lime-green half-ring Blade Arc below - smooth bright leading
    // edge, jagged "teeth" trailing edge (chevron cutouts) instead of the
    // big blade's pixel-square/atom-particle decoration, since 4 of these
    // fire every 300ms and need to stay cheap.
    if (arc.isSpinnerBlade) {
        const r = arc.radius;
        // LOW: flat unshaded cyan, trailing serration exaggerated for readability
        if (_mobPerf) {
            ctx.fillStyle = '#00ffff';
            _drawMiniBladeCrescent(arc.x, arc.y, sa, ea, r, 1.2);
            ctx.restore();
            return;
        }
        const tip = { x: arc.x + Math.cos(angle) * r, y: arc.y + Math.sin(angle) * r };
        const tail = { x: arc.x - Math.cos(angle) * r * 0.3, y: arc.y - Math.sin(angle) * r * 0.3 };
        if (_gfxLevel < 1) {
            // FULL: outer glow wash, a dark shadow-side base underneath for
            // real contrast (the glow alone washed the whole shape out pale),
            // then a bright leading-edge-to-near-black-trailing-edge gradient
            // with a crisp white rim stroke to sell a sharp, glinting blade.
            ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 26;
            ctx.fillStyle = 'rgba(0,255,255,0.32)';
            _drawMiniBladeCrescent(arc.x, arc.y, sa, ea, r * 1.15, 1);
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,20,28,0.85)';
            _drawMiniBladeCrescent(arc.x, arc.y, sa, ea, r, 1);
            const g = ctx.createLinearGradient(tip.x, tip.y, tail.x, tail.y);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#7ff5ff'); g.addColorStop(0.7, '#0088aa'); g.addColorStop(1, '#001820');
            ctx.fillStyle = g;
            ctx.lineWidth = 1.4;
            _drawMiniBladeCrescent(arc.x, arc.y, sa, ea, r * 0.96, 1, 'rgba(220,255,255,0.9)');
            for (let i = 0; i < 5; i++) {
                const t = i / 4;
                const sparkA = sa + (ea - sa) * t;
                const bx = arc.x + Math.cos(sparkA) * r * 0.7, by = arc.y + Math.sin(sparkA) * r * 0.7;
                const drift = (now / 240 + i * 0.35) % 1;
                const tailX = bx - Math.cos(angle) * drift * 16, tailY = by - Math.sin(angle) * drift * 16;
                ctx.strokeStyle = `rgba(160,255,255,${(1 - drift) * 0.7})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(bx - Math.cos(angle) * drift * 8, by - Math.sin(angle) * drift * 8);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();
                ctx.fillStyle = `rgba(200,255,255,${(1 - drift) * 0.9})`;
                ctx.beginPath();
                ctx.arc(tailX, tailY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // MED: clean hard gradient, no glow or shed particles
            const g = ctx.createLinearGradient(tip.x, tip.y, tail.x, tail.y);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#00e5ff'); g.addColorStop(1, '#006e80');
            ctx.fillStyle = g;
            _drawMiniBladeCrescent(arc.x, arc.y, sa, ea, r, 1);
        }
        ctx.restore();
        return;
    }

    // Great Sage's stolen Arc Barrier sword: ported directly from Goliath's
    // own Marchosias-sword joker (_drawGoliathSwords, js/render/
    // enemy-goliath.js) - the corridor guide, launch burst, and 3-layer arc
    // silhouette, just recolored orange->blue.
    if (arc.isGreatSageBlade) {
        if (arc.originX != null && arc.y < canvas.height * 0.85) {
            const halfW = 36;
            const corrLen = Math.hypot(arc.x - arc.originX, arc.y - arc.originY) + 200;
            ctx.save();
            ctx.translate(arc.originX, arc.originY); ctx.rotate(angle);
            ctx.strokeStyle = 'rgba(96,165,250,0.85)'; ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.moveTo(0, -halfW); ctx.lineTo(corrLen, -halfW);
            ctx.moveTo(0, halfW); ctx.lineTo(corrLen, halfW);
            ctx.stroke(); ctx.setLineDash([]);
            ctx.restore();
        }
        if (arc._fireTime && now - arc._fireTime < 320) {
            const elapsed = now - arc._fireTime, prog = elapsed / 320;
            const burstAlpha = (1 - prog) * 0.9, burstR = 12 + prog * 52;
            ctx.save();
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 18; }
            ctx.globalAlpha = burstAlpha;
            ctx.strokeStyle = 'rgba(96,165,250,0.95)'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(arc.originX, arc.originY, burstR, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = burstAlpha * 0.45;
            ctx.fillStyle = 'rgba(147,197,253,0.7)';
            ctx.beginPath(); ctx.arc(arc.originX, arc.originY, burstR * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        ctx.strokeStyle = 'rgba(30,64,175,0.35)'; ctx.lineWidth = 18;
        if (!_mobPerf) { ctx.shadowColor = 'rgba(59,130,246,0.6)'; ctx.shadowBlur = 12; }
        ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

        ctx.strokeStyle = 'rgba(59,130,246,0.95)'; ctx.lineWidth = 5;
        if (!_mobPerf) { ctx.shadowColor = 'white'; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

        ctx.strokeStyle = 'rgba(219,234,254,0.7)'; ctx.lineWidth = 2; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius - 3, sa, ea); ctx.stroke();

        ctx.strokeStyle = `rgba(147,197,253,${0.5 + 0.4 * Math.sin(now / 60)})`; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const slashA = sa + (ea - sa) * ((i + 1) / 4);
            const px1 = arc.x + Math.cos(slashA) * (arc.radius - 10), py1 = arc.y + Math.sin(slashA) * (arc.radius - 10);
            const px2 = arc.x + Math.cos(slashA) * (arc.radius + 10), py2 = arc.y + Math.sin(slashA) * (arc.radius + 10);
            ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
        }
        ctx.restore();
        return;
    }

    // Great Sage's stolen Absolute Verdict orb: ported directly from
    // Goliath's own orb (_drawGoliathOrbs, js/render/enemy-goliath.js) -
    // outer aura wash, waving plasma tendrils, 8 orbiting shards, the rich
    // multi-stop core gradient, branching containment lightning, and the
    // bright inner hotspot - just recolored purple->blue.
    if (arc.isGreatSageOrb) {
        ctx.beginPath(); ctx.arc(arc.x, arc.y, 149, 0, Math.PI * 2);
        const rg = ctx.createRadialGradient(arc.x, arc.y, 101, arc.x, arc.y, 149);
        rg.addColorStop(0, 'rgba(59,130,246,0.18)'); rg.addColorStop(1, 'rgba(59,130,246,0)');
        ctx.fillStyle = rg; ctx.fill();

        if (!_mobPerf) {
            for (let pl = 0; pl < 6; pl++) {
                const baseA = now / 380 + pl * (Math.PI / 3);
                ctx.beginPath();
                for (let seg = 0; seg <= 10; seg++) {
                    const st = seg / 10;
                    const rr = 101 + Math.sin(now / 140 + pl * 2 + st * 8) * 22 + st * 24;
                    const a2 = baseA + st * 0.7;
                    const px2 = arc.x + Math.cos(a2) * rr, py2 = arc.y + Math.sin(a2) * rr;
                    if (seg === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
                }
                ctx.strokeStyle = `rgba(147,197,253,${0.35 + 0.25 * Math.sin(now / 200 + pl)})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 10;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        for (let k = 0; k < 8; k++) {
            const ang2 = now / 250 + k * (Math.PI * 2 / 8);
            const orbitR = 125 + (k % 2 === 0 ? 0 : 14);
            const sx = arc.x + Math.cos(ang2) * orbitR, sy = arc.y + Math.sin(ang2) * orbitR;
            const shardScale = k % 3 === 0 ? 1.3 : 1;
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang2 * 2); ctx.scale(shardScale, shardScale);
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(12, 7); ctx.lineTo(-12, 7); ctx.closePath();
            ctx.fillStyle = '#93c5fd';
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 8; }
            ctx.fill(); ctx.shadowBlur = 0;
            ctx.restore();
        }

        const g2 = ctx.createRadialGradient(arc.x, arc.y, 0, arc.x, arc.y, 101);
        g2.addColorStop(0, '#eff6ff'); g2.addColorStop(0.22, '#93c5fd'); g2.addColorStop(0.55, '#1d4ed8');
        g2.addColorStop(0.85, '#0a1024'); g2.addColorStop(1, 'rgba(10,16,32,0)');
        ctx.beginPath(); ctx.arc(arc.x, arc.y, 101, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 26; }
        ctx.fill();

        if (!_mobPerf) {
            ctx.save();
            ctx.translate(arc.x, arc.y);
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
            for (let i = 0; i < 5; i++) {
                ctx.save();
                ctx.rotate(now * 0.0016 + i * 1.3);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                let d = 0, py2 = 0;
                const branchPoints = [];
                for (let s = 0; s < 4; s++) {
                    d += 12 + Math.random() * 12;
                    py2 = (Math.random() - 0.5) * (12 + s * 9);
                    ctx.lineTo(d, py2);
                    if (s > 0 && Math.random() < 0.5) branchPoints.push({ d, py: py2 });
                }
                ctx.stroke();
                if (branchPoints.length > 0) {
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(219,234,254,0.6)';
                    for (const bp of branchPoints) {
                        const forkAngle = (Math.random() - 0.5) * 1.4;
                        const forkLen = 7 + Math.random() * 10;
                        ctx.beginPath();
                        ctx.moveTo(bp.d, bp.py);
                        ctx.lineTo(bp.d + Math.cos(forkAngle) * forkLen, bp.py + Math.sin(forkAngle) * forkLen);
                        ctx.stroke();
                    }
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
                }
                ctx.restore();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        ctx.save();
        const hotspotG = ctx.createRadialGradient(arc.x, arc.y, 0, arc.x, arc.y, 30);
        hotspotG.addColorStop(0, 'rgba(255,255,255,0.9)');
        hotspotG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(arc.x, arc.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = hotspotG; ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(arc.x, arc.y, 101, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.restore();
        return;
    }

    // LAYER 0: wide energy wash behind the arc
    ctx.strokeStyle = 'rgba(120,255,0,0.12)';
    ctx.lineWidth = 28;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // outer glow arc (original)
    ctx.strokeStyle = 'rgba(173,255,47,0.3)';
    ctx.lineWidth = 14;
    if (!_mobPerf) ctx.shadowColor = 'rgba(150,255,0,0.5)'; if (!_mobPerf) ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // main arc (original)
    ctx.strokeStyle = 'rgba(173,255,47,0.95)';
    ctx.lineWidth = 5;
    if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // bright inner edge (original)
    ctx.strokeStyle = 'rgba(255,255,220,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius - 2, sa, ea); ctx.stroke();

    // LAYER 1: Digital pixel squares along the arc
    // Scatter small glowing squares that float around the arc path
    ctx.shadowBlur = 0;
    const sqCount = 14;
    for (let i = 0; i < sqCount; i++) {
        // spread each square across the semicircle
        const t = i / (sqCount - 1); // 0..1
        const arcAngle = sa + (ea - sa) * t;

        // alternate between arc surface and slightly off-radius
        const radOffset = (((i * 37 + Math.floor(now / 120)) % 5) - 2) * 5;
        const r = arc.radius + radOffset;

        const sx = arc.x + Math.cos(arcAngle) * r;
        const sy = arc.y + Math.sin(arcAngle) * r;

        // size pulses per square, staggered
        const sqPhase = now / 180 + i * 0.9;
        const sqSize = 3 + 2 * Math.abs(Math.sin(sqPhase));

        // flicker opacity
        const sqAlpha = 0.55 + 0.45 * Math.abs(Math.sin(now / 130 + i * 1.3));

        // color cycles: lime → cyan → white
        const col = (i % 3 === 0) ? `rgba(0,255,200,${sqAlpha})`
            : (i % 3 === 1) ? `rgba(173,255,47,${sqAlpha})`
                : `rgba(220,255,150,${sqAlpha * 0.7})`;

        ctx.fillStyle = col;
        // rotate each square independently
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(now / 400 + i * 0.7);
        ctx.fillRect(-sqSize / 2, -sqSize / 2, sqSize, sqSize);
        // inner bright dot on some squares
        if (i % 2 === 0) {
            ctx.fillStyle = `rgba(255,255,255,${sqAlpha * 0.8})`;
            ctx.fillRect(-1, -1, 2, 2);
        }
        ctx.restore();
    }

    // LAYER 2: Lithium-style atom particles ejected from arc
    // These stream outward from the arc face (forward direction)
    const liCount = 10;
    for (let i = 0; i < liCount; i++) {
        // each particle samples a position along the arc
        const t = (i / liCount + ((now / 600) % 1)) % 1;
        const arcAngle = sa + (ea - sa) * t;

        // base pos on arc edge
        const bx = arc.x + Math.cos(arcAngle) * arc.radius;
        const by = arc.y + Math.sin(arcAngle) * arc.radius;

        // drift outward in the arc's facing direction over time
        const driftPhase = (now / 500 + i * 0.63) % 1;
        const driftDist = driftPhase * (arc.radius * 0.55);

        // outward direction = away from arc center
        const outX = Math.cos(arcAngle) * driftDist;
        const outY = Math.sin(arcAngle) * driftDist;

        // small lateral wobble
        const wobble = Math.sin(now / 200 + i * 1.7) * 6;
        const perpX = -Math.sin(arcAngle) * wobble;
        const perpY = Math.cos(arcAngle) * wobble;

        const px = bx + outX + perpX;
        const py = by + outY + perpY;

        // fade out as they drift
        const pAlpha = (1 - driftPhase) * 0.9;
        const pSize = 3.5 * (1 - driftPhase * 0.5);

        ctx.save();
        // lithium-style: small nucleus dot + two orbital rings
        ctx.globalAlpha = pAlpha;

        // nucleus
        const nucleusGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize);
        nucleusGrad.addColorStop(0, '#ffffff');
        nucleusGrad.addColorStop(0.4, '#aaff44');
        nucleusGrad.addColorStop(1, 'rgba(0,200,60,0)');
        ctx.fillStyle = nucleusGrad;
        ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI * 2); ctx.fill();

        // two tiny orbital rings (ellipses, rotated differently per particle)
        const orbitR1 = pSize * 2.2;
        const orbitR2 = pSize * 1.8;
        const orbitRot1 = now / 350 + i * 1.1;
        const orbitRot2 = -now / 280 + i * 0.8;

        ctx.strokeStyle = `rgba(100,255,80,${pAlpha * 0.8})`;
        ctx.lineWidth = 0.8;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(orbitRot1);
        ctx.beginPath(); ctx.ellipse(0, 0, orbitR1, orbitR1 * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(orbitRot2);
        ctx.beginPath(); ctx.ellipse(0, 0, orbitR2 * 0.4, orbitR2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // tiny electron dot orbiting nucleus
        const eDot = { r: orbitR1, a: now / 220 + i * 0.5 };
        ctx.fillStyle = `rgba(200,255,150,${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px + Math.cos(eDot.a) * eDot.r, py + Math.sin(eDot.a) * eDot.r * 0.35, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // LAYER 3: Edge sparks at arc tips
    for (let tip = 0; tip < 2; tip++) {
        const tipAngle = tip === 0 ? sa : ea;
        const tx = arc.x + Math.cos(tipAngle) * arc.radius;
        const ty = arc.y + Math.sin(tipAngle) * arc.radius;

        // 3 short spark lines radiating from each tip
        for (let s = 0; s < 3; s++) {
            const sparkAngle = tipAngle + (s - 1) * 0.4 + Math.sin(now / 100 + s) * 0.2;
            const sparkLen = 6 + 4 * Math.abs(Math.sin(now / 80 + s * 2.1));
            const sAlpha = 0.5 + 0.5 * Math.abs(Math.sin(now / 90 + s));
            ctx.strokeStyle = `rgba(200,255,100,${sAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(sparkAngle) * sparkLen, ty + Math.sin(sparkAngle) * sparkLen);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// One of the Spinner's two counter-rotating squares (together they read as
// an 8-point star). glassy=true gives a translucent look (FULL); false gives
// an opaque hard gradient (MED/LOW-adjacent use).
function _drawSpinnerSquare(r, rot, glassy) {
    ctx.save();
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    if (glassy) { g.addColorStop(0, 'rgba(255,180,220,0.55)'); g.addColorStop(1, 'rgba(200,20,110,0.35)'); }
    else { g.addColorStop(0, '#ff8ad4'); g.addColorStop(1, '#8a0f52'); }
    ctx.fillStyle = g;
    const half = r * 0.72;
    ctx.beginPath();
    ctx.rect(-half, -half, half * 2, half * 2);
    ctx.fill();
    // A few circuit-trace lines on the glass face (FULL only) - fixed, cheap
    // strokes, not a real procedural pattern, just enough surface detail to
    // read as "material" instead of a flat translucent slab.
    if (glassy) {
        ctx.strokeStyle = 'rgba(255,230,245,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-half * 0.7, -half * 0.3); ctx.lineTo(-half * 0.2, -half * 0.3); ctx.lineTo(-half * 0.2, half * 0.5);
        ctx.moveTo(half * 0.15, -half * 0.6); ctx.lineTo(half * 0.15, -half * 0.1); ctx.lineTo(half * 0.6, -half * 0.1);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,250,0.5)';
        ctx.beginPath(); ctx.arc(-half * 0.2, half * 0.5, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(half * 0.6, -half * 0.1, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Flat 8-point star silhouette, used by the Spinner's LOW tier and as the
// stamped-afterimage shape in its FULL-tier speed trail.
function _drawSpinnerStar(r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = rot + (Math.PI / 4) * i;
        const rr = i % 2 === 0 ? r : r * 0.5;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
}

// Arc-blade launch tell: a sudden 4-way cyan crosshair flash overlaying the
// Spinner, drawn in its local (already-translated) space. s._arcFlashEnd is
// set by updateSpiritSpinners() the instant the 4 mini blades fire.
function _drawSpinnerArcFlash(s, now, glow) {
    if (!s._arcFlashEnd || now >= s._arcFlashEnd) return;
    const remain = (s._arcFlashEnd - now) / 180; // 1 -> 0 over the flash's life
    const len = s.size * 1.4;
    ctx.save();
    ctx.globalAlpha = remain;
    if (glow) { ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 24; }
    ctx.strokeStyle = '#aefcff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
    ctx.moveTo(0, -len); ctx.lineTo(0, len);
    ctx.stroke();
    ctx.restore();
}

// Detection-range indicator: 2 flashing dashed rings at the same radius
// updateSpiritSpinners() uses to decide whether an enemy is close enough to
// trigger the arc-blade slash (size/2 + 100) - shown at every quality tier
// since it's gameplay info, not pure decoration, and it's cheap either way.
function _drawSpinnerRangeIndicator(s, now) {
    const range = s.size / 2 + 100;
    const flash = 0.35 + 0.35 * Math.abs(Math.sin(now / 260));
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = `rgba(255,210,235,${flash})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, range, 0, Math.PI * 2); ctx.stroke();
    ctx.lineDashOffset = 9;
    ctx.strokeStyle = `rgba(255,210,235,${flash * 0.6})`;
    ctx.beginPath(); ctx.arc(0, 0, range - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

// Flight-path indicator: 2 dashed lines flanking the direction of travel,
// running all the way out to whichever screen edge the Spinner will hit
// next (a real ray-cast against the same wall bounds updateSpiritSpinners()
// clamps against), plus one short segment past that point showing which way
// it reflects off - drawn in the same local space as
// _drawSpinnerRangeIndicator, at every quality tier.
function _drawSpinnerFlightPath(s, now) {
    const spd = Math.hypot(s.vx, s.vy) || 1;
    const dx = s.vx / spd, dy = s.vy / spd;

    // Ray-cast to the wall it reaches first.
    let tHit = Infinity;
    if (dx > 0.0001) tHit = Math.min(tHit, ((canvas.width - s.size) - s.x) / dx);
    else if (dx < -0.0001) tHit = Math.min(tHit, (s.size - s.x) / dx);
    if (dy > 0.0001) tHit = Math.min(tHit, ((canvas.height - s.size) - s.y) / dy);
    else if (dy < -0.0001) tHit = Math.min(tHit, (s.size - s.y) / dy);
    if (!isFinite(tHit) || tHit < 0) tHit = s.size * 3; // degenerate fallback, shouldn't happen

    const px = -dy, py = dx; // perpendicular to travel direction
    const offset = s.size * 0.35;
    const startD = s.size * 0.6;
    const flash = 0.3 + 0.3 * Math.abs(Math.sin(now / 300));
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1;

    // Main path: 2 lines flanking the travel direction, out to the wall.
    ctx.strokeStyle = `rgba(255,180,220,${flash})`;
    for (const side of [1, -1]) {
        ctx.beginPath();
        ctx.moveTo(px * offset * side + dx * startD, py * offset * side + dy * startD);
        ctx.lineTo(px * offset * side + dx * tHit, py * offset * side + dy * tHit);
        ctx.stroke();
    }

    // Bounce preview: a short single segment past the hit point in the
    // reflected direction (whichever axis actually hit flips sign).
    const hitX = s.x + dx * tHit, hitY = s.y + dy * tHit;
    let rdx = dx, rdy = dy;
    if (Math.abs(hitX - s.size) < 1 || Math.abs(hitX - (canvas.width - s.size)) < 1) rdx = -dx;
    if (Math.abs(hitY - s.size) < 1 || Math.abs(hitY - (canvas.height - s.size)) < 1) rdy = -dy;
    ctx.strokeStyle = `rgba(255,180,220,${flash * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(dx * tHit, dy * tHit);
    ctx.lineTo(dx * tHit + rdx * s.size, dy * tHit + rdy * s.size);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
}

// Spirit finale - the Spinner: a dense, hostile, rapidly-rotating faceted
// gear (two counter-rotating squares forming an 8-point star), unlike the
// soft glowing orbs the rest of the Spirit's kit fires.
function drawSpiritSpinner(s) {
    const now = performance.now();
    const age = now - s.spawnAt;
    const boosted = age < 2000 || now < s.bounceBoostEnd;
    const spin = now / 500;

    // LOW: flat solid color, static jagged silhouette that still physically
    // rotates - speed is conveyed by motion alone, no trail/stretch.
    if (_mobPerf) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.fillStyle = '#ff44aa';
        const lowPulse = 1 + Math.sin(now / 220) * 0.05; // cheap: no gradient/shadow, just a scale wobble
        _drawSpinnerRangeIndicator(s, now);
        _drawSpinnerFlightPath(s, now);
        _drawSpinnerStar(s.size * 0.5 * lowPulse, spin);
        _drawSpinnerArcFlash(s, now, false);
        ctx.restore();
        return;
    }

    ctx.save();

    // Speed-boost tell: FULL gets a stepped afterimage trail (stamped copies
    // that shrink/fade, connected by a thin glow line) instead of a smooth
    // blur - reads as erratic/high-speed rather than continuous motion.
    // MED gets a plain semi-transparent gradient ribbon, no stamping.
    if (boosted) {
        if (_gfxLevel < 1) {
            if (!s._trail) s._trail = [];
            if (now - (s._lastTrailStamp || 0) > 45) {
                s._trail.push({ x: s.x, y: s.y, rot: spin });
                s._lastTrailStamp = now;
                if (s._trail.length > 5) s._trail.shift();
            }
            if (s._trail.length >= 2) {
                ctx.strokeStyle = 'rgba(255,120,190,0.35)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(s._trail[0].x, s._trail[0].y);
                for (let i = 1; i < s._trail.length; i++) ctx.lineTo(s._trail[i].x, s._trail[i].y);
                ctx.lineTo(s.x, s.y);
                ctx.stroke();
            }
            for (let i = 0; i < s._trail.length; i++) {
                const st = s._trail[i];
                ctx.save();
                ctx.globalAlpha = (i + 1) / (s._trail.length + 1) * 0.35;
                ctx.translate(st.x, st.y);
                ctx.fillStyle = '#ff8ad4';
                _drawSpinnerStar(s.size * 0.42, st.rot);
                ctx.restore();
            }
        } else {
            const spd = Math.hypot(s.vx, s.vy) || 1;
            const ndx = -s.vx / spd, ndy = -s.vy / spd;
            const rg = ctx.createLinearGradient(s.x, s.y, s.x + ndx * s.size * 2.2, s.y + ndy * s.size * 2.2);
            rg.addColorStop(0, 'rgba(255,80,170,0.4)'); rg.addColorStop(1, 'rgba(255,80,170,0)');
            ctx.strokeStyle = rg;
            ctx.lineWidth = s.size * 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + ndx * s.size * 2.2, s.y + ndy * s.size * 2.2);
            ctx.stroke();
        }
    }

    ctx.translate(s.x, s.y);
    _drawSpinnerRangeIndicator(s, now);
    _drawSpinnerFlightPath(s, now);
    if (_gfxLevel < 1) {
        // Soft outer halo aura - the single biggest cheap "wow" layer, a
        // breathing glow disc sitting behind everything else.
        const haloPulse = 1 + Math.sin(now / 220) * 0.06;
        const haloR = s.size * (boosted ? 1.3 : 1.1) * haloPulse;
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
        halo.addColorStop(0, boosted ? 'rgba(255,150,215,0.55)' : 'rgba(255,68,170,0.38)');
        halo.addColorStop(1, 'rgba(255,68,170,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI * 2); ctx.fill();

        // Thin rotating containment ring, dashed - "magnetic prism" read.
        ctx.save();
        ctx.rotate(-spin * 0.6);
        ctx.strokeStyle = 'rgba(255,190,225,0.55)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.arc(0, 0, s.size * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        // A second, wider HUD ring counter-rotating with sparse tick marks -
        // cheap (same stroke call, just a bigger radius/dash pattern) but
        // reads as a richer tech readout instead of a single bare ring.
        ctx.save();
        ctx.rotate(spin * 0.35);
        ctx.strokeStyle = 'rgba(255,210,235,0.32)';
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 10]);
        ctx.beginPath(); ctx.arc(0, 0, s.size * 0.85, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.shadowColor = '#ff44aa'; ctx.shadowBlur = boosted ? 50 : 34;
        // Stray energy sparks shedding from the tips as it spins, each with a
        // short comet tail rather than a plain dot (FULL only).
        for (let i = 0; i < 4; i++) {
            const a = spin * 1.3 + i * (Math.PI / 2);
            const sparkR = s.size * 0.55 + Math.sin(now / 90 + i) * 4;
            const sx = Math.cos(a) * sparkR, sy = Math.sin(a) * sparkR;
            const tailA = a - Math.sign(spin) * 0.5;
            ctx.strokeStyle = 'rgba(255,180,220,0.6)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(Math.cos(tailA) * sparkR, Math.sin(tailA) * sparkR);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,220,240,0.9)';
            ctx.beginPath(); ctx.arc(sx, sy, 1.7, 0, Math.PI * 2); ctx.fill();
        }
    } else if (_gfxLevel === 1) {
        // MED: no glow/shadow, but a hard-edged bright rim gives it more
        // presence than the bare squares alone.
        ctx.strokeStyle = 'rgba(255,170,215,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, s.size * 0.58, 0, Math.PI * 2); ctx.stroke();
    }
    // Two overlapping, counter-rotating squares - the 8-point star body
    _drawSpinnerSquare(s.size * 0.5, spin, _gfxLevel < 1);
    _drawSpinnerSquare(s.size * 0.5, -spin * 1.15, _gfxLevel < 1);
    ctx.shadowBlur = 0;
    if (_gfxLevel < 1) {
        // Swirling iris in front of the squares, behind the core dot - 2
        // partial rings spinning at different rates for a "power building
        // up" read, same cost class as the containment rings above.
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, s.size * 0.3, spin * 2, spin * 2 + Math.PI * 1.3); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,150,210,0.55)';
        ctx.beginPath(); ctx.arc(0, 0, s.size * 0.21, -spin * 2.6, -spin * 2.6 + Math.PI * 1.6); ctx.stroke();
    }
    // Blinding white-pink core, brighter while boosted
    ctx.fillStyle = boosted ? '#ffffff' : '#ff8ad4';
    ctx.beginPath(); ctx.arc(0, 0, s.size * 0.14, 0, Math.PI * 2); ctx.fill();
    _drawSpinnerArcFlash(s, now, _gfxLevel < 1);
    ctx.restore();
}

// Skill D – Black Hole charging
