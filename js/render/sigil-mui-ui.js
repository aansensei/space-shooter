// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) UI buttons, prompts and sigil card hover visual renderer (fx kind 55..59).

const _muiUiPt = { x: 0, y: 0 };
let _muiLastSpcFxTick = 0;
let _muiLastHoverFxTick = 0;

function _muiCalcPerimeterPoint(x, y, w, h, r, dist, P) {
    let d = dist % P;
    if (d < 0) d += P;
    const L1 = w - 2 * r;
    const L2 = h - 2 * r;
    const A = Math.PI * 0.5 * r;

    if (d < L1) {
        _muiUiPt.x = x + r + d;
        _muiUiPt.y = y;
    } else if (d < L1 + A) {
        const ang = -Math.PI * 0.5 + (d - L1) / r;
        _muiUiPt.x = x + w - r + Math.cos(ang) * r;
        _muiUiPt.y = y + r + Math.sin(ang) * r;
    } else if (d < L1 + A + L2) {
        _muiUiPt.x = x + w;
        _muiUiPt.y = y + r + (d - L1 - A);
    } else if (d < L1 + 2 * A + L2) {
        const ang = (d - L1 - A - L2) / r;
        _muiUiPt.x = x + w - r + Math.cos(ang) * r;
        _muiUiPt.y = y + h - r + Math.sin(ang) * r;
    } else if (d < 2 * L1 + 2 * A + L2) {
        _muiUiPt.x = x + w - r - (d - L1 - 2 * A - L2);
        _muiUiPt.y = y + h;
    } else if (d < 2 * L1 + 3 * A + L2) {
        const ang = Math.PI * 0.5 + (d - 2 * L1 - 2 * A - L2) / r;
        _muiUiPt.x = x + r + Math.cos(ang) * r;
        _muiUiPt.y = y + h - r + Math.sin(ang) * r;
    } else if (d < 2 * L1 + 3 * A + 2 * L2) {
        _muiUiPt.x = x;
        _muiUiPt.y = y + h - r - (d - 2 * L1 - 3 * A - L2);
    } else {
        const ang = Math.PI + (d - 2 * L1 - 3 * A - 2 * L2) / r;
        _muiUiPt.x = x + r + Math.cos(ang) * r;
        _muiUiPt.y = y + r + Math.sin(ang) * r;
    }
    return _muiUiPt;
}

function _drawMuiUi() {
    if (typeof window === 'undefined') return;
    const fxPool = window._muiFx;
    if (!fxPool) return;
    const gfx = typeof _muiGfxTier === 'function' ? _muiGfxTier() : 0;
    const max = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : fxPool.length;
    const reduced = typeof _muiReducedMotion === 'function' ? _muiReducedMotion() : false;

    for (let i = 0; i < max; i++) {
        const fx = fxPool[i];
        if (!fx || !fx.active) continue;
        if (fx.kind < 55 || fx.kind > 59) continue;

        const p = fx.life > 0 ? (fx.age / fx.life) : 1;
        if (p >= 1) {
            fx.active = false;
            continue;
        }

        const x = fx.x + (fx.vx || 0) * fx.age * 0.06;
        const y = fx.y + (fx.vy || 0) * fx.age * 0.06;

        ctx.save();
        if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

        if (fx.kind === 55) {
            const alpha = (1 - p) * (1 - p) * (reduced ? 0.6 : 0.85);
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(fx.angle + p * 1.5);
            const sz = (fx.scale || 1) * (4 + (1 - p) * 3);
            ctx.fillStyle = (p < 0.3) ? '#EAF7F2' : '#3DDBB0';
            ctx.beginPath();
            ctx.moveTo(0, -sz * 1.4);
            ctx.lineTo(sz * 0.7, 0);
            ctx.lineTo(0, sz * 1.4);
            ctx.lineTo(-sz * 0.7, 0);
            ctx.closePath();
            ctx.fill();
        } else if (fx.kind === 56) {
            const alpha = (1 - p) * 0.75;
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            const r = (fx.scale || 1) * (12 + p * 28);
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 1.8 * (1 - p);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
            if (gfx < 2) {
                ctx.strokeStyle = '#C9A24A';
                ctx.lineWidth = 1.2;
                for (let k = 0; k < 4; k++) {
                    const ang = k * Math.PI * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(ang) * (r - 3), Math.sin(ang) * (r - 3));
                    ctx.lineTo(Math.cos(ang) * (r + 4), Math.sin(ang) * (r + 4));
                    ctx.stroke();
                }
            }
        } else if (fx.kind === 57) {
            const alpha = (1 - p) * 0.8;
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            const r = (fx.scale || 1) * (2.5 * (1 - p * 0.5));
            ctx.fillStyle = '#3DDBB0';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            if (gfx < 2) {
                ctx.fillStyle = '#EAF7F2';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (fx.kind === 58) {
            const alpha = (1 - p) * 0.95;
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(fx.angle);
            const len = (fx.scale || 1) * (6 + (1 - p) * 10);
            const w = (fx.scale || 1) * (1.2 * (1 - p));
            ctx.fillStyle = (p < 0.4) ? '#EAF7F2' : '#3DDBB0';
            ctx.beginPath();
            ctx.moveTo(len, 0);
            ctx.lineTo(0, -w);
            ctx.lineTo(-len * 0.6, 0);
            ctx.lineTo(0, w);
            ctx.closePath();
            ctx.fill();
        } else if (fx.kind === 59) {
            const alpha = (1 - p) * 0.65;
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            const r = (fx.scale || 1) * (3 * (1 - p * 0.3));
            ctx.fillStyle = '#3DDBB0';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

function _muiDrawSpcReadyAura(pillX, py, pW, pH, now) {
    if (!window._muiReady) return;
    const gfx = typeof _muiGfxTier === 'function' ? _muiGfxTier() : 0;
    const reduced = typeof _muiReducedMotion === 'function' ? _muiReducedMotion() : false;
    const pulse = reduced ? 0.5 : (0.5 + 0.5 * Math.sin(now / 220));

    ctx.save();
    // Bronze corner accents
    ctx.strokeStyle = '#C9A24A';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.75 + 0.25 * pulse;
    const arm = 5;
    const ins = 1;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(pillX - ins + arm, py - ins);
    ctx.lineTo(pillX - ins, py - ins);
    ctx.lineTo(pillX - ins, py - ins + arm);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(pillX + pW + ins - arm, py - ins);
    ctx.lineTo(pillX + pW + ins, py - ins);
    ctx.lineTo(pillX + pW + ins, py - ins + arm);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(pillX - ins + arm, py + pH + ins);
    ctx.lineTo(pillX - ins, py + pH + ins);
    ctx.lineTo(pillX - ins, py + pH + ins - arm);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(pillX + pW + ins - arm, py + pH + ins);
    ctx.lineTo(pillX + pW + ins, py + pH + ins);
    ctx.lineTo(pillX + pW + ins, py + pH + ins - arm);
    ctx.stroke();

    // Outward jade breathing contour
    if (gfx < 2 && !reduced) {
        ctx.strokeStyle = '#3DDBB0';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.35 + 0.35 * pulse;
        const out = 2 + 3 * pulse;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(pillX - out, py - out, pW + out * 2, pH + out * 2, 4);
            ctx.stroke();
        } else {
            ctx.strokeRect(pillX - out, py - out, pW + out * 2, pH + out * 2);
        }

        // Periodic kind 55 flare emission
        const tick = Math.floor(now / 160);
        if (tick !== _muiLastSpcFxTick) {
            _muiLastSpcFxTick = tick;
            if (typeof _muiEmitFxHelper === 'function') {
                const rx = pillX + Math.random() * pW;
                const ry = py + (Math.random() < 0.5 ? 0 : pH);
                _muiEmitFxHelper(55, rx, ry, 520, 0.9, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3, -0.35 - Math.random() * 0.35);
            }
        }
    }

    ctx.restore();
}

function _muiDrawMobileChargeSync(cvId, now) {
    const c = typeof _cdCtx === 'function' ? _cdCtx(cvId) : null;
    if (!c) return;
    c.clearRect(0, 0, 58, 58);

    const reduced = typeof _muiReducedMotion === 'function' ? _muiReducedMotion() : false;
    const pulse = reduced ? 0.5 : (0.5 + 0.5 * Math.sin(now / 220));

    // Radial gradient fill
    const g = c.createRadialGradient(29, 29, 3, 29, 29, 27);
    g.addColorStop(0, '#EAF7F2');
    g.addColorStop(0.3, '#8ff0d2');
    g.addColorStop(0.6, '#3DDBB0');
    g.addColorStop(0.85, '#136f63');
    g.addColorStop(1, '#0B3B3A');

    c.save();
    c.globalAlpha = 0.65 + 0.25 * pulse;
    c.fillStyle = g;
    c.beginPath();
    c.arc(29, 29, 27, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Synchronized contracting ring
    const cyc = 900;
    const t = (now % cyc) / cyc;
    const ringR = 27 + 14 * (1 - t);
    const ringAlpha = t < 0.7 ? 1 : (1 - (t - 0.7) / 0.3);
    c.strokeStyle = 'rgba(234,247,242,' + (0.9 * ringAlpha).toFixed(3) + ')';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(29, 29, ringR, 0, Math.PI * 2);
    c.stroke();

    // Four ancient bronze tick marks
    c.strokeStyle = '#C9A24A';
    c.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
        const ang = k * Math.PI * 0.5;
        c.beginPath();
        c.moveTo(29 + Math.cos(ang) * 22, 29 + Math.sin(ang) * 22);
        c.lineTo(29 + Math.cos(ang) * 27, 29 + Math.sin(ang) * 27);
        c.stroke();
    }
}

function _muiDrawSigilCardFx(c, x, y, w, h, cx, cy, symCx, symCy, symR, isHovered, isSelected, now, compact) {
    if (!isHovered && !isSelected) return;
    const gfx = typeof _muiGfxTier === 'function' ? _muiGfxTier() : 0;
    const reduced = typeof _muiReducedMotion === 'function' ? _muiReducedMotion() : false;
    const r = 8;
    const P = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;

    c.save();

    // Glyph radiant glow enhancement
    const glyphPulse = reduced ? 0.5 : (0.5 + 0.5 * Math.sin(now / 280));
    const img = (typeof _zodiacGlyphImgs !== 'undefined') ? _zodiacGlyphImgs['mui'] : null;
    if (img && img.complete && img.naturalWidth > 0 && gfx < 2) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = (isSelected ? 0.65 : 0.42) + 0.28 * glyphPulse;
        const sz = symR * 1.85;
        c.drawImage(img, symCx - sz * 0.5, symCy - sz * 0.5, sz, sz);
        c.restore();
    }

    // Tracer dot running along card perimeter
    if (!reduced) {
        const loopMs = 1800;
        const dist1 = ((now % loopMs) / loopMs) * P;
        const pt1 = _muiCalcPerimeterPoint(x, y, w, h, r, dist1, P);

        c.save();
        if (gfx < 2) c.globalCompositeOperation = 'lighter';
        c.fillStyle = '#3DDBB0';
        c.beginPath();
        c.arc(pt1.x, pt1.y, 4, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#EAF7F2';
        c.beginPath();
        c.arc(pt1.x, pt1.y, 2, 0, Math.PI * 2);
        c.fill();

        // Second tracer half cycle away
        const dist2 = (dist1 + P * 0.5) % P;
        const pt2 = _muiCalcPerimeterPoint(x, y, w, h, r, dist2, P);
        c.fillStyle = '#3DDBB0';
        c.beginPath();
        c.arc(pt2.x, pt2.y, 4, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#EAF7F2';
        c.beginPath();
        c.arc(pt2.x, pt2.y, 2, 0, Math.PI * 2);
        c.fill();

        // Trail dots behind tracer 1
        if (gfx < 2) {
            for (let tr = 1; tr <= 3; tr++) {
                const trDist = dist1 - tr * 8;
                const trPt = _muiCalcPerimeterPoint(x, y, w, h, r, trDist, P);
                c.globalAlpha = 0.6 - tr * 0.16;
                c.fillStyle = '#3DDBB0';
                c.beginPath();
                c.arc(trPt.x, trPt.y, 3 - tr * 0.6, 0, Math.PI * 2);
                c.fill();
            }
        }
        c.restore();

        // Shimmer particles emitted on hover
        if (isHovered && gfx < 2) {
            const hTick = Math.floor(now / 220);
            if (hTick !== _muiLastHoverFxTick) {
                _muiLastHoverFxTick = hTick;
                if (typeof _muiEmitFxHelper === 'function') {
                    const sx = x + Math.random() * w;
                    const sy = y + h - 10 + Math.random() * 8;
                    _muiEmitFxHelper(57, sx, sy, 480, 1.0, 0, (Math.random() - 0.5) * 0.25, -0.45 - Math.random() * 0.35);
                }
            }
        }
    }

    // Selected state bronze accents
    if (isSelected) {
        c.strokeStyle = '#C9A24A';
        c.lineWidth = 2.0;
        c.globalAlpha = 0.85 + 0.15 * glyphPulse;
        const arm = 9;
        const ins = 3;
        // 4 outer corner brackets
        c.beginPath();
        c.moveTo(x - ins + arm, y - ins);
        c.lineTo(x - ins, y - ins);
        c.lineTo(x - ins, y - ins + arm);
        c.stroke();
        c.beginPath();
        c.moveTo(x + w + ins - arm, y - ins);
        c.lineTo(x + w + ins, y - ins);
        c.lineTo(x + w + ins, y - ins + arm);
        c.stroke();
        c.beginPath();
        c.moveTo(x - ins + arm, y + h + ins);
        c.lineTo(x - ins, y + h + ins);
        c.lineTo(x - ins, y + h + ins - arm);
        c.stroke();
        c.beginPath();
        c.moveTo(x + w + ins - arm, y + h + ins);
        c.lineTo(x + w + ins, y + h + ins);
        c.lineTo(x + w + ins, y + h + ins - arm);
        c.stroke();
    }

    c.restore();
}

function _muiDrawSigilCardMobileFx(c, x, y, w, h, cx, cy, symCx, symCy, symR, now) {
    const gfx = typeof _muiGfxTier === 'function' ? _muiGfxTier() : 0;
    const reduced = typeof _muiReducedMotion === 'function' ? _muiReducedMotion() : false;
    const r = 10;
    const P = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;

    c.save();

    // Glyph radiant glow enhancement
    const glyphPulse = reduced ? 0.5 : (0.5 + 0.5 * Math.sin(now / 280));
    const img = (typeof _zodiacGlyphImgs !== 'undefined') ? _zodiacGlyphImgs['mui'] : null;
    if (img && img.complete && img.naturalWidth > 0 && gfx < 2) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.55 + 0.25 * glyphPulse;
        const sz = symR * 1.8;
        c.drawImage(img, symCx - sz * 0.5, symCy - sz * 0.5, sz, sz);
        c.restore();
    }

    // Tracer dot
    if (!reduced) {
        const loopMs = 2000;
        const dist = ((now % loopMs) / loopMs) * P;
        const pt = _muiCalcPerimeterPoint(x, y, w, h, r, dist, P);

        c.save();
        if (gfx < 2) c.globalCompositeOperation = 'lighter';
        c.fillStyle = '#3DDBB0';
        c.beginPath();
        c.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#EAF7F2';
        c.beginPath();
        c.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }

    c.restore();
}

function _muiOnSigilCardSelect(cx, cy) {
    if (typeof _muiEmitFxHelper !== 'function') return;
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const spd = 2.4 + Math.random() * 3.6;
        const vx = Math.cos(ang) * spd;
        const vy = Math.sin(ang) * spd;
        _muiEmitFxHelper(58, cx, cy, 700 + Math.random() * 200, 1.1 + Math.random() * 0.4, ang, vx, vy);
    }
}
