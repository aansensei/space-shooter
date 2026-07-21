// js/pixi-renderer.js, Pixi.js v8 WebGL renderer
//
// Phase 0: Transparent overlay canvas, feature flag
// Phase 1: bullets, spirit bullets, particles → WebGL sprites (additive blend)
// Phase 2: ctx.shadowBlur suppressed (383 calls eliminated → 10fps→144fps)
// Phase 3: nebula atmosphere, bullet trails, hit-flash feedback
//
// Depends on render.js:  _getBulletSprite, _getSpiritSprite, _getGlowSprite

window._usePixi          = false;
window._pixiDrawBullets  = null;
window._pixiDrawParticles = null;
window._pixiRender       = null;

(async function initPixiRenderer() {
    'use strict';

    const gameCanvas = document.getElementById('gameCanvas');
    if (!gameCanvas) { console.warn('[Pixi] #gameCanvas not found'); return; }
    if (typeof PIXI === 'undefined') { console.warn('[Pixi] PIXI not loaded'); return; }

    // Application
    const app = new PIXI.Application();
    await app.init({
        width:           gameCanvas.width  || window.innerWidth,
        height:          gameCanvas.height || window.innerHeight,
        backgroundAlpha: 0,
        antialias:       false,
        autoStart:       false,
        preference:      'webgl',
    });
    window._pixiApp = app;

    const pc = app.canvas;
    pc.id = 'pixiCanvas';
    Object.assign(pc.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh',
        pointerEvents: 'none', display: 'none', zIndex: '1',
    });
    gameCanvas.after(pc);

    // Same WebGL context-loss risk as background.js's canvas — fall back to
    // the plain Canvas2D bullet/particle/nebula paths instead of losing this
    // layer silently for the rest of the session.
    pc.addEventListener('webglcontextlost', (ev) => {
        ev.preventDefault();
        window._usePixi = false;
        console.warn('[Pixi] WebGL context lost — falling back to Canvas2D bullets/particles.');
    });

    // Stage layers (back → front)
    const nebulaLayer  = new PIXI.Container(); // distant nebula atmosphere
    const riftLayer    = new PIXI.Container(); // dimensional rifts (via _pixiSpawnRift/_pixiDestroyRift)
    const trailLayer   = new PIXI.Container(); // bullet trails
    const particleLayer= new PIXI.Container(); // particles
    const bulletLayer  = new PIXI.Container(); // bullets
    const spiritLayer  = new PIXI.Container(); // spirit bullets
    const flashLayer   = new PIXI.Container(); // hit flashes
    app.stage.addChild(nebulaLayer);
    app.stage.addChild(riftLayer);
    app.stage.addChild(trailLayer);
    app.stage.addChild(particleLayer);
    app.stage.addChild(bulletLayer);
    app.stage.addChild(spiritLayer);
    app.stage.addChild(flashLayer);

    // Texture cache
    const _texCache = {};
    function _canvasTex(canvas2d, key) {
        if (!canvas2d) return PIXI.Texture.EMPTY;
        if (_texCache[key]) return _texCache[key];
        return (_texCache[key] = PIXI.Texture.from(canvas2d));
    }
    function _getBulletTex(type, size, gfxLvl) {
        const t = type || 'player_auto', sz = Math.max(1, Math.round(size));
        return _canvasTex(_getBulletSprite(t, size, gfxLvl), 'b_' + t + '_' + sz + '_' + gfxLvl);
    }
    function _getSpiritTex(isPhoto, size) {
        const sz = Math.max(1, Math.round(size));
        return _canvasTex(_getSpiritSprite(isPhoto, size), 's_' + (isPhoto ? 'ph' : 'sp') + '_' + sz);
    }
    function _getGlowTex(color, size, gfxLvl) {
        const glowR = gfxLvl < 1 ? 14 : gfxLvl < 2 ? 8 : 5;
        const r = Math.ceil(size + glowR);
        return _canvasTex(_getGlowSprite(color, r), 'g_' + color + '_' + r);
    }

    // Sprite pool
    const _pool = [];
    function _acq() { return _pool.pop() || new PIXI.Sprite(); }
    function _rel(s) { _pool.push(s); }
    function _clearLayer(layer) {
        const rem = layer.removeChildren();
        for (const c of rem) { if (c instanceof PIXI.Sprite) _rel(c); }
    }

    // Pre-warm this context's texture upload + shader-compile cost before
    // it's needed for real. Safari's WebGL implementation costs roughly
    // 30x more per JS->WebGL API call than Chrome's ANGLE path and stalls
    // synchronously the first time a given texture/shader combo is drawn.
    // This app's bullet/particle/spirit textures are created lazily on
    // first use (_canvasTex cache), so the instant wave 1's spawn burst
    // needs many brand-new textures at once, that one-time Safari cost can
    // land entirely on a single frame — easily enough to trip main.js's
    // >500ms stall watchdog right after picking a sigil. Rendering a
    // representative set of textures off-screen here (called during the
    // loading screen, see index.html) pays that cost while a stall is
    // invisible instead of during the first real combat frame.
    window._pixiWarmup = function () {
        const gfx = window._gfxLevel || 0;
        const warm = [];
        const bulletSpecs = [['player_auto', 8], ['player_charged', 14]];
        const glowSpecs = [
            ['#ffffff', 10], ['#ff3355', 14], ['#00ff88', 14], ['#ffd700', 10],
            ['lime', 12], ['#aa44ff', 16], ['#00e5cc', 10],
        ];
        for (const [type, size] of bulletSpecs) {
            const s = _acq();
            s.texture = _getBulletTex(type, size, gfx);
            s.anchor.set(0.5);
            s.position.set(-9999, -9999);
            s.blendMode = 'add';
            bulletLayer.addChild(s);
            warm.push(s);
        }
        for (const [color, size] of glowSpecs) {
            const s = _acq();
            s.texture = _getGlowTex(color, size, gfx);
            s.anchor.set(0.5);
            s.position.set(-9999, -9999);
            s.blendMode = 'add';
            particleLayer.addChild(s);
            warm.push(s);
        }
        for (const isPhoto of [false, true]) {
            const s = _acq();
            s.texture = _getSpiritTex(isPhoto, 20);
            s.anchor.set(0.5);
            s.position.set(-9999, -9999);
            s.blendMode = 'add';
            spiritLayer.addChild(s);
            warm.push(s);
        }
        app.renderer.render(app.stage);
        app.renderer.render(app.stage);
        for (const s of warm) { s.parent.removeChild(s); _rel(s); }
    };

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3A, Nebula atmosphere
    // Custom radial-gradient textures (opacity baked in) drift slowly.
    // 'screen' blend brightens dark backgrounds proportionally, visible
    // on the dark space canvas without covering gameplay.
    // ══════════════════════════════════════════════════════════════════
    const W = () => app.renderer.width, H = () => app.renderer.height;

    function _makeNebulaTex(r, g, b, size) {
        const d = size * 2;
        const c = document.createElement('canvas');
        c.width = c.height = d;
        const cx = c.getContext('2d');
        const grad = cx.createRadialGradient(size, size, 0, size, size, size);
        grad.addColorStop(0,    `rgba(${r},${g},${b},0.55)`);
        grad.addColorStop(0.30, `rgba(${r},${g},${b},0.30)`);
        grad.addColorStop(0.60, `rgba(${r},${g},${b},0.12)`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},0.00)`);
        cx.fillStyle = grad;
        cx.fillRect(0, 0, d, d);
        return PIXI.Texture.from(c);
    }

    // Three clouds: blue-purple, cyan-teal, violet
    const _nebTex = [
        _makeNebulaTex(60, 20, 220, 260),
        _makeNebulaTex(0,  130, 200, 220),
        _makeNebulaTex(130, 0, 210, 200),
    ];
    const _nebulae = [
        { x: 0.20, y: 0.30, ti: 0, vx:  0.18, vy:  0.07 },
        { x: 0.72, y: 0.55, ti: 1, vx: -0.12, vy:  0.10 },
        { x: 0.48, y: 0.08, ti: 2, vx:  0.08, vy: -0.09 },
    ];
    let _nebulaInit = false;
    function _initNebulae() {
        if (_nebulaInit) return;
        for (const n of _nebulae) { n.x *= W(); n.y *= H(); }
        _nebulaInit = true;
    }

    function _drawNebulae() {
        _initNebulae();
        _clearLayer(nebulaLayer);
        const w = W(), h = H();
        for (const n of _nebulae) {
            const tex = _nebTex[n.ti];
            const r = tex.width / 2;
            n.x += n.vx; n.y += n.vy;
            if (n.x < -r) n.x = w + r;
            if (n.x > w + r) n.x = -r;
            if (n.y < -r) n.y = h + r;
            if (n.y > h + r) n.y = -r;

            const s = _acq();
            s.texture   = tex;
            s.anchor.set(0.5);
            s.position.set(n.x, n.y);
            s.alpha     = 1.0; // opacity baked into texture gradient
            s.blendMode = 'screen'; // brightens dark space without blowing out bright areas
            nebulaLayer.addChild(s);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3B, Bullet trails
    // Each frame a trail entry is recorded at the bullet's current
    // position.  The entry persists and fades over ~6 frames, so as the
    // bullet advances it leaves a glowing streak behind it.
    // ══════════════════════════════════════════════════════════════════
    const _trails   = []; // { x, y, alpha, size }
    const _TRAIL_CAP = 200;
    const _TRAIL_DECAY = 0.50;

    function _spawnTrails(bullets) {
        let budget = Math.min(40, _TRAIL_CAP - _trails.length);
        for (let i = 0; i < bullets.length && budget > 0; i++, budget--) {
            const b = bullets[i];
            _trails.push({ x: b.x, y: b.y, alpha: 0.38, size: Math.max(2, b.size * 0.45) });
        }
    }

    function _drawTrails() {
        _clearLayer(trailLayer);
        for (let i = _trails.length - 1; i >= 0; i--) {
            const t = _trails[i];
            t.alpha *= _TRAIL_DECAY;
            if (t.alpha < 0.018) { _trails.splice(i, 1); continue; }
            const s = _acq();
            s.texture   = _getGlowTex('#aaccff', t.size, 1); // cool white-blue trail
            s.anchor.set(0.5);
            s.position.set(t.x, t.y);
            s.alpha     = t.alpha;
            s.blendMode = 'add';
            trailLayer.addChild(s);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3C, Hit flash
    // Track enemy HP each frame, when HP drops, spawn a brief white
    // flash at the enemy's position.  Uses object-reference keying so
    // it works regardless of enemy position or type.
    // ══════════════════════════════════════════════════════════════════
    const _enemyHp  = new Map(); // enemy object → last hp
    const _flashes  = []; // { x, y, alpha, r }
    const _FLASH_DECAY = 0.48;

    function _checkHits() {
        if (typeof enemies === 'undefined' || typeof gameState === 'undefined' || gameState !== 'playing') {
            _enemyHp.clear();
            return;
        }
        const live = new Set(enemies);
        for (const e of enemies) {
            const prev = _enemyHp.get(e);
            if (prev !== undefined && e.hp < prev) {
                _flashes.push({ x: e.x, y: e.y, alpha: 0.88, r: (e.size || 20) * 1.1 });
            }
            _enemyHp.set(e, e.hp);
        }
        for (const [e] of _enemyHp) { if (!live.has(e)) _enemyHp.delete(e); }
    }

    function _drawFlashes() {
        _clearLayer(flashLayer);
        for (let i = _flashes.length - 1; i >= 0; i--) {
            const f = _flashes[i];
            f.alpha *= _FLASH_DECAY;
            if (f.alpha < 0.02) { _flashes.splice(i, 1); continue; }
            const s = _acq();
            s.texture   = _getGlowTex('#ffffff', f.r, 0);
            s.anchor.set(0.5);
            s.position.set(f.x, f.y);
            s.alpha     = f.alpha;
            s.blendMode = 'add';
            flashLayer.addChild(s);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3D, Dimensional Rift zones (Skill A)
    // Extracted exactly from dimensional_rift_pixi-v2.html:
    //   void core circles, rotating energy ring w/ 12 spikes, animated
    //   cracks with 18% glitch chance, floating antimatter particles.
    // ══════════════════════════════════════════════════════════════════
    const _riftContainers = new Map(); // rift object → PIXI.Container

    function _pixiCreateRiftContainer(rift) {
        const container = new PIXI.Container();
        container.x = rift.x;
        container.y = rift.y;
        const radius = rift.radius;
        container._riftAge        = 0;
        container._riftParticles  = [];
        container._riftCracksInfo = rift.cracksInfo;
        container._riftRadius     = radius;

        // Void core, three concentric fills (outermost → innermost)
        const coreGraphic = new PIXI.Graphics();
        coreGraphic.circle(0, 0, radius * 1.25).fill({ color: 0x240046, alpha: 0.30 });
        coreGraphic.circle(0, 0, radius * 1.05).fill({ color: 0x3c096c, alpha: 0.50 });
        coreGraphic.circle(0, 0, radius * 0.75).fill({ color: 0x020105, alpha: 1.00 });
        container.addChild(coreGraphic);
        container._riftCore = coreGraphic;

        // Energy ring, two stroke circles + 12 spike lines
        const ringGraphic = new PIXI.Graphics();
        ringGraphic.circle(0, 0, radius * 0.95).stroke({ color: 0x00f5ff, width: 1.5, alpha: 0.4 });
        ringGraphic.circle(0, 0, radius * 0.85).stroke({ color: 0x9d4edd, width: 2.5, alpha: 0.7 });
        const spikes = 12;
        for (let i = 0; i < spikes; i++) {
            const angle  = (i / spikes) * Math.PI * 2;
            const innerR = radius * 0.78;
            const outerR = radius * (1.0 + (i % 3 === 0 ? 0.08 : 0.04)); // slight variety
            ringGraphic
                .moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR)
                .lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR)
                .stroke({ color: 0xe0aaff, width: 2, alpha: 0.6 });
        }
        container.addChild(ringGraphic);
        container._riftRing = ringGraphic;

        // Cracks graphic, redrawn every frame
        const cracksGraphic = new PIXI.Graphics();
        container.addChild(cracksGraphic);
        container._riftCracks = cracksGraphic;

        // Particle layer
        const particleContainer = new PIXI.Container();
        container.addChild(particleContainer);
        container._riftParticleLayer = particleContainer;

        return container;
    }

    function _drawRifts() {
        if (typeof dimensionalRifts === 'undefined') return;

        // Remove containers for expired rifts
        for (const [rift, container] of _riftContainers) {
            if (!dimensionalRifts.includes(rift)) {
                riftLayer.removeChild(container);
                _riftContainers.delete(rift);
            }
        }

        for (const rift of dimensionalRifts) {
            const container = _riftContainers.get(rift);
            if (!container) continue;

            // age drives all periodic animations (matches HTML: age += delta*0.05, delta≈1)
            container._riftAge += 0.05;

            // Fade out during last ~16.7% of lifetime (500ms of 3000ms)
            const lifeRatio = rift.timer / rift.maxTimer;
            container.alpha = lifeRatio < 0.167 ? lifeRatio / 0.167 : 1;

            // Core scale pulse: 1 + sin(age*2.5)*0.05
            const pulse = 1 + Math.sin(container._riftAge * 2.5) * 0.05;
            container._riftCore.scale.set(pulse);

            // Ring rotation
            container._riftRing.rotation -= 0.025;

            // Cracks (redrawn each frame)
            const g = container._riftCracks;
            g.clear();
            const triggerGlitch = Math.random() < 0.18;
            for (const crack of container._riftCracksInfo) {
                const currentAngle = crack.baseAngle + (triggerGlitch ? (Math.random() - 0.5) * 0.2 : 0);
                const currentLen   = crack.maxLength  * (triggerGlitch ? (0.85 + Math.random() * 0.3) : 1);
                const segments = 4;
                let lastX = 0, lastY = 0;
                g.moveTo(0, 0);
                for (let s = 1; s <= segments; s++) {
                    const ratio   = s / segments;
                    const targetX = Math.cos(currentAngle) * currentLen * ratio;
                    const targetY = Math.sin(currentAngle) * currentLen * ratio;
                    // perpendicular jitter on all but the final segment
                    const jitterRange = s < segments ? (container._riftRadius * 0.22) : 0;
                    const offset  = (Math.random() - 0.5) * jitterRange;
                    const perpX   = -Math.sin(currentAngle) * offset;
                    const perpY   =  Math.cos(currentAngle) * offset;
                    lastX = targetX + perpX;
                    lastY = targetY + perpY;
                    g.lineTo(lastX, lastY);
                }
                const strokeColor = triggerGlitch ? 0xffffff : 0xd800ff;
                const strokeWidth = triggerGlitch ? 3.0 : 1.5;
                g.stroke({ color: strokeColor, width: strokeWidth, alpha: 0.85 });

                // Sub-branch in cyan, only when glitching
                if (crack.hasSubBranch && triggerGlitch) {
                    const branchAngle = currentAngle + (Math.random() > 0.5 ? 0.5 : -0.5);
                    g.moveTo(lastX * 0.5, lastY * 0.5)
                     .lineTo(lastX * 0.5 + Math.cos(branchAngle) * 20,
                             lastY * 0.5 + Math.sin(branchAngle) * 20)
                     .stroke({ color: 0x00f5ff, width: 1.2, alpha: 0.7 });
                }
            }

            // Antimatter particles
            if (Math.random() < 0.45) {
                const p = new PIXI.Graphics();
                const col = Math.random() > 0.5 ? 0x00e5ff : 0xff007f;
                p.circle(0, 0, 1.2 + Math.random() * 1.8).fill({ color: col, alpha: 1 });
                const pAngle = Math.random() * Math.PI * 2;
                const pDist  = Math.random() * container._riftRadius * 1.1;
                p.x    = Math.cos(pAngle) * pDist;
                p.y    = Math.sin(pAngle) * pDist;
                p.vx   = (Math.random() - 0.5) * 0.4;
                p.vy   = -0.4 - Math.random() * 1.2; // float upward
                p.life = 1.0;
                container._riftParticleLayer.addChild(p);
                container._riftParticles.push(p);
            }
            for (let j = container._riftParticles.length - 1; j >= 0; j--) {
                const p = container._riftParticles[j];
                p.x   += p.vx;
                p.y   += p.vy;
                p.life -= 0.018; // matches HTML fade rate
                p.alpha = p.life;
                if (p.life <= 0) {
                    container._riftParticleLayer.removeChild(p);
                    p.destroy();
                    container._riftParticles.splice(j, 1);
                }
            }
        }
    }

    window._pixiSpawnRift = function(rift) {
        const container = _pixiCreateRiftContainer(rift);
        riftLayer.addChild(container);
        _riftContainers.set(rift, container);
    };

    window._pixiDestroyRift = function(rift) {
        const container = _riftContainers.get(rift);
        if (container) {
            riftLayer.removeChild(container);
            _riftContainers.delete(rift);
        }
    };

    // ══════════════════════════════════════════════════════════════════
    // PHASE 1, Bullets / spirits / particles
    // ══════════════════════════════════════════════════════════════════
    window._pixiDrawBullets = function(bullets, spiritBullets) {
        _spawnTrails(bullets); // record trail positions before layer clear
        _clearLayer(bulletLayer);
        _clearLayer(spiritLayer);
        const gfx = window._gfxLevel || 0;

        for (const b of bullets) {
            const s = _acq();
            s.texture   = _getBulletTex(b.type, b.size, gfx);
            s.anchor.set(0.5);
            s.position.set(b.x, b.y);
            s.alpha     = 1;
            s.blendMode = 'add';
            bulletLayer.addChild(s);
        }
        for (const b of spiritBullets) {
            const s = _acq();
            s.texture   = _getSpiritTex(b.isPhoto, b.size);
            s.anchor.set(0.5);
            s.position.set(b.x, b.y);
            s.alpha     = 1;
            s.blendMode = 'add';
            spiritLayer.addChild(s);
        }
    };

    window._pixiDrawParticles = function(particles) {
        _clearLayer(particleLayer);
        const gfx = window._gfxLevel || 0;
        for (const p of particles) {
            if (p.isSummonRing || p.isLaserLine || p.isSkillGAura) continue;
            const alpha = p.lifetime / p.maxLifetime;
            if (alpha <= 0) continue;
            const s = _acq();
            s.texture   = _getGlowTex(p.color, p.size, gfx);
            s.anchor.set(0.5);
            s.position.set(p.x, p.y);
            s.alpha     = alpha;
            s.blendMode = 'add';
            particleLayer.addChild(s);
        }
    };

    // Main render tick
    window._pixiRender = function() {
        const playing = typeof gameState !== 'undefined' && gameState === 'playing';

        _drawNebulae(); // always, nebulae drift on start/gameover screens too
        _checkHits();
        _drawTrails();
        _drawFlashes();
        // rift rendered on ctx before enemies, not here

        if (!playing || window._sigilPicker) {
            // Clear stale game-layer content so it doesn't bleed onto UI screens or sigil picker
            _clearLayer(bulletLayer);
            _clearLayer(spiritLayer);
            _clearLayer(particleLayer);
            _clearLayer(trailLayer);
            _flashes.length = 0;
        }

        app.renderer.render(app.stage);
    };

    // Resize
    new ResizeObserver(() => {
        const w = gameCanvas.width || window.innerWidth;
        const h = gameCanvas.height || window.innerHeight;
        if (app.renderer.width !== w || app.renderer.height !== h) app.renderer.resize(w, h);
    }).observe(gameCanvas);

    // Feature flag
    // shadowBlur strategy: soft-cap at 8px via native-setter delegation.
    //
    // Why 8px, NOT _mobPerf=true:
    //  - _mobPerf skips entire visual blocks (armor shards, RGB glitch on
    //    veilshroud, gills highlight on egregor), breaks animations.
    //  - Blur cost scales ~O(r²): 20px→8px = 6x cheaper, 60px→8px = 56x cheaper.
    //  - Common entities use shadowBlur 8-14px → capped to 8 → tight glow, fast.
    //  - Skills/laser use 38-60px → capped to 8 → still glows, way cheaper.
    //  - _mobPerf stays false → ALL visual effects (ribbons, shards, glitch) render.
    let _on = false, _blurSuppressed = false;
    Object.defineProperty(window, '_usePixi', {
        get: () => _on,
        set: v  => {
            _on = !!v;
            pc.style.display = _on ? 'block' : 'none';
            if (_on && !_blurSuppressed && typeof ctx !== 'undefined') {
                const _d = Object.getOwnPropertyDescriptor(
                    CanvasRenderingContext2D.prototype, 'shadowBlur');
                if (_d && _d.set) {
                    const _ng = _d.get, _ns = _d.set;
                    Object.defineProperty(ctx, 'shadowBlur', {
                        get()  { return _ng.call(this); },
                        set(v) { _ns.call(this, v > 0 ? Math.min(v, 8) : 0); },
                        configurable: true,
                    });
                }
                _blurSuppressed = true;
            }
        },
        configurable: true,
    });

    window._usePixi = true;
    console.info('[Pixi] Phase 3 active — nebula, bullet trails, hit flash.');
})().catch(e => console.error('[Pixi] init error:', e));
