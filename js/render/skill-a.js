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

// Scattered / bouncing projectiles
