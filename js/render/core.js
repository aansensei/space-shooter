// render/core.js — extracted from render.js (lines 1-304, 424-1536).
// Module state (quality flags, sprite caches), init helpers, background
// rendering, the main draw() orchestrator, and the start screen.
// Loaded first among render/*.js — every other render file reads
// _mobPerf / _gfxLevel / the sprite-cache getters defined here.

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
    if (!isFinite(radius) || radius <= 0) return null;
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
    // PIXI background (background.js) is active: just clear so it shows through
    if (window._bgReady) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
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
        if (W > 0 && H > 0 && (!_nebulaCanvas || _nebulaCanvas.width !== W || _nebulaCanvas.height !== H)) {
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
                if (b.r <= 0) continue;
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

function drawYogSothothDomain() {
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

function draw(deltaTime) {
    ctx.save();
    if (screenShake.duration > 0 && _gfxLevel < 1 && window._screenShakeEnabled !== false && gameState !== 'gameover' && !window._sigilPicker) {
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

    if (gameState === "playing" && skillShiftActive) drawYogSothothDomain();

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
        _drawEgregorDeathBursts(); // Dedicated Egregor death explosion, independent of Egregor's own lifetime

        // Draw non-bullet enemies first (background layer)
        enemies.forEach(e => { if (!e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain') drawEnemy(e); });
        _drawVineBinds(); // Phōtokrystos DNT Vine Bind — growth + slow aura, on top of rooted enemies
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
            if (window._mirrorLaserEntities) drawMirrorLaserEntities();
        }
        drawPlayer();
        if (typeof drawSigilShipUpgrades === 'function') drawSigilShipUpgrades();
        drawPlayerAura();
        _drawParryBursts(); // Yog-Sothoth Accurate Parry "Temporal Fracture" burst
        drawFinalDefense();

        if (charging && !laserActive) drawChargeEffect();
        explosions.forEach(drawExplosion);
        // Batch particle draw
        {
            const _specials = [];
            const _pixiP = window._usePixi && window._pixiDrawParticles;
            // _batches is only ever read below in the !_pixiP branch — when
            // Pixi is handling normal particles, building it was pure wasted
            // per-frame Map allocation + get/set work (every particle, every
            // frame) for a result nothing consumes.
            const _batches = _pixiP ? null : new Map();
            for (const p of particles) {
                if (p.isSummonRing || p.isLaserLine || p.isSkillGAura || p.isBarrierBreakRing || p._bloodPetal) { _specials.push(p); continue; }
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

            // Low-HP "RPG blood border": a harder-edged frame hugging the
            // screen edges (distinct from the soft radial pulse above,
            // which reads more like ambient bruising than a border) plus a
            // faint slow-rotating "choáng" haze — a cheap, overlay-only
            // dazed effect since this code runs after the frame is already
            // drawn and can't displace anything already on screen.
            if (window._lowHpActive) {
                const bt = _now / 900;
                const borderA = 0.16 + 0.10 * Math.abs(Math.sin(_now / 500));
                ctx.save();
                const edgeDepth = Math.min(canvas.width, canvas.height) * 0.16;
                // top
                let g = ctx.createLinearGradient(0, 0, 0, edgeDepth);
                g.addColorStop(0, `rgba(120,0,0,${borderA})`); g.addColorStop(1, 'rgba(120,0,0,0)');
                ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, edgeDepth);
                // bottom
                g = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - edgeDepth);
                g.addColorStop(0, `rgba(120,0,0,${borderA})`); g.addColorStop(1, 'rgba(120,0,0,0)');
                ctx.fillStyle = g; ctx.fillRect(0, canvas.height - edgeDepth, canvas.width, edgeDepth);
                // left
                g = ctx.createLinearGradient(0, 0, edgeDepth, 0);
                g.addColorStop(0, `rgba(120,0,0,${borderA})`); g.addColorStop(1, 'rgba(120,0,0,0)');
                ctx.fillStyle = g; ctx.fillRect(0, 0, edgeDepth, canvas.height);
                // right
                g = ctx.createLinearGradient(canvas.width, 0, canvas.width - edgeDepth, 0);
                g.addColorStop(0, `rgba(120,0,0,${borderA})`); g.addColorStop(1, 'rgba(120,0,0,0)');
                ctx.fillStyle = g; ctx.fillRect(canvas.width - edgeDepth, 0, edgeDepth, canvas.height);
                ctx.restore();

                // dazed haze — a few slow-rotating faint arcs around the
                // screen center, cheap (no per-pixel work) but reads as
                // disoriented swirling at the edge of vision
                if (_gfxLevel < 2) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    const arcCount = _gfxLevel < 1 ? 3 : 2;
                    for (let i = 0; i < arcCount; i++) {
                        const rot = bt * (i % 2 === 0 ? 1 : -1) * 0.6 + i * 2.1;
                        ctx.rotate(rot - (i === 0 ? 0 : 0)); // cumulative is fine, purely decorative
                        ctx.strokeStyle = `rgba(180,0,0,${0.08 + 0.05 * Math.sin(_now / 400 + i)})`;
                        ctx.lineWidth = 30;
                        ctx.beginPath();
                        ctx.arc(0, 0, outerR * 0.75, 0, Math.PI * 0.6);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Maou Haki oppressive darkening: dims the whole screen while
            // Dargruel's shockwave is expanding, on top of the shockwave's
            // own denser/darker fill (see drawBossShockwaves in fx.js) —
            // makes the effect feel like it's dominating the whole arena,
            // not just a localized ring.
            if (typeof bossShockwaves !== 'undefined') {
                const _maouActive = bossShockwaves.some(w => w.active && !w._isBTMWave);
                if (_maouActive) {
                    const darkPulse = 0.16 + 0.06 * Math.sin(_now / 260);
                    ctx.save();
                    ctx.fillStyle = `rgba(20,0,35,${darkPulse})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                }
            }
        }

        if (typeof _platform === 'undefined' || _platform !== 'mobile') drawSkillButtons();
        if (typeof drawSigilHUD === 'function') drawSigilHUD();

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
        const _yuukiRow = _yuukiBonus > 0 ? _rH : 0;
        const _hH = (_hMob ? 158 : 198) + _yuukiRow;

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

        if (_yuukiRow > 0) {
            _ry += _rH;
            ctx.fillStyle = '#ffaaaa';
            ctx.fillText(`⚔ Yuuki +${Math.round(_yuukiBonus * 100)}%`, _hX + _hW - _hPad, _ry + _fH);
        }

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
    if (window._sigilPicker && typeof drawSigilPicker === 'function') drawSigilPicker();
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

