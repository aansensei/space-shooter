// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/player.js — extracted from render.js (skill-shift arrows, final defense,
// player aura, bullets, drawPlayer, charge/laser effects). Depends on core.js.

function drawSkillShiftEffects() {
    if (!skillShiftActive) return;
    const now = performance.now();
    let chargeDuration = now - skillShiftChargeStart;
    let chargeRatio = Math.min(chargeDuration / skillShiftMaxCharge, 1);
    let maxDist = canvas.width * 0.45;
    let dist = chargeRatio * maxDist;

    let leftX = Math.max(player.width / 2 + 10, player.x - dist);
    let rightX = Math.min(canvas.width - player.width / 2 - 10, player.x + dist);

    // TELEPORT DESTINATION PORTALS (left & right)
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

    // CONNECTOR LINE between portals
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

    // GHOST SHADOWS at destinations
    ctx.save();
    const ghostAlpha = 0.18 + Math.abs(Math.sin(now / 200)) * 0.22;
    ctx.globalAlpha = ghostAlpha;
    drawPlayer(1, leftX - player.x);
    drawPlayer(1, rightX - player.x);
    ctx.restore();

    // CURSED ENERGY PARTICLES streaming along the connector
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

// main draw

function drawFinalDefense() {
    const now = performance.now();
    ctx.save();

    if (playerAbsoluteShield) {
        // gold absolute shield – animated hexagonal segments
        const r = player.width + 12;
        ctx.strokeStyle = '#FFD700';
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.lineWidth = 3.5;
        if (!_mobPerf) ctx.shadowColor = '#FFA500';
        if (!_mobPerf) ctx.shadowBlur = 25;
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
        if (!_mobPerf) ctx.shadowColor = 'white';
        if (!_mobPerf) ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(player.x, player.y, r, 0, Math.PI * 2); ctx.stroke();
        // inner dotted detail ring
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(now / 1200);
        ctx.strokeStyle = 'rgba(100,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r - 5), 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    if (finalDefense.boundaryShield) {
        ctx.fillStyle = 'rgba(0,255,255,0.18)';
        if (!_mobPerf) ctx.shadowColor = 'cyan';
        if (!_mobPerf) ctx.shadowBlur = 20;
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

// Player aura (kill charge)
function drawPlayerAura() {
    const auraLevel = killCountForPassive % 5;
    if (auraLevel === 0) return;
    const maxRadius = player.width * 1.5;
    const progress = auraLevel / 5;
    const radius = maxRadius * progress;
    if (radius <= 0) return;
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
        if (!_mobPerf) ctx.shadowColor = 'yellow'; if (!_mobPerf) ctx.shadowBlur = 8;
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

// Sentinel
// Vanguard Network energy threads

function drawBullet(b) {
    ctx.save();
    // Smoke wisps (HIGH only), faint white puffs, barely visible
    if (_gfxLevel < 1) {
        const _now2 = performance.now();
        for (let t = 1; t <= 2; t++) {
            const drift = Math.sin(_now2 * 0.0018 + b.x * 0.07 + t * 1.6) * b.size * 0.35;
            ctx.globalAlpha = 0.055 / t;
            ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.beginPath();
            ctx.arc(b.x + drift, b.y + b.size * t * 1.4, Math.max(0.5, b.size * 0.22), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    const _bs = _getBulletSprite(b.type || 'player_auto', b.size, _gfxLevel);
    if (b._muiTenVangCrit) {
        const _gp = 0.55 + 0.45 * Math.sin(now / 220);
        ctx.strokeStyle = `rgba(50,255,80,${_gp})`;
        ctx.lineWidth = 2.5;
        if (!_mobPerf) { ctx.shadowColor = '#22ff44'; ctx.shadowBlur = 16; }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 1.6, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.filter = 'hue-rotate(100deg) brightness(1.5) saturate(2)';
    }
    if (b._muiTenVangCrit) {
        const _sc = 1.1;
        ctx.drawImage(_bs, b.x - _bs.width * _sc / 2, b.y - _bs.height * _sc / 2, _bs.width * _sc, _bs.height * _sc);
    } else {
        ctx.drawImage(_bs, b.x - _bs.width / 2, b.y - _bs.height / 2);
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

// Spirit bullets (ALLY – magenta-pink, no shadowBlur)
function drawSpiritBullet(b) {
    ctx.save();
    if (_mobPerf || _gfxLevel >= 1) {
        // Fast path: hình thoi, không gradient, không halo (medium+)
        const _col  = b.isPhoto ? '#2dff73' : '#ff55cc';
        const s = b.size, x = b.x, y = b.y;
        // Inner main diamond
        ctx.fillStyle = _col;
        ctx.beginPath();
        ctx.moveTo(x,   y - s);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x,   y + s);
        ctx.lineTo(x - s, y);
        ctx.closePath(); ctx.fill();
        // Center dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, s * 0.28, 0, Math.PI * 2); ctx.fill();
    } else {
        // Full quality, pre-rendered sprite with additive blending
        ctx.globalCompositeOperation = 'lighter';
        const _ss = _getSpiritSprite(b.isPhoto, b.size);
        ctx.drawImage(_ss, b.x - _ss.width / 2, b.y - _ss.height / 2);
    }
    ctx.restore();
}

// Player ship
function drawPlayer(alpha = 1, xOffset = 0, pos = null) {
    const now = performance.now();
    ctx.save();
    ctx.globalAlpha = alpha;
    if (pos) { ctx.translate(pos.x, pos.y); } else { ctx.translate(player.x + xOffset, player.y); }

    // Empower flash — a quick bright pulse right as the Remembrance Spirit's
    // Blade Arc or Phōtokrystos's boomerang launches, telegraphing "this is
    // the player's own summon attacking" even though the projectile spawns
    // from the spirit's orbit position, not the ship itself. Set by
    // js/skills.js at each launch; reads here off a plain timestamp, no
    // shadowBlur (cheap radial-gradient fill only).
    if (player._empowerFlashEnd && now < player._empowerFlashEnd) {
        const _flashLife = player._empowerFlashEnd - now;
        const _flashT = Math.min(1, _flashLife / 220);
        const _flashG = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
        _flashG.addColorStop(0, `rgba(255,255,255,${0.85 * _flashT})`);
        _flashG.addColorStop(0.4, `rgba(150,220,255,${0.5 * _flashT})`);
        _flashG.addColorStop(1, 'rgba(150,220,255,0)');
        ctx.fillStyle = _flashG;
        ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    }

    // Pulsing visibility beacon — ship outline strobes to stay visible in bullet hell
    const _pulseA = 0.45 + 0.55 * Math.abs(Math.sin(now / 520));
    const _blinkPhase = Math.abs(Math.sin(now / 380));
    ctx.shadowBlur = 18 + 14 * _pulseA;
    ctx.shadowColor = '#00d4ff';
    ctx.strokeStyle = `rgba(0, 210, 255, ${0.45 + 0.55 * _blinkPhase})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(28, 10); ctx.lineTo(26, 16);
    ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.lineTo(-26, 16);
    ctx.lineTo(-28, 10); ctx.closePath();
    ctx.stroke();
    // Second outline pass at peak blink for extra pop
    if (_blinkPhase > 0.75) {
        ctx.strokeStyle = `rgba(180, 240, 255, ${(_blinkPhase - 0.75) * 1.8})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // engine exhaust plume (gradient fill, no blur)
    const exG = ctx.createRadialGradient(0, 30, 0, 0, 38, 22);
    exG.addColorStop(0, 'rgba(0,180,255,0.28)');
    exG.addColorStop(0.5, 'rgba(0,100,200,0.1)');
    exG.addColorStop(1, 'transparent');
    ctx.fillStyle = exG;
    ctx.fillRect(-22, 24, 44, 32);

    //  LAYER 1 – MAIN HULL BASE (dark fuselage)
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

    // hull surface panels (riveted look)
    // left panel
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(-2, 2); ctx.lineTo(-22, 14); ctx.lineTo(-22, 20); ctx.lineTo(-10, 16); ctx.lineTo(-2, 14);
    ctx.closePath(); ctx.fill();
    // right panel
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(22, 14); ctx.lineTo(22, 20); ctx.lineTo(10, 16); ctx.lineTo(2, 14);
    ctx.closePath(); ctx.fill();

    //  LAYER 2 – WINGS
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

    //  LAYER 3 – FUSELAGE / BODY CENTER
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

    //  LAYER 4 – COCKPIT GLASS
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

    //  LAYER 5 – NOSE TIP
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(3, -16); ctx.lineTo(-3, -16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(1.5, -20); ctx.lineTo(0, -18);
    ctx.closePath(); ctx.fill();

    //  LAYER 6 – THRUSTERS
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

    // side micro-boosters
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-13, 18, 3, 5);
    ctx.fillRect(10, 18, 3, 5);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 0.5;
    ctx.strokeRect(-13, 18, 3, 5);
    ctx.strokeRect(10, 18, 3, 5);

    //  LAYER 7 – ENGINE FLAMES (no blur)
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

    // Engine glow bloom (HIGH only)
    if (_gfxLevel < 1) {
        const eGlow = ctx.createRadialGradient(0, 29, 0, 0, 36, 18 + flameH);
        eGlow.addColorStop(0, `rgba(0,220,255,${0.20 + 0.08 * Math.sin(flameT * 2.1)})`);
        eGlow.addColorStop(0.5, 'rgba(0,100,200,0.08)');
        eGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eGlow;
        ctx.fillRect(-18, 24, 36, flameH + 18);
    }

    // micro-booster flames
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

    // Domain purple ally tint on player
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

    // Accurate Parry buff glow
    if (alpha === 1 && accurateParryActive && performance.now() < accurateParryEndTime) {
        const parryRemain = (accurateParryEndTime - performance.now()) / 4000;
        const pp = 0.6 + 0.4 * Math.sin(now / 100);
        ctx.strokeStyle = `rgba(255,220,0,${pp * parryRemain})`;
        ctx.lineWidth = 2.5;
        if (!_mobPerf) ctx.shadowColor = '#ffdd00'; if (!_mobPerf) ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Hitbox dot, neon cyan chấm sáng tại tâm
    if (alpha === 1) {
        const hdPulse = 0.7 + 0.3 * Math.sin(now / 400);
        ctx.fillStyle = `rgba(0,255,255,${0.12 * hdPulse})`;
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(0,255,255,${0.9 * hdPulse})`;
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(0, 0, 0.8, 0, Math.PI * 2); ctx.fill();
    }

    // Silence lock icon, tím đè lên tàu khi bị câm lặng
    if (alpha === 1 && typeof player !== 'undefined' && player._silenced) {
        const lNow = performance.now();
        const lPulse = 0.7 + 0.3 * Math.sin(lNow / 80);
        const remaining = Math.max(0, (player._silenceEnd - lNow) / 1000);
        const fade = Math.min(1, remaining * 4);

        ctx.save();
        ctx.globalAlpha = 0.95 * fade;

        // Lock shackle (arc on top)
        if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 20; }
        ctx.strokeStyle = `rgba(210,0,255,${lPulse})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -5, 10, Math.PI, 0);
        ctx.stroke();

        // Lock body, manual rounded rect (no roundRect for iOS compat)
        const lx = -12, ly = -5, lw = 24, lh = 20, lr = 4;
        ctx.beginPath();
        ctx.moveTo(lx + lr, ly);
        ctx.lineTo(lx + lw - lr, ly);
        ctx.arcTo(lx + lw, ly, lx + lw, ly + lr, lr);
        ctx.lineTo(lx + lw, ly + lh - lr);
        ctx.arcTo(lx + lw, ly + lh, lx + lw - lr, ly + lh, lr);
        ctx.lineTo(lx + lr, ly + lh);
        ctx.arcTo(lx, ly + lh, lx, ly + lh - lr, lr);
        ctx.lineTo(lx, ly + lr);
        ctx.arcTo(lx, ly, lx + lr, ly, lr);
        ctx.closePath();
        const grad = ctx.createLinearGradient(lx, ly, lx, ly + lh);
        grad.addColorStop(0, `rgba(150,0,220,${0.92 * lPulse})`);
        grad.addColorStop(1, `rgba(70,0,140,${0.92 * lPulse})`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = `rgba(230,100,255,${lPulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Keyhole circle
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,200,255,${0.9 * lPulse})`;
        ctx.beginPath();
        ctx.arc(0, 2, 4, 0, Math.PI * 2);
        ctx.fill();
        // Keyhole slot
        ctx.fillStyle = `rgba(70,0,140,${lPulse})`;
        ctx.fillRect(-2, 2, 4, 7);

        ctx.restore();
    }

    // Null Slash slow, purple ring + falling particles
    if (alpha === 1 && typeof player !== 'undefined' && player._nullSlashSlowed) {
        const nsNow = performance.now();
        const nsRemaining = Math.max(0, (player._nullSlashSlowEnd - nsNow) / 1000);
        if (nsRemaining <= 0) {
            player._nullSlashSlowed = false;
            player._nsSlowParticles = [];
        } else {
            const nsFade = Math.min(1, nsRemaining * 3);
            const nsPulse = 0.6 + 0.4 * Math.sin(nsNow / 90);
            const _pDt = player._nsSlowLastDraw ? Math.min(50, nsNow - player._nsSlowLastDraw) : 16;
            player._nsSlowLastDraw = nsNow;

            ctx.save();

            // Spawn falling particles every ~70ms
            if (!player._nsSlowParticles) player._nsSlowParticles = [];
            if ((player._nsSlowLastSpawn || 0) + 70 < nsNow) {
                player._nsSlowLastSpawn = nsNow;
                for (let _pi = 0; _pi < 2; _pi++) {
                    const _a = Math.random() * Math.PI * 2;
                    const _r = 26 + Math.random() * 18;
                    player._nsSlowParticles.push({
                        x: Math.cos(_a) * _r, y: Math.sin(_a) * _r,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: 0.6 + Math.random() * 1.1,
                        life: 500 + Math.random() * 500, maxLife: 1000,
                        sz: 1.5 + Math.random() * 2,
                    });
                }
            }

            // Update + draw particles
            if (!_mobPerf) { ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 7; }
            player._nsSlowParticles = player._nsSlowParticles.filter(p => {
                p.life -= _pDt;
                if (p.life <= 0) return false;
                p.x += p.vx * (_pDt / 16);
                p.y += p.vy * (_pDt / 16);
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * nsFade;
                ctx.fillStyle = '#cc44ff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
                ctx.fill();
                return true;
            });
            ctx.shadowBlur = 0;

            ctx.globalAlpha = nsFade;

            // Outer glow ring
            if (!_mobPerf) { ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 22; }
            ctx.strokeStyle = `rgba(140,40,255,${0.38 * nsPulse})`;
            ctx.lineWidth = 9;
            ctx.beginPath();
            ctx.arc(0, 0, 47, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Inner dashed ring
            ctx.strokeStyle = `rgba(190,80,255,${nsPulse})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 5]);
            ctx.lineDashOffset = -(nsNow / 80) % 13;
            ctx.beginPath();
            ctx.arc(0, 0, 38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0;

            // ▼ slow icon
            ctx.fillStyle = `rgba(200,100,255,${0.9 * nsPulse})`;
            ctx.beginPath();
            ctx.moveTo(0, -8); ctx.lineTo(6, -2); ctx.lineTo(3, -2);
            ctx.lineTo(3, 6); ctx.lineTo(-3, 6); ctx.lineTo(-3, -2);
            ctx.lineTo(-6, -2); ctx.closePath(); ctx.fill();

            ctx.restore();
        }
    }

    ctx.restore();
}

// Star orbs for the Overload Laser charge-up: gathering stars that drift
// in, then get pulled toward the player as the charge builds. One orb per
// activation is the "Tinh Vương" rainbow star (cycles through all 7 hues)
// — the rest are single-hue. Respawned once per charge activation, keyed
// off chargeStartTime so a fresh charge never inherits stragglers from a
// previous (possibly cancelled) one.
let _laserChargeStars = [];
let _laserChargeStarsSpawnedAt = 0;

// Pre-baked white glow sprite, reused via drawImage for every star instead
// of a per-star ctx.shadowBlur fill. shadowBlur cost scales with blur
// radius² per call and is one of the most expensive Canvas2D ops on mobile
// — baking it once into a bitmap and blitting it is nearly free by
// comparison, however many stars are on screen at once.
let _starGlowSprite = null;
function _getStarGlowSprite() {
    if (_starGlowSprite) return _starGlowSprite;
    const d = 48;
    const c = document.createElement('canvas');
    c.width = c.height = d;
    const cx = c.getContext('2d');
    const g = cx.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
    g.addColorStop(0,   'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(d / 2, d / 2, d / 2, 0, Math.PI * 2); cx.fill();
    _starGlowSprite = c;
    return c;
}

function _drawSparkleStar(x, y, size, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    const glow = _getStarGlowSprite();
    const gd = size * 7;
    ctx.drawImage(glow, -gd / 2, -gd / 2, gd, gd);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size * 2.2);
    ctx.quadraticCurveTo(size * 0.4, -size * 0.4, size * 2.2, 0);
    ctx.quadraticCurveTo(size * 0.4, size * 0.4, 0, size * 2.2);
    ctx.quadraticCurveTo(-size * 0.4, size * 0.4, -size * 2.2, 0);
    ctx.quadraticCurveTo(-size * 0.4, -size * 0.4, 0, -size * 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawChargeEffect() {
    const now = performance.now();
    let chargeDuration = now - chargeStartTime;
    let chargeRatio = Math.min(chargeDuration / overloadChargeTime, 1);
    let radius = player.width / 2 + chargeRatio * player.width * 2;
    const _gfx = window._gfxLevel || 0;

    // Spawn stars fresh exactly once per charge activation. Counts are
    // higher than before — switching to a pre-baked glow sprite (see
    // _getStarGlowSprite) instead of per-star ctx.shadowBlur removed the
    // single most expensive part of drawing each star, so more of them can
    // be on screen for the same cost as fewer used to be.
    if (_laserChargeStarsSpawnedAt !== chargeStartTime) {
        _laserChargeStarsSpawnedAt = chargeStartTime;
        _laserChargeStars.length = 0;
        const starCount = _gfx < 1 ? 26 : _gfx < 2 ? 14 : 6;
        for (let i = 0; i < starCount; i++) {
            _laserChargeStars.push({
                angle: Math.random() * Math.PI * 2,
                dist: 140 + Math.random() * 260,
                delay: Math.random() * 500,
                hue: Math.random() * 360,
                isSovereign: i === 0,
                px: 0, py: 0, hasPrev: false, // previous position, for the trail streak
            });
        }
    }

    // Constellation lines: connect each star to its single nearest
    // neighbor only (one stroke per star, not one per pair) so the cluster
    // reads as a loose star-chart instead of a plain scatter. The nearest-
    // neighbor search itself is a cheap all-pairs distance comparison —
    // negligible at these star counts (≤26) since it's plain arithmetic,
    // not draw calls; the draw cost stays at one line per star either way.
    const drawLines = _gfx < 2 && _laserChargeStars.length > 1;
    if (drawLines) {
        ctx.save();
        ctx.strokeStyle = 'rgba(160,220,255,0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < _laserChargeStars.length; i++) {
            const a = _laserChargeStars[i];
            let best = -1, bestD = Infinity;
            for (let j = 0; j < _laserChargeStars.length; j++) {
                if (i === j) continue;
                const b = _laserChargeStars[j];
                const dd = (a.angle - b.angle) * (a.angle - b.angle) * 10000 + (a.dist - b.dist) * (a.dist - b.dist);
                if (dd < bestD) { bestD = dd; best = j; }
            }
            if (best < 0) continue;
            const b = _laserChargeStars[best];
            const ax = player.x + Math.cos(a.angle) * a.dist, ay = player.y + Math.sin(a.angle) * a.dist;
            const bx = player.x + Math.cos(b.angle) * b.dist, by = player.y + Math.sin(b.angle) * b.dist;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
        ctx.restore();
    }

    // Update + draw the gathering stars, pulling in once each one's delay
    // has passed (the "delay 1 chút rồi mới bị hút lại" beat), each
    // trailing a short fading streak from its previous frame's position.
    for (let i = _laserChargeStars.length - 1; i >= 0; i--) {
        const st = _laserChargeStars[i];
        if (chargeDuration > st.delay) {
            st.dist -= 2 + chargeRatio * 7;
        }
        if (st.dist < 6) { _laserChargeStars.splice(i, 1); continue; }
        const sx = player.x + Math.cos(st.angle) * st.dist;
        const sy = player.y + Math.sin(st.angle) * st.dist;
        const twinkle = 0.55 + 0.45 * Math.sin(now / 140 + i * 1.7);

        if (st.hasPrev) {
            ctx.save();
            ctx.strokeStyle = st.isSovereign ? 'rgba(255,255,255,0.35)' : `hsla(${st.hue},75%,72%,0.25)`;
            ctx.lineWidth = st.isSovereign ? 2 : 1;
            ctx.beginPath(); ctx.moveTo(st.px, st.py); ctx.lineTo(sx, sy); ctx.stroke();
            ctx.restore();
        }
        st.px = sx; st.py = sy; st.hasPrev = true;

        if (st.isSovereign) {
            const hue = (now / 5) % 360;
            _drawSparkleStar(sx, sy, 6.5, `hsl(${hue},100%,65%)`, twinkle);
        } else {
            _drawSparkleStar(sx, sy, 3, `hsl(${st.hue},75%,72%)`, twinkle * 0.8);
        }

        // Lightning arcs from the closest few gathering stars straight to
        // the player — cheap (reuses the existing jagged-bolt helpers from
        // fx.js) but reads as raw power arcing in, which the smooth star
        // motion alone didn't sell.
        if (_gfx < 2 && st.dist < 200 && Math.random() < 0.12 * chargeRatio) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.random() * 0.3;
            ctx.strokeStyle = st.isSovereign ? 'rgba(255,255,255,0.9)' : `hsla(${st.hue},90%,80%,0.8)`;
            ctx.lineWidth = st.isSovereign ? 2 : 1;
            if (typeof _genBoltPoints === 'function' && typeof _strokeBoltPath === 'function') {
                _strokeBoltPath(ctx, _genBoltPoints(sx, sy, player.x, player.y, 5, 14));
            } else {
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(player.x, player.y); ctx.stroke();
            }
            ctx.restore();
        }
    }

    // Energy column preview — a thin vertical beam builds up at the
    // player's position as charge nears completion, foreshadowing the
    // laser about to fire instead of the charge and the shot feeling like
    // two disconnected effects.
    if (chargeRatio > 0.5) {
        const colT = (chargeRatio - 0.5) / 0.5;
        ctx.save();
        const colW = 6 + colT * 26;
        const colGrad = ctx.createLinearGradient(player.x - colW / 2, 0, player.x + colW / 2, 0);
        colGrad.addColorStop(0, 'rgba(0,255,255,0)');
        colGrad.addColorStop(0.5, `rgba(255,255,255,${colT * 0.5})`);
        colGrad.addColorStop(1, 'rgba(0,255,255,0)');
        ctx.fillStyle = colGrad;
        if (!_mobPerf) { ctx.shadowColor = 'cyan'; ctx.shadowBlur = 20 * colT; }
        ctx.fillRect(player.x - colW / 2, 0, colW, player.y);
        ctx.restore();
    }

    let r = 0, g = 255, b = 255;
    if (chargeDuration > maxChargeTime) {
        let over = (chargeDuration - maxChargeTime) / (overloadChargeTime - maxChargeTime);
        r = Math.floor(255 * over);
        g = 255 - Math.floor(200 * over);
        b = Math.floor(255 * (1 - over * 0.8));
    }
    const color = `rgba(${r},${g},${b},0.85)`;

    // screen shake, chỉ giật nhẹ lúc title flash, không giật liên tục
    if (chargeDuration < 250) {
        _setShake(5, 80);
    }

    // TINH VƯƠNG TITLE, flash ở đầu charge
    {
        const titleDur = 1400;
        const textT = chargeDuration < titleDur
            ? Math.min(chargeDuration / 120, 1) * Math.max(0, 1 - (chargeDuration - 120) / (titleDur - 120))
            : 0;
        if (textT > 0.02) {
            if (chargeDuration < 200) _setShake(6, 120);
            ctx.save();
            ctx.globalAlpha = textT * 0.32;
            ctx.font = 'bold 110px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ff4400';
            if (!_mobPerf) ctx.shadowColor = '#ff2200'; if (!_mobPerf) ctx.shadowBlur = 50;
            ctx.fillText('星王滅世爆發', player.x, player.y - 85);

            ctx.globalAlpha = textT * 0.95;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffdd00';
            if (!_mobPerf) ctx.shadowColor = '#ff8800'; if (!_mobPerf) ctx.shadowBlur = 28;
            ctx.fillText('STAR SOVEREIGN', player.x, player.y - 128);

            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#ffcc44';
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.fillText('— Tinh Vương: Bộc Viêm Bá —', player.x, player.y - 104);
            ctx.restore();
        }
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    // ENERGY VORTEX, xoáy vào player khi đang tụ
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

    // SHOCKWAVE RINGS lan ra
    for (let w = 0; w < 3; w++) {
        const phase = ((now / (600 - chargeRatio * 200) + w / 3) % 1);
        const wR = 20 + phase * radius * 2.2;
        const wA = (1 - phase) * 0.4 * chargeRatio;
        ctx.strokeStyle = `rgba(${r},${g},${b},${wA})`;
        ctx.lineWidth = 2 * (1 - phase);
        ctx.beginPath(); ctx.arc(0, 0, wR, 0, Math.PI * 2); ctx.stroke();
    }

    // OUTER BLOOM
    ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
    ctx.lineWidth = 10 + 8 * chargeRatio;
    if (!_mobPerf || _gfxLevel === 0) ctx.shadowColor = color;
    if (!_mobPerf || _gfxLevel === 0) ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2); ctx.stroke();

    // MAIN RING
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + 4 * chargeRatio;
    if (!_mobPerf || _gfxLevel === 0) ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();

    // ROTATING TICK MARKS
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

// Charge meter bar
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

// Wavy-edged beam path (flame-like organic silhouette instead of a plain
// rectangle) — same left/right offset function reused at several widths to
// build the layered beam below.
function _laserBeamPath(cx, cw, topY, botY, waveAmp, phase) {
    const segs = 18;
    const freq = 0.012;
    ctx.beginPath();
    for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const y = topY + (botY - topY) * t;
        const wob = Math.sin(y * freq + phase) * waveAmp;
        const x = cx - cw / 2 + wob;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let s = segs; s >= 0; s--) {
        const t = s / segs;
        const y = topY + (botY - topY) * t;
        const wob = Math.sin(y * freq + phase + 1.7) * waveAmp;
        const x = cx + cw / 2 + wob;
        ctx.lineTo(x, y);
    }
    ctx.closePath();
}

// Overload laser
function drawLaser() {
    const now = performance.now();
    const laserBeamWidth = 100;
    const _gfx = window._gfxLevel || 0;
    const allLasers = [{ xOffset: 0 }, ...playerClones];
    allLasers.forEach(clone => {
        const laserX = player.x + clone.xOffset;
        ctx.save();

        const wobble = Math.sin(now / 28 + clone.xOffset / 50) * 9;
        const cw = laserBeamWidth + wobble;
        const cx = laserX;
        const wavePhase = now / 220 + clone.xOffset;

        // outer glow — wide, soft, wavy
        _laserBeamPath(cx, cw + 40, 0, player.y, 14, wavePhase);
        const glow = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
        glow.addColorStop(0, "rgba(0,255,255,0)");
        glow.addColorStop(0.5, "rgba(0,200,255,0.2)");
        glow.addColorStop(1, "rgba(0,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fill();

        // violet mid layer — extra ring so the beam has a visible step in
        // tone instead of one smooth gradient (same trick used on Skill F).
        _laserBeamPath(cx, cw * 0.8, 0, player.y, 11, wavePhase + 0.6);
        ctx.fillStyle = 'rgba(130,90,255,0.28)';
        if (!_mobPerf || _gfxLevel === 0) { ctx.shadowColor = '#8a5aff'; ctx.shadowBlur = 20; }
        ctx.fill();
        ctx.shadowBlur = 0;

        // main beam — gradient alpha jitters a little every frame instead of
        // holding one static value, so the cross-section doesn't read as a
        // fixed, painted-on gloss highlight (the biggest source of the
        // "plastic tube" look).
        _laserBeamPath(cx, cw, 0, player.y, 8, wavePhase);
        const _flicker = 0.85 + Math.random() * 0.15;
        let grad = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
        grad.addColorStop(0, "rgba(0,255,255,0)");
        grad.addColorStop(0.1, `rgba(0,220,255,${0.55 * _flicker})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${0.95 * _flicker})`);
        grad.addColorStop(0.9, `rgba(0,220,255,${0.55 * _flicker})`);
        grad.addColorStop(1, "rgba(0,255,255,0)");
        ctx.fillStyle = grad;
        if (!_mobPerf || _gfxLevel === 0) ctx.shadowColor = 'cyan';
        if (!_mobPerf || _gfxLevel === 0) ctx.shadowBlur = 35;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(180,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();

        // core streak — jitters in width/position/alpha every frame instead
        // of sitting as one static straight bar (previously the single
        // biggest "specular highlight on a plastic rod" cue). Reads as
        // unstable plasma instead of a solid painted line.
        {
            const jx = laserX + (Math.random() - 0.5) * 6;
            const jw = 5 + Math.random() * 6;
            ctx.fillStyle = `rgba(255,255,255,${0.45 + Math.random() * 0.3})`;
            if (!_mobPerf || _gfxLevel === 0) ctx.shadowBlur = 15;
            ctx.fillRect(jx - jw / 2, 0, jw, player.y);
            ctx.shadowBlur = 0;
        }

        // crackle lines — a few short jagged streaks flickering across the
        // beam width at random heights and lifetimes, breaking up the
        // smooth tube silhouette with visible energy instability.
        if (_gfx < 2) {
            const crackleCount = _gfx < 1 ? 3 : 1;
            ctx.strokeStyle = 'rgba(220,255,255,0.55)';
            ctx.lineWidth = 1;
            for (let i = 0; i < crackleCount; i++) {
                if (Math.random() < 0.35) continue; // flicker: not every frame
                const cy2 = Math.random() * player.y;
                const half = cw / 2;
                ctx.beginPath();
                ctx.moveTo(cx - half + Math.random() * 4, cy2);
                ctx.lineTo(cx + (Math.random() - 0.5) * cw * 0.6, cy2 + (Math.random() - 0.5) * 14);
                ctx.lineTo(cx + half - Math.random() * 4, cy2 + (Math.random() - 0.5) * 10);
                ctx.stroke();
            }
        }

        // traveling energy pulses — bright bands flowing from the player up
        // the beam, synced to the actual damage-tick cadence (laserTickInterval)
        // so each visible pulse lines up with one real damage tick.
        {
            const pulseCount = _gfx < 1 ? 3 : _gfx < 2 ? 2 : 1;
            for (let i = 0; i < pulseCount; i++) {
                const cyclePos = (((now - laserStartTime) + i * laserTickInterval / pulseCount) % laserTickInterval) / laserTickInterval;
                const py = player.y * (1 - cyclePos);
                const pulseA = Math.sin(cyclePos * Math.PI) * 0.5;
                ctx.fillStyle = `rgba(255,255,255,${pulseA})`;
                if (!_mobPerf) { ctx.shadowColor = 'white'; ctx.shadowBlur = 18; }
                ctx.fillRect(cx - cw / 2 - 6, py - 6, cw + 12, 12);
                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();

        // particles
        if (Math.random() < 0.55) {
            const _lp = _acquireParticle();
            _lp.x = laserX + (Math.random() - 0.5) * cw; _lp.y = player.y;
            _lp.vx = (Math.random() - 0.5) * 5; _lp.vy = -Math.random() * 12 - 6;
            _lp.lifetime = 280; _lp.maxLifetime = 280;
            _lp.size = Math.random() * 3.5 + 1;
            _lp.color = `rgba(${Math.floor(150 + Math.random() * 105)},255,255,0.8)`;
            particles.push(_lp);
        }
    });

    // PULL VISUALIZATION — faint curved streaks drawn from nearby enemies
    // toward the beam, making the laser's existing enemy-pull mechanic
    // actually visible instead of an invisible gameplay-only force.
    if (_gfx < 2 && typeof enemies !== 'undefined') {
        const pullRange = 260;
        ctx.save();
        for (const enemy of enemies) {
            const dx = player.x - enemy.x;
            if (Math.abs(dx) > pullRange) continue;
            const dy = enemy.y - Math.min(enemy.y, player.y);
            const dist = Math.hypot(dx, dy);
            if (dist > pullRange || dist < 4) continue;
            const midX = enemy.x + dx * 0.5 + Math.sin(now / 160 + enemy.x) * 12;
            const midY = enemy.y + dy * 0.5;
            const a = (1 - dist / pullRange) * 0.35;
            ctx.strokeStyle = `rgba(120,220,255,${a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.quadraticCurveTo(midX, midY, player.x, enemy.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // EXECUTION TITLE, chỉ hiện 1 giây đầu rồi tắt
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
            if (!_mobPerf || _gfxLevel === 0) ctx.shadowColor = '#ffaa00';
            if (!_mobPerf || _gfxLevel === 0) ctx.shadowBlur = 50;
            ctx.fillText('開炸斬決', player.x, player.y - 80);

            ctx.globalAlpha = textT * 0.98;
            ctx.font = 'bold 36px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            if (!_mobPerf || _gfxLevel === 0) ctx.shadowColor = '#ffcc00';
            if (!_mobPerf || _gfxLevel === 0) ctx.shadowBlur = 35;
            ctx.fillText('EXECUTION', player.x, player.y - 124);

            ctx.globalAlpha = textT * 0.98;
            ctx.font = 'italic 14px monospace';
            ctx.fillStyle = '#ffdd88';
            if (!_mobPerf || _gfxLevel === 0) ctx.shadowBlur = 12;
            ctx.fillText('— Khai Triển —', player.x, player.y - 100);
            ctx.restore();
        }
    }
}

function drawMirrorLaserEntities() {
    const now = performance.now();
    for (const ent of window._mirrorLaserEntities) {
        const ex = ent.side === 'left' ? 0 : canvas.width;
        const ey = ent.y;
        const wobble = Math.sin(now / 32 + ey / 60) * 7;
        const bw = 90 + wobble;

        ctx.save();

        // horizontal beam spanning full canvas width
        const hGlow = ctx.createLinearGradient(0, ey - bw / 2, 0, ey + bw / 2);
        hGlow.addColorStop(0, 'rgba(0,255,128,0)');
        hGlow.addColorStop(0.5, 'rgba(0,220,160,0.18)');
        hGlow.addColorStop(1, 'rgba(0,255,128,0)');
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, ey - bw / 2 - 18, canvas.width, bw + 36);

        const hBeam = ctx.createLinearGradient(0, ey - bw / 2, 0, ey + bw / 2);
        hBeam.addColorStop(0, 'rgba(0,255,128,0)');
        hBeam.addColorStop(0.12, 'rgba(0,200,120,0.55)');
        hBeam.addColorStop(0.5, 'rgba(180,255,200,0.92)');
        hBeam.addColorStop(0.88, 'rgba(0,200,120,0.55)');
        hBeam.addColorStop(1, 'rgba(0,255,128,0)');
        ctx.fillStyle = hBeam;
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 28; }
        ctx.fillRect(0, ey - bw / 2, canvas.width, bw);

        ctx.fillStyle = 'rgba(200,255,220,0.6)';
        if (!_mobPerf) ctx.shadowBlur = 12;
        ctx.fillRect(0, ey - 3, canvas.width, 6);

        // entity orb
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 22; }
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(ex, ey, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,255,220,0.9)';
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (Math.random() < 0.35) {
            const _mlp = _acquireParticle();
            _mlp.x = Math.random() * canvas.width;
            _mlp.y = ey + (Math.random() - 0.5) * bw;
            _mlp.vx = (Math.random() - 0.5) * 4;
            _mlp.vy = (Math.random() - 0.5) * 4;
            _mlp.lifetime = 220; _mlp.maxLifetime = 220;
            _mlp.size = Math.random() * 2.5 + 1;
            _mlp.color = `rgba(0,${Math.floor(180 + Math.random() * 75)},${Math.floor(80 + Math.random() * 80)},0.8)`;
            particles.push(_mlp);
        }
    }
}

// Mirror Laser bonus proc column (Gemini buff 2): green-purple gradient,
// vertical, no pull, piercing.
function drawMirrorLaserColumns() {
    if (!window._mirrorLaserColumns || window._mirrorLaserColumns.length === 0) return;
    const now = performance.now();
    for (const col of window._mirrorLaserColumns) {
        const lx = player.x;
        const baseW = 90;
        const topY = 0, botY = player.y;
        const segCount = 14;

        // Precompute a wavering centerline + width per segment so the beam
        // reads as a living plasma column instead of a static rectangle.
        const segX = [], segW = [];
        for (let i = 0; i <= segCount; i++) {
            const t = i / segCount;
            const y = topY + (botY - topY) * t;
            const wob = Math.sin(now / 90 + t * 9) * 10 + Math.sin(now / 150 + t * 4) * 6;
            segX.push(lx + wob);
            segW.push(baseW * (0.75 + 0.25 * Math.sin(now / 130 + t * 6)));
        }

        ctx.save();

        // outer soft glow following the wavering centerline
        ctx.beginPath();
        for (let i = 0; i <= segCount; i++) {
            const y = topY + (botY - topY) * (i / segCount);
            const x = segX[i] - segW[i] / 2 - 16;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = segCount; i >= 0; i--) {
            const y = topY + (botY - topY) * (i / segCount);
            ctx.lineTo(segX[i] + segW[i] / 2 + 16, y);
        }
        ctx.closePath();
        const glow = ctx.createLinearGradient(lx - baseW, 0, lx + baseW, 0);
        glow.addColorStop(0, 'rgba(80,255,120,0)');
        glow.addColorStop(0.5, `rgba(160,80,255,${0.20 + 0.08 * Math.sin(now / 100)})`);
        glow.addColorStop(1, 'rgba(80,255,120,0)');
        ctx.fillStyle = glow;
        ctx.fill();

        // main plasma body, color-cycling green->purple along its length
        ctx.beginPath();
        for (let i = 0; i <= segCount; i++) {
            const y = topY + (botY - topY) * (i / segCount);
            const x = segX[i] - segW[i] / 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = segCount; i >= 0; i--) {
            const y = topY + (botY - topY) * (i / segCount);
            ctx.lineTo(segX[i] + segW[i] / 2, y);
        }
        ctx.closePath();
        const beam = ctx.createLinearGradient(lx - baseW / 2, 0, lx + baseW / 2, 0);
        beam.addColorStop(0, 'rgba(60,255,140,0)');
        beam.addColorStop(0.15, 'rgba(80,220,120,0.60)');
        beam.addColorStop(0.5, 'rgba(210,180,255,0.95)');
        beam.addColorStop(0.85, 'rgba(160,80,220,0.60)');
        beam.addColorStop(1, 'rgba(80,60,200,0)');
        ctx.fillStyle = beam;
        if (!_mobPerf) { ctx.shadowColor = '#8a4dff'; ctx.shadowBlur = 30; }
        ctx.fill();

        // white-hot flickering core line, following the same wavering path
        ctx.beginPath();
        for (let i = 0; i <= segCount; i++) {
            const y = topY + (botY - topY) * (i / segCount);
            const jitter = Math.sin(now / 40 + i * 1.3) * 2;
            const x = segX[i] + jitter - 3;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = segCount; i >= 0; i--) {
            const y = topY + (botY - topY) * (i / segCount);
            const jitter = Math.sin(now / 40 + i * 1.3) * 2;
            ctx.lineTo(segX[i] + jitter + 3, y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(230,255,235,${0.55 + 0.35 * Math.sin(now / 55)})`;
        if (!_mobPerf) ctx.shadowBlur = 16;
        ctx.fill();

        // crackling lightning-arc branches shooting off the beam
        ctx.strokeStyle = 'rgba(200,255,210,0.7)';
        ctx.lineWidth = 1.4;
        if (!_mobPerf) { ctx.shadowColor = '#aef7c0'; ctx.shadowBlur = 8; }
        for (let b = 0; b < 3; b++) {
            const bt = ((now / 260 + b * 0.37) % 1);
            const bi = Math.floor(bt * segCount);
            const by = topY + (botY - topY) * bt;
            const bx = segX[bi] || lx;
            const dir = b % 2 === 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            let cx = bx, cy = by;
            for (let seg = 0; seg < 3; seg++) {
                cx += dir * (14 + Math.random() * 10);
                cy += (Math.random() - 0.5) * 14;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }

        // rotating energy ring at the emission point (player position)
        ctx.save();
        ctx.translate(lx, botY);
        ctx.rotate(now / 260);
        ctx.strokeStyle = 'rgba(210,180,255,0.8)';
        ctx.lineWidth = 2.5;
        if (!_mobPerf) { ctx.shadowColor = '#8a4dff'; ctx.shadowBlur = 14; }
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
        const ringPulse = 0.5 + 0.5 * Math.sin(now / 90);
        ctx.fillStyle = `rgba(180,255,200,${0.5 * ringPulse})`;
        ctx.beginPath();
        ctx.arc(lx, botY, 10 + 3 * ringPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (Math.random() < 0.5) {
            const _p = _acquireParticle();
            const sparkT = Math.random();
            const sparkI = Math.floor(sparkT * segCount);
            _p.x = (segX[sparkI] || lx) + (Math.random() - 0.5) * baseW;
            _p.y = botY * sparkT;
            _p.vx = (Math.random() - 0.5) * 4;
            _p.vy = (Math.random() - 0.5) * 4;
            _p.lifetime = 220; _p.maxLifetime = 220;
            _p.size = Math.random() * 2.5 + 1;
            _p.color = Math.random() < 0.5 ? 'rgba(80,255,140,0.8)' : 'rgba(170,90,255,0.8)';
            particles.push(_p);
        }
    }
}

// Shadow Twin (Gemini buff 1): phantom ship apparition + piercing plasma orbs
function drawShadowTwin() {
    if (!window._shadowTwinGhosts) return;
    const now = performance.now();
    for (const g of window._shadowTwinGhosts) {
        const age = now - g.spawnTime;
        const t = age / g.life;
        let alpha;
        if (t < 0.2) alpha = t / 0.2;
        else if (t > 0.7) alpha = Math.max(0, 1 - (t - 0.7) / 0.3);
        else alpha = 1;
        alpha *= 0.85;
        if (alpha <= 0) continue;

        // Same ship model as the player, mirrored around its own center and
        // hue-shifted purple via canvas filter — a real phantom twin, not a
        // simplified silhouette.
        ctx.save();
        if (g.side === 'right') { ctx.translate(g.x, 0); ctx.scale(-1, 1); ctx.translate(-g.x, 0); }
        ctx.filter = 'hue-rotate(95deg) saturate(1.6) brightness(0.9)';
        drawPlayer(alpha, 0, { x: g.x, y: g.y });
        ctx.restore();
    }
}

// Golden Arrow (Virgo buff 1): vine-wrapped wooden fist sweeping across the screen
// Forest Guardian log: colors, curve/vine/leaf helpers ported near-verbatim
// from the reference art's canvas code (thin gripped end at local origin,
// thick knotty strike end ~760 units out along +x, ox/oy baked into every
// coordinate exactly like the source so the point lists can stay unchanged).
const _FG_COLORS = {
    woodDark: '#3A2618', woodBase: '#5C3A21', woodLight: '#7C5535', woodHighlight: '#9A7049',
    woodEndBase: '#6B4A31', woodEndRings: '#3A2618',
    vineDark: '#1E3F15', vineBase: '#366020', vineLight: '#548731',
    leafBase: '#427A26', leafLight: '#65B23A',
    outline: '#0F0905',
};

function _fgDrawCurve(ctx, points, color, lineWidth) {
    if (points.length < 4) return;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 6) {
        if (i + 5 < points.length) {
            ctx.bezierCurveTo(points[i], points[i + 1], points[i + 2], points[i + 3], points[i + 4], points[i + 5]);
        }
    }
    if (lineWidth > 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
}

function _drawFGLog(ctx) {
    ctx.save();
    const ox = -350, oy = -20;

    ctx.beginPath();
    ctx.moveTo(-350 - ox, -30 - oy);
    ctx.lineTo(-300 - ox, -40 - oy);
    ctx.lineTo(-100 - ox, -60 - oy);
    ctx.lineTo(100 - ox, -80 - oy);
    ctx.lineTo(250 - ox, -100 - oy);
    ctx.lineTo(350 - ox, -90 - oy);
    ctx.lineTo(400 - ox, -50 - oy);
    ctx.lineTo(410 - ox, 0 - oy);
    ctx.lineTo(380 - ox, 80 - oy);
    ctx.lineTo(330 - ox, 110 - oy);
    ctx.lineTo(200 - ox, 90 - oy);
    ctx.lineTo(50 - ox, 70 - oy);
    ctx.lineTo(-150 - ox, 40 - oy);
    ctx.lineTo(-300 - ox, 10 - oy);
    ctx.lineTo(-350 - ox, -10 - oy);
    ctx.closePath();
    ctx.fillStyle = _FG_COLORS.woodBase;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = _FG_COLORS.outline;
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = _FG_COLORS.woodDark;
    _fgDrawCurve(ctx, [-320 - ox, 0 - oy, -200 - ox, 10 - oy, -50 - ox, 20 - oy, 150 - ox, 30 - oy], _FG_COLORS.woodDark, 4);
    _fgDrawCurve(ctx, [-150 - ox, -30 - oy, 0 - ox, -40 - oy, 150 - ox, -50 - oy, 300 - ox, -60 - oy], _FG_COLORS.woodDark, 3);
    _fgDrawCurve(ctx, [50 - ox, 50 - oy, 150 - ox, 60 - oy, 250 - ox, 65 - oy, 320 - ox, 70 - oy], _FG_COLORS.woodDark, 3);

    ctx.strokeStyle = _FG_COLORS.woodLight;
    ctx.lineWidth = 2;
    _fgDrawCurve(ctx, [-250 - ox, -15 - oy, -150 - ox, -20 - oy, -50 - ox, -15 - oy, 50 - ox, -25 - oy], _FG_COLORS.woodLight, 2);
    _fgDrawCurve(ctx, [-100 - ox, 25 - oy, 0 - ox, 30 - oy, 100 - ox, 25 - oy, 200 - ox, 40 - oy], _FG_COLORS.woodLight, 2);
    _fgDrawCurve(ctx, [100 - ox, -20 - oy, 200 - ox, -30 - oy, 280 - ox, -25 - oy, 330 - ox, -40 - oy], _FG_COLORS.woodLight, 2);

    // extra fine grain streaks for added density
    ctx.strokeStyle = _FG_COLORS.woodHighlight;
    _fgDrawCurve(ctx, [-300 - ox, -20 - oy, -180 - ox, -25 - oy, -20 - ox, -32 - oy, 120 - ox, -42 - oy], _FG_COLORS.woodHighlight, 1.2);
    _fgDrawCurve(ctx, [-200 - ox, 35 - oy, -60 - ox, 45 - oy, 80 - ox, 48 - oy, 220 - ox, 55 - oy], _FG_COLORS.woodHighlight, 1.2);

    // cut end-face (mặt cắt) at the far/thick end
    ctx.beginPath();
    ctx.moveTo(350 - ox, -90 - oy);
    ctx.bezierCurveTo(420 - ox, -90 - oy, 440 - ox, 20 - oy, 380 - ox, 80 - oy);
    ctx.bezierCurveTo(360 - ox, 100 - oy, 310 - ox, 100 - oy, 330 - ox, 110 - oy);
    ctx.fillStyle = _FG_COLORS.woodEndBase;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = _FG_COLORS.outline;
    ctx.stroke();

    ctx.strokeStyle = _FG_COLORS.woodEndRings;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(380 - ox, 0 - oy, 10, 20, -0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(378 - ox, 2 - oy, 20, 35, -0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(375 - ox, 4 - oy, 30, 50, -0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(372 - ox, 6 - oy, 40, 65, -0.2, 0, Math.PI * 2); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(380 - ox, 0 - oy); ctx.lineTo(360 - ox, 50 - oy);
    ctx.moveTo(380 - ox, 0 - oy); ctx.lineTo(410 - ox, -20 - oy);
    ctx.moveTo(380 - ox, 0 - oy); ctx.lineTo(350 - ox, -40 - oy);
    ctx.lineWidth = 3;
    ctx.strokeStyle = _FG_COLORS.woodDark;
    ctx.stroke();

    // snapped branch stub
    ctx.beginPath();
    ctx.moveTo(280 - ox, -90 - oy);
    ctx.lineTo(310 - ox, -150 - oy);
    ctx.lineTo(340 - ox, -140 - oy);
    ctx.lineTo(330 - ox, -90 - oy);
    ctx.fillStyle = _FG_COLORS.woodBase;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = _FG_COLORS.outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(325 - ox, -145 - oy, 8, 15, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = _FG_COLORS.woodEndBase;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function _drawFGVineSection(ctx, points, thickness) {
    ctx.save();
    const ox = -350, oy = -20;
    const shifted = points.map((p, i) => i % 2 === 0 ? p - ox : p - oy);
    _fgDrawCurve(ctx, shifted, _FG_COLORS.outline, thickness + 4);
    _fgDrawCurve(ctx, shifted, _FG_COLORS.vineBase, thickness);
    _fgDrawCurve(ctx, shifted, _FG_COLORS.vineLight, thickness - 2);
    ctx.restore();
}

function _drawFGLeaf(ctx, x, y, angle, scale) {
    ctx.save();
    const ox = -350, oy = -20;
    ctx.translate(x - ox, y - oy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(15, -10, 30, 0);
    ctx.quadraticCurveTo(15, 10, 0, 0);
    ctx.fillStyle = _FG_COLORS.leafBase;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = _FG_COLORS.outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(25, 0);
    ctx.lineWidth = 1;
    ctx.strokeStyle = _FG_COLORS.vineDark;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, -3);
    ctx.quadraticCurveTo(15, -8, 20, -2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = _FG_COLORS.leafLight;
    ctx.stroke();

    ctx.restore();
}

function _drawFGTendril(ctx, x, y, seed) {
    ctx.save();
    const ox = -350, oy = -20;
    ctx.translate(x - ox, y - oy);
    ctx.rotate(seed * 1.3);
    ctx.strokeStyle = _FG_COLORS.vineLight;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(6, -4, 10, -12, 4, -16);
    ctx.bezierCurveTo(-2, -20, -8, -14, -4, -8);
    ctx.bezierCurveTo(-1, -4, 4, -6, 3, -11);
    ctx.stroke();
    ctx.restore();
}

function _drawFGVines(ctx) {
    // vines wrapped near the thick strike end
    _drawFGVineSection(ctx, [300, 100, 250, 120, 200, 50, 220, -100], 8);
    _drawFGVineSection(ctx, [220, -100, 250, -130, 350, -80, 360, 50], 10);
    _drawFGVineSection(ctx, [360, 50, 370, 100, 280, 110, 250, 50], 9);
    // vines crossing the middle of the shaft
    _drawFGVineSection(ctx, [100, 80, 50, 100, 0, 0, -50, -50], 7);
    _drawFGVineSection(ctx, [-50, -50, -80, -80, 50, -80, 120, -20], 8);
    _drawFGVineSection(ctx, [120, -20, 180, 20, 150, 90, 80, 80], 9);
    // vines winding down the gripped end
    _drawFGVineSection(ctx, [-300, 10, -250, -30, -200, 20, -100, 0], 6);
    _drawFGVineSection(ctx, [-100, 0, -50, -40, 50, 20, 100, -20], 7);
    _drawFGVineSection(ctx, [100, -20, 150, 10, 250, -30, 300, 20], 8);
    // hanging tendrils
    _drawFGVineSection(ctx, [300, 100, 280, 140, 320, 160, 290, 180], 3);
    _drawFGVineSection(ctx, [100, 80, 90, 120, 110, 140, 95, 150], 3);
    _drawFGVineSection(ctx, [-150, 30, -160, 60, -140, 70, -155, 90], 2);
    _drawFGVineSection(ctx, [350, -80, 380, -120, 360, -150, 400, -160], 3);
    // extra density pass — additional strands threading the remaining gaps
    _drawFGVineSection(ctx, [-250, -10, -180, 25, -60, 5, 40, -40], 5);
    _drawFGVineSection(ctx, [40, -40, 90, -60, 200, -10, 260, -60], 6);
    _drawFGVineSection(ctx, [-320, -25, -260, 5, -180, -20, -80, -10], 4);
    _drawFGVineSection(ctx, [180, 60, 130, 40, 60, 60, 0, 40], 5);
    _drawFGVineSection(ctx, [0, 40, -60, 20, -140, 45, -220, 25], 4);
    _drawFGVineSection(ctx, [230, -70, 280, -40, 310, 10, 340, 60], 6);
    _drawFGVineSection(ctx, [200, -100, 240, -125, 300, -110, 330, -75], 5);
    _drawFGVineSection(ctx, [-330, 0, -340, 30, -320, 55, -335, 75], 2);
    // curled tendril flourishes
    const tendrils = [[340, 130], [90, 160], [-170, 100], [370, -170], [-330, -40], [250, -140], [30, -95]];
    for (let ti = 0; ti < tendrils.length; ti++) _drawFGTendril(ctx, tendrils[ti][0], tendrils[ti][1], ti);

    // leaf clusters (verbatim reference placements)
    _drawFGLeaf(ctx, 350, 100, Math.PI / 4, 1.2);
    _drawFGLeaf(ctx, 330, 110, Math.PI / 2, 1.5);
    _drawFGLeaf(ctx, 310, 115, 3 * Math.PI / 4, 1.3);
    _drawFGLeaf(ctx, 370, 70, 0, 1.1);
    _drawFGLeaf(ctx, 380, 40, -Math.PI / 6, 1.4);
    _drawFGLeaf(ctx, 400, 80, Math.PI / 8, 1);
    _drawFGLeaf(ctx, 200, -100, -Math.PI / 2, 1.2);
    _drawFGLeaf(ctx, 230, -110, -3 * Math.PI / 4, 1);
    _drawFGLeaf(ctx, 150, 85, Math.PI / 2, 1.3);
    _drawFGLeaf(ctx, 120, 75, 3 * Math.PI / 4, 1);
    _drawFGLeaf(ctx, 50, -80, -Math.PI / 3, 1.2);
    _drawFGLeaf(ctx, 20, -70, -Math.PI / 2, 1);
    _drawFGLeaf(ctx, -50, -50, Math.PI + 0.5, 0.9);
    _drawFGLeaf(ctx, -150, -40, -Math.PI / 2, 1.1);
    _drawFGLeaf(ctx, -200, 20, Math.PI / 2, 1);
    _drawFGLeaf(ctx, -300, -20, -Math.PI / 4, 0.8);
    _drawFGLeaf(ctx, -320, 5, Math.PI / 3, 0.9);
    _drawFGLeaf(ctx, 300, -140, -Math.PI / 2, 1);
    _drawFGLeaf(ctx, 340, -130, 0, 1.2);
    // extra density pass — filling leaves along the gaps between clusters
    _drawFGLeaf(ctx, 260, 60, Math.PI / 3, 1.1);
    _drawFGLeaf(ctx, 180, -40, -Math.PI / 4, 1);
    _drawFGLeaf(ctx, 90, -30, Math.PI / 2, 0.9);
    _drawFGLeaf(ctx, -20, 10, -Math.PI / 3, 1);
    _drawFGLeaf(ctx, -90, -10, Math.PI / 6, 0.85);
    _drawFGLeaf(ctx, -250, -5, -Math.PI / 2, 0.8);
    _drawFGLeaf(ctx, 260, -90, Math.PI / 5, 1.1);
    _drawFGLeaf(ctx, 320, -30, -Math.PI / 6, 1);
    _drawFGLeaf(ctx, 60, 40, Math.PI, 0.9);
    _drawFGLeaf(ctx, -180, 35, Math.PI / 4, 0.85);
    _drawFGLeaf(ctx, 380, 0, Math.PI / 2, 1);
    _drawFGLeaf(ctx, 210, 30, -Math.PI / 2, 1);
    _drawFGLeaf(ctx, -60, -70, 0.6, 0.9);
    _drawFGLeaf(ctx, 150, -60, -0.8, 1);
    _drawFGLeaf(ctx, -280, -50, 1.1, 0.8);
}

// Reference art's log spans ~760 local units from the gripped pivot to the
// cut end-face — scaling that to `range` makes the drawn log's tip land
// exactly where the sweep's hitbox reaches, so a "60% of screen width"
// attack actually LOOKS like it spans 60% of the screen.
const _FG_REF_LENGTH = 760;

function drawGoldenArrowSweep() {
    const sw = window._goldenArrowSweep;
    if (!sw) return;
    const now = performance.now();
    const progress = (now - sw.startTime) / sw.duration;
    if (progress >= 1) return;
    const angle = -Math.PI + Math.PI * progress;
    const range = canvas.width * 0.6;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);

    // wide arc trail visualizing the strike range, behind the log itself
    const trailGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
    trailGrad.addColorStop(0, 'rgba(120,200,60,0.30)');
    trailGrad.addColorStop(0.7, 'rgba(120,200,60,0.12)');
    trailGrad.addColorStop(1, 'rgba(120,200,60,0)');
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, -0.22, 0.05);
    ctx.closePath();
    ctx.fill();

    const logScale = range / _FG_REF_LENGTH;
    ctx.scale(logScale, logScale);
    if (!_mobPerf) { ctx.shadowColor = 'rgba(20,10,4,0.6)'; ctx.shadowBlur = 14 / logScale; }

    _drawFGLog(ctx);
    _drawFGVines(ctx);

    // impact glow pulsing at the leading (strike) tip
    const pulse = 0.5 + 0.5 * Math.sin(now / 60);
    const tipX = 410 - (-350), tipY = 0 - (-20);
    const impactGlow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 46);
    impactGlow.addColorStop(0, `rgba(200,255,140,${0.5 * pulse})`);
    impactGlow.addColorStop(1, 'rgba(200,255,140,0)');
    ctx.fillStyle = impactGlow;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // trailing splinter/leaf particles at the striking tip
    if (Math.random() < 0.6) {
        const px = player.x + Math.cos(angle) * range, py = player.y + Math.sin(angle) * range;
        createParticles(px, py, 2, Math.random() < 0.5 ? '#8a5a2e' : '#5fae3a', 1, 4);
    }
}

function drawShadowOrbs() {
    if (!window._shadowOrbs || window._shadowOrbs.length === 0) return;
    const now = performance.now();
    for (const orb of window._shadowOrbs) {
        const r = orb.isLarge ? 16.25 : 10;
        const pulse = 1 + 0.15 * Math.sin(now / 90 + orb.x * 0.05);
        const rr = r * pulse;

        ctx.save();
        ctx.translate(orb.x, orb.y);
        if (!_mobPerf) { ctx.shadowColor = '#d6148f'; ctx.shadowBlur = orb.isLarge ? 26 : 18; }

        // trailing motion streak
        const trailAngle = Math.atan2(-orb.vy, -orb.vx);
        const tg = ctx.createLinearGradient(0, 0, Math.cos(trailAngle) * rr * 3, Math.sin(trailAngle) * rr * 3);
        tg.addColorStop(0, 'rgba(220,40,140,0.5)');
        tg.addColorStop(1, 'rgba(220,40,140,0)');
        ctx.strokeStyle = tg;
        ctx.lineWidth = rr * 0.9;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(trailAngle) * rr * 3, Math.sin(trailAngle) * rr * 3);
        ctx.stroke();

        // outer plasma halo
        ctx.fillStyle = orb.isLarge ? 'rgba(180,10,110,0.30)' : 'rgba(180,10,110,0.22)';
        ctx.beginPath(); ctx.arc(0, 0, rr * 1.8, 0, Math.PI * 2); ctx.fill();

        // churning plasma tendrils
        const tendrilCount = orb.isLarge ? 6 : 4;
        ctx.strokeStyle = 'rgba(255,120,190,0.55)';
        ctx.lineWidth = 1.4;
        for (let ti = 0; ti < tendrilCount; ti++) {
            const ta = now / 160 + ti * (Math.PI * 2 / tendrilCount);
            const tr1 = rr * 0.6, tr2 = rr * 1.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ta) * tr1, Math.sin(ta) * tr1);
            ctx.lineTo(Math.cos(ta + 0.6) * tr2, Math.sin(ta + 0.6) * tr2);
            ctx.stroke();
        }

        // plasma sphere body
        const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.35, '#ff9fd0');
        bg.addColorStop(0.7, '#d6148f');
        bg.addColorStop(1, 'rgba(110,0,75,0.6)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

        // hot white core
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.35, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }
}

function drawOnslaughtOrbs() {
    if (!window._onslaughtOrbs || window._onslaughtOrbs.length === 0) return;
    const now = performance.now();
    for (const orb of window._onslaughtOrbs) {
        const r = 11 * (1 + 0.12 * Math.sin(now / 70 + orb.x * 0.05));
        const t = orb.target;
        const travelAngle = t ? Math.atan2(t.y - orb.y, t.x - orb.x) : 0;

        ctx.save();
        ctx.translate(orb.x, orb.y);
        if (!_mobPerf) { ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = 20; }

        // trailing ember streak behind the direction of travel
        const tailAngle = travelAngle + Math.PI;
        const tg = ctx.createLinearGradient(0, 0, Math.cos(tailAngle) * r * 3.2, Math.sin(tailAngle) * r * 3.2);
        tg.addColorStop(0, 'rgba(255,140,30,0.55)');
        tg.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.strokeStyle = tg;
        ctx.lineWidth = r * 0.85;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(tailAngle) * r * 3.2, Math.sin(tailAngle) * r * 3.2);
        ctx.stroke();

        // outer heat haze
        ctx.fillStyle = 'rgba(255,90,10,0.28)';
        ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2); ctx.fill();

        // licking flame tongues
        ctx.strokeStyle = 'rgba(255,180,60,0.6)';
        ctx.lineWidth = 1.4;
        for (let fi = 0; fi < 5; fi++) {
            const fa = now / 130 + fi * (Math.PI * 2 / 5);
            const fr1 = r * 0.55, fr2 = r * 1.25;
            ctx.beginPath();
            ctx.moveTo(Math.cos(fa) * fr1, Math.sin(fa) * fr1);
            ctx.lineTo(Math.cos(fa + 0.5) * fr2, Math.sin(fa + 0.5) * fr2);
            ctx.stroke();
        }

        // fireball body
        const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.3, '#ffe08a');
        bg.addColorStop(0.6, '#ff8c1a');
        bg.addColorStop(1, 'rgba(160,30,0,0.7)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

        // white-hot core
        ctx.fillStyle = 'rgba(255,255,240,0.9)';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();

        ctx.restore();

        // sparse ember particles
        if (Math.random() < 0.4) createParticles(orb.x, orb.y, 1, '#ff8c1a', 1, 3);
    }
}

// Explosion
