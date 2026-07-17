// render/enemy-marchosias.js — extracted from render.js (main body, minion,
// death-sword blade). Three separate ranges in the original file, reassembled here.

function _drawMarchosias(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Outer pulsing aura
    const haloA = 0.12 + 0.06 * Math.sin(now / 350);
    ctx.fillStyle = `rgba(0,255,120,${haloA})`;
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Hexagon body (6-sided like ref image)
    ctx.strokeStyle = '#00cc66'; ctx.lineWidth = 2;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Inner triangle frame (structural lines from center to alternating vertices)
    ctx.strokeStyle = 'rgba(0,200,100,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
    }

    // Rotating gear-teeth ring
    ctx.save();
    ctx.rotate(now / 2500);
    ctx.strokeStyle = 'rgba(0,180,80,0.6)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
        ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
        ctx.stroke();
    }
    ctx.restore();

    // Core gem, green glowing orb
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, '#00ff88');
    coreGrad.addColorStop(1, '#006633');
    ctx.fillStyle = coreGrad;
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Panel detail rectangles (from ref image)
    ctx.strokeStyle = 'rgba(0,220,100,0.4)'; ctx.lineWidth = 1;
    const panelW = r * 0.35, panelH = r * 0.18;
    [[-r * 0.55, 0], [r * 0.55, 0], [0, -r * 0.55], [0, r * 0.55]].forEach(([px, py]) => {
        ctx.strokeRect(px - panelW / 2, py - panelH / 2, panelW, panelH);
    });

    // NEW: rage shimmer at low HP
    const marHpPct = enemy.hp / enemy.maxHp;
    if (marHpPct < 0.3) {
        ctx.save();
        ctx.translate(0, 0);
        const rageCount = 5;
        const rageAlpha = (0.3 - marHpPct) / 0.3;
        for (let ri = 0; ri < rageCount; ri++) {
            const ra = (now / 300 + ri * Math.PI * 2 / rageCount);
            const rd = r * 0.85 + Math.sin(now / 130 + ri * 1.3) * r * 0.2;
            ctx.fillStyle = `rgba(0,255,140,${rageAlpha * (0.5 + 0.5 * Math.sin(now / 80 + ri))})`;
            if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(Math.cos(ra) * rd, Math.sin(ra) * rd, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();

    // ARC BARRIER revive countdown ring
    if (enemy._arcBarrierReviveAt && (!enemy.arcBarrier || enemy.arcBarrier.hp <= 0)) {
        const _reviveRemain = Math.max(0, enemy._arcBarrierReviveAt - gameElapsedTime);
        const _reviveProg = 1 - _reviveRemain / (enemy._arcBarrierReviveDuration || 5000);
        ctx.save();
        ctx.strokeStyle = `rgba(0,255,136,${0.15 + 0.1 * Math.sin(now / 200)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * _reviveProg);
        ctx.stroke();
        ctx.restore();
    }

    // ARC BARRIER (¼ circle arc, rotates around Marchosias)
    if (enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
        const shieldR = r + 16;
        const sa = enemy.arcBarrier.angle - Math.PI / 4;
        const ea = enemy.arcBarrier.angle + Math.PI / 4;
        const shieldPct = enemy.arcBarrier.hp / enemy.arcBarrier.maxHp;

        ctx.save();
        // Outer glow
        ctx.strokeStyle = `rgba(0,255,136,${0.3 + shieldPct * 0.3})`;
        ctx.lineWidth = 14;
        if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR, sa, ea); ctx.stroke();

        // Main arc bright
        ctx.strokeStyle = `rgba(160,255,200,${0.7 + shieldPct * 0.25})`;
        ctx.lineWidth = 5;
        if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR, sa, ea); ctx.stroke();

        // Inner bright edge
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR - 4, sa, ea); ctx.stroke();

        // Sparkling particles at arc tips
        for (let tip = 0; tip < 2; tip++) {
            const tipA = tip === 0 ? sa : ea;
            const tx2 = enemy.x + Math.cos(tipA) * shieldR;
            const ty2 = enemy.y + Math.sin(tipA) * shieldR;
            for (let s = 0; s < 2; s++) {
                const sA = tipA + (s - 0.5) * 0.5 + Math.sin(now / 90 + s) * 0.2;
                const sLen = 5 + 3 * Math.abs(Math.sin(now / 80 + s));
                ctx.strokeStyle = `rgba(180,255,180,${0.6 + 0.4 * Math.sin(now / 70 + s)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tx2, ty2);
                ctx.lineTo(tx2 + Math.cos(sA) * sLen, ty2 + Math.sin(sA) * sLen);
                ctx.stroke();
            }
        }

        // Arc shield HP bar
        const bw = 50, bh = 4;
        const bx = enemy.x - bw / 2, by = enemy.y - r - 30;
        ctx.fillStyle = '#003322'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#00ff88'; ctx.fillRect(bx, by, bw * shieldPct, bh);
        ctx.strokeStyle = '#00cc66'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#00ff88'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('BARRIER', enemy.x, by - 2);

        ctx.restore();
    }

    // HP bar
    const bw2 = enemy.size * 0.9, bh2 = 6;
    const bx2 = enemy.x - bw2 / 2, by2 = enemy.y - r - 12;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx2 - 1, by2 - 1, bw2 + 2, bh2 + 2);
    ctx.fillStyle = '#222'; ctx.fillRect(bx2, by2, bw2, bh2);
    const hpPct = enemy.hp / enemy.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffaa00' : '#ff3300';
    ctx.fillRect(bx2, by2, bw2 * hpPct, bh2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.strokeRect(bx2, by2, bw2, bh2);
}

// Marchosias Minion (Robot Mini)
// Vulnerability Icon (Trọng Thương)
// Thiết kế dựa theo HTML reference: trái tim kim loại bị chẻ + dấu X neon đỏ

function _drawMarchosiasMinion(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Blink ring to signal presence (strobe)
    const _blinkA = 0.55 + 0.45 * Math.abs(Math.sin(now / 220));
    if (_blinkA > 0.85) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,136,${(_blinkA - 0.85) * 3.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Triangular body (from ref image, image 4 small triangle robots)
    const pulse = 0.8 + 0.2 * Math.sin(now / 200);
    ctx.fillStyle = '#0d1f17';
    ctx.strokeStyle = `rgba(0,200,80,${pulse * _blinkA})`;
    ctx.lineWidth = 1.8;
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.87, r * 0.5);
    ctx.lineTo(-r * 0.87, r * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner glow core
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.38);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.5, '#00ff88');
    cg.addColorStop(1, 'rgba(0,100,50,0.4)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.fill();

    // NEW: 3 orbiting micro-dots
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(0,255,136,0.9)';
    for (let d = 0; d < 3; d++) {
        const da = (now / 600 + d * Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.arc(Math.cos(da) * r * 0.68, Math.sin(da) * r * 0.68, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.restore();
}

// Leviathan, Dominator Class

function _drawMarchoBlade(blade) {
    const now = performance.now();
    ctx.save();
    const angle = blade.active ? Math.atan2(blade.vy, blade.vx) : blade.angle;

    // WARNING PHASE: cùng style với windup corridor / ghost
    if (!blade.active) {
        const halfW = 36;
        // Dùng targetX/Y nếu có (blade từ death-convert), không thì dùng len cố định
        const warnLen = (blade.targetX != null)
            ? Math.hypot(blade.targetX - blade.originX, blade.targetY - blade.originY) + 80
            : 500;

        ctx.translate(blade.originX, blade.originY);
        ctx.rotate(angle);
        ctx.globalAlpha = 0.9;

        // Fill nền cam, giống windup corridor
        ctx.fillStyle = 'rgba(255,140,0,0.45)';
        ctx.fillRect(0, -halfW, warnLen, halfW * 2);

        // Đường giữa nét đứt
        ctx.strokeStyle = 'rgba(255,220,120,0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([14, 8]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(warnLen, 0); ctx.stroke();
        ctx.setLineDash([]);

        // Edge lines nét đứt sáng
        ctx.strokeStyle = 'rgba(255,210,0,0.92)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -halfW); ctx.lineTo(warnLen, -halfW);
        ctx.moveTo(0, halfW);  ctx.lineTo(warnLen, halfW);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
        return;
    }

    // ACTIVE PHASE: vẽ blade arc
    const sa = angle - Math.PI / 2, ea = angle + Math.PI / 2;

    // Outer corridor edges: persist on the blade until last 15% of screen
    if (blade.y < canvas.height * 0.85 && blade.originX != null) {
        const halfW = 36;
        const corrLen = (blade.targetX != null)
            ? Math.hypot(blade.targetX - blade.originX, blade.targetY - blade.originY) + 80
            : Math.hypot(blade.x - blade.originX, blade.y - blade.originY) + 200;
        ctx.save();
        ctx.translate(blade.originX, blade.originY);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(255,210,0,0.85)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -halfW); ctx.lineTo(corrLen, -halfW);
        ctx.moveTo(0, halfW);  ctx.lineTo(corrLen, halfW);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Launch aura: brief energy burst at origin when blade fires
    if (blade._fireTime && now - blade._fireTime < 320) {
        const elapsed = now - blade._fireTime;
        const prog = elapsed / 320;
        const burstAlpha = (1 - prog) * 0.9;
        const burstR = 12 + prog * 52;
        ctx.save();
        if (!_mobPerf) { ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 18; }
        ctx.globalAlpha = burstAlpha;
        ctx.strokeStyle = 'rgba(255,190,50,0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(blade.originX, blade.originY, burstR, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = burstAlpha * 0.45;
        ctx.fillStyle = 'rgba(255,210,100,0.7)';
        ctx.beginPath(); ctx.arc(blade.originX, blade.originY, burstR * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Outer orange-red glow
    ctx.strokeStyle = 'rgba(255,80,0,0.35)';
    ctx.lineWidth = 18;
    if (!_mobPerf) ctx.shadowColor = 'rgba(255,120,0,0.6)'; if (!_mobPerf) ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius, sa, ea); ctx.stroke();

    // Main orange arc
    ctx.strokeStyle = 'rgba(255,140,30,0.95)';
    ctx.lineWidth = 5;
    if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius, sa, ea); ctx.stroke();

    // Bright inner edge
    ctx.strokeStyle = 'rgba(255,230,180,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius - 3, sa, ea); ctx.stroke();

    // Energy slash marks
    ctx.strokeStyle = `rgba(255,200,100,${0.5 + 0.4 * Math.sin(now / 60)})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const slashA = sa + (ea - sa) * ((i + 1) / 4);
        const px1 = blade.x + Math.cos(slashA) * (blade.radius - 10);
        const py1 = blade.y + Math.sin(slashA) * (blade.radius - 10);
        const px2 = blade.x + Math.cos(slashA) * (blade.radius + 10);
        const py2 = blade.y + Math.sin(slashA) * (blade.radius + 10);
        ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
    }

    ctx.restore();
}

