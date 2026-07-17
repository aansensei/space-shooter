// render/enemy-aegis-core.js — extracted from render.js. Self-contained,
// no cross-file calls besides core.js's _mobPerf.

function drawAegisCore(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const now = performance.now();
    const auraRadius = canvas.width / 2;
    const r = enemy.size;

    // 1. AURA ZONE BACKGROUND (red tint)
    const zoneGrad = ctx.createRadialGradient(0, 0, r, 0, 0, auraRadius);
    zoneGrad.addColorStop(0, 'rgba(255,0,0,0.02)');
    zoneGrad.addColorStop(0.7, 'rgba(200,0,0,0.04)');
    zoneGrad.addColorStop(1, 'rgba(220,0,0,0.16)');
    ctx.fillStyle = zoneGrad;
    ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.fill();

    // 2. LIMIT BOUNDARY RING (red)
    ctx.strokeStyle = 'rgba(255,40,40,0.85)';
    ctx.lineWidth = 2.5;
    if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 18; }
    ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Rotating gold dashed inner ring
    ctx.save();
    ctx.rotate(now / 5000);
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 12, 4, 12]);
    ctx.beginPath(); ctx.arc(0, 0, auraRadius - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 4 mechanical bracket locks on aura edge
    ctx.save();
    ctx.rotate(-now / 8000);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, i * Math.PI / 2 - 0.08, i * Math.PI / 2 + 0.08);
        ctx.stroke();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(Math.cos(i * Math.PI / 2) * (auraRadius - 14),
            Math.sin(i * Math.PI / 2) * (auraRadius - 14), 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 3. CIRCULAR PULSE WAVES (gold → red)
    if (!enemy._aegisPulses) enemy._aegisPulses = [];
    if (!enemy._lastPulseSpawn || now - enemy._lastPulseSpawn > 1500) {
        enemy._aegisPulses.push({ startTime: now, duration: 1400, startR: r * 1.2, endR: auraRadius });
        enemy._lastPulseSpawn = now;
    }
    for (let pi = enemy._aegisPulses.length - 1; pi >= 0; pi--) {
        const p = enemy._aegisPulses[pi];
        const elapsed = now - p.startTime;
        const tp = elapsed / p.duration;
        if (tp >= 1) { enemy._aegisPulses.splice(pi, 1); continue; }
        const easeT = 1 - Math.pow(1 - tp, 2.5);
        const currentR = p.startR + easeT * (p.endR - p.startR);
        const alpha = (1 - tp) * 0.75;
        const gCol = Math.floor(215 * (1 - tp));
        const pulseColor = `rgba(255,${gCol},0,${alpha})`;
        ctx.save();
        if (!_mobPerf) { ctx.shadowColor = pulseColor; ctx.shadowBlur = 10 * (1 - tp); }
        ctx.strokeStyle = pulseColor; ctx.lineWidth = 4 * (1 - tp) + 1;
        ctx.beginPath(); ctx.arc(0, 0, currentR, 0, Math.PI * 2); ctx.stroke();
        ctx.save();
        ctx.rotate(tp * Math.PI * 0.5);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([5 + tp * 15, 8 + tp * 5]);
        ctx.beginPath(); ctx.arc(0, 0, currentR * 0.94, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        if (!_mobPerf) {
            ctx.strokeStyle = `rgba(255,${gCol},0,${alpha * 0.25})`; ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            for (let s = 0; s < 12; s++) {
                const a = (s / 12) * Math.PI * 2 + now / 4000;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * p.startR, Math.sin(a) * p.startR);
                ctx.lineTo(Math.cos(a) * currentR, Math.sin(a) * currentR);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 4. CUSTOS AETERNUS SHIELD (gold, Iron Body)
    if (enemy.aegisInvulnerable) {
        ctx.save();
        const shieldR = r * 1.6;
        const shieldPulse = 0.8 + 0.2 * Math.sin(now / 150);
        if (!_mobPerf) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 25; }
        ctx.strokeStyle = `rgba(255,215,0,${shieldPulse})`; ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(255,215,0,0.08)';
        ctx.beginPath(); ctx.arc(0, 0, shieldR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.rotate(now / 3000);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
        if (!_mobPerf) ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const nextA = ((i + 3) / 12) * Math.PI * 2;
            ctx.moveTo(Math.cos(a) * shieldR, Math.sin(a) * shieldR);
            ctx.lineTo(Math.cos(nextA) * shieldR, Math.sin(nextA) * shieldR);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 5. ARMILLARY RINGS
    ctx.save();
    if (!_mobPerf) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = 'rgba(200,200,220,0.8)'; ctx.lineWidth = 2.5;
    ctx.save();
    ctx.rotate(now / 1500);
    ctx.scale(1, 0.3 + 0.1 * Math.sin(now / 1000));
    ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(-now / 1800 + Math.PI / 4);
    ctx.scale(0.35 + 0.15 * Math.sin(now / 1200), 1);
    ctx.strokeStyle = 'rgba(255,100,100,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. MAIN BODY SHELL
    const shellGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
    shellGrad.addColorStop(0, '#e0e0e0'); shellGrad.addColorStop(0.5, '#7a7a7a');
    shellGrad.addColorStop(0.85, '#2b2b2b'); shellGrad.addColorStop(1, '#050505');
    ctx.fillStyle = shellGrad; ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.rotate(-now / 4000);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
        ctx.stroke();
    }
    ctx.restore();

    // 7. MECHANICAL IRIS + CORE
    const innerR = r * 0.45;
    ctx.fillStyle = '#050000';
    ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.fill();
    const coreBeat = 0.85 + 0.2 * Math.abs(Math.sin(now / 750));
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR * coreBeat);
    coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(0.2, '#ffdd44');
    coreGrad.addColorStop(0.5, '#ff2200'); coreGrad.addColorStop(1, 'transparent');
    if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 20; }
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, innerR * coreBeat, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.rotate(now / 2000);
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#ff8888'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate((i / 6) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(innerR * 0.4, 0);
        ctx.lineTo(innerR, -innerR * 0.4);
        ctx.lineTo(innerR, innerR * 0.4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.2 * Math.sin(now / 100)})`;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}
// Enemy dispatcher
