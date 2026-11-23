// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) shared render contract: configs, image loader, bake caches, math helpers, pool emitter.

const MUI_COLOR_JADE = '#3DDBB0';
const MUI_COLOR_BONE = '#EAF7F2';
const MUI_COLOR_GOLD = '#C9A24A';
const MUI_COLOR_DARK = '#0B3B3A';
const MUI_COLOR_PURPLE = '#4B2A6B';

const _MUI_WEAPON_CFG = [
    { src: 'assets/images/game/weapons/6-duong-dao.png',     length: 150, pivot: 0.14 },
    { src: 'assets/images/game/weapons/7-thuong.png',        length: 150, pivot: 0.37 },
    { src: 'assets/images/game/weapons/8-qua.png',           length: 150, pivot: 0.35 },
    { src: 'assets/images/game/weapons/9-quan-dao.png',      length: 150, pivot: 0.18 },
    { src: 'assets/images/game/weapons/10-dong-son-kiem.png', length: 150, pivot: 0.13 },
];

const _muiWeaponImgs = _MUI_WEAPON_CFG.map(cfg => {
    const img = new Image();
    img.src = cfg.src;
    if (img.decode) img.decode().catch(() => {});
    return img;
});

const _muiDrumImg = new Image();
_muiDrumImg.src = 'assets/images/game/sigils/mui-array-drum.png';
if (_muiDrumImg.decode) _muiDrumImg.decode().catch(() => {});

const _muiFrameImg = new Image();
_muiFrameImg.src = 'assets/images/game/sigils/mui-meter-frame.png';
if (_muiFrameImg.decode) _muiFrameImg.decode().catch(() => {});

const _muiGhostImg = new Image();
_muiGhostImg.src = 'assets/images/game/sigils/mui-ghost-soldier.png';
if (_muiGhostImg.decode) _muiGhostImg.decode().catch(() => {});

// Optional effect art. Every slot falls back to canvas drawing when file is missing.
const _muiFxImgs = {};
for (const name of ['goat-skull', 'blade-trail', 'hit-slash', 'blade-portal', 'root-ring', 'call-sigil', 'iron-orb']) {
    const img = new Image();
    img.src = 'assets/images/game/sigils/mui-' + name + '.png';
    if (img.decode) img.decode().catch(() => {});
    _muiFxImgs[name] = img;
}

function _muiFxImg(name) {
    const img = _muiFxImgs[name];
    return img && img.complete && img.naturalWidth > 0 ? img : null;
}

const MUI_METER_W = 110;
const MUI_METER_ASPECT = 768 / 1376;
const MUI_METER_HOLE = { x0: 0.114, x1: 0.886, y0: 0.418, y1: 0.648 };
const MUI_TAU = Math.PI * 2;

let _muiCache = null;

function _muiImgReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
}

function _muiGfxTier() {
    if (typeof _mobPerf !== 'undefined' && _mobPerf) return 2;
    return typeof window !== 'undefined' ? (window._gfxLevel || 0) : 0;
}

function _muiReducedMotion() {
    return !!(typeof window !== 'undefined' && window._fxOpts && window._fxOpts.reducedMotion);
}

function _muiClamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
}

function _muiSmooth(v) {
    v = _muiClamp(v, 0, 1);
    return v * v * (3 - 2 * v);
}

function _muiEaseOutQuad(t) {
    t = _muiClamp(t, 0, 1);
    return t * (2 - t);
}

function _muiEaseInOutQuad(t) {
    t = _muiClamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function _muiEaseOutCubic(t) {
    t = _muiClamp(t, 0, 1);
    const f = t - 1;
    return f * f * f + 1;
}

function _muiSurface(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function _muiBakeGlow(size, inner, mid, outer) {
    const c = _muiSurface(size, size);
    const g = c.getContext('2d');
    const half = size / 2;
    const grad = g.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.35, mid);
    grad.addColorStop(0.72, outer);
    grad.addColorStop(1, 'rgba(11,59,58,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
}

function _muiBakeMist() {
    const c = _muiSurface(512, 128);
    const g = c.getContext('2d');
    let seed = 9137;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 64; i++) {
        const x = rnd() * 512;
        const y = 24 + rnd() * 80;
        const rx = 28 + rnd() * 58;
        const ry = 10 + rnd() * 20;
        const grad = g.createRadialGradient(x, y, 0, x, y, rx);
        if (i % 5 === 0) {
            grad.addColorStop(0, 'rgba(75,42,107,0.16)');
            grad.addColorStop(0.55, 'rgba(11,59,58,0.08)');
        } else {
            grad.addColorStop(0, i % 3 === 0 ? 'rgba(234,247,242,0.16)' : 'rgba(61,219,176,0.18)');
            grad.addColorStop(0.55, 'rgba(61,219,176,0.06)');
        }
        grad.addColorStop(1, 'rgba(11,59,58,0)');
        g.save();
        g.translate(x, y);
        g.scale(1, ry / rx);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(0, 0, rx, 0, MUI_TAU);
        g.fill();
        g.restore();
    }
    return c;
}

function _muiBakeDrumFallback() {
    const size = 384;
    const c = _muiSurface(size, size);
    const g = c.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.46;

    // Translucent dark bronze jade disc base
    const bg = g.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
    bg.addColorStop(0, 'rgba(20,84,78,0.48)');
    bg.addColorStop(0.58, 'rgba(11,59,58,0.34)');
    bg.addColorStop(0.92, 'rgba(11,59,58,0.52)');
    bg.addColorStop(1, 'rgba(11,59,58,0)');
    g.fillStyle = bg;
    g.beginPath();
    g.arc(cx, cy, R, 0, MUI_TAU);
    g.fill();

    // Concentric engraved rings
    const rings = [0.24, 0.34, 0.56, 0.72, 0.86, 0.96];
    for (let i = 0; i < rings.length; i++) {
        g.beginPath();
        g.arc(cx, cy, R * rings[i], 0, MUI_TAU);
        g.strokeStyle = i === 5 ? 'rgba(201,162,74,0.72)' : (i % 2 === 0 ? 'rgba(61,219,176,0.75)' : 'rgba(234,247,242,0.42)');
        g.lineWidth = i === 5 ? 2.6 : 1.5;
        g.stroke();
    }

    // 14 pointed Dong Son sun star at center
    const points = 14;
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const a = (i / (points * 2)) * MUI_TAU - Math.PI / 2;
        const rad = (i % 2 === 0) ? R * 0.23 : R * 0.115;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = 'rgba(234,247,242,0.55)';
    g.fill();
    g.strokeStyle = '#3DDBB0';
    g.lineWidth = 1.6;
    g.stroke();

    // Center sun core
    g.beginPath();
    g.arc(cx, cy, R * 0.065, 0, MUI_TAU);
    g.fillStyle = '#EAF7F2';
    g.fill();

    // Geometric saw tooth band between 0.24 and 0.34
    const teeth = 28;
    g.beginPath();
    for (let i = 0; i <= teeth; i++) {
        const a = (i / teeth) * MUI_TAU;
        const rad = (i % 2 === 0) ? R * 0.33 : R * 0.255;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokeStyle = 'rgba(201,162,74,0.58)';
    g.lineWidth = 1.2;
    g.stroke();

    // Stylized Lac birds flying around middle band (0.45)
    const birds = 8;
    g.strokeStyle = 'rgba(61,219,176,0.82)';
    g.fillStyle = 'rgba(234,247,242,0.48)';
    g.lineWidth = 1.4;
    for (let i = 0; i < birds; i++) {
        const a = (i / birds) * MUI_TAU;
        g.save();
        g.translate(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45);
        g.rotate(a + Math.PI / 2);
        g.beginPath();
        g.moveTo(14, 0);
        g.quadraticCurveTo(4, -5, -10, -2);
        g.lineTo(-15, -7);
        g.lineTo(-11, 0);
        g.lineTo(-15, 7);
        g.lineTo(-10, 2);
        g.quadraticCurveTo(4, 5, 14, 0);
        g.closePath();
        g.fill();
        g.stroke();
        g.restore();
    }

    // Engraved circle dot motifs in outer band (0.64)
    const dots = 16;
    for (let i = 0; i < dots; i++) {
        const a = (i / dots) * MUI_TAU;
        const px = cx + Math.cos(a) * R * 0.64;
        const py = cy + Math.sin(a) * R * 0.64;
        g.beginPath();
        g.arc(px, py, 6.5, 0, MUI_TAU);
        g.strokeStyle = 'rgba(61,219,176,0.65)';
        g.lineWidth = 1.3;
        g.stroke();
        g.beginPath();
        g.arc(px, py, 2.2, 0, MUI_TAU);
        g.fillStyle = '#C9A24A';
        g.fill();
    }

    // Outer rim beads (0.91)
    const rimBeads = 40;
    g.fillStyle = 'rgba(234,247,242,0.58)';
    for (let i = 0; i < rimBeads; i++) {
        const a = (i / rimBeads) * MUI_TAU;
        g.beginPath();
        g.arc(cx + Math.cos(a) * R * 0.91, cy + Math.sin(a) * R * 0.91, 2.0, 0, MUI_TAU);
        g.fill();
    }
    return c;
}

function _muiBakeGoatSkull() {
    const c = _muiSurface(160, 160);
    const g = c.getContext('2d');
    g.translate(80, 88);

    // Sweeping curved horns
    for (let side = -1; side <= 1; side += 2) {
        g.save();
        g.scale(side, 1);
        g.beginPath();
        g.moveTo(12, -26);
        g.bezierCurveTo(32, -62, 66, -54, 62, -16);
        g.bezierCurveTo(60, 6, 42, 16, 36, 4);
        g.bezierCurveTo(46, -2, 48, -28, 28, -36);
        g.quadraticCurveTo(18, -36, 12, -16);
        g.closePath();
        g.fillStyle = '#0B3B3A';
        g.fill();
        g.strokeStyle = '#EAF7F2';
        g.lineWidth = 2.2;
        g.stroke();

        // Ancient bronze ridge rings along horn
        g.strokeStyle = '#C9A24A';
        g.lineWidth = 1.6;
        for (let r = 0; r < 4; r++) {
            const hx = 24 + r * 9;
            const hy = -44 + r * 4;
            g.beginPath();
            g.moveTo(hx - 2, hy - 6);
            g.lineTo(hx + 3, hy + 6);
            g.stroke();
        }
        g.restore();
    }

    // Skull cranium and elongated muzzle
    g.beginPath();
    g.moveTo(0, -34);
    g.bezierCurveTo(22, -32, 26, -12, 20, 6);
    g.bezierCurveTo(16, 20, 10, 38, 0, 44);
    g.bezierCurveTo(-10, 38, -16, 20, -20, 6);
    g.bezierCurveTo(-26, -12, -22, -32, 0, -34);
    g.closePath();
    g.fillStyle = '#EAF7F2';
    g.fill();
    g.strokeStyle = '#3DDBB0';
    g.lineWidth = 2;
    g.stroke();

    // Forehead bronze jade star mark
    g.strokeStyle = '#C9A24A';
    g.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * MUI_TAU;
        g.beginPath();
        g.moveTo(0, -17);
        g.lineTo(Math.cos(a) * 6, -17 + Math.sin(a) * 6);
        g.stroke();
    }

    // Hollow eye sockets with jade spirit fire
    for (let side = -1; side <= 1; side += 2) {
        g.beginPath();
        g.ellipse(side * 10, -2, 6, 4.2, side * 0.25, 0, MUI_TAU);
        g.fillStyle = '#0B3B3A';
        g.fill();
        g.beginPath();
        g.arc(side * 10, -2, 2.8, 0, MUI_TAU);
        g.fillStyle = '#3DDBB0';
        g.fill();
    }

    // Nasal cavity
    g.beginPath();
    g.moveTo(0, 14);
    g.lineTo(4, 26);
    g.lineTo(0, 23);
    g.lineTo(-4, 26);
    g.closePath();
    g.fillStyle = '#0B3B3A';
    g.fill();

    return c;
}

function _muiBakeBladeFallback(type) {
    const w = 256;
    const h = 64;
    const c = _muiSurface(w, h);
    const g = c.getContext('2d');
    const cy = h / 2;

    g.lineJoin = 'round';
    g.lineCap = 'round';

    const bladeGrad = g.createLinearGradient(20, cy, 248, cy);
    bladeGrad.addColorStop(0, '#0B3B3A');
    bladeGrad.addColorStop(0.65, '#135752');
    bladeGrad.addColorStop(0.88, '#3DDBB0');
    bladeGrad.addColorStop(1, 'rgba(234,247,242,0.85)');

    if (type === 0) {
        // Duong dao: slender straight single edged sword
        g.fillStyle = '#0B3B3A';
        g.fillRect(10, cy - 3.5, 42, 7);
        g.strokeStyle = '#C9A24A';
        g.lineWidth = 1.6;
        g.strokeRect(10, cy - 3.5, 42, 7);
        g.beginPath();
        g.arc(10, cy, 4.5, 0, MUI_TAU);
        g.fillStyle = '#EAF7F2';
        g.fill();
        g.beginPath();
        g.ellipse(54, cy, 4, 11, 0, 0, MUI_TAU);
        g.fillStyle = '#C9A24A';
        g.fill();
        g.beginPath();
        g.moveTo(56, cy - 5);
        g.lineTo(226, cy - 4.5);
        g.lineTo(248, cy + 1);
        g.lineTo(222, cy + 6);
        g.lineTo(56, cy + 5.5);
        g.closePath();
        g.fillStyle = bladeGrad;
        g.fill();
        g.strokeStyle = '#3DDBB0';
        g.lineWidth = 2;
        g.stroke();
        g.beginPath();
        g.moveTo(64, cy);
        g.lineTo(224, cy);
        g.strokeStyle = 'rgba(234,247,242,0.75)';
        g.lineWidth = 1.2;
        g.stroke();
    } else if (type === 1) {
        // Thuong: long spear with leaf shaped blade and jade tassel
        g.fillStyle = '#0B3B3A';
        g.fillRect(12, cy - 3, 168, 6);
        g.strokeStyle = '#3DDBB0';
        g.lineWidth = 1.4;
        g.strokeRect(12, cy - 3, 168, 6);
        g.beginPath();
        g.moveTo(176, cy);
        g.quadraticCurveTo(164, cy + 14, 152, cy + 12);
        g.quadraticCurveTo(166, cy + 5, 174, cy + 3);
        g.fillStyle = 'rgba(234,247,242,0.72)';
        g.fill();
        g.beginPath();
        g.moveTo(176, cy);
        g.quadraticCurveTo(202, cy - 11, 248, cy);
        g.quadraticCurveTo(202, cy + 11, 176, cy);
        g.closePath();
        g.fillStyle = bladeGrad;
        g.fill();
        g.strokeStyle = '#3DDBB0';
        g.lineWidth = 2;
        g.stroke();
        g.beginPath();
        g.moveTo(182, cy);
        g.lineTo(242, cy);
        g.strokeStyle = '#EAF7F2';
        g.lineWidth = 1.2;
        g.stroke();
    } else if (type === 2) {
        // Qua: Dong Son dagger axe
        g.fillStyle = '#0B3B3A';
        g.fillRect(14, cy - 3.5, 194, 7);
        g.strokeStyle = '#C9A24A';
        g.lineWidth = 1.4;
        g.strokeRect(14, cy - 3.5, 194, 7);
        g.beginPath();
        g.moveTo(192, cy - 4);
        g.lineTo(246, cy - 1);
        g.lineTo(196, cy + 7);
        g.lineTo(186, cy + 25);
        g.quadraticCurveTo(172, cy + 14, 176, cy + 4);
        g.lineTo(174, cy - 12);
        g.quadraticCurveTo(184, cy - 12, 192, cy - 4);
        g.closePath();
        g.fillStyle = bladeGrad;
        g.fill();
        g.strokeStyle = '#3DDBB0';
        g.lineWidth = 2;
        g.stroke();
    } else if (type === 3) {
        // Quan dao: broad curved glaive
        g.fillStyle = '#0B3B3A';
        g.fillRect(22, cy - 3.5, 128, 7);
        g.strokeStyle = '#C9A24A';
        g.lineWidth = 1.5;
        g.strokeRect(22, cy - 3.5, 128, 7);
        g.beginPath();
        g.moveTo(22, cy - 4);
        g.lineTo(8, cy);
        g.lineTo(22, cy + 4);
        g.closePath();
        g.fillStyle = '#C9A24A';
        g.fill();
        g.beginPath();
        g.moveTo(146, cy - 5);
        g.quadraticCurveTo(196, cy - 10, 246, cy - 14);
        g.quadraticCurveTo(234, cy + 10, 196, cy + 15);
        g.quadraticCurveTo(164, cy + 16, 146, cy + 6);
        g.closePath();
        g.fillStyle = bladeGrad;
        g.fill();
        g.strokeStyle = '#3DDBB0';
        g.lineWidth = 2;
        g.stroke();
    } else {
        // Dong Son bronze sword: leaf shaped blade with figure hilt
        g.fillStyle = '#C9A24A';
        g.fillRect(14, cy - 4, 34, 8);
        g.beginPath();
        g.arc(16, cy, 6, 0, MUI_TAU);
        g.fillStyle = '#EAF7F2';
        g.fill();
        g.beginPath();
        g.moveTo(48, cy - 12);
        g.lineTo(58, cy - 8);
        g.lineTo(58, cy + 8);
        g.lineTo(48, cy + 12);
        g.closePath();
        g.fillStyle = '#C9A24A';
        g.fill();
        g.beginPath();
        g.moveTo(58, cy - 7);
        g.quadraticCurveTo(148, cy - 13, 246, cy);
        g.quadraticCurveTo(148, cy + 13, 58, cy + 7);
        g.closePath();
        g.fillStyle = bladeGrad;
        g.fill();
        g.strokeStyle = '#3DDBB0';
        g.lineWidth = 2;
        g.stroke();
        g.beginPath();
        g.moveTo(64, cy);
        g.lineTo(238, cy);
        g.strokeStyle = '#EAF7F2';
        g.lineWidth = 1.4;
        g.stroke();
    }
    return c;
}

function _muiBakePortal() {
    const c = _muiSurface(96, 96);
    const g = c.getContext('2d');
    const cx = 48;
    const cy = 48;
    const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 44);
    grad.addColorStop(0, 'rgba(234,247,242,0.95)');
    grad.addColorStop(0.28, 'rgba(61,219,176,0.72)');
    grad.addColorStop(0.68, 'rgba(11,59,58,0.28)');
    grad.addColorStop(1, 'rgba(11,59,58,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 96, 96);

    g.strokeStyle = 'rgba(61,219,176,0.85)';
    g.lineWidth = 1.8;
    g.beginPath();
    g.ellipse(cx, cy, 34, 15, 0, 0, MUI_TAU);
    g.stroke();

    g.strokeStyle = 'rgba(234,247,242,0.75)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(cx, cy, 20, 8, 0, 0, MUI_TAU);
    g.stroke();
    return c;
}

function _muiSprites() {
    const gfx = _muiGfxTier();
    if (_muiCache && _muiCache.gfx === gfx) return _muiCache;
    const S = { gfx };
    S.jadeGlow = _muiBakeGlow(128, 'rgba(234,247,242,0.85)', 'rgba(61,219,176,0.45)', 'rgba(11,59,58,0.12)');
    S.goldGlow = _muiBakeGlow(64, 'rgba(234,247,242,0.9)', 'rgba(201,162,74,0.45)', 'rgba(11,59,58,0.08)');
    S.mist = _muiBakeMist();
    S.drum = _muiBakeDrumFallback();
    S.skull = _muiBakeGoatSkull();
    S.portal = _muiBakePortal();
    S.blades = [];
    for (let i = 0; i < 5; i++) S.blades.push(_muiBakeBladeFallback(i));
    _muiCache = S;
    return S;
}

// Pool emitter helper ensuring safe fx emission across all render modules
function _muiEmitFxHelper(kind, x, y, life, scale, angle, vx, vy) {
    if (typeof _muiEmitFx === 'function') {
        _muiEmitFx(kind, x, y, life, scale, angle, vx, vy);
        return;
    }
    if (typeof window === 'undefined' || !window._muiFx) return;
    const pool = window._muiFx;
    const max = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : pool.length;
    const idx = (window._muiFxCursor || 0) % max;
    window._muiFxCursor = (idx + 1) % max;
    const fx = pool[idx];
    if (!fx) return;
    fx.active = true;
    fx.kind = kind;
    fx.x = x;
    fx.y = y;
    fx.vx = vx || 0;
    fx.vy = vy || 0;
    fx.angle = angle || 0;
    fx.age = 0;
    fx.life = life || 300;
    fx.scale = scale || 1;
    fx.seed = (window._muiFxSeq = ((window._muiFxSeq || 0) + 1) & 1023) * 0.6180339;
}
