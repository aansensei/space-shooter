// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// render/enemy-marchosias.js — extracted from render.js (main body, minion,
// death-sword blade). Three separate ranges in the original file, reassembled here.

// Commissioned hexagonal armor-plate texture for the body's own fill, which
// used to be a completely flat #1a1a2e - every other detail here (core,
// gear-teeth ring, panel outlines) is drawn on top of this same way it was
// drawn on top of the flat fill before. Pointy-top orientation (vertex at
// top and bottom), matching this file's own hexagon vertex math exactly, so
// no extra rotation is needed to line the two up.
const _marchoHexArmorImg = new Image();
_marchoHexArmorImg.src = 'assets/images/game/enemies/marchosias-hexagon-armor.png';
_marchoHexArmorImg.decode().catch(() => {});

// The hexagon body (fill + armor texture + stroke outline, plus the HIGH-
// tier neon bloom stroke) never animates - same 6 vertices and same 2
// colors on every frame for a given enemy, only the radius (from
// enemy.size, fixed per enemy) changes. Baked once per (radius, whether the
// armor PNG is ready to composite in, whether the HIGH-tier bloom applies)
// instead of re-filling/re-clipping/re-drawing-image/re-stroking every
// frame. Everything else in _drawMarchosias (core, circuit traces, gear
// ring, panels, motes...) pulses or rotates every frame and stays live.
const _marchoHexBodySpriteCache = {};
const _MARCHO_HEX_PAD = 30;
function _getMarchoHexBodySprite(r, hasArmor, hasBloom) {
    const key = r.toFixed(1) + '_' + (hasArmor ? 1 : 0) + '_' + (hasBloom ? 1 : 0);
    const cached = _marchoHexBodySpriteCache[key];
    if (cached) return cached;

    // Rounded up to an even number so pad (size/2) is always a whole pixel -
    // an odd canvas size would bake/place the sprite half a pixel off from
    // where the live vector path would land, softening every edge under
    // antialiasing even though the shape itself is otherwise identical.
    const size = Math.ceil((r + _MARCHO_HEX_PAD) * 2 / 2) * 2;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    cx.translate(size / 2, size / 2);

    cx.strokeStyle = '#00cc66'; cx.lineWidth = 2;
    cx.fillStyle = '#1a1a2e';
    cx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        i === 0 ? cx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            : cx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    cx.closePath(); cx.fill();
    if (hasArmor) {
        cx.save();
        cx.clip();
        const armorH = r * 2, armorW = r * Math.sqrt(3);
        cx.drawImage(_marchoHexArmorImg, -armorW / 2, -armorH / 2, armorW, armorH);
        cx.restore();
    }
    cx.stroke();

    if (hasBloom) {
        cx.save();
        cx.strokeStyle = 'rgba(0,255,150,0.35)';
        cx.lineWidth = 5;
        cx.shadowColor = '#00ffaa'; cx.shadowBlur = 16;
        cx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            i === 0 ? cx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                : cx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        cx.closePath(); cx.stroke();
        cx.shadowBlur = 0;
        cx.restore();
    }

    const sprite = { canvas: c, pad: size / 2 };
    _marchoHexBodySpriteCache[key] = sprite;
    return sprite;
}

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

    // Core clock pulse: a sharp digital spike that decays fast (capacitor-
    // discharge curve), not a smooth sine wave - this is what makes the core
    // and the circuit lines below read as an electric pulse rather than an
    // organic breathing glow.
    const CORE_TICK_MS = 1000;
    const _tickPhase = (now % CORE_TICK_MS) / CORE_TICK_MS;
    const _tickPulse = Math.exp(-_tickPhase * 6);

    // Hexagon body (6-sided like ref image) - fill, armor texture and
    // stroke outline never change frame-to-frame, so they're baked once per
    // (radius, armor-ready, bloom-tier) in _getMarchoHexBodySprite instead
    // of being filled/clipped/drawn/stroked live every frame.
    const _hexHasArmor = !_mobPerf && _marchoHexArmorImg.complete && _marchoHexArmorImg.naturalWidth > 0;
    const _hexHasBloom = _gfxLevel < 1;
    const _hexSprite = _getMarchoHexBodySprite(r, _hexHasArmor, _hexHasBloom);
    ctx.drawImage(_hexSprite.canvas, -_hexSprite.pad, -_hexSprite.pad);

    // Inner triangle frame doubles as the core's circuit traces, so its glow
    // pulses on the same clock as the core instead of sitting static. Each
    // trace also gets a perpendicular stub branch and via-pad dots, PCB-style
    // - all plain fills/strokes with no shadowBlur, so every tier keeps them;
    // only the glow behind the line is reserved for FULL+MED.
    ctx.strokeStyle = `rgba(0,220,120,${0.5 + _tickPulse * 0.4})`; ctx.lineWidth = 1;
    if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = _tickPulse * 7; }
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 6;
        const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        const midX = ex * 0.55, midY = ey * 0.55;
        const perpA = a + Math.PI / 2;
        const stubLen = r * 0.14;
        ctx.beginPath();
        ctx.moveTo(midX - Math.cos(perpA) * stubLen, midY - Math.sin(perpA) * stubLen);
        ctx.lineTo(midX + Math.cos(perpA) * stubLen, midY + Math.sin(perpA) * stubLen);
        ctx.stroke();
        ctx.fillStyle = `rgba(150,255,200,${0.5 + _tickPulse * 0.5})`;
        ctx.beginPath(); ctx.arc(midX, midY, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

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

    // Core gem: ghost-electric CPU pulse - the orb swells on the clock
    // spike, an oscilloscope-style ring wobbles around it, and a handful of
    // lightning branches jut out and fade before the next tick.
    const _coreR = r * 0.32 * (1 + _tickPulse * 0.22);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, _coreR);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.35, '#aaffdd');
    coreGrad.addColorStop(0.7, '#00ff88');
    coreGrad.addColorStop(1, '#004422');
    ctx.fillStyle = coreGrad;
    if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14 + _tickPulse * 16; }
    ctx.beginPath(); ctx.arc(0, 0, _coreR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Waveform ring: a wobbling closed loop around the core, like a live
    // oscilloscope trace synced to the same clock as the core. Plain stroke,
    // no shadowBlur, so it stays on every tier down to MIN.
    ctx.save();
    ctx.strokeStyle = `rgba(160,255,215,${0.35 + _tickPulse * 0.5})`;
    ctx.lineWidth = 1.2;
    const waveR = r * 0.44;
    const waveSegs = 24;
    ctx.beginPath();
    for (let i = 0; i <= waveSegs; i++) {
        const wa = (i / waveSegs) * Math.PI * 2;
        const wobble = Math.sin(wa * 6 + now / 90) * (1.5 + _tickPulse * 2.5);
        const wr = waveR + wobble;
        const wx = Math.cos(wa) * wr, wy = Math.sin(wa) * wr;
        i === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (!_mobPerf) {
        // Bloom halo: a gradient fill, no shadowBlur - cheap enough for
        // FULL+MED even though the shadowBlur-heavy motes below are FULL-only
        ctx.save();
        const haloR = _coreR * 1.8;
        const bloomG = ctx.createRadialGradient(0, 0, _coreR * 0.6, 0, 0, haloR);
        bloomG.addColorStop(0, `rgba(150,255,210,${0.25 + _tickPulse * 0.35})`);
        bloomG.addColorStop(1, 'rgba(150,255,210,0)');
        ctx.fillStyle = bloomG;
        ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Lightning branches: fixed count per tick, seeded by the tick index
        // so each branch holds its shape for the whole tick instead of
        // jittering every frame, fading out with the same decay as the pulse
        const _tickIndex = Math.floor(now / CORE_TICK_MS);
        const _branchCount = _gfxLevel < 1 ? 7 : 4;
        ctx.save();
        ctx.strokeStyle = `rgba(215,255,235,${_tickPulse * 0.85})`;
        ctx.lineWidth = 1.3;
        ctx.shadowColor = '#aaffcc'; ctx.shadowBlur = 8 * _tickPulse;
        for (let bi = 0; bi < _branchCount; bi++) {
            const seed = Math.abs(Math.sin(_tickIndex * 91.7 + bi * 13.1)) % 1;
            let px = 0, py = 0, pa = seed * Math.PI * 2;
            const branchLen = r * (0.45 + 0.35 * seed);
            ctx.beginPath(); ctx.moveTo(px, py);
            for (let s = 0; s < 3; s++) {
                pa += (seed * 12.9 % 1 - 0.5) * 0.9;
                px += Math.cos(pa) * (branchLen / 3);
                py += Math.sin(pa) * (branchLen / 3);
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        if (_gfxLevel < 1) {
            // Orbiting spark motes, HIGH only - the shadowBlur per mote is
            // the one part of this cluster too costly for MED
            ctx.save();
            ctx.fillStyle = `rgba(220,255,240,${0.7 + _tickPulse * 0.3})`;
            const _moGlow = _getGlowSprite('rgba(200,255,230,0.8)', 6);
            for (let mo = 0; mo < 6; mo++) {
                const moA = now / 700 + (mo / 6) * Math.PI * 2;
                const moR = r * 0.4 + Math.sin(now / 220 + mo) * r * 0.03;
                const mx = Math.cos(moA) * moR, my = Math.sin(moA) * moR;
                if (_moGlow) ctx.drawImage(_moGlow, mx - 6, my - 6);
                ctx.beginPath();
                ctx.arc(mx, my, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

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

    _drawMarchBarrier(enemy, r);
    _drawMarchCharge(enemy, r);
    _drawMarchCounters(enemy, r);

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

    if (enemy._miniBarrier && enemy.shield > 0) {
        const wa = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const hp = Math.min(1, enemy.shield / (enemy.maxHp * 0.5));
        ctx.save(); ctx.rotate(wa); ctx.globalAlpha = 0.45 + 0.55 * hp;
        const scale = (r + 8) / 100;
        ctx.drawImage(_marchSprites.ward, -128 * scale, -128 * scale, 256 * scale, 256 * scale);
        ctx.restore();
    }

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

function _drawMarchoBlade(blade) {
    if (!blade.active) {
        const p = Math.max(0, Math.min(1, 1 - blade.delay / MARCH_SWORD_WINDUP_MS));
        ctx.save(); ctx.translate(blade.x, blade.y); ctx.rotate(blade.angle);
        ctx.globalAlpha = 0.2 + p * 0.6;
        const size = 36 + 48 * p;
        ctx.drawImage(_marchSprites.sword, -size / 2, -size / 2, size, size);
        ctx.restore(); return;
    }
    const reduced = _marchReduced(), low = _mobPerf || _gfxLevel >= 2;
    const angle = Math.atan2(blade.vy, blade.vx), r = blade.radius || MARCH_SWORD_RADIUS;
    ctx.save(); ctx.translate(blade.x, blade.y); ctx.rotate(angle);
    if (!low && !reduced) {
        for (let i = 2; i > 0; i--) {
            ctx.globalAlpha = 0.12 / i;
            ctx.drawImage(_marchSprites.sword, -100 - i * 22, -100, 200, 200);
        }
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(_marchSprites.sword, -100, -100, 200, 200);
    ctx.strokeStyle = '#ff9a3c'; ctx.globalAlpha = low ? 0.45 : 0.3; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    if (!low && !reduced) {
        ctx.strokeStyle = '#ffe4ae'; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) {
            const p = ((blade._age || 0) / 240 + i * 0.25) % 1;
            const x = -22 - p * 92, y = Math.sin(i * 9.1) * 25;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 11, y + 2); ctx.stroke();
        }
    }
    if ((blade._age || 0) < 160 && !reduced) {
        ctx.globalAlpha = (1 - (blade._age || 0) / 160) * 0.5;
        ctx.strokeStyle = '#aaffdc'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.8, -1.1, 1.1); ctx.stroke();
    }
    ctx.restore();
}

function _drawMarchoDeathBurst(burst) {
    const p = 1 - burst.lifetime / burst.maxLifetime, r = burst.size / 2;
    const low = _mobPerf || _gfxLevel >= 2, reduced = _marchReduced();
    ctx.save(); ctx.translate(burst.x, burst.y);
    if (p < 0.22 && !reduced) {
        const size = r * (0.6 + p * 9);
        ctx.globalAlpha = (1 - p / 0.22) * 0.75;
        ctx.drawImage(_marchSprites.flash, -size, -size, size * 2, size * 2);
    }
    const radius = r * (0.4 + (reduced ? 0.3 : p * 2.6));
    ctx.globalAlpha = (1 - p) * 0.75;
    ctx.strokeStyle = '#8effce'; ctx.lineWidth = low ? 1.5 : 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 6;
        const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const count = low ? 3 : 6;
    for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count - Math.PI / 6;
        ctx.save(); ctx.rotate(angle);
        ctx.translate(r * (0.6 + (reduced ? 0 : p * 2.2)), 0);
        if (!reduced) ctx.rotate(p * (i % 2 ? 2 : -2));
        ctx.globalAlpha = 1 - p;
        ctx.drawImage(_marchSprites.fang, -r * 0.25, -r * 0.25, r * 0.5, r * 0.5);
        ctx.restore();
    }
    if (!low && !reduced) {
        ctx.globalAlpha = (1 - p) * 0.55;
        ctx.strokeStyle = '#ffad5d'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r * (0.3 + p * 3.4), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

// Arc Barrier shatter: the 90° shield band itself cracks apart the instant
// it breaks - a bright flash along the band, curved shard fragments flying
// off tangentially, and a burst of cracks radiating from the center.
// One-shot, driven by burst.lifetime (see marchoBarrierBursts in
// entities/marchosias.js's _triggerArcBarrierBreak).
function _drawMarchoBarrierBurst(burst) {
    const p = 1 - burst.lifetime / burst.maxLifetime, reduced = _marchReduced();
    const count = _mobPerf || _gfxLevel >= 2 ? 3 : 6;
    const radius = burst.size / 2 + 16;
    ctx.save(); ctx.translate(burst.x, burst.y);
    ctx.strokeStyle = burst.fullCycle ? '#ffd47c' : '#92ffd2';
    ctx.globalAlpha = (1 - p) * 0.65; ctx.lineWidth = burst.fullCycle ? 3 : 1.5;
    ctx.beginPath(); ctx.arc(0, 0, radius + p * (burst.fullCycle ? 65 : 28), 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < count; i++) {
        const angle = burst.angle - Math.PI / 4 + (i + 0.5) * Math.PI / (2 * count);
        ctx.save(); ctx.rotate(angle);
        ctx.translate(radius + (reduced ? 0 : p * 42), 0);
        if (!reduced) ctx.rotate(p * (i % 2 ? 1.5 : -1.5));
        ctx.globalAlpha = (1 - p) * 0.85;
        ctx.drawImage(_marchSprites.fang, -12, -7, 24, 14);
        ctx.restore();
    }
    ctx.restore();
}

function _marchReduced() { return !!window._fxOpts?.reducedMotion; }

// I bake the shared effect art once and keep moving draws to transforms.
const _marchSprites = (() => {
    function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
    const sword = canvas(200), g = sword.getContext('2d'); g.translate(100, 100);
    g.fillStyle = 'rgba(255,100,28,0.06)'; g.beginPath(); g.arc(0, 0, 88, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ff9140'; g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 85, -1.42, 1.42); g.stroke();
    g.strokeStyle = '#fff0c4'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, 81, -1.42, 1.42); g.stroke();
    g.fillStyle = '#12392f'; g.strokeStyle = '#ff9b45'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(88, 0); g.lineTo(-48, -22); g.lineTo(-24, 0); g.lineTo(-48, 22); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#d4fff1'; g.beginPath(); g.moveTo(86, 0); g.lineTo(-31, -5); g.lineTo(-22, 0); g.lineTo(-31, 5); g.closePath(); g.fill();
    g.strokeStyle = '#36edb0'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-22, 0); g.lineTo(-68, 0); g.moveTo(-36, -23); g.lineTo(-27, 0); g.lineTo(-36, 23); g.stroke();
    for (let i = 0; i < 7; i++) {
        const a = -1.2 + i * 0.4;
        g.save(); g.rotate(a); g.fillStyle = i % 2 ? '#aaffdc' : '#ffd48b';
        g.beginPath(); g.moveTo(80, -3); g.lineTo(88, 0); g.lineTo(79, 3); g.fill(); g.restore();
    }
    const shield = canvas(256), h = shield.getContext('2d'); h.translate(128,128);
    h.strokeStyle = 'rgba(21,110,77,0.35)'; h.lineWidth = 16; h.beginPath(); h.arc(0,0,100,-Math.PI/4,Math.PI/4); h.stroke();
    for (let i = 0; i < 8; i++) {
        h.save(); h.rotate(-Math.PI/4+(i+0.5)*Math.PI/16);
        h.fillStyle = '#153d30'; h.strokeStyle = '#59efb6'; h.lineWidth = 1;
        h.beginPath(); h.moveTo(94,-7); h.lineTo(105,-6); h.lineTo(113,0); h.lineTo(105,6); h.lineTo(94,7); h.closePath(); h.fill(); h.stroke();
        h.strokeStyle = '#baffdf'; h.beginPath(); h.moveTo(96,0); h.lineTo(107,0); h.stroke(); h.restore();
    }
    const ward = canvas(256); ward.getContext('2d').drawImage(shield,0,0);
    const fang = canvas(32), f = fang.getContext('2d');
    f.fillStyle = '#123d30'; f.strokeStyle = '#99ffce'; f.lineWidth = 1.5;
    f.beginPath(); f.moveTo(31,16); f.lineTo(3,4); f.lineTo(10,16); f.lineTo(3,28); f.closePath(); f.fill(); f.stroke();
    const ground = canvas(256), q = ground.getContext('2d'); q.translate(128,128);
    q.fillStyle = 'rgba(35,15,11,0.42)'; q.beginPath(); q.arc(0,0,118,0,Math.PI*2); q.fill();
    q.strokeStyle = 'rgba(241,109,44,0.5)'; q.lineWidth = 1.2;
    for (let i=0;i<13;i++) {
        const a=i*2.39996, r=42+(i%4)*18;
        q.save(); q.rotate(a); q.beginPath(); q.moveTo(12,0); q.lineTo(r*0.55,5); q.lineTo(r*0.7,-4); q.lineTo(r,2); q.stroke(); q.restore();
    }
    const flash = canvas(128), light = flash.getContext('2d');
    const glow = light.createRadialGradient(64,64,0,64,64,64);
    glow.addColorStop(0,'#e7fff4'); glow.addColorStop(0.35,'rgba(91,255,182,0.45)'); glow.addColorStop(1,'rgba(0,255,136,0)');
    light.fillStyle = glow; light.fillRect(0,0,128,128);
    return { sword, shield, ward, fang, ground, flash };
})();

function _drawMarchBarrier(enemy, r) {
    const low = _mobPerf || _gfxLevel >= 2, reduced = _marchReduced(), radius = r + 16;
    const hp = enemy.arcBarrier && enemy.arcBarrier.hp > 0 ? enemy.arcBarrier.hp / enemy.arcBarrier.maxHp : 0;
    const angle = enemy.arcBarrier ? enemy.arcBarrier.angle : 0;
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    if (hp > 0) {
        ctx.save(); ctx.rotate(angle); const scale = radius / 100;
        ctx.globalAlpha = 0.35 + hp * 0.65;
        ctx.drawImage(_marchSprites.shield, -128 * scale, -128 * scale, 256 * scale, 256 * scale);
        ctx.globalAlpha = 0.9; ctx.strokeStyle = '#90ffd0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,0,radius-5,-Math.PI/4,-Math.PI/4+Math.PI/2*hp); ctx.stroke();
        if (!low && !reduced) {
            const a = -Math.PI/4 + ((_marchClock / 1600) % 1) * Math.PI/2;
            ctx.fillStyle = '#daffec'; ctx.beginPath(); ctx.arc(Math.cos(a)*radius,Math.sin(a)*radius,2,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
        if (enemy.hp < enemy.maxHp * 0.30) {
            ctx.strokeStyle = '#ffd46b'; ctx.globalAlpha = 0.75; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.stroke();
            for (let i=0;i<6;i++) {
                ctx.save(); ctx.rotate(i*Math.PI/3); ctx.beginPath(); ctx.moveTo(radius-3,-5); ctx.lineTo(radius+5,0); ctx.lineTo(radius-3,5); ctx.stroke(); ctx.restore();
            }
        }
        ctx.fillStyle = '#063325'; ctx.fillRect(-25,-r-31,50,4);
        ctx.fillStyle = '#6affbd'; ctx.fillRect(-25,-r-31,50*hp,4);
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('BARRIER',0,-r-34);
    } else if (enemy._arcBarrierReviveAt) {
        const p = Math.max(0,Math.min(1,1-(enemy._arcBarrierReviveAt-gameElapsedTime)/(enemy._arcBarrierReviveDuration||5000)));
        ctx.strokeStyle = '#66dfa6'; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,0,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*p); ctx.stroke();
        ctx.save(); ctx.rotate(angle); ctx.globalAlpha = p * 0.55;
        const scale = radius/100; ctx.drawImage(_marchSprites.shield,-128*scale,-128*scale,256*scale,256*scale); ctx.restore();
    }
    if (enemy._barrierReviveFxMs > 0) {
        const p = 1-enemy._barrierReviveFxMs/400;
        ctx.globalAlpha = (1-p)*0.65; ctx.strokeStyle = '#caffec'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,0,radius+(reduced?0:p*22),0,Math.PI*2); ctx.stroke();
    }
    if (enemy._barrierHitMs > 0) {
        const p = 1-enemy._barrierHitMs/180;
        const x=enemy._barrierHitX-enemy.x,y=enemy._barrierHitY-enemy.y;
        ctx.globalAlpha = 1-p; ctx.lineWidth = 1.5;
        ctx.strokeStyle = enemy._barrierHitKind === 'pierce' ? '#ffb45e' : enemy._barrierHitKind === 'evade' ? '#a1d8ff' : '#baffde';
        ctx.beginPath(); ctx.arc(x,y,4+(reduced?0:p*17),0,Math.PI*2); ctx.stroke();
        if (!low) { ctx.beginPath(); ctx.moveTo(x-9,y-5); ctx.lineTo(x+9,y+5); ctx.moveTo(x-9,y+5); ctx.lineTo(x+9,y-5); ctx.stroke(); }
    }
    ctx.restore();
}

function _drawMarchCharge(enemy, r) {
    const windups=enemy.marchosiasWindups;
    if (!windups || !windups.length) return;
    const low = _mobPerf || _gfxLevel >= 2, reduced = _marchReduced();
    ctx.save(); ctx.translate(enemy.x,enemy.y);
    for (let i=0;i<windups.length;i++) {
        const w=windups[i]; if (!w.target) continue;
        const p=Math.max(0,Math.min(1,1-w.timer/MARCH_SWORD_WINDUP_MS));
        const angle=Math.atan2(w.target.y-enemy.y,w.target.x-enemy.x);
        ctx.save(); ctx.rotate(angle); ctx.globalAlpha=0.2+p*0.6;
        const size=36+p*48; ctx.drawImage(_marchSprites.sword,-size/2,-size/2,size,size);
        ctx.strokeStyle=p>0.84?'#fff0bc':'#53efb5';ctx.lineWidth=p>0.84?2:1;
        const rr=r*(reduced?0.6:1.3-p*0.7);
        ctx.beginPath();ctx.arc(0,0,rr,-1.1,1.1);ctx.stroke();
        if (!low && !reduced) for(let k=0;k<4;k++) {
            const a=k*Math.PI/2+p*0.7, d=rr+10;
            ctx.beginPath();ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);ctx.lineTo(Math.cos(a)*(d-8),Math.sin(a)*(d-8));ctx.stroke();
        }
        ctx.restore();
    }
    ctx.restore();
}

function _drawMarchRain() {
    const low=_mobPerf||_gfxLevel>=2, reduced=_marchReduced();
    for(let i=0;i<_marchRainZones.length;i++) {
        const z=_marchRainZones[i], fade=Math.min(1,(MARCH_RAIN_MS-z.age)/250);
        ctx.save();ctx.translate(z.x,z.y);ctx.globalAlpha=fade;
        ctx.drawImage(_marchSprites.ground,-128,-128);
        ctx.strokeStyle='#ff8749';ctx.lineWidth=1;ctx.globalAlpha=fade*0.5;
        ctx.beginPath();ctx.arc(0,0,MARCH_RAIN_RADIUS,0,Math.PI*2);ctx.stroke();
        ctx.restore();
        const next=z.beat<MARCH_RAIN_BEATS.length?MARCH_RAIN_BEATS[z.beat]:MARCH_RAIN_MS;
        const previous=z.beat?MARCH_RAIN_BEATS[z.beat-1]:0;
        if(z.beat<MARCH_RAIN_BEATS.length) {
            const progress = Math.max(0, (z.age-previous)/(next-previous));
            _drawDangerZone('circle',z.x,z.y,MARCH_RAIN_RADIUS,progress,0.6,_marchClock);
            ctx.save(); ctx.strokeStyle = '#ffb078'; ctx.globalAlpha = 0.65; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(z.x,z.y,Math.max(1,MARCH_RAIN_RADIUS*(1-progress)),0,Math.PI*2); ctx.stroke(); ctx.restore();
        }
        const count=low?3:7;
        ctx.save();ctx.translate(z.x,z.y);
        for(let j=0;j<count;j++) {
            const a=j*2.39996, d=24+(j%3)*27, x=Math.cos(a)*d,y=Math.sin(a)*d;
            let drop=0,impact=0;
            for(let k=0;k<MARCH_RAIN_BEATS.length;k++) {
                const t=z.age-MARCH_RAIN_BEATS[k];
                if(t>=-230&&t<0) drop=1+t/230;
                if(t>=0&&t<180) impact=1-t/180;
            }
            if(drop>0) {
                ctx.globalAlpha=fade*0.35;ctx.fillStyle='#100b08';ctx.beginPath();ctx.ellipse(x,y,12,4,0,0,Math.PI*2);ctx.fill();
                ctx.save();ctx.translate(x,y-(reduced?0:(1-drop)*65));ctx.rotate(Math.PI/2+0.15);
                ctx.globalAlpha=fade*(0.4+drop*0.6);ctx.drawImage(_marchSprites.sword,-29,-29,58,58);ctx.restore();
            } else if(z.beat>0) {
                ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/2+0.15);ctx.globalAlpha=fade*0.4;
                ctx.drawImage(_marchSprites.sword,-16,-16,32,32);ctx.restore();
            }
            if(impact>0&&!low&&!reduced) {
                ctx.globalAlpha=impact*fade;ctx.strokeStyle='#ffcd8d';ctx.lineWidth=1.3;
                ctx.beginPath();ctx.moveTo(x-5,y-3);ctx.lineTo(x-12,y-10);ctx.moveTo(x+5,y-3);ctx.lineTo(x+12,y-10);ctx.stroke();
            }
        }
        ctx.restore();
    }
    if(!low&&!reduced) for(let i=0;i<_marchCutFx.length;i++) {
        const f=_marchCutFx[i],p=f.age/220;
        ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.globalAlpha=1-p;ctx.strokeStyle='#ffe3ac';ctx.lineWidth=1.4;
        ctx.beginPath();ctx.moveTo(-3-p*12,-3-p*8);ctx.lineTo(3+p*9,3+p*8);ctx.moveTo(-3-p*8,3+p*10);ctx.lineTo(3+p*8,-3-p*10);ctx.stroke();ctx.restore();
    }
}

const _marchRomans = ['·', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function _drawMarchCounters(enemy, r) {
    const queue = enemy.marchosiasWindups ? enemy.marchosiasWindups.length : 0;
    const count = Math.min(MARCH_SWORD_CYCLE_MAX, enemy._barrierSwordsThisCycle || 0);
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px serif'; ctx.fillStyle = queue ? '#a0ffce' : '#427c60';
    ctx.fillText(_marchRomans[Math.min(queue, _marchRomans.length - 1)], 0, r + 19);
    if (enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
        const full = count === MARCH_SWORD_CYCLE_MAX;
        ctx.font = full ? 'bold 17px serif' : 'bold 13px serif';
        ctx.fillStyle = full ? '#ffe4a0' : '#b58a3e'; ctx.fillText(_marchRomans[count], 0, r + 36);
        if (full) {
            ctx.strokeStyle = '#ffc45b'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(-18,r+32);ctx.lineTo(-12,r+36);ctx.lineTo(-18,r+40);
            ctx.moveTo(18,r+32);ctx.lineTo(12,r+36);ctx.lineTo(18,r+40);ctx.stroke();
        }
    }
    ctx.restore();
}
