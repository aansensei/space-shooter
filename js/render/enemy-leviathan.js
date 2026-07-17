// render/enemy-leviathan.js — extracted from render.js. _drawLeviathanEffects
// (standalone death-laser/perseverance-sweep fx, survives enemy death) sits far
// from _drawLeviathan in the original file; reassembled together here.

// Aegis lasers
// Leviathan standalone effects (survive enemy death)
function _drawLeviathanEffects() {
    const now = performance.now();
    const len = Math.hypot(canvas.width, canvas.height) * 1.5;

    // Perseverance charge warning (full circle spin, báo hiệu quét 360°)
    enemies.forEach(e => {
        if (e.type !== 'leviathan') return;
        if (!e.perseveranceCharging) return;

        const prog = Math.min(1, (now - e.perseveranceChargeStart) / 1000);
        const glowColor = '#ff0000';

        ctx.save();
        ctx.translate(e.x, e.y);

        // Full circle warning pulse, expanding ring
        ctx.globalAlpha = prog * 0.25;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3 + prog * 8;
        if (!_mobPerf) ctx.shadowColor = glowColor; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, e.size * (0.6 + prog * 1.4), 0, Math.PI * 2); ctx.stroke();

        // Spinning dashes
        ctx.globalAlpha = prog * 0.5;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.save(); ctx.rotate(now / 300);
        ctx.beginPath(); ctx.arc(0, 0, e.size * 0.8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        // Core glow
        ctx.globalAlpha = prog * 0.8;
        if (!_mobPerf) ctx.shadowColor = glowColor; if (!_mobPerf) ctx.shadowBlur = 40;
        ctx.fillStyle = 'rgba(255,0,0,0.5)';
        ctx.beginPath(); ctx.arc(0, 0, e.size * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // Perseverance sweep beams (objects độc lập trong _levPersBeams)
    if (window._levPersBeams) {
        window._levPersBeams.forEach(beam => {
            if (beam.done) return;
            // sweepCurrent được update bởi main.js mỗi frame
            const sweepAngle = beam.sweepCurrent !== undefined ? beam.sweepCurrent
                : (beam.sweepOrigin + (beam.progress || 0) * Math.PI * 2);

            // Luôn đỏ, cả lúc announce lẫn post-shield
            const laserGlow = '#ff0000';
            const laserCore = 'rgba(255,30,0,0.95)';
            const laserOuter = 'rgba(255,0,0,0.2)';

            ctx.save();
            ctx.translate(beam.ox, beam.oy);
            ctx.rotate(sweepAngle);

            // Wide outer glow
            if (!_mobPerf) ctx.shadowColor = laserGlow; if (!_mobPerf) ctx.shadowBlur = 60;
            ctx.strokeStyle = laserOuter;
            ctx.lineWidth = 70;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            // Core beam
            ctx.strokeStyle = laserCore;
            ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            // White center line
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            ctx.restore();
        });
    }

    // Death lasers, with wing rotation animation
    if (!window._levDeathLasers) return;
    window._levDeathLasers.forEach(laser => {
        const elapsed = laser.elapsed || 0;
        const warnTime = laser.warnTime || 1200;
        const activeTime = laser.activeTime || 900;
        const total = warnTime + activeTime;
        if (elapsed >= total) return;

        const isActive = elapsed >= warnTime;
        const warnProg = Math.min(1, elapsed / warnTime); // 0→1 during warn
        const activeFade = isActive ? Math.max(0, 1 - (elapsed - warnTime) / activeTime) : 0;

        // Smooth wing rotation: easeInOutCubic from startAngle → targetAngle
        const startA = laser.startAngle !== undefined ? laser.startAngle : laser.angle;
        const targetA = laser.angle;
        // Normalize angle diff to shortest path
        let diff = targetA - startA;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        // easeInOutCubic
        const t = warnProg;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const currentAngle = startA + diff * ease;

        ctx.save();
        ctx.translate(laser.ox, laser.oy);

        if (!isActive) {
            // Wing shape rotating into position
            const wingLen = 60 + warnProg * 40; // cánh vươn ra khi xoay
            const wingW = 14;
            const hw = wingW / 2;

            ctx.save();
            ctx.rotate(currentAngle);
            // Cánh hình thang
            const wg = ctx.createLinearGradient(0, 0, wingLen, 0);
            wg.addColorStop(0, '#ff4400');
            wg.addColorStop(0.3, '#2d1810');
            wg.addColorStop(1, '#0f0a08');
            ctx.fillStyle = wg;
            if (!_mobPerf) ctx.shadowColor = '#ff4400';
            if (!_mobPerf) ctx.shadowBlur = 8 + warnProg * 20;
            ctx.beginPath();
            ctx.moveTo(0, -hw * 0.4);
            ctx.lineTo(0, hw * 0.4);
            ctx.lineTo(wingLen, hw * 0.7);
            ctx.lineTo(wingLen, -hw * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Dashed warning line
            ctx.rotate(currentAngle);
            ctx.globalAlpha = warnProg * 0.7;
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 3;
            if (!_mobPerf) ctx.shadowColor = '#ff4400'; if (!_mobPerf) ctx.shadowBlur = 12;
            ctx.setLineDash([10, 7]);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Active laser beam
            ctx.rotate(targetA);
            ctx.globalAlpha = activeFade;
            if (!_mobPerf) ctx.shadowColor = '#ff2200'; if (!_mobPerf) ctx.shadowBlur = 40;
            ctx.strokeStyle = 'rgba(255,80,0,0.3)';
            ctx.lineWidth = 35;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
        }
        ctx.restore();
    });
}


function _drawLeviathan(enemy) {
    const now = performance.now();
    const cx = enemy.x, cy = enemy.y;
    const r = enemy.size / 2;
    const shieldActive = enemy.afoShieldActive;
    const NUM_WINGS = 9;
    const dying = enemy.dyingLaserPhase;

    ctx.save();
    ctx.translate(cx, cy);

    // Wing animation
    const cycleMs = 6000;
    const t6 = (now % cycleMs) / cycleMs;
    let wingPhase;
    if (shieldActive || dying) {
        wingPhase = shieldActive ? 0 : 1;
    } else {
        if (t6 < 0.25) wingPhase = 0;
        else if (t6 < 0.35) wingPhase = (t6 - 0.25) / 0.10;
        else if (t6 < 0.80) wingPhase = 1;
        else wingPhase = 1 - (t6 - 0.80) / 0.20;
        wingPhase = Math.max(0, Math.min(1, wingPhase));
    }

    // Counter-clockwise slow rotation of the whole wing arrangement
    const wingRotOffset = -(now / 9000) * Math.PI * 2;

    for (let i = 0; i < NUM_WINGS; i++) {
        const baseAngle = (Math.PI * 2 / NUM_WINGS) * i + wingRotOffset;

        // Bobbing: each wing oscillates slightly in/out at different phases
        const bob = Math.sin(now / 700 + i * (Math.PI * 2 / NUM_WINGS)) * r * 0.06;

        const closedDist = r * 0.45;
        const openDist = r * 0.95;
        const wingDist = closedDist + (openDist - closedDist) * wingPhase + bob;
        const wingLen = r * 1.1;
        const wingW = r * 0.28;
        const hw = wingW / 2;
        const scale = 1 + wingPhase * 0.05;

        ctx.save();
        ctx.rotate(baseAngle);
        ctx.translate(0, -wingDist);
        ctx.scale(scale, scale);

        // Trapezoid (clip-path: polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%) từ HTML)
        ctx.beginPath();
        ctx.moveTo(-hw * 0.4, -wingLen);  // top-left  (30%)
        ctx.lineTo(hw * 0.4, -wingLen);  // top-right (70%)
        ctx.lineTo(hw, 0);         // bottom-right (100%)
        ctx.lineTo(-hw, 0);         // bottom-left  (0%)
        ctx.closePath();

        // Gradient giống HTML: #00e5ff top → dark steel bottom
        const wg = ctx.createLinearGradient(0, -wingLen, 0, 0);
        wg.addColorStop(0, '#00e5ff');
        wg.addColorStop(0.15, '#2d3748');
        wg.addColorStop(0.80, '#1a1c29');
        wg.addColorStop(1, '#0f172a');
        ctx.fillStyle = wg;
        if (!_mobPerf) ctx.shadowColor = '#00e5ff';
        if (!_mobPerf) ctx.shadowBlur = 8 + wingPhase * 6;
        ctx.fill();

        // Inner panel (segment::before từ HTML)
        ctx.beginPath();
        ctx.moveTo(-hw * 0.20, -wingLen * 0.85);
        ctx.lineTo(hw * 0.20, -wingLen * 0.85);
        ctx.lineTo(hw * 0.60, -wingLen * 0.15);
        ctx.lineTo(-hw * 0.60, -wingLen * 0.15);
        ctx.closePath();
        ctx.fillStyle = '#374151';
        ctx.shadowBlur = 0;
        ctx.fill();

        ctx.restore();
    }

    // Energy vortex (chỉ khi khiên đã vỡ)
    if (!shieldActive) {
        ctx.save();
        ctx.rotate(now / 400);
        for (let i = 0; i < 8; i++) {
            const sa = (Math.PI * 2 / 8) * i;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.52, sa, sa + Math.PI / 8);
            ctx.lineWidth = 5;
            ctx.strokeStyle = i % 2 === 0 ? 'rgba(0,229,255,0.85)' : 'rgba(157,0,255,0.85)';
            ctx.stroke();
        }
        ctx.restore();
    }

    // Core
    const coreR = r * 0.32;
    const beat = 0.9 + 0.15 * Math.abs(Math.sin(now / 500));

    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * beat * 2);
    cg.addColorStop(0, 'rgba(157,0,255,0.5)');
    cg.addColorStop(0.5, 'rgba(0,229,255,0.2)');
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, coreR * beat * 2, 0, Math.PI * 2); ctx.fill();

    const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * beat);
    coreG.addColorStop(0, '#020205');
    coreG.addColorStop(0.6, '#2a0066');
    coreG.addColorStop(1, '#00e5ff');
    ctx.fillStyle = coreG;
    if (!_mobPerf) ctx.shadowColor = '#9d00ff'; if (!_mobPerf) ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, coreR * beat, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Eye (tracks player)
    const eyeAngle = Math.atan2(player.y - cy, player.x - cx);
    const eOff = coreR * 0.30;
    const ex = Math.cos(eyeAngle) * eOff;
    const ey = Math.sin(eyeAngle) * eOff;
    const eR = coreR * 0.28;
    ctx.fillStyle = '#e8e8ff';
    ctx.beginPath(); ctx.arc(ex, ey, eR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath(); ctx.arc(ex, ey, eR * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ex, ey, eR * 0.30, 0, Math.PI * 2); ctx.fill();
    if (!_mobPerf) ctx.shadowColor = '#00e5ff'; if (!_mobPerf) ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(0,229,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ex, ey, eR, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // All for One shield (unbreakable-shield từ HTML)
    if (shieldActive) {
        const sR = r * 1.55;
        const spinA = (now / 15000) * Math.PI * 2;
        const pulse = 0.85 + 0.15 * Math.sin(now / 1500);

        // Radial fill
        const sg = ctx.createRadialGradient(0, 0, sR * 0.7, 0, 0, sR);
        sg.addColorStop(0, `rgba(0,229,255,${0.05 * pulse})`);
        sg.addColorStop(0.8, `rgba(0,229,255,${0.15 * pulse})`);
        sg.addColorStop(1, `rgba(0,229,255,${0.4 * pulse})`);
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(0, 0, sR, 0, Math.PI * 2); ctx.fill();

        // Outer border spinning (spin-slow 15s)
        ctx.save();
        ctx.rotate(spinA);
        ctx.strokeStyle = `rgba(0,229,255,${0.8 * pulse})`;
        ctx.lineWidth = 3;
        if (!_mobPerf) ctx.shadowColor = '#00e5ff'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, sR, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Inner dashed ring spinning reverse (unbreakable-shield::after)
        ctx.save();
        ctx.rotate(-spinA * 1.5);
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = `rgba(255,255,255,${0.55 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, sR * 0.94, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Kill counter (bên dưới Leviathan)
        const quota = enemy.afoKillQuota || '?';
        const kills = enemy.afoKillCount || 0;
        const hits = Math.min(200, enemy.afoHitCount || 0);
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = kills >= quota ? '#00ff88' : '#00e5ff';
        if (!_mobPerf) ctx.shadowColor = ctx.fillStyle; if (!_mobPerf) ctx.shadowBlur = 8;
        ctx.fillText(`${kills}/${quota} kills`, 0, sR + 20);
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.shadowBlur = 0;
        ctx.fillText(`${hits}/200 hits`, 0, sR + 36);
    }

    // Dying: freeze glow
    if (dying) {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        glow.addColorStop(0, 'rgba(255,100,0,0.5)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

