// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// render/enemy-egregor.js: extracted from render.js (base body + Psychic
// Tempest / Null Slash telegraph and strike effects). Runs to end of original file.

const _egTentPts = new Float32Array(17 * 3);
const _egTentL = new Float32Array(17 * 2), _egTentR = new Float32Array(17 * 2), _egDash = [0, 0];
const _egNullPts = new Float32Array(39 * 3);
const _egAimDash = [10, 14];
// fixed zigzag offsets for the cracks that open where Null Slash lands
const _egCrack = new Float32Array(8 * 5);
(() => { let q = 11; for (let i = 0; i < _egCrack.length; i++) { q = q * 16807 % 2147483647; _egCrack[i] = q / 2147483647 * 2 - 1; } })();

// Adds an eight pointed star to the current path
function _egStar8(x, y, r, rot) {
    for (let i = 0; i < 16; i++) {
        const a = rot + i * Math.PI / 8, rr = i & 1 ? r * 0.42 : r;
        if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
}
const _egBodyColors = ['#62d9d1', '#a493d8', '#c784d6', '#dd719f', '#ec637c', '#fa665d'];
let _egBodyArt = null;
let _egNullChargeArt = null;

function _bakeEgregorNullCharge() {
    try { return _buildEgregorNullCharge(); }
    catch (_) {
        _applyGfxLevel(2);
        const c = document.createElement('canvas'); c.width = c.height = 1;
        const path = new Path2D(); path.moveTo(.24, 0); path.lineTo(.96, 0);
        return { field: c, flow: c, core: c, veins: [path, path, path] };
    }
}

function _buildEgregorNullCharge() {
    const field = document.createElement('canvas'), flow = document.createElement('canvas'), core = document.createElement('canvas');
    field.width = field.height = 256; flow.width = flow.height = 256; core.width = core.height = 96;
    let g = field.getContext('2d');
    const haze = g.createRadialGradient(128, 128, 12, 128, 128, 128);
    haze.addColorStop(0, 'rgba(12,8,30,0)'); haze.addColorStop(0.5, 'rgba(40,20,80,0.1)');
    haze.addColorStop(0.86, 'rgba(133,84,208,0.25)'); haze.addColorStop(1, 'rgba(193,169,247,0)');
    g.fillStyle = haze; g.fillRect(0, 0, 256, 256);
    g = flow.getContext('2d'); g.translate(128, 128); g.strokeStyle = '#ac8bd5'; g.lineWidth = 1.2;
    for (let arm = 0; arm < 8; arm++) {
        g.beginPath();
        for (let j = 0; j <= 40; j++) {
            const t = j / 40, r = 120 * (1 - t * 0.9), a = arm * Math.PI / 4 + t * 2.4;
            if (!j) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.stroke();
    }
    g.fillStyle = '#c7d9ef';
    for (let i = 0; i < 30; i++) {
        const a = i * 2.399963, r = 24 + i % 9 * 11;
        g.globalAlpha = 0.25 + i % 4 * 0.16; g.fillRect(Math.cos(a) * r, Math.sin(a) * r, i % 5 ? 1 : 2, i % 5 ? 1 : 2);
    }
    g = core.getContext('2d');
    const glow = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    glow.addColorStop(0, '#ebf4ff'); glow.addColorStop(0.12, '#a7b7f7'); glow.addColorStop(0.38, 'rgba(135,91,213,0.5)'); glow.addColorStop(1, 'rgba(56,19,106,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 96, 96);
    const veins = [];
    for (let tier = 0; tier < 3; tier++) {
        const path = new Path2D(), count = tier === 0 ? 12 : tier === 1 ? 8 : 5;
        for (let i = 0; i < count; i++) {
            const a = -Math.PI / 2 + (i + 0.5) * Math.PI / count;
            path.moveTo(Math.cos(a) * 0.24, Math.sin(a) * 0.24);
            path.lineTo(Math.cos(a + 0.04) * 0.52, Math.sin(a + 0.04) * 0.52);
            path.lineTo(Math.cos(a - 0.025) * 0.77, Math.sin(a - 0.025) * 0.77);
            path.lineTo(Math.cos(a) * 0.96, Math.sin(a) * 0.96);
        }
        veins.push(path);
    }
    return { field, flow, core, veins };
}

function _drawEgregorNullCharge(enemy, now, progress, radius, angle) {
    if (!_egNullChargeArt) _egNullChargeArt = _bakeEgregorNullCharge();
    const art = _egNullChargeArt, opts = window._fxOpts, low = _mobPerf || _gfxLevel >= 2;
    const tier = low ? 2 : _gfxLevel === 1 ? 1 : 0, pulse = 0.6 + 0.4 * Math.sin(now * (0.006 + progress * 0.01));
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(angle);
    if (!low) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.clip(); }
    if (!low && (!opts || opts.glow !== false)) {
        ctx.globalAlpha = 0.3 + progress * 0.55;
        ctx.drawImage(art.field, -radius, -radius, radius * 2, radius * 2);
        ctx.save(); ctx.rotate(-now * 0.00018); ctx.globalAlpha = 0.12 + progress * 0.28;
        ctx.drawImage(art.flow, -radius, -radius, radius * 2, radius * 2); ctx.restore();
    }
    ctx.save(); ctx.scale(radius, radius); ctx.lineWidth = (0.8 + progress * 0.8) / radius;
    ctx.strokeStyle = '#b89be0'; ctx.globalAlpha = (0.1 + progress * 0.45) * pulse; ctx.stroke(art.veins[tier]); ctx.restore();
    // the gathered energy fills the sector out to a bright front that advances with the charge
    const front = radius * (0.3 + progress * 0.7);
    ctx.fillStyle = '#7d4bd8'; ctx.globalAlpha = 0.06 + progress * 0.1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, front, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a68ad0'; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.25 + progress * 0.4;
    ctx.beginPath(); ctx.arc(0, 0, front, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    if (!opts || opts.glow !== false) {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#b99aff'; ctx.lineWidth = 4 + progress * 5; ctx.globalAlpha = 0.12 + progress * 0.28;
        ctx.beginPath(); ctx.arc(0, 0, front, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }
    if (progress > 0.85) {
        ctx.strokeStyle = '#f3e8ff'; ctx.lineWidth = 2.5; ctx.globalAlpha = (progress - 0.85) / 0.15 * 0.8;
        ctx.beginPath(); ctx.arc(0, 0, front, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
    if (!opts || opts.particles !== false) {
        const count = low ? 5 : 10; ctx.fillStyle = '#d4e8ff'; ctx.globalAlpha = 0.4 + progress * 0.4; ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const t = (now * (0.00035 + progress * 0.0004) + i * 0.618034) % 1;
            const a = -Math.PI / 2 + (i + 0.5) * Math.PI / count + Math.sin(t * 4) * 0.06, r = radius * (0.95 - t * 0.85);
            ctx.rect(Math.cos(a) * r, Math.sin(a) * r, 1.4 + progress, 1.4 + progress);
        }
        ctx.fill();
    }
    // an aim line along the locked direction shows where the swing will pass
    ctx.save(); ctx.setLineDash(_egAimDash); ctx.lineDashOffset = -now * 0.03;
    ctx.strokeStyle = '#e1d2ff'; ctx.globalAlpha = 0.18 + progress * 0.4; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(radius * 0.12, 0); ctx.lineTo(front, 0); ctx.stroke(); ctx.restore();
    // comet streaks fall in toward the origin along curved paths
    {
        const count = low ? 4 : 9; ctx.strokeStyle = '#d9c6ff'; ctx.lineWidth = 1.2 + progress; ctx.globalAlpha = 0.35 + progress * 0.4; ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const t = (now * (0.0004 + progress * 0.0004) + i * 0.381966) % 1, t0 = Math.max(0, t - 0.05);
            const a = -Math.PI / 2 + (i + 0.5) * Math.PI / count + t * 0.9, a0 = -Math.PI / 2 + (i + 0.5) * Math.PI / count + t0 * 0.9;
            const r = front * (0.96 - t * 0.8), r0 = front * (0.96 - t0 * 0.8);
            ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
    }
    // eight pointed stars ride the advancing front and brighten as the charge nears release
    {
        const count = low ? 3 : 5; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#efe4ff'; ctx.globalAlpha = 0.45 + progress * 0.45;
        for (let i = 0; i < count; i++) {
            const a = -Math.PI / 2 + (i + 0.5) * Math.PI / count + Math.sin(now * 0.001 + i * 1.7) * 0.05;
            ctx.beginPath(); _egStar8(Math.cos(a) * front, Math.sin(a) * front, 4 + progress * 7 + pulse * 1.5, now * 0.0008 + i); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
    // a pressure ring leaves the core on every beat
    {
        const k = (now % 700) / 700;
        ctx.strokeStyle = '#c9b1ff'; ctx.globalAlpha = (1 - k) * (0.12 + progress * 0.35); ctx.lineWidth = 1.5 + (1 - k) * 2;
        ctx.beginPath(); ctx.arc(0, 0, 18 + k * front * 0.5, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
    const size = 34 + progress * 80 + pulse * 8;
    if (!low) { ctx.globalAlpha = 0.5 + progress * 0.45; ctx.drawImage(art.core, -size / 2, -size / 2, size, size); }
    ctx.restore();
}

function _bakeEgregorBodyArt() {
    try { return _buildEgregorBodyArt(); }
    catch (_) {
        _applyGfxLevel(2);
        const c = document.createElement('canvas'), a = document.createElement('canvas');
        c.width = c.height = a.width = a.height = 1;
        const g = c.getContext('2d'); g.fillStyle = '#30666c'; g.fillRect(0, 0, 1, 1);
        return { body: Array(6).fill(c), aura: Array(6).fill(a), iris: Array(6).fill(c) };
    }
}

function _buildEgregorBodyArt() {
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
function _drawEgregorBodySurface(palette, radius, now, segments, isDuelBoss = false) {
    _egregorBodyPath(radius, now, segments);
    ctx.save(); ctx.clip();
    if (isDuelBoss) {
        // Vibrant celestial bioluminescence inner gradient
        const gr = ctx.createRadialGradient(0, -radius * 0.25, 4, 0, 0, radius * 1.15);
        if (palette <= 1) {
            // Phase 1: Radiant Celestial Teal
            gr.addColorStop(0, '#2d7a8c');
            gr.addColorStop(0.35, '#1b5260');
            gr.addColorStop(0.70, '#103742');
            gr.addColorStop(1, '#0c242c');
        } else if (palette <= 3) {
            // Phase 2: Radiant Astral Violet
            gr.addColorStop(0, '#6b3a8c');
            gr.addColorStop(0.35, '#4a2366');
            gr.addColorStop(0.70, '#2e1542');
            gr.addColorStop(1, '#1b0a2a');
        } else {
            // Phase 3: Radiant Cosmic Ruby
            gr.addColorStop(0, '#8c2d4a');
            gr.addColorStop(0.35, '#601b30');
            gr.addColorStop(0.70, '#3d0f1e');
            gr.addColorStop(1, '#260611');
        }
        ctx.fillStyle = gr;
        ctx.fillRect(-radius * 1.3, -radius * 1.3, radius * 2.6, radius * 2.6);

        // Overlay texture with gentle contrast
        ctx.globalAlpha = 0.55;
        ctx.drawImage(_egBodyArt.body[palette], -radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
        ctx.globalAlpha = 1.0;

        // Neural bio-circuitry veins
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = _egBodyColors[palette];
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.45;
        for (let i = 0; i < 18; i++) {
            const a = i * 2.39996 + now * 0.0005;
            const r1 = radius * (0.2 + (i % 4) * 0.18);
            const r2 = radius * (0.45 + (i % 3) * 0.22);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.quadraticCurveTo(Math.cos(a + 0.3) * (r1 + r2) * 0.5, Math.sin(a + 0.3) * (r1 + r2) * 0.5, Math.cos(a + 0.1) * r2, Math.sin(a + 0.1) * r2);
            ctx.stroke();
        }
        ctx.restore();
    } else {
        ctx.drawImage(_egBodyArt.body[palette], -radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
    }
    ctx.restore();
}

function _drawEgregor(enemy) {
    if (!_egBodyArt) _egBodyArt = _bakeEgregorBodyArt();
    const now = performance.now(), sc = enemy.size / 220, BASE = 110 * sc, fo = window._fxOpts;
    const glow = !fo || fo.glow !== false, parts = !fo || fo.particles !== false, trails = !fo || fo.trails !== false;
    const rage = Math.min(5, enemy._rageStacks || 0), vr = enemy._visualRage === undefined ? rage : enemy._visualRage, pal = Math.min(5, Math.max(0, Math.ceil(vr)));
    const hitDur = enemy._isDuelBoss ? 80 : 140;
    const hit = Math.max(0, 1 - (now - (enemy._egBodyHitAt || -1000)) / hitDur), pulse = Math.max(0, 1 - (now - (enemy._ragePulseAt || -1000)) / 600);
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
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // one tentacle costs a handful of canvas calls: a tapered body polygon, three core strokes, one batch of beads and one batch of cracks
        const wBase = 36 * sc * (1 + rage * 0.05), beads = _gfxLevel < 2 && !_mobPerf;
        for (let k = 0; k <= 16; k++) {
            const r = Math.max(0.25, wBase * (1 - Math.min(k, 15) / 17) * 0.5), na = _egTentPts[k * 3 + 2] + Math.PI / 2, nx = Math.cos(na) * r, ny = Math.sin(na) * r;
            _egTentL[k * 2] = _egTentPts[k * 3] + nx; _egTentL[k * 2 + 1] = _egTentPts[k * 3 + 1] + ny;
            _egTentR[k * 2] = _egTentPts[k * 3] - nx; _egTentR[k * 2 + 1] = _egTentPts[k * 3 + 1] - ny;
        }
        const tipR = Math.max(0.25, wBase * (1 - 15 / 17) * 0.5), tipA = _egTentPts[50];
        ctx.beginPath(); ctx.moveTo(_egTentL[0], _egTentL[1]);
        for (let k = 1; k <= 16; k++) ctx.lineTo(_egTentL[k * 2], _egTentL[k * 2 + 1]);
        ctx.arc(_egTentPts[48], _egTentPts[49], tipR, tipA + Math.PI / 2, tipA - Math.PI / 2, true);
        for (let k = 16; k >= 0; k--) ctx.lineTo(_egTentR[k * 2], _egTentR[k * 2 + 1]);
        ctx.closePath();
        ctx.globalAlpha = 0.6 + health * 0.4; ctx.fillStyle = rage ? '#54203f' : '#143c4a'; ctx.fill();
        if (flash > 0) { ctx.globalAlpha = flash * 0.6; ctx.fillStyle = '#f1e5f5'; ctx.fill(); }
        // the light core is a dashed line, so each tentacle keeps its pulsing beaded look without a stroke per segment
        _egDash[0] = segLen * 0.6; _egDash[1] = segLen * 0.4; ctx.setLineDash(_egDash); ctx.lineCap = 'butt';
        ctx.strokeStyle = tint;
        for (let c = 0; c < 3; c++) {
            const i0 = c * 5, i1 = c === 2 ? 16 : i0 + 6, mid = (i0 + i1) >> 1;
            ctx.globalAlpha = (0.16 + health * 0.45) * (0.7 + 0.3 * Math.sin(now * 0.003 + ti + mid * 0.2)) * 0.9; ctx.lineWidth = Math.max(0.5, wBase * (1 - mid / 17) * 0.22);
            ctx.beginPath(); ctx.moveTo(_egTentPts[i0 * 3], _egTentPts[i0 * 3 + 1]);
            for (let k = i0 + 1; k <= i1; k++) ctx.lineTo(_egTentPts[k * 3], _egTentPts[k * 3 + 1]);
            ctx.stroke();
        }
        ctx.setLineDash([]); ctx.lineCap = 'round';
        if (beads) {
            ctx.beginPath();
            for (let i = 2; i < 16; i += 2) {
                const taper = 1 - i / 17, width = wBase * taper, j = i * 3, rad = Math.max(0.5, 3.3 * sc * taper);
                const sx = _egTentPts[j] + Math.cos(_egTentPts[j + 2] - Math.PI / 2) * width * 0.4, sy = _egTentPts[j + 1] + Math.sin(_egTentPts[j + 2] - Math.PI / 2) * width * 0.4;
                ctx.moveTo(sx + rad, sy); ctx.arc(sx, sy, rad, 0, Math.PI * 2);
            }
            ctx.globalAlpha = 0.3 + health * 0.6; ctx.fillStyle = tint; ctx.fill();
        }
        if (health < 0.45) {
            ctx.beginPath();
            for (let i = 0; i < 16; i += 3) {
                const width = wBase * (1 - i / 17), j = i * 3;
                ctx.moveTo(_egTentPts[j] - width * 0.3, _egTentPts[j + 1]); ctx.lineTo(_egTentPts[j] + width * 0.25, _egTentPts[j + 1] + width * 0.2);
            }
            ctx.globalAlpha = 0.8; ctx.strokeStyle = '#100d1a'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(Math.sin(now * 0.15) * hit * 3, Math.cos(now * 0.1) * hit * 2); ctx.scale(1 + breath * 0.025, 1 - breath * 0.018);
    const segments = _gfxLevel < 2 && !_mobPerf ? 80 : 36;
    _drawEgregorBodySurface(pal, BASE, now, segments, !!enemy._isDuelBoss);
    ctx.save(); ctx.clip();
    if (hit > 0 || pulse > 0) {
        const hitAlpha = enemy._isDuelBoss ? Math.min(0.25, hit * 0.25) : (hit * 0.55 + pulse * 0.18);
        ctx.globalAlpha = hitAlpha;
        ctx.fillStyle = '#e7d5e8';
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    ctx.restore(); ctx.strokeStyle = tint; ctx.lineWidth = (enemy._isDuelBoss ? (3.4 + vr * 0.4) : (2 + vr * 0.35)) * sc; ctx.stroke();
    if (alive > 0) {
        ctx.globalAlpha = alive / 10 * 0.24; ctx.strokeStyle = '#a9badb'; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1;
    }
    const gills = _mobPerf || _gfxLevel >= 2 ? 3 : 5;
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < gills; i++) {
        const light = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(now * 0.004 - i * 0.9), 2);
        ctx.save(); ctx.translate(side * 12 * sc, (10 + i * 12) * sc); ctx.rotate(side * (0.3 + breath * 0.12 + i * 0.1));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * 30 * sc, -8 * sc, side * 55 * sc, 15 * sc); ctx.quadraticCurveTo(side * 20 * sc, 25 * sc, 0, 0);
        ctx.fillStyle = enemy._isDuelBoss ? (rage ? '#752844' : '#1e5462') : (rage ? '#44233c' : '#153e4b'); ctx.fill(); ctx.globalAlpha = light; ctx.strokeStyle = tint; ctx.lineWidth = enemy._isDuelBoss ? 2.0 : 1.4; ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 4; i++) {
        const a = i === 0 ? -Math.PI / 3 : i === 1 ? -Math.PI * 2 / 3 : i === 2 ? -Math.PI / 6 + 0.2 : -Math.PI * 5 / 6 - 0.2;
        const d = i < 2 ? 30 : 55, er = (i < 2 ? 20 : 12) * sc, float = Math.sin(now * 0.002 + a) * 3 * sc;
        const ex = Math.cos(a) * (d * sc + float), ey = Math.sin(a) * (d * sc + float);
        if (now > enemy._eyeBlinkTimers[i] + enemy._eyeNextBlinks[i]) {
            enemy._eyeBlinkTimers[i] = now; enemy._eyeNextBlinks[i] = 2000 + Math.random() * 4000;
        }
        const phase = now - enemy._eyeBlinkTimers[i];
        let blink = phase < 150 ? phase / 150 : phase < 300 ? 1 - (phase - 150) / 150 : 0;
        if (enemy._isDuelBoss) blink = Math.min(0.60, blink); // Clamp blink for duel boss so eyes remain readable at all times
        const look = Math.atan2(player.y - enemy.y - ey, player.x - enemy.x - ex) + Math.sin(now * 0.0012 + i) * 0.16;
        const px = Math.cos(look) * er * 0.32, py = Math.sin(look) * er * 0.32;
        ctx.save(); ctx.translate(ex, ey); ctx.scale(1, 1 - blink * 0.9); ctx.beginPath(); ctx.ellipse(0, 0, er, er * 0.92, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-er, -er, er * 2, er * 2);
        ctx.drawImage(_egBodyArt.iris[pal], px - er * 0.72, py - er * 0.72, er * 1.44, er * 1.44);
        ctx.fillStyle = '#0b0a17'; ctx.beginPath(); ctx.ellipse(px, py, er * (0.18 + (5 - rage) * 0.018), er * 0.48, look, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px - er * 0.18, py - er * 0.22, er * 0.14, 0, Math.PI * 2); ctx.fill();
        if (enemy._isDuelBoss) {
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px + er * 0.14, py + er * 0.16, er * 0.09, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = enemy._isDuelBoss ? '#ffffff' : tint; ctx.lineWidth = enemy._isDuelBoss ? 2.6 : 2; ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 0.92 * (1 - blink * 0.9), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (parts) {
        ctx.fillStyle = tint; ctx.beginPath(); ctx.globalAlpha = 0.45;
        for (let i = 0; i < (_mobPerf || _gfxLevel >= 2 ? 4 : 12); i++) { const ph = (now * 0.00015 + i * 0.618034) % 1, a = i * 2.39996 + now * 0.0001, r = BASE * (1.1 + ph * 0.75); ctx.rect(Math.cos(a) * r, Math.sin(a) * r - ph * 15, 1.2 + i % 2, 1.2 + i % 2); } ctx.fill(); ctx.globalAlpha = 1;
        const woundAge = now - (enemy._egBodyHitAt || -1000);
        if (!enemy._isDuelBoss && woundAge >= 0 && woundAge < 450) {
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
    if (!enemy._noHpBar) {
        const bw = enemy.size * 1.1, by = -enemy.size / 2 - 14;
        ctx.fillStyle = '#111020'; ctx.fillRect(-bw / 2, by, bw, 5); ctx.fillStyle = tint; ctx.fillRect(-bw / 2, by, bw * Math.max(0, enemy.hp / enemy.maxHp), 5);
        ctx.strokeStyle = tint; ctx.lineWidth = 0.8; ctx.strokeRect(-bw / 2, by, bw, 5);
    }
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
// The Tempest warning is loud on purpose: a pulsing zone that turns hot, cracks racing over the ground, a ring closing in,
// a clock of ticks that lights up and a pillar of light that rises as the strike gets close.
function _drawEgregorTempestWarning(t, now, progress, low, glow) {
    _drawDangerZone('tempest', t.tx, t.ty, 100, progress, 1, now, 0, 0, Math.PI, t.target === player);
}

// Shows Tempest landing on the ship: a shock ring, a flash and a burst of cracks.
function _drawEgregorTempestHits(t, now) {
    const fo = window._fxOpts, glow = !fo || fo.glow !== false, low = _mobPerf || _gfxLevel >= 2;
    for (let i = 0; i < t.hits.length; i++) {
        const h = t.hits[i], age = now - h.at; if (age < 0 || age >= 700) continue;
        const q = age / 700, shock = Math.min(1, age / 220);
        ctx.save(); ctx.translate(h.x, h.y); ctx.lineCap = 'round';
        ctx.globalAlpha = (1 - q) * 0.95; ctx.strokeStyle = '#ffe3f1'; ctx.lineWidth = 4 * (1 - q) + 1;
        ctx.beginPath(); ctx.arc(0, 0, 14 + shock * 130, 0, Math.PI * 2); ctx.stroke();
        if (age < 360) {
            const k = 1 - age / 360;
            if (glow && _riftArt) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.9; ctx.drawImage(_riftArt.nova, -95, -95, 190, 190); ctx.globalCompositeOperation = 'source-over'; }
            ctx.globalAlpha = k; ctx.strokeStyle = '#fff6ea'; ctx.lineWidth = 2; ctx.beginPath();
            const spikes = low ? 6 : 12;
            for (let s = 0; s < spikes; s++) {
                const a = s * Math.PI * 2 / spikes + 0.3, r0 = 12 + shock * 10, r1 = 70 * (0.5 + shock * 0.7) * (1 + (s % 3) * 0.2);
                ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a + 0.08) * (r0 + r1) * 0.5, Math.sin(a + 0.08) * (r0 + r1) * 0.5); ctx.lineTo(Math.cos(a) * (r0 + r1), Math.sin(a) * (r0 + r1));
            }
            ctx.stroke();
        }
        ctx.restore();
    }
}

function _drawEgregorTempestTarget(t, now, life) {
    const warning = !t.struck, progress = Math.max(0, Math.min(1, 1 - t.countdown / 1200));
    const age = warning ? 0 : 700 - life, fo = window._fxOpts, rage = t.rage || 0;
    const glow = !fo || fo.glow !== false, parts = !fo || fo.particles !== false;
    const low = _mobPerf || _gfxLevel >= 2, blocked = t.blocked === true;
    const count = low ? 3 + (rage >= 3 ? 1 : 0) : 3 + Math.floor(rage * 0.6);
    const fade = warning ? 1 : Math.max(0, Math.min(1, life / 130));
    const openness = warning ? 0.3 + Math.pow(progress, 0.6) * 0.7 : Math.min(1, life / 190);
    const radius = (64 + rage * 2.3) * openness * (warning ? 1.3 : 1);
    const flicker = blocked ? 0.3 + 0.3 * Math.pow(Math.sin(now * 0.035), 2) : 1;
    // Gleam samples retain the cosmetic random cadence during the first impact.
    if (!warning && !t._echoAt && life > 550 && _gfxLevel < 2) {
        let gleam = 0;
        for (let i = 0; i < 12; i++) gleam += Math.random();
        t._vfxGleam = gleam / 12;
    }
    ctx.save(); ctx.shadowBlur = 0;
    if (warning) _drawEgregorTempestWarning(t, now, progress, low, glow);
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
                if (!low && _gfxLevel === 0 && window._dangerGuide !== true && (!fo || fo.screenFlash !== false)) {
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
    if (warning) _drawDangerZone('tempest', t.tx, t.ty, 100, progress, 1, now, 0, 0, Math.PI, t.target === player, true);
    if (!warning && t.hits) _drawEgregorTempestHits(t, now);
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
        if (linked || soulPulse > 0.02) {
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
            const a = i / 24 * Math.PI * 2 + now * 0.000018;
            ctx.arc(enemy.x, enemy.y, 600, a, a + 0.13);
            const x = enemy.x + Math.cos(a) * 600, y = enemy.y + Math.sin(a) * 600;
            ctx.moveTo(x, y); ctx.lineTo(enemy.x + Math.cos(a) * 594, enemy.y + Math.sin(a) * 594);
        }
        ctx.stroke(); }
        ctx.restore();
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
            const angle = enemy._nullSlashAngle ?? Math.PI / 2;
            const radius = Math.hypot(enemy._nullSlashTargetX - enemy.x, enemy._nullSlashTargetY - enemy.y) + (enemy._rageStacks || 0) * 5 + 100;
            _drawEgregorNullCharge(enemy, now, progress, radius, angle);
            _drawDangerZone('sector', enemy.x, enemy.y, radius, progress, 0.6, now, angle, 0, Math.PI, false, true);
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
            const rageSizeMult = 1.12 + rageStacks * 0.05;  // heavier base, +5% tentacle size per stack
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
            // peaks mid swing, so the body flares hottest when the tentacle moves fastest
            const sweepSpeed = st >= EXTEND && st < EXTEND + SWEEP ? Math.sin(Math.PI * (st - EXTEND) / SWEEP) : 0;

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
                tentPts[i * 3 + 2] = 1 - Math.pow(tRaw, 1.3);
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
                ctx.strokeStyle = `rgba(165,40,255,${(0.74 + 0.2 * sweepSpeed) * ext})`;
                ctx.lineWidth = Math.max(0.5, 46 * tentPts[p0 + 2] * rageSizeMult);
                ctx.beginPath(); ctx.moveTo(tentPts[p0], tentPts[p0 + 1]); ctx.lineTo(tentPts[p1], tentPts[p1 + 1]); ctx.stroke();
            }
            // Layer 3: highlight stripe (follows local tangent)
            ctx.shadowBlur = 0;
            for (let si = 0; si < steps; si++) {
                const p0 = si * 3, p1 = p0 + 3;
                const sdx = tentPts[p1]-tentPts[p0], sdy = tentPts[p1 + 1]-tentPts[p0 + 1], sL = Math.hypot(sdx,sdy)||1;
                const hpX = -sdy/sL, hpY = sdx/sL, ho = 5 * tentPts[p0 + 2] * rageSizeMult;
                ctx.strokeStyle = `rgba(235,160,255,${(0.42 + 0.3 * sweepSpeed) * tentPts[p0 + 2] * ext})`;
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

            // Beads of light run along the tentacle toward the tip, faster and brighter at full swing, with sparks thrown off the tip
            {
                const beads = _mobPerf ? 3 : 6;
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#f1dcff';
                for (let i = 0; i < beads; i++) {
                    const u = (now * (0.0012 + sweepSpeed * 0.0012) + i / beads) % 1, f = u * steps, si = Math.min(steps - 1, Math.floor(f)), fr = f - si, p0 = si * 3;
                    const bx = tentPts[p0] + (tentPts[p0 + 3] - tentPts[p0]) * fr, by = tentPts[p0 + 1] + (tentPts[p0 + 4] - tentPts[p0 + 1]) * fr;
                    ctx.globalAlpha = (0.4 + 0.5 * sweepSpeed) * ext * (0.35 + 0.65 * (1 - u));
                    ctx.beginPath(); ctx.arc(bx, by, 2.5 + tentPts[p0 + 2] * 7 * rageSizeMult, 0, Math.PI * 2); ctx.fill();
                }
                if (sweepSpeed > 0.05) {
                    const tipX = tentPts[steps * 3], tipY = tentPts[steps * 3 + 1], tx = Math.cos(tipAngle + Math.PI / 2), ty = Math.sin(tipAngle + Math.PI / 2);
                    const frame = Math.floor(st / 45), sparks = _mobPerf ? 4 : 9;
                    ctx.strokeStyle = '#e7d2ff'; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.65 * sweepSpeed * ext; ctx.beginPath();
                    for (let i = 0; i < sparks; i++) {
                        const hs = ((i + 1) * 73856093 ^ frame * 19349663) >>> 0, r1 = (hs & 255) / 255, r2 = ((hs >> 8) & 255) / 255 - 0.5;
                        const sx = tipX - tx * r1 * 70 * sweepSpeed + Math.cos(tipAngle) * r2 * 44, sy = tipY - ty * r1 * 70 * sweepSpeed + Math.sin(tipAngle) * r2 * 44;
                        ctx.moveTo(sx, sy); ctx.lineTo(sx - tx * (6 + r1 * 10), sy - ty * (6 + r1 * 10));
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Glow on the tip, brightest at full swing speed
            if (_riftArt && _riftArt.glow.width > 8 && (!egFo || egFo.glow !== false)) {
                const tipX = tentPts[steps * 3], tipY = tentPts[steps * 3 + 1], tipR = (40 + sweepSpeed * 26) * rageSizeMult;
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.35 + sweepSpeed * 0.4) * ext;
                ctx.drawImage(_riftArt.glow, tipX - tipR, tipY - tipR, tipR * 2, tipR * 2); ctx.restore();
            }

            // The torn space is drawn here while the tip sweeps; once the sweep ends _dimBreakZones keeps it open
            if (st < EXTEND + SWEEP && rST > 0.04 && rE > 0.01) _drawEgregorRift(cx, cy, R, arcStart, arcSpan, rageStacks, rST, rE, now, 0);

            // Slash blade: a tapering white and violet crescent trails the swing along the true arc, then lingers briefly after the sweep
            if (sweepT > 0.03) {
                const after = st >= EXTEND + SWEEP ? (st - EXTEND - SWEEP) / RETRACT : 0;
                const back = arcSpan * (sweepT < 1 ? Math.min(sweepT, 0.55) : 0.55 + 0.4 * after);
                const bladeR = R * (after > 0 ? 1 : ext), bladeA = (1 - after * after) * Math.min(1, sweepT * 6);
                const segs = _mobPerf ? 6 : 12;
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
                for (let k = 0; k < segs; k++) {
                    const t0 = k / segs, t1 = (k + 1) / segs, a0 = tipAngle - back * (1 - t0), a1 = tipAngle - back * (1 - t1);
                    ctx.strokeStyle = '#8a3dff'; ctx.globalAlpha = t1 * t1 * 0.6 * bladeA; ctx.lineWidth = 7 + t1 * t1 * 24;
                    ctx.beginPath(); ctx.arc(cx, cy, bladeR, a0, a1); ctx.stroke();
                    ctx.strokeStyle = '#f2e6ff'; ctx.globalAlpha = t1 * t1 * bladeA; ctx.lineWidth = 1.5 + t1 * t1 * 5;
                    ctx.beginPath(); ctx.arc(cx, cy, bladeR, a0, a1); ctx.stroke();
                }
                ctx.restore();
            }

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

            // Impact cut: an expanding ring and a bright slash line along the swing direction through the target, with sparks
            const since = (st - impactSt) / 260;
            if (since > -0.06 && since < 1) {
                const k = Math.max(0, since), fade = 1 - k, tang = nsAng + Math.PI / 2, ir = 110 + rageStacks * 20;
                const ux = Math.cos(tang), uy = Math.sin(tang), len = ir * (0.7 + k * 0.9);
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
                ctx.strokeStyle = '#e9d8ff'; ctx.globalAlpha = fade * 0.85; ctx.lineWidth = 1.5 + fade * 3;
                ctx.beginPath(); ctx.arc(tx2, ty2, ir * (0.3 + k * 1.05), 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = '#8a3dff'; ctx.globalAlpha = fade * 0.6; ctx.lineWidth = 6 + fade * 12;
                ctx.beginPath(); ctx.moveTo(tx2 - ux * len, ty2 - uy * len); ctx.lineTo(tx2 + ux * len, ty2 + uy * len); ctx.stroke();
                ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = fade; ctx.lineWidth = 1 + fade * 3;
                ctx.beginPath(); ctx.moveTo(tx2 - ux * len, ty2 - uy * len); ctx.lineTo(tx2 + ux * len, ty2 + uy * len); ctx.stroke();
                if (!_mobPerf) {
                    ctx.strokeStyle = '#d8b8ff'; ctx.globalAlpha = fade * 0.8; ctx.lineWidth = 1.5; ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const sa = tang + i * 0.785 + 0.3, r0 = ir * (0.2 + k * 0.7), r1 = r0 + 14 + (i % 3) * 8;
                        ctx.moveTo(tx2 + Math.cos(sa) * r0, ty2 + Math.sin(sa) * r0); ctx.lineTo(tx2 + Math.cos(sa) * r1, ty2 + Math.sin(sa) * r1);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Where the slash lands an eight pointed star bursts and cracks run out from the target, fading over half a second
            const landed = st - impactSt;
            if (landed > -20 && landed < 520) {
                const ir = 110 + rageStacks * 20, kk = Math.max(0, landed);
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                if (kk < 260) {
                    const k = kk / 260, fade = (1 - k) * (1 - k);
                    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b98cff'; ctx.lineWidth = 2; ctx.globalAlpha = fade * 0.9;
                    ctx.beginPath(); _egStar8(tx2, ty2, ir * (0.3 + k * 0.85), nsAng + k * 0.7); ctx.fill(); ctx.stroke();
                }
                const grow = Math.min(1, kk / 120), cf = 1 - kk / 520, cracks = _mobPerf ? 5 : 8;
                for (let pass = 0; pass < 2; pass++) {
                    ctx.strokeStyle = pass ? '#ffffff' : '#8a3dff'; ctx.lineWidth = pass ? 1.2 : 5; ctx.globalAlpha = cf * (pass ? 0.9 : 0.4); ctx.beginPath();
                    for (let ci = 0; ci < cracks; ci++) {
                        const a = ci * Math.PI * 2 / cracks + 0.3, len = ir * (0.9 + (ci % 3) * 0.35) * grow;
                        ctx.moveTo(tx2, ty2);
                        for (let s = 1; s <= 4; s++) {
                            const d = len * s / 4, off = _egCrack[ci * 5 + s] * 12;
                            ctx.lineTo(tx2 + Math.cos(a) * d - Math.sin(a) * off, ty2 + Math.sin(a) * d + Math.cos(a) * off);
                        }
                    }
                    ctx.stroke();
                }
                ctx.restore();
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
    try { return _buildRiftArt(); }
    catch (_) {
        _applyGfxLevel(2);
        const c = document.createElement('canvas'); c.width = c.height = 1;
        const g = c.getContext('2d'); g.fillStyle = '#a383cf'; g.fillRect(0, 0, 1, 1);
        return { nebula: '#140b24', veil: '#241537', galaxy: c, planet: c, hole: c, glow: c, pillar: c, nova: c, portal: c };
    }
}

function _buildRiftArt() {
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

// Baking the rift art takes a noticeable moment, so it is built while the game is idle rather than in the middle of the first Egregor fight.
(function _prewarmRiftArt() {
    const warm = (tries) => {
        try {
            if (_riftArt && _egNullChargeArt) return;
            if (typeof ctx !== 'undefined' && ctx) { if (!_riftArt) _riftArt = _bakeRiftArt(); if (!_egNullChargeArt) _egNullChargeArt = _bakeEgregorNullCharge(); }
            else if (tries < 5) setTimeout(() => warm(tries + 1), 1500);
        } catch (err) { /* the first draw will bake it instead */ }
    };
    if (window.requestIdleCallback) window.requestIdleCallback(() => warm(0), { timeout: 8000 });
    else setTimeout(() => warm(0), 3000);
})();

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
        if (rage === 5 && flare > 0 && gl === 0 && window._dangerGuide !== true && (!fo || fo.screenFlash !== false)) {
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

// DUEL_EGREGOR_START
// Pure procedural dark-fantasy Canvas2D Duel Boss + Shared Organic Tentacle Engine + DuelFX
// Leaves Endless _drawEgregor completely untouched above this marker.

function _duelHash2(ix, iy, seed) {
    let h = (ix * 374761393 + iy * 668265263 + (seed || 0) * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function _duelValueNoise2D(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = _duelHash2(ix, iy, seed);
    const b = _duelHash2(ix + 1, iy, seed);
    const c = _duelHash2(ix, iy + 1, seed);
    const d = _duelHash2(ix + 1, iy + 1, seed);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function _duelFbm2D(x, y, seed) {
    return (
        _duelValueNoise2D(x, y, seed) * 0.56 +
        _duelValueNoise2D(x * 2.03 + 11.7, y * 2.03 + 5.3, seed + 19) * 0.29 +
        _duelValueNoise2D(x * 4.11 + 23.1, y * 4.11 + 17.9, seed + 47) * 0.15
    );
}

const DuelFX = (function () {
    const PHASE_PALETTES = {
        1: {
            base: '#1d5d66',
            mid: '#2b7a80',
            dark: '#0a222b',
            rim: '#74f5ff',
            glow: '#42e8d4',
            sucker: '#a8f8ef',
            pore: '#08252d',
            vein: '#6cf5e8',
            eyeIris: '#f6c244',
            eyeRim: '#fff0b3'
        },
        2: {
            base: '#4a2580',
            mid: '#6838a8',
            dark: '#180a36',
            rim: '#df87ff',
            glow: '#fa69bd',
            sucker: '#ffe6a6',
            pore: '#1b0b38',
            vein: '#f5b5ff',
            eyeIris: '#5cf5d0',
            eyeRim: '#d8fff4'
        },
        3: {
            base: '#68193a',
            mid: '#8f254c',
            dark: '#1d0612',
            rim: '#ffd97d',
            glow: '#ff5c8a',
            sucker: '#ffe3a8',
            pore: '#2a0612',
            vein: '#79dfff',
            eyeIris: '#ff5277',
            eyeRim: '#ffe8a8'
        }
    };

    function getPhasePalette(phase) {
        const p = phase >= 3 ? 3 : (phase >= 2 ? 2 : 1);
        return PHASE_PALETTES[p];
    }

    function drawShockwave(ctx, x, y, radius, alpha, color, lineWidth) {
        if (!ctx || alpha <= 0.01 || radius <= 1) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.strokeStyle = color || '#74f5ff';
        ctx.lineWidth = lineWidth || 3.0;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.45));
        ctx.lineWidth = (lineWidth || 3.0) * 2.4;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, radius * 0.92), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawGatherParticles(ctx, cx, cy, radius, progress, color, count, time) {
        if (!ctx) return;
        const n = count || 12;
        const t = typeof time === 'number' ? time : (performance.now() * 0.001);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = color || '#74f5ff';
        for (let i = 0; i < n; i++) {
            const frac = ((t * 1.4 + i / n) % 1);
            const r = radius * (1 - frac) * (0.4 + 0.6 * progress);
            const a = (i / n) * Math.PI * 2 + t * 2.1;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            ctx.globalAlpha = Math.sin(frac * Math.PI) * 0.85;
            ctx.beginPath();
            ctx.arc(px, py, 2.0 + (1 - frac) * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    return { getPhasePalette, drawShockwave, drawGatherParticles };
})();

if (typeof window !== 'undefined') {
    window.DuelFX = DuelFX;
}

// Builds a smooth organic tentacle spine from (x0, y0) to (x1, y1).
// Supports both joints/segments and curl/tipCurl parameter aliases.
function buildOrganicTentacleSpine(x0, y0, x1, y1, opts) {
    const o = opts || {};
    const rawJoints = o.joints !== undefined ? o.joints : (o.segments !== undefined ? o.segments : 18);
    const joints = Math.max(12, Math.min(36, Math.round(rawJoints)));
    const time = typeof o.time === 'number' ? o.time : (performance.now() * 0.001);
    const waveAmp = typeof o.waveAmp === 'number' ? o.waveAmp : 18;
    const waveFreq = typeof o.waveFreq === 'number' ? o.waveFreq : 2.2;
    const waveSpeed = typeof o.waveSpeed === 'number' ? o.waveSpeed : 4.2;
    const phase = typeof o.phase === 'number' ? o.phase : 0;
    const curl = o.curl !== undefined ? o.curl : (o.tipCurl !== undefined ? o.tipCurl : 0.45);
    const bend = typeof o.bend === 'number' ? o.bend : 0;
    const reach = typeof o.reach === 'number' ? Math.max(0.05, Math.min(1, o.reach)) : 1.0;

    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    const spine = new Array(joints + 1);
    for (let i = 0; i <= joints; i++) {
        const uRaw = i / joints;
        const u = uRaw * reach;
        const env = Math.pow(uRaw, 1.3);
        const wave = Math.sin(uRaw * Math.PI * waveFreq - time * waveSpeed + phase) * waveAmp * env;
        const arch = Math.sin(uRaw * Math.PI) * bend;
        const curlT = Math.max(0, (uRaw - 0.68) / 0.32);
        const smoothCurl = curlT * curlT * (3 - 2 * curlT);
        const curlAngle = smoothCurl * curl * 1.45;
        const curlOff = Math.sin(curlAngle) * 34 * smoothCurl;
        const curlBack = (1 - Math.cos(curlAngle)) * 22 * smoothCurl;

        const px = x0 + dx * u + nx * (wave + arch + curlOff) - ux * curlBack;
        const py = y0 + dy * u + ny * (wave + arch + curlOff) - uy * curlBack;
        spine[i] = { x: px, y: py };
    }
    return spine;
}

// Catmull-Rom spline subdivision guaranteeing >= 6 smooth samples per coarse segment
function _subdivideSpineCatmullRom(spine, subdivPerSeg) {
    if (!spine || spine.length < 3) return spine || [];
    const n = spine.length;
    const sub = Math.max(2, subdivPerSeg || 6);
    // If spine is already dense enough (>= 48 pts), keep cost low with 2x smoothing
    const effSub = n >= 48 ? 2 : (n >= 24 ? 4 : sub);
    const out = [];
    for (let i = 0; i < n - 1; i++) {
        const p0 = spine[Math.max(0, i - 1)];
        const p1 = spine[i];
        const p2 = spine[i + 1];
        const p3 = spine[Math.min(n - 1, i + 2)];
        const steps = (i === n - 2) ? effSub : effSub;
        for (let s = 0; s < steps; s++) {
            const t = s / effSub;
            const t2 = t * t;
            const t3 = t2 * t;
            const x = 0.5 * (
                (2 * p1.x) +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
            );
            const y = 0.5 * (
                (2 * p1.y) +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            );
            out.push({ x, y });
        }
    }
    out.push({ x: spine[n - 1].x, y: spine[n - 1].y });
    return out;
}

function _resolveTentacleWidths(o) {
    let rootW;
    if (typeof o.rootWidth === 'number') rootW = o.rootWidth;
    else if (typeof o.baseRadius === 'number') rootW = o.baseRadius * 2;
    else rootW = 34;

    let tipW;
    if (typeof o.tipWidth === 'number') tipW = o.tipWidth;
    else if (typeof o.tipRadius === 'number') tipW = o.tipRadius * 2;
    else tipW = Math.max(2, rootW * 0.10);

    return { rootW: Math.max(3, rootW), tipW: Math.max(1, tipW) };
}

// Muscular root bulge + smooth organic taper toward tip
function _tentacleHalfWidthAt(u, rootW, tipW) {
    const bulge = Math.sin(Math.min(1, u * 3.8) * Math.PI) * rootW * 0.16;
    const taper = Math.pow(Math.max(0, 1 - u), 1.15);
    return Math.max(tipW * 0.5, (tipW + (rootW - tipW) * taper + bulge) * 0.5);
}

// Draws a shaded, smooth-spline, tapered organic tentacle polygon with cross-body shading,
// bright rim light, wet specular highlight, glowing bio-vein, and proportional elliptical pore suckers.
function drawOrganicTentacle(ctx, spine, opts) {
    if (!ctx || !spine || spine.length < 3) return;
    const o = opts || {};
    const widths = _resolveTentacleWidths(o);
    const rootW = widths.rootW;
    const tipW = widths.tipW;
    const pal = DuelFX.getPhasePalette(o.phase || 1);
    const baseCol = o.baseColor || pal.base;
    const midCol = o.midColor || pal.mid || baseCol;
    const darkCol = o.darkColor || pal.dark;
    const rimCol = o.rimColor || pal.rim;
    const glowCol = o.glowColor || pal.glow;
    const suckerCol = o.suckerColor || pal.sucker;
    const poreCol = o.poreColor || pal.pore || darkCol;
    const glowAmt = typeof o.glow === 'number' ? o.glow : (typeof o.glowIntensity === 'number' ? o.glowIntensity : 0.45);
    const showSuckers = o.suckers !== false && rootW >= 12;
    const hooked = !!o.hooked;
    const alpha = typeof o.alpha === 'number' ? o.alpha : 1.0;

    const smooth = _subdivideSpineCatmullRom(spine, o.subdiv || 6);
    const n = smooth.length - 1;
    if (n < 2) return;

    const lx = new Float32Array(n + 1);
    const ly = new Float32Array(n + 1);
    const rx = new Float32Array(n + 1);
    const ry = new Float32Array(n + 1);
    const mx = new Float32Array(n + 1);
    const my = new Float32Array(n + 1);
    const nxArr = new Float32Array(n + 1);
    const nyArr = new Float32Array(n + 1);
    const hwArr = new Float32Array(n + 1);

    for (let i = 0; i <= n; i++) {
        const pPrev = smooth[Math.max(0, i - 1)];
        const pNext = smooth[Math.min(n, i + 1)];
        const tx = pNext.x - pPrev.x;
        const ty = pNext.y - pPrev.y;
        const tLen = Math.hypot(tx, ty) || 1;
        const nx = -ty / tLen;
        const ny = tx / tLen;
        const u = i / n;
        const hw = _tentacleHalfWidthAt(u, rootW, tipW);
        nxArr[i] = nx;
        nyArr[i] = ny;
        hwArr[i] = hw;
        lx[i] = smooth[i].x + nx * hw;
        ly[i] = smooth[i].y + ny * hw;
        rx[i] = smooth[i].x - nx * hw;
        ry[i] = smooth[i].y - ny * hw;
        mx[i] = smooth[i].x + nx * (hw * 0.12);
        my[i] = smooth[i].y + ny * (hw * 0.12);
    }

    const tipP = smooth[n];
    const prevP = smooth[n - 1];
    const tipAng = Math.atan2(tipP.y - prevP.y, tipP.x - prevP.x);
    const tipExt = Math.max(5, rootW * 0.28);
    const tipX = tipP.x + Math.cos(tipAng) * tipExt;
    const tipY = tipP.y + Math.sin(tipAng) * tipExt;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1. Cast drop shadow beneath tentacle for depth separation
    if (o.castShadow !== false) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.34;
        ctx.fillStyle = '#03060f';
        ctx.beginPath();
        ctx.moveTo(lx[0] + 4, ly[0] + 6);
        for (let i = 1; i <= n; i++) ctx.lineTo(lx[i] + 4, ly[i] + 6);
        ctx.lineTo(tipX + 4, tipY + 6);
        for (let i = n; i >= 0; i--) ctx.lineTo(rx[i] + 4, ry[i] + 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // 2. Main muscular tapered silhouette filled with cross-body shaded dark->base->mid gradient
    const gStart = smooth[0];
    const gMid = smooth[Math.floor(n * 0.45)];
    const bodyGrad = ctx.createLinearGradient(
        gStart.x - nxArr[0] * rootW * 0.55,
        gStart.y - nyArr[0] * rootW * 0.55,
        gMid.x + nxArr[Math.floor(n * 0.45)] * rootW * 0.55,
        gMid.y + nyArr[Math.floor(n * 0.45)] * rootW * 0.55
    );
    bodyGrad.addColorStop(0.0, darkCol);
    bodyGrad.addColorStop(0.42, baseCol);
    bodyGrad.addColorStop(0.78, midCol);
    bodyGrad.addColorStop(1.0, darkCol);

    ctx.beginPath();
    ctx.moveTo(lx[0], ly[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(lx[i], ly[i]);
    ctx.lineTo(tipX, tipY);
    for (let i = n; i >= 0; i--) ctx.lineTo(rx[i], ry[i]);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 3. Ventral dark shadow half (gives cylindrical 3D volume)
    ctx.save();
    ctx.globalAlpha = alpha * 0.48;
    ctx.fillStyle = darkCol;
    ctx.beginPath();
    ctx.moveTo(mx[0], my[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(mx[i], my[i]);
    ctx.lineTo(tipX, tipY);
    for (let i = n; i >= 0; i--) ctx.lineTo(rx[i], ry[i]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Dorsal wet specular highlight band along lit upper ridge
    ctx.save();
    ctx.globalAlpha = alpha * 0.32;
    ctx.strokeStyle = '#e8fbff';
    ctx.lineWidth = Math.max(1.2, rootW * 0.11);
    ctx.beginPath();
    for (let i = 1; i < n - 1; i++) {
        const sx = smooth[i].x + nxArr[i] * hwArr[i] * 0.44;
        const sy = smooth[i].y + nyArr[i] * hwArr[i] * 0.44;
        if (i === 1) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();

    // 5. Glowing central bio-vein
    if (glowAmt > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * Math.min(0.85, glowAmt * 0.65);
        ctx.strokeStyle = glowCol;
        ctx.lineWidth = Math.max(1.2, rootW * 0.12);
        ctx.beginPath();
        ctx.moveTo(smooth[0].x, smooth[0].y);
        for (let i = 1; i <= n; i++) ctx.lineTo(smooth[i].x, smooth[i].y);
        ctx.stroke();
        ctx.restore();
    }

    // 6. Crisp bright rim edge along dorsal side + subtle dark ventral contour
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = Math.max(1.2, Math.min(3.0, rootW * 0.06));
    ctx.globalAlpha = alpha * 0.82;
    ctx.beginPath();
    ctx.moveTo(lx[0], ly[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(lx[i], ly[i]);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.strokeStyle = darkCol;
    ctx.lineWidth = Math.max(1.0, Math.min(2.4, rootW * 0.05));
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.moveTo(rx[0], ry[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(rx[i], ry[i]);
    ctx.stroke();

    // 7. Proportional elliptical ventral suckers with dark inner pores (largest near base, tapering smoothly)
    if (showSuckers) {
        const suckerCount = Math.max(5, Math.min(13, Math.round(6 + rootW * 0.14)));
        for (let s = 0; s < suckerCount; s++) {
            const u = 0.09 + (s / suckerCount) * 0.76;
            const idx = Math.min(n - 1, Math.max(1, Math.round(u * n)));
            const hw = hwArr[idx];
            if (hw < 3.5) continue;
            const pA = smooth[idx - 1];
            const pB = smooth[idx + 1];
            const ang = Math.atan2(pB.y - pA.y, pB.x - pA.x);
            const sx = smooth[idx].x - nxArr[idx] * hw * 0.42;
            const sy = smooth[idx].y - nyArr[idx] * hw * 0.42;
            const srX = Math.max(2.2, hw * 0.34);
            const srY = Math.max(1.5, hw * 0.22);

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(ang);
            ctx.globalAlpha = alpha * 0.90;
            ctx.fillStyle = suckerCol;
            ctx.beginPath();
            ctx.ellipse(0, 0, srX, srY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = darkCol;
            ctx.lineWidth = Math.max(0.8, srY * 0.35);
            ctx.stroke();
            ctx.fillStyle = poreCol;
            ctx.beginPath();
            ctx.ellipse(0, 0, srX * 0.48, srY * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 8. Optional luminous bone hook / spear glow at tip
    if (o.tipLight !== false && hooked && glowAmt > 0.1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tipX, tipY, Math.max(2.5, tipW * 0.65), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 9. Optional debug spine & collision capsule overlay (used by tentacle-lab.html / boss-lab.html)
    if (o.debugSpine) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(smooth[0].x, smooth[0].y);
        for (let i = 1; i <= n; i++) ctx.lineTo(smooth[i].x, smooth[i].y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 77, 109, 0.72)';
        ctx.lineWidth = 1.0;
        const step = Math.max(1, Math.floor(n / 12));
        for (let i = 0; i <= n; i += step) {
            ctx.beginPath();
            ctx.arc(smooth[i].x, smooth[i].y, hwArr[i], 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    ctx.restore();
}

// Exact tapered capsule collision matching drawOrganicTentacle spine & widths
function checkOrganicTentacleCollision(px, py, pradius, spine, opts) {
    if (!spine || spine.length < 2) return false;
    const o = opts || {};
    const widths = _resolveTentacleWidths(o);
    const rootW = widths.rootW;
    const tipW = widths.tipW;
    const pad = typeof pradius === 'number' ? pradius : 5.75;
    const n = spine.length - 1;

    for (let i = 0; i < n; i++) {
        const a = spine[i];
        const b = spine[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        if (lenSq > 1e-6) {
            t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
        }
        const qx = a.x + dx * t;
        const qy = a.y + dy * t;
        const u = (i + t) / n;
        const hw = _tentacleHalfWidthAt(u, rootW, tipW);
        const hitR = hw * 0.88 + pad;
        const distSq = (px - qx) * (px - qx) + (py - qy) * (py - qy);
        if (distSq <= hitR * hitR) return true;
    }
    return false;
}

// =========================================================================
// Offscreen High-Res Procedural Dark-Fantasy Boss Baking (1024px -> downscaled)
// =========================================================================
let _duelBossAssets = null;

function _traceCraniumSilhouette(c, cx, cy, R, phase) {
    // Sculpted cephalopod mantle + elongated cranium + heavy brow ridges + cheeks + muscular neck
    const mantleTop = cy - R * (phase === 3 ? 1.24 : (phase === 2 ? 1.16 : 1.08));
    const crownW = R * (phase === 3 ? 0.98 : (phase === 2 ? 0.90 : 0.84));
    const browW = R * (phase === 3 ? 1.06 : (phase === 2 ? 1.00 : 0.94));
    const cheekW = R * (phase === 3 ? 0.86 : 0.80);
    const neckW = R * 0.58;
    const chinY = cy + R * 0.78;

    c.beginPath();
    c.moveTo(cx, mantleTop);
    // Right upper mantle dome -> lateral lobe -> heavy brow ridge -> cheek -> neck
    c.bezierCurveTo(cx + crownW * 0.65, mantleTop - R * 0.04, cx + crownW * 1.15, cy - R * 0.80, cx + browW, cy - R * 0.22);
    c.bezierCurveTo(cx + browW * 1.08, cy + R * 0.06, cx + cheekW * 1.05, cy + R * 0.36, cx + neckW, chinY);
    c.quadraticCurveTo(cx, chinY + R * 0.16, cx - neckW, chinY);
    // Left neck -> cheek -> brow ridge -> upper mantle dome
    c.bezierCurveTo(cx - cheekW * 1.05, cy + R * 0.36, cx - browW * 1.08, cy + R * 0.06, cx - browW, cy - R * 0.22);
    c.bezierCurveTo(cx - crownW * 1.15, cy - R * 0.80, cx - crownW * 0.65, mantleTop - R * 0.04, cx, mantleTop);
    c.closePath();
}

function _bakeProceduralCarapace(phase) {
    if (typeof document === 'undefined') return null;
    // Bake at 512px (2x typical 256px display size) or 1024px for crisp anti-aliased skin grain
    const S = 512;
    const cv = document.createElement('canvas');
    cv.width = S;
    cv.height = S;
    const c = cv.getContext('2d');
    if (!c) return null;

    const pal = DuelFX.getPhasePalette(phase);
    const cx = S * 0.5;
    const cy = S * 0.54;
    const R = S * 0.33;

    // 1. Clipped sculpted cranium & mantle base
    c.save();
    _traceCraniumSilhouette(c, cx, cy, R, phase);
    c.clip();

    // Base directional 3D form shading (key light top-left, deep shadow bottom-right)
    const formGrad = c.createRadialGradient(cx - R * 0.34, cy - R * 0.44, R * 0.08, cx + R * 0.14, cy + R * 0.18, R * 1.42);
    if (phase === 1) {
        formGrad.addColorStop(0.0, '#62ccd0');
        formGrad.addColorStop(0.32, '#2f848e');
        formGrad.addColorStop(0.70, '#164554');
        formGrad.addColorStop(1.0, '#081c26');
    } else if (phase === 2) {
        formGrad.addColorStop(0.0, '#9662d6');
        formGrad.addColorStop(0.32, '#5a2d94');
        formGrad.addColorStop(0.70, '#26104c');
        formGrad.addColorStop(1.0, '#0c051c');
    } else {
        formGrad.addColorStop(0.0, '#d45175');
        formGrad.addColorStop(0.30, '#851f46');
        formGrad.addColorStop(0.68, '#380b20');
        formGrad.addColorStop(1.0, '#12030a');
    }
    c.fillStyle = formGrad;
    c.fillRect(0, 0, S, S);

    // Translucent lobes and branching veins sit beneath the surface plates.
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let l = 0; l < 7; l++) {
        const side = l % 2 === 0 ? -1 : 1;
        const j = Math.floor(l / 2);
        const x = cx + side * (19 + j * 19), y = cy - R * (0.83 - j * 0.09);
        const fold = () => {
            c.beginPath(); c.moveTo(x, y);
            c.bezierCurveTo(x + side * (68 - j * 7), y - 21, x + side * (37 + j * 7), y + 29, x + side * 53, y + 57);
            c.bezierCurveTo(x + side * 69, y + 69, x + side * 38, y + 83, x + side * 36, y + 64);
        };
        fold(); c.lineWidth = 16 - j * 2; c.strokeStyle = '#08101c'; c.globalAlpha = 0.48; c.stroke();
        c.translate(-2, -3); fold(); c.lineWidth = 3.7; c.strokeStyle = pal.rim; c.globalAlpha = 0.23; c.stroke(); c.translate(2, 3);
    }
    const rootX = cx - 11, rootY = cy - R * 0.25;
    function vein(x, y, a, size, depth, turn) {
        const ex = x + Math.cos(a) * size, ey = y + Math.sin(a) * size;
        c.lineWidth = Math.max(1.1, depth * 1.47);
        c.beginPath(); c.moveTo(x, y);
        c.quadraticCurveTo(x + Math.cos(a - turn * 0.43) * size * 0.58, y + Math.sin(a + turn * 0.45) * size * 0.43, ex, ey);
        c.stroke();
        if (depth <= 1) return;
        vein(ex, ey, a + turn * 0.28, size * 0.62, depth - 1, turn);
        vein(ex, ey, a - turn * 0.66, size * 0.51, depth - 1, -turn);
    }
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = pal.vein; c.globalAlpha = 0.38;
    const branches = phase === 1 ? 2 : phase === 2 ? 3 : 4;
    for (let i = 0; i < branches; i++) vein(rootX + i * 6, rootY + i * 3, -2.32 + i * 0.54, 50 + i * 10, 3, i % 2 ? -1 : 1);
    c.globalCompositeOperation = 'source-over';
    const wet = c.createRadialGradient(cx - R * 0.50, cy - R * 0.64, 1, cx - R * 0.37, cy - R * 0.65, R * 0.57);
    wet.addColorStop(0, '#c7e9db6b'); wet.addColorStop(0.38, '#9bc1c32e'); wet.addColorStop(1, '#8fc6eb00');
    c.globalAlpha = 0.64; c.fillStyle = wet; c.fillRect(0, 0, S, S);
    c.restore();

    // Multi-octave organic skin grain, moss/scales, and pores
    const seed = phase * 137 + 29;
    const step = 6;
    for (let y = Math.floor(cy - R * 1.3); y < Math.ceil(cy + R * 1.0); y += step) {
        for (let x = Math.floor(cx - R * 1.15); x < Math.ceil(cx + R * 1.15); x += step) {
            const nVal = _duelFbm2D(x * 0.028, y * 0.028, seed);
            const dx = (x - (cx - R * 0.3)) / (R * 1.4);
            const dy = (y - (cy - R * 0.4)) / (R * 1.4);
            const lit = Math.max(0, 1 - Math.hypot(dx, dy));
            if (nVal > 0.56) {
                c.fillStyle = phase === 1
                    ? 'rgba(130, 245, 225, ' + ((nVal - 0.56) * (0.28 + lit * 0.35)) + ')'
                    : (phase === 2
                        ? 'rgba(185, 145, 255, ' + ((nVal - 0.56) * (0.26 + lit * 0.35)) + ')'
                        : 'rgba(255, 195, 130, ' + ((nVal - 0.56) * (0.28 + lit * 0.35)) + ')');
                c.fillRect(x, y, step, step);
            } else if (nVal < 0.40) {
                c.fillStyle = 'rgba(4, 8, 18, ' + ((0.40 - nVal) * 0.62) + ')';
                c.fillRect(x, y, step, step);
            }
        }
    }

    c.save();
    c.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 280; i++) {
        const angle = i * 2.399963, radius = 12 + (i * 37 % 142);
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius * 0.89;
        const v = _duelValueNoise2D(x * 0.095, y * 0.085, phase * 37);
        c.fillStyle = v > 0.48 ? '#73586e63' : '#1d323c80';
        c.beginPath(); c.ellipse(x, y, 0.9 + (i % 5) * 0.36, 1.7 + (i % 4) * 0.63, angle, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.strokeStyle = '#130f18'; c.lineWidth = 1.8;
    for (let i = 0; i < 5; i++) {
        const x = cx + (i % 2 ? -1 : 1) * (48 + i * 12), y = cy - 49 + (i % 4) * 22;
        c.beginPath(); c.moveTo(x - 8, y - 16); c.lineTo(x - 2, y - 6);
        c.lineTo(x - 5, y); c.lineTo(x + 4, y + 9); c.lineTo(x + 2, y + 17); c.stroke();
    }

    // Sculpted overlapping carapace plates & cranial ridges across upper mantle
    for (let row = 0; row < 5; row++) {
        const ry = cy - R * (0.98 - row * 0.16);
        const span = R * (0.55 + row * 0.12);
        const plates = 3 + row;
        for (let p = 0; p < plates; p++) {
            const px = cx - span * 0.5 + (p / Math.max(1, plates - 1)) * span;
            const pw = span / plates * 0.65;
            const ph = R * 0.12;
            c.fillStyle = 'rgba(4, 10, 20, 0.28)';
            c.beginPath();
            c.ellipse(px + 2, ry + 5, pw, ph, 0, 0, Math.PI);
            c.fill();
            c.strokeStyle = pal.rim;
            c.globalAlpha = 0.22;
            c.lineWidth = 1.6;
            c.beginPath();
            c.ellipse(px, ry, pw, ph * 0.85, 0, Math.PI * 1.1, Math.PI * 1.9);
            c.stroke();
            c.globalAlpha = 1.0;
        }
    }

    // 4. Sculpted individual brow contours (no continuous dark horizontal band that could read as a mouth)
    const browGlow = c.createRadialGradient(cx, cy - R * 0.28, R * 0.08, cx, cy - R * 0.28, R * 0.85);
    browGlow.addColorStop(0.0, 'rgba(255, 255, 255, 0.14)');
    browGlow.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    c.fillStyle = browGlow;
    c.beginPath();
    c.ellipse(cx, cy - R * 0.32, R * 0.78, R * 0.36, 0, 0, Math.PI * 2);
    c.fill();

    // Sculpted brow ridge highlight
    c.strokeStyle = pal.rim;
    c.globalAlpha = 0.45;
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(cx - R * 0.82, cy - R * 0.18);
    c.quadraticCurveTo(cx - R * 0.36, cy - R * 0.34, cx, cy - R * 0.20);
    c.quadraticCurveTo(cx + R * 0.36, cy - R * 0.34, cx + R * 0.82, cy - R * 0.18);
    c.stroke();
    c.globalAlpha = 1.0;

    // 5. Branching glowing bio-veins (or molten fissures in Phase 3)
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = pal.vein;
    c.lineCap = 'round';
    const veinCount = phase === 3 ? 11 : (phase === 2 ? 8 : 5);
    for (let v = 0; v < veinCount; v++) {
        const startA = -Math.PI * 0.88 + (v / Math.max(1, veinCount - 1)) * Math.PI * 0.76;
        let vx = cx + Math.cos(startA) * R * 0.22;
        let vy = cy - R * 0.75 + Math.sin(startA) * R * 0.12;
        c.lineWidth = phase === 3 ? 3.2 : 2.1;
        c.globalAlpha = phase === 3 ? 0.62 : 0.38;
        c.beginPath();
        c.moveTo(vx, vy);
        for (let s = 1; s <= 5; s++) {
            const ang = startA + Math.sin(v * 2.1 + s * 1.4) * 0.35;
            vx += Math.cos(ang) * R * 0.18;
            vy += Math.abs(Math.sin(ang)) * R * 0.16 + R * 0.08;
            c.lineTo(vx, vy);
        }
        c.stroke();
    }
    c.restore();

    // 6. Irregular organic barnacles/moss patches (strongest in P1) + wet mucous specular streaks
    const barnacleCount = phase === 1 ? 16 : (phase === 2 ? 9 : 6);
    for (let b = 0; b < barnacleCount; b++) {
        const h1 = _duelHash2(b * 3, phase * 7, 91);
        const h2 = _duelHash2(b * 5, phase * 11, 131);
        const bx = cx + (h1 - 0.5) * R * 1.55;
        const by = cy - R * 0.95 + h2 * R * 1.25;
        const br = 3.5 + _duelHash2(b, phase, 43) * 6.5;
        c.fillStyle = phase === 1 ? 'rgba(130, 175, 148, 0.42)' : 'rgba(180, 160, 210, 0.26)';
        c.beginPath();
        c.ellipse(bx, by, br, br * 0.72, h1 * Math.PI, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(6, 12, 20, 0.55)';
        c.beginPath();
        c.arc(bx, by, br * 0.32, 0, Math.PI * 2);
        c.fill();
    }

    // Wet top-left specular sheen streaks
    c.save();
    c.globalAlpha = 0.28;
    c.fillStyle = '#e8ffff';
    c.beginPath();
    c.ellipse(cx - R * 0.34, cy - R * 0.62, R * 0.22, R * 0.08, -0.45, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(cx - R * 0.52, cy - R * 0.38, R * 0.10, R * 0.04, -0.7, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // 7. Directional rim light along silhouette edge (top-left bright, bottom shadow)
    c.strokeStyle = pal.rim;
    c.lineWidth = 4.5;
    c.globalAlpha = 0.68;
    _traceCraniumSilhouette(c, cx, cy, R, phase);
    c.stroke();
    c.restore();

    // Subtle exterior dark grounding contour (not a thick flat cartoon border)
    c.save();
    c.strokeStyle = 'rgba(4, 8, 18, 0.85)';
    c.lineWidth = 2.4;
    _traceCraniumSilhouette(c, cx, cy, R, phase);
    c.stroke();
    c.restore();

    return cv;
}

function _bakeProceduralWing(phase) {
    if (typeof document === 'undefined') return null;
    const W = 320;
    const H = 260;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d');
    if (!c) return null;

    const pal = DuelFX.getPhasePalette(phase);
    const memGrad = c.createLinearGradient(0, 30, W, H);
    if (phase === 3) {
        memGrad.addColorStop(0, 'rgba(130, 26, 62, 0.92)');
        memGrad.addColorStop(0.55, 'rgba(58, 12, 34, 0.84)');
        memGrad.addColorStop(1, 'rgba(20, 4, 14, 0.60)');
    } else {
        memGrad.addColorStop(0, 'rgba(72, 34, 130, 0.88)');
        memGrad.addColorStop(0.55, 'rgba(30, 14, 68, 0.82)');
        memGrad.addColorStop(1, 'rgba(10, 6, 28, 0.52)');
    }

    // Tattered bat/eldritch membrane between 4 bone ribs
    c.beginPath();
    c.moveTo(16, H * 0.56);
    c.quadraticCurveTo(W * 0.42, 16, W - 18, 30);
    c.quadraticCurveTo(W * 0.78, H * 0.44, W - 36, H * 0.56);
    c.quadraticCurveTo(W * 0.66, H * 0.68, W * 0.74, H * 0.84);
    c.quadraticCurveTo(W * 0.46, H * 0.72, W * 0.34, H * 0.92);
    c.quadraticCurveTo(W * 0.22, H * 0.70, 16, H * 0.68);
    c.closePath();
    c.fillStyle = memGrad;
    c.fill();

    // Glowing membrane veins + bone ribs
    const ribs = [
        [W - 18, 30],
        [W - 36, H * 0.56],
        [W * 0.74, H * 0.84],
        [W * 0.34, H * 0.92]
    ];
    for (let i = 0; i < ribs.length; i++) {
        const [rx, ry] = ribs[i];
        c.strokeStyle = phase === 3 ? '#f5cf82' : '#96d8ff';
        c.lineWidth = i === 0 ? 6.0 : 3.6;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(16, H * 0.58);
        c.quadraticCurveTo(rx * 0.52, ry * 0.45 + 16, rx, ry);
        c.stroke();

        c.strokeStyle = pal.dark;
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(16, H * 0.60);
        c.quadraticCurveTo(rx * 0.52, ry * 0.45 + 19, rx, ry + 2);
        c.stroke();
    }

    return cv;
}

function _bakePhase3RuneRing() {
    if (typeof document === 'undefined') return null;
    // Thin rotating arcane ring ONLY (zero solid red disc fill!)
    const S = 384;
    const cv = document.createElement('canvas');
    cv.width = S;
    cv.height = S;
    const c = cv.getContext('2d');
    if (!c) return null;

    const cx = S * 0.5;
    const cy = S * 0.5;
    const rOuter = S * 0.44;
    const rInner = S * 0.37;

    c.strokeStyle = 'rgba(255, 214, 126, 0.72)';
    c.lineWidth = 2.0;
    c.beginPath();
    c.arc(cx, cy, rOuter, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = 'rgba(255, 112, 152, 0.55)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(cx, cy, rInner, 0, Math.PI * 2);
    c.stroke();

    // 24 radial rune ticks around the ring band
    c.strokeStyle = 'rgba(255, 224, 150, 0.65)';
    c.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r0 = i % 3 === 0 ? rInner - 6 : rInner + 2;
        const r1 = i % 3 === 0 ? rOuter + 6 : rOuter - 2;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        c.stroke();
    }
    return cv;
}

function _bakeDuelLimb(phase) {
    const sprite = document.createElement('canvas');
    sprite.width = 104; sprite.height = 170;
    const ctx = sprite.getContext('2d');
    const spine = buildOrganicTentacleSpine(51, 18, 70, 149, {
        joints: 18, time: 0.3, waveAmp: 9, waveFreq: 2.4, bend: -24, curl: 0.5
    });
    drawOrganicTentacle(ctx, spine, {
        phase, rootWidth: 46, tipWidth: 3.4, suckers: true, hooked: true, glow: 0.36, subdiv: 4, tipLight: false, castShadow: false
    });
    const pal = DuelFX.getPhasePalette(phase);
    for (let i = 0; i < 5; i++) {
        const j = spine[3 + i * 2];
        ctx.fillStyle = i % 2 ? '#252934' : '#2d2b38';
        ctx.beginPath(); ctx.moveTo(j.x - 12 + i, j.y - 7);
        ctx.quadraticCurveTo(j.x - 4, j.y - 14, j.x + 9 - i * 0.5, j.y - 4);
        ctx.lineTo(j.x + 7, j.y + 2); ctx.lineTo(j.x - 7, j.y - 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = i % 2 ? pal.rim : '#5b525f'; ctx.lineWidth = 1.06;
        ctx.beginPath(); ctx.moveTo(j.x - 12 + i, j.y - 7);
        ctx.quadraticCurveTo(j.x - 3, j.y - 13, j.x + 9 - i * 0.5, j.y - 4); ctx.stroke();
    }
    return sprite;
}

const _DUEL_AURA_FORMS = [
    {rx:185, ry:133, lift:13, period:3.95, rays:6, spin:0.04, breath:0.85, ring:0.26, drift:0.24, haze:'#347cad'},
    {rx:228, ry:155, lift:21, period:3.28, rays:10, spin:-0.08, breath:1.4, ring:0.31, drift:0.31, haze:'#7031c2'},
    {rx:280, ry:172, lift:32, period:2.65, rays:12, spin:0.13, breath:2.45, ring:0.37, drift:0.43, haze:'#e94333'}
];
const _DUEL_AURA_PARTICLES = Array.from({length:24}, (_, i) => {
    const angle = i * 2.399963;
    return {x:Math.cos(angle), y:Math.sin(angle), start:(i * 0.618034) % 1};
});
const _DUEL_AURA_TAU = Math.PI * 2;
const _DUEL_DEFAULT_FX = {};

function _bakeDuelAura(phase) {
    const palette = DuelFX.getPhasePalette(phase);
    const form = _DUEL_AURA_FORMS[phase - 1];
    const haze = document.createElement('canvas');
    const rays = document.createElement('canvas');
    haze.width = 384; haze.height = 256;
    rays.width = rays.height = 320;
    const light = haze.getContext('2d');
    light.translate(192, 128);
    light.scale(1, 2 / 3);
    const outer = light.createRadialGradient(0, 0, 15, 0, 0, 192);
    outer.addColorStop(0, form.haze + '42');
    outer.addColorStop(0.45, form.haze + '3a');
    outer.addColorStop(0.68, form.haze + '2c');
    outer.addColorStop(1, form.haze + '00');
    light.fillStyle = outer;
    light.fillRect(-192, -192, 384, 384);
    const inner = light.createRadialGradient(0, -6, 9, 0, 0, 154);
    inner.addColorStop(0, palette.rim + '37');
    inner.addColorStop(0.35, (phase === 3 ? palette.rim : palette.glow) + '32');
    inner.addColorStop(0.68, (phase === 3 ? form.haze : palette.glow) + '27');
    inner.addColorStop(1, palette.glow + '00');
    light.fillStyle = inner;
    light.fillRect(-192, -192, 384, 384);

    const beam = rays.getContext('2d');
    beam.translate(160, 160);
    const shaft = beam.createLinearGradient(0, 0, 0, -155);
    shaft.addColorStop(0, palette.rim + '00');
    shaft.addColorStop(0.35, palette.glow + '10');
    shaft.addColorStop(0.62, palette.glow + (phase === 1 ? '42' : '72'));
    shaft.addColorStop(0.77, palette.rim + (phase === 3 ? '65' : '46'));
    shaft.addColorStop(1, palette.glow + '00');
    for (let i = 0; i < form.rays; i++) {
        const angle = i * _DUEL_AURA_TAU / form.rays + Math.sin(i * 4.8) * 0.17;
        const reach = 130 + i % 3 * 9;
        const spread = phase === 1 ? 11 + i % 4 * 2 : 8 + i % 3 * 3;
        beam.save();
        beam.rotate(angle);
        beam.fillStyle = shaft;
        beam.beginPath();
        beam.moveTo(-2, -29);
        beam.quadraticCurveTo(-spread, -reach * 0.67, 1, -reach);
        beam.quadraticCurveTo(spread, -reach * 0.68, 2, -29);
        beam.fill();
        if (phase > 1) {
            beam.strokeStyle = shaft;
            beam.lineWidth = phase === 2 ? 1.5 : 2;
            beam.beginPath();
            beam.moveTo(0, -reach * 0.47);
            beam.lineTo(-3, -reach * 0.65);
            beam.lineTo(phase === 2 ? 8 : 5, -reach * 0.78);
            beam.stroke();
        }
        beam.restore();
    }
    return {haze, rays, palette, form};
}

function _bakeDuelRim(sprite, color) {
    const layer = document.createElement('canvas');
    layer.width = sprite.width; layer.height = sprite.height;
    const g = layer.getContext('2d');
    g.drawImage(sprite, -1.4, -1.8);
    g.drawImage(sprite, 1.35, -0.6);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color + '82';
    g.fillRect(0, 0, layer.width, layer.height);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(sprite, 0, 0);
    g.globalCompositeOperation = 'destination-over';
    g.drawImage(sprite, 0, 0);
    g.globalCompositeOperation = 'source-over';
    return layer;
}

function _duelBlend(first, second, mix) {
    return first + (second - first) * mix;
}

function _drawDuelAuraParticles(ctx, first, second, mix, rx, ry, phaseMorph, time, alpha, low) {
    const drift = _duelBlend(first.form.drift, second.form.drift, mix);
    const count = low ? 10 : _DUEL_AURA_PARTICLES.length;
    for (let band = 0; band < 3; band++) {
        ctx.beginPath();
        for (let i = band; i < count; i += 3) {
            const seed = _DUEL_AURA_PARTICLES[i];
            const life = (time * 0.3 + seed.start) % 1;
            const progress = life + (drift - 0.3) * Math.sin(life * Math.PI);
            const radius = 0.34 + 0.66 * progress;
            const x = seed.x * rx * radius + Math.sin(i + life * 4) * 7;
            const y = seed.y * ry * radius - (9 + 15 * phaseMorph) * life;
            const size = (0.85 + i % 4 * 0.29) * Math.sin(life * Math.PI);
            const wide = size * (1 - 0.22 * phaseMorph);
            const high = size * (1 + phaseMorph * 0.67);
            if (phaseMorph < 0.35) {
                ctx.moveTo(x + wide, y);
                ctx.ellipse(x, y, wide, high, 0, 0, _DUEL_AURA_TAU);
            } else {
                const slant = high * Math.max(0, phaseMorph - 0.8) * seed.x * 0.57;
                ctx.moveTo(x + slant, y - high);
                ctx.lineTo(x + wide, y);
                ctx.lineTo(x - slant, y + high);
                ctx.lineTo(x - wide, y);
                ctx.closePath();
            }
        }
        const opacity = alpha * (0.46 + band * 0.12);
        ctx.fillStyle = band === 1 ? first.palette.vein : first.palette.rim;
        ctx.globalAlpha = opacity * (1 - mix);
        ctx.fill();
        if (mix > 0) {
            ctx.fillStyle = band === 1 ? second.palette.vein : second.palette.rim;
            ctx.globalAlpha = opacity * mix;
            ctx.fill();
        }
    }
}

function _strokeDuelAuraRing(ctx, first, second, mix, time, slot, period, rx, ry, charge, fire, alpha) {
    if (alpha < 0.004) return;
    const age = (time / period + 0.23 + slot * 0.5) % 1;
    const surge = age + charge * age * (1 - age) * 0.43;
    const radius = 0.4 + surge * 0.53 + fire * 0.045;
    const opacity = alpha * Math.sin(age * Math.PI) ** 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * radius, ry * radius * 0.83, 0, 0, _DUEL_AURA_TAU);
    ctx.strokeStyle = first.palette.rim;
    ctx.globalAlpha = opacity * (1 - mix);
    ctx.stroke();
    if (mix > 0) {
        ctx.strokeStyle = second.palette.rim;
        ctx.globalAlpha = opacity * mix;
        ctx.stroke();
    }
}

function _drawDuelAura(ctx, first, second, mix, phaseMorph, time, fx, low, alpha, charge, fire, lowerScale) {
    const glow = fx.glow !== false;
    const particles = fx.particles !== false;
    if (alpha < 0.003 || (!glow && !particles)) return;
    const motion = !fx.reducedMotion;
    const a = first.form, b = second.form;
    const t = motion ? time : 0;
    const breathing = _duelBlend(Math.sin(t * a.breath), Math.sin(t * b.breath), mix);
    const deepBreath = 0.5 + 0.5 * breathing;
    const heartbeat = Math.max(0, Math.sin(t * 2.56)) ** 6;
    const beat = motion ? _duelBlend(deepBreath, heartbeat, Math.max(0, phaseMorph - 1)) : 0.42;
    const outward = motion ? fire : 0;
    const energy = motion ? charge : 0;
    const swell = 1 + beat * 0.06 + outward * 0.09;
    const rx = _duelBlend(a.rx, b.rx, mix) * swell;
    const ry = _duelBlend(a.ry, b.ry, mix) * swell;
    const strength = alpha * Math.min(1, 0.73 + beat * 0.17 + energy * 0.2 + outward * 0.09);
    ctx.save();
    ctx.translate(0, -_duelBlend(a.lift, b.lift, mix));
    ctx.scale(1, lowerScale);
    if (glow) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = strength * (1 - mix);
        ctx.drawImage(first.haze, -rx, -ry, rx * 2, ry * 2);
        if (mix > 0) {
            ctx.globalAlpha = strength * mix;
            ctx.drawImage(second.haze, -rx, -ry, rx * 2, ry * 2);
        }
    }
    if (glow && !low) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.scale(1, ry / rx);
        ctx.rotate(t * a.spin);
        const rayAlpha = strength * (0.38 + phaseMorph * 0.12);
        ctx.globalAlpha = rayAlpha * (1 - mix);
        ctx.drawImage(first.rays, -rx, -rx, rx * 2, rx * 2);
        if (mix > 0) {
            ctx.rotate(t * (b.spin - a.spin));
            ctx.globalAlpha = rayAlpha * mix;
            ctx.drawImage(second.rays, -rx, -rx, rx * 2, rx * 2);
        }
        ctx.restore();
    }
    if (glow && motion) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 0.75 + phaseMorph * 0.22 + outward * 0.45;
        if (low) {
            _strokeDuelAuraRing(ctx, first, second, mix, t, 0, 3.55, rx, ry, energy, outward,
                strength * _duelBlend(a.ring, b.ring, mix));
        } else {
            _strokeDuelAuraRing(ctx, first, first, 0, t, 0, a.period, rx, ry, energy, outward, strength * a.ring * (1 - mix));
            _strokeDuelAuraRing(ctx, first, first, 0, t, 1, a.period, rx, ry, energy, outward, strength * a.ring * Math.max(0, 1 - 2 * mix));
            if (mix > 0) {
                _strokeDuelAuraRing(ctx, second, second, 0, t, 0, b.period, rx, ry, energy, outward, strength * b.ring * mix);
                _strokeDuelAuraRing(ctx, second, second, 0, t, 1, b.period, rx, ry, energy, outward, strength * b.ring * Math.max(0, 2 * mix - 1));
            }
        }
    }
    if (particles) {
        ctx.globalCompositeOperation = 'source-over';
        _drawDuelAuraParticles(ctx, first, second, mix, rx, ry, phaseMorph, t, strength, low);
    }
    ctx.restore();
}

function _transformDuelBody(ctx, x, y, tilt, scaleX, scaleY) {
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    ctx.scale(scaleX, scaleY);
}

function _bakeDuelCrown(phase) {
    const sprite = document.createElement('canvas');
    sprite.width = 252; sprite.height = 160;
    const ctx = sprite.getContext('2d');
    const pal = DuelFX.getPhasePalette(phase);
    ctx.translate(126, 104);
    const crown = ctx.createLinearGradient(0, -105, 0, 48);
    crown.addColorStop(0, phase === 2 ? '#c9a8d4' : '#ffe0a2');
    crown.addColorStop(0.42, phase === 2 ? '#49395f' : '#7e3552');
    crown.addColorStop(1, '#0c091c');
    for (let i = -3; i <= 3; i++) {
        const bx = i * 16, tx = i * (phase === 2 ? 25 : 35);
        const tipY = -91 + Math.abs(i) * (phase === 2 ? 13 : 10);
        ctx.fillStyle = crown; ctx.strokeStyle = pal.rim; ctx.lineWidth = 1.35;
        ctx.beginPath(); ctx.moveTo(bx - 13, 25);
        ctx.quadraticCurveTo(tx - 6, tipY + 30, tx, tipY);
        ctx.quadraticCurveTo(tx + 8, tipY + 39, bx + 14, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#100d25'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tx, tipY + 12); ctx.lineTo(bx + 1, -11); ctx.lineTo(bx + 5, 12); ctx.stroke();
    }
    return sprite;
}

function _bakeDuelMantleArmor(phase) {
    const cv = document.createElement('canvas');
    cv.width = 244; cv.height = 122;
    const g = cv.getContext('2d');
    const pal = DuelFX.getPhasePalette(phase);
    const pat = g.createLinearGradient(0, 20, 0, 111);
    pat.addColorStop(0, ['#495657', '#58505b', '#645254'][phase - 1]);
    pat.addColorStop(0.47, ['#303f45', '#3a344a', '#48313d'][phase - 1]);
    pat.addColorStop(0.78, '#191b29'); pat.addColorStop(1, '#10141e');
    const ends = [[26, 89, 14], [56, 72, 23], [85, 58, 11], [121, 51, 34],
        [149, 58, 18], [179, 72, 26], [208, 89, 13]];
    const lobes = phase === 1 ? [1, 2, 3, 4, 5] : phase === 2 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
    for (const i of lobes) {
        const [x, y, h] = ends[i];
        const lean = i < 3 ? -1 : 1;
        const length = h * (phase === 1 ? 0.43 : phase === 2 ? 0.69 : 1);
        const tx = x + lean * (5 + i % 3 * 4);
        g.fillStyle = '#08091086';
        g.beginPath(); g.ellipse(x + 7, y + 16, 21, 5, lean * 0.18, 0, Math.PI * 2); g.fill();
        g.fillStyle = pat;
        g.beginPath(); g.moveTo(x - 15, y + 14);
        g.quadraticCurveTo(tx - 6, y + 5 - length * 0.34, tx - 1, y - length);
        g.lineTo(tx + 1.9, y - length + (i === 2 ? 6.4 : 1.1));
        g.bezierCurveTo(tx + 8, y - 1, x + 12, y + 7, x + 22, y + 13);
        g.quadraticCurveTo(x + 8, y + 18, x - 15, y + 14);
        g.fill();
        g.strokeStyle = pal.rim; g.globalAlpha = 0.36; g.lineWidth = 1.15;
        g.beginPath(); g.moveTo(tx - 1, y - length + 3);
        g.quadraticCurveTo(tx - lean * 2, y + 1, x - 9, y + 10); g.stroke();
        g.globalAlpha = 1;
        g.strokeStyle = '#161421'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(tx + 1.5, y - length + 8);
        g.lineTo(x + 1, y + 2); g.lineTo(x - 1, y + 9); g.lineTo(x + 6, y + 13); g.stroke();
    }
    return cv;
}

function _bakeDuelEyeArt(phase) {
    const socket = document.createElement('canvas'), iris = document.createElement('canvas');
    socket.width = 88; socket.height = 64;
    iris.width = iris.height = 64;
    const g = socket.getContext('2d'), k = iris.getContext('2d');
    const edge = ['#384947', '#4a364b', '#542c36'][phase - 1];
    const recess = g.createRadialGradient(46, 33, 5, 45, 31, 43);
    recess.addColorStop(0, '#07070e'); recess.addColorStop(0.54, '#100c13');
    recess.addColorStop(0.86, edge); recess.addColorStop(1, '#18232a00');
    g.fillStyle = recess; g.fillRect(0, 0, 88, 64);
    const grad = k.createRadialGradient(31, 29, 3, 32, 32, 31);
    grad.addColorStop(0, '#be8c3f');
    grad.addColorStop(0.44, phase === 3 ? '#f6a250' : '#ba833b');
    grad.addColorStop(0.77, '#6b4629'); grad.addColorStop(0.94, '#281b1e');
    grad.addColorStop(1, '#140f17');
    k.fillStyle = grad; k.beginPath(); k.arc(32, 32, 31, 0, Math.PI * 2); k.fill();
    for (let i = 0; i < 38; i++) {
        const a = i / 38 * Math.PI * 2, root = 8 + i % 7 * 0.85;
        k.strokeStyle = i % 3 === 0 ? '#f1bb6b88' : '#33222a99'; k.lineWidth = i % 5 === 0 ? 1.3 : 0.6;
        k.beginPath(); k.moveTo(32 + Math.cos(a) * root, 32 + Math.sin(a) * root);
        k.quadraticCurveTo(32 + Math.cos(a + 0.09) * 20, 32 + Math.sin(a + 0.09) * 20,
            32 + Math.cos(a + 0.12) * 28, 32 + Math.sin(a + 0.12) * 28); k.stroke();
    }
    return { socket, iris };
}

function _gradeDuelSprite(sprite, strength, accents, floor = 4) {
    const ctx = sprite.getContext('2d');
    const image = ctx.getImageData(0, 0, sprite.width, sprite.height);
    const colors = image.data;
    for (let i = 0; i < colors.length; i += 4) {
        if (!colors[i + 3]) continue;
        const luma = colors[i] * 0.2126 + colors[i + 1] * 0.7152 + colors[i + 2] * 0.0722;
        const lift = Math.max(0, (luma - 132) / 123) ** 2;
        const target = Math.min(255, floor + luma * strength + lift * accents);
        const gain = target / Math.max(1, luma);
        for (let ch = 0; ch < 3; ch++) {
            colors[i + ch] = 0.87 * colors[i + ch] * gain + 0.13 * target;
        }
    }
    ctx.putImageData(image, 0, 0);
    return sprite;
}

function bakeDuelBossAssets() {
    if (_duelBossAssets) return _duelBossAssets;
    _duelBossAssets = {
        carapace1: _bakeProceduralCarapace(1),
        carapace2: _gradeDuelSprite(_bakeProceduralCarapace(2), 0.375, 25),
        carapace3: _gradeDuelSprite(_bakeProceduralCarapace(3), 0.375, 25),
        wing2: _gradeDuelSprite(_bakeProceduralWing(2), 0.40, 19),
        wing3: _gradeDuelSprite(_bakeProceduralWing(3), 0.39, 23),
        p3Ring: _bakePhase3RuneRing(),
        limbs: [_bakeDuelLimb(1), ...[2, 3].map(phase => _gradeDuelSprite(_bakeDuelLimb(phase), 0.389, 25))],
        auras: [1, 2, 3].map(_bakeDuelAura),
        crowns: [2, 3].map(phase => _gradeDuelSprite(_bakeDuelCrown(phase), 0.33, 24)),
        eyes: [1, 2, 3].map(_bakeDuelEyeArt),
        armor: [1, 2, 3].map(phase => _gradeDuelSprite(_bakeDuelMantleArmor(phase), 0.47, 15))
    };
    const assets = _duelBossAssets;
    assets.carapaces = [assets.carapace1, assets.carapace2, assets.carapace3];
    const edge = (sprite, i) => _bakeDuelRim(sprite, assets.auras[i].palette.rim);
    assets.rimCarapaces = assets.carapaces.map(edge);
    assets.rimLimbs = assets.limbs.map(edge);
    return assets;
}

function _drawDetailedBossEye(ctx, ex, ey, rx, ry, lookX, lookY, pal, blinkAmt, eyes, side = 1, minor = false) {
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(side * 0.12);
    const lid = Math.max(0.06, (minor ? 0.68 : 0.88) * (1 - blinkAmt));
    ctx.drawImage(eyes.socket, -rx * 1.48, -ry * 1.58, rx * 2.96, ry * 3.16);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-rx, -ry * 0.12);
    ctx.quadraticCurveTo(rx * 0.18 * side, -ry * 1.03 * lid, rx, -ry * 0.12);
    ctx.quadraticCurveTo(rx * -0.08 * side, ry * 1.16 * lid, -rx, -ry * 0.12);
    ctx.clip();
    ctx.fillStyle = '#513a2a'; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    const dx = lookX - ex, dy = lookY - ey, distance = Math.hypot(dx, dy) || 1;
    const ix = (dx / distance) * rx * 0.20, iy = (dy / distance) * ry * 0.23;
    const irisR = Math.min(rx, ry) * 0.89;
    ctx.drawImage(eyes.iris, ix - irisR, iy - irisR, irisR * 2, irisR * 2);
    ctx.fillStyle = '#110c13'; ctx.beginPath();
    ctx.ellipse(ix, iy, irisR * 0.16, irisR * 0.86, -side * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = minor ? '#e4bf81' : '#ffe3b2';
    ctx.beginPath(); ctx.arc(ix - irisR * 0.31, iy - irisR * 0.38, Math.max(0.45, irisR * 0.13), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = minor ? '#53434a' : '#615c5c'; ctx.lineWidth = minor ? 0.7 : 1.4;
    ctx.beginPath(); ctx.moveTo(-rx * 1.12, -ry * 0.14);
    ctx.quadraticCurveTo(rx * side * 0.3, -ry * 1.64, rx * 1.13, -ry * 0.27);
    ctx.stroke();
    ctx.strokeStyle = minor ? '#332b39' : pal.rim;
    ctx.globalAlpha *= 0.27; ctx.lineWidth = 0.72;
    ctx.beginPath(); ctx.moveTo(-rx * 0.81, -ry * 0.63);
    ctx.quadraticCurveTo(rx * side * 0.24, -ry * 1.55, rx * 0.83, -ry * 0.76); ctx.stroke();
    ctx.restore();
}

function _drawDuelVeilBeard(ctx, phase, phaseMorph, release, t) {
    const reach = 33 + phaseMorph * 7, lip = 3 + release * 5.8;
    const palette = [
        ['#090d17', '#19252f', '#476661'],
        ['#110d1d', '#392639', '#987180'],
        ['#150b17', '#442036', '#ae817e']
    ][phase - 1];
    ctx.save(); ctx.translate(0, 25);
    ctx.fillStyle = '#090910';
    ctx.beginPath(); ctx.ellipse(0, 3, 10 + release * 5, lip, -0.08, 0, Math.PI * 2); ctx.fill();
    if (release > 0.08) {
        ctx.strokeStyle = '#803c62'; ctx.lineWidth = 1; ctx.globalAlpha *= release * 0.66;
        ctx.beginPath(); ctx.ellipse(0, 5, 4 + release * 4, 1.5 + release * 2, -0.08, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'round';
    const strands = 9;
    for (let j = 0; j < strands; j++) {
        const i = j - 4, sign = i < 0 ? -1 : 1;
        const drift = Math.sin(t * (2.2 + j * 0.23) + j * 1.9) * (1.7 + j % 3);
        const part = sign * release * (3 + j % 4 * 0.85);
        const anchor = i * 3.35;
        const length = reach - Math.abs(i) * 3.15 + (j % 3) * 3.3;
        const thick = 2.25 + 1.6 * (1 - Math.abs(i) / 6);
        const path = () => {
            ctx.beginPath(); ctx.moveTo(anchor, -7 + Math.abs(i) * 1.25);
            ctx.bezierCurveTo(anchor - sign * 3.3, 1, anchor + sign * 4.4 + part, length * 0.24, anchor + part + drift, length * 0.48);
            ctx.bezierCurveTo(anchor + part + drift - sign * 6, length * 0.71, anchor + part + sign * 3.7, length * 0.81,
                anchor + part + drift * 1.5 + sign * 5.6, length);
        };
        path(); ctx.strokeStyle = palette[0]; ctx.lineWidth = thick + 1.2; ctx.stroke();
        ctx.translate(0.55, -0.6); path(); ctx.strokeStyle = palette[1]; ctx.lineWidth = thick; ctx.stroke();
        ctx.globalAlpha = 0.29; ctx.strokeStyle = palette[2]; ctx.lineWidth = 0.76; ctx.stroke();
        ctx.globalAlpha = 1; ctx.translate(-0.55, 0.6);
    }
    ctx.restore();
}

function _duelBodyScale(morph) {
    return 1.296 + morph * 0.19;
}

// The mantle scale also sets the combat ellipse.
function getDuelBossHitbox(phase, phaseMorph) {
    const pm = typeof phaseMorph === 'number'
        ? Math.max(0, Math.min(2, phaseMorph))
        : Math.max(0, Math.min(2, ((phase || 1) - 1)));
    const scale = _duelBodyScale(pm);
    return {
        rx: Math.round(72 * scale),
        ry: Math.round(57 * scale),
        offsetY: -4
    };
}

// Main pure-procedural 3-phase Duel Boss renderer (zero boss PNGs, opaque body, <= 1.5ms dynamic)
let _duelHitSurface = null;
// Casting energy: it jumps with every cue and fades slowly, so the arms keep flailing for a moment after each skill
let _duelFlailE = 0, _duelFlailLast = 0;
function drawDuelEgregor(ctx, x, y, state) {
    if (!ctx) return;
    const assets = bakeDuelBossAssets();
    const st = state || {};
    const hit = st.hitFlash || 0;
    const phaseMorph = typeof st.phaseMorph === 'number'
        ? Math.max(0, Math.min(2, st.phaseMorph))
        : Math.max(0, Math.min(2, (st.phase || 1) - 1));
    const phase = Math.floor(phaseMorph) + 1;
    const upper = Math.min(3, phase + 1);
    const mix = phaseMorph % 1;
    const t = typeof st.time === 'number' ? st.time : performance.now() * 0.001;
    const fx = window._fxOpts || _DUEL_DEFAULT_FX;
    const low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
    const moving = !fx.reducedMotion;
    const cue = st.cue, wind = cue?.wind || 0, fire = cue?.fire || 0;
    const gest = st.gesture || null;
    const flailDt = Math.min(0.1, Math.max(0, t - _duelFlailLast));
    _duelFlailLast = t;
    _duelFlailE = Math.max(_duelFlailE * Math.exp(-flailDt / 0.8), Math.max(wind * 0.5, fire));
    // Even between skills the arms keep a slow writhe, so the boss never hangs still
    const flail = (!fx.reducedMotion) ? Math.min(1, Math.max(_duelFlailE, 0.14 + 0.04 * Math.sin(t * 1.3))) : 0;
    const pulse = moving ? Math.sin(t * 2.1) : 0;
    const scale = _duelBodyScale(phaseMorph) * (1 + pulse * 0.012) *
        (st.contractScale ?? 1) * (1 - 0.5 * (st.collapseProgress || 0));
    const growth2 = Math.min(1, phaseMorph * 1.55);
    const growth3 = Math.max(0, phaseMorph - 1);
    const light = Math.max(wind * 0.7, st.chargeGlow || 0);
    const pal = DuelFX.getPhasePalette(phase);
    const nextPal = DuelFX.getPhasePalette(upper);
    const gazeBias = gest && gest.gazeBias ? gest.gazeBias : null;
    const lookX = (gazeBias && gazeBias.lock) ? ((st.playerX ?? x) - x) : (cue ? cue.dirX * 400 : (st.playerX ?? x) - x) + (gazeBias ? gazeBias.x * 110 : 0);
    const lookY = (gazeBias && gazeBias.lock) ? ((st.playerY ?? y + 300) - y) : (cue ? cue.dirY * 400 : (st.playerY ?? y + 300) - y) + (gazeBias ? gazeBias.y * 110 : 0);
    const blink = i => moving ? Math.max(0, (Math.sin(t * 1.43 + i * 2.17) - 0.982) * 49) : 0;
    const rim = mix > 0.5 ? nextPal.rim : pal.rim;
    const eyeArt = assets.eyes[phase - 1];
    const particleClock = moving ? t : 0;
    const tilt = moving ? gest?.bodyTilt || 0 : 0;
    const sqX = moving ? gest?.squashX || 1 : 1;
    const sqY = moving ? gest?.squashY || 1 : 1;
    const scaleX = scale * sqX * (1 + flail * 0.012);
    const scaleY = scale * sqY * (1 - flail * 0.009);
    const hasHit = hit > 0.02 && !st.silhouettePass;
    const recoil = hasHit ? hit * 3.2 : 0;
    const kickX = (cue?.dirX || 0) * fire * 5;
    const kickY = (cue?.dirY || 0) * fire * 5;
    const rimLit = st.auraStrength > 0 && fx.glow !== false;
    if (st.auraStrength > 0 && !st.silhouettePass && (fx.glow !== false || fx.particles !== false)) {
        const auraCtx = st.auraContext || ctx;
        const first = assets.auras[phase - 1], second = assets.auras[upper - 1];
        const centerX = x - kickX + (st.hitDir?.x || 0) * recoil;
        const centerY = y - kickY + (st.hitDir?.y ?? -1) * recoil;
        const radiusX = _duelBlend(first.form.rx, second.form.rx, mix);
        const radiusY = _duelBlend(first.form.ry, second.form.ry, mix);
        const lowReach = auraCtx.canvas.height * 0.66 - centerY - Math.abs(Math.sin(tilt)) * radiusX * scaleX;
        const lowerScale = Math.max(0.34, Math.min(1, lowReach / (radiusY * 1.13 * scaleY)));
        const fade = auraCtx.globalAlpha * st.auraStrength * (1 - (st.collapseProgress || 0)) ** 2;
        auraCtx.save();
        _transformDuelBody(auraCtx, centerX, centerY, tilt, scaleX, scaleY);
        _drawDuelAura(auraCtx, first, second, mix, phaseMorph, t, fx, low, fade, light, fire, lowerScale);
        auraCtx.restore();
    }
    if (hasHit) {
        if (!_duelHitSurface) {
            _duelHitSurface = document.createElement('canvas');
            _duelHitSurface.width = 1000; _duelHitSurface.height = 660;
        }
        const g = _duelHitSurface.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1000, 660);
        drawDuelEgregor(g, 500, 300, { ...st, time: t, silhouettePass: true, hitFlash: 0,
            playerX: (st.playerX ?? x) - x + 500, playerY: (st.playerY ?? y + 400) - y + 300,
            eyeSamples: null });
        g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = hit * 0.35;
        g.fillStyle = DuelFX.getPhasePalette(st.phase || 1).rim; g.fillRect(0, 0, 1000, 660); g.restore();
        ctx.drawImage(_duelHitSurface, x - 500 + (st.hitDir?.x || 0) * recoil, y - 300 + (st.hitDir?.y ?? -1) * recoil);
        return;
    }
    ctx.save();
    _transformDuelBody(ctx, x - kickX, y - kickY, tilt, scaleX, scaleY);
    ctx.globalCompositeOperation = 'source-over';

    function crossfade(first, second, x, y, w, h, alpha = 1) {
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        ctx.drawImage(first, x, y, w, h);
        if (mix > 0) {
            ctx.globalAlpha = alpha * mix;
            ctx.drawImage(second, x, y, w, h);
        }
        ctx.globalAlpha = 1;
    }

    if (growth3 > 0) {
        const r = 145 + growth3 * 28;
        ctx.save(); ctx.rotate(particleClock * 0.19); ctx.globalAlpha = growth3 * 0.68;
        ctx.drawImage(assets.p3Ring, -r, -r, r * 2, r * 2); ctx.restore();
        if (fx.particles !== false) {
            ctx.strokeStyle = '#ffc195'; ctx.fillStyle = '#38273e';
            const count = low ? 4 : 10;
            for (let i = 0; i < count; i++) {
                const a = i * Math.PI * 2 / count + particleClock * 0.18;
                const d = 128 + (i % 3) * 17 + pulse * 4;
                ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d * 0.82);
                ctx.rotate(a + particleClock * 0.14);
                ctx.globalAlpha = growth3 * (0.42 + (i % 4) * 0.11);
                ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(14 + i % 3 * 4, -7);
                ctx.lineTo(6, 6); ctx.lineTo(-1, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            }
        }
    }
    for (const side of [-1, 1]) {
        ctx.save(); ctx.scale(side, 1);
        if (growth2 > 0) {
            const w = 126 + growth3 * 36;
            ctx.translate(18, -27);
            const gWing = (moving && gest && Number.isFinite(gest.wingOpen)) ? gest.wingOpen : (-wind * 0.08);
            ctx.rotate((moving ? Math.sin(t * 2.2 + side) * 0.04 : 0) + gWing);
            crossfade(assets.wing2, assets.wing3, 0, -76 * growth2, w * growth2, (114 + growth3 * 24) * growth2, growth2);
        }
        ctx.restore();
    }
    // A limb is drawn as thin slices, each turned a little more than the one before it, so the whole arm bends as one smooth curve
    const LIMB_SLICES = low ? 6 : 9;
    const limbs = rimLit ? assets.rimLimbs : assets.limbs;
    function bendLimb(bx, by, w, h, alpha, turnAt) {
        const n = LIMB_SLICES, overlap = 2;
        const imgs = [limbs[phase - 1], mix > 0 ? limbs[upper - 1] : null];
        ctx.save();
        ctx.translate(0, by);
        for (let s = 0; s < n; s++) {
            const segH = h / n;
            for (let k = 0; k < 2; k++) {
                const img = imgs[k];
                if (!img) continue;
                ctx.globalAlpha = k === 0 ? alpha : alpha * mix;
                if (ctx.globalAlpha <= 0) continue;
                ctx.drawImage(img, 0, img.height * s / n, img.width, img.height / n + 0.5,
                    bx, 0, w, segH + (s < n - 1 ? overlap : 0));
            }
            if (s < n - 1) { ctx.translate(0, segH); ctx.rotate(turnAt((s + 0.5) / n) / n); }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    function arm(i, side, x, y, angle, length, width, alpha) {
        if (alpha <= 0) return;
        ctx.save(); ctx.translate(side * x, y); ctx.scale(side, 1);
        if (gest && typeof gest.armAngle === "function" && typeof gest.bendAt === "function") {
            const gAng = moving ? gest.armAngle(i, side) : 0;
            const gReach = (moving && typeof gest.armReach === "function") ? gest.armReach(i, side) : 1;
            ctx.rotate(angle + gAng);
            const reach = length * gReach;
            const flailSec = moving ? flail * 0.08 : 0;
            const secPhase = t * 2.1 + i * 1.7 + side * 0.6;
            bendLimb(-width * 0.49, -length * 0.10, width, reach, alpha,
                u => gest.bendAt(u, i, side) + flailSec * u * Math.sin(secPhase - u * 2.0));
        } else {
            const direction = (cue?.dirX || 0) * side;
            const sway = moving ? Math.sin(t * (1.1 + i * 0.07) + i * 1.7 + side) * 0.04 : 0;
            ctx.rotate(angle + sway + wind * (0.24 + direction * 0.17) + fire * 0.22);
            const reach = length * (1 - wind * 0.12 + fire * 0.1);
            const amp = moving ? 0.28 + flail * 0.42 : 0;
            const speed = 1.7 + flail * 1.6;
            const wavePhase = t * speed + i * 1.9 + side * 0.8;
            const curl = wind * 0.2 - fire * 0.12;
            bendLimb(-width * 0.49, -length * 0.10, width, reach, alpha,
                u => curl + amp * (0.25 + 0.75 * u) * Math.sin(wavePhase - u * 2.6));
        }
        ctx.restore();
    }
    for (const side of [-1, 1]) {
        arm(1, side, 33, 4, -0.81, 113 + phaseMorph * 17, 58 + phaseMorph * 10, 1);
        arm(2, side, 43, 2, -1.09, 155 * growth2, 70 * growth2, growth2);
        arm(3, side, 65, -18, -1.31, 222 * growth3, 109 * growth3, growth3);
    }
    if (growth2 > 0) {
        const crownW = 192 + growth3 * 52, crownH = 125 + growth3 * 18;
        crossfade(assets.crowns[0], assets.crowns[1], -crownW / 2 * growth2, -crownH * 0.84 * growth2, crownW * growth2, crownH * growth2, growth2);
    }
    const bodyW = 174 + phaseMorph * 22, bodyH = 174 + phaseMorph * 17;
    const carapaces = rimLit ? assets.rimCarapaces : assets.carapaces;
    crossfade(carapaces[phase - 1], carapaces[upper - 1], -bodyW / 2, -bodyH * 0.57, bodyW, bodyH);

    const armorW = 129 + phaseMorph * 17;
    crossfade(assets.armor[phase - 1], assets.armor[upper - 1], -armorW * 0.50, -92 - phaseMorph * 11, armorW, 70 + phaseMorph * 8);

    for (const side of [-1, 1]) {
        arm(4, side, 18, 22, -0.14, 104 + phaseMorph * 13, 51 + phaseMorph * 4, 1);
        arm(5, side, 29, 18, -0.48, 95 + phaseMorph * 15, 47 + phaseMorph * 6, 1);
        arm(6, side, 7, 27, 0.09, 73 + phaseMorph * 9, 23, 1);
        arm(7, side, 14, 29, -0.08, 57, 18, 1);
    }
    const scar = Math.max(light, 0.28 + pulse * 0.08);
    if (fx.glow !== false) {
        const sweep = motion => (Math.sin(motion) + 1) * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rim; ctx.lineCap = 'round';
        ctx.globalAlpha = (0.16 + 0.22 * sweep(t * 1.8) + light * 0.28);
        ctx.lineWidth = 0.85;
        ctx.beginPath(); ctx.moveTo(-53 - phaseMorph * 8, -23);
        ctx.bezierCurveTo(-56 - phaseMorph * 8, -49 - phaseMorph * 13, -34, -66 - phaseMorph * 12, -13, -66 - phaseMorph * 12);
        ctx.stroke();
        if (!low) {
            const d = (t * 0.42) % 1;
            ctx.globalAlpha *= (0.34 + 0.66 * Math.sin(d * Math.PI));
            ctx.lineWidth = 0.82;
            ctx.beginPath(); ctx.moveTo(-18 - d * 11, -61 + d * 30);
            ctx.lineTo(-13 - d * 12, -56 + d * 24); ctx.lineTo(-19 - d * 11, -51 + d * 24); ctx.stroke();
        }
        ctx.restore();
    }
    ctx.strokeStyle = rim; ctx.lineWidth = 1.35;
    ctx.globalAlpha = scar * 0.48;
    for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 14, -54); ctx.lineTo(side * 22, -39);
        ctx.lineTo(side * 16, -31); ctx.lineTo(side * 28, -22); ctx.lineTo(side * 31, -11); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
        const outer = i === 0 || i === 3;
        const lag = !cue && st.eyeSamples?.[(i * 3) % 11];
        const gazeX = lag ? lag.x - x : lookX;
        const gazeY = lag ? lag.y - y : lookY;
        _drawDetailedBossEye(ctx, [-31, -12, 12, 31][i], outer ? 1 : -8, outer ? 9.5 : 11.5,
            (outer ? 6.2 : 7.6) * (1 + wind * 0.32), gazeX, gazeY, pal, blink(i), eyeArt, i < 2 ? 1 : -1);
    }
    for (let i = 0; i < 5; i++) {
        const extra = i > 1;
        const growth = Math.max(0, Math.min(1, (extra ? growth3 : growth2) * 1.7 - i % 3 * 0.22));
        if (!growth) continue;
        const ex = [-20, 20, -34, 4, 31][i], ey = [-29, -32, -50, -64, -47][i];
        _drawDetailedBossEye(ctx, ex, ey, (i === 3 ? 4.3 : 3.7) * growth, 2.65 * growth, lookX, lookY, extra ? DuelFX.getPhasePalette(3) : nextPal, blink(i), eyeArt, i % 2 ? 1 : -1, true);
    }
    const lastEye = Math.max(0, Math.min(1, growth3 * 1.54 - 0.38));
    if (lastEye > 0) _drawDetailedBossEye(ctx, 21, -58, 3.4 * lastEye, 2.2 * lastEye,
        lookX, lookY, nextPal, blink(8), eyeArt, -1, true);
    _drawDuelVeilBeard(ctx, phase, phaseMorph, Math.min(1, Math.max(fire, st.release || 0)), particleClock);
    if (fx.particles !== false && !st.silhouettePass) {
        ctx.fillStyle = rim;
        for (let i = 0; i < (low ? 3 : 8); i++) {
            const p = (particleClock * (0.35 + i % 3 * 0.07) + i * 0.23) % 1;
            ctx.globalAlpha = Math.sin(p * Math.PI) * 0.7;
            ctx.fillRect((i % 2 ? -1 : 1) * (22 + i * 4 + Math.sin(i + p * 7) * 6), 30 + p * 97, 1.5, 3 + 3 * p);
        }
        ctx.globalAlpha = 1;
    }
    if (fx.glow !== false && (fire > 0 || st.release > 0)) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rim; ctx.fillStyle = '#fff2d8';
        if (fire > 0) {
            const side = cue.dirX > 0 ? 1 : -1;
            const kind = cue.kind;
            const mx = side * (kind === 'eye_beams' ? 15 : kind === 'tendril_lash' ? 40 : 22);
            const my = kind === 'eye_beams' ? -5 : kind === 'tendril_lash' ? 68 : 24;
            ctx.globalAlpha = fire * 0.87; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(mx, my, 9 + fire * 10, 4 + fire * 4, -side * 0.5, 0, Math.PI * 2); ctx.stroke();
            ctx.fillRect(mx - 4, my - 1.2, 8, 2.4);
        }
        if (st.release > 0) {
            ctx.globalAlpha = st.release * 0.68;
            ctx.beginPath(); ctx.ellipse(0, 0, 55 + (1 - st.release) * 90, 40 + (1 - st.release) * 50, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (st.debugHitbox) {
        const hb = getDuelBossHitbox(phase, phaseMorph);
        ctx.save();
        ctx.strokeStyle = '#ff4d6d';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(0, (hb.offsetY || 0) / scale, hb.rx / scale, hb.ry / scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

if (typeof window !== 'undefined') {
    window._duelHash2 = _duelHash2;
    window._duelValueNoise2D = _duelValueNoise2D;
    window.buildOrganicTentacleSpine = buildOrganicTentacleSpine;
    window.drawOrganicTentacle = drawOrganicTentacle;
    window.checkOrganicTentacleCollision = checkOrganicTentacleCollision;
    window.bakeDuelBossAssets = bakeDuelBossAssets;
    window.getDuelBossHitbox = getDuelBossHitbox;
    window.drawDuelEgregor = drawDuelEgregor;
}
// DUEL_EGREGOR_END
