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

  const _tdImageCache = {};
  function tdImage(path) {
    if (!_tdImageCache[path]) {
      const img = new Image();
      img.decoding = 'async';
      img.src = path;
      _tdImageCache[path] = img;
    }
    return _tdImageCache[path];
  }
  const _tdFallbackArt = TIMELINE_DISTORTION_ART.stack_overflow;
  const _tdBannerImg = tdImage(_tdFallbackArt.banner);
  const _tdPlayerIconImg = tdImage(_tdFallbackArt.playerIcon);
  const _tdEnemyIconImg = tdImage(_tdFallbackArt.enemyIcon);
  const _tdArtCache = {};
  // Returns the effect's own art once all three images have loaded. Until
  // then the Stack Overflow images stand in, but the accent stays the effect's.
  window._getTimelineDistortionArt = function (effect) {
    let entry = _tdArtCache[effect.id];
    if (!entry) {
      const art = TIMELINE_DISTORTION_ART[effect.id] || _tdFallbackArt;
      entry = _tdArtCache[effect.id] = {
        ready: {
          art, banner: tdImage(art.banner), playerIcon: tdImage(art.playerIcon), enemyIcon: tdImage(art.enemyIcon),
        },
        stand: { art, banner: _tdBannerImg, playerIcon: _tdPlayerIconImg, enemyIcon: _tdEnemyIconImg },
      };
    }
    const r = entry.ready;
    const loaded = img => img.complete && img.naturalWidth;
    return loaded(r.banner) && loaded(r.playerIcon) && loaded(r.enemyIcon) ? r : entry.stand;
  };
  _tdArtCache.stack_overflow = {
    ready: { art: _tdFallbackArt, banner: _tdBannerImg, playerIcon: _tdPlayerIconImg, enemyIcon: _tdEnemyIconImg },
  };
  _tdArtCache.stack_overflow.stand = _tdArtCache.stack_overflow.ready;
  const _kanadeHaloImg = new Image();
  _kanadeHaloImg.src = 'assets/images/game/effects/kanade-halo.png';
  // The derelict citadel hanging in the void behind the stopped arena. The
  // footage is the real backdrop; the still is what gets drawn when it cannot
  // be (decode not finished, format refused, or a graphics tier where paying
  // to decode video every frame is not worth it).
  const _frozenRealmImg = new Image();
  _frozenRealmImg.src = 'assets/images/game/effects/frozen-realm.jpg';
  // The digital world on the far side of her gate: black cubes edged in red
  // down a wire tunnel. Replacing this file changes it; nothing else needs
  // to know.
  const _gateWorldImg = new Image();
  _gateWorldImg.src = 'assets/images/game/effects/kanade-gate-world.png';
  // Muted and inline so it is allowed to autoplay without a gesture. It is
  // only ever running while the cutscene is on screen: a decoding video is
  // real work and there is no reason to pay for it the rest of the run.
  // iOS Safari and Android data saver ignore preload, so nothing loads and
  // canplay never fires until play() is called. play() is therefore never
  // gated on canplay; the still covers the gap until a frame is decoded.
  let _realmVidFailed = false;
  const _frozenRealmVid = document.createElement('video');
  _frozenRealmVid.muted = true;
  _frozenRealmVid.defaultMuted = true;
  _frozenRealmVid.loop = true;
  _frozenRealmVid.playsInline = true;
  _frozenRealmVid.setAttribute('playsinline', '');
  _frozenRealmVid.setAttribute('muted', '');
  _frozenRealmVid.preload = 'auto';
  _frozenRealmVid.addEventListener('error', () => { _realmVidFailed = true; });
  _frozenRealmVid.src = 'assets/video/frozen-realm.mp4';
  // WebKit pauses muted video that is not in the page or not visible, so it
  // sits in the DOM as a near transparent 1px dot rather than detached.
  _frozenRealmVid.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
  const _attachRealmVid = () => { if (!_frozenRealmVid.isConnected && document.body) document.body.appendChild(_frozenRealmVid); };
  if (document.body) _attachRealmVid(); else document.addEventListener('DOMContentLoaded', _attachRealmVid);

  // The video runs on every tier but the minimum, which shows the still
  // frame instead; the video is light enough that Low keeps it.
  function realmVideoReady() {
    return !_realmVidFailed && _frozenRealmVid.readyState >= 2
      && _frozenRealmVid.videoWidth > 0 && freezeTier() <= 2;
  }

  function startRealmVideo() {
    if (_realmVidFailed || freezeTier() > 2) return;
    try { _frozenRealmVid.currentTime = 0; _frozenRealmVid.play().catch(() => {}); } catch (_) {}
  }

  function stopRealmVideo() {
    try { _frozenRealmVid.pause(); _frozenRealmVid.currentTime = 0; } catch (_) {}
  }
  [_tdBannerImg, _tdPlayerIconImg, _tdEnemyIconImg, _kanadeHaloImg, _frozenRealmImg, _gateWorldImg].forEach(img => {
    img.decoding = 'async';
    if (img.decode) img.decode().catch(() => {});
  });
  const PAL = {
    bodyRim: '#d6c3f9',
    bodyCCreamShade: '#dcd5e2', bodyCCreamFold: '#ddd7e2', bodyCCreamLight: '#fff7ed', bodyCWhiteContact: '#bbb3ca', bodyCWhiteDeep: '#aaa3bd', bodyCNavyFold: '#29264f', bodyCNavyLight: '#575181', bodyCNavyContact: '#1d1a39', bodyCNavySatin: '#484373',
    hairLavender: '#b8bfd8', hairBlueShade: '#8f9abb', hairSoftLight: '#d8ddeb',
    hairSilverH: '#d0cee5',
    hairPearlH: '#f2f0fa',
    hairShadeH: '#b7b3d5',
    hairContactH: '#5e5984',
    hairShadow: '#6b6690', hairDeep: '#4a4570', hairMid: '#9f9cc4', hairLight: '#e7e5f5', hairHi: '#fffdf8',
    skin: '#ffe3d4', skinShadow: '#e3ac9d', blush: '#f5b7c2',
    skinSoftLight: '#ffeadd',
    lapis: '#2a5ba8', lapisDeep: '#17336e', lapisHi: '#6f9be0',
    eyeDeep: '#244f9d', eyeBlue: '#4f8fe0', eyeLight: '#8ed6ff', eyeHi: '#ffffff', lid: '#332b55',
    creamShadow: '#b8b2ca', creamMid: '#e9e5ea', cream: '#fffaf0',
    indigoDeep: '#110f24', indigo: '#292552', indigoMid: '#403a78', indigoHi: '#665ba1',
    goldDark: '#9b7131', gold: '#d8b35a', goldHi: '#fff0a3',
    bodyLSkinShade: '#edc4b2',
    bodyLSkinLight: '#fff0e3',
    bodyLHandShade: '#efc6b5',
    bodyLHandLight: '#fff0e4',
    bodyLBootPlane: '#46415f',
    bodyLBootFold: '#3a3659',
    bodyLBootEdge: '#625d79',
    bodyLBootSheen: '#8f879f',
    bodyLGoldFacet: '#e9cf8b',
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
  function bodyBaseBezierShape(start, segments, c) {
    pctx.fillStyle = c;
    pctx.beginPath();
    pctx.moveTo(start[0], start[1]);
    segments.forEach(s => pctx.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]));
    pctx.closePath();
    pctx.fill();
  }

  function bodyRimPath(outline, width, alpha) {
    const append = () => {
      pctx.moveTo(outline[0][0], outline[0][1]);
      for (const s of outline[1]) pctx.bezierCurveTo(...s);
      pctx.closePath();
    };
    pctx.save();
    tracePath(outline); pctx.clip();
    pctx.beginPath(); append();
    pctx.save(); pctx.translate(-LIGHT.x * width, -LIGHT.y * width); append(); pctx.restore();
    pctx.clip('evenodd');
    pctx.globalCompositeOperation = 'source-atop';
    pctx.globalAlpha *= alpha;
    pctx.fillStyle = PAL.bodyRim;
    pctx.fillRect(-180, -180, 540, 540);
    pctx.restore();
  }
  function bezierShape(start, segments, color) {
    bodyBaseBezierShape(start, segments, color);
    if (color !== PAL.hairLight && color !== PAL.hairMid) return;
    const ys = [start[1], ...segments.flatMap(s => [s[1], s[3], s[5]])];
    if (Math.max(...ys) >= 62 && Math.max(...ys) - Math.min(...ys) > 18) {
      bodyRimPath([start, segments], 0.88, 0.42);
    }
  }
  function clothPanel(outline, base, shadeW, litW) {
    bodyBaseClothPanel(outline, base, shadeW, litW);
    if (base === PAL.cream || base === PAL.creamMid || base === PAL.creamShadow) {
      bodyRimPath(outline, 0.78, 0.44);
    }
  }
  function hairLock(x0, y0, w, x1, y1, bend, color) {
    bodyBaseHairLock(x0, y0, w, x1, y1, bend, color);
    if (x0 >= 105 && w >= 9 && color === PAL.hairDeep) {
      const h = y1 - y0;
      bodyRimPath([[x0 - w / 2, y0], [
        [x0 - w / 2 + bend, y0 + h * 0.45, x1 - w * 0.3 + bend * 0.5, y1 - h * 0.22, x1, y1],
        [x1 + w * 0.3 + bend * 0.5, y1 - h * 0.25, x0 + w / 2 + bend, y0 + h * 0.4, x0 + w / 2, y0]
      ]], 0.65, 0.28);
    }
  }

  function hairMassH(outline, c, planes) {
    bodyBaseHairMassH(outline, c, planes);
  }

  function sparkle(x, y, size, c) {
    poly([[x, y - size], [x + 1, y - 1], [x + size, y], [x + 1, y + 1], [x, y + size], [x - 1, y + 1], [x - size, y], [x - 1, y - 1]], c);
  }
  // One lock of hair as a tapered ribbon: w wide where it leaves the head at
  // (x0, y0), narrowing to a point at (x1, y1). bend bows it sideways.
  function bodyBaseHairLock(x0, y0, w, x1, y1, bend, c) {
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
  // All surface planes share the exact silhouette of the receiving lock.
  function bodyBaseHairMassH(outline, c, planes) {
    bodyBaseBezierShape(outline[0], outline[1], c);
    pctx.save();
    tracePath(outline);
    pctx.clip();
    for (const plane of planes) bodyBaseBezierShape(plane[0], plane[1], plane[2]);
    pctx.restore();
  }
  // Broad opaque planes follow the lock and taper with its volume.
  function hairLockShaded(x0, y0, w, x1, y1, bend, c) {
    const h = y1 - y0, tone = HAIR_TONES[c];
    const outline = [[x0 - w / 2, y0], [
      [x0 - w / 2 + bend, y0 + h * 0.45, x1 - w * 0.3 + bend * 0.5, y1 - h * 0.22, x1, y1],
      [x1 + w * 0.3 + bend * 0.5, y1 - h * 0.25, x0 + w / 2 + bend, y0 + h * 0.4, x0 + w / 2, y0]
    ]];
    const at = u => {
      const v = 1 - u;
      return [v * v * v * x0 + 3 * v * v * u * (x0 + bend) + 3 * v * u * u * (x1 + bend * 0.5) + u * u * u * x1,
        v * v * v * y0 + 3 * v * v * u * (y0 + h * 0.43) + 3 * v * u * u * (y1 - h * 0.23) + u * u * u * y1];
    };
    const a = at(0.2), b = at(0.41), d = at(0.72), width = w * 0.33;
    hairMassH(outline, c, [
      [[x0 - w * 0.46, y0], [
        [x0 - w * 0.4 + bend, y0 + h * 0.4, x1 - w * 0.16 + bend * 0.5, y1 - h * 0.2, x1, y1],
        [x1 - w * 0.04, y1 - h * 0.25, x0 - w * 0.12 + bend, y0 + h * 0.4, x0 - w * 0.18, y0]
      ], c === PAL.hairLight ? PAL.hairSoftLight : PAL.hairLavender],
      [a, [
        [b[0] - width * 0.8, b[1], d[0] - width * 0.25, d[1] - h * 0.12, d[0], d[1]],
        [d[0] + width * 0.5, d[1] - h * 0.18, b[0] + width, b[1], a[0], a[1]]
      ], c === PAL.hairLight ? PAL.hairPearlH : tone ? tone.lit : PAL.hairSoftLight]
    ]);
  }
  // Five tapered reflections follow the crown with a narrow bright core.
  function hairCrownRing() {
    const arc = x => 18 + (x - 92) * (x - 92) * 0.025;
    for (const [a, b] of [[79.2, 83.2], [84.2, 88.8], [90.1, 94.9], [96.1, 100.7], [101.8, 105.8]]) {
      for (const [inset, width, tone] of [[0, 0.65, PAL.hairSoftLight], [0.6, 0.18, PAL.hairHi]]) {
        const l = a + inset, r = b - inset, d = (r - l) / 3;
        bodyBaseBezierShape([l, arc(l)], [
          [l + d, arc(l + d) - width, r - d, arc(r - d) - width, r, arc(r)],
          [r - d, arc(r - d) + width, l + d, arc(l + d) + width, l, arc(l)]
        ], tone);
      }
    }
  }
  // Sparse curved strands stay subordinate to the broad opaque hair masses.
  function hairSurfaceDetail(back, hm, sway, trail) {
    const stroke = (start, segments, tone) => bezierLine(start, segments, tone, STROKE.hairline);
    pctx.save();
    if (back) pctx.translate(-1, 2);
    for (const [start, seg] of [
      [[89.5, 11.5], [84, 13, 80, 16, 78.5, 21]],
      [[90, 12], [86.7, 15, 85, 18, 84, 23]],
      [[91, 12], [89.7, 16, 89, 21, 88.5, 26]],
      [[94, 11.8], [97, 13.5, 99.6, 16.5, 101, 20]],
      [[95, 12.5], [101, 14.5, 104, 18, 106, 23]],
      [[93.5, 14], [96, 17, 97.4, 21, 98, 25]]
    ]) stroke(start, [seg], PAL.hairLavender);
    pctx.restore();
    if (!back) {
      for (const [start, seg] of [
        [[83.1, 30.4], [83.7, 31.5, 83.9, 32.1, 83.6, 33.1]],
        [[88.3, 29.7], [88.6, 30.4, 89.1, 31.1, 89.4, 31.6]],
        [[95.5, 31.4], [95.1, 32.2, 94.7, 33, 94, 33.8]],
        [[102.1, 30.8], [102, 31.6, 101.7, 32.3, 101.3, 33.1]]
      ]) stroke(start, [seg], PAL.hairMid);
      for (const [start, seg] of [
        [[82.3, 28], [82.7, 29, 83.3, 29.8, 83.6, 30.2]],
        [[87.8, 27.9], [88, 28.7, 88.3, 29.2, 88.6, 29.6]],
        [[96.5, 28.8], [96.3, 29.7, 95.9, 30.3, 95.5, 30.6]],
        [[102.8, 28.2], [102.6, 29, 102.4, 29.5, 102.2, 29.8]]
      ]) stroke(start, [seg], PAL.hairSoftLight);
      const l = hm.long(0.6) * 0.7, r = hm.long(1.0) * 0.7;
      stroke([79.8, 40], [[78.5, 53, 78.6 + l * 0.3, 64, 78.3 + l * 0.5, 86]], PAL.hairLavender);
      stroke([81.2, 50], [[81, 65, 80.5 + l * 0.4, 72, 77.5 + l * 0.7, 96]], PAL.hairLavender);
      stroke([78.3, 31], [[77.4, 39, 77.5, 43, 77.7 + l * 0.2, 55]], PAL.hairSoftLight);
      stroke([104.1, 40], [[105.2, 53, 105 + r * 0.3, 68, 106.4 + r * 0.5, 80]], PAL.hairLavender);
      stroke([102.8, 54], [[103, 68, 104.5 + r * 0.4, 82, 108.3 + r * 0.7, 95]], PAL.hairLavender);
      stroke([106.3, 32], [[107, 41, 107.3, 48, 107 + r * 0.2, 58]], PAL.hairSoftLight);
      stroke([76 + l * 0.7, 89], [[76.1 + l * 0.8, 94, 75.4 + l, 98, 74.6 + l + sway * 0.4, 101]], PAL.hairLavender);
      stroke([108.1 + r * 0.7, 89], [[108.4 + r * 0.8, 94, 109 + r, 98, 109.8 + r + sway * 0.4, 100]], PAL.hairLavender);
      const f = hm.osc(0.5) * 0.18;
      stroke([75.6, 27], [[74.6 + f, 30, 74.4 + f, 35, 74.8, 38]], PAL.hairSoftLight);
      stroke([108.5, 29], [[110 + f, 32, 110.7 + f, 36, 110.3, 39]], PAL.hairSoftLight);
      stroke([65.7 + trail * 0.12, 78], [[64.9 + f + trail * 0.14, 82, 64.5 + f + trail * 0.15, 86, 64.7 + trail * 0.15, 89]], PAL.hairSoftLight);
      stroke([115.8 + trail * 0.12, 80], [[116.9 + f + trail * 0.14, 82, 117.2 + f + trail * 0.15, 85, 116.8 + trail * 0.15, 88]], PAL.hairSoftLight);
      stroke([77.3, 27], [[76.3, 32, 76, 36, 76, 40]], PAL.hairPearlH);
      stroke([76.7, 49], [[76.6, 53, 76.7, 58, 76.9 + l * 0.2, 62]], PAL.hairPearlH);
      stroke([76.6 + l * 0.4, 75], [[76.7 + l * 0.5, 80, 76.1 + l * 0.6, 84, 75.6 + l * 0.7, 88]], PAL.hairPearlH);
    } else {
      const l = trail * 0.65 + hm.osc(0.3) * 0.5, r = trail * 0.65 + hm.osc(1.6) * 0.5, f = hm.osc(0.5) * 0.15;
      stroke([79.5, 29], [[73.5, 48, 74 + l, 67, 72.3 + l, 85]], PAL.hairLavender);
      stroke([83.5, 42], [[81, 62, 82 + l, 86, 78.5 + l, 110]], PAL.hairLavender);
      stroke([90, 57], [[89.5, 80, 87 + l, 102, 85 + l, 120]], PAL.hairSoftLight);
      stroke([100, 32], [[104, 48, 103 + r, 61, 104 + r, 77]], PAL.hairLavender);
      stroke([108.1, 54], [[110, 74, 108.8 + r, 88, 111 + r, 105]], PAL.hairSoftLight);
      stroke([98, 88], [[97.8, 109, 100 + r, 124, 104 + r, 139]], PAL.hairLavender);
      stroke([71 + l, 120], [[70 + l, 130, 67.9 + l, 138, 66.2 + l, 142]], PAL.hairLavender);
      stroke([82 + l, 130], [[81.3 + l, 137, 80.4 + l, 142, 79 + l, 145]], PAL.hairLavender);
      stroke([112 + r, 123], [[112.3 + r, 130, 114.5 + r, 139, 116.7 + r, 143]], PAL.hairSoftLight);
      stroke([68.7, 34], [[67.2 + f, 37, 66.3 + f, 40, 66.8, 43]], PAL.hairSoftLight);
      stroke([111.1, 35], [[113 + f, 37, 114 + f, 40, 113, 43]], PAL.hairSoftLight);
      stroke([64 + l, 132], [[62.8 + l, 138, 63.2 + l, 143, 64 + l, 144]], PAL.hairSoftLight);
      stroke([119 + r, 132], [[120.2 + r, 137, 120.2 + r, 141, 119 + r, 144]], PAL.hairSoftLight);
      stroke([71.5, 29], [[70, 33, 69, 38, 68.4, 41]], PAL.hairPearlH);
      stroke([65.6, 55], [[65, 60, 64.7, 65, 64.4, 70]], PAL.hairPearlH);
      stroke([63.4, 83], [[62.8, 89, 62.5, 95, 62.4, 101]], PAL.hairPearlH);
    }
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
    [PAL.cream]: { shade: PAL.bodyCCreamShade, lit: null },
    [PAL.creamMid]: { shade: PAL.bodyCWhiteContact, lit: PAL.bodyCCreamLight },
    [PAL.creamShadow]: { shade: PAL.bodyCWhiteDeep, lit: PAL.creamMid },
    [PAL.indigoMid]: { shade: PAL.bodyCNavyFold, lit: PAL.bodyCNavyLight },
    [PAL.indigo]: { shade: PAL.bodyCNavyContact, lit: PAL.bodyCNavySatin },
    [PAL.indigoDeep]: { shade: null, lit: PAL.bodyCNavyFold },
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
  function bodyBaseClothPanel(outline, base, shadeW, litW) {
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

  // Cloth folds are opaque broad planes inside the panel's original moving path.
  function bodyCPanel(outline, base, shadeW, litW, folds) {
    clothPanel(outline, base, shadeW, litW);
    pctx.save();
    tracePath(outline);
    pctx.clip();
    for (const [start, segments, tone] of folds) bezierShape(start, segments, tone);
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
  // Edge planes inherit the receiving shape and LIGHT inside its clip.
  function bodyLMaterial(outline, base, shade, lit, sw, lw) {
    pctx.save();
    tracePath(outline); pctx.clip();
    pctx.fillStyle = shade; pctx.fill();
    pctx.save();
    pctx.translate(LIGHT.x * sw, LIGHT.y * sw);
    tracePath(outline); pctx.restore(); pctx.clip();
    pctx.fillStyle = lit; pctx.fill();
    pctx.save();
    pctx.translate(-LIGHT.x * lw, -LIGHT.y * lw);
    tracePath(outline); pctx.restore();
    pctx.fillStyle = base; pctx.fill();
    pctx.restore();
  }
  function bodyLClip(outline, paint) {
    pctx.save(); tracePath(outline); pctx.clip();
    paint(); pctx.restore();
  }
  // Stroke surfaces use a sampled envelope inset from the original skin stroke.
  function bodyLSkinStroke(start, segments, width) {
    const left = [], right = [];
    let origin = start;
    for (const seg of segments) {
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, v = 1 - t;
        const x = v * v * v * origin[0] + 3 * v * v * t * seg[0] + 3 * v * t * t * seg[2] + t * t * t * seg[4];
        const y = v * v * v * origin[1] + 3 * v * v * t * seg[1] + 3 * v * t * t * seg[3] + t * t * t * seg[5];
        const dx = 3 * v * v * (seg[0] - origin[0]) + 6 * v * t * (seg[2] - seg[0]) + 3 * t * t * (seg[4] - seg[2]);
        const dy = 3 * v * v * (seg[1] - origin[1]) + 6 * v * t * (seg[3] - seg[1]) + 3 * t * t * (seg[5] - seg[3]);
        const length = Math.hypot(dx, dy) || 1, r = width * 0.42;
        left.push([x - dy / length * r, y + dx / length * r]);
        right.push([x + dy / length * r, y - dx / length * r]);
      }
      origin = [seg[4], seg[5]];
    }
    pctx.save(); pctx.beginPath();
    pctx.moveTo(...left[0]);
    for (const point of left) pctx.lineTo(...point);
    for (let i = right.length - 1; i >= 0; i--) pctx.lineTo(...right[i]);
    pctx.closePath();
    for (const point of [start, origin]) {
      pctx.moveTo(point[0] + width * 0.42, point[1]);
      pctx.arc(point[0], point[1], width * 0.42, 0, Math.PI * 2, true);
    }
    pctx.clip();
    pctx.save(); pctx.translate(-LIGHT.x * width * 0.20, -LIGHT.y * width * 0.20);
    bezierLine(start, segments, PAL.bodyLSkinShade, width * 0.48);
    pctx.restore();
    pctx.save(); pctx.translate(LIGHT.x * width * 0.13, LIGHT.y * width * 0.13);
    bezierLine(start, segments, PAL.bodyLSkinLight, width * 0.25);
    pctx.restore(); pctx.restore();
  }

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
    bodyLClip([start, segs], () => {
      bezierShape(P(-2.35, 0.25), [
        seg([-2.65, 2.4], [-2.20, 4.6], [-1.70, fing[0].tip]),
        seg([-1.20, fing[0].tip - 0.55], [-1.32, 3.0], [-1.02, 1.65]),
        seg([-1.35, 0.75], [-1.82, 0.22], [-2.35, 0.25]),
      ], PAL.bodyLHandShade);
      bezierShape(P(0.24, 0.20), [
        seg([0.55, 1.4], [1.32, 2.0], [1.58, 3.9]),
        seg([1.15, 4.2], [0.75, 3.7], [0.35, 2.7]),
        seg([-0.02, 1.7], [-0.15, 0.60], [0.24, 0.20]),
      ], PAL.bodyLHandLight);
    });

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
    bodyLClip([tStart, tSegs], () => {
      bezierShape(P(...at(0.05, -0.82)), [
        seg(at(0.7, -0.95), at(len - 0.7, -0.66), at(len, -0.10)),
        seg(at(len - 0.5, -0.18), at(1.30, -0.20), at(0.25, -0.31)),
        seg(at(0.10, -0.50), at(0.06, -0.70), at(0.05, -0.82)),
      ], PAL.bodyLHandShade);
      bezierLine(P(...at(0.65, 0.45)), [seg(at(1.4, 0.49), at(len - 0.7, 0.31), at(len - 0.4, 0.15))], PAL.bodyLHandLight, 0.45);
    });

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
    if (c === PAL.skin) {
      pctx.save(); pctx.beginPath();
      pctx.moveTo(L[0][0], L[0][1]);
      for (const point of L) pctx.lineTo(point[0], point[1]);
      for (let i = Rt.length - 1; i >= 0; i--) pctx.lineTo(Rt[i][0], Rt[i][1]);
      pctx.closePath();
      for (const [x, y, radius] of [[start[0], start[1], w0 / 2], [s[4], s[5], w1 / 2]]) {
        pctx.moveTo(x + radius, y); pctx.arc(x, y, radius, 0, Math.PI * 2, true);
      }
      pctx.clip();
      const toBand = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      const litRight = (Rt[6][0] - L[6][0]) * LIGHT.x + (Rt[6][1] - L[6][1]) * LIGHT.y > 0;
      for (const [edge, inner, tone] of [[0, 0.30, PAL.bodyLSkinShade], [0.73, 0.91, PAL.bodyLSkinLight]]) {
        const lo = litRight ? edge : 1 - inner, hi = litRight ? inner : 1 - edge;
        pctx.beginPath(); pctx.moveTo(...toBand(L[0], Rt[0], lo));
        for (let i = 0; i <= N; i++) pctx.lineTo(...toBand(L[i], Rt[i], lo));
        for (let i = N; i >= 0; i--) pctx.lineTo(...toBand(L[i], Rt[i], hi));
        pctx.closePath(); pctx.fillStyle = tone; pctx.fill();
      }
      pctx.restore();
    }

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
  // Her hair's own motion, apart from the body's sway, so it still moves
  // while she holds a pose. hairT is its clock (see poseFor), a cycle twice
  // the body's so its cache steps land on the same frames as t's and add no
  // redraws; without it the hair rides the body cycle. hairEnergy (0..1)
  // swings it wider and lifts the ends while she gathers power, hairWind
  // pushes the ends sideways and hairImpact throws them back from the spell.
  // Amounts are in grid units at the tip of the long hair: osc is the swing
  // alone, push the steady offset, long both together.
  function computeHairMotion(t, opts) {
    const ht = opts.hairT != null ? opts.hairT : t * 0.5;
    const energy = clamp01(opts.hairEnergy || 0);
    const boost = opts.hairBoost || 1;
    const TAU = Math.PI * 2;
    const amp = (0.55 + 2.6 * energy) * boost;
    const push = (opts.hairWind || 0) - (opts.hairImpact || 0);
    // With power in her the swing gets a fast ripple on top, as if the hair
    // were caught in a draught coming up off her.
    const osc = lag => Math.sin(TAU * ht - lag) * amp + Math.sin(2 * TAU * ht - lag * 1.7) * 0.7 * energy * energy;
    return {
      osc, push,
      long: lag => osc(lag) + push,
      // The fine loose strands run at twice the rate.
      strand: lag => Math.sin(2 * TAU * ht - lag) * (0.35 + 1.1 * energy) + push * 0.7,
      // The ahoge on its own lagged beat.
      ahoge: Math.sin(TAU * ht - 1.1) * (0.3 + 0.35 * energy) - (opts.hairImpact || 0) * 0.5,
      // How far the ends of the long hair rise, in units of droop.
      lift: 0.6 * energy + (boost - 1) / 0.35 * 0.38,
    };
  }

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

  // The whole casting arm for a given castExt, in grid units inside the
  // shoulder drop: joints, curve controls and the frame the hand is drawn
  // in. drawKanade draws from it and handPos anchors the spell to it, so
  // the glow and the hand can never be worked out two different ways.
  function castArm(castExt, fabricTrail) {
    const mix = (a, b, k) => a + (b - a) * k;
    // Every joint and control point runs from its resting place to its
    // casting place. The elbow rises on the square of castExt, so the hand
    // leads and the forearm straightens before the elbow lifts; raised in
    // step with the hand it was high by the halfway point with the forearm
    // bent down from it, which read as a broken arm.
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
    // The hand points the way the end of the forearm points, so wrist, palm
    // and fingers always agree with the arm; the only addition is the wrist
    // bending back into the casting gesture as the arm rises.
    const foreDX = (wrist[0] - 1) - foreC[2], foreDY = (wrist[1] + 1.2) - foreC[3];
    const castEase = castExt * castExt * (3 - 2 * castExt);
    const hand = {
      x: wrist[0] + 0.5 * castExt, y: wrist[1] + 0.8 * castExt,
      rot: Math.atan2(-foreDX, foreDY) - 0.85 * castEase,
      size: mix(0.75, 1.05, castExt),
    };
    return { wrist, elbowX, elbowY, upperC, foreC, hand };
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
      Math.round((o.headTurn || 0) * 1000) + ',' + Math.round((o.magicLight || 0) * 10) + ':' +
      // Hair clock in 48 steps: at twice the body's period that is the same
      // 37.5ms as t's 24, so it never adds a redraw on its own.
      Math.round((o.hairT || 0) * 48) + ',' + q(o.hairWind) + ',' +
      Math.round((o.hairEnergy || 0) * 10) + ',' + Math.round((o.hairImpact || 0) * 10) + ',' + Math.round((o.hairBoost || 1) * 20);
  }

  // The face's features: eyes, brows, nose, mouth and blush, drawn inside
  // the head group over the skin oval and under the side hair and fringe.
  // face = { expression, eye, brow, mouth, openEye, blink, gazeX, gazeY }.
  function drawFaceFeatures(face) {
    drawSimpleEye(88, 38, face.eye, face.blink, face.gazeX, face.gazeY);
    drawSimpleEye(96, 38, face.eye, face.blink, face.gazeX, face.gazeY);
    // Brows after the eyes, so a closing lid can never paint over them.
    drawBrow(face.brow, false);
    drawBrow(face.brow, true);
    // The nose: a short angled shadow under its tip rather than a dash down
    // the middle of the face.
    bezierLine([92.6, 41.9], [[92.5, 42.1, 92.35, 42.3, 92.1, 42.4]], PAL.skinShadow, STROKE.hairline);
    // The mouth sits 0.7 higher than it was drawn, with room below it for
    // the chin.
    pctx.save();
    pctx.translate(0, -0.7);
    drawMouth(face.mouth);
    // Light on the lower lip, under the closed-mouth shapes only.
    if (face.mouth !== 'open' && face.mouth !== 'tense') line([[91.5, 46.2], [92.5, 46.2]], PAL.blush, STROKE.fine);
    pctx.restore();
    // Blush as a wide, thin wash with two faint strokes on it; a solid oval
    // read as a stamp, and darker strokes as scratches.
    for (const bx of [83.6, 100.4]) {
      ellipseF(bx, 41.2, 2.3, 0.75, PAL.blush);
      for (const d of [-0.6, 0.6]) line([[bx + d - 0.3, 41.6], [bx + d + 0.3, 40.8]], PAL.blush, STROKE.hairline);
    }
  }

  // The face can come from a separate file: js/render/kanade-face.js sets
  // window.KanadeFace = { drawFeatures(api, face) } and it is used in place
  // of drawFaceFeatures above. api hands it the sprite context and the same
  // drawing helpers, palette and stroke widths the rest of her uses, plus
  // the built-in features so it can keep any part of them. It draws in grid
  // units inside the head group. The sprite is cached on its options, so
  // the file must draw the same face for the same input and read no clock.
  // If it throws, the built-in face is drawn and the error is logged once.
  const FACE_API = {
    ctx: pctx, PAL, STROKE,
    bezierShape, bezierLine, line, poly, ellipse, ellipseF, smoothOutline, tracePath,
    drawEye: drawSimpleEye, drawBrow, drawMouth, drawDefaultFeatures: drawFaceFeatures,
  };
  let _faceModuleFailed = false;
  function drawFace(face) {
    const mod = window.KanadeFace;
    if (!_faceModuleFailed && mod && typeof mod.drawFeatures === 'function') {
      pctx.save();
      try {
        mod.drawFeatures(FACE_API, face);
        pctx.restore();
        return;
      } catch (err) {
        pctx.restore();
        _faceModuleFailed = true;
        console.error('KanadeFace.drawFeatures failed; using the built-in face.', err);
      }
    }
    drawFaceFeatures(face);
  }

  // These transformed anchors belong to the single cached character sprite.
  const jewelPoints = new Float32Array(32);
  let jewelMask = 0;
  function jewelAnchor(slot, x, y) {
    const m = pctx.getTransform();
    jewelPoints[slot * 2] = (m.a * x + m.c * y + m.e) / RES_MULT;
    jewelPoints[slot * 2 + 1] = (m.b * x + m.d * y + m.f) / RES_MULT;
    jewelMask |= 1 << slot;
  }
  // Rounded opaque lapis carries a small lit dome and fixed gold inclusions.
  function lapisStone(x, y, rx, ry, slot) {
    ellipseF(x, y, rx + 0.22, ry + 0.22, PAL.gold);
    ellipseF(x, y, rx, ry, PAL.lapisDeep);
    ellipseF(x + LIGHT.x * rx * 0.16, y + LIGHT.y * ry * 0.16, rx * 0.84, ry * 0.84, PAL.lapis);
    ellipseF(x + LIGHT.x * rx * 0.38, y + LIGHT.y * ry * 0.38, rx * 0.26, ry * 0.15, PAL.lapisHi);
    ellipseF(x + rx * 0.25, y + ry * 0.25, rx * 0.10, ry * 0.09, PAL.gold);
    ellipseF(x - rx * 0.38, y + ry * 0.18, rx * 0.09, ry * 0.08, PAL.goldHi);
    if (rx > 1) ellipseF(x + rx * 0.44, y - ry * 0.28, rx * 0.07, ry * 0.07, PAL.gold);
    if (slot != null) jewelAnchor(slot, x, y);
  }
  function jewelCrystal(x, y, h) {
    pctx.fillStyle = PAL.eyeBlue; pctx.beginPath();
    pctx.moveTo(x, y - h); pctx.lineTo(x + h * 0.45, y);
    pctx.lineTo(x, y + h); pctx.lineTo(x - h * 0.45, y); pctx.closePath(); pctx.fill();
    pctx.fillStyle = PAL.eyeLight; pctx.beginPath();
    pctx.moveTo(x, y - h); pctx.lineTo(x + h * 0.45, y);
    pctx.lineTo(x, y + h * 0.15); pctx.closePath(); pctx.fill();
  }
  function cloakClasp(x, y, slot) {
    ellipseF(x, y, 1.6, 1.6, PAL.goldDark);
    ellipseF(x, y, 1.27, 1.27, PAL.gold);
    jewelCrystal(x, y, 1.1);
    bezierLine([x - 1.1, y + 1.1], [[x - 0.1, y + 2, x + 1.8, y + 1.2, x + 2.2, y - 0.2]], PAL.gold, STROKE.hairline);
    jewelAnchor(slot, x, y);
  }
  // A frame on the existing arm curve keeps each band clear of the hand.
  function armJewelFrame(start, seg, t, paint) {
    const v = 1 - t;
    const x = v * v * v * start[0] + 3 * v * v * t * seg[0] + 3 * v * t * t * seg[2] + t * t * t * seg[4];
    const y = v * v * v * start[1] + 3 * v * v * t * seg[1] + 3 * v * t * t * seg[3] + t * t * t * seg[5];
    const dx = 3 * v * v * (seg[0] - start[0]) + 6 * v * t * (seg[2] - seg[0]) + 3 * t * t * (seg[4] - seg[2]);
    const dy = 3 * v * v * (seg[1] - start[1]) + 6 * v * t * (seg[3] - seg[1]) + 3 * t * t * (seg[5] - seg[3]);
    pctx.save(); pctx.translate(x, y); pctx.rotate(Math.atan2(-dx, dy));
    paint(); pctx.restore();
  }
  function armJewelry(start, upper, slot) {
    armJewelFrame(start, upper, 0.12, () => cloakClasp(0, 0, slot - 2));
    armJewelFrame(start, upper, 0.55, () => {
      bezierLine([-3.2, 0], [[-1.8, 1.1, 1.7, 1.1, 3.2, 0]], PAL.gold, STROKE.fine);
      jewelCrystal(0, 0.7, 0.85);
      jewelAnchor(slot, 0, 0.7);
    });

  }
  function hemPendant(x, y, swing, slot) {
    bezierLine([x, y], [[x, y + 1.2, x + swing, y + 2, x + swing, y + 2.9]], PAL.goldDark, STROKE.hairline);
    sparkle(x + swing, y + 3.2, 1.25, PAL.gold);
    jewelAnchor(slot, x + swing, y + 3.2);
  }
  // Small stitches follow the curve at even arc length intervals.
  function clothTrim(start, segments, inset, beads) {
    const points = [], marks = [];
    let a = start, distance = 0, next = 1.5;
    for (const seg of segments) {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20, v = 1 - t;
        const x = v * v * v * a[0] + 3 * v * v * t * seg[0] + 3 * v * t * t * seg[2] + t * t * t * seg[4];
        const y = v * v * v * a[1] + 3 * v * v * t * seg[1] + 3 * v * t * t * seg[3] + t * t * t * seg[5];
        const dx = 3 * v * v * (seg[0] - a[0]) + 6 * v * t * (seg[2] - seg[0]) + 3 * t * t * (seg[4] - seg[2]);
        const dy = 3 * v * v * (seg[1] - a[1]) + 6 * v * t * (seg[3] - seg[1]) + 3 * t * t * (seg[5] - seg[3]);
        const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        const p = [x + nx * inset, y + ny * inset, nx, ny];
        const last = points[points.length - 1];
        if (last) distance += Math.hypot(p[0] - last[0], p[1] - last[1]);
        points.push(p);
        if (distance >= next) { marks.push(p); next += beads ? 2.5 : 3.1; }
      }
      a = seg.slice(4);
    }
    pctx.lineWidth = STROKE.hairline; pctx.strokeStyle = PAL.goldDark;
    pctx.beginPath();
    points.forEach((p, i) => i ? pctx.lineTo(p[0], p[1]) : pctx.moveTo(p[0], p[1]));
    pctx.stroke(); pctx.beginPath();
    for (let i = 0; i < marks.length; i++) {
      const [x, y, nx, ny] = marks[i], h = i % 3 ? 0.65 : 1;
      if (beads) { pctx.moveTo(x + 0.3, y); pctx.arc(x, y, 0.3, 0, Math.PI * 2); }
      else { pctx.moveTo(x, y); pctx.lineTo(x + nx * h, y + ny * h); }
    }
    if (beads) { pctx.fillStyle = PAL.gold; pctx.fill(); }
    else { pctx.strokeStyle = PAL.gold; pctx.stroke(); }
  }
  function beltDiamonds(start, seg) {
    pctx.fillStyle = PAL.gold; pctx.beginPath();
    for (const t of [0.17, 0.5, 0.84]) {
      const v = 1 - t;
      const x = v * v * v * start[0] + 3 * v * v * t * seg[0] + 3 * v * t * t * seg[2] + t * t * t * seg[4];
      const y = v * v * v * start[1] + 3 * v * v * t * seg[1] + 3 * v * t * t * seg[3] + t * t * t * seg[5];
      pctx.moveTo(x, y - 0.85); pctx.lineTo(x + 0.65, y);
      pctx.lineTo(x, y + 0.85); pctx.lineTo(x - 0.65, y); pctx.closePath();
    }
    pctx.fill();
  }
  function liningStars(x, y, flip) {
    pctx.save(); pctx.translate(x, y); pctx.scale(flip, 1);
    pctx.lineWidth = STROKE.hairline; pctx.strokeStyle = PAL.bodyCNavySatin;
    pctx.beginPath(); pctx.moveTo(0, 0); pctx.lineTo(1.8, 2.7); pctx.lineTo(0.5, 5); pctx.lineTo(3.2, 6.5); pctx.stroke();
    pctx.fillStyle = PAL.bodyCNavyLight; pctx.beginPath();
    for (const [a, b] of [[0, 0], [1.8, 2.7], [0.5, 5], [3.2, 6.5]]) { pctx.moveTo(a + 0.32, b); pctx.arc(a, b, 0.32, 0, Math.PI * 2); }
    pctx.fill(); pctx.restore();
  }
  function chestChain(castExt, fabricTrail, shoulderDrop) {
    const arm = castArm(castExt, fabricTrail), t = 0.12, v = 1 - t;
    const point = (a, b) => [v * v * v * a[0] + 3 * v * v * t * b[0] + 3 * v * t * t * b[2] + t * t * t * b[4], v * v * v * a[1] + 3 * v * v * t * b[1] + 3 * v * t * t * b[3] + t * t * t * b[5]];
    const l = point([74, 53], [69, 58, 64, 64, 62 + fabricTrail * 0.15, 70]);
    const r = point([106, 54], [...arm.upperC, arm.elbowX, arm.elbowY]); r[1] += shoulderDrop;
    const x = (l[0] + r[0]) / 2, y = Math.max(63.2, Math.max(l[1], r[1]) + 5);
    bezierLine(l, [[l[0] + 8, y - 1, x - 5, y, x, y], [x + 5, y, r[0] - 8, y - 1, r[0], r[1]]], PAL.gold, STROKE.hairline);
    bezierLine([x, y], [[x, y + 0.5, x, y + 0.7, x, y + 1.1]], PAL.goldDark, STROKE.hairline);
    const cy = y + 2.9;
    ellipseF(x, cy, 1.9, 1.9, PAL.goldDark); ellipseF(x, cy, 1.5, 1.5, PAL.indigo);
    pctx.lineWidth = STROKE.hairline; pctx.strokeStyle = PAL.gold; pctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      pctx.moveTo(x + c * 1.14, cy + s * 1.14); pctx.lineTo(x + c * 1.48, cy + s * 1.48);
    }
    pctx.moveTo(x - 0.6, cy + 0.3); pctx.lineTo(x, cy); pctx.lineTo(x + 0.1, cy - 0.85); pctx.stroke();
  }
  function waistJewelry(swing) {
    const sag = swing * 0.35;
    bezierLine([85, 89], [[89, 94 + sag, 98, 97 + sag, 103, 91]], PAL.gold, STROKE.fine);
    beltDiamonds([85, 89], [89, 94 + sag, 98, 97 + sag, 103, 91]);
    for (const t of [0.34, 0.68]) {
      const v = 1 - t;
      const x = 85 * v * v * v + 3 * 89 * v * v * t + 3 * 98 * v * t * t + 103 * t * t * t;
      const y = 89 * v * v * v + 3 * (94 + sag) * v * v * t + 3 * (97 + sag) * v * t * t + 91 * t * t * t;
      lapisStone(x, y, 0.75, 0.7);
    }
    const x = 104 + swing * 0.3, y = 96;
    bezierLine([103, 91], [[103, 93, x, 93, x, y - 2.4]], PAL.goldDark, STROKE.hairline);
    bezierShape([x - 1.6, y - 2], [[x - 1.5, y - 0.7, x + 1.1, y + 0.7, x + 1.6, y + 2], [x + 0.5, y + 2.2, x - 0.5, y + 2.2, x - 1.6, y + 2], [x - 1.1, y + 0.7, x + 1.5, y - 0.7, x + 1.6, y - 2]], PAL.eyeBlue);
    bezierLine([x - 1.7, y - 2.2], [[x - 0.7, y - 2.4, x + 0.7, y - 2.4, x + 1.7, y - 2.2]], PAL.gold, STROKE.fine);
    bezierLine([x - 1.7, y + 2.2], [[x - 0.7, y + 2.4, x + 0.7, y + 2.4, x + 1.7, y + 2.2]], PAL.gold, STROKE.fine);
    bezierLine([x - 1.6, y - 2], [[x - 1, y - 0.5, x + 1, y + 0.5, x + 1.6, y + 2]], PAL.gold, STROKE.hairline);
    bezierLine([x + 1.6, y - 2], [[x + 1, y - 0.5, x - 1, y + 0.5, x - 1.6, y + 2]], PAL.gold, STROKE.hairline);
    jewelAnchor(13, x, y);
    bezierLine([x, y + 2.4], [[x, y + 3, x + swing * 0.1, y + 3.5, x + swing * 0.1, y + 4]], PAL.goldDark, STROKE.hairline);
    lapisStone(x + swing * 0.1, y + 4.9, 1, 1.35, 15);
  }
  // One continuous skin envelope follows both existing arm segments.
  function shapedArm(start, upper, fore, handFrame) {
    const left = [], right = [], centers = [], normals = [];
    const wristWidth = 3.7 * 1.05 * handFrame.size;
    let origin = start;
    for (let part = 0; part < 2; part++) {
      const seg = part ? fore : upper;
      for (let i = part ? 1 : 0; i <= 12; i++) {
        const t = i / 12 * (part ? 0.7 : 1), v = 1 - t;
        const x = v * v * v * origin[0] + 3 * v * v * t * seg[0] + 3 * v * t * t * seg[2] + t * t * t * seg[4];
        const y = v * v * v * origin[1] + 3 * v * v * t * seg[1] + 3 * v * t * t * seg[3] + t * t * t * seg[5];
        const dx = 3 * v * v * (seg[0] - origin[0]) + 6 * v * t * (seg[2] - seg[0]) + 3 * t * t * (seg[4] - seg[2]);
        const dy = 3 * v * v * (seg[1] - origin[1]) + 6 * v * t * (seg[3] - seg[1]) + 3 * t * t * (seg[5] - seg[3]);
        const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        const width = part ? 4.4 * v + wristWidth * t + 1.3 * Math.sin(Math.PI * t) : 6.6 * v + 4.4 * t + 1.3 * Math.sin(Math.PI * t);
        left.push([x + nx * width / 2, y + ny * width / 2]);
        right.push([x - nx * width / 2, y - ny * width / 2]);
        centers.push([x, y]); normals.push([nx, ny]);
      }
      origin = seg.slice(4);
    }
    const cap = [start[0] - normals[0][1] * 1.8, start[1] + normals[0][0] * 1.8];
    const outline = smoothOutline(left.concat(right.slice().reverse(), [cap]), 0.65);
    const baseSegments = outline[1], last = left.length - 1;
    const cos = Math.cos(handFrame.rot), sin = Math.sin(handFrame.rot), k = 1.05 * handFrame.size;
    const point = (x, y) => [handFrame.x + (x * cos - y * sin) * k, handFrame.y + (x * sin + y * cos) * k];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const sample = (p, seg, t) => {
      const v = 1 - t;
      return [p[0] * v * v * v + 3 * seg[0] * v * v * t + 3 * seg[2] * v * t * t + seg[4] * t * t * t,
        p[1] * v * v * v + 3 * seg[1] * v * v * t + 3 * seg[3] * v * t * t + seg[5] * t * t * t];
    };
    const join = (edge, side) => {
      const p = edge[last], prev = edge[last - 1], root = point(side * 1.85, -0.4);
      const c = point(side * 2.05, 0.3), c2 = point(side * 2.25, 0.9), end = point(side * 2.3, 1.6);
      const distance = Math.hypot(root[0] - p[0], root[1] - p[1]) / 3;
      const len = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      const tangent = Math.hypot(c[0] - root[0], c[1] - root[1]);
      const curve = [p[0] + (p[0] - prev[0]) / len * distance, p[1] + (p[1] - prev[1]) / len * distance,
        root[0] - (c[0] - root[0]) / tangent * distance, root[1] - (c[1] - root[1]) / tangent * distance, ...root];
      const q0 = lerp(root, c, 0.2), q1 = lerp(c, c2, 0.2), q2 = lerp(c2, end, 0.2);
      const r0 = lerp(q0, q1, 0.2), r1 = lerp(q1, q2, 0.2), tip = lerp(r0, r1, 0.2);
      return {root,curve,overlap:[...q0,...r0,...tip],tip};
    };
    // The wrist edges share the hand root and its exact boundary tangents.
    const l = join(left, -1), r = join(right, 1);
    const lt = [left[last][0] - left[last - 1][0], left[last][1] - left[last - 1][1]];
    const rt = [right[last][0] - right[last - 1][0], right[last][1] - right[last - 1][1]];
    baseSegments[last - 1][2] = left[last][0] - lt[0] / 3; baseSegments[last - 1][3] = left[last][1] - lt[1] / 3;
    baseSegments[last + 1][0] = right[last][0] - rt[0] / 3; baseSegments[last + 1][1] = right[last][1] - rt[1] / 3;
    outline[1] = baseSegments.slice(0,last).concat([l.curve,l.overlap,
      [...l.tip,...r.tip,...r.tip],
      [r.overlap[2],r.overlap[3],r.overlap[0],r.overlap[1],...r.root],
      [r.curve[2],r.curve[3],r.curve[0],r.curve[1],...right[last]]],baseSegments.slice(last + 1));
    const lStart = left[last], rStart = right[last];
    for (let i = 1; i <= 8; i++) {
      const a = sample(lStart,l.curve,i/8), b = sample(rStart,r.curve,i/8);
      left.push(a); right.push(b); centers.push(lerp(a,b,0.5));
    }
    for (let i = 1; i <= 2; i++) {
      const a = sample(l.root,l.overlap,i/2), b = sample(r.root,r.overlap,i/2);
      left.push(a); right.push(b); centers.push(lerp(a,b,0.5));
    }
    bezierShape(outline[0], outline[1], PAL.skin);
    bezierLine(outline[0], baseSegments.slice(0,last), PAL.skinShadow, STROKE.hairline);
    bezierLine(right[last], baseSegments.slice(last + 1), PAL.skinShadow, STROKE.hairline);
    bodyLClip(outline, () => {
      const litLeft = normals[6][0] * LIGHT.x + normals[6][1] * LIGHT.y > 0;
      const dark = litLeft ? right : left, lit = litLeft ? left : right;
      const shadowInner = dark.map((p, i) => {
        const fade = handFrame.side < 0 ? 1 - Math.max(0, (i - last) / 10) : 1;
        const u = (0.30 + 0.20 * Math.sin(Math.PI * Math.min(i,24) / 24)) * fade;
        return [p[0] + (centers[i][0] - p[0]) * u, p[1] + (centers[i][1] - p[1]) * u];
      });
      const shadow = smoothOutline(dark.concat(shadowInner.reverse()), 0.55);
      bezierShape(shadow[0], shadow[1], PAL.skinShadow);
      if (handFrame.side < 0) {
        const edge = right.slice(last), inner = edge.map((p,i) => lerp(p,centers[last+i],0.3*i/10));
        const shade = smoothOutline(edge.concat(inner.reverse()),0.55);
        bezierShape(shade[0],shade[1],PAL.skinShadow);
      }
      for (const [lo, hi] of [[2, 10], [14, 22]]) {
        const outer = [], inner = [];
        for (let i = lo; i <= hi; i++) {
          const swell = Math.sin(Math.PI * (i - lo) / (hi - lo));
          const a = 0.40 - swell * 0.28, b = 0.40 + swell * 0.45;
          outer.push([lit[i][0] + (centers[i][0] - lit[i][0]) * a, lit[i][1] + (centers[i][1] - lit[i][1]) * a]);
          inner.push([lit[i][0] + (centers[i][0] - lit[i][0]) * b, lit[i][1] + (centers[i][1] - lit[i][1]) * b]);
        }
        const shine = smoothOutline(outer.concat(inner.reverse()), 0.55);
        bezierShape(shine[0], shine[1], PAL.skinSoftLight);
      }
    });
    return outline;
  }
  // A short crease joins the forearm shade to the existing hand shade.
  function finishWrist(side) {
    bezierLine([-1.85 * side * 1.05, -0.4 * 1.05], [[-1.96 * side * 1.05, -0.02 * 1.05, -2.02 * side * 1.05, 0.32 * 1.05, -2 * side * 1.05, 0.6 * 1.05]], PAL.skinShadow, STROKE.hairline);
  }
  // The fitted waist narrows by one eighth while chest and hips stay fixed.
  function waistPath(outline) {
    const point = (x, y) => {
      let u = Math.max(0, Math.min(1, (y - 68) / 10, (88 - y) / 4));
      u = u * u * (3 - 2 * u);
      return [92 + (x - 92) * (1 - 0.125 * u), y];
    };
    return [point(...outline[0]), outline[1].map(seg => [...point(seg[0], seg[1]), ...point(seg[2], seg[3]), ...point(seg[4], seg[5])])];
  }
  function fittedCloth(outline, base, folds) {
    lowerCloth(waistPath(outline), base, folds.map(([a, b, tone]) => [...waistPath([a, b]), tone]));
  }
  function waistLine(start, segments, tone, width) {
    const shape = waistPath([start, segments]);
    bezierLine(shape[0], shape[1], tone, width);
  }
  // Opaque cloth planes share the same moving outline and light direction.
  function lowerCloth(outline, base, folds) {
    const tone = CLOTH_TONES[base];
    bodyLMaterial(outline, base, tone.shade || base, tone.lit || base, 1.4, 0.7);
    bodyLClip(outline, () => {
      for (const [start, segments, color] of folds) bezierShape(start, segments, color);
    });
  }
  // The sleeve hangs from its fixed shoulder while its hem follows the lift.
  function lowerSleeve(side, trail, lift, back) {
    pctx.save();
    if (side > 0) { pctx.translate(back ? 182 : 180, 0); pctx.scale(-1, 1); }
    const f = side > 0 ? -trail : trail, root = back ? 72 : 76, tip = back ? 37 : 34;
    pctx.translate(0, 52); pctx.scale(1, 1 - lift * 0.09); pctx.translate(0, -52);
    const edge = [[tip + f, 96], [
      [tip - 1 + f, 100, 42 + f * 0.9, 104, 48 + f * 0.75, 102],
      back ? [52 + f * 0.5, 100, 54 + f * 0.3, 97, 56, 98] : [55 + f * 0.5, 99, 59 + f * 0.3, 96, 64, 102]
    ]];
    const rootY = 59;
    const outline = [[root, rootY], [
      [68, 57, 62, 61, 58 + f * 0.15, 67],
      [52 + f * 0.35, 78, 42 + f * 0.75, 88, tip + f, 96],
      ...edge[1],
      back ? [61, 92, 68, 73, root, rootY] : [70, 98, 76, 79, root, rootY]
    ]];
    lowerCloth(outline, PAL.creamMid, [
      [[69, 59], [[65, 75, 52 + f * 0.5, 90, 40 + f * 0.9, 98], [47 + f * 0.7, 96, 60, 84, 66, 74], [69, 67, 70, 62, 69, 59]], PAL.bodyCWhiteContact],
      [[73, 61], [[74, 77, 67, 92, 62, 99], [65, 90, 68, 76, 69, 65], [70, 62, 72, 60, 73, 61]], PAL.bodyCCreamFold],
      [[66, 66], [[60, 81, 50 + f * 0.55, 90, 46 + f * 0.75, 97], [54 + f * 0.45, 94, 65, 78, 66, 66]], side > 0 ? PAL.cream : PAL.bodyCCreamLight]
    ]);
    bezierShape([tip + 1 + f, 96], [
      [41 + f * 0.85, 95, 51 + f * 0.5, 91, 59 + f * 0.2, 85],
      [57 + f * 0.3, 94, 54 + f * 0.5, 101, 48 + f * 0.75, 102],
      [42 + f * 0.9, 103, tip + f, 100, tip + 1 + f, 96]
    ], side > 0 ? PAL.indigo : PAL.indigoDeep);
    bezierShape([48 + f * 0.75, 102], back ? [[52 + f * 0.5, 101, 54, 96, 56, 98], [54, 98, 52 + f * 0.5, 103, 48 + f * 0.75, 102]] : [[54 + f * 0.5, 101, 59, 95, 64, 102], [59, 100, 54 + f * 0.5, 105, 48 + f * 0.75, 102]], PAL.cream);
    bodyLClip(outline, () => {
      clothTrim(edge[0], edge[1], -1.7, false);
      liningStars(46 + f * 0.75, 97, 1);
      bezierShape([68, 60], [[66, 63, 64, 67, 62 + f * 0.1, 71], [64, 68, 68, 64, 68, 60]], PAL.bodyCCreamFold);
      bezierShape([70, 60.5], [[70, 64, 69, 66, 67.5, 69], [68, 65, 69, 62, 70, 60.5]], PAL.bodyCCreamLight);
    });
    bezierLine(edge[0], edge[1], PAL.bodyCWhiteDeep, 1.3);
    bezierLine(edge[0], edge[1], PAL.gold, STROKE.fine);
    bezierLine([root, rootY], outline[1].slice(0, 2), PAL.outline, STROKE.fine);
    pctx.restore();
  }
  // A fitted shaft meets an ankle, heel counter and tapered toe.
  function lowerBoot(x, top, ground, back) {
    top -= 3.5;
    const outline = back ? [[x - 4.2, top], [
      [x - 5, top + 8, x - 4, ground - 17, x - 2.7, ground - 12],
      [x - 2.5, ground - 8, x - 4, ground - 6, x - 3.3, ground - 2],
      [x - 3.2, ground - 0.1, x - 2, ground + 0.2, x, ground + 0.2],
      [x + 2, ground + 0.2, x + 3.2, ground - 0.1, x + 3.3, ground - 2],
      [x + 4, ground - 6, x + 2.5, ground - 8, x + 2.7, ground - 12],
      [x + 4, ground - 17, x + 5, top + 8, x + 4.2, top]
    ]] : [[x - 3.6, top], [
      [x - 4.2, top + 8, x - 3.5, ground - 15, x - 3, ground - 10],
      [x - 3.6, ground - 8, x - 5, ground - 6, x - 4.8, ground - 3],
      [x - 4.9, ground - 2, x - 4.2, ground - 0.6, x - 2, ground - 0.5],
      [x - 0.4, ground + 0.2, x + 1, ground + 0.2, x + 2, ground - 0.2],
      [x + 4.6, ground - 0.5, x + 6, ground - 2, x + 4.6, ground - 3.8],
      [x + 2.4, ground - 5.5, x + 0.4, ground - 6, x + 1.6, ground - 10],
      [x + 3, ground - 15, x + 4.1, top + 8, x + 3.6, top]
    ]];
    bodyLMaterial(outline, PAL.boot, PAL.bootDeep, PAL.bodyLBootEdge, 1, 0.5);
    bodyLClip(outline, () => {
      bezierShape([x + 0.4, top + 2], [[x + 2.6, top + 9, x + 1.2, ground - 18, x - 0.2, ground - 12], [x - 0.6, ground - 20, x - 1.6, top + 7, x + 0.4, top + 2]], PAL.bodyLBootPlane);
      bezierLine([x - 2.8, ground - 11], [[x - 1.5, ground - 12.2, x, ground - 10, x + 1.7, ground - 10.5]], PAL.bootDeep, STROKE.fine);
      bezierLine([x - 2.7, ground - 9], [[x - 1.4, ground - 10, x, ground - 8.3, x + 1.5, ground - 9]], PAL.bodyLBootFold, STROKE.fine);
      if (back) {
        bezierShape([x - 1.6, top + 5], [[x - 3, top + 12, x - 3, ground - 18, x - 1, ground - 13], [x + 1.7, ground - 16, x + 2, top + 14, x + 0.5, top + 5]], PAL.bodyLBootPlane);
        bezierShape([x - 2.5, ground - 5], [[x - 1.5, ground - 4.2, x + 1.5, ground - 4.2, x + 2.5, ground - 5], [x + 2.2, ground - 2.7, x + 1.8, ground - 1, x + 1.8, ground - 0.5], [x, ground + 0.2, x - 1, ground, x - 1.8, ground - 0.5]], PAL.bootDeep);
        bezierLine([x - 2.8, ground - 1.1], [[x - 1.2, ground - 0.6, x + 1.2, ground - 0.6, x + 2.8, ground - 1.1]], PAL.goldDark, STROKE.hairline);
      } else {
        bezierShape([x - 1, ground - 7], [[x, ground - 5, x + 3.6, ground - 4, x + 4.4, ground - 2.9], [x + 1.3, ground - 3, x - 2.7, ground - 3.8, x - 1, ground - 7]], PAL.bodyLBootPlane);
        bezierLine([x - 4.7, ground - 2.2], [[x - 2, ground - 0.3, x + 2.8, ground - 0.7, x + 4.7, ground - 2.5]], PAL.bootDeep, STROKE.fine);
        bezierLine([x - 4.2, ground - 5.3], [[x - 3.1, ground - 4.8, x - 2.3, ground - 4.5, x - 1.7, ground - 4.2]], PAL.bodyLBootEdge, STROKE.fine);
      }
    });
    bodyLClip(outline, () => {
      const bx = x + (back ? 1.1 : -0.7), by = ground - 8.4;
      bezierLine([x - 2.7, by], [[x - 1, by + 0.6, x + 0.6, by + 0.6, x + 2.3, by]], PAL.goldDark, STROKE.hairline);
      pctx.strokeStyle = PAL.gold; pctx.lineWidth = STROKE.hairline;
      pctx.beginPath(); pctx.roundRect(bx - 0.9, by - 0.65, 1.8, 1.6, 0.3);
      pctx.moveTo(bx - 0.6, by + 0.1); pctx.lineTo(bx + 0.6, by + 0.1); pctx.stroke();
    });
    bezierLine([x - 3.3, top + 0.8], [[x - 1.4, top + 0.8, x + 1.3, top + 0.8, x + 3.3, top + 0.8]], PAL.gold, STROKE.fine);
    lapisStone(x, top + 0.8, 0.75, 0.8);
    bezierLine([x - 3.3, ground - 16], [[x - 1.1, ground - 14.8, x + 1.4, ground - 14.8, x + 3.1, ground - 16]], PAL.goldDark, STROKE.fine);
    ellipseF(x, ground - 15.1, 0.8, 0.75, PAL.gold);
  }

  function drawKanade(t, opts) {
    opts = opts || {};
    const _key = spriteKey('f', t, opts);
    if (_key === _spriteKey) return;
    _spriteKey = _key;
    jewelMask = 0;
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
    // The hair behind her takes the body's trail plus its own swing, and its
    // ends lift a little with the charge.
    const hm = computeHairMotion(t, opts);
    const hTrail = trail + hm.long(1.1);
    const hDrop = hairDrop - hm.lift;

    pctx.clearRect(0, 0, GRID_W, GRID_H);
    pctx.save();
    pctx.translate(lean, bob);

    bezierShape([79, 17], [
      [72, 21, 66, 39, 66 + hTrail * 0.08, 68],
      [65 + hTrail * 0.2, 98, 62 + hTrail * 0.5, 128 + hDrop * 8, 57 + hTrail * 0.7, 145 + hDrop * 7],
      [59 + hTrail * 0.65, 147 + hDrop * 5, 66 + hTrail * 0.45, 145 + hDrop * 5, 71 + hTrail * 0.35, 138 + hDrop * 7],
      [73 + hTrail * 0.25, 149 + hDrop * 6, 80 + hTrail * 0.15, 154 + hDrop * 4, 84, 139 + hDrop * 6],
      [88, 151 + hDrop * 5, 94, 153 + hDrop * 4, 98, 137 + hDrop * 6],
      [104 + hTrail * 0.15, 151 + hDrop * 5, 112 + hTrail * 0.35, 151 + hDrop * 5, 116 + hTrail * 0.6, 139 + hDrop * 7],
      [120 + hTrail * 0.7, 124 + hDrop * 8, 117 + hTrail * 0.2, 78, 114, 57],
      [111, 31, 108, 18, 99, 16],
      [92, 12, 85, 13, 79, 17]
    ], PAL.hairLavender);

    bezierShape([78, 24], [
      [68, 35, 65, 66, 66 + hTrail * 0.15, 96],
      [65 + hTrail * 0.35, 119, 61 + hTrail * 0.6, 138 + hDrop * 7, 55 + hTrail * 0.7, 141 + hDrop * 7],
      [61 + hTrail * 0.55, 144 + hDrop * 5, 68 + hTrail * 0.35, 139 + hDrop * 6, 72, 121],
      [74, 87, 75, 48, 78, 24]
    ], PAL.hairBlueShade);
    bezierShape([103, 20], [
      [112, 31, 116, 58, 115 + hTrail * 0.12, 88],
      [116 + hTrail * 0.35, 116, 116 + hTrail * 0.62, 135 + hDrop * 7, 112 + hTrail * 0.7, 148 + hDrop * 6],
      [107 + hTrail * 0.5, 150 + hDrop * 5, 102 + hTrail * 0.3, 140 + hDrop * 6, 100, 123],
      [101, 87, 100, 43, 103, 20]
    ], PAL.hairLavender);
    // Dark outline along the outer edge of each side-hair strand only -
    // this is exactly where hair drapes right next to the sleeve fabric
    // and the two were blending into one shape with no separating line.
    bezierLine([78, 24], [
      [68, 35, 65, 66, 66 + hTrail * 0.15, 96],
      [65 + hTrail * 0.35, 119, 61 + hTrail * 0.6, 138 + hDrop * 7, 55 + hTrail * 0.7, 141 + hDrop * 7]
    ], PAL.outline, STROKE.seam);
    bezierLine([103, 20], [
      [112, 31, 116, 58, 115 + hTrail * 0.12, 88],
      [116 + hTrail * 0.35, 116, 116 + hTrail * 0.62, 135 + hDrop * 7, 112 + hTrail * 0.7, 148 + hDrop * 6]
    ], PAL.outline, STROKE.seam);
    // The spell's light catching the outer edge of her hair while she
    // gathers it, as strong as the light on her arm and cheek.
    const hairGlow = Math.round((opts.magicLight || 0) * 10) / 10;
    if (hairGlow > 0.01) {
      pctx.save();
      pctx.globalAlpha = hairGlow;
      bezierLine([78, 24], [
        [68, 35, 65, 66, 66 + hTrail * 0.15, 96],
        [65 + hTrail * 0.35, 119, 61 + hTrail * 0.6, 138 + hDrop * 7, 55 + hTrail * 0.7, 141 + hDrop * 7]
      ], PAL.magic, STROKE.fine);
      bezierLine([103, 20], [
        [112, 31, 116, 58, 115 + hTrail * 0.12, 88],
        [116 + hTrail * 0.35, 116, 116 + hTrail * 0.62, 135 + hDrop * 7, 112 + hTrail * 0.7, 148 + hDrop * 6]
      ], PAL.magicHi, STROKE.fine);
      pctx.restore();
    }
    // Long underlayers remain behind the shoulders and gown.
    hairLockShaded(82, 20, 14, 68 + hTrail * 0.6, 148 + hDrop * 5, -5, PAL.hairSoftLight);
    hairLockShaded(102, 20, 14, 112 + hTrail * 0.6, 149 + hDrop * 5, 3, PAL.hairLight);

    // The dark lining continues from the sleeve turn into the hanging tails.
    lowerCloth([[63 + fabricTrail * 0.15, 72], [
      [52 + fabricTrail * 0.4, 84, 43 + fabricTrail * 0.8, 100, 40 + fabricTrail, 115 + droop * 12],
      [39 + fabricTrail, 122 + droop * 10, 47 + fabricTrail * 0.7, 129 + droop * 10, 57 + fabricTrail * 0.45, 128 + droop * 10],
      [68, 119, 76, 101, 78, 91]
    ]], PAL.indigo, [
      [[59, 85], [[53, 101, 43 + fabricTrail, 116, 48 + fabricTrail * 0.7, 125], [50 + fabricTrail * 0.6, 116, 60, 99, 59, 85]], PAL.bodyCNavyFold]
    ]);
    lowerCloth([[117 + fabricTrail * 0.15, 72], [
      [128 + fabricTrail * 0.4, 85, 140 + fabricTrail * 0.8, 106, 143 + fabricTrail, 124 + droop * 12],
      [144 + fabricTrail, 131 + droop * 10, 132 + fabricTrail * 0.7, 138 + droop * 10, 122 + fabricTrail * 0.45, 133 + droop * 10],
      [111, 119, 104, 101, 102, 91]
    ]], PAL.indigo, [
      [[120, 85], [[128, 101, 139 + fabricTrail, 122, 135 + fabricTrail * 0.7, 133], [132 + fabricTrail * 0.6, 117, 122, 99, 120, 85]], PAL.bodyCNavySatin]
    ]);
    liningStars(50 + fabricTrail * 0.65, 115, 1);
    liningStars(133 + fabricTrail * 0.65, 121, -1);
    bezierShape([43 + fabricTrail, 101], [[38 + fabricTrail, 109, 43 + fabricTrail * 0.9, 117, 50 + fabricTrail * 0.65, 121], [55 + fabricTrail * 0.5, 124, 58, 127, 56, 129], [51, 130, 45 + fabricTrail * 0.8, 124, 43 + fabricTrail * 0.9, 120], [39 + fabricTrail, 114, 39 + fabricTrail, 108, 43 + fabricTrail, 101]], PAL.creamMid);
    bezierShape([41.3 + fabricTrail, 108], [[41.7 + fabricTrail, 116, 47.2 + fabricTrail * 0.6, 122, 53.3, 125.8], [46, 123, 40 + fabricTrail, 115, 41.3 + fabricTrail, 108]], PAL.bodyCWhiteContact);
    bezierLine([43 + fabricTrail, 101], [[39 + fabricTrail, 110, 44 + fabricTrail * 0.8, 117, 50 + fabricTrail * 0.65, 121], [55, 124, 58, 127, 56, 129]], PAL.goldDark, STROKE.fine);
    bezierShape([137 + fabricTrail, 103], [[145 + fabricTrail, 114, 140 + fabricTrail * 0.9, 122, 132 + fabricTrail * 0.65, 126], [126 + fabricTrail * 0.5, 130, 125, 133, 128, 135], [134, 136, 140 + fabricTrail * 0.8, 128, 142 + fabricTrail * 0.9, 124], [146 + fabricTrail, 116, 142 + fabricTrail, 108, 137 + fabricTrail, 103]], PAL.creamMid);
    bezierShape([142 + fabricTrail, 112], [[144 + fabricTrail, 121, 134 + fabricTrail * 0.6, 128, 128.2, 133], [132, 126, 141 + fabricTrail, 120, 142 + fabricTrail, 112]], PAL.bodyCCreamFold);
    bezierLine([137 + fabricTrail, 103], [[144 + fabricTrail, 114, 139 + fabricTrail * 0.8, 123, 132 + fabricTrail * 0.65, 126], [126, 130, 125, 133, 128, 135]], PAL.gold, STROKE.fine);

    const backFoot = walkStep * 4;
    const farLift = Math.abs(walkStep) * 7;
    const farLeg = smoothOutline([[82, 105], [88, 105], [88 - backFoot * 0.25, 143], [85 - backFoot, 158 - farLift], [79 - backFoot, 157 - farLift], [81 - backFoot * 0.4, 132]], 0.6);
    bodyLMaterial(farLeg, PAL.skinShadow, PAL.skinShadow, PAL.bodyLSkinShade, 0.9, 0.4);
    lowerBoot(82.5 - backFoot, 148 - farLift, 173.2 - hipTilt - farLift, false);

    const robeL = [[78, 75], [
      [69, 85, 62, 103, 58 + fabricTrail * 0.15, 118],
      [56 + fabricTrail * 0.25, 129, 53 + fabricTrail * 0.4, 136, 52 + fabricTrail * 0.45, 142],
      [55 + fabricTrail * 0.4, 147, 63 + fabricTrail * 0.3, 146, 68 + fabricTrail * 0.2, 149],
      [75 + fabricTrail * 0.15, 153, 84, 150, 89, 142],
      [91, 130, 92, 110, 94, 96], [91, 84, 84, 77, 78, 75]
    ]];
    const robeR = [[102, 74], [
      [114, 87, 121, 102, 124 + fabricTrail * 0.15, 116],
      [127 + fabricTrail * 0.25, 130, 130 + fabricTrail * 0.4, 139, 132 + fabricTrail * 0.45, 146],
      [128 + fabricTrail * 0.4, 151, 120 + fabricTrail * 0.3, 149, 115 + fabricTrail * 0.2, 152],
      [107 + fabricTrail * 0.15, 156, 100, 150, 100, 142],
      [99, 126, 90, 107, 87, 96], [90, 83, 97, 76, 102, 74]
    ]];
    lowerCloth(robeL, PAL.creamMid, [
      [[69, 91], [[65, 109, 62 + fabricTrail * 0.2, 130, 56 + fabricTrail * 0.4, 143], [61 + fabricTrail * 0.3, 145, 67, 121, 69, 91]], PAL.bodyCWhiteContact],
      [[79, 84], [[73, 104, 70, 126, 68, 149], [77, 139, 76, 107, 79, 84]], PAL.bodyCCreamLight]
    ]);
    lowerCloth(robeR, PAL.creamMid, [
      [[111, 89], [[118, 112, 122 + fabricTrail * 0.2, 133, 130 + fabricTrail * 0.4, 146], [121 + fabricTrail * 0.3, 146, 114, 119, 111, 89]], PAL.bodyCCreamFold],
      [[105, 85], [[108, 108, 109, 130, 115, 152], [105, 142, 103, 106, 105, 85]], PAL.cream]
    ]);
    for (const robe of [robeL, robeR]) bezierLine(robe[0], robe[1].slice(0, 4), PAL.outline, STROKE.fine);
    const whiteSkirt = smoothOutline([[86, 78], [75, 93], [69, 114], [63 + fabricTrail * 0.35, 147], [75, 150], [85, 145], [89, 126], [94, 87]], 0.5);
    lowerCloth(whiteSkirt, PAL.cream, [
      [[79, 88], [[74, 110, 76, 131, 68, 147], [73, 146, 79, 121, 79, 88]], PAL.bodyCCreamFold],
      [[87, 88], [[83, 107, 85, 128, 82, 146], [88, 138, 90, 105, 87, 88]], PAL.bodyCCreamShade]
    ]);
    bodyLClip(whiteSkirt, () => {
      for (const [x, end] of [[76.5, 70], [82, 77.5], [86.5, 83]]) {
        bezierShape([x, 97], [[x - 1.4, 115, end + 1, 135, end, 146], [end + 1.6, 137, x + 0.2, 115, x, 97]], PAL.bodyCCreamFold);
        bezierLine([x + 0.5, 102], [[x, 116, end + 1.7, 136, end + 0.5, 144]], PAL.bodyCCreamLight, STROKE.hairline);
      }
      const hem = [whiteSkirt[0], ...whiteSkirt[1].map(p => p.slice(4))];
      const segs = whiteSkirt[1].slice(3, 5);
      pctx.save(); pctx.translate(0, -1.1);
      bezierLine(hem[3], segs, PAL.bodyCCreamShade, STROKE.hairline);
      pctx.beginPath(); pctx.strokeStyle = PAL.bodyCCreamShade; pctx.lineWidth = STROKE.hairline;
      for (let i = 0; i < 9; i++) {
        const x = 65 + fabricTrail * 0.3 + i * 2.1, y = 148.3 - Math.pow((x - 74) / 9, 2) * 2.4;
        pctx.moveTo(x - 0.8, y - 0.1); pctx.bezierCurveTo(x - 0.8, y + 1.2, x + 0.8, y + 1.2, x + 0.8, y - 0.1);
      }
      pctx.stroke(); pctx.restore();
      clothTrim([89.3, 104], [[88.8, 115, 87.4, 128, 85.8, 138], [85.3, 142, 84.7, 144.2, 84.2, 145.3]], 0, true);
    });
    const navySkirt = smoothOutline([[94, 79], [107, 92], [114, 115], [123 + fabricTrail * 0.35, 150], [111, 152], [101, 147], [93, 126], [87, 88]], 0.5);
    lowerCloth(navySkirt, PAL.indigo, [
      [[102, 91], [[106, 109, 107, 134, 115, 150], [113, 132, 109, 106, 102, 91]], PAL.bodyCNavyLight],
      [[99, 94], [[100, 115, 98, 136, 104, 148], [108, 139, 104, 111, 99, 94]], PAL.bodyCNavyContact],
      [[110, 105], [[116, 124, 118, 140, 122, 149], [120, 132, 114, 112, 110, 105]], PAL.bodyCNavySatin]
    ]);
    bodyLClip(navySkirt, () => {
      pctx.fillStyle = PAL.bodyCNavySatin; pctx.beginPath();
      for (const [x, y, r] of [[102, 104, 0.35], [108, 112, 0.3], [103, 122, 0.4], [111, 129, 0.3], [106, 140, 0.4], [116, 146, 0.3], [112, 119, 0.25], [117, 137, 0.3]]) {
        pctx.moveTo(x + r, y); pctx.arc(x, y, r, 0, Math.PI * 2);
      }
      pctx.fill();
      clothTrim([101.4, 107], [[103.8, 119, 104, 135, 103.1, 145]], 0, true);
    });
    const split = smoothOutline([[91, 91], [100, 105], [102, 126], [101, 150], [92, 151], [87, 146], [87, 126]], 0.45);
    bezierShape(split[0], split[1], PAL.indigoDeep);
    // The leg tapers from thigh (about 8.8 wide) to knee (6.8), swells a
    // little at the calf (7.0) and narrows into the boot shaft (6.2) on one
    // axis, so thigh, knee and calf read as one limb.
    const thigh = smoothOutline([
      [92, 103], [95.8, 108], [97.6, 116], [97.6, 122], [97.1, 127.5], [97.6, 131],
      [98.5, 135.5], [98.4, 141], [98.8, 146.5], [92.2, 146.5], [92.2, 141],
      [91.6, 135.5], [90.5, 129], [89.4, 123], [89.2, 116], [90.2, 108]
    ], 0.5);
    bodyLMaterial(thigh, PAL.skin, PAL.bodyLSkinShade, PAL.skin, 1.1, 0.3);
    bodyLClip(thigh, () => {
      // shade down the side away from the light, thinning into the boot
      const shade = smoothOutline([
        [89.2, 114], [90.7, 115], [91.3, 122], [91.7, 128.5], [92.9, 135.5],
        [93.3, 141], [93.3, 147], [91.8, 147], [92.1, 141], [91.5, 135.5], [90.4, 129], [89.3, 123]
      ], 0.5);
      bezierShape(shade[0], shade[1], PAL.bodyLSkinShade);
      // a soft fall of shade under the kneecap, kept to the inner half
      bezierShape([92.4, 129.4], [[93.4, 130.5, 94.8, 130.7, 95.6, 130.2], [94.6, 131.4, 93.1, 131.3, 92.4, 129.4]], PAL.bodyLSkinShade);
    });
    lowerBoot(95.5, 145, 175, false);

    // The narrow neck opens into bare shoulders above the dropped gown.
    const neck = [[88, 43], [
      [89.2, 47.8, 89.2, 50.2, 86, 51.5],
      [82, 52, 78, 50.5, 74, 52],
      [72, 53, 71, 55, 71.5, 57],
      [76, 58, 80, 60, 84, 61],
      [89, 63, 96, 63, 101, 61],
      [105, 60, 109, 58 + shoulderDrop, 109, 56 + shoulderDrop],
      [108, 53 + shoulderDrop, 106, 52 + shoulderDrop, 103, 52],
      [101, 52, 99.5, 52, 98, 51.5],
      [94.8, 50.2, 94.8, 47.8, 96, 43]
    ]];
    bezierShape(neck[0], neck[1], PAL.skin);
    // Collarbone hints stay beside the neck and clear of its center.
    bezierLine([84, 54.4], [[82.4, 54.8, 80.5, 54.3, 79, 53.8]], PAL.bodyLSkinShade, STROKE.hairline);
    bezierLine([99, 54.4], [[100.5, 54.8, 102, 54.2 + shoulderDrop, 103, 53.8 + shoulderDrop]], PAL.bodyLSkinShade, STROKE.hairline);
    pctx.save(); pctx.translate(0, 88); pctx.scale(1, 31 / 29); pctx.translate(0, -88);
    fittedCloth(smoothOutline([[76, 60], [84, 59], [92, 61], [101, 59], [107, 60], [104, 73], [98, 84], [82, 83], [75, 72]], 0.5), PAL.cream, []);
    fittedCloth(smoothOutline([[76, 60], [84, 59], [88, 79], [80, 82], [74, 69]], 0.5), PAL.indigoMid, [
      [[79, 62], [[80, 67, 82, 75, 83, 79], [86, 80, 84, 66, 79, 62]], PAL.bodyCNavySatin]
    ]);
    // Subtle clockwork stays inside the fitted navy panels.
    const bodiceMid = smoothOutline([[84, 59], [92, 60.5], [100, 59], [104, 72], [102, 82], [92, 88], [83, 82]], 0.5);
    fittedCloth(bodiceMid, PAL.indigoDeep, [
      [[91, 62], [[90, 70, 90, 79, 92, 85], [96, 84, 96, 72, 94, 66], [93, 64, 92, 62, 91, 62]], PAL.bodyCNavyContact],
      [[98, 62], [[101, 68, 102, 76, 101, 81], [98, 78, 97, 68, 98, 62]], PAL.bodyCNavySatin]
    ]);
    bodyLClip(waistPath(bodiceMid), () => {
      pctx.strokeStyle = PAL.bodyCNavySatin + '38'; pctx.lineWidth = STROKE.hairline;
      pctx.beginPath();
      for (const [x, y, r] of [[89, 67, 3.4], [97, 77, 4.2], [88, 83, 2.5]]) {
        pctx.moveTo(x + r, y); pctx.arc(x, y, r, 0, Math.PI * 2);
        pctx.moveTo(x, y - r * 0.65); pctx.lineTo(x, y); pctx.lineTo(x + r * 0.55, y + r * 0.2);
      }
      pctx.stroke();
    });

    pctx.restore();
    lowerSleeve(-1, fabricTrail, 0, false);
    // Her right arm, one rig from hanging at her side to raised in the cast.
    // The sleeve drape hangs from the shoulder the whole time and the bare
    // arm lifts in front of it, the way the left arm lies over its own
    // sleeve. Built as two drawings, one for each state, the sleeve vanished
    // and a different one appeared the instant the cast began, and the hand
    // jumped from her hip to her chest.
    pctx.save();
    pctx.translate(0, shoulderDrop);
    lowerSleeve(1, fabricTrail, castExt, false);
    pctx.restore();

    // Fine embroidery follows the fitted seams from chest to waist.
    pctx.save(); pctx.translate(0, 88); pctx.scale(1, 31 / 29); pctx.translate(0, -88);
    waistLine([86, 61], [[87.7, 67, 88.3, 73, 87.9, 79], [87.7, 82, 88.1, 84, 89, 86]], PAL.gold, STROKE.fine);
    waistLine([99, 61], [[97, 67, 96.2, 73, 96.5, 79], [96.7, 82, 96, 84, 95, 86]], PAL.goldDark, STROKE.fine);
    lapisStone(92, 72, 1.75, 1.75, 14);
    pctx.restore();
    bezierLine([91, 79], [[90.8, 83, 91.5, 87, 91, 91]], PAL.gold, STROKE.fine);
    sparkle(91, 91, 2.3, PAL.gold);
    waistJewelry(sway);
    for (const [x, y] of [[85, 89], [103, 91]]) {
      ellipseF(x, y, 1.2, 1.3, PAL.gold);
      ellipseF(x, y, 0.5, 0.6, PAL.indigo);
    }

    // The collar center has its upper edge at y 55.2 on the standing grid.
    bezierLine([87, 54.5], [[89, 56.5, 94.8, 56.5, 97, 54.5]], PAL.gold, STROKE.band);
    bezierLine([84, 57.7], [[88, 61, 96, 61, 100, 57.7]], PAL.goldDark, STROKE.fine);
    bezierShape([92, 56.5], [[93, 57.5, 93.7, 58.5, 94, 59.1], [93.5, 59.8, 92.5, 61.1, 92, 61.8], [91.5, 61.1, 90.5, 59.8, 90, 59.1], [90.5, 58.1, 91.3, 57.1, 92, 56.5]], PAL.gold);
    bezierShape([92, 57.7], [[92.5, 58.3, 92.8, 58.7, 93, 59.1], [92.7, 59.7, 92.3, 60.2, 92, 60.7], [91.7, 60.2, 91.3, 59.7, 91, 59.1], [91.3, 58.5, 91.6, 58.1, 92, 57.7]], PAL.eyeBlue);

    jewelAnchor(0, 92, 59.1);

    // Detail pass over the gown, under the face and front hair so nothing here
    // can crowd them. Everything is a thin line or a small flat shape: at this
    // sprite size anything finer than about one grid unit never resolves, it
    // only costs draw time.

    // Embroidery follows the cloth edges and stops outside the exposed leg.
    bezierLine([86, 79], [[77, 93, 71, 115, 69, 131], [67, 141, 65, 145, 64 + fabricTrail * 0.35, 147], [72, 151, 81, 150, 85, 145]], PAL.goldDark, STROKE.fine);
    bezierLine([94, 80], [[106, 94, 113, 116, 116, 130], [119, 139, 122, 146, 123 + fabricTrail * 0.35, 150], [116, 153, 107, 151, 101, 147]], PAL.gold, STROKE.fine);
    bezierLine([91.5, 99], [[90, 112, 86.2, 122, 88.2, 129], [89.5, 137, 89.3, 142, 90.6, 146]], PAL.goldDark, STROKE.hairline);
    bezierLine([98.8, 114], [[100.8, 128, 98.8, 139, 101, 147]], PAL.gold, STROKE.hairline);
    bezierLine([52 + fabricTrail * 0.45, 142], robeL[1].slice(2, 4), PAL.goldDark, STROKE.fine);
    bezierLine([132 + fabricTrail * 0.45, 146], robeR[1].slice(2, 4), PAL.gold, STROKE.fine);
    bodyLClip(robeL, () => clothTrim([52 + fabricTrail * 0.45, 142], robeL[1].slice(2, 4), -1.9, false));
    bodyLClip(robeR, () => clothTrim([132 + fabricTrail * 0.45, 146], robeR[1].slice(2, 4), 1.9, false));
    sparkle(73, 113, 1.6, PAL.gold);
    sparkle(68, 135, 1.5, PAL.gold);
    sparkle(114.5, 125, 1.6, PAL.gold);
    sparkle(120, 142, 1.4, PAL.gold);

    // Bodice seams either side of the centre band, and a waist line, so the
    // torso stops being one unbroken dark field.
    waistLine([88, 58], [[87, 70.7, 87, 84, 88, 94]], PAL.indigoHi, STROKE.hairline);
    waistLine([96, 58], [[97, 70.7, 97, 84, 96, 94]], PAL.indigoHi, STROKE.hairline);
    bezierLine([86, 90 + hipTilt], [[89, 93 + hipTilt * 0.5, 95, 93 - hipTilt * 0.5, 98, 90 - hipTilt]], PAL.goldDark, STROKE.fine);

    // Gold at the collar and the sleeve openings. The metal is the only part
    // of the outfit that can catch light, so more of it is what reads as
    // expensive rather than more cloth detail would.
    bezierLine([82, 60.3], [[86, 64.3, 98, 64.3, 102, 60.3]], PAL.goldDark, STROKE.edge);
    bezierLine([83, 59.3], [[87, 62.3, 97, 62.3, 101, 59.3]], PAL.gold, STROKE.fine);
    waistLine([86, 75], [[89, 77, 95, 77, 98, 75]], PAL.goldDark, STROKE.fine);
    ellipse(89, 86, 1.2, 1.2, PAL.gold);
    ellipse(95, 86, 1.2, 1.2, PAL.gold);

    // Contact shadows. Each one marks where something sits in front of
    // something else, and together they are what turns a set of flat panels
    // into a figure with depth.
    bezierLine([78, 64.5], [[84, 68.7, 100, 68.7, 106, 64.5]], PAL.indigoDeep, STROKE.seam);
    bezierLine([74, 74], [[80, 80, 86, 84, 88, 92]], PAL.creamShadow, STROKE.fine);
    bezierLine([110, 74], [[104, 80, 98, 84, 96, 92]], PAL.indigoDeep, STROKE.fine);

    chestChain(castExt, fabricTrail, shoulderDrop);
    // Skin is drawn in front of the sleeve with a tapered elbow and wrist.
    const leftHandFrame = {x:48.6 + fabricTrail * 0.5,y:88.8,rot:Math.atan2(-((49 + fabricTrail * 0.5) - (53 + fabricTrail * 0.42)),90 - 85),size:0.75,side:1};
    shapedArm([74, 53], [69, 58, 64, 64, 62 + fabricTrail * 0.15, 70], [58 + fabricTrail * 0.3, 78, 53 + fabricTrail * 0.42, 85, 49 + fabricTrail * 0.5, 90], leftHandFrame);

    armJewelry([74, 53], [69, 58, 64, 64, 62 + fabricTrail * 0.15, 70], 3);
    hemPendant(52 + fabricTrail * 0.45, 142, sway * 0.18, 11);
    hemPendant(132 + fabricTrail * 0.45, 146, sway * 0.18, 12);

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
    finishWrist(1);
    pctx.restore();

    // The right arm, drawn after the sleeve detail so that once it is raised
    // no fold, star or cuff band from the sleeve behind it lands on top.
    pctx.save();
    pctx.translate(0, shoulderDrop);
    const { wrist, elbowX, elbowY, upperC, foreC, hand } = castArm(castExt, fabricTrail);
    const upperSeg = [upperC[0], upperC[1], upperC[2], upperC[3], elbowX, elbowY];
    const foreSeg = [foreC[0], foreC[1], foreC[2], foreC[3], wrist[0] - 1, wrist[1] + 1.2];
    const castArmOutline = shapedArm([106, 54], upperSeg, foreSeg, {...hand, side:1});
    armJewelry([106, 54], upperSeg, 4);

    // One hand the whole way: it hangs relaxed, turns with the arm, and only
    // opens once the arm is well on its way up. Open from the first frame of
    // the raise it read as a splayed hand sprouting near her shoulder.
    const openT = Math.max(0, Math.min(1, (castExt - 0.25) / 0.5));
    const handOpen = openT * openT * (3 - 2 * openT) * 0.8;
    pctx.save();
    pctx.translate(hand.x, hand.y);
    pctx.rotate(hand.rot);
    pctx.scale(hand.size, hand.size);
    // Thumb on the +1 side keeps the palm toward the viewer the whole way:
    // turned out a little while the hand hangs, turned in toward her as it
    // rises. On the other side it began inward and was carried round to the
    // outside by the raise, so the casting hand showed its back.
    drawCastHand(0, 0, 1, handOpen);
    finishWrist(1);
    pctx.restore();

    // Light thrown back onto her by the spell in her hand. The energy is
    // drawn on the main canvas over the sprite, so without this she stayed
    // lit as if nothing were happening six units from her face.
    // How strong it is comes from the pose (magicLight, 0..1), following the
    // charge in her hand, so it grows with the spell instead of switching on
    // at full strength the moment the arm starts to move. Tenths, the same
    // step the sprite cache keys it by.
    const magicLight = Math.round((opts.magicLight || 0) * 10) / 10;
    if (magicLight > 0.01) {
      pctx.save();
      pctx.globalAlpha = magicLight;
      // the light along the forearm stays inside the arm, so it reads as
      // lit skin rather than a sliver poking out past the wrist
      bodyLClip(castArmOutline, () => {
        bezierLine([elbowX, elbowY - 2], [[foreC[0], foreC[1] - 2.5, foreC[2] - 1, foreC[3] - 2, wrist[0] - 1.5, wrist[1] - 0.6]], PAL.magicHi, STROKE.edge);
      });
      bezierLine([100, 41], [[102, 44, 103, 46, 103, 48]], PAL.magic, STROKE.band);
      bezierLine([99, 36], [[101, 37, 102, 39, 102, 41]], PAL.magicHi, STROKE.seam);
      bezierLine([103, 52], [[106, 56, 108, 60, 108, 63]], PAL.magic, STROKE.band);
      bezierLine([98, 62], [[102, 68, 105, 76, 106, 84]], PAL.magic, STROKE.edge);
      if (castExt > 0.5) {
        bezierLine([106, 46], [[108, 48, 109, 50, 109, 52]], PAL.magicHi, STROKE.fine);
      }
      pctx.restore();
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
    const face = {
      expression: EXPRESSIONS[opts.expression] ? opts.expression : 'neutral',
      eye: expr.eye, brow: expr.brow, mouth: expr.mouth, openEye,
      blink: openEye ? (opts.blinkAmount != null ? opts.blinkAmount : (opts.blink ? 1 : 0)) : 0,
      gazeX: openEye ? opts.gazeX || 0 : 0, gazeY: openEye ? opts.gazeY || 0 : 0,
    };
    drawFace(face);

    // Only the small lobes emerge beneath the hair, with hoops through their tips.
    for (const [x, side, slot] of [[83.65, 1, 5], [100.35, -1, 6]]) {
      ellipseF(x, 42.2, 0.72, 0.8, PAL.skin);
      bezierLine([x + side * 0.25, 41.8], [[x + side * 0.4, 42, x + side * 0.4, 42.4, x + side * 0.15, 42.65]], PAL.skinShadow, 0.24);
      ring(x, 43.25, 0.36, 0.65, 0, PAL.gold, 0.25);
      jewelCrystal(x, 44.75, 1.05);
      jewelAnchor(slot, x, 44.75);
    }

    // Side hair: the body's sway plus its own swing, each side on its own lag.
    const sideL = hm.long(0.6) * 0.7, sideR = hm.long(1.0) * 0.7;
    hairMassH([[82, 18], [
      [76, 27, 76, 47, 76.8 + sideL * 0.2, 63],
      [77 + sideL * 0.4, 80, 76 + sideL * 0.7, 95, 73.5 + sway * 0.4 + sideL, 104],
      [82 + sideL * 0.6, 95, 83 + sideL * 0.2, 66, 82, 47],
      [81.2, 33, 83, 24, 84, 18]
    ]], PAL.hairSoftLight, [
      [[79.2, 28], [[76.4, 45, 76.8 + sideL * 0.3, 72, 75.4 + sideL * 0.85, 98], [79.1 + sideL * 0.65, 90, 79.4 + sideL * 0.2, 48, 79.2, 28]], PAL.hairLavender],
      [[80.1, 35], [[77.8, 52, 78.2 + sideL * 0.4, 74, 78.1 + sideL * 0.55, 87], [82.4 + sideL * 0.3, 69, 82, 46, 80.1, 35]], PAL.hairPearlH]
    ]);
    hairMassH([[102, 18], [
      [108, 27, 108, 47, 107.2 + sideR * 0.2, 63],
      [107 + sideR * 0.4, 80, 108 + sideR * 0.7, 94, 110.5 + sway * 0.4 + sideR, 102],
      [102 + sideR * 0.6, 94, 101 + sideR * 0.2, 66, 102, 47],
      [102.8, 33, 101, 24, 100, 18]
    ]], PAL.hairLight, [
      [[103.5, 30], [[100.9, 48, 101.8 + sideR * 0.2, 81, 110.5 + sideR, 102], [105.3 + sideR * 0.7, 84, 104.7 + sideR * 0.2, 45, 103.5, 30]], PAL.hairLavender],
      [[105.5, 32], [[108.4, 49, 108.6 + sideR * 0.4, 74, 107.1 + sideR * 0.6, 87], [104.2 + sideR * 0.3, 67, 104, 45, 105.5, 32]], PAL.hairPearlH]
    ]);
    const sideGlow = Math.round((opts.magicLight || 0) * 10) / 10;
    if (sideGlow > 0.01) {
      pctx.save();
      pctx.globalAlpha = sideGlow;
      bezierLine([82, 18], [[75, 23, 75, 46, 75 + sway * 0.4 + sideL, 68]], PAL.magic, STROKE.hairline);
      bezierLine([102, 18], [[109, 23, 109, 46, 109 + sway * 0.4 + sideR, 68]], PAL.magicHi, STROKE.fine);
      pctx.restore();
    }
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
    // One more lock of the fringe, longer than the rest, falling from the
    // parting between her eyes, the first thing that makes her read as
    // Kanade. It grows out of the fringe mass, leans a little and ends in a
    // round tip level with her lower lashes, drawn with the same shadow and
    // single strand line as the other locks so it belongs to them. It swings
    // a beat behind the head.
    const midSwing = sway * 0.1 + hm.long(0.3) * 0.15;
    const midLock = [[90.1, 27.2], [
      [90.3, 32.0, 91.0, 36.4, 92.15 + midSwing, 39.9],
      [92.55 + midSwing, 40.3, 92.95 + midSwing * 0.7, 39.9, 93.05 + midSwing * 0.6, 39.3],
      [93.5, 35.4, 93.7, 31.2, 93.4, 27.0],
      [92.3, 26.4, 91.1, 26.5, 90.1, 27.2]
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
    // the middle lock throws a narrower shadow, since a long lock with the
    // full width of it reads as a crack; it is laid before the fringe so the
    // fringe covers its root
    pctx.translate(LIGHT.x * 0.4, LIGHT.y * 0.4);
    tracePath(midLock);
    pctx.fill();
    pctx.restore();
    tracePath(fringe);
    pctx.fillStyle = PAL.hairLight;
    pctx.fill();
    tracePath(midLock);
    pctx.fillStyle = PAL.hairLight;
    pctx.fill();
    bezierLine([92.1, 29.0], [[92.2, 32.4, 92.4, 35.4, 92.6 + midSwing * 0.8, 37.6]], PAL.hairMid, STROKE.hairline);

    // Two sidelocks dropping past the jaw, so the fringe does not end in a
    // hard line at the temples.
    bezierShape([78, 18], [[76, 30, 76, 42, 77, 52], [80, 44, 81, 32, 81, 22]], PAL.hairMid);
    bezierShape([106, 18], [[108, 30, 108, 42, 107, 52], [104, 44, 103, 32, 103, 22]], PAL.hairMid);

    // Broad temple shade and a broken crown reflection keep the fringe quiet.
    bodyBaseBezierShape([76.4, 25], [[76.6, 17, 81, 12, 87.5, 10.2], [83, 14, 80.2, 20, 79.4, 25]], PAL.hairLavender);
    bodyBaseBezierShape([107.6, 25], [[107.4, 17, 103, 12, 96.5, 10.2], [101, 13.5, 103.8, 18, 104.6, 24]], PAL.hairSoftLight);
    bezierLine([92, 9.4], [[91.7, 11, 91.4, 12.6, 91.2, 14]], PAL.hairLavender, STROKE.hairline);
    hairCrownRing();
    bezierLine([75, 26], [[76, 14, 83, 9, 92, 9], [101, 9, 108, 14, 109, 26]], PAL.hairBlueShade, STROKE.fine);
    drawAhoge(92, 9.6, sway * 0.25 + hm.ahoge);
    hairSurfaceDetail(false, hm, sway, hTrail);

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
    jewelAnchor(7, 82.3, 22);

    // Orbital ornament on the far side, the piece her key art is built
    // around: thin gold rings crossing at different angles with a lit core,
    // and a chain of crystals hanging off it. Rings rather than another star
    // so the two sides of the head do not mirror each other.
    ring(104, 21, 7, 2.6, -0.5, PAL.goldDark, STROKE.fine);
    ring(104, 21, 6.2, 2.2, 0.75, PAL.gold, STROKE.fine);
    ring(104, 21, 4.4, 4.2, 0, PAL.goldDark, STROKE.hairline);
    sparkle(104, 21, 2.6, PAL.gold);
    jewelCrystal(104, 21, 1);
    jewelAnchor(8, 104, 21);
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
    jewelAnchor(9, 107.5 + dropLag, 44);
    jewelAnchor(10, 103 + dropLag * 0.5, 33);

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
      bezierLine([107, 26], [[109, 38, 108.5, 53, 107.8 + sideR * 0.3, 68]], PAL.hairSoftLight, STROKE.hairline);
      bezierLine([105, 96], [[112, 113, 118, 131, 123, 148]], PAL.bodyRim, STROKE.fine);

      // Loose strands breaking off the side hair, tied to sway so they trail
      // the head.
      // With power in her they are thrown up and out.
      const strandUp = hm.lift * 14;
      bezierLine([77, 34], [[75, 44, 74 - strandUp * 0.1, 54 - strandUp * 0.3, 74 + sway * 0.3 + hm.strand(0.4) - strandUp * 0.15, 63 - strandUp]], PAL.hairLight, STROKE.hairline);
      bezierLine([107, 38], [[109, 48, 110 + strandUp * 0.1, 58 - strandUp * 0.3, 110 + sway * 0.3 + hm.strand(1.2) + strandUp * 0.15, 67 - strandUp]], PAL.hairLight, STROKE.hairline);

    }

    pctx.restore();
  }
  function drawKanadeBack(t, opts) {
    opts = opts || {};
    const _key = spriteKey('b', t, opts);
    if (_key === _spriteKey) return;
    _spriteKey = _key;
    jewelMask = 0;
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
    const hm = computeHairMotion(t, opts);
    const hairTrail = trail + wave(1.1, 1.2) - walkStep * 1.2 + hm.long(1.1);

    pctx.clearRect(0, 0, GRID_W, GRID_H);
    pctx.save();
    pctx.translate(lean, bob);

    // Seen from behind everything is mirrored against the front view: her
    // right arm, her star pin and her crystal drop all sit on the viewer's
    // right here. Light still comes from the viewer's left, so the left half
    // of each piece carries the lit tone and the right half the shaded one.

    // Heels lift with the existing step while the calf remains continuous.
    for (const [bx, step] of [[84.5, Math.max(0, walkStep)], [97.5, Math.max(0, -walkStep)]]) {
      const ly = -step * 5;
      const lx = (bx < 91 ? -1 : 1) * step * Math.abs(backFoot) * 0.2;
      lowerBoot(bx + lx, 144 + ly, 175 + ly, true);
    }

    // The back hem rolls into broad folds beneath the long hair.
    const backCoat = [[77, 64], [
      [70, 80, 62 + fabricTrail * 0.1, 104, 58 + fabricTrail * 0.25, 124],
      [55 + fabricTrail * 0.35, 134, 53 + fabricTrail * 0.4, 141, 52 + fabricTrail * 0.45, 146],
      [60 + fabricTrail * 0.35, 151, 66 + fabricTrail * 0.2, 146.5, 74, 150],
      [81, 153, 86, 150, 91, 151.5],
      [98, 154, 104, 149, 111, 150],
      [119 + fabricTrail * 0.2, 151.5, 124 + fabricTrail * 0.35, 150, 130 + fabricTrail * 0.45, 146],
      [129 + fabricTrail * 0.4, 141, 127 + fabricTrail * 0.35, 134, 124 + fabricTrail * 0.25, 124],
      [120 + fabricTrail * 0.1, 104, 112, 80, 105, 64]
    ]];
    lowerCloth(backCoat, PAL.creamMid, [
      [[74, 87], [[68, 109, 67, 132, 60, 148], [67, 145, 72, 111, 74, 87]], PAL.bodyCWhiteContact],
      [[81, 100], [[77, 119, 79, 137, 74, 150], [83, 145, 84, 121, 81, 100]], PAL.bodyCCreamFold],
      [[105, 86], [[111, 109, 111, 135, 119, 150], [119, 132, 110, 108, 105, 86]], PAL.cream],
      [[98, 108], [[99, 128, 96, 140, 98, 152], [103, 144, 102, 124, 98, 108]], PAL.bodyCCreamFold]
    ]);
    bezierLine([52 + fabricTrail * 0.45, 146], backCoat[1].slice(2, 6), PAL.bodyCWhiteDeep, 1.4);
    bezierLine([52 + fabricTrail * 0.45, 146], backCoat[1].slice(2, 6), PAL.gold, STROKE.fine);
    bodyLClip(backCoat, () => clothTrim([52 + fabricTrail * 0.45, 146], backCoat[1].slice(2, 6), -1.9, false));
    for (const side of [-1, 1]) {
      pctx.save();
      if (side > 0) { pctx.translate(182, 68); pctx.scale(-1, 0.94); pctx.translate(0, -68); }
      const f = side > 0 ? -fabricTrail : fabricTrail;
      const lining = [[80, 68], [
        [72, 74, 62 + f * 0.3, 90, 52 + f * 0.6, 106],
        [46 + f * 0.8, 115, 41 + f * 0.9, 123, 38 + f, 130],
        [44 + f * 0.8, 134, 51 + f * 0.6, 133, 57 + f * 0.45, 134],
        [66 + f * 0.2, 131, 77, 105, 82, 84]
      ]];
      lowerCloth(lining, PAL.creamMid, [
        [[72, 85], [[65, 104, 51 + f * 0.7, 123, 44 + f * 0.8, 131], [56 + f * 0.5, 127, 69, 104, 72, 85]], side > 0 ? PAL.bodyCCreamFold : PAL.bodyCWhiteContact]
      ]);
      bezierShape([56 + f * 0.45, 99], [[48 + f * 0.6, 109, 48 + f * 0.7, 116, 55 + f * 0.45, 122], [60, 126, 63, 130, 57 + f * 0.45, 134], [64, 131, 64, 124, 57, 119], [51, 114, 52, 107, 56 + f * 0.45, 99]], PAL.indigo);
      bezierLine([56 + f * 0.45, 99], [[48 + f * 0.6, 109, 48 + f * 0.7, 116, 55 + f * 0.45, 122], [60, 126, 63, 130, 57 + f * 0.45, 134]], PAL.gold, STROKE.fine);
      bodyLClip(lining, () => {
        clothTrim([38 + f, 130], lining[1].slice(2, 3), -1.7, false);
        liningStars(53.8 + f * 0.55, 113, 1);
      });
      bezierLine([38 + f, 130], lining[1].slice(2, 3), PAL.goldDark, STROKE.fine);
      sparkle(46 + f * 0.8, 131.5, 1.4, PAL.gold);
      pctx.restore();
    }
    // Small shoulder tips remain visible beside the broad loose hair.
    const backShoulders = smoothOutline([[71, 58], [77, 53], [85, 51], [98, 51], [105, 53], [111, 58], [109, 63], [101, 67], [81, 67], [73, 63]], 0.6);
    bodyLMaterial(backShoulders, PAL.skin, PAL.bodyLSkinShade, PAL.skinSoftLight, 1, 0.5);
    fittedCloth(smoothOutline([[75, 61], [91, 63], [107, 61], [108, 70], [101, 86], [82, 86], [74, 70]], 0.55), PAL.indigo, [
      [[77, 65], [[78, 74, 83, 80, 83, 86], [79, 82, 75, 72, 77, 65]], PAL.bodyCNavyFold],
      [[105, 65], [[104, 75, 100, 81, 100, 86], [106, 80, 108, 72, 105, 65]], PAL.bodyCNavyContact]
    ]);
    lowerSleeve(-1, fabricTrail, 0, true);
    lowerSleeve(1, fabricTrail, 0, true);

    hemPendant(52 + fabricTrail * 0.45, 146, wave(0.7, 0.18), 11);
    hemPendant(130 + fabricTrail * 0.45, 146, wave(1.1, 0.18), 12);
    bezierLine([77, 83], [[86, 88, 98, 89, 107, 84]], PAL.gold, STROKE.fine);
    beltDiamonds([77, 83], [86, 88, 98, 89, 107, 84]);
    bezierLine([105, 83.5], [[106, 81, 110, 82, 107, 84], [110, 85, 108, 87, 106, 85]], PAL.goldDark, STROKE.hairline);
    lapisStone(107, 84, 1, 0.9);

    // Opaque arm envelopes connect each bare shoulder to its existing wrist.
    // The left wrist hangs lower while both forearms follow the pose rig.
    const lElbow = [63 + fabricTrail * 0.15, 74.5 + armSwing * 0.5];
    const lWrist = [54 + fabricTrail * 0.45, 89.5 + armSwing];
    const rElbow = [120 + fabricTrail * 0.15, 71 - armSwing * 0.5];
    const rWrist = [133 + fabricTrail * 0.4, 89 - armSwing];
    const lUpper = [[68.5, 62, 66, 67, lElbow[0], lElbow[1]]];
    const lFore = [[60, lElbow[1] + 6, 57, lWrist[1] - 4, lWrist[0], lWrist[1]]];
    const rUpper = [[114, 62, 117.5, 66, rElbow[0], rElbow[1]]];
    const rFore = [[124, rElbow[1] + 7, 129, rWrist[1] - 5, rWrist[0], rWrist[1]]];
    shapedArm([71, 58], lUpper[0], lFore[0], {x:lWrist[0],y:lWrist[1]-0.6,rot:Math.atan2(-(lWrist[0]-lFore[0][2]),lWrist[1]-lFore[0][3]),size:0.75,side:1});
    shapedArm([111, 58], rUpper[0], rFore[0], {x:rWrist[0],y:rWrist[1]-0.6,rot:Math.atan2(-(rWrist[0]-rFore[0][2]),rWrist[1]-rFore[0][3]),size:0.75,side:-1});
    armJewelry([71, 58], lUpper[0], 3);
    armJewelry([111, 58], rUpper[0], 4);
    // The same hand as the front view, relaxed, turned along each forearm
    // with the thumb toward her body.
    for (const [wr, fore, sd] of [[lWrist, lFore[0], 1], [rWrist, rFore[0], -1]]) {
      pctx.save();
      pctx.translate(wr[0], wr[1] - 0.6);
      pctx.rotate(Math.atan2(-(wr[0] - fore[2]), wr[1] - fore[3]));
      pctx.scale(0.75, 0.75);
      drawCastHand(0, 0, sd, 0);
      finishWrist(sd);
      pctx.restore();
    }

    // Hair. The two sides of its outline are shared by the fill, the clip
    // that keeps the locks inside it and the edge line drawn round it, so
    // the three cannot drift apart. It rounds over the skull, then falls
    // outward below the ears, matching the mirrored front hair envelope
    // while covering the middle of her back.
    const hairR = [
      [103, 11, 108.5, 18, 110, 30],
      [111, 35, 112.5, 40, 113.25, 45],
      [114, 50, 114.3, 55, 114.625, 60],
      [114.9, 65, 115, 70, 115.25, 75],
      [115.5, 80, 115.8, 85, 116, 90],
      [116.3, 97, 117.2, 103, 117.75, 110],
      [118.4, 117, 120, 123, 120.625, 130]
    ];
    const hairL = [
      [79, 11, 72, 18, 69.625, 30],
      [68.4, 35, 67, 40, 66.375, 45],
      [65.7, 50, 64.9, 55, 64.5, 60],
      [64.1, 65, 63.7, 70, 63.375, 75],
      [63.1, 80, 62.7, 85, 62.375, 90],
      [62, 97, 61.7, 103, 61.625, 110],
      [61.6, 117, 61.8, 123, 62.25, 130]
    ];
    // The loose envelope mirrors the front hair and opens below the round skull.
    const drift = (x, y) => x + hairTrail * Math.max(0, (y - 30) / 150);
    for (const side of [hairL, hairR]) for (const seg of side) {
      for (let i = 0; i < 6; i += 2) seg[i] = drift(seg[i], seg[i + 1]);
    }
    const hairLUp = hairL.map((seg, i) => [seg[2], seg[3], seg[0], seg[1], ...(i ? hairL[i - 1].slice(4) : [91, 11])]).reverse();
    const ends = [
      [121, 136, 119, 142, 117.5, 145.5],
      [114, 143, 114, 136, 111, 134],
      [109, 140, 108, 145, 106, 147.5],
      [102, 145, 101, 137, 99, 134],
      [96, 140, 94, 144, 92, 146],
      [88, 143, 87, 138, 86, 134],
      [83, 141, 81, 146, 78, 148.9],
      [75, 145, 75, 138, 73, 134],
      [70, 137, 69, 141, 65, 145],
      [64, 141, 62, 136, 62.25, 130]
    ].map(seg => seg.map((v, i) => i % 2 ? v : drift(v, seg[i + 1])));
    const backHair = [[91, 11], hairR.concat(ends, hairLUp)];
    tracePath(backHair);
    for (let slot = 1; slot <= 4; slot++) {
      if (pctx.isPointInPath(jewelPoints[slot * 2] * RES_MULT, jewelPoints[slot * 2 + 1] * RES_MULT)) jewelMask &= ~(1 << slot);
    }
    bodyBaseBezierShape(backHair[0], backHair[1], PAL.hairLight);
    const tipX = (x, k) => x + hairTrail * k;
    const massSwing = [
      wave(0.1, 0.6) - walkStep * 0.5 + hm.osc(0.3) * 0.5,
      wave(0.9, 0.35) + hm.osc(0.9) * 0.35,
      wave(1.7, 0.6) + walkStep * 0.5 + hm.osc(1.6) * 0.5
    ];
    // Three broad flowing planes share one opaque silhouette and staggered tips.
    bodyLClip(backHair, () => {
      const l = hairTrail * 0.65 + massSwing[0], m = hairTrail * 0.65 + massSwing[1], r = hairTrail * 0.65 + massSwing[2];
      bodyBaseBezierShape([85, 12], [
        [74, 23, 71, 42, 70, 63], [68 + l * 0.3, 92, 65 + l, 122, 64 + l, 147],
        [75 + l, 147, 80 + l, 126, 80 + l * 0.6, 103], [80, 65, 79, 28, 85, 12]
      ], PAL.hairLavender);
      bodyBaseBezierShape([83, 17], [
        [74, 43, 77, 72, 75 + l * 0.4, 97], [73 + l * 0.7, 121, 70 + l, 136, 65 + l, 145],
        [70 + l, 132, 71 + l * 0.7, 105, 72, 81], [72, 49, 74, 29, 83, 17]
      ], PAL.hairSoftLight);
      bodyBaseBezierShape([91, 11], [
        [86, 38, 90, 61, 87 + m * 0.2, 87], [85 + m * 0.4, 111, 83 + m, 137, 78 + m, 149],
        [88 + m, 139, 96 + m * 0.6, 110, 96, 84], [97, 52, 94, 26, 91, 11]
      ], PAL.hairPearlH);
      bodyBaseBezierShape([98, 13], [
        [108, 31, 107, 58, 109 + r * 0.2, 84], [112 + r * 0.4, 111, 115 + r, 133, 118 + r, 146],
        [109 + r, 146, 103 + r * 0.6, 122, 102, 100], [101, 63, 104, 31, 98, 13]
      ], PAL.hairLavender);
      bodyBaseBezierShape([103, 24], [
        [112, 47, 109, 75, 112 + r * 0.3, 99], [114 + r * 0.5, 122, 118 + r, 135, 118 + r, 146],
        [122 + r, 130, 118 + r * 0.5, 100, 116, 76], [115, 49, 111, 33, 103, 24]
      ], PAL.hairBlueShade);
      bodyBaseBezierShape([98, 21], [
        [102, 49, 99, 79, 101 + r * 0.2, 101], [102 + r * 0.5, 124, 105 + r, 139, 106 + r, 147],
        [106 + r, 128, 105 + r * 0.5, 100, 104, 77], [104, 51, 104, 31, 98, 21]
      ], PAL.hairSoftLight);
      pctx.save(); pctx.translate(-1, 3); hairCrownRing(); pctx.restore();
    });
    bezierLine([91, 11], hairR, PAL.hairBlueShade, STROKE.hairline);
    bezierLine([91, 11], hairL, PAL.hairLavender, STROKE.hairline);
    drawAhoge(90.6, 11.6, wave(0.8, 0.4) + hm.ahoge);
    hairSurfaceDetail(true, hm, 0, hairTrail);

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
    jewelCrystal(78, 21, 1);
    jewelAnchor(8, 78, 21);
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
    jewelAnchor(9, 0, 3);
    pctx.restore();
    crystal(79 + dropLag * 0.5, 33, 2, PAL.eyeDeep, PAL.eyeBlue);
    jewelAnchor(10, 79 + dropLag * 0.5, 33);
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
    jewelAnchor(7, 103.5, 22);

    // Top graphics tier only, the same split the front view makes: the
    // figure above stands on its own and this is polish on it.
    if (gfxLevel() === 0) {
      // Rim light down the far side, from the gate, as on the front view.
      bezierLine([98, 13.2], [[103, 14.5, 106.6, 19, 107, 29]], PAL.hairHi, STROKE.fine);

      // Two loose strands breaking off the ends of the locks, trailing
      // further than the locks do.
      bezierLine([tipX(78, 0.5), 123], [[tipX(76, 0.6), 130, tipX(76, 0.65), 136, tipX(77, 0.7), 140]], PAL.hairLavender, STROKE.hairline);
      bezierLine([tipX(105, 0.5), 125], [[tipX(107, 0.6), 131, tipX(107, 0.65), 137, tipX(104, 0.7), 142]], PAL.hairLavender, STROKE.hairline);

      // Flyaways: single hairs lifting off the outline, lighter than any
      // lock, so they flutter at twice the rate.
      const fa = quiver(0.4, 0.9), fb = quiver(1.9, 0.9);
      bezierLine([74, 30], [[72, 35, 71.5 + fa * 0.4, 40, 71.8 + fa * 0.6, 46]], PAL.hairLight, STROKE.hairline);
      bezierLine([108.5, 31], [[110, 36, 110.5 + fb * 0.4, 42, 110.2 + fb * 0.6, 48]], PAL.hairMid, STROKE.hairline);

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

  let jewelryFlareCanvas = null;
  function jewelryFlare() {
    if (jewelryFlareCanvas) return jewelryFlareCanvas;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), glow = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, 'rgba(255,242,197,0.7)');
    glow.addColorStop(0.3, 'rgba(255,231,160,0.18)');
    glow.addColorStop(1, 'rgba(255,231,160,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 64, 64);
    g.fillStyle = PAL.goldHi; g.beginPath();
    g.moveTo(32, 6); g.quadraticCurveTo(34, 29, 53, 32);
    g.quadraticCurveTo(34, 35, 32, 58); g.quadraticCurveTo(30, 35, 11, 32);
    g.quadraticCurveTo(30, 29, 32, 6); g.fill();
    jewelryFlareCanvas = c; return c;
  }
  // This clock excludes pause jumps and holds its phase during impact.
  function jewelryTime(elapsed) {
    return elapsed - Math.max(0, Math.min(HOLD_MS, elapsed - APPLY_AT));
  }
  function drawJewelryGlints(L, x, y, scale, alpha, time) {
    const tier = window._gfxLevel || 0;
    if (tier >= 3 || window._mobPerf || alpha <= 0.01 || scale <= 0.01 || !jewelMask) return;
    const w = Math.round(L.box * scale), u = w / GRID_W;
    const ox = Math.round(x - w / 2), oy = Math.round(y - w / 2), flare = jewelryFlare();
    let visible = 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < 16; i++) {
      if (!(jewelMask & (1 << i))) continue;
      if (tier === 2 && visible++ % 2) continue;
      const lapis = i >= 14, cycle = 3100 + i * 137, duration = lapis ? 200 : 280 + (i % 3) * 40;
      const phase = ((time + i * 367) % cycle + cycle) % cycle;
      if (phase >= duration) continue;
      const pulse = Math.sin(Math.PI * phase / duration) ** 2;
      if (pulse < 0.01) continue;
      const size = (lapis ? 4.4 : 6.5) * u * (0.7 + pulse * 0.3);
      ctx.globalAlpha = Math.min(1, alpha) * pulse * (lapis ? 0.42 : 0.9);
      ctx.drawImage(flare, ox + jewelPoints[i * 2] * u - size / 2, oy + jewelPoints[i * 2 + 1] * u - size / 2, size, size);
    }
    ctx.restore();
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

  // The world picture fades into the rim instead of ending on a hard edge.
  let _gateWorldRimGrad = null;
  function _gateWorldRim() {
    if (!_gateWorldRimGrad) {
      _gateWorldRimGrad = ctx.createRadialGradient(0, 0, 70, 0, 0, 150);
      _gateWorldRimGrad.addColorStop(0, 'rgba(10,6,24,0)');
      _gateWorldRimGrad.addColorStop(0.7, 'rgba(18,10,40,0.35)');
      _gateWorldRimGrad.addColorStop(1, 'rgba(24,14,52,0.9)');
    }
    return _gateWorldRimGrad;
  }
  let _gateCoreGrad = null;
  function _gateCore() {
    if (!_gateCoreGrad) {
      _gateCoreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
      _gateCoreGrad.addColorStop(0, 'rgba(242,231,255,1)');
      _gateCoreGrad.addColorStop(0.35, 'rgba(154,116,230,0.6)');
      _gateCoreGrad.addColorStop(1, 'rgba(22,14,50,0)');
    }
    return _gateCoreGrad;
  }

  // spin is the gate's own clock for everything that turns, in ms: it only
  // runs while the gate is fully open (see gateSpin), so opening and closing
  // are a pure sideways stretch with nothing inside turning.
  function drawGate(x, y, radius, openness, alpha, now, spin) {
    if (openness <= 0 || alpha <= 0) return;
    if (spin == null) spin = now;
    const R = 154;
    const k = radius / R;
    const squash = Math.max(0.025, openness);
    const lineComp = 1 / Math.max(0.2, squash);
    const pulse = 0.82 + Math.sin(now * 0.006) * 0.18;
    // How far the gate's drawing has unfolded: rims draw on from the top and
    // meet at the bottom, and the finer rings and runes come in with it.
    const unfold = smootherstep(clamp01(openness / 0.85));
    const top = -Math.PI / 2, sweepOn = Math.PI * unfold;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(squash * k, k);
    ctx.fillStyle = _gateInterior();
    ctx.beginPath();
    ctx.arc(0, 0, R - 4, 0, Math.PI * 2);
    ctx.fill();

    // Through the gate, the digital world she comes from: the picture turning
    // slowly and breathing in and out, a smaller copy turning the other way on
    // top for depth, and cubes streaming out of the vanishing point toward
    // the viewer. Everything is clipped to the gate's opening.
    const gTier = freezeTier();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R - 6, 0, Math.PI * 2);
    ctx.clip();
    if (_gateWorldImg.complete && _gateWorldImg.naturalWidth) {
      ctx.save();
      ctx.rotate(spin * 0.00007);
      const side = (R - 6) * 2 * (1.08 + 0.05 * Math.sin(now * 0.0011));
      ctx.globalAlpha = alpha * 0.92;
      ctx.drawImage(_gateWorldImg, -side / 2, -side / 2, side, side);
      if (gTier === 0) {
        ctx.rotate(-spin * 0.00022);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.2;
        const s2 = side * 0.55;
        ctx.drawImage(_gateWorldImg, -s2 / 2, -s2 / 2, s2, s2);
      }
      ctx.restore();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = _gateWorldRim();
      ctx.fillRect(-R, -R, R * 2, R * 2);
    }
    // Cubes, two depth bands, each one black fill and one red edge pass.
    const cubes = gTier === 0 ? 34 : gTier === 1 ? 20 : gTier === 2 ? 10 : 0;
    for (let band = 0; band < 2 && cubes; band++) {
      ctx.beginPath();
      for (let i = 0; i < cubes; i++) {
        const ph = (now * 0.00032 + i * 0.618034) % 1;
        if ((ph >= 0.5 ? 1 : 0) !== band) continue;
        const e = ph * ph, a = i * 2.39996 + spin * 0.0002;
        const r = 8 + e * (R - 22), sz = 1.5 + 13 * e;
        ctx.rect(Math.cos(a) * r - sz / 2, Math.sin(a) * r - sz / 2, sz, sz);
      }
      ctx.globalAlpha = alpha * (band ? 0.95 : 0.55);
      ctx.fillStyle = '#07050b';
      ctx.fill();
      ctx.strokeStyle = band ? 'rgb(255,58,92)' : 'rgb(190,40,90)';
      ctx.lineWidth = (band ? 1.4 : 0.9) * lineComp;
      ctx.stroke();
    }
    ctx.restore();

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
    ctx.arc(0, 0, R, top - sweepOn, top + sweepOn);
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(178,137,255,0.82)';
    ctx.lineWidth = 2 * lineComp;
    ctx.beginPath();
    ctx.arc(0, 0, R - 12, top + sweepOn, top - sweepOn, true);
    ctx.stroke();

    // Segmented rings turning against each other outside and inside the
    // rim, the inner one in the world's red, and a bright sweep chasing
    // round the rim with a fading tail.
    ctx.save();
    ctx.rotate(-spin * 0.0005);
    ctx.strokeStyle = 'rgba(220,198,255,0.8)';
    ctx.lineWidth = 2.2 * lineComp;
    ctx.beginPath();
    for (let i = 0; i < Math.ceil(16 * unfold); i++) {
      const a = i * Math.PI / 8;
      ctx.moveTo(Math.cos(a) * (R + 8), Math.sin(a) * (R + 8));
      ctx.arc(0, 0, R + 8, a, a + 0.24);
    }
    ctx.stroke();
    ctx.rotate(spin * 0.0013);
    ctx.strokeStyle = 'rgba(255,70,110,0.65)';
    ctx.lineWidth = 1.5 * lineComp;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      ctx.moveTo(Math.cos(a) * (R - 24), Math.sin(a) * (R - 24));
      ctx.arc(0, 0, R - 24, a, a + 0.55);
    }
    ctx.stroke();
    ctx.restore();
    const sweep = spin * 0.0024;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3 * lineComp;
    ctx.beginPath();
    ctx.arc(0, 0, R, sweep - 0.7, sweep - 0.15);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3.6 * lineComp;
    ctx.beginPath();
    ctx.arc(0, 0, R, sweep - 0.15, sweep + 0.18);
    ctx.stroke();

    // Finer layers, each one path, faded in as the gate unfolds: graduation
    // ticks inside the rim, a band of runes outside it, circuit traces with
    // lit nodes running from the centre to the rim, and a dashed data ring
    // whose dashes run round it.
    ctx.shadowBlur = 0;
    const gT = freezeTier();
    ctx.save();
    ctx.globalAlpha = alpha * 0.55 * unfold;
    ctx.strokeStyle = 'rgb(214,196,255)';
    ctx.lineWidth = 1 * lineComp;
    ctx.beginPath();
    for (let i = 0; i < 72; i++) {
      const a = i * Math.PI / 36, r1 = R - 4, r0 = R - (i % 6 === 0 ? 11 : 7);
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    }
    ctx.stroke();
    if (gT <= 2) {
      ctx.rotate(spin * 0.00035);
      ctx.globalAlpha = alpha * 0.7 * unfold;
      ctx.strokeStyle = 'rgb(230,214,255)';
      ctx.lineWidth = 1.3 * lineComp;
      ctx.beginPath();
      const g0 = R + 18, g1 = R + 28, gm = (g0 + g1) / 2;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const tx = -sa * 2.6, ty = ca * 2.6, kind = Math.floor(hash(i, 3.3) * 4);
        if (kind === 0) { ctx.moveTo(ca * g0, sa * g0); ctx.lineTo(ca * g1, sa * g1); }
        else if (kind === 1) { ctx.moveTo(ca * g0 - tx, sa * g0 - ty); ctx.lineTo(ca * g1, sa * g1); ctx.lineTo(ca * g0 + tx, sa * g0 + ty); }
        else if (kind === 2) { ctx.moveTo(ca * gm - tx, sa * gm - ty); ctx.lineTo(ca * gm + tx, sa * gm + ty); ctx.moveTo(ca * g0, sa * g0); ctx.lineTo(ca * gm, sa * gm); }
        else { ctx.moveTo(ca * g0 + tx * 0.5, sa * g0 + ty * 0.5); ctx.lineTo(ca * g1 + tx * 0.5, sa * g1 + ty * 0.5); ctx.moveTo(ca * g1 - tx * 0.5, sa * g1 - ty * 0.5); ctx.lineTo(ca * gm - tx * 0.5, sa * gm - ty * 0.5); }
      }
      ctx.stroke();
      ctx.rotate(-spin * 0.00035 - spin * 0.0003);
      ctx.globalAlpha = alpha * 0.6 * unfold;
      ctx.strokeStyle = 'rgb(255,70,105)';
      ctx.lineWidth = 1.1 * lineComp;
      ctx.beginPath();
      const nodes = [];
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + 0.13, step = (hash(i, 5.1) - 0.5) * 0.3;
        const r0 = 58, r1 = 80 + hash(i, 2.2) * 24, r2 = R - 30;
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.arc(0, 0, r1, a, a + step, step < 0);
        ctx.lineTo(Math.cos(a + step) * r2, Math.sin(a + step) * r2);
        nodes.push([Math.cos(a + step) * r2, Math.sin(a + step) * r2], [Math.cos(a) * r1, Math.sin(a) * r1]);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgb(255,150,170)';
      ctx.beginPath();
      for (const nd of nodes) { ctx.moveTo(nd[0] + 2.2, nd[1]); ctx.arc(nd[0], nd[1], 2.2, 0, Math.PI * 2); }
      ctx.fill();
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -spin * 0.03;
      ctx.globalAlpha = alpha * 0.5 * unfold;
      ctx.strokeStyle = 'rgb(186,150,255)';
      ctx.lineWidth = 1.4 * lineComp;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // While it tears open or shuts, bright horizontal slices flicker across
    // the opening like a digital tear, a new set every 60ms.
    if (openness < 0.98 && gT <= 2) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R - 6, 0, Math.PI * 2);
      ctx.clip();
      const bucket = Math.floor(now / 60);
      ctx.globalAlpha = alpha * 0.7 * (1 - openness);
      for (let i = 0; i < 6; i++) {
        const yy = (hash(i, bucket) - 0.5) * 2 * (R - 20), hgt = 1.5 + hash(bucket, i + 9) * 3.5;
        ctx.fillStyle = i % 3 ? 'rgb(236,222,255)' : 'rgb(255,70,105)';
        ctx.fillRect(-R, yy, R * 2, hgt);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.rotate(spin * 0.0006);
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
    ctx.rotate(-spin * 0.0011);
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
    ctx.rotate(spin * 0.0009);
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

    // The core, one cached gradient pulsing through its alpha.
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * (0.3 + pulse * 0.12);
    ctx.fillStyle = _gateCore();
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
  const PALM = [0, 3.1];
  function handPos(L, pose, t) {
    if (!pose || !pose.opts) return null;
    const castExt = pose.opts.castExt || 0;
    if (castExt <= 0.02) return null;
    // The arm drawKanade draws, with the same fabric trail, then the lean/bob
    // it translates the whole body by and the shoulder drop the arm sits in.
    const lean = pose.opts.lean || 0;
    const bobAmp = pose.opts.bobAmp != null ? pose.opts.bobAmp : 1;
    const bob = Math.sin(t * Math.PI * 2) * bobAmp;
    const u = (L.box * pose.scale) / GRID_W;
    const fabricTrail = (pose.opts.trail || 0) * 0.75 + (pose.opts.whip || 0);
    const h = castArm(castExt, fabricTrail).hand;
    const drop = 1.5 * (1 - castExt);
    // The middle of the palm in the hand's own frame, carried through its
    // turn and size, so the spell sits in the hand rather than at the wrist.
    const px = PALM[0] * h.size, py = PALM[1] * h.size;
    const cos = Math.cos(h.rot), sin = Math.sin(h.rot);
    return {
      x: pose.x + (h.x + px * cos - py * sin + lean - GRID_W / 2) * u,
      y: pose.y + (h.y + px * sin + py * cos + drop + bob - GRID_H / 2) * u,
      u,
    };
  }

  // Energy gathering in her raised hand across the summon and cast beats.
  // Everything is positioned from `now` alone rather than from stored particle
  // state, so there is no array to grow, no objects allocated per frame and
  // nothing for the collector to sweep up mid-sequence.
  function drawCastEnergy(L, pose, t, now, charge, extras) {
    if (charge <= 0.02) return;
    shielded(k => drawCastEnergyRaw(L, k === 1 ? pose : Object.assign({}, pose, { alpha: pose.alpha * k }), t, now, charge, extras == null ? 1 : extras));
  }
  function drawCastEnergyRaw(L, pose, t, now, charge, extras) {
    const hand = handPos(L, pose, t);
    if (!hand) return;
    const hx = hand.x, hy = hand.y, u = hand.u;

    const pulse = 0.85 + 0.15 * Math.sin(now * 0.012);
    // The impact blows the core up to nearly twice its size for a moment.
    const core = u * (3.4 + 5.2 * charge) * pulse * (1 + 0.9 * (pose.impact || 0));
    const glow = energyGlow();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, pose.alpha) * (0.30 + 0.45 * charge);

    // A wide, dim pool of the spell's light on everything around her hand.
    const pool = u * 70 * (0.7 + 0.3 * charge);
    ctx.globalAlpha = Math.min(1, pose.alpha) * 0.16 * charge;
    ctx.drawImage(glow, hx - pool, hy - pool, pool * 2, pool * 2);
    ctx.globalAlpha = Math.min(1, pose.alpha) * (0.30 + 0.45 * charge);

    // Wide halo, then the bright core, both the same sprite at two sizes.
    const halo = core * 3.1;
    ctx.drawImage(glow, hx - halo, hy - halo, halo * 2, halo * 2);
    ctx.globalAlpha = Math.min(1, pose.alpha) * (0.55 + 0.45 * charge);
    ctx.drawImage(glow, hx - core, hy - core, core * 2, core * 2);

    // Motes spiralling inward. Position comes straight out of `now` and the
    // index, so this loop touches no state at all.
    const motes = Math.round(((lowDetail() ? 8 : 16) + Math.round((lowDetail() ? 6 : 14) * (pose.gather || 0))) * extras);
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

    // The rest of the circle, brighter as the spell charges. A trail behind
    // each orbiting mote, a band of runes turning against the ring, an
    // eight-pointed star in the middle and dashes outside, each drawn as one
    // path.
    const tier = freezeTier();
    const e = Math.min(1.4, energy);
    ctx.strokeStyle = 'hsla(320, 90%, 78%, ' + (0.25 + e * 0.25) + ')';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = ringRot * 1.6 + (i / 8) * Math.PI * 2;
      ctx.moveTo(Math.cos(a - 0.34) * (R + 26), Math.sin(a - 0.34) * (R + 26));
      ctx.arc(0, 0, R + 26, a - 0.34, a - 0.04);
    }
    ctx.stroke();
    if (tier <= 2) {
      ctx.save();
      ctx.rotate(-ringRot * 2.6);
      ctx.strokeStyle = 'hsla(285, 80%, 84%, ' + (0.3 + e * 0.35) + ')';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      const r0 = R - 28, r1 = R - 14, rm = (r0 + r1) / 2;
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const kind = Math.floor(hash(i, 7.7) * 4);
        const tx = -sa * 3.2, ty = ca * 3.2;
        if (kind === 0) { ctx.moveTo(ca * r0, sa * r0); ctx.lineTo(ca * r1, sa * r1); }
        else if (kind === 1) { ctx.moveTo(ca * r0 + tx * 0.5, sa * r0 + ty * 0.5); ctx.lineTo(ca * r1 + tx * 0.5, sa * r1 + ty * 0.5); ctx.moveTo(ca * r0 - tx * 0.5, sa * r0 - ty * 0.5); ctx.lineTo(ca * rm - tx * 0.5, sa * rm - ty * 0.5); }
        else if (kind === 2) { ctx.moveTo(ca * rm - tx, sa * rm - ty); ctx.lineTo(ca * rm + tx, sa * rm + ty); ctx.moveTo(ca * rm, sa * rm); ctx.lineTo(ca * r1, sa * r1); }
        else { ctx.moveTo(ca * r0 - tx, sa * r0 - ty); ctx.lineTo(ca * r1, sa * r1); ctx.lineTo(ca * r0 + tx, sa * r0 + ty); }
      }
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.rotate(-ringRot * 1.3);
      ctx.strokeStyle = 'hsla(280, 75%, 80%, ' + (0.14 + e * 0.26) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // An eight-pointed star, one unbroken line through every third point.
      const hr = R - 36;
      for (let v = 0; v <= 8; v++) {
        const a = -Math.PI / 2 + ((v * 3) % 8) * Math.PI / 4;
        if (v === 0) ctx.moveTo(Math.cos(a) * hr, Math.sin(a) * hr); else ctx.lineTo(Math.cos(a) * hr, Math.sin(a) * hr);
      }
      ctx.moveTo(hr * 0.5, 0);
      ctx.arc(0, 0, hr * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.rotate(-ringRot * 0.8);
      ctx.strokeStyle = 'hsla(270, 70%, 76%, ' + (0.2 + e * 0.25) + ')';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.moveTo(Math.cos(a) * (R + 40), Math.sin(a) * (R + 40));
        ctx.arc(0, 0, R + 40, a, a + 0.28);
      }
      ctx.stroke();
      ctx.restore();
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

  // fs is how many 60Hz frames this frame stands for, so the petals fall
  // at the same speed at 60, 120 or 144Hz.
  function updateDrawSakura(fs) {
    for (let i = sakuraPetals.length - 1; i >= 0; i--) {
      const p = sakuraPetals[i];
      p.life += fs;
      p.sway += p.swaySpeed * fs;
      p.x += (p.vx + Math.sin(p.sway) * 0.4) * fs;
      p.y += p.vy * fs;
      p.rot += p.rotSpeed * fs;
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
  // coordinates. The sim is frozen, so there is no game deltaTime; each step
  // is scaled by frameScale, worked out from the cutscene's own clock.
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

  function updateDrawParticles(fs) {
    const drag = Math.pow(0.97, fs);
    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.life += fs;
      p.x += p.vx * fs; p.y += p.vy * fs; p.vx *= drag; p.vy *= drag;
      if (p.life >= p.maxLife) { fxParticles.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }

  // Maou haki: the pressure of the stopped world, in violet. Three pieces,
  // all worked out from `now`, elapsed time and a loop index, so none of it
  // allocates, carries state between frames or builds a gradient; the only
  // soft shape is the cached energyGlow sprite.

  // On the edge of the stopped world as it spreads out of one point. The
  // front's circle is stroked three times, pushed outward by three unrelated
  // waves so the edge boils like flame instead of sliding as a clean ring,
  // with short tongues licking out past it. At the start, while the front is
  // still small, the point it opens from bursts with the same violet.
  function drawFrontHaki(L, reach, wash, now) {
    const tier = freezeTier();
    if (tier >= 3 || wash <= 0.01 || reach <= 0.001 || reach >= 0.999) return;
    const cx = L.gateX, cy = L.centerY, r = frontRadius(L, reach);
    const s = Math.min(1, wash / 0.86);
    const unit = Math.min(canvas.width, canvas.height) / 720;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const birth = 1 - clamp01(reach / 0.35);
    if (birth > 0.01) {
      const size = (70 + r * 0.9) * (0.92 + 0.08 * Math.sin(now * 0.02));
      ctx.globalAlpha = s * birth * 0.9;
      ctx.drawImage(energyGlow(), cx - size, cy - size, size * 2, size * 2);
    }
    const layers = tier === 0 ? 3 : (tier === 1 ? 2 : 1);
    const segs = tier === 0 ? 96 : 64;
    const COLORS = ['rgba(222,184,255,1)', 'rgba(164,86,255,1)', 'rgba(112,40,226,1)'];
    for (let k = 0; k < layers; k++) {
      const amp = (10 + k * 9) * unit, off = k * 10 * unit;
      ctx.globalAlpha = s * (0.6 - k * 0.16);
      ctx.strokeStyle = COLORS[k];
      ctx.lineWidth = (k === 0 ? 2.4 : 4 + k * 3) * unit;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const w = Math.sin(a * 7 + now * 0.004 + k) * 0.5
          + Math.sin(a * 13 - now * 0.0063 + k * 2.1) * 0.3
          + Math.sin(a * 23 + now * 0.011 + k * 4.3) * 0.2;
        const rr = r + off + amp * (0.5 + 0.5 * w);
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    // Lightning running along the front, a few arcs at a time.
    if (tier <= 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const arcs = tier === 0 ? 4 : 2;
      for (let i = 0; i < arcs; i++) {
        const bucket = Math.floor(now / (70 + 30 * i));
        if (hash(i, bucket) > 0.7) continue;
        const a = hash(bucket, i + 1) * Math.PI * 2, span = 0.06 + 0.1 * hash(i, bucket + 2);
        const rr = r + 6 * unit;
        drawBolt(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(a + span) * rr, cy + Math.sin(a + span) * rr,
          bucket * 17 + i, 1.4 * unit, s * 0.85);
      }
    }
    // Wisps are stroked in four strength bands, one path each, rather than
    // one stroke call per wisp.
    const wisps = tier === 0 ? 48 : (tier === 1 ? 28 : 0);
    ctx.strokeStyle = 'rgba(196,128,255,1)';
    ctx.lineWidth = 1.8 * unit;
    ctx.lineCap = 'round';
    for (let band = 0; band < 4 && wisps; band++) {
      ctx.globalAlpha = s * 0.65 * (0.3 + band * 0.23);
      ctx.beginPath();
      for (let i = 0; i < wisps; i++) {
        const ph = (now * 0.0011 + i * 0.618034) % 1;
        if (Math.min(3, Math.floor(Math.sin(Math.PI * ph) * 4)) !== band) continue;
        const a = i * 2.39996 + Math.sin(now * 0.0005 + i) * 0.06;
        const base = r + (4 + ph * 22) * unit, len = (12 + 34 * ph) * unit;
        ctx.moveTo(cx + Math.cos(a) * base, cy + Math.sin(a) * base);
        ctx.lineTo(cx + Math.cos(a) * (base + len), cy + Math.sin(a) * (base + len));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Lighting for the whole frame, the way a shot is lit rather than a scene
  // is filled: the stopped world behind her is taken down so she is the
  // brightest thing on screen, a spotlight vignette centred on her (on the
  // gate while it opens) sinks the corners, and a soft backlight and a pool
  // of light at her feet lift her off the backdrop. Every gradient is built
  // once per screen size and position and reused.
  const _spotCache = new Map();
  function spotGradient(cx, cy, inner, outer) {
    const key = canvas.width + 'x' + canvas.height + ':' + Math.round(cx) + ',' + Math.round(cy) + ',' + Math.round(inner);
    let g = _spotCache.get(key);
    if (!g) {
      if (_spotCache.size > 8) _spotCache.clear();
      g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
      g.addColorStop(0, 'rgba(2,1,8,0)');
      g.addColorStop(0.4, 'rgba(2,1,8,0.18)');
      g.addColorStop(1, 'rgba(2,1,8,0.5)');
      _spotCache.set(key, g);
    }
    return g;
  }
  function drawSpotlight(cx, cy, inner, alpha) {
    if (alpha <= 0.01 || freezeTier() >= 3) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = spotGradient(cx, cy, inner, Math.hypot(canvas.width, canvas.height) * 0.62);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  // How much the shot is lit around her: up as she arrives, held while she
  // is on stage, down as she leaves.
  function stageFocus(beatId, p) {
    if (beatId === 'walkOut') return smootherstep(clamp01((p - 0.15) / 0.55));
    if (beatId === 'think' || beatId === 'summon' || beatId === 'cast') return 1;
    if (beatId === 'leave') return 1 - smootherstep(clamp01((p - 0.35) / 0.55));
    return 0;
  }
  // The backlight and the floor pool, drawn behind her.
  function drawStageLight(L, pose, focus, charge) {
    if (focus <= 0.01 || freezeTier() >= 3) return;
    const box = L.box * pose.scale, glow = energyGlow();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = Math.min(1, pose.alpha) * focus;
    const br = box * (0.46 + 0.06 * charge);
    ctx.globalAlpha = a * (0.2 + 0.12 * charge);
    ctx.drawImage(glow, pose.x - br * 0.75, pose.y - box * 0.12 - br, br * 1.5, br * 2);
    const fw = box * 0.62, fh = box * 0.1;
    ctx.globalAlpha = a * (0.32 + 0.2 * charge);
    ctx.drawImage(glow, pose.x - fw, pose.y + box * 0.4 - fh, fw * 2, fh * 2);
    ctx.restore();
  }

  // The shot's shape over time, as weights the frame reads: the ring and
  // its dressing calm down while she thinks, everything thins out while the
  // power is compressed just before the release, goes quiet for the last
  // tenth of a second, bursts, and settles fast so the title can be read.
  // Pure functions of elapsed ms.
  function cinema(elapsed) {
    const e = elapsed, ss = v => smootherstep(clamp01(v));
    const think0 = BEAT_AT.think, think1 = BEAT_AT.summon;
    // Ring dressing (brightness) and its turning speed.
    let deco = 1, spin = 1;
    if (e >= think0 && e < think1 + 200) {
      const k = e < think1 ? ss((e - think0) / 300) : 1 - ss((e - think1) / 200);
      deco = 1 - 0.5 * k; spin = 1 - 0.7 * k;
    }
    const cIn = ss((e - 7700) / 100);                 // compression coming in
    const quiet = ss((e - 8100) / 30) * (e < APPLY_AT ? 1 : 0);
    if (e >= 7700 && e < RELEASE_AT) deco = 1 - 0.65 * cIn;
    const settle = ss((e - 8480) / 100) * (1 - ss((e - 9400) / 400));
    if (e >= 8480) deco = 1 - 0.6 * settle;
    // Secondary sparks, lightning and motes: thinned, then stopped for the
    // quiet, free during the burst, stopped again once it settles.
    let extras = 1;
    if (e >= 7700 && e < APPLY_AT) extras = (1 - 0.6 * cIn) * (1 - quiet);
    if (e >= 8480) extras = 1 - ss((e - 8480) / 120);
    if (e >= 9900) extras = 1;
    // Streams pulled in run faster while the power is compressed, stop for
    // the quiet, and stop again once the burst settles.
    const inflowSpeed = e >= 7700 && e < APPLY_AT ? 1 + 0.6 * cIn : 1;
    let inflow = 1;
    if (e >= 8100 && e < APPLY_AT) inflow = 1 - quiet;
    if (e >= 8480) inflow = extras;
    // The closing haki rings pull in to 85% for the quiet.
    const ringPull = 1 - 0.15 * quiet;
    // Extra darkness behind her while the power is compressed.
    const dark = e >= 7700 && e < RELEASE_AT ? 0.10 * cIn : 0;
    // The palm flare drops to a fifth once the burst has passed.
    const flare = e >= 8480 ? 1 - 0.8 * ss((e - 8480) / 320) * (1 - ss((e - 9400) / 400)) : 1;
    // Camera: push in 7% from 6.60s to 8.10s, hold through the impact
    // hold, pull back out in 100ms.
    let zoom = 1;
    if (e >= 6600 && e < 8100) { const q = (e - 6600) / 1500; zoom = 1 + 0.07 * q * q; }
    else if (e >= 8100 && e < RELEASE_AT) zoom = 1.07;
    else if (e >= RELEASE_AT && e < RELEASE_AT + 100) { const q = (e - RELEASE_AT) / 100; zoom = 1 + 0.07 * (1 - q) * (1 - q); }
    // Shake: 300ms from the end of the hold, dying off as a square.
    let shake = 0;
    if (e >= RELEASE_AT && e < RELEASE_AT + 300) { const q = (e - RELEASE_AT) / 300; shake = (1 - q) * (1 - q); }
    // Her eyes glow over the last half second, flash for two frames at
    // 8.10s, and let go after the release.
    let eyes = 0;
    if (e >= 7700 && e < 8100) eyes = 0.35 * ss((e - 7700) / 400);
    else if (e >= 8100 && e < 8133) eyes = 0.65;
    else if (e >= 8133 && e < RELEASE_AT) eyes = 0.35;
    else if (e >= RELEASE_AT) eyes = 0.35 * (1 - ss((e - RELEASE_AT) / 300));
    // Hair: its swing up to 1.35 times and its ends lifted, at the peak.
    const hairBoost = 1 + 0.35 * ss((e - 7700) / 400) * (1 - ss((e - RELEASE_AT) / 400));
    // The eyes and forehead are kept clear of the release light.
    const shield = e >= RELEASE_AT && e < 9000;
    return { deco, spin, extras, inflow, inflowSpeed, ringPull, dark, flare, zoom, shake, eyes, hairBoost, shield, quiet };
  }

  // Draws a light twice when the face shield is up: at 30% everywhere and at
  // the other 70% everywhere but an oval over her eyes and forehead, so the
  // release never burns out the face. draw(k) draws with its alpha times k.
  let _faceShield = null;
  function shielded(draw) {
    if (!_faceShield) { draw(1); return; }
    const f = _faceShield;
    draw(0.3);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1e4, -1e4, 2e4, 2e4);
    ctx.ellipse(f.x, f.y, f.rx, f.ry, 0, 0, Math.PI * 2);
    ctx.clip('evenodd');
    draw(0.7);
    ctx.restore();
  }

  // Violet light in her eyes as the power peaks (see cinema().eyes): a small
  // glow over each, added on top so the pupils still read through it.
  function drawEyeGlow(L, pose, t, amount) {
    if (amount <= 0.01 || freezeTier() >= 3) return;
    const u = (L.box * pose.scale) / GRID_W;
    const bob = Math.sin(t * Math.PI * 2) * (pose.opts.bobAmp != null ? pose.opts.bobAmp : 1);
    const lean = pose.opts.lean || 0;
    const r = 3.4 * u;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, pose.alpha) * amount;
    for (const ex of [88, 96]) {
      const x = pose.x + (ex + lean - GRID_W / 2) * u, y = pose.y + (38 + bob - GRID_H / 2) * u;
      ctx.drawImage(energyGlow(), x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // A short streak of light behind her hand as it sweeps up (5.96s to
  // 6.61s): the last 100ms of its path, gone 120ms after the arm arrives.
  // The path comes from castExtAt, so nothing is recorded between frames.
  function drawHandTrail(L, pose, t, elapsed) {
    if (freezeTier() >= 2 || pose.back) return;
    const start = BEAT_AT.summon + CAST_T.raise0, end = BEAT_AT.summon + CAST_T.raise1;
    if (elapsed < start || elapsed > end + 120) return;
    const fade = elapsed <= end ? 1 : 1 - (elapsed - end) / 120;
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const e = Math.min(elapsed, end) - k * 10;
      if (e < start) break;
      const ext = castExtAt(e - BEAT_AT.summon);
      const h = handPos(L, Object.assign({}, pose, { opts: Object.assign({}, pose.opts, { castExt: ext }) }), t);
      if (h) pts.push(h);
    }
    if (pts.length < 2) return;
    const unit = canvas.height / 1080;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, a, c] of [[7, 0.15, 'rgb(170,100,255)'], [3, 0.8, 'rgb(236,214,255)']]) {
      ctx.globalAlpha = a * fade;
      ctx.strokeStyle = c;
      ctx.lineWidth = w * unit;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Magic dust thrown off the gate's rim while it tears open or shuts:
  // soft violet puffs drifting out and up, swelling and thinning as they go,
  // and bright motes riding with them. Each piece is worked out from `now`
  // and its index (where on the rim it left, how far it has drifted), so
  // nothing is stored between frames. amount 0..1 comes from gateDust.
  // spread is how wide the gate was when the dust left it: the current
  // opening while it opens, full width while it closes, so dust left behind
  // by a closing gate stays where it was and only fades.
  let _dustPuff = null;
  function dustPuff() {
    if (_dustPuff) return _dustPuff;
    const S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(172,92,255,0.95)');
    grad.addColorStop(0.45, 'rgba(124,44,228,0.52)');
    grad.addColorStop(1, 'rgba(86,20,180,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    _dustPuff = c;
    return c;
  }
  function gateDustSpread(beatId, openness) {
    return beatId === 'gate' || beatId === 'leave' ? openness : 1;
  }
  function gateDust(beatId, p) {
    if (beatId === 'gate') return 1 - smootherstep(clamp01((p - 0.55) / 0.45));
    if (beatId === 'walkOut') return p < 0.62 ? 0 : Math.sin(Math.PI * clamp01((p - 0.62) / 0.38));
    if (beatId === 'leave') return 1 - smootherstep(clamp01(p / 0.4));
    if (beatId === 'close') return Math.sin(Math.PI * Math.min(1, p * 1.15));
    return 0;
  }
  function drawGateDust(L, spread, amount, now) {
    const tier = freezeTier();
    if (amount <= 0.01 || tier >= 3) return;
    const R = L.gateR, cx = L.gateX, cy = L.centerY;
    const squash = Math.max(0.05, spread);
    const puffs = tier === 0 ? 24 : tier === 1 ? 14 : 8;
    const motes = tier === 0 ? 36 : tier === 1 ? 20 : 10;
    const puff = dustPuff();
    ctx.save();
    for (let i = 0; i < puffs; i++) {
      const cyc = now / 1500 + i * 0.618034, ph = cyc % 1, gen = Math.floor(cyc);
      const a = hash(i, gen) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const drift = R * (0.08 + 0.32 * ph);
      const x = cx + ca * R * squash + ca * drift + Math.sin(now * 0.0017 + i) * R * 0.04;
      const y = cy + sa * R + sa * drift * 0.7 - ph * R * 0.22;
      const size = R * (0.16 + 0.3 * ph) * (0.8 + 0.4 * hash(gen, i + 3));
      ctx.globalAlpha = amount * 0.42 * Math.sin(Math.PI * ph);
      ctx.drawImage(puff, x - size, y - size, size * 2, size * 2);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let band = 0; band < 2; band++) {
      ctx.fillStyle = band ? 'rgb(206,150,255)' : 'rgb(150,70,255)';
      ctx.globalAlpha = amount * (band ? 0.9 : 0.5);
      ctx.beginPath();
      for (let i = 0; i < motes; i++) {
        const cyc = now / 1100 + i * 0.381966, ph = cyc % 1, gen = Math.floor(cyc);
        if ((Math.sin(Math.PI * ph) > 0.6 ? 1 : 0) !== band) continue;
        const a = hash(i + 50, gen) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const drift = R * (0.05 + 0.45 * ph);
        const x = cx + ca * R * squash + ca * drift + Math.sin(now * 0.004 + i * 1.7) * R * 0.03;
        const y = cy + sa * R + sa * drift * 0.6 - ph * R * 0.35;
        const sz = Math.max(1, R * 0.012 * (1 - ph * 0.5));
        ctx.rect(x - sz / 2, y - sz / 2, sz, sz);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // Cinematic light. Two cached sprites (a horizontal flare streak and the
  // violet energyGlow) do all of it, so nothing here builds a gradient per
  // frame.

  // An anamorphic lens streak: a long thin horizontal band, bright in the
  // middle and gone at the ends, the flare a wide-screen lens throws off a
  // point of light.
  let _flareStreak = null;
  function flareStreak() {
    if (_flareStreak) return _flareStreak;
    const w = 256, h = 32;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(120,90,255,0)');
    gx.addColorStop(0.35, 'rgba(150,120,255,0.45)');
    gx.addColorStop(0.5, 'rgba(250,240,255,1)');
    gx.addColorStop(0.65, 'rgba(150,120,255,0.45)');
    gx.addColorStop(1, 'rgba(120,90,255,0)');
    g.fillStyle = gx;
    g.fillRect(0, 0, w, h);
    // Fade it top and bottom so it is a soft band, not a bar.
    g.globalCompositeOperation = 'destination-in';
    const gy = g.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,0)');
    gy.addColorStop(0.5, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gy;
    g.fillRect(0, 0, w, h);
    _flareStreak = c;
    return c;
  }
  function drawFlare(x, y, len, alpha) {
    if (alpha <= 0.01 || freezeTier() >= 3) return;
    shielded(k => drawFlareRaw(x, y, len, alpha * k));
  }
  function drawFlareRaw(x, y, len, alpha) {
    const streak = flareStreak(), glow = energyGlow();
    const th = Math.max(3, len * 0.018);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(streak, x - len / 2, y - th * 2, len, th * 4);
    ctx.drawImage(streak, x - len * 0.3, y - th / 2, len * 0.6, th);
    const g = len * 0.05;
    ctx.globalAlpha = Math.min(1, alpha) * 0.8;
    ctx.drawImage(glow, x - g, y - g, g * 2, g * 2);
    ctx.restore();
  }

  // Shafts of light pouring out of one point, turning slowly: soft wedges
  // in violet white at low strength.
  function drawGodRays(x, y, len, alpha, now) {
    const tier = freezeTier();
    if (alpha <= 0.01 || tier >= 2) return;
    const rays = tier === 0 ? 11 : 7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(214,190,255,1)';
    // Each ray pulses on its own; they are filled in three strength bands,
    // one path each.
    for (let band = 0; band < 3; band++) {
      ctx.globalAlpha = alpha * (0.45 + band * 0.27);
      ctx.beginPath();
      for (let i = 0; i < rays; i++) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.0017 + i * 1.3);
        if (Math.min(2, Math.floor(pulse * 3)) !== band) continue;
        const a = i * 2.39996 + now * 0.00012 * (i % 2 ? 1 : -1);
        const hw = 0.035 + 0.05 * hash(i, 1.3);
        const l = len * (0.55 + 0.45 * hash(i, 2.9));
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a - hw) * l, y + Math.sin(a - hw) * l);
        ctx.lineTo(x + Math.cos(a + hw) * l, y + Math.sin(a + hw) * l);
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // The grade: the whole frame leans violet as she gathers the charge and
  // as the impact lands. A plain translucent fill: a blend mode such as
  // soft-light makes the GPU copy the whole frame to blend against, every
  // frame of the charge.
  function drawGrade(amount) {
    if (amount <= 0.01 || freezeTier() >= 2) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, amount * 0.45);
    ctx.fillStyle = 'rgb(58,22,110)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Violet lightning. A bolt is a jagged line between two points, its kinks
  // taken from hash() of the bolt's seed, so the same seed always gives the
  // same bolt and nothing is stored between frames. Callers change the seed
  // every 60 to 110ms, which is what makes the lightning flicker and jump.
  function hash(a, b) {
    const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return v - Math.floor(v);
  }
  function drawBolt(x0, y0, x1, y1, seed, width, alpha, glow, core) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, segs = 9;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 1; i < segs; i++) {
      const f = i / segs, off = (hash(seed, i) - 0.5) * len * 0.26 * Math.sin(Math.PI * f);
      ctx.lineTo(x0 + dx * f + nx * off, y0 + dy * f + ny * off);
    }
    ctx.lineTo(x1, y1);
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = glow || 'rgba(150,70,255,1)';
    ctx.lineWidth = width * 3.2;
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = core || 'rgba(246,232,255,1)';
    ctx.lineWidth = width;
    ctx.stroke();
  }

  // Lightning while she gathers: short arcs crawling over her aura, more
  // of them and more often as the charge builds, and past 0.6 a bolt now
  // and then from the ring's edge into her raised hand.
  function drawGatherLightning(L, pose, hand, now, power, extras) {
    const tier = freezeTier();
    if (extras == null) extras = 1;
    if (power < 0.25 || tier >= 2 || extras <= 0.01) return;
    const box = L.box * pose.scale, cx = pose.x, cy = pose.y + box * 0.05;
    const unit = Math.max(1, box / 360);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const n = Math.round((tier === 0 ? 5 : 3) * power * extras);
    for (let i = 0; i < n; i++) {
      const bucket = Math.floor(now / (60 + 50 * hash(i, 9.1)));
      // Not every slot fires in every bucket, so the arcs come and go.
      if (hash(i, bucket) > 0.35 + 0.5 * power) continue;
      const a = hash(bucket, i + 3) * Math.PI * 2, span = 0.5 + hash(i, bucket + 5) * 0.7;
      const r0x = box * 0.27, r0y = box * 0.42;
      drawBolt(cx + Math.cos(a) * r0x, cy + Math.sin(a) * r0y,
        cx + Math.cos(a + span) * r0x * 1.1, cy + Math.sin(a + span) * r0y * 1.1,
        bucket * 13 + i, 1.1 * unit, Math.min(1, pose.alpha) * (0.55 + 0.4 * power));
    }
    if (hand && power > 0.6 && tier === 0) {
      const bucket = Math.floor(now / 110);
      if (hash(bucket, 2.7) < (power - 0.6) * 1.6 * extras) {
        const a = hash(bucket, 4.4) * Math.PI * 2;
        drawBolt(L.standX + Math.cos(a) * L.ringR, L.centerY + Math.sin(a) * L.ringR, hand.x, hand.y,
          bucket * 7 + 1, 1.3 * unit, Math.min(1, pose.alpha) * 0.8);
      }
    }
    ctx.restore();
  }

  // The pull of power into her once her arm is up. Rings of haki closing
  // in on her from outside the spell ring, each brightening as it shrinks,
  // and streams of energy running from the ring's edge into her palm, their
  // dashes marching inward. g 0..1 builds to the impact.
  function drawGathering(L, pose, hand, now, g, ringPull, inflowSpeed) {
    if (ringPull == null) ringPull = 1;
    if (inflowSpeed == null) inflowSpeed = 1;
    const tier = freezeTier();
    if (g <= 0.01 || tier >= 3) return;
    const box = L.box * pose.scale, cx = pose.x, cy = pose.y + box * 0.02;
    const a0 = Math.min(1, pose.alpha) * g;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // Closing rings: each takes 760ms from 1.45 of the ring to her body,
    // spaced so one is always arriving.
    const rings = tier === 0 ? 3 : 2;
    for (let i = 0; i < rings; i++) {
      const ph = (now / 760 + i / rings) % 1;
      const rad = L.ringR * (1.45 - 1.1 * ph * ph) * ringPull;
      ctx.globalAlpha = a0 * 0.55 * Math.sin(Math.PI * ph) * (0.5 + 0.5 * ph);
      ctx.strokeStyle = i % 2 ? 'rgba(170,92,255,1)' : 'rgba(224,190,255,1)';
      ctx.lineWidth = Math.max(1, box * (0.006 + 0.01 * ph));
      ctx.beginPath();
      ctx.ellipse(cx, cy, rad, rad * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Streams into the palm, one path, the dash pattern moving toward it.
    if (hand) {
      const n = tier === 0 ? 8 : 5;
      ctx.globalAlpha = a0 * 0.7;
      ctx.strokeStyle = 'rgba(214,168,255,1)';
      ctx.lineWidth = Math.max(1, box * 0.005);
      ctx.setLineDash([box * 0.05, box * 0.035]);
      ctx.lineDashOffset = now * box * 0.0006 * inflowSpeed;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + now * 0.0003;
        const sx = L.standX + Math.cos(a) * L.ringR, sy = L.centerY + Math.sin(a) * L.ringR;
        // Bowed sideways, so the streams curl in rather than run straight.
        const mx = (sx + hand.x) / 2 + Math.cos(a + 1.3) * box * 0.18;
        const my = (sy + hand.y) / 2 + Math.sin(a + 1.3) * box * 0.18;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(mx, my, hand.x, hand.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // Around her while she gathers it. Drawn behind the sprite: a violet swell
  // behind the whole figure, tongues of aura rising off her outline, and
  // streaks of power drawn in toward her from well outside the ring, all of
  // it growing with the charge. power 0..1.
  function drawHakiAura(L, pose, now, power, inflowMul, inflowSpeed) {
    if (inflowMul == null) inflowMul = 1;
    if (inflowSpeed == null) inflowSpeed = 1;
    const tier = freezeTier();
    if (power <= 0.02 || tier >= 3) return;
    const box = L.box * pose.scale, cx = pose.x, cy = pose.y + box * 0.05;
    const a0 = Math.min(1, pose.alpha) * power;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hr = box * (0.42 + 0.1 * power) * (0.95 + 0.05 * Math.sin(now * 0.005));
    ctx.globalAlpha = a0 * 0.4;
    ctx.drawImage(energyGlow(), cx - hr * 0.8, cy - hr, hr * 1.6, hr * 2);
    ctx.lineCap = 'round';
    // Tongues: each starts on an oval round her body, climbs and thins out,
    // on its own cycle so they never rise together.
    // Batched into one path per colour and strength band: six strokes a
    // frame however many tongues there are.
    const n = tier === 0 ? 28 : (tier === 1 ? 18 : 10);
    ctx.lineWidth = Math.max(1, box * 0.009);
    for (let pass = 0; pass < 6; pass++) {
      const pale = pass >= 3, band = pass % 3;
      ctx.strokeStyle = pale ? 'rgba(226,186,255,1)' : 'rgba(160,80,255,1)';
      ctx.globalAlpha = a0 * 0.75 * (0.35 + band * 0.32);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if ((i % 3 === 0) !== pale) continue;
        const ph = (now * 0.0014 + i * 0.381966) % 1;
        if (Math.min(2, Math.floor(Math.sin(Math.PI * ph) * 3)) !== band) continue;
        const a = (i / n) * Math.PI * 2 + Math.sin(i * 1.7) * 0.2;
        const bx = cx + Math.cos(a) * box * 0.25, by = cy + Math.sin(a) * box * 0.4;
        const rise = box * (0.06 + 0.16 * ph) * (0.6 + 0.4 * power);
        const sx = bx + Math.cos(a) * box * 0.03 * ph, sy = by - rise * 0.6;
        const ex = sx + Math.sin(now * 0.006 + i) * box * 0.02, ey = sy - rise * 0.55;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + (ex - sx) * 0.2 + Math.cos(a) * box * 0.02, (sy + ey) / 2, ex, ey);
      }
      ctx.stroke();
    }
    // Inflow: streaks falling in toward her from outside the ring, faster
    // and more of them as the charge builds.
    if (tier <= 1) {
      const m = Math.round((tier === 0 ? 22 : 12) * power * inflowMul);
      ctx.strokeStyle = 'rgba(206,150,255,1)';
      ctx.lineWidth = Math.max(1, box * 0.006);
      for (let band = 0; band < 3 && m; band++) {
        ctx.globalAlpha = a0 * 0.6 * (0.35 + band * 0.32);
        ctx.beginPath();
        for (let i = 0; i < m; i++) {
          const ph = (now * (0.0009 + 0.0009 * power) * inflowSpeed + i * 0.618034) % 1;
          if (Math.min(2, Math.floor(Math.sin(Math.PI * ph) * 3)) !== band) continue;
          const a = i * 2.39996 + 0.4;
          const far = box * (1.25 - 1.0 * ph), near = far - box * (0.08 + 0.1 * ph);
          ctx.moveTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far * 0.8);
          ctx.lineTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near * 0.8);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // The release. At the summon a small wave leaves her palm; at the
  // Distortion the whole gathered pressure goes out at once: a violet flash
  // over the screen, rays from the palm, three pressure rings racing out
  // and manga pressure lines behind them. Keyed to elapsed time against
  // SUMMON_AT and APPLY_AT, from the palm position stored when each fired.
  function drawCastRelease(cs, elapsed, now) {
    const colors = _timelineDistortionColors(window._getTimelineDistortionArt(cs.effect).art.accent);
    const tier = freezeTier();
    if (tier >= 3) return;
    const W = canvas.width, H = canvas.height;
    const unit = Math.min(W, H) / 720;
    const EVENTS = [
      { at: SUMMON_AT, pos: cs.summonFx, dur: 650, reach: 260 * unit, rings: 1, big: false },
      { at: RELEASE_AT, pos: cs.applyFx, dur: 1100, reach: Math.hypot(W, H) * 0.75, rings: 3, big: true },
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const ev of EVENTS) {
      const k = elapsed - ev.at;
      if (!ev.pos || k < 0 || k > ev.dur) continue;
      const q = k / ev.dur, x = ev.pos[0], y = ev.pos[1];
      if (ev.big) {
        // A lens streak across the whole screen, fading over half a second.
        drawFlare(x, y, W * 1.6, Math.pow(Math.max(0, 1 - k / 520), 1.5) * 0.95);
        ctx.globalCompositeOperation = 'lighter';
        // a tinted flash across the screen
        // Peaks over two frames and is gone 100ms later.
        const fl = k < 33 ? 1 : Math.max(0, 1 - (k - 33) / 100);
        if (fl > 0) {
          ctx.globalAlpha = 0.24 * fl * fl;
          ctx.fillStyle = colors.flash;
          ctx.fillRect(0, 0, W, H);
        }
        // Rays: long thin wedges out of the palm, turning slowly.
        const rays = tier === 0 ? 14 : 8;
        const ra = Math.pow(1 - q, 2.4) * 0.22;
        ctx.fillStyle = colors.rays;
        ctx.globalAlpha = ra;
        ctx.beginPath();
        for (let i = 0; i < rays; i++) {
          const a = i * (Math.PI * 2 / rays) + now * 0.0004 + Math.sin(i * 3.1) * 0.12;
          const len = Math.hypot(W, H) * (0.35 + 0.25 * ((i * 0.618034) % 1)) * (0.6 + 0.4 * Math.min(1, k / 120));
          const hw = 0.012 + 0.016 * ((i * 0.381966) % 1);
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a - hw) * len, y + Math.sin(a - hw) * len);
          ctx.lineTo(x + Math.cos(a + hw) * len, y + Math.sin(a + hw) * len);
          ctx.closePath();
        }
        ctx.fill();
      }
      // Lightning thrown out of the palm, flickering to a new shape every
      // 70ms for the first 450ms.
      if (ev.big && k < 450) {
        const bucket = Math.floor(k / 70);
        const count = tier === 0 ? 7 : 4;
        ctx.lineJoin = 'round';
        for (let i = 0; i < count; i++) {
          const a = hash(i, bucket + 1) * Math.PI * 2;
          const len = Math.min(W, H) * (0.25 + 0.3 * hash(bucket, i + 11));
          drawBolt(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, bucket * 31 + i, 1.6 * unit, 1 - k / 450, colors.bolt, colors.boltCore);
        }
      }
      // Pressure rings, one after another. The release sends three hard,
      // quick waves 50ms apart, each dimmer than the last and gone in about
      // a fifth of a second.
      for (let j = 0; j < ev.rings; j++) {
        let qj, bright;
        if (ev.big) { qj = (k - j * 50) / 260; bright = [1, 0.65, 0.35][j] * 0.9; }
        else { qj = clamp01(q * 1.25 - j * 0.14); bright = 0.6; }
        if (qj <= 0 || qj >= 1) continue;
        const rad = ev.reach * easeOutCubic(qj);
        ctx.globalAlpha = Math.pow(1 - qj, 1.5) * bright;
        ctx.strokeStyle = j === 0 ? colors.ring : colors.accent;
        ctx.lineWidth = Math.max(1, (ev.big ? 9 : 4) * (1 - qj) * unit + unit);
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Pressure lines trailing the first ring.
      if (ev.big && tier <= 1) {
        const lines = tier === 0 ? 36 : 20;
        const rad = ev.reach * easeOutCubic(clamp01(q * 1.25));
        ctx.strokeStyle = colors.trail;
        ctx.lineWidth = 1.6 * unit;
        ctx.globalAlpha = Math.pow(1 - q, 2) * 0.55;
        ctx.beginPath();
        for (let i = 0; i < lines; i++) {
          const a = i * 2.39996;
          const inner = rad * (0.45 + 0.25 * ((i * 0.618034) % 1));
          ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
          ctx.lineTo(x + Math.cos(a) * rad * 0.97, y + Math.sin(a) * rad * 0.97);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Film bars top and bottom, riding in with the freeze front and out with
  // it. Drawn under the banner and the boss bar so neither is covered.
  function drawLetterbox(reach) {
    if (reach <= 0.001) return;
    const h = Math.round(canvas.height * 0.075 * reach);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillRect(0, canvas.height - h, canvas.width, h);
    ctx.restore();
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

  // The effect's name the way Dark Souls announces a boss falling: capitals
  // in a light serif, spaced wide, in pale bone gold with a warm bloom, and
  // growing very slowly the whole time it is up. A faint larger copy behind
  // it is the soft double image that title card has. Letters are placed one
  // at a time, since canvas letterSpacing is missing on older browsers.
  // p is how far through the beat it is, 0..1.
  function drawSoulsTitle(text, cx, cy, maxW, size, p) {
    const caps = String(text).toUpperCase();
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let px = size;
    const measure = () => {
      ctx.font = '400 ' + px + "px 'Cinzel', serif";
      const track = px * 0.22;
      const widths = Array.from(caps, ch => ctx.measureText(ch).width);
      return { track, widths, total: widths.reduce((a, b) => a + b, 0) + track * (caps.length - 1) };
    };
    let m = measure();
    if (m.total > maxW) { px = Math.max(14, Math.floor(px * maxW / m.total)); m = measure(); }
    const grow = 1 + 0.03 * p;
    const lay = (scale, fill) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      let x = -m.total / 2;
      ctx.fillStyle = fill;
      for (let i = 0; i < caps.length; i++) {
        ctx.fillText(caps[i], x, 0);
        x += m.widths[i] + m.track;
      }
      ctx.restore();
    };
    const base = ctx.globalAlpha;
    ctx.shadowColor = 'rgba(255,196,120,0.55)';
    ctx.shadowBlur = px * 0.5;
    ctx.globalAlpha = base * 0.22;
    lay(grow * 1.035, '#f2dca6');
    ctx.globalAlpha = base;
    ctx.shadowBlur = px * 0.32;
    lay(grow, '#e8d6a8');
    ctx.shadowBlur = 0;
    lay(grow, '#f4e8c6');
    ctx.restore();
  }

  // The announcement that runs over the cast beat: the wide banner art, the
  // rolled effect's name on top of it, and both halves of the pair — the
  // player-favouring hourglass and the enemy-favouring broken one.
  function drawEffectBanner(effect, alpha, L, p) {
    if (alpha <= 0.01) return;
    const art = window._getTimelineDistortionArt(effect);
    const w = Math.min(canvas.width * 0.82, 700);
    const h = w * 0.21;
    const cx = canvas.width / 2;
    const top = canvas.height * 0.03;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (art.banner.complete && art.banner.naturalWidth) {
      ctx.drawImage(art.banner, cx - w / 2, top, w, h);
    }
    drawSoulsTitle(_timelineDistortionName(effect), cx, top + h * 0.52, w * 0.74, Math.max(18, Math.round(h * 0.36)), p || 0);

    // The pair reads as one line under the banner: the player-favouring
    // hourglass and its half on the left, the broken enemy one on the right.
    // Icons sit out at the banner's decorated ends so they stay off her.
    // Floors matter on a phone: straight percentages of a 330px-wide banner
    // give a 6px font, which is unreadable.
    const iconR = Math.max(14, w * 0.045);
    const halves = [
      { img: art.playerIcon, text: effect.playerHalf, dir: -1, color: '#ffe9a8' },
      { img: art.enemyIcon, text: effect.enemyHalf, dir: 1, color: '#ff9aa6' },
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
    { id: 'summon',  ms: 1800 },  // she gathers the haki; Goliath Alpha enters the arena for real
    { id: 'cast',    ms: 2400 },  // the rolled effect applies, banner up
    { id: 'leave',   ms: 1800 },  // she turns, walks back into the gate
    { id: 'close',   ms: 1100 },  // gate shuts, overlay lifts, time resumes
  ];

  const BEAT_AT = {};
  let _beatAcc = 0;
  for (const b of BEATS) { BEAT_AT[b.id] = _beatAcc; _beatAcc += b.ms; }
  const TOTAL_MS = _beatAcc;
  // Where inside their own beats the two real game-logic side effects land.
  // Goliath comes 715ms into the summon, once her arm is up; the rest of the
  // beat is her gathering power before the cast.
  const SUMMON_AT = BEAT_AT.summon + 715;
  const APPLY_AT = BEAT_AT.cast + 0.25 * 2400;
  // The impact hold: for five frames from APPLY_AT the picture stands still
  // (the first of them the impact frame) while sound, the banner and the
  // game logic run on. Everything the release throws out starts when the
  // hold ends, not already partway through.
  const HOLD_MS = 83.3;
  const RELEASE_AT = APPLY_AT + HOLD_MS;

  function currentBeat(elapsed) {
    for (const b of BEATS) {
      const start = BEAT_AT[b.id];
      if (elapsed < start + b.ms) return { id: b.id, p: clamp01((elapsed - start) / b.ms) };
    }
    return null;
  }

  // The gate's clock for everything that turns, in ms: time weighted by how
  // open the gate is, so turning starts gently as it tears open, runs at
  // full speed while it is open and slows as it closes, and never jumps.
  // A plain function of the beat, integrated with Simpson's rule.
  function gateOpenIntegral(beatId, p) {
    const n = 16, h = p / n;
    let sum = gateOpenness(beatId, 0) + gateOpenness(beatId, p);
    for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * gateOpenness(beatId, i * h);
    return sum * h / 3 * BEAT_MS[beatId];
  }
  const GATE_SPIN_BEATS = ['gate', 'walkOut', 'think', 'summon', 'cast', 'leave', 'close'];
  // Built on first use: BEAT_MS is declared further down the file.
  let _gateSpinBefore = null;
  function gateSpin(beatId, p) {
    if (!_gateSpinBefore) {
      _gateSpinBefore = {};
      let acc = 0;
      for (const b of GATE_SPIN_BEATS) { _gateSpinBefore[b] = acc; acc += gateOpenIntegral(b, 1); }
    }
    if (!(beatId in _gateSpinBefore)) return 0;
    return _gateSpinBefore[beatId] + gateOpenIntegral(beatId, p);
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
    if (beatId === 'summon' || beatId === 'cast') {
      // Lit by the same charge as her hand, flaring on the impact, and
      // easing to the leave beat's level before it starts.
      const ms = castClock(beatId, p);
      const out = smootherstep(clamp01((ms - CAST_T.lower1) / (CAST_T.end - CAST_T.lower1)));
      const e = 0.5 + 0.5 * chargeAt(ms) + 0.35 * impactAt(ms);
      return { alpha: 1, energy: e + (0.45 - e) * out };
    }
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

  // The summon and cast beats together, on one clock: milliseconds since
  // the summon beat began. The two beats used to run the same raise, hold
  // and lower each, so the arm came down at the end of the summon and went
  // straight back up, and the charge dropped to nothing at the join. Now
  // the arm goes up once, holds through the summon and the impact, and
  // comes down once.
  const BEAT_MS = {};
  for (const b of BEATS) BEAT_MS[b.id] = b.ms;
  const CAST_T = {
    raise0: 156,                                      // anticipation ends, the arm starts up
    raise1: 806,                                      // fully raised; the rest of the summon is gathering
    impact: APPLY_AT - BEAT_AT.summon,                // the Distortion lands
    lower0: BEAT_MS.summon + 0.38 * BEAT_MS.cast,     // the arm starts down
    lower1: BEAT_MS.summon + 0.75 * BEAT_MS.cast,     // back at rest
    end: BEAT_MS.summon + BEAT_MS.cast,
  };
  const FLASH_SPARKS_AT = (0.18 + 0.12 * Math.asin(0.9) / Math.PI) * BEAT_MS.leave;
  function castClock(beatId, p) {
    return beatId === 'summon' ? p * BEAT_MS.summon : BEAT_MS.summon + p * BEAT_MS.cast;
  }
  function castExtAt(ms) {
    if (ms <= CAST_T.raise0) return 0;
    if (ms < CAST_T.raise1) return smootherstep((ms - CAST_T.raise0) / (CAST_T.raise1 - CAST_T.raise0));
    if (ms <= CAST_T.lower0) return 1;
    if (ms < CAST_T.lower1) return 1 - smootherstep((ms - CAST_T.lower0) / (CAST_T.lower1 - CAST_T.lower0));
    return 0;
  }
  // Power in her hand: it builds through the summon to 0.88, carries across
  // into the cast at that level, peaks at the impact and drains as the arm
  // comes down.
  function chargeAt(ms) {
    const S = BEAT_MS.summon;
    if (ms < S) return 0.88 * smootherstep(clamp01((ms - 0.05 * S) / (0.95 * S)));
    if (ms < CAST_T.impact) return 0.88 + 0.12 * smootherstep((ms - S) / (CAST_T.impact - S));
    if (ms < CAST_T.lower0) return 1;
    return 1 - smootherstep(clamp01((ms - CAST_T.lower0) / ((CAST_T.lower1 - CAST_T.lower0) * 0.85)));
  }
  // The kick of the impact, 0..1: up in about 70ms, gone in about half a
  // second. Zero before the impact, so it cannot touch anything earlier.
  function impactAt(ms) {
    const k = ms - CAST_T.impact - HOLD_MS;
    if (k <= 0) return 0;
    return Math.min(1, (1 - Math.exp(-k / 35)) * Math.exp(-k / 220) / 0.63);
  }
  // Hair and sleeves swinging past rest once the arm is down, dying out over
  // about 450ms.
  function settleAt(ms) {
    const k = ms - CAST_T.lower1;
    return k <= 0 ? 0 : Math.sin(k / 70) * Math.exp(-k / 160);
  }
  // Her face across the join from thinking to casting. Mouth and brows can
  // only switch, so the switch is hidden inside a blink: she keeps the
  // serene look for the first 104ms of the summon, her eyes close, the face
  // behind them becomes the smirk, and they open onto it over 150ms. Only
  // then do they start following the hand. blink is null once the random
  // blinks take over again.
  function castEyes(ms) {
    const shut = 104;
    const ease = v => v * v * (3 - 2 * v);
    if (ms < shut) return { expression: 'serene', blink: null, look: 0 };
    if (ms < shut + 46) return { expression: 'smug', blink: 0.6 + 0.4 * ease((ms - shut) / 46), look: 0 };
    if (ms < shut + 86) return { expression: 'smug', blink: 1, look: 0 };
    if (ms < shut + 236) {
      const o = ease((ms - shut - 86) / 150);
      return { expression: 'smug', blink: 1 - o, look: o };
    }
    return { expression: 'smug', blink: null, look: 1 };
  }

  // The hair's own clock: 1800ms a cycle, twice the body's, read straight
  // off `now` so it runs on through every beat and through the turn to the
  // back view without restarting, and holds still while the game is paused.
  function hairClock(now) { return (now / 1800) % 1; }
  // Standing hair energy when she is not casting.
  const HAIR_IDLE_ENERGY = 0.1;

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
          // When she stops, the hair swings on past and settles.
          hairT: hairClock(now), hairEnergy: HAIR_IDLE_ENERGY,
          hairWind: p < 0.70 ? 0 : 1.1 * Math.sin((p - 0.70) * 1900 / 95) * Math.exp(-(p - 0.70) * 1900 / 220),
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
          hairT: hairClock(now), hairEnergy: HAIR_IDLE_ENERGY,
        },
      };
    }

    if (beatId === 'summon' || beatId === 'cast') {
      // One gesture across both beats, read off the same clock: see castExtAt
      // and the functions after it. Nothing here depends on the frame before,
      // so a pause or a headless render lands on exactly the same pose.
      const ms = castClock(beatId, p);
      const castExt = castExtAt(ms);
      const charge = chargeAt(ms);
      const imp = impactAt(ms);
      const mix = (a, b, k) => a + (b - a) * k;
      // Her idle from the think beat eases into the casting stance over the
      // first 300ms, and the stance eases toward the one she leaves in over
      // the last stretch, so neither boundary makes the sway or the hair jump.
      const into = smootherstep(clamp01(ms / 300));
      const out = smootherstep(clamp01((ms - CAST_T.lower1) / (CAST_T.end - CAST_T.lower1)));
      // Anticipation: before the arm moves she sinks a touch and leans away
      // from it, the way anyone draws back before a throw.
      const antic = ms < 260 ? Math.sin(Math.PI * ms / 260) : 0;
      const eyes = castEyes(ms);
      // The eyes find the hand a beat ahead of it, once they are open.
      const lead = castExtAt(ms + 120) * eyes.look;
      // Hair and sleeves follow the arm 80ms late, then ring out once it is
      // down again; the impact throws them back with the head.
      const hair = castExtAt(ms - 80);
      const light = clamp01(castExt / 0.25) * Math.min(0.7, 0.58 * charge + 0.12 * imp);
      // Gathering: from the moment the arm is up to the impact, the pull of
      // power into her builds on its own curve.
      const gather = ms < CAST_T.raise1 || ms >= CAST_T.impact ? 0
        : smootherstep((ms - CAST_T.raise1) / (CAST_T.impact - CAST_T.raise1));
      return {
        back: false, charge, impact: imp, gather,
        x: L.standX + Math.sin(now * 0.037) * charge * 0.6,
        y: L.centerY - L.box * 0.012 * castExt + L.box * 0.004 * antic,
        scale: 1 + mix(breath(now) * 0.006, 0, into) + charge * 0.012 + imp * 0.004,
        alpha: 1, flash: 0,
        opts: {
          swayAmp: mix(mix(1.7, 0.7, into), 1.1, out),
          bobAmp: mix(mix(1.2, 0.35, into), 0.45, out),
          castExt,
          blinkAmount: eyes.blink != null ? eyes.blink : blinkNow(now),
          gazeX: 0.85 * lead, gazeY: -0.75 * lead,
          headTurn: -0.008 * Math.sin(Math.PI * clamp01((ms - CAST_T.raise0) / (CAST_T.raise1 - CAST_T.raise0))) - 0.006 * imp,
          lean: mix(mix(breath(now) * 1.5, breath(now) * 0.7, into), 0, out) - 0.8 * antic - 1.2 * imp,
          trail: mix(mix(idleTrail(now, 1), idleTrail(now, 0.7), into), idleTrail(now, 0.5), out)
            - 3.4 * hair - 1.2 * imp + 1.6 * settleAt(ms),
          whip: mix(Math.sin(now * 0.021) * charge * 1.2, flutter(now) * 0.6, out),
          magicLight: Math.round(light * 10) / 10,
          expression: eyes.expression,
          // The charge swings and lifts her hair; the impact throws it back.
          hairT: hairClock(now),
          hairEnergy: mix(mix(HAIR_IDLE_ENERGY, Math.min(1, charge + 0.2 * gather), into), 0.15, out),
          hairImpact: imp,
          hairBoost: Math.round(cinema(BEAT_AT.summon + ms).hairBoost * 20) / 20,
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
        hairT: hairClock(now), hairEnergy: 0.15,
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
      cs.summonFx = [fxX, fxY];
    }
    if (!cs.applied && elapsed >= APPLY_AT) {
      cs.applied = true;
      if (typeof _applyTimelineDistortion === 'function') _applyTimelineDistortion(cs.effect);
      spawnBurst(40, fxX, fxY, '#d8b6ff', 2, 7, 34, 4);
      cs.applyFx = [fxX, fxY];
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
    const realNow = (typeof _frozenNow === 'number' && _frozenNow > 0) ? _frozenNow : performance.now();
    if (!cs.startedAt) cs.startedAt = realNow;
    // _frozenNow stops advancing while the game is paused (js/main.js) and
    // then snaps forward to the current time on resume, so the clock jumps by
    // however long the pause lasted. Left alone the sequence sees that as
    // elapsed time and runs to its end the instant the game unpauses.
    // Anything larger than a very long frame is that jump, not real time, so
    // it is carried into startedAt and the sequence resumes where it stopped.
    // frameScale: how many 60Hz frames this one stands for, so everything
    // that steps per frame moves at the same speed at 60, 120 or 144Hz. The
    // first frame and the frame after a pause count as one.
    let frameScale = 1;
    if (cs.lastNow !== undefined) {
      const dt = realNow - cs.lastNow;
      if (dt > 250) cs.startedAt += dt - 16;
      else frameScale = Math.max(0, Math.min(3, dt / 16.6667));
    }
    cs.lastNow = realNow;
    const elapsed = realNow - cs.startedAt;
    const L = layout();
    // The impact hold: the picture's clock stands still for HOLD_MS from
    // APPLY_AT, so pose, sparks, ring and lightning all stop; elapsed, the
    // sound and the side effects keep running.
    const holding = elapsed >= APPLY_AT && elapsed < RELEASE_AT;
    const now = holding ? realNow - (elapsed - APPLY_AT) : realNow;
    if (holding) frameScale = 0;
    const cine = cinema(elapsed);

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
    // The camera: everything in the shot from here on is pushed in toward the
    // point between her face and her hand, and shaken on the release. The
    // wash under it, and the bars, title and boss bar over it, stay put.
    ctx.save();
    if (pose && (cine.zoom > 1.0005 || cine.shake > 0.001)) {
      const u = (L.box * pose.scale) / GRID_W;
      const fx = pose.x + (92 - GRID_W / 2) * u, fy = pose.y + (38 - GRID_H / 2) * u;
      const hp = handPos(L, pose, t);
      const cx = hp ? (fx + hp.x) / 2 : fx, cy = hp ? (fy + hp.y) / 2 : fy;
      const low = freezeTier() >= 2;
      const unit = canvas.height / 1080, bucket = Math.floor(realNow / 16.6667);
      const sx = (hash(bucket, 1.1) * 2 - 1) * 8 * unit * cine.shake * (low ? 0.5 : 1);
      const sy = (hash(bucket, 2.3) * 2 - 1) * 4 * unit * cine.shake * (low ? 0.5 : 1);
      ctx.translate(cx + sx, cy + sy);
      ctx.scale(cine.zoom, cine.zoom);
      ctx.translate(-cx, -cy);
    }
    drawFrozenRealm(L, reach, now);
    ctx.save();
    clipToFront(L, reach);
    drawRealmLight(L, reach, now);
    ctx.restore();
    // The vignette and the lattice only make sense once the front has covered
    // the screen, so they come up with it rather than ahead of it.
    // The vignette closes in while she gathers the charge.
    drawVignette(wash * reach * (1 + 0.3 * (pose && pose.charge ? pose.charge : 0)));
    ctx.save();
    clipToFront(L, reach);
    drawFreezeField(L, wash * reach, elapsed, now);
    ctx.restore();
    drawFrontHaki(L, reach, wash, now);
    const focus = stageFocus(beat.id, beat.p);
    const charged = pose && pose.charge ? pose.charge : 0;
    if (focus > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (0.14 + 0.14 * charged) * focus * reach + cine.dark);
      ctx.fillStyle = '#040210';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    // Bullets dim with the front too, so nothing outside it goes dark early.

    // Light pouring out of the point the stopped world opens from, strongest
    // while the front is still spreading and while the gate tears open.
    const rayLen = Math.hypot(canvas.width, canvas.height) * 0.8;
    if (beat.id === 'freeze') drawGodRays(L.gateX, L.centerY, rayLen * Math.max(0.2, reach), 0.16 * Math.sin(Math.PI * Math.min(1, beat.p * 1.2)), now);
    if (beat.id === 'gate') drawGodRays(L.gateX, L.centerY, rayLen, 0.12 * (1 - beat.p * 0.6), now);
    const openness = gateOpenness(beat.id, beat.p);
    // Dust first, behind the gate, and outside the openness check so it can
    // finish fading after the gate has shut.
    drawGateDust(L, gateDustSpread(beat.id, openness), gateDust(beat.id, beat.p), now);
    if (openness > 0) {
      drawGate(L.gateX, L.centerY, L.gateR, openness, 1, now, gateSpin(beat.id, beat.p));
      if (beat.id === 'gate') drawFlare(L.gateX, L.centerY, canvas.width * 1.1, 0.7 * Math.sin(Math.PI * Math.min(1, beat.p * 1.6)));
      // 30 sparks for every 60Hz frame of the first 4% of the beat, however
      // many frames actually land in it.
      if (beat.id === 'gate' && beat.p < 0.04) {
        const due = 30 * Math.ceil((beat.p * BEAT_MS.gate + 0.001) / 16.6667);
        if (due > cs.gateSparks) {
          spawnBurst(due - cs.gateSparks, L.gateX, L.centerY, '#9fe8ff', 1, 5, 44, 4);
          cs.gateSparks = due;
        }
      }
    }

    const descending = goliathDrift(cs, elapsed);
    if (descending && typeof drawEnemy === 'function') {
      drawEnemy(descending);
      drawSummonAura(descending, descending._summonAuraQ || 0, now);
    }

    const ring = ringState(beat.id, beat.p);
    ringRot += (0.004 + ring.energy * 0.01) * frameScale * cine.spin;
    drawSpellRing(L.standX, L.centerY, L.ringR, ring.energy, ring.alpha * cine.deco);
    // The same petals per second at any refresh rate, a quarter as many
    // while she thinks.
    const petalRate = beat.id === 'think' ? 0.03 : 0.12;
    if (ring.alpha > 0.4 && sakuraPetals.length < 46 && Math.random() < 1 - Math.pow(1 - petalRate, frameScale)) spawnSakuraPetal(L);
    updateDrawSakura(frameScale);

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
      drawStageLight(L, pose, focus, charged);
      if (pose.charge) drawHakiAura(L, pose, now, Math.min(1, pose.charge * 0.9 + (pose.gather || 0) * 0.35 + (pose.impact || 0) * 0.3), cine.inflow, cine.inflowSpeed);
      if (pose.gather) drawGathering(L, pose, handPos(L, pose, t), now, pose.gather, cine.ringPull, cine.inflowSpeed);
      drawHandTrail(L, pose, t, elapsed);
      if (!pose.back) drawHaloAt(L, pose.x, pose.y, pose.scale, pose.alpha, now);
      blitSprite(L, pose.x, pose.y, pose.scale, pose.alpha);
      if (!pose.back) drawEyeGlow(L, pose, t, cine.eyes);
      // Drawn over her it would otherwise swallow the back of her head, so
      // the near side of the halo is held back to about half strength.
      if (pose.back) drawHaloAt(L, pose.x, pose.y, pose.scale, pose.alpha * 0.55, now);
      // Over her, since it gathers in front of the palm.
      // The face shield for the release light, over her eyes and forehead.
      if (cine.shield && !pose.back) {
        const u = (L.box * pose.scale) / GRID_W;
        _faceShield = { x: pose.x + (92 - GRID_W / 2) * u, y: pose.y + (35 - GRID_H / 2) * u, rx: 13 * u, ry: 11 * u };
      }
      if (pose.charge) drawCastEnergy(L, pose, t, now, pose.charge, cine.extras);
      if (pose.charge) {
        const hand = handPos(L, pose, t);
        drawGatherLightning(L, pose, hand, now, pose.charge, cine.extras);
        // A lens streak through her palm, flickering with the charge.
        if (hand) drawFlare(hand.x, hand.y, L.box * (0.9 + 0.6 * pose.charge), pose.charge * 0.32 * cine.flare * (0.85 + 0.15 * Math.sin(now * 0.03)));
      }
      // 26 sparks for every 60Hz frame the turn flash stays above 0.9.
      if (pose.flash > 0.9 && fxParticles.length < 90) {
        const since = beat.p * BEAT_MS.leave - FLASH_SPARKS_AT;
        const due = 26 * Math.ceil(Math.max(0.001, since) / 16.6667);
        if (due > cs.flashSparks) {
          spawnBurst(due - cs.flashSparks, pose.x, pose.y - L.box * 0.16, '#fff4ff', 2, 6, 24, 4);
          cs.flashSparks = due;
        }
      }
      if (beat.id === 'think') {
        drawThoughtBubble(L, pose.x + L.box * 0.30, pose.y - L.box * 0.34,
          Math.min(1, beat.p / 0.18) * Math.min(1, (1 - beat.p) / 0.15), now);
      }
    }

    drawCastRelease(cs, elapsed, now);
    _faceShield = null;
    updateDrawParticles(frameScale);
    // The spotlight follows her; before she is out, it sits on the gate.
    if (focus > 0.01 && pose) drawSpotlight(pose.x, pose.y - L.box * 0.05, L.box * 0.34, focus * (0.85 + 0.15 * charged));
    const gateSpot = beat.id === 'gate' ? 0.7 * openness : (beat.id === 'walkOut' ? 0.7 * (1 - focus) : 0);
    if (gateSpot > 0.01) drawSpotlight(L.gateX, L.centerY, L.gateR * 0.8, gateSpot);
    // The impact frame: one frame of flat dark violet with her shape burnt
    // in bright, the moment the spell lands.
    if (pose && elapsed >= APPLY_AT && elapsed < APPLY_AT + 16.7) {
      ctx.save();
      ctx.fillStyle = 'rgb(24,8,46)';
      ctx.fillRect(-canvas.width, -canvas.height, canvas.width * 3, canvas.height * 3);
      ctx.restore();
      tintBuffer('#f6eeff', 1);
      invalidateSprite();
      blitSprite(L, pose.x, pose.y, pose.scale, 1);
      const hp = handPos(L, pose, t);
      if (hp) {
        const r = L.box * 0.12;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(energyGlow(), hp.x - r, hp.y - r, r * 2, r * 2);
        ctx.restore();
      }
    }
    if (pose) drawJewelryGlints(L, pose.x, pose.y, pose.scale, pose.alpha, jewelryTime(elapsed));
    ctx.restore(); // camera
    if (pose && pose.charge) drawGrade(0.28 * pose.charge + 0.3 * (pose.impact || 0));
    drawLetterbox(reach);
    if (descending && typeof _drawGoliathBossBar === 'function') _drawGoliathBossBar(descending);
    // The title comes up with the release, not before it: the screen belongs
    // to her gathering power until the Distortion lands, then the name fades
    // in over 450ms inside the shock wave and grows from there.
    if (beat.id === 'cast' && elapsed >= APPLY_AT) {
      const since = elapsed - APPLY_AT, left = BEAT_AT.cast + BEAT_MS.cast - elapsed;
      const a = Math.min(1, since / 450) * Math.min(1, left / 290);
      drawEffectBanner(cs.effect, a * a * (3 - 2 * a), L, clamp01((elapsed - APPLY_AT - 450) / 750));
    }
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
      ctx.font = "400 48px 'Cinzel', serif";
      ctx.fillText(effect.name.toUpperCase(), -9999, -9999);
      ctx.font = "16px 'Courier New', monospace";
      ctx.fillText(effect.playerHalf, -9999, -9999);
      ctx.restore();
    } catch (_) {}
    // The glow and flare sprites are built once; building them here keeps
    // that off the first frame that uses each.
    energyGlow();
    jewelryFlare();
    flareStreak();
    dustPuff();
    // Starts loading the effect's own banner and icons.
    window._getTimelineDistortionArt(effect);
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
      gateSparks: 0, flashSparks: 0, summonFx: null, applyFx: null,
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
      magicLight: m.magicLight != null ? m.magicLight : ((m.castExt || 0) > 0.05 ? 0.6 : 0),
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

  // Endless Echo keeps its masked poses and portal artwork in private atlases.
  const ECHO_ANCHOR = [80, 50];
  const ECHO_ARM = [106, 16, 50, 80];
  const ECHO_PALM = [0, 3.1];
  let echoArt = null;
  const echoShadowColor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowColor').set;

  function echoCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // Portal artwork is prepared once, only on tiers that display it.
  function echoBakePortalArt(art) {
    if (art.portalReady || freezeTier() >= 2) return;
    art.portalClockOuter = echoCanvas(384, 384);
    art.portalClockInner = echoCanvas(384, 384);
    art.portalDepth = echoCanvas(384, 384);
    art.portalSeal = echoCanvas(128, 128);
    art.portalMote = echoCanvas(24, 24);
    art.portalJoints = [];
    const outer = art.portalClockOuter.getContext('2d');
    outer.translate(192, 192); outer.scale(2, 2);
    outer.strokeStyle = 'rgba(169,143,231,0.22)'; outer.lineWidth = 4;
    outer.beginPath(); outer.arc(0, 0, 84, 0, Math.PI * 2); outer.stroke();
    outer.strokeStyle = 'rgba(230,220,255,0.82)'; outer.lineWidth = 0.65;
    outer.beginPath(); outer.arc(0, 0, 84, 0, Math.PI * 2); outer.stroke();
    outer.strokeStyle = 'rgba(210,196,252,0.8)'; outer.lineWidth = 0.9;
    outer.beginPath();
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI / 24, major = i % 4 === 0;
      const ri = major ? 87 : 88.5, ro = major ? 93 : 90.5;
      outer.moveTo(Math.cos(a) * ri, Math.sin(a) * ri);
      outer.lineTo(Math.cos(a) * ro, Math.sin(a) * ro);
    }
    outer.stroke();
    outer.strokeStyle = 'rgba(178,158,239,0.66)'; outer.lineWidth = 0.75;
    outer.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + 0.075;
      outer.moveTo(Math.cos(a) * 91.5, Math.sin(a) * 91.5);
      outer.arc(0, 0, 91.5, a, a + 0.34);
    }
    outer.stroke();
    const inner = art.portalClockInner.getContext('2d');
    inner.translate(192, 192); inner.scale(2, 2);
    inner.strokeStyle = 'rgba(165,188,237,0.7)'; inner.lineWidth = 0.7;
    inner.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      inner.moveTo(Math.cos(a) * 71, Math.sin(a) * 71);
      inner.arc(0, 0, 71, a, a + 0.53);
      inner.moveTo(Math.cos(a + 0.63) * 68.5, Math.sin(a + 0.63) * 68.5);
      inner.lineTo(Math.cos(a + 0.63) * 73.5, Math.sin(a + 0.63) * 73.5);
    }
    inner.stroke(); inner.strokeStyle = 'rgba(221,209,254,0.5)'; inner.lineWidth = 0.45;
    inner.beginPath(); inner.arc(0, 0, 66, 0, Math.PI * 2); inner.stroke();
    const depth = art.portalDepth.getContext('2d');
    const haze = depth.createRadialGradient(192, 192, 36, 192, 192, 164);
    haze.addColorStop(0, 'rgba(30,33,70,0.12)');
    haze.addColorStop(0.5, 'rgba(45,43,94,0.34)');
    haze.addColorStop(0.82, 'rgba(92,77,150,0.21)');
    haze.addColorStop(1, 'rgba(92,77,150,0)');
    depth.fillStyle = haze; depth.fillRect(0, 0, 384, 384);
    depth.translate(192, 192); depth.scale(2, 2);
    depth.strokeStyle = 'rgba(184,167,227,0.22)'; depth.lineWidth = 0.6;
    depth.beginPath();
    for (let i = 0; i < 5; i++) {
      const r = 24 + i * 9, a = i * 1.35;
      depth.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      depth.arc(0, 0, r, a, a + 1.8);
    }
    depth.stroke();
    const seal = art.portalSeal.getContext('2d');
    seal.translate(64, 64);
    seal.strokeStyle = 'rgba(188,169,237,0.2)'; seal.lineWidth = 5;
    seal.beginPath(); seal.arc(0, 0, 42, 0, Math.PI * 2); seal.stroke();
    seal.strokeStyle = 'rgba(231,220,254,0.88)'; seal.lineWidth = 1.35;
    seal.beginPath(); seal.arc(0, 0, 42, 0, Math.PI * 2); seal.stroke();
    seal.strokeStyle = 'rgba(176,210,244,0.82)'; seal.lineWidth = 1.05;
    seal.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      seal.moveTo(Math.cos(a) * 33, Math.sin(a) * 33);
      seal.arc(0, 0, 33, a, a + 0.49);
      seal.moveTo(Math.cos(a) * 47, Math.sin(a) * 47);
      seal.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
    }
    seal.stroke();
    const mote = art.portalMote.getContext('2d');
    const moteLight = mote.createRadialGradient(12, 12, 0, 12, 12, 11);
    moteLight.addColorStop(0, 'rgba(244,238,255,0.8)');
    moteLight.addColorStop(0.18, 'rgba(213,212,255,0.7)');
    moteLight.addColorStop(0.52, 'rgba(158,149,224,0.18)');
    moteLight.addColorStop(1, 'rgba(158,149,224,0)');
    mote.fillStyle = moteLight; mote.fillRect(0, 0, 24, 24);
    mote.fillStyle = 'rgba(245,240,255,0.9)';
    mote.beginPath(); mote.moveTo(12, 8); mote.lineTo(14, 12);
    mote.lineTo(12, 16); mote.lineTo(10, 12); mote.closePath(); mote.fill();
    for (let i = 0; i <= art.steps; i++) {
      const ext = i / art.steps, arm = castArm(ext, 0), drop = 1.5 * (1 - ext);
      art.portalJoints.push([112, 58 + drop, arm.elbowX, arm.elbowY + drop]);
    }
    art.portalReady = true;
  }

  function echoSchedulePortalArt(art) {
    if (art.portalReady || art.portalPending || freezeTier() >= 2) return;
    art.portalPending = true;
    const bake = () => { echoBakePortalArt(art); art.portalPending = false; };
    if (window.requestIdleCallback) window.requestIdleCallback(bake, { timeout: 1000 });
    else setTimeout(bake, 0);
  }

  function echoPrepare() {
    if (echoArt) return echoArt;
    const res = 3, steps = 24;
    const body = [30, 0, 100, 110], cols = 5, rows = Math.ceil((steps + 1) / cols);
    const art = echoArt = {
      res, steps, body, ready: 0, worldReady: false,
      bodies: echoCanvas(body[2] * res * cols, body[3] * res * rows),
      arms: echoCanvas(ECHO_ARM[2] * res * cols, ECHO_ARM[3] * res * rows),
      mask: echoCanvas(180 * res, 180 * res),
      work: echoCanvas(180 * res, 180 * res),
      armMask: echoCanvas(180 * res, 180 * res),
      gate: echoCanvas(384, 384), back: echoCanvas(384, 384), front: echoCanvas(384, 384),
      rings: echoCanvas(384, 384), world: echoCanvas(384, 384),
      glow: echoCanvas(128, 128), dust: echoCanvas(24, 24), palms: [],
    };
    const m = art.mask.getContext('2d');
    m.scale(res, res); m.translate(ECHO_ANCHOR[0], ECHO_ANCHOR[1]);
    m.scale(180 * 0.235 * 1.06, 180 * 0.235 * 1.34);
    const fade = m.createRadialGradient(0, 0, 0.62, 0, 0, 1);
    fade.addColorStop(0, '#fff'); fade.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    m.fillStyle = fade; m.fillRect(-1, -1, 2, 2);
    m.setTransform(res, 0, 0, res, 0, 0); m.globalCompositeOperation = 'destination-in';
    const torso = m.createLinearGradient(0, 66, 0, 108);
    torso.addColorStop(0, '#fff'); torso.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    torso.addColorStop(1, 'rgba(255,255,255,0)');
    m.fillStyle = torso; m.fillRect(0, 0, 180, 180);
    const g = art.gate.getContext('2d');
    g.translate(192, 192); g.scale(2, 2);
    const interior = g.createRadialGradient(0, 0, 0, 0, 0, 80);
    interior.addColorStop(0, '#1f133e'); interior.addColorStop(0.7, 'rgba(18,9,38,0.94)');
    interior.addColorStop(1, 'rgba(24,10,45,0)');
    g.fillStyle = interior; g.fillRect(-80, -80, 160, 160);
    for (const front of [false, true]) {
      const r = (front ? art.front : art.back).getContext('2d');
      r.translate(192, 192); r.scale(2, 2);
      const start = front ? -Math.PI / 2 : Math.PI / 2;
      for (const [width, alpha] of [[14, 0.035], [9, 0.07], [5, 0.16], [1.7, 0.95]]) {
        r.strokeStyle = `rgba(221,199,255,${alpha * (front ? 1 : 0.65)})`;
        r.lineWidth = width; r.beginPath(); r.arc(0, 0, 80, start, start + Math.PI); r.stroke();
      }
      r.strokeStyle = 'rgba(164,112,240,0.75)'; r.lineWidth = 0.9;
      r.beginPath(); r.arc(0, 0, 74, start, start + Math.PI); r.stroke();
    }
    const r = art.rings.getContext('2d');
    r.translate(192, 192); r.scale(2, 2);
    r.strokeStyle = 'rgba(222,200,255,0.8)'; r.lineWidth = 1;
    r.beginPath();
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16;
      r.moveTo(Math.cos(a) * 86, Math.sin(a) * 86);
      r.arc(0, 0, 86, a, a + 0.06);
      if (i % 2 === 0) { r.moveTo(Math.cos(a) * 89, Math.sin(a) * 89); r.lineTo(Math.cos(a) * 93, Math.sin(a) * 93); }
    }
    r.stroke(); r.strokeStyle = 'rgba(255,70,110,0.7)';
    r.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; r.moveTo(Math.cos(a) * 67, Math.sin(a) * 67); r.arc(0, 0, 67, a, a + 0.5); }
    r.stroke();
    const h = art.glow.getContext('2d');
    const light = h.createRadialGradient(64, 64, 0, 64, 64, 64);
    light.addColorStop(0, 'rgba(255,244,255,0.9)'); light.addColorStop(0.16, 'rgba(224,186,255,0.65)');
    light.addColorStop(0.48, 'rgba(153,83,230,0.16)'); light.addColorStop(1, 'rgba(127,56,200,0)');
    h.fillStyle = light; h.fillRect(0, 0, 128, 128);
    const d = art.dust.getContext('2d');
    d.fillStyle = '#10081e'; d.fillRect(5, 5, 14, 14);
    d.strokeStyle = '#ff537e'; d.lineWidth = 2; d.strokeRect(5, 5, 14, 14);
    echoSchedulePortalArt(art);
    return art;
  }

  function echoBakeWorld(art) {
    if (art.worldReady || !_gateWorldImg.complete || !_gateWorldImg.naturalWidth) return;
    const g = art.world.getContext('2d');
    g.drawImage(_gateWorldImg, 32, 32, 320, 320);
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(192, 192, 110, 192, 192, 160);
    fade.addColorStop(0, '#fff'); fade.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fade; g.fillRect(0, 0, 384, 384);
    g.globalCompositeOperation = 'source-over';
    art.worldReady = true;
  }

  function echoBakePose(art, index) {
    const ext = index / art.steps, res = art.res;
    fitSpriteBuffer(180 * res);
    drawKanade(0, {
      swayAmp: 0, bobAmp: 0, castExt: ext, blinkAmount: 0,
      gazeX: 0.85 * ext, gazeY: -0.75 * ext, expression: 'smug',
      trail: 0, whip: 0, hairT: 0, hairEnergy: 0.5, magicLight: 0.3 * ext,
    });
    const w = art.work.getContext('2d'), a = art.armMask.getContext('2d');
    a.setTransform(res, 0, 0, res, 0, 0); a.clearRect(0, 0, 180, 180);
    const arm = castArm(ext, 0), drop = 1.5 * (1 - ext), h = arm.hand;
    a.fillStyle = '#fff'; a.strokeStyle = '#fff'; a.lineWidth = 15; a.lineCap = 'round';
    a.beginPath(); a.moveTo(112, 58 + drop);
    a.lineTo(arm.elbowX, arm.elbowY + drop); a.lineTo(arm.wrist[0], arm.wrist[1] + drop); a.stroke();
    a.save(); a.translate(h.x, h.y + drop); a.rotate(h.rot); a.fillRect(-8, -17, 16, 25); a.restore();
    const tileX = index % 5, tileY = Math.floor(index / 5);
    const b = art.body;
    w.globalCompositeOperation = 'source-over'; w.clearRect(0, 0, art.work.width, art.work.height);
    w.drawImage(px, 0, 0, art.work.width, art.work.height);
    w.globalCompositeOperation = 'source-atop'; w.fillStyle = 'rgba(144,101,218,0.13)';
    w.fillRect(0, 0, art.work.width, art.work.height);
    w.fillStyle = 'rgba(211,188,255,0.045)';
    for (let y = 0; y < 110; y += 3) w.fillRect(0, y * res, art.work.width, res * 0.4);
    w.globalCompositeOperation = 'destination-in'; w.drawImage(art.mask, 0, 0);
    art.bodies.getContext('2d').drawImage(art.work, b[0] * res, b[1] * res, b[2] * res, b[3] * res,
      tileX * b[2] * res, tileY * b[3] * res, b[2] * res, b[3] * res);
    w.globalCompositeOperation = 'source-over'; w.clearRect(0, 0, art.work.width, art.work.height);
    w.drawImage(px, 0, 0, art.work.width, art.work.height);
    w.globalCompositeOperation = 'source-atop'; w.fillStyle = 'rgba(181,133,244,0.16)';
    w.fillRect(0, 0, art.work.width, art.work.height);
    w.globalCompositeOperation = 'destination-in'; w.drawImage(art.armMask, 0, 0);
    w.globalCompositeOperation = 'destination-out'; w.drawImage(art.mask, 0, 0);
    const bArm = ECHO_ARM;
    art.arms.getContext('2d').drawImage(art.work, bArm[0] * res, bArm[1] * res, bArm[2] * res, bArm[3] * res,
      tileX * bArm[2] * res, tileY * bArm[3] * res, bArm[2] * res, bArm[3] * res);
    const x = ECHO_PALM[0] * h.size, y = ECHO_PALM[1] * h.size;
    art.palms[index] = { x: h.x + x * Math.cos(h.rot) - y * Math.sin(h.rot),
      y: h.y + x * Math.sin(h.rot) + y * Math.cos(h.rot) + drop };
    art.ready = index + 1;
  }

  // Idle work never tints the shared cutscene buffer or changes its helpers.
  function echoWarm() {
    const art = echoPrepare();
    echoBakeWorld(art);
    if (art.ready <= art.steps) {
      echoBakePose(art, art.ready);
      if (window.requestIdleCallback) window.requestIdleCallback(echoWarm, { timeout: 1000 });
      else setTimeout(echoWarm, 0);
    } else {
      art.work = null; art.armMask = null;
    }
  }
  if (window.requestIdleCallback) window.requestIdleCallback(echoWarm, { timeout: 1000 });
  else setTimeout(echoWarm, 0);
  _gateWorldImg.addEventListener('load', () => { if (echoArt) echoBakeWorld(echoArt); });

  // Returns the palm of the displayed pose in world space.
  // The contact light follows the displayed arm across the unchanged portal ellipse.
  function echoPortalBoundarySegment(art, gx, gy, rx, ry, ax, ay, bx, by, u, alpha) {
    const sx = ax - gx, sy = ay - gy, dx = bx - ax, dy = by - ay;
    const rrX = rx * rx, rrY = ry * ry;
    const a = dx * dx / rrX + dy * dy / rrY;
    const b = 2 * (sx * dx / rrX + sy * dy / rrY);
    const c = sx * sx / rrX + sy * sy / rrY - 1;
    const d = b * b - 4 * a * c;
    if (a < 0.000001 || d < 0) return false;
    const t = (-b + Math.sqrt(d)) / (2 * a);
    if (t < 0 || t > 1) return false;
    const x = ax + dx * t, y = ay + dy * t;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(dy, dx));
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * 0.38;
    ctx.drawImage(art.glow, -u * 10, -u * 5, u * 20, u * 10);
    ctx.globalAlpha = alpha * 0.36;
    ctx.drawImage(art.portalSeal, -u * 7, -u * 4, u * 14, u * 8);
    ctx.restore();
    return true;
  }

  function drawEchoCastPortal(info, now) {
    const art = echoArt;
    if (!art || !art.ready) return null;
    if (!art.portalReady) { echoSchedulePortalArt(art); return drawEchoCastBase(info, now); }
    const tier = freezeTier(), gx = info.x, gy = info.y;
    const u = info.box / GRID_W, radius = info.gateR;
    const index = Math.min(art.ready - 1, Math.round(clamp01(info.ext) * art.steps));
    const poseExt = index / art.steps, palm = art.palms[index];
    const retreat = (1 - poseExt) * Math.max(0, 1 - info.open) * 5;
    const lean = Math.sin(poseExt * Math.PI) * 0.7 - retreat;
    const hx = gx + (palm.x - ECHO_ANCHOR[0] + lean) * u;
    const hy = gy + (palm.y - ECHO_ANCHOR[1]) * u;
    const wide = Math.max(0.025, smootherstep(clamp01((info.open - 0.1) / 0.9)));
    const tall = 0.15 + 0.85 * smootherstep(clamp01(info.open / 0.55));
    const size = radius * 2.4, k = size / 384;
    const alpha = info.alpha * 0.9 * smootherstep(clamp01(info.open / 0.65));
    const transition = wide * (1 - wide) * 4;
    const collapse = transition * (info.closing ? 1 : clamp01((1 - info.alpha) * 2.5));
    ctx.save(); echoShadowColor.call(ctx, 'transparent');
    if (info.mirror) { ctx.translate(gx, 0); ctx.scale(-1, 1); ctx.translate(-gx, 0); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(gx, gy); ctx.scale(wide * 1.06 * k, tall * 1.34 * k);
    ctx.globalAlpha = info.gateAlpha; ctx.drawImage(art.gate, -192, -192);
    if (art.worldReady) {
      ctx.save(); ctx.translate(Math.sin(now * 0.00013) * 4, Math.cos(now * 0.00011) * 3);
      ctx.rotate(now * 0.000045); ctx.globalAlpha = info.gateAlpha * (tier === 0 ? 0.5 : 0.44);
      ctx.drawImage(art.world, -192, -192); ctx.restore();
    }
    ctx.save(); ctx.rotate(-now * 0.00009); ctx.globalAlpha = info.gateAlpha * (tier === 0 ? 0.8 : 0.65);
    ctx.drawImage(art.portalDepth, -192, -192); ctx.restore();
    ctx.globalAlpha = info.gateAlpha; ctx.drawImage(art.back, -192, -192);
    ctx.save(); ctx.rotate(-now * 0.00018 + (1 - info.open) * 0.8);
    ctx.globalAlpha = info.gateAlpha * (0.58 + transition * 0.17);
    ctx.drawImage(art.portalClockOuter, -192, -192); ctx.restore();
    ctx.save(); ctx.rotate(now * 0.00031 - (1 - info.open) * 0.5);
    ctx.globalAlpha = info.gateAlpha * (tier === 0 ? 0.54 : 0.38);
    ctx.drawImage(art.portalClockInner, -192, -192); ctx.restore();
    ctx.restore();
    if (alpha > 0.01) {
      const b = art.body, res = art.res;
      ctx.globalAlpha = alpha;
      ctx.drawImage(art.bodies, (index % 5) * b[2] * res, Math.floor(index / 5) * b[3] * res, b[2] * res, b[3] * res,
        gx + (b[0] - ECHO_ANCHOR[0] + lean) * u * wide,
        gy + (b[1] - ECHO_ANCHOR[1]) * u * tall * wide, b[2] * u * wide, b[3] * u * tall * wide);
    }
    ctx.save(); ctx.translate(gx, gy); ctx.scale(wide * 1.06 * k, tall * 1.34 * k);
    ctx.globalAlpha = info.gateAlpha; ctx.drawImage(art.front, -192, -192);
    if (collapse > 0.02) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = info.gateAlpha * collapse * 0.24;
      ctx.drawImage(art.glow, -34, -190, 68, 380);
      if (tier === 0) { ctx.globalAlpha = info.gateAlpha * collapse * 0.15; ctx.drawImage(art.portalClockOuter, -192, -192); }
    }
    ctx.restore();
    if (alpha > 0.01 && poseExt > 0.02) {
      const b = ECHO_ARM, res = art.res, armAlpha = alpha * smootherstep(clamp01(poseExt / 0.35));
      const j = art.portalJoints[index], rx = radius * 1.06 * wide, ry = radius * 1.34 * tall;
      const sx = gx + (j[0] - ECHO_ANCHOR[0] + lean) * u, sy = gy + (j[1] - ECHO_ANCHOR[1]) * u;
      const ex = gx + (j[2] - ECHO_ANCHOR[0] + lean) * u, ey = gy + (j[3] - ECHO_ANCHOR[1]) * u;
      if (!echoPortalBoundarySegment(art, gx, gy, rx, ry, ex, ey, hx, hy, u, armAlpha))
        echoPortalBoundarySegment(art, gx, gy, rx, ry, sx, sy, ex, ey, u, armAlpha);
      ctx.globalAlpha = armAlpha;
      ctx.drawImage(art.arms, (index % 5) * b[2] * res, Math.floor(index / 5) * b[3] * res, b[2] * res, b[3] * res,
        gx + (b[0] - ECHO_ANCHOR[0] + lean) * u, gy + (b[1] - ECHO_ANCHOR[1]) * u, b[2] * u, b[3] * u);
    }
    if (alpha > 0.01 && info.charge > 0.02 && poseExt > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * info.charge * (tier === 0 ? 0.085 : 0.05);
      ctx.drawImage(art.glow, gx + radius * 0.35, gy - radius * 0.2, radius * 1.45, radius * 0.95);
      const count = tier === 0 ? 8 : 4;
      for (let i = 0; i < count; i++) {
        const phase = (now * 0.00065 + i / count) % 1, t = phase * phase, v = 1 - t;
        const a = 0.18 + i / count * Math.PI * 0.75;
        const sx = gx + Math.cos(a) * radius * wide * 0.92, sy = gy + Math.sin(a) * radius * tall * 1.12;
        const bx = gx + radius * 1.02, by = gy + radius * 0.48;
        const x = v * v * sx + 2 * v * t * bx + t * t * hx, y = v * v * sy + 2 * v * t * by + t * t * hy;
        const s = u * (4 + phase * 2.5);
        ctx.globalAlpha = alpha * info.charge * Math.sin(phase * Math.PI) * 0.56;
        ctx.drawImage(art.portalMote, x - s / 2, y - s / 2, s, s);
      }
      const core = u * (2.2 + 3.8 * info.charge), reach = core * 2.8;
      ctx.globalAlpha = alpha * info.charge * 0.46;
      ctx.drawImage(art.glow, hx - reach, hy - reach, reach * 2, reach * 2);
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(-now * 0.0011);
      const seal = u * (8 + info.charge * 8);
      ctx.globalAlpha = alpha * info.charge * (tier === 0 ? 0.76 : 0.68);
      ctx.drawImage(art.portalSeal, -seal, -seal, seal * 2, seal * 2);
      if (tier === 0) {
        ctx.rotate(now * 0.0023); ctx.globalAlpha = alpha * info.charge * 0.24;
        ctx.drawImage(art.portalSeal, -seal * 1.25, -seal * 0.6, seal * 2.5, seal * 1.2);
      }
      ctx.restore(); ctx.globalAlpha = alpha * info.charge * 0.9;
      ctx.drawImage(art.glow, hx - core, hy - core, core * 2, core * 2);
    }
    ctx.restore();
    if (poseExt <= 0.02) return null;
    return { x: info.mirror ? 2 * gx - hx : hx, y: hy, u };
  }

  function drawEchoCast(info, now) {
    if (freezeTier() < 2) return drawEchoCastPortal(info, now);
    return drawEchoCastBase(info, now);
  }

  function drawEchoCastBase(info, now) {
    const art = echoArt;
    if (!art || !art.ready) return null;
    const tier = freezeTier(), gx = info.x, gy = info.y;
    const u = info.box / GRID_W, radius = info.gateR;
    const index = Math.min(art.ready - 1, Math.round(clamp01(info.ext) * art.steps));
    const poseExt = index / art.steps, palm = art.palms[index];
    const retreat = (1 - poseExt) * Math.max(0, 1 - info.open) * 5;
    const lean = Math.sin(poseExt * Math.PI) * 0.7 - retreat;
    const hx = gx + (palm.x - ECHO_ANCHOR[0] + lean) * u;
    const hy = gy + (palm.y - ECHO_ANCHOR[1]) * u;
    const wide = Math.max(0.025, smootherstep(clamp01((info.open - 0.1) / 0.9)));
    const tall = 0.15 + 0.85 * smootherstep(clamp01(info.open / 0.55));
    const size = radius * 2.4, k = size / 384;
    const alpha = info.alpha * 0.9 * smootherstep(clamp01(info.open / 0.65));
    ctx.save(); echoShadowColor.call(ctx, 'transparent');
    if (info.mirror) { ctx.translate(gx, 0); ctx.scale(-1, 1); ctx.translate(-gx, 0); }
    ctx.save(); ctx.translate(gx, gy); ctx.scale(wide * 1.06 * k, tall * 1.34 * k);
    ctx.globalAlpha = info.gateAlpha;
    ctx.drawImage(art.gate, -192, -192);
    if (tier < 2 && art.worldReady) {
      ctx.save(); ctx.rotate(now * 0.00007); ctx.globalAlpha = info.gateAlpha * 0.58;
      ctx.drawImage(art.world, -192, -192); ctx.restore();
    }
    ctx.drawImage(art.back, -192, -192);
    if (tier < 2) { ctx.save(); ctx.rotate(-now * 0.00035); ctx.globalAlpha = info.gateAlpha * 0.8; ctx.drawImage(art.rings, -192, -192); ctx.restore(); }
    ctx.restore();
    if (alpha > 0.01) {
      const b = art.body, res = art.res;
      ctx.globalAlpha = alpha;
      ctx.drawImage(art.bodies, (index % 5) * b[2] * res, Math.floor(index / 5) * b[3] * res, b[2] * res, b[3] * res,
        gx + (b[0] - ECHO_ANCHOR[0] + lean) * u * wide,
        gy + (b[1] - ECHO_ANCHOR[1]) * u * tall * wide, b[2] * u * wide, b[3] * u * tall * wide);
    }
    ctx.save(); ctx.translate(gx, gy); ctx.scale(wide * 1.06 * k, tall * 1.34 * k);
    ctx.globalAlpha = info.gateAlpha; ctx.drawImage(art.front, -192, -192); ctx.restore();
    if (alpha > 0.01 && poseExt > 0.02) {
      const b = ECHO_ARM, res = art.res;
      ctx.globalAlpha = alpha * smootherstep(clamp01(poseExt / 0.35));
      ctx.drawImage(art.arms, (index % 5) * b[2] * res, Math.floor(index / 5) * b[3] * res, b[2] * res, b[3] * res,
        gx + (b[0] - ECHO_ANCHOR[0] + lean) * u, gy + (b[1] - ECHO_ANCHOR[1]) * u, b[2] * u, b[3] * u);
    }
    if (tier < 2 && alpha > 0.01) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * info.charge * (tier === 0 ? 0.09 : 0.05);
      ctx.drawImage(art.glow, gx - radius * 0.3, gy - radius * 0.7, radius * 3.1, radius * 1.4);
      ctx.globalCompositeOperation = 'source-over';
      const count = tier === 0 ? 6 : 3;
      for (let i = 0; i < count; i++) {
        const phase = (now * 0.00025 + i / count) % 1, a = i * 2.4;
        const r = radius * (0.8 + phase * 0.55), s = 3 + phase * 4;
        ctx.globalAlpha = info.gateAlpha * (1 - phase) * 0.6;
        ctx.drawImage(art.dust, gx + Math.cos(a) * r - s / 2, gy + Math.sin(a) * r * 1.2 - s / 2, s, s);
      }
    }
    if (poseExt > 0.02 && info.charge > 0.02) {
      const core = u * (3 + 5 * info.charge), reach = core * 2.3;
      ctx.globalCompositeOperation = tier < 2 ? 'lighter' : 'source-over';
      ctx.globalAlpha = alpha * info.charge * 0.65;
      ctx.drawImage(art.glow, hx - reach, hy - reach, reach * 2, reach * 2);
      ctx.globalAlpha = alpha * info.charge;
      ctx.drawImage(art.glow, hx - core, hy - core, core * 2, core * 2);
    }
    ctx.restore();
    if (poseExt <= 0.02) return null;
    return { x: info.mirror ? 2 * gx - hx : hx, y: hy, u };
  }

  window._kanadeDebugModelDraw = drawKanadeDebugModel;
  window._drawKanadeEchoCast = drawEchoCast;
  window.drawKanadeCutscene = drawKanadeCutscene;
  window._beginKanadeCutscene = beginKanadeCutscene;
  window._KANADE_CUTSCENE_MS = TOTAL_MS;
})();
