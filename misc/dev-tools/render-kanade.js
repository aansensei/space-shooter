// Renders Kanade's body sprite straight out of the game's own draw code, so
// changes to it can actually be looked at. The module is an IIFE and keeps
// drawKanade private, so a test hook is appended to the source before it runs
// rather than added to the file that ships.
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const SCALE = Number(process.env.SCALE || 4);
const OUT = process.env.OUT || 'kanade.png';
const BACK = process.env.BACK === '1';
const T = Number(process.env.T || 0.25);
const OPTS = process.env.OPTS ? JSON.parse(process.env.OPTS) : {};

function makeStubCtx() {
  const noop = () => {};
  const c = {
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
  return c;
}

// The sprite buffer the module builds with document.createElement('canvas')
// has to be a real one, since that is the thing being rendered. Everything
// else the module touches can be a stub.
let spriteCanvas = null;
const sandbox = {
  console,
  performance: { now: () => 1000 },
  Math,
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } },
  document: {
    createElement(kind) {
      if (kind === 'canvas' && !spriteCanvas) {
        spriteCanvas = createCanvas(360, 360);
        return spriteCanvas;
      }
      if (kind === 'canvas') return createCanvas(8, 8);
      return { setAttribute() {}, addEventListener() {}, play() { return Promise.resolve(); }, pause() {} };
    },
  },
  canvas: { width: 1280, height: 720 },
  ctx: makeStubCtx(),
  _frozenNow: 1000,
  gamePaused: false,
  _gfxLevel: Number(process.env.GFX || 0),
  _mobPerf: process.env.MOB === '1',
  AudioMgr: { setTimeFrozen() {}, pauseAll() {}, resumeAll() {} },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  TESLA_STACK_MAX: 5,
  enemies: [],
  drawEnemy() {},
  _spawnWaveGoliath() {},
  fetch: undefined,
  Path2D: undefined,
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

// RES pins the supersample, which otherwise sizes itself to the screen.
if (process.env.RES) sandbox.window.__setRes(Number(process.env.RES));
const g = sandbox.window.__grid;

if (process.env.BENCH === '1') {
  // NOCACHE=1 drops the sprite cache before every call, so each one is a
  // real draw rather than a key match.
  const fresh = process.env.NOCACHE === '1' ? sandbox.window.__invalidate : () => {};
  const draw = (t, o) => { fresh(); sandbox.window.__drawBody(t, o); };
  for (let i = 0; i < 40; i++) draw(i / 40, OPTS);       // warm up
  const N = 400;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) draw((i % 60) / 60, OPTS);
  const t1 = process.hrtime.bigint();
  const perFrame = Number(t1 - t0) / 1e6 / N;
  console.log('drawKanade: ' + perFrame.toFixed(3) + ' ms/frame  (' +
              (perFrame / 16.67 * 100).toFixed(1) + '% of a 60fps budget)');
  const back = (t, o) => { fresh(); sandbox.window.__drawBack(t, o); };
  for (let i = 0; i < 20; i++) back(i / 20, OPTS);
  const b0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) back((i % 60) / 60, OPTS);
  const b1 = process.hrtime.bigint();
  console.log('drawKanadeBack: ' + (Number(b1 - b0) / 1e6 / N).toFixed(3) + ' ms/frame');
  process.exit(0);
}
const buf = (BACK ? sandbox.window.__drawBack : sandbox.window.__drawBody)(T, OPTS);

// Blow it up with smoothing off, the same way the game blits it, so what is
// on screen here is what the sprite actually contains.
const out = createCanvas(g.w * SCALE, g.h * SCALE);
const octx = out.getContext('2d');
octx.fillStyle = '#241c3a';
octx.fillRect(0, 0, out.width, out.height);
octx.imageSmoothingEnabled = false;
octx.drawImage(buf, 0, 0, g.w * g.mult, g.h * g.mult, 0, 0, out.width, out.height);
fs.writeFileSync(OUT, out.toBuffer('image/png'));
console.log('wrote', OUT, out.width + 'x' + out.height, '| grid', g.w + 'x' + g.h, 'mult', g.mult);
