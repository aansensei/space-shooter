// render/skill-f.js — extracted from render.js (Annihilation Sweep).

// Inward-pulling charge particles: persist across frames (module scope,
// not local to drawSkillF) since they travel over multiple draw calls.
// Cleared whenever charging isn't active so a cancelled/completed charge
// never leaves stragglers for the next activation.
let _skillFChargeParticles = [];

function drawSkillF() {
    const now = performance.now();
    const radius = Math.max(canvas.width, canvas.height);
    const _gfx = window._gfxLevel || 0;

    if (skillFState !== "charging" && _skillFChargeParticles.length) {
        _skillFChargeParticles.length = 0;
    }

    // CHARGING phase
    if (skillFState === "charging") {
        const p = Math.min((now - skillFChargeStart) / 1500, 1);

        // Inward-pulling energy particles: spawn at the screen edge and
        // accelerate toward the player as charge builds, selling "gathering
        // power" more directly than the background glow alone.
        {
            const maxParticles = _gfx < 1 ? 60 : _gfx < 2 ? 25 : 0;
            const spawnRate    = _gfx < 1 ? 3  : _gfx < 2 ? 1  : 0;
            if (spawnRate > 0 && _skillFChargeParticles.length < maxParticles) {
                for (let i = 0; i < spawnRate; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const dist = Math.max(canvas.width, canvas.height) * (0.5 + Math.random() * 0.4);
                    _skillFChargeParticles.push({ angle: a, dist });
                }
            }
            const pullSpeed = 3 + p * 14;
            ctx.save();
            for (let i = _skillFChargeParticles.length - 1; i >= 0; i--) {
                const pt = _skillFChargeParticles[i];
                pt.dist -= pullSpeed;
                if (pt.dist < 10) { _skillFChargeParticles.splice(i, 1); continue; }
                const px = player.x + Math.cos(pt.angle) * pt.dist;
                const py = player.y + Math.sin(pt.angle) * pt.dist;
                const alpha = Math.min(1, pt.dist / 120) * 0.85;
                ctx.fillStyle = `rgba(120,255,255,${alpha})`;
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

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

        // matrix digital rain columns — column width (density) scales by tier
        const colW = _gfx < 1 ? 18 : _gfx < 2 ? 26 : 36;
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

        // Afterimage ghost blades — trail count scales by tier instead of a
        // binary HIGH-only on/off, so MEDIUM still gets a lighter version.
        {
            const ghostCount = _gfx < 1 ? 5 : _gfx < 2 ? 2 : 0;
            for (let trail = 1; trail <= ghostCount; trail++) {
                const ghostAngle = currentAngle - trail * 0.10;
                ctx.save();
                ctx.translate(player.x, player.y);
                ctx.rotate(ghostAngle);
                ctx.globalAlpha = Math.max(0.03, 0.24 - trail * 0.045);
                ctx.fillStyle = 'rgba(0,255,255,0.9)';
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -28); ctx.lineTo(radius, 28);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }

        // SWEEP BLADE — curved katana silhouette (was a straight triangle
        // cone) with a thicker white-hot core for a heavier, more forceful
        // slash, plus a brief impact flash at the moment of the swing
        // (no screen shake — just a fast-fading radial burst at the origin).
        ctx.save();
        ctx.translate(player.x, player.y);

        if (sp < 0.15) {
            const flashA = (1 - sp / 0.15) * 0.55;
            const flashR = 50 + sp * 260;
            const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
            fg.addColorStop(0, `rgba(255,255,255,${flashA})`);
            fg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(0, 0, flashR, 0, Math.PI * 2); ctx.fill();
        }

        ctx.rotate(currentAngle);

        const bow = 30; // curve bulge of the blade edge, katana-style
        function _bladePath(halfW, bowAmt) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(radius * 0.55, -halfW - bowAmt, radius, -halfW);
            ctx.lineTo(radius, halfW);
            ctx.quadraticCurveTo(radius * 0.55, halfW + bowAmt, 0, 0);
            ctx.closePath();
        }

        // wide outer glow cone
        _bladePath(62, bow * 1.3);
        ctx.fillStyle = 'rgba(0,255,255,0.14)';
        if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 40;
        ctx.fill();

        // cyan flanks
        _bladePath(42, bow);
        ctx.fillStyle = 'rgba(0,255,255,0.68)';
        if (!_mobPerf) ctx.shadowBlur = 28;
        ctx.fill();

        // bright white-hot core — thicker than the old straight blade (12→18)
        _bladePath(18, bow * 0.6);
        ctx.fillStyle = 'white';
        if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 55;
        ctx.fill();
        ctx.shadowBlur = 0;

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

        // HEX GRID overlay in swept area — this nested per-cell loop over
        // the whole screen used to run unconditionally at every tier, a
        // fixed cost this game's other systems don't carry. Now skipped
        // entirely at LOW (matches how ghost trails/particles degrade) and
        // drawn at a coarser cell size on MEDIUM instead of full density.
        if (_gfx < 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, radius, -Math.PI, currentAngle);
        ctx.closePath();
        ctx.clip();
        const hR = _gfx < 1 ? 28 : 44;
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
}

// Skill G barrier
