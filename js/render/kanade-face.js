// Kanade's face: flat cel colours, drawn in the host's head coordinates.
// Load this classic script before the first character render.
(function () {
  'use strict';

  // Warm sclera and a deeper rose mouth suit the skin; all other colours
  // come from the host palette, including the dark lid shadow and blush.
  const COLOR = Object.freeze({
    sclera: '#fff9f3', mouth: '#af4c6c',
  });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, t) => a + (b - a) * t;

  function eye(api, cx, mode, blink, gx, gy) {
    const c = api.ctx, p = api.PAL;
    const side = cx < 92 ? -1 : 1;
    // Local x runs from the inner corner to the outer corner on both eyes.
    c.save();
    c.translate(cx, 38);
    c.scale(side, 1);
    const wide = mode === 'wide';
    const half = wide ? 2.72 : 2.62;
    // These are Bezier control heights, not ellipse radii. More opening
    // at the centre is essential for the iris to read at 2px/grid unit.
    // Raising the upper controls by 0.4 adds about 0.3 to the visible
    // opening: roughly 10% taller, without widening or moving the iris.
    const top = (mode === 'narrow' ? -1.16 : mode === 'droop' ? -1.50 : wide ? -2.64 : -2.18) - 0.40;
    const bottom = wide ? 2.55 : 2.42;
    const closedMode = mode === 'happy' || mode === 'soft' || mode === 'shut';
    let b = closedMode ? 1 : clamp(Number(blink) || 0, 0, 1);
    if (mode === 'up') b = Math.max(0.16, b);

    const x0 = -half, x1 = half;
    // Narrow the outer half of relaxed eyes; keep the surprised eye wide.
    const end0 = mix(-0.12, 0, b), end1 = mix(wide ? -0.40 : -0.12, -0.15, b);
    const closeCurve = mode === 'happy' ? -1.0 : mode === 'shut' ? 0.8 : 0.63;
    const y1 = mix(top - 0.08, closeCurve, b);
    const y2 = mix(top + (wide ? 0.02 : 0.50), closeCurve, b);
    // The lower boundary converges too: no tiny blue remnant at full blink.
    const low1 = mix(bottom + 0.22, closeCurve, b);
    const low2 = mix(bottom + (wide ? 0.12 : -0.38), closeCurve, b);
    const aperture = () => {
      c.beginPath();
      c.moveTo(x0, end0);
      c.bezierCurveTo(-1.45, y1, 1.05, y2, x1, end1);
      c.bezierCurveTo(1.50, low2, -1.5, low1, x0, end0);
      c.closePath();
    };

    if (b < 1) {
      c.save();
      aperture();
      c.fillStyle = COLOR.sclera; c.fill(); c.clip();
      // The iris moves inside an eye-shaped clip. Its own inner clip keeps
      // the curved blue and cyan bands inside a 0.35-unit dark outer rim.
      const ox = clamp(Number(gx) || 0, -1, 1) * 0.47 * side;
      const oy = clamp(Number(gy) || 0, -1, 1) * 0.30 - (mode === 'up' ? 0.16 : 0);
      const iy = 0.24 + oy;
      api.ellipseF(ox, iy, 1.88, 2.04, p.lid);
      c.save();
      c.beginPath(); c.ellipse(ox, iy, 1.53, 1.72, 0, 0, Math.PI * 2); c.clip();
      api.ellipseF(ox, iy, 1.53, 1.72, p.eyeDeep);
      // Bring blue above the pupil centre: the upper dark tier occupies
      // about 40% of the visible, open iris rather than most of its height.
      api.bezierShape([ox - 1.65, iy - 0.20], [
        [ox - 0.75, iy - 0.58, ox + 0.72, iy - 0.58, ox + 1.65, iy - 0.20],
        [ox + 1.9, iy + 2.5, ox - 1.9, iy + 2.5, ox - 1.65, iy - 0.20],
      ], p.eyeBlue);
      // A broad, curved cyan base remains readable at 2px per grid unit.
      api.bezierShape([ox - 1.48, iy + 0.70], [
        [ox - 0.75, iy + 0.35, ox + 0.75, iy + 0.35, ox + 1.48, iy + 0.70],
        [ox + 0.8, iy + 2.18, ox - 0.8, iy + 2.18, ox - 1.48, iy + 0.70],
      ], p.eyeLight);
      api.ellipseF(ox, iy - 0.13, 0.63, 0.87, p.lid);
      c.restore();
      // One narrow navy lid shadow crosses both sclera and iris, following
      // the current lid. No pale overlay can wash out the dark iris tier.
      api.bezierShape([x0 - 0.1, end0 - 0.7], [
        [-1.45, y1 - 0.7, 1.05, y2 - 0.7, x1 + 0.1, end1 - 0.7],
        [1.05, y2 + 0.28, -1.45, y1 + 0.28, x0 - 0.1, end0 + 0.14],
      ], p.lid);
      // Gate-side catchlight has the same screen direction in both eyes.
      // An iris clip prevents highlights escaping into the sclera at gaze
      // extremes; the eye clip above still covers them during a blink.
      c.save();
      c.beginPath(); c.ellipse(ox, iy, 1.88, 2.04, 0, 0, Math.PI * 2); c.clip();
      api.ellipseF(ox + 0.56 * side, iy - 0.80, 0.61, 0.54, p.eyeHi);
      api.ellipseF(ox - 0.60 * side, iy + 1.11, 0.25, 0.22, p.eyeHi);
      c.restore();
      c.restore();
    }

    // Filled lash tapers at the inner corner and becomes fuller outside.
    const thick = mix(1.66, 0.46, b);
    api.bezierShape([x0, end0], [
      [-1.45, y1, 1.05, y2, x1, end1],
      [1.14, y2 - thick, -1.20, y1 - thick * 0.75, x0, end0],
    ], p.lid);
    if (b > 0.65) api.bezierLine([x0, end0], [[-1.45, y1, 1.05, y2, x1, end1]], p.lid, 0.40 * (b - 0.65) / 0.35);
    const tail = (1 - b) * 0.70 + 0.18;
    api.bezierShape([1.65, mix(top * 0.52, 0.20, b)], [
      [2.15, end1 - 0.14, 2.53, end1 - 0.28, x1 + tail, end1 - tail * 0.60],
      [x1 + 0.18, end1 + 0.18, 2.0, end1 + 0.14, 1.65, mix(top * 0.52, 0.20, b)],
    ], p.lid);
    if (b < 0.65) {
      api.bezierLine([1.08, mix(1.55, 0.52, b)], [[1.48, mix(1.39, 0.36, b), 1.90, 0.72, 2.10, 0.43]], p.hairShadow, 0.40 * (1 - b / 0.65));
    }
    c.restore();
  }

  function brows(api, style) {
    const c = api.ctx;
    for (const side of [-1, 1]) {
      c.save(); c.translate(92, 0); c.scale(side, 1);
      // Raised 0.3 off the lashes, the tail 0.1 more, for a softer arch.
      let inner = 34.58, outer = 34.72;
      if (style === 'raised') { inner -= 0.95; outer -= 0.85; }
      if (style === 'down') { inner += 0.45; outer += 0.08; }
      if (style === 'angryIn') { inner += 0.92; outer -= 0.35; }
      if (style === 'sadIn') { inner -= 0.96; outer += 0.45; }
      // Outer tip stops above the outer lash, not beyond the eye. The
      // 4.8-unit arch has a fuller inner third and a sharply tapered tail.
      api.bezierShape([2.40, inner], [
        [3.5, inner - 0.82, 5.40, outer - 0.74, 7.20, outer],
        [5.34, outer - 0.03, 3.60, inner + 0.14, 2.40, inner],
      ], api.PAL.hairShadow);
      c.restore();
    }
  }

  function mouth(api, style) {
    const c = COLOR.mouth;
    if (style === 'open') {
      api.ellipseF(92, 44.54, 0.78, 0.98, api.PAL.indigoDeep);
      api.ellipseF(92, 45.01, 0.49, 0.28, api.PAL.blush);
      return;
    }
    if (style === 'tense') {
      api.bezierShape([90.72, 44.55], [[91.4, 44.18, 92.65, 44.2, 93.28, 44.48], [92.5, 45.02, 91.45, 45.02, 90.72, 44.55]], c);
      return;
    }
    if (style === 'flat') {
      api.bezierLine([90.95, 44.55], [[91.6, 44.65, 92.45, 44.65, 93.05, 44.55]], c, 0.50);
      return;
    }
    if (style === 'frown') {
      api.bezierLine([90.90, 44.91], [[91.5, 44.26, 92.55, 44.26, 93.12, 44.80]], c, 0.50);
      return;
    }
    const soft = style === 'soft', smirk = style === 'smirk', smile = style === 'smile';
    const w = soft ? 0.97 : smile ? 1.58 : 1.29;
    const right = smirk ? 44.20 : 44.52;
    const dip = soft ? 45.17 : smile ? 45.65 : 45.36;
    api.bezierShape([92 - w, 44.54], [
      [91.45, dip, 92.61, dip, 92 + w, right],
      [92.65, dip - 0.33, 91.40, dip - 0.31, 92 - w, 44.54],
    ], c);
    api.bezierLine([92 - w, 44.54], [[91.45, dip, 92.61, dip, 92 + w, right]], c, 0.50);
  }

  function drawFeatures(api, face) {
    const mode = face.eye || 'open';
    // Keep the host's original blush colour. Larger patches, half a unit
    // higher and inward, put the accent just below each outer eye corner.
    for (const x of [85.05, 98.95]) {
      api.ellipseF(x, 40.9, 2.139, 0.805, api.PAL.blush);
    }
    const b = face.openEye === false ? 0 : face.blink;
    eye(api, 88, mode, b, face.gazeX, face.gazeY);
    eye(api, 96, mode, b, face.gazeX, face.gazeY);
    brows(api, face.brow || 'flat');
    api.bezierLine([92.36, 41.91], [[92.25, 42.10, 92.08, 42.23, 92.30, 42.38]], api.PAL.skinShadow, 0.44);
    api.ctx.save();
    api.ctx.translate(92, 44.6);
    api.ctx.scale(1.15, 1);
    api.ctx.translate(-92, -44.6);
    mouth(api, face.mouth || 'neutral');
    api.ctx.restore();
  }

  window.KanadeFace = { drawFeatures };
})();
