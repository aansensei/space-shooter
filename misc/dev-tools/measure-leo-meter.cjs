// Measures the connected alpha-zero capsule enclosed by the PNG frame.
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const file = process.argv.find(a => a.endsWith('.png')) || path.join(root, 'assets/images/game/sigils/leo-meter-frame.png');
    const img = await loadImage(fs.readFileSync(file));
    const c = createCanvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const alpha = g.getImageData(0, 0, c.width, c.height).data;
    for (const at of [0, c.width - 1, (c.height - 1) * c.width, c.width * c.height - 1]) {
        if (alpha[at * 4 + 3] !== 0) throw new Error('Every corner must have zero alpha.');
    }
    let magentaPixels = 0;
    for (let i = 0; i < alpha.length; i += 4) {
        if (alpha[i + 3] && alpha[i] > 170 && alpha[i + 2] > 130 && alpha[i + 1] < 100) magentaPixels++;
    }
    if (magentaPixels) throw new Error('Magenta pixels remain on the frame.');
    const seed = Math.floor(c.height / 2) * c.width + Math.floor(c.width / 2);
    if (alpha[seed * 4 + 3] !== 0) throw new Error('The frame center must be fully transparent.');
    const seen = new Uint8Array(c.width * c.height), queue = new Int32Array(seen.length);
    let head = 0, tail = 1, x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
    queue[0] = seed; seen[seed] = 1;
    while (head < tail) {
        const at = queue[head++], x = at % c.width, y = Math.floor(at / c.width);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
        for (const n of [at - 1, at + 1, at - c.width, at + c.width]) {
            if (n < 0 || n >= seen.length || seen[n] || Math.abs(n % c.width - x) > 1 || alpha[n * 4 + 3] !== 0) continue;
            seen[n] = 1; queue[tail++] = n;
        }
    }
    if (x0 === 0 || x1 === c.width || y0 === 0 || y1 === c.height) throw new Error('The capsule connects to the outside background.');
    const aspect = `const LEO_METER_FRAME_ASPECT = ${c.height} / ${c.width};`;
    const hole = `const LEO_METER_HOLE_FRAC = { x0: ${x0} / ${c.width}, x1: ${x1} / ${c.width}, y0: ${y0} / ${c.height}, y1: ${y1} / ${c.height} };`;
    const rows = [];
    for (let y = y0; y < y1; y++) {
        const spans = [];
        let start = -1;
        for (let x = x0; x <= x1; x++) {
            const inside = x < x1 && seen[y * c.width + x];
            if (inside && start < 0) start = x;
            if (!inside && start >= 0) { spans.push(start, x); start = -1; }
        }
        rows.push(spans);
    }
    const spans = `const LEO_METER_HOLE_SPANS = ${JSON.stringify(rows)};`;
    console.log(JSON.stringify({ width: c.width, height: c.height, bounds: { x0, x1, y0, y1 }, alphaZeroPixels: tail, cornersAlphaZero: true, magentaPixels }));
    console.log(aspect + '\n' + hole);
    if (process.argv.includes('--write')) {
        const renderer = path.join(root, 'js/render/sigil-leo.js');
        let source = fs.readFileSync(renderer, 'utf8').replace(/const LEO_METER_FRAME_ASPECT = .*?;/, aspect).replace(/const LEO_METER_HOLE_FRAC = .*?;/, hole);
        source = source.includes('const LEO_METER_HOLE_SPANS =')
            ? source.replace(/const LEO_METER_HOLE_SPANS = .*?;/, spans) : source.replace(hole, hole + '\n' + spans);
        fs.writeFileSync(renderer, source);
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
