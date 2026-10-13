// Water artwork is cached once. Live effects only transform sprites and change opacity.
let _piscesRenderCache = null;
const _piscesBubblePulseEnd = new Float64Array(24);
let _piscesBubblePoints = 0, _piscesBubbleClock = 0;

function _piscesBake(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'));
    return c;
}

function _piscesSprites() {
    if (_piscesRenderCache) return _piscesRenderCache;
    const bubble = _piscesBake(32, 32, g => {
        const fill = g.createRadialGradient(12, 10, 1, 16, 16, 14);
        fill.addColorStop(0, 'rgba(218,250,255,0.42)'); fill.addColorStop(0.45, 'rgba(100,196,238,0.12)'); fill.addColorStop(1, 'rgba(127,119,221,0)');
        g.fillStyle = fill; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(140,221,252,0.65)'; g.lineWidth = 1;
        g.beginPath(); g.arc(16, 16, 10, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(228,251,255,0.85)'; g.beginPath(); g.arc(16, 16, 8, 3.8, 4.7); g.stroke();
    });
    const overflowBubble = _piscesBake(32, 32, g => {
        g.drawImage(bubble, 0, 0); g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#e6fbff'; g.fillRect(0, 0, 32, 32);
    });
    const mist = _piscesBake(128, 128, g => {
        for (const cloud of [[47,58,44,'rgba(127,119,221,0.68)'], [78,48,36,'rgba(97,164,242,0.52)'], [70,81,35,'rgba(107,133,230,0.50)']]) {
            const fill = g.createRadialGradient(cloud[0], cloud[1], 3, cloud[0], cloud[1], cloud[2]);
            fill.addColorStop(0, cloud[3]); fill.addColorStop(1, 'rgba(127,119,221,0)');
            g.fillStyle = fill; g.fillRect(0, 0, 128, 128);
        }
    });
    const current = _piscesBake(128, 128, g => {
        g.translate(64, 64);
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3;
            g.save(); g.rotate(a);
            const fill = g.createLinearGradient(-50, 0, 50, 0);
            fill.addColorStop(0, 'rgba(127,119,221,0)'); fill.addColorStop(0.45, 'rgba(127,119,221,0.3)'); fill.addColorStop(0.8, 'rgba(123,221,249,0.65)'); fill.addColorStop(1, 'rgba(162,235,255,0)');
            g.fillStyle = fill; g.beginPath(); g.moveTo(-46, -16);
            g.bezierCurveTo(-12, -61, 40, -40, 48, 5);
            g.bezierCurveTo(33, -34, -8, -44, -46, -16); g.fill();
            g.restore();
        }
    });
    const frames = [];
    for (let frame = 0; frame < 4; frame++) frames.push(_piscesBake(128, 80, g => {
        const sway = Math.sin(frame * Math.PI / 2) * 7;
        const fin = g.createLinearGradient(28, 18, 70, 65);
        fin.addColorStop(0, 'rgba(139,152,239,0.12)'); fin.addColorStop(0.55, 'rgba(117,206,247,0.55)'); fin.addColorStop(1, 'rgba(127,119,221,0.06)');
        g.fillStyle = fin; g.strokeStyle = 'rgba(154,221,250,0.48)'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(44, 39); g.bezierCurveTo(24, 25, 10, 16 + sway, 7, 18 + sway);
        g.quadraticCurveTo(18, 38 + sway, 10, 62 + sway); g.bezierCurveTo(22, 61 + sway, 35, 48, 44, 42); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(58, 31); g.quadraticCurveTo(59, 6 - sway / 2, 83, 19); g.lineTo(80, 32); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(63, 44); g.quadraticCurveTo(54, 68 + sway / 2, 81, 59); g.lineTo(83, 45); g.fill(); g.stroke();
        const body = g.createLinearGradient(45, 23, 88, 55);
        body.addColorStop(0, 'rgba(231,249,255,0.94)'); body.addColorStop(0.4, 'rgba(148,220,250,0.84)'); body.addColorStop(1, 'rgba(127,119,221,0.54)');
        g.fillStyle = body; g.strokeStyle = 'rgba(195,239,255,0.8)';
        g.beginPath(); g.moveTo(38, 40); g.bezierCurveTo(58, 18, 91, 20, 108, 38);
        g.quadraticCurveTo(112, 42, 104, 46); g.bezierCurveTo(81, 59, 59, 53, 38, 40); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(238,252,255,0.55)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(44, 39); g.bezierCurveTo(67, 27, 88, 29, 103, 38); g.stroke();
        g.strokeStyle = 'rgba(107,140,205,0.35)'; g.lineWidth = 0.7;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(54 + i * 6, 40, 6, -0.9, 0.9); g.stroke(); }
        g.beginPath(); g.moveTo(88, 31); g.quadraticCurveTo(84, 40, 91, 48); g.stroke();
        g.fillStyle = '#35587c'; g.beginPath(); g.arc(98, 35, 2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e6fbff'; g.beginPath(); g.arc(98.6, 34.4, 0.8, 0, Math.PI * 2); g.fill();
    }));
    const ripple = _piscesBake(128, 128, g => {
        g.strokeStyle = 'rgba(109,206,247,0.18)'; g.lineWidth = 7;
        g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(188,241,255,0.85)'; g.lineWidth = 1.8; g.stroke();
        g.strokeStyle = 'rgba(137,192,243,0.3)'; g.lineWidth = 1;
        g.beginPath(); g.arc(64, 64, 48, 0, Math.PI * 2); g.stroke();
    });
    const droplet = _piscesBake(40, 16, g => {
        const fill = g.createLinearGradient(2, 8, 36, 8);
        fill.addColorStop(0, 'rgba(119,181,235,0)'); fill.addColorStop(0.65, 'rgba(125,218,250,0.65)'); fill.addColorStop(1, 'rgba(235,252,255,0.95)');
        g.fillStyle = fill; g.beginPath(); g.moveTo(2, 8); g.quadraticCurveTo(34, -1, 37, 8); g.quadraticCurveTo(34, 17, 2, 8); g.fill();
    });
    const impactGlow = _piscesBake(128, 128, g => {
        const fill = g.createRadialGradient(64, 64, 4, 64, 64, 64);
        fill.addColorStop(0, 'rgba(235,253,255,0.85)'); fill.addColorStop(0.4, 'rgba(173,232,252,0.5)'); fill.addColorStop(1, 'rgba(137,215,249,0)');
        g.fillStyle = fill; g.fillRect(0, 0, 128, 128);
    });
    const brightFrames = [];
    for (let i = 0; i < frames.length; i++) brightFrames.push(_piscesBake(128, 80, g => {
        g.drawImage(frames[i], 0, 0); g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#e4fbff'; g.fillRect(0, 0, 128, 80);
    }));
    _piscesRenderCache = { bubble, overflowBubble, mist, current, frames, ripple, droplet, impactGlow, brightFrames };
    return _piscesRenderCache;
}

function _drawPiscesAura() {
    const now = performance.now();
    if (now >= window._cofAuraEnd || !_hasBuff('dong_chay_luan_hoi')) return;
    const remaining = window._cofAuraEnd - now;
    const fade = Math.min(1, (720 - remaining) / 120, remaining / 600);
    const low = _mobPerf || (window._gfxLevel || 0) >= 2;
    const sprite = _piscesSprites().mist;
    const size = Math.max(player.width, player.height) * 3;
    ctx.save(); ctx.translate(player.x, player.y);
    ctx.globalAlpha = fade * (low ? 0.35 : 0.23);
    if (!low) ctx.rotate(now / 12000);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    if (!low) {
        ctx.rotate(-now / 6000); ctx.globalAlpha = fade * 0.12;
        ctx.drawImage(sprite, -size * 0.44, -size * 0.44, size * 0.88, size * 0.88);
    }
    ctx.restore();
}

function _drawPiscesCurrent() {
    if (!_hasBuff('dong_chay_luan_hoi')) { _piscesBubblePoints = 0; return; }
    const progress = Math.min(1, window._piscesFlowMs / PISCES_FISH_COST_MS);
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2, sprites = _piscesSprites();
    const points = Math.min(24, Math.floor(window._piscesFlowMs / 1000));
    if (_piscesClock < _piscesBubbleClock || points < _piscesBubblePoints) {
        _piscesBubblePulseEnd.fill(0);
        if (_piscesClock < _piscesBubbleClock) _piscesBubblePoints = 0;
    }
    for (let i = _piscesBubblePoints; i < points; i++) _piscesBubblePulseEnd[i] = _piscesClock + 260;
    _piscesBubblePoints = points; _piscesBubbleClock = _piscesClock;
    const radius = 42 + progress * 22, phase = _piscesClock / 2200;
    ctx.save(); ctx.translate(player.x, player.y);
    if (progress > 0) {
        ctx.globalAlpha = 0.12 + progress * 0.38;
        if (!low) ctx.rotate(phase);
        ctx.drawImage(sprites.current, -radius * 1.3, -radius * 1.3, radius * 2.6, radius * 2.6);
    }
    ctx.restore();
    const count = low ? 4 : 12, perBubble = low ? 3 : 1;
    const regular = Math.min(12, points), overflow = Math.max(0, points - 12);
    const readyPulse = points >= 12 ? Math.sin(_piscesClock / 280) : 0;
    ctx.save();
    for (let i = 0; i < count; i++) {
        const filled = Math.max(0, Math.min(perBubble, regular - i * perBubble));
        const extra = Math.max(0, Math.min(perBubble, overflow - i * perBubble));
        let pulseEnd = 0;
        for (let j = 0; j < perBubble; j++) {
            pulseEnd = Math.max(pulseEnd, _piscesBubblePulseEnd[i * perBubble + j]);
            if (extra > j) pulseEnd = Math.max(pulseEnd, _piscesBubblePulseEnd[12 + i * perBubble + j]);
        }
        const bounce = pulseEnd > _piscesClock ? 0.3 * Math.sin(Math.PI * (1 - (pulseEnd - _piscesClock) / 260)) : 0;
        const size = (low ? 20 : 12) * (1 + bounce + readyPulse * 0.025);
        const angle = i * Math.PI * 2 / count - Math.PI / 2;
        const x = player.x + Math.cos(angle) * 58 - size / 2;
        const y = player.y + Math.sin(angle) * 58 - size / 2;
        ctx.globalAlpha = filled ? (0.10 + 0.65 * filled / perBubble) * (1 + readyPulse * 0.05) : 0.10;
        ctx.drawImage(!low && extra ? sprites.overflowBubble : sprites.bubble, x, y, size, size);
        if (low && extra) {
            ctx.globalAlpha = 0.75 * extra / perBubble * (1 + readyPulse * 0.05);
            ctx.drawImage(sprites.overflowBubble, x, y, size, size);
        }
    }
    ctx.restore();
}

function _drawPiscesFish() {
    if (!_hasBuff('dong_chay_luan_hoi')) return;
    const gfx = window._gfxLevel || 0, sprites = _piscesSprites();
    const bubbleCount = gfx >= 3 ? 4 : gfx === 2 ? 7 : gfx === 1 ? 11 : 16;
    ctx.save();
    for (const fish of _piscesFishPool) {
        if (!fish.active) continue;
        const forming = Math.min(1, fish.age / PISCES_FISH_FORM_MS);
        if (forming < 1) {
            for (let i = 0; i < bubbleCount; i++) {
                const angle = i * 2.39996 + forming * 0.7;
                const radius = (12 + i % 5 * 7) * (1 - forming);
                const size = 5 + i % 4 * 2;
                ctx.globalAlpha = 0.6 * Math.sin(Math.PI * (0.15 + forming * 0.7));
                ctx.drawImage(sprites.bubble, fish.x + Math.cos(angle) * radius - size / 2, fish.y + Math.sin(angle) * radius - size / 2, size, size);
            }
        }
        ctx.save(); ctx.translate(fish.x, fish.y); ctx.rotate(fish.angle);
        const fade = Math.min(1, (PISCES_FISH_FORM_MS + PISCES_FISH_LIFE_MS - fish.age) / 300);
        const tailCount = gfx >= 3 ? 1 : gfx === 2 ? 3 : 6;
        if (forming >= 1) for (let i = tailCount; i > 0; i--) {
            ctx.globalAlpha = fade * 0.07 * (1 - i / (tailCount + 1));
            ctx.drawImage(sprites.frames[Math.floor(fish.age / 100) % 4], -44 - i * 9, -19 + Math.sin(fish.age / 140 - i * 0.5) * 3, 72, 45);
            if (gfx < 3) {
                ctx.globalAlpha = fade * 0.24;
                ctx.drawImage(sprites.bubble, -40 - i * 12, Math.sin(fish.age / 160 + i) * 9, 5 + i, 5 + i);
            }
        }
        const reacting = !_mobPerf && gfx < 2 && fish.hitMs > 0;
        if (reacting) {
            const pulse = Math.sin(Math.PI * (1 - fish.hitMs / 140));
            ctx.scale(1 + pulse * 0.08, 1 - pulse * 0.06);
        }
        ctx.globalAlpha = Math.max(0, (forming - 0.35) / 0.65) * 0.85 * fade;
        const frame = gfx >= 3 ? 0 : Math.floor(fish.age / 100) % 4;
        ctx.drawImage(sprites.frames[frame], -36, -22.5, 72, 45);
        if (reacting) {
            ctx.globalAlpha = 0.55 * fish.hitMs / 140 * fade;
            ctx.drawImage(sprites.brightFrames[frame], -36, -22.5, 72, 45);
        }
        ctx.restore();
    }
    for (const fx of _piscesFxPool) {
        if (fx.life <= 0 || fx.kind === 1 || fx.kind === 3) continue;
        const t = fx.age / fx.life;
        const count = gfx >= 3 ? 3 : gfx === 2 ? 5 : 8;
        for (let i = 0; i < count; i++) {
            const angle = i * 2.39996;
            const radius = fx.kind === 0 ? 8 + 20 * t : 5 + 26 * t;
            const size = 5 + i % 3 * 3;
            ctx.globalAlpha = 0.25 * (1 - t);
            ctx.drawImage(sprites.bubble, fx.x + Math.cos(angle) * radius - size / 2, fx.y + Math.sin(angle) * radius - size / 2, size, size);
        }
    }
    ctx.restore();
}

function _drawPiscesImpacts() {
    if (!_hasBuff('dong_chay_luan_hoi')) return;
    const gfx = window._gfxLevel || 0, low = _mobPerf || gfx >= 2;
    const sprites = _piscesSprites();
    ctx.save();
    for (const fx of _piscesFxPool) {
        if (fx.life <= 0 || (fx.kind !== 1 && fx.kind !== 3)) continue;
        const t = fx.age / fx.life, blocked = fx.kind === 3;
        const size = fx.size * (blocked ? 0.6 : 1);
        if (!low && !blocked && fx.enemy && fx.age < 90) {
            const glowSize = size * 1.6;
            ctx.globalAlpha = 0.65 * (1 - fx.age / 90);
            ctx.drawImage(sprites.impactGlow, fx.enemy.x - glowSize / 2, fx.enemy.y - glowSize / 2, glowSize, glowSize);
        }
        const diameter = size * (0.35 + t * 1.1);
        ctx.globalAlpha = 0.75 * (1 - t);
        ctx.drawImage(sprites.ripple, fx.x - diameter / 2, fx.y - diameter / 2, diameter, diameter);
        const count = low ? (gfx >= 3 ? 3 : 4) : gfx === 1 ? 8 : 12;
        ctx.save(); ctx.translate(fx.x, fx.y); ctx.rotate(fx.angle + (blocked ? Math.PI : 0));
        for (let i = 0; i < count; i++) {
            const spread = (i / (count - 1) - 0.5) * 1.8;
            const distance = (10 + size * (0.32 + i % 3 * 0.06)) * Math.pow(t, 0.6);
            const length = (10 + size * 0.11) * (1 - t * 0.45);
            ctx.save(); ctx.translate(Math.cos(spread) * distance, Math.sin(spread) * distance); ctx.rotate(spread);
            ctx.globalAlpha = (blocked ? 0.55 : 0.8) * (1 - t);
            ctx.drawImage(sprites.droplet, -length * 0.4, -length * 0.2, length, length * 0.4);
            ctx.restore();
        }
        ctx.restore();
    }
    ctx.restore();
}

