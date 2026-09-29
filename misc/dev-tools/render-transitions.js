// Transition sheet: each option swept through its in-between values, one
// row per option, plus the combinations the cutscene actually produces.
// Endpoints are where a pose gets designed; the odd shapes turn up between
// them, so this is the sheet to check before calling a pose change safe.
//
//   node misc/dev-tools/render-transitions.js
//   OUT=transitions.png CELL=200 RES=3 node misc/dev-tools/render-transitions.js
//
// Needs @napi-rs/canvas:  npm install @napi-rs/canvas --no-save
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const CELL = Number(process.env.CELL || 180);
const OUT = process.env.OUT || 'transitions.png';
const RES = Number(process.env.RES || 3);

const sweep = (key, values, back) => values.map(v => ({ label: key + ' ' + v, back: !!back, o: { [key]: v } }));
const ROWS = [
  sweep('castExt', [0, 0.05, 0.15, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1]),
  sweep('walkStep', [-1, -0.75, -0.5, 0, 0.5, 0.75, 1], true),
  sweep('trail', [-6, -3, 0, 3, 6]).concat(sweep('trail', [-6, 0, 6], true)),
  sweep('droop', [0, 0.25, 0.5, 0.75, 1]),
  sweep('lean', [-6, -3, 0, 3, 6]),
  [
    { label: 'cast .5 trail -1.7', o: { castExt: 0.5, trail: -1.7 } },
    { label: 'cast 1 trail -3.4', o: { castExt: 1, trail: -3.4 } },
    { label: 'droop 1 lean -3', o: { droop: 1, lean: -3 } },
    { label: 'walk 1 trail -3', back: true, o: { walkStep: 1, trail: -3 } },
    { label: 'walk -1 trail 3', back: true, o: { walkStep: -1, trail: 3 } },
  ],
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
      if (kind === 'canvas' && !spriteCanvas) { spriteCanvas = createCanvas(360, 360); return spriteCanvas; }
      if (kind === 'canvas') return createCanvas(8, 8);
      return { setAttribute() {}, addEventListener() {}, play() { return Promise.resolve(); }, pause() {} };
    },
  },
  canvas: { width: 1280, height: 720 },
  ctx: makeStubCtx(),
  _frozenNow: 1000, gamePaused: false,
  _gfxLevel: Number(process.env.GFX || 0),
  _mobPerf: false,
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
  window.__grid = { w: GRID_W, h: GRID_H, get mult() { return RES_MULT; } };`);
vm.runInContext(src, sandbox, { filename: 'kanade-cutscene.js' });
sandbox.window.__setRes(RES);

const g = sandbox.window.__grid;
const cols = Math.max(...ROWS.map(r => r.length));
const LABEL = 14;
const sheet = createCanvas(cols * CELL, ROWS.length * (CELL + LABEL));
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#241c3a';
sctx.fillRect(0, 0, sheet.width, sheet.height);
sctx.imageSmoothingEnabled = false;
ROWS.forEach((row, r) => row.forEach((p, c) => {
  const buf = (p.back ? sandbox.window.__drawBack : sandbox.window.__drawBody)(0.25, p.o);
  const x = c * CELL, y = r * (CELL + LABEL);
  sctx.drawImage(buf, 0, 0, g.w * g.mult, g.h * g.mult, x, y, CELL, CELL);
  sctx.fillStyle = 'rgba(190,180,230,0.9)';
  sctx.font = '10px monospace';
  sctx.textAlign = 'center';
  sctx.fillText((p.back ? 'B ' : '') + p.label, x + CELL / 2, y + CELL + 10);
}));
fs.writeFileSync(OUT, sheet.toBuffer('image/png'));
console.log('wrote', OUT, sheet.width + 'x' + sheet.height, '| mult', g.mult);
