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

// Great Sage sigil: draws the Ruyi Jingu Bang as an actual iron-and-gold rod
// (ambient glow, dark shaft gradient, a white-hot core seam, 2 gold bands
// with a ruby stud each, optional internal energy ridges) instead of the
// base skill's wide blade wedge. Ported directly from the reference demo
// (ruyi_sweep_demo.html's drawStaff) so the charging-phase growth and the
// sweep itself both read as the same weapon, not two different effects.
// Assumes ctx is already at the world origin (0,0); does its own
// translate(player.x, player.y) + rotate(angle) like the demo's version.
function _drawRuyiStaff(len, w, angle, alpha, opts) {
    if (len <= 0) return;
    opts = opts || {};
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;

    if (opts.richGlow) {
        if (!_mobPerf) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = w * 3.8; }
        ctx.fillStyle = 'rgba(251,191,36,0.26)';
        ctx.fillRect(0, -w * 0.9, len, w * 1.8);
        ctx.shadowBlur = 0;
    }

    // ambient glow
    if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = w * (opts.richGlow ? 2.8 : 1.8); }
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, -w / 2, len, w);
    ctx.shadowBlur = 0;

    // iron/obsidian shaft
    const shaftGrad = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    shaftGrad.addColorStop(0, '#171717');
    shaftGrad.addColorStop(0.2, '#404040');
    shaftGrad.addColorStop(0.5, '#0a0a0a');
    shaftGrad.addColorStop(0.8, '#262626');
    shaftGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(0, -w / 2, len, w);

    // white-hot core seam running the length of the shaft
    if (opts.richGlow) {
        const coreGrad = ctx.createLinearGradient(0, 0, len, 0);
        coreGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        coreGrad.addColorStop(0.5, 'rgba(254,240,138,0.6)');
        coreGrad.addColorStop(1, 'rgba(245,158,11,0.35)');
        ctx.fillStyle = coreGrad;
        if (!_mobPerf) { ctx.shadowColor = '#fff'; ctx.shadowBlur = w * 0.9; }
        ctx.fillRect(0, -w * 0.14, len, w * 0.28);
        ctx.shadowBlur = 0;
    }

    // gold band with a ruby stud at its center, near each end of the staff
    function drawBand(x, bWidth) {
        if (x > len) return;
        const actW = Math.min(bWidth, len - x);
        if (actW <= 0) return;

        const bGrad = ctx.createLinearGradient(0, -w / 2 - 5, 0, w / 2 + 5);
        bGrad.addColorStop(0, '#fef08a');
        bGrad.addColorStop(0.3, '#ca8a04');
        bGrad.addColorStop(0.5, '#713f12');
        bGrad.addColorStop(0.7, '#eab308');
        bGrad.addColorStop(1, '#fef08a');
        ctx.fillStyle = bGrad;
        ctx.fillRect(x, -w / 2 - 5, actW, w + 10);

        ctx.strokeStyle = 'rgba(40,20,0,0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + actW * 0.1, -w / 3);
        ctx.bezierCurveTo(x + actW * 0.4, -w / 8, x + actW * 0.6, -w / 2, x + actW * 0.9, -w / 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + actW * 0.1, w / 3);
        ctx.bezierCurveTo(x + actW * 0.4, w / 8, x + actW * 0.6, w / 2, x + actW * 0.9, w / 3);
        ctx.stroke();

        if (actW > bWidth * 0.7) {
            ctx.fillStyle = '#991b1b';
            if (!_mobPerf) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 12; }
            ctx.beginPath(); ctx.ellipse(x + actW / 2, 0, actW * 0.12, w * 0.28, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath(); ctx.ellipse(x + actW / 2 - 3, -3, actW * 0.04, w * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
    drawBand(50, 110);
    if (len > 250) drawBand(len - 150, 110);

    // internal energy ridges, re-rolled every frame during the sweep, plus
    // one long jitter streak the length of the shaft
    if (opts.ridges) {
        for (const rdg of opts.ridges) {
            ctx.strokeStyle = `rgba(255,255,255,${rdg.a})`;
            ctx.lineWidth = rdg.lw;
            ctx.beginPath();
            ctx.moveTo(len * rdg.t0, rdg.w0);
            ctx.lineTo(len * rdg.t1, rdg.w1);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5; if (!_mobPerf) { ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; }
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(len, (Math.random() - 0.5) * 18); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // random crackling energy arcing along the shaft
    if (Math.random() < 0.6) {
        ctx.strokeStyle = 'rgba(253,230,138,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        let lx = Math.random() * len * 0.8;
        let lEnd = lx + 100 + Math.random() * 200;
        let ly = (Math.random() - 0.5) * w;
        ctx.moveTo(lx, ly);
        while (lx < lEnd && lx < len) {
            lx += 25 + Math.random() * 40;
            ly += (Math.random() - 0.5) * w * 2.5;
            ctx.lineTo(Math.min(lx, len), ly);
        }
        ctx.stroke();
    }

    ctx.restore();
}

function drawSkillF() {
    const now = performance.now();
    const radius = Math.max(canvas.width, canvas.height);
    const _gfx = window._gfxLevel || 0;
    // Great Sage sigil: Skill F is reskinned into the Ruyi Jingu Bang, gold
    // instead of cyan, with the Kim Cô binding ring and its own title text
    const _greatSage = typeof _hasBuff === 'function' && _hasBuff('cuop_bao_tang');

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
                    // Great Sage: particles funnel in from the direction the
                    // staff is about to swing (-PI), like the demo, instead
                    // of a fully even 360° vortex
                    const a = _greatSage
                        ? -Math.PI + (Math.random() - 0.5) * Math.PI * 1.5
                        : Math.random() * Math.PI * 2;
                    const dist = Math.max(canvas.width, canvas.height) * (0.5 + Math.random() * 0.4);
                    const spin = (Math.random() < 0.5 ? -1 : 1) * (0.015 + Math.random() * 0.02);
                    _skillFChargeParticles.push({ angle: a, dist, spin });
                }
            }
            const pullSpeed = (_greatSage ? 5 : 3) + p * (_greatSage ? 22 : 14);
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
                ctx.strokeStyle = _greatSage ? `rgba(217,119,6,${alpha * 0.4})` : `rgba(120,255,255,${alpha * 0.4})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(player.x + Math.cos(trailA) * trailD, player.y + Math.sin(trailA) * trailD);
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.fillStyle = _greatSage ? `rgba(253,230,138,${alpha})` : `rgba(180,255,255,${alpha})`;
                ctx.beginPath(); ctx.arc(px, py, _greatSage ? 3.2 : 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // Player ship aura — grows and pulses brighter as charge builds,
        // culminating in a near-blinding flash right as the charge
        // completes ("tụ năng lượng → người chơi sáng lên → phóng"), which
        // hands off smoothly into the sweep phase's own impact flash.
        {
            // Great Sage's own aura runs bigger/brighter, matching the
            // reference demo's dramatic gathering-power bloom (its aura is
            // sized off the arena, not the player sprite) rather than the
            // base skill's more modest ship-relative glow.
            const pulse = 0.85 + 0.15 * Math.sin(now / (_greatSage ? 40 : 90));
            const auraR = _greatSage
                ? (60 + p * 220) * pulse
                : (player.width * 1.4 + p * player.width * 2.6) * pulse;
            ctx.save();
            const auraGrad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, auraR);
            if (_greatSage) {
                auraGrad.addColorStop(0,   `rgba(254,240,138,${0.15 + p * 0.55})`);
                auraGrad.addColorStop(0.5, `rgba(217,119,6,${0.1 + p * 0.35})`);
                auraGrad.addColorStop(1,   'rgba(180,83,9,0)');
            } else {
            auraGrad.addColorStop(0,   `rgba(255,255,255,${0.15 + p * 0.55})`);
            auraGrad.addColorStop(0.5, `rgba(150,240,255,${0.1 + p * 0.35})`);
            auraGrad.addColorStop(1,   'rgba(120,200,255,0)');
            }
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

        if (!_greatSage) {
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
        } else {
        // GREAT SAGE — the staff itself extends outward as charge builds,
        // pointing at the sweep's start angle, instead of the base skill's
        // cyan half-plane wash. Ported directly from the reference demo.
        const e_p = Math.pow(p, 2.5);
        _drawRuyiStaff(radius * e_p, 35 * (0.2 + 0.8 * e_p), -Math.PI, e_p, { richGlow: true });
        }

        // TARGET LOCK on every enemy — Great Sage swaps this for the Kim
        // Cô binding circlet; everyone else keeps the base cyan reticle.
        ctx.save();
        enemies.forEach(enemy => {
            const er = (enemy.size || 20) + 5;
            const pulse0 = 0.55 + 0.45 * Math.sin(now / 100 + enemy.x * 0.08);
            const lockIn0 = Math.min(p * 2, 1);
            if (!_greatSage) {
                if (lockIn0 <= 0) return;
                ctx.save();
                ctx.globalAlpha = lockIn0;
                // scan fill
                ctx.fillStyle = `rgba(0,255,200,${0.07 * pulse0})`;
                ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er * 1.4, 0, Math.PI * 2); ctx.fill();
                // outer rotating dashed ring
                ctx.save();
                ctx.translate(enemy.x, enemy.y); ctx.rotate(-now / 350);
                ctx.strokeStyle = `rgba(0,220,255,${0.7 * pulse0})`;
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
                    ctx.strokeStyle = `rgba(100,255,240,${0.9 * pulse0})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(bx, by - dy * bSize * 0.5); ctx.lineTo(bx, by);
                    ctx.lineTo(bx - dx * bSize * 0.5, by); ctx.stroke();
                });
                // crosshair lines
                ctx.strokeStyle = `rgba(0,255,200,${0.22 * pulse0})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(enemy.x - er * 1.6, enemy.y); ctx.lineTo(enemy.x + er * 1.6, enemy.y);
                ctx.moveTo(enemy.x, enemy.y - er * 1.6); ctx.lineTo(enemy.x, enemy.y + er * 1.6);
                ctx.stroke();
                // dashed line from player to enemy
                if (p > 0.5) {
                    ctx.strokeStyle = `rgba(0,200,255,${(p - 0.5) * 0.5 * pulse0})`;
                    ctx.lineWidth = 0.8; ctx.setLineDash([6, 10]);
                    ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(enemy.x, enemy.y); ctx.stroke();
                    ctx.setLineDash([]);
                }
                // TARGET label
                if (p > 0.6) {
                    ctx.fillStyle = `rgba(0,255,220,${Math.min((p - 0.6) * 5, 1) * (0.7 + 0.3 * pulse0)})`;
                    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    ctx.fillText('TARGET', enemy.x, enemy.y - er - 6);
                }
                ctx.restore();
                return;
            }
            const pulse = 0.55 + 0.45 * Math.sin(now / 100 + enemy.x * 0.08);
            const lockIn = Math.min(p * 2, 1);
            if (lockIn <= 0) return;
            // starts loose and tightens onto the target as lock-in completes
            const settle = Math.pow(lockIn, 0.6);
            const ringR = er + (1 - settle) * er * 1.3;
            ctx.save();
            ctx.globalAlpha = lockIn;

            // soft aura wash inside the band
            ctx.fillStyle = `rgba(251,191,36,${0.09 * pulse})`;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, ringR * 0.92, 0, Math.PI * 2); ctx.fill();

            // the band itself, slowly turning
            ctx.save();
            ctx.translate(enemy.x, enemy.y); ctx.rotate(now / 900);
            const ringGrad = ctx.createLinearGradient(-ringR, 0, ringR, 0);
            ringGrad.addColorStop(0, '#fde68a'); ringGrad.addColorStop(0.5, '#b45309'); ringGrad.addColorStop(1, '#fde68a');
            ctx.strokeStyle = ringGrad;
            ctx.lineWidth = 3;
            if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 10 + 6 * pulse; }
            ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            // inner darker rim line, reads as metal thickness
            ctx.strokeStyle = 'rgba(120,53,15,0.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, ringR - 2, 0, Math.PI * 2); ctx.stroke();

            // double-spiral "ruyi cloud" scroll fixed at the crown (undo the
            // band's own rotation first so it doesn't spin around with it) —
            // 2 mirrored brushed-gold hooks meeting at a center stud, matching
            // the real Kim Cô circlet's own cloud-scroll clasp motif instead
            // of a plain gem.
            ctx.rotate(-now / 900);
            const scrollR = 4.4;
            const scrollGrad = ctx.createLinearGradient(0, -ringR - scrollR * 2, 0, -ringR + scrollR);
            scrollGrad.addColorStop(0, '#fff4c2');
            scrollGrad.addColorStop(0.55, '#eab308');
            scrollGrad.addColorStop(1, '#92620a');
            ctx.strokeStyle = scrollGrad;
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8; }
            // left hook curls clockwise inward toward the center
            ctx.beginPath();
            ctx.arc(-scrollR * 0.95, -ringR, scrollR, Math.PI * 0.12, Math.PI * 1.85);
            ctx.stroke();
            // right hook mirrors it, curling counter-clockwise
            ctx.beginPath();
            ctx.arc(scrollR * 0.95, -ringR, scrollR, Math.PI * 1.15, Math.PI * 2.88);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.lineCap = 'butt';
            // center stud where the two scrolls meet
            ctx.fillStyle = '#fde68a';
            ctx.beginPath(); ctx.arc(0, -ringR, 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // drifting incantation glyphs around the rim — the binding
            // chant, not just a static shape. Skipped at LOW, thinned at MEDIUM.
            if (!_mobPerf) {
                const glyphs = ['緊', '箍', '咒'];
                const glyphCount = _gfx < 1 ? 3 : 1;
                for (let g = 0; g < glyphCount; g++) {
                    const ga = now / 1400 + g * (Math.PI * 2 / 3);
                    const gx = enemy.x + Math.cos(ga) * (ringR + 8);
                    const gy = enemy.y + Math.sin(ga) * (ringR + 8);
                    ctx.fillStyle = `rgba(253,224,71,${0.5 * settle})`;
                    ctx.font = '9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(glyphs[g % glyphs.length], gx, gy);
                }
            }

            // snap-flash the instant the band fully closes — 4 short energy
            // cracks radiating outward, gone within a blink.
            if (settle > 0.92) {
                const snapT = (settle - 0.92) / 0.08;
                ctx.save();
                ctx.globalAlpha = lockIn * (1 - snapT) * 0.8;
                ctx.strokeStyle = '#fff7d6'; ctx.lineWidth = 2;
                if (!_mobPerf) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 16; }
                for (let c = 0; c < 4; c++) {
                    const ca = (c / 4) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(enemy.x + Math.cos(ca) * er * 0.6, enemy.y + Math.sin(ca) * er * 0.6);
                    ctx.lineTo(enemy.x + Math.cos(ca) * (er + 14), enemy.y + Math.sin(ca) * (er + 14));
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                ctx.restore();
            }

            // fine inner ring, tight against the target — the "snug fit" line
            ctx.strokeStyle = `rgba(255,247,214,${0.6 + 0.3 * pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er - 1, 0, Math.PI * 2); ctx.stroke();

            // dashed tether from player, once mostly settled
            if (p > 0.5) {
                ctx.strokeStyle = `rgba(245,158,11,${(p - 0.5) * 0.5 * pulse})`;
                ctx.lineWidth = 0.8; ctx.setLineDash([6, 10]);
                ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(enemy.x, enemy.y); ctx.stroke();
                ctx.setLineDash([]);
            }

            // BOUND label
            if (settle > 0.7) {
                const labelA = Math.min((settle - 0.7) / 0.3, 1);
                ctx.fillStyle = `rgba(253,224,71,${labelA * (0.7 + 0.3 * pulse)})`;
                ctx.font = 'italic bold 9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText('BOUND', enemy.x, enemy.y - ringR - 6);
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
                ctx.fillStyle = _greatSage ? '#ffd700' : '#00ffff';
                if (!_mobPerf) ctx.shadowColor = _greatSage ? '#b8860b' : '#00aacc'; if (!_mobPerf) ctx.shadowBlur = 40;
                ctx.fillText(_greatSage ? '鬥戰勝佛' : '殲滅掃射', player.x, player.y - 80);

                ctx.globalAlpha = textT * 0.9;
                ctx.font = _greatSage ? 'bold 28px "Arial Black", sans-serif' : 'bold 34px "Arial Black", sans-serif';
                ctx.fillStyle = '#ffffff';
                if (!_mobPerf) ctx.shadowColor = _greatSage ? '#ffd700' : 'cyan'; if (!_mobPerf) ctx.shadowBlur = 24;
                ctx.fillText(_greatSage ? 'VICTORIOUS FIGHTING BUDDHA' : 'ANNIHILATION', player.x, player.y - 120);

                ctx.globalAlpha = textT * 0.9;
                ctx.font = 'italic 13px monospace';
                ctx.fillStyle = _greatSage ? '#ffe9a8' : '#aaffff';
                if (!_mobPerf) ctx.shadowBlur = 8;
                ctx.fillText(_greatSage ? '— Đấu Chiến Thắng Phật —' : '— Thiên Ý Trảm —', player.x, player.y - 96);
                ctx.restore();
            }
        }

        return;
    }

    // SWEEPING phase
    if (skillFState === "sweeping") {
        const sp = (now - skillFSweepStart) / skillFSweepDuration;
        const currentAngle = -Math.PI + Math.PI * sp;

        if (!_greatSage) {
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
        } else {
        // GREAT SAGE — Ruyi Jingu Bang sweep, ported directly from the
        // reference demo (ruyi_sweep_demo.html): the staff itself sweeping
        // through the arc, a soft radial fan wash behind it for the AOE
        // read, translucent scorch streaks, a shockwave ring + impact
        // flash, and a golden particle trail at the tip. Ransacked
        // Treasury widens the staff with kills landed so far this sweep
        // (not elapsed time), using the same multiplier the actual hit
        // cone in js/skills.js uses so the visual always matches the real
        // hitbox.
        const nhuYMult = Math.min(1 + (_skillFKillsThisSweep || 0) * 0.5, 4.5);
        // baseline widen as the swing travels (pure "gaining momentum"
        // feel — an accelerating curve like a real swing picking up force,
        // capped well below As One Wishes' own kill-driven growth so the
        // two read as distinct: this is the swing itself, that is landing
        // hits) separate from and stacking on top of the kill-driven
        // growth above
        const swingMomentum = 1 + Math.pow(sp, 1.5) * 0.8;
        const curW = 35 * nhuYMult * swingMomentum;
        const curLen = radius * (1.0 + sp * 0.3);

        // fan wash across the swept cone
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, radius * 1.3, -Math.PI, currentAngle);
        ctx.closePath();
        const fanGrad = ctx.createRadialGradient(player.x, player.y, 200, player.x, player.y, radius * 1.3);
        fanGrad.addColorStop(0, 'rgba(251,191,36,0.58)');
        fanGrad.addColorStop(0.5, 'rgba(217,119,6,0.3)');
        fanGrad.addColorStop(1, 'rgba(180,83,9,0)');
        ctx.fillStyle = fanGrad;
        ctx.fill();

        // scorch streaks stamped along the path already swept, fading over 450ms
        if (now - _skillFLastScorchStamp > 16) {
            _skillFLastScorchStamp = now;
            _skillFScorchMarks.push({ angle: currentAngle, time: now, width: curW });
        }
        for (let i = _skillFScorchMarks.length - 1; i >= 0; i--) {
            if (now - _skillFScorchMarks[i].time > 450) _skillFScorchMarks.splice(i, 1);
        }
        for (const mark of _skillFScorchMarks) {
            const a = 1 - (now - mark.time) / 450;
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(mark.angle);
            const sGrad = ctx.createLinearGradient(0, -mark.width / 2, 0, mark.width / 2);
            sGrad.addColorStop(0, 'rgba(253,230,138,0)');
            sGrad.addColorStop(0.5, `rgba(245,158,11,${a * 0.6})`);
            sGrad.addColorStop(1, 'rgba(253,230,138,0)');
            ctx.fillStyle = sGrad;
            ctx.fillRect(0, -mark.width * 0.8, curLen, mark.width * 1.6);
            ctx.restore();
        }
        ctx.restore();

        // shockwave ring at the origin the instant the sweep begins
        if (sp < 0.25) {
            const ringT = sp / 0.25;
            const ringA = (1 - ringT) * 0.8;
            const ringR = 20 + ringT * 340;
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.strokeStyle = `rgba(253,224,71,${ringA})`;
            ctx.lineWidth = 6 * (1 - ringT) + 1;
            if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 20; }
            ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // impact flash burst at the very start of the swing
        if (sp < 0.15) {
            const flashA = (1 - sp / 0.15) * 0.55;
            const flashR = 50 + sp * 260;
            ctx.save();
            const fg = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, flashR);
            fg.addColorStop(0, `rgba(255,255,255,${flashA})`);
            fg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(player.x, player.y, flashR, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // internal energy ridges, re-rolled every frame
        const ridgeCount = _gfx < 1 ? 3 : _gfx < 2 ? 2 : 0;
        const ridges = [];
        for (let i = 0; i < ridgeCount; i++) {
            const t0 = Math.random() * 0.75;
            const t1 = t0 + 0.1 + Math.random() * 0.15;
            ridges.push({
                t0, t1,
                w0: (Math.random() - 0.5) * curW,
                w1: (Math.random() - 0.5) * curW * 0.5,
                a: 0.3 + Math.random() * 0.4,
                lw: 1 + Math.random(),
            });
        }

        _drawRuyiStaff(curLen, curW, currentAngle, 1.0, { richGlow: true, ridges });

        // white-hot tip cap + golden particle trail near the tip
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(currentAngle);
        ctx.beginPath();
        ctx.ellipse(curLen, 0, curW * 0.6, curW * 1.5, 0, -Math.PI / 2, Math.PI / 2);
        ctx.fillStyle = '#fff';
        if (!_mobPerf) { ctx.shadowColor = '#fcd34d'; ctx.shadowBlur = 40; }
        ctx.fill();

        const sparkCount = _gfx < 1 ? 14 : _gfx < 2 ? 7 : 3;
        for (let i = 0; i < sparkCount; i++) {
            const dist = curLen * (0.7 + Math.random() * 0.3);
            const off = (Math.random() - 0.5) * curW * 2.5;
            ctx.fillStyle = `rgba(255,247,214,${0.5 + Math.random() * 0.5})`;
            if (!_mobPerf) { ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 6; }
            ctx.beginPath(); ctx.arc(dist, off, 1.5 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        // hit-impact flash — a bright golden burst that blooms then fades
        // at each enemy the staff actually struck this sweep
        for (let i = _skillFHitFlashes.length - 1; i >= 0; i--) {
            const hit = _skillFHitFlashes[i];
            const age = now - hit.time;
            if (age > 280) { _skillFHitFlashes.splice(i, 1); continue; }
            const a = 1 - age / 280;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = '#fff';
            if (!_mobPerf) { ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 30; }
            ctx.beginPath(); ctx.arc(hit.x, hit.y, hit.r * (1 + (1 - a) * 0.9), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(253,224,71,0.6)';
            ctx.beginPath(); ctx.arc(hit.x, hit.y, hit.r * (1.6 + (1 - a) * 1.4), 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        }
    }
    if (skillFState !== "sweeping" && skillFState !== "charging" && _skillFHitFlashes.length) {
        _skillFHitFlashes.length = 0;
    }
}

// Great Sage sigil: draws every pending stolen-attack effect
// (_greatSageEffects, js/skills.js) — telegraph lines, delayed-strike
// markers, arc-slash flashes, expanding shockwave rings, and the
// Leviathan-style rotating sweep beam. The thrown-sword and piercing-orb
// attacks need no draw code here since they're pushed straight into
// bladeArcProjectiles and already render through drawBladeArcProjectile.
function _drawGreatSageEffects() {
    if (!_greatSageEffects.length) return;
    const now = performance.now();
    // Every stolen attack renders in a shared blue tone once actually cast,
    // distinct from each gem's own color on its slot icon while still
    // banked - reads as "borrowed power" rather than the original owner's.
    for (const fx of _greatSageEffects) {
        if (fx.type === 'aegis' && fx.phase === 'telegraph') {
            // Ported from Goliath's own Aegis Core joker telegraph
            // (createAegisTelegraph, js/render/enemy-goliath.js), recolored
            // red->blue: wide translucent wash, dashed warning line, marker dot.
            const fullLen = Math.hypot(canvas.width, canvas.height);
            const lx = fx.x + Math.cos(fx.angle) * fullLen, ly = fx.y + Math.sin(fx.angle) * fullLen;
            ctx.save();
            ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(lx, ly);
            ctx.strokeStyle = 'rgba(59,130,246,0.14)'; ctx.lineWidth = 34; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(lx, ly);
            ctx.setLineDash([16, 13]); ctx.strokeStyle = 'rgba(96,165,250,0.85)'; ctx.lineWidth = 2.5;
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 10; }
            ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(96,165,250,0.9)'; ctx.fill();
            ctx.restore();
        } else if (fx.type === 'aegis' && fx.phase === 'fire') {
            // Ported from Goliath's own Aegis Core joker fire beam, recolored.
            const fullLen = Math.hypot(canvas.width, canvas.height);
            const lx = fx.x + Math.cos(fx.angle) * fullLen, ly = fx.y + Math.sin(fx.angle) * fullLen;
            const fade = Math.max(0, 1 - fx.timer / fx.dur);
            ctx.save();
            ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(lx, ly);
            ctx.strokeStyle = `rgba(30,64,175,${0.5 * fade})`; ctx.lineWidth = 46;
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 30; }
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(lx, ly);
            ctx.strokeStyle = `rgba(96,165,250,${fade})`; ctx.lineWidth = 22; ctx.shadowBlur = 16; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(lx, ly);
            ctx.strokeStyle = `rgba(255,255,255,${fade})`; ctx.lineWidth = 8; ctx.shadowBlur = 0; ctx.stroke();
            ctx.restore();
        } else if (fx.type === 'veilshroud') {
            // Ported from Goliath's own Veilshroud joker (countdown ring +
            // sky-lightning strike, js/render/enemy-goliath.js), recolored
            // orange->blue. fx.timer/fx.dur stands in for the real
            // lightningCountdown/1500 ratio.
            const prog = Math.min(1, fx.timer / fx.dur);
            ctx.save();
            if (prog > 0.01) {
                const fg = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, 130);
                fg.addColorStop(0, `rgba(59,130,246,${0.28 * prog})`);
                fg.addColorStop(1, 'rgba(59,130,246,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(fx.x, fx.y, 130, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 0.35 + prog * 0.65;
            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 12; }
            ctx.setLineDash([9, 6]);
            ctx.beginPath(); ctx.arc(fx.x, fx.y, 130, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            ctx.restore();
            // the bolt itself, once it lands (last 400ms of the window)
            if (fx.timer >= fx.dur - 400) {
                const fade = Math.max(0, (fx.dur - fx.timer) / 400);
                const skyY = fx.y - 900;
                const main = _greatSageJaggedLine(fx.x, skyY, fx.x, fx.y, 7, 30);
                const outer = _greatSageJaggedLine(fx.x, skyY, fx.x, fx.y, 5, 40);
                ctx.save();
                ctx.strokeStyle = `rgba(59,130,246,${fade * 0.5})`; ctx.lineWidth = 3 + 5 * fade;
                if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 20; }
                ctx.beginPath(); ctx.arc(fx.x, fx.y, 60 * (1.3 - fade * 0.3), 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath();
                outer.forEach((b, i) => i === 0 ? ctx.moveTo(b.x, b.y) : ctx.lineTo(b.x, b.y));
                ctx.strokeStyle = `rgba(59,130,246,${fade * 0.65})`; ctx.lineWidth = 7 * fade;
                ctx.stroke();
                ctx.beginPath();
                main.forEach((b, i) => i === 0 ? ctx.moveTo(b.x, b.y) : ctx.lineTo(b.x, b.y));
                ctx.strokeStyle = `rgba(255,255,255,${fade})`; ctx.lineWidth = 3 * fade;
                ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 22;
                ctx.stroke();
                for (let b = 0; b < 3; b++) {
                    const src = main[1 + Math.floor((main.length - 2) * (b + 0.5) / 3)];
                    const side = b % 2 === 0 ? 1 : -1;
                    const branch = _greatSageJaggedLine(src.x, src.y, src.x + side * 50, src.y + 40, 3, 14);
                    ctx.beginPath();
                    branch.forEach((bp, i) => i === 0 ? ctx.moveTo(bp.x, bp.y) : ctx.lineTo(bp.x, bp.y));
                    ctx.strokeStyle = `rgba(147,197,253,${fade * 0.7})`; ctx.lineWidth = 1.5 * fade;
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        } else if (fx.type === 'egregor' && fx.phase === 'windup') {
            // Ported from Goliath's own Egregor charging arc, recolored
            // orange->blue, R substituted for the real fixed 500.
            const progress = Math.min(1, fx.timer / fx.dur);
            const R = fx.R;
            const arcStart = fx.angle - Math.PI / 2, arcEnd = fx.angle + Math.PI / 2;
            const curR = R * (0.3 + 0.7 * progress);
            ctx.save();
            if (!_mobPerf) {
                const sfg = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, curR);
                sfg.addColorStop(0, `rgba(30,64,175,${0.08 * progress})`);
                sfg.addColorStop(0.7, `rgba(59,130,246,${0.06 * progress})`);
                sfg.addColorStop(1, 'rgba(30,64,175,0)');
                ctx.fillStyle = sfg;
                ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.arc(fx.x, fx.y, curR, arcStart, arcEnd); ctx.closePath(); ctx.fill();
            }
            const pulseAlpha = 0.6 + 0.35 * Math.sin(now / 60);
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 20 + progress * 15; }
            ctx.strokeStyle = `rgba(96,165,250,${pulseAlpha * progress})`; ctx.lineWidth = 3 + progress * 4;
            ctx.beginPath(); ctx.arc(fx.x, fx.y, curR, arcStart, arcEnd); ctx.stroke();
            const p1x = fx.x + Math.cos(arcStart) * curR, p1y = fx.y + Math.sin(arcStart) * curR;
            const p2x = fx.x + Math.cos(arcEnd) * curR, p2y = fx.y + Math.sin(arcEnd) * curR;
            ctx.strokeStyle = `rgba(147,197,253,${0.5 * progress})`; ctx.lineWidth = 2;
            ctx.setLineDash([10, 7]); ctx.lineDashOffset = -(now / 60) % 17;
            ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.shadowBlur = 0;
            if (progress > 0.85) {
                ctx.globalAlpha = ((progress - 0.85) / 0.15) * 0.25;
                ctx.fillStyle = 'rgba(59,130,246,1)';
                ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.arc(fx.x, fx.y, curR, arcStart, arcEnd); ctx.closePath(); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        } else if (fx.type === 'egregor' && fx.phase === 'strike') {
            // Ported from Goliath's own Egregor Null Slash tentacle whip
            // (extend/sweep/retract), recolored orange->blue.
            const st = fx.timer;
            const R = fx.R;
            const EXTEND = 200, SWEEP = 520, RETRACT = 230;
            const arcStart = fx.angle - Math.PI / 2, arcSpan = Math.PI;
            let ext, sweepT;
            if (st < EXTEND) { ext = 1 - Math.pow(1 - st / EXTEND, 2.8); sweepT = 0; }
            else if (st < EXTEND + SWEEP) {
                const p = (st - EXTEND) / SWEEP;
                ext = 1.0; sweepT = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
            } else {
                const r = (st - EXTEND - SWEEP) / RETRACT;
                ext = Math.pow(1 - r, 2.2); sweepT = 1.0;
            }
            if (ext > 0.01) {
                const steps = 38;
                const tentPts = [];
                for (let i = 0; i <= steps; i++) {
                    const tRaw = i / steps;
                    const laggedST = sweepT * Math.pow(tRaw, 0.5);
                    const ptAngle = arcStart + laggedST * arcSpan;
                    const radius = tRaw * R * ext;
                    const radX = Math.cos(ptAngle), radY = Math.sin(ptAngle);
                    const amp = Math.pow(tRaw, 1.6) * 72 * ext;
                    const ph = tRaw * Math.PI * 3.4 - sweepT * Math.PI * 4.8;
                    const wOff = Math.sin(ph) * amp + Math.sin(tRaw * Math.PI * 6.2 - sweepT * Math.PI * 8) * Math.pow(tRaw, 2.2) * 22 * ext;
                    tentPts.push({ x: fx.x + radius * radX + radX * wOff, y: fx.y + radius * radY + radY * wOff, w: 1 - tRaw });
                }
                ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                if (!_mobPerf && sweepT > 0.06 && sweepT < 0.96 && ext > 0.55) {
                    const tipAngle = arcStart + sweepT * arcSpan;
                    for (let tr = 5; tr >= 1; tr--) {
                        const trST = Math.max(0, sweepT - tr * 0.10);
                        const trA = arcStart + trST * arcSpan;
                        ctx.shadowColor = '#1d4ed8'; ctx.shadowBlur = 16;
                        ctx.strokeStyle = `rgba(29,78,216,${(6 - tr) * 0.022 * ext})`;
                        ctx.lineWidth = (6 - tr) * 4 * ext;
                        ctx.beginPath(); ctx.arc(fx.x, fx.y, R * ext * 0.90, trA, tipAngle); ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }
                if (!_mobPerf) {
                    ctx.shadowColor = '#93c5fd'; ctx.shadowBlur = 88;
                    const auraA = Math.min(0.32, 0.235 * ext);
                    for (let si = 0; si < tentPts.length - 1; si++) {
                        const p0 = tentPts[si], p1 = tentPts[si + 1];
                        ctx.strokeStyle = `rgba(59,130,246,${auraA * p0.w})`;
                        ctx.lineWidth = Math.max(8, 125 * p0.w);
                        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }
                if (!_mobPerf) { ctx.shadowColor = '#0a1024'; ctx.shadowBlur = 45; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = 'rgba(10,16,36,0.97)'; ctx.lineWidth = Math.max(2, 92 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                if (!_mobPerf) { ctx.shadowColor = '#1e40af'; ctx.shadowBlur = 28; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = `rgba(30,64,175,${0.90 * ext})`; ctx.lineWidth = Math.max(1, 70 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 16; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = `rgba(59,130,246,${0.72 * ext})`; ctx.lineWidth = Math.max(0.5, 46 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                ctx.shadowBlur = 0;
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    const sdx = p1.x - p0.x, sdy = p1.y - p0.y, sL = Math.hypot(sdx, sdy) || 1;
                    const hpX = -sdy / sL, hpY = sdx / sL, ho = 5 * p0.w;
                    ctx.strokeStyle = `rgba(191,219,254,${0.42 * p0.w * ext})`; ctx.lineWidth = Math.max(0.5, 19 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x + hpX * ho, p0.y + hpY * ho); ctx.lineTo(p1.x + hpX * ho, p1.y + hpY * ho); ctx.stroke();
                }
                if (!_mobPerf) { ctx.shadowColor = '#93c5fd'; ctx.shadowBlur = 12; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = `rgba(147,197,253,${0.42 * p0.w * ext})`; ctx.lineWidth = Math.max(0.5, 7 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                ctx.shadowBlur = 0;
                if (!_mobPerf) {
                    for (let si = 2; si < tentPts.length - 2; si += 2) {
                        const p = tentPts[si];
                        const sr = Math.max(3, 15 * p.w);
                        ctx.fillStyle = `rgba(10,20,50,${0.88 * ext})`;
                        ctx.beginPath(); ctx.arc(p.x, p.y, sr, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = `rgba(59,130,246,${0.55 * ext})`;
                        ctx.beginPath(); ctx.arc(p.x, p.y, sr * 0.42, 0, Math.PI * 2); ctx.fill();
                    }
                }
                ctx.restore();
            }
        } else if (fx.type === 'shockwave') {
            // Ported from Goliath's own Dargruel joker (a slow static
            // "influence zone" ring at 150px + the expanding shockwave burst
            // itself, which the real game draws via the shared
            // spawnBossShockwave/drawBossShockwaves system) - recolored to blue.
            ctx.save();
            ctx.beginPath(); ctx.arc(fx.x, fx.y, 150, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(59,130,246,0.4)'; ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([]);
            ctx.restore();
            const curRadius = fx.maxRadius * Math.min(1, fx.timer / fx.dur);
            const a = Math.max(0, 1 - fx.timer / fx.dur);
            ctx.save();
            ctx.strokeStyle = `rgba(59,130,246,${0.6 * a + 0.2})`;
            ctx.lineWidth = 5 * a + 1;
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 16; }
            ctx.beginPath(); ctx.arc(fx.x, fx.y, curRadius, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        } else if (fx.type === 'leviathan') {
            // Ported from Goliath's own Leviathan Perseverance Sweep beam
            // (multi-layer glow + breathing core + traveling flare),
            // recolored violet/cyan->blue.
            ctx.save();
            if (fx.phase === 'warn') {
                const warnPulse = 0.5 + Math.sin(now / 100) * 0.5;
                ctx.beginPath(); ctx.arc(fx.x, fx.y, 320, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(59,130,246,${0.35 + warnPulse * 0.35})`; ctx.lineWidth = 2.5 + warnPulse * 2; ctx.stroke();
            } else {
                const angle = fx.startAngle + (fx.timer / fx.sweepDur) * Math.PI * 2;
                const len = Math.max(canvas.width, canvas.height);
                ctx.translate(fx.x, fx.y); ctx.rotate(angle);
                if (!_mobPerf) { ctx.shadowColor = '#1d4ed8'; ctx.shadowBlur = 60; }
                const outerGrad = ctx.createLinearGradient(0, -60, 0, 60);
                outerGrad.addColorStop(0, 'rgba(30,64,175,0)');
                outerGrad.addColorStop(0.5, 'rgba(59,130,246,0.30)');
                outerGrad.addColorStop(1, 'rgba(30,64,175,0)');
                ctx.strokeStyle = outerGrad; ctx.lineWidth = 110;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
                const breathe = 1 + Math.sin(now / 90) * 0.1;
                if (!_mobPerf) { ctx.shadowColor = '#93c5fd'; ctx.shadowBlur = 45; }
                const coreGrad = ctx.createLinearGradient(0, -22, 0, 22);
                coreGrad.addColorStop(0, 'rgba(147,197,253,0)');
                coreGrad.addColorStop(0.5, 'rgba(147,197,253,0.9)');
                coreGrad.addColorStop(1, 'rgba(147,197,253,0)');
                ctx.strokeStyle = coreGrad; ctx.lineWidth = 18 * breathe;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
                const flareX = len * (0.5 + 0.5 * Math.sin(now / 260));
                const flareGrad = ctx.createRadialGradient(flareX, 0, 0, flareX, 0, 45);
                flareGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
                flareGrad.addColorStop(0.4, 'rgba(59,130,246,0.35)');
                flareGrad.addColorStop(1, 'rgba(59,130,246,0)');
                ctx.fillStyle = flareGrad;
                ctx.beginPath(); ctx.arc(flareX, 0, 45, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }
}

// Jagged lightning-bolt point list between 2 points, same generator shape as
// Goliath's own _goliathGenerateVein (js/entities/goliath.js) - used by the
// stolen Veilshroud bolt above.
function _greatSageJaggedLine(x1, y1, x2, y2, segments, jitter) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        if (i > 0 && i < segments) { x += (Math.random() - 0.5) * jitter; y += (Math.random() - 0.5) * jitter; }
        pts.push({ x, y });
    }
    return pts;
}

// Great Sage sigil: a clear "press F to release" prompt whenever at least
// 1 gem is banked, since spending one is now a priority action available
// any time (not just while Skill F itself is on cooldown) and is easy to
// miss without a direct call-out. Shown once per gem count change would be
// noisy, so it just stays up the whole time gems are held, pulsing softly.
function _drawGreatSageReleasePrompt() {
    if (typeof _hasBuff !== 'function' || !_hasBuff('cuop_bao_tang')) return;
    const gems = (typeof _greatSageGems !== 'undefined' ? _greatSageGems : []);
    if (gems.length === 0) return;
    const now = performance.now();
    const ready72 = gems.length >= 3 && (typeof _hasBuff === 'function' && _hasBuff('bien_hoa_72'));
    const pulse = 0.7 + 0.3 * Math.sin(now / 320);
    const cx = canvas.width / 2, cy = canvas.height * 0.5;
    const label = ready72 ? '72 TRANSFORMATIONS READY' : 'STOLEN GEM READY';
    const sub = ready72 ? 'F: unleash all 3 at once' : `F: release (${gems.length}/3 banked)`;

    ctx.save();
    ctx.font = 'bold 13px "Courier New", Consolas, monospace';
    const labelW = ctx.measureText(label).width;
    const boxW = Math.max(labelW, 160) + 40, boxH = 40;

    ctx.fillStyle = 'rgba(10,8,20,0.6)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8); ctx.fill(); }
    else ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    ctx.strokeStyle = `rgba(245,158,11,${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 10 * pulse; }
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8); ctx.stroke(); }
    else ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(253,224,71,${0.75 + 0.25 * pulse})`;
    ctx.fillText(label, cx, cy - 8);

    ctx.font = '10px "Courier New", Consolas, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(sub, cx, cy + 10);
    ctx.restore();
}

// Skill G barrier
