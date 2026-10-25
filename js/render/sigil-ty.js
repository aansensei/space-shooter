(function () {
const PAL = { VOID: '#07020F', ABYSS: '#190B30', VIOLET: '#BD8CFF', MAGENTA: '#E7A0FF', LILAC: '#FFF6E9', EMBER: '#DFFF85', GOLD: '#CDA85A' };
const _glowCache = {}, _strikeAngles = [-0.35, 0.38, -0.18, 0.22];
const _dash = [10, 8], _emptyDash = [];
const _tyFlowDash = [1.3, 15];
const _tyVortexImage = new Image();
const _tyVortexStamp = document.createElement('canvas');
_tyVortexStamp.width = _tyVortexStamp.height = 384;
let _tyVortexReady = false;
_tyVortexImage.onload = function () {
    if (_tyVortexReady || !_tyVortexImage.complete || !_tyVortexImage.naturalWidth) return;
    const g = _tyVortexStamp.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(_tyVortexImage, 0, 0, 384, 384);
    _tyVortexReady = true;
};
_tyVortexImage.src = 'assets/images/game/sigils/ty-vortex-abyss.png';
const _tyVortexSpirals = new Path2D();
// Positive dash phases carry the flow toward the core.
for (let arm = 0; arm < 3; arm++) {
    for (let step = 48; step >= 0; step--) {
        const t = step / 48, r = 170 * 0.9 * Math.exp(-Math.log(1.61803398875) * t * 5);
        const a = arm * Math.PI * 2 / 3 + t * Math.PI * 2.5;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (step === 48) _tyVortexSpirals.moveTo(x, y);
        else _tyVortexSpirals.lineTo(x, y);
    }
}

function _tyVortexLoaded() {
    return _tyVortexReady && _tyVortexImage.complete && _tyVortexImage.naturalWidth > 0;
}

function _drawTyVortexBase(ctx, elapsed, tier, radius, masterAlpha) {
    if (tier >= 3 || !_tyVortexLoaded() || (window._fxOpts && window._fxOpts.sigilBackdrop === false)) return;
    let scale, rotation, fade = 1;
    if (elapsed < 180) {
        scale = 0.6 + 0.4 * elapsed / 180;
        rotation = -elapsed * 0.00055;
    } else if (elapsed < 1430) {
        const p = (elapsed - 180) / 1250;
        scale = 1 - p * 0.1;
        rotation = -(0.099 + 1250 * (0.0008 * p + 0.0014 * p * p));
    } else {
        const p = Math.min(1, (elapsed - 1430) / 480);
        scale = 0.9 + 0.35 * (1 - (1 - p) * (1 - p));
        rotation = -(2.849 + (elapsed - 1430) * 0.0036);
        fade = 1 - p;
    }
    const size = radius * 2.1 * scale;
    ctx.save(); ctx.rotate(rotation);
    ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.95 * fade;
    ctx.drawImage(_tyVortexStamp, -size / 2, -size / 2, size, size);
    if (tier === 0) {
        ctx.rotate(-2 * rotation);
        ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.13 * fade;
        ctx.drawImage(_tyVortexStamp, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    }
    ctx.restore();
}

function _drawTyVortexPull(ctx, elapsed, tier, radius, core, masterAlpha) {
    if (elapsed < 180 || elapsed >= 1490) return;
    ctx.save();
    if (elapsed < 1430 && tier <= 1 && (!window._fxOpts || window._fxOpts.particles !== false)) {
        ctx.save(); ctx.rotate(-(elapsed - 180) * 0.0012); ctx.scale(radius / 170, radius / 170);
        ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.5;
        ctx.strokeStyle = PAL.VIOLET; ctx.lineWidth = 1.4 * 170 / radius;
        ctx.setLineDash(_tyFlowDash); ctx.lineDashOffset = (elapsed - 180) * 0.09;
        ctx.stroke(_tyVortexSpirals);
        ctx.setLineDash(_emptyDash); ctx.lineDashOffset = 0;
        ctx.restore();
    }
    for (let tick = 0; tick < 4; tick++) {
        const age = elapsed - (430 + tick * 250);
        if (age >= 0 && age < 240) {
            const p = age / 240, r = radius * 0.95 + (core - radius * 0.95) * p;
            ctx.globalAlpha = _tyBrightness() * masterAlpha * (1 - p) * 0.9;
            ctx.strokeStyle = PAL.MAGENTA; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        } else if (age >= 240 && age < 310 && tier <= 1 && (!window._fxOpts || window._fxOpts.glow !== false)) {
            const flash = Math.sin((age - 240) / 70 * Math.PI);
            ctx.globalAlpha = _tyBrightness() * masterAlpha * flash * 0.6;
            ctx.strokeStyle = PAL.LILAC; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, core, 0, Math.PI * 2); ctx.stroke();
        }
    }
    ctx.restore();
}

function _drawTyVortexBurst(ctx, elapsed, tier, radius, masterAlpha) {
    const age = elapsed - 1430;
    if (tier >= 3 || age < 0 || age >= 260) return;
    ctx.save();
    if (age < 200 && _tyVortexLoaded() && (!window._fxOpts || (window._fxOpts.glow !== false && window._fxOpts.sigilBackdrop !== false))) {
        const p = Math.min(1, age / 480), size = radius * 2.1 * (0.9 + 0.35 * (1 - (1 - p) * (1 - p)));
        ctx.save(); ctx.rotate(-(2.849 + age * 0.0036));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.6 * (1 - age / 200);
        ctx.drawImage(_tyVortexStamp, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
    const p = age / 260, ease = 1 - Math.pow(1 - p, 3);
    const head = radius * (0.08 + 0.62 * ease), tail = Math.max(0, head - radius * 0.28 * (1 - p));
    const width = 2.8 * (1 - p);
    ctx.globalAlpha = _tyBrightness() * masterAlpha * (1 - p);
    ctx.fillStyle = PAL.LILAC; ctx.strokeStyle = PAL.MAGENTA; ctx.lineWidth = 1.25;
    for (let ray = 0; ray < 8; ray++) {
        const a = ray * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
        ctx.beginPath(); ctx.moveTo(c * head, s * head);
        ctx.lineTo(c * tail - s * width, s * tail + c * width);
        ctx.lineTo(c * (tail + head) * 0.5, s * (tail + head) * 0.5);
        ctx.lineTo(c * tail + s * width, s * tail - c * width);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
}
const MAX_VORTEX_PARTICLES = 28;
const vortexParticles = Array.from({ length: MAX_VORTEX_PARTICLES }, (_, i) => ({ angle: i / 28 * Math.PI * 2, distRatio: i % 7 / 7, speed: 0.65 + i % 4 * 0.18, size: 2 + i % 3 * 1.1 }));
let viewW = 1280, viewH = 800, tyClock = 0;
const _fxContext = ctx;
function _tyMakeStamp(size) {
    const c = document.createElement('canvas'); c.width = c.height = size; return c;
}

// Ornament is baked once; moving effects reuse the same brush marks.
function _tyLeaf(g, x, y, length, angle) {
    g.save(); g.translate(x, y); g.rotate(angle); g.beginPath();
    g.moveTo(0, 0); g.bezierCurveTo(length * 0.05, -length * 0.4, length * 0.68, -length * 0.54, length, 0);
    g.bezierCurveTo(length * 0.55, length * 0.05, length * 0.35, length * 0.38, 0, 0); g.fill();
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(length * 0.45, -length * 0.1, length * 0.88, -length * 0.02); g.stroke(); g.restore();
}
function _tyRosette(g, radius, petals) {
    g.beginPath();
    for (let i = 0; i <= petals * 12; i++) {
        const a = i * Math.PI * 2 / (petals * 12), r = radius * (0.79 + 0.18 * Math.cos(a * petals));
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.stroke();
}
function _tyCraquelure(g, radius, count) {
    g.beginPath();
    for (let i = 0; i < count; i++) {
        const a = i * 2.399963, r = radius * (0.24 + (i % 7) * 0.09), x = Math.cos(a) * r, y = Math.sin(a) * r;
        const b = a + 0.5, nx = Math.cos(b) * (r + radius * 0.15), ny = Math.sin(b) * (r + radius * 0.15);
        g.moveTo(x, y); g.lineTo(x * 0.5 + nx * 0.5 - 2, y * 0.5 + ny * 0.5 + 2); g.lineTo(nx, ny);
        g.lineTo(Math.cos(b + 0.45) * (r + radius * 0.07), Math.sin(b + 0.45) * (r + radius * 0.07));
    }
    g.stroke();
}

function _tyBakePolish() {
    const constellation = _tyMakeStamp(384), scorch = _tyMakeStamp(384), plume = _tyMakeStamp(128);
    let g = constellation.getContext('2d'); g.translate(192, 192);
    g.fillStyle = PAL.VOID + '45'; g.strokeStyle = PAL.ABYSS; g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 182, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 0.9; g.strokeStyle = PAL.VIOLET; g.beginPath();
    g.arc(0, 0, 182, 0, Math.PI * 2); g.rect(-128.69, -128.69, 257.38, 257.38);
    g.moveTo(0, -181); g.lineTo(181, 0); g.lineTo(0, 181); g.lineTo(-181, 0); g.closePath();
    g.moveTo(153, 0); g.arc(0, 0, 153, 0, Math.PI * 2); g.moveTo(127, 0); g.arc(0, 0, 127, 0, Math.PI * 2); g.stroke();
    g.fillStyle = PAL.ABYSS + '35'; g.strokeStyle = PAL.MAGENTA + '90'; g.lineWidth = 0.7; _tyRosette(g, 119, 8);
    g.fillStyle = PAL.ABYSS; g.strokeStyle = PAL.GOLD; g.lineWidth = 0.65;
    for (let i = 0; i < 28; i++) {
        const ang = i * Math.PI / 14, x = Math.cos(ang) * 170, y = Math.sin(ang) * 170;
        _tyLeaf(g, x, y, 11, ang + 1.8);
    }
    g.strokeStyle = PAL.LILAC + '95'; g.lineWidth = 0.75; g.beginPath();
    g.arc(-0.7, -0.7, 182, Math.PI, Math.PI * 1.55); g.stroke();
    g.fillStyle = PAL.LILAC; g.globalAlpha = 0.7; g.beginPath();
    for (let i = 0; i < 28; i++) { const ang = -Math.PI / 2 + i * Math.PI / 14, x = Math.cos(ang) * 178, y = Math.sin(ang) * 178, r = i % 7 === 0 ? 2.1 : 1; g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }
    g.fill(); g.fillStyle = PAL.EMBER; g.globalAlpha = 0.7; g.fillRect(-0.6, -179, 1.2, 1.2);
    const inner = _tyMakeStamp(256), wave = _tyMakeStamp(256);
    g = inner.getContext('2d'); g.translate(128, 128); g.strokeStyle = PAL.VIOLET; g.lineWidth = 0.8; g.fillStyle = PAL.VOID + '55';
    _tyRosette(g, 112, 8); g.strokeStyle = PAL.LILAC + '90'; g.fillStyle = PAL.ABYSS;
    for (let i = 0; i < 12; i++) {
        const ang = i * Math.PI / 6; g.save(); g.rotate(ang); g.translate(103, 0);
        g.beginPath(); g.moveTo(-5, -5); g.quadraticCurveTo(-9, 0, -5, 5); g.quadraticCurveTo(0, 3, 5, 5); g.quadraticCurveTo(9, 0, 5, -5); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = PAL.GOLD; g.beginPath(); g.moveTo(-3, 0); g.bezierCurveTo(-2, -5, 3, 5, 3, 0); g.stroke(); g.restore();
    }
    g = wave.getContext('2d'); g.translate(128, 128);
    const waveWash = g.createRadialGradient(0, 0, 97, 0, 0, 118); waveWash.addColorStop(0, PAL.VOID + '00'); waveWash.addColorStop(0.5, PAL.ABYSS + '60'); waveWash.addColorStop(1, PAL.VOID + '00');
    g.fillStyle = waveWash; g.fillRect(-128, -128, 256, 256); g.fillStyle = PAL.ABYSS; g.strokeStyle = PAL.VIOLET; g.lineWidth = 1.4;
    for (let i = 0; i < 24; i++) { const ang = i * Math.PI / 12; _tyLeaf(g, Math.cos(ang) * 109, Math.sin(ang) * 109, 11, ang + 1.8); }
    g.beginPath(); g.arc(0, 0, 115, 0, Math.PI * 2); g.stroke(); g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.65; g.beginPath(); g.arc(-0.7, -0.7, 115, Math.PI, Math.PI * 1.6); g.stroke();
    g = scorch.getContext('2d'); g.translate(192, 192);
    const wash = g.createRadialGradient(-20, -20, 8, 0, 0, 175);
    wash.addColorStop(0, PAL.VOID + 'D0'); wash.addColorStop(0.6, PAL.ABYSS + 'A0'); wash.addColorStop(1, PAL.VOID + '00');
    g.fillStyle = wash; g.fillRect(-192, -192, 384, 384);
    g.strokeStyle = PAL.ABYSS; g.lineWidth = 1.7; _tyCraquelure(g, 145, 52);
    g.strokeStyle = PAL.VIOLET; g.globalAlpha = 0.24; g.lineWidth = 0.65; _tyCraquelure(g, 133, 31);
    g = plume.getContext('2d');
    const flame = g.createLinearGradient(20, 12, 107, 112); flame.addColorStop(0, PAL.VIOLET + '00'); flame.addColorStop(0.22, PAL.VIOLET + '65'); flame.addColorStop(0.34, PAL.VIOLET + 'C0'); flame.addColorStop(0.8, PAL.ABYSS + 'B0'); flame.addColorStop(1, PAL.VOID + '00');
    g.fillStyle = flame;
    for (let layer = 0; layer < 7; layer++) {
        g.globalAlpha = 0.22 + layer * 0.07; g.beginPath();
        for (let i = 0; i < 5; i++) { const x = 33 + i * 15, tip = 6 + i % 3 * 12 + layer * 1.4;
            g.moveTo(x - 17 + layer, 125); g.bezierCurveTo(x - 35, 85, x + 24, 53, x - 5, tip);
            g.bezierCurveTo(x + 16, 54, x - 4, 91, x + 16 - layer, 125); g.closePath(); }
        g.fill();
    }
    g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.7; g.lineWidth = 1.2; g.beginPath();
    g.moveTo(28, 110); g.bezierCurveTo(14, 74, 55, 59, 34, 24); g.moveTo(57, 113); g.bezierCurveTo(43, 83, 77, 66, 63, 42); g.stroke();
    const impacts = [], impactBursts = [];
    for (let paint = 0; paint < 8; paint++) {
        const kind = paint % 4, domain = paint >= 4;
        const c = _tyMakeStamp(128); g = c.getContext('2d'); g.translate(64, 64);
        const wax = g.createRadialGradient(0, 0, 1, 0, 0, 38);
        wax.addColorStop(0, PAL.LILAC); wax.addColorStop(domain ? 0.58 : 0.12, domain ? PAL.LILAC : PAL.MAGENTA); wax.addColorStop(domain ? 0.72 : 0.42, domain ? PAL.MAGENTA : PAL.VIOLET); wax.addColorStop(0.9, '#694094'); wax.addColorStop(1, PAL.ABYSS);
        g.fillStyle = wax; g.strokeStyle = PAL.MAGENTA; g.lineWidth = 2.2;
        _tyRosette(g, kind === 1 ? 38 : 32, kind === 2 ? 10 : 6);
        g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.9; g.lineWidth = 1.5; g.beginPath();
        g.arc(0, 0, 27, Math.PI * 1.02, Math.PI * 1.63); g.stroke();
        g.fillStyle = PAL.VIOLET; g.strokeStyle = PAL.MAGENTA; g.globalAlpha = 0.8; g.lineWidth = 0.9;
        if (kind === 0) {
            for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; _tyLeaf(g, Math.cos(a) * 10, Math.sin(a) * 10, 19, a); }
        } else if (kind === 1) {
            for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 3; i++) _tyLeaf(g, side * (4 + i * 8), 18 - i * 9, 16, -Math.PI / 2 - side * 0.65);
        } else if (kind === 2) {
            for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; _tyLeaf(g, Math.cos(a) * 29, Math.sin(a) * 29, 12, a - 1.8); }
        } else {
            g.beginPath(); g.moveTo(-31, -18); g.bezierCurveTo(-18, 14, 13, -15, 31, 18);
            g.moveTo(-31, 18); g.bezierCurveTo(-13, -15, 18, 14, 31, -18); g.stroke();
        }
        g.globalAlpha = 0.95; g.fillStyle = PAL.LILAC; g.beginPath();
        g.ellipse(-7, -2, 1.8, 3.4, -0.3, 0, Math.PI * 2); g.ellipse(7, -2, 1.8, 3.4, 0.3, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.85; g.strokeStyle = PAL.LILAC; g.lineWidth = 1.1; _tyCraquelure(g, 30, 8); impacts.push(c);
        if (domain) continue;
        const burst = _tyMakeStamp(192); g = burst.getContext('2d'); g.translate(96, 96);
        const plasma = g.createRadialGradient(0, 0, 12, 0, 0, 88);
        plasma.addColorStop(0, PAL.ABYSS + '00'); plasma.addColorStop(0.32, '#694094D0'); plasma.addColorStop(0.67, PAL.VIOLET + 'B0'); plasma.addColorStop(1, PAL.ABYSS + '00');
        g.fillStyle = plasma; g.strokeStyle = PAL.VIOLET; g.lineWidth = 1.2; g.beginPath();
        for (let ray = 0; ray < 16; ray++) {
            const a = ray * Math.PI / 8 + kind * 0.31, radius = 48 + (ray * 17 + kind * 11) % 37;
            const c = Math.cos(a), sn = Math.sin(a), width = ray % 3 === 0 ? 6 : 3;
            g.moveTo(c * 24 - sn * width, sn * 24 + c * width); g.lineTo(c * radius, sn * radius);
            g.lineTo(c * 36 + sn * width, sn * 36 - c * width); g.lineTo(c * 42, sn * 42); g.closePath();
        }
        g.fill(); g.stroke(); g.strokeStyle = PAL.MAGENTA; g.lineWidth = 2.4; g.beginPath();
        for (let arc = 0; arc < 7; arc++) {
            const a = arc * Math.PI * 2 / 7 + kind * 0.2;
            g.arc(0, 0, 47 + arc % 3 * 3, a, a + 0.56); g.moveTo(Math.cos(a + 0.7) * 49, Math.sin(a + 0.7) * 49);
        }
        g.stroke(); g.strokeStyle = PAL.LILAC; g.lineWidth = 1.1; g.globalAlpha = 0.8; g.beginPath();
        for (let ray = 0; ray < 8; ray++) {
            const a = ray * Math.PI / 4 + kind * 0.31, c = Math.cos(a), sn = Math.sin(a), r = 52 + ray % 3 * 9;
            g.moveTo(c * (r - 9) - sn * 2, sn * (r - 9) + c * 2); g.lineTo(c * r, sn * r); g.lineTo(c * (r - 4) + sn * 2, sn * (r - 4) - c * 2);
        }
        g.stroke(); impactBursts.push(burst);
    }
    const eye = _tyMakeStamp(128), iris = _tyMakeStamp(64);
    g = eye.getContext('2d'); g.translate(64, 64); g.scale(1, 0.58);
    const oil = g.createRadialGradient(-3, -3, 4, 0, 0, 56);
    oil.addColorStop(0, PAL.VOID + 'F0'); oil.addColorStop(0.46, PAL.VOID + 'C0'); oil.addColorStop(0.75, PAL.ABYSS + '60'); oil.addColorStop(1, PAL.VOID + '00');
    g.fillStyle = oil; g.fillRect(-64, -64, 128, 128);
    g = iris.getContext('2d'); g.translate(32, 32);
    const gem = g.createRadialGradient(-5, -6, 0, 0, 0, 23); gem.addColorStop(0, PAL.ABYSS); gem.addColorStop(0.35, PAL.VIOLET + 'A0'); gem.addColorStop(0.65, PAL.ABYSS + 'C0'); gem.addColorStop(1, PAL.VIOLET + '00');
    g.fillStyle = gem; g.beginPath(); g.arc(0, 0, 23, 0, Math.PI * 2); g.fill();
    g.strokeStyle = PAL.LILAC; g.lineWidth = 0.75; g.globalAlpha = 0.55; g.beginPath(); g.arc(-0.5, -0.5, 18, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    g.strokeStyle = PAL.VIOLET; g.globalAlpha = 0.46; g.lineWidth = 0.65; g.beginPath();
    for (let i = 0; i < 11; i++) {
        const a = i * Math.PI * 2 / 11, r = 16 + i % 3;
        g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        g.bezierCurveTo(Math.cos(a + 0.5) * 20, Math.sin(a + 0.5) * 20, Math.cos(a + 1.1) * 7, Math.sin(a + 1.1) * 7, Math.cos(a + 1.9) * 4, Math.sin(a + 1.9) * 4);
    }
    g.stroke(); g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.18; g.lineWidth = 0.45; g.beginPath();
    for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); g.lineTo(Math.cos(a + 0.14) * 19, Math.sin(a + 0.14) * 19);
    }
    g.stroke();
    g.fillStyle = PAL.VOID; g.globalAlpha = 1; g.beginPath(); g.moveTo(0, -21);
    g.lineTo(4, -10); g.lineTo(2, -5); g.lineTo(7, 1); g.lineTo(3, 8); g.lineTo(1, 20);
    g.lineTo(-3, 9); g.lineTo(-1, 4); g.lineTo(-5, -2); g.lineTo(-2, -10); g.closePath(); g.fill();
    g.fillStyle = PAL.LILAC; g.beginPath(); g.ellipse(-7, -9, 0.75, 0.5, -0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = PAL.EMBER; g.fillRect(5, 7, 0.9, 0.9);
    return { constellation, scorch, plume, impacts, impactBursts, inner, wave, eye, iris };

}
const _tyPolish = _tyBakePolish();
function _tyBakeDevourPolish() {
    const fang = _tyMakeStamp(128), comet = _tyMakeStamp(192), crown = _tyMakeStamp(192);
    let g = fang.getContext('2d'); const ivory = g.createLinearGradient(10, 8, 105, 105);
    ivory.addColorStop(0, PAL.LILAC); ivory.addColorStop(0.18, PAL.VIOLET); ivory.addColorStop(0.72, '#7352A2'); ivory.addColorStop(1, PAL.LILAC);
    g.fillStyle = ivory; g.strokeStyle = PAL.VIOLET; g.lineWidth = 2;
    g.beginPath(); g.moveTo(18, 6); g.bezierCurveTo(3, 53, 40, 89, 110, 99); g.bezierCurveTo(65, 78, 43, 48, 56, 13); g.quadraticCurveTo(34, 25, 18, 6); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.95; g.lineWidth = 1.4; g.beginPath(); g.moveTo(22, 12); g.bezierCurveTo(10, 53, 43, 84, 105, 97); g.stroke();
    g.fillStyle = PAL.ABYSS; g.strokeStyle = PAL.GOLD; g.globalAlpha = 0.55; g.lineWidth = 0.7;
    _tyLeaf(g, 26, 30, 17, 0.8); _tyLeaf(g, 33, 52, 15, 0.55); _tyLeaf(g, 50, 70, 13, 0.2);
    g = comet.getContext('2d');
    const tail = g.createLinearGradient(0, 96, 192, 96); tail.addColorStop(0, PAL.VOID + '00'); tail.addColorStop(0.3, PAL.VIOLET + '40'); tail.addColorStop(0.8, PAL.VIOLET + 'C0'); tail.addColorStop(1, PAL.LILAC + 'D0'); g.fillStyle = tail;
    for (let layer = 0; layer < 6; layer++) {
        g.globalAlpha = 0.18 + layer * 0.07; g.beginPath(); const w = 24 - layer * 3;
        g.moveTo(188, 96); g.bezierCurveTo(130, 96 - w, 62, 96 + w, 3, 96 - w * 0.3); g.bezierCurveTo(67, 96 + w * 0.3, 132, 96 + w, 188, 96); g.fill();
    }
    g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.65; g.lineWidth = 1.1; g.beginPath(); g.moveTo(52, 93); g.bezierCurveTo(97, 95, 146, 83, 188, 96); g.stroke();
    g = crown.getContext('2d'); g.translate(96, 96); g.fillStyle = PAL.ABYSS; g.strokeStyle = PAL.GOLD; g.lineWidth = 0.7;
    for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10; _tyLeaf(g, Math.cos(a) * 80, Math.sin(a) * 80, 11, a + 1.9); }
    g.strokeStyle = PAL.VIOLET; g.globalAlpha = 0.55; g.beginPath(); g.arc(0, 0, 81, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.65; g.beginPath(); g.arc(-0.6, -0.6, 81, Math.PI, Math.PI * 1.6); g.stroke();
    g.fillStyle = PAL.VOID; g.strokeStyle = PAL.GOLD; g.globalAlpha = 0.75; g.beginPath(); g.moveTo(-11, -81); g.quadraticCurveTo(-13, -91, 0, -94); g.quadraticCurveTo(13, -91, 11, -81); g.quadraticCurveTo(0, -85, -11, -81); g.fill(); g.stroke();
    g.fillStyle = PAL.LILAC; g.beginPath(); g.ellipse(-1, -89, 1.2, 1.8, 0, 0, Math.PI * 2); g.fill(); return { fang, comet, crown };
}
const _tyDevourPolish = _tyBakeDevourPolish();
const _tyMaturity = { ready: false, at: 0 };
function _drawTyMaturity(g, now, tier, radius, ready) {
    if (!ready) { _tyMaturity.ready = false; return; }
    if (!_tyMaturity.ready || now < _tyMaturity.at) { _tyMaturity.ready = true; _tyMaturity.at = now; }
    if (tier >= 3 || (window._fxOpts && window._fxOpts.glow === false)) return;
    const age = now - _tyMaturity.at, settle = Math.min(1, age / 420), size = (radius + 10) * 2;
    g.save(); g.rotate(-now * 0.00025);
    g.globalAlpha = _tyBrightness() * (0.3 + 0.05 * Math.sin(now * 0.0035) + (1 - settle) * 0.15);
    g.drawImage(_tyDevourPolish.crown, -size / 2, -size / 2, size, size);
    if (tier === 0 && settle < 1 && (!window._fxOpts || window._fxOpts.particles !== false)) {
        g.globalAlpha = _tyBrightness() * (1 - settle) * 0.65; g.fillStyle = PAL.LILAC; g.beginPath();
        for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7, r = radius + 5 + Math.sin(settle * Math.PI) * 8; const x = Math.cos(a) * r, y = Math.sin(a) * r; g.moveTo(x, y - 1.5); g.lineTo(x + 0.7, y); g.lineTo(x, y + 1.5); g.lineTo(x - 0.7, y); }
        g.fill();
    }
    g.restore();
}
function _drawTyDevourFangs(g, age, tier) {
    if (tier >= 3 || age < 0 || age >= 480 || (window._fxOpts && window._fxOpts.trails === false)) return;
    const p = age % 120 / 120, snap = Math.sin(p * Math.PI), gap = (1 - snap) * 18;
    const small = viewW < 600 || viewH < 500, width = small ? 60 : 72, height = small ? 98 : 118;
    g.save(); g.globalAlpha = _tyBrightness() * (0.38 + snap * 0.5);
    g.drawImage(_tyDevourPolish.fang, -width - gap, -height * 0.77, width, height);
    g.scale(-1, 1); g.globalAlpha *= 0.62; g.drawImage(_tyDevourPolish.fang, -width - gap, -height * 0.77, width, height); g.restore();
    if (tier === 0 && (!window._fxOpts || window._fxOpts.glow !== false)) {
        g.save(); g.globalAlpha = _tyBrightness() * snap * (1 - p) * 0.45;
        g.strokeStyle = PAL.VIOLET; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, 16 + p * 43, Math.PI * 0.15, Math.PI * 1.85); g.stroke(); g.restore();
    }
}
function _drawTyCometTail(g, age, tier, lifeRatio) {
    if (tier >= 3 || (window._fxOpts && window._fxOpts.trails === false)) return;
    const width = 87 + Math.sin(age * 0.012) * 5;
    g.save(); g.globalAlpha = _tyBrightness() * lifeRatio * 0.8;
    g.drawImage(_tyDevourPolish.comet, -width - 7, -17, width, 34);
    if (tier === 0 && (!window._fxOpts || window._fxOpts.particles !== false)) {
        g.fillStyle = PAL.LILAC; g.globalAlpha = _tyBrightness() * lifeRatio * 0.6; g.beginPath();
        for (let i = 0; i < 4; i++) { const p = (age * 0.0016 + i * 0.25) % 1, x = -12 - p * 72, y = Math.sin(i * 2.4 + age * 0.01) * p * 7; const r = (1 - p) * 1.2; g.moveTo(x - r, y); g.lineTo(x, y - r * 1.8); g.lineTo(x + r, y); g.lineTo(x, y + r); }
        g.fill();
    }
    g.restore();
}

function _tyBakeSnakePolish() {
    const fill = _tyMakeStamp(64), scales = [], heads = [], fissure = _tyMakeStamp(128);
    let g = fill.getContext('2d'); g.translate(32, 32);
    const stone = g.createLinearGradient(-18, -18, 18, 18); stone.addColorStop(0, PAL.VIOLET); stone.addColorStop(0.35, '#7352A2'); stone.addColorStop(1, PAL.ABYSS);
    g.fillStyle = stone; g.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; if (i === 0) g.moveTo(Math.cos(a) * 22, Math.sin(a) * 18.04); else g.lineTo(Math.cos(a) * 22, Math.sin(a) * 18.04); }
    g.closePath(); g.fill(); g.strokeStyle = PAL.VIOLET; g.lineWidth = 2.2; g.stroke();
    for (let k = 0; k < 3; k++) {
        const c = _tyMakeStamp(64); g = c.getContext('2d'); g.translate(32, 32);
        g.strokeStyle = k === 0 ? PAL.VIOLET : k === 1 ? PAL.MAGENTA : PAL.LILAC; g.globalAlpha = 0.8; g.lineWidth = 1.4; g.beginPath();
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; if (i === 0) g.moveTo(Math.cos(a) * 22, Math.sin(a) * 18.04); else g.lineTo(Math.cos(a) * 22, Math.sin(a) * 18.04); }
        g.closePath(); g.stroke(); g.strokeStyle = PAL.GOLD; g.globalAlpha = 0.65; g.fillStyle = PAL.ABYSS; g.lineWidth = 0.6;
        _tyLeaf(g, -12, 3, 15, -0.9); _tyLeaf(g, 12, 3, 15, -2.2);
        g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(-22, 0); g.lineTo(-11, -15.6); g.lineTo(11, -15.6); g.stroke();
        g.strokeStyle = PAL.VOID; g.globalAlpha = 0.45; _tyCraquelure(g, 16, 6); scales.push(c);
    }
    g = fissure.getContext('2d'); g.translate(64, 64);
    const veil = g.createRadialGradient(0, 0, 4, 0, 0, 60); veil.addColorStop(0, PAL.VOID + 'E0'); veil.addColorStop(0.55, PAL.ABYSS + 'A0'); veil.addColorStop(1, PAL.VOID + '00');
    g.fillStyle = veil; g.fillRect(-64, -64, 128, 128);
    g.scale(1, 0.32); g.fillStyle = PAL.VOID; g.strokeStyle = PAL.VIOLET; g.lineWidth = 1.8; _tyRosette(g, 51, 8);
    g.fillStyle = PAL.ABYSS; g.strokeStyle = PAL.GOLD; g.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; _tyLeaf(g, Math.cos(a) * 48, Math.sin(a) * 48, 10, a + 1.8); }
    g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(-1, -1, 44, 40, 0, Math.PI, Math.PI * 1.6); g.stroke();
    const pearl = _tyMakeStamp(16), wisp = _tyMakeStamp(32);
    g = pearl.getContext('2d'); const gem = g.createRadialGradient(6, 5, 0, 8, 8, 6);
    gem.addColorStop(0, PAL.LILAC); gem.addColorStop(0.23, PAL.VIOLET); gem.addColorStop(0.62, PAL.ABYSS); gem.addColorStop(1, PAL.VOID + '00');
    g.fillStyle = gem; g.fillRect(0, 0, 16, 16);
    g = wisp.getContext('2d'); const smoke = g.createRadialGradient(11, 10, 0, 16, 16, 16);
    smoke.addColorStop(0, PAL.LILAC + 'C0'); smoke.addColorStop(0.3, PAL.VIOLET + '90'); smoke.addColorStop(0.65, PAL.VIOLET + '35'); smoke.addColorStop(1, PAL.VOID + '00');
    g.fillStyle = smoke; g.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 48; k++) {
        const c = _tyMakeStamp(64), angle = k * Math.PI / 8, lx = -Math.cos(angle) - Math.sin(angle), ly = Math.sin(angle) - Math.cos(angle);
        g = c.getContext('2d'); g.translate(32, 32);
        const shade = g.createLinearGradient(lx * 14, ly * 14, -lx * 14, -ly * 14);
        shade.addColorStop(0, k < 16 || k >= 32 ? PAL.LILAC : PAL.ABYSS); shade.addColorStop(0.38, k >= 32 ? PAL.LILAC : k < 16 ? PAL.VIOLET : PAL.VOID); shade.addColorStop(1, k >= 32 ? PAL.VIOLET : k < 16 ? '#7352A2' : PAL.VOID);
        g.fillStyle = shade; g.strokeStyle = PAL.LILAC; g.lineWidth = 2.3;
        g.beginPath(); g.moveTo(16, -3); g.quadraticCurveTo(21, 0, 16, 3);
        g.quadraticCurveTo(7, 10, -5, 12); g.quadraticCurveTo(-14, 10, -12, 0);
        g.quadraticCurveTo(-14, -10, -5, -12); g.quadraticCurveTo(7, -10, 16, -3); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(-9, -11); g.quadraticCurveTo(7, -10, 16, -3);
        g.quadraticCurveTo(21, 0, 16, 3); g.quadraticCurveTo(7, 10, -9, 11); g.stroke();
        g.strokeStyle = PAL.GOLD; g.lineWidth = 1.2; g.beginPath();
        g.moveTo(-9, -6); g.quadraticCurveTo(-2, -9, 3, -6); g.moveTo(-9, 6); g.quadraticCurveTo(-2, 9, 3, 6); g.stroke();
        g.strokeStyle = PAL.ABYSS; g.lineWidth = 1.4; g.beginPath();
        g.moveTo(6, -4); g.quadraticCurveTo(11, 0, 18, 0); g.quadraticCurveTo(11, 0, 6, 4); g.stroke();
        g.fillStyle = PAL.ABYSS; g.beginPath(); g.ellipse(1, -5.8, 3.3, 2.7, -0.3, 0, Math.PI * 2);
        g.ellipse(1, 5.8, 3.3, 2.7, 0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = PAL.EMBER; g.beginPath(); g.ellipse(1, -5.8, 2.5, 1.9, -0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = PAL.LILAC; g.beginPath(); g.ellipse(1, 5.8, 2.5, 1.9, 0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = PAL.VOID; g.fillRect(0.5, -7.3, 0.9, 3); g.fillRect(0.5, 4.3, 0.9, 3);
        g.strokeStyle = PAL.LILAC; g.lineWidth = 1.8; g.beginPath();
        g.moveTo(9, -3); g.lineTo(13, -1); g.moveTo(9, 3); g.lineTo(13, 1); g.stroke(); heads.push(c);
    }
    return { fill, scales, heads, fissure, pearl, wisp };
}
const _tySnakePolish = _tyBakeSnakePolish();
const _tyShieldCrack = new Path2D();
// Interlocking paint cells spread outward from the impact origin.
for (let ring = 0; ring < 4; ring++) for (let cell = 0; cell < 8; cell++) {
    const a = Math.PI + (cell - 3.5) * 0.3, r = 6 + ring * 11, x = Math.cos(a) * r, y = Math.sin(a) * r;
    _tyShieldCrack.moveTo(x, y); _tyShieldCrack.lineTo(x - 6, y + 2 + ring % 2 * 3);
    _tyShieldCrack.lineTo(x - 10, y - 4); _tyShieldCrack.lineTo(x - 4, y - 9); _tyShieldCrack.lineTo(x, y);
}
const _tyWake = Array.from({ length: 60 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, at: 0 }));
const _tyWakeTicks = new Float64Array(10).fill(-1);
let _tyWakeClock = -1;
function _drawTyWake(g, now, tier) {
    if (now < _tyWakeClock) { for (let i = 0; i < 60; i++) _tyWake[i].active = false; _tyWakeTicks.fill(-1); }
    _tyWakeClock = now;
    if (tier !== 0 || (window._fxOpts && (window._fxOpts.particles === false || window._fxOpts.trails === false))) return;
    const tick = Math.floor(now / 60);
    for (let i = 0; i < 10; i++) {
        const s = _tySerpents[i];
        if (!s.active || _tyWakeTicks[i] === tick || s.absorbAt >= 0) continue;
        _tyWakeTicks[i] = tick;
        const p = _tyWake[i * 6 + tick % 6]; p.active = true; _tySerpentPose(s, now, viewW < 600 || viewH < 500 ? 0.82 : 1); p.x = _tyBodyX[9]; p.y = _tyBodyY[9]; p.at = now;
        p.vx = -Math.cos(s.angle) * 0.025; p.vy = -Math.sin(s.angle) * 0.025 + 0.014;
    }
    g.save();
    for (let i = 0; i < 60; i++) {
        const p = _tyWake[i], age = now - p.at; if (!p.active || age < 0 || age >= 340) continue;
        const q = age / 340, x = p.x + p.vx * age, y = p.y + p.vy * age, size = 8 + q * 11;
        g.globalAlpha = _tyBrightness() * (1 - q) * 0.52;
        g.drawImage(_tySnakePolish.wisp, x - size / 2, y - size, size, size);
    }
    g.globalAlpha = _tyBrightness() * 0.48; g.fillStyle = PAL.GOLD; g.beginPath();
    for (let i = 0; i < 60; i++) { const p = _tyWake[i], age = now - p.at; if (p.active && age >= 0 && age < 340 && i % 3 === 0) { const r = 0.7 * (1 - age / 340), x = p.x + p.vx * age, y = p.y + p.vy * age; g.moveTo(x, y - r * 2); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); } }
    g.fill(); g.globalAlpha = _tyBrightness() * 0.65; g.fillStyle = PAL.VIOLET; g.beginPath();
    for (let i = 0; i < 60; i++) { const p = _tyWake[i], age = now - p.at; if (p.active && age >= 0 && age < 340 && i % 3 === 1) { const r = 0.8 * (1 - age / 340), x = p.x + p.vx * age + 2, y = p.y + p.vy * age - 2; g.moveTo(x - r, y); g.lineTo(x, y - r * 2); g.lineTo(x + r, y); g.lineTo(x, y + r); } }
    g.fill(); g.restore();
}
function _tyBakeVenom() {
    const aura = _tyMakeStamp(128), ring = _tyMakeStamp(192), bloom = _tyMakeStamp(256), micro = _tyMakeStamp(96), flat = _tyMakeStamp(128), flash = _tyMakeStamp(64), cracks = _tyMakeStamp(96), icon = _tyMakeStamp(64), marks = _tyMakeStamp(160);
    let g = aura.getContext('2d'); g.translate(64, 64);
    const fog = g.createRadialGradient(0, 0, 29, 0, 0, 64); fog.addColorStop(0, PAL.VIOLET + '00'); fog.addColorStop(0.46, PAL.MAGENTA + 'A0'); fog.addColorStop(0.72, PAL.VIOLET + '90'); fog.addColorStop(1, PAL.ABYSS + '00');
    g.fillStyle = fog; g.fillRect(-64, -64, 128, 128); g.fillStyle = PAL.VIOLET + '80'; g.strokeStyle = PAL.GOLD + '70'; g.lineWidth = 0.6;
    for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; _tyLeaf(g, Math.cos(t) * 43, Math.sin(t) * 43, 17, t + 1.7); }
    g = ring.getContext('2d'); g.translate(96, 96);
    const mist = g.createRadialGradient(0, 0, 36, 0, 0, 86); mist.addColorStop(0, PAL.ABYSS + '00'); mist.addColorStop(0.7, PAL.VIOLET + '50'); mist.addColorStop(0.9, PAL.MAGENTA + 'A0'); mist.addColorStop(1, PAL.VIOLET + '00');
    g.fillStyle = mist; g.fillRect(-96, -96, 192, 192); g.fillStyle = PAL.ABYSS + '30'; g.strokeStyle = PAL.ABYSS; g.lineWidth = 5; _tyRosette(g, 80, 12);
    g.strokeStyle = PAL.MAGENTA; g.lineWidth = 2.4; g.stroke(); g.strokeStyle = PAL.GOLD; g.lineWidth = 0.7; _tyRosette(g, 85, 12);
    g = bloom.getContext('2d'); g.translate(128, 128);
    const flame = g.createRadialGradient(0, 0, 18, 0, 0, 116); flame.addColorStop(0, PAL.ABYSS + '00'); flame.addColorStop(0.5, PAL.VIOLET + 'C0'); flame.addColorStop(0.86, PAL.MAGENTA); flame.addColorStop(1, PAL.EMBER);
    g.fillStyle = flame; g.strokeStyle = PAL.VIOLET; g.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; _tyLeaf(g, Math.cos(t) * 29, Math.sin(t) * 29, 84, t); }
    g.strokeStyle = PAL.GOLD; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, 89, 0, Math.PI * 2); g.stroke();
    g = micro.getContext('2d'); g.translate(48, 48); g.fillStyle = PAL.VIOLET + '65'; g.strokeStyle = PAL.MAGENTA; g.lineWidth = 2; _tyRosette(g, 25, 6);
    g.fillStyle = PAL.EMBER; g.strokeStyle = PAL.GOLD; g.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; _tyLeaf(g, Math.cos(t) * 23, Math.sin(t) * 23, 14, t); }
    g = flat.getContext('2d'); g.translate(64, 64); g.fillStyle = PAL.ABYSS + '00'; g.strokeStyle = PAL.ABYSS; g.lineWidth = 5; _tyRosette(g, 51, 10); g.strokeStyle = PAL.VIOLET; g.lineWidth = 2; g.stroke();
    g.strokeStyle = PAL.GOLD; g.lineWidth = 0.6; g.stroke(); g.fillStyle = PAL.EMBER;
    for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; _tyLeaf(g, Math.cos(t) * 48, Math.sin(t) * 48, 10, t); }
    g = flash.getContext('2d'); g.translate(32, 32); g.fillStyle = PAL.LILAC; g.strokeStyle = PAL.ABYSS; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < 16; i++) { const t = i * Math.PI / 8, r = i % 2 ? 5 : 28; if (!i) g.moveTo(Math.cos(t) * r, Math.sin(t) * r); else g.lineTo(Math.cos(t) * r, Math.sin(t) * r); } g.closePath(); g.stroke(); g.fill();
    g.fillStyle = PAL.EMBER; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
    g = cracks.getContext('2d'); g.translate(48, 48); g.strokeStyle = PAL.VIOLET; g.lineWidth = 3; _tyCraquelure(g, 36, 15); g.strokeStyle = PAL.EMBER; g.lineWidth = 0.7; _tyCraquelure(g, 36, 15);
    g.fillStyle = PAL.EMBER; g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill();
    g = icon.getContext('2d'); g.translate(32, 32); g.fillStyle = PAL.ABYSS; g.strokeStyle = PAL.VOID; g.lineWidth = 8;
    g.beginPath(); g.moveTo(-15, 0); g.bezierCurveTo(-5, -17, 8, -17, 15, 0); g.bezierCurveTo(8, 17, -5, 17, -15, 0); g.closePath(); g.stroke(); g.fill();
    g.strokeStyle = PAL.VIOLET; g.lineWidth = 2.5; g.stroke(); g.strokeStyle = PAL.GOLD; g.lineWidth = 0.6; g.stroke();
    g.strokeStyle = PAL.MAGENTA; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i <= 36; i++) { const t = i / 36 * Math.PI * 3.6, r = 10 * (1 - i / 42); const x = Math.cos(t) * r, y = Math.sin(t) * r; if (!i) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
    g.strokeStyle = PAL.EMBER; g.lineWidth = 2.1; g.beginPath(); g.moveTo(-7, -6); g.lineTo(-4, 0); g.moveTo(7, -6); g.lineTo(4, 0); g.stroke(); g.fillStyle = PAL.EMBER; g.beginPath(); g.arc(0, 0, 2.4, 0, Math.PI * 2); g.fill();
    g = marks.getContext('2d');
    for (let lit = 0; lit < 2; lit++) for (let j = 0; j < 5; j++) {
        g.save(); g.translate(j * 32 + 16, lit * 32 + 16); g.rotate((-0.78 + j * 0.14) * Math.PI + Math.PI / 2);
        g.fillStyle = lit ? PAL.VIOLET : PAL.ABYSS; g.strokeStyle = PAL.VOID; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -11); g.quadraticCurveTo(8, -1, 2, 10); g.lineTo(-2, 10); g.quadraticCurveTo(-8, -1, 0, -11); g.closePath(); g.stroke(); g.fill(); g.strokeStyle = PAL.GOLD; g.lineWidth = 1; g.stroke();
        if (lit) { g.strokeStyle = PAL.EMBER; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -7); g.quadraticCurveTo(-2, 0, 0, 6); g.stroke(); } g.restore();
    }
    return { aura, ring, bloom, micro, flat, flash, cracks, icon, marks };
}
const _tyVenomArt = _tyBakeVenom();
const _tyVenomDrops = Array.from({ length: 96 }, () => ({ active: false, owner: null, at: 0, life: 0, x: 0, y: 0, vx: 0, vy: 0, lime: false }));
const _tyVenomMicro = Array.from({ length: 24 }, () => ({ active: false, owner: null, at: 0, x: 0, y: 0, size: 0 }));
const _tyVenomWaves = Array.from({ length: 24 }, () => ({ active: false, owner: null, at: 0, x: 0, y: 0, size: 0, big: false }));
const _tyVenomFxStats = window._tyVenomFxStats = { epoch: -1, particles: 0, microBursts: 0, waves: 0, devourerIcons: 0, maxParticles: 96, maxBursts: 24 };
let _tyVenomFxEpoch = -1;
function _tyVenomParticles(e, x, y, now, count, burst) {
    let n = 0;
    for (let i = 0; i < 96 && n < count; i++) {
        const p = _tyVenomDrops[i]; if (p.active && !(burst && count >= 6 && p.life === 720)) continue;
        const t = n * 2.399963 + x * 0.017 + now * 0.002, speed = burst ? 35 + n % 4 * 18 : 6;
        p.active = true; p.owner = e; p.at = now; p.life = burst ? 650 : 720; p.x = x; p.y = y;
        p.vx = Math.cos(t) * speed; p.vy = burst ? Math.sin(t) * speed - 16 : -22 - n * 3; p.lime = n % 4 === 0; n++;
    }
}
function _drawTyVenom(g, now, tier, only) {
    const o = window._fxOpts, bright = _tyBrightness(), particles = !o || o.particles !== false, trails = !o || o.trails !== false, glow = tier < 2 && (!o || o.glow !== false);
    if (_tyVenomFxEpoch !== window._tyVenomEpoch) {
        _tyVenomFxEpoch = window._tyVenomEpoch;
        for (let i = 0; i < 96; i++) { _tyVenomDrops[i].active = false; _tyVenomDrops[i].owner = null; }
        for (let i = 0; i < 24; i++) { _tyVenomMicro[i].active = _tyVenomWaves[i].active = false; _tyVenomMicro[i].owner = _tyVenomWaves[i].owner = null; }
    }
    _tyVenomFxStats.epoch = _tyVenomFxEpoch; if (!only) _tyVenomFxStats.particles = _tyVenomFxStats.microBursts = _tyVenomFxStats.waves = _tyVenomFxStats.devourerIcons = 0;
    if (bright <= 0) return;
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = bright;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i], stacks = e._tyVenomStacks;
        if (!(stacks > 0) || !_tyVenomTarget(e) || (only ? e !== only : e.type === 'goliath')) continue;
        if (e._tyVenomFxEpoch !== _tyVenomFxEpoch) { e._tyVenomFxEpoch = _tyVenomFxEpoch; e._tyVenomFxPulseSeen = -10000; e._tyVenomDropAt = now; e._tyVenomFxMicroAt = now; }
        const size = (e.size || 30), r = size + 8, breath = 1 + Math.sin(now * 0.004 + e.x) * 0.045;
        const pulseAge = now - e._tyVenomPulseAt;
        const settle = Math.max(0, Math.min(1, (pulseAge - 70) / 690));
        const surge = e._tyVenomPulseBig && pulseAge >= 0 && pulseAge < 760 ? (pulseAge < 70 ? 1 - 0.12 * pulseAge / 70 : 1 + 0.18 * Math.sin(settle * Math.PI) * (1 - settle) - 0.12 * Math.max(0, 1 - (pulseAge - 70) / 130)) : 1;
        const auraSize = (size * 2.2 + 24) * breath * surge;
        g.globalAlpha = bright * (glow ? 0.2 + stacks * 0.027 : 0.38); g.drawImage(glow ? _tyVenomArt.aura : _tyVenomArt.flat, e.x - auraSize / 2, e.y - auraSize / 2, auraSize, auraSize);
        if (stacks >= 4.9 && tier < 2) { g.globalAlpha = bright * 0.45; const w = size * 1.3; g.drawImage(_tyVenomArt.cracks, e.x - w / 2, e.y - w / 2, w, w); }
        for (let j = 0; j < 5; j++) {
            const a = (-0.78 + j * 0.14) * Math.PI, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r, weight = Math.max(0, Math.min(1, stacks - j));
            g.globalAlpha = bright * (weight > 0 ? weight : 0.5); g.drawImage(_tyVenomArt.marks, j * 32, weight > 0 ? 32 : 0, 32, 32, x - 7, y - 7, 14, 14);
        }
        const vuln = e.vulnStacks > 0 && e.vulnEndTime && performance.now() < e.vulnEndTime;
        const ix = e.x + (vuln ? 51 : 36), iy = e.y - size - 28;
        g.globalAlpha = bright; g.drawImage(_tyVenomArt.icon, ix - 32, iy - 32, 64, 64); _tyVenomFxStats.devourerIcons++;
        const age = now - e._tyVenomPulseAt, duration = e._tyVenomPulseBig ? 760 : 340;
        if (age >= 0 && age < duration && e._tyVenomFxPulseSeen !== e._tyVenomPulseAt) {
            e._tyVenomFxPulseSeen = e._tyVenomPulseAt;
            for (let k = 0; k < 24; k++) { const w = _tyVenomWaves[k]; if (w.active) continue; w.active = true; w.owner = e; w.at = e._tyVenomPulseAt; w.x = e.x; w.y = e.y; w.size = size * 2 + 12; w.big = e._tyVenomPulseBig; break; }
            if (tier < 2 && particles) _tyVenomParticles(e, e.x, e.y, e._tyVenomPulseAt + 100, tier === 0 ? (e._tyVenomPulseBig ? 12 : 5) : (e._tyVenomPulseBig ? 6 : 2), true);
        }
        const added = now - e._tyVenomAddedAt;
        if (added >= 0 && added < 140 && tier < 3) {
            const w = 16 + added * 0.06; g.globalAlpha = bright * (1 - added / 140) * 0.75; g.drawImage(_tyVenomArt.flash, e._tyVenomAddedX - w / 2, e._tyVenomAddedY - w / 2, w, w);
            if (glow) { const a = (-0.78 + (Math.ceil(stacks) - 1) * 0.14) * Math.PI; _drawGlow(g, 'ember', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 8, (1 - added / 140) * 0.6); }
        }
        if (tier < 2 && particles && now >= e._tyVenomDropAt) { e._tyVenomDropAt = now + (tier === 0 ? 110 : 280); _tyVenomParticles(e, e.x + Math.sin(now * 0.01 + i) * size * 0.5, e.y, now, 1, false); }
        if (tier < 2 && particles && now >= e._tyVenomFxMicroAt) {
            const seed = now * 0.017 + e.x * 0.31; e._tyVenomFxMicroAt = now + (450 - stacks * 65) * (tier === 0 ? 1 : 2.5) * (0.85 + 0.15 * Math.sin(seed));
            for (let k = 0; k < 24; k++) { const m = _tyVenomMicro[k]; if (m.active) continue; m.active = true; m.owner = e; m.at = now; m.x = e.x + Math.cos(seed) * size * 0.45; m.y = e.y + Math.sin(seed * 1.3) * size * 0.45; m.size = 17 + stacks * 2; _tyVenomParticles(e, m.x, m.y, now, tier === 0 ? 2 : 1, true); break; }
        }
    }
    for (let i = 0; i < 24; i++) {
        const m = _tyVenomMicro[i], age = now - m.at;
        if (!m.active || (only ? m.owner !== only : m.owner.type === 'goliath')) continue;
        if (age < 0 || age >= 120 || !(m.owner._tyVenomStacks > 0) || !_tyVenomTarget(m.owner)) { m.active = false; m.owner = null; continue; }
        _tyVenomFxStats.microBursts++;
        if (tier >= 2 || !particles) continue;
        const q = age / 120, w = m.size * (0.55 + q); g.globalAlpha = bright * (1 - q); g.drawImage(_tyVenomArt.micro, m.x - w / 2, m.y - w / 2, w, w);
    }
    for (let i = 0; i < 24; i++) {
        const w = _tyVenomWaves[i], age = now - w.at;
        if (!w.active || (only ? w.owner !== only : w.owner.type === 'goliath')) continue;
        const duration = w.big ? 760 : 340;
        if (age < 0 || age >= duration || !(w.owner._tyVenomStacks > 0) || !_tyVenomTarget(w.owner)) { w.active = false; w.owner = null; continue; }
        _tyVenomFxStats.waves++;
        const q = age / duration, ease = 1 - Math.pow(1 - Math.min(1, Math.max(0, (age - 40) / (w.big ? 360 : 200))), 3), width = w.size * (0.6 + ease * (w.big ? 2.1 : 0.9));
        if (age < 70) { const f = w.size * (w.big ? 0.9 : 0.5) * (1 - age / 100); g.globalAlpha = bright * (1 - age / 70); if (glow) g.globalCompositeOperation = 'lighter'; g.drawImage(_tyVenomArt.flash, w.x - f / 2, w.y - f / 2, f, f); g.globalCompositeOperation = 'source-over'; }
        if (age >= 40) { g.globalAlpha = bright * (1 - q) * (w.big ? 0.95 : 0.7); g.drawImage(tier >= 3 ? _tyVenomArt.flat : _tyVenomArt.ring, w.x - width / 2, w.y - width / 2, width, width); }
        if (tier < 3 && trails && age >= 60 && age < (w.big ? 450 : 260)) { const p = (age - 60) / (w.big ? 390 : 200), b = w.size * (0.7 + (1 - Math.pow(1 - p, 3)) * (w.big ? 2.2 : 0.8)); g.globalAlpha = bright * (1 - p) * (w.big ? 0.85 : 0.45); g.drawImage(_tyVenomArt.bloom, w.x - b / 2, w.y - b / 2, b, b); }
        if (w.big && tier < 2 && age >= 120 && age < 650) { const p = (age - 120) / 530, b = w.size * (0.45 + (1 - Math.pow(1 - p, 3)) * 1.45); g.globalAlpha = bright * (1 - p) * 0.48; g.drawImage(_tyVenomArt.ring, w.x - b / 2, w.y - b / 2, b, b); }
    }
    for (let lime = 0; lime < 2; lime++) {
        g.beginPath(); g.fillStyle = lime ? PAL.EMBER : PAL.MAGENTA; g.globalAlpha = bright * (lime ? 0.9 : 0.7);
        for (let i = 0; i < 96; i++) {
            const p = _tyVenomDrops[i], age = now - p.at;
            if (!p.active || (only ? p.owner !== only : p.owner.type === 'goliath')) continue;
            if (age >= p.life || !(p.owner._tyVenomStacks > 0) || !_tyVenomTarget(p.owner)) { p.active = false; p.owner = null; continue; }
            if (age < 0) continue;
            if (lime === 0) _tyVenomFxStats.particles++;
            if (tier >= 2 || !particles || p.lime !== !!lime) continue;
            const q = age / p.life, t = age / 1000, x = p.x + (trails ? p.vx * t : 0), y = p.y + (trails ? p.vy * t + (p.life === 650 ? 35 * t * t : 0) : 0), r = (1 - q) * (p.lime ? 1.7 : 1.2);
            g.moveTo(x, y - r * 1.6); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath();
        }
        g.fill();
    }
    g.restore();
}

function _drawTyBirthAperture(g, now, tier) {
    if (tier >= 3 || (window._fxOpts && window._fxOpts.trails === false)) return;
    let age = 1000;
    for (let i = 0; i < 10; i++) if (_tySerpents[i].active) age = Math.min(age, now - _tySerpents[i].spawnTime);
    if (age < 0 || age >= 300) return;
    g.save(); g.translate(_tyArray.x, _tyArray.y); g.rotate(-0.08);
    g.globalAlpha = _tyBrightness() * (1 - age / 300) * 0.85;
    g.drawImage(_tySnakePolish.fissure, -64, -64, 128, 128); g.restore();
}
function _drawTyScaleStamp(g, x, y, r, angle, color, strokeAlpha, fillAlpha) {
    const size = 64 * r / 22, half = size / 2;
    g.save(); g.translate(x, y); g.rotate(angle);
    g.globalAlpha = _tyBrightness() * fillAlpha; g.drawImage(_tySnakePolish.fill, -half, -half, size, size);
    g.globalAlpha = _tyBrightness() * strokeAlpha;
    g.drawImage(_tySnakePolish.scales[color === PAL.MAGENTA ? 1 : color === PAL.LILAC ? 2 : 0], -half, -half, size, size); g.restore();
    g.save(); g.globalAlpha = _tyBrightness() * strokeAlpha * 0.55; g.strokeStyle = PAL.LILAC; g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(x - r * 0.8, y - r * 0.2); g.quadraticCurveTo(x - r * 0.4, y - r * 0.8, x + r * 0.3, y - r * 0.65); g.stroke(); g.restore();
}

const _tyScorch = { cast: -1, start: -10000, x: 0, y: 0 };
let _tyVisualClock = -1;
const _tySlowSeal = new Path2D();
for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    _tySlowSeal.moveTo(c * 212 - s * 5, s * 212 + c * 5);
    _tySlowSeal.lineTo(c * 202, s * 202);
    _tySlowSeal.lineTo(c * 212 + s * 5, s * 212 - c * 5);
}
function _drawTyScorch(g, now, tier) {
    if (now < _tyVisualClock) { _tyScorch.cast = -1; _tyScorch.start = -10000; }
    _tyVisualClock = now;
    const age = now - _tyArray.start;
    if (_tyArray.start >= 0 && age >= 1430 && age < 2430 && _tyScorch.cast !== _tyArray.start) {
        _tyScorch.cast = _tyArray.start; _tyScorch.start = _tyArray.start + 1430; _tyScorch.x = _tyArray.x; _tyScorch.y = _tyArray.y;
    }
    const p = (now - _tyScorch.start) / 1000;
    if (tier >= 3 || p < 0 || p >= 1 || (window._fxOpts && window._fxOpts.sigilBackdrop === false)) return;
    g.save(); g.globalAlpha = _tyBrightness() * (1 - p) * (1 - p) * 0.6;
    const scorchSize = TY_ARRAY_RADIUS * 2.18; g.drawImage(_tyPolish.scorch, _tyScorch.x - scorchSize / 2, _tyScorch.y - scorchSize / 2, scorchSize, scorchSize); g.restore();
}
function _drawTyArrayPolish(g, x, y, age, tier, radius) {
    if (tier >= 3) return;
    const o = window._fxOpts, bright = _tyBrightness();
    g.save(); g.translate(x, y);
    if (age >= 1430 && age < 1950) {
        const p = (age - 1430) / 520, height = 60 + radius * 1.18 * Math.sin(p * Math.PI), width = 86 * (1 - p * 0.4);
        if (!o || o.trails !== false) {
            g.globalAlpha = bright * (1 - p) * 0.75;
            g.drawImage(_tyPolish.plume, -width / 2, 24 - height, width, height);
            if (tier < 2) _drawGlow(g, 'magenta', -width * 0.12, 24 - height * 0.58, width * 0.7, (1 - p) * 0.18);
            if (tier === 0) { g.globalAlpha = bright * (1 - p) * 0.23; g.drawImage(_tyPolish.plume, -width * 0.4 + Math.sin(age * 0.015) * 9, 24 - height * 0.83, width * 0.7, height * 0.83); }
        }
        if (tier === 0 && (!o || o.particles !== false)) {
            g.globalAlpha = bright * (1 - p) * 0.55; g.fillStyle = PAL.MAGENTA; g.beginPath();
            for (let i = 0; i < 10; i++) {
                const t = age - 1430 - i * 12;
                if (t < 0) continue;
                const px = Math.sin(i * 2.4) * (16 + i % 3 * 9), py = -height * (0.2 + i % 5 * 0.12) + t * t * 0.0005;
                g.moveTo(px, py - 1.8); g.quadraticCurveTo(px + 1.3, py, px, py + 1.5); g.lineTo(px - 0.45, py);
            }
            g.fill();
        }
    }
    g.restore();
}
function _drawTyImpactStamp(g, f, p, tier) {
    if (tier >= 3 || (window._fxOpts && window._fxOpts.particles === false)) return false;
    const size = (f.kind === 1 ? 100 : 78) * 1.3 * (0.7 + p * 0.65), o = window._fxOpts;
    g.save(); g.translate(f.x, f.y); g.rotate(f.angle + (f.kind === 3 ? p * 0.45 : 0));
    const age = p * 420;
    if (age < 220) {
        const q = age / 220, ease = 1 - Math.pow(1 - q, 3);
        const burstSize = (f.kind === 1 ? 148 : 116) * (0.4 + ease * 0.65) * (tier === 2 ? 0.8 : 1);
        g.globalAlpha = _tyBrightness() * (1 - q) * (1 - q) * 0.95;
        g.drawImage(_tyPolish.impactBursts[f.kind], -burstSize / 2, -burstSize / 2, burstSize, burstSize);
    }
    g.globalAlpha = _tyBrightness() * (1 - p);
    g.drawImage(_tyPolish.impacts[f.kind + (skillShiftActive ? 4 : 0)], -size / 2, -size / 2, size, size);
    const flash = Math.max(0, 1 - p * 420 / 100);
    if (tier < 2 && flash > 0 && (!o || (o.glow !== false && o.screenFlash !== false))) {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = _tyBrightness() * flash * (o ? Math.max(0, Math.min(1, (o.flashIntensity ?? 100) / 100)) : 1);
        g.strokeStyle = PAL.MAGENTA; g.lineWidth = 1.8; g.beginPath();
        const inner = size * 0.29, outer = inner + flash * 12;
        for (let ray = 0; ray < 4; ray++) { const a = ray * Math.PI / 2 + 0.4, c = Math.cos(a), sn = Math.sin(a); g.moveTo(c * inner, sn * inner); g.lineTo(c * outer, sn * outer); }
        g.stroke(); g.globalCompositeOperation = 'source-over';
    }
    if (tier === 0) _drawGlow(g, 'violet', 0, 0, size * 0.42, (1 - p) * 0.32);
    g.restore(); return true;
}

  function _getGlowSprite(key, size, innerCol, midCol, outerCol) {
    if (_glowCache[key]) return _glowCache[key];
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var gctx = c.getContext('2d');
    var half = size * 0.5;
    var grad = gctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, innerCol);
    grad.addColorStop(0.38, midCol);
    grad.addColorStop(1.0, outerCol);
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, size, size);
    _glowCache[key] = c;
    return c;
  }
  function _initGlowSprites() {
    _getGlowSprite('violet', 128, PAL.VIOLET + '70', PAL.ABYSS + '55', PAL.VOID + '00');
    _getGlowSprite('magenta', 128, PAL.MAGENTA + '75', PAL.VIOLET + '32', PAL.VOID + '00');
    _getGlowSprite('lilac', 96, PAL.LILAC + '85', PAL.VIOLET + '28', PAL.VOID + '00');
    _getGlowSprite('ember', 64, PAL.EMBER + '70', PAL.ABYSS + '20', PAL.VOID + '00');
    _getGlowSprite('abyss', 256, PAL.ABYSS + 'C0', PAL.VOID + '90', PAL.VOID + '00');
}
  function _drawGlow(ctx, key, x, y, radius, alpha) {
    if (alpha <= 0.01 || (window._fxOpts && window._fxOpts.glow === false)) return;
    var sp = _glowCache[key];
    if (!sp) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = _tyBrightness() * (alpha);
    ctx.drawImage(sp, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

// Render coordinates are reused without changing the simulation segments.
const _tyBodyX = new Float64Array(10), _tyBodyY = new Float64Array(10);
const _tyBodyNX = new Float64Array(10), _tyBodyNY = new Float64Array(10);
function _tySerpentPose(s, now, scale) {
    const x = _tyBodyX, y = _tyBodyY, c = Math.cos(s.angle), sn = Math.sin(s.angle);
    const domain = skillShiftActive && gfx() === 0;
    const moving = !window._fxOpts || window._fxOpts.trails !== false, phase = moving ? now * 0.006 + s.id * 0.7 : 0;
    for (let j = 0; j < 10; j++) {
        const t = j / 9, bend = Math.sin(t * Math.PI * 2 - phase) * Math.sin(t * Math.PI) * (domain ? 3.4 : 5.2) * scale;
        x[j] = s.segX[0] + (s.segX[j] - s.segX[0]) * 1.45 - sn * bend;
        y[j] = s.segY[0] + (s.segY[j] - s.segY[0]) * 1.45 + c * bend;
    }
    for (let j = 0; j < 10; j++) {
        const prev = Math.max(0, j - 1), next = Math.min(9, j + 1);
        const dx = x[prev] - x[next], dy = y[prev] - y[next], len = Math.hypot(dx, dy) || 1;
        const width = (domain ? 7.4 * (1 - j / 12) + 0.2 : 5.2 * (1 - j / 10) + 0.2) * scale;
        _tyBodyNX[j] = -dy / len * width; _tyBodyNY[j] = dx / len * width;
    }
}
function _drawTySerpentRelief(g, s, now, tier) {
    const scale = viewW < 600 || viewH < 500 ? 0.82 : 1;
    const o = window._fxOpts, bright = _tyBrightness(), hunting = s.state === 2;
    _tySerpentPose(s, now, scale);
    const x = _tyBodyX, y = _tyBodyY, nx = _tyBodyNX, ny = _tyBodyNY, domain = skillShiftActive && tier === 0;
    g.save(); g.globalAlpha = bright; g.lineCap = 'round'; g.lineJoin = 'round';
    if (tier < 2 && (!o || (o.glow !== false && o.sigilLight !== false))) {
        g.save(); g.translate(x[4], y[4]); g.rotate(s.angle); g.globalAlpha = bright * 0.22;
        g.drawImage(_glowCache.violet, -36 * scale, -13 * scale, 64 * scale, 26 * scale); g.restore();
    }
    g.beginPath(); g.moveTo(x[0] + nx[0], y[0] + ny[0]);
    for (let j = 1; j < 10; j++) g.lineTo(x[j] + nx[j], y[j] + ny[j]);
    for (let j = 9; j >= 0; j--) g.lineTo(x[j] - nx[j], y[j] - ny[j]);
    g.closePath(); g.fillStyle = domain ? PAL.VOID : skillShiftActive ? '#D7BFF5' : '#9971CF'; g.fill();
    g.strokeStyle = PAL.VIOLET; g.lineWidth = 1.1 * scale; g.stroke();
    // A pale upper rim and belly stay readable without a halo.
    g.beginPath();
    for (let j = 0; j < 10; j++) {
        const px = domain ? x[j] - nx[j] : x[j] - 1.8 * scale, py = domain ? y[j] - ny[j] : y[j] - 1.8 * scale;
        if (j === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokeStyle = PAL.LILAC; g.lineWidth = (domain ? 0.9 : 1.7) * scale; g.stroke();
    g.beginPath(); g.moveTo(x[0] + nx[0] * 0.8, y[0] + ny[0] * 0.8);
    for (let j = 1; j < 10; j++) g.lineTo(x[j] + nx[j] * 0.8, y[j] + ny[j] * 0.8);
    g.strokeStyle = domain ? PAL.ABYSS : PAL.LILAC; g.lineWidth = (domain ? 0.65 : 1.25) * scale; g.stroke();
    if (!domain && tier < 3 && (!o || o.trails !== false)) {
        g.beginPath();
        for (let j = 1; j < 9; j++) {
            g.moveTo(x[j] - nx[j] * 0.7, y[j] - ny[j] * 0.7);
            g.lineTo(x[j] + Math.cos(s.angle) * 1.3, y[j] + Math.sin(s.angle) * 1.3);
            g.lineTo(x[j] + nx[j] * 0.7, y[j] + ny[j] * 0.7);
        }
        g.strokeStyle = PAL.GOLD; g.globalAlpha = bright * (domain ? 0.24 : 0.85); g.lineWidth = 0.9 * scale; g.stroke();
    }
    g.save(); g.translate(x[0], y[0]); g.rotate(s.angle); g.globalAlpha = bright;
    const headIndex = (Math.round(s.angle * 8 / Math.PI) % 16 + 16) % 16 + (domain ? 16 : skillShiftActive ? 32 : 0), h = 12.35 * scale;
    g.drawImage(_tySnakePolish.heads[headIndex], -20.8 * scale, -20.8 * scale, 41.6 * scale, 41.6 * scale);
    if (tier < 2 && (!o || o.trails !== false)) {
        const phase = (now * 0.0045 + s.id * 0.37) % 1, length = phase < 0.4 ? Math.sin(phase / 0.4 * Math.PI) * (hunting ? 5.4 : 3.2) * scale : 0;
        if (length > 0.6) {
            g.strokeStyle = PAL.MAGENTA; g.lineWidth = 0.9; g.beginPath(); g.moveTo(h, 0); g.lineTo(h + length, 0);
            g.lineTo(h + length + 1.4, -1.1); g.moveTo(h + length, 0); g.lineTo(h + length + 1.4, 1.1); g.stroke();
        }
    }
    if (now < s.biteFlashUntil && (!o || o.particles !== false)) {
        g.globalAlpha = bright * Math.min(1, (s.biteFlashUntil - now) / 100);
        g.strokeStyle = PAL.LILAC; g.lineWidth = 2.3 * scale; g.beginPath();
        g.moveTo(5 * scale, -5 * scale); g.quadraticCurveTo(14 * scale, -7 * scale, 17 * scale, -1 * scale);
        g.moveTo(5 * scale, 5 * scale); g.quadraticCurveTo(14 * scale, 7 * scale, 17 * scale, 1 * scale); g.stroke();
    }
    g.restore();
    if (tier < 2 && (!o || o.particles !== false)) {
        const p = (now * 0.008 + s.id * 3.1) % 8, j = Math.floor(p), f = p - j;
        const px = x[j] + (x[j + 1] - x[j]) * f, py = y[j] + (y[j + 1] - y[j]) * f;
        g.globalAlpha = bright * 0.85; g.drawImage(_tySnakePolish.pearl, px - 3, py - 3, 6, 6);
    }
    g.restore();
}
function _drawTyChargeRelief(g, x, y, now, tier, ratio, radius) {
    const full = Math.max(0, Math.min(1, ratio)) * 10, o = window._fxOpts, ready = ratio >= 0.999;
    const r = radius * (ready && (!o || o.glow !== false) ? 1 + Math.sin(now * 0.0035) * 0.018 : 1);
    g.save(); g.translate(x, y); g.lineCap = 'butt'; g.globalAlpha = _tyBrightness() * 0.6;
    if (ready && tier < 2) _drawGlow(g, 'violet', -2, -2, r * 1.1, 0.12);
    g.strokeStyle = PAL.ABYSS; g.lineWidth = 4.6; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = ready ? PAL.LILAC : PAL.VIOLET; g.lineWidth = 1.7; g.globalAlpha = _tyBrightness() * 0.95; g.beginPath();
    for (let i = 0; i < 10 && i < full; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + 0.04, b = a + (Math.PI / 5 - 0.08) * Math.min(1, full - i); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.arc(0, 0, r, a, b); }
    g.stroke();
    if (!o || o.trails !== false) {
        g.strokeStyle = PAL.GOLD; g.lineWidth = 0.7; g.globalAlpha = _tyBrightness() * 0.55; g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, c = Math.cos(a), s = Math.sin(a); g.moveTo(c * (r - 2), s * (r - 2)); g.lineTo(c * (r + 2), s * (r + 2)); }
        g.stroke();
        g.strokeStyle = PAL.LILAC; g.globalAlpha = _tyBrightness() * 0.7; g.beginPath(); g.arc(0, 0, r - 1.5, Math.PI * 1.02, Math.PI * 1.57); g.stroke();
    }
    if (ready) _drawTyMaturity(g, now, tier, radius, true); else _tyMaturity.ready = false;
    g.restore();
}

  function drawHacViemRing(ctx, x, y, timeMs, gfx, chargeRatio, ringOrder) {
    if (gfx < 3) { _drawTyChargeRelief(ctx, x, y, timeMs, gfx, chargeRatio, ringOrder); return; }
    var isMobile = (viewW < 600 || viewH < 500);
    var scale = isMobile ? 0.86 : 1.0;
    var baseRadius = ringOrder;
    var segments = 10;
    var fullFloat = Math.max(0, Math.min(1, chargeRatio)) * segments;
    var fullCount = Math.floor(fullFloat);
    var partial = fullFloat - fullCount;
    var isReady = (chargeRatio >= 0.999);
    ctx.save();
    ctx.translate(x, y);
    var breathe = isReady ? (1.0 + 0.045 * Math.sin(timeMs * 0.0045)) : 1.0;
    var r = baseRadius * breathe;
    if (isReady && gfx <= 2) {
      _drawGlow(ctx, 'violet', 0, 0, r * 1.65, 0.32 + 0.12 * Math.sin(timeMs * 0.005));
    }
    var arcSpan = (Math.PI * 2) / segments;
    var gap = 0.095;
    ctx.lineCap = 'round';
    for (var i = 0; i < segments; i++) {
      var a0 = -Math.PI * 0.5 + i * arcSpan + gap * 0.5;
      var a1 = -Math.PI * 0.5 + (i + 1) * arcSpan - gap * 0.5;
      if (i < fullCount) {
        if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
          ctx.beginPath();
          ctx.arc(0, 0, r, a0, a1);
          ctx.strokeStyle = PAL.VOID;
          ctx.lineWidth = 4.2;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a1);
        ctx.strokeStyle = isReady ? PAL.MAGENTA : PAL.VIOLET;
        ctx.lineWidth = isReady ? 2.2 : 1.8;
        ctx.stroke();
        if (isReady && gfx <= 1) {
          var mx = Math.cos((a0 + a1) * 0.5) * r;
          var my = Math.sin((a0 + a1) * 0.5) * r;
          ctx.fillStyle = PAL.LILAC;
          ctx.beginPath();
          ctx.arc(mx, my, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (i === fullCount && partial > 0.02) {
        var ap = a0 + (a1 - a0) * partial;
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, ap);
        ctx.strokeStyle = PAL.VIOLET;
        ctx.globalAlpha = _tyBrightness() * (0.35 + 0.65 * partial);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        if (gfx <= 2) {
          var tipX = Math.cos(ap) * r;
          var tipY = Math.sin(ap) * r;
          ctx.fillStyle = PAL.LILAC;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = _tyBrightness() * (1.0);
      } else if (i <= 2 && fullCount === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a1);
        ctx.strokeStyle = PAL.VIOLET;
        ctx.globalAlpha = _tyBrightness() * (0.09);
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.globalAlpha = _tyBrightness() * (1.0);
      }
    }
    if (isReady && gfx <= 2) {
      var flameCount = (gfx === 0) ? 10 : 6;
      for (var fi = 0; fi < flameCount; fi++) {
        var baseAng = (fi / flameCount) * Math.PI * 2 + timeMs * 0.0012;
        var wave = Math.sin(timeMs * 0.008 + fi * 1.7);
        var tongueLen = (6.5 + 3.5 * Math.sin(timeMs * 0.006 + fi * 2.3)) * scale;
        var bx1 = Math.cos(baseAng - 0.08) * (r + 1);
        var by1 = Math.sin(baseAng - 0.08) * (r + 1);
        var bx2 = Math.cos(baseAng + 0.08) * (r + 1);
        var by2 = Math.sin(baseAng + 0.08) * (r + 1);
        var tx = Math.cos(baseAng + wave * 0.07) * (r + tongueLen);
        var ty = Math.sin(baseAng + wave * 0.07) * (r + tongueLen);
        ctx.beginPath();
        ctx.moveTo(bx1, by1);
        ctx.quadraticCurveTo(
          Math.cos(baseAng) * (r + tongueLen * 0.55),
          Math.sin(baseAng) * (r + tongueLen * 0.55),
          tx, ty
        );
        ctx.quadraticCurveTo(
          Math.cos(baseAng) * (r + tongueLen * 0.45),
          Math.sin(baseAng) * (r + tongueLen * 0.45),
          bx2, by2
        );
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = (fi % 2 === 0) ? PAL.MAGENTA : PAL.VIOLET;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }
    _drawTyMaturity(ctx, timeMs, gfx, baseRadius, isReady);
    ctx.restore();
  }
  function drawDetonation(ctx, x, y, elapsedMs, gfx, shardsPool) {
    if (gfx < 3 && elapsedMs >= 0 && elapsedMs <= 760) {
      ctx.save(); ctx.translate(x, y);
      if (elapsedMs < 480) {
        _drawTyDevourFangs(ctx, elapsedMs, gfx);
        const p = elapsedMs % 120 / 120, size = 40 + Math.sin(p * Math.PI) * 17;
        ctx.globalAlpha = _tyBrightness() * 0.85; ctx.drawImage(_tyPolish.impacts[1], -size / 2, -size / 2, size, size);
      } else {
        const p = (elapsedMs - 480) / 280, size = 60 + p * 60;
        ctx.globalAlpha = _tyBrightness() * (1 - p) * 0.8; ctx.drawImage(_tyPolish.impacts[3], -size / 2, -size / 2, size, size);
      }
      ctx.restore(); if (!shardsPool) return;
    }
    ctx.save();
    if (gfx >= 3 && elapsedMs >= 0 && elapsedMs <= 560) {
      var biteDuration = 120;
      var biteIdx = Math.min(3, Math.floor(elapsedMs / biteDuration));
      var biteLocal = (elapsedMs - biteIdx * biteDuration) / biteDuration;
      var fadeOut = (elapsedMs > 480) ? Math.max(0, 1 - (elapsedMs - 480) / 80) : 1.0;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = _tyBrightness() * (fadeOut);
      var shadowR = 32 * (0.85 + 0.15 * Math.sin(elapsedMs * 0.02));
      if (gfx <= 2) {
        _drawGlow(ctx, 'abyss', 0, 10, shadowR * 1.35, 0.85);
      }
      ctx.beginPath();
      ctx.ellipse(0, 12, shadowR, shadowR * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAL.VOID;
      ctx.fill();
      ctx.strokeStyle = PAL.VIOLET;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      var strikeAngles = _strikeAngles;
      var sAng = strikeAngles[biteIdx];
      var lungeOffset = Math.sin(biteLocal * Math.PI) * 22;
      ctx.save();
      ctx.rotate(sAng);
      ctx.translate(0, 16 - lungeOffset);
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(-16, -6);
      ctx.lineTo(-11, 18);
      ctx.lineTo(11, 18);
      ctx.lineTo(16, -6);
      ctx.closePath();
      ctx.fillStyle = PAL.VOID;
      ctx.fill();
      ctx.strokeStyle = PAL.MAGENTA;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = PAL.EMBER;
      ctx.beginPath();
      ctx.moveTo(-9, -8); ctx.lineTo(-4, -12); ctx.lineTo(-5, -5); ctx.closePath();
      ctx.moveTo(9, -8);  ctx.lineTo(4, -12);  ctx.lineTo(5, -5);  ctx.closePath();
      ctx.fill();
      ctx.restore();
      _drawTyDevourFangs(ctx, elapsedMs, gfx);
      var fangSnap = Math.sin(biteLocal * Math.PI);
      var jawGap = 18 * (1.0 - 0.72 * fangSnap);
      if (gfx <= 1 && fangSnap > 0.45) {
        _drawGlow(ctx, 'lilac', 0, 0, 38, (fangSnap - 0.4) * 0.9);
      }
      ctx.strokeStyle = PAL.LILAC;
      ctx.fillStyle = PAL.LILAC;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-14, -jawGap - 6);
      ctx.lineTo(-8, -jawGap + 8);
      ctx.lineTo(-3, -jawGap - 4);
      ctx.lineTo(3, -jawGap - 4);
      ctx.lineTo(8, -jawGap + 8);
      ctx.lineTo(14, -jawGap - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, jawGap + 6);
      ctx.lineTo(-7, jawGap - 6);
      ctx.lineTo(0, jawGap + 3);
      ctx.lineTo(7, jawGap - 6);
      ctx.lineTo(12, jawGap + 6);
      ctx.stroke();
      if (fangSnap > 0.55) {
        var slashLen = 22 * fangSnap;
        ctx.strokeStyle = (biteIdx % 2 === 0) ? PAL.LILAC : PAL.MAGENTA;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-slashLen, -slashLen * 0.6);
        ctx.lineTo(slashLen, slashLen * 0.6);
        ctx.moveTo(slashLen, -slashLen * 0.6);
        ctx.lineTo(-slashLen, slashLen * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (gfx >= 3 && elapsedMs >= 480 && elapsedMs <= 760) {
      var burstT = (elapsedMs - 480) / 280;
      var burstAlpha = 1.0 - burstT;
      ctx.save();
      ctx.translate(x, y);
      if (gfx <= 2) {
        _drawGlow(ctx, 'magenta', 0, 0, 64 * (0.5 + burstT * 0.7), burstAlpha * 0.75);
      }
      ctx.strokeStyle = PAL.LILAC;
      ctx.globalAlpha = _tyBrightness() * (burstAlpha);
      ctx.lineWidth = 2.2 * (1 - burstT * 0.5);
      var arm = 18 + burstT * 52;
      ctx.beginPath();
      ctx.moveTo(-arm, -arm); ctx.lineTo(arm, arm);
      ctx.moveTo(arm, -arm);  ctx.lineTo(-arm, arm);
      ctx.stroke();
      ctx.restore();
    }
    if (shardsPool) {
      for (var i = 0; i < shardsPool.length; i++) {
        var sh = shardsPool[i];
        if (!sh.active) continue;
        var age = tyClock - sh.spawnTime;
        var lifeRatio = Math.max(0, Math.min(1, 1 - age / sh.lifeMs));
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.angle);
        ctx.globalAlpha = _tyBrightness() * (lifeRatio);
        _drawTyCometTail(ctx, age, gfx, lifeRatio);
        if (gfx <= 2) {
          _drawGlow(ctx, 'violet', 0, 0, 20, 0.55 * lifeRatio);
        }
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-2, -6.5);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-2, 6.5);
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 1.75;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(2, -2.2);
        ctx.lineTo(2, 2.2);
        ctx.closePath();
        ctx.fillStyle = PAL.LILAC;
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }


function _drawTyEye(g, age, tier, core, fade) {
    const o = window._fxOpts, width = core * 2.45, open = Math.min(1, Math.max(0.05, age / 180));
    const gaze = !o || o.trails !== false ? Math.sin((age - 180) * 0.0035) * core * 0.21 : 0;
    g.save(); g.scale(1, open); g.globalAlpha = _tyBrightness() * fade;
    g.drawImage(_tyPolish.eye, -width / 2, -width / 2, width, width);
    if (tier < 2 && (!o || o.sigilLight !== false)) _drawGlow(g, 'violet', gaze - 2, -2, core * 0.62, fade * 0.32);
    const size = core * 1.14;
    g.globalAlpha = _tyBrightness() * fade * 0.82; g.drawImage(_tyPolish.iris, gaze - size / 2, -size / 2, size, size);
    g.restore();
}

function _drawTyArrayRelief(g, x, y, age, tier, radius) {
    const o = window._fxOpts, fade = age < 1430 ? Math.min(1, age / 180) : Math.max(0, 1 - (age - 1430) / 500), size = radius * 384 / 182;
    g.save(); g.translate(x, y); g.globalAlpha = _tyBrightness() * fade * 0.8;
    if (tier < 2) _drawGlow(g, 'violet', -6, -8, radius * 0.92, fade * 0.14);
    _drawTyVortexBase(g, age, tier, radius, fade * 0.94);
    if (!o || o.sigilBackdrop !== false) {
        g.globalAlpha = _tyBrightness() * fade * 0.43; g.drawImage(_tyPolish.constellation, -size / 2, -size / 2, size, size);
        if (tier < 2 && (!o || o.trails !== false)) {
            const inner = radius * 1.44; g.save(); g.rotate(-age * 0.00016); g.globalAlpha = _tyBrightness() * fade * 0.25;
            g.drawImage(_tyPolish.inner, -inner / 2, -inner / 2, inner, inner); g.restore();
        }
    }
    const core = radius * 0.21;
    if (tier < 2) _drawGlow(g, 'violet', -3, -3, core * 1.7, fade * 0.14);
    _drawTyEye(g, age, tier, core, fade);
    _drawTyVortexPull(g, age, tier, radius, core, fade * 0.5);
    if (age >= 180 && age < 1430 && tier < 2 && (!o || (o.trails !== false && o.particles !== false))) {
        g.strokeStyle = PAL.LILAC; g.globalAlpha = _tyBrightness() * fade * 0.48; g.lineWidth = 0.8; g.beginPath();
        const count = tier === 0 ? 28 : 14, time = (age - 180) * 0.001;
        for (let i = 0; i < count; i++) {
            const p = vortexParticles[i], q = 1 - (p.distRatio + time * p.speed) % 1, a = p.angle + (1 - q) * Math.PI * 2.5;
            const r = radius * 0.9 * Math.exp(-Math.log(1.61803398875) * (1 - q) * 5);
            g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.quadraticCurveTo(Math.cos(a - 0.07) * (r + 3), Math.sin(a - 0.07) * (r + 3), Math.cos(a - 0.12) * (r + 6), Math.sin(a - 0.12) * (r + 6));
        }
        g.stroke();
    }
    if (age >= 1430) {
        const p = Math.min(1, (age - 1430) / 480), r = radius * (0.18 + 0.82 * Math.pow(p, 0.65));
        g.globalAlpha = _tyBrightness() * (1 - p) * 0.6; g.strokeStyle = PAL.VIOLET; g.lineWidth = 1.5;
        g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = PAL.LILAC; g.lineWidth = 0.8; g.beginPath(); g.arc(-1, -1, r, Math.PI, Math.PI * 1.6); g.stroke();
        if (tier === 0 && (!o || o.glow !== false)) _drawGlow(g, 'abyss', 0, -20, radius * 0.7, (1 - p) * 0.4);
    }
    g.restore();
}

  function drawPhapTran(ctx, x, y, elapsedMs, gfx, radius) {
    if (elapsedMs < 0 || elapsedMs > 1950) return;
    if (gfx < 3) { _drawTyArrayRelief(ctx, x, y, elapsedMs, gfx, radius || 170); return; }
    var R = radius || 170;
    var drawProgress = Math.min(1.0, elapsedMs / 180);
    var fadeAlpha = 1.0;
    if (elapsedMs > 1430) {
      fadeAlpha = Math.max(0, 1.0 - (elapsedMs - 1430) / 500);
    }
    var masterAlpha = fadeAlpha * 0.88;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = _tyBrightness() * (masterAlpha);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (gfx <= 2) {
      _drawGlow(ctx, 'abyss', 0, 0, R * 1.08 * drawProgress, 0.55 * masterAlpha);
    }
    _drawTyVortexBase(ctx, elapsedMs, gfx, R, masterAlpha);
    var rotSlow = elapsedMs * 0.00038;
    var maxSweep = Math.PI * 2 * drawProgress;
    var rStar = R;
    ctx.beginPath();
    ctx.arc(0, 0, rStar, -Math.PI * 0.5, -Math.PI * 0.5 + maxSweep);
    ctx.strokeStyle = PAL.VIOLET;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rStar - 8, Math.PI * 0.5, Math.PI * 0.5 - maxSweep, true);
    ctx.strokeStyle = PAL.VIOLET;
    ctx.lineWidth = 1.0;
    ctx.stroke();
    var numStars = Math.floor(28 * drawProgress);
    var ducStarIdx = 7;
    for (var si = 0; si < numStars; si++) {
      var sAng = -Math.PI * 0.5 + (si / 28) * Math.PI * 2 + rotSlow * 0.5;
      var sx = Math.cos(sAng) * (rStar - 4);
      var sy = Math.sin(sAng) * (rStar - 4);
      if (si === ducStarIdx) {
        if (gfx <= 2) {
          _drawGlow(ctx, 'ember', sx, sy, 14, 0.85 * masterAlpha);
        }
        ctx.fillStyle = PAL.EMBER;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 5.5);
        ctx.lineTo(sx + 4, sy);
        ctx.lineTo(sx, sy + 5.5);
        ctx.lineTo(sx - 4, sy);
        ctx.closePath();
        ctx.fill();
      } else if (gfx <= 2 || si % 2 === 0) {
        ctx.fillStyle = (si % 4 === 0) ? PAL.LILAC : PAL.VIOLET;
        ctx.beginPath();
        ctx.arc(sx, sy, (si % 4 === 0) ? 2.1 : 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    var rSealOuter = R * 0.84;
    var rSealInner = R * 0.70;
    ctx.beginPath();
    ctx.arc(0, 0, rSealOuter, 0, maxSweep);
    ctx.strokeStyle = PAL.MAGENTA;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rSealInner, 0, maxSweep);
    ctx.strokeStyle = PAL.VIOLET;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    if (gfx <= 2) {
      var tickCount = Math.floor(36 * drawProgress);
      ctx.beginPath();
      for (var ti = 0; ti < tickCount; ti++) {
        var tAng = (ti / 36) * Math.PI * 2 - rotSlow * 0.8;
        var tickLen = (ti % 3 === 0) ? 6 : 3;
        ctx.moveTo(Math.cos(tAng) * rSealOuter, Math.sin(tAng) * rSealOuter);
        ctx.lineTo(Math.cos(tAng) * (rSealOuter - tickLen), Math.sin(tAng) * (rSealOuter - tickLen));
      }
      ctx.strokeStyle = PAL.GOLD;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
    if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
      var glyphCount = Math.floor(12 * drawProgress);
      var rGlyphMid = (rSealOuter + rSealInner) * 0.5;
      ctx.strokeStyle = PAL.LILAC;
      ctx.lineWidth = 1.25;
      for (var gi = 0; gi < glyphCount; gi++) {
        var gAng = (gi / 12) * Math.PI * 2 - rotSlow;
        ctx.save();
        ctx.rotate(gAng);
        ctx.translate(rGlyphMid, 0);
        ctx.beginPath();
        if (gi % 3 === 0) {
          ctx.moveTo(-4, -6); ctx.lineTo(4, -6);
          ctx.moveTo(0, -6);  ctx.lineTo(0, 6);
          ctx.moveTo(-4, 0);  ctx.lineTo(4, 2);
          ctx.moveTo(-3, 6);  ctx.lineTo(3, 6);
        } else if (gi % 3 === 1) {
          ctx.moveTo(-4, -5); ctx.lineTo(0, -2); ctx.lineTo(4, -5);
          ctx.moveTo(-3, 0);  ctx.lineTo(3, 0);
          ctx.moveTo(0, -2);  ctx.lineTo(-3, 5);
          ctx.moveTo(1, 2);   ctx.lineTo(4, 5);
        } else {
          ctx.rect(-3.5, -5, 7, 4);
          ctx.moveTo(0, -1);  ctx.lineTo(0, 6);
          ctx.moveTo(-4, 3);  ctx.lineTo(4, 3);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    var rOuro = R * 0.52;
    var ouroRot = rotSlow * 1.4;
    ctx.save();
    ctx.rotate(ouroRot);
    var ouroSteps = Math.floor(32 * drawProgress);
    if (ouroSteps > 2) {
      ctx.beginPath();
      for (var oi = 0; oi <= ouroSteps; oi++) {
        var oa = (oi / 32) * (Math.PI * 1.88);
        var waveR = rOuro + Math.sin(oi * 0.9) * 3.5;
        var ox = Math.cos(oa) * waveR;
        var oy = Math.sin(oa) * waveR;
        if (oi === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.strokeStyle = PAL.VOID;
      ctx.lineWidth = 6.5;
      ctx.stroke();
      ctx.strokeStyle = PAL.VIOLET;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      if (gfx <= 2) {
        ctx.beginPath();
        for (var vi = 2; vi < ouroSteps; vi += 3) {
          var va = (vi / 32) * (Math.PI * 1.88);
          ctx.moveTo(Math.cos(va) * (rOuro - 4), Math.sin(va) * (rOuro - 4));
          ctx.lineTo(Math.cos(va + 0.05) * (rOuro + 4), Math.sin(va + 0.05) * (rOuro + 4));
        }
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(rOuro, 0);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-7, 4);
      ctx.lineTo(0, 9);
      ctx.lineTo(7, 4);
      ctx.closePath();
      ctx.fillStyle = PAL.VOID;
      ctx.fill();
      ctx.strokeStyle = PAL.LILAC;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = PAL.EMBER;
      ctx.fillRect(-3.5, 0, 2, 2);
      ctx.fillRect(1.5, 0, 2, 2);
      ctx.restore();
    }
    ctx.restore();
    var rCore = R * 0.21;
    var pullPulse = (elapsedMs >= 180 && elapsedMs < 1430)
      ? (1.0 + 0.18 * Math.sin((elapsedMs - 180) * 0.018))
      : 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, rCore * pullPulse, 0, Math.PI * 2);
    ctx.fillStyle = PAL.VOID;
    ctx.fill();
    ctx.strokeStyle = PAL.MAGENTA;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -rCore * 0.78);
    ctx.quadraticCurveTo(rCore * 0.42, 0, 0, rCore * 0.78);
    ctx.quadraticCurveTo(-rCore * 0.42, 0, 0, -rCore * 0.78);
    ctx.closePath();
    ctx.fillStyle = PAL.ABYSS;
    ctx.fill();
    ctx.strokeStyle = PAL.LILAC;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -rCore * 0.45);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(0, rCore * 0.45);
    ctx.lineTo(-3.5, 0);
    ctx.closePath();
    ctx.fillStyle = PAL.EMBER;
    ctx.fill();
    _drawTyVortexPull(ctx, elapsedMs, gfx, R, rCore, masterAlpha);
    if (elapsedMs >= 180 && elapsedMs < 1430) {
      var riftT = Math.min(1.0, (elapsedMs - 180) / 160);
      var riftLen = R * 0.94 * riftT;
      for (var ri = 0; ri < 2; ri++) {
        ctx.save();
        ctx.rotate(ri === 0 ? Math.PI * 0.25 : -Math.PI * 0.25);
        ctx.beginPath();
        ctx.moveTo(-riftLen, 0);
        ctx.lineTo(-riftLen * 0.6, -5.5);
        ctx.lineTo(-riftLen * 0.2, 4.0);
        ctx.lineTo(0, -6.5);
        ctx.lineTo(riftLen * 0.3, 5.0);
        ctx.lineTo(riftLen * 0.65, -4.5);
        ctx.lineTo(riftLen, 0);
        ctx.lineTo(riftLen * 0.65, 4.5);
        ctx.lineTo(riftLen * 0.3, -2.5);
        ctx.lineTo(0, 6.5);
        ctx.lineTo(-riftLen * 0.2, -3.5);
        ctx.lineTo(-riftLen * 0.6, 5.5);
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 1.9;
        ctx.stroke();
        if (gfx <= 2) {
          ctx.beginPath();
          ctx.moveTo(-riftLen * 0.85, 0);
          ctx.lineTo(0, -2.5);
          ctx.lineTo(riftLen * 0.85, 0);
          ctx.strokeStyle = PAL.LILAC;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
        ctx.restore();
      }
      if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
        var pCount = (gfx === 0) ? MAX_VORTEX_PARTICLES : 14;
        var suckTime = (elapsedMs - 180) * 0.001;
        for (var pi = 0; pi < pCount; pi++) {
          var vp = vortexParticles[pi];
          var curRatio = 1.0 - ((vp.distRatio + suckTime * vp.speed) % 1.0);
          var pDist = curRatio * (R * 0.92);
          var pAng = vp.angle + (1.0 - curRatio) * 3.2 + suckTime * 1.5;
          var px = Math.cos(pAng) * pDist;
          var py = Math.sin(pAng) * pDist;
          var tx = Math.cos(pAng - 0.16) * (pDist + 12);
          var ty = Math.sin(pAng - 0.16) * (pDist + 12);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = (pi % 3 === 0) ? PAL.LILAC : PAL.MAGENTA;
          ctx.lineWidth = vp.size * 0.75;
          ctx.stroke();
        }
      }
    }
    if (elapsedMs >= 1430) {
      _drawTyVortexBurst(ctx, elapsedMs, gfx, R, masterAlpha);
      var expT = Math.min(1.0, (elapsedMs - 1430) / 480);
      var expAlpha = 1.0 - expT;
      if (gfx <= 2) {
        _drawGlow(ctx, 'magenta', 0, 0, R * (0.45 + expT * 0.75), expAlpha * 0.85);
        _drawGlow(ctx, 'lilac', 0, 0, R * 0.35 * (1 - expT * 0.5), expAlpha * 0.9);
      }
      var waveR = R * (0.18 + 0.86 * Math.pow(expT, 0.65));
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.LILAC;
      ctx.lineWidth = 3.2 * (1 - expT * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, waveR * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.MAGENTA;
      ctx.lineWidth = 1.8 * (1 - expT * 0.5);
      ctx.stroke();
      var pillarH = R * 1.15 * Math.sin(expT * Math.PI);
      var pillarW = 36 * (1.0 - expT * 0.65);
      if (pillarH > 4) {
        ctx.beginPath();
        ctx.moveTo(-pillarW, 12);
        ctx.quadraticCurveTo(-pillarW * 0.45, -pillarH * 0.5, 0, -pillarH);
        ctx.quadraticCurveTo(pillarW * 0.45, -pillarH * 0.5, pillarW, 12);
        ctx.quadraticCurveTo(0, 26, -pillarW, 12);
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-pillarW * 0.45, 6);
        ctx.lineTo(0, -pillarH * 0.82);
        ctx.lineTo(pillarW * 0.45, 6);
        ctx.strokeStyle = PAL.LILAC;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawSerpent(ctx, serpent, timeMs, gfx) {
    if (!serpent.active) return;
    _drawTySerpentRelief(ctx, serpent, timeMs, gfx);
  }
  function drawScaleShield(ctx, x, y, timeMs, gfx, shieldObj) {
    if (shieldObj.state === 0) return;
    var isMobile = (viewW < 600 || viewH < 500);
    var rShield = (isMobile ? 48 : 56);
    var elapsed = timeMs - shieldObj.stateTime;
    ctx.save();
    ctx.translate(x, y);
    var numScales = 6;
    var rot = timeMs * 0.0005;
    if (shieldObj.state === 1) {
      for (var i = 0; i < numScales; i++) {
        var sa = rot + (i / numScales) * Math.PI * 2;
        var breath = gfx < 3 && (!window._fxOpts || window._fxOpts.glow !== false) ? 1 + Math.sin(timeMs * 0.0027 - i * 0.8) * 0.045 : 1;
        var sx = Math.cos(sa) * (rShield * 0.74) * breath;
        var sy = Math.sin(sa) * (rShield * 0.74) * breath;
        if (gfx < 3) _drawTyScaleStamp(ctx, sx, sy, rShield * 0.36, sa, PAL.VIOLET, 0.68, 0.38);
        else _drawHexScale(ctx, sx, sy, rShield * 0.36, sa, PAL.VIOLET, 0.55, 0.12);
      }
      ctx.beginPath();
      for (var k = 0; k <= 6; k++) {
        var ka = rot + (k / 6) * Math.PI * 2;
        var kx = Math.cos(ka) * rShield;
        var ky = Math.sin(ka) * rShield;
        if (k === 0) ctx.moveTo(kx, ky);
        else ctx.lineTo(kx, ky);
      }
      ctx.strokeStyle = PAL.VIOLET;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (shieldObj.state === 2) {
      var breakT = Math.min(1.0, elapsed / 580);
      var hitAng = shieldObj.hitAngle;
      var hx = Math.cos(hitAng) * rShield;
      var hy = Math.sin(hitAng) * rShield;
      if (elapsed < 280) {
        var flashA = 1.0 - elapsed / 280;
        if (gfx <= 2) {
          _drawGlow(ctx, 'lilac', hx, hy, 46, flashA * 0.95);
          _drawGlow(ctx, 'magenta', hx, hy, 70, flashA * 0.7);
        }
        ctx.strokeStyle = PAL.LILAC;
        ctx.lineWidth = 2.2 * flashA;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(hitAng - 0.5) * 34, hy - Math.sin(hitAng - 0.5) * 34);
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(hitAng + 0.45) * 38, hy - Math.sin(hitAng + 0.45) * 38);
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(hitAng) * 26, hy - Math.sin(hitAng) * 26);
        ctx.stroke();
      }
      if (gfx < 3 && elapsed < 420 && (!window._fxOpts || window._fxOpts.glow !== false)) {
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(hitAng); const spread = Math.min(1, elapsed / 220);
        ctx.scale(spread, spread); ctx.strokeStyle = PAL.LILAC; ctx.lineWidth = 1.2;
        ctx.globalAlpha = _tyBrightness() * (1 - elapsed / 420) * 0.75; ctx.stroke(_tyShieldCrack); ctx.restore();
      }
      var fade = 1.0 - breakT;
      for (var si = 0; si < numScales; si++) {
        var sAng = rot + (si / numScales) * Math.PI * 2;
        var angDiff = Math.abs(Math.atan2(Math.sin(sAng - hitAng), Math.cos(sAng - hitAng)));
        var push = (angDiff < 0.9) ? (breakT * 36) : (breakT * 18);
        var dist = rShield * 0.74 + push;
        var px = Math.cos(sAng) * dist;
        var py = Math.sin(sAng) * dist + (gfx < 3 && (!window._fxOpts || window._fxOpts.particles !== false) ? breakT * breakT * 32 : 0);
        var col = (angDiff < 0.9) ? PAL.LILAC : PAL.MAGENTA;
        if (gfx < 3) _drawTyScaleStamp(ctx, px, py, rShield * 0.35 * (1 - breakT * 0.35), sAng + breakT * 0.6, col, fade * 0.85, fade * 0.22);
        else _drawHexScale(ctx, px, py, rShield * 0.35 * (1 - breakT * 0.35), sAng + breakT * 0.6, col, fade * 0.85, fade * 0.22);
      }
    } else if (shieldObj.state === 3) {
      var refT = Math.min(1.0, elapsed / 420);
      var ease = 1.0 - Math.pow(1.0 - refT, 3);
      for (var ri = 0; ri < numScales; ri++) {
        if (gfx < 3 && (!window._fxOpts || window._fxOpts.glow !== false)) { var local = Math.max(0, Math.min(1, (elapsed - ri * 35) / 245)); ease = 1 - Math.pow(1 - local, 3); }
        var ra = rot + (ri / numScales) * Math.PI * 2;
        var rDist = (rShield * 1.45) * (1 - ease) + (rShield * 0.74) * ease;
        var rx = Math.cos(ra) * rDist;
        var ry = Math.sin(ra) * rDist;
        if (gfx < 3) _drawTyScaleStamp(ctx, rx, ry, rShield * 0.36 * ease, ra, PAL.LILAC, 0.35 * ease, 0.1 * ease);
        else _drawHexScale(ctx, rx, ry, rShield * 0.36 * ease, ra, PAL.LILAC, 0.35 * ease, 0.1 * ease);
      }
    }
    ctx.restore();
  }
  function _drawHexScale(ctx, cx, cy, rad, rot, strokeCol, strokeAlpha, fillAlpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      var vx = Math.cos(a) * rad;
      var vy = Math.sin(a) * rad * 0.82;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = PAL.ABYSS;
    ctx.globalAlpha = _tyBrightness() * (fillAlpha);
    ctx.fill();
    ctx.strokeStyle = strokeCol;
    ctx.globalAlpha = _tyBrightness() * (strokeAlpha);
    ctx.lineWidth = 1.35;
    ctx.stroke();
    ctx.restore();
  }
  function drawSlowWave(ctx, x, y, elapsedMs, gfx, maxRadius) {
    if (gfx < 3) {
      if (elapsedMs < 0 || elapsedMs > 620) return;
      const p = elapsedMs / 620, r = maxRadius * (1 - Math.pow(1 - p, 2.4)), o = window._fxOpts;
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = _tyBrightness() * (1 - p) * 0.8;
      if (!o || o.trails !== false) { const size = r * 256 / 115; ctx.drawImage(_tyPolish.wave, -size / 2, -size / 2, size, size); }
      else { ctx.strokeStyle = PAL.VIOLET; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore(); return;
    }
    var dur = 620;
    if (elapsedMs < 0 || elapsedMs > dur) return;
    var t = elapsedMs / dur;
    var easeOut = 1.0 - Math.pow(1.0 - t, 2.4);
    var curR = maxRadius * easeOut;
    var alpha = (1.0 - t) * 0.85;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = _tyBrightness() * (alpha);
    ctx.beginPath();
    ctx.arc(0, 0, curR, 0, Math.PI * 2);
    ctx.strokeStyle = PAL.MAGENTA;
    ctx.lineWidth = 2.0 * (1.0 - t * 0.4);
    ctx.stroke();
    if (gfx <= 2) {
      ctx.beginPath();
      ctx.arc(0, 0, curR * 0.91, 0, Math.PI * 2);
      ctx.setLineDash(_dash);
      ctx.strokeStyle = PAL.VIOLET;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash(_emptyDash);
    }
    if (gfx <= 2 && curR > 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
      ctx.save(); ctx.scale(curR / 220, curR / 220);
      ctx.globalAlpha = _tyBrightness() * alpha * 0.55; ctx.strokeStyle = PAL.LILAC; ctx.lineWidth = 220 / curR;
      ctx.stroke(_tySlowSeal); ctx.restore();
    }
    ctx.restore();
  }

_initGlowSprites();
function gfx() { return Math.max(window._gfxLevel || 0, _mobPerf ? 1 : 0); }
function sync() { viewW = canvas.width; viewH = canvas.height; tyClock = window._tyClock; }
function _tyBrightness() { return Math.max(0, Math.min(1, window._fxOpts ? (window._fxOpts.fxBrightness ?? 100) / 100 : 1)); }
function begin() {
    sync(); ctx.save(); ctx.globalAlpha = _tyBrightness() * (1);
}
function finish() {
    ctx.restore();
}
window._tyRingRadius = function () {
    return ((player.width || 40) + 5) * 1.2 + 16;
};
window._tyReserveRingSpace = function () {
    if (!_hasBuff('hac_viem_phe_hon')) return;
    const clear = _tyRingRadius() + 24 - player.height / 2;
    window._greatSageFrameClearance = Math.max(window._greatSageFrameClearance || 0, clear);
};

// Bite heat is visual state driven only by the paused simulation clock.
const _tyBiteHeat = { clock: -1, heat: 0, drive: 0, presence: 0, last: -10000, seen: new Float64Array(14).fill(-1), phases: new Int8Array(4).fill(-1) };
const _tyChaos = { width: 0, height: 0, band: 0, base: _tyMakeStamp(1), lit: _tyMakeStamp(1), smokeA: _tyMakeStamp(1), smokeB: _tyMakeStamp(1), tileA: _tyMakeStamp(64), tileB: _tyMakeStamp(64) };
const _tyChaosCorner = new Image();
let _tyChaosReady = false;
_tyChaosCorner.onload = function () { _tyChaosReady = true; _tyChaos.width = 0; };
_tyChaosCorner.src = 'assets/images/game/sigils/ty-chaos-corner.png';
function _tyResetBiteHeat() {
    _tyBiteHeat.clock = -1; _tyBiteHeat.heat = 0; _tyBiteHeat.drive = 0; _tyBiteHeat.presence = 0; _tyBiteHeat.last = -10000;
    _tyBiteHeat.seen.fill(-1); _tyBiteHeat.phases.fill(-1);
}
function _tyUpdateBiteHeat(now) {
    const h = _tyBiteHeat;
    if (now < h.clock) _tyResetBiteHeat();
    if (now === h.clock) return h.heat;
    const dt = h.clock < 0 ? 0 : now - h.clock; h.clock = now;
    let bites = 0, present = false;
    for (let i = 0; i < 10; i++) {
        const s = _tySerpents[i];
        if (s.active && s.state !== 3) present = true;
        if (s.active && s.biteFlashUntil > now && h.seen[i] !== s.biteFlashUntil) { h.seen[i] = s.biteFlashUntil; bites++; }
    }
    for (let i = 0; i < 4; i++) {
        const d = _tyDevours[i], age = now - d.start, phase = Math.floor(age / 120);
        if (!d.active || age < 0 || age >= 480) continue;
        if (h.seen[i + 10] !== d.start || h.phases[i] !== phase) { h.seen[i + 10] = d.start; h.phases[i] = phase; bites++; }
    }
    h.presence += ((present ? 1 : 0) - h.presence) * (1 - Math.exp(-dt / (present ? 110 : 180)));
    if (!present && h.presence < 0.002) h.presence = 0;
    const age = Math.max(0, now - h.last), decay = Math.max(0, 1 - age / 800);
    if (bites) { h.drive = Math.min(1, h.drive * decay + bites * 0.28); h.last = now; }
    const target = h.drive * Math.pow(Math.max(0, 1 - (now - h.last) / 800), 2);
    h.heat += (target - h.heat) * (1 - Math.exp(-dt / (target > h.heat ? 65 : 110)));
    if (now - h.last >= 850) { h.heat = 0; h.drive = 0; }
    return h.heat;
}
function _tyBakeChaosTile(c, phase) {
    const g = c.getContext('2d');
    for (let i = 0; i < 12; i++) {
        const x = (i * 23 + phase * 13) % 64, y = (i * 37 + phase * 7) % 64, r = 10 + i % 3 * 5;
        const fog = g.createRadialGradient(x - 2, y - 3, 1, x, y, r);
        fog.addColorStop(0, i % 3 === 0 ? PAL.VIOLET + '28' : PAL.VOID + 'D0'); fog.addColorStop(0.5, PAL.ABYSS + '65'); fog.addColorStop(1, PAL.VOID + '00');
        g.fillStyle = fog;
        for (let xx = -64; xx <= 64; xx += 64) for (let yy = -64; yy <= 64; yy += 64) { g.save(); g.translate(xx, yy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
    }
}
_tyBakeChaosTile(_tyChaos.tileA, 0); _tyBakeChaosTile(_tyChaos.tileB, 1);
function _tyBakeChaos() {
    const c = _tyChaos, mobile = viewW < 600 || viewH < 500;
    c.width = viewW; c.height = viewH; c.band = Math.min(viewW, viewH) * (mobile ? 0.055 : 0.07);
    const scale = Math.min(1 / 3, 432 / viewW, 272 / viewH), w = Math.max(1, Math.ceil(viewW * scale)), h = Math.max(1, Math.ceil(viewH * scale));
    const band = c.band * scale;
    c.base.width = c.lit.width = c.smokeA.width = c.smokeB.width = w;
    c.base.height = c.lit.height = c.smokeA.height = c.smokeB.height = h;
    let g = c.base.getContext('2d');
    const ground = g.createLinearGradient(0, 0, 0, band);
    ground.addColorStop(0, PAL.VOID); ground.addColorStop(0.7, PAL.VOID + 'D0'); ground.addColorStop(1, PAL.VOID + '00');
    for (let side = 0; side < 4; side++) {
        g.save();
        if (side === 1) { g.translate(w, 0); g.rotate(Math.PI / 2); }
        else if (side === 2) { g.translate(w, h); g.rotate(Math.PI); }
        else if (side === 3) { g.translate(0, h); g.rotate(-Math.PI / 2); }
        g.fillStyle = ground; g.fillRect(0, 0, side % 2 ? h : w, band); g.restore();
    }
    g.fillStyle = PAL.VOID; g.strokeStyle = PAL.GOLD; g.lineWidth = 1.05;
    g.beginPath(); g.rect(1.8, 1.8, w - 3.6, h - 3.6); g.rect(band * 0.52, band * 0.52, w - band * 1.04, h - band * 1.04); g.stroke();
    g.strokeStyle = PAL.LILAC; g.globalAlpha = 0.5; g.lineWidth = 0.45; g.beginPath();
    g.moveTo(2.6, h - 3); g.lineTo(2.6, 2.6); g.lineTo(w - 3, 2.6); g.stroke(); g.globalAlpha = 1;
    for (let corner = 0; corner < 4; corner++) {
        g.save(); g.translate(corner % 2 ? w : 0, corner > 1 ? h : 0); g.scale(corner % 2 ? -1 : 1, corner > 1 ? -1 : 1);
        g.fillStyle = PAL.VIOLET + '70'; g.strokeStyle = PAL.GOLD; g.lineWidth = 0.8;
        for (let i = 0; i < (mobile ? 2 : 4); i++) {
            const x = band * (0.3 + i * 0.55), y = band * (0.28 + i * 0.1), len = band * (0.7 - i * 0.08);
            _tyLeaf(g, x, y, len, -0.15); _tyLeaf(g, y, x, len, Math.PI / 2 + 0.15);
        }
        g.beginPath(); g.moveTo(band * 0.3, band * 0.3); g.bezierCurveTo(band * 1.4, band * 0.1, band * 1.4, band * 0.95, band * 0.65, band * 0.65); g.stroke();
        if (_tyChaosReady) {
            const size = band * (mobile ? 3.3 : 4);
            g.globalAlpha = 1; g.drawImage(_tyChaosCorner, 0, 0, size, size);
        }
        g.restore();
    }
    // Small gaps expose the smoke beneath the gilding.
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = PAL.VOID;
    g.beginPath(); g.ellipse(w * 0.32, band * 0.36, band * 1.15, band * 0.4, -0.3, 0, Math.PI * 2);
    g.ellipse(w - band * 0.32, h * 0.63, band * 0.4, band, 0.2, 0, Math.PI * 2); g.ellipse(w * 0.68, h - band * 0.3, band * 0.8, band * 0.35, 0.3, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over';
    const inset = Math.max(0, band - 1);
    g.clearRect(inset, inset, Math.max(0, w - inset * 2), Math.max(0, h - inset * 2));
    g = c.lit.getContext('2d'); g.drawImage(c.base, 0, 0); g.save();
    for (let side = 0; side < 4; side++) {
        g.save();
        if (side === 1) { g.translate(w, 0); g.rotate(Math.PI / 2); }
        else if (side === 2) { g.translate(w, h); g.rotate(Math.PI); }
        else if (side === 3) { g.translate(0, h); g.rotate(-Math.PI / 2); }
        const length = side % 2 ? h : w, candle = g.createLinearGradient(0, 0, 0, band);
        candle.addColorStop(0, PAL.LILAC + '45'); candle.addColorStop(0.25, PAL.MAGENTA + '28'); candle.addColorStop(1, PAL.VIOLET + '00');
        g.fillStyle = candle; g.fillRect(0, 0, length, band); g.restore();
    }
    g.restore(); g.clearRect(inset, inset, Math.max(0, w - inset * 2), Math.max(0, h - inset * 2));
    for (let layer = 0; layer < 2; layer++) {
        g = (layer ? c.smokeB : c.smokeA).getContext('2d');
        const smokeBand = band * 0.72;
        const pattern = g.createPattern(layer ? c.tileB : c.tileA, 'repeat'); g.fillStyle = pattern;
        g.fillRect(0, 0, w, smokeBand); g.fillRect(0, h - smokeBand, w, smokeBand); g.fillRect(0, smokeBand, smokeBand, h - smokeBand * 2); g.fillRect(w - smokeBand, smokeBand, smokeBand, h - smokeBand * 2);
        g.globalCompositeOperation = 'destination-out';
        // Each smoke skin fades continuously toward the empty canvas interior.
        for (let side = 0; side < 4; side++) {
            g.save();
            if (side === 1) { g.translate(w, 0); g.rotate(Math.PI / 2); }
            else if (side === 2) { g.translate(w, h); g.rotate(Math.PI); }
            else if (side === 3) { g.translate(0, h); g.rotate(-Math.PI / 2); }
            const length = side % 2 ? h : w, fade = g.createLinearGradient(0, 0, 0, smokeBand);
            fade.addColorStop(0, PAL.VOID + '00'); fade.addColorStop(0.55, PAL.VOID + '35'); fade.addColorStop(1, PAL.VOID);
            g.fillStyle = fade; g.fillRect(0, 0, length, smokeBand); g.restore();
        }
        g.globalCompositeOperation = 'source-over';
    }
}
function _drawTyChaosFrame(g, now, tier) {
    const heat = _tyUpdateBiteHeat(now), o = window._fxOpts, c = _tyChaos;
    if (tier >= 3 || (heat < 0.002 && _tyBiteHeat.presence < 0.002) || _tyBrightness() <= 0 || (o && o.sigilBackdrop === false)) return;
    if (c.width !== viewW || c.height !== viewH) _tyBakeChaos();
    const band = c.band, strength = Math.max(Math.min(1, heat * 1.65), _tyBiteHeat.presence * 0.94), light = heat > 0.015 && tier === 0 && (!o || (o.sigilLight !== false && o.screenFlash !== false && o.glow !== false)) && (!o || (o.flashIntensity ?? 100) > 0);
    const intensity = o ? Math.max(0, Math.min(1, (o.flashIntensity ?? 100) / 100)) : 1;
    const pulse = light ? (0.94 + Math.sin(now * Math.PI * 2 / 1600) * 0.06) * intensity : 1;
    // Transparent baked interiors keep the arena clear without a per frame clip mask.
    g.save();
    if (tier === 0 && (!o || o.trails !== false)) g.translate(Math.sin(now * 0.006) * heat * 0.2, Math.cos(now * 0.005) * heat * 0.15);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = _tyBrightness() * strength * 0.78 * (light ? pulse : 1);
    g.drawImage(light ? c.lit : c.base, 0, 0, viewW, viewH);
    if (heat > 0.015 && tier < 2 && (!o || o.particles !== false)) {
        const drift = tier === 0 && (!o || o.trails !== false), shift = drift ? Math.sin(now * 0.00021) * band * 0.14 : 0;
        g.globalAlpha = _tyBrightness() * strength * 0.07;
        g.drawImage(c.smokeA, shift, drift ? Math.cos(now * 0.00017) * band * 0.1 : 0, viewW, viewH);
        if (tier === 0 && (!o || o.trails !== false)) {
            g.globalAlpha = _tyBrightness() * strength * 0.05;
            g.drawImage(c.smokeB, -Math.sin(now * 0.00013) * band * 0.16, -Math.cos(now * 0.00011) * band * 0.08, viewW, viewH);
        }
    }
    g.restore();
}

window._drawTyGround = function () {
    if (!_hasSigil('ty')) { _tyResetBiteHeat(); return; }
    begin(); const g = gfx(), now = window._tyClock, o = window._fxOpts;
    _drawTyChaosFrame(_fxContext, now, g);
    _drawTyScorch(_fxContext, now, g);
    if (_tyArray.active) {
        const age = now - _tyArray.start;
        if ((!o || o.sigilBackdrop !== false) && g < 3) {
            _fxContext.save(); _fxContext.globalAlpha = _tyBrightness() * (Math.min(1, age / 180) * Math.min(1, (1950 - age) / 500) * (_tyVortexLoaded() ? 0.25 : 0.42));
            _fxContext.fillStyle = PAL.VOID; _fxContext.beginPath(); _fxContext.arc(_tyArray.x, _tyArray.y, TY_ARRAY_RADIUS - 5, 0, Math.PI * 2); _fxContext.fill(); _fxContext.restore();
        }
        drawPhapTran(_fxContext, _tyArray.x, _tyArray.y, age, g, TY_ARRAY_RADIUS);
        _drawTyArrayPolish(_fxContext, _tyArray.x, _tyArray.y, age, g, TY_ARRAY_RADIUS);
        if (g < 3 && age >= 1230 && age < 1430 && (!o || o.sigilLight !== false)) {
            _fxContext.save(); _fxContext.globalAlpha = _tyBrightness() * Math.pow((age - 1230) / 200, 2) * 0.14;
            _fxContext.fillStyle = PAL.VOID; _fxContext.fillRect(0, 0, viewW, viewH); _fxContext.restore();
        }
        if (age >= 180 && age < 1430) {
            const reveal = Math.min(1, (age - 180) / 160), r = TY_ARRAY_RADIUS * 0.65 * reveal;
            _fxContext.save(); _fxContext.translate(_tyArray.x, _tyArray.y); _fxContext.globalAlpha = _tyBrightness() * (g < 3 ? 0.18 : 0.8);
            _fxContext.strokeStyle = PAL.VOID; _fxContext.lineWidth = 5;
            _fxContext.beginPath(); _fxContext.moveTo(-r, -r); _fxContext.lineTo(r, r); _fxContext.moveTo(-r, r); _fxContext.lineTo(r, -r); _fxContext.stroke();
            _fxContext.strokeStyle = g < 3 ? PAL.VIOLET : PAL.LILAC; _fxContext.lineWidth = g < 3 ? 0.8 : 1.6;
            _fxContext.stroke();
            _fxContext.fillStyle = PAL.EMBER; _fxContext.beginPath(); _fxContext.arc(0, 0, g < 3 ? 0.8 : 3.5, 0, Math.PI * 2); _fxContext.fill(); _fxContext.restore();
        }
        if (age >= 1430 && age < 1800) {
            const p = (age - 1430) / 370, r = TY_ARRAY_RADIUS * (0.3 + p * 0.9);
            _fxContext.save(); _fxContext.translate(_tyArray.x, _tyArray.y);
            _fxContext.globalAlpha = _tyBrightness() * ((1 - p) * 0.7); _fxContext.strokeStyle = PAL.MAGENTA; _fxContext.lineWidth = 1.5;
            _fxContext.beginPath(); _fxContext.arc(0, 0, r, 0, Math.PI * 2); _fxContext.stroke();
            if (g < 2 && (!o || o.particles !== false)) for (let i = 0; i < 16; i++) {
                const a = i * Math.PI / 8 + p * 0.25, x = Math.cos(a) * r, y = Math.sin(a) * r;
                _fxContext.beginPath(); _fxContext.moveTo(x, y); _fxContext.lineTo(Math.cos(a - 0.025) * (r + 12 * (1 - p)), Math.sin(a - 0.025) * (r + 12 * (1 - p))); _fxContext.lineTo(Math.cos(a + 0.025) * (r + 12 * (1 - p)), Math.sin(a + 0.025) * (r + 12 * (1 - p))); _fxContext.closePath(); _fxContext.fillStyle = i % 4 ? PAL.VIOLET : PAL.LILAC; _fxContext.fill();
            }
            _fxContext.restore();
        }
        if (age >= 1430 && age < 1830) {
            const fade = 1 - (age - 1430) / 400; _fxContext.save();
            if ((!o || o.sigilLight !== false) && g < 3) {
                _fxContext.globalAlpha = _tyBrightness() * fade * 0.04; _fxContext.fillStyle = PAL.VIOLET;
                _fxContext.fillRect(0, 0, viewW, viewH);
            }
            if (!o || o.screenFlash !== false) {
                _fxContext.globalAlpha = _tyBrightness() * fade * fade * 0.1 * (o ? (o.flashIntensity ?? 100) / 100 : 1); _fxContext.fillStyle = PAL.LILAC;
                _fxContext.fillRect(0, 0, viewW, viewH);
            }
            _fxContext.restore();
        }
    }
    drawSlowWave(_fxContext, _tyWave.x, _tyWave.y, now - _tyWave.start, g, 220);
    finish();
};
window._drawTyVenomOnBoss = function (enemy) {
    if (!_hasSigil('ty') || !(enemy._tyVenomStacks > 0)) return;
    begin(); _drawTyVenom(_fxContext, window._tyClock, gfx(), enemy); finish();
};
window._drawTyActors = function () {
    if (!_hasSigil('ty')) return;
    begin(); const g = gfx(), now = window._tyClock;
    for (let i = 0; i < 4; i++) {
        const d = _tyDevours[i];
        if (d.active) drawDetonation(_fxContext, d.x, d.y, now - d.start, g, null);
    }
    drawDetonation(_fxContext, 0, 0, 1000, g, _tyShards);
    _drawTyWake(_fxContext, now, g);
    _drawTyBirthAperture(_fxContext, now, g);
    let absorbPower = 0;
    for (let i = 0; i < _tySerpents.length; i++) {
        const s = _tySerpents[i];
        const absorbing = s.active && s.state === 3 && s.absorbAt >= 0;
        const emerging = s.active && now - s.spawnTime < 260 && g < 3 && (!window._fxOpts || window._fxOpts.trails !== false);
        if (emerging) {
            const birth = Math.max(0, now - s.spawnTime);
            _fxContext.save(); _fxContext.beginPath(); _fxContext.ellipse(_tyArray.x, _tyArray.y, 10 + birth * 0.75, 10 + birth * 0.55, 0, 0, Math.PI * 2); _fxContext.clip();
        }
        if (absorbing) {
            const shrink = Math.max(0, 1 - (now - s.absorbAt) / 160);
            absorbPower = Math.max(absorbPower, 1 - shrink);
            _fxContext.save(); _fxContext.translate(s.x, s.y);
            if (g < 3 && (!window._fxOpts || window._fxOpts.trails !== false)) _fxContext.rotate((1 - shrink) * Math.PI * 1.5);
            _fxContext.scale(shrink, shrink); _fxContext.translate(-s.x, -s.y);
        }
        if (s.active && g < 2 && (!window._fxOpts || window._fxOpts.trails !== false)) {
            _fxContext.save(); _fxContext.globalCompositeOperation = 'source-over';
            _fxContext.globalAlpha = _tyBrightness() * (s.state === 2 ? 0.28 : 0.18); _fxContext.strokeStyle = PAL.VIOLET; _fxContext.lineWidth = s.state === 2 ? 3 : 2;
            _fxContext.beginPath(); _fxContext.moveTo(s.segX[2], s.segY[2]);
            for (let j = 3; j < 10; j++) _fxContext.lineTo(s.segX[j], s.segY[j]);
            _fxContext.stroke(); _fxContext.restore();
        }
        if (s.active && s.chain > 0 && s.target && g < 3 && now - s.hopAt < TY_SERPENT_FRENZY_GAP && (!window._fxOpts || window._fxOpts.trails !== false)) {
            const hp = (now - s.hopAt) / TY_SERPENT_FRENZY_GAP;
            _fxContext.save(); _fxContext.globalCompositeOperation = 'source-over'; _fxContext.lineCap = 'round';
            _fxContext.globalAlpha = _tyBrightness() * (1 - hp) * 0.85; _fxContext.strokeStyle = PAL.LILAC; _fxContext.lineWidth = 3;
            _fxContext.beginPath(); _fxContext.moveTo(s.hopX0, s.hopY0); _fxContext.quadraticCurveTo((s.hopX0 + s.x) / 2 - Math.sin(s.angle) * 5, (s.hopY0 + s.y) / 2 + Math.cos(s.angle) * 5, s.x, s.y); _fxContext.stroke(); _fxContext.restore();
        }
        drawSerpent(_fxContext, s, now, g);
        if (s.active && now < s.biteFlashUntil && g >= 3) {
            _fxContext.save(); _fxContext.translate(s.x, s.y); _fxContext.rotate(s.angle);
            _fxContext.strokeStyle = PAL.EMBER; _fxContext.lineWidth = 2.5;
            _fxContext.beginPath(); _fxContext.moveTo(9, -6); _fxContext.lineTo(17, 0); _fxContext.lineTo(9, 6); _fxContext.stroke(); _fxContext.restore();
        }
        if (absorbing) _fxContext.restore();
        if (emerging) _fxContext.restore();
    }
    if (absorbPower > 0 && g < 3 && (!window._fxOpts || window._fxOpts.glow !== false)) {
        _fxContext.save(); _fxContext.translate(player.x, player.y); _fxContext.rotate(now * 0.02);
        _fxContext.globalAlpha = _tyBrightness() * Math.sin(absorbPower * Math.PI) * 0.45;
        _fxContext.strokeStyle = PAL.LILAC; _fxContext.lineWidth = 1.1;
        _fxContext.drawImage(_tySnakePolish.fissure, -24, -24, 48, 48); _fxContext.restore();
    }
    for (let i = 0; i < 32; i++) {
        const f = _tyImpacts[i]; if (!f.active) continue;
        const p = Math.max(0, Math.min(1, (now - f.at) / 420)), r = (f.kind === 1 ? 18 : 12) + p * 15;
        if (_drawTyImpactStamp(_fxContext, f, p, g)) continue;
        _fxContext.save(); _fxContext.translate(f.x, f.y); _fxContext.rotate(f.angle);
        _fxContext.globalAlpha = _tyBrightness() * (1 - p); _fxContext.lineWidth = 1.6;
        if (g >= 3) { _fxContext.fillStyle = '#694094'; _fxContext.beginPath(); _fxContext.arc(0, 0, r * 0.7, 0, Math.PI * 2); _fxContext.fill(); }
        _fxContext.strokeStyle = f.kind === 2 ? PAL.EMBER : PAL.LILAC;
        if (f.kind === 2) {
            _fxContext.beginPath(); _fxContext.arc(0, 0, r + p * 15, 0, Math.PI * 2); _fxContext.stroke();
        } else {
            _fxContext.beginPath();
            for (let side = -1; side <= 1; side += 2) {
                _fxContext.moveTo(-r, side * r * 0.45); _fxContext.lineTo(r * 0.25, side * r * 0.16); _fxContext.lineTo(-r * 0.15, side * r * 0.62);
            }
            _fxContext.stroke();
            _fxContext.strokeStyle = PAL.EMBER; _fxContext.lineWidth = 1.1;
            _fxContext.beginPath(); _fxContext.arc(0, 0, r * (0.7 + p), 0.3, Math.PI * 1.7); _fxContext.stroke();
            if (g < 2 && (!window._fxOpts || window._fxOpts.particles !== false)) for (let k = 0; k < 6; k++) {
                const a = k * Math.PI / 3, d = 9 + p * 35;
                _fxContext.fillStyle = k % 2 ? PAL.MAGENTA : PAL.LILAC;
                _fxContext.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2 * (1 - p), 2 * (1 - p));
            }
        }
        if (g < 2) _drawGlow(_fxContext, f.kind === 2 ? 'ember' : 'lilac', 0, 0, r * 1.6, (1 - p) * 0.28);
        _fxContext.restore();
    }
    if (now < window._tySpeedEnd && g < 3 && (!window._fxOpts || window._fxOpts.trails !== false)) {
        _fxContext.save(); _fxContext.globalAlpha = _tyBrightness() * ((window._tySpeedEnd - now) / 1000 * 0.6);
        _fxContext.strokeStyle = PAL.MAGENTA; _fxContext.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const x = player.x + (i - 1.5) * 18, y = player.y + 25 + (now * 0.12 + i * 13) % 40;
            _fxContext.beginPath(); _fxContext.moveTo(x, y); _fxContext.quadraticCurveTo(x - 3, y + 9, x + 1, y + 18); _fxContext.stroke();
        }
        _fxContext.restore();
    }
    if (_hasBuff('hac_viem_phe_hon') && window._tyCharge > 0.01) drawHacViemRing(_fxContext, player.x, player.y, now, g, window._tyCharge / 10000, _tyRingRadius());
    if (window._tyFangStacks > 0) {
        _fxContext.fillStyle = PAL.LILAC; _fxContext.font = 'bold 11px Georgia, serif'; _fxContext.textAlign = 'center';
        _fxContext.fillText('+' + window._tyFangStacks.toFixed(0) + '%', player.x, player.y - _tyRingRadius() - 9);
    }
    _drawTyVenom(_fxContext, now, g);
    drawScaleShield(_fxContext, _tyShield.state === 2 ? _tyShield.x : player.x, _tyShield.state === 2 ? _tyShield.y : player.y, now, g, _tyShield);
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i]; if (!(e._tyLiftMs > 0)) continue;
        const r = (e.size || 30) / 2;
        _fxContext.strokeStyle = PAL.VIOLET; _fxContext.lineWidth = 0.85;
        _fxContext.beginPath(); _fxContext.ellipse(e.x, e.y + r + 7, r + 6, 5, 0, 0, Math.PI * 2); _fxContext.stroke();
        _fxContext.beginPath(); _fxContext.moveTo(e.x - r, e.y + r); _fxContext.lineTo(e.x - r, e.y - 5); _fxContext.moveTo(e.x + r, e.y + r); _fxContext.lineTo(e.x + r, e.y - 5); _fxContext.stroke();
    }
    finish();
};
})();
