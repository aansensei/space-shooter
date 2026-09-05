// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/enemy-marchosias.js — extracted from render.js (main body, minion,
// death-sword blade). Three separate ranges in the original file, reassembled here.

// Commissioned hexagonal armor-plate texture for the body's own fill, which
// used to be a completely flat #1a1a2e - every other detail here (core,
// gear-teeth ring, panel outlines) is drawn on top of this same way it was
// drawn on top of the flat fill before. Pointy-top orientation (vertex at
// top and bottom), matching this file's own hexagon vertex math exactly, so
// no extra rotation is needed to line the two up.
const _marchoHexArmorImg = new Image();
_marchoHexArmorImg.src = 'assets/images/game/enemies/marchosias-hexagon-armor.png';
_marchoHexArmorImg.decode().catch(() => {});

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

    // Core clock pulse: a sharp digital spike that decays fast (capacitor-
    // discharge curve), not a smooth sine wave - this is what makes the core
    // and the circuit lines below read as an electric pulse rather than an
    // organic breathing glow.
    const CORE_TICK_MS = 1000;
    const _tickPhase = (now % CORE_TICK_MS) / CORE_TICK_MS;
    const _tickPulse = Math.exp(-_tickPhase * 6);

    // Hexagon body (6-sided like ref image)
    ctx.strokeStyle = '#00cc66'; ctx.lineWidth = 2;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    // Textured armor panel is FULL+MED only - the flat fill above is already
    // the LOW/MIN/PER look, so skipping the clip+drawImage there is a free
    // perf win with no visible fallback code needed.
    if (!_mobPerf && _marchoHexArmorImg.complete && _marchoHexArmorImg.naturalWidth > 0) {
        ctx.save();
        ctx.clip();
        // Vertex-to-vertex height is 2r, flat-side-to-flat-side width is
        // r*sqrt(3) for this same pointy-top hexagon - matching the image's
        // own aspect ratio instead of stretching it into the bounding square.
        const armorH = r * 2, armorW = r * Math.sqrt(3);
        ctx.drawImage(_marchoHexArmorImg, -armorW / 2, -armorH / 2, armorW, armorH);
        ctx.restore();
    }
    ctx.stroke();

    if (_gfxLevel < 1) {
        // Extra neon bloom on the hull outline, HIGH only
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,150,0.35)';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 16;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Inner triangle frame doubles as the core's circuit traces, so its glow
    // pulses on the same clock as the core instead of sitting static. Each
    // trace also gets a perpendicular stub branch and via-pad dots, PCB-style
    // - all plain fills/strokes with no shadowBlur, so every tier keeps them;
    // only the glow behind the line is reserved for FULL+MED.
    ctx.strokeStyle = `rgba(0,220,120,${0.5 + _tickPulse * 0.4})`; ctx.lineWidth = 1;
    if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = _tickPulse * 7; }
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 6;
        const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        const midX = ex * 0.55, midY = ey * 0.55;
        const perpA = a + Math.PI / 2;
        const stubLen = r * 0.14;
        ctx.beginPath();
        ctx.moveTo(midX - Math.cos(perpA) * stubLen, midY - Math.sin(perpA) * stubLen);
        ctx.lineTo(midX + Math.cos(perpA) * stubLen, midY + Math.sin(perpA) * stubLen);
        ctx.stroke();
        ctx.fillStyle = `rgba(150,255,200,${0.5 + _tickPulse * 0.5})`;
        ctx.beginPath(); ctx.arc(midX, midY, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

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

    // Core gem: ghost-electric CPU pulse - the orb swells on the clock
    // spike, an oscilloscope-style ring wobbles around it, and a handful of
    // lightning branches jut out and fade before the next tick.
    const _coreR = r * 0.32 * (1 + _tickPulse * 0.22);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, _coreR);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.35, '#aaffdd');
    coreGrad.addColorStop(0.7, '#00ff88');
    coreGrad.addColorStop(1, '#004422');
    ctx.fillStyle = coreGrad;
    if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14 + _tickPulse * 16; }
    ctx.beginPath(); ctx.arc(0, 0, _coreR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Waveform ring: a wobbling closed loop around the core, like a live
    // oscilloscope trace synced to the same clock as the core. Plain stroke,
    // no shadowBlur, so it stays on every tier down to MIN.
    ctx.save();
    ctx.strokeStyle = `rgba(160,255,215,${0.35 + _tickPulse * 0.5})`;
    ctx.lineWidth = 1.2;
    const waveR = r * 0.44;
    const waveSegs = 24;
    ctx.beginPath();
    for (let i = 0; i <= waveSegs; i++) {
        const wa = (i / waveSegs) * Math.PI * 2;
        const wobble = Math.sin(wa * 6 + now / 90) * (1.5 + _tickPulse * 2.5);
        const wr = waveR + wobble;
        const wx = Math.cos(wa) * wr, wy = Math.sin(wa) * wr;
        i === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (!_mobPerf) {
        // Bloom halo: a gradient fill, no shadowBlur - cheap enough for
        // FULL+MED even though the shadowBlur-heavy motes below are FULL-only
        ctx.save();
        const haloR = _coreR * 1.8;
        const bloomG = ctx.createRadialGradient(0, 0, _coreR * 0.6, 0, 0, haloR);
        bloomG.addColorStop(0, `rgba(150,255,210,${0.25 + _tickPulse * 0.35})`);
        bloomG.addColorStop(1, 'rgba(150,255,210,0)');
        ctx.fillStyle = bloomG;
        ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Lightning branches: fixed count per tick, seeded by the tick index
        // so each branch holds its shape for the whole tick instead of
        // jittering every frame, fading out with the same decay as the pulse
        const _tickIndex = Math.floor(now / CORE_TICK_MS);
        const _branchCount = _gfxLevel < 1 ? 7 : 4;
        ctx.save();
        ctx.strokeStyle = `rgba(215,255,235,${_tickPulse * 0.85})`;
        ctx.lineWidth = 1.3;
        ctx.shadowColor = '#aaffcc'; ctx.shadowBlur = 8 * _tickPulse;
        for (let bi = 0; bi < _branchCount; bi++) {
            const seed = Math.abs(Math.sin(_tickIndex * 91.7 + bi * 13.1)) % 1;
            let px = 0, py = 0, pa = seed * Math.PI * 2;
            const branchLen = r * (0.45 + 0.35 * seed);
            ctx.beginPath(); ctx.moveTo(px, py);
            for (let s = 0; s < 3; s++) {
                pa += (seed * 12.9 % 1 - 0.5) * 0.9;
                px += Math.cos(pa) * (branchLen / 3);
                py += Math.sin(pa) * (branchLen / 3);
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        if (_gfxLevel < 1) {
            // Orbiting spark motes, HIGH only - the shadowBlur per mote is
            // the one part of this cluster too costly for MED
            ctx.save();
            ctx.fillStyle = `rgba(220,255,240,${0.7 + _tickPulse * 0.3})`;
            ctx.shadowColor = '#c8ffe6'; ctx.shadowBlur = 6;
            for (let mo = 0; mo < 6; mo++) {
                const moA = now / 700 + (mo / 6) * Math.PI * 2;
                const moR = r * 0.4 + Math.sin(now / 220 + mo) * r * 0.03;
                ctx.beginPath();
                ctx.arc(Math.cos(moA) * moR, Math.sin(moA) * moR, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

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

    // ARC BARRIER (¼ circle arc, rotates around Marchosias) - a paneled
    // energy forcefield made of individual plate cells with HUD-style
    // corner brackets at both tips, instead of one flat glowing bar
    if (enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
        const shieldR = r + 16;
        const sa = enemy.arcBarrier.angle - Math.PI / 4;
        const ea = enemy.arcBarrier.angle + Math.PI / 4;
        const shieldPct = enemy.arcBarrier.hp / enemy.arcBarrier.maxHp;
        const bandHalf = 7;

        ctx.save();
        // Outer ambient glow
        ctx.strokeStyle = `rgba(0,255,136,${0.25 + shieldPct * 0.25})`;
        ctx.lineWidth = 20;
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 22; }
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR, sa, ea); ctx.stroke();
        ctx.shadowBlur = 0;

        // Plate cells: small trapezoid segments with a thin gap between
        // each, every plate lit by its own radial gradient so the band
        // reads as cellular armor plating rather than one flat bar
        const plateCount = 7, gapFrac = 0.12;
        const innerR = shieldR - bandHalf, outerR = shieldR + bandHalf;
        for (let pi = 0; pi < plateCount; pi++) {
            const t0 = pi / plateCount, t1 = (pi + 1) / plateCount;
            const gap = (t1 - t0) * gapFrac;
            const pa0 = sa + (ea - sa) * (t0 + gap / 2);
            const pa1 = sa + (ea - sa) * (t1 - gap / 2);

            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, outerR, pa0, pa1);
            ctx.arc(enemy.x, enemy.y, innerR, pa1, pa0, true);
            ctx.closePath();

            if (!_mobPerf) {
                const midA = (pa0 + pa1) / 2;
                const plateGrad = ctx.createLinearGradient(
                    enemy.x + Math.cos(midA) * innerR, enemy.y + Math.sin(midA) * innerR,
                    enemy.x + Math.cos(midA) * outerR, enemy.y + Math.sin(midA) * outerR
                );
                plateGrad.addColorStop(0, `rgba(0,120,80,${0.5 + shieldPct * 0.3})`);
                plateGrad.addColorStop(0.5, `rgba(160,255,200,${0.75 + shieldPct * 0.2})`);
                plateGrad.addColorStop(1, `rgba(0,120,80,${0.5 + shieldPct * 0.3})`);
                ctx.fillStyle = plateGrad;
            } else {
                ctx.fillStyle = `rgba(120,255,190,${0.6 + shieldPct * 0.2})`;
            }
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.65)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Crisp inner/outer rim lines binding the plates into one band
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, innerR, sa, ea); ctx.stroke();
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, outerR, sa, ea); ctx.stroke();

        if (!_mobPerf) {
            // Soft energy scan sweeping back and forth along the band
            const scanA = sa + (ea - sa) * (0.5 + 0.5 * Math.sin(now / 550));
            const scanX = enemy.x + Math.cos(scanA) * shieldR, scanY = enemy.y + Math.sin(scanA) * shieldR;
            const scanGrad = ctx.createRadialGradient(scanX, scanY, 0, scanX, scanY, 20);
            scanGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
            scanGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = scanGrad;
            ctx.beginPath(); ctx.arc(scanX, scanY, 20, 0, Math.PI * 2); ctx.fill();
        }

        // HUD corner brackets at both tips - a classic sci-fi forcefield-
        // boundary tell, replacing the old loose spark lines
        for (let tip = 0; tip < 2; tip++) {
            const tipA = tip === 0 ? sa : ea;
            const s = tip === 0 ? 1 : -1;
            const tanX = -Math.sin(tipA) * s, tanY = Math.cos(tipA) * s;
            const radX = Math.cos(tipA), radY = Math.sin(tipA);
            const tx2 = enemy.x + radX * shieldR, ty2 = enemy.y + radY * shieldR;
            ctx.strokeStyle = `rgba(200,255,225,${0.7 + 0.3 * Math.sin(now / 120 + tip)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tx2 + tanX * 10, ty2 + tanY * 10);
            ctx.lineTo(tx2, ty2);
            ctx.lineTo(tx2 + radX * 9, ty2 + radY * 9);
            ctx.stroke();
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

        // Charge-up: the core itself is what's drawing in power - inbound
        // particles and a tightening flash, both in the core's own
        // ghost-electric green rather than the blade's orange, since this
        // is energy gathering INTO the core right before it launches
        if (blade.delay != null && blade.delay < 320) {
            const chargeP = 1 - Math.max(0, blade.delay) / 320;
            ctx.globalAlpha = 1;
            const pCount = 8;
            ctx.fillStyle = `rgba(170,255,221,${0.5 + chargeP * 0.5})`;
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8; }
            for (let pi = 0; pi < pCount; pi++) {
                const pa = (pi / pCount) * Math.PI * 2 + now / 220;
                const pr = (1 - chargeP) * 50 + 6;
                ctx.beginPath();
                ctx.arc(Math.cos(pa) * pr, Math.sin(pa) * pr, 1.6 + chargeP * 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            const glowR = 4 + chargeP * 10;
            const chargeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            chargeGrad.addColorStop(0, `rgba(255,255,255,${0.5 + chargeP * 0.5})`);
            chargeGrad.addColorStop(0.5, `rgba(150,255,210,${(0.5 + chargeP * 0.5) * 0.7})`);
            chargeGrad.addColorStop(1, 'rgba(0,255,136,0)');
            ctx.fillStyle = chargeGrad;
            ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();
        }

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

    // Launch burst: energy release at origin when the blade fires - a fast
    // thin shockwave, a slower thick one trailing a beat behind, sparks
    // flung outward, and jagged lightning tendrils cracking off the flash
    if (blade._fireTime && now - blade._fireTime < 380) {
        const elapsed = now - blade._fireTime;
        ctx.save();

        // Green discharge right at the instant of launch - the core's own
        // energy leaving it, a beat before the blade's orange ignition below
        if (elapsed < 130) {
            const dischargeP = elapsed / 130;
            const dischargeG = ctx.createRadialGradient(blade.originX, blade.originY, 0, blade.originX, blade.originY, 8 + dischargeP * 34);
            dischargeG.addColorStop(0, `rgba(220,255,240,${(1 - dischargeP) * 0.9})`);
            dischargeG.addColorStop(0.6, `rgba(0,255,136,${(1 - dischargeP) * 0.5})`);
            dischargeG.addColorStop(1, 'rgba(0,255,136,0)');
            ctx.fillStyle = dischargeG;
            ctx.beginPath(); ctx.arc(blade.originX, blade.originY, 8 + dischargeP * 34, 0, Math.PI * 2); ctx.fill();
        }

        if (!_mobPerf) { ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 18; }

        if (elapsed < 320) {
            const prog = elapsed / 320;
            const burstAlpha = (1 - prog) * 0.9;
            const burstR = 12 + prog * 52;
            ctx.globalAlpha = burstAlpha;
            ctx.strokeStyle = 'rgba(255,190,50,0.95)';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(blade.originX, blade.originY, burstR, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = burstAlpha * 0.45;
            ctx.fillStyle = 'rgba(255,210,100,0.7)';
            ctx.beginPath(); ctx.arc(blade.originX, blade.originY, burstR * 0.5, 0, Math.PI * 2); ctx.fill();

            if (_gfxLevel < 1) {
                // Extra soft flash disk, HIGH only
                ctx.globalAlpha = (1 - prog) * 0.6;
                const flashG = ctx.createRadialGradient(blade.originX, blade.originY, 0, blade.originX, blade.originY, 70);
                flashG.addColorStop(0, 'rgba(255,255,220,0.8)');
                flashG.addColorStop(1, 'rgba(255,180,60,0)');
                ctx.fillStyle = flashG;
                ctx.beginPath(); ctx.arc(blade.originX, blade.originY, 70, 0, Math.PI * 2); ctx.fill();
            }
        }

        const lagProg = Math.max(0, (elapsed - 60) / 380);
        if (lagProg < 1) {
            ctx.globalAlpha = (1 - lagProg) * 0.5;
            ctx.strokeStyle = 'rgba(255,120,0,0.8)';
            ctx.lineWidth = 6 * (1 - lagProg * 0.5);
            ctx.beginPath(); ctx.arc(blade.originX, blade.originY, 8 + lagProg * 78, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        if (elapsed < 260) {
            const prog2 = elapsed / 260;
            const fadeA = 1 - prog2;
            ctx.save();
            // Sparks flung outward from the launch point, seeded by the
            // blade's own origin so repeated launches don't all match
            ctx.fillStyle = `rgba(255,225,140,${fadeA})`;
            if (!_mobPerf) { ctx.shadowColor = '#ffcc55'; ctx.shadowBlur = 6; }
            const _sparkCount = _gfxLevel < 1 ? 10 : 6;
            for (let sp = 0; sp < _sparkCount; sp++) {
                const sSeed = Math.abs(Math.sin(sp * 12.9 + blade.originX * 0.01 + blade.originY * 0.02)) % 1;
                const sAngle = sSeed * Math.PI * 2;
                const sDist = 10 + prog2 * (40 + sSeed * 40);
                ctx.beginPath();
                ctx.arc(blade.originX + Math.cos(sAngle) * sDist, blade.originY + Math.sin(sAngle) * sDist, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            if (!_mobPerf) {
                // Jagged lightning tendrils cracking off the flash
                ctx.strokeStyle = `rgba(255,235,180,${fadeA * 0.9})`;
                ctx.lineWidth = 1.5;
                ctx.shadowColor = '#ffdd88'; ctx.shadowBlur = 8;
                const _tendrilCount = _gfxLevel < 1 ? 8 : 5;
                for (let te = 0; te < _tendrilCount; te++) {
                    const tSeed = Math.abs(Math.sin(te * 7.3 + blade.originX * 0.03)) % 1;
                    const tLen = 20 + tSeed * 30;
                    let px = blade.originX, py = blade.originY, pa = tSeed * Math.PI * 2;
                    ctx.beginPath(); ctx.moveTo(px, py);
                    for (let s = 0; s < 3; s++) {
                        pa += (tSeed * 9.1 % 1 - 0.5) * 1.1;
                        px += Math.cos(pa) * (tLen / 3);
                        py += Math.sin(pa) * (tLen / 3);
                        ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }
            ctx.restore();
        }
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

    if (_gfxLevel < 1) {
        // Extra bloom halo around the whole arc, HIGH only
        ctx.save();
        ctx.strokeStyle = 'rgba(255,150,40,0.22)';
        ctx.lineWidth = 30;
        ctx.shadowColor = '#ff9922'; ctx.shadowBlur = 24;
        ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius, sa, ea); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Pivot hilt: small emissive core at the blade's rotation center, so it
    // reads as a spinning blade rather than a plain glowing arc band
    ctx.save();
    const hiltGrad = ctx.createRadialGradient(blade.x, blade.y, 0, blade.x, blade.y, 7);
    hiltGrad.addColorStop(0, '#fff8e0');
    hiltGrad.addColorStop(0.5, '#ffb347');
    hiltGrad.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = hiltGrad;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,140,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Serrated outer rim, teeth pointing outward along the cutting edge
    ctx.fillStyle = 'rgba(255,190,90,0.85)';
    const _teeth = 7;
    for (let ti = 0; ti <= _teeth; ti++) {
        const ta = sa + (ea - sa) * (ti / _teeth);
        const baseR = blade.radius + 1, tipR = blade.radius + 6, tw = 0.035;
        ctx.beginPath();
        ctx.moveTo(blade.x + Math.cos(ta - tw) * baseR, blade.y + Math.sin(ta - tw) * baseR);
        ctx.lineTo(blade.x + Math.cos(ta) * tipR, blade.y + Math.sin(ta) * tipR);
        ctx.lineTo(blade.x + Math.cos(ta + tw) * baseR, blade.y + Math.sin(ta + tw) * baseR);
        ctx.closePath(); ctx.fill();
    }

    // Glint: a bright highlight sweeping back and forth along the blade
    const glintA = sa + (ea - sa) * (0.5 + 0.5 * Math.sin(now / 450));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius, glintA - 0.06, glintA + 0.06); ctx.stroke();

    // Energy slash marks
    ctx.strokeStyle = `rgba(255,200,100,${0.5 + 0.4 * Math.sin(now / 60)})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const slashA = sa + (ea - sa) * ((i + 1) / 6);
        const px1 = blade.x + Math.cos(slashA) * (blade.radius - 10);
        const py1 = blade.y + Math.sin(slashA) * (blade.radius - 10);
        const px2 = blade.x + Math.cos(slashA) * (blade.radius + 10);
        const py2 = blade.y + Math.sin(slashA) * (blade.radius + 10);
        ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
    }

    // Crackling arcs jumping across the blade band - re-rolled every ~90ms
    // (seeded by that tick plus the blade's own origin, so multiple blades
    // on screen crackle independently instead of in lockstep)
    if (!_mobPerf) {
        const crackleTick = Math.floor(now / 90);
        ctx.strokeStyle = 'rgba(255,255,220,0.85)';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = '#fff3c0'; ctx.shadowBlur = 7;
        const _crackleCount = _gfxLevel < 1 ? 5 : 3;
        for (let c = 0; c < _crackleCount; c++) {
            const seed = Math.abs(Math.sin(crackleTick * 17.3 + c * 5.7 + blade.originX * 0.05)) % 1;
            const cAngle = sa + (ea - sa) * seed;
            const cAngle2 = sa + (ea - sa) * Math.min(1, seed + 0.08 + seed * 0.1);
            const rJitter = (seed - 0.5) * 8;
            const x1 = blade.x + Math.cos(cAngle) * (blade.radius + rJitter);
            const y1 = blade.y + Math.sin(cAngle) * (blade.radius + rJitter);
            const xm = blade.x + Math.cos((cAngle + cAngle2) / 2) * (blade.radius - rJitter * 1.5);
            const ym = blade.y + Math.sin((cAngle + cAngle2) / 2) * (blade.radius - rJitter * 1.5);
            const x2 = blade.x + Math.cos(cAngle2) * (blade.radius + rJitter);
            const y2 = blade.y + Math.sin(cAngle2) * (blade.radius + rJitter);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(xm, ym); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// Death burst: reactor-meltdown moment when Marchosias finally goes down -
// a blinding core-overload flash, an expanding hexagon-faceted EMP ring,
// radiating lightning, and the hull's own 6 panels breaking off and
// tumbling outward. One-shot, driven purely by burst.lifetime counting
// down from burst.maxLifetime (see marchoDeathBursts in main.js).
function _drawMarchoDeathBurst(burst) {
    const p = 1 - burst.lifetime / burst.maxLifetime;
    const r0 = burst.size / 2;
    ctx.save();
    ctx.translate(burst.x, burst.y);

    if (p < 0.22) {
        const flashP = p / 0.22;
        const flashR = r0 * (0.3 + flashP * 1.4);
        const flashG = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
        flashG.addColorStop(0, `rgba(255,255,255,${(1 - flashP) * 0.95})`);
        flashG.addColorStop(0.5, `rgba(180,255,220,${(1 - flashP) * 0.6})`);
        flashG.addColorStop(1, 'rgba(0,255,140,0)');
        ctx.fillStyle = flashG;
        ctx.beginPath(); ctx.arc(0, 0, flashR, 0, Math.PI * 2); ctx.fill();
    }

    // Fast hexagon-faceted shockwave, echoing the hull's own silhouette
    const ring1R = r0 * (0.4 + p * 2.6);
    ctx.strokeStyle = `rgba(150,255,210,${(1 - p) * 0.8})`;
    ctx.lineWidth = 3;
    if (!_mobPerf) { ctx.shadowColor = '#aaffcc'; ctx.shadowBlur = 14; }
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = Math.cos(a) * ring1R, py = Math.sin(a) * ring1R;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Slower thick round shockwave trailing behind it
    const ring2P = Math.max(0, (p - 0.1) / 0.9);
    const ring2R = r0 * (0.3 + ring2P * 3.4);
    ctx.strokeStyle = `rgba(0,255,140,${(1 - ring2P) * 0.5})`;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(0, 0, ring2R, 0, Math.PI * 2); ctx.stroke();

    if (!_mobPerf && p < 0.55) {
        // Radiating lightning discharge, fading through the first half
        const boltA = (1 - p / 0.55) * 0.9;
        ctx.strokeStyle = `rgba(215,255,235,${boltA})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#aaffcc'; ctx.shadowBlur = 10;
        for (let bi = 0; bi < 8; bi++) {
            const seed = Math.abs(Math.sin(bi * 17.7 + burst.x * 0.02)) % 1;
            let px = 0, py = 0, pa = seed * Math.PI * 2;
            const len = r0 * (0.8 + seed * 1.2) * (0.4 + p * 1.4);
            ctx.beginPath(); ctx.moveTo(px, py);
            for (let s = 0; s < 4; s++) {
                pa += (seed * 12.9 % 1 - 0.5) * 0.8;
                px += Math.cos(pa) * (len / 4);
                py += Math.sin(pa) * (len / 4);
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    // The hull's 6 panels break off and tumble outward - a direct callback
    // to the hexagon body every other Marchosias draw call builds around
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = `rgba(0,255,150,${(1 - p) * 0.9})`;
    ctx.lineWidth = 2;
    for (let sIdx = 0; sIdx < 6; sIdx++) {
        const a = (sIdx / 6) * Math.PI * 2 - Math.PI / 6;
        const flyDist = p * r0 * 2.2;
        const cx = Math.cos(a) * (r0 * 0.5 + flyDist);
        const cy = Math.sin(a) * (r0 * 0.5 + flyDist);
        const spin = a + p * (sIdx % 2 === 0 ? 4 : -4);
        const shardSize = r0 * 0.45 * (1 - p * 0.3);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.globalAlpha = 1 - p;
        ctx.beginPath();
        ctx.moveTo(-shardSize * 0.5, -shardSize * 0.35);
        ctx.lineTo(shardSize * 0.5, -shardSize * 0.2);
        ctx.lineTo(shardSize * 0.35, shardSize * 0.4);
        ctx.lineTo(-shardSize * 0.4, shardSize * 0.3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

// Arc Barrier shatter: the 90° shield band itself cracks apart the instant
// it breaks - a bright flash along the band, curved shard fragments flying
// off tangentially, and a burst of cracks radiating from the center.
// One-shot, driven by burst.lifetime (see marchoBarrierBursts in
// entities/marchosias.js's _triggerArcBarrierBreak).
function _drawMarchoBarrierBurst(burst) {
    const p = 1 - burst.lifetime / burst.maxLifetime;
    const shieldR = burst.size / 2 + 16;
    const sa = burst.angle - Math.PI / 4, ea = burst.angle + Math.PI / 4;

    // Bright flash sweeping across the band, fast fade
    if (p < 0.3) {
        const flashA = (1 - p / 0.3);
        ctx.strokeStyle = `rgba(255,255,255,${flashA * 0.9})`;
        ctx.lineWidth = 16;
        if (!_mobPerf) { ctx.shadowColor = '#aaffcc'; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.arc(burst.x, burst.y, shieldR, sa, ea); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Curved shard fragments breaking off the band and flying outward
    const shardCount = 6;
    ctx.fillStyle = `rgba(150,255,210,${(1 - p) * 0.85})`;
    ctx.strokeStyle = `rgba(255,255,255,${(1 - p) * 0.6})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < shardCount; i++) {
        const shardA = sa + (ea - sa) * ((i + 0.5) / shardCount);
        const flyDist = p * 46;
        const cx = burst.x + Math.cos(shardA) * (shieldR + flyDist);
        const cy = burst.y + Math.sin(shardA) * (shieldR + flyDist);
        const spin = shardA + p * (i % 2 === 0 ? 2.5 : -2.5);
        const shardLen = 12 * (1 - p * 0.3), shardW = 5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.beginPath();
        ctx.moveTo(-shardLen / 2, -shardW / 2);
        ctx.lineTo(shardLen / 2, -shardW / 3);
        ctx.lineTo(shardLen / 3, shardW / 2);
        ctx.lineTo(-shardLen / 2, shardW / 3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Cracks radiating outward from the barrier's own center
    if (!_mobPerf && p < 0.5) {
        const crackA = (1 - p / 0.5) * 0.8;
        ctx.strokeStyle = `rgba(220,255,240,${crackA})`;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = '#aaffcc'; ctx.shadowBlur = 8;
        for (let ci = 0; ci < 6; ci++) {
            const seed = Math.abs(Math.sin(ci * 13.7 + burst.x * 0.02)) % 1;
            const ca = sa + (ea - sa) * seed;
            let px = burst.x + Math.cos(ca) * shieldR * 0.3, py = burst.y + Math.sin(ca) * shieldR * 0.3;
            let pa = ca;
            ctx.beginPath(); ctx.moveTo(px, py);
            for (let s = 0; s < 3; s++) {
                pa += (seed * 9.7 % 1 - 0.5) * 0.7;
                const segLen = shieldR * 0.25;
                px += Math.cos(pa) * segLen;
                py += Math.sin(pa) * segLen;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }
}

