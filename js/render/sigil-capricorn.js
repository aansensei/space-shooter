// Pisces: Space Journey. (c) 2024 An Nguyen. Licensed under the MIT License.
// Capricorn sigil VFX in moonlit ink wash: the Compound Interest enso around
// the ship, the Ley meter over it, Mountainfall and its three rock screens,
// buried enemies and the faint shan shui backdrop. Every brush texture is
// baked once per graphics tier; the per frame draw is drawImage only.
const _capMountainImg = new Image();
_capMountainImg.src = 'assets/images/game/sigils/capricorn-mountain.png';
const _capFrameImg = new Image();
_capFrameImg.src = 'assets/images/game/sigils/capricorn-meter-frame.png';
const CAP_METER_W = 110;
const CAP_METER_ASPECT = 768 / 1376;
const CAP_METER_HOLE = { x0: 0.112, x1: 0.888, y0: 0.527, y1: 0.656 };
const CAP_TAU = Math.PI * 2;
const CAP_INK = ['#0b0d14', '#3a3f4a', '#8c94a3'];

let _capCache = null, _capSeed = 23491;
let _capPulseAt = -1e9, _capShatterAt = -1e9;
const _capMarks = Array.from({ length: 48 }, () => ({ active: false, wall: 0, x: 0, y: 0, kind: 'bullet', born: 0 }));
const _capParts = Array.from({ length: 64 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, born: 0, life: 0, size: 0, index: 0 }));
let _capMarkCursor = 0, _capPartCursor = 0;
const _capDrops = Array.from({ length: 64 }, (_, i) => ({ a: i * 2.39996, speed: 40 + (i % 11) * 15, size: 2 + i % 5, life: 520 + i % 9 * 61 }));

function _capRnd() { _capSeed = (Math.imul(_capSeed, 1664525) + 1013904223) >>> 0; return _capSeed / 4294967296; }
function _capClamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function _capSmooth(v) { v = _capClamp(v, 0, 1); return v * v * (3 - 2 * v); }
function _capSurface(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function _capDaub(g, x, y, r, color, alpha) {
    g.globalAlpha = alpha; g.fillStyle = color; g.beginPath();
    g.ellipse(x, y, r, r * (0.55 + _capRnd() * 0.55), _capRnd() * 3, 0, CAP_TAU); g.fill();
}
// Dry brush: rubs small streaks out of whatever is on the canvas.
function _capDry(g, w, h, n) {
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < n; i++) { g.globalAlpha = 0.1 + _capRnd() * 0.55; g.fillRect(_capRnd() * w, _capRnd() * h, 0.4 + _capRnd() * 2, 1 + _capRnd() * 9); }
    g.restore();
}

// One loaded stroke: wide and wet where the brush lands, thinning toward the open end.
function _capArc(a0, a1, cracked) {
    const c = _capSurface(224, 224), g = c.getContext('2d');
    for (let i = 0; i < 260; i++) {
        const p = i / 259, a = a0 + (a1 - a0) * p, r = 91 + Math.sin(a * 11) * 0.6;
        const thick = (9 * (1 - p) + 1.8) * (1 + 0.16 * Math.sin(i * 0.45));
        for (let j = 0; j < 3; j++) {
            g.globalAlpha = (0.42 + _capRnd() * 0.33) * (1 - p * 0.3);
            g.fillStyle = j === 0 ? '#e8edf2' : j === 1 ? '#a9b2bf' : '#5d6574';
            const rr = r + (j - 1) * thick * 0.18;
            g.beginPath(); g.ellipse(112 + Math.cos(a) * rr, 112 + Math.sin(a) * rr, 1.4 + _capRnd() * 1.2, thick * (0.32 + _capRnd() * 0.18), a, 0, CAP_TAU); g.fill();
        }
    }
    _capDry(g, 224, 224, cracked ? 1800 : 160);
    if (cracked) {
        g.globalCompositeOperation = 'destination-out'; g.lineWidth = 3;
        for (let j = 0; j < 7; j++) {
            const a = a0 + (a1 - a0) * (j + 0.4) / 7;
            g.beginPath(); g.moveTo(112 + Math.cos(a - 0.014) * 86, 112 + Math.sin(a - 0.014) * 86);
            g.lineTo(112 + Math.cos(a + 0.02) * 98, 112 + Math.sin(a + 0.02) * 98); g.stroke();
        }
    }
    return c;
}

function _capMist() {
    const c = _capSurface(512, 160), g = c.getContext('2d');
    for (let i = 0; i < 95; i++) {
        const x = 30 + _capRnd() * 450, y = 50 + _capRnd() * 65, r = 12 + _capRnd() * 64;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(220,227,234,0.04)'); grad.addColorStop(0.4, 'rgba(140,148,163,0.025)'); grad.addColorStop(1, 'rgba(140,148,163,0)');
        g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
}

function _capBloom(light) {
    const c = _capSurface(256, 256), g = c.getContext('2d');
    for (let i = 0; i < 100; i++) {
        const a = _capRnd() * CAP_TAU, r = Math.pow(_capRnd(), 0.7) * 89;
        _capDaub(g, 128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 8 + _capRnd() * 22, light ? '#b3becb' : '#0b0d14', 0.035 + _capRnd() * 0.065);
    }
    return c;
}

// Ram horns: two tapered strokes rising from the top of the circle, sweeping
// outward and curling down along its sides, dry at the tips.
function _capHorns() {
    const c = _capSurface(360, 260), g = c.getContext('2d');
    const P = [[60, -95], [122, -132], [182, -62], [146, 34]];
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 420; i++) {
            const p = i / 419, q = 1 - p, b0 = q * q * q, b1 = 3 * q * q * p, b2 = 3 * q * p * p, b3 = p * p * p;
            const x = 180 + side * (P[0][0] * b0 + P[1][0] * b1 + P[2][0] * b2 + P[3][0] * b3);
            const y = 130 + P[0][1] * b0 + P[1][1] * b1 + P[2][1] * b2 + P[3][1] * b3;
            const thick = (1 - p) * 15 + 1.4;
            for (let j = 0; j < 3; j++) {
                if (p > 0.7 && _capRnd() > 0.55) continue;
                _capDaub(g, x + (_capRnd() - 0.5) * thick * 0.5, y + (_capRnd() - 0.5) * thick * 0.5, thick * (0.3 + _capRnd() * 0.22),
                    j === 0 ? '#dfe5ea' : j === 1 ? '#9aa3b1' : '#4b5260', 0.3 + _capRnd() * 0.35);
            }
        }
    }
    _capDry(g, 360, 260, 1500);
    return c;
}

function _capSeal() {
    const c = _capSurface(96, 96), g = c.getContext('2d');
    g.translate(48, 48); g.rotate(-0.07);
    g.strokeStyle = '#b8322a'; g.lineWidth = 4; g.strokeRect(-30, -32, 60, 64);
    g.fillStyle = '#b8322a'; g.font = 'bold 49px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('山', 0, 2);
    g.setTransform(1, 0, 0, 1, 0, 0); _capDry(g, 96, 96, 500);
    return c;
}

function _capCracks() {
    const c = _capSurface(512, 512), g = c.getContext('2d');
    for (let i = 0; i < 14; i++) {
        let x = 256, y = 256;
        const a = i / 14 * CAP_TAU + _capRnd() * 0.2;
        for (let j = 0; j < 9; j++) {
            const nx = x + Math.cos(a + (_capRnd() - 0.5) * 0.7) * (9 + _capRnd() * 16), ny = y + Math.sin(a + (_capRnd() - 0.5) * 0.7) * (9 + _capRnd() * 16);
            g.globalAlpha = 0.2 + _capRnd() * 0.5; g.strokeStyle = j % 3 === 0 ? '#dce3ea' : '#8c94a3'; g.lineWidth = 2.2 - j * 0.17;
            g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
            if (j % 3 === 1) { g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + Math.cos(a + 0.7) * 20, ny + Math.sin(a + 0.7) * 20); g.stroke(); }
            x = nx; y = ny;
        }
    }
    _capDry(g, 512, 512, 3500);
    return c;
}

function _capBackdropPeaks(pines) {
    const c = _capSurface(280, 650), g = c.getContext('2d');
    for (let layer = 0; layer < 4; layer++) {
        const x = layer * 43 - 70, y = 190 + layer * 67;
        g.beginPath(); g.moveTo(x - 95, 650);
        g.bezierCurveTo(x - 80, y + 190, x - 19, y + 80, x + 15, y);
        g.bezierCurveTo(x + 33, y + 65, x + 22, y + 90, x + 48, y + 100);
        g.bezierCurveTo(x + 70, y + 80, x + 90, y + 210, x + 115, 650);
        g.fillStyle = layer % 2 ? '#555d6b' : '#858e9b'; g.globalAlpha = 0.18; g.fill();
        g.save(); g.clip();
        for (let k = 0; k < 130; k++) {
            g.strokeStyle = k % 3 ? '#151a27' : '#b2bcc9'; g.globalAlpha = 0.06 + _capRnd() * 0.15; g.lineWidth = 0.4 + _capRnd() * 3;
            const xx = x - 20 + _capRnd() * 120, yy = y + _capRnd() * 450;
            g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + (_capRnd() - 0.5) * 18, yy + 20 + _capRnd() * 80); g.stroke();
        }
        g.restore();
        if (pines) {
            for (let k = 0; k < 3; k++) {
                const xx = x + 35 + k * 10, yy = y + 110 + k * 12;
                g.globalAlpha = 0.45; g.strokeStyle = '#131722'; g.lineWidth = 1;
                g.beginPath(); g.moveTo(xx, yy + 17); g.lineTo(xx + 3, yy - 6); g.stroke();
                for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(xx - 9 + j, yy + j * 3); g.lineTo(xx + 12 - j, yy + j * 3 - 3); g.stroke(); }
            }
        }
    }
    _capDry(g, 280, 650, 14000);
    return c;
}

function _capSprites() {
    const gfx = window._gfxLevel || 0, loaded = _capMountainImg.complete && _capMountainImg.naturalWidth > 0;
    const frameLoaded = _capFrameImg.complete && _capFrameImg.naturalWidth > 0;
    if (_capCache && _capCache.gfx === gfx && _capCache.loaded === loaded && _capCache.frameLoaded === frameLoaded) return _capCache;
    _capSeed = 23491;
    const S = { gfx, loaded, frameLoaded };
    S.arcs = []; S.cracked = [];
    for (let i = 0; i < 8; i++) {
        const a0 = -Math.PI / 2 + i * CAP_TAU / 8 + 0.016, a1 = -Math.PI / 2 + (i + 1) * CAP_TAU / 8 - 0.025;
        S.arcs.push(_capArc(a0, a1, false)); S.cracked.push(_capArc(a0, a1, true));
    }
    S.horns = _capHorns(); S.mist = _capMist(); S.bloom = _capBloom(false); S.lightBloom = _capBloom(true);
    S.seal = _capSeal(); S.cracks = _capCracks(); S.ripple = _capArc(0, CAP_TAU - 0.09, false);
    // The ward over each rock screen: a pale moonlit curtain of dry brush
    // strokes rising from the stone and thinning into the air.
    S.veil = _capSurface(256, 160);
    let vg = S.veil.getContext('2d');
    const vgrad = vg.createLinearGradient(0, 0, 0, 160);
    vgrad.addColorStop(0, 'rgba(220,227,234,0)'); vgrad.addColorStop(0.7, 'rgba(200,210,222,0.16)'); vgrad.addColorStop(1, 'rgba(232,237,242,0.32)');
    vg.fillStyle = vgrad; vg.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 60; i++) {
        const x = 6 + _capRnd() * 244, len = 40 + _capRnd() * 110;
        const sg = vg.createLinearGradient(0, 160 - len, 0, 160);
        sg.addColorStop(0, 'rgba(232,237,242,0)'); sg.addColorStop(1, i % 3 ? 'rgba(185,194,204,0.4)' : 'rgba(240,244,248,0.55)');
        vg.strokeStyle = sg; vg.lineWidth = 0.6 + _capRnd() * 2.4;
        vg.beginPath(); vg.moveTo(x, 160 - len); vg.lineTo(x + (_capRnd() - 0.5) * 6, 160); vg.stroke();
    }
    _capDry(vg, 256, 160, 1600);
    // Its ends fade out so the three screens' wards blend into one.
    vg.globalCompositeOperation = 'destination-in';
    const vfade = vg.createLinearGradient(0, 0, 256, 0);
    vfade.addColorStop(0, 'rgba(0,0,0,0)'); vfade.addColorStop(0.22, '#000'); vfade.addColorStop(0.78, '#000'); vfade.addColorStop(1, 'rgba(0,0,0,0)');
    vg.fillStyle = vfade; vg.fillRect(0, 0, 256, 160);
    vg.globalCompositeOperation = 'source-over';
    // A soft band of warm light that runs along the carved calligraphy.
    S.shine = _capSurface(64, 64);
    vg = S.shine.getContext('2d');
    const sh = vg.createRadialGradient(32, 32, 0, 32, 32, 32);
    sh.addColorStop(0, 'rgba(246,232,190,0.9)'); sh.addColorStop(0.45, 'rgba(201,162,74,0.35)'); sh.addColorStop(1, 'rgba(201,162,74,0)');
    vg.fillStyle = sh; vg.fillRect(0, 0, 64, 64);
    // Dry brush speed streaks trailing above the falling mountain.
    S.streaks = _capSurface(256, 320);
    let g = S.streaks.getContext('2d');
    for (let i = 0; i < 70; i++) {
        const x = 10 + _capRnd() * 236, len = 60 + _capRnd() * 220, y0 = 320 - len;
        const grad = g.createLinearGradient(0, y0, 0, 320);
        grad.addColorStop(0, 'rgba(220,227,234,0)'); grad.addColorStop(1, i % 3 ? 'rgba(140,148,163,0.5)' : 'rgba(220,227,234,0.6)');
        g.strokeStyle = grad; g.lineWidth = 0.6 + _capRnd() * 3.2;
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (_capRnd() - 0.5) * 4, 320); g.stroke();
    }
    _capDry(g, 256, 320, 2400);
    S.tick = _capSurface(18, 32); g = S.tick.getContext('2d');
    for (let j = 0; j < 18; j++) { g.fillStyle = '#a8b2c0'; g.globalAlpha = 0.08 + _capRnd() * 0.2; g.fillRect(6 + _capRnd() * 5, j + 3, 1 + _capRnd() * 3, 1.5); }
    _capDry(g, 18, 32, 80);
    S.drops = [];
    for (let i = 0; i < 8; i++) {
        const c = _capSurface(32, 32); g = c.getContext('2d');
        for (let j = 0; j < 25; j++) _capDaub(g, 16 + (_capRnd() - 0.5) * 10, 16 + (_capRnd() - 0.5) * 10, 1 + _capRnd() * 5, CAP_INK[i % 3], 0.12 + _capRnd() * 0.35);
        S.drops.push(c);
    }
    S.splatters = [];
    for (let i = 0; i < 4; i++) {
        const c = _capSurface(128, 128); g = c.getContext('2d');
        g.drawImage(S.bloom, 10, 10, 108, 108);
        for (let j = 0; j < 55; j++) {
            const a = _capRnd() * CAP_TAU, r = _capRnd() * 54;
            _capDaub(g, 64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 0.5 + _capRnd() * 4, j % 4 === 0 ? '#a5aeb9' : '#161b26', 0.3 + _capRnd() * 0.5);
        }
        S.splatters.push(c);
    }
    S.warning = _capSurface(384, 384); g = S.warning.getContext('2d');
    for (let i = 0; i < 8; i++) g.drawImage(S.arcs[i], 0, 0, 384, 384);
    for (let i = 0; i < 12; i++) { g.save(); g.translate(192, 192); g.rotate(i * CAP_TAU / 12); g.drawImage(S.tick, -5, -180, 10, 21); g.restore(); }
    // Phones and low tiers keep the mountain at a smaller bake.
    const M = gfx >= 2 || _mobPerf ? 448 : 640;
    S.mountain = _capSurface(M, M); g = S.mountain.getContext('2d');
    if (loaded) { g.imageSmoothingQuality = 'high'; g.drawImage(_capMountainImg, 0, 0, M, M); }
    // Neighbouring pieces share the same fracture edge.
    const edge = (b, y) => b === 0 ? -8 : b === 3 ? M + 8 : b * M / 3 + Math.sin(y * 0.041 * 640 / M + b) * 13 * M / 640 + Math.sin(y * 0.14 * 640 / M) * 6 * M / 640;
    S.chunks = [];
    for (let i = 0; i < 3; i++) {
        const c = _capSurface(M, M); g = c.getContext('2d');
        g.beginPath(); g.moveTo(edge(i, 0), 0); g.lineTo(edge(i + 1, 0), 0);
        for (let y = 32; y <= M; y += 32) g.lineTo(edge(i + 1, y), y);
        for (let y = M; y >= 0; y -= 32) g.lineTo(edge(i, y), y);
        g.closePath(); g.clip(); g.drawImage(S.mountain, 0, 0); S.chunks.push(c);
    }
    // Each screen is a band of cliffs cut from the mountain itself, so the split
    // reads as the mountain breaking apart, with ends and foot fading into mist.
    S.walls = []; S.carvings = []; S.moss = [];
    const carvings = ['山 河 永 固', '厚 德 載 物', '萬 象 歸 藏'];
    for (let i = 0; i < 3; i++) {
        const c = _capSurface(512, 240); g = c.getContext('2d');
        if (loaded) {
            const mw = _capMountainImg.naturalWidth, mh = _capMountainImg.naturalHeight, sw = mw * 0.36, sh = sw * 240 / 512;
            g.drawImage(_capMountainImg, mw * (0.1 + i * 0.27), mh * 0.31, sw, sh, 0, 0, 512, 240);
        }
        g.globalCompositeOperation = 'destination-in';
        let fg = g.createLinearGradient(0, 0, 512, 0);
        fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.13, '#000'); fg.addColorStop(0.87, '#000'); fg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fg; g.fillRect(0, 0, 512, 240);
        fg = g.createLinearGradient(0, 0, 0, 240);
        fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.1, '#000'); fg.addColorStop(0.7, '#000'); fg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fg; g.fillRect(0, 0, 512, 240);
        g.globalCompositeOperation = 'source-over';
        S.walls.push(c);
        const cv = _capSurface(512, 240); g = cv.getContext('2d');
        g.font = '28px serif'; g.fillStyle = '#cfccba'; g.globalAlpha = 0.47; g.textAlign = 'center';
        g.fillText(carvings[i], 256, 135); _capDry(g, 512, 240, 1800);
        S.carvings.push(cv);
        const moss = _capSurface(512, 240); g = moss.getContext('2d');
        for (let j = 0; j < 90; j++) {
            const xx = _capRnd() * 490 + 10, yy = 30 + _capRnd() * 18 + Math.sin(xx * 0.03) * 11;
            _capDaub(g, xx, yy, 1 + _capRnd() * 4, j % 5 ? '#202e29' : '#4d633c', 0.2 + _capRnd() * 0.4);
        }
        S.moss.push(moss);
    }
    // A burial mound: cliff texture from the mountain cut to a low ragged hill
    // with a soft foot, so it reads as rock heaped over the enemy.
    S.mound = _capSurface(192, 96);
    g = S.mound.getContext('2d');
    g.drawImage(S.walls[1], 96, 40, 320, 150, 0, 0, 192, 96);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath(); g.moveTo(4, 96);
    for (let i = 0; i <= 12; i++) {
        const p = i / 12, hill = Math.sin(Math.PI * p);
        g.lineTo(4 + p * 184, 92 - hill * (62 + (_capRnd() - 0.5) * 14) - (i % 2) * 6);
    }
    g.lineTo(188, 96); g.closePath(); g.fillStyle = '#000'; g.fill();
    const foot = g.createLinearGradient(0, 0, 0, 96);
    foot.addColorStop(0, '#000'); foot.addColorStop(0.75, '#000'); foot.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = foot; g.fillRect(0, 0, 192, 96);
    g.globalCompositeOperation = 'source-over';
    S.backdrop = gfx <= 1 && !_mobPerf ? _capBackdropPeaks(gfx === 0) : null;
    S.constellation = _capSurface(160, 210); g = S.constellation.getContext('2d');
    const pts = [[20, 30], [55, 54], [130, 36], [122, 123], [73, 166], [28, 109], [20, 30], [55, 54], [73, 166]];
    g.strokeStyle = '#aab4c2'; g.lineWidth = 0.5; g.globalAlpha = 0.4; g.beginPath();
    for (let i = 0; i < pts.length; i++) { if (i === 0) g.moveTo(pts[i][0], pts[i][1]); else g.lineTo(pts[i][0], pts[i][1]); }
    g.stroke();
    for (let i = 0; i < 6; i++) _capDaub(g, pts[i][0], pts[i][1], 2.5, '#b7c2d1', 0.65);
    S.fill = _capSurface(512, 64); g = S.fill.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 512, 0);
    gr.addColorStop(0, '#4b5260'); gr.addColorStop(0.55, '#8c94a3'); gr.addColorStop(1, '#c9d3c4');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 64);
    for (let i = 0; i < 1000; i++) _capDaub(g, _capRnd() * 512, _capRnd() * 64, 1 + _capRnd() * 12, i % 3 ? '#0b0d14' : '#b9c2cc', _capRnd() * 0.1);
    const pool = g.createLinearGradient(0, 0, 0, 64);
    pool.addColorStop(0, 'rgba(11,13,20,0)'); pool.addColorStop(1, 'rgba(11,13,20,0.35)');
    g.globalAlpha = 1; g.fillStyle = pool; g.fillRect(0, 0, 512, 64);
    g.strokeStyle = '#c9a24a'; g.globalAlpha = 0.6; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 38); g.bezierCurveTo(160, 7, 280, 58, 512, 24); g.stroke();
    _capDry(g, 512, 64, 1200);
    // The frame art is baked once at twice its drawn size.
    S.frame = _capSurface(CAP_METER_W * 2, Math.ceil(CAP_METER_W * 2 * CAP_METER_ASPECT));
    if (frameLoaded) {
        g = S.frame.getContext('2d'); g.imageSmoothingQuality = 'high';
        g.drawImage(_capFrameImg, 0, 0, S.frame.width, S.frame.height);
    }
    _capCache = S;
    return S;
}

// Hooks called by js/skills/sigil-capricorn.js.
function _capOnStacksGained(before, after) {
    if (Math.floor(after / 10) > Math.floor(before / 10)) _capPulseAt = window._capClock;
}
function _capOnStacksLost() { _capShatterAt = window._capClock; }
function _capOnCast() {
    for (let i = 0; i < _capMarks.length; i++) _capMarks[i].active = false;
    for (let i = 0; i < _capParts.length; i++) _capParts[i].active = false;
    _capSprites();
}
function _capOnWallHit(st, x, y, kind) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < 3; i++) {
        const w = st.walls[i], dd = (x - w.curX) * (x - w.curX) + (y - w.curY) * (y - w.curY);
        if (dd < best) { best = dd; idx = i; }
    }
    const w = st.walls[idx], m = _capMarks[_capMarkCursor];
    w.flashAt = st.elapsed;
    _capMarkCursor = (_capMarkCursor + 1) % _capMarks.length;
    const dx = x - w.curX, dy = y - w.curY;
    m.active = true; m.wall = idx; m.kind = kind; m.born = st.elapsed;
    m.x = _capClamp(dx * w.cos + dy * w.sin, -w.w * 0.48, w.w * 0.48);
    m.y = _capClamp(-dx * w.sin + dy * w.cos, -13, 13);
    const gfx = window._gfxLevel || 0;
    if (gfx >= 3 || _mobPerf) return;
    const count = gfx === 0 ? (kind === 'skill' ? 10 : 4) : gfx === 1 ? 3 : 1;
    for (let i = 0; i < count; i++) {
        const p = _capParts[_capPartCursor];
        _capPartCursor = (_capPartCursor + 1) % _capParts.length;
        const a = w.angle - Math.PI / 2 + (i / count - 0.5) * 1.7;
        p.active = true; p.x = x; p.y = y; p.vx = Math.cos(a) * (40 + i * 15); p.vy = Math.sin(a) * (65 + i * 9);
        p.born = st.elapsed; p.life = kind === 'skill' ? 650 : 400; p.size = kind === 'skill' ? 7 : 4; p.index = i % 8;
    }
}

function _drawCapricornStackRing() {
    if (!_hasBuff('lai_kep') || typeof player === 'undefined') return;
    const S = _capSprites(), t = window._capClock, stacks = window._capStacks || 0;
    const shown = Math.min(80, stacks), gfx = window._gfxLevel || 0;
    const decay01 = stacks > 0 ? _capClamp((window._capSinceGain - CAP_WARN_MS) / (CAP_LOSS_MS - CAP_WARN_MS), 0, 1) : 0;
    const loss = (t - _capShatterAt) / 850;
    const r = ((player.width || 40) + 5) * 1.2, d = r * 224 / 91, alpha = 1 - decay01 * 0.65;
    ctx.save(); ctx.translate(player.x, player.y);
    if (stacks >= 80) { ctx.globalAlpha = (0.62 + 0.12 * Math.sin(t * CAP_TAU / 1600)) * alpha; ctx.drawImage(S.horns, -r * 1.65, -r * 1.19, r * 3.3, r * 2.38); }
    for (let i = 0; i < 8; i++) {
        const fill = _capClamp((shown - i * 10) / 10, 0, 1);
        // The empty circle stays as a faint wash, so the ship always wears it.
        ctx.globalAlpha = 0.2; ctx.drawImage(S.arcs[i], -d / 2, -d / 2, d, d);
        if (fill <= 0) continue;
        ctx.save();
        if (fill < 1) {
            const a = -Math.PI / 2 + i * CAP_TAU / 8;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 1.24, a, a + fill * CAP_TAU / 8); ctx.closePath(); ctx.clip();
        }
        ctx.globalAlpha = 0.9 * alpha * (1 - decay01); ctx.drawImage(S.arcs[i], -d / 2, -d / 2, d, d);
        if (decay01 > 0) { ctx.globalAlpha = 0.9 * alpha * decay01; ctx.drawImage(S.cracked[i], -d / 2, -d / 2, d, d); }
        const age = t - _capPulseAt;
        if (i === Math.max(0, Math.ceil(shown / 10) - 1) && age >= 0 && age < 180) {
            ctx.globalAlpha = (1 - age / 180) * 0.5; ctx.drawImage(S.arcs[i], -d / 2 - 2, -d / 2 - 2, d + 4, d + 4);
            ctx.globalAlpha = (1 - age / 180) * 0.14; ctx.drawImage(S.lightBloom, -r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
        }
        ctx.restore();
    }
    for (let i = 0; i < 12; i++) {
        ctx.save(); ctx.rotate(i * CAP_TAU / 12);
        ctx.globalAlpha = (i < shown * 12 / 80 ? 0.7 : 0.17) * alpha;
        ctx.drawImage(S.tick, -2, -r - 8, 4, 9); ctx.restore();
    }
    if (gfx < 3 && !_mobPerf) {
        const count = Math.floor(shown / 80 * (gfx === 0 ? 6 : gfx === 1 ? 3 : 1));
        for (let i = 0; i < count; i++) {
            const p = (t / 2300 + i * 0.17) % 1, a = i * 2.39996;
            ctx.globalAlpha = (1 - p) * 0.4 * alpha;
            ctx.drawImage(S.drops[i], Math.cos(a) * r - 3, Math.sin(a) * r - p * 38 - 3, 6, 6);
        }
        if (loss >= 0 && loss < 1) {
            for (let i = 0; i < (gfx === 0 ? 22 : gfx === 1 ? 11 : 4); i++) {
                const a = i * 2.39996, rr = r + loss * (15 + i % 4 * 8);
                ctx.globalAlpha = (1 - loss) * 0.7;
                ctx.drawImage(S.drops[i % 8], Math.cos(a) * rr - 4, Math.sin(a) * rr + loss * loss * 64 - 4, 8, 8);
            }
        }
    }
    ctx.restore();
}

// Compound Interest's ink circle and horns reach about one radius above the
// ship, so while it is equipped every meter over the ship starts above them.
// The meter frames leave about a fifth of their height empty under the art,
// which is allowed to overlap the circle.
function _capReserveRingSpace() {
    if (!_hasBuff('lai_kep') || typeof player === 'undefined') return;
    const r = ((player.width || 40) + 5) * 1.2;
    const clear = r + 6 - player.height / 2 - CAP_METER_W * CAP_METER_ASPECT * 0.2;
    if ((window._greatSageFrameClearance || 0) < clear) window._greatSageFrameClearance = clear;
}

// Sits on top of the meter stack over the ship: Cancer, Great Sage, Leo, then this.
function _drawCapricornMeter() {
    if (!_hasBuff('thai_son_ap_dinh') || typeof player === 'undefined') return;
    const S = _capSprites(), w = CAP_METER_W, h = w * CAP_METER_ASPECT;
    const tidal = _hasBuff('trieu_hoi') ? 110 * TIDAL_METER_FRAME_ASPECT + 6 : 0;
    const leo = typeof _leoHasFateMeter === 'function' && _leoHasFateMeter() ? 110 * LEO_METER_FRAME_ASPECT + 6 : 0;
    const x = player.x - w / 2;
    const y = player.y - player.height / 2 - h - 6 - (window._greatSageFrameClearance || 0) - tidal - leo;
    const hx = x + w * CAP_METER_HOLE.x0, hy = y + h * CAP_METER_HOLE.y0;
    const hw = w * (CAP_METER_HOLE.x1 - CAP_METER_HOLE.x0), hh = h * (CAP_METER_HOLE.y1 - CAP_METER_HOLE.y0);
    const fill = _capClamp((window._capLey || 0) / 100, 0, 1), t = window._capClock, ready = window._capricornReady;
    ctx.save();
    ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.clip();
    ctx.fillStyle = '#101622'; ctx.fillRect(hx, hy, hw, hh);
    const fw = hw * fill;
    if (fw > 0) {
        ctx.beginPath(); ctx.rect(hx, hy, fw, hh); ctx.clip();
        ctx.drawImage(S.fill, hx, hy, hw, hh);
        // A wet leading edge, like ink still soaking into the paper.
        if (fw < hw - 1) {
            ctx.globalAlpha = 0.55; ctx.drawImage(S.bloom, hx + fw - hh * 1.6, hy - hh * 0.6, hh * 2.2, hh * 2.2);
            ctx.globalAlpha = 0.35; ctx.drawImage(S.lightBloom, hx + fw - hh * 0.9, hy - hh * 0.2, hh * 1.1, hh * 1.4);
        }
        ctx.globalAlpha = 0.15; ctx.drawImage(S.lightBloom, hx + (t * 0.012) % (hw * 1.5) - hw, hy - hh * 2, hw, hh * 5);
    }
    ctx.restore();
    if (ready && !_mobPerf && (window._gfxLevel || 0) < 2) {
        ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 0.0035);
        ctx.drawImage(S.lightBloom, x - 10, y - 8, w + 20, h + 16);
        ctx.globalAlpha = 1;
    }
    if (S.frameLoaded) ctx.drawImage(S.frame, x, y, w, h);
}

function _drawCapricornBackdrop() {
    if (!_hasBuff('lai_kep') && !_hasBuff('thai_son_ap_dinh')) return;
    const S = _capSprites();
    if (!S.backdrop) return;
    const W = canvas.width, H = canvas.height, bw = Math.min(210, W * 0.2), bh = Math.min(560, H * 0.75), drift = Math.sin(window._capClock * 0.00006) * 6;
    ctx.save(); ctx.globalAlpha = 0.23;
    ctx.drawImage(S.backdrop, -bw * 0.26, H - bh + drift, bw, bh);
    ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(S.backdrop, -bw * 0.26, H - bh - drift, bw, bh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.restore();
}

// Rock heaped over the lower half of a buried enemy. A large enemy gets three
// mounds of capped size around its lower rim instead of one stretched slab.
function _drawCapricornBurial(e) {
    if (!(e._capBuryMs > 0)) return;
    const S = _capSprites(), r = (e.size || 40) / 2, fade = Math.min(1, e._capBuryMs / 200);
    ctx.save(); ctx.globalAlpha = 0.95 * fade;
    if (r <= 45) {
        const mw = r * 2.4, mh = mw * 0.5;
        ctx.drawImage(S.mound, e.x - mw / 2, e.y + r * 0.85 - mh, mw, mh);
    } else {
        const mw = Math.min(150, r * 0.9), mh = mw * 0.5;
        ctx.drawImage(S.mound, e.x - r * 0.62 - mw / 2, e.y + r * 0.55 - mh, mw, mh);
        ctx.drawImage(S.mound, e.x + r * 0.62 - mw / 2, e.y + r * 0.55 - mh, mw, mh);
        ctx.drawImage(S.mound, e.x - mw * 0.6, e.y + r * 0.85 - mh * 1.2, mw * 1.2, mh * 1.2);
    }
    if ((window._gfxLevel || 0) < 3) {
        const mw = Math.min(r, 70) * 3;
        ctx.globalAlpha = 0.22 * fade; ctx.drawImage(S.mist, e.x - mw / 2, e.y + Math.min(r, 70) * 0.5, mw, mw * 0.3);
    }
    ctx.restore();
}

function _drawCapricornMountain() {
    const st = window._capMountain;
    if (!st) return;
    const S = _capSprites(), e = st.elapsed, gfx = _mobPerf ? Math.max(2, window._gfxLevel || 0) : (window._gfxLevel || 0), t = window._capClock;
    if (e < 0 || e >= CAP_MF_END_MS) return;
    // A short visual hold on contact at FULL and MED; the game clock keeps running.
    let ve = e;
    if (gfx <= 1 && e >= 350 && e < (gfx === 0 ? 410 : 390)) ve = 350;
    const size = st.fallSize, ground = st.y + size * 0.3, split = _capSmooth((ve - 470) / 430), collapse = _capClamp((ve - 4900) / 400, 0, 1), age = ve - 350;
    const visualH = canvas.width < 600 ? 78 : 108;
    ctx.save();
    // The sky darkens while the mountain closes in and clears after the hit.
    const dim = ve < 350 ? _capSmooth((ve - 120) / 230) * 0.3 : _capClamp(1 - (ve - 350) / 450, 0, 1) * 0.3;
    if (dim > 0) { ctx.globalAlpha = dim; ctx.fillStyle = '#04050b'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (ve < 350) {
        const p = ve / 350, fall = p * p * p, pool = 0.45 + 0.55 * fall;
        ctx.globalAlpha = 0.25 + p * 0.55; ctx.drawImage(S.bloom, st.x - size * 0.62 * pool, ground - size * 0.16, size * 1.24 * pool, size * 0.34);
        ctx.save(); ctx.translate(st.x, st.y); ctx.scale(1, 0.48); ctx.rotate(t * 0.00012);
        ctx.globalAlpha = 0.48 + p * 0.35; ctx.drawImage(S.warning, -170, -170, 340, 340); ctx.restore();
        ctx.globalAlpha = 0.5 + p * 0.4; ctx.drawImage(S.seal, st.x - 17, st.y - 18, 34, 34);
        if (gfx < 3) {
            for (let i = 0; i < (gfx === 0 ? 9 : gfx === 1 ? 5 : 2); i++) {
                const pp = (p + i * 0.12) % 1; ctx.globalAlpha = pp * 0.7;
                ctx.drawImage(S.drops[i % 8], st.x + Math.sin(i * 5) * size * 0.32 - 4, st.y - 180 + pp * 160, 8, 11);
            }
        }
        // The mountain accelerates into the ground, stretched by its speed.
        const drop = (1 - fall) * (ground + size * 0.25), stretch = 1 + 0.09 * fall, top = ground - size * stretch - drop;
        if (gfx < 3) { ctx.globalAlpha = 0.55 * _capClamp(p * 3, 0, 1); ctx.drawImage(S.streaks, st.x - size * 0.42, top - size * 0.75, size * 0.84, size * 0.95); }
        ctx.globalAlpha = _capClamp(p * 5 + 0.1, 0, 1); ctx.drawImage(S.mountain, st.x - size * 0.5 / stretch, top, size / stretch, size * stretch);
        if (gfx < 3) { ctx.globalAlpha = 0.25 * p; ctx.drawImage(S.mist, st.x - size * 0.64, ground - size * 0.64 - drop, size * 1.28, size * 0.24); }
    }
    if (ve >= 350 && ve < 1600) {
        const p = _capClamp(age / 1000, 0, 1), burst = 1 - Math.pow(1 - _capClamp(age / 420, 0, 1), 3);
        // A pale flash of mist, then splashed ink spreading out from under the mountain.
        if (age < 260) { ctx.globalAlpha = (1 - age / 260) * 0.55; ctx.drawImage(S.lightBloom, st.x - size * 0.75, ground - size * 0.4, size * 1.5, size * 0.8); }
        const cw = size * (0.9 + 0.7 * burst);
        ctx.globalAlpha = (1 - p) * 0.85; ctx.drawImage(S.cracks, st.x - cw / 2, ground - cw * 0.32, cw, cw * 0.64);
        if (gfx < 3) {
            const sw = size * (0.6 + 1.5 * burst);
            ctx.globalAlpha = (1 - p) * 0.75; ctx.drawImage(S.splatters[0], st.x - sw / 2, ground - sw * 0.27, sw, sw * 0.54);
            ctx.globalAlpha = (1 - p) * 0.6; ctx.drawImage(S.bloom, st.x - sw * 0.6, ground - sw * 0.3, sw * 1.2, sw * 0.6);
            const rings = gfx === 0 ? 3 : 2;
            for (let i = 0; i < rings; i++) {
                const rp = _capClamp((age - i * 80) / 700, 0, 1), ww = size * (0.4 + rp * 2.1);
                ctx.globalAlpha = (1 - rp) * 0.45; ctx.drawImage(S.mist, st.x - ww / 2, ground - ww * 0.17, ww, ww * 0.34);
                ctx.globalAlpha = (1 - rp) * 0.3; ctx.drawImage(S.ripple, st.x - ww / 2, ground - ww * 0.18, ww, ww * 0.36);
            }
            // Dust curtains thrown sideways along the ground.
            const cp = _capClamp(age / 650, 0, 1), off = size * (0.25 + cp * 0.95);
            ctx.globalAlpha = (1 - cp) * 0.55;
            ctx.drawImage(S.mist, st.x - off - size * 0.45, ground - size * 0.2, size * 0.9, size * 0.3);
            ctx.drawImage(S.mist, st.x + off - size * 0.45, ground - size * 0.2, size * 0.9, size * 0.3);
            const count = gfx === 0 ? 64 : gfx === 1 ? 32 : 8;
            for (let i = 0; i < count; i++) {
                const d = _capDrops[i], dt = age * 0.001, life = age / d.life;
                if (life >= 1) continue;
                const sp = d.speed * 2.1, s = d.size * 1.5;
                ctx.globalAlpha = (1 - life) * 0.75;
                ctx.drawImage(S.drops[i % 8], st.x + Math.cos(d.a) * sp * dt - s / 2, ground + Math.sin(d.a) * sp * dt * 0.5 - 120 * dt + dt * dt * 260 - s / 2, s, s);
            }
        }
    }
    if (ve >= 350 && ve < 900) {
        // The mountain lands, squashes and rebounds, then breaks along its cracks
        // with each piece sliding to the screen it becomes.
        const k = Math.exp(-age / 90) * Math.cos(age / 38), sx = 1 + 0.08 * k, sy = 1 - 0.13 * k;
        for (let i = 0; i < 3; i++) {
            const w = st.walls[i], ratio = 1 - split * 0.72, cw = size * ratio * sx, ch = size * ratio * sy;
            const xx = st.x + (w.cx - st.x) * split - (i - 1) * size * ratio / 3 * split, yy = ground + (w.cy - ground) * split;
            ctx.globalAlpha = 1 - _capSmooth((split - 0.35) / 0.65);
            ctx.drawImage(S.chunks[i], xx - cw * 0.5, yy - ch, cw, ch);
        }
        if (gfx < 3) { ctx.globalAlpha = Math.sin(split * Math.PI) * 0.6; ctx.drawImage(S.mist, st.x - size * 0.6, ground - size * 0.6, size * 1.2, size * 0.6); }
    }
    if (ve >= 350) {
        const appear = _capSmooth((ve - 470) / 430), remain = 1 - _capClamp((e - 900) / 4000, 0, 1), mossGrow = _capClamp((e - 900) / 4000, 0, 1);
        for (let i = 0; i < 3; i++) {
            const w = st.walls[i];
            let wa = appear * (1 - collapse);
            if (w.broken) wa *= 1 - _capClamp((e - w.brokenAt) / 300, 0, 1);
            if (wa <= 0.002) continue;
            const xx = st.x + (w.cx - st.x) * split, yy = ground + (w.cy - ground) * split;
            ctx.save(); ctx.translate(xx, yy + collapse * 18); ctx.rotate(w.angle * split);
            // The ward breathes over the stone and flares where a hit lands.
            const top = -visualH * 0.61, veilH = visualH * 0.95;
            const flash = w.flashAt != null ? Math.max(0, 1 - (e - w.flashAt) / 260) : 0;
            ctx.globalAlpha = Math.min(1, wa * (0.3 + 0.1 * Math.sin(t * 0.003 + i * 1.7)) + wa * flash * 0.45);
            ctx.drawImage(S.veil, -w.w * 0.62, top - veilH * 0.72, w.w * 1.24, veilH);
            ctx.globalAlpha = wa; ctx.drawImage(S.walls[i], -w.w * 0.54, top, w.w * 1.08, visualH);
            ctx.globalAlpha = wa * remain; ctx.drawImage(S.carvings[i], -w.w * 0.54, top, w.w * 1.08, visualH);
            if (gfx < 2) {
                ctx.globalAlpha = wa * mossGrow * 0.8; ctx.drawImage(S.moss[i], -w.w * 0.54, top, w.w * 1.08, visualH);
                // Warm light runs along the carving every 1.8s, out of step between screens.
                const sp = ((e + i * 600) % 1800) / 1800;
                if (sp < 0.6) {
                    const q = sp / 0.6;
                    ctx.globalAlpha = wa * remain * 0.55 * Math.sin(Math.PI * q);
                    ctx.drawImage(S.shine, -w.w * 0.5 + q * w.w - 22, top + visualH * 0.38, 44, visualH * 0.3);
                }
            }
            // Ink motes drift up off the stone.
            if (gfx < 3) {
                const motes = gfx === 0 ? 6 : gfx === 1 ? 3 : 2;
                for (let j = 0; j < motes; j++) {
                    const ph = (e * 0.0006 + j * 0.37 + i * 0.21) % 1;
                    const mx = (-0.45 + ((j * 0.618 + i * 0.3) % 1) * 0.9) * w.w + Math.sin(ph * 6 + j) * 4;
                    ctx.globalAlpha = wa * Math.sin(Math.PI * ph) * 0.7;
                    ctx.drawImage(S.drops[j % 2 ? 2 : 5], mx - 2, top + visualH * 0.1 - ph * visualH * 0.95 - 2, 4, 4);
                }
            }
            ctx.restore();
            if (gfx < 3) { ctx.globalAlpha = wa * 0.35; ctx.drawImage(S.mist, xx - w.w * 0.75, yy + visualH * 0.05, w.w * 1.5, visualH * 0.5); }
        }
        // Ink marks left where enemy fire struck the screens.
        for (let i = 0; i < _capMarks.length; i++) {
            const m = _capMarks[i];
            if (!m.active) continue;
            const w = st.walls[m.wall];
            if (w.broken) continue;
            const mAge = e - m.born, s = m.kind === 'skill' ? 43 : m.kind === 'laser' ? 31 : 19;
            ctx.save(); ctx.translate(w.curX, w.curY); ctx.rotate(w.angle);
            ctx.globalAlpha = Math.min(0.65, appear) * (1 - collapse);
            ctx.drawImage(S.splatters[m.wall], m.x - s / 2, m.y - s / 2, s, s);
            if (mAge < 480 && gfx < 3) { ctx.globalAlpha = (1 - mAge / 480) * 0.5; ctx.drawImage(S.lightBloom, m.x - s, m.y - s, s * 2, s * 2); }
            // A ring spreads through the ward from the struck point.
            if (mAge < 320 && gfx < 3) {
                const rp = mAge / 320, rw = s * (1 + rp * 2.4);
                ctx.globalAlpha = (1 - rp) * 0.55; ctx.drawImage(S.ripple, m.x - rw / 2, m.y - rw * 0.2, rw, rw * 0.4);
            }
            ctx.restore();
        }
    }
    if (gfx < 3) {
        for (let i = 0; i < _capParts.length; i++) {
            const p = _capParts[i];
            if (!p.active) continue;
            const pAge = e - p.born, dt = pAge * 0.001;
            if (pAge < 0 || pAge >= p.life) { p.active = false; continue; }
            ctx.globalAlpha = (1 - pAge / p.life) * 0.85;
            ctx.drawImage(S.drops[p.index], p.x + p.vx * dt - p.size / 2, p.y + p.vy * dt + dt * dt * 100 - p.size / 2, p.size, p.size);
        }
    }
    if (collapse > 0 && gfx < 3) {
        for (let i = 0; i < 3; i++) {
            const w = st.walls[i];
            ctx.globalAlpha = (1 - collapse) * 0.5;
            ctx.drawImage(S.mist, w.cx - w.w * 0.7, w.cy - visualH * 0.8 - collapse * 60, w.w * 1.4, visualH * 0.9);
        }
    }
    ctx.restore();
}
