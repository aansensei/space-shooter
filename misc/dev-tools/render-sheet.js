// Contact sheet: every pose that matters, side by side in one PNG, so a
// change can be judged against all of them at once instead of one render at a
// time. Run from the repo root.
//
//   node misc/dev-tools/render-sheet.js
//   OUT=sheet.png CELL=260 node misc/dev-tools/render-sheet.js
//
// Needs @napi-rs/canvas:  npm install @napi-rs/canvas --no-save
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const CELL = Number(process.env.CELL || 240);
const OUT = process.env.OUT || 'sheet.png';
const RES = process.env.RES || '';

// The poses the cutscene actually puts her in, plus the two that expose the
// most problems (walking away, and the hair streaming out behind her).
const POSES = [
  { name: 'idle front',   back: false, o: {} },
  { name: 'idle back',    back: true,  o: {} },
  { name: 'cast',         back: false, o: { castExt: 1, expression: 'determined' } },
  { name: 'cast half',    back: false, o: { castExt: 0.5 } },
  { name: 'thinking',     back: false, o: { expression: 'thinking' } },
  { name: 'serene',       back: false, o: { expression: 'serene' } },
  { name: 'blink',        back: false, o: { blink: true } },
  { name: 'walk back',    back: true,  o: { walkStep: 0.8, trail: 6 } },
  { name: 'trail front',  back: false, o: { trail: 10, whip: 4 } },
  { name: 'trail back',   back: true,  o: { trail: 12, whip: 5 } },
  { name: 'droop',        back: false, o: { droop: 1, trail: 4 } },
  { name: 'lean',         back: false, o: { lean: 4, swayAmp: 2 } },
];

function makeStubCtx() {
  const noop = () => {};
  return {
    canvas: { width: 0, height: 0 },
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    fill: noop, stroke: noop, fillRect: noop, strokeRect: noop, clearRect: noop,
    drawImage: noop, clip: noop, setTransform: noop, fillText: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, ellipse: noop, rect: noop,
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
}

let spriteCanvas = null;
const sandbox = {
  console, performance: { now: () => 1000 }, Math,
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } },
  document: {
    createElement(kind) {
      if (kind === 'canvas' && !spriteCanvas) { spriteCanvas = createCanvas(1024, 1024); return spriteCanvas; }
      if (kind === 'canvas') return createCanvas(8, 8);
      return { setAttribute() {}, addEventListener() {}, play() { return Promise.resolve(); }, pause() {} };
    },
  },
  canvas: { width: 1280, height: 720 },
  ctx: makeStubCtx(),
  _frozenNow: 1000, gamePaused: false,
  _gfxLevel: Number(process.env.GFX || 0),
  _mobPerf: process.env.MOB === '1',
  AudioMgr: { setTimeFrozen() {}, pauseAll() {}, resumeAll() {} },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  TESLA_STACK_MAX: 5, enemies: [], drawEnemy() {}, _spawnWaveGoliath() {},
  fetch: undefined, Path2D: undefined,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync('js/timeline-distortion.js', 'utf8'), sandbox, { filename: 'td.js' });

let src = fs.readFileSync('js/render/kanade-cutscene.js', 'utf8');
const anchor = 'window._KANADE_CUTSCENE_MS = TOTAL_MS;';
if (!src.includes(anchor)) throw new Error('anchor missing');
src = src.replace(anchor, anchor + `
  window.__drawBody = (t, o) => { drawKanade(t, o); return px; };
  window.__drawBack = (t, o) => { drawKanadeBack(t, o); return px; };
  window.__setRes = setSpriteRes;
  window.__invalidate = invalidateSprite;
  window.__grid = { w: GRID_W, h: GRID_H, get mult() { return RES_MULT; } };`);
vm.runInContext(src, sandbox, { filename: 'kanade-cutscene.js' });

// The buffer normally sizes itself to the screen; RES pins it instead, to
// compare two supersample levels directly.
if (RES) sandbox.window.__setRes(Number(RES));
const g = sandbox.window.__grid;
const cols = 4;
const rows = Math.ceil(POSES.length / cols);
const LABEL = 16;
const sheet = createCanvas(cols * CELL, rows * (CELL + LABEL));
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#241c3a';
sctx.fillRect(0, 0, sheet.width, sheet.height);
sctx.imageSmoothingEnabled = false;

POSES.forEach((p, i) => {
  // Drop the sprite cache first: two cells whose values round to the same
  // cache key would otherwise show the same picture under different labels.
  sandbox.window.__invalidate();
  const buf = (p.back ? sandbox.window.__drawBack : sandbox.window.__drawBody)(0.25, p.o);
  const cx = (i % cols) * CELL;
  const cy = Math.floor(i / cols) * (CELL + LABEL);
  sctx.drawImage(buf, 0, 0, g.w * g.mult, g.h * g.mult, cx, cy, CELL, CELL);
  sctx.fillStyle = 'rgba(190,180,230,0.9)';
  sctx.font = '11px monospace';
  sctx.textAlign = 'center';
  sctx.fillText(p.name, cx + CELL / 2, cy + CELL + 11);
});

fs.writeFileSync(OUT, sheet.toBuffer('image/png'));
console.log('wrote', OUT, sheet.width + 'x' + sheet.height,
            '| grid', g.w, 'mult', g.mult, '|', POSES.length, 'poses');
