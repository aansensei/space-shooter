// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/skill-f.js — extracted from render.js (Annihilation Sweep).

// Inward-pulling charge particles: persist across frames (module scope,
// not local to drawSkillF) since they travel over multiple draw calls.
// Cleared whenever charging isn't active so a cancelled/completed charge
// never leaves stragglers for the next activation.
let _skillFChargeParticles = [];
// Scorch afterglow marks left behind along the sweep path: { angle, time }.
// Unlike the ghost trail (which moves with the blade), these stay fixed at
// the angle they were stamped and just fade out over ~300ms.
let _skillFScorchMarks = [];
let _skillFLastScorchStamp = 0;

function drawSkillF() {
    const now = performance.now();
    const radius = Math.max(canvas.width, canvas.height);
    const _gfx = window._gfxLevel || 0;

    if (skillFState !== "charging" && _skillFChargeParticles.length) {
        _skillFChargeParticles.length = 0;
    }
    if (skillFState !== "sweeping" && _skillFScorchMarks.length) {
        _skillFScorchMarks.length = 0;
    }

    // CHARGING phase
    if (skillFState === "charging") {
        const p = Math.min((now - skillFChargeStart) / 1500, 1);

        // Inward-swirling energy particles: spawn at the screen edge and
        // spiral toward the player as charge builds (radial pull + tangential
        // curl, like a vortex drawing in energy) instead of moving in dead-
        // straight lines — the anime "gathering power" look needs motion
        // that curves, not a mechanical radial grid.
        {
            const maxParticles = _gfx < 1 ? 60 : _gfx < 2 ? 25 : 0;
            const spawnRate    = _gfx < 1 ? 3  : _gfx < 2 ? 1  : 0;
            if (spawnRate > 0 && _skillFChargeParticles.length < maxParticles) {
                for (let i = 0; i < spawnRate; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const dist = Math.max(canvas.width, canvas.height) * (0.5 + Math.random() * 0.4);
                    const spin = (Math.random() < 0.5 ? -1 : 1) * (0.015 + Math.random() * 0.02);
                    _skillFChargeParticles.push({ angle: a, dist, spin });
                }
            }
            const pullSpeed = 3 + p * 14;
            ctx.save();
            for (let i = _skillFChargeParticles.length - 1; i >= 0; i--) {
                const pt = _skillFChargeParticles[i];
                pt.dist  -= pullSpeed;
                // curl tightens as the particle nears the core — a lazy
                // outer spiral that whips faster right before it vanishes
                pt.angle += pt.spin * (1 + (1 - Math.min(1, pt.dist / 400)) * 3);
                if (pt.dist < 10) { _skillFChargeParticles.splice(i, 1); continue; }
                const px = player.x + Math.cos(pt.angle) * pt.dist;
                const py = player.y + Math.sin(pt.angle) * pt.dist;
                const alpha = Math.min(1, pt.dist / 120) * 0.85;
                // faint trailing wisp behind each particle instead of a bare
                // dot, so the motion itself reads instead of just position
                const trailA = pt.angle - pt.spin * 6;
                const trailD = pt.dist + 14;
                ctx.strokeStyle = `rgba(120,255,255,${alpha * 0.4})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(player.x + Math.cos(trailA) * trailD, player.y + Math.sin(trailA) * trailD);
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.fillStyle = `rgba(180,255,255,${alpha})`;
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // Player ship aura — grows and pulses brighter as charge builds,
        // culminating in a near-blinding flash right as the charge
        // completes ("tụ năng lượng → người chơi sáng lên → phóng"), which
        // hands off smoothly into the sweep phase's own impact flash.
        {
            const pulse = 0.85 + 0.15 * Math.sin(now / 90);
            const auraR = (player.width * 1.4 + p * player.width * 2.6) * pulse;
            ctx.save();
            const auraGrad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, auraR);
            auraGrad.addColorStop(0,   `rgba(255,255,255,${0.15 + p * 0.55})`);
            auraGrad.addColorStop(0.5, `rgba(150,240,255,${0.1 + p * 0.35})`);
            auraGrad.addColorStop(1,   'rgba(120,200,255,0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath(); ctx.arc(player.x, player.y, auraR, 0, Math.PI * 2); ctx.fill();

            // final whiteout in the last stretch of charge — the "sáng lên"
            // beat right before release, blending straight into sweep's
            // own sp<0.15 flash so the two feel like one continuous burst.
            if (p > 0.88) {
                const flashT = (p - 0.88) / 0.12;
                const wg = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, auraR * 1.6);
                wg.addColorStop(0, `rgba(255,255,255,${flashT * 0.7})`);
                wg.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = wg;
                ctx.beginPath(); ctx.arc(player.x, player.y, auraR * 1.6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // half-plane glow (charging side preview) — dialed back a touch now
        // that the particle vortex + player aura carry most of the "gathering
        // energy" read; this stays as a soft ambient wash, not the focal point.
        ctx.save();
        ctx.translate(player.x, player.y);
        for (let i = 3; i >= 1; i--) {
            const r = player.width * (i * 2) * p;
            ctx.fillStyle = `rgba(0,255,255,${(0.04 + p * 0.06) / i})`;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(0,255,255,${0.06 + p * 0.10})`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, -Math.PI, 0); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI - Math.PI / 2;
            ctx.strokeStyle = `rgba(100,255,255,${p * 0.3})`;
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

        // SCORCH AFTERGLOW — burn marks stamped along the path the blade
        // has already swept, fixed in place (unlike the ghost trail, which
        // moves with the blade) and fading out over ~300ms. Skipped at LOW.
        // Color matches the blade's cyan/violet/white palette (was an
        // unrelated orange-red "fire" tint) and each mark's edges are baked
        // with a one-time random wobble at stamp time — a jagged, organic
        // silhouette instead of a perfectly straight geometric wedge.
        if (_gfx < 2) {
            const scorchLife = 300;
            if (now - _skillFLastScorchStamp > 30) {
                _skillFLastScorchStamp = now;
                const segs = 5;
                const upper = [[0, 0]], lower = [[0, 0]];
                for (let i = 1; i <= segs; i++) {
                    const t = i / segs;
                    const w = 24 * t;
                    const wob = (Math.random() - 0.5) * 10 * t;
                    upper.push([radius * t, -w + wob]);
                    lower.push([radius * t, w + wob]);
                }
                _skillFScorchMarks.push({ angle: currentAngle, time: now, upper, lower });
            }
            for (let i = _skillFScorchMarks.length - 1; i >= 0; i--) {
                if (now - _skillFScorchMarks[i].time > scorchLife) _skillFScorchMarks.splice(i, 1);
            }
            ctx.save();
            for (const mark of _skillFScorchMarks) {
                const a = Math.max(0, 1 - (now - mark.time) / scorchLife);
                ctx.save();
                ctx.translate(player.x, player.y);
                ctx.rotate(mark.angle);
                ctx.globalAlpha = a * 0.45;
                const sg = ctx.createLinearGradient(0, 0, radius, 0);
                sg.addColorStop(0,   'rgba(220,255,255,0.9)');
                sg.addColorStop(0.5, 'rgba(120,220,255,0.6)');
                sg.addColorStop(1,   'rgba(150,90,255,0.35)');
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.moveTo(mark.upper[0][0], mark.upper[0][1]);
                for (let i = 1; i < mark.upper.length; i++) ctx.lineTo(mark.upper[i][0], mark.upper[i][1]);
                for (let i = mark.lower.length - 1; i >= 0; i--) ctx.lineTo(mark.lower[i][0], mark.lower[i][1]);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }

        // SHOCKWAVE RING — expanding burst at the origin the instant the
        // sweep begins, giving an immediate "impact" beat distinct from the
        // blade itself (no screen shake, per design).
        if (sp < 0.25) {
            const ringT = sp / 0.25;
            const ringA = (1 - ringT) * 0.8;
            const ringR = 20 + ringT * 340;
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.strokeStyle = `rgba(160,240,255,${ringA})`;
            ctx.lineWidth = 6 * (1 - ringT) + 1;
            if (!_mobPerf) { ctx.shadowColor = 'cyan'; ctx.shadowBlur = 20; }
            ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // SWEEP BLADE — curved katana silhouette (was a straight triangle
        // cone) with a much thicker white-hot core and a white→cyan→violet
        // gradient along its length for a heavier, more forceful slash,
        // plus a brief impact flash at the moment of the swing (no screen
        // shake — just a fast-fading radial burst at the origin).
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

        // Layered blade — each ring gets its own visible rim stroke so the
        // layers read as distinct plates of energy instead of one soft
        // blended blob (the previous version stacked flat nested fills with
        // no edges between them, which is what read as "monotonous").

        // wide outer glow cone
        _bladePath(70, bow * 1.3);
        ctx.fillStyle = 'rgba(0,255,255,0.16)';
        if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 40;
        ctx.fill();

        // violet outer flank + bright rim edge
        _bladePath(55, bow * 1.1);
        ctx.fillStyle = 'rgba(140,80,255,0.55)';
        if (!_mobPerf) ctx.shadowBlur = 30;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(200,150,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();

        // cyan flank + bright rim edge
        _bladePath(42, bow);
        ctx.fillStyle = 'rgba(0,255,255,0.72)';
        if (!_mobPerf) ctx.shadowBlur = 28;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(180,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();

        // electric-blue mid band — extra layer between the flank and the
        // white core so there's a clear step in tone, not just a smooth
        // fade from cyan straight to white.
        _bladePath(30, bow * 0.75);
        ctx.fillStyle = 'rgba(80,180,255,0.8)';
        if (!_mobPerf) ctx.shadowColor = '#50b4ff'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        // massive white-hot core — much thicker than before (18→40) with a
        // lengthwise gradient (blinding near the player, cooling to cyan at
        // the tip) instead of one flat color, for real visual weight.
        _bladePath(40, bow * 0.6);
        const coreGrad = ctx.createLinearGradient(0, 0, radius, 0);
        coreGrad.addColorStop(0,   'rgba(255,255,255,1)');
        coreGrad.addColorStop(0.5, 'rgba(220,255,255,0.95)');
        coreGrad.addColorStop(1,   'rgba(120,220,255,0.85)');
        ctx.fillStyle = coreGrad;
        if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 55;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();

        // animated internal energy ridges — short bright streaks that
        // re-randomize every frame, cutting across the core at odd angles
        // so the blade doesn't read as one flat static shape.
        {
            const ridgeCount = _gfx < 1 ? 4 : _gfx < 2 ? 2 : 0;
            for (let i = 0; i < ridgeCount; i++) {
                const t0 = Math.random() * 0.75;
                const t1 = t0 + 0.1 + Math.random() * 0.15;
                const w0 = (Math.random() - 0.5) * 60;
                const w1 = (Math.random() - 0.5) * 30;
                ctx.strokeStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.4})`;
                ctx.lineWidth = 1 + Math.random();
                ctx.beginPath();
                ctx.moveTo(radius * t0, w0);
                ctx.lineTo(radius * t1, w1);
                ctx.stroke();
            }
        }

        // jitter streak
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(radius, (Math.random() - 0.5) * 18); ctx.stroke();

        // dense particle trail along the leading (outer) edge — replaces
        // the old evenly-scattered static sparks with a stream concentrated
        // near the blade tip, reading as the edge actively cutting forward.
        {
            const sparkCount = _gfx < 1 ? 14 : _gfx < 2 ? 7 : 3;
            for (let i = 0; i < sparkCount; i++) {
                const dist = radius * (0.7 + Math.random() * 0.3);
                const off = (Math.random() - 0.5) * 46;
                ctx.fillStyle = `rgba(200,255,255,${0.5 + Math.random() * 0.5})`;
                ctx.beginPath(); ctx.arc(dist, off, 1.5 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
            }
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
