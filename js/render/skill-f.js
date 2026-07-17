// render/skill-f.js — extracted from render.js (Annihilation Sweep).

function drawSkillF() {
    const now = performance.now();
    const radius = Math.max(canvas.width, canvas.height);

    // CHARGING phase
    if (skillFState === "charging") {
        const p = Math.min((now - skillFChargeStart) / 1500, 1);

        // half-plane glow (charging side preview)
        ctx.save();
        ctx.translate(player.x, player.y);
        for (let i = 3; i >= 1; i--) {
            const r = player.width * (i * 2) * p;
            ctx.fillStyle = `rgba(0,255,255,${(0.05 + p * 0.08) / i})`;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(0,255,255,${0.08 + p * 0.14})`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, -Math.PI, 0); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI - Math.PI / 2;
            ctx.strokeStyle = `rgba(100,255,255,${p * 0.45})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * radius * p * 0.6, Math.sin(a) * radius * p * 0.6);
            ctx.stroke();
        }
        ctx.restore();

        // TARGET LOCK on every enemy
        ctx.save();
        enemies.forEach(enemy => {
            const er = (enemy.size || 20) + 5;
            const pulse = 0.55 + 0.45 * Math.sin(now / 100 + enemy.x * 0.08);
            const lockIn = Math.min(p * 2, 1);
            ctx.save();
            ctx.globalAlpha = lockIn;

            // scan fill
            ctx.fillStyle = `rgba(0,255,200,${0.07 * pulse})`;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er * 1.4, 0, Math.PI * 2); ctx.fill();

            // outer rotating dashed ring
            ctx.save();
            ctx.translate(enemy.x, enemy.y); ctx.rotate(-now / 350);
            ctx.strokeStyle = `rgba(0,220,255,${0.7 * pulse})`;
            ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.arc(0, 0, er + 8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]); ctx.restore();

            // inner solid ring
            ctx.strokeStyle = 'rgba(0,255,220,0.9)';
            ctx.lineWidth = 2;
            if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;

            // corner brackets
            const bSize = er * 0.5, bGap = er * 0.3;
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dy]) => {
                const bx = enemy.x + dx * (er + bGap * 0.4);
                const by = enemy.y + dy * (er + bGap * 0.4);
                ctx.strokeStyle = `rgba(100,255,240,${0.9 * pulse})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(bx, by - dy * bSize * 0.5); ctx.lineTo(bx, by);
                ctx.lineTo(bx - dx * bSize * 0.5, by); ctx.stroke();
            });

            // crosshair lines
            ctx.strokeStyle = `rgba(0,255,200,${0.22 * pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x - er * 1.6, enemy.y); ctx.lineTo(enemy.x + er * 1.6, enemy.y);
            ctx.moveTo(enemy.x, enemy.y - er * 1.6); ctx.lineTo(enemy.x, enemy.y + er * 1.6);
            ctx.stroke();

            // dashed line from player to enemy
            if (p > 0.5) {
                ctx.strokeStyle = `rgba(0,200,255,${(p - 0.5) * 0.5 * pulse})`;
                ctx.lineWidth = 0.8; ctx.setLineDash([6, 10]);
                ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(enemy.x, enemy.y); ctx.stroke();
                ctx.setLineDash([]);
            }

            // TARGET label
            if (p > 0.6) {
                ctx.fillStyle = `rgba(0,255,220,${Math.min((p - 0.6) * 5, 1) * (0.7 + 0.3 * pulse)})`;
                ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText('TARGET', enemy.x, enemy.y - er - 6);
            }
            ctx.restore();
        });
        ctx.restore();

        // ANNIHILATION TITLE
        {
            const textT = Math.min(p / 0.25, 1) * Math.max(0, 1 - (p - 0.6) / 0.4);
            if (textT > 0.02) {
                if (p < 0.05) _setShake(4, 100);
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.globalAlpha = textT * 0.28;
                ctx.font = 'bold 120px serif';
                ctx.fillStyle = '#00ffff';
                if (!_mobPerf) ctx.shadowColor = '#00aacc'; if (!_mobPerf) ctx.shadowBlur = 40;
                ctx.fillText('殲滅掃射', player.x, player.y - 80);

                ctx.globalAlpha = textT * 0.9;
                ctx.font = 'bold 34px "Arial Black", sans-serif';
                ctx.fillStyle = '#ffffff';
                if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 24;
                ctx.fillText('ANNIHILATION', player.x, player.y - 120);

                ctx.globalAlpha = textT * 0.9;
                ctx.font = 'italic 13px monospace';
                ctx.fillStyle = '#aaffff';
                if (!_mobPerf) ctx.shadowBlur = 8;
                ctx.fillText('— Thiên Ý Trảm —', player.x, player.y - 96);
                ctx.restore();
            }
        }

        return;
    }

    // SWEEPING phase
    if (skillFState === "sweeping") {
        const sp = (now - skillFSweepStart) / skillFSweepDuration;
        const currentAngle = -Math.PI + Math.PI * sp;

        // MATRIX RAIN inside the swept area
        ctx.save();
        // clip to the already-swept cone sector
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, radius, -Math.PI, currentAngle);
        ctx.closePath();
        ctx.clip();

        // matrix digital rain columns
        const colW = 18;
        const cols = Math.ceil(canvas.width / colW) + 1;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        for (let c = 0; c < cols; c++) {
            const cx2 = c * colW;
            const dropCount = 4 + (c % 3);
            for (let d = 0; d < dropCount; d++) {
                const charT = ((now / (120 + c * 7) + d * 0.28 + c * 0.11) % 1);
                const cy2 = charT * canvas.height;
                const ch = String.fromCharCode(0x30A0 + ((Math.floor(now / 90) + c * 3 + d * 7) % 96));
                const bright = d === 0 ? 1 : 0.35 + 0.3 * Math.sin(charT * Math.PI);
                ctx.fillStyle = d === 0
                    ? `rgba(200,255,220,${bright * 0.9})`
                    : `rgba(0,220,80,${bright * 0.55})`;
                ctx.fillText(ch, cx2, cy2);
            }
        }
        ctx.restore();

        // Afterimage ghost blades (HIGH only)
        if (_gfxLevel < 1) {
            for (let trail = 1; trail <= 3; trail++) {
                const ghostAngle = currentAngle - trail * 0.10;
                ctx.save();
                ctx.translate(player.x, player.y);
                ctx.rotate(ghostAngle);
                ctx.globalAlpha = 0.22 - trail * 0.06;
                ctx.fillStyle = 'rgba(0,255,255,0.9)';
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -28); ctx.lineTo(radius, 28);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }

        // SWEEP BLADE
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(currentAngle);

        // wide outer glow cone
        ctx.fillStyle = 'rgba(0,255,255,0.12)';
        if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 40;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -60); ctx.lineTo(radius, 60);
        ctx.closePath(); ctx.fill();

        // bright solid blade
        ctx.fillStyle = 'white';
        if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 50;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -12); ctx.lineTo(radius, 12);
        ctx.closePath(); ctx.fill();

        // cyan flanks
        ctx.fillStyle = 'rgba(0,255,255,0.65)';
        if (!_mobPerf) ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -42); ctx.lineTo(radius, 42);
        ctx.closePath(); ctx.fill();

        // jitter streak
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(radius, (Math.random() - 0.5) * 18); ctx.stroke();

        // blade edge particle sparks
        for (let i = 0; i < 6; i++) {
            const dist = 40 + Math.random() * (radius - 60);
            const off = (Math.random() - 0.5) * 30;
            ctx.fillStyle = `rgba(180,255,255,${0.4 + Math.random() * 0.5})`;
            ctx.beginPath(); ctx.arc(dist, off, 1.5 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();

        // MATRIX SCAN LINES on swept area overlay
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, radius, -Math.PI, currentAngle);
        ctx.closePath();
        ctx.clip();
        const scanLine = (now / 3) % canvas.height;
        ctx.fillStyle = 'rgba(0,255,120,0.06)';
        ctx.fillRect(0, scanLine, canvas.width, 3);
        ctx.fillRect(0, scanLine - canvas.height * 0.5, canvas.width, 2);
        ctx.restore();

        // HEX GRID overlay in swept area
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, radius, -Math.PI, currentAngle);
        ctx.closePath();
        ctx.clip();
        const hR = 28;
        const hW = hR * Math.sqrt(3), hH = hR * 2;
        ctx.strokeStyle = 'rgba(0,200,100,0.12)';
        ctx.lineWidth = 0.8;
        const hCols = Math.ceil(canvas.width / hW) + 2;
        const hRows = Math.ceil(canvas.height / (hH * 0.75)) + 2;
        for (let r = -1; r < hRows; r++) {
            for (let c = -1; c < hCols; c++) {
                const hx = c * hW + (r % 2 === 0 ? 0 : hW * 0.5);
                const hy = r * hH * 0.75;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
                    i === 0 ? ctx.moveTo(hx + Math.cos(a) * hR, hy + Math.sin(a) * hR)
                        : ctx.lineTo(hx + Math.cos(a) * hR, hy + Math.sin(a) * hR);
                }
                ctx.closePath(); ctx.stroke();
            }
        }
        ctx.restore();
    }
}

// Skill G barrier
