// Face diagnostic sheet: expressions, a blink from open to shut and back,
// gaze in seven directions, all cropped to the face and blown up
// nearest-neighbour, then the whole figure at gameplay size in the scenes
// the face acts in. The sprite cache is dropped before every sample.
//
//   node misc/dev-tools/render-face.js
//   OUT=face.png ZOOM=8 RES=3 node misc/dev-tools/render-face.js
//
// Needs @napi-rs/canvas:  npm install @napi-rs/canvas --no-save
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const OUT = process.env.OUT || 'face.png';
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

const FACE = [76, 24, 32, 26];   // x, y, w, h in grid units
const ROWS = [
  ['neutral', 'serene', 'thinking', 'smug', 'happy', 'surprised', 'angry', 'sad', 'pain']
    .map(e => ({ label: e, o: { expression: e } })),
  [0, 0.25, 0.5, 0.75, 1, 0.5, 0].map((b, i) => ({ label: 'blink ' + b + (i === 5 ? ' reopen' : ''), o: { blinkAmount: b } })),
  [['center', 0, 0], ['up', 0, -1], ['up-right', 1, -1], ['right', 1, 0], ['down-right', 1, 1], ['down', 0, 1], ['left', -1, 0]]
    .map(([n, x, y]) => ({ label: 'gaze ' + n, o: { gazeX: x, gazeY: y } })),
];
const SCENES = [
  ['idle', { expression: 'neutral' }],
  ['thinking', { expression: 'serene', headTurn: 0.01 }],
  ['summon', { expression: 'smug', castExt: 0.5, gazeX: 0.42, gazeY: -0.38, headTurn: -0.008 }],
  ['full cast', { expression: 'smug', castExt: 1, gazeX: 0.85, gazeY: -0.75 }],
  ['leave prep', { expression: 'smug', gazeX: 0.9, headTurn: 0.006 }],
];
const cw = FACE[2] * ZOOM, ch = FACE[3] * ZOOM, LABEL = 14, SMALL = 180;
const cols = Math.max(...ROWS.map(r => r.length));
const sheet = createCanvas(cols * cw, ROWS.length * (ch + LABEL) + SMALL + LABEL);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#241c3a';
sctx.fillRect(0, 0, sheet.width, sheet.height);
sctx.font = '11px monospace';
sctx.textAlign = 'center';
ROWS.forEach((row, r) => row.forEach((p, c) => {
  const buf = W.__drawBody(T, p.o);
  const m = g.mult, x = c * cw, y = r * (ch + LABEL);
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(buf, FACE[0] * m, FACE[1] * m, FACE[2] * m, FACE[3] * m, x, y, cw, ch);
  sctx.fillStyle = 'rgba(190,180,230,0.9)';
  sctx.fillText(p.label, x + cw / 2, y + ch + 11);
}));
// Gameplay size: 1080p shows her at 540px; drawn here at a third of that
// would hide the face, so at the 720p size of 360px halved.
const y2 = ROWS.length * (ch + LABEL);
SCENES.forEach(([name, o], i) => {
  const buf = W.__drawBody(T, o);
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(buf, 0, 0, g.w * g.mult, g.w * g.mult, i * (SMALL + 20), y2, SMALL, SMALL);
  sctx.fillStyle = 'rgba(190,180,230,0.9)';
  sctx.fillText(name, i * (SMALL + 20) + SMALL / 2, y2 + SMALL + 11);
});
fs.writeFileSync(OUT, sheet.toBuffer('image/png'));
console.log('wrote', OUT, sheet.width + 'x' + sheet.height, '| mult', g.mult);
