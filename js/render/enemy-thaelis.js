// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/render/enemy-thaelis.js: Thaelis visuals and effects inspired by Homer's Odyssey.
// Pure Canvas2D rendering for the abnormal enemy Thaelis, Penelope's Shroud,
// Reincarnation Cocoon, Guard pylons, and Ulysses' Return wave attacks.
// The war gear (armour plates, red axe, cast cracks, bá khí phantom, Tenacity's đấu khí, Iron Body plates)
// lives in enemy-thaelis-warrior.js, which must load before the first frame is drawn.

// Static bitmap cache for Thaelis counter rotating polygons, core, wreath, and axe heads.
// Every static element bakes once as a global bitmap and scales down cleanly at blit time.
let _thaelisOuterPolySprite = null;
let _thaelisInnerPolySprite = null;
let _thaelisCoreSprite = null;
let _thaelisWreathSprite = null;
let _thaelisWreathRebornSprite = null;
let _thaelisAxeSprite = null;
let _thaelisWaveArt = null;

const _THAELIS_REF_R = 150;
const _THAELIS_TYPICAL_R = 62.5;
const _THAELIS_OVERSAMPLE = _THAELIS_REF_R / _THAELIS_TYPICAL_R;

// Pre baked deterministic kintsugi crack paths across the body.
// Scaled by radius r at runtime without dynamic allocations or random jitter.
const _THAELIS_CRACK_DATA = [
    [[0.06, 0.04], [0.22, 0.16], [0.44, 0.24], [0.66, 0.40], [0.84, 0.46]],
    [[-0.05, 0.06], [-0.24, 0.20], [-0.46, 0.32], [-0.67, 0.44], [-0.85, 0.40]],
    [[0.04, -0.06], [0.17, -0.26], [0.36, -0.42], [0.54, -0.60], [0.72, -0.72]],
    [[-0.06, -0.04], [-0.26, -0.20], [-0.46, -0.36], [-0.62, -0.56], [-0.76, -0.66]],
    [[0.08, 0.00], [0.30, 0.03], [0.50, -0.07], [0.72, -0.03], [0.88, 0.02]],
    [[-0.08, 0.02], [-0.28, 0.02], [-0.48, 0.13], [-0.70, 0.17], [-0.86, 0.20]],
    [[0.02, 0.08], [0.07, 0.30], [0.02, 0.52], [0.13, 0.72], [0.17, 0.86]],
    [[-0.02, -0.08], [-0.05, -0.32], [-0.13, -0.52], [-0.09, -0.72], [-0.13, -0.87]]
];

// static threads, olive leaves, engravings and meander tiles are baked once and reused every frame
function _bakeHopliteShield(c, radius) {
    const sides = 8;
    const grad = c.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
    grad.addColorStop(0, '#FFE066');
    grad.addColorStop(0.55, '#FFD700');
    grad.addColorStop(0.85, '#FFA500');
    grad.addColorStop(1, '#9E580C');
    c.fillStyle = grad;
    c.strokeStyle = '#FFD700';
    c.lineWidth = 2.5 * _THAELIS_OVERSAMPLE;
    c.globalAlpha = 0.88;

    c.beginPath();
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const px = radius * Math.cos(a), py = radius * Math.sin(a);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    c.stroke();

    // Concentric engraved rings chiseled into hoplite shield face
    const rings = [0.86, 0.72, 0.58, 0.44];
    for (let k = 0; k < rings.length; k++) {
        const rr = radius * rings[k];
        c.strokeStyle = 'rgba(120, 58, 6, 0.45)';
        c.lineWidth = 2.2 * _THAELIS_OVERSAMPLE;
        c.beginPath();
        c.arc(0, 0, rr, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = 'rgba(255, 245, 185, 0.40)';
        c.lineWidth = 1.0 * _THAELIS_OVERSAMPLE;
        c.beginPath();
        c.arc(0, 0, rr - 1.2 * _THAELIS_OVERSAMPLE, 0, Math.PI * 2);
        c.stroke();
    }

    // Greek meander border along the 8 outer edges
    c.strokeStyle = 'rgba(135, 70, 8, 0.65)';
    c.lineWidth = 1.3 * _THAELIS_OVERSAMPLE;
    c.lineJoin = 'miter';
    for (let i = 0; i < sides; i++) {
        const a1 = (i / sides) * Math.PI * 2;
        const a2 = ((i + 1) / sides) * Math.PI * 2;
        const p1x = radius * 0.88 * Math.cos(a1), p1y = radius * 0.88 * Math.sin(a1);
        const p2x = radius * 0.88 * Math.cos(a2), p2y = radius * 0.88 * Math.sin(a2);
        const dx = p2x - p1x, dy = p2y - p1y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        const meanders = 4;
        const step = len / meanders;
        const stepH = 5 * _THAELIS_OVERSAMPLE;
        c.beginPath();
        for (let m = 0; m < meanders; m++) {
            const bx = p1x + ux * (m * step), by = p1y + uy * (m * step);
            c.moveTo(bx, by);
            c.lineTo(bx + ux * (step * 0.35), by + uy * (step * 0.35));
            c.lineTo(bx + ux * (step * 0.35) + nx * stepH, by + uy * (step * 0.35) + ny * stepH);
            c.lineTo(bx + ux * (step * 0.70) + nx * stepH, by + uy * (step * 0.70) + ny * stepH);
            c.lineTo(bx + ux * (step * 0.70) + nx * (stepH * 0.35), by + uy * (step * 0.70) + ny * (stepH * 0.35));
            c.lineTo(bx + ux * (step * 0.50) + nx * (stepH * 0.35), by + uy * (step * 0.50) + ny * (stepH * 0.35));
            c.moveTo(bx + ux * (step * 0.70), by + uy * (step * 0.70));
            c.lineTo(bx + ux * step, by + uy * step);
        }
        c.stroke();
    }

    // Bronze rivets at the 8 vertices
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const rx = radius * 0.92 * Math.cos(a), ry = radius * 0.92 * Math.sin(a);
        const rivetR = 4.2 * _THAELIS_OVERSAMPLE;
        c.fillStyle = 'rgba(65, 30, 5, 0.9)';
        c.beginPath();
        c.arc(rx, ry + 1.2 * _THAELIS_OVERSAMPLE, rivetR, 0, Math.PI * 2);
        c.fill();
        const rg = c.createRadialGradient(rx - rivetR * 0.3, ry - rivetR * 0.3, 0, rx, ry, rivetR);
        rg.addColorStop(0, '#FFE899');
        rg.addColorStop(0.35, '#C87D28');
        rg.addColorStop(0.85, '#78380A');
        rg.addColorStop(1, '#442004');
        c.fillStyle = rg;
        c.beginPath();
        c.arc(rx, ry, rivetR, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#FFFFFF';
        c.beginPath();
        c.arc(rx - rivetR * 0.35, ry - rivetR * 0.35, rivetR * 0.3, 0, Math.PI * 2);
        c.fill();
    }
}

function _bakeVitruvianInnerPoly(c, radius) {
    const sides = 8;
    const grad = c.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
    grad.addColorStop(0, '#FFA500');
    grad.addColorStop(0.65, '#FFD700');
    grad.addColorStop(1, '#FF8C00');
    c.fillStyle = grad;
    c.strokeStyle = '#FFA500';
    c.lineWidth = 1.8 * _THAELIS_OVERSAMPLE;
    c.globalAlpha = 0.58;

    c.beginPath();
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const px = radius * Math.cos(a), py = radius * Math.sin(a);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.stroke();

    // Vitruvian wave scroll pattern along inner band
    c.strokeStyle = 'rgba(185, 95, 10, 0.48)';
    c.lineWidth = 1.5 * _THAELIS_OVERSAMPLE;
    c.lineCap = 'round';
    const waves = 12;
    const waveR = radius * 0.72;
    for (let w = 0; w < waves; w++) {
        const a0 = (w / waves) * Math.PI * 2;
        const a1 = ((w + 1) / waves) * Math.PI * 2;
        const sx = waveR * Math.cos(a0), sy = waveR * Math.sin(a0);
        const ex = waveR * Math.cos(a1), ey = waveR * Math.sin(a1);
        const c1x = (waveR + 10 * _THAELIS_OVERSAMPLE) * Math.cos(a0 + 0.08);
        const c1y = (waveR + 10 * _THAELIS_OVERSAMPLE) * Math.sin(a0 + 0.08);
        const c2x = (waveR - 8 * _THAELIS_OVERSAMPLE) * Math.cos(a1 - 0.06);
        const c2y = (waveR - 8 * _THAELIS_OVERSAMPLE) * Math.sin(a1 - 0.06);
        c.beginPath();
        c.moveTo(sx, sy);
        c.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        const curlX = ex - 4 * _THAELIS_OVERSAMPLE * Math.cos(a1);
        const curlY = ey - 4 * _THAELIS_OVERSAMPLE * Math.sin(a1);
        c.lineTo(curlX, curlY);
        c.stroke();
    }

    c.strokeStyle = 'rgba(255, 235, 150, 0.35)';
    c.lineWidth = 1.2 * _THAELIS_OVERSAMPLE;
    c.beginPath();
    c.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    c.stroke();
}

function _bakeAthenaEyeCore(c, radius) {
    c.shadowColor = '#FFD700';
    c.shadowBlur = 14 * _THAELIS_OVERSAMPLE;
    const rimGrad = c.createRadialGradient(0, 0, radius * 0.85, 0, 0, radius);
    rimGrad.addColorStop(0, '#FFD700');
    rimGrad.addColorStop(0.7, '#FFA500');
    rimGrad.addColorStop(1, '#8A4208');
    c.fillStyle = rimGrad;
    c.beginPath();
    c.arc(0, 0, radius, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    // Iris ring: warm amber with subtle wine accent
    const irisR = radius * 0.85;
    const irisGrad = c.createRadialGradient(0, 0, radius * 0.32, 0, 0, irisR);
    irisGrad.addColorStop(0, '#2A0826');
    irisGrad.addColorStop(0.35, '#822830');
    irisGrad.addColorStop(0.75, '#D69E1C');
    irisGrad.addColorStop(1, '#FFE066');
    c.fillStyle = irisGrad;
    c.beginPath();
    c.arc(0, 0, irisR, 0, Math.PI * 2);
    c.fill();

    // Iris radiating ray striations
    const rayCount = 28;
    c.lineWidth = 0.8 * _THAELIS_OVERSAMPLE;
    for (let r = 0; r < rayCount; r++) {
        const ra = (r / rayCount) * Math.PI * 2;
        const rInner = radius * 0.34;
        const rOuter = radius * (0.75 + (r % 3 === 0 ? 0.08 : 0));
        c.strokeStyle = (r % 2 === 0) ? 'rgba(255, 240, 180, 0.45)' : 'rgba(85, 14, 38, 0.55)';
        c.beginPath();
        c.moveTo(Math.cos(ra) * rInner, Math.sin(ra) * rInner);
        c.lineTo(Math.cos(ra) * rOuter, Math.sin(ra) * rOuter);
        c.stroke();
    }

    // Specular glints in the iris
    for (let g = 0; g < 4; g++) {
        const ga = (g / 4) * Math.PI * 2 + 0.4;
        c.fillStyle = 'rgba(255, 255, 255, 0.75)';
        c.beginPath();
        c.arc(Math.cos(ga) * (radius * 0.56), Math.sin(ga) * (radius * 0.56), 1.2 * _THAELIS_OVERSAMPLE, 0, Math.PI * 2);
        c.fill();
    }

    // Dark obsidian center pupil: keeps HP text razor sharp and readable
    const pupilR = radius * 0.35;
    const pupilGrad = c.createRadialGradient(0, 0, 0, 0, 0, pupilR);
    pupilGrad.addColorStop(0, '#0D0812');
    pupilGrad.addColorStop(0.85, '#190E22');
    pupilGrad.addColorStop(1, '#36152B');
    c.fillStyle = pupilGrad;
    c.beginPath();
    c.arc(0, 0, pupilR, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = 'rgba(255, 215, 0, 0.60)';
    c.lineWidth = 1 * _THAELIS_OVERSAMPLE;
    c.beginPath();
    c.arc(0, 0, pupilR, 0, Math.PI * 2);
    c.stroke();
}

function _bakeOliveWreath(c, radius, isReborn) {
    const archRadius = radius * 0.78;
    const startA = Math.PI * 0.95;
    const endA = Math.PI * 0.05;
    const leafPairs = isReborn ? 10 : 7;
    const leafLen = (isReborn ? 14 : 11) * _THAELIS_OVERSAMPLE;
    const leafWid = (isReborn ? 5.5 : 4.2) * _THAELIS_OVERSAMPLE;

    c.strokeStyle = isReborn ? 'rgba(255, 225, 90, 0.85)' : 'rgba(240, 200, 50, 0.75)';
    c.lineWidth = (isReborn ? 2.2 : 1.6) * _THAELIS_OVERSAMPLE;
    c.beginPath();
    c.arc(0, 0, archRadius, startA, endA, false);
    c.stroke();

    for (let i = 0; i < leafPairs; i++) {
        const t = (i + 0.5) / leafPairs;
        const a = startA + t * (endA - startA + Math.PI * 2) % (Math.PI * 2);
        const bx = Math.cos(a) * archRadius, by = Math.sin(a) * archRadius;
        const stemAngle = a + Math.PI / 2;

        for (const side of [-1, 1]) {
            const leafAngle = stemAngle + side * (0.55 + (isReborn ? 0.1 : 0));
            const lx = bx + Math.cos(leafAngle) * (leafLen * 0.5);
            const ly = by + Math.sin(leafAngle) * (leafLen * 0.5);

            c.save();
            c.translate(lx, ly);
            c.rotate(leafAngle);
            c.beginPath();
            c.ellipse(0, 0, leafLen * 0.5, leafWid * 0.5, 0, 0, Math.PI * 2);

            const lg = c.createLinearGradient(-leafLen * 0.5, 0, leafLen * 0.5, 0);
            lg.addColorStop(0, '#FFE875');
            lg.addColorStop(0.5, isReborn ? '#E6B800' : '#D4AF37');
            lg.addColorStop(1, '#8A7010');
            c.fillStyle = lg;
            c.fill();

            c.strokeStyle = '#FFF4AA';
            c.lineWidth = 0.8 * _THAELIS_OVERSAMPLE;
            c.stroke();
            c.restore();
        }
    }

    if (isReborn) {
        c.fillStyle = '#FFE066';
        c.beginPath();
        c.arc(0, -archRadius, 4 * _THAELIS_OVERSAMPLE, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#FFFFFF';
        c.lineWidth = 1 * _THAELIS_OVERSAMPLE;
        c.stroke();
    }
}

function _bakeOdysseusAxe(c) {
    const W = 48 * _THAELIS_OVERSAMPLE, H = 34 * _THAELIS_OVERSAMPLE;
    const midX = W / 2, midY = H / 2;
    c.fillStyle = '#8B5A2B';
    c.fillRect(midX - 3 * _THAELIS_OVERSAMPLE, 0, 6 * _THAELIS_OVERSAMPLE, H);

    for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(midX + side * (3 * _THAELIS_OVERSAMPLE), midY - 3 * _THAELIS_OVERSAMPLE);
        c.quadraticCurveTo(midX + side * (16 * _THAELIS_OVERSAMPLE), midY - 14 * _THAELIS_OVERSAMPLE, midX + side * (22 * _THAELIS_OVERSAMPLE), midY);
        c.quadraticCurveTo(midX + side * (16 * _THAELIS_OVERSAMPLE), midY + 14 * _THAELIS_OVERSAMPLE, midX + side * (3 * _THAELIS_OVERSAMPLE), midY + 3 * _THAELIS_OVERSAMPLE);
        c.closePath();
        const bg = c.createLinearGradient(midX, midY, midX + side * (22 * _THAELIS_OVERSAMPLE), midY);
        bg.addColorStop(0, '#5C3814');
        bg.addColorStop(0.6, '#B8860B');
        bg.addColorStop(1, '#FFE066');
        c.fillStyle = bg;
        c.fill();
        c.strokeStyle = '#FFF8DC';
        c.lineWidth = 1.2 * _THAELIS_OVERSAMPLE;
        c.stroke();
    }
}

function _getThaelisOuterPolySprite() {
    if (_thaelisOuterPolySprite) return _thaelisOuterPolySprite;
    const pad = Math.ceil(_THAELIS_REF_R * 1.2);
    const off = document.createElement('canvas');
    off.width = off.height = pad * 2;
    const c = off.getContext('2d');
    c.translate(pad, pad);
    _bakeHopliteShield(c, _THAELIS_REF_R);
    _thaelisOuterPolySprite = { canvas: off, pad, r: _THAELIS_REF_R };
    return _thaelisOuterPolySprite;
}

function _getThaelisInnerPolySprite() {
    if (_thaelisInnerPolySprite) return _thaelisInnerPolySprite;
    const rr = _THAELIS_REF_R * 0.55;
    const pad = Math.ceil(rr * 1.2);
    const off = document.createElement('canvas');
    off.width = off.height = pad * 2;
    const c = off.getContext('2d');
    c.translate(pad, pad);
    _bakeVitruvianInnerPoly(c, rr);
    _thaelisInnerPolySprite = { canvas: off, pad, r: _THAELIS_REF_R };
    return _thaelisInnerPolySprite;
}

function _getThaelisCoreSprite() {
    if (_thaelisCoreSprite) return _thaelisCoreSprite;
    const rr = _THAELIS_REF_R * 0.28;
    const pad = Math.ceil(rr * 1.25);
    const off = document.createElement('canvas');
    off.width = off.height = pad * 2;
    const c = off.getContext('2d');
    c.translate(pad, pad);
    _bakeAthenaEyeCore(c, rr);
    _thaelisCoreSprite = { canvas: off, pad, r: _THAELIS_REF_R };
    return _thaelisCoreSprite;
}

function _getThaelisWreathSprite(isReborn) {
    if (isReborn) {
        if (_thaelisWreathRebornSprite) return _thaelisWreathRebornSprite;
        const pad = Math.ceil(_THAELIS_REF_R * 1.2);
        const off = document.createElement('canvas');
        off.width = off.height = pad * 2;
        const c = off.getContext('2d');
        c.translate(pad, pad);
        _bakeOliveWreath(c, _THAELIS_REF_R, true);
        _thaelisWreathRebornSprite = { canvas: off, pad, r: _THAELIS_REF_R };
        return _thaelisWreathRebornSprite;
    }
    if (_thaelisWreathSprite) return _thaelisWreathSprite;
    const pad = Math.ceil(_THAELIS_REF_R * 1.2);
    const off = document.createElement('canvas');
    off.width = off.height = pad * 2;
    const c = off.getContext('2d');
    c.translate(pad, pad);
    _bakeOliveWreath(c, _THAELIS_REF_R, false);
    _thaelisWreathSprite = { canvas: off, pad, r: _THAELIS_REF_R };
    return _thaelisWreathSprite;
}

function _getThaelisAxeSprite() {
    if (_thaelisAxeSprite) return _thaelisAxeSprite;
    const W = Math.ceil(48 * _THAELIS_OVERSAMPLE);
    const H = Math.ceil(34 * _THAELIS_OVERSAMPLE);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    _bakeOdysseusAxe(c);
    _thaelisAxeSprite = { canvas: off, w: W, h: H, r: _THAELIS_REF_R };
    return _thaelisAxeSprite;
}

function _blitThaelisSprite(spr, enemy, rotation, alpha) {
    const s = (enemy.size / 2) / spr.r;
    if (alpha !== undefined) { ctx.save(); ctx.globalAlpha = alpha; }
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (rotation) ctx.rotate(rotation);
    ctx.drawImage(spr.canvas, -spr.pad * s, -spr.pad * s, spr.canvas.width * s, spr.canvas.height * s);
    ctx.restore();
    if (alpha !== undefined) ctx.restore();
}

function _drawThaelisGlow(enemy, r, now, hpPct) {
    const isLowHp = hpPct < 0.6;
    const period = isLowHp ? 180 : 500;
    const pulse = Math.abs(Math.sin(now / period));
    const alpha = isLowHp ? (0.18 + 0.14 * pulse) : (0.12 + 0.08 * pulse);
    const extraR = isLowHp ? (12 + pulse * 10) : 10;

    ctx.save();
    ctx.fillStyle = `rgba(255, 205, 20, ${alpha})`;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = isLowHp ? 25 : 18;
    }
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r + extraR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

// cracks widen as HP is lost and close slowly while Thaelis is mending
function _drawThaelisCracks(enemy, r, now, hpPct) {
    if (hpPct >= 0.6) return;
    const lostFrac = (0.6 - hpPct) / 0.6;
    const activeBranches = Math.ceil(lostFrac * _THAELIS_CRACK_DATA.length);
    const isMending = enemy._shroudHealAt && (now - enemy._shroudHealAt < 250);
    const crackAlpha = isMending ? 0.95 : (0.55 + 0.35 * lostFrac);
    const crackWidth = isMending ? 1.0 : (1.4 + lostFrac * 1.0);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.strokeStyle = isMending ? `rgba(255, 255, 220, ${crackAlpha})` : `rgba(255, 215, 60, ${crackAlpha})`;
    ctx.lineWidth = crackWidth;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = isMending ? 10 : 4;
    }

    for (let b = 0; b < activeBranches; b++) {
        const pts = _THAELIS_CRACK_DATA[b];
        ctx.beginPath();
        ctx.moveTo(pts[0][0] * r, pts[0][1] * r);
        for (let p = 1; p < pts.length; p++) {
            ctx.lineTo(pts[p][0] * r, pts[p][1] * r);
        }
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

// a reborn Thaelis wears a thicker laurel and trails faint ash
function _drawThaelisRebornDetails(enemy, r, now) {
    if (!enemy.reincarnated) return;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.strokeStyle = 'rgba(255, 225, 80, 0.75)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const vx = Math.cos(a) * r, vy = Math.sin(a) * r;
        const normX = -Math.sin(a), normY = Math.cos(a);
        ctx.beginPath();
        ctx.moveTo(vx - normX * 6, vy - normY * 6);
        ctx.lineTo(vx + normX * 6, vy + normY * 6);
        ctx.stroke();
    }

    if (!_mobPerf && window._fxOpts && window._fxOpts.particles) {
        ctx.fillStyle = 'rgba(255, 170, 70, 0.45)';
        for (let a = 0; a < 5; a++) {
            const ashT = ((now * 0.0006 * (0.8 + a * 0.2) + a * 0.27) % 1);
            const ashX = (a - 2) * (r * 0.28);
            const ashY = r * 0.2 - ashT * r * 0.9;
            ctx.beginPath();
            ctx.arc(ashX, ashY, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

function _drawThaelisOrbitDots(enemy, rotation) {
    const r = enemy.size / 2;
    const orbitR2 = r + 18;
    const dotCount = 6;

    // Glowing thread connecting the orbit dots like warp threads on a loom
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 220, 60, 0.38)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < dotCount; i++) {
        const a = rotation + (i / dotCount) * Math.PI * 2;
        const px = enemy.x + Math.cos(a) * orbitR2;
        const py = enemy.y + Math.sin(a) * orbitR2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
    }
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < dotCount; i++) {
        const a = rotation + (i / dotCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(enemy.x + Math.cos(a) * orbitR2, enemy.y + Math.sin(a) * orbitR2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}

// a bare Thaelis that is hurt shows a slow shuttle of light, the sign that it is mending
function _drawThaelisShuttle(enemy, r, now) {
    const shuttleT = (now / 2200) % 1;
    const totalSegs = 8;
    const seg = Math.floor(shuttleT * totalSegs);
    const f = (shuttleT * totalSegs) % 1;
    const a1 = (seg / totalSegs) * Math.PI * 2;
    const a2 = ((seg + 1) / totalSegs) * Math.PI * 2;
    const p1x = enemy.x + r * Math.cos(a1), p1y = enemy.y + r * Math.sin(a1);
    const p2x = enemy.x + r * Math.cos(a2), p2y = enemy.y + r * Math.sin(a2);
    const sx = (1 - f) * p1x + f * p2x, sy = (1 - f) * p1y + f * p2y;
    const edgeAngle = Math.atan2(p2y - p1y, p2x - p1x);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(edgeAngle);
    ctx.strokeStyle = 'rgba(255, 230, 90, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, 0);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(0, -2.5); ctx.lineTo(-5, 0); ctx.lineTo(0, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// while any heal keeps landing the body glows green and stitches run along its edges, easing in over 150ms and out after the heal stops
function _drawThaelisHeal(enemy, r, now) {
    const isHealing = enemy._shroudHealAt && (now - enemy._shroudHealAt < 250);
    const dt = 16.67;
    const target = isHealing ? 1 : 0;
    const rate = isHealing ? (dt / 150) : (dt / 250);
    const curr = enemy._thaelisHealIntensity || 0;
    const intensity = Math.max(0, Math.min(1, curr + (target - curr) * Math.min(1, rate * 1.5)));
    enemy._thaelisHealIntensity = intensity;

    if (intensity > 0.01) {
        const noShield = !(enemy.shield > 0);
        const auraAlpha = intensity * (noShield ? 0.28 : 0.16);

        ctx.save();
        ctx.fillStyle = `rgba(34, 204, 85, ${auraAlpha})`;
        if (!_mobPerf && window._fxOpts && window._fxOpts.glow) {
            ctx.shadowColor = '#22cc55';
            ctx.shadowBlur = noShield ? 22 : 14;
        }
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r + (noShield ? 12 : 6), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = `rgba(180, 255, 170, ${intensity * 0.85})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -now * 0.05;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = enemy.x + r * 0.94 * Math.cos(a), py = enemy.y + r * 0.94 * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        if (window._fxOpts && window._fxOpts.particles) {
            const moteCount = _twCount(3, 6);
            ctx.fillStyle = `rgba(160, 255, 180, ${intensity * 0.8})`;
            for (let m = 0; m < moteCount; m++) {
                const mt = ((now * 0.0008 * (0.8 + m * 0.2) + m * 0.23) % 1);
                const ma = (m / moteCount) * Math.PI * 2 + now * 0.0005;
                const dist = r * (0.25 + (m % 3) * 0.25);
                const mx = enemy.x + Math.cos(ma) * dist;
                const my = enemy.y + Math.sin(ma) * dist - mt * r * 0.55;
                const sz = 1.4 + (1 - mt) * 1.4;
                ctx.beginPath();
                ctx.arc(mx, my, sz, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    if (!_mobPerf && !(enemy.shield > 0) && enemy.hp < enemy.maxHp) {
        _drawThaelisShuttle(enemy, r, now);
    }
}

// for 450ms after an absorbed hit, threads of light run from the ring into the body
function _drawThaelisMend(enemy, r, now) {
    if (!enemy._shroudMendAt) return;
    const age = now - enemy._shroudMendAt;
    if (age < 0 || age >= 450) return;
    const p = age / 450;
    const amtFrac = Math.min(1.0, (enemy._shroudMendAmt || 60) / (enemy.maxHp * 0.15));
    const threadCount = _twCount(1, 4);
    const bR = r + 16;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.strokeStyle = `rgba(160, 255, 140, ${(1 - p) * 0.9 * amtFrac})`;
    ctx.lineWidth = (1 + amtFrac) * (1 - p * 0.4);
    for (let i = 0; i < threadCount; i++) {
        const a = (i / threadCount) * Math.PI * 2 + now * 0.003;
        const startDist = bR * (1 - p * 0.6);
        const endDist = r * 0.5 * (1 - p);
        const sx = Math.cos(a) * startDist, sy = Math.sin(a) * startDist;
        const ex = Math.cos(a + 0.4) * endDist, ey = Math.sin(a + 0.4) * endDist;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) * 0.5 + 6, (sy + ey) * 0.5 - 6, ex, ey);
        ctx.stroke();
    }
    ctx.restore();
}

// healing past max HP spills over the rim and condenses into threads that thicken the shield ring
function _drawThaelisOverflow(enemy, r, now) {
    if (!enemy._shroudOverflowAt) return;
    const age = now - enemy._shroudOverflowAt;
    if (age < 0 || age >= 600) return;
    const p = age / 600;
    const amtFrac = Math.min(1.0, (enemy._shroudOverflowAmt || 60) / (enemy.maxHp * 0.20));
    const bR = r + 16;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (p < 0.5) {
        const waveP = p / 0.5;
        const waveR = r + waveP * 12;
        ctx.strokeStyle = `rgba(34, 204, 85, ${(1 - waveP) * 0.7 * amtFrac})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, waveR, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        const streamP = (p - 0.5) / 0.5;
        const threadCount = _twCount(3, 6);
        ctx.strokeStyle = `rgba(255, 230, 80, ${(1 - streamP) * 0.85 * amtFrac})`;
        ctx.lineWidth = 2.2;
        for (let i = 0; i < threadCount; i++) {
            const a = (i / threadCount) * Math.PI * 2;
            const r1 = r + 6 * (1 - streamP);
            const r2 = bR + streamP * 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

// the shield is drawn as warp and weft threads, one thread per 8% of shield left
// phones draw half the threads and skip the shuttle and the glow
function _drawThaelisWeave(enemy, r, now) {
    if (!((enemy.shield || 0) > 0)) return;
    const bMax = enemy._shieldPeak || enemy.shield;
    const bFrac = Math.min(1, Math.max(0, enemy.shield / bMax));
    const bR = r + 16 + 2 * Math.sin(now / 150);
    const pulse = 0.75 + 0.25 * Math.sin(now / 120);

    const maxWeft = _twCount(6, 13);
    const weftCount = Math.max(1, Math.round(maxWeft * bFrac));
    const rot = now / 5500;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) {
        ctx.shadowColor = '#FFE066';
        ctx.shadowBlur = 12 * bFrac;
    }

    const warpOffsets = [-3.5, 0, 3.5];
    for (let w = 0; w < warpOffsets.length; w++) {
        const wr = bR + warpOffsets[w];
        ctx.strokeStyle = `rgba(255, 225, 60, ${pulse * (0.45 + w * 0.15) * bFrac})`;
        ctx.lineWidth = w === 1 ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, wr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bFrac);
        ctx.stroke();
    }

    ctx.strokeStyle = `rgba(255, 240, 150, ${pulse * 0.75 * bFrac})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < weftCount; i++) {
        const wa = rot + (i / maxWeft) * Math.PI * 2;
        const x1 = Math.cos(wa) * (bR - 5), y1 = Math.sin(wa) * (bR - 5);
        const x2 = Math.cos(wa) * (bR + 5), y2 = Math.sin(wa) * (bR + 5);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

// a new shield is woven in over 700ms from the moment it was granted
function _drawThaelisShieldGrant(enemy, r, now) {
    if (!enemy._shieldGrantAt) return;
    const age = now - enemy._shieldGrantAt;
    if (age < 0 || age >= 700) return;
    const p = age / 700;
    const threadCount = _twCount(4, 8);
    const bR = r + 16;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.strokeStyle = `rgba(255, 230, 80, ${(1 - p * 0.3) * 0.85})`;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < threadCount; i++) {
        const a0 = (i / threadCount) * Math.PI * 2 + (1 - p) * 1.5;
        const outerDist = r * 2.2 * (1 - p) + bR * p;
        const x1 = Math.cos(a0) * outerDist, y1 = Math.sin(a0) * outerDist;
        const x2 = Math.cos(a0 + 0.3) * bR, y2 = Math.sin(a0 + 0.3) * bR;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) * 0.5 + 8, (y1 + y2) * 0.5 - 8, x2, y2);
        ctx.stroke();
    }

    if (p > 0.7) {
        const flashP = (p - 0.7) / 0.3;
        const flashAlpha = Math.sin(flashP * Math.PI) * 0.45;
        ctx.fillStyle = `rgba(255, 245, 160, ${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, bR + flashP * 8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// a snapped thread curls back and fades for 600ms after the shield breaks
function _drawThaelisShieldBreak(enemy, r, now) {
    if (!enemy._shieldBreakCrackAt) return;
    const age = now - enemy._shieldBreakCrackAt;
    if (age < 0 || age >= 600) return;
    const p = age / 600;
    const threadCount = _twCount(5, 10);
    const bR = r + 16;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.strokeStyle = `rgba(255, 210, 80, ${(1 - p) * 0.75})`;
    ctx.lineWidth = 1.5 * (1 - p * 0.5);

    for (let i = 0; i < threadCount; i++) {
        const a = (i / threadCount) * Math.PI * 2;
        const curlDir = (i % 2 === 0 ? 1 : -1);
        const sx = Math.cos(a) * bR, sy = Math.sin(a) * bR;
        const curlR = bR + p * 18;
        const ca = a + curlDir * p * 0.8;
        const ex = Math.cos(ca) * curlR, ey = Math.sin(ca) * curlR;
        const midX = (sx + ex) * 0.5 + Math.cos(a + Math.PI / 2 * curlDir) * (p * 12);
        const midY = (sy + ey) * 0.5 + Math.sin(a + Math.PI / 2 * curlDir) * (p * 12);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(midX, midY, ex, ey);
        ctx.stroke();
    }
    ctx.restore();
}

function _drawThaelisRevive(enemy, r, now) {
    if (enemy._justRevivedAt) {
        const age = now - enemy._justRevivedAt;
        if (age >= 0 && age < 800) {
            const p = age / 800;
            ctx.save();
            ctx.translate(enemy.x, enemy.y);

            const threadCount = _twCount(4, 8);
            ctx.strokeStyle = `rgba(160, 255, 150, ${(1 - p) * 0.85})`;
            ctx.lineWidth = 1.8;
            for (let i = 0; i < threadCount; i++) {
                const a = (i / threadCount) * Math.PI * 2 + p * 2.5;
                const d1 = r * (2.0 - p * 1.0);
                const d2 = r * 0.6;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * d1, Math.sin(a) * d1);
                ctx.lineTo(Math.cos(a + 0.5) * d2, Math.sin(a + 0.5) * d2);
                ctx.stroke();
            }

            ctx.strokeStyle = `rgba(255, 230, 100, ${(1 - p) * 0.75})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * (0.8 + p * 1.2), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    if (enemy._reviveInvulnEnd && now < enemy._reviveInvulnEnd) {
        const invulnPulse = 0.5 + 0.5 * Math.sin(now / 70);
        ctx.save();
        ctx.strokeStyle = `rgba(180, 255, 190, ${0.45 + invulnPulse * 0.35})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = enemy.x + (r + 4) * Math.cos(a), py = enemy.y + (r + 4) * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
}

function _drawThaelis(enemy) {
    const now = performance.now();
    const rotSpeed = 3000;
    const rotation = now / rotSpeed;
    const r = enemy.size / 2;
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    _twRequestArt();
    const cast = _thaelisCastState(enemy);

    _drawThaelisGlow(enemy, r, now, hpPct);
    _drawThaelisGroundCracks(enemy, r, now, cast); // the ground splits while a wave gathers
    _drawThaelisPhantom(enemy, r, now, cast);      // bá khí in a warrior's shape, only while a wave is cast
    _drawThaelisDouqi(enemy, r, now, hpPct, cast); // Tenacity's flame aura, crimson and full while a wave gathers
    _blitThaelisSprite(_getThaelisOuterPolySprite(), enemy, rotation);
    _blitThaelisSprite(_getThaelisInnerPolySprite(), enemy, -rotation * 1.3, 0.55);
    _blitThaelisSprite(_getThaelisCoreSprite(), enemy, 0);
    _blitThaelisSprite(_getThaelisWreathSprite(enemy.reincarnated), enemy, 0);
    _drawThaelisArmor(enemy, r, now, cast, rotation);
    _drawThaelisAxe(enemy, r, now, cast);
    _drawThaelisParryFx(enemy, r, now);

    _drawThaelisRebornDetails(enemy, r, now);
    _drawThaelisCracks(enemy, r, now, hpPct);
    _drawThaelisOrbitDots(enemy, rotation * 1.5);
    _drawThaelisHeal(enemy, r, now);
    _drawThaelisMend(enemy, r, now);
    _drawThaelisOverflow(enemy, r, now);
    _drawThaelisWeave(enemy, r, now);
    _drawThaelisShieldGrant(enemy, r, now);
    _drawThaelisShieldBreak(enemy, r, now);
    _drawThaelisRevive(enemy, r, now);
    _drawThaelisIronBody(enemy, r, now);
    _drawThaelisBlackLightning(enemy, r, now, cast);
    _drawThaelisBakhiRise(enemy, r, now, cast);
    _drawThaelisOrdealHud(enemy, r, now);
}

const _thaelisCocoonImg = new Image();
_thaelisCocoonImg.src = 'assets/images/game/enemies/thaelis-cocoon.png';
_thaelisCocoonImg.decode().catch(() => {});

function _drawThaelisCocoon(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    const timerPct = Math.max(0, Math.min(1, (enemy._cocoonTimer || 0) / THAELIS_COCOON_DURATION));
    const urgency = 1 - timerPct;
    const pulseSpeed = 260 - urgency * 140;
    const pulse = 0.5 + 0.5 * Math.sin(now / pulseSpeed);
    // the Cocoon still gathers Ulysses' Return, so the bá khí phantom stands behind it just as behind Thaelis
    _twRequestArt();
    const cast = _thaelisCastState(enemy);
    _drawThaelisGroundCracks(enemy, r, now, cast);
    _drawThaelisPhantom(enemy, r, now, cast);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha *= 0.86 + 0.14 * Math.sin(now / 500);

    const auraR = r * (1.7 + pulse * 0.15);
    const auraG = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, auraR);
    const auraHue = 140 - urgency * 90;
    auraG.addColorStop(0, `hsla(${auraHue}, 90%, 55%, ${0.28 + pulse * 0.12})`);
    auraG.addColorStop(1, `hsla(${auraHue}, 90%, 50%, 0)`);
    ctx.fillStyle = auraG;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) {
        ctx.shadowColor = `hsl(${auraHue},90%,55%)`;
        ctx.shadowBlur = 24 + urgency * 20;
    }
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Penelope's shroud threads wrap the cocoon in slow shifting layers
    const shroudLayers = _twCount(2, 4);
    for (let sh = 0; sh < shroudLayers; sh++) {
        const shAngle = (sh / shroudLayers) * Math.PI + Math.sin(now / 1600 + sh) * 0.15;
        ctx.save();
        ctx.rotate(shAngle);
        ctx.strokeStyle = `hsla(${auraHue}, 85%, 65%, ${0.35 + pulse * 0.15 - sh * 0.06})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * (0.95 + sh * 0.12), r * (1.35 + sh * 0.10), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (urgency > 0.75) {
        // threads snap and burst outward as the cocoon prepares to hatch
        const burstCount = _twCount(4, 8);
        ctx.strokeStyle = `hsla(${auraHue}, 100%, 80%, ${0.6 + pulse * 0.3})`;
        ctx.lineWidth = 1.6;
        for (let b = 0; b < burstCount; b++) {
            const ba = (b / burstCount) * Math.PI * 2 + now * 0.002;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ba) * (r * 1.1), Math.sin(ba) * (r * 1.3));
            ctx.lineTo(Math.cos(ba) * (r * 1.6), Math.sin(ba) * (r * 1.8));
            ctx.stroke();
        }
    }

    const rock = Math.sin(now / 700) * 0.03;
    ctx.save();
    ctx.rotate(rock);
    if (_thaelisCocoonImg.complete && _thaelisCocoonImg.naturalWidth > 0) {
        const imgAspect = _thaelisCocoonImg.naturalWidth / _thaelisCocoonImg.naturalHeight;
        const drawH = r * 2.5, drawW = drawH * imgAspect;
        ctx.drawImage(_thaelisCocoonImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
        ctx.fillStyle = '#151018';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (!_mobPerf) {
        ctx.save();
        ctx.translate(0, -r * 1.9);
        ctx.rotate(now / 1400);
        const noTargetAlpha = 0.55 + 0.25 * Math.sin(now / 420);
        ctx.strokeStyle = `rgba(200,255,220,${noTargetAlpha})`;
        ctx.lineWidth = 1.5;
        if (window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = '#c8ffdc'; ctx.shadowBlur = 6; }
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    const crackGlow = Math.max(1 - hpPct, urgency) * (0.6 + pulse * 0.4);
    if (crackGlow > 0.05) {
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9);
        cg.addColorStop(0, `hsla(${auraHue},100%,85%,${crackGlow * 0.6})`);
        cg.addColorStop(1, `hsla(${auraHue},100%,60%,0)`);
        ctx.fillStyle = cg;
        if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = `hsl(${auraHue},100%,80%)`; ctx.shadowBlur = 18 * crackGlow; }
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 1.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    if (!_mobPerf && window._fxOpts && window._fxOpts.particles) {
        if (!enemy._cocoonEmbers) {
            enemy._cocoonEmbers = [];
            for (let i = 0; i < 14; i++) {
                enemy._cocoonEmbers.push({ a: Math.random() * Math.PI * 2, rr: 0.3 + Math.random() * 0.9, phase: Math.random() * Math.PI * 2, spd: 0.4 + Math.random() * 0.6 });
            }
        }
        for (const em of enemy._cocoonEmbers) {
            const ex = Math.cos(em.a) * r * em.rr;
            const eyBase = Math.sin(em.a) * r * em.rr * 1.3;
            const drift = ((now / 1000) * em.spd + em.phase) % 3;
            const ey = eyBase - drift * r * 0.6;
            const emAlpha = Math.max(0, 1 - drift / 3) * (0.5 + urgency * 0.4);
            if (emAlpha <= 0) continue;
            ctx.fillStyle = `hsla(${auraHue},100%,75%,${emAlpha})`;
            ctx.beginPath(); ctx.arc(ex, ey, 1.6 + Math.sin(now / 200 + em.phase) * 0.6, 0, Math.PI * 2); ctx.fill();
        }
    }

    // Countdown arc showing the window remaining
    ctx.rotate(-rock);
    ctx.strokeStyle = `hsla(${auraHue},90%,60%,0.85)`;
    ctx.lineWidth = 3;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = `hsl(${auraHue},90%,60%)`; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.arc(0, 0, r * 1.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerPct); ctx.stroke();
    ctx.shadowBlur = 0;

    // Quota readout for remaining Guards needed
    const killsLeft = Math.max(0, (enemy._cocoonKillsNeeded || 0) - (enemy._cocoonKillsSoFar || 0));
    const plateR = r * 0.5;
    ctx.save();
    ctx.rotate(rock);
    ctx.beginPath();
    for (let hx = 0; hx < 6; hx++) {
        const ha = (Math.PI / 3) * hx - Math.PI / 2;
        const px = Math.cos(ha) * plateR, py = Math.sin(ha) * plateR;
        if (hx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(6,10,8,0.78)';
    ctx.fill();
    ctx.strokeStyle = `hsla(${auraHue},90%,65%,${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 1.6;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = `hsl(${auraHue},90%,65%)`; ctx.shadowBlur = 10; }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.round(plateR * 1.1)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `hsla(${auraHue},100%,${88 - urgency * 10}%,0.95)`;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = `hsl(${auraHue},100%,80%)`; ctx.shadowBlur = 9; }
    ctx.fillText(String(killsLeft), 0, 1);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.restore();
    _drawThaelisBlackLightning(enemy, r, now, cast);
    _drawThaelisBakhiRise(enemy, r, now, cast);
    _drawThaelisOrdealHud(enemy, r, now);
}

function _drawThaelisGuard(enemy) {
    const now = performance.now();
    const r = enemy.size / 2;
    const hpPct = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) || 0;
    const pulse = 0.5 + 0.5 * Math.sin(now / 220 + enemy.x);
    const cocoon = enemy._guardCocoon;

    if (cocoon && cocoon.hp > 0) {
        ctx.save();
        const tetherPulse = 0.5 + 0.5 * Math.sin(now / 260 + enemy.x * 0.5);
        ctx.strokeStyle = `rgba(120,255,170,${0.25 + tetherPulse * 0.25})`;
        ctx.lineWidth = 1.5;
        if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = '#22cc55'; ctx.shadowBlur = 6; }
        ctx.setLineDash([3, 7]);
        ctx.lineDashOffset = -now / 40;
        ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(cocoon.x, cocoon.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const baseG = ctx.createRadialGradient(0, r * 1.1, 0, 0, r * 1.1, r * 2.2);
    baseG.addColorStop(0, `rgba(120,255,170,${0.35 * hpPct})`);
    baseG.addColorStop(1, 'rgba(20,80,50,0)');
    ctx.fillStyle = baseG;
    ctx.beginPath(); ctx.ellipse(0, r * 1.1, r * 2.2, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();

    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = '#22cc55'; ctx.shadowBlur = 8 + pulse * 6 * hpPct; }
    const bodyG = ctx.createLinearGradient(-r * 0.5, -r * 2.2, r * 0.5, r);
    bodyG.addColorStop(0, `rgba(235,255,240,${0.7 + 0.3 * hpPct})`);
    bodyG.addColorStop(0.45, `rgba(70, ${150 + 80 * hpPct}, ${100 + 40 * hpPct}, 1)`);
    bodyG.addColorStop(1, 'rgba(10,30,20,1)');
    ctx.fillStyle = bodyG;
    ctx.strokeStyle = 'rgba(200,255,220,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.2);
    ctx.lineTo(r * 0.55, -r * 0.9);
    ctx.lineTo(r * 0.45, r * 0.9);
    ctx.lineTo(0, r * 1.15);
    ctx.lineTo(-r * 0.45, r * 0.9);
    ctx.lineTo(-r * 0.55, -r * 0.9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Odysseus double axe head atop the guard pylon
    const axe = _getThaelisAxeSprite();
    if (axe) {
        const axeScale = (r * 1.2) / axe.w;
        ctx.drawImage(axe.canvas, -axe.w * axeScale * 0.5, -r * 2.4 - axe.h * axeScale * 0.5, axe.w * axeScale, axe.h * axeScale);
    }

    ctx.strokeStyle = `rgba(230,255,235,${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = '#eaffea'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.moveTo(0, -r * 1.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
    ctx.shadowBlur = 0;

    if (!_mobPerf) {
        ctx.save();
        ctx.translate(0, r * 1.0);
        ctx.rotate(now / 700);
        ctx.strokeStyle = `rgba(150,255,190,${0.5 + 0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * pulse})`;
    if (!_mobPerf && window._fxOpts && window._fxOpts.glow) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.arc(0, -r * 2.2, 2 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
}

function _thaelisWaveSprites() {
    if (_thaelisWaveArt) return _thaelisWaveArt;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const W = THAELIS_WAVE_HALF_WIDTH;
    const ring = mk(40, 2 * Math.round(W * 0.84) + 16), rg = ring.getContext('2d');
    const rcy = ring.height / 2, rry = ring.height / 2 - 8;
    rg.lineWidth = 6; rg.strokeStyle = '#ffe066';
    rg.beginPath(); rg.ellipse(20, rcy, 14, rry, 0, 0, Math.PI * 2); rg.stroke();
    rg.lineWidth = 3; rg.strokeStyle = '#e0242c';
    rg.beginPath(); rg.ellipse(20, rcy, 8, rry - 8, 0, 0, Math.PI * 2); rg.stroke();
    rg.fillStyle = '#fffbd0'; rg.fillRect(15, rcy - rry - 5, 10, 8); rg.fillRect(15, rcy + rry - 3, 10, 8);

    const meander = mk(32, 16), mg = meander.getContext('2d');
    mg.strokeStyle = '#ffe066'; mg.lineWidth = 2; mg.lineJoin = 'miter';
    mg.beginPath(); mg.moveTo(0, 14); mg.lineTo(0, 2); mg.lineTo(14, 2); mg.lineTo(14, 10); mg.lineTo(6, 10); mg.lineTo(6, 6);
    mg.moveTo(16, 14); mg.lineTo(32, 14); mg.stroke();
    mg.strokeStyle = 'rgba(224,36,44,0.9)'; mg.lineWidth = 1;
    mg.beginPath(); mg.moveTo(0, 15.5); mg.lineTo(32, 15.5); mg.moveTo(0, 0.5); mg.lineTo(32, 0.5); mg.stroke();

    const slash = mk(140, 2 * W + 24), sg = slash.getContext('2d');
    const sh = slash.height, top = 8, bot = sh - 8, mid = sh / 2;
    const sgr = sg.createLinearGradient(0, 0, 140, 0);
    sgr.addColorStop(0, 'rgba(110,8,16,0)');
    sgr.addColorStop(0.15, 'rgba(200,24,36,0.5)');
    sgr.addColorStop(0.38, 'rgba(255,80,60,0.9)');
    sgr.addColorStop(0.47, 'rgba(255,236,210,1)');
    sgr.addColorStop(0.53, 'rgba(255,100,70,0.9)');
    sgr.addColorStop(0.7, 'rgba(200,24,36,0)');
    sg.shadowColor = '#ff3a30'; sg.shadowBlur = 14;
    sg.fillStyle = sgr;
    sg.beginPath(); sg.moveTo(14, top);
    sg.quadraticCurveTo(122, mid, 14, bot);
    sg.quadraticCurveTo(76, mid, 14, top);
    sg.closePath(); sg.fill();

    const trail = mk(360, 2 * W + 24), tg = trail.getContext('2d');
    const tx = tg.createLinearGradient(0, 0, 360, 0);
    tx.addColorStop(0, 'rgba(200,24,36,0)'); tx.addColorStop(1, 'rgba(255,90,70,0.38)');
    tg.fillStyle = tx; tg.fillRect(0, 0, 360, trail.height);
    tg.globalCompositeOperation = 'destination-in';
    const ty = tg.createLinearGradient(0, 0, 0, trail.height);
    ty.addColorStop(0, 'rgba(0,0,0,0)'); ty.addColorStop(0.25, 'rgba(0,0,0,1)'); ty.addColorStop(0.75, 'rgba(0,0,0,1)'); ty.addColorStop(1, 'rgba(0,0,0,0)');
    tg.fillStyle = ty; tg.fillRect(0, 0, 360, trail.height);
    return (_thaelisWaveArt = { ring: ring, meander: meander, slash: slash, SX: 68, trail: trail });
}

const _THAELIS_SLASH_LAYERS = [
    [0, 1.0, 1.0, 1.0, 0], [22, 0.86, 0.8, 0.8, -14], [44, 0.72, 0.7, 0.62, 12],
    [70, 0.9, 0.6, 0.45, -6], [100, 0.6, 0.5, 0.3, 16],
];

// the head of the sound wave: curved fronts that open backwards and pulse forward like a sonic boom
function _drawThaelisSonicRipples(s, alpha, now) {
    const hw = THAELIS_WAVE_HALF_WIDTH, rip = _twCount(3, 5), rho = hw * 1.15, phi = 0.88;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < rip; i++) {
        const t = (now / 520 + i / rip) % 1;
        const xf = s + 22 - t * 150;
        const a = alpha * Math.sin(Math.PI * Math.min(1, t * 1.25 + 0.0)) * (0.9 - t * 0.5);
        if (a <= 0.02) continue;
        ctx.strokeStyle = i % 2 ? `rgba(255, 90, 66, ${a})` : `rgba(255, 226, 190, ${a})`;
        ctx.lineWidth = 5.5 - t * 3.8;
        ctx.beginPath();
        ctx.arc(xf - rho, 0, rho, -phi, phi);
        ctx.stroke();
    }
    ctx.restore();
}

function _drawThaelisSlashWave(art, s, alpha, now, focus) {
    const n = _twCount(3, _THAELIS_SLASH_LAYERS.length), sh = art.slash.height;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sonicImg = _twImg('sonic');
    if (sonicImg) {
        // commissioned art for the head of the wave
        const dw = sh * sonicImg.naturalWidth / sonicImg.naturalHeight, pulse = 1 + 0.04 * Math.sin(now / 55);
        ctx.globalAlpha = alpha * (0.88 + 0.12 * Math.sin(now / 45));
        ctx.drawImage(sonicImg, s - _THAELIS_ART.sonic.tip * dw * pulse, -sh * pulse / 2, dw * pulse, sh * pulse);
    } else {
        for (let i = n - 1; i >= 0; i--) {
            const L = _THAELIS_SLASH_LAYERS[i];
            const x = s - L[0], sy = L[1], sx = L[2];
            const dy = L[4] + Math.sin(now / 60 + i * 1.3) * 3;
            ctx.globalAlpha = alpha * L[3] * (0.85 + 0.15 * Math.sin(now / 45 + i * 1.7));
            ctx.drawImage(art.slash, x - art.SX * sx, dy - sh * sy / 2, 140 * sx, sh * sy);
        }
        _drawThaelisSonicRipples(s, alpha, now);
    }

    // a focused wave (fewer than 3 targets in its lane, 50% more damage) drags black lightning behind its front
    if (focus) {
        const hwF = THAELIS_WAVE_HALF_WIDTH, frame = Math.floor(now / 55), bolts = _twCount(2, 4);
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
            ctx.globalAlpha = alpha * (pass === 0 ? 0.85 : 1);
            ctx.strokeStyle = pass === 0 ? '#ff3c32' : '#07020a';
            for (let i = 0; i < bolts; i++) {
                const seed = frame * 9.1 + i * 17.7, y0 = (_twHash(seed) - 0.5) * 1.7 * hwF, y1 = (_twHash(seed + 1) - 0.5) * 1.7 * hwF;
                ctx.lineWidth = pass === 0 ? 7.5 : 3;
                _twBoltPath(s + 14, y0, s - 90 - _twHash(seed + 2) * 130, y1, seed, 22);
                ctx.stroke();
            }
        }
        ctx.globalCompositeOperation = 'lighter';
    }

    // Trailing arrow fletching threads behind crescent slashes
    ctx.strokeStyle = 'rgba(255, 150, 110, 0.55)';
    ctx.lineWidth = 1.4;
    const hw = THAELIS_WAVE_HALF_WIDTH;
    for (const fletchY of [-hw * 0.45, 0, hw * 0.45]) {
        ctx.beginPath();
        ctx.moveTo(s - 30, fletchY);
        ctx.lineTo(s - 140, fletchY * 0.3);
        ctx.stroke();
    }

    // Sharper luminous gleam at cutting head
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(s + 18, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffb48a';
    const sparks = _twCount(6, 14);
    for (let i = 0; i < sparks; i++) {
        const q = (now * 0.002 + i * 0.37) % 1, side = i % 2 ? -1 : 1;
        const y = side * (hw * 0.45 + q * hw * 0.6) * (0.7 + 0.3 * Math.sin(i * 12.9898));
        ctx.globalAlpha = alpha * (1 - q) * 0.9;
        ctx.fillRect(s - 20 - q * 160, y - 1.5, 3, 3);
    }
    ctx.restore();
}

// each cut shot leaves a short green slash that fades over 320ms
function _drawThaelisWaves() {
    _drawThaelisDeathFx();   // Thaelis going down, drawn here so it sits under the Cocoon that takes its place
    // sparks where wave sliced through ally shots
    if (typeof _thaelisCutFx !== 'undefined' && _thaelisCutFx.length) {
        for (let i = 0; i < _thaelisCutFx.length; i++) {
            const fx = _thaelisCutFx[i];
            const q = Math.min(1, fx.age / 320);
            const slashAlpha = (1 - q) * 0.9;
            if (slashAlpha <= 0.01) continue;
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.angle);
            ctx.globalAlpha = slashAlpha;
            ctx.strokeStyle = '#ffe6d0';
            ctx.lineWidth = 2.4 * (1 - q * 0.5);
            ctx.beginPath();
            ctx.moveTo(-14, 0); ctx.lineTo(16, 0);
            ctx.stroke();
            ctx.strokeStyle = '#e0242c';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -6); ctx.lineTo(0, 6);
            ctx.stroke();
            ctx.fillStyle = '#ffe066';
            for (let sp = 0; sp < 3; sp++) {
                const sa = (sp / 3) * Math.PI * 2 + fx.age * 0.02;
                const sd = 5 + q * 16;
                ctx.fillRect(Math.cos(sa) * sd - 1, Math.sin(sa) * sd - 1, 2, 2);
            }
            ctx.restore();
        }
    }

    if (!_thaelisWaves.length) return;
    const art = _thaelisWaveSprites(), count = _twCount(6, 12), now = performance.now();
    const ringH = art.ring.height;
    let meanderPat = null;

    for (let k = 0; k < _thaelisWaves.length; k++) {
        const w = _thaelisWaves[k];
        const len = w.len;

        if (w.phase === 'lane') {
            // Calm drifting red threads along the lane instead of flat mist
            ctx.save();
            ctx.translate(w.ox, w.oy);
            ctx.rotate(w.angle);
            const fade = Math.min(1, w.timer / 400);

            ctx.globalAlpha = 0.08 * fade;
            ctx.fillStyle = '#e0242c';
            ctx.fillRect(0, -w.halfWidth, len, w.halfWidth * 2);

            ctx.globalAlpha = 0.45 * fade;
            ctx.strokeStyle = '#ff7a6a';
            ctx.lineWidth = 1.4;
            const threadCount = _twCount(2, 4);
            for (let th = 0; th < threadCount; th++) {
                const ty = -w.halfWidth * 0.65 + (th / (threadCount - 1)) * w.halfWidth * 1.3;
                const dashPhase = (now * 0.04 + th * 25) % 40;
                ctx.setLineDash([16, 24]);
                ctx.lineDashOffset = -dashPhase;
                ctx.beginPath();
                ctx.moveTo(0, ty);
                ctx.lineTo(len, ty);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            ctx.globalAlpha = 0.55 * fade;
            ctx.strokeStyle = '#ff9a8a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -w.halfWidth); ctx.lineTo(len, -w.halfWidth);
            ctx.moveTo(0, w.halfWidth); ctx.lineTo(len, w.halfWidth);
            ctx.stroke();
            ctx.restore();
            continue;
        }

        ctx.save();
        ctx.translate(w.ox, w.oy);
        ctx.rotate(w.angle);
        const p = w.phase === 'gate' ? 1 - w.timer / w.dur : 1;
        const step = (len - 240) / (count - 1);

        if (w.phase === 'gate') {
            if (!meanderPat) meanderPat = ctx.createPattern(art.meander, 'repeat');
            if (meanderPat) {
                ctx.globalAlpha = 0.25 + 0.55 * p;
                ctx.fillStyle = meanderPat;
                const mw = Math.max(0, len * Math.min(1, p * 1.6));
                ctx.fillRect(0, -w.halfWidth + 3, mw, 16);
                ctx.save();
                ctx.translate(0, w.halfWidth - 3);
                ctx.scale(1, -1);
                ctx.fillRect(0, 0, mw, 16);
                ctx.restore();
            }

            // the gate is the lane's telegraph; the warrior's axe and his bá khí phantom (enemy-thaelis-warrior.js) do the gathering
        }

        for (let i = 0; i < count; i++) {
            const t = 120 + i * step;
            let a;
            if (w.phase === 'gate') a = Math.max(0, Math.min(1, p * (count + 2) - i)) * 0.9;
            else a = t < w.s - 30 ? Math.max(0.1, 1 - (w.s - t) / 300) : 0.6;
            if (a <= 0.01) continue;
            ctx.globalAlpha = a;
            ctx.drawImage(art.ring, t - 12, -ringH / 2, 24, ringH);
        }

        if (w.phase === 'gate') {
            const mx = 40, orb = (10 + 54 * p) * (0.9 + 0.1 * Math.sin(now / 70));
            const glow = _getGlowSprite('rgba(255,100,80,0.9)', 48);
            if (glow) {
                ctx.globalAlpha = 0.35 + 0.6 * p;
                ctx.drawImage(glow, mx - orb, -orb, orb * 2, orb * 2);
            }
            ctx.fillStyle = '#ffb8a0';
            ctx.globalAlpha = 0.85;
            const motes = _twCount(6, 14);
            for (let i = 0; i < motes; i++) {
                const q = (p * 1.7 + i / motes) % 1, a0 = i * 2.39996, d = (130 + (i % 5) * 22) * (1 - q) + 8;
                ctx.fillRect(mx + Math.cos(a0 + q * 2.6) * d - 1.5, Math.sin(a0 + q * 2.6) * d * 0.8 - 1.5, 3, 3);
            }
        } else {
            const flash = Math.max(0, 1 - w.s / 160);
            if (flash > 0) {
                const g2 = _getGlowSprite('rgba(255,170,140,0.95)', 64);
                if (g2) { ctx.globalAlpha = flash; ctx.drawImage(g2, 20 - 90, -90, 180, 180); }
                ctx.globalAlpha = flash * 0.8;
                ctx.strokeStyle = '#ffd0c0';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(20, 0, 30 + w.s * 1.1, 0, Math.PI * 2);
                ctx.stroke();
            }
            const trailLen = Math.min(w.s + 60, THAELIS_WAVE_BODY + 40);
            ctx.globalAlpha = 0.8;
            ctx.drawImage(art.trail, w.s - 12 - trailLen, -art.trail.height / 2, trailLen, art.trail.height);
            _drawThaelisSlashWave(art, w.s, 1, now, w.focus);
        }
        ctx.restore();
    }
}

function _drawThaelisOrdealHud(enemy, r, now) {
    if (enemy._ordealPts === undefined) return;
    const q = enemy._ordealQueue || 0, glow = enemy._ordealGlow || 0, R = r + 26, cx = enemy.x, cy = enemy.y;
    const a0 = Math.PI * 0.18, a1 = Math.PI * 0.82;
    ctx.save();
    ctx.lineCap = 'round';

    ctx.strokeStyle = 'rgba(224, 36, 44, 0.30)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, a1);
    ctx.stroke();

    const frac = q >= THAELIS_ORDEAL_MAX_QUEUE ? 1 : (enemy._ordealPts || 0) / THAELIS_ORDEAL_COST;
    if (frac > 0) {
        ctx.strokeStyle = q >= THAELIS_ORDEAL_MAX_QUEUE ? '#ffffff' : '#ffe066';
        ctx.lineWidth = 2.5 + glow * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a0 + (a1 - a0) * frac);
        ctx.stroke();
    }

    for (let i = 0; i < THAELIS_ORDEAL_MAX_QUEUE; i++) {
        const a = Math.PI / 2 + (i - (THAELIS_ORDEAL_MAX_QUEUE - 1) / 2) * 0.34;
        const px = cx + Math.cos(a) * (R + 13), py = cy + Math.sin(a) * (R + 13);
        const on = i < q;
        const arrowH = on ? (7 + glow * 2) : 5;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a - Math.PI / 2);
        ctx.fillStyle = on ? '#ffe066' : 'rgba(224, 36, 44, 0.4)';
        ctx.strokeStyle = on ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -arrowH);
        ctx.lineTo(arrowH * 0.5, 0);
        ctx.lineTo(arrowH * 0.2, 0);
        ctx.lineTo(arrowH * 0.2, arrowH * 0.8);
        ctx.lineTo(-arrowH * 0.2, arrowH * 0.8);
        ctx.lineTo(-arrowH * 0.2, 0);
        ctx.lineTo(-arrowH * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    const castAge = _thaelisClock - (enemy._ordealCastAt || -1e9);
    if (castAge >= 0 && castAge < THAELIS_WAVE_GATE_MS) {
        const k = castAge / THAELIS_WAVE_GATE_MS;
        ctx.globalAlpha = (1 - k) * 0.75;
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.1 + 0.9 * k), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = -castAge * 0.1;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.1 + 0.9 * k), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}
