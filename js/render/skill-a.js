// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/skill-a.js — extracted from render.js (Thunder Orbs).

// Blood Arrow (Libra) commissioned art, Dark Fantasy ink-wash redesign -
// drawn on top of the procedural vector arrowhead in drawSolArrows() below,
// never replacing it. Authored pointing right with the tip at the sprite's
// right edge, matching this file's local +X orientation exactly.
const _solArrowPrimaryImg = new Image();
_solArrowPrimaryImg.src = 'assets/images/game/effects/sol-arrow-primary.png';
_solArrowPrimaryImg.decode().catch(() => {});
const _solArrowSecondaryImg = new Image();
_solArrowSecondaryImg.src = 'assets/images/game/effects/sol-arrow-secondary.png';
_solArrowSecondaryImg.decode().catch(() => {});

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

// Blood Arrow (Libra buff 1): Sol Arrow windup + flight visuals - Dark
// Fantasy ink-wash redesign (charge mist -> faceted body + commissioned art
// overlay -> blood-flower impact bloom). Trail/impact particles are spawned
// in js/skills/sigil-libra.js's updateSolArrows() and drawn separately below
// by drawSolArrowParticles()/drawSolArrowLilies() - this function only
// draws the arrow body itself.
function drawSolArrows() {
    if (!window._solArrows || window._solArrows.length === 0) return;
    const now = performance.now();
    const gfx = _solArrowGfxTier();

    for (const arrow of window._solArrows) {
        if (arrow.state === 'windup') {
            // Ink-red glow quietly building at the player - the charge-mist
            // particles doing the real visual work are drawn separately by
            // drawSolArrowParticles(); this is just the core flash.
            const t = Math.min(1, (now - arrow.windupStart) / arrow.windupDuration);
            ctx.save();
            ctx.translate(player.x, player.y);
            if (gfx.shadowMul > 0) { ctx.shadowColor = '#c80a14'; ctx.shadowBlur = 20 * t * gfx.shadowMul; }
            ctx.fillStyle = `rgba(220,10,20,${0.15 * t})`;
            ctx.beginPath(); ctx.arc(0, 0, 10 + t * 14, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            continue;
        }

        if (arrow.state === 'flying') {
            const cfg = arrow.isPrimary ? SOL_ARROW_CFG.primary : SOL_ARROW_CFG.secondary;
            const angle = Math.atan2(arrow.vy, arrow.vx);
            ctx.save();
            ctx.translate(arrow.x, arrow.y);
            ctx.rotate(angle);
            ctx.scale(cfg.vecScale, cfg.vecScale);

            // Liquid wobble: the wing points breathe on independent sine
            // waves (phased per-arrow via bloodPhase) so the body reads as
            // a soft moving mass of blood instead of a rigid static shape.
            const wob = arrow.bloodPhase || 0;
            const wA = arrow.isPrimary ? 6 : 3.5;
            const w1 = Math.sin(now / 65 + wob) * wA;
            const w2 = Math.sin(now / 90 + wob + 2.4) * wA * 0.8;
            const w3 = Math.cos(now / 55 + wob + 1.1) * wA * 0.6;
            const w4 = Math.sin(now / 110 + wob + 4.0) * wA * 0.7;

            // Original hand-drawn silhouette (same shape/gradient this
            // whole redesign started from, see the standalone VFX demo),
            // now perturbed by the wobble above - shadowBlur scales with
            // the quality tier like every other glow.
            if (arrow.isPrimary) {
                ctx.beginPath();
                ctx.moveTo(38 + w3 * 0.3, 0);
                ctx.bezierCurveTo(15, -10 - w3, -5, -25 - w1 * 0.6, -28 - w1 * 0.3, -40 - w1);
                ctx.quadraticCurveTo(-15 + w4 * 0.4, -12, -15, 0);
                ctx.quadraticCurveTo(-15 + w4 * 0.4, 12, -28 - w2 * 0.3, 40 + w2);
                ctx.bezierCurveTo(-5, 25 + w2 * 0.6, 15, 10 + w3, 38 + w3 * 0.3, 0);
            } else {
                ctx.beginPath();
                ctx.moveTo(28 + w3 * 0.2, 0);
                ctx.quadraticCurveTo(8, -8 - w3 * 0.6, -20 - w1 * 0.3, -22 - w1);
                ctx.lineTo(-10, 0);
                ctx.lineTo(-20 - w2 * 0.3, 22 + w2);
                ctx.quadraticCurveTo(8, 8 + w3 * 0.6, 28 + w3 * 0.2, 0);
            }

            const grad = ctx.createLinearGradient(-25, 0, 38, 0);
            grad.addColorStop(0, cfg.inkColor);
            grad.addColorStop(0.5, cfg.color);
            grad.addColorStop(1, 'rgba(255, 40, 40, 1)');
            ctx.fillStyle = grad;
            if (gfx.shadowMul > 0) { ctx.shadowBlur = 25 * gfx.shadowMul; ctx.shadowColor = 'rgba(255, 0, 0, 0.7)'; }
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.moveTo(-15, -3); ctx.lineTo(18, 0); ctx.lineTo(-15, 3);
            ctx.fillStyle = cfg.inkColor;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-5, -4);
            ctx.quadraticCurveTo(15, -5, 25, -1);
            ctx.strokeStyle = cfg.glint;
            ctx.lineWidth = 1.8;
            ctx.globalCompositeOperation = 'lighter';
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';

            // Commissioned arrow art, overlaid on top of the silhouette
            // above (not replacing it) - present at every quality tier,
            // costs nothing extra to draw beyond the shape already there.
            const img = arrow.isPrimary ? _solArrowPrimaryImg : _solArrowSecondaryImg;
            if (img.complete && img.naturalWidth) {
                const headLen = arrow.isPrimary ? 42 : 30;
                const drawLen = arrow.isPrimary ? 100 : 68;
                const drawW = drawLen * (img.naturalHeight / img.naturalWidth);
                ctx.drawImage(img, headLen - drawLen, -drawW / 2, drawLen, drawW);
            }

            ctx.restore();
        }
    }
}

// Blood Arrow trail/charge particles (droplets, ink-mist, tendrils, impact
// flash) - spawned in js/skills/sigil-libra.js, drawn here every frame.
function drawSolArrowParticles() {
    const arr = window._solArrowParticles;
    if (!arr || arr.length === 0) return;
    for (const p of arr) {
        const progress = p.life / p.maxLife;
        const alpha = Math.max(0, 1 - Math.pow(progress, 1.2));

        ctx.save();
        ctx.globalAlpha = alpha;

        if (p.type === 'flash') {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, p.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'mist' || p.type === 'charge_mist') {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.scale);
            g.addColorStop(0, p.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            // charge_mist blends additively (the converging windup ring) -
            // plain 'mist' (flight/impact haze) stays normal alpha so it
            // doesn't blow out over busy backgrounds.
            if (p.type === 'charge_mist') ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.scale, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'droplet') {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.scale, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'tendril') {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            const length = p.scale * 7 * (1 - progress);
            ctx.ellipse(0, 0, length, p.scale * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'shard') {
            // Small blood-chunk fragment peeling off the arrow's wobbling
            // body - a squashed, rotating blob with a soft highlight so it
            // reads as a wet piece rather than a flat dot.
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle || 0);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.ellipse(0, 0, p.scale * 1.6, p.scale * 0.85, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.ellipse(-p.scale * 0.3, -p.scale * 0.2, p.scale * 0.5, p.scale * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }
}

// Blood Arrow impact bloom - a red spider lily (higanbana) unfurling on the
// primary target, spawned in js/skills/sigil-libra.js's _spawnSolArrowLily.
function drawSolArrowLilies() {
    const arr = window._solArrowLilies;
    if (!arr || arr.length === 0) return;
    const gfx = _solArrowGfxTier();

    for (const lily of arr) {
        if (lily.life >= lily.maxLife) continue;
        const fadeStart = lily.maxLife - 50;
        let alpha = 1.0;
        if (lily.life > fadeStart) alpha = Math.max(0, 1 - (lily.life - fadeStart) / 50);

        ctx.save();
        ctx.translate(lily.x, lily.y);
        // Same vecScale the arrow body itself is drawn at, so the bloom's
        // reach matches how big the arrow that caused it actually looked.
        ctx.scale(lily.cfg.vecScale, lily.cfg.vecScale);
        ctx.globalAlpha = alpha;
        if (gfx.shadowMul > 0) { ctx.shadowBlur = 15 * gfx.shadowMul; ctx.shadowColor = 'rgba(255, 10, 10, 0.5)'; }

        for (const p of lily.petals) {
            if (lily.life < p.delay) continue;
            const pt = Math.min(1, (lily.life - p.delay) / 45);
            const progress = 1 - Math.pow(1 - pt, 3);
            ctx.save();
            ctx.rotate(p.angle);
            const currentLen = p.length * progress;
            const ex = currentLen * 0.85;
            const ey = p.curl * 65 * progress;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(currentLen * 0.4, p.curl * 15 * progress, currentLen * 0.8, p.curl * 40 * progress, ex, ey);
            ctx.strokeStyle = 'rgba(210, 10, 20, 0.95)';
            ctx.lineWidth = 3.0;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(currentLen * 0.3, p.curl * 20 * progress, currentLen * 0.7, p.curl * 45 * progress, ex * 0.9, ey * 1.05);
            ctx.strokeStyle = 'rgba(255, 60, 60, 0.7)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
            ctx.restore();
        }

        for (const s of lily.stamens) {
            if (lily.life < s.delay) continue;
            const st = Math.min(1, (lily.life - s.delay) / 45);
            const sprogress = 1 - Math.pow(1 - st, 3);
            ctx.save();
            ctx.rotate(s.angle);
            const currentLen = s.length * sprogress;
            const ex = currentLen;
            const ey = s.curl * 45 * sprogress;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(currentLen * 0.3, s.curl * 5 * sprogress, currentLen * 0.7, s.curl * 25 * sprogress, ex, ey);
            ctx.strokeStyle = 'rgba(255, 120, 120, 0.5)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 210, 100, 0.95)';
            ctx.fill();
            ctx.restore();
        }

        const coreGlow = Math.max(0, 1 - lily.life / 60) * 25;
        if (coreGlow > 0) {
            ctx.beginPath(); ctx.arc(0, 0, coreGlow, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 230, 230, 0.8)'; ctx.fill();
        }

        ctx.restore();
    }
}

// Center-screen prompt while a Blood Arrow (Libra) charge is banked and
// ready - same box style as Great Sage's own release prompt (js/render/
// skill-f.js's _drawGreatSageReleasePrompt) and Cancer's Riptide Surge one
// (js/render/sigil-cancer.js's _drawTidalSurgeReadyPrompt), EN/VI via
// window._lang like every other bilingual HUD string in this codebase.
function _drawBloodArrowReadyPrompt() {
    const stacks = window._bloodArrowStacks || 0;
    if (stacks === 0) return;
    const now = performance.now();
    const pulse = 0.7 + 0.3 * Math.sin(now / 320);
    const cx = canvas.width / 2, cy = canvas.height * 0.5;
    const vi = window._lang === 'vi';
    const label = vi ? `HUYẾT TIỄN SẴN SÀNG x${stacks}` : `BLOOD ARROW READY x${stacks}`;
    const sub = vi ? 'A (cần mục tiêu): bắn' : 'A (needs a target): fire';

    ctx.save();
    ctx.font = 'bold 13px "Courier New", Consolas, monospace';
    const labelW = ctx.measureText(label).width;
    const boxW = Math.max(labelW, 160) + 40, boxH = 40;

    ctx.fillStyle = 'rgba(20,4,4,0.6)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8); ctx.fill(); }
    else ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    ctx.strokeStyle = `rgba(200,0,0,${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf) { ctx.shadowColor = '#c80000'; ctx.shadowBlur = 10 * pulse; }
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8); ctx.stroke(); }
    else ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,255,255,${0.75 + 0.25 * pulse})`;
    ctx.fillText(label, cx, cy - 8);
    ctx.font = '10px "Courier New", Consolas, monospace';
    ctx.fillStyle = 'rgba(255,180,180,0.75)';
    ctx.fillText(sub, cx, cy + 10);
    ctx.restore();
}

// Shared "charging" screen-edge vignette: a colored glow along the top edge
// with a handful of streaks creeping down, reused by every skill with a
// bank-then-release windup moment (Blood Arrow, Great Sage's stolen gems,
// Cancer's Riptide Surge - see their own thin wrappers in each skill's
// render file). `state` is a persistent {streaks, wasActive} object owned by
// the caller so simultaneous effects never fight over one shared pool;
// `rgb` is that skill's own accent color as a [r,g,b] triple. `style` picks
// the streak's actual shape/motion so each skill reads as its own effect,
// not a recolor of the others: 'blood' (straight drip, round tip - Libra
// only), 'spark' (jagged crackling energy, star tip - Great Sage), 'foam'
// (wavy curve, bubble cluster tip - Cancer).
//
// Graphics-tier scaling: Full/Medium keep the effect (Medium a bit smaller/
// fewer streaks), Low/Min cut it entirely - a screen-edge ambience layer
// isn't worth its cost once a device is already struggling, and everything
// else in this file already draws nothing extra at those tiers either.
function _updateDrawChargeVignette(state, active, rgb, style) {
    style = style || 'blood';
    const gfxLvl = window._gfxLevel || 0;
    if (gfxLvl >= 2) { state.streaks.length = 0; state.wasActive = active; return; }

    // The instant charging stops, clear immediately instead of a lingering
    // natural fall - reads as "the effect resolved", not "still bleeding".
    if (state.wasActive && !active) state.streaks.length = 0;
    state.wasActive = active;

    const streaks = state.streaks;
    const now = performance.now();
    const tierMul = gfxLvl === 1 ? 0.75 : 1.0;
    const maxStreaks = Math.round(14 * tierMul);

    if (active) {
        while (streaks.length < maxStreaks) {
            streaks.push({
                x: Math.random() * canvas.width, y: 0, len: 0,
                maxLen: (70 + Math.random() * 110) * tierMul,
                speed: 1.3 + Math.random() * 1.6,
                sway: Math.random() * Math.PI * 2,
                width: (2.5 + Math.random() * 3) * tierMul,
            });
        }
    }
    for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        s.y += s.speed;
        if (active) s.len = Math.min(s.maxLen, s.len + s.speed * 1.5);
        if (s.y - s.len > canvas.height * 0.45) streaks.splice(i, 1);
    }
    if (streaks.length === 0) return;

    const [r, g, b] = rgb;
    const rl = Math.min(255, r + 40), gl = Math.min(255, g + 40), bl = Math.min(255, b + 40);
    ctx.save();
    if (active) {
        // Spark flickers unevenly frame to frame (unstable crackling energy);
        // blood/foam pulse on a smooth sine (a heartbeat throb, a swelling tide).
        const glowA = style === 'spark'
            ? 0.4 + Math.random() * 0.25
            : 0.42 + 0.2 * (0.5 + 0.5 * Math.sin(now / 200));
        const grad = ctx.createLinearGradient(0, 0, 0, 220);
        grad.addColorStop(0, `rgba(${r},${g},${b},${glowA})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, 220);
    }
    for (const s of streaks) {
        const topY = Math.max(0, s.y - s.len);

        if (style === 'spark') {
            // Jagged lightning-crack streak with a small star-flare tip -
            // re-jittered live every frame for a genuinely unstable, crackling
            // feel (unlike blood/foam's smooth sway).
            ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
            ctx.lineWidth = Math.max(1, s.width * 0.6);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, topY);
            const segs = 3, span = s.y - topY;
            for (let i = 1; i < segs; i++) {
                const t = i / segs;
                ctx.lineTo(s.x + (Math.random() - 0.5) * s.width * 2.2, topY + span * t);
            }
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(${rl},${gl},${bl},0.9)`;
            ctx.lineWidth = 1.4;
            const flare = s.width * 1.3;
            for (let a = 0; a < 4; a++) {
                const ang = (Math.PI / 4) + a * (Math.PI / 2) + now / 250;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ang) * flare, Math.sin(ang) * flare);
                ctx.stroke();
            }
            ctx.restore();
        } else if (style === 'foam') {
            // Wavy water-curl streak with a small foam/bubble cluster tip -
            // bigger, slower sway than blood's tight shiver.
            const swayX = Math.sin(now / 380 + s.sway) * 9;
            ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
            ctx.lineWidth = s.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, topY);
            ctx.quadraticCurveTo(s.x + swayX, (topY + s.y) / 2, s.x + swayX * 0.6, s.y);
            ctx.stroke();
            ctx.fillStyle = `rgba(${rl},${gl},${bl},0.85)`;
            for (let bIdx = 0; bIdx < 3; bIdx++) {
                const bx = s.x + swayX * 0.6 + (bIdx - 1) * s.width * 0.6;
                const by = s.y + (bIdx === 1 ? -s.width * 0.5 : 0);
                ctx.beginPath();
                ctx.arc(bx, by, s.width * (bIdx === 1 ? 0.55 : 0.35), 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Blood: straight, tightly-shivering drip with a single round tip.
            const swayX = Math.sin(now / 400 + s.sway) * 3;
            ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
            ctx.lineWidth = s.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, topY);
            ctx.lineTo(s.x + swayX, s.y);
            ctx.stroke();
            ctx.fillStyle = `rgba(${rl},${gl},${bl},0.9)`;
            ctx.beginPath();
            ctx.arc(s.x + swayX, s.y, s.width * 0.95, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// Blood Arrow (Libra)'s own charge vignette: active while a volley is still
// building (windup) or its big arrow hasn't landed yet (flying) - vanishes
// the instant the big arrow resolves, one way or another.
window._bloodDripState = window._bloodDripState || { streaks: [], wasActive: false };

function _drawBloodArrowChargeVignette() {
    const arrows = window._solArrows || [];
    const charging = arrows.some(a => a.state === 'windup') || arrows.some(a => a.isPrimary && a.state === 'flying');
    _updateDrawChargeVignette(window._bloodDripState, charging, [180, 0, 10], 'blood');
}

// Scattered / bouncing projectiles
