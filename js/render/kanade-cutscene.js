// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/kanade-cutscene.js — the Timeline Distortion boss-wave cutscene.
// Kanade's pixel art is ported from misc/kanade-boss/kanade_boss_demo.html:
// drawKanade, drawKanadeBack and the reality gate are verbatim apart from the
// block-parry arm pose, which this sequence never uses. Self-contained besides
// core.js — it reads `canvas`, `ctx` and `_frozenNow` and nothing else.
//
// The whole module sits inside one IIFE on purpose: the sprite helpers below
// use short generic names (rect, poly, line, ellipse, PAL) and classic
// <script> tags share one global lexical scope, so at top level any of those
// would be a fatal duplicate-declaration SyntaxError the moment another file
// picks the same name. Only drawKanadeCutscene and _beginKanadeCutscene are
// published on window.
(function () {

  // Kanade is drawn once per frame into her own 180x180 logical buffer, then
  // blitted to the game canvas at whatever size the screen calls for.
  // RES_MULT only supersamples that buffer so curves antialias properly — the
  // sprite coordinates below stay in plain 180x180 units.
  const GRID_W = 180, GRID_H = 180;
  const RES_MULT = 2;
  const px = document.createElement('canvas');
  px.width = GRID_W * RES_MULT; px.height = GRID_H * RES_MULT;
  const pctx = px.getContext('2d');
  pctx.imageSmoothingEnabled = false;
  pctx.scale(RES_MULT, RES_MULT);

  const _tdBannerImg = new Image();
  _tdBannerImg.src = 'assets/images/game/effects/timeline-distortion-banner.png';
  const _tdPlayerIconImg = new Image();
  _tdPlayerIconImg.src = 'assets/images/game/icons/timeline-distortion-player.png';
  const _tdEnemyIconImg = new Image();
  _tdEnemyIconImg.src = 'assets/images/game/icons/timeline-distortion-enemy.png';
  const _kanadeHaloImg = new Image();
  _kanadeHaloImg.src = 'assets/images/game/effects/kanade-halo.png';
  const PAL = {
    hairShadow: '#6b6690', hairDeep: '#4a4570', hairMid: '#9f9cc4', hairLight: '#e7e5f5', hairHi: '#fffdf8',
    skin: '#ffe3d4', skinShadow: '#e3ac9d', blush: '#f5b7c2',
    eyeDeep: '#244f9d', eyeBlue: '#4f8fe0', eyeLight: '#8ed6ff', eyeHi: '#ffffff', lid: '#332b55',
    creamShadow: '#b8b2ca', creamMid: '#e9e5ea', cream: '#fffaf0',
    indigoDeep: '#110f24', indigo: '#292552', indigoMid: '#403a78', indigoHi: '#665ba1',
    goldDark: '#9b7131', gold: '#d8b35a', goldHi: '#fff0a3',
    bootDeep: '#15142a', boot: '#292647', bootHi: '#ece7ef',
    outline: '#231f38',
  };

  function rect(x, y, w, h, c) { pctx.fillStyle = c; pctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function poly(points, c) {
    pctx.fillStyle = c;
    pctx.beginPath();
    pctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
    for (let i = 1; i < points.length; i++) pctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
    pctx.closePath();
    pctx.fill();
  }
  function ellipse(x, y, rx, ry, c) {
    pctx.fillStyle = c;
    pctx.beginPath();
    pctx.ellipse(Math.round(x), Math.round(y), Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry)), 0, 0, Math.PI * 2);
    pctx.fill();
  }
  function line(points, c, width) {
    pctx.strokeStyle = c;
    pctx.lineWidth = width;
    pctx.lineCap = 'round';
    pctx.lineJoin = 'round';
    pctx.beginPath();
    pctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) pctx.lineTo(points[i][0], points[i][1]);
    pctx.stroke();
  }
  function bezierLine(start, segments, c, width) {
    pctx.strokeStyle = c;
    pctx.lineWidth = width;
    pctx.lineCap = 'round';
    pctx.lineJoin = 'round';
    pctx.beginPath();
    pctx.moveTo(start[0], start[1]);
    segments.forEach(s => pctx.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]));
    pctx.stroke();
  }
  function bezierShape(start, segments, c) {
    pctx.fillStyle = c;
    pctx.beginPath();
    pctx.moveTo(start[0], start[1]);
    segments.forEach(s => pctx.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]));
    pctx.closePath();
    pctx.fill();
  }
  function sparkle(x, y, size, c) {
    poly([[x, y - size], [x + 1, y - 1], [x + size, y], [x + 1, y + 1], [x, y + size], [x - 1, y + 1], [x - size, y], [x - 1, y - 1]], c);
  }
  // Simple, small, perfectly symmetric stylized eye (blue), reused for both
  // sides from the same shape so they can never end up mismatched in size.
  // `mode` picks which expression variant to draw; 'blink' is the transient
  // auto-blink override and wins over any open-eye mode passed alongside it.
  function drawSimpleEye(cx, cy, mode) {
    mode = mode || 'open';
    if (mode === 'blink') {
      bezierLine([cx - 2, cy], [[cx - 0.8, cy + 0.6, cx + 0.8, cy + 0.6, cx + 2, cy]], PAL.lid, 1);
      return;
    }
    if (mode === 'happy') {
      bezierLine([cx - 2, cy + 0.3], [[cx - 0.8, cy - 1.3, cx + 0.8, cy - 1.3, cx + 2, cy + 0.3]], PAL.lid, 1.1);
      return;
    }
    if (mode === 'shut') {
      bezierLine([cx - 2, cy], [[cx - 0.6, cy + 1, cx + 0.6, cy + 1, cx + 2, cy]], PAL.lid, 1.3);
      line([[cx - 1.4, cy - 1.6], [cx + 1.4, cy - 1.6]], PAL.skinShadow, 0.5);
      return;
    }
    if (mode === 'soft') {
      bezierLine([cx - 2, cy + 0.2], [[cx - 0.9, cy + 0.7, cx + 0.9, cy + 0.7, cx + 2, cy + 0.2]], PAL.lid, 0.9);
      return;
    }
    const wide = mode === 'wide';
    const narrow = mode === 'narrow';
    const rx = wide ? 2.3 : 1.8;
    const ry = narrow ? 1.1 : (wide ? 2.3 : 1.8);
    const irisRx = wide ? 1.6 : 1.3, irisRy = wide ? 1.5 : 1.2;
    const upShift = mode === 'up' ? 0.5 : 0;
    ellipse(cx, cy - upShift, rx, ry, PAL.eyeDeep);
    ellipse(cx, cy + 0.5 - upShift, irisRx, irisRy, PAL.eyeBlue);
    rect(cx - 0.5, cy - 0.8 - upShift, 0.8, 0.8, PAL.eyeHi);
    if (mode === 'droop') {
      bezierLine([cx - 2.2, cy - 1.2], [[cx, cy - 1.4, cx + 1.2, cy - 0.7, cx + 2.3, cy + 0.4]], PAL.hairDeep, 0.8);
    } else {
      bezierLine([cx - 2.2, cy - 1.5 - upShift], [[cx, cy - 2 - upShift, cx + 1.2, cy - 1 - upShift, cx + 2.5, cy - 0.2 - upShift]], PAL.hairDeep, 0.8);
    }
  }
  // Eyebrows are one straight stroke defined once for the left side and
  // mirrored across the face's x=92 centerline for the right, so the two
  // brows can never end up asymmetric.
  const BROW_SHAPES = {
    flat: [85, 34.5, 89, 34],
    raised: [85, 32.8, 89, 32.3],
    down: [85, 35.4, 89, 35],
    angryIn: [85, 33, 89, 36],
    sadIn: [85, 35.5, 89, 32.5],
  };
  function drawBrow(shape, mirror) {
    const b = BROW_SHAPES[shape] || BROW_SHAPES.flat;
    const x1 = mirror ? 184 - b[0] : b[0];
    const x2 = mirror ? 184 - b[2] : b[2];
    line([[x1, b[1]], [x2, b[3]]], PAL.hairDeep, 1);
  }
  function drawMouth(style) {
    const c = '#a85f78';
    if (style === 'flat') { line([[90.5, 45.3], [93.5, 45.3]], c, 1); return; }
    if (style === 'smile') { bezierLine([89.5, 44.7], [[91, 46.3, 93, 46.3, 94.5, 44.7]], c, 1.1); return; }
    if (style === 'smirk') { bezierLine([90.5, 45.2], [[91.5, 46, 93, 45.8, 94.5, 44]], c, 1.1); return; }
    if (style === 'frown') { bezierLine([90, 45.7], [[91, 44, 93, 44, 94, 45.7]], c, 1); return; }
    if (style === 'open') { ellipse(92, 45.4, 1.2, 1.6, PAL.indigoDeep); return; }
    if (style === 'tense') { line([[89.8, 45.4], [92, 44.9], [94.2, 45.4]], c, 1.2); return; }
    if (style === 'soft') { bezierLine([90.7, 44.9], [[91.6, 45.9, 92.4, 45.9, 93.3, 44.9]], c, 0.9); return; }
    bezierLine([90.5, 45], [[91.5, 46, 92.5, 46, 93.5, 45]], c, 1);
  }

  const EXPRESSIONS = {
    neutral: { brow: 'flat', eye: 'open', mouth: 'neutral' },
    determined: { brow: 'down', eye: 'narrow', mouth: 'flat' },
    smug: { brow: 'flat', eye: 'narrow', mouth: 'smirk' },
    happy: { brow: 'raised', eye: 'happy', mouth: 'smile' },
    surprised: { brow: 'raised', eye: 'wide', mouth: 'open' },
    angry: { brow: 'angryIn', eye: 'narrow', mouth: 'frown' },
    sad: { brow: 'sadIn', eye: 'droop', mouth: 'frown' },
    pain: { brow: 'angryIn', eye: 'shut', mouth: 'tense' },
    thinking: { brow: 'raised', eye: 'up', mouth: 'flat' },
    serene: { brow: 'flat', eye: 'soft', mouth: 'soft' },
  };
  const OPEN_EYE_FAMILY = { open: 1, wide: 1, narrow: 1, up: 1, droop: 1 };
  function drawKanade(t, opts) {
    opts = opts || {};
    const sway = Math.sin(t * Math.PI * 2) * (opts.swayAmp != null ? opts.swayAmp : 1.5);
    const bob = Math.sin(t * Math.PI * 2) * (opts.bobAmp != null ? opts.bobAmp : 1);
    const lean = opts.lean || 0;
    const castExt = opts.castExt || 0;
    const trail = opts.trail || 0;
    const whip = opts.whip || 0;
    const droop = opts.droop || 0;
    const walkStep = opts.walkStep || 0;
    const fabricTrail = trail * 0.75 + whip;

    pctx.clearRect(0, 0, GRID_W, GRID_H);
    pctx.save();
    pctx.translate(lean, bob);

    bezierShape([79, 17], [
      [67, 21, 61, 39, 61 + trail * 0.08, 68],
      [61 + trail * 0.2, 98, 60 + trail * 0.5, 128 + droop * 8, 54 + trail * 0.7, 146 + droop * 7],
      [59 + trail * 0.65, 153 + droop * 5, 66 + trail * 0.45, 151 + droop * 5, 71 + trail * 0.35, 138 + droop * 7],
      [73 + trail * 0.25, 149 + droop * 6, 80 + trail * 0.15, 154 + droop * 4, 84, 139 + droop * 6],
      [88, 151 + droop * 5, 94, 153 + droop * 4, 98, 137 + droop * 6],
      [104 + trail * 0.15, 151 + droop * 5, 112 + trail * 0.35, 151 + droop * 5, 116 + trail * 0.6, 139 + droop * 7],
      [122 + trail * 0.7, 124 + droop * 8, 121 + trail * 0.2, 78, 119, 57],
      [116, 31, 108, 18, 99, 16],
      [92, 12, 85, 13, 79, 17]
    ], PAL.hairMid);

    bezierShape([78, 24], [
      [68, 35, 65, 66, 66 + trail * 0.15, 96],
      [65 + trail * 0.35, 119, 61 + trail * 0.6, 138 + droop * 7, 55 + trail * 0.7, 146 + droop * 7],
      [61 + trail * 0.55, 149 + droop * 5, 68 + trail * 0.35, 139 + droop * 6, 72, 121],
      [74, 87, 75, 48, 78, 24]
    ], PAL.hairShadow);
    bezierShape([103, 20], [
      [112, 31, 116, 58, 115 + trail * 0.12, 88],
      [116 + trail * 0.35, 116, 116 + trail * 0.62, 135 + droop * 7, 112 + trail * 0.7, 148 + droop * 6],
      [107 + trail * 0.5, 150 + droop * 5, 102 + trail * 0.3, 140 + droop * 6, 100, 123],
      [101, 87, 100, 43, 103, 20]
    ], PAL.hairDeep);
    // Dark outline along the outer edge of each side-hair strand only -
    // this is exactly where hair drapes right next to the sleeve fabric
    // and the two were blending into one shape with no separating line.
    bezierLine([78, 24], [
      [68, 35, 65, 66, 66 + trail * 0.15, 96],
      [65 + trail * 0.35, 119, 61 + trail * 0.6, 138 + droop * 7, 55 + trail * 0.7, 146 + droop * 7]
    ], PAL.outline, 0.8);
    bezierLine([103, 20], [
      [112, 31, 116, 58, 115 + trail * 0.12, 88],
      [116 + trail * 0.35, 116, 116 + trail * 0.62, 135 + droop * 7, 112 + trail * 0.7, 148 + droop * 6]
    ], PAL.outline, 0.8);
    bezierShape([84, 20], [
      [78, 38, 77, 72, 78 + trail * 0.1, 101],
      [78 + trail * 0.35, 121, 76 + trail * 0.52, 136 + droop * 6, 72 + trail * 0.6, 143 + droop * 6],
      [78 + trail * 0.4, 141 + droop * 4, 83 + trail * 0.2, 124 + droop * 5, 84, 101],
      [86, 70, 87, 39, 84, 20]
    ], PAL.hairLight);
    bezierShape([94, 18], [
      [99, 37, 101, 67, 101 + trail * 0.08, 96],
      [102 + trail * 0.3, 119, 105 + trail * 0.5, 134 + droop * 6, 109 + trail * 0.58, 143 + droop * 6],
      [103 + trail * 0.38, 140 + droop * 4, 97 + trail * 0.18, 124 + droop * 5, 96, 101],
      [93, 67, 91, 35, 94, 18]
    ], PAL.hairLight);
    bezierLine([70, 35], [[68, 64, 70 + trail * 0.2, 101, 64 + trail * 0.55, 136 + droop * 6]], PAL.hairDeep, 1.5);
    bezierLine([81, 26], [[80, 54, 82 + trail * 0.12, 91, 78 + trail * 0.42, 128 + droop * 5]], PAL.hairHi, 2);
    bezierLine([108, 28], [[111, 56, 109 + trail * 0.15, 92, 113 + trail * 0.48, 132 + droop * 5]], PAL.hairShadow, 1.5);

    poly([[63 + fabricTrail * 0.15, 72], [48 + fabricTrail * 0.45, 89], [31 + fabricTrail, 119 + droop * 13], [45 + fabricTrail, 116 + droop * 14], [34 + fabricTrail * 1.1, 143 + droop * 8], [61 + fabricTrail * 0.45, 132 + droop * 10], [78, 91]], PAL.indigoDeep);
    poly([[117 + fabricTrail * 0.15, 72], [132 + fabricTrail * 0.45, 90], [151 + fabricTrail, 120 + droop * 13], [135 + fabricTrail, 116 + droop * 14], [148 + fabricTrail * 1.1, 144 + droop * 8], [119 + fabricTrail * 0.45, 132 + droop * 10], [102, 91]], PAL.indigo);

    if (Math.abs(walkStep) > 0.04) {
      const backFoot = walkStep * 4;
      poly([[82, 105], [88, 105], [88 - backFoot * 0.25, 143], [85 - backFoot, 158], [79 - backFoot, 157], [81 - backFoot * 0.4, 132]], PAL.skinShadow);
      poly([[80 - backFoot, 139], [88 - backFoot * 0.4, 140], [88 - backFoot, 160], [81 - backFoot, 164], [76 - backFoot, 160]], PAL.bootDeep);
      poly([[78 - backFoot, 159], [90 - backFoot, 159], [91 - backFoot, 163], [83 - backFoot, 166], [77 - backFoot, 163]], PAL.boot);
    }
    poly([[86, 92], [95, 92], [100, 126], [97, 151], [89, 151], [86, 124]], PAL.skin);
    line([[86, 92], [95, 92], [100, 126], [97, 151], [89, 151]], PAL.outline, 0.7);
    // Soft contact shadow where the gown hem falls across the leg, so the
    // leg reads as clearly in front of/below the robe instead of the two
    // silhouettes just merging together at that overlap.
    bezierLine([87, 123], [[91, 126, 95, 126, 99, 123]], PAL.skinShadow, 1.5);
    // Knee crease further down, splitting the leg into a clear thigh/calf
    // read instead of one straight undifferentiated column, plus a soft
    // shin-side shadow suggesting the calf's own curve and a slight
    // weight-bearing bend rather than a perfectly rigid standing pole.
    bezierLine([90, 134], [[93, 136, 96, 136, 98, 134]], PAL.skinShadow, 1);
    bezierLine([98, 127], [[97, 136, 96, 144, 95.5, 150]], PAL.skinShadow, 1);
    poly([[94, 124], [102, 126], [103, 159], [96, 164], [89, 159], [90, 142]], PAL.bootDeep);
    poly([[95, 127], [100, 128], [99, 157], [95, 159], [92, 156], [93, 140]], PAL.bootHi);
    poly([[90, 158], [104, 158], [105, 163], [99, 166], [91, 163]], PAL.boot);
    ellipse(96, 151, 4, 3, PAL.gold);
    ellipse(96, 151, 2, 2, PAL.bootDeep);
    rect(94, 129, 1, 26, PAL.goldDark);
    rect(98, 130, 1, 24, PAL.bootHi);

    poly([[78, 75], [68, 86], [58 + fabricTrail * 0.15, 112], [52 + fabricTrail * 0.45, 142], [74 + fabricTrail * 0.15, 151], [89, 142], [94, 96]], PAL.creamShadow);
    poly([[102, 74], [114, 86], [124 + fabricTrail * 0.15, 113], [132 + fabricTrail * 0.45, 146], [108 + fabricTrail * 0.15, 154], [92, 142], [87, 96]], PAL.creamMid);
    // Outline along the widest outer edge of the gown's lower front panels
    // so the robe reads as one clear silhouette instead of merging into
    // whatever sits behind/beside it.
    line([[78, 75], [68, 86], [58 + fabricTrail * 0.15, 112], [52 + fabricTrail * 0.45, 142], [74 + fabricTrail * 0.15, 151]], PAL.outline, 0.8);
    line([[102, 74], [114, 86], [124 + fabricTrail * 0.15, 113], [132 + fabricTrail * 0.45, 146], [108 + fabricTrail * 0.15, 154]], PAL.outline, 0.8);
    poly([[86, 78], [75, 91], [67 + fabricTrail * 0.1, 118], [63 + fabricTrail * 0.35, 148], [86, 145], [92, 126], [94, 87]], PAL.cream);
    poly([[94, 79], [107, 92], [116 + fabricTrail * 0.1, 121], [123 + fabricTrail * 0.35, 150], [101, 147], [93, 126], [87, 88]], PAL.indigoMid);
    poly([[91, 91], [100, 105], [103, 133], [100, 151], [92, 145], [87, 126]], PAL.indigoDeep);
    poly([[92, 103], [98, 116], [96, 142], [90, 143], [87, 126]], PAL.skin);

    poly([[77, 49], [86, 45], [101, 47], [109, 53], [104, 73], [98, 84], [82, 83], [75, 72]], PAL.cream);
    poly([[76, 49], [84, 48], [88, 79], [80, 82], [74, 69]], PAL.indigoMid);
    poly([[91, 47], [105, 50], [103, 57], [92, 55]], PAL.creamShadow);
    poly([[88, 54], [96, 55], [102, 82], [92, 88], [83, 82]], PAL.indigoDeep);

    bezierShape([76, 52], [
      [68, 49, 61, 54, 58 + fabricTrail * 0.15, 64],
      [52 + fabricTrail * 0.35, 76, 42 + fabricTrail * 0.75, 87, 33 + fabricTrail, 92],
      [31 + fabricTrail, 98, 39 + fabricTrail * 0.9, 105, 47 + fabricTrail * 0.7, 101],
      [55 + fabricTrail * 0.45, 97, 61, 91, 66, 104],
      [72, 99, 77, 85, 76, 52]
    ], PAL.creamMid);
    // Outline along the sleeve's own outer edge - same fix as the hair,
    // this is the other side of the "can't tell hair from sleeve" boundary.
    bezierLine([76, 52], [
      [68, 49, 61, 54, 58 + fabricTrail * 0.15, 64],
      [52 + fabricTrail * 0.35, 76, 42 + fabricTrail * 0.75, 87, 33 + fabricTrail, 92]
    ], PAL.outline, 0.8);
    bezierLine([72, 54], [[64, 56, 58 + fabricTrail * 0.2, 69, 51 + fabricTrail * 0.45, 82]], PAL.cream, 3);
    bezierLine([63, 92], [[55 + fabricTrail * 0.35, 96, 47 + fabricTrail * 0.6, 99, 40 + fabricTrail * 0.8, 96]], PAL.creamShadow, 2);
    bezierShape([66, 71], [
      [57 + fabricTrail * 0.25, 79, 45 + fabricTrail * 0.65, 88, 36 + fabricTrail, 94],
      [42 + fabricTrail * 0.85, 99, 54 + fabricTrail * 0.5, 92, 64, 84],
      [66, 79, 67, 75, 66, 71]
    ], PAL.indigo);
    // Upper arm + forearm as two segments meeting at a real elbow bend
    // (same technique the block/cast poses already use), instead of one
    // smooth curve with no visible joint reaching too far down.
    bezierLine([74, 53], [[69, 58, 64, 64, 62 + fabricTrail * 0.15, 70]], PAL.skin, 5.5);
    bezierLine([62 + fabricTrail * 0.15, 70], [[58 + fabricTrail * 0.3, 78, 53 + fabricTrail * 0.42, 85, 49 + fabricTrail * 0.5, 90]], PAL.skin, 4);
    bezierLine([72, 56], [[66, 62, 60 + fabricTrail * 0.2, 74, 51 + fabricTrail * 0.45, 91]], PAL.skinShadow, 1.2);
    // Wrist crease marks where the forearm actually ends, then the palm,
    // then 3 short separated finger lines instead of one undifferentiated
    // bright blob - gives the hand real structure at a glance.
    line([[46 + fabricTrail * 0.5, 88.5], [50 + fabricTrail * 0.5, 89]], PAL.skinShadow, 0.6);
    ellipse(48 + fabricTrail * 0.5, 90, 2.4, 3.6, PAL.skin);
    line([[46.5 + fabricTrail * 0.5, 92], [45.5 + fabricTrail * 0.55, 94.5]], PAL.skin, 0.9);
    line([[48 + fabricTrail * 0.5, 93], [47.5 + fabricTrail * 0.55, 96]], PAL.skin, 0.9);
    line([[49.5 + fabricTrail * 0.5, 92.5], [49.5 + fabricTrail * 0.55, 95]], PAL.skin, 0.9);
    line([[46, 92.5], [48, 93.5]], PAL.skinShadow, 0.5);
    line([[47.5, 93.5], [49, 94.5]], PAL.skinShadow, 0.5);

    // Small shoulder-socket shading where each arm actually meets the
    // torso, so the join reads clearly instead of the arm just vanishing
    // into the hair/collar/sleeve with no visible anchor point.
    ellipse(75, 53, 2.2, 1.6, PAL.skinShadow);
    ellipse(105, 54, 2.2, 1.6, PAL.skinShadow);

    if (castExt > 0) {
      const handX = 118 + castExt * 21;
      const handY = 75 - castExt * 37;
      const elbowX = 115 + castExt * 10;
      const elbowY = 62 - castExt * 20;
      bezierLine([106, 54], [[112, 52, 116 + castExt * 5, 54 - castExt * 11, elbowX, elbowY]], PAL.creamMid, 13);
      bezierLine([106, 51], [[113, 49, 117 + castExt * 5, 51 - castExt * 11, elbowX, elbowY - 2]], PAL.cream, 3);
      bezierLine([108, 58], [[113, 57, 117 + castExt * 5, 57 - castExt * 10, elbowX, elbowY + 2]], PAL.indigoMid, 4);
      bezierLine([elbowX, elbowY], [[130 + castExt * 3, 48 - castExt * 9, handX - 3, handY + 2, handX, handY + 2]], PAL.skin, 4.5);
      bezierLine([elbowX, elbowY + 1], [[130 + castExt * 3, 50 - castExt * 9, handX - 3, handY + 4, handX, handY + 3]], PAL.skinShadow, 1.2);
      // Same wrist-crease + palm + 3-finger structure the resting hands use
      // (was 3 bare finger lines with no crease/shading, reading as fewer
      // fingers than the other hand right next to it).
      line([[handX - 1, handY + 3.5], [handX + 3, handY + 4]], PAL.skinShadow, 0.6);
      ellipse(handX + 2, handY + 2, 3, 4, PAL.skin);
      line([[handX + 3, handY - 1], [handX + 8, handY - 4]], PAL.skin, 1.2);
      line([[handX + 4, handY], [handX + 9, handY - 1]], PAL.skin, 1.2);
      line([[handX + 4, handY + 1], [handX + 8, handY + 2]], PAL.skin, 1.2);
      // Short diagonal webbing creases right at the finger bases, not long
      // parallel strokes - those read as a 4th/5th finger at this scale.
      line([[handX + 3.3, handY - 0.7], [handX + 4.2, handY - 0.3]], PAL.skinShadow, 0.5);
      line([[handX + 4.1, handY + 0.3], [handX + 4.6, handY + 0.8]], PAL.skinShadow, 0.5);
    } else {
      bezierShape([104, 52], [
        [113, 49, 121, 55, 124 + fabricTrail * 0.15, 65],
        [130 + fabricTrail * 0.35, 76, 140 + fabricTrail * 0.7, 87, 149 + fabricTrail, 92],
        [152 + fabricTrail, 99, 143 + fabricTrail * 0.9, 106, 135 + fabricTrail * 0.7, 102],
        [127 + fabricTrail * 0.45, 97, 120, 91, 115, 104],
        [109, 98, 104, 84, 104, 52]
      ], PAL.creamMid);
      bezierLine([104, 52], [
        [113, 49, 121, 55, 124 + fabricTrail * 0.15, 65],
        [130 + fabricTrail * 0.35, 76, 140 + fabricTrail * 0.7, 87, 149 + fabricTrail, 92]
      ], PAL.outline, 0.8);
      bezierLine([108, 54], [[116, 56, 124 + fabricTrail * 0.2, 69, 131 + fabricTrail * 0.45, 82]], PAL.cream, 3);
      bezierLine([118, 93], [[126 + fabricTrail * 0.35, 97, 135 + fabricTrail * 0.6, 100, 143 + fabricTrail * 0.8, 96]], PAL.creamShadow, 2);
      bezierShape([115, 72], [
        [125 + fabricTrail * 0.25, 80, 137 + fabricTrail * 0.65, 89, 146 + fabricTrail, 95],
        [140 + fabricTrail * 0.85, 101, 128 + fabricTrail * 0.5, 93, 117, 85],
        [115, 80, 114, 76, 115, 72]
      ], PAL.indigo);
      // Upper arm + forearm as two segments meeting at a real elbow bend,
      // mirroring the left arm's fix above - elbow bent a bit more and the
      // hand held a bit higher/closer-in than the left arm on purpose, so
      // the pose doesn't read as a perfectly mirrored mannequin stance.
      bezierLine([106, 54], [[111, 59, 116, 65, 119 + fabricTrail * 0.15, 73]], PAL.skin, 5.5);
      bezierLine([119 + fabricTrail * 0.15, 73], [[122 + fabricTrail * 0.25, 79, 125 + fabricTrail * 0.32, 84, 128 + fabricTrail * 0.35, 88]], PAL.skin, 4);
      bezierLine([108, 57], [[114, 65, 118 + fabricTrail * 0.2, 78, 127 + fabricTrail * 0.33, 89]], PAL.skinShadow, 1.2);
      line([[127 + fabricTrail * 0.35, 86.5], [131 + fabricTrail * 0.35, 87]], PAL.skinShadow, 0.6);
      ellipse(129 + fabricTrail * 0.35, 88, 2.4, 3.6, PAL.skin);
      line([[127.5 + fabricTrail * 0.35, 90], [126.5 + fabricTrail * 0.4, 92.5]], PAL.skin, 0.9);
      line([[129 + fabricTrail * 0.35, 91], [128.5 + fabricTrail * 0.4, 94]], PAL.skin, 0.9);
      line([[130.5 + fabricTrail * 0.35, 90.5], [130.5 + fabricTrail * 0.4, 93]], PAL.skin, 0.9);
      line([[127, 90.5], [129, 91.5]], PAL.skinShadow, 0.5);
      line([[128.5, 91.5], [130, 92.5]], PAL.skinShadow, 0.5);
    }

    line([[70, 89], [65 + fabricTrail * 0.1, 116], [62 + fabricTrail * 0.3, 142]], PAL.creamShadow, 1.5);
    line([[109, 91], [116 + fabricTrail * 0.1, 117], [123 + fabricTrail * 0.3, 144]], PAL.cream, 1.5);
    line([[82, 91], [77, 113], [73, 143]], PAL.hairHi, 1);
    line([[102, 91], [110, 115], [117, 145]], PAL.indigoHi, 1.5);
    line([[88, 58], [91, 74], [91, 101], [94, 128]], PAL.gold, 1);
    line([[95, 57], [94, 77], [96, 94], [95, 118], [98, 141]], PAL.goldDark, 1);
    ellipse(92, 72, 3, 3, PAL.gold);
    ellipse(92, 72, 1, 1, PAL.indigoDeep);
    ellipse(96, 105, 3, 3, PAL.gold);
    ellipse(96, 105, 1, 1, PAL.indigoDeep);
    sparkle(91, 91, 3, PAL.goldHi);
    sparkle(99, 128, 3, PAL.gold);
    sparkle(73, 119, 2, PAL.goldHi);
    sparkle(116, 133, 2, PAL.goldHi);
    sparkle(52 + fabricTrail * 0.5, 87, 2, PAL.gold);
    sparkle(132 + fabricTrail * 0.5, 88, 2, PAL.gold);
    rect(45 + fabricTrail * 0.8, 96, 1, 1, PAL.goldHi);
    rect(137 + fabricTrail * 0.8, 97, 1, 1, PAL.goldHi);
    rect(64, 130, 1, 1, PAL.goldHi);
    rect(111, 120, 1, 1, PAL.goldHi);

    poly([[86, 42], [96, 42], [98, 57], [91, 61], [84, 56]], PAL.skin);
    poly([[94, 44], [98, 48], [97, 57], [93, 58]], PAL.skinShadow);
    bezierShape([76, 50], [
      [80, 48, 84, 47, 88, 48],
      [91, 51, 91, 56, 88, 60],
      [82, 59, 76, 57, 71, 56],
      [72, 53, 74, 51, 76, 50]
    ], PAL.skin);
    bezierLine([72, 57], [[79, 59, 84, 60, 89, 57]], PAL.indigoDeep, 3);
    bezierShape([92, 48], [
      [99, 46, 108, 49, 114, 56],
      [116, 60, 112, 65, 107, 66],
      [102, 61, 98, 56, 92, 54],
      [91, 52, 91, 50, 92, 48]
    ], PAL.indigoMid);
    bezierLine([94, 48], [[101, 48, 107, 51, 112, 57]], PAL.cream, 2);
    bezierLine([85, 52], [[89, 54, 94, 54, 98, 51]], PAL.gold, 1.5);
    sparkle(91, 55, 2, PAL.goldHi);
    rect(91, 56, 1, 2, PAL.eyeBlue);

    poly([[85, 42], [99, 42], [95, 52], [89, 52]], PAL.skinShadow);
    bezierShape([81, 32], [
      [81, 42, 86, 46, 92, 47],
      [98, 46, 103, 42, 103, 32],
      [103, 20, 81, 20, 81, 32]
    ], PAL.skin);
    // Soft warm rim along the jaw/cheek edge so the face separates from the
    // similarly pale hair/gown around it instead of blending into a flat
    // bright mass - the face is meant to be the first thing the eye lands on.
    bezierLine([81, 32], [
      [81, 42, 86, 46, 92, 47],
      [98, 46, 103, 42, 103, 32]
    ], PAL.skinShadow, 0.6);
    const expr = EXPRESSIONS[opts.expression] || EXPRESSIONS.neutral;
    const eyeMode = (opts.blink && OPEN_EYE_FAMILY[expr.eye]) ? 'blink' : expr.eye;
    drawBrow(expr.brow, false);
    drawBrow(expr.brow, true);
    drawSimpleEye(88, 38, eyeMode);
    drawSimpleEye(96, 38, eyeMode);
    line([[92, 41.5], [92, 42.5]], PAL.skinShadow, 0.9);
    drawMouth(expr.mouth);
    ellipse(83.5, 41, 2, 1.2, PAL.blush);
    ellipse(100.5, 41, 2, 1.2, PAL.blush);

    bezierShape([82, 18], [[75, 23, 75, 46, 75 + sway * 0.4, 68], [80, 50, 83, 28, 84, 18]], PAL.hairLight);
    bezierShape([102, 18], [[109, 23, 109, 46, 109 + sway * 0.4, 68], [104, 50, 101, 28, 100, 18]], PAL.hairMid);

    // Crown drawn first in a light tone so it blends with the bangs sitting
    // on top of it, instead of reading as a separate dark "cap".
    bezierShape([75, 34], [
      [73, 10, 111, 10, 109, 34],
      [100, 18, 84, 18, 75, 34]
    ], PAL.hairLight);
    bezierShape([75, 34], [[74, 20, 80, 16, 82, 14], [80, 26, 78, 32, 75, 34]], PAL.hairMid);
    bezierShape([109, 34], [[110, 20, 104, 16, 102, 14], [104, 26, 106, 32, 109, 34]], PAL.hairMid);

    // Bangs, roots widened to y=11 (near the crown's own peak) so the three
    // locks fan out and overlap instead of leaving forehead gaps between
    // them - a fuller, denser M-shape instead of three thin separate locks.
    bezierShape([82, 11], [[86, 28, 88, 38, 89, 41], [91, 35, 93, 25, 92, 16]], PAL.hairHi);
    bezierShape([102, 11], [[98, 28, 96, 38, 95, 41], [93, 35, 91, 25, 92, 16]], PAL.hairLight);
    bezierShape([92, 11], [[90, 25, 91, 35, 92, 38], [94, 35, 94, 25, 92, 11]], PAL.hairHi);

    // Extra fine strand lines within the bangs for a bit more detail/volume.
    bezierLine([86, 16], [[87, 26, 88.5, 34, 89, 40]], PAL.hairShadow, 0.4);
    bezierLine([98, 16], [[97, 26, 95.5, 34, 95, 40]], PAL.hairShadow, 0.4);

    bezierLine([79, 14], [[85, 11, 99, 11, 105, 14]], PAL.hairHi, 1.5);

    pctx.restore();
  }
  function drawKanadeBack(t, opts) {
    opts = opts || {};
    const sway = Math.sin(t * Math.PI * 2) * (opts.swayAmp != null ? opts.swayAmp : 1.5);
    const bob = Math.sin(t * Math.PI * 2) * (opts.bobAmp != null ? opts.bobAmp : 1);
    const lean = opts.lean || 0;
    const trail = opts.trail || 0;
    const whip = opts.whip || 0;
    const walkStep = opts.walkStep || 0;
    const fabricTrail = trail * 0.75 + whip;
    const armSwing = walkStep * 2.2;

    pctx.clearRect(0, 0, GRID_W, GRID_H);
    pctx.save();
    pctx.translate(lean, bob);

    const backFoot = walkStep * 4;
    poly([[80, 124], [88, 124], [88 - backFoot * 0.2, 157], [80 - backFoot, 162], [76 - backFoot, 159], [79, 140]], PAL.bootDeep);
    poly([[92, 123], [100, 123], [102 + backFoot * 0.2, 158], [98 + backFoot, 164], [90 + backFoot, 161], [92, 139]], PAL.boot);
    poly([[76 - backFoot, 158], [89 - backFoot, 158], [90 - backFoot, 162], [82 - backFoot, 165], [76 - backFoot, 162]], PAL.boot);
    poly([[89 + backFoot, 159], [103 + backFoot, 159], [104 + backFoot, 163], [98 + backFoot, 166], [90 + backFoot, 163]], PAL.bootDeep);
    rect(82 - backFoot, 133, 1, 25, PAL.bootHi);
    rect(97 + backFoot, 132, 1, 27, PAL.goldDark);
    ellipse(97 + backFoot, 151, 3, 3, PAL.gold);

    bezierShape([79, 63], [
      [69, 72, 62 + fabricTrail * 0.12, 98, 55 + fabricTrail * 0.35, 144],
      [64 + fabricTrail * 0.25, 151, 75 + fabricTrail * 0.12, 154, 88, 147],
      [92, 140, 92, 100, 89, 67]
    ], PAL.creamShadow);
    bezierShape([101, 63], [
      [112, 73, 120 + fabricTrail * 0.12, 101, 128 + fabricTrail * 0.35, 147],
      [117 + fabricTrail * 0.25, 154, 104 + fabricTrail * 0.12, 155, 91, 147],
      [87, 137, 88, 96, 91, 66]
    ], PAL.indigoMid);
    bezierShape([84, 68], [
      [74, 87, 69 + fabricTrail * 0.12, 116, 65 + fabricTrail * 0.28, 149],
      [75, 153, 83, 151, 90, 146],
      [91, 119, 91, 90, 90, 68]
    ], PAL.cream);
    bezierShape([96, 68], [
      [105, 87, 113 + fabricTrail * 0.12, 117, 121 + fabricTrail * 0.28, 150],
      [111, 153, 101, 151, 90, 146],
      [89, 118, 90, 89, 90, 68]
    ], PAL.indigo);
    line([[65, 148], [75, 153], [90, 146], [106, 153], [121, 150]], PAL.outline, 0.8);
    bezierLine([72, 78], [[69, 101, 68 + fabricTrail * 0.2, 126, 65 + fabricTrail * 0.28, 146]], PAL.creamMid, 1.5);
    bezierLine([108, 78], [[113, 103, 116 + fabricTrail * 0.2, 128, 121 + fabricTrail * 0.28, 147]], PAL.indigoHi, 1.5);
    sparkle(70, 122, 2, PAL.goldHi);
    sparkle(112, 132, 2, PAL.gold);
    sparkle(100, 111, 2, PAL.goldHi);

    bezierShape([77, 51], [
      [68, 49, 61, 54, 57 + fabricTrail * 0.15, 64],
      [51 + fabricTrail * 0.35, 75, 42 + fabricTrail * 0.7, 86, 34 + fabricTrail, 92],
      [33 + fabricTrail, 99, 41 + fabricTrail * 0.85, 104, 49 + fabricTrail * 0.65, 100],
      [58 + fabricTrail * 0.4, 94, 65, 82, 77, 51]
    ], PAL.creamMid);
    bezierShape([103, 51], [
      [112, 49, 120, 55, 124 + fabricTrail * 0.15, 65],
      [130 + fabricTrail * 0.35, 76, 140 + fabricTrail * 0.7, 87, 149 + fabricTrail, 93],
      [151 + fabricTrail, 100, 143 + fabricTrail * 0.85, 105, 135 + fabricTrail * 0.65, 101],
      [126 + fabricTrail * 0.4, 95, 115, 82, 103, 51]
    ], PAL.creamShadow);
    bezierLine([73, 54], [[66, 57, 59 + fabricTrail * 0.2, 70, 51 + fabricTrail * 0.45, 83]], PAL.cream, 3);
    bezierLine([107, 54], [[115, 57, 123 + fabricTrail * 0.2, 70, 131 + fabricTrail * 0.45, 83]], PAL.creamMid, 3);
    bezierLine([74, 54], [[68, 60, 63, 67, 61 + fabricTrail * 0.15, 73 + armSwing]], PAL.skin, 5.5);
    bezierLine([61 + fabricTrail * 0.15, 73 + armSwing], [[57, 80 + armSwing, 52, 86 + armSwing, 49 + fabricTrail * 0.45, 91 + armSwing]], PAL.skin, 4);
    bezierLine([106, 54], [[112, 60, 117, 67, 120 + fabricTrail * 0.15, 73 - armSwing]], PAL.skin, 5.5);
    bezierLine([120 + fabricTrail * 0.15, 73 - armSwing], [[123, 79 - armSwing, 126, 84 - armSwing, 129 + fabricTrail * 0.35, 89 - armSwing]], PAL.skin, 4);
    ellipse(48 + fabricTrail * 0.45, 92 + armSwing, 2.4, 3.5, PAL.skin);
    ellipse(130 + fabricTrail * 0.35, 90 - armSwing, 2.4, 3.5, PAL.skin);
    line([[47, 94 + armSwing], [46, 97 + armSwing]], PAL.skinShadow, 0.8);
    line([[49, 94 + armSwing], [49, 97 + armSwing]], PAL.skinShadow, 0.8);
    line([[129, 92 - armSwing], [128, 95 - armSwing]], PAL.skinShadow, 0.8);
    line([[131, 92 - armSwing], [131, 95 - armSwing]], PAL.skinShadow, 0.8);

    bezierShape([74, 52], [
      [78, 46, 84, 43, 90, 44],
      [97, 43, 103, 46, 108, 53],
      [104, 60, 98, 64, 91, 65],
      [84, 64, 78, 60, 74, 52]
    ], PAL.cream);
    bezierLine([77, 51], [[84, 56, 97, 57, 105, 51]], PAL.indigoDeep, 3);
    bezierLine([80, 48], [[86, 51, 96, 52, 102, 48]], PAL.gold, 1);

    bezierShape([79, 16], [
      [67, 20, 61, 38, 61 + trail * 0.08, 67],
      [61 + trail * 0.2, 97, 60 + trail * 0.5, 128, 54 + trail * 0.7, 145],
      [60 + trail * 0.62, 152, 68 + trail * 0.42, 150, 73 + trail * 0.32, 137],
      [77 + trail * 0.22, 151, 84 + trail * 0.12, 154, 88, 138],
      [92, 152, 100 + trail * 0.12, 153, 104 + trail * 0.32, 137],
      [109 + trail * 0.42, 151, 117 + trail * 0.62, 150, 121 + trail * 0.7, 137],
      [123 + trail * 0.2, 105, 122 + trail * 0.08, 63, 119, 48],
      [116, 28, 108, 17, 99, 14],
      [92, 11, 85, 12, 79, 16]
    ], PAL.hairMid);
    bezierShape([78, 22], [
      [69, 32, 65, 57, 66 + trail * 0.12, 91],
      [66 + trail * 0.32, 116, 62 + trail * 0.58, 135, 56 + trail * 0.68, 145],
      [62 + trail * 0.52, 148, 70 + trail * 0.3, 137, 74, 119],
      [76, 82, 76, 43, 78, 22]
    ], PAL.hairShadow);
    bezierShape([103, 20], [
      [112, 31, 116, 57, 115 + trail * 0.12, 87],
      [116 + trail * 0.34, 114, 117 + trail * 0.6, 134, 113 + trail * 0.68, 147],
      [107 + trail * 0.48, 149, 102 + trail * 0.28, 139, 100, 121],
      [101, 84, 100, 42, 103, 20]
    ], PAL.hairDeep);
    bezierShape([84, 18], [
      [80, 37, 79, 69, 80 + trail * 0.08, 99],
      [80 + trail * 0.28, 121, 77 + trail * 0.48, 136, 73 + trail * 0.56, 143],
      [80 + trail * 0.36, 141, 85 + trail * 0.18, 123, 86, 99],
      [87, 64, 87, 35, 84, 18]
    ], PAL.hairLight);
    bezierShape([94, 16], [
      [99, 35, 101, 66, 101 + trail * 0.08, 96],
      [103 + trail * 0.28, 119, 106 + trail * 0.48, 134, 110 + trail * 0.56, 143],
      [103 + trail * 0.36, 140, 97 + trail * 0.18, 123, 96, 99],
      [93, 64, 91, 33, 94, 16]
    ], PAL.hairLight);
    bezierShape([86, 14], [
      [84, 42, 86, 78, 88 + sway * 0.2, 113],
      [89 + trail * 0.18, 128, 89 + trail * 0.24, 139, 88 + trail * 0.3, 146],
      [93 + trail * 0.22, 137, 94 + trail * 0.12, 125, 93, 111],
      [92, 73, 91, 38, 92, 13]
    ], PAL.hairHi);
    bezierLine([79, 17], [[72, 41, 71, 83, 66 + trail * 0.42, 132]], PAL.outline, 0.8);
    bezierLine([102, 17], [[110, 42, 111, 83, 114 + trail * 0.45, 134]], PAL.outline, 0.8);
    bezierLine([82, 24], [[81, 58, 83 + trail * 0.12, 94, 79 + trail * 0.38, 129]], PAL.hairHi, 1.8);
    bezierLine([107, 25], [[110, 57, 108 + trail * 0.14, 92, 112 + trail * 0.4, 132]], PAL.hairShadow, 1.4);
    // A second, thinner strand nested inside each outer mass, matching the
    // front view's 3-strand texture density instead of just 2 wide bands.
    bezierLine([75, 40], [[71, 68, 70 + trail * 0.2, 100, 64 + trail * 0.5, 140]], PAL.hairDeep, 1);
    bezierLine([114, 41], [[118, 69, 119 + trail * 0.22, 101, 125 + trail * 0.5, 141]], PAL.hairMid, 1);
    // Center-back part line, now carried all the way down to the hem
    // instead of stopping partway (it used to end at y=66, leaving the
    // lower half of the back with no center seam at all).
    bezierLine([91, 13], [[88, 25, 87, 48, 88 + trail * 0.1, 72], [89 + trail * 0.22, 100, 89 + trail * 0.3, 122, 88 + trail * 0.36, 138]], PAL.hairShadow, 0.8);
    bezierLine([92, 13], [[96, 25, 96, 48, 95 + trail * 0.1, 72], [94 + trail * 0.22, 100, 93 + trail * 0.3, 122, 92 + trail * 0.36, 138]], PAL.hairHi, 0.8);
    bezierLine([80, 15], [[86, 11, 98, 11, 104, 15]], PAL.hairHi, 1.4);
    // A couple of loose flyaway wisps near the ends so the silhouette
    // doesn't read as one solid uninterrupted block at the bottom.
    bezierLine([68, 118], [[65, 126, 63 + trail * 0.3, 133, 61 + trail * 0.4, 141]], PAL.hairHi, 0.6);
    bezierLine([120, 120], [[124, 128, 126 + trail * 0.3, 135, 128 + trail * 0.4, 142]], PAL.hairShadow, 0.6);
    bezierLine([62, 56], [[68, 49, 73, 47, 78, 50]], PAL.cream, 2.5);
    bezierLine([102, 50], [[108, 47, 113, 49, 119, 56]], PAL.indigoMid, 2.5);
    bezierLine([76, 50], [[84, 55, 97, 55, 104, 50]], PAL.goldDark, 0.8);

    pctx.restore();
  }

  function easeOutCubic(v) { return 1 - Math.pow(1 - v, 3); }
  function easeInOut(v) { return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  // Flat colour wash over whatever is already in the sprite buffer. Kept
  // inside the buffer rather than applied on the game canvas so a tint only
  // ever touches Kanade, never the frozen battlefield behind her.
  function tintBuffer(color, alpha) {
    if (alpha <= 0) return;
    pctx.save();
    pctx.globalCompositeOperation = 'source-atop';
    pctx.globalAlpha = Math.min(1, alpha);
    pctx.fillStyle = color;
    pctx.fillRect(0, 0, GRID_W, GRID_H);
    pctx.restore();
  }

  // Screen placement, recomputed every frame so a resize mid-cutscene simply
  // lands correctly on the next one. She stands left of centre; the gate she
  // steps out of and leaves through sits to her right.
  function layout() {
    const box = Math.min(canvas.height * 0.50, canvas.width * 0.44);
    return {
      box,
      standX: canvas.width * 0.37,
      // Low enough that the announcement banner clears her face.
      centerY: canvas.height * 0.52,
      gateX: canvas.width * 0.66,
      gateR: box * 0.38,
      ringR: box * 0.62,
    };
  }

  function blitSprite(L, x, y, scale, alpha) {
    if (alpha <= 0.01 || scale <= 0.01) return;
    const w = L.box * scale;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(px, x - w / 2, y - w / 2, w, w);
    ctx.restore();
  }

  // The reality gate, ported from the prototype's drawRealityGate. Its body
  // is written against a fixed 154px radius, so the caller's radius comes in
  // as a uniform scale around it and `openness` squashes it horizontally the
  // same way the prototype's portal opens and shuts.
  function drawGate(x, y, radius, openness, alpha, now) {
    if (openness <= 0 || alpha <= 0) return;
    const R = 154;
    const k = radius / R;
    const squash = Math.max(0.025, openness);
    const lineComp = 1 / Math.max(0.2, squash);
    const pulse = 0.82 + Math.sin(now * 0.006) * 0.18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(squash * k, k);
    const interior = ctx.createRadialGradient(0, 0, 8, 0, 0, R);
    interior.addColorStop(0, 'rgba(18,12,42,0.82)');
    interior.addColorStop(0.56, 'rgba(31,19,68,0.72)');
    interior.addColorStop(0.84, 'rgba(89,58,142,0.28)');
    interior.addColorStop(1, 'rgba(12,8,31,0)');
    ctx.fillStyle = interior;
    ctx.beginPath();
    ctx.arc(0, 0, R - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R - 18, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let gy = -112; gy <= 112; gy += 16) {
      const half = Math.sqrt(Math.max(0, (R - 22) * (R - 22) - gy * gy));
      const shimmer = 0.1 + 0.1 * Math.sin(now * 0.004 + gy * 0.08);
      ctx.strokeStyle = `rgba(193,169,255,${shimmer})`;
      ctx.lineWidth = 0.8 * lineComp;
      ctx.beginPath();
      ctx.moveTo(-half, gy);
      ctx.lineTo(half, gy);
      ctx.stroke();
    }
    for (let gx = -112; gx <= 112; gx += 16) {
      const half = Math.sqrt(Math.max(0, (R - 22) * (R - 22) - gx * gx));
      const shimmer = 0.08 + 0.09 * Math.sin(now * 0.0035 + gx * 0.07);
      ctx.strokeStyle = `rgba(151,126,226,${shimmer})`;
      ctx.lineWidth = 0.75 * lineComp;
      ctx.beginPath();
      ctx.moveTo(gx, -half);
      ctx.lineTo(gx, half);
      ctx.stroke();
    }
    for (let sy = -104; sy <= 104; sy += 9) {
      const drift = Math.sin(now * 0.005 + sy * 0.12) * 5;
      const half = Math.sqrt(Math.max(0, (R - 26) * (R - 26) - sy * sy));
      ctx.strokeStyle = `rgba(239,226,255,${0.035 + pulse * 0.025})`;
      ctx.lineWidth = 0.55 * lineComp;
      ctx.beginPath();
      ctx.moveTo(-half + drift, sy);
      ctx.lineTo(half + drift, sy);
      ctx.stroke();
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#c8a9ff';
    ctx.shadowBlur = 24 * pulse;
    ctx.strokeStyle = `rgba(239,226,255,${0.82 + pulse * 0.16})`;
    ctx.lineWidth = 3.4 * lineComp;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(178,137,255,0.82)';
    ctx.lineWidth = 2 * lineComp;
    ctx.beginPath();
    ctx.arc(0, 0, R - 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(now * 0.0006);
    ctx.strokeStyle = 'rgba(205,181,255,0.66)';
    ctx.lineWidth = 1.25 * lineComp;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const a2 = a + Math.PI * 5 / 12;
      const ax = Math.cos(a) * 118, ay = Math.sin(a) * 118;
      const bx = Math.cos(a2) * 72, by = Math.sin(a2) * 72;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? '#eee1ff' : '#bca4f5';
      ctx.beginPath();
      ctx.arc(ax, ay, (2.4 + pulse) * lineComp, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(-now * 0.0011);
    ctx.strokeStyle = 'rgba(240,226,255,0.7)';
    ctx.lineWidth = 1.3 * lineComp;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      const px = Math.cos(a) * 84, py = Math.sin(a) * 84;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(137,107,213,0.62)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const px = Math.cos(a) * 54, py = Math.sin(a) * 54;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(now * 0.0009);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      const rr = R + 12 + (i % 2) * 8;
      const dx = Math.cos(a) * rr, dy = Math.sin(a) * rr;
      const size = 3.5 + (i % 3);
      ctx.fillStyle = i % 2 ? 'rgba(230,214,255,0.9)' : 'rgba(144,111,220,0.82)';
      ctx.beginPath();
      ctx.moveTo(dx, dy - size * 1.8);
      ctx.lineTo(dx + size, dy);
      ctx.lineTo(dx, dy + size * 1.8);
      ctx.lineTo(dx - size, dy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
    core.addColorStop(0, `rgba(242,231,255,${0.24 + pulse * 0.12})`);
    core.addColorStop(0.35, 'rgba(154,116,230,0.2)');
    core.addColorStop(1, 'rgba(22,14,50,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // The geometric halo behind her head is part of her look, not a one-off
  // flourish, so it tracks her head through every scale and fade the blit
  // above applies to the sprite itself.
  function drawHaloAt(L, x, y, scale, alpha, now) {
    if (alpha <= 0.02 || scale <= 0.02) return;
    if (!_kanadeHaloImg.complete || !_kanadeHaloImg.naturalWidth) return;
    const unit = (L.box * scale) / GRID_W;
    const hx = x + (92 - GRID_W / 2) * unit;
    const hy = y + (26 - GRID_H / 2) * unit;
    const size = 56 * unit;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(Math.sin(now * 0.0015) * 0.04);
    ctx.globalAlpha = alpha * 0.9;
    ctx.shadowColor = '#8dffd8';
    ctx.shadowBlur = 18 * scale;
    ctx.drawImage(_kanadeHaloImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // The spell-card ring she stands inside, ported from the prototype's
  // drawRing. Radius comes in from the caller; everything inside is written
  // against the prototype's own 188px ring and scaled to match.
  let ringRot = 0;
  function drawSpellRing(x, y, radius, energy, alpha) {
    if (alpha <= 0.01) return;
    const R = 188;
    const k = radius / R;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(x, y);
    ctx.scale(k, k);

    ctx.shadowColor = 'rgba(190,150,255,0.9)';
    ctx.shadowBlur = 14 + energy * 16;
    ctx.strokeStyle = 'hsla(280, 75%, 78%, ' + (0.6 + energy * 0.35) + ')';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'hsla(280, 80%, 80%, ' + (0.25 + energy * 0.3) + ')';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, R - 10, 0, Math.PI * 2); ctx.stroke();

    ctx.rotate(ringRot);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const inner = R + 4, outer = R + (i % 3 === 0 ? 16 : 9);
      ctx.strokeStyle = 'hsla(280, 70%, 75%, ' + (0.5 + energy * 0.4) + ')';
      ctx.lineWidth = i % 3 === 0 ? 3.2 : 1.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = ringRot * 1.6 + (i / 8) * Math.PI * 2;
      const r = R + 26;
      ctx.fillStyle = 'hsla(320, 90%, 78%, ' + (0.7 + energy * 0.3) + ')';
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Ambient petals drifting down around her while she is on screen.
  let sakuraPetals = [];
  function spawnSakuraPetal(L) {
    sakuraPetals.push({
      x: L.standX + (Math.random() - 0.5) * L.box * 1.1,
      y: L.centerY - L.box * 0.7 - Math.random() * L.box * 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: 0.35 + Math.random() * 0.35,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.015,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      life: 0, maxLife: 600 + Math.random() * 300,
      size: 3.5 + Math.random() * 2.5,
      color: Math.random() < 0.5 ? '#ffd3e0' : '#ffbfd8',
    });
  }

  function updateDrawSakura() {
    for (let i = sakuraPetals.length - 1; i >= 0; i--) {
      const p = sakuraPetals[i];
      p.life++;
      p.sway += p.swaySpeed;
      p.x += p.vx + Math.sin(p.sway) * 0.4;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      if (p.life >= p.maxLife || p.y > canvas.height + 20) { sakuraPetals.splice(i, 1); continue; }
      const fade = Math.min(Math.min(1, p.life / 30), Math.min(1, (p.maxLife - p.life) / 40));
      ctx.save();
      ctx.globalAlpha = fade * 0.85;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Sparks thrown by the gate opening, the turn flash and the summon. Screen
  // coordinates, one step per frame — the cutscene runs with the sim frozen,
  // so there is no deltaTime to integrate here.
  let fxParticles = [];

  function spawnBurst(count, x, y, color, spdMin, spdRange, life, size) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = spdMin + Math.random() * spdRange;
      fxParticles.push({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0, maxLife: life + Math.random() * 20,
        size: size + Math.random() * 3, color,
      });
    }
  }

  function updateDrawParticles() {
    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.life++;
      p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97;
      if (p.life >= p.maxLife) { fxParticles.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Speech bubble with a 3-dot typing indicator, in the same dark-panel
  // language the sigil picker already uses — she is deciding what to summon.
  function drawThoughtBubble(L, x, y, alpha, now) {
    if (alpha <= 0.01) return;
    const w = Math.max(96, L.box * 0.30);
    const h = w * 0.44;
    const bx = x - w / 2, by = y - h;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = 'rgba(4,10,28,0.95)';
    ctx.strokeStyle = 'rgba(196,160,255,0.75)';
    ctx.lineWidth = 1.4;
    roundRect(bx, by, w, h, h * 0.30);
    ctx.fill();
    ctx.stroke();
    // Tail, pointing down at her
    const tw = h * 0.22;
    ctx.beginPath();
    ctx.moveTo(x - tw, by + h - 1);
    ctx.lineTo(x - tw * 0.2, by + h + tw * 1.6);
    ctx.lineTo(x + tw, by + h - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const dotR = Math.max(2, h * 0.09);
    for (let i = 0; i < 3; i++) {
      const lift = Math.max(0, Math.sin(now * 0.006 - i * 0.7)) * dotR * 1.2;
      ctx.globalAlpha = Math.min(1, alpha) * (0.45 + 0.55 * Math.max(0, Math.sin(now * 0.006 - i * 0.7)));
      ctx.fillStyle = '#e6d9ff';
      ctx.beginPath();
      ctx.arc(bx + w / 2 + (i - 1) * dotR * 3, by + h / 2 - lift, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // The announcement that runs over the cast beat: the wide banner art, the
  // rolled effect's name on top of it, and both halves of the pair — the
  // player-favouring hourglass and the enemy-favouring broken one.
  function drawEffectBanner(effect, alpha, L) {
    if (alpha <= 0.01) return;
    const w = Math.min(canvas.width * 0.82, 700);
    const h = w * 0.21;
    const cx = canvas.width / 2;
    const top = canvas.height * 0.03;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (_tdBannerImg.complete && _tdBannerImg.naturalWidth) {
      ctx.drawImage(_tdBannerImg, cx - w / 2, top, w, h);
    }
    ctx.shadowColor = 'rgba(190,140,255,0.9)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#f3e9ff';
    ctx.font = "900 " + Math.round(h * 0.34) + "px 'Cinzel', serif";
    ctx.fillText(effect.name, cx, top + h * 0.52);
    ctx.shadowBlur = 0;

    // The pair reads as one line under the banner: the player-favouring
    // hourglass and its half on the left, the broken enemy one on the right.
    // Icons sit out at the banner's decorated ends so they stay off her.
    const iconR = Math.max(16, w * 0.045);
    const halves = [
      { img: _tdPlayerIconImg, text: effect.playerHalf, dir: -1, color: '#ffe9a8' },
      { img: _tdEnemyIconImg, text: effect.enemyHalf, dir: 1, color: '#ff9aa6' },
    ];
    // Below the ring, in the clear band under her, so neither line crosses her.
    const rowY = Math.min(canvas.height - iconR * 1.6, L.centerY + L.ringR + iconR * 1.4);
    ctx.font = Math.round(w * 0.021) + "px 'Courier New', monospace";
    for (const half of halves) {
      const hx = cx + half.dir * w * 0.26;
      if (half.img.complete && half.img.naturalWidth) {
        ctx.drawImage(half.img, hx - iconR * 2.6, rowY - iconR, iconR * 2, iconR * 2);
      }
      ctx.fillStyle = half.color;
      ctx.fillText(half.text, hx + iconR * 0.7, rowY);
    }
    ctx.restore();
  }

  // The eight beats, in order, with their lengths in ms. Elapsed time is
  // measured against _frozenNow, so an ESC pause mid-cutscene holds the whole
  // sequence in place instead of letting it run on behind the pause screen.
  const BEATS = [
    { id: 'freeze',  ms: 800 },   // sim stops, the screen darkens
    { id: 'gate',    ms: 900 },   // the reality gate tears open
    { id: 'walkOut', ms: 1900 },  // she steps out back-first, then turns to face forward
    { id: 'think',   ms: 1800 },  // she stands deciding, thought bubble up
    { id: 'summon',  ms: 1300 },  // Goliath Alpha enters the arena for real
    { id: 'cast',    ms: 2400 },  // the rolled effect applies, banner up
    { id: 'leave',   ms: 1800 },  // she turns, walks back into the gate
    { id: 'close',   ms: 700 },   // gate shuts, overlay lifts, time resumes
  ];

  const BEAT_AT = {};
  let _beatAcc = 0;
  for (const b of BEATS) { BEAT_AT[b.id] = _beatAcc; _beatAcc += b.ms; }
  const TOTAL_MS = _beatAcc;
  // Where inside their own beats the two real game-logic side effects land.
  const SUMMON_AT = BEAT_AT.summon + 0.55 * 1300;
  const APPLY_AT = BEAT_AT.cast + 0.25 * 2400;

  function currentBeat(elapsed) {
    for (const b of BEATS) {
      const start = BEAT_AT[b.id];
      if (elapsed < start + b.ms) return { id: b.id, p: clamp01((elapsed - start) / b.ms) };
    }
    return null;
  }

  // Gate openness for a given beat: it tears open before she arrives, shuts
  // once she is clear of it, and reopens for her exit.
  function gateOpenness(beatId, p) {
    if (beatId === 'gate') return easeOutCubic(p);
    if (beatId === 'walkOut') return p < 0.70 ? 1 : 1 - easeInOut((p - 0.70) / 0.30);
    if (beatId === 'leave') return p < 0.18 ? easeOutCubic(p / 0.18) : 1;
    if (beatId === 'close') return 1 - easeInOut(p);
    return 0;
  }

  // How dark the world behind her gets. Ramps in over the freeze beat, holds,
  // then lifts as the gate shuts.
  function overlayAlpha(beatId, p) {
    if (beatId === 'freeze') return 0.86 * easeOutCubic(p);
    if (beatId === 'close') return 0.86 * (1 - easeInOut(p));
    return 0.86;
  }

  // A vignette over the flat wash, so the frozen battlefield falls away at the
  // edges and the eye lands on her rather than on the HUD.
  function drawVignette(alpha) {
    if (alpha <= 0.01) return;
    const g = ctx.createRadialGradient(
      canvas.width * 0.45, canvas.height * 0.5, canvas.height * 0.18,
      canvas.width * 0.45, canvas.height * 0.5, Math.max(canvas.width, canvas.height) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // How lit the spell ring is and how far it has faded in. It arrives with her
  // and burns brightest on the two cast beats.
  function ringState(beatId, p) {
    if (beatId === 'walkOut') return { alpha: clamp01((p - 0.25) / 0.35), energy: 0.45 };
    if (beatId === 'think') return { alpha: 1, energy: 0.5 };
    if (beatId === 'summon') return { alpha: 1, energy: 0.6 + 0.4 * Math.sin(p * Math.PI) };
    if (beatId === 'cast') return { alpha: 1, energy: 0.65 + 0.35 * Math.sin(p * Math.PI) };
    if (beatId === 'leave') return { alpha: clamp01(1 - p / 0.45), energy: 0.45 };
    return { alpha: 0, energy: 0 };
  }

  let blinkUntil = 0;
  let nextBlinkAt = 0;
  function blinkNow(now) {
    if (!nextBlinkAt) nextBlinkAt = now + 1200;
    if (now >= nextBlinkAt) {
      blinkUntil = now + 170;
      nextBlinkAt = blinkUntil + 1800 + Math.random() * 1800;
    }
    return now < blinkUntil;
  }

  // Everything about how she is posed and placed this frame. Returns null on
  // the beats where she is not on screen at all.
  function poseFor(L, beatId, p, now) {
    if (beatId === 'freeze' || beatId === 'gate' || beatId === 'close') return null;

    if (beatId === 'walkOut') {
      // She glides out of the gate already facing the camera, growing and
      // fading in as she crosses. Her hair trails behind the movement and
      // settles once she stops.
      const w = clamp01(p / 0.70);
      const x = L.gateX + (L.standX - L.gateX) * easeInOut(w);
      const glide = Math.sin(w * Math.PI);
      return {
        back: false,
        x, y: L.centerY - L.box * 0.05 * glide,
        scale: 0.74 + 0.26 * easeOutCubic(w),
        alpha: clamp01(w / 0.22),
        flash: 0,
        opts: {
          swayAmp: 1.6, bobAmp: 1.0,
          lean: -3 * glide,
          trail: 7 * glide,
          blink: false,
          expression: 'smug',
        },
      };
    }

    if (beatId === 'think') {
      return {
        back: false, x: L.standX, y: L.centerY, scale: 1, alpha: 1, flash: 0,
        opts: { swayAmp: 1.7, bobAmp: 1.2, blink: blinkNow(now), expression: 'thinking' },
      };
    }

    if (beatId === 'summon' || beatId === 'cast') {
      // Both beats reuse the prototype's cast pose: the arm sweeps up, holds,
      // and comes back down.
      let castExt;
      if (p < 0.36) castExt = easeOutCubic(p / 0.36);
      else if (p < 0.72) castExt = 1;
      else castExt = 1 - easeInOut((p - 0.72) / 0.28);
      return {
        back: false, x: L.standX, y: L.centerY, scale: 1, alpha: 1, flash: 0,
        opts: {
          swayAmp: 0.7, bobAmp: 0.35, castExt, blink: false,
          expression: beatId === 'cast' ? 'smug' : 'determined',
        },
      };
    }

    // leave: she turns away, then glides into the gate, shrinking and fading.
    const back = p >= 0.24;
    let x = L.standX, y = L.centerY, scale = 1, alpha = 1, trail = 0;
    if (p >= 0.30) {
      const q = clamp01((p - 0.30) / 0.60);
      x = L.standX + (L.gateX - L.standX) * easeInOut(q);
      y = L.centerY - 12 * Math.sin(q * Math.PI);
      scale = 1 - q * 0.20;
      trail = -4 * Math.sin(q * Math.PI);
      if (q > 0.72) alpha = 1 - (q - 0.72) / 0.28;
    }
    return {
      back, x, y, scale, alpha: clamp01(alpha),
      flash: (p >= 0.18 && p <= 0.30) ? Math.sin(((p - 0.18) / 0.12) * Math.PI) : 0,
      opts: {
        swayAmp: 1.1, bobAmp: 0.45, trail,
        walkStep: (p >= 0.30 && p < 0.90) ? Math.sin(now * 0.012) : 0,
        blink: false, expression: 'neutral',
      },
    };
  }

  // How long the descent gets: from the summon gesture to the moment she
  // opens her exit gate, so he has settled before she goes.
  const GOLIATH_DRIFT_MS = (BEAT_AT.leave - SUMMON_AT);

  // Goliath Alpha already owns an entrance - a 1500ms ease from above the top
  // edge down to _restY, driven by _appearTimer in its own update. The freeze
  // has that update stopped, so this drives the same timer by hand and
  // recomputes y with the same curve: the descent the player sees is the real
  // one, stretched over the cast, and the timer is already spent when time
  // restarts so he does not enter twice.
  function goliathDrift(cs, elapsed) {
    const g = cs.goliath;
    if (!g || g.hp <= 0) return null;
    const q = clamp01((elapsed - SUMMON_AT) / GOLIATH_DRIFT_MS);
    g._appearTimer = 1500 * q;
    const ease = easeOutCubic(q);
    g.y = -g.size + (g._restY - (-g.size)) * ease;
    return g;
  }

  // Both real game-logic beats, fired off elapsed time rather than off a
  // particular frame landing on them, so a dropped frame can never skip one.
  function runSideEffects(cs, elapsed, L) {
    if (!cs.spawned && elapsed >= SUMMON_AT) {
      cs.spawned = true;
      const before = enemies.length;
      if (typeof _spawnWaveGoliath === 'function') _spawnWaveGoliath();
      const g = enemies.length > before ? enemies[enemies.length - 1] : null;
      if (g && g.type === 'goliath') {
        cs.goliath = g;
        g._appearTimer = 0;
        g.y = -g.size;
      }
      spawnBurst(34, L.standX + L.box * 0.22, L.centerY - L.box * 0.18, '#ffe9a8', 2, 6, 30, 4);
    }
    if (!cs.applied && elapsed >= APPLY_AT) {
      cs.applied = true;
      if (typeof _applyTimelineDistortion === 'function') _applyTimelineDistortion(cs.effect);
      spawnBurst(40, L.standX, L.centerY, '#d8b6ff', 2, 7, 34, 4);
    }
  }

  function finishCutscene(cs) {
    // Land him exactly where his own entrance would have, in case the last
    // frame of the drift never drew.
    if (cs.goliath && cs.goliath.hp > 0) {
      cs.goliath._appearTimer = 1500;
      cs.goliath.y = cs.goliath._restY;
    }
    window._kanadeCutscene = null;
    fxParticles.length = 0;
    sakuraPetals.length = 0;
    // Time starts again, so the mix comes back with it - the gate always lifts,
    // or sound would stay dead for the rest of the run, but the restart behind
    // it is left to the player's own unpause when they have the game paused on
    // top of this.
    if (window.AudioMgr && window.AudioMgr.setTimeFrozen) window.AudioMgr.setTimeFrozen(false, !gamePaused);
    if (!cs.spawned && typeof _spawnWaveGoliath === 'function') _spawnWaveGoliath();
    if (!cs.applied && typeof _applyTimelineDistortion === 'function') _applyTimelineDistortion(cs.effect);
    if (typeof _markKanadeIntroSeen === 'function') _markKanadeIntroSeen();
  }

  function drawKanadeCutscene() {
    const cs = window._kanadeCutscene;
    if (!cs) return;
    const now = (typeof _frozenNow === 'number' && _frozenNow > 0) ? _frozenNow : performance.now();
    if (!cs.startedAt) cs.startedAt = now;
    const elapsed = now - cs.startedAt;
    const L = layout();

    runSideEffects(cs, elapsed, L);
    const beat = currentBeat(elapsed);
    if (!beat) { finishCutscene(cs); return; }

    const wash = overlayAlpha(beat.id, beat.p);
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,16,1)';
    ctx.globalAlpha = wash;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    drawVignette(wash);

    const openness = gateOpenness(beat.id, beat.p);
    if (openness > 0) {
      drawGate(L.gateX, L.centerY, L.gateR, openness, 1, now);
      if (beat.id === 'gate' && beat.p < 0.04) {
        spawnBurst(30, L.gateX, L.centerY, '#9fe8ff', 1, 5, 44, 4);
      }
    }

    const descending = goliathDrift(cs, elapsed);
    if (descending && typeof drawEnemy === 'function') {
      drawEnemy(descending);
      if (typeof _drawGoliathBossBar === 'function') _drawGoliathBossBar(descending);
    }

    const ring = ringState(beat.id, beat.p);
    ringRot += 0.004 + ring.energy * 0.01;
    drawSpellRing(L.standX, L.centerY, L.ringR, ring.energy, ring.alpha);
    if (ring.alpha > 0.4 && Math.random() < 0.10) spawnSakuraPetal(L);
    updateDrawSakura();

    const t = (now / 900) % 1;
    const pose = poseFor(L, beat.id, beat.p, now);
    if (pose) {
      if (pose.back) drawKanadeBack(t, pose.opts);
      else drawKanade(t, pose.opts);
      if (pose.flash > 0) tintBuffer('#fff8ff', pose.flash * 0.92);
      drawHaloAt(L, pose.x, pose.y, pose.scale, pose.alpha, now);
      blitSprite(L, pose.x, pose.y, pose.scale, pose.alpha);
      if (pose.flash > 0.9 && fxParticles.length < 90) {
        spawnBurst(26, pose.x, pose.y - L.box * 0.16, '#fff4ff', 2, 6, 24, 4);
      }
      if (beat.id === 'think') {
        drawThoughtBubble(L, pose.x + L.box * 0.30, pose.y - L.box * 0.34,
          Math.min(1, beat.p / 0.18) * Math.min(1, (1 - beat.p) / 0.15), now);
      }
    }

    if (beat.id === 'cast') {
      drawEffectBanner(cs.effect, Math.min(1, beat.p / 0.15) * Math.min(1, (1 - beat.p) / 0.12), L);
    }

    updateDrawParticles();
  }

  function beginKanadeCutscene(effect, waveNum) {
    fxParticles.length = 0;
    sakuraPetals.length = 0;
    // She stops time, so the whole mix stops with it: music, ambience, every
    // sustained loop, and any one-shot that tries to fire while she holds it.
    if (window.AudioMgr && window.AudioMgr.setTimeFrozen) window.AudioMgr.setTimeFrozen(true);
    window._kanadeCutscene = {
      effect, wave: waveNum,
      startedAt: 0, spawned: false, applied: false,
      goliath: null,
    };
  }

  window.drawKanadeCutscene = drawKanadeCutscene;
  window._beginKanadeCutscene = beginKanadeCutscene;
  window._KANADE_CUTSCENE_MS = TOTAL_MS;
})();
