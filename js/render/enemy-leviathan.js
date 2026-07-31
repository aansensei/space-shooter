// render/enemy-leviathan.js — extracted from render.js. _drawLeviathanEffects
// (standalone death-laser/perseverance-sweep fx, survives enemy death) sits far
// from _drawLeviathan in the original file; reassembled together here.

// Crackling energy branches jutting off a beam, in the beam's own rotated
// local space (call after translate+rotate to the beam's origin/direction).
// Uses a `now`-seeded sine flicker instead of pure randomness so branches
// shimmer in place rather than jittering every frame.
function _drawLevBeamCrackle(len, seedBase, now, count, color, maxBranch) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count;
        const bx = len * t;
        const flicker = Math.sin(now / 65 + seedBase + k * 7.3);
        if (flicker < 0.35) continue;
        const side = (k % 2 === 0) ? 1 : -1;
        const branchLen = maxBranch * (0.4 + flicker * 0.6);
        const branchAngle = side * (0.5 + Math.abs(Math.sin(now / 50 + seedBase + k * 2.1)) * 0.6);
        const midX = bx + Math.cos(branchAngle) * branchLen * 0.55;
        const midY = Math.sin(branchAngle) * branchLen * 0.55;
        const endX = bx + Math.cos(branchAngle) * branchLen;
        const endY = Math.sin(branchAngle) * branchLen * (1 + side * 0.3);
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}

// Aegis lasers
// Leviathan standalone effects (survive enemy death)
function _drawLeviathanEffects() {
    const now = performance.now();
    const len = Math.hypot(canvas.width, canvas.height) * 1.5;

    // Perseverance charge warning: a black-hole gravity well collapsing
    // inward before the sweep fires — layered void/red/white core, several
    // counter-rotating event-horizon rings, and particles spiraling in.
    enemies.forEach(e => {
        if (e.type !== 'leviathan') return;
        if (!e.perseveranceCharging) return;

        const prog = Math.min(1, (now - e.perseveranceChargeStart) / 1000);
        const glowColor = '#ff0000';

        ctx.save();
        ctx.translate(e.x, e.y);

        // Outer void haze, deepens and REACHES FURTHER as the charge builds
        const _voidR = e.size * (2.6 - prog * 0.9);
        const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, _voidR);
        voidGrad.addColorStop(0, `rgba(10,0,20,${0.65 * prog})`);
        voidGrad.addColorStop(0.55, `rgba(120,0,180,${0.28 * prog})`);
        voidGrad.addColorStop(1, 'rgba(120,0,180,0)');
        ctx.fillStyle = voidGrad;
        ctx.beginPath(); ctx.arc(0, 0, _voidR, 0, Math.PI * 2); ctx.fill();

        // Radial god-rays bursting from the core, intensifying with prog
        ctx.save();
        ctx.rotate(now / 900);
        ctx.globalAlpha = prog * 0.35;
        const _rayCount = 12;
        for (let ri = 0; ri < _rayCount; ri++) {
            const ra = (Math.PI * 2 / _rayCount) * ri;
            const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(ra) * _voidR * 1.3, Math.sin(ra) * _voidR * 1.3);
            rayGrad.addColorStop(0, ri % 2 === 0 ? 'rgba(255,80,0,0.5)' : 'rgba(180,0,255,0.5)');
            rayGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.strokeStyle = rayGrad;
            ctx.lineWidth = 3 + prog * 4;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ra) * _voidR * 1.3, Math.sin(ra) * _voidR * 1.3); ctx.stroke();
        }
        ctx.restore();

        // Expanding warning ring
        ctx.globalAlpha = prog * 0.35;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 4 + prog * 10;
        if (!_mobPerf) { ctx.shadowColor = glowColor; ctx.shadowBlur = 26; }
        ctx.beginPath(); ctx.arc(0, 0, e.size * (0.6 + prog * 1.8), 0, Math.PI * 2); ctx.stroke();

        // 4 counter-rotating event-horizon dash rings at different radii/speeds
        ctx.shadowBlur = 0;
        const _horizonSpecs = [
            { r: 1.15, spd: 260, dash: [12, 9], w: 2.5, c: 'rgba(255,255,255,0.5)', dir: 1 },
            { r: 0.95, spd: 300, dash: [10, 8], w: 2, c: 'rgba(255,255,255,0.55)', dir: 1 },
            { r: 0.72, spd: 420, dash: [6, 10], w: 2.5, c: 'rgba(255,60,0,0.65)', dir: -1 },
            { r: 0.50, spd: 220, dash: [4, 6], w: 2, c: 'rgba(157,0,255,0.65)', dir: 1 },
        ];
        for (const hs of _horizonSpecs) {
            ctx.globalAlpha = prog * 0.65;
            ctx.strokeStyle = hs.c;
            ctx.lineWidth = hs.w;
            ctx.setLineDash(hs.dash);
            ctx.save(); ctx.rotate(hs.dir * now / hs.spd);
            ctx.beginPath(); ctx.arc(0, 0, e.size * hs.r, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        ctx.setLineDash([]);

        // Particles spiraling inward toward the core (event-horizon infall)
        ctx.globalAlpha = prog;
        for (let p = 0; p < 18; p++) {
            const pSeed = p * 0.41;
            const pProg = (now / 480 + pSeed) % 1;
            const pAngle = pSeed * Math.PI * 2 + pProg * Math.PI * 3.5;
            const pR = e.size * (1.7 - pProg * 1.5);
            const px = Math.cos(pAngle) * pR, py = Math.sin(pAngle) * pR;
            ctx.fillStyle = p % 3 === 0 ? '#ffffff' : (p % 2 === 0 ? '#ff6a2e' : '#c060ff');
            ctx.beginPath(); ctx.arc(px, py, 1.6 + (1 - pProg) * 2.2, 0, Math.PI * 2); ctx.fill();
        }

        // Layered core: void → red danger edge → white-hot center
        ctx.globalAlpha = 1;
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 0.42);
        coreGrad.addColorStop(0, `rgba(255,255,255,${0.95 * prog})`);
        coreGrad.addColorStop(0.4, `rgba(255,60,0,${0.9 * prog})`);
        coreGrad.addColorStop(1, `rgba(120,0,180,${0.35 * prog})`);
        if (!_mobPerf) { ctx.shadowColor = glowColor; ctx.shadowBlur = 55 * prog; }
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(0, 0, e.size * 0.34, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Ignition strobe once nearly fully charged — sells the "about to
        // fire" instant with a rapid bright flicker over the core
        if (prog > 0.85) {
            const _strobe = Math.max(0, Math.sin(now / 35));
            ctx.globalAlpha = (prog - 0.85) / 0.15 * _strobe * 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, e.size * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    // Perseverance sweep beams (objects độc lập trong _levPersBeams)
    if (window._levPersBeams) {
        window._levPersBeams.forEach(beam => {
            if (beam.done) return;
            // sweepCurrent được update bởi main.js mỗi frame
            const sweepAngle = beam.sweepCurrent !== undefined ? beam.sweepCurrent
                : (beam.sweepOrigin + (beam.progress || 0) * Math.PI * 2);
            const seed = beam.ox * 0.017 + beam.oy * 0.013;

            ctx.save();
            ctx.translate(beam.ox, beam.oy);
            ctx.rotate(sweepAngle);

            // Wide outer void-purple haze
            if (!_mobPerf) { ctx.shadowColor = '#9d00ff'; ctx.shadowBlur = 70; }
            const outerGrad = ctx.createLinearGradient(0, -68, 0, 68);
            outerGrad.addColorStop(0, 'rgba(120,0,200,0)');
            outerGrad.addColorStop(0.5, 'rgba(170,30,230,0.30)');
            outerGrad.addColorStop(1, 'rgba(120,0,200,0)');
            ctx.strokeStyle = outerGrad;
            ctx.lineWidth = 130;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            // Red danger glow layer, width breathing slightly with time
            const _breath = 1 + Math.sin(now / 90) * 0.1;
            if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 55; }
            const redGrad = ctx.createLinearGradient(0, -28, 0, 28);
            redGrad.addColorStop(0, 'rgba(255,0,0,0)');
            redGrad.addColorStop(0.5, 'rgba(255,30,0,0.95)');
            redGrad.addColorStop(1, 'rgba(255,0,0,0)');
            ctx.strokeStyle = redGrad;
            ctx.lineWidth = 24 * _breath;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            // White-hot core line
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            // Traveling hot flare sliding back and forth along the beam
            const _flareX = len * (0.5 + 0.5 * Math.sin(now / 260));
            const flareGrad = ctx.createRadialGradient(_flareX, 0, 0, _flareX, 0, 55);
            flareGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
            flareGrad.addColorStop(0.4, 'rgba(255,140,60,0.35)');
            flareGrad.addColorStop(1, 'rgba(255,140,60,0)');
            ctx.fillStyle = flareGrad;
            ctx.beginPath(); ctx.arc(_flareX, 0, 55, 0, Math.PI * 2); ctx.fill();

            // Crackling energy branches along the length
            if (!_mobPerf) _drawLevBeamCrackle(Math.min(len, canvas.width * 1.1), seed, now, 16, 'rgba(255,140,70,0.85)', 34);

            // Rotating energy collar at the origin (living-eye motif)
            ctx.rotate(-sweepAngle + now / 260);
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 10]);
            ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(255,30,0,0.75)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;

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
            // Wing shape rotating into position, with a power surge building
            // toward the tip and small crackling sparks as it nears firing
            const wingLen = 75 + warnProg * 60; // cánh vươn ra khi xoay
            const wingW = 18;
            const hw = wingW / 2;

            ctx.save();
            ctx.rotate(currentAngle);

            // Trapezoid body: void-purple base building to red-hot tip
            const wg = ctx.createLinearGradient(0, 0, wingLen, 0);
            wg.addColorStop(0, '#2d1810');
            wg.addColorStop(0.35, '#3a1030');
            wg.addColorStop(1, '#ff4400');
            ctx.fillStyle = wg;
            if (!_mobPerf) { ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8 + warnProg * 20; }
            ctx.beginPath();
            ctx.moveTo(0, -hw * 0.4);
            ctx.lineTo(0, hw * 0.4);
            ctx.lineTo(wingLen, hw * 0.7);
            ctx.lineTo(wingLen, -hw * 0.7);
            ctx.closePath();
            ctx.fill();

            // Inner panel seam
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,180,120,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wingLen * 0.15, -hw * 0.32); ctx.lineTo(wingLen * 0.92, -hw * 0.55);
            ctx.moveTo(wingLen * 0.15, hw * 0.32); ctx.lineTo(wingLen * 0.92, hw * 0.55);
            ctx.stroke();

            // Power surge band traveling from base to tip as it charges
            const surgeX = wingLen * ((now / 220 + laser.angle) % 1);
            const surgeGrad = ctx.createRadialGradient(surgeX, 0, 0, surgeX, 0, hw * 1.8);
            surgeGrad.addColorStop(0, `rgba(255,255,255,${0.85 * warnProg})`);
            surgeGrad.addColorStop(0.5, `rgba(255,150,60,${0.5 * warnProg})`);
            surgeGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = surgeGrad;
            ctx.beginPath(); ctx.arc(surgeX, 0, hw * 1.8, 0, Math.PI * 2); ctx.fill();

            // Tip spark crackle once mostly charged
            if (warnProg > 0.45) {
                _drawLevBeamCrackle(wingLen, laser.angle * 4 + 1.7, now, 5, 'rgba(255,160,90,0.85)', 16);
            }
            ctx.restore();

            // Dashed warning line: void-purple outer, red-orange inner
            ctx.rotate(currentAngle);
            ctx.globalAlpha = warnProg * 0.7;
            ctx.strokeStyle = 'rgba(157,0,255,0.55)';
            ctx.lineWidth = 9;
            ctx.setLineDash([10, 7]);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 4;
            if (!_mobPerf) { ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 16; }
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Active laser beam: void haze → red danger glow → white-hot
            // core, with crackling branches and a one-time origin shockwave
            // ring at the instant of firing.
            ctx.rotate(targetA);
            ctx.globalAlpha = activeFade;
            if (!_mobPerf) { ctx.shadowColor = '#9d00ff'; ctx.shadowBlur = 65; }
            const outerGrad2 = ctx.createLinearGradient(0, -48, 0, 48);
            outerGrad2.addColorStop(0, 'rgba(120,0,200,0)');
            outerGrad2.addColorStop(0.5, 'rgba(170,30,230,0.35)');
            outerGrad2.addColorStop(1, 'rgba(120,0,200,0)');
            ctx.strokeStyle = outerGrad2;
            ctx.lineWidth = 90;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 55; }
            ctx.strokeStyle = 'rgba(255,80,0,0.4)';
            ctx.lineWidth = 34;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 9;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            if (!_mobPerf) _drawLevBeamCrackle(Math.min(len, canvas.width * 1.1), laser.angle * 3 + 0.4, now, 12, 'rgba(210,100,255,0.85)', 28);

            // Shockwave burst at the origin, only visible for the first
            // ~350ms after this specific beam transitions to active — a
            // bright inner flash plus an expanding double ring
            const burstAge = elapsed - warnTime;
            if (burstAge < 350) {
                const burstT = burstAge / 350;
                ctx.save();
                ctx.rotate(-targetA);
                const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60 * (1 - burstT * 0.5));
                flashGrad.addColorStop(0, `rgba(255,255,255,${(1 - burstT) * 0.9})`);
                flashGrad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = flashGrad;
                ctx.beginPath(); ctx.arc(0, 0, 60 * (1 - burstT * 0.5), 0, Math.PI * 2); ctx.fill();

                ctx.globalAlpha = (1 - burstT) * 0.85;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 5 * (1 - burstT);
                ctx.beginPath(); ctx.arc(0, 0, 25 + burstT * 130, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = 'rgba(200,80,255,0.8)';
                ctx.lineWidth = 3 * (1 - burstT);
                ctx.beginPath(); ctx.arc(0, 0, 15 + burstT * 90, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
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

