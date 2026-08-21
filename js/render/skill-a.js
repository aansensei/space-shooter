// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
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

// Blood Arrow (Libra buff 1): Sol Arrow windup + flight visuals
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
            ctx.strokeStyle = `rgba(210,20,110,${0.6 + 0.4 * pulse})`;
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#d6148f'; ctx.shadowBlur = 18; }
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
            const wob = Math.sin(now / 60 + arrow.x * 0.04) * 3.3;
            ctx.save();
            ctx.translate(arrow.x, arrow.y);
            ctx.rotate(angle);
            ctx.translate(0, wob);
            if (arrow.isPrimary) ctx.scale(1.15, 1.15); // big marker arrow, +15% size

            if (!_mobPerf) { ctx.shadowColor = '#e0248f'; ctx.shadowBlur = 46; }

            // soft outer bloom halo — magenta/crimson glow
            const bloomPulse = 0.75 + 0.25 * Math.sin(now / 65);
            const bloomG = ctx.createRadialGradient(-14, 0, 0, -14, 0, 74);
            bloomG.addColorStop(0, `rgba(230,20,110,${0.34 * bloomPulse})`);
            bloomG.addColorStop(0.6, `rgba(130,0,90,${0.15 * bloomPulse})`);
            bloomG.addColorStop(1, 'rgba(90,0,70,0)');
            ctx.fillStyle = bloomG;
            ctx.beginPath(); ctx.arc(-14, 0, 74, 0, Math.PI * 2); ctx.fill();

            // Turbulent flame tail: layered flowing curves, animated flicker
            const flick1 = Math.sin(now / 70) * 8;
            const flick2 = Math.sin(now / 55 + 1.4) * 6.5;
            const flick3 = Math.sin(now / 90 + 2.7) * 9.5;

            // outer deep crimson-purple envelope
            ctx.fillStyle = 'rgba(120,0,60,0.45)';
            ctx.beginPath();
            ctx.moveTo(19, 0);
            ctx.bezierCurveTo(-13, 22 + flick1, -74, 30 + flick3, -128, 5 + flick2);
            ctx.bezierCurveTo(-94, 0, -74, -4, -47, 0);
            ctx.bezierCurveTo(-74, -4, -94, 0, -128, -5 - flick2);
            ctx.bezierCurveTo(-74, -30 - flick3, -13, -22 - flick1, 19, 0);
            ctx.closePath();
            ctx.fill();

            // middle vivid magenta-red flame
            ctx.fillStyle = 'rgba(210,15,95,0.87)';
            ctx.beginPath();
            ctx.moveTo(16, 0);
            ctx.bezierCurveTo(-11, 15 + flick2 * 0.8, -51, 19 + flick1 * 0.8, -92, 4 + flick3 * 0.6);
            ctx.bezierCurveTo(-65, 0, -40, -2.5, -24, 0);
            ctx.bezierCurveTo(-40, -2.5, -65, 0, -92, -4 - flick3 * 0.6);
            ctx.bezierCurveTo(-51, -19 - flick1 * 0.8, -11, -15 - flick2 * 0.8, 16, 0);
            ctx.closePath();
            ctx.fill();

            // inner hot pink-violet flame
            ctx.fillStyle = 'rgba(255,90,180,0.87)';
            ctx.beginPath();
            ctx.moveTo(13, 0);
            ctx.bezierCurveTo(-8, 8 + flick1 * 0.5, -30, 9.5 + flick2 * 0.5, -57, 2.5);
            ctx.bezierCurveTo(-38, 0, -22, -2, -13, 0);
            ctx.bezierCurveTo(-22, -2, -38, 0, -57, -2.5);
            ctx.bezierCurveTo(-30, -9.5 - flick2 * 0.5, -8, -8 - flick1 * 0.5, 13, 0);
            ctx.closePath();
            ctx.fill();

            // flickering flame licks rising off the shaft, like a torch
            const lickCount = 5;
            for (let li = 0; li < lickCount; li++) {
                const lx = -81 + li * 20 + Math.sin(now / 80 + li) * 4;
                const lickPhase = now / 60 + li * 1.7;
                const lickH = 9.5 + 5.5 * Math.abs(Math.sin(lickPhase));
                const lickLean = Math.sin(lickPhase * 0.6) * 4;
                ctx.fillStyle = `rgba(255,${50 + li * 12},${140 + li * 8},${0.55 - li * 0.03})`;
                ctx.beginPath();
                ctx.moveTo(lx - 4, 2);
                ctx.quadraticCurveTo(lx + lickLean, -lickH, lx + 1.3, -2);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(lx - 4, -2);
                ctx.quadraticCurveTo(lx + lickLean, lickH, lx + 1.3, 2);
                ctx.closePath();
                ctx.fill();
            }

            // shaft + sharp arrowhead
            if (!_mobPerf) ctx.shadowBlur = 30;
            ctx.fillStyle = '#ffd6ec';
            ctx.beginPath();
            ctx.moveTo(-2.7, 3.4);
            ctx.lineTo(24, 2.7);
            ctx.lineTo(24, -2.7);
            ctx.lineTo(-2.7, -3.4);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#fff0f8';
            ctx.beginPath();
            ctx.moveTo(62, 0);
            ctx.lineTo(21.6, 16.2);
            ctx.lineTo(32.4, 0);
            ctx.lineTo(21.6, -16.2);
            ctx.closePath();
            ctx.fill();

            // embers trailing off the tail
            for (let ei = 0; ei < 5; ei++) {
                const ep = (now / 3 + ei * 130) % 650;
                const ex = 13 - ep * 1.35;
                const ey = Math.sin(now / 40 + ei * 2.1) * (5.4 + ep * 0.07);
                const efade = Math.max(0, 1 - ep / 650);
                if (efade <= 0) continue;
                ctx.fillStyle = `rgba(255,${70 + Math.floor(60 * efade)},${170 * efade + 50},${efade * 0.8})`;
                ctx.beginPath();
                ctx.arc(ex, ey, 2.2 * efade + 0.7, 0, Math.PI * 2);
                ctx.fill();
            }

            // white-hot tip glow
            const tipPulse = 0.7 + 0.3 * Math.sin(now / 50);
            ctx.fillStyle = `rgba(255,240,250,${tipPulse})`;
            if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 38; }
            ctx.beginPath();
            ctx.arc(54, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}

// Scattered / bouncing projectiles
