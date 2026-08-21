// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/enemy-veilshroud.js — extracted from render.js (base body, echo clone,
// lightning-strike/echo-explosion effects). Calls _genBoltPoints/_strokeBoltPath
// from fx.js.

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
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + t * 0.4})`;
    ctx.setLineDash([9, 13]);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.48, -now / 800 + Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

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

function _drawVeilshroudEcho(enemy) {
    const now = performance.now();
    const echoT = enemy.echoTimer || 0;
    const r = enemy.size / 2;

    // Mức độ "charging" (3–5s: echo chuyển sang đỏ rực, sắp nổ)
    const isCharging = echoT >= 3000;
    const chargeProg = isCharging ? Math.min(1, (echoT - 3000) / 2000) : 0;

    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(now / 180 + enemy.x * 0.03));
    const alpha = isCharging ? (0.5 + chargeProg * 0.4) : (0.5 + pulse * 0.3);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha = alpha;

    // Màu: cyan → đỏ khi charging
    const eR = Math.round(200 * chargeProg);
    const eG = Math.round(240 - 240 * chargeProg);
    const eB = Math.round(255 - 200 * chargeProg);
    const echoColor = `rgb(${eR},${eG},${eB})`;

    // Aura mờ
    const aG = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 3);
    aG.addColorStop(0, `rgba(${eR},${eG},${eB},0.12)`);
    aG.addColorStop(1, 'transparent');
    ctx.fillStyle = aG;
    ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, Math.PI * 2); ctx.fill();

    // Floating shards (wireframe / khung dây)
    ctx.strokeStyle = `rgba(${eR},${eG},${eB},0.55)`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf) { ctx.shadowColor = echoColor; ctx.shadowBlur = 8; }
    const float = Math.sin(now / 700) * 6;
    const crystalShards = [
        [[0, -r * 1.65 - float], [r * 0.55, -r * 0.5 - float * 0.5], [0, -r * 0.2], [-r * 0.55, -r * 0.5 - float * 0.5]],
        [[0, r * 1.45 + float], [r * 0.45, r * 0.42 + float * 0.5], [0, r * 0.12], [-r * 0.45, r * 0.42 + float * 0.5]],
        [[-r * 1.35 - float, 0], [-r * 0.48, -r * 0.28], [-r * 0.22, 0], [-r * 0.48, r * 0.28]],
        [[r * 1.35 + float, 0], [r * 0.48, -r * 0.28], [r * 0.22, 0], [r * 0.48, r * 0.28]],
    ];
    crystalShards.forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
        ctx.closePath(); ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Lõi đỏ rực (charging phase)
    if (isCharging) {
        if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20 + chargeProg * 40; }
        ctx.fillStyle = `rgba(255,0,0,${chargeProg * 0.7})`;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.35 + chargeProg * r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Lõi trung tâm (event horizon mờ)
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = echoColor;
    ctx.save();
    ctx.rotate(now / 1400);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.1, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Vết nứt đỏ (charging phase)
    if (isCharging) {
        ctx.strokeStyle = `rgba(255,50,50,${chargeProg * 0.75})`;
        ctx.lineWidth = 1.5;
        for (let ci = 0; ci < 5; ci++) {
            ctx.save();
            ctx.rotate((ci / 5) * Math.PI * 2 + now / 2000);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(r * 0.45, r * 0.22);
            ctx.lineTo(r * 0.9, -r * 0.1);
            ctx.lineTo(r * 1.5, r * 0.32);
            ctx.stroke();
            ctx.restore();
        }
    }

    ctx.restore();

    // Vòng nét đứt 300px cảnh báo vùng nổ (hiện trước khi nổ trong giai đoạn charging)
    if (isCharging) {
        const warnA = 0.18 + chargeProg * 0.55;
        ctx.save();
        ctx.globalAlpha = warnA;
        ctx.strokeStyle = `rgba(255,${Math.round(80 - chargeProg * 80)},${Math.round(80 - chargeProg * 80)},1)`;
        ctx.lineWidth = 1.8;
        if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8 + chargeProg * 12; }
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -(now / 70) % 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 300, 0, Math.PI * 2); ctx.stroke();
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
        }
    }
}

// Helper: generate zigzag bolt points (call once, cache result)
