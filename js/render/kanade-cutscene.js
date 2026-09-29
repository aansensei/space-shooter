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
  //
  // It follows the size she is actually shown at. A fixed 2 made a 360px
  // buffer, which is 1:1 at 720p but blown up 1.5x at 1080p and 2x at 1440p,
  // and that stretching is where the softness came from, not the pixel-art
  // look. So the buffer is sized to cover what is on screen, from 2 up to 3.
  // A phone shows her at about 195px and keeps the small buffer.
  //
  // The cap is 3 because the buffer is not free in a browser. Headless the
  // cost barely moved with size, but in Chrome, flushing after each draw, one
  // uncached draw measured about 4.4ms at 2, 6.7ms at 3 and 8.7ms at 4. At 3
  // a 1080p screen is covered exactly and 1440p is stretched 1.33x rather
  // than 2x, for half the extra cost that 4 would add.
  const GRID_W = 180, GRID_H = 180;
  const RES_MIN = 2, RES_MAX = 3;
  let RES_MULT = 0;
  const px = document.createElement('canvas');
  const pctx = px.getContext('2d');
  function setSpriteRes(mult) {
    RES_MULT = mult;
    px.width = GRID_W * mult; px.height = GRID_H * mult;
    // Resizing a canvas resets its context, so the scale goes back on.
    pctx.setTransform(mult, 0, 0, mult, 0, 0);
    pctx.imageSmoothingEnabled = false;
  }
  setSpriteRes(RES_MIN);
  // shownPx is how wide the sprite will be drawn on the game canvas.
  function fitSpriteBuffer(shownPx) {
    const mult = Math.max(RES_MIN, Math.min(RES_MAX, Math.ceil(shownPx / GRID_W - 0.05)));
    if (mult === RES_MULT) return;
    setSpriteRes(mult);
    invalidateSprite();
  }

  const _tdBannerImg = new Image();
  _tdBannerImg.src = 'assets/images/game/effects/timeline-distortion-banner.png';
  const _tdPlayerIconImg = new Image();
  _tdPlayerIconImg.src = 'assets/images/game/icons/timeline-distortion-player.png';
  const _tdEnemyIconImg = new Image();
  _tdEnemyIconImg.src = 'assets/images/game/icons/timeline-distortion-enemy.png';
  const _kanadeHaloImg = new Image();
  _kanadeHaloImg.src = 'assets/images/game/effects/kanade-halo.png';
  // The derelict citadel hanging in the void behind the stopped arena. The
  // footage is the real backdrop; the still is what gets drawn when it cannot
  // be (decode not finished, format refused, or a graphics tier where paying
  // to decode video every frame is not worth it).
  const _frozenRealmImg = new Image();
  _frozenRealmImg.src = 'assets/images/game/effects/frozen-realm.jpg';
  // Muted and inline so it is allowed to autoplay without a gesture. It is
  // only ever running while the cutscene is on screen: a decoding video is
  // real work and there is no reason to pay for it the rest of the run.
  let _realmVidOk = false;
  const _frozenRealmVid = document.createElement('video');
  _frozenRealmVid.muted = true;
  _frozenRealmVid.defaultMuted = true;
  _frozenRealmVid.loop = true;
  _frozenRealmVid.playsInline = true;
  _frozenRealmVid.setAttribute('playsinline', '');
  _frozenRealmVid.setAttribute('muted', '');
  _frozenRealmVid.preload = 'auto';
  _frozenRealmVid.addEventListener('canplay', () => { _realmVidOk = true; });
  _frozenRealmVid.addEventListener('error', () => { _realmVidOk = false; });
  _frozenRealmVid.src = 'assets/video/frozen-realm.mp4';

  // Decoding a 720p frame every frame is the one part of this backdrop that
  // costs real time, so the two reduced tiers fall back to the still.
  function realmVideoReady() {
    return _realmVidOk && _frozenRealmVid.readyState >= 2
      && _frozenRealmVid.videoWidth > 0 && freezeTier() <= 1;
  }

  function startRealmVideo() {
    if (!_realmVidOk || freezeTier() > 1) return;
    try { _frozenRealmVid.currentTime = 0; _frozenRealmVid.play().catch(() => {}); } catch (_) {}
  }

  function stopRealmVideo() {
    try { _frozenRealmVid.pause(); _frozenRealmVid.currentTime = 0; } catch (_) {}
  }
  [_tdBannerImg, _tdPlayerIconImg, _tdEnemyIconImg, _kanadeHaloImg, _frozenRealmImg].forEach(img => {
    img.decoding = 'async';
    if (img.decode) img.decode().catch(() => {});
  });
  const PAL = {
    hairShadow: '#6b6690', hairDeep: '#4a4570', hairMid: '#9f9cc4', hairLight: '#e7e5f5', hairHi: '#fffdf8',
    skin: '#ffe3d4', skinShadow: '#e3ac9d', blush: '#f5b7c2',
    eyeDeep: '#244f9d', eyeBlue: '#4f8fe0', eyeLight: '#8ed6ff', eyeHi: '#ffffff', lid: '#332b55',
    creamShadow: '#b8b2ca', creamMid: '#e9e5ea', cream: '#fffaf0',
    indigoDeep: '#110f24', indigo: '#292552', indigoMid: '#403a78', indigoHi: '#665ba1',
    goldDark: '#9b7131', gold: '#d8b35a', goldHi: '#fff0a3',
    bootDeep: '#15142a', boot: '#292647', bootHi: '#ece7ef',
    outline: '#231f38',
    // Light thrown back onto her by her own spell. Only used while casting.
    magic: '#b98cff', magicHi: '#efdcff',
  };

  // Every stroke width on her, in grid units. Thirty ad hoc widths had some
  // lines shouting and others vanishing; a short named set keeps each kind
  // of mark the same weight everywhere and scales cleanly with RES_MULT.
  // A limb's outline is the limb plus an edge, written that way where used.
  const STROKE = {
    hairline: 0.4,  // single hairs, the finest folds, filigree
    fine: 0.6,      // creases, inner folds, strand lines, chains
    seam: 0.8,      // seams, piping, outlines of parts inside the figure
    edge: 1.1,      // her outer outlines, features, brows and mouth
    band: 1.6,      // sheen, trim bands, straps
    strap: 2.4,     // the widest flat bands drawn as strokes
    limb: 4,        // forearm
    limbUpper: 5.5, // upper arm
    limbCast: 6.4,  // the raised casting forearm, seen nearer
    sleeve: 13,     // the raised casting sleeve
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
  // Open ellipse, for the orbital rings on her hair ornament. Unrounded on
  // purpose: these are a couple of units across and snapping them to whole
  // pixels makes them wobble as she breathes.
  function ring(x, y, rx, ry, rot, c, w) {
    pctx.save();
    pctx.strokeStyle = c;
    pctx.lineWidth = w;
    pctx.beginPath();
    pctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    pctx.stroke();
    pctx.restore();
  }
  // A hanging crystal: a narrow diamond with a lit facet down one side.
  function crystal(x, y, h, c, hi) {
    poly([[x, y - h], [x + h * 0.45, y], [x, y + h], [x - h * 0.45, y]], c);
    poly([[x, y - h], [x + h * 0.45, y], [x, y + h * 0.15]], hi);
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
  // One lock of hair as a tapered ribbon: w wide where it leaves the head at
  // (x0, y0), narrowing to a point at (x1, y1). bend bows it sideways.
  function hairLock(x0, y0, w, x1, y1, bend, c) {
    const h = y1 - y0;
    bezierShape([x0 - w / 2, y0], [
      [x0 - w / 2 + bend, y0 + h * 0.45, x1 - w * 0.3 + bend * 0.5, y1 - h * 0.22, x1, y1],
      [x1 + w * 0.3 + bend * 0.5, y1 - h * 0.25, x0 + w / 2 + bend, y0 + h * 0.4, x0 + w / 2, y0]
    ], c);
  }
  // The tone each hair colour steps down to for its shade, and up to for its
  // lit edge.
  const HAIR_TONES = {
    [PAL.hairLight]: { shade: PAL.hairMid, lit: PAL.hairHi },
    [PAL.hairMid]: { shade: PAL.hairShadow, lit: PAL.hairLight },
    [PAL.hairShadow]: { shade: PAL.hairDeep, lit: PAL.hairMid },
    [PAL.hairDeep]: { shade: PAL.outline, lit: PAL.hairShadow },
  };
  // A lock cel-shaded as a ribbon rather than a flat cutout: a shade band
  // down its far side, a dark line where it lies over the lock beside it, a
  // lit stroke down its near side and a fine strand inside. Same arguments as
  // hairLock.
  function hairLockShaded(x0, y0, w, x1, y1, bend, c) {
    const tone = HAIR_TONES[c];
    hairLock(x0, y0, w, x1, y1, bend, c);
    hairLock(x0 + w * 0.33, y0, w * 0.34, x1 + 0.2, y1 - 1.5, bend, tone.shade);
    const h = y1 - y0;
    // A point on the lock at u (0 root, 1 tip), side -1 on its near edge,
    // +1 on its far edge.
    const at = (u, side) => {
      const v = 1 - u;
      const x = v * v * v * x0 + 3 * v * v * u * (x0 + bend) + 3 * v * u * u * (x1 + bend * 0.5) + u * u * u * x1;
      const y = v * v * v * y0 + 3 * v * v * u * (y0 + h * 0.43) + 3 * v * u * u * (y1 - h * 0.23) + u * u * u * y1;
      return [x + side * w * 0.5 * (1 - u * 0.85), y];
    };
    line([at(0.45, -0.9), at(0.65, -0.9), at(0.86, -0.85)], tone.shade, STROKE.fine);
    // The lit stroke starts at a different height on each lock, so the
    // highlights do not line up across the hair.
    const hs = 0.08 + ((x0 * 13) % 7) * 0.035;
    line([at(hs, -0.45), at(hs + 0.12, -0.45), at(hs + 0.24, -0.4)], tone.lit, Math.min(STROKE.seam, w * 0.1));
    line([at(0.3, 0.1), at(0.5, 0.15), at(0.72, 0.05)], tone.shade, STROKE.hairline);
  }
  // A closed outline laid out as points, run through a Catmull-Rom curve and
  // returned as the [start, segments] pair bezierShape takes. Cloth and flesh
  // have no corners, and at this size a hard vertex reads as a spike, so
  // shapes that were polygons keep their points and lose their corners.
  // tension 1 is the plain curve; lower pulls it in tighter to the points.
  function smoothOutline(points, tension) {
    const k = (tension == null ? 1 : tension) / 6;
    const n = points.length;
    const segs = [];
    for (let i = 0; i < n; i++) {
      const p0 = points[(i + n - 1) % n], p1 = points[i];
      const p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
      segs.push([
        p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k,
        p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k,
        p2[0], p2[1]
      ]);
    }
    return [points[0], segs];
  }
  function tracePath(outline) {
    const start = outline[0];
    pctx.beginPath();
    pctx.moveTo(start[0], start[1]);
    for (const s of outline[1]) pctx.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]);
    pctx.closePath();
  }

  // One light for all of her cloth, decided here once. It comes from the
  // gate, which is up and to the viewer's right in every layout: the robe was
  // already painted that way, darker on its near side, and the front view's
  // top-tier rim light sits on the right for the same reason.
  const LIGHT = { x: 0.8, y: -0.6 };
  // Each cloth tone and the tones it steps to in shade and in light. The
  // palest cream has nowhere lighter to go, and the deepest indigo nowhere
  // darker; the cream shadow borrows the hair's lavender, which is the cool
  // shade the rest of the figure already uses.
  const CLOTH_TONES = {
    [PAL.cream]: { shade: PAL.creamMid, lit: null },
    [PAL.creamMid]: { shade: PAL.creamShadow, lit: PAL.cream },
    [PAL.creamShadow]: { shade: PAL.hairMid, lit: PAL.creamMid },
    [PAL.indigoMid]: { shade: PAL.indigo, lit: PAL.indigoHi },
    [PAL.indigo]: { shade: PAL.indigoDeep, lit: PAL.indigoMid },
    [PAL.indigoDeep]: { shade: null, lit: PAL.indigo },
  };
  // A cloth panel lit by LIGHT: its base tone, a shade band inside the edges
  // that face away from the light and a narrower lit band inside the edges
  // that face it. The cloth equivalent of hairLockShaded, so every panel is
  // lit the same way instead of each getting its own hand-placed strokes.
  //
  // Both bands are the panel shifted against itself inside a clip of the
  // panel, so they follow its outline exactly whatever its shape: whatever
  // the copy shifted toward the light does not cover is the shaded edge, and
  // whatever the copy shifted away does not cover is the lit one.
  function clothPanel(outline, base, shadeW, litW) {
    const tone = CLOTH_TONES[base];
    const sw = shadeW == null ? 1.8 : shadeW, lw = litW == null ? 0.9 : litW;
    pctx.save();
    tracePath(outline);
    pctx.clip();
    pctx.fillStyle = tone.shade || base;
    pctx.fill();
    pctx.save();
    pctx.translate(LIGHT.x * sw, LIGHT.y * sw);
    tracePath(outline);
    pctx.restore();
    pctx.clip();
    pctx.fillStyle = tone.lit || base;
    pctx.fill();
    pctx.save();
    pctx.translate(-LIGHT.x * lw, -LIGHT.y * lw);
    tracePath(outline);
    pctx.restore();
    pctx.fillStyle = base;
    pctx.fill();
    pctx.restore();
  }

  // An ellipse at its exact size and place. ellipse() snaps both to whole
  // grid units, which in an eye four units across turned the iris and the
  // pupil into the same circle and would make a small change of gaze
  // either vanish or jump a whole unit.
  function ellipseF(x, y, rx, ry, c) {
    pctx.fillStyle = c;
    pctx.beginPath();
    pctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    pctx.fill();
  }
  // One eye, the same shape for both sides so they can never be mismatched
  // in size. mode picks the expression; blink is 0 (open) to 1 (closed);
  // gx and gy are the gaze, -1..1, which move only the iris, the pupil and
  // the highlights, never the eye's outline or the lash.
  //
  // A blink is the upper lid coming down: skin fills in from above along a
  // curve that runs from the open lash line to the closed-eye line, the lash
  // travelling with it, so the iris is covered progressively rather than the
  // open eye swapping for a closed line. The highlights go out before the
  // lid reaches them. Closed and happy expressions do not blink again.
  function drawSimpleEye(cx, cy, mode, blink, gx, gy) {
    mode = mode || 'open';
    if (mode === 'blink') { mode = 'open'; blink = 1; }
    // Which way is out from the face: the outer corner of the left eye is
    // on the left.
    const side = cx < 92 ? -1 : 1;
    if (mode === 'happy') {
      // A low arc with the lash's tail, rather than a steep ^ that read as
      // an emoji.
      bezierLine([cx - 2, cy + 0.2], [[cx - 0.8, cy - 0.9, cx + 0.8, cy - 0.9, cx + 2, cy + 0.2]], PAL.lid, STROKE.seam);
      line([[cx + 2 * side, cy + 0.2], [cx + 2.5 * side, cy - 0.2]], PAL.lid, STROKE.fine);
      return;
    }
    if (mode === 'shut') {
      bezierLine([cx - 2, cy], [[cx - 0.6, cy + 1, cx + 0.6, cy + 1, cx + 2, cy]], PAL.lid, STROKE.edge);
      line([[cx - 1.4, cy - 1.6], [cx + 1.4, cy - 1.6]], PAL.skinShadow, STROKE.fine);
      return;
    }
    if (mode === 'soft') {
      bezierLine([cx - 2, cy + 0.2], [[cx - 0.9, cy + 0.7, cx + 0.9, cy + 0.7, cx + 2, cy + 0.2]], PAL.lid, STROKE.seam);
      return;
    }
    // Thinking looks up with the lids a little lowered, not wide open.
    const b = Math.max(mode === 'up' ? 0.22 : 0, Math.min(1, blink || 0));
    const wide = mode === 'wide', narrow = mode === 'narrow', droop = mode === 'droop';
    const up = mode === 'up' ? 0.5 : 0;
    // A touch wider than tall, an almond more than a marble.
    const rx = wide ? 2.4 : 2.12, ry = narrow ? 1.2 : (wide ? 2.2 : 1.9);
    const ey = cy - up;
    // Gaze, kept inside the eye: at most about half a unit across and a
    // third of a unit up or down.
    const ox = Math.max(-1, Math.min(1, gx || 0)) * 0.45;
    const oy = Math.max(-1, Math.min(1, gy || 0)) * 0.3 - up * 0.4;

    pctx.save();
    pctx.beginPath();
    pctx.ellipse(cx, ey, rx, ry, 0, 0, Math.PI * 2);
    pctx.clip();
    // Dark base, the iris with its lit lower half, the pupil, then the lid's
    // shadow across the top of the eye, which stays put while the iris
    // looks about under it.
    pctx.fillStyle = PAL.eyeDeep;
    pctx.fill();
    ellipseF(cx + ox, ey + 0.55 + oy, wide ? 1.6 : 1.4, wide ? 1.55 : 1.45, PAL.eyeBlue);
    ellipseF(cx + ox, ey + 1.15 + oy, wide ? 1.0 : 0.88, 0.58, PAL.eyeLight);
    ellipseF(cx + ox, ey + 0.3 + oy, 0.6, 0.8, PAL.lid);
    ellipseF(cx, ey - ry * 0.68, rx * 0.95, ry * 0.44, PAL.lid);
    if (b < 0.45) {
      // One strong catchlight and one much smaller one, riding with the
      // iris. The strong one is high on the side toward the gate, where the
      // light on the rest of her comes from.
      ellipseF(cx + 0.5 + ox, ey - 0.4 + oy, 0.52, 0.48, PAL.eyeHi);
      ellipseF(cx - 0.65 + ox, ey + 1.0 + oy, 0.26, 0.26, PAL.eyeHi);
    }
    pctx.restore();

    // The lash line, open (or drooping) at b = 0 and the closed-eye curve at
    // b = 1, with the lid's skin filling everything above it.
    const L0 = droop
      ? [cx - 2.2, ey - 1.2, cx, ey - 1.4, cx + 1.2, ey - 0.7, cx + 2.3, ey + 0.4]
      : [cx - 2.2, ey - ry * 0.8, cx, ey - ry * 1.02, cx + 1.2, ey - ry * 0.55, cx + 2.5, ey - 0.25];
    const L1 = [cx - 2, cy, cx - 0.8, cy + 0.6, cx + 0.8, cy + 0.6, cx + 2, cy];
    const Lb = L0.map((v, i) => v + (L1[i] - v) * b);
    if (b > 0) {
      pctx.fillStyle = PAL.skin;
      pctx.beginPath();
      pctx.moveTo(cx - rx - 0.5, ey - ry - 0.6);
      pctx.lineTo(Lb[0] - 0.3, Lb[1]);
      pctx.bezierCurveTo(Lb[2], Lb[3], Lb[4], Lb[5], Lb[6] + 0.3, Lb[7]);
      pctx.lineTo(cx + rx + 0.6, ey - ry - 0.6);
      pctx.closePath();
      pctx.fill();
    }
    // The upper lash is the eye's heaviest line, with a small flick past
    // the outer corner that goes as the lid closes.
    bezierLine([Lb[0], Lb[1]], [[Lb[2], Lb[3], Lb[4], Lb[5], Lb[6], Lb[7]]], b > 0.85 ? PAL.lid : PAL.hairDeep, STROKE.seam);
    if (b < 0.5 && mode !== 'droop') {
      const ex = side > 0 ? Lb[6] : Lb[0], eyy = side > 0 ? Lb[7] : Lb[1];
      line([[ex - 0.2 * side, eyy - 0.05], [ex + 0.5 * side, eyy - 0.5]], PAL.hairDeep, STROKE.fine);
    }
    // A soft lower edge under the open eye, fading out as it closes.
    if (b < 0.6) bezierLine([cx - 1.3, ey + ry + 0.15], [[cx - 0.4, ey + ry + 0.55, cx + 0.5, ey + ry + 0.55, cx + 1.4, ey + ry + 0.1]], PAL.skinShadow, STROKE.hairline);
  }
  // Eyebrows, defined once for the left side and mirrored across the
  // face's x=92 centreline, so the pair can never end up asymmetric. Each is
  // a thin shape along a shallow arch, thickest near the middle and tapering
  // to both ends; a straight stroke of one width read as a painted dash.
  const BROW_SHAPES = {
    flat: [85, 34.5, 89, 34],
    raised: [85, 32.8, 89, 32.3],
    down: [85, 35.4, 89, 35],
    angryIn: [85, 33.6, 89, 35.5],
    sadIn: [85, 35.5, 89, 32.5],
  };
  function drawBrow(shape, mirror) {
    const bw = BROW_SHAPES[shape] || BROW_SHAPES.flat;
    const X = v => mirror ? 184 - v : v;
    const x0 = bw[0], y0 = bw[1], x1 = bw[2], y1 = bw[3];
    const N = 8, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = x0 + (x1 - x0) * t;
      // The arch lifts the middle a little above the straight line.
      const y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 0.4;
      const h = 0.08 + Math.pow(Math.sin(t * Math.PI), 0.7) * 0.36 * (1 - t * 0.35);
      top.push([X(x), y - h]);
      bot.push([X(x), y + h]);
    }
    // The hair's shadow tone rather than its darkest: slim and pale, they
    // sit under the fringe instead of competing with the lashes.
    pctx.fillStyle = PAL.hairShadow;
    pctx.beginPath();
    pctx.moveTo(top[0][0], top[0][1]);
    for (const p of top) pctx.lineTo(p[0], p[1]);
    for (let i = bot.length - 1; i >= 0; i--) pctx.lineTo(bot[i][0], bot[i][1]);
    pctx.closePath();
    pctx.fill();
  }
  // The mouth, kept small and light: drawn about 15% narrower than its
  // numbers, at the fine weight, so it no longer outweighs the eyes.
  function drawMouth(style) {
    const c = '#a85f78';
    pctx.save();
    pctx.translate(92, 0);
    pctx.scale(0.85, 1);
    pctx.translate(-92, 0);
    drawMouthShape(style, c);
    pctx.restore();
  }
  function drawMouthShape(style, c) {
    if (style === 'flat') { bezierLine([90.6, 45.3], [[91.6, 45.5, 92.6, 45.5, 93.4, 45.3]], c, STROKE.fine); return; }
    if (style === 'smile') { bezierLine([89.8, 44.8], [[91, 46.1, 93, 46.1, 94.2, 44.8]], c, STROKE.fine); return; }
    if (style === 'smirk') { bezierLine([90.5, 45.3], [[91.6, 45.95, 93, 45.85, 94.1, 44.8]], c, STROKE.fine); return; }
    if (style === 'frown') { bezierLine([90.8, 45.5], [[91.6, 44.7, 92.4, 44.7, 93.2, 45.5]], c, STROKE.fine); return; }
    if (style === 'open') {
      ellipseF(92, 45.4, 0.86, 1.1, PAL.indigoDeep);
      ellipseF(92, 46.0, 0.5, 0.3, PAL.blush);
      return;
    }
    if (style === 'tense') { line([[89.9, 45.4], [92, 45], [94.1, 45.4]], c, STROKE.fine); return; }
    if (style === 'soft') { bezierLine([90.8, 44.9], [[91.6, 45.8, 92.4, 45.8, 93.2, 44.9]], c, STROKE.fine); return; }
    bezierLine([90.6, 45], [[91.5, 45.9, 92.5, 45.9, 93.4, 45]], c, STROKE.fine);
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
  // Her hand, the same one for both sides, both views and every moment of
  // the cast. Frame: wrist at (x, y), fingers pointing down the local y
  // axis, s the side the thumb is on (+1 or -1), open 0..1 from a relaxed
  // hanging hand to the open casting hand.
  //
  // The palm and fingers are one path built from explicit curves. Each
  // fingertip is a true round cap, two quarter arcs meeting the finger's
  // sides with matching tangents; run through a generic spline, tip and
  // valley vertices came out as points and the open hand read as flames or
  // a claw. Between two fingers is a single U-shaped curve whose depth is
  // the gap: nearly nothing on the relaxed hand, so the fingers sit as one
  // soft mass, opening only in the second half of the unfolding. The path
  // has the same pieces in every pose, so nothing appears or vanishes.
  //
  // Finger lengths run middle, index, ring, little, and the thumb is a
  // short tapered lobe off the heel of the palm with a round tip, lying
  // along the fingers when relaxed and turned out about 34 degrees open.
  //        [centre x, half width, tip y closed, tip y open], little to index
  const HAND_FINGERS = [
    [-1.95, 0.6, 6.4, 7.5],
    [-0.7, 0.62, 7.0, 8.7],
    [0.55, 0.63, 7.2, 9.3],
    [1.8, 0.61, 7.0, 8.85],
  ];
  function drawCastHand(x, y, s, open) {
    const k = 1.05, q = 0.552;
    const u = Math.max(0, Math.min(1, open / 0.8));
    const m = (a, b) => a + (b - a) * u;
    // Gaps between the fingers only start to show a third of the way open.
    const g0 = Math.max(0, Math.min(1, (u - 0.35) / 0.65));
    const gap = g0 * g0 * (3 - 2 * g0);
    const spread = u * 0.18;
    const P = (lx, ly) => [x + lx * s * k, y + ly * k];
    const seg = (a, b, c) => [...P(a[0], a[1]), ...P(b[0], b[1]), ...P(c[0], c[1])];

    const fing = HAND_FINGERS.map(f => {
      const cx = f[0] + (f[0] - 0.52) * spread, r = f[1], tip = m(f[2], f[3]);
      return { cx, r, tip, capY: tip - r };
    });
    const W1 = [-1.85, -0.4], PL0 = [-2.3, 1.6], PL = [m(-2.45, -2.6), 4.0];
    const PR = [m(2.45, 2.6), 4.6], PR0 = [2.3, 1.6], W2 = [1.85, -0.4];
    const segs = [];
    segs.push(seg([-2.05, 0.3], [-2.25, 0.9], PL0));
    segs.push(seg([-2.4, 2.4], [PL[0], 3.2], PL));
    const f0 = fing[0];
    segs.push(seg([PL[0] - 0.05, PL[1] + (f0.capY - PL[1]) * 0.5], [f0.cx - f0.r, f0.capY - (f0.capY - PL[1]) * 0.3], [f0.cx - f0.r, f0.capY]));
    fing.forEach((f, i) => {
      // The cap: two quarter arcs over the tip.
      segs.push(seg([f.cx - f.r, f.capY + q * f.r], [f.cx - q * f.r, f.tip], [f.cx, f.tip]));
      segs.push(seg([f.cx + q * f.r, f.tip], [f.cx + f.r, f.capY + q * f.r], [f.cx + f.r, f.capY]));
      const n = fing[i + 1];
      if (n) {
        // The valley to the next finger: vertical at both ends so it meets
        // both caps smoothly, and deepest halfway between them.
        const ends = (f.capY + n.capY) / 2;
        const vy = Math.min(f.capY, n.capY) - m(0.05, 0.15) - 0.6 * gap;
        const cy = (vy - 0.25 * ends) / 0.75;
        segs.push(seg([f.cx + f.r, cy], [n.cx - n.r, cy], [n.cx - n.r, n.capY]));
      }
    });
    const fl = fing[3];
    segs.push(seg([fl.cx + fl.r, fl.capY - (fl.capY - PR[1]) * 0.3], [PR[0] + 0.05, PR[1] + (fl.capY - PR[1]) * 0.5], PR));
    segs.push(seg([2.55, 3.5], [2.45, 2.3], PR0));
    segs.push(seg([2.25, 0.9], [2.05, 0.3], W2));
    const start = P(W1[0], W1[1]);

    // Thumb, in its own frame: along d from a root on the heel of the palm,
    // n across it toward the outside.
    const phi = m(0.12, 0.6), len = m(3.4, 3.6), tr = 0.72, root = m(1.35, 1.45);
    const d = [Math.sin(phi), Math.cos(phi)], nn = [Math.cos(phi), -Math.sin(phi)];
    const R = [m(2.0, 2.1), m(1.4, 1.2)];
    const at = (a, b) => [R[0] + d[0] * a + nn[0] * b, R[1] + d[1] * a + nn[1] * b];
    const c0 = len - tr;
    const tSegs = [
      seg(at(0.1, 0.5), at(0.2, root), at(0.7, root)),
      seg(at(0.7 + (c0 - 0.7) * 0.5, root - 0.1), at(c0 - 0.5, tr + 0.05), at(c0, tr)),
      seg(at(c0 + q * tr, tr), at(len, q * tr), at(len, 0)),
      seg(at(len, -q * tr), at(c0 + q * tr, -tr), at(c0, -tr)),
      seg(at(c0 - 1, -0.85), at(2.1, -0.98), at(1.3, -1.0)),
      seg(at(0.8, -1.02), at(0.2, -1.0), at(0, -0.9)),
    ];
    const tStart = P(...at(0, -0.9));

    // The hand's edge is one unbroken line from part way up each side of
    // the palm, never across the wrist: stroked a piece at a time, every
    // fingertip got its own rounded line ends and read as a separate claw.
    // It goes down before the skin, so only its outer half survives; laid
    // over the skin, a full-width line filled each shallow valley and cut a
    // dark notch between the fingertips. Then the thumb over both, so the
    // hand's edge disappears where the thumb joins and there is no dark seam
    // between them; the thumb's own edge runs down its outer side and round
    // its tip.
    bezierLine(P(PL0[0], PL0[1]), segs.slice(1, segs.length - 1), PAL.outline, STROKE.edge);
    bezierShape(start, segs, PAL.skin);
    // Short partings in shade, not outline, running back from each valley.
    // The middle one is always there; the outer two grow with the gaps, so
    // the relaxed hand keeps a single crease.
    for (let i = 0; i < 3; i++) {
      const a = fing[i], b = fing[i + 1];
      const len = i === 1 ? m(1.1, 0.8) : 0.9 * gap;
      if (len < 0.05) continue;
      const vx = (a.cx + a.r + b.cx - b.r) / 2, vy = Math.min(a.capY, b.capY) - m(0.05, 0.15) - 0.6 * gap;
      line([P(vx, vy - 0.1), P(vx - 0.05, vy - 0.1 - len)], PAL.skinShadow, i === 1 ? STROKE.fine : STROKE.hairline);
    }
    bezierShape(tStart, tSegs, PAL.skin);
    bezierLine(P(...at(0.7, root)), tSegs.slice(1, 4), PAL.outline, STROKE.seam);

    // A hint of the thumb's fold, and a little shade down the side of the
    // palm away from the thumb.
    bezierLine(P(...at(1.5, -0.75)), [seg(at(2, -0.8), at(len - 1.6, -0.65), at(len - 1.2, -0.55))], PAL.skinShadow, STROKE.fine);
    bezierLine(P(-2.0, 0.6), [seg([-2.3, 1.8], [-2.35, 3.0], [-2.2, 4.2])], PAL.skinShadow, STROKE.seam);
  }

  // A limb as a filled shape that tapers from w0 at its start to w1 at its
  // end along one cubic, with round ends. A stroke holds one width the
  // whole way, and a raised forearm drawn that way read as a hose.
  function taperedLimb(start, s, w0, w1, c) {
    const N = 12, L = [], Rt = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, v = 1 - t;
      const x = v * v * v * start[0] + 3 * v * v * t * s[0] + 3 * v * t * t * s[2] + t * t * t * s[4];
      const y = v * v * v * start[1] + 3 * v * v * t * s[1] + 3 * v * t * t * s[3] + t * t * t * s[5];
      const dx = 3 * v * v * (s[0] - start[0]) + 6 * v * t * (s[2] - s[0]) + 3 * t * t * (s[4] - s[2]);
      const dy = 3 * v * v * (s[1] - start[1]) + 6 * v * t * (s[3] - s[1]) + 3 * t * t * (s[5] - s[3]);
      const len = Math.hypot(dx, dy) || 1, h = (w0 + (w1 - w0) * t) / 2;
      L.push([x - dy / len * h, y + dx / len * h]);
      Rt.push([x + dy / len * h, y - dx / len * h]);
    }
    pctx.fillStyle = c;
    pctx.beginPath();
    pctx.moveTo(L[0][0], L[0][1]);
    for (const p of L) pctx.lineTo(p[0], p[1]);
    for (let i = Rt.length - 1; i >= 0; i--) pctx.lineTo(Rt[i][0], Rt[i][1]);
    pctx.closePath();
    pctx.fill();
    ellipse0(start[0], start[1], w0 / 2, c);
    ellipse0(s[4], s[5], w1 / 2, c);
  }
  // An unrounded circle, for the limb ends; ellipse() snaps to whole grid
  // units, which would put a step at each end of a smooth limb.
  function ellipse0(x, y, r, c) {
    pctx.fillStyle = c;
    pctx.beginPath();
    pctx.arc(x, y, r, 0, Math.PI * 2);
    pctx.fill();
  }

  // The ahoge: one strand standing up off the crown and curling over. sw
  // is how far its tip has swung; it is the lightest thing on her, so it
  // swings further and later than any lock of hair. Root at (x, y).
  // Short, with a slight S: out of the parting, bending one way and then
  // tipping the other at the end, tapering to a point, and at rest leaning
  // a little to one side rather than standing straight up. Its edge is a
  // hairline and only along the upper part, so it reads as a strand and
  // not as a horn.
  function drawAhoge(x, y, sw) {
    const tipX = x + 2.7 + sw, tipY = y - 5.4;
    const start = [x - 0.6, y + 0.2];
    const segs = [
      [x - 1.3, y - 2.2, x + 0.4 + sw * 0.5, y - 5.6, tipX, tipY],
      [x + 1.1 + sw * 0.5, y - 4.2, x + 0.5, y - 2.2, x + 0.6, y]
    ];
    bezierShape(start, segs, PAL.hairLight);
    bezierLine([x - 0.9, y - 2], [[x - 0.6, y - 4, x + 0.8 + sw * 0.5, y - 5.6, tipX, tipY]], PAL.hairShadow, STROKE.hairline);
  }

  // Where her right wrist is for a given castExt, in grid units before the
  // shoulder drop: hanging at her side at 0, up by her head at 1. Shared by
  // the arm drawing and by handPos, so the spell energy drawn on the main
  // canvas stays in her hand the whole way up.
  function castWrist(c, fabricTrail) {
    const rx = 129 + (fabricTrail || 0) * 0.35, ry = 86.8;
    return [rx + (139 - rx) * c, ry + (38.2 - ry) * c];
  }

  // Both body sprites share one buffer, and at 60fps most frames were
  // redrawing a picture identical to the one already in it. The sway and bob
  // phase is quantised to 24 steps per cycle and everything else that changes
  // the drawing is folded into a key; when the key matches the last one the
  // draw is skipped and the existing buffer is blitted again.
  //
  // 24 steps is not a compromise, it is the rate hand-drawn animation runs at.
  // The tag keeps the two views apart, since they write to the same buffer.
  //
  // The one thing that can invalidate the buffer from outside is tintBuffer,
  // which paints into it after the draw returns. Skipping the draw would let
  // that tint stack on itself and the sprite would darken frame by frame, so
  // the caller clears the key whenever it tints. The flash lives on the pose
  // rather than in opts, so it cannot be caught by the key itself.
  let _spriteKey = '';
  function invalidateSprite() { _spriteKey = ''; }
  //
  // castExt gets 32 steps where everything else gets 8. It moves the whole
  // right arm about fifty units, so at 8 steps the raise went up in jumps of
  // six, more than ten screen pixels at 1080p, however smoothly castExt ran.
  function spriteKey(tag, t, o) {
    const q = v => Math.round((v || 0) * 8);
    return tag + Math.round(t * 24) + ':' +
      q(o.lean) + ',' + q(o.trail) + ',' + q(o.whip) + ',' + q(o.droop) + ',' +
      q(o.walkStep) + ',' + Math.round((o.castExt || 0) * 32) + ',' + q(o.swayAmp) + ',' + q(o.bobAmp) +
      ':' + (o.expression || '') + ':' +
      // Blink in tenths, gaze in tenths of its range, head turn in
      // thousandths of a radian: fine enough to move smoothly, coarse
      // enough that a still face still hits the cache.
      Math.round((o.blinkAmount != null ? o.blinkAmount : (o.blink ? 1 : 0)) * 10) + ',' +
      Math.round((o.gazeX || 0) * 10) + ',' + Math.round((o.gazeY || 0) * 10) + ',' +
      Math.round((o.headTurn || 0) * 1000);
  }

  function drawKanade(t, opts) {
    opts = opts || {};
    const _key = spriteKey('f', t, opts);
    if (_key === _spriteKey) return;
    _spriteKey = _key;
    const sway = Math.sin(t * Math.PI * 2) * (opts.swayAmp != null ? opts.swayAmp : 1.5);
    const bob = Math.sin(t * Math.PI * 2) * (opts.bobAmp != null ? opts.bobAmp : 1);
    const lean = opts.lean || 0;
    const castExt = opts.castExt || 0;
    const trail = opts.trail || 0;
    const whip = opts.whip || 0;
    const droop = opts.droop || 0;
    const walkStep = opts.walkStep || 0;
    // Her left shoulder sits a little lower than her right at rest, so that
    // standing still she is not a mirror image of herself. Raising the arm
    // to cast lifts it level again.
    const shoulderDrop = 1.5 * (1 - castExt);
    // The rest of the same stance, so the dropped shoulder reads as her
    // weight settling rather than an arm set low: the head tips a little
    // toward the high shoulder, the waist tilts the other way, and the far
    // leg, off the weight, rests its heel a little higher.
    const relaxed = 1 - castExt;
    // headTurn is the head answering the scene, a hundredth of a radian or
    // so toward the thought bubble or away from the rising spell, on top of
    // the resting tilt; it is clamped so it can never become a nod.
    const headTilt = -0.012 * relaxed + Math.max(-0.012, Math.min(0.012, opts.headTurn || 0));
    const hipTilt = 0.6 * relaxed;
    const fabricTrail = trail * 0.75 + whip;
    // The hair behind her follows droop only halfway. Taken all the way, its
    // ends pushed out below the hem as one grey spike under the gown.
    const hairDrop = Math.min(droop, 0.5);

    pctx.clearRect(0, 0, GRID_W, GRID_H);
    pctx.save();
    pctx.translate(lean, bob);

    bezierShape([79, 17], [
      [67, 21, 61, 39, 61 + trail * 0.08, 68],
      [61 + trail * 0.2, 98, 60 + trail * 0.5, 128 + hairDrop * 8, 54 + trail * 0.7, 141 + hairDrop * 7],
      [59 + trail * 0.65, 147 + hairDrop * 5, 66 + trail * 0.45, 145 + hairDrop * 5, 71 + trail * 0.35, 138 + hairDrop * 7],
      [73 + trail * 0.25, 149 + hairDrop * 6, 80 + trail * 0.15, 154 + hairDrop * 4, 84, 139 + hairDrop * 6],
      [88, 151 + hairDrop * 5, 94, 153 + hairDrop * 4, 98, 137 + hairDrop * 6],
      [104 + trail * 0.15, 151 + hairDrop * 5, 112 + trail * 0.35, 151 + hairDrop * 5, 116 + trail * 0.6, 139 + hairDrop * 7],
      [122 + trail * 0.7, 124 + hairDrop * 8, 121 + trail * 0.2, 78, 119, 57],
      [116, 31, 108, 18, 99, 16],
      [92, 12, 85, 13, 79, 17]
    ], PAL.hairMid);

    bezierShape([78, 24], [
      [68, 35, 65, 66, 66 + trail * 0.15, 96],
      [65 + trail * 0.35, 119, 61 + trail * 0.6, 138 + hairDrop * 7, 55 + trail * 0.7, 141 + hairDrop * 7],
      [61 + trail * 0.55, 144 + hairDrop * 5, 68 + trail * 0.35, 139 + hairDrop * 6, 72, 121],
      [74, 87, 75, 48, 78, 24]
    ], PAL.hairShadow);
    bezierShape([103, 20], [
      [112, 31, 116, 58, 115 + trail * 0.12, 88],
      [116 + trail * 0.35, 116, 116 + trail * 0.62, 135 + hairDrop * 7, 112 + trail * 0.7, 148 + hairDrop * 6],
      [107 + trail * 0.5, 150 + hairDrop * 5, 102 + trail * 0.3, 140 + hairDrop * 6, 100, 123],
      [101, 87, 100, 43, 103, 20]
    ], PAL.hairDeep);
    // Dark outline along the outer edge of each side-hair strand only -
    // this is exactly where hair drapes right next to the sleeve fabric
    // and the two were blending into one shape with no separating line.
    bezierLine([78, 24], [
      [68, 35, 65, 66, 66 + trail * 0.15, 96],
      [65 + trail * 0.35, 119, 61 + trail * 0.6, 138 + hairDrop * 7, 55 + trail * 0.7, 141 + hairDrop * 7]
    ], PAL.outline, STROKE.seam);
    bezierLine([103, 20], [
      [112, 31, 116, 58, 115 + trail * 0.12, 88],
      [116 + trail * 0.35, 116, 116 + trail * 0.62, 135 + hairDrop * 7, 112 + trail * 0.7, 148 + hairDrop * 6]
    ], PAL.outline, STROKE.seam);
    bezierShape([84, 20], [
      [78, 38, 77, 72, 78 + trail * 0.1, 101],
      [78 + trail * 0.35, 121, 76 + trail * 0.52, 136 + hairDrop * 6, 72 + trail * 0.6, 143 + hairDrop * 6],
      [78 + trail * 0.4, 141 + hairDrop * 4, 83 + trail * 0.2, 124 + hairDrop * 5, 84, 101],
      [86, 70, 87, 39, 84, 20]
    ], PAL.hairLight);
    bezierShape([94, 18], [
      [99, 37, 101, 67, 101 + trail * 0.08, 96],
      [102 + trail * 0.3, 119, 105 + trail * 0.5, 134 + hairDrop * 6, 109 + trail * 0.58, 143 + hairDrop * 6],
      [103 + trail * 0.38, 140 + hairDrop * 4, 97 + trail * 0.18, 124 + hairDrop * 5, 96, 101],
      [93, 67, 91, 35, 94, 18]
    ], PAL.hairLight);
    bezierLine([70, 35], [[68, 64, 70 + trail * 0.2, 101, 64 + trail * 0.55, 136 + hairDrop * 6]], PAL.hairDeep, STROKE.band);
    bezierLine([81, 26], [[80, 54, 82 + trail * 0.12, 91, 78 + trail * 0.42, 128 + hairDrop * 5]], PAL.hairHi, STROKE.strap);
    bezierLine([108, 28], [[111, 56, 109 + trail * 0.15, 92, 113 + trail * 0.48, 132 + hairDrop * 5]], PAL.hairShadow, STROKE.band);

    // Second pass over the back hair. It is the largest single area on the
    // sprite and was three flat fills, so it carried none of the detail the
    // rest of her has. Locks are built from alternating tones at uneven
    // spacing: evenly spaced lines of one colour read as corduroy.
    bezierLine([65, 40], [[62, 66, 61 + trail * 0.3, 96, 58 + trail * 0.6, 126 + hairDrop * 6]], PAL.hairDeep, STROKE.edge);
    bezierLine([70, 30], [[68, 58, 67 + trail * 0.25, 90, 65 + trail * 0.55, 124 + hairDrop * 6]], PAL.hairLight, STROKE.fine);
    bezierLine([75, 46], [[73, 72, 72 + trail * 0.2, 100, 70 + trail * 0.45, 130 + hairDrop * 5]], PAL.hairShadow, STROKE.seam);
    bezierLine([113, 40], [[116, 66, 117 + trail * 0.3, 96, 120 + trail * 0.6, 126 + hairDrop * 6]], PAL.hairDeep, STROKE.edge);
    bezierLine([108, 34], [[110, 60, 111 + trail * 0.25, 92, 113 + trail * 0.55, 124 + hairDrop * 6]], PAL.hairLight, STROKE.fine);
    bezierLine([103, 48], [[105, 74, 106 + trail * 0.2, 102, 108 + trail * 0.45, 130 + hairDrop * 5]], PAL.hairShadow, STROKE.seam);

    // Sheen band across the back hair, the anime convention for a lit head of
    // hair, kept low and broken so it does not look like a painted stripe.
    bezierLine([66, 52], [[72, 47, 79, 45, 84, 47]], PAL.hairHi, STROKE.band);
    bezierLine([100, 47], [[106, 45, 113, 47, 118, 53]], PAL.hairHi, STROKE.band);

    // Tips: a few strands breaking away from the mass at the bottom so the
    // hair does not end on one clean edge.
    bezierLine([60 + trail * 0.6, 120], [[57 + trail * 0.7, 132, 56 + trail * 0.8, 142, 58 + trail * 0.9, 143 + hairDrop * 3]], PAL.hairMid, STROKE.seam);
    bezierLine([118 + trail * 0.6, 122], [[121 + trail * 0.7, 134, 122 + trail * 0.8, 144, 120 + trail * 0.9, 147 + hairDrop * 4]], PAL.hairMid, STROKE.seam);
    bezierLine([88, 130], [[87, 140, 87, 148, 88, 148 + hairDrop * 4]], PAL.hairShadow, STROKE.fine);

    // Robe panels trailing behind her. Curves rather than polygons: as
    // polygons their corners came out under the hem as hard points, reading
    // as spikes growing off the gown instead of as cloth.
    clothPanel([[63 + fabricTrail * 0.15, 72], [
      [52 + fabricTrail * 0.4, 84, 43 + fabricTrail * 0.8, 99, 39 + fabricTrail, 117 + droop * 12],
      [41 + fabricTrail, 128 + droop * 10, 50 + fabricTrail * 0.7, 132 + droop * 10, 59 + fabricTrail * 0.45, 128 + droop * 10],
      [69, 119, 76, 101, 78, 91]
    ]], PAL.indigoDeep);
    clothPanel([[117 + fabricTrail * 0.15, 72], [
      [128 + fabricTrail * 0.4, 85, 140 + fabricTrail * 0.8, 104, 144 + fabricTrail, 125 + droop * 12],
      [142 + fabricTrail, 137 + droop * 10, 131 + fabricTrail * 0.7, 140 + droop * 10, 121 + fabricTrail * 0.45, 133 + droop * 10],
      [111, 119, 104, 101, 102, 91]
    ]], PAL.indigo);

    if (Math.abs(walkStep) > 0.04) {
      const backFoot = walkStep * 4;
      const bl = smoothOutline([[82, 105], [88, 105], [88 - backFoot * 0.25, 143], [85 - backFoot, 158], [79 - backFoot, 157], [81 - backFoot * 0.4, 132]], 0.8);
      bezierShape(bl[0], bl[1], PAL.skinShadow);
      const bb = smoothOutline([[80 - backFoot, 139], [88 - backFoot * 0.4, 140], [88 - backFoot, 160], [81 - backFoot, 164], [76 - backFoot, 160]], 0.6);
      bezierShape(bb[0], bb[1], PAL.bootDeep);
      const bs = smoothOutline([[78 - backFoot, 159], [90 - backFoot, 159], [91 - backFoot, 163], [83 - backFoot, 166], [77 - backFoot, 163]], 0.6);
      bezierShape(bs[0], bs[1], PAL.boot);
    }
    // The far leg's boot, just showing under the hem beside the near one, so
    // she does not stand on a single leg down the middle of the gown. Kept
    // in the deep tone with only a dark strap, so it sits back behind the
    // near boot, and only a little shorter than it: much shorter and it read
    // as a stump.
    if (Math.abs(walkStep) <= 0.04) {
      const farBoot = smoothOutline([[80, 148], [87, 148], [88, 164], [87, 172 - hipTilt], [81, 173 - hipTilt], [79.5, 164]], 0.6);
      bezierShape(farBoot[0], farBoot[1], PAL.bootDeep);
      // A thin lit edge down its outer side, so the dark boot does not sink
      // into the dark behind her and leave one leg under the gown.
      bezierLine([80.2, 151], [[79.6, 157, 79.7, 164, 81, 171.5 - hipTilt]], PAL.boot, STROKE.seam);
      bezierLine([82.2, 151], [[82.4, 157, 82.6, 163, 82.8, 169]], PAL.boot, STROKE.band);
      bezierLine([80.5, 158], [[82, 159, 85, 159, 87, 158]], PAL.goldDark, STROKE.fine);
      line([[80.8, 171.6 - hipTilt], [86.6, 170.8 - hipTilt]], PAL.outline, STROKE.fine);
    }
    // Leg, run further down than the gown's hem so a real length of it shows
    // in the skirt's front split. At 4.1 heads she reads as stunted, and the
    // grid is only 180 tall so the ratio cannot be fixed by height alone:
    // what sells the change is how much leg is visible, not the number.
    const leg = smoothOutline([[86, 92], [95, 92], [99, 126], [97, 158], [92, 158], [87, 128]], 0.8);
    bezierShape(leg[0], leg[1], PAL.skin);
    bezierLine(leg[0], leg[1].slice(0, 4), PAL.outline, STROKE.fine);
    // Soft contact shadow where the gown hem falls across the leg, so the
    // leg reads as clearly in front of/below the robe instead of the two
    // silhouettes just merging together at that overlap.
    bezierLine([87, 123], [[91, 126, 95, 126, 99, 123]], PAL.skinShadow, STROKE.band);
    // Knee crease further down, splitting the leg into a clear thigh/calf
    // read instead of one straight undifferentiated column, plus a soft
    // shin-side shadow suggesting the calf's own curve and a slight
    // weight-bearing bend rather than a perfectly rigid standing pole.
    bezierLine([90, 136], [[93, 138, 96, 138, 98, 136]], PAL.skinShadow, STROKE.edge);
    bezierLine([97.5, 128], [[97, 140, 96, 152, 95.5, 160]], PAL.skinShadow, STROKE.edge);
    // Ankle boot rather than the old shin-high block: narrower, starting far
    // lower, so the leg above it has somewhere to be. The bulk of the old one
    // ate most of the visible leg and left the whole lower half looking
    // truncated.
    const boot = smoothOutline([[91, 145], [99, 146], [100, 168], [95, 173], [89, 169], [89.5, 155]], 0.6);
    bezierShape(boot[0], boot[1], PAL.bootDeep);
    // Body of the boot in the mid tone, with the pale trim kept to a thin
    // strip. Filled with the highlight tone it read as a white sock rather
    // than as the near-black boot the rest of the outfit is built around.
    const bootMid = smoothOutline([[92, 148], [97, 149], [96.5, 166], [94, 168], [91.5, 165], [91.5, 154]], 0.6);
    bezierShape(bootMid[0], bootMid[1], PAL.boot);
    const sole = smoothOutline([[89, 167], [101, 167], [102, 172], [96, 175], [89, 172]], 0.5);
    bezierShape(sole[0], sole[1], PAL.bootDeep);
    rect(92.6, 150, 0.9, 15, PAL.bootHi);
    ellipse(95, 158, 2.4, 2, PAL.gold);
    ellipse(95, 158, 1, 1, PAL.bootDeep);
    rect(91.4, 149, 0.7, 17, PAL.goldDark);
    // Thin gold ankle strap, picking up the trim on the rest of the outfit.
    bezierLine([89.5, 152], [[92, 154, 96, 154, 99.5, 152]], PAL.gold, STROKE.fine);

    const robeL = smoothOutline([[78, 75], [68, 86], [58 + fabricTrail * 0.15, 112], [52 + fabricTrail * 0.45, 142], [74 + fabricTrail * 0.15, 151], [89, 142], [94, 96]], 0.45);
    const robeR = smoothOutline([[102, 74], [114, 86], [124 + fabricTrail * 0.15, 113], [132 + fabricTrail * 0.45, 146], [108 + fabricTrail * 0.15, 154], [92, 142], [87, 96]], 0.45);
    clothPanel(robeL, PAL.creamShadow);
    clothPanel(robeR, PAL.creamMid);
    // Outline along the widest outer edge of the gown's lower front panels
    // so the robe reads as one clear silhouette instead of merging into
    // whatever sits behind/beside it.
    bezierLine(robeL[0], robeL[1].slice(0, 4), PAL.outline, STROKE.seam);
    bezierLine(robeR[0], robeR[1].slice(0, 4), PAL.outline, STROKE.seam);
    clothPanel(smoothOutline([[86, 78], [75, 91], [67 + fabricTrail * 0.1, 118], [63 + fabricTrail * 0.35, 148], [86, 145], [92, 126], [94, 87]], 0.45), PAL.cream);
    clothPanel(smoothOutline([[94, 79], [107, 92], [116 + fabricTrail * 0.1, 121], [123 + fabricTrail * 0.35, 150], [101, 147], [93, 126], [87, 88]], 0.45), PAL.indigoMid);
    const split = smoothOutline([[91, 91], [100, 105], [103, 133], [100, 151], [92, 145], [87, 126]], 0.45);
    bezierShape(split[0], split[1], PAL.indigoDeep);
    const thigh = smoothOutline([[92, 103], [98, 116], [96.5, 145], [90.5, 145.5], [87, 126]], 0.35);
    bezierShape(thigh[0], thigh[1], PAL.skin);

    clothPanel(smoothOutline([[77, 49], [86, 45], [101, 47], [109, 53], [104, 73], [98, 84], [82, 83], [75, 72]], 0.5), PAL.cream);
    const bodiceL = smoothOutline([[76, 49], [84, 48], [88, 79], [80, 82], [74, 69]], 0.7);
    bezierShape(bodiceL[0], bodiceL[1], PAL.indigoMid);
    const bodiceShade = smoothOutline([[91, 47], [105, 50], [103, 57], [92, 55]], 0.6);
    bezierShape(bodiceShade[0], bodiceShade[1], PAL.creamShadow);
    const bodiceMid = smoothOutline([[88, 54], [96, 55], [102, 82], [92, 88], [83, 82]], 0.7);
    bezierShape(bodiceMid[0], bodiceMid[1], PAL.indigoDeep);

    clothPanel([[76, 52], [
      [68, 49, 61, 54, 58 + fabricTrail * 0.15, 64],
      [52 + fabricTrail * 0.35, 76, 42 + fabricTrail * 0.75, 87, 33 + fabricTrail, 92],
      [31 + fabricTrail, 98, 39 + fabricTrail * 0.9, 105, 47 + fabricTrail * 0.7, 101],
      [55 + fabricTrail * 0.45, 97, 61, 91, 66, 104],
      [72, 99, 77, 85, 76, 52]
    ]], PAL.creamMid, 2.2, 1.2);
    // Outline along the sleeve's own outer edge - same fix as the hair,
    // this is the other side of the "can't tell hair from sleeve" boundary.
    bezierLine([76, 52], [
      [68, 49, 61, 54, 58 + fabricTrail * 0.15, 64],
      [52 + fabricTrail * 0.35, 76, 42 + fabricTrail * 0.75, 87, 33 + fabricTrail, 92]
    ], PAL.outline, STROKE.seam);
    bezierShape([66, 71], [
      [57 + fabricTrail * 0.25, 79, 45 + fabricTrail * 0.65, 88, 36 + fabricTrail, 94],
      [42 + fabricTrail * 0.85, 99, 54 + fabricTrail * 0.5, 92, 64, 84],
      [66, 79, 67, 75, 66, 71]
    ], PAL.indigo);
    // Upper arm + forearm as two segments meeting at a real elbow bend
    // (same technique the block/cast poses already use), instead of one
    // smooth curve with no visible joint reaching too far down.
    bezierLine([74, 53], [[69, 58, 64, 64, 62 + fabricTrail * 0.15, 70]], PAL.skin, STROKE.limbUpper);
    bezierLine([62 + fabricTrail * 0.15, 70], [[58 + fabricTrail * 0.3, 78, 53 + fabricTrail * 0.42, 85, 49 + fabricTrail * 0.5, 90]], PAL.skin, STROKE.limb);
    bezierLine([72, 56], [[66, 62, 60 + fabricTrail * 0.2, 74, 51 + fabricTrail * 0.45, 91]], PAL.skinShadow, STROKE.edge);
    // Left hand, hanging relaxed off the end of the forearm above.

    // Small shoulder-socket shading where each arm actually meets the
    // torso, so the join reads clearly instead of the arm just vanishing
    // into the hair/collar/sleeve with no visible anchor point.
    ellipse(75, 53, 2.2, 1.6, PAL.skinShadow);
    ellipse(105, 54 + shoulderDrop, 2.2, 1.6, PAL.skinShadow);

    // Her right arm, one rig from hanging at her side to raised in the cast.
    // The sleeve drape hangs from the shoulder the whole time and the bare
    // arm lifts in front of it, the way the left arm lies over its own
    // sleeve. Built as two drawings, one for each state, the sleeve vanished
    // and a different one appeared the instant the cast began, and the hand
    // jumped from her hip to her chest.
    pctx.save();
    pctx.translate(0, shoulderDrop);
    clothPanel([[104, 52], [
      [113, 49, 121, 55, 124 + fabricTrail * 0.15, 65],
      [130 + fabricTrail * 0.35, 76, 140 + fabricTrail * 0.7, 87, 149 + fabricTrail, 92],
      [152 + fabricTrail, 99, 143 + fabricTrail * 0.9, 106, 135 + fabricTrail * 0.7, 102],
      [127 + fabricTrail * 0.45, 97, 120, 91, 115, 104],
      [109, 98, 104, 84, 104, 52]
    ]], PAL.creamMid, 2.2, 1.2);
    bezierLine([104, 52], [
      [113, 49, 121, 55, 124 + fabricTrail * 0.15, 65],
      [130 + fabricTrail * 0.35, 76, 140 + fabricTrail * 0.7, 87, 149 + fabricTrail, 92]
    ], PAL.outline, STROKE.seam);
    bezierShape([115, 72], [
      [125 + fabricTrail * 0.25, 80, 137 + fabricTrail * 0.65, 89, 146 + fabricTrail, 95],
      [140 + fabricTrail * 0.85, 101, 128 + fabricTrail * 0.5, 93, 117, 85],
      [115, 80, 114, 76, 115, 72]
    ], PAL.indigo);
    pctx.restore();
    // Top tier: the rim light along the top of the right sleeve and the
    // shade under both sleeves. They belong to the cloth, so they go down
    // before the arms; drawn with the rest of the polish at the end, they
    // ran straight across the right hand and the raised arm.
    if (gfxLevel() === 0) {
      bezierLine([106, 52], [[110, 57, 112, 62, 112, 66]], PAL.cream, STROKE.fine);
      bezierLine([116, 70], [[124, 80, 132, 88, 139, 94]], PAL.cream, STROKE.fine);
      bezierLine([51, 97], [[59, 101, 66, 101, 72, 97]], PAL.creamShadow, STROKE.seam);
      bezierLine([129, 98], [[121, 102, 114, 102, 108, 98]], PAL.creamShadow, STROKE.seam);
    }

    // Shoulder caps, drawn last so they sit over the seam where each sleeve
    // meets the bodice. Without them the sleeve grows straight out of the
    // neck and there is nothing for the eye to read as a shoulder, which is
    // what made the upper body look boneless.
    clothPanel([[77, 49], [
      [73, 52, 71, 57, 71, 62],
      [76, 62, 81, 59, 84, 54],
      [83, 50, 80, 48, 77, 49]
    ]], PAL.creamShadow, 1.2, 0.8);
    bezierLine([71, 62], [[76, 62, 81, 59, 84, 54]], PAL.outline, STROKE.fine);
    pctx.save();
    pctx.translate(0, shoulderDrop);
    clothPanel([[103, 49], [
      [107, 52, 109, 57, 109, 62],
      [104, 62, 99, 59, 96, 54],
      [97, 50, 100, 48, 103, 49]
    ]], PAL.creamMid, 1.2, 0.8);
    bezierLine([109, 62], [[104, 62, 99, 59, 96, 54]], PAL.outline, STROKE.fine);
    pctx.restore();
    // Seam from the shoulder down the outside of each sleeve, so sleeve and
    // bodice stop reading as one continuous sheet of cloth.
    bezierLine([72, 61], [[68, 70, 62, 79, 55 + fabricTrail * 0.4, 86]], PAL.outline, STROKE.fine);
    bezierLine([108, 61 + shoulderDrop], [[112, 70 + shoulderDrop, 118, 79, 125 + fabricTrail * 0.4, 87]], PAL.outline, STROKE.fine);

    // Folds. Each one is a single thin line in a neighbouring tone, enough to
    // tell the panels apart without adding shapes that cost fill time.
    bezierLine([76, 96], [[72, 113, 69, 128, 67 + fabricTrail * 0.25, 144]], PAL.creamShadow, STROKE.fine);
    bezierLine([86, 99], [[83, 116, 81, 131, 80, 146]], PAL.creamShadow, STROKE.fine);
    bezierLine([106, 97], [[110, 114, 113, 129, 115 + fabricTrail * 0.25, 145]], PAL.indigoHi, STROKE.fine);
    bezierLine([99, 100], [[102, 117, 104, 132, 105, 147]], PAL.indigoHi, STROKE.fine);
    line([[88, 58], [91, 74], [91, 101], [94, 128]], PAL.gold, STROKE.edge);
    line([[95, 57], [94, 77], [96, 94], [95, 118], [98, 141]], PAL.goldDark, STROKE.edge);
    ellipse(92, 72, 2, 2, PAL.gold);
    ellipse(92, 72, 0.7, 0.7, PAL.indigoDeep);
    ellipse(96, 105, 2, 2, PAL.gold);
    ellipse(96, 105, 0.7, 0.7, PAL.indigoDeep);
    sparkle(91, 91, 3, PAL.goldHi);
    sparkle(99, 128, 3, PAL.gold);
    sparkle(73, 119, 2, PAL.goldHi);
    sparkle(116, 133, 2, PAL.goldHi);
    sparkle(49 + fabricTrail * 0.5, 77, 2, PAL.gold);
    sparkle(136 + fabricTrail * 0.5, 82, 2, PAL.gold);
    rect(41 + fabricTrail * 0.8, 99, 1, 1, PAL.goldHi);
    rect(137 + fabricTrail * 0.8, 97, 1, 1, PAL.goldHi);
    rect(64, 130, 1, 1, PAL.goldHi);
    rect(111, 120, 1, 1, PAL.goldHi);

    // The neck: about 8 wide under the jaw, opening to 10 where the collar
    // crosses it, so about 6.5 units of bare skin show between chin and gold.
    // Below the collar it widens into the chest skin the bodice cuts off.
    // The chin's own crescent, drawn with the head so it tilts with it, is
    // the only shade under the jaw.
    const neck = smoothOutline([[88, 43], [96, 43], [96.5, 50], [97.2, 55.5], [98, 58], [91.5, 61], [85, 57], [87, 55], [87.5, 50]], 0.6);
    bezierShape(neck[0], neck[1], PAL.skin);
    bezierShape([76, 50], [
      [80, 48, 84, 47, 88, 48],
      [91, 51, 91, 56, 88, 60],
      [82, 59, 76, 57, 71, 56],
      [72, 53, 74, 51, 76, 50]
    ], PAL.skin);
    // One short shade down the far side of the neck, where it meets the
    // cream behind it.
    bezierLine([95.8, 48.8], [[96.0, 50.0, 96.2, 51.3, 96.2, 52.5]], PAL.skinShadow, STROKE.hairline);
    bezierLine([72, 57], [[79, 59, 84, 60, 89, 57]], PAL.indigoDeep, STROKE.strap);
    // The navy collar on her left starts low enough to leave the neck
    // bare, and wraps only the foot of it.
    bezierShape([95, 51.5], [
      [101, 49.8, 108, 51.4, 114, 56],
      [116, 60, 112, 65, 107, 66],
      [102, 62, 98.5, 59, 94, 57.5],
      [93.4, 55.4, 93.8, 53.2, 95, 51.5]
    ], PAL.indigoMid);
    bezierLine([96.8, 51.3], [[102, 50.6, 107.5, 52.4, 112, 57]], PAL.cream, STROKE.strap);
    bezierLine([85.4, 53.4], [[88.4, 55.3, 94, 56.6, 98.5, 53.7]], PAL.gold, STROKE.band);
    sparkle(91.2, 56.7, 2, PAL.goldHi);
    rect(91, 57.7, 1, 2, PAL.eyeBlue);

    // Detail pass over the gown, under the face and front hair so nothing here
    // can crowd them. Everything is a thin line or a small flat shape: at this
    // sprite size anything finer than about one grid unit never resolves, it
    // only costs draw time.

    // Gold piping down the leading edge of each front panel, which is what
    // makes the robe read as a tailored garment rather than as draped cloth.
    bezierLine([86, 79], [[76, 92, 69 + fabricTrail * 0.1, 118, 65 + fabricTrail * 0.35, 147]], PAL.goldDark, STROKE.fine);
    bezierLine([94, 80], [[108, 93, 117 + fabricTrail * 0.1, 121, 124 + fabricTrail * 0.35, 149]], PAL.goldDark, STROKE.fine);
    bezierLine([87, 81], [[78, 93, 71 + fabricTrail * 0.1, 118, 67 + fabricTrail * 0.35, 146]], PAL.gold, STROKE.hairline);

    // Hem band along the bottom of each panel.
    bezierLine([64 + fabricTrail * 0.35, 147], [[73, 151, 81, 150, 87, 146]], PAL.goldDark, STROKE.fine);
    bezierLine([125 + fabricTrail * 0.35, 149], [[115, 153, 104, 152, 95, 147]], PAL.goldDark, STROKE.fine);

    // Second tier of folds, offset from the first so the panels do not look
    // ribbed at a regular interval.
    bezierLine([80, 103], [[77, 118, 75, 132, 74 + fabricTrail * 0.2, 145]], PAL.creamShadow, STROKE.hairline);
    bezierLine([91, 106], [[89, 120, 88, 134, 87, 147]], PAL.creamShadow, STROKE.hairline);
    bezierLine([103, 104], [[106, 119, 108, 133, 109 + fabricTrail * 0.2, 146]], PAL.indigoHi, STROKE.hairline);
    bezierLine([97, 108], [[99, 121, 100, 135, 101, 148]], PAL.indigoHi, STROKE.hairline);

    // Cuff bands at the wrist end of each sleeve.
    bezierLine([40 + fabricTrail * 0.85, 95], [[45 + fabricTrail * 0.8, 100, 52 + fabricTrail * 0.7, 101, 58 + fabricTrail * 0.5, 97]], PAL.goldDark, STROKE.seam);
    bezierLine([140 + fabricTrail * 0.85, 96], [[135 + fabricTrail * 0.8, 101, 128 + fabricTrail * 0.7, 102, 122 + fabricTrail * 0.5, 98]], PAL.goldDark, STROKE.seam);

    // Folds running the length of each sleeve. These are the largest areas on
    // the front view that are always visible, so they carry the most detail
    // per unit of draw time spent.
    bezierLine([70, 62], [[62, 72, 54 + fabricTrail * 0.5, 82, 46 + fabricTrail * 0.9, 92]], PAL.creamShadow, STROKE.fine);
    bezierLine([110, 62], [[118, 72, 126 + fabricTrail * 0.5, 83, 134 + fabricTrail * 0.9, 93]], PAL.creamShadow, STROKE.fine);
    bezierLine([74, 57], [[66, 67, 57 + fabricTrail * 0.5, 77, 48 + fabricTrail * 0.9, 87]], PAL.creamShadow, STROKE.hairline);
    bezierLine([76, 68], [[69, 77, 61 + fabricTrail * 0.5, 86, 52 + fabricTrail * 0.9, 95]], PAL.creamShadow, STROKE.hairline);
    bezierLine([106, 57], [[114, 67, 123 + fabricTrail * 0.5, 78, 132 + fabricTrail * 0.9, 88]], PAL.creamShadow, STROKE.hairline);
    bezierLine([104, 68], [[111, 78, 119 + fabricTrail * 0.5, 87, 128 + fabricTrail * 0.9, 96]], PAL.creamShadow, STROKE.hairline);

    // Bodice seams either side of the centre band, and a waist line, so the
    // torso stops being one unbroken dark field.
    bezierLine([88, 60], [[87, 72, 87, 84, 88, 94]], PAL.indigoHi, STROKE.hairline);
    bezierLine([96, 60], [[97, 72, 97, 84, 96, 94]], PAL.indigoHi, STROKE.hairline);
    bezierLine([86, 90 + hipTilt], [[89, 93 + hipTilt * 0.5, 95, 93 - hipTilt * 0.5, 98, 90 - hipTilt]], PAL.goldDark, STROKE.fine);

    // Gold at the collar and the sleeve openings. The metal is the only part
    // of the outfit that can catch light, so more of it is what reads as
    // expensive rather than more cloth detail would.
    bezierLine([82, 62], [[86, 66, 98, 66, 102, 62]], PAL.goldDark, STROKE.edge);
    bezierLine([83, 61], [[87, 64, 97, 64, 101, 61]], PAL.gold, STROKE.fine);
    sparkle(92, 65, 1.8, PAL.goldHi);
    bezierLine([86, 76], [[89, 78, 95, 78, 98, 76]], PAL.goldDark, STROKE.fine);
    bezierLine([87, 118], [[90, 121, 94, 121, 97, 118]], PAL.goldDark, STROKE.fine);
    ellipse(89, 86, 1.2, 1.2, PAL.gold);
    ellipse(95, 86, 1.2, 1.2, PAL.gold);
    ellipse(100.6, 131, 1.6, 1.6, PAL.gold);
    ellipse(100.6, 131, 0.6, 0.6, PAL.indigoDeep);

    // Contact shadows. Each one marks where something sits in front of
    // something else, and together they are what turns a set of flat panels
    // into a figure with depth.
    bezierLine([78, 66], [[84, 70, 100, 70, 106, 66]], PAL.indigoDeep, STROKE.seam);
    bezierLine([74, 74], [[80, 80, 86, 84, 88, 92]], PAL.creamShadow, STROKE.fine);
    bezierLine([110, 74], [[104, 80, 98, 84, 96, 92]], PAL.indigoDeep, STROKE.fine);

    // A few more stars, smaller than the existing ones and scattered off the
    // regular spacing.
    sparkle(74, 108, 1.6, PAL.gold);
    sparkle(113, 124, 1.6, PAL.goldHi);
    sparkle(84, 134, 1.4, PAL.gold);
    sparkle(106, 139, 1.4, PAL.gold);
    sparkle(68, 133, 1.2, PAL.goldHi);

    // Her left hand, the same hand as the right one closed, turned to hang
    // along the forearm. Drawn after the sleeve detail like the right arm,
    // so no fold or star crosses it.
    // Turned by the direction of the end of the forearm, like the right
    // hand; its thumb is on the side toward her body.
    pctx.save();
    pctx.translate(48.6 + fabricTrail * 0.5, 88.8);
    pctx.rotate(Math.atan2(-((49 + fabricTrail * 0.5) - (53 + fabricTrail * 0.42)), 90 - 85));
    pctx.scale(0.75, 0.75);
    drawCastHand(0, 0, 1, 0);
    pctx.restore();

    // The right arm, drawn after the sleeve detail so that once it is raised
    // no fold, star or cuff band from the sleeve behind it lands on top.
    pctx.save();
    pctx.translate(0, shoulderDrop);
    // Every joint and control point runs from its resting place to its
    // casting place. The elbow rises on the square of castExt, so the hand
    // leads and the forearm straightens before the elbow lifts; raised in
    // step with the hand it was high by the halfway point with the forearm
    // bent down from it, which read as a broken arm.
    const mix = (a, b, k) => a + (b - a) * k;
    const lift = castExt * castExt;
    const wrist = castWrist(castExt, fabricTrail);
    // At full cast the elbow sits a little below the line from shoulder to
    // wrist, so the raised arm keeps a slight bend and the elbow reads.
    // Straight, the arm looked like a hose and longer than it is.
    const elbowX = mix(119 + fabricTrail * 0.15, 123, castExt), elbowY = mix(73, 46, lift);
    const upperC = [mix(111, 112, castExt), mix(59, 50.5, castExt), mix(116, 118.5, castExt), mix(65, 47.5, lift)];
    // The forearm's control points are placed along the line from elbow to
    // wrist with a slight outward bow, rather than blended between two
    // fixed sets: blended, they ran ahead of the late-rising elbow and put
    // an S-bend in the forearm halfway up.
    const fx = (wrist[0] - 1) - elbowX, fy = (wrist[1] + 1.2) - elbowY;
    const fl = Math.hypot(fx, fy) || 1, bow = 0.9;
    const bx = fy / fl * bow, by = -fx / fl * bow;
    const foreC = [
      elbowX + fx * 0.35 + bx, elbowY + fy * 0.35 + by,
      elbowX + fx * 0.75 + bx * 0.5, elbowY + fy * 0.75 + by * 0.5
    ];
    // Raised toward the viewer the forearm reads wider, and against the dark
    // behind her it needs an edge; both grow from nothing at rest, where the
    // arm lies on pale cloth like the left one.
    // The forearm is widest just below the elbow and tapers to the wrist,
    // which stays narrower than the upper arm and than the palm.
    const foreW0 = mix(STROKE.limb, STROKE.limb + STROKE.fine, castExt);
    const foreW1 = mix(STROKE.limb * 0.85, 3.2, castExt);
    const edgeW = STROKE.edge * castExt;
    const upperSeg = [[upperC[0], upperC[1], upperC[2], upperC[3], elbowX, elbowY]];
    const foreSeg = [[foreC[0], foreC[1], foreC[2], foreC[3], wrist[0] - 1, wrist[1] + 1.2]];
    bezierLine([106, 54], upperSeg, PAL.outline, STROKE.limbUpper + edgeW);
    taperedLimb([elbowX, elbowY], foreSeg[0], foreW0 + edgeW, foreW1 + edgeW, PAL.outline);
    bezierLine([106, 54], upperSeg, PAL.skin, STROKE.limbUpper);
    taperedLimb([elbowX, elbowY], foreSeg[0], foreW0, foreW1, PAL.skin);
    // Shade along the underside of the arm.
    bezierLine([108, 57], [[upperC[0] + 2, upperC[1] + 3, upperC[2] + 2, upperC[3] + 2.5, elbowX + 1.2, elbowY + 2]], PAL.skinShadow, STROKE.edge);
    bezierLine([elbowX + 1, elbowY + 2], [[foreC[0] + 1, foreC[1] + 2.5, foreC[2], foreC[3] + 2.5, wrist[0] - 1, wrist[1] + 2.6]], PAL.skinShadow, STROKE.edge);

    // One hand the whole way: it hangs relaxed, turns with the arm, and only
    // opens once the arm is well on its way up. Open from the first frame of
    // the raise it read as a splayed hand sprouting near her shoulder.
    const openT = Math.max(0, Math.min(1, (castExt - 0.25) / 0.5));
    const handOpen = openT * openT * (3 - 2 * openT) * 0.8;
    // The hand points the way the end of the forearm points, so wrist, palm
    // and fingers always agree with the arm; the only addition is the wrist
    // bending back into the casting gesture as the arm rises.
    const foreDX = (wrist[0] - 1) - foreC[2], foreDY = (wrist[1] + 1.2) - foreC[3];
    const castEase = castExt * castExt * (3 - 2 * castExt);
    pctx.save();
    pctx.translate(wrist[0] + 0.5 * castExt, wrist[1] + 0.8 * castExt);
    pctx.rotate(Math.atan2(-foreDX, foreDY) - 0.85 * castEase);
    const handSize = mix(0.75, 1.05, castExt);
    pctx.scale(handSize, handSize);
    // Thumb on the +1 side keeps the palm toward the viewer the whole way:
    // turned out a little while the hand hangs, turned in toward her as it
    // rises. On the other side it began inward and was carried round to the
    // outside by the raise, so the casting hand showed its back.
    drawCastHand(0, 0, 1, handOpen);
    pctx.restore();

    // Light thrown back onto her by the spell in her hand. The energy is
    // drawn on the main canvas over the sprite, so without this she stayed
    // lit as if nothing were happening six units from her face.
    if (castExt > 0.05) {
      bezierLine([elbowX, elbowY - 2], [[foreC[0], foreC[1] - 2.5, foreC[2] - 1, foreC[3] - 2, wrist[0] - 1.5, wrist[1] - 0.6]], PAL.magicHi, STROKE.edge);
      bezierLine([100, 41], [[102, 44, 103, 46, 103, 48]], PAL.magic, STROKE.band);
      bezierLine([99, 36], [[101, 37, 102, 39, 102, 41]], PAL.magicHi, STROKE.seam);
      bezierLine([103, 52], [[106, 56, 108, 60, 108, 63]], PAL.magic, STROKE.band);
      bezierLine([98, 62], [[102, 68, 105, 76, 106, 84]], PAL.magic, STROKE.edge);
      if (castExt > 0.5) {
        bezierLine([106, 46], [[108, 48, 109, 50, 109, 52]], PAL.magicHi, STROKE.fine);
      }
    }
    pctx.restore();

    // Everything from here to the ornaments is the head, tipped about the
    // neck.
    pctx.save();
    pctx.translate(92, 50);
    pctx.rotate(headTilt);
    pctx.translate(-92, -50);
    // A soft oval narrowing to the chin: full width through the temples and
    // eyes, tapering from the cheekbones, the chin at 47.8 so the mouth has
    // room under it. Wider cheeks and a chin brought lower made the face a
    // circle. Its one shadow is a small crescent right under the chin; a
    // second, wider one there read as a double chin.
    bezierShape([88.4, 47.35], [
      [90.0, 48.15, 94.0, 48.15, 95.6, 47.35],
      [94.1, 47.75, 89.9, 47.75, 88.4, 47.35]
    ], PAL.skinShadow);
    bezierShape([81, 32], [
      [81, 40.8, 85.2, 46.0, 92, 47.8],
      [98.8, 46.0, 103, 40.8, 103, 32],
      [103, 20, 81, 20, 81, 32]
    ], PAL.skin);
    // Soft warm rim along the jaw/cheek edge so the face separates from the
    // similarly pale hair/gown around it instead of blending into a flat
    // bright mass - the face is meant to be the first thing the eye lands on.
    bezierLine([81, 32], [
      [81, 40.8, 85.2, 46.0, 92, 47.8],
      [98.8, 46.0, 103, 40.8, 103, 32]
    ], PAL.skinShadow, STROKE.fine);
    const expr = EXPRESSIONS[opts.expression] || EXPRESSIONS.neutral;
    // blinkAmount is 0..1; the older boolean blink still means fully shut.
    // Only open eyes blink or look about: closed and happy ones hold still.
    const openEye = !!OPEN_EYE_FAMILY[expr.eye];
    const blinkAmt = openEye ? (opts.blinkAmount != null ? opts.blinkAmount : (opts.blink ? 1 : 0)) : 0;
    const gazeX = openEye ? opts.gazeX || 0 : 0, gazeY = openEye ? opts.gazeY || 0 : 0;
    drawSimpleEye(88, 38, expr.eye, blinkAmt, gazeX, gazeY);
    drawSimpleEye(96, 38, expr.eye, blinkAmt, gazeX, gazeY);
    // Brows after the eyes, so a closing lid can never paint over them.
    drawBrow(expr.brow, false);
    drawBrow(expr.brow, true);
    // The nose: a short angled shadow under its tip rather than a dash down
    // the middle of the face.
    bezierLine([92.6, 41.9], [[92.5, 42.1, 92.35, 42.3, 92.1, 42.4]], PAL.skinShadow, STROKE.hairline);
    // The mouth sits 0.7 higher than it was drawn, with room below it for
    // the chin.
    pctx.save();
    pctx.translate(0, -0.7);
    drawMouth(expr.mouth);
    // Light on the lower lip, under the closed-mouth shapes only.
    if (expr.mouth !== 'open' && expr.mouth !== 'tense') line([[91.5, 46.2], [92.5, 46.2]], PAL.blush, STROKE.fine);
    pctx.restore();
    // Blush as a wide, thin wash with two faint strokes on it; a solid oval
    // read as a stamp, and darker strokes as scratches.
    for (const bx of [83.6, 100.4]) {
      ellipseF(bx, 41.2, 2.3, 0.75, PAL.blush);
      for (const d of [-0.6, 0.6]) line([[bx + d - 0.3, 41.6], [bx + d + 0.3, 40.8]], PAL.blush, STROKE.hairline);
    }

    bezierShape([82, 18], [[75, 23, 75, 46, 75 + sway * 0.4, 68], [80, 50, 83, 28, 84, 18]], PAL.hairLight);
    bezierShape([102, 18], [[109, 23, 109, 46, 109 + sway * 0.4, 68], [104, 50, 101, 28, 100, 18]], PAL.hairMid);
    // Locks inside the side hair. Without them each side is one flat slab
    // with a straight outer edge, which is most of what made the hair read as
    // a pair of curtains.
    bezierLine([79, 26], [[76.5, 40, 76, 56, 76.5 + sway * 0.3, 70]], PAL.hairShadow, STROKE.seam);
    bezierLine([83, 30], [[81, 44, 80.5, 60, 81 + sway * 0.25, 76]], PAL.hairHi, STROKE.fine);
    bezierLine([105, 26], [[107.5, 40, 108, 56, 107.5 + sway * 0.3, 70]], PAL.hairDeep, STROKE.seam);
    bezierLine([101, 30], [[103, 44, 103.5, 60, 103 + sway * 0.25, 76]], PAL.hairLight, STROKE.fine);

    // Crown drawn first in a light tone so it blends with the bangs sitting
    // on top of it, instead of reading as a separate dark "cap". Its inner
    // edge sits low enough that the dome has real thickness: pulled up near
    // the outer curve it collapsed into a thin horizontal bar, which read as
    // a headband rather than as the top of a skull.
    bezierShape([75, 34], [
      [73, 9, 111, 9, 109, 34],
      [101, 27, 83, 27, 75, 34]
    ], PAL.hairLight);
    // Shadowed mass at each temple. Their peaks are rounded and set back from
    // the crown's own peak; brought level with it they became two spikes
    // sticking up off the top of her head.
    bezierShape([75, 34], [[73, 24, 76, 19, 81, 17], [81, 23, 79, 28, 75, 34]], PAL.hairMid);
    bezierShape([109, 34], [[111, 24, 108, 19, 103, 17], [103, 23, 105, 28, 109, 34]], PAL.hairMid);

    // Fringe as one solid mass, the way cel anime draws it, split at the
    // bottom into four locks of different length and lean: the outer two
    // swing out toward the temples, the middle two point in toward the
    // parting, and the longest sits just right of centre. Evenly spaced
    // teeth of one length read as a curtain. Each lock bulges a little and
    // ends in a narrow round tip; the notches between them are sharp and
    // stay below the crown's inner edge so the crown never shows through.
    // Every tip ends above the lashes.
    const fringe = [[75, 26], [
      [76, 14, 83, 9, 92, 9],
      [101, 9, 108, 14, 109, 26],
      [108.6, 27.8, 106.6, 29.0, 104.4, 29.4],
      [104.1, 31.0, 102.0, 33.7, 101.3, 34.1],
      [100.8, 34.0, 98.4, 32.6, 97.2, 29.9],
      [96.8, 32.2, 94.0, 35.0, 93.2, 35.3],
      [92.6, 35.1, 91.2, 32.6, 91.0, 29.6],
      [90.8, 31.2, 89.5, 32.2, 88.9, 32.4],
      [88.4, 32.3, 86.9, 31.4, 86.4, 29.8],
      [86.3, 31.6, 84.2, 33.6, 83.4, 34.0],
      [82.9, 33.8, 82.2, 31.6, 81.0, 30.2],
      [79.4, 29.4, 77, 28.6, 75, 26]
    ]];
    // The shadow it throws on the forehead: the same outline moved away from
    // the light, kept to the face, so it runs along every lock and notch
    // at the same width. Separate strokes under each notch outlined the
    // notches in pink instead.
    pctx.save();
    tracePath([[81, 32], [[81, 40.8, 85.2, 46.0, 92, 47.8], [98.8, 46.0, 103, 40.8, 103, 32], [103, 20, 81, 20, 81, 32]]]);
    pctx.clip();
    pctx.translate(-LIGHT.x * 0.7, -LIGHT.y * 0.7);
    tracePath(fringe);
    pctx.fillStyle = PAL.skinShadow;
    pctx.fill();
    pctx.restore();
    tracePath(fringe);
    pctx.fillStyle = PAL.hairLight;
    pctx.fill();

    // Two sidelocks dropping past the jaw, so the fringe does not end in a
    // hard line at the temples.
    bezierShape([78, 18], [[76, 30, 76, 42, 77, 52], [80, 44, 81, 32, 81, 22]], PAL.hairMid);
    bezierShape([106, 18], [[108, 30, 108, 42, 107, 52], [104, 44, 103, 32, 103, 22]], PAL.hairMid);

    // Three strand lines, each running down the axis of its own lock and
    // stopping short of the tip, so the mass does not read as one flat card.
    // Kept in the mid tone: in the shadow tone they cut across the fringe
    // like scratches. More of them, straight and evenly spaced, made a
    // barcode.
    bezierLine([85.2, 20.0], [[85.3, 24.0, 85.0, 28.2, 84.2, 31.9]], PAL.hairMid, STROKE.hairline);
    bezierLine([93.4, 17.5], [[93.9, 22.5, 93.8, 28.5, 93.3, 33.4]], PAL.hairMid, STROKE.hairline);
    bezierLine([98.2, 21.5], [[99.0, 25.0, 99.8, 28.8, 100.4, 32.2]], PAL.hairMid, STROKE.hairline);

    // The top of the head. Filled in the brightest tone end to end it read
    // as a white cap, so the pure white is kept to a broken sheen band, and
    // the dome gets what a head of hair has: shade down both sides, deeper
    // on the far one, a parting the locks leave from, and an edge against
    // the background.
    bezierShape([76.4, 25], [[76.6, 17, 81, 12, 87.5, 10.2], [83, 13.5, 80.2, 18, 79.4, 24]], PAL.hairMid);
    bezierShape([107.6, 25], [[107.4, 17, 103, 12, 96.5, 10.2], [101, 13.5, 103.8, 18, 104.6, 24]], PAL.hairMid);
    bezierLine([106.6, 24], [[106.4, 18, 103.5, 13.5, 99, 11]], PAL.hairShadow, STROKE.fine);
    bezierLine([92, 9.4], [[91.7, 11, 91.4, 12.6, 91.2, 14]], PAL.hairMid, STROKE.fine);
    bezierShape([78.8, 18.2], [[82, 14.4, 87, 13.2, 91.2, 13.6], [87, 14.8, 82.5, 16, 78.8, 18.2]], PAL.hairHi);
    bezierShape([93.4, 13.8], [[97, 13.6, 101, 14.8, 104, 17.6], [100.6, 16, 97, 15.2, 93.4, 13.8]], PAL.hairHi);
    bezierLine([75, 26], [[76, 14, 83, 9, 92, 9], [101, 9, 108, 14, 109, 26]], PAL.hairShadow, STROKE.fine);
    drawAhoge(92, 9.6, sway * 0.45);

    // Gold hair ornament: a star pinned where the fringe meets the temple,
    // with a short beaded chain falling from it. Gold is the only thing on
    // her that catches light, so this is what gives the head a focal point
    // instead of leaving it a pale mass. Worn on the near side only, since a
    // matched pair across the head reads as a crown rather than as jewellery.
    // The chain trails the head, so it swings a beat behind the body.
    const accLag = sway * 0.35;
    bezierLine([82, 25], [[81.6, 28, 81, 30, 80.4 + accLag, 32]], PAL.goldDark, STROKE.fine);
    ellipse(81.6, 27.6, 0.75, 0.75, PAL.gold);
    ellipse(80.9, 30, 0.75, 0.75, PAL.gold);
    sparkle(80.2 + accLag, 33.6, 2.2, PAL.goldDark);
    sparkle(80.2 + accLag, 33.6, 1.5, PAL.gold);
    sparkle(82.3, 22, 3.4, PAL.goldDark);
    sparkle(82.3, 22, 2.6, PAL.gold);
    sparkle(82.3, 22, 1.2, PAL.goldHi);

    // Orbital ornament on the far side, the piece her key art is built
    // around: thin gold rings crossing at different angles with a lit core,
    // and a chain of crystals hanging off it. Rings rather than another star
    // so the two sides of the head do not mirror each other.
    ring(104, 21, 7, 2.6, -0.5, PAL.goldDark, STROKE.fine);
    ring(104, 21, 6.2, 2.2, 0.75, PAL.gold, STROKE.fine);
    ring(104, 21, 4.4, 4.2, 0, PAL.goldDark, STROKE.hairline);
    sparkle(104, 21, 2.6, PAL.gold);
    sparkle(104, 21, 1.2, PAL.goldHi);
    sparkle(110, 17, 1.3, PAL.goldHi);
    sparkle(98.5, 25, 1.1, PAL.gold);

    // Crystal drop hanging from the rings, trailing the head like the chain
    // on the near side.
    const dropLag = sway * 0.4;
    bezierLine([105, 24], [[106, 30, 107, 36, 107.5 + dropLag, 41]], PAL.goldDark, STROKE.fine);
    ellipse(106.3, 29, 0.7, 0.7, PAL.gold);
    ellipse(107, 34.5, 0.7, 0.7, PAL.gold);
    crystal(107.5 + dropLag, 44, 3.2, PAL.eyeBlue, PAL.eyeLight);
    crystal(103 + dropLag * 0.5, 33, 2, PAL.eyeDeep, PAL.eyeBlue);

    // Gold filigree sweeping back off the near temple, echoing the branching
    // gold in the key art.
    bezierLine([80, 19], [[77, 16, 74, 17, 72, 20]], PAL.goldDark, STROKE.fine);
    bezierLine([78, 22], [[75, 22, 73, 24, 72.5, 27]], PAL.gold, STROKE.hairline);
    sparkle(71.6, 20, 1.3, PAL.goldHi);
    sparkle(72.4, 27, 1, PAL.gold);
    pctx.restore();

    // Top graphics tier only. Everything below this line is polish rather
    // than information, so the tiers under it get the sprite as it stands and
    // pay nothing for it. The sprite cache is what buys the room: this is
    // drawn 24 times a second, not 60.
    if (gfxLevel() === 0) {
      // Rim light down her far side. The gate she comes out of sits on that
      // side in every layout, so the light has a source in the scene rather
      // than being decoration.
      bezierLine([111, 20], [[116, 34, 117, 52, 115, 68]], PAL.hairHi, STROKE.seam);
      bezierLine([105, 96], [[112, 113, 118, 131, 123, 148]], PAL.cream, STROKE.fine);

      // Loose strands breaking off the side hair, tied to sway so they trail
      // the head.
      bezierLine([77, 34], [[73, 44, 71, 54, 72 + sway * 0.5, 63]], PAL.hairLight, STROKE.hairline);
      bezierLine([107, 38], [[111, 48, 113, 58, 112 + sway * 0.5, 67]], PAL.hairLight, STROKE.hairline);

      // The gold catching light on a slow cycle, the ornaments and the centre
      // band taking turns. Driven off t so it lands on the cache's own steps
      // instead of forcing extra redraws.
      const glint = Math.sin(t * Math.PI * 2);
      if (glint > 0.35) {
        sparkle(82.3, 22, 4.4, PAL.goldHi);
        sparkle(104, 21, 3.8, PAL.goldHi);
      } else if (glint < -0.35) {
        sparkle(92, 72, 3.2, PAL.goldHi);
        sparkle(96, 105, 3.2, PAL.goldHi);
      }
    }

    pctx.restore();
  }
  function drawKanadeBack(t, opts) {
    opts = opts || {};
    const _key = spriteKey('b', t, opts);
    if (_key === _spriteKey) return;
    _spriteKey = _key;
    const bob = Math.sin(t * Math.PI * 2) * (opts.bobAmp != null ? opts.bobAmp : 1);
    const lean = opts.lean || 0;
    const trail = opts.trail || 0;
    const whip = opts.whip || 0;
    const walkStep = opts.walkStep || 0;
    const fabricTrail = trail * 0.75 + whip;
    const armSwing = walkStep * 2.2;
    const backFoot = walkStep * 4;
    // Secondary motion, the way a Live2D rig moves hair and hanging pieces:
    // each part swings on the body's own cycle but later, by lag radians, and
    // further the looser it hangs. quiver runs at twice the rate, for the
    // lightest strands. Both are driven off t, so the sprite cache's steps
    // already cover them.
    const swayAmp = opts.swayAmp != null ? opts.swayAmp : 1.5;
    const wave = (lag, amp) => Math.sin(t * Math.PI * 2 - lag) * swayAmp * amp;
    const quiver = (lag, amp) => Math.sin(t * Math.PI * 4 - lag) * amp;
    // How far the lower hair has swung, used in place of trail everywhere in
    // the hair so the whole mass follows a beat behind her. While she walks,
    // each step throws it the other way as her weight moves over the foot.
    const hairTrail = trail + wave(1.1, 1.2) - walkStep * 1.2;

    pctx.clearRect(0, 0, GRID_W, GRID_H);
    pctx.save();
    pctx.translate(lean, bob);

    // Seen from behind everything is mirrored against the front view: her
    // right arm, her star pin and her crystal drop all sit on the viewer's
    // right here. Light still comes from the viewer's left, so the left half
    // of each piece carries the lit tone and the right half the shaded one.

    // Boots, heels towards the viewer. The foot pushing off lifts its heel,
    // which from behind is the only thing that tells walking from standing.
    for (const [bx, step] of [[84.5, Math.max(0, walkStep)], [97.5, Math.max(0, -walkStep)]]) {
      const ly = -step * 5;
      const lx = (bx < 91 ? -1 : 1) * step * Math.abs(backFoot) * 0.2;
      const x = bx + lx;
      // Shaft narrowing to the ankle, the heel counter swelling out below it,
      // then the heel itself.
      bezierShape([x - 4.8, 144 + ly], [
        [x - 4.8, 150 + ly, x - 4, 156 + ly, x - 3.4, 160 + ly],
        [x - 4.2, 163 + ly, x - 4.5, 167 + ly, x - 3.8, 170 + ly],
        [x - 3.3, 172 + ly, x - 3.1, 174 + ly, x - 3, 175 + ly],
        [x - 1, 175.3 + ly, x + 1, 175.3 + ly, x + 3, 175 + ly],
        [x + 3.1, 174 + ly, x + 3.3, 172 + ly, x + 3.8, 170 + ly],
        [x + 4.5, 167 + ly, x + 4.2, 163 + ly, x + 3.4, 160 + ly],
        [x + 4, 156 + ly, x + 4.8, 150 + ly, x + 4.8, 144 + ly]
      ], PAL.bootDeep);
      bezierShape([x - 3.6, 146 + ly], [
        [x - 3.6, 152 + ly, x - 2.9, 157 + ly, x - 2.3, 160 + ly],
        [x - 3, 163 + ly, x - 3.3, 166 + ly, x - 2.8, 168.5 + ly],
        [x - 1, 168.5 + ly, x + 1, 168 + ly, x + 1.4, 166 + ly],
        [x + 1.2, 158 + ly, x + 1.6, 152 + ly, x + 1.6, 146 + ly]
      ], PAL.boot);
      // Back seam, the pale trim the front view runs down the shin.
      rect(x - 0.5, 147 + ly, 1, 12, PAL.bootHi);
      // Heel, split from the counter by a crease, with a gold cap.
      line([[x - 3.6, 170.4 + ly], [x + 3.6, 170.4 + ly]], PAL.outline, STROKE.fine);
      line([[x - 2.4, 174.4 + ly], [x + 2.4, 174.4 + ly]], PAL.goldDark, STROKE.seam);
      bezierLine([x - 3.6, 160 + ly], [[x - 1.6, 161.6 + ly, x + 1.6, 161.6 + ly, x + 3.6, 160 + ly]], PAL.gold, STROKE.seam);
      ellipse(x, 161.3 + ly, 0.9, 0.9, PAL.goldHi);
      if (step > 0.1) {
        // Sole of the lifted foot, tipped up towards the viewer.
        bezierShape([x - 3.6, 172 + ly], [[x - 2, 175 + ly + step * 2, x + 2, 175 + ly + step * 2, x + 3.6, 172 + ly]], PAL.boot);
      }
    }

    // Coat, back. The front view's widest layer is a cream robe with the
    // indigo panels set into its opening, so from behind the robe is all
    // there is: cream, flaring from under the arms to the hem, lit by the
    // same light as the front.
    clothPanel([[77, 64], [
      [70, 80, 62 + fabricTrail * 0.1, 104, 58 + fabricTrail * 0.25, 124],
      [55 + fabricTrail * 0.35, 134, 53 + fabricTrail * 0.4, 141, 52 + fabricTrail * 0.45, 146],
      [66 + fabricTrail * 0.3, 150.5, 78, 151.5, 91, 151.5],
      [104, 151.5, 116 + fabricTrail * 0.3, 150.5, 130 + fabricTrail * 0.45, 146],
      [129 + fabricTrail * 0.4, 141, 127 + fabricTrail * 0.35, 134, 124 + fabricTrail * 0.25, 124],
      [120 + fabricTrail * 0.1, 104, 112, 80, 105, 64]
    ]], PAL.creamMid, 2.4, 1.2);
    bezierLine([52 + fabricTrail * 0.45, 146], [
      [66 + fabricTrail * 0.3, 150.5, 78, 151.5, 91, 151.5],
      [104, 151.5, 116 + fabricTrail * 0.3, 150.5, 130 + fabricTrail * 0.45, 146]
    ], PAL.outline, STROKE.seam);
    bezierLine([58 + fabricTrail * 0.25, 124], [[55 + fabricTrail * 0.35, 134, 53 + fabricTrail * 0.4, 141, 52 + fabricTrail * 0.45, 146]], PAL.outline, STROKE.seam);
    bezierLine([124 + fabricTrail * 0.25, 124], [[127 + fabricTrail * 0.35, 134, 129 + fabricTrail * 0.4, 141, 130 + fabricTrail * 0.45, 146]], PAL.outline, STROKE.seam);
    // Folds, uneven in length and spacing, and the centre back seam, which
    // only shows between the ends of her hair.
    bezierLine([66, 114], [[64, 126, 63 + fabricTrail * 0.3, 136, 62 + fabricTrail * 0.4, 147]], PAL.creamMid, STROKE.fine);
    bezierLine([73, 126], [[72, 134, 71, 142, 71, 150]], PAL.creamShadow, STROKE.fine);
    bezierLine([110, 120], [[112, 131, 113 + fabricTrail * 0.3, 140, 114 + fabricTrail * 0.4, 150]], PAL.creamMid, STROKE.fine);
    bezierLine([118, 110], [[120, 124, 122 + fabricTrail * 0.3, 136, 124 + fabricTrail * 0.4, 147]], PAL.creamShadow, STROKE.fine);
    line([[91, 128], [91, 151]], PAL.goldDark, STROKE.fine);
    // Hem band, the same two-tone gold edge the front panels end on.
    bezierLine([53 + fabricTrail * 0.45, 144.6], [
      [66 + fabricTrail * 0.3, 149, 78, 150, 91, 150],
      [104, 150, 116 + fabricTrail * 0.3, 149, 129 + fabricTrail * 0.45, 144.6]
    ], PAL.goldDark, STROKE.seam);
    bezierLine([54 + fabricTrail * 0.45, 143.4], [
      [66 + fabricTrail * 0.3, 147.6, 78, 148.6, 91, 148.6],
      [104, 148.6, 116 + fabricTrail * 0.3, 147.6, 128 + fabricTrail * 0.45, 143.4]
    ], PAL.gold, STROKE.hairline);
    sparkle(64, 132, 1.6, PAL.gold);
    sparkle(117, 128, 1.4, PAL.goldHi);
    rect(76, 140, 1, 1, PAL.goldHi);
    rect(107, 138, 1, 1, PAL.goldHi);

    // Indigo panels falling from her shoulder blades. On the front view they
    // are the dark shapes trailing behind her; from here they hang in plain
    // sight and are the one place the back of the outfit shows its colour.
    // Her right panel, on the viewer's right here, is the shorter of the two,
    // as it is on the front view.
    clothPanel([[80, 68], [
      [72, 74, 62 + fabricTrail * 0.3, 90, 52 + fabricTrail * 0.6, 106],
      [46 + fabricTrail * 0.8, 115, 41 + fabricTrail * 0.9, 123, 38 + fabricTrail, 130],
      [45 + fabricTrail * 0.8, 134, 54 + fabricTrail * 0.6, 136, 62 + fabricTrail * 0.45, 133],
      [70 + fabricTrail * 0.2, 121, 78, 102, 82, 84]
    ]], PAL.indigo, 2, 1);
    clothPanel([[102, 68], [
      [110, 74, 120 + fabricTrail * 0.3, 90, 130 + fabricTrail * 0.6, 106],
      [135 + fabricTrail * 0.8, 114, 139 + fabricTrail * 0.9, 120, 142 + fabricTrail, 126],
      [136 + fabricTrail * 0.8, 130, 128 + fabricTrail * 0.6, 132, 120 + fabricTrail * 0.45, 130],
      [112 + fabricTrail * 0.2, 119, 104, 102, 100, 84]
    ]], PAL.indigo, 2, 1);
    // A fold down each, and gold piping round the hanging edges.
    bezierLine([74, 96], [[70 + fabricTrail * 0.2, 110, 64 + fabricTrail * 0.4, 122, 58 + fabricTrail * 0.55, 132]], PAL.indigoDeep, STROKE.fine);
    bezierLine([109, 100], [[113 + fabricTrail * 0.2, 111, 118 + fabricTrail * 0.4, 120, 123 + fabricTrail * 0.55, 128]], PAL.indigoDeep, STROKE.fine);
    bezierLine([38 + fabricTrail, 130], [[45 + fabricTrail * 0.8, 134, 54 + fabricTrail * 0.6, 136, 62 + fabricTrail * 0.45, 133]], PAL.goldDark, STROKE.seam);
    bezierLine([142 + fabricTrail, 126], [[136 + fabricTrail * 0.8, 130, 128 + fabricTrail * 0.6, 132, 120 + fabricTrail * 0.45, 130]], PAL.goldDark, STROKE.seam);
    bezierLine([72, 75], [[62 + fabricTrail * 0.3, 90, 52 + fabricTrail * 0.6, 106, 38.6 + fabricTrail, 129]], PAL.goldDark, STROKE.hairline);
    bezierLine([110, 75], [[120 + fabricTrail * 0.3, 90, 130 + fabricTrail * 0.6, 106, 141.4 + fabricTrail, 125]], PAL.gold, STROKE.hairline);
    sparkle(56 + fabricTrail * 0.6, 112, 1.8, PAL.gold);
    sparkle(49 + fabricTrail * 0.8, 125, 1.3, PAL.goldHi);
    sparkle(127 + fabricTrail * 0.6, 116, 1.6, PAL.gold);
    rect(133 + fabricTrail * 0.8, 123, 1, 1, PAL.goldHi);

    // Sleeves. Each leaves the body at the shoulder seam, falls to a point
    // below the hand rather than standing out sideways, and ends in a gold
    // cuff where the lining turns.
    clothPanel([[72, 54], [
      [67, 55, 63, 58, 61 + fabricTrail * 0.15, 63],
      [55 + fabricTrail * 0.35, 75, 46 + fabricTrail * 0.7, 89, 37 + fabricTrail, 102],
      [43 + fabricTrail * 0.85, 104, 50 + fabricTrail * 0.6, 103, 56 + fabricTrail * 0.4, 98],
      [61, 93, 66, 85, 69, 74],
      [71, 66, 72, 60, 72, 54]
    ]], PAL.creamMid, 2.2, 1.2);
    clothPanel([[110, 54], [
      [115, 55, 119, 58, 121 + fabricTrail * 0.15, 63],
      [127 + fabricTrail * 0.35, 75, 136 + fabricTrail * 0.7, 89, 145 + fabricTrail, 102],
      [139 + fabricTrail * 0.85, 104, 132 + fabricTrail * 0.6, 103, 126 + fabricTrail * 0.4, 98],
      [121, 93, 116, 85, 113, 74],
      [111, 66, 110, 60, 110, 54]
    ]], PAL.creamMid, 2.2, 1.2);
    // Lining showing at the lower edge, as it does on the front view.
    bezierShape([56 + fabricTrail * 0.4, 98], [
      [50 + fabricTrail * 0.6, 100, 44 + fabricTrail * 0.8, 101, 37 + fabricTrail, 102],
      [45 + fabricTrail * 0.8, 97, 52 + fabricTrail * 0.55, 93, 58 + fabricTrail * 0.3, 90]
    ], PAL.indigo);
    bezierShape([126 + fabricTrail * 0.4, 98], [
      [132 + fabricTrail * 0.6, 100, 138 + fabricTrail * 0.8, 101, 145 + fabricTrail, 102],
      [137 + fabricTrail * 0.8, 97, 130 + fabricTrail * 0.55, 93, 124 + fabricTrail * 0.3, 90]
    ], PAL.indigoDeep);
    bezierLine([72, 54], [
      [67, 55, 63, 58, 61 + fabricTrail * 0.15, 63],
      [55 + fabricTrail * 0.35, 75, 46 + fabricTrail * 0.7, 89, 37 + fabricTrail, 102]
    ], PAL.outline, STROKE.seam);
    bezierLine([110, 54], [
      [115, 55, 119, 58, 121 + fabricTrail * 0.15, 63],
      [127 + fabricTrail * 0.35, 75, 136 + fabricTrail * 0.7, 89, 145 + fabricTrail, 102]
    ], PAL.outline, STROKE.seam);
    bezierLine([66, 64], [[61, 72, 54 + fabricTrail * 0.5, 83, 45 + fabricTrail * 0.9, 95]], PAL.creamShadow, STROKE.fine);
    bezierLine([116, 64], [[121, 72, 128 + fabricTrail * 0.5, 83, 137 + fabricTrail * 0.9, 95]], PAL.creamShadow, STROKE.fine);
    bezierLine([112, 72], [[117, 79, 123 + fabricTrail * 0.5, 88, 130 + fabricTrail * 0.9, 97]], PAL.creamShadow, STROKE.hairline);
    bezierLine([38 + fabricTrail, 101.4], [[44 + fabricTrail * 0.85, 103, 50 + fabricTrail * 0.6, 102, 56 + fabricTrail * 0.4, 97.6]], PAL.goldDark, STROKE.seam);
    bezierLine([144 + fabricTrail, 101.4], [[138 + fabricTrail * 0.85, 103, 132 + fabricTrail * 0.6, 102, 126 + fabricTrail * 0.4, 97.6]], PAL.goldDark, STROKE.seam);
    bezierLine([39 + fabricTrail, 100.2], [[45 + fabricTrail * 0.85, 101.6, 50 + fabricTrail * 0.6, 100.6, 55 + fabricTrail * 0.4, 96.6]], PAL.gold, STROKE.hairline);
    sparkle(52 + fabricTrail * 0.5, 86, 1.6, PAL.gold);
    sparkle(132 + fabricTrail * 0.5, 88, 1.4, PAL.gold);

    // Arms, the backs of them, from the shoulder to the hand. Each is laid
    // over a darker stroke one unit wider, the way the front view's casting
    // forearm is, since skin on cream fabric otherwise has no edge. The
    // elbow is a real joint with its point marked, and the hand hangs off
    // the wrist rather than being a patch at the end of a line.
    // Her left arm hangs a touch lower than her right, from the dropped
    // shoulder the front view gives her.
    const lElbow = [63 + fabricTrail * 0.15, 74.5 + armSwing * 0.5];
    const lWrist = [54 + fabricTrail * 0.45, 89.5 + armSwing];
    const rElbow = [120 + fabricTrail * 0.15, 71 - armSwing * 0.5];
    const rWrist = [133 + fabricTrail * 0.4, 89 - armSwing];
    const lUpper = [[68.5, 62, 66, 67, lElbow[0], lElbow[1]]];
    const lFore = [[60, lElbow[1] + 6, 57, lWrist[1] - 4, lWrist[0], lWrist[1]]];
    const rUpper = [[114, 62, 117.5, 66, rElbow[0], rElbow[1]]];
    const rFore = [[124, rElbow[1] + 7, 129, rWrist[1] - 5, rWrist[0], rWrist[1]]];
    bezierLine([71, 58], lUpper, PAL.outline, STROKE.limbUpper + STROKE.edge);
    bezierLine(lElbow, lFore, PAL.outline, STROKE.limb + STROKE.edge);
    bezierLine([111, 58], rUpper, PAL.outline, STROKE.limbUpper + STROKE.edge);
    bezierLine(rElbow, rFore, PAL.outline, STROKE.limb + STROKE.edge);
    bezierLine([71, 58], lUpper, PAL.skin, STROKE.limbUpper);
    bezierLine(lElbow, lFore, PAL.skin, STROKE.limb);
    bezierLine([111, 58], rUpper, PAL.skin, STROKE.limbUpper);
    bezierLine(rElbow, rFore, PAL.skin, STROKE.limb);
    // Shade on the side of each arm facing the body, away from the light.
    bezierLine([72.5, 60], [[70.5, 64, 67.5, 69, lElbow[0] + 2, lElbow[1] + 1.5], [61.5, lElbow[1] + 7, 58, lWrist[1] - 3, lWrist[0] + 1.5, lWrist[1]]], PAL.skinShadow, STROKE.edge);
    bezierLine([109.5, 60], [[111.5, 63.5, 115, 67.5, rElbow[0] - 1.5, rElbow[1] + 1.5], [123, rElbow[1] + 7.5, 127.5, rWrist[1] - 4, rWrist[0] - 1.5, rWrist[1]]], PAL.skinShadow, STROKE.band);
    bezierLine([lElbow[0] - 1.6, lElbow[1] - 1], [[lElbow[0] - 1, lElbow[1] + 0.8, lElbow[0] + 0.4, lElbow[1] + 1.4, lElbow[0] + 1.4, lElbow[1] + 1]], PAL.skinShadow, STROKE.fine);
    bezierLine([rElbow[0] + 1.6, rElbow[1] - 1], [[rElbow[0] + 1, rElbow[1] + 0.8, rElbow[0] - 0.4, rElbow[1] + 1.4, rElbow[0] - 1.4, rElbow[1] + 1]], PAL.skinShadow, STROKE.fine);
    // The same hand as the front view, relaxed, turned along each forearm
    // with the thumb toward her body.
    for (const [wr, fore, sd] of [[lWrist, lFore[0], 1], [rWrist, rFore[0], -1]]) {
      pctx.save();
      pctx.translate(wr[0], wr[1] - 0.6);
      pctx.rotate(Math.atan2(-(wr[0] - fore[2]), wr[1] - fore[3]));
      pctx.scale(0.75, 0.75);
      drawCastHand(0, 0, sd, 0);
      pctx.restore();
    }

    // Hair. The two sides of its outline are shared by the fill, the clip
    // that keeps the locks inside it and the edge line drawn round it, so
    // the three cannot drift apart. It rounds over the skull, then falls
    // outward below the ears, not as wide as the hair behind her on the front
    // view but enough that she keeps the same shape as she turns.
    const hairR = [
      [101, 11, 107.5, 14.5, 109, 25],
      [110, 33, 108.5, 38, 109, 43],
      [110.5, 50, 114.5, 55, 115.5 + hairTrail * 0.05, 62],
      [116.5 + hairTrail * 0.1, 80, 117.5 + hairTrail * 0.2, 100, 118.5 + hairTrail * 0.35, 120]
    ];
    const hairL = [
      [81, 11, 74.5, 14.5, 73, 25],
      [72, 33, 73.5, 38, 73, 43],
      [71.5, 50, 67.5, 55, 66.5 + hairTrail * 0.05, 62],
      [65.5 + hairTrail * 0.1, 80, 64.5 + hairTrail * 0.2, 100, 63.5 + hairTrail * 0.35, 120]
    ];
    // The left side walked back up from the bottom, to close the shape.
    const hairLUp = hairL.map((s, i) => [s[2], s[3], s[0], s[1], ...(i ? hairL[i - 1].slice(4) : [91, 11])]).reverse();
    // The shadow the hair throws on her arms and sleeves, just outside its
    // edge from below the ear down past the elbow. The hair covers the
    // shoulders, and without this the arms looked fixed to the side of the
    // hair; with it they read as coming out from underneath.
    pctx.save();
    pctx.translate(-1.3, 0.5);
    bezierLine([73, 25], [hairL[1], hairL[2], hairL[3]], PAL.outline, STROKE.band);
    pctx.restore();
    pctx.save();
    pctx.translate(1.3, 0.5);
    bezierLine([109, 25], [hairR[1], hairR[2], hairR[3]], PAL.outline, STROKE.band);
    pctx.restore();
    // Its lower edge is a run of short points sitting above where the locks
    // end, so the locks drawn over it make the ragged edge.
    bezierShape([91, 11], hairR.concat([
      [119.5 + hairTrail * 0.45, 128, 119 + hairTrail * 0.5, 133, 117 + hairTrail * 0.55, 138],
      [115.5 + hairTrail * 0.5, 131, 115 + hairTrail * 0.45, 126, 114.5 + hairTrail * 0.45, 123],
      [113 + hairTrail * 0.5, 128, 112 + hairTrail * 0.5, 132, 110 + hairTrail * 0.55, 136],
      [109.5 + hairTrail * 0.5, 129, 109 + hairTrail * 0.45, 124, 109 + hairTrail * 0.45, 121],
      [108 + hairTrail * 0.5, 126, 107 + hairTrail * 0.5, 130, 105 + hairTrail * 0.55, 135],
      [103 + hairTrail * 0.5, 129, 101 + hairTrail * 0.45, 124, 100 + hairTrail * 0.45, 121],
      [98 + hairTrail * 0.5, 127, 97 + hairTrail * 0.5, 131, 96 + hairTrail * 0.5, 136],
      [94 + hairTrail * 0.45, 129, 93 + hairTrail * 0.45, 125, 92 + hairTrail * 0.45, 122],
      [90 + hairTrail * 0.5, 127, 89 + hairTrail * 0.5, 130, 88 + hairTrail * 0.5, 133],
      [86 + hairTrail * 0.45, 128, 85 + hairTrail * 0.45, 124, 84 + hairTrail * 0.45, 121],
      [82 + hairTrail * 0.5, 127, 80 + hairTrail * 0.5, 131, 78 + hairTrail * 0.55, 136],
      [76 + hairTrail * 0.5, 130, 75 + hairTrail * 0.45, 126, 74 + hairTrail * 0.45, 123],
      [72 + hairTrail * 0.5, 128, 70.5 + hairTrail * 0.5, 131, 69 + hairTrail * 0.55, 134],
      [67.5 + hairTrail * 0.5, 129, 67 + hairTrail * 0.45, 125, 66.5 + hairTrail * 0.45, 123],
      [66 + hairTrail * 0.5, 128, 65.5 + hairTrail * 0.5, 133, 65 + hairTrail * 0.55, 138],
      [63.5 + hairTrail * 0.5, 132, 63 + hairTrail * 0.45, 126, 63.5 + hairTrail * 0.35, 120]
    ], hairLUp), PAL.hairMid);

    // Everything inside the hair is clipped to its outline, left open at the
    // bottom for the lock ends, so no lock can bulge out past the edge line.
    pctx.save();
    pctx.beginPath();
    pctx.moveTo(91, 11);
    hairR.forEach(s => pctx.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]));
    pctx.lineTo(128 + hairTrail, 165);
    pctx.lineTo(54 + hairTrail, 165);
    pctx.lineTo(63.5 + hairTrail * 0.35, 120);
    hairLUp.forEach(s => pctx.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]));
    pctx.clip();

    // Locks hanging down her back. They differ in width, tone and length,
    // and end at different heights, so the bottom of the hair is a ragged run
    // of points rather than a row of even scallops.
    //
    // Each lock also moves on its own: the root stays put, the middle swings
    // a little behind the body and the tip further behind still, so a lock
    // bends into a soft S as it swings instead of pivoting like a stick. The
    // lag grows across the hair and is larger on the layers underneath, so
    // no two neighbouring locks move in step.
    const tipX = (x, k) => x + hairTrail * k;
    //
    // On top of that the hair hangs as three masses, left, middle and right,
    // and each mass swings as a whole on its own lag and answers a step in
    // its own way, so the back reads as three bunches of hair moving past
    // each other rather than one striped curtain.
    const massSwing = [
      wave(0.1, 0.6) - walkStep * 0.5,
      wave(0.9, 0.35),
      wave(1.7, 0.6) + walkStep * 0.5,
    ];
    const hang = (x0, y0, w, x1, y1, bend, c, k, lag, shaded, mass) => {
      const len = (y1 - y0) / 100;
      const tip = wave(lag + 1.3, len * 1.5) - walkStep * len * 0.7 + massSwing[mass] * len;
      const mid = wave(lag + 0.6, len * 0.9) - walkStep * len * 0.3 + massSwing[mass] * len * 0.5;
      (shaded ? hairLockShaded : hairLock)(x0, y0, w, tipX(x1, k) + tip, y1, bend + mid - tip * 0.35, c);
    };
    // The outer locks, darker as they turn away from the light.
    hang(73, 13, 10, 59, 146, -3, PAL.hairShadow, 0.75, 0.2, true, 0);
    hang(109, 13, 10, 123, 148, 3, PAL.hairDeep, 0.75, 1, true, 2);
    hang(77, 13, 7, 65, 136, -1.5, PAL.hairMid, 0.7, 0.35, true, 0);
    hang(105, 13, 7, 117, 139, 1.5, PAL.hairShadow, 0.7, 0.9, true, 2);
    // A dark layer showing between the lighter locks lower down. Its tops
    // are covered by the locks in front of it.
    hang(80, 40, 6, 63, 138, -2, PAL.hairShadow, 0.7, 0.8, false, 0);
    hang(102, 40, 6, 119, 141, 2, PAL.hairDeep, 0.7, 1.3, false, 2);
    hang(88, 40, 9, 81, 150, -0.5, PAL.hairShadow, 0.55, 1, false, 1);
    hang(96, 40, 9, 101, 147, 1, PAL.hairDeep, 0.55, 1.2, false, 1);
    // The front locks run unbroken from the crown to their ends, so the pale
    // head and the lengths below it are the same hair. Drawn left to right,
    // each lies over the one before it, so a lock's shade band shows only
    // where it parts from its neighbour.
    // The middle mass hangs longest and the two sides end at different
    // heights, so the tips step down unevenly across the back.
    hang(79.5, 12, 8, 67, 126, -1.5, PAL.hairMid, 0.62, 0.3, true, 0);
    hang(84.5, 12, 9, 72, 138, -1, PAL.hairLight, 0.6, 0.45, true, 0);
    hang(87.5, 12, 5, 84, 118, -0.5, PAL.hairLight, 0.52, 0.6, true, 1);
    hang(90.5, 12, 9, 88, 145, 0, PAL.hairLight, 0.5, 0.55, true, 1);
    hang(97, 12, 9, 96, 150, 0.5, PAL.hairLight, 0.5, 0.7, true, 1);
    hang(102, 12, 8, 110, 136, 1.5, PAL.hairMid, 0.6, 0.8, true, 2);
    hang(105.5, 14, 5, 116, 130, 1.5, PAL.hairShadow, 0.65, 0.95, true, 2);

    // The partings between the masses: a dark wedge that opens from nothing
    // below the shoulders to a gap near the ends, following the masses on
    // either side as they swing, so the gap widens and closes as they move.
    const parting = (xTop, yTop, xBot, yBot, a, b) => {
      const sw = (massSwing[a] + massSwing[b]) * 0.5 * (yBot - yTop) / 100;
      const xb = tipX(xBot, 0.55) + sw;
      const open = 1.2 + Math.abs(massSwing[a] - massSwing[b]) * 0.8;
      bezierShape([xTop, yTop], [
        [xTop - 0.4, yTop + (yBot - yTop) * 0.5, xb - open, yBot - 18, xb - open * 0.5, yBot],
        [xb + open * 0.3, yBot - 2, xb + open, yBot - 18, xTop + 0.4, yTop + (yBot - yTop) * 0.5]
      ], PAL.hairDeep);
    };
    parting(84, 64, 77.5, 128, 0, 1);
    parting(100, 60, 105.5, 132, 1, 2);

    // Locks curving round the skull from the crown, which is what gives the
    // head a round back to it.
    bezierLine([90, 13], [[83, 20, 79, 32, 80.5, 46]], PAL.hairMid, STROKE.fine);
    bezierLine([92.5, 13], [[94, 24, 95, 36, 94, 47]], PAL.hairMid, STROKE.fine);
    bezierLine([95, 13], [[100.5, 21, 103, 33, 101.5, 47]], PAL.hairShadow, STROKE.fine);
    bezierLine([88, 14], [[84, 24, 84, 36, 86.5, 47]], PAL.hairMid, STROKE.hairline);
    bezierLine([93.5, 12.5], [[98, 18, 99.5, 28, 98.5, 40]], PAL.hairMid, STROKE.hairline);
    bezierLine([89, 13], [[80, 17, 76, 26, 76, 38]], PAL.hairShadow, STROKE.hairline);
    bezierLine([94, 12.5], [[103, 16, 106.5, 24, 106.5, 34]], PAL.hairShadow, STROKE.hairline);
    // The whorl at the crown the locks all start from.
    bezierLine([89.5, 12.6], [[90.5, 11.8, 92, 11.8, 93, 12.8]], PAL.hairShadow, STROKE.fine);

    // Shine band round the crown. A stroke of even width with blunt ends
    // reads as tape stuck to the head, and separate dashes read as
    // stitching, so each band follows the curve of the skull, swells in the
    // middle and tapers to nothing at both ends, with a few uneven nicks in
    // its lower edge where the locks under it part.
    {
      const cx = 91, cy = 36, rx = 15.4, ry = 14;
      const at = (a, d) => [cx + Math.sin(a) * (rx - d), cy - Math.cos(a) * (ry - d)];
      const nick = { 3: 0.3, 6: 0.55, 8: 0.2 };
      for (const [a0, a1, thick, c] of [[-1.2, 0.2, 2.6, PAL.hairHi], [0.34, 1.02, 1.4, PAL.hairLight]]) {
        const n = 11;
        const segs = [];
        const put = p => segs.push([p[0], p[1], p[0], p[1], p[0], p[1]]);
        for (let i = 1; i <= n; i++) put(at(a0 + (a1 - a0) * i / n, 2.6));
        for (let i = n - 1; i >= 1; i--) {
          const w = thick * Math.sin(Math.PI * i / n) * (nick[i] || 1);
          put(at(a0 + (a1 - a0) * i / n, 2.6 + w));
        }
        bezierShape(at(a0, 2.6), segs, c);
      }
    }

    pctx.restore();

    // Edge line down the outside of the hair, so the lavender does not melt
    // into the cream sleeves it falls over.
    bezierLine([91, 11], hairR, PAL.hairDeep, STROKE.seam);
    bezierLine([91, 11], hairL, PAL.hairShadow, STROKE.seam);
    // The same strand from behind, curling toward her right, which is the
    // viewer's right from this side too since it leans back over her head.
    drawAhoge(90.6, 11.6, wave(0.8, 0.65));

    // Her ornaments, from behind. The orbital rings and the crystal drop are
    // on her left, so they sit on the viewer's left here, and the star pin
    // with its chain on the right. They are on the sides of the head, so
    // they break its outline, which is where they do the most for it. Sizes,
    // chains and beads are the front view's, mirrored, so the pieces do not
    // change as she turns.
    const accLag = wave(0.9, 0.5);
    ring(78, 21, 7, 2.6, 0.5, PAL.goldDark, STROKE.fine);
    ring(78, 21, 6.2, 2.2, -0.75, PAL.gold, STROKE.fine);
    ring(78, 21, 4.4, 4.2, 0, PAL.goldDark, STROKE.hairline);
    sparkle(78, 21, 2.6, PAL.gold);
    sparkle(78, 21, 1.2, PAL.goldHi);
    sparkle(72, 17, 1.3, PAL.goldHi);
    sparkle(83.5, 25, 1.1, PAL.gold);
    const dropLag = wave(1.2, 0.6);
    bezierLine([77, 24], [[76, 30, 75, 36, 74.5 + dropLag, 41]], PAL.goldDark, STROKE.fine);
    ellipse(75.7, 29, 0.7, 0.7, PAL.gold);
    ellipse(75, 34.5, 0.7, 0.7, PAL.gold);
    // The drop turns on its chain as it swings, rather than sliding sideways.
    pctx.save();
    pctx.translate(74.5 + dropLag, 41);
    pctx.rotate(-dropLag * 0.12);
    crystal(0, 3, 3.2, PAL.eyeBlue, PAL.eyeLight);
    pctx.restore();
    crystal(79 + dropLag * 0.5, 33, 2, PAL.eyeDeep, PAL.eyeBlue);
    // Star pin, with its short chain and the filigree sweeping back off it,
    // which from here runs out past the edge of her head.
    bezierLine([103.8, 25], [[104.2, 28, 104.8, 30, 105.4 + accLag, 32]], PAL.goldDark, STROKE.fine);
    ellipse(104.2, 27.6, 0.75, 0.75, PAL.gold);
    ellipse(104.9, 30, 0.75, 0.75, PAL.gold);
    sparkle(105.6 + accLag, 33.6, 2.2, PAL.goldDark);
    sparkle(105.6 + accLag, 33.6, 1.5, PAL.gold);
    bezierLine([105.2, 19], [[108.2, 16, 111.2, 17, 113.2, 20]], PAL.goldDark, STROKE.fine);
    bezierLine([107.2, 22], [[110.2, 22, 112.2, 24, 112.7, 27]], PAL.gold, STROKE.hairline);
    sparkle(113.6, 20, 1.3, PAL.goldHi);
    sparkle(112.8, 27, 1, PAL.gold);
    sparkle(103.5, 22, 3.4, PAL.goldDark);
    sparkle(103.5, 22, 2.6, PAL.gold);
    sparkle(103.5, 22, 1.2, PAL.goldHi);

    // Top graphics tier only, the same split the front view makes: the
    // figure above stands on its own and this is polish on it.
    if (gfxLevel() === 0) {
      // Rim light down the far side, from the gate, as on the front view.
      bezierLine([98, 13.2], [[103, 14.5, 106.6, 19, 107, 29]], PAL.hairHi, STROKE.fine);
      bezierLine([114.8, 62], [[115.8, 80, 116.7 + hairTrail * 0.2, 100, 117.7 + hairTrail * 0.35, 119]], PAL.hairLight, STROKE.fine);
      bezierLine([122 + fabricTrail * 0.15, 63], [[128 + fabricTrail * 0.35, 75, 136 + fabricTrail * 0.7, 88, 144 + fabricTrail, 100]], PAL.cream, STROKE.fine);
      bezierLine([127.4 + fabricTrail * 0.35, 136], [[128.4 + fabricTrail * 0.4, 140, 129 + fabricTrail * 0.4, 142, 129.4 + fabricTrail * 0.45, 144]], PAL.cream, STROKE.fine);

      // Contact shadows under the sleeve hems, where they hang over the
      // indigo panels.
      bezierLine([42 + fabricTrail * 0.85, 104], [[48 + fabricTrail * 0.7, 105, 53 + fabricTrail * 0.5, 104, 58 + fabricTrail * 0.4, 100]], PAL.indigoDeep, STROKE.seam);
      bezierLine([140 + fabricTrail * 0.85, 104], [[134 + fabricTrail * 0.7, 105, 129 + fabricTrail * 0.5, 104, 124 + fabricTrail * 0.4, 100]], PAL.indigoDeep, STROKE.seam);

      // Two loose strands breaking off the ends of the locks, trailing
      // further than the locks do.
      bezierLine([tipX(70, 0.5), 128], [[tipX(69, 0.6), 133, tipX(67.5, 0.75), 137, tipX(66, 0.9), 141]], PAL.hairLight, STROKE.hairline);
      bezierLine([tipX(111, 0.5), 130], [[tipX(112.5, 0.6), 135, tipX(114, 0.75), 139, tipX(116, 0.9), 144]], PAL.hairMid, STROKE.hairline);

      // Flyaways: single hairs lifting off the outline, lighter than any
      // lock, so they flutter at twice the rate.
      const fa = quiver(0.4, 0.9), fb = quiver(1.9, 0.9), fc = quiver(3.1, 1.1);
      bezierLine([74, 30], [[71, 35, 69 + fa * 0.5, 40, 68 + fa, 46]], PAL.hairLight, STROKE.hairline);
      bezierLine([108.5, 31], [[111, 36, 113 + fb * 0.5, 42, 114 + fb, 48]], PAL.hairMid, STROKE.hairline);
      bezierLine([66.5, 70], [[63.5, 80, 62 + fc * 0.6, 88, 62.5 + fc, 96]], PAL.hairLight, STROKE.hairline);
      bezierLine([116, 74], [[119, 84, 120 + fa * 0.6, 92, 119.5 + fa, 100]], PAL.hairMid, STROKE.hairline);

      // The gold catching light on the same slow cycle as the front view.
      const glint = Math.sin(t * Math.PI * 2);
      if (glint > 0.35) {
        sparkle(103.5, 22, 4.4, PAL.goldHi);
        sparkle(78, 21, 3.8, PAL.goldHi);
      } else if (glint < -0.35) {
        sparkle(56 + fabricTrail * 0.6, 112, 3, PAL.goldHi);
        sparkle(127 + fabricTrail * 0.6, 116, 2.8, PAL.goldHi);
      }
    }

    pctx.restore();
  }

  function easeOutCubic(v) { return 1 - Math.pow(1 - v, 3); }
  function easeInOut(v) { return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  // Quintic smoothstep: zero slope at both ends, so anything driven by it
  // leaves rest and returns to it without a visible corner.
  function smootherstep(v) { return v * v * v * (v * (v * 6 - 15) + 10); }

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
  // Rebuilt only when the canvas size actually changes. It used to allocate a
  // fresh object every frame, which is small on its own but adds up across a
  // sustained sequence and shows as periodic collection pauses.
  const _layout = { box: 0, portrait: false, standX: 0, centerY: 0, gateX: 0, gateR: 0, ringR: 0 };
  let _layoutW = 0, _layoutH = 0;
  function layout() {
    if (_layoutW === canvas.width && _layoutH === canvas.height) return _layout;
    _layoutW = canvas.width; _layoutH = canvas.height;
    // A phone held upright has almost no horizontal room, and the landscape
    // numbers put her spell ring straight through the gate. Portrait gets its
    // own set: a slightly larger figure (there is vertical room to spare), a
    // tighter ring, and the gate pushed further out.
    const portrait = canvas.height > canvas.width * 1.15;
    const box = portrait
      ? Math.min(canvas.height * 0.30, canvas.width * 0.52)
      : Math.min(canvas.height * 0.50, canvas.width * 0.44);
    return Object.assign(_layout, {
      box,
      portrait,
      standX: canvas.width * (portrait ? 0.30 : 0.37),
      // Low enough that the announcement banner clears her face.
      centerY: canvas.height * 0.52,
      gateX: canvas.width * (portrait ? 0.78 : 0.66),
      gateR: box * (portrait ? 0.32 : 0.38),
      ringR: box * (portrait ? 0.50 : 0.62),
    });
  }

  function blitSprite(L, x, y, scale, alpha) {
    if (alpha <= 0.01 || scale <= 0.01) return;
    // Size and position land on whole pixels. The buffer is sized to match
    // what is on screen, so at rest this is a 1:1 copy; at a fractional
    // offset, with smoothing off, which source pixel each screen pixel takes
    // flips from frame to frame and her edges crawl as she glides.
    //
    // Shrinking the buffer is the one case that gets smoothing: a phone
    // shows her at about 195px from a 360px buffer, and nearest-neighbour
    // down that far drops whole lines and shimmers as she moves. At 1:1 or
    // above, smoothing only blurs, so it stays off.
    const w = Math.round(L.box * scale);
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.imageSmoothingEnabled = px.width > w * 1.1;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(px, Math.round(x - w / 2), Math.round(y - w / 2), w, w);
    ctx.restore();
  }

  // The reality gate, ported from the prototype's drawRealityGate. Its body
  // is written against a fixed 154px radius, so the caller's radius comes in
  // as a uniform scale around it and `openness` squashes it horizontally the
  // same way the prototype's portal opens and shuts.
  // The gate's interior wash has fixed geometry and fixed stops, so it only
  // ever needed building once rather than on every frame the gate is open.
  // createRadialGradient is one of the more expensive calls on this path.
  let _gateInteriorGrad = null;
  function _gateInterior() {
    if (!_gateInteriorGrad) {
      _gateInteriorGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 154);
      _gateInteriorGrad.addColorStop(0, 'rgba(18,12,42,0.82)');
      _gateInteriorGrad.addColorStop(0.56, 'rgba(31,19,68,0.72)');
      _gateInteriorGrad.addColorStop(0.84, 'rgba(89,58,142,0.28)');
      _gateInteriorGrad.addColorStop(1, 'rgba(12,8,31,0)');
    }
    return _gateInteriorGrad;
  }

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
    ctx.fillStyle = _gateInterior();
    ctx.beginPath();
    ctx.arc(0, 0, R - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R - 18, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    // Per-line alpha goes through globalAlpha rather than into a fresh rgba()
    // string. Same result on screen, no allocation and no colour parse for the
    // roughly fifty lines these three loops draw every frame.
    ctx.strokeStyle = 'rgb(193,169,255)';
    for (let gy = -112; gy <= 112; gy += 16) {
      const half = Math.sqrt(Math.max(0, (R - 22) * (R - 22) - gy * gy));
      const shimmer = 0.1 + 0.1 * Math.sin(now * 0.004 + gy * 0.08);
      ctx.globalAlpha = alpha * shimmer;
      ctx.lineWidth = 0.8 * lineComp;
      ctx.beginPath();
      ctx.moveTo(-half, gy);
      ctx.lineTo(half, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgb(151,126,226)';
    for (let gx = -112; gx <= 112; gx += 16) {
      const half = Math.sqrt(Math.max(0, (R - 22) * (R - 22) - gx * gx));
      const shimmer = 0.08 + 0.09 * Math.sin(now * 0.0035 + gx * 0.07);
      ctx.globalAlpha = alpha * shimmer;
      ctx.lineWidth = 0.75 * lineComp;
      ctx.beginPath();
      ctx.moveTo(gx, -half);
      ctx.lineTo(gx, half);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgb(239,226,255)';
    ctx.globalAlpha = alpha * (0.035 + pulse * 0.025);
    ctx.lineWidth = 0.55 * lineComp;
    for (let sy = -104; sy <= 104; sy += 9) {
      const drift = Math.sin(now * 0.005 + sy * 0.12) * 5;
      const half = Math.sqrt(Math.max(0, (R - 26) * (R - 26) - sy * sy));
      ctx.beginPath();
      ctx.moveTo(-half + drift, sy);
      ctx.lineTo(half + drift, sy);
      ctx.stroke();
    }
    ctx.restore(); // also restores the globalAlpha the loops above changed

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

  // One radial-gradient sprite, built once and then stretched per draw. Every
  // other option here allocates: createRadialGradient rebuilds the ramp on the
  // CPU each call, and shadowBlur re-rasterises the whole shape. Neither is
  // affordable on something drawn a dozen times a frame.
  // core.js owns the quality flags, and this module can be loaded without it
  // (the standalone preview harness under misc/scratch does exactly that, and
  // guide.html loads render files with no config.js at all), so read them
  // defensively rather than assuming they exist.
  function gfxLevel() { return typeof _gfxLevel === 'number' ? _gfxLevel : 0; }
  function lowDetail() { return (typeof _mobPerf !== 'undefined' && _mobPerf) || gfxLevel() >= 2; }

  let _energyGlow = null;
  function energyGlow() {
    if (_energyGlow) return _energyGlow;
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,252,255,0.95)');
    grad.addColorStop(0.22, 'rgba(226,168,255,0.8)');
    grad.addColorStop(0.55, 'rgba(158,70,255,0.32)');
    grad.addColorStop(1, 'rgba(120,30,220,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    _energyGlow = c;
    return c;
  }

  // Where her raised hand actually is on screen. Both the energy glow and the
  // bursts fired by the summon and cast beats read from this, so they can
  // never end up pointing at different places.
  function handPos(L, pose, t) {
    if (!pose || !pose.opts) return null;
    const castExt = pose.opts.castExt || 0;
    if (castExt <= 0.02) return null;
    // Matches the right arm in drawKanade, plus the lean/bob that
    // drawKanade translates the whole body by before it draws anything.
    const lean = pose.opts.lean || 0;
    const bobAmp = pose.opts.bobAmp != null ? pose.opts.bobAmp : 1;
    const bob = Math.sin(t * Math.PI * 2) * bobAmp;
    const u = (L.box * pose.scale) / GRID_W;
    // The same wrist path and shoulder drop the arm is drawn with.
    const w = castWrist(castExt, 0);
    const drop = 1.5 * (1 - castExt);
    return {
      x: pose.x + (w[0] + 0.5 * castExt + lean - GRID_W / 2) * u,
      y: pose.y + (w[1] + 0.8 * castExt + drop + bob - GRID_H / 2) * u,
      u,
    };
  }

  // Energy gathering in her raised hand across the summon and cast beats.
  // Everything is positioned from `now` alone rather than from stored particle
  // state, so there is no array to grow, no objects allocated per frame and
  // nothing for the collector to sweep up mid-sequence.
  function drawCastEnergy(L, pose, t, now, charge) {
    if (charge <= 0.02) return;
    const hand = handPos(L, pose, t);
    if (!hand) return;
    const hx = hand.x, hy = hand.y, u = hand.u;

    const pulse = 0.85 + 0.15 * Math.sin(now * 0.012);
    const core = u * (3.4 + 5.2 * charge) * pulse;
    const glow = energyGlow();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, pose.alpha) * (0.30 + 0.45 * charge);

    // Wide halo, then the bright core, both the same sprite at two sizes.
    const halo = core * 3.1;
    ctx.drawImage(glow, hx - halo, hy - halo, halo * 2, halo * 2);
    ctx.globalAlpha = Math.min(1, pose.alpha) * (0.55 + 0.45 * charge);
    ctx.drawImage(glow, hx - core, hy - core, core * 2, core * 2);

    // Motes spiralling inward. Position comes straight out of `now` and the
    // index, so this loop touches no state at all.
    const motes = lowDetail() ? 8 : 16;
    const reach = core * 4.4;
    ctx.fillStyle = 'rgba(224,180,255,0.9)';
    for (let i = 0; i < motes; i++) {
      const phase = (now * 0.0009 + i / motes) % 1;
      const r = reach * (1 - phase);
      const a = i * 2.399 + now * 0.004 + phase * 5.2;
      const sz = Math.max(1, u * 1.1 * (1 - phase));
      ctx.globalAlpha = Math.min(1, pose.alpha) * charge * (1 - Math.abs(phase - 0.5) * 1.4);
      ctx.fillRect(hx + Math.cos(a) * r - sz / 2, hy + Math.sin(a) * r - sz / 2, sz, sz);
    }

    // Two thin arcs crossing the core, only on the full-detail tier - they are
    // the one part here that costs real stroke work.
    if (!lowDetail() && gfxLevel() === 0) {
      ctx.globalAlpha = Math.min(1, pose.alpha) * charge * 0.75;
      ctx.strokeStyle = 'rgba(236,206,255,0.9)';
      ctx.lineWidth = Math.max(1, u * 0.55);
      for (let k = 0; k < 2; k++) {
        const spin = now * (k ? -0.0035 : 0.0026) + k * 1.9;
        ctx.beginPath();
        ctx.ellipse(hx, hy, core * 1.9, core * 0.62, spin, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Violet power still clinging to Goliath as he comes down, burning off as he
  // settles. `q` runs 0 at the moment she summons him to 1 once he has landed.
  // Built from the same cached sprite and index-driven maths as the cast glow,
  // so it adds no allocation and no per-frame gradient.
  function drawSummonAura(enemy, q, now) {
    const tier = freezeTier();
    if (tier >= 3) return;
    // Full strength while he descends, then burning off over the last stretch.
    const fade = 1 - clamp01((q - 0.5) / 0.5);
    if (fade <= 0.02) return;

    const r = (enemy.size || 150) * 0.75;
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.006);
    const glow = energyGlow();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const halo = r * 1.9 * pulse;
    ctx.globalAlpha = fade * 0.5;
    ctx.drawImage(glow, enemy.x - halo, enemy.y - halo, halo * 2, halo * 2);

    // Rings wrapping him, tilted so they read as orbiting rather than flat.
    if (tier <= 1) {
      ctx.globalAlpha = fade * 0.75;
      ctx.strokeStyle = 'rgba(214,166,255,1)';
      ctx.lineWidth = 2;
      const rings = tier === 0 ? 3 : 2;
      for (let k = 0; k < rings; k++) {
        const spin = now * (0.0016 + k * 0.0009) * (k % 2 ? -1 : 1);
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y, r * (1.15 - k * 0.16), r * (0.34 + k * 0.1), spin, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Embers streaming off him as the power burns away.
    const embers = tier === 0 ? 18 : 10;
    ctx.fillStyle = 'rgba(232,196,255,1)';
    for (let i = 0; i < embers; i++) {
      const phase = (now * 0.0007 + i / embers) % 1;
      const a = i * 2.39996 + now * 0.0012;
      const rad = r * (0.7 + phase * 1.5);
      const sz = Math.max(1, r * 0.035 * (1 - phase));
      ctx.globalAlpha = fade * (1 - phase) * 0.8;
      ctx.fillRect(enemy.x + Math.cos(a) * rad - sz / 2, enemy.y + Math.sin(a) * rad * 0.8 - sz / 2, sz, sz);
    }
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
    // Hoisted: these do not vary across the loop, but rebuilding the string
    // inside it meant 24 identical allocations plus 24 CSS colour parses every
    // frame, and the same again for the eight orbiting dots below.
    ctx.strokeStyle = 'hsla(280, 70%, 75%, ' + (0.5 + energy * 0.4) + ')';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const inner = R + 4, outer = R + (i % 3 === 0 ? 16 : 9);
      ctx.lineWidth = i % 3 === 0 ? 3.2 : 1.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.fillStyle = 'hsla(320, 90%, 78%, ' + (0.7 + energy * 0.3) + ')';
    for (let i = 0; i < 8; i++) {
      const a = ringRot * 1.6 + (i / 8) * Math.PI * 2;
      const r = R + 26;
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
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#f3e9ff';
    ctx.font = "900 " + Math.max(18, Math.round(h * 0.34)) + "px 'Cinzel', serif";
    ctx.fillText(effect.name, cx, top + h * 0.52);
    ctx.shadowBlur = 0;

    // The pair reads as one line under the banner: the player-favouring
    // hourglass and its half on the left, the broken enemy one on the right.
    // Icons sit out at the banner's decorated ends so they stay off her.
    // Floors matter on a phone: straight percentages of a 330px-wide banner
    // give a 6px font, which is unreadable.
    const iconR = Math.max(14, w * 0.045);
    const halves = [
      { img: _tdPlayerIconImg, text: effect.playerHalf, dir: -1, color: '#ffe9a8' },
      { img: _tdEnemyIconImg, text: effect.enemyHalf, dir: 1, color: '#ff9aa6' },
    ];
    // Below the ring, in the clear band under her, so neither line crosses her.
    const rowY = Math.min(canvas.height - iconR * 1.6, L.centerY + L.ringR + iconR * 1.4);
    ctx.font = Math.max(11, Math.round(w * 0.021)) + "px 'Courier New', monospace";
    // Each half is an icon followed by its line, measured and laid out as one
    // group. Placing them at fixed offsets meant the text was centred on a
    // point that sat inside its own icon, so the two overlapped as soon as the
    // line was longer than the gap allowed for.
    const gap = iconR * 0.55;
    const groups = halves.map(half => {
      const tw = ctx.measureText(half.text).width;
      return { half, tw, width: iconR * 2 + gap + tw };
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const rowGap = iconR * 1.6;
    const sideBySide = groups[0].width + groups[1].width + rowGap <= canvas.width * 0.94;
    groups.forEach((g, i) => {
      // Side by side when both fit on one line, stacked when they do not,
      // which is what happens on a narrow screen or with longer copy.
      const y = sideBySide ? rowY : rowY + (i - 0.5) * iconR * 2.4;
      const startX = sideBySide
        ? cx + (i === 0 ? -(g.width + rowGap / 2) : rowGap / 2)
        : cx - g.width / 2;
      if (g.half.img.complete && g.half.img.naturalWidth) {
        ctx.drawImage(g.half.img, startX, y - iconR, iconR * 2, iconR * 2);
      }
      ctx.fillStyle = g.half.color;
      ctx.fillText(g.half.text, startX + iconR * 2 + gap, y);
    });
    ctx.restore();
  }

  // The eight beats, in order, with their lengths in ms. Elapsed time is
  // measured against _frozenNow, so an ESC pause mid-cutscene holds the whole
  // sequence in place instead of letting it run on behind the pause screen.
  const BEATS = [
    { id: 'freeze',  ms: 1200 },  // sim stops, the screen darkens
    { id: 'gate',    ms: 900 },   // the reality gate tears open
    { id: 'walkOut', ms: 1900 },  // she steps out back-first, then turns to face forward
    { id: 'think',   ms: 1800 },  // she stands deciding, thought bubble up
    { id: 'summon',  ms: 1300 },  // Goliath Alpha enters the arena for real
    { id: 'cast',    ms: 2400 },  // the rolled effect applies, banner up
    { id: 'leave',   ms: 1800 },  // she turns, walks back into the gate
    { id: 'close',   ms: 1100 },  // gate shuts, overlay lifts, time resumes
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

  // The freeze does not fade in over the whole screen. It spreads out from the
  // gate as a front, so the stopped space reads as having a source rather than
  // arriving everywhere at once. Returns how far that front has travelled, 0
  // to 1 of the distance from the gate to the furthest screen corner.
  // How far the freeze has spread, 0 to 1. Both the arrival and the release
  // ride a quintic smoothstep: it leaves 0 and reaches 1 with no slope at
  // either end, so the front eases into motion and settles instead of
  // snapping on at full speed and stopping dead. Everything that follows the
  // front inherits that, which is most of the transition.
  function freezeFront(beatId, p) {
    if (beatId === 'freeze') return smootherstep(p);
    if (beatId === 'close') return 1 - smootherstep(p);
    return 1;
  }

  // Constant: the wash is bounded by the front above, not by its own fade.
  function overlayAlpha() { return 0.86; }

  // The wash itself, bounded by the front. A hard-ish edge with a short
  // feathered band reads as an expanding wavefront rather than a fade.
  // Where the front is this frame, measured from the gate she opens. One
  // source of truth: the wash draws to it, and everything that belongs to the
  // frozen space is clipped by it.
  function frontRadius(L, reach) {
    const W = canvas.width, H = canvas.height;
    const cx = L.gateX, cy = L.centerY;
    return Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.02 * reach;
  }

  // The stopped world exists inside the front and nowhere else, so its layers
  // are cut to that circle rather than faded across the whole screen. Fading
  // them left the citadel and the lattice hanging over the live arena after
  // the front had already withdrawn past them, and on the way in they simply
  // appeared everywhere at once instead of spreading out of the gate.
  // Caller owns the save/restore.
  function clipToFront(L, reach) {
    if (reach >= 0.999) return;
    ctx.beginPath();
    ctx.arc(L.gateX, L.centerY, frontRadius(L, reach), 0, Math.PI * 2);
    ctx.clip();
  }

  function drawFreezeWash(L, wash, reach) {
    if (wash <= 0.01 || reach <= 0.001) return;
    const W = canvas.width, H = canvas.height;
    const cx = L.gateX, cy = L.centerY;
    const r = frontRadius(L, reach);
    ctx.save();
    if (reach >= 0.999) {
      ctx.globalAlpha = wash;
      ctx.fillStyle = 'rgba(6,4,16,1)';
      ctx.fillRect(0, 0, W, H);
    } else {
      const feather = Math.max(0.001, Math.min(0.18, 26 / Math.max(1, r)));
      const g = ctx.createRadialGradient(cx, cy, Math.max(0, r * (1 - feather)), cx, cy, r);
      g.addColorStop(0, 'rgba(6,4,16,1)');
      g.addColorStop(0.72, 'rgba(6,4,16,1)');
      g.addColorStop(1, 'rgba(6,4,16,0)');
      ctx.globalAlpha = wash;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // A bright rim riding the front.
      ctx.globalAlpha = Math.min(1, wash) * 0.7;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(206,166,255,1)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // How much of the freeze treatment this machine gets. The sequence runs for
  // eleven seconds with the whole simulation stopped, so there is headroom on
  // the tiers that can afford it, but none of it is worth a dropped frame on
  // the ones that cannot.
  //   0 HIGH   everything
  //   1 MEDIUM everything, fewer of each
  //   2 LOW    the grid only, no shards or scanline
  //   3+ MIN   wash and vignette alone
  function freezeTier() {
    const lv = gfxLevel();
    if (typeof _mobPerf !== 'undefined' && _mobPerf && lv < 2) return 2;
    return lv;
  }

  // The stopped-time treatment layered over the flat wash: a faint lattice
  // pulling toward her, shards of frozen light hanging in the air, a shock
  // ring on the moment of the freeze, and a slow scanline crawling down.
  // Everything is positioned out of `now` and a loop index, so none of it
  // allocates and none of it needs state carried between frames.
  let _scanGrad = null, _scanGradBand = -1;
  function drawFreezeField(L, wash, elapsed, now) {
    const tier = freezeTier();
    if (tier >= 3 || wash <= 0.02) return;

    const W = canvas.width, H = canvas.height;
    // Everything radiates from the gate, not from where she ends up standing:
    // the gate is what tore time open, so the shock ring and the scatter of
    // shards both read as coming out of it.
    const cx = L.gateX, cy = L.centerY;
    const strength = Math.min(1, wash / 0.86);
    const mobile = typeof _platform !== 'undefined' && _platform === 'mobile';

    ctx.save();

    // Lattice. Spacing scales with the canvas so a phone gets the same
    // density rather than a much finer mesh crammed into a narrow screen.
    const step = Math.max(34, Math.min(W, H) / (mobile ? 7 : 11));
    const drift = Math.sin(now * 0.0004) * step * 0.25;
    ctx.globalAlpha = strength * (tier === 0 ? 0.16 : 0.11);
    ctx.strokeStyle = 'rgba(150,110,235,1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -step + drift; x < W + step; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -step - drift; y < H + step; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    if (tier <= 1) {
      // Shards of caught light, hanging still but breathing very slightly so
      // the screen does not read as a frozen image.
      const shards = tier === 0 ? (mobile ? 16 : 26) : (mobile ? 9 : 14);
      const reach = Math.max(W, H) * 0.52;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < shards; i++) {
        // Golden-angle scatter: an even spread with no repeating pattern and
        // no random numbers, so every frame places them identically.
        const a = i * 2.39996;
        const rad = reach * Math.sqrt((i + 0.5) / shards);
        const breathe = 0.82 + 0.18 * Math.sin(now * 0.0016 + i * 1.7);
        const sx = cx + Math.cos(a) * rad;
        const sy = cy + Math.sin(a) * rad * 0.78;
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
        const len = (6 + (i % 5) * 3) * breathe;
        ctx.globalAlpha = strength * 0.5 * breathe;
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(226,196,255,1)' : 'rgba(150,104,232,1)';
        ctx.lineWidth = i % 4 === 0 ? 1.8 : 1;
        ctx.beginPath();
        ctx.moveTo(sx - len * 0.5, sy - len * 0.28);
        ctx.lineTo(sx + len * 0.5, sy + len * 0.28);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // The shock of time stopping: two rings racing outward once, on the way in.
    if (tier <= 1 && elapsed < 1500) {
      const q = elapsed / 1500;
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const qq = q - k * 0.16;
        if (qq <= 0 || qq >= 1) continue;
        ctx.globalAlpha = (1 - qq) * 0.5;
        ctx.strokeStyle = 'rgba(206,166,255,1)';
        ctx.lineWidth = (1 - qq) * 4 + 0.6;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(W, H) * 0.85 * qq, Math.max(W, H) * 0.62 * qq, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // A single band crawling down the frozen frame. Top tier only: it is a
    // full-width fill and the cheapest thing to drop.
    if (tier === 0) {
      const band = H * 0.14;
      const y = ((now * 0.035) % (H + band)) - band;
      // Built once for this canvas height and then translated into place, so
      // the crawl costs a transform rather than a new gradient every frame.
      if (!_scanGrad || _scanGradBand !== band) {
        _scanGrad = ctx.createLinearGradient(0, 0, 0, band);
        _scanGrad.addColorStop(0, 'rgba(170,130,255,0)');
        _scanGrad.addColorStop(0.5, 'rgba(190,150,255,0.055)');
        _scanGrad.addColorStop(1, 'rgba(170,130,255,0)');
        _scanGradBand = band;
      }
      ctx.globalAlpha = strength;
      ctx.translate(0, y);
      ctx.fillStyle = _scanGrad;
      ctx.fillRect(0, 0, W, band);
      ctx.translate(0, -y);
    }

    ctx.restore();
  }

  // The citadel behind the freeze. Drawn over the wash rather than under it,
  // because the wash is opaque where it has passed: this sits between the
  // stopped battlefield and everything else the cutscene puts on top.
  //
  // Faded in with the front, so the place is revealed by the freeze reaching
  // it rather than being there all along, and skipped entirely on the lowest
  // tier since it is a full-screen image.
  // Where the artwork lands on screen this frame, so the lighting below can
  // sit on features of the painting rather than on arbitrary screen positions.
  // Cover fit: fill the canvas and let the overflow crop, which is what the
  // art brief's 18-82% vertical safe area was drawn against.
  const _realmFit = { x: 0, y: 0, w: 0, h: 0 };
  function realmFit(now, iw, ih) {
    const W = canvas.width, H = canvas.height;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale, dh = ih * scale;
    // A very slow drift, a fraction of a pixel per frame, so the place feels
    // suspended rather than pasted on. Kept well inside the crop margin.
    const driftX = Math.sin(now * 0.00007) * Math.min(14, (dw - W) * 0.5 + 6);
    const driftY = Math.cos(now * 0.00005) * Math.min(10, (dh - H) * 0.5 + 4);
    _realmFit.x = (W - dw) / 2 + driftX;
    _realmFit.y = (H - dh) / 2 + driftY;
    _realmFit.w = dw;
    _realmFit.h = dh;
    return _realmFit;
  }

  function drawFrozenRealm(L, reach, now) {
    if (freezeTier() >= 3) return;
    if (reach <= 0.02) return;
    const vid = realmVideoReady();
    const src = vid ? _frozenRealmVid : _frozenRealmImg;
    const iw = vid ? _frozenRealmVid.videoWidth : _frozenRealmImg.naturalWidth;
    const ih = vid ? _frozenRealmVid.videoHeight : _frozenRealmImg.naturalHeight;
    if (!iw || !ih) return;
    if (!vid && !_frozenRealmImg.complete) return;
    _realmIsVideo = vid;
    const f = realmFit(now, iw, ih);
    ctx.save();
    clipToFront(L, reach);
    // Held at full strength inside the front instead of scaled by it: the
    // citadel is simply there wherever time has stopped. It sits under an
    // overlay that takes the scene down to 14 percent, so this is already a
    // long way from the source's own brightness. The ceiling is where the
    // citadel starts competing with her.
    ctx.globalAlpha = 0.32;
    ctx.drawImage(src, f.x, f.y, f.w, f.h);

    // Bloom taken from the picture itself: the same frame again, slightly
    // enlarged and added on top, so wherever the source is bright it blooms
    // and wherever it is dark nothing happens. Cheaper and truer to the art
    // than any glow drawn by hand, but it is a second full-frame draw, so
    // only the top tier pays for it.
    if (freezeTier() === 0) {
      const grow = 1.035;
      const bw = f.w * grow, bh = f.h * grow;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.11;
      ctx.drawImage(src, f.x - (bw - f.w) / 2, f.y - (bh - f.h) / 2, bw, bh);
    }
    ctx.restore();
  }

  // Light on top of the painting. Without it the backdrop reads as a still
  // photograph pasted behind the scene: the black hole sits there inert and
  // the emptier half of the frame has nothing happening in it at all.
  //
  // Two pieces, both cheap. A slow breathing bloom anchored to the accretion
  // disk in the artwork, and dust drifting through the void. Everything is
  // positioned from `now` and a loop index, so nothing is allocated per frame.
  //
  // Where the accretion disk sits within each source, as a fraction of its
  // own frame. The two are nowhere near each other: the painting puts the
  // black hole right of centre and high, the footage puts it left and near
  // the middle, so lighting both from one point lit empty space in one of
  // them. Read off the sources themselves.
  const REALM_DISK_U = 0.56, REALM_DISK_V = 0.20;
  const REALM_VID_DISK_U = 0.22, REALM_VID_DISK_V = 0.43;
  // Which source drawFrozenRealm actually used this frame.
  let _realmIsVideo = false;

  function drawRealmLight(L, reach, now) {
    const tier = freezeTier();
    if (tier >= 3 || reach <= 0.02) return;

    const W = canvas.width, H = canvas.height;
    // Positioned off whatever drawFrozenRealm just laid down, footage or
    // still, so the bloom stays on the disk either way. A zero width means it
    // drew nothing this frame and there is nothing to light.
    const f = _realmFit;
    if (!f.w) return;
    const dx = f.x + f.w * (_realmIsVideo ? REALM_VID_DISK_U : REALM_DISK_U);
    const dy = f.y + f.h * (_realmIsVideo ? REALM_VID_DISK_V : REALM_DISK_V);
    const glow = energyGlow();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // The disk breathing. Two offset periods so it never settles into an
    // obvious pulse.
    const breath = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(now * 0.00035))
                        * (0.75 + 0.25 * Math.sin(now * 0.00097 + 1.3));
    const bloom = Math.min(W, H) * (0.34 + 0.06 * breath);
    ctx.globalAlpha = 0.16 * reach * breath;
    ctx.drawImage(glow, dx - bloom, dy - bloom, bloom * 2, bloom * 2);

    // Dust suspended in the void, thickest toward the disk and thinning out
    // across the empty side of the frame. Time is stopped, so it barely moves:
    // this is a slow shimmer, not a particle system.
    const motes = tier === 0 ? 54 : (tier === 1 ? 32 : 16);
    for (let i = 0; i < motes; i++) {
      // Golden-angle scatter over the whole canvas, deterministic per index.
      const a = i * 2.39996;
      const rad = Math.sqrt((i + 0.5) / motes);
      const mx = dx + Math.cos(a) * rad * W * 0.72;
      const my = dy + Math.sin(a) * rad * H * 0.95;
      if (mx < -8 || mx > W + 8 || my < -8 || my > H + 8) continue;
      // Each mote fades in and out on its own slow cycle.
      const twinkle = 0.5 + 0.5 * Math.sin(now * 0.0006 + i * 1.7);
      const sz = 1 + (i % 3) * 0.7;
      ctx.globalAlpha = 0.5 * reach * twinkle * (1 - rad * 0.55);
      ctx.fillStyle = i % 5 === 0 ? 'rgba(255,170,190,1)' : 'rgba(198,180,255,1)';
      ctx.fillRect(mx - sz / 2, my + Math.sin(now * 0.0002 + i) * 3 - sz / 2, sz, sz);
    }

    // A few long shafts thrown off the disk, top tier only: these are the one
    // part here that costs real stroke work.
    if (tier === 0) {
      const shafts = 5;
      for (let i = 0; i < shafts; i++) {
        const a = -0.35 + i * 0.22 + Math.sin(now * 0.00013 + i) * 0.05;
        const len = Math.max(W, H) * (0.5 + 0.12 * Math.sin(now * 0.0004 + i * 2.1));
        const g = ctx.createLinearGradient(dx, dy, dx + Math.cos(a) * len, dy + Math.sin(a) * len);
        g.addColorStop(0, 'rgba(214,190,255,0.16)');
        g.addColorStop(1, 'rgba(214,190,255,0)');
        ctx.globalAlpha = reach * (0.5 + 0.5 * Math.sin(now * 0.0003 + i));
        ctx.strokeStyle = g;
        ctx.lineWidth = 16 + i * 5;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx + Math.cos(a) * len, dy + Math.sin(a) * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // A vignette over the flat wash, so the frozen battlefield falls away at the
  // edges and the eye lands on her rather than on the HUD.
  // Bullets, particles and the ship's exhaust trail are rendered by Pixi into
  // its own canvas, which sits ABOVE the 2D game canvas this overlay draws
  // into (background.js gives gameCanvas z-index 1 and pixi-renderer.js puts
  // pixiCanvas at 1 after it in the DOM), so the freeze wash cannot reach
  // them and they have to be taken out on Pixi's own side.
  //
  // Faded out far ahead of the front rather than with it, and hidden
  // completely once it is close to gone. These layers draw additively, so
  // they stay legible at alphas where the rest of the scene has already gone
  // dark, and tying them to the front one for one left the exhaust burning
  // through a stopped world. At this rate they are gone by the time the
  // front is a third of the way across, which is early enough to read as
  // part of the freeze and slow enough not to blink out.
  const PIXI_FADE_RATE = 3.2;
  function drivePixi(reach) {
    const app = window._pixiApp;
    if (!app || !app.stage) return;
    const want = clamp01(1 - reach * PIXI_FADE_RATE);
    const vis = want > 0.002;
    let changed = false;
    if (app.stage.visible !== vis) { app.stage.visible = vis; changed = true; }
    if (vis && Math.abs(app.stage.alpha - want) > 0.004) { app.stage.alpha = want; changed = true; }
    // The Pixi canvas sits above the game canvas, and while the frozen
    // snapshot covers the screen draw() returns before it renders Pixi at
    // all. Setting the stage's alpha alone then changed nothing on screen:
    // the canvas kept the last frame it drew, and the player's bullets
    // stayed at full strength on top of the freeze. Rendering here whenever
    // the fade moves is what actually takes them off.
    if (changed && app.renderer) app.renderer.render(app.stage);
  }

  function restorePixi() {
    const app = window._pixiApp;
    if (app && app.stage) { app.stage.visible = true; app.stage.alpha = 1; }
  }

  let _vignetteGrad = null, _vignetteW = 0, _vignetteH = 0;
  function drawVignette(alpha) {
    if (alpha <= 0.01) return;
    if (!_vignetteGrad || _vignetteW !== canvas.width || _vignetteH !== canvas.height) {
      _vignetteGrad = ctx.createRadialGradient(
        canvas.width * 0.45, canvas.height * 0.5, canvas.height * 0.18,
        canvas.width * 0.45, canvas.height * 0.5, Math.max(canvas.width, canvas.height) * 0.72);
      _vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      _vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      _vignetteW = canvas.width; _vignetteH = canvas.height;
    }
    const g = _vignetteGrad;
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

  // Slow secondary motion, layered under whatever a beat asks for. The three
  // periods are deliberately unrelated (roughly 10.1s, 7.4s and 3.0s) so they
  // never resynchronise into an obvious loop.
  function breath(now) { return Math.sin(now * 0.00062); }
  function drift(now) { return Math.sin(now * 0.00085 + 1.1); }
  function flutter(now) { return Math.sin(now * 0.0021 + 0.4); }

  // Hair and sleeves never hang perfectly still: a slow swell with a small
  // faster ripple on it, scaled by how lively the beat is.
  function idleTrail(now, amp) {
    return (drift(now) * 1.7 + flutter(now) * 0.55) * amp;
  }

  // How far shut her eyes are, 0..1. A blink closes over about 60ms,
  // stays shut for 30 and takes about 95 to open again, the reopening
  // slower than the close, which is what makes it read as a blink rather
  // than a flicker. The next one is scheduled at random, once per blink.
  let blinkStart = -1;
  let nextBlinkAt = 0;
  function blinkNow(now) {
    if (!nextBlinkAt) nextBlinkAt = now + 1200;
    if (now >= nextBlinkAt) {
      blinkStart = nextBlinkAt;
      nextBlinkAt = blinkStart + 185 + 1800 + Math.random() * 1800;
    }
    const e = now - blinkStart;
    const ease = v => v * v * (3 - 2 * v);
    if (blinkStart < 0 || e < 0 || e > 185) return 0;
    if (e < 60) return ease(e / 60);
    if (e < 90) return 1;
    return 1 - ease((e - 90) / 95);
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
          lean: -3 * glide + breath(now) * 0.8,
          trail: 7 * glide + idleTrail(now, 0.6),
          whip: flutter(now) * 0.8 * glide,
          blinkAmount: blinkNow(now),
          // Looking out at the viewer, with only the slowest drift.
          gazeX: drift(now) * 0.15, gazeY: 0,
          expression: 'neutral',
        },
      };
    }

    if (beatId === 'think') {
      return {
        back: false, x: L.standX, y: L.centerY,
        // A breath in the scale as well as the bob, so the whole figure
        // swells slightly instead of only sliding up and down.
        scale: 1 + breath(now) * 0.006,
        alpha: 1, flash: 0,
        opts: {
          swayAmp: 1.7, bobAmp: 1.2,
          lean: breath(now) * 1.5,
          trail: idleTrail(now, 1),
          blinkAmount: blinkNow(now),
          // Her head tips a touch toward the thought bubble and back.
          headTurn: 0.01 * Math.sin(Math.PI * p),
          expression: 'serene',
        },
      };
    }

    if (beatId === 'summon' || beatId === 'cast') {
      // Both beats reuse the prototype's cast pose: the arm sweeps up, holds,
      // and comes back down.
      let castExt;
      if (p < 0.36) castExt = easeOutCubic(p / 0.36);
      else if (p < 0.72) castExt = 1;
      else castExt = 1 - easeInOut((p - 0.72) / 0.28);
      // Power gathering: a fine tremor on top of the pose that grows with the
      // raise, plus hair pulled up by it.
      const charge = Math.sin(p * Math.PI);
      return {
        back: false, charge,
        x: L.standX + Math.sin(now * 0.037) * charge * 0.6,
        y: L.centerY - L.box * 0.012 * castExt,
        scale: 1 + charge * 0.012,
        alpha: 1, flash: 0,
        opts: {
          swayAmp: 0.7, bobAmp: 0.35, castExt,
          blinkAmount: blinkNow(now),
          // Eyes follow the raised hand and the spell in it; the head draws
          // back a hair while the arm comes up, and settles again.
          gazeX: 0.85 * castExt, gazeY: -0.75 * castExt,
          headTurn: -0.008 * Math.sin(Math.PI * Math.min(1, p / 0.36)),
          lean: breath(now) * 0.7,
          trail: idleTrail(now, 0.7) - 3.4 * castExt,
          whip: Math.sin(now * 0.021) * charge * 1.2,
          expression: 'smug',
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
        swayAmp: 1.1, bobAmp: 0.45,
        trail: trail + idleTrail(now, 0.5),
        whip: flutter(now) * 0.6,
        walkStep: (p >= 0.30 && p < 0.90) ? Math.sin(now * 0.012) : 0,
        // A glance toward the gate before she turns to it.
        blinkAmount: blinkNow(now),
        gazeX: 0.9 * easeInOut(clamp01(p / 0.15)), gazeY: 0,
        headTurn: 0.006 * easeInOut(clamp01(p / 0.15)),
        expression: 'smug',
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
    g._summonAuraQ = q;
    return g;
  }

  // Every sound in the sequence, keyed to the absolute moment it belongs on.
  // Read off elapsed time with a cursor rather than off a frame landing on the
  // beat, so a long frame still plays what it passed over. A cue more than
  // LATE_MS behind is consumed without playing: by then its beat is visibly
  // gone from the screen and firing it would only land on top of the next one.
  const CUES = [
    { at: 0,               key: 'kanade-time-freeze' },
    { at: BEAT_AT.gate,    key: 'kanade-gate-open' },
    { at: BEAT_AT.walkOut, key: 'kanade-emerge' },
    { at: BEAT_AT.think,   key: 'kanade-think' },
    { at: BEAT_AT.summon,  key: 'kanade-summon' },
    { at: SUMMON_AT,       key: 'goliath-descend' },
    { at: BEAT_AT.cast,    key: 'stack-overflow-cast' },
    { at: APPLY_AT,        key: 'timeline-distortion-banner' },
    { at: BEAT_AT.leave,   key: 'kanade-depart' },
    { at: BEAT_AT.close,   key: 'kanade-time-resume' },
  ];
  const CUE_LATE_MS = 600;

  function runCues(cs, elapsed) {
    const A = window.AudioMgr;
    if (!A || !A.playCutsceneSfx) return;
    // The looping bed, both of its layers, comes up with the freeze and holds
    // under the whole sequence. It goes through its own entry point too: the
    // freeze gate that silences the rest of the mix would otherwise silence
    // this as well.
    if (!cs.bedStarted) {
      cs.bedStarted = true;
      if (A.startCutsceneAmbience) A.startCutsceneAmbience();
    }
    while (cs.cueIdx < CUES.length && elapsed >= CUES[cs.cueIdx].at) {
      const cue = CUES[cs.cueIdx++];
      if (elapsed - cue.at <= CUE_LATE_MS) A.playCutsceneSfx(cue.key);
    }
  }

  // Mixes the two bed layers each frame. The ambience holds level for the
  // whole sequence, while the collapse layer sits back until the Distortion
  // lands and then comes up full, because that is the moment the world's own
  // limits come off. Both ride out together over the closing beat instead of
  // being cut off with it, so the room does not go abruptly dead a moment
  // before time restarts.
  const COLLAPSE_SWELL_MS = 900;
  function driveCutsceneBed(cs, elapsed, beatId, p) {
    const A = window.AudioMgr;
    if (!A || !A.setCutsceneBedGains) return;
    const out = beatId === 'close' ? 1 - easeInOut(p) : 1;
    const swell = clamp01((elapsed - APPLY_AT) / COLLAPSE_SWELL_MS);
    A.setCutsceneBedGains(out, out * (0.5 + 0.5 * swell));
  }

  // Both real game-logic beats, fired off elapsed time rather than off a
  // particular frame landing on them, so a dropped frame can never skip one.
  function runSideEffects(cs, elapsed, L, hand) {
    // Both bursts come off her palm. They used to be spawned at her body
    // centre, which read as the particles erupting out of her stomach.
    const fxX = hand ? hand.x : L.standX;
    const fxY = hand ? hand.y : L.centerY - L.box * 0.18;
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
      // A short violet flare at her palm, as the summon leaves her hand. The
      // arrival itself is shown on Goliath, in drawSummonAura below.
      spawnBurst(18, fxX, fxY, '#d8b6ff', 2, 5, 22, 3);
    }
    if (!cs.applied && elapsed >= APPLY_AT) {
      cs.applied = true;
      if (typeof _applyTimelineDistortion === 'function') _applyTimelineDistortion(cs.effect);
      spawnBurst(40, fxX, fxY, '#d8b6ff', 2, 7, 34, 4);
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
    window._kanadeSnapAlpha = 1;
    stopRealmVideo();
    if (window.AudioMgr && window.AudioMgr.stopCutsceneAmbience) window.AudioMgr.stopCutsceneAmbience();
    fxParticles.length = 0;
    sakuraPetals.length = 0;
    // Time starts again, so the mix comes back with it - the gate always lifts,
    // or sound would stay dead for the rest of the run, but the restart behind
    // it is left to the player's own unpause when they have the game paused on
    // top of this. The background follows the same rule.
    if (window.AudioMgr && window.AudioMgr.setTimeFrozen) window.AudioMgr.setTimeFrozen(false, !gamePaused);
    window._bgPaused = gamePaused === true;
    restorePixi();
    if (!cs.spawned && typeof _spawnWaveGoliath === 'function') _spawnWaveGoliath();
    if (!cs.applied && typeof _applyTimelineDistortion === 'function') _applyTimelineDistortion(cs.effect);
    if (typeof _markKanadeIntroSeen === 'function') _markKanadeIntroSeen();
  }

  function drawKanadeCutscene() {
    const cs = window._kanadeCutscene;
    if (!cs) return;
    const now = (typeof _frozenNow === 'number' && _frozenNow > 0) ? _frozenNow : performance.now();
    if (!cs.startedAt) cs.startedAt = now;
    // _frozenNow stops advancing while the game is paused (js/main.js) and
    // then snaps forward to the current time on resume, so the clock jumps by
    // however long the pause lasted. Left alone the sequence sees that as
    // elapsed time and runs to its end the instant the game unpauses.
    // Anything larger than a very long frame is that jump, not real time, so
    // it is carried into startedAt and the sequence resumes where it stopped.
    if (cs.lastNow !== undefined) {
      const dt = now - cs.lastNow;
      if (dt > 250) cs.startedAt += dt - 16;
    }
    cs.lastNow = now;
    const elapsed = now - cs.startedAt;
    const L = layout();

    const beat = currentBeat(elapsed);
    if (!beat) { finishCutscene(cs); return; }
    // Pose first: the summon and cast bursts fire from her hand, so they need
    // to know where it is. finishCutscene above still carries the safety net
    // that fires either effect if its frame never came.
    const t = (now / 900) % 1;
    const pose = poseFor(L, beat.id, beat.p, now);
    runSideEffects(cs, elapsed, L, handPos(L, pose, t));
    runCues(cs, elapsed);
    driveCutsceneBed(cs, elapsed, beat.id, beat.p);

    const wash = overlayAlpha();
    const reach = freezeFront(beat.id, beat.p);
    // Everything the freeze puts on screen is bounded by the front, so it all
    // withdraws on its own. The one thing that was not was the stopped
    // battlefield itself: a still frame held at full strength until the last
    // frame of the beat, which then cut to the live scene. It comes off with
    // the front now, and the starfield starts moving again the moment the
    // front does, so the world is back before the cutscene ends rather than
    // arriving all at once when it does. js/render/core.js reads both.
    if (beat.id === 'close') {
      window._kanadeSnapAlpha = reach;
      window._bgPaused = reach >= 0.999;
    } else {
      window._kanadeSnapAlpha = 1;
    }
    drivePixi(reach);
    drawFreezeWash(L, wash, reach);
    drawFrozenRealm(L, reach, now);
    ctx.save();
    clipToFront(L, reach);
    drawRealmLight(L, reach, now);
    ctx.restore();
    // The vignette and the lattice only make sense once the front has covered
    // the screen, so they come up with it rather than ahead of it.
    drawVignette(wash * reach);
    ctx.save();
    clipToFront(L, reach);
    drawFreezeField(L, wash * reach, elapsed, now);
    ctx.restore();
    // Bullets dim with the front too, so nothing outside it goes dark early.

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
      drawSummonAura(descending, descending._summonAuraQ || 0, now);
      if (typeof _drawGoliathBossBar === 'function') _drawGoliathBossBar(descending);
    }

    const ring = ringState(beat.id, beat.p);
    ringRot += 0.004 + ring.energy * 0.01;
    drawSpellRing(L.standX, L.centerY, L.ringR, ring.energy, ring.alpha);
    if (ring.alpha > 0.4 && sakuraPetals.length < 46 && Math.random() < 0.12) spawnSakuraPetal(L);
    updateDrawSakura();

    if (pose) {
      fitSpriteBuffer(L.box);
      if (pose.back) drawKanadeBack(t, pose.opts);
      else drawKanade(t, pose.opts);
      // Tinting writes into the shared sprite buffer, so the cached key has
      // to be dropped: otherwise the next frame reuses a buffer that is
      // already tinted and tints it again.
      if (pose.flash > 0) { tintBuffer('#fff8ff', pose.flash * 0.92); invalidateSprite(); }
      // The halo hovers behind her head, so which side of her it draws on
      // depends on which way she is facing: seen from the front it sits
      // further from the camera and her head occludes it, seen from behind
      // it is the nearer of the two and occludes her hair instead.
      if (!pose.back) drawHaloAt(L, pose.x, pose.y, pose.scale, pose.alpha, now);
      blitSprite(L, pose.x, pose.y, pose.scale, pose.alpha);
      // Drawn over her it would otherwise swallow the back of her head, so
      // the near side of the halo is held back to about half strength.
      if (pose.back) drawHaloAt(L, pose.x, pose.y, pose.scale, pose.alpha * 0.55, now);
      // Over her, since it gathers in front of the palm.
      if (pose.charge) drawCastEnergy(L, pose, t, now, pose.charge);
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
    // Warm the banner's font and its shadowed-text path now. Doing it on the
    // frame the banner first appears costs a few hundred milliseconds, which
    // lands as a visible hitch right on the beat that is supposed to be the
    // loudest moment of the sequence. Here it is six seconds early and free.
    try {
      ctx.save();
      ctx.globalAlpha = 0;
      ctx.shadowColor = 'rgba(190,140,255,0.9)';
      ctx.shadowBlur = 14;
      ctx.font = "900 48px 'Cinzel', serif";
      ctx.fillText(effect.name, -9999, -9999);
      ctx.font = "16px 'Courier New', monospace";
      ctx.fillText(effect.playerHalf, -9999, -9999);
      ctx.restore();
    } catch (_) {}
    // She stops time, so the whole mix stops with it: music, ambience, every
    // sustained loop, and any one-shot that tries to fire while she holds it.
    if (window.AudioMgr && window.AudioMgr.setTimeFrozen) window.AudioMgr.setTimeFrozen(true);
    // Decorative sparks only, and the sim that feeds them is about to stop.
    // Dropping them here means they are gone from the battlefield snapshot as
    // well, which matters on the canvas fallback path where they are drawn
    // into the 2D canvas instead of into Pixi.
    if (typeof particles !== 'undefined' && particles) particles.length = 0;
    // The drifting starfield behind the arena is part of the world too - left
    // running it was the one thing still moving while everything else held.
    window._bgPaused = true;
    startRealmVideo();
    window._kanadeCutscene = {
      effect, wave: waveNum,
      startedAt: 0, lastNow: undefined, spawned: false, applied: false,
      cueIdx: 0, bedStarted: false,
      goliath: null,
    };
  }

  // Model viewer for the debug console. Draws the body sprite on its own,
  // blown up, over a dark plate, with the grid and the landmark lines the
  // drawing code is written against. Working on her through the cutscene
  // means waiting 12 seconds and catching the pose as it goes past; this
  // holds her still at any pose and shows where y=38 actually falls.
  const DEBUG_LANDMARKS = [
    [11, 'head'], [38, 'eyes'], [47, 'chin'], [62, 'shoulders'],
    [75, 'cast hand'], [95, 'waist'], [150, 'hem'], [175, 'soles'],
  ];

  function drawKanadeDebugModel() {
    const m = window._kanadeDebugModel;
    if (!m) return;
    const W = canvas.width, H = canvas.height;
    const now = performance.now();
    const t = (now / 900) % 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#140f24';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // The sprite is square and GRID_W across, so one grid unit is this many
    // screen pixels once it is blown up to fill the plate.
    const box = Math.min(W, H) * 0.92;
    const u = box / GRID_W;
    const ox = (W - box) / 2, oy = (H - box) / 2;

    if (m.grid) {
      ctx.strokeStyle = 'rgba(120,110,170,0.20)';
      ctx.lineWidth = 1;
      for (let g = 0; g <= GRID_W; g += 20) {
        ctx.beginPath();
        ctx.moveTo(ox + g * u, oy); ctx.lineTo(ox + g * u, oy + box);
        ctx.moveTo(ox, oy + g * u); ctx.lineTo(ox + box, oy + g * u);
        ctx.stroke();
      }
      // Centreline she is drawn against.
      ctx.strokeStyle = 'rgba(255,120,180,0.35)';
      ctx.beginPath();
      ctx.moveTo(ox + 90 * u, oy); ctx.lineTo(ox + 90 * u, oy + box);
      ctx.stroke();
    }

    const opts = {
      expression: m.expression || 'neutral',
      blinkAmount: m.blink ? blinkNow(now) : 0,
      swayAmp: m.still ? 0 : 1.5,
      bobAmp: m.still ? 0 : 1,
      castExt: m.castExt || 0,
      trail: m.trail || 0,
    };
    fitSpriteBuffer(box);
    if (m.back) drawKanadeBack(t, opts); else drawKanade(t, opts);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(px, ox, oy, box, box);
    ctx.imageSmoothingEnabled = true;

    if (m.grid) {
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      for (const [gy, label] of DEBUG_LANDMARKS) {
        const y = oy + gy * u;
        ctx.strokeStyle = 'rgba(120,220,255,0.45)';
        ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + box, y); ctx.stroke();
        ctx.fillStyle = 'rgba(150,230,255,0.9)';
        ctx.fillText(label + '  y=' + gy, ox + 4, y - 3);
      }
    }

    ctx.fillStyle = 'rgba(200,190,240,0.85)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((m.back ? 'BACK' : 'FRONT') + '  ' + (m.expression || 'neutral') +
      (m.still ? '  still' : '  idle') + (m.castExt ? '  cast ' + m.castExt.toFixed(1) : ''),
      W / 2, oy + box + 18);
    ctx.restore();
  }

  window._kanadeDebugModelDraw = drawKanadeDebugModel;
  window.drawKanadeCutscene = drawKanadeCutscene;
  window._beginKanadeCutscene = beginKanadeCutscene;
  window._KANADE_CUTSCENE_MS = TOTAL_MS;
})();
