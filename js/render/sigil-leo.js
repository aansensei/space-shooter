// Cached bronze frame and flame sprites keep Leo's HUD inexpensive.
const _leoMeterFrameImg = new Image();
_leoMeterFrameImg.src = 'assets/images/game/sigils/leo-meter-frame.png';
_leoMeterFrameImg.onload = () => { _leoRenderCache = null; };
const LEO_METER_FRAME_ASPECT = 768 / 1376;
const LEO_METER_HOLE_FRAC = { x0: 193 / 1376, x1: 1183 / 1376, y0: 325 / 768, y1: 443 / 768 };
const LEO_METER_HOLE_SPANS = [[244,1132],[239,1137],[235,1141],[232,1144],[229,1147],[227,1149],[225,1151],[223,1153],[221,1155],[220,1156],[218,1158],[217,1159],[216,1160],[214,1162],[213,1163],[212,1164],[211,1165],[210,1166],[209,1167],[208,1168],[207,1169],[206,1170],[206,1170],[205,1171],[204,1172],[203,1173],[203,1173],[202,1174],[201,1175],[201,1175],[200,1176],[200,1176],[199,1177],[199,1177],[198,1178],[198,1178],[197,1179],[197,1179],[197,1179],[196,1180],[196,1180],[196,1180],[195,1181],[195,1181],[195,1181],[195,1181],[194,1182],[194,1182],[194,1182],[194,1182],[194,1182],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[193,1183],[194,1183],[194,1182],[194,1182],[194,1182],[194,1182],[195,1181],[195,1181],[195,1181],[195,1181],[196,1180],[196,1180],[196,1180],[197,1179],[197,1179],[197,1179],[198,1178],[198,1178],[199,1177],[199,1177],[200,1176],[200,1176],[201,1175],[201,1175],[202,1174],[203,1173],[203,1173],[204,1172],[205,1171],[206,1170],[206,1170],[207,1169],[208,1168],[209,1167],[210,1166],[211,1165],[212,1164],[213,1163],[214,1162],[216,1160],[217,1159],[218,1158],[220,1156],[221,1155],[223,1153],[225,1151],[227,1149],[229,1147],[232,1144],[235,1141],[239,1137],[244,1132]];
let _leoRenderCache = null;

function _createLeoMeterFrame() {
    const c = document.createElement('canvas'); c.width = 1376; c.height = 768;
    const g = c.getContext('2d');
    const metal = g.createLinearGradient(0, 270, 0, 490);
    metal.addColorStop(0, '#ffd27a'); metal.addColorStop(0.35, '#ef9f27');
    metal.addColorStop(0.7, '#6a2816'); metal.addColorStop(1, '#ef9f27');
    g.fillStyle = metal; g.strokeStyle = '#ffd27a'; g.lineWidth = 12;
    g.beginPath(); g.roundRect(152, 294, 1072, 180, 90); g.fill(); g.stroke();
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
    g.beginPath(); g.roundRect(180, 324, 1016, 120, 60); g.fill();
    g.globalCompositeOperation = 'source-over';
    return c;
}

function _leoSprites() {
    if (_leoRenderCache) return _leoRenderCache;
    const fill = document.createElement('canvas'); fill.width = 1024; fill.height = 120;
    const f = fill.getContext('2d'), grad = f.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#6a2816'); grad.addColorStop(0.5, '#ef9f27'); grad.addColorStop(1, '#ffd27a');
    f.fillStyle = grad; f.fillRect(0, 0, 1024, 120);
    const flame = document.createElement('canvas'); flame.width = 32; flame.height = 40;
    const p = flame.getContext('2d');
    p.fillStyle = '#ef9f27'; p.beginPath(); p.moveTo(16, 1);
    p.bezierCurveTo(31, 18, 32, 36, 16, 39); p.bezierCurveTo(0, 36, 1, 20, 16, 1); p.fill();
    p.fillStyle = '#ffd27a'; p.beginPath(); p.moveTo(16, 17);
    p.quadraticCurveTo(29, 36, 16, 37); p.quadraticCurveTo(6, 33, 16, 17); p.fill();
    const frame = _createLeoMeterFrame();
    const mask = document.createElement('canvas'); mask.width = 1376; mask.height = 768;
    const m = mask.getContext('2d');
    m.fillStyle = '#fff';
    if (_leoMeterFrameImg.complete && _leoMeterFrameImg.naturalWidth > 0) {
        // Alpha spans are measured offline, so direct file loading also works.
        const y0 = Math.round(LEO_METER_HOLE_FRAC.y0 * 768);
        for (let y = 0; y < LEO_METER_HOLE_SPANS.length; y++) {
            const row = LEO_METER_HOLE_SPANS[y];
            for (let i = 0; i < row.length; i += 2) m.fillRect(row[i], y0 + y, row[i + 1] - row[i], 1);
        }
    } else {
        m.beginPath(); m.roundRect(180, 324, 1016, 120, 60); m.fill();
    }
    const meter = document.createElement('canvas'); meter.width = 110; meter.height = Math.ceil(110 * LEO_METER_FRAME_ASPECT);
    const glowSource = document.createElement('canvas'); glowSource.width = meter.width; glowSource.height = meter.height;
    const s = glowSource.getContext('2d');
    s.drawImage(_leoMeterFrameImg.complete && _leoMeterFrameImg.naturalWidth > 0 ? _leoMeterFrameImg : frame, 0, 0, 110, 110 * LEO_METER_FRAME_ASPECT);
    s.globalCompositeOperation = 'source-in'; s.fillStyle = '#ef9f27'; s.fillRect(0, 0, 110, meter.height);
    const glow = document.createElement('canvas'); glow.width = 160; glow.height = meter.height + 50;
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
    _leoRenderCache = { frame, fill, flame, mask, meter, glow, stone };
    return _leoRenderCache;
}

function _drawLeoFateMeter() {
    if (!_leoHasFateMeter()) return;
    const sprites = _leoSprites(), w = 110, h = w * LEO_METER_FRAME_ASPECT;
    const tidal = _hasBuff('trieu_hoi') ? 110 * TIDAL_METER_FRAME_ASPECT + 6 : 0;
    const x = player.x - w / 2;
    const y = player.y - player.height / 2 - h - 6 - (window._greatSageFrameClearance || 0) - tidal;
    window._leoHudTop = y;
    const hx = x + w * LEO_METER_HOLE_FRAC.x0, hy = y + h * LEO_METER_HOLE_FRAC.y0;
    const hw = w * (LEO_METER_HOLE_FRAC.x1 - LEO_METER_HOLE_FRAC.x0);
    const hh = h * (LEO_METER_HOLE_FRAC.y1 - LEO_METER_HOLE_FRAC.y0);
    const pct = _leoFatePercent(), pulse = 0.5 + 0.5 * Math.sin(window._leoFxClock / 260);
    ctx.save();
    ctx.globalAlpha = (_mobPerf || _gfxLevel >= 2 ? 0.22 : 0.48)
        + (window._leoFateReady ? 0.28 * pulse : 0.07 * pulse);
    ctx.drawImage(sprites.glow, x - 25, y - 25); ctx.restore();
    // The measured alpha mask clips the fill to every pixel of the actual opening.
    const g = sprites.meter.getContext('2d');
    g.clearRect(0, 0, sprites.meter.width, sprites.meter.height);
    g.fillStyle = '#24100c'; g.fillRect(0, 0, w, h);
    if (pct > 0) {
        const fw = hw * pct / LEO_FATE_METER_MAX;
        g.drawImage(sprites.fill, 0, 0, sprites.fill.width * pct / LEO_FATE_METER_MAX, 120, hx - x, 0, fw, h);
    }
    if (window._leoChargeFlashMs > 0) {
        g.fillStyle = 'rgba(255,242,206,0.65)';
        g.fillRect(hx - x + hw * (1 - window._leoChargeFlashMs / 300), 0, 5, h);
    }
    g.globalCompositeOperation = 'destination-in'; g.drawImage(sprites.mask, 0, 0, w, h);
    g.globalCompositeOperation = 'source-over'; ctx.drawImage(sprites.meter, x, y);
    const img = _leoMeterFrameImg.complete && _leoMeterFrameImg.naturalWidth > 0 ? _leoMeterFrameImg : sprites.frame;
    ctx.save();
    if (window._leoFateReady) {
        ctx.strokeStyle = `rgba(255,210,122,${0.35 + pulse * 0.45})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(hx - 2, hy - 2, hw + 4, hh + 4, hh / 2 + 2); ctx.stroke();
        if (!_mobPerf && _gfxLevel < 2) {
            for (let i = 0; i < (_gfxLevel < 1 ? 4 : 2); i++) {
                const t = ((window._leoFxClock / 650 + i * 0.3) % 1);
                ctx.globalAlpha = 1 - t;
                ctx.drawImage(sprites.flame, hx + (i % 2 ? hw - 5 : 0), hy - 3 - t * 13, 5, 7);
            }
        }
    }
    ctx.globalAlpha = 1; ctx.drawImage(img, x, y, w, h);
    ctx.font = 'bold 10px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd27a';
    const bonus = pct * LEO_FATE_ATK_PER_PERCENT * 100;
    ctx.fillText('+' + bonus.toFixed(bonus % 1 ? 1 : 0) + '% ATK', player.x, hy + hh + 16);
    if (window._leoFateRestMs > 0) {
        ctx.fillStyle = '#ba9977'; ctx.font = '9px "Courier New", monospace';
        ctx.fillText((window._leoFateRestMs / 1000).toFixed(1) + 's', player.x, hy - 4);
    }
    ctx.restore();
}

function _drawLeoFateReadyPrompt() {
    if (!window._leoFateReady || window._tidalSurgeReady) return;
    const x = canvas.width / 2;
    let y = canvas.height * 0.5;
    const sagePrompt = typeof _greatSageGems !== 'undefined' && _greatSageGems.length > 0;
    if (sagePrompt) y -= 48;
    const frameTop = player.y - player.height / 2 - (110 * LEO_METER_FRAME_ASPECT + 6)
        * (_hasBuff('trieu_hoi') ? 2 : 1) - (window._greatSageFrameClearance || 0);
    if (Math.abs(player.x - x) < 179) y = Math.max(28, Math.min(y, frameTop - (sagePrompt ? 76 : 28)));
    const vi = window._lang === 'vi';
    ctx.save(); ctx.fillStyle = 'rgba(24,12,8,0.75)';
    ctx.beginPath(); ctx.roundRect(x - 124, y - 20, 248, 40, 8); ctx.fill();
    ctx.strokeStyle = '#ef9f27'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(vi ? 'THẦN MỆNH SẴN SÀNG' : 'DIVINE FATE READY', x, y - 8);
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText(vi ? 'Space: hóa đá mọi kẻ địch' : 'Space: petrify all enemies', x, y + 10);
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
    ctx.save(); ctx.beginPath(); ctx.rect(enemy.x - r, enemy.y + r - r * 2 * grow, r * 2, r * 2 * grow); ctx.clip();
    ctx.globalAlpha = 0.53 + pulse * 0.12;
    ctx.drawImage(_leoSprites().stone, enemy.x - r, enemy.y - r, r * 2, r * 2);
    ctx.globalAlpha = ending ? 0.8 : 0.45; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = ending ? 2 : 1;
    const n = low ? 1 : (_gfxLevel < 1 ? 4 : 2);
    for (let i = 0; i < n; i++) {
        const dx = (i / n - 0.5) * r;
        ctx.beginPath(); ctx.moveTo(enemy.x + dx, enemy.y - r * 0.7);
        ctx.lineTo(enemy.x + dx + r * 0.2, enemy.y); ctx.lineTo(enemy.x + dx - r * 0.1, enemy.y + r * 0.65); ctx.stroke();
    }
    ctx.globalAlpha = 0.45 + pulse * 0.25; ctx.strokeStyle = '#e8d7a1'; ctx.lineWidth = low ? 1 : 1.5;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, r - 1, 0, Math.PI * 2); ctx.stroke();
    if (grow < 1 && !low) {
        ctx.strokeStyle = '#ffd27a'; ctx.globalAlpha = (1 - grow) * 0.8;
        const lineY = enemy.y + r - r * 2 * grow;
        const half = Math.sqrt(Math.max(0, r * r - (lineY - enemy.y) * (lineY - enemy.y)));
        ctx.beginPath(); ctx.moveTo(enemy.x - half, lineY); ctx.lineTo(enemy.x + half, lineY); ctx.stroke();
    }
    ctx.restore();
    if (!low) {
        ctx.save(); ctx.fillStyle = '#ada691';
        for (let i = 0; i < (_gfxLevel < 1 ? 4 : 2); i++) {
            const t = ((window._leoFxClock / 500 + i * 0.27) % 1);
            ctx.globalAlpha = 1 - t; ctx.fillRect(enemy.x + Math.sin(i * 7) * r * 0.7, enemy.y + r * 0.4 + t * 14, 2, 2);
        }
        ctx.restore();
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
