// Water artwork is cached once. Live effects only transform sprites and change opacity.
let _piscesRenderCache = null;
const _piscesBubblePulseEnd = new Float64Array(24);
let _piscesBubblePoints = 0, _piscesBubbleClock = 0;

const _piscesFishTrail = [
    new Float64Array(24),
    new Float64Array(24)
];
const _piscesFishTrailHead = new Int32Array(2);
const _piscesFishTrailCount = new Int32Array(2);
const _piscesFishLastX = new Float64Array(2);
const _piscesFishLastY = new Float64Array(2);
const _piscesFishLastAngle = new Float64Array(2);

const _piscesBurstPool = [];
for (let i = 0; i < 24; i++) _piscesBurstPool.push({ active: false, born: 0, life: 0, x: 0, y: 0, size: 30, power: 0, seed: i });
const _piscesRefundPool = [];
for (let i = 0; i < 12; i++) _piscesRefundPool.push({ active: false, born: 0, life: 0, x: 0, y: 0, dirX: 0, dirY: 1, scale: 1, isKill: false, seed: i });
const _piscesBlockPool = [];
for (let i = 0; i < 8; i++) _piscesBlockPool.push({ active: false, born: 0, life: 0, angle: 0, seed: i });
const _piscesCastPool = [];
for (let i = 0; i < 3; i++) _piscesCastPool.push({ active: false, born: 0, life: 0, kind: 0, seed: i });
const _piscesBoostPool = [];
for (let i = 0; i < 4; i++) _piscesBoostPool.push({ active: false, born: 0, life: 0, kind: 0, seed: i });

let _piscesBurstCursor = 0, _piscesRefundCursor = 0, _piscesBlockCursor = 0, _piscesCastCursor = 0, _piscesBoostCursor = 0;
let _piscesLastBlockAt = -1000, _piscesLastBoostG = -1000, _piscesLastBoostS = -1000;
let _piscesLastCoiMongEnd = 0, _piscesCoiMongBurstAt = -10000;
let _piscesLastCoiMongCd = 0, _piscesCoiMongReadyAt = -10000;
let _piscesPrevPlayerX = NaN, _piscesPrevPlayerY = NaN, _piscesMoveDirX = 0, _piscesMoveDirY = -1;
let _piscesSkyAlpha = 0, _piscesSkyLastAt = 0;

const _piscesStarCoords = [
    [-0.55, 0.10, 2.8], [-0.72, 0.00, 3.6], [-0.82, -0.14, 4.1], [-0.68, -0.28, 4.2],
    [-0.48, -0.32, 4.3], [-0.30, -0.20, 3.9], [-0.38, -0.06, 3.7],
    [-0.22, 0.08, 4.4], [-0.06, 0.18, 4.3], [0.10, 0.12, 4.2],
    [0.26, 0.04, 3.5], [0.42, -0.10, 3.7], [0.58, -0.22, 4.0], [0.62, -0.06, 3.8],
    [0.54, 0.12, 4.1], [0.38, 0.22, 3.9], [0.22, 0.18, 3.6]
];
const _piscesStarLines = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
    [6, 7], [7, 8], [8, 9], [9, 10],
    [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 10]
];

function _piscesBake(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'));
    return c;
}

function _piscesPaintStar(g, x, y, r, gold) {
    const glow = g.createRadialGradient(x, y, 0.5, x, y, r * 2.2);
    glow.addColorStop(0, '#EAF6FF');
    glow.addColorStop(0.45, gold ? 'rgba(233,216,166,0.75)' : 'rgba(140,230,255,0.75)');
    glow.addColorStop(1, 'rgba(127,119,221,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(x, y, r * 2.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = gold ? 'rgba(233,216,166,0.85)' : 'rgba(140,230,255,0.85)';
    g.lineWidth = 0.85;
    g.beginPath(); g.arc(x, y, r * 0.95, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(234,246,255,0.92)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(x - r * 1.9, y); g.lineTo(x + r * 1.9, y);
    g.moveTo(x, y - r * 1.9); g.lineTo(x, y + r * 1.9);
    g.stroke();
    g.fillStyle = '#EAF6FF';
    g.beginPath(); g.arc(x, y, Math.max(1.1, r * 0.36), 0, Math.PI * 2); g.fill();
}

function _piscesPaintWavelets(g, cx, cy, r, count, alpha) {
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = 'rgba(140,230,255,' + alpha + ')';
    g.lineWidth = 0.9;
    for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        g.save();
        g.translate(x, y);
        g.rotate(a + Math.PI / 2);
        g.beginPath();
        g.moveTo(-5, 1.5);
        g.quadraticCurveTo(-2.5, -2, 0, 1.2);
        g.quadraticCurveTo(2.5, -2, 5, 1.5);
        g.stroke();
        g.restore();
    }
    g.restore();
}

function _piscesPaintMiniFish(g, x, y, rot, scale, alpha) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(scale, scale);
    g.globalAlpha = alpha;
    const fill = g.createLinearGradient(-16, 0, 16, 0);
    fill.addColorStop(0, 'rgba(127,119,221,0.35)');
    fill.addColorStop(0.55, 'rgba(117,206,247,0.78)');
    fill.addColorStop(1, 'rgba(234,246,255,0.95)');
    g.fillStyle = fill;
    g.strokeStyle = 'rgba(234,246,255,0.85)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(-14, 0);
    g.bezierCurveTo(-4, -7, 9, -6, 15, 0);
    g.bezierCurveTo(9, 6, -4, 7, -14, 0);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(-13, 0);
    g.bezierCurveTo(-20, -6, -24, -8, -26, -3);
    g.quadraticCurveTo(-21, 0, -26, 4);
    g.bezierCurveTo(-23, 8, -19, 5, -13, 0);
    g.fill();
    g.stroke();
    g.fillStyle = '#EAF6FF';
    g.beginPath(); g.arc(10, -1.2, 1.1, 0, Math.PI * 2); g.fill();
    g.restore();
}

function _piscesSprites() {
    if (_piscesRenderCache) return _piscesRenderCache;

    const emptyBubble = _piscesBake(48, 48, g => {
        const bg = g.createRadialGradient(24, 24, 2, 24, 24, 16);
        bg.addColorStop(0, 'rgba(38,36,90,0.72)');
        bg.addColorStop(0.75, 'rgba(127,119,221,0.24)');
        bg.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = bg;
        g.beginPath(); g.arc(24, 24, 16, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(140,230,255,0.65)';
        g.lineWidth = 1.3;
        g.beginPath(); g.arc(24, 24, 11.5, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(127,119,221,0.48)';
        g.lineWidth = 0.9;
        g.beginPath(); g.arc(24, 24, 8, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(140,230,255,0.55)';
        g.beginPath(); g.arc(24, 24, 2.1, 0, Math.PI * 2); g.fill();
    });

    const bubble = _piscesBake(48, 48, g => {
        const halo = g.createRadialGradient(24, 24, 2, 24, 24, 21);
        halo.addColorStop(0, 'rgba(234,246,255,0.88)');
        halo.addColorStop(0.45, 'rgba(117,206,247,0.52)');
        halo.addColorStop(0.78, 'rgba(127,119,221,0.30)');
        halo.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = halo;
        g.beginPath(); g.arc(24, 24, 21, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(140,230,255,0.88)';
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(24, 24, 13, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(234,246,255,0.72)';
        g.lineWidth = 0.9;
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            g.beginPath();
            g.moveTo(24 + Math.cos(a) * 8.5, 24 + Math.sin(a) * 8.5);
            g.lineTo(24 + Math.cos(a) * 13, 24 + Math.sin(a) * 13);
            g.stroke();
        }
        _piscesPaintStar(g, 24, 24, 5.2, false);
    });

    const overflowBubble = _piscesBake(48, 48, g => {
        const halo = g.createRadialGradient(24, 24, 2, 24, 24, 22);
        halo.addColorStop(0, 'rgba(234,246,255,0.98)');
        halo.addColorStop(0.48, 'rgba(140,230,255,0.75)');
        halo.addColorStop(0.82, 'rgba(233,216,166,0.34)');
        halo.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = halo;
        g.beginPath(); g.arc(24, 24, 22, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(233,216,166,0.9)';
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(24, 24, 15.5, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(234,246,255,0.95)';
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(24, 24, 11.8, 0, Math.PI * 2); g.stroke();
        _piscesPaintStar(g, 24, 24, 6.4, true);
    });

    const mist = _piscesBake(160, 160, g => {
        const clouds = [
            [62, 72, 56, 'rgba(38,36,90,0.42)', 'rgba(127,119,221,0.52)'],
            [98, 60, 48, 'rgba(117,206,247,0.44)', 'rgba(127,119,221,0.24)'],
            [86, 100, 46, 'rgba(127,119,221,0.48)', 'rgba(140,230,255,0.22)']
        ];
        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            const fill = g.createRadialGradient(c[0], c[1], 4, c[0], c[1], c[2]);
            fill.addColorStop(0, c[3]);
            fill.addColorStop(0.55, c[4]);
            fill.addColorStop(1, 'rgba(38,36,90,0)');
            g.fillStyle = fill;
            g.fillRect(0, 0, 160, 160);
        }
        g.strokeStyle = 'rgba(140,230,255,0.34)';
        g.lineWidth = 1;
        g.beginPath(); g.arc(80, 80, 52, 0.2, 2.3); g.stroke();
        g.beginPath(); g.arc(80, 80, 44, 3.4, 5.5); g.stroke();
        _piscesPaintWavelets(g, 80, 80, 36, 8, 0.28);
    });

    const current = _piscesBake(192, 192, g => {
        g.translate(96, 96);
        g.strokeStyle = 'rgba(127,119,221,0.26)';
        g.lineWidth = 1;
        g.beginPath(); g.arc(0, 0, 74, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 3; i++) {
            g.save();
            g.rotate(i * Math.PI * 2 / 3);
            const fill = g.createLinearGradient(-72, -10, 72, 20);
            fill.addColorStop(0, 'rgba(38,36,90,0)');
            fill.addColorStop(0.3, 'rgba(127,119,221,0.40)');
            fill.addColorStop(0.7, 'rgba(117,206,247,0.68)');
            fill.addColorStop(0.92, 'rgba(234,246,255,0.85)');
            fill.addColorStop(1, 'rgba(234,246,255,0)');
            g.fillStyle = fill;
            g.strokeStyle = 'rgba(140,230,255,0.72)';
            g.lineWidth = 1.1;
            g.beginPath();
            g.moveTo(-66, -22);
            g.bezierCurveTo(-22, -84, 52, -64, 72, 6);
            g.bezierCurveTo(50, -44, -12, -62, -66, -22);
            g.fill();
            g.stroke();
            g.strokeStyle = 'rgba(234,246,255,0.5)';
            g.lineWidth = 0.75;
            for (let j = 0; j < 5; j++) {
                const t = j / 4;
                const px = -30 + t * 76, py = -54 + t * 26;
                g.beginPath(); g.arc(px, py, 3.2, 0, Math.PI * 2); g.stroke();
            }
            _piscesPaintStar(g, 66, -6, 3.2, i === 0);
            g.restore();
        }
    });

    const pointRingBase = _piscesBake(192, 192, g => {
        g.translate(96, 96);
        const bg = g.createRadialGradient(0, 0, 56, 0, 0, 88);
        bg.addColorStop(0, 'rgba(38,36,90,0)');
        bg.addColorStop(0.5, 'rgba(38,36,90,0.34)');
        bg.addColorStop(0.82, 'rgba(127,119,221,0.22)');
        bg.addColorStop(1, 'rgba(38,36,90,0)');
        g.fillStyle = bg;
        g.beginPath(); g.arc(0, 0, 88, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(140,230,255,0.42)';
        g.lineWidth = 1.1;
        g.beginPath(); g.arc(0, 0, 72, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(127,119,221,0.36)';
        g.lineWidth = 0.9;
        g.beginPath(); g.arc(0, 0, 63, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(0, 0, 80, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(233,216,166,0.35)';
        g.lineWidth = 0.8;
        for (let i = 0; i < 36; i++) {
            const a = i * Math.PI * 2 / 36;
            const r0 = i % 3 === 0 ? 62 : 65;
            g.beginPath();
            g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
            g.lineTo(Math.cos(a) * 79, Math.sin(a) * 79);
            g.stroke();
        }
    });

    const frames = [];
    for (let frame = 0; frame < 6; frame++) {
        frames.push(_piscesBake(160, 100, g => {
            const phase = frame * Math.PI * 2 / 6;
            const sway = Math.sin(phase) * 9.5;
            const swayMid = Math.cos(phase) * 4.8;

            const aura = g.createRadialGradient(92, 50, 4, 86, 50, 58);
            aura.addColorStop(0, 'rgba(127,119,221,0.32)');
            aura.addColorStop(0.55, 'rgba(117,206,247,0.16)');
            aura.addColorStop(1, 'rgba(38,36,90,0)');
            g.fillStyle = aura;
            g.fillRect(0, 0, 160, 100);

            const finGrad = g.createLinearGradient(8, 12, 112, 88);
            finGrad.addColorStop(0, 'rgba(127,119,221,0.28)');
            finGrad.addColorStop(0.5, 'rgba(117,206,247,0.68)');
            finGrad.addColorStop(0.85, 'rgba(140,230,255,0.82)');
            finGrad.addColorStop(1, 'rgba(234,246,255,0.22)');
            g.fillStyle = finGrad;
            g.strokeStyle = 'rgba(234,246,255,0.82)';
            g.lineWidth = 1.1;

            g.beginPath();
            g.moveTo(50, 48 + swayMid * 0.35);
            g.bezierCurveTo(30, 26, 14, 10 + sway, 4, 15 + sway);
            g.quadraticCurveTo(22, 46 + sway * 0.65, 12, 50 + sway * 0.5);
            g.quadraticCurveTo(22, 55 + sway * 0.65, 6, 85 + sway);
            g.bezierCurveTo(20, 88 + sway, 36, 68, 50, 53 + swayMid * 0.35);
            g.closePath();
            g.fill();
            g.stroke();

            g.beginPath();
            g.moveTo(72, 36 + swayMid * 0.15);
            g.bezierCurveTo(54, 6 - sway * 0.45, 84, 4 - sway * 0.25, 110, 26);
            g.quadraticCurveTo(92, 28, 98, 39);
            g.closePath();
            g.fill();
            g.stroke();

            g.beginPath();
            g.moveTo(74, 61 + swayMid * 0.15);
            g.bezierCurveTo(54, 92 + sway * 0.45, 84, 95 + sway * 0.25, 110, 72);
            g.quadraticCurveTo(92, 69, 98, 58);
            g.closePath();
            g.fill();
            g.stroke();

            const bodyGrad = g.createLinearGradient(44, 26, 142, 72);
            bodyGrad.addColorStop(0, 'rgba(127,119,221,0.86)');
            bodyGrad.addColorStop(0.45, 'rgba(117,206,247,0.88)');
            bodyGrad.addColorStop(0.82, 'rgba(140,230,255,0.94)');
            bodyGrad.addColorStop(1, 'rgba(234,246,255,0.98)');
            g.fillStyle = bodyGrad;
            g.strokeStyle = 'rgba(234,246,255,0.94)';
            g.lineWidth = 1.5;

            g.beginPath();
            g.moveTo(44, 50 + swayMid * 0.4);
            g.bezierCurveTo(68, 22 + swayMid * 0.25, 114, 24, 142, 48);
            g.quadraticCurveTo(148, 50, 142, 53);
            g.bezierCurveTo(114, 76, 68, 77 + swayMid * 0.25, 44, 50 + swayMid * 0.4);
            g.closePath();
            g.fill();
            g.stroke();

            g.strokeStyle = 'rgba(234,246,255,0.65)';
            g.lineWidth = 0.9;
            for (let row = -1; row <= 1; row++) {
                for (let col = 0; col < 6; col++) {
                    const sx = 62 + col * 10.5 + (row !== 0 ? 4 : 0);
                    const sy = 50 + row * 7.5 + swayMid * (1 - col / 6) * 0.3;
                    g.beginPath();
                    g.arc(sx, sy, 5.4, -1.05, 1.05);
                    g.stroke();
                }
            }

            g.strokeStyle = 'rgba(233,216,166,0.82)';
            g.lineWidth = 1.1;
            g.beginPath();
            g.moveTo(114, 34);
            g.quadraticCurveTo(106, 50, 114, 66);
            g.stroke();
            g.beginPath();
            g.moveTo(54, 50 + swayMid * 0.35);
            g.bezierCurveTo(82, 40, 110, 41, 136, 49);
            g.stroke();

            g.fillStyle = '#26245A';
            g.beginPath(); g.arc(127, 45, 3.1, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#EAF6FF';
            g.beginPath(); g.arc(127.6, 44.5, 1.7, 0, Math.PI * 2); g.fill();
        }));
    }

    const brightFrames = [];
    for (let i = 0; i < frames.length; i++) {
        brightFrames.push(_piscesBake(160, 100, g => {
            g.drawImage(frames[i], 0, 0);
            g.globalCompositeOperation = 'source-in';
            const fill = g.createLinearGradient(20, 0, 148, 0);
            fill.addColorStop(0, 'rgba(140,230,255,0.75)');
            fill.addColorStop(0.5, 'rgba(234,246,255,0.95)');
            fill.addColorStop(1, '#EAF6FF');
            g.fillStyle = fill;
            g.fillRect(0, 0, 160, 100);
        }));
    }

    const fishConstellation = _piscesBake(160, 100, g => {
        const pts = [
            [140, 50, true], [122, 37, false], [120, 62, false],
            [94, 32, false], [96, 50, true], [92, 68, false],
            [64, 42, false], [64, 58, false], [48, 50, true],
            [18, 22, false], [18, 78, false]
        ];
        const edges = [
            [0, 1], [0, 2], [1, 3], [2, 5], [1, 4], [2, 4],
            [3, 4], [5, 4], [3, 6], [5, 7], [4, 8], [6, 8],
            [7, 8], [8, 9], [8, 10], [9, 10]
        ];
        g.strokeStyle = 'rgba(140,230,255,0.82)';
        g.lineWidth = 1.1;
        for (let i = 0; i < edges.length; i++) {
            const a = pts[edges[i][0]], b = pts[edges[i][1]];
            g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
        for (let i = 0; i < pts.length; i++) {
            _piscesPaintStar(g, pts[i][0], pts[i][1], pts[i][2] ? 3.8 : 2.6, pts[i][2]);
        }
    });

    const fishNimbus = _piscesBake(160, 160, g => {
        g.translate(80, 80);
        const bg = g.createRadialGradient(0, 0, 8, 0, 0, 74);
        bg.addColorStop(0, 'rgba(127,119,221,0.34)');
        bg.addColorStop(0.55, 'rgba(38,36,90,0.38)');
        bg.addColorStop(0.85, 'rgba(117,206,247,0.22)');
        bg.addColorStop(1, 'rgba(38,36,90,0)');
        g.fillStyle = bg;
        g.beginPath(); g.arc(0, 0, 74, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(140,230,255,0.78)';
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(233,216,166,0.68)';
        g.lineWidth = 1;
        g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.52)';
        g.lineWidth = 0.9;
        for (let i = 0; i < 16; i++) {
            const a = i * Math.PI * 2 / 16;
            g.beginPath();
            g.moveTo(Math.cos(a) * 50, Math.sin(a) * 50);
            g.lineTo(Math.cos(a) * 62, Math.sin(a) * 62);
            g.stroke();
            g.fillStyle = i % 2 === 0 ? '#EAF6FF' : '#8CE6FF';
            g.beginPath();
            g.arc(Math.cos(a + Math.PI / 16) * 66, Math.sin(a + Math.PI / 16) * 66, 1.5, 0, Math.PI * 2);
            g.fill();
        }
    });

    const fishWake = _piscesBake(192, 96, g => {
        const wakeGrad = g.createLinearGradient(8, 48, 180, 48);
        wakeGrad.addColorStop(0, 'rgba(38,36,90,0)');
        wakeGrad.addColorStop(0.35, 'rgba(127,119,221,0.24)');
        wakeGrad.addColorStop(0.75, 'rgba(117,206,247,0.44)');
        wakeGrad.addColorStop(1, 'rgba(234,246,255,0)');
        g.fillStyle = wakeGrad;
        g.beginPath();
        g.moveTo(10, 48);
        g.bezierCurveTo(58, 10, 134, 22, 182, 48);
        g.bezierCurveTo(134, 74, 58, 86, 10, 48);
        g.fill();
        g.strokeStyle = 'rgba(140,230,255,0.62)';
        g.lineWidth = 1.1;
        for (let i = 0; i < 4; i++) {
            const x0 = 28 + i * 34;
            const spread = 28 - i * 4.5;
            g.beginPath();
            g.moveTo(x0, 48 - spread);
            g.quadraticCurveTo(x0 + 26, 48, x0, 48 + spread);
            g.stroke();
        }
    });

    const tailRibbon = _piscesBake(128, 64, g => {
        const grad = g.createLinearGradient(4, 32, 124, 32);
        grad.addColorStop(0, 'rgba(127,119,221,0)');
        grad.addColorStop(0.35, 'rgba(127,119,221,0.52)');
        grad.addColorStop(0.75, 'rgba(117,206,247,0.78)');
        grad.addColorStop(1, 'rgba(234,246,255,0.92)');
        g.fillStyle = grad;
        g.strokeStyle = 'rgba(234,246,255,0.82)';
        g.lineWidth = 1.0;

        for (let s = -1; s <= 1; s++) {
            const yOff = s * 11;
            const cOff = s * 7;
            g.beginPath();
            g.moveTo(6, 32 + yOff * 1.2);
            g.bezierCurveTo(42, 14 + yOff, 84, 48 + cOff, 122, 32 + cOff * 0.5);
            g.bezierCurveTo(84, 40 + cOff, 42, 22 + yOff, 6, 32 + yOff * 1.2);
            g.fill();
            g.stroke();
        }
    });

    const ripple = _piscesBake(160, 160, g => {
        const glow = g.createRadialGradient(80, 80, 44, 80, 80, 76);
        glow.addColorStop(0, 'rgba(117,206,247,0)');
        glow.addColorStop(0.65, 'rgba(117,206,247,0.22)');
        glow.addColorStop(0.88, 'rgba(234,246,255,0.42)');
        glow.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = glow;
        g.beginPath(); g.arc(80, 80, 76, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(234,246,255,0.9)';
        g.lineWidth = 1.8;
        g.beginPath(); g.arc(80, 80, 66, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.58)';
        g.lineWidth = 1.1;
        g.beginPath(); g.arc(80, 80, 54, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(127,119,221,0.36)';
        g.lineWidth = 0.9;
        g.beginPath(); g.arc(80, 80, 41, 0, Math.PI * 2); g.stroke();
    });

    const droplet = _piscesBake(64, 28, g => {
        const fill = g.createLinearGradient(4, 14, 58, 14);
        fill.addColorStop(0, 'rgba(127,119,221,0)');
        fill.addColorStop(0.55, 'rgba(117,206,247,0.72)');
        fill.addColorStop(1, 'rgba(234,246,255,0.96)');
        g.fillStyle = fill;
        g.strokeStyle = 'rgba(234,246,255,0.82)';
        g.lineWidth = 0.95;
        g.beginPath();
        g.moveTo(4, 14);
        g.bezierCurveTo(24, 4, 48, 3, 58, 14);
        g.bezierCurveTo(48, 25, 24, 24, 4, 14);
        g.fill();
        g.stroke();
    });

    const impactGlow = _piscesBake(128, 128, g => {
        const fill = g.createRadialGradient(64, 64, 3, 64, 64, 62);
        fill.addColorStop(0, 'rgba(234,246,255,0.92)');
        fill.addColorStop(0.38, 'rgba(140,230,255,0.58)');
        fill.addColorStop(0.72, 'rgba(127,119,221,0.28)');
        fill.addColorStop(1, 'rgba(38,36,90,0)');
        g.fillStyle = fill;
        g.fillRect(0, 0, 128, 128);
    });

    const splashCrown = _piscesBake(128, 128, g => {
        g.translate(64, 64);
        for (let i = -2; i <= 2; i++) {
            const a = i * 0.36;
            g.save();
            g.rotate(a);
            const grad = g.createLinearGradient(10, 0, 56, 0);
            grad.addColorStop(0, 'rgba(127,119,221,0)');
            grad.addColorStop(0.5, 'rgba(117,206,247,0.68)');
            grad.addColorStop(1, 'rgba(234,246,255,0.95)');
            g.fillStyle = grad;
            g.beginPath();
            g.moveTo(14, 0);
            g.quadraticCurveTo(38, -7, 56, 0);
            g.quadraticCurveTo(38, 7, 14, 0);
            g.fill();
            g.restore();
        }
        g.strokeStyle = 'rgba(234,246,255,0.82)';
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(0, 0, 42, -1.1, 1.1); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.55)';
        g.lineWidth = 1;
        g.beginPath(); g.arc(0, 0, 30, -1.3, 1.3); g.stroke();
    });

    const barrierRipple = _piscesBake(128, 128, g => {
        g.translate(64, 64);
        g.strokeStyle = 'rgba(234,246,255,0.95)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(18, -48);
        g.quadraticCurveTo(24, 0, 18, 48);
        g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.82)';
        g.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
            const rx = 14 - i * 12;
            g.beginPath();
            g.ellipse(rx, 0, 10 + i * 6, 36 - i * 4, 0, Math.PI * 0.55, Math.PI * 1.45);
            g.stroke();
        }
        g.strokeStyle = 'rgba(233,216,166,0.72)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(20, -28); g.lineTo(6, -14); g.lineTo(18, 0); g.lineTo(4, 16); g.lineTo(20, 30);
        g.stroke();
    });

    const constellationChord = _piscesBake(64, 24, g => {
        const grad = g.createLinearGradient(4, 12, 60, 12);
        grad.addColorStop(0, 'rgba(140,230,255,0.25)');
        grad.addColorStop(0.5, 'rgba(234,246,255,0.92)');
        grad.addColorStop(1, 'rgba(140,230,255,0.25)');
        g.strokeStyle = grad;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(4, 12);
        g.quadraticCurveTo(32, 6, 60, 12);
        g.stroke();
        _piscesPaintStar(g, 8, 12, 2.5, false);
        _piscesPaintStar(g, 56, 12, 2.5, false);
    });

    const alreschaKnot = _piscesBake(64, 64, g => {
        g.translate(32, 32);
        const glow = g.createRadialGradient(0, 0, 2, 0, 0, 28);
        glow.addColorStop(0, 'rgba(234,246,255,0.95)');
        glow.addColorStop(0.45, 'rgba(233,216,166,0.68)');
        glow.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = glow;
        g.beginPath(); g.arc(0, 0, 28, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(233,216,166,0.92)';
        g.lineWidth = 1.4;
        for (let i = 0; i < 2; i++) {
            g.save();
            g.rotate(i * Math.PI / 2 + Math.PI / 4);
            g.beginPath(); g.ellipse(0, 0, 17, 7, 0, 0, Math.PI * 2); g.stroke();
            g.restore();
        }
        _piscesPaintStar(g, 0, 0, 7, true);
    });

    const starNode = _piscesBake(32, 32, g => {
        _piscesPaintStar(g, 16, 16, 6.2, false);
    });

    const whiplashStream = _piscesBake(160, 48, g => {
        const grad = g.createLinearGradient(8, 24, 152, 24);
        grad.addColorStop(0, 'rgba(127,119,221,0)');
        grad.addColorStop(0.35, 'rgba(127,119,221,0.44)');
        grad.addColorStop(0.75, 'rgba(117,206,247,0.76)');
        grad.addColorStop(1, 'rgba(234,246,255,0.92)');
        g.fillStyle = grad;
        g.strokeStyle = 'rgba(234,246,255,0.82)';
        g.lineWidth = 1.0;
        g.beginPath();
        g.moveTo(6, 36);
        g.bezierCurveTo(46, 2, 102, 46, 152, 18);
        g.bezierCurveTo(102, 36, 46, 12, 6, 36);
        g.fill();
        g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.55)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(14, 20);
        g.bezierCurveTo(54, 42, 106, 8, 148, 26);
        g.stroke();
        _piscesPaintStar(g, 52, 19, 2.4, false);
        _piscesPaintStar(g, 108, 29, 2.8, false);
        _piscesPaintStar(g, 146, 19, 3.4, true);
    });

    const shieldNimbus = _piscesBake(192, 192, g => {
        g.translate(96, 96);
        const bg = g.createRadialGradient(0, 0, 40, 0, 0, 92);
        bg.addColorStop(0, 'rgba(38,36,90,0.08)');
        bg.addColorStop(0.62, 'rgba(38,36,90,0.42)');
        bg.addColorStop(0.84, 'rgba(127,119,221,0.46)');
        bg.addColorStop(0.95, 'rgba(117,206,247,0.35)');
        bg.addColorStop(1, 'rgba(38,36,90,0)');
        g.fillStyle = bg;
        g.beginPath(); g.arc(0, 0, 92, 0, Math.PI * 2); g.fill();

        for (let i = 0; i < 24; i++) {
            const a0 = i * Math.PI * 2 / 24;
            const a1 = a0 + Math.PI * 2 / 24 - 0.03;
            g.fillStyle = i % 2 === 0 ? 'rgba(127,119,221,0.32)' : 'rgba(117,206,247,0.28)';
            g.beginPath();
            g.arc(0, 0, 82, a0, a1);
            g.arc(0, 0, 68, a1, a0, true);
            g.closePath();
            g.fill();
        }

        g.strokeStyle = 'rgba(234,246,255,0.9)';
        g.lineWidth = 1.6;
        g.beginPath(); g.arc(0, 0, 83, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.78)';
        g.lineWidth = 1.2;
        g.beginPath(); g.arc(0, 0, 68, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(233,216,166,0.82)';
        g.lineWidth = 1.1;
        g.beginPath(); g.arc(0, 0, 61, 0, Math.PI * 2); g.stroke();

        for (let i = 0; i < 24; i++) {
            const a = i * Math.PI * 2 / 24;
            g.strokeStyle = 'rgba(234,246,255,0.58)';
            g.lineWidth = 0.85;
            g.beginPath();
            g.moveTo(Math.cos(a) * 68, Math.sin(a) * 68);
            g.lineTo(Math.cos(a) * 83, Math.sin(a) * 83);
            g.stroke();
            g.fillStyle = i % 3 === 0 ? '#E9D8A6' : '#EAF6FF';
            g.beginPath();
            g.arc(Math.cos(a + Math.PI / 24) * 87, Math.sin(a + Math.PI / 24) * 87, 1.5, 0, Math.PI * 2);
            g.fill();
        }

        _piscesPaintMiniFish(g, 0, -75, 0, 0.95, 0.95);
        _piscesPaintMiniFish(g, 0, 75, Math.PI, 0.95, 0.95);
    });

    const shieldInner = _piscesBake(192, 192, g => {
        g.translate(96, 96);
        g.strokeStyle = 'rgba(140,230,255,0.48)';
        g.lineWidth = 1;
        g.save();
        g.rotate(0.35);
        g.beginPath(); g.ellipse(0, 0, 56, 44, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
        g.save();
        g.rotate(-0.35);
        g.beginPath(); g.ellipse(0, 0, 56, 44, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
        _piscesPaintWavelets(g, 0, 0, 50, 12, 0.44);

        g.strokeStyle = 'rgba(140,230,255,0.62)';
        g.lineWidth = 0.95;
        for (let i = 0; i < _piscesStarLines.length; i++) {
            const p0 = _piscesStarCoords[_piscesStarLines[i][0]];
            const p1 = _piscesStarCoords[_piscesStarLines[i][1]];
            g.beginPath();
            g.moveTo(p0[0] * 66, p0[1] * 66);
            g.lineTo(p1[0] * 66, p1[1] * 66);
            g.stroke();
        }
        for (let i = 0; i < _piscesStarCoords.length; i++) {
            const p = _piscesStarCoords[i];
            _piscesPaintStar(g, p[0] * 66, p[1] * 66, i === 2 ? 3.2 : 2.0, i === 2);
        }
    });

    const shieldArc = _piscesBake(192, 192, g => {
        g.translate(96, 96);
        const grad = g.createRadialGradient(0, 0, 66, 0, 0, 90);
        grad.addColorStop(0, 'rgba(140,230,255,0)');
        grad.addColorStop(0.45, 'rgba(140,230,255,0.58)');
        grad.addColorStop(0.8, 'rgba(234,246,255,0.92)');
        grad.addColorStop(1, 'rgba(234,246,255,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(0, 0, 88, -Math.PI / 2, 0);
        g.arc(0, 0, 68, 0, -Math.PI / 2, true);
        g.closePath();
        g.fill();
        g.strokeStyle = '#EAF6FF';
        g.lineWidth = 2.2;
        g.beginPath();
        g.arc(0, 0, 83, -Math.PI / 2 + 0.04, -0.04);
        g.stroke();
        _piscesPaintStar(g, Math.cos(-Math.PI / 4) * 83, Math.sin(-Math.PI / 4) * 83, 4.2, true);
    });

    const markStages = [];
    for (let stage = 0; stage < 8; stage++) {
        markStages.push(_piscesBake(128, 128, g => {
            g.translate(64, 64);
            const frac = (stage + 1) / 8;
            const bg = g.createRadialGradient(0, 0, 26, 0, 0, 58);
            bg.addColorStop(0, 'rgba(38,36,90,0)');
            bg.addColorStop(0.65, 'rgba(38,36,90,0.34)');
            bg.addColorStop(0.9, 'rgba(127,119,221,' + (0.2 + frac * 0.28) + ')');
            bg.addColorStop(1, 'rgba(38,36,90,0)');
            g.fillStyle = bg;
            g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.fill();

            g.strokeStyle = 'rgba(127,119,221,0.45)';
            g.lineWidth = 1.1;
            g.beginPath(); g.arc(0, 0, 49, 0, Math.PI * 2); g.stroke();
            g.beginPath(); g.arc(0, 0, 39, 0, Math.PI * 2); g.stroke();

            for (let i = 0; i < 8; i++) {
                const a0 = i * Math.PI / 4 - Math.PI / 2;
                const a1 = a0 + Math.PI / 4 - 0.05;
                const lit = i <= stage;
                g.fillStyle = lit ? (i === 7 ? 'rgba(233,216,166,0.62)' : 'rgba(117,206,247,0.56)') : 'rgba(38,36,90,0.32)';
                g.beginPath();
                g.arc(0, 0, 49, a0, a1);
                g.arc(0, 0, 39, a1, a0, true);
                g.closePath();
                g.fill();
                g.strokeStyle = lit ? 'rgba(234,246,255,0.92)' : 'rgba(127,119,221,0.35)';
                g.lineWidth = lit ? 1.4 : 0.8;
                g.stroke();
                if (lit) {
                    const am = (a0 + a1) * 0.5;
                    _piscesPaintStar(g, Math.cos(am) * 44, Math.sin(am) * 44, i === stage ? 3.5 : 2.5, i === 7);
                }
            }

            g.strokeStyle = '#EAF6FF';
            g.lineWidth = 2.0;
            g.beginPath();
            g.arc(0, 0, 53, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
            g.stroke();
        }));
    }

    const markBloom = _piscesBake(128, 128, g => {
        g.translate(64, 64);
        g.strokeStyle = 'rgba(140,230,255,0.68)';
        g.lineWidth = 1.1;
        g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(233,216,166,0.58)';
        g.lineWidth = 0.9;
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            const b = (i + 3) * Math.PI / 4;
            g.beginPath();
            g.moveTo(Math.cos(a) * 33, Math.sin(a) * 33);
            g.lineTo(Math.cos(b) * 33, Math.sin(b) * 33);
            g.stroke();
            _piscesPaintStar(g, Math.cos(a) * 33, Math.sin(a) * 33, 2.6, i % 2 === 0);
        }
    });

    const burstHalo = _piscesBake(192, 192, g => {
        g.translate(96, 96);
        const glow = g.createRadialGradient(0, 0, 6, 0, 0, 90);
        glow.addColorStop(0, 'rgba(234,246,255,0.92)');
        glow.addColorStop(0.35, 'rgba(117,206,247,0.62)');
        glow.addColorStop(0.7, 'rgba(127,119,221,0.38)');
        glow.addColorStop(1, 'rgba(38,36,90,0)');
        g.fillStyle = glow;
        g.beginPath(); g.arc(0, 0, 90, 0, Math.PI * 2); g.fill();

        g.strokeStyle = 'rgba(234,246,255,0.92)';
        g.lineWidth = 2.0;
        g.beginPath(); g.arc(0, 0, 74, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.75)';
        g.lineWidth = 1.3;
        g.beginPath(); g.arc(0, 0, 56, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(233,216,166,0.75)';
        g.lineWidth = 1.1;
        g.beginPath(); g.arc(0, 0, 38, 0, Math.PI * 2); g.stroke();

        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI * 2 / 12;
            g.save();
            g.rotate(a);
            const petal = g.createLinearGradient(28, 0, 82, 0);
            petal.addColorStop(0, 'rgba(127,119,221,0.18)');
            petal.addColorStop(0.6, 'rgba(117,206,247,0.68)');
            petal.addColorStop(1, 'rgba(234,246,255,0.95)');
            g.fillStyle = petal;
            g.beginPath();
            g.moveTo(32, 0);
            g.quadraticCurveTo(58, -9, 80, 0);
            g.quadraticCurveTo(58, 9, 32, 0);
            g.fill();
            _piscesPaintStar(g, 82, 0, i % 3 === 0 ? 3.8 : 2.6, i % 3 === 0);
            g.restore();
        }
    });

    // Dream Realm screen light: indigo edges with a lavender rim, stretched over the screen.
    const dreamVignette = _piscesBake(256, 256, g => {
        const grad = g.createRadialGradient(128, 128, 60, 128, 128, 182);
        grad.addColorStop(0, 'rgba(38,36,90,0)');
        grad.addColorStop(0.55, 'rgba(38,36,90,0.10)');
        grad.addColorStop(0.8, 'rgba(127,119,221,0.30)');
        grad.addColorStop(1, 'rgba(38,36,90,0.78)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 256, 256);
    });

    // Dream Realm frame corner, top left: a quarter mosaic nimbus with whiplash curls, beads and a fish.
    const dreamCorner = _piscesBake(240, 240, g => {
        const wash = g.createRadialGradient(0, 0, 10, 0, 0, 210);
        wash.addColorStop(0, 'rgba(38,36,90,0.55)');
        wash.addColorStop(0.7, 'rgba(38,36,90,0.22)');
        wash.addColorStop(1, 'rgba(38,36,90,0)');
        g.fillStyle = wash;
        g.fillRect(0, 0, 240, 240);
        for (let i = 0; i < 12; i++) {
            const a0 = i * (Math.PI / 2) / 12, a1 = a0 + (Math.PI / 2) / 12 - 0.02;
            g.fillStyle = i % 2 === 0 ? 'rgba(127,119,221,0.55)' : 'rgba(117,206,247,0.45)';
            g.beginPath();
            g.arc(0, 0, 170, a0, a1);
            g.arc(0, 0, 152, a1, a0, true);
            g.closePath();
            g.fill();
        }
        g.strokeStyle = 'rgba(234,246,255,0.85)';
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(0, 0, 171, 0, Math.PI / 2); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.70)';
        g.lineWidth = 1.1;
        g.beginPath(); g.arc(0, 0, 151, 0, Math.PI / 2); g.stroke();
        g.strokeStyle = 'rgba(233,216,166,0.72)';
        g.lineWidth = 0.9;
        g.beginPath(); g.arc(0, 0, 143, 0, Math.PI / 2); g.stroke();
        for (let i = 0; i <= 12; i++) {
            const a = i * (Math.PI / 2) / 12;
            g.fillStyle = i % 4 === 0 ? '#E9D8A6' : '#EAF6FF';
            g.beginPath(); g.arc(Math.cos(a) * 180, Math.sin(a) * 180, 1.7, 0, Math.PI * 2); g.fill();
        }
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(140,230,255,0.80)';
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(6, 228); g.bezierCurveTo(30, 150, 70, 90, 118, 70); g.bezierCurveTo(150, 58, 176, 30, 228, 6); g.stroke();
        g.strokeStyle = 'rgba(234,246,255,0.65)';
        g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(14, 220); g.bezierCurveTo(38, 152, 76, 98, 120, 80); g.bezierCurveTo(152, 66, 180, 40, 220, 14); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.75)';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(228, 6); g.bezierCurveTo(238, 14, 232, 26, 222, 22); g.bezierCurveTo(214, 18, 218, 10, 224, 12); g.stroke();
        g.beginPath(); g.moveTo(6, 228); g.bezierCurveTo(14, 238, 26, 232, 22, 222); g.bezierCurveTo(18, 214, 10, 218, 12, 224); g.stroke();
        _piscesPaintWavelets(g, 0, 0, 120, 10, 0.4);
        _piscesPaintMiniFish(g, 92, 92, Math.PI / 4, 1.15, 0.9);
        _piscesPaintStar(g, 46, 46, 4.0, true);
        _piscesPaintStar(g, 150, 30, 2.4, false);
        _piscesPaintStar(g, 30, 150, 2.4, false);
    });

    // Moonlight falling on a forming fish: a soft tapered beam with dappled light near its foot.
    const moonShaft = _piscesBake(96, 256, g => {
        const across = g.createLinearGradient(0, 0, 96, 0);
        across.addColorStop(0, 'rgba(140,230,255,0)');
        across.addColorStop(0.5, 'rgba(234,246,255,0.55)');
        across.addColorStop(1, 'rgba(140,230,255,0)');
        g.fillStyle = across;
        g.beginPath();
        g.moveTo(34, 0); g.lineTo(62, 0); g.lineTo(96, 256); g.lineTo(0, 256);
        g.closePath();
        g.fill();
        for (let i = 0; i < 9; i++) {
            const y = 150 + (i % 5) * 20, x = 20 + ((i * 37) % 56);
            g.fillStyle = i % 3 === 0 ? 'rgba(234,246,255,0.55)' : 'rgba(140,230,255,0.40)';
            g.beginPath(); g.ellipse(x, y, 5 - (i % 3), 2.2, 0, 0, Math.PI * 2); g.fill();
        }
        g.globalCompositeOperation = 'destination-in';
        const down = g.createLinearGradient(0, 0, 0, 256);
        down.addColorStop(0, 'rgba(255,255,255,0.15)');
        down.addColorStop(0.65, 'rgba(255,255,255,0.85)');
        down.addColorStop(0.9, 'rgba(255,255,255,1)');
        down.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = down;
        g.fillRect(0, 0, 96, 256);
    });

    // Fish summon screen light: a cool moonlit bloom spreading from the summon point.
    const summonLight = _piscesBake(256, 256, g => {
        const grad = g.createRadialGradient(128, 128, 4, 128, 128, 128);
        grad.addColorStop(0, 'rgba(234,246,255,0.60)');
        grad.addColorStop(0.18, 'rgba(140,230,255,0.34)');
        grad.addColorStop(0.45, 'rgba(117,206,247,0.14)');
        grad.addColorStop(0.75, 'rgba(127,119,221,0.06)');
        grad.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 256, 256);
    });

    // Fish summon screen light: moonlight hanging down from the top edge like a curtain.
    const lightCurtain = _piscesBake(64, 256, g => {
        const grad = g.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, 'rgba(140,230,255,0.42)');
        grad.addColorStop(0.25, 'rgba(127,119,221,0.20)');
        grad.addColorStop(0.6, 'rgba(127,119,221,0.05)');
        grad.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 256);
    });

    // The title screen's Pisces constellation, for the sky while both fish swim.
    const skyPisces = _piscesBake(512, 320, g => {
        const cx = 256, cy = 168, sc = 290;
        g.strokeStyle = 'rgba(140,230,255,0.55)';
        g.lineWidth = 1.4;
        g.lineCap = 'round';
        for (let i = 0; i < _piscesStarLines.length; i++) {
            const p0 = _piscesStarCoords[_piscesStarLines[i][0]], p1 = _piscesStarCoords[_piscesStarLines[i][1]];
            g.beginPath(); g.moveTo(cx + p0[0] * sc, cy + p0[1] * sc); g.lineTo(cx + p1[0] * sc, cy + p1[1] * sc); g.stroke();
        }
        for (let i = 0; i < _piscesStarCoords.length; i++) {
            const p = _piscesStarCoords[i];
            _piscesPaintStar(g, cx + p[0] * sc, cy + p[1] * sc, Math.max(1.6, (5.2 - p[2]) * 1.6), i === 2);
        }
    });

    // Fish stun crown: a mosaic nimbus seen edge on, floating over the held enemy.
    const stunHalo = _piscesBake(144, 64, g => {
        const cx = 72, cy = 32;
        g.save();
        g.translate(cx, cy);
        g.scale(1, 0.34);
        const wash = g.createRadialGradient(0, 0, 20, 0, 0, 70);
        wash.addColorStop(0, 'rgba(38,36,90,0)');
        wash.addColorStop(0.7, 'rgba(127,119,221,0.30)');
        wash.addColorStop(0.9, 'rgba(117,206,247,0.26)');
        wash.addColorStop(1, 'rgba(38,36,90,0)');
        g.fillStyle = wash;
        g.beginPath(); g.arc(0, 0, 70, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 20; i++) {
            const a0 = i * Math.PI * 2 / 20, a1 = a0 + Math.PI * 2 / 20 - 0.05;
            g.fillStyle = i % 2 === 0 ? 'rgba(127,119,221,0.62)' : 'rgba(117,206,247,0.55)';
            g.beginPath();
            g.arc(0, 0, 62, a0, a1);
            g.arc(0, 0, 51, a1, a0, true);
            g.closePath();
            g.fill();
        }
        g.restore();
        g.strokeStyle = 'rgba(234,246,255,0.92)';
        g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(cx, cy, 63, 21.4, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.80)';
        g.lineWidth = 1.1;
        g.beginPath(); g.ellipse(cx, cy, 51, 17.3, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(233,216,166,0.80)';
        g.lineWidth = 0.9;
        g.beginPath(); g.ellipse(cx, cy, 45, 15.3, 0, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 20; i++) {
            const a = (i + 0.5) * Math.PI * 2 / 20;
            g.fillStyle = i % 4 === 0 ? '#E9D8A6' : '#EAF6FF';
            g.beginPath(); g.arc(cx + Math.cos(a) * 67, cy + Math.sin(a) * 22.8, 1.35, 0, Math.PI * 2); g.fill();
        }
        _piscesPaintStar(g, cx, cy + 21.4, 3.0, true);
    });

    // Fish stun bind: a still water ring with Botticelli wavelets around the held body.
    const stunBind = _piscesBake(176, 60, g => {
        const cx = 88, cy = 30;
        g.save();
        g.translate(cx, cy);
        g.scale(1, 0.3);
        const wash = g.createRadialGradient(0, 0, 30, 0, 0, 84);
        wash.addColorStop(0, 'rgba(127,119,221,0)');
        wash.addColorStop(0.82, 'rgba(127,119,221,0.20)');
        wash.addColorStop(1, 'rgba(117,206,247,0)');
        g.fillStyle = wash;
        g.beginPath(); g.arc(0, 0, 84, 0, Math.PI * 2); g.fill();
        g.restore();
        g.strokeStyle = 'rgba(117,206,247,0.78)';
        g.lineWidth = 1.4;
        g.beginPath(); g.ellipse(cx, cy, 80, 24, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(140,230,255,0.48)';
        g.lineWidth = 1.0;
        g.beginPath(); g.ellipse(cx, cy, 70, 20, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(234,246,255,0.70)';
        g.lineWidth = 0.9;
        for (let i = 0; i < 16; i++) {
            const a = i * Math.PI * 2 / 16;
            const x = cx + Math.cos(a) * 80, y = cy + Math.sin(a) * 24;
            g.save();
            g.translate(x, y);
            g.rotate(Math.atan2(Math.cos(a) * 24, -Math.sin(a) * 80));
            g.beginPath();
            g.moveTo(-4, 1.2); g.quadraticCurveTo(-2, -1.6, 0, 1); g.quadraticCurveTo(2, -1.6, 4, 1.2);
            g.stroke();
            g.restore();
        }
    });

    _piscesRenderCache = {
        bubble, overflowBubble, emptyBubble, mist, current, pointRingBase,
        frames, brightFrames, fishConstellation, fishNimbus, fishWake, tailRibbon,
        ripple, droplet, impactGlow, splashCrown, barrierRipple,
        constellationChord, alreschaKnot, starNode, whiplashStream,
        shieldNimbus, shieldInner, shieldArc, markStages, markBloom, burstHalo,
        stunHalo, stunBind, dreamVignette, dreamCorner, moonShaft, skyPisces,
        summonLight, lightCurtain
    };
    return _piscesRenderCache;
}

function _piscesEventsReset() {
    _piscesBurstCursor = _piscesRefundCursor = _piscesBlockCursor = _piscesCastCursor = _piscesBoostCursor = 0;
    _piscesLastBlockAt = _piscesLastBoostG = _piscesLastBoostS = -1000;
    _piscesLastCoiMongEnd = _piscesLastCoiMongCd = 0;
    _piscesCoiMongBurstAt = _piscesCoiMongReadyAt = -10000;
    _piscesPrevPlayerX = _piscesPrevPlayerY = NaN;
    _piscesMoveDirX = 0; _piscesMoveDirY = -1;
    _piscesSkyAlpha = 0; _piscesSkyLastAt = 0;
    _piscesBubblePoints = _piscesBubbleClock = 0;
    _piscesBubblePulseEnd.fill(0);
    for (let i = 0; i < 2; i++) {
        _piscesFishTrailHead[i] = 0;
        _piscesFishTrailCount[i] = 0;
        _piscesFishTrail[i].fill(0);
    }
    for (let i = 0; i < _piscesBurstPool.length; i++) _piscesBurstPool[i].active = false;
    for (let i = 0; i < _piscesRefundPool.length; i++) _piscesRefundPool[i].active = false;
    for (let i = 0; i < _piscesBlockPool.length; i++) _piscesBlockPool[i].active = false;
    for (let i = 0; i < _piscesCastPool.length; i++) _piscesCastPool[i].active = false;
    for (let i = 0; i < _piscesBoostPool.length; i++) _piscesBoostPool[i].active = false;
}

function _piscesRefund(totalMs, slotCount, x, y) {
    const ev = _piscesRefundPool[_piscesRefundCursor];
    _piscesRefundCursor = (_piscesRefundCursor + 1) % _piscesRefundPool.length;
    ev.active = true;
    ev.born = performance.now();
    ev.life = 820;
    ev.isKill = Number.isFinite(x) && Number.isFinite(y);
    ev.x = ev.isKill ? x : (typeof player !== 'undefined' ? player.x : 0);
    ev.y = ev.isKill ? y : (typeof player !== 'undefined' ? player.y : 0);
    ev.dirX = _piscesMoveDirX;
    ev.dirY = _piscesMoveDirY;
    ev.scale = Math.max(0.75, Math.min(1.4, (totalMs || 1000) / 2400 + (slotCount || 1) * 0.08));
}

function _piscesInstantCast(kind) {
    const ev = _piscesCastPool[_piscesCastCursor];
    _piscesCastCursor = (_piscesCastCursor + 1) % _piscesCastPool.length;
    ev.active = true;
    ev.born = performance.now();
    ev.life = 780;
    ev.kind = kind === 'D' ? 0 : kind === 'F' ? 1 : 2;
}

function _piscesChargeBoost(kind) {
    const now = performance.now();
    const isS = kind === 'S';
    if (isS) {
        if (now - _piscesLastBoostS < 300) return;
        _piscesLastBoostS = now;
    } else {
        if (now - _piscesLastBoostG < 300) return;
        _piscesLastBoostG = now;
    }
    const ev = _piscesBoostPool[_piscesBoostCursor];
    _piscesBoostCursor = (_piscesBoostCursor + 1) % _piscesBoostPool.length;
    ev.active = true;
    ev.born = now;
    ev.life = 560;
    ev.kind = isS ? 1 : 0;
}

function _piscesDreamBlock() {
    const now = performance.now();
    if (now - _piscesLastBlockAt < 120) return;
    _piscesLastBlockAt = now;
    const ev = _piscesBlockPool[_piscesBlockCursor];
    _piscesBlockCursor = (_piscesBlockCursor + 1) % _piscesBlockPool.length;
    ev.active = true;
    ev.born = now;
    ev.life = 540;
    ev.angle = (_piscesBlockCursor * 2.39996) % (Math.PI * 2);
}

function _piscesDreamBurst(x, y, size, power) {
    const ev = _piscesBurstPool[_piscesBurstCursor];
    _piscesBurstCursor = (_piscesBurstCursor + 1) % _piscesBurstPool.length;
    const p = Math.max(0, Math.min(1, power || 0));
    ev.active = true;
    ev.born = performance.now();
    ev.life = p > 0 ? 960 : 480;
    ev.x = x;
    ev.y = y;
    ev.size = Math.max(24, Math.min(260, size || 30));
    ev.power = p;
}

function _piscesTrackPlayerMotion() {
    if (typeof player === 'undefined') return;
    if (Number.isFinite(_piscesPrevPlayerX)) {
        const dx = player.x - _piscesPrevPlayerX;
        const dy = player.y - _piscesPrevPlayerY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.4) {
            _piscesMoveDirX = dx / dist;
            _piscesMoveDirY = dy / dist;
        }
    }
    _piscesPrevPlayerX = player.x;
    _piscesPrevPlayerY = player.y;
}

function _drawPiscesAura() {
    _piscesTrackPlayerMotion();
    const now = performance.now();
    if (now >= window._cofAuraEnd || !_hasBuff('dong_chay_luan_hoi')) return;
    const remaining = window._cofAuraEnd - now;
    const fade = Math.min(1, (720 - remaining) / 140, remaining / 600);
    const smooth = fade * fade * (3 - 2 * fade);
    const low = _mobPerf || (window._gfxLevel || 0) >= 2;
    const sprite = _piscesSprites().mist;
    const size = Math.max(player.width, player.height) * 3.1;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = smooth * (low ? 0.36 : 0.26);
    if (!low) ctx.rotate(now / 12000);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    if (!low) {
        ctx.rotate(-now / 8500);
        ctx.globalAlpha = smooth * 0.16;
        ctx.drawImage(sprite, -size * 0.44, -size * 0.44, size * 0.88, size * 0.88);
    }
    ctx.restore();
}

function _drawPiscesCurrent() {
    _piscesTrackPlayerMotion();
    if (!_hasBuff('dong_chay_luan_hoi')) { _piscesBubblePoints = 0; return; }
    const flowMs = window._piscesFlowMs || 0;
    const progress = Math.min(1, flowMs / PISCES_FISH_COST_MS);
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2, sprites = _piscesSprites();
    const points = Math.min(24, Math.floor(flowMs / 1000));
    if (_piscesClock < _piscesBubbleClock || points < _piscesBubblePoints) {
        _piscesBubblePulseEnd.fill(0);
        if (_piscesClock < _piscesBubbleClock) _piscesBubblePoints = 0;
    }
    for (let i = _piscesBubblePoints; i < points; i++) _piscesBubblePulseEnd[i] = _piscesClock + 380;
    _piscesBubblePoints = points;
    _piscesBubbleClock = _piscesClock;

    const ready = points >= 12;
    const readyWave = ready ? Math.sin(_piscesClock / 420) : 0;
    const radius = 42 + progress * 22;
    const phase = _piscesClock / 9600;

    ctx.save();
    ctx.translate(player.x, player.y);
    if (!low) {
        const ringScale = 1 + readyWave * 0.025;
        ctx.globalAlpha = 0.28 + progress * 0.34;
        ctx.save();
        ctx.rotate(-phase * 0.6);
        ctx.drawImage(sprites.pointRingBase, -78 * ringScale, -78 * ringScale, 156 * ringScale, 156 * ringScale);
        ctx.restore();
    }
    if (progress > 0) {
        ctx.save();
        ctx.globalAlpha = 0.16 + progress * 0.42;
        if (!low) ctx.rotate(phase);
        ctx.drawImage(sprites.current, -radius * 1.32, -radius * 1.32, radius * 2.64, radius * 2.64);
        if (!low && progress > 0.2) {
            ctx.rotate(-phase * 1.7);
            ctx.globalAlpha = 0.10 + progress * 0.22;
            ctx.drawImage(sprites.current, -radius * 1.05, -radius * 1.05, radius * 2.1, radius * 2.1);
        }
        ctx.restore();
    }
    if (ready && !low) {
        const fishFrame = sprites.frames[Math.floor(_piscesClock / 140) % sprites.frames.length];
        ctx.save();
        ctx.rotate(phase * 1.2);
        ctx.globalAlpha = 0.22 + (readyWave + 1) * 0.08;
        ctx.drawImage(fishFrame, -26, -44, 52, 32);
        if (points >= 18) {
            ctx.rotate(Math.PI);
            ctx.globalAlpha = 0.20 * ((points - 12) / 12);
            ctx.drawImage(fishFrame, -26, -44, 52, 32);
        }
        ctx.restore();
        ctx.globalAlpha = 0.72 + (readyWave + 1) * 0.14;
        ctx.drawImage(sprites.alreschaKnot, -14, -58 - 14, 28, 28);
    }
    ctx.restore();

    const count = low ? 4 : 12, perBubble = low ? 3 : 1;
    const regular = Math.min(12, points), overflow = Math.max(0, points - 12);
    const ringRadius = 58 * (1 + readyWave * 0.02);
    let pulsefxDrawn = 0;
    const maxPulseFx = low ? 1 : 3;

    ctx.save();
    for (let i = 0; i < count; i++) {
        const filled = Math.max(0, Math.min(perBubble, regular - i * perBubble));
        const extra = Math.max(0, Math.min(perBubble, overflow - i * perBubble));
        let pulseEnd = 0;
        for (let j = 0; j < perBubble; j++) {
            pulseEnd = Math.max(pulseEnd, _piscesBubblePulseEnd[i * perBubble + j]);
            if (extra > j) pulseEnd = Math.max(pulseEnd, _piscesBubblePulseEnd[12 + i * perBubble + j]);
        }
        const activePulse = pulseEnd > _piscesClock;
        const pulseT = activePulse ? 1 - (pulseEnd - _piscesClock) / 380 : 0;
        const smoothBounce = activePulse ? 0.26 * Math.sin(Math.PI * pulseT) : 0;
        const size = (low ? 22 : 15) * (1 + smoothBounce + readyWave * 0.025);
        const angle = i * Math.PI * 2 / count - Math.PI / 2;
        const bx = player.x + Math.cos(angle) * ringRadius;
        const by = player.y + Math.sin(angle) * ringRadius;

        if (extra > 0) {
            ctx.globalAlpha = (0.72 + 0.26 * extra / perBubble) * (1 + readyWave * 0.04);
            ctx.drawImage(sprites.overflowBubble, bx - size / 2, by - size / 2, size, size);
        } else if (filled > 0) {
            ctx.globalAlpha = (0.45 + 0.50 * filled / perBubble) * (1 + readyWave * 0.04);
            ctx.drawImage(sprites.bubble, bx - size / 2, by - size / 2, size, size);
        } else {
            ctx.globalAlpha = low ? 0.42 : 0.36;
            ctx.drawImage(sprites.emptyBubble, bx - size / 2, by - size / 2, size, size);
        }

        if (activePulse && pulsefxDrawn < maxPulseFx) {
            pulsefxDrawn++;
            const ripSize = (low ? 26 : 30) * (0.45 + pulseT * 0.75);
            ctx.globalAlpha = 0.62 * (1 - pulseT);
            ctx.drawImage(sprites.ripple, bx - ripSize / 2, by - ripSize / 2, ripSize, ripSize);
            if (!low && i > 0) {
                const prevAngle = (i - 1) * Math.PI * 2 / count - Math.PI / 2;
                const px = player.x + Math.cos(prevAngle) * ringRadius;
                const py = player.y + Math.sin(prevAngle) * ringRadius;
                const mx = (bx + px) * 0.5, my = (by + py) * 0.5;
                const chordLen = Math.hypot(bx - px, by - py);
                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(Math.atan2(by - py, bx - px));
                ctx.globalAlpha = 0.75 * Math.sin(Math.PI * pulseT);
                ctx.drawImage(sprites.constellationChord, -chordLen * 0.55, -6, chordLen * 1.1, 12);
                ctx.restore();
            }
        }
    }
    ctx.restore();
}

function _piscesRecordFishNode(idx, fish) {
    const buf = _piscesFishTrail[idx];
    const count = _piscesFishTrailCount[idx];
    const head = _piscesFishTrailHead[idx];
    if (count === 0) {
        buf[0] = fish.x; buf[1] = fish.y; buf[2] = fish.angle;
        _piscesFishTrailHead[idx] = 0;
        _piscesFishTrailCount[idx] = 1;
        return;
    }
    const hx = buf[head * 3], hy = buf[head * 3 + 1];
    if (Math.hypot(fish.x - hx, fish.y - hy) >= 16) {
        const next = (head + 1) % 8;
        buf[next * 3] = fish.x;
        buf[next * 3 + 1] = fish.y;
        buf[next * 3 + 2] = fish.angle;
        _piscesFishTrailHead[idx] = next;
        if (count < 8) _piscesFishTrailCount[idx] = count + 1;
    }
}

// Screen light behind the fish layer: the Pisces constellation fades into the
// sky while a fish swims, brighter with two, and moonlight falls on each fish
// as it forms.
function _drawPiscesSkyLight(sprites, gfx, low) {
    const now = performance.now();
    const dt = Math.max(0, Math.min(100, now - _piscesSkyLastAt));
    _piscesSkyLastAt = now;
    const swimming = (_piscesFishPool[0].active ? 1 : 0) + (_piscesFishPool[1].active ? 1 : 0);
    const target = swimming === 2 ? 1 : swimming === 1 ? 0.6 : 0;
    const stepA = dt / 450;
    _piscesSkyAlpha = _piscesSkyAlpha < target ? Math.min(target, _piscesSkyAlpha + stepA) : Math.max(target, _piscesSkyAlpha - stepA);
    if (_piscesSkyAlpha > 0 && gfx < 3) {
        const w = Math.min(canvas.width * 0.72, 760), h = w * (320 / 512);
        const ease = _piscesSkyAlpha * _piscesSkyAlpha * (3 - 2 * _piscesSkyAlpha);
        ctx.globalAlpha = ease * (0.20 + 0.04 * Math.sin(now / 1400));
        ctx.drawImage(sprites.skyPisces, canvas.width / 2 - w / 2, canvas.height * 0.26 - h / 2, w, h);
    }
    if (low) return;
    for (let i = 0; i < _piscesFishPool.length; i++) {
        const fish = _piscesFishPool[i];
        if (!fish.active || fish.age >= PISCES_FISH_FORM_MS + 260) continue;
        const t = fish.age / (PISCES_FISH_FORM_MS + 260);
        const beamH = Math.max(80, fish.y + 30);
        const beamW = 70 + 40 * Math.sin(Math.PI * t);
        ctx.globalAlpha = 0.42 * Math.sin(Math.PI * t);
        ctx.drawImage(sprites.moonShaft, fish.x - beamW / 2, fish.y + 30 - beamH, beamW, beamH);
    }
}

// Dream Realm screen light: the edges sink into indigo and four Mucha corners
// frame the screen while the shield holds, fading in over 280ms and out over
// its last 400ms.
function _drawPiscesDreamFrame(sprites, now, low) {
    if (!_hasBuff('coi_mong')) return;
    const end = window._coiMongEndTime || 0;
    if (now >= end) return;
    const fade = Math.max(0, Math.min(1, (now - (end - 2500)) / 280, (end - now) / 400));
    if (fade <= 0) return;
    const W = canvas.width, H = canvas.height;
    ctx.globalAlpha = fade * (low ? 0.4 : 0.55);
    ctx.drawImage(sprites.dreamVignette, 0, 0, W, H);
    if (low) return;
    const s = Math.max(110, Math.min(260, Math.min(W, H) * 0.3)) * (0.92 + 0.08 * fade);
    ctx.globalAlpha = fade * 0.9;
    ctx.drawImage(sprites.dreamCorner, 0, 0, s, s);
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(sprites.dreamCorner, 0, 0, s, s); ctx.restore();
    ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(sprites.dreamCorner, 0, 0, s, s); ctx.restore();
    ctx.save(); ctx.translate(W, H); ctx.scale(-1, -1); ctx.drawImage(sprites.dreamCorner, 0, 0, s, s); ctx.restore();
}

// Fish summon screen light: as a fish forms, moonlight blooms across the screen
// from where it appears and a soft curtain hangs from the top edge, rising
// and settling over 650ms. Drawn additively, so it lifts the scene without a flash.
function _drawPiscesSummonLight(sprites, low) {
    if (!_hasBuff('dong_chay_luan_hoi')) return;
    const W = canvas.width, H = canvas.height;
    for (let i = 0; i < _piscesFishPool.length; i++) {
        const fish = _piscesFishPool[i];
        if (!fish.active || fish.age >= 650) continue;
        const t = fish.age / 650;
        const bell = Math.sin(Math.PI * Math.min(1, t * 1.35)) * (1 - t * 0.35);
        if (bell <= 0) continue;
        ctx.globalCompositeOperation = 'lighter';
        const size = Math.max(W, H) * (1.1 + t * 0.5);
        ctx.globalAlpha = bell * (low ? 0.30 : 0.48);
        ctx.drawImage(sprites.summonLight, fish.x - size / 2, fish.y - size / 2, size, size);
        if (!low) {
            ctx.globalAlpha = bell * 0.42;
            ctx.drawImage(sprites.lightCurtain, 0, 0, W, H * 0.62);
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}

function _drawPiscesFish() {
    if (!_hasBuff('dong_chay_luan_hoi')) return;
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2;
    const sprites = _piscesSprites();
    ctx.save();
    _drawPiscesSkyLight(sprites, gfx, low);

    for (let fIdx = 0; fIdx < _piscesFishPool.length; fIdx++) {
        const fish = _piscesFishPool[fIdx];
        if (!fish.active) {
            _piscesFishTrailCount[fIdx] = 0;
            continue;
        }
        _piscesFishLastX[fIdx] = fish.x;
        _piscesFishLastY[fIdx] = fish.y;
        _piscesFishLastAngle[fIdx] = fish.angle;

        const forming = Math.min(1, fish.age / PISCES_FISH_FORM_MS);
        const fade = Math.min(1, (PISCES_FISH_FORM_MS + PISCES_FISH_LIFE_MS - fish.age) / 340);
        const smoothFade = fade * fade * (3 - 2 * fade);
        const frameCount = sprites.frames.length;
        const frame = gfx >= 3 ? 0 : Math.floor(fish.age / 85) % frameCount;

        if (forming < 1) {
            const ease = forming * forming * (3 - 2 * forming);
            const nimbusSize = (low ? 64 : 88) * (0.45 + ease * 0.55);
            ctx.save();
            ctx.translate(fish.x, fish.y);
            ctx.rotate(_piscesClock / 9500);
            ctx.globalAlpha = 0.52 * Math.sin(Math.PI * forming);
            ctx.drawImage(sprites.fishNimbus, -nimbusSize / 2, -nimbusSize / 2, nimbusSize, nimbusSize);
            ctx.restore();

            const starCount = low ? 2 : gfx === 1 ? 4 : 6;
            for (let i = 0; i < starCount; i++) {
                const a = i * 2.39996 + ease * 1.3;
                const r = (18 + (i % 4) * 9) * (1 - ease);
                const s = 10 + (i % 3) * 3;
                ctx.globalAlpha = 0.72 * Math.sin(Math.PI * (0.1 + forming * 0.85));
                ctx.drawImage(sprites.starNode, fish.x + Math.cos(a) * r - s / 2, fish.y + Math.sin(a) * r - s / 2, s, s);
            }

            ctx.save();
            ctx.translate(fish.x, fish.y);
            ctx.rotate(fish.angle);
            ctx.globalAlpha = 0.85 * Math.sin(Math.PI * Math.min(1, forming * 1.2));
            ctx.drawImage(sprites.fishConstellation, -40, -24, 76, 48);
            if (forming > 0.25) {
                ctx.globalAlpha = ((forming - 0.25) / 0.75) * 0.9 * smoothFade;
                ctx.drawImage(sprites.frames[frame], -40, -24, 76, 48);
            }
            ctx.restore();
            continue;
        }

        _piscesRecordFishNode(fIdx, fish);
        const trailBuf = _piscesFishTrail[fIdx];
        const trailCount = _piscesFishTrailCount[fIdx];
        const trailHead = _piscesFishTrailHead[fIdx];
        const maxTail = low ? 1 : gfx === 1 ? 3 : 4;

        for (let i = maxTail; i >= 1; i--) {
            let tx, ty, ta;
            if (i < trailCount) {
                const slot = (trailHead - i + 8) % 8;
                tx = trailBuf[slot * 3];
                ty = trailBuf[slot * 3 + 1];
                ta = trailBuf[slot * 3 + 2];
            } else {
                const dist = i * 24;
                tx = fish.x - Math.cos(fish.angle) * dist;
                ty = fish.y - Math.sin(fish.angle) * dist;
                ta = fish.angle;
            }
            const tFrac = 1 - i / (maxTail + 1);
            const sway = Math.sin(fish.age / 130 - i * 0.7) * (3.5 + i * 1.3);
            const nx = -Math.sin(ta) * sway, ny = Math.cos(ta) * sway;
            ctx.save();
            ctx.translate(tx + nx, ty + ny);
            ctx.rotate(ta);
            ctx.globalAlpha = smoothFade * (low ? 0.28 : 0.36) * tFrac;
            const w = 62 + i * 8, h = 28 + i * 3;
            ctx.drawImage(sprites.tailRibbon, -w * 0.7, -h / 2, w, h);
            ctx.restore();

            if (!low) {
                const starSize = 9 + (i % 3) * 3;
                ctx.globalAlpha = smoothFade * 0.36 * tFrac;
                ctx.drawImage(sprites.starNode, tx - nx * 0.8 - starSize / 2, ty - ny * 0.8 - starSize / 2, starSize, starSize);
            }
        }

        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);

        if (!low) {
            ctx.globalAlpha = smoothFade * 0.34;
            ctx.drawImage(sprites.fishWake, -138, -36, 152, 72);
        }

        ctx.save();
        ctx.translate(-10, 0);
        ctx.rotate(_piscesClock / 9200);
        ctx.globalAlpha = smoothFade * (low ? 0.24 : 0.32);
        ctx.drawImage(sprites.fishNimbus, -38, -38, 76, 76);
        ctx.restore();

        const reacting = !_mobPerf && gfx < 2 && fish.hitMs > 0;
        if (reacting) {
            const pulse = Math.sin(Math.PI * (1 - fish.hitMs / 140));
            ctx.scale(1 + pulse * 0.06, 1 + pulse * 0.08);
        }

        ctx.globalAlpha = 0.94 * smoothFade;
        ctx.drawImage(sprites.frames[frame], -40, -24, 76, 48);

        if (!low) {
            ctx.globalAlpha = (0.24 + 0.10 * Math.sin(fish.age / 180)) * smoothFade;
            ctx.drawImage(sprites.fishConstellation, -40, -24, 76, 48);
        }

        if (reacting) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.58 * (fish.hitMs / 140) * smoothFade;
            ctx.drawImage(sprites.brightFrames[frame], -40, -24, 76, 48);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
    }

    if (_piscesFishPool[0].active && _piscesFishPool[1].active) {
        const f0 = _piscesFishPool[0], f1 = _piscesFishPool[1];
        const fade0 = Math.min(1, (PISCES_FISH_FORM_MS + PISCES_FISH_LIFE_MS - f0.age) / 340);
        const fade1 = Math.min(1, (PISCES_FISH_FORM_MS + PISCES_FISH_LIFE_MS - f1.age) / 340);
        const cordFade = Math.min(fade0, fade1);
        const mx = (f0.x + f1.x) * 0.5, my = (f0.y + f1.y) * 0.5;
        const dx = f1.x - f0.x, dy = f1.y - f0.y;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        if (dist > 8 && dist < 900) {
            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(angle);
            ctx.globalAlpha = 0.58 * cordFade;
            ctx.drawImage(sprites.constellationChord, -dist * 0.5, -10, dist, 20);
            ctx.restore();
            if (!low) {
                ctx.globalAlpha = 0.88 * cordFade;
                ctx.drawImage(sprites.alreschaKnot, mx - 16, my - 16, 32, 32);
            }
        }
    }

    for (let i = 0; i < _piscesFxPool.length; i++) {
        const fx = _piscesFxPool[i];
        if (fx.life <= 0 || fx.kind === 1 || fx.kind === 3) continue;
        const t = fx.age / fx.life;
        const easeOut = 1 - (1 - t) * (1 - t);
        if (fx.kind === 0) {
            const d0 = 28 + easeOut * 54;
            ctx.globalAlpha = 0.52 * (1 - t);
            ctx.drawImage(sprites.ripple, fx.x - d0 / 2, fx.y - d0 / 2, d0, d0);
            if (!low) {
                const d1 = 18 + easeOut * 36;
                ctx.globalAlpha = 0.36 * (1 - t);
                ctx.drawImage(sprites.fishNimbus, fx.x - d1 / 2, fx.y - d1 / 2, d1, d1);
            }
        } else if (fx.kind === 2) {
            let bestAngle = fx.angle;
            const d0 = Math.hypot(fx.x - _piscesFishLastX[0], fx.y - _piscesFishLastY[0]);
            const d1 = Math.hypot(fx.x - _piscesFishLastX[1], fx.y - _piscesFishLastY[1]);
            bestAngle = d0 <= d1 ? _piscesFishLastAngle[0] : _piscesFishLastAngle[1];
            const dRip = 30 + easeOut * 58;
            ctx.globalAlpha = 0.58 * (1 - t);
            ctx.drawImage(sprites.ripple, fx.x - dRip / 2, fx.y - dRip / 2, dRip, dRip);
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(bestAngle);
            ctx.globalAlpha = 0.72 * (1 - easeOut);
            ctx.drawImage(sprites.fishConstellation, -38, -23, 72, 46);
            ctx.restore();
            const starCount = low ? 1 : gfx === 1 ? 3 : 5;
            for (let s = 0; s < starCount; s++) {
                const a = bestAngle + (s - 2) * 0.95;
                const r = (8 + (s % 3) * 8) * easeOut;
                const sz = 10 + (s % 2) * 3;
                ctx.globalAlpha = 0.68 * (1 - t);
                ctx.drawImage(sprites.starNode, fx.x + Math.cos(a) * r - sz / 2, fx.y + Math.sin(a) * r - sz / 2, sz, sz);
            }
        }
    }
    ctx.restore();
}

function _drawPiscesImpacts() {
    if (!_hasBuff('dong_chay_luan_hoi')) return;
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2;
    const sprites = _piscesSprites();
    ctx.save();

    for (let i = 0; i < _piscesFxPool.length; i++) {
        const fx = _piscesFxPool[i];
        if (fx.life <= 0 || (fx.kind !== 1 && fx.kind !== 3)) continue;
        const t = fx.age / fx.life;
        const easeOut = 1 - (1 - t) * (1 - t);
        const blocked = fx.kind === 3;
        const size = fx.size * (blocked ? 0.72 : 1.0);

        if (blocked) {
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.angle);
            const bSize = size * (0.75 + easeOut * 0.65);
            ctx.globalAlpha = 0.85 * (1 - t);
            ctx.drawImage(sprites.barrierRipple, -bSize * 0.55, -bSize * 0.55, bSize * 1.1, bSize * 1.1);
            ctx.save();
            ctx.scale(0.38, 1.12);
            const rSize = size * (0.5 + easeOut * 0.75);
            ctx.globalAlpha = 0.65 * (1 - t);
            ctx.drawImage(sprites.ripple, -rSize / 2, -rSize / 2, rSize, rSize);
            ctx.restore();
            const shardCount = low ? 1 : gfx === 1 ? 3 : 4;
            for (let j = 0; j < shardCount; j++) {
                const spread = Math.PI + (j - (shardCount - 1) * 0.5) * 0.55;
                const dist = (10 + size * 0.35) * easeOut;
                const len = (14 + size * 0.12) * (1 - t * 0.4);
                ctx.save();
                ctx.translate(Math.cos(spread) * dist, Math.sin(spread) * dist);
                ctx.rotate(spread);
                ctx.globalAlpha = 0.72 * (1 - t);
                ctx.drawImage(sprites.droplet, -len * 0.5, -len * 0.22, len, len * 0.44);
                ctx.restore();
            }
            ctx.restore();
            continue;
        }

        if (!low && fx.enemy && fx.age < 90) {
            const glowSize = size * 1.65;
            ctx.globalAlpha = 0.72 * (1 - fx.age / 90);
            ctx.drawImage(sprites.impactGlow, fx.enemy.x - glowSize / 2, fx.enemy.y - glowSize / 2, glowSize, glowSize);
        }
        const dOuter = size * (0.42 + easeOut * 1.18);
        ctx.globalAlpha = 0.78 * (1 - t);
        ctx.drawImage(sprites.ripple, fx.x - dOuter / 2, fx.y - dOuter / 2, dOuter, dOuter);

        if (!low && t > 0.08) {
            const dInner = size * (0.24 + easeOut * 0.78);
            ctx.globalAlpha = 0.52 * (1 - t);
            ctx.drawImage(sprites.ripple, fx.x - dInner / 2, fx.y - dInner / 2, dInner, dInner);
        }

        ctx.save();
        ctx.translate(fx.x, fx.y);
        ctx.rotate(fx.angle);
        const crownSize = size * (0.55 + easeOut * 0.85);
        ctx.globalAlpha = 0.76 * (1 - t);
        ctx.drawImage(sprites.splashCrown, -crownSize / 2, -crownSize / 2, crownSize, crownSize);

        const starCount = low ? 1 : gfx === 1 ? 2 : 4;
        for (let j = 0; j < starCount; j++) {
            const spread = (j - (starCount - 1) * 0.5) * 0.65;
            const dist = (8 + size * 0.36) * easeOut;
            const sSize = (10 + (j % 2) * 3) * (1 - t * 0.35);
            ctx.globalAlpha = 0.72 * (1 - t);
            ctx.drawImage(sprites.starNode, Math.cos(spread) * dist - sSize / 2, Math.sin(spread) * dist - sSize / 2, sSize, sSize);
        }
        ctx.restore();
    }
    ctx.restore();
}

function _drawPiscesDreamShield() {
    if (typeof _hasBuff === 'undefined' || !_hasBuff('coi_mong')) return;
    const now = performance.now();
    const endTime = window._coiMongEndTime || 0;
    const cdEnd = window._coiMongCooldownEnd || 0;

    if (endTime > _piscesLastCoiMongEnd + 50) {
        _piscesCoiMongBurstAt = now;
    }
    _piscesLastCoiMongEnd = endTime;

    if (cdEnd > _piscesLastCoiMongCd + 50) {
        _piscesLastCoiMongCd = cdEnd;
    }
    if (_piscesLastCoiMongCd > 0 && now >= _piscesLastCoiMongCd && _piscesCoiMongReadyAt < _piscesLastCoiMongCd) {
        _piscesCoiMongReadyAt = now;
    }

    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2;
    const sprites = _piscesSprites();

    if (now - _piscesCoiMongReadyAt >= 0 && now - _piscesCoiMongReadyAt < 650) {
        const rt = (now - _piscesCoiMongReadyAt) / 650;
        const rEase = 1 - (1 - rt) * (1 - rt);
        const rDiam = 48 + rEase * 56;
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.globalAlpha = 0.62 * (1 - rt);
        ctx.drawImage(sprites.ripple, -rDiam / 2, -rDiam / 2, rDiam, rDiam);
        if (!low) {
            const orbitA = rEase * Math.PI * 1.4;
            const orbitR = 32 + rEase * 12;
            ctx.globalAlpha = 0.82 * Math.sin(Math.PI * rt);
            ctx.drawImage(sprites.starNode, Math.cos(orbitA) * orbitR - 8, Math.sin(orbitA) * orbitR - 8, 16, 16);
            ctx.drawImage(sprites.starNode, -Math.cos(orbitA) * orbitR - 8, -Math.sin(orbitA) * orbitR - 8, 16, 16);
        }
        ctx.restore();
    }

    if (now >= endTime) return;

    const rem = endTime - now;
    const frac = Math.max(0, Math.min(1, rem / 2500));
    const fade = Math.min(1, rem / 350);
    const smoothFade = fade * fade * (3 - 2 * fade);
    const slowRot = now / 9500;

    ctx.save();
    ctx.translate(player.x, player.y);

    const burstElapsed = now - _piscesCoiMongBurstAt;
    if (burstElapsed >= 0 && burstElapsed < 700) {
        const bt = burstElapsed / 700;
        const bEase = 1 - (1 - bt) * (1 - bt);
        const bRip = 76 + bEase * 124;
        ctx.globalAlpha = 0.65 * (1 - bt);
        ctx.drawImage(sprites.ripple, -bRip / 2, -bRip / 2, bRip, bRip);

        const bNim = 64 + bEase * 84;
        ctx.save();
        ctx.rotate(-slowRot * 1.5);
        ctx.globalAlpha = 0.54 * (1 - bt);
        ctx.drawImage(sprites.shieldNimbus, -bNim / 2, -bNim / 2, bNim, bNim);
        ctx.restore();

        if (!low) {
            const fishOrbR = 78 - bEase * 32;
            const fishOrbA = bEase * Math.PI * 1.65;
            const fSprite = sprites.frames[Math.floor(burstElapsed / 85) % sprites.frames.length];
            for (let k = 0; k < 2; k++) {
                const ka = fishOrbA + k * Math.PI;
                ctx.save();
                ctx.translate(Math.cos(ka) * fishOrbR, Math.sin(ka) * fishOrbR);
                ctx.rotate(ka + Math.PI / 2);
                ctx.globalAlpha = 0.78 * Math.sin(Math.PI * bt);
                ctx.drawImage(fSprite, -26, -16, 52, 32);
                ctx.restore();
            }
        }
    }

    const shieldRadius = 56;
    const shieldDiam = shieldRadius * 2;

    if (!low) {
        ctx.save();
        ctx.rotate(-slowRot * 0.85);
        ctx.globalAlpha = 0.68 * smoothFade;
        ctx.drawImage(sprites.shieldInner, -shieldRadius, -shieldRadius, shieldDiam, shieldDiam);
        ctx.restore();
    }

    ctx.save();
    ctx.rotate(slowRot);
    ctx.globalAlpha = 0.88 * smoothFade;
    ctx.drawImage(sprites.shieldNimbus, -shieldRadius, -shieldRadius, shieldDiam, shieldDiam);

    if (low) {
        ctx.rotate(-slowRot);
        ctx.globalAlpha = 0.85 * frac * smoothFade;
        ctx.drawImage(sprites.shieldArc, -shieldRadius, -shieldRadius, shieldDiam, shieldDiam);
    } else if (rem > 350) {
        for (let q = 0; q < 4; q++) {
            const qFrac = Math.max(0, Math.min(1, (frac - q * 0.25) * 4));
            if (qFrac <= 0.01) continue;
            ctx.save();
            ctx.rotate(q * Math.PI / 2);
            ctx.globalAlpha = 0.88 * qFrac * smoothFade;
            ctx.drawImage(sprites.shieldArc, -shieldRadius, -shieldRadius, shieldDiam, shieldDiam);
            ctx.restore();
        }
    } else {
        const dissolveT = 1 - rem / 350;
        for (let s = 0; s < 4; s++) {
            const sa = s * Math.PI / 2 + dissolveT * 0.5;
            const sr = 46 + dissolveT * 14;
            ctx.globalAlpha = 0.85 * (1 - dissolveT);
            ctx.drawImage(sprites.starNode, Math.cos(sa) * sr - 10, Math.sin(sa) * sr - 10, 20, 20);
        }
    }
    ctx.restore();
    ctx.restore();
}

function _drawPiscesDreamMark(enemy) {
    if (!enemy || !enemy._yogMark) return;
    const now = performance.now();
    const elapsed = Math.max(0, now - (enemy._yogMarkStart || now));
    const progress = Math.min(1, elapsed / 1650);
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2;
    const sprites = _piscesSprites();

    const ringR = Math.max(22, Math.min(148, (enemy.size || 30) * 0.52 + 12));
    const baseR = ringR * 1.28;
    const intro = elapsed < 320 ? 1 - elapsed / 320 : 0;
    const introEase = intro * intro;
    const stageIdx = Math.min(7, Math.floor(progress * 8));
    const slowRot = now / 9000 + (enemy.size || 30) * 0.05;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const rMain = baseR * (1 + introEase * 0.28);
    ctx.save();
    ctx.rotate(slowRot);
    ctx.globalAlpha = 0.88 * (1 - introEase * 0.25);
    ctx.drawImage(sprites.markStages[stageIdx], -rMain, -rMain, rMain * 2, rMain * 2);
    ctx.restore();

    if (!low) {
        ctx.save();
        ctx.rotate(-slowRot * 1.2);
        if (elapsed < 320) {
            const rBloom = baseR * (0.65 + (1 - introEase) * 0.55);
            ctx.globalAlpha = 0.78 * Math.sin(Math.PI * (elapsed / 320));
            ctx.drawImage(sprites.markBloom, -rBloom, -rBloom, rBloom * 2, rBloom * 2);
        } else {
            const pulse = progress > 0.75 ? 0.10 * Math.sin(now / 90) : 0;
            const rInner = baseR * (0.86 + pulse);
            ctx.globalAlpha = 0.52 + progress * 0.36;
            ctx.drawImage(sprites.markBloom, -rInner, -rInner, rInner * 2, rInner * 2);
        }
        ctx.restore();
    }

    ctx.restore();
}

// A fish stun: the nimbus crown floats over the enemy with two fish chasing
// round its rim, and a still water ring holds the body. Fades in over the
// first 140ms of the hold and out over its last 200ms.
function _drawPiscesStun(enemy) {
    const left = enemy._piscesStunMs || 0;
    if (left <= 0) return;
    const held = PISCES_FISH_STUN_MS - left;
    const intro = Math.max(0, Math.min(1, held / 140));
    const fade = Math.min(intro, left / 200);
    if (fade <= 0) return;
    const sprites = _piscesSprites();
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2;
    const now = performance.now();
    const size = enemy.size || 30;
    const w = Math.max(56, Math.min(170, size * 1.2));
    const h = w * (64 / 144);
    const pop = 1 + (1 - intro) * 0.25;
    const hx = enemy.x;
    const hy = enemy.y - size * 0.6 - h * 0.4 - 8 + Math.sin(now / 320) * 1.5;

    ctx.save();
    if (!low) {
        const bw = Math.max(64, Math.min(320, size * 1.45)), bh = bw * (60 / 176);
        ctx.globalAlpha = 0.6 * fade;
        ctx.drawImage(sprites.stunBind, enemy.x - bw / 2, enemy.y - bh / 2, bw, bh);
    }
    ctx.globalAlpha = 0.92 * fade;
    ctx.drawImage(sprites.stunHalo, hx - w * pop / 2, hy - h * pop / 2, w * pop, h * pop);
    if (!low) {
        const orbit = now / 1600 * Math.PI * 2;
        const rx = w * 0.46, ry = h * 0.36;
        const fw = Math.max(16, w * 0.3), fh = fw * 0.62;
        for (let k = 0; k < 2; k++) {
            const a = orbit + k * Math.PI;
            ctx.save();
            ctx.translate(hx + Math.cos(a) * rx, hy + Math.sin(a) * ry);
            ctx.rotate(Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx));
            // The lower half of the rim is nearer the viewer, so that fish reads brighter.
            ctx.globalAlpha = (Math.sin(a) > 0 ? 0.95 : 0.55) * fade;
            ctx.drawImage(sprites.frames[(Math.floor(now / 110) + k * 2) % sprites.frames.length], -fw / 2, -fh / 2, fw, fh);
            ctx.restore();
        }
    }
    ctx.restore();
}

function _drawPiscesEvents() {
    const now = performance.now();
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2;
    const sprites = _piscesSprites();
    ctx.save();
    _drawPiscesDreamFrame(sprites, now, low);
    _drawPiscesSummonLight(sprites, low);

    for (let i = 0; i < _piscesRefundPool.length; i++) {
        const ev = _piscesRefundPool[i];
        if (!ev.active) continue;
        const age = now - ev.born;
        if (age >= ev.life || age < 0) { ev.active = false; continue; }
        const t = age / ev.life;
        const ease = t * t * (3 - 2 * t);
        const px = typeof player !== 'undefined' ? player.x : ev.x;
        const py = typeof player !== 'undefined' ? player.y : ev.y;

        if (ev.isKill) {
            const dx = px - ev.x, dy = py - ev.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const nx = -dy / dist, ny = dx / dist;
            const sign = ev.seed % 2 === 0 ? 1 : -1;
            const arch = Math.sin(Math.PI * ease) * sign * Math.min(54, dist * 0.18);
            const curX = ev.x + dx * ease + nx * arch;
            const curY = ev.y + dy * ease + ny * arch;
            const ang = Math.atan2(dy + ny * Math.cos(Math.PI * ease) * sign * 40, dx + nx * Math.cos(Math.PI * ease) * sign * 40);
            const streamLen = Math.max(44, Math.min(136, dist * 0.42)) * ev.scale;
            ctx.save();
            ctx.translate(curX, curY);
            ctx.rotate(ang);
            ctx.globalAlpha = 0.42 * Math.sin(Math.PI * t);
            ctx.drawImage(sprites.whiplashStream, -streamLen * 0.65, -14 * ev.scale, streamLen, 28 * ev.scale);
            ctx.restore();

            if (!low) {
                const sSize = 13 * ev.scale;
                ctx.globalAlpha = 0.74 * Math.sin(Math.PI * t);
                ctx.drawImage(sprites.starNode, curX - sSize / 2, curY - sSize / 2, sSize, sSize);
                const t2 = Math.max(0, ease - 0.16);
                const arch2 = Math.sin(Math.PI * t2) * sign * Math.min(54, dist * 0.18);
                const trailX = ev.x + dx * t2 + nx * arch2;
                const trailY = ev.y + dy * t2 + ny * arch2;
                ctx.globalAlpha = 0.48 * (1 - t);
                ctx.drawImage(sprites.starNode, trailX - sSize * 0.4, trailY - sSize * 0.4, sSize * 0.8, sSize * 0.8);
            }

            if (t > 0.35) {
                const rt = (t - 0.35) / 0.65;
                const rDiam = (54 + rt * 58) * ev.scale;
                ctx.globalAlpha = 0.52 * (1 - rt);
                ctx.drawImage(sprites.ripple, px - rDiam / 2, py - rDiam / 2, rDiam, rDiam);
            }
        } else {
            const wakeX = px - ev.dirX * (22 + ease * 36);
            const wakeY = py - ev.dirY * (22 + ease * 36);
            const wakeAng = Math.atan2(ev.dirY, ev.dirX);
            ctx.save();
            ctx.translate(wakeX, wakeY);
            ctx.rotate(wakeAng);
            ctx.globalAlpha = 0.48 * (1 - t);
            ctx.drawImage(sprites.fishWake, -52 * ev.scale, -24 * ev.scale, 104 * ev.scale, 48 * ev.scale);
            ctx.restore();

            const rDiam = 52 + ease * 46;
            ctx.globalAlpha = 0.46 * (1 - t);
            ctx.drawImage(sprites.ripple, px - rDiam / 2, py - rDiam / 2, rDiam, rDiam);
            if (!low) {
                ctx.globalAlpha = 0.34 * Math.sin(Math.PI * t);
                ctx.drawImage(sprites.mist, px - 48, py - 48, 96, 96);
            }
        }
    }

    if (typeof player !== 'undefined') {
        for (let i = 0; i < _piscesCastPool.length; i++) {
            const ev = _piscesCastPool[i];
            if (!ev.active) continue;
            const age = now - ev.born;
            if (age >= ev.life || age < 0) { ev.active = false; continue; }
            const t = age / ev.life;
            const easeOut = 1 - (1 - t) * (1 - t);

            ctx.save();
            ctx.translate(player.x, player.y);
            const nimSize = 68 + easeOut * (ev.kind === 2 ? 78 : 58);
            ctx.save();
            ctx.rotate((ev.kind === 0 ? -1 : 1) * (now / 8500 + easeOut * 0.4));
            ctx.globalAlpha = 0.72 * (1 - t);
            ctx.drawImage(ev.kind === 2 ? sprites.shieldNimbus : sprites.fishNimbus, -nimSize / 2, -nimSize / 2, nimSize, nimSize);
            ctx.restore();

            const ripSize = 54 + easeOut * 92;
            ctx.globalAlpha = 0.68 * (1 - t);
            ctx.drawImage(sprites.ripple, -ripSize / 2, -ripSize / 2, ripSize, ripSize);

            if (!low) {
                const swirlSize = (1 - easeOut * 0.55) * 116;
                ctx.save();
                ctx.rotate(ev.kind * 1.1 + easeOut * 1.2);
                ctx.globalAlpha = 0.65 * Math.sin(Math.PI * t);
                ctx.drawImage(sprites.current, -swirlSize / 2, -swirlSize / 2, swirlSize, swirlSize);
                ctx.restore();
                if (ev.kind === 2) {
                    ctx.globalAlpha = 0.85 * (1 - t);
                    ctx.drawImage(sprites.alreschaKnot, -18, -42 - easeOut * 16, 36, 36);
                } else {
                    const sOrb = 34 * (1 - easeOut * 0.5);
                    ctx.globalAlpha = 0.82 * (1 - t);
                    ctx.drawImage(sprites.starNode, Math.cos(easeOut * 3) * sOrb - 9, Math.sin(easeOut * 3) * sOrb - 9, 18, 18);
                }
            }
            ctx.restore();
        }

        for (let i = 0; i < _piscesBoostPool.length; i++) {
            const ev = _piscesBoostPool[i];
            if (!ev.active) continue;
            const age = now - ev.born;
            if (age >= ev.life || age < 0) { ev.active = false; continue; }
            const t = age / ev.life;
            const ease = t * t * (3 - 2 * t);
            const side = ev.kind === 0 ? -1 : 1;
            const dropX = player.x + side * (34 * (1 - ease));
            const dropY = player.y - 38 * (1 - ease);
            ctx.globalAlpha = 0.78 * Math.sin(Math.PI * t);
            ctx.drawImage(ev.kind === 0 ? sprites.starNode : sprites.overflowBubble, dropX - 8, dropY - 8, 16, 16);
            if (!low && t > 0.35) {
                const rt = (t - 0.35) / 0.65;
                const rSize = 26 + rt * 38;
                ctx.globalAlpha = 0.42 * (1 - rt);
                ctx.drawImage(sprites.ripple, player.x - rSize / 2, player.y - rSize / 2, rSize, rSize);
            }
        }

        for (let i = 0; i < _piscesBlockPool.length; i++) {
            const ev = _piscesBlockPool[i];
            if (!ev.active) continue;
            const age = now - ev.born;
            if (age >= ev.life || age < 0) { ev.active = false; continue; }
            const t = age / ev.life;
            const easeOut = 1 - (1 - t) * (1 - t);
            const bx = player.x + Math.cos(ev.angle) * 54;
            const by = player.y + Math.sin(ev.angle) * 54;
            const rDiam = 22 + easeOut * 44;
            ctx.globalAlpha = 0.82 * (1 - t);
            ctx.drawImage(sprites.ripple, bx - rDiam / 2, by - rDiam / 2, rDiam, rDiam);

            if (!low) {
                ctx.save();
                ctx.translate(player.x, player.y);
                ctx.rotate(ev.angle + Math.PI / 4);
                ctx.globalAlpha = 0.75 * (1 - t);
                ctx.drawImage(sprites.shieldArc, -56, -56, 112, 112);
                ctx.restore();
                ctx.globalAlpha = 0.85 * (1 - t);
                ctx.drawImage(sprites.starNode, bx - 9, by - 9, 18, 18);
            }
        }
    }

    let activeBursts = 0;
    for (let i = 0; i < _piscesBurstPool.length; i++) {
        const b = _piscesBurstPool[i];
        if (b.active && now - b.born >= 0 && now - b.born < b.life) activeBursts++;
    }
    const crowdBurst = activeBursts > 5;

    for (let i = 0; i < _piscesBurstPool.length; i++) {
        const ev = _piscesBurstPool[i];
        if (!ev.active) continue;
        const age = now - ev.born;
        if (age >= ev.life || age < 0) { ev.active = false; continue; }
        const t = age / ev.life;
        const easeOut = 1 - (1 - t) * (1 - t);

        if (ev.power <= 0) {
            const quietD = Math.max(28, Math.min(110, ev.size * 0.9)) * (0.45 + easeOut * 0.65);
            ctx.globalAlpha = 0.46 * (1 - t);
            ctx.drawImage(sprites.ripple, ev.x - quietD / 2, ev.y - quietD / 2, quietD, quietD);
            continue;
        }

        const baseRadius = Math.max(30, Math.min(165, ev.size * 0.72 + 18)) * (0.68 + 0.48 * ev.power);
        const haloDiam = baseRadius * 2 * (0.48 + easeOut * 0.82);

        ctx.save();
        ctx.translate(ev.x, ev.y);
        ctx.save();
        ctx.rotate(ev.seed * 0.7 + easeOut * 0.35);
        ctx.globalAlpha = 0.86 * (1 - t);
        ctx.drawImage(sprites.burstHalo, -haloDiam / 2, -haloDiam / 2, haloDiam, haloDiam);
        ctx.restore();

        if (!low) {
            const ripOuter = baseRadius * 2.2 * (0.4 + easeOut * 0.95);
            ctx.globalAlpha = 0.74 * (1 - t);
            ctx.drawImage(sprites.ripple, -ripOuter / 2, -ripOuter / 2, ripOuter, ripOuter);

            const nimInner = baseRadius * 1.45 * (0.55 + easeOut * 0.55);
            ctx.save();
            ctx.rotate(-easeOut * 0.45);
            ctx.globalAlpha = 0.58 * (1 - t);
            ctx.drawImage(sprites.markBloom, -nimInner / 2, -nimInner / 2, nimInner, nimInner);
            ctx.restore();

            const starCount = crowdBurst ? 2 : 4;
            for (let s = 0; s < starCount; s++) {
                const sa = ev.seed + s * Math.PI * 2 / starCount + easeOut * 0.4;
                const sr = baseRadius * (0.35 + easeOut * 0.85);
                const sz = (12 + (s % 2) * 4) * (1 - t * 0.3);
                ctx.globalAlpha = 0.82 * (1 - t);
                ctx.drawImage(s === 0 && ev.power > 0.6 ? sprites.alreschaKnot : sprites.starNode, Math.cos(sa) * sr - sz / 2, Math.sin(sa) * sr - sz / 2, sz, sz);
            }
        } else if (!crowdBurst || i % 2 === 0) {
            const ripLow = baseRadius * 2.0 * (0.45 + easeOut * 0.85);
            ctx.globalAlpha = 0.58 * (1 - t);
            ctx.drawImage(sprites.ripple, -ripLow / 2, -ripLow / 2, ripLow, ripLow);
        }
        ctx.restore();
    }

    ctx.restore();
}
