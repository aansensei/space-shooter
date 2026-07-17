// render/enemy-egregor.js — extracted from render.js (base body + Psychic
// Tempest / Null Slash telegraph and strike effects). Runs to end of original file.

function _drawEgregor(enemy) {
    const now = performance.now();
    const sc = (enemy.size / 2) / 110; // BASE_SIZE=110 in L2D
    const isRage = (enemy._rageStacks || 0) > 0;

    // Exact L2D colors
    const tentacleC = isRage ? '#880011' : '#004455';
    const strokeC   = isRage ? '#ff3300' : '#00ffaa';
    const glowC     = isRage ? '#ff3300' : '#00ffaa';

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // 0. AURA (pulsing radial, L2D: BASE*1.8 + sin/300*20)
    const auraRad = (110 * 1.8 + Math.sin(now / 300) * 20) * sc;
    const auraG = ctx.createRadialGradient(0, 0, 110 * 0.5 * sc, 0, 0, auraRad);
    auraG.addColorStop(0, isRage ? 'rgba(255,0,0,0.5)' : 'rgba(0,100,150,0.5)');
    auraG.addColorStop(1, 'transparent');
    ctx.fillStyle = auraG;
    ctx.beginPath(); ctx.arc(0, 0, auraRad, 0, Math.PI * 2); ctx.fill();

    // 1. TENTACLES, 10 × 16 segments, chain simulation
    const NUM_TENT = 10, NUM_SEG = 16;
    if (!enemy._tentacles) {
        enemy._tentacles = [];
        for (let i = 0; i < NUM_TENT; i++) {
            enemy._tentacles.push({
                baseAngle: (i / NUM_TENT) * Math.PI * 2,
                length: (150 + (i % 5) * 16) * sc,
                phase: (i * 2.39996) % (Math.PI * 2),
                speedMult: 0.8 + (i % 3) * 0.3,
            });
        }
    }
    ctx.lineCap = 'round';
    for (let _ti = 0; _ti < enemy._tentacles.length; _ti++) {
        // Skip tentacles that have been destroyed by damage
        if (enemy._tentacleHps && enemy._tentacleHps[_ti] <= 0) continue;
        const tent = enemy._tentacles[_ti];
        // Start from inside body at 0.4 × BASE_SIZE (same as L2D)
        let curX = Math.cos(tent.baseAngle) * 110 * 0.4 * sc;
        let curY = Math.sin(tent.baseAngle) * 110 * 0.4 * sc;
        let curAngle = tent.baseAngle;
        const segLen = tent.length / NUM_SEG;
        const pts = [{ x: curX, y: curY, a: curAngle }];
        const waveSpeed = isRage ? 150 : 350;
        for (let i = 0; i < NUM_SEG; i++) {
            const wave = Math.sin(now / waveSpeed * tent.speedMult + i * 0.25 + tent.phase);
            curAngle += wave * 0.2;
            curAngle = curAngle * 0.95 + tent.baseAngle * 0.05; // spring back
            curX += Math.cos(curAngle) * segLen;
            curY += Math.sin(curAngle) * segLen;
            pts.push({ x: curX, y: curY, a: curAngle });
        }
        // Taper width: 36px at root → 0 at tip (L2D: 36*(1-i/len))
        for (let i = 0; i < pts.length - 1; i++) {
            const taper = 1 - i / pts.length;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
            ctx.lineWidth = Math.max(0.5, 36 * sc * taper);
            ctx.strokeStyle = tentacleC;
            ctx.stroke();
        }
        // Suckers: perpendicular offset (L2D: size=7, offset=16, taper same), MED+
        if (_gfxLevel < 2) {
            for (let i = 2; i < pts.length - 2; i++) {
                const p = pts[i];
                const taper = 1 - i / pts.length;
                const perpX = Math.cos(p.a - Math.PI / 2);
                const perpY = Math.sin(p.a - Math.PI / 2);
                const sr = Math.max(0.5, 7 * sc * taper);
                const sx = p.x + perpX * 16 * sc * taper;
                const sy = p.y + perpY * 16 * sc * taper;
                ctx.fillStyle = isRage ? '#440000' : '#002233';
                ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = isRage ? '#ff4444' : '#00ffaa';
                ctx.beginPath(); ctx.arc(sx, sy, sr * 0.55, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    // 2. ORGANIC BODY (80-seg smooth blob, L2D noise formula)
    const BASE = 110 * sc;
    const noiseI = 8 * sc; // L2D noiseIntensity = 8
    const tdiv = isRage ? 150 : 300;
    const BSEGS = _gfxLevel < 2 ? 80 : 36;
    ctx.beginPath();
    for (let i = 0; i <= BSEGS; i++) {
        const a = (i / BSEGS) * Math.PI * 2;
        const n1 = Math.sin(a * 4 + now / tdiv) * 0.8;
        const n2 = Math.cos(a * 6 - now / (tdiv * 1.2)) * 0.5;
        const n3 = Math.sin(a * 3 + now / (tdiv * 0.8)) * 0.4;
        const r = BASE + (n1 + n2 + n3) * noiseI;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    // L2D body gradient: createRadialGradient(0,0,0, 0,0, BASE*1.2)
    const bodyG = ctx.createRadialGradient(0, 0, 0, 0, 0, BASE * 1.2);
    if (isRage) {
        bodyG.addColorStop(0, '#550000');
        bodyG.addColorStop(0.7, '#2b0000');
        bodyG.addColorStop(1, '#ff0022');
    } else {
        bodyG.addColorStop(0, '#003344');
        bodyG.addColorStop(0.7, '#001a2b');
        bodyG.addColorStop(1, '#00ffcc');
    }
    ctx.fillStyle = bodyG; ctx.fill();
    if (!_mobPerf) { ctx.shadowColor = glowC; ctx.shadowBlur = isRage ? 40 : 25; }
    ctx.strokeStyle = strokeC;
    ctx.lineWidth = (isRage ? 5 : 3) * sc;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. GILLS, 5 layers per side (MED+, quadratic bezier)
    if (_gfxLevel < 2) {
        const breathP = (Math.sin(now / 500) + 1) / 2;
        // Inner gill glow (L2D: center at y=25)
        const innerR = (30 + breathP * 15) * sc;
        const gillG2 = ctx.createRadialGradient(0, 25 * sc, 0, 0, 25 * sc, innerR);
        gillG2.addColorStop(0, isRage ? `rgba(255,50,0,${breathP})` : `rgba(0,255,200,${breathP})`);
        gillG2.addColorStop(1, 'transparent');
        ctx.fillStyle = gillG2;
        ctx.beginPath(); ctx.arc(0, 25 * sc, innerR, 0, Math.PI * 2); ctx.fill();

        for (const side of [-1, 1]) {
            for (let i = 0; i < 5; i++) {
                ctx.save();
                // L2D: translate(side*12, 10+i*12)
                ctx.translate(side * 12 * sc, (10 + i * 12) * sc);
                ctx.rotate(side * (0.2 + breathP * 0.3 + i * 0.1));
                // L2D gill flap shape
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(side * 30 * sc, -8 * sc, side * 55 * sc, 15 * sc);
                ctx.quadraticCurveTo(side * 20 * sc, 25 * sc, 0, 0);
                ctx.fillStyle = isRage ? '#660000' : '#004455';
                ctx.fill();
                if (!_mobPerf) { ctx.shadowColor = isRage ? '#ff4444' : '#00ffff'; ctx.shadowBlur = 8; }
                ctx.strokeStyle = isRage ? '#ff4444' : '#00ffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.shadowBlur = 0;
                // Gill vein line
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(side * 25 * sc, 4 * sc, side * 40 * sc, 10 * sc);
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // 4. FOUR EYES, L2D polar coords {a, d, s}
    const eyeDefs = [
        { a: -Math.PI / 3,           d: 30, s: 20 }, // large upper-right
        { a: -Math.PI * 2 / 3,       d: 30, s: 20 }, // large upper-left
        { a: -Math.PI / 6 + 0.2,     d: 55, s: 12 }, // small right
        { a: -Math.PI * 5 / 6 - 0.2, d: 55, s: 12 }, // small left
    ];
    if (!enemy._eyeBlinkTimers) enemy._eyeBlinkTimers = [0, 0, 0, 0];
    if (!enemy._eyeNextBlinks)  enemy._eyeNextBlinks  = [2000, 2800, 1500, 3500];

    for (let i = 0; i < 4; i++) {
        const eye = eyeDefs[i];
        // Eye floats in/out along its angle (L2D: eyeFloat = sin(t/500+a)*4)
        const eyeFloat = Math.sin(now / 500 + eye.a) * 4 * sc;
        const ex = Math.cos(eye.a) * (eye.d * sc + eyeFloat);
        const ey = Math.sin(eye.a) * (eye.d * sc + eyeFloat);
        const er = eye.s * sc;

        // Blink: L2D timestamp-based
        if (now > enemy._eyeBlinkTimers[i] + enemy._eyeNextBlinks[i]) {
            enemy._eyeBlinkTimers[i] = now;
            enemy._eyeNextBlinks[i] = 2000 + Math.random() * 4000;
        }
        const tSinceBlink = now - enemy._eyeBlinkTimers[i];
        let eyelidProg = 0;
        if (tSinceBlink < 150) eyelidProg = tSinceBlink / 150;
        else if (tSinceBlink < 300) eyelidProg = 1 - (tSinceBlink - 150) / 150;

        // Player tracking (L2D: pupil offset = min(hypot*0.05, maxDist))
        const ddx = player.x - enemy.x - ex;
        const ddy = player.y - enemy.y - ey;
        const aToPl = Math.atan2(ddy, ddx);
        const maxPD = er * 0.4;
        const pupilX = Math.cos(aToPl) * Math.min(Math.hypot(ddx, ddy) * 0.05, maxPD);
        const pupilY = Math.sin(aToPl) * Math.min(Math.hypot(ddx, ddy) * 0.05, maxPD);

        ctx.save();
        ctx.translate(ex, ey);

        // Clip to eye ellipse (blink squishes vertically)
        ctx.beginPath();
        ctx.ellipse(0, 0, er, er * (1 - eyelidProg * 0.9), 0, 0, Math.PI * 2);
        ctx.clip();

        // Sclera (L2D: '#f0f8ff' calm, '#ffcccc' rage)
        ctx.fillStyle = isRage ? '#ffcccc' : '#f0f8ff';
        ctx.fillRect(-er, -er, er * 2, er * 2);

        // Blood vessels, HIGH only
        if (_gfxLevel < 1) {
            ctx.strokeStyle = isRage ? '#cc0000' : '#ff9999';
            ctx.lineWidth = 0.8;
            for (let v = 0; v < 5; v++) {
                const va = (v / 5) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(va) * er, Math.sin(va) * er);
                ctx.quadraticCurveTo(
                    Math.cos(va + 0.5) * er * 0.5, Math.sin(va + 0.5) * er * 0.5,
                    Math.cos(va) * er * 0.3, Math.sin(va) * er * 0.3
                );
                ctx.stroke();
            }
        }

        // Iris radial gradient (L2D: inner=#00ffaa/#ffaa00, outer=#00aaff/#ff0000)
        const irisR = er * (isRage ? 0.7 : 0.6);
        const irisG = ctx.createRadialGradient(pupilX, pupilY, 0, pupilX, pupilY, irisR);
        irisG.addColorStop(0, isRage ? '#ffaa00' : '#00ffaa');
        irisG.addColorStop(1, isRage ? '#ff0000' : '#00aaff');
        ctx.fillStyle = irisG;
        ctx.beginPath(); ctx.arc(pupilX, pupilY, irisR, 0, Math.PI * 2); ctx.fill();

        // Iris radial fiber lines, HIGH only
        if (_gfxLevel < 1) {
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 0.5;
            for (let r2 = 0; r2 < 16; r2++) {
                const ra = (r2 / 16) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(pupilX + Math.cos(ra) * irisR * 0.3, pupilY + Math.sin(ra) * irisR * 0.3);
                ctx.lineTo(pupilX + Math.cos(ra) * irisR, pupilY + Math.sin(ra) * irisR);
                ctx.stroke();
            }
        }

        // Vertical ellipse pupil oriented toward player (L2D style)
        const pd = isRage ? 0.15 : (0.25 + Math.sin(now / 800) * 0.05);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(pupilX, pupilY, er * pd, er * (isRage ? 0.5 : pd * 1.5), aToPl, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(pupilX - er * 0.15, pupilY - er * 0.15, er * 0.12, 0, Math.PI * 2); ctx.fill();

        ctx.restore();

        // Eye rim drawn outside clip
        ctx.strokeStyle = isRage ? '#660000' : '#003344';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(ex, ey, er, er * (1 - eyelidProg * 0.9), 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 5. RAGE STACK STARS
    if ((enemy._rageStacks || 0) > 0) {
        if (!_mobPerf) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 14; }
        ctx.fillStyle = 'rgba(255,60,60,0.9)';
        for (let s = 0; s < enemy._rageStacks; s++) {
            const a = (s / 5) * Math.PI * 2 - Math.PI / 2;
            const sx = Math.cos(a) * BASE * 1.25;
            const sy = Math.sin(a) * BASE * 1.25;
            const r = 6 * sc;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.beginPath();
            for (let p = 0; p < 5; p++) {
                const outerA = (p / 5) * Math.PI * 2 - Math.PI / 2;
                const innerA = outerA + Math.PI / 5;
                if (p === 0) ctx.moveTo(Math.cos(outerA) * r, Math.sin(outerA) * r);
                else ctx.lineTo(Math.cos(outerA) * r, Math.sin(outerA) * r);
                ctx.lineTo(Math.cos(innerA) * r * 0.4, Math.sin(innerA) * r * 0.4);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    // 6. HP BAR + NAME
    const hpRatio = enemy.hp / enemy.maxHp;
    const bw = enemy.size * 1.1, bh = 5;
    ctx.fillStyle = '#111';
    ctx.fillRect(-bw / 2, -enemy.size / 2 - 14, bw, bh);
    const hpGrd = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    hpGrd.addColorStop(0, isRage ? '#ff0000' : '#00ffaa');
    hpGrd.addColorStop(1, isRage ? '#ff6600' : '#00ccaa');
    ctx.fillStyle = hpGrd;
    ctx.fillRect(-bw / 2, -enemy.size / 2 - 14, bw * hpRatio, bh);
    ctx.strokeStyle = isRage ? '#ff4400' : '#00c8b4';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-bw / 2, -enemy.size / 2 - 14, bw, bh);
    ctx.restore();
}

// Egregor effect overlays: Psychic Tempest + Null Slash
function _drawEgregorEffects() {
    const now = performance.now();
    for (const enemy of enemies) {
        if (enemy.type !== 'egregor') continue;
        const ox = enemy._tempestOriginX || enemy.x;
        const oy = enemy._tempestOriginY || enemy.y;

        // MIND LINK RANGE INDICATOR (red dashed circle 600px)
        ctx.save();
        ctx.strokeStyle = `rgba(255,30,30,${0.45 + 0.2 * Math.sin(now / 400)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([14, 9]);
        ctx.lineDashOffset = -(now / 55) % 23;
        if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 600, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.restore();

        // TEMPEST TELEGRAPHING
        if (enemy._tempestPhase === 'telegraphing') {
            for (const t of enemy._tempestTargets) {
                const progress = 1 - t.countdown / 1200; // 0→1
                const tx = t.tx, ty = t.ty;
                ctx.save();

                // Shrinking impact ring (90px → 20px), purple psychic
                const ringR = 20 + (1 - progress) * 70;
                ctx.strokeStyle = `rgba(180,60,255,${0.5 + 0.3 * Math.sin(now / 80)})`;
                ctx.lineWidth = 2.5;
                if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 14; }
                ctx.beginPath(); ctx.arc(tx, ty, ringR, 0, Math.PI * 2); ctx.stroke();
                ctx.shadowBlur = 0;

                // Dashed outer ring at 112px, slowly rotating
                ctx.strokeStyle = `rgba(140,40,255,${0.35 + 0.15 * Math.sin(now / 60)})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([8, 6]);
                ctx.lineDashOffset = -(now / 70) % 14;
                ctx.beginPath(); ctx.arc(tx, ty, 112, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                // Warning thread from Egregor to target (psychic violet)
                ctx.strokeStyle = `rgba(160,80,255,${0.22 + 0.12 * Math.sin(now / 110)})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 8]);
                ctx.lineDashOffset = -(now / 50) % 13;
                ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();
                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                // 4 inward sparks converging (MED+)
                if (_gfxLevel < 2) {
                    for (let sp = 0; sp < 4; sp++) {
                        const sAngle = (sp / 4) * Math.PI * 2 + now * 0.002;
                        const sDist = 90 * (1 - progress);
                        ctx.fillStyle = `rgba(200,100,255,${0.8 * progress})`;
                        ctx.beginPath();
                        ctx.arc(tx + Math.cos(sAngle) * sDist, ty + Math.sin(sAngle) * sDist, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Center cross at progress > 0.6
                if (progress > 0.6) {
                    const crossA = (progress - 0.6) / 0.4;
                    const crossLen = 14 * crossA;
                    if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10; }
                    ctx.strokeStyle = `rgba(230,160,255,${crossA * 0.9})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(tx - crossLen, ty); ctx.lineTo(tx + crossLen, ty);
                    ctx.moveTo(tx, ty - crossLen); ctx.lineTo(tx, ty + crossLen);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                // Area flash at progress > 0.85 (MED+)
                if (progress > 0.85 && _gfxLevel < 2) {
                    const flashA = ((progress - 0.85) / 0.15) * 0.3;
                    ctx.fillStyle = `rgba(140,0,255,${flashA})`;
                    ctx.beginPath(); ctx.arc(tx, ty, 90, 0, Math.PI * 2); ctx.fill();
                }

                ctx.restore();
            }
        }

        // TEMPEST STRIKE (psychic purple bolts, more detail than Veilshroud)
        if (enemy._tempestPhase === 'striking') {
            for (const t of enemy._tempestTargets) {
                if (!t.struck || t.strikeLife <= 0 || !t._mainBolt) continue;
                const fade = t.strikeLife / 700;
                const tx = t.tx, ty = t.ty;
                ctx.save();
                ctx.globalAlpha = fade;

                // Layer 0: wide outer aura (deep purple)
                if (!_mobPerf) { ctx.shadowColor = '#7700ff'; ctx.shadowBlur = 28; }
                ctx.strokeStyle = `rgba(100,0,220,${fade * 0.5})`;
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(t._outerBolt[0].x, t._outerBolt[0].y);
                for (let k = 1; k < t._outerBolt.length; k++) ctx.lineTo(t._outerBolt[k].x, t._outerBolt[k].y);
                ctx.stroke();

                // Layer 1: magenta mid bolt
                ctx.shadowBlur = 18;
                ctx.strokeStyle = `rgba(220,50,255,${fade * 0.8})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(t._outerBolt[0].x, t._outerBolt[0].y);
                for (let k = 1; k < t._outerBolt.length; k++) ctx.lineTo(t._outerBolt[k].x, t._outerBolt[k].y);
                ctx.stroke();

                // Layer 2: branch bolt (psychic violet)
                if (t._branchA) {
                    ctx.strokeStyle = `rgba(180,80,255,${fade * 0.7})`;
                    ctx.lineWidth = 4;
                    ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 14;
                    ctx.beginPath();
                    ctx.moveTo(t._branchA[0].x, t._branchA[0].y);
                    for (let k = 1; k < t._branchA.length; k++) ctx.lineTo(t._branchA[k].x, t._branchA[k].y);
                    ctx.stroke();
                }

                // Layer 3: main zigzag bolt (bright purple-white)
                ctx.strokeStyle = `rgba(230,160,255,${fade})`;
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.moveTo(t._mainBolt[0].x, t._mainBolt[0].y);
                for (let k = 1; k < t._mainBolt.length; k++) ctx.lineTo(t._mainBolt[k].x, t._mainBolt[k].y);
                ctx.stroke();

                // Layer 4: white-hot core bolt (thinnest)
                ctx.strokeStyle = `rgba(255,255,255,${fade * 0.95})`;
                ctx.lineWidth = 1.2;
                ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(t._thinBolt[0].x, t._thinBolt[0].y);
                for (let k = 1; k < t._thinBolt.length; k++) ctx.lineTo(t._thinBolt[k].x, t._thinBolt[k].y);
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 1;

                // Impact rings (purple)
                const prog1 = 1 - fade;
                ctx.globalAlpha = fade;
                if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 18; }
                ctx.strokeStyle = `rgba(180,0,255,${fade * 0.9})`;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(tx, ty, 6 + prog1 * 90, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = `rgba(220,120,255,${fade * 0.6})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.arc(tx, ty, 12 + prog1 * 55, 0, Math.PI * 2); ctx.stroke();
                // Inner white ring
                ctx.strokeStyle = `rgba(255,255,255,${fade * 0.35})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(tx, ty, 8 + prog1 * 30, 0, Math.PI * 2); ctx.stroke();

                // Starburst (MED+, first 150ms)
                if (t.strikeLife > 550 && _gfxLevel < 2) {
                    const sbA = (t.strikeLife - 550) / 150;
                    if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 14; }
                    ctx.strokeStyle = `rgba(200,80,255,${sbA * 0.9})`;
                    ctx.lineWidth = 1.8;
                    for (let sb = 0; sb < 12; sb++) {
                        const sbAngle = (sb / 12) * Math.PI * 2;
                        const sbLen = 28 + Math.random() * 22;
                        ctx.beginPath();
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + Math.cos(sbAngle) * sbLen, ty + Math.sin(sbAngle) * sbLen);
                        ctx.stroke();
                    }
                    // White center flash
                    ctx.strokeStyle = `rgba(255,255,255,${sbA * 0.7})`;
                    ctx.lineWidth = 1;
                    for (let sb = 0; sb < 6; sb++) {
                        const sbAngle = (sb / 6) * Math.PI * 2 + 0.26;
                        ctx.beginPath();
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + Math.cos(sbAngle) * 14, ty + Math.sin(sbAngle) * 14);
                        ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }

                // Psychic impact orb at strike point
                if (_gfxLevel < 2) {
                    const orbR = (1 - fade) * 20 + 5;
                    const orbG = ctx.createRadialGradient(tx, ty, 0, tx, ty, orbR);
                    orbG.addColorStop(0, `rgba(255,255,255,${fade * 0.8})`);
                    orbG.addColorStop(0.4, `rgba(200,80,255,${fade * 0.6})`);
                    orbG.addColorStop(1, 'rgba(80,0,180,0)');
                    ctx.fillStyle = orbG;
                    ctx.globalAlpha = fade;
                    ctx.beginPath(); ctx.arc(tx, ty, orbR, 0, Math.PI * 2); ctx.fill();
                }

                ctx.globalAlpha = 1; ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        // NULL SLASH, CHARGING (semicircle telegraph + charge glow)
        if (enemy._nullSlashPhase === 'charging') {
            const progress = Math.min(1, (enemy._nullSlashWindupTimer || 0) / (enemy._nullSlashWindupDur || 3000));
            const rageStacks = enemy._rageStacks || 0;
            const R = canvas.width * 0.5 + rageStacks * 5;
            const ang = enemy._nullSlashAngle || (Math.PI / 2);
            ctx.save();

            // Semicircle: opens toward player (arc spans ±90° around the angle to player)
            const arcStart = ang - Math.PI / 2;
            const arcEnd   = ang + Math.PI / 2;
            const curR = R * (0.3 + 0.7 * progress);

            // Outer glow fill
            if (!_mobPerf) {
                const sfg = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, curR);
                sfg.addColorStop(0, `rgba(80,0,180,${0.08 * progress})`);
                sfg.addColorStop(0.7, `rgba(120,0,220,${0.06 * progress})`);
                sfg.addColorStop(1, 'rgba(60,0,150,0)');
                ctx.fillStyle = sfg;
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
                ctx.closePath();
                ctx.fill();
            }

            // Pulsing arc border
            const pulseAlpha = 0.6 + 0.35 * Math.sin(now / 60);
            if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 20 + progress * 15; }
            ctx.strokeStyle = `rgba(160,50,255,${pulseAlpha * progress})`;
            ctx.lineWidth = 3 + progress * 4;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
            ctx.stroke();

            // Flat diameter line (the chord closing the semicircle)
            const p1x = enemy.x + Math.cos(arcStart) * curR;
            const p1y = enemy.y + Math.sin(arcStart) * curR;
            const p2x = enemy.x + Math.cos(arcEnd) * curR;
            const p2y = enemy.y + Math.sin(arcEnd) * curR;
            ctx.strokeStyle = `rgba(200,100,255,${0.5 * progress})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 7]);
            ctx.lineDashOffset = -(now / 60) % 17;
            ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0;
            ctx.shadowBlur = 0;

            // Rage: crackling void energy lines inside the charging arc (stack 1+, MED+)
            if (!_mobPerf && rageStacks >= 1 && progress > 0.20) {
                const rcCount = rageStacks * 3; // 3-15 bolts
                const rcCol   = rageStacks >= 4 ? 'rgba(180,240,255,' : rageStacks >= 2 ? 'rgba(170,90,255,' : 'rgba(140,40,220,';
                const rcGlow  = rageStacks >= 4 ? '#88ddff' : '#8800cc';
                ctx.save();
                ctx.shadowColor = rcGlow; ctx.shadowBlur = rageStacks >= 3 ? 10 : 6;
                ctx.lineWidth = rageStacks >= 3 ? 1.8 : 1.2;
                for (let rc = 0; rc < rcCount; rc++) {
                    const rcBaseAng = arcStart + (rc / rcCount) * Math.PI;
                    const rcDist = curR * (0.15 + 0.55 * Math.abs(Math.sin(rc * 2.618)));
                    let bx = enemy.x + Math.cos(rcBaseAng) * rcDist;
                    let by = enemy.y + Math.sin(rcBaseAng) * rcDist;
                    const rcAlpha = progress * (0.4 + 0.35 * Math.sin(now / 90 + rc * 1.3));
                    ctx.strokeStyle = rcCol + rcAlpha + ')';
                    ctx.globalAlpha = 1;
                    ctx.beginPath(); ctx.moveTo(bx, by);
                    for (let s = 0; s < 4; s++) {
                        const sAng = rcBaseAng + Math.sin(rc * 4.37 + s * 2.09) * 0.7;
                        const sLen = curR * (0.06 - s * 0.01);
                        bx += Math.cos(sAng) * sLen;
                        by += Math.sin(sAng) * sLen;
                        ctx.lineTo(bx, by);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0; ctx.restore();
            }

            // Converging charge particles (MED+)
            if (_gfxLevel < 2 && progress > 0.15) {
                for (let cp = 0; cp < 8; cp++) {
                    const cpAngle = arcStart + (cp / 8) * Math.PI + (now / 500);
                    const cpDist = curR * (0.3 + 0.7 * ((now / 300 + cp * 0.7) % 1));
                    const cpX = enemy.x + Math.cos(cpAngle) * cpDist;
                    const cpY = enemy.y + Math.sin(cpAngle) * cpDist;
                    ctx.globalAlpha = progress * 0.7;
                    ctx.fillStyle = '#cc66ff';
                    ctx.beginPath(); ctx.arc(cpX, cpY, 3 + progress * 2, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Warning fill flash at >85% progress
            if (progress > 0.85) {
                const flashA = ((progress - 0.85) / 0.15) * 0.25;
                ctx.globalAlpha = flashA;
                ctx.fillStyle = 'rgba(120,0,220,1)';
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
                ctx.closePath();
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // NULL SLASH, STRIKING (arc slash, tentacle sweeps 180° through target)
        if (enemy._nullSlashPhase === 'striking') {
            const st  = enemy._nullSlashStrikeTimer || 0;
            const tx2 = enemy._nullSlashTargetX, ty2 = enemy._nullSlashTargetY;
            const cx  = enemy._nullSlashOriginX !== undefined ? enemy._nullSlashOriginX : enemy.x;
            const cy  = enemy._nullSlashOriginY !== undefined ? enemy._nullSlashOriginY : enemy.y;

            // Timing: shoot-out → arc sweep → retract (~950ms)
            const EXTEND = 200, SWEEP = 520, RETRACT = 230;
            const nsAng      = enemy._nullSlashAngle || Math.atan2(ty2 - cy, tx2 - cx);
            const rageStacks = enemy._rageStacks || 0;
            const rageSizeMult = 1 + rageStacks * 0.05;  // +5% tentacle size per stack
            const R          = Math.hypot(tx2 - cx, ty2 - cy) + rageStacks * 5; // +5px arc radius per stack
            const arcStart = nsAng - Math.PI / 2;
            const arcSpan  = Math.PI; // 180° sweep through target at midpoint

            let ext, sweepT;
            if (st < EXTEND) {
                ext = 1 - Math.pow(1 - st / EXTEND, 2.8);
                sweepT = 0;
            } else if (st < EXTEND + SWEEP) {
                const s = (st - EXTEND) / SWEEP;
                ext = 1.0;
                sweepT = s < 0.5 ? 2*s*s : -1+(4-2*s)*s; // ease-in-out
            } else {
                const r = (st - EXTEND - SWEEP) / RETRACT;
                ext = Math.pow(1 - r, 2.2);
                sweepT = 1.0;
            }

            if (ext > 0.01) {
            const tipAngle = arcStart + sweepT * arcSpan;

            // Rift timing, stays open (sweepT=1) and fades quickly, independent of tentacle retract
            const RIFT_FADE = 185;
            let rST, rE;
            if (st < EXTEND + SWEEP) { rST = sweepT; rE = ext; }
            else { rST = 1.0; rE = Math.max(0, 1 - (st - EXTEND - SWEEP) / RIFT_FADE); }

            // Build rubber tentacle: base at Egregor, tip traces the arc
            // Rubber lag: base lags behind tip in sweep angle
            const steps = 38;
            const tentPts = [];
            for (let i = 0; i <= steps; i++) {
                const tRaw = i / steps;
                const laggedST   = sweepT * Math.pow(tRaw, 0.5);
                const ptAngle    = arcStart + laggedST * arcSpan;
                const radius     = tRaw * R * ext;
                const radX = Math.cos(ptAngle), radY = Math.sin(ptAngle);
                // Radial wobble (rubber undulation in/out)
                const amp  = Math.pow(tRaw, 1.6) * 72 * ext;
                const ph   = tRaw * Math.PI * 3.4 - sweepT * Math.PI * 4.8;
                const wOff = Math.sin(ph) * amp
                           + Math.sin(tRaw*Math.PI*6.2 - sweepT*Math.PI*8) * Math.pow(tRaw,2.2) * 22 * ext;
                tentPts.push({
                    x: cx + radius*radX + radX*wOff,
                    y: cy + radius*radY + radY*wOff,
                    w: 1 - tRaw
                });
            }

            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            // Arc sweep trail (motion blur showing where tip has been)
            if (!_mobPerf && sweepT > 0.06 && sweepT < 0.96 && ext > 0.55) {
                for (let tr = 5; tr >= 1; tr--) {
                    const trST = Math.max(0, sweepT - tr * 0.10);
                    const trA  = arcStart + trST * arcSpan;
                    ctx.shadowColor = '#6600cc'; ctx.shadowBlur = 16;
                    ctx.strokeStyle = `rgba(100,0,200,${(6-tr)*0.022*ext})`;
                    ctx.lineWidth   = (6-tr) * 4 * ext;
                    ctx.beginPath(); ctx.arc(cx, cy, R * ext * 0.90, trA, tipAngle); ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Aura, glowing void halo around tentacle (rage 1+)
            if (!_mobPerf && rageStacks >= 1) {
                ctx.shadowColor = rageStacks >= 3 ? '#bb77ff' : '#8800cc';
                ctx.shadowBlur  = 28 + rageStacks * 12;
                const auraA = Math.min(0.32, (0.06 + rageStacks * 0.035) * ext);
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si+1];
                    ctx.strokeStyle = `rgba(140,0,255,${auraA * p0.w})`;
                    ctx.lineWidth   = Math.max(8, 125 * p0.w * rageSizeMult);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Layer 0: void core
            if (!_mobPerf) { ctx.shadowColor = '#1a0030'; ctx.shadowBlur = 45; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(6,0,18,0.97)`;
                ctx.lineWidth = Math.max(2, 92 * p0.w * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            // Layer 1: deep purple body
            if (!_mobPerf) { ctx.shadowColor = '#5500aa'; ctx.shadowBlur = 28; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(85,0,165,${0.90 * ext})`;
                ctx.lineWidth = Math.max(1, 70 * p0.w * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            // Layer 2: bright outer skin
            if (!_mobPerf) { ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 16; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(155,25,255,${0.72 * ext})`;
                ctx.lineWidth = Math.max(0.5, 46 * p0.w * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            // Layer 3: highlight stripe (follows local tangent)
            ctx.shadowBlur = 0;
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                const sdx = p1.x-p0.x, sdy = p1.y-p0.y, sL = Math.hypot(sdx,sdy)||1;
                const hpX = -sdy/sL, hpY = sdx/sL, ho = 5 * p0.w * rageSizeMult;
                ctx.strokeStyle = `rgba(225,135,255,${0.42 * p0.w * ext})`;
                ctx.lineWidth = Math.max(0.5, 19 * p0.w * rageSizeMult);
                ctx.beginPath();
                ctx.moveTo(p0.x+hpX*ho, p0.y+hpY*ho); ctx.lineTo(p1.x+hpX*ho, p1.y+hpY*ho);
                ctx.stroke();
            }

            // Layer 4: thin spine
            if (!_mobPerf) { ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 12; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(225,115,255,${0.42 * p0.w * ext})`;
                ctx.lineWidth = Math.max(0.5, 7 * p0.w);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Suckers (MED+)
            if (_gfxLevel < 2) {
                for (let si = 2; si < tentPts.length - 2; si += 2) {
                    const p = tentPts[si];
                    const sr = Math.max(3, 15 * p.w);
                    ctx.fillStyle = `rgba(28,0,65,${0.88 * ext})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, sr, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = `rgba(185,65,255,${0.55 * ext})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, sr * 0.42, 0, Math.PI * 2); ctx.fill();
                }
            }

            // DIMENSIONAL RIFT, không gian bị xé toạc (rage 1+, MED+)
            // Layer cuối: đè lên xúc tu, rift fades independently (rST/rE) after sweep
            if (!_mobPerf && rageStacks >= 1 && rST > 0.04 && rE > 0.01) {
                ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                const RN = 60;
                const inPts = [], outPts = [];
                for (let ci2 = 0; ci2 <= RN; ci2++) {
                    const frac = ci2 / RN;
                    if (frac > rST + 0.012) break;
                    const ang2    = arcStart + frac * arcSpan;
                    const baseR2  = R * rE * 0.88;
                    const tipDist = Math.max(0, rST - frac);
                    const open    = Math.pow(Math.min(1, tipDist * 6), 0.55) * rE;
                    const halfW   = (13 + rageStacks * 5) * open;
                    const jI = Math.sin(ci2*3.718+0.618)*(3+rageStacks)
                             + Math.sin(ci2*7.391+1.234)*(1.2+rageStacks*0.4)
                             + Math.sin(ci2*1.618+2.718)*(0.8+rageStacks*0.2);
                    const jO = Math.sin(ci2*2.618+1.400)*(3+rageStacks)
                             + Math.sin(ci2*5.236+0.900)*(1.2+rageStacks*0.4)
                             + Math.sin(ci2*0.927+3.141)*(0.8+rageStacks*0.2);
                    const aJ = Math.sin(ci2*4.317+2.100)*0.018;
                    inPts.push({ x:cx+Math.cos(ang2+aJ)*(baseR2-halfW+jI), y:cy+Math.sin(ang2+aJ)*(baseR2-halfW+jI) });
                    outPts.push({ x:cx+Math.cos(ang2-aJ)*(baseR2+halfW+jO), y:cy+Math.sin(ang2-aJ)*(baseR2+halfW+jO) });
                }

                if (inPts.length >= 2) {
                    const rN = inPts.length;
                    const riftW  = 13 + rageStacks * 5;
                    const midAng = arcStart + rST * arcSpan * 0.42;
                    const mX = cx + Math.cos(midAng) * R * rE * 0.88;
                    const mY = cy + Math.sin(midAng) * R * rE * 0.88;

                    // Interior, clip to rift polygon, reveal other dimension
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(inPts[0].x, inPts[0].y);
                    for (let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y);
                    for (let i=rN-1;i>=0;i--) ctx.lineTo(outPts[i].x,outPts[i].y);
                    ctx.closePath(); ctx.clip();

                    ctx.fillStyle = '#01000c';
                    ctx.fillRect(cx-R*2.2, cy-R*2.2, R*4.4, R*4.4);

                    const gG2 = ctx.createRadialGradient(mX,mY,0, mX,mY,riftW*5.5);
                    gG2.addColorStop(0,    'rgba(255,242,215,0.65)');
                    gG2.addColorStop(0.08, 'rgba(215,155,255,0.55)');
                    gG2.addColorStop(0.22, 'rgba(105,32,210,0.42)');
                    gG2.addColorStop(0.48, 'rgba(28,6,85,0.24)');
                    gG2.addColorStop(1,    'rgba(1,0,12,0)');
                    ctx.fillStyle=gG2; ctx.fillRect(cx-R*2.2,cy-R*2.2,R*4.4,R*4.4);

                    // Interior detail tiers
                    // HIGH (0): 9 nebulae + 3 spiral arms + full stars + all faults + cosmic
                    // MED  (1): 4 nebulae + no arms      + 20 stars   + 1 fault    + no cosmic
                    // LOW  (2): galaxy core only (already drawn above)
                    if (_gfxLevel < 2) {
                        ctx.globalCompositeOperation = 'lighter';
                        const NEB_ALL = [
                            [0.10,riftW*2.0, 42,  0,152,0.24],[0.26,riftW*2.5,122,  0,218,0.26],
                            [0.42,riftW*1.8,  0, 82,192,0.22],[0.58,riftW*2.2, 82,  0,182,0.24],
                            [0.74,riftW*1.6,172, 52,248,0.18],[0.36,riftW*3.5, 16,  0, 72,0.18],
                            [0.50,riftW*2.8,230,110,  0,0.10],[0.20,riftW*1.5,255,180,100,0.07],
                            [0.65,riftW*2.0,  0,160,200,0.12],
                        ];
                        // MED: only first 4 nebulae (cheapest, most visible)
                        const nebCount = _gfxLevel === 0 ? NEB_ALL.length : 4;
                        for (let ni=0;ni<nebCount;ni++) {
                            const [nF,nR2,r2,g2,b2,a2] = NEB_ALL[ni];
                            if (nF > rST) continue;
                            const nA = arcStart + nF*arcSpan;
                            const nx2 = cx+Math.cos(nA)*R*rE*0.88, ny2 = cy+Math.sin(nA)*R*rE*0.88;
                            const nG = ctx.createRadialGradient(nx2,ny2,0,nx2,ny2,nR2);
                            nG.addColorStop(0,`rgba(${r2},${g2},${b2},${a2})`);
                            nG.addColorStop(1,'rgba(0,0,0,0)');
                            ctx.fillStyle=nG; ctx.fillRect(cx-R*2.2,cy-R*2.2,R*4.4,R*4.4);
                        }

                        // Spiral arms: HIGH only (36 gradient creates/frame)
                        if (_gfxLevel === 0) {
                            const swirlA = now * 0.00016;
                            for (let arm=0;arm<3;arm++) {
                                const aBase = swirlA + arm*(Math.PI*2/3);
                                for (let seg=0;seg<12;seg++) {
                                    const sF=seg/12, sA=aBase+sF*Math.PI*0.85;
                                    const sRad=riftW*(0.15+sF*1.8);
                                    const al=(0.08-sF*0.065)*rE; if(al<0.003) continue;
                                    const sG=ctx.createRadialGradient(mX+Math.cos(sA)*sRad,mY+Math.sin(sA)*sRad,0,mX+Math.cos(sA)*sRad,mY+Math.sin(sA)*sRad,sRad*0.6);
                                    sG.addColorStop(0,`rgba(145,88,255,${al})`);
                                    sG.addColorStop(1,'rgba(0,0,0,0)');
                                    ctx.fillStyle=sG; ctx.fillRect(cx-R*2.2,cy-R*2.2,R*4.4,R*4.4);
                                }
                            }
                        }
                        ctx.globalCompositeOperation = 'source-over';

                        // Stars: HIGH = 44+stacks*9, MED = 20 fixed
                        const STAR_N = _gfxLevel === 0 ? 44 + rageStacks*9 : 20;
                        for (let si2=0;si2<STAR_N;si2++) {
                            const sFrac=(si2*0.6180339)%1;
                            if(sFrac>rST) continue;
                            const sAng=arcStart+sFrac*arcSpan;
                            const sOff=Math.sin(si2*2.618+0.5)*riftW*0.80;
                            const sx2=cx+Math.cos(sAng+Math.sin(si2*1.414)*0.022)*(R*rE*0.88+sOff);
                            const sy2=cy+Math.sin(sAng+Math.sin(si2*1.414)*0.022)*(R*rE*0.88+sOff);
                            const ssz=si2%13===0?2.9:si2%7===0?2.0:si2%3===0?1.25:0.65;
                            const tw=0.55+0.40*Math.sin(now*0.0018+si2*1.618);
                            const sc2=si2%5===0?[165,202,255]:si2%7===0?[255,229,185]
                                     :si2%11===0?[202,145,255]:si2%17===0?[172,255,222]
                                     :si2%19===0?[255,200,180]:[255,255,255];
                            ctx.fillStyle=`rgba(${sc2[0]},${sc2[1]},${sc2[2]},${tw*(ssz>1?1:0.85)})`;
                            ctx.beginPath(); ctx.arc(sx2,sy2,ssz,0,Math.PI*2); ctx.fill();
                            // Cross-spikes: HIGH only
                            if (_gfxLevel === 0 && ssz>=2.0) {
                                ctx.globalAlpha=tw*0.42;
                                ctx.strokeStyle=`rgba(${sc2[0]},${sc2[1]},${sc2[2]},1)`; ctx.lineWidth=0.55;
                                const spk=ssz*3.5;
                                ctx.beginPath(); ctx.moveTo(sx2-spk,sy2); ctx.lineTo(sx2+spk,sy2); ctx.stroke();
                                ctx.beginPath(); ctx.moveTo(sx2,sy2-spk); ctx.lineTo(sx2,sy2+spk); ctx.stroke();
                                ctx.globalAlpha=1;
                            }
                        }

                        // Fault lines: HIGH = 2+stacks, MED = 1
                        ctx.globalCompositeOperation = 'lighter';
                        const FL_N = _gfxLevel === 0 ? 2+rageStacks : 1;
                        for (let fi=0;fi<FL_N;fi++) {
                            const fSt=fi/(FL_N+1), fEd=Math.min(rST,fSt+0.58);
                            if(fSt>rST) continue;
                            const fPts=[];
                            for(let s=0;s<=12;s++){
                                const f=fSt+(s/12)*(fEd-fSt), a3=arcStart+f*arcSpan;
                                const off2=Math.sin(fi*3.618+s*1.414)*riftW*0.40;
                                fPts.push({x:cx+Math.cos(a3)*(R*rE*0.88+off2), y:cy+Math.sin(a3)*(R*rE*0.88+off2)});
                            }
                            const fC=['rgba(218,198,255,','rgba(142,218,255,','rgba(255,198,218,','rgba(198,255,218,'][fi%4];
                            ctx.strokeStyle=fC+(0.22*rE)+')';
                            ctx.shadowColor=['#aa77ff','#55bbff','#ff88aa','#77ffaa'][fi%4];
                            ctx.shadowBlur=6; ctx.lineWidth=0.85+fi*0.28;
                            ctx.beginPath(); ctx.moveTo(fPts[0].x,fPts[0].y);
                            for(let s=1;s<fPts.length;s++) ctx.lineTo(fPts[s].x,fPts[s].y); ctx.stroke();
                        }
                        ctx.globalCompositeOperation='source-over'; ctx.shadowBlur=0;

                        // Cosmic object: HIGH only (rage 2+)
                        if (_gfxLevel === 0 && rageStacks>=2 && rST>0.30) {
                            const anF=0.27, anA=arcStart+anF*arcSpan;
                            const anX=cx+Math.cos(anA)*R*rE*0.88, anY=cy+Math.sin(anA)*R*rE*0.88;
                            const anR=4+rageStacks*1.6;
                            const anG=ctx.createRadialGradient(anX,anY,0,anX,anY,anR*3.0);
                            anG.addColorStop(0,   rageStacks>=4?'rgba(218,248,255,0.97)':'rgba(255,238,208,0.93)');
                            anG.addColorStop(0.28,rageStacks>=4?'rgba(88,172,255,0.74)':'rgba(202,102,255,0.68)');
                            anG.addColorStop(0.65,'rgba(22,4,62,0.40)');
                            anG.addColorStop(1,   'rgba(0,0,20,0)');
                            ctx.fillStyle=anG; ctx.beginPath(); ctx.arc(anX,anY,anR*3,0,Math.PI*2); ctx.fill();
                            ctx.fillStyle=rageStacks>=4?'rgba(238,252,255,1)':'rgba(255,244,228,1)';
                            ctx.beginPath(); ctx.arc(anX,anY,anR*0.40,0,Math.PI*2); ctx.fill();
                            if (rageStacks>=4) {
                                ctx.strokeStyle='rgba(180,230,255,0.45)'; ctx.lineWidth=0.8;
                                ctx.beginPath(); ctx.ellipse(anX,anY,anR*1.8,anR*0.7,anA+Math.PI/4,0,Math.PI*2); ctx.stroke();
                            }
                        }
                    } // end interior (_gfxLevel < 2)

                    ctx.restore(); // end clip

                    // Edges
                    // HIGH: outer haze + main glow + white razor (3 layers)
                    // MED:  outer haze + main glow              (2 layers)
                    // LOW:  main glow only                      (1 layer)
                    const eGlow=rageStacks>=4?'#ddd8ff':rageStacks>=2?'#cc77ff':'#aa44cc';
                    const eRGB =rageStacks>=4?'228,248,255':rageStacks>=2?'232,172,255':'212,132,255';
                    // Outer haze (HIGH + MED)
                    if (_gfxLevel < 2) {
                        ctx.shadowColor=eGlow; ctx.shadowBlur=22+rageStacks*9;
                        ctx.strokeStyle=`rgba(175,75,255,${0.10*rE})`; ctx.lineWidth=12+rageStacks*3;
                        ctx.beginPath(); ctx.moveTo(inPts[0].x,inPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(outPts[0].x,outPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(outPts[i].x,outPts[i].y); ctx.stroke();
                    }
                    // Main glow edge (all tiers)
                    ctx.shadowColor=eGlow; ctx.shadowBlur=12+rageStacks*5;
                    ctx.strokeStyle=`rgba(${eRGB},${0.88*rE})`; ctx.lineWidth=2.2+rageStacks*0.48;
                    ctx.beginPath(); ctx.moveTo(inPts[0].x,inPts[0].y);
                    for(let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(outPts[0].x,outPts[0].y);
                    for(let i=1;i<rN;i++) ctx.lineTo(outPts[i].x,outPts[i].y); ctx.stroke();
                    // White razor (HIGH only)
                    if (_gfxLevel === 0) {
                        ctx.shadowColor='#ffffff'; ctx.shadowBlur=9;
                        ctx.strokeStyle=`rgba(255,255,255,${0.70*rE})`; ctx.lineWidth=0.9;
                        ctx.beginPath(); ctx.moveTo(inPts[0].x,inPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(outPts[0].x,outPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(outPts[i].x,outPts[i].y); ctx.stroke();
                    }
                    ctx.shadowBlur=0;

                    // Edge sparks + fringe + tip flash
                    // HIGH: 12+stacks*4 sparks + fringe + tip flash
                    // MED:  8 sparks only (no fringe, no tip)
                    // LOW:  none
                    if (_gfxLevel < 2) {
                        const SPK_N = _gfxLevel === 0 ? 12+rageStacks*4 : 8;
                        for(let spi=0;spi<SPK_N;spi++){
                            const spF=(spi*0.6180339)%1; if(spF>rST-0.01) continue;
                            const ePts=spi%2===0?inPts:outPts;
                            const spI=Math.min(rN-1,Math.floor(spF*rN)); if(!ePts[spI]) continue;
                            const tw2=Math.max(0, 0.44+0.52*Math.sin(now*0.0025+spi*2.618));
                            const spSz=Math.max(0, (0.85+(spi%3)*0.58)*tw2);
                            const spC=spi%4===0?`rgba(255,255,255,${tw2})`:spi%4===1?`rgba(222,182,255,${tw2*0.9})`:
                                      spi%4===2?`rgba(182,222,255,${tw2*0.85})`:`rgba(255,212,238,${tw2*0.75})`;
                            ctx.shadowColor='#ffffff'; ctx.shadowBlur=8; ctx.fillStyle=spC;
                            ctx.beginPath(); ctx.arc(ePts[spI].x,ePts[spI].y,spSz,0,Math.PI*2); ctx.fill();
                        }
                        ctx.shadowBlur=0;

                        // Fringe + tip flash: HIGH only
                        if (_gfxLevel === 0) {
                            const FRG_N=8+rageStacks*2;
                            for(let fri=0;fri<FRG_N;fri++){
                                const frF=(fri*0.6180339)%1; if(frF>rST-0.02) continue;
                                const frAng=arcStart+frF*arcSpan;
                                const ePts=fri%2===0?inPts:outPts;
                                const frI=Math.min(rN-1,Math.floor(frF*rN)); if(!ePts[frI]) continue;
                                const ep=ePts[frI];
                                const frDir=frAng+(fri%2===0?Math.PI:0);
                                const frLen=(3+Math.abs(Math.sin(fri*2.618))*(4+rageStacks))*rE;
                                const kink=frDir+Math.sin(fri*3.14)*0.44;
                                ctx.strokeStyle=`rgba(${eRGB},${0.28*rE})`; ctx.lineWidth=0.65;
                                ctx.beginPath(); ctx.moveTo(ep.x,ep.y);
                                ctx.lineTo(ep.x+Math.cos(kink)*frLen*0.5, ep.y+Math.sin(kink)*frLen*0.5);
                                ctx.lineTo(ep.x+Math.cos(frDir+Math.sin(fri)*0.26)*frLen, ep.y+Math.sin(frDir+Math.sin(fri)*0.26)*frLen);
                                ctx.stroke();
                            }
                            if(rST>0.04 && rST<0.97 && rN>=2){
                                const tI=inPts[rN-1], tO=outPts[rN-1];
                                const tMX=(tI.x+tO.x)/2, tMY=(tI.y+tO.y)/2;
                                const tPulse=0.72+0.28*Math.sin(now*0.009);
                                ctx.shadowColor='#ffffff'; ctx.shadowBlur=24;
                                ctx.globalAlpha=tPulse*rE*0.90;
                                const tG=ctx.createRadialGradient(tMX,tMY,0,tMX,tMY,10+rageStacks*2.8);
                                tG.addColorStop(0,'rgba(255,255,255,1)'); tG.addColorStop(0.2,'rgba(215,190,255,0.82)');
                                tG.addColorStop(0.6,'rgba(120,55,215,0.35)'); tG.addColorStop(1,'rgba(80,20,180,0)');
                                ctx.fillStyle=tG; ctx.beginPath(); ctx.arc(tMX,tMY,10+rageStacks*2.8,0,Math.PI*2); ctx.fill();
                                ctx.globalAlpha=tPulse*rE*0.65; ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=0.7;
                                for(let ts=0;ts<5;ts++){
                                    const tA=(ts/5)*Math.PI*2+now*0.004;
                                    const tLen=6+rageStacks*1.5+Math.sin(now*0.01+ts)*2;
                                    ctx.beginPath(); ctx.moveTo(tMX,tMY); ctx.lineTo(tMX+Math.cos(tA)*tLen,tMY+Math.sin(tA)*tLen); ctx.stroke();
                                }
                                ctx.globalAlpha=1;
                            }
                        } // end HIGH sparks/fringe/tip
                    } // end MED+LOW edge sparks
                }
                ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.restore();
            }

            // Impact flash when tip sweeps through target (at midpoint of sweep)
            const impactSt = EXTEND + SWEEP * 0.5;
            const impA = Math.max(0, 1 - Math.abs(st - impactSt) / 115);
            if (impA > 0.04) {
                const impR = 110 + rageStacks * 20; // larger at rage
                if (!_mobPerf) {
                    ctx.shadowColor = rageStacks >= 3 ? '#aaffff' : '#ff44ff';
                    ctx.shadowBlur  = 45 + rageStacks * 8;
                }
                ctx.globalAlpha = impA * 0.92;
                const c1 = rageStacks >= 4 ? 'rgba(210,255,255,1.0)'
                         : rageStacks >= 2 ? 'rgba(210,160,255,1.0)'
                         :                  'rgba(255,210,255,1.0)';
                const c2 = rageStacks >= 4 ? 'rgba(100,220,255,0.90)'
                         : rageStacks >= 2 ? 'rgba(170,60,255,0.90)'
                         :                  'rgba(230,80,255,0.90)';
                const impG = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, impR);
                impG.addColorStop(0,   c1);
                impG.addColorStop(0.2, c2);
                impG.addColorStop(0.6, 'rgba(110,0,230,0.45)');
                impG.addColorStop(1,   'rgba(55,0,180,0)');
                ctx.fillStyle = impG;
                ctx.beginPath(); ctx.arc(tx2, ty2, impR, 0, Math.PI * 2); ctx.fill();
                // Outer void ring (rage 2+)
                if (!_mobPerf && rageStacks >= 2) {
                    ctx.globalAlpha = impA * 0.55;
                    ctx.strokeStyle = rageStacks >= 4 ? 'rgba(180,255,255,0.85)' : 'rgba(165,80,255,0.85)';
                    ctx.lineWidth   = 1.5 + rageStacks * 0.5;
                    ctx.beginPath(); ctx.arc(tx2, ty2, impR * 1.35, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            }

            ctx.globalAlpha = 1; ctx.restore();
            } // end ext > 0.01
        }

    }
}
