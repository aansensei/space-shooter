// Pisces: Space Journey, Copyright 2024 An Nguyen. Licensed under the MIT License.
// The Duat doorway uses a decoded scene or a cached Egyptian fallback.
const AMMIT_PYRAMID_DOOR = { x: 0.505859375, y: 0.6515625 };
const AMMIT_PYRAMID_ASPECT = 1.6;
const _amPyramid = new Image();
let _amPyramidReady = false;
let _amPyramidPending = false;
let _amPyramidEpoch = 0;
let _amPyramidFallback = null;
let _amLanePattern = null;
const _amRiftPoints = new Float32Array(64);
for (let _amI = 0; _amI < 32; _amI++) {
    const a = _amI * Math.PI / 16, r = 0.88 + 0.12 * Math.sin(_amI * 17.17) ** 2;
    _amRiftPoints[_amI * 2] = Math.cos(a) * r;
    _amRiftPoints[_amI * 2 + 1] = Math.sin(a) * r;
}

function _ammitPreparePyramid() {
    if (!_amPyramidFallback) _ammitBakePyramid();
    if (_amPyramidPending) return;
    _amPyramidPending = true;
    const epoch = ++_amPyramidEpoch;
    _amPyramid.onload = function () {
        _amPyramid.decode().then(function () { if (epoch === _amPyramidEpoch) _amPyramidReady = true; }).catch(function () {});
    };
    _amPyramid.src = 'assets/images/game/enemies/ammit-pyramid.png';
}

function _ammitReleasePyramid() {
    if (!(_mobPerf || _gfxLevel >= 2) || !_amPyramidPending) return;
    _amPyramidEpoch++; _amPyramidReady = false; _amPyramidPending = false;
    _amPyramid.onload = null; _amPyramid.removeAttribute('src');
}

function _ammitBakePyramid() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320;
    const g = c.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, 320);
    sky.addColorStop(0, '#0b0a10'); sky.addColorStop(.45, '#125b61'); sky.addColorStop(.73, '#f2b72e'); sky.addColorStop(1, '#37291a');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 320);
    g.fillStyle = '#f2b72e'; g.beginPath(); g.arc(256, 119, 64, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 3; i++) {
        const x = i === 0 ? 256 : i === 1 ? 85 : 435, y = i === 0 ? 54 : 174, r = i === 0 ? 149 : 67;
        g.fillStyle = i === 0 ? '#6e4b22' : '#826235';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - r, 239); g.lineTo(x + r, 239); g.closePath(); g.fill();
        g.fillStyle = '#30291f'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r, 239); g.lineTo(x + r * .13, 239); g.closePath(); g.fill();
    }
    for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? '#b38338' : '#65461e';
        g.beginPath(); g.moveTo(0, 240 + i * 20); g.quadraticCurveTo(170, 205 + i * 24, 512, 240 + i * 22); g.lineTo(512, 320); g.lineTo(0, 320); g.fill();
    }
    g.fillStyle = '#fff0b8'; g.fillRect(AMMIT_PYRAMID_DOOR.x * 512 - 7, AMMIT_PYRAMID_DOOR.y * 320 - 16, 14, 25);
    for (let i = 0; i < 2; i++) {
        const x = i ? 359 : 153; g.fillStyle = '#1b2324';
        g.beginPath(); g.moveTo(x, 175); g.lineTo(x - 5, 189); g.lineTo(x - 7, 246); g.lineTo(x + 7, 246); g.lineTo(x + 5, 189); g.closePath(); g.fill();
    }
    _amPyramidFallback = c;
    const stripe = document.createElement('canvas'); stripe.width = stripe.height = 24;
    const sg = stripe.getContext('2d'); sg.strokeStyle = '#ffe3d6'; sg.lineWidth = 2;
    sg.beginPath(); sg.moveTo(-12, 24); sg.lineTo(24, -12); sg.moveTo(0, 36); sg.lineTo(36, 0); sg.stroke();
    _amLanePattern = ctx.createPattern(stripe, 'repeat');
}

function _ammitEase(p) { const t = Math.max(0, Math.min(1, p)); return t * t * t * (t * (t * 6 - 15) + 10); }

function _ammitRiftPath(x, y, w, h, low) {
    ctx.beginPath();
    for (let i = 0; i < 32; i += low ? 4 : 1) {
        const px = x + _amRiftPoints[i * 2] * w, py = y + _amRiftPoints[i * 2 + 1] * h;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function _drawAmmitEntrance(enemy, now) {
    const age = now - enemy._spawnTime;
    if (age < 0 || age > 4000) return;
    const low = _mobPerf || _gfxLevel >= 2, fo = window._fxOpts;
    const open = _ammitEase((age - 450) / 950) * (1 - _ammitEase((age - 2400) / 600));
    const x = enemy.x, y = enemy.y - 20, h = Math.min(160, canvas.height * .23), w = Math.min(enemy.size * .73, canvas.width * .35);
    ctx.save(); ctx.shadowBlur = 0;
    if (open > .001) {
        _ammitRiftPath(x, y, Math.max(2, w * open), h * (.45 + .55 * open), low);
        ctx.save(); ctx.clip(); ctx.fillStyle = '#0b0a10'; ctx.fill();
        const scene = _amPyramidReady && _amPyramid.complete && _amPyramid.naturalWidth > 0 ? _amPyramid : _amPyramidFallback;
        if (scene) {
            const iw = w * 4, ih = iw / AMMIT_PYRAMID_ASPECT;
            const parallax = !low && _gfxLevel === 0 ? Math.sin(age * .0007) * 4 : 0;
            ctx.drawImage(scene, x - AMMIT_PYRAMID_DOOR.x * iw + parallax, enemy.y - AMMIT_PYRAMID_DOOR.y * ih, iw, ih);
        }
        ctx.restore();
        ctx.strokeStyle = '#0b0a10'; ctx.lineWidth = 9; ctx.stroke();
        if (!fo || fo.glow !== false) { ctx.strokeStyle = '#27d3c3'; ctx.lineWidth = low ? 3 : 6; ctx.globalAlpha = .65; ctx.stroke(); }
        ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 1.5; ctx.globalAlpha = .95; ctx.stroke();
    }
    const scar = age < 600 ? _ammitEase(age / 600) : age > 3000 ? 1 - _ammitEase((age - 3000) / 1000) : .6;
    ctx.strokeStyle = '#f2b72e'; ctx.globalAlpha = scar; ctx.lineWidth = 1.5;
    for (let i = 0; i < (low ? 3 : 7); i++) {
        const a = i * 2.39996, reach = h * scar * (.5 + .4 * Math.sin(i * 12.7) ** 2);
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * w * open, y + Math.sin(a) * h * open);
        ctx.lineTo(x + Math.cos(a + .2) * reach, y + Math.sin(a + .2) * reach);
        ctx.lineTo(x + Math.cos(a) * reach * 1.35, y + Math.sin(a) * reach * 1.35); ctx.stroke();
    }
    if (age >= 2400 && age < 3000) {
        const p = (age - 2400) / 600;
        ctx.globalAlpha = (1 - p) ** 2; ctx.strokeStyle = '#f2d27a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, enemy.y + enemy.size * .4, 30 + p * enemy.size, 10 + p * enemy.size * .35, 0, 0, Math.PI * 2); ctx.stroke();
        if (!low && (!fo || fo.screenFlash !== false) && (!fo || fo.explosions !== false)) {
            ctx.globalAlpha = (1 - p) ** 4 * .18; ctx.fillStyle = '#fff0b8'; ctx.fillRect(x - w, y - h, w * 2, h * 2);
        }
    }
    if ((!fo || fo.particles !== false) && open > 0) {
        ctx.fillStyle = '#f2d27a'; ctx.globalAlpha = open * .75;
        for (let i = 0; i < (low ? 4 : _gfxLevel === 1 ? 8 : 18); i++) {
            const p = (age * .0007 + i * .618034) % 1, a = i * 2.39996;
            ctx.fillRect(x + Math.cos(a) * w * (1 + p * .8), y + Math.sin(a) * h * (1 + p * .4), 2, 2);
        }
    }
    ctx.restore();
}

function _drawAmmitEntrances() {
    if (typeof _ammitActive !== 'undefined' && !_ammitActive) return;
    if (typeof enemies === 'undefined') return;
    for (let i = 0; i < enemies.length; i++) if (enemies[i].type === 'ammit' && enemies[i].hp > 0) {
        const e = enemies[i]; _drawAmmitEntrance(e, Number.isFinite(e._amClock) ? e._amClock : performance.now());
    }
}
