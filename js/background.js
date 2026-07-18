// js/background.js — PIXI.js v8 parallax space background
// Layers (back→front): gradient · galaxies · nebulas · stars-far · dust ·
//   stars-mid · asteroids-far · stars-near · asteroids-mid · asteroids-near · brightness
// Exposes: window._bgSetBrightness(0.01–1.0), window._bgReady

(async function initBackground() {
    'use strict';

    // Wait until PIXI and gameCanvas are both available
    const gameCanvas = await new Promise(resolve => {
        const check = () => {
            const el = document.getElementById('gameCanvas');
            if (el && typeof PIXI !== 'undefined') { resolve(el); return; }
            setTimeout(check, 80);
        };
        check();
    });

    const app = new PIXI.Application();
    await app.init({
        width:           window.innerWidth,
        height:          window.innerHeight,
        backgroundAlpha: 0,
        antialias:       false,
        autoStart:       false,
        preference:      'webgl',
    });
    window._bgPixiApp = app;

    const pc = app.canvas;
    pc.id = 'bgCanvas';
    Object.assign(pc.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: '0',
    });
    // Place behind gameCanvas in DOM; also fix stacking context so bgCanvas (z:0)
    // stays below the game canvas. Without explicit position+zIndex on gameCanvas,
    // a position:fixed element wins even with lower z-index per CSS paint order.
    gameCanvas.before(pc);
    gameCanvas.style.position = 'fixed';
    gameCanvas.style.top      = '0';
    gameCanvas.style.left     = '0';
    gameCanvas.style.zIndex   = '1'; // above bgCanvas(0), below pixiCanvas(pixi-renderer sets 1→ we match)

    const W = () => app.renderer.width;
    const H = () => app.renderer.height;

    // Utility helpers
    const rnd    = (a, b)  => Math.random() * (b - a) + a;
    const rndInt = (a, b)  => Math.floor(Math.random() * (b - a + 1) + a);
    const rndOf  = arr     => arr[Math.floor(Math.random() * arr.length)];

    // This background runs its own independent PIXI render loop, entirely
    // outside the game's _gfxLevel/Smart-Quality tier system — so unlike
    // every other visual system in the game, sprite count here was never
    // scaled down for mobile. At full desktop density (671 sprites/frame,
    // updated + drawn unconditionally every frame) this was a fixed,
    // always-on cost that swamped weaker/mobile GPUs regardless of gfx tier.
    //
    // PC density is never touched by any of this — DESKTOP_CFG below is
    // exactly the original always-on numbers. Only the mobile path changes.
    //
    // Density starts from a touch-capability guess (this IIFE creates
    // sprites within milliseconds of page load, before the player has seen
    // the menu let alone clicked PC/Mobile) and then gets rebuilt for real
    // once the player makes an explicit choice — see window._bgSetDensity,
    // called from selectPlatform() in index.html.
    const DESKTOP_CFG = {
        gSpeed:        0.25,
        galaxyCount:   4,
        nebulaCount:   10,
        starsFar:      400,
        starsMid:      120,
        starsNear:     40,
        dustCount:     80,
        asteroidsFar:  8,
        asteroidsMid:  6,
        asteroidsNear: 3,
    };
    const MOBILE_CFG = {
        gSpeed:        0.25,
        galaxyCount:   1,
        nebulaCount:   2,
        starsFar:      35,
        starsMid:      15,
        starsNear:     6,
        dustCount:     8,
        asteroidsFar:  2,
        asteroidsMid:  1,
        asteroidsNear: 0,
    };
    const _isTouchDevice = (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    let CFG = _isTouchDevice ? MOBILE_CFG : DESKTOP_CFG;

    // ─── LAYERS (back → front) ────────────────────────────────────────────
    const bgLayer           = new PIXI.Container();
    const galaxyLayer       = new PIXI.Container();
    const nebulaLayer       = new PIXI.Container();
    const starFarLayer      = new PIXI.Container();
    const dustLayer         = new PIXI.Container();
    const starMidLayer      = new PIXI.Container();
    const asteroidFarLayer  = new PIXI.Container();
    const starNearLayer     = new PIXI.Container();
    const asteroidMidLayer  = new PIXI.Container();
    const asteroidNearLayer = new PIXI.Container();
    const brightnessLayer   = new PIXI.Container();

    for (const L of [
        bgLayer, galaxyLayer, nebulaLayer, starFarLayer, dustLayer,
        starMidLayer, asteroidFarLayer, starNearLayer, asteroidMidLayer,
        asteroidNearLayer, brightnessLayer,
    ]) app.stage.addChild(L);

    // ─── HELPER: Canvas 2D → PIXI Texture ────────────────────────────────
    function toTex(cvs) { return PIXI.Texture.from(cvs); }

    // ─── BACKGROUND GRADIENT ─────────────────────────────────────────────
    function makeBgTex(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const cx = c.getContext('2d');
        const g = cx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0,   '#0f0524');
        g.addColorStop(0.5, '#160833');
        g.addColorStop(1,   '#07051a');
        cx.fillStyle = g;
        cx.fillRect(0, 0, w, h);
        return toTex(c);
    }

    let bgSprite = new PIXI.Sprite(makeBgTex(W(), H()));
    bgSprite.width  = W();
    bgSprite.height = H();
    bgLayer.addChild(bgSprite);

    // ─── BRIGHTNESS OVERLAY ───────────────────────────────────────────────
    // A black rectangle whose alpha = (1 - brightness). When brightness=1
    // the overlay is invisible; brightness=0.01 makes it nearly opaque.
    const brightnessGfx = new PIXI.Graphics();
    function _rebuildBrightnessGfx() {
        brightnessGfx.clear();
        brightnessGfx.rect(0, 0, W(), H()).fill({ color: 0x000000, alpha: 1 });
    }
    _rebuildBrightnessGfx();
    brightnessGfx.alpha = 0;
    brightnessLayer.addChild(brightnessGfx);

    window._bgBrightness    = 1.0;
    window._bgSetBrightness = function (val) {
        window._bgBrightness  = Math.max(0.01, Math.min(1.0, parseFloat(val) || 1.0));
        brightnessGfx.alpha   = 1.0 - window._bgBrightness;
        try { localStorage.setItem('bgBrightness', window._bgBrightness); } catch (_) {}
    };
    // Restore saved preference
    try {
        const saved = parseFloat(localStorage.getItem('bgBrightness'));
        if (!isNaN(saved)) window._bgSetBrightness(saved);
    } catch (_) {}

    // ─── GALAXY GLOW ─────────────────────────────────────────────────────
    function makeGalaxyTex(radius) {
        const d  = Math.ceil(radius * 2);
        const c  = document.createElement('canvas');
        c.width  = d; c.height = d;
        const cx = c.getContext('2d');
        const cx2D = cx; // alias for clarity

        // Soft pink core
        const coreG = cx2D.createRadialGradient(radius, radius, 0, radius, radius, radius * 0.35);
        coreG.addColorStop(0, 'rgba(255,180,220,0.28)');
        coreG.addColorStop(1, 'transparent');
        cx2D.fillStyle = coreG;
        cx2D.beginPath();
        cx2D.arc(radius, radius, radius * 0.35, 0, Math.PI * 2);
        cx2D.fill();

        // Flattened violet arm disk
        cx2D.save();
        cx2D.translate(radius, radius);
        cx2D.scale(1, 0.4);
        const armG = cx2D.createRadialGradient(0, 0, 0, 0, 0, radius);
        armG.addColorStop(0, 'rgba(120,60,255,0.18)');
        armG.addColorStop(1, 'transparent');
        cx2D.fillStyle = armG;
        cx2D.beginPath();
        cx2D.arc(0, 0, radius, 0, Math.PI * 2);
        cx2D.fill();
        cx2D.restore();

        return toTex(c);
    }

    class GalaxyObj {
        constructor() {
            const r      = rnd(W() * 0.4, W() * 0.8);
            this.tex     = makeGalaxyTex(r);
            this.halfW   = r;
            this.sprite  = new PIXI.Sprite(this.tex);
            this.sprite.anchor.set(0.5);
            this.sprite.blendMode = 'screen';
            this.reset(true);
            galaxyLayer.addChild(this.sprite);
        }
        reset(init) {
            this.gx       = rnd(0, W());
            this.gy       = init ? rnd(0, H()) : -this.halfW;
            this.speed    = 0.03 * CFG.gSpeed;
            this.rotSpeed = rnd(-0.0003, 0.0003);
            this.rot      = rnd(0, Math.PI * 2);
            this.sprite.position.set(this.gx, this.gy);
            this.sprite.rotation = this.rot;
        }
        update() {
            this.gy  += this.speed;
            this.rot += this.rotSpeed;
            this.sprite.position.y = this.gy;
            this.sprite.rotation   = this.rot;
            if (this.gy - this.halfW > H()) this.reset(false);
        }
    }

    let galaxies = Array.from({ length: CFG.galaxyCount }, () => new GalaxyObj());

    // ─── NEBULA CLOUDS ───────────────────────────────────────────────────
    const NPALETTES = [
        [255, 70,  150], // hot pink
        [50,  150, 255], // electric blue
        [180, 50,  255], // violet
        [255, 180, 50 ], // amber gold
        [0,   255, 200], // cyan
    ];

    function makeNebulaTex(c1, c2, c3, size) {
        const d  = Math.ceil(size * 2);
        const cv = document.createElement('canvas');
        cv.width = d; cv.height = d;
        const cx = cv.getContext('2d');
        cx.save();
        cx.translate(size, size);
        cx.scale(1, 0.6); // squash to ellipse
        const g = cx.createRadialGradient(0, 0, 0, 0, 0, size);
        g.addColorStop(0,   `rgba(${c1[0]},${c1[1]},${c1[2]},0.15)`);
        g.addColorStop(0.4, `rgba(${c2[0]},${c2[1]},${c2[2]},0.12)`);
        g.addColorStop(0.8, `rgba(${c3[0]},${c3[1]},${c3[2]},0.08)`);
        g.addColorStop(1,   'transparent');
        cx.fillStyle = g;
        cx.beginPath();
        cx.arc(0, 0, size, 0, Math.PI * 2);
        cx.fill();
        cx.restore();
        return toTex(cv);
    }

    class NebulaObj {
        constructor() {
            const size    = rndInt(300, 900);
            this.tex      = makeNebulaTex(rndOf(NPALETTES), rndOf(NPALETTES), rndOf(NPALETTES), size);
            this.halfW    = size;
            this.sprite   = new PIXI.Sprite(this.tex);
            this.sprite.anchor.set(0.5);
            this.sprite.blendMode = 'screen';
            this.pulsePhase = rnd(0, Math.PI * 2);
            this.reset(true);
            nebulaLayer.addChild(this.sprite);
        }
        reset(init) {
            this.nx    = rnd(-200, W() + 200);
            this.ny    = init ? rnd(0, H()) : -this.halfW;
            this.speed = 0.08 * CFG.gSpeed * rnd(0.8, 1.2);
            this.sprite.position.set(this.nx, this.ny);
        }
        update() {
            this.ny         += this.speed;
            this.pulsePhase += 0.003;
            const pulse      = 1 + Math.sin(this.pulsePhase) * 0.04;
            this.sprite.scale.set(pulse, pulse * 0.6);
            this.sprite.rotation   = this.pulsePhase * 0.08;
            this.sprite.position.y = this.ny;
            if (this.ny - this.halfW > H()) this.reset(false);
        }
    }

    let nebulas = Array.from({ length: CFG.nebulaCount }, () => new NebulaObj());

    // ─── STARS ───────────────────────────────────────────────────────────
    const STAR_HUES = [
        { min: 180, max: 240 }, // cyan→blue
        { min: 280, max: 330 }, // purple→pink
        { min: 20,  max: 60  }, // orange→yellow
    ];

    function makeStarTex(radius, h, s, l, glowR) {
        const pad = glowR + 2;
        const d   = Math.ceil((radius + pad) * 2);
        const cv  = document.createElement('canvas');
        cv.width  = d; cv.height = d;
        const cx  = cv.getContext('2d');
        const ctr = d / 2;

        if (glowR > 0) {
            const gg = cx.createRadialGradient(ctr, ctr, 0, ctr, ctr, ctr);
            gg.addColorStop(0,   `hsla(${h},${s}%,${l}%,0.60)`);
            gg.addColorStop(0.4, `hsla(${h},${s}%,${l}%,0.20)`);
            gg.addColorStop(1,   'transparent');
            cx.fillStyle = gg;
            cx.fillRect(0, 0, d, d);
        }

        cx.fillStyle = `hsl(${h},${s}%,${l}%)`;
        cx.beginPath();
        cx.arc(ctr, ctr, radius, 0, Math.PI * 2);
        cx.fill();
        return toTex(cv);
    }

    // Pre-bake star texture pool (8 variants per layer × 3 layers = 24 textures)
    // Stars pick randomly from their layer's pool to avoid 560 unique canvases
    const _starTexPool = { far: [], mid: [], near: [] };
    for (let i = 0; i < 8; i++) {
        const hr = rndOf(STAR_HUES), h = rnd(hr.min, hr.max), s = rnd(70, 100);
        _starTexPool.far.push(makeStarTex(rnd(0.4, 1.2), h, s, rnd(60, 80), 0));
    }
    for (let i = 0; i < 8; i++) {
        const hr = rndOf(STAR_HUES), h = rnd(hr.min, hr.max), s = rnd(70, 100);
        const r  = rnd(1.2, 2.0);
        _starTexPool.mid.push(makeStarTex(r, h, s, rnd(70, 90), r * 2));
    }
    for (let i = 0; i < 8; i++) {
        const hr = rndOf(STAR_HUES), h = rnd(hr.min, hr.max), s = rnd(70, 100);
        const r  = rnd(2.0, 3.5);
        _starTexPool.near.push(makeStarTex(r, h, s, rnd(85, 100), r * 4));
    }

    class StarObj {
        constructor(layer) {
            this.layer   = layer;
            this.sprite  = new PIXI.Sprite(rndOf(_starTexPool[layer]));
            this.sprite.anchor.set(0.5);
            this.sprite.blendMode = 'add';

            if (layer === 'far') {
                this.speed       = 0.10 * CFG.gSpeed * rnd(0.8, 1.2);
                this.twinkleSpd  = rnd(0.005, 0.020);
                starFarLayer.addChild(this.sprite);
            } else if (layer === 'mid') {
                this.speed       = 0.25 * CFG.gSpeed * rnd(0.8, 1.2);
                this.twinkleSpd  = rnd(0.010, 0.030);
                starMidLayer.addChild(this.sprite);
            } else {
                this.speed       = 0.50 * CFG.gSpeed * rnd(0.8, 1.2);
                this.twinkleSpd  = rnd(0.020, 0.050);
                starNearLayer.addChild(this.sprite);
            }

            this.phase = rnd(0, Math.PI * 2);
            this.reset(true);
        }
        reset(init) {
            this.sx = rnd(0, W());
            this.sy = init ? rnd(0, H()) : -10;
            this.sprite.position.set(this.sx, this.sy);
        }
        update() {
            this.sy    += this.speed;
            this.phase += this.twinkleSpd;
            this.sprite.alpha      = 0.30 + ((Math.sin(this.phase) + 1) / 2) * 0.70;
            this.sprite.position.y = this.sy;
            if (this.sy > H() + 10) this.reset(false);
        }
    }

    let stars = [
        ...Array.from({ length: CFG.starsFar   }, () => new StarObj('far')),
        ...Array.from({ length: CFG.starsMid   }, () => new StarObj('mid')),
        ...Array.from({ length: CFG.starsNear  }, () => new StarObj('near')),
    ];

    // ─── COSMIC DUST ─────────────────────────────────────────────────────
    const _dustTex = (() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 8;
        const cx = cv.getContext('2d');
        const g  = cx.createRadialGradient(4, 4, 0, 4, 4, 4);
        g.addColorStop(0, 'rgba(200,180,255,0.55)');
        g.addColorStop(1, 'transparent');
        cx.fillStyle = g; cx.fillRect(0, 0, 8, 8);
        return toTex(cv);
    })();

    class DustObj {
        constructor() {
            this.sprite = new PIXI.Sprite(_dustTex);
            this.sprite.anchor.set(0.5);
            this.sprite.blendMode = 'add';
            this.reset(true);
            dustLayer.addChild(this.sprite);
        }
        reset(init) {
            this.bx        = rnd(0, W());
            this.dy        = init ? rnd(0, H()) : -10;
            this.baseSpeed = 0.30 * CFG.gSpeed * rnd(0.8, 1.2);
            this.oscSpeed  = rnd(0.010, 0.020);
            this.oscWidth  = rnd(10, 20);
            this.angle     = rnd(0, Math.PI * 2);
            const sc       = rnd(0.5, 1.2);
            this.sprite.scale.set(sc);
            this.sprite.alpha = rnd(0.3, 0.8);
        }
        update() {
            this.dy    += this.baseSpeed;
            this.angle += this.oscSpeed;
            this.sprite.position.set(this.bx + Math.sin(this.angle) * this.oscWidth, this.dy);
            if (this.dy > H() + 10) this.reset(false);
        }
    }

    let dusts = Array.from({ length: CFG.dustCount }, () => new DustObj());

    // ─── ASTEROIDS ───────────────────────────────────────────────────────
    const AST_PALETTES = [
        { dark: '#0a0812', base: '#1e162b', light: '#36284a', highlight: '#503e6b' },
        { dark: '#050710', base: '#151b2b', light: '#26324a', highlight: '#3a4a6b' },
        { dark: '#0c0808', base: '#211818', light: '#3b2b2b', highlight: '#594444' },
    ];

    function _jaggedLine(x1, y1, x2, y2, segs, variance) {
        const pts = [{ x: x1, y: y1 }];
        for (let i = 1; i < segs; i++) {
            const t = i / segs;
            pts.push({
                x: x1 + (x2 - x1) * t + rnd(-variance, variance),
                y: y1 + (y2 - y1) * t + rnd(-variance, variance),
            });
        }
        pts.push({ x: x2, y: y2 });
        return pts;
    }

    function makeAsteroidTex(radius, detailLevel, blurPx) {
        const pad  = blurPx * 3 + 6;
        const d    = Math.ceil(radius * 2.5 + pad * 2);
        const cv   = document.createElement('canvas');
        cv.width   = d; cv.height = d;
        const actx = cv.getContext('2d');
        const ctr  = d / 2;

        const pal  = rndOf(AST_PALETTES);
        const nV   = rndInt(8, 14);
        const vts  = [];
        for (let i = 0; i < nV; i++) {
            const ang = (i / nV) * Math.PI * 2;
            const v   = rnd(0.6, 1.1);
            vts.push({ x: ctr + Math.cos(ang) * radius * v, y: ctr + Math.sin(ang) * radius * v });
        }

        // Body fill
        actx.beginPath();
        actx.moveTo(vts[0].x, vts[0].y);
        for (let i = 1; i < vts.length; i++) actx.lineTo(vts[i].x, vts[i].y);
        actx.closePath();
        const bgrad = actx.createLinearGradient(ctr - radius, ctr - radius, ctr + radius, ctr + radius);
        bgrad.addColorStop(0,   pal.light);
        bgrad.addColorStop(0.4, pal.base);
        bgrad.addColorStop(1,   pal.dark);
        actx.fillStyle = bgrad;
        actx.fill();
        actx.save(); actx.clip();

        // Shadow blobs
        if (detailLevel >= 2) {
            for (let i = 0; i < rndInt(3, 6); i++) {
                actx.beginPath();
                actx.arc(
                    ctr + rnd(-radius, radius), ctr + rnd(-radius, radius),
                    rnd(radius * 0.2, radius * 0.5), 0, Math.PI * 2
                );
                actx.fillStyle = 'rgba(0,0,0,0.18)';
                actx.fill();
            }
        }

        // Craters
        const crCount = rndInt(1, detailLevel * 3);
        for (let i = 0; i < crCount; i++) {
            const crx = ctr + rnd(-radius * 0.8, radius * 0.8);
            const cry = ctr + rnd(-radius * 0.8, radius * 0.8);
            const crr = rnd(radius * 0.10, radius * 0.30);
            actx.beginPath(); actx.arc(crx, cry, crr, 0, Math.PI * 2);
            actx.fillStyle = pal.dark; actx.fill();
            actx.beginPath(); actx.arc(crx + crr * 0.1, cry + crr * 0.1, crr * 0.9, 0, Math.PI * 2);
            actx.fillStyle = pal.base; actx.fill();
            actx.beginPath(); actx.arc(crx - crr * 0.1, cry - crr * 0.1, crr * 0.8, Math.PI * 0.8, Math.PI * 1.7);
            actx.strokeStyle = pal.highlight; actx.lineWidth = crr * 0.2; actx.stroke();
        }

        // Crack lines
        if (detailLevel >= 2) {
            for (let i = 0; i < rndInt(1, detailLevel * 2); i++) {
                const sv  = rndOf(vts);
                const ex  = ctr + rnd(-radius * 0.5, radius * 0.5);
                const ey  = ctr + rnd(-radius * 0.5, radius * 0.5);
                const pts = _jaggedLine(sv.x, sv.y, ex, ey, 5, radius * 0.1);
                actx.beginPath();
                actx.moveTo(pts[0].x, pts[0].y);
                for (let p = 1; p < pts.length; p++) actx.lineTo(pts[p].x, pts[p].y);
                actx.strokeStyle = pal.dark; actx.lineWidth = rnd(1, 3); actx.lineJoin = 'round'; actx.stroke();
                // Highlight edge on crack
                actx.beginPath();
                actx.moveTo(pts[0].x - 1, pts[0].y - 1);
                for (let p = 1; p < pts.length; p++) actx.lineTo(pts[p].x - 1, pts[p].y - 1);
                actx.strokeStyle = 'rgba(255,255,255,0.08)'; actx.lineWidth = 1; actx.stroke();
            }
        }
        actx.restore();

        // Rim highlight + subtle edge glow
        actx.beginPath();
        actx.moveTo(vts[0].x, vts[0].y);
        for (let i = 1; i < vts.length; i++) actx.lineTo(vts[i].x, vts[i].y);
        actx.closePath();
        actx.strokeStyle   = pal.highlight;
        actx.lineWidth     = 2.5;
        actx.shadowColor   = pal.highlight;
        actx.shadowBlur    = 6;
        actx.shadowOffsetX = -2; actx.shadowOffsetY = -2;
        actx.stroke();
        actx.shadowBlur = 0; actx.shadowOffsetX = 0; actx.shadowOffsetY = 0;

        // Depth-of-field blur baked into texture for near-camera asteroids
        if (blurPx > 0) {
            const blur  = document.createElement('canvas');
            blur.width  = d; blur.height = d;
            const bctx  = blur.getContext('2d');
            bctx.filter = `blur(${blurPx}px)`;
            bctx.drawImage(cv, 0, 0);
            return toTex(blur);
        }

        return toTex(cv);
    }

    class AsteroidObj {
        constructor(layer) {
            this.layer = layer;
            let radius, speed, opacity, detail, blurPx, container;

            if (layer === 'far') {
                radius    = rndInt(10, 25);
                speed     = 0.35 * CFG.gSpeed;
                opacity   = 0.30;
                detail    = 1;
                blurPx    = 0;
                container = asteroidFarLayer;
            } else if (layer === 'mid') {
                radius    = rndInt(25, 45);
                speed     = 0.70 * CFG.gSpeed;
                opacity   = 0.70;
                detail    = 2;
                blurPx    = 0;
                container = asteroidMidLayer;
            } else {
                radius    = rndInt(45, 80);
                speed     = 1.30 * CFG.gSpeed;
                opacity   = 1.00;
                detail    = 3;
                blurPx    = 2;   // depth-of-field: near = slight blur baked in
                container = asteroidNearLayer;
            }

            this.radius   = radius;
            // Larger = slower scroll (depth illusion within each layer)
            this.speed    = speed * (50 / radius) * rnd(0.85, 1.15);
            this.rotSpeed = rnd(-0.006, 0.006);
            this.rot      = rnd(0, Math.PI * 2);

            this.sprite = new PIXI.Sprite(makeAsteroidTex(radius, detail, blurPx));
            this.sprite.anchor.set(0.5);
            this.sprite.alpha    = opacity;
            this.sprite.rotation = this.rot;

            this.reset(true);
            container.addChild(this.sprite);
        }
        reset(init) {
            this.ax = rnd(0, W());
            this.ay = init ? rnd(0, H()) : -(this.radius * 2.5 + 20);
            this.sprite.position.set(this.ax, this.ay);
        }
        update() {
            this.ay  += this.speed;
            this.rot += this.rotSpeed;
            this.sprite.position.y = this.ay;
            this.sprite.rotation   = this.rot;
            if (this.ay - this.radius * 2 > H()) this.reset(false);
        }
    }

    let asteroids = [
        ...Array.from({ length: CFG.asteroidsFar   }, () => new AsteroidObj('far')),
        ...Array.from({ length: CFG.asteroidsMid   }, () => new AsteroidObj('mid')),
        ...Array.from({ length: CFG.asteroidsNear  }, () => new AsteroidObj('near')),
    ];

    // ─── DENSITY REBUILD (explicit PC/Mobile selection) ────────────────────
    // Called from selectPlatform() in index.html once the player actually
    // makes a choice, so the initial touch-detection guess above gets
    // corrected to match their real selection — PC always rebuilds back to
    // the untouched DESKTOP_CFG numbers, never a reduced count.
    window._bgSetDensity = function (platform) {
        const next = platform === 'mobile' ? MOBILE_CFG : DESKTOP_CFG;
        if (next === CFG) return; // already matches, nothing to rebuild
        CFG = next;

        galaxyLayer.removeChildren();
        for (const g of galaxies) g.tex.destroy(true);
        nebulaLayer.removeChildren();
        for (const n of nebulas) n.tex.destroy(true);
        asteroidFarLayer.removeChildren();
        asteroidMidLayer.removeChildren();
        asteroidNearLayer.removeChildren();
        for (const a of asteroids) a.sprite.texture.destroy(true);
        // Stars/dust use a shared pooled texture (_starTexPool/_dustTex) —
        // only detach the sprites, never destroy the shared texture.
        starFarLayer.removeChildren();
        starMidLayer.removeChildren();
        starNearLayer.removeChildren();
        dustLayer.removeChildren();

        galaxies  = Array.from({ length: CFG.galaxyCount }, () => new GalaxyObj());
        nebulas   = Array.from({ length: CFG.nebulaCount }, () => new NebulaObj());
        stars     = [
            ...Array.from({ length: CFG.starsFar  }, () => new StarObj('far')),
            ...Array.from({ length: CFG.starsMid  }, () => new StarObj('mid')),
            ...Array.from({ length: CFG.starsNear }, () => new StarObj('near')),
        ];
        dusts     = Array.from({ length: CFG.dustCount }, () => new DustObj());
        asteroids = [
            ...Array.from({ length: CFG.asteroidsFar  }, () => new AsteroidObj('far')),
            ...Array.from({ length: CFG.asteroidsMid  }, () => new AsteroidObj('mid')),
            ...Array.from({ length: CFG.asteroidsNear }, () => new AsteroidObj('near')),
        ];
    };

    // ─── RESIZE ──────────────────────────────────────────────────────────
    new ResizeObserver(() => {
        const w = window.innerWidth, h = window.innerHeight;
        if (app.renderer.width === w && app.renderer.height === h) return;
        app.renderer.resize(w, h);

        bgSprite.destroy();
        bgSprite = new PIXI.Sprite(makeBgTex(w, h));
        bgSprite.width = w; bgSprite.height = h;
        bgLayer.addChildAt(bgSprite, 0);

        _rebuildBrightnessGfx();
        brightnessGfx.alpha = 1.0 - window._bgBrightness;
    }).observe(document.documentElement);

    // ─── ANIMATION LOOP ──────────────────────────────────────────────────
    // On mobile this background is a fixed cost the gameplay perf tiers
    // never touch, so on top of the reduced sprite counts above, update+
    // render only run every other frame (~half the CPU work of moving
    // sprites, and half the GPU work of this context's render() calls).
    // Motion at half-rate is barely perceptible for slow parallax drift.
    let _tickSkip = false;
    function tick() {
        const throttle = window._platform === 'mobile';
        if (!window._bgPaused && !(throttle && (_tickSkip = !_tickSkip))) {
            for (const g of galaxies)  g.update();
            for (const n of nebulas)   n.update();
            for (const s of stars)     s.update();
            for (const d of dusts)     d.update();
            for (const a of asteroids) a.update();
            app.renderer.render(app.stage);
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    window._bgReady = true;

})();
