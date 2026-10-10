// Composes prepared gauge artwork at native and game sizes for visual inspection.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '../..');

async function main() {
    const leo = await loadImage(fs.readFileSync(path.join(root, 'assets/images/game/sigils/leo-meter-frame.png')));
    const cancer = await loadImage(fs.readFileSync(path.join(root, 'assets/images/game/sigils/tidal-meter-frame.png')));
    Object.defineProperty(leo, 'naturalWidth', { value: leo.width });
    const c = createCanvas(1376, 1050), g = c.getContext('2d');
    g.fillStyle = '#25123d'; g.fillRect(0, 0, c.width, c.height);
    const sandbox = vm.createContext({ Image: class { constructor() { return leo; } },
        document: { createElement: () => createCanvas(1, 1) }, window: {},
        ctx: g, _mobPerf: false, _gfxLevel: 0 });
    const renderer = fs.readFileSync(path.join(root, 'js/render/sigil-leo.js'), 'utf8').replace(/_leoMeterFrameImg.src = .*?;/, '');
    vm.runInContext(renderer + '\nthis.sprites = _leoSprites(); this.hole = LEO_METER_HOLE_FRAC;', sandbox);
    const hole = sandbox.hole, sprites = sandbox.sprites;
    function frame(img, x, y, w, pct, isLeo) {
        const h = w * 768 / 1376, buffer = createCanvas(1376, 768), b = buffer.getContext('2d');
        const x0 = isLeo ? hole.x0 * 1376 : 178, width = isLeo ? (hole.x1 - hole.x0) * 1376 : 1019;
        b.fillStyle = '#180c25'; b.fillRect(0, 0, 1376, 768);
        const grad = b.createLinearGradient(x0, 0, x0 + width, 0);
        grad.addColorStop(0, isLeo ? '#ad4214' : '#0f5f57'); grad.addColorStop(1, isLeo ? '#ffd27a' : '#a7fff0');
        b.fillStyle = grad; b.fillRect(x0, 0, width * pct / 100, 768);
        b.globalCompositeOperation = 'destination-in';
        if (isLeo) b.drawImage(sprites.mask, 0, 0);
        else { b.beginPath(); b.roundRect(178, 323, 1019, 121, 60); b.fill(); }
        if (isLeo && w === 110) { g.save(); g.globalAlpha = pct === 100 ? 0.76 : 0.48; g.drawImage(sprites.glow, x - 25, y - 25); g.restore(); }
        g.drawImage(buffer, x, y, w, h); g.drawImage(img, x, y, w, h);
    }
    frame(leo, 0, 0, 1376, 50, true);
    g.fillStyle = '#ffd27a'; g.font = '18px sans-serif';
    g.fillText('Generated Leo artwork, native 1376 x 768, 50% fill', 35, 730);
    g.fillText('Actual 110px size: Leo and Cancer', 35, 785);
    for (let i = 0; i < 3; i++) {
        const x = 70 + i * 420, pct = i * 50;
        g.fillStyle = '#f2e8ff'; g.fillText(pct + '%', x, 830);
        frame(leo, x, 860, 110, pct, true); frame(cancer, x + 160, 860, 110, pct, false);
        g.fillText('Leo', x + 38, 960); g.fillText('Cancer', x + 185, 960);
    }
    const out = path.join(root, 'misc/leo-meter-frame-options/leo-cancer-preview.png');
    fs.writeFileSync(out, c.toBuffer('image/png')); console.log(out);
}

main().catch(e => { console.error(e.stack); process.exitCode = 1; });
