// Dawn Herald artwork is baked once. Live passes only transform cached sprites.
let _dauRenderCache = null;
const _dauChargeParticles = [];
for (let i = 0; i < 24; i++) _dauChargeParticles.push({ phase: i * 0.618034, angle: i * 2.39996, feather: i % 4 === 0 });

function _dauBake(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    return c;
}

function _dauSprites() {
    if (_dauRenderCache) return _dauRenderCache;
    const glow = _dauBake(128, 128, g => {
        const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, '#fff9db'); grad.addColorStop(0.13, '#ffe685');
        grad.addColorStop(0.38, 'rgba(255,185,42,0.35)'); grad.addColorStop(1, 'rgba(255,155,24,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    });
    const ring = _dauBake(768, 768, g => {
        const grad = g.createRadialGradient(384, 384, 285, 384, 384, 375);
        grad.addColorStop(0, 'rgba(255,168,28,0)'); grad.addColorStop(0.7, 'rgba(255,190,40,0.16)');
        grad.addColorStop(0.91, 'rgba(255,220,99,0.55)'); grad.addColorStop(0.96, '#fff7bf');
        grad.addColorStop(1, 'rgba(255,224,102,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(384, 384, 375, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff7cd'; g.lineWidth = 2;
        g.beginPath(); g.arc(384, 384, 362, 0, Math.PI * 2); g.stroke();
    });
    const thinRing = _dauBake(512, 512, g => {
        g.strokeStyle = '#FFD23F'; g.lineWidth = 2;
        g.beginPath(); g.arc(256, 256, 249, 0, Math.PI * 2); g.stroke();
    });
    const ray = _dauBake(64, 512, g => {
        const grad = g.createLinearGradient(0, 0, 64, 0);
        grad.addColorStop(0, 'rgba(255,211,63,0)'); grad.addColorStop(0.5, 'rgba(255,244,190,0.65)'); grad.addColorStop(1, 'rgba(255,211,63,0)');
        g.fillStyle = grad; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 0); g.lineTo(33, 512); g.lineTo(31, 512); g.fill();
        g.globalCompositeOperation = 'destination-in';
        const fade = g.createLinearGradient(0, 0, 0, 512);
        fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(0.45, '#fff'); fade.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = fade; g.fillRect(0, 0, 64, 512);
    });
    const dawn = _dauBake(16, 512, g => {
        const grad = g.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, 'rgba(255,155,60,0)'); grad.addColorStop(0.6, 'rgba(255,139,69,0.5)');
        grad.addColorStop(1, '#ffcf78'); g.fillStyle = grad; g.fillRect(0, 0, 16, 512);
    });
    const needle = _dauBake(128, 24, g => {
        g.drawImage(glow, 100, 0, 24, 24); g.fillStyle = '#ffe783';
        g.beginPath(); g.moveTo(5, 11); g.lineTo(98, 8); g.lineTo(126, 12); g.lineTo(98, 15); g.lineTo(5, 13); g.fill();
        g.strokeStyle = '#fffbe5'; g.lineWidth = 1; g.beginPath(); g.moveTo(14, 11); g.lineTo(119, 12); g.stroke();
        g.strokeStyle = '#b5741e'; g.beginPath(); g.ellipse(14, 12, 6, 1.5, 0, 0, Math.PI * 2); g.stroke();
    });
    const trail = _dauBake(256, 16, g => {
        const grad = g.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, 'rgba(255,168,28,0)'); grad.addColorStop(1, '#ffe8a0');
        g.fillStyle = grad; g.beginPath(); g.moveTo(0, 8); g.lineTo(256, 5); g.lineTo(256, 11); g.fill();
    });
    const feather = _dauBake(96, 32, g => {
        g.fillStyle = 'rgba(255,224,122,0.75)'; g.beginPath(); g.moveTo(6, 25);
        g.bezierCurveTo(25, -4, 71, -6, 89, 6); g.bezierCurveTo(59, 9, 44, 29, 6, 25); g.fill();
        g.strokeStyle = '#fff3cb'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(2, 29); g.quadraticCurveTo(46, 11, 90, 5); g.stroke();
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(20 + i * 10, 21 - i * 2); g.lineTo(25 + i * 9, 7); g.stroke(); }
    });
    const star = _dauBake(96, 96, g => {
        g.drawImage(glow, 0, 0, 96, 96); g.fillStyle = '#fff4bb'; g.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 5 : 36; g.lineTo(48 + Math.cos(a) * r, 48 + Math.sin(a) * r); }
        g.closePath(); g.fill();
    });
    const sun = _dauBake(96, 96, g => {
        g.drawImage(glow, 0, 0, 96, 96); g.strokeStyle = '#fff1a7'; g.lineWidth = 2;
        g.beginPath(); g.arc(48, 48, 13, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(48 + Math.cos(a) * 20, 48 + Math.sin(a) * 20); g.lineTo(48 + Math.cos(a) * 27, 48 + Math.sin(a) * 27); g.stroke(); }
    });
    const crack = _dauBake(256, 384, g => {
        g.drawImage(glow, 0, 40, 256, 320); g.strokeStyle = '#ffe58b'; g.lineWidth = 10;
        g.beginPath(); g.moveTo(153, 12); g.lineTo(92, 112); g.lineTo(140, 162); g.lineTo(110, 215); g.lineTo(151, 274); g.lineTo(110, 368); g.stroke();
        g.strokeStyle = '#fffbe4'; g.lineWidth = 3; g.stroke();
        g.lineWidth = 2; g.beginPath(); g.moveTo(92, 112); g.lineTo(38, 82); g.moveTo(110, 215); g.lineTo(211, 247); g.moveTo(151, 274); g.lineTo(216, 306); g.stroke();
    });
    const solar = _dauBake(640, 640, g => {
        const grad = g.createRadialGradient(320, 320, 15, 320, 320, 310);
        grad.addColorStop(0, '#fffde5'); grad.addColorStop(0.28, '#fff5b7');
        grad.addColorStop(0.42, '#ffd13f'); grad.addColorStop(0.63, 'rgba(255,119,16,0.3)');
        grad.addColorStop(1, 'rgba(255,81,0,0)'); g.fillStyle = grad; g.fillRect(0, 0, 640, 640);
        g.strokeStyle = 'rgba(255,201,67,0.75)'; g.lineWidth = 5;
        g.beginPath(); g.arc(320, 320, 136, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 32; i++) {
            const a = i * Math.PI / 16, r = 160 + (i % 5) * 12;
            g.save(); g.translate(320, 320); g.rotate(a); g.fillStyle = 'rgba(255,171,32,0.6)';
            g.beginPath(); g.moveTo(132, -10); g.quadraticCurveTo(r, -16, r + 38, 0);
            g.quadraticCurveTo(r - 9, 17, 135, 10); g.fill(); g.restore();
        }
    });
    const fireBand = _dauBake(192, 128, g => {
        const grad = g.createLinearGradient(0, 18, 0, 118);
        grad.addColorStop(0, '#fff6bd'); grad.addColorStop(0.07, '#ffe16a');
        grad.addColorStop(0.22, 'rgba(255,165,35,0.35)'); grad.addColorStop(1, 'rgba(255,128,0,0)');
        g.fillStyle = grad; g.fillRect(0, 18, 192, 100);
        g.strokeStyle = 'rgba(255,249,210,0.75)'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(0, 20);
        for (let i = 0; i <= 192; i += 6) g.lineTo(i, 20 + Math.sin(i * 0.035) * 0.8);
        g.stroke();
        g.strokeStyle = 'rgba(255,226,146,0.28)'; g.lineWidth = 1.5;
        for (const y of [40, 62, 88]) { g.beginPath(); g.moveTo(0, y); g.lineTo(192, y); g.stroke(); }
    });
    const roosters = [];
    for (let frame = 0; frame < 3; frame++) {
        roosters.push(_dauBake(640, 640, g => {
            g.translate(320, 365);
            const fire = g.createRadialGradient(36, -35, 12, 0, -20, 315);
            fire.addColorStop(0, '#fffce3'); fire.addColorStop(0.2, '#fff098');
            fire.addColorStop(0.48, '#ffc52a'); fire.addColorStop(0.8, '#ef6b10'); fire.addColorStop(1, 'rgba(211,49,5,0.3)');
            const paint = () => {
                g.fillStyle = fire; g.fill(); g.strokeStyle = 'rgba(255,125,15,0.8)'; g.lineWidth = 7; g.stroke();
                g.strokeStyle = '#ffe47a'; g.lineWidth = 2; g.stroke();
            };
            // Filled curved tail feathers rise behind the chest.
            for (let i = 0; i < 6; i++) {
                g.beginPath(); g.moveTo(-8, 86);
                g.bezierCurveTo(-142, 111, -124 - i * 11, -223 + i * 9, -265 + i * 18, -174 + i * 2);
                g.bezierCurveTo(-235 + i * 14, -223 + i * 2, -177 + i * 8, -235, -139, -105);
                g.bezierCurveTo(-121, -31, -107, 26, -8, 104); g.closePath(); paint();
            }
            // Long overlapping flight feathers spread outward and downward.
            for (const side of [-1, 1]) {
                g.save(); g.scale(side, 1);
                for (let layer = 0; layer < 2; layer++) {
                    for (let i = 7; i >= 0; i--) {
                        const x = 264 - i * 15 - layer * 25, y = 58 + i * 9 - layer * 22;
                        g.beginPath(); g.moveTo(13, -25 + layer * 10);
                        g.bezierCurveTo(87, -40, 143, 12, x, y);
                        g.bezierCurveTo(x + 8, y + 33, x - 10, y + 45, x - 42, y + 21);
                        g.bezierCurveTo(124, 43 + i * 6, 53, 50, 18, 46); g.closePath(); paint();
                    }
                }
                if (frame !== 0) {
                    g.fillStyle = '#ffdb62';
                    for (let i = 0; i < 9; i++) {
                        const x = 95 + i * 20, y = 55 + (i % 4) * 10;
                        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 15, y - 15, x + 12, y - 32 - frame * 4);
                        g.quadraticCurveTo(x + 29, y - 7, x + 19, y + 10); g.fill();
                    }
                }
                g.restore();
            }
            // The upright neck, open raised beak and lifted comb form the crowing pose.
            g.beginPath(); g.moveTo(-26, 113); g.bezierCurveTo(-74, 88, -74, 1, -28, -40);
            g.bezierCurveTo(-9, -57, -20, -131, 13, -172);
            g.bezierCurveTo(-15, -176, -19, -203, 2, -209);
            g.bezierCurveTo(-14, -241, 12, -259, 31, -225);
            g.bezierCurveTo(34, -267, 58, -267, 67, -224);
            g.bezierCurveTo(91, -249, 105, -224, 88, -205);
            g.bezierCurveTo(110, -197, 110, -175, 91, -157);
            g.bezierCurveTo(69, -129, 73, -62, 80, -26);
            g.bezierCurveTo(138, 46, 94, 132, 8, 123); g.closePath(); paint();
            g.beginPath(); g.moveTo(83, -198); g.lineTo(110, -247); g.lineTo(130, -263);
            g.lineTo(108, -185); g.closePath(); paint();
            g.beginPath(); g.moveTo(106, -174); g.lineTo(151, -201); g.lineTo(139, -161);
            g.lineTo(94, -145); g.closePath(); paint();
            g.beginPath(); g.moveTo(92, -141); g.bezierCurveTo(137, -138, 130, -86, 103, -91);
            g.bezierCurveTo(77, -96, 86, -119, 92, -141); paint();
            g.drawImage(glow, -32, -65, 150, 150); g.drawImage(glow, 25, -205, 94, 94);
            g.fillStyle = '#fffde0'; g.beginPath(); g.arc(86, -178, 4, 0, Math.PI * 2); g.fill();
        }));
    }
    const hud = [];
    for (let i = 0; i <= 120; i++) hud.push(_dauBake(96, 96, g => {
        if (!i) return;
        g.strokeStyle = '#FFD23F'; g.lineWidth = 2;
        g.beginPath(); g.arc(48, 48, 43, Math.PI * 0.1, Math.PI * (0.1 + 0.8 * i / 120)); g.stroke();
    }));
    const impacts = [];
    for (const count of [6, 3]) impacts.push(_dauBake(128, 128, g => {
        g.drawImage(glow, 24, 24, 80, 80); g.drawImage(thinRing, 17, 17, 94, 94);
        for (let i = 0; i < count; i++) {
            const a = i * Math.PI * 2 / count;
            g.drawImage(star, 57 + Math.cos(a) * 43, 57 + Math.sin(a) * 43, 14, 14);
        }
    }));
    _dauRenderCache = { glow, ring, thinRing, ray, dawn, needle, trail, feather, star, sun, crack, roosters, solar, fireBand, hud, impacts };
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
            const frame = gfx === 2 ? 0 : 1 + Math.floor(age / 100) % 2;
            _dauImage(s.roosters[frame], x, bodyY + (1 - rise) * 60, size * overshoot, size * overshoot, 0, alpha * 0.82);
        }
        if (age < 180) _dauImage(s.glow, x, y, 110, 110, 0, (1 - age / 180) * 0.75);
        if (age >= 500) {
            const t = (age - 500) / 800, count = gfx === 2 ? 16 : 32;
            for (let i = 0; i < count; i++) {
                const a = i * 2.39996, spread = 65 + t * (140 + i % 4 * 35);
                _dauImage(s.feather, x + Math.cos(a) * spread, bodyY + Math.sin(a) * spread * 0.4 - t * 180, 30 + i % 3 * 13, 16, a - t * 2, (1 - t) * 0.85);
                if (gfx < 2) _dauImage(s.star, x + Math.cos(a) * spread, bodyY + Math.sin(a) * spread * 0.4 - t * 180, 13, 13, a, (1 - t) * 0.6);
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
        for (let k = 0; k < segments; k++) {
            const a = k * Math.PI * 2 / segments + clock / 15000;
            const rr = radius - 42;
            _dauImage(s.fireBand, r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr, radius * Math.PI * 2 / segments * 1.12, 128, a + Math.PI / 2, alpha);
        }
        if (gfx < 2 && radius > DAU_RING_SPEED * 120) {
            const echo = radius - DAU_RING_SPEED * 120;
            _dauImage(s.ring, r.x, r.y, echo * 2, echo * 2, -clock / 17000, alpha * 0.38);
        }
        const count = gfx === 2 ? 24 : 48;
        for (let k = 0; k < count; k++) {
            const a = k * 2.39996 + clock / 9000, trailR = Math.max(0, radius - 18 - k % 4 * 17);
            _dauImage(k % 3 ? s.star : s.feather, r.x + Math.cos(a) * trailR, r.y + Math.sin(a) * trailR, k % 3 ? 10 : 30, k % 3 ? 10 : 13, a - 0.8, alpha * 0.72);
        }
    }
    if (gfx < 3) {
        const needles = window._dauNeedles;
        for (let i = 0; i < needles.length; i++) {
            const n = needles[i];
            if (n.kind !== 1 || !n.target || n.age >= 350) continue;
            const dx = n.target.x - n.sx, dy = n.target.y - n.sy, length = Math.hypot(dx, dy);
            _dauImage(s.trail, (n.sx + n.target.x) / 2, (n.sy + n.target.y) / 2, length, 6, Math.atan2(dy, dx), 0.32 + n.age / 1000);
            _dauImage(s.star, n.sx, n.sy, 42, 42, clock / 7000, 0.9);
            if (i > 0) {
                const p = needles[i - 1];
                if (p.kind === 1 && p.age < 350) {
                    const sx = n.sx - p.sx, sy = n.sy - p.sy;
                    _dauImage(s.trail, (n.sx + p.sx) / 2, (n.sy + p.sy) / 2, Math.hypot(sx, sy), 3, Math.atan2(sy, sx), 0.7);
                }
            }
        }
    }
    for (let i = 0; i < DAU_FX_MAX; i++) {
        const fx = window._dauFx[i];
        if (fx.life <= 0 || fx.age >= fx.life) continue;
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
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.hp <= 0) continue;
        if (gfx < 3 && e._dauPushFlashMs > 0) {
            const alpha = e._dauPushFlashMs / DAU_KNOCKBACK_MS;
            _dauImage(s.glow, e.x, e.y, Math.max(50, e.size * 1.5), Math.max(50, e.size * 1.5), 0, alpha * 0.75);
            if (gfx < 2) for (let k = 0; k < 4; k++) {
                _dauImage(s.trail, e.x + (k - 1.5) * e.size * 0.16, e.y + e.size / 2 + 22, 50 + e.size * 0.3, 5, -Math.PI / 2, alpha * 0.7);
                _dauImage(s.star, e.x + (k - 1.5) * e.size * 0.23, e.y + e.size / 2 + 40, 10, 10, k, alpha);
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
            _dauImage(s.trail, n.x - Math.cos(n.angle) * 60, n.y - Math.sin(n.angle) * 60, 130, 12, n.angle, 0.65);
        }
        _dauImage(s.needle, n.x, n.y - (n.kind === 2 ? 28 : 0), w, n.kind === 0 ? 10 : 18, n.kind === 2 ? Math.PI / 2 : n.angle, n.kind === 2 ? Math.min(1, n.pinMs / 200) : 1);
    }
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
    _dauImage(s.glow, x, y - 25, 55 + kindle * 65 + gather * 45, 55 + kindle * 65 + gather * 45, 0, kindle * (0.12 + pulse * 0.14));
    if (gfx < 2 && gather > 0) {
        const size = Math.min(448, canvas.width * 0.82);
        _dauImage(s.roosters[0], x, y - size * 0.32 - 25, size, size, 0, gather * (0.045 + peak * 0.22));
    }
    const cap = gfx === 0 ? 24 : gfx === 1 ? 16 : 8;
    for (let i = 0; i < cap; i++) {
        const part = _dauChargeParticles[i], active = _dauSmooth((p - 0.38 - i / cap * 0.3) / 0.12);
        const quiet = i < 2 && p < 0.4 ? _dauSmooth(p / 0.05) * (1 - _dauSmooth((p - 0.32) / 0.08)) : 0;
        const life = (p * (7 + gather * 8) + part.phase) % 1;
        const opacity = Math.sin(life * Math.PI) * Math.max(active * 0.7, quiet * 0.25);
        const radius = part.feather ? 30 + (1 - life) * 130 : 22 + (1 - peak) * (35 + i % 4 * 10);
        const a = part.angle + p * (10 + gather * 12);
        _dauImage(part.feather ? s.feather : s.star, x + Math.cos(a) * radius, y - 16 + Math.sin(a) * radius * 0.65, part.feather ? 23 : 10, part.feather ? 9 : 10, a, opacity);
    }
    if (gfx < 2 && gather > 0) {
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3, reach = Math.hypot(canvas.width, canvas.height) / 2;
            const t = (p * 12 + i / 6) % 1, r = reach * (1 - t);
            _dauImage(s.trail, x + Math.cos(a) * r, y + Math.sin(a) * r, 80 + peak * 30, 3, a + Math.PI, gather * Math.sin(t * Math.PI) * 0.14);
        }
    }
    if (peak > 0) {
        const radius = 160 * (1 - peak) + 25;
        _dauImage(s.thinRing, x, y, radius * 2, radius * 2, 0, peak * 0.55);
    }
}

function _drawDauHud() {
    if (!_hasBuff('kim_ke_bao_hieu') || gameState !== 'playing') return;
    const pct = Math.min(1, window._dauCrowTimer / DAU_CROW_INTERVAL_MS);
    const charge = _dauSmooth((pct - 0.9) / 0.1);
    const pulse = 0.5 + 0.5 * Math.sin(pct * 55 + charge * 18);
    const x = player.x + Math.sin(pct * 950) * charge;
    const size = Math.max(player.width, player.height) + 24;
    _dauImage(_dauSprites().hud[Math.floor(pct * 120)], x, player.y, size, size, 0, 0.35 + charge * (0.2 + pulse * 0.45));
}

_dauSprites();
