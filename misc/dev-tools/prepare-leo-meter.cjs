// Normalizes generated artwork and removes isolated pixels inside its opening.
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function main() {
    const input = process.argv[2], output = process.argv[3];
    if (!input || !output) throw new Error('Usage: node prepare-leo-meter.cjs source.png output.png');
    const img = await loadImage(fs.readFileSync(input));
    const c = createCanvas(1376, 768), g = c.getContext('2d');
    const scale = 0.78 * 1680 / img.width;
    const w = img.width * scale, h = img.height * scale * 0.94;
    g.drawImage(img, (1376 - w) / 2, 384 - h * (573 / 960), w, h);
    const pixels = g.getImageData(0, 0, c.width, c.height), d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 32 || (d[i] > 170 && d[i + 2] > 130 && d[i + 1] < 100)) d[i + 3] = 0;
    }
    // Opaque components connected to the metal survive. Isolated cutout noise does not.
    const seen = new Uint8Array(c.width * c.height), queue = new Int32Array(seen.length);
    let head = 0, tail = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const at = y * c.width + x;
        if (d[at * 4 + 3] && (x < 190 || x > 1186 || y < 310 || y > 460)) {
            seen[at] = 1; queue[tail++] = at;
        }
    }
    while (head < tail) {
        const at = queue[head++], x = at % c.width;
        for (const n of [at - 1, at + 1, at - c.width, at + c.width]) {
            if (n < 0 || n >= seen.length || seen[n] || Math.abs(n % c.width - x) > 1 || !d[n * 4 + 3]) continue;
            seen[n] = 1; queue[tail++] = n;
        }
    }
    let removed = 0;
    for (let at = 0; at < seen.length; at++) {
        if (!seen[at] && d[at * 4 + 3]) { d[at * 4 + 3] = 0; removed++; }
        const x = at % c.width + 0.5, y = Math.floor(at / c.width) + 0.5;
        const cx = Math.max(252, Math.min(1124, x));
        if ((x - cx) * (x - cx) + (y - 384) * (y - 384) <= 59 * 59) d[at * 4 + 3] = 0;
        if (!d[at * 4 + 3]) d[at * 4] = d[at * 4 + 1] = d[at * 4 + 2] = 0;
    }
    g.putImageData(pixels, 0, 0);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, c.toBuffer('image/png'));
    console.log(JSON.stringify({ output, width: c.width, height: c.height, removed }));
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
