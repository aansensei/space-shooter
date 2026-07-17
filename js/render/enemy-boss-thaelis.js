// render/enemy-boss-thaelis.js — extracted from render.js (Apostle/Thaelis boss
// visuals). Calls drawPolygon() from fx.js.

function _drawBossOrThaelis(enemy) {
    const now = performance.now();
    const isBoss = enemy.type === 'dargruel';

    // Thaelis keeps old render
    if (!isBoss) {
        const rotSpeed = 3000;
        const rotation = now / rotSpeed;
        const color1 = '#FFD700';
        const color2 = '#FFA500';
        const r = enemy.size / 2;

        const haloAlpha = 0.15 + 0.1 * Math.abs(Math.sin(now / 400));
        ctx.save();
        ctx.fillStyle = `rgba(255,200,0,${haloAlpha})`;
        if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        drawPolygon(enemy.x, enemy.y, r, 8, rotation, color1, color2);
        ctx.save(); ctx.globalAlpha = 0.55;
        drawPolygon(enemy.x, enemy.y, r * 0.55, 8, -rotation * 1.3, color2, color1);
        ctx.restore();
        ctx.save();
        const cg = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, r * 0.28);
        cg.addColorStop(0, 'white'); cg.addColorStop(0.5, color1); cg.addColorStop(1, color2);
        ctx.fillStyle = cg;
        if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        const hpPct2 = enemy.hp / enemy.maxHp;
        if (hpPct2 < 0.6) {
            const pulse2 = Math.abs(Math.sin(now / 180)) * 10;
            ctx.save(); ctx.fillStyle = `rgba(255,215,0,0.22)`;
            if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 25;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 12 + pulse2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ctx.save();
        const orbitR2 = r + 18;
        if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.fillStyle = color1;
        for (let i = 0; i < 6; i++) {
            const a = rotation * 1.5 + (i / 6) * Math.PI * 2;
            ctx.beginPath(); ctx.arc(enemy.x + Math.cos(a) * orbitR2, enemy.y + Math.sin(a) * orbitR2, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Tenacity Barrier ring, lớp khiên riêng, hiển thị bên ngoài Thaelis
        if ((enemy._tenacityBarrier || 0) > 0) {
            const _bMax = enemy._tenacityBarrierMax || enemy._tenacityBarrier;
            const _bFrac = enemy._tenacityBarrier / _bMax;
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

        return;
    }

    // NEW DARGRUEL DESIGN
    const r = enemy.size / 2;
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // 1. Abyss aura (outer glow)
    ctx.fillStyle = `rgba(138,43,226,${0.12 + 0.08 * pulse})`;
    if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 25; }
    ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Maître Suprême shield ring, scales with sentinel count
    const activeSentinels = typeof sentinels !== 'undefined' ? sentinels.length : 0;
    if (activeSentinels > 0) {
        const drLevel = Math.min(activeSentinels, 18);
        ctx.save();
        ctx.rotate(now / 1200);
        ctx.strokeStyle = `rgba(180,0,255,${0.3 + 0.03 * drLevel})`;
        ctx.lineWidth = 2 + drLevel * 0.15;
        ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // 3. Main octagon body
    const rot = now / 3500;
    ctx.rotate(rot);
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    bodyGrad.addColorStop(0, '#15002a');
    bodyGrad.addColorStop(0.7, '#2d004d');
    bodyGrad.addColorStop(1, '#0d001a');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#6a0dad';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // 4. Counter-rotating inner octagon + veins
    ctx.save();
    ctx.rotate(-rot * 2.5);
    ctx.strokeStyle = '#8A2BE2'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        i === 0 ? ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75)
            : ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
    }
    ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(138,43,226,0.4)';
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
        ctx.lineTo(Math.cos(a + Math.PI) * r * 0.75, Math.sin(a + Math.PI) * r * 0.75);
        ctx.stroke();
    }
    ctx.restore();

    // 5. Cosmic Eye — galaxy vortex that drifts toward the player
    const coreR = r * 0.35;
    const _screenAngle = (typeof player !== 'undefined' && player)
        ? Math.atan2(player.y - enemy.y, player.x - enemy.x) : 0;
    const _localAngle = _screenAngle - rot;
    const _dX = Math.cos(_localAngle) * coreR * 0.17;
    const _dY = Math.sin(_localAngle) * coreR * 0.17;
    const _galaxyRot = now / 2000;
    const _framePulse = 0.75 + 0.25 * Math.sin(now / 280);

    if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 22; }
    const _aG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 1.6);
    _aG.addColorStop(0, 'rgba(120,30,200,0.5)');
    _aG.addColorStop(1, 'rgba(60,0,100,0)');
    ctx.fillStyle = _aG;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Clip to circle; fill deep space background
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    const _bgG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    _bgG.addColorStop(0, '#1e0040');
    _bgG.addColorStop(0.5, '#0d0022');
    _bgG.addColorStop(1, '#04000c');
    ctx.fillStyle = _bgG; ctx.fill(); ctx.clip();

    // Galaxy spiral arms
    ctx.save();
    ctx.translate(_dX, _dY); ctx.rotate(_galaxyRot);
    for (let _arm = 0; _arm < 3; _arm++) {
        ctx.save(); ctx.rotate((_arm / 3) * Math.PI * 2);
        for (let _seg = 1; _seg <= 8; _seg++) {
            ctx.strokeStyle = `rgba(210,140,255,${Math.max(0, 0.52 - _seg * 0.055)})`;
            ctx.lineWidth = Math.max(0.5, coreR * 0.08 - _seg * 0.5);
            const _sA = _seg * 0.22;
            ctx.beginPath(); ctx.arc(0, 0, coreR * _seg * 0.1, _sA, _sA + 0.5); ctx.stroke();
        }
        ctx.restore();
    }
    if (!_mobPerf) {
        for (let _s = 0; _s < 16; _s++) {
            const _sAng = (_s / 16) * Math.PI * 2 + _galaxyRot * 0.3;
            const _sR = coreR * (0.1 + (_s % 5) * 0.15);
            ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(now / 380 + _s * 1.7))})`;
            ctx.beginPath();
            ctx.arc(Math.cos(_sAng) * _sR, Math.sin(_sAng) * _sR, 0.6 + (_s % 3) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Pupil — soft glow halo then hard bright center
    if (!_mobPerf) { ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 14; }
    const _coreG = ctx.createRadialGradient(_dX, _dY, 0, _dX, _dY, coreR * 0.38);
    _coreG.addColorStop(0, 'rgba(255,255,255,1)');
    _coreG.addColorStop(0.3, 'rgba(200,120,255,0.8)');
    _coreG.addColorStop(0.7, 'rgba(100,0,200,0.35)');
    _coreG.addColorStop(1, 'rgba(60,0,140,0)');
    ctx.fillStyle = _coreG;
    ctx.beginPath(); ctx.arc(_dX, _dY, coreR * 0.38, 0, Math.PI * 2); ctx.fill();
    // Hard white dot
    if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18; }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(_dX, _dY, coreR * 0.10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore(); // end clip

    // Ornate frame rings
    if (!_mobPerf) { ctx.shadowColor = '#bb55ff'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = `rgba(185,95,255,${_framePulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(140,55,220,${_framePulse * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 0.87, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Cardinal tick marks on frame
    for (let _i = 0; _i < 8; _i++) {
        const _a = (_i / 8) * Math.PI * 2, _card = _i % 2 === 0;
        ctx.strokeStyle = `rgba(200,110,255,${_framePulse * (_card ? 0.9 : 0.45)})`;
        ctx.lineWidth = _card ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(_a) * coreR * (_card ? 0.9 : 0.93), Math.sin(_a) * coreR * (_card ? 0.9 : 0.93));
        ctx.lineTo(Math.cos(_a) * coreR * (_card ? 1.1 : 1.05), Math.sin(_a) * coreR * (_card ? 1.1 : 1.05));
        ctx.stroke();
    }

    // 5.5 Four directional triangles
    ctx.save();
    ctx.rotate(now / 2500);
    const triDist = coreR + 8, triSize = 14, triWidth = 12;
    const triPulse = 0.6 + 0.4 * Math.sin(now / 100);
    ctx.fillStyle = `rgba(223,136,255,${triPulse})`;
    if (!_mobPerf) { ctx.shadowColor = '#df88ff'; ctx.shadowBlur = 10; }
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.translate(triDist, 0);
        ctx.beginPath();
        ctx.moveTo(triSize, 0);
        ctx.lineTo(0, -triWidth / 2);
        ctx.lineTo(0, triWidth / 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. Chain nodes (4 ports)
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const px = Math.cos(a) * r * 0.88, py = Math.sin(a) * r * 0.88;
        ctx.fillStyle = '#07001a'; ctx.strokeStyle = '#9900ff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(223,136,255,${0.6 + 0.4 * pulse})`;
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // Low HP energy crackle
    const hpPct = enemy.hp / enemy.maxHp;
    if (hpPct < 0.4) {
        const crackleCount = Math.floor((1 - hpPct / 0.4) * 4) + 2;
        for (let c = 0; c < crackleCount; c++) {
            const a0 = (now / 180 + c * Math.PI * 2 / crackleCount) % (Math.PI * 2);
            const a1 = a0 + 0.4 + Math.sin(now / 90 + c) * 0.2;
            const cr = r + 8 + Math.sin(now / 120 + c * 1.7) * 4;
            ctx.strokeStyle = `rgba(255,80,255,${0.6 + 0.4 * Math.sin(now / 80 + c)})`;
            ctx.lineWidth = 1;
            if (!_mobPerf) { ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(0, 0, cr, a0, a1); ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}


