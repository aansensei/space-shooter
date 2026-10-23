(function () {
const PAL = { VOID: '#07020F', ABYSS: '#190B30', VIOLET: '#BD8CFF', MAGENTA: '#E7A0FF', LILAC: '#FFF6E9', EMBER: '#DFFF85' };
const NUM_SEGMENTS = 10, _glowCache = {}, _strikeAngles = [-0.35, 0.38, -0.18, 0.22];
const _dash = [10, 8], _emptyDash = [];
const _tyFlowDash = [10, 16];
const _tyVortexImage = new Image();
const _tyVortexStamp = document.createElement('canvas');
_tyVortexStamp.width = _tyVortexStamp.height = 384;
let _tyVortexReady = false;
_tyVortexImage.onload = function () {
    if (_tyVortexReady || !_tyVortexImage.complete || !_tyVortexImage.naturalWidth) return;
    const g = _tyVortexStamp.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(_tyVortexImage, 0, 0, 384, 384);
    _tyVortexReady = true;
};
_tyVortexImage.src = 'assets/images/game/sigils/ty-vortex-abyss.png';
const _tyVortexSpirals = new Path2D();
// Positive dash phases carry the flow toward the core.
for (let arm = 0; arm < 3; arm++) {
    for (let step = 48; step >= 0; step--) {
        const t = step / 48, r = 170 * 0.9 * Math.exp(Math.log(0.21 / 0.9) * t);
        const a = arm * Math.PI * 2 / 3 + t * Math.PI * 2.5;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (step === 48) _tyVortexSpirals.moveTo(x, y);
        else _tyVortexSpirals.lineTo(x, y);
    }
}

function _tyVortexLoaded() {
    return _tyVortexReady && _tyVortexImage.complete && _tyVortexImage.naturalWidth > 0;
}

function _drawTyVortexBase(ctx, elapsed, tier, radius, masterAlpha) {
    if (tier >= 3 || !_tyVortexLoaded() || (window._fxOpts && window._fxOpts.sigilBackdrop === false)) return;
    let scale, rotation, fade = 1;
    if (elapsed < 180) {
        scale = 0.6 + 0.4 * elapsed / 180;
        rotation = -elapsed * 0.00055;
    } else if (elapsed < 1430) {
        const p = (elapsed - 180) / 1250;
        scale = 1 - p * 0.1;
        rotation = -(0.099 + 1250 * (0.0008 * p + 0.0014 * p * p));
    } else {
        const p = Math.min(1, (elapsed - 1430) / 480);
        scale = 0.9 + 0.35 * (1 - (1 - p) * (1 - p));
        rotation = -(2.849 + (elapsed - 1430) * 0.0036);
        fade = 1 - p;
    }
    const size = radius * 2.1 * scale;
    ctx.save(); ctx.rotate(rotation);
    ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.75 * fade;
    ctx.drawImage(_tyVortexStamp, -size / 2, -size / 2, size, size);
    if (tier <= 1) {
        ctx.rotate(-2 * rotation);
        ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.35 * fade;
        ctx.drawImage(_tyVortexStamp, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    }
    ctx.restore();
}

function _drawTyVortexPull(ctx, elapsed, tier, radius, core, masterAlpha) {
    if (elapsed < 180 || elapsed >= 1490) return;
    ctx.save();
    if (elapsed < 1430 && tier <= 1 && (!window._fxOpts || window._fxOpts.particles !== false)) {
        ctx.save(); ctx.rotate(-(elapsed - 180) * 0.0012); ctx.scale(radius / 170, radius / 170);
        ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.5;
        ctx.strokeStyle = PAL.VIOLET; ctx.lineWidth = 1.4 * 170 / radius;
        ctx.setLineDash(_tyFlowDash); ctx.lineDashOffset = (elapsed - 180) * 0.09;
        ctx.stroke(_tyVortexSpirals);
        ctx.setLineDash(_emptyDash); ctx.lineDashOffset = 0;
        ctx.restore();
    }
    for (let tick = 0; tick < 4; tick++) {
        const age = elapsed - (430 + tick * 250);
        if (age >= 0 && age < 240) {
            const p = age / 240, r = radius * 0.95 + (core - radius * 0.95) * p;
            ctx.globalAlpha = _tyBrightness() * masterAlpha * (1 - p) * 0.9;
            ctx.strokeStyle = PAL.MAGENTA; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        } else if (age >= 240 && age < 310 && tier <= 1 && (!window._fxOpts || window._fxOpts.glow !== false)) {
            const flash = Math.sin((age - 240) / 70 * Math.PI);
            ctx.globalAlpha = _tyBrightness() * masterAlpha * flash * 0.6;
            ctx.strokeStyle = PAL.LILAC; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, core, 0, Math.PI * 2); ctx.stroke();
        }
    }
    ctx.restore();
}

function _drawTyVortexBurst(ctx, elapsed, tier, radius, masterAlpha) {
    const age = elapsed - 1430;
    if (tier >= 3 || age < 0 || age >= 260) return;
    ctx.save();
    if (age < 200 && _tyVortexLoaded() && (!window._fxOpts || (window._fxOpts.glow !== false && window._fxOpts.sigilBackdrop !== false))) {
        const p = Math.min(1, age / 480), size = radius * 2.1 * (0.9 + 0.35 * (1 - (1 - p) * (1 - p)));
        ctx.save(); ctx.rotate(-(2.849 + age * 0.0036));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = _tyBrightness() * masterAlpha * 0.6 * (1 - age / 200);
        ctx.drawImage(_tyVortexStamp, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
    const p = age / 260, ease = 1 - Math.pow(1 - p, 3);
    const head = radius * (0.08 + 0.62 * ease), tail = Math.max(0, head - radius * 0.28 * (1 - p));
    const width = 2.8 * (1 - p);
    ctx.globalAlpha = _tyBrightness() * masterAlpha * (1 - p);
    ctx.fillStyle = PAL.LILAC; ctx.strokeStyle = PAL.MAGENTA; ctx.lineWidth = 1.25;
    for (let ray = 0; ray < 8; ray++) {
        const a = ray * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
        ctx.beginPath(); ctx.moveTo(c * head, s * head);
        ctx.lineTo(c * tail - s * width, s * tail + c * width);
        ctx.lineTo(c * (tail + head) * 0.5, s * (tail + head) * 0.5);
        ctx.lineTo(c * tail + s * width, s * tail - c * width);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
}
const MAX_VORTEX_PARTICLES = 28;
const vortexParticles = Array.from({ length: MAX_VORTEX_PARTICLES }, (_, i) => ({ angle: i / 28 * Math.PI * 2, distRatio: i % 7 / 7, speed: 0.65 + i % 4 * 0.18, size: 2 + i % 3 * 1.1 }));
let viewW = 1280, viewH = 800, tyClock = 0;
const _fxContext = ctx;
  function _getGlowSprite(key, size, innerCol, midCol, outerCol) {
    if (_glowCache[key]) return _glowCache[key];
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var gctx = c.getContext('2d');
    var half = size * 0.5;
    var grad = gctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, innerCol);
    grad.addColorStop(0.38, midCol);
    grad.addColorStop(1.0, outerCol);
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, size, size);
    _glowCache[key] = c;
    return c;
  }
  function _initGlowSprites() {
    _getGlowSprite('violet',  128, 'rgba(209,75,255,0.85)',  'rgba(139,61,255,0.38)', 'rgba(43,11,82,0)');
    _getGlowSprite('magenta', 128, 'rgba(239,220,255,0.92)', 'rgba(209,75,255,0.48)', 'rgba(139,61,255,0)');
    _getGlowSprite('lilac',    96, 'rgba(255,255,255,0.98)', 'rgba(239,220,255,0.58)','rgba(209,75,255,0)');
    _getGlowSprite('ember',    64, 'rgba(255,235,170,0.95)', 'rgba(255,207,107,0.5)', 'rgba(255,140,40,0)');
    _getGlowSprite('abyss',   256, 'rgba(43,11,82,0.82)',    'rgba(7,2,15,0.65)',     'rgba(7,2,15,0)');
  }
  function _drawGlow(ctx, key, x, y, radius, alpha) {
    if (alpha <= 0.01 || (window._fxOpts && window._fxOpts.glow === false)) return;
    var sp = _glowCache[key];
    if (!sp) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = _tyBrightness() * (alpha);
    ctx.drawImage(sp, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }
  function drawHacViemRing(ctx, x, y, timeMs, gfx, chargeRatio, ringOrder) {
    var isMobile = (viewW < 600 || viewH < 500);
    var scale = isMobile ? 0.86 : 1.0;
    var baseRadius = ringOrder;
    var segments = 10;
    var fullFloat = Math.max(0, Math.min(1, chargeRatio)) * segments;
    var fullCount = Math.floor(fullFloat);
    var partial = fullFloat - fullCount;
    var isReady = (chargeRatio >= 0.999);
    ctx.save();
    ctx.translate(x, y);
    var breathe = isReady ? (1.0 + 0.045 * Math.sin(timeMs * 0.0045)) : 1.0;
    var r = baseRadius * breathe;
    if (isReady && gfx <= 2) {
      _drawGlow(ctx, 'violet', 0, 0, r * 1.65, 0.32 + 0.12 * Math.sin(timeMs * 0.005));
    }
    var arcSpan = (Math.PI * 2) / segments;
    var gap = 0.095;
    ctx.lineCap = 'round';
    for (var i = 0; i < segments; i++) {
      var a0 = -Math.PI * 0.5 + i * arcSpan + gap * 0.5;
      var a1 = -Math.PI * 0.5 + (i + 1) * arcSpan - gap * 0.5;
      if (i < fullCount) {
        if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
          ctx.beginPath();
          ctx.arc(0, 0, r, a0, a1);
          ctx.strokeStyle = PAL.VOID;
          ctx.lineWidth = 4.2;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a1);
        ctx.strokeStyle = isReady ? PAL.MAGENTA : PAL.VIOLET;
        ctx.lineWidth = isReady ? 2.2 : 1.8;
        ctx.stroke();
        if (isReady && gfx <= 1) {
          var mx = Math.cos((a0 + a1) * 0.5) * r;
          var my = Math.sin((a0 + a1) * 0.5) * r;
          ctx.fillStyle = PAL.LILAC;
          ctx.beginPath();
          ctx.arc(mx, my, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (i === fullCount && partial > 0.02) {
        var ap = a0 + (a1 - a0) * partial;
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, ap);
        ctx.strokeStyle = PAL.VIOLET;
        ctx.globalAlpha = _tyBrightness() * (0.35 + 0.65 * partial);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        if (gfx <= 2) {
          var tipX = Math.cos(ap) * r;
          var tipY = Math.sin(ap) * r;
          ctx.fillStyle = PAL.LILAC;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = _tyBrightness() * (1.0);
      } else if (i <= 2 && fullCount === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a1);
        ctx.strokeStyle = PAL.VIOLET;
        ctx.globalAlpha = _tyBrightness() * (0.09);
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.globalAlpha = _tyBrightness() * (1.0);
      }
    }
    if (isReady && gfx <= 2) {
      var flameCount = (gfx === 0) ? 10 : 6;
      for (var fi = 0; fi < flameCount; fi++) {
        var baseAng = (fi / flameCount) * Math.PI * 2 + timeMs * 0.0012;
        var wave = Math.sin(timeMs * 0.008 + fi * 1.7);
        var tongueLen = (6.5 + 3.5 * Math.sin(timeMs * 0.006 + fi * 2.3)) * scale;
        var bx1 = Math.cos(baseAng - 0.08) * (r + 1);
        var by1 = Math.sin(baseAng - 0.08) * (r + 1);
        var bx2 = Math.cos(baseAng + 0.08) * (r + 1);
        var by2 = Math.sin(baseAng + 0.08) * (r + 1);
        var tx = Math.cos(baseAng + wave * 0.07) * (r + tongueLen);
        var ty = Math.sin(baseAng + wave * 0.07) * (r + tongueLen);
        ctx.beginPath();
        ctx.moveTo(bx1, by1);
        ctx.quadraticCurveTo(
          Math.cos(baseAng) * (r + tongueLen * 0.55),
          Math.sin(baseAng) * (r + tongueLen * 0.55),
          tx, ty
        );
        ctx.quadraticCurveTo(
          Math.cos(baseAng) * (r + tongueLen * 0.45),
          Math.sin(baseAng) * (r + tongueLen * 0.45),
          bx2, by2
        );
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = (fi % 2 === 0) ? PAL.MAGENTA : PAL.VIOLET;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawDetonation(ctx, x, y, elapsedMs, gfx, shardsPool) {
    ctx.save();
    if (elapsedMs >= 0 && elapsedMs <= 560) {
      var biteDuration = 120;
      var biteIdx = Math.min(3, Math.floor(elapsedMs / biteDuration));
      var biteLocal = (elapsedMs - biteIdx * biteDuration) / biteDuration;
      var fadeOut = (elapsedMs > 480) ? Math.max(0, 1 - (elapsedMs - 480) / 80) : 1.0;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = _tyBrightness() * (fadeOut);
      var shadowR = 32 * (0.85 + 0.15 * Math.sin(elapsedMs * 0.02));
      if (gfx <= 2) {
        _drawGlow(ctx, 'abyss', 0, 10, shadowR * 1.35, 0.85);
      }
      ctx.beginPath();
      ctx.ellipse(0, 12, shadowR, shadowR * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAL.VOID;
      ctx.fill();
      ctx.strokeStyle = PAL.VIOLET;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      var strikeAngles = _strikeAngles;
      var sAng = strikeAngles[biteIdx];
      var lungeOffset = Math.sin(biteLocal * Math.PI) * 22;
      ctx.save();
      ctx.rotate(sAng);
      ctx.translate(0, 16 - lungeOffset);
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(-16, -6);
      ctx.lineTo(-11, 18);
      ctx.lineTo(11, 18);
      ctx.lineTo(16, -6);
      ctx.closePath();
      ctx.fillStyle = PAL.VOID;
      ctx.fill();
      ctx.strokeStyle = PAL.MAGENTA;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = PAL.EMBER;
      ctx.beginPath();
      ctx.moveTo(-9, -8); ctx.lineTo(-4, -12); ctx.lineTo(-5, -5); ctx.closePath();
      ctx.moveTo(9, -8);  ctx.lineTo(4, -12);  ctx.lineTo(5, -5);  ctx.closePath();
      ctx.fill();
      ctx.restore();
      var fangSnap = Math.sin(biteLocal * Math.PI);
      var jawGap = 18 * (1.0 - 0.72 * fangSnap);
      if (gfx <= 1 && fangSnap > 0.45) {
        _drawGlow(ctx, 'lilac', 0, 0, 38, (fangSnap - 0.4) * 0.9);
      }
      ctx.strokeStyle = PAL.LILAC;
      ctx.fillStyle = PAL.LILAC;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-14, -jawGap - 6);
      ctx.lineTo(-8, -jawGap + 8);
      ctx.lineTo(-3, -jawGap - 4);
      ctx.lineTo(3, -jawGap - 4);
      ctx.lineTo(8, -jawGap + 8);
      ctx.lineTo(14, -jawGap - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, jawGap + 6);
      ctx.lineTo(-7, jawGap - 6);
      ctx.lineTo(0, jawGap + 3);
      ctx.lineTo(7, jawGap - 6);
      ctx.lineTo(12, jawGap + 6);
      ctx.stroke();
      if (fangSnap > 0.55) {
        var slashLen = 22 * fangSnap;
        ctx.strokeStyle = (biteIdx % 2 === 0) ? PAL.LILAC : PAL.MAGENTA;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-slashLen, -slashLen * 0.6);
        ctx.lineTo(slashLen, slashLen * 0.6);
        ctx.moveTo(slashLen, -slashLen * 0.6);
        ctx.lineTo(-slashLen, slashLen * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (elapsedMs >= 480 && elapsedMs <= 760) {
      var burstT = (elapsedMs - 480) / 280;
      var burstAlpha = 1.0 - burstT;
      ctx.save();
      ctx.translate(x, y);
      if (gfx <= 2) {
        _drawGlow(ctx, 'magenta', 0, 0, 64 * (0.5 + burstT * 0.7), burstAlpha * 0.75);
      }
      ctx.strokeStyle = PAL.LILAC;
      ctx.globalAlpha = _tyBrightness() * (burstAlpha);
      ctx.lineWidth = 2.2 * (1 - burstT * 0.5);
      var arm = 18 + burstT * 52;
      ctx.beginPath();
      ctx.moveTo(-arm, -arm); ctx.lineTo(arm, arm);
      ctx.moveTo(arm, -arm);  ctx.lineTo(-arm, arm);
      ctx.stroke();
      ctx.restore();
    }
    if (shardsPool) {
      for (var i = 0; i < shardsPool.length; i++) {
        var sh = shardsPool[i];
        if (!sh.active) continue;
        var age = tyClock - sh.spawnTime;
        var lifeRatio = Math.max(0, Math.min(1, 1 - age / sh.lifeMs));
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.angle);
        ctx.globalAlpha = _tyBrightness() * (lifeRatio);
        if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(-30, -4);
          ctx.lineTo(-24, 0);
          ctx.lineTo(-30, 4);
          ctx.closePath();
          ctx.fillStyle = PAL.ABYSS;
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(-26, 0);
          ctx.strokeStyle = PAL.VIOLET;
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }
        if (gfx <= 2) {
          _drawGlow(ctx, 'violet', 0, 0, 20, 0.55 * lifeRatio);
        }
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-2, -6.5);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-2, 6.5);
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 1.75;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(2, -2.2);
        ctx.lineTo(2, 2.2);
        ctx.closePath();
        ctx.fillStyle = PAL.LILAC;
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawPhapTran(ctx, x, y, elapsedMs, gfx, radius) {
    if (elapsedMs < 0 || elapsedMs > 1950) return;
    var R = radius || 170;
    var drawProgress = Math.min(1.0, elapsedMs / 180);
    var fadeAlpha = 1.0;
    if (elapsedMs > 1430) {
      fadeAlpha = Math.max(0, 1.0 - (elapsedMs - 1430) / 500);
    }
    var masterAlpha = fadeAlpha * 0.88;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = _tyBrightness() * (masterAlpha);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (gfx <= 2) {
      _drawGlow(ctx, 'abyss', 0, 0, R * 1.08 * drawProgress, 0.55 * masterAlpha);
    }
    _drawTyVortexBase(ctx, elapsedMs, gfx, R, masterAlpha);
    var rotSlow = elapsedMs * 0.00038;
    var maxSweep = Math.PI * 2 * drawProgress;
    var rStar = R;
    ctx.beginPath();
    ctx.arc(0, 0, rStar, -Math.PI * 0.5, -Math.PI * 0.5 + maxSweep);
    ctx.strokeStyle = PAL.VIOLET;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rStar - 8, Math.PI * 0.5, Math.PI * 0.5 - maxSweep, true);
    ctx.strokeStyle = 'rgba(139, 61, 255, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    var numStars = Math.floor(28 * drawProgress);
    var ducStarIdx = 7;
    for (var si = 0; si < numStars; si++) {
      var sAng = -Math.PI * 0.5 + (si / 28) * Math.PI * 2 + rotSlow * 0.5;
      var sx = Math.cos(sAng) * (rStar - 4);
      var sy = Math.sin(sAng) * (rStar - 4);
      if (si === ducStarIdx) {
        if (gfx <= 2) {
          _drawGlow(ctx, 'ember', sx, sy, 14, 0.85 * masterAlpha);
        }
        ctx.fillStyle = PAL.EMBER;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 5.5);
        ctx.lineTo(sx + 4, sy);
        ctx.lineTo(sx, sy + 5.5);
        ctx.lineTo(sx - 4, sy);
        ctx.closePath();
        ctx.fill();
      } else if (gfx <= 2 || si % 2 === 0) {
        ctx.fillStyle = (si % 4 === 0) ? PAL.LILAC : PAL.VIOLET;
        ctx.beginPath();
        ctx.arc(sx, sy, (si % 4 === 0) ? 2.1 : 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    var rSealOuter = R * 0.84;
    var rSealInner = R * 0.70;
    ctx.beginPath();
    ctx.arc(0, 0, rSealOuter, 0, maxSweep);
    ctx.strokeStyle = PAL.MAGENTA;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rSealInner, 0, maxSweep);
    ctx.strokeStyle = PAL.VIOLET;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    if (gfx <= 2) {
      var tickCount = Math.floor(36 * drawProgress);
      ctx.beginPath();
      for (var ti = 0; ti < tickCount; ti++) {
        var tAng = (ti / 36) * Math.PI * 2 - rotSlow * 0.8;
        var tickLen = (ti % 3 === 0) ? 6 : 3;
        ctx.moveTo(Math.cos(tAng) * rSealOuter, Math.sin(tAng) * rSealOuter);
        ctx.lineTo(Math.cos(tAng) * (rSealOuter - tickLen), Math.sin(tAng) * (rSealOuter - tickLen));
      }
      ctx.strokeStyle = 'rgba(209, 75, 255, 0.58)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
    if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
      var glyphCount = Math.floor(12 * drawProgress);
      var rGlyphMid = (rSealOuter + rSealInner) * 0.5;
      ctx.strokeStyle = PAL.LILAC;
      ctx.lineWidth = 1.25;
      for (var gi = 0; gi < glyphCount; gi++) {
        var gAng = (gi / 12) * Math.PI * 2 - rotSlow;
        ctx.save();
        ctx.rotate(gAng);
        ctx.translate(rGlyphMid, 0);
        ctx.beginPath();
        if (gi % 3 === 0) {
          ctx.moveTo(-4, -6); ctx.lineTo(4, -6);
          ctx.moveTo(0, -6);  ctx.lineTo(0, 6);
          ctx.moveTo(-4, 0);  ctx.lineTo(4, 2);
          ctx.moveTo(-3, 6);  ctx.lineTo(3, 6);
        } else if (gi % 3 === 1) {
          ctx.moveTo(-4, -5); ctx.lineTo(0, -2); ctx.lineTo(4, -5);
          ctx.moveTo(-3, 0);  ctx.lineTo(3, 0);
          ctx.moveTo(0, -2);  ctx.lineTo(-3, 5);
          ctx.moveTo(1, 2);   ctx.lineTo(4, 5);
        } else {
          ctx.rect(-3.5, -5, 7, 4);
          ctx.moveTo(0, -1);  ctx.lineTo(0, 6);
          ctx.moveTo(-4, 3);  ctx.lineTo(4, 3);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    var rOuro = R * 0.52;
    var ouroRot = rotSlow * 1.4;
    ctx.save();
    ctx.rotate(ouroRot);
    var ouroSteps = Math.floor(32 * drawProgress);
    if (ouroSteps > 2) {
      ctx.beginPath();
      for (var oi = 0; oi <= ouroSteps; oi++) {
        var oa = (oi / 32) * (Math.PI * 1.88);
        var waveR = rOuro + Math.sin(oi * 0.9) * 3.5;
        var ox = Math.cos(oa) * waveR;
        var oy = Math.sin(oa) * waveR;
        if (oi === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.strokeStyle = PAL.VOID;
      ctx.lineWidth = 6.5;
      ctx.stroke();
      ctx.strokeStyle = PAL.VIOLET;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      if (gfx <= 2) {
        ctx.beginPath();
        for (var vi = 2; vi < ouroSteps; vi += 3) {
          var va = (vi / 32) * (Math.PI * 1.88);
          ctx.moveTo(Math.cos(va) * (rOuro - 4), Math.sin(va) * (rOuro - 4));
          ctx.lineTo(Math.cos(va + 0.05) * (rOuro + 4), Math.sin(va + 0.05) * (rOuro + 4));
        }
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(rOuro, 0);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-7, 4);
      ctx.lineTo(0, 9);
      ctx.lineTo(7, 4);
      ctx.closePath();
      ctx.fillStyle = PAL.VOID;
      ctx.fill();
      ctx.strokeStyle = PAL.LILAC;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = PAL.EMBER;
      ctx.fillRect(-3.5, 0, 2, 2);
      ctx.fillRect(1.5, 0, 2, 2);
      ctx.restore();
    }
    ctx.restore();
    var rCore = R * 0.21;
    var pullPulse = (elapsedMs >= 180 && elapsedMs < 1430)
      ? (1.0 + 0.18 * Math.sin((elapsedMs - 180) * 0.018))
      : 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, rCore * pullPulse, 0, Math.PI * 2);
    ctx.fillStyle = PAL.VOID;
    ctx.fill();
    ctx.strokeStyle = PAL.MAGENTA;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -rCore * 0.78);
    ctx.quadraticCurveTo(rCore * 0.42, 0, 0, rCore * 0.78);
    ctx.quadraticCurveTo(-rCore * 0.42, 0, 0, -rCore * 0.78);
    ctx.closePath();
    ctx.fillStyle = PAL.ABYSS;
    ctx.fill();
    ctx.strokeStyle = PAL.LILAC;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -rCore * 0.45);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(0, rCore * 0.45);
    ctx.lineTo(-3.5, 0);
    ctx.closePath();
    ctx.fillStyle = PAL.EMBER;
    ctx.fill();
    _drawTyVortexPull(ctx, elapsedMs, gfx, R, rCore, masterAlpha);
    if (elapsedMs >= 180 && elapsedMs < 1430) {
      var riftT = Math.min(1.0, (elapsedMs - 180) / 160);
      var riftLen = R * 0.94 * riftT;
      for (var ri = 0; ri < 2; ri++) {
        ctx.save();
        ctx.rotate(ri === 0 ? Math.PI * 0.25 : -Math.PI * 0.25);
        ctx.beginPath();
        ctx.moveTo(-riftLen, 0);
        ctx.lineTo(-riftLen * 0.6, -5.5);
        ctx.lineTo(-riftLen * 0.2, 4.0);
        ctx.lineTo(0, -6.5);
        ctx.lineTo(riftLen * 0.3, 5.0);
        ctx.lineTo(riftLen * 0.65, -4.5);
        ctx.lineTo(riftLen, 0);
        ctx.lineTo(riftLen * 0.65, 4.5);
        ctx.lineTo(riftLen * 0.3, -2.5);
        ctx.lineTo(0, 6.5);
        ctx.lineTo(-riftLen * 0.2, -3.5);
        ctx.lineTo(-riftLen * 0.6, 5.5);
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 1.9;
        ctx.stroke();
        if (gfx <= 2) {
          ctx.beginPath();
          ctx.moveTo(-riftLen * 0.85, 0);
          ctx.lineTo(0, -2.5);
          ctx.lineTo(riftLen * 0.85, 0);
          ctx.strokeStyle = PAL.LILAC;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
        ctx.restore();
      }
      if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
        var pCount = (gfx === 0) ? MAX_VORTEX_PARTICLES : 14;
        var suckTime = (elapsedMs - 180) * 0.001;
        for (var pi = 0; pi < pCount; pi++) {
          var vp = vortexParticles[pi];
          var curRatio = 1.0 - ((vp.distRatio + suckTime * vp.speed) % 1.0);
          var pDist = curRatio * (R * 0.92);
          var pAng = vp.angle + (1.0 - curRatio) * 3.2 + suckTime * 1.5;
          var px = Math.cos(pAng) * pDist;
          var py = Math.sin(pAng) * pDist;
          var tx = Math.cos(pAng - 0.16) * (pDist + 12);
          var ty = Math.sin(pAng - 0.16) * (pDist + 12);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = (pi % 3 === 0) ? PAL.LILAC : PAL.MAGENTA;
          ctx.lineWidth = vp.size * 0.75;
          ctx.stroke();
        }
      }
    }
    if (elapsedMs >= 1430) {
      _drawTyVortexBurst(ctx, elapsedMs, gfx, R, masterAlpha);
      var expT = Math.min(1.0, (elapsedMs - 1430) / 480);
      var expAlpha = 1.0 - expT;
      if (gfx <= 2) {
        _drawGlow(ctx, 'magenta', 0, 0, R * (0.45 + expT * 0.75), expAlpha * 0.85);
        _drawGlow(ctx, 'lilac', 0, 0, R * 0.35 * (1 - expT * 0.5), expAlpha * 0.9);
      }
      var waveR = R * (0.18 + 0.86 * Math.pow(expT, 0.65));
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.LILAC;
      ctx.lineWidth = 3.2 * (1 - expT * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, waveR * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.MAGENTA;
      ctx.lineWidth = 1.8 * (1 - expT * 0.5);
      ctx.stroke();
      var pillarH = R * 1.15 * Math.sin(expT * Math.PI);
      var pillarW = 36 * (1.0 - expT * 0.65);
      if (pillarH > 4) {
        ctx.beginPath();
        ctx.moveTo(-pillarW, 12);
        ctx.quadraticCurveTo(-pillarW * 0.45, -pillarH * 0.5, 0, -pillarH);
        ctx.quadraticCurveTo(pillarW * 0.45, -pillarH * 0.5, pillarW, 12);
        ctx.quadraticCurveTo(0, 26, -pillarW, 12);
        ctx.closePath();
        ctx.fillStyle = PAL.VOID;
        ctx.fill();
        ctx.strokeStyle = PAL.MAGENTA;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-pillarW * 0.45, 6);
        ctx.lineTo(0, -pillarH * 0.82);
        ctx.lineTo(pillarW * 0.45, 6);
        ctx.strokeStyle = PAL.LILAC;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawSerpent(ctx, serpent, timeMs, gfx) {
    if (!serpent.active) return;
    var isMobile = (viewW < 600 || viewH < 500);
    var scale = isMobile ? 0.82 : 1.0;
    var segCount = (gfx >= 3) ? 6 : NUM_SEGMENTS;
    var segX = serpent.segX;
    var segY = serpent.segY;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
      _drawGlow(ctx, 'violet', segX[0], segY[0], 18 * scale, 0.42);
    }
    ctx.beginPath();
    ctx.moveTo(segX[0], segY[0]);
    for (var i = 1; i < segCount; i++) {
      ctx.lineTo(segX[i], segY[i]);
    }
    ctx.strokeStyle = (serpent.state === 2) ? PAL.MAGENTA : PAL.VIOLET;
    ctx.lineWidth = 7.2 * scale;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(segX[0], segY[0]);
    for (var j = 1; j < segCount - 1; j++) {
      ctx.lineTo(segX[j], segY[j]);
    }
    ctx.strokeStyle = PAL.VOID;
    ctx.lineWidth = 4.6 * scale;
    ctx.stroke();
    if (gfx <= 1 && (!window._fxOpts || window._fxOpts.trails !== false)) {
      var tailX = segX[segCount - 1];
      var tailY = segY[segCount - 1];
      var emberOff = Math.sin(timeMs * 0.015 + serpent.id) * 3.5;
      ctx.fillStyle = PAL.MAGENTA;
      ctx.beginPath();
      ctx.arc(tailX + emberOff, tailY - emberOff, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(segX[0], segY[0]);
    ctx.rotate(serpent.angle);
    var headLen = 9.5 * scale;
    var headW = 6.0 * scale;
    ctx.beginPath();
    ctx.moveTo(headLen, 0);
    ctx.lineTo(-headLen * 0.55, -headW);
    ctx.lineTo(-headLen * 0.85, 0);
    ctx.lineTo(-headLen * 0.55, headW);
    ctx.closePath();
    ctx.fillStyle = PAL.VOID;
    ctx.fill();
    ctx.strokeStyle = (timeMs < serpent.biteFlashUntil) ? '#FFFFFF' : PAL.LILAC;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = PAL.EMBER;
    ctx.beginPath();
    ctx.arc(0, -2.3 * scale, 1.8 * scale, 0, Math.PI * 2);
    ctx.arc(0,  2.3 * scale, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    if (timeMs < serpent.biteFlashUntil) {
      ctx.strokeStyle = PAL.LILAC;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(headLen * 0.7, -headW * 0.9);
      ctx.lineTo(headLen * 1.55, -1.5);
      ctx.moveTo(headLen * 0.7, headW * 0.9);
      ctx.lineTo(headLen * 1.55, 1.5);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }
  function drawScaleShield(ctx, x, y, timeMs, gfx, shieldObj) {
    if (shieldObj.state === 0) return;
    var isMobile = (viewW < 600 || viewH < 500);
    var rShield = (isMobile ? 48 : 56);
    var elapsed = timeMs - shieldObj.stateTime;
    ctx.save();
    ctx.translate(x, y);
    var numScales = 6;
    var rot = timeMs * 0.0005;
    if (shieldObj.state === 1) {
      for (var i = 0; i < numScales; i++) {
        var sa = rot + (i / numScales) * Math.PI * 2;
        var sx = Math.cos(sa) * (rShield * 0.74);
        var sy = Math.sin(sa) * (rShield * 0.74);
        _drawHexScale(ctx, sx, sy, rShield * 0.36, sa, PAL.VIOLET, 0.24, 0.06);
      }
      ctx.beginPath();
      for (var k = 0; k <= 6; k++) {
        var ka = rot + (k / 6) * Math.PI * 2;
        var kx = Math.cos(ka) * rShield;
        var ky = Math.sin(ka) * rShield;
        if (k === 0) ctx.moveTo(kx, ky);
        else ctx.lineTo(kx, ky);
      }
      ctx.strokeStyle = 'rgba(139, 61, 255, 0.48)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (shieldObj.state === 2) {
      var breakT = Math.min(1.0, elapsed / 580);
      var hitAng = shieldObj.hitAngle;
      var hx = Math.cos(hitAng) * rShield;
      var hy = Math.sin(hitAng) * rShield;
      if (elapsed < 280) {
        var flashA = 1.0 - elapsed / 280;
        if (gfx <= 2) {
          _drawGlow(ctx, 'lilac', hx, hy, 46, flashA * 0.95);
          _drawGlow(ctx, 'magenta', hx, hy, 70, flashA * 0.7);
        }
        ctx.strokeStyle = PAL.LILAC;
        ctx.lineWidth = 2.2 * flashA;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(hitAng - 0.5) * 34, hy - Math.sin(hitAng - 0.5) * 34);
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(hitAng + 0.45) * 38, hy - Math.sin(hitAng + 0.45) * 38);
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(hitAng) * 26, hy - Math.sin(hitAng) * 26);
        ctx.stroke();
      }
      var fade = 1.0 - breakT;
      for (var si = 0; si < numScales; si++) {
        var sAng = rot + (si / numScales) * Math.PI * 2;
        var angDiff = Math.abs(Math.atan2(Math.sin(sAng - hitAng), Math.cos(sAng - hitAng)));
        var push = (angDiff < 0.9) ? (breakT * 36) : (breakT * 18);
        var dist = rShield * 0.74 + push;
        var px = Math.cos(sAng) * dist;
        var py = Math.sin(sAng) * dist;
        var col = (angDiff < 0.9) ? PAL.LILAC : PAL.MAGENTA;
        _drawHexScale(ctx, px, py, rShield * 0.35 * (1 - breakT * 0.35), sAng + breakT * 0.6, col, fade * 0.85, fade * 0.22);
      }
    } else if (shieldObj.state === 3) {
      var refT = Math.min(1.0, elapsed / 420);
      var ease = 1.0 - Math.pow(1.0 - refT, 3);
      for (var ri = 0; ri < numScales; ri++) {
        var ra = rot + (ri / numScales) * Math.PI * 2;
        var rDist = (rShield * 1.45) * (1 - ease) + (rShield * 0.74) * ease;
        var rx = Math.cos(ra) * rDist;
        var ry = Math.sin(ra) * rDist;
        _drawHexScale(ctx, rx, ry, rShield * 0.36 * ease, ra, PAL.LILAC, 0.35 * ease, 0.1 * ease);
      }
    }
    ctx.restore();
  }
  function _drawHexScale(ctx, cx, cy, rad, rot, strokeCol, strokeAlpha, fillAlpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      var vx = Math.cos(a) * rad;
      var vy = Math.sin(a) * rad * 0.82;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = PAL.ABYSS;
    ctx.globalAlpha = _tyBrightness() * (fillAlpha);
    ctx.fill();
    ctx.strokeStyle = strokeCol;
    ctx.globalAlpha = _tyBrightness() * (strokeAlpha);
    ctx.lineWidth = 1.35;
    ctx.stroke();
    ctx.restore();
  }
  function drawSlowWave(ctx, x, y, elapsedMs, gfx, maxRadius) {
    var dur = 620;
    if (elapsedMs < 0 || elapsedMs > dur) return;
    var t = elapsedMs / dur;
    var easeOut = 1.0 - Math.pow(1.0 - t, 2.4);
    var curR = maxRadius * easeOut;
    var alpha = (1.0 - t) * 0.85;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = _tyBrightness() * (alpha);
    ctx.beginPath();
    ctx.arc(0, 0, curR, 0, Math.PI * 2);
    ctx.strokeStyle = PAL.MAGENTA;
    ctx.lineWidth = 2.0 * (1.0 - t * 0.4);
    ctx.stroke();
    if (gfx <= 2) {
      ctx.beginPath();
      ctx.arc(0, 0, curR * 0.91, 0, Math.PI * 2);
      ctx.setLineDash(_dash);
      ctx.strokeStyle = PAL.VIOLET;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash(_emptyDash);
    }
    ctx.restore();
  }

_initGlowSprites();
function gfx() { return Math.max(window._gfxLevel || 0, _mobPerf ? 1 : 0); }
function sync() { viewW = canvas.width; viewH = canvas.height; tyClock = window._tyClock; }
function _tyBrightness() { return Math.max(0, Math.min(1, window._fxOpts ? (window._fxOpts.fxBrightness ?? 100) / 100 : 1)); }
function begin() {
    sync(); ctx.save(); ctx.globalAlpha = _tyBrightness() * (1);
}
function finish() {
    ctx.restore();
}
window._tyRingRadius = function () {
    return ((player.width || 40) + 5) * 1.2 + 16;
};
window._tyReserveRingSpace = function () {
    if (!_hasBuff('hac_viem_phe_hon')) return;
    const clear = _tyRingRadius() + 24 - player.height / 2;
    window._greatSageFrameClearance = Math.max(window._greatSageFrameClearance || 0, clear);
};
window._drawTyGround = function () {
    if (!_hasSigil('ty')) return;
    begin(); const g = gfx(), now = window._tyClock, o = window._fxOpts;
    if (_tyArray.active) {
        const age = now - _tyArray.start;
        if ((!o || o.sigilBackdrop !== false) && g < 3) {
            _fxContext.save(); _fxContext.globalAlpha = _tyBrightness() * (Math.min(1, age / 180) * Math.min(1, (1950 - age) / 500) * (_tyVortexLoaded() ? 0.25 : 0.42));
            _fxContext.fillStyle = PAL.VOID; _fxContext.beginPath(); _fxContext.arc(_tyArray.x, _tyArray.y, 165, 0, Math.PI * 2); _fxContext.fill(); _fxContext.restore();
        }
        drawPhapTran(_fxContext, _tyArray.x, _tyArray.y, age, g, 170);
        if (age >= 180 && age < 1430) {
            const reveal = Math.min(1, (age - 180) / 160), r = 110 * reveal;
            _fxContext.save(); _fxContext.translate(_tyArray.x, _tyArray.y); _fxContext.globalAlpha = _tyBrightness() * (0.8);
            _fxContext.strokeStyle = PAL.VOID; _fxContext.lineWidth = 5;
            _fxContext.beginPath(); _fxContext.moveTo(-r, -r); _fxContext.lineTo(r, r); _fxContext.moveTo(-r, r); _fxContext.lineTo(r, -r); _fxContext.stroke();
            _fxContext.strokeStyle = PAL.LILAC; _fxContext.lineWidth = 1.6;
            _fxContext.stroke();
            _fxContext.fillStyle = PAL.EMBER; _fxContext.beginPath(); _fxContext.arc(0, 0, 3.5, 0, Math.PI * 2); _fxContext.fill(); _fxContext.restore();
        }
        if (age >= 1430 && age < 1800) {
            const p = (age - 1430) / 370, r = 170 * (0.3 + p * 0.9);
            _fxContext.save(); _fxContext.translate(_tyArray.x, _tyArray.y);
            _fxContext.globalAlpha = _tyBrightness() * ((1 - p) * 0.7); _fxContext.strokeStyle = PAL.MAGENTA; _fxContext.lineWidth = 1.5;
            _fxContext.beginPath(); _fxContext.arc(0, 0, r, 0, Math.PI * 2); _fxContext.stroke();
            if (g < 2 && (!o || o.particles !== false)) for (let i = 0; i < 16; i++) {
                const a = i * Math.PI / 8 + p * 0.25, x = Math.cos(a) * r, y = Math.sin(a) * r;
                _fxContext.beginPath(); _fxContext.moveTo(x, y); _fxContext.lineTo(Math.cos(a - 0.025) * (r + 12 * (1 - p)), Math.sin(a - 0.025) * (r + 12 * (1 - p))); _fxContext.lineTo(Math.cos(a + 0.025) * (r + 12 * (1 - p)), Math.sin(a + 0.025) * (r + 12 * (1 - p))); _fxContext.closePath(); _fxContext.fillStyle = i % 4 ? PAL.VIOLET : PAL.LILAC; _fxContext.fill();
            }
            _fxContext.restore();
        }
        if (age >= 1430 && age < 1830) {
            const fade = 1 - (age - 1430) / 400;
            if ((!o || o.sigilLight !== false) && g < 3) {
                _fxContext.fillStyle = 'rgba(139,61,255,' + (fade * 0.07) + ')';
                _fxContext.fillRect(0, 0, viewW, viewH);
            }
            if (!o || o.screenFlash !== false) {
                _fxContext.fillStyle = 'rgba(239,220,255,' + (fade * fade * 0.13 * (o ? (o.flashIntensity ?? 100) / 100 : 1)) + ')';
                _fxContext.fillRect(0, 0, viewW, viewH);
            }
        }
    }
    drawSlowWave(_fxContext, _tyWave.x, _tyWave.y, now - _tyWave.start, g, 220);
    finish();
};
window._drawTyActors = function () {
    if (!_hasSigil('ty')) return;
    begin(); const g = gfx(), now = window._tyClock;
    for (let i = 0; i < 4; i++) {
        const d = _tyDevours[i];
        if (d.active) drawDetonation(_fxContext, d.x, d.y, now - d.start, g, null);
    }
    drawDetonation(_fxContext, 0, 0, 1000, g, _tyShards);
    for (let i = 0; i < _tySerpents.length; i++) {
        const s = _tySerpents[i];
        const absorbing = s.active && s.state === 3 && s.absorbAt >= 0;
        if (absorbing) {
            const shrink = Math.max(0, 1 - (now - s.absorbAt) / 160);
            _fxContext.save(); _fxContext.translate(s.x, s.y); _fxContext.scale(shrink, shrink); _fxContext.translate(-s.x, -s.y);
        }
        if (s.active && g < 2 && (!window._fxOpts || window._fxOpts.trails !== false)) {
            _fxContext.save(); _fxContext.globalCompositeOperation = 'lighter';
            _fxContext.globalAlpha = _tyBrightness() * (s.state === 2 ? 0.32 : 0.14); _fxContext.strokeStyle = s.state === 2 ? PAL.EMBER : PAL.VIOLET; _fxContext.lineWidth = s.state === 2 ? 8 : 5;
            _fxContext.beginPath(); _fxContext.moveTo(s.segX[2], s.segY[2]);
            for (let j = 3; j < 10; j++) _fxContext.lineTo(s.segX[j], s.segY[j]);
            _fxContext.stroke(); _fxContext.restore();
        }
        drawSerpent(_fxContext, s, now, g);
        if (s.active && now < s.biteFlashUntil) {
            _fxContext.save(); _fxContext.translate(s.x, s.y); _fxContext.rotate(s.angle);
            _fxContext.strokeStyle = PAL.EMBER; _fxContext.lineWidth = 2.5;
            _fxContext.beginPath(); _fxContext.moveTo(9, -6); _fxContext.lineTo(17, 0); _fxContext.lineTo(9, 6); _fxContext.stroke(); _fxContext.restore();
        }
        if (absorbing) _fxContext.restore();
    }
    for (let i = 0; i < 32; i++) {
        const f = _tyImpacts[i]; if (!f.active) continue;
        const p = Math.max(0, Math.min(1, (now - f.at) / 420)), r = (f.kind === 1 ? 18 : 12) + p * 15;
        _fxContext.save(); _fxContext.translate(f.x, f.y); _fxContext.rotate(f.angle);
        _fxContext.globalAlpha = _tyBrightness() * (1 - p); _fxContext.lineWidth = 1.6;
        _fxContext.strokeStyle = f.kind === 2 ? PAL.EMBER : '#FFFFFF';
        if (f.kind === 2) {
            _fxContext.beginPath(); _fxContext.arc(0, 0, r + p * 15, 0, Math.PI * 2); _fxContext.stroke();
        } else {
            _fxContext.beginPath();
            for (let side = -1; side <= 1; side += 2) {
                _fxContext.moveTo(-r, side * r * 0.45); _fxContext.lineTo(r * 0.25, side * r * 0.16); _fxContext.lineTo(-r * 0.15, side * r * 0.62);
            }
            _fxContext.stroke();
            _fxContext.strokeStyle = PAL.EMBER; _fxContext.lineWidth = 1.1;
            _fxContext.beginPath(); _fxContext.arc(0, 0, r * (0.7 + p), 0.3, Math.PI * 1.7); _fxContext.stroke();
            if (g < 2 && (!window._fxOpts || window._fxOpts.particles !== false)) for (let k = 0; k < 6; k++) {
                const a = k * Math.PI / 3, d = 9 + p * 35;
                _fxContext.fillStyle = k % 2 ? PAL.MAGENTA : PAL.LILAC;
                _fxContext.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2 * (1 - p), 2 * (1 - p));
            }
        }
        if (g < 2) _drawGlow(_fxContext, f.kind === 2 ? 'ember' : 'lilac', 0, 0, r * 1.6, (1 - p) * 0.28);
        _fxContext.restore();
    }
    if (now < window._tySpeedEnd && g < 3 && (!window._fxOpts || window._fxOpts.trails !== false)) {
        _fxContext.save(); _fxContext.globalAlpha = _tyBrightness() * ((window._tySpeedEnd - now) / 1000 * 0.6);
        _fxContext.strokeStyle = PAL.MAGENTA; _fxContext.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const x = player.x + (i - 1.5) * 18, y = player.y + 25 + (now * 0.12 + i * 13) % 40;
            _fxContext.beginPath(); _fxContext.moveTo(x, y); _fxContext.lineTo(x, y + 18); _fxContext.stroke();
        }
        _fxContext.restore();
    }
    if (_hasBuff('hac_viem_phe_hon') && window._tyCharge > 0.01) drawHacViemRing(_fxContext, player.x, player.y, now, g, window._tyCharge / 10000, _tyRingRadius());
    if (window._tyFangStacks > 0) {
        _fxContext.fillStyle = PAL.LILAC; _fxContext.font = 'bold 11px sans-serif'; _fxContext.textAlign = 'center';
        _fxContext.fillText('+' + window._tyFangStacks.toFixed(0) + '%', player.x, player.y - _tyRingRadius() - 9);
    }
    drawScaleShield(_fxContext, _tyShield.state === 2 ? _tyShield.x : player.x, _tyShield.state === 2 ? _tyShield.y : player.y, now, g, _tyShield);
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i]; if (!(e._tyLiftMs > 0)) continue;
        const r = (e.size || 30) / 2;
        _fxContext.strokeStyle = '#D14BFF'; _fxContext.lineWidth = 1.2;
        _fxContext.beginPath(); _fxContext.ellipse(e.x, e.y + r + 7, r + 6, 5, 0, 0, Math.PI * 2); _fxContext.stroke();
        _fxContext.beginPath(); _fxContext.moveTo(e.x - r, e.y + r); _fxContext.lineTo(e.x - r, e.y - 5); _fxContext.moveTo(e.x + r, e.y + r); _fxContext.lineTo(e.x + r, e.y - 5); _fxContext.stroke();
    }
    finish();
};
})();
