// render.js  Enhanced Graphics v2  (hitbox-safe, 60fps)
// RULE: hitbox = original size/shape. Only VISUAL layers added.

let bgStars = [];
let nebulaPoints = null;
// Falling stars system
let _fallingStars = [];
let _skillGActivatedAt = -Infinity; // track khi nào G vừa được bật

// star-field with subtle twinkle
// MOBILE PERFORMANCE FLAGS
// Set once when platform is known. PC path untouched.
let _mobPerf = false; // true when mobile mode active
let _bgOffscreen   = null; // cached background canvas
let _nebulaCanvas  = null; // cached nebula layer (HIGH only)
let _bgDirty = true;    // redraw background this frame?
let _bgCacheFrame = 0;  // frame counter for cache refresh

// Intercept ctx.shadowBlur on mobile, return to 0 for most calls
// Wrapped lazily after canvas is set up (see initMobilePerf)
function _initMobilePerf() {
    _mobPerf = true;
    _bgDirty = true;
    // Triệt tiêu hoàn toàn shadow tại setter level, zero GPU cost
    try {
        // intercepts every shadowBlur setter globally so no if(_mobPerf) guards needed anywhere in draw code
        Object.defineProperty(ctx, 'shadowBlur',  { get: () => 0, set: () => {}, configurable: true });
        Object.defineProperty(ctx, 'shadowColor', { get: () => 'transparent', set: () => {}, configurable: true });
    } catch(e) {}
}
// Auto quality tiers (0=FULL 1=MED 2=LOW 3=MIN)
let _gfxLevel = 0;
window._gfxLevel = 0;
window._particleScale = 1.0;

const _GFX_PARTICLE_SCALE = [1.0, 0.65, 0.35, 0.2];
const _GFX_PARTICLE_CAP   = [350,  250,  150, 100];

function _applyGfxLevel(level) {
    if (_gfxLevel === level) return;
    _gfxLevel = level;
    window._gfxLevel = level;
    window._particleScale = _GFX_PARTICLE_SCALE[level];
    _mobPerf = (level >= 2); // level 2 (LOW): disable all shadowBlur globally
    _bgDirty = true;
    _nebulaCanvas = null;  // regenerate nebula on quality change
    window._lowPerfModeActive = (level >= 3);
}
window._applyGfxLevel = _applyGfxLevel;

// END MOBILE FLAGS

// Glow sprite cache: pre-rendered radial gradient drawn with drawImage (GPU path, no CPU blur)
const _glowSpriteCache = {};
function _getGlowSprite(color, radius) {
    const r = Math.ceil(radius);
    const key = color + '_' + r;
    if (_glowSpriteCache[key]) return _glowSpriteCache[key];
    const dim = r * 2;
    const c = document.createElement('canvas');
    c.width = c.height = dim;
    const cx = c.getContext('2d');
    const g = cx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, dim, dim);
    _glowSpriteCache[key] = c;
    return c;
}

// Bullet sprite cache: full bullet appearance pre-rendered once per (type, size, quality)
const _bulletSpriteCache = {};
function _getBulletSprite(type, size, gfxLvl) {
    const sz = Math.max(1, Math.round(size));
    const key = type + '_' + sz + '_' + gfxLvl;
    if (_bulletSpriteCache[key]) return _bulletSpriteCache[key];
    const highQ = gfxLvl < 1;
    const pad = Math.ceil(sz * 1.6);
    const dim = sz * 2 + pad * 2;
    const c = document.createElement('canvas');
    c.width = c.height = dim;
    const cx = c.getContext('2d');
    const ctr = dim / 2;
    let grad;
    switch (type) {
        case 'sentinel_special': {
            if (highQ) {
                cx.fillStyle = 'rgba(255,210,0,0.18)';
                cx.beginPath();
                cx.moveTo(ctr, ctr - sz * 0.75); cx.lineTo(ctr + sz * 0.5, ctr);
                cx.lineTo(ctr, ctr + sz * 0.75); cx.lineTo(ctr - sz * 0.5, ctr);
                cx.closePath(); cx.fill();
            }
            grad = cx.createRadialGradient(ctr, ctr - sz * 0.2, 0, ctr, ctr, sz * 0.5);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#ffe066');
            grad.addColorStop(0.7, '#e6a800'); grad.addColorStop(1, '#7a5000');
            cx.fillStyle = grad;
            cx.beginPath();
            cx.moveTo(ctr, ctr - sz / 2); cx.lineTo(ctr + sz / 3, ctr);
            cx.lineTo(ctr, ctr + sz / 2); cx.lineTo(ctr - sz / 3, ctr);
            cx.closePath(); cx.fill();
            cx.fillStyle = 'rgba(255,255,220,0.75)';
            cx.beginPath();
            cx.moveTo(ctr, ctr - sz / 2); cx.lineTo(ctr + sz * 0.12, ctr - sz * 0.1);
            cx.lineTo(ctr, ctr - sz * 0.05); cx.closePath(); cx.fill();
            break;
        }
        case 'player_charged': {
            if (highQ) { cx.fillStyle = 'rgba(100,180,255,0.2)'; cx.beginPath(); cx.arc(ctr, ctr, sz * 1.45, 0, Math.PI * 2); cx.fill(); }
            grad = cx.createRadialGradient(ctr - sz * 0.2, ctr - sz * 0.2, 0, ctr, ctr, sz);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.35, '#88ccff');
            grad.addColorStop(0.7, '#2277dd'); grad.addColorStop(1, 'rgba(0,60,180,0.5)');
            cx.fillStyle = grad; cx.beginPath(); cx.arc(ctr, ctr, sz, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = 'rgba(255,255,255,0.6)';
            cx.beginPath(); cx.ellipse(ctr - sz * 0.25, ctr - sz * 0.25, sz * 0.22, sz * 0.13, -0.8, 0, Math.PI * 2); cx.fill();
            break;
        }
        case 'sentinel_auto': case 'sentinel_death': {
            if (highQ) { cx.fillStyle = 'rgba(0,200,220,0.15)'; cx.beginPath(); cx.arc(ctr, ctr, sz * 1.4, 0, Math.PI * 2); cx.fill(); }
            grad = cx.createRadialGradient(ctr - sz * 0.2, ctr - sz * 0.2, 0, ctr, ctr, sz);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#44ffee');
            grad.addColorStop(0.7, '#00aaaa'); grad.addColorStop(1, 'rgba(0,60,80,0.5)');
            cx.fillStyle = grad; cx.beginPath(); cx.arc(ctr, ctr, sz, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = 'rgba(200,255,255,0.55)';
            cx.beginPath(); cx.ellipse(ctr - sz * 0.2, ctr - sz * 0.2, sz * 0.2, sz * 0.12, -0.8, 0, Math.PI * 2); cx.fill();
            break;
        }
        default: { // player_auto and any unknown type
            if (highQ) { cx.fillStyle = 'rgba(160,80,255,0.15)'; cx.beginPath(); cx.arc(ctr, ctr, sz * 1.4, 0, Math.PI * 2); cx.fill(); }
            grad = cx.createRadialGradient(ctr - sz * 0.2, ctr - sz * 0.2, 0, ctr, ctr, sz);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#cc88ff');
            grad.addColorStop(0.7, '#7700cc'); grad.addColorStop(1, 'rgba(40,0,80,0.5)');
            cx.fillStyle = grad; cx.beginPath(); cx.arc(ctr, ctr, sz, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = 'rgba(240,200,255,0.55)';
            cx.beginPath(); cx.ellipse(ctr - sz * 0.2, ctr - sz * 0.2, sz * 0.22, sz * 0.13, -0.8, 0, Math.PI * 2); cx.fill();
            break;
        }
    }
    _bulletSpriteCache[key] = c;
    return c;
}

// Spirit bullet sprite cache (full quality, drawn with lighter blendMode)
const _spiritSpriteCache = {};
function _getSpiritSprite(isPhoto, size) {
    const sz = Math.max(1, Math.round(size));
    const key = (isPhoto ? 'ph' : 'sp') + '_' + sz;
    if (_spiritSpriteCache[key]) return _spiritSpriteCache[key];
    const pad = Math.ceil(sz * 1.6);
    const dim = sz * 2 + pad * 2;
    const c = document.createElement('canvas');
    c.width = c.height = dim;
    const cx = c.getContext('2d');
    const ctr = dim / 2;
    cx.fillStyle = isPhoto ? 'rgba(0,180,60,0.15)' : 'rgba(255,80,200,0.15)';
    cx.beginPath(); cx.arc(ctr, ctr, sz * 1.4, 0, Math.PI * 2); cx.fill();
    const sg = cx.createRadialGradient(ctr - sz * 0.2, ctr - sz * 0.2, 0, ctr, ctr, sz);
    if (isPhoto) {
        sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.3, '#80ff90');
        sg.addColorStop(0.7, '#00aa30'); sg.addColorStop(1, 'rgba(0,40,10,0.5)');
    } else {
        sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.3, '#ff88dd');
        sg.addColorStop(0.7, '#cc00aa'); sg.addColorStop(1, 'rgba(80,0,60,0.5)');
    }
    cx.fillStyle = sg; cx.beginPath(); cx.arc(ctr, ctr, sz, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = isPhoto ? 'rgba(200,255,210,0.55)' : 'rgba(255,220,240,0.55)';
    cx.beginPath(); cx.ellipse(ctr - sz * 0.2, ctr - sz * 0.2, sz * 0.2, sz * 0.12, -0.8, 0, Math.PI * 2); cx.fill();
    _spiritSpriteCache[key] = c;
    return c;
}

function drawSpaceBackground(deltaTime) {
    // Mobile: cache background, redraw every 3 frames
    if (_mobPerf) {
        _bgCacheFrame++;
        const needRedraw = _bgDirty || (_bgCacheFrame % 4 === 0); // % 4 so animated bg elements don't freeze on cache

        if (needRedraw || !_bgOffscreen || _bgOffscreen.width !== canvas.width || _bgOffscreen.height !== canvas.height) {
            // Create or resize offscreen canvas
            if (!_bgOffscreen) _bgOffscreen = document.createElement('canvas');
            _bgOffscreen.width = canvas.width;
            _bgOffscreen.height = canvas.height;
            const oCtx = _bgOffscreen.getContext('2d');
            _drawSpaceBgTo(oCtx, deltaTime, canvas.width, canvas.height);
            _bgDirty = false;
        }
        ctx.drawImage(_bgOffscreen, 0, 0);
        return;
    }
    // PC: draw directly as before
    _drawSpaceBgTo(ctx, deltaTime, canvas.width, canvas.height);
}

function _drawSpaceBgTo(c, deltaTime, W, H) {
    c.fillStyle = '#02020c';
    c.fillRect(0, 0, W, H);

    // Nebula layer: HIGH quality only, generated once and cached
    if (_gfxLevel < 1) {
        if (!_nebulaCanvas || _nebulaCanvas.width !== W || _nebulaCanvas.height !== H) {
            _nebulaCanvas = document.createElement('canvas');
            _nebulaCanvas.width = W; _nebulaCanvas.height = H;
            const nc = _nebulaCanvas.getContext('2d');
            const blobs = [
                { x: W * 0.12, y: H * 0.22, r: W * 0.40, col: [70, 20, 140, 0.13] },
                { x: W * 0.82, y: H * 0.72, r: W * 0.44, col: [10, 70, 120, 0.14] },
                { x: W * 0.50, y: H * 0.38, r: W * 0.32, col: [ 0, 95,  80, 0.09] },
                { x: W * 0.22, y: H * 0.80, r: W * 0.29, col: [95, 15,  95, 0.08] },
                { x: W * 0.80, y: H * 0.14, r: W * 0.26, col: [25, 50, 145, 0.11] },
            ];
            for (const b of blobs) {
                const [r, g, bv, a] = b.col;
                const ng = nc.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
                ng.addColorStop(0, `rgba(${r},${g},${bv},${a})`);
                ng.addColorStop(1, 'rgba(0,0,0,0)');
                nc.fillStyle = ng;
                nc.fillRect(0, 0, W, H);
            }
        }
        c.drawImage(_nebulaCanvas, 0, 0);
    }

    const dt = deltaTime ? deltaTime / 16.67 : 1;
    const now = performance.now();

    // Initialise falling stars pool
    if (_fallingStars.length === 0) {
        for (let i = 0; i < 80; i++) {
            _fallingStars.push(_makeFallingStar(W, H, true));
        }
    }

    // Update + draw each falling star
    c.save();
    for (let i = _fallingStars.length - 1; i >= 0; i--) {
        const s = _fallingStars[i];
        s.y += s.vy * dt;
        s.x += s.vx * dt;

        // Reset when off bottom edge
        if (s.y > H + s.len) {
            _fallingStars[i] = _makeFallingStar(W, H, false);
            continue;
        }

        const twinkle = 0.55 + 0.45 * Math.sin(now / 600 + s.phase);
        const alpha = s.brightness * twinkle;

        // Trail line
        const tx = s.x - s.vx * s.len / s.vy;
        const ty = s.y - s.len;

        c.globalAlpha = 0;
        const grad = c.createLinearGradient(tx, ty, s.x, s.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, s.color);

        c.globalAlpha = alpha;
        c.strokeStyle = grad;
        c.lineWidth = s.size;
        c.beginPath();
        c.moveTo(tx, ty);
        c.lineTo(s.x, s.y);
        c.stroke();

        // Bright head dot
        c.globalAlpha = Math.min(1, alpha * 1.4);
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(s.x, s.y, Math.max(0.3, s.size * 0.6), 0, Math.PI * 2);
        c.fill();
    }
    c.globalAlpha = 1;
    c.restore();
}

function _makeFallingStar(W, H, initial) {
    const colors = ['#ffffff', '#c8dfff', '#ffe8cc', '#aaddff', '#ffddff'];
    const vy = 1.8 + Math.random() * 5.5;
    const angle = (Math.random() - 0.5) * 0.18; // slight diagonal
    const size = 0.4 + Math.random() * 1.8;
    return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : -(20 + Math.random() * 60),
        vx: Math.sin(angle) * vy,
        vy,
        len: 18 + size * 14 + Math.random() * 30,
        size,
        brightness: 0.35 + Math.random() * 0.65,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2
    };
}


// Yog-Sothoth shift arrows
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
function draw(deltaTime) {
    ctx.save();
    if (screenShake.duration > 0 && _gfxLevel < 1 && window._screenShakeEnabled !== false && gameState !== 'gameover') {
        const _sNow = performance.now();
        const _sFade = screenShake.duration / 500; // fade out khi gần hết
        // different freqs so x and y drift independently, same freq would feel like a diagonal slide
        ctx.translate(
            Math.sin(_sNow * 0.025) * screenShake.intensity * _sFade * 0.38,
            Math.cos(_sNow * 0.019) * screenShake.intensity * _sFade * 0.38
        );
    }

    const _isMobile = typeof _platform !== 'undefined' && _platform === 'mobile';
    const _MOB_SCALE = 0.78;

    // Particle cap (tier-aware)
    {
        const _pCap = _GFX_PARTICLE_CAP[_gfxLevel] || 350;
        if (particles.length > _pCap) particles.splice(0, particles.length - _pCap);
    }

    // Background full canvas
    drawSpaceBackground(deltaTime);

    // Yog-Sothoth Domain Expansion (JJK signature)
    if (gameState === "playing" && skillShiftActive) {
        const now = performance.now();
        let elapsed = now - skillShiftChargeStart;
        let maxRadius = Math.hypot(canvas.width, canvas.height);
        let expandT = Math.min(elapsed / 600, 1);
        let easeExpand = 1 - Math.pow(1 - expandT, 3);
        let currentDomainRadius = maxRadius * easeExpand;
        const domainFull = expandT >= 1;
        const cx = player.x, cy = player.y;
        // chargeRatio: 0→1 over skillShiftMaxCharge (3s), used for energy buildup visuals
        const chargeRatio = Math.min(elapsed / skillShiftMaxCharge, 1);

        ctx.save();

        // PHASE A, PRE-EXPANSION: CURSED ENERGY CHARGING VORTEX
        // Visible the entire time but peaks before domain opens

        // A1. DARK AURA GROUND PULSE, circular shockwave rings emanating outward
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

        // A2. SPIRAL ENERGY STREAMS, 6 cursed-energy tendrils spiraling INTO player
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

        // A3. PARTICLE VORTEX, dozens of cursed sparks sucked inward
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

        // A4. EYE OF THE STORM, concentric charged rings tight around player
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

        // PHASE B, DOMAIN VOID FILL + HEX FLOOR

        // B1. HEX FLOOR, slowly scrolling to feel alive
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

        // B1b. PERSIAN TILE OVERLAY, hoa văn Ba Tư cuộn theo domain
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

        // B2b. PURPLE TINT OVERLAY, flat screen-wide purple wash inside domain
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, currentDomainRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = 'rgba(80,0,160,0.22)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // PHASE C, BOUNDARY, CRACKS, RAYS, RUNES (full domain)

        // C1. BOUNDARY RING
        if (!domainFull) {
            // expanding shockwave wall
            ctx.lineWidth = 16;
            ctx.strokeStyle = 'rgba(160,0,255,0.95)';
            if (!_mobPerf) ctx.shadowColor = '#df00ff'; if (!_mobPerf) ctx.shadowBlur = 50;
            ctx.beginPath(); ctx.arc(cx, cy, currentDomainRadius, 0, Math.PI * 2); ctx.stroke();

            if (currentDomainRadius > 10) {
                ctx.lineWidth = 6;
                ctx.strokeStyle = 'rgba(255,180,255,0.75)';
                if (!_mobPerf) ctx.shadowBlur = 22;
                ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, currentDomainRadius - 7), 0, Math.PI * 2); ctx.stroke();
            }

            // trailing shockwave ring
            const shockR = currentDomainRadius + 12 * (1 - expandT);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = `rgba(255,255,255,${(1 - expandT) * 0.95})`;
            if (!_mobPerf) ctx.shadowBlur = 12;
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
            // stable domain wall: two counter-rotating segmented rings
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
                if (!_mobPerf) ctx.shadowColor = '#9900ff'; if (!_mobPerf) ctx.shadowBlur = 18;
                ctx.beginPath(); ctx.arc(0, 0, maxRadius * 0.998, wa, wa2); ctx.stroke();
            }
            // inner fast ring opposite direction
            ctx.rotate(-now / 3500);
            for (let i = 0; i < 12; i++) {
                const wa = (i / 12) * Math.PI * 2 + 0.13;
                const wa2 = wa + Math.PI / 9;
                ctx.strokeStyle = `rgba(220,80,255,${wallPulse * 0.45})`;
                ctx.lineWidth = 3;
                if (!_mobPerf) ctx.shadowBlur = 8;
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
                    if (!_mobPerf) ctx.shadowColor = '#cc00ff'; if (!_mobPerf) ctx.shadowBlur = 10;
                    ctx.fillText(runes[(i + oi * 4) % runes.length], 0, 0);
                    // trailing ghost rune
                    ctx.globalAlpha *= 0.25;
                    ctx.translate(-Math.cos(ra) * 8, -Math.sin(ra) * 8);
                    ctx.fillText(runes[(i + oi * 4) % runes.length], 0, 0);
                    ctx.restore();
                }
            });
        }

        // C5. LIGHTNING VEINS, random lightning that re-draws each frame inside domain
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

        // C5b. PERSIAN TILE PATTERN, Ottoman-style geometric overlay inside domain
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
                ctx.clip(); // clip to domain circle (already set by void fill above? no, re-clip)
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

                        // Diamond outline
                        ctx.strokeStyle = `rgba(180,80,255,${a * 1.2})`;
                        ctx.lineWidth = 0.9;
                        ctx.beginPath();
                        ctx.moveTo(cx2, cy2 - s);
                        ctx.lineTo(cx2 + s, cy2);
                        ctx.lineTo(cx2, cy2 + s);
                        ctx.lineTo(cx2 - s, cy2);
                        ctx.closePath();
                        ctx.stroke();

                        // 4-petal flower in center
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

                        // Cross lines
                        ctx.strokeStyle = `rgba(160,60,255,${a * 0.7})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(cx2 - s * 0.5, cy2); ctx.lineTo(cx2 + s * 0.5, cy2);
                        ctx.moveTo(cx2, cy2 - s * 0.5); ctx.lineTo(cx2, cy2 + s * 0.5);
                        ctx.stroke();

                        // Corner dots
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

        // C6. DOMAIN TITLE TEXT, fades in briefly
        {
            const textT = Math.min(elapsed / 200, 1) * Math.max(0, 1 - (elapsed - 200) / 1500);
            if (textT > 0.02) {
                ctx.save();

                // BIG KANJI BEHIND (mờ, to, đỏ tím)
                ctx.globalAlpha = textT * 0.38;
                ctx.font = 'bold 130px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#cc44ff';
                if (!_mobPerf) ctx.shadowColor = '#8800cc'; if (!_mobPerf) ctx.shadowBlur = 40;
                ctx.fillText('律域展開', cx, cy - 30);

                // EN TITLE FRONT (sắc nét, sáng)
                ctx.globalAlpha = textT * 0.92;
                if (!_mobPerf) ctx.shadowColor = '#cc00ff'; if (!_mobPerf) ctx.shadowBlur = 22;

                // tên lớn
                ctx.font = 'bold 32px "Arial Black", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('YOG-SOTHOTH', cx, cy - 72);

                // subtitle nhỏ
                ctx.font = 'italic 14px monospace';
                ctx.fillStyle = '#dd88ff';
                if (!_mobPerf) ctx.shadowBlur = 10;
                ctx.fillText('— Bành trướng lãnh địa —', cx, cy - 46);

                ctx.restore();
            }
        }

        // C7. CORE BURST at player, grows and pulses
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
        _drawDimensionalRiftsCtx(); // always on ctx, drawn before enemies so rift appears behind them

        teslaCoils.forEach(drawTeslaCoil);
        energyOrbs.forEach(drawEnergyOrb);

        drawAegisLasers();
        _drawLeviathanEffects(); // death lasers + perseverance sweep (outside enemy lifetime)
        _drawVeilshroudEffects(); // lightning strikes + echo explosion zones
        _drawEgregorEffects();   // Psychic Tempest telegraphs/strikes + Null Slash
        _drawDimBreakZones();   // Lingering Dimension Break arcs (world-space, independent of Egregor)

        // Draw non-bullet enemies first (background layer)
        enemies.forEach(e => { if (!e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain') drawEnemy(e); });
        if (window._usePixi && window._pixiDrawBullets) {
            window._pixiDrawBullets(bullets, spiritBullets);
        } else {
            bullets.forEach(drawBullet);
            spiritBullets.forEach(drawSpiritBullet);
        }
        spirits.forEach(drawSpirit);
        photoBrangs.forEach(drawPhotoBrang);
        if (primevalSummonEffect) drawPrimevalSummonEffect(primevalSummonEffect);
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
        // Batch particle draw
        {
            const _specials = [];
            const _batches = new Map();
            const _pixiP = window._usePixi && window._pixiDrawParticles;
            for (const p of particles) {
                if (p.isSummonRing || p.isLaserLine || p.isSkillGAura || p.isBarrierBreakRing) { _specials.push(p); continue; }
                if (_pixiP) continue; // normal particles routed to Pixi
                // Round alpha to 0.05 steps, imperceptible diff, enables color+alpha batching
                const _a = Math.round((p.lifetime / p.maxLifetime) * 20) / 20;
                const _k = p.color + '|' + _a;
                let _b = _batches.get(_k);
                if (!_b) { _b = { color: p.color, alpha: _a, ps: [] }; _batches.set(_k, _b); }
                _b.ps.push(p);
            }
            _specials.forEach(drawParticle);
            if (_pixiP) {
                window._pixiDrawParticles(particles);
            } else {
                ctx.save();
                if (!_mobPerf) ctx.shadowBlur = 5;
                for (const [, _b] of _batches) {
                    ctx.globalAlpha = _b.alpha;
                    if (!_mobPerf) ctx.shadowColor = _b.color;
                    ctx.fillStyle = _b.color;
                    ctx.beginPath();
                    for (const p of _b.ps) { ctx.moveTo(p.x + p.size, p.y); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); }
                    ctx.fill();
                }
                ctx.shadowBlur = 0; ctx.globalAlpha = 1;
                ctx.restore();
            }
        }
        chainLightningEffects.forEach(drawChainLightning);
        if (skillFState !== 'ready') drawSkillF();
        if (skillDCharging) drawSkillDCharging();
        if (charging) drawChargeMeter();
        if (skillShiftActive) drawSkillShiftEffects();

        // ENEMY BULLETS: top layer, always visible
        enemies.forEach(e => { if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain') drawEnemy(e); });

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
        // Cinematic dark vignette (HIGH full / MED half-strength)
        if (_gfxLevel < 2) {
            const _vcx = canvas.width / 2, _vcy = canvas.height / 2;
            const _vIn  = Math.min(canvas.width, canvas.height) * (_gfxLevel < 1 ? 0.22 : 0.36);
            const _vOut = Math.hypot(canvas.width, canvas.height) * 0.65;
            const _vg = ctx.createRadialGradient(_vcx, _vcy, _vIn, _vcx, _vcy, _vOut);
            _vg.addColorStop(0,   'rgba(0,0,0,0)');
            _vg.addColorStop(0.6, _gfxLevel < 1 ? 'rgba(0,2,18,0.18)'  : 'rgba(0,1,10,0.07)');
            _vg.addColorStop(1,   _gfxLevel < 1 ? 'rgba(0,3,20,0.62)'  : 'rgba(0,2,12,0.28)');
            ctx.save();
            ctx.fillStyle = _vg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // Dark Souls red vignette
        {
            const _now = performance.now();
            const cx = canvas.width / 2, cy = canvas.height / 2;
            const innerR = Math.min(canvas.width, canvas.height) * 0.28;
            const outerR = Math.hypot(canvas.width, canvas.height) * 0.62;

            // Hit flash: 700ms fade after each life loss
            const hitElapsed = _now - (window._hitVignetteStart || -Infinity);
            const flashAlpha = hitElapsed < 700 ? (1 - hitElapsed / 700) * 0.65 : 0;

            // Low-lives persistent pulse (< 5 lives)
            const pulseAlpha = lives < 5 ? 0.20 + 0.14 * Math.abs(Math.sin(_now / 380)) : 0;

            const vignetteAlpha = Math.max(flashAlpha, pulseAlpha);
            if (vignetteAlpha > 0.01) {
                const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
                grad.addColorStop(0, 'rgba(160,0,0,0)');
                grad.addColorStop(1, `rgba(200,0,0,${vignetteAlpha})`);
                ctx.save();
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }

        if (typeof _platform === 'undefined' || _platform !== 'mobile') drawSkillButtons();

        // Wave announcement banner (center screen)
        const _wa = _waveAnnouncedAt || 0;
        const _wcx = canvas.width / 2, _wcy = canvas.height * 0.38;
        if (_wa > 0) {
            const _wAge = performance.now() - _wa;
            if (_wAge < 2800) {
                const _wAlpha = _wAge < 200 ? _wAge / 200 : (_wAge < 2100 ? 1 : Math.max(0, 1 - (_wAge - 2100) / 700));
                const _bW = 272, _bH = 116, _bX = _wcx - _bW / 2, _bY = _wcy - _bH / 2;
                ctx.save();
                ctx.textAlign = 'center';

                // Background
                ctx.globalAlpha = _wAlpha * 0.62;
                const _bg = ctx.createLinearGradient(_bX, _bY, _bX, _bY + _bH);
                _bg.addColorStop(0, '#060e1e');
                _bg.addColorStop(1, '#02070f');
                ctx.fillStyle = _bg;
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(_bX, _bY, _bW, _bH, 7); ctx.fill(); }
                else ctx.fillRect(_bX, _bY, _bW, _bH);

                // Border
                ctx.globalAlpha = _wAlpha * 0.8;
                ctx.strokeStyle = '#1b3e82'; ctx.lineWidth = 1;
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(_bX, _bY, _bW, _bH, 7); ctx.stroke(); }
                else ctx.strokeRect(_bX, _bY, _bW, _bH);

                ctx.globalAlpha = _wAlpha;

                // "W A V E" label with flanking lines
                const _lblY = _bY + 30;
                ctx.strokeStyle = '#1a3870'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(_bX + 14, _lblY); ctx.lineTo(_wcx - 44, _lblY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(_wcx + 44, _lblY); ctx.lineTo(_bX + _bW - 14, _lblY); ctx.stroke();
                ctx.font = 'bold 11px monospace';
                ctx.fillStyle = '#3a5e9a';
                ctx.fillText('W  A  V  E', _wcx, _lblY + 1);

                // Wave number
                ctx.shadowBlur = 28; ctx.shadowColor = '#1840cc';
                ctx.font = 'bold 62px Arial';
                ctx.fillStyle = '#cce2ff';
                ctx.fillText(String(_waveNumber), _wcx, _wcy + 34);
                ctx.shadowBlur = 0;

                // Bottom label
                ctx.font = '10px monospace';
                ctx.fillStyle = '#253c62';
                ctx.fillText('—  I N C O M I N G  —', _wcx, _bY + _bH - 11);

                ctx.restore();
            }
        }
        // Rest-phase countdown banner
        if (_wavePhase === 'rest' && _waveRestTimer > 0) {
            const _restSec = Math.ceil(_waveRestTimer / 1000);
            const _isClear = _waveRestTimer <= 3100;
            const _age = (_isClear ? 3000 : (typeof WAVE_REST_DURATION !== 'undefined' ? WAVE_REST_DURATION : 5000)) - _waveRestTimer;
            const _alpha = _age < 300 ? _age / 300 : 0.72;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.globalAlpha = _alpha * 0.38;
            ctx.fillStyle = _isClear ? '#020f06' : '#020a18';
            ctx.fillRect(_wcx - 110, _wcy - 26, 220, 44);
            ctx.globalAlpha = _alpha * 0.5;
            ctx.strokeStyle = _isClear ? '#224433' : '#334466'; ctx.lineWidth = 1;
            ctx.strokeRect(_wcx - 110, _wcy - 26, 220, 44);
            ctx.globalAlpha = _alpha;
            ctx.font = '11px monospace';
            ctx.fillStyle = _isClear ? '#336644' : '#445566';
            ctx.fillText(_isClear ? 'WAVE CLEARED  —  NEXT IN' : 'NEXT WAVE IN', _wcx, _wcy - 6);
            ctx.font = 'bold 20px monospace';
            ctx.fillStyle = _isClear ? '#55cc88' : '#88aacc';
            ctx.shadowBlur = 8; ctx.shadowColor = _isClear ? '#22aa55' : '#2244aa';
            ctx.fillText(`${_restSec}s`, _wcx, _wcy + 16);
            ctx.restore();
        }

        // HUD panel (top right)
        ctx.save();
        const _hMob = _isMobile;
        const _hW = _hMob ? 148 : 192;
        const _hX = canvas.width - _hW - 12;
        const _hY = 10;
        const _hPad = 12;
        const _rH = _hMob ? 22 : 26;
        const _hH = _hMob ? 158 : 198;

        // Panel background
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#050c1a';
        ctx.beginPath();
        ctx.moveTo(_hX + 8, _hY);
        ctx.lineTo(_hX + _hW - 8, _hY); ctx.arc(_hX + _hW - 8, _hY + 8, 8, -Math.PI/2, 0);
        ctx.lineTo(_hX + _hW, _hY + _hH - 8); ctx.arc(_hX + _hW - 8, _hY + _hH - 8, 8, 0, Math.PI/2);
        ctx.lineTo(_hX + 8, _hY + _hH); ctx.arc(_hX + 8, _hY + _hH - 8, 8, Math.PI/2, Math.PI);
        ctx.lineTo(_hX, _hY + 8); ctx.arc(_hX + 8, _hY + 8, 8, Math.PI, 3*Math.PI/2);
        ctx.closePath(); ctx.fill();

        ctx.globalAlpha = 0.20;
        ctx.strokeStyle = '#1a3a7a'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(_hX + 8, _hY);
        ctx.lineTo(_hX + _hW - 8, _hY); ctx.arc(_hX + _hW - 8, _hY + 8, 8, -Math.PI/2, 0);
        ctx.lineTo(_hX + _hW, _hY + _hH - 8); ctx.arc(_hX + _hW - 8, _hY + _hH - 8, 8, 0, Math.PI/2);
        ctx.lineTo(_hX + 8, _hY + _hH); ctx.arc(_hX + 8, _hY + _hH - 8, 8, Math.PI/2, Math.PI);
        ctx.lineTo(_hX, _hY + 8); ctx.arc(_hX + 8, _hY + 8, 8, Math.PI, 3*Math.PI/2);
        ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.textAlign = 'right';
        let _ry = _hY + 10;

        // Timer
        const _elSec = Math.floor(gameElapsedTime / 1000);
        const _tmm = String(Math.floor(_elSec / 60)).padStart(2, '0');
        const _tss = String(_elSec % 60).padStart(2, '0');
        ctx.font = _hMob ? 'bold 13px monospace' : 'bold 18px monospace';
        ctx.fillStyle = '#7ab8f5';
        ctx.fillText(`⏱ ${_tmm}:${_tss}`, _hX + _hW - _hPad, _ry + (_hMob ? 13 : 17));
        _ry += _rH + 2;

        // Divider
        ctx.globalAlpha = 0.30; ctx.strokeStyle = '#2a4a8a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(_hX + 10, _ry); ctx.lineTo(_hX + _hW - 10, _ry); ctx.stroke();
        ctx.globalAlpha = 1; _ry += 7;

        // Wave number
        ctx.font = _hMob ? 'bold 14px Arial' : 'bold 18px Arial';
        ctx.shadowBlur = 7; ctx.shadowColor = '#3366cc';
        ctx.fillStyle = '#b8d0ff';
        ctx.fillText(`WAVE  ${_waveNumber}`, _hX + _hW - _hPad, _ry + (_hMob ? 13 : 17));
        ctx.shadowBlur = 0;
        _ry += _rH + 2;

        // Enemy count
        const _aliveCount = enemies.filter(e => !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo').length;
        ctx.font = _hMob ? '11px monospace' : '13px monospace';
        if (_wavePhase === 'rest') {
            const _restSec = Math.ceil(_waveRestTimer / 1000);
            ctx.fillStyle = '#667788';
            ctx.fillText(`↻ ${_restSec}s  ·  ${_aliveCount} alive`, _hX + _hW - _hPad, _ry + (_hMob ? 11 : 13));
        } else {
            const _total = _aliveCount + _waveQueue.length;
            const _pulseCnt = 0.7 + 0.3 * Math.abs(Math.sin(performance.now() / 600));
            ctx.fillStyle = _total > 0 ? `rgba(255,160,80,${_pulseCnt})` : '#446644';
            ctx.fillText(_total > 0 ? `◉ ${_total} enemies` : '◉ clearing...', _hX + _hW - _hPad, _ry + (_hMob ? 11 : 13));
        }
        _ry += (_hMob ? 16 : 20);

        // Divider
        ctx.globalAlpha = 0.30; ctx.strokeStyle = '#2a4a8a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(_hX + 10, _ry); ctx.lineTo(_hX + _hW - 10, _ry); ctx.stroke();
        ctx.globalAlpha = 1; _ry += 7;

        // Stats
        ctx.font = _hMob ? '12px Arial' : '16px Arial';
        const _fH = _hMob ? 12 : 16;

        ctx.fillStyle = '#cccccc';
        ctx.fillText(`◆  ${score.toLocaleString()}`, _hX + _hW - _hPad, _ry + _fH);
        _ry += _rH;

        if (lives < 5) {
            const _bt = performance.now();
            const _blink = 0.7 + 0.3 * Math.abs(Math.sin(_bt / 380));
            ctx.fillStyle = `rgb(255,${Math.round(40 * _blink)},${Math.round(40 * _blink)})`;
        } else { ctx.fillStyle = '#cccccc'; }
        ctx.fillText(`♥  ${lives}`, _hX + _hW - _hPad, _ry + _fH);
        _ry += _rH;

        ctx.fillStyle = '#88ccff';
        ctx.fillText(`⊕  ${sentinels.length}`, _hX + _hW - _hPad, _ry + _fH);
        _ry += _rH;

        ctx.fillStyle = '#ffdd55';
        ctx.fillText(`⚡  ${teslaCoils.length}`, _hX + _hW - _hPad, _ry + _fH);

        ctx.restore();
    } else if (gameState === "start") {
        _drawStartScreen();
    } else if (gameState === "gameover") {
        const _cx = canvas.width / 2, _cy = canvas.height / 2;
        // Cinematic radial vignette
        const _rvg = ctx.createRadialGradient(_cx, _cy, canvas.height * 0.12, _cx, _cy, canvas.height * 0.72);
        _rvg.addColorStop(0, "rgba(14,2,2,0.84)");
        _rvg.addColorStop(1, "rgba(0,0,0,0.97)");
        ctx.fillStyle = _rvg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Ornamental divider, two lines with a rotated square diamond
        const _deco = (y) => {
            const lw = 290;
            ctx.strokeStyle = "rgba(178,122,26,0.58)";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(_cx - lw / 2, y); ctx.lineTo(_cx - 22, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(_cx + 22, y); ctx.lineTo(_cx + lw / 2, y); ctx.stroke();
            ctx.save(); ctx.translate(_cx, y); ctx.rotate(Math.PI / 4);
            ctx.fillStyle = "rgba(195,138,32,0.72)";
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        };
        _deco(_cy - 112);
        // "GAME OVER"
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(130,8,8,0.95)";
        ctx.shadowBlur = 38;
        ctx.font = "900 62px 'Cinzel', serif";
        ctx.fillStyle = "#8b1919";
        ctx.fillText("GAME OVER", _cx, _cy - 60);
        ctx.shadowBlur = 0;
        _deco(_cy - 18);
        // Stats
        ctx.font = "400 20px 'Cinzel', serif";
        ctx.fillStyle = "rgba(215,185,122,0.88)";
        ctx.fillText("Wave  ·  " + (typeof _waveNumber !== 'undefined' ? _waveNumber : 1), _cx, _cy + 12);
        ctx.fillText("Total Score  ·  " + score.toLocaleString(), _cx, _cy + 40);
        const _pt = typeof _gameOverPlayTime !== 'undefined' ? _gameOverPlayTime : 0;
        const _ptm = Math.floor(_pt / 60000);
        const _pts = Math.floor((_pt % 60000) / 1000);
        ctx.fillText("Time  ·  " + _ptm + ":" + (_pts < 10 ? "0" : "") + _pts, _cx, _cy + 68);
    }
    if (window._usePixi && window._pixiRender) window._pixiRender();
    ctx.restore();
}

// Start Screen, Pisces Constellation
function _drawStartScreen() {
    const now = performance.now();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Pisces constellation star positions (normalized -1..1 → screen)
    // Based on real Pisces star pattern: two fish connected by a cord
    const scale = Math.min(canvas.width, canvas.height) * 0.30;
    const offX = cx;
    const offY = cy - scale * 0.05;

    // Stars: [x, y, magnitude], normalized coords centered on constellation
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

    // Draw constellation lines, sáng rõ hơn
    ctx.save();
    lines.forEach(([a, b]) => {
        const ax = offX + piscesStars[a][0] * scale;
        const ay = offY + piscesStars[a][1] * scale;
        const bx = offX + piscesStars[b][0] * scale;
        const by = offY + piscesStars[b][1] * scale;

        const lineAlpha = 0.28 + 0.12 * Math.sin(now / 2000 + a * 0.4);
        ctx.strokeStyle = `rgba(140, 230, 255, ${lineAlpha})`;
        ctx.lineWidth = 1.2;
        if (!_mobPerf) ctx.shadowColor = '#40ccff';
        if (!_mobPerf) ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.stroke();
    });
    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw constellation stars, rực rỡ, nhấp nháy như ánh sáng cuối đường
    piscesStars.forEach(([sx, sy, mag], idx) => {
        const px = offX + sx * scale;
        const py = offY + sy * scale;

        // Nhấp nháy: dim xuống rồi sáng lại, mỗi sao lệch pha
        const t = now / 1000 + idx * 0.73;
        // "Ánh sáng cuối con đường", gần như tắt hẳn rồi bùng sáng lại
        const raw = Math.sin(t) * Math.sin(t * 0.7) * Math.sin(t * 1.3);
        const twinkle = 0.35 + 0.65 * (raw * 0.5 + 0.5);

        const r = Math.max(1.8, (5.2 - mag) * 1.1); // kích thước theo magnitude
        const baseAlpha = (5.5 - mag) / 4.5; // sao sáng hơn = alpha cao hơn

        ctx.save();

        // Diffraction spikes + halo (skip on mobile)
        if (!_mobPerf) {
            if (mag < 3.8) {
                ctx.globalAlpha = twinkle * baseAlpha * 0.55;
                ctx.strokeStyle = '#c0eeff';
                ctx.lineWidth = 0.8;
                const spikeLen = r * 4.5 * twinkle;
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
            ctx.beginPath(); ctx.arc(px, py, haloR, 0, Math.PI * 2); ctx.fill();
        }

        // Core star, sáng rõ
        ctx.globalAlpha = twinkle * Math.min(1, baseAlpha * 1.3);
        const cG = ctx.createRadialGradient(px, py, 0, px, py, r * 1.6);
        cG.addColorStop(0, '#ffffff');
        cG.addColorStop(0.25, '#d0f0ff');
        cG.addColorStop(0.7, 'rgba(80,200,255,0.5)');
        cG.addColorStop(1, 'transparent');
        ctx.fillStyle = cG;
        ctx.beginPath(); ctx.arc(px, py, r * 1.6, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    });

    // Subtle "PISCES" label near constellation
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = `rgba(100,200,255,${0.25 + 0.12 * Math.sin(now / 2000)})`;
    ctx.letterSpacing = '3px';
    ctx.fillText('♓  PISCES', offX + piscesStars[14][0] * scale + 30, offY + piscesStars[14][1] * scale - 14);
    ctx.restore();

    // Title text
    ctx.save();
    ctx.textAlign = 'center';

    // Subtle glow behind title
    if (!_mobPerf) ctx.shadowColor = '#00ddff';
    if (!_mobPerf) ctx.shadowBlur = 38;
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

// Aegis lasers
// Leviathan standalone effects (survive enemy death)
function _drawLeviathanEffects() {
    const now = performance.now();
    const len = Math.hypot(canvas.width, canvas.height) * 1.5;

    // Perseverance charge warning (full circle spin, báo hiệu quét 360°)
    enemies.forEach(e => {
        if (e.type !== 'leviathan') return;
        if (!e.perseveranceCharging) return;

        const prog = Math.min(1, (now - e.perseveranceChargeStart) / 1000);
        const glowColor = '#ff0000';

        ctx.save();
        ctx.translate(e.x, e.y);

        // Full circle warning pulse, expanding ring
        ctx.globalAlpha = prog * 0.25;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3 + prog * 8;
        if (!_mobPerf) ctx.shadowColor = glowColor; if (!_mobPerf) ctx.shadowBlur = 20;
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
        if (!_mobPerf) ctx.shadowColor = glowColor; if (!_mobPerf) ctx.shadowBlur = 40;
        ctx.fillStyle = 'rgba(255,0,0,0.5)';
        ctx.beginPath(); ctx.arc(0, 0, e.size * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // Perseverance sweep beams (objects độc lập trong _levPersBeams)
    if (window._levPersBeams) {
        window._levPersBeams.forEach(beam => {
            if (beam.done) return;
            // sweepCurrent được update bởi main.js mỗi frame
            const sweepAngle = beam.sweepCurrent !== undefined ? beam.sweepCurrent
                : (beam.sweepOrigin + (beam.progress || 0) * Math.PI * 2);

            // Luôn đỏ, cả lúc announce lẫn post-shield
            const laserGlow = '#ff0000';
            const laserCore = 'rgba(255,30,0,0.95)';
            const laserOuter = 'rgba(255,0,0,0.2)';

            ctx.save();
            ctx.translate(beam.ox, beam.oy);
            ctx.rotate(sweepAngle);

            // Wide outer glow
            if (!_mobPerf) ctx.shadowColor = laserGlow; if (!_mobPerf) ctx.shadowBlur = 60;
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

    // Death lasers, with wing rotation animation
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
            // Wing shape rotating into position
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
            if (!_mobPerf) ctx.shadowColor = '#ff4400';
            if (!_mobPerf) ctx.shadowBlur = 8 + warnProg * 20;
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
            if (!_mobPerf) ctx.shadowColor = '#ff4400'; if (!_mobPerf) ctx.shadowBlur = 12;
            ctx.setLineDash([10, 7]);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Active laser beam
            ctx.rotate(targetA);
            ctx.globalAlpha = activeFade;
            if (!_mobPerf) ctx.shadowColor = '#ff2200'; if (!_mobPerf) ctx.shadowBlur = 40;
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
            if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 8;
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
            if (!_mobPerf) ctx.shadowColor = "red";
            if (!_mobPerf) ctx.shadowBlur = 40;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            // core beam
            ctx.strokeStyle = `rgba(255,80,80,${prog})`;
            ctx.lineWidth = 30 * prog;
            if (!_mobPerf) ctx.shadowBlur = 20;
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

// Persian/Moroccan tile pattern helper
// Vẽ một tile hoa văn Ba Tư tại (tx,ty), kích thước tileSize, với alpha và màu chủ
function _drawPersianTile(tx, ty, tileSize, baseAlpha, hue) {
    const h = tileSize / 2;
    const q = tileSize / 4;
    const e = tileSize / 8;

    ctx.save();
    ctx.translate(tx, ty);

    // Outer diamond frame
    ctx.strokeStyle = `hsla(${hue},70%,55%,${baseAlpha * 0.9})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(h, 0);
    ctx.lineTo(0, h); ctx.lineTo(-h, 0);
    ctx.closePath(); ctx.stroke();

    // Inner square (rotated 45° = diamond)
    const iS = h * 0.55;
    ctx.strokeStyle = `hsla(${hue + 20},65%,65%,${baseAlpha * 0.7})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -iS); ctx.lineTo(iS, 0);
    ctx.lineTo(0, iS); ctx.lineTo(-iS, 0);
    ctx.closePath(); ctx.stroke();

    // 4-petal flower (arabesque)
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

    // Center cross
    ctx.strokeStyle = `hsla(${hue},80%,80%,${baseAlpha * 0.6})`;
    ctx.lineWidth = 0.8;
    const cs = h * 0.18;
    ctx.beginPath();
    ctx.moveTo(-cs, 0); ctx.lineTo(cs, 0);
    ctx.moveTo(0, -cs); ctx.lineTo(0, cs);
    ctx.stroke();

    // 4 corner accent dots
    const dotR = h * 0.07;
    ctx.fillStyle = `hsla(${hue + 40},80%,80%,${baseAlpha * 0.7})`;
    for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(pa) * h * 0.7, Math.sin(pa) * h * 0.7, dotR, 0, Math.PI * 2);
        ctx.fill();
    }

    // 8-fold star lines
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

// Dimensional Rift, full animated ctx render (always active, drawn before enemies)
function _drawDimensionalRiftsCtx() {
    if (!dimensionalRifts || !dimensionalRifts.length) return;
    ctx.save();
    for (const rift of dimensionalRifts) {
        const lifeRatio = rift.timer / rift.maxTimer;
        const alpha = lifeRatio < 0.167 ? lifeRatio / 0.167 : 1;
        const r = rift.radius;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Void core
        const grad = ctx.createRadialGradient(rift.x, rift.y, 0, rift.x, rift.y, r * 1.25);
        grad.addColorStop(0,    'rgba(2,1,5,1)');
        grad.addColorStop(0.60, 'rgba(60,9,108,0.5)');
        grad.addColorStop(1,    'rgba(36,0,70,0.3)');
        ctx.beginPath();
        ctx.arc(rift.x, rift.y, r * 1.25, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // pulsing inner black circle
        const pulse = 1 + Math.sin((rift._age || 0) * 2.5) * 0.05;
        ctx.beginPath();
        ctx.arc(rift.x, rift.y, r * 0.75 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(2,1,5,1)';
        ctx.fill();

        // Energy ring (rotates)
        ctx.save();
        ctx.translate(rift.x, rift.y);
        ctx.rotate(rift._ringRot || 0);

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,245,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(157,78,221,0.7)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        for (let i = 0; i < 12; i++) {
            const ang   = (i / 12) * Math.PI * 2;
            const inner = r * 0.78;
            const outer = r * (1.0 + (i % 3 === 0 ? 0.08 : 0.04));
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
            ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
            ctx.strokeStyle = 'rgba(224,170,255,0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();

        // Cracks (redrawn each frame with 18% glitch chance)
        const triggerGlitch = Math.random() < 0.18;
        ctx.save();
        ctx.translate(rift.x, rift.y);
        for (const crack of rift.cracksInfo) {
            const cAngle = crack.baseAngle + (triggerGlitch ? (Math.random() - 0.5) * 0.2 : 0);
            const cLen   = crack.maxLength  * (triggerGlitch ? (0.85 + Math.random() * 0.3) : 1);
            let lastX = 0, lastY = 0;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let s = 1; s <= 4; s++) {
                const ratio   = s / 4;
                const tx      = Math.cos(cAngle) * cLen * ratio;
                const ty      = Math.sin(cAngle) * cLen * ratio;
                const jitter  = s < 4 ? (r * 0.22) : 0;
                const offset  = (Math.random() - 0.5) * jitter;
                lastX = tx + (-Math.sin(cAngle) * offset);
                lastY = ty + ( Math.cos(cAngle) * offset);
                ctx.lineTo(lastX, lastY);
            }
            ctx.strokeStyle = triggerGlitch ? 'rgba(255,255,255,0.85)' : 'rgba(216,0,255,0.85)';
            ctx.lineWidth   = triggerGlitch ? 3.0 : 1.5;
            ctx.stroke();

            if (crack.hasSubBranch && triggerGlitch) {
                const bAngle = cAngle + (Math.random() > 0.5 ? 0.5 : -0.5);
                ctx.beginPath();
                ctx.moveTo(lastX * 0.5, lastY * 0.5);
                ctx.lineTo(lastX * 0.5 + Math.cos(bAngle) * 20, lastY * 0.5 + Math.sin(bAngle) * 20);
                ctx.strokeStyle = 'rgba(0,245,255,0.7)';
                ctx.lineWidth   = 1.2;
                ctx.stroke();
            }
        }
        ctx.restore();

        // Particles
        for (const p of (rift._particles || [])) {
            ctx.globalAlpha = alpha * Math.max(0, p.life);
            ctx.fillStyle   = p.isCyan ? '#00e5ff' : '#ff007f';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2 + Math.random() * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    ctx.restore();
}

// Dimension Break zones: lingering arcs left by Egregor's Null Slash
function _drawDimBreakZones() {
    if (!window._dimBreakZones || window._dimBreakZones.length === 0) return;
    const now = performance.now();
    for (const dbz of window._dimBreakZones) {
        const dbAlpha = Math.max(0, (dbz.expireAt - now) / 1000);
        if (dbAlpha <= 0) continue;
        ctx.save();
        ctx.lineCap = 'round';
        const dbEnd = dbz.arcStart + Math.PI;

        ctx.globalAlpha = dbAlpha * 0.30;
        ctx.strokeStyle = 'rgba(110,0,190,1)';
        ctx.lineWidth = 32;
        if (!_mobPerf) { ctx.shadowColor = '#6600cc'; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.arc(dbz.cx, dbz.cy, dbz.arcR, dbz.arcStart, dbEnd); ctx.stroke();

        if (_gfxLevel < 2) {
            ctx.globalAlpha = dbAlpha * 0.80;
            ctx.strokeStyle = 'rgba(195,90,255,1)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = _mobPerf ? 0 : 12;
            ctx.beginPath(); ctx.arc(dbz.cx, dbz.cy, dbz.arcR, dbz.arcStart, dbEnd); ctx.stroke();
            ctx.globalAlpha = dbAlpha * 0.40;
            ctx.strokeStyle = 'rgba(255,215,255,1)';
            ctx.lineWidth = 1.0;
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(dbz.cx, dbz.cy, dbz.arcR, dbz.arcStart, dbEnd); ctx.stroke();
        }

        if (!_mobPerf && _gfxLevel === 0) {
            const spN = 5 + Math.round(dbAlpha * 7);
            ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 8;
            for (let _si = 0; _si < spN; _si++) {
                const spA = dbz.arcStart + (_si / spN) * Math.PI + Math.sin(now * 0.003 + _si * 1.9) * 0.09;
                const spR = dbz.arcR + Math.sin(now * 0.005 + _si * 2.3) * 9;
                ctx.globalAlpha = dbAlpha * (0.45 + 0.45 * Math.abs(Math.sin(now * 0.007 + _si)));
                ctx.fillStyle = _si % 2 === 0 ? 'rgba(215,170,255,1)' : 'rgba(150,50,255,1)';
                ctx.beginPath(); ctx.arc(
                    dbz.cx + Math.cos(spA) * spR,
                    dbz.cy + Math.sin(spA) * spR,
                    Math.max(0.1, 1.4 + Math.abs(Math.sin(now * 0.004 + _si)) * 2), 0, Math.PI * 2
                ); ctx.fill();
            }
        }

        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Boss shockwaves (Maou Haki)
function drawBossShockwaves() {
    const now = performance.now();
    bossShockwaves.forEach(wave => {
        if (!wave || wave.radius <= 0) return;
        const maxR = wave.maxRadius || canvas.width;
        const prog = Math.min(1, wave.radius / maxR);
        const fade = Math.max(0, 1 - prog);

        // BTM shockwave: green expanding ring
        if (wave._isBTMWave) {
            ctx.save(); ctx.translate(wave.x, wave.y);
            const blink2 = 0.7 + 0.3 * Math.sin(now / 50);
            // Inner fill
            ctx.globalAlpha = fade * 0.18 * blink2;
            ctx.fillStyle = 'rgba(0,255,120,1)';
            ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.fill();
            // Secondary fill ring
            ctx.globalAlpha = fade * 0.1;
            ctx.fillStyle = 'rgba(200,255,230,1)';
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0, wave.radius - 20), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = fade * 0.9;
            // Outer glow ring
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 28; }
            ctx.strokeStyle = 'rgba(0,255,136,0.95)'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
            // Bright white inner edge
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0, wave.radius - 10), 0, Math.PI * 2); ctx.stroke();
            // Trailing glow arc
            ctx.strokeStyle = `rgba(45,255,115,${fade * 0.35})`; ctx.lineWidth = 18;
            ctx.beginPath(); ctx.arc(0, 0, wave.radius + 14, 0, Math.PI * 2); ctx.stroke();
            // Ornament dots every 30°
            if (!_mobPerf) {
                ctx.shadowColor = '#a7ffc5'; ctx.shadowBlur = 8;
                for (let di = 0; di < 12; di++) {
                    const da = (di / 12) * Math.PI * 2 + now / 1500;
                    ctx.fillStyle = `rgba(255,255,255,${fade * (0.5 + 0.4 * Math.sin(now / 120 + di))})`;
                    ctx.beginPath(); ctx.arc(Math.cos(da) * wave.radius, Math.sin(da) * wave.radius, 3.5, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(wave.x, wave.y);
        const blink = 0.7 + 0.3 * Math.sin(now / 40);
        ctx.globalAlpha = fade * 0.20 * blink;
        ctx.fillStyle = 'rgba(100,0,200,1)';
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // 2. Lightweight Persian arcs (8 rotating arcs, NO grid loop)
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

        // 3. Outer halo
        ctx.globalAlpha = fade * 0.28 * blink;
        ctx.strokeStyle = 'rgba(180,0,255,1)';
        ctx.lineWidth = 28;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;

        // 4. Flying sparks on outer ring
        const sparkCount = 10;
        for (let i = 0; i < sparkCount; i++) {
            // Each spark orbits at slightly different speed & radius offset
            const sparkAngle = (Math.PI * 2 / sparkCount) * i + now / (400 + i * 33);
            const rOff = wave.radius + Math.sin(now / 180 + i * 1.3) * 8;
            const sx = Math.cos(sparkAngle) * rOff;
            const sy = Math.sin(sparkAngle) * rOff;
            const sparkFade = fade * blink * (0.6 + 0.4 * Math.sin(now / 120 + i));
            // Spark body
            if (!_mobPerf) ctx.shadowColor = '#FF44FF'; if (!_mobPerf) ctx.shadowBlur = 10;
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

        // 5. Main ring
        ctx.strokeStyle = `rgba(138,43,226,${(0.7 + 0.3 * blink) * fade})`;
        ctx.lineWidth = 7;
        if (!_mobPerf) ctx.shadowColor = '#CC00FF';
        if (!_mobPerf) ctx.shadowBlur = 20 + 12 * blink;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // 6. Inner bright edge
        if (wave.radius > 12) {
            ctx.strokeStyle = `rgba(255,200,255,${fade * 0.55 * blink})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, wave.radius - 7, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.restore();
    });
}

// Chain lightning
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

// Demon Gift aura
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

// Final Defense shields
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
    if (!_mobPerf) ctx.shadowColor = color;
    if (!_mobPerf) ctx.shadowBlur = 6;

    // Connect each sentinel to its 2 nearest neighbours (not all pairs, too dense)
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

    // Iron Body flicker
    const ironActive = sentinel.ironBody && now < sentinel.ironBodyEnd;
    if (ironActive) {
        const flicker = Math.sin(now / 40) > 0; // fast blink ~12Hz
        if (!flicker) {
            // Skip drawing this frame, creates the flicker effect
            // Still draw a bright white outline so position is visible
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            if (!_mobPerf) ctx.shadowColor = '#ffffff'; if (!_mobPerf) ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
            return;
        }
        glowColor = '#ffffff'; // white glow during iron body
    }

    // Shield bubble aura (behind body)
    const _shieldVal = sentinel.shield || 0;
    if (_shieldVal > 0) {
        const _bR = size * 1.4;
        const _bPulse = 0.5 + 0.5 * Math.sin(now / 600);
        ctx.save();
        const _bGrad = ctx.createRadialGradient(x, y, _bR * 0.3, x, y, _bR);
        _bGrad.addColorStop(0,    'rgba(255,220,60,0.02)');
        _bGrad.addColorStop(0.60, 'rgba(255,215,0,0.04)');
        _bGrad.addColorStop(0.88, 'rgba(255,215,0,0.10)');
        _bGrad.addColorStop(1,    `rgba(255,215,0,${0.22 * _bPulse})`);
        ctx.fillStyle = _bGrad;
        ctx.beginPath(); ctx.arc(x, y, _bR, 0, Math.PI * 2); ctx.fill();
        if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6; }
        ctx.strokeStyle = `rgba(255,215,0,${0.35 * _bPulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, _bR, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);

    // body glow ring (always)
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

    // multi-layer body
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

    // gun arm
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

    // HP bar
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

    // Shield bar (above HP bar)
    const shieldVal = sentinel.shield || 0;
    if (shieldVal > 0) {
        const shBarH = 3;
        const shBarY = barY - shBarH - 2;
        const shPct = Math.min(1, shieldVal / maxHp);
        ctx.fillStyle = '#111'; ctx.fillRect(barX - 1, shBarY - 1, barW + 2, shBarH + 2);
        ctx.fillStyle = '#1a2a1a'; ctx.fillRect(barX, shBarY, barW, shBarH);
        // Color: gold for GfJ portion, teal for blessing, white for other sources
        // BUG F fix: clamp each segment so total never exceeds actual shieldVal
        const gfjAmt = Math.min(sentinel._gfjShield || 0, shieldVal);
        const blessAmt = Math.min(sentinel._blessingShield || 0, shieldVal - gfjAmt);
        const otherAmt = Math.max(0, shieldVal - gfjAmt - blessAmt);
        let drawn = 0;
        if (otherAmt > 0) {
            const w = Math.min(barW, barW * (otherAmt / maxHp));
            ctx.fillStyle = '#aaaaff'; ctx.fillRect(barX + drawn, shBarY, w, shBarH); drawn += w;
        }
        if (blessAmt > 0) {
            const w = Math.min(barW - drawn, barW * (blessAmt / maxHp));
            ctx.fillStyle = '#00ff88'; ctx.fillRect(barX + drawn, shBarY, w, shBarH); drawn += w;
        }
        if (gfjAmt > 0) {
            const w = Math.min(barW - drawn, barW * (gfjAmt / maxHp));
            ctx.fillStyle = '#ffe066'; ctx.fillRect(barX + drawn, shBarY, w, shBarH);
        }
        ctx.strokeStyle = '#555'; ctx.lineWidth = 0.6;
        ctx.strokeRect(barX, shBarY, barW, shBarH);
    }

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
        if (!_mobPerf) ctx.shadowColor = '#FFA500'; if (!_mobPerf) ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(x, y, size + 9, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Domain purple ally tint
    if (skillShiftActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(140,0,255,0.28)';
        ctx.beginPath(); ctx.arc(x, y, size * 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,80,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, size * 1.2, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // Blessing of the Primordial, green outer ring + shield glow
    if (sentinel._blessingDR && sentinel._blessingDR > 0) {
        ctx.save();
        const bPulse = 0.55 + 0.45 * Math.sin(now / 700);
        // Outer blessing ring
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8; }
        ctx.strokeStyle = `rgba(0,255,136,${0.6 * bPulse})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -(now / 80) % 8;
        ctx.beginPath(); ctx.arc(x, y, size + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.shadowBlur = 0;
        // Shield glow (brighter when _blessingShield is full 50)
        if (sentinel._blessingShield && sentinel._blessingShield > 0) {
            const shFrac = sentinel._blessingShield / 50;
            ctx.fillStyle = `rgba(0,255,136,${0.08 * shFrac * bPulse})`;
            ctx.beginPath(); ctx.arc(x, y, size * 1.1, 0, Math.PI * 2); ctx.fill();
        }
        // Leviathan bonus: extra gold tinge
        const _levPresent = enemies && enemies.some(e => e.type === 'leviathan' && e.hp > 0);
        if (_levPresent) {
            ctx.strokeStyle = `rgba(255,215,0,${0.5 * bPulse})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(x, y, size + 11, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    // GfJ shield glow ring
    if (sentinel._gfjShield && sentinel._gfjShield > 0) {
        ctx.save();
        const gPulse = 0.6 + 0.4 * Math.sin(now / 400);
        if (!_mobPerf) { ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 10; }
        ctx.strokeStyle = `rgba(255,224,102,${0.75 * gPulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.lineDashOffset = (now / 60) % 8;
        ctx.beginPath(); ctx.arc(x, y, size + 14, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Bullets (no shadowBlur – use gradient layers for depth)
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
    ctx.drawImage(_bs, b.x - _bs.width / 2, b.y - _bs.height / 2);
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
function drawPlayer(alpha = 1, xOffset = 0) {
    const now = performance.now();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(player.x + xOffset, player.y);

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

// Aegis Core
function drawAegisCore(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const now = performance.now();
    const auraRadius = canvas.width / 2;
    const r = enemy.size;

    // 1. AURA ZONE BACKGROUND (red tint)
    const zoneGrad = ctx.createRadialGradient(0, 0, r, 0, 0, auraRadius);
    zoneGrad.addColorStop(0, 'rgba(255,0,0,0.02)');
    zoneGrad.addColorStop(0.7, 'rgba(200,0,0,0.04)');
    zoneGrad.addColorStop(1, 'rgba(220,0,0,0.16)');
    ctx.fillStyle = zoneGrad;
    ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.fill();

    // 2. LIMIT BOUNDARY RING (red)
    ctx.strokeStyle = 'rgba(255,40,40,0.85)';
    ctx.lineWidth = 2.5;
    if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 18; }
    ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Rotating gold dashed inner ring
    ctx.save();
    ctx.rotate(now / 5000);
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 12, 4, 12]);
    ctx.beginPath(); ctx.arc(0, 0, auraRadius - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 4 mechanical bracket locks on aura edge
    ctx.save();
    ctx.rotate(-now / 8000);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, i * Math.PI / 2 - 0.08, i * Math.PI / 2 + 0.08);
        ctx.stroke();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(Math.cos(i * Math.PI / 2) * (auraRadius - 14),
            Math.sin(i * Math.PI / 2) * (auraRadius - 14), 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 3. CIRCULAR PULSE WAVES (gold → red)
    if (!enemy._aegisPulses) enemy._aegisPulses = [];
    if (!enemy._lastPulseSpawn || now - enemy._lastPulseSpawn > 1500) {
        enemy._aegisPulses.push({ startTime: now, duration: 1400, startR: r * 1.2, endR: auraRadius });
        enemy._lastPulseSpawn = now;
    }
    for (let pi = enemy._aegisPulses.length - 1; pi >= 0; pi--) {
        const p = enemy._aegisPulses[pi];
        const elapsed = now - p.startTime;
        const tp = elapsed / p.duration;
        if (tp >= 1) { enemy._aegisPulses.splice(pi, 1); continue; }
        const easeT = 1 - Math.pow(1 - tp, 2.5);
        const currentR = p.startR + easeT * (p.endR - p.startR);
        const alpha = (1 - tp) * 0.75;
        const gCol = Math.floor(215 * (1 - tp));
        const pulseColor = `rgba(255,${gCol},0,${alpha})`;
        ctx.save();
        if (!_mobPerf) { ctx.shadowColor = pulseColor; ctx.shadowBlur = 10 * (1 - tp); }
        ctx.strokeStyle = pulseColor; ctx.lineWidth = 4 * (1 - tp) + 1;
        ctx.beginPath(); ctx.arc(0, 0, currentR, 0, Math.PI * 2); ctx.stroke();
        ctx.save();
        ctx.rotate(tp * Math.PI * 0.5);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([5 + tp * 15, 8 + tp * 5]);
        ctx.beginPath(); ctx.arc(0, 0, currentR * 0.94, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        if (!_mobPerf) {
            ctx.strokeStyle = `rgba(255,${gCol},0,${alpha * 0.25})`; ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            for (let s = 0; s < 12; s++) {
                const a = (s / 12) * Math.PI * 2 + now / 4000;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * p.startR, Math.sin(a) * p.startR);
                ctx.lineTo(Math.cos(a) * currentR, Math.sin(a) * currentR);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 4. CUSTOS AETERNUS SHIELD (gold, Iron Body)
    if (enemy.aegisInvulnerable) {
        ctx.save();
        const shieldR = r * 1.6;
        const shieldPulse = 0.8 + 0.2 * Math.sin(now / 150);
        if (!_mobPerf) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 25; }
        ctx.strokeStyle = `rgba(255,215,0,${shieldPulse})`; ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(255,215,0,0.08)';
        ctx.beginPath(); ctx.arc(0, 0, shieldR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.rotate(now / 3000);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
        if (!_mobPerf) ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const nextA = ((i + 3) / 12) * Math.PI * 2;
            ctx.moveTo(Math.cos(a) * shieldR, Math.sin(a) * shieldR);
            ctx.lineTo(Math.cos(nextA) * shieldR, Math.sin(nextA) * shieldR);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 5. ARMILLARY RINGS
    ctx.save();
    if (!_mobPerf) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = 'rgba(200,200,220,0.8)'; ctx.lineWidth = 2.5;
    ctx.save();
    ctx.rotate(now / 1500);
    ctx.scale(1, 0.3 + 0.1 * Math.sin(now / 1000));
    ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(-now / 1800 + Math.PI / 4);
    ctx.scale(0.35 + 0.15 * Math.sin(now / 1200), 1);
    ctx.strokeStyle = 'rgba(255,100,100,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. MAIN BODY SHELL
    const shellGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
    shellGrad.addColorStop(0, '#e0e0e0'); shellGrad.addColorStop(0.5, '#7a7a7a');
    shellGrad.addColorStop(0.85, '#2b2b2b'); shellGrad.addColorStop(1, '#050505');
    ctx.fillStyle = shellGrad; ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.rotate(-now / 4000);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
        ctx.stroke();
    }
    ctx.restore();

    // 7. MECHANICAL IRIS + CORE
    const innerR = r * 0.45;
    ctx.fillStyle = '#050000';
    ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.fill();
    const coreBeat = 0.85 + 0.2 * Math.abs(Math.sin(now / 750));
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR * coreBeat);
    coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(0.2, '#ffdd44');
    coreGrad.addColorStop(0.5, '#ff2200'); coreGrad.addColorStop(1, 'transparent');
    if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 20; }
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, innerR * coreBeat, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.rotate(now / 2000);
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#ff8888'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate((i / 6) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(innerR * 0.4, 0);
        ctx.lineTo(innerR, -innerR * 0.4);
        ctx.lineTo(innerR, innerR * 0.4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.2 * Math.sin(now / 100)})`;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}
// Enemy dispatcher
function drawEnemy(enemy) {
    // Abyssal Chain render
    if (enemy.type === 'abyssal_chain') {
        const now0 = performance.now();
        const pulse = 0.6 + 0.4 * Math.sin(now0 / 60);
        const dark = !!enemy.isDarkened;

        // Trailing sparks
        const trailCount = _mobPerf ? 3 : 6;
        for (let t = 1; t <= trailCount; t++) {
            const tf = t / trailCount;
            const tx = enemy.x - enemy.vx * tf * 0.5;
            const ty = enemy.y - enemy.vy * tf * 0.5;
            ctx.save();
            ctx.globalAlpha = (1 - tf) * 0.75;
            if (!_mobPerf) { ctx.shadowColor = dark ? '#ff0000' : '#dd00ff'; ctx.shadowBlur = 14; }
            ctx.fillStyle = dark ? (tf < 0.4 ? '#ff4444' : '#550000') : (tf < 0.4 ? '#ff88ff' : '#9900cc');
            ctx.beginPath();
            ctx.arc(tx, ty, Math.max(1, enemy.size * (1 - tf * 0.6) * 0.38), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Darkened chain: red smoke aura
        if (dark && !_mobPerf) {
            const smokeCount = 4;
            for (let si = 0; si < smokeCount; si++) {
                const sAng = now0 / 300 + si * Math.PI * 0.5;
                const sr = enemy.size * (0.9 + 0.4 * Math.sin(now0 / 200 + si));
                ctx.save();
                ctx.globalAlpha = 0.16 + 0.09 * Math.abs(Math.sin(now0 / 150 + si));
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#3a0000';
                ctx.beginPath();
                ctx.arc(enemy.x + Math.cos(sAng) * sr, enemy.y + Math.sin(sAng) * sr, enemy.size * 0.52, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Triangle molecule particles
        if (enemy.molParticles && enemy.molParticles.length > 0) {
            for (const mp of enemy.molParticles) {
                const alpha = Math.min(1, mp.life / mp.maxLife) * 0.9;
                const blink = 0.5 + 0.5 * Math.abs(Math.sin(now0 / 100 + mp.x * 0.1));
                ctx.save();
                ctx.globalAlpha = alpha * blink;
                ctx.translate(mp.x, mp.y);
                ctx.rotate(mp.angle);
                if (!_mobPerf) { ctx.shadowColor = mp.col; ctx.shadowBlur = 8; }
                ctx.fillStyle = mp.col;
                const s = mp.size;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.866, s * 0.5);
                ctx.lineTo(-s * 0.866, s * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // Darkened chain: chaos energy particles
        if (dark) {
            const chaosCount = _mobPerf ? 2 : 5;
            for (let ci = 0; ci < chaosCount; ci++) {
                const cAng = now0 / 80 + ci * 1.257;
                const cr = enemy.size * (0.5 + 0.8 * ((ci * 0.37) % 1));
                ctx.save();
                ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(now0 / 60 + ci));
                if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 6; }
                ctx.fillStyle = ci % 2 === 0 ? '#cc0000' : '#1a0000';
                ctx.beginPath();
                ctx.arc(enemy.x + Math.cos(cAng) * cr, enemy.y + Math.sin(cAng) * cr, 2 + ci * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Rope from Dargruel to chain head
        const ox = enemy.ownerRef ? enemy.ownerRef.x : enemy.originX;
        const oy = enemy.ownerRef ? enemy.ownerRef.y : enemy.originY;
        ctx.save();
        const dx = enemy.x - ox, dy = enemy.y - oy;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
            const segs = Math.max(3, Math.floor(dist / 24));
            if (!_mobPerf) { ctx.shadowColor = dark ? '#aa0000' : '#cc00ff'; ctx.shadowBlur = 12; }
            ctx.strokeStyle = dark ? `rgba(160,0,0,${0.7 + pulse * 0.2})` : `rgba(180,0,255,${0.6 + pulse * 0.2})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            for (let s = 1; s <= segs; s++) {
                const t = s / segs;
                const jitter = s < segs ? Math.sin(now0 / 100 + s * 2.1) * 6 : 0;
                ctx.lineTo(ox + dx * t - (dy / dist) * jitter, oy + dy * t + (dx / dist) * jitter);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();

        // Chain head
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        const angle = Math.atan2(enemy.vy, enemy.vx);
        ctx.rotate(angle);
        if (dark) {
            if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 32; }
            ctx.fillStyle = `rgba(120,0,0,${0.22 + pulse * 0.1})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 2.3, enemy.size * 1.05, 0, 0, Math.PI * 2);
            ctx.fill();
            if (!_mobPerf) ctx.shadowBlur = 24;
            ctx.fillStyle = `rgba(75,0,0,${0.94 + pulse * 0.06})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 1.75, enemy.size * 0.78, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(220,0,30,${0.92 + pulse * 0.08})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0d0000';
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 0.55, enemy.size * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,80,80,${0.5 + pulse * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(-enemy.size * 0.22, -enemy.size * 0.14, enemy.size * 0.2, enemy.size * 0.11, -0.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            if (!_mobPerf) { ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 32; }
            ctx.fillStyle = `rgba(180,0,255,${0.22 + pulse * 0.1})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 2.3, enemy.size * 1.05, 0, 0, Math.PI * 2);
            ctx.fill();
            if (!_mobPerf) ctx.shadowBlur = 24;
            ctx.fillStyle = `rgba(110,0,210,${0.94 + pulse * 0.06})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 1.75, enemy.size * 0.78, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(240,120,255,${0.92 + pulse * 0.08})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#07001a';
            ctx.beginPath();
            ctx.ellipse(0, 0, enemy.size * 0.55, enemy.size * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(245,170,255,${0.5 + pulse * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(-enemy.size * 0.22, -enemy.size * 0.14, enemy.size * 0.2, enemy.size * 0.11, -0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        return;
    }

    // Thủ Lĩnh Bầy Đàn (Leviathan Envy): white pulsing ring
    if (enemy.levEnvy) {
        const now0 = performance.now();
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(now0 / 400 + enemy.x * 0.01));
        const r0 = (enemy.size / 2) + 8;
        ctx.save();
        ctx.globalAlpha = 1;

        // Outer glow ring
        if (!_mobPerf) ctx.shadowColor = '#ffffff';
        if (!_mobPerf) ctx.shadowBlur = 16;
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
        if (!_mobPerf) ctx.shadowColor = '#aaccff'; if (!_mobPerf) ctx.shadowBlur = 8;
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
        if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 10;
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
            if (!_mobPerf) ctx.shadowColor = '#ff0022'; if (!_mobPerf) ctx.shadowBlur = 16;
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

    // Boss aura (HIGH + MED)
    if (_gfxLevel < 2) {
        const _bossTypes = { boss:[255,80,0], thaelis:[255,200,0], marchosias:[0,255,120], leviathan:[0,180,255], veilshroud:[160,0,255], aegis_core:[0,220,255] };
        const _bossCol = _bossTypes[enemy.type];
        if (_bossCol) {
            const nowB = performance.now();
            const bAP = 0.10 + 0.06 * Math.sin(nowB / 420);
            const bAR = (enemy.size / 2) * 2.6;
            const [bar, bag, bab] = _bossCol;
            const bAG = ctx.createRadialGradient(enemy.x, enemy.y, (enemy.size / 2) * 0.7, enemy.x, enemy.y, bAR);
            bAG.addColorStop(0, `rgba(${bar},${bag},${bab},${bAP * 1.8})`);
            bAG.addColorStop(1, `rgba(${bar},${bag},${bab},0)`);
            ctx.save();
            ctx.fillStyle = bAG;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, bAR, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // Spawn warp-in contracting ring (HIGH only, first 600ms)
    if (_gfxLevel < 1 && !enemy.type.startsWith('enemy_bullet') && enemy.type !== 'abyssal_chain') {
        if (!enemy._spawnTime) enemy._spawnTime = performance.now();
        const _spawnElapsed = performance.now() - enemy._spawnTime;
        if (_spawnElapsed < 600) {
            const sp = _spawnElapsed / 600;
            const spR = (enemy.size / 2) * (3.0 * (1 - sp) + 0.9);
            ctx.save();
            ctx.globalAlpha = (1 - sp) * 0.9;
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 2.5 * (1 - sp) + 0.5;
            if (!_mobPerf) { ctx.shadowColor = 'white'; ctx.shadowBlur = 20; }
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, spR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
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
    } else if (enemy.type === 'veilshroud') {
        _drawVeilshroud(enemy);
    } else if (enemy.type === 'veilshroud_echo') {
        _drawVeilshroudEcho(enemy);
    } else if (enemy.type === 'egregor') {
        _drawEgregor(enemy);
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
        if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 12;
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

    // MARCHOSIAS ghost zones, 1 code path duy nhất (freeze khi windup, shrink sau khi bắn)
    if (enemy.type === 'marchosias' && enemy._ghostWindups && enemy._ghostWindups.length > 0) {
        const halfW = 36;
        for (const gw of enemy._ghostWindups) {
            const frozen = gw.freezeTimer > 0;
            const alpha = frozen ? 1.0 : Math.max(0, gw.fadeTimer / gw.maxFade);
            if (alpha <= 0) continue;
            // Khi frozen: origin theo vị trí Mar hiện tại (Mar đang di chuyển)
            // Khi fade: origin đã được lock tại vị trí Mar lúc chém ra
            const ox = frozen ? enemy.x : gw.originX;
            const oy = frozen ? enemy.y : gw.originY;
            const angle4 = Math.atan2(gw.targetY - oy, gw.targetX - ox);
            const len4 = Math.hypot(gw.targetX - ox, gw.targetY - oy) + 80;
            // Khi frozen: full corridor, sau khi bắn: shrink từ phía Mar ra target
            const visStart = frozen ? 0 : (1 - alpha) * len4;
            const visLen = len4 - visStart;
            if (visLen <= 0) continue;
            ctx.save();
            ctx.globalAlpha = alpha * 0.55 + 0.35;
            ctx.translate(ox, oy);
            ctx.rotate(angle4);
            ctx.beginPath();
            ctx.rect(visStart, -halfW - 1, visLen + 1, halfW * 2 + 2);
            ctx.clip();
            ctx.fillStyle = 'rgba(255,140,0,0.45)';
            ctx.fillRect(visStart, -halfW, visLen, halfW * 2);
            ctx.strokeStyle = 'rgba(255,220,120,0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([14, 8]);
            ctx.beginPath(); ctx.moveTo(visStart, 0); ctx.lineTo(len4, 0); ctx.stroke();
            ctx.setLineDash([]);
            // Outer dashed lines: only during freeze (windup). After blade fires they're drawn on the blade itself.
            if (frozen) {
                ctx.strokeStyle = 'rgba(255,210,0,0.92)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([10, 6]);
                ctx.beginPath();
                ctx.moveTo(visStart, -halfW); ctx.lineTo(len4, -halfW);
                ctx.moveTo(visStart, halfW);  ctx.lineTo(len4, halfW);
                ctx.stroke();
                ctx.setLineDash([]);
            }
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

    // Thaelis keeps old render
    if (!isBoss) {
        const rotSpeed = 3000;
        const rotation = now / rotSpeed;
        const color1 = '#FFD700';
        const color2 = '#FFA500';
        const r = enemy.size / 2;

        const haloAlpha = 0.15 + 0.1 * Math.abs(Math.sin(now / 400));
        ctx.save();
        ctx.fillStyle = `rgba(255,200,0,${haloAlpha})`;
        if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        drawPolygon(enemy.x, enemy.y, r, 8, rotation, color1, color2);
        ctx.save(); ctx.globalAlpha = 0.55;
        drawPolygon(enemy.x, enemy.y, r * 0.55, 8, -rotation * 1.3, color2, color1);
        ctx.restore();
        ctx.save();
        const cg = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, r * 0.28);
        cg.addColorStop(0, 'white'); cg.addColorStop(0.5, color1); cg.addColorStop(1, color2);
        ctx.fillStyle = cg;
        if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        const hpPct2 = enemy.hp / enemy.maxHp;
        if (hpPct2 < 0.6) {
            const pulse2 = Math.abs(Math.sin(now / 180)) * 10;
            ctx.save(); ctx.fillStyle = `rgba(255,215,0,0.22)`;
            if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 25;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r + 12 + pulse2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ctx.save();
        const orbitR2 = r + 18;
        if (!_mobPerf) ctx.shadowColor = color1; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.fillStyle = color1;
        for (let i = 0; i < 6; i++) {
            const a = rotation * 1.5 + (i / 6) * Math.PI * 2;
            ctx.beginPath(); ctx.arc(enemy.x + Math.cos(a) * orbitR2, enemy.y + Math.sin(a) * orbitR2, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Tenacity Barrier ring, lớp khiên riêng, hiển thị bên ngoài Thaelis
        if ((enemy._tenacityBarrier || 0) > 0) {
            const _bMax = enemy._tenacityBarrierMax || enemy._tenacityBarrier;
            const _bFrac = enemy._tenacityBarrier / _bMax;
            const _bR = r + 16 + 3 * Math.sin(now / 100);
            const _bPulse = 0.70 + 0.30 * Math.sin(now / 80);
            ctx.save();
            // Outer glow
            if (!_mobPerf) { ctx.shadowColor = '#ffee33'; ctx.shadowBlur = 20 + 8 * Math.sin(now / 130); }
            // Full barrier ring (solid)
            ctx.strokeStyle = `rgba(255,230,40,${_bPulse * 0.9})`;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, _bR, 0, Math.PI * 2); ctx.stroke();
            // Depleting arc overlay (shows remaining HP fraction)
            if (_bFrac < 0.999) {
                ctx.strokeStyle = `rgba(80,40,0,0.65)`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, _bR, -Math.PI / 2 + _bFrac * Math.PI * 2, -Math.PI / 2 + Math.PI * 2);
                ctx.stroke();
            }
            // Inner shimmer ring
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(255,255,160,${_bPulse * 0.45})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, _bR - 6, 0, Math.PI * 2); ctx.stroke();
            // Rotating energy sparks on the ring
            if (!_mobPerf) {
                ctx.fillStyle = `rgba(255,240,80,${_bPulse * 0.85})`;
                for (let _i = 0; _i < 6; _i++) {
                    const _sA = (now / 500) + _i * Math.PI / 3;
                    ctx.beginPath();
                    ctx.arc(enemy.x + Math.cos(_sA) * _bR, enemy.y + Math.sin(_sA) * _bR, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        return;
    }

    // NEW DARGRUEL DESIGN
    const r = enemy.size / 2;
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // 1. Abyss aura (outer glow)
    ctx.fillStyle = `rgba(138,43,226,${0.12 + 0.08 * pulse})`;
    if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 25; }
    ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Maître Suprême shield ring, scales with sentinel count
    const activeSentinels = typeof sentinels !== 'undefined' ? sentinels.length : 0;
    if (activeSentinels > 0) {
        const drLevel = Math.min(activeSentinels, 18);
        ctx.save();
        ctx.rotate(now / 1200);
        ctx.strokeStyle = `rgba(180,0,255,${0.3 + 0.03 * drLevel})`;
        ctx.lineWidth = 2 + drLevel * 0.15;
        ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // 3. Main octagon body
    const rot = now / 3500;
    ctx.rotate(rot);
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    bodyGrad.addColorStop(0, '#15002a');
    bodyGrad.addColorStop(0.7, '#2d004d');
    bodyGrad.addColorStop(1, '#0d001a');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#6a0dad';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // 4. Counter-rotating inner octagon + veins
    ctx.save();
    ctx.rotate(-rot * 2.5);
    ctx.strokeStyle = '#8A2BE2'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        i === 0 ? ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75)
            : ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
    }
    ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(138,43,226,0.4)';
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
        ctx.lineTo(Math.cos(a + Math.PI) * r * 0.75, Math.sin(a + Math.PI) * r * 0.75);
        ctx.stroke();
    }
    ctx.restore();

    // 5. Abyss Eye core
    const coreR = r * 0.35;
    const corePulse = 0.85 + 0.15 * Math.sin(now / 150);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * corePulse);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, '#df88ff');
    coreGrad.addColorStop(0.7, '#4B0082');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    if (!_mobPerf) { ctx.shadowColor = '#df88ff'; ctx.shadowBlur = 15; }
    ctx.beginPath(); ctx.arc(0, 0, coreR * corePulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // 5.5 Four directional triangles
    ctx.save();
    ctx.rotate(now / 2500);
    const triDist = coreR + 8, triSize = 14, triWidth = 12;
    const triPulse = 0.6 + 0.4 * Math.sin(now / 100);
    ctx.fillStyle = `rgba(223,136,255,${triPulse})`;
    if (!_mobPerf) { ctx.shadowColor = '#df88ff'; ctx.shadowBlur = 10; }
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.translate(triDist, 0);
        ctx.beginPath();
        ctx.moveTo(triSize, 0);
        ctx.lineTo(0, -triWidth / 2);
        ctx.lineTo(0, triWidth / 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. Chain nodes (4 ports)
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const px = Math.cos(a) * r * 0.88, py = Math.sin(a) * r * 0.88;
        ctx.fillStyle = '#07001a'; ctx.strokeStyle = '#9900ff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(223,136,255,${0.6 + 0.4 * pulse})`;
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // Low HP energy crackle
    const hpPct = enemy.hp / enemy.maxHp;
    if (hpPct < 0.4) {
        const crackleCount = Math.floor((1 - hpPct / 0.4) * 4) + 2;
        for (let c = 0; c < crackleCount; c++) {
            const a0 = (now / 180 + c * Math.PI * 2 / crackleCount) % (Math.PI * 2);
            const a1 = a0 + 0.4 + Math.sin(now / 90 + c) * 0.2;
            const cr = r + 8 + Math.sin(now / 120 + c * 1.7) * 4;
            ctx.strokeStyle = `rgba(255,80,255,${0.6 + 0.4 * Math.sin(now / 80 + c)})`;
            ctx.lineWidth = 1;
            if (!_mobPerf) { ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(0, 0, cr, a0, a1); ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}


function _drawEmbryo(enemy) {
    const now = performance.now();
    const pulse = Math.abs(Math.sin(now / 150)) * 3;

    // outer membrane glow
    ctx.save();
    ctx.fillStyle = 'rgba(138,43,226,0.18)';
    if (!_mobPerf) ctx.shadowColor = '#FF00FF'; if (!_mobPerf) ctx.shadowBlur = 20;
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
    if (!_mobPerf) ctx.shadowColor = '#FF00FF'; if (!_mobPerf) ctx.shadowBlur = 12;
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

    // LOW (tier 2+): flat circle only, no gradient, no glow, no blink
    if (_mobPerf) {
        ctx.fillStyle = isLarge ? '#dd4400' : '#cc0000';
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
    }

    // Motion trail (HIGH only)
    if (_gfxLevel < 1 && (enemy.vx || enemy.vy)) {
        const spd = Math.hypot(enemy.vx, enemy.vy) || 1;
        const ndx = -enemy.vx / spd, ndy = -enemy.vy / spd;
        for (let t = 1; t <= 3; t++) {
            const tx = enemy.x + ndx * enemy.size * t * 1.5;
            const ty = enemy.y + ndy * enemy.size * t * 1.5;
            ctx.globalAlpha = 0.22 / t;
            ctx.fillStyle = isLarge ? 'rgba(255,100,20,1)' : 'rgba(220,0,0,1)';
            ctx.beginPath(); ctx.arc(tx, ty, Math.max(1, enemy.size * (1 - t * 0.25)), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // White outline: blink only at FULL quality
    const blink = _gfxLevel >= 2 ? 0.78 : (0.55 + 0.45 * Math.sin(now / 90));
    ctx.strokeStyle = `rgba(255,255,255,${blink})`;
    ctx.lineWidth = isLarge ? 2.5 : 1.8;
    if (_gfxLevel < 1) ctx.shadowColor = 'white';
    if (_gfxLevel < 1) ctx.shadowBlur = isLarge ? 12 : 8;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size + 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // outer faint corona, FULL quality only
    if (_gfxLevel < 1) {
        ctx.fillStyle = isLarge ? 'rgba(255,100,20,0.22)' : 'rgba(220,0,0,0.2)';
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // main body gradient
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
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2); ctx.stroke();
    if (isLarge) {
        const ig = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 0.42);
        ig.addColorStop(0, 'rgba(255,240,100,0.95)');
        ig.addColorStop(1, 'rgba(255,140,0,0.5)');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.size * 0.42, 0, Math.PI * 2); ctx.fill();
    }
    // glint, FULL quality only
    if (_gfxLevel < 1) {
        ctx.fillStyle = 'rgba(255,255,200,0.4)';
        ctx.beginPath(); ctx.ellipse(enemy.x - enemy.size * 0.28, enemy.y - enemy.size * 0.28, enemy.size * 0.2, enemy.size * 0.12, -0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Marchosias
function _drawMarchosias(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Outer pulsing aura
    const haloA = 0.12 + 0.06 * Math.sin(now / 350);
    ctx.fillStyle = `rgba(0,255,120,${haloA})`;
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 18;
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

    // Core gem, green glowing orb
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, '#00ff88');
    coreGrad.addColorStop(1, '#006633');
    ctx.fillStyle = coreGrad;
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Panel detail rectangles (from ref image)
    ctx.strokeStyle = 'rgba(0,220,100,0.4)'; ctx.lineWidth = 1;
    const panelW = r * 0.35, panelH = r * 0.18;
    [[-r * 0.55, 0], [r * 0.55, 0], [0, -r * 0.55], [0, r * 0.55]].forEach(([px, py]) => {
        ctx.strokeRect(px - panelW / 2, py - panelH / 2, panelW, panelH);
    });

    // NEW: rage shimmer at low HP
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
            if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(Math.cos(ra) * rd, Math.sin(ra) * rd, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();

    // ARC BARRIER revive countdown ring
    if (enemy._arcBarrierReviveAt && (!enemy.arcBarrier || enemy.arcBarrier.hp <= 0)) {
        const _reviveRemain = Math.max(0, enemy._arcBarrierReviveAt - gameElapsedTime);
        const _reviveProg = 1 - _reviveRemain / (enemy._arcBarrierReviveDuration || 5000);
        ctx.save();
        ctx.strokeStyle = `rgba(0,255,136,${0.15 + 0.1 * Math.sin(now / 200)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * _reviveProg);
        ctx.stroke();
        ctx.restore();
    }

    // ARC BARRIER (¼ circle arc, rotates around Marchosias)
    if (enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
        const shieldR = r + 16;
        const sa = enemy.arcBarrier.angle - Math.PI / 4;
        const ea = enemy.arcBarrier.angle + Math.PI / 4;
        const shieldPct = enemy.arcBarrier.hp / enemy.arcBarrier.maxHp;

        ctx.save();
        // Outer glow
        ctx.strokeStyle = `rgba(0,255,136,${0.3 + shieldPct * 0.3})`;
        ctx.lineWidth = 14;
        if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, shieldR, sa, ea); ctx.stroke();

        // Main arc bright
        ctx.strokeStyle = `rgba(160,255,200,${0.7 + shieldPct * 0.25})`;
        ctx.lineWidth = 5;
        if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 10;
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
        ctx.fillText('BARRIER', enemy.x, by - 2);

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

// Marchosias Minion (Robot Mini)
// Vulnerability Icon (Trọng Thương)
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

    // Nền tròn tối
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,0,3,0.82)';
    ctx.fill();

    // Viền đỏ + glow
    ctx.strokeStyle = '#ff1a40';
    ctx.lineWidth = 1.8;
    if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // LED dots top & bottom (từ design)
    for (const [lx, ly] of [[0, -R + 1.5], [0, R - 1.5]]) {
        ctx.fillStyle = '#ff1a40';
        if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Trái tim bị chẻ đôi (hai nửa lệch nhau)
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
        if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 6;
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
        if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(0, -9 * s); ctx.lineTo(0, 11 * s);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();
    };

    drawHeart(true);
    drawHeart(false);

    // Dấu X neon laser
    const xFlare = 0.7 + 0.3 * Math.sin(now / 120);
    if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 10 * xFlare;

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

    // Stack indicator + cooldown ring
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
        if (filled) { if (!_mobPerf) ctx.shadowColor = '#ff1a40'; if (!_mobPerf) ctx.shadowBlur = 5; }
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Sword queue counter (green) + cycle counter (gold) — always visible while barrier alive
    {
        const queueCount = (enemy.marchosiasWindups || []).length;
        const romans = ['·', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        const roman = romans[Math.min(queueCount, romans.length - 1)];
        const yOff = R + 22;
        ctx.save();
        if (queueCount > 0) {
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10; }
            ctx.fillStyle = '#00ff88';
        } else {
            ctx.fillStyle = 'rgba(0,255,136,0.35)';
        }
        ctx.font = `bold ${Math.max(11, Math.floor(R * 0.28))}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roman, 0, yOff);
        ctx.restore();
    }
    // Cycle sword counter (I–IV) in gold — visible only while barrier is alive
    if (enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
        const cycleCount = enemy._barrierSwordsThisCycle || 0;
        if (cycleCount > 0) {
            const cycleRomans = ['I', 'II', 'III', 'IV'];
            const cycleRoman = cycleRomans[Math.min(cycleCount - 1, 3)];
            const atFull = cycleCount >= 4;
            ctx.save();
            if (atFull) {
                if (!_mobPerf) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 12; }
                ctx.fillStyle = '#ffaa00';
            } else {
                ctx.fillStyle = `rgba(255,170,0,${0.3 + cycleCount * 0.15})`;
            }
            ctx.font = `bold ${Math.max(9, Math.floor(R * 0.22))}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cycleRoman, 0, R + 36);
            ctx.restore();
        }
    }

    ctx.restore();
}

function _drawMarchosiasMinion(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Blink ring to signal presence (strobe)
    const _blinkA = 0.55 + 0.45 * Math.abs(Math.sin(now / 220));
    if (_blinkA > 0.85) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,136,${(_blinkA - 0.85) * 3.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Triangular body (from ref image, image 4 small triangle robots)
    const pulse = 0.8 + 0.2 * Math.sin(now / 200);
    ctx.fillStyle = '#0d1f17';
    ctx.strokeStyle = `rgba(0,200,80,${pulse * _blinkA})`;
    ctx.lineWidth = 1.8;
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 10;
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

    // NEW: 3 orbiting micro-dots
    if (!_mobPerf) ctx.shadowColor = '#00ff88'; if (!_mobPerf) ctx.shadowBlur = 6;
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

// Leviathan, Dominator Class
function _drawLeviathan(enemy) {
    const now = performance.now();
    const cx = enemy.x, cy = enemy.y;
    const r = enemy.size / 2;
    const shieldActive = enemy.afoShieldActive;
    const NUM_WINGS = 9;
    const dying = enemy.dyingLaserPhase;

    ctx.save();
    ctx.translate(cx, cy);

    // Wing animation
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
        if (!_mobPerf) ctx.shadowColor = '#00e5ff';
        if (!_mobPerf) ctx.shadowBlur = 8 + wingPhase * 6;
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

    // Energy vortex (chỉ khi khiên đã vỡ)
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

    // Core
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
    if (!_mobPerf) ctx.shadowColor = '#9d00ff'; if (!_mobPerf) ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, coreR * beat, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Eye (tracks player)
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
    if (!_mobPerf) ctx.shadowColor = '#00e5ff'; if (!_mobPerf) ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(0,229,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ex, ey, eR, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // All for One shield (unbreakable-shield từ HTML)
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
        if (!_mobPerf) ctx.shadowColor = '#00e5ff'; if (!_mobPerf) ctx.shadowBlur = 20;
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
        if (!_mobPerf) ctx.shadowColor = ctx.fillStyle; if (!_mobPerf) ctx.shadowBlur = 8;
        ctx.fillText(`${kills}/${quota} kills`, 0, sR + 20);
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.shadowBlur = 0;
        ctx.fillText(`${hits}/200 hits`, 0, sR + 36);
    }

    // Dying: freeze glow
    if (dying) {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        glow.addColorStop(0, 'rgba(255,100,0,0.5)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

function _drawMarchoBlade(blade) {
    const now = performance.now();
    ctx.save();
    const angle = blade.active ? Math.atan2(blade.vy, blade.vx) : blade.angle;

    // WARNING PHASE: cùng style với windup corridor / ghost
    if (!blade.active) {
        const halfW = 36;
        // Dùng targetX/Y nếu có (blade từ death-convert), không thì dùng len cố định
        const warnLen = (blade.targetX != null)
            ? Math.hypot(blade.targetX - blade.originX, blade.targetY - blade.originY) + 80
            : 500;

        ctx.translate(blade.originX, blade.originY);
        ctx.rotate(angle);
        ctx.globalAlpha = 0.9;

        // Fill nền cam, giống windup corridor
        ctx.fillStyle = 'rgba(255,140,0,0.45)';
        ctx.fillRect(0, -halfW, warnLen, halfW * 2);

        // Đường giữa nét đứt
        ctx.strokeStyle = 'rgba(255,220,120,0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([14, 8]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(warnLen, 0); ctx.stroke();
        ctx.setLineDash([]);

        // Edge lines nét đứt sáng
        ctx.strokeStyle = 'rgba(255,210,0,0.92)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -halfW); ctx.lineTo(warnLen, -halfW);
        ctx.moveTo(0, halfW);  ctx.lineTo(warnLen, halfW);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
        return;
    }

    // ACTIVE PHASE: vẽ blade arc
    const sa = angle - Math.PI / 2, ea = angle + Math.PI / 2;

    // Outer corridor edges: persist on the blade until last 15% of screen
    if (blade.y < canvas.height * 0.85 && blade.originX != null) {
        const halfW = 36;
        const corrLen = (blade.targetX != null)
            ? Math.hypot(blade.targetX - blade.originX, blade.targetY - blade.originY) + 80
            : Math.hypot(blade.x - blade.originX, blade.y - blade.originY) + 200;
        ctx.save();
        ctx.translate(blade.originX, blade.originY);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(255,210,0,0.85)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -halfW); ctx.lineTo(corrLen, -halfW);
        ctx.moveTo(0, halfW);  ctx.lineTo(corrLen, halfW);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Launch aura: brief energy burst at origin when blade fires
    if (blade._fireTime && now - blade._fireTime < 320) {
        const elapsed = now - blade._fireTime;
        const prog = elapsed / 320;
        const burstAlpha = (1 - prog) * 0.9;
        const burstR = 12 + prog * 52;
        ctx.save();
        if (!_mobPerf) { ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 18; }
        ctx.globalAlpha = burstAlpha;
        ctx.strokeStyle = 'rgba(255,190,50,0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(blade.originX, blade.originY, burstR, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = burstAlpha * 0.45;
        ctx.fillStyle = 'rgba(255,210,100,0.7)';
        ctx.beginPath(); ctx.arc(blade.originX, blade.originY, burstR * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Outer orange-red glow
    ctx.strokeStyle = 'rgba(255,80,0,0.35)';
    ctx.lineWidth = 18;
    if (!_mobPerf) ctx.shadowColor = 'rgba(255,120,0,0.6)'; if (!_mobPerf) ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(blade.x, blade.y, blade.radius, sa, ea); ctx.stroke();

    // Main orange arc
    ctx.strokeStyle = 'rgba(255,140,30,0.95)';
    ctx.lineWidth = 5;
    if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 14;
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

function _drawCoronationEffect(enemy) {
    const now = performance.now();
    const progress = Math.min(1, enemy.coronationTimer / enemy.coronationDuration);
    const r = enemy.size;

    // Sky lightning bolt: golden bolt raining from top of screen (last 30% only)
    if (progress > 0.70) {
        const boltFlicker = 0.5 + 0.5 * Math.abs(Math.sin(now / 60));
        const boltAlpha = Math.min(1, progress * 4) * boltFlicker;
        ctx.save();
        ctx.globalAlpha = boltAlpha;
        if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 24; }
        // Glow halo pass
        ctx.strokeStyle = 'rgba(255,200,0,0.30)';
        ctx.lineWidth = 12;
        _drawLightningBolt(ctx, enemy.x, 0, enemy.x, enemy.y, 5, 34);
        // Main gold bolt
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        _drawLightningBolt(ctx, enemy.x, 0, enemy.x, enemy.y, 7, 22);
        // White core
        ctx.globalAlpha = boltAlpha * 0.7;
        ctx.strokeStyle = '#fffde7';
        ctx.lineWidth = 1;
        _drawLightningBolt(ctx, enemy.x, 0, enemy.x, enemy.y, 7, 16);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Expanding golden aura rings
    for (let k = 0; k < 3; k++) {
        const ringPhase = ((now / 400) + k / 3) % 1;
        const ringR = r * (1.0 + ringPhase * 2.2);
        const ringAlpha = (1 - ringPhase) * 0.7 * (0.5 + 0.5 * progress);
        ctx.globalAlpha = ringAlpha;
        if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18; }
        ctx.strokeStyle = `rgba(255,215,0,${0.9 * (1 - ringPhase)})`;
        ctx.lineWidth = 2.5 * (1 - ringPhase * 0.6);
        ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Golden lightning bolts (4-6 jagged bolts radiating out)
    const boltCount = _mobPerf ? 3 : 6;
    for (let b = 0; b < boltCount; b++) {
        const baseAngle = (b / boltCount) * Math.PI * 2 + (now / 300);
        const boltLen = r * (1.4 + Math.random() * 1.2);
        const segments = 5;
        ctx.save();
        ctx.rotate(baseAngle);
        if (!_mobPerf) { ctx.shadowColor = '#fff176'; ctx.shadowBlur = 14; }
        ctx.strokeStyle = `rgba(255,215,0,${0.7 + 0.3 * Math.sin(now / 80 + b)})`;
        ctx.lineWidth = 1.5 + Math.random() * 1.5;
        ctx.beginPath();
        let cx2 = 0, cy2 = r * 0.5;
        ctx.moveTo(cx2, cy2);
        for (let seg = 0; seg < segments; seg++) {
            cx2 += (Math.random() - 0.5) * r * 0.4;
            cy2 += (boltLen - r * 0.5) / segments;
            ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Gold flash body overlay
    const flashAlpha = 0.35 + 0.35 * Math.sin(now / 60);
    ctx.globalAlpha = flashAlpha;
    if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 22; }
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // CORONATION label
    ctx.fillStyle = '#fff176';
    ctx.font = `bold ${Math.ceil(9 + progress * 3)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10; }
    ctx.fillText('CORONATION', 0, -r - 6);
    ctx.shadowBlur = 0;

    ctx.restore();
}

function _drawNormalEnemy(enemy) {
    // Coronation overrides normal rendering
    if (enemy.inCoronation) {
        _drawCoronationEffect(enemy);
        return;
    }

    const now = performance.now();
    const hpRatio = enemy.hp / enemy.maxHp;
    const hue = 10 + hpRatio * 40; // 50=orange, 10=red
    const glowColor = `hsl(${hue},100%,55%)`;
    const darkColor = `hsl(${hue},90%,25%)`;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const r = enemy.size;

    // 1. Warning aura
    ctx.fillStyle = `hsla(${hue},100%,50%,0.15)`;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();

    // 2. Rotating body + clamps
    ctx.save();
    ctx.rotate(now / 1800);

    // Hex frame
    // Hex rim glow (HIGH only)
    if (_gfxLevel < 1) {
        const rimPulse = 0.5 + 0.5 * Math.sin(now / 260 + enemy.x * 0.04);
        ctx.strokeStyle = `hsla(${hue},100%,65%,${0.45 * rimPulse})`;
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14; }
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            i === 0 ? ctx.moveTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3))
                    : ctx.lineTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3));
        }
        ctx.closePath(); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#181822';
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Inner counter-rotating energy ring (HIGH only)
    if (_gfxLevel < 1) {
        ctx.rotate(-now / 2200); // counter-rotate inside the main body rotation
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const lx = Math.cos(a) * r * 0.72;
            const ly = Math.sin(a) * r * 0.72;
            const nextA = ((i + 1) / 6) * Math.PI * 2;
            const nx = Math.cos(nextA) * r * 0.72;
            const ny = Math.sin(nextA) * r * 0.72;
            const sA = 0.18 + 0.22 * Math.abs(Math.sin(now / 400 + i));
            ctx.strokeStyle = `hsla(${hue},100%,70%,${sA})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(nx, ny); ctx.stroke();
        }
        ctx.rotate(now / 2200); // undo counter-rotation so clamps stay correct
    }

    // 3 armored clamps
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i / 3) * Math.PI * 2 + Math.PI / 6);
        ctx.fillStyle = '#22222e';
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.25);
        ctx.lineTo(r * 1.1, -r * 0.15);
        ctx.lineTo(r * 1.1, r * 0.15);
        ctx.lineTo(r * 0.5, r * 0.25);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = darkColor; ctx.lineWidth = 2; ctx.stroke();
        // Glow slit
        ctx.fillStyle = glowColor;
        ctx.fillRect(r * 0.85, -r * 0.05, r * 0.2, r * 0.1);
        ctx.restore();
    }
    ctx.restore();

    // 3. Eye (non-rotating, pulsing)
    const pulse = 0.8 + 0.2 * Math.sin(now / 150 + enemy.x);
    const eyeR = r * 0.5;
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath(); ctx.arc(0, 0, eyeR * 1.1, 0, Math.PI * 2); ctx.fill();
    const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeR * pulse);
    eyeGrad.addColorStop(0, '#ffffff');
    eyeGrad.addColorStop(0.3, glowColor);
    eyeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeGrad;
    if (!_mobPerf) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(0, 0, eyeR * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Pupil
    ctx.fillStyle = '#050508';
    ctx.beginPath(); ctx.arc(0, 0, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = glowColor; ctx.lineWidth = 1; ctx.stroke();
    // iris lines (HIGH only)
    if (_gfxLevel < 1) {
        ctx.strokeStyle = `hsla(${hue},100%,70%,0.30)`;
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 8; i++) {
            const ia = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ia) * eyeR * 0.28, Math.sin(ia) * eyeR * 0.28);
            ctx.lineTo(Math.cos(ia) * eyeR * 0.85, Math.sin(ia) * eyeR * 0.85);
            ctx.stroke();
        }
    }

    // Damage cracks (HIGH only, hp < 50%)
    if (_gfxLevel < 1 && hpRatio < 0.5) {
        const crackIntensity = (0.5 - hpRatio) * 2; // 0→1 as hp goes 50%→0%
        ctx.save();
        ctx.rotate(now / 4000); // very slow rotation with body
        const crackCount = hpRatio < 0.25 ? 6 : 4;
        ctx.strokeStyle = `rgba(255,50,0,${Math.min(0.9, crackIntensity * 0.85)})`;
        ctx.lineWidth = 1.3;
        if (!_mobPerf) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 7; }
        for (let c = 0; c < crackCount; c++) {
            const ca = (c / crackCount) * Math.PI * 2 + c * 0.37;
            const cLen = r * (0.38 + 0.52 * (((c * 7 + 3) % 5) / 4));
            const midX = Math.cos(ca + 0.55) * cLen * 0.42;
            const midY = Math.sin(ca + 0.55) * cLen * 0.42;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(midX, midY);
            ctx.lineTo(Math.cos(ca) * cLen, Math.sin(ca) * cLen);
            ctx.stroke();
        }
        // secondary orange cracks at critical HP
        if (hpRatio < 0.25) {
            const critI = (0.25 - hpRatio) * 4;
            ctx.strokeStyle = `rgba(255,160,0,${Math.min(0.75, critI * 0.6)})`;
            ctx.lineWidth = 0.9;
            if (!_mobPerf) ctx.shadowColor = '#ffaa00';
            for (let c = 0; c < 3; c++) {
                const ca = (c / 3) * Math.PI * 2 + 0.9;
                const cLen = r * (0.55 + 0.3 * (c / 3));
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ca + 0.4) * cLen * 0.5, Math.sin(ca + 0.4) * cLen * 0.5);
                ctx.lineTo(Math.cos(ca) * cLen, Math.sin(ca) * cLen);
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();
}

// Charge effect
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
    if (!_mobPerf) ctx.shadowColor = color; if (!_mobPerf) ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2); ctx.stroke();

    // MAIN RING
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + 4 * chargeRatio;
    if (!_mobPerf) ctx.shadowBlur = 15;
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

// Overload laser
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
        if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 35;
        ctx.fillRect(cx, 0, cw, player.y);

        // bright core streak
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        if (!_mobPerf) ctx.shadowBlur = 15;
        ctx.fillRect(laserX - 4, 0, 8, player.y);

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
            if (!_mobPerf) ctx.shadowColor = '#ffaa00'; if (!_mobPerf) ctx.shadowBlur = 50;
            ctx.fillText('開炸斬決', player.x, player.y - 80);

            ctx.globalAlpha = textT * 0.98;
            ctx.font = 'bold 36px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            if (!_mobPerf) ctx.shadowColor = '#ffcc00'; if (!_mobPerf) ctx.shadowBlur = 35;
            ctx.fillText('EXECUTION', player.x, player.y - 124);

            ctx.globalAlpha = textT * 0.98;
            ctx.font = 'italic 14px monospace';
            ctx.fillStyle = '#ffdd88';
            if (!_mobPerf) ctx.shadowBlur = 12;
            ctx.fillText('— Khai Triển —', player.x, player.y - 100);
            ctx.restore();
        }
    }
}

// Explosion
function drawExplosion(exp) {
    ctx.save();
    let p = 1 - exp.lifetime / exp.maxLifetime;
    let radius = exp.size * (1 + p * 1.2);
    ctx.globalAlpha = 1 - p;

    if (_mobPerf || _gfxLevel >= 2) {
        // Tier 2/3 or mobile: flat circle, no gradient, fast path
        ctx.fillStyle = exp.color;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2); ctx.fill();
    } else {
        // Fast outward shockwave ring (HIGH, first 40% of lifetime)
        if (p < 0.4) {
            const rp = p / 0.4; // 0→1
            const shockR = exp.size * (1.6 + rp * 3.2);
            ctx.save();
            ctx.globalAlpha = (1 - p) * (1 - rp) * 0.9;
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 2.5 * (1 - rp);
            if (!_mobPerf) { ctx.shadowColor = exp.color; ctx.shadowBlur = 18; }
            ctx.beginPath(); ctx.arc(exp.x, exp.y, shockR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // High-quality: shockwave ring + radial gradient
        ctx.strokeStyle = exp.color;
        ctx.lineWidth = 3 * (1 - p);
        ctx.shadowColor = exp.color; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, radius * 1.2, 0, Math.PI * 2); ctx.stroke();

        const eg = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
        eg.addColorStop(0, 'white');
        eg.addColorStop(0.3, exp.color);
        eg.addColorStop(1, 'transparent');
        ctx.fillStyle = eg;
        ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2); ctx.fill();

        // Bloom pass: wide soft halo with screen blend (HIGH only)
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (1 - p) * 0.28;
        ctx.shadowBlur = 0;
        const bloomR = radius * 2.0;
        const bg = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, bloomR);
        bg.addColorStop(0,   'rgba(255,255,255,0.9)');
        bg.addColorStop(0.4, exp.color);
        bg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, bloomR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

// Particles
function drawParticle(p) {
    ctx.save();
    if (p.isBarrierBreakRing) {
        const prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,255,136,${prog * 0.85})`;
        ctx.lineWidth = Math.max(0.5, 3.5 * prog);
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * 90, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    } else if (p.isSummonRing) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,255,255,${prog})`;
        ctx.lineWidth = 3; if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * 50, 0, Math.PI * 2); ctx.stroke();
    } else if (p.isLaserLine) {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = p.color; ctx.lineWidth = 5;
        if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
    } else if (p.isSkillGAura) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,180,255,${prog})`;
        ctx.lineWidth = 10; if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * p.maxRadius, 0, Math.PI * 2); ctx.stroke();
    } else {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        if (!_mobPerf) {
            const _glowR = _gfxLevel < 1 ? 14 : _gfxLevel < 2 ? 8 : 5;
            const _gr = Math.ceil(p.size + _glowR);
            const _gs = _getGlowSprite(p.color, _gr);
            ctx.drawImage(_gs, p.x - _gr, p.y - _gr);
        }
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Skill A – Thunder Orbs
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
function drawScatteredProjectile(p) {
    ctx.save();
    ctx.globalAlpha = p.lifetime / p.maxLifetime;

    if (p.isBouncingBall) {
        const pulse = Math.sin(performance.now() / 90) * 4;
        const cs = Math.max(0.1, p.size + pulse);  // visual only
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, cs);
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.35, '#ff4400');
        grad.addColorStop(0.7, '#cc0000');
        grad.addColorStop(1, 'darkred');
        ctx.fillStyle = grad;
        if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 22;
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
        if (!_mobPerf) ctx.shadowColor = 'orange'; if (!_mobPerf) ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Spirit
function _drawNormalSpirit(spirit) {
    if (!spirit) return;
    const now = performance.now();
    const timeRemaining = spirit.duration - (gameElapsedTime - spirit.spawnGameTime);
    const age = gameElapsedTime - spirit.spawnGameTime;

    ctx.save();

    // TITLE + HEXAGRAM, hiện trên đầu player, chỉ lần đầu
    // Chỉ render cho spirit đầu tiên trong mảng để tránh vẽ đè nhiều lần
    if (spirits.length > 0 && spirit === spirits[spirits.length - 1]) {
        const elapsed = now - lastSkillS;
        const textT = Math.min(elapsed / 150, 1) * Math.max(0, 1 - (elapsed - 150) / 1250);
        if (textT > 0.02) {
            const tx = player.x;
            const ty = player.y - 100;

            ctx.save();

            // HEXAGRAM bao quanh player, cùng fade với textT
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
                    if (!_mobPerf) ctx.shadowColor = '#ff00ff'; if (!_mobPerf) ctx.shadowBlur = 10;
                    ctx.beginPath();
                    for (let i = 0; i < 3; i++) {
                        const a = rot + (i / 3) * Math.PI * 2 + (tri === 1 ? Math.PI : 0);
                        i === 0 ? ctx.moveTo(Math.cos(a) * hexR, Math.sin(a) * hexR)
                            : ctx.lineTo(Math.cos(a) * hexR, Math.sin(a) * hexR);
                    }
                    ctx.closePath(); ctx.stroke();
                }

                // 6 điểm sáng đỉnh
                if (!_mobPerf) ctx.shadowBlur = 6;
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
            if (!_mobPerf) ctx.shadowColor = '#cc00cc'; if (!_mobPerf) ctx.shadowBlur = 40;
            ctx.fillText('星王召靈審滅', tx, ty - 8);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 22px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            if (!_mobPerf) ctx.shadowColor = '#ff00ff'; if (!_mobPerf) ctx.shadowBlur = 22;
            ctx.fillText('SUMMONED SPIRIT JUDGMENT', tx, ty - 50);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 12px monospace';
            ctx.fillStyle = '#ff88ff';
            if (!_mobPerf) ctx.shadowBlur = 8;
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
    if (!_mobPerf) ctx.shadowColor = 'magenta'; if (!_mobPerf) ctx.shadowBlur = 12;
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
    if (!_mobPerf) ctx.shadowColor = 'magenta'; if (!_mobPerf) ctx.shadowBlur = 22;
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
        if (!_mobPerf) ctx.shadowColor = 'lime'; if (!_mobPerf) ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(spirit.x - 5, spirit.y - size - 26);
        ctx.lineTo(spirit.x + 5, spirit.y - size - 26);
        ctx.lineTo(spirit.x, spirit.y - size - 36);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Domain purple ally tint
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


// PHŌTOKRYSTOS RENDER
function drawSpirit(spirit) {
    if (!spirit) return;
    if (spirit.isPhotokrystos) { drawPhotokrystos(spirit); return; }
    _drawNormalSpirit(spirit);
}

// PHOTOKRYSTOS, Silk Tail (DNT firing)
function _drawPhotoSilkTail(sx, sy, behindAngle, now, progress) {
    const alpha = Math.min(1, progress * 2.5);
    if (alpha < 0.01) return;
    const bDx = Math.cos(behindAngle), bDy = Math.sin(behindAngle);
    const pDx = -bDy, pDy = bDx;
    const t = now / 1000;

    const strands = [
        { off:  0,  len: 155, w: 2.6, ph: 0.0, rgb: [255, 255, 255] },
        { off: -9,  len: 130, w: 2.0, ph: 0.7, rgb: [200, 255, 220] },
        { off:  9,  len: 130, w: 2.0, ph: 1.4, rgb: [200, 255, 220] },
        { off: -20, len: 105, w: 1.5, ph: 1.1, rgb: [100, 255, 160] },
        { off:  20, len: 105, w: 1.5, ph: 1.8, rgb: [100, 255, 160] },
        { off: -33, len:  80, w: 1.0, ph: 0.4, rgb: [45,  255, 115] },
        { off:  33, len:  80, w: 1.0, ph: 2.1, rgb: [45,  255, 115] },
        { off:  4,  len: 185, w: 0.8, ph: 2.8, rgb: [220, 255, 235] },
        { off: -4,  len: 185, w: 0.8, ph: 3.5, rgb: [220, 255, 235] },
    ];

    ctx.save();
    ctx.lineCap = 'round';
    if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 7; }

    for (const s of strands) {
        const amp  = 14 + Math.abs(s.off) * 0.6;
        const w1   = Math.sin(t * 3.6 + s.ph)           * amp;
        const w2   = Math.sin(t * 2.9 + s.ph + 1.3)     * amp * 1.5;
        const w3   = Math.sin(t * 4.3 + s.ph + 2.8)     * amp * 0.7;
        const d1   = s.len * 0.28;
        const cp1x = sx + bDx * d1 + pDx * (s.off + w1);
        const cp1y = sy + bDy * d1 + pDy * (s.off + w1);
        const d2   = s.len * 0.62;
        const cp2x = sx + bDx * d2 + pDx * (s.off + w2);
        const cp2y = sy + bDy * d2 + pDy * (s.off + w2);
        const ex   = sx + bDx * s.len + pDx * (s.off + w3);
        const ey   = sy + bDy * s.len + pDy * (s.off + w3);
        const [r, g, b] = s.rgb;
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0,    `rgba(${r},${g},${b},${0.92 * alpha})`);
        grad.addColorStop(0.35, `rgba(${r},${g},${b},${0.65 * alpha})`);
        grad.addColorStop(0.70, `rgba(${r},${g},${b},${0.28 * alpha})`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = s.w;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawPhotokrystos(spirit) {
    const now = performance.now();
    ctx.save();
    const sx = spirit.x, sy = spirit.y;
    const size = 18.2; // 20% larger than normal (15)
    const t = now / 1000;

    // DNT: smooth body rotation toward locked target
    if (!spirit._dntSpiritRot) spirit._dntSpiritRot = 0;
    const _dntRotTarget = (spirit._dntState === 'aiming' || spirit._dntState === 'firing')
        ? (spirit._dntAngle || 0) + Math.PI / 2  // front gem faces dntAngle
        : 0;                                       // idle: return upright
    const _dntRotSpeed = spirit._dntState === 'aiming'     ? 0.14
                       : spirit._dntState === 'firing'      ? 0.06
                       : spirit._dntState === 'recovering'  ? 0.04 : 0.03;
    let _dntRotDiff = _dntRotTarget - spirit._dntSpiritRot;
    while (_dntRotDiff >  Math.PI) _dntRotDiff -= Math.PI * 2;
    while (_dntRotDiff < -Math.PI) _dntRotDiff += Math.PI * 2;
    spirit._dntSpiritRot += _dntRotDiff * _dntRotSpeed;

    // 8-star summoning announcement (same as normal spirit title)
    if (spirits.length > 0 && spirit === spirits[spirits.length - 1]) {
        const elapsed = gameElapsedTime - spirit.spawnGameTime;
        const textT = elapsed < 1500 ? Math.min(elapsed / 150, 1) * Math.max(0, 1 - (elapsed - 150) / 1250) : 0;
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.globalAlpha = textT * 0.28;
            ctx.font = 'bold 90px serif'; ctx.fillStyle = '#00ff88';
            if (!_mobPerf) { ctx.shadowColor = '#00cc55'; ctx.shadowBlur = 50; }
            ctx.fillText('開天立地', player.x, player.y - 110);
            ctx.globalAlpha = textT * 0.95;
            ctx.font = 'bold 20px "Arial Black", sans-serif'; ctx.fillStyle = '#ffffff';
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 24; }
            ctx.fillText('PRIMEVAL CREATION — Phōtokrystos', player.x, player.y - 62);
            ctx.globalAlpha = textT * 0.8;
            ctx.font = 'italic 11px monospace'; ctx.fillStyle = '#a0ffcc';
            ctx.fillText('— Khai Thiên Lập Địa —', player.x, player.y - 44);
            ctx.restore();
        }
    }

    // BTM flame cone
    if (spirit._btmPhase === 'warming' || spirit._btmPhase === 'firing') {
        const btmRatio = spirit._btmPhase === 'warming'
            ? Math.min(1, spirit._btmTimer / 1200)
            : Math.min(1, spirit._btmTimer / 3500);

        // Warming phase: dramatic flight aura
        if (spirit._btmPhase === 'warming') {
            const wp = btmRatio; // 0→1
            ctx.save();
            // Expanding energy ring
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 30 * wp; }
            for (let ring = 0; ring < 3; ring++) {
                const ringR = (50 + ring * 35) * wp;
                const ringA = Math.max(0, 0.7 - ring * 0.2) * (1 - wp * 0.5);
                ctx.strokeStyle = `rgba(0,255,136,${ringA})`;
                ctx.lineWidth = 4 - ring;
                ctx.beginPath(); ctx.arc(sx, sy, ringR, 0, Math.PI * 2); ctx.stroke();
            }
            // Speed trail lines toward center
            if (!_mobPerf) {
                const cx2 = canvas.width / 2, cy2 = canvas.height * 0.35;
                const dx2 = cx2 - sx, dy2 = cy2 - sy;
                const len = Math.hypot(dx2, dy2) || 1;
                for (let li = 0; li < 5; li++) {
                    const frac = 0.2 + li * 0.15;
                    ctx.strokeStyle = `rgba(167,255,197,${(0.6 - li * 0.1) * wp})`;
                    ctx.lineWidth = 2 - li * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(sx + (dx2 / len) * frac * 60, sy + (dy2 / len) * frac * 60);
                    ctx.lineTo(sx - (dx2 / len) * (frac * 40 + li * 8), sy - (dy2 / len) * (frac * 40 + li * 8));
                    ctx.stroke();
                }
            }
            // Wing glow pulse
            const wPulse = 0.5 + 0.5 * Math.sin(now / 80); // fast pulse
            ctx.globalAlpha = wp * wPulse * 0.5;
            ctx.fillStyle = 'rgba(0,255,136,1)';
            ctx.beginPath(); ctx.arc(sx, sy, 30 * (1 + wp * 0.5), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            ctx.restore();
        }

        ctx.save();
        // Full-screen barrier overlay (mobile: solid color, desktop: gradient)
        const barrierAlpha = btmRatio * 0.18;
        if (_mobPerf) {
            ctx.fillStyle = `rgba(0,200,80,${barrierAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            const barrierGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            barrierGrad.addColorStop(0, `rgba(150,255,200,${barrierAlpha * 1.4})`);
            barrierGrad.addColorStop(0.5, `rgba(0,255,120,${barrierAlpha})`);
            barrierGrad.addColorStop(1, `rgba(0,80,40,${barrierAlpha * 0.5})`);
            ctx.fillStyle = barrierGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // Barrier border + ornaments (mobile: border only)
        ctx.strokeStyle = `rgba(0,255,136,${0.7 * btmRatio})`; ctx.lineWidth = 3;
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20 * btmRatio; }
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        if (!_mobPerf) {
            const cLen = 30;
            const corners = [[4, 4], [canvas.width - 4, 4], [4, canvas.height - 4], [canvas.width - 4, canvas.height - 4]];
            const cDirs = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
            ctx.strokeStyle = `rgba(167,255,197,${0.9 * btmRatio})`; ctx.lineWidth = 2.5;
            for (let ci = 0; ci < 4; ci++) {
                const [cx3, cy3] = corners[ci]; const [dx3, dy3] = cDirs[ci];
                ctx.beginPath(); ctx.moveTo(cx3, cy3); ctx.lineTo(cx3 + dx3 * cLen, cy3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx3, cy3); ctx.lineTo(cx3, cy3 + dy3 * cLen); ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;

        // Lightning bolts: one per enemy each tick
        if (spirit._btmPhase === 'firing' && spirit._btmLightnings && spirit._btmLightnings.length > 0) {
            for (const tgt of spirit._btmLightnings) {
                // Lightning bolt from top of screen to enemy
                const lx = tgt.x, ly = tgt.y;
                const topY = 0;
                const segs = 7;
                ctx.strokeStyle = _mobPerf ? `rgba(180,255,220,${0.8})` : `rgba(200,255,230,0.95)`;
                ctx.lineWidth = _mobPerf ? 1.5 : 2.5;
                if (!_mobPerf) { ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 12; }
                ctx.beginPath(); ctx.moveTo(lx, topY);
                for (let li = 1; li < segs; li++) {
                    const frac = li / segs;
                    const jitter = (Math.random() - 0.5) * 40 * (1 - frac);
                    ctx.lineTo(lx + jitter, topY + (ly - topY) * frac);
                }
                ctx.lineTo(lx, ly); ctx.stroke();
                // Flash at impact point
                if (!_mobPerf) {
                    ctx.fillStyle = 'rgba(220,255,240,0.6)';
                    ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2); ctx.fill();
                }
                ctx.shadowBlur = 0;
            }
        }
        ctx.restore();
    }

    // Danger? Not Today!, laser beam
    if (spirit._dntState === 'aiming' || spirit._dntState === 'firing') {
        const angle  = spirit._dntAngle;
        const bDx    = Math.cos(angle), bDy = Math.sin(angle);

        // Screen-edge endpoint
        let maxT = Infinity;
        if (bDx >  0.0001) maxT = Math.min(maxT, (canvas.width  - sx) / bDx);
        else if (bDx < -0.0001) maxT = Math.min(maxT, -sx / bDx);
        if (bDy >  0.0001) maxT = Math.min(maxT, (canvas.height - sy) / bDy);
        else if (bDy < -0.0001) maxT = Math.min(maxT, -sy / bDy);
        const endX = sx + bDx * maxT;
        const endY = sy + bDy * maxT;

        ctx.save();

        if (spirit._dntState === 'aiming') {
            // Charge-up: dashed aim line + swelling glow
            const aimP = Math.min(1, spirit._dntTimer / 100);
            ctx.globalAlpha = aimP;
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20; }
            ctx.strokeStyle = `rgba(160,255,190,0.8)`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 7]);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.setLineDash([]);
            // Swelling glow at origin
            const swellG = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20 * aimP);
            swellG.addColorStop(0, 'rgba(255,255,255,0.9)');
            swellG.addColorStop(0.4, 'rgba(100,255,160,0.6)');
            swellG.addColorStop(1, 'rgba(0,200,80,0)');
            ctx.fillStyle = swellG;
            ctx.beginPath(); ctx.arc(sx, sy, 20 * aimP, 0, Math.PI * 2); ctx.fill();

        } else { // 'firing'
            const pulse = 0.75 + 0.25 * Math.sin(now / 25); // very fast shimmer

            // Outer diffuse cone (wide, fades along length)
            const outerGrad = ctx.createLinearGradient(sx, sy, endX, endY);
            outerGrad.addColorStop(0,   `rgba(0,255,100,${0.45 * pulse})`);
            outerGrad.addColorStop(0.35, `rgba(0,200,70,${0.25 * pulse})`);
            outerGrad.addColorStop(1,    'rgba(0,80,30,0)');
            ctx.strokeStyle = outerGrad;
            ctx.lineWidth = 48 * pulse;
            ctx.lineCap = 'round';
            if (!_mobPerf) { ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 28; }
            ctx.globalAlpha = 0.55;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();

            // Mid glow
            ctx.lineWidth = 18 * pulse;
            ctx.strokeStyle = `rgba(60,255,120,${0.85 * pulse})`;
            ctx.globalAlpha = 0.75;
            if (!_mobPerf) { ctx.shadowColor = '#80ffb0'; ctx.shadowBlur = 14; }
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();

            // Core beam, bright white-green, thin
            ctx.lineWidth = 5.5 * pulse;
            ctx.strokeStyle = `rgba(240,255,245,${0.95})`;
            ctx.globalAlpha = 1;
            if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.shadowBlur = 0;

            // Muzzle flash (dragon-spit origin)
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 35; }
            const muzzleR = 14 + 7 * pulse;
            const mg = ctx.createRadialGradient(sx, sy, 0, sx, sy, muzzleR);
            mg.addColorStop(0, 'rgba(255,255,255,1)');
            mg.addColorStop(0.3, 'rgba(160,255,200,0.8)');
            mg.addColorStop(1, 'rgba(0,200,80,0)');
            ctx.fillStyle = mg;
            ctx.globalAlpha = pulse;
            ctx.beginPath(); ctx.arc(sx, sy, muzzleR, 0, Math.PI * 2); ctx.fill();

            // Beam-end bloom
            ctx.globalAlpha = 0.35 * pulse;
            const bloomG = ctx.createRadialGradient(endX, endY, 0, endX, endY, 22);
            bloomG.addColorStop(0, 'rgba(200,255,220,0.9)');
            bloomG.addColorStop(1, 'rgba(0,180,60,0)');
            ctx.fillStyle = bloomG;
            ctx.beginPath(); ctx.arc(endX, endY, 22, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;

            // Beam particles (desktop only)
            if (!_mobPerf && Math.random() < 0.65) {
                const frac = 0.08 + Math.random() * 0.85;
                const px2 = sx + (endX - sx) * frac;
                const py2 = sy + (endY - sy) * frac;
                const perp = angle + Math.PI / 2;
                const spread = (Math.random() - 0.5) * 20;
                const _p = _acquireParticle();
                _p.x = px2 + Math.cos(perp) * spread;
                _p.y = py2 + Math.sin(perp) * spread;
                _p.vx = (Math.random() - 0.5) * 1.5;
                _p.vy = (Math.random() - 0.5) * 1.5;
                _p.lifetime = 150 + Math.random() * 200;
                _p.maxLifetime = _p.lifetime;
                _p.size = 1.5 + Math.random() * 2.5;
                _p.color = ['#a0ffcc', '#00ff88', '#ffffff', '#60ffb0'][Math.floor(Math.random() * 4)];
                particles.push(_p);
            }
        }

        ctx.restore();
    }

    // Silk tail: flowing ribbons behind spirit during DNT firing
    if (spirit._dntState === 'firing' && spirit._dntAngle !== undefined) {
        _drawPhotoSilkTail(sx, sy, spirit._dntAngle + Math.PI, now, spirit._dntTimer / 1000);
    }

    // Wing flap: oscillate scaleX
    const wingFlap = Math.cos(t * (Math.PI * 2 / 4)); // 4s period
    const wingScale = 0.55 + 0.45 * Math.abs(wingFlap); // 0.55–1.0
    const wingBright = 1 + 0.5 * (1 - Math.abs(wingFlap));

    // Rotation transform: body/wings/aura rotate to face DNT target
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(spirit._dntSpiritRot);
    ctx.translate(-sx, -sy);

    // Outer aura
    if (!_mobPerf) { ctx.shadowColor = 'rgba(45,255,115,0.7)'; ctx.shadowBlur = 22; }
    const auraG = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2.8);
    auraG.addColorStop(0, 'rgba(45,255,115,0.18)');
    auraG.addColorStop(0.5, 'rgba(45,255,115,0.06)');
    auraG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraG;
    ctx.beginPath(); ctx.arc(sx, sy, size * 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Tail
    const tailFloat = Math.sin(t * (Math.PI * 2 / 4)) * 6; // 0→6→0
    ctx.save(); ctx.translate(sx, sy);
    const tg1 = ctx.createLinearGradient(0, 0, 0, size * 3.5);
    tg1.addColorStop(0, 'rgba(112,255,170,0.85)');
    tg1.addColorStop(0.6, 'rgba(25,204,90,0.5)');
    tg1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg1; ctx.globalAlpha = 0.85;
    // Center tail
    ctx.beginPath(); ctx.moveTo(0, size * 0.8); ctx.bezierCurveTo(size * 0.4, size * 2, size * 0.5, size * 2.8, 0 + tailFloat * 0.3, size * 3.5); ctx.bezierCurveTo(-size * 0.5, size * 2.8, -size * 0.4, size * 2, 0, size * 0.8); ctx.closePath(); ctx.fill();
    // Left tail feather
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(-size * 0.2, size * 0.9); ctx.bezierCurveTo(-size * 0.8, size * 2, -size, size * 2.8, -size * 0.4 + tailFloat * 0.2, size * 3.2); ctx.bezierCurveTo(-size * 0.2, size * 2.5, 0, size * 1.8, -size * 0.2, size * 0.9); ctx.closePath(); ctx.fill();
    // Right tail feather
    ctx.beginPath(); ctx.moveTo(size * 0.2, size * 0.9); ctx.bezierCurveTo(size * 0.8, size * 2, size, size * 2.8, size * 0.4 + tailFloat * 0.2, size * 3.2); ctx.bezierCurveTo(size * 0.2, size * 2.5, 0, size * 1.8, size * 0.2, size * 0.9); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Left Wing
    ctx.save(); ctx.translate(sx, sy); ctx.scale(wingScale, 1);
    if (!_mobPerf) { ctx.shadowColor = 'rgba(167,255,197,0.8)'; ctx.shadowBlur = 15 * wingBright; }
    const wg1 = ctx.createLinearGradient(-size * 1.8, -size * 0.5, 0, size * 0.5);
    wg1.addColorStop(0, `rgba(230,255,240,${0.9 * wingScale})`);
    wg1.addColorStop(0.4, `rgba(77,255,145,${0.7 * wingScale})`);
    wg1.addColorStop(1, 'rgba(0,102,42,0.1)');
    ctx.fillStyle = wg1;
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.5, -size * 0.8, -size * 2.2, -size * 0.3, -size * 2.2, size * 0.6); ctx.bezierCurveTo(-size * 1.2, size * 0.8, -size * 0.5, size * 0.6, -size * 0.1, size * 0.2); ctx.closePath(); ctx.fill();
    // Wing detail lines
    ctx.strokeStyle = `rgba(167,255,197,${0.7 * wingScale})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.2, -size * 0.5, -size * 1.8, size * 0.1, -size * 2, size * 0.5); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-size * 0.25, size * 0); ctx.bezierCurveTo(-size, -size * 0.3, -size * 1.5, size * 0.2, -size * 1.8, size * 0.6); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();

    // Right Wing
    ctx.save(); ctx.translate(sx, sy); ctx.scale(-wingScale, 1); // mirror
    if (!_mobPerf) { ctx.shadowColor = 'rgba(167,255,197,0.8)'; ctx.shadowBlur = 15 * wingBright; }
    ctx.fillStyle = wg1;
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.5, -size * 0.8, -size * 2.2, -size * 0.3, -size * 2.2, size * 0.6); ctx.bezierCurveTo(-size * 1.2, size * 0.8, -size * 0.5, size * 0.6, -size * 0.1, size * 0.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(167,255,197,${0.7 * wingScale})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-size * 0.3, -size * 0.3); ctx.bezierCurveTo(-size * 1.2, -size * 0.5, -size * 1.8, size * 0.1, -size * 2, size * 0.5); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-size * 0.25, size * 0); ctx.bezierCurveTo(-size, -size * 0.3, -size * 1.5, size * 0.2, -size * 1.8, size * 0.6); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();

    // Crystal body
    ctx.save(); ctx.translate(sx, sy);
    const bodyFloat = Math.sin(t * (Math.PI * 2 / 4)) * 3;
    ctx.translate(0, bodyFloat);
    // Heavy glow filter equivalent
    if (!_mobPerf) { ctx.shadowColor = '#a7ffc5'; ctx.shadowBlur = 18; }
    // Core glow
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    cg.addColorStop(0, 'rgba(255,255,255,1)');
    cg.addColorStop(0.3, 'rgba(167,255,197,0.9)');
    cg.addColorStop(0.7, 'rgba(45,255,115,0.4)');
    cg.addColorStop(1, 'rgba(10,77,34,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();

    // Hexagonal body
    const bodyG = ctx.createRadialGradient(-size * 0.2, -size * 0.3, 0, 0, 0, size * 0.9);
    bodyG.addColorStop(0, '#ccffe0'); bodyG.addColorStop(0.5, '#4dff91'); bodyG.addColorStop(1, 'rgba(0,50,20,0.3)');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    const pts = [[0, -size * 0.9], [size * 0.35, -size * 0.45], [size * 0.35, size * 0.45], [0, size * 0.9], [-size * 0.35, size * 0.45], [-size * 0.35, -size * 0.45]];
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
    ctx.closePath(); ctx.fill();

    // Spine line
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -size * 0.85); ctx.lineTo(0, size * 0.85); ctx.stroke();

    // Top gem
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -size * 1.1); ctx.lineTo(size * 0.22, -size * 0.9); ctx.lineTo(0, -size * 0.7); ctx.lineTo(-size * 0.22, -size * 0.9); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // Inner highlight ellipse
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-size * 0.18, -size * 0.22, size * 0.28, size * 0.16, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore(); // end rotation transform

    // Particle trail (triangles from wings)
    if (!_mobPerf && Math.random() < 0.35) {
        const wRel = wingFlap; // -1..1
        if (Math.abs(wRel) < 0.3) { // wings moving fast (near 0)
            for (const side of [-1, 1]) {
                const _tp = _acquireParticle();
                _tp.x = sx + side * size * 1.4; _tp.y = sy - size * 0.2;
                _tp.vx = side * (0.3 + Math.random()) * 0.5; _tp.vy = 0.5 + Math.random() * 1.5;
                const _tlt = 600 + Math.random() * 400;
                _tp.lifetime = _tlt; _tp.maxLifetime = 1000;
                _tp.size = 2.5 + Math.random() * 3;
                _tp.color = ['#ffffff', '#a7ffc5', '#2dff73', '#4dff91'][Math.floor(Math.random() * 4)];
                _tp._isTriangle = true;
                _tp._rotation = Math.random() * Math.PI * 2;
                _tp._rotSpeed = (Math.random() - 0.5) * 0.1;
                particles.push(_tp);
            }
        }
    }

    // Duration bar
    if (!spirit._btmStarted) {
        const _cAge = spirit._combatStartTime ? (gameElapsedTime - spirit._combatStartTime) : 0;
        const timeRemaining = Math.max(0, spirit.duration - _cAge);
        const bw = 50, bh = 5;
        const bx = sx - bw / 2, by = sy - size * 1.8 - 20;
        ctx.fillStyle = '#111'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#1a3a1a'; ctx.fillRect(bx, by, bw, bh);
        const ratio = timeRemaining / spirit.duration;
        const barC = ratio > 0.5 ? '#2dff73' : ratio > 0.25 ? '#ffcc00' : '#ff4444';
        ctx.fillStyle = barC; ctx.fillRect(bx, by, bw * ratio, bh);
        ctx.strokeStyle = 'rgba(45,255,115,0.5)'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);
        // Text label
        ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(167,255,197,0.85)'; ctx.font = '8px monospace';
        ctx.fillText('Phōtokrystos', sx, by - 4);
    }

    // Domain tint
    if (skillShiftActive) {
        ctx.save(); ctx.fillStyle = 'rgba(140,0,255,0.28)';
        ctx.beginPath(); ctx.arc(sx, sy, size * 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,100,255,0.65)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, size * 1.3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

// Helper: rename old drawSpirit to _drawNormalSpirit

// PRIMEVAL SUMMONING CIRCLE
function drawPrimevalSummonEffect(eff) {
    const now = performance.now();
    const cx2 = eff.x, cy2 = eff.y;
    ctx.save();

    if (eff.phase === 'converge') {
        const progress = Math.min(1, eff.timer / 1800);
        const R = 80 + 20 * (1 - progress);

        // 8-pointed star (octagram)
        ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(progress * Math.PI * 0.5);
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20; }
        for (let star = 0; star < 2; star++) {
            ctx.save(); ctx.rotate(star * Math.PI / 4);
            ctx.strokeStyle = `rgba(0,255,136,${0.75 * progress})`; ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const r2 = i % 2 === 0 ? R : R * 0.42;
                i === 0 ? ctx.moveTo(Math.cos(a) * r2, Math.sin(a) * r2) : ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            }
            ctx.closePath(); ctx.stroke();
            // Inner ring
            ctx.strokeStyle = `rgba(167,255,197,${0.4 * progress})`; ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(0, 0, R * 0.68, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        // 8 ornament dots
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const pR = R + 10;
            ctx.fillStyle = `rgba(255,255,255,${0.8 * progress})`;
            ctx.beginPath(); ctx.arc(Math.cos(a) * pR, Math.sin(a) * pR, 3.5, 0, Math.PI * 2); ctx.fill();
            // Spoke lines from center
            ctx.strokeStyle = `rgba(45,255,115,${0.25 * progress})`; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.35, Math.sin(a) * R * 0.35); ctx.stroke();
        }
        // Outer dashed circle
        ctx.strokeStyle = `rgba(45,255,115,${0.5 * progress})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(0, 0, R + 18, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Energy convergence particles
        if (!_mobPerf) {
            const numStreams = 12;
            for (let i = 0; i < numStreams; i++) {
                const a = (i / numStreams) * Math.PI * 2 + now / 2000;
                const streamDist = (R + 60) * (1 - progress * 0.7);
                const px = cx2 + Math.cos(a) * streamDist;
                const py = cy2 + Math.sin(a) * streamDist;
                ctx.globalAlpha = 0.5 * progress;
                ctx.fillStyle = '#a7ffc5';
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
                // Trail to center
                ctx.strokeStyle = `rgba(45,255,115,${0.3 * progress})`; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx2, cy2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Kanji text
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = progress * 0.85;
        ctx.font = 'bold 28px serif'; ctx.fillStyle = '#ffffff';
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20; }
        ctx.fillText('開天立地', cx2, cy2 - R - 30);
        ctx.globalAlpha = progress * 0.7;
        ctx.font = 'bold 13px "Arial Black", sans-serif'; ctx.fillStyle = '#a7ffc5';
        ctx.fillText('PRIMEVAL CREATION', cx2, cy2 - R - 12);
        ctx.globalAlpha = progress * 0.6;
        ctx.font = 'italic 9px monospace'; ctx.fillStyle = '#70ffaa';
        ctx.fillText('— Khai Thiên Lập Địa —', cx2, cy2 - R);
        ctx.restore();

    } else if (eff.phase === 'flash') {
        const flashP = Math.min(1, eff.timer / 400);
        ctx.fillStyle = `rgba(167,255,197,${(1 - flashP) * 0.65})`;
        ctx.beginPath(); ctx.arc(cx2, cy2, 120 + flashP * 80, 0, Math.PI * 2); ctx.fill();
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 60 * (1 - flashP); }
        ctx.strokeStyle = `rgba(255,255,255,${(1 - flashP) * 0.9})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx2, cy2, 50 + flashP * 150, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// PHOTOBRANG RENDER, 4-blade shuriken
function drawPhotoBrang(b) {
    const now = performance.now();
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    const R = 48;

    // Blade shape helper: single blade pointing in +Y, same size as original arc
    function bladePath() {
        ctx.beginPath();
        ctx.moveTo(-4, 8);
        ctx.lineTo(-16, 30);
        ctx.lineTo(0, R);
        ctx.lineTo(16, 30);
        ctx.lineTo(4, 8);
        ctx.closePath();
    }

    if (_mobPerf || _gfxLevel >= 2) {
        // Fast path: no shadow, no glow halo
        ctx.fillStyle = 'rgba(45,255,115,0.85)';
        ctx.strokeStyle = 'rgba(200,255,220,0.8)'; ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.rotate(i * Math.PI / 2);
            bladePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else {
        // Glow halo behind blades
        ctx.shadowColor = '#a7ffc5'; ctx.shadowBlur = 22;
        for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.rotate(i * Math.PI / 2);
            ctx.fillStyle = 'rgba(45,255,115,0.18)';
            ctx.beginPath();
            ctx.moveTo(-8, 6); ctx.lineTo(-22, 30);
            ctx.lineTo(0, R + 9);
            ctx.lineTo(22, 30); ctx.lineTo(8, 6);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        // Main blades
        for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.rotate(i * Math.PI / 2);
            ctx.fillStyle = 'rgba(30,210,95,0.92)';
            ctx.strokeStyle = 'rgba(167,255,197,0.95)'; ctx.lineWidth = 1.5;
            ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8;
            bladePath(); ctx.fill(); ctx.stroke();
            // Tip bright edge
            ctx.shadowColor = 'white'; ctx.shadowBlur = 12;
            ctx.strokeStyle = 'rgba(230,255,235,0.85)'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-16, 30); ctx.lineTo(0, R); ctx.lineTo(16, 30);
            ctx.stroke();
            ctx.restore();
        }
        ctx.shadowBlur = 0;
        // Center hub
        ctx.shadowColor = 'white'; ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(167,255,197,0.95)';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

// Blade arc
function drawBladeArcProjectile(arc) {
    const now = performance.now();
    ctx.save();
    const angle = Math.atan2(arc.vy, arc.vx);
    const sa = angle - Math.PI / 2, ea = angle + Math.PI / 2;

    // LAYER 0: wide energy wash behind the arc
    ctx.strokeStyle = 'rgba(120,255,0,0.12)';
    ctx.lineWidth = 28;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // outer glow arc (original)
    ctx.strokeStyle = 'rgba(173,255,47,0.3)';
    ctx.lineWidth = 14;
    if (!_mobPerf) ctx.shadowColor = 'rgba(150,255,0,0.5)'; if (!_mobPerf) ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // main arc (original)
    ctx.strokeStyle = 'rgba(173,255,47,0.95)';
    ctx.lineWidth = 5;
    if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, sa, ea); ctx.stroke();

    // bright inner edge (original)
    ctx.strokeStyle = 'rgba(255,255,220,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius - 2, sa, ea); ctx.stroke();

    // LAYER 1: Digital pixel squares along the arc
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

    // LAYER 2: Lithium-style atom particles ejected from arc
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

    // LAYER 3: Edge sparks at arc tips
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

// Skill D – Black Hole charging
function drawSkillDCharging() {
    const now = performance.now();
    const p = Math.min((now - skillDChargeStartTime) / skillDChargeTime, 1);
    const cx = player.x, cy = player.y;

    ctx.save();

    // 1. GRAVITY RINGS, co lại vào tâm
    for (let ring = 0; ring < 4; ring++) {
        const phase = ((now / (900 - p * 300) + ring / 4) % 1);
        const ringR = 20 + phase * (60 + p * 120);
        const ringA = (1 - phase) * 0.5 * p;
        ctx.strokeStyle = `rgba(120,0,200,${ringA})`;
        ctx.lineWidth = 2.5 * (1 - phase);
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // 2. MATTER STREAMS, phân tử xoáy vào từ xung quanh
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
    if (!_mobPerf) ctx.shadowColor = '#8800ff'; if (!_mobPerf) ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. TITLE, hiện NGAY khi ấn, mờ dần khi gần đầy
    {
        const textT = Math.min(p / 0.15, 1) * Math.max(0, 1 - (p - 0.7) / 0.3);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.28;
            ctx.font = 'bold 110px serif';
            ctx.fillStyle = '#6600cc';
            if (!_mobPerf) ctx.shadowColor = '#4400aa'; if (!_mobPerf) ctx.shadowBlur = 40;
            ctx.fillText('虛空崩塌', cx, cy - 80);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#cc88ff';
            if (!_mobPerf) ctx.shadowColor = '#8800ff'; if (!_mobPerf) ctx.shadowBlur = 28;
            ctx.fillText('SINGULARITY', cx, cy - 122);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#bb66ff';
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.fillText('— Hố Đen Triệu Hoán —', cx, cy - 98);
            ctx.restore();
        }
    }

    ctx.restore();
}

// Black hole
function drawBlackHole() {
    const now = performance.now();
    ctx.save();
    const angle = blackHole.activeTime / 500;
    ctx.translate(blackHole.x, blackHole.y);

    // Gravitational lens glow (HIGH full, MED dim)
    if (_gfxLevel < 2) {
        const _lensA = _gfxLevel < 1 ? 1.0 : 0.40;
        const lensG = ctx.createRadialGradient(0, 0, blackHole.size * 0.85, 0, 0, blackHole.size * 2.0);
        lensG.addColorStop(0,   `rgba(200,80,255,${0.22 * _lensA})`);
        lensG.addColorStop(0.5, `rgba(100,0,180,${0.08 * _lensA})`);
        lensG.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = lensG;
        ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 2.0, 0, Math.PI * 2); ctx.fill();
    }

    // Accretion disk, BEHIND pass (far half, before BH body)
    // HIGH: animated sin oscillation   MED: static 5-layer   LOW: static 2-layer
    if (_gfxLevel < 3) {
        const _t   = now / 1000;
        const _anim = _gfxLevel < 1; // animated only on HIGH
        const _s1  = _anim ? Math.sin(_t * 0.55)         * 0.14 : 0;
        const _s2  = _anim ? Math.sin(_t * 0.82 + 1.4)   * 0.09 : 0;
        const _s3  = _anim ? Math.sin(_t * 1.20 + 2.9)   * 0.07 : 0;
        const _sw  = _anim ? Math.sin(_t * 0.33 + 0.8)   * 0.08 : 0; // width wave
        const _diskTilt = _anim ? 0.22 + Math.sin(_t * 0.18) * 0.055 : 0.22;
        const _BH  = blackHole.size;
        const _ry  = _BH * 0.32;
        const _layers = _gfxLevel < 2 ? [
            { rx: _BH * 1.78, lw: 20 + _sw * 40, r:60,  g:0,   b:110, a: 0.18 + _s1 * 0.5 },
            { rx: _BH * 1.52, lw: 13 + _sw * 20, r:130, g:0,   b:200, a: 0.30 + _s2 },
            { rx: _BH * 1.28, lw:  9 + _sw * 14, r:190, g:40,  b:255, a: 0.48 + _s1 },
            { rx: _BH * 1.09, lw:  5 + _sw *  8, r:230, g:120, b:255, a: 0.65 + _s3 },
            { rx: _BH * 0.95, lw:  2.5,           r:255, g:220, b:255, a: 0.85 + _s2 },
        ] : [
            { rx: _BH * 1.55, lw: 11, r:110, g:0,  b:160, a: 0.22 },
            { rx: _BH * 1.08, lw:  4, r:200, g:80, b:255, a: 0.38 },
        ];
        ctx.save();
        ctx.rotate(_diskTilt);
        ctx.beginPath(); ctx.rect(-_BH * 3, 0, _BH * 6, _BH * 3); ctx.clip(); // far half
        for (const d of _layers) {
            ctx.strokeStyle = `rgba(${d.r},${d.g},${d.b},${Math.min(0.97, Math.max(0.02, d.a))})`;
            ctx.lineWidth = d.lw;
            if (!_mobPerf) { ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = d.lw * 0.65; }
            ctx.beginPath(); ctx.ellipse(0, 0, d.rx, _ry * (d.rx / (_BH * 1.78)), 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Infalling matter particles (HIGH only)
    if (_gfxLevel < 1) {
        for (let i = 0; i < 6; i++) {
            const phase = ((angle * 0.35 + i / 6) % 1 + 1) % 1; // 0→1 cycling
            const dist  = blackHole.size * (2.4 - 1.5 * phase);
            const pAngle = (i / 6) * Math.PI * 2 + phase * 3.5; // spirals inward
            const px = Math.cos(pAngle) * dist;
            const py = Math.sin(pAngle) * dist;
            const pA  = Math.min(1, (1 - phase) * 2.0) * 0.75;
            const pR  = Math.max(0.8, 2.5 * (1 - phase * 0.7));
            ctx.fillStyle = `rgba(220,140,255,${pA})`;
            ctx.beginPath(); ctx.arc(px, py, pR, 0, Math.PI * 2); ctx.fill();
        }
    }

    // distortion ring (visual layer only)
    for (let i = 3; i >= 1; i--) {
        const ringR = blackHole.size * (0.9 + i * 0.18);
        ctx.strokeStyle = `rgba(180,0,255,${0.08 * i})`;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // Main body + event horizon (HIGH: wobbling boundary)
    // Gradient radius slightly larger to cover wobble peaks
    const _ehWobble = _gfxLevel < 1 ? 0.07 : 0;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, blackHole.size * (1 + _ehWobble));
    grad.addColorStop(0,    'black');
    grad.addColorStop(0.36, '#1a0030');
    grad.addColorStop(0.68, 'purple');
    grad.addColorStop(1,    'rgba(80,0,80,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (_gfxLevel < 1) {
        // 5 sin waves, incommensurable frequencies → never repeats exactly
        const _ehT = now / 1000;
        const _seg = 64;
        for (let i = 0; i <= _seg; i++) {
            const a = (i / _seg) * Math.PI * 2;
            const w = 1
                + Math.sin(a * 3 + _ehT * 1.10        ) * 0.028
                + Math.sin(a * 5 + _ehT * 0.73 + 1.40 ) * 0.018
                + Math.sin(a * 7 + _ehT * 1.47 + 2.80 ) * 0.013
                + Math.sin(a * 2 + _ehT * 0.51 + 0.70 ) * 0.022
                + Math.sin(a * 4 + _ehT * 1.83 + 3.50 ) * 0.011;
            const r = blackHole.size * w;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                    : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
    } else {
        ctx.arc(0, 0, blackHole.size, 0, Math.PI * 2);
    }
    ctx.fill();

    // Photon sphere ring (HIGH: pulsing, MED: static, LOW: dim static)
    if (_gfxLevel < 3) {
        const _psT = now / 1000;
        const _psP = _gfxLevel < 1 ? (0.70 + 0.30 * Math.sin(_psT * 1.4))
                   : _gfxLevel < 2 ? 0.60
                   :                 0.30;
        const psG = ctx.createRadialGradient(0, 0, blackHole.size * 0.88, 0, 0, blackHole.size * 1.04);
        psG.addColorStop(0,    'rgba(0,0,0,0)');
        psG.addColorStop(0.35, `rgba(200,80,255,${0.45 * _psP})`);
        psG.addColorStop(0.62, `rgba(255,220,255,${0.78 * _psP})`);
        psG.addColorStop(1,    'rgba(140,0,200,0)');
        ctx.fillStyle = psG;
        if (!_mobPerf) { ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = _gfxLevel < 1 ? 22 : _gfxLevel < 2 ? 12 : 6; }
        ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 1.04, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Accretion disk, FRONT pass (near half, drawn over BH body)
    // HIGH: animated   MED: static 5-layer   LOW: static 2-layer
    if (_gfxLevel < 3) {
        const _t   = now / 1000;
        const _anim = _gfxLevel < 1;
        const _s1  = _anim ? Math.sin(_t * 0.55)         * 0.14 : 0;
        const _s2  = _anim ? Math.sin(_t * 0.82 + 1.4)   * 0.09 : 0;
        const _s3  = _anim ? Math.sin(_t * 1.20 + 2.9)   * 0.07 : 0;
        const _sw  = _anim ? Math.sin(_t * 0.33 + 0.8)   * 0.08 : 0;
        const _diskTilt = _anim ? 0.22 + Math.sin(_t * 0.18) * 0.055 : 0.22;
        const _BH  = blackHole.size;
        const _ry  = _BH * 0.32;
        // front pass slightly brighter (near side)
        const _fLayers = _gfxLevel < 2 ? [
            { rx: _BH * 1.78, lw: 16 + _sw * 35, r:65,  g:0,   b:120, a: 0.20 + _s1 * 0.5 },
            { rx: _BH * 1.52, lw: 10 + _sw * 18, r:140, g:0,   b:210, a: 0.34 + _s2 },
            { rx: _BH * 1.28, lw:  7 + _sw * 12, r:200, g:50,  b:255, a: 0.55 + _s1 },
            { rx: _BH * 1.09, lw:  4 + _sw *  7, r:238, g:130, b:255, a: 0.72 + _s3 },
            { rx: _BH * 0.95, lw:  2.5,           r:255, g:230, b:255, a: 0.90 + _s2 },
        ] : [
            { rx: _BH * 1.55, lw:  9, r:120, g:10,  b:170, a: 0.26 },
            { rx: _BH * 1.08, lw:  3, r:210, g:90,  b:255, a: 0.42 },
        ];
        ctx.save();
        ctx.rotate(_diskTilt);
        ctx.beginPath(); ctx.rect(-_BH * 3, -_BH * 3, _BH * 6, _BH * 3); ctx.clip(); // near half
        for (const d of _fLayers) {
            ctx.strokeStyle = `rgba(${d.r},${d.g},${d.b},${Math.min(0.97, Math.max(0.02, d.a))})`;
            ctx.lineWidth = d.lw;
            if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = d.lw * 0.75; }
            ctx.beginPath(); ctx.ellipse(0, 0, d.rx, _ry * (d.rx / (_BH * 1.78)), 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();
}

// Skill F – Annihilation Sweep
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
function drawSkillGBarrier() {
    if (skillGBorderOpacity <= 0) return;
    const now = performance.now();
    ctx.save();

    // TITLE FLASH khi G vừa kích hoạt
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
            if (!_mobPerf) ctx.shadowColor = '#00cc88'; if (!_mobPerf) ctx.shadowBlur = 45;
            ctx.fillText('星王生命結界', mx, my - 25);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            if (!_mobPerf) ctx.shadowColor = '#00ffaa'; if (!_mobPerf) ctx.shadowBlur = 26;
            ctx.fillText('LIFE DOMAIN', mx, my - 67);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#88ffcc';
            if (!_mobPerf) ctx.shadowBlur = 10;
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
    if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 35;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, boundaryY - 5);

    // inner thin highlight line
    ctx.strokeStyle = `rgba(150,255,255,${skillGBorderOpacity * 0.5})`;
    ctx.lineWidth = 2;
    if (!_mobPerf) ctx.shadowBlur = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, boundaryY - 10);

    // Pulse rings from player (HIGH only)
    if (_gfxLevel < 1 && skillGActive && typeof player !== 'undefined') {
        const phasePeriod = 1200;
        const phase = (now % phasePeriod) / phasePeriod; // 0→1 per cycle
        const maxR = Math.min(canvas.width, canvas.height) * 0.40;
        const pR = phase * maxR;
        const pAlpha = (1 - phase) * skillGBorderOpacity * 0.55;
        if (pAlpha > 0.01) {
            ctx.strokeStyle = `rgba(0,220,255,${pAlpha})`;
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = 'cyan'; ctx.shadowBlur = 14; }
            ctx.beginPath(); ctx.arc(player.x, player.y, pR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    ctx.restore();
}

// Energy Orb (Skill G)
function drawEnergyOrb(orb) {
    const now = performance.now();
    ctx.save();
    const pulse = Math.sin(now / 200 + orb.id) * 2.5;
    let radius = Math.max(0.1, orb.size + pulse);
    if (orb.isMerging) {
        const mp = (gameElapsedTime - orb.mergeStartTime) / 500;
        radius = Math.max(0, (orb.size + pulse) * (1 - mp));
    }

    // outer halo
    ctx.fillStyle = 'rgba(0,180,255,0.12)';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 2, 0, Math.PI * 2); ctx.fill();

    // Stronger corona (HIGH + MED)
    if (_gfxLevel < 2) {
        const cPulse = 0.6 + 0.4 * Math.sin(now / 180 + (orb.id || 0) * 1.7);
        const cg = ctx.createRadialGradient(orb.x, orb.y, radius * 1.0, orb.x, orb.y, radius * 2.8);
        cg.addColorStop(0, `rgba(0,200,255,${0.20 * cPulse})`);
        cg.addColorStop(1, 'rgba(0,80,180,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(120,230,255,${0.45 * cPulse})`;
        ctx.lineWidth = 1.5;
        if (!_mobPerf) { ctx.shadowColor = 'cyan'; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 1.6, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // main gradient
    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.45, '#44ddff');
    grad.addColorStop(0.8, '#0066cc');
    grad.addColorStop(1, 'rgba(0,40,120,0.4)');
    ctx.fillStyle = grad;
    if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2); ctx.fill();

    // inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(orb.x - radius * 0.25, orb.y - radius * 0.25, radius * 0.28, radius * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner detail (HIGH only)
    if (_gfxLevel < 1) {
        const t = now / 1000;
        const orbId = orb.id || 0;

        // rotating inner ring of 6 energy motes
        ctx.shadowColor = '#aaffff'; ctx.shadowBlur = 8;
        for (let i = 0; i < 6; i++) {
            const ma = t * 1.8 + (i / 6) * Math.PI * 2 + orbId;
            const mr = radius * 0.58;
            const mx = orb.x + Math.cos(ma) * mr;
            const my = orb.y + Math.sin(ma) * mr;
            const mA = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.1 + i));
            ctx.fillStyle = `rgba(200,255,255,${mA})`;
            ctx.beginPath(); ctx.arc(mx, my, radius * 0.10, 0, Math.PI * 2); ctx.fill();
        }

        // 3 surface arc segments (counter-rotating)
        ctx.shadowColor = 'white'; ctx.shadowBlur = 6;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const aa = -t * 2.5 + (i / 3) * Math.PI * 2;
            const arcA = 0.4 + 0.45 * Math.abs(Math.sin(t + i * 1.4));
            ctx.strokeStyle = `rgba(255,255,255,${arcA})`;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, radius * 0.82, aa, aa + Math.PI * 0.38);
            ctx.stroke();
        }

        // pulsing inner core ring
        const corePulse = 0.5 + 0.5 * Math.sin(t * 3.2 + orbId);
        ctx.strokeStyle = `rgba(180,240,255,${0.55 * corePulse})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 0.36, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // energy link beam
    if (!orb.isMerging && orb.linkedTo && orb.id < orb.linkedTo.orb.id) {
        const orb2 = orb.linkedTo.orb;
        if (!orb2) { ctx.restore(); return; }

        // outer glow beam
        ctx.strokeStyle = 'rgba(0,200,255,0.25)';
        ctx.lineWidth = orb.size * 2;
        if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // main beam
        ctx.strokeStyle = 'rgba(0,255,255,0.75)';
        ctx.lineWidth = orb.size;
        if (!_mobPerf) ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // bright core
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        if (!_mobPerf) ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // animated energy packet
        const t = (now / 1200) % 1;
        const ex = orb.x + (orb2.x - orb.x) * t;
        const ey = orb.y + (orb2.y - orb.y) * t;
        ctx.fillStyle = 'white'; if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Tesla Coil (Skill G)
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
    if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 30;
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
    if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 28;
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
        if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 8;
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

// Skill buttons (UI – unchanged logic, minor glow)
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
            if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 16;
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
    // Silence overlay: red X when player is silenced
    if (typeof player !== 'undefined' && player._silenced) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,30,30,0.9)';
        ctx.lineWidth = Math.max(2, r * 0.25);
        ctx.lineCap = 'round';
        const d = r * 0.65;
        ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function drawSkillButtons() {
    const now = performance.now();
    const skillAReady = (now - lastSkillA >= skillACooldown) && skillAOrbs.length < maxSkillAOrbs;

    // Layout: 3 hàng × 2 cột
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

    // Nền panel mờ
    ctx.save();
    const padX = 8, padY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(col1X - r - padX, row1Y - r - padY, step + padX * 2, step * 2 + r * 2 + padY * 2, 10);
    ctx.fill();
    ctx.restore();

    // Shift
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

    // A, S, D, F, G
    drawSkillButton(positions.A.x, positions.A.y, 'A', 'blue', skillACooldown, lastSkillA, !skillAReady, -1, r);
    // Skill S button logic
    const _photo = spirits.find(s2 => s2.isPhotokrystos && !s2._done);
    const _normalSpirit = spirits.find(s2 => !s2.isPhotokrystos && !s2.isFinishing);
    const _anySpiritAlive = spirits.length > 0;
    const _now_s = performance.now();
    if (_photo) {
        // Phōtokrystos active: show 40s duration countdown (locked until BTM ends)
        const _combatAge = _photo._combatStartTime ? (gameElapsedTime - _photo._combatStartTime) : 0;
        const _photoRemain = Math.max(0, 40000 - _combatAge);
        drawSkillButton(positions.S.x, positions.S.y, 'S', '#00cc66',
            40000, _now_s - (40000 - _photoRemain), true, -1, r);
    } else if (_normalSpirit) {
        // Normal spirit alive: show mana meter
        const _sColor = primevalEnergy >= 100 ? '#00ff88' : '#22cc66';
        drawSkillButton(positions.S.x, positions.S.y, 'S', _sColor,
            skillSCooldown, lastSkillS, false, primevalEnergy >= 100 ? 100 : primevalEnergy, r);
    } else {
        // No spirit: show regular 12s CD
        drawSkillButton(positions.S.x, positions.S.y, 'S', 'green',
            skillSCooldown, lastSkillS, _anySpiritAlive, -1, r);
    }
    drawSkillButton(positions.D.x, positions.D.y, 'D', '#4B0082', skillDCooldown, lastSkillD, skillDCharging || blackHole, -1, r);
    drawSkillButton(positions.F.x, positions.F.y, 'F', 'red', skillFCooldown, lastSkillF, skillFState !== 'ready', -1, r);
    drawSkillButton(positions.G.x, positions.G.y, 'G', '#00BCD4', -1, 0, skillGActive, skillGCharge, r);
}

//  VEILSHROUD RENDER

function _drawVeilshroud(enemy) {
    const now = performance.now();
    const r = enemy.size / 2; // hitbox radius

    // Lerp màu: Normal = Deep Violet, Phantom = Ghostly Cyan
    // inPhantom: fade in (0→1) via phantomTimer, after phantom: fade out (1→0) via phantomFadeTimer
    const t = enemy.inPhantom
        ? Math.min(1, enemy.phantomTimer / 400)
        : Math.min(1, Math.max(0, (enemy.phantomFadeTimer || 0) / 400));
    const cNR = 140, cNG = 20, cNB = 255;   // violet
    const cPR = 0, cPG = 230, cPB = 200;  // cyan
    const curR = Math.round(cNR + (cPR - cNR) * t);
    const curG = Math.round(cNG + (cPG - cNG) * t);
    const curB = Math.round(cNB + (cPB - cNB) * t);
    const mainColor = `rgb(${curR},${curG},${curB})`;
    const baseAlpha = 1 - t * 0.5; // fade to 50% opacity in phantom

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha = baseAlpha;

    // Glitch jitter khi phantom
    if (enemy.inPhantom && Math.random() < 0.25) {
        ctx.translate((Math.random() - 0.5) * 14 * t, (Math.random() - 0.5) * 9 * t);
    }

    // 1. AURA HƯ KHÔNG
    const auraPulse = Math.sin(now / 300) * 12;
    const auraR = r * 3.2 + auraPulse;
    const auraG = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, auraR);
    auraG.addColorStop(0, `rgba(${curR},${curG},${curB},0.18)`);
    auraG.addColorStop(1, 'transparent');
    ctx.fillStyle = auraG;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

    // 2. VOID RIBBONS (áo choàng năng lượng uốn lượn)
    const numRibbons = _mobPerf ? 3 : 5;
    if (!_mobPerf) { ctx.shadowColor = mainColor; ctx.shadowBlur = 14; }
    for (let i = 0; i < numRibbons; i++) {
        ctx.save();
        const rotSpeed = now / (3000 - t * 1400) * (i % 2 === 0 ? 1 : -1);
        ctx.rotate((i / numRibbons) * Math.PI * 2 + rotSpeed);
        const ribLen = r * 2.6 + Math.sin(now / 400 + i) * 20;
        const ribWidth = r * 0.38;
        const wave = Math.sin(now / 250 + i) * 35;
        const ribG = ctx.createLinearGradient(0, 0, 0, -ribLen);
        ribG.addColorStop(0, `rgba(${curR},${curG},${curB},${0.55 - t * 0.25})`);
        ribG.addColorStop(0.7, `rgba(${Math.round(curR / 2)},${Math.round(curG / 2)},${Math.round(curB / 2)},0.15)`);
        ribG.addColorStop(1, 'transparent');
        ctx.fillStyle = ribG;
        ctx.beginPath();
        ctx.moveTo(-ribWidth / 2, 0);
        ctx.quadraticCurveTo(wave - ribWidth, -ribLen * 0.5, 0, -ribLen);
        ctx.quadraticCurveTo(wave + ribWidth, -ribLen * 0.5, ribWidth / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + t * 0.18})`;
        ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
    }
    ctx.shadowBlur = 0;

    // 3. ARMILLARY RINGS
    ctx.lineWidth = 2 + t * 1.5;
    ctx.strokeStyle = `rgba(${curR},${curG},${curB},0.8)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.05, r * 0.38, now / 1000, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + t * 0.4})`;
    ctx.setLineDash([9, 13]);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.48, -now / 800 + Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. FLOATING ARMOR SHARDS (skip on mobile)
    if (!_mobPerf) {
        const shardOffset = t * 35;
        const shardAlpha = 1 - t * 0.82;
        ctx.fillStyle = `rgba(10,5,20,${shardAlpha})`;
        ctx.strokeStyle = `rgba(${curR},${curG},${curB},${0.8 + t * 0.2})`;
        ctx.lineWidth = 1.5;
        const armorShards = [
            [[0, -r * 1.55 - shardOffset], [r * 0.48, -r * 0.58 - shardOffset * 0.5], [0, -r * 0.38], [-r * 0.48, -r * 0.58 - shardOffset * 0.5]],
            [[0, r * 1.35 + shardOffset], [r * 0.38, r * 0.48 + shardOffset * 0.5], [0, r * 0.28], [-r * 0.38, r * 0.48 + shardOffset * 0.5]],
            [[-r * 1.25 - shardOffset, 0], [-r * 0.48, -r * 0.28], [-r * 0.28, 0], [-r * 0.48, r * 0.28]],
            [[r * 1.25 + shardOffset, 0], [r * 0.48, -r * 0.28], [r * 0.28, 0], [r * 0.48, r * 0.28]],
        ];
        armorShards.forEach(pts => {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
            ctx.closePath();
            if (t < 0.88) ctx.fill();
            ctx.stroke();
        });
    }

    // 5. SINGULARITY CORE
    const coreR = r * 0.38 + t * r * 0.18;
    const accR = coreR * 1.5 + Math.sin(now / 100) * 2.5;
    const accGrad = ctx.createRadialGradient(0, 0, coreR * 0.7, 0, 0, accR);
    accGrad.addColorStop(0, '#ffffff');
    accGrad.addColorStop(0.4, mainColor);
    accGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = accGrad;
    ctx.beginPath(); ctx.arc(0, 0, accR, 0, Math.PI * 2); ctx.fill();
    // Event Horizon (black hole)
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();
    // Iris / khe nứt không gian
    ctx.fillStyle = t > 0.5 ? '#ffffff' : mainColor;
    if (!_mobPerf) { ctx.shadowColor = mainColor; ctx.shadowBlur = 14; }
    ctx.save();
    ctx.rotate(now / 1500);
    ctx.beginPath();
    ctx.ellipse(0, 0, coreR * 0.13, coreR * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    // RGB Glitch separation (chỉ ở phantom)
    if (t > 0.12 && !_mobPerf) {
        const glAmt = t * 5;
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = 'rgba(255,0,0,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-glAmt, 0, coreR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,255,0.45)';
        ctx.beginPath(); ctx.arc(glAmt, 0, coreR, 0, Math.PI * 2); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    // HP bar
    const bw = enemy.size, bh = 5;
    const bx = enemy.x - bw / 2, by = enemy.y - enemy.size / 2 - 14;
    ctx.fillStyle = '#330033'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = enemy.inPhantom ? '#00e5cc' : '#cc22ff';
    ctx.fillRect(bx, by, bw * Math.max(0, enemy.hp / enemy.maxHp), bh);
    ctx.strokeStyle = `rgba(${curR},${curG},${curB},0.8)`; ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);

    // HP number
    ctx.fillStyle = '#ffffff'; ctx.font = '11px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(Math.ceil(enemy.hp), enemy.x, by - 1);

    // Phantom indicator
    if (enemy.inPhantom) {
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(now / 200));
        ctx.fillStyle = '#00e5cc'; ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('PHANTOM', enemy.x, by - 14);
        ctx.restore();
    }

    // Vòng đỏ lưu lại sau khi sét đánh, fade từ 1.0 xuống 0 trong 1.5s (khớp với countdown end)
    if (enemy._lastLightningTime) {
        const elapsed = performance.now() - enemy._lastLightningTime;
        const fadeDur = 1500;
        if (elapsed < fadeDur) {
            const fa = 1 - elapsed / fadeDur; // 1.0 → 0
            ctx.save();
            ctx.globalAlpha = fa;
            ctx.strokeStyle = '#ff2233';
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 10; }
            ctx.setLineDash([8, 5]);
            ctx.beginPath(); ctx.arc(enemy._lastLightningX, enemy._lastLightningY, 100, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Lightning countdown telegraph, cùng style với post-strike ring để transition liền mạch
    if (enemy.lightningPending) {
        const prog = Math.min(1, enemy.lightningCountdown / enemy.lightningCountdownDuration);
        const tx = enemy.lightningTargetX, ty = enemy.lightningTargetY;
        const circR = 100;
        ctx.save();

        // Radial fill mờ báo hiệu vùng nguy hiểm (prog càng cao càng sáng)
        if (prog > 0.01) {
            const fillGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, circR);
            fillGrad.addColorStop(0, `rgba(255,34,51,${0.28 * prog})`);
            fillGrad.addColorStop(1, 'rgba(255,0,0,0)');
            ctx.fillStyle = fillGrad;
            ctx.beginPath(); ctx.arc(tx, ty, circR, 0, Math.PI * 2); ctx.fill();
        }

        // Vòng tròn nét đứt, giống post-strike (cùng màu, lineWidth, dash)
        ctx.globalAlpha = 0.35 + prog * 0.65; // 0.35 lúc đầu → 1.0 lúc sắp đánh
        ctx.strokeStyle = '#ff2233';
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 10; }
        ctx.setLineDash([8, 5]);
        ctx.beginPath(); ctx.arc(tx, ty, circR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

function _drawVeilshroudEcho(enemy) {
    const now = performance.now();
    const echoT = enemy.echoTimer || 0;
    const r = enemy.size / 2;

    // Mức độ "charging" (3–5s: echo chuyển sang đỏ rực, sắp nổ)
    const isCharging = echoT >= 3000;
    const chargeProg = isCharging ? Math.min(1, (echoT - 3000) / 2000) : 0;

    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(now / 180 + enemy.x * 0.03));
    const alpha = isCharging ? (0.5 + chargeProg * 0.4) : (0.5 + pulse * 0.3);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha = alpha;

    // Màu: cyan → đỏ khi charging
    const eR = Math.round(200 * chargeProg);
    const eG = Math.round(240 - 240 * chargeProg);
    const eB = Math.round(255 - 200 * chargeProg);
    const echoColor = `rgb(${eR},${eG},${eB})`;

    // Aura mờ
    const aG = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 3);
    aG.addColorStop(0, `rgba(${eR},${eG},${eB},0.12)`);
    aG.addColorStop(1, 'transparent');
    ctx.fillStyle = aG;
    ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, Math.PI * 2); ctx.fill();

    // Floating shards (wireframe / khung dây)
    ctx.strokeStyle = `rgba(${eR},${eG},${eB},0.55)`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf) { ctx.shadowColor = echoColor; ctx.shadowBlur = 8; }
    const float = Math.sin(now / 700) * 6;
    const crystalShards = [
        [[0, -r * 1.65 - float], [r * 0.55, -r * 0.5 - float * 0.5], [0, -r * 0.2], [-r * 0.55, -r * 0.5 - float * 0.5]],
        [[0, r * 1.45 + float], [r * 0.45, r * 0.42 + float * 0.5], [0, r * 0.12], [-r * 0.45, r * 0.42 + float * 0.5]],
        [[-r * 1.35 - float, 0], [-r * 0.48, -r * 0.28], [-r * 0.22, 0], [-r * 0.48, r * 0.28]],
        [[r * 1.35 + float, 0], [r * 0.48, -r * 0.28], [r * 0.22, 0], [r * 0.48, r * 0.28]],
    ];
    crystalShards.forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
        ctx.closePath(); ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Lõi đỏ rực (charging phase)
    if (isCharging) {
        if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20 + chargeProg * 40; }
        ctx.fillStyle = `rgba(255,0,0,${chargeProg * 0.7})`;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.35 + chargeProg * r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Lõi trung tâm (event horizon mờ)
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = echoColor;
    ctx.save();
    ctx.rotate(now / 1400);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.1, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Vết nứt đỏ (charging phase)
    if (isCharging) {
        ctx.strokeStyle = `rgba(255,50,50,${chargeProg * 0.75})`;
        ctx.lineWidth = 1.5;
        for (let ci = 0; ci < 5; ci++) {
            ctx.save();
            ctx.rotate((ci / 5) * Math.PI * 2 + now / 2000);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(r * 0.45, r * 0.22);
            ctx.lineTo(r * 0.9, -r * 0.1);
            ctx.lineTo(r * 1.5, r * 0.32);
            ctx.stroke();
            ctx.restore();
        }
    }

    ctx.restore();

    // Vòng nét đứt 300px cảnh báo vùng nổ (hiện trước khi nổ trong giai đoạn charging)
    if (isCharging) {
        const warnA = 0.18 + chargeProg * 0.55;
        ctx.save();
        ctx.globalAlpha = warnA;
        ctx.strokeStyle = `rgba(255,${Math.round(80 - chargeProg * 80)},${Math.round(80 - chargeProg * 80)},1)`;
        ctx.lineWidth = 1.8;
        if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8 + chargeProg * 12; }
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -(now / 70) % 20;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 300, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Timer bar
    const bw = enemy.size, bh = 4;
    const bx = enemy.x - bw / 2, by = enemy.y - enemy.size / 2 - 12;
    const timeLeft = Math.max(0, 5000 - (enemy.echoTimer || 0));
    ctx.fillStyle = '#330011'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = isCharging ? '#ff3300' : '#cc44ff';
    ctx.fillRect(bx, by, bw * (timeLeft / 5000), bh);
    ctx.strokeStyle = 'rgba(200,80,255,0.6)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffffff'; ctx.font = '10px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(`ECHO ${(timeLeft / 1000).toFixed(1)}s`, enemy.x, by - 1);
}

// VEILSHROUD EFFECTS: lightning + explosion zones
function _drawVeilshroudEffects() {
    const now = performance.now();

    // Pending Void Strike rings (host đã chết nhưng sét chưa ra)
    if (window._veilshroudPendingStrikes && window._veilshroudPendingStrikes.length > 0) {
        for (const ps of window._veilshroudPendingStrikes) {
            const prog = Math.min(1, ps.countdown / ps.duration); // 0→1
            const tx = ps.targetX, ty = ps.targetY;
            ctx.save();
            // Radial fill
            if (prog > 0.01) {
                const fg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 100);
                fg.addColorStop(0, `rgba(255,34,51,${0.28 * prog})`);
                fg.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(tx, ty, 100, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 0.35 + prog * 0.65;
            ctx.strokeStyle = '#ff2233';
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 10; }
            ctx.setLineDash([8, 5]);
            ctx.beginPath(); ctx.arc(tx, ty, 100, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Active lightning strikes
    if (window._veilshroudLightnings) {
        for (const lt of window._veilshroudLightnings) {
            const prog = Math.min(1, lt.life / lt.maxLife);
            const alpha = prog;

            // Main bolt re-randomizes every frame → flickering lightning (matches guide behavior)
            const _ltMain  = _genBoltPoints(lt.x, 0, lt.x, lt.y, 7, 32);
            const _ltOuter = _genBoltPoints(lt.x, 0, lt.x, lt.y, 5, 42);
            // Sub-bolt paths to locked target positions: cached (no need to re-random)
            if (!lt._paths) {
                lt._paths = {
                    subs:  (lt.hitSentinelPositions || []).map(pos => ({
                        white: _genBoltPoints(lt.x, lt.y, pos.x, pos.y, 3, 14),
                        red:   _genBoltPoints(lt.x, lt.y, pos.x, pos.y, 2, 20),
                    })),
                    player: (lt.hitPlayer && lt.playerHitPos)
                        ? _genBoltPoints(lt.x, lt.y, lt.playerHitPos.x, lt.playerHitPos.y, 3, 18)
                        : null,
                };
            }

            ctx.save();

            // Outer shockwave circle
            const waveR = lt.strikeRadius * (1.3 - prog * 0.3);
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#ff2233';
            ctx.lineWidth = 3 + prog * 5;
            if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 20; }
            ctx.beginPath(); ctx.arc(lt.x, lt.y, waveR, 0, Math.PI * 2); ctx.stroke();

            // Main white bolt (re-randomized each frame → flickers)
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * prog;
            if (!_mobPerf) { ctx.shadowColor = '#ff2233'; ctx.shadowBlur = 22; }
            _strokeBoltPath(ctx, _ltMain);

            // Outer red bolt (re-randomized each frame → flickers)
            ctx.strokeStyle = `rgba(255,30,50,${alpha * 0.65})`;
            ctx.lineWidth = 7 * prog;
            _strokeBoltPath(ctx, _ltOuter);

            // Branch bolts off main bolt (HIGH quality, adds visual richness)
            if (!_mobPerf && _gfxLevel < 1 && alpha > 0.25) {
                ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 10;
                for (let _b = 0; _b < 4; _b++) {
                    const _bSrc = _ltMain[1 + Math.floor((_ltMain.length - 2) * (_b + 0.5) / 4)];
                    const _bSide = (_b % 2 === 0 ? 1 : -1);
                    const _bAng  = Math.PI * 0.5 + _bSide * (0.35 + Math.random() * 0.55);
                    const _bLen  = (20 + Math.random() * 35) * prog;
                    ctx.strokeStyle = `rgba(255,${50 + _b * 25},${60 + _b * 15},${alpha * 0.55})`;
                    ctx.lineWidth = (2.2 - _b * 0.3) * prog;
                    ctx.beginPath(); ctx.moveTo(_bSrc[0], _bSrc[1]);
                    let _bx = _bSrc[0], _by = _bSrc[1];
                    for (let _s = 0; _s < 3; _s++) {
                        const _sAng = _bAng + (Math.random() - 0.5) * 0.6;
                        _bx += Math.cos(_sAng) * _bLen / 3;
                        _by += Math.sin(_sAng) * _bLen / 3;
                        ctx.lineTo(_bx, _by);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Secondary bolts & impact rings at hit targets
            if (lt._paths.subs && lt._paths.subs.length > 0) {
                for (let _si = 0; _si < lt._paths.subs.length; _si++) {
                    const pos = lt.hitSentinelPositions[_si];
                    const sub = lt._paths.subs[_si];
                    // Sub-bolt từ điểm strike → sentinel
                    ctx.globalAlpha = alpha * 0.9;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.5 * prog;
                    if (!_mobPerf) { ctx.shadowColor = '#ff1133'; ctx.shadowBlur = 14; }
                    _strokeBoltPath(ctx, sub.white);
                    ctx.strokeStyle = `rgba(255,20,50,${alpha * 0.7})`;
                    ctx.lineWidth = 5 * prog;
                    _strokeBoltPath(ctx, sub.red);

                    // Impact ring mở rộng tại sentinel
                    ctx.globalAlpha = alpha * 0.85;
                    ctx.strokeStyle = '#ff2233';
                    ctx.lineWidth = 2.5;
                    if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 16; }
                    const ir = 20 + (1 - prog) * 35;
                    ctx.beginPath(); ctx.arc(pos.x, pos.y, ir, 0, Math.PI * 2); ctx.stroke();
                    ctx.globalAlpha = alpha * 0.4;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.arc(pos.x, pos.y, ir * 0.6, 0, Math.PI * 2); ctx.stroke();
                }
            }
            if (lt._paths.player) {
                const pp = lt.playerHitPos;
                // Sub-bolt → player (cached path)
                ctx.globalAlpha = alpha * 0.9;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3 * prog;
                if (!_mobPerf) { ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 18; }
                _strokeBoltPath(ctx, lt._paths.player);
                // Impact ring mở rộng tại player
                ctx.globalAlpha = alpha * 0.9;
                ctx.strokeStyle = '#ff0022';
                ctx.lineWidth = 3;
                const pr = 25 + (1 - prog) * 45;
                ctx.beginPath(); ctx.arc(pp.x, pp.y, pr, 0, Math.PI * 2); ctx.stroke();
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Echo explosion zones
    if (window._veilshroudExplosions) {
        for (const ez of window._veilshroudExplosions) {
            const prog = ez.life / ez.maxLife; // 1→0
            ctx.save();

            // Solid boundary ring
            ctx.globalAlpha = prog * 0.9;
            ctx.strokeStyle = `rgba(180,40,255,${prog})`;
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(ez.x, ez.y, ez.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;

            // Dashed overlay
            ctx.globalAlpha = prog * 0.7;
            ctx.strokeStyle = `rgba(255,160,255,${prog * 0.9})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([10, 7]);
            ctx.lineDashOffset = -(now / 80) % 17;
            ctx.beginPath(); ctx.arc(ez.x, ez.y, ez.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;

            ctx.restore();
        }
    }
}

// Helper: generate zigzag bolt points (call once, cache result)
function _genBoltPoints(x1, y1, x2, y2, detail, jitter) {
    const pts = [[x1, y1]];
    const steps = Math.max(2, detail);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        pts.push([
            x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter,
            y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter * 0.5
        ]);
    }
    pts.push([x2, y2]);
    return pts;
}
function _strokeBoltPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
}
// Helper: vẽ tia sét zigzag (re-random mỗi frame, dùng cho non-cached)
function _drawLightningBolt(ctx, x1, y1, x2, y2, detail, jitter) {
    _strokeBoltPath(ctx, _genBoltPoints(x1, y1, x2, y2, detail, jitter));
}

//  EGREGOR, Elite enemy render
function _drawEgregor(enemy) {
    const now = performance.now();
    const sc = (enemy.size / 2) / 110; // BASE_SIZE=110 in L2D
    const isRage = (enemy._rageStacks || 0) > 0;

    // Exact L2D colors
    const tentacleC = isRage ? '#880011' : '#004455';
    const strokeC   = isRage ? '#ff3300' : '#00ffaa';
    const glowC     = isRage ? '#ff3300' : '#00ffaa';

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // 0. AURA (pulsing radial, L2D: BASE*1.8 + sin/300*20)
    const auraRad = (110 * 1.8 + Math.sin(now / 300) * 20) * sc;
    const auraG = ctx.createRadialGradient(0, 0, 110 * 0.5 * sc, 0, 0, auraRad);
    auraG.addColorStop(0, isRage ? 'rgba(255,0,0,0.5)' : 'rgba(0,100,150,0.5)');
    auraG.addColorStop(1, 'transparent');
    ctx.fillStyle = auraG;
    ctx.beginPath(); ctx.arc(0, 0, auraRad, 0, Math.PI * 2); ctx.fill();

    // 1. TENTACLES, 10 × 16 segments, chain simulation
    const NUM_TENT = 10, NUM_SEG = 16;
    if (!enemy._tentacles) {
        enemy._tentacles = [];
        for (let i = 0; i < NUM_TENT; i++) {
            enemy._tentacles.push({
                baseAngle: (i / NUM_TENT) * Math.PI * 2,
                length: (150 + (i % 5) * 16) * sc,
                phase: (i * 2.39996) % (Math.PI * 2),
                speedMult: 0.8 + (i % 3) * 0.3,
            });
        }
    }
    ctx.lineCap = 'round';
    for (let _ti = 0; _ti < enemy._tentacles.length; _ti++) {
        // Skip tentacles that have been destroyed by damage
        if (enemy._tentacleHps && enemy._tentacleHps[_ti] <= 0) continue;
        const tent = enemy._tentacles[_ti];
        // Start from inside body at 0.4 × BASE_SIZE (same as L2D)
        let curX = Math.cos(tent.baseAngle) * 110 * 0.4 * sc;
        let curY = Math.sin(tent.baseAngle) * 110 * 0.4 * sc;
        let curAngle = tent.baseAngle;
        const segLen = tent.length / NUM_SEG;
        const pts = [{ x: curX, y: curY, a: curAngle }];
        const waveSpeed = isRage ? 150 : 350;
        for (let i = 0; i < NUM_SEG; i++) {
            const wave = Math.sin(now / waveSpeed * tent.speedMult + i * 0.25 + tent.phase);
            curAngle += wave * 0.2;
            curAngle = curAngle * 0.95 + tent.baseAngle * 0.05; // spring back
            curX += Math.cos(curAngle) * segLen;
            curY += Math.sin(curAngle) * segLen;
            pts.push({ x: curX, y: curY, a: curAngle });
        }
        // Taper width: 36px at root → 0 at tip (L2D: 36*(1-i/len))
        for (let i = 0; i < pts.length - 1; i++) {
            const taper = 1 - i / pts.length;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
            ctx.lineWidth = Math.max(0.5, 36 * sc * taper);
            ctx.strokeStyle = tentacleC;
            ctx.stroke();
        }
        // Suckers: perpendicular offset (L2D: size=7, offset=16, taper same), MED+
        if (_gfxLevel < 2) {
            for (let i = 2; i < pts.length - 2; i++) {
                const p = pts[i];
                const taper = 1 - i / pts.length;
                const perpX = Math.cos(p.a - Math.PI / 2);
                const perpY = Math.sin(p.a - Math.PI / 2);
                const sr = Math.max(0.5, 7 * sc * taper);
                const sx = p.x + perpX * 16 * sc * taper;
                const sy = p.y + perpY * 16 * sc * taper;
                ctx.fillStyle = isRage ? '#440000' : '#002233';
                ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = isRage ? '#ff4444' : '#00ffaa';
                ctx.beginPath(); ctx.arc(sx, sy, sr * 0.55, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    // 2. ORGANIC BODY (80-seg smooth blob, L2D noise formula)
    const BASE = 110 * sc;
    const noiseI = 8 * sc; // L2D noiseIntensity = 8
    const tdiv = isRage ? 150 : 300;
    const BSEGS = _gfxLevel < 2 ? 80 : 36;
    ctx.beginPath();
    for (let i = 0; i <= BSEGS; i++) {
        const a = (i / BSEGS) * Math.PI * 2;
        const n1 = Math.sin(a * 4 + now / tdiv) * 0.8;
        const n2 = Math.cos(a * 6 - now / (tdiv * 1.2)) * 0.5;
        const n3 = Math.sin(a * 3 + now / (tdiv * 0.8)) * 0.4;
        const r = BASE + (n1 + n2 + n3) * noiseI;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    // L2D body gradient: createRadialGradient(0,0,0, 0,0, BASE*1.2)
    const bodyG = ctx.createRadialGradient(0, 0, 0, 0, 0, BASE * 1.2);
    if (isRage) {
        bodyG.addColorStop(0, '#550000');
        bodyG.addColorStop(0.7, '#2b0000');
        bodyG.addColorStop(1, '#ff0022');
    } else {
        bodyG.addColorStop(0, '#003344');
        bodyG.addColorStop(0.7, '#001a2b');
        bodyG.addColorStop(1, '#00ffcc');
    }
    ctx.fillStyle = bodyG; ctx.fill();
    if (!_mobPerf) { ctx.shadowColor = glowC; ctx.shadowBlur = isRage ? 40 : 25; }
    ctx.strokeStyle = strokeC;
    ctx.lineWidth = (isRage ? 5 : 3) * sc;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. GILLS, 5 layers per side (MED+, quadratic bezier)
    if (_gfxLevel < 2) {
        const breathP = (Math.sin(now / 500) + 1) / 2;
        // Inner gill glow (L2D: center at y=25)
        const innerR = (30 + breathP * 15) * sc;
        const gillG2 = ctx.createRadialGradient(0, 25 * sc, 0, 0, 25 * sc, innerR);
        gillG2.addColorStop(0, isRage ? `rgba(255,50,0,${breathP})` : `rgba(0,255,200,${breathP})`);
        gillG2.addColorStop(1, 'transparent');
        ctx.fillStyle = gillG2;
        ctx.beginPath(); ctx.arc(0, 25 * sc, innerR, 0, Math.PI * 2); ctx.fill();

        for (const side of [-1, 1]) {
            for (let i = 0; i < 5; i++) {
                ctx.save();
                // L2D: translate(side*12, 10+i*12)
                ctx.translate(side * 12 * sc, (10 + i * 12) * sc);
                ctx.rotate(side * (0.2 + breathP * 0.3 + i * 0.1));
                // L2D gill flap shape
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(side * 30 * sc, -8 * sc, side * 55 * sc, 15 * sc);
                ctx.quadraticCurveTo(side * 20 * sc, 25 * sc, 0, 0);
                ctx.fillStyle = isRage ? '#660000' : '#004455';
                ctx.fill();
                if (!_mobPerf) { ctx.shadowColor = isRage ? '#ff4444' : '#00ffff'; ctx.shadowBlur = 8; }
                ctx.strokeStyle = isRage ? '#ff4444' : '#00ffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.shadowBlur = 0;
                // Gill vein line
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(side * 25 * sc, 4 * sc, side * 40 * sc, 10 * sc);
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // 4. FOUR EYES, L2D polar coords {a, d, s}
    const eyeDefs = [
        { a: -Math.PI / 3,           d: 30, s: 20 }, // large upper-right
        { a: -Math.PI * 2 / 3,       d: 30, s: 20 }, // large upper-left
        { a: -Math.PI / 6 + 0.2,     d: 55, s: 12 }, // small right
        { a: -Math.PI * 5 / 6 - 0.2, d: 55, s: 12 }, // small left
    ];
    if (!enemy._eyeBlinkTimers) enemy._eyeBlinkTimers = [0, 0, 0, 0];
    if (!enemy._eyeNextBlinks)  enemy._eyeNextBlinks  = [2000, 2800, 1500, 3500];

    for (let i = 0; i < 4; i++) {
        const eye = eyeDefs[i];
        // Eye floats in/out along its angle (L2D: eyeFloat = sin(t/500+a)*4)
        const eyeFloat = Math.sin(now / 500 + eye.a) * 4 * sc;
        const ex = Math.cos(eye.a) * (eye.d * sc + eyeFloat);
        const ey = Math.sin(eye.a) * (eye.d * sc + eyeFloat);
        const er = eye.s * sc;

        // Blink: L2D timestamp-based
        if (now > enemy._eyeBlinkTimers[i] + enemy._eyeNextBlinks[i]) {
            enemy._eyeBlinkTimers[i] = now;
            enemy._eyeNextBlinks[i] = 2000 + Math.random() * 4000;
        }
        const tSinceBlink = now - enemy._eyeBlinkTimers[i];
        let eyelidProg = 0;
        if (tSinceBlink < 150) eyelidProg = tSinceBlink / 150;
        else if (tSinceBlink < 300) eyelidProg = 1 - (tSinceBlink - 150) / 150;

        // Player tracking (L2D: pupil offset = min(hypot*0.05, maxDist))
        const ddx = player.x - enemy.x - ex;
        const ddy = player.y - enemy.y - ey;
        const aToPl = Math.atan2(ddy, ddx);
        const maxPD = er * 0.4;
        const pupilX = Math.cos(aToPl) * Math.min(Math.hypot(ddx, ddy) * 0.05, maxPD);
        const pupilY = Math.sin(aToPl) * Math.min(Math.hypot(ddx, ddy) * 0.05, maxPD);

        ctx.save();
        ctx.translate(ex, ey);

        // Clip to eye ellipse (blink squishes vertically)
        ctx.beginPath();
        ctx.ellipse(0, 0, er, er * (1 - eyelidProg * 0.9), 0, 0, Math.PI * 2);
        ctx.clip();

        // Sclera (L2D: '#f0f8ff' calm, '#ffcccc' rage)
        ctx.fillStyle = isRage ? '#ffcccc' : '#f0f8ff';
        ctx.fillRect(-er, -er, er * 2, er * 2);

        // Blood vessels, HIGH only
        if (_gfxLevel < 1) {
            ctx.strokeStyle = isRage ? '#cc0000' : '#ff9999';
            ctx.lineWidth = 0.8;
            for (let v = 0; v < 5; v++) {
                const va = (v / 5) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(va) * er, Math.sin(va) * er);
                ctx.quadraticCurveTo(
                    Math.cos(va + 0.5) * er * 0.5, Math.sin(va + 0.5) * er * 0.5,
                    Math.cos(va) * er * 0.3, Math.sin(va) * er * 0.3
                );
                ctx.stroke();
            }
        }

        // Iris radial gradient (L2D: inner=#00ffaa/#ffaa00, outer=#00aaff/#ff0000)
        const irisR = er * (isRage ? 0.7 : 0.6);
        const irisG = ctx.createRadialGradient(pupilX, pupilY, 0, pupilX, pupilY, irisR);
        irisG.addColorStop(0, isRage ? '#ffaa00' : '#00ffaa');
        irisG.addColorStop(1, isRage ? '#ff0000' : '#00aaff');
        ctx.fillStyle = irisG;
        ctx.beginPath(); ctx.arc(pupilX, pupilY, irisR, 0, Math.PI * 2); ctx.fill();

        // Iris radial fiber lines, HIGH only
        if (_gfxLevel < 1) {
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 0.5;
            for (let r2 = 0; r2 < 16; r2++) {
                const ra = (r2 / 16) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(pupilX + Math.cos(ra) * irisR * 0.3, pupilY + Math.sin(ra) * irisR * 0.3);
                ctx.lineTo(pupilX + Math.cos(ra) * irisR, pupilY + Math.sin(ra) * irisR);
                ctx.stroke();
            }
        }

        // Vertical ellipse pupil oriented toward player (L2D style)
        const pd = isRage ? 0.15 : (0.25 + Math.sin(now / 800) * 0.05);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(pupilX, pupilY, er * pd, er * (isRage ? 0.5 : pd * 1.5), aToPl, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(pupilX - er * 0.15, pupilY - er * 0.15, er * 0.12, 0, Math.PI * 2); ctx.fill();

        ctx.restore();

        // Eye rim drawn outside clip
        ctx.strokeStyle = isRage ? '#660000' : '#003344';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(ex, ey, er, er * (1 - eyelidProg * 0.9), 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 5. RAGE STACK PIPS
    if ((enemy._rageStacks || 0) > 0) {
        if (!_mobPerf) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 14; }
        for (let s = 0; s < enemy._rageStacks; s++) {
            const a = (s / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = 'rgba(255,60,60,0.9)';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * BASE * 1.25, Math.sin(a) * BASE * 1.25, 5 * sc, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // 6. HP BAR + NAME
    const hpRatio = enemy.hp / enemy.maxHp;
    const bw = enemy.size * 1.1, bh = 5;
    ctx.fillStyle = '#111';
    ctx.fillRect(-bw / 2, -enemy.size / 2 - 14, bw, bh);
    const hpGrd = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    hpGrd.addColorStop(0, isRage ? '#ff0000' : '#00ffaa');
    hpGrd.addColorStop(1, isRage ? '#ff6600' : '#00ccaa');
    ctx.fillStyle = hpGrd;
    ctx.fillRect(-bw / 2, -enemy.size / 2 - 14, bw * hpRatio, bh);
    ctx.strokeStyle = isRage ? '#ff4400' : '#00c8b4';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-bw / 2, -enemy.size / 2 - 14, bw, bh);
    ctx.restore();
}

// Egregor effect overlays: Psychic Tempest + Null Slash
function _drawEgregorEffects() {
    const now = performance.now();
    for (const enemy of enemies) {
        if (enemy.type !== 'egregor') continue;
        const ox = enemy._tempestOriginX || enemy.x;
        const oy = enemy._tempestOriginY || enemy.y;

        // MIND LINK RANGE INDICATOR (red dashed circle 600px)
        ctx.save();
        ctx.strokeStyle = `rgba(255,30,30,${0.45 + 0.2 * Math.sin(now / 400)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([14, 9]);
        ctx.lineDashOffset = -(now / 55) % 23;
        if (!_mobPerf) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 600, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.restore();

        // TEMPEST TELEGRAPHING
        if (enemy._tempestPhase === 'telegraphing') {
            for (const t of enemy._tempestTargets) {
                const progress = 1 - t.countdown / 1200; // 0→1
                const tx = t.tx, ty = t.ty;
                ctx.save();

                // Shrinking impact ring (90px → 20px), purple psychic
                const ringR = 20 + (1 - progress) * 70;
                ctx.strokeStyle = `rgba(180,60,255,${0.5 + 0.3 * Math.sin(now / 80)})`;
                ctx.lineWidth = 2.5;
                if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 14; }
                ctx.beginPath(); ctx.arc(tx, ty, ringR, 0, Math.PI * 2); ctx.stroke();
                ctx.shadowBlur = 0;

                // Dashed outer ring at 112px, slowly rotating
                ctx.strokeStyle = `rgba(140,40,255,${0.35 + 0.15 * Math.sin(now / 60)})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([8, 6]);
                ctx.lineDashOffset = -(now / 70) % 14;
                ctx.beginPath(); ctx.arc(tx, ty, 112, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                // Warning thread from Egregor to target (psychic violet)
                ctx.strokeStyle = `rgba(160,80,255,${0.22 + 0.12 * Math.sin(now / 110)})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 8]);
                ctx.lineDashOffset = -(now / 50) % 13;
                ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();
                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                // 4 inward sparks converging (MED+)
                if (_gfxLevel < 2) {
                    for (let sp = 0; sp < 4; sp++) {
                        const sAngle = (sp / 4) * Math.PI * 2 + now * 0.002;
                        const sDist = 90 * (1 - progress);
                        ctx.fillStyle = `rgba(200,100,255,${0.8 * progress})`;
                        ctx.beginPath();
                        ctx.arc(tx + Math.cos(sAngle) * sDist, ty + Math.sin(sAngle) * sDist, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Center cross at progress > 0.6
                if (progress > 0.6) {
                    const crossA = (progress - 0.6) / 0.4;
                    const crossLen = 14 * crossA;
                    if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10; }
                    ctx.strokeStyle = `rgba(230,160,255,${crossA * 0.9})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(tx - crossLen, ty); ctx.lineTo(tx + crossLen, ty);
                    ctx.moveTo(tx, ty - crossLen); ctx.lineTo(tx, ty + crossLen);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                // Area flash at progress > 0.85 (MED+)
                if (progress > 0.85 && _gfxLevel < 2) {
                    const flashA = ((progress - 0.85) / 0.15) * 0.3;
                    ctx.fillStyle = `rgba(140,0,255,${flashA})`;
                    ctx.beginPath(); ctx.arc(tx, ty, 90, 0, Math.PI * 2); ctx.fill();
                }

                ctx.restore();
            }
        }

        // TEMPEST STRIKE (psychic purple bolts, more detail than Veilshroud)
        if (enemy._tempestPhase === 'striking') {
            for (const t of enemy._tempestTargets) {
                if (!t.struck || t.strikeLife <= 0 || !t._mainBolt) continue;
                const fade = t.strikeLife / 700;
                const tx = t.tx, ty = t.ty;
                ctx.save();
                ctx.globalAlpha = fade;

                // Layer 0: wide outer aura (deep purple)
                if (!_mobPerf) { ctx.shadowColor = '#7700ff'; ctx.shadowBlur = 28; }
                ctx.strokeStyle = `rgba(100,0,220,${fade * 0.5})`;
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(t._outerBolt[0].x, t._outerBolt[0].y);
                for (let k = 1; k < t._outerBolt.length; k++) ctx.lineTo(t._outerBolt[k].x, t._outerBolt[k].y);
                ctx.stroke();

                // Layer 1: magenta mid bolt
                ctx.shadowBlur = 18;
                ctx.strokeStyle = `rgba(220,50,255,${fade * 0.8})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(t._outerBolt[0].x, t._outerBolt[0].y);
                for (let k = 1; k < t._outerBolt.length; k++) ctx.lineTo(t._outerBolt[k].x, t._outerBolt[k].y);
                ctx.stroke();

                // Layer 2: branch bolt (psychic violet)
                if (t._branchA) {
                    ctx.strokeStyle = `rgba(180,80,255,${fade * 0.7})`;
                    ctx.lineWidth = 4;
                    ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 14;
                    ctx.beginPath();
                    ctx.moveTo(t._branchA[0].x, t._branchA[0].y);
                    for (let k = 1; k < t._branchA.length; k++) ctx.lineTo(t._branchA[k].x, t._branchA[k].y);
                    ctx.stroke();
                }

                // Layer 3: main zigzag bolt (bright purple-white)
                ctx.strokeStyle = `rgba(230,160,255,${fade})`;
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.moveTo(t._mainBolt[0].x, t._mainBolt[0].y);
                for (let k = 1; k < t._mainBolt.length; k++) ctx.lineTo(t._mainBolt[k].x, t._mainBolt[k].y);
                ctx.stroke();

                // Layer 4: white-hot core bolt (thinnest)
                ctx.strokeStyle = `rgba(255,255,255,${fade * 0.95})`;
                ctx.lineWidth = 1.2;
                ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(t._thinBolt[0].x, t._thinBolt[0].y);
                for (let k = 1; k < t._thinBolt.length; k++) ctx.lineTo(t._thinBolt[k].x, t._thinBolt[k].y);
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 1;

                // Impact rings (purple)
                const prog1 = 1 - fade;
                ctx.globalAlpha = fade;
                if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 18; }
                ctx.strokeStyle = `rgba(180,0,255,${fade * 0.9})`;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(tx, ty, 6 + prog1 * 90, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = `rgba(220,120,255,${fade * 0.6})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.arc(tx, ty, 12 + prog1 * 55, 0, Math.PI * 2); ctx.stroke();
                // Inner white ring
                ctx.strokeStyle = `rgba(255,255,255,${fade * 0.35})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(tx, ty, 8 + prog1 * 30, 0, Math.PI * 2); ctx.stroke();

                // Starburst (MED+, first 150ms)
                if (t.strikeLife > 550 && _gfxLevel < 2) {
                    const sbA = (t.strikeLife - 550) / 150;
                    if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 14; }
                    ctx.strokeStyle = `rgba(200,80,255,${sbA * 0.9})`;
                    ctx.lineWidth = 1.8;
                    for (let sb = 0; sb < 12; sb++) {
                        const sbAngle = (sb / 12) * Math.PI * 2;
                        const sbLen = 28 + Math.random() * 22;
                        ctx.beginPath();
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + Math.cos(sbAngle) * sbLen, ty + Math.sin(sbAngle) * sbLen);
                        ctx.stroke();
                    }
                    // White center flash
                    ctx.strokeStyle = `rgba(255,255,255,${sbA * 0.7})`;
                    ctx.lineWidth = 1;
                    for (let sb = 0; sb < 6; sb++) {
                        const sbAngle = (sb / 6) * Math.PI * 2 + 0.26;
                        ctx.beginPath();
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + Math.cos(sbAngle) * 14, ty + Math.sin(sbAngle) * 14);
                        ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }

                // Psychic impact orb at strike point
                if (_gfxLevel < 2) {
                    const orbR = (1 - fade) * 20 + 5;
                    const orbG = ctx.createRadialGradient(tx, ty, 0, tx, ty, orbR);
                    orbG.addColorStop(0, `rgba(255,255,255,${fade * 0.8})`);
                    orbG.addColorStop(0.4, `rgba(200,80,255,${fade * 0.6})`);
                    orbG.addColorStop(1, 'rgba(80,0,180,0)');
                    ctx.fillStyle = orbG;
                    ctx.globalAlpha = fade;
                    ctx.beginPath(); ctx.arc(tx, ty, orbR, 0, Math.PI * 2); ctx.fill();
                }

                ctx.globalAlpha = 1; ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        // NULL SLASH, CHARGING (semicircle telegraph + charge glow)
        if (enemy._nullSlashPhase === 'charging') {
            const progress = Math.min(1, (enemy._nullSlashWindupTimer || 0) / (enemy._nullSlashWindupDur || 3000));
            const rageStacks = enemy._rageStacks || 0;
            const R = canvas.width * 0.5 + rageStacks * 5;
            const ang = enemy._nullSlashAngle || (Math.PI / 2);
            ctx.save();

            // Semicircle: opens toward player (arc spans ±90° around the angle to player)
            const arcStart = ang - Math.PI / 2;
            const arcEnd   = ang + Math.PI / 2;
            const curR = R * (0.3 + 0.7 * progress);

            // Outer glow fill
            if (!_mobPerf) {
                const sfg = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, curR);
                sfg.addColorStop(0, `rgba(80,0,180,${0.08 * progress})`);
                sfg.addColorStop(0.7, `rgba(120,0,220,${0.06 * progress})`);
                sfg.addColorStop(1, 'rgba(60,0,150,0)');
                ctx.fillStyle = sfg;
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
                ctx.closePath();
                ctx.fill();
            }

            // Pulsing arc border
            const pulseAlpha = 0.6 + 0.35 * Math.sin(now / 60);
            if (!_mobPerf) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 20 + progress * 15; }
            ctx.strokeStyle = `rgba(160,50,255,${pulseAlpha * progress})`;
            ctx.lineWidth = 3 + progress * 4;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
            ctx.stroke();

            // Flat diameter line (the chord closing the semicircle)
            const p1x = enemy.x + Math.cos(arcStart) * curR;
            const p1y = enemy.y + Math.sin(arcStart) * curR;
            const p2x = enemy.x + Math.cos(arcEnd) * curR;
            const p2y = enemy.y + Math.sin(arcEnd) * curR;
            ctx.strokeStyle = `rgba(200,100,255,${0.5 * progress})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 7]);
            ctx.lineDashOffset = -(now / 60) % 17;
            ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0;
            ctx.shadowBlur = 0;

            // Rage: crackling void energy lines inside the charging arc (stack 1+, MED+)
            if (!_mobPerf && rageStacks >= 1 && progress > 0.20) {
                const rcCount = rageStacks * 3; // 3-15 bolts
                const rcCol   = rageStacks >= 4 ? 'rgba(180,240,255,' : rageStacks >= 2 ? 'rgba(170,90,255,' : 'rgba(140,40,220,';
                const rcGlow  = rageStacks >= 4 ? '#88ddff' : '#8800cc';
                ctx.save();
                ctx.shadowColor = rcGlow; ctx.shadowBlur = rageStacks >= 3 ? 10 : 6;
                ctx.lineWidth = rageStacks >= 3 ? 1.8 : 1.2;
                for (let rc = 0; rc < rcCount; rc++) {
                    const rcBaseAng = arcStart + (rc / rcCount) * Math.PI;
                    const rcDist = curR * (0.15 + 0.55 * Math.abs(Math.sin(rc * 2.618)));
                    let bx = enemy.x + Math.cos(rcBaseAng) * rcDist;
                    let by = enemy.y + Math.sin(rcBaseAng) * rcDist;
                    const rcAlpha = progress * (0.4 + 0.35 * Math.sin(now / 90 + rc * 1.3));
                    ctx.strokeStyle = rcCol + rcAlpha + ')';
                    ctx.globalAlpha = 1;
                    ctx.beginPath(); ctx.moveTo(bx, by);
                    for (let s = 0; s < 4; s++) {
                        const sAng = rcBaseAng + Math.sin(rc * 4.37 + s * 2.09) * 0.7;
                        const sLen = curR * (0.06 - s * 0.01);
                        bx += Math.cos(sAng) * sLen;
                        by += Math.sin(sAng) * sLen;
                        ctx.lineTo(bx, by);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0; ctx.restore();
            }

            // Converging charge particles (MED+)
            if (_gfxLevel < 2 && progress > 0.15) {
                for (let cp = 0; cp < 8; cp++) {
                    const cpAngle = arcStart + (cp / 8) * Math.PI + (now / 500);
                    const cpDist = curR * (0.3 + 0.7 * ((now / 300 + cp * 0.7) % 1));
                    const cpX = enemy.x + Math.cos(cpAngle) * cpDist;
                    const cpY = enemy.y + Math.sin(cpAngle) * cpDist;
                    ctx.globalAlpha = progress * 0.7;
                    ctx.fillStyle = '#cc66ff';
                    ctx.beginPath(); ctx.arc(cpX, cpY, 3 + progress * 2, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Warning fill flash at >85% progress
            if (progress > 0.85) {
                const flashA = ((progress - 0.85) / 0.15) * 0.25;
                ctx.globalAlpha = flashA;
                ctx.fillStyle = 'rgba(120,0,220,1)';
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
                ctx.closePath();
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // NULL SLASH, STRIKING (arc slash, tentacle sweeps 180° through target)
        if (enemy._nullSlashPhase === 'striking') {
            const st  = enemy._nullSlashStrikeTimer || 0;
            const tx2 = enemy._nullSlashTargetX, ty2 = enemy._nullSlashTargetY;
            const cx  = enemy._nullSlashOriginX !== undefined ? enemy._nullSlashOriginX : enemy.x;
            const cy  = enemy._nullSlashOriginY !== undefined ? enemy._nullSlashOriginY : enemy.y;

            // Timing: shoot-out → arc sweep → retract (~950ms)
            const EXTEND = 200, SWEEP = 520, RETRACT = 230;
            const nsAng      = enemy._nullSlashAngle || Math.atan2(ty2 - cy, tx2 - cx);
            const rageStacks = enemy._rageStacks || 0;
            const rageSizeMult = 1 + rageStacks * 0.05;  // +5% tentacle size per stack
            const R          = Math.hypot(tx2 - cx, ty2 - cy) + rageStacks * 5; // +5px arc radius per stack
            const arcStart = nsAng - Math.PI / 2;
            const arcSpan  = Math.PI; // 180° sweep through target at midpoint

            let ext, sweepT;
            if (st < EXTEND) {
                ext = 1 - Math.pow(1 - st / EXTEND, 2.8);
                sweepT = 0;
            } else if (st < EXTEND + SWEEP) {
                const s = (st - EXTEND) / SWEEP;
                ext = 1.0;
                sweepT = s < 0.5 ? 2*s*s : -1+(4-2*s)*s; // ease-in-out
            } else {
                const r = (st - EXTEND - SWEEP) / RETRACT;
                ext = Math.pow(1 - r, 2.2);
                sweepT = 1.0;
            }

            if (ext > 0.01) {
            const tipAngle = arcStart + sweepT * arcSpan;

            // Rift timing, stays open (sweepT=1) and fades quickly, independent of tentacle retract
            const RIFT_FADE = 185;
            let rST, rE;
            if (st < EXTEND + SWEEP) { rST = sweepT; rE = ext; }
            else { rST = 1.0; rE = Math.max(0, 1 - (st - EXTEND - SWEEP) / RIFT_FADE); }

            // Build rubber tentacle: base at Egregor, tip traces the arc
            // Rubber lag: base lags behind tip in sweep angle
            const steps = 38;
            const tentPts = [];
            for (let i = 0; i <= steps; i++) {
                const tRaw = i / steps;
                const laggedST   = sweepT * Math.pow(tRaw, 0.5);
                const ptAngle    = arcStart + laggedST * arcSpan;
                const radius     = tRaw * R * ext;
                const radX = Math.cos(ptAngle), radY = Math.sin(ptAngle);
                // Radial wobble (rubber undulation in/out)
                const amp  = Math.pow(tRaw, 1.6) * 72 * ext;
                const ph   = tRaw * Math.PI * 3.4 - sweepT * Math.PI * 4.8;
                const wOff = Math.sin(ph) * amp
                           + Math.sin(tRaw*Math.PI*6.2 - sweepT*Math.PI*8) * Math.pow(tRaw,2.2) * 22 * ext;
                tentPts.push({
                    x: cx + radius*radX + radX*wOff,
                    y: cy + radius*radY + radY*wOff,
                    w: 1 - tRaw
                });
            }

            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            // Arc sweep trail (motion blur showing where tip has been)
            if (!_mobPerf && sweepT > 0.06 && sweepT < 0.96 && ext > 0.55) {
                for (let tr = 5; tr >= 1; tr--) {
                    const trST = Math.max(0, sweepT - tr * 0.10);
                    const trA  = arcStart + trST * arcSpan;
                    ctx.shadowColor = '#6600cc'; ctx.shadowBlur = 16;
                    ctx.strokeStyle = `rgba(100,0,200,${(6-tr)*0.022*ext})`;
                    ctx.lineWidth   = (6-tr) * 4 * ext;
                    ctx.beginPath(); ctx.arc(cx, cy, R * ext * 0.90, trA, tipAngle); ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Aura, glowing void halo around tentacle (rage 1+)
            if (!_mobPerf && rageStacks >= 1) {
                ctx.shadowColor = rageStacks >= 3 ? '#bb77ff' : '#8800cc';
                ctx.shadowBlur  = 28 + rageStacks * 12;
                const auraA = Math.min(0.32, (0.06 + rageStacks * 0.035) * ext);
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si+1];
                    ctx.strokeStyle = `rgba(140,0,255,${auraA * p0.w})`;
                    ctx.lineWidth   = Math.max(8, 125 * p0.w * rageSizeMult);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Layer 0: void core
            if (!_mobPerf) { ctx.shadowColor = '#1a0030'; ctx.shadowBlur = 45; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(6,0,18,0.97)`;
                ctx.lineWidth = Math.max(2, 92 * p0.w * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            // Layer 1: deep purple body
            if (!_mobPerf) { ctx.shadowColor = '#5500aa'; ctx.shadowBlur = 28; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(85,0,165,${0.90 * ext})`;
                ctx.lineWidth = Math.max(1, 70 * p0.w * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            // Layer 2: bright outer skin
            if (!_mobPerf) { ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 16; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(155,25,255,${0.72 * ext})`;
                ctx.lineWidth = Math.max(0.5, 46 * p0.w * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            // Layer 3: highlight stripe (follows local tangent)
            ctx.shadowBlur = 0;
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                const sdx = p1.x-p0.x, sdy = p1.y-p0.y, sL = Math.hypot(sdx,sdy)||1;
                const hpX = -sdy/sL, hpY = sdx/sL, ho = 5 * p0.w * rageSizeMult;
                ctx.strokeStyle = `rgba(225,135,255,${0.42 * p0.w * ext})`;
                ctx.lineWidth = Math.max(0.5, 19 * p0.w * rageSizeMult);
                ctx.beginPath();
                ctx.moveTo(p0.x+hpX*ho, p0.y+hpY*ho); ctx.lineTo(p1.x+hpX*ho, p1.y+hpY*ho);
                ctx.stroke();
            }

            // Layer 4: thin spine
            if (!_mobPerf) { ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 12; }
            for (let si = 0; si < tentPts.length - 1; si++) {
                const p0 = tentPts[si], p1 = tentPts[si+1];
                ctx.strokeStyle = `rgba(225,115,255,${0.42 * p0.w * ext})`;
                ctx.lineWidth = Math.max(0.5, 7 * p0.w);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Suckers (MED+)
            if (_gfxLevel < 2) {
                for (let si = 2; si < tentPts.length - 2; si += 2) {
                    const p = tentPts[si];
                    const sr = Math.max(3, 15 * p.w);
                    ctx.fillStyle = `rgba(28,0,65,${0.88 * ext})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, sr, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = `rgba(185,65,255,${0.55 * ext})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, sr * 0.42, 0, Math.PI * 2); ctx.fill();
                }
            }

            // DIMENSIONAL RIFT, không gian bị xé toạc (rage 1+, MED+)
            // Layer cuối: đè lên xúc tu, rift fades independently (rST/rE) after sweep
            if (!_mobPerf && rageStacks >= 1 && rST > 0.04 && rE > 0.01) {
                ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                const RN = 60;
                const inPts = [], outPts = [];
                for (let ci2 = 0; ci2 <= RN; ci2++) {
                    const frac = ci2 / RN;
                    if (frac > rST + 0.012) break;
                    const ang2    = arcStart + frac * arcSpan;
                    const baseR2  = R * rE * 0.88;
                    const tipDist = Math.max(0, rST - frac);
                    const open    = Math.pow(Math.min(1, tipDist * 6), 0.55) * rE;
                    const halfW   = (13 + rageStacks * 5) * open;
                    const jI = Math.sin(ci2*3.718+0.618)*(3+rageStacks)
                             + Math.sin(ci2*7.391+1.234)*(1.2+rageStacks*0.4)
                             + Math.sin(ci2*1.618+2.718)*(0.8+rageStacks*0.2);
                    const jO = Math.sin(ci2*2.618+1.400)*(3+rageStacks)
                             + Math.sin(ci2*5.236+0.900)*(1.2+rageStacks*0.4)
                             + Math.sin(ci2*0.927+3.141)*(0.8+rageStacks*0.2);
                    const aJ = Math.sin(ci2*4.317+2.100)*0.018;
                    inPts.push({ x:cx+Math.cos(ang2+aJ)*(baseR2-halfW+jI), y:cy+Math.sin(ang2+aJ)*(baseR2-halfW+jI) });
                    outPts.push({ x:cx+Math.cos(ang2-aJ)*(baseR2+halfW+jO), y:cy+Math.sin(ang2-aJ)*(baseR2+halfW+jO) });
                }

                if (inPts.length >= 2) {
                    const rN = inPts.length;
                    const riftW  = 13 + rageStacks * 5;
                    const midAng = arcStart + rST * arcSpan * 0.42;
                    const mX = cx + Math.cos(midAng) * R * rE * 0.88;
                    const mY = cy + Math.sin(midAng) * R * rE * 0.88;

                    // Interior, clip to rift polygon, reveal other dimension
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(inPts[0].x, inPts[0].y);
                    for (let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y);
                    for (let i=rN-1;i>=0;i--) ctx.lineTo(outPts[i].x,outPts[i].y);
                    ctx.closePath(); ctx.clip();

                    ctx.fillStyle = '#01000c';
                    ctx.fillRect(cx-R*2.2, cy-R*2.2, R*4.4, R*4.4);

                    const gG2 = ctx.createRadialGradient(mX,mY,0, mX,mY,riftW*5.5);
                    gG2.addColorStop(0,    'rgba(255,242,215,0.65)');
                    gG2.addColorStop(0.08, 'rgba(215,155,255,0.55)');
                    gG2.addColorStop(0.22, 'rgba(105,32,210,0.42)');
                    gG2.addColorStop(0.48, 'rgba(28,6,85,0.24)');
                    gG2.addColorStop(1,    'rgba(1,0,12,0)');
                    ctx.fillStyle=gG2; ctx.fillRect(cx-R*2.2,cy-R*2.2,R*4.4,R*4.4);

                    // Interior detail tiers
                    // HIGH (0): 9 nebulae + 3 spiral arms + full stars + all faults + cosmic
                    // MED  (1): 4 nebulae + no arms      + 20 stars   + 1 fault    + no cosmic
                    // LOW  (2): galaxy core only (already drawn above)
                    if (_gfxLevel < 2) {
                        ctx.globalCompositeOperation = 'lighter';
                        const NEB_ALL = [
                            [0.10,riftW*2.0, 42,  0,152,0.24],[0.26,riftW*2.5,122,  0,218,0.26],
                            [0.42,riftW*1.8,  0, 82,192,0.22],[0.58,riftW*2.2, 82,  0,182,0.24],
                            [0.74,riftW*1.6,172, 52,248,0.18],[0.36,riftW*3.5, 16,  0, 72,0.18],
                            [0.50,riftW*2.8,230,110,  0,0.10],[0.20,riftW*1.5,255,180,100,0.07],
                            [0.65,riftW*2.0,  0,160,200,0.12],
                        ];
                        // MED: only first 4 nebulae (cheapest, most visible)
                        const nebCount = _gfxLevel === 0 ? NEB_ALL.length : 4;
                        for (let ni=0;ni<nebCount;ni++) {
                            const [nF,nR2,r2,g2,b2,a2] = NEB_ALL[ni];
                            if (nF > rST) continue;
                            const nA = arcStart + nF*arcSpan;
                            const nx2 = cx+Math.cos(nA)*R*rE*0.88, ny2 = cy+Math.sin(nA)*R*rE*0.88;
                            const nG = ctx.createRadialGradient(nx2,ny2,0,nx2,ny2,nR2);
                            nG.addColorStop(0,`rgba(${r2},${g2},${b2},${a2})`);
                            nG.addColorStop(1,'rgba(0,0,0,0)');
                            ctx.fillStyle=nG; ctx.fillRect(cx-R*2.2,cy-R*2.2,R*4.4,R*4.4);
                        }

                        // Spiral arms: HIGH only (36 gradient creates/frame)
                        if (_gfxLevel === 0) {
                            const swirlA = now * 0.00016;
                            for (let arm=0;arm<3;arm++) {
                                const aBase = swirlA + arm*(Math.PI*2/3);
                                for (let seg=0;seg<12;seg++) {
                                    const sF=seg/12, sA=aBase+sF*Math.PI*0.85;
                                    const sRad=riftW*(0.15+sF*1.8);
                                    const al=(0.08-sF*0.065)*rE; if(al<0.003) continue;
                                    const sG=ctx.createRadialGradient(mX+Math.cos(sA)*sRad,mY+Math.sin(sA)*sRad,0,mX+Math.cos(sA)*sRad,mY+Math.sin(sA)*sRad,sRad*0.6);
                                    sG.addColorStop(0,`rgba(145,88,255,${al})`);
                                    sG.addColorStop(1,'rgba(0,0,0,0)');
                                    ctx.fillStyle=sG; ctx.fillRect(cx-R*2.2,cy-R*2.2,R*4.4,R*4.4);
                                }
                            }
                        }
                        ctx.globalCompositeOperation = 'source-over';

                        // Stars: HIGH = 44+stacks*9, MED = 20 fixed
                        const STAR_N = _gfxLevel === 0 ? 44 + rageStacks*9 : 20;
                        for (let si2=0;si2<STAR_N;si2++) {
                            const sFrac=(si2*0.6180339)%1;
                            if(sFrac>rST) continue;
                            const sAng=arcStart+sFrac*arcSpan;
                            const sOff=Math.sin(si2*2.618+0.5)*riftW*0.80;
                            const sx2=cx+Math.cos(sAng+Math.sin(si2*1.414)*0.022)*(R*rE*0.88+sOff);
                            const sy2=cy+Math.sin(sAng+Math.sin(si2*1.414)*0.022)*(R*rE*0.88+sOff);
                            const ssz=si2%13===0?2.9:si2%7===0?2.0:si2%3===0?1.25:0.65;
                            const tw=0.55+0.40*Math.sin(now*0.0018+si2*1.618);
                            const sc2=si2%5===0?[165,202,255]:si2%7===0?[255,229,185]
                                     :si2%11===0?[202,145,255]:si2%17===0?[172,255,222]
                                     :si2%19===0?[255,200,180]:[255,255,255];
                            ctx.fillStyle=`rgba(${sc2[0]},${sc2[1]},${sc2[2]},${tw*(ssz>1?1:0.85)})`;
                            ctx.beginPath(); ctx.arc(sx2,sy2,ssz,0,Math.PI*2); ctx.fill();
                            // Cross-spikes: HIGH only
                            if (_gfxLevel === 0 && ssz>=2.0) {
                                ctx.globalAlpha=tw*0.42;
                                ctx.strokeStyle=`rgba(${sc2[0]},${sc2[1]},${sc2[2]},1)`; ctx.lineWidth=0.55;
                                const spk=ssz*3.5;
                                ctx.beginPath(); ctx.moveTo(sx2-spk,sy2); ctx.lineTo(sx2+spk,sy2); ctx.stroke();
                                ctx.beginPath(); ctx.moveTo(sx2,sy2-spk); ctx.lineTo(sx2,sy2+spk); ctx.stroke();
                                ctx.globalAlpha=1;
                            }
                        }

                        // Fault lines: HIGH = 2+stacks, MED = 1
                        ctx.globalCompositeOperation = 'lighter';
                        const FL_N = _gfxLevel === 0 ? 2+rageStacks : 1;
                        for (let fi=0;fi<FL_N;fi++) {
                            const fSt=fi/(FL_N+1), fEd=Math.min(rST,fSt+0.58);
                            if(fSt>rST) continue;
                            const fPts=[];
                            for(let s=0;s<=12;s++){
                                const f=fSt+(s/12)*(fEd-fSt), a3=arcStart+f*arcSpan;
                                const off2=Math.sin(fi*3.618+s*1.414)*riftW*0.40;
                                fPts.push({x:cx+Math.cos(a3)*(R*rE*0.88+off2), y:cy+Math.sin(a3)*(R*rE*0.88+off2)});
                            }
                            const fC=['rgba(218,198,255,','rgba(142,218,255,','rgba(255,198,218,','rgba(198,255,218,'][fi%4];
                            ctx.strokeStyle=fC+(0.22*rE)+')';
                            ctx.shadowColor=['#aa77ff','#55bbff','#ff88aa','#77ffaa'][fi%4];
                            ctx.shadowBlur=6; ctx.lineWidth=0.85+fi*0.28;
                            ctx.beginPath(); ctx.moveTo(fPts[0].x,fPts[0].y);
                            for(let s=1;s<fPts.length;s++) ctx.lineTo(fPts[s].x,fPts[s].y); ctx.stroke();
                        }
                        ctx.globalCompositeOperation='source-over'; ctx.shadowBlur=0;

                        // Cosmic object: HIGH only (rage 2+)
                        if (_gfxLevel === 0 && rageStacks>=2 && rST>0.30) {
                            const anF=0.27, anA=arcStart+anF*arcSpan;
                            const anX=cx+Math.cos(anA)*R*rE*0.88, anY=cy+Math.sin(anA)*R*rE*0.88;
                            const anR=4+rageStacks*1.6;
                            const anG=ctx.createRadialGradient(anX,anY,0,anX,anY,anR*3.0);
                            anG.addColorStop(0,   rageStacks>=4?'rgba(218,248,255,0.97)':'rgba(255,238,208,0.93)');
                            anG.addColorStop(0.28,rageStacks>=4?'rgba(88,172,255,0.74)':'rgba(202,102,255,0.68)');
                            anG.addColorStop(0.65,'rgba(22,4,62,0.40)');
                            anG.addColorStop(1,   'rgba(0,0,20,0)');
                            ctx.fillStyle=anG; ctx.beginPath(); ctx.arc(anX,anY,anR*3,0,Math.PI*2); ctx.fill();
                            ctx.fillStyle=rageStacks>=4?'rgba(238,252,255,1)':'rgba(255,244,228,1)';
                            ctx.beginPath(); ctx.arc(anX,anY,anR*0.40,0,Math.PI*2); ctx.fill();
                            if (rageStacks>=4) {
                                ctx.strokeStyle='rgba(180,230,255,0.45)'; ctx.lineWidth=0.8;
                                ctx.beginPath(); ctx.ellipse(anX,anY,anR*1.8,anR*0.7,anA+Math.PI/4,0,Math.PI*2); ctx.stroke();
                            }
                        }
                    } // end interior (_gfxLevel < 2)

                    ctx.restore(); // end clip

                    // Edges
                    // HIGH: outer haze + main glow + white razor (3 layers)
                    // MED:  outer haze + main glow              (2 layers)
                    // LOW:  main glow only                      (1 layer)
                    const eGlow=rageStacks>=4?'#ddd8ff':rageStacks>=2?'#cc77ff':'#aa44cc';
                    const eRGB =rageStacks>=4?'228,248,255':rageStacks>=2?'232,172,255':'212,132,255';
                    // Outer haze (HIGH + MED)
                    if (_gfxLevel < 2) {
                        ctx.shadowColor=eGlow; ctx.shadowBlur=22+rageStacks*9;
                        ctx.strokeStyle=`rgba(175,75,255,${0.10*rE})`; ctx.lineWidth=12+rageStacks*3;
                        ctx.beginPath(); ctx.moveTo(inPts[0].x,inPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(outPts[0].x,outPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(outPts[i].x,outPts[i].y); ctx.stroke();
                    }
                    // Main glow edge (all tiers)
                    ctx.shadowColor=eGlow; ctx.shadowBlur=12+rageStacks*5;
                    ctx.strokeStyle=`rgba(${eRGB},${0.88*rE})`; ctx.lineWidth=2.2+rageStacks*0.48;
                    ctx.beginPath(); ctx.moveTo(inPts[0].x,inPts[0].y);
                    for(let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(outPts[0].x,outPts[0].y);
                    for(let i=1;i<rN;i++) ctx.lineTo(outPts[i].x,outPts[i].y); ctx.stroke();
                    // White razor (HIGH only)
                    if (_gfxLevel === 0) {
                        ctx.shadowColor='#ffffff'; ctx.shadowBlur=9;
                        ctx.strokeStyle=`rgba(255,255,255,${0.70*rE})`; ctx.lineWidth=0.9;
                        ctx.beginPath(); ctx.moveTo(inPts[0].x,inPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(inPts[i].x,inPts[i].y); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(outPts[0].x,outPts[0].y);
                        for(let i=1;i<rN;i++) ctx.lineTo(outPts[i].x,outPts[i].y); ctx.stroke();
                    }
                    ctx.shadowBlur=0;

                    // Edge sparks + fringe + tip flash
                    // HIGH: 12+stacks*4 sparks + fringe + tip flash
                    // MED:  8 sparks only (no fringe, no tip)
                    // LOW:  none
                    if (_gfxLevel < 2) {
                        const SPK_N = _gfxLevel === 0 ? 12+rageStacks*4 : 8;
                        for(let spi=0;spi<SPK_N;spi++){
                            const spF=(spi*0.6180339)%1; if(spF>rST-0.01) continue;
                            const ePts=spi%2===0?inPts:outPts;
                            const spI=Math.min(rN-1,Math.floor(spF*rN)); if(!ePts[spI]) continue;
                            const tw2=Math.max(0, 0.44+0.52*Math.sin(now*0.0025+spi*2.618));
                            const spSz=Math.max(0, (0.85+(spi%3)*0.58)*tw2);
                            const spC=spi%4===0?`rgba(255,255,255,${tw2})`:spi%4===1?`rgba(222,182,255,${tw2*0.9})`:
                                      spi%4===2?`rgba(182,222,255,${tw2*0.85})`:`rgba(255,212,238,${tw2*0.75})`;
                            ctx.shadowColor='#ffffff'; ctx.shadowBlur=8; ctx.fillStyle=spC;
                            ctx.beginPath(); ctx.arc(ePts[spI].x,ePts[spI].y,spSz,0,Math.PI*2); ctx.fill();
                        }
                        ctx.shadowBlur=0;

                        // Fringe + tip flash: HIGH only
                        if (_gfxLevel === 0) {
                            const FRG_N=8+rageStacks*2;
                            for(let fri=0;fri<FRG_N;fri++){
                                const frF=(fri*0.6180339)%1; if(frF>rST-0.02) continue;
                                const frAng=arcStart+frF*arcSpan;
                                const ePts=fri%2===0?inPts:outPts;
                                const frI=Math.min(rN-1,Math.floor(frF*rN)); if(!ePts[frI]) continue;
                                const ep=ePts[frI];
                                const frDir=frAng+(fri%2===0?Math.PI:0);
                                const frLen=(3+Math.abs(Math.sin(fri*2.618))*(4+rageStacks))*rE;
                                const kink=frDir+Math.sin(fri*3.14)*0.44;
                                ctx.strokeStyle=`rgba(${eRGB},${0.28*rE})`; ctx.lineWidth=0.65;
                                ctx.beginPath(); ctx.moveTo(ep.x,ep.y);
                                ctx.lineTo(ep.x+Math.cos(kink)*frLen*0.5, ep.y+Math.sin(kink)*frLen*0.5);
                                ctx.lineTo(ep.x+Math.cos(frDir+Math.sin(fri)*0.26)*frLen, ep.y+Math.sin(frDir+Math.sin(fri)*0.26)*frLen);
                                ctx.stroke();
                            }
                            if(rST>0.04 && rST<0.97 && rN>=2){
                                const tI=inPts[rN-1], tO=outPts[rN-1];
                                const tMX=(tI.x+tO.x)/2, tMY=(tI.y+tO.y)/2;
                                const tPulse=0.72+0.28*Math.sin(now*0.009);
                                ctx.shadowColor='#ffffff'; ctx.shadowBlur=24;
                                ctx.globalAlpha=tPulse*rE*0.90;
                                const tG=ctx.createRadialGradient(tMX,tMY,0,tMX,tMY,10+rageStacks*2.8);
                                tG.addColorStop(0,'rgba(255,255,255,1)'); tG.addColorStop(0.2,'rgba(215,190,255,0.82)');
                                tG.addColorStop(0.6,'rgba(120,55,215,0.35)'); tG.addColorStop(1,'rgba(80,20,180,0)');
                                ctx.fillStyle=tG; ctx.beginPath(); ctx.arc(tMX,tMY,10+rageStacks*2.8,0,Math.PI*2); ctx.fill();
                                ctx.globalAlpha=tPulse*rE*0.65; ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=0.7;
                                for(let ts=0;ts<5;ts++){
                                    const tA=(ts/5)*Math.PI*2+now*0.004;
                                    const tLen=6+rageStacks*1.5+Math.sin(now*0.01+ts)*2;
                                    ctx.beginPath(); ctx.moveTo(tMX,tMY); ctx.lineTo(tMX+Math.cos(tA)*tLen,tMY+Math.sin(tA)*tLen); ctx.stroke();
                                }
                                ctx.globalAlpha=1;
                            }
                        } // end HIGH sparks/fringe/tip
                    } // end MED+LOW edge sparks
                }
                ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.restore();
            }

            // Impact flash when tip sweeps through target (at midpoint of sweep)
            const impactSt = EXTEND + SWEEP * 0.5;
            const impA = Math.max(0, 1 - Math.abs(st - impactSt) / 115);
            if (impA > 0.04) {
                const impR = 110 + rageStacks * 20; // larger at rage
                if (!_mobPerf) {
                    ctx.shadowColor = rageStacks >= 3 ? '#aaffff' : '#ff44ff';
                    ctx.shadowBlur  = 45 + rageStacks * 8;
                }
                ctx.globalAlpha = impA * 0.92;
                const c1 = rageStacks >= 4 ? 'rgba(210,255,255,1.0)'
                         : rageStacks >= 2 ? 'rgba(210,160,255,1.0)'
                         :                  'rgba(255,210,255,1.0)';
                const c2 = rageStacks >= 4 ? 'rgba(100,220,255,0.90)'
                         : rageStacks >= 2 ? 'rgba(170,60,255,0.90)'
                         :                  'rgba(230,80,255,0.90)';
                const impG = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, impR);
                impG.addColorStop(0,   c1);
                impG.addColorStop(0.2, c2);
                impG.addColorStop(0.6, 'rgba(110,0,230,0.45)');
                impG.addColorStop(1,   'rgba(55,0,180,0)');
                ctx.fillStyle = impG;
                ctx.beginPath(); ctx.arc(tx2, ty2, impR, 0, Math.PI * 2); ctx.fill();
                // Outer void ring (rage 2+)
                if (!_mobPerf && rageStacks >= 2) {
                    ctx.globalAlpha = impA * 0.55;
                    ctx.strokeStyle = rageStacks >= 4 ? 'rgba(180,255,255,0.85)' : 'rgba(165,80,255,0.85)';
                    ctx.lineWidth   = 1.5 + rageStacks * 0.5;
                    ctx.beginPath(); ctx.arc(tx2, ty2, impR * 1.35, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            }

            ctx.globalAlpha = 1; ctx.restore();
            } // end ext > 0.01
        }

    }
}