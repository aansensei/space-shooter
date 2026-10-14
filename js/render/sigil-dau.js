// Dawn Herald artwork is baked once, when the sigil is picked. Live passes only transform cached sprites.
let _dauRenderCache = null;
const _dauChargeParticles = [];
for (let i = 0; i < 24; i++) _dauChargeParticles.push({ phase: i * 0.618034, angle: i * 2.39996, feather: i % 4 === 0 });
const _dauRibbonX = new Float32Array(32);
const _dauRibbonY = new Float32Array(32);

function _dauBake(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    return c;
}

// Draws a calligraphic cubic bezier stroke whose width swells and tapers like a brush.
function _dauBrushBezier(g, x0, y0, x1, y1, x2, y2, x3, y3, w0, wMid, w1, fill) {
    const steps = 10;
    g.fillStyle = fill;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, u = 1 - t, uu = u * u, tt = t * t;
        const x = uu * u * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + tt * t * x3;
        const y = uu * u * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + tt * t * y3;
        const dx = 3 * uu * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * tt * (x3 - x2);
        const dy = 3 * uu * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * tt * (y3 - y2);
        const inv = 0.5 / (Math.hypot(dx, dy) || 1);
        const bell = 4 * t * u;
        const w = ((u * w0 + t * w1) * (1 - bell) + wMid * bell) * inv;
        const ox = -dy * w, oy = dx * w;
        if (i === 0) g.moveTo(x + ox, y + oy); else g.lineTo(x + ox, y + oy);
        _dauRibbonX[i] = x - ox;
        _dauRibbonY[i] = y - oy;
    }
    for (let i = steps; i >= 0; i--) g.lineTo(_dauRibbonX[i], _dauRibbonY[i]);
    g.closePath();
    g.fill();
}

// Draws a tapered circular arc stroke with brush pressure modulation.
function _dauBrushArc(g, cx, cy, r, a0, a1, w0, wMid, w1, fill) {
    const steps = Math.max(8, Math.min(28, Math.ceil(Math.abs(a1 - a0) * 4.5)));
    g.fillStyle = fill;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, u = 1 - t, a = a0 + (a1 - a0) * t;
        const bell = 4 * t * u;
        const hw = ((u * w0 + t * w1) * (1 - bell) + wMid * bell) * 0.5;
        const c = Math.cos(a), s = Math.sin(a);
        const px = cx + c * (r + hw), py = cy + s * (r + hw);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        _dauRibbonX[i] = cx + c * (r - hw);
        _dauRibbonY[i] = cy + s * (r - hw);
    }
    for (let i = steps; i >= 0; i--) g.lineTo(_dauRibbonX[i], _dauRibbonY[i]);
    g.closePath();
    g.fill();
}

// Paints a small faceted gold leaf flake instead of a round particle.
function _dauFoil(g, x, y, r, angle, fill) {
    const c = Math.cos(angle) * r, s = Math.sin(angle) * r;
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(x - c * 1.25, y - s * 1.25);
    g.lineTo(x - c * 0.15 + s * 0.75, y - s * 0.15 - c * 0.75);
    g.lineTo(x + c * 1.15 - s * 0.15, y + s * 1.15 + c * 0.15);
    g.lineTo(x + c * 0.15 - s * 0.80, y + s * 0.15 + c * 0.80);
    g.closePath();
    g.fill();
}

// Paints a scrolling auspicious cloud head with an inner spiral hook.
function _dauCloudScroll(g, x, y, scale, flip, wash, stroke) {
    g.save();
    g.translate(x, y);
    g.scale(scale * (flip ? -1 : 1), scale);
    g.fillStyle = wash;
    g.beginPath();
    g.moveTo(-36, 8);
    g.bezierCurveTo(-38, -12, -16, -24, 2, -16);
    g.bezierCurveTo(14, -26, 36, -16, 34, 2);
    g.bezierCurveTo(44, 6, 42, 20, 26, 20);
    g.bezierCurveTo(6, 22, -22, 20, -36, 8);
    g.closePath();
    g.fill();
    _dauBrushBezier(g, -36, 8, -38, -14, -12, -24, 4, -12, 0.8, 3.2, 1.0, stroke);
    _dauBrushBezier(g, 2, -15, 18, -26, 38, -12, 30, 5, 1.0, 3.0, 1.2, stroke);
    _dauBrushBezier(g, 30, 4, 22, 14, 8, 10, 14, 0, 1.2, 2.2, 0.6, '#FFF9D2');
    _dauBrushBezier(g, -34, 9, -12, 18, 18, 18, 38, 12, 0.6, 2.2, 0.5, '#FFA81C');
    g.restore();
}

function _dauSprites() {
    if (_dauRenderCache) return _dauRenderCache;

    const glow = _dauBake(128, 128, g => {
        const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62);
        grad.addColorStop(0, '#FFF9D2');
        grad.addColorStop(0.16, 'rgba(255,210,63,0.72)');
        grad.addColorStop(0.42, 'rgba(255,168,28,0.22)');
        grad.addColorStop(0.75, 'rgba(184,121,26,0.08)');
        grad.addColorStop(1, 'rgba(184,121,26,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + 0.35;
            _dauBrushArc(g, 64, 64, 38, a, a + 1.15, 0.4, 2.0, 0.4, 'rgba(255,210,63,0.55)');
            _dauBrushArc(g, 64, 64, 34, a + 0.85, a + 1.35, 1.6, 1.2, 0.3, 'rgba(255,249,210,0.65)');
            _dauFoil(g, 64 + Math.cos(a + 0.5) * 45, 64 + Math.sin(a + 0.5) * 45, 2.2, a, '#FFD23F');
        }
    });

    const specks = _dauBake(64, 64, g => {
        const pts = [
            [32, 30, 4.2, 0.4, '#FFF9D2'],
            [20, 22, 3.4, 1.1, '#FFD23F'],
            [44, 24, 3.0, -0.5, '#FFD23F'],
            [25, 42, 3.2, 0.8, '#FFA81C'],
            [41, 40, 2.6, 2.1, '#FFD23F'],
            [14, 34, 2.1, 0.2, '#FFA81C'],
            [49, 33, 2.0, 1.5, '#FFF9D2']
        ];
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            _dauFoil(g, p[0], p[1], p[2], p[3], p[4]);
        }
    });

    const cloud = _dauBake(256, 96, g => {
        const wash = 'rgba(255,168,28,0.16)';
        _dauBrushBezier(g, 8, 62, 54, 72, 112, 38, 168, 52, 0.4, 3.4, 0.8, 'rgba(184,121,26,0.45)');
        _dauCloudScroll(g, 88, 48, 0.95, false, wash, '#FFD23F');
        _dauCloudScroll(g, 152, 42, 1.1, false, wash, '#FFD23F');
        _dauCloudScroll(g, 198, 52, 0.78, false, 'rgba(255,168,28,0.12)', '#FFA81C');
        _dauBrushBezier(g, 14, 56, 62, 42, 118, 66, 242, 48, 0.3, 2.6, 0.3, '#FFD23F');
        _dauBrushBezier(g, 36, 64, 96, 54, 158, 72, 232, 58, 0.2, 1.6, 0.2, '#FFF9D2');
        for (let i = 0; i < 7; i++) {
            _dauFoil(g, 38 + i * 28, 34 + (i % 3) * 11, 2.0 + (i % 2), i * 0.9, i % 2 ? '#FFD23F' : '#FFF9D2');
        }
    });

    const foam = _dauBake(128, 64, g => {
        g.fillStyle = 'rgba(255,168,28,0.18)';
        g.beginPath();
        g.moveTo(10, 48);
        g.quadraticCurveTo(64, 14, 118, 48);
        g.quadraticCurveTo(64, 30, 10, 48);
        g.fill();
        _dauBrushBezier(g, 8, 48, 36, 20, 62, 18, 78, 32, 0.6, 3.8, 1.0, '#FFD23F');
        _dauBrushBezier(g, 52, 32, 74, 14, 98, 20, 120, 46, 0.8, 3.4, 0.6, '#FFD23F');
        _dauBrushBezier(g, 20, 40, 48, 18, 78, 18, 106, 38, 0.4, 2.0, 0.4, '#FFF9D2');
        const drops = [[34, 18, 2.8], [52, 14, 3.4], [66, 12, 3.8], [82, 15, 3.0], [96, 22, 2.4], [22, 28, 2.2], [108, 30, 2.2]];
        for (let i = 0; i < drops.length; i++) {
            const d = drops[i];
            g.fillStyle = i % 3 === 0 ? '#FFD23F' : '#FFF9D2';
            g.beginPath();
            g.arc(d[0], d[1], d[2], 0, Math.PI * 2);
            g.fill();
        }
    });

    const ring = _dauBake(768, 768, g => {
        const cx = 384, cy = 384;
        const grad = g.createRadialGradient(cx, cy, 300, cx, cy, 382);
        grad.addColorStop(0, 'rgba(184,121,26,0)');
        grad.addColorStop(0.55, 'rgba(184,121,26,0.10)');
        grad.addColorStop(0.82, 'rgba(255,168,28,0.22)');
        grad.addColorStop(0.95, 'rgba(255,210,63,0.45)');
        grad.addColorStop(0.98, 'rgba(255,249,210,0.65)');
        grad.addColorStop(1, 'rgba(255,210,63,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(cx, cy, 382, 0, Math.PI * 2);
        g.fill();
        const crests = 24;
        for (let i = 0; i < crests; i++) {
            const a0 = i * Math.PI * 2 / crests;
            const a1 = (i + 1) * Math.PI * 2 / crests;
            const rPeak = 374 + (i % 3 === 0 ? 3 : 0);
            _dauBrushArc(g, cx, cy, rPeak, a0 - 0.03, a1 + 0.03, 0.8, 3.4, 0.8, '#FFD23F');
            _dauBrushArc(g, cx, cy, rPeak + 1.5, a0 + 0.04, a1 - 0.04, 0.4, 1.8, 0.4, '#FFF9D2');
            _dauBrushArc(g, cx, cy, 354 + (i % 2) * 4, a0, a1, 0.5, 2.0, 0.5, 'rgba(255,168,28,0.65)');
            _dauBrushArc(g, cx, cy, 332 + (i % 3) * 3, a0 + 0.05, a1 + 0.05, 0.3, 1.4, 0.3, 'rgba(184,121,26,0.45)');
            const am = (a0 + a1) * 0.5;
            g.fillStyle = '#FFF9D2';
            g.beginPath();
            g.arc(cx + Math.cos(am) * (rPeak + 3), cy + Math.sin(am) * (rPeak + 3), 2.2, 0, Math.PI * 2);
            g.fill();
        }
    });

    const thinRing = _dauBake(512, 512, g => {
        const cx = 256, cy = 256, r = 250;
        const segs = 12;
        for (let i = 0; i < segs; i++) {
            const a0 = i * Math.PI * 2 / segs;
            const a1 = (i + 1) * Math.PI * 2 / segs;
            _dauBrushArc(g, cx, cy, r, a0 - 0.04, a1 + 0.04, 1.0, 3.4, 1.0, '#FFD23F');
            _dauBrushArc(g, cx, cy, r + 0.8, a0 + 0.06, a1 - 0.06, 0.4, 1.6, 0.4, '#FFF9D2');
            _dauBrushArc(g, cx, cy, r - 6, a0 + 0.08, a1 - 0.02, 0.3, 1.2, 0.3, 'rgba(255,168,28,0.55)');
        }
    });

    const bronzeRing = _dauBake(512, 512, g => {
        const cx = 256, cy = 256;
        const segs = 16;
        for (let i = 0; i < segs; i++) {
            const a0 = i * Math.PI * 2 / segs;
            const a1 = (i + 1) * Math.PI * 2 / segs;
            _dauBrushArc(g, cx, cy, 246 + (i % 2) * 3, a0, a1, 0.5, 2.6, 0.5, 'rgba(184,121,26,0.55)');
            _dauBrushArc(g, cx, cy, 232 - (i % 3) * 3, a0 + 0.06, a1 - 0.04, 0.3, 1.6, 0.3, 'rgba(255,168,28,0.32)');
            if (i % 2 === 0) {
                const am = (a0 + a1) * 0.5;
                _dauFoil(g, cx + Math.cos(am) * 240, cy + Math.sin(am) * 240, 2.2, am, 'rgba(255,210,63,0.45)');
            }
        }
    });

    const ray = _dauBake(64, 512, g => {
        const wash = g.createLinearGradient(0, 0, 64, 0);
        wash.addColorStop(0, 'rgba(255,168,28,0)');
        wash.addColorStop(0.5, 'rgba(255,168,28,0.26)');
        wash.addColorStop(1, 'rgba(255,168,28,0)');
        g.fillStyle = wash;
        g.beginPath();
        g.moveTo(8, 0); g.lineTo(56, 0); g.lineTo(34, 512); g.lineTo(30, 512);
        g.closePath();
        g.fill();
        // Woodcut sunbeam needles of alternating reach.
        const beams = [
            [32, 32, 12, 0.6, 3.8, '#FFF9D2'],
            [30, 20, 64, 0.4, 2.4, '#FFD23F'],
            [34, 44, 48, 0.4, 2.4, '#FFD23F'],
            [29, 10, 130, 0.3, 1.8, '#FFA81C'],
            [35, 54, 110, 0.3, 1.8, '#FFA81C']
        ];
        for (let i = 0; i < beams.length; i++) {
            const b = beams[i];
            _dauBrushBezier(g, b[0], 508, (b[0] + b[1]) * 0.5, 320, b[1], 160, b[1], b[2], b[3], b[4], 0.2, b[5]);
        }
        g.globalCompositeOperation = 'destination-in';
        const fade = g.createLinearGradient(0, 0, 0, 512);
        fade.addColorStop(0, 'rgba(255,255,255,0)');
        fade.addColorStop(0.18, 'rgba(255,255,255,0.85)');
        fade.addColorStop(0.55, '#fff');
        fade.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = fade;
        g.fillRect(0, 0, 64, 512);
    });

    const dawn = _dauBake(16, 512, g => {
        const grad = g.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, 'rgba(184,121,26,0)');
        grad.addColorStop(0.32, 'rgba(184,121,26,0.16)');
        grad.addColorStop(0.68, 'rgba(255,168,28,0.44)');
        grad.addColorStop(0.88, 'rgba(255,210,63,0.68)');
        grad.addColorStop(1, 'rgba(255,81,0,0.78)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 16, 512);
        // Horizontal mist strata suggest layered dawn clouds.
        const bands = [
            [150, 18, 'rgba(255,168,28,0.22)', 'rgba(255,210,63,0.45)'],
            [235, 24, 'rgba(255,168,28,0.28)', 'rgba(255,210,63,0.55)'],
            [320, 28, 'rgba(255,210,63,0.32)', 'rgba(255,249,210,0.62)'],
            [405, 32, 'rgba(255,210,63,0.36)', 'rgba(255,249,210,0.72)'],
            [468, 22, 'rgba(255,81,0,0.28)', 'rgba(255,210,63,0.75)']
        ];
        for (let i = 0; i < bands.length; i++) {
            const b = bands[i], y = b[0], h = b[1];
            const bg = g.createLinearGradient(0, y - h, 0, y + h);
            bg.addColorStop(0, 'rgba(255,168,28,0)');
            bg.addColorStop(0.5, b[2]);
            bg.addColorStop(1, 'rgba(255,168,28,0)');
            g.fillStyle = bg;
            g.fillRect(0, y - h, 16, h * 2);
            g.fillStyle = b[3];
            g.fillRect(0, y - 1, 16, 2);
        }
    });

    const needle = _dauBake(128, 24, g => {
        // Embroidery needle with tail eye, metallic ridge and warm platinum point glint.
        const wash = g.createLinearGradient(6, 0, 124, 0);
        wash.addColorStop(0, '#B8791A');
        wash.addColorStop(0.22, '#FFA81C');
        wash.addColorStop(0.72, '#FFD23F');
        wash.addColorStop(1, '#FFF9D2');
        g.fillStyle = wash;
        g.beginPath();
        g.moveTo(6, 12);
        g.quadraticCurveTo(22, 7.5, 46, 8.8);
        g.lineTo(124, 12);
        g.lineTo(46, 15.2);
        g.quadraticCurveTo(22, 16.5, 6, 12);
        g.closePath();
        g.fill();
        // Cut out the needle eye at the tail.
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.ellipse(19, 12, 6.5, 1.7, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        g.strokeStyle = '#FFD23F';
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(19, 12, 6.8, 2.0, 0, 0, Math.PI * 2);
        g.stroke();
        // Silk thread loop passing through the needle eye.
        _dauBrushBezier(g, 1, 14, 6, 9, 11, 10, 15, 12, 0.5, 1.4, 0.8, '#FFD23F');
        // Specular ridge along the shaft.
        _dauBrushBezier(g, 27, 12, 58, 11.2, 92, 11.5, 123, 12, 0.8, 1.8, 0.6, '#FFF9D2');
        // Platinum star glint at the sharp tip.
        g.fillStyle = '#FFF9D2';
        g.beginPath();
        g.arc(118, 12, 2.6, 0, Math.PI * 2);
        g.fill();
        _dauBrushBezier(g, 108, 12, 115, 12, 121, 12, 127, 12, 0.3, 2.8, 0.3, '#FFF9D2');
        _dauBrushBezier(g, 118, 4, 118, 9, 118, 15, 118, 20, 0.2, 2.2, 0.2, '#FFF9D2');
    });

    const trail = _dauBake(256, 16, g => {
        // Golden silk thread tapered at both ends with a gentle wave undulation.
        const silk = g.createLinearGradient(0, 0, 256, 0);
        silk.addColorStop(0, 'rgba(184,121,26,0)');
        silk.addColorStop(0.15, 'rgba(255,168,28,0.55)');
        silk.addColorStop(0.55, '#FFD23F');
        silk.addColorStop(0.88, '#FFF9D2');
        silk.addColorStop(1, 'rgba(255,249,210,0)');
        _dauBrushBezier(g, 2, 8, 86, 4.5, 170, 11.5, 254, 8, 0.2, 3.6, 0.2, silk);
        const core = g.createLinearGradient(0, 0, 256, 0);
        core.addColorStop(0, 'rgba(255,210,63,0)');
        core.addColorStop(0.25, 'rgba(255,249,210,0.7)');
        core.addColorStop(0.85, '#FFF9D2');
        core.addColorStop(1, 'rgba(255,249,210,0)');
        _dauBrushBezier(g, 12, 8, 86, 5.2, 170, 10.8, 250, 8, 0.1, 1.5, 0.1, core);
    });

    const feather = _dauBake(96, 32, g => {
        // Long curved rooster plume with distinct rachis, gongbi barbs and feibai splits.
        const vane = g.createLinearGradient(6, 26, 90, 6);
        vane.addColorStop(0, 'rgba(184,121,26,0.18)');
        vane.addColorStop(0.45, 'rgba(255,168,28,0.42)');
        vane.addColorStop(0.82, 'rgba(255,210,63,0.62)');
        vane.addColorStop(1, 'rgba(255,81,0,0.45)');
        g.fillStyle = vane;
        g.beginPath();
        g.moveTo(8, 26);
        g.bezierCurveTo(28, 4, 62, 1, 92, 7);
        g.bezierCurveTo(68, 17, 42, 29, 8, 26);
        g.closePath();
        g.fill();
        // Fine individual barbs with dry brush gaps.
        for (let i = 0; i < 11; i++) {
            const t = (i + 1) / 12;
            const sx = 8 + t * 78, sy = 26 - Math.sin(t * 1.35) * 19;
            const col = i > 8 ? '#FF5100' : i % 2 ? '#FFD23F' : '#FFA81C';
            _dauBrushBezier(g, sx, sy, sx + 5, sy - 5, sx + 10, sy - 7, sx + 14, sy - 6, 0.9, 1.3, 0.2, col);
            _dauBrushBezier(g, sx, sy, sx + 4, sy + 3, sx + 9, sy + 5, sx + 13, sy + 4, 0.8, 1.1, 0.2, '#FFD23F');
        }
        // Bright central rachis shaft.
        _dauBrushBezier(g, 3, 28, 32, 14, 62, 8, 93, 6, 1.8, 2.2, 0.5, '#FFF9D2');
    });

    const star = _dauBake(96, 96, g => {
        // Classical star chart node: thin golden ring, bright center dot and four short rays.
        const halo = g.createRadialGradient(48, 48, 0, 48, 48, 40);
        halo.addColorStop(0, 'rgba(255,249,210,0.85)');
        halo.addColorStop(0.25, 'rgba(255,210,63,0.38)');
        halo.addColorStop(0.65, 'rgba(255,168,28,0.10)');
        halo.addColorStop(1, 'rgba(184,121,26,0)');
        g.fillStyle = halo;
        g.beginPath();
        g.arc(48, 48, 40, 0, Math.PI * 2);
        g.fill();
        _dauBrushArc(g, 48, 48, 15, 0, Math.PI * 2, 1.6, 2.2, 1.6, '#FFD23F');
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2;
            const c = Math.cos(a), s = Math.sin(a);
            _dauBrushBezier(g, 48 + c * 9, 48 + s * 9, 48 + c * 20, 48 + s * 20, 48 + c * 30, 48 + s * 30, 48 + c * 41, 48 + s * 41, 1.2, 3.6, 0.3, '#FFD23F');
            _dauBrushBezier(g, 48 + c * 10, 48 + s * 10, 48 + c * 18, 48 + s * 18, 48 + c * 26, 48 + s * 26, 48 + c * 35, 48 + s * 35, 0.8, 1.8, 0.2, '#FFF9D2');
            const d = a + Math.PI / 4, cd = Math.cos(d), sd = Math.sin(d);
            _dauBrushBezier(g, 48 + cd * 14, 48 + sd * 14, 48 + cd * 18, 48 + sd * 18, 48 + cd * 21, 48 + sd * 21, 48 + cd * 24, 48 + sd * 24, 1.0, 1.8, 0.2, '#FFA81C');
        }
        g.fillStyle = '#FFF9D2';
        g.beginPath();
        g.arc(48, 48, 5.2, 0, Math.PI * 2);
        g.fill();
    });

    const sun = _dauBake(96, 96, g => {
        // Daybreak mark: vermilion solar disc, crisp gold rim and eight alternating short rays readable at 34px.
        const bg = g.createRadialGradient(48, 48, 4, 48, 48, 44);
        bg.addColorStop(0, 'rgba(255,81,0,0.45)');
        bg.addColorStop(0.45, 'rgba(255,168,28,0.22)');
        bg.addColorStop(1, 'rgba(184,121,26,0)');
        g.fillStyle = bg;
        g.beginPath();
        g.arc(48, 48, 44, 0, Math.PI * 2);
        g.fill();
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4, major = i % 2 === 0;
            const r0 = 21, r1 = major ? 44 : 35, w = major ? 7.5 : 5.0;
            g.save();
            g.translate(48, 48);
            g.rotate(a);
            g.fillStyle = major ? '#FFD23F' : '#FFA81C';
            g.beginPath();
            g.moveTo(r0, -w * 0.5);
            g.quadraticCurveTo((r0 + r1) * 0.5, -w * 0.22, r1, 0);
            g.quadraticCurveTo((r0 + r1) * 0.5, w * 0.22, r0, w * 0.5);
            g.closePath();
            g.fill();
            if (major) {
                g.fillStyle = '#FFF9D2';
                g.beginPath();
                g.moveTo(r0 + 1, -1.4);
                g.lineTo(r1 - 3, 0);
                g.lineTo(r0 + 1, 1.4);
                g.closePath();
                g.fill();
            }
            g.restore();
        }
        const disc = g.createRadialGradient(46, 46, 2, 48, 48, 16);
        disc.addColorStop(0, '#FFA81C');
        disc.addColorStop(0.35, '#FF5100');
        disc.addColorStop(1, 'rgba(255,81,0,0.85)');
        g.fillStyle = disc;
        g.beginPath();
        g.arc(48, 48, 15.5, 0, Math.PI * 2);
        g.fill();
        _dauBrushArc(g, 48, 48, 16.5, 0, Math.PI * 2, 3.0, 3.8, 3.0, '#FFD23F');
        _dauBrushArc(g, 48, 48, 16.5, -0.8, 1.8, 1.0, 2.0, 1.0, '#FFF9D2');
        g.fillStyle = '#FFF9D2';
        g.beginPath();
        g.arc(48, 48, 3.2, 0, Math.PI * 2);
        g.fill();
    });

    const crack = _dauBake(256, 384, g => {
        // Concentric water ripples and upward splash arcs where a star needle strikes.
        const cx = 128, cy = 248;
        const pool = g.createRadialGradient(cx, cy, 4, cx, cy, 118);
        pool.addColorStop(0, 'rgba(255,249,210,0.55)');
        pool.addColorStop(0.35, 'rgba(255,210,63,0.24)');
        pool.addColorStop(0.75, 'rgba(255,168,28,0.08)');
        pool.addColorStop(1, 'rgba(184,121,26,0)');
        g.fillStyle = pool;
        g.beginPath();
        g.ellipse(cx, cy, 116, 68, 0, 0, Math.PI * 2);
        g.fill();
        const radii = [[42, 22, 3.4, '#FFF9D2'], [76, 40, 2.8, '#FFD23F'], [108, 56, 2.0, '#FFA81C']];
        for (let r = 0; r < radii.length; r++) {
            const rx = radii[r][0], ry = radii[r][1], w = radii[r][2], col = radii[r][3];
            g.save();
            g.translate(cx, cy);
            g.scale(1, ry / rx);
            _dauBrushArc(g, 0, 0, rx, -0.3, Math.PI + 0.3, 0.6, w, 0.6, col);
            _dauBrushArc(g, 0, 0, rx, Math.PI - 0.2, Math.PI * 2 + 0.2, 0.5, w * 0.85, 0.5, col);
            g.restore();
        }
        // Upward water splash plumes and hooked wave claws.
        const plumes = [
            [0, 0, -18, -75, -8, -155, 6, -218, 4.5, '#FFF9D2'],
            [-12, -4, -48, -68, -68, -132, -52, -176, 3.6, '#FFD23F'],
            [12, -4, 46, -72, 66, -138, 48, -184, 3.6, '#FFD23F'],
            [-24, 4, -72, -38, -96, -82, -84, -118, 2.8, '#FFA81C'],
            [24, 4, 70, -40, 98, -86, 82, -122, 2.8, '#FFA81C'],
            [-8, 12, -36, 48, -48, 84, -28, 114, 2.4, '#FFD23F'],
            [10, 12, 38, 46, 52, 82, 32, 112, 2.4, '#FFD23F']
        ];
        for (let i = 0; i < plumes.length; i++) {
            const p = plumes[i];
            _dauBrushBezier(g, cx + p[0], cy + p[1], cx + p[2], cy + p[3], cx + p[4], cy + p[5], cx + p[6], cy + p[7], 1.2, p[8], 0.4, p[9]);
            g.fillStyle = '#FFF9D2';
            g.beginPath();
            g.arc(cx + p[6], cy + p[7], 2.8, 0, Math.PI * 2);
            g.fill();
        }
        for (let i = 0; i < 12; i++) {
            const a = i * 0.52, d = 28 + (i % 4) * 22;
            _dauFoil(g, cx + Math.cos(a) * d, cy - 30 + Math.sin(a) * d * 0.8, 2.6, a, i % 2 ? '#FFF9D2' : '#FFD23F');
        }
    });

    const solar = _dauBake(640, 640, g => {
        const cx = 320, cy = 320;
        const aura = g.createRadialGradient(cx, cy, 20, cx, cy, 310);
        aura.addColorStop(0, 'rgba(255,249,210,0.48)');
        aura.addColorStop(0.28, 'rgba(255,81,0,0.34)');
        aura.addColorStop(0.45, 'rgba(255,168,28,0.22)');
        aura.addColorStop(0.72, 'rgba(184,121,26,0.10)');
        aura.addColorStop(1, 'rgba(184,121,26,0)');
        g.fillStyle = aura;
        g.fillRect(0, 0, 640, 640);
        // Woodcut radiating beams alternating long and short around the halo.
        for (let i = 0; i < 36; i++) {
            const a = i * Math.PI * 2 / 36;
            const r0 = 122, r1 = i % 2 === 0 ? 294 : 226 + (i % 3) * 18;
            const w = i % 2 === 0 ? 4.4 : 2.6;
            const c = Math.cos(a), s = Math.sin(a);
            _dauBrushBezier(g, cx + c * r0, cy + s * r0, cx + c * (r0 + 50), cy + s * (r0 + 50), cx + c * (r1 - 30), cy + s * (r1 - 30), cx + c * r1, cy + s * r1, 1.0, w, 0.2, i % 2 === 0 ? 'rgba(255,210,63,0.68)' : 'rgba(255,168,28,0.48)');
        }
        // Vermilion solar disc at center.
        const disc = g.createRadialGradient(cx, cy, 8, cx, cy, 120);
        disc.addColorStop(0, 'rgba(255,249,210,0.75)');
        disc.addColorStop(0.32, 'rgba(255,168,28,0.58)');
        disc.addColorStop(0.72, 'rgba(255,81,0,0.52)');
        disc.addColorStop(1, 'rgba(255,81,0,0.12)');
        g.fillStyle = disc;
        g.beginPath();
        g.arc(cx, cy, 120, 0, Math.PI * 2);
        g.fill();
        // Concentric calligraphic gold halo rings.
        const haloRadii = [[120, 4.2, '#FFD23F'], [142, 2.8, '#FFF9D2'], [166, 2.2, '#FFD23F'], [216, 1.8, '#FFA81C']];
        for (let r = 0; r < haloRadii.length; r++) {
            const rad = haloRadii[r][0], w = haloRadii[r][1], col = haloRadii[r][2];
            for (let k = 0; k < 4; k++) {
                const a0 = k * Math.PI / 2 + r * 0.25, a1 = a0 + Math.PI / 2 - 0.06;
                _dauBrushArc(g, cx, cy, rad, a0, a1, 0.8, w, 0.8, col);
            }
        }
        // Continuous wreath of scrolling auspicious clouds hugging the solar halo.
        for (let i = 0; i < 12; i++) {
            const a0 = i * Math.PI * 2 / 12, a1 = (i + 1) * Math.PI * 2 / 12;
            const am = (a0 + a1) * 0.5;
            _dauBrushArc(g, cx, cy, 186 + (i % 2) * 8, a0 - 0.08, a1 + 0.08, 0.6, 3.6, 0.6, '#FFD23F');
            _dauBrushArc(g, cx, cy, 182 + (i % 2) * 6, a0 + 0.04, a1 - 0.04, 0.4, 2.0, 0.4, '#FFF9D2');
            const hx = cx + Math.cos(am) * 190, hy = cy + Math.sin(am) * 190;
            g.save();
            g.translate(hx, hy);
            g.rotate(am + Math.PI / 2);
            _dauBrushBezier(g, -18, 2, -10, -10, 10, -10, 16, 2, 0.8, 2.6, 1.0, '#FFD23F');
            _dauBrushBezier(g, 16, 2, 12, 10, 2, 8, 6, 0, 1.0, 1.8, 0.4, '#FFF9D2');
            g.restore();
        }
    });

    const fireBand = _dauBake(192, 128, g => {
        // Seamless tidal wave segment. Period is 153.6px so overlapping 1.25x segments lock in phase.
        // In segment space, y = 22 sits at r.radius, and wave hooks reach at most y = 16 (6px outward).
        const period = 153.6;
        const bodyGrad = g.createLinearGradient(0, 18, 0, 120);
        bodyGrad.addColorStop(0, 'rgba(255,210,63,0.46)');
        bodyGrad.addColorStop(0.16, 'rgba(255,168,28,0.28)');
        bodyGrad.addColorStop(0.52, 'rgba(184,121,26,0.14)');
        bodyGrad.addColorStop(1, 'rgba(184,121,26,0)');
        g.fillStyle = bodyGrad;
        g.beginPath();
        g.moveTo(0, 122);
        for (let x = 0; x <= 192; x += 2) {
            const u = x / period * Math.PI * 2;
            const yCrest = 22 - 2.6 * Math.sin(u * 3) - 1.8 * Math.cos(u) - 0.8 * Math.sin(u * 6);
            g.lineTo(x, Math.max(16.2, yCrest));
        }
        g.lineTo(192, 122);
        g.closePath();
        g.fill();

        // Receding water streaks and third layer ripples in bronze and amber.
        const subLayers = [
            [36, 3.0, 2.6, '#FFA81C', 3],
            [52, 3.5, 2.0, 'rgba(255,168,28,0.68)', 2],
            [72, 4.0, 1.5, 'rgba(184,121,26,0.52)', 3],
            [94, 3.2, 1.1, 'rgba(184,121,26,0.34)', 1]
        ];
        for (let l = 0; l < subLayers.length; l++) {
            const base = subLayers[l][0], amp = subLayers[l][1], lw = subLayers[l][2], col = subLayers[l][3], freq = subLayers[l][4];
            g.strokeStyle = col;
            g.lineWidth = lw;
            g.beginPath();
            for (let x = 0; x <= 192; x += 3) {
                const u = x / period * Math.PI * 2;
                const y = base + Math.sin(u * freq + l * 1.1) * amp + Math.cos(u) * 1.6;
                if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.stroke();
        }

        // Scalloped imbricated water arcs behind the main wave crest.
        const stepW = period / 3;
        for (let k = -1; k < 5; k++) {
            const x0 = k * stepW;
            const tall = ((k % 3) + 3) % 3 === 1;
            const peakY = tall ? 16.4 : 18.6;
            _dauBrushBezier(g, x0 + 4, 42, x0 + stepW * 0.35, 27, x0 + stepW * 0.72, 29, x0 + stepW + 4, 42, 0.5, 2.4, 0.5, '#FFA81C');
            _dauBrushBezier(g, x0 + 18, 60, x0 + stepW * 0.45, 45, x0 + stepW * 0.82, 47, x0 + stepW + 18, 60, 0.4, 1.8, 0.4, 'rgba(184,121,26,0.65)');
            _dauBrushBezier(g, x0, 25, x0 + stepW * 0.36, 21, x0 + stepW * 0.64, peakY, x0 + stepW * 0.88, peakY + 2.5, 1.4, 4.4, 1.8, '#FFD23F');
            _dauBrushBezier(g, x0 + 6, 26, x0 + stepW * 0.40, 22.5, x0 + stepW * 0.66, peakY + 1.8, x0 + stepW * 0.90, peakY + 4.2, 0.8, 2.4, 0.8, '#FFA81C');
            const hx = x0 + stepW * 0.76, hy = peakY + 0.8;
            _dauBrushBezier(g, hx - 10, hy + 2.2, hx - 2, hy - 0.8, hx + 9, hy + 0.4, hx + 5, hy + 5.8, 1.6, 3.0, 0.6, '#FFF9D2');
            _dauBrushBezier(g, hx + 4, hy + 0.8, hx + 13, hy + 1.8, hx + 16, hy + 6.5, hx + 10, hy + 8.5, 1.2, 2.2, 0.4, '#FFD23F');
            const foamPts = [[hx - 4, hy + 1.2, 2.4], [hx + 2, hy + 0.6, 2.8], [hx + 9, hy + 2.4, 2.1], [x0 + stepW * 0.32, 22, 2.0], [x0 + stepW * 0.52, 21.4, 2.3]];
            for (let f = 0; f < foamPts.length; f++) {
                const fp = foamPts[f];
                g.fillStyle = f % 2 === 0 ? '#FFF9D2' : '#FFD23F';
                g.beginPath();
                g.arc(fp[0], fp[1], fp[2], 0, Math.PI * 2);
                g.fill();
            }
            _dauFoil(g, x0 + stepW * 0.25, 34, 2.2, 0.4, '#FFD23F');
            _dauFoil(g, x0 + stepW * 0.68, 48, 2.0, 1.2, '#FFA81C');
            _dauFoil(g, x0 + stepW * 0.45, 76, 1.8, 2.0, '#B8791A');
        }

        // Brightest continuous ridge anchored squarely at y = 22 (exact r.radius).
        g.strokeStyle = '#FFD23F';
        g.lineWidth = 3.6;
        g.beginPath();
        for (let x = 0; x <= 192; x += 3) {
            const u = x / period * Math.PI * 2;
            const y = 22 - 1.2 * Math.sin(u * 3) - 0.8 * Math.cos(u);
            if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
        g.strokeStyle = '#FFF9D2';
        g.lineWidth = 1.8;
        g.stroke();

        // Linear crossfade over the 20% overlap zones makes adjacent segments sum to 1.0 seamlessly.
        g.globalCompositeOperation = 'destination-in';
        const ends = g.createLinearGradient(0, 0, 192, 0);
        ends.addColorStop(0, 'rgba(255,255,255,0)');
        ends.addColorStop(0.2, '#fff');
        ends.addColorStop(0.8, '#fff');
        ends.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = ends;
        g.fillRect(0, 0, 192, 128);
    });

    const roosters = [];
    for (let frame = 0; frame < 3; frame++) {
        roosters.push(_dauBake(640, 640, g => {
            g.translate(320, 365);
            const flare = frame * 6;
            const gape = frame * 4.5;

            // Soft translucent inner aura preserves dark lacquer contrast for miao jin lines.
            const bodyAura = g.createRadialGradient(20, -25, 10, 0, -15, 255);
            bodyAura.addColorStop(0, 'rgba(255,210,63,0.20)');
            bodyAura.addColorStop(0.48, 'rgba(255,168,28,0.10)');
            bodyAura.addColorStop(1, 'rgba(184,121,26,0)');
            g.fillStyle = bodyAura;
            g.beginPath();
            g.arc(0, -15, 255, 0, Math.PI * 2);
            g.fill();

            // Fanned calligraphic sickle tail plumes rising and arching behind the back with feibai split fibers.
            const tailPlumes = [
                [-14, 42, -88, -145, -172, -262 - flare * 1.4, -248, -182 - flare],
                [-18, 52, -104, -110, -196, -228 - flare * 1.3, -276, -132 - flare * 0.9],
                [-20, 62, -118, -72, -214, -182 - flare * 1.1, -286, -76 - flare * 0.7],
                [-22, 72, -124, -36, -218, -132 - flare * 0.9, -278, -22 - flare * 0.5],
                [-22, 82, -120, -4, -208, -82 - flare * 0.7, -262, 22 - flare * 0.3],
                [-20, 90, -110, 22, -188, -36 - flare * 0.5, -238, 58]
            ];
            for (let i = 0; i < tailPlumes.length; i++) {
                const tp = tailPlumes[i];
                const x0 = tp[0], y0 = tp[1], x1 = tp[2], y1 = tp[3], x2 = tp[4], y2 = tp[5], x3 = tp[6], y3 = tp[7];
                const plumeGrad = g.createLinearGradient(x0, y0, x3, y3);
                plumeGrad.addColorStop(0, 'rgba(184,121,26,0.16)');
                plumeGrad.addColorStop(0.55, 'rgba(255,168,28,0.24)');
                plumeGrad.addColorStop(1, i < 3 ? 'rgba(255,81,0,0.32)' : 'rgba(255,210,63,0.24)');
                g.fillStyle = plumeGrad;
                g.beginPath();
                g.moveTo(x0, y0);
                g.bezierCurveTo(x1, y1 - 14, x2, y2 - 14, x3, y3);
                g.bezierCurveTo(x2 + 16, y2 + 12, x1 + 14, y1 + 16, x0 + 4, y0 + 16);
                g.closePath();
                g.fill();
                // Feibai split brush strands with dark gaps between fibers.
                _dauBrushBezier(g, x0, y0, x1, y1, x2, y2, x3, y3, 1.8, 3.8, 0.4, '#FFD23F');
                _dauBrushBezier(g, x0, y0 - 4, x1 - 4, y1 - 8, x2 - 6, y2 - 8, x3 - 5, y3 - 6, 0.8, 1.8, 0.2, '#FFF9D2');
                _dauBrushBezier(g, x0 + 2, y0 + 5, x1 + 6, y1 + 7, x2 + 10, y2 + 9, x3 + 8, y3 + 10, 1.0, 2.2, 0.2, i < 2 ? '#FF5100' : '#FFA81C');
                _dauBrushBezier(g, x0 + 4, y0 + 10, x1 + 12, y1 + 14, x2 + 18, y2 + 18, x3 + 14, y3 + 20, 0.7, 1.5, 0.2, '#B8791A');
            }

            // Sweeping golden wing and flank plumage on both sides.
            for (const side of [-1, 1]) {
                g.save();
                g.scale(side, 1);
                for (let layer = 0; layer < 2; layer++) {
                    for (let i = 7; i >= 0; i--) {
                        const x = 260 - i * 15 - layer * 24, y = 56 + i * 9 - layer * 20 - flare * 0.5;
                        const x0 = 12, y0 = -24 + layer * 10;
                        const wingGrad = g.createLinearGradient(x0, y0, x, y);
                        wingGrad.addColorStop(0, 'rgba(255,168,28,0.22)');
                        wingGrad.addColorStop(0.65, layer === 0 ? 'rgba(255,210,63,0.26)' : 'rgba(184,121,26,0.20)');
                        wingGrad.addColorStop(1, 'rgba(255,168,28,0.10)');
                        g.fillStyle = wingGrad;
                        g.beginPath();
                        g.moveTo(x0, y0);
                        g.bezierCurveTo(86, -38, 142, 10, x, y);
                        g.bezierCurveTo(x + 6, y + 30, x - 12, y + 40, x - 40, y + 18);
                        g.bezierCurveTo(122, 40 + i * 6, 52, 48, 18, 44);
                        g.closePath();
                        g.fill();
                        _dauBrushBezier(g, x0, y0, 86, -38, 142, 10, x, y, 1.0, layer === 0 ? 3.0 : 2.2, 0.6, layer === 0 ? '#FFD23F' : '#FFA81C');
                        _dauBrushBezier(g, x, y, x - 8, y + 26, 118, 38 + i * 5, 18, 42, 0.5, 1.8, 0.8, 'rgba(255,168,28,0.75)');
                        if (layer === 0 && i % 2 === 0) {
                            _dauBrushBezier(g, x0 + 8, y0 + 8, 84, -22, 138, 18, x - 6, y + 8, 0.6, 1.6, 0.3, '#FFF9D2');
                        }
                    }
                }
                for (let row = 0; row < 3; row++) {
                    for (let k = 0; k < 4; k++) {
                        const sx = 68 + k * 20 + row * 8, sy = 4 + row * 14 + k * 5;
                        _dauBrushArc(g, sx, sy, 13, 0.15, Math.PI * 0.92, 0.5, 2.2, 0.5, row === 0 ? '#FFF9D2' : '#FFD23F');
                    }
                }
                if (frame !== 0) {
                    for (let i = 0; i < 7; i++) {
                        const x = 92 + i * 22, y = 52 + (i % 3) * 10;
                        _dauBrushBezier(g, x, y, x + 10, y - 14, x + 14, y - 26 - frame * 4, x + 12, y - 34 - frame * 5, 0.8, 2.4, 0.3, '#FFF9D2');
                    }
                }
                g.restore();
            }

            // Clear background wing roots inside the torso silhouette so the chest stays clean and uncrossed.
            const torsoPath = () => {
                g.beginPath();
                g.moveTo(-26, 113);
                g.bezierCurveTo(-74, 88, -74, 1, -28, -40);
                g.bezierCurveTo(-9, -57, -20, -131, 13, -172);
                g.lineTo(91, -157);
                g.bezierCurveTo(69, -129, 73, -62, 80, -26);
                g.bezierCurveTo(138, 46, 94, 132, 8, 123);
                g.closePath();
            };
            g.save();
            g.globalCompositeOperation = 'destination-out';
            g.fillStyle = 'rgba(0,0,0,0.88)';
            torsoPath();
            g.fill();
            g.restore();

            // Upright neck, proud puffed chest and crowing head silhouette.
            const chestGrad = g.createRadialGradient(34, -28, 10, 10, -10, 195);
            chestGrad.addColorStop(0, 'rgba(255,249,210,0.36)');
            chestGrad.addColorStop(0.35, 'rgba(255,210,63,0.28)');
            chestGrad.addColorStop(0.75, 'rgba(255,168,28,0.18)');
            chestGrad.addColorStop(1, 'rgba(184,121,26,0.10)');
            g.fillStyle = chestGrad;
            torsoPath();
            g.fill();

            // Miao jin outline strokes for back, neck and proud chest.
            _dauBrushBezier(g, -26, 113, -74, 88, -74, 1, -28, -40, 1.8, 4.4, 2.4, '#FFD23F');
            _dauBrushBezier(g, -28, -40, -9, -57, -20, -131, 13, -172, 2.4, 4.2, 2.0, '#FFD23F');
            _dauBrushBezier(g, 91, -157, 69, -129, 73, -62, 80, -26, 2.2, 4.5, 3.2, '#FFD23F');
            _dauBrushBezier(g, 80, -26, 138, 46, 94, 132, 8, 123, 3.2, 5.4, 2.2, '#FFD23F');
            _dauBrushBezier(g, 82, -22, 132, 44, 90, 124, 16, 118, 1.0, 2.4, 0.6, '#FFF9D2');
            _dauBrushBezier(g, 8, 123, -8, 122, -18, 118, -26, 113, 2.2, 3.2, 1.8, '#FFA81C');

            // Gongbi imbricated breast scales curving naturally with the proud chest.
            for (let row = 0; row < 5; row++) {
                const count = 4;
                for (let col = 0; col < count; col++) {
                    const bx = -14 + col * 22 + Math.sin(row * 0.6) * 8;
                    const by = -22 + row * 24 + col * 3;
                    _dauBrushArc(g, bx, by, 14, -0.35, 1.45, 0.4, 2.0, 0.4, col === count - 1 ? '#FFF9D2' : '#FFD23F');
                }
            }

            // Layered gongbi neck hackles cascading down the arched neck.
            for (let tier = 0; tier < 4; tier++) {
                const count = 5;
                for (let k = 0; k < count; k++) {
                    const t = k / (count - 1);
                    const hx = -6 + t * 72 + tier * 2;
                    const hy = -148 + tier * 28 + Math.sin(t * Math.PI) * 8;
                    const tipX = hx - 8 + t * 20, tipY = hy + 30 + tier * 3 + (frame === 2 ? 3 : 0);
                    _dauBrushBezier(g, hx - 7, hy, hx - 4, hy + 14, tipX - 2, tipY - 5, tipX, tipY, 0.5, 2.0, 0.4, '#FFD23F');
                    _dauBrushBezier(g, hx + 7, hy, hx + 5, hy + 14, tipX + 2, tipY - 5, tipX, tipY, 0.5, 1.8, 0.4, '#FFA81C');
                    _dauBrushBezier(g, hx, hy + 2, (hx + tipX) * 0.5, (hy + tipY) * 0.5, tipX, tipY - 3, tipX, tipY, 0.6, 1.2, 0.2, '#FFF9D2');
                }
            }

            // One raised talon tucked neatly under the lower breast in classical rooster poise.
            _dauBrushBezier(g, 24, 96, 46, 104, 64, 112, 72, 122, 4.2, 3.6, 2.4, '#FFA81C');
            _dauBrushBezier(g, 24, 96, 46, 104, 64, 112, 72, 122, 1.8, 2.2, 1.4, '#FFD23F');
            _dauBrushBezier(g, 72, 122, 58, 130, 44, 134, 32, 136, 2.4, 2.2, 1.4, '#FFD23F');
            _dauBrushBezier(g, 32, 136, 44, 142, 52, 150, 48, 160, 1.8, 1.6, 0.3, '#FFF9D2');
            _dauBrushBezier(g, 32, 136, 36, 144, 38, 154, 32, 162, 1.6, 1.4, 0.3, '#FFD23F');
            _dauBrushBezier(g, 32, 136, 22, 142, 16, 148, 18, 156, 1.4, 1.2, 0.3, '#FFA81C');

            // Vermilion five lobed crown comb with miao jin gold rim.
            const combLift = frame * 3.5;
            const combGrad = g.createLinearGradient(12, -264, 74, -170);
            combGrad.addColorStop(0, '#FF5100');
            combGrad.addColorStop(0.68, 'rgba(255,81,0,0.85)');
            combGrad.addColorStop(1, 'rgba(255,168,28,0.45)');
            g.fillStyle = combGrad;
            g.beginPath();
            g.moveTo(13, -172);
            g.bezierCurveTo(-15, -176, -19, -203 - combLift, 2, -209 - combLift * 0.6);
            g.bezierCurveTo(-14, -241 - combLift, 12, -259 - combLift, 31, -225 - combLift * 0.5);
            g.bezierCurveTo(34, -267 - combLift, 58, -267 - combLift, 67, -224 - combLift * 0.5);
            g.bezierCurveTo(91, -249 - combLift, 105, -224 - combLift, 88, -205 - combLift * 0.4);
            g.bezierCurveTo(110, -197 - combLift * 0.5, 110, -175, 91, -157);
            g.closePath();
            g.fill();
            _dauBrushBezier(g, 13, -172, -15, -176, -19, -203 - combLift, 2, -209 - combLift * 0.6, 1.2, 3.0, 1.4, '#FFD23F');
            _dauBrushBezier(g, 2, -209 - combLift * 0.6, -14, -241 - combLift, 12, -259 - combLift, 31, -225 - combLift * 0.5, 1.2, 3.2, 1.4, '#FFD23F');
            _dauBrushBezier(g, 31, -225 - combLift * 0.5, 34, -267 - combLift, 58, -267 - combLift, 67, -224 - combLift * 0.5, 1.4, 3.4, 1.4, '#FFF9D2');
            _dauBrushBezier(g, 67, -224 - combLift * 0.5, 91, -249 - combLift, 105, -224 - combLift, 88, -205 - combLift * 0.4, 1.4, 3.0, 1.2, '#FFD23F');
            _dauBrushBezier(g, 88, -205 - combLift * 0.4, 110, -197 - combLift * 0.5, 110, -175, 91, -157, 1.2, 2.8, 1.0, '#FFD23F');

            // Wide open crowing beak in sharp gold and warm platinum.
            g.fillStyle = 'rgba(255,210,63,0.52)';
            g.beginPath();
            g.moveTo(83, -198); g.lineTo(110, -247 - gape); g.lineTo(130, -263 - gape); g.lineTo(108, -185);
            g.closePath();
            g.fill();
            _dauBrushBezier(g, 83, -198, 98, -226 - gape * 0.5, 114, -250 - gape, 130, -263 - gape, 2.2, 3.8, 0.8, '#FFF9D2');
            _dauBrushBezier(g, 130, -263 - gape, 122, -232 - gape * 0.5, 114, -206, 108, -185, 0.8, 2.8, 1.8, '#FFD23F');

            g.fillStyle = 'rgba(255,168,28,0.48)';
            g.beginPath();
            g.moveTo(106, -174); g.lineTo(151, -201 + gape); g.lineTo(139, -161 + gape); g.lineTo(94, -145);
            g.closePath();
            g.fill();
            _dauBrushBezier(g, 106, -174, 124, -186 + gape * 0.5, 138, -194 + gape, 151, -201 + gape, 1.8, 2.8, 0.8, '#FFD23F');
            _dauBrushBezier(g, 151, -201 + gape, 144, -176 + gape, 120, -154 + gape * 0.4, 94, -145, 0.8, 3.2, 1.8, '#FFD23F');

            // Vermilion wattle beneath the beak with miao jin gold rim.
            g.fillStyle = 'rgba(255,81,0,0.85)';
            g.beginPath();
            g.moveTo(92, -141);
            g.bezierCurveTo(137, -138, 130, -86, 103, -91);
            g.bezierCurveTo(77, -96, 86, -119, 92, -141);
            g.closePath();
            g.fill();
            _dauBrushBezier(g, 92, -141, 137, -138, 130, -86, 103, -91, 1.2, 3.0, 1.4, '#FFD23F');
            _dauBrushBezier(g, 103, -91, 77, -96, 86, -119, 92, -141, 1.4, 2.2, 1.0, '#FFA81C');

            // Fierce swept calligraphic brow stroke and solemn pinpoint eye in warm platinum.
            _dauBrushBezier(g, 96, -182, 86, -186, 74, -184, 64, -178, 1.4, 2.4, 0.4, '#FFD23F');
            g.fillStyle = '#FFF9D2';
            g.beginPath();
            g.arc(86, -178, 3.6, 0, Math.PI * 2);
            g.fill();

            // Sparse gold leaf flakes drifting around the tail and crest.
            for (let i = 0; i < 14; i++) {
                const a = i * 2.39996 + frame * 0.4;
                const rx = -35 + Math.cos(a) * (125 + (i % 4) * 35);
                const ry = -55 + Math.sin(a) * (110 + (i % 3) * 30);
                _dauFoil(g, rx, ry, 2.4 + (i % 2), a, i % 3 === 0 ? '#FFF9D2' : '#FFD23F');
            }
        }));
    }

    const impacts = [];
    for (const count of [6, 3]) {
        impacts.push(_dauBake(128, 128, g => {
            // Short water jet splashes and gold leaf flakes.
            const cx = 64, cy = 64;
            const core = g.createRadialGradient(cx, cy, 2, cx, cy, 44);
            core.addColorStop(0, 'rgba(255,249,210,0.85)');
            core.addColorStop(0.35, 'rgba(255,210,63,0.32)');
            core.addColorStop(1, 'rgba(184,121,26,0)');
            g.fillStyle = core;
            g.beginPath();
            g.arc(cx, cy, 44, 0, Math.PI * 2);
            g.fill();
            _dauBrushArc(g, cx, cy, 34, 0, Math.PI * 2, 1.0, 2.6, 1.0, '#FFD23F');
            _dauBrushArc(g, cx, cy, 22, 0.5, Math.PI * 2 + 0.5, 0.6, 1.8, 0.6, '#FFA81C');
            for (let i = 0; i < count; i++) {
                const a = i * Math.PI * 2 / count;
                const c = Math.cos(a), s = Math.sin(a);
                const nx = -s, ny = c;
                _dauBrushBezier(g, cx + c * 12, cy + s * 12, cx + c * 26 + nx * 6, cy + s * 26 + ny * 6, cx + c * 40 + nx * 10, cy + s * 40 + ny * 10, cx + c * 50 + nx * 4, cy + s * 50 + ny * 4, 1.2, 3.6, 0.5, '#FFD23F');
                _dauBrushBezier(g, cx + c * 14, cy + s * 14, cx + c * 26 + nx * 4, cy + s * 26 + ny * 4, cx + c * 38 + nx * 7, cy + s * 38 + ny * 7, cx + c * 46 + nx * 3, cy + s * 46 + ny * 3, 0.6, 1.8, 0.3, '#FFF9D2');
                g.fillStyle = '#FFF9D2';
                g.beginPath();
                g.arc(cx + c * 52 + nx * 3, cy + s * 52 + ny * 3, 2.6, 0, Math.PI * 2);
                g.fill();
                const af = a + Math.PI / count;
                _dauFoil(g, cx + Math.cos(af) * 42, cy + Math.sin(af) * 42, 3.0, af, '#FFD23F');
                _dauFoil(g, cx + Math.cos(af) * 28, cy + Math.sin(af) * 28, 2.2, af + 0.6, '#FFF9D2');
            }
        }));
    }

    const reflectShapes = {};
    reflectShapes.uriel = _dauBake(192, 192, g => {
        if (typeof _urielSwordImg !== 'undefined' && _urielSwordImg.complete && _urielSwordImg.naturalWidth) {
            g.drawImage(_urielSwordImg, 0, 0, 192, 192);
            g.globalCompositeOperation = 'source-in';
            const gold = g.createLinearGradient(0, 0, 192, 192);
            gold.addColorStop(0, '#FFF9D2');
            gold.addColorStop(0.55, '#FFD23F');
            gold.addColorStop(1, '#FFA81C');
            g.fillStyle = gold;
            g.fillRect(0, 0, 192, 192);
        } else {
            // Miao jin ancient golden sword keeping the exact vertical sword silhouette.
            g.fillStyle = 'rgba(255,168,28,0.28)';
            g.beginPath();
            g.moveTo(96, 6); g.lineTo(106, 124); g.lineTo(86, 124);
            g.closePath();
            g.fill();
            _dauBrushBezier(g, 96, 6, 101, 46, 105, 88, 106, 124, 1.2, 3.2, 2.2, '#FFD23F');
            _dauBrushBezier(g, 96, 6, 91, 46, 87, 88, 86, 124, 1.2, 3.2, 2.2, '#FFD23F');
            _dauBrushBezier(g, 96, 8, 96, 48, 96, 90, 96, 124, 0.8, 2.2, 1.2, '#FFF9D2');
            _dauBrushBezier(g, 60, 132, 78, 122, 114, 122, 132, 132, 1.5, 5.5, 1.5, '#FFD23F');
            _dauBrushBezier(g, 64, 130, 82, 124, 110, 124, 128, 130, 0.8, 2.4, 0.8, '#FFF9D2');
            _dauBrushBezier(g, 96, 130, 96, 146, 96, 162, 96, 178, 4.5, 5.0, 3.5, '#FFA81C');
            _dauBrushBezier(g, 96, 130, 96, 146, 96, 162, 96, 178, 1.8, 2.2, 1.5, '#FFD23F');
            g.fillStyle = '#FF5100';
            g.beginPath();
            g.arc(96, 128, 4.2, 0, Math.PI * 2);
            g.fill();
            _dauBrushArc(g, 96, 180, 6, 0, Math.PI * 2, 1.6, 2.4, 1.6, '#FFD23F');
        }
    });

    reflectShapes.marchosias = _dauBake(224, 224, g => {
        g.translate(112, 112);
        // Crescent blade with translucent amber wash, miao jin edges and barbed wave teeth.
        g.fillStyle = 'rgba(255,168,28,0.26)';
        g.beginPath();
        g.arc(0, 0, 95, -Math.PI / 2, Math.PI / 2);
        g.arc(0, 0, 78, Math.PI / 2, -Math.PI / 2, true);
        g.closePath();
        g.fill();
        _dauBrushArc(g, 0, 0, 95, -Math.PI / 2, Math.PI / 2, 1.5, 5.2, 1.5, '#FFD23F');
        _dauBrushArc(g, 0, 0, 92, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1, 0.8, 2.4, 0.8, '#FFF9D2');
        _dauBrushArc(g, 0, 0, 79, -Math.PI / 2, Math.PI / 2, 1.2, 3.4, 1.2, '#FFA81C');
        for (let i = 0; i <= 7; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 7;
            const c = Math.cos(a), s = Math.sin(a);
            _dauBrushBezier(g, Math.cos(a - 0.05) * 93, Math.sin(a - 0.05) * 93, c * 98, s * 98, c * 103, s * 103, c * 106, s * 106, 2.2, 3.4, 0.5, '#FFF9D2');
            _dauBrushArc(g, 0, 0, 86, a - 0.14, a + 0.14, 0.5, 1.8, 0.5, '#FFD23F');
        }
        g.drawImage(glow, -14, -14, 28, 28);
    });

    for (const kind of ['raphael', 'verdict']) {
        reflectShapes[kind] = _dauBake(256, 256, g => {
            const cx = 128, cy = 128;
            g.drawImage(glow, 8, 8, 240, 240);
            const core = g.createRadialGradient(114, 110, 4, cx, cy, 83);
            core.addColorStop(0, 'rgba(255,249,210,0.65)');
            core.addColorStop(0.45, 'rgba(255,210,63,0.34)');
            core.addColorStop(0.82, 'rgba(255,168,28,0.22)');
            core.addColorStop(1, 'rgba(184,121,26,0.08)');
            g.fillStyle = core;
            g.beginPath();
            g.arc(cx, cy, 83, 0, Math.PI * 2);
            g.fill();
            _dauBrushArc(g, cx, cy, 83, 0, Math.PI * 2, 2.2, 4.6, 2.2, '#FFD23F');
            _dauBrushArc(g, cx, cy, 83, -0.8, 1.6, 1.0, 2.4, 1.0, '#FFF9D2');
            _dauBrushArc(g, cx, cy, 64, 0.4, Math.PI * 2 + 0.4, 0.8, 2.0, 0.8, 'rgba(255,168,28,0.65)');
            if (kind === 'raphael') {
                g.save();
                g.translate(cx, cy);
                g.rotate(-0.5);
                g.scale(1, 35 / 96);
                _dauBrushArc(g, 0, 0, 96, 0, Math.PI * 2, 2.0, 4.8, 2.0, '#FFD23F');
                _dauBrushArc(g, 0, 0, 96, -0.5, 2.2, 1.0, 2.4, 1.0, '#FFF9D2');
                g.restore();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    g.drawImage(star, 118 + Math.cos(a) * 96, 118 + Math.sin(a) * 96, 20, 20);
                }
            } else {
                g.fillStyle = 'rgba(255,81,0,0.42)';
                g.beginPath();
                g.arc(cx, cy, 24, 0, Math.PI * 2);
                g.fill();
                _dauBrushArc(g, cx, cy, 25, 0, Math.PI * 2, 1.6, 2.8, 1.6, '#FFD23F');
                g.drawImage(star, 52, 52, 152, 152);
                g.drawImage(thinRing, 15, 15, 226, 226);
            }
        });
    }

    reflectShapes.meteor = _dauBake(128, 128, g => {
        // Classical taihu scholar rock meteor with angular miao jin brush contours and glowing fissures.
        g.drawImage(glow, 4, 4, 120, 120);
        const rock = g.createLinearGradient(28, 24, 98, 102);
        rock.addColorStop(0, 'rgba(255,210,63,0.42)');
        rock.addColorStop(0.55, 'rgba(255,168,28,0.28)');
        rock.addColorStop(1, 'rgba(184,121,26,0.22)');
        const pts = [];
        for (let i = 0; i < 9; i++) {
            const a = i * Math.PI * 2 / 9, r = 37 + (i % 3) * 4;
            pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]);
        }
        g.fillStyle = rock;
        g.beginPath();
        for (let i = 0; i < 9; i++) {
            if (i === 0) g.moveTo(pts[i][0], pts[i][1]); else g.lineTo(pts[i][0], pts[i][1]);
        }
        g.closePath();
        g.fill();
        for (let i = 0; i < 9; i++) {
            const p0 = pts[i], p1 = pts[(i + 1) % 9];
            const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
            _dauBrushBezier(g, p0[0], p0[1], mx, my, mx, my, p1[0], p1[1], 1.6, 3.8, 1.6, i < 4 ? '#FFF9D2' : '#FFD23F');
        }
        _dauBrushBezier(g, 42, 34, 52, 48, 56, 56, 58, 62, 1.2, 3.0, 1.4, '#FFF9D2');
        _dauBrushBezier(g, 58, 62, 68, 59, 76, 57, 84, 55, 1.4, 2.6, 0.8, '#FFD23F');
        _dauBrushBezier(g, 58, 62, 56, 74, 54, 86, 52, 96, 1.4, 2.8, 0.8, '#FFA81C');
        _dauBrushBezier(g, 34, 66, 46, 64, 52, 63, 58, 62, 0.8, 2.0, 1.2, '#FF5100');
    });

    reflectShapes.dargruel = _dauBake(128, 64, g => {
        // Interlocking miao jin chain links tipped with a barbed golden spearhead.
        for (let i = 0; i < 5; i++) {
            const cx = 16 + i * 19, cy = 32, tilt = i % 2 ? 0.55 : -0.55;
            g.save();
            g.translate(cx, cy);
            g.rotate(tilt);
            g.scale(1, 8 / 14);
            _dauBrushArc(g, 0, 0, 14, 0, Math.PI * 2, 2.2, 4.4, 2.2, '#FFD23F');
            _dauBrushArc(g, 0, 0, 14, -0.6, 1.4, 1.0, 2.2, 1.0, '#FFF9D2');
            g.restore();
        }
        g.fillStyle = 'rgba(255,168,28,0.45)';
        g.beginPath();
        g.moveTo(126, 32); g.lineTo(100, 15); g.lineTo(106, 32); g.lineTo(100, 49);
        g.closePath();
        g.fill();
        _dauBrushBezier(g, 100, 15, 108, 21, 118, 27, 126, 32, 1.4, 3.2, 1.6, '#FFF9D2');
        _dauBrushBezier(g, 100, 49, 108, 43, 118, 37, 126, 32, 1.4, 3.2, 1.6, '#FFD23F');
        _dauBrushBezier(g, 96, 32, 106, 32, 116, 32, 124, 32, 1.2, 2.4, 0.8, '#FF5100');
    });

    const reflectFire = _dauBake(384, 96, g => {
        // Curling tidal wake wrapping the reflected skill and trailing into braided wave ribbons.
        const wake = g.createLinearGradient(0, 0, 384, 0);
        wake.addColorStop(0, 'rgba(184,121,26,0)');
        wake.addColorStop(0.35, 'rgba(184,121,26,0.28)');
        wake.addColorStop(0.68, 'rgba(255,168,28,0.52)');
        wake.addColorStop(0.92, '#FFD23F');
        wake.addColorStop(1, '#FFF9D2');
        for (let i = 0; i < 7; i++) {
            const yOff = (i - 3) * 9;
            const xTail = i * 22;
            _dauBrushBezier(g, 376, 48 + yOff * 0.25, 290, 48 + yOff * 1.35, 175, 48 - yOff * 1.15, xTail, 48 + yOff * 0.6, 1.2, 5.2 - Math.abs(i - 3) * 0.6, 0.3, wake);
        }
        _dauBrushBezier(g, 310, 22, 348, 12, 376, 26, 382, 48, 1.0, 4.2, 2.0, '#FFD23F');
        _dauBrushBezier(g, 310, 74, 348, 84, 376, 70, 382, 48, 1.0, 4.2, 2.0, '#FFD23F');
        _dauBrushBezier(g, 336, 18, 362, 16, 378, 30, 382, 48, 0.8, 2.4, 1.2, '#FFF9D2');
        _dauBrushBezier(g, 336, 78, 362, 80, 378, 66, 382, 48, 0.8, 2.4, 1.2, '#FFF9D2');
        for (let i = 0; i < 14; i++) {
            const fx = 65 + i * 22, fy = 48 + Math.sin(i * 1.7) * 24;
            _dauFoil(g, fx, fy, 2.2 + (i % 2), i * 0.8, i > 9 ? '#FFF9D2' : '#FFD23F');
        }
    });

    const reflectBlast = _dauBake(512, 512, g => {
        // Radial crashing wave burst with curling crests, platinum foam tips and small vermilion core.
        const cx = 256, cy = 256;
        const bg = g.createRadialGradient(cx, cy, 6, cx, cy, 248);
        bg.addColorStop(0, 'rgba(255,249,210,0.85)');
        bg.addColorStop(0.14, 'rgba(255,81,0,0.52)');
        bg.addColorStop(0.38, 'rgba(255,168,28,0.26)');
        bg.addColorStop(0.75, 'rgba(184,121,26,0.10)');
        bg.addColorStop(1, 'rgba(184,121,26,0)');
        g.fillStyle = bg;
        g.beginPath();
        g.arc(cx, cy, 248, 0, Math.PI * 2);
        g.fill();
        g.drawImage(ring, 28, 28, 456, 456);
        const waves = 16;
        for (let i = 0; i < waves; i++) {
            const a = i * Math.PI * 2 / waves;
            g.save();
            g.translate(cx, cy);
            g.rotate(a);
            const rMax = 212 + (i % 2) * 22;
            _dauBrushBezier(g, 36, 0, 96, -18, 158, -24, rMax, -4, 1.6, 5.2, 1.4, '#FFD23F');
            _dauBrushBezier(g, 42, 4, 102, -8, 162, -14, rMax - 4, -2, 0.8, 2.4, 0.8, '#FFF9D2');
            _dauBrushBezier(g, rMax - 18, -10, rMax + 4, -8, rMax + 10, 6, rMax - 4, 12, 1.4, 2.8, 0.5, '#FFF9D2');
            g.fillStyle = '#FFF9D2';
            g.beginPath();
            g.arc(rMax + 6, -2, 3.2, 0, Math.PI * 2);
            g.fill();
            _dauFoil(g, 130 + (i % 3) * 24, 14, 2.8, 0.5, '#FFD23F');
            g.restore();
        }
        // Small vermilion solar core at center.
        g.fillStyle = 'rgba(255,81,0,0.75)';
        g.beginPath();
        g.arc(cx, cy, 26, 0, Math.PI * 2);
        g.fill();
        _dauBrushArc(g, cx, cy, 28, 0, Math.PI * 2, 2.0, 3.6, 2.0, '#FFD23F');
        g.drawImage(star, 176, 176, 160, 160);
    });

    _dauRenderCache = { glow, ring, thinRing, bronzeRing, cloud, foam, specks, ray, dawn, needle, trail, feather, star, sun, crack, roosters, solar, fireBand, impacts, reflectShapes, reflectFire, reflectBlast };
    return _dauRenderCache;
}

function _dauImage(sprite, x, y, w, h, angle, alpha) {
    if (alpha <= 0 || w <= 0 || h <= 0) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h); ctx.restore();
}

function _drawDauRing() {
    if (!_hasBuff('kim_ke_bao_hieu') || gameState !== 'playing') return;
    const s = _dauSprites(), gfx = window._gfxLevel || 0, clock = window._dauClock;
    _drawDauCharge(s, gfx);
    const age = window._dauBurstMs, x = window._dauBurstX, y = window._dauBurstY;
    if (gfx < 3 && age < 1300) {
        const size = Math.min(448, canvas.width * 0.82);
        const rise = Math.min(1, age / 200);
        const overshoot = 1 + Math.sin(rise * Math.PI) * 0.16;
        const bodyY = y - size * 0.32 - rise * 25;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (age < 800) {
            const fade = Math.sin(Math.PI * age / 800);
            ctx.globalAlpha = Math.min(0.22, fade * 0.22);
            const height = canvas.height * 0.55 * Math.min(1, age / 240);
            ctx.drawImage(s.dawn, 0, canvas.height - height, canvas.width, height);
        }
        if (age < 600) {
            const fade = Math.sin(Math.PI * age / 600);
            for (let i = 0; i < 12; i++) {
                const a = i * Math.PI * 2 / 12 + age / 18000;
                const length = Math.hypot(canvas.width, canvas.height);
                _dauImage(s.ray, x + Math.sin(a) * length / 2, y - Math.cos(a) * length / 2, 155 + (i % 3) * 100, length, a, fade * 0.23);
            }
        }
        if (gfx < 2 && age < 900) _dauImage(s.solar, x, bodyY - 60, size * 1.18, size * 1.18, age / 6000, Math.min(0.65, rise * 0.65) * Math.min(1, (900 - age) / 300));
        if (age < 650) {
            const alpha = Math.min(1, age / 70) * Math.min(1, (650 - age) / 150);
            const frame = gfx === 2 ? 0 : age < 130 ? 0 : 1 + Math.floor((age - 130) / 95) % 2;
            const ry = bodyY + (1 - rise) * 60;
            _dauImage(s.roosters[frame], x, ry, size * overshoot, size * overshoot, 0, alpha * 0.86);
            if (gfx < 2) {
                const drift = age * 0.09;
                _dauImage(s.cloud, x - size * 0.22 + drift, ry + size * 0.31, size * 0.58, size * 0.21, 0, alpha * 0.52);
                _dauImage(s.cloud, x + size * 0.20 - drift * 0.8, ry + size * 0.36, size * 0.52, size * 0.19, 0, alpha * 0.42);
            }
        }
        if (age < 180) _dauImage(s.glow, x, y, 110, 110, 0, (1 - age / 180) * 0.75);
        if (age >= 500) {
            const t = (age - 500) / 800, count = gfx === 2 ? 16 : 32;
            const ease = 1 - (1 - t) * (1 - t);
            for (let i = 0; i < count; i++) {
                const a = i * 2.39996;
                const spread = 60 + ease * (145 + (i % 4) * 35);
                const sway = Math.sin(t * 4.5 + i * 1.3) * 18;
                const fx = x + Math.cos(a) * spread + sway;
                const fy = bodyY + Math.sin(a) * spread * 0.42 - t * 145 + t * t * 48;
                _dauImage(s.feather, fx, fy, 32 + (i % 3) * 12, 15, a - t * 1.1 + Math.sin(t * 3.5 + i) * 0.3, (1 - t) * 0.85);
                if (gfx < 2) {
                    const sx = x + Math.cos(a + 0.4) * (45 + (i % 5) * 32) + Math.sin(t * 6.5 + i) * 20;
                    const sy = bodyY - 35 + Math.sin(a + 0.4) * 85 + t * t * 165 + t * 30;
                    _dauImage(i % 5 === 0 ? s.star : s.specks, sx, sy, 14, 14, a + t * 2.2, (1 - t) * 0.68);
                }
            }
        }
        ctx.restore();
    }
    const rings = window._dauRings;
    for (let i = Math.max(0, rings.length - 2); i < rings.length; i++) {
        const r = rings[i], radius = r.radius;
        const alpha = Math.min(1, (r.maxRadius - radius) / 180);
        if (gfx >= 3 || radius < 40) {
            _dauImage(gfx < 3 ? s.ring : s.thinRing, r.x, r.y, radius * 2, radius * 2, 0, alpha);
            continue;
        }
        const segments = gfx === 2 ? 16 : 36;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < segments; k++) {
            const a = k * Math.PI * 2 / segments + clock / 15000;
            const rr = radius - 42;
            _dauImage(s.fireBand, r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr, radius * Math.PI * 2 / segments * 1.25, 128, a + Math.PI / 2, alpha);
        }
        ctx.restore();
        if (gfx < 2 && radius > DAU_RING_SPEED * 120) {
            const echo = radius - DAU_RING_SPEED * 120;
            _dauImage(s.ring, r.x, r.y, echo * 2, echo * 2, -clock / 17000, alpha * 0.40);
        }
        if (gfx < 2 && radius > DAU_RING_SPEED * 240) {
            const echo3 = radius - DAU_RING_SPEED * 240;
            _dauImage(s.bronzeRing, r.x, r.y, echo3 * 2, echo3 * 2, clock / 23000, alpha * 0.28);
        }
        const count = gfx === 2 ? 24 : 48;
        for (let k = 0; k < count; k++) {
            const a = k * 2.39996 + clock / 9000, trailR = Math.max(0, radius - 14 - (k % 4) * 18);
            const isFeather = k % 6 === 0, isFoam = k % 3 === 1;
            const sp = isFeather ? s.feather : isFoam ? s.foam : s.specks;
            const pw = isFeather ? 30 : isFoam ? 22 : 12;
            const ph = isFeather ? 13 : isFoam ? 11 : 12;
            const rot = isFoam ? a + Math.PI / 2 : a - 0.8;
            _dauImage(sp, r.x + Math.cos(a) * trailR, r.y + Math.sin(a) * trailR, pw, ph, rot, alpha * 0.74);
        }
    }
    if (gfx < 3) {
        const needles = window._dauNeedles;
        for (let i = 0; i < needles.length; i++) {
            const n = needles[i];
            if (n.kind !== 1 || !n.target || n.age >= 350) continue;
            const dx = n.target.x - n.sx, dy = n.target.y - n.sy, length = Math.hypot(dx, dy);
            _dauImage(s.trail, (n.sx + n.target.x) / 2, (n.sy + n.target.y) / 2, length, 4, Math.atan2(dy, dx), 0.26 + n.age / 1400);
            if (i > 0) {
                const p = needles[i - 1];
                if (p.kind === 1 && p.age < 350) {
                    const sx = n.sx - p.sx, sy = n.sy - p.sy;
                    _dauImage(s.trail, (n.sx + p.sx) / 2, (n.sy + p.sy) / 2, Math.hypot(sx, sy), 7, Math.atan2(sy, sx), 0.92);
                }
            }
            _dauImage(s.star, n.sx, n.sy, 42, 42, clock / 7000, 0.95);
        }
    }
    for (let i = 0; i < DAU_FX_MAX; i++) {
        const fx = window._dauFx[i];
        if (fx.life <= 0 || fx.age >= fx.life || fx.kind >= 4) continue;
        const t = fx.age / fx.life;
        if (gfx >= 3 && fx.kind !== 1) continue;
        if (fx.kind === 2) { _dauImage(s.crack, fx.x, fx.y, 100 + t * 90, 170 + t * 80, -0.1, 1 - t); continue; }
        if (fx.kind === 3) {
            if (gfx >= 3) continue;
            const size = (20 + t * 95) * fx.scale;
            _dauImage(s.thinRing, fx.x, fx.y, size, size * 0.7, 0, (1 - t) * 0.8);
            _dauImage(s.thinRing, fx.x, fx.y, size * 0.7, size * 0.5, 0, (1 - t) * 0.4);
            continue;
        }
        if (gfx < 3) {
            const size = 26 + t * 90;
            _dauImage(s.impacts[gfx === 2 ? 1 : 0], fx.x, fx.y, size, size, fx.x, 1 - t);
            continue;
        }
        _dauImage(s.glow, fx.x, fx.y, 24 + t * 50, 24 + t * 50, 0, (1 - t) * 0.9);
        _dauImage(s.thinRing, fx.x, fx.y, 12 + t * 88, 12 + t * 88, 0, 1 - t);
    }
}

function _drawDauStatus() {
    if (!_hasBuff('kim_ke_bao_hieu') || gameState !== 'playing') return;
    const s = _dauSprites(), gfx = window._gfxLevel || 0;
    _drawDauReflections(s, gfx);
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.hp <= 0) continue;
        if (gfx < 3 && e._dauPushFlashMs > 0) {
            const alpha = e._dauPushFlashMs / DAU_KNOCKBACK_MS;
            const spread = 1 - alpha;
            _dauImage(s.glow, e.x, e.y, Math.max(50, e.size * 1.45), Math.max(50, e.size * 1.45), 0, alpha * 0.72);
            if (gfx < 2) for (let k = 0; k < 4; k++) {
                const offset = (k - 1.5) * 0.42;
                const rFoam = e.size * 0.46 + 10 + spread * 16;
                const fx = e.x + Math.sin(offset) * rFoam;
                const fy = e.y + Math.cos(offset) * rFoam * 0.85;
                _dauImage(s.foam, fx, fy, 34 + e.size * 0.18, 17 + e.size * 0.08, -offset * 0.85, alpha * 0.85);
                _dauImage(s.specks, fx + Math.sin(offset) * 12, fy + 10 + spread * 14, 14, 14, k + spread * 2, alpha * 0.9);
            }
        }
        if (e._dauCrowId !== window._dauCrowId) continue;
        if (e._dauSunMs > 0) _dauImage(s.sun, e.x, e.y - e.size / 2 - 16, 34, 34, window._dauClock / 12000, Math.min(1, e._dauSunMs / 300));
        if (gfx < 3 && e._dauFlashMs > 0) _dauImage(s.glow, e.x, e.y, e.size * 1.3, e.size * 1.3, 0, e._dauFlashMs / 180 * 0.4);
    }
    if (gfx >= 3) return;
    const needles = window._dauNeedles;
    for (let i = 0; i < needles.length; i++) {
        const n = needles[i];
        if (n.kind === 1 && n.age < 350) continue;
        const w = n.kind === 0 ? 42 : 100;
        if (gfx < 2 && n.kind !== 2) {
            const wave = Math.sin(window._dauClock * 0.016 + i * 1.7) * 0.045;
            _dauImage(s.trail, n.x - Math.cos(n.angle) * 60, n.y - Math.sin(n.angle) * 60, 130, 12, n.angle + wave, 0.72);
        }
        let pinLift = 0;
        if (n.kind === 2) {
            const elapsed = Math.max(0, DAU_PIN_MS - n.pinMs);
            const settle = Math.min(1, elapsed / 180);
            const plunge = settle < 0.55 ? (settle / 0.55) * 18 : 18 - _dauSmooth((settle - 0.55) / 0.45) * 4;
            pinLift = 42 - plunge;
        }
        _dauImage(s.needle, n.x, n.y - pinLift, w, n.kind === 0 ? 10 : 18, n.kind === 2 ? Math.PI / 2 : n.angle, n.kind === 2 ? Math.min(1, n.pinMs / 200) : 1);
    }
}

function _drawDauReflections(s, gfx) {
    const list = window._dauReflections;
    for (let i = 0; i < list.length; i++) {
        const r = list[i], large = r.kind === 'verdict';
        const width = large ? 180 : r.kind === 'marchosias' ? 200 : r.kind === 'uriel' ? 108 : r.kind === 'dargruel' ? 80 : 72;
        const height = r.kind === 'dargruel' ? 40 : width;
        if (gfx < 2) _dauImage(s.reflectFire, r.x - Math.cos(r.angle) * width, r.y - Math.sin(r.angle) * width, width * 2.7, height * 0.5, r.angle, 0.65);
        const angle = r.kind === 'uriel' ? r.angle + Math.PI / 2 : r.kind === 'marchosias' ? r.age / 110 : r.angle;
        _dauImage(s.reflectShapes[r.kind], r.x, r.y, width, height, angle, 1);
    }
}

function _drawDauReflectImpacts() {
    if (!_hasBuff('tu_hoa_cham') || gameState !== 'playing') return;
    const s = _dauSprites(), gfx = window._gfxLevel || 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < DAU_FX_MAX; i++) {
        const f = window._dauFx[i];
        if (f.kind < 4 || f.life <= 0 || f.age >= f.life) continue;
        const t = f.age / f.life, fade = (1 - t) * (1 - t);
        if (gfx >= 3) { _dauImage(s.glow, f.x, f.y, 35 + t * 55, 35 + t * 55, 0, fade); continue; }
        const size = f.kind === 6 ? 200 + t * 430 : f.kind === 5 ? 100 + t * 250 : (40 + t * 100) * f.scale;
        _dauImage(f.kind === 4 ? s.impacts[gfx === 2 ? 1 : 0] : s.reflectBlast, f.x, f.y, size, size, t * 0.25, fade * 0.85);
        if (gfx < 2 && f.kind === 6) _dauImage(s.thinRing, f.x, f.y, size * 1.25, size * 1.25, 0, fade * 0.65);
    }
    ctx.restore();
}

function _dauSmooth(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
}

function _drawDauCharge(s, gfx) {
    const p = Math.min(1, window._dauCrowTimer / DAU_CROW_INTERVAL_MS);
    if (p <= 0.005 || gfx >= 3 || window._dauChargePreviewOff) return;
    const kindle = _dauSmooth((p - 0.4) / 0.3), gather = _dauSmooth((p - 0.7) / 0.2);
    const peak = _dauSmooth((p - 0.9) / 0.1), x = player.x, y = player.y;
    const pulse = 0.5 + 0.5 * Math.sin(p * 55 + peak * 18);
    _dauImage(s.glow, x, y - 25, 58 + kindle * 65 + gather * 45, 58 + kindle * 65 + gather * 45, p * 2.4, kindle * (0.14 + pulse * 0.14));
    if (gfx < 2 && gather > 0) {
        const size = Math.min(448, canvas.width * 0.82);
        _dauImage(s.roosters[0], x, y - size * 0.32 - 25, size, size, 0, gather * (0.045 + peak * 0.22));
    }
    const cap = gfx === 0 ? 24 : gfx === 1 ? 16 : 8;
    for (let i = 0; i < cap; i++) {
        const part = _dauChargeParticles[i], active = _dauSmooth((p - 0.38 - i / cap * 0.3) / 0.12);
        const quiet = i < 2 && p < 0.4 ? _dauSmooth(p / 0.05) * (1 - _dauSmooth((p - 0.32) / 0.08)) : 0;
        const life = (p * (7 + gather * 8) + part.phase) % 1;
        const opacity = Math.sin(life * Math.PI) * Math.max(active * 0.72, quiet * 0.26);
        const radius = part.feather ? 30 + (1 - life) * 130 : 22 + (1 - peak) * (35 + i % 4 * 10);
        const a = part.angle + p * (10 + gather * 12);
        _dauImage(part.feather ? s.feather : s.specks, x + Math.cos(a) * radius, y - 16 + Math.sin(a) * radius * 0.65, part.feather ? 24 : 11, part.feather ? 10 : 11, a, opacity);
    }
    if (gfx < 2 && gather > 0) {
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + p * 0.9, reach = Math.hypot(canvas.width, canvas.height) / 2;
            const t = (p * 12 + i / 6) % 1, r = reach * (1 - t);
            _dauImage(s.cloud, x + Math.cos(a) * r, y + Math.sin(a) * r, 86 + peak * 34, 24 + peak * 8, a + Math.PI - 0.25, gather * Math.sin(t * Math.PI) * 0.20);
        }
    }
    if (peak > 0) {
        const radius = 160 * (1 - peak) + 25;
        _dauImage(s.ring, x, y, radius * 2, radius * 2, -p * 6, peak * 0.58);
    }
}

function _drawDauHud() {
    if (!_hasBuff('kim_ke_bao_hieu') || gameState !== 'playing') return;
    const pct = Math.min(1, window._dauCrowTimer / DAU_CROW_INTERVAL_MS);
    const charge = _dauSmooth((pct - 0.9) / 0.1);
    const pulse = 0.5 + 0.5 * Math.sin(pct * 55 + charge * 18);
    const x = player.x + Math.sin(pct * 950) * charge;
    const size = Math.max(player.width, player.height) + 24;
    if (pct <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.35 + charge * (0.2 + pulse * 0.45));
    ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = size / 48;
    ctx.beginPath();
    ctx.arc(x, player.y, size * 43 / 96, Math.PI * 0.1, Math.PI * (0.1 + 0.8 * pct));
    ctx.stroke();
    ctx.restore();
}
