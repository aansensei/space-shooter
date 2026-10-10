// Pisces: Space Journey. © 2024 An Nguyen. Licensed under the MIT License.
// Leo sigil VFX: the Divine Fate meter over the ship, its ready prompt and
// aura, Burn and stone overlays on enemies, Wildfire sparks. Every gradient,
// glow and the stone texture is baked once into cached canvases.
const _leoMeterFrameImg = new Image();
_leoMeterFrameImg.src = 'assets/images/game/sigils/leo-meter-frame.png';
const LEO_METER_FRAME_ASPECT = 768 / 1376;
const LEO_METER_HOLE_FRAC = { x0: 193 / 1376, x1: 1183 / 1376, y0: 325 / 768, y1: 443 / 768 };
let _leoRenderCache = null;

// Older Safari has no roundRect; a plain rect stands in there.
function _leoRoundRect(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
}

function _createLeoMeterFrame() {
    const c = document.createElement('canvas'); c.width = 1376; c.height = 768;
    const g = c.getContext('2d');
    const metal = g.createLinearGradient(0, 270, 0, 490);
    metal.addColorStop(0, '#ffd27a'); metal.addColorStop(0.35, '#ef9f27');
    metal.addColorStop(0.7, '#6a2816'); metal.addColorStop(1, '#ef9f27');
    g.fillStyle = metal; g.strokeStyle = '#ffd27a'; g.lineWidth = 12;
    _leoRoundRect(g, 152, 294, 1072, 180, 90); g.fill(); g.stroke();
    for (const side of [-1, 1]) {
        g.save(); g.translate(688 + side * 512, 384); g.scale(side, 1);
        for (let i = -2; i <= 2; i++) {
            g.beginPath(); g.moveTo(-26, i * 27);
            g.lineTo(122 - Math.abs(i) * 14, i * 51);
            g.lineTo(68, i * 27 + 16); g.lineTo(-20, i * 27 + 18);
            g.closePath(); g.fill(); g.stroke();
        }
        g.restore();
    }
    g.save(); g.translate(688, 271);
    for (let i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6); g.fillStyle = '#ef9f27';
        g.beginPath(); g.moveTo(-10, -30); g.lineTo(0, -65); g.lineTo(10, -30); g.fill();
    }
    g.fillStyle = metal; g.beginPath(); g.arc(0, 0, 37, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.fill(); g.restore();
    // The cutout has no painted fill or glow inside it.
    g.globalCompositeOperation = 'destination-out';
    _leoRoundRect(g, 180, 324, 1016, 120, 60); g.fill();
    g.globalCompositeOperation = 'source-over';
    return c;
}

// The frame art is baked once at twice its drawn size, so the 1376x768
// source is never resampled per frame.
const LEO_METER_W = 110;
function _leoSprites() {
    if (_leoRenderCache) return _leoRenderCache;
    const fill = document.createElement('canvas'); fill.width = 512; fill.height = 16;
    const f = fill.getContext('2d'), grad = f.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#c2410c'); grad.addColorStop(0.55, '#ef9f27'); grad.addColorStop(1, '#ffe29a');
    f.fillStyle = grad; f.fillRect(0, 0, 512, 16);
    // A lighter band along the top reads as a lit liquid surface at small sizes.
    f.fillStyle = 'rgba(255,242,206,0.35)'; f.fillRect(0, 2, 512, 4);
    const flame = document.createElement('canvas'); flame.width = 32; flame.height = 40;
    const p = flame.getContext('2d');
    p.fillStyle = '#ef9f27'; p.beginPath(); p.moveTo(16, 1);
    p.bezierCurveTo(31, 18, 32, 36, 16, 39); p.bezierCurveTo(0, 36, 1, 20, 16, 1); p.fill();
    p.fillStyle = '#ffd27a'; p.beginPath(); p.moveTo(16, 17);
    p.quadraticCurveTo(29, 36, 16, 37); p.quadraticCurveTo(6, 33, 16, 17); p.fill();
    const loaded = _leoMeterFrameImg.complete && _leoMeterFrameImg.naturalWidth > 0;
    const frame = document.createElement('canvas');
    frame.width = LEO_METER_W * 2; frame.height = Math.ceil(LEO_METER_W * 2 * LEO_METER_FRAME_ASPECT);
    const fr = frame.getContext('2d');
    fr.imageSmoothingEnabled = true; fr.imageSmoothingQuality = 'high';
    fr.drawImage(loaded ? _leoMeterFrameImg : _createLeoMeterFrame(), 0, 0, frame.width, frame.height);
    const glowSource = document.createElement('canvas'); glowSource.width = LEO_METER_W; glowSource.height = Math.ceil(LEO_METER_W * LEO_METER_FRAME_ASPECT);
    const s = glowSource.getContext('2d');
    s.drawImage(frame, 0, 0, glowSource.width, glowSource.height);
    s.globalCompositeOperation = 'source-in'; s.fillStyle = '#ef9f27'; s.fillRect(0, 0, glowSource.width, glowSource.height);
    const glow = document.createElement('canvas'); glow.width = LEO_METER_W + 50; glow.height = glowSource.height + 50;
    const b = glow.getContext('2d'); b.filter = 'blur(7px)'; b.drawImage(glowSource, 25, 25); b.filter = 'none';
    const stone = document.createElement('canvas'); stone.width = stone.height = 128;
    const t = stone.getContext('2d');
    t.beginPath(); t.arc(64, 64, 62, 0, Math.PI * 2); t.clip();
    const mineral = t.createLinearGradient(22, 12, 106, 118);
    mineral.addColorStop(0, '#d7d3bb'); mineral.addColorStop(0.45, '#8d948f'); mineral.addColorStop(1, '#454a50');
    t.fillStyle = mineral; t.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 14; i++) {
        const a = i * 2.399, x = 64 + Math.cos(a) * (24 + i * 2), y = 64 + Math.sin(a) * (24 + i * 2);
        t.fillStyle = i % 2 ? 'rgba(237,228,197,0.20)' : 'rgba(26,32,44,0.23)';
        t.beginPath(); t.moveTo(x - 24, y - 12); t.lineTo(x + 8, y - 22);
        t.lineTo(x + 26, y + 9); t.lineTo(x - 12, y + 25); t.closePath(); t.fill();
    }
    t.strokeStyle = 'rgba(31,34,43,0.6)'; t.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
        const x = 18 + i * 15;
        t.beginPath(); t.moveTo(x, 8); t.lineTo(x + 9, 39); t.lineTo(x - 5, 62);
        t.lineTo(x + 12, 89); t.lineTo(x + 4, 120); t.stroke();
    }
    _leoRenderCache = { frame, fill, flame, glow, stone, loaded };
    return _leoRenderCache;
}

// Same order as Cancer's tide meter: dark well and fill clipped to the
// measured opening, then the frame on top, which also hides the corners
// of the clip rectangle outside the capsule.
function _drawLeoFateMeter() {
    if (!_leoHasFateMeter()) return;
    let sprites = _leoSprites();
    if (!sprites.loaded && _leoMeterFrameImg.complete && _leoMeterFrameImg.naturalWidth > 0) {
        _leoRenderCache = null; sprites = _leoSprites();
    }
    const w = LEO_METER_W, h = w * LEO_METER_FRAME_ASPECT;
    const tidal = _hasBuff('trieu_hoi') ? 110 * TIDAL_METER_FRAME_ASPECT + 6 : 0;
    const x = player.x - w / 2;
    const y = player.y - player.height / 2 - h - 6 - (window._greatSageFrameClearance || 0) - tidal;
    window._leoHudTop = y;
    const hx = x + w * LEO_METER_HOLE_FRAC.x0, hy = y + h * LEO_METER_HOLE_FRAC.y0;
    const hw = w * (LEO_METER_HOLE_FRAC.x1 - LEO_METER_HOLE_FRAC.x0);
    const hh = h * (LEO_METER_HOLE_FRAC.y1 - LEO_METER_HOLE_FRAC.y0);
    const pct = _leoFatePercent(), ratio = pct / LEO_FATE_METER_MAX;
    const pulse = 0.5 + 0.5 * Math.sin(window._leoFxClock / 260);
    if (!_mobPerf && _gfxLevel < 2) {
        ctx.globalAlpha = 0.48 + (window._leoFateReady ? 0.28 * pulse : 0.07 * pulse);
        ctx.drawImage(sprites.glow, x - 25, y - 25);
        ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.clip();
    ctx.fillStyle = '#2a120c'; ctx.fillRect(hx, hy, hw, hh);
    if (ratio > 0) {
        const fw = hw * ratio;
        ctx.drawImage(sprites.fill, 0, 0, Math.max(1, sprites.fill.width * ratio), sprites.fill.height, hx, hy, fw, hh);
        // A bright leading edge marks progress even at a few percent, and
        // flares for a moment each time charge comes in.
        ctx.fillStyle = window._leoChargeFlashMs > 0 ? '#ffffff' : '#fff2ce';
        ctx.fillRect(hx + Math.max(0, fw - 1.5), hy, 1.5, hh);
    }
    ctx.restore();
    if (window._leoFateReady) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,210,122,${0.35 + pulse * 0.45})`; ctx.lineWidth = 2;
        _leoRoundRect(ctx, hx - 2, hy - 2, hw + 4, hh + 4, hh / 2 + 2); ctx.stroke();
        if (!_mobPerf && _gfxLevel < 2) {
            for (let i = 0; i < (_gfxLevel < 1 ? 4 : 2); i++) {
                const t = ((window._leoFxClock / 650 + i * 0.3) % 1);
                ctx.globalAlpha = 1 - t;
                ctx.drawImage(sprites.flame, hx + (i % 2 ? hw - 5 : 0), hy - 3 - t * 13, 5, 7);
            }
        }
        ctx.restore();
    }
    ctx.drawImage(sprites.frame, x, y, w, h);
    // Dark outline keeps the ATK readout legible over the ship's own rings.
    const bonus = pct * LEO_FATE_ATK_PER_PERCENT * 100;
    ctx.save();
    ctx.font = 'bold 10px "Courier New", monospace'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,8,4,0.85)'; ctx.fillStyle = '#ffd27a';
    const label = '+' + bonus.toFixed(bonus % 1 ? 1 : 0) + '% ATK';
    ctx.strokeText(label, player.x, hy + hh + 16); ctx.fillText(label, player.x, hy + hh + 16);
    if (window._leoFateRestMs > 0) {
        ctx.font = '9px "Courier New", monospace'; ctx.fillStyle = '#e8d7a1';
        const rest = (window._leoFateRestMs / 1000).toFixed(1) + 's';
        ctx.strokeText(rest, player.x, hy - 4); ctx.fillText(rest, player.x, hy - 4);
    }
    ctx.restore();
}

function _drawLeoFateReadyPrompt() {
    if (!window._leoFateReady || window._tidalSurgeReady) return;
    const x = canvas.width / 2;
    let y = canvas.height * 0.5;
    // Sits above Great Sage's prompt and clear of the meter stack over the ship.
    const sagePrompt = typeof _greatSageGems !== 'undefined' && _greatSageGems.length > 0;
    if (sagePrompt) y -= 48;
    if (Number.isFinite(window._leoHudTop) && Math.abs(player.x - x) < 179) {
        y = Math.max(28, Math.min(y, window._leoHudTop - (sagePrompt ? 76 : 28)));
    }
    const vi = window._lang === 'vi';
    ctx.save(); ctx.fillStyle = 'rgba(24,12,8,0.75)';
    _leoRoundRect(ctx, x - 124, y - 20, 248, 40, 8); ctx.fill();
    ctx.strokeStyle = '#ef9f27'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(vi ? 'THẦN MỆNH SẴN SÀNG' : 'DIVINE FATE READY', x, y - 8);
    ctx.font = '11px "Courier New", monospace';
    // Phones have no Space key; the CHARGE button releases it there.
    const key = window._platform === 'mobile' ? 'CHARGE' : 'Space';
    ctx.fillText(key + (vi ? ': hóa đá mọi kẻ địch' : ': petrify all enemies'), x, y + 10);
    ctx.restore();
}

function _drawLeoReadyAura() {
    if (!window._leoFateReady || !_leoHasFateMeter()) return;
    const r = player.width * 1.25, pulse = 0.5 + 0.5 * Math.sin(window._leoFxClock / 260);
    ctx.save(); ctx.strokeStyle = `rgba(239,159,39,${0.45 + pulse * 0.35})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(player.x, player.y, r, 0, Math.PI * 2); ctx.stroke();
    if (!_mobPerf && _gfxLevel < 2) {
        const flame = _leoSprites().flame;
        for (let i = 0; i < (_gfxLevel < 1 ? 8 : 4); i++) {
            const a = i * Math.PI / 4 + window._leoFxClock / 2600;
            ctx.drawImage(flame, player.x + Math.cos(a) * r - 3, player.y + Math.sin(a) * r - 5, 6, 10);
        }
    }
    ctx.restore();
}

function _drawLeoEnemyStatus(enemy) {
    const burn = window._sthBurning && window._sthBurning.get(enemy);
    const low = _mobPerf || _gfxLevel >= 2;
    if (burn && Number.isFinite(burn.stacks) && enemy.hp > 0) {
        const flame = _leoSprites().flame, n = Math.min(3, Math.max(1, burn.stacks));
        const r = Math.min(80, enemy.size / 2);
        for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.6;
            ctx.drawImage(flame, enemy.x + Math.cos(a) * r - 4, enemy.y + Math.sin(a) * r - 8, 8, 12);
        }
    }
    if (!enemy._thanMenhFrozen) return;
    const r = enemy.size / 2 + 3;
    if (!Number.isFinite(r) || r <= 0) return;
    const age = Math.max(0, window._leoFxClock - (enemy._leoStoneStarted || 0));
    const grow = Math.min(1, age / 180);
    const ending = window._leoPetrifyMs < 600;
    const pulse = ending ? 0.5 + 0.5 * Math.sin(window._leoFxClock / 40) : 1;
    const ga = ctx.globalAlpha;
    // The stone creeps up from below by cropping the sprite's source rect,
    // which needs no clip and no save/restore per petrified enemy.
    const stone = _leoSprites().stone, sh = stone.height * grow;
    ctx.globalAlpha = ga * (0.53 + pulse * 0.12);
    if (sh >= 1) ctx.drawImage(stone, 0, stone.height - sh, stone.width, sh, enemy.x - r, enemy.y + r - r * 2 * grow, r * 2, r * 2 * grow);
    if (grow < 1) {
        if (!low) {
            ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1; ctx.globalAlpha = ga * (1 - grow) * 0.8;
            const lineY = enemy.y + r - r * 2 * grow;
            const half = Math.sqrt(Math.max(0, r * r - (lineY - enemy.y) * (lineY - enemy.y)));
            ctx.beginPath(); ctx.moveTo(enemy.x - half, lineY); ctx.lineTo(enemy.x + half, lineY); ctx.stroke();
        }
        ctx.globalAlpha = ga;
        return;
    }
    ctx.globalAlpha = ga * (ending ? 0.8 : 0.45); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = ending ? 2 : 1;
    const n = low ? 1 : (_gfxLevel < 1 ? 4 : 2);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const dx = (i / n - 0.5) * r;
        ctx.moveTo(enemy.x + dx, enemy.y - r * 0.7);
        ctx.lineTo(enemy.x + dx + r * 0.2, enemy.y); ctx.lineTo(enemy.x + dx - r * 0.1, enemy.y + r * 0.65);
    }
    ctx.stroke();
    ctx.globalAlpha = ga * (0.45 + pulse * 0.25); ctx.strokeStyle = '#e8d7a1'; ctx.lineWidth = low ? 1 : 1.5;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r - 1, 0, Math.PI * 2); ctx.stroke();
    if (!low) {
        ctx.fillStyle = '#ada691';
        for (let i = 0; i < (_gfxLevel < 1 ? 4 : 2); i++) {
            const t = ((window._leoFxClock / 500 + i * 0.27) % 1);
            ctx.globalAlpha = ga * (1 - t); ctx.fillRect(enemy.x + Math.sin(i * 7) * r * 0.7, enemy.y + r * 0.4 + t * 14, 2, 2);
        }
    }
    ctx.globalAlpha = ga;
}

// Petrify running out: a gold flash, an expanding ring, stone shards flung
// out and falling, and (High only) cracks of light from the core.
function _drawLeoShatter(fx, t, low) {
    const r = fx.r, x = fx.x, y = fx.y;
    if (!(r > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const fade = 1 - t;
    if (t < 0.25) {
        ctx.globalAlpha = (1 - t / 0.25) * 0.55;
        ctx.fillStyle = '#fff2ce';
        ctx.beginPath(); ctx.arc(x, y, r * (0.9 + t), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = fade * 0.9;
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = (low ? 2 : 4) * fade + 0.5;
    ctx.beginPath(); ctx.arc(x, y, r + 10 + t * (r * 0.9 + 36), 0, Math.PI * 2); ctx.stroke();
    if (!low && _gfxLevel < 1 && t < 0.6) {
        ctx.globalAlpha = (1 - t / 0.6) * 0.8; ctx.strokeStyle = '#fff2ce'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = fx.seed + i * 1.2566, len = r * (0.35 + t * 1.1);
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a + 0.18) * len * 0.55, y + Math.sin(a + 0.18) * len * 0.55);
            ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        }
        ctx.stroke();
    }
    const shards = low ? 4 : (_gfxLevel < 1 ? 12 : 7);
    const ease = 1 - (1 - t) * (1 - t);
    ctx.globalAlpha = fade;
    for (let i = 0; i < shards; i++) {
        const a = fx.seed + i * 2.399;
        const d = r * 0.35 + ease * (r * 0.8 + 34 + (i % 3) * 10);
        const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d + t * t * 30;
        const s = (low ? 5 : 5 + (i % 4) * 1.5) * (1 - t * 0.4);
        const spin = a + t * (5 + (i % 3));
        const c = Math.cos(spin), sn = Math.sin(spin);
        ctx.fillStyle = i % 3 === 0 ? '#e8d7a1' : (i % 3 === 1 ? '#ada691' : '#6f7277');
        ctx.beginPath();
        ctx.moveTo(sx + c * s, sy + sn * s);
        ctx.lineTo(sx - sn * s * 0.7, sy + c * s * 0.7);
        ctx.lineTo(sx - c * s * 0.8, sy - sn * s * 0.8);
        ctx.closePath(); ctx.fill();
        if (!low) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1; ctx.stroke(); }
    }
}

function _drawLeoEffects() {
    const low = _mobPerf || _gfxLevel >= 2;
    ctx.save();
    for (const fx of window._leoVisuals || []) {
        const t = Math.max(0, Math.min(1, fx.age / fx.life));
        ctx.globalAlpha = 1 - t;
        if (fx.kind === 'fire') {
            const x = fx.x + (fx.tx - fx.x) * t, y = fx.y + (fx.ty - fx.y) * t - Math.sin(t * Math.PI) * 22;
            ctx.drawImage(_leoSprites().flame, x - 4, y - 7, low ? 5 : 9, low ? 7 : 14);
            if (t > 0.7) { ctx.strokeStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(fx.tx, fx.ty, 3 + t * 8, 0, Math.PI * 2); ctx.stroke(); }
        } else if (fx.kind === 'ring') {
            ctx.strokeStyle = '#ef9f27'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx.x, fx.y, 3 + t * 32, 0, Math.PI * 2); ctx.stroke();
        } else if (fx.kind === 'shatter') {
            _drawLeoShatter(fx, t, low);
        } else if (fx.kind === 'stone') {
            ctx.fillStyle = '#ada691';
            for (let i = 0; i < (low ? 2 : _gfxLevel < 1 ? 8 : 4); i++) {
                const a = i * 2.399;
                const x = fx.x + Math.cos(a) * (fx.r + t * 28), y = fx.y + Math.sin(a) * (fx.r + t * 28) + t * t * 22;
                const s = low ? 3 : 4 + i % 3;
                ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y - s * 0.4);
                ctx.lineTo(x + s * 0.3, y + s); ctx.closePath(); ctx.fill();
            }
            if (!low) {
                ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1; ctx.globalAlpha = (1 - t) * 0.5;
                ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r + t * 18, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }
    if (window._leoFateWaveMs > 0) {
        const t = 1 - window._leoFateWaveMs / 500;
        ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = low ? 2 : 5;
        ctx.beginPath(); ctx.arc(player.x, player.y, Math.hypot(canvas.width, canvas.height) * t, 0, Math.PI * 2); ctx.stroke();
        if (!low && t < 0.22) {
            ctx.globalAlpha = (1 - t / 0.22) * 0.12; ctx.fillStyle = '#ffd27a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    ctx.restore();
}
