// Hand diagnostic strip: the right hand cropped out of the full sprite at
// each step of the cast, blown up nearest-neighbour, then the left hand at
// rest, then the same poses at the size the game actually shows her. The
// sprite cache is dropped before every pose so no cell can reuse another's
// picture.
//
//   node misc/dev-tools/render-hands.js
//   OUT=hands.png ZOOM=6 RES=3 node misc/dev-tools/render-hands.js
//
// Needs @napi-rs/canvas:  npm install @napi-rs/canvas --no-save
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const OUT = process.env.OUT || 'hands.png';
const ZOOM = Number(process.env.ZOOM || 8);
const RES = Number(process.env.RES || 3);
const STEPS = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
const T = 0.25;                 // bob is +1 unit at this t
const CROP = 18;                // grid units around each hand

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
  window.__drawBody = (t, o) => { invalidateSprite(); drawKanade(t, o); return px; };
  window.__setRes = setSpriteRes;
  window.__castWrist = castWrist;
  window.__grid = { w: GRID_W, get mult() { return RES_MULT; } };`);
vm.runInContext(src, sandbox, { filename: 'kanade-cutscene.js' });
sandbox.window.__setRes(RES);
const W = sandbox.window, g = W.__grid;

// Where to centre the crop: the wrist, dropped with the shoulder and
// bobbed, shifted toward where the fingers point at that stage.
function rightHandCentre(c) {
  const w = W.__castWrist(c, 0);
  return [w[0] + 2.5 + c, w[1] + 1.5 * (1 - c) + 1 + (3.5 - 6.5 * c)];
}

const cell = CROP * ZOOM, LABEL = 14, SMALL = 540;
const cols = STEPS.length + 1;
const sheet = createCanvas(cols * cell, cell + LABEL + SMALL / 3 + LABEL);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#241c3a';
sctx.fillRect(0, 0, sheet.width, sheet.height);
sctx.imageSmoothingEnabled = false;
sctx.font = '11px monospace';
sctx.textAlign = 'center';

const put = (buf, cx, cy, x, y, label) => {
  const m = g.mult;
  sctx.drawImage(buf, (cx - CROP / 2) * m, (cy - CROP / 2) * m, CROP * m, CROP * m, x, y, cell, cell);
  sctx.fillStyle = 'rgba(190,180,230,0.9)';
  sctx.fillText(label, x + cell / 2, y + cell + 11);
};

STEPS.forEach((c, i) => {
  const buf = W.__drawBody(T, { castExt: c });
  const [cx, cy] = rightHandCentre(c);
  put(buf, cx, cy, i * cell, 0, 'R castExt ' + c);
});
put(W.__drawBody(T, {}), 50, 93, STEPS.length * cell, 0, 'L rest');

// The same poses at gameplay size: the sprite drawn at 1080p's 540px and
// shown here at a third of that, each small cell a whole figure.
const y2 = cell + LABEL;
STEPS.concat([0]).forEach((c, i) => {
  const buf = W.__drawBody(T, { castExt: c });
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(buf, 0, 0, g.w * g.mult, g.w * g.mult, i * cell + (cell - SMALL / 3) / 2, y2, SMALL / 3, SMALL / 3);
  sctx.imageSmoothingEnabled = false;
});
fs.writeFileSync(OUT, sheet.toBuffer('image/png'));
console.log('wrote', OUT, sheet.width + 'x' + sheet.height, '| mult', g.mult);
