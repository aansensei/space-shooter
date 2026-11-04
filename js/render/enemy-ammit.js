// Pisces: Space Journey, Copyright 2024 An Nguyen. Licensed under the MIT License.
// Ammit, Devourer of Hearts (Elite) body, passives, and skill effects.

const _amSeeds = new Float32Array(64 * 4);
const _amCrack = new Float32Array(8 * 5);
(() => {
    let q = 37;
    const rnd = () => (q = q * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < _amSeeds.length; i++) _amSeeds[i] = rnd();
    for (let i = 0; i < _amCrack.length; i++) _amCrack[i] = rnd() * 2 - 1;
})();

if (!window._ammitSandPits) {
    window._ammitSandPits = new Array(8);
    for (let i = 0; i < 8; i++) window._ammitSandPits[i] = { x: 0, y: 0, born: -999999, life: 3000 };
}
let _amSandPitCursor = 0;

function _spawnAmmitSandPit(x, y, now, life, owner) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(now)) return;
    const pits = window._ammitSandPits;
    if (!pits || !pits.length) return;
    let slot = pits[_amSandPitCursor % pits.length];
    if (!slot) {
        slot = { x: 0, y: 0, born: -999999, life: 3000 };
        pits[_amSandPitCursor % pits.length] = slot;
    }
    slot.x = x;
    slot.y = y;
    slot.born = now;
    slot.life = life || 3000; slot._amOwner = owner || 0;
    if (typeof _ammitSound === 'function') _ammitSound('ammit-sandpit', x, y);
    _amSandPitCursor = (_amSandPitCursor + 1) % pits.length;
}

if (!window._ammitDeathBursts) {
    window._ammitDeathBursts = new Array(4);
    for (let i = 0; i < 4; i++) window._ammitDeathBursts[i] = { x: 0, y: 0, size: 180, spawnAt: -999999, duration: 1000, hearts: 3 };
}
let _amDeathCursor = 0;

function _spawnAmmitDeathBurst(x, y, size, now, hearts) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(now)) return;
    const bursts = window._ammitDeathBursts;
    if (!bursts || !bursts.length) return;
    let b = bursts[_amDeathCursor % bursts.length];
    if (!b) {
        b = { x: 0, y: 0, size: 180, spawnAt: -999999, duration: 1000, hearts: 3 };
        bursts[_amDeathCursor % bursts.length] = b;
    }
    b.x = x;
    b.y = y;
    b.size = size || 180;
    b.spawnAt = now;
    b.duration = 1000;
    b.hearts = hearts === undefined ? 3 : hearts;
    _amDeathCursor = (_amDeathCursor + 1) % bursts.length;
}

// Adds an eight pointed star to the target canvas context path
function _amStar8On(g, x, y, r, rot) {
    for (let i = 0; i < 16; i++) {
        const a = rot + i * Math.PI / 8, rr = i & 1 ? r * 0.42 : r;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath();
}

function _amStar8(x, y, r, rot) {
    _amStar8On(ctx, x, y, r, rot);
}

// Draws an Egyptian ankh symbol on the given context
function _amAnkhOn(g, x, y, s) {
    g.beginPath();
    g.ellipse(x, y - s * 0.42, s * 0.28, s * 0.38, 0, 0, Math.PI * 2);
    g.moveTo(x - s * 0.42, y - s * 0.02);
    g.lineTo(x + s * 0.42, y - s * 0.02);
    g.moveTo(x, y - s * 0.04);
    g.lineTo(x, y + s * 0.72);
    g.stroke();
}

const _amPalettes = ['#f2b72e', '#f2b72e', '#27d3c3'];
let _amArt = null;

const _amArtCache = [null, null, null];

function _bakeAmmitBodyArt(quality) {
    const tier = quality === undefined ? (_mobPerf ? 2 : Math.max(0, Math.min(2, _gfxLevel))) : quality;
    if (_amArtCache[tier]) return _amArtCache[tier];
    try { return (_amArtCache[tier] = _buildAmmitBodyArt(tier)); }
    catch (_) {
        try { return (_amArtCache[tier] = _buildAmmitBodyArt(2)); }
        catch (_) {
            const c = document.createElement('canvas'); c.width = c.height = 256;
            const g = c.getContext('2d');
            g.fillStyle = '#244740'; g.strokeStyle = '#f2b72e'; g.lineWidth = 5;
            g.beginPath(); g.ellipse(128, 128, 67, 110, 0, 0, Math.PI * 2); g.fill(); g.stroke();
            g.fillStyle = '#fff0b8'; g.fillRect(82, 70, 12, 5); g.fillRect(162, 70, 12, 5);
            return (_amArtCache[tier] = {
                body: [c, c, c], aura: [c, c, c], iris: [c, c], mane: [c, c],
                head: c, jaw: c, paw: c, heart: c, feather: c, jawUpper: c, jawLower: c,
                sandPit: c, scalePillar: c, scalePan: c, scarab: c, glow: c, nova: c,
                dust: c, scaleBeam: c, chain: c, linen: [c, c, c, c, c, c, c], quality: 2
            });
        }
    }
}

function _buildAmmitBodyArt(tier) {
    const quality = tier === undefined ? (_mobPerf ? 2 : _gfxLevel) : tier;
    const density = quality >= 2 ? 1 : quality === 1 ? 1.5 : 2;
    const high = quality === 0, detail = quality < 2;
    const mk = (w, h) => {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * density); c.height = Math.ceil(h * density);
        const g = c.getContext('2d'); g.scale(density, density);
        g.lineJoin = 'round'; g.lineCap = 'round';
        return c;
    };
    const metal = (g, x0, y0, x1, y1) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, '#5e391c'); gr.addColorStop(0.22, '#c8a15a');
        gr.addColorStop(0.42, '#fff0b8'); gr.addColorStop(0.54, '#f2b72e');
        gr.addColorStop(0.8, '#94642f'); gr.addColorStop(1, '#fff0b8');
        return gr;
    };
    const blob = (g, x, y, r, color) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(11,10,16,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    };
    const gem = (g, x, y, r, red) => {
        g.fillStyle = metal(g, x - r, y - r, x + r, y + r);
        g.beginPath(); g.ellipse(x, y, r * 1.2, r * 1.4, 0, 0, Math.PI * 2); g.fill();
        const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
        gr.addColorStop(0, '#fff0b8'); gr.addColorStop(0.28, red ? '#b3202a' : '#27d3c3');
        gr.addColorStop(1, red ? '#480f20' : '#113f5c');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y);
        g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,240,184,0.7)'; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(x - r * 0.5, y); g.lineTo(x, y - r * 0.7); g.stroke();
    };
    const art = { body: [], torso: [], aura: [], iris: [], mane: [], linen: [], quality };

    // Rounded hippo skin carries small folds beneath the ceremonial harness.
    for (let pal = 0; pal < 3; pal++) {
        const c = mk(256, 256), g = c.getContext('2d');
        const skin = g.createRadialGradient(100, 90, 8, 128, 128, 142);
        skin.addColorStop(0, pal === 1 ? '#7a4140' : '#738483');
        skin.addColorStop(0.42, pal === 2 ? '#335c60' : '#465968');
        skin.addColorStop(0.78, '#253443'); skin.addColorStop(1, '#0b0a10');
        g.fillStyle = skin; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = 'rgba(200,187,153,0.55)'; g.lineWidth = 1.4;
        for (let row = 0; row < 9; row++) {
            const y = 37 + row * 23;
            g.beginPath(); g.moveTo(24, y); g.bezierCurveTo(80, y + 18, 176, y + 18, 232, y); g.stroke();
            g.strokeStyle = 'rgba(11,10,16,0.6)'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(31, y + 4); g.quadraticCurveTo(128, y + 32, 225, y + 4); g.stroke();
            g.strokeStyle = 'rgba(200,187,153,0.55)'; g.lineWidth = 1.4;
        }
        if (detail) {
            g.fillStyle = 'rgba(255,240,184,0.12)';
            for (let i = 0; i < 220; i++) {
                const u = _amSeeds[(i % 64) * 4], v = _amSeeds[(i % 64) * 4 + 1];
                g.fillRect(17 + u * 222, 18 + ((v + i * 0.217) % 1) * 222, 1.1, 0.7);
            }
        }
        for (let side = -1; side <= 1; side += 2) {
            g.save(); g.translate(128 + side * 78, 137); g.rotate(side * -0.18);
            g.fillStyle = metal(g, -14, 0, 16, 0); g.fillRect(-13, -82, 26, 161);
            g.fillStyle = '#1f4fb5'; g.fillRect(-8, -76, 16, 149);
            for (let n = 0; n < 7; n++) gem(g, 0, -66 + n * 21, 4.2, n % 3 === 0);
            g.restore();
        }
        for (let side = -1; side <= 1; side += 2) {
            const x = 128 + side * 43, y = 203;
            const foot = g.createRadialGradient(x - 6, y - 10, 2, x, y, 28);
            foot.addColorStop(0, '#7b8982'); foot.addColorStop(0.55, '#3c535d'); foot.addColorStop(1, '#172531');
            g.fillStyle = foot; g.strokeStyle = '#0b0a10'; g.lineWidth = 2;
            g.beginPath(); g.ellipse(x, y, 27, 25, side * -0.15, 0, Math.PI * 2); g.fill(); g.stroke();
            for (let toe = -1; toe <= 1; toe++) {
                g.fillStyle = '#b7af91'; g.strokeStyle = '#37464a'; g.lineWidth = 1;
                g.beginPath(); g.ellipse(x + toe * 12, y + 17, 5.5, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
            }
            g.strokeStyle = '#9b9f8c'; g.lineWidth = 1;
            g.beginPath(); g.ellipse(x, y - 7, 19, 10, 0, Math.PI, Math.PI * 2); g.stroke();
        }
        art.body.push(c);
        const mask = mk(256, 256), maskCtx = mask.getContext('2d');
        maskCtx.beginPath(); maskCtx.ellipse(128, 128, 256 / 2.44 * 1.06, 256 / 2.44 * 0.98, 0, 0, Math.PI * 2);
        maskCtx.clip(); maskCtx.drawImage(c, 0, 0, 256, 256); art.torso.push(mask);
        const aura = mk(256, 256), ag = aura.getContext('2d');
        blob(ag, 128, 128, 124, pal === 2 ? 'rgba(39,211,195,0.35)' : 'rgba(242,183,46,0.48)');
        art.aura.push(aura);
    }

    // Layered flame locks have dark roots, amber filaments and pale tips.
    for (let state = 0; state < 2; state++) {
        const c = mk(320, 320), g = c.getContext('2d'); g.translate(160, 160);
        for (let tier = 0; tier < 3; tier++) {
            const count = detail ? 32 : 24;
            for (let i = 0; i < count; i++) {
                const angle = i * Math.PI * 2 / count + tier * 0.09;
                const len = 140 - tier * 24 + Math.sin(i * 7.13) * 11;
                g.save(); g.rotate(angle); g.scale(1, Math.sin(i * 3.17 + tier) > 0 ? 1 : -1);
                const gr = g.createLinearGradient(40, 0, len, 0);
                gr.addColorStop(0, '#0b0a10'); gr.addColorStop(0.3, '#502b22');
                gr.addColorStop(0.62, state ? '#78654b' : '#ad682c');
                gr.addColorStop(0.86, state ? '#a49472' : '#f2b72e');
                gr.addColorStop(1, state ? '#c8a15a' : '#fff0b8');
                g.fillStyle = gr; g.strokeStyle = '#80502a'; g.lineWidth = 0.85;
                g.beginPath(); g.moveTo(38, -10);
                g.bezierCurveTo(68, -22, len - 20, -18, len, -7);
                g.bezierCurveTo(len - 28, -7, len - 9, 8, len - 3, 14);
                g.bezierCurveTo(93, 11, 67, 27, 38, 9); g.closePath(); g.fill(); g.stroke();
                g.strokeStyle = state ? '#c8a15a' : '#fff0b8'; g.lineWidth = 0.8; g.globalAlpha = 0.7;
                for (let f = 0; f < (high ? 4 : 2); f++) {
                    g.beginPath(); g.moveTo(50, -5 + f * 4);
                    g.bezierCurveTo(85, -17 + f * 5, len - 25, f * 3, len - 8, 9); g.stroke();
                }
                g.restore();
            }
        }
        g.strokeStyle = '#0b0a10'; g.lineWidth = 18;
        g.beginPath(); g.ellipse(0, 0, 62, 66, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = metal(g, -70, -60, 70, 60); g.lineWidth = 13; g.stroke();
        g.strokeStyle = '#1f4fb5'; g.lineWidth = 6; g.stroke();
        for (let i = 0; i < 18; i++) {
            const a = i * Math.PI / 9;
            gem(g, Math.cos(a) * 62, Math.sin(a) * 66, 3.5, i % 3 === 0);
        }
        art.mane.push(c);
    }

    // The elongated skull narrows from raised orbital ridges to a rounded nasal tip.
    const head = mk(320, 320), g = head.getContext('2d'); g.translate(160, 120);
    const skull = new Path2D(); skull.moveTo(0, -79);
    skull.bezierCurveTo(32, -84, 60, -67, 62, -38);
    skull.bezierCurveTo(69, -13, 42, 2, 36, 29);
    skull.lineTo(30, 77); skull.bezierCurveTo(48, 105, 19, 113, 0, 110);
    skull.bezierCurveTo(-19, 113, -48, 105, -30, 77);
    skull.lineTo(-36, 29); skull.bezierCurveTo(-42, 2, -69, -13, -62, -38);
    skull.bezierCurveTo(-60, -67, -32, -84, 0, -79); skull.closePath();
    g.save(); g.translate(0, 6); g.fillStyle = 'rgba(11,10,16,0.8)'; g.fill(skull); g.restore();
    const skin = g.createLinearGradient(-67, -20, 64, 28);
    skin.addColorStop(0, '#0b0a10'); skin.addColorStop(0.18, '#315353');
    skin.addColorStop(0.38, '#577969'); skin.addColorStop(0.53, '#304c46');
    skin.addColorStop(0.79, '#172936'); skin.addColorStop(1, '#0b0a10');
    g.fillStyle = skin; g.fill(skull); g.strokeStyle = '#c8a15a'; g.lineWidth = 2.8; g.stroke(skull);
    g.save(); g.clip(skull);
    for (let row = 0; row < (detail ? 21 : 16); row++) {
        const u = row / (detail ? 20 : 15), y = -74 + u * 174;
        const step = 15 - u * 8, width = y < 0 ? 55 : 31;
        for (let col = -5; col <= 5; col++) {
            const x = col * step + (row % 2) * step * 0.5;
            if (Math.abs(x) > width) continue;
            const h = step * 0.78;
            const tile = g.createLinearGradient(x - step * 0.5, y - h * 0.6, x + step * 0.4, y + h * 0.65);
            tile.addColorStop(0, x < 0 ? '#72988d' : '#466d67');
            tile.addColorStop(0.28, (row + col) % 3 ? '#345c59' : '#4c7870');
            tile.addColorStop(1, '#142b34');
            g.fillStyle = tile;
            g.strokeStyle = '#0d1d24'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(x, y - h * 0.6); g.lineTo(x + step * 0.46, y - h * 0.2);
            g.quadraticCurveTo(x + step * 0.5, y + h * 0.55, x, y + h * 0.65);
            g.quadraticCurveTo(x - step * 0.5, y + h * 0.55, x - step * 0.46, y - h * 0.2);
            g.closePath(); g.fill(); g.stroke();
            g.strokeStyle = 'rgba(255,240,184,0.35)'; g.lineWidth = 0.7;
            g.beginPath(); g.moveTo(x - step * 0.36, y - h * 0.15); g.lineTo(x, y - h * 0.47);
            g.lineTo(x + step * 0.3, y - h * 0.15); g.stroke();
        }
    }
    const ridge = g.createLinearGradient(-11, 0, 13, 0);
    ridge.addColorStop(0, 'rgba(11,10,16,0)'); ridge.addColorStop(0.5, 'rgba(200,161,90,0.42)');
    ridge.addColorStop(1, 'rgba(11,10,16,0)');
    g.fillStyle = ridge; g.fillRect(-13, -60, 26, 154);
    g.restore();
    for (let side = -1; side <= 1; side += 2) {
        // Recessed ear membranes sit behind the raised eye sockets.
        g.fillStyle = '#0b0a10'; g.strokeStyle = '#6d8270'; g.lineWidth = 1.3;
        g.beginPath(); g.ellipse(side * 56, -16, 6, 12, side * 0.32, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = '#233c43'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(side * 58, -23); g.quadraticCurveTo(side * 48, -15, side * 58, -6); g.stroke();
        g.fillStyle = skin; g.strokeStyle = '#839179'; g.lineWidth = 1.4;
        g.beginPath(); g.ellipse(side * 40, -43, 22, 17, side * 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = '#0b0a10'; g.lineWidth = 3;
        for (let f = 0; f < 3; f++) {
            g.beginPath(); g.ellipse(side * 40, -42 + f * 2, 16 + f * 2, 8 + f * 2, side * 0.4, 0.1, Math.PI - 0.1); g.stroke();
        }
        g.strokeStyle = '#78907a'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(side * 22, -44); g.quadraticCurveTo(side * 41, -75, side * 58, -43); g.stroke();
        // Unequal interlocking teeth line the full length of the muzzle.
        for (let t = 0; t < 13; t++) {
            const y = -2 + t * 7.7, x = side * (38 - Math.min(t, 8) * 0.9);
            const length = t % 4 === 1 ? 14 : 7 + t % 3 * 1.8;
            g.fillStyle = metal(g, x, y, x + side * length, y + 6);
            g.strokeStyle = '#463523'; g.lineWidth = 0.9;
            g.beginPath(); g.moveTo(x, y - 3); g.quadraticCurveTo(x + side * length, y - 1, x + side * (length - 2), y + 8);
            g.quadraticCurveTo(x + side * 3, y + 4, x, y + 3); g.closePath(); g.fill(); g.stroke();
        }
        g.strokeStyle = '#0b0a10'; g.lineWidth = 2.3;
        g.beginPath(); g.moveTo(side * 34, 9); g.quadraticCurveTo(side * 24, 47, side * 28, 87); g.stroke();
        g.fillStyle = '#0b0a10'; g.strokeStyle = '#83917a'; g.lineWidth = 1.3;
        g.beginPath(); g.ellipse(side * 17, 92, 6.5, 4.3, side * -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
        gem(g, side * 60, -48, 5.5, true);
    }
    g.strokeStyle = '#c8a15a'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(-25, 104); g.quadraticCurveTo(0, 112, 25, 104); g.stroke();
    art.head = head;

    const jaw = mk(224, 224), jg = jaw.getContext('2d'); jg.translate(112, 72);
    const jawSkin = jg.createLinearGradient(-46, 0, 44, 0);
    jawSkin.addColorStop(0, '#0b0a10'); jawSkin.addColorStop(0.4, '#bda66e');
    jawSkin.addColorStop(0.65, '#746649'); jawSkin.addColorStop(1, '#14262d');
    jg.fillStyle = jawSkin; jg.strokeStyle = '#f2b72e'; jg.lineWidth = 2;
    jg.beginPath(); jg.moveTo(-48, -33); jg.quadraticCurveTo(0, -52, 48, -33);
    jg.lineTo(35, 93); jg.quadraticCurveTo(0, 119, -35, 93); jg.closePath(); jg.fill(); jg.stroke();
    jg.fillStyle = '#200f18'; jg.beginPath(); jg.moveTo(-38, -24); jg.lineTo(38, -24);
    jg.lineTo(27, 91); jg.quadraticCurveTo(0, 107, -27, 91); jg.closePath(); jg.fill();
    jg.strokeStyle = '#b3202a'; jg.lineWidth = 2;
    for (let n = 0; n < 8; n++) {
        jg.beginPath(); jg.moveTo(-29, n * 12); jg.quadraticCurveTo(0, n * 12 + 7, 29, n * 12); jg.stroke();
    }
    for (let side = -1; side <= 1; side += 2) for (let t = 0; t < 13; t++) {
        const y = 3 + t * 7.4, x = side * (42 - Math.min(t, 8));
        jg.fillStyle = metal(jg, x - 6, y, x + 6, y + 7); jg.strokeStyle = '#463523'; jg.lineWidth = 0.7;
        jg.beginPath(); jg.moveTo(x, y - 3); jg.lineTo(x - side * 11, y - 8); jg.lineTo(x, y + 4); jg.closePath(); jg.fill(); jg.stroke();
    }
    art.jaw = jaw;

    // Muscular lion wrists end in rounded toes and long curved ivory claws.
    const paw = mk(112, 144), pg = paw.getContext('2d'); pg.translate(56, 55);
    const fur = pg.createLinearGradient(-33, -35, 34, 55);
    fur.addColorStop(0, '#533322'); fur.addColorStop(0.35, '#c8a15a'); fur.addColorStop(0.62, '#e2bf79'); fur.addColorStop(1, '#684324');
    pg.fillStyle = fur; pg.strokeStyle = '#261e1c'; pg.lineWidth = 2.5;
    pg.beginPath(); pg.moveTo(-24, -48); pg.quadraticCurveTo(-39, 0, -31, 35);
    pg.quadraticCurveTo(0, 63, 33, 34); pg.quadraticCurveTo(37, 0, 24, -48); pg.closePath(); pg.fill(); pg.stroke();
    if (detail) {
        pg.strokeStyle = '#8d6035'; pg.lineWidth = 0.8;
        for (let f = 0; f < 30; f++) {
            const x = (f % 6 - 2.5) * 8, y = -35 + Math.floor(f / 6) * 17;
            pg.beginPath(); pg.moveTo(x, y); pg.quadraticCurveTo(x - 3, y + 9, x + 1, y + 15); pg.stroke();
        }
    }
    pg.fillStyle = metal(pg, -31, -24, 32, -8); pg.fillRect(-30, -26, 60, 23);
    pg.fillStyle = '#1f4fb5'; pg.fillRect(-26, -21, 52, 12);
    for (let n = -1; n <= 1; n++) gem(pg, n * 18, -15, 4, n === 0);
    for (let toe = 0; toe < 4; toe++) {
        const x = -22 + toe * 14;
        pg.fillStyle = fur; pg.strokeStyle = '#684324'; pg.lineWidth = 1.3;
        pg.beginPath(); pg.ellipse(x, 33, 9, 15, 0, 0, Math.PI * 2); pg.fill(); pg.stroke();
        const ivory = pg.createLinearGradient(x - 5, 40, x + 6, 65);
        ivory.addColorStop(0, '#a48c5e'); ivory.addColorStop(0.4, '#fff0b8'); ivory.addColorStop(1, '#d7c69b');
        pg.fillStyle = ivory;
        pg.beginPath(); pg.moveTo(x - 4, 40); pg.quadraticCurveTo(x - 8, 59, x + 5, 70);
        pg.quadraticCurveTo(x + 1, 53, x + 5, 40); pg.closePath(); pg.fill(); pg.stroke();
    }
    art.paw = paw;

    for (let k = 0; k < 2; k++) {
        const c = mk(64, 64), ig = c.getContext('2d');
        const gr = ig.createRadialGradient(26, 25, 2, 32, 32, 29);
        gr.addColorStop(0, '#fff0b8'); gr.addColorStop(0.4, '#f2b72e');
        gr.addColorStop(0.8, k ? '#b3202a' : '#a47931'); gr.addColorStop(1, '#0b0a10');
        ig.fillStyle = gr; ig.beginPath(); ig.arc(32, 32, 29, 0, Math.PI * 2); ig.fill();
        ig.strokeStyle = '#65451e'; ig.lineWidth = 0.8;
        for (let i = 0; i < 40; i++) {
            const a = i * Math.PI / 20;
            ig.beginPath(); ig.moveTo(32 + Math.cos(a) * 11, 32 + Math.sin(a) * 11);
            ig.lineTo(32 + Math.cos(a) * (25 + i % 3), 32 + Math.sin(a) * (25 + i % 3)); ig.stroke();
        }
        art.iris.push(c);
    }

    // The ib amulet has a broad shoulder, lateral vessels and a tapered base.
    const heart = mk(80, 80), hg = heart.getContext('2d'); hg.translate(40, 40);
    hg.fillStyle = metal(hg, -20, -16, 20, 20); hg.strokeStyle = '#643e21'; hg.lineWidth = 1.6;
    hg.beginPath(); hg.moveTo(-8, -19); hg.lineTo(8, -19); hg.lineTo(9, -12);
    hg.bezierCurveTo(25, -19, 24, -1, 18, 6); hg.bezierCurveTo(16, 17, 5, 22, 0, 26);
    hg.bezierCurveTo(-5, 22, -16, 17, -18, 6); hg.bezierCurveTo(-24, -1, -25, -19, -9, -12);
    hg.closePath(); hg.fill(); hg.stroke();
    hg.fillStyle = '#b3202a'; hg.fillRect(-8, -19, 16, 4);
    hg.strokeStyle = '#fff0b8'; hg.lineWidth = 1.4;
    hg.beginPath(); hg.moveTo(-12, -7); hg.bezierCurveTo(-19, 3, -6, 16, -2, 18); hg.stroke();
    gem(hg, 1, 2, 5.5, false);
    hg.strokeStyle = '#8b572b'; hg.lineWidth = 0.8; _amAnkhOn(hg, 1, 13, 4);
    art.heart = heart;

    const feather = mk(112, 112), fg = feather.getContext('2d'); fg.translate(56, 56);
    const plumage = fg.createLinearGradient(-20, -36, 20, 34);
    plumage.addColorStop(0, '#fff0b8'); plumage.addColorStop(0.4, '#f2b72e');
    plumage.addColorStop(0.68, '#fff0b8'); plumage.addColorStop(1, '#27d3c3');
    fg.fillStyle = plumage;
    fg.beginPath(); fg.moveTo(0, 42); fg.bezierCurveTo(-26, 2, -16, -38, 4, -44);
    fg.bezierCurveTo(20, -25, 22, 5, 0, 42); fg.closePath(); fg.fill();
    for (let i = 0; i < (detail ? 44 : 24); i++) {
        const y = -38 + i * (detail ? 1.65 : 3.05), w = Math.sqrt(Math.max(0, 1 - Math.pow((y + 2) / 42, 2))) * 15;
        fg.strokeStyle = i % 3 === 0 ? '#85633b' : '#fff0b8'; fg.lineWidth = 0.6;
        fg.beginPath(); fg.moveTo(1, y + 9); fg.quadraticCurveTo(-w * 0.7, y + 3, -w, y - 5);
        fg.moveTo(1, y + 9); fg.quadraticCurveTo(w * 0.8, y + 2, w, y - 5); fg.stroke();
    }
    fg.strokeStyle = '#fff0b8'; fg.lineWidth = 2;
    fg.beginPath(); fg.moveTo(-1, 47); fg.quadraticCurveTo(-4, 0, 4, -43); fg.stroke();
    art.feather = feather;

    // Giant spectral jaws carry irregular scutes and staggered conical teeth.
    for (let half = 0; half < 2; half++) {
        const c = mk(288, 192), jx = c.getContext('2d'); jx.translate(144, 96);
        if (half) jx.scale(1, -1);
        const shell = new Path2D(); shell.moveTo(-124, -26);
        shell.bezierCurveTo(-105, -67, -69, -79, -39, -66);
        shell.quadraticCurveTo(0, -90, 39, -66); shell.bezierCurveTo(69, -79, 105, -67, 124, -26);
        shell.lineTo(106, 4); shell.quadraticCurveTo(0, -14, -106, 4); shell.closePath();
        jx.fillStyle = metal(jx, 0, -78, 0, 14); jx.fill(shell);
        jx.strokeStyle = '#5d3a21'; jx.lineWidth = 3; jx.stroke(shell);
        jx.save(); jx.clip(shell);
        for (let row = 0; row < 5; row++) for (let col = 0; col < 13; col++) {
            const x = -124 + col * 20 + row % 2 * 10, y = -75 + row * 16;
            jx.fillStyle = (row + col) % 3 ? 'rgba(11,10,16,0.26)' : 'rgba(255,240,184,0.3)';
            jx.strokeStyle = '#89602f'; jx.lineWidth = 1;
            jx.beginPath(); jx.moveTo(x - 8, y); jx.lineTo(x, y - 5); jx.lineTo(x + 9, y);
            jx.lineTo(x + 6, y + 9); jx.lineTo(x - 6, y + 10); jx.closePath(); jx.fill(); jx.stroke();
        }
        jx.restore();
        jx.strokeStyle = '#fff0b8'; jx.lineWidth = 2;
        jx.beginPath(); jx.moveTo(-104, 3); jx.quadraticCurveTo(0, -15, 104, 3); jx.stroke();
        for (let i = 0; i < 15; i++) {
            const x = -100 + i * 14 + (half ? 6 : 0), y = -5 + Math.pow(x / 100, 2) * 7;
            const len = 22 + (i % 4 === 1 ? 17 : i % 3 * 4);
            jx.fillStyle = metal(jx, x - 5, y, x + 5, y + len); jx.strokeStyle = '#735027'; jx.lineWidth = 1.2;
            jx.beginPath(); jx.moveTo(x - 6, y); jx.quadraticCurveTo(x - 4, y + len * 0.65, x + 2, y + len);
            jx.quadraticCurveTo(x + 8, y + len * 0.3, x + 6, y); jx.closePath(); jx.fill(); jx.stroke();
        }
        for (let side = -1; side <= 1; side += 2) {
            jx.fillStyle = '#0b0a10'; jx.beginPath(); jx.ellipse(side * 67, -51, 16, 9, side * 0.2, 0, Math.PI * 2); jx.fill();
            gem(jx, side * 68, -53, 6, false);
        }
        if (detail) {
            jx.fillStyle = '#fff0b8'; jx.globalAlpha = 0.45;
            for (let n = 0; n < 70; n++) {
                const seed = n % 64 * 4;
                jx.fillRect((_amSeeds[seed] - 0.5) * 250, -78 + _amSeeds[seed + 1] * 65, 1.3, 0.8);
            }
        }
        if (half) art.jawLower = c; else art.jawUpper = c;
    }

    const pit = mk(288, 288), pt = pit.getContext('2d'); pt.translate(144, 144);
    blob(pt, 0, 0, 139, 'rgba(200,161,90,0.5)');
    const hole = pt.createRadialGradient(0, 0, 10, 0, 0, 120);
    hole.addColorStop(0, 'rgba(11,10,16,0.94)'); hole.addColorStop(0.5, 'rgba(11,10,16,0.7)');
    hole.addColorStop(0.82, 'rgba(200,161,90,0.28)'); hole.addColorStop(1, 'rgba(200,161,90,0)');
    pt.fillStyle = hole; pt.beginPath(); pt.arc(0, 0, 123, 0, Math.PI * 2); pt.fill();
    for (let ring = 0; ring < (detail ? 18 : 10); ring++) {
        pt.strokeStyle = ring % 3 === 0 ? '#f2b72e' : '#c8a15a'; pt.globalAlpha = 0.17 + ring % 3 * 0.1; pt.lineWidth = 1.2;
        pt.beginPath();
        for (let i = 0; i <= 64; i++) {
            const a = i * Math.PI / 32, r = 24 + ring * 5.5 + Math.sin(a * 5 + ring * 0.6) * 4;
            if (i) pt.lineTo(Math.cos(a) * r, Math.sin(a) * r); else pt.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        pt.stroke();
    }
    art.sandPit = pit;
    const dust = mk(256, 128), dg = dust.getContext('2d'); dg.scale(1, 0.5);
    blob(dg, 128, 128, 122, 'rgba(200,161,90,0.45)');
    if (detail) {
        dg.fillStyle = '#f2b72e'; dg.globalAlpha = 0.4;
        for (let n = 0; n < 64; n++) dg.fillRect(22 + _amSeeds[n * 4] * 212, 22 + _amSeeds[n * 4 + 1] * 212, 1.5, 1);
    }
    art.dust = dust;

    const pillar = mk(128, 224), pl = pillar.getContext('2d'); pl.translate(64, 112);
    pl.fillStyle = metal(pl, -18, 0, 18, 0); pl.strokeStyle = '#57391f'; pl.lineWidth = 2;
    pl.beginPath(); pl.moveTo(-9, -67); pl.lineTo(9, -67); pl.lineTo(15, 74);
    pl.lineTo(34, 90); pl.lineTo(-34, 90); pl.lineTo(-15, 74); pl.closePath(); pl.fill(); pl.stroke();
    pl.fillStyle = '#1f4fb5'; pl.fillRect(-5, -51, 10, 117);
    for (let y = -42; y < 66; y += 21) gem(pl, 0, y, 4.5, false);
    pl.strokeStyle = metal(pl, -25, -90, 25, -50); pl.lineWidth = 6; _amAnkhOn(pl, 0, -77, 22);
    gem(pl, 0, -54, 10, true); art.scalePillar = pillar;
    const beam = mk(640, 80), bg = beam.getContext('2d'); bg.translate(320, 40);
    bg.fillStyle = metal(bg, 0, -14, 0, 14); bg.strokeStyle = '#563721'; bg.lineWidth = 2;
    bg.beginPath(); bg.moveTo(-306, -4); bg.quadraticCurveTo(-190, 12, -40, -9);
    bg.quadraticCurveTo(0, -25, 40, -9); bg.quadraticCurveTo(190, 12, 306, -4);
    bg.lineTo(298, 13); bg.quadraticCurveTo(155, 24, 25, 8); bg.lineTo(-25, 8);
    bg.quadraticCurveTo(-155, 24, -298, 13); bg.closePath(); bg.fill(); bg.stroke();
    bg.strokeStyle = '#b3202a'; bg.lineWidth = 2;
    bg.beginPath(); bg.moveTo(-292, 5); bg.quadraticCurveTo(-160, 15, -25, 0);
    bg.moveTo(25, 0); bg.quadraticCurveTo(160, 15, 292, 5); bg.stroke();
    for (let i = -6; i <= 6; i++) gem(bg, i * 44, i === 0 ? -4 : 6, i === 0 ? 10 : 4.5, i % 3 === 0);
    art.scaleBeam = beam;

    const pan = mk(224, 144), pn = pan.getContext('2d'); pn.translate(112, 72);
    pn.fillStyle = metal(pn, -90, -10, 90, 35); pn.strokeStyle = '#6a4526'; pn.lineWidth = 2;
    pn.beginPath(); pn.moveTo(-93, -8); pn.quadraticCurveTo(0, 57, 93, -8);
    pn.quadraticCurveTo(0, 13, -93, -8); pn.closePath(); pn.fill(); pn.stroke();
    pn.strokeStyle = '#fff0b8'; pn.lineWidth = 3;
    pn.beginPath(); pn.ellipse(0, -7, 93, 12, 0, 0, Math.PI); pn.stroke();
    for (let i = -4; i <= 4; i++) {
        const x = i * 17, y = 20 - i * i * 0.85;
        gem(pn, x, y, 3.5, i % 2 === 0);
        if (detail) { pn.strokeStyle = '#73502b'; pn.lineWidth = 0.8; _amAnkhOn(pn, x, y - 10, 4); }
    }
    art.scalePan = pan;
    const chain = mk(24, 240), cg = chain.getContext('2d');
    for (let i = 0; i < 20; i++) {
        cg.strokeStyle = i % 2 ? '#fff0b8' : '#c8a15a'; cg.lineWidth = 2.4;
        cg.beginPath(); cg.ellipse(12, 6 + i * 12, i % 2 ? 2.2 : 4.5, 7, 0, 0, Math.PI * 2); cg.stroke();
        cg.strokeStyle = '#73502b'; cg.lineWidth = 0.8; cg.stroke();
    }
    art.chain = chain;

    // Seven cloth poses let the linen flutter without rebuilding its ornament.
    for (let pose = 0; pose < 7; pose++) {
        const c = mk(256, 96), lg = c.getContext('2d'); lg.translate(128, 48);
        const bend = (pose - 3) * 3;
        lg.strokeStyle = '#473c2e'; lg.lineWidth = 17;
        lg.beginPath(); lg.moveTo(-113, 4); lg.bezierCurveTo(-58, -22 + bend, 58, 25 - bend, 113, -3); lg.stroke();
        lg.strokeStyle = metal(lg, 0, -12, 0, 12); lg.lineWidth = 13; lg.stroke();
        lg.strokeStyle = '#fff0b8'; lg.lineWidth = 0.8;
        for (let n = 0; n < 3; n++) {
            lg.beginPath(); lg.moveTo(-112, n * 3); lg.bezierCurveTo(-58, -25 + bend + n * 3, 58, 22 - bend + n * 3, 112, -6 + n * 3); lg.stroke();
        }
        lg.strokeStyle = '#725e3b'; lg.lineWidth = 0.9;
        for (let n = -5; n <= 5; n++) {
            const x = n * 18, y = Math.sin(n * 0.45) * 6;
            if (n % 2) _amAnkhOn(lg, x, y - 2, 3.5);
            else { lg.beginPath(); lg.moveTo(x - 3, y); lg.lineTo(x, y - 3); lg.lineTo(x + 3, y); lg.lineTo(x, y + 3); lg.stroke(); }
        }
        art.linen.push(c);
    }
    const scarab = mk(72, 72), sg = scarab.getContext('2d'); sg.translate(36, 36);
    sg.fillStyle = metal(sg, -26, -10, 26, 10); sg.strokeStyle = '#c8a15a'; sg.lineWidth = 1;
    for (let side = -1; side <= 1; side += 2) {
        sg.beginPath(); sg.moveTo(0, -8); sg.bezierCurveTo(side * 35, -24, side * 33, 18, 0, 9); sg.fill();
        for (let n = 0; n < 5; n++) {
            sg.beginPath(); sg.moveTo(side * 5, 0); sg.lineTo(side * (27 - n * 2), -14 + n * 6); sg.stroke();
        }
    }
    sg.fillStyle = '#1f4fb5'; sg.beginPath(); sg.ellipse(0, 2, 9, 14, 0, 0, Math.PI * 2); sg.fill(); sg.stroke();
    sg.strokeStyle = '#27d3c3'; sg.beginPath(); sg.moveTo(0, -10); sg.lineTo(0, 15); sg.stroke();
    gem(sg, 0, -13, 4, false); art.scarab = scarab;
    const glow = mk(96, 96), gl = glow.getContext('2d');
    blob(gl, 48, 48, 47, 'rgba(242,183,46,0.5)'); blob(gl, 48, 48, 20, 'rgba(255,240,184,0.75)'); art.glow = glow;
    const nova = mk(128, 128), nv = nova.getContext('2d');
    blob(nv, 64, 64, 62, 'rgba(242,183,46,0.5)');
    nv.fillStyle = '#fff0b8'; nv.beginPath(); _amStar8On(nv, 64, 64, 43, 0); nv.fill(); art.nova = nova;
    // Mobile torso poses combine the dense layers into a single transparent blit.
    if (quality >= 2) {
        art.figure = []; art.figureFlash = [];
        for (let pal = 0; pal < 3; pal++) for (let wraps = 0; wraps < 4; wraps++) {
            const c = mk(384, 400), fg = c.getContext('2d'); fg.translate(192, 180);
            fg.save(); fg.translate(0, 72); fg.scale(1.08, 1.06);
            fg.drawImage(art.torso[pal], -109.8, -109.8, 219.6, 219.6);
            fg.beginPath(); fg.ellipse(0, 0, 95.4, 88.2, 0, 0, Math.PI * 2);
            fg.strokeStyle = '#0b0a10'; fg.lineWidth = 5; fg.stroke();
            fg.strokeStyle = _amPalettes[pal]; fg.lineWidth = 1.6; fg.stroke(); fg.restore();
            for (let w = 0; w < wraps; w++) {
                const width = 216 - w * 12, y = 104 + w * 21;
                fg.drawImage(art.linen[3], -width * 0.5, y - 34, width, 68);
            }
            const mane = (pal === 2 ? 0.92 : 1.04) * 144;
            fg.globalAlpha = pal === 2 ? 0.62 : 0.96;
            fg.drawImage(art.mane[pal === 2 ? 1 : 0], -mane, -mane - 28, mane * 2, mane * 2);
            fg.globalAlpha = 1;
            for (let side = -1; side <= 1; side += 2) {
                fg.save(); fg.translate(side * 92, 45); fg.scale(side * 1.06, 1.06); fg.rotate(0.12);
                fg.drawImage(art.paw, -45, -44, 90, 116); fg.restore();
            }
            art.figure.push(c);
            if (pal === 0) {
                const flash = mk(384, 400), ff = flash.getContext('2d');
                ff.drawImage(c, 0, 0, 384, 400); ff.globalCompositeOperation = 'source-in';
                ff.fillStyle = '#fff0b8'; ff.fillRect(0, 0, 384, 400); art.figureFlash.push(flash);
            }
        }
    }
    return art;
}

function _warmAmmitArt() {
    if (typeof ctx === 'undefined' || !ctx) return;
    if (!_amArt) _amArt = _bakeAmmitBodyArt();
    if (typeof _ammitBakePyramid === 'function' && !_amPyramidFallback) _ammitBakePyramid();
    if (!_mobPerf) {
        _bakeAmmitBodyArt(1);
        _bakeAmmitBodyArt(2);
    }
}
if (typeof requestIdleCallback === 'function') requestIdleCallback(_warmAmmitArt, { timeout: 2000 });
else setTimeout(_warmAmmitArt, 0);

function _selectAmmitArt() {
    const tier = _mobPerf ? 2 : Math.max(0, Math.min(2, _gfxLevel));
    if (_amArtCache[tier]) _amArt = _amArtCache[tier];
    else _amArt = _bakeAmmitBodyArt(tier);
}

function _ammitBodyPath(radius, now, segments) {
    ctx.beginPath();
    if (segments <= 24) {
        ctx.ellipse(0, 0, radius * 1.06, radius * 0.98, 0, 0, Math.PI * 2); ctx.closePath();
        return;
    }
    for (let i = 0; i <= segments; i++) {
        const a = i / segments * Math.PI * 2;
        const hippoShape = 1 + 0.08 * Math.sin(a - Math.PI / 2) + 0.06 * Math.cos(a * 2);
        const wave = Math.sin(a * 4 + now * 0.0028) * 0.03 + Math.cos(a * 6 - now * 0.0022) * 0.02;
        const r = radius * (hippoShape + wave);
        if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
}

// The torso silhouette, texture and outline are baked once per palette and size, so a frame draws the body with one image instead of a clip and three strokes.
const _amBodyBake = [];
function _ammitBodyBake(pal, radius, tint) {
    const r = Math.round(radius);
    let b = _amBodyBake[pal];
    if (b && b.r === r && b.art === _amArt && b.tint === tint) return b;
    const sc = r / 90, half = Math.ceil(r * 1.22 * 1.08) + 8, size = half * 2;
    const make = function (white) {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const g = c.getContext('2d');
        g.translate(half, half); g.scale(1.08, 1.06);
        g.beginPath();
        for (let i = 0; i <= 48; i++) {
            const a = i / 48 * Math.PI * 2, rr = r * (1 + 0.08 * Math.sin(a - Math.PI / 2) + 0.06 * Math.cos(a * 2));
            if (!i) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        if (white) { g.fillStyle = '#fff0b8'; g.fill(); return c; }
        g.save(); g.clip(); g.drawImage(_amArt.body[pal] || _amArt.body[0], -r * 1.22, -r * 1.22, r * 2.44, r * 2.44); g.restore();
        g.strokeStyle = '#0b0a10'; g.lineWidth = 5 * sc; g.stroke();
        g.strokeStyle = tint; g.lineWidth = 1.6 * sc; g.stroke();
        return c;
    };
    b = _amBodyBake[pal] = { r: r, art: _amArt, tint: tint, half: half, img: make(false), white: make(true) };
    return b;
}

function _drawAmmitBodySurface(palette, radius, now, segments) {
    if (!_amArt) _amArt = _bakeAmmitBodyArt();
    _ammitBodyPath(radius, now, segments);
    if (segments <= 24 && _amArt.torso) {
        ctx.drawImage(_amArt.torso[palette] || _amArt.torso[0], -radius * 1.22, -radius * 1.22, radius * 2.44, radius * 2.44);
        return;
    }
    ctx.save();
    ctx.clip();
    ctx.drawImage(_amArt.body[palette] || _amArt.body[0], -radius * 1.22, -radius * 1.22, radius * 2.44, radius * 2.44);
    ctx.restore();
}

function _drawAmmitChain(x0, y0, x1, y1, alpha) {
    const dx = x1 - x0, dy = y1 - y0, length = Math.hypot(dx, dy);
    if (length < 1) return;
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
    ctx.globalAlpha = alpha; ctx.drawImage(_amArt.chain, -6, 0, 12, length); ctx.restore();
}

function _drawAmmitDust(x, y, radius, progress, alpha, low) {
    const p = Math.max(0, Math.min(1, progress));
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha * (1 - p);
    const size = radius * (0.65 + p * 1.45);
    ctx.drawImage(_amArt.dust, -size, -size * 0.38, size * 2, size * 0.76);
    if (!low) {
        ctx.globalAlpha *= 0.65;
        ctx.drawImage(_amArt.dust, -size * 0.9, -size * 0.7 - p * 25, size * 1.8, size * 0.8);
    }
    ctx.restore();
}

function _drawAmmitDeath(x, y, size, now, progress, hearts) {
    if (!_amArt) _amArt = _bakeAmmitBodyArt();
    const p = Math.max(0, Math.min(1, progress)), fade = 1 - p, sc = (size || 180) / 180 * 1.06 * Math.min(1, canvas.height / 600), BASE = 90 * sc;
    const fo = window._fxOpts, glow = (!fo || fo.glow !== false) && (!fo || fo.sigilLight !== false), parts = !fo || fo.particles !== false;
    const low = _mobPerf || _gfxLevel >= 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 0;

    if (parts) _drawAmmitDust(0, BASE * 0.6, BASE * 1.5, p, 1, low);

    if (glow) { ctx.globalAlpha = fade * .65; ctx.drawImage(_amArt.glow, -10 * sc, -BASE * (1 + p * 2), 20 * sc, BASE * (1 + p * 2)); }

    // Collapsing sand ring and sinking silhouette
    ctx.globalAlpha = fade * 0.78;
    ctx.drawImage(_amArt.sandPit, -BASE * (1.1 + p * 0.8), -BASE * (1.1 + p * 0.8), BASE * 2 * (1.1 + p * 0.8), BASE * 2 * (1.1 + p * 0.8));
    if (p < 0.75) {
        const sink = Math.pow(p / 0.75, 1.4), bands = low ? 4 : 8;
        ctx.save(); ctx.translate(0, sink * BASE * 0.5); ctx.scale(1 + sink * 0.12, 1 - sink * 0.8);
        ctx.globalAlpha = fade * 0.9;
        const mane = BASE * 1.7;
        ctx.drawImage(_amArt.mane[1], -mane, -mane - 28 * sc, mane * 2, mane * 2);
        ctx.restore();
        for (let band = 0; band < bands; band++) {
            const sy = band * 320 / bands, sh = 320 / bands;
            const drift = Math.sin(band * 2.4) * sink * 28 * sc;
            ctx.globalAlpha = Math.max(0, 1 - p * (1.1 + band * 0.11));
            ctx.drawImage(_amArt.head, 0, sy * _amArt.head.height / 320, _amArt.head.width, sh * _amArt.head.height / 320,
                -160 * sc + drift, (-120 + sy) * sc + sink * 50 * sc, 320 * sc, sh * sc * (1 - sink * 0.5));
        }
    }

    // Golden hearts rising and dissolving into bright dust
    const hCount = Math.max(3, hearts || 5);
    for (let i = 0; i < hCount; i++) {
        const a = i / hCount * Math.PI * 2 + p * 1.6;
        const rad = BASE * (0.4 + p * 0.9) * (1 - p * 0.3);
        const hx = Math.cos(a) * rad, hy = Math.sin(a) * rad * 0.6 - p * 115 * sc;
        const hs = (32 * (1 - p * 0.6)) * sc;
        ctx.globalAlpha = fade * 0.95;
        ctx.drawImage(_amArt.heart, hx - hs, hy - hs, hs * 2, hs * 2);
        if (glow && (!fo || fo.explosions !== false) && (!fo || fo.screenFlash !== false)) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fade * 0.65;
            ctx.drawImage(_amArt.nova, hx - hs * 1.4, hy - hs * 1.4, hs * 2.8, hs * 2.8);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // Scarab beetles scattering outward across the sand
    const scarabs = parts ? (low ? 5 : 10) : 0;
    for (let i = 0; i < scarabs; i++) {
        const a = i / scarabs * Math.PI * 2 + 0.35 + Math.sin(p * 8 + i) * 0.14;
        const dist = BASE * (0.2 + p * (1.35 + (i % 3) * 0.22));
        const sx = Math.cos(a) * dist, sy = Math.sin(a) * dist, ss = 18 * sc * (1 - p * 0.35);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha = fade;
        ctx.drawImage(_amArt.scarab, -ss, -ss, ss * 2, ss * 2);
        ctx.restore();
    }

    if (parts) {
        ctx.fillStyle = '#fff0b8';
        ctx.globalAlpha = fade * 0.85;
        ctx.beginPath();
        const motes = low ? 10 : 24;
        for (let i = 0; i < motes; i++) {
            const s0 = _amSeeds[i * 4], s1 = _amSeeds[i * 4 + 1], a = s0 * Math.PI * 2 + p * 2;
            const d = BASE * (0.2 + s1 * 1.4 * p), my = Math.sin(a) * d - p * 70 * s0;
            ctx.rect(Math.cos(a) * d, my, 2 + (i % 2), 2 + (i % 2));
        }
        ctx.fill();
    }
    ctx.restore();
}

function _drawAmmit(enemy) {
    const now = Number.isFinite(enemy._amClock) ? enemy._amClock : performance.now();
    const age = now - enemy._spawnTime;
    if (age < 1400 && age >= 0) return;
    if (age < 2400 && age >= 1400) {
        const p = _ammitEase((age - 1400) / 1000), low = _mobPerf || _gfxLevel >= 2;
        const h = Math.min(160, canvas.height * .23), w = Math.min(enemy.size * .73, canvas.width * .35);
        const cut = enemy.y + enemy.size * (1.4 - p * 2.8);
        ctx.save(); _ammitRiftPath(enemy.x, enemy.y - 20, w, h, low); ctx.clip();
        ctx.beginPath(); ctx.rect(0, 0, canvas.width, Math.max(0, cut)); ctx.clip(); _drawAmmitBody(enemy); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(0, cut, canvas.width, Math.max(0, canvas.height - cut)); ctx.clip(); _drawAmmitBody(enemy); ctx.restore();
        return;
    }
    _drawAmmitBody(enemy);
}

function _drawAmmitBody(enemy) {
    _selectAmmitArt();
    const now = Number.isFinite(enemy._amClock) ? enemy._amClock : performance.now(), sc = (enemy.size || 180) / 180 * 1.06 * Math.min(1, canvas.height / 600), BASE = 90 * sc;
    const fo = window._fxOpts, glow = (!fo || fo.glow !== false) && (!fo || fo.sigilLight !== false), parts = !fo || fo.particles !== false, trails = !fo || fo.trails !== false;
    const low = _mobPerf || _gfxLevel >= 2;

    if (enemy._amDeathAt !== undefined || enemy.hp <= 0) {
        const dStart = enemy._amDeathAt !== undefined ? enemy._amDeathAt : now;
        const dp = Math.max(0, Math.min(1, (now - dStart) / 1000));
        _drawAmmitDeath(enemy.x, enemy.y, enemy.size, now, dp, enemy._amHearts || 4);
        return;
    }

    const hearts = Math.max(0, Math.min(5, enemy._amHearts || 0));
    const passiveNow = enemy._amReal && typeof _ammitTime !== 'undefined' ? _ammitTime : now;
    const exposed = passiveNow < (enemy._amExposedUntil || -1000);
    const lowHp = (enemy.hp / (enemy.maxHp || 4000)) < 0.3;
    const stagger = passiveNow < (enemy._amStaggerUntil || 0) || enemy._amWeigh && enemy._amWeigh.phase === 'stagger';
    const pal = exposed ? 2 : hearts >= 5 ? 1 : 0;
    const tint = _amPalettes[pal];
    const wraps = exposed ? 0 : Math.max(0, Math.min(3, enemy._amWraps === undefined ? 3 : enemy._amWraps));
    const hit = Math.max(0, 1 - (now - (enemy._amHitAt || -1000)) / 160);
    const breath = Math.sin(now * 0.0028);
    const spawnAge = now - (enemy._spawnTime !== undefined ? enemy._spawnTime : -9999);
    const spawning = spawnAge >= 0 && spawnAge < 3000;
    if (spawning && spawnAge < 1400) return;
    const spawnP = spawning ? _ammitEase((spawnAge - 1400) / 1000) : 1;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(11,10,16,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 76 * sc, BASE * 1.5, BASE * 0.78, 0, 0, Math.PI * 2); ctx.fill();

    const emergeScale = spawning ? 0.4 + 0.6 * spawnP : 1;
    const staggerSway = stagger ? Math.sin(now * 0.014) * 8 * sc : 0;
    // the body rears up during the stomp wind up and slams back down as the wave leaves
    const sk = enemy._amStomp, stompY = sk && sk.phase === 'wind' ? -16 * Math.min(1, sk.t / 1000) * sc : (sk && sk.phase === 'wave' ? 10 * Math.max(0, 1 - sk.t / 160) * sc : 0);
    ctx.save();
    ctx.translate(staggerSway + Math.sin(now * 0.14) * hit * 3, Math.cos(now * 0.11) * hit * 2 + stompY);
    ctx.scale(emergeScale * (1 + breath * 0.02), emergeScale * (1 - breath * 0.02));

    // Outer ritual aura
    if (glow && (!fo || fo.sigilBackdrop !== false)) {
        const auraScale = (exposed || stagger ? 0.78 : 1.05 + hearts * 0.04) * (210 * sc) * (low ? 0.72 : 1);
        ctx.globalAlpha = exposed ? 0.38 : 0.78 + hearts * 0.04;
        ctx.drawImage(_amArt.aura[pal], -auraScale, -auraScale, auraScale * 2, auraScale * 2);
        ctx.globalAlpha = 1;
    }

    if (low && _amArt.figure) {
        ctx.drawImage(_amArt.figure[pal * 4 + wraps], -192 * sc, -180 * sc, 384 * sc, 400 * sc);
        if (hit > 0) {
            ctx.globalAlpha = hit * 0.28;
            ctx.drawImage(_amArt.figureFlash[wraps], -192 * sc, -180 * sc, 384 * sc, 400 * sc);
            ctx.globalAlpha = 1;
        }
        if (trails) for (let w = 0; w < wraps; w++) {
            const side = w % 2 ? 1 : -1, x = side * (216 - w * 12) * 0.44 * sc;
            const y = (104 + w * 21) * sc, wave = Math.sin(now * 0.003 + w * 1.3);
            ctx.strokeStyle = '#e3c88b'; ctx.lineWidth = 4 * sc;
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + side * 18 * sc, y + wave * 13 * sc, x + side * 25 * sc, y + 30 * sc,
                x + side * (32 + wave * 7) * sc, y + 21 * sc); ctx.stroke();
        }
        const age = now - (enemy._amWrapLostAt || -9999);
        if (parts && age >= 0 && age < 850) _drawAmmitDust(0, BASE * 0.8, BASE, age / 850, 0.7, true);
    } else {
        // The broad rear torso remains visible below the mane and muzzle.
        const segments = low ? 16 : _gfxLevel === 1 ? 32 : 48;
        if (!low) {
            const bk = _ammitBodyBake(pal, BASE, tint), by = 72 * sc - bk.half;
            ctx.drawImage(bk.img, -bk.half, by);
            if (hit > 0) { ctx.globalAlpha = hit * 0.65; ctx.drawImage(bk.white, -bk.half, by); ctx.globalAlpha = 1; }
        } else {
            ctx.save(); ctx.translate(0, 72 * sc); ctx.scale(1.08, 1.06);
            _drawAmmitBodySurface(pal, BASE, now, segments);
            if (hit > 0) {
                ctx.save(); ctx.clip(); ctx.globalAlpha = hit * 0.65;
                ctx.fillStyle = '#fff0b8'; ctx.fill(); ctx.restore();
            }
            ctx.strokeStyle = '#0b0a10'; ctx.lineWidth = 5 * sc; ctx.stroke();
            ctx.strokeStyle = tint; ctx.lineWidth = 1.6 * sc; ctx.stroke();
            ctx.restore();
        }

        // Ornamented linen poses sway across the exposed hippo flanks.
        if (wraps > 0) {
            for (let w = 0; w < wraps; w++) {
                const phase = now * 0.003 + w * 1.3;
                const pose = Math.max(0, Math.min(6, Math.round(3 + Math.sin(phase) * 3)));
                const width = (216 - w * 12) * sc, wy = (104 + w * 21) * sc;
                ctx.save();
                if (w === wraps - 1) ctx.globalAlpha = _ammitEase((now - (enemy._amWrapRegrownAt || -9999)) / 450);
                ctx.drawImage(_amArt.linen[pose], -width * 0.5, wy - 34 * sc, width, 68 * sc);
                ctx.restore();
                if (trails) {
                    const side = w % 2 ? 1 : -1, x = side * width * 0.44;
                    ctx.strokeStyle = '#e3c88b'; ctx.lineWidth = 5 * sc;
                    ctx.beginPath(); ctx.moveTo(x, wy);
                    ctx.bezierCurveTo(x + side * 20 * sc, wy + Math.sin(phase) * 13 * sc,
                        x + side * 25 * sc, wy + 31 * sc, x + side * (33 + Math.cos(phase) * 7) * sc, wy + 21 * sc);
                    ctx.stroke();
                }
            }
        }
    
        // Loose linen peels away into pale dust when a layer is lost
        const wrapLostAge = now - (enemy._amWrapLostAt || -9999);
        if (wrapLostAge >= 0 && wrapLostAge < 850) {
            const wp = wrapLostAge / 850, wFade = 1 - wp;
            ctx.save();
            ctx.globalAlpha = wFade * 0.92;
            ctx.strokeStyle = '#fff0b8';
            ctx.lineWidth = 5.5 * (1 - wp * 0.55) * sc;
            for (let side = -1; side <= 1; side += 2) {
                ctx.beginPath();
                for (let s = 0; s <= 10; s++) {
                    const u = s / 10;
                    const rx = side * (BASE * 0.48 + u * (60 + wp * 80) * sc);
                    const ry = (-22 + u * 36) * sc + Math.sin(u * 5 + wp * 9) * 15 * sc;
                    if (!s) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
                }
                ctx.stroke();
            }
            ctx.restore();
            if (parts) _drawAmmitDust(0, BASE * 0.8, BASE, wp, 0.6, low);
        }
    
        // Ritual lion mane flaring behind head (droops and dims when staggered or exposed)
        const maneScale = (stagger || exposed ? 0.92 : 1.04 + 0.025 * Math.sin(now * 0.005)) * BASE * 1.6;
        ctx.save();
        ctx.translate(0, -28 * sc);
        ctx.rotate(Math.sin(now * 0.0022) * (stagger ? 0.08 : 0.022));
        ctx.globalAlpha = exposed || stagger ? 0.62 : 0.96;
        ctx.drawImage(_amArt.mane[exposed || stagger ? 1 : 0], -maneScale, -maneScale, maneScale * 2, maneScale * 2);
        if (!low && !exposed && !stagger && trails) {
            ctx.strokeStyle = '#fff0b8';
            ctx.lineWidth = 1.4 * sc;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
                const a = i * Math.PI / 8 + Math.sin(now * 0.004 + i) * 0.04;
                const r0 = BASE * 1.04, r1 = BASE * (1.24 + 0.08 * Math.sin(now * 0.007 + i * 1.7));
                ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
                ctx.lineTo(Math.cos(a + 0.03) * r1, Math.sin(a + 0.03) * r1);
            }
            ctx.stroke();
        }
        ctx.restore();
    
        // Two lion forepaws with claws at the lower corners
        for (let side = -1; side <= 1; side += 2) {
            ctx.save();
            // the forepaws rise while the claw winds up and lunge down on the strike
            const cl = enemy._amClaw, clawP = cl && cl.phase === 'wind' ? Math.min(1, cl.t / (typeof AMMIT_CLAW_WIND === 'number' ? AMMIT_CLAW_WIND : 1100)) : 0;
            const clawHit = cl && cl.phase === 'strike' ? 1 - Math.min(1, cl.t / 250) : 0;
            const px = (side * 92 + (clawP > .6 ? Math.sin(now * .07 + side) * 2.4 * (clawP - .6) : 0)) * sc, py = (45 + Math.sin(now * 0.003 + side) * 3 - 30 * clawP + 34 * clawHit) * sc;
            ctx.translate(px, py);
            ctx.scale(side * sc * 1.06, sc * 1.06);
            ctx.rotate(0.12 + breath * 0.05 - 0.5 * clawP + 0.35 * clawHit);
            ctx.drawImage(_amArt.paw, -45, -44, 90, 116);
            ctx.restore();
        }
    }

    // Lower crocodile jaw parting and closing gently with breathing or heart swallow
    const swallowAge = now - (enemy._amHeartAt || -9999);
    const swallowOpen = swallowAge >= 0 && swallowAge < 750 ? Math.sin(swallowAge / 750 * Math.PI) * 14 : 0;
    const jawCastOpen = enemy._amJaws && enemy._amJaws.phase !== 'idle' ? 10 : 0;
    const jawDrop = (6 + (0.5 + 0.5 * Math.sin(now * 0.0036)) * 6 + swallowOpen + jawCastOpen) * sc;
    ctx.save();
    ctx.translate(0, jawDrop);
    ctx.drawImage(_amArt.jaw, -112 * sc, -72 * sc, 224 * sc, 224 * sc);
    ctx.restore();

    // Crocodile upper skull and snout
    ctx.drawImage(_amArt.head, -160 * sc, -120 * sc, 320 * sc, 320 * sc);

    // Golden cracks across body and mane when HP < 30% or Exposed
    if (lowHp || exposed) {
        const crackPulse = 0.65 + 0.35 * Math.sin(now * 0.009);
        ctx.save();
        ctx.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
            ctx.strokeStyle = pass ? '#fff0b8' : '#f2b72e';
            ctx.lineWidth = (pass ? 1.4 : 3.6) * sc;
            ctx.globalAlpha = crackPulse * (pass ? 0.95 : 0.58);
            ctx.beginPath();
            const branches = low ? 5 : 8;
            for (let c = 0; c < branches; c++) {
                const a = c * Math.PI * 2 / branches + 0.25;
                ctx.moveTo(Math.cos(a) * 10 * sc, Math.sin(a) * 10 * sc);
                for (let s = 1; s <= 4; s++) {
                    const d = (s / 4) * BASE * 0.94;
                    const off = _amCrack[c * 5 + s] * 12 * sc;
                    ctx.lineTo(Math.cos(a) * d - Math.sin(a) * off, Math.sin(a) * d + Math.cos(a) * off);
                }
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    // Crocodile eyes with vertical golden slit pupils tracking the player
    const pxTarget = typeof player !== 'undefined' && player ? player.x : enemy.x;
    const pyTarget = typeof player !== 'undefined' && player ? player.y : enemy.y + 200;
    for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const ex = side * 40 * sc, ey = -43 * sc, er = 10 * sc;
        const bPhase = (now + i * 47) % 4100;
        const blink = bPhase < 120 ? bPhase / 120 : bPhase < 240 ? 1 - (bPhase - 120) / 120 : 0;
        const look = Math.atan2(pyTarget - enemy.y - ey, pxTarget - enemy.x - ex);
        const lx = Math.cos(look) * er * 0.28, ly = Math.sin(look) * er * 0.28;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.scale(1, Math.max(0.08, 1 - blink * 0.92));
        ctx.fillStyle = '#0b0a10';
        ctx.beginPath();
        ctx.ellipse(0, 0, er, er * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(_amArt.iris[hearts >= 5 ? 1 : 0], lx - er * 0.76, ly - er * 0.68, er * 1.52, er * 1.36);
        ctx.fillStyle = '#0b0a10';
        ctx.beginPath();
        ctx.ellipse(lx, ly, er * (hearts >= 5 ? 0.14 : 0.2), er * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff0b8';
        ctx.beginPath();
        ctx.arc(lx - er * 0.18, ly - er * 0.2, er * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (hearts >= 5 && glow) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now * 0.01 + i);
            ctx.drawImage(_amArt.glow, ex - er * 2.2, ey - er * 2.2, er * 4.4, er * 4.4);
            ctx.fillStyle = '#fff0b8';
            ctx.beginPath();
            _amStar8(ex + side * er, ey - er * 0.6, er * 0.32, now * 0.002);
            ctx.fill();
            ctx.restore();
        }
    }

    ctx.restore();

    // Sandstorm dust veil during spawn
    if (spawning && parts) {
        const veilA = Math.sin(spawnP * Math.PI);
        _drawAmmitDust(0, BASE * 0.75, BASE * 1.65, spawnP * 0.65, veilA, low);
        ctx.save();
        ctx.fillStyle = '#f2b72e';
        ctx.globalAlpha = veilA * 0.65;
        ctx.beginPath();
        const grains = low ? 10 : 24;
        for (let i = 0; i < grains; i++) {
            const s0 = _amSeeds[i * 4], s1 = _amSeeds[i * 4 + 1];
            const gx = ((s0 + spawnP * 1.8) % 1 - 0.5) * BASE * 2.6;
            const gy = (s1 - 0.5) * BASE * 2.1 - spawnP * 28 * sc;
            ctx.rect(gx, gy, 2.5, 1.5);
        }
        ctx.fill();
        ctx.restore();
    }

    // Passive 1: Heart Hoard (up to 5 golden ib hearts orbiting on an 8 point ring)
    if (hearts > 0) {
        const beatPhase = (now * 0.00125) % 1;
        const beat = 1 + 0.17 * Math.exp(-Math.pow((beatPhase - 0.12) * 20, 2)) + 0.09 * Math.exp(-Math.pow((beatPhase - 0.32) * 24, 2));
        for (let i = 0; i < hearts; i++) {
            const slotAngle = (i * 3 % 8) * Math.PI / 4 + now * 0.00055;
            const orbR = BASE * 1.65;
            const hx = Math.cos(slotAngle) * orbR, hy = Math.sin(slotAngle) * orbR * 0.86;
            const hs = 23 * sc * beat;
            if (glow && !low) {
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + (beat - 1) * 2;
                ctx.drawImage(_amArt.glow, hx - hs * 1.3, hy - hs * 1.3, hs * 2.6, hs * 2.6); ctx.restore();
            }
            ctx.drawImage(_amArt.heart, hx - hs, hy - hs, hs * 2, hs * 2);
        }
    }

    // Stream of light carrying a swallowed heart into Ammit's mouth
    if (swallowAge >= 0 && swallowAge < 750) {
        const st = swallowAge / 750, sq = st * st * (3 - 2 * st);
        const startX = enemy._amHeartFromX !== undefined ? enemy._amHeartFromX - enemy.x : 130 * sc;
        const startY = enemy._amHeartFromY !== undefined ? enemy._amHeartFromY - enemy.y : 158 * sc;
        const mouthX = 0, mouthY = 105 * sc;
        const cx = startX * (1 - sq) + Math.sin(st * Math.PI) * 28 * sc;
        const cy = startY + (mouthY - startY) * sq - Math.sin(st * Math.PI) * 24 * sc;
        ctx.save();
        if (trails) {
            ctx.strokeStyle = '#f2b72e';
            ctx.lineWidth = 3 * (1 - st * 0.5) * sc;
            ctx.globalAlpha = Math.sin(st * Math.PI) * 0.85;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(startX * 0.35, mouthY - 28 * sc, mouthX, mouthY);
            ctx.stroke();
            if (!low) {
                ctx.lineWidth = 1.1 * sc; ctx.strokeStyle = '#fff0b8'; ctx.beginPath();
                ctx.moveTo(startX, startY + 5 * sc);
                ctx.bezierCurveTo(startX * 0.7, mouthY + 12 * sc, startX * 0.3, mouthY - 30 * sc, mouthX, mouthY);
            }
            ctx.stroke();
        }
        const hs = 22 * sc * (1.1 - st * 0.4);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(_amArt.heart, cx - hs, cy - hs, hs * 2, hs * 2);
        if (glow) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7;
            ctx.drawImage(_amArt.glow, cx - hs * 1.4, cy - hs * 1.4, hs * 2.8, hs * 2.8);
        }
        ctx.restore();
    }

    // Passive 3: Feather of Truth floating above crown or falling like a leaf
    const featherFallen = enemy._amFeather === 'fallen';
    ctx.save();
    if (!featherFallen) {
        const returnP = _ammitEase((now - (enemy._amFeatherReturnedAt || -9999)) / 500);
        const fy = -BASE * 1.53 + Math.sin(now * 0.0032) * 5 * sc - (1 - returnP) * 45 * sc;
        const fRot = Math.sin(now * 0.002) * 0.12;
        ctx.translate(0, fy);
        ctx.rotate(fRot);
        if (glow) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.55 + 0.25 * Math.sin(now * 0.004);
            ctx.drawImage(_amArt.glow, -36 * sc, -36 * sc, 72 * sc, 72 * sc);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 0.96;
        ctx.drawImage(_amArt.feather, -32 * sc, -32 * sc, 64 * sc, 64 * sc);
    } else {
        const fallOsc = Math.min(1, Math.max(0, (passiveNow - (enemy._amExposedUntil - 3000)) / 1000));
        const fx = Math.sin(now * 0.0045) * 26 * sc;
        const fy = (-BASE * 1.05) + fallOsc * 75 * sc;
        ctx.translate(fx, fy);
        ctx.rotate(0.65 + Math.sin(now * 0.005) * 0.45);
        ctx.globalAlpha = (1 - fallOsc) * 0.85;
        ctx.drawImage(_amArt.feather, -28 * sc, -28 * sc, 56 * sc, 56 * sc);
    }
    ctx.restore();

    // Stagger state: 8 pointed golden stars orbiting Ammit's head
    if (stagger) {
        ctx.save();
        ctx.fillStyle = '#fff0b8';
        ctx.strokeStyle = '#27d3c3';
        ctx.lineWidth = 1.2 * sc;
        for (let i = 0; i < 5; i++) {
            const a = now * 0.005 + i * Math.PI * 2 / 5;
            const sx = Math.cos(a) * 56 * sc, sy = -BASE * 0.72 + Math.sin(a) * 18 * sc;
            ctx.beginPath();
            _amStar8(sx, sy, 8 * sc, -a);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    // Idle floating golden sand grains around Ammit
    if (parts) {
        ctx.fillStyle = '#f2b72e';
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        const count = low ? 5 : 12;
        for (let i = 0; i < count; i++) {
            const ph = (now * 0.00018 + _amSeeds[i * 4]) % 1;
            const a = _amSeeds[i * 4 + 1] * Math.PI * 2 + now * 0.00012;
            const r = BASE * (1.05 + ph * 0.45);
            ctx.rect(Math.cos(a) * r, Math.sin(a) * r - ph * 14 * sc, 1.6 + (i % 2), 1.6 + (i % 2));
        }
        ctx.fill();
    }

    if (lowHp) {
        ctx.save(); ctx.strokeStyle = '#ff6a28'; ctx.globalAlpha = .65;
        ctx.lineWidth = low ? 2 : 3;
        ctx.beginPath(); _amStar8(0, 0, BASE * 1.4, now * .0003); ctx.stroke();
        const rageP = Math.max(0, Math.min(1, (now - (enemy._amEnrageAt || -9999)) / 600));
        if (rageP < 1) { ctx.globalAlpha = 1 - rageP; ctx.beginPath(); ctx.arc(0, 0, BASE * (1 + rageP), 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = '#ff4325'; ctx.globalAlpha = .9;
        ctx.beginPath(); ctx.arc(-40 * sc, -18 * sc, 5 * sc, 0, Math.PI * 2); ctx.arc(40 * sc, -18 * sc, 5 * sc, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (exposed) {
        const remaining = Math.max(0, Math.min(3, Math.ceil((enemy._amExposedUntil - passiveNow) / 1000)));
        ctx.save(); ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 2; ctx.globalAlpha = .9;
        ctx.beginPath(); ctx.arc(0, 0, BASE * 1.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, enemy._amExposedUntil - passiveNow) / 3000); ctx.stroke();
        ctx.fillStyle = '#fff0b8'; ctx.font = 'bold 14px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(remaining === 3 ? '3' : remaining === 2 ? '2' : remaining === 1 ? '1' : '0', 0, BASE * 1.8); ctx.restore();
    }

    // Health bar above Ammit
    ctx.globalAlpha = 1;
    const bw = enemy.size * 1.1, by = Math.max(-BASE * 1.84, 12 - enemy.y);
    ctx.fillStyle = '#0b0a10';
    ctx.fillRect(-bw / 2, by, bw, 5);
    ctx.fillStyle = tint;
    ctx.fillRect(-bw / 2, by, bw * Math.max(0, enemy.hp / (enemy.maxHp || 4000)), 5);
    ctx.strokeStyle = '#f2b72e';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-bw / 2, by, bw, 5);
    ctx.restore();
}

function _drawAmmitSandPit(pit, now) {
    if (!_amArt) _amArt = _bakeAmmitBodyArt();
    const life = pit.life || 3000, age = now - pit.born;
    if (!(age >= 0 && age < life)) return;
    const u = age / life;
    const fade = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1;
    const radius = 110;
    const fo = window._fxOpts, parts = !fo || fo.particles !== false, low = _mobPerf || _gfxLevel >= 2;

    ctx.save();
    ctx.translate(pit.x, pit.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = fade * 0.88;

    ctx.save();
    ctx.rotate(now * 0.00065);
    ctx.drawImage(_amArt.sandPit, -radius, -radius, radius * 2, radius * 2);
    ctx.restore();

    // Rising and sinking hieroglyph fragments inside the swirling sand disc
    const glyphs = low ? 4 : 8;
    ctx.strokeStyle = '#fff0b8';
    ctx.fillStyle = '#27d3c3';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < glyphs; i++) {
        const a = i * Math.PI * 2 / glyphs - now * 0.0011;
        const bob = Math.sin(now * 0.004 + i * 1.3);
        const r = radius * (0.38 + 0.28 * (0.5 + 0.5 * bob));
        const gx = Math.cos(a) * r, gy = Math.sin(a) * r;
        ctx.globalAlpha = fade * (0.35 + 0.55 * Math.max(0, bob));
        if (i & 1) {
            _amAnkhOn(ctx, gx, gy, 9);
        } else {
            ctx.beginPath();
            _amStar8(gx, gy, 5.5, a);
            ctx.fill();
        }
    }

    if (parts) {
        ctx.fillStyle = '#f2b72e';
        ctx.globalAlpha = fade * 0.65;
        ctx.beginPath();
        const n = low ? 6 : 14;
        for (let i = 0; i < n; i++) {
            const ph = (now * 0.0005 + _amSeeds[i * 4]) % 1;
            const a = i * 2.39996 - ph * 2.4;
            const r = radius * (0.95 - ph * 0.78);
            ctx.rect(Math.cos(a) * r, Math.sin(a) * r, 2, 2);
        }
        ctx.fill();
    }

    ctx.strokeStyle = '#c8a15a';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = fade * 0.65;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function _drawAmmitJawsEffect(enemy, now) {
    const j = enemy._amJaws;
    if (!j || j.phase === 'idle') return;
    if (!_amArt) _amArt = _bakeAmmitBodyArt();
    const tx = j.tx !== undefined ? j.tx : enemy.x;
    const ty = j.ty !== undefined ? j.ty : enemy.y + 200;
    const radius = 110;
    const fo = window._fxOpts, glow = (!fo || fo.glow !== false) && (!fo || fo.sigilLight !== false), parts = !fo || fo.particles !== false;
    const low = _mobPerf || _gfxLevel >= 2;

    if (j.phase === 'lock' || j.phase === 'close') {
        const rawT = j.t || 0;
        const progress = Math.max(0, Math.min(1, rawT <= 1.001 && rawT > 0 && !Number.isInteger(rawT) ? rawT : rawT / 1300));
        const targeted = typeof player !== 'undefined' && player && Math.hypot(tx - player.x, ty - player.y) < 40;
        _drawDangerZone('circle', tx, ty, radius, progress, 0.6, now, 0, 0, Math.PI, targeted, false);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.shadowBlur = 0;

        // Upper and lower spectral crocodile jaws closing toward the lock point
        const ease = progress * progress * (3 - 2 * progress);
        const gap = (1 - ease) * 78;
        const jawW = 244, jawH = 164;
        ctx.globalAlpha = 0.5 + progress * 0.48;
        ctx.drawImage(_amArt.jawUpper, -jawW / 2, -jawH * 0.64 - gap, jawW, jawH);
        ctx.drawImage(_amArt.jawLower, -jawW / 2, -jawH * 0.36 + gap, jawW, jawH);

        if (glow) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.2 + progress * 0.45;
            ctx.drawImage(_amArt.glow, -radius * 0.9, -radius * 0.9, radius * 1.8, radius * 1.8);
            ctx.globalCompositeOperation = 'source-over';
        }
        if (parts) {
            ctx.globalAlpha = 0.45 + progress * 0.25; ctx.fillStyle = '#f2b72e'; ctx.beginPath();
            const count = low ? 6 : 18;
            for (let i = 0; i < count; i++) {
                const ph = (now * 0.0007 + _amSeeds[i * 4]) % 1;
                const x = (_amSeeds[i * 4 + 1] - 0.5) * jawW;
                const y = (i % 2 ? 1 : -1) * (gap + 90 * (1 - ph));
                ctx.rect(x, y, 1.5, 2.5);
            }
            ctx.fill();
        }
        ctx.restore();
    } else if (j.phase === 'bite' || j.phase === 'after') {
        const bt = (j.t || 0) + (j.phase === 'after' ? 450 : 0);
        if (bt >= 750) return;
        const u = Math.max(0, Math.min(1, bt / 650)), fade = 1 - u;
        const shock = Math.min(1, bt / 240);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.shadowBlur = 0;

        // Clamped jaws fracturing and dissolving into golden sand
        const recoil = Math.sin(Math.min(1, bt / 180) * Math.PI) * 8 * fade;
        ctx.translate(Math.sin(bt * 0.19) * 3 * fade, recoil);
        const jawW = 244 * (1 + u * 0.06), jawH = 164 * (1 - u * 0.2);
        ctx.globalAlpha = Math.max(0, 1 - u * 1.25);
        ctx.drawImage(_amArt.jawUpper, -jawW / 2, -jawH * 0.64, jawW, jawH);
        ctx.drawImage(_amArt.jawLower, -jawW / 2, -jawH * 0.36, jawW, jawH);

        // Fracture cracks across the clamped teeth
        ctx.strokeStyle = '#fff0b8';
        ctx.lineWidth = 2.4 * fade;
        ctx.globalAlpha = fade * 0.95;
        ctx.beginPath();
        const cracks = low ? 5 : 8;
        for (let c = 0; c < cracks; c++) {
            const a = c * Math.PI * 2 / cracks + 0.2;
            ctx.moveTo(0, 0);
            for (let s = 1; s <= 4; s++) {
                const d = (s / 4) * radius * (0.4 + shock * 0.75);
                const off = _amCrack[c * 5 + s] * 10;
                ctx.lineTo(Math.cos(a) * d - Math.sin(a) * off, Math.sin(a) * d + Math.cos(a) * off);
            }
        }
        ctx.stroke();

        if (parts) _drawAmmitDust(0, 16, radius * 1.2, u, 0.95, low);

        // Circular shockwave and starburst bite flash
        ctx.strokeStyle = '#f2b72e';
        ctx.lineWidth = 4.5 * fade + 1;
        ctx.globalAlpha = fade * 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, 18 + shock * (radius * 1.25), 0, Math.PI * 2);
        ctx.stroke();

        if (bt < 260 && glow && (!fo || fo.screenFlash !== false) && (!fo || fo.explosions !== false)) {
            const fl = 1 - bt / 260;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fl * 0.92;
            ctx.drawImage(_amArt.nova, -110, -110, 220, 220);
            ctx.globalCompositeOperation = 'source-over';
        }

        if (parts) {
            ctx.fillStyle = '#fff0b8';
            ctx.globalAlpha = fade * 0.85;
            ctx.beginPath();
            const count = low ? 10 : 24;
            for (let i = 0; i < count; i++) {
                const a = i * 2.39996, r = 12 + u * (55 + (i % 5) * 18);
                ctx.rect(Math.cos(a) * r, Math.sin(a) * r + u * u * 28, 2.5, 2.5);
            }
            ctx.fill();
        }
        ctx.restore();
    }
}

function _drawAmmitWeighEffect(enemy, now) {
    const w = enemy._amWeigh;
    if (!w || w.phase === 'idle') return;
    if (!_amArt) _amArt = _bakeAmmitBodyArt();
    const cw = typeof canvas !== 'undefined' && canvas.width ? canvas.width : 1280;
    const ch = typeof canvas !== 'undefined' && canvas.height ? canvas.height : 800;
    const cx = cw * 0.5, topY = Math.max(85, Math.min(180, ch * 0.2));
    const leftX = cw * 0.25, rightX = cw * 0.75, spanX = rightX - leftX;
    const basePanY = w.panY > 0 ? w.panY : Math.max(topY + 135, Math.min(ch - 110, ch * 0.56));
    const tilt = Math.max(-1, Math.min(1, w.tilt || 0));
    const balanced = !!w.balanced;
    const rawT = w.t || 0;
    const fo = window._fxOpts, glow = (!fo || fo.glow !== false) && (!fo || fo.sigilLight !== false), parts = !fo || fo.particles !== false;
    const low = _mobPerf || _gfxLevel >= 2;
    const panRadius = 170;

    let open = 1, weighP = 1, verdictP = 0;
    if (w.phase === 'summon') { open = _ammitEase(rawT / 600); weighP = rawT / 2600; }
    else if (w.phase === 'weigh') weighP = Math.max(0, Math.min(1, (600 + rawT) / 2600));
    else if (w.phase === 'verdict') verdictP = Math.max(0, Math.min(1, rawT / 650));
    else if (w.phase === 'retract') open = 1 - _ammitEase(rawT / 450);
    else if (w.phase === 'stagger') return;
    const curTilt = tilt;
    const dropOffset = curTilt * Math.min(56, ch * 0.09);
    const lift = (1 - open) * 100;
    const leftY = basePanY - dropOffset - lift, rightY = basePanY + dropOffset - lift;
    const leftHeavy = !balanced && tilt < 0, rightHeavy = !balanced && tilt > 0;

    // Shared red danger warnings on both pans during summon and weigh
    if (w.phase === 'summon' || w.phase === 'weigh') {
        const leftInt = leftHeavy ? 0.9 : 0.4;
        const rightInt = rightHeavy ? 0.9 : 0.4;
        _drawDangerZone('circle', leftX, basePanY, panRadius, weighP, leftInt, now, 0, 0, Math.PI, leftHeavy, false);
        _drawDangerZone('circle', rightX, basePanY, panRadius, weighP, rightInt, now, 0, 0, Math.PI, rightHeavy, false);
    }

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = open;

    // Central golden scale pillar at top center
    const pillarHeight = Math.max(189, basePanY - topY + 150);
    ctx.drawImage(_amArt.scalePillar, cx - 54, topY - 94, 108, pillarHeight);

    // Tilting horizontal scale beam
    const beamAngle = Math.atan2(rightY - leftY, spanX) * 0.48 + Math.sin(now * 0.016) * 0.004 * weighP;
    const beamHalfW = (spanX * 0.52) * open;
    const leftTipX = cx - Math.cos(beamAngle) * beamHalfW, leftTipY = topY - Math.sin(beamAngle) * beamHalfW;
    const rightTipX = cx + Math.cos(beamAngle) * beamHalfW, rightTipY = topY + Math.sin(beamAngle) * beamHalfW;

    ctx.save(); ctx.translate(cx, topY); ctx.rotate(beamAngle);
    ctx.drawImage(_amArt.scaleBeam, -beamHalfW - 12, -28, beamHalfW * 2 + 24, 56);
    ctx.restore();

    // Eight pointed star finials at beam ends and fulcrum
    ctx.fillStyle = '#27d3c3';
    ctx.beginPath();
    _amStar8(cx, topY, 10, now * 0.001);
    _amStar8(leftTipX, leftTipY, 8, -now * 0.001);
    _amStar8(rightTipX, rightTipY, 8, now * 0.001);
    ctx.fill();

    // Hanging chains and golden pans on left and right
    for (let side = 0; side < 2; side++) {
        const tx = side === 0 ? leftTipX : rightTipX, ty = side === 0 ? leftTipY : rightTipY;
        const px = side === 0 ? leftX : rightX, py = side === 0 ? leftY : rightY;
        const isHeavy = (side === 0 && leftHeavy) || (side === 1 && rightHeavy);

        const sway = Math.sin(now * 0.0038 + side * 1.7) * (low ? 2 : 5) * open;
        const thud = isHeavy && w.phase === 'verdict' ? -Math.sin(_ammitEase(rawT / 200) * Math.PI) * 16 * (1 - _ammitEase(rawT / 650)) : 0;
        _drawAmmitChain(tx, ty, px - 59 + sway, py + thud, open * 0.9);
        _drawAmmitChain(tx, ty, px + 59 + sway, py + thud, open * 0.9);
        ctx.fillStyle = 'rgba(11,10,16,0.35)'; ctx.globalAlpha = open;
        ctx.beginPath(); ctx.ellipse(px, py + 27, 88, 21, 0, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(_amArt.scalePan, px - 100 + sway, py - 64 + thud, 200, 129);

        if (!isHeavy && w.phase !== 'verdict') {
            const fy = py - 34 + Math.sin(now * 0.004 + side) * 6;
            ctx.drawImage(_amArt.feather, px - 28, fy - 28, 56, 56);
        } else if (isHeavy) {
            const units = Math.max(1, Math.min(4, (side === 0 ? w.leftCount : w.rightCount) || 2));
            for (let u = 0; u < units; u++) {
                const hx = px + (u - (units - 1) * 0.5) * 26;
                ctx.drawImage(_amArt.heart, hx - 18, py - 32, 36, 36);
            }
            if (w.phase === 'weigh' && w.locked && glow && (!fo || fo.explosions !== false) && (!fo || fo.screenFlash !== false)) {
                const clank = _ammitEase((rawT - 1600) / 400);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = open * clank * 0.75;
                ctx.drawImage(_amArt.nova, px - 75, py - 75, 150, 150);
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = open;
            }
        }
    }

    // Verdict phase: heavy pan slams down with shockwave and hieroglyph cracks, or balanced feather shatters
    if (w.phase === 'verdict') {
        const vFade = 1 - verdictP;
        if (!balanced) {
            const hx = leftHeavy ? leftX : rightX, hy = leftHeavy ? leftY : rightY;
            ctx.save();
            ctx.translate(hx, hy);
            ctx.strokeStyle = '#fff0b8';
            ctx.lineWidth = 5 * vFade + 1.5;
            ctx.globalAlpha = vFade * 0.95;
            ctx.beginPath();
            ctx.arc(0, 0, 24 + verdictP * panRadius * 1.25, 0, Math.PI * 2);
            ctx.stroke();

            if (parts) _drawAmmitDust(0, 0, panRadius * 1.2, verdictP, 1, low);
            const glyphCount = low ? 4 : 8;
            ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 1.3; ctx.globalAlpha = vFade * 0.75;
            for (let i = 0; i < glyphCount; i++) {
                const a = i * Math.PI * 2 / glyphCount + 0.39, r = panRadius * (0.35 + verdictP * 0.6);
                _amAnkhOn(ctx, Math.cos(a) * r, Math.sin(a) * r, 7);
            }
            const cracks = low ? 5 : 8;
            ctx.strokeStyle = '#f2b72e';
            ctx.lineWidth = 2.8 * vFade;
            ctx.beginPath();
            for (let c = 0; c < cracks; c++) {
                const a = c * Math.PI * 2 / cracks + 0.39;
                ctx.moveTo(0, 0);
                for (let s = 1; s <= 4; s++) {
                    const d = (s / 4) * panRadius * (0.35 + verdictP * 0.85);
                    const off = _amCrack[c * 5 + s] * 14;
                    ctx.lineTo(Math.cos(a) * d - Math.sin(a) * off, Math.sin(a) * d + Math.cos(a) * off);
                }
            }
            ctx.stroke();

            if (glow && verdictP < 0.55 && (!fo || fo.screenFlash !== false) && (!fo || fo.explosions !== false)) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = (1 - verdictP / 0.55) * 0.9;
                ctx.drawImage(_amArt.nova, -135, -135, 270, 270);
                ctx.globalCompositeOperation = 'source-over';
            }
            if (parts) {
                ctx.fillStyle = '#f2b72e';
                ctx.globalAlpha = vFade * 0.85;
                ctx.beginPath();
                const dust = low ? 10 : 24;
                for (let i = 0; i < dust; i++) {
                    const a = i * 2.39996, r = 20 + verdictP * (panRadius * 0.9 + (i % 4) * 20);
                    ctx.rect(Math.cos(a) * r, Math.sin(a) * r - verdictP * 32, 3, 3);
                }
                ctx.fill();
            }
            ctx.restore();
        } else {
            ctx.save();
            ctx.translate(cx, topY + 24);
            if (glow && (!fo || fo.explosions !== false) && (!fo || fo.screenFlash !== false)) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = vFade * 0.95;
                ctx.drawImage(_amArt.nova, -120, -120, 240, 240);
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.fillStyle = '#fff0b8';
            ctx.strokeStyle = '#27d3c3';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = vFade;
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4 + verdictP * 0.8;
                const r = 18 + verdictP * 110;
                ctx.beginPath();
                _amStar8(Math.cos(a) * r, Math.sin(a) * r, 8 * vFade + 2, a);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    ctx.restore();
}

// A sand scarab: a small winged beetle that heads along its own velocity, with a thin red rim so it reads as a hazard.
function _drawAmmitScarab(enemy) {
    if (!_amArt) _amArt = _bakeAmmitBodyArt();
    const now = enemy.ownerRef && enemy.ownerRef._amReal && typeof _ammitTime !== 'undefined' ? _ammitTime : performance.now(), fo = window._fxOpts, low = _mobPerf || _gfxLevel >= 2;
    if (typeof _drawThreatRing === 'function') _drawThreatRing(enemy.x, enemy.y, enemy.size * 1.3, 1);
    const s = enemy.size * 3.4, flap = 1 + Math.sin(now * 0.03 + enemy.x * 0.05) * 0.08;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowBlur = 0;
    const hatch = Math.max(0, Math.min(1, (now - (enemy._amBornAt || 0)) / 400));
    if (!fo || fo.particles !== false) {
        ctx.fillStyle = '#f2d27a'; ctx.globalAlpha = .6 * (1 - hatch);
        for (let i = 0; i < (low ? 3 : 7); i++) { const a = i * 2.39996; ctx.fillRect(Math.cos(a) * hatch * 35, Math.sin(a) * hatch * 25, 3, 2); }
        if (!low && (!fo || fo.trails !== false)) { ctx.globalAlpha = .25; ctx.drawImage(_amArt.dust, -18 - enemy.vx * 8, -12 - enemy.vy * 8, 36, 24); }
    }
    ctx.scale(.3 + hatch * .7, .3 + hatch * .7);
    if (!low && (!fo || fo.glow !== false)) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
        ctx.drawImage(_amArt.glow, -s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ff4631'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, enemy.size + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.rotate(Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2);
    ctx.scale(flap, 1);
    ctx.drawImage(_amArt.scarab, -s / 2, -s / 2, s, s);
    ctx.restore();
}

// A warm gold light sprite baked once for the claw, brighter in the middle than the shared glow sprite.
let _amClawGlow = null;
function _ammitClawGlowArt() {
    if (_amClawGlow) return _amClawGlow;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,248,214,1)'); gr.addColorStop(.25, 'rgba(255,214,110,.7)'); gr.addColorStop(.6, 'rgba(242,183,46,.22)'); gr.addColorStop(1, 'rgba(242,183,46,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (_amClawGlow = c);
}

// An eight pointed flash used by the claw charge and its impact.
function _ammitClawStar(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8 - Math.PI / 2, d = i % 2 ? r * .32 : r;
        if (i) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath(); ctx.fill();
}

// The lion claw: both paws lift and gather gold light while the three rakes are previewed inside a red sector, then the rakes cut across it.
function _drawAmmitClawEffect(enemy, now) {
    const c = enemy._amClaw;
    if (!c || c.phase === 'idle') return;
    const WIND = typeof AMMIT_CLAW_WIND === 'number' ? AMMIT_CLAW_WIND : 1100;
    const fo = window._fxOpts, low = _mobPerf || _gfxLevel >= 2, glow = !fo || fo.glow !== false, rich = glow && !low;
    const cg = rich ? _ammitClawGlowArt() : null;
    if (c.phase === 'wind') {
        const p = Math.max(0, Math.min(1, c.t / WIND)), e = p * p;
        const targeted = typeof player !== 'undefined' && player && Math.hypot(player.x - c.ox, player.y - c.oy) < c.r;
        const lift = 70 * _ammitEase(p), lx = c.ox - 88, rx = c.ox + 88, py = c.oy + 18 - lift * .5;
        ctx.save(); ctx.shadowBlur = 0; ctx.globalAlpha = .15 + p * .35;
        // the three rakes are drawn ahead of time as thin gold arcs that grow and brighten
        ctx.strokeStyle = '#f2b72e'; ctx.lineCap = 'round';
        for (let k = -1; k <= 1; k++) {
            const r = c.r * (0.62 + 0.14 * (k + 1)), a0 = c.ang + k * 0.16 - c.span * 0.42, a1 = a0 + c.span * 0.84 * Math.min(1, p * 1.25);
            ctx.globalAlpha = .12 + e * .5; ctx.lineWidth = 2 + e * 2;
            ctx.beginPath(); ctx.arc(c.ox, c.oy, r, a0, a1); ctx.stroke();
        }
        if (rich) {
            // gold light swells at each paw and motes spiral into it
            ctx.globalCompositeOperation = 'lighter';
            const gs = 60 + e * 150;
            ctx.globalAlpha = .25 + e * .7;
            ctx.drawImage(cg, lx - gs / 2, py - gs / 2, gs, gs); ctx.drawImage(cg, rx - gs / 2, py - gs / 2, gs, gs);
            if (p > .5) { ctx.globalAlpha = (p - .5) * 1.4; ctx.drawImage(cg, lx - gs / 3, py - gs / 3, gs * .66, gs * .66); ctx.drawImage(cg, rx - gs / 3, py - gs / 3, gs * .66, gs * .66); }
            ctx.fillStyle = '#ffe9a0';
            for (let i = 0; i < 12; i++) {
                const u = (p * 1.7 + i / 12) % 1, rad = 120 * (1 - u), a = i * 0.524 + u * 2.6 + now * 0.0006;
                const mx = Math.cos(a) * rad, my = Math.sin(a) * rad * .8;
                ctx.globalAlpha = Math.sin(u * Math.PI) * (.35 + p * .5);
                ctx.fillRect(lx + mx - 2, py + my - 2, 4, 4); ctx.fillRect(rx - mx - 2, py + my - 2, 4, 4);
            }
            ctx.globalCompositeOperation = 'source-over';
        }
        if (p > .82) {
            // just before the strike a ring closes on each paw and an eight pointed flash opens
            const k = (p - .82) / .18;
            ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 2.5; ctx.globalAlpha = k * .9;
            for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.arc(c.ox + s * 88, py, 80 * (1 - k * .6), 0, Math.PI * 2); ctx.stroke(); }
            ctx.fillStyle = '#fff6d0'; ctx.globalAlpha = k;
            _ammitClawStar(lx, py, 12 + 26 * k); _ammitClawStar(rx, py, 12 + 26 * k);
        }
        ctx.restore();
        _drawDangerZone('sector', c.ox, c.oy, c.r, p, 0.6, now, c.ang, 0, c.span, targeted, false);
        return;
    }
    if (c.phase !== 'strike' && c.phase !== 'after') return;
    const age = c.phase === 'strike' ? c.t : 250 + c.t, fade = Math.max(0, 1 - age / 760);
    if (fade <= 0) return;
    const sweep = Math.min(1, age / 140);
    ctx.save();
    ctx.translate(c.ox, c.oy);
    ctx.shadowBlur = 0;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
        const r = c.r * (0.62 + 0.14 * (k + 1)), mid = c.ang + k * 0.16;
        const a0 = mid - c.span * 0.42, a1 = a0 + c.span * 0.84 * sweep;
        if (rich) {
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * .22; ctx.strokeStyle = '#f2b72e'; ctx.lineWidth = 22;
            ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke();
            if (sweep < 1) { ctx.globalAlpha = fade; ctx.drawImage(cg, Math.cos(a1) * r - 20, Math.sin(a1) * r - 20, 40, 40); }
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = fade * 0.55; ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke();
        ctx.globalAlpha = fade; ctx.strokeStyle = '#f2b72e'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke();
    }
    ctx.restore();
    if (age < 220) {
        // an eight pointed flash bursts where each rake lands
        const k = 1 - age / 220;
        ctx.save(); ctx.globalCompositeOperation = glow ? 'lighter' : 'source-over'; ctx.fillStyle = '#fff0b8'; ctx.globalAlpha = k * .9;
        for (let i = -1; i <= 1; i++) { const a = c.ang + i * 0.16; _ammitClawStar(c.ox + Math.cos(a) * c.r * .8, c.oy + Math.sin(a) * c.r * .8, 18 + 34 * k); }
        ctx.restore();
    }
}

// The hippo stomp: red lanes either side of a safe gap fill during the wind up, then a bright front sweeps down them.
function _drawAmmitStompEffect(enemy, now) {
    const st = enemy._amStomp;
    if (!st || (st.phase !== 'wind' && st.phase !== 'wave')) return;
    const cw = canvas.width, ch = canvas.height, wind = st.phase === 'wind';
    const band = typeof AMMIT_STOMP_BAND === 'number' ? AMMIT_STOMP_BAND : 30;
    const gl = Math.max(0, st.gx - st.gw / 2), gr = Math.min(cw, st.gx + st.gw / 2);
    const top = Math.max(0, wind ? st.y0 : st.front - band), bottom = ch;
    if (top >= bottom) return;
    const p = wind ? Math.max(0, Math.min(1, st.t / 1000)) : 1;
    const fo = window._fxOpts, low = _mobPerf || _gfxLevel >= 2;
    const red = window._dangerGuide === true || !fo || fo.dangerWarn !== false;
    const safe = typeof player !== 'undefined' && Math.abs(player.x - st.gx) <= st.gw / 2;
    for (let side = 0; side < 2; side++) {
        const left = side ? gr : 0, width = side ? cw - gr : gl;
        if (!(width > 0)) continue;
        _drawDangerZone('strip', left + width / 2, top, bottom - top, p, 0.6, now, Math.PI / 2, width / 2, Math.PI, !safe, false);
        ctx.save(); ctx.shadowBlur = 0;
        ctx.globalAlpha = red ? .18 + p * .14 : .45;
        ctx.fillStyle = red ? '#ff3a24' : '#777a85'; ctx.fillRect(left, top, width, bottom - top);
        if (_amLanePattern) { ctx.globalAlpha = .13; ctx.fillStyle = _amLanePattern; ctx.fillRect(left, top, width, bottom - top); }
        const front = wind ? st.y0 + ((st.t * .75) % Math.max(1, ch - st.y0)) : st.front;
        ctx.fillStyle = red ? '#fff0b8' : '#ffffff'; ctx.globalAlpha = wind ? .45 : .85;
        ctx.fillRect(left, front - (wind ? 1 : band), width, wind ? 2 : band * 2);
        if (!wind) {
            ctx.globalAlpha = .95; ctx.fillStyle = '#f2b72e'; ctx.fillRect(left, front - 2, width, 4);
        }
        ctx.restore();
    }
    ctx.save(); ctx.shadowBlur = 0;
    ctx.fillStyle = safe ? '#fff0b8' : '#caffef'; ctx.globalAlpha = safe ? .95 : .9;
    ctx.fillRect(gl, top, gr - gl, bottom - top);
    ctx.strokeStyle = '#0b0a10'; ctx.lineWidth = 7; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(gl, top); ctx.lineTo(gl, ch); ctx.moveTo(gr, top); ctx.lineTo(gr, ch); ctx.stroke();
    ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f2b72e'; ctx.strokeStyle = '#0b0a10';
    for (let side = 0; side < 2; side++) {
        const x = side ? gr : gl;
        ctx.beginPath(); ctx.moveTo(x, top - 16); ctx.lineTo(x - 7, top - 3); ctx.lineTo(x - 9, top + 37); ctx.lineTo(x + 9, top + 37); ctx.lineTo(x + 7, top - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = '#0b0a10'; ctx.lineWidth = low ? 3 : 4;
    const pulse = .7 + .3 * Math.sin(now * .009);
    ctx.globalAlpha = pulse;
    for (let y = top + 45; y < ch - 15; y += low ? 150 : 100) {
        _amAnkhOn(ctx, st.gx, y, 11);
        ctx.beginPath(); ctx.moveTo(st.gx - 12, y + 17); ctx.lineTo(st.gx, y + 28); ctx.lineTo(st.gx + 12, y + 17); ctx.stroke();
    }
    ctx.restore();
}

function _drawAmmitEffects(amClock) {
    if (typeof _ammitActive !== 'undefined' && !_ammitActive && _ammitTime >= _ammitVisualUntil) return;
    _selectAmmitArt();
    const now = Number.isFinite(amClock) ? amClock : typeof _ammitTime !== 'undefined' ? _ammitTime : performance.now();

    const pits = window._ammitSandPits;
    if (pits) {
        for (let i = 0; i < pits.length; i++) {
            const pit = pits[i];
            if (pit && pit.born !== undefined) _drawAmmitSandPit(pit, now);
        }
    }

    const bursts = window._ammitDeathBursts;
    if (bursts) {
        for (let i = 0; i < bursts.length; i++) {
            const b = bursts[i];
            if (!b || b.spawnAt === undefined) continue;
            const age = now - b.spawnAt, dur = b.duration || 1000;
            if (age >= 0 && age < dur) _drawAmmitDeath(b.x, b.y, b.size, now, age / dur, b.hearts);
        }
    }

    if (typeof enemies === 'undefined' || !enemies) return;
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy || enemy.type !== 'ammit' || enemy.hp <= 0) continue;
        ctx.save();
        if (typeof _capClipEnemyDraw === 'function') _capClipEnemyDraw(ctx, enemy.x, enemy.y, enemy);
        _drawAmmitJawsEffect(enemy, Number.isFinite(enemy._amClock) ? enemy._amClock : now);
        _drawAmmitWeighEffect(enemy, Number.isFinite(enemy._amClock) ? enemy._amClock : now);
        _drawAmmitClawEffect(enemy, Number.isFinite(enemy._amClock) ? enemy._amClock : now);
        _drawAmmitStompEffect(enemy, Number.isFinite(enemy._amClock) ? enemy._amClock : now);
        ctx.restore();
    }
}