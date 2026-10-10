// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/enemy-goliath.js — Goliath (Information Lifeform), Dominator-tier
// prototype boss for the future Administrator class. Visuals ported directly
// from the approved test-goliath.html prototype (faceted-crystal body, 3 gem
// slots + tracking eye, 2 boulder arms hanging from shoulder chunks), adapted
// to real enemy objects (enemy.x/enemy.y/enemy.size) and performance.now().

const GOLIATH_GEM_COLORS = [
    { name: 'Veilshroud', dark: '#0b3b3a', mid: '#2dd4bf', light: '#e6fffb' },
    { name: 'Thaelis', dark: '#2d004d', mid: '#8b5cf6', light: '#e9ddff' },
    { name: 'Raphael', dark: '#7a5a00', mid: '#fbbf24', light: '#fff8e1' },
    { name: 'Marchosias', dark: '#003322', mid: '#10b981', light: '#ccffe9' },
    { name: 'Egregor', dark: '#003344', mid: '#14b8a6', light: '#c9fff5' },
    { name: 'Dargruel', dark: '#3a0000', mid: '#991b1b', light: '#ffcccc' },
    { name: 'Leviathan', dark: '#1a0033', mid: '#00e5ff', light: '#eafaff' },
];

function _goliathHexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function _goliathLerpColor(hexA, hexB, t) {
    const a = _goliathHexToRgb(hexA), b = _goliathHexToRgb(hexB);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
}
// Crackle jitter on the body, halo and arms comes from a generator that is
// re-seeded every 1/60 s and per line, so those lines flicker at the same
// rate on a 60Hz screen and a 144Hz one, and hold still between ticks.
let _goliathJitterState = 1;
function _goliathJitterSeed(key) {
    const tick = Math.floor(performance.now() / 16.667);
    _goliathJitterState = (Math.imul(tick, 2654435761) ^ Math.imul(key + 1, 40503)) >>> 0 || 1;
}
function _goliathRand() {
    let x = _goliathJitterState;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    _goliathJitterState = x >>> 0;
    return _goliathJitterState / 4294967296;
}
// `key`, when given, ties the jitter to that line and the 60Hz tick.
function _goliathGenerateVein(x1, y1, x2, y2, segments, jitter, key) {
    const rnd = key === undefined ? Math.random : _goliathRand;
    if (key !== undefined) _goliathJitterSeed(key);
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        if (i > 0 && i < segments) { x += (rnd() - 0.5) * jitter; y += (rnd() - 0.5) * jitter; }
        pts.push({ x, y });
    }
    return pts;
}

// Outline bất đối xứng (khớp splash art) — Alpha = mảnh vỡ góc cạnh
const GOLIATH_ALPHA_OUTLINE = [
    { x: -15, y: -175 }, { x: 30, y: -195 }, { x: 68, y: -155 }, { x: 100, y: -165 },
    { x: 128, y: -105 }, { x: 108, y: -45 }, { x: 92, y: 15 }, { x: 58, y: 68 },
    { x: 30, y: 128 }, { x: 4, y: 178 }, { x: -26, y: 122 }, { x: -58, y: 62 },
    { x: -96, y: 12 }, { x: -112, y: -58 }, { x: -70, y: -118 }, { x: -40, y: -155 },
];
const GOLIATH_ALPHA_CORE = { x: 6, y: -55 };
const GOLIATH_ALPHA_VEINS = [
    _goliathGenerateVein(GOLIATH_ALPHA_CORE.x, GOLIATH_ALPHA_CORE.y, -20, -170, 5, 14),
    _goliathGenerateVein(GOLIATH_ALPHA_CORE.x, GOLIATH_ALPHA_CORE.y, 100, -140, 5, 14),
    _goliathGenerateVein(GOLIATH_ALPHA_CORE.x, GOLIATH_ALPHA_CORE.y, 118, 0, 5, 14),
    _goliathGenerateVein(GOLIATH_ALPHA_CORE.x, GOLIATH_ALPHA_CORE.y, 40, 150, 6, 16),
    _goliathGenerateVein(GOLIATH_ALPHA_CORE.x, GOLIATH_ALPHA_CORE.y, -80, 90, 5, 14),
    _goliathGenerateVein(GOLIATH_ALPHA_CORE.x, GOLIATH_ALPHA_CORE.y, -100, -30, 5, 14),
    _goliathGenerateVein(GOLIATH_ALPHA_CORE.x, GOLIATH_ALPHA_CORE.y, -50, -150, 4, 12),
];

// True Form: thân TRÒN TRỊA kiểu creature (không còn góc cạnh sắc như Alpha)
const GOLIATH_TRUE_FORM_OUTLINE = (() => {
    const pts = [], n = 16, rx = 195, ry = 235;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const wobble = 1 + Math.sin(a * 3 + 1.3) * 0.07 + Math.sin(a * 5 + 0.4) * 0.04;
        pts.push({ x: Math.cos(a) * rx * wobble, y: Math.sin(a) * ry * wobble - 15 });
    }
    return pts;
})();
const GOLIATH_TRUE_FORM_CORE = { x: 0, y: -35 };
const GOLIATH_TRUE_FORM_VEINS = [
    _goliathGenerateVein(GOLIATH_TRUE_FORM_CORE.x, GOLIATH_TRUE_FORM_CORE.y, -30, -260, 6, 18),
    _goliathGenerateVein(GOLIATH_TRUE_FORM_CORE.x, GOLIATH_TRUE_FORM_CORE.y, 150, -210, 6, 18),
    _goliathGenerateVein(GOLIATH_TRUE_FORM_CORE.x, GOLIATH_TRUE_FORM_CORE.y, 175, 10, 6, 18),
    _goliathGenerateVein(GOLIATH_TRUE_FORM_CORE.x, GOLIATH_TRUE_FORM_CORE.y, 60, 230, 7, 20),
    _goliathGenerateVein(GOLIATH_TRUE_FORM_CORE.x, GOLIATH_TRUE_FORM_CORE.y, -120, 140, 6, 18),
    _goliathGenerateVein(GOLIATH_TRUE_FORM_CORE.x, GOLIATH_TRUE_FORM_CORE.y, -150, -40, 6, 18),
    _goliathGenerateVein(GOLIATH_TRUE_FORM_CORE.x, GOLIATH_TRUE_FORM_CORE.y, -70, -220, 5, 16),
];
const GOLIATH_TRUE_FORM_FRAGMENTS = [
    { ox: 200, oy: -160, outline: [{ x: 0, y: -30 }, { x: 26, y: -8 }, { x: 16, y: 26 }, { x: -20, y: 18 }, { x: -24, y: -14 }], core: { x: 0, y: 0 }, spin: 0.3 },
    { ox: -230, oy: -130, outline: [{ x: 0, y: -24 }, { x: 22, y: -4 }, { x: 10, y: 24 }, { x: -24, y: 10 }], core: { x: -2, y: 2 }, spin: -0.22 },
    { ox: -250, oy: 130, outline: [{ x: 0, y: -26 }, { x: 20, y: -6 }, { x: 24, y: 20 }, { x: -6, y: 28 }, { x: -26, y: 4 }], core: { x: 0, y: 4 }, spin: 0.18 },
    { ox: 220, oy: 170, outline: [{ x: 0, y: -22 }, { x: 24, y: 0 }, { x: 8, y: 24 }, { x: -20, y: 8 }], core: { x: 0, y: 0 }, spin: -0.28 },
];

const GOLIATH_SLOT_ANCHORS = [
    { x: 10, y: -108 },
    { x: -46, y: -14 },
    { x: 58, y: -10 },
];
const GOLIATH_EYE_POS = {
    x: (GOLIATH_SLOT_ANCHORS[0].x + GOLIATH_SLOT_ANCHORS[1].x + GOLIATH_SLOT_ANCHORS[2].x) / 3,
    y: (GOLIATH_SLOT_ANCHORS[0].y + GOLIATH_SLOT_ANCHORS[1].y + GOLIATH_SLOT_ANCHORS[2].y) / 3,
};
const GOLIATH_LIMB_JOINT = {
    left: { x: -150, y: -30 },
    right: { x: 150, y: -30 },
};

// Khối pha lê nhiều facet (dùng chung Alpha/True Form/mảnh vỡ) — mỗi facet =
// tam giác (core -> p1 -> p2), tô gradient sáng/tối theo góc so với nguồn
// sáng giả lập để có chiều sâu thay vì hình phẳng 1 màu.
// Facet shading only depends on the outline, the light angle and the two
// colours, all fixed per call site, so the fill and highlight styles are
// worked out once per outline and reused.
const _goliathFacetCache = new WeakMap();
function _goliathFacetStyles(outline, core, lightAngle, colorDark, colorLight) {
    let byKey = _goliathFacetCache.get(outline);
    if (!byKey) _goliathFacetCache.set(outline, byKey = {});
    const key = colorDark + colorLight + lightAngle + core.x + ',' + core.y;
    let st = byKey[key];
    if (st) return st;
    st = { fills: [], highlights: [] };
    for (let i = 0; i < outline.length; i++) {
        const p1 = outline[i], p2 = outline[(i + 1) % outline.length];
        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
        let diff = Math.atan2(midY - core.y, midX - core.x) - lightAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const lightness = (Math.cos(diff) + 1) / 2;
        st.fills.push(_goliathLerpColor(colorDark, colorLight, lightness * 0.85));
        if (lightness > 0.6) st.highlights.push(i, `rgba(255,255,255,${(lightness - 0.6) * 1.6})`);
    }
    return (byKey[key] = st);
}
function _drawGoliathFacetedCrystal(outline, core, lightAngle, colorDark, colorLight, outlineColor) {
    const st = _goliathFacetStyles(outline, core, lightAngle, colorDark, colorLight);
    ctx.strokeStyle = outlineColor || 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < outline.length; i++) {
        const p1 = outline[i], p2 = outline[(i + 1) % outline.length];
        ctx.beginPath();
        ctx.moveTo(core.x, core.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.closePath();
        ctx.fillStyle = st.fills[i];
        ctx.fill();
        ctx.stroke();
    }
    if (!_mobPerf) {
        ctx.lineWidth = 1.5;
        const h = st.highlights;
        for (let j = 0; j < h.length; j += 2) {
            const i = h[j], p1 = outline[i], p2 = outline[(i + 1) % outline.length];
            ctx.strokeStyle = h[j + 1];
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
    }
}

// Glows that used to be re-blurred every frame with shadowBlur are painted once
// here and then just blitted. `half` is the sprite's half size in logical px,
// `res` how many sprite px per logical px (2 keeps thin lines crisp on hi-dpi).
const _goliathFxCache = {};
function _goliathFxSprite(key, half, res, paint) {
    let c = _goliathFxCache[key];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(half * 2 * res);
    const g = c.getContext('2d');
    g.scale(res, res);
    g.translate(half, half);
    paint(g);
    return (_goliathFxCache[key] = c);
}
// Every baked glow, by name. Draw sites ask for one through _goliathFx, and
// _goliathPrewarmFx paints them all ahead of time so none of them is built on
// the frame it first shows up.
const GOLIATH_FX = {
    shoulderGoo: { half: 200, res: 1, paint(g, seed) {
        const R = 108;
        const goo = g.createRadialGradient(-R * 0.2, -R * 0.25, 0, 0, 0, R * 1.3);
        goo.addColorStop(0, 'rgba(255,190,80,0.55)');
        goo.addColorStop(0.6, 'rgba(255,120,20,0.35)');
        goo.addColorStop(1, 'rgba(255,90,0,0)');
        const pts = 12;
        g.beginPath();
        for (let i = 0; i <= pts; i++) {
            const a = (i / pts) * Math.PI * 2;
            const rr = R * 1.18 * (0.9 + 0.14 * Math.sin(a * 4 + seed) + 0.1 * Math.sin(a * 2.3 + seed * 1.3));
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.fillStyle = goo; g.fill();
        g.shadowColor = '#ff8c1a'; g.shadowBlur = 22;
        g.strokeStyle = 'rgba(255,150,40,0.5)'; g.lineWidth = 3; g.stroke();
    } },
    fistRing: { half: 100, res: 2, paint(g, accentColor) {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.beginPath(); g.arc(0, 0, 58 * 1.35, a, a + 0.3);
            g.strokeStyle = accentColor; g.lineWidth = 2.5;
            g.shadowColor = accentColor; g.shadowBlur = 10;
            g.stroke();
        }
    } },
    inevDisc: { half: 300, res: 1, paint(g) {
        g.beginPath(); g.arc(0, 0, 260, 0, Math.PI * 2);
        const gr = g.createRadialGradient(0, 0, 150, 0, 0, 260);
        gr.addColorStop(0, 'rgba(255,69,0,0)'); gr.addColorStop(1, 'rgba(255,69,0,0.24)');
        g.fillStyle = gr;
        g.shadowColor = '#ff4500'; g.shadowBlur = 26;
        g.fill();
    } },
    inevArcs: { half: 320, res: 1, paint(g) {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.beginPath(); g.arc(0, 0, 290, a, a + 0.18);
            g.strokeStyle = 'rgba(255,140,60,0.8)'; g.lineWidth = 3.5;
            g.shadowColor = '#ff4500'; g.shadowBlur = 10; g.stroke();
        }
    } },
    haloRing: { half: 200, res: 1.5, paint(g) {
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            g.beginPath(); g.arc(0, 0, GOLIATH_HALO_R * 0.42, a, a + 0.34);
            g.strokeStyle = 'rgba(245,158,11,0.55)'; g.lineWidth = 4;
            g.shadowColor = '#f59e0b'; g.shadowBlur = 14;
            g.stroke();
        }
    } },
    haloVertex: { half: 100, res: 1.5, paint(g) {
        g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2);
        g.strokeStyle = 'rgba(255,158,11,0.6)'; g.lineWidth = 3;
        g.shadowColor = '#f59e0b'; g.shadowBlur = 18;
        g.stroke();
    } },
    // Absolute Verdict: the distortion falloff, the core, its gold rim and the
    // rim's glow, all fixed in size
    verdictBody: { half: 180, res: 1, paint(g) {
        const rg = g.createRadialGradient(0, 0, 101, 0, 0, 149);
        rg.addColorStop(0, 'rgba(157,0,255,0.18)'); rg.addColorStop(1, 'rgba(157,0,255,0)');
        g.beginPath(); g.arc(0, 0, 149, 0, Math.PI * 2); g.fillStyle = rg; g.fill();
        const cg = g.createRadialGradient(0, 0, 0, 0, 0, 101);
        cg.addColorStop(0, '#f3e8ff'); cg.addColorStop(0.22, '#c084fc'); cg.addColorStop(0.55, '#6d28d9');
        cg.addColorStop(0.85, '#1a0a2e'); cg.addColorStop(1, 'rgba(10,0,20,0)');
        g.beginPath(); g.arc(0, 0, 101, 0, Math.PI * 2);
        g.fillStyle = cg; g.shadowColor = '#f59e0b'; g.shadowBlur = 26; g.fill();
        g.strokeStyle = '#f59e0b'; g.lineWidth = 6; g.stroke();
        g.shadowBlur = 0;
        const hg = g.createRadialGradient(0, 0, 0, 0, 0, 30);
        hg.addColorStop(0, 'rgba(255,255,255,0.9)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
        g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fillStyle = hg; g.fill();
    } },
    verdictShard: { half: 26, res: 2, paint(g) {
        g.beginPath(); g.moveTo(0, -14); g.lineTo(12, 7); g.lineTo(-12, 7); g.closePath();
        g.fillStyle = '#c084fc'; g.shadowColor = '#9d00ff'; g.shadowBlur = 8; g.fill();
    } },
    // Unbroken Will's soft orange bloom, fixed in size, so it is blitted
    // rather than rebuilt as a gradient every frame
    unbrokenGlow: { half: 470, res: 0.5, paint(g) {
        const gr = g.createRadialGradient(0, 0, GOLIATH_HALO_R * 0.3, 0, 0, GOLIATH_HALO_R * 1.15);
        gr.addColorStop(0, 'rgba(249,115,22,0.22)'); gr.addColorStop(1, 'rgba(249,115,22,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, GOLIATH_HALO_R * 1.15, 0, Math.PI * 2); g.fill();
    } },
    // phase two: a ragged corona of flame tongues hugging the body
    phase2Corona: { half: 320, res: 1, paint(g) {
        const pts = 36;
        g.beginPath();
        for (let i = 0; i <= pts; i++) {
            const a = (i / pts) * Math.PI * 2;
            const tongue = i % 2 === 0 ? 1 : 0.78;
            const rr = (250 + 30 * Math.sin(a * 5) + 18 * Math.sin(a * 11 + 1.3)) * tongue;
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        const gr = g.createRadialGradient(0, 0, 120, 0, 0, 300);
        gr.addColorStop(0, 'rgba(255,60,20,0)');
        gr.addColorStop(0.45, 'rgba(255,70,25,0.32)');
        gr.addColorStop(0.75, 'rgba(255,140,50,0.22)');
        gr.addColorStop(1, 'rgba(255,90,20,0)');
        g.fillStyle = gr;
        g.shadowColor = '#ff3b1f'; g.shadowBlur = 24;
        g.fill();
    } },
    // phase two: a broken crimson rune ring with tick marks, turning against the halo
    phase2Ring: { half: 340, res: 1, paint(g) {
        g.shadowColor = '#ff2a1a'; g.shadowBlur = 12;
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            g.beginPath(); g.arc(0, 0, 305, a + 0.06, a + 0.42);
            g.strokeStyle = 'rgba(255,72,48,0.75)'; g.lineWidth = 4; g.stroke();
            const ta = a + 0.48;
            g.beginPath();
            g.moveTo(Math.cos(ta) * 290, Math.sin(ta) * 290);
            g.lineTo(Math.cos(ta) * 322, Math.sin(ta) * 322);
            g.strokeStyle = 'rgba(255,200,170,0.8)'; g.lineWidth = 2.5; g.stroke();
        }
    } },
    // a soft round glow for trails and embers, tinted per colour
    softDot: { half: 32, res: 1, paint(g, color) {
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
        gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(-32, -32, 64, 64);
    } },
};
function _goliathFx(name, arg) {
    const d = GOLIATH_FX[name];
    return _goliathFxSprite(arg === undefined ? name : name + arg, d.half, d.res, g => d.paint(g, arg));
}
function _blitGoliathFx(sprite, half) {
    ctx.drawImage(sprite, -half, -half, half * 2, half * 2);
}

function _drawGoliathVeins(veins, intensity) {
    for (const vein of veins) {
        ctx.beginPath();
        ctx.moveTo(vein[0].x, vein[0].y);
        for (let j = 1; j < vein.length; j++) ctx.lineTo(vein[j].x, vein[j].y);
        ctx.strokeStyle = 'rgba(20,8,0,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
        if (!_mobPerf) {
            ctx.strokeStyle = `rgba(255,158,11,${0.10 + 0.14 * intensity})`;
            ctx.lineWidth = 7 + intensity * 9;
            ctx.stroke();
        }
        ctx.strokeStyle = `rgba(255,158,11,${0.75 * intensity + 0.25})`;
        ctx.lineWidth = 1.4 + intensity * 2.2;
        ctx.stroke();
    }
}

function _drawGoliathGemDiamond(x, y, size, gem, glowMul, now) {
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(-size * 0.2, -size * 0.3, 0, 0, 0, size * 1.5);
    g.addColorStop(0, gem.light); g.addColorStop(0.45, gem.mid); g.addColorStop(1, gem.dark);
    if (!_mobPerf) { ctx.shadowColor = gem.mid; ctx.shadowBlur = (16 + Math.sin(now / 200) * 5) * (glowMul || 1); }
    ctx.beginPath();
    ctx.moveTo(0, -size); ctx.lineTo(size * 0.72, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.72, 0); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -size); ctx.lineTo(0, size);
    ctx.moveTo(0, -size * 0.35); ctx.lineTo(size * 0.72, 0);
    ctx.moveTo(0, -size * 0.35); ctx.lineTo(-size * 0.72, 0);
    ctx.moveTo(0, size * 0.35); ctx.lineTo(size * 0.72, 0);
    ctx.moveTo(0, size * 0.35); ctx.lineTo(-size * 0.72, 0);
    ctx.stroke();
    if (!_mobPerf) {
        const sparkleA = now / 620;
        const sx = Math.cos(sparkleA) * size * 0.32, sy = Math.sin(sparkleA) * size * 0.32 * 0.6 - size * 0.25;
        ctx.globalAlpha = 0.6 + Math.sin(now / 165) * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, size * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}

// Con mắt sống theo dõi người chơi — chỉ hiện sau khi biến hình xong
function _drawGoliathEye(x, y, r, originX, originY, now) {
    const eyeAngle = Math.atan2(player.y - originY, player.x - originX);
    const breathe = 1 + Math.sin(now / 830) * 0.05;
    const blinkCycle = 4200, blinkDur = 160;
    const bt = now % blinkCycle;
    const blinkScale = bt < blinkDur ? Math.max(0.04, 1 - Math.sin((bt / blinkDur) * Math.PI)) : 1;

    ctx.save();
    ctx.translate(x, y);

    const haloG = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.2 * breathe);
    haloG.addColorStop(0, 'rgba(245,158,11,0.35)'); haloG.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.beginPath(); ctx.arc(0, 0, r * 2.2 * breathe, 0, Math.PI * 2); ctx.fillStyle = haloG; ctx.fill();

    ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    const bezelG = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.18);
    bezelG.addColorStop(0, '#1a1a1a'); bezelG.addColorStop(1, '#050505');
    ctx.fillStyle = bezelG; ctx.fill();
    ctx.strokeStyle = 'rgba(245,158,11,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        ctx.lineTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
        ctx.strokeStyle = 'rgba(245,158,11,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.save();
    ctx.scale(1, blinkScale);

    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#0d0d10'; ctx.fill();

    const eOff = r * 0.28;
    const ex = Math.cos(eyeAngle) * eOff, ey = Math.sin(eyeAngle) * eOff;
    ctx.save();
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.68, 0, Math.PI * 2); ctx.clip();
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.68, 0, Math.PI * 2); ctx.fillStyle = '#e8e8ff'; ctx.fill();
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a) * r * 0.68, ey + Math.sin(a) * r * 0.68);
        ctx.strokeStyle = i % 2 === 0 ? '#f59e0b' : '#d97706'; ctx.lineWidth = r * 0.09; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(ex, ey); ctx.rotate(eyeAngle + Math.PI / 2);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.09, r * 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
    ctx.restore();

    if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 14; }
    ctx.strokeStyle = 'rgba(245,158,11,0.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
}

// 3 khe bảo thạch + mắt trung tâm (dùng chung Alpha/True Form)
function _drawGoliathSlots(enemy, originX, originY, showEye, now) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245,158,11,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    GOLIATH_SLOT_ANCHORS.forEach(a => { ctx.moveTo(GOLIATH_EYE_POS.x, GOLIATH_EYE_POS.y); ctx.lineTo(a.x, a.y); });
    ctx.stroke();
    ctx.restore();

    enemy.slots.forEach((slot, i) => {
        const anchor = GOLIATH_SLOT_ANCHORS[i];
        // Chết (NEW): bảo thạch đã nổ trong chuỗi hiệu ứng chết thì KHÔNG vẽ
        // lại nữa (coi như khe rỗng) — trước đây vẫn cứ vẽ bình thường dù đã
        // "nổ", trông như chưa hề mất.
        const _gemGone = i < (enemy._deathGemsExploded || 0);
        if (slot.filled && !_gemGone) {
            _drawGoliathGemDiamond(anchor.x, anchor.y, 20, slot.gem, 1, now);
        } else {
            ctx.save();
            ctx.translate(anchor.x, anchor.y);
            const pulse = 0.25 + Math.sin(now / 333 + i * 2) * 0.2;
            ctx.beginPath();
            ctx.moveTo(0, -20); ctx.lineTo(14, 0); ctx.lineTo(0, 20); ctx.lineTo(-14, 0); ctx.closePath();
            ctx.fillStyle = '#000'; ctx.fill();
            ctx.strokeStyle = `rgba(255,255,255,${pulse})`; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
        }
    });

    if (showEye) _drawGoliathEye(GOLIATH_EYE_POS.x, GOLIATH_EYE_POS.y, 34, originX, originY, now);
}

// Khối đá gồ ghề kiểu golem (dùng cho vai + đốt tay + nắm đấm)
// The fill gradient only depends on the radius, and the arm and fist radii are
// a handful of fixed values, so gradients are kept per rounded radius.
const _goliathBoulderGradCache = new Map();
function _goliathBoulderGrad(r) {
    let rg = _goliathBoulderGradCache.get(r);
    if (rg) return rg;
    rg = ctx.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r * 1.15);
    rg.addColorStop(0, '#555560'); rg.addColorStop(0.5, '#2c2c36'); rg.addColorStop(1, '#0a0a0a');
    if (_goliathBoulderGradCache.size > 64) _goliathBoulderGradCache.clear();
    _goliathBoulderGradCache.set(r, rg);
    return rg;
}
function _drawGoliathBoulderChunk(cx, cy, r, seed) {
    r = Math.round(r * 4) / 4;
    ctx.save();
    ctx.translate(cx, cy);
    const pts = 10;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const rr = r * (0.85 + 0.16 * Math.sin(a * 3.1 + seed) + 0.08 * Math.sin(a * 5.3 + seed * 1.7));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = _goliathBoulderGrad(r); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    // the four dents never overlap, so they share one path and one fill
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + seed;
        const ex = Math.cos(a) * r * 0.4, ey = Math.sin(a) * r * 0.4;
        ctx.moveTo(ex + Math.cos(a) * r * 0.22, ey + Math.sin(a) * r * 0.22);
        ctx.ellipse(ex, ey, r * 0.22, r * 0.12, a, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    ctx.restore();
}
function _drawGoliathShoulderBoulder(jx, jy, alpha, seed) {
    if (alpha <= 0.02) return;
    // To hơn (85 -> 108) + bọc ngoài lớp ma thuật cam dính dính kiểu slime,
    // để thấy rõ kết nối phép thuật giữa vai và cánh tay thay vì đá tĩnh trơ.
    const R = 108;
    ctx.save(); ctx.globalAlpha = alpha;

    ctx.save(); ctx.translate(jx, jy);
    _blitGoliathFx(_goliathFx('shoulderGoo', seed), 200);
    // vài giọt slime nhỏ rủ quanh viền, chảy chậm theo thời gian
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + seed;
        const drip = 10 + 8 * (0.5 + 0.5 * Math.sin(performance.now() / 600 + seed + i));
        const dropX = Math.cos(a) * R * 1.08, dropY = Math.sin(a) * R * 1.08;
        ctx.beginPath();
        ctx.ellipse(dropX, dropY + drip * 0.5, 5, drip * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,140,30,0.4)';
        ctx.fill();
    }
    ctx.restore();

    _drawGoliathBoulderChunk(jx, jy, R, seed);

    // vệt nứt phát sáng cam trên bề mặt đá — dấu vết ma thuật thẩm thấu vào đá
    ctx.save(); ctx.translate(jx, jy);
    const vein = _goliathGenerateVein(0, 0, Math.cos(seed) * R * 0.7, Math.sin(seed) * R * 0.7, 4, R * 0.45, 150 + seed);
    ctx.beginPath();
    vein.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
    if (!_mobPerf) { ctx.strokeStyle = 'rgba(255,140,30,0.18)'; ctx.lineWidth = 8; ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,170,50,0.85)'; ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
}
function _goliathBezierPt(x0, y0, cx, cy, x1, y1, t) {
    const mt = 1 - t;
    return { x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1, y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1 };
}
function _drawGoliathRockArm(fromX, fromY, toX, toY, alpha, bowX) {
    if (alpha <= 0.02) return;
    // Port từ test-goliath.html drawRockArmSegments: 5 cục đá (không phải 3)
    // + 2 lớp tether năng lượng cam giật lag ngẫu nhiên mỗi khung hình, để
    // đọc rõ ràng là 1 chuỗi thiên thạch được KẾT NỐI BẰNG MA THUẬT với nhau,
    // chứ không phải các cục đá rời rạc không liên quan gì tới nhau.
    const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2;
    const cx = midX + (bowX || 0), cy = midY;
    const numRocks = 5;
    ctx.save(); ctx.globalAlpha = alpha;

    ctx.beginPath();
    const steps = 15;
    const side = bowX < 0 ? 0 : 1;
    _goliathJitterSeed(200 + side);
    for (let i = 0; i <= steps; i++) {
        const pt = _goliathBezierPt(fromX, fromY, cx, cy, toX, toY, i / steps);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x + (_goliathRand() - 0.5) * 16, pt.y + (_goliathRand() - 0.5) * 16);
    }
    if (!_mobPerf) { ctx.strokeStyle = 'rgba(255,158,11,0.2)'; ctx.lineWidth = 15; ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,158,11,0.85)'; ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const pt = _goliathBezierPt(fromX, fromY, cx, cy, toX, toY, i / steps);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x + (_goliathRand() - 0.5) * 24, pt.y + (_goliathRand() - 0.5) * 24);
    }
    ctx.strokeStyle = 'rgba(255,200,50,0.5)'; ctx.lineWidth = 3; ctx.stroke();

    const seed = fromX + fromY;
    for (let i = 1; i <= numRocks; i++) {
        const t = i / (numRocks + 1);
        const pt = _goliathBezierPt(fromX, fromY, cx, cy, toX, toY, t);
        const r = 42 - t * 20 + Math.sin(i * 1.5) * 6;
        _drawGoliathBoulderChunk(pt.x, pt.y, r, seed + i * 10);
    }
    ctx.restore();
}
function _drawGoliathFist(fx, fy, alpha, accent) {
    if (alpha <= 0.02) return;
    // To hơn (48 thay 40), rõ khớp đốt tay (4 mấu tròn quanh mép trên như
    // nắm tay đá thật), + vòng phù văn phép thuật quanh cổ tay để "dính ma
    // thuật" rõ hơn là chỉ 1 đường viền mảnh.
    const R = 48 * alpha + 10;
    const accentColor = accent === 'spiral' ? '#9d00ff' : '#fbbf24';
    const accentLight = accent === 'spiral' ? '#c084fc' : '#fde68a';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fx, fy);

    // vòng phù văn phép thuật quanh cổ tay (ma thuật "dính" rõ ràng hơn)
    ctx.save(); ctx.rotate(fx / 1000);
    if (alpha >= 0.999) {
        // fully grown: R is a constant 58, so the ring is baked once per accent
        ctx.globalAlpha = 0.55;
        _blitGoliathFx(_goliathFx('fistRing', accentColor), 100);
    } else {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath(); ctx.arc(0, 0, R * 1.35, a, a + 0.3);
            ctx.strokeStyle = `${accentColor}`; ctx.globalAlpha = alpha * 0.55;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
    }
    ctx.restore();
    ctx.globalAlpha = alpha;

    _drawGoliathBoulderChunk(0, 0, R, fx + fy + 91);

    // 4 mấu đốt tay quanh mép trên nắm đá — đọc rõ là 1 BÀN TAY nắm lại, không
    // phải 1 hòn đá tròn trơn
    for (let i = 0; i < 4; i++) {
        const a = -Math.PI * 0.75 + i * (Math.PI * 0.5 / 3);
        const kx = Math.cos(a) * R * 0.82, ky = Math.sin(a) * R * 0.82;
        _drawGoliathBoulderChunk(kx, ky, R * 0.32, fx + i * 7 + 13);
    }

    if (accent === 'spiral') {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
            const t = i / 40, a = t * Math.PI * 4, rr = t * R * 0.62;
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (!_mobPerf) { ctx.strokeStyle = 'rgba(157,0,255,0.22)'; ctx.lineWidth = 9; ctx.stroke(); }
        ctx.strokeStyle = 'rgba(196,132,252,0.9)'; ctx.lineWidth = 2.5;
        ctx.stroke();
    } else if (accent === 'spikes') {
        for (let i = 0; i < 3; i++) {
            const a = -0.6 + i * 0.6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75);
            ctx.lineTo(Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.35);
            ctx.lineTo(Math.cos(a + 0.18) * R * 0.8, Math.sin(a + 0.18) * R * 0.8);
            ctx.closePath();
            const spikeGrad = ctx.createLinearGradient(0, 0, Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.35);
            spikeGrad.addColorStop(0, '#7a5a00'); spikeGrad.addColorStop(1, accentLight);
            ctx.fillStyle = spikeGrad;
            ctx.fill();
        }
    }
    ctx.restore();
}

// 2 tay treo xuống từ 2 vai — growth (0..1) cho hiệu ứng mọc ra lúc biến hình.
// Port từ test-goliath.html: tay có sway (đung đưa nhẹ liên tục, không đứng
// khựng), + 2 tư thế đặc biệt (giơ cao tụ lực Absolute Verdict / chụm vào
// ngực Warding Palm) thay vì tay luôn đứng yên 1 vị trí bất kể đang làm gì.
function _drawGoliathLimbs(enemy, growth) {
    const g = growth === undefined ? 1 : growth;
    const easedG = 1 - Math.pow(1 - Math.max(0, Math.min(1, g)), 3);
    const now = performance.now();
    const t = now / 1000;
    const swayL = Math.sin(t * 1.1) * 4, swayR = Math.sin(t * 1.1 + Math.PI) * 4;
    // Tay lơ lửng lên xuống nhẹ nhàng như đang cử động lúc bay — CÙNG PHA
    // với nhau (2 tay lên/xuống cùng lúc), chỉ lệch pha với sway ngang để
    // không trông như 1 khối cứng đung đưa.
    const bobL = Math.sin(t * 0.85 + 0.6) * 10, bobR = Math.sin(t * 0.85 + 0.6) * 10;

    // Bob áp cho CẢ vai lẫn bàn tay — nguyên cánh tay (từ bàn tay tới vai)
    // trôi lên xuống cùng nhau như 1 khối, không chỉ mỗi bàn tay lắc lư ở đầu.
    const jointLX = GOLIATH_LIMB_JOINT.left.x, jointLY = GOLIATH_LIMB_JOINT.left.y + bobL;
    const jointRX = GOLIATH_LIMB_JOINT.right.x, jointRY = GOLIATH_LIMB_JOINT.right.y + bobR;

    let lX = jointLX - 95 * easedG + swayL, lY = jointLY + 210 * easedG;
    let rX = jointRX + 95 * easedG + swayR, rY = jointRY + 210 * easedG;

    // Absolute Verdict: cả 2 tay CHẤP LẠI NGAY MẮT để tụ quả cầu (không phải
    // giơ cao riêng lẻ) — đúng tư thế "channeling" thật.
    if (enemy._verdictPhase === 'channeling') {
        const vp = Math.min(1, (enemy._verdictChannelTimer || 0) / GOLIATH_VERDICT_CHANNEL_MS);
        lX = lX + (GOLIATH_EYE_POS.x - lX) * vp; lY = lY + (GOLIATH_EYE_POS.y - lY) * vp;
        rX = rX + (GOLIATH_EYE_POS.x - rX) * vp; rY = rY + (GOLIATH_EYE_POS.y - rY) * vp;
    }

    // Warding Palm: cả 2 tay chụm vào giữa ngực để hợp thành 1 khiên chung,
    // trong đúng khung 500ms của flash đỡ/hụt.
    if (enemy._wardingPalmFlash && now < enemy._wardingPalmFlash.end) {
        const wp = (enemy._wardingPalmFlash.end - now) / 500; // 1->0
        const clapX = 0, clapY = -30;
        lX = lX + (clapX - lX) * (1 - wp); lY = lY + (clapY - lY) * (1 - wp);
        rX = rX + (clapX - rX) * (1 - wp); rY = rY + (clapY - rY) * (1 - wp);
    }

    // Corrupted Meteor: tay phải giơ cao lên để hút Apostle mục tiêu vào lõi
    // thiên thạch nén chặt tại nắm tay, thay vì tư thế treo mặc định.
    if (enemy._meteorPhase === 'charging') {
        const mp = Math.min(1, (enemy._meteorChargeTimer || 0) / 800);
        const raiseX = jointRX + 60, raiseY = jointRY - 180;
        rX = rX + (raiseX - rX) * mp; rY = rY + (raiseY - rY) * mp;
    }

    _drawGoliathShoulderBoulder(jointLX, jointLY, easedG, 11);
    _drawGoliathRockArm(jointLX, jointLY, lX, lY, easedG, -90);
    _drawGoliathFist(lX, lY, easedG, 'spiral');

    // Absolute Verdict: quả cầu tụ lực NGAY TẠI MẮT (2 tay chấp lại quanh đó)
    // — chỉ phần hào quang tụ lực body-relative ở đây, đường ngắm runway-light
    // dài tới người chơi được vẽ riêng ở lớp hiệu ứng 1:1 vì nếu vẽ ở đây,
    // khoảng cách thật sẽ bị co theo trueScale, không kéo dài đủ xa.
    if (enemy._verdictPhase === 'channeling') {
        const p = Math.min(1, (enemy._verdictChannelTimer || 0) / GOLIATH_VERDICT_CHANNEL_MS);
        const radius = 10 + p * 55;
        const ex = GOLIATH_EYE_POS.x, ey = GOLIATH_EYE_POS.y;
        ctx.save();
        const orbGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, radius);
        orbGrad.addColorStop(0, '#4c1d95'); orbGrad.addColorStop(0.6, '#1a0a2e'); orbGrad.addColorStop(1, 'rgba(10,0,20,0)');
        ctx.beginPath(); ctx.arc(ex, ey, radius, 0, Math.PI * 2);
        ctx.fillStyle = orbGrad;
        if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 25 * p; }
        ctx.fill();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.restore();
    }

    _drawGoliathShoulderBoulder(jointRX, jointRY, easedG, 47);
    _drawGoliathRockArm(jointRX, jointRY, rX, rY, easedG, 90);
    _drawGoliathFist(rX, rY, easedG, 'spikes');

    // Corrupted Meteor: lõi thiên thạch nén dần tại nắm tay phải trong lúc hút
    if (enemy._meteorPhase === 'charging') {
        const mp = Math.min(1, (enemy._meteorChargeTimer || 0) / 800);
        const coreR = 8 + mp * 34;
        ctx.save();
        const coreG = ctx.createRadialGradient(rX, rY, 0, rX, rY, coreR);
        coreG.addColorStop(0, '#ffb84d'); coreG.addColorStop(0.55, '#7a2e00'); coreG.addColorStop(1, 'rgba(20,8,0,0)');
        ctx.beginPath(); ctx.arc(rX, rY, coreR, 0, Math.PI * 2);
        ctx.fillStyle = coreG;
        if (!_mobPerf) { ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 20 * mp; }
        ctx.fill();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function _drawGoliathHexagon(x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const px = x + size * Math.cos(angle), py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

// Khối đá nóng chảy tạm thời (pha Fusion của Transform) — thiên thạch dồn
// vào Alpha, phồng to dần, sủi bọt magma, chưa có hình dạng sắc nét cuối cùng
const GOLIATH_MOLTEN_BLOB_PTS = (() => {
    const pts = []; const n = 16;
    for (let i = 0; i < n; i++) pts.push({ a: (i / n) * Math.PI * 2, r: 0.7 + Math.random() * 0.55 });
    return pts;
})();
function _drawGoliathMoltenBlob(radius, intensity, now) {
    if (radius <= 0) return;
    ctx.beginPath();
    GOLIATH_MOLTEN_BLOB_PTS.forEach((p, i) => {
        const rr = radius * p.r;
        const x = Math.cos(p.a + now / 8300) * rr, y = Math.sin(p.a + now / 8300) * rr * 0.9;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, `rgba(255,140,30,${0.92 * intensity})`);
    g.addColorStop(0.55, `rgba(130,40,10,${0.85 * intensity})`);
    g.addColorStop(1, `rgba(25,10,5,${0.65 * intensity})`);
    if (!_mobPerf) {
        // baked glow behind the blob in place of a shadowBlur on its path
        const gs = radius * 3;
        const a0 = ctx.globalAlpha;
        ctx.globalAlpha = a0 * 0.55 * intensity;
        ctx.drawImage(_goliathFx('softDot', 'rgba(255,106,0,1)'), -gs / 2, -gs / 2, gs, gs);
        ctx.globalAlpha = a0;
    }
    ctx.fillStyle = g;
    ctx.fill();
    if (!_mobPerf) {
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + now / 2000;
            const rr = radius * (0.25 + 0.45 * Math.abs(Math.sin(now / 455 + i)));
            const bx = Math.cos(a) * rr, by = Math.sin(a) * rr * 0.9;
            const bubR = Math.max(2, 5 + Math.sin(now / 303 + i) * 4);
            ctx.beginPath(); ctx.arc(bx, by, bubR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,210,90,${0.55 * intensity})`;
            ctx.fill();
        }
    }
}

// The summoning circle under Alpha while the meteors gather: two of his baked
// rune rings turning against each other, plus streaks of energy pulled in
// toward him. Drawn in his local space, intensity 0..1.
function _drawGoliathSummonCircle(intensity, now) {
    if (intensity <= 0) return;
    ctx.save();
    ctx.globalAlpha *= intensity;
    ctx.save(); ctx.rotate(now / 1400); ctx.scale(0.62, 0.62);
    _blitGoliathFx(_goliathFx('haloRing'), 200);
    ctx.restore();
    ctx.save(); ctx.rotate(-now / 2100); ctx.scale(0.5, 0.5);
    _blitGoliathFx(_goliathFx('inevArcs'), 320);
    ctx.restore();
    const n = _mobPerf ? 8 : 16;
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
        const ph = (now / 650 + i / n) % 1;
        const a = i * 2.4;
        const r = 280 - ph * 230;
        ctx.strokeStyle = `rgba(255,196,120,${Math.sin(ph * Math.PI) * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a) * (r + 34), Math.sin(a) * (r + 34));
        ctx.stroke();
    }
    ctx.restore();
}

// Light rays turning out from his centre, used by the crystallize snap and the
// settle burst. Flat thin triangles, no gradients.
function _drawGoliathLightRays(count, len, alpha, now, color) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(${color},${alpha})`;
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + now / 2400;
        const half = 0.05 + 0.025 * Math.sin(now / 200 + i * 1.7);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - half) * len, Math.sin(a - half) * len);
        ctx.lineTo(Math.cos(a + half) * len, Math.sin(a + half) * len);
        ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

// A bright bloom at his centre, a baked sprite scaled to size
function _drawGoliathBloom(size, alpha, color) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(_goliathFx('softDot', color), -size / 2, -size / 2, size, size);
    ctx.restore();
}

// Thiên thạch bay từ mép màn hình vào (toạ độ TUYỆT ĐỐI màn hình, gọi ngoài
// translate(enemy.x,enemy.y) của thân)
function _drawGoliathMeteors(enemy, t, summonDur, now) {
    enemy._meteors.forEach(m => {
        if (m.arrived) return;
        const arriveTime = m.arriveAt * summonDur;
        const startTime = Math.max(0, arriveTime - 0.9);
        const p = Math.min(1, Math.max(0, (t - startTime) / (arriveTime - startTime || 1)));
        const x = m.fromX + (m.toX - m.fromX) * p, y = m.fromY + (m.toY - m.fromY) * p;
        const dirX = m.toX - m.fromX, dirY = m.toY - m.fromY;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        ctx.save();
        const tailGrad = ctx.createLinearGradient(x, y, x - (dirX / dirLen) * 70, y - (dirY / dirLen) * 70);
        tailGrad.addColorStop(0, 'rgba(255,180,60,0.8)'); tailGrad.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.strokeStyle = tailGrad; ctx.lineWidth = m.size * 0.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (dirX / dirLen) * 70, y - (dirY / dirLen) * 70); ctx.stroke();
        ctx.translate(x, y); ctx.rotate(m.rot + (now / 1000) * m.spin);
        const rockGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, m.size);
        rockGrad.addColorStop(0, '#555560'); rockGrad.addColorStop(0.6, '#2c2c36'); rockGrad.addColorStop(1, '#0a0a0a');
        ctx.beginPath();
        ctx.moveTo(0, -m.size); ctx.lineTo(m.size * 0.8, -m.size * 0.2); ctx.lineTo(m.size * 0.5, m.size);
        ctx.lineTo(-m.size * 0.6, m.size * 0.7); ctx.lineTo(-m.size * 0.8, -m.size * 0.3);
        ctx.closePath();
        ctx.fillStyle = rockGrad; ctx.fill();
        if (!_mobPerf) { ctx.strokeStyle = 'rgba(255,106,0,0.3)'; ctx.lineWidth = 6; ctx.stroke(); }
        ctx.strokeStyle = 'rgba(255,140,30,0.8)'; ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    });
    // every meteor that lands throws a short-lived impact ring where it hit
    for (const m of enemy._meteors) {
        if (!m.arrived) continue;
        const k = (t - m.arriveAt * summonDur) / 0.35;
        if (k < 0 || k > 1) continue;
        const r = 8 + k * (40 + m.size * 2);
        ctx.beginPath(); ctx.arc(m.toX, m.toY, r, 0, Math.PI * 2);
        if (!_mobPerf) { ctx.strokeStyle = `rgba(255,120,30,${(1 - k) * 0.3})`; ctx.lineWidth = 10; ctx.stroke(); }
        ctx.strokeStyle = `rgba(255,220,160,${(1 - k) * 0.85})`; ctx.lineWidth = 2.5;
        ctx.stroke();
    }
}

// Inevitable — trường giới hạn sát thương nhiều lớp (quầng nhiệt + lưới lục
// giác + vệt HUD cảnh báo xoay quanh viền + tia lửa ngẫu nhiên)
function _drawGoliathInevitableAura(now) {
    // To hơn 1 tí theo yêu cầu (220->260, viền hex 248->290)
    const pulse = 0.85 + Math.sin(now / 450) * 0.15;
    // the disc and its glow are painted once; the pulse only scales how hard
    // it is laid down
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * pulse;
    _blitGoliathFx(_goliathFx('inevDisc'), 300);
    ctx.globalAlpha = a0;
    if (_mobPerf || _gfxLevel >= 2) return; // phần trang trí còn lại tốn nhiều shadowBlur, bỏ khi tier thấp

    ctx.save(); ctx.rotate(now / 6670);
    for (let i = 0; i < 6; i++) {
        const a1 = (i / 6) * Math.PI * 2, a2 = ((i + 1) / 6) * Math.PI * 2, r = 275;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
        ctx.strokeStyle = `rgba(255,90,40,${0.35 + Math.sin(now / 333 + i) * 0.15})`; ctx.lineWidth = 1.6;
        ctx.stroke();
    }
    ctx.restore();

    ctx.save(); ctx.rotate(-now / 1670);
    _blitGoliathFx(_goliathFx('inevArcs'), 320);
    ctx.restore();

    if (Math.random() < 0.06) {
        const a = Math.random() * Math.PI * 2;
        const vein = _goliathGenerateVein(0, 0, Math.cos(a) * 245, Math.sin(a) * 245, 4, 18);
        ctx.beginPath();
        vein.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(255,69,0,0.22)'; ctx.lineWidth = 7; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,180,120,0.8)'; ctx.lineWidth = 1.4;
        ctx.stroke();
    }
}

// Absolute Verdict orb — đối tượng độc lập (window._goliathOrbs), vẽ ngoài
// vòng đời enemy vì nó phải tiếp tục bay/tồn tại kể cả khi rơi vào tình
// huống hiếm là Goliath không còn nữa.
function _drawGoliathOrbs() {
    if (!window._goliathOrbs || !window._goliathOrbs.length) return;
    const now = performance.now();
    const rich = !_mobPerf && _gfxLevel < 2;
    const body = _goliathFx('verdictBody');
    window._goliathOrbs.forEach(p => {
        // Afterimages along the flight path, so the orb reads as heavy and
        // fast instead of a disc sliding across the screen.
        const spd = Math.hypot(p.vx || 0, p.vy || 0);
        if (rich && spd > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let k = 4; k >= 1; k--) {
                const back = k * 0.045;
                const sc = 1 - k * 0.07;
                ctx.globalAlpha = 0.16 - k * 0.03;
                ctx.drawImage(body, p.x - p.vx * back - 180 * sc, p.y - p.vy * back - 180 * sc, 360 * sc, 360 * sc);
            }
            ctx.restore();
        }

        ctx.drawImage(body, p.x - 180, p.y - 180, 360, 360);

        // Gravity ripples: two thin rings pulled outward from the rim, so
        // the space around it looks bent.
        if (rich) {
            ctx.save();
            ctx.lineWidth = 2;
            for (let r = 0; r < 2; r++) {
                const ph = ((now / 900) + r * 0.5) % 1;
                ctx.globalAlpha = (1 - ph) * 0.5;
                ctx.strokeStyle = r ? '#c084fc' : '#f5d08a';
                ctx.beginPath(); ctx.arc(p.x, p.y, 149 + ph * 70, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }

        // Plasma ribbons around the orb. Their glow is one wide pass under
        // all six instead of a blur on each.
        if (rich) {
            ctx.save();
            ctx.lineCap = 'round';
            const ribbon = (pl) => {
                const baseA = now / 380 + pl * (Math.PI / 3);
                for (let seg = 0; seg <= 10; seg++) {
                    const st = seg / 10;
                    const rr = 101 + Math.sin(now / 140 + pl * 2 + st * 8) * 22 + st * 24;
                    const a2 = baseA + st * 0.7;
                    const px2 = p.x + Math.cos(a2) * rr, py2 = p.y + Math.sin(a2) * rr;
                    if (seg === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
                }
            };
            ctx.beginPath();
            for (let pl = 0; pl < 6; pl++) ribbon(pl);
            ctx.strokeStyle = 'rgba(157,0,255,0.22)'; ctx.lineWidth = 10; ctx.stroke();
            ctx.lineWidth = 3;
            for (let pl = 0; pl < 6; pl++) {
                ctx.beginPath(); ribbon(pl);
                ctx.strokeStyle = `rgba(196,132,252,${0.35 + 0.25 * Math.sin(now / 200 + pl)})`;
                ctx.stroke();
            }
            ctx.restore();
        }

        // 8 shards in two orbits, alternating sizes
        const shard = _goliathFx('verdictShard');
        for (let k = 0; k < 8; k++) {
            const ang = now / 250 + k * (Math.PI * 2 / 8);
            const orbitR = 125 + (k % 2 === 0 ? 0 : 14);
            const sx = p.x + Math.cos(ang) * orbitR, sy = p.y + Math.sin(ang) * orbitR;
            const sc = k % 3 === 0 ? 1.3 : 1;
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang * 2); ctx.scale(sc, sc);
            ctx.drawImage(shard, -26, -26, 52, 52);
            ctx.restore();
        }

        // Branching containment lightning crackling across the core surface,
        // matching Death Star's in-core arc technique (js/render/skill-d.js).
        if (rich) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.lineCap = 'round';
            const forks = [];
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const rot = now * 0.0016 + i * 1.3, c = Math.cos(rot), sn = Math.sin(rot);
                let d = 0, py = 0;
                ctx.moveTo(0, 0);
                for (let st = 0; st < 4; st++) {
                    d += 12 + Math.random() * 12;
                    py = (Math.random() - 0.5) * (12 + st * 9);
                    ctx.lineTo(d * c - py * sn, d * sn + py * c);
                    if (st > 0 && Math.random() < 0.5) {
                        const fa = rot + (Math.random() - 0.5) * 1.4, fl = 7 + Math.random() * 10;
                        const fx = d * c - py * sn, fy = d * sn + py * c;
                        forks.push(fx, fy, fx + Math.cos(fa) * fl, fy + Math.sin(fa) * fl);
                    }
                }
            }
            ctx.strokeStyle = 'rgba(200,150,255,0.35)'; ctx.lineWidth = 6; ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath();
            for (let f = 0; f < forks.length; f += 4) { ctx.moveTo(forks[f], forks[f + 1]); ctx.lineTo(forks[f + 2], forks[f + 3]); }
            ctx.strokeStyle = 'rgba(224,196,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }

        // Yog-Sothoth danger-sense: rings the orb itself while it's in
        // flight, on top of Verdict's own runway-lane windup telegraph.
        if (typeof _drawThreatRing === 'function') _drawThreatRing(p.x, p.y, 149, 1);
    });
}

// Sword bay ra từ Marchosias-copy — copy đúng kiểu vẽ arc-blade thật của
// Marchosias (_drawMarchoBlade trong enemy-marchosias.js), chỉ khác là
// object độc lập trong window._goliathSwords thay vì gắn vào 1 enemy.
function _drawGoliathSwords() {
    if (!window._goliathSwords) return;
    const now = performance.now();
    window._goliathSwords.forEach(p => {
        const angle = Math.atan2(p.vy, p.vx);
        const sa = angle - Math.PI / 2, ea = angle + Math.PI / 2;
        ctx.save();

        // Hành lang viền cam kéo dài dọc đường bay — giữ tới gần rìa màn hình
        if (p.originX != null && p.y < canvas.height * 0.85) {
            const halfW = 36;
            const corrLen = Math.hypot(p.x - p.originX, p.y - p.originY) + 200;
            ctx.save();
            ctx.translate(p.originX, p.originY); ctx.rotate(angle);
            ctx.strokeStyle = 'rgba(255,210,0,0.85)'; ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.moveTo(0, -halfW); ctx.lineTo(corrLen, -halfW);
            ctx.moveTo(0, halfW); ctx.lineTo(corrLen, halfW);
            ctx.stroke(); ctx.setLineDash([]);
            ctx.restore();
        }

        // Bùng nổ năng lượng ngắn tại điểm phóng
        if (p._fireTime && now - p._fireTime < 320) {
            const elapsed = now - p._fireTime, prog = elapsed / 320;
            const burstAlpha = (1 - prog) * 0.9, burstR = 12 + prog * 52;
            ctx.save();
            if (!_mobPerf) { ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 18; }
            ctx.globalAlpha = burstAlpha;
            ctx.strokeStyle = 'rgba(255,190,50,0.95)'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(p.originX, p.originY, burstR, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = burstAlpha * 0.45;
            ctx.fillStyle = 'rgba(255,210,100,0.7)';
            ctx.beginPath(); ctx.arc(p.originX, p.originY, burstR * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Afterimages of the blade trailing its flight, fading out behind it.
        if (!_mobPerf) {
            const spd = Math.hypot(p.vx, p.vy) || 1;
            const ux = p.vx / spd, uy = p.vy / spd;
            ctx.lineCap = 'round';
            for (let k = 3; k >= 1; k--) {
                const bx = p.x - ux * k * 22, by = p.y - uy * k * 22;
                ctx.strokeStyle = `rgba(255,${120 + k * 20},40,${0.32 - k * 0.08})`;
                ctx.lineWidth = 10 - k * 2;
                ctx.beginPath(); ctx.arc(bx, by, p.radius, sa + 0.15 * k, ea - 0.15 * k); ctx.stroke();
            }
            ctx.lineCap = 'butt';
        }

        ctx.strokeStyle = 'rgba(255,80,0,0.35)'; ctx.lineWidth = 18;
        if (!_mobPerf) { ctx.shadowColor = 'rgba(255,120,0,0.6)'; ctx.shadowBlur = 12; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, sa, ea); ctx.stroke();

        ctx.strokeStyle = 'rgba(255,140,30,0.95)'; ctx.lineWidth = 5;
        if (!_mobPerf) { ctx.shadowColor = 'white'; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, sa, ea); ctx.stroke();

        ctx.strokeStyle = 'rgba(255,230,180,0.7)'; ctx.lineWidth = 2; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius - 3, sa, ea); ctx.stroke();

        ctx.strokeStyle = `rgba(255,200,100,${0.5 + 0.4 * Math.sin(now / 60)})`; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const slashA = sa + (ea - sa) * ((i + 1) / 4);
            const px1 = p.x + Math.cos(slashA) * (p.radius - 10), py1 = p.y + Math.sin(slashA) * (p.radius - 10);
            const px2 = p.x + Math.cos(slashA) * (p.radius + 10), py2 = p.y + Math.sin(slashA) * (p.radius + 10);
            ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
        }

        ctx.restore();
    });
}

// Thiên thạch Apostle nén — vẽ khối đá lởm chởm bọc lõi cam (tái dùng phong
// cách boulder chunk cho đồng bộ thị giác) với đuôi lửa dài theo hướng bay.
function _drawGoliathMeteorProjectiles() {
    if (!window._goliathMeteors) return;
    const now = performance.now();
    window._goliathMeteors.forEach(m => {
        const angle = Math.atan2(m.vy, m.vx);
        ctx.save();
        const dirLen = Math.hypot(m.vx, m.vy) || 1;
        // Nhiễm năng lượng cam đậm hơn + sáng hơn hẳn để dễ né (đuôi dài hơn,
        // to hơn, lõi to + sáng hơn).
        const tailX = m.x - (m.vx / dirLen) * 130, tailY = m.y - (m.vy / dirLen) * 130;
        const tailGrad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        tailGrad.addColorStop(0, 'rgba(255,200,90,0.95)'); tailGrad.addColorStop(0.5, 'rgba(255,140,20,0.6)'); tailGrad.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.strokeStyle = tailGrad; ctx.lineWidth = 34; ctx.lineCap = 'round';
        if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 18; }
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tailX, tailY); ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.translate(m.x, m.y); ctx.rotate(angle + now / 260);
        const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
        coreG.addColorStop(0, '#fff3d6'); coreG.addColorStop(0.35, '#ffb84d'); coreG.addColorStop(0.7, '#c25a00'); coreG.addColorStop(1, 'rgba(20,8,0,0)');
        ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2);
        ctx.fillStyle = coreG;
        if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 34; }
        ctx.fill(); ctx.shadowBlur = 0;

        ctx.rotate(-(angle + now / 260)); ctx.rotate(now / 340);
        _drawGoliathBoulderChunk(0, 0, 28, (m._fireTime || 0) + now / 800);
        // Vết nứt phát sáng cam trên bề mặt đá — đọc rõ "nhiễm năng lượng"
        // thay vì chỉ 1 cục đá tối bay ngang qua màn hình.
        ctx.beginPath();
        for (let vi = 0; vi < 3; vi++) {
            const va = (vi / 3) * Math.PI * 2 + (m._fireTime || 0);
            const vein = _goliathGenerateVein(0, 0, Math.cos(va) * 22, Math.sin(va) * 22, 3, 12);
            vein.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
        }
        ctx.strokeStyle = 'rgba(255,180,60,0.9)'; ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 10; }
        ctx.stroke(); ctx.shadowBlur = 0;
        ctx.restore();

        // Embers shed from the tail: each one is born at the rock, drifts back
        // along the flight line and fades, on a fixed cycle so the stream is
        // the same at any frame rate.
        if (!_mobPerf) {
            const dot = _goliathFx('softDot', 'rgba(255,170,60,0.9)');
            const ux = m.vx / dirLen, uy = m.vy / dirLen;
            const seed = (m._fireTime || 0) * 0.001;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let e = 0; e < 10; e++) {
                const life = ((now / 650) + e / 10) % 1;
                const jit = Math.sin(seed + e * 12.9898) * 43758.5453;
                const side = (jit - Math.floor(jit) - 0.5) * 2;
                const d = 30 + life * 150;
                const ex = m.x - ux * d - uy * side * (10 + life * 26);
                const ey = m.y - uy * d + ux * side * (10 + life * 26);
                const r = 9 * (1 - life) + 3;
                ctx.globalAlpha = (1 - life) * 0.85;
                ctx.drawImage(dot, ex - r, ey - r, r * 2, r * 2);
            }
            ctx.restore();
        }
    });
}

// Endless Echo renders in world space, with the cast above Goliath's body.
let _echoShipSprite = null, _echoShipBase = null, _echoShipHalo = null, _echoFormationSprite = null;
const _echoShadowColor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowColor').set;
// The violet hull and compact aura are baked when the player's hull changes.
function _getEchoShipSprite() {
    const base = _getPlayerShipBaseSprite();
    if (_echoShipSprite && _echoShipBase === base) return _echoShipSprite;
    const c = document.createElement('canvas');
    c.width = base.width; c.height = base.height;
    const g = c.getContext('2d');
    g.drawImage(base, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(150,80,255,0.85)';
    g.fillRect(0, 0, c.width, c.height);
    if (!_echoShipHalo) {
        const h = document.createElement('canvas'); h.width = h.height = 128;
        const a = h.getContext('2d');
        const glow = a.createRadialGradient(64, 64, 8, 64, 64, 64);
        glow.addColorStop(0, 'rgba(198,157,255,0.18)');
        glow.addColorStop(0.48, 'rgba(166,102,247,0.1)');
        glow.addColorStop(1, 'rgba(150,80,220,0)');
        a.fillStyle = glow; a.fillRect(0, 0, 128, 128);
        _echoShipHalo = h;
    }
    if (!_echoFormationSprite) {
        const f = document.createElement('canvas'); f.width = f.height = 192;
        const a = f.getContext('2d'); a.translate(96, 96);
        for (const [width, alpha] of [[12, 0.045], [6, 0.14], [2, 0.88]]) {
            a.strokeStyle = `rgba(221,186,255,${alpha})`; a.lineWidth = width; a.beginPath();
            for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3; a.moveTo(Math.cos(angle) * 70, Math.sin(angle) * 70); a.arc(0, 0, 70, angle, angle + 0.72); }
            a.stroke();
        }
        a.strokeStyle = 'rgba(246,232,255,0.8)'; a.lineWidth = 1.5; a.beginPath();
        a.arc(0, 0, 48, 0, Math.PI * 2);
        for (let i = 0; i < 4; i++) {
            const angle = i * Math.PI / 2, x = Math.cos(angle) * 70, y = Math.sin(angle) * 70;
            a.moveTo(x, y - 7); a.lineTo(x + 4, y); a.lineTo(x, y + 7); a.lineTo(x - 4, y); a.closePath();
        }
        a.stroke(); _echoFormationSprite = f;
    }
    _echoShipBase = base;
    return (_echoShipSprite = c);
}

function _drawEchoShip(x, y, scale, alpha) {
    if (alpha <= 0.01) return;
    const sprite = _getEchoShipSprite();
    ctx.save(); _echoShadowColor.call(ctx, 'transparent');
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(x, y); ctx.scale(scale, scale);
    if (!_mobPerf && _gfxLevel < 2) ctx.drawImage(_echoShipHalo, -40, -40, 80, 80);
    ctx.drawImage(sprite, -35, -35);
    ctx.restore();
}

// Time details reuse the hull, halo and formation sprites already cached by Echo.
function _echoGhostClockTicks(path, fade, now) {
    const full = _gfxLevel === 0, step = full ? 2 : 3;
    ctx.save(); ctx.globalAlpha = fade * (full ? 0.42 : 0.34);
    ctx.strokeStyle = '#d8c5ef'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (let i = 1; i < path.length; i += step) {
        const a = path[i - 1], b = path[i], dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16 || d2 > GOLIATH_ECHO_TELEPORT_PX * GOLIATH_ECHO_TELEPORT_PX) continue;
        const d = Math.sqrt(d2), nx = -dy / d, ny = dx / d;
        const major = i % 3 === 1, r = major ? 5.5 : 3.3;
        ctx.moveTo(b.x - nx * r, b.y - ny * r); ctx.lineTo(b.x + nx * r, b.y + ny * r);
        if (full && major) {
            const angle = Math.atan2(dy, dx), r2 = 8.5;
            ctx.moveTo(b.x + Math.cos(angle - 0.7) * r2, b.y + Math.sin(angle - 0.7) * r2);
            ctx.arc(b.x, b.y, r2, angle - 0.7, angle + 0.7);
            const hand = angle - 0.8 + (now % 1200) / 1200 * 1.6;
            ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(hand) * 5, b.y + Math.sin(hand) * 5);
        }
    }
    ctx.stroke(); ctx.restore();
}

function _drawEchoGhostCharge(e, palm, charge, now, ease, clamp01) {
    const full = _gfxLevel === 0;
    ctx.save(); _echoShadowColor.call(ctx, 'transparent');
    for (let i = 0; i < 2; i++) {
        const k = ease(clamp01((charge - 0.18 - i * 0.16) / 0.56));
        if (k <= 0.01) continue;
        const spacing = Math.min(44, canvas.width * 0.09);
        const hx = Math.max(32, Math.min(canvas.width - 32, palm.x + (i ? 1 : -1) * spacing * k));
        const hy = Math.max(42, palm.y - 34 * k + Math.sin(now / 260 + i * 2) * 2);
        const sprite = _getEchoShipSprite(), seal = 50 + 18 * k;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate((i ? -1 : 1) * now / 1100);
        ctx.globalAlpha = k * 0.42;
        ctx.drawImage(_echoFormationSprite, -seal / 2, -seal / 2, seal, seal);
        if (full) {
            ctx.rotate(-now / 580); ctx.globalAlpha = k * 0.18;
            ctx.drawImage(_echoFormationSprite, -seal * 0.62, -seal * 0.36, seal * 1.24, seal * 0.72);
        }
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(palm.x, palm.y);
        ctx.quadraticCurveTo(palm.x + (i ? 18 : -18), hy - 16, hx, hy);
        ctx.strokeStyle = '#b88aeb'; ctx.lineWidth = full ? 5 : 3.5; ctx.globalAlpha = k * 0.16; ctx.stroke();
        ctx.strokeStyle = '#ead5ff'; ctx.lineWidth = 1.05; ctx.globalAlpha = k * 0.66; ctx.stroke();
        ctx.fillStyle = '#f5e9ff'; ctx.globalAlpha = k * 0.82; ctx.beginPath();
        const motes = full ? 8 : 4;
        for (let m = 0; m < motes; m++) {
            const flow = (now / 520 + m / motes + i * 0.3) % 1, arc = Math.sin(flow * Math.PI);
            const x = palm.x + (hx - palm.x) * flow + arc * Math.sin(m * 2.4 + now / 280) * 4;
            const y = palm.y + (hy - palm.y) * flow - arc * 10, size = 0.9 + flow * 1.1;
            ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.6, y);
            ctx.lineTo(x, y + size); ctx.lineTo(x - size * 0.6, y); ctx.closePath();
        }
        ctx.fill();
        ctx.save(); ctx.translate(hx, hy); ctx.scale(0.45 + 0.5 * k, 0.45 + 0.5 * k);
        ctx.globalAlpha = k * 0.3; ctx.drawImage(_echoShipHalo, -40, -40, 80, 80);
        ctx.save(); ctx.beginPath(); ctx.rect(-35, -35, sprite.width, sprite.height * (0.35 + 0.65 * k)); ctx.clip();
        if (full) {
            const split = (1 - k) * 4;
            ctx.globalAlpha = k * (1 - k) * 0.3;
            ctx.drawImage(sprite, -35 - split, -35 - 1.5); ctx.drawImage(sprite, -35 + split, -35 + 1.5);
        }
        ctx.globalAlpha = 0.25 + 0.75 * k; ctx.drawImage(sprite, -35, -35);
        ctx.restore(); ctx.restore();
    }
    ctx.restore();
}

function _echoGhostOpacity(g, now) {
    const span = (g.path.length - 1) * GOLIATH_ECHO_SAMPLE_MS;
    if (g.age < GOLIATH_ECHO_FLIGHT_MS) return 0.9;
    if (g.age < g.startAt) return 0.6 + 0.1 * Math.sin(now / 160);
    return 0.9 * Math.min(1, (span - g.t) / (300 * GOLIATH_ECHO_GHOST_SPEED));
}

function _drawEchoGhostWake(g, now, alpha) {
    const full = _gfxLevel === 0, flying = g.age < GOLIATH_ECHO_FLIGHT_MS;
    const waiting = !flying && g.age < g.startAt;
    if (waiting || alpha <= 0.01) return;
    const sprite = _getEchoShipSprite(), count = full ? 2 : 1;
    ctx.save(); _echoShadowColor.call(ctx, 'transparent');
    if (flying) {
        const p = g.path[0], f = Math.max(0, Math.min(1, g.age / GOLIATH_ECHO_FLIGHT_MS));
        const tail = Math.max(0, f - 0.32), v = tail * tail * (3 - 2 * tail);
        ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(g.ox + (p.x - g.ox) * v, g.oy + (p.y - g.oy) * v); ctx.lineTo(g.x, g.y);
        ctx.strokeStyle = '#bc91f0'; ctx.lineWidth = full ? 6 : 4; ctx.globalAlpha = alpha * 0.12; ctx.stroke();
        ctx.strokeStyle = '#f1ddff'; ctx.lineWidth = 1.2; ctx.globalAlpha = alpha * 0.36; ctx.stroke();
        for (let i = count; i >= 1; i--) {
            const t = Math.max(0, f - i * 0.075), u = t * t * (3 - 2 * t);
            const x = g.ox + (p.x - g.ox) * u, y = g.oy + (p.y - g.oy) * u;
            if (Math.hypot(x - g.x, y - g.y) < 3) continue;
            ctx.globalAlpha = alpha * (i === 1 ? 0.12 : 0.065); ctx.drawImage(sprite, x - 35, y - 35);
        }
    } else {
        for (let i = count; i >= 1; i--) {
            const t = g.t - i * 65;
            if (t < 0) continue;
            const p = _goliathEchoPointAt(g.path, t), dx = p.x - g.x, dy = p.y - g.y;
            if (dx * dx + dy * dy < 9 || dx * dx + dy * dy > 84 * 84) continue;
            const from = Math.floor(t / GOLIATH_ECHO_SAMPLE_MS), to = Math.min(g.path.length - 1, Math.floor(g.t / GOLIATH_ECHO_SAMPLE_MS) + 1);
            let jump = false;
            for (let n = from; n < to; n++) {
                const a = g.path[n], b = g.path[n + 1];
                if ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 > GOLIATH_ECHO_TELEPORT_PX * GOLIATH_ECHO_TELEPORT_PX) { jump = true; break; }
            }
            if (jump) continue;
            ctx.globalAlpha = alpha * (i === 1 ? 0.11 : 0.055); ctx.drawImage(sprite, p.x - 35, p.y - 35);
        }
    }
    ctx.restore();
}

function _drawEchoTrail(path, fade, now) {
    if (path.length < 2 || fade <= 0) return;
    const cheap = _mobPerf || _gfxLevel >= 2;
    ctx.save(); _echoShadowColor.call(ctx, 'transparent'); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Three brightness bands keep direction visible with six strokes at most.
    for (let pass = cheap ? 1 : 0; pass < 2; pass++) {
        ctx.lineWidth = pass === 0 ? 11 : 3.5;
        ctx.strokeStyle = pass === 0 ? '#a855f7' : '#e8d2ff';
        for (let band = 0; band < 3; band++) {
            ctx.globalAlpha = fade * (pass === 0 ? 0.12 : 0.7) * (0.5 + band * 0.25);
            ctx.beginPath();
            for (let i = 1; i < path.length; i++) {
                if (Math.min(2, Math.floor((i - 1) * 3 / (path.length - 1))) !== band) continue;
                const a = path[i - 1], b = path[i], dx = b.x - a.x, dy = b.y - a.y;
                if (dx * dx + dy * dy > GOLIATH_ECHO_TELEPORT_PX * GOLIATH_ECHO_TELEPORT_PX) continue;
                ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            }
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 0.95 * fade; ctx.fillStyle = '#fff'; ctx.beginPath();
    for (let i = 2; i < path.length; i += 3) {
        const a = path[i - 1], b = path[i], dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 4 || d2 > GOLIATH_ECHO_TELEPORT_PX * GOLIATH_ECHO_TELEPORT_PX) continue;
        const d = Math.sqrt(d2), c = dx / d, s = dy / d;
        ctx.moveTo(b.x + c * 6, b.y + s * 6);
        ctx.lineTo(b.x - c * 4 + s * 5, b.y - s * 4 - c * 5);
        ctx.lineTo(b.x - c * 4 - s * 5, b.y - s * 4 + c * 5); ctx.closePath();
    }
    ctx.fill();
    if (!cheap) _echoGhostClockTicks(path, fade, now);
    if (!cheap) {
        ctx.globalAlpha = fade * 0.8; ctx.fillStyle = '#080410'; ctx.strokeStyle = '#ff3c5a'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 1; i < path.length; i += 5) {
            const c = Math.cos(now / 700 + i) * 4, s = Math.sin(now / 700 + i) * 4, p = path[i];
            ctx.moveTo(p.x - c + s, p.y - s - c); ctx.lineTo(p.x + c + s, p.y + s - c);
            ctx.lineTo(p.x + c - s, p.y + s + c); ctx.lineTo(p.x - c - s, p.y - s + c); ctx.closePath();
        }
        ctx.fill(); ctx.stroke();
    }
    ctx.restore();
}

// The displayed palm is also the flight origin used by the release.
function _drawEchoCast(e, now) {
    let u;
    if (e._echoPhase === 'casting') u = e._echoCastTimer;
    else if (e._echoReleaseAt && now - e._echoReleaseAt < GOLIATH_ECHO_CLOSE_MS) u = GOLIATH_ECHO_WINDUP_MS + now - e._echoReleaseAt;
    else return;
    if (typeof window._drawKanadeEchoCast !== 'function') return;
    const W = GOLIATH_ECHO_WINDUP_MS;
    const clamp01 = t => Math.max(0, Math.min(1, t));
    const ease = t => t * t * (3 - 2 * t);
    const open = ease(clamp01(u / 380)) * (1 - ease(clamp01((u - W - 300) / (GOLIATH_ECHO_CLOSE_MS - 300))));
    const rise = ease(clamp01((u - 210) / 570));
    const settle = 0.035 * Math.exp(-Math.pow((u - 870) / 85, 2));
    const ext = clamp01(rise - settle) * (1 - ease(clamp01((u - W) / 300)));
    const charge = ease(clamp01((u - 440) / (W - 440))) * (1 - clamp01((u - W) / 180));
    const alpha = 1 - ease(clamp01((u - W - 420) / (GOLIATH_ECHO_CLOSE_MS - 420)));
    if (open <= 0.001) return;
    const box = e._echoBox || _goliathEchoGateSize().box, gateR = box * 0.235;
    const palm = window._drawKanadeEchoCast({
        x: e._echoGateX, y: e._echoGateY, gateR, box, open, ext, charge, alpha,
        gateAlpha: e._echoFull ? 1 : 0.8, mirror: (e._echoSide || 1) > 0,
        closing: e._echoPhase !== 'casting',
    }, now);
    if (!palm) return;
    e._echoHandX = palm.x; e._echoHandY = palm.y;
    if (e._echoPhase !== 'casting') return;
    const cheap = _mobPerf || _gfxLevel >= 2;
    if (!cheap) { _drawEchoGhostCharge(e, palm, charge, now, ease, clamp01); return; }
    // Two distinct hulls gather along light threads rather than inside a blob.
    ctx.save(); _echoShadowColor.call(ctx, 'transparent'); ctx.strokeStyle = '#dcc0ff'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
        const k = ease(clamp01((charge - 0.18 - i * 0.16) / 0.56));
        if (k <= 0.01) continue;
        const spacing = Math.min(44, canvas.width * 0.09);
        const hx = Math.max(32, Math.min(canvas.width - 32, palm.x + (i ? 1 : -1) * spacing * k));
        const hy = Math.max(42, palm.y - 34 * k + Math.sin(now / 260 + i * 2) * 2);
        _getEchoShipSprite();
        ctx.save(); ctx.translate(hx, hy); ctx.rotate((i ? -1 : 1) * now / 700);
        ctx.globalAlpha = k * (0.72 + 0.18 * Math.sin(now / 95 + i));
        const seal = 56 + 20 * k;
        ctx.drawImage(_echoFormationSprite, -seal / 2, -seal / 2, seal, seal);
        if (!cheap) {
            ctx.rotate(-now / 330); ctx.globalAlpha = k * 0.35;
            ctx.drawImage(_echoFormationSprite, -seal * 0.66, -seal * 0.35, seal * 1.32, seal * 0.7);
        }
        ctx.restore();
        ctx.strokeStyle = '#c68bff'; ctx.lineWidth = cheap ? 1.5 : 5; ctx.globalAlpha = k * (cheap ? 0.8 : 0.2);
        ctx.beginPath(); ctx.moveTo(palm.x, palm.y);
        ctx.quadraticCurveTo(palm.x + (i ? 18 : -18), hy - 16, hx, hy);
        if (!cheap) { ctx.moveTo(e._echoGateX, e._echoGateY); ctx.quadraticCurveTo(palm.x, palm.y + 12, hx, hy); }
        ctx.stroke();
        if (!cheap) { ctx.strokeStyle = '#f2dcff'; ctx.lineWidth = 1.1; ctx.globalAlpha = k * 0.8; ctx.stroke(); }
        ctx.fillStyle = '#f6e4ff'; ctx.globalAlpha = k; ctx.beginPath();
        const motes = cheap ? 3 : _gfxLevel === 0 ? 10 : 6;
        for (let m = 0; m < motes; m++) {
            const flow = (now / 440 + m / motes + i * 0.3) % 1, arc = Math.sin(flow * Math.PI);
            const x = palm.x + (hx - palm.x) * flow + arc * Math.sin(m * 2.4 + now / 180) * 8;
            const y = palm.y + (hy - palm.y) * flow - arc * 14, size = 1.1 + flow * 1.4;
            ctx.rect(x - size / 2, y - size / 2, size, size);
        }
        ctx.fill();
        _drawEchoShip(hx, hy, 0.45 + 0.5 * k, 0.25 + 0.75 * k);
    }
    ctx.restore();
}

function _drawGoliathEchoesLegacyGhosts() {
    const now = performance.now();
    for (const e of enemies) {
        if (e.type !== 'goliath' || !e._echoTrail || !e._echoTrail.length) continue;
        const casting = e._echoPhase === 'casting';
        if (!casting && now >= e._echoTrailEnd) continue;
        const fade = casting ? Math.min(1, e._echoCastTimer / GOLIATH_ECHO_WINDUP_MS * 2.5)
            : Math.max(0, Math.min(1, (e._echoTrailEnd - now) / 600));
        _drawEchoTrail(e._echoTrail, fade, now);
    }
    const ghosts = window._goliathEchoes;
    if (ghosts && ghosts.length) {
        ctx.save(); _echoShadowColor.call(ctx, 'transparent');
        for (const g of ghosts) {
            if (g._slashed) continue;
            const span = (g.path.length - 1) * GOLIATH_ECHO_SAMPLE_MS;
            const flying = g.age < GOLIATH_ECHO_FLIGHT_MS;
            const waiting = !flying && g.age < g.startAt;
            let a = 0.9;
            if (waiting) a = 0.6 + 0.1 * Math.sin(now / 160);
            else if (!flying) a = 0.9 * Math.min(1, (span - g.t) / (300 * GOLIATH_ECHO_GHOST_SPEED));
            if (a <= 0.01) continue;
            _drawEchoShip(g.x, g.y, 1, a);
            if (flying) continue;
            // These rings stay sharp on every graphics tier.
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgba(255,59,90,${waiting ? 0.05 : 0.14})`;
            ctx.beginPath(); ctx.arc(g.x, g.y, GOLIATH_ECHO_HIT_RADIUS, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(255,59,90,${waiting ? 0.55 : 0.95})`; ctx.lineWidth = 1.8; ctx.stroke();
            if (waiting) {
                const f = (g.age - GOLIATH_ECHO_FLIGHT_MS) / (g.startAt - GOLIATH_ECHO_FLIGHT_MS);
                ctx.strokeStyle = 'rgba(232,210,255,0.95)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(g.x, g.y, GOLIATH_ECHO_HIT_RADIUS + 9, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
            }
        }
        ctx.restore();
    }
}

function _drawGoliathEchoes() {
    if (_mobPerf || _gfxLevel >= 2) return _drawGoliathEchoesLegacyGhosts();
    const now = performance.now();
    for (const e of enemies) {
        if (e.type !== 'goliath' || !e._echoTrail || !e._echoTrail.length) continue;
        const casting = e._echoPhase === 'casting';
        if (!casting && now >= e._echoTrailEnd) continue;
        const fade = casting ? Math.min(1, e._echoCastTimer / GOLIATH_ECHO_WINDUP_MS * 2.5)
            : Math.max(0, Math.min(1, (e._echoTrailEnd - now) / 600));
        _drawEchoTrail(e._echoTrail, fade, now);
    }
    const ghosts = window._goliathEchoes;
    if (!ghosts || !ghosts.length) return;
    ctx.save(); _echoShadowColor.call(ctx, 'transparent');
    for (const g of ghosts) {
        if (g._slashed) continue;
        const a = _echoGhostOpacity(g, now);
        if (a <= 0.01) continue;
        _drawEchoGhostWake(g, now, a); _drawEchoShip(g.x, g.y, 1, a);
    }
    // All collision and wait rings are painted after every decorative hull.
    for (const g of ghosts) {
        if (g._slashed) continue;
        const flying = g.age < GOLIATH_ECHO_FLIGHT_MS;
        const waiting = !flying && g.age < g.startAt;
        if (flying || _echoGhostOpacity(g, now) <= 0.01) continue;
            // These rings stay sharp on every graphics tier.
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgba(255,59,90,${waiting ? 0.05 : 0.14})`;
            ctx.beginPath(); ctx.arc(g.x, g.y, GOLIATH_ECHO_HIT_RADIUS, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(255,59,90,${waiting ? 0.55 : 0.95})`; ctx.lineWidth = 1.8; ctx.stroke();
            if (waiting) {
                const f = (g.age - GOLIATH_ECHO_FLIGHT_MS) / (g.startAt - GOLIATH_ECHO_FLIGHT_MS);
                ctx.strokeStyle = 'rgba(232,210,255,0.95)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(g.x, g.y, GOLIATH_ECHO_HIT_RADIUS + 9, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
            }
    }
    ctx.restore();
}

function _drawEchoSlashEffects() {
    const low = _mobPerf || _gfxLevel >= 2;
    for (const fx of window._echoSlashFx || []) {
        const t = Math.max(0, Math.min(1, fx.age / 300));
        if (low && t > 0.35) continue;
        ctx.save(); ctx.translate(fx.x, fx.y); ctx.rotate(fx.angle); ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = '#f3e8ff'; ctx.lineWidth = low ? 2 : 3;
        ctx.beginPath(); ctx.moveTo(-34, -7); ctx.lineTo(34, 7); ctx.stroke();
        if (!low) {
            const sprite = _getEchoShipSprite();
            for (let side = -1; side <= 1; side += 2) {
                ctx.save(); ctx.translate(side * t * 13, side * t * 19);
                ctx.beginPath(); ctx.rect(-42, side < 0 ? -42 : 0, 84, 42); ctx.clip();
                ctx.drawImage(sprite, -35, -35); ctx.restore();
                ctx.strokeStyle = '#ff3b5a'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(side * t * 15, side * t * 15, GOLIATH_ECHO_HIT_RADIUS, side < 0 ? Math.PI : 0, side < 0 ? Math.PI * 2 : Math.PI); ctx.stroke();
            }
            ctx.fillStyle = '#c084fc';
            for (let i = 0; i < (_gfxLevel < 1 ? 10 : 5); i++) {
                const a = i * 2.399;
                ctx.fillRect(Math.cos(a) * t * 42, Math.sin(a) * t * 42, 2, 2);
            }
        }
        ctx.restore();
    }
}

// The gate and arm are drawn after Goliath's body.
function _drawGoliathEchoCasts() {
    const now = performance.now();
    for (const e of enemies) if (e.type === 'goliath') _drawEchoCast(e, now);
}

// JOKER — hiệu ứng cho ĐÚNG 3 kỹ năng ứng với 3 bảo thạch enemy đã hấp thụ
// (enemy._jokerState[name] chỉ tồn tại khi có bảo thạch đó — xem
// _goliathEnterTrueForm/entities.js). Gọi BÊN TRONG khối scale(trueScale)
// của True Form nên mọi toạ độ ở đây là toạ độ CỤC BỘ quanh tâm thân, cùng hệ
// quy chiếu với GOLIATH_SLOT_ANCHORS/GOLIATH_EYE_POS — viết lại từ đầu cho
// đúng ngữ cảnh này (không copy nguyên khối từ prototype vì đó là hệ toạ độ
// khác: state.x/state.y tuyệt đối, không phải cục bộ quanh gốc đã translate).
function _drawGoliathJokerEffects(enemy, now) {
    const js = enemy._jokerState;

    if (js['Veilshroud']) {
        const s = js['Veilshroud'];
        const inPhantom = s.phantomEnd && now < s.phantomEnd;
        if (inPhantom) {
            // Phantom holds him still for 3s while he gathers the strike, so
            // the wind-up has to read clearly: plasma bleeding from his own
            // cracks, a haze building around him, motes and rings pulling in,
            // and a countdown arc filling up to the moment the strike locks.
            // Glows are baked sprites or wide faint strokes, no shadowBlur.
            const p = Math.max(0, Math.min(1, 1 - (s.phantomEnd - now) / 3000));
            const TAU = Math.PI * 2;
            const dot = _goliathFx('softDot', 'rgba(255,130,40,1)');

            const haze = 380 + 160 * p;
            ctx.globalAlpha = 0.18 + 0.22 * p;
            ctx.drawImage(dot, -haze / 2, -haze / 2, haze, haze);
            ctx.globalAlpha = 1;

            // the cracks live in the body's own scale, so draw them in it
            const ts = enemy.size / 460;
            ctx.save(); ctx.scale(ts, ts);
            GOLIATH_TRUE_FORM_VEINS.forEach((vein, vi) => {
                const tip = vein[vein.length - 1];
                const flick = 0.6 + 0.4 * Math.sin(now / 90 + vi * 2.1);
                const flareR = (30 + 18 * flick) * (0.8 + 0.5 * p);
                ctx.globalAlpha = 0.6 * flick;
                ctx.drawImage(dot, tip.x - flareR, tip.y - flareR, flareR * 2, flareR * 2);
                ctx.globalAlpha = 1;
                ctx.beginPath();
                vein.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
                if (!_mobPerf) { ctx.strokeStyle = `rgba(255,110,10,${0.22 * flick})`; ctx.lineWidth = 12; ctx.stroke(); }
                ctx.strokeStyle = `rgba(255,170,60,${(0.45 + 0.4 * p) * flick})`; ctx.lineWidth = 3.5;
                ctx.stroke();
            });
            ctx.restore();

            // rings closing in on him, faster as the charge builds
            for (let i = 0; i < 3; i++) {
                const ph = (now / (900 - 400 * p) + i / 3) % 1;
                const r = 320 - ph * 220;
                const a = Math.sin(ph * Math.PI) * (0.25 + 0.45 * p);
                ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
                if (!_mobPerf) { ctx.strokeStyle = `rgba(255,120,30,${a * 0.35})`; ctx.lineWidth = 12; ctx.stroke(); }
                ctx.strokeStyle = `rgba(255,190,110,${a})`; ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            // plasma motes drawn in from all around
            const motes = _mobPerf ? 6 : 12;
            for (let i = 0; i < motes; i++) {
                const tt = now / 1000 + i / motes;
                const mph = tt % 1;
                const ang = i * 2.39 + Math.floor(tt) * 1.3;
                const r = 340 * (1 - mph) + 50;
                const sz = 22 * (1 - mph * 0.5);
                ctx.globalAlpha = Math.sin(mph * Math.PI) * 0.85;
                ctx.drawImage(dot, Math.cos(ang) * r - sz / 2, Math.sin(ang) * r - sz / 2, sz, sz);
            }
            ctx.globalAlpha = 1;

            // countdown arc: fills clockwise from the top, the strike locks when it closes
            ctx.beginPath(); ctx.arc(0, 0, 250, 0, TAU);
            ctx.strokeStyle = 'rgba(255,140,40,0.14)'; ctx.lineWidth = 6; ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, 250, -Math.PI / 2, -Math.PI / 2 + p * TAU);
            if (!_mobPerf) { ctx.strokeStyle = 'rgba(255,120,30,0.25)'; ctx.lineWidth = 16; ctx.stroke(); }
            ctx.strokeStyle = 'rgba(255,200,120,0.9)'; ctx.lineWidth = 5;
            ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';

            // He calls the storm down while he charges: bolts strike him from
            // the sky on a beat that quickens toward the release, and arcs
            // crackle off his body. Bolt shapes come from the 60Hz seeded
            // vein generator, so they flicker like lightning at any refresh
            // rate, and the glow is a wide faint stroke, no shadowBlur.
            const strokeBolt = (pts, core, glowW, coreW, alpha) => {
                ctx.beginPath();
                pts.forEach((b, i) => i === 0 ? ctx.moveTo(b.x, b.y) : ctx.lineTo(b.x, b.y));
                if (!_mobPerf) { ctx.strokeStyle = `rgba(255,120,30,${alpha * 0.32})`; ctx.lineWidth = glowW; ctx.stroke(); }
                ctx.strokeStyle = `rgba(${core},${alpha})`; ctx.lineWidth = coreW; ctx.stroke();
            };
            ctx.lineJoin = 'round';
            const beat = 430 - 250 * p;
            const beatIdx = Math.floor(now / beat);
            const since = now - beatIdx * beat;
            if (since < 190) {
                const k = 1 - since / 190;
                const strikeX = Math.sin(beatIdx * 12.9898) * 170;
                const bolt = _goliathGenerateVein(strikeX, -900, 0, -30, 10, 52, 900 + (beatIdx % 40));
                strokeBolt(bolt, '255,238,205', 16, 3.2, k * 0.95);
                const mid = bolt[4];
                const branch = _goliathGenerateVein(mid.x, mid.y, mid.x + (strikeX > 0 ? 120 : -120), mid.y + 160, 5, 30, 960 + (beatIdx % 40));
                strokeBolt(branch, '255,214,160', 9, 1.8, k * 0.7);
                _drawGoliathBloom(190, k * 0.75, 'rgba(255,214,150,1)');
            }
            const arcs = _mobPerf ? 2 : 4;
            for (let i = 0; i < arcs; i++) {
                const a = i * 1.7 + Math.floor(now / 110) * 0.9;
                const r0 = 70, len = 110 + 90 * p;
                const arc = _goliathGenerateVein(Math.cos(a) * r0, Math.sin(a) * r0,
                    Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len), 5, 28, 990 + i);
                strokeBolt(arc, '255,226,180', 8, 1.6, 0.35 + 0.5 * p);
            }
            ctx.lineJoin = 'miter';
        }
        // Vòng cảnh báo dưới chân từng mục tiêu trong 1500ms trước khi sét rơi
        // (đúng lightningCountdownDuration thật của Veilshroud — trước đây
        // thiếu hẳn bước cảnh báo này, sét ra ngay không kịp né).
        if (s.lightningPending && s.targets.length) {
            const prog = Math.min(1, s.lightningCountdown / 1500);
            s.targets.forEach(t => {
                const lx = t.x - enemy.x, ly = t.y - enemy.y;
                if (prog > 0.01) {
                    const fg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 130);
                    fg.addColorStop(0, `rgba(255,140,20,${0.28 * prog})`);
                    fg.addColorStop(1, 'rgba(255,90,0,0)');
                    ctx.fillStyle = fg;
                    ctx.beginPath(); ctx.arc(lx, ly, 130, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 0.35 + prog * 0.65;
                ctx.strokeStyle = '#ff8c1a'; ctx.lineWidth = 2.5;
                if (!_mobPerf) { ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 12; }
                ctx.setLineDash([9, 6]);
                ctx.beginPath(); ctx.arc(lx, ly, 130, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            });
        }
        // vệt sét toả ra 4 mục tiêu ngay lúc thoát Phantom — copy đúng kiểu
        // sét thật của Veilshroud (đổ từ trên trời xuống, không phải toả ra
        // từ thân), đổi màu cam, thêm nhánh phụ cho chi tiết hơn.
        if (s.lightningEnd && now < s.lightningEnd && s.targets.length) {
            const fade = Math.max(0, (s.lightningEnd - now) / 400);
            s.targets.forEach(t => {
                const lx = t.x - enemy.x, ly = t.y - enemy.y;
                const skyY = -900;
                const main = _goliathGenerateVein(lx, skyY, lx, ly, 7, 30);
                const outer = _goliathGenerateVein(lx, skyY, lx, ly, 5, 40);
                ctx.save();
                ctx.strokeStyle = `rgba(255,150,20,${fade * 0.5})`; ctx.lineWidth = 3 + 5 * fade;
                if (!_mobPerf) { ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 20; }
                ctx.beginPath(); ctx.arc(lx, ly, 60 * (1.3 - fade * 0.3), 0, Math.PI * 2); ctx.stroke();

                ctx.beginPath();
                outer.forEach((b, i) => i === 0 ? ctx.moveTo(b.x, b.y) : ctx.lineTo(b.x, b.y));
                ctx.strokeStyle = `rgba(255,110,0,${fade * 0.65})`; ctx.lineWidth = 7 * fade;
                ctx.stroke();

                ctx.beginPath();
                main.forEach((b, i) => i === 0 ? ctx.moveTo(b.x, b.y) : ctx.lineTo(b.x, b.y));
                ctx.strokeStyle = `rgba(255,255,255,${fade})`; ctx.lineWidth = 3 * fade;
                ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 22;
                ctx.stroke();

                // nhánh phụ toả ra khỏi thân sét chính cho chi tiết
                for (let b = 0; b < 3; b++) {
                    const src = main[1 + Math.floor((main.length - 2) * (b + 0.5) / 3)];
                    const side = b % 2 === 0 ? 1 : -1;
                    const branch = _goliathGenerateVein(src.x, src.y, src.x + side * 50, src.y + 40, 3, 14);
                    ctx.beginPath();
                    branch.forEach((bp, i) => i === 0 ? ctx.moveTo(bp.x, bp.y) : ctx.lineTo(bp.x, bp.y));
                    ctx.strokeStyle = `rgba(255,180,80,${fade * 0.7})`; ctx.lineWidth = 1.5 * fade;
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                ctx.restore();
            });
        }
    }

    if (js['Thaelis']) {
        // Passive dai dẳng — vòng vàng mỏng luôn hiện, không có nhịp lên/xuống
        const pulse = 0.7 + 0.3 * Math.sin(now / 83);
        ctx.strokeStyle = `rgba(255,230,40,${pulse * 0.7})`; ctx.lineWidth = 3;
        if (!_mobPerf) { ctx.shadowColor = '#ffee33'; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.arc(0, 0, 236 + 3 * Math.sin(now / 100), 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        // Aura phun nhẹ từ các vết nứt trên thân (nhẹ hơn plasma của
        // Veilshroud — chỉ 1 quầng vàng mờ dai dẳng, không nhấp nháy dữ dội)
        GOLIATH_TRUE_FORM_VEINS.forEach((vein, vi) => {
            const tip = vein[vein.length - 1];
            const breathe = 0.5 + 0.5 * Math.sin(now / 260 + vi * 1.7);
            const r = 14 + 6 * breathe;
            const fg = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, r);
            fg.addColorStop(0, `rgba(255,230,80,${0.28 * breathe})`);
            fg.addColorStop(1, 'rgba(255,220,40,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(tip.x, tip.y, r, 0, Math.PI * 2); ctx.fill();
        });
    }

    if (js['Raphael']) {
        // Mark mục tiêu cố định trước, vẽ vùng cảnh báo thẳng mờ, rồi mới bắn
        // đúng theo đường đó — không xoay tròn (đối chiếu fx.js drawRaphaelLasers thật)
        const s = js['Raphael'];
        if ((s.telegraphing || s.firing) && s.targets) {
            // Đúng thật (createRaphaelTelegraph): đường thẳng kéo dài hết đường
            // chéo màn hình theo hướng đã chốt, KHÔNG dừng lại đúng tại vị trí
            // mục tiêu — chỉ dùng mục tiêu để xác định hướng bắn.
            const fullLen = Math.hypot(canvas.width, canvas.height);
            // Điểm PHÁT phải là s.originX/Y đã chốt lúc mark (KHÔNG phải
            // enemy.x/y hiện tại) — Goliath giờ luôn di chuyển, nếu tính lại
            // từ vị trí hiện tại mỗi frame thì đường ngắm sẽ trông như đang
            // dí theo dù mục tiêu đã track/chốt đúng 1 lần duy nhất.
            const ox = s.originX - enemy.x, oy = s.originY - enemy.y;
            s.targets.forEach(t => {
                const ang = Math.atan2(t.y - s.originY, t.x - s.originX);
                const lx = ox + Math.cos(ang) * fullLen, ly = oy + Math.sin(ang) * fullLen;
                if (s.telegraphing) {
                    // To hơn theo yêu cầu vùng cảnh báo rõ ràng hơn (24 -> 34)
                    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(lx, ly);
                    ctx.strokeStyle = 'rgba(255,60,60,0.14)'; ctx.lineWidth = 34; ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(lx, ly);
                    ctx.setLineDash([16, 13]); ctx.strokeStyle = 'rgba(255,120,120,0.85)'; ctx.lineWidth = 2.5;
                    if (!_mobPerf) { ctx.shadowColor = 'red'; ctx.shadowBlur = 10; }
                    ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
                    ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,80,80,0.9)'; ctx.fill();
                } else if (s.firing) {
                    const fade = Math.max(0, (s.fireEnd - now) / 200);
                    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(lx, ly);
                    ctx.strokeStyle = `rgba(255,30,30,${0.5 * fade})`; ctx.lineWidth = 46;
                    if (!_mobPerf) { ctx.shadowColor = 'red'; ctx.shadowBlur = 30; }
                    ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(lx, ly);
                    ctx.strokeStyle = `rgba(255,80,80,${fade})`; ctx.lineWidth = 22; ctx.shadowBlur = 16; ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(lx, ly);
                    ctx.strokeStyle = `rgba(255,255,255,${fade})`; ctx.lineWidth = 8; ctx.shadowBlur = 0; ctx.stroke();
                }
            });
        }
    }

    if (js['Marchosias']) {
        // Barrier omnidirectional (không phải cung 90° hướng mặt như bản gốc
        // — Goliath không có toạ độ va chạm để tính hướng đòn tới) — 1 vòng
        // khiên ĐỎ đầy đủ 360°, gradient theo % HP còn lại của barrier
        // (barrierHp/barrierMaxHp), biến mất khi barrier đã vỡ (barrierDown).
        const s = js['Marchosias'];
        if (!s.barrierDown) {
            const pct = Math.max(0, s.barrierHp / s.barrierMaxHp);
            const shieldR = 260;
            const pulse = 0.85 + Math.sin(now / 260) * 0.15;
            const rg = ctx.createRadialGradient(0, 0, shieldR - 30, 0, 0, shieldR + 10);
            rg.addColorStop(0, 'rgba(120,0,0,0)');
            rg.addColorStop(0.6, `rgba(200,0,0,${0.20 * pct * pulse})`);
            rg.addColorStop(1, `rgba(255,40,40,${0.35 * pct * pulse})`);
            ctx.beginPath(); ctx.arc(0, 0, shieldR + 10, 0, Math.PI * 2);
            ctx.fillStyle = rg; ctx.fill();
            ctx.strokeStyle = `rgba(255,50,50,${0.55 + 0.35 * pct})`; ctx.lineWidth = 4 + pct * 6;
            if (!_mobPerf) { ctx.shadowColor = '#ff1414'; ctx.shadowBlur = 20 * pulse; }
            ctx.beginPath(); ctx.arc(0, 0, shieldR, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,190,190,0.85)'; ctx.lineWidth = 2; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(0, 0, shieldR - 5, 0, Math.PI * 2); ctx.stroke();
        }

        // Hàng đợi Sword đang vận (windups[], mỗi cái 1000ms) — vạch cảnh báo
        // mảnh phát ra từ mắt hướng về đích, mờ dần khi gần bắn.
        s.windups.forEach(w => {
            const p = Math.min(1, w.timer / w.dur);
            const _eye = _goliathEyeWorldPos(enemy);
            const ex = _eye.x - enemy.x, ey = _eye.y - enemy.y;
            const ang = Math.atan2(w.targetY - _eye.y, w.targetX - _eye.x);
            const len = 700;
            ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
            ctx.strokeStyle = `rgba(255,80,0,${0.25 + p * 0.5})`; ctx.lineWidth = 2 + p * 2;
            ctx.setLineDash([12, 8]);
            if (!_mobPerf) { ctx.shadowColor = '#ff5000'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
            ctx.setLineDash([]); ctx.shadowBlur = 0;
            ctx.restore();
        });
    }

    if (js['Egregor']) {
        // Null Slash (không phải Psychic Tempest) — port TRỰC TIẾP từ hiệu
        // ứng thật của Egregor (_drawEgregorEffects trong enemy-egregor.js),
        // chỉ đổi tông màu tím/void sang cam plasma (Goliath không có xúc
        // tu tối, không có rage stacks) + bỏ phần Dimensional Rift vũ trụ
        // bên trong (đã vẽ riêng bởi window._dimBreakZones/_drawDimBreakZones
        // dùng chung với Egregor thật, không cần lặp lại ở đây).
        const s = js['Egregor'];
        const cx = 0, cy = 0; // đã ở toạ độ cục bộ quanh tâm Goliath

        if (s.phase === 'charging') {
            const progress = Math.min(1, (s.windupTimer || 0) / 3000);
            const R = 500;
            const ang = s.angle || (Math.PI / 2);
            const arcStart = ang - Math.PI / 2, arcEnd = ang + Math.PI / 2;
            const curR = R * (0.3 + 0.7 * progress);
            ctx.save();
            if (!_mobPerf) {
                const sfg = ctx.createRadialGradient(cx, cy, 0, cx, cy, curR);
                sfg.addColorStop(0, `rgba(180,60,0,${0.08 * progress})`);
                sfg.addColorStop(0.7, `rgba(220,100,0,${0.06 * progress})`);
                sfg.addColorStop(1, 'rgba(150,50,0,0)');
                ctx.fillStyle = sfg;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, curR, arcStart, arcEnd); ctx.closePath(); ctx.fill();
            }
            const pulseAlpha = 0.6 + 0.35 * Math.sin(now / 60);
            if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 20 + progress * 15; }
            ctx.strokeStyle = `rgba(255,150,50,${pulseAlpha * progress})`; ctx.lineWidth = 3 + progress * 4;
            ctx.beginPath(); ctx.arc(cx, cy, curR, arcStart, arcEnd); ctx.stroke();
            const p1x = cx + Math.cos(arcStart) * curR, p1y = cy + Math.sin(arcStart) * curR;
            const p2x = cx + Math.cos(arcEnd) * curR, p2y = cy + Math.sin(arcEnd) * curR;
            ctx.strokeStyle = `rgba(255,180,100,${0.5 * progress})`; ctx.lineWidth = 2;
            ctx.setLineDash([10, 7]); ctx.lineDashOffset = -(now / 60) % 17;
            ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.shadowBlur = 0;
            // Tia plasma cam rạn nứt trong cung — luôn dùng mốc rage TỐI ĐA (5
            // stack, cho đẹp) vì Goliath không có rage stack thật.
            if (!_mobPerf && progress > 0.20) {
                const rcCount = 15;
                ctx.save();
                ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 10;
                ctx.lineWidth = 1.8;
                for (let rc = 0; rc < rcCount; rc++) {
                    const rcBaseAng = arcStart + (rc / rcCount) * Math.PI;
                    const rcDist = curR * (0.15 + 0.55 * Math.abs(Math.sin(rc * 2.618)));
                    let bx = cx + Math.cos(rcBaseAng) * rcDist, by = cy + Math.sin(rcBaseAng) * rcDist;
                    const rcAlpha = progress * (0.4 + 0.35 * Math.sin(now / 90 + rc * 1.3));
                    ctx.strokeStyle = `rgba(255,180,60,${rcAlpha})`;
                    ctx.beginPath(); ctx.moveTo(bx, by);
                    for (let seg = 0; seg < 4; seg++) {
                        const sAng = rcBaseAng + Math.sin(rc * 4.37 + seg * 2.09) * 0.7;
                        const sLen = curR * (0.06 - seg * 0.01);
                        bx += Math.cos(sAng) * sLen; by += Math.sin(sAng) * sLen;
                        ctx.lineTo(bx, by);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0; ctx.restore();
            }
            if (!_mobPerf && progress > 0.15) {
                for (let cp = 0; cp < 8; cp++) {
                    const cpAngle = arcStart + (cp / 8) * Math.PI + (now / 500);
                    const cpDist = curR * (0.3 + 0.7 * ((now / 300 + cp * 0.7) % 1));
                    const cpX = cx + Math.cos(cpAngle) * cpDist, cpY = cy + Math.sin(cpAngle) * cpDist;
                    ctx.globalAlpha = progress * 0.7;
                    ctx.fillStyle = '#ffb347';
                    ctx.beginPath(); ctx.arc(cpX, cpY, 3 + progress * 2, 0, Math.PI * 2); ctx.fill();
                }
            }
            if (progress > 0.85) {
                ctx.globalAlpha = ((progress - 0.85) / 0.15) * 0.25;
                ctx.fillStyle = 'rgba(220,100,0,1)';
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, curR, arcStart, arcEnd); ctx.closePath(); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        } else if (s.phase === 'striking') {
            const st = s.strikeTimer || 0;
            const tx2 = s.targetX, ty2 = s.targetY;
            const nsAng = s.angle || Math.atan2(ty2 - enemy.y, tx2 - enemy.x);
            // Luôn dùng mốc rage TỐI ĐA (5 stack) cho đẹp — Goliath không có
            // rage stack thật, +25% radius/độ dày như Egregor rage=5.
            const rageSizeMult = 1.25;
            const R = Math.hypot(tx2 - enemy.x, ty2 - enemy.y) + 25;
            const EXTEND = 200, SWEEP = 520, RETRACT = 230;
            const arcStart = nsAng - Math.PI / 2, arcSpan = Math.PI;

            let ext, sweepT;
            if (st < EXTEND) { ext = 1 - Math.pow(1 - st / EXTEND, 2.8); sweepT = 0; }
            else if (st < EXTEND + SWEEP) {
                const p = (st - EXTEND) / SWEEP;
                ext = 1.0; sweepT = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
            } else {
                const r = (st - EXTEND - SWEEP) / RETRACT;
                ext = Math.pow(1 - r, 2.2); sweepT = 1.0;
            }

            if (ext > 0.01) {
                const steps = 38;
                const tentPts = [];
                for (let i = 0; i <= steps; i++) {
                    const tRaw = i / steps;
                    const laggedST = sweepT * Math.pow(tRaw, 0.5);
                    const ptAngle = arcStart + laggedST * arcSpan;
                    const radius = tRaw * R * ext;
                    const radX = Math.cos(ptAngle), radY = Math.sin(ptAngle);
                    const amp = Math.pow(tRaw, 1.6) * 72 * ext;
                    const ph = tRaw * Math.PI * 3.4 - sweepT * Math.PI * 4.8;
                    const wOff = Math.sin(ph) * amp + Math.sin(tRaw * Math.PI * 6.2 - sweepT * Math.PI * 8) * Math.pow(tRaw, 2.2) * 22 * ext;
                    tentPts.push({ x: cx + radius * radX + radX * wOff, y: cy + radius * radY + radY * wOff, w: 1 - tRaw });
                }

                ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

                if (!_mobPerf && sweepT > 0.06 && sweepT < 0.96 && ext > 0.55) {
                    const tipAngle = arcStart + sweepT * arcSpan;
                    for (let tr = 5; tr >= 1; tr--) {
                        const trST = Math.max(0, sweepT - tr * 0.10);
                        const trA = arcStart + trST * arcSpan;
                        ctx.shadowColor = '#cc6600'; ctx.shadowBlur = 16;
                        ctx.strokeStyle = `rgba(200,90,0,${(6 - tr) * 0.022 * ext})`;
                        ctx.lineWidth = (6 - tr) * 4 * ext;
                        ctx.beginPath(); ctx.arc(cx, cy, R * ext * 0.90, trA, tipAngle); ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }

                // Every layer below is stroked segment by segment because its
                // width tapers, so none of them carries a blur: a blur on each
                // of the 38 segments was 150 blur passes a frame. The glow is
                // built from wider, fainter strokes underneath instead.
                const seg = (wMul, minW, style) => {
                    for (let si = 0; si < tentPts.length - 1; si++) {
                        const p0 = tentPts[si], p1 = tentPts[si + 1];
                        ctx.strokeStyle = typeof style === 'function' ? style(p0) : style;
                        ctx.lineWidth = Math.max(minW, wMul * p0.w);
                        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                    }
                };
                // Plasma aura flaring around the tentacle (rage 5 look)
                if (!_mobPerf) {
                    const auraA = Math.min(0.32, 0.235 * ext);
                    seg(200 * rageSizeMult, 14, p0 => `rgba(255,150,40,${auraA * 0.35 * p0.w})`);
                    seg(150 * rageSizeMult, 10, p0 => `rgba(255,140,0,${auraA * 0.6 * p0.w})`);
                    seg(125 * rageSizeMult, 8, p0 => `rgba(255,140,0,${auraA * p0.w})`);
                }
                // Layer 0: dark core, with a soft dark rim under it
                if (!_mobPerf) seg(108 * rageSizeMult, 3, 'rgba(58,18,0,0.35)');
                seg(92 * rageSizeMult, 2, 'rgba(40,15,0,0.97)');
                // Layer 1: deep orange flesh
                const fleshA = 0.90 * ext;
                seg(70 * rageSizeMult, 1, `rgba(180,60,0,${fleshA})`);
                // Layer 2: bright orange skin, with a hot halo just outside it
                if (!_mobPerf) seg(54 * rageSizeMult, 1, `rgba(255,140,26,${0.25 * ext})`);
                seg(46 * rageSizeMult, 0.5, `rgba(255,140,20,${0.72 * ext})`);
                // Layer 3: sheen offset along the tangent
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    const sdx = p1.x - p0.x, sdy = p1.y - p0.y, sL = Math.hypot(sdx, sdy) || 1;
                    const hpX = -sdy / sL, hpY = sdx / sL, ho = 5 * p0.w;
                    ctx.strokeStyle = `rgba(255,210,140,${0.42 * p0.w * ext})`; ctx.lineWidth = Math.max(0.5, 19 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x + hpX * ho, p0.y + hpY * ho); ctx.lineTo(p1.x + hpX * ho, p1.y + hpY * ho); ctx.stroke();
                }
                // Layer 4: thin glowing spine
                if (!_mobPerf) seg(14, 1.5, p0 => `rgba(255,179,71,${0.18 * p0.w * ext})`);
                seg(7, 0.5, p0 => `rgba(255,190,80,${0.42 * p0.w * ext})`);

                // Giác hút
                if (!_mobPerf) {
                    for (let si = 2; si < tentPts.length - 2; si += 2) {
                        const p = tentPts[si];
                        const sr = Math.max(3, 15 * p.w);
                        ctx.fillStyle = `rgba(60,20,0,${0.88 * ext})`;
                        ctx.beginPath(); ctx.arc(p.x, p.y, sr, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = `rgba(255,140,40,${0.55 * ext})`;
                        ctx.beginPath(); ctx.arc(p.x, p.y, sr * 0.42, 0, Math.PI * 2); ctx.fill();
                    }
                }
                ctx.restore();
            }
        }
    }

    if (js['Dargruel']) {
        // vòng chậm 150px quanh thân luôn hiện (chỉ báo vùng ảnh hưởng) — vòng
        // sóng xung thật của Maou Haki được vẽ riêng bởi drawBossShockwaves()
        // (fx.js) vì giờ dùng chung spawnBossShockwave() với Dargruel thật.
        ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(153,27,27,0.4)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([]);
    }

    if (js['Leviathan']) {
        const s = js['Leviathan'];
        if (s.phase === 'warning') {
            const warnPulse = 0.5 + Math.sin(now / 100) * 0.5;
            ctx.beginPath(); ctx.arc(0, 0, 320, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,0,0,${0.35 + warnPulse * 0.35})`; ctx.lineWidth = 2.5 + warnPulse * 2; ctx.stroke();
        } else if (s.phase === 'sweeping') {
            // Copy đúng cấu trúc nhiều lớp của tia Perseverance thật (haze
            // ngoài + glow đỏ + lõi trắng nóng + tia chớp trượt dọc thân) thay
            // vì chỉ 2 nét đơn giản — để đọc rõ ràng là 1 TIA LASER thật sự.
            const angle = s.sweepOrigin + (s.sweepTimer / 1800) * Math.PI * 2;
            const len = 900;
            ctx.save(); ctx.rotate(angle);

            if (!_mobPerf) { ctx.shadowColor = '#9d00ff'; ctx.shadowBlur = 60; }
            const outerGrad = ctx.createLinearGradient(0, -60, 0, 60);
            outerGrad.addColorStop(0, 'rgba(120,0,200,0)');
            outerGrad.addColorStop(0.5, 'rgba(170,30,230,0.30)');
            outerGrad.addColorStop(1, 'rgba(120,0,200,0)');
            ctx.strokeStyle = outerGrad; ctx.lineWidth = 110;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            const breathe = 1 + Math.sin(now / 90) * 0.1;
            if (!_mobPerf) { ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 45; }
            const cyanGrad = ctx.createLinearGradient(0, -22, 0, 22);
            cyanGrad.addColorStop(0, 'rgba(0,229,255,0)');
            cyanGrad.addColorStop(0.5, 'rgba(0,229,255,0.9)');
            cyanGrad.addColorStop(1, 'rgba(0,229,255,0)');
            ctx.strokeStyle = cyanGrad; ctx.lineWidth = 18 * breathe;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

            const flareX = len * (0.5 + 0.5 * Math.sin(now / 260));
            const flareGrad = ctx.createRadialGradient(flareX, 0, 0, flareX, 0, 45);
            flareGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
            flareGrad.addColorStop(0.4, 'rgba(157,0,255,0.35)');
            flareGrad.addColorStop(1, 'rgba(157,0,255,0)');
            ctx.fillStyle = flareGrad;
            ctx.beginPath(); ctx.arc(flareX, 0, 45, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
        }
    }
}

// DISPATCHER CHÍNH
// Bảo thạch bay từ vị trí enemy vừa chết vào cụm khe/mắt của Alpha, theo
// đường cong bezier — y hệt drawGems() trong test-goliath.html. Vẽ ở toạ độ
// TUYỆT ĐỐI màn hình (enemy chết ở đâu đó khác hẳn vị trí Goliath).
function _drawGoliathFlyingGems(enemy, now) {
    if (!enemy._flyingGems || !enemy._flyingGems.length) return;
    const alphaScale = enemy.size / 380;
    const ex = enemy.x + GOLIATH_EYE_POS.x * alphaScale, ey = enemy.y + GOLIATH_EYE_POS.y * alphaScale;
    enemy._flyingGems.forEach(fg => {
        const sx = fg.x, sy = fg.y;
        const cx = sx + (ex - sx) * 0.5 + 150, cy = sy + (ey - sy) * 0.5;
        const tq = Math.min(1, fg.t);
        const px = (1 - tq) * (1 - tq) * sx + 2 * (1 - tq) * tq * cx + tq * tq * ex;
        const py = (1 - tq) * (1 - tq) * sy + 2 * (1 - tq) * tq * cy + tq * tq * ey;
        ctx.save(); ctx.translate(px, py); ctx.rotate(now / 250);
        _drawGoliathGemDiamond(0, 0, 12, fg.gem, 1, now);
        ctx.restore();
    });
}

// THÂN True Form ghép từ nhiều tảng thiên thạch cùng chất liệu, giữ lại bởi
// vết nứt ma thuật — "golem bước ra từ cổ mộ" thay vì 1 khối pha lê trơn.
// Toạ độ theo hệ GOLIATH_TRUE_FORM_OUTLINE (authored ~460px, cùng thang đo).
const GOLIATH_GOLEM_BOULDERS = [
    { x: 0, y: -170, r: 85, seed: 3 },
    { x: -100, y: -115, r: 100, seed: 17 }, // nâng cao, đỡ bị lớp nhựa cam của vai che khuất
    { x: 100, y: -110, r: 104, seed: 29 },
    { x: -115, y: 60, r: 95, seed: 41 },
    { x: 115, y: 65, r: 97, seed: 53 },
    { x: 0, y: 10, r: 120, seed: 65 },
    { x: -50, y: 165, r: 82, seed: 77 },
    { x: 52, y: 170, r: 80, seed: 89 },
];
// Cặp tảng đá kề nhau — vẽ vết nứt ma thuật cam phát sáng dọc đường nối tâm
// (nằm đúng vùng 2 tảng chồng lên nhau) để đọc rõ "giữ lại bởi ma thuật".
const GOLIATH_GOLEM_SEAMS = [
    [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 6], [4, 7], [5, 6], [5, 7],
];
// Khối đá đa giác nhiều mặt (facet), tô sáng/tối theo góc so với nguồn sáng
// giả lập — giống kỹ thuật _drawGoliathFacetedCrystal — tạo khối rõ hơn hẳn
// kiểu chấm lõm cũ (_drawGoliathBoulderChunk, vẫn giữ nguyên cho vai/tay/nắm).
function _paintGoliathGolemChunk(g, r, seed, la) {
    const sides = 7;
    const outline = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + seed * 0.3;
        const rr = r * (0.8 + 0.24 * Math.sin(a * 2.3 + seed) + 0.1 * Math.sin(a * 4.1 + seed * 1.9));
        outline.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
    }
    for (let i = 0; i < outline.length; i++) {
        const p1 = outline[i], p2 = outline[(i + 1) % outline.length];
        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
        let diff = Math.atan2(midY, midX) - la;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const lightness = (Math.cos(diff) + 1) / 2;
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.closePath();
        const shade = 0.14 + lightness * 0.36;
        g.fillStyle = `rgb(${Math.round(10 + shade * 90)},${Math.round(10 + shade * 90)},${Math.round(14 + shade * 100)})`;
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.3; g.stroke();
        if (lightness > 0.62) {
            g.strokeStyle = `rgba(255,255,255,${(lightness - 0.62) * 1.3})`;
            g.lineWidth = 1.4;
            g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke();
        }
    }
}
// Every chunk in the body, the halo and the death crumble uses the same light
// angle and a fixed shape per seed and radius, so each one is painted once
// into a sprite and blitted after that.
const GOLIATH_DEFAULT_LIGHT = -Math.PI / 3;
function _goliathGolemChunkSprite(r, seed) {
    const half = Math.ceil(r * 1.2) + 2;
    return _goliathFxSprite('golem' + seed + '_' + r, half, 1, g => _paintGoliathGolemChunk(g, r, seed, GOLIATH_DEFAULT_LIGHT));
}
// Paints every baked Goliath sprite ahead of time, a few per idle slice, so
// the frame True Form first appears on only has to blit them.
let _goliathPrewarmed = false;
function _goliathPrewarmFx() {
    if (_goliathPrewarmed) return;
    _goliathPrewarmed = true;
    const jobs = [
        () => _goliathFx('shoulderGoo', 11), () => _goliathFx('shoulderGoo', 47),
        () => _goliathFx('fistRing', '#9d00ff'), () => _goliathFx('fistRing', '#fbbf24'),
        () => _goliathFx('haloRing'), () => _goliathFx('haloVertex'),
        () => _goliathFx('inevDisc'), () => _goliathFx('inevArcs'),
        () => _goliathFx('unbrokenGlow'), () => _goliathFx('phase2Corona'), () => _goliathFx('phase2Ring'),
        () => _goliathFx('softDot', 'rgba(255,110,40,1)'), () => _goliathFx('softDot', 'rgba(255,130,40,1)'),
        () => _goliathFx('softDot', 'rgba(255,214,150,1)'), () => _goliathFx('softDot', 'rgba(255,106,0,1)'),
        () => _goliathFx('softDot', 'rgba(255,244,228,1)'),
    ];
    for (const b of GOLIATH_GOLEM_BOULDERS) jobs.push(() => _goliathGolemChunkSprite(b.r, b.seed));
    // the halo's edge chunks and vertex chunks, same seeds and radii as _drawGoliathHalo
    for (let e = 0; e < 4; e++) {
        for (let k = 1; k < 6; k++) {
            const seed = e * 17 + k * 5, r = 22 + (k % 2) * 6;
            jobs.push(() => _goliathGolemChunkSprite(r, seed));
        }
    }
    for (let i = 0; i < 4; i++) jobs.push(() => _goliathGolemChunkSprite(50, i * 31 + 7));
    const idle = typeof requestIdleCallback === 'function'
        ? cb => requestIdleCallback(cb, { timeout: 500 })
        : cb => setTimeout(() => cb({ timeRemaining: () => 0 }), 16);
    const run = deadline => {
        do { jobs.shift()(); } while (jobs.length && deadline.timeRemaining() > 4);
        if (jobs.length) idle(run);
    };
    idle(run);
}
function _drawGoliathGolemChunk(cx, cy, r, seed, lightAngle) {
    const la = lightAngle !== undefined ? lightAngle : GOLIATH_DEFAULT_LIGHT;
    if (la === GOLIATH_DEFAULT_LIGHT) {
        const half = Math.ceil(r * 1.2) + 2;
        ctx.drawImage(_goliathGolemChunkSprite(r, seed), cx - half, cy - half, half * 2, half * 2);
        return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    _paintGoliathGolemChunk(ctx, r, seed, la);
    ctx.restore();
}
// Mỗi tảng đá lơ lửng độc lập với chênh pha CỰC NHỎ theo seed riêng — để cả
// khối không trông như 1 cụm cứng dán liền, dù chỉ lệch nhau vài phần trăm giây.
function _goliathBoulderFloat(b, t) {
    return { fx: Math.sin(t * 0.6 + b.seed * 0.05) * 3, fy: Math.cos(t * 0.5 + b.seed * 0.05) * 3 };
}
function _drawGoliathGolemBody(lightAngle, now) {
    const t = now / 1000;
    GOLIATH_GOLEM_BOULDERS.forEach(b => {
        const { fx, fy } = _goliathBoulderFloat(b, t);
        _drawGoliathGolemChunk(b.x + fx, b.y + fy, b.r, b.seed, lightAngle);
    });
    GOLIATH_GOLEM_SEAMS.forEach(([ia, ib], si) => {
        const a = GOLIATH_GOLEM_BOULDERS[ia], b = GOLIATH_GOLEM_BOULDERS[ib];
        const af = _goliathBoulderFloat(a, t), bf = _goliathBoulderFloat(b, t);
        const flick = 0.6 + 0.4 * Math.sin(now / 450 + si * 1.4);
        const seam = _goliathGenerateVein(a.x + af.fx, a.y + af.fy, b.x + bf.fx, b.y + bf.fy, 5, 14, 100 + si);
        ctx.beginPath();
        seam.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(20,8,0,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
        if (!_mobPerf) { ctx.strokeStyle = `rgba(245,158,11,${0.10 + 0.10 * flick})`; ctx.lineWidth = 8 + flick * 6; ctx.stroke(); }
        ctx.strokeStyle = `rgba(255,158,11,${0.55 + 0.35 * flick})`; ctx.lineWidth = 1.8 + flick * 1.6;
        ctx.stroke();
    });
}

// HALO PHÍA SAU — hình thoi rất lớn, 4 đỉnh là 4 quả cầu đá, 4 cạnh nối là
// chuỗi đá nhỏ xen plasma cam (giống dây tether ở cánh tay), giữa halo là 1
// vòng ma thuật xoay chậm. Gọi TRƯỚC thân nên luôn nằm phía sau.
const GOLIATH_HALO_R = 400;
function _drawGoliathHalo(now, phase2) {
    const verts = [
        { x: 0, y: -GOLIATH_HALO_R }, { x: GOLIATH_HALO_R, y: 0 },
        { x: 0, y: GOLIATH_HALO_R }, { x: -GOLIATH_HALO_R, y: 0 },
    ];
    const t = now / 1000;
    ctx.save();
    ctx.globalAlpha = 0.9;

    ctx.save(); ctx.rotate(t * 0.12);
    _blitGoliathFx(_goliathFx('haloRing'), 200);
    ctx.restore();
    ctx.save(); ctx.rotate(-t * 0.08);
    ctx.beginPath(); ctx.arc(0, 0, GOLIATH_HALO_R * 0.3, 0, Math.PI * 2);
    ctx.setLineDash([16, 12]); ctx.strokeStyle = 'rgba(255,210,140,0.5)'; ctx.lineWidth = 2.5;
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    for (let e = 0; e < 4; e++) {
        const p1 = verts[e], p2 = verts[(e + 1) % 4];
        const segs = 6;
        _goliathJitterSeed(300 + e);
        ctx.beginPath();
        for (let s = 0; s <= segs; s++) {
            const st = s / segs;
            const jx = (_goliathRand() - 0.5) * 14, jy = (_goliathRand() - 0.5) * 14;
            const px = p1.x + (p2.x - p1.x) * st + (s > 0 && s < segs ? jx : 0);
            const py = p1.y + (p2.y - p1.y) * st + (s > 0 && s < segs ? jy : 0);
            if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (!_mobPerf) { ctx.strokeStyle = phase2 ? 'rgba(239,58,40,0.2)' : 'rgba(245,158,11,0.16)'; ctx.lineWidth = 18; ctx.stroke(); }
        ctx.strokeStyle = phase2 ? 'rgba(255,74,40,0.65)' : 'rgba(255,158,11,0.55)'; ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = phase2 ? 'rgba(255,196,170,0.85)' : 'rgba(255,220,160,0.8)'; ctx.lineWidth = 2;
        ctx.stroke();
        for (let s = 1; s < segs; s++) {
            const st = s / segs;
            const seedC = e * 17 + s * 5;
            // Lơ lửng nhẹ — mỗi cục đá trên cạnh trôi độc lập theo seed riêng
            const fx = Math.sin(t * 0.7 + seedC) * 6, fy = Math.cos(t * 0.55 + seedC * 1.3) * 6;
            const cx2 = p1.x + (p2.x - p1.x) * st + fx, cy2 = p1.y + (p2.y - p1.y) * st + fy;
            _drawGoliathGolemChunk(cx2, cy2, 22 + (s % 2) * 6, seedC);
        }
    }

    verts.forEach((v, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + i * 1.7);
        // Lơ lửng nhẹ — 4 quả cầu đỉnh trôi độc lập, lệch pha nhau
        const fx = Math.sin(t * 0.5 + i * 1.9) * 10, fy = Math.cos(t * 0.42 + i * 2.3) * 10;
        const vx = v.x + fx, vy = v.y + fy;
        // the ring and its glow are baked once, the pulse only scales the alpha
        ctx.save();
        ctx.globalAlpha *= (0.35 + 0.25 * pulse) / 0.6;
        ctx.translate(vx, vy);
        _blitGoliathFx(_goliathFx('haloVertex'), 100);
        ctx.restore();
        _drawGoliathGolemChunk(vx, vy, 50, i * 31 + 7);
    });

    ctx.restore();
}

// Unbroken Will — aura tỏa ra: chỉ vẽ trong đúng 6s cửa sổ buff hậu-cứu-mạng
// (enemy._unbrokenWillBuffEnd), sau khi 4s bất tử đã kết thúc hẳn. 3 vòng
// tròn giãn nở liên tục từ tâm ra ngoài rồi biến mất, lệch pha nhau, cộng
// thêm 1 quầng sáng cam mềm cố định quanh thân — tách biệt hẳn với
// _drawGoliathHalo (luôn hiện, không đổi theo trạng thái) để rõ ràng đây là
// tín hiệu riêng cho trạng thái "được tăng sức" tạm thời.
function _drawGoliathUnbrokenAura(enemy, now) {
    if (!enemy._unbrokenWillBuffEnd || now >= enemy._unbrokenWillBuffEnd) return;
    ctx.save();
    _blitGoliathFx(_goliathFx('unbrokenGlow'), 470);

    // each ring is a wide faint stroke under a thin bright one, the look of
    // a blurred ring without paying for shadowBlur every frame
    const ringPeriod = 900;
    for (let i = 0; i < 3; i++) {
        const phase = ((now + i * (ringPeriod / 3)) % ringPeriod) / ringPeriod;
        const r = GOLIATH_HALO_R * 0.35 + phase * GOLIATH_HALO_R * 0.95;
        const alpha = (1 - phase) * 0.6;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        if (!_mobPerf) { ctx.strokeStyle = `rgba(251,146,60,${alpha * 0.35})`; ctx.lineWidth = 12; ctx.stroke(); }
        ctx.strokeStyle = `rgba(253,186,116,${alpha})`; ctx.lineWidth = 3;
        ctx.stroke();
    }
    ctx.restore();
}

// Phase two: once Unbroken Will has spent itself and the 4s invulnerability
// is over, Goliath burns for the rest of the fight. A flame corona and a
// crimson rune ring turn around the body and embers rise off it. Everything
// heavy is a baked sprite and the embers follow a fixed path off the clock,
// so the whole layer is a handful of drawImage calls with no allocation.
function _drawGoliathPhase2(enemy, now) {
    if (!enemy._unbrokenWillUsed || !enemy._unbrokenWillInvulnEnd || now < enemy._unbrokenWillInvulnEnd) return;
    const fade = Math.min(1, (now - enemy._unbrokenWillInvulnEnd) / 1500);
    ctx.save();
    const pulse = 0.8 + 0.2 * Math.sin(now / 320);
    ctx.globalAlpha *= fade * pulse;
    ctx.save(); ctx.rotate(now / 5000);
    _blitGoliathFx(_goliathFx('phase2Corona'), 320);
    ctx.restore();
    ctx.globalAlpha = fade * 0.8;
    ctx.save(); ctx.rotate(-now / 3200);
    _blitGoliathFx(_goliathFx('phase2Ring'), 340);
    ctx.restore();

    const ember = _goliathFx('softDot', 'rgba(255,110,40,1)');
    const count = _mobPerf ? 6 : 12, P = 2200;
    for (let i = 0; i < count; i++) {
        const tt = now + i * (P / count);
        const ph = (tt % P) / P;
        const a = i * 2.4 + Math.floor(tt / P) * 1.7;
        const rr = 170 + ph * 190;
        const x = Math.cos(a) * rr * 0.85, y = Math.sin(a) * rr * 0.6 - ph * 140;
        const s = 26 * (1 - ph * 0.6);
        ctx.globalAlpha = fade * Math.sin(ph * Math.PI) * 0.85;
        ctx.drawImage(ember, x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
}

// Hiệu ứng chết True Form (crumble): 8 tảng đá thân (GOLIATH_GOLEM_BOULDERS)
// tách rời rơi xuống + mờ dần lần lượt — kết thúc thẳng ngay khi rụng hết,
// không còn pha hoá bụi. enemy._deathPhase/_deathPhaseTimer do updateGoliath
// (entities.js) điều khiển timing — hàm này chỉ lo phần vẽ, gọi ở toạ độ đã
// translate(enemy.x, enemy.y) (0,0 = tâm thân).
function _drawGoliathDeathCrumble(enemy, now, trueScale) {
    const t = enemy._deathPhaseTimer || 0;
    const fallDur = 700;
    const staggerSpan = Math.max(1, GOLIATH_DEATH_CRUMBLE_DUR - fallDur);
    ctx.save();
    ctx.scale(trueScale, trueScale);
    GOLIATH_GOLEM_BOULDERS.forEach((b, i) => {
        const startDelay = (i / GOLIATH_GOLEM_BOULDERS.length) * staggerSpan;
        const p = Math.max(0, Math.min(1, (t - startDelay) / fallDur));
        if (p >= 1) return; // đã rơi hết khỏi khung hình
        if (p <= 0) {
            _drawGoliathGolemChunk(b.x, b.y, b.r, b.seed);
            return;
        }
        const ease = p * p;
        const dropY = ease * 260;
        const driftX = b.x * 0.25 * p;
        const rot = p * (b.seed % 2 === 0 ? 1 : -1) * 1.6;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.translate(b.x + driftX, b.y + dropY);
        ctx.rotate(rot);
        ctx.scale(1 - p * 0.3, 1 - p * 0.3);
        _drawGoliathGolemChunk(0, 0, b.r, b.seed);
        ctx.restore();
        if (Math.random() < 0.3) {
            createParticles(enemy.x + (b.x + driftX) * trueScale, enemy.y + (b.y + dropY) * trueScale, 1, '#8a7050', 2, 4);
        }
    });
    ctx.restore();
}

function _drawGoliath(enemy) {
    if (!_goliathPrewarmed) _goliathPrewarmFx();
    const now = performance.now();
    const lightAngle = -Math.PI / 3;
    const breath = (Math.sin(now / 400) + 1) / 2;

    // Reset phòng thủ — nếu 1 draw call trước đó (enemy khác, hoặc chính
    // Goliath ở pha trước) lỡ để sót globalAlpha thấp không được restore về
    // 1, mọi hiệu ứng vẽ sau đó sẽ mờ gần như vô hình, trông như "bị đè lớp".
    ctx.globalAlpha = 1;
    ctx.save();
    // Dư chấn rung nhẹ khi 1 viên bảo thạch vừa va vào thân (đón lực nhẹ,
    // không phải screen shake) — chỉ áp dụng lúc còn ở pha Alpha.
    let shakeX = 0, shakeY = 0;
    if (enemy.phase === 'alpha' && enemy._gemImpactShakeEnd && now < enemy._gemImpactShakeEnd) {
        const shakeP = (enemy._gemImpactShakeEnd - now) / 260;
        const shakeMag = 4 * shakeP;
        shakeX = (Math.random() - 0.5) * shakeMag;
        shakeY = (Math.random() - 0.5) * shakeMag;
    }
    ctx.translate(enemy.x + shakeX, enemy.y + shakeY);

    if (enemy.phase === 'alpha') {
        // Hình học ALPHA_OUTLINE được vẽ ở toạ độ tuyệt đối (tham chiếu gốc
        // 380px) — enemy.size khác 380 (vd thu nhỏ 50% còn 190) chỉ đổi
        // hitbox nếu không tự co giãn hình vẽ theo tỉ lệ này.
        const alphaScale = enemy.size / 380;
        const bobY = Math.sin(now / 480) * 5;
        ctx.save();
        ctx.scale(alphaScale, alphaScale);
        ctx.translate(0, bobY);
        _drawGoliathFacetedCrystal(GOLIATH_ALPHA_OUTLINE, GOLIATH_ALPHA_CORE, lightAngle, '#0a0a0a', '#3a3a42', 'rgba(0,0,0,0.7)');
        _drawGoliathVeins(GOLIATH_ALPHA_VEINS, 0.35 + breath * 0.35);
        _drawGoliathSlots(enemy, 0, 0, false, now);
        ctx.restore();
    } else if (enemy.phase === 'transforming') {
        // Port đầy đủ 4 pha từ test-goliath.html (Summon thiên thạch -> Fusion
        // đá nóng chảy -> Crystallize kết tinh -> Settle 2 chi vươn ra), KHÔNG
        // còn là bản rút gọn fade-alpha nữa. enemy.transformTimer đếm LÊN từ 0
        // (bug cũ: đã lỡ lấy 4000-transformTimer làm "t" — ngược hoàn toàn).
        const t = enemy.transformTimer / 1000; // 0..4 giây đã trôi qua
        const SUMMON_DUR = 2.2, FUSION_END = 2.9, CRYSTALLIZE_END = 3.7;
        // QUAN TRỌNG: dùng thẳng size THẬT của True Form (260, xem
        // _goliathEnterTrueForm) chứ KHÔNG phải enemy.size — enemy.size vẫn
        // còn là alphaSize (125) suốt cả pha transforming, chỉ đổi thành 260
        // ĐÚNG lúc chuyển sang true_form. Nếu tính trueScale từ enemy.size ở
        // đây, Crystallize/Settle sẽ lớn dần tới ~0.272 rồi NHẢY thẳng lên
        // ~0.565 ngay khung hình đầu tiên của true_form — đúng hiện tượng
        // "giật/phồng to đột ngột lúc chuyển cảnh cuối biến hình".
        const trueScale = 260 / 460;
        const alphaScale = enemy.size / 380 * 1.5; // Alpha-lúc-biến-hình to hơn 1 chút so với Alpha đứng yên, để khớp cỡ True Form sắp thành hình

        const bodyTotal = enemy._meteors.filter(m => m.target === 'body').length || 1;
        const fusedRatio = Math.min(1, enemy._fusedCount / bodyTotal);
        const armTotal = {
            left: enemy._meteors.filter(m => m.target === 'left').length || 1,
            right: enemy._meteors.filter(m => m.target === 'right').length || 1,
        };
        const armRatio = {
            left: Math.min(1, enemy._armFused.left / armTotal.left),
            right: Math.min(1, enemy._armFused.right / armTotal.right),
        };

        if (t < SUMMON_DUR) {
            // PHA SUMMON: Alpha vẫn đứng đó phát sáng dồn dập, thiên thạch từ
            // mọi hướng bay tới, mỗi lần va chạm khối nóng chảy quanh nó (và
            // quanh 2 khớp vai) phồng to hơn.
            _drawGoliathSummonCircle(Math.min(1, t / 0.6), now);
            ctx.save();
            ctx.scale(alphaScale, alphaScale);
            _drawGoliathFacetedCrystal(GOLIATH_ALPHA_OUTLINE, GOLIATH_ALPHA_CORE, lightAngle, '#0a0a0a', '#3a3a42', 'rgba(0,0,0,0.7)');
            _drawGoliathVeins(GOLIATH_ALPHA_VEINS, 0.35 + fusedRatio * 0.5);
            _drawGoliathSlots(enemy, 0, 0, false, now);
            _drawGoliathMoltenBlob(60 + fusedRatio * 170, 0.35 + fusedRatio * 0.65, now);
            ['left', 'right'].forEach(side => {
                const ratio = armRatio[side];
                if (ratio <= 0) return;
                const j = GOLIATH_LIMB_JOINT[side];
                ctx.save(); ctx.translate(j.x, j.y);
                _drawGoliathMoltenBlob(14 + ratio * 34, 0.4 + ratio * 0.6, now);
                ctx.restore();
            });
            ctx.restore();
            ctx.restore(); // thoát translate(enemy.x,enemy.y) để vẽ thiên thạch ở toạ độ màn hình thật
            _drawGoliathMeteors(enemy, t, SUMMON_DUR, now);
            return;
        }

        if (t < FUSION_END) {
            // PHA FUSION: toàn bộ thiên thạch đã dồn hết vào — khối nóng chảy
            // đạt kích thước gần bằng True Form, sủi bọt dữ dội, rung mạnh dần
            const p = (t - SUMMON_DUR) / (FUSION_END - SUMMON_DUR);
            const shakeAmt = p * 8;
            ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
            // a column of light climbing out of the mass as it fuses
            const colW = 70 + p * 130;
            const col = ctx.createLinearGradient(-colW, 0, colW, 0);
            col.addColorStop(0, 'rgba(255,170,80,0)');
            col.addColorStop(0.5, `rgba(255,214,150,${0.18 + p * 0.3})`);
            col.addColorStop(1, 'rgba(255,170,80,0)');
            ctx.fillStyle = col;
            ctx.fillRect(-colW, -900, colW * 2, 1800);
            _drawGoliathSummonCircle(1 - p, now);
            // heat rings pushing out from the surface
            const blobR = (230 + p * 40) * trueScale;
            for (let i = 0; i < 2; i++) {
                const k = (now / 450 + i / 2) % 1;
                ctx.beginPath(); ctx.arc(0, 0, blobR + k * 200, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,150,60,${(1 - k) * 0.5})`; ctx.lineWidth = 3;
                ctx.stroke();
            }
            _drawGoliathMoltenBlob(blobR, 0.9 + Math.sin(now / 125) * 0.1, now);
            _drawGoliathVeins(GOLIATH_ALPHA_VEINS.map(v => v.map(pt => ({ x: pt.x * 1.6 * alphaScale, y: pt.y * 1.6 * alphaScale }))), 1.0);
        } else if (t < CRYSTALLIZE_END) {
            // PHA CRYSTALLIZE: khối nóng chảy nguội đi và kết tinh sắc nét
            // thành True Form thật — crossfade blob -> pha lê, 3 bảo thạch bật
            // sáng lần lượt
            const p = (t - FUSION_END) / (CRYSTALLIZE_END - FUSION_END);
            const ease = 1 - Math.pow(1 - p, 2);
            _drawGoliathLightRays(_mobPerf ? 6 : 10, 520, (1 - p) * 0.22, now, '255,214,160');
            _drawGoliathMoltenBlob(270 * (1 - ease) * trueScale, 1 - ease, now);
            if (ease > 0.15) {
                ctx.save(); ctx.globalAlpha = (ease - 0.15) / 0.85 * 0.6; ctx.scale(trueScale, trueScale);
                _drawGoliathHalo(now);
                ctx.restore();
            }
            ctx.save();
            ctx.globalAlpha = ease;
            const growScale = (0.7 + ease * 0.3) * trueScale;
            ctx.scale(growScale, growScale);
            _drawGoliathFacetedCrystal(GOLIATH_TRUE_FORM_OUTLINE, GOLIATH_TRUE_FORM_CORE, lightAngle, '#0a0a0a', '#40404a', 'rgba(0,0,0,0.75)');
            _drawGoliathGolemBody(lightAngle, now);
            _drawGoliathVeins(GOLIATH_TRUE_FORM_VEINS, 0.6 + Math.sin(now / 165) * 0.3);
            ctx.restore();
            enemy.slots.forEach((slot, i) => {
                const igniteAt = 0.4 + i * 0.16;
                if (p > igniteAt && slot.filled && slot.gem) _drawGoliathGemDiamond(GOLIATH_SLOT_ANCHORS[i].x * growScale, GOLIATH_SLOT_ANCHORS[i].y * growScale, 15 * growScale, slot.gem, 1.6, now);
            });
            if (p > 0.7) _drawGoliathEye(GOLIATH_EYE_POS.x * growScale, GOLIATH_EYE_POS.y * growScale, 24 * growScale, enemy.x, enemy.y, now);
            // the moment the magma sets, a white snap over the new body
            if (p < 0.3) _drawGoliathBloom(760, (1 - p / 0.3) * 0.85, 'rgba(255,244,228,1)');
        } else {
            // PHA SETTLE: 2 chi (đã tự xây từ thiên thạch riêng ở Summon) vươn
            // hẳn ra khỏi thân — "thân xong tới tay" kiểu anime — rồi 1 sóng
            // xung kích cuối lan toả, ổn định thành True Form.
            const p = (t - CRYSTALLIZE_END) / (4 - CRYSTALLIZE_END);
            const limbPop = Math.min(1, p / 0.6);
            ctx.save(); ctx.scale(trueScale, trueScale);
            _drawGoliathHalo(now);
            _drawGoliathFacetedCrystal(GOLIATH_TRUE_FORM_OUTLINE, GOLIATH_TRUE_FORM_CORE, lightAngle, '#0a0a0a', '#40404a', 'rgba(0,0,0,0.75)');
            _drawGoliathGolemBody(lightAngle, now);
            _drawGoliathVeins(GOLIATH_TRUE_FORM_VEINS, 0.7);
            _drawGoliathLimbs(enemy, limbPop);
            _drawGoliathSlots(enemy, enemy.x, enemy.y, true, now);
            ctx.restore();
            _drawGoliathLightRays(_mobPerf ? 8 : 14, 260 + p * 520, (1 - p) * 0.3, now, '255,226,180');
            if (p < 0.25) _drawGoliathBloom(520, (1 - p / 0.25) * 0.7, 'rgba(255,214,150,1)');
            // two shock rings, a white one leading and an orange one behind it
            const rings = [[p * 560, 'rgba(255,255,255,', 6], [p * 400, 'rgba(255,150,60,', 9]];
            for (const [r, col, w] of rings) {
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
                if (!_mobPerf) { ctx.strokeStyle = col + (1 - p) * 0.25 + ')'; ctx.lineWidth = w * 3 * (1 - p) + 2; ctx.stroke(); }
                ctx.strokeStyle = col + (1 - p) + ')'; ctx.lineWidth = w * (1 - p) + 0.5;
                ctx.stroke();
            }
        }
    } else { // true_form
        // Hình học TRUE_FORM_OUTLINE (và mọi toạ độ chi/khe/mắt) được tác giả
        // ở tỉ lệ tham chiếu 460px — enemy.size giờ chỉ 280 (ngang Leviathan)
        // nên phải co lại theo tỉ lệ, nếu không thân sẽ luôn to gấp rưỡi kích
        // thước khai báo bất kể enemy.size là bao nhiêu.
        const trueScale = enemy.size / 460;

        // Chết (crumble): thân KHÔNG vẽ bình thường nữa — đá vụn tách rời
        // rơi/mờ dần, kết thúc thẳng khi rụng hết. Pha 'core' (bảo thạch nổ +
        // mắt tắt sáng) vẫn để thân vẽ bình thường bên dưới, vụ nổ đã có
        // addExplosion/createParticles (world-space, ở entities.js) lo phần
        // hiệu ứng nên không cần thêm gì ở đây.
        if (enemy._deathPhase === 'crumble') {
            _drawGoliathDeathCrumble(enemy, now, trueScale);
            ctx.restore();
            return;
        }
        // Thân mờ dần lúc vòng pháp trận đóng lại (biến mất), hiện dần lúc mở
        // ra ở vị trí mới — khớp đúng nhịp 400ms/pha của Fracture Step.
        if (enemy._fractureTeleportPhase === 'closing' || enemy._fractureTeleportPhase === 'opening') {
            const prog = Math.min(1, (now - enemy._fractureTeleportStart) / 400);
            ctx.globalAlpha = enemy._fractureTeleportPhase === 'closing' ? Math.max(0, 1 - prog) : prog;
        }
        // Unbroken Will (NEW): thân nhấp nháy suốt cửa sổ buff 6s hậu-cứu-mạng.
        if (enemy._unbrokenWillBuffEnd && now < enemy._unbrokenWillBuffEnd) {
            ctx.globalAlpha *= 0.6 + 0.4 * Math.sin(now / 90);
        }
        // Evasion (NEW): né đòn — thân "chớp/phase" cực nhanh 400ms, khác hẳn
        // nhấp nháy chậm của Unbroken Will, để rõ đây là 1 khoảnh khắc né chứ
        // không phải trạng thái kéo dài. Vòng lục giác tím giãn ra vẽ riêng ở
        // lớp 1:1 world-space bên dưới (gần Threshold Ward).
        if (enemy._evadeFlashEnd && now < enemy._evadeFlashEnd) {
            ctx.globalAlpha *= 0.35 + 0.65 * Math.sin(now / 35);
        }
        // Lơ lửng nhẹ CHO CẢ THÂN, thuần hình ảnh (không đụng enemy.x/y thật)
        // — để ngay cả lúc weave đứng yên hẳn (Phantom, đang đóng/mở cổng
        // Fracture Step) thân vẫn không trông "đứng hình" cứng đờ.
        const idleBobX = Math.sin(now / 1400) * 4, idleBobY = Math.cos(now / 1700) * 4;
        ctx.save();
        ctx.translate(idleBobX, idleBobY);
        ctx.save();
        ctx.scale(trueScale, trueScale);
        const _phase2 = !!(enemy._unbrokenWillUsed && enemy._unbrokenWillInvulnEnd && now >= enemy._unbrokenWillInvulnEnd);
        _drawGoliathHalo(now, _phase2);
        _drawGoliathUnbrokenAura(enemy, now);
        _drawGoliathPhase2(enemy, now);
        GOLIATH_TRUE_FORM_FRAGMENTS.forEach((frag, fi) => {
            ctx.save();
            const driftX = frag.ox + Math.sin(now / 1660 + fi) * 10, driftY = frag.oy + Math.cos(now / 2000 + fi * 1.3) * 10;
            ctx.translate(driftX, driftY); ctx.rotate((now / 1000) * frag.spin);
            _drawGoliathFacetedCrystal(frag.outline, frag.core, lightAngle, '#080808', '#2c2c33', 'rgba(0,0,0,0.7)');
            ctx.restore();
        });
        _drawGoliathFacetedCrystal(GOLIATH_TRUE_FORM_OUTLINE, GOLIATH_TRUE_FORM_CORE, lightAngle, '#0a0a0a', '#40404a', 'rgba(0,0,0,0.75)');
        _drawGoliathGolemBody(lightAngle, now);
        _drawGoliathVeins(GOLIATH_TRUE_FORM_VEINS, 0.55 + breath * 0.35);
        _drawGoliathLimbs(enemy, 1);
        _drawGoliathSlots(enemy, enemy.x, enemy.y, true, now);
        // QUAN TRỌNG: thoát scale(trueScale) NGAY TẠI ĐÂY — hình học thân mới
        // cần co theo trueScale (tác giả ở ref 460px), còn TOÀN BỘ hiệu ứng
        // bên dưới (Joker/Inevitable/Fracture/Threshold Ward/Warding Palm)
        // được viết bằng toạ độ tuyệt đối quanh thân (bán kính 100-500px thật)
        // — nếu để trong scale(trueScale) (~0.565 với size=260) thì mọi hiệu
        // ứng bị co nhỏ lại còn hơn nửa, và toạ độ mục tiêu xa thân (laser tới
        // rìa màn hình, sét rơi từ trên trời...) bị lệch khỏi vị trí thế giới
        // thật — đúng nguyên nhân "tia laze/vùng cảnh báo hiện sai chỗ, nhỏ
        // xíu" mà không hề liên quan gì tới việc Goliath giờ di chuyển liên tục.
        ctx.restore();
        ctx.globalAlpha = 1; // reset fade Fracture Step — lớp hiệu ứng bên dưới luôn hiện rõ

        _drawGoliathJokerEffects(enemy, now);

        // Chết (core, NEW): mắt tắt sáng ngay sau khi cả 3 bảo thạch nổ xong
        // — phủ 1 vòng tối lên đúng vị trí mắt (vừa vẽ sáng bình thường ở
        // trên) để "dập tắt" nó, kèm chút khói xám toả nhẹ thay vì phát sáng.
        if (enemy._deathEyeDark) {
            const eyeLX = GOLIATH_EYE_POS.x * trueScale, eyeLY = GOLIATH_EYE_POS.y * trueScale;
            ctx.save();
            ctx.beginPath(); ctx.arc(eyeLX, eyeLY, 24, 0, Math.PI * 2);
            ctx.fillStyle = '#0a0805'; ctx.fill();
            ctx.strokeStyle = 'rgba(70,60,50,0.7)'; ctx.lineWidth = 2; ctx.stroke();
            const _dimT = Math.min(1, (now - (enemy._deathEyeDarkAt || now)) / 600);
            ctx.globalAlpha = 0.5 * (1 - _dimT);
            ctx.beginPath(); ctx.arc(eyeLX, eyeLY, 24 + _dimT * 16, 0, Math.PI * 2);
            ctx.strokeStyle = '#443322'; ctx.lineWidth = 3; ctx.stroke();
            ctx.restore();
        }

        // Absolute Verdict: vùng cảnh báo runway-light — 2 đường đỏ song song
        // 2 bên (như đèn viền đường băng), phát ra từ MẮT. Chỉ TRACK người
        // chơi tới trước lúc bắn 500ms — sau đó khoá cứng vào vị trí đã chốt
        // (enemy._verdictLockX/Y), không dí theo nữa, cho 1 khoảng rõ ràng để
        // né trước khi quả cầu thật sự phóng. Vẽ ở lớp 1:1 này (không phải
        // trong scale(trueScale) ở trên) để khoảng cách thật không bị co lại.
        if (enemy._verdictPhase === 'channeling') {
            const vp = Math.min(1, (enemy._verdictChannelTimer || 0) / GOLIATH_VERDICT_CHANNEL_MS);
            const eyeLX = GOLIATH_EYE_POS.x * trueScale, eyeLY = GOLIATH_EYE_POS.y * trueScale;
            const aimX = enemy._verdictLocked ? enemy._verdictLockX : player.x;
            const aimY = enemy._verdictLocked ? enemy._verdictLockY : player.y;
            const ttx = aimX - enemy.x, tty = aimY - enemy.y;
            const vAng = Math.atan2(tty - eyeLY, ttx - eyeLX);
            const vDist = Math.hypot(ttx - eyeLX, tty - eyeLY);
            // Khớp ĐÚNG bán kính va chạm thật của quả cầu (108 + hitRadius người
            // chơi, xem main.js _goliathOrbs — +20% kích thước quả cầu).
            const laneW = 123;
            ctx.save();
            ctx.translate(eyeLX, eyeLY); ctx.rotate(vAng);
            [-laneW, laneW].forEach(offset => {
                ctx.beginPath(); ctx.moveTo(0, offset); ctx.lineTo(vDist, offset);
                ctx.strokeStyle = `rgba(255,40,40,${0.3 + vp * 0.5})`; ctx.lineWidth = 3;
                if (!_mobPerf) { ctx.shadowColor = 'red'; ctx.shadowBlur = 10; }
                ctx.stroke(); ctx.shadowBlur = 0;
            });
            const tickCount = Math.floor(vDist / 40);
            // Lane ticks glow from one cached sprite instead of a blurred fill each.
            const tickGlow = !_mobPerf ? _getGlowSprite('rgba(255,0,0,0.75)', 9) : null;
            const tickR = 3 + vp * 2;
            for (let i = 0; i <= tickCount; i++) {
                const tickX = i * 40;
                const blink = 0.5 + 0.5 * Math.sin(now / 120 - i * 0.8);
                const a = (0.3 + vp * 0.5) * blink;
                for (let side = -1; side <= 1; side += 2) {
                    const offset = side * laneW;
                    if (tickGlow) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; ctx.drawImage(tickGlow, tickX - 9, offset - 9); ctx.globalAlpha = ga; }
                    ctx.beginPath(); ctx.arc(tickX, offset, tickR, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,80,80,${a})`;
                    ctx.fill();
                }
            }
            ctx.restore();

            // Dark matter converging: small dark motes spiraling inward
            // toward the eye as the charge builds, visualizing "power being
            // drawn into the core" — separate from the runway-lane warning
            // above (unrotated, in world space).
            if (!_mobPerf) {
                const matterCount = 12;
                for (let i = 0; i < matterCount; i++) {
                    const seed = i * 137.5; // golden-angle-ish spread, avoids clumping
                    const baseDist = 60 + (i % 4) * 45;
                    const dist = baseDist * (1 - vp * 0.85); // shrinks inward as charge builds
                    const ang = seed * (Math.PI / 180) + now / (600 + i * 30);
                    const mx = eyeLX + Math.cos(ang) * dist;
                    const my = eyeLY + Math.sin(ang) * dist;
                    const moteAlpha = (0.3 + vp * 0.5) * (0.6 + 0.4 * Math.sin(now / 150 + i));
                    ctx.save();
                    // No blur: its near black purple halo did not show on his dark body.
                    ctx.fillStyle = `rgba(60,0,90,${moteAlpha})`;
                    ctx.beginPath(); ctx.arc(mx, my, 2.5 + vp * 1.5, 0, Math.PI * 2); ctx.fill();
                    // Faint trailing streak behind the direction of travel (away from the eye)
                    ctx.strokeStyle = `rgba(80,0,120,${moteAlpha * 0.5})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(mx, my);
                    ctx.lineTo(eyeLX + (mx - eyeLX) * 1.4, eyeLY + (my - eyeLY) * 1.4);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // Where the orb will actually land, telegraphed the whole channel.
            if (typeof _drawThreatRing === 'function') {
                _drawThreatRing(aimX, aimY, laneW, vp);
            }
        }

        // Inevitable — trường DR 70% luôn hiện diện (không chỉ lúc cửa sổ
        // giảm dame đang mở), + 1 vòng bừng sáng thêm khi cửa sổ 5%-cap đang
        // hoạt động để phân biệt rõ 2 trạng thái.
        _drawGoliathInevitableAura(now);
        if (enemy._inevitableWindowEnd && now < enemy._inevitableWindowEnd) {
            const pulse = 0.85 + Math.sin(now / 150) * 0.15;
            ctx.beginPath(); ctx.arc(0, 0, 260, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,${0.5 * pulse})`; ctx.lineWidth = 4; ctx.stroke();
        }

        // Unbroken Will (NEW): sau khi đã kích hoạt 1 lần, 1 vòng hào quang
        // cam mờ thở nhẹ toả quanh thân VĨNH VIỄN cho tới lúc chết — để
        // người chơi luôn biết "mạng cứu" đã dùng rồi, khác hẳn cửa sổ buff
        // 6s (chỉ có thân nhấp nháy, đã hết từ lâu trong 1 trận dài).
        if (enemy._unbrokenWillUsed) {
            const _uwPulse = 0.5 + Math.sin(now / 900) * 0.5;
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, 245, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(249,115,22,${0.18 + 0.12 * _uwPulse})`;
            ctx.lineWidth = 3;
            if (!_mobPerf) { ctx.shadowColor = '#f97316'; ctx.shadowBlur = 12 + _uwPulse * 8; }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Unbroken Will (NEW): animation "tung chiêu" ngay lúc giải phóng sóng
        // — 1 vòng năng lượng bùng nhanh (500ms) từ tâm thân toả ra, kèm thân
        // bừng sáng hẳn lên trong khoảnh khắc đó, để rõ ràng đây là 1 hành
        // động chủ động chứ không phải sóng tự nhiên xuất hiện.
        if (enemy._unbrokenReleaseAnimEnd && now < enemy._unbrokenReleaseAnimEnd) {
            const _relP = 1 - (enemy._unbrokenReleaseAnimEnd - now) / 500;
            ctx.save();
            ctx.globalAlpha = 1 - _relP;
            ctx.beginPath(); ctx.arc(0, 0, 40 + _relP * 260, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff1e0'; ctx.lineWidth = 5 * (1 - _relP) + 1;
            if (!_mobPerf) { ctx.shadowColor = '#f97316'; ctx.shadowBlur = 30; }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
            // Body flash — brief bright rim glow layered over the whole silhouette.
            ctx.save();
            ctx.globalAlpha = (1 - _relP) * 0.5;
            ctx.beginPath(); ctx.arc(0, 0, 230, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,237,213,1)';
            ctx.fill();
            ctx.restore();
        }

        // Fracture Step: vòng pháp trận ĐÓNG LẠI tại điểm cũ rồi MỞ RA tại
        // điểm mới — chậm rõ ràng (400ms/pha) thay vì dịch chuyển tức thời +
        // loé sáng ngay. (0,0) luôn khớp đúng vị trí thật của pha hiện tại vì
        // enemy.x/y chỉ đổi đúng lúc chuyển từ closing sang opening.
        if (enemy._fractureTeleportPhase === 'closing' || enemy._fractureTeleportPhase === 'opening') {
            const dur = 400;
            const prog = Math.min(1, (now - enemy._fractureTeleportStart) / dur);
            const closing = enemy._fractureTeleportPhase === 'closing';
            const ringP = closing ? (1 - prog) : prog; // đóng: to->nhỏ, mở: nhỏ->to
            const R = 40 + ringP * 260;
            ctx.save();
            ctx.globalAlpha = closing ? (1 - prog * 0.3) : (0.4 + prog * 0.6);
            ctx.save(); ctx.rotate(now / 500);
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                ctx.beginPath(); ctx.arc(0, 0, R, a, a + 0.35);
                ctx.strokeStyle = 'rgba(245,158,11,0.85)'; ctx.lineWidth = 4;
                if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 18; }
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
            ctx.save(); ctx.rotate(-now / 350);
            ctx.beginPath(); ctx.arc(0, 0, R * 0.65, 0, Math.PI * 2);
            ctx.setLineDash([10, 8]);
            ctx.strokeStyle = 'rgba(255,220,140,0.7)'; ctx.lineWidth = 2;
            ctx.stroke(); ctx.setLineDash([]);
            ctx.restore();
            const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
            coreG.addColorStop(0, 'rgba(255,248,225,0.8)'); coreG.addColorStop(1, 'rgba(245,158,11,0)');
            ctx.fillStyle = coreG;
            ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // Threshold Ward: 1 phiến lục giác / mốc HP đã kích hoạt (75/50/25%),
        // quay chậm quanh thân, + vòng sáng kép khi vừa hồi máu qua 1 mốc
        {
            const milestonesHit = [75, 50, 25].filter(m => enemy._thresholdMilestonesHit[m]).length;
            if (milestonesHit > 0) {
                ctx.beginPath(); ctx.arc(0, 0, 225, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(245,158,11,${0.05 * milestonesHit})`; ctx.fill();
                for (let i = 0; i < milestonesHit; i++) {
                    const ang = now / 3330 + i * (Math.PI * 2 / 4);
                    const px = Math.cos(ang) * 230, py = Math.sin(ang) * 230;
                    ctx.save(); ctx.translate(px, py); ctx.rotate(ang + Math.PI / 2);
                    _drawGoliathHexagon(0, 0, 22);
                    const pg = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
                    pg.addColorStop(0, 'rgba(255,255,255,0.5)'); pg.addColorStop(1, 'rgba(245,158,11,0.35)');
                    ctx.fillStyle = pg; ctx.fill();
                    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
                    if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 10; }
                    ctx.stroke(); ctx.shadowBlur = 0;
                    ctx.restore();
                }
            }
        }

        // Evasion (NEW): vòng lục giác tím giãn nhanh + mờ dần đúng lúc né
        // đòn — hiệu ứng tức thời (400ms), tách biệt hẳn khỏi vòng hào quang
        // ổn định của Threshold Ward phía trên dù cùng 1 passive.
        if (enemy._evadeFlashEnd && now < enemy._evadeFlashEnd) {
            const _efP = 1 - (enemy._evadeFlashEnd - now) / 400;
            ctx.save();
            ctx.globalAlpha = 1 - _efP;
            _drawGoliathHexagon(0, 0, 60 + _efP * 140);
            ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 4 * (1 - _efP) + 1;
            if (!_mobPerf) { ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 20; }
            ctx.stroke(); ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Vết chém (NEW): riêng cho Goliath khi bị arc blade/boomerang chém
        // trúng — 1 vệt sáng chính + 2 vệt phụ mảnh song song (kiểu móng
        // vuốt), mờ nhanh trong 350ms, khác hẳn hiệu ứng nổ tròn generic.
        if (enemy._slashVfx && now < enemy._slashVfx.end) {
            const _svP = 1 - (enemy._slashVfx.end - now) / 350;
            const _svLen = enemy.size * 0.95;
            const _svAng = enemy._slashVfx.angle;
            const _svDx = Math.cos(_svAng) * _svLen / 2, _svDy = Math.sin(_svAng) * _svLen / 2;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - _svP * 1.3);
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#fff5eb';
            ctx.lineWidth = 6 * (1 - _svP * 0.6);
            if (!_mobPerf) { ctx.shadowColor = '#ffb703'; ctx.shadowBlur = 24; }
            ctx.beginPath(); ctx.moveTo(-_svDx, -_svDy); ctx.lineTo(_svDx, _svDy); ctx.stroke();
            ctx.shadowBlur = 0;
            const _svPerpX = -Math.sin(_svAng) * 10, _svPerpY = Math.cos(_svAng) * 10;
            ctx.strokeStyle = 'rgba(255,183,3,0.7)'; ctx.lineWidth = 2.5;
            [-1, 1].forEach(side => {
                ctx.beginPath();
                ctx.moveTo(-_svDx * 0.8 + _svPerpX * side, -_svDy * 0.8 + _svPerpY * side);
                ctx.lineTo(_svDx * 0.8 + _svPerpX * side, _svDy * 0.8 + _svPerpY * side);
                ctx.stroke();
            });
            ctx.restore();
        }

        // Warding Palm: đỡ thành công = khiên lục giác THẬT LỚN (to hơn gấp
        // bội so với bản cũ chỉ là 1 vòng tròn mảnh), đỡ hụt = nứt vỡ đỏ +
        // sóng xung kích, KHÔNG dùng chung 1 kiểu vòng tròn cho cả 2 nữa.
        if (enemy._wardingPalmFlash && now < enemy._wardingPalmFlash.end) {
            const fp = (enemy._wardingPalmFlash.end - now) / 500; // 1->0
            if (enemy._wardingPalmFlash.success) {
                const shieldSize = 360 * (1 - Math.abs(fp - 0.5) * 0.5); // to hơn gấp bội so với 260 cũ
                ctx.save();
                _drawGoliathHexagon(0, 0, shieldSize);
                const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, shieldSize);
                sg.addColorStop(0, 'rgba(255,255,255,0.4)'); sg.addColorStop(0.6, 'rgba(196,132,252,0.28)'); sg.addColorStop(1, 'rgba(157,0,255,0.15)');
                ctx.fillStyle = sg; ctx.fill();
                ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 6;
                if (!_mobPerf) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 30; }
                ctx.stroke(); ctx.shadowBlur = 0;
                // vòng sóng chặn lan ra ngoài khiên
                ctx.beginPath(); ctx.arc(0, 0, shieldSize * (1 + (1 - fp) * 0.5), 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${fp * 0.5})`; ctx.lineWidth = 4; ctx.stroke();
                ctx.restore();
            } else {
                ctx.beginPath(); ctx.arc(0, 0, 260 * (1 - fp), 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,40,40,${fp * 0.7})`; ctx.lineWidth = 5; ctx.stroke();
                for (let k = 0; k < 4; k++) {
                    const crack = _goliathGenerateVein(0, 0, Math.cos(k * 1.6) * 200, Math.sin(k * 1.6) * 200, 4, 20);
                    ctx.beginPath();
                    crack.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
                    ctx.strokeStyle = `rgba(255,60,60,${fp * 0.6})`; ctx.lineWidth = 1.6; ctx.stroke();
                }
            }
        }

        // Corrupted Meteor: tia hút nối TỪNG Apostle mục tiêu (tối đa 3, toạ
        // độ world thật) tới lõi thiên thạch đang nén tại nắm tay phải — vẽ ở
        // lớp world-space này (không phải bên trong scale(trueScale)) để
        // khoảng cách thật tới Apostle (có thể ở rất xa thân) không bị co lại.
        if (enemy._meteorPhase === 'charging' && enemy._meteorTargets && enemy._meteorTargets.length) {
            const mp = Math.min(1, (enemy._meteorChargeTimer || 0) / 800);
            const rX0 = GOLIATH_LIMB_JOINT.right.x + 95, rY0 = GOLIATH_LIMB_JOINT.right.y + 210;
            const raiseX = GOLIATH_LIMB_JOINT.right.x + 60, raiseY = GOLIATH_LIMB_JOINT.right.y - 180;
            const fistLX = (rX0 + (raiseX - rX0) * mp) * trueScale, fistLY = (rY0 + (raiseY - rY0) * mp) * trueScale;
            const fistWX = enemy.x + fistLX, fistWY = enemy.y + fistLY;
            ctx.save();
            ctx.translate(-enemy.x, -enemy.y);
            enemy._meteorTargets.forEach(ap => {
                if (!ap || ap.hp <= 0) return;
                ctx.strokeStyle = `rgba(245,158,11,${0.4 + mp * 0.4})`; ctx.lineWidth = 3 + mp * 3;
                if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 14; }
                ctx.beginPath(); ctx.moveTo(ap.x, ap.y); ctx.lineTo(fistWX, fistWY); ctx.stroke();
                ctx.shadowBlur = 0;
                for (let i = 0; i < 4; i++) {
                    const st = Math.random();
                    const swx = ap.x + (fistWX - ap.x) * st + (Math.random() - 0.5) * 20;
                    const swy = ap.y + (fistWY - ap.y) * st + (Math.random() - 0.5) * 20;
                    ctx.beginPath(); ctx.arc(swx, swy, 2 + Math.random() * 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,200,120,0.8)'; ctx.fill();
                }
                ctx.beginPath(); ctx.arc(ap.x, ap.y, 20 * (1 - mp * 0.6), 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,120,40,${0.6 + mp * 0.4})`; ctx.lineWidth = 2; ctx.stroke();
            });
            ctx.restore();
        }
    }

    ctx.restore(); // đóng translate(idleBobX, idleBobY)
    ctx.restore();

    // Bảo thạch đang bay vào khe/mắt — vẽ SAU thân (không phải trước như cũ)
    // để bảo thạch luôn nằm ở layer TRÊN thân, trông như đang thực sự "đính"
    // lên người Alpha thay vì bị thân đè mất lúc vừa bay tới.
    _drawGoliathFlyingGems(enemy, now);

    // true form: no more in-world hp bar, moved to _drawGoliathBossBar
    // (top-of-screen, called from core.js)
}

// goliath true form boss bar, top-center of screen. only hp indicator for
// this phase (in-world bar + hp number in enemy-common.js both suppressed).
// screen-space, called once/frame from core.js, not part of world draw above
function _drawGoliathBossBar(enemy) {
    if (enemy.type !== 'goliath' || enemy.phase !== 'true_form' || enemy._deathPhase) return;
    const now = performance.now();
    const w = Math.min(560, canvas.width * 0.72);
    const x = (canvas.width - w) / 2;
    const titleY = 16;
    const barY = titleY + 20;
    const barH = 14;

    // unbroken will 4s invuln -> bar reads frosted white/ice instead of red.
    // Also true while the shared absolute-invuln gate (_transformIronBodyEnd)
    // is still active post-Unbroken-Will — that field can end up extended
    // past _unbrokenWillInvulnEnd (Math.max against a pre-existing longer
    // window), so relying on _unbrokenWillInvulnEnd alone could let the bar
    // drop back to red while Goliath is still genuinely untouchable.
    const _frozen = (enemy._unbrokenWillInvulnEnd && now < enemy._unbrokenWillInvulnEnd)
        || (enemy._unbrokenWillUsed && enemy._transformIronBodyEnd && now < enemy._transformIronBodyEnd);

    // elden ring style name: left-aligned, italic, parchment-gold, not centered/red
    ctx.save();
    ctx.textAlign = 'left';
    // Playfair Display, already loaded for the title logo - closer to
    // Elden Ring lettering than Cinzel (too blocky for a name plate)
    ctx.font = "italic 700 17px 'Playfair Display', serif";
    ctx.fillStyle = _frozen ? 'rgba(210,232,245,0.95)' : 'rgba(214,196,150,0.95)';
    if (!_mobPerf) { ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1; }
    ctx.fillText(window._lang === 'vi' ? 'Á Thần Khởi Nguyên' : 'Demigod of Genesis', x, titleY + 12);
    ctx.restore();

    const hpPct = enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) : 0;

    // heal catch-up ghost bar: ghost jumps to new hp instantly, solid bar
    // eases up to meet it. damage still snaps instantly, no ghost lag there.
    // frozen = absolute iron body, dealDamage() early-returns so hp truly
    // can't move - pin display + force full bar instead of showing whatever
    // partial % it happened to be at when the window procced
    if (_frozen) {
        enemy._bossBarDisplayHp = enemy.hp;
    } else if (enemy._bossBarDisplayHp === undefined || enemy.hp < enemy._bossBarDisplayHp) {
        enemy._bossBarDisplayHp = enemy.hp;
    } else if (enemy.hp > enemy._bossBarDisplayHp) {
        enemy._bossBarDisplayHp += (enemy.hp - enemy._bossBarDisplayHp) * 0.07;
        if (enemy.hp - enemy._bossBarDisplayHp < enemy.maxHp * 0.002) enemy._bossBarDisplayHp = enemy.hp;
    }
    const _displayPct = _frozen ? 1.0 : (enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy._bossBarDisplayHp / enemy.maxHp)) : 0);
    const _healing = !_frozen && _displayPct < hpPct - 0.0005;

    // elden ring style bar: flat dark fill, thin dark frame (not glowing gold), rounded caps
    const _rr = (rx, ry, rw, rh, rad) => {
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, rad); }
        else { ctx.beginPath(); ctx.rect(rx, ry, rw, rh); }
    };
    ctx.save();
    ctx.fillStyle = 'rgba(8,8,8,0.88)';
    _rr(x - 2, barY - 2, w + 4, barH + 4, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 1;
    _rr(x - 2, barY - 2, w + 4, barH + 4, 3); ctx.stroke();

    // Ghost bar: ahead of the solid bar only while catching up from a heal
    if (_healing) {
        ctx.fillStyle = _frozen ? 'rgba(220,245,255,0.4)' : 'rgba(255,140,140,0.4)';
        _rr(x, barY, w * hpPct, barH, 2); ctx.fill();
    }

    const grad = ctx.createLinearGradient(x, barY, x, barY + barH);
    if (_frozen) { grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#bfe8ff'); if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; } }
    else { grad.addColorStop(0, '#7a1010'); grad.addColorStop(0.5, '#8f1414'); grad.addColorStop(1, '#5a0a0a'); }
    ctx.fillStyle = grad;
    if (w * _displayPct > 0) { _rr(x, barY, w * _displayPct, barH, 2); ctx.fill(); }
    ctx.shadowBlur = 0;

    // Frost hatch texture over the filled portion while invuln
    if (_frozen && w * _displayPct > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, barY, w * _displayPct, barH);
        ctx.clip();
        ctx.strokeStyle = 'rgba(150,220,255,0.55)';
        ctx.lineWidth = 1;
        for (let i = -barH; i < w; i += 6) {
            ctx.beginPath();
            ctx.moveTo(x + i, barY + barH);
            ctx.lineTo(x + i + barH, barY);
            ctx.stroke();
        }
        ctx.restore();
    }

    if (!_frozen) {
        ctx.textAlign = 'center';
        ctx.font = '600 10px Arial';
        ctx.fillStyle = '#ffe8e8';
        ctx.fillText(Math.ceil(enemy.hp).toLocaleString() + ' / ' + Math.ceil(enemy.maxHp).toLocaleString(), x + w / 2, barY + barH - 3);
    }
    ctx.restore();

    // row below bar: left = debuffs on goliath, right = shield
    const rowY = barY + barH + 5;
    const rowH = 13;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '700 9px Arial';
    let lx = x;
    if (enemy.vulnStacks > 0 && enemy.vulnEndTime && now < enemy.vulnEndTime) {
        const chipW = 58;
        ctx.fillStyle = 'rgba(239,68,68,0.16)';
        ctx.fillRect(lx, rowY, chipW, rowH);
        ctx.strokeStyle = 'rgba(239,68,68,0.5)';
        ctx.strokeRect(lx, rowY, chipW, rowH);
        ctx.fillStyle = '#ff9999';
        ctx.fillText('VULN x' + enemy.vulnStacks, lx + 4, rowY + rowH - 3);
        lx += chipW + 4;
    }
    if (enemy.soulReaver) {
        const chipW = 52;
        ctx.fillStyle = 'rgba(239,68,68,0.16)';
        ctx.fillRect(lx, rowY, chipW, rowH);
        ctx.strokeStyle = 'rgba(239,68,68,0.5)';
        ctx.strokeRect(lx, rowY, chipW, rowH);
        ctx.fillStyle = '#ff9999';
        ctx.fillText('REAVER', lx + 4, rowY + rowH - 3);
        lx += chipW + 4;
    }
    if (typeof _goliathWaningStacks === 'function' && _goliathWaningStacks(enemy) > 0) {
        const chipW = 56;
        ctx.fillStyle = 'rgba(239,68,68,0.16)';
        ctx.fillRect(lx, rowY, chipW, rowH);
        ctx.strokeStyle = 'rgba(239,68,68,0.5)';
        ctx.strokeRect(lx, rowY, chipW, rowH);
        ctx.fillStyle = '#ff9999';
        ctx.fillText('WANE x' + _goliathWaningStacks(enemy), lx + 4, rowY + rowH - 3);
    }
    ctx.restore();

    const shieldVal = Math.ceil(enemy.shield || 0);
    if (shieldVal > 0) {
        // real value uncapped on purpose (see entities.js), can hit 6-7
        // figures over a long fight - only cap what's printed here
        const _displayCap = Math.ceil(enemy.maxHp);
        const _shieldOverflow = shieldVal > _displayCap;
        const _shieldShown = Math.min(shieldVal, _displayCap);
        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = '700 9px Arial';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText((window._lang === 'vi' ? 'KHIÊN ' : 'SHIELD ') + _shieldShown.toLocaleString() + (_shieldOverflow ? '+' : ''), x + w, rowY + rowH - 3);
        ctx.restore();
    }
}
