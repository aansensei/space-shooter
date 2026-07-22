// render/enemy-common.js — extracted from render.js. drawEnemy() is the
// type-dispatch entry point that main.js/draw() calls for every enemy; the
// other functions here are generic pieces shared by multiple enemy types
// (normal enemy, enemy bullets, embryo, vulnerability icon, coronation fx).
// Depends on core.js + fx.js (_drawLightningBolt used by _drawCoronationEffect).

function _drawDebugDummy(e, now) {
    const x = e.x, y = e.y, R = e.size;
    if (!e._particles) e._particles = [];
    if (e._stateTime === undefined) e._stateTime = now;
    if (!e._state) e._state = 'idle';

    const elapsed = now - e._stateTime;

    // Auto-detect HP decrease → trigger hit animation
    if (e._lastHp !== undefined && e.hp < e._lastHp && e._state !== 'invincible' && e._state !== 'death') {
        e._state = e._ironActive ? 'iron' : 'hit';
        e._stateTime = now;
    }
    e._lastHp = e.hp;

    // State durations (ms)
    const DUR = { hit: 500, dot: 1600, heal: 1100, shield: 700, iron: 500, truedmg: 750, pierce: 950, death: 2200 };
    if (DUR[e._state] && elapsed >= DUR[e._state]) {
        e._state = 'idle';
    }

    const hpPct = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 0;
    const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffcc00' : '#ff4444';

    ctx.save();
    ctx.translate(x, y);

    // === IRON BODY PASSIVE RING ===
    if (e._ironActive) {
        ctx.save();
        ctx.rotate(now / 350);
        ctx.strokeStyle = 'rgba(255,204,0,0.7)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 7]);
        if (!_mobPerf) { ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 14; }
        ctx.beginPath();
        ctx.arc(0, 0, R + 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // === IMMUNITY RING ===
    if (e._isImmune) {
        const ph = (now / 300) % 1;
        ctx.save();
        ctx.strokeStyle = `rgba(80,200,255,${0.4 + 0.3 * Math.sin(now / 200)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -ph * 12;
        ctx.beginPath();
        ctx.arc(0, 0, R + 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // === INVINCIBLE STATE AURA ===
    if (e._state === 'invincible') {
        const hue = (now / 4) % 360;
        ctx.save();
        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${0.75 + 0.25 * Math.sin(now / 90)})`;
        ctx.lineWidth = 4;
        if (!_mobPerf) { ctx.shadowColor = `hsl(${hue}, 100%, 60%)`; ctx.shadowBlur = 22; }
        ctx.beginPath();
        ctx.arc(0, 0, R + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // === HP ARC RING ===
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.arc(0, 0, R + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, false);
    ctx.stroke();
    if (hpPct > 0.001) {
        if (!_mobPerf) { ctx.shadowColor = hpColor; ctx.shadowBlur = 9; }
        ctx.strokeStyle = hpColor;
        ctx.beginPath();
        ctx.arc(0, 0, R + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct, false);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    ctx.restore();

    // === SHAKE TRANSFORM (hit state) ===
    const shakeAmt = (e._state === 'hit' || e._state === 'iron') && elapsed < 300 ?
        (1 - elapsed / 300) * 9 * (Math.random() - 0.5) : 0;
    ctx.save();
    ctx.translate(shakeAmt, shakeAmt * 0.4);

    // === HEXAGONAL BODY ===
    ctx.save();
    const hexR = R * 0.88;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 - Math.PI / 6;
        const hx = Math.cos(a) * hexR, hy = Math.sin(a) * hexR;
        k === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    let fillCol = 'rgba(10,20,40,0.88)';
    if (e._state === 'hit') fillCol = 'rgba(55,8,5,0.90)';
    if (e._state === 'dot') fillCol = `rgba(30,5,45,${0.88 + 0.07 * Math.sin(now / 120)})`;
    if (e._state === 'heal') fillCol = 'rgba(5,35,20,0.90)';
    if (e._state === 'truedmg') fillCol = `rgba(240,240,255,${0.85 + 0.12 * Math.sin(now / 40)})`;
    if (e._state === 'death') fillCol = 'rgba(40,15,5,0.80)';
    ctx.fillStyle = fillCol;
    ctx.fill();

    let borderCol = 'rgba(0,200,255,0.70)';
    if (e._state === 'hit') borderCol = '#ff5500';
    if (e._state === 'dot') borderCol = '#cc00ff';
    if (e._state === 'heal') borderCol = '#00ff88';
    if (e._state === 'shield') borderCol = '#0096ff';
    if (e._state === 'iron') borderCol = '#ffcc00';
    if (e._state === 'truedmg') borderCol = '#ffffff';
    if (e._state === 'pierce') borderCol = '#ff2200';
    if (e._state === 'invincible') borderCol = `hsl(${(now / 5) % 360}, 100%, 65%)`;
    if (e._state === 'death') borderCol = '#ff6600';
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2.2;
    if (!_mobPerf) { ctx.shadowColor = borderCol; ctx.shadowBlur = 14; }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Circuit lines
    if (!_mobPerf) {
        ctx.strokeStyle = 'rgba(0,200,255,0.14)';
        ctx.lineWidth = 0.9;
        for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * hexR * 0.38, Math.sin(a) * hexR * 0.38);
            ctx.lineTo(Math.cos(a) * hexR * 0.86, Math.sin(a) * hexR * 0.86);
            ctx.stroke();
        }
    }

    // Crosshair
    ctx.strokeStyle = 'rgba(0,220,255,0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-hexR * 0.62, 0); ctx.lineTo(hexR * 0.62, 0);
    ctx.moveTo(0, -hexR * 0.62); ctx.lineTo(0, hexR * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore(); // end hex body

    // === ENERGY CORE ===
    const corePulse = 0.82 + 0.18 * Math.sin(now / 180);
    let coreCol = '#00e5ff';
    if (e._state === 'hit') coreCol = '#ff4400';
    if (e._state === 'dot') coreCol = '#cc00ff';
    if (e._state === 'heal') coreCol = '#00ff88';
    if (e._state === 'shield') coreCol = '#0096ff';
    if (e._state === 'iron') coreCol = '#ffcc00';
    if (e._state === 'truedmg') coreCol = '#ffffff';
    if (e._state === 'pierce') coreCol = '#ff2200';
    if (e._state === 'death') coreCol = '#ff8800';
    if (e._state === 'invincible') coreCol = `hsl(${(now / 4) % 360}, 100%, 68%)`;

    if (!_mobPerf) { ctx.shadowColor = coreCol; ctx.shadowBlur = 22; }
    ctx.fillStyle = coreCol;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.30 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // === STATE EFFECTS ===

    // HIT: shockwave ring
    if ((e._state === 'hit') && elapsed < 500) {
        const p = elapsed / 500;
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.85;
        if (!_mobPerf) { ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 18; }
        ctx.strokeStyle = '#ff6622';
        ctx.lineWidth = 4 * (1 - p);
        ctx.beginPath();
        ctx.arc(0, 0, R * (1 + p * 2.2), 0, Math.PI * 2);
        ctx.stroke();
        if (!_mobPerf) {
            ctx.lineWidth = 2 * (1 - p);
            ctx.globalAlpha = (1 - p) * 0.4;
            ctx.beginPath();
            ctx.arc(0, 0, R * (1 + p * 3.5), 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // IRON HIT: gold sparks + DEFLECT
    if (e._state === 'iron' && elapsed < 500) {
        const p = elapsed / 500;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        if (!_mobPerf) { ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 14; }
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3 * (1 - p);
        ctx.beginPath();
        ctx.arc(0, 0, R + 22 + p * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let k = 0; k < (elapsed < 100 ? 6 : 0); k++) {
            const sa = Math.random() * Math.PI * 2;
            const sl = R + Math.random() * R;
            ctx.strokeStyle = Math.random() < 0.5 ? '#ffd700' : '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(sa) * R, Math.sin(sa) * R);
            ctx.lineTo(Math.cos(sa) * sl, Math.sin(sa) * sl);
            ctx.stroke();
        }
        ctx.fillStyle = `rgba(255,210,0,${1-p})`;
        ctx.font = `bold ${Math.max(9, Math.round(R * 0.38))}px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DEFLECT', 0, -R * 1.7);
        ctx.restore();
    }

    // DOT: rising purple bubbles
    if (e._state === 'dot') {
        ctx.save();
        const fade = Math.max(0, 1 - elapsed / 1600);
        ctx.globalAlpha = fade * 0.28 * Math.abs(Math.sin(now / 180));
        ctx.fillStyle = '#aa00ff';
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        for (let k = 0; k < 5; k++) {
            const bx = Math.sin(now / 100 + k * 1.25) * R * 0.55;
            const by = -((elapsed * 0.042) % (R * 2.5)) - k * R * 0.22;
            ctx.globalAlpha = Math.max(0, 1 - elapsed / 1600) * 0.85;
            ctx.fillStyle = k % 2 === 0 ? 'rgba(170,0,255,0.75)' : 'rgba(100,0,200,0.65)';
            ctx.beginPath();
            ctx.arc(bx, by, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // HEAL: contracting ring + plus signs
    if (e._state === 'heal' && elapsed < 1100) {
        const p = elapsed / 1100;
        ctx.save();
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 16; }
        ctx.strokeStyle = `rgba(0,255,136,${(1 - p) * 0.85})`;
        ctx.lineWidth = 3.5 * (1 - p * 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, R * 2.8 * (1 - p) + R * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(0,255,136,${(1 - p) * 0.9})`;
        ctx.font = `bold ${Math.max(10, Math.round(R * 0.46))}px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let k = 0; k < 3; k++) {
            ctx.fillText('+', (k - 1) * R * 0.52, -p * R * 2 - k * R * 0.28);
        }
        ctx.restore();
    }

    // SHIELD BLOCK: blue ring + text
    if (e._state === 'shield' && elapsed < 700) {
        const p = elapsed / 700;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        if (!_mobPerf) { ctx.shadowColor = '#0096ff'; ctx.shadowBlur = 22; }
        ctx.strokeStyle = `rgba(0,150,255,${1 - p})`;
        ctx.lineWidth = 5 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, R + 14 + p * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(0,180,255,${(1 - p) * 0.22})`;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(0,200,255,${1 - p})`;
        ctx.font = `bold ${Math.max(9, Math.round(R * 0.42))}px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BLOCK', 0, -R * 1.7);
        ctx.restore();
    }

    // TRUE DAMAGE: white diagonal slash + text
    if (e._state === 'truedmg' && elapsed < 750) {
        const p = elapsed / 750;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        if (!_mobPerf) { ctx.shadowColor = 'cyan'; ctx.shadowBlur = 22; }
        ctx.strokeStyle = `rgba(255,255,255,${1 - p})`;
        ctx.lineWidth = 6 * (1 - p);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-R * 1.6, -R * 1.6);
        ctx.lineTo(R * 1.6, R * 1.6);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,60,60,${1 - p})`;
        ctx.font = `bold ${Math.max(9, Math.round(R * 0.42))}px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TRUE DMG', 0, -R * 1.75);
        ctx.restore();
    }

    // PIERCE: laser beam + glowing wound
    if (e._state === 'pierce' && elapsed < 950) {
        const p = elapsed / 950;
        ctx.save();
        if (elapsed < 220) {
            ctx.globalAlpha = Math.max(0, 1 - elapsed / 220) * 0.9;
            if (!_mobPerf) { ctx.shadowColor = 'red'; ctx.shadowBlur = 14; }
            ctx.fillStyle = 'rgba(255,20,0,0.85)';
            ctx.fillRect(-canvas.width, -3.5, canvas.width * 2, 7);
        }
        ctx.globalAlpha = 1 - p * 0.7;
        if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 14; }
        ctx.fillStyle = `rgba(255,60,0,${0.9 - p * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(2, 11 - p * 4), Math.max(1, 7 - p * 2), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // DEATH: triple shockwave
    if (e._state === 'death' && elapsed < 2200) {
        const waveColors = ['#ff4400', '#ff8800', '#ffcc44'];
        for (let w = 0; w < 3; w++) {
            const delay = w * 320;
            if (elapsed < delay) continue;
            const wp = Math.min(1, (elapsed - delay) / 1100);
            ctx.save();
            ctx.globalAlpha = (1 - wp) * 0.75;
            if (!_mobPerf) { ctx.shadowColor = waveColors[w]; ctx.shadowBlur = 16; }
            ctx.strokeStyle = waveColors[w];
            ctx.lineWidth = 6 * (1 - wp);
            ctx.beginPath();
            ctx.arc(0, 0, R * (0.6 + wp * 3.5), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        // Flash at start
        if (elapsed < 80) {
            ctx.save();
            ctx.globalAlpha = (1 - elapsed / 80) * 0.7;
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.arc(0, 0, R * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    ctx.restore(); // end shake

    // === LABEL + HP ===
    const labelY = R + 20;
    ctx.fillStyle = 'rgba(180,220,255,0.65)';
    ctx.font = `bold ${Math.max(10, Math.round(R * 0.32))}px "Courier New"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DUMMY', 0, labelY);
    ctx.fillStyle = hpColor;
    ctx.font = `${Math.max(9, Math.round(R * 0.26))}px "Courier New"`;
    ctx.fillText(Math.max(0, Math.round(e.hp)) + ' / ' + Math.round(e.maxHp), 0, labelY + 13);

    ctx.restore();
}

function drawEnemy(enemy) {
    if (enemy.type === 'debug_dummy') { _drawDebugDummy(enemy, performance.now()); return; }
    // Abyssal Chain render
    if (enemy.type === 'abyssal_chain') {
        const now0 = performance.now();
        const pulse = 0.6 + 0.4 * Math.sin(now0 / 60);
        const dark = !!enemy.isDarkened;

        // Trailing sparks
        const trailCount = _mobPerf ? 3 : 6;
        for (let t = 1; t <= trailCount; t++) {
            const tf = t / trailCount;
            const tx = enemy.x - enemy.vx * tf * 0.5;
            const ty = enemy.y - enemy.vy * tf * 0.5;
            ctx.save();
            ctx.globalAlpha = (1 - tf) * 0.75;
            if (!_mobPerf) { ctx.shadowColor = dark ? '#ff0000' : '#dd00ff'; ctx.shadowBlur = 14; }
            ctx.fillStyle = dark ? (tf < 0.4 ? '#ff4444' : '#550000') : (tf < 0.4 ? '#ff88ff' : '#9900cc');
            ctx.beginPath();
            ctx.arc(tx, ty, Math.max(1, enemy.size * (1 - tf * 0.6) * 0.38), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Darkened chain: red smoke aura
        if (dark && !_mobPerf) {
            const smokeCount = 4;
            for (let si = 0; si < smokeCount; si++) {
                const sAng = now0 / 300 + si * Math.PI * 0.5;
                const sr = enemy.size * (0.9 + 0.4 * Math.sin(now0 / 200 + si));
                ctx.save();
                ctx.globalAlpha = 0.16 + 0.09 * Math.abs(Math.sin(now0 / 150 + si));
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#3a0000';
                ctx.beginPath();
                ctx.arc(enemy.x + Math.cos(sAng) * sr, enemy.y + Math.sin(sAng) * sr, enemy.size * 0.52, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Triangle molecule particles
        if (enemy.molParticles && enemy.molParticles.length > 0) {
            for (const mp of enemy.molParticles) {
                const alpha = Math.min(1, mp.life / mp.maxLife) * 0.9;
                const blink = 0.5 + 0.5 * Math.abs(Math.sin(now0 / 100 + mp.x * 0.1));
                ctx.save();
                ctx.globalAlpha = alpha * blink;
                ctx.translate(mp.x, mp.y);
                ctx.rotate(mp.angle);
                if (!_mobPerf) { ctx.shadowColor = mp.col; ctx.shadowBlur = 8; }
                ctx.fillStyle = mp.col;
                const s = mp.size;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.866, s * 0.5);
                ctx.lineTo(-s * 0.866, s * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // Darkened chain: chaos energy particles
        if (dark) {
            const chaosCount = _mobPerf ? 2 : 5;
            for (let ci = 0; ci < chaosCount; ci++) {
                const cAng = now0 / 80 + ci * 1.257;
                const cr = enemy.size * (0.5 + 0.8 * ((ci * 0.37) % 1));
                ctx.save();
                ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(now0 / 60 + ci));
                if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 6; }
                ctx.fillStyle = ci % 2 === 0 ? '#cc0000' : '#1a0000';
                ctx.beginPath();
                ctx.arc(enemy.x + Math.cos(cAng) * cr, enemy.y + Math.sin(cAng) * cr, 2 + ci * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Rope from Dargruel to chain head
        const ox = enemy.ownerRef ? enemy.ownerRef.x : enemy.originX;
        const oy = enemy.ownerRef ? enemy.ownerRef.y : enemy.originY;
        ctx.save();
        const dx = enemy.x - ox, dy = enemy.y - oy;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
            const segs = Math.max(3, Math.floor(dist / 24));
            if (!_mobPerf) { ctx.shadowColor = dark ? '#aa0000' : '#cc00ff'; ctx.shadowBlur = 12; }
            ctx.strokeStyle = dark ? `rgba(160,0,0,${0.7 + pulse * 0.2})` : `rgba(180,0,255,${0.6 + pulse * 0.2})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            for (let s = 1; s <= segs; s++) {
                const t = s / segs;
                const jitter = s < segs ? Math.sin(now0 / 100 + s * 2.1) * 6 : 0;
                ctx.lineTo(ox + dx * t - (dy / dist) * jitter, oy + dy * t + (dx / dist) * jitter);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();

        // Chain head
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        const angle = Math.atan2(enemy.vy, enemy.vx);
        ctx.rotate(angle);
        if (dark) {
            if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 32; }
            ctx.fillStyle = `rgba(120,0,0,${0.22 + pulse * 0.1})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 2.3, enemy.size * 1.05, 0, 0, Math.PI * 2);
            ctx.fill();
            if (!_mobPerf) ctx.shadowBlur = 24;
            ctx.fillStyle = `rgba(75,0,0,${0.94 + pulse * 0.06})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 1.75, enemy.size * 0.78, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(220,0,30,${0.92 + pulse * 0.08})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0d0000';
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 0.55, enemy.size * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,80,80,${0.5 + pulse * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(-enemy.size * 0.22, -enemy.size * 0.14, enemy.size * 0.2, enemy.size * 0.11, -0.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            if (!_mobPerf) { ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 32; }
            ctx.fillStyle = `rgba(180,0,255,${0.22 + pulse * 0.1})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 2.3, enemy.size * 1.05, 0, 0, Math.PI * 2);
            ctx.fill();
            if (!_mobPerf) ctx.shadowBlur = 24;
            ctx.fillStyle = `rgba(110,0,210,${0.94 + pulse * 0.06})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 1.75, enemy.size * 0.78, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(240,120,255,${0.92 + pulse * 0.08})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#07001a';
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 0.55, enemy.size * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(245,170,255,${0.5 + pulse * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(-enemy.size * 0.22, -enemy.size * 0.14, enemy.size * 0.2, enemy.size * 0.11, -0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        return;
    }

    // Thủ Lĩnh Bầy Đàn (Leviathan Envy): white pulsing ring
    if (enemy.levEnvy) {
        const now0 = performance.now();
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(now0 / 400 + enemy.x * 0.01));
        const r0 = (enemy.size / 2) + 8;
        ctx.save();
        ctx.globalAlpha = 1;

        // Outer glow ring
        if (!_mobPerf) ctx.shadowColor = '#ffffff';
        if (!_mobPerf) ctx.shadowBlur = 16;
        ctx.strokeStyle = `rgba(255,255,255,${0.7 + pulse * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r0, 0, Math.PI * 2);
        ctx.stroke();

        // Spinning dashed inner ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(220,240,255,${0.45 + pulse * 0.2})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(now0 / 1200);
        ctx.beginPath(); ctx.arc(0, 0, r0 - 5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        // 4 corner dots
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        if (!_mobPerf) ctx.shadowColor = '#aaccff'; if (!_mobPerf) ctx.shadowBlur = 8;
        for (let d = 0; d < 4; d++) {
            const a = (now0 / 2000) + d * Math.PI / 2;
            ctx.beginPath();
            ctx.arc(enemy.x + Math.cos(a) * r0, enemy.y + Math.sin(a) * r0, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Soul reaver icon
    if (enemy.soulReaver) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y - enemy.size - 25);
        ctx.strokeStyle = '#FF4500'; ctx.lineWidth = 2.5;
        if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
        ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
        ctx.restore();
    }

    // VULNERABILITY (Trọng Thương) icon
    if (enemy.vulnStacks && enemy.vulnStacks > 0 && enemy.vulnEndTime && performance.now() < enemy.vulnEndTime) {
        _drawVulnerabilityIcon(enemy);
    }

    // Yog-Sothoth domain TARGET LOCK effect
    if (skillShiftActive) {
        const now = performance.now();
        let elapsed = now - skillShiftChargeStart;
        let maxRadius = Math.hypot(canvas.width, canvas.height);
        let domR = Math.min(maxRadius, maxRadius * (elapsed / 600));
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= domR) {
            const er = (enemy.size || 20) + 6;
            const pulse = 0.6 + 0.4 * Math.sin(now / 120 + enemy.x * 0.05);
            const lockIn = Math.min(elapsed / 400, 1); // fade-in

            ctx.save();
            ctx.globalAlpha = lockIn;

            // 1. Red scan fill
            ctx.fillStyle = `rgba(255,20,20,${0.08 * pulse})`;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er * 1.3, 0, Math.PI * 2); ctx.fill();

            // 2. Outer rotating dashed ring
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(now / 800);
            ctx.strokeStyle = `rgba(255,60,60,${0.85 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 6]);
            ctx.beginPath(); ctx.arc(0, 0, er + 6, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // 3. Inner solid ring
            ctx.strokeStyle = `rgba(255,40,40,${0.95})`;
            ctx.lineWidth = 2;
            if (!_mobPerf) ctx.shadowColor = '#ff0022'; if (!_mobPerf) ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;

            // 4. Four corner brackets (crosshair corners)
            const bSize = er * 0.55;
            const bGap = er * 0.35;
            const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            ctx.strokeStyle = `rgba(255,80,80,${0.9 * pulse})`;
            ctx.lineWidth = 2;
            corners.forEach(([dx, dy]) => {
                const bx = enemy.x + dx * (er + bGap * 0.5);
                const by = enemy.y + dy * (er + bGap * 0.5);
                ctx.beginPath();
                ctx.moveTo(bx, by - dy * bSize * 0.5);
                ctx.lineTo(bx, by);
                ctx.lineTo(bx - dx * bSize * 0.5, by);
                ctx.stroke();
            });

            // 5. Center crosshair dot
            ctx.fillStyle = `rgba(255,100,100,${pulse})`;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2); ctx.fill();

            // 6. Horizontal + vertical scan lines (thin)
            ctx.strokeStyle = `rgba(255,30,30,${0.3 * pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x - er * 1.5, enemy.y);
            ctx.lineTo(enemy.x + er * 1.5, enemy.y);
            ctx.moveTo(enemy.x, enemy.y - er * 1.5);
            ctx.lineTo(enemy.x, enemy.y + er * 1.5);
            ctx.stroke();

            // 7. LOCKED label above enemy
            if (elapsed > 500) {
                const textAlpha = Math.min((elapsed - 500) / 200, 1) * (0.7 + 0.3 * pulse);
                ctx.fillStyle = `rgba(255,80,80,${textAlpha})`;
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('LOCKED', enemy.x, enemy.y - er - 8);
            }

            ctx.restore();
        }
    }

    // Boss aura (HIGH + MED)
    if (_gfxLevel < 2) {
        const _bossTypes = { boss:[255,80,0], thaelis:[255,200,0], marchosias:[0,255,120], leviathan:[0,180,255], veilshroud:[160,0,255], aegis_core:[0,220,255] };
        const _bossCol = _bossTypes[enemy.type];
        if (_bossCol) {
            const nowB = performance.now();
            const bAP = 0.10 + 0.06 * Math.sin(nowB / 420);
            const bAR = (enemy.size / 2) * 2.6;
            const [bar, bag, bab] = _bossCol;
            const bAG = ctx.createRadialGradient(enemy.x, enemy.y, (enemy.size / 2) * 0.7, enemy.x, enemy.y, bAR);
            bAG.addColorStop(0, `rgba(${bar},${bag},${bab},${bAP * 1.8})`);
            bAG.addColorStop(1, `rgba(${bar},${bag},${bab},0)`);
            ctx.save();
            ctx.fillStyle = bAG;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, bAR, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // Spawn warp-in contracting ring (HIGH only, first 600ms)
    if (_gfxLevel < 1 && !enemy.type.startsWith('enemy_bullet') && enemy.type !== 'abyssal_chain') {
        if (!enemy._spawnTime) enemy._spawnTime = performance.now();
        const _spawnElapsed = performance.now() - enemy._spawnTime;
        if (_spawnElapsed < 600) {
            const sp = _spawnElapsed / 600;
            const spR = (enemy.size / 2) * (3.0 * (1 - sp) + 0.9);
            ctx.save();
            ctx.globalAlpha = (1 - sp) * 0.9;
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 2.5 * (1 - sp) + 0.5;
            if (!_mobPerf) { ctx.shadowColor = 'white'; ctx.shadowBlur = 20; }
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, spR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    if (enemy.type === 'aegis_core') {
        drawAegisCore(enemy);
    } else if (enemy.type === 'dargruel' || enemy.type === 'thaelis') {
        _drawBossOrThaelis(enemy);
    } else if (enemy.type === 'embryo') {
        _drawEmbryo(enemy);
    } else if (enemy.type === 'marchosias') {
        _drawMarchosias(enemy);
    } else if (enemy.type === 'marchosias_minion') {
        _drawMarchosiasMinion(enemy);
    } else if (enemy.type === 'leviathan') {
        _drawLeviathan(enemy);
    } else if (enemy.type === 'veilshroud') {
        _drawVeilshroud(enemy);
    } else if (enemy.type === 'veilshroud_echo') {
        _drawVeilshroudEcho(enemy);
    } else if (enemy.type === 'egregor') {
        _drawEgregor(enemy);
    } else if (enemy.type.startsWith('enemy_bullet')) {
        _drawEnemyBullet(enemy);
    } else {
        _drawNormalEnemy(enemy);
    }

    // Shield bar
    if (enemy.shield > 0) {
        const bw = enemy.size, bh = 5;
        const bx = enemy.x - bw / 2, by = enemy.y - enemy.size / 2 - 15;
        ctx.fillStyle = 'rgba(0,80,160,0.5)'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#00BFFF'; ctx.fillRect(bx, by, bw * Math.min(1, enemy.shield / enemy.maxHp), bh);
        ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "white"; ctx.font = "11px Arial"; ctx.textAlign = "center";
        ctx.fillText(Math.ceil(enemy.shield), enemy.x, by - 2);
    }

    // MARCHOSIAS PARASITE SHIELD bar (green arc shield on host)
    if (enemy.marchosiasParasiteShield && enemy.marchosiasParasiteShield > 0) {
        ctx.save();
        const pR = enemy.size / 2 + 8;
        // rotating dashed ring
        const now3 = performance.now();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(now3 / 900);
        ctx.strokeStyle = 'rgba(0,255,136,0.85)';
        ctx.lineWidth = 3;
        if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 12;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.arc(0, 0, pR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        // HP label
        ctx.save();
        ctx.fillStyle = '#00ff88'; ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⬡' + Math.ceil(enemy.marchosiasParasiteShield), enemy.x, enemy.y - enemy.size / 2 - 24);
        ctx.restore();
    }

    // MARCHOSIAS ghost zones, 1 code path duy nhất (freeze khi windup, shrink sau khi bắn)
    if (enemy.type === 'marchosias' && enemy._ghostWindups && enemy._ghostWindups.length > 0) {
        const halfW = 36;
        for (const gw of enemy._ghostWindups) {
            const frozen = gw.freezeTimer > 0;
            const alpha = frozen ? 1.0 : Math.max(0, gw.fadeTimer / gw.maxFade);
            if (alpha <= 0) continue;
            // Khi frozen: origin theo vị trí Mar hiện tại (Mar đang di chuyển)
            // Khi fade: origin đã được lock tại vị trí Mar lúc chém ra
            const ox = frozen ? enemy.x : gw.originX;
            const oy = frozen ? enemy.y : gw.originY;
            const angle4 = Math.atan2(gw.targetY - oy, gw.targetX - ox);
            const len4 = Math.hypot(gw.targetX - ox, gw.targetY - oy) + 80;
            // Khi frozen: full corridor, sau khi bắn: shrink từ phía Mar ra target
            const visStart = frozen ? 0 : (1 - alpha) * len4;
            const visLen = len4 - visStart;
            if (visLen <= 0) continue;
            ctx.save();
            ctx.globalAlpha = alpha * 0.55 + 0.35;
            ctx.translate(ox, oy);
            ctx.rotate(angle4);
            ctx.beginPath();
            ctx.rect(visStart, -halfW - 1, visLen + 1, halfW * 2 + 2);
            ctx.clip();
            ctx.fillStyle = 'rgba(255,140,0,0.45)';
            ctx.fillRect(visStart, -halfW, visLen, halfW * 2);
            ctx.strokeStyle = 'rgba(255,220,120,0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([14, 8]);
            ctx.beginPath(); ctx.moveTo(visStart, 0); ctx.lineTo(len4, 0); ctx.stroke();
            ctx.setLineDash([]);
            // Outer dashed lines: only during freeze (windup). After blade fires they're drawn on the blade itself.
            if (frozen) {
                ctx.strokeStyle = 'rgba(255,210,0,0.92)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([10, 6]);
                ctx.beginPath();
                ctx.moveTo(visStart, -halfW); ctx.lineTo(len4, -halfW);
                ctx.moveTo(visStart, halfW);  ctx.lineTo(len4, halfW);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }
    }

    // MARCHOSIAS BLADE PROJECTILES
    // Marchosias blades drawn separately from global marchosiasBlades array

    // Demon Gift ring
    if (enemy.demonGiftEndTime && performance.now() < enemy.demonGiftEndTime) {
        ctx.save();
        ctx.strokeStyle = enemy.demonGiftStacks === 2 ? 'rgba(255,0,0,0.85)' : 'rgba(138,43,226,0.85)';
        ctx.lineWidth = enemy.demonGiftStacks === 2 ? 5 : 3;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size / 2 + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // HP text
    ctx.save();
    ctx.fillStyle = "white"; ctx.font = "14px Arial";
    if (enemy.type === 'enemy_bullet_small') ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil(enemy.hp), enemy.x, enemy.y + 5);
    ctx.restore();

    // Death Mark (tu_huyet): red pulsing glow on enemies below 20% HP
    if (typeof _hasBuff === 'function' && _hasBuff('tu_huyet') && !enemy.type.startsWith('enemy_bullet')
        && enemy.hp > 0 && enemy.hp / (enemy.maxHp || enemy.hp) < 0.20) {
        const _dmNow = performance.now();
        const _dmPulse = 0.5 + 0.5 * Math.sin(_dmNow / 130);
        ctx.save();
        ctx.strokeStyle = `rgba(239,68,68,${0.75 + 0.25 * _dmPulse})`;
        ctx.lineWidth = 2.5;
        if (!_mobPerf) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16; }
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2 + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Yog-Sothoth mark (coi_mong): purple spiral ring on marked enemies
    if (enemy._yogMark) {
        const _ymNow = performance.now();
        const _elapsed = _ymNow - enemy._yogMarkStart;
        const _progress = Math.min(1, _elapsed / 1650);
        const _ymPulse = 0.5 + 0.5 * Math.sin(_ymNow / 100);
        ctx.save();
        ctx.strokeStyle = `rgba(139,92,246,${(0.6 + 0.4 * _ymPulse) * (1 - _progress * 0.3)})`;
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 14; }
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2 + 9 + _progress * 6, 0, Math.PI * 2 * _progress);
        ctx.stroke();
        ctx.restore();
    }

    // Divine Fate (than_menh): stone overlay on frozen enemies
    if (enemy._thanMenhFrozen && !enemy.type.startsWith('enemy_bullet')) {
        const _sNow = performance.now();
        const _sPulse = 0.65 + 0.15 * Math.sin(_sNow / 300);
        const _sr = enemy.size / 2 + 3;
        ctx.save();
        ctx.globalAlpha = _sPulse * 0.72;
        ctx.fillStyle = '#9e9e8a';
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, _sr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#5a5a4a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(enemy.x - _sr * 0.3, enemy.y - _sr * 0.55);
        ctx.lineTo(enemy.x + _sr * 0.15, enemy.y + _sr * 0.1);
        ctx.lineTo(enemy.x - _sr * 0.1, enemy.y + _sr * 0.5);
        ctx.moveTo(enemy.x + _sr * 0.2, enemy.y - _sr * 0.4);
        ctx.lineTo(enemy.x + _sr * 0.45, enemy.y + _sr * 0.35);
        ctx.stroke();
        ctx.restore();
    }
}


function _drawEmbryo(enemy) {
    const now = performance.now();
    const pulse = Math.abs(Math.sin(now / 150)) * 3;

    // outer membrane glow
    ctx.save();
    ctx.fillStyle = 'rgba(138,43,226,0.18)';
    if (!_mobPerf) ctx.shadowColor = '#FF00FF'; if (!_mobPerf) ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.size + 5 + pulse, enemy.size + 9 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // main body
    ctx.save();
    const eg = ctx.createRadialGradient(enemy.x - enemy.size * 0.2, enemy.y - enemy.size * 0.2, 0,
        enemy.x, enemy.y, enemy.size + pulse);
    eg.addColorStop(0, '#df88ff');
    eg.addColorStop(0.4, '#8A2BE2');
    eg.addColorStop(0.8, '#4a0080');
    eg.addColorStop(1, 'rgba(30,0,60,0.6)');
    ctx.fillStyle = eg;
    if (!_mobPerf) ctx.shadowColor = '#FF00FF'; if (!_mobPerf) ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.size - 2 + pulse, enemy.size + 2 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // internal vein lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,100,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.size * 0.4, enemy.y - enemy.size * 0.3);
    ctx.quadraticCurveTo(enemy.x, enemy.y + enemy.size * 0.2, enemy.x + enemy.size * 0.5, enemy.y - enemy.size * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.size * 0.2, enemy.y + enemy.size * 0.4);
    ctx.quadraticCurveTo(enemy.x + enemy.size * 0.1, enemy.y - enemy.size * 0.1, enemy.x + enemy.size * 0.3, enemy.y + enemy.size * 0.3);
    ctx.stroke();
    ctx.restore();
}

function _drawEnemyBullet(enemy) {
    const now = performance.now();
    ctx.save();
    const isLarge = enemy.type === 'enemy_bullet_large';
    const isSmall = enemy.type === 'enemy_bullet_small';

    // LOW (tier 2+): flat circle only, no gradient, no glow, no blink
    if (_mobPerf) {
        ctx.fillStyle = isLarge ? '#dd4400' : '#cc0000';
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
    }

    // Motion trail (HIGH only)
    if (_gfxLevel < 1 && (enemy.vx || enemy.vy)) {
        const spd = Math.hypot(enemy.vx, enemy.vy) || 1;
        const ndx = -enemy.vx / spd, ndy = -enemy.vy / spd;
        for (let t = 1; t <= 3; t++) {
            const tx = enemy.x + ndx * enemy.size * t * 1.5;
            const ty = enemy.y + ndy * enemy.size * t * 1.5;
            ctx.globalAlpha = 0.22 / t;
            ctx.fillStyle = isLarge ? 'rgba(255,100,20,1)' : 'rgba(220,0,0,1)';
            ctx.beginPath(); ctx.arc(tx, ty, Math.max(1, enemy.size * (1 - t * 0.25)), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // White outline: blink only at FULL quality
    const blink = _gfxLevel >= 2 ? 0.78 : (0.55 + 0.45 * Math.sin(now / 90));
    ctx.strokeStyle = `rgba(255,255,255,${blink})`;
    ctx.lineWidth = isLarge ? 2.5 : 1.8;
    if (_gfxLevel < 1) ctx.shadowColor = 'white';
    if (_gfxLevel < 1) ctx.shadowBlur = isLarge ? 12 : 8;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size + 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // outer faint corona, FULL quality only
    if (_gfxLevel < 1) {
        ctx.fillStyle = isLarge ? 'rgba(255,100,20,0.22)' : 'rgba(220,0,0,0.2)';
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // main body gradient
    const bg = ctx.createRadialGradient(enemy.x - enemy.size * 0.25, enemy.y - enemy.size * 0.25, 0, enemy.x, enemy.y, enemy.size);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.25, isLarge ? '#ffaa33' : '#ff4400');
    bg.addColorStop(0.65, isLarge ? '#dd4400' : '#cc0000');
    bg.addColorStop(1, isLarge ? 'rgba(120,30,0,0.8)' : 'rgba(100,0,0,0.8)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.fill();
    // rim stroke
    ctx.strokeStyle = isLarge ? 'rgba(255,150,50,0.7)' : 'rgba(255,60,20,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.stroke();
    if (isLarge) {
        const ig = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 0.42);
        ig.addColorStop(0, 'rgba(255,240,100,0.95)');
        ig.addColorStop(1, 'rgba(255,140,0,0.5)');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 0.42, 0, Math.PI * 2); ctx.fill();
    }
    // glint, FULL quality only
    if (_gfxLevel < 1) {
        ctx.fillStyle = 'rgba(255,255,200,0.4)';
        ctx.beginPath(); ctx.ellipse(enemy.x - enemy.size * 0.28, enemy.y - enemy.size * 0.28, enemy.size * 0.2, enemy.size * 0.12, -0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Marchosias

function _drawVulnerabilityIcon(enemy) {
    const now = performance.now();
    const stacks = enemy.vulnStacks || 0;
    const remaining = Math.max(0, (enemy.vulnEndTime - now) / 3000); // 0..1

    // Icon đặt phía trên enemy, offset sang phải nếu có soulReaver
    const iconX = enemy.soulReaver ? enemy.x + 14 : enemy.x;
    const iconY = enemy.y - (enemy.size || 20) - 28;
    const R = 11; // bán kính icon

    ctx.save();
    ctx.translate(iconX, iconY);

    // Pulse scale nhẹ
    const pulse = 0.97 + 0.03 * Math.sin(now / 200);
    ctx.scale(pulse, pulse);

    // Nền tròn tối
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,0,3,0.82)';
    ctx.fill();

    // Viền đỏ + glow
    ctx.strokeStyle = '#ff1a40';
    ctx.lineWidth = 1.8;
    if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // LED dots top & bottom (từ design)
    for (const [lx, ly] of [[0, -R + 1.5], [0, R - 1.5]]) {
        ctx.fillStyle = '#ff1a40';
        if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Trái tim bị chẻ đôi (hai nửa lệch nhau)
    // Vẽ heart path bằng bezier, clip thành 2 nửa, dịch chúng ra
    const drawHeart = (clipLeft) => {
        ctx.save();
        // Clip nửa trái hoặc phải
        ctx.beginPath();
        if (clipLeft) ctx.rect(-R, -R, R * 0.92, R * 2);
        else ctx.rect(-R * 0.08, -R, R * 1.1, R * 2);
        ctx.clip();

        // Offset lệch nhau
        const ox = clipLeft ? -1.5 : 1.5;
        const oy = clipLeft ? -1 : 1;
        ctx.translate(ox, oy);

        // Heart shape
        const s = 0.45;
        ctx.beginPath();
        ctx.moveTo(0, 2 * s);
        ctx.bezierCurveTo(-8 * s, -2 * s, -10 * s, -8 * s, 0, -8 * s);
        ctx.bezierCurveTo(10 * s, -8 * s, 8 * s, -2 * s, 0, 2 * s);
        ctx.bezierCurveTo(-4 * s, 5 * s, -8 * s, 7 * s, 0, 11 * s);
        ctx.bezierCurveTo(8 * s, 7 * s, 4 * s, 5 * s, 0, 2 * s);
        ctx.closePath();

        // Kim loại tối + ánh đỏ
        const grad = ctx.createRadialGradient(-1, -2, 0, 0, 0, 9 * s);
        grad.addColorStop(0, '#3a2a2e');
        grad.addColorStop(0.5, '#2a1c20');
        grad.addColorStop(1, '#150a0c');
        ctx.fillStyle = grad;
        if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Mạch điện mờ (circuit lines)
        ctx.strokeStyle = 'rgba(255,26,64,0.25)';
        ctx.lineWidth = 0.5;
        for (let ci = -8; ci <= 8; ci += 4) {
            ctx.beginPath();
            ctx.moveTo(ci * s, -9 * s); ctx.lineTo(ci * s, 11 * s);
            ctx.stroke();
        }

        // Viền sáng đỏ ở mép cắt
        ctx.strokeStyle = clipLeft ? '#ff1a40' : 'rgba(255,100,80,0.6)';
        ctx.lineWidth = clipLeft ? 1.5 : 0.8;
        if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(0, -9 * s); ctx.lineTo(0, 11 * s);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();
    };

    drawHeart(true);
    drawHeart(false);

    // Dấu X neon laser
    const xFlare = 0.7 + 0.3 * Math.sin(now / 120);
    if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 10 * xFlare;

    // Line 1: dài hơn, góc -45°
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    const lg1 = ctx.createLinearGradient(-R * 0.85, 0, R * 0.85, 0);
    lg1.addColorStop(0, 'rgba(255,255,255,0.9)');
    lg1.addColorStop(0.5, '#ff1a40');
    lg1.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.strokeStyle = lg1; ctx.lineWidth = 2.2 * xFlare;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R * 0.85, 0); ctx.lineTo(R * 0.85, 0); ctx.stroke();
    ctx.restore();

    // Line 2: ngắn hơn, góc +45°
    ctx.save();
    ctx.rotate(Math.PI / 4);
    const lg2 = ctx.createLinearGradient(-R * 0.65, 0, R * 0.65, 0);
    lg2.addColorStop(0, 'rgba(255,255,255,0.85)');
    lg2.addColorStop(0.5, '#ff1a40');
    lg2.addColorStop(1, 'rgba(255,255,255,0.85)');
    ctx.strokeStyle = lg2; ctx.lineWidth = 1.7 * xFlare;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R * 0.65, 0); ctx.lineTo(R * 0.65, 0); ctx.stroke();
    ctx.restore();

    ctx.shadowBlur = 0;

    // Tia lửa tại giao điểm X
    for (let si = 0; si < 4; si++) {
        const sa = (now / 300 + si * Math.PI / 2);
        const sd = 3.5 + 2 * Math.abs(Math.sin(now / 80 + si));
        const sparkA = 0.5 + 0.5 * Math.abs(Math.sin(now / 100 + si * 1.3));
        ctx.fillStyle = `rgba(255,${180 + si * 20},${80 + si * 30},${sparkA})`;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sd * 0.4, Math.sin(sa) * sd * 0.4, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Stack indicator + cooldown ring
    // Cooldown ring (depletes counterclockwise)
    ctx.strokeStyle = `rgba(255,26,64,${0.4 + 0.3 * remaining})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, R + 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
    ctx.stroke();

    // Roman numeral stack count — bottom-right corner of the ring
    if (stacks > 0) {
        const _romans = ['I', 'II', 'III', 'IV'];
        const _rx = R * 0.72, _ry = R * 0.82;
        ctx.save();
        ctx.beginPath(); ctx.arc(_rx, _ry, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,0,2,0.9)'; ctx.fill();
        ctx.font = 'bold 7px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = stacks === 4 ? '#ff6680' : '#ff3355';
        if (!_mobPerf) { ctx.shadowColor = '#ff1a40'; ctx.shadowBlur = 5; }
        ctx.fillText(_romans[stacks - 1], _rx, _ry);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Stack dots dưới icon
    for (let s = 0; s < 3; s++) {
        const filled = s < stacks;
        ctx.beginPath();
        ctx.arc(-4 + s * 4, R + 5, 2, 0, Math.PI * 2);
        ctx.fillStyle = filled ? '#ff1a40' : 'rgba(255,26,64,0.25)';
        if (filled) { if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 5; }
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Sword queue counter (green) + cycle counter (gold) — always visible while barrier alive
    {
        const queueCount = (enemy.marchosiasWindups || []).length;
        const romans = ['·', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        const roman = romans[Math.min(queueCount, romans.length - 1)];
        const yOff = R + 22;
        ctx.save();
        if (queueCount > 0) {
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10; }
            ctx.fillStyle = '#00ff88';
        } else {
            ctx.fillStyle = 'rgba(0,255,136,0.35)';
        }
        ctx.font = `bold ${Math.max(11, Math.floor(R * 0.28))}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roman, 0, yOff);
        ctx.restore();
    }
    // Cycle sword counter (I–IV) in gold — visible only while barrier is alive
    if (enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
        const cycleCount = enemy._barrierSwordsThisCycle || 0;
        if (cycleCount > 0) {
            const cycleRomans = ['I', 'II', 'III', 'IV'];
            const cycleRoman = cycleRomans[Math.min(cycleCount - 1, 3)];
            const atFull = cycleCount >= 4;
            ctx.save();
            if (atFull) {
                if (!_mobPerf) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 12; }
                ctx.fillStyle = '#ffaa00';
            } else {
                ctx.fillStyle = `rgba(255,170,0,${0.3 + cycleCount * 0.15})`;
            }
            ctx.font = `bold ${Math.max(9, Math.floor(R * 0.22))}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cycleRoman, 0, R + 36);
            ctx.restore();
        }
    }

    ctx.restore();
}


function _drawCoronationEffect(enemy) {
    const now = performance.now();
    const progress = Math.min(1, enemy.coronationTimer / enemy.coronationDuration);
    const r = enemy.size;

    // Sky lightning bolt: golden bolt raining from top of screen (last 30% only)
    if (progress > 0.70) {
        const boltFlicker = 0.5 + 0.5 * Math.abs(Math.sin(now / 60));
        const boltAlpha = Math.min(1, progress * 4) * boltFlicker;
        ctx.save();
        ctx.globalAlpha = boltAlpha;
        if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 24; }
        // Glow halo pass
        ctx.strokeStyle = 'rgba(255,200,0,0.30)';
        ctx.lineWidth = 12;
        _drawLightningBolt(ctx, enemy.x, 0, enemy.x, enemy.y, 5, 34);
        // Main gold bolt
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        _drawLightningBolt(ctx, enemy.x, 0, enemy.x, enemy.y, 7, 22);
        // White core
        ctx.globalAlpha = boltAlpha * 0.7;
        ctx.strokeStyle = '#fffde7';
        ctx.lineWidth = 1;
        _drawLightningBolt(ctx, enemy.x, 0, enemy.x, enemy.y, 7, 16);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Expanding golden aura rings
    for (let k = 0; k < 3; k++) {
        const ringPhase = ((now / 400) + k / 3) % 1;
        const ringR = r * (1.0 + ringPhase * 2.2);
        const ringAlpha = (1 - ringPhase) * 0.7 * (0.5 + 0.5 * progress);
        ctx.globalAlpha = ringAlpha;
        if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18; }
        ctx.strokeStyle = `rgba(255,215,0,${0.9 * (1 - ringPhase)})`;
        ctx.lineWidth = 2.5 * (1 - ringPhase * 0.6);
        ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Golden lightning bolts (4-6 jagged bolts radiating out)
    const boltCount = _mobPerf ? 3 : 6;
    for (let b = 0; b < boltCount; b++) {
        const baseAngle = (b / boltCount) * Math.PI * 2 + (now / 300);
        const boltLen = r * (1.4 + Math.random() * 1.2);
        const segments = 5;
        ctx.save();
        ctx.rotate(baseAngle);
        if (!_mobPerf) { ctx.shadowColor = '#fff176'; ctx.shadowBlur = 14; }
        ctx.strokeStyle = `rgba(255,215,0,${0.7 + 0.3 * Math.sin(now / 80 + b)})`;
        ctx.lineWidth = 1.5 + Math.random() * 1.5;
        ctx.beginPath();
        let cx2 = 0, cy2 = r * 0.5;
        ctx.moveTo(cx2, cy2);
        for (let seg = 0; seg < segments; seg++) {
            cx2 += (Math.random() - 0.5) * r * 0.4;
            cy2 += (boltLen - r * 0.5) / segments;
            ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Gold flash body overlay
    const flashAlpha = 0.35 + 0.35 * Math.sin(now / 60);
    ctx.globalAlpha = flashAlpha;
    if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 22; }
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // CORONATION label
    ctx.fillStyle = '#fff176';
    ctx.font = `bold ${Math.ceil(9 + progress * 3)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10; }
    ctx.fillText('CORONATION', 0, -r - 6);
    ctx.shadowBlur = 0;

    ctx.restore();
}

function _drawNormalEnemy(enemy) {
    // Coronation overrides normal rendering
    if (enemy.inCoronation) {
        _drawCoronationEffect(enemy);
        return;
    }

    const now = performance.now();
    const hpRatio = enemy.hp / enemy.maxHp;
    const hue = 10 + hpRatio * 40; // 50=orange, 10=red
    const glowColor = `hsl(${hue},100%,55%)`;
    const darkColor = `hsl(${hue},90%,25%)`;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const r = enemy.size;

    // 1. Warning aura
    ctx.fillStyle = `hsla(${hue},100%,50%,0.15)`;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();

    // 2. Rotating body + clamps
    ctx.save();
    ctx.rotate(now / 1800);

    // Hex frame
    // Hex rim glow (HIGH only)
    if (_gfxLevel < 1) {
        const rimPulse = 0.5 + 0.5 * Math.sin(now / 260 + enemy.x * 0.04);
        ctx.strokeStyle = `hsla(${hue},100%,65%,${0.45 * rimPulse})`;
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14; }
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            i === 0 ? ctx.moveTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3))
                    : ctx.lineTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3));
        }
        ctx.closePath(); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#181822';
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Inner counter-rotating energy ring (HIGH only)
    if (_gfxLevel < 1) {
        ctx.rotate(-now / 2200); // counter-rotate inside the main body rotation
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const lx = Math.cos(a) * r * 0.72;
            const ly = Math.sin(a) * r * 0.72;
            const nextA = ((i + 1) / 6) * Math.PI * 2;
            const nx = Math.cos(nextA) * r * 0.72;
            const ny = Math.sin(nextA) * r * 0.72;
            const sA = 0.18 + 0.22 * Math.abs(Math.sin(now / 400 + i));
            ctx.strokeStyle = `hsla(${hue},100%,70%,${sA})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(nx, ny); ctx.stroke();
        }
        ctx.rotate(now / 2200); // undo counter-rotation so clamps stay correct
    }

    // 3 armored clamps
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i / 3) * Math.PI * 2 + Math.PI / 6);
        ctx.fillStyle = '#22222e';
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.25);
        ctx.lineTo(r * 1.1, -r * 0.15);
        ctx.lineTo(r * 1.1, r * 0.15);
        ctx.lineTo(r * 0.5, r * 0.25);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = darkColor; ctx.lineWidth = 2; ctx.stroke();
        // Glow slit
        ctx.fillStyle = glowColor;
        ctx.fillRect(r * 0.85, -r * 0.05, r * 0.2, r * 0.1);
        ctx.restore();
    }
    ctx.restore();

    // 3. Eye (non-rotating, pulsing)
    const pulse = 0.8 + 0.2 * Math.sin(now / 150 + enemy.x);
    const eyeR = r * 0.5;
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath(); ctx.arc(0, 0, eyeR * 1.1, 0, Math.PI * 2); ctx.fill();
    const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeR * pulse);
    eyeGrad.addColorStop(0, '#ffffff');
    eyeGrad.addColorStop(0.3, glowColor);
    eyeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeGrad;
    if (!_mobPerf) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(0, 0, eyeR * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Pupil
    ctx.fillStyle = '#050508';
    ctx.beginPath(); ctx.arc(0, 0, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = glowColor; ctx.lineWidth = 1; ctx.stroke();
    // iris lines (HIGH only)
    if (_gfxLevel < 1) {
        ctx.strokeStyle = `hsla(${hue},100%,70%,0.30)`;
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 8; i++) {
            const ia = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ia) * eyeR * 0.28, Math.sin(ia) * eyeR * 0.28);
            ctx.lineTo(Math.cos(ia) * eyeR * 0.85, Math.sin(ia) * eyeR * 0.85);
            ctx.stroke();
        }
    }

    // Damage cracks (HIGH only, hp < 50%)
    if (_gfxLevel < 1 && hpRatio < 0.5) {
        const crackIntensity = (0.5 - hpRatio) * 2; // 0→1 as hp goes 50%→0%
        ctx.save();
        ctx.rotate(now / 4000); // very slow rotation with body
        const crackCount = hpRatio < 0.25 ? 6 : 4;
        ctx.strokeStyle = `rgba(255,50,0,${Math.min(0.9, crackIntensity * 0.85)})`;
        ctx.lineWidth = 1.3;
        if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 7; }
        for (let c = 0; c < crackCount; c++) {
            const ca = (c / crackCount) * Math.PI * 2 + c * 0.37;
            const cLen = r * (0.38 + 0.52 * (((c * 7 + 3) % 5) / 4));
            const midX = Math.cos(ca + 0.55) * cLen * 0.42;
            const midY = Math.sin(ca + 0.55) * cLen * 0.42;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(midX, midY);
            ctx.lineTo(Math.cos(ca) * cLen, Math.sin(ca) * cLen);
            ctx.stroke();
        }
        // secondary orange cracks at critical HP
        if (hpRatio < 0.25) {
            const critI = (0.25 - hpRatio) * 4;
            ctx.strokeStyle = `rgba(255,160,0,${Math.min(0.75, critI * 0.6)})`;
            ctx.lineWidth = 0.9;
            if (!_mobPerf) ctx.shadowColor = '#ffaa00';
            for (let c = 0; c < 3; c++) {
                const ca = (c / 3) * Math.PI * 2 + 0.9;
                const cLen = r * (0.55 + 0.3 * (c / 3));
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ca + 0.4) * cLen * 0.5, Math.sin(ca + 0.4) * cLen * 0.5);
                ctx.lineTo(Math.cos(ca) * cLen, Math.sin(ca) * cLen);
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();
}

// Charge effect
