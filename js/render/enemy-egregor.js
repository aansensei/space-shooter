// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/enemy-egregor.js — extracted from render.js (base body + Psychic
// Tempest / Null Slash telegraph and strike effects). Runs to end of original file.

const _egTentPts = new Float32Array(17 * 3);
const _egNullPts = new Float32Array(39 * 3);
const _egBodyColors = ['#62d9d1', '#a493d8', '#c784d6', '#dd719f', '#ec637c', '#fa665d'];
let _egBodyArt = null;

function _bakeEgregorBodyArt() {
    const art = { body: [], aura: [], iris: [] };
    for (let rage = 0; rage <= 5; rage++) {
        const body = document.createElement('canvas'); body.width = body.height = 256;
        const g = body.getContext('2d');
        const gr = g.createRadialGradient(110, 90, 8, 128, 128, 132);
        gr.addColorStop(0, rage ? '#352139' : '#123c43'); gr.addColorStop(0.65, rage ? '#1d112b' : '#0a1b2e'); gr.addColorStop(0.9, rage ? '#4c2444' : '#15494c'); gr.addColorStop(1, _egBodyColors[rage]);
        g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = rage ? '#88455f' : '#27616a'; g.lineWidth = 0.8;
        for (let i = 0; i < 26; i++) {
            const a = i * 2.39996, x = 128 + Math.cos(a) * (36 + i % 6 * 14), y = 128 + Math.sin(a) * (32 + i % 5 * 17);
            g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 12, y - 9, x - 16, y - 23, x + 7, y - 39); g.stroke();
        }
        art.body.push(body);
        const aura = document.createElement('canvas'); aura.width = aura.height = 256;
        const ag = aura.getContext('2d'), glow = ag.createRadialGradient(128, 128, 26, 128, 128, 128);
        glow.addColorStop(0, rage ? 'rgba(182,43,94,0.35)' : 'rgba(38,129,154,0.25)'); glow.addColorStop(0.56, rage ? 'rgba(149,42,109,0.18)' : 'rgba(45,157,164,0.13)'); glow.addColorStop(1, 'rgba(55,6,75,0)');
        ag.fillStyle = glow; ag.fillRect(0, 0, 256, 256); art.aura.push(aura);
        const iris = document.createElement('canvas'); iris.width = iris.height = 64;
        const ig = iris.getContext('2d'), ir = ig.createRadialGradient(29, 26, 2, 32, 32, 30);
        ir.addColorStop(0, rage ? '#f9d3a3' : '#b1f6dc'); ir.addColorStop(0.4, rage ? '#cf777e' : '#57aeba'); ir.addColorStop(1, rage ? '#81314d' : '#23476a');
        ig.fillStyle = ir; ig.beginPath(); ig.arc(32, 32, 30, 0, Math.PI * 2); ig.fill();
        ig.strokeStyle = '#192138'; ig.lineWidth = 0.8;
        for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ig.beginPath(); ig.moveTo(32 + Math.cos(a) * 8, 32 + Math.sin(a) * 8); ig.lineTo(32 + Math.cos(a) * 29, 32 + Math.sin(a) * 29); ig.stroke(); }
        art.iris.push(iris);
    }
    return art;
}

function _egregorBodyPath(radius, now, segments) {
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
        const a = i / segments * Math.PI * 2;
        const wave = Math.sin(a * 4 + now * 0.0033) * 0.8 + Math.cos(a * 6 - now * 0.0028) * 0.5 + Math.sin(a * 3 + now * 0.004) * 0.4;
        const r = radius * (1 + wave * 8 / 110);
        if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
}

// Body textures always pass through this mask, including collapse and Guide rendering.
function _drawEgregorBodySurface(palette, radius, now, segments) {
    _egregorBodyPath(radius, now, segments);
    ctx.save(); ctx.clip();
    ctx.drawImage(_egBodyArt.body[palette], -radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
    ctx.restore();
}

function _drawEgregor(enemy) {
    if (!_egBodyArt) _egBodyArt = _bakeEgregorBodyArt();
    const now = performance.now(), sc = enemy.size / 220, BASE = 110 * sc, fo = window._fxOpts;
    const glow = !fo || fo.glow !== false, parts = !fo || fo.particles !== false, trails = !fo || fo.trails !== false;
    const rage = Math.min(5, enemy._rageStacks || 0), vr = enemy._visualRage === undefined ? rage : enemy._visualRage, pal = Math.min(5, Math.max(0, Math.ceil(vr)));
    const hit = Math.max(0, 1 - (now - (enemy._egBodyHitAt || -1000)) / 140), pulse = Math.max(0, 1 - (now - (enemy._ragePulseAt || -1000)) / 600);
    const breath = Math.sin(now * 0.0027), alive = 10 - (enemy._tentaclesLost || 0), tint = _egBodyColors[pal];
    if (!enemy._eyeBlinkTimers) enemy._eyeBlinkTimers = new Float32Array(4);
    if (!enemy._eyeNextBlinks) enemy._eyeNextBlinks = new Float32Array([2000, 2800, 1500, 3500]);
    if (enemy.y > -enemy.size * 0.75 && enemy.y < enemy.size * 0.7 && now - enemy._egSpawnAt < 10000) {
        const progress = (enemy.y / enemy.size + 0.75) / 1.45, open = Math.pow(Math.sin(progress * Math.PI), 0.6);
        _drawEgregorPortal(enemy.x, 8, enemy.size * 0.85 * open, now, 0.8 * open, false);
        ctx.save(); ctx.globalAlpha = open * 0.35; ctx.strokeStyle = '#a392c2'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const ph = (now * 0.0006 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(enemy.x, 8, enemy.size * (0.5 + ph * 0.5), 12 + ph * 20, 0, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
    }
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    if (glow) {
        const size = (300 + vr * 12 + breath * 8 + pulse * 30) * sc;
        ctx.globalAlpha = 0.8 + vr * 0.025; ctx.drawImage(_egBodyArt.aura[pal], -size, -size, size * 2, size * 2); ctx.globalAlpha = 1;
    }
    if (trails && vr > 1 && !_mobPerf && _gfxLevel < 2) {
        ctx.globalAlpha = Math.min(0.3, vr * 0.035); ctx.strokeStyle = tint; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let i = 0; i < 8; i++) { const x = Math.sin(i * 2.4) * BASE * 1.3, y = Math.cos(i * 2.4) * BASE; ctx.moveTo(x, y); ctx.lineTo(x, y - 14 - vr * 4); } ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (let ti = 0; ti < 10; ti++) {
        const angle = ti / 10 * Math.PI * 2, hp = enemy._tentacleHps ? enemy._tentacleHps[ti] : 1;
        const rootX = Math.cos(angle) * BASE * 0.42, rootY = Math.sin(angle) * BASE * 0.42;
        const lostAge = now - (enemy._tentLostAt ? enemy._tentLostAt[ti] : 0);
        if (hp <= 0) {
            const recoil = Math.max(0, 1 - lostAge / 600);
            ctx.strokeStyle = '#42384e'; ctx.lineWidth = 15 * sc; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(rootX, rootY); ctx.lineTo(rootX + Math.cos(angle) * (BASE * 0.43 + recoil * 18), rootY + Math.sin(angle) * (BASE * 0.43 + recoil * 18)); ctx.stroke();
            if (parts && lostAge < 650) {
                ctx.fillStyle = '#bbd6d0'; ctx.globalAlpha = 1 - lostAge / 650; ctx.beginPath();
                for (let i = 0; i < (_mobPerf ? 4 : 10); i++) { const a = angle + Math.sin(i * 2.4) * 0.9, d = lostAge * (0.03 + i % 3 * 0.024); ctx.ellipse(rootX + Math.cos(a) * (BASE * 0.6 + d), rootY + Math.sin(a) * (BASE * 0.6 + d) + lostAge * lostAge * 0.00005, 1.4 + i % 3, 1.1, a, 0, Math.PI * 2); } ctx.fill(); ctx.globalAlpha = 1;
            }
            continue;
        }
        if (ti === enemy._tempestTentacle && (enemy._tempestPhase === 'telegraphing' || enemy._tempestPhase === 'striking')) continue;
        const health = enemy._tentacleHps ? Math.min(1, hp / Math.ceil(enemy.maxHp * 0.8)) : 1;
        const flash = Math.max(0, 1 - (now - (enemy._tentHitAt ? enemy._tentHitAt[ti] : -1000)) / 150);
        const phase = ti * 2.39996 % (Math.PI * 2), speed = 0.8 + ti % 3 * 0.3;
        const length = (150 + ti % 5 * 16) * sc, segLen = length / 16;
        let x = rootX, y = rootY, a = angle;
        _egTentPts[0] = x; _egTentPts[1] = y; _egTentPts[2] = a;
        for (let i = 1; i <= 16; i++) {
            a += Math.sin(now / (rage ? 150 : 350) * speed + (i - 1) * 0.25 + phase) * 0.2;
            a = a * 0.95 + angle * 0.05; x += Math.cos(a) * segLen; y += Math.sin(a) * segLen;
            _egTentPts[i * 3] = x; _egTentPts[i * 3 + 1] = y; _egTentPts[i * 3 + 2] = a;
        }
        ctx.lineCap = 'round';
        const stride = _mobPerf || _gfxLevel >= 2 ? 2 : 1;
        for (let i = 0; i < 16; i += stride) {
            const taper = 1 - i / 17, width = 36 * sc * taper * (1 + rage * 0.05), j = i * 3;
            ctx.globalAlpha = 0.6 + health * 0.4; ctx.strokeStyle = rage ? '#54203f' : '#143c4a'; ctx.lineWidth = Math.max(0.5, width);
            ctx.beginPath(); ctx.moveTo(_egTentPts[j], _egTentPts[j + 1]); ctx.lineTo(_egTentPts[j + stride * 3], _egTentPts[j + stride * 3 + 1]); ctx.stroke();
            ctx.globalAlpha = (0.16 + health * 0.45) * (0.7 + 0.3 * Math.sin(now * 0.003 + ti + i * 0.2)); ctx.strokeStyle = tint; ctx.lineWidth = Math.max(0.5, width * 0.22); ctx.stroke();
            if (flash > 0) { ctx.globalAlpha = flash * taper; ctx.strokeStyle = '#f1e5f5'; ctx.lineWidth = width * 0.75; ctx.stroke(); }
            if (i > 1 && i % 2 === 0 && _gfxLevel < 2 && !_mobPerf) {
                const sx = _egTentPts[j] + Math.cos(_egTentPts[j + 2] - Math.PI / 2) * width * 0.4, sy = _egTentPts[j + 1] + Math.sin(_egTentPts[j + 2] - Math.PI / 2) * width * 0.4;
                ctx.globalAlpha = 0.3 + health * 0.6; ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.5, 3.3 * sc * taper), 0, Math.PI * 2); ctx.fill();
            }
            if (health < 0.45 && i % 3 === 0) {
                ctx.globalAlpha = 0.8; ctx.strokeStyle = '#100d1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(_egTentPts[j] - width * 0.3, _egTentPts[j + 1]); ctx.lineTo(_egTentPts[j] + width * 0.25, _egTentPts[j + 1] + width * 0.2); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(Math.sin(now * 0.15) * hit * 3, Math.cos(now * 0.1) * hit * 2); ctx.scale(1 + breath * 0.025, 1 - breath * 0.018);
    const segments = _gfxLevel < 2 && !_mobPerf ? 80 : 36;
    _drawEgregorBodySurface(pal, BASE, now, segments);
    ctx.save(); ctx.clip();
    if (hit > 0 || pulse > 0) { ctx.globalAlpha = hit * 0.55 + pulse * 0.18; ctx.fillStyle = '#e7d5e8'; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore(); ctx.strokeStyle = tint; ctx.lineWidth = (2 + vr * 0.35) * sc; ctx.stroke();
    if (alive > 0) {
        ctx.globalAlpha = alive / 10 * 0.24; ctx.strokeStyle = '#a9badb'; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1;
    }
    const gills = _mobPerf || _gfxLevel >= 2 ? 3 : 5;
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < gills; i++) {
        const light = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(now * 0.004 - i * 0.9), 2);
        ctx.save(); ctx.translate(side * 12 * sc, (10 + i * 12) * sc); ctx.rotate(side * (0.3 + breath * 0.12 + i * 0.1));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * 30 * sc, -8 * sc, side * 55 * sc, 15 * sc); ctx.quadraticCurveTo(side * 20 * sc, 25 * sc, 0, 0);
        ctx.fillStyle = rage ? '#44233c' : '#153e4b'; ctx.fill(); ctx.globalAlpha = light; ctx.strokeStyle = tint; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 4; i++) {
        const a = i === 0 ? -Math.PI / 3 : i === 1 ? -Math.PI * 2 / 3 : i === 2 ? -Math.PI / 6 + 0.2 : -Math.PI * 5 / 6 - 0.2;
        const d = i < 2 ? 30 : 55, er = (i < 2 ? 20 : 12) * sc, float = Math.sin(now * 0.002 + a) * 3 * sc;
        const ex = Math.cos(a) * (d * sc + float), ey = Math.sin(a) * (d * sc + float);
        if (now > enemy._eyeBlinkTimers[i] + enemy._eyeNextBlinks[i]) {
            enemy._eyeBlinkTimers[i] = now; enemy._eyeNextBlinks[i] = 2000 + Math.random() * 4000;
        }
        const phase = now - enemy._eyeBlinkTimers[i], blink = phase < 150 ? phase / 150 : phase < 300 ? 1 - (phase - 150) / 150 : 0;
        const look = Math.atan2(player.y - enemy.y - ey, player.x - enemy.x - ex) + Math.sin(now * 0.0012 + i) * 0.16;
        const px = Math.cos(look) * er * 0.32, py = Math.sin(look) * er * 0.32;
        ctx.save(); ctx.translate(ex, ey); ctx.scale(1, 1 - blink * 0.9); ctx.beginPath(); ctx.ellipse(0, 0, er, er * 0.92, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = rage ? '#ecd3d2' : '#d4e5e6'; ctx.fillRect(-er, -er, er * 2, er * 2);
        ctx.drawImage(_egBodyArt.iris[pal], px - er * 0.72, py - er * 0.72, er * 1.44, er * 1.44);
        ctx.fillStyle = '#0b0a17'; ctx.beginPath(); ctx.ellipse(px, py, er * (0.18 + (5 - rage) * 0.018), er * 0.48, look, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff4e5'; ctx.beginPath(); ctx.arc(px - er * 0.18, py - er * 0.22, er * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.strokeStyle = '#222136'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 0.92 * (1 - blink * 0.9), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (parts) {
        ctx.fillStyle = tint; ctx.beginPath(); ctx.globalAlpha = 0.45;
        for (let i = 0; i < (_mobPerf || _gfxLevel >= 2 ? 4 : 12); i++) { const ph = (now * 0.00015 + i * 0.618034) % 1, a = i * 2.39996 + now * 0.0001, r = BASE * (1.1 + ph * 0.75); ctx.rect(Math.cos(a) * r, Math.sin(a) * r - ph * 15, 1.2 + i % 2, 1.2 + i % 2); } ctx.fill(); ctx.globalAlpha = 1;
        const woundAge = now - (enemy._egBodyHitAt || -1000);
        if (woundAge >= 0 && woundAge < 450) {
            ctx.globalAlpha = 1 - woundAge / 450; ctx.fillStyle = '#bdcbd4'; ctx.beginPath();
            for (let i = 0; i < (_mobPerf ? 3 : 7); i++) { const a = i * 2.39996, d = BASE * 0.85 + woundAge * 0.035; ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d + woundAge * woundAge * 0.00016, 1.4 + i % 2, 2.4 + i % 2, a, 0, Math.PI * 2); } ctx.fill(); ctx.globalAlpha = 1;
        }
    }
    for (let i = 0; i < rage; i++) {
        const a = i / 5 * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * BASE * 1.25, y = Math.sin(a) * BASE * 1.25, s = 6 * sc;
        const left = enemy._rageEndTimes ? enemy._rageEndTimes[i] - now : 8000;
        ctx.globalAlpha = left < 1800 ? 0.4 + 0.6 * Math.pow(Math.sin(now * 0.008), 2) : 0.95;
        ctx.strokeStyle = '#db9baa'; ctx.fillStyle = '#57233e'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(x, y - s * 1.4); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 1.4); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f3d9c8'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.23, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const bw = enemy.size * 1.1, by = -enemy.size / 2 - 14;
    ctx.fillStyle = '#111020'; ctx.fillRect(-bw / 2, by, bw, 5); ctx.fillStyle = tint; ctx.fillRect(-bw / 2, by, bw * Math.max(0, enemy.hp / enemy.maxHp), 5);
    ctx.strokeStyle = tint; ctx.lineWidth = 0.8; ctx.strokeRect(-bw / 2, by, bw, 5);
    ctx.restore();
}
// Portals retain a crisp danger boundary at every graphics level.
function _drawEgregorPortal(x, y, radius, now, strength, blocked) {
    if (!_riftArt) _riftArt = _bakeRiftArt();
    const fo = window._fxOpts, glow = !fo || fo.glow !== false;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = strength;
    if (glow) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = strength * 0.4;
        ctx.drawImage(_riftArt.glow, -radius * 1.45, -radius, radius * 2.9, radius * 2);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = strength;
    ctx.save(); ctx.scale(1, 0.62); ctx.rotate(now * 0.00016);
    ctx.drawImage(_riftArt.portal, -radius, -radius, radius * 2, radius * 2); ctx.restore();
    ctx.strokeStyle = blocked ? '#7883a7' : '#b29ae9'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, radius * 0.91, radius * 0.56, -0.1, 0, Math.PI * 2); ctx.stroke();
    if ((!fo || fo.trails !== false) && !_mobPerf && _gfxLevel < 2) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = strength * 0.45; ctx.strokeStyle = '#d5b4fb'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const a = now * 0.0006 + i * 2.0944;
            ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.07, radius * 0.66, -0.1, a, a + 0.7); ctx.stroke();
        }
    }
    if ((!fo || fo.particles !== false) && !blocked) {
        ctx.fillStyle = '#d7c2f3'; ctx.globalAlpha = strength * 0.7; ctx.beginPath();
        const count = _mobPerf || _gfxLevel >= 2 ? 4 : 10;
        for (let i = 0; i < count; i++) {
            const ph = (now * 0.00055 + i * 0.618034) % 1, a = i * 2.39996 + ph * 0.8;
            const r = radius * (1.35 - ph * 0.7), s = 1.2 + (i % 3) * 0.6;
            ctx.rect(Math.cos(a) * r, Math.sin(a) * r * 0.6 - (1 - ph) * 8, s, s);
        }
        ctx.fill();
    }
    ctx.restore();
}

const _egPortalPts = new Float32Array(33 * 3);

function _drawEgregorPortalLimb(x, y, reach, bend, rage, fade, now, widthMult = 1, giant = false) {
    if (reach <= 0.1) return;
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = fade;
    const low = _mobPerf || _gfxLevel >= 2, segments = low ? 16 : 32;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments, j = i * 3;
        const taper = giant ? (0.5 + Math.sin(t * Math.PI * 0.88) * 1.15) * (1 - Math.pow(t, 14) * 0.98) : 1 - t * 0.98;
        _egPortalPts[j] = Math.sin(t * 2.8 + bend) * reach * t * (giant ? 0.48 : 0.42);
        _egPortalPts[j + 1] = -reach * t + Math.sin(t * Math.PI) * reach * 0.16;
        _egPortalPts[j + 2] = Math.max(0.5, taper * (20 + rage * 1.2) * widthMult) * 0.5;
    }
    ctx.beginPath();
    for (let side = -1; side <= 1; side += 2) for (let k = 0; k <= segments; k++) {
        const i = side < 0 ? k : segments - k, j = i * 3, prev = Math.max(0, i - 1) * 3, next = Math.min(segments, i + 1) * 3;
        const dx = _egPortalPts[next] - _egPortalPts[prev], dy = _egPortalPts[next + 1] - _egPortalPts[prev + 1], len = Math.hypot(dx, dy) || 1;
        const px = _egPortalPts[j] - dy / len * _egPortalPts[j + 2] * side, py = _egPortalPts[j + 1] + dx / len * _egPortalPts[j + 2] * side;
        if (side < 0 && !k) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = '#4d286e'; ctx.fill(); ctx.strokeStyle = '#160c27'; ctx.lineWidth = 3; ctx.stroke();
    // A wet highlight and the broad lit flank follow the bending skin.
    for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#d2b8e4' : '#805095'; ctx.lineWidth = pass ? 2 : (giant ? 12 : 5) * widthMult;
        ctx.globalAlpha = fade * (pass ? 0.7 : 0.85); ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const j = i * 3, px = _egPortalPts[j] - _egPortalPts[j + 2] * (pass ? 0.58 : 0.22), py = _egPortalPts[j + 1];
            if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = fade;
    for (let i = 2; i < segments - 1; i += low ? 3 : 4) {
        const j = i * 3, w = _egPortalPts[j + 2], sx = _egPortalPts[j] + w * 0.55, sy = _egPortalPts[j + 1];
        ctx.fillStyle = '#241431'; ctx.beginPath(); ctx.ellipse(sx, sy, w * 0.42, w * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c6a3d4'; ctx.lineWidth = low ? 0.8 : 1.3; ctx.stroke();
        ctx.fillStyle = '#a975bc'; ctx.beginPath(); ctx.ellipse(sx, sy, w * 0.2, w * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    if (!low && _gfxLevel === 0) {
        ctx.globalAlpha = fade * 0.4; ctx.strokeStyle = '#b786c8'; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let i = 5; i < segments - 2; i += 5) {
            const j = i * 3, w = _egPortalPts[j + 2]; ctx.moveTo(_egPortalPts[j] - w * 0.2, _egPortalPts[j + 1]); ctx.quadraticCurveTo(_egPortalPts[j] + w * 0.15, _egPortalPts[j + 1] - 9, _egPortalPts[j] + w * 0.7, _egPortalPts[j + 1] - 13);
        }
        ctx.stroke();
    }
    ctx.restore();
}
function _drawEgregorTempestTarget(t, now, life) {
    const warning = !t.struck, progress = Math.max(0, Math.min(1, 1 - t.countdown / 1200));
    const age = warning ? 0 : 700 - life, fo = window._fxOpts, rage = t.rage || 0;
    const glow = !fo || fo.glow !== false, parts = !fo || fo.particles !== false;
    const low = _mobPerf || _gfxLevel >= 2, blocked = t.blocked === true;
    const count = low ? 3 + (rage >= 3 ? 1 : 0) : 3 + Math.floor(rage * 0.6);
    const fade = warning ? 1 : Math.max(0, Math.min(1, life / 130));
    const openness = warning ? 0.16 + Math.pow(progress, 0.75) * 0.84 : Math.min(1, life / 190);
    const radius = (64 + rage * 2.3) * openness;
    const flicker = blocked ? 0.3 + 0.3 * Math.pow(Math.sin(now * 0.035), 2) : 1;
    // Gleam samples retain the cosmetic random cadence during the first impact.
    if (!warning && !t._echoAt && life > 550 && _gfxLevel < 2) {
        let gleam = 0;
        for (let i = 0; i < 12; i++) gleam += Math.random();
        t._vfxGleam = gleam / 12;
    }
    ctx.save(); ctx.shadowBlur = 0;
    if (warning) {
        ctx.globalAlpha = 0.07; ctx.fillStyle = '#a756ac'; ctx.beginPath(); ctx.arc(t.tx, t.ty, 100, 0, Math.PI * 2); ctx.fill();
    }
    _drawEgregorPortal(t.tx, t.ty, radius, now, fade * flicker, blocked);
    if (warning && progress > 0.75) {
        for (let i = 0; i < (low ? 2 : 3); i++) {
            const a = i * 2.39996, peek = (progress - 0.75) * 4;
            _drawEgregorPortalLimb(t.tx + Math.cos(a) * radius * 0.25, t.ty + Math.sin(a) * radius * 0.18, 16 + peek * 46, i * 1.8, rage, 0.65 + peek * 0.2, now, 0.9, true);
        }
        if (glow) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (progress - 0.75) * 1.5; ctx.drawImage(_riftArt.glow, t.tx - 90, t.ty - 65, 180, 130); ctx.globalCompositeOperation = 'source-over'; }
    } else if (!warning && life > 0) {
        if (!blocked) {
            const beat = Math.min(count - 1, Math.floor(age / 55));
            if (beat > (t._vfxBeat === undefined ? -1 : t._vfxBeat)) {
                t._vfxBeat = beat;
                if (window.AudioMgr && beat > 0) window.AudioMgr.playSfxAt('dimension-break', t.tx, t.ty);
                if (window._screenShakeEnabled !== false) _setShake(beat === 0 ? 8 : 3, beat === 0 ? 115 : 60);
            }
        }
        // Smaller rear limbs emerge first in draw order, with the largest limb in front.
        for (let pass = count - 1; pass >= 0; pass--) {
            const delay = pass === 0 ? 0 : 40 + (pass - 1) * 48, local = age - delay;
            if (local < 0) continue;
            const launch = Math.min(1, (local + (pass === 0 ? 22 : 0)) / 90);
            const retract = local < 255 ? 1 : Math.max(0, (700 - age) / 410);
            const grown = launch * launch * (3 - 2 * launch), a = pass * 2.39996;
            const main = pass === 0, width = (main ? 1.8 : 1.05) * (0.5 + grown * 0.5);
            const reach = (main ? 275 + rage * 14 : 190 + rage * 10 + pass % 2 * 30) * grown * retract * (blocked ? 0.26 : 1);
            const bx = t.tx + Math.cos(a) * radius * (main ? 0 : 0.44), by = t.ty + Math.sin(a) * radius * (main ? 0 : 0.28);
            const bend = (main ? -0.5 : a) + Math.sin(Math.min(1, local / 300) * Math.PI) * (main ? 1.5 : 0.8) + (t._vfxPhase || 0) * 0.001;
            ctx.globalAlpha = fade * 0.15; ctx.fillStyle = '#03020b';
            ctx.beginPath(); ctx.ellipse(bx + reach * 0.14, by + 15, 12 + reach * 0.14, 5 + reach * 0.045, 0.3, 0, Math.PI * 2); ctx.fill();
            _drawEgregorPortalLimb(bx, by, reach, bend, rage, fade * flicker, now, width, true);
        }
        if (!blocked && age < 430) {
            const pulse = 1 - age / 430, shock = Math.min(1, age / 160);
            ctx.globalAlpha = pulse * 0.75; ctx.strokeStyle = '#d9b8ec'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(t.tx, t.ty, 16 + shock * 84, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = Math.max(0, 1 - age / 100) * 0.8; ctx.strokeStyle = '#f3e2d3'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(t.tx, t.ty, 100, 0, Math.PI * 2); ctx.stroke();
            if (t.impact && glow) {
                ctx.globalAlpha = Math.max(0, 1 - age / 110) * (0.72 + (t._vfxGleam || 0.5) * 0.16); ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(_riftArt.nova, t.tx - 105, t.ty - 100, 210, 200);
                if (!low && _gfxLevel === 0 && (!fo || fo.screenFlash !== false)) {
                    ctx.globalAlpha = Math.max(0, 1 - age / 55) * 0.022; ctx.fillStyle = '#e2c9f2'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.globalCompositeOperation = 'source-over';
            }
            if (parts) {
                ctx.globalAlpha = pulse * 0.8; ctx.fillStyle = '#bd9ace'; ctx.strokeStyle = '#e3cfef'; ctx.lineWidth = 1;
                const debris = low ? 10 : _gfxLevel === 1 ? 22 : 42;
                ctx.beginPath();
                for (let i = 0; i < debris; i++) {
                    const a = i * 2.39996, r = 14 + age * (0.07 + i % 4 * 0.035), lift = Math.sin(Math.min(1, age / 430) * Math.PI) * (15 + i % 5 * 6);
                    const x = t.tx + Math.cos(a) * r, y = t.ty + Math.sin(a) * r * 0.65 - lift, s = 1.5 + i % 3;
                    ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s, y + s); ctx.closePath();
                }
                ctx.fill(); ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = fade * flicker; ctx.strokeStyle = '#bda0dd'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(t.tx, t.ty, radius * 0.91, radius * 0.56, -0.1, 0.12, Math.PI - 0.12); ctx.stroke();
    if (!warning && life < 210 && glow) {
        ctx.globalAlpha = fade * 0.35; ctx.strokeStyle = '#d7b8ef'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(t.tx, t.ty, radius * 1.15, radius * 0.7, -0.1, 0, Math.PI * 2); ctx.stroke();
    }
    // The danger boundary is always the last warning layer.
    if (warning) {
        ctx.globalAlpha = 0.85; ctx.strokeStyle = '#100c1c'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(t.tx, t.ty, 100, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.strokeStyle = progress > 0.75 ? '#f3d1c4' : '#d6a8d9'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.strokeStyle = '#f0c2a9'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(t.tx, t.ty, 100, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
        ctx.globalAlpha = 0.55; ctx.strokeStyle = '#d0a3d9'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(t.tx, t.ty, 16 + (1 - progress) * 76, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = '#f0c2a9';
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2;
            ctx.save(); ctx.translate(t.tx + Math.cos(a) * 100, t.ty + Math.sin(a) * 100); ctx.rotate(a);
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill(); ctx.restore();
        }
    }
    ctx.restore();
}
function _drawEgregorTempest(enemy, now) {
    const warning = enemy._tempestPhase === 'telegraphing', targets = enemy._tempestTargets;
    if (!targets.length) return;
    const first = targets[0], progress = Math.max(0, Math.min(1, 1 - first.countdown / 1200));
    const fade = warning ? 1 : Math.max(0, first.strikeLife / 700), rage = enemy._rageStacks || 0;
    const px = enemy._tempestPlantX, py = enemy._tempestPlantY, fo = window._fxOpts;
    const glow = !fo || fo.glow !== false, trails = !fo || fo.trails !== false, parts = !fo || fo.particles !== false;
    ctx.save(); ctx.shadowBlur = 0;
    if (Number.isFinite(px) && enemy._tempestTentacle >= 0) {
        const sc = enemy.size / 160, ext = warning ? Math.min(1, progress / 0.2) : Math.min(1, first.strikeLife / 420);
        const radius = (45 + rage * 2) * sc * Math.min(1, ext * 1.5), tension = warning ? Math.sin(now * 0.06) * sc : Math.max(0, first.strikeLife - 600) / 100 * 12;
        _drawEgregorPortal(px, py, radius, now, Math.min(1, ext * 1.5), false);
        if (warning && progress >= 0.12 && !enemy._tempestPlantPulse) {
            enemy._tempestPlantPulse = true;
            if (window._screenShakeEnabled !== false) _setShake(4, 95);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('dimension-break', px, py);
        }
        if (trails && ext > 0.4) {
            ctx.globalAlpha = fade * 0.45; ctx.strokeStyle = '#a28dbd'; ctx.lineWidth = 1; ctx.beginPath();
            const cracks = _mobPerf || _gfxLevel >= 2 ? 6 : 12;
            for (let i = 0; i < cracks; i++) {
                const a = i * 2.39996, ca = Math.cos(a), sa = Math.sin(a), r = radius * 1.2;
                ctx.moveTo(px + ca * radius * 0.7, py + sa * radius * 0.42);
                ctx.quadraticCurveTo(px + ca * r - sa * 6, py + sa * r * 0.55 + ca * 5, px + ca * r * 1.5, py + sa * r * 0.8);
            }
            ctx.stroke();
            const beat = ((progress * 1200 + (warning ? 0 : 700 - first.strikeLife)) % 360) / 360;
            ctx.globalAlpha = fade * (1 - beat) * 0.35; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(px, py, radius * (1 + beat), radius * (0.6 + beat * 0.6), 0, 0, Math.PI * 2); ctx.stroke();
        }
        const endX = enemy.x + (px - enemy.x) * ext, endY = enemy.y + 18 + (py - enemy.y - 18) * ext;
        const rootX = enemy.x, rootY = enemy.y + 18, c1x = enemy.x + (px - enemy.x) * 0.18, c1y = enemy.y - (65 + rage * 4) * ext;
        const c2x = px + (20 + tension) * ext, c2y = py - (90 + tension) * ext;
        ctx.lineCap = 'round';
        for (let pass = 0; pass < 4; pass++) {
            ctx.globalAlpha = fade; ctx.strokeStyle = pass === 0 ? '#160c27' : pass === 1 ? '#4c2b68' : pass === 2 ? '#80508e' : '#d7b6df';
            ctx.lineWidth = (pass === 0 ? 48 : pass === 1 ? 39 : pass === 2 ? 23 : 4) * sc * (1 + rage * 0.05);
            ctx.beginPath(); ctx.moveTo(rootX, rootY); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY); ctx.stroke();
        }
        ctx.globalAlpha = fade; ctx.strokeStyle = '#c5a0d4'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(px, py, radius * 0.9, radius * 0.55, -0.1, 0.08, Math.PI - 0.08); ctx.stroke();
        if (glow && ext > 0.5) {
            const t = (now * 0.0018) % 1, q = 1 - t;
            const bx = q * q * q * rootX + 3 * q * q * t * c1x + 3 * q * t * t * c2x + t * t * t * endX;
            const by = q * q * q * rootY + 3 * q * q * t * c1y + 3 * q * t * t * c2y + t * t * t * endY;
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * 0.55; ctx.drawImage(_riftArt.glow, bx - 22, by - 22, 44, 44); ctx.globalCompositeOperation = 'source-over';
        }
        if (trails) for (const t of targets) {
            const fill = warning ? Math.min(1, progress / 0.32) : 1, tx = px + (t.tx - px) * fill, ty = py + (t.ty - py) * fill;
            const branches = _mobPerf || _gfxLevel >= 2 ? 1 : 3;
            for (let b = 0; b < branches; b++) {
                const spread = (b - (branches - 1) * 0.5) * 16;
                ctx.globalAlpha = fade * (b === 0 ? 0.5 : 0.23); ctx.strokeStyle = '#9e6bba'; ctx.lineWidth = b === 0 ? 2.4 : 0.8;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.bezierCurveTo(px + (tx - px) * 0.3 + spread, py + 45 + spread, px + (tx - px) * 0.65 - spread, ty - 25 + spread, tx, ty); ctx.stroke();
            }
            if (glow && fill > 0.95) {
                const ph = (now * 0.0018) % 1, bx = px + (t.tx - px) * ph, by = py + (t.ty - py) * ph + Math.sin(ph * Math.PI) * 12;
                ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * 0.6; ctx.drawImage(_riftArt.glow, bx - 14, by - 14, 28, 28); ctx.globalCompositeOperation = 'source-over';
            }
        }
        if (parts && warning && progress > 0.12 && progress < 0.45) {
            const lift = (progress - 0.12) / 0.33;
            ctx.fillStyle = '#bfa8ce'; ctx.globalAlpha = 1 - lift; ctx.beginPath();
            for (let i = 0; i < (_mobPerf ? 6 : 16); i++) { const a = i * 2.39996, d = radius + lift * 38, x = px + Math.cos(a) * d, y = py + Math.sin(a) * d * 0.6 - Math.sin(lift * Math.PI) * 30; ctx.rect(x, y, 2 + i % 3, 2 + i % 3); } ctx.fill();
        }
    }
    ctx.restore();
    for (const t of targets) if (warning || t.strikeLife > 0) _drawEgregorTempestTarget(t, now, t.strikeLife);
}
// Egregor effect overlays: Psychic Tempest + Null Slash
function _drawEgregorEffects() {
    const now = performance.now(), egFo = window._fxOpts;
    const egGlow = !_mobPerf && _gfxLevel === 0 && (!egFo || egFo.glow !== false);
    for (let i = 0; typeof _egregorTempestScars !== 'undefined' && i < 24; i++) {
        const j = i * 3, age = now - _egregorTempestScars[j + 2];
        if (!_egregorTempestScars[j + 2] || age < 0 || age >= 300) continue;
        const fade = 1 - age / 300;
        ctx.save(); ctx.globalAlpha = fade * 0.35; ctx.strokeStyle = '#a783bf'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(_egregorTempestScars[j], _egregorTempestScars[j + 1], 30 * fade, 5 * fade, -0.15, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (let i = 0; typeof _egregorTempestEchoes !== 'undefined' && i < _egregorTempestEchoes.length; i++) {
        const t = _egregorTempestEchoes[i];
        if (!t) continue;
        const life = 700 - (now - t._echoAt);
        if (life <= 0) { _egregorTempestEchoes[i] = null; continue; }
        _drawEgregorTempestTarget(t, now, life);
    }
    for (const enemy of enemies) {
        if (enemy.type !== 'egregor') continue;
        ctx.save();

        // A quiet ornament brightens around nearby life and incoming souls.
        let linked = false;
        for (const other of enemies) {
            if (other === enemy || other.hp <= 0 || other.type.startsWith('enemy_bullet') || other.type === 'egregor') continue;
            const dx = other.x - enemy.x, dy = other.y - enemy.y;
            if (dx * dx + dy * dy < 360000) { linked = true; break; }
        }
        const soulPulse = Math.max(0, 1 - (now - (enemy._ragePulseAt || -1000)) / 900);
        ctx.save(); ctx.strokeStyle = '#aa81ba'; ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.025 + (linked ? 0.12 : 0) + soulPulse * 0.23;
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
            const a = i / 24 * Math.PI * 2 + now * 0.000018;
            ctx.arc(enemy.x, enemy.y, 600, a, a + 0.13);
            const x = enemy.x + Math.cos(a) * 600, y = enemy.y + Math.sin(a) * 600;
            ctx.moveTo(x, y); ctx.lineTo(enemy.x + Math.cos(a) * 594, enemy.y + Math.sin(a) * 594);
        }
        ctx.stroke(); ctx.restore();
        if (enemy._mindLinkFx) {
            const fo = window._fxOpts;
            for (let i = 0; i < 8; i++) {
                const j = i * 3, age = now - enemy._mindLinkFx[j + 2];
                if (!enemy._mindLinkFx[j + 2] || age < 0 || age >= 850) continue;
                const t = age / 850, q = t * t * (3 - 2 * t), x = enemy._mindLinkFx[j], y = enemy._mindLinkFx[j + 1];
                const sx = x + (enemy.x - x) * q + Math.sin(t * Math.PI) * 20, sy = y + (enemy.y - y) * q - Math.sin(t * Math.PI) * 25;
                ctx.save(); ctx.globalAlpha = Math.sin(t * Math.PI) * 0.65;
                if (!fo || fo.trails !== false) {
                    ctx.strokeStyle = '#b98aca'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + enemy.x) * 0.5 + 25, (y + enemy.y) * 0.5 - 30, enemy.x, enemy.y); ctx.stroke();
                }
                if (!fo || fo.glow !== false) { if (!_riftArt) _riftArt = _bakeRiftArt(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(_riftArt.glow, sx - 20, sy - 20, 40, 40); }
                ctx.globalAlpha = 0.9; ctx.fillStyle = '#e8c8ec'; ctx.beginPath(); ctx.ellipse(sx, sy, 3.5, 5.5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
        }
        if (enemy._tempestPhase === 'telegraphing' || enemy._tempestPhase === 'striking') _drawEgregorTempest(enemy, now);

        ctx.restore();
        ctx.save();
        if (typeof _capClipEnemyDraw === 'function') _capClipEnemyDraw(ctx,
            enemy._nullSlashPhase === 'striking' && enemy._nullSlashOriginX !== undefined ? enemy._nullSlashOriginX : enemy.x,
            enemy._nullSlashPhase === 'striking' && enemy._nullSlashOriginY !== undefined ? enemy._nullSlashOriginY : enemy.y, enemy);

        // NULL SLASH, CHARGING (semicircle telegraph + charge glow)
        if (enemy._nullSlashPhase === 'charging') {
            const progress = Math.min(1, (enemy._nullSlashWindupTimer || 0) / (enemy._nullSlashWindupDur || 3000));
            const rageStacks = enemy._rageStacks || 0;
            const R = canvas.width * 0.5 + rageStacks * 5;
            const ang = enemy._nullSlashAngle || (Math.PI / 2);
            ctx.save();

            // Semicircle: opens toward player (arc spans ±90° around the angle to player)
            const arcStart = ang - Math.PI / 2;
            const arcEnd   = ang + Math.PI / 2;
            const curR = R * (0.3 + 0.7 * progress);

            // Outer glow fill
            if (egGlow) {
                const sfg = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, curR);
                sfg.addColorStop(0, `rgba(80,0,180,${0.08 * progress})`);
                sfg.addColorStop(0.7, `rgba(120,0,220,${0.06 * progress})`);
                sfg.addColorStop(1, 'rgba(60,0,150,0)');
                ctx.fillStyle = sfg;
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
                ctx.closePath();
                ctx.fill();
            }

            // Pulsing arc border
            const pulseAlpha = 0.6 + 0.35 * Math.sin(now / 60);
            if (egGlow) { ctx.shadowColor = '#9900ff'; ctx.shadowBlur = egGlow ? (20 + progress * 15) : 0; }
            ctx.strokeStyle = `rgba(160,50,255,${pulseAlpha * progress})`;
            ctx.lineWidth = 3 + progress * 4;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
            ctx.stroke();

            // Flat diameter line (the chord closing the semicircle)
            const p1x = enemy.x + Math.cos(arcStart) * curR;
            const p1y = enemy.y + Math.sin(arcStart) * curR;
            const p2x = enemy.x + Math.cos(arcEnd) * curR;
            const p2y = enemy.y + Math.sin(arcEnd) * curR;
            ctx.strokeStyle = `rgba(200,100,255,${0.5 * progress})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 7]);
            ctx.lineDashOffset = -(now / 60) % 17;
            ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke();
            ctx.setLineDash([]); ctx.lineDashOffset = 0;
            ctx.shadowBlur = 0;

            // Rage: crackling void energy lines inside the charging arc (stack 1+, MED+)
            if (!_mobPerf && rageStacks >= 1 && progress > 0.20) {
                const rcCount = rageStacks * 3; // 3-15 bolts
                const rcCol   = rageStacks >= 4 ? 'rgba(180,240,255,' : rageStacks >= 2 ? 'rgba(170,90,255,' : 'rgba(140,40,220,';
                const rcGlow  = rageStacks >= 4 ? '#88ddff' : '#8800cc';
                ctx.save();
                ctx.shadowColor = rcGlow; ctx.shadowBlur = egGlow ? (rageStacks >= 3 ? 10 : 6) : 0;
                ctx.lineWidth = rageStacks >= 3 ? 1.8 : 1.2;
                for (let rc = 0; rc < rcCount; rc++) {
                    const rcBaseAng = arcStart + (rc / rcCount) * Math.PI;
                    const rcDist = curR * (0.15 + 0.55 * Math.abs(Math.sin(rc * 2.618)));
                    let bx = enemy.x + Math.cos(rcBaseAng) * rcDist;
                    let by = enemy.y + Math.sin(rcBaseAng) * rcDist;
                    const rcAlpha = progress * (0.4 + 0.35 * Math.sin(now / 90 + rc * 1.3));
                    ctx.strokeStyle = rcCol + rcAlpha + ')';
                    ctx.globalAlpha = 1;
                    ctx.beginPath(); ctx.moveTo(bx, by);
                    for (let s = 0; s < 4; s++) {
                        const sAng = rcBaseAng + Math.sin(rc * 4.37 + s * 2.09) * 0.7;
                        const sLen = curR * (0.06 - s * 0.01);
                        bx += Math.cos(sAng) * sLen;
                        by += Math.sin(sAng) * sLen;
                        ctx.lineTo(bx, by);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0; ctx.restore();
            }

            // Converging charge particles (MED+)
            if (_gfxLevel < 2 && progress > 0.15) {
                for (let cp = 0; cp < 8; cp++) {
                    const cpAngle = arcStart + (cp / 8) * Math.PI + (now / 500);
                    const cpDist = curR * (0.3 + 0.7 * ((now / 300 + cp * 0.7) % 1));
                    const cpX = enemy.x + Math.cos(cpAngle) * cpDist;
                    const cpY = enemy.y + Math.sin(cpAngle) * cpDist;
                    ctx.globalAlpha = progress * 0.7;
                    ctx.fillStyle = '#cc66ff';
                    ctx.beginPath(); ctx.arc(cpX, cpY, 3 + progress * 2, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Warning fill flash at >85% progress
            if (progress > 0.85) {
                const flashA = ((progress - 0.85) / 0.15) * 0.25;
                ctx.globalAlpha = flashA;
                ctx.fillStyle = 'rgba(120,0,220,1)';
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.arc(enemy.x, enemy.y, curR, arcStart, arcEnd);
                ctx.closePath();
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // NULL SLASH, STRIKING (arc slash, tentacle sweeps 180° through target)
        if (enemy._nullSlashPhase === 'striking') {
            const st  = enemy._nullSlashStrikeTimer || 0;
            const tx2 = enemy._nullSlashTargetX, ty2 = enemy._nullSlashTargetY;
            const cx  = enemy._nullSlashOriginX !== undefined ? enemy._nullSlashOriginX : enemy.x;
            const cy  = enemy._nullSlashOriginY !== undefined ? enemy._nullSlashOriginY : enemy.y;

            // Timing: shoot-out → arc sweep → retract (~950ms)
            const EXTEND = 200, SWEEP = 520, RETRACT = 230;
            const nsAng      = enemy._nullSlashAngle || Math.atan2(ty2 - cy, tx2 - cx);
            const rageStacks = enemy._rageStacks || 0;
            const rageSizeMult = 1 + rageStacks * 0.05;  // +5% tentacle size per stack
            const R          = Math.hypot(tx2 - cx, ty2 - cy) + rageStacks * 5; // +5px arc radius per stack
            const arcStart = nsAng - Math.PI / 2;
            const arcSpan  = Math.PI; // 180° sweep through target at midpoint

            let ext, sweepT;
            if (st < EXTEND) {
                ext = 1 - Math.pow(1 - st / EXTEND, 2.8);
                sweepT = 0;
            } else if (st < EXTEND + SWEEP) {
                const s = (st - EXTEND) / SWEEP;
                ext = 1.0;
                sweepT = s < 0.5 ? 2*s*s : -1+(4-2*s)*s; // ease-in-out
            } else {
                const r = (st - EXTEND - SWEEP) / RETRACT;
                ext = Math.pow(1 - r, 2.2);
                sweepT = 1.0;
            }

            if (ext > 0.01) {
            const tipAngle = arcStart + sweepT * arcSpan;

            const rST = sweepT, rE = ext;

            // Build rubber tentacle: base at Egregor, tip traces the arc
            // Rubber lag: base lags behind tip in sweep angle
            const steps = 38;
            const tentPts = _egNullPts;
            for (let i = 0; i <= steps; i++) {
                const tRaw = i / steps;
                const laggedST   = sweepT * Math.pow(tRaw, 0.5);
                const ptAngle    = arcStart + laggedST * arcSpan;
                const radius     = tRaw * R * ext;
                const radX = Math.cos(ptAngle), radY = Math.sin(ptAngle);
                // Radial wobble (rubber undulation in/out)
                const amp  = Math.pow(tRaw, 1.6) * 72 * ext;
                const ph   = tRaw * Math.PI * 3.4 - sweepT * Math.PI * 4.8;
                const wOff = Math.sin(ph) * amp
                           + Math.sin(tRaw*Math.PI*6.2 - sweepT*Math.PI*8) * Math.pow(tRaw,2.2) * 22 * ext;
                tentPts[i * 3] = cx + radius * radX + radX * wOff;
                tentPts[i * 3 + 1] = cy + radius * radY + radY * wOff;
                tentPts[i * 3 + 2] = 1 - tRaw;
            }

            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            // Arc sweep trail (motion blur showing where tip has been)
            if ((!egFo || egFo.trails !== false) && !_mobPerf && sweepT > 0.06 && sweepT < 0.96 && ext > 0.55) {
                for (let tr = 5; tr >= 1; tr--) {
                    const trST = Math.max(0, sweepT - tr * 0.10);
                    const trA  = arcStart + trST * arcSpan;
                    ctx.shadowColor = '#6600cc'; ctx.shadowBlur = egGlow ? (16) : 0;
                    ctx.strokeStyle = `rgba(100,0,200,${(6-tr)*0.022*ext})`;
                    ctx.lineWidth   = (6-tr) * 4 * ext;
                    ctx.beginPath(); ctx.arc(cx, cy, R * ext * 0.90, trA, tipAngle); ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Aura, glowing void halo around tentacle (rage 1+)
            if (egGlow && rageStacks >= 1) {
                ctx.shadowColor = rageStacks >= 3 ? '#bb77ff' : '#8800cc';
                ctx.shadowBlur = egGlow ? (28 + rageStacks * 12) : 0;
                const auraA = Math.min(0.32, (0.06 + rageStacks * 0.035) * ext);
                for (let si = 0; si < steps; si++) {
                    const p0 = si * 3, p1 = p0 + 3;
                    ctx.strokeStyle = `rgba(140,0,255,${auraA * tentPts[p0 + 2]})`;
                    ctx.lineWidth   = Math.max(8, 125 * tentPts[p0 + 2] * rageSizeMult);
                    ctx.beginPath(); ctx.moveTo(tentPts[p0], tentPts[p0 + 1]); ctx.lineTo(tentPts[p1], tentPts[p1 + 1]); ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            // Layer 0: void core
            if (egGlow) { ctx.shadowColor = '#1a0030'; ctx.shadowBlur = egGlow ? (45) : 0; }
            for (let si = 0; si < steps; si++) {
                const p0 = si * 3, p1 = p0 + 3;
                ctx.strokeStyle = `rgba(6,0,18,0.97)`;
                ctx.lineWidth = Math.max(2, 92 * tentPts[p0 + 2] * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(tentPts[p0], tentPts[p0 + 1]); ctx.lineTo(tentPts[p1], tentPts[p1 + 1]); ctx.stroke();
            }
            // Layer 1: deep purple body
            if (egGlow) { ctx.shadowColor = '#5500aa'; ctx.shadowBlur = egGlow ? (28) : 0; }
            for (let si = 0; si < steps; si++) {
                const p0 = si * 3, p1 = p0 + 3;
                ctx.strokeStyle = `rgba(85,0,165,${0.90 * ext})`;
                ctx.lineWidth = Math.max(1, 70 * tentPts[p0 + 2] * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(tentPts[p0], tentPts[p0 + 1]); ctx.lineTo(tentPts[p1], tentPts[p1 + 1]); ctx.stroke();
            }
            // Layer 2: bright outer skin
            if (egGlow) { ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = egGlow ? (16) : 0; }
            for (let si = 0; si < steps; si++) {
                const p0 = si * 3, p1 = p0 + 3;
                ctx.strokeStyle = `rgba(155,25,255,${0.72 * ext})`;
                ctx.lineWidth = Math.max(0.5, 46 * tentPts[p0 + 2] * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(tentPts[p0], tentPts[p0 + 1]); ctx.lineTo(tentPts[p1], tentPts[p1 + 1]); ctx.stroke();
            }
            // Layer 3: highlight stripe (follows local tangent)
            ctx.shadowBlur = 0;
            for (let si = 0; si < steps; si++) {
                const p0 = si * 3, p1 = p0 + 3;
                const sdx = tentPts[p1]-tentPts[p0], sdy = tentPts[p1 + 1]-tentPts[p0 + 1], sL = Math.hypot(sdx,sdy)||1;
                const hpX = -sdy/sL, hpY = sdx/sL, ho = 5 * tentPts[p0 + 2] * rageSizeMult;
                ctx.strokeStyle = `rgba(225,135,255,${0.42 * tentPts[p0 + 2] * ext})`;
                ctx.lineWidth = Math.max(0.5, 19 * tentPts[p0 + 2] * rageSizeMult);
                ctx.beginPath();
                ctx.moveTo(tentPts[p0]+hpX*ho, tentPts[p0 + 1]+hpY*ho); ctx.lineTo(tentPts[p1]+hpX*ho, tentPts[p1 + 1]+hpY*ho);
                ctx.stroke();
            }

            // Layer 4: thin spine
            if (egGlow) { ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = egGlow ? (12) : 0; }
            for (let si = 0; si < steps; si++) {
                const p0 = si * 3, p1 = p0 + 3;
                ctx.strokeStyle = `rgba(225,115,255,${0.42 * tentPts[p0 + 2] * ext})`;
                ctx.lineWidth = Math.max(0.5, 7 * tentPts[p0 + 2]);
                ctx.beginPath(); ctx.moveTo(tentPts[p0], tentPts[p0 + 1]); ctx.lineTo(tentPts[p1], tentPts[p1 + 1]); ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Suckers (MED+)
            if (_gfxLevel < 2) {
                for (let si = 2; si < steps - 1; si += 2) {
                    const p = si * 3;
                    const sr = Math.max(3, 15 * tentPts[p + 2]);
                    ctx.fillStyle = `rgba(28,0,65,${0.88 * ext})`;
                    ctx.beginPath(); ctx.arc(tentPts[p], tentPts[p + 1], sr, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = `rgba(185,65,255,${0.55 * ext})`;
                    ctx.beginPath(); ctx.arc(tentPts[p], tentPts[p + 1], sr * 0.42, 0, Math.PI * 2); ctx.fill();
                }
            }

            // The torn space is drawn here while the tip sweeps; once the sweep ends _dimBreakZones keeps it open
            if (st < EXTEND + SWEEP && rST > 0.04 && rE > 0.01) _drawEgregorRift(cx, cy, R, arcStart, arcSpan, rageStacks, rST, rE, now, 0);

            // Impact flash when tip sweeps through target (at midpoint of sweep)
            const impactSt = EXTEND + SWEEP * 0.5;
            const impA = Math.max(0, 1 - Math.abs(st - impactSt) / 115);
            if (impA > 0.04) {
                const impR = 110 + rageStacks * 20; // larger at rage
                if (egGlow) {
                    ctx.shadowColor = rageStacks >= 3 ? '#aaffff' : '#ff44ff';
                    ctx.shadowBlur = egGlow ? (45 + rageStacks * 8) : 0;
                }
                ctx.globalAlpha = impA * 0.92;
                if (egGlow) {
                    const c1 = rageStacks >= 4 ? 'rgba(210,255,255,1.0)'
                             : rageStacks >= 2 ? 'rgba(210,160,255,1.0)'
                             :                  'rgba(255,210,255,1.0)';
                    const c2 = rageStacks >= 4 ? 'rgba(100,220,255,0.90)'
                             : rageStacks >= 2 ? 'rgba(170,60,255,0.90)'
                             :                  'rgba(230,80,255,0.90)';
                    const impG = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, impR);
                    impG.addColorStop(0,   c1);
                    impG.addColorStop(0.2, c2);
                    impG.addColorStop(0.6, 'rgba(110,0,230,0.45)');
                    impG.addColorStop(1,   'rgba(55,0,180,0)');
                    ctx.fillStyle = impG;
                    ctx.beginPath(); ctx.arc(tx2, ty2, impR, 0, Math.PI * 2); ctx.fill();
                } else if (!egFo || egFo.glow !== false) {
                    if (!_riftArt) _riftArt = _bakeRiftArt();
                    ctx.drawImage(_riftArt.glow, tx2 - impR, ty2 - impR, impR * 2, impR * 2);
                }
                // Outer void ring (rage 2+)
                if (!_mobPerf && rageStacks >= 2) {
                    ctx.globalAlpha = impA * 0.55;
                    ctx.strokeStyle = rageStacks >= 4 ? 'rgba(180,255,255,0.85)' : 'rgba(165,80,255,0.85)';
                    ctx.lineWidth   = 1.5 + rageStacks * 0.5;
                    ctx.beginPath(); ctx.arc(tx2, ty2, impR * 1.35, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            }

            ctx.globalAlpha = 1; ctx.restore();
            } // end ext > 0.01
        }

        ctx.restore();
    }
}

// Baked space layers and reusable geometry keep the tear allocation free after warmup.
const _RIFT_N = 60;
const _riftIn = new Float32Array((_RIFT_N + 1) * 2);
const _riftOut = new Float32Array((_RIFT_N + 1) * 2);
const _riftMid = new Float32Array((_RIFT_N + 1) * 2);
const _riftSeeds = new Float32Array(64 * 4);
let _riftArt = null;

function _warmEgregorRiftArt() {
    if (typeof ctx === 'undefined' || !ctx) return;
    if (!_riftArt) _riftArt = _bakeRiftArt();
    if (!_egBodyArt) _egBodyArt = _bakeEgregorBodyArt();
}
if (typeof requestIdleCallback === 'function') requestIdleCallback(_warmEgregorRiftArt, { timeout: 2000 });
else setTimeout(_warmEgregorRiftArt, 0);

function _bakeRiftArt() {
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const blob = (g, x, y, r, rgb, a) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    let seed = 71;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < _riftSeeds.length; i++) _riftSeeds[i] = rnd();
    const nebula = mk(512, 512), ng = nebula.getContext('2d');
    const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7 + 17.3) * 43758.5453; return v - Math.floor(v); };
    const noise = (x, y, cells) => {
        x *= cells; y *= cells;
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        const a = hash(ix % cells, iy % cells), b = hash((ix + 1) % cells, iy % cells);
        const c = hash(ix % cells, (iy + 1) % cells), d = hash((ix + 1) % cells, (iy + 1) % cells);
        return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
    };
    const pixels = ng.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const u = x / 512, v = y / 512;
        const cloud = noise(u, v, 4) * 0.48 + noise(u, v, 8) * 0.27 + noise(u, v, 16) * 0.16 + noise(u, v, 32) * 0.09;
        const density = Math.pow(Math.max(0, cloud - 0.27) * 2, 1.8);
        const filament = Math.pow(1 - Math.abs(noise(u, v, 16) * 2 - 1), 8) * density;
        const j = (y * 512 + x) * 4, warm = noise(u, v, 8);
        pixels.data[j] = 10 + density * (90 + warm * 100) + filament * 38;
        pixels.data[j + 1] = 3 + density * 24 + filament * 36;
        pixels.data[j + 2] = 24 + density * 153 + filament * 65;
        pixels.data[j + 3] = 255;
    }
    ng.putImageData(pixels, 0, 0); ng.globalCompositeOperation = 'lighter';
    const veil = mk(512, 512), vg = veil.getContext('2d');
    // Periodic clouds wrap in both axes without a visible texture boundary.
    for (let i = 0; i < 28; i++) {
        const x = rnd() * 512, y = rnd() * 512, r = 35 + rnd() * 115, alpha = 0.16 + rnd() * 0.13;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
            blob(ng, x + a * 512, y + b * 512, r, i % 3 ? '92,29,180' : '155,30,125', alpha);
            if (i < 12) blob(vg, x + a * 512, y + b * 512, r * 0.6, i % 3 ? '144,66,224' : '108,155,204', 0.23);
        }
    }
    ng.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 700; i++) {
        ng.globalAlpha = 0.12 + rnd() * 0.5; ng.fillStyle = i % 7 ? '#c6a2ed' : '#f3dfbc';
        ng.fillRect(rnd() * 512, rnd() * 512, i % 9 ? 0.7 : 1.3, i % 9 ? 0.7 : 1.3);
    }
    const galaxy = mk(192, 192), gg = galaxy.getContext('2d');
    gg.translate(96, 96); gg.scale(1, 0.65); gg.globalCompositeOperation = 'lighter';
    blob(gg, 0, 0, 90, '116,52,213', 0.3);
    for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 65; i++) {
        const t = i / 65, a = arm * 2.0944 + t * 5.4, rr = 4 + t * 80;
        blob(gg, Math.cos(a) * rr, Math.sin(a) * rr, 3 + 9 * (1 - t), arm === 1 ? '155,153,247' : '216,104,238', 0.3 * (1 - t * 0.65));
        for (let s = 0; s < 3; s++) {
            const scatter = (rnd() - 0.5) * 9;
            gg.fillStyle = s ? '#b9a6f5' : '#f3dbc7'; gg.globalAlpha = 0.25 + rnd() * 0.5;
            gg.fillRect(Math.cos(a) * rr + scatter, Math.sin(a) * rr + (rnd() - 0.5) * 7, 0.7, 0.7); gg.globalAlpha = 1;
        }
    }
    blob(gg, 0, 0, 18, '248,207,139', 0.7);
    const planet = mk(160, 128), pg = planet.getContext('2d');
    pg.translate(80, 64); pg.rotate(-0.36);
    pg.strokeStyle = '#5987a0'; pg.lineWidth = 3; pg.beginPath(); pg.ellipse(0, 0, 65, 17, 0, Math.PI, Math.PI * 2); pg.stroke();
    const sphere = pg.createRadialGradient(-10, -12, 1, 4, 4, 31);
    sphere.addColorStop(0, '#b0c8cf'); sphere.addColorStop(0.34, '#457d9e'); sphere.addColorStop(0.74, '#153049'); sphere.addColorStop(1, '#030916');
    pg.fillStyle = sphere; pg.beginPath(); pg.arc(0, 0, 30, 0, Math.PI * 2); pg.fill();
    pg.strokeStyle = '#c1ac87'; pg.lineWidth = 2; pg.beginPath(); pg.ellipse(0, 0, 65, 17, 0, 0, Math.PI); pg.stroke();
    pg.strokeStyle = '#6f788c'; pg.lineWidth = 5; pg.beginPath(); pg.ellipse(0, 0, 57, 14, 0, 0, Math.PI); pg.stroke();
    const hole = mk(160, 128), hg = hole.getContext('2d');
    hg.translate(80, 64); blob(hg, 0, 0, 60, '84,133,229', 0.3);
    hg.strokeStyle = '#604f83'; hg.lineWidth = 10; hg.beginPath(); hg.ellipse(0, 0, 58, 15, -0.25, 0, Math.PI * 2); hg.stroke();
    hg.strokeStyle = '#d0a673'; hg.lineWidth = 3; hg.beginPath(); hg.ellipse(0, 0, 55, 13, -0.25, 0, Math.PI * 2); hg.stroke();
    hg.strokeStyle = '#8baeca'; hg.lineWidth = 1.6; hg.beginPath(); hg.arc(0, 0, 23, Math.PI, Math.PI * 2); hg.stroke();
    hg.fillStyle = '#01020a'; hg.beginPath(); hg.arc(0, 0, 20, 0, Math.PI * 2); hg.fill();
    hg.strokeStyle = '#f0d5a9'; hg.lineWidth = 1.8; hg.beginPath(); hg.ellipse(0, 3, 57, 10, -0.25, 0, Math.PI); hg.stroke();
    const glow = mk(96, 96), gl = glow.getContext('2d');
    blob(gl, 48, 48, 48, '145,42,239', 0.5); blob(gl, 48, 48, 20, '206,141,255', 0.7); blob(gl, 48, 48, 6, '255,235,215', 0.95);
    const pillar = mk(192, 192), pp = pillar.getContext('2d');
    pp.globalCompositeOperation = 'lighter';
    for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 30; i++) {
        const t = i / 30, x = 46 + arm * 44 + Math.sin(t * 5 + arm) * 11, y = 160 - t * (105 + arm * 12);
        blob(pp, x, y, 10 + (1 - t) * 16, '151,66,214', 0.2);
        blob(pp, x - 6, y - 3, 4 + (1 - t) * 8, '235,143,230', 0.3);
    }
    const nova = mk(128, 128), nv = nova.getContext('2d');
    blob(nv, 64, 64, 64, '144,31,235', 0.6); blob(nv, 64, 64, 22, '245,160,255', 0.9); blob(nv, 64, 64, 6, '255,245,224', 1);
    nv.strokeStyle = '#f4daff'; nv.lineWidth = 1;
    nv.beginPath(); nv.moveTo(12, 64); nv.lineTo(116, 64); nv.moveTo(64, 30); nv.lineTo(64, 98); nv.stroke();
    const portal = mk(192, 192), po = portal.getContext('2d');
    po.save(); po.beginPath(); po.arc(96, 96, 85, 0, Math.PI * 2); po.clip();
    po.fillStyle = ng.createPattern(nebula, 'repeat'); po.translate(-64, -128); po.fillRect(64, 128, 192, 192); po.restore();
    po.globalCompositeOperation = 'lighter'; po.globalAlpha = 0.55; po.drawImage(galaxy, 26, 26, 140, 140); po.globalAlpha = 1;
    const well = po.createRadialGradient(96, 96, 20, 96, 96, 88);
    well.addColorStop(0, 'rgba(8,3,26,0)'); well.addColorStop(0.6, 'rgba(7,2,20,0.2)'); well.addColorStop(0.91, 'rgba(5,2,17,0.95)'); well.addColorStop(1, 'rgba(99,64,155,0)');
    po.globalCompositeOperation = 'source-over'; po.fillStyle = well; po.fillRect(0, 0, 192, 192);
    po.strokeStyle = '#724b99'; po.lineWidth = 4; po.beginPath(); po.arc(96, 96, 84, 0, Math.PI * 2); po.stroke();
    po.strokeStyle = '#c7a8e4'; po.lineWidth = 1.2; po.beginPath(); po.arc(96, 96, 86, 0, Math.PI * 2); po.stroke();
    return { nebula: ctx.createPattern(nebula, 'repeat'), veil: ctx.createPattern(veil, 'repeat'), galaxy, planet, hole, glow, pillar, nova, portal };
}

function _riftTrace(a, n) {
    ctx.moveTo(a[0], a[1]);
    for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(a[i * 2], a[i * 2 + 1], (a[i * 2] + a[i * 2 + 2]) * 0.5, (a[i * 2 + 1] + a[i * 2 + 3]) * 0.5);
    ctx.lineTo(a[n * 2 - 2], a[n * 2 - 1]);
}

// The existing openness value seals the two ends toward the center.
function _drawEgregorRift(cx, cy, R, arcStart, arcSpan, rage, rST, rE, now, flare) {
    if (rE <= 0 || rST <= 0.01) return;
    if (!_riftArt) _riftArt = _bakeRiftArt();
    const art = _riftArt, fo = window._fxOpts;
    const parts = !fo || fo.particles !== false, glow = !fo || fo.glow !== false, trails = !fo || fo.trails !== false;
    const gl = _mobPerf ? 2 : _gfxLevel, N = gl >= 2 ? 36 : _RIFT_N, n = N + 1;
    const baseR = R * 0.96, closing = rST >= 0.999 ? (1 - rE) * 0.49 : 0;
    const start = closing, end = Math.max(start + 0.001, rST - closing), span = end - start;
    const maxHalf = (22 + rage * 3.6) * Math.pow(rE, 0.38);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i <= N; i++) {
        const u = i / N, f = start + u * span, a = arcStart + f * arcSpan, k = f * 60;
        const taper = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.48);
        const half = Math.min(43, maxHalf * (0.9 + 0.07 * Math.sin(k * 0.47) + 0.04 * Math.sin(now * 0.002 + k * 0.2))) * taper;
        const bend = Math.sin(k * 0.43) * 2.4 + Math.sin(k * 1.21) * 1.6;
        const ji = (Math.sin(k * 1.71) * 2 + Math.sin(k * 3.7) * 1.3) * taper;
        const jo = (Math.sin(k * 1.37 + 2) * 2.5 + Math.sin(k * 2.91) * 1.1) * taper;
        const ri = Math.max(baseR - 44, baseR + bend - half + ji), ro = Math.min(baseR + 44, baseR + bend + half + jo), ca = Math.cos(a), sa = Math.sin(a), j = i * 2;
        _riftIn[j] = cx + ca * ri; _riftIn[j + 1] = cy + sa * ri;
        _riftOut[j] = cx + ca * ro; _riftOut[j + 1] = cy + sa * ro;
        _riftMid[j] = cx + ca * (baseR + bend); _riftMid[j + 1] = cy + sa * (baseR + bend);
        minX = Math.min(minX, _riftIn[j], _riftOut[j]); maxX = Math.max(maxX, _riftIn[j], _riftOut[j]);
        minY = Math.min(minY, _riftIn[j + 1], _riftOut[j + 1]); maxY = Math.max(maxY, _riftIn[j + 1], _riftOut[j + 1]);
    }
    const opacity = Math.min(1, rE * 5), boxX = minX - 10, boxY = minY - 10, boxW = maxX - minX + 20, boxH = maxY - minY + 20;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowBlur = 0;
    // Dark relief anchors the torn walls to the battlefield.
    ctx.beginPath(); _riftTrace(_riftIn, n); _riftTrace(_riftOut, n);
    ctx.globalAlpha = opacity * 0.15; ctx.strokeStyle = '#01010b'; ctx.lineWidth = 18; ctx.stroke();
    ctx.globalAlpha = opacity * 0.3; ctx.lineWidth = 8; ctx.stroke();
    if (glow) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * (0.045 + rage * 0.012);
        ctx.strokeStyle = '#9b39ed'; ctx.lineWidth = maxHalf * 2 + 52 + rage * 7; ctx.beginPath(); _riftTrace(_riftMid, n); ctx.stroke();
        ctx.globalAlpha = opacity * (0.08 + rage * 0.015); ctx.lineWidth = maxHalf * 2 + 22; ctx.stroke();
        if (rage === 5 && flare > 0 && gl === 0 && (!fo || fo.screenFlash !== false)) {
            ctx.globalAlpha = flare * 0.045; ctx.fillStyle = '#a145da'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = opacity;
    ctx.save(); ctx.beginPath(); _riftTrace(_riftIn, n);
    ctx.lineTo(_riftOut[N * 2], _riftOut[N * 2 + 1]);
    for (let i = N - 1; i > 0; i--) ctx.quadraticCurveTo(_riftOut[i * 2], _riftOut[i * 2 + 1], (_riftOut[i * 2] + _riftOut[i * 2 - 2]) * 0.5, (_riftOut[i * 2 + 1] + _riftOut[i * 2 - 1]) * 0.5);
    ctx.lineTo(_riftOut[0], _riftOut[1]);
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#020511'; ctx.fillRect(boxX, boxY, boxW, boxH);
    // Continuous world planes have no arc tile joins and drift at separate depths.
    const driftX = (now * 0.004) % 512, driftY = (now * 0.0017) % 512;
    ctx.save(); ctx.translate(driftX, driftY); ctx.fillStyle = art.nebula;
    ctx.fillRect(boxX - driftX, boxY - driftY, boxW, boxH); ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * (0.6 + rage * 0.08);
    ctx.save(); ctx.translate(-driftX * 2.1, driftY * 3); ctx.fillStyle = art.veil;
    ctx.fillRect(boxX + driftX * 2.1, boxY - driftY * 3, boxW, boxH); ctx.restore();
    ctx.globalAlpha = opacity * (0.055 + rage * 0.008); ctx.strokeStyle = '#a04be8'; ctx.lineWidth = maxHalf * 1.3;
    ctx.beginPath(); _riftTrace(_riftMid, n); ctx.stroke();
    ctx.globalAlpha = opacity * (0.035 + rage * 0.008); ctx.strokeStyle = rage >= 4 ? '#9be0ff' : '#dc84fb';
    ctx.lineWidth = maxHalf * 0.46; ctx.stroke();
    // Celestial bodies remain behind the near stars and the wall shadow.
    const bodies = rage === 0 ? 0 : rage === 1 ? 1 : rage === 2 ? 3 : rage === 3 ? 4 : rage === 4 ? 5 : 7;
    for (let i = 0; i < bodies; i++) {
        const f = i === 0 ? 0.26 : i === 1 ? 0.74 : i === 2 ? 0.45 : i === 3 ? 0.4 : i === 4 ? 0.62 : i === 5 ? 0.12 : 0.87;
        if (f <= start + 0.02 || f >= end - 0.02) continue;
        const a = arcStart + f * arcSpan, sz = i === 2 ? 240 : i === 3 ? 155 : i === 4 ? 116 : i === 1 ? 106 : 112;
        ctx.save(); ctx.translate(cx + Math.cos(a) * (baseR - 3) + Math.sin(now * 0.00009 + i) * 3, cy + Math.sin(a) * (baseR - 3));
        ctx.rotate(a + Math.PI / 2 + (i === 1 || i === 4 ? -0.15 : now * 0.000035 * (i & 1 ? -1 : 1)));
        ctx.globalCompositeOperation = i === 1 || i === 4 ? 'source-over' : 'lighter';
        ctx.globalAlpha = opacity * (i === 2 ? 0.4 : i === 3 ? 0.7 : 0.95);
        ctx.drawImage(i === 1 ? art.planet : i === 4 ? art.hole : i === 3 ? art.pillar : art.galaxy, -sz / 2, -sz * 0.4, sz, sz * 0.8); ctx.restore();
    }
    if (rage >= 3) {
        ctx.globalCompositeOperation = 'lighter'; ctx.beginPath();
        for (let i = 0; i <= N; i++) {
            const j = i * 2, wave = Math.sin(i * 0.2 + now * 0.0015) * 0.16;
            const x = _riftMid[j] + (_riftOut[j] - _riftIn[j]) * wave;
            const y = _riftMid[j + 1] + (_riftOut[j + 1] - _riftIn[j + 1]) * wave;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#c15aed'; ctx.globalAlpha = opacity * 0.12; ctx.lineWidth = 15; ctx.stroke();
        ctx.strokeStyle = '#edb7ff'; ctx.globalAlpha = opacity * 0.17; ctx.lineWidth = 3.5; ctx.stroke();
        if (gl === 0) { ctx.globalAlpha = opacity * 0.22; ctx.lineWidth = 1; ctx.stroke(); }
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * 0.8;
    ctx.fillStyle = '#e5cbf8'; ctx.strokeStyle = '#ac85d0'; ctx.lineWidth = 0.7; ctx.beginPath();
    const stars = Math.min(64, (gl >= 2 ? 16 : gl === 1 ? 26 : 34) + rage * (gl >= 2 ? 3 : 6));
    for (let i = 0; i < stars; i++) {
        const j = i * 4, f = (_riftSeeds[j] + now * 0.000008) % 1;
        if (f < start || f > end) continue;
        const a = arcStart + f * arcSpan, d = (_riftSeeds[j + 1] - 0.5) * maxHalf * 1.3;
        const rr = baseR + d, ca = Math.cos(a), sa = Math.sin(a), s = 0.45 + _riftSeeds[j + 2] * 1.1;
        ctx.rect(cx + ca * rr, cy + sa * rr, s, s);
        if (trails && gl < 2) { ctx.moveTo(cx + ca * rr, cy + sa * rr); ctx.lineTo(cx + ca * (rr + d * 0.16), cy + sa * (rr + d * 0.16)); }
    }
    ctx.fill(); if (trails && gl < 2) ctx.stroke();
    if (gl === 0 && trails) {
        ctx.lineWidth = 0.65; ctx.strokeStyle = '#cfb8e9'; ctx.globalAlpha = opacity * (0.2 + rage * 0.04); ctx.beginPath();
        for (let i = 0; i < 34 + rage * 5; i++) {
            const j = i * 4, f = _riftSeeds[j];
            if (f < start || f > end) continue;
            const z = (now * 0.00014 + _riftSeeds[j + 1]) % 1, a = arcStart + f * arcSpan;
            const d = (_riftSeeds[j + 2] - 0.5) * maxHalf * 1.65 * z * z;
            const x = cx + Math.cos(a) * (baseR + d), y = cy + Math.sin(a) * (baseR + d);
            const sink = a + (f < 0.5 ? 1 : -1) * 0.022 * z;
            ctx.moveTo(x, y); ctx.lineTo(cx + Math.cos(sink) * (baseR + d * 0.72), cy + Math.sin(sink) * (baseR + d * 0.72));
        }
        ctx.stroke();
    }
    if (rage === 5 && glow) {
        for (let i = 0; i < (gl === 0 ? 5 : 2); i++) {
            const f = 0.16 + i * 0.163;
            if (f < start || f > end) continue;
            const a = arcStart + f * arcSpan, pulse = Math.pow(0.5 + 0.5 * Math.sin(now * 0.004 + i * 2.7), 5), sz = 18 + pulse * 38;
            ctx.globalAlpha = opacity * (0.22 + pulse * 0.65);
            ctx.drawImage(art.nova, cx + Math.cos(a) * baseR - sz / 2, cy + Math.sin(a) * baseR - sz / 2, sz, sz);
        }
    }
    // Nested wall shadows recess the sky behind the irregular lips.
    ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); _riftTrace(_riftIn, n); _riftTrace(_riftOut, n);
    ctx.strokeStyle = '#090216'; ctx.globalAlpha = opacity * 0.28; ctx.lineWidth = 18; ctx.stroke();
    ctx.globalAlpha = opacity * 0.52; ctx.lineWidth = 9; ctx.stroke();
    ctx.globalAlpha = opacity * 0.75; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
    // The bevel has a cool inner wall and a warm outer face.
    for (let side = 0; side < 2; side++) {
        const edge = side ? _riftOut : _riftIn;
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = opacity * 0.9;
        ctx.strokeStyle = side ? '#3f1c51' : '#261345'; ctx.lineWidth = 5; ctx.beginPath(); _riftTrace(edge, n); ctx.stroke();
        if (gl === 0) {
            ctx.save(); ctx.translate(side ? 1 : -1, side ? -0.7 : 0.7);
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * 0.22;
            ctx.strokeStyle = side ? '#ee438c' : '#6857ff'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * 0.38;
        ctx.strokeStyle = side ? '#d674e8' : '#9868e8'; ctx.lineWidth = 1.3 + rage * 0.1; ctx.stroke();
        for (let i = 1; i < N; i += gl >= 2 ? 4 : 2) {
            const pulse = 0.3 + 0.7 * Math.pow(Math.sin(i * 1.7 + side), 2);
            ctx.globalAlpha = opacity * pulse * 0.65; ctx.lineWidth = 0.7 + pulse * 1.3;
            if (gl === 0 && glow) { ctx.shadowColor = '#b458f4'; ctx.shadowBlur = 8 + rage; }
            ctx.strokeStyle = side ? '#eed3e9' : '#c3b4ff'; ctx.beginPath();
            ctx.moveTo(edge[i * 2], edge[i * 2 + 1]); ctx.lineTo(edge[(i + 1) * 2], edge[(i + 1) * 2 + 1]); ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
    if (trails && rage >= 2) {
        ctx.globalAlpha = opacity * (0.3 + rage * 0.03); ctx.strokeStyle = '#b385d8'; ctx.lineWidth = 0.65; ctx.beginPath();
        for (let i = 4; i < N - 2; i += gl >= 2 ? 12 : gl === 1 ? 10 : rage === 5 ? 3 : 6) {
            const j = i * 2, edge = i % 4 ? _riftIn : _riftOut;
            const dx = edge[j] - _riftMid[j], dy = edge[j + 1] - _riftMid[j + 1], len = Math.hypot(dx, dy) || 1;
            const reach = 9 + rage * 3;
            const x = edge[j], y = edge[j + 1], ex = x + dx / len * reach - dy / len * 4, ey = y + dy / len * reach + dx / len * 4;
            ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(ex + dx / len * 9 + dy / len * 5, ey + dy / len * 9 - dx / len * 5);
            ctx.moveTo(ex, ey); ctx.lineTo(ex - dy / len * 7, ey + dx / len * 7);
        }
        ctx.stroke();
    }
    if (rage >= 3 && trails) {
        ctx.strokeStyle = '#bc8af1'; ctx.lineWidth = 0.8; ctx.globalAlpha = opacity * 0.3;
        const rings = gl >= 2 ? 1 : gl === 1 ? 2 : 4;
        for (let i = 0; i < rings; i++) {
            const f = 0.2 + i * 0.19;
            if (f < start || f > end) continue;
            const a = arcStart + f * arcSpan;
            ctx.save(); ctx.translate(cx + Math.cos(a) * baseR, cy + Math.sin(a) * baseR); ctx.rotate(a + Math.PI / 2);
            ctx.beginPath(); ctx.ellipse(0, 0, 68 + rage * 3, maxHalf + 10, -0.18, 0.15, Math.PI * 0.9); ctx.stroke(); ctx.restore();
        }
    }
    if (rage >= 4 && glow && gl === 0) {
        ctx.strokeStyle = '#bac7fa'; ctx.globalAlpha = opacity * 0.15; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let i = 0; i < 7; i++) {
            const f = 0.16 + i * 0.11;
            if (f < start || f > end) continue;
            const a = arcStart + f * arcSpan, ca = Math.cos(a), sa = Math.sin(a), len = 50 + Math.sin(now * 0.003 + i) * 20;
            ctx.moveTo(cx + ca * (baseR - maxHalf), cy + sa * (baseR - maxHalf));
            ctx.lineTo(cx + ca * (baseR - maxHalf - len), cy + sa * (baseR - maxHalf - len));
        }
        ctx.stroke();
    }
    // Near fragments cross the lip and curve into the illuminated center.
    if (parts) {
        const count = gl >= 2 ? 5 + rage : gl === 1 ? 10 + rage * 2 : 14 + rage * 5;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * 0.75; ctx.fillStyle = '#ddc3eb'; ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const j = i * 4, f = _riftSeeds[j], ph = (now * 0.00038 + _riftSeeds[j + 2]) % 1;
            if (f < start + 0.015 || f > end - 0.015) continue;
            const a = arcStart + f * arcSpan, side = i & 1 ? 1 : -1, d = side * maxHalf * (1.8 * (1 - ph) * (1 - ph));
            const sway = Math.sin(ph * Math.PI) * 10 * side, ca = Math.cos(a), sa = Math.sin(a);
            const x = cx + ca * (baseR + d) - sa * sway, y = cy + sa * (baseR + d) + ca * sway, s = (1 - ph * 0.65) * (1 + _riftSeeds[j + 3] * 2.3);
            ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 0.6); ctx.lineTo(x + s, y + s * 0.4); ctx.lineTo(x, y + s); ctx.closePath();
        }
        ctx.fill();
    }
    if (rage === 5 && glow) {
        ctx.globalCompositeOperation = 'lighter';
        const embers = gl === 0 ? 22 : gl === 1 ? 10 : 5;
        for (let i = 1; i < embers; i++) {
            const idx = Math.floor(i / embers * N) * 2, edge = i & 1 ? _riftIn : _riftOut;
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.008 + i * 2.4), sz = (gl === 0 ? 18 : 10) + pulse * 12;
            ctx.globalAlpha = opacity * (0.2 + pulse * 0.35);
            ctx.drawImage(art.glow, edge[idx] - sz / 2, edge[idx + 1] - sz / 2, sz, sz);
        }
    }
    if (trails && rST < 0.98) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * 0.7; ctx.strokeStyle = '#bca3f5'; ctx.lineWidth = 1;
        const a = arcStart + rST * arcSpan;
        ctx.beginPath(); ctx.moveTo(_riftMid[N * 2], _riftMid[N * 2 + 1]);
        ctx.lineTo(cx + Math.cos(a + 0.04) * (baseR + 4), cy + Math.sin(a + 0.04) * (baseR + 4));
        ctx.lineTo(cx + Math.cos(a + 0.085) * (baseR - 3), cy + Math.sin(a + 0.085) * (baseR - 3)); ctx.stroke();
    }
    if (glow && (rST < 0.98 || closing > 0 || flare > 0)) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity * (0.5 + flare * 0.4);
        const sz = 22 + rage * 3 + flare * 16;
        ctx.drawImage(art.glow, _riftMid[N * 2] - sz / 2, _riftMid[N * 2 + 1] - sz / 2, sz, sz);
        if (closing > 0) ctx.drawImage(art.glow, _riftMid[0] - sz / 2, _riftMid[1] - sz / 2, sz, sz);
    }
    if (rE < 0.16 && glow) {
        const a = arcStart + arcSpan * 0.5, sz = 110 * rE;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opacity;
        ctx.drawImage(art.nova, cx + Math.cos(a) * baseR - sz / 2, cy + Math.sin(a) * baseR - sz / 2, sz, sz);
    }
    ctx.restore();
}
