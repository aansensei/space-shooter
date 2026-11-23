// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Battlefield atmosphere for Legion of Souls.

let _muiScreenCache = null;
let _muiScreenDrum = null;
let _muiScreenDrumSource = null;
let _muiScreenSigil = null;
let _muiScreenSigilSource = null;
const _muiScreenMotionPreference = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const _muiScreenMotes = Array.from({ length: 36 }, (_, i) => ({
    x: ((i * 23) % 37 + 0.5) / 37,
    y: ((i * 13) % 37 + 0.5) / 37,
    speed: 0.000025 + (i % 5) * 0.000008,
    size: i % 4 === 0 ? 2.5 : 1.5,
    phase: i * 2.4,
}));

function _muiScreenAtmosphere(w, h) {
    if (_muiScreenCache?.w === w && _muiScreenCache.h === h) return _muiScreenCache;

    const ratio = 240 / Math.max(w, h);
    const bw = Math.max(1, Math.round(w * ratio));
    const bh = Math.max(1, Math.round(h * ratio));
    const vignette = _muiSurface(bw, bh);
    const ink = vignette.getContext('2d');
    ink.scale(bw, bh);
    const shade = ink.createRadialGradient(0.5, 0.5, 0.29, 0.5, 0.5, 0.57);
    shade.addColorStop(0, 'transparent');
    shade.addColorStop(0.57, 'rgba(11,59,58,0.36)');
    shade.addColorStop(0.83, 'rgba(11,59,58,0.88)');
    shade.addColorStop(1, '#141E35');
    ink.fillStyle = shade;
    ink.fillRect(0, 0, 1, 1);

    _muiScreenCache = {
        w, h, vignette, fog: null, eddy: null, layer: null, ink: null,
        layerFx: null, layerStep: -1, layerGlow: true,
    };
    return _muiScreenCache;
}

function _muiScreenBloom(g, x, y, rx, ry, color, mid) {
    g.save();
    g.translate(x, y);
    g.scale(rx, ry);
    const haze = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    haze.addColorStop(0, color);
    haze.addColorStop(0.42, mid);
    haze.addColorStop(1, 'transparent');
    g.fillStyle = haze;
    g.fillRect(-1, -1, 2, 2);
    g.restore();
}

function _muiScreenBakeFog(cache) {
    const fog = _muiSurface(cache.vignette.width, cache.vignette.height);
    const g = fog.getContext('2d');
    g.scale(fog.width, fog.height);
    for (let i = 0; i < 11; i++) {
        const u = i / 10;
        const phase = i * 2.4;
        const broad = 0.16 + 0.07 * Math.sin(phase);
        const narrow = 0.09 + 0.035 * Math.cos(phase);
        const curl = 0.035 + 0.025 * Math.sin(phase + 1.1);
        const tint = i % 4 === 0 ? 'rgba(75,42,107,0.76)' : 'rgba(61,219,176,0.68)';
        const mid = 'rgba(61,219,176,0.20)';
        _muiScreenBloom(g, u, curl, broad, narrow, tint, mid);
        _muiScreenBloom(g, 1 - u, 1 - curl, broad, narrow, tint, mid);
        _muiScreenBloom(g, curl, 1 - u, narrow, broad, tint, mid);
        _muiScreenBloom(g, 1 - curl, u, narrow, broad, tint, mid);
    }
    const eddy = _muiSurface(48, 48);
    _muiScreenBloom(eddy.getContext('2d'), 24, 24, 24, 24, MUI_COLOR_JADE, 'rgba(61,219,176,0.28)');
    const layer = _muiSurface(fog.width, fog.height);
    const ink = layer.getContext('2d');
    ink.scale(layer.width / cache.w, layer.height / cache.h);
    cache.fog = fog;
    cache.eddy = eddy;
    cache.layer = layer;
    cache.ink = ink;
}

function _muiScreenDrumSprite() {
    const art = _muiImgReady(_muiDrumImg) ? _muiDrumImg : null;
    if (_muiScreenDrum && _muiScreenDrumSource === art) return _muiScreenDrum;
    const sprite = _muiSurface(384, 384);
    const g = sprite.getContext('2d');
    const r = 183;
    g.translate(192, 192);
    g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
        g.strokeStyle = i === 1 ? MUI_COLOR_GOLD : MUI_COLOR_JADE;
        g.beginPath();
        g.arc(0, 0, r - i * 6, 0, MUI_TAU);
        g.stroke();
    }
    g.save();
    g.beginPath();
    g.arc(0, 0, r - 14, 0, MUI_TAU);
    g.arc(0, 0, r - 37, 0, MUI_TAU, true);
    g.clip();
    g.globalAlpha = 0.64;
    g.drawImage(art || _muiBakeDrumFallback(), -r, -r, 2 * r, 2 * r);
    g.restore();
    for (let i = 0; i < 48; i++) {
        g.rotate(MUI_TAU / 48);
        g.strokeStyle = i % 4 === 0 ? MUI_COLOR_GOLD : MUI_COLOR_JADE;
        g.beginPath();
        g.moveTo(r - 15, -4);
        g.lineTo(r - 26, 0);
        g.lineTo(r - 15, 4);
        g.stroke();
    }
    _muiScreenDrum = sprite;
    _muiScreenDrumSource = art;
    return sprite;
}

function _muiScreenBackdrop(fx, w, h, fade, glow) {
    const art = _muiFxImg('call-sigil');
    if (!_muiScreenSigil || _muiScreenSigilSource !== art) {
        _muiScreenSigil = _muiSurface(384, 384);
        _muiScreenSigil.getContext('2d').drawImage(art || _muiBakeDrumFallback(), 0, 0, 384, 384);
        _muiScreenSigilSource = art;
    }
    const size = Math.max(w, h) * 1.3;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(fx.age * 0.000075);
    ctx.globalCompositeOperation = glow ? 'lighter' : 'source-over';
    ctx.globalAlpha = (0.06 + 0.009 * Math.sin(fx.age * 0.00262)) * fade;
    ctx.drawImage(_muiScreenSigil, -size / 2, -size / 2, size, size);
    ctx.restore();
}

function _muiScreenArrayFog(cache, age, fade) {
    const array = window._muiArray;
    if (!array?.active || array.age >= array.duration) return;

    const { w, h, eddy, ink } = cache;
    const thickness = Math.min(w, h) * 0.14;
    const driftX = 8 * Math.cos(age * 0.002);
    const driftY = 8 * Math.sin(age * 0.002);
    ink.globalAlpha = 0.11 * fade * _muiSmooth(array.age / 400);
    for (const zone of array.zones) {
        const xEdge = Math.min(zone.x, w - zone.x);
        const yEdge = Math.min(zone.y, h - zone.y);
        if (Math.min(xEdge, yEdge) > thickness + zone.r) continue;
        if (xEdge < yEdge) {
            const x = zone.x < w / 2 ? 0 : w - thickness;
            ink.drawImage(eddy, x, zone.y - thickness * 1.25 + driftY, thickness, thickness * 2.5);
        } else {
            const y = zone.y < h / 2 ? 0 : h - thickness;
            ink.drawImage(eddy, zone.x - thickness * 1.25 + driftX, y, thickness * 2.5, thickness);
        }
    }
}

function _muiScreenFogLayer(cache, fx, detail, glow, breath, vignette, retreat, motionFade) {
    const step = Math.floor(fx.age / 48);
    if (cache.layerFx === fx && cache.layerStep === step && cache.layerGlow === glow) return cache.layer;
    if (!cache.fog) _muiScreenBakeFog(cache);

    const { w, h, ink } = cache;
    const drift = fx.age * MUI_TAU / 2400;
    const dx = w * (0.016 * Math.sin(drift) - 0.027 - 0.067 * (1 - motionFade));
    const dy = h * (0.012 * Math.cos(drift) - 0.023 - 0.067 * (1 - motionFade));
    ink.clearRect(0, 0, w, h);
    ink.globalAlpha = breath * detail * (glow ? 1 : 0.62);
    ink.drawImage(cache.fog, dx, dy, w - 2 * dx, h - 2 * dy);
    if (glow) _muiScreenArrayFog(cache, fx.age, detail);
    ink.globalAlpha = vignette;
    ink.drawImage(cache.vignette, -w * retreat, -h * retreat, w * (1 + 2 * retreat), h * (1 + 2 * retreat));
    cache.layerFx = fx;
    cache.layerStep = step;
    cache.layerGlow = glow;
    return cache.layer;
}

function _muiScreenDrawMotes(age, fade, w, h) {
    const count = Math.ceil(_muiScreenMotes.length * fade);
    ctx.fillStyle = MUI_COLOR_JADE;
    for (let band = 0; band < 2; band++) {
        const edgePass = band === 1;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const p = _muiScreenMotes[i];
            const x = p.x + 0.016 * Math.sin(p.phase + age * 0.0015);
            const y = (p.y + 1 - age * p.speed) % 1;
            const edge = Math.min(x, 1 - x, y, 1 - y) < 0.15;
            if (edge === edgePass) ctx.rect(x * w, y * h, p.size, p.size);
        }
        ctx.globalAlpha = (edgePass ? 0.34 : 0.01) * fade;
        ctx.fill();
    }
}

function _muiScreenReduced() {
    return _muiReducedMotion() || !!_muiScreenMotionPreference?.matches;
}

function _muiScreenTier() {
    return window._gfxLevel >= 3 ? window._gfxLevel : _muiGfxTier();
}

function _drawMuiScreenUnder() {
    const fx = window._muiScreenFx;
    if (!fx) return;

    const { width: w, height: h } = canvas;
    const { age, phase } = fx;
    const tier = _muiScreenTier();
    const reduced = _muiScreenReduced();
    const glow = window._fxOpts?.glow !== false;
    const motionFade = phase === 2 ? 1 - _muiSmooth((age - (MUI_LEGION_MS - 600)) / 1100) : 1;
    const breath = tier < 2 && !reduced ? 0.19 + 0.03 * Math.sin(age * MUI_TAU / 2400) : 0.19;
    const cache = _muiScreenAtmosphere(w, h);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    const fadeTail = 1 - _muiSmooth(Math.max(0, fx.endAge) / 500);
    const vignette = reduced ? 0.12 * fadeTail : tier >= 3 ? 0.14 * fadeTail
        : phase === 0 && age < 150 ? 0.34 * _muiSmooth(age / 150)
        : phase === 0 ? 0.34 + (breath - 0.34) * _muiSmooth((age - 150) / 550)
        : breath * motionFade;
    const retreat = reduced || tier >= 2 ? 0 : (1 - motionFade) * 0.13;
    if (!reduced && tier < 2 && age > 450) {
        const detail = _muiSmooth((age - 450) / 250) * motionFade;
        _muiScreenBackdrop(fx, w, h, detail, glow);
        const layer = _muiScreenFogLayer(cache, fx, detail, glow, breath, vignette, retreat, motionFade);
        ctx.drawImage(layer, 0, 0, w, h);
        if (tier === 0 && window._fxOpts?.particles !== false) _muiScreenDrawMotes(age, detail, w, h);
    } else {
        ctx.globalAlpha = vignette;
        ctx.drawImage(cache.vignette, 0, 0, w, h);
    }
    ctx.restore();

    if (phase === 0 && !reduced && tier < 3) _muiScreenDrawDrum(fx, tier, glow, w, h);
}

function _muiScreenDrawDrum(fx, tier, glow, w, h) {
    const { x, y, age } = fx;
    const maxR = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 64;
    ctx.save();
    const drum = tier < 2 ? _muiScreenDrumSprite() : null;
    ctx.globalCompositeOperation = glow && tier < 2 ? 'lighter' : 'source-over';
    for (let i = 0; i < 3 - tier; i++) {
        const t = (age - i * 82) / (700 - i * 82);
        if (t <= 0 || t >= 1) continue;
        const radius = 34 + (maxR - 34) * (0.75 * t + 0.25 * _muiEaseOutQuad(t));
        ctx.globalAlpha = Math.sin(Math.PI * t) * (0.72 - i * 0.12) * (glow ? 1 : 0.64);
        if (drum) {
            ctx.drawImage(drum, x - radius, y - radius, radius * 2, radius * 2);
        } else {
            ctx.strokeStyle = MUI_COLOR_JADE;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, MUI_TAU);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function _drawMuiScreenOver() {
    const fx = window._muiScreenFx;
    if (!fx) return;
    if (_muiScreenReduced()) return;

    const tier = _muiScreenTier();
    const { age, endAge } = fx;
    const flash = window._fxOpts?.screenFlash !== false && tier < 3;
    const collapse = endAge >= 0 && endAge < 470 && tier !== 2;
    if (!collapse && (!flash || (age >= 220 && endAge < 430))) return;

    ctx.save();
    if (collapse) {
        const t = endAge / 470;
        const r = 8 + Math.hypot(canvas.width, canvas.height) * 0.57 * (1 - t * t);
        ctx.globalAlpha = (0.20 + t * 0.10) * (1 - _muiSmooth((t - 0.83) / 0.17));
        ctx.strokeStyle = MUI_COLOR_GOLD;
        ctx.lineWidth = 1.5 + t;
        ctx.beginPath();
        ctx.arc(player.x, player.y, r, 0, MUI_TAU);
        ctx.stroke();
    }

    if (flash) {
        const gain = tier === 2 ? 0.45 : 1;
        const alpha = (age < 220
            ? 0.22 * (age < 60 ? _muiSmooth(age / 60) : 1 - _muiSmooth((age - 60) / 160))
            : 0.10 * Math.sin(Math.PI * _muiClamp((endAge - 430) / 70, 0, 1))) * gain;
        if (alpha > 0) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = alpha;
            ctx.fillStyle = age < 220 ? MUI_COLOR_BONE : MUI_COLOR_JADE;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    ctx.restore();
}
