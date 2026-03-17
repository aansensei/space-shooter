// ============================================================
//  render.js  –  Enhanced Graphics v2  (hitbox-safe, 60fps)
//  RULE: hitbox = original size/shape. Only VISUAL layers added.
// ============================================================

let bgStars = [];
// Pre-generate nebula points once
let nebulaPoints = null;

// ── lightweight cached offscreen canvas for glow ─────────────
function getOffCtx(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c.getContext('2d');
}

// ── star-field with subtle twinkle ───────────────────────────
function drawSpaceBackground(deltaTime) {
    ctx.fillStyle = '#03030f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Nebula cloud (drawn once, very cheap)
    if (!nebulaPoints) {
        nebulaPoints = [];
        for (let i = 0; i < 6; i++) {
            nebulaPoints.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.7,
                r: 80 + Math.random() * 180,
                h: Math.floor(Math.random() * 360),
                a: 0.04 + Math.random() * 0.07
            });
        }
    }
    ctx.save();
    nebulaPoints.forEach(n => {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        g.addColorStop(0, `hsla(${n.h},80%,40%,${n.a})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    });
    ctx.restore();

    if (bgStars.length === 0) {
        for (let i = 0; i < 200; i++) {
            bgStars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.8 + 0.3,
                speed: Math.random() * 1.8 + 0.3,
                color: Math.random() > 0.8 ? '#00e5ff' : (Math.random() > 0.5 ? '#ffffff' : '#ff88ff'),
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    const now = performance.now();
    let dt = deltaTime ? deltaTime / 16.67 : 1;
    ctx.save();
    bgStars.forEach(star => {
        star.y += star.speed * dt;
        if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
        const twinkle = 0.4 + 0.4 * Math.sin(now / 700 + star.phase);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = star.color;
        ctx.shadowColor = star.color;
        ctx.shadowBlur = star.size > 1.2 ? 4 : 0;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

// ── Yog-Sothoth shift arrows ──────────────────────────────────
function drawSkillShiftEffects() {
    if (!skillShiftActive) return;
    const now = performance.now();
    let chargeDuration = now - skillShiftChargeStart;
    let chargeRatio = Math.min(chargeDuration / skillShiftMaxCharge, 1);
    let maxDist = canvas.width * 0.45;
    let dist = chargeRatio * maxDist;

    let leftX = Math.max(player.width / 2 + 10, player.x - dist);
    let rightX = Math.min(canvas.width - player.width / 2 - 10, player.x + dist);

    // ── TELEPORT DESTINATION PORTALS (left & right) ──────────────
    function drawPortal(px, py) {
        const pulse = 0.7 + 0.3 * Math.sin(now / 160);
        const spinA = now / 700;
        const spinB = -now / 500;
        const portalR = 22 + 6 * chargeRatio;

        ctx.save();
        ctx.translate(px, py);

        // outer ring glow
        ctx.strokeStyle = `rgba(160,0,255,${0.5 * pulse})`;
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(0, 0, portalR + 8, 0, Math.PI * 2); ctx.stroke();

        // rotating segmented ring A
        ctx.rotate(spinA);
        ctx.strokeStyle = `rgba(220,80,255,${0.85 * pulse})`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(0, 0, portalR, a, a + Math.PI / 7);
            ctx.stroke();
        }

        // rotating segmented ring B (inner, opposite)
        ctx.rotate(spinB - spinA);
        ctx.strokeStyle = `rgba(255,180,255,${0.7 * pulse})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, portalR * 0.65, a, a + Math.PI / 5);
            ctx.stroke();
        }

        // void core
        ctx.rotate(-spinB);
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, portalR * 0.55);
        coreGrad.addColorStop(0, `rgba(255,255,255,${0.9 * pulse})`);
        coreGrad.addColorStop(0.3, `rgba(200,80,255,${0.8 * pulse})`);
        coreGrad.addColorStop(0.7, `rgba(60,0,120,0.6)`);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(0, 0, portalR * 0.55, 0, Math.PI * 2); ctx.fill();

        // space crack lines inside portal
        ctx.strokeStyle = `rgba(255,200,255,${0.6 * pulse})`;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 5; i++) {
            const ca = (i / 5) * Math.PI * 2 + now / 900;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const cl = portalR * 0.5 * Math.abs(Math.sin(now / 400 + i));
            ctx.lineTo(Math.cos(ca) * cl, Math.sin(ca) * cl);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ── CONNECTOR LINE between portals ────────────────────────────
    ctx.save();
    const connPulse = 0.4 + 0.3 * Math.abs(Math.sin(now / 220));
    // dashed cursed-energy thread
    ctx.strokeStyle = `rgba(200,0,255,${connPulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -(now / 40) % 24;
    ctx.beginPath();
    ctx.moveTo(leftX, player.y);
    ctx.lineTo(rightX, player.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.restore();

    if (player.x - leftX > 30) drawPortal(leftX, player.y);
    if (rightX - player.x > 30) drawPortal(rightX, player.y);

    // ── GHOST SHADOWS at destinations ─────────────────────────────
    ctx.save();
    const ghostAlpha = 0.18 + Math.abs(Math.sin(now / 200)) * 0.22;
    ctx.globalAlpha = ghostAlpha;
    drawPlayer(1, leftX - player.x);
    drawPlayer(1, rightX - player.x);
    ctx.restore();

    // ── CURSED ENERGY PARTICLES streaming along the connector ─────
    ctx.save();
    const streamCount = 8;
    for (let i = 0; i < streamCount; i++) {
        const t = ((now / 600 + i / streamCount) % 1);
        const sx = leftX + (rightX - leftX) * t;
        const sy = player.y + Math.sin(now / 200 + i * 1.2) * 6;
        const sAlpha = 0.6 * Math.sin(t * Math.PI);
        const sSize = 2.5 + 1.5 * Math.sin(now / 150 + i);
        ctx.fillStyle = `rgba(200,80,255,${sAlpha})`;
        ctx.beginPath(); ctx.arc(sx, sy, sSize, 0, Math.PI * 2); ctx.fill();
        // bright core dot
        ctx.fillStyle = `rgba(255,220,255,${sAlpha * 0.8})`;
        ctx.beginPath(); ctx.arc(sx, sy, sSize * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ── main draw ─────────────────────────────────────────────────
function draw(deltaTime) {
    ctx.save();
    if (screenShake.duration > 0) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake.intensity,
            (Math.random() - 0.5) * screenShake.intensity
        );
    }

    drawSpaceBackground(deltaTime);

    // ── Yog-Sothoth Domain Expansion (JJK signature) ─────────────
    if (gameState === "playing" && skillShiftActive) {
        const now = performance.now();
        let elapsed = now - skillShiftChargeStart;
        let maxRadius = Math.hypot(canvas.width, canvas.height);
        let expandT = Math.min(elapsed / 600, 1);
        let easeExpand = 1 - Math.pow(1 - expandT, 3);
        let currentDomainRadius = maxRadius * easeExpand;
        const domainFull = expandT >= 1;
        const cx = player.x, cy = player.y;
        // chargeRatio: 0→1 over skillShiftMaxCharge (3s) — used for energy buildup visuals
        const chargeRatio = Math.min(elapsed / skillShiftMaxCharge, 1);

        ctx.save();

        // ════════════════════════════════════════════════════════════
        // PHASE A — PRE-EXPANSION: CURSED ENERGY CHARGING VORTEX
        // Visible the entire time but peaks before domain opens
        // ════════════════════════════════════════════════════════════

        // A1. DARK AURA GROUND PULSE — circular shockwave rings emanating outward
        {
            const ringCount = 4;
            for (let i = 0; i < ringCount; i++) {
                const phase = ((now / 900) + i / ringCount) % 1;
                const ringR = 30 + phase * 220 * (0.4 + chargeRatio * 0.6);
                const ringA = (1 - phase) * 0.55 * chargeRatio;
                ctx.strokeStyle = `rgba(120,0,255,${ringA})`;
                ctx.lineWidth = 3 * (1 - phase);
                ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
            }
        }

        // A2. SPIRAL ENERGY STREAMS — 6 cursed-energy tendrils spiraling INTO player
        {
            const spiralCount = 6;
            for (let i = 0; i < spiralCount; i++) {
                const baseAngle = (i / spiralCount) * Math.PI * 2;
                const spinOffset = now / 500 * (i % 2 === 0 ? 1 : -0.7);
                ctx.save();
                ctx.translate(cx, cy);

                const streamLen = 160 + chargeRatio * 180;
                const steps = 28;
                ctx.beginPath();
                for (let s = steps; s >= 0; s--) {
                    const t = s / steps; // 1 = far, 0 = near player
                    const dist = t * streamLen;
                    const spiral = baseAngle + spinOffset + t * 2.8 * (i % 2 === 0 ? 1 : -1);
                    const px2 = Math.cos(spiral) * dist;
                    const py2 = Math.sin(spiral) * dist;
                    s === steps ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
                }
                const streamAlpha = (0.4 + chargeRatio * 0.55) * (0.6 + 0.4 * Math.sin(now / 220 + i));
                ctx.strokeStyle = i % 2 === 0
                    ? `rgba(180,0,255,${streamAlpha})`
                    : `rgba(255,80,255,${streamAlpha * 0.8})`;
                ctx.lineWidth = 1.2 + chargeRatio * 1.5;
                ctx.stroke();

                // bright core on stream
                ctx.strokeStyle = `rgba(255,200,255,${streamAlpha * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        // A3. PARTICLE VORTEX — dozens of cursed sparks sucked inward
        {
            const pCount = Math.floor(18 + chargeRatio * 30);
            for (let i = 0; i < pCount; i++) {
                // each particle: orbit that shrinks over time (pulled in)
                const seed = i * 137.508; // golden angle distribution
                const orbitPhase = ((now / (700 + (i % 5) * 120) + i * 0.19) % 1);
                const orbitR = 20 + (1 - orbitPhase) * (100 + (i % 7) * 20) * (0.5 + chargeRatio * 0.5);
                const angle = seed + orbitPhase * Math.PI * 4 * (i % 2 === 0 ? 1 : -1) + now / (800 + i * 30);
                const px2 = cx + Math.cos(angle) * orbitR;
                const py2 = cy + Math.sin(angle) * orbitR;
                const pAlpha = orbitPhase * (0.6 + chargeRatio * 0.4);
                const pSize = 2 + (1 - orbitPhase) * 2.5;
                ctx.fillStyle = i % 3 === 0
                    ? `rgba(255,100,255,${pAlpha})`
                    : i % 3 === 1
                        ? `rgba(160,0,255,${pAlpha})`
                        : `rgba(220,180,255,${pAlpha * 0.7})`;
                ctx.beginPath(); ctx.arc(px2, py2, pSize, 0, Math.PI * 2); ctx.fill();
                // tiny white core
                ctx.fillStyle = `rgba(255,255,255,${pAlpha * 0.6})`;
                ctx.beginPath(); ctx.arc(px2, py2, pSize * 0.35, 0, Math.PI * 2); ctx.fill();
            }
        }

        // A4. EYE OF THE STORM — concentric charged rings tight around player
        {
            const ringCount = 3;
            for (let i = 0; i < ringCount; i++) {
                const r = (14 + i * 12) + 4 * Math.sin(now / 160 + i * 1.1);
                const a = (0.5 + chargeRatio * 0.5) * (0.7 - i * 0.15);
                ctx.strokeStyle = i === 0
                    ? `rgba(255,255,255,${a})`
                    : i === 1
                        ? `rgba(220,100,255,${a})`
                        : `rgba(120,0,200,${a * 0.7})`;
                ctx.lineWidth = 3 - i * 0.8;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(now / (600 + i * 300) * (i % 2 === 0 ? 1 : -1));
                // segmented ring
                const segs = 6 + i * 2;
                for (let s = 0; s < segs; s++) {
                    const sa2 = (s / segs) * Math.PI * 2;
                    const ea2 = sa2 + Math.PI / (segs * 0.65);
                    ctx.beginPath(); ctx.arc(0, 0, r, sa2, ea2); ctx.stroke();
                }
                ctx.restore();
            }
        }

        // ════════════════════════════════════════════════════════════
        // PHASE B — DOMAIN VOID FILL + HEX FLOOR
        // ════════════════════════════════════════════════════════════

        // B1. HEX FLOOR — slowly scrolling to feel alive
        if (domainFull) {
            const hexR = 38;
            const hexW = hexR * Math.sqrt(3);
            const hexH = hexR * 2;
            const cols = Math.ceil(canvas.width / hexW) + 2;
            const rows = Math.ceil(canvas.height / (hexH * 0.75)) + 2;
            const gridT = Math.min((elapsed - 600) / 500, 1);
            // scroll offset
            const scrollX = (now / 6000 * hexW) % hexW;
            const scrollY = (now / 9000 * hexH * 0.75) % (hexH * 0.75);

            ctx.save();
            ctx.translate(-scrollX, -scrollY);
            for (let r = -2; r < rows + 1; r++) {
                for (let c = -2; c < cols + 1; c++) {
                    const hx = c * hexW + (r % 2 === 0 ? 0 : hexW * 0.5);
                    const hy = r * hexH * 0.75;
                    // distance-based dim from center
                    const dist = Math.hypot(hx + scrollX - cx, hy + scrollY - cy);
                    const distAlpha = Math.max(0, 1 - dist / (maxRadius * 0.6));
                    const pulse = 0.5 + 0.5 * Math.sin(now / 1200 + (hx * 0.02) + (hy * 0.015));
                    ctx.globalAlpha = gridT * distAlpha * pulse * 0.22;
                    ctx.strokeStyle = '#8800ff';
                    ctx.lineWidth = 0.9;
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
                        const px3 = hx + Math.cos(a) * hexR;
                        const py3 = hy + Math.sin(a) * hexR;
                        i === 0 ? ctx.moveTo(px3, py3) : ctx.lineTo(px3, py3);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    // occasional hex fill glow
                    if ((r * 7 + c * 13) % 11 === 0) {
                        ctx.globalAlpha = gridT * distAlpha * 0.06;
                        ctx.fillStyle = '#6600ff';
                        ctx.fill();
                    }
                }
            }
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        // B2. DARK VOID FILL
        ctx.beginPath();
        ctx.arc(cx, cy, currentDomainRadius, 0, Math.PI * 2);
        const domGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, currentDomainRadius);
        domGrad.addColorStop(0, 'rgba(15,0,40,0.82)');
        domGrad.addColorStop(0.4, 'rgba(22,0,55,0.88)');
        domGrad.addColorStop(0.75, 'rgba(35,0,75,0.92)');
        domGrad.addColorStop(1, 'rgba(5,0,20,0.96)');
        ctx.fillStyle = domGrad;
        ctx.fill();

        // B2b. PURPLE TINT OVERLAY — flat screen-wide purple wash inside domain
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, currentDomainRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = 'rgba(80,0,160,0.22)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // ════════════════════════════════════════════════════════════
        // PHASE C — BOUNDARY, CRACKS, RAYS, RUNES (full domain)
        // ════════════════════════════════════════════════════════════

        // C1. BOUNDARY RING
        if (!domainFull) {
            // --- expanding shockwave wall ---
            ctx.lineWidth = 16;
            ctx.strokeStyle = 'rgba(160,0,255,0.95)';
            ctx.shadowColor = '#df00ff'; ctx.shadowBlur = 50;
            ctx.beginPath(); ctx.arc(cx, cy, currentDomainRadius, 0, Math.PI * 2); ctx.stroke();

            if (currentDomainRadius > 10) {
                ctx.lineWidth = 6;
                ctx.strokeStyle = 'rgba(255,180,255,0.75)';
                ctx.shadowBlur = 22;
                ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, currentDomainRadius - 7), 0, Math.PI * 2); ctx.stroke();
            }

            // trailing shockwave ring
            const shockR = currentDomainRadius + 12 * (1 - expandT);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = `rgba(255,255,255,${(1 - expandT) * 0.95})`;
            ctx.shadowBlur = 12;
            if (shockR > 0) { ctx.beginPath(); ctx.arc(cx, cy, shockR, 0, Math.PI * 2); ctx.stroke(); }

            // second inner ring
            const innerR = currentDomainRadius * 0.85;
            if (innerR > 1) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = `rgba(200,100,255,${(1 - expandT) * 0.6})`;
                ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.stroke();
            }
        } else {
            // --- stable domain wall: two counter-rotating segmented rings ---
            const wallPulse = 0.6 + 0.4 * Math.sin(now / 280);
            // outer slow ring
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(now / 8000);
            const wallSegs = 24;
            for (let i = 0; i < wallSegs; i++) {
                const wa = (i / wallSegs) * Math.PI * 2;
                const wa2 = wa + Math.PI / (wallSegs * 0.6);
                ctx.strokeStyle = `rgba(140,0,240,${wallPulse * 0.8})`;
                ctx.lineWidth = 8;
                ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 18;
                ctx.beginPath(); ctx.arc(0, 0, maxRadius * 0.998, wa, wa2); ctx.stroke();
            }
            // inner fast ring opposite direction
            ctx.rotate(-now / 3500);
            for (let i = 0; i < 12; i++) {
                const wa = (i / 12) * Math.PI * 2 + 0.13;
                const wa2 = wa + Math.PI / 9;
                ctx.strokeStyle = `rgba(220,80,255,${wallPulse * 0.45})`;
                ctx.lineWidth = 3;
                ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(0, 0, maxRadius * 0.992, wa, wa2); ctx.stroke();
            }
            ctx.restore();
        }
        ctx.shadowBlur = 0;

        // C2. SPACE CRACKS from origin
        {
            const crackCount = 16;
            const crackAlpha = Math.min(elapsed / 280, 1);
            for (let i = 0; i < crackCount; i++) {
                const baseAngle = (i / crackCount) * Math.PI * 2 + (i % 2) * 0.12;
                const crackLen = (50 + (i % 4) * 35 + (i % 6) * 18) * crackAlpha;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(baseAngle);
                ctx.strokeStyle = `rgba(180,0,255,${0.9 * crackAlpha})`;
                ctx.lineWidth = 1.2 + (i % 4) * 0.45;
                ctx.beginPath(); ctx.moveTo(0, 0);
                let lx = 0, ly = 0;
                const segments = 4 + (i % 3);
                for (let s = 0; s < segments; s++) {
                    const segLen = crackLen / segments;
                    const fork = ((s % 2 === 0) ? 0.28 : -0.22) * (1 + (i % 3) * 0.2);
                    lx += Math.cos(fork) * segLen;
                    ly += Math.sin(fork) * segLen * 0.55;
                    ctx.lineTo(lx, ly);
                    // branch crack on some segments
                    if (s === 2 && i % 3 === 0) {
                        ctx.save();
                        ctx.moveTo(lx, ly);
                        ctx.lineTo(lx + Math.cos(fork + 0.6) * segLen * 0.5, ly + Math.sin(fork + 0.6) * segLen * 0.3);
                        ctx.stroke();
                        ctx.restore();
                        ctx.beginPath(); ctx.moveTo(lx, ly);
                    }
                }
                ctx.stroke();
                // bright core on crack
                ctx.strokeStyle = `rgba(240,210,255,${0.55 * crackAlpha})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
                ctx.restore();
            }
        }

        // C3. SWEEPING VOID RAYS from center (rotate slowly)
        {
            const rayAlpha = domainFull ? Math.min((elapsed - 600) / 350, 1) * 0.6 : 0;
            if (rayAlpha > 0) {
                const rayCount = 12;
                for (let i = 0; i < rayCount; i++) {
                    const ra = (i / rayCount) * Math.PI * 2 + now / 5500 * (i % 2 === 0 ? 1 : -0.6);
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(ra);
                    const rayGrad = ctx.createLinearGradient(0, 0, maxRadius, 0);
                    const isMain = i % 3 === 0;
                    rayGrad.addColorStop(0, `rgba(200,0,255,${rayAlpha * (isMain ? 1 : 0.5)})`);
                    rayGrad.addColorStop(0.25, `rgba(120,0,200,${rayAlpha * 0.4})`);
                    rayGrad.addColorStop(1, 'rgba(30,0,80,0)');
                    ctx.fillStyle = rayGrad;
                    const beamW = isMain
                        ? 10 + 6 * Math.abs(Math.sin(now / 500 + i))
                        : 3 + 2 * Math.abs(Math.sin(now / 700 + i));
                    ctx.globalAlpha = rayAlpha;
                    ctx.fillRect(0, -beamW / 2, maxRadius, beamW);
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
            }
        }

        // C4. ORBITING CURSED RUNE RINGS (3 orbits, different speeds/dirs)
        {
            const runeAlpha = Math.min(elapsed / 450, 1);
            const runes = ['∞', '✦', '⬡', '✺', '∑', '⌬', '⊗', '◈', 'Ω', '⚡', '꩜', '⌖'];
            [[70, 4, 1], [130, 5, -0.65], [200, 7, 0.4]].forEach(([orbitR, count, dir], oi) => {
                const rotSpeed = dir * (now / (2200 + oi * 500));
                for (let i = 0; i < count; i++) {
                    const ra = (i / count) * Math.PI * 2 + rotSpeed;
                    const rx = cx + Math.cos(ra) * orbitR;
                    const ry = cy + Math.sin(ra) * orbitR;
                    const flicker = 0.55 + 0.45 * Math.sin(now / 250 + i * 1.9 + oi * 2.3);
                    ctx.save();
                    ctx.globalAlpha = runeAlpha * flicker;
                    ctx.translate(rx, ry);
                    ctx.rotate(ra + Math.PI / 2 + now / 1200 * dir);
                    const fSize = 11 + oi * 4;
                    ctx.font = `bold ${fSize}px monospace`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillStyle = oi === 0 ? '#dd55ff' : oi === 1 ? '#ff44ee' : '#9900ff';
                    ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10;
                    ctx.fillText(runes[(i + oi * 4) % runes.length], 0, 0);
                    // trailing ghost rune
                    ctx.globalAlpha *= 0.25;
                    ctx.translate(-Math.cos(ra) * 8, -Math.sin(ra) * 8);
                    ctx.fillText(runes[(i + oi * 4) % runes.length], 0, 0);
                    ctx.restore();
                }
            });
        }

        // C5. LIGHTNING VEINS — random lightning that re-draws each frame inside domain
        if (domainFull) {
            const veinAlpha = Math.min((elapsed - 600) / 600, 1) * 0.7;
            const veinCount = 5;
            for (let i = 0; i < veinCount; i++) {
                // each vein: from player outward to a semi-random far point
                const seed = Math.floor(now / 180 + i * 7); // re-seeds every 180ms
                const ang = ((seed * 137.5 + i * 60) % 360) * Math.PI / 180;
                const len = 150 + (seed % 5) * 80;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(ang);
                ctx.strokeStyle = `rgba(200,100,255,${veinAlpha * (0.5 + 0.5 * (i % 2))})`;
                ctx.lineWidth = 1 + (i % 3) * 0.5;
                ctx.beginPath(); ctx.moveTo(0, 0);
                let vx = 0, vy = 0;
                const vsegs = 6;
                for (let s = 0; s < vsegs; s++) {
                    vx += len / vsegs + (((seed * (s + 1) * 13) % 20) - 10);
                    vy += (((seed * (s + 3) * 17 + i) % 24) - 12) * 0.6;
                    ctx.lineTo(vx, vy);
                }
                ctx.stroke();
                // bright white core
                ctx.strokeStyle = `rgba(255,240,255,${veinAlpha * 0.35})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
                ctx.restore();
            }
        }

        // C6. DOMAIN TITLE TEXT — "領域展開" fades in briefly
        {
            const textT = Math.min(elapsed / 250, 1) * Math.max(0, 1 - (elapsed - 250) / 600);
            if (textT > 0.02) {
                ctx.save();
                ctx.globalAlpha = textT * 0.75;
                ctx.font = 'bold 28px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 20;
                ctx.fillText('YOG-SOTHOTH', cx, cy - 70);
                ctx.font = 'italic 13px monospace';
                ctx.fillStyle = '#dd88ff';
                ctx.shadowBlur = 8;
                ctx.fillText('Cursed Domain Expansion', cx, cy - 46);
                ctx.restore();
            }
        }

        // C7. CORE BURST at player — grows and pulses
        {
            const coreSize = 22 + 10 * Math.sin(now / 160);
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 2.2);
            coreGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
            coreGrad.addColorStop(0.15, 'rgba(240,180,255,0.85)');
            coreGrad.addColorStop(0.4, 'rgba(160,0,255,0.55)');
            coreGrad.addColorStop(0.75, 'rgba(60,0,120,0.25)');
            coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = coreGrad;
            ctx.globalAlpha = Math.min(elapsed / 200, 1);
            ctx.beginPath(); ctx.arc(cx, cy, coreSize * 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;

            // four diagonal energy spikes from core
            const spikeLen = 18 + chargeRatio * 22;
            for (let i = 0; i < 4; i++) {
                const sa2 = Math.PI / 4 + i * Math.PI / 2 + now / 1800;
                ctx.strokeStyle = `rgba(220,120,255,${0.7 * Math.min(elapsed / 200, 1)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(sa2) * spikeLen, cy + Math.sin(sa2) * spikeLen);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    if (demonGiftEffect.active && performance.now() < demonGiftEffect.endTime) {
        drawDemonGiftAura();
    }

    drawSkillGBarrier();

    if (gameState === "playing") {
        sentinels.forEach(drawSentinel);
        if (skillAActive) drawSkillA();
        bladeArcProjectiles.forEach(drawBladeArcProjectile);
        scatteredProjectiles.forEach(drawScatteredProjectile);

        teslaCoils.forEach(drawTeslaCoil);
        energyOrbs.forEach(drawEnergyOrb);

        drawAegisLasers();

        enemies.forEach(drawEnemy);
        bullets.forEach(drawBullet);
        spiritBullets.forEach(drawSpiritBullet);
        spirits.forEach(drawSpirit);
        if (blackHole) drawBlackHole();

        drawBossShockwaves();

        if (laserActive) {
            playerClones.forEach(clone => drawPlayer(0.45, clone.xOffset));
            drawLaser();
        }
        drawPlayer();
        drawPlayerAura();
        drawFinalDefense();

        if (charging && !laserActive) drawChargeEffect();
        explosions.forEach(drawExplosion);
        particles.forEach(drawParticle);
        chainLightningEffects.forEach(drawChainLightning);
        if (skillFState !== 'ready') drawSkillF();
        if (charging) drawChargeMeter();
        if (skillShiftActive) drawSkillShiftEffects();

        // boundary line
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, boundaryY);
        ctx.lineTo(canvas.width, boundaryY);
        ctx.stroke();
        ctx.restore();
    }

    if (gameState === "playing") {
        drawSkillButtons();
        ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "right";
        ctx.fillText("Score: " + score, canvas.width - 20, 30);
        ctx.fillText("Lives: " + lives, canvas.width - 20, 60);
        ctx.fillText("Sentinels: " + sentinels.length, canvas.width - 20, 90);
        ctx.fillText("Tesla Coils: " + teslaCoils.length, canvas.width - 20, 120);
    } else if (gameState === "start") {
        ctx.textAlign = "center"; ctx.font = "40px Arial"; ctx.fillStyle = "white";
        ctx.fillText("Space Shooter Pro", canvas.width / 2, canvas.height / 2 - 50);
    } else if (gameState === "gameover") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(canvas.width / 2 - 250, canvas.height / 2 - 100, 500, 200);
        ctx.textAlign = "center";
        ctx.font = "50px Arial";
        ctx.fillStyle = "red";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = "30px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Tổng Điểm: " + score, canvas.width / 2, canvas.height / 2 + 30);
    }
    ctx.restore();
}

// ── Aegis lasers ──────────────────────────────────────────────
function drawAegisLasers() {
    aegisLasers.forEach(laser => {
        ctx.save();
        if (!laser.fired) {
            // Wide warning zone
            ctx.strokeStyle = "rgba(255,0,0,0.12)";
            ctx.lineWidth = 22;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            // Dashed targeting line
            ctx.strokeStyle = "rgba(255,100,100,0.9)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([12, 12]);
            ctx.shadowColor = 'red'; ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            ctx.setLineDash([]);
            // tiny crosshair dot at end
            ctx.fillStyle = 'rgba(255,80,80,0.9)';
            ctx.beginPath();
            ctx.arc(laser.end.x, laser.end.y, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            let prog = laser.duration / 200;
            // outer glow
            ctx.strokeStyle = `rgba(255,30,30,${prog * 0.6})`;
            ctx.lineWidth = 50 * prog;
            ctx.shadowColor = "red";
            ctx.shadowBlur = 40;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            // core beam
            ctx.strokeStyle = `rgba(255,80,80,${prog})`;
            ctx.lineWidth = 30 * prog;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            // bright center
            ctx.strokeStyle = `rgba(255,255,255,${prog})`;
            ctx.lineWidth = 10 * prog;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
        }
        ctx.restore();
    });
}

// ── Boss shockwaves ───────────────────────────────────────────
function drawBossShockwaves() {
    bossShockwaves.forEach(wave => {
        if (!wave || wave.radius <= 0) return;
        ctx.save();
        // outer halo
        ctx.strokeStyle = "rgba(200,0,255,0.25)";
        ctx.lineWidth = 28;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
        // main ring
        ctx.strokeStyle = "rgba(138,43,226,0.85)";
        ctx.lineWidth = 8;
        ctx.shadowColor = "#FF00FF";
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // inner bright edge (only if radius large enough)
        if (wave.radius > 8) {
            ctx.strokeStyle = "rgba(255,180,255,0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius - 6, 0, Math.PI * 2);
            ctx.stroke();
        }
        // fill ripple
        ctx.fillStyle = "rgba(138,43,226,0.06)";
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ── Chain lightning ───────────────────────────────────────────
function drawChainLightning(effect) {
    ctx.save();
    let alpha = effect.lifetime / effect.maxLifetime;

    // wide faint pass (no shadowBlur)
    ctx.strokeStyle = `rgba(0,200,255,${alpha * 0.35})`;
    ctx.lineWidth = 9;
    _drawLightningPath(effect);
    ctx.stroke();

    // main bolt
    ctx.strokeStyle = `rgba(0,255,255,${alpha * 0.9})`;
    ctx.lineWidth = 2.5;
    _drawLightningPath(effect);
    ctx.stroke();

    // bright core
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.65})`;
    ctx.lineWidth = 1.2;
    _drawLightningPath(effect);
    ctx.stroke();

    ctx.restore();
}
function _drawLightningPath(effect) {
    ctx.beginPath();
    ctx.moveTo(effect.x1, effect.y1);
    const segs = 6;
    for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const nx = effect.x1 + (effect.x2 - effect.x1) * t;
        const ny = effect.y1 + (effect.y2 - effect.y1) * t;
        const jitter = (1 - Math.abs(t - 0.5) * 2) * 22;
        ctx.lineTo(nx + (Math.random() - 0.5) * jitter, ny + (Math.random() - 0.5) * jitter);
    }
    ctx.lineTo(effect.x2, effect.y2);
}

// ── Demon Gift aura ───────────────────────────────────────────
function drawDemonGiftAura() {
    const elapsed = demonGiftEffect.endTime - performance.now();
    const alpha = Math.max(0, (elapsed / 4000) * 0.28);
    const now = performance.now();

    ctx.save();
    const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
    grad.addColorStop(0, `rgba(100,0,180,0)`);
    grad.addColorStop(0.7, `rgba(138,43,226,${alpha * 0.6})`);
    grad.addColorStop(1, `rgba(138,43,226,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle pulsing hex grid vignette
    ctx.strokeStyle = `rgba(200,0,255,${alpha * 0.3})`;
    ctx.lineWidth = 1;
    const hexR = 40;
    const cols = Math.ceil(canvas.width / (hexR * 1.5)) + 1;
    const rows = Math.ceil(canvas.height / (hexR * Math.sqrt(3))) + 1;
    const phase = (now / 3000) % 1;
    ctx.globalAlpha = alpha * 0.15;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const hx = c * hexR * 1.5;
            const hy = r * hexR * Math.sqrt(3) + (c % 2 ? hexR * Math.sqrt(3) / 2 : 0);
            const dist = Math.hypot(hx - canvas.width / 2, hy - canvas.height / 2) / canvas.width;
            const a = Math.max(0, 0.6 - dist + 0.2 * Math.sin(phase * Math.PI * 2 + dist * 8));
            if (a <= 0) continue;
            ctx.globalAlpha = alpha * a * 0.3;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const px = hx + hexR * 0.9 * Math.cos(angle);
                const py = hy + hexR * 0.9 * Math.sin(angle);
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();
}

// ── Final Defense shields ─────────────────────────────────────
function drawFinalDefense() {
    const now = performance.now();
    ctx.save();

    if (playerAbsoluteShield) {
        // gold absolute shield – animated hexagonal segments
        const r = player.width + 12;
        ctx.strokeStyle = '#FFD700';
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#FFA500';
        ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.arc(player.x, player.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // rotating outer ring
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(now / 800);
        ctx.strokeStyle = 'rgba(255,240,100,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    if (finalDefense.playerShield) {
        const r = player.width;
        // soft fill
        ctx.fillStyle = 'rgba(0,255,255,0.08)';
        ctx.beginPath(); ctx.arc(player.x, player.y, r, 0, Math.PI * 2); ctx.fill();
        // main ring
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(player.x, player.y, r, 0, Math.PI * 2); ctx.stroke();
        // inner dotted detail ring
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(now / 1200);
        ctx.strokeStyle = 'rgba(100,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    if (finalDefense.boundaryShield) {
        ctx.fillStyle = 'rgba(0,255,255,0.18)';
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 20;
        ctx.fillRect(0, boundaryY, canvas.width, 10);
        ctx.strokeStyle = 'rgba(0,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, boundaryY);
        ctx.lineTo(canvas.width, boundaryY);
        ctx.stroke();
    }
    ctx.restore();
}

// ── Player aura (kill charge) ─────────────────────────────────
function drawPlayerAura() {
    const auraLevel = killCountForPassive % 5;
    if (auraLevel === 0 && killCountForPassive > 0 && sentinels.length > 0) return;
    const maxRadius = player.width * 1.5;
    const progress = auraLevel / 5;
    const radius = maxRadius * progress;
    const opacity = 0.55 * progress;

    ctx.save();
    ctx.translate(player.x, player.y);
    // outer soft bloom
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, `rgba(255,255,120,${opacity})`);
    grad.addColorStop(0.6, `rgba(255,200,0,${opacity * 0.5})`);
    grad.addColorStop(1, 'rgba(255,200,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

    // small energy sparks around perimeter (cheap – only when >50%)
    if (progress > 0.5) {
        const sparkCount = 3;
        const now = performance.now();
        ctx.shadowColor = 'yellow'; ctx.shadowBlur = 8;
        for (let i = 0; i < sparkCount; i++) {
            const angle = (now / 600 + i * Math.PI * 2 / sparkCount);
            const sr = radius * 0.85;
            ctx.fillStyle = 'rgba(255,255,150,0.9)';
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * sr, Math.sin(angle) * sr, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// ── Sentinel ──────────────────────────────────────────────────
function drawSentinel(sentinel) {
    const { x, y, size, angle, hp, maxHp } = sentinel;
    const now = performance.now();

    let activeCount = sentinels.length;
    let glowColor = '#00FFFF';
    if (activeCount >= 12) glowColor = '#FFD700';
    else if (activeCount >= 5) glowColor = '#FF00FF';

    ctx.save();
    ctx.translate(x, y);

    // ── body glow ring (always) ──
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke();

    // rotating outer dashed orbit ring
    ctx.save();
    ctx.rotate(now / 1800);
    ctx.strokeStyle = `${glowColor}88`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(0, 0, size + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── multi-layer body ──
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(0.35, '#CCCCCC');
    bodyGrad.addColorStop(0.75, '#888888');
    bodyGrad.addColorStop(1, '#444444');
    ctx.fillStyle = bodyGrad;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();

    // inner core gem
    const coreSize = size * 0.4;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
    coreGrad.addColorStop(0, 'white');
    coreGrad.addColorStop(0.5, glowColor);
    coreGrad.addColorStop(1, `${glowColor}44`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, coreSize, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // panel lines (static detail)
    ctx.strokeStyle = `${glowColor}66`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.3);
    ctx.lineTo(-size * 0.5, size * 0.3);
    ctx.moveTo(size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.5, size * 0.3);
    ctx.stroke();

    // ── gun arm ──
    ctx.rotate(angle);
    const gunW = size * 0.8, gunH = size * 0.75;
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(size * 0.5, -gunH / 2, gunW, gunH);
    // barrel highlight
    ctx.fillStyle = '#666';
    ctx.fillRect(size * 0.5, -gunH / 2, gunW * 0.3, gunH);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(size * 0.5, -gunH / 2, gunW, gunH);
    // muzzle
    ctx.fillStyle = glowColor;
    ctx.fillRect(size * 0.5 + gunW - 2, -2, 4, 4);

    ctx.restore();

    // ── HP bar ──
    const barW = 42, barH = 5;
    const barX = x - barW / 2, barY = y - size - 16;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, barH);
    const hpPct = hp / maxHp;
    const hpCol = hpPct > 0.5 ? 'cyan' : hpPct > 0.25 ? 'orange' : 'red';
    ctx.fillStyle = hpCol;
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    ctx.strokeStyle = '#AAA'; ctx.lineWidth = 0.8;
    ctx.strokeRect(barX, barY, barW, barH);

    // glory triangle
    if (gloryForJusticeActive) {
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.moveTo(x - 5, y - size - 26);
        ctx.lineTo(x + 5, y - size - 26);
        ctx.lineTo(x, y - size - 36);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // absolute shield ring
    if (sentinel.absoluteShield) {
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.fillStyle = 'rgba(255,215,0,0.18)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FFA500'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(x, y, size + 9, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // ── Domain purple ally tint ──
    if (skillShiftActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(140,0,255,0.28)';
        ctx.beginPath(); ctx.arc(x, y, size * 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,80,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, size * 1.2, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
}

// ── Bullets (no shadowBlur – use gradient layers for depth) ──
function drawBullet(b) {
    ctx.save();
    switch (b.type) {
        case 'sentinel_special': {
            // ALLY – golden diamond, exact original shape (top/bot = size/2, sides = size/3)
            // outer soft halo (no blur – just a faint fill)
            ctx.fillStyle = 'rgba(255,210,0,0.18)';
            ctx.beginPath();
            ctx.moveTo(b.x, b.y - b.size * 0.75);
            ctx.lineTo(b.x + b.size * 0.5, b.y);
            ctx.lineTo(b.x, b.y + b.size * 0.75);
            ctx.lineTo(b.x - b.size * 0.5, b.y);
            ctx.closePath(); ctx.fill();
            // main gradient diamond
            const dg = ctx.createRadialGradient(b.x, b.y - b.size * 0.2, 0, b.x, b.y, b.size * 0.5);
            dg.addColorStop(0, '#ffffff');
            dg.addColorStop(0.3, '#ffe066');
            dg.addColorStop(0.7, '#e6a800');
            dg.addColorStop(1, '#7a5000');
            ctx.fillStyle = dg;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y - b.size / 2);
            ctx.lineTo(b.x + b.size / 3, b.y);
            ctx.lineTo(b.x, b.y + b.size / 2);
            ctx.lineTo(b.x - b.size / 3, b.y);
            ctx.closePath(); ctx.fill();
            // tiny facet highlight
            ctx.fillStyle = 'rgba(255,255,220,0.75)';
            ctx.beginPath();
            ctx.moveTo(b.x, b.y - b.size / 2);
            ctx.lineTo(b.x + b.size * 0.12, b.y - b.size * 0.1);
            ctx.lineTo(b.x, b.y - b.size * 0.05);
            ctx.closePath(); ctx.fill();
            break;
        }
        case 'player_charged': {
            // ALLY – bright blue-white charged orb
            // outer glow ring (fill only, no blur)
            ctx.fillStyle = 'rgba(100,180,255,0.2)';
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 1.45, 0, Math.PI * 2); ctx.fill();
            const cg = ctx.createRadialGradient(b.x - b.size * 0.2, b.y - b.size * 0.2, 0, b.x, b.y, b.size);
            cg.addColorStop(0, '#ffffff');
            cg.addColorStop(0.35, '#88ccff');
            cg.addColorStop(0.7, '#2277dd');
            cg.addColorStop(1, 'rgba(0,60,180,0.5)');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
            // glint
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.ellipse(b.x - b.size * 0.25, b.y - b.size * 0.25, b.size * 0.22, b.size * 0.13, -0.8, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'sentinel_auto': case 'sentinel_death': {
            // ALLY – cyan-teal sentinel shot
            ctx.fillStyle = 'rgba(0,200,220,0.15)';
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 1.4, 0, Math.PI * 2); ctx.fill();
            const sg = ctx.createRadialGradient(b.x - b.size * 0.2, b.y - b.size * 0.2, 0, b.x, b.y, b.size);
            sg.addColorStop(0, '#ffffff');
            sg.addColorStop(0.3, '#44ffee');
            sg.addColorStop(0.7, '#00aaaa');
            sg.addColorStop(1, 'rgba(0,60,80,0.5)');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(200,255,255,0.55)';
            ctx.beginPath(); ctx.ellipse(b.x - b.size * 0.2, b.y - b.size * 0.2, b.size * 0.2, b.size * 0.12, -0.8, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'player_auto': default: {
            // ALLY – violet-purple player auto shot
            ctx.fillStyle = 'rgba(160,80,255,0.15)';
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 1.4, 0, Math.PI * 2); ctx.fill();
            const pg = ctx.createRadialGradient(b.x - b.size * 0.2, b.y - b.size * 0.2, 0, b.x, b.y, b.size);
            pg.addColorStop(0, '#ffffff');
            pg.addColorStop(0.3, '#cc88ff');
            pg.addColorStop(0.7, '#7700cc');
            pg.addColorStop(1, 'rgba(40,0,80,0.5)');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(240,200,255,0.55)';
            ctx.beginPath(); ctx.ellipse(b.x - b.size * 0.2, b.y - b.size * 0.2, b.size * 0.22, b.size * 0.13, -0.8, 0, Math.PI * 2); ctx.fill();
            break;
        }
    }
    ctx.restore();
}

function _drawDiamond(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.9);
    ctx.lineTo(x + r * 0.55, y);
    ctx.lineTo(x, y + r * 0.9);
    ctx.lineTo(x - r * 0.55, y);
    ctx.closePath();
    ctx.fill();
}

// ── Spirit bullets (ALLY – magenta-pink, no shadowBlur) ────────
function drawSpiritBullet(b) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,80,200,0.15)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 1.4, 0, Math.PI * 2); ctx.fill();
    const sg = ctx.createRadialGradient(b.x - b.size * 0.2, b.y - b.size * 0.2, 0, b.x, b.y, b.size);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.3, '#ff88dd');
    sg.addColorStop(0.7, '#cc00aa');
    sg.addColorStop(1, 'rgba(80,0,60,0.5)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,240,0.55)';
    ctx.beginPath(); ctx.ellipse(b.x - b.size * 0.2, b.y - b.size * 0.2, b.size * 0.2, b.size * 0.12, -0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ── Player ship ───────────────────────────────────────────────
function drawPlayer(alpha = 1, xOffset = 0) {
    const now = performance.now();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(player.x + xOffset, player.y);

    // ── engine exhaust plume (gradient fill, no blur) ──
    const exG = ctx.createRadialGradient(0, 30, 0, 0, 38, 22);
    exG.addColorStop(0, 'rgba(0,180,255,0.28)');
    exG.addColorStop(0.5, 'rgba(0,100,200,0.1)');
    exG.addColorStop(1, 'transparent');
    ctx.fillStyle = exG;
    ctx.fillRect(-22, 24, 44, 32);

    // ═══════════════════════════════════════════
    //  LAYER 1 – MAIN HULL BASE (dark fuselage)
    // ═══════════════════════════════════════════
    const hullG = ctx.createLinearGradient(-28, 0, 28, 0);
    hullG.addColorStop(0, '#0a1428');
    hullG.addColorStop(0.5, '#1a2a45');
    hullG.addColorStop(1, '#0a1428');
    ctx.fillStyle = hullG;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(24, 12); ctx.lineTo(24, 20); ctx.lineTo(10, 16);
    ctx.lineTo(-10, 16); ctx.lineTo(-24, 20); ctx.lineTo(-24, 12);
    ctx.closePath(); ctx.fill();

    // ── hull surface panels (riveted look) ──
    // left panel
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(-2, 2); ctx.lineTo(-22, 14); ctx.lineTo(-22, 20); ctx.lineTo(-10, 16); ctx.lineTo(-2, 14);
    ctx.closePath(); ctx.fill();
    // right panel
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(22, 14); ctx.lineTo(22, 20); ctx.lineTo(10, 16); ctx.lineTo(2, 14);
    ctx.closePath(); ctx.fill();

    // ═══════════════════════════════════════════
    //  LAYER 2 – WINGS
    // ═══════════════════════════════════════════
    const wingG = ctx.createLinearGradient(0, -10, 0, 20);
    wingG.addColorStop(0, '#1e3a5f');
    wingG.addColorStop(0.5, '#162d4a');
    wingG.addColorStop(1, '#0d1f33');
    ctx.fillStyle = wingG;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(28, 10); ctx.lineTo(26, 16);
    ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.lineTo(-26, 16);
    ctx.lineTo(-28, 10); ctx.closePath(); ctx.fill();

    // wing accent edge (cyan trim line)
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(28, 10); ctx.lineTo(26, 16);
    ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.lineTo(-26, 16);
    ctx.lineTo(-28, 10); ctx.closePath(); ctx.stroke();

    // wing surface highlight (top surface lighter)
    ctx.fillStyle = 'rgba(100,180,255,0.07)';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(28, 10); ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.lineTo(-28, 10);
    ctx.closePath(); ctx.fill();

    // wing panel seam lines
    ctx.strokeStyle = 'rgba(56,189,248,0.35)'; ctx.lineWidth = 0.8;
    // right wing seams
    ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(25, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, 11); ctx.lineTo(26, 14); ctx.stroke();
    // left wing seams
    ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(-25, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, 11); ctx.lineTo(-26, 14); ctx.stroke();

    // wing tip accent rectangles
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(22, 14, 5, 3);
    ctx.fillRect(-27, 14, 5, 3);
    // tip highlight
    ctx.fillStyle = 'rgba(150,230,255,0.7)';
    ctx.fillRect(22, 14, 5, 1);
    ctx.fillRect(-27, 14, 5, 1);

    // ═══════════════════════════════════════════
    //  LAYER 3 – FUSELAGE / BODY CENTER
    // ═══════════════════════════════════════════
    const bodyG = ctx.createLinearGradient(-12, -26, 12, 22);
    bodyG.addColorStop(0, '#dde8f0');
    bodyG.addColorStop(0.3, '#b0c8dc');
    bodyG.addColorStop(0.7, '#7a9ab8');
    bodyG.addColorStop(1, '#4a6a88');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(8, -8); ctx.lineTo(12, 18);
    ctx.lineTo(6, 22); ctx.lineTo(-6, 22); ctx.lineTo(-12, 18);
    ctx.lineTo(-8, -8); ctx.closePath(); ctx.fill();

    // body border
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(8, -8); ctx.lineTo(12, 18);
    ctx.lineTo(6, 22); ctx.lineTo(-6, 22); ctx.lineTo(-12, 18);
    ctx.lineTo(-8, -8); ctx.closePath(); ctx.stroke();

    // body panel seam lines (horizontal ribs)
    ctx.strokeStyle = 'rgba(2,132,199,0.4)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(5, -12); ctx.stroke();  // top rib
    ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.stroke();    // mid rib
    ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(9, 8); ctx.stroke();      // lower rib
    ctx.beginPath(); ctx.moveTo(-10, 16); ctx.lineTo(10, 16); ctx.stroke();  // base rib

    // vertical spine seam
    ctx.strokeStyle = 'rgba(2,132,199,0.25)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 22); ctx.stroke();

    // side panel insets
    ctx.fillStyle = 'rgba(0,60,100,0.3)';
    ctx.fillRect(-10, 0, 4, 8);
    ctx.fillRect(6, 0, 4, 8);
    ctx.strokeStyle = 'rgba(56,189,248,0.3)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(-10, 0, 4, 8);
    ctx.strokeRect(6, 0, 4, 8);

    // body surface sheen (left highlight)
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(-1, -24); ctx.lineTo(-7, -8); ctx.lineTo(-10, 18); ctx.lineTo(-4, 18); ctx.lineTo(0, -24);
    ctx.closePath(); ctx.fill();

    // ═══════════════════════════════════════════
    //  LAYER 4 – COCKPIT GLASS
    // ═══════════════════════════════════════════
    // cockpit frame
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(8, 4); ctx.lineTo(8, 14);
    ctx.lineTo(-8, 14); ctx.lineTo(-8, 4); ctx.closePath(); ctx.fill();

    // glass fill (multi-tone)
    const glassG = ctx.createLinearGradient(-7, -13, 7, 14);
    glassG.addColorStop(0, '#67e8f9');
    glassG.addColorStop(0.4, '#0ea5e9');
    glassG.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = glassG;
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(7, 4); ctx.lineTo(7, 13);
    ctx.lineTo(-7, 13); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill();

    // cockpit divider frame line
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 13); ctx.stroke();

    // glass highlight streaks
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(-5, -10); ctx.lineTo(-3, -10); ctx.lineTo(-5, 10); ctx.lineTo(-6, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(2, -10); ctx.lineTo(4, -10); ctx.lineTo(3, 5); ctx.lineTo(1, 5);
    ctx.closePath(); ctx.fill();

    // HUD glow inside cockpit
    ctx.fillStyle = 'rgba(0,200,255,0.18)';
    ctx.fillRect(-6, 4, 12, 4);

    // ═══════════════════════════════════════════
    //  LAYER 5 – NOSE TIP
    // ═══════════════════════════════════════════
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(3, -16); ctx.lineTo(-3, -16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(1.5, -20); ctx.lineTo(0, -18);
    ctx.closePath(); ctx.fill();

    // ═══════════════════════════════════════════
    //  LAYER 6 – THRUSTERS
    // ═══════════════════════════════════════════
    // thruster pods
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-9, 21, 6, 6);
    ctx.fillRect(3, 21, 6, 6);
    // pod highlight top edge
    ctx.fillStyle = 'rgba(100,180,255,0.3)';
    ctx.fillRect(-9, 21, 6, 1.5);
    ctx.fillRect(3, 21, 6, 1.5);
    // pod border
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.8;
    ctx.strokeRect(-9, 21, 6, 6);
    ctx.strokeRect(3, 21, 6, 6);
    // thruster nozzle inner glow (gradient fill, no blur)
    const nozzleG = ctx.createRadialGradient(-6, 27, 0, -6, 27, 3);
    nozzleG.addColorStop(0, '#ffffff');
    nozzleG.addColorStop(0.4, '#00eeff');
    nozzleG.addColorStop(1, 'rgba(0,80,150,0.4)');
    ctx.fillStyle = nozzleG;
    ctx.beginPath(); ctx.arc(-6, 27, 2.5, 0, Math.PI * 2); ctx.fill();
    const nozzleG2 = ctx.createRadialGradient(6, 27, 0, 6, 27, 3);
    nozzleG2.addColorStop(0, '#ffffff');
    nozzleG2.addColorStop(0.4, '#00eeff');
    nozzleG2.addColorStop(1, 'rgba(0,80,150,0.4)');
    ctx.fillStyle = nozzleG2;
    ctx.beginPath(); ctx.arc(6, 27, 2.5, 0, Math.PI * 2); ctx.fill();

    // ── side micro-boosters ──
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-13, 18, 3, 5);
    ctx.fillRect(10, 18, 3, 5);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 0.5;
    ctx.strokeRect(-13, 18, 3, 5);
    ctx.strokeRect(10, 18, 3, 5);

    // ═══════════════════════════════════════════
    //  LAYER 7 – ENGINE FLAMES (no blur)
    // ═══════════════════════════════════════════
    const flameT = now / 60;
    const flameH = 10 + Math.sin(flameT) * 6 + Math.sin(flameT * 2.3) * 3;

    const makeFlame = (cx) => {
        const jitter = (Math.sin(now / 40 + cx) * 1.5);
        const fg = ctx.createLinearGradient(cx, 27, cx, 27 + flameH);
        fg.addColorStop(0, 'rgba(255,255,255,0.95)');
        fg.addColorStop(0.15, '#aaffff');
        fg.addColorStop(0.5, 'rgba(0,160,255,0.7)');
        fg.addColorStop(1, 'rgba(0,80,200,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(cx - 2.5, 27);
        ctx.quadraticCurveTo(cx + jitter, 27 + flameH * 0.5, cx + (Math.sin(now / 55) * 1.2), 27 + flameH);
        ctx.lineTo(cx + 2.5, 27);
        ctx.closePath(); ctx.fill();
        // secondary inner hot flame
        const fg2 = ctx.createLinearGradient(cx, 27, cx, 27 + flameH * 0.55);
        fg2.addColorStop(0, 'rgba(255,255,255,0.8)');
        fg2.addColorStop(1, 'rgba(180,240,255,0)');
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.moveTo(cx - 1.2, 27);
        ctx.lineTo(cx, 27 + flameH * 0.55);
        ctx.lineTo(cx + 1.2, 27);
        ctx.closePath(); ctx.fill();
    };
    makeFlame(-6);
    makeFlame(6);

    // ── micro-booster flames ──
    const mfH = flameH * 0.5;
    [-11.5, 11.5].forEach(cx => {
        const mfg = ctx.createLinearGradient(cx, 23, cx, 23 + mfH);
        mfg.addColorStop(0, 'rgba(200,240,255,0.7)');
        mfg.addColorStop(1, 'rgba(0,100,200,0)');
        ctx.fillStyle = mfg;
        ctx.beginPath();
        ctx.moveTo(cx - 1.5, 23); ctx.lineTo(cx, 23 + mfH); ctx.lineTo(cx + 1.5, 23);
        ctx.closePath(); ctx.fill();
    });

    // glory indicator
    if (gloryForJusticeActive && alpha === 1) {
        ctx.fillStyle = '#88ff44';
        ctx.strokeStyle = '#44cc00'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-5, -32); ctx.lineTo(5, -32); ctx.lineTo(0, -42);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // small dot in center
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(0, -36, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Domain purple ally tint on player ──
    if (skillShiftActive && alpha === 1) {
        ctx.fillStyle = 'rgba(120,0,220,0.30)';
        ctx.beginPath();
        ctx.moveTo(0, -28); ctx.lineTo(24, 12); ctx.lineTo(24, 20);
        ctx.lineTo(10, 16); ctx.lineTo(-10, 16); ctx.lineTo(-24, 20);
        ctx.lineTo(-24, 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(180,60,255,0.65)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    ctx.restore();
}
function drawPolygon(x, y, radius, sides, angleOffset, color1, color2) {
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    // no shadowBlur – use stroke for definition instead
    ctx.strokeStyle = color1; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + angleOffset;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
}

// ── Aegis Core ────────────────────────────────────────────────
function drawAegisCore(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const now = performance.now();
    const auraRadius = canvas.width / 2;

    // ── 1. BOUNDARY RING ──────────────────────────────────────
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(255,30,30,0.18)';
    ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.stroke();

    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,60,60,0.6)';
    ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.stroke();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,160,120,0.95)';
    ctx.shadowColor = '#ff8866'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, auraRadius - 5, 0, Math.PI * 2); ctx.stroke();

    ctx.save();
    ctx.rotate(now / 6000);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,100,80,0.4)';
    ctx.shadowBlur = 0; ctx.setLineDash([20, 18, 5, 18]);
    ctx.beginPath(); ctx.arc(0, 0, auraRadius + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    ctx.shadowBlur = 0;

    // ── 2. SQUARE RINGS lan từ core ra limit ──────────────────
    // Hai vòng offset nhau nửa chu kỳ, giống pulse ring cũ
    // nhưng mỗi vòng là một chuỗi ô vuông xếp trên đường tròn
    const ringPeriod = 2200; // ms mỗi vòng đi từ core → limit
    const sqSize = 9;        // kích thước mỗi ô vuông

    for (let wave = 0; wave < 2; wave++) {
        // progress 0→1: core→limit
        const t = ((now + wave * ringPeriod / 2) % ringPeriod) / ringPeriod;
        const r = enemy.size * 1.1 + t * (auraRadius - enemy.size * 1.1);

        // fade: hiện nhanh, mờ dần khi gần limit
        const alpha = (1 - Math.pow(t, 1.8)) * 0.75;
        if (alpha < 0.02) continue;

        // màu theo progress: đỏ → cam → vàng
        const g = Math.floor(t * 130);
        ctx.fillStyle = `rgba(255,${g},0,${alpha})`;
        ctx.strokeStyle = `rgba(255,${Math.min(g + 80, 255)},40,${alpha * 0.7})`;
        ctx.lineWidth = 0.7;

        // số ô vuông vừa đủ xếp quanh vòng tròn bán kính r
        const sqCount = Math.max(8, Math.floor((2 * Math.PI * r) / (sqSize + 3)));
        // xoay nhẹ theo thời gian để không bị static
        const rotOffset = now / 4000 * (wave % 2 === 0 ? 1 : -1);

        for (let i = 0; i < sqCount; i++) {
            const angle = (i / sqCount) * Math.PI * 2 + rotOffset;
            const sx = Math.cos(angle) * r;
            const sy = Math.sin(angle) * r;

            // nhấp nhô nhỏ theo sin — mỗi ô lệch phase
            const wobble = 1 + 0.25 * Math.sin(now / 300 + i * 0.6 + wave * 3.14);
            const half = (sqSize * wobble) / 2;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(angle); // ô vuông hướng theo tiếp tuyến
            ctx.fillRect(-half, -half, half * 2, half * 2);
            ctx.strokeRect(-half, -half, half * 2, half * 2);
            ctx.restore();
        }
    }

    // ── 3. BODY ───────────────────────────────────────────────
    if (enemy.aegisInvulnerable) {
        ctx.beginPath(); ctx.arc(0, 0, enemy.size + 15, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
        ctx.shadowColor = 'white'; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
    }

    const bodyGrad = ctx.createRadialGradient(0, 0, enemy.size * 0.15, 0, 0, enemy.size);
    bodyGrad.addColorStop(0, '#f8f8f8'); bodyGrad.addColorStop(0.5, '#c8c8c8');
    bodyGrad.addColorStop(0.85, '#888'); bodyGrad.addColorStop(1, '#555');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(0, 0, enemy.size, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.rotate(now / 3000);
    ctx.strokeStyle = 'rgba(120,120,120,0.6)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * enemy.size * 0.88, Math.sin(a) * enemy.size * 0.88);
        ctx.lineTo(Math.cos(a) * enemy.size * 0.97, Math.sin(a) * enemy.size * 0.97);
        ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = '#707070'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, enemy.size, 0, Math.PI * 2); ctx.stroke();

    const coreGrad = ctx.createLinearGradient(0, -enemy.size * 0.4, 0, enemy.size * 0.4);
    coreGrad.addColorStop(0, '#ff3333'); coreGrad.addColorStop(1, '#800000');
    ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 18;
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, enemy.size * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 2;
    ctx.fillStyle = '#220000';
    const rs = enemy.size * 0.2;
    ctx.fillRect(-rs, -rs, rs * 2, rs * 2);
    ctx.strokeRect(-rs, -rs, rs * 2, rs * 2);

    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(now / 220));
    ctx.fillStyle = `rgba(255,100,100,${pulse})`;
    ctx.beginPath(); ctx.arc(0, 0, rs * 0.45, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

// ── Enemy dispatcher ──────────────────────────────────────────
function drawEnemy(enemy) {
    // Soul reaver icon
    if (enemy.soulReaver) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y - enemy.size - 25);
        ctx.strokeStyle = '#FF4500'; ctx.lineWidth = 2.5;
        ctx.shadowColor = 'red'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
        ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
        ctx.restore();
    }

    // Yog-Sothoth domain TARGET LOCK effect
    if (skillShiftActive) {
        const now = performance.now();
        let elapsed = now - skillShiftChargeStart;
        let maxRadius = Math.hypot(canvas.width, canvas.height);
        let domR = Math.min(maxRadius, maxRadius * (elapsed / 600));
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= domR) {
            const er = (enemy.size || 20) + 6;
            const pulse = 0.6 + 0.4 * Math.sin(now / 120 + enemy.x * 0.05);
            const lockIn = Math.min(elapsed / 400, 1); // fade-in

            ctx.save();
            ctx.globalAlpha = lockIn;

            // 1. Red scan fill
            ctx.fillStyle = `rgba(255,20,20,${0.08 * pulse})`;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er * 1.3, 0, Math.PI * 2); ctx.fill();

            // 2. Outer rotating dashed ring
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(now / 800);
            ctx.strokeStyle = `rgba(255,60,60,${0.85 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 6]);
            ctx.beginPath(); ctx.arc(0, 0, er + 6, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // 3. Inner solid ring
            ctx.strokeStyle = `rgba(255,40,40,${0.95})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, er, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;

            // 4. Four corner brackets (crosshair corners)
            const bSize = er * 0.55;
            const bGap = er * 0.35;
            const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            ctx.strokeStyle = `rgba(255,80,80,${0.9 * pulse})`;
            ctx.lineWidth = 2;
            corners.forEach(([dx, dy]) => {
                const bx = enemy.x + dx * (er + bGap * 0.5);
                const by = enemy.y + dy * (er + bGap * 0.5);
                ctx.beginPath();
                ctx.moveTo(bx, by - dy * bSize * 0.5);
                ctx.lineTo(bx, by);
                ctx.lineTo(bx - dx * bSize * 0.5, by);
                ctx.stroke();
            });

            // 5. Center crosshair dot
            ctx.fillStyle = `rgba(255,100,100,${pulse})`;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2); ctx.fill();

            // 6. Horizontal + vertical scan lines (thin)
            ctx.strokeStyle = `rgba(255,30,30,${0.3 * pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x - er * 1.5, enemy.y);
            ctx.lineTo(enemy.x + er * 1.5, enemy.y);
            ctx.moveTo(enemy.x, enemy.y - er * 1.5);
            ctx.lineTo(enemy.x, enemy.y + er * 1.5);
            ctx.stroke();

            // 7. LOCKED label above enemy
            if (elapsed > 500) {
                const textAlpha = Math.min((elapsed - 500) / 200, 1) * (0.7 + 0.3 * pulse);
                ctx.fillStyle = `rgba(255,80,80,${textAlpha})`;
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('LOCKED', enemy.x, enemy.y - er - 8);
            }

            ctx.restore();
        }
    }

    if (enemy.type === 'aegis_core') {
        drawAegisCore(enemy);
    } else if (enemy.type === 'boss' || enemy.type === 'thaelis') {
        _drawBossOrThaelis(enemy);
    } else if (enemy.type === 'embryo') {
        _drawEmbryo(enemy);
    } else if (enemy.type.startsWith('enemy_bullet')) {
        _drawEnemyBullet(enemy);
    } else {
        _drawNormalEnemy(enemy);
    }

    // Shield bar
    if (enemy.shield > 0) {
        const bw = enemy.size, bh = 5;
        const bx = enemy.x - bw / 2, by = enemy.y - enemy.size / 2 - 15;
        ctx.fillStyle = 'rgba(0,80,160,0.5)'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#00BFFF'; ctx.fillRect(bx, by, bw * Math.min(1, enemy.shield / enemy.maxHp), bh);
        ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "white"; ctx.font = "11px Arial"; ctx.textAlign = "center";
        ctx.fillText(Math.ceil(enemy.shield), enemy.x, by - 2);
    }

    // Demon Gift ring
    if (enemy.demonGiftEndTime && performance.now() < enemy.demonGiftEndTime) {
        ctx.save();
        ctx.strokeStyle = enemy.demonGiftStacks === 2 ? 'rgba(255,0,0,0.85)' : 'rgba(138,43,226,0.85)';
        ctx.lineWidth = enemy.demonGiftStacks === 2 ? 5 : 3;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size / 2 + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // HP text
    ctx.save();
    ctx.fillStyle = "white"; ctx.font = "14px Arial";
    if (enemy.type === 'enemy_bullet_small') ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil(enemy.hp), enemy.x, enemy.y + 5);
    ctx.restore();
}

function _drawBossOrThaelis(enemy) {
    const now = performance.now();
    const isBoss = enemy.type === 'boss';
    const rotSpeed = isBoss ? 2000 : 3000;
    const rotation = now / rotSpeed;
    const color1 = isBoss ? '#FF00FF' : '#FFD700';
    const color2 = isBoss ? '#8A2BE2' : '#FFA500';
    const r = enemy.size / 2;

    // outer pulsing halo
    const haloAlpha = 0.15 + 0.1 * Math.abs(Math.sin(now / 400));
    ctx.save();
    ctx.fillStyle = isBoss ? `rgba(255,0,255,${haloAlpha})` : `rgba(255,200,0,${haloAlpha})`;
    ctx.shadowColor = color1; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // main octagon body
    drawPolygon(enemy.x, enemy.y, r, 8, rotation, color1, color2);

    // counter-rotating inner octagon
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawPolygon(enemy.x, enemy.y, r * 0.55, 8, -rotation * 1.3, color2, color1);
    ctx.restore();

    // center core gem
    ctx.save();
    const cg = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, r * 0.28);
    cg.addColorStop(0, 'white');
    cg.addColorStop(0.5, color1);
    cg.addColorStop(1, color2);
    ctx.fillStyle = cg;
    ctx.shadowColor = color1; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // low HP aura pulse
    const hpPct = enemy.hp / enemy.maxHp;
    if (hpPct < 0.6) {
        const pulse = Math.abs(Math.sin(now / 180)) * 10;
        ctx.save();
        ctx.fillStyle = isBoss ? `rgba(255,0,255,0.22)` : `rgba(255,215,0,0.22)`;
        ctx.shadowColor = color1; ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 12 + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // rotating orbit dots
    ctx.save();
    const orbitR = r + 18;
    const dotCount = 6;
    ctx.shadowColor = color1; ctx.shadowBlur = 10;
    ctx.fillStyle = color1;
    for (let i = 0; i < dotCount; i++) {
        const a = rotation * (isBoss ? 2 : 1.5) + (i / dotCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(enemy.x + Math.cos(a) * orbitR, enemy.y + Math.sin(a) * orbitR, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function _drawEmbryo(enemy) {
    const now = performance.now();
    const pulse = Math.abs(Math.sin(now / 150)) * 3;

    // outer membrane glow
    ctx.save();
    ctx.fillStyle = 'rgba(138,43,226,0.18)';
    ctx.shadowColor = '#FF00FF'; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.size + 5 + pulse, enemy.size + 9 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // main body
    ctx.save();
    const eg = ctx.createRadialGradient(enemy.x - enemy.size * 0.2, enemy.y - enemy.size * 0.2, 0,
        enemy.x, enemy.y, enemy.size + pulse);
    eg.addColorStop(0, '#df88ff');
    eg.addColorStop(0.4, '#8A2BE2');
    eg.addColorStop(0.8, '#4a0080');
    eg.addColorStop(1, 'rgba(30,0,60,0.6)');
    ctx.fillStyle = eg;
    ctx.shadowColor = '#FF00FF'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.size - 2 + pulse, enemy.size + 2 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // internal vein lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,100,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.size * 0.4, enemy.y - enemy.size * 0.3);
    ctx.quadraticCurveTo(enemy.x, enemy.y + enemy.size * 0.2, enemy.x + enemy.size * 0.5, enemy.y - enemy.size * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.size * 0.2, enemy.y + enemy.size * 0.4);
    ctx.quadraticCurveTo(enemy.x + enemy.size * 0.1, enemy.y - enemy.size * 0.1, enemy.x + enemy.size * 0.3, enemy.y + enemy.size * 0.3);
    ctx.stroke();
    ctx.restore();
}

function _drawEnemyBullet(enemy) {
    // ENEMY – clear red/orange, no shadowBlur
    ctx.save();
    const isLarge = enemy.type === 'enemy_bullet_large';
    // outer faint corona (fill only)
    ctx.fillStyle = isLarge ? 'rgba(255,100,20,0.22)' : 'rgba(220,0,0,0.2)';
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 1.5, 0, Math.PI * 2); ctx.fill();
    // main body
    const bg = ctx.createRadialGradient(enemy.x - enemy.size * 0.25, enemy.y - enemy.size * 0.25, 0, enemy.x, enemy.y, enemy.size);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.25, isLarge ? '#ffaa33' : '#ff4400');
    bg.addColorStop(0.65, isLarge ? '#dd4400' : '#cc0000');
    bg.addColorStop(1, isLarge ? 'rgba(120,30,0,0.8)' : 'rgba(100,0,0,0.8)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.fill();
    // rim stroke for definition
    ctx.strokeStyle = isLarge ? 'rgba(255,150,50,0.7)' : 'rgba(255,60,20,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.stroke();
    if (isLarge) {
        // inner hot core
        const ig = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 0.42);
        ig.addColorStop(0, 'rgba(255,240,100,0.95)');
        ig.addColorStop(1, 'rgba(255,140,0,0.5)');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 0.42, 0, Math.PI * 2); ctx.fill();
    }
    // glint
    ctx.fillStyle = 'rgba(255,255,200,0.4)';
    ctx.beginPath(); ctx.ellipse(enemy.x - enemy.size * 0.28, enemy.y - enemy.size * 0.28, enemy.size * 0.2, enemy.size * 0.12, -0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function _drawNormalEnemy(enemy) {
    // ENEMY – warm red/orange hue scheme, no shadowBlur
    const hpRatio = enemy.hp / enemy.maxHp;
    // Red at low HP, orange at full HP (clearly enemy-colored)
    const hue = 20 + hpRatio * 20; // 20-40 = orange→yellow-orange
    const color = `hsl(${hue},100%,58%)`;
    const darkColor = `hsl(${hue},90%,18%)`;

    ctx.save();
    // faint outer ring
    ctx.fillStyle = `hsla(${hue},100%,50%,0.13)`;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 1.3, 0, Math.PI * 2); ctx.fill();

    // main gradient body
    const grad = ctx.createRadialGradient(
        enemy.x - enemy.size * 0.28, enemy.y - enemy.size * 0.28, 0,
        enemy.x, enemy.y, enemy.size
    );
    grad.addColorStop(0, "white");
    grad.addColorStop(0.28, color);
    grad.addColorStop(0.72, darkColor);
    grad.addColorStop(1, "rgba(30,0,0,0.85)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.fill();

    // rim stroke
    ctx.strokeStyle = `hsla(${hue},100%,70%,0.65)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.stroke();

    // glint
    ctx.fillStyle = 'rgba(255,255,220,0.5)';
    ctx.beginPath();
    ctx.ellipse(enemy.x - enemy.size * 0.28, enemy.y - enemy.size * 0.28, enemy.size * 0.22, enemy.size * 0.13, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ── Charge effect ─────────────────────────────────────────────
function drawChargeEffect() {
    let chargeDuration = performance.now() - chargeStartTime;
    let chargeRatio = Math.min(chargeDuration / overloadChargeTime, 1);
    let radius = player.width / 2 + chargeRatio * player.width * 2;

    let r = 0, g = 255, b = 255;
    if (chargeDuration > maxChargeTime) {
        let over = (chargeDuration - maxChargeTime) / (overloadChargeTime - maxChargeTime);
        r = Math.floor(255 * over);
        g = 255 - Math.floor(200 * over);
        b = Math.floor(255 * (1 - over * 0.8));
    }
    const color = `rgba(${r},${g},${b},0.85)`;

    if (chargeDuration > 3000 && chargeDuration < overloadChargeTime) {
        screenShake = { intensity: (chargeRatio - 0.6) * 10, duration: 50 };
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    // outer bloom
    ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
    ctx.lineWidth = 10 + 8 * chargeRatio;
    ctx.shadowColor = color; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2); ctx.stroke();
    // main ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + 4 * chargeRatio;
    ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    // rotating inner tick marks
    const ticks = 8;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.rotate(performance.now() / 400);
    for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (radius - 4), Math.sin(a) * (radius - 4));
        ctx.lineTo(Math.cos(a) * (radius + 5), Math.sin(a) * (radius + 5));
        ctx.stroke();
    }
    ctx.restore();
}

// ── Charge meter bar ──────────────────────────────────────────
function drawChargeMeter() {
    if (!charging) return;
    const chargeDuration = performance.now() - chargeStartTime;
    const chargeRatio = Math.min(chargeDuration / overloadChargeTime, 1);
    const barWidth = 62, barHeight = 9;
    const barX = player.x - barWidth / 2, barY = player.y + player.height / 2 + 10;

    // back
    ctx.fillStyle = '#222'; ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = '#444'; ctx.fillRect(barX, barY, barWidth, barHeight);

    const grad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    grad.addColorStop(0, "cyan");
    grad.addColorStop(0.7, "lime");
    grad.addColorStop(1, "red");
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barWidth * chargeRatio, barHeight);

    // segmentation lines
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(barX + barWidth * i / 4, barY);
        ctx.lineTo(barX + barWidth * i / 4, barY + barHeight);
        ctx.stroke();
    }
    ctx.strokeStyle = 'white'; ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
}

// ── Overload laser ────────────────────────────────────────────
function drawLaser() {
    const laserBeamWidth = 100;
    const allLasers = [{ xOffset: 0 }, ...playerClones];
    allLasers.forEach(clone => {
        const laserX = player.x + clone.xOffset;
        ctx.save();

        const wobble = Math.sin(performance.now() / 28 + clone.xOffset / 50) * 9;
        const cw = laserBeamWidth + wobble;
        const cx = laserX - cw / 2;

        // outer glow
        const glow = ctx.createLinearGradient(cx, 0, cx + cw, 0);
        glow.addColorStop(0, "rgba(0,255,255,0)");
        glow.addColorStop(0.5, "rgba(0,200,255,0.2)");
        glow.addColorStop(1, "rgba(0,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 20, 0, cw + 40, player.y);

        // main beam
        let grad = ctx.createLinearGradient(cx, 0, cx + cw, 0);
        grad.addColorStop(0, "rgba(0,255,255,0)");
        grad.addColorStop(0.1, "rgba(0,220,255,0.55)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.95)");
        grad.addColorStop(0.9, "rgba(0,220,255,0.55)");
        grad.addColorStop(1, "rgba(0,255,255,0)");
        ctx.fillStyle = grad;
        ctx.shadowColor = 'cyan'; ctx.shadowBlur = 35;
        ctx.fillRect(cx, 0, cw, player.y);

        // bright core streak
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.shadowBlur = 15;
        ctx.fillRect(laserX - 4, 0, 8, player.y);

        ctx.restore();

        // particles
        if (Math.random() < 0.55) {
            particles.push({
                x: laserX + (Math.random() - 0.5) * cw,
                y: player.y,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 12 - 6,
                lifetime: 280, maxLifetime: 280,
                size: Math.random() * 3.5 + 1,
                color: `rgba(${Math.floor(150 + Math.random() * 105)},255,255,0.8)`
            });
        }
    });
}

// ── Explosion ─────────────────────────────────────────────────
function drawExplosion(exp) {
    ctx.save();
    let p = 1 - exp.lifetime / exp.maxLifetime;
    let radius = exp.size * (1 + p * 1.2);
    ctx.globalAlpha = 1 - p;

    // outer shockwave ring
    ctx.strokeStyle = exp.color;
    ctx.lineWidth = 3 * (1 - p);
    ctx.shadowColor = exp.color; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(exp.x, exp.y, radius * 1.2, 0, Math.PI * 2); ctx.stroke();

    // main fill
    const eg = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
    eg.addColorStop(0, 'white');
    eg.addColorStop(0.3, exp.color);
    eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg;
    ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────
function drawParticle(p) {
    ctx.save();
    if (p.isSummonRing) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,255,255,${prog})`;
        ctx.lineWidth = 3; ctx.shadowColor = 'cyan'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * 50, 0, Math.PI * 2); ctx.stroke();
    } else if (p.isLaserLine) {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = p.color; ctx.lineWidth = 5;
        ctx.shadowColor = 'red'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
    } else if (p.isSkillGAura) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,180,255,${prog})`;
        ctx.lineWidth = 10; ctx.shadowColor = 'cyan'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * p.maxRadius, 0, Math.PI * 2); ctx.stroke();
    } else {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        // small glow on particles
        ctx.shadowColor = p.color; ctx.shadowBlur = 5;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ── Skill A – Thunder Orbs ────────────────────────────────────
function drawSkillA() {
    const now = performance.now();

    // ── Binary ring: vòng tròn tạo bởi ký tự 0 và 1 xoay quanh ──
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
        const r = orb.size * pulse;  // visual only, hitbox = orb.size

        if (orb.isDefensive) {
            // yellow defensive orb – layered glow
            ctx.shadowColor = "orange"; ctx.shadowBlur = 20;
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
            ctx.shadowColor = "white"; ctx.shadowBlur = 18;
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
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(orb.x + Math.cos(dotAngle) * r * 0.7, orb.y + Math.sin(dotAngle) * r * 0.7, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

// ── Scattered / bouncing projectiles ─────────────────────────
function drawScatteredProjectile(p) {
    ctx.save();
    ctx.globalAlpha = p.lifetime / p.maxLifetime;

    if (p.isBouncingBall) {
        const pulse = Math.sin(performance.now() / 90) * 4;
        const cs = p.size + pulse;  // visual only
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, cs);
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.35, '#ff4400');
        grad.addColorStop(0.7, '#cc0000');
        grad.addColorStop(1, 'darkred');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'red'; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(p.x, p.y, cs, 0, Math.PI * 2); ctx.fill();
        // bright highlight dot
        ctx.fillStyle = 'rgba(255,220,200,0.7)';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x - cs * 0.3, p.y - cs * 0.3, cs * 0.22, 0, Math.PI * 2); ctx.fill();
    } else {
        // scattered shard – circle same size, slight orange gradient
        const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        sg.addColorStop(0, 'white');
        sg.addColorStop(0.5, '#ff8800');
        sg.addColorStop(1, 'rgba(200,60,0,0.5)');
        ctx.fillStyle = sg;
        ctx.shadowColor = 'orange'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ── Spirit ────────────────────────────────────────────────────
function drawSpirit(spirit) {
    if (!spirit) return;
    const now = performance.now();
    const timeRemaining = spirit.duration - (now - spirit.spawnTime);
    if (timeRemaining < 3000 && Math.floor(now / 150) % 2 === 0) return;

    ctx.save();

    // Finale charge aura
    if (spirit.isFinishing && spirit.finaleState === 'charging') {
        const chargeRatio = 1 - spirit.finaleChargeTime / 2500;
        ctx.fillStyle = "rgba(200,0,50,0.15)";
        ctx.beginPath(); ctx.arc(spirit.x, spirit.y, canvas.width * chargeRatio, 0, Math.PI * 2); ctx.fill();
    }

    const size = spirit.isFinishing ? 30 : 15;

    // outer corona ring
    const coronaR = size * 1.8;
    ctx.strokeStyle = 'rgba(255,0,255,0.3)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'magenta'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(spirit.x, spirit.y, coronaR, 0, Math.PI * 2); ctx.stroke();

    // rotating trailing petals
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
        const a = now / 800 + (i / petalCount) * Math.PI * 2;
        const px = spirit.x + Math.cos(a) * (size * 1.1);
        const py = spirit.y + Math.sin(a) * (size * 1.1);
        ctx.fillStyle = 'rgba(255,100,255,0.35)';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(px, py, size * 0.22, 0, Math.PI * 2); ctx.fill();
    }

    // main body
    const grad = ctx.createRadialGradient(spirit.x, spirit.y, 0, spirit.x, spirit.y, size);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.35, '#ff88ff');
    grad.addColorStop(0.7, 'magenta');
    grad.addColorStop(1, 'purple');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'magenta'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(spirit.x, spirit.y, size, 0, Math.PI * 2); ctx.fill();

    // inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(spirit.x - size * 0.2, spirit.y - size * 0.2, size * 0.3, size * 0.18, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // duration bar
    const bw = 42, bh = 5;
    const bx = spirit.x - bw / 2, by = spirit.y - size - 16;
    ctx.fillStyle = '#222'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'white'; ctx.fillRect(bx, by, bw * (timeRemaining / spirit.duration), bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);

    // glory indicator
    if (gloryForJusticeActive) {
        ctx.fillStyle = 'lime';
        ctx.shadowColor = 'lime'; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(spirit.x - 5, spirit.y - size - 26);
        ctx.lineTo(spirit.x + 5, spirit.y - size - 26);
        ctx.lineTo(spirit.x, spirit.y - size - 36);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ── Domain purple ally tint ──
    if (skillShiftActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(140,0,255,0.32)';
        ctx.beginPath(); ctx.arc(spirit.x, spirit.y, size * 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,100,255,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(spirit.x, spirit.y, size * 1.3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

// ── Blade arc ─────────────────────────────────────────────────
function drawBladeArcProjectile(arc) {
    const now = performance.now();
    ctx.save();
    const angle = Math.atan2(arc.vy, arc.vx);
    const sa = angle - Math.PI / 2, ea = angle + Math.PI / 2;

    // ── LAYER 0: wide energy wash behind the arc ──────────────
    ctx.strokeStyle = 'rgba(120,255,0,0.12)';
    ctx.lineWidth = 28;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // outer glow arc (original)
    ctx.strokeStyle = 'rgba(173,255,47,0.3)';
    ctx.lineWidth = 14;
    ctx.shadowColor = 'rgba(150,255,0,0.5)'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // main arc (original)
    ctx.strokeStyle = 'rgba(173,255,47,0.95)';
    ctx.lineWidth = 5;
    ctx.shadowColor = 'white'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // bright inner edge (original)
    ctx.strokeStyle = 'rgba(255,255,220,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius - 2, sa, ea); ctx.stroke();

    // ── LAYER 1: Digital pixel squares along the arc ──────────
    // Scatter small glowing squares that float around the arc path
    ctx.shadowBlur = 0;
    const sqCount = 14;
    for (let i = 0; i < sqCount; i++) {
        // spread each square across the semicircle
        const t = i / (sqCount - 1); // 0..1
        const arcAngle = sa + (ea - sa) * t;

        // alternate between arc surface and slightly off-radius
        const radOffset = (((i * 37 + Math.floor(now / 120)) % 5) - 2) * 5;
        const r = arc.radius + radOffset;

        const sx = arc.x + Math.cos(arcAngle) * r;
        const sy = arc.y + Math.sin(arcAngle) * r;

        // size pulses per square, staggered
        const sqPhase = now / 180 + i * 0.9;
        const sqSize = 3 + 2 * Math.abs(Math.sin(sqPhase));

        // flicker opacity
        const sqAlpha = 0.55 + 0.45 * Math.abs(Math.sin(now / 130 + i * 1.3));

        // color cycles: lime → cyan → white
        const col = (i % 3 === 0) ? `rgba(0,255,200,${sqAlpha})`
            : (i % 3 === 1) ? `rgba(173,255,47,${sqAlpha})`
                : `rgba(220,255,150,${sqAlpha * 0.7})`;

        ctx.fillStyle = col;
        // rotate each square independently
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(now / 400 + i * 0.7);
        ctx.fillRect(-sqSize / 2, -sqSize / 2, sqSize, sqSize);
        // inner bright dot on some squares
        if (i % 2 === 0) {
            ctx.fillStyle = `rgba(255,255,255,${sqAlpha * 0.8})`;
            ctx.fillRect(-1, -1, 2, 2);
        }
        ctx.restore();
    }

    // ── LAYER 2: Lithium-style atom particles ejected from arc ─
    // These stream outward from the arc face (forward direction)
    const liCount = 10;
    for (let i = 0; i < liCount; i++) {
        // each particle samples a position along the arc
        const t = (i / liCount + ((now / 600) % 1)) % 1;
        const arcAngle = sa + (ea - sa) * t;

        // base pos on arc edge
        const bx = arc.x + Math.cos(arcAngle) * arc.radius;
        const by = arc.y + Math.sin(arcAngle) * arc.radius;

        // drift outward in the arc's facing direction over time
        const driftPhase = (now / 500 + i * 0.63) % 1;
        const driftDist = driftPhase * (arc.radius * 0.55);

        // outward direction = away from arc center
        const outX = Math.cos(arcAngle) * driftDist;
        const outY = Math.sin(arcAngle) * driftDist;

        // small lateral wobble
        const wobble = Math.sin(now / 200 + i * 1.7) * 6;
        const perpX = -Math.sin(arcAngle) * wobble;
        const perpY = Math.cos(arcAngle) * wobble;

        const px = bx + outX + perpX;
        const py = by + outY + perpY;

        // fade out as they drift
        const pAlpha = (1 - driftPhase) * 0.9;
        const pSize = 3.5 * (1 - driftPhase * 0.5);

        ctx.save();
        // lithium-style: small nucleus dot + two orbital rings
        ctx.globalAlpha = pAlpha;

        // nucleus
        const nucleusGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize);
        nucleusGrad.addColorStop(0, '#ffffff');
        nucleusGrad.addColorStop(0.4, '#aaff44');
        nucleusGrad.addColorStop(1, 'rgba(0,200,60,0)');
        ctx.fillStyle = nucleusGrad;
        ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI * 2); ctx.fill();

        // two tiny orbital rings (ellipses, rotated differently per particle)
        const orbitR1 = pSize * 2.2;
        const orbitR2 = pSize * 1.8;
        const orbitRot1 = now / 350 + i * 1.1;
        const orbitRot2 = -now / 280 + i * 0.8;

        ctx.strokeStyle = `rgba(100,255,80,${pAlpha * 0.8})`;
        ctx.lineWidth = 0.8;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(orbitRot1);
        ctx.beginPath(); ctx.ellipse(0, 0, orbitR1, orbitR1 * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(orbitRot2);
        ctx.beginPath(); ctx.ellipse(0, 0, orbitR2 * 0.4, orbitR2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // tiny electron dot orbiting nucleus
        const eDot = { r: orbitR1, a: now / 220 + i * 0.5 };
        ctx.fillStyle = `rgba(200,255,150,${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px + Math.cos(eDot.a) * eDot.r, py + Math.sin(eDot.a) * eDot.r * 0.35, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ── LAYER 3: Edge sparks at arc tips ──────────────────────
    for (let tip = 0; tip < 2; tip++) {
        const tipAngle = tip === 0 ? sa : ea;
        const tx = arc.x + Math.cos(tipAngle) * arc.radius;
        const ty = arc.y + Math.sin(tipAngle) * arc.radius;

        // 3 short spark lines radiating from each tip
        for (let s = 0; s < 3; s++) {
            const sparkAngle = tipAngle + (s - 1) * 0.4 + Math.sin(now / 100 + s) * 0.2;
            const sparkLen = 6 + 4 * Math.abs(Math.sin(now / 80 + s * 2.1));
            const sAlpha = 0.5 + 0.5 * Math.abs(Math.sin(now / 90 + s));
            ctx.strokeStyle = `rgba(200,255,100,${sAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(sparkAngle) * sparkLen, ty + Math.sin(sparkAngle) * sparkLen);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// ── Black hole ────────────────────────────────────────────────
function drawBlackHole() {
    const now = performance.now();
    ctx.save();
    const angle = blackHole.activeTime / 500;
    ctx.translate(blackHole.x, blackHole.y);

    // distortion ring (visual layer only)
    for (let i = 3; i >= 1; i--) {
        const ringR = blackHole.size * (0.9 + i * 0.18);
        ctx.strokeStyle = `rgba(180,0,255,${0.08 * i})`;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // main gradient body
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, blackHole.size);
    grad.addColorStop(0, "black");
    grad.addColorStop(0.4, "#1a0030");
    grad.addColorStop(0.75, "purple");
    grad.addColorStop(1, "rgba(80,0,80,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size, 0, Math.PI * 2); ctx.fill();

    // accretion ring dashes
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'magenta'; ctx.shadowBlur = 12;
    ctx.rotate(angle);
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 0.82, 0, Math.PI * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 0.82, Math.PI, Math.PI * 1.5); ctx.stroke();

    // inner bright event horizon rim
    ctx.strokeStyle = 'rgba(200,100,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.rotate(-angle * 0.6);
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 0.55, 0, Math.PI * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 0.55, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();

    ctx.restore();
}

// ── Skill F – Annihilation Sweep ──────────────────────────────
function drawSkillF() {
    const now = performance.now();
    const radius = Math.max(canvas.width, canvas.height);

    // ── CHARGING phase ────────────────────────────────────────────
    if (skillFState === "charging") {
        const p = Math.min((now - skillFChargeStart) / 1500, 1);

        // --- half-plane glow (charging side preview) ---
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

        // --- TARGET LOCK on every enemy ---
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
            ctx.shadowColor = 'cyan'; ctx.shadowBlur = 14;
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
        return;
    }

    // ── SWEEPING phase ────────────────────────────────────────────
    if (skillFState === "sweeping") {
        const sp = (now - skillFSweepStart) / skillFSweepDuration;
        const currentAngle = -Math.PI + Math.PI * sp;

        // --- MATRIX RAIN inside the swept area ---
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

        // --- SWEEP BLADE ---
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(currentAngle);

        // wide outer glow cone
        ctx.fillStyle = 'rgba(0,255,255,0.12)';
        ctx.shadowColor = 'cyan'; ctx.shadowBlur = 40;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -60); ctx.lineTo(radius, 60);
        ctx.closePath(); ctx.fill();

        // bright solid blade
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'cyan'; ctx.shadowBlur = 50;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -12); ctx.lineTo(radius, 12);
        ctx.closePath(); ctx.fill();

        // cyan flanks
        ctx.fillStyle = 'rgba(0,255,255,0.65)';
        ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, -42); ctx.lineTo(radius, 42);
        ctx.closePath(); ctx.fill();

        // jitter streak
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5; ctx.shadowBlur = 10;
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

        // --- MATRIX SCAN LINES on swept area overlay ---
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

        // --- HEX GRID overlay in swept area ---
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

// ── Skill G barrier ───────────────────────────────────────────
function drawSkillGBarrier() {
    if (skillGBorderOpacity <= 0) return;
    const now = performance.now();
    ctx.save();

    // interior tint
    ctx.fillStyle = `rgba(0,40,70,${skillGBorderOpacity * 0.18})`;
    ctx.fillRect(0, 0, canvas.width, boundaryY);

    // animated grid inside barrier (cheap – low alpha)
    ctx.strokeStyle = `rgba(0,200,255,${skillGBorderOpacity * 0.07})`;
    ctx.lineWidth = 1;
    const gSize = 60;
    const offset = (now / 40) % gSize;
    for (let x = -gSize + offset; x < canvas.width; x += gSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, boundaryY); ctx.stroke();
    }
    for (let y = offset; y < boundaryY; y += gSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // outer glow frame
    ctx.strokeStyle = `rgba(0,180,255,${skillGBorderOpacity * 0.7})`;
    ctx.shadowColor = 'cyan'; ctx.shadowBlur = 35;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, boundaryY - 5);

    // inner thin highlight line
    ctx.strokeStyle = `rgba(150,255,255,${skillGBorderOpacity * 0.5})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, boundaryY - 10);

    ctx.restore();
}

// ── Energy Orb (Skill G) ──────────────────────────────────────
function drawEnergyOrb(orb) {
    const now = performance.now();
    ctx.save();
    const pulse = Math.sin(now / 200 + orb.id) * 2.5;
    let radius = orb.size + pulse;
    if (orb.isMerging) {
        const mp = (now - orb.mergeStartTime) / 500;
        radius = Math.max(0, (orb.size + pulse) * (1 - mp));
    }

    // outer halo
    ctx.fillStyle = 'rgba(0,180,255,0.12)';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 2, 0, Math.PI * 2); ctx.fill();

    // main gradient
    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.45, '#44ddff');
    grad.addColorStop(0.8, '#0066cc');
    grad.addColorStop(1, 'rgba(0,40,120,0.4)');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'white'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2); ctx.fill();

    // inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(orb.x - radius * 0.25, orb.y - radius * 0.25, radius * 0.28, radius * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // energy link beam
    if (!orb.isMerging && orb.linkedTo && orb.id < orb.linkedTo.orb.id) {
        const orb2 = orb.linkedTo.orb;
        if (!orb2) { ctx.restore(); return; }

        // outer glow beam
        ctx.strokeStyle = 'rgba(0,200,255,0.25)';
        ctx.lineWidth = orb.size * 2;
        ctx.shadowColor = 'white'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // main beam
        ctx.strokeStyle = 'rgba(0,255,255,0.75)';
        ctx.lineWidth = orb.size;
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // bright core
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // animated energy packet
        const t = (now / 1200) % 1;
        const ex = orb.x + (orb2.x - orb.x) * t;
        const ey = orb.y + (orb2.y - orb.y) * t;
        ctx.fillStyle = 'white'; ctx.shadowColor = 'cyan'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ── Tesla Coil (Skill G) ──────────────────────────────────────
function drawTeslaCoil(coil) {
    const now = performance.now();
    ctx.save();

    // aura zone
    const rotation = now / 5000;
    drawPolygon(coil.x, coil.y, coil.auraRadius, 8, rotation, 'rgba(0,200,255,0.07)', 'rgba(0,80,120,0.03)');

    // aura rim
    ctx.strokeStyle = 'rgba(0,200,255,0.15)';
    ctx.lineWidth = 2; ctx.setLineDash([10, 20]);
    ctx.beginPath(); ctx.arc(coil.x, coil.y, coil.auraRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    const br = coil.size / 2;

    // outer glow ring
    ctx.fillStyle = 'rgba(0,200,255,0.15)';
    ctx.shadowColor = 'cyan'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(coil.x, coil.y, br * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // outer casing ring – counter-rotating gear teeth
    ctx.save();
    ctx.translate(coil.x, coil.y);
    ctx.rotate(-now / 4000);
    ctx.strokeStyle = 'rgba(0,180,200,0.7)'; ctx.lineWidth = 2;
    const teeth = 10;
    for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const inner = br * 1.05, outer = br * 1.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.stroke();
    }
    // gear arc segments
    ctx.strokeStyle = 'rgba(0,220,255,0.4)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const nextA = ((i + 0.5) / teeth) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, br * 1.18, a, nextA); ctx.stroke();
    }
    ctx.restore();

    // main body
    const bodyGrad = ctx.createRadialGradient(coil.x, coil.y, 0, coil.x, coil.y, br);
    bodyGrad.addColorStop(0, 'white');
    bodyGrad.addColorStop(0.4, '#00FFFF');
    bodyGrad.addColorStop(0.8, '#0088AA');
    bodyGrad.addColorStop(1, '#004455');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = 'cyan'; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(coil.x, coil.y, br, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // inner energy core
    const coreR = br * 0.45;
    const cg = ctx.createRadialGradient(coil.x, coil.y, 0, coil.x, coil.y, coreR);
    cg.addColorStop(0, 'white');
    cg.addColorStop(0.5, 'cyan');
    cg.addColorStop(1, 'rgba(0,200,255,0.2)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(coil.x, coil.y, coreR, 0, Math.PI * 2); ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(coil.x - br * 0.2, coil.y - br * 0.2, br * 0.26, br * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // random discharge sparks (probabilistic – cheap)
    if (Math.random() < 0.35) {
        ctx.strokeStyle = `rgba(200,255,255,${0.5 + Math.random() * 0.5})`;
        ctx.lineWidth = 1.5 + Math.random();
        ctx.shadowColor = 'white'; ctx.shadowBlur = 8;
        const sa = Math.random() * Math.PI * 2;
        const sd = br + Math.random() * 28;
        ctx.beginPath();
        ctx.moveTo(coil.x, coil.y);
        const mx = coil.x + Math.cos(sa) * sd * 0.5 + (Math.random() - 0.5) * 10;
        const my = coil.y + Math.sin(sa) * sd * 0.5 + (Math.random() - 0.5) * 10;
        ctx.lineTo(mx, my);
        ctx.lineTo(coil.x + Math.cos(sa) * sd, coil.y + Math.sin(sa) * sd);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // HP bar
    const bw = 42, bh = 5;
    const bx = coil.x - bw / 2, by = coil.y - coil.size - 10;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
    const hpPct = coil.hp / coil.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#00FFFF' : hpPct > 0.25 ? 'orange' : 'red';
    ctx.fillRect(bx, by, bw * hpPct, bh);
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);

    ctx.restore();
}

// ── Skill buttons (UI – unchanged logic, minor glow) ─────────
function drawSkillButton(x, y, key, color, cooldown, lastActivation, activeCondition, chargePercent = -1) {
    ctx.save();
    const now = performance.now();
    let isReady = false, remaining = 0;

    if (chargePercent !== -1) {
        isReady = chargePercent >= 100;
        ctx.beginPath(); ctx.arc(x, y, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333'; ctx.fill();

        if (chargePercent > 0 && chargePercent < 100) {
            ctx.save();
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.arc(x, y, btnRadius, Math.PI / 2, Math.PI / 2 + (2 * Math.PI * (chargePercent / 100)), false);
            ctx.closePath();
            const grad = ctx.createRadialGradient(x, y, 0, x, y, btnRadius);
            grad.addColorStop(0, 'white'); grad.addColorStop(1, color);
            ctx.fillStyle = grad; ctx.globalAlpha = 0.7; ctx.fill();
            ctx.restore();
        }

        ctx.strokeStyle = isReady ? 'white' : '#666'; ctx.lineWidth = 3; ctx.stroke();

        if (isReady) {
            ctx.save();
            ctx.shadowColor = 'white'; ctx.shadowBlur = 20;
            ctx.strokeStyle = color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, btnRadius + 5 + Math.sin(now / 150) * 2, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(key, x, y);
        if (!isReady) { ctx.font = "bold 14px Arial"; ctx.fillText(Math.floor(chargePercent) + "%", x, y + 2); }

    } else {
        remaining = Math.max(0, (cooldown - (now - lastActivation)) / 1e3);
        isReady = remaining <= 0 && !activeCondition;

        ctx.beginPath(); ctx.arc(x, y, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333'; ctx.fill();
        ctx.strokeStyle = isReady ? 'white' : '#666'; ctx.lineWidth = 3; ctx.stroke();

        if (remaining > 0) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.arc(x, y, btnRadius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - remaining * 1e3 / cooldown));
            ctx.closePath(); ctx.fill();
        }

        ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(key, x, y);
        if (remaining > 0) { ctx.font = "bold 16px Arial"; ctx.fillText(Math.ceil(remaining), x, y + 2); }
    }
    ctx.restore();
}

function drawSkillButtons() {
    const baseX = btnMarginLeft + btnRadius, baseY = canvas.height - btnMarginBottom - btnRadius, step = btnRadius * 2 + btnGap;
    const skillAReady = (performance.now() - lastSkillA >= skillACooldown) && skillAOrbs.length < maxSkillAOrbs;

    ctx.save();
    let shiftBtnRadius = 15;
    let shiftX = baseX, shiftY = baseY - btnRadius - shiftBtnRadius - 10;
    let shiftRemaining = Math.max(0, (skillShiftCooldown - (performance.now() - lastSkillShift)) / 1000);
    let shiftReady = shiftRemaining <= 0 && !skillShiftActive;

    ctx.beginPath(); ctx.arc(shiftX, shiftY, shiftBtnRadius, 0, Math.PI * 2);
    ctx.fillStyle = shiftReady ? '#8A2BE2' : '#333'; ctx.fill();
    ctx.strokeStyle = shiftReady ? 'white' : '#666'; ctx.lineWidth = 2; ctx.stroke();

    if (shiftRemaining > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.moveTo(shiftX, shiftY);
        ctx.arc(shiftX, shiftY, shiftBtnRadius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - shiftRemaining * 1000 / skillShiftCooldown));
        ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = "white"; ctx.font = "bold 10px Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (skillShiftActive) {
        ctx.fillRect(shiftX - 4, shiftY - 4, 3, 8);
        ctx.fillRect(shiftX + 1, shiftY - 4, 3, 8);
    } else {
        ctx.fillText("SH", shiftX, shiftY);
    }
    ctx.restore();

    drawSkillButton(baseX, baseY, 'A', 'blue', skillACooldown, lastSkillA, !skillAReady);
    drawSkillButton(baseX + step, baseY, 'S', 'green', skillSCooldown, lastSkillS, spirits.length >= MAX_SPIRITS);
    drawSkillButton(baseX + 2 * step, baseY, 'D', '#4B0082', skillDCooldown, lastSkillD, skillDCharging || blackHole);
    drawSkillButton(baseX + 3 * step, baseY, 'F', 'red', skillFCooldown, lastSkillF, skillFState !== 'ready');
    drawSkillButton(baseX + 4 * step, baseY, 'G', '#00BCD4', -1, 0, skillGActive, skillGCharge);
}