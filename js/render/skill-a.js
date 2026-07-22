// render/skill-a.js — extracted from render.js (Thunder Orbs).

function drawSkillA() {
    const now = performance.now();

    // TITLE FLASH khi skill A vừa kích hoạt
    {
        const elapsed = now - lastSkillA;
        const textT = Math.min(elapsed / 150, 1) * Math.max(0, 1 - (elapsed - 150) / 1200);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.26;
            ctx.font = 'bold 110px serif';
            ctx.fillStyle = '#00eeff';
            if (!_mobPerf) ctx.shadowColor = '#00aaff'; if (!_mobPerf) ctx.shadowBlur = 45;
            ctx.fillText('星王天雷爆星', player.x, player.y - 80);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 29px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            if (!_mobPerf) ctx.shadowColor = '#00ddff'; if (!_mobPerf) ctx.shadowBlur = 26;
            ctx.fillText('CELESTIAL THUNDERBURST', player.x, player.y - 122);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#88eeff';
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.fillText('— Tinh Vương: Thiên Lôi Bộc Tinh —', player.x, player.y - 98);
            ctx.restore();
        }
    }

    // Binary ring: vòng tròn tạo bởi ký tự 0 và 1 xoay quanh
    ctx.save();
    const R = skillASensorRadius;
    const charCount = Math.max(60, Math.floor(2 * Math.PI * R / 11));
    const rotSpeed = now / 6000;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < charCount; i++) {
        const angle = (i / charCount) * Math.PI * 2 + rotSpeed;
        const cx = player.x + Math.cos(angle) * R;
        const cy = player.y + Math.sin(angle) * R;

        // Xen kẽ 0/1, thay đổi theo thời gian để trông sống động
        const ch = ((i + Math.floor(now / 800 + i * 0.7)) % 2 === 0) ? '0' : '1';

        // Sóng độ sáng chạy dọc vòng tròn
        const wave = 0.35 + 0.5 * Math.abs(Math.sin(now / 900 + i * 0.18));
        ctx.fillStyle = `rgba(0, 230, 255, ${wave})`;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + Math.PI / 2); // chữ hướng theo tiếp tuyến vòng
        ctx.fillText(ch, 0, 0);
        ctx.restore();
    }
    ctx.restore();

    skillAOrbs.forEach(orb => {
        ctx.save();
        const pulse = 1 + 0.18 * Math.abs(Math.sin(now / 220 + orb.x));
        const r = orb.size * pulse;
        const playerSilenced = typeof player !== 'undefined' && player._silenced;

        // Red orbit ring when silenced, draw before orb body
        if (!orb.target && playerSilenced) {
            ctx.save();
            const orbitR = orb.radius || 60;
            ctx.strokeStyle = 'rgba(255,40,40,0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, orbitR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        if (orb.isDefensive) {
            // yellow defensive orb – layered glow
            if (!_mobPerf) ctx.shadowColor = "orange"; if (!_mobPerf) ctx.shadowBlur = 20;
            ctx.fillStyle = 'rgba(255,200,0,0.25)';
            ctx.beginPath(); ctx.arc(orb.x, orb.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
            const dg = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r);
            dg.addColorStop(0, 'white');
            dg.addColorStop(0.4, '#ffdd00');
            dg.addColorStop(1, 'rgba(200,100,0,0.5)');
            ctx.fillStyle = dg;
            ctx.beginPath(); ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2); ctx.fill();
        } else {
            // cyan orb
            if (!_mobPerf) ctx.shadowColor = "white"; if (!_mobPerf) ctx.shadowBlur = 18;
            ctx.fillStyle = 'rgba(0,200,255,0.18)';
            ctx.beginPath(); ctx.arc(orb.x, orb.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
            const cg = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r);
            cg.addColorStop(0, 'white');
            cg.addColorStop(0.4, '#00ffff');
            cg.addColorStop(1, 'rgba(0,100,200,0.5)');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2); ctx.fill();
            // tiny orbiting dot
            const dotAngle = now / 500 + orb.x * 0.1;
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            if (!_mobPerf) ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(orb.x + Math.cos(dotAngle) * r * 0.7, orb.y + Math.sin(dotAngle) * r * 0.7, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

// Sol Judgment (Libra buff 1): Sol Arrow windup + flight visuals
function drawSolArrows() {
    if (!window._solArrows || window._solArrows.length === 0) return;
    const now = performance.now();

    for (const arrow of window._solArrows) {
        if (arrow.state === 'windup') {
            const t = Math.min(1, (now - arrow.windupStart) / arrow.windupDuration);
            const pulse = 0.5 + 0.5 * Math.sin(now / 60);
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(now / 300);
            ctx.globalAlpha = 0.35 + 0.5 * t;
            ctx.strokeStyle = `rgba(245,158,11,${0.6 + 0.4 * pulse})`;
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 18; }
            const ringR = 14 + t * 10;
            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.stroke();
            const rayCount = 8;
            for (let i = 0; i < rayCount; i++) {
                const ang = (i / rayCount) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * ringR, Math.sin(ang) * ringR);
                ctx.lineTo(Math.cos(ang) * (ringR + 8 * t), Math.sin(ang) * (ringR + 8 * t));
                ctx.stroke();
            }
            ctx.restore();
            continue;
        }

        if (arrow.state === 'flying') {
            const angle = Math.atan2(arrow.vy, arrow.vx);
            const wob = Math.sin(now / 60 + arrow.x * 0.04) * 2.5;
            ctx.save();
            ctx.translate(arrow.x, arrow.y);
            ctx.rotate(angle);
            ctx.translate(0, wob);

            if (!_mobPerf) { ctx.shadowColor = '#ffaa2e'; ctx.shadowBlur = 40; }

            // soft outer bloom halo — makes the whole arrow read as "on fire" at a glance
            const bloomPulse = 0.75 + 0.25 * Math.sin(now / 65);
            const bloomG = ctx.createRadialGradient(-10, 0, 0, -10, 0, 55);
            bloomG.addColorStop(0, `rgba(255,150,30,${0.32 * bloomPulse})`);
            bloomG.addColorStop(0.6, `rgba(255,90,0,${0.14 * bloomPulse})`);
            bloomG.addColorStop(1, 'rgba(255,60,0,0)');
            ctx.fillStyle = bloomG;
            ctx.beginPath(); ctx.arc(-10, 0, 55, 0, Math.PI * 2); ctx.fill();

            // Turbulent flame tail: layered flowing curves, animated flicker
            const flick1 = Math.sin(now / 70) * 6;
            const flick2 = Math.sin(now / 55 + 1.4) * 5;
            const flick3 = Math.sin(now / 90 + 2.7) * 7;

            // outer dark-red/orange envelope
            ctx.fillStyle = 'rgba(220,50,0,0.42)';
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.bezierCurveTo(-10, 16 + flick1, -55, 22 + flick3, -95, 4 + flick2);
            ctx.bezierCurveTo(-70, 0, -55, -3, -35, 0);
            ctx.bezierCurveTo(-55, -3, -70, 0, -95, -4 - flick2);
            ctx.bezierCurveTo(-55, -22 - flick3, -10, -16 - flick1, 14, 0);
            ctx.closePath();
            ctx.fill();

            // middle vivid orange flame
            ctx.fillStyle = 'rgba(255,130,0,0.85)';
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.bezierCurveTo(-8, 11 + flick2 * 0.8, -38, 14 + flick1 * 0.8, -68, 3 + flick3 * 0.6);
            ctx.bezierCurveTo(-48, 0, -30, -2, -18, 0);
            ctx.bezierCurveTo(-30, -2, -48, 0, -68, -3 - flick3 * 0.6);
            ctx.bezierCurveTo(-38, -14 - flick1 * 0.8, -8, -11 - flick2 * 0.8, 12, 0);
            ctx.closePath();
            ctx.fill();

            // inner gold-yellow flame
            ctx.fillStyle = 'rgba(255,210,60,0.85)';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.bezierCurveTo(-6, 6 + flick1 * 0.5, -22, 7 + flick2 * 0.5, -42, 2);
            ctx.bezierCurveTo(-28, 0, -16, -1.5, -10, 0);
            ctx.bezierCurveTo(-16, -1.5, -28, 0, -42, -2);
            ctx.bezierCurveTo(-22, -7 - flick2 * 0.5, -6, -6 - flick1 * 0.5, 10, 0);
            ctx.closePath();
            ctx.fill();

            // flickering flame licks rising off the shaft, like a torch
            const lickCount = 5;
            for (let li = 0; li < lickCount; li++) {
                const lx = -60 + li * 15 + Math.sin(now / 80 + li) * 3;
                const lickPhase = now / 60 + li * 1.7;
                const lickH = 7 + 4 * Math.abs(Math.sin(lickPhase));
                const lickLean = Math.sin(lickPhase * 0.6) * 3;
                ctx.fillStyle = `rgba(255,${160 + li * 10},40,${0.55 - li * 0.03})`;
                ctx.beginPath();
                ctx.moveTo(lx - 3, 1.5);
                ctx.quadraticCurveTo(lx + lickLean, -lickH, lx + 1, -1.5);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(lx - 3, -1.5);
                ctx.quadraticCurveTo(lx + lickLean, lickH, lx + 1, 1.5);
                ctx.closePath();
                ctx.fill();
            }

            // shaft + sharp arrowhead
            if (!_mobPerf) ctx.shadowBlur = 26;
            ctx.fillStyle = '#ffe9b0';
            ctx.beginPath();
            ctx.moveTo(-2, 2.5);
            ctx.lineTo(18, 2);
            ctx.lineTo(18, -2);
            ctx.lineTo(-2, -2.5);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#fff8e6';
            ctx.beginPath();
            ctx.moveTo(46, 0);
            ctx.lineTo(16, 12);
            ctx.lineTo(24, 0);
            ctx.lineTo(16, -12);
            ctx.closePath();
            ctx.fill();

            // embers trailing off the tail
            for (let ei = 0; ei < 5; ei++) {
                const ep = (now / 3 + ei * 130) % 650;
                const ex = 10 - ep;
                const ey = Math.sin(now / 40 + ei * 2.1) * (4 + ep * 0.05);
                const efade = Math.max(0, 1 - ep / 650);
                if (efade <= 0) continue;
                ctx.fillStyle = `rgba(255,${170 + Math.floor(60 * efade)},${60 * efade},${efade * 0.8})`;
                ctx.beginPath();
                ctx.arc(ex, ey, 1.6 * efade + 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // white-hot tip glow
            const tipPulse = 0.7 + 0.3 * Math.sin(now / 50);
            ctx.fillStyle = `rgba(255,255,255,${tipPulse})`;
            if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 34; }
            ctx.beginPath();
            ctx.arc(40, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}

// Scattered / bouncing projectiles
