// Renders the debug console's model viewer, so it can be checked without a
// browser. Unlike render_kanade.js this needs a real ctx, since the viewer
// draws its plate, grid and labels straight onto the game canvas.
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const W = 900, H = 700;
const screen = createCanvas(W, H);
const sctx = screen.getContext('2d');
sctx.fillStyle = '#2a1f3f';
sctx.fillRect(0, 0, W, H);

let spriteCanvas = null;
const sandbox = {
  console,
  performance: { now: () => 1000 },
  Math,
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } },
  document: {
    createElement(kind) {
      if (kind === 'canvas' && !spriteCanvas) { spriteCanvas = createCanvas(360, 360); return spriteCanvas; }
      if (kind === 'canvas') return createCanvas(8, 8);
      return { setAttribute() {}, addEventListener() {}, play() { return Promise.resolve(); }, pause() {} };
    },
  },
  canvas: { width: W, height: H },
  ctx: sctx,
  _frozenNow: 1000,
  gamePaused: false,
  _gfxLevel: 0,
  _mobPerf: false,
  AudioMgr: { setTimeFrozen() {}, pauseAll() {}, resumeAll() {} },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  TESLA_STACK_MAX: 5,
  enemies: [],
  drawEnemy() {},
  _spawnWaveGoliath() {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync('js/timeline-distortion.js', 'utf8'), sandbox, { filename: 'td.js' });
vm.runInContext(fs.readFileSync('js/render/kanade-cutscene.js', 'utf8'), sandbox, { filename: 'kc.js' });

sandbox.window._kanadeDebugModel = {
  back: process.env.BACK === '1',
  expression: process.env.EXPR || 'neutral',
  still: process.env.STILL === '1',
  grid: process.env.GRID !== '0',
  blink: false,
  castExt: Number(process.env.CAST || 0),
  trail: 0,
};

if (typeof sandbox.window._kanadeDebugModelDraw !== 'function') {
  throw new Error('_kanadeDebugModelDraw was never exported');
}
sandbox.window._kanadeDebugModelDraw();

const out = process.env.OUT || 'viewer.png';
fs.writeFileSync(out, screen.toBuffer('image/png'));
console.log('wrote', out, W + 'x' + H);
