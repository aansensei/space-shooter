// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/enemy-veilshroud.js — extracted from render.js (base body, echo clone,
// lightning-strike/echo-explosion effects). Calls _genBoltPoints/_strokeBoltPath
// from fx.js.

// Every piece of Veilshroud's body (ribbons, armillary rings, core, shards)
// is left fully live/uncached below. The ribbons genuinely can't be cached
// (shape deforms over time, not just rotation). The 2 armillary rings COULD
// in principle use the same static-bitmap-plus-live-rotate trick as
// apostle/thaelis, but a first attempt at it left the thin dashed ring
// visibly degraded (reported twice in testing) and wasn't worth chasing
// further - Veilshroud's ribbons are already the dominant cost and stay
// live regardless, so caching just the 2 rings was a small win for the
// risk. Left as plain original code for guaranteed pixel-for-pixel fidelity.

function _drawVeilshroud(enemy) {
    const now = performance.now();
    const r = enemy.size / 2; // hitbox radius

    // Lerp màu: Normal = Deep Violet, Phantom = Ghostly Cyan
    // inPhantom: fade in (0→1) via phantomTimer, after phantom: fade out (1→0) via phantomFadeTimer
    const t = enemy.inPhantom
        ? Math.min(1, enemy.phantomTimer / 400)
        : Math.min(1, Math.max(0, (enemy.phantomFadeTimer || 0) / 400));
    const cNR = 140, cNG = 20, cNB = 255;   // violet
    const cPR = 0, cPG = 230, cPB = 200;  // cyan
    const curR = Math.round(cNR + (cPR - cNR) * t);
    const curG = Math.round(cNG + (cPG - cNG) * t);
    const curB = Math.round(cNB + (cPB - cNB) * t);
    const mainColor = `rgb(${curR},${curG},${curB})`;
    const baseAlpha = 1 - t * 0.5; // fade to 50% opacity in phantom

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha = baseAlpha;

    // Glitch jitter khi phantom
    if (enemy.inPhantom && Math.random() < 0.25) {
        ctx.translate((Math.random() - 0.5) * 14 * t, (Math.random() - 0.5) * 9 * t);
    }

    // Hazy/dreamlike blur while cloaked, grows in with the same fade-in
    // progress (t) as the rest of the phantom transition, cut on lower tiers.
    if (enemy.inPhantom && !_mobPerf && _gfxLevel < 2) {
        ctx.filter = `blur(${(1.5 + t * 2.5).toFixed(1)}px)`;
    }

    // 1. AURA HƯ KHÔNG
    const auraPulse = Math.sin(now / 300) * 12;
    const auraR = r * 3.2 + auraPulse;
    const auraG = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, auraR);
    auraG.addColorStop(0, `rgba(${curR},${curG},${curB},0.18)`);
    auraG.addColorStop(1, 'transparent');
    ctx.fillStyle = auraG;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

    // 2. VOID RIBBONS (áo choàng năng lượng uốn lượn)
    const numRibbons = _mobPerf ? 3 : 5;
    if (!_mobPerf) { ctx.shadowColor = mainColor; ctx.shadowBlur = 14; }
    for (let i = 0; i < numRibbons; i++) {
        ctx.save();
        const rotSpeed = now / (3000 - t * 1400) * (i % 2 === 0 ? 1 : -1);
        ctx.rotate((i / numRibbons) * Math.PI * 2 + rotSpeed);
        const ribLen = r * 2.6 + Math.sin(now / 400 + i) * 20;
        const ribWidth = r * 0.38;
        const wave = Math.sin(now / 250 + i) * 35;
        const ribG = ctx.createLinearGradient(0, 0, 0, -ribLen);
        ribG.addColorStop(0, `rgba(${curR},${curG},${curB},${0.55 - t * 0.25})`);
        ribG.addColorStop(0.7, `rgba(${Math.round(curR / 2)},${Math.round(curG / 2)},${Math.round(curB / 2)},0.15)`);
        ribG.addColorStop(1, 'transparent');
        ctx.fillStyle = ribG;
        ctx.beginPath();
        ctx.moveTo(-ribWidth / 2, 0);
        ctx.quadraticCurveTo(wave - ribWidth, -ribLen * 0.5, 0, -ribLen);
        ctx.quadraticCurveTo(wave + ribWidth, -ribLen * 0.5, ribWidth / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + t * 0.18})`;
        ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
    }
    ctx.shadowBlur = 0;

    // 3. ARMILLARY RINGS
    ctx.lineWidth = 2 + t * 1.5;
    ctx.strokeStyle = `rgba(${curR},${curG},${curB},0.8)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.05, r * 0.38, now / 1000, 0, Math.PI * 2);
    ctx.stroke();
    // Bumped up from a bare 0.35 base alpha/no glow - too thin and faint to
    // read against the rest of a busy real fight (particles, other enemies,
    // bullets), even though it was always technically rendering.
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + t * 0.4})`;
    ctx.lineWidth = 2.5;
    if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6; }
    ctx.setLineDash([9, 13]);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.48, -now / 800 + Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 3b. PHANTOM RING (nét đứt cyan, chỉ xuất hiện khi đang Phantom): bán
    // kính co giãn ra/vào theo dao động sin thay vì cố định, và tự xoay nhẹ
    // rồi đảo chiều thay vì quay liên tục một hướng, ăn nhịp với kiểu rung
    // giật chập chờn của cả thân.
    if (enemy.inPhantom) {
        const pulse = Math.sin(now / 260);
        const ringR = r * 1.38 + pulse * r * 0.16;
        const rock = Math.sin(now / 480) * 0.55;
        ctx.save();
        ctx.rotate(rock);
        ctx.globalAlpha = 0.5 + 0.35 * Math.abs(pulse);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10; }
        ctx.setLineDash([7, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 4. FLOATING ARMOR SHARDS (skip on mobile)
    if (!_mobPerf) {
        const shardOffset = t * 35;
        const shardAlpha = 1 - t * 0.82;
        ctx.fillStyle = `rgba(10,5,20,${shardAlpha})`;
        ctx.strokeStyle = `rgba(${curR},${curG},${curB},${0.8 + t * 0.2})`;
        ctx.lineWidth = 1.5;
        const armorShards = [
            [[0, -r * 1.55 - shardOffset], [r * 0.48, -r * 0.58 - shardOffset * 0.5], [0, -r * 0.38], [-r * 0.48, -r * 0.58 - shardOffset * 0.5]],
            [[0, r * 1.35 + shardOffset], [r * 0.38, r * 0.48 + shardOffset * 0.5], [0, r * 0.28], [-r * 0.38, r * 0.48 + shardOffset * 0.5]],
            [[-r * 1.25 - shardOffset, 0], [-r * 0.48, -r * 0.28], [-r * 0.28, 0], [-r * 0.48, r * 0.28]],
            [[r * 1.25 + shardOffset, 0], [r * 0.48, -r * 0.28], [r * 0.28, 0], [r * 0.48, r * 0.28]],
        ];
        armorShards.forEach(pts => {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
            ctx.closePath();
            if (t < 0.88) ctx.fill();
            ctx.stroke();
        });
    }

    // 5. SINGULARITY CORE
    const coreR = r * 0.38 + t * r * 0.18;
    const accR = coreR * 1.5 + Math.sin(now / 100) * 2.5;
    const accGrad = ctx.createRadialGradient(0, 0, coreR * 0.7, 0, 0, accR);
    accGrad.addColorStop(0, '#ffffff');
    accGrad.addColorStop(0.4, mainColor);
    accGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = accGrad;
    ctx.beginPath(); ctx.arc(0, 0, accR, 0, Math.PI * 2); ctx.fill();
    // Event Horizon (black hole)
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();
    // Iris / khe nứt không gian
    ctx.fillStyle = t > 0.5 ? '#ffffff' : mainColor;
    if (!_mobPerf) { ctx.shadowColor = mainColor; ctx.shadowBlur = 14; }
    ctx.save();
    ctx.rotate(now / 1500);
    ctx.beginPath();
    ctx.ellipse(0, 0, coreR * 0.13, coreR * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    // RGB Glitch separation (chỉ ở phantom)
    if (t > 0.12 && !_mobPerf) {
        const glAmt = t * 5;
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = 'rgba(255,0,0,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-glAmt, 0, coreR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,255,0.45)';
        ctx.beginPath(); ctx.arc(glAmt, 0, coreR, 0, Math.PI * 2); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    // HP bar
    const bw = enemy.size, bh = 5;
    const bx = enemy.x - bw / 2, by = enemy.y - enemy.size / 2 - 14;
    ctx.fillStyle = '#330033'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = enemy.inPhantom ? '#00e5cc' : '#cc22ff';
    ctx.fillRect(bx, by, bw * Math.max(0, enemy.hp / enemy.maxHp), bh);
    ctx.strokeStyle = `rgba(${curR},${curG},${curB},0.8)`; ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);

    // HP number
    ctx.fillStyle = '#ffffff'; ctx.font = '11px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(Math.ceil(enemy.hp), enemy.x, by - 1);

    // Phantom indicator
    if (enemy.inPhantom) {
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(now / 200));
        ctx.fillStyle = '#00e5cc'; ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('PHANTOM', enemy.x, by - 14);
        ctx.restore();
    }

    // Vòng đỏ lưu lại sau khi sét đánh, fade từ 1.0 xuống 0 trong 1.5s (khớp với countdown end)
    if (enemy._lastLightningTime) {
        const elapsed = performance.now() - enemy._lastLightningTime;
        const fadeDur = 1500;
        if (elapsed < fadeDur) {
            const fa = 1 - elapsed / fadeDur; // 1.0 → 0
            ctx.save();
            ctx.globalAlpha = fa;
            ctx.strokeStyle = '#ff2233';
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 10; }
            ctx.setLineDash([8, 5]);
            ctx.beginPath(); ctx.arc(enemy._lastLightningX, enemy._lastLightningY, 100, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Lightning countdown telegraph, cùng style với post-strike ring để transition liền mạch
    if (enemy.lightningPending) {
        const prog = Math.min(1, enemy.lightningCountdown / enemy.lightningCountdownDuration);
        const tx = enemy.lightningTargetX, ty = enemy.lightningTargetY;
        const circR = 100;
        ctx.save();

        // Radial fill mờ báo hiệu vùng nguy hiểm (prog càng cao càng sáng)
        if (prog > 0.01) {
            const fillGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, circR);
            fillGrad.addColorStop(0, `rgba(255,34,51,${0.28 * prog})`);
            fillGrad.addColorStop(1, 'rgba(255,0,0,0)');
            ctx.fillStyle = fillGrad;
            ctx.beginPath(); ctx.arc(tx, ty, circR, 0, Math.PI * 2); ctx.fill();
        }

        // Vòng tròn nét đứt, giống post-strike (cùng màu, lineWidth, dash)
        ctx.globalAlpha = 0.35 + prog * 0.65; // 0.35 lúc đầu → 1.0 lúc sắp đánh
        ctx.strokeStyle = '#ff2233';
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 10; }
        ctx.setLineDash([8, 5]);
        ctx.beginPath(); ctx.arc(tx, ty, circR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

// The Phantom Portal: a proper black hole (gravitational lens, swirling
// rings, infalling matter, wobbling event horizon, reusing the color
// palette/glow technique from the original Cosmic Black Hole's Skill D
// render before it became Death Star, flattened into a circular vortex
// instead of a tilted-perspective disk). The vortex pulls in everything
// from the full blast radius down to the small core at its center.
function _drawVeilshroudEcho(enemy) {
    const now = performance.now();
    const echoT = enemy.echoTimer || 0;
    const outerR = VEIL_ECHO_BLAST_RADIUS; // vortex spans out to the blast edge
    // Portal core rendered 4x bigger than the entity's actual hitbox, capped
    // so the swirling rings (which start at r*1.3) always stay inside outerR.
    const r = Math.min((enemy.size / 2) * 4, outerR * 0.7);

    // Mức độ "charging" (3–5s: sắp sụp)
    const isCharging = echoT >= 3000;
    const chargeProg = isCharging ? Math.min(1, (echoT - 3000) / 2000) : 0;

    // State color: cyan (fresh) -> red (about to collapse)
    const eR = Math.round(200 * chargeProg);
    const eG = Math.round(240 - 240 * chargeProg);
    const eB = Math.round(255 - 200 * chargeProg);
    const echoColor = `rgb(${eR},${eG},${eB})`;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Gravitational lens glow, out to the blast radius, breathing gently
    if (_gfxLevel < 2) {
        const _lensA = _gfxLevel < 1 ? 1.0 : 0.40;
        const _breathe = 0.9 + 0.1 * Math.sin(now / 500);
        const lensG = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, outerR * _breathe);
        lensG.addColorStop(0, `rgba(190,80,255,${0.30 * _lensA})`);
        lensG.addColorStop(0.6, `rgba(100,0,180,${0.12 * _lensA})`);
        lensG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lensG;
        ctx.beginPath(); ctx.arc(0, 0, outerR * _breathe, 0, Math.PI * 2); ctx.fill();
    }

    // Circular swirling rings, spinning from the blast edge down to the
    // core (same violet color layers as the old black hole, just flattened
    // from tilted ellipses into plain spinning circles for a top-down vortex).
    if (_gfxLevel < 3) {
        const _t = now / 1000;
        const _ringCount = _gfxLevel < 1 ? 6 : 4;
        const _layerColors = [[60, 0, 110], [130, 0, 200], [190, 40, 255], [230, 120, 255]];
        for (let i = 0; i < _ringCount; i++) {
            const frac = i / (_ringCount - 1); // 0 = blast edge, 1 = core
            const ringR = r * 1.3 + (outerR - r * 1.3) * (1 - frac);
            const spin = (i % 2 === 0 ? 1 : -1) * (0.25 + frac * 0.6);
            const c = _layerColors[Math.min(_layerColors.length - 1, Math.floor(frac * _layerColors.length))];
            ctx.save();
            ctx.rotate(_t * spin);
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.75 - frac * 0.15})`;
            ctx.lineWidth = 4 + frac * 7;
            if (!_mobPerf) { ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 18; }
            ctx.setLineDash([ringR * 0.5, ringR * 0.35]);
            ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    // Infalling matter, spiraling in from the blast edge toward the core
    if (_gfxLevel < 1) {
        for (let i = 0; i < 16; i++) {
            const phase = ((now / 1400 + i / 16) % 1 + 1) % 1;
            const dist = r * 1.2 + (outerR - r * 1.2) * (1 - phase);
            const pAngle = (i / 16) * Math.PI * 2 + phase * 4.5;
            const px = Math.cos(pAngle) * dist;
            const py = Math.sin(pAngle) * dist;
            const pA = Math.min(1, phase * 1.6) * 0.9;
            const pR = Math.max(1, 1.6 + phase * 2);
            ctx.fillStyle = `rgba(230,170,255,${pA})`;
            if (!_mobPerf) { ctx.shadowColor = '#e0aaff'; ctx.shadowBlur = 6; }
            ctx.beginPath(); ctx.arc(px, py, pR, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // Event horizon: wobbling boundary on HIGH, plain circle otherwise
    const _ehWobble = _gfxLevel < 1 ? 0.08 : 0;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * (1 + _ehWobble));
    grad.addColorStop(0, 'black');
    grad.addColorStop(0.36, '#1a0030');
    grad.addColorStop(0.68, 'purple');
    grad.addColorStop(1, 'rgba(80,0,80,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (_gfxLevel < 1) {
        const _ehT = now / 1000;
        const _seg = 48;
        for (let i = 0; i <= _seg; i++) {
            const a = (i / _seg) * Math.PI * 2;
            const w = 1
                + Math.sin(a * 3 + _ehT * 1.10) * 0.028
                + Math.sin(a * 5 + _ehT * 0.73 + 1.40) * 0.018
                + Math.sin(a * 2 + _ehT * 0.51 + 0.70) * 0.022;
            const rr = r * w;
            i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
    } else {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // Photon sphere, tinted with the state color (cyan -> red)
    if (_gfxLevel < 3) {
        const _psP = _gfxLevel < 1 ? (0.70 + 0.30 * Math.sin(now / 700)) : _gfxLevel < 2 ? 0.60 : 0.30;
        const psG = ctx.createRadialGradient(0, 0, r * 0.88, 0, 0, r * 1.05);
        psG.addColorStop(0, 'rgba(0,0,0,0)');
        psG.addColorStop(0.35, `rgba(${eR + 60},${eG + 20},${eB},${0.45 * _psP})`);
        psG.addColorStop(0.62, `rgba(255,255,255,${0.7 * _psP})`);
        psG.addColorStop(1, `rgba(${eR},${eG},${eB},0)`);
        ctx.fillStyle = psG;
        if (!_mobPerf) { ctx.shadowColor = echoColor; ctx.shadowBlur = _gfxLevel < 1 ? 20 : 10; }
        ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Vòng nét đứt cảnh báo vùng nổ (hiện trước khi nổ trong giai đoạn charging)
    if (isCharging) {
        const warnA = 0.18 + chargeProg * 0.55;
        ctx.save();
        ctx.globalAlpha = warnA;
        ctx.strokeStyle = `rgba(255,${Math.round(80 - chargeProg * 80)},${Math.round(80 - chargeProg * 80)},1)`;
        ctx.lineWidth = 1.8;
        if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8 + chargeProg * 12; }
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -(now / 70) % 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, VEIL_ECHO_BLAST_RADIUS, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Timer bar
    const bw = enemy.size, bh = 4;
    const bx = enemy.x - bw / 2, by = enemy.y - enemy.size / 2 - 12;
    const timeLeft = Math.max(0, 5000 - (enemy.echoTimer || 0));
    ctx.fillStyle = '#330011'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = isCharging ? '#ff3300' : '#cc44ff';
    ctx.fillRect(bx, by, bw * (timeLeft / 5000), bh);
    ctx.strokeStyle = 'rgba(200,80,255,0.6)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffffff'; ctx.font = '10px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(`ECHO ${(timeLeft / 1000).toFixed(1)}s`, enemy.x, by - 1);
}

// VEILSHROUD EFFECTS: lightning + explosion zones
function _drawVeilshroudEffects() {
    const now = performance.now();

    // Pending Void Strike rings (host đã chết nhưng sét chưa ra)
    if (window._veilshroudPendingStrikes && window._veilshroudPendingStrikes.length > 0) {
        for (const ps of window._veilshroudPendingStrikes) {
            const prog = Math.min(1, ps.countdown / ps.duration); // 0→1
            const tx = ps.targetX, ty = ps.targetY;
            ctx.save();
            // Radial fill
            if (prog > 0.01) {
                const fg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 100);
                fg.addColorStop(0, `rgba(255,34,51,${0.28 * prog})`);
                fg.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(tx, ty, 100, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 0.35 + prog * 0.65;
            ctx.strokeStyle = '#ff2233';
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 10; }
            ctx.setLineDash([8, 5]);
            ctx.beginPath(); ctx.arc(tx, ty, 100, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Apostle spawn telegraphs: a solid dark patch pooling at the exact
    // spot, growing and brightening its rim right up until the apostle appears.
    if (window._veilshroudPendingApostles && window._veilshroudPendingApostles.length > 0) {
        for (const pa of window._veilshroudPendingApostles) {
            const prog = 1 - Math.max(0, pa.countdown) / pa.duration; // 0→1
            const rr = pa.size * (0.75 + prog * 0.55);
            const pulse = 0.85 + 0.15 * Math.sin(now / 90);
            ctx.save();
            const pg = ctx.createRadialGradient(pa.x, pa.y, 0, pa.x, pa.y, rr);
            pg.addColorStop(0, `rgba(5,0,12,${0.9 * pulse})`);
            pg.addColorStop(0.7, `rgba(15,0,30,${0.7 * pulse})`);
            pg.addColorStop(1, 'rgba(15,0,30,0)');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(pa.x, pa.y, rr, 0, Math.PI * 2); ctx.fill();

            ctx.globalAlpha = 0.5 + prog * 0.5;
            ctx.strokeStyle = '#cc66ff';
            ctx.lineWidth = 2 + prog * 1.5;
            if (!_mobPerf) { ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 14; }
            ctx.setLineDash([6, 4]);
            ctx.lineDashOffset = -(now / 50) % 10;
            ctx.beginPath(); ctx.arc(pa.x, pa.y, rr, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Active lightning strikes
    if (window._veilshroudLightnings) {
        for (const lt of window._veilshroudLightnings) {
            const prog = Math.min(1, lt.life / lt.maxLife);
            const alpha = prog;

            // Main bolt re-randomizes every frame → flickering lightning (matches guide behavior)
            const _ltMain  = _genBoltPoints(lt.x, 0, lt.x, lt.y, 7, 32);
            const _ltOuter = _genBoltPoints(lt.x, 0, lt.x, lt.y, 5, 42);
            // Sub-bolt paths to locked target positions: cached (no need to re-random)
            if (!lt._paths) {
                lt._paths = {
                    subs:  (lt.hitSentinelPositions || []).map(pos => ({
                        white: _genBoltPoints(lt.x, lt.y, pos.x, pos.y, 3, 14),
                        red:   _genBoltPoints(lt.x, lt.y, pos.x, pos.y, 2, 20),
                    })),
                    player: (lt.hitPlayer && lt.playerHitPos)
                        ? _genBoltPoints(lt.x, lt.y, lt.playerHitPos.x, lt.playerHitPos.y, 3, 18)
                        : null,
                };
            }

            ctx.save();

            // Outer shockwave circle
            const waveR = lt.strikeRadius * (1.3 - prog * 0.3);
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#ff2233';
            ctx.lineWidth = 3 + prog * 5;
            if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 20; }
            ctx.beginPath(); ctx.arc(lt.x, lt.y, waveR, 0, Math.PI * 2); ctx.stroke();

            // Main white bolt (re-randomized each frame → flickers)
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * prog;
            if (!_mobPerf) { ctx.shadowColor = '#ff2233'; ctx.shadowBlur = 22; }
            _strokeBoltPath(ctx, _ltMain);

            // Outer red bolt (re-randomized each frame → flickers)
            ctx.strokeStyle = `rgba(255,30,50,${alpha * 0.65})`;
            ctx.lineWidth = 7 * prog;
            _strokeBoltPath(ctx, _ltOuter);

            // Branch bolts off main bolt (HIGH quality, adds visual richness)
            if (!_mobPerf && _gfxLevel < 1 && alpha > 0.25) {
                ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 10;
                for (let _b = 0; _b < 4; _b++) {
                    const _bSrc = _ltMain[1 + Math.floor((_ltMain.length - 2) * (_b + 0.5) / 4)];
                    const _bSide = (_b % 2 === 0 ? 1 : -1);
                    const _bAng  = Math.PI * 0.5 + _bSide * (0.35 + Math.random() * 0.55);
                    const _bLen  = (20 + Math.random() * 35) * prog;
                    ctx.strokeStyle = `rgba(255,${50 + _b * 25},${60 + _b * 15},${alpha * 0.55})`;
                    ctx.lineWidth = (2.2 - _b * 0.3) * prog;
                    ctx.beginPath(); ctx.moveTo(_bSrc[0], _bSrc[1]);
                    let _bx = _bSrc[0], _by = _bSrc[1];
                    for (let _s = 0; _s < 3; _s++) {
                        const _sAng = _bAng + (Math.random() - 0.5) * 0.6;
                        _bx += Math.cos(_sAng) * _bLen / 3;
                        _by += Math.sin(_sAng) * _bLen / 3;
                        ctx.lineTo(_bx, _by);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Secondary bolts & impact rings at hit targets
            if (lt._paths.subs && lt._paths.subs.length > 0) {
                for (let _si = 0; _si < lt._paths.subs.length; _si++) {
                    const pos = lt.hitSentinelPositions[_si];
                    const sub = lt._paths.subs[_si];
                    // Sub-bolt từ điểm strike → sentinel
                    ctx.globalAlpha = alpha * 0.9;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.5 * prog;
                    if (!_mobPerf) { ctx.shadowColor = '#ff1133'; ctx.shadowBlur = 14; }
                    _strokeBoltPath(ctx, sub.white);
                    ctx.strokeStyle = `rgba(255,20,50,${alpha * 0.7})`;
                    ctx.lineWidth = 5 * prog;
                    _strokeBoltPath(ctx, sub.red);

                    // Impact ring mở rộng tại sentinel
                    ctx.globalAlpha = alpha * 0.85;
                    ctx.strokeStyle = '#ff2233';
                    ctx.lineWidth = 2.5;
                    if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 16; }
                    const ir = 20 + (1 - prog) * 35;
                    ctx.beginPath(); ctx.arc(pos.x, pos.y, ir, 0, Math.PI * 2); ctx.stroke();
                    ctx.globalAlpha = alpha * 0.4;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.arc(pos.x, pos.y, ir * 0.6, 0, Math.PI * 2); ctx.stroke();
                }
            }
            if (lt._paths.player) {
                const pp = lt.playerHitPos;
                // Sub-bolt → player (cached path)
                ctx.globalAlpha = alpha * 0.9;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3 * prog;
                if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 18; }
                _strokeBoltPath(ctx, lt._paths.player);
                // Impact ring mở rộng tại player
                ctx.globalAlpha = alpha * 0.9;
                ctx.strokeStyle = '#ff0022';
                ctx.lineWidth = 3;
                const pr = 25 + (1 - prog) * 45;
                ctx.beginPath(); ctx.arc(pp.x, pp.y, pr, 0, Math.PI * 2); ctx.stroke();
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Echo explosion zones
    if (window._veilshroudExplosions) {
        for (const ez of window._veilshroudExplosions) {
            const prog = ez.life / ez.maxLife; // 1→0
            ctx.save();

            // Solid boundary ring
            ctx.globalAlpha = prog * 0.9;
            ctx.strokeStyle = `rgba(180,40,255,${prog})`;
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(ez.x, ez.y, ez.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;

            // Dashed overlay
            ctx.globalAlpha = prog * 0.7;
            ctx.strokeStyle = `rgba(255,160,255,${prog * 0.9})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([10, 7]);
            ctx.lineDashOffset = -(now / 80) % 17;
            ctx.beginPath(); ctx.arc(ez.x, ez.y, ez.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;

            ctx.restore();

            // Shockwave from the collapse: a fast white flash ring right at
            // the moment of the burst, followed by a slower, bigger violet
            // ring that outruns the zone's own boundary before fading.
            const swAge = ez._shockwaveAge || 0;
            if (swAge < 250) {
                const flashT = swAge / 250;
                ctx.save();
                ctx.globalAlpha = (1 - flashT) * 0.95;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 8 * (1 - flashT) + 2;
                if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 24; }
                ctx.beginPath(); ctx.arc(ez.x, ez.y, ez.radius * (0.1 + flashT * 0.5), 0, Math.PI * 2); ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
            if (swAge < 700) {
                const swT = swAge / 700;
                ctx.save();
                ctx.globalAlpha = (1 - swT) * 0.85;
                ctx.strokeStyle = '#e0aaff';
                ctx.lineWidth = 7 * (1 - swT) + 2;
                if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 22; }
                ctx.beginPath(); ctx.arc(ez.x, ez.y, ez.radius * (0.15 + swT * 1.15), 0, Math.PI * 2); ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }
    }
}

// Helper: generate zigzag bolt points (call once, cache result)
