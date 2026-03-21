// ============================================================
//  render.js  –  Enhanced Graphics v2  (hitbox-safe, 60fps)
//  RULE: hitbox = original size/shape. Only VISUAL layers added.
// ============================================================

let bgStars = [];
let nebulaPoints = null;
let _skillGActivatedAt = -Infinity; // track khi nào G vừa được bật

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

    // Nebula clouds — mờ nhẹ
    if (!nebulaPoints) {
        nebulaPoints = [];
        for (let i = 0; i < 5; i++) {
            nebulaPoints.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.7,
                r: 120 + Math.random() * 200,
                h: [200, 260, 180, 300, 220][i],
                a: 0.03 + Math.random() * 0.04
            });
        }
    }
    ctx.save();
    nebulaPoints.forEach(n => {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        g.addColorStop(0, `hsla(${n.h},70%,35%,${n.a})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    });
    ctx.restore();

    // ── Star field với hiệu ứng parallax zoom ────────────────────
    // Mỗi sao có z (độ sâu 0→1), bay từ tâm ra rìa màn hình
    // z nhỏ = xa (nhỏ mờ), z lớn = gần (to sáng)
    if (bgStars.length === 0) {
        for (let i = 0; i < 280; i++) {
            bgStars.push({
                // Vị trí gốc trong không gian -1..1
                ox: Math.random() * 2 - 1,
                oy: Math.random() * 2 - 1,
                z: Math.random(),           // độ sâu hiện tại
                speed: 0.0003 + Math.random() * 0.0006, // tốc độ z tiến về phía camera
                color: Math.random() > 0.75 ? '#00e5ff' : (Math.random() > 0.45 ? '#ffffff' : '#ffccff'),
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    const now = performance.now();
    const dt = deltaTime ? deltaTime / 16.67 : 1;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    ctx.save();
    for (const star of bgStars) {
        // Tiến z về 1 (gần camera)
        star.z += star.speed * dt;
        if (star.z >= 1) {
            // Reset xa lại
            star.ox = Math.random() * 2 - 1;
            star.oy = Math.random() * 2 - 1;
            star.z = 0.01;
        }

        // Project: z=0 → ở tâm màn hình, z=1 → ở rìa
        const perspective = 1 / (1 - star.z * 0.95);
        const sx = cx + star.ox * cx * perspective;
        const sy = cy + star.oy * cy * perspective;

        // Clip ngoài màn hình
        if (sx < 0 || sx > W || sy < 0 || sy > H) continue;

        // Kích thước và độ sáng tăng theo z
        const size = 0.2 + star.z * star.z * 3.5;
        const brightness = star.z * star.z; // dim xa, sáng gần
        // Nhấp nháy nhẹ (dim hơn ở xa, nháy ít hơn)
        const twinkle = brightness < 0.3
            ? brightness
            : brightness * (0.75 + 0.25 * Math.sin(now / 500 + star.phase));

        ctx.globalAlpha = Math.min(1, twinkle * 1.2);
        ctx.fillStyle = star.color;

        // Glow cho sao gần (z > 0.65)
        if (star.z > 0.65) {
            ctx.shadowColor = star.color;
            ctx.shadowBlur = size * 3;
        } else {
            ctx.shadowBlur = 0;
        }

        // Vệt chuyển động cho sao rất gần (z > 0.82)
        if (star.z > 0.82) {
            const prevZ = star.z - star.speed * dt * 3;
            const prevP = 1 / (1 - Math.max(0, prevZ) * 0.95);
            const px = cx + star.ox * cx * prevP;
            const py = cy + star.oy * cy * prevP;
            ctx.strokeStyle = star.color;
            ctx.lineWidth = size * 0.7;
            ctx.globalAlpha = Math.min(1, twinkle * 0.6);
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
            ctx.globalAlpha = Math.min(1, twinkle * 1.2);
        }

        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.3, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
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

    // Mobile zoom-out: scale game world to 72%, centered
    // Background already drawn above at full size
    const _isMobile = typeof _platform !== 'undefined' && _platform === 'mobile';
    if (_isMobile) {
        const s = 0.72;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        ctx.save();
        ctx.translate(cx * (1 - s), cy * (1 - s));
        ctx.scale(s, s);
    }

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

        // B1b. PERSIAN TILE OVERLAY — hoa văn Ba Tư cuộn theo domain
        if (domainFull) {
            const tileT = Math.min((elapsed - 700) / 600, 1);
            const tSize = 52; // tile size
            const cols2 = Math.ceil(canvas.width / tSize) + 2;
            const rows2 = Math.ceil(canvas.height / tSize) + 2;
            // slow drift + rotation
            const driftX = (now / 7000 * tSize) % tSize;
            const driftY = (now / 9500 * tSize) % tSize;

            ctx.save();
            ctx.translate(-driftX, -driftY);
            // clip to domain circle
            ctx.beginPath();
            ctx.arc(cx + driftX, cy + driftY, maxRadius * 0.98, 0, Math.PI * 2);
            ctx.clip();

            for (let row2 = -1; row2 < rows2 + 1; row2++) {
                for (let col2 = -1; col2 < cols2 + 1; col2++) {
                    const tx3 = col2 * tSize + (row2 % 2 === 0 ? 0 : tSize * 0.5);
                    const ty3 = row2 * tSize;
                    // distance fade from center
                    const dist2 = Math.hypot(tx3 + driftX - cx, ty3 + driftY - cy);
                    const distFade = Math.max(0, 1 - dist2 / (maxRadius * 0.95));
                    const pulse2 = 0.5 + 0.5 * Math.sin(now / 1800 + tx3 * 0.025 + ty3 * 0.018);
                    const alpha2 = tileT * distFade * pulse2 * 0.30;
                    if (alpha2 < 0.04) continue;
                    // Alternate hue per tile for Ba Tư multi-color feel
                    const hue2 = 260 + ((row2 * 3 + col2 * 7) % 40) - 20;
                    _drawPersianTile(tx3, ty3, tSize * 0.9, alpha2, hue2);
                }
            }
            ctx.restore();
            ctx.globalAlpha = 1;
        }
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

        // C5b. PERSIAN TILE PATTERN — Ottoman-style geometric overlay inside domain
        if (domainFull) {
            const tileAlpha = Math.min((elapsed - 600) / 800, 1) * 0.18;
            if (tileAlpha > 0) {
                const tileSize = 60; // tile unit size
                const cols = Math.ceil(canvas.width / tileSize) + 3;
                const rows = Math.ceil(canvas.height / tileSize) + 3;
                // Slow scroll + rotate
                const scrollX2 = (now / 12000 * tileSize) % tileSize;
                const scrollY2 = (now / 18000 * tileSize) % tileSize;

                ctx.save();
                ctx.clip(); // clip to domain circle (already set by void fill above? no — re-clip)
                ctx.beginPath(); ctx.arc(cx, cy, currentDomainRadius * 0.96, 0, Math.PI * 2);
                ctx.clip();
                ctx.translate(-scrollX2, -scrollY2);

                for (let r = -2; r < rows + 2; r++) {
                    for (let c = -2; c < cols + 2; c++) {
                        const tx2 = c * tileSize, ty2 = r * tileSize;
                        const dist2 = Math.hypot(tx2 + scrollX2 - cx, ty2 + scrollY2 - cy);
                        const distFade = Math.max(0, 1 - dist2 / (currentDomainRadius * 0.9));
                        if (distFade < 0.01) continue;
                        const alpha = tileAlpha * distFade;
                        const cx2 = tx2 + tileSize / 2, cy2 = ty2 + tileSize / 2;
                        const s = tileSize * 0.5;
                        const pulse2 = 0.8 + 0.2 * Math.sin(now / 1800 + r * 0.4 + c * 0.5);
                        const a = alpha * pulse2;

                        // ── Diamond outline ──
                        ctx.strokeStyle = `rgba(180,80,255,${a * 1.2})`;
                        ctx.lineWidth = 0.9;
                        ctx.beginPath();
                        ctx.moveTo(cx2, cy2 - s);
                        ctx.lineTo(cx2 + s, cy2);
                        ctx.lineTo(cx2, cy2 + s);
                        ctx.lineTo(cx2 - s, cy2);
                        ctx.closePath();
                        ctx.stroke();

                        // ── 4-petal flower in center ──
                        const pr = s * 0.32;
                        ctx.strokeStyle = `rgba(220,140,255,${a})`;
                        ctx.lineWidth = 0.8;
                        for (let p = 0; p < 4; p++) {
                            const pa = (p / 4) * Math.PI * 2;
                            const px4 = cx2 + Math.cos(pa) * pr * 0.45;
                            const py4 = cy2 + Math.sin(pa) * pr * 0.45;
                            ctx.beginPath();
                            ctx.ellipse(
                                cx2 + Math.cos(pa) * pr * 0.5,
                                cy2 + Math.sin(pa) * pr * 0.5,
                                pr * 0.55, pr * 0.28,
                                pa, 0, Math.PI * 2
                            );
                            ctx.stroke();
                        }

                        // ── Cross lines ──
                        ctx.strokeStyle = `rgba(160,60,255,${a * 0.7})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(cx2 - s * 0.5, cy2); ctx.lineTo(cx2 + s * 0.5, cy2);
                        ctx.moveTo(cx2, cy2 - s * 0.5); ctx.lineTo(cx2, cy2 + s * 0.5);
                        ctx.stroke();

                        // ── Corner dots ──
                        const cornersAt = [[cx2 - s * 0.6, cy2], [cx2 + s * 0.6, cy2], [cx2, cy2 - s * 0.6], [cx2, cy2 + s * 0.6]];
                        ctx.fillStyle = `rgba(240,180,255,${a * 0.9})`;
                        cornersAt.forEach(([dpx, dpy]) => {
                            ctx.beginPath(); ctx.arc(dpx, dpy, 1.5, 0, Math.PI * 2); ctx.fill();
                        });
                    }
                }
                ctx.restore();
                ctx.globalAlpha = 1;
            }
        }

        // C6. DOMAIN TITLE TEXT — fades in briefly
        {
            const textT = Math.min(elapsed / 200, 1) * Math.max(0, 1 - (elapsed - 200) / 1500);
            if (textT > 0.02) {
                if (elapsed < 280) screenShake = { intensity: 4, duration: 100 };
                ctx.save();

                // ── BIG KANJI BEHIND (mờ, to, đỏ tím) ──
                ctx.globalAlpha = textT * 0.38;
                ctx.font = 'bold 130px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#cc44ff';
                ctx.shadowColor = '#8800cc'; ctx.shadowBlur = 40;
                ctx.fillText('律域展開', cx, cy - 30);

                // ── EN TITLE FRONT (sắc nét, sáng) ──
                ctx.globalAlpha = textT * 0.92;
                ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 22;

                // tên lớn
                ctx.font = 'bold 32px "Arial Black", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('YOG-SOTHOTH', cx, cy - 72);

                // subtitle nhỏ
                ctx.font = 'italic 14px monospace';
                ctx.fillStyle = '#dd88ff';
                ctx.shadowBlur = 10;
                ctx.fillText('— Bành trướng lãnh địa —', cx, cy - 46);

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
        // Vanguard Network threads (5+ sentinels)
        if (sentinels.length >= 5) _drawVanguardThreads();
        if (skillAActive) drawSkillA();
        bladeArcProjectiles.forEach(drawBladeArcProjectile);
        marchosiasBlades.forEach(_drawMarchoBlade);
        scatteredProjectiles.forEach(drawScatteredProjectile);

        teslaCoils.forEach(drawTeslaCoil);
        energyOrbs.forEach(drawEnergyOrb);

        drawAegisLasers();
        _drawLeviathanEffects(); // death lasers + perseverance sweep (outside enemy lifetime)

        // Draw non-bullet enemies first (background layer)
        enemies.forEach(e => { if (!e.type.startsWith('enemy_bullet')) drawEnemy(e); });
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
        if (skillDCharging) drawSkillDCharging();
        if (charging) drawChargeMeter();
        if (skillShiftActive) drawSkillShiftEffects();

        // ── ENEMY BULLETS: top layer, always visible ──
        enemies.forEach(e => { if (e.type.startsWith('enemy_bullet')) drawEnemy(e); });

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
        if (typeof _platform === 'undefined' || _platform !== 'mobile') drawSkillButtons();
        // Close mobile zoom before HUD — HUD always full size
        if (_isMobile) ctx.restore();
        ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "right";

        // Bộ đếm thời gian game — chậm lại khi dùng Yog-Sothoth
        const elapsedSec = Math.floor(gameElapsedTime / 1000);
        const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const ss = String(elapsedSec % 60).padStart(2, '0');
        ctx.fillStyle = '#aaddff'; ctx.font = 'bold 22px monospace';
        ctx.fillText(`⏱ ${mm}:${ss}`, canvas.width - 20, 28);

        ctx.fillStyle = "white"; ctx.font = "20px Arial";
        ctx.fillText("Score: " + score, canvas.width - 20, 56);
        ctx.fillText("Lives: " + lives, canvas.width - 20, 82);
        ctx.fillText("Sentinels: " + sentinels.length, canvas.width - 20, 108);
        ctx.fillText("Tesla Coils: " + teslaCoils.length, canvas.width - 20, 134);
    } else if (gameState === "start") {
        _drawStartScreen();
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

// ── Start Screen — Pisces Constellation ───────────────────────
function _drawStartScreen() {
    const now = performance.now();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // ── Pisces constellation star positions (normalized -1..1 → screen)
    // Based on real Pisces star pattern: two fish connected by a cord
    const scale = Math.min(canvas.width, canvas.height) * 0.30;
    const offX = cx;
    const offY = cy - scale * 0.05;

    // Stars: [x, y, magnitude] — normalized coords centered on constellation
    const piscesStars = [
        // Western fish (top-left loop)
        [-0.55, 0.10, 2.8], // η Psc
        [-0.72, 0.00, 3.6], // ο Psc
        [-0.82, -0.14, 4.1], // α Psc (Alrescha - knot)
        [-0.68, -0.28, 4.2],
        [-0.48, -0.32, 4.3],
        [-0.30, -0.20, 3.9],
        [-0.38, -0.06, 3.7],
        // Cord connecting
        [-0.22, 0.08, 4.4],
        [-0.06, 0.18, 4.3],
        [0.10, 0.12, 4.2],
        // Eastern fish (right circle)
        [0.26, 0.04, 3.5], // γ Psc
        [0.42, -0.10, 3.7], // κ Psc
        [0.58, -0.22, 4.0],
        [0.62, -0.06, 3.8],
        [0.54, 0.12, 4.1],
        [0.38, 0.22, 3.9],
        [0.22, 0.18, 3.6], // ε Psc
    ];

    // Constellation lines (index pairs)
    const lines = [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], // western fish loop
        [6, 7], [7, 8], [8, 9], [9, 10],                  // cord
        [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 10] // eastern fish loop
    ];

    // ── Draw constellation lines — sáng rõ hơn
    ctx.save();
    lines.forEach(([a, b]) => {
        const ax = offX + piscesStars[a][0] * scale;
        const ay = offY + piscesStars[a][1] * scale;
        const bx = offX + piscesStars[b][0] * scale;
        const by = offY + piscesStars[b][1] * scale;

        const lineAlpha = 0.28 + 0.12 * Math.sin(now / 2000 + a * 0.4);
        ctx.strokeStyle = `rgba(140, 230, 255, ${lineAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = '#40ccff';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.stroke();
    });
    ctx.shadowBlur = 0;
    ctx.restore();

    // ── Draw constellation stars — rực rỡ, nhấp nháy như ánh sáng cuối đường
    piscesStars.forEach(([sx, sy, mag], idx) => {
        const px = offX + sx * scale;
        const py = offY + sy * scale;

        // Nhấp nháy: dim xuống rồi sáng lại, mỗi sao lệch pha
        const t = now / 1000 + idx * 0.73;
        // "Ánh sáng cuối con đường" — gần như tắt hẳn rồi bùng sáng lại
        const raw = Math.sin(t) * Math.sin(t * 0.7) * Math.sin(t * 1.3);
        const twinkle = 0.35 + 0.65 * (raw * 0.5 + 0.5);

        const r = Math.max(1.8, (5.2 - mag) * 1.1); // kích thước theo magnitude
        const baseAlpha = (5.5 - mag) / 4.5; // sao sáng hơn = alpha cao hơn

        ctx.save();

        // Diffraction spikes (4 tia) — chỉ sao sáng nhất
        if (mag < 3.8) {
            ctx.globalAlpha = twinkle * baseAlpha * 0.55;
            ctx.strokeStyle = '#c0eeff';
            ctx.lineWidth = 0.8;
            const spikeLen = r * 4.5 * twinkle;
            ctx.shadowColor = '#80ddff'; ctx.shadowBlur = 3;
            [[px - spikeLen, py, px + spikeLen, py], [px, py - spikeLen, px, py + spikeLen]].forEach(([x1, y1, x2, y2]) => {
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            });
        }

        // Outer glow halo
        ctx.globalAlpha = twinkle * baseAlpha * 0.45;
        const haloR = r * 5 * (0.8 + 0.2 * twinkle);
        const hG = ctx.createRadialGradient(px, py, 0, px, py, haloR);
        hG.addColorStop(0, 'rgba(140,220,255,0.9)');
        hG.addColorStop(0.4, 'rgba(80,180,255,0.3)');
        hG.addColorStop(1, 'transparent');
        ctx.fillStyle = hG;
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(px, py, haloR, 0, Math.PI * 2); ctx.fill();

        // Core star — sáng rõ
        ctx.globalAlpha = twinkle * Math.min(1, baseAlpha * 1.3);
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = r * 3;
        const cG = ctx.createRadialGradient(px, py, 0, px, py, r * 1.6);
        cG.addColorStop(0, '#ffffff');
        cG.addColorStop(0.25, '#d0f0ff');
        cG.addColorStop(0.7, 'rgba(80,200,255,0.5)');
        cG.addColorStop(1, 'transparent');
        ctx.fillStyle = cG;
        ctx.beginPath(); ctx.arc(px, py, r * 1.6, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    });

    // ── Subtle "PISCES" label near constellation
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = `rgba(100,200,255,${0.25 + 0.12 * Math.sin(now / 2000)})`;
    ctx.letterSpacing = '3px';
    ctx.fillText('♓  PISCES', offX + piscesStars[14][0] * scale + 30, offY + piscesStars[14][1] * scale - 14);
    ctx.restore();

    // ── Title text
    ctx.save();
    ctx.textAlign = 'center';

    // Subtle glow behind title
    ctx.shadowColor = '#00ddff';
    ctx.shadowBlur = 38;
    ctx.font = 'bold 62px "Georgia", serif';
    const titlePulse = 0.88 + 0.12 * Math.sin(now / 1800);
    ctx.fillStyle = `rgba(0, 220, 255, ${titlePulse})`;
    ctx.fillText('Pisces: Space Journey', cx, cy - scale * 0.72);
    ctx.shadowBlur = 0;

    // Thin underline
    const titleW = ctx.measureText('Pisces: Space Journey').width;
    const lineY = cy - scale * 0.72 + 10;
    const lineAlpha = 0.25 + 0.15 * Math.sin(now / 1400);
    const lineG = ctx.createLinearGradient(cx - titleW / 2, 0, cx + titleW / 2, 0);
    lineG.addColorStop(0, 'transparent');
    lineG.addColorStop(0.3, `rgba(0,200,255,${lineAlpha})`);
    lineG.addColorStop(0.7, `rgba(0,200,255,${lineAlpha})`);
    lineG.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineG;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - titleW / 2, lineY); ctx.lineTo(cx + titleW / 2, lineY); ctx.stroke();

    ctx.restore();
}

// ── Aegis lasers ──────────────────────────────────────────────
// ── Leviathan standalone effects (survive enemy death) ────────
function _drawLeviathanEffects() {
    const now = performance.now();
    const len = Math.hypot(canvas.width, canvas.height) * 1.5;

    // ── Perseverance charge warning (full circle spin — báo hiệu quét 360°)
    enemies.forEach(e => {
        if (e.type !== 'leviathan') return;
        if (!e.perseveranceCharging) return;

        const prog = Math.min(1, (now - e.perseveranceChargeStart) / 1000);
        const glowColor = '#ff0000';

        ctx.save();
        ctx.translate(e.x, e.y);

        // Full circle warning pulse — expanding ring
        ctx.globalAlpha = prog * 0.25;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3 + prog * 8;
        ctx.shadowColor = glowColor; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, e.size * (0.6 + prog * 1.4), 0, Math.PI * 2); ctx.stroke();

        // Spinning dashes
        ctx.globalAlpha = prog * 0.5;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.save(); ctx.rotate(now / 300);
        ctx.beginPath(); ctx.arc(0, 0, e.size * 0.8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        // Core glow
        ctx.globalAlpha = prog * 0.8;
        ctx.shadowColor = glowColor; ctx.shadowBlur = 40;
        ctx.fillStyle = 'rgba(255,0,0,0.5)';
        ctx.beginPath(); ctx.arc(0, 0, e.size * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // ── Perseverance sweep beams (objects độc lập trong _levPersBeams)
    if (window._levPersBeams) {
        window._levPersBeams.forEach(beam => {
            if (beam.done) return;
            // sweepCurrent được update bởi main.js mỗi frame
            const sweepAngle = beam.sweepCurrent !== undefined ? beam.sweepCurrent
                : (beam.sweepOrigin + (beam.progress || 0) * Math.PI * 2);

            // Luôn đỏ — cả lúc announce lẫn post-shield
            const laserGlow = '#ff0000';
            const laserCore = 'rgba(255,30,0,0.95)';
            const laserOuter = 'rgba(255,0,0,0.2)';

            ctx.save();
            ctx.translate(beam.ox, beam.oy);
            ctx.rotate(sweepAngle);

            // Wide outer glow
            ctx.shadowColor = laserGlow; ctx.shadowBlur = 60;
            ctx.strokeStyle = laserOuter;
            ctx.lineWidth = 70;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            // Core beam
            ctx.strokeStyle = laserCore;
            ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            // White center line
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            ctx.restore();
        });
    }

    // ── Death lasers — with wing rotation animation
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
            // ── Wing shape rotating into position ──
            const wingLen = 60 + warnProg * 40; // cánh vươn ra khi xoay
            const wingW = 14;
            const hw = wingW / 2;

            ctx.save();
            ctx.rotate(currentAngle);
            // Cánh hình thang
            const wg = ctx.createLinearGradient(0, 0, wingLen, 0);
            wg.addColorStop(0, '#ff4400');
            wg.addColorStop(0.3, '#2d1810');
            wg.addColorStop(1, '#0f0a08');
            ctx.fillStyle = wg;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 8 + warnProg * 20;
            ctx.beginPath();
            ctx.moveTo(0, -hw * 0.4);
            ctx.lineTo(0, hw * 0.4);
            ctx.lineTo(wingLen, hw * 0.7);
            ctx.lineTo(wingLen, -hw * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Dashed warning line
            ctx.rotate(currentAngle);
            ctx.globalAlpha = warnProg * 0.7;
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 12;
            ctx.setLineDash([10, 7]);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // ── Active laser beam ──
            ctx.rotate(targetA);
            ctx.globalAlpha = activeFade;
            ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 40;
            ctx.strokeStyle = 'rgba(255,80,0,0.3)';
            ctx.lineWidth = 35;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
        }
        ctx.restore();
    });
}

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

// ── Persian/Moroccan tile pattern helper ─────────────────────
// Vẽ một tile hoa văn Ba Tư tại (tx,ty), kích thước tileSize, với alpha và màu chủ
function _drawPersianTile(tx, ty, tileSize, baseAlpha, hue) {
    const h = tileSize / 2;
    const q = tileSize / 4;
    const e = tileSize / 8;

    ctx.save();
    ctx.translate(tx, ty);

    // ── Outer diamond frame ──
    ctx.strokeStyle = `hsla(${hue},70%,55%,${baseAlpha * 0.9})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(h, 0);
    ctx.lineTo(0, h); ctx.lineTo(-h, 0);
    ctx.closePath(); ctx.stroke();

    // ── Inner square (rotated 45° = diamond) ──
    const iS = h * 0.55;
    ctx.strokeStyle = `hsla(${hue + 20},65%,65%,${baseAlpha * 0.7})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -iS); ctx.lineTo(iS, 0);
    ctx.lineTo(0, iS); ctx.lineTo(-iS, 0);
    ctx.closePath(); ctx.stroke();

    // ── 4-petal flower (arabesque) ──
    const petalR = h * 0.38;
    for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * Math.PI * 2;
        const px = Math.cos(pa) * petalR * 0.42;
        const py = Math.sin(pa) * petalR * 0.42;
        ctx.strokeStyle = `hsla(${hue + 30},75%,70%,${baseAlpha * 0.8})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(px, py, petalR * 0.38, petalR * 0.22,
            pa + Math.PI / 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── Center cross ──
    ctx.strokeStyle = `hsla(${hue},80%,80%,${baseAlpha * 0.6})`;
    ctx.lineWidth = 0.8;
    const cs = h * 0.18;
    ctx.beginPath();
    ctx.moveTo(-cs, 0); ctx.lineTo(cs, 0);
    ctx.moveTo(0, -cs); ctx.lineTo(0, cs);
    ctx.stroke();

    // ── 4 corner accent dots ──
    const dotR = h * 0.07;
    ctx.fillStyle = `hsla(${hue + 40},80%,80%,${baseAlpha * 0.7})`;
    for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(pa) * h * 0.7, Math.sin(pa) * h * 0.7, dotR, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── 8-fold star lines ──
    ctx.strokeStyle = `hsla(${hue + 10},60%,60%,${baseAlpha * 0.4})`;
    ctx.lineWidth = 0.6;
    for (let s = 0; s < 8; s++) {
        const sa = (s / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * h * 0.2, Math.sin(sa) * h * 0.2);
        ctx.lineTo(Math.cos(sa) * h * 0.48, Math.sin(sa) * h * 0.48);
        ctx.stroke();
    }

    ctx.restore();
}

// ── Boss shockwaves (Maou Haki) ───────────────────────────────
function drawBossShockwaves() {
    const now = performance.now();
    bossShockwaves.forEach(wave => {
        if (!wave || wave.radius <= 0) return;
        const maxR = wave.maxRadius || canvas.width;
        const prog = Math.min(1, wave.radius / maxR);
        const fade = Math.max(0, 1 - prog);
        const blink = 0.7 + 0.3 * Math.sin(now / 40);

        ctx.save();
        ctx.translate(wave.x, wave.y);

        // ── 1. Dense fill ──
        ctx.globalAlpha = fade * 0.20 * blink;
        ctx.fillStyle = 'rgba(100,0,200,1)';
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // ── 2. Lightweight Persian arcs (8 rotating arcs — NO grid loop) ──
        const numArcs = 8;
        const rot = now / 1200;
        ctx.save();
        ctx.rotate(rot);
        for (let i = 0; i < numArcs; i++) {
            const a = (Math.PI * 2 / numArcs) * i;
            const r1 = wave.radius * 0.25, r2 = wave.radius * 0.80;
            ctx.strokeStyle = `rgba(200,80,255,${fade * 0.40 * blink})`;
            ctx.lineWidth = 1.0;
            // Radial spoke
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.stroke();
        }
        // Inner hex (single path, no loop)
        ctx.strokeStyle = `rgba(180,80,255,${fade * 0.50 * blink})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i;
            const r = wave.radius * 0.42;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.stroke();
        // Counter-rotate arc ring
        ctx.rotate(-rot * 1.7);
        ctx.strokeStyle = `rgba(220,130,255,${fade * 0.28})`;
        ctx.lineWidth = 1.0;
        ctx.setLineDash([6, 10]);
        ctx.beginPath(); ctx.arc(0, 0, wave.radius * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // ── 3. Outer halo ──
        ctx.globalAlpha = fade * 0.28 * blink;
        ctx.strokeStyle = 'rgba(180,0,255,1)';
        ctx.lineWidth = 28;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;

        // ── 4. Flying sparks on outer ring ──
        const sparkCount = 10;
        for (let i = 0; i < sparkCount; i++) {
            // Each spark orbits at slightly different speed & radius offset
            const sparkAngle = (Math.PI * 2 / sparkCount) * i + now / (400 + i * 33);
            const rOff = wave.radius + Math.sin(now / 180 + i * 1.3) * 8;
            const sx = Math.cos(sparkAngle) * rOff;
            const sy = Math.sin(sparkAngle) * rOff;
            const sparkFade = fade * blink * (0.6 + 0.4 * Math.sin(now / 120 + i));
            // Spark body
            ctx.shadowColor = '#FF44FF'; ctx.shadowBlur = 10;
            ctx.fillStyle = `rgba(255,180,255,${sparkFade * 0.9})`;
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
            // Spark tail
            const tailAngle = sparkAngle - 0.18;
            ctx.strokeStyle = `rgba(200,100,255,${sparkFade * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(Math.cos(tailAngle) * (rOff - 14), Math.sin(tailAngle) * (rOff - 14));
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // ── 5. Main ring ──
        ctx.strokeStyle = `rgba(138,43,226,${(0.7 + 0.3 * blink) * fade})`;
        ctx.lineWidth = 7;
        ctx.shadowColor = '#CC00FF';
        ctx.shadowBlur = 20 + 12 * blink;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // ── 6. Inner bright edge ──
        if (wave.radius > 12) {
            ctx.strokeStyle = `rgba(255,200,255,${fade * 0.55 * blink})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, wave.radius - 7, 0, Math.PI * 2); ctx.stroke();
        }

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
// ── Vanguard Network energy threads ────────────────────────────────────
function _drawVanguardThreads() {
    const now = performance.now();
    const n = sentinels.length;
    const pulse = 0.4 + 0.3 * Math.sin(now / 400);
    const color = n >= 12 ? '#FFD700' : '#FF00FF';

    ctx.save();
    ctx.globalAlpha = pulse * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    // Connect each sentinel to its 2 nearest neighbours (not all pairs — too dense)
    for (let i = 0; i < n; i++) {
        const a = sentinels[i];
        // Find 2 closest
        const dists = sentinels
            .map((b, j) => ({ j, d: j === i ? Infinity : Math.hypot(a.x - b.x, a.y - b.y) }))
            .sort((x, y) => x.d - y.d)
            .slice(0, 2);
        dists.forEach(({ j, d }) => {
            if (j > i) { // draw each pair once
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(sentinels[j].x, sentinels[j].y);
                ctx.stroke();
            }
        });
    }

    ctx.setLineDash([]);
    ctx.restore();
}

function drawSentinel(sentinel) {
    const { x, y, size, angle, hp, maxHp } = sentinel;
    const now = performance.now();

    let activeCount = sentinels.length;
    let glowColor = '#00FFFF';
    if (activeCount >= 12) glowColor = '#FFD700';
    else if (activeCount >= 5) glowColor = '#FF00FF';

    // ── Iron Body flicker ──────────────────────────────────────────
    const ironActive = sentinel.ironBody && now < sentinel.ironBodyEnd;
    if (ironActive) {
        const flicker = Math.sin(now / 40) > 0; // fast blink ~12Hz
        if (!flicker) {
            // Skip drawing this frame — creates the flicker effect
            // Still draw a bright white outline so position is visible
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
            return;
        }
        glowColor = '#ffffff'; // white glow during iron body
    }

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

    // ── Accurate Parry buff glow ──
    if (alpha === 1 && accurateParryActive && performance.now() < accurateParryEndTime) {
        const parryRemain = (accurateParryEndTime - performance.now()) / 4000;
        const pp = 0.6 + 0.4 * Math.sin(now / 100);
        ctx.strokeStyle = `rgba(255,220,0,${pp * parryRemain})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // ── Hitbox dot — neon cyan chấm sáng tại tâm ──
    if (alpha === 1) {
        const hdPulse = 0.7 + 0.3 * Math.sin(now / 400);
        ctx.fillStyle = `rgba(0,255,255,${0.12 * hdPulse})`;
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(0,255,255,${0.9 * hdPulse})`;
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(0, 0, 0.8, 0, Math.PI * 2); ctx.fill();
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

    // ── NEW: counter-rotating rune marks on body ──
    ctx.save();
    ctx.rotate(-now / 2500);
    ctx.strokeStyle = 'rgba(255,60,60,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        const ra = (i / 4) * Math.PI * 2;
        const rx = Math.cos(ra) * enemy.size * 0.62;
        const ry = Math.sin(ra) * enemy.size * 0.62;
        ctx.beginPath();
        ctx.moveTo(rx - 3, ry - 3); ctx.lineTo(rx + 3, ry + 3);
        ctx.moveTo(rx + 3, ry - 3); ctx.lineTo(rx - 3, ry + 3);
        ctx.stroke();
    }
    ctx.restore();

    // ── NEW: blink flash on Custos shield hit ──
    if (enemy.aegisInvulnerable) {
        const flashPulse = 0.3 + 0.7 * Math.abs(Math.sin(now / 150));
        ctx.strokeStyle = `rgba(255,255,255,${flashPulse})`;
        ctx.lineWidth = 2; ctx.shadowColor = 'white'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, enemy.size * 0.75, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// ── Enemy dispatcher ──────────────────────────────────────────
function drawEnemy(enemy) {
    // ── Thủ Lĩnh Bầy Đàn (Leviathan Envy): white pulsing ring
    if (enemy.levEnvy) {
        const now0 = performance.now();
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(now0 / 400 + enemy.x * 0.01));
        const r0 = (enemy.size / 2) + 8;
        ctx.save();
        ctx.globalAlpha = 1;

        // Outer glow ring
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = `rgba(255,255,255,${0.7 + pulse * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r0, 0, Math.PI * 2);
        ctx.stroke();

        // Spinning dashed inner ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(220,240,255,${0.45 + pulse * 0.2})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(now0 / 1200);
        ctx.beginPath(); ctx.arc(0, 0, r0 - 5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        // 4 corner dots
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 8;
        for (let d = 0; d < 4; d++) {
            const a = (now0 / 2000) + d * Math.PI / 2;
            ctx.beginPath();
            ctx.arc(enemy.x + Math.cos(a) * r0, enemy.y + Math.sin(a) * r0, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

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

    // VULNERABILITY (Trọng Thương) icon
    if (enemy.vulnStacks && enemy.vulnStacks > 0 && enemy.vulnEndTime && performance.now() < enemy.vulnEndTime) {
        _drawVulnerabilityIcon(enemy);
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
    } else if (enemy.type === 'marchosias') {
        _drawMarchosias(enemy);
    } else if (enemy.type === 'marchosias_minion') {
        _drawMarchosiasMinion(enemy);
    } else if (enemy.type === 'leviathan') {
        _drawLeviathan(enemy);
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

    // MARCHOSIAS PARASITE SHIELD bar (green arc shield on host)
    if (enemy.marchosiasParasiteShield && enemy.marchosiasParasiteShield > 0) {
        ctx.save();
        const pR = enemy.size / 2 + 8;
        // rotating dashed ring
        const now3 = performance.now();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(now3 / 900);
        ctx.strokeStyle = 'rgba(0,255,136,0.85)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.arc(0, 0, pR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        // HP label
        ctx.save();
        ctx.fillStyle = '#00ff88'; ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⬡' + Math.ceil(enemy.marchosiasParasiteShield), enemy.x, enemy.y - enemy.size / 2 - 24);
        ctx.restore();
    }

    // MARCHOSIAS counter windup telegraphs (hỗ trợ nhiều windup song song)
    if (enemy.type === 'marchosias' && enemy.marchosiasWindups && enemy.marchosiasWindups.length > 0) {
        const halfW = 36;
        for (const windup of enemy.marchosiasWindups) {
            if (!windup.target) continue;
            ctx.save();
            const tx = windup.target.x, ty = windup.target.y;
            const angle4 = Math.atan2(ty - enemy.y, tx - enemy.x);
            const len4 = Math.hypot(tx - enemy.x, ty - enemy.y) + 80;

            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(angle4);

            // Static warning fill — không pulse, luôn hiển thị rõ
            ctx.fillStyle = 'rgba(255,80,0,0.18)';
            ctx.fillRect(0, -halfW, len4, halfW * 2);

            // Bright static edge lines
            ctx.strokeStyle = 'rgba(255,160,0,0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -halfW); ctx.lineTo(len4, -halfW);
            ctx.moveTo(0, halfW); ctx.lineTo(len4, halfW);
            ctx.stroke();

            // Center dashed line
            ctx.strokeStyle = 'rgba(255,220,80,0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([14, 8]);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len4, 0); ctx.stroke();
            ctx.setLineDash([]);

            // Impact marker at target position
            const markerX = Math.hypot(tx - enemy.x, ty - enemy.y);
            ctx.strokeStyle = 'rgba(255,100,0,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(markerX, -halfW); ctx.lineTo(markerX, halfW);
            ctx.stroke();

            ctx.restore();
        }
    }

    // MARCHOSIAS BLADE PROJECTILES
    // Marchosias blades drawn separately from global marchosiasBlades array

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

    // ── NEW: energy crackle arcs at low HP ──
    if (hpPct < 0.4) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        const crackleCount = Math.floor((1 - hpPct / 0.4) * 4) + 2;
        for (let c = 0; c < crackleCount; c++) {
            const a0 = (now / 180 + c * Math.PI * 2 / crackleCount) % (Math.PI * 2);
            const a1 = a0 + 0.4 + Math.sin(now / 90 + c) * 0.2;
            const cr = r + 8 + Math.sin(now / 120 + c * 1.7) * 4;
            ctx.strokeStyle = `rgba(${isBoss ? '255,80,255' : '255,220,50'},${0.6 + 0.4 * Math.sin(now / 80 + c)})`;
            ctx.lineWidth = 1;
            ctx.shadowColor = color1; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(0, 0, cr, a0, a1); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }
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
    const now = performance.now();
    ctx.save();
    const isLarge = enemy.type === 'enemy_bullet_large';
    const isSmall = enemy.type === 'enemy_bullet_small';

    // ── Pulsing white outline — always cuts through effects ──
    const blink = 0.55 + 0.45 * Math.sin(now / 90); // fast blink
    ctx.strokeStyle = `rgba(255,255,255,${blink})`;
    ctx.lineWidth = isLarge ? 2.5 : 1.8;
    ctx.shadowColor = 'white';
    ctx.shadowBlur = isLarge ? 12 : 8;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size + 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // outer faint corona
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
    // rim stroke
    ctx.strokeStyle = isLarge ? 'rgba(255,150,50,0.7)' : 'rgba(255,60,20,0.7)';
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.stroke();
    if (isLarge) {
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

// ── Marchosias ────────────────────────────────────────────────
function _drawMarchosias(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Outer pulsing aura
    const haloA = 0.12 + 0.06 * Math.sin(now / 350);
    ctx.fillStyle = `rgba(0,255,120,${haloA})`;
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Hexagon body (6-sided like ref image)
    ctx.strokeStyle = '#00cc66'; ctx.lineWidth = 2;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Inner triangle frame (structural lines from center to alternating vertices)
    ctx.strokeStyle = 'rgba(0,200,100,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
    }

    // Rotating gear-teeth ring
    ctx.save();
    ctx.rotate(now / 2500);
    ctx.strokeStyle = 'rgba(0,180,80,0.6)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
        ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
        ctx.stroke();
    }
    ctx.restore();

    // Core gem — green glowing orb
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, '#00ff88');
    coreGrad.addColorStop(1, '#006633');
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Panel detail rectangles (from ref image)
    ctx.strokeStyle = 'rgba(0,220,100,0.4)'; ctx.lineWidth = 1;
    const panelW = r * 0.35, panelH = r * 0.18;
    [[-r * 0.55, 0], [r * 0.55, 0], [0, -r * 0.55], [0, r * 0.55]].forEach(([px, py]) => {
        ctx.strokeRect(px - panelW / 2, py - panelH / 2, panelW, panelH);
    });

    // ── NEW: rage shimmer at low HP ──
    const marHpPct = enemy.hp / enemy.maxHp;
    if (marHpPct < 0.3) {
        ctx.save();
        ctx.translate(0, 0);
        const rageCount = 5;
        const rageAlpha = (0.3 - marHpPct) / 0.3;
        for (let ri = 0; ri < rageCount; ri++) {
            const ra = (now / 300 + ri * Math.PI * 2 / rageCount);
            const rd = r * 0.85 + Math.sin(now / 130 + ri * 1.3) * r * 0.2;
            ctx.fillStyle = `rgba(0,255,140,${rageAlpha * (0.5 + 0.5 * Math.sin(now / 80 + ri))})`;
            ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(Math.cos(ra) * rd, Math.sin(ra) * rd, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();

    // ── ARC SHIELD (¼ circle arc, rotates around Marchosias) ──
    if (enemy.arcShield && enemy.arcShield.hp > 0) {
        const shieldR = r + 16;
        const sa = enemy.arcShield.angle - Math.PI / 4;
        const ea = enemy.arcShield.angle + Math.PI / 4;
        const shieldPct = enemy.arcShield.hp / enemy.arcShield.maxHp;

        ctx.save();
        // Outer glow
        ctx.strokeStyle = `rgba(0,255,136,${0.3 + shieldPct * 0.3})`;
        ctx.lineWidth = 14;
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR, sa, ea); ctx.stroke();

        // Main arc bright
        ctx.strokeStyle = `rgba(160,255,200,${0.7 + shieldPct * 0.25})`;
        ctx.lineWidth = 5;
        ctx.shadowColor = 'white'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR, sa, ea); ctx.stroke();

        // Inner bright edge
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR - 4, sa, ea); ctx.stroke();

        // Sparkling particles at arc tips
        for (let tip = 0; tip < 2; tip++) {
            const tipA = tip === 0 ? sa : ea;
            const tx2 = enemy.x + Math.cos(tipA) * shieldR;
            const ty2 = enemy.y + Math.sin(tipA) * shieldR;
            for (let s = 0; s < 2; s++) {
                const sA = tipA + (s - 0.5) * 0.5 + Math.sin(now / 90 + s) * 0.2;
                const sLen = 5 + 3 * Math.abs(Math.sin(now / 80 + s));
                ctx.strokeStyle = `rgba(180,255,180,${0.6 + 0.4 * Math.sin(now / 70 + s)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tx2, ty2);
                ctx.lineTo(tx2 + Math.cos(sA) * sLen, ty2 + Math.sin(sA) * sLen);
                ctx.stroke();
            }
        }

        // Arc shield HP bar
        const bw = 50, bh = 4;
        const bx = enemy.x - bw / 2, by = enemy.y - r - 30;
        ctx.fillStyle = '#003322'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#00ff88'; ctx.fillRect(bx, by, bw * shieldPct, bh);
        ctx.strokeStyle = '#00cc66'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#00ff88'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('SHIELD', enemy.x, by - 2);

        ctx.restore();
    }

    // HP bar
    const bw2 = enemy.size * 0.9, bh2 = 6;
    const bx2 = enemy.x - bw2 / 2, by2 = enemy.y - r - 12;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx2 - 1, by2 - 1, bw2 + 2, bh2 + 2);
    ctx.fillStyle = '#222'; ctx.fillRect(bx2, by2, bw2, bh2);
    const hpPct = enemy.hp / enemy.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffaa00' : '#ff3300';
    ctx.fillRect(bx2, by2, bw2 * hpPct, bh2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.strokeRect(bx2, by2, bw2, bh2);
}

// ── Marchosias Minion (Robot Mini) ────────────────────────────
// ── Vulnerability Icon (Trọng Thương) ─────────────────────────
// Thiết kế dựa theo HTML reference: trái tim kim loại bị chẻ + dấu X neon đỏ
function _drawVulnerabilityIcon(enemy) {
    const now = performance.now();
    const stacks = enemy.vulnStacks || 0;
    const remaining = Math.max(0, (enemy.vulnEndTime - now) / 3000); // 0..1

    // Icon đặt phía trên enemy, offset sang phải nếu có soulReaver
    const iconX = enemy.soulReaver ? enemy.x + 14 : enemy.x;
    const iconY = enemy.y - (enemy.size || 20) - 28;
    const R = 11; // bán kính icon

    ctx.save();
    ctx.translate(iconX, iconY);

    // Pulse scale nhẹ
    const pulse = 0.97 + 0.03 * Math.sin(now / 200);
    ctx.scale(pulse, pulse);

    // ── Nền tròn tối ──────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,0,3,0.82)';
    ctx.fill();

    // Viền đỏ + glow
    ctx.strokeStyle = '#ff1a40';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#ff1a40'; ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // LED dots top & bottom (từ design)
    for (const [lx, ly] of [[0, -R + 1.5], [0, R - 1.5]]) {
        ctx.fillStyle = '#ff1a40';
        ctx.shadowColor = '#ff1a40'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ── Trái tim bị chẻ đôi (hai nửa lệch nhau) ──────────────
    // Vẽ heart path bằng bezier, clip thành 2 nửa, dịch chúng ra
    const drawHeart = (clipLeft) => {
        ctx.save();
        // Clip nửa trái hoặc phải
        ctx.beginPath();
        if (clipLeft) ctx.rect(-R, -R, R * 0.92, R * 2);
        else ctx.rect(-R * 0.08, -R, R * 1.1, R * 2);
        ctx.clip();

        // Offset lệch nhau
        const ox = clipLeft ? -1.5 : 1.5;
        const oy = clipLeft ? -1 : 1;
        ctx.translate(ox, oy);

        // Heart shape
        const s = 0.45;
        ctx.beginPath();
        ctx.moveTo(0, 2 * s);
        ctx.bezierCurveTo(-8 * s, -2 * s, -10 * s, -8 * s, 0, -8 * s);
        ctx.bezierCurveTo(10 * s, -8 * s, 8 * s, -2 * s, 0, 2 * s);
        ctx.bezierCurveTo(-4 * s, 5 * s, -8 * s, 7 * s, 0, 11 * s);
        ctx.bezierCurveTo(8 * s, 7 * s, 4 * s, 5 * s, 0, 2 * s);
        ctx.closePath();

        // Kim loại tối + ánh đỏ
        const grad = ctx.createRadialGradient(-1, -2, 0, 0, 0, 9 * s);
        grad.addColorStop(0, '#3a2a2e');
        grad.addColorStop(0.5, '#2a1c20');
        grad.addColorStop(1, '#150a0c');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#ff1a40'; ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Mạch điện mờ (circuit lines)
        ctx.strokeStyle = 'rgba(255,26,64,0.25)';
        ctx.lineWidth = 0.5;
        for (let ci = -8; ci <= 8; ci += 4) {
            ctx.beginPath();
            ctx.moveTo(ci * s, -9 * s); ctx.lineTo(ci * s, 11 * s);
            ctx.stroke();
        }

        // Viền sáng đỏ ở mép cắt
        ctx.strokeStyle = clipLeft ? '#ff1a40' : 'rgba(255,100,80,0.6)';
        ctx.lineWidth = clipLeft ? 1.5 : 0.8;
        ctx.shadowColor = '#ff1a40'; ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(0, -9 * s); ctx.lineTo(0, 11 * s);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();
    };

    drawHeart(true);
    drawHeart(false);

    // ── Dấu X neon laser ──────────────────────────────────────
    const xFlare = 0.7 + 0.3 * Math.sin(now / 120);
    ctx.shadowColor = '#ff1a40'; ctx.shadowBlur = 10 * xFlare;

    // Line 1: dài hơn, góc -45°
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    const lg1 = ctx.createLinearGradient(-R * 0.85, 0, R * 0.85, 0);
    lg1.addColorStop(0, 'rgba(255,255,255,0.9)');
    lg1.addColorStop(0.5, '#ff1a40');
    lg1.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.strokeStyle = lg1; ctx.lineWidth = 2.2 * xFlare;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R * 0.85, 0); ctx.lineTo(R * 0.85, 0); ctx.stroke();
    ctx.restore();

    // Line 2: ngắn hơn, góc +45°
    ctx.save();
    ctx.rotate(Math.PI / 4);
    const lg2 = ctx.createLinearGradient(-R * 0.65, 0, R * 0.65, 0);
    lg2.addColorStop(0, 'rgba(255,255,255,0.85)');
    lg2.addColorStop(0.5, '#ff1a40');
    lg2.addColorStop(1, 'rgba(255,255,255,0.85)');
    ctx.strokeStyle = lg2; ctx.lineWidth = 1.7 * xFlare;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R * 0.65, 0); ctx.lineTo(R * 0.65, 0); ctx.stroke();
    ctx.restore();

    ctx.shadowBlur = 0;

    // Tia lửa tại giao điểm X
    for (let si = 0; si < 4; si++) {
        const sa = (now / 300 + si * Math.PI / 2);
        const sd = 3.5 + 2 * Math.abs(Math.sin(now / 80 + si));
        const sparkA = 0.5 + 0.5 * Math.abs(Math.sin(now / 100 + si * 1.3));
        ctx.fillStyle = `rgba(255,${180 + si * 20},${80 + si * 30},${sparkA})`;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sd * 0.4, Math.sin(sa) * sd * 0.4, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Stack indicator + cooldown ring ───────────────────────
    // Cooldown ring (depletes counterclockwise)
    ctx.strokeStyle = `rgba(255,26,64,${0.4 + 0.3 * remaining})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, R + 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
    ctx.stroke();

    // Stack dots dưới icon
    for (let s = 0; s < 3; s++) {
        const filled = s < stacks;
        ctx.beginPath();
        ctx.arc(-4 + s * 4, R + 5, 2, 0, Math.PI * 2);
        ctx.fillStyle = filled ? '#ff1a40' : 'rgba(255,26,64,0.25)';
        if (filled) { ctx.shadowColor = '#ff1a40'; ctx.shadowBlur = 5; }
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

function _drawMarchosiasMinion(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Triangular body (from ref image — image 4 small triangle robots)
    const pulse = 0.8 + 0.2 * Math.sin(now / 200);
    ctx.fillStyle = '#0d1f17';
    ctx.strokeStyle = `rgba(0,200,80,${pulse})`;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.87, r * 0.5);
    ctx.lineTo(-r * 0.87, r * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner glow core
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.38);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.5, '#00ff88');
    cg.addColorStop(1, 'rgba(0,100,50,0.4)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.fill();

    // ── NEW: 3 orbiting micro-dots ──
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(0,255,136,0.9)';
    for (let d = 0; d < 3; d++) {
        const da = (now / 600 + d * Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.arc(Math.cos(da) * r * 0.68, Math.sin(da) * r * 0.68, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.restore();
}

// ── Leviathan — Dominator Class ──────────────────────────────
function _drawLeviathan(enemy) {
    const now = performance.now();
    const cx = enemy.x, cy = enemy.y;
    const r = enemy.size / 2;
    const shieldActive = enemy.afoShieldActive;
    const NUM_WINGS = 9;
    const dying = enemy.dyingLaserPhase;

    ctx.save();
    ctx.translate(cx, cy);

    // ── Wing animation
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
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8 + wingPhase * 6;
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

    // ── Energy vortex (chỉ khi khiên đã vỡ)
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

    // ── Core
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
    ctx.shadowColor = '#9d00ff'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, coreR * beat, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // ── Eye (tracks player)
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
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(0,229,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ex, ey, eR, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // ── All for One shield (unbreakable-shield từ HTML)
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
        ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20;
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
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.fillText(`${kills}/${quota} kills`, 0, sR + 20);
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.shadowBlur = 0;
        ctx.fillText(`${hits}/200 hits`, 0, sR + 36);
    }

    // ── Dying: freeze glow
    if (dying) {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        glow.addColorStop(0, 'rgba(255,100,0,0.5)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

// ── Envy chain effect (drawn on enemies with hasEnvy) ────────
function _drawEnvyChain(enemy) {
    const now = performance.now();
    const r = (enemy.size / 2) + 10;
    const numLinks = 12;
    enemy.envyChainAngle = (enemy.envyChainAngle || 0) + 0.02;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    for (let i = 0; i < numLinks; i++) {
        const a = enemy.envyChainAngle + (Math.PI * 2 / numLinks) * i;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const linkSize = 4;
        const pulse = 0.6 + 0.4 * Math.sin(now / 300 + i);
        ctx.fillStyle = `rgba(220,0,0,${pulse})`;
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 6;
        ctx.fillRect(x - linkSize / 2, y - linkSize / 2, linkSize, linkSize * 0.6);
        // Connect links
        if (i > 0) {
            const pa = enemy.envyChainAngle + (Math.PI * 2 / numLinks) * (i - 1);
            const px = Math.cos(pa) * r, py = Math.sin(pa) * r;
            ctx.strokeStyle = `rgba(180,0,0,${pulse * 0.7})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 3;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}

function _drawMarchoBlade(blade) {
    const now = performance.now();
    ctx.save();
    const angle = blade.active ? Math.atan2(blade.vy, blade.vx) : blade.angle;

    // ── WARNING PHASE: chỉ hiện đường cảnh báo vàng cam ─────────
    if (!blade.active) {
        const pulse = 0.45 + 0.45 * Math.sin(now / 80);
        const warnLen = Math.hypot(canvas.width, canvas.height); // đến tận rìa màn hình
        const halfW = 28; // nửa chiều rộng warning beam

        ctx.translate(blade.originX, blade.originY);
        ctx.rotate(angle);

        // fill mờ
        ctx.fillStyle = `rgba(255,180,0,${pulse * 0.18})`;
        ctx.fillRect(0, -halfW, warnLen, halfW * 2);

        // viền cam sáng
        ctx.strokeStyle = `rgba(255,150,0,${pulse * 0.85})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -halfW); ctx.lineTo(warnLen, -halfW);
        ctx.moveTo(0, halfW); ctx.lineTo(warnLen, halfW);
        ctx.stroke();

        // đường trung tâm nhấp nháy
        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = `rgba(255,220,80,${pulse * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(warnLen, 0); ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
        return;
    }

    // ── ACTIVE PHASE: vẽ blade arc ───────────────────────────────
    const sa = angle - Math.PI / 2, ea = angle + Math.PI / 2;

    // Outer orange-red glow
    ctx.strokeStyle = 'rgba(255,80,0,0.35)';
    ctx.lineWidth = 18;
    ctx.shadowColor = 'rgba(255,120,0,0.6)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius, sa, ea); ctx.stroke();

    // Main orange arc
    ctx.strokeStyle = 'rgba(255,140,30,0.95)';
    ctx.lineWidth = 5;
    ctx.shadowColor = 'white'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius, sa, ea); ctx.stroke();

    // Bright inner edge
    ctx.strokeStyle = 'rgba(255,230,180,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius - 3, sa, ea); ctx.stroke();

    // Energy slash marks
    ctx.strokeStyle = `rgba(255,200,100,${0.5 + 0.4 * Math.sin(now / 60)})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const slashA = sa + (ea - sa) * ((i + 1) / 4);
        const px1 = blade.x + Math.cos(slashA) * (blade.radius - 10);
        const py1 = blade.y + Math.sin(slashA) * (blade.radius - 10);
        const px2 = blade.x + Math.cos(slashA) * (blade.radius + 10);
        const py2 = blade.y + Math.sin(slashA) * (blade.radius + 10);
        ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
    }

    ctx.restore();
}

function _drawNormalEnemy(enemy) {
    const now = performance.now();
    const hpRatio = enemy.hp / enemy.maxHp;
    const hue = 20 + hpRatio * 20;
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

    // ── NEW: slow-spinning inner hex detail ──
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(now / 3500);
    ctx.strokeStyle = `hsla(${hue},100%,75%,0.3)`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const nx = Math.cos(a) * enemy.size * 0.55;
        const ny = Math.sin(a) * enemy.size * 0.55;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(nx, ny); ctx.stroke();
    }
    ctx.restore();

    // ── NEW: tiny pulsing center dot ──
    const cp = 0.7 + 0.3 * Math.sin(now / 250 + enemy.x);
    ctx.fillStyle = `rgba(255,220,150,${cp})`;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 0.12, 0, Math.PI * 2); ctx.fill();

    // glint
    ctx.fillStyle = 'rgba(255,255,220,0.5)';
    ctx.beginPath();
    ctx.ellipse(enemy.x - enemy.size * 0.28, enemy.y - enemy.size * 0.28, enemy.size * 0.22, enemy.size * 0.13, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ── Charge effect ─────────────────────────────────────────────
function drawChargeEffect() {
    const now = performance.now();
    let chargeDuration = now - chargeStartTime;
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

    // screen shake — chỉ giật nhẹ lúc title flash, không giật liên tục
    if (chargeDuration < 250) {
        screenShake = { intensity: 5, duration: 80 };
    }

    // ── TINH VƯƠNG TITLE — flash ở đầu charge ──────────────────
    {
        const titleDur = 1400;
        const textT = chargeDuration < titleDur
            ? Math.min(chargeDuration / 120, 1) * Math.max(0, 1 - (chargeDuration - 120) / (titleDur - 120))
            : 0;
        if (textT > 0.02) {
            if (chargeDuration < 200) screenShake = { intensity: 6, duration: 120 };
            ctx.save();
            ctx.globalAlpha = textT * 0.32;
            ctx.font = 'bold 110px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ff4400';
            ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 50;
            ctx.fillText('星王滅世爆發', player.x, player.y - 85);

            ctx.globalAlpha = textT * 0.95;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffdd00';
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 28;
            ctx.fillText('STAR SOVEREIGN', player.x, player.y - 128);

            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#ffcc44';
            ctx.shadowBlur = 10;
            ctx.fillText('— Tinh Vương: Bộc Viêm Bá —', player.x, player.y - 104);
            ctx.restore();
        }
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    // ── ENERGY VORTEX — xoáy vào player khi đang tụ ────────────
    const spiralCount = 5;
    for (let i = 0; i < spiralCount; i++) {
        const spinDir = i % 2 === 0 ? 1 : -1;
        const spinOffset = now / (500 + i * 80) * spinDir;
        const streamLen = 80 + chargeRatio * 140;
        ctx.beginPath();
        const steps = 20;
        for (let s = steps; s >= 0; s--) {
            const t = s / steps;
            const dist = t * streamLen;
            const angle = (i / spiralCount) * Math.PI * 2 + spinOffset + t * 2.2 * spinDir;
            const px2 = Math.cos(angle) * dist;
            const py2 = Math.sin(angle) * dist;
            s === steps ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        const streamA = (0.25 + chargeRatio * 0.5) * (0.5 + 0.5 * Math.sin(now / 180 + i));
        ctx.strokeStyle = `rgba(${r},${Math.min(g + 40, 255)},${b},${streamA})`;
        ctx.lineWidth = 0.8 + chargeRatio;
        ctx.stroke();
    }

    // ── SHOCKWAVE RINGS lan ra ──────────────────────────────────
    for (let w = 0; w < 3; w++) {
        const phase = ((now / (600 - chargeRatio * 200) + w / 3) % 1);
        const wR = 20 + phase * radius * 2.2;
        const wA = (1 - phase) * 0.4 * chargeRatio;
        ctx.strokeStyle = `rgba(${r},${g},${b},${wA})`;
        ctx.lineWidth = 2 * (1 - phase);
        ctx.beginPath(); ctx.arc(0, 0, wR, 0, Math.PI * 2); ctx.stroke();
    }

    // ── OUTER BLOOM ─────────────────────────────────────────────
    ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
    ctx.lineWidth = 10 + 8 * chargeRatio;
    ctx.shadowColor = color; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2); ctx.stroke();

    // ── MAIN RING ───────────────────────────────────────────────
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + 4 * chargeRatio;
    ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();

    // ── ROTATING TICK MARKS ─────────────────────────────────────
    const ticks = 8;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.rotate(now / 400);
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
    const now = performance.now();
    const laserBeamWidth = 100;
    const allLasers = [{ xOffset: 0 }, ...playerClones];
    allLasers.forEach(clone => {
        const laserX = player.x + clone.xOffset;
        ctx.save();

        const wobble = Math.sin(now / 28 + clone.xOffset / 50) * 9;
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

    // ── EXECUTION TITLE — chỉ hiện 1 giây đầu rồi tắt ──────
    {
        const laserElapsed = now - laserStartTime;
        const fadeIn = Math.min(laserElapsed / 150, 1);
        const fadeOut = Math.max(0, 1 - (laserElapsed - 600) / 400);
        const textT = laserElapsed < 1000 ? fadeIn * fadeOut : 0;

        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.35;
            ctx.font = 'bold 115px serif';
            ctx.fillStyle = '#ff6600';
            ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 50;
            ctx.fillText('開炸斬決', player.x, player.y - 80);

            ctx.globalAlpha = textT * 0.98;
            ctx.font = 'bold 36px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 35;
            ctx.fillText('EXECUTION', player.x, player.y - 124);

            ctx.globalAlpha = textT * 0.98;
            ctx.font = 'italic 14px monospace';
            ctx.fillStyle = '#ffdd88';
            ctx.shadowBlur = 12;
            ctx.fillText('— Khai Triển —', player.x, player.y - 100);
            ctx.restore();
        }
    }
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

    // ── TITLE FLASH khi skill A vừa kích hoạt ────────────────
    {
        const elapsed = now - lastSkillA;
        const textT = Math.min(elapsed / 150, 1) * Math.max(0, 1 - (elapsed - 150) / 1200);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.26;
            ctx.font = 'bold 110px serif';
            ctx.fillStyle = '#00eeff';
            ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 45;
            ctx.fillText('星王天雷爆星', player.x, player.y - 80);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 29px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00ddff'; ctx.shadowBlur = 26;
            ctx.fillText('CELESTIAL THUNDERBURST', player.x, player.y - 122);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#88eeff';
            ctx.shadowBlur = 10;
            ctx.fillText('— Tinh Vương: Thiên Lôi Bộc Tinh —', player.x, player.y - 98);
            ctx.restore();
        }
    }

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
    const age = now - spirit.spawnTime;

    ctx.save();

    // ── TITLE + HEXAGRAM — hiện trên đầu player, chỉ lần đầu ─
    // Chỉ render cho spirit đầu tiên trong mảng để tránh vẽ đè nhiều lần
    if (spirits.length > 0 && spirit === spirits[spirits.length - 1]) {
        const elapsed = now - lastSkillS;
        const textT = Math.min(elapsed / 150, 1) * Math.max(0, 1 - (elapsed - 150) / 1250);
        if (textT > 0.02) {
            const tx = player.x;
            const ty = player.y - 100;

            ctx.save();

            // HEXAGRAM bao quanh player — cùng fade với textT
            {
                const hexR = 55 + 5 * Math.sin(now / 400);
                const rot1 = now / 2200, rot2 = -now / 1800;
                ctx.globalAlpha = textT * 0.65;
                ctx.translate(player.x, player.y);

                // outer dashed circle
                ctx.strokeStyle = 'rgba(255,100,255,0.55)';
                ctx.lineWidth = 1.2; ctx.setLineDash([7, 5]);
                ctx.beginPath(); ctx.arc(0, 0, hexR * 1.3, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);

                // 2 tam giác ngược chiều
                for (let tri = 0; tri < 2; tri++) {
                    const rot = tri === 0 ? rot1 : rot2;
                    ctx.strokeStyle = tri === 0 ? 'rgba(255,80,255,0.85)' : 'rgba(200,0,255,0.7)';
                    ctx.lineWidth = 1.6;
                    ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 10;
                    ctx.beginPath();
                    for (let i = 0; i < 3; i++) {
                        const a = rot + (i / 3) * Math.PI * 2 + (tri === 1 ? Math.PI : 0);
                        i === 0 ? ctx.moveTo(Math.cos(a) * hexR, Math.sin(a) * hexR)
                            : ctx.lineTo(Math.cos(a) * hexR, Math.sin(a) * hexR);
                    }
                    ctx.closePath(); ctx.stroke();
                }

                // 6 điểm sáng đỉnh
                ctx.shadowBlur = 6;
                for (let i = 0; i < 6; i++) {
                    const a = rot1 + (i / 6) * Math.PI * 2;
                    ctx.fillStyle = `rgba(255,180,255,${0.8 + 0.2 * Math.sin(now / 250 + i)})`;
                    ctx.beginPath(); ctx.arc(Math.cos(a) * hexR, Math.sin(a) * hexR, 3, 0, Math.PI * 2); ctx.fill();
                }
                ctx.shadowBlur = 0;
            }

            ctx.restore();
            ctx.save();

            // CHỮ phía trước hexagram
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.24;
            ctx.font = 'bold 85px serif';
            ctx.fillStyle = '#ff44ff';
            ctx.shadowColor = '#cc00cc'; ctx.shadowBlur = 40;
            ctx.fillText('星王召靈審滅', tx, ty - 8);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 22px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 22;
            ctx.fillText('SUMMONED SPIRIT JUDGMENT', tx, ty - 50);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 12px monospace';
            ctx.fillStyle = '#ff88ff';
            ctx.shadowBlur = 8;
            ctx.fillText('— Tinh Vương: Triệu Linh Diệt Phán —', tx, ty - 30);

            ctx.restore();
        }
    }

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

// ── Skill D – Black Hole charging ────────────────────────────
function drawSkillDCharging() {
    const now = performance.now();
    const p = Math.min((now - skillDChargeStartTime) / skillDChargeTime, 1);
    const cx = player.x, cy = player.y;

    ctx.save();

    // 1. GRAVITY RINGS — co lại vào tâm
    for (let ring = 0; ring < 4; ring++) {
        const phase = ((now / (900 - p * 300) + ring / 4) % 1);
        const ringR = 20 + phase * (60 + p * 120);
        const ringA = (1 - phase) * 0.5 * p;
        ctx.strokeStyle = `rgba(120,0,200,${ringA})`;
        ctx.lineWidth = 2.5 * (1 - phase);
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // 2. MATTER STREAMS — phân tử xoáy vào từ xung quanh
    const streamCount = 8;
    for (let i = 0; i < streamCount; i++) {
        const spinDir = i % 2 === 0 ? 1 : -1;
        const baseAngle = (i / streamCount) * Math.PI * 2;
        const spinOffset = now / (600 + i * 50) * spinDir;
        const len = 60 + p * 160;

        ctx.beginPath();
        const steps = 22;
        for (let s = steps; s >= 0; s--) {
            const t = s / steps;
            const dist = t * len;
            const angle = baseAngle + spinOffset + t * 2.5 * spinDir;
            const px2 = cx + Math.cos(angle) * dist;
            const py2 = cy + Math.sin(angle) * dist;
            s === steps ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        const sA = 0.2 + p * 0.6;
        ctx.strokeStyle = i % 2 === 0
            ? `rgba(160,0,255,${sA})`
            : `rgba(80,0,180,${sA * 0.7})`;
        ctx.lineWidth = 0.8 + p * 1.2;
        ctx.stroke();
    }

    // 3. DARK CORE hình thành
    const coreR = 4 + p * 16;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
    coreGrad.addColorStop(0, 'rgba(0,0,0,1)');
    coreGrad.addColorStop(0.4, `rgba(40,0,80,${0.8 * p})`);
    coreGrad.addColorStop(0.8, `rgba(100,0,180,${0.4 * p})`);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(180,80,255,0.8)`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. TITLE — hiện NGAY khi ấn, mờ dần khi gần đầy
    {
        const textT = Math.min(p / 0.15, 1) * Math.max(0, 1 - (p - 0.7) / 0.3);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.28;
            ctx.font = 'bold 110px serif';
            ctx.fillStyle = '#6600cc';
            ctx.shadowColor = '#4400aa'; ctx.shadowBlur = 40;
            ctx.fillText('虛空崩塌', cx, cy - 80);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#cc88ff';
            ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 28;
            ctx.fillText('SINGULARITY', cx, cy - 122);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#bb66ff';
            ctx.shadowBlur = 10;
            ctx.fillText('— Hố Đen Triệu Hoán —', cx, cy - 98);
            ctx.restore();
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

        // ── ANNIHILATION TITLE ───────────────────────────────────
        {
            const textT = Math.min(p / 0.25, 1) * Math.max(0, 1 - (p - 0.6) / 0.4);
            if (textT > 0.02) {
                if (p < 0.05) screenShake = { intensity: 4, duration: 100 };
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.globalAlpha = textT * 0.28;
                ctx.font = 'bold 120px serif';
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00aacc'; ctx.shadowBlur = 40;
                ctx.fillText('殲滅掃射', player.x, player.y - 80);

                ctx.globalAlpha = textT * 0.9;
                ctx.font = 'bold 34px "Arial Black", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'cyan'; ctx.shadowBlur = 24;
                ctx.fillText('ANNIHILATION', player.x, player.y - 120);

                ctx.globalAlpha = textT * 0.9;
                ctx.font = 'italic 13px monospace';
                ctx.fillStyle = '#aaffff';
                ctx.shadowBlur = 8;
                ctx.fillText('— Thiên Ý Trảm —', player.x, player.y - 96);
                ctx.restore();
            }
        }

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

    // ── TITLE FLASH khi G vừa kích hoạt ─────────────────────
    {
        // Detect lần đầu active trong frame này
        if (skillGActive && now - _skillGActivatedAt > 500) {
            // Nếu barrier vừa bật (opacity đang tăng từ 0)
            if (skillGBorderOpacity < 0.15) _skillGActivatedAt = now;
        }
        const activeElapsed = now - _skillGActivatedAt;
        const textT = Math.min(activeElapsed / 150, 1) * Math.max(0, 1 - (activeElapsed - 150) / 1250);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const mx = canvas.width / 2, my = canvas.height / 2 - 60;

            ctx.globalAlpha = textT * 0.26;
            ctx.font = 'bold 110px serif';
            ctx.fillStyle = '#00ffaa';
            ctx.shadowColor = '#00cc88'; ctx.shadowBlur = 45;
            ctx.fillText('星王生命結界', mx, my - 25);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 26;
            ctx.fillText('LIFE DOMAIN', mx, my - 67);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#88ffcc';
            ctx.shadowBlur = 10;
            ctx.fillText('— Tinh Vương: Sinh Mệnh Kết Giới —', mx, my - 43);
            ctx.restore();
        }
    }

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
function drawSkillButton(x, y, key, color, cooldown, lastActivation, activeCondition, chargePercent = -1, r = btnRadius) {
    ctx.save();
    const now = performance.now();
    let isReady = false, remaining = 0;
    const fontSize = Math.max(10, Math.floor(r * 0.75));
    const cdFontSize = Math.max(9, Math.floor(r * 0.65));

    if (chargePercent !== -1) {
        isReady = chargePercent >= 100;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333'; ctx.fill();

        if (chargePercent > 0 && chargePercent < 100) {
            ctx.save();
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.arc(x, y, r, Math.PI / 2, Math.PI / 2 + (2 * Math.PI * (chargePercent / 100)), false);
            ctx.closePath();
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'white'); grad.addColorStop(1, color);
            ctx.fillStyle = grad; ctx.globalAlpha = 0.7; ctx.fill();
            ctx.restore();
        }

        ctx.strokeStyle = isReady ? 'white' : '#666'; ctx.lineWidth = 2; ctx.stroke();

        if (isReady) {
            ctx.save();
            ctx.shadowColor = 'white'; ctx.shadowBlur = 16;
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r + 4 + Math.sin(now / 150) * 2, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        ctx.fillStyle = 'white'; ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(key, x, y);
        if (!isReady) { ctx.font = `bold ${cdFontSize}px Arial`; ctx.fillText(Math.floor(chargePercent) + '%', x, y + 1); }

    } else {
        remaining = Math.max(0, (cooldown - (now - lastActivation)) / 1e3);
        isReady = remaining <= 0 && !activeCondition;

        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333'; ctx.fill();
        ctx.strokeStyle = isReady ? 'white' : '#666'; ctx.lineWidth = 2; ctx.stroke();

        if (remaining > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - remaining * 1e3 / cooldown));
            ctx.closePath(); ctx.fill();
        }

        ctx.fillStyle = 'white'; ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(key, x, y);
        if (remaining > 0) { ctx.font = `bold ${cdFontSize}px Arial`; ctx.fillText(Math.ceil(remaining), x, y + 1); }
    }
    ctx.restore();
}

function drawSkillButtons() {
    const now = performance.now();
    const skillAReady = (now - lastSkillA >= skillACooldown) && skillAOrbs.length < maxSkillAOrbs;

    // ── Layout: 3 hàng × 2 cột ────────────────────────────────
    const r = 20;
    const gap = 7;
    const step = r * 2 + gap;
    const marginL = 16, marginB = 16;

    // Cột
    const col1X = marginL + r;
    const col2X = col1X + step;

    // Hàng (từ dưới lên)
    const row3Y = canvas.height - marginB - r;       // hàng 3 (dưới cùng)
    const row2Y = row3Y - step;                       // hàng 2
    const row1Y = row2Y - step;                       // hàng 1 (trên cùng)

    // Vị trí:
    //  [SH]  [A]
    //  [S]   [D]
    //  [F]   [G]
    const positions = {
        SH: { x: col1X, y: row1Y },
        A: { x: col2X, y: row1Y },
        S: { x: col1X, y: row2Y },
        D: { x: col2X, y: row2Y },
        F: { x: col1X, y: row3Y },
        G: { x: col2X, y: row3Y },
    };

    // ── Nền panel mờ ─────────────────────────────────────────
    ctx.save();
    const padX = 8, padY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(col1X - r - padX, row1Y - r - padY, step + padX * 2, step * 2 + r * 2 + padY * 2, 10);
    ctx.fill();
    ctx.restore();

    // ── Shift ────────────────────────────────────────────────
    ctx.save();
    const { x: shiftX, y: shiftY } = positions.SH;
    let shiftRemaining = Math.max(0, (skillShiftCooldown - (now - lastSkillShift)) / 1000);
    let shiftReady = shiftRemaining <= 0 && !skillShiftActive;

    ctx.beginPath(); ctx.arc(shiftX, shiftY, r, 0, Math.PI * 2);
    ctx.fillStyle = shiftReady ? '#8A2BE2' : '#333'; ctx.fill();
    ctx.strokeStyle = shiftReady ? 'white' : '#666'; ctx.lineWidth = 2; ctx.stroke();

    if (shiftRemaining > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.moveTo(shiftX, shiftY);
        ctx.arc(shiftX, shiftY, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - shiftRemaining * 1000 / skillShiftCooldown));
        ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'white'; ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (skillShiftActive) {
        ctx.fillRect(shiftX - 3, shiftY - 4, 2, 8);
        ctx.fillRect(shiftX + 1, shiftY - 4, 2, 8);
    } else {
        ctx.fillText('SH', shiftX, shiftY);
        if (shiftRemaining > 0) ctx.fillText(Math.ceil(shiftRemaining), shiftX, shiftY + r + 6);
    }
    ctx.restore();

    // ── A, S, D, F, G ────────────────────────────────────────
    drawSkillButton(positions.A.x, positions.A.y, 'A', 'blue', skillACooldown, lastSkillA, !skillAReady, -1, r);
    drawSkillButton(positions.S.x, positions.S.y, 'S', 'green', skillSCooldown, lastSkillS, spirits.length >= MAX_SPIRITS, -1, r);
    drawSkillButton(positions.D.x, positions.D.y, 'D', '#4B0082', skillDCooldown, lastSkillD, skillDCharging || blackHole, -1, r);
    drawSkillButton(positions.F.x, positions.F.y, 'F', 'red', skillFCooldown, lastSkillF, skillFState !== 'ready', -1, r);
    drawSkillButton(positions.G.x, positions.G.y, 'G', '#00BCD4', -1, 0, skillGActive, skillGCharge, r);
}