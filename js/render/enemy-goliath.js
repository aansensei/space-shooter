// render/enemy-goliath.js — Goliath (Information Lifeform), Dominator-tier
// prototype boss for the future Administrator class. Visuals ported directly
// from the approved test-goliath.html prototype (faceted-crystal body, 3 gem
// slots + tracking eye, 2 boulder arms hanging from shoulder chunks), adapted
// to real enemy objects (enemy.x/enemy.y/enemy.size) and performance.now().

const GOLIATH_GEM_COLORS = [
    { name: 'Veilshroud', dark: '#0b3b3a', mid: '#2dd4bf', light: '#e6fffb' },
    { name: 'Thaelis', dark: '#2d004d', mid: '#8b5cf6', light: '#e9ddff' },
    { name: 'Aegis Core', dark: '#7a5a00', mid: '#fbbf24', light: '#fff8e1' },
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
function _goliathGenerateVein(x1, y1, x2, y2, segments, jitter) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        if (i > 0 && i < segments) { x += (Math.random() - 0.5) * jitter; y += (Math.random() - 0.5) * jitter; }
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
function _drawGoliathFacetedCrystal(outline, core, lightAngle, colorDark, colorLight, outlineColor) {
    for (let i = 0; i < outline.length; i++) {
        const p1 = outline[i], p2 = outline[(i + 1) % outline.length];
        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
        let diff = Math.atan2(midY - core.y, midX - core.x) - lightAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const lightness = (Math.cos(diff) + 1) / 2;
        ctx.beginPath();
        ctx.moveTo(core.x, core.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.closePath();
        ctx.fillStyle = _goliathLerpColor(colorDark, colorLight, lightness * 0.85);
        ctx.fill();
        ctx.strokeStyle = outlineColor || 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    if (!_mobPerf) {
        for (let i = 0; i < outline.length; i++) {
            const p1 = outline[i], p2 = outline[(i + 1) % outline.length];
            const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
            let diff = Math.atan2(midY - core.y, midX - core.x) - lightAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const lightness = (Math.cos(diff) + 1) / 2;
            if (lightness > 0.6) {
                ctx.strokeStyle = `rgba(255,255,255,${(lightness - 0.6) * 1.6})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
        }
    }
}

function _drawGoliathVeins(veins, intensity) {
    for (const vein of veins) {
        ctx.beginPath();
        ctx.moveTo(vein[0].x, vein[0].y);
        for (let j = 1; j < vein.length; j++) ctx.lineTo(vein[j].x, vein[j].y);
        ctx.strokeStyle = 'rgba(20,8,0,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,158,11,${0.75 * intensity + 0.25})`;
        ctx.lineWidth = 1.4 + intensity * 2.2;
        if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8 + intensity * 22; }
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
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
function _drawGoliathBoulderChunk(cx, cy, r, seed) {
    ctx.save();
    ctx.translate(cx, cy);
    const rg = ctx.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r * 1.15);
    rg.addColorStop(0, '#555560'); rg.addColorStop(0.5, '#2c2c36'); rg.addColorStop(1, '#0a0a0a');
    const pts = 10;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const rr = r * (0.85 + 0.16 * Math.sin(a * 3.1 + seed) + 0.08 * Math.sin(a * 5.3 + seed * 1.7));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + seed;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(r * 0.4, 0, r * 0.22, r * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}
function _drawGoliathShoulderBoulder(jx, jy, alpha, seed) {
    if (alpha <= 0.02) return;
    // To hơn (85 -> 108) + bọc ngoài lớp ma thuật cam dính dính kiểu slime,
    // để thấy rõ kết nối phép thuật giữa vai và cánh tay thay vì đá tĩnh trơ.
    const R = 108;
    ctx.save(); ctx.globalAlpha = alpha;

    ctx.save(); ctx.translate(jx, jy);
    const goo = ctx.createRadialGradient(-R * 0.2, -R * 0.25, 0, 0, 0, R * 1.3);
    goo.addColorStop(0, 'rgba(255,190,80,0.55)');
    goo.addColorStop(0.6, 'rgba(255,120,20,0.35)');
    goo.addColorStop(1, 'rgba(255,90,0,0)');
    const pts = 12;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const rr = R * 1.18 * (0.9 + 0.14 * Math.sin(a * 4 + seed) + 0.1 * Math.sin(a * 2.3 + seed * 1.3));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = goo; ctx.fill();
    if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 22; }
    ctx.strokeStyle = 'rgba(255,150,40,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.shadowBlur = 0;
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
    const vein = _goliathGenerateVein(0, 0, Math.cos(seed) * R * 0.7, Math.sin(seed) * R * 0.7, 4, R * 0.45);
    ctx.beginPath();
    vein.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
    ctx.strokeStyle = 'rgba(255,170,50,0.85)'; ctx.lineWidth = 2.5;
    if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 10; }
    ctx.stroke(); ctx.shadowBlur = 0;
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
    for (let i = 0; i <= steps; i++) {
        const pt = _goliathBezierPt(fromX, fromY, cx, cy, toX, toY, i / steps);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x + (Math.random() - 0.5) * 16, pt.y + (Math.random() - 0.5) * 16);
    }
    ctx.strokeStyle = 'rgba(255,158,11,0.85)'; ctx.lineWidth = 6;
    if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 15; }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const pt = _goliathBezierPt(fromX, fromY, cx, cy, toX, toY, i / steps);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x + (Math.random() - 0.5) * 24, pt.y + (Math.random() - 0.5) * 24);
    }
    ctx.strokeStyle = 'rgba(255,200,50,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.shadowBlur = 0;

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
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.35, a, a + 0.3);
        ctx.strokeStyle = `${accentColor}`; ctx.globalAlpha = alpha * 0.55;
        ctx.lineWidth = 2.5;
        if (!_mobPerf) { ctx.shadowColor = accentColor; ctx.shadowBlur = 10; }
        ctx.stroke(); ctx.shadowBlur = 0;
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
        ctx.strokeStyle = 'rgba(196,132,252,0.9)'; ctx.lineWidth = 2.5;
        if (!_mobPerf) { ctx.shadowColor = '#9d00ff'; ctx.shadowBlur = 12; }
        ctx.stroke(); ctx.shadowBlur = 0;
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
            if (!_mobPerf) { ctx.shadowColor = accentColor; ctx.shadowBlur = 10; }
            ctx.fill(); ctx.shadowBlur = 0;
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
        const vp = Math.min(1, (enemy._verdictChannelTimer || 0) / 3000);
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
        const p = Math.min(1, (enemy._verdictChannelTimer || 0) / 3000);
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
    ctx.fillStyle = g;
    if (!_mobPerf) { ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 32 * intensity; }
    ctx.fill();
    ctx.shadowBlur = 0;
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
        ctx.strokeStyle = 'rgba(255,140,30,0.8)'; ctx.lineWidth = 1.5;
        if (!_mobPerf) { ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 10; }
        ctx.stroke();
        ctx.restore();
    });
}

// Inevitable — trường giới hạn sát thương nhiều lớp (quầng nhiệt + lưới lục
// giác + vệt HUD cảnh báo xoay quanh viền + tia lửa ngẫu nhiên)
function _drawGoliathInevitableAura(now) {
    // To hơn 1 tí theo yêu cầu (220->260, viền hex 248->290)
    const pulse = 0.85 + Math.sin(now / 450) * 0.15;
    ctx.beginPath(); ctx.arc(0, 0, 260, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(0, 0, 150, 0, 0, 260);
    g.addColorStop(0, 'rgba(255,69,0,0)'); g.addColorStop(1, `rgba(255,69,0,${0.24 * pulse})`);
    ctx.fillStyle = g;
    if (!_mobPerf) { ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 26 * pulse; }
    ctx.fill(); ctx.shadowBlur = 0;
    if (_mobPerf) return; // phần trang trí còn lại tốn nhiều shadowBlur, bỏ trên mobile

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
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, 290, a, a + 0.18);
        ctx.strokeStyle = 'rgba(255,140,60,0.8)'; ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 10; ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    if (Math.random() < 0.06) {
        const a = Math.random() * Math.PI * 2;
        const vein = _goliathGenerateVein(0, 0, Math.cos(a) * 245, Math.sin(a) * 245, 4, 18);
        ctx.beginPath();
        vein.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(255,180,120,0.8)'; ctx.lineWidth = 1.4;
        ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
    }
}

// Absolute Verdict orb — đối tượng độc lập (window._goliathOrbs), vẽ ngoài
// vòng đời enemy vì nó phải tiếp tục bay/tồn tại kể cả khi rơi vào tình
// huống hiếm là Goliath không còn nữa.
function _drawGoliathOrbs() {
    if (!window._goliathOrbs) return;
    const now = performance.now();
    window._goliathOrbs.forEach(p => {
        // Gấp đôi kích thước (62->124 méo không gian, 42->84 lõi) + thêm 1
        // lớp aura plasma nhiều tia lượn quanh quả cầu, theo yêu cầu. +20%
        // thêm nữa theo yêu cầu sau (124->149, 84->101).
        ctx.save();
        ctx.beginPath(); ctx.arc(p.x, p.y, 149, 0, Math.PI * 2);
        const rg = ctx.createRadialGradient(p.x, p.y, 101, p.x, p.y, 149);
        rg.addColorStop(0, 'rgba(157,0,255,0.18)'); rg.addColorStop(1, 'rgba(157,0,255,0)');
        ctx.fillStyle = rg; ctx.fill();
        ctx.restore();

        // Aura plasma: các dải năng lượng lượn sóng toả quanh quả cầu
        if (!_mobPerf) {
            ctx.save();
            for (let pl = 0; pl < 6; pl++) {
                const baseA = now / 380 + pl * (Math.PI / 3);
                ctx.beginPath();
                for (let seg = 0; seg <= 10; seg++) {
                    const st = seg / 10;
                    const rr = 101 + Math.sin(now / 140 + pl * 2 + st * 8) * 22 + st * 24;
                    const a2 = baseA + st * 0.7;
                    const px2 = p.x + Math.cos(a2) * rr, py2 = p.y + Math.sin(a2) * rr;
                    if (seg === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
                }
                ctx.strokeStyle = `rgba(196,132,252,${0.35 + 0.25 * Math.sin(now / 200 + pl)})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#9d00ff'; ctx.shadowBlur = 10;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        for (let k = 0; k < 5; k++) {
            const ang = now / 250 + k * (Math.PI * 2 / 5);
            const sx = p.x + Math.cos(ang) * 125, sy = p.y + Math.sin(ang) * 125;
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang * 2);
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(12, 7); ctx.lineTo(-12, 7); ctx.closePath();
            ctx.fillStyle = '#c084fc';
            if (!_mobPerf) { ctx.shadowColor = '#9d00ff'; ctx.shadowBlur = 8; }
            ctx.fill(); ctx.shadowBlur = 0;
            ctx.restore();
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 101);
        g.addColorStop(0, '#4c1d95'); g.addColorStop(0.6, '#1a0a2e'); g.addColorStop(1, 'rgba(10,0,20,0)');
        ctx.beginPath(); ctx.arc(p.x, p.y, 101, 0, Math.PI * 2);
        ctx.fillStyle = g;
        if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 26; }
        ctx.fill();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 6; ctx.stroke(); ctx.shadowBlur = 0;
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
        for (let vi = 0; vi < 3; vi++) {
            const va = (vi / 3) * Math.PI * 2 + (m._fireTime || 0);
            const vein = _goliathGenerateVein(0, 0, Math.cos(va) * 22, Math.sin(va) * 22, 3, 12);
            ctx.beginPath();
            vein.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
            ctx.strokeStyle = 'rgba(255,180,60,0.9)'; ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 10; }
            ctx.stroke(); ctx.shadowBlur = 0;
        }
        ctx.restore();
    });
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
            // Không đè hình phantom riêng lên thân — phun plasma cam ngay từ
            // các vết nứt CÓ SẴN trên thân (GOLIATH_TRUE_FORM_VEINS), giống
            // chất plasma của Veilshroud nhưng bám theo hình dạng thật của Goliath.
            GOLIATH_TRUE_FORM_VEINS.forEach((vein, vi) => {
                const tip = vein[vein.length - 1];
                const flick = 0.6 + 0.4 * Math.sin(now / 90 + vi * 2.1);
                const flareR = 26 + 14 * flick;
                const fg = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, flareR);
                fg.addColorStop(0, `rgba(255,200,120,${0.55 * flick})`);
                fg.addColorStop(0.5, `rgba(255,120,20,${0.35 * flick})`);
                fg.addColorStop(1, 'rgba(255,90,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(tip.x, tip.y, flareR, 0, Math.PI * 2); ctx.fill();
                // vệt nứt phát sáng cam đậm hơn trong lúc Phantom
                ctx.beginPath();
                vein.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
                ctx.strokeStyle = `rgba(255,140,20,${0.5 * flick})`; ctx.lineWidth = 3.5;
                if (!_mobPerf) { ctx.shadowColor = '#ff7a00'; ctx.shadowBlur = 14; }
                ctx.stroke(); ctx.shadowBlur = 0;
            });
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

    if (js['Aegis Core']) {
        // Mark mục tiêu cố định trước, vẽ vùng cảnh báo thẳng mờ, rồi mới bắn
        // đúng theo đường đó — không xoay tròn (đối chiếu fx.js drawAegisLasers thật)
        const s = js['Aegis Core'];
        if ((s.telegraphing || s.firing) && s.targets) {
            // Đúng thật (createAegisTelegraph): đường thẳng kéo dài hết đường
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

                // Hào quang plasma bùng phát quanh xúc tu — luôn hiện (mốc rage=5)
                if (!_mobPerf) {
                    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 88;
                    const auraA = Math.min(0.32, 0.235 * ext);
                    for (let si = 0; si < tentPts.length - 1; si++) {
                        const p0 = tentPts[si], p1 = tentPts[si + 1];
                        ctx.strokeStyle = `rgba(255,140,0,${auraA * p0.w})`;
                        ctx.lineWidth = Math.max(8, 125 * p0.w * rageSizeMult);
                        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }

                // Layer 0: lõi tối
                if (!_mobPerf) { ctx.shadowColor = '#3a1200'; ctx.shadowBlur = 45; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = 'rgba(40,15,0,0.97)'; ctx.lineWidth = Math.max(2, 92 * p0.w * rageSizeMult);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                // Layer 1: thân cam đậm
                if (!_mobPerf) { ctx.shadowColor = '#b34700'; ctx.shadowBlur = 28; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = `rgba(180,60,0,${0.90 * ext})`; ctx.lineWidth = Math.max(1, 70 * p0.w * rageSizeMult);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                // Layer 2: da ngoài cam sáng
                if (!_mobPerf) { ctx.shadowColor = '#ff8c1a'; ctx.shadowBlur = 16; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = `rgba(255,140,20,${0.72 * ext})`; ctx.lineWidth = Math.max(0.5, 46 * p0.w * rageSizeMult);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                // Layer 3: vệt sáng bám tiếp tuyến
                ctx.shadowBlur = 0;
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    const sdx = p1.x - p0.x, sdy = p1.y - p0.y, sL = Math.hypot(sdx, sdy) || 1;
                    const hpX = -sdy / sL, hpY = sdx / sL, ho = 5 * p0.w;
                    ctx.strokeStyle = `rgba(255,210,140,${0.42 * p0.w * ext})`; ctx.lineWidth = Math.max(0.5, 19 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x + hpX * ho, p0.y + hpY * ho); ctx.lineTo(p1.x + hpX * ho, p1.y + hpY * ho); ctx.stroke();
                }
                // Layer 4: sống lưng mảnh
                if (!_mobPerf) { ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 12; }
                for (let si = 0; si < tentPts.length - 1; si++) {
                    const p0 = tentPts[si], p1 = tentPts[si + 1];
                    ctx.strokeStyle = `rgba(255,190,80,${0.42 * p0.w * ext})`; ctx.lineWidth = Math.max(0.5, 7 * p0.w);
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
                }
                ctx.shadowBlur = 0;

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
function _drawGoliathGolemChunk(cx, cy, r, seed, lightAngle) {
    const la = lightAngle !== undefined ? lightAngle : -Math.PI / 3;
    ctx.save();
    ctx.translate(cx, cy);
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
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.closePath();
        const shade = 0.14 + lightness * 0.36;
        ctx.fillStyle = `rgb(${Math.round(10 + shade * 90)},${Math.round(10 + shade * 90)},${Math.round(14 + shade * 100)})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.3; ctx.stroke();
        if (lightness > 0.62) {
            ctx.strokeStyle = `rgba(255,255,255,${(lightness - 0.62) * 1.3})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
    }
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
        const seam = _goliathGenerateVein(a.x + af.fx, a.y + af.fy, b.x + bf.fx, b.y + bf.fy, 5, 14);
        ctx.beginPath();
        seam.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(20,8,0,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.strokeStyle = `rgba(255,158,11,${0.55 + 0.35 * flick})`; ctx.lineWidth = 1.8 + flick * 1.6;
        if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8 + flick * 14; }
        ctx.stroke(); ctx.shadowBlur = 0;
    });
}

// HALO PHÍA SAU — hình thoi rất lớn, 4 đỉnh là 4 quả cầu đá, 4 cạnh nối là
// chuỗi đá nhỏ xen plasma cam (giống dây tether ở cánh tay), giữa halo là 1
// vòng ma thuật xoay chậm. Gọi TRƯỚC thân nên luôn nằm phía sau.
const GOLIATH_HALO_R = 400;
function _drawGoliathHalo(now) {
    const verts = [
        { x: 0, y: -GOLIATH_HALO_R }, { x: GOLIATH_HALO_R, y: 0 },
        { x: 0, y: GOLIATH_HALO_R }, { x: -GOLIATH_HALO_R, y: 0 },
    ];
    const t = now / 1000;
    ctx.save();
    ctx.globalAlpha = 0.9;

    ctx.save(); ctx.rotate(t * 0.12);
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, GOLIATH_HALO_R * 0.42, a, a + 0.34);
        ctx.strokeStyle = 'rgba(245,158,11,0.55)'; ctx.lineWidth = 4;
        if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 14; }
        ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.save(); ctx.rotate(-t * 0.08);
    ctx.beginPath(); ctx.arc(0, 0, GOLIATH_HALO_R * 0.3, 0, Math.PI * 2);
    ctx.setLineDash([16, 12]); ctx.strokeStyle = 'rgba(255,210,140,0.5)'; ctx.lineWidth = 2.5;
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    for (let e = 0; e < 4; e++) {
        const p1 = verts[e], p2 = verts[(e + 1) % 4];
        const segs = 6;
        ctx.beginPath();
        for (let s = 0; s <= segs; s++) {
            const st = s / segs;
            const jx = (Math.random() - 0.5) * 14, jy = (Math.random() - 0.5) * 14;
            const px = p1.x + (p2.x - p1.x) * st + (s > 0 && s < segs ? jx : 0);
            const py = p1.y + (p2.y - p1.y) * st + (s > 0 && s < segs ? jy : 0);
            if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(255,158,11,0.55)'; ctx.lineWidth = 6;
        if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 16; }
        ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,220,160,0.8)'; ctx.lineWidth = 2;
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
        ctx.beginPath(); ctx.arc(vx, vy, 58, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,158,11,${0.35 + 0.25 * pulse})`; ctx.lineWidth = 3;
        if (!_mobPerf) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 18; }
        ctx.stroke(); ctx.shadowBlur = 0;
        _drawGoliathGolemChunk(vx, vy, 50, i * 31 + 7);
    });

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
            _drawGoliathGolemChunk(b.x, b.y, b.r, b.seed, -Math.PI / 3);
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
        _drawGoliathGolemChunk(0, 0, b.r * (1 - p * 0.3), b.seed, -Math.PI / 3);
        ctx.restore();
        if (Math.random() < 0.3) {
            createParticles(enemy.x + (b.x + driftX) * trueScale, enemy.y + (b.y + dropY) * trueScale, 1, '#8a7050', 2, 4);
        }
    });
    ctx.restore();
}

function _drawGoliath(enemy) {
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
            _drawGoliathMoltenBlob((230 + p * 40) * trueScale, 0.9 + Math.sin(now / 125) * 0.1, now);
            _drawGoliathVeins(GOLIATH_ALPHA_VEINS.map(v => v.map(pt => ({ x: pt.x * 1.6 * alphaScale, y: pt.y * 1.6 * alphaScale }))), 1.0);
        } else if (t < CRYSTALLIZE_END) {
            // PHA CRYSTALLIZE: khối nóng chảy nguội đi và kết tinh sắc nét
            // thành True Form thật — crossfade blob -> pha lê, 3 bảo thạch bật
            // sáng lần lượt
            const p = (t - FUSION_END) / (CRYSTALLIZE_END - FUSION_END);
            const ease = 1 - Math.pow(1 - p, 2);
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
            ctx.beginPath(); ctx.arc(0, 0, p * 500, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 6 * (1 - p); ctx.stroke();
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
        _drawGoliathHalo(now);
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
            const vp = Math.min(1, (enemy._verdictChannelTimer || 0) / 3000);
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
            for (let i = 0; i <= tickCount; i++) {
                const tickX = i * 40;
                const blink = 0.5 + 0.5 * Math.sin(now / 120 - i * 0.8);
                [-laneW, laneW].forEach(offset => {
                    ctx.beginPath(); ctx.arc(tickX, offset, 3 + vp * 2, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,80,80,${(0.3 + vp * 0.5) * blink})`;
                    if (!_mobPerf) { ctx.shadowColor = 'red'; ctx.shadowBlur = 8; }
                    ctx.fill(); ctx.shadowBlur = 0;
                });
            }
            ctx.restore();
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
        // xanh mờ thở nhẹ toả quanh thân VĨNH VIỄN cho tới lúc chết — để
        // người chơi luôn biết "mạng cứu" đã dùng rồi, khác hẳn cửa sổ buff
        // 6s (chỉ có thân nhấp nháy, đã hết từ lâu trong 1 trận dài).
        if (enemy._unbrokenWillUsed) {
            const _uwPulse = 0.5 + Math.sin(now / 900) * 0.5;
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, 245, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56,189,248,${0.18 + 0.12 * _uwPulse})`;
            ctx.lineWidth = 3;
            if (!_mobPerf) { ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12 + _uwPulse * 8; }
            ctx.stroke();
            ctx.shadowBlur = 0;
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

    // HP bar (True Form only — Alpha/Transforming are invulnerable, no bar
    // needed). Ẩn hẳn ngay từ lúc chuỗi hiệu ứng chết bắt đầu (enemy.hp bị
    // ghim = 1 suốt sequence, hiện thanh gần-cạn trông sai/gây hiểu lầm).
    if (enemy.phase === 'true_form' && !enemy._deathPhase) {
        const bw = enemy.size * 0.9, bh = 6;
        const bx = enemy.x - bw / 2, by = enemy.y - enemy.size / 2 - 16;
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#222'; ctx.fillRect(bx, by, bw, bh);
        const hpPct = enemy.hp / enemy.maxHp;
        ctx.fillStyle = hpPct > 0.5 ? '#f59e0b' : hpPct > 0.25 ? '#ff8800' : '#ff3300';
        ctx.fillRect(bx, by, bw * hpPct, bh);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);
    }
}
