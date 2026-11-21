// Pisces: Space Journey. Showdown Voyage bullet pool and collision module.
// Provides a preallocated 1024 bullet pool, high contrast sprite cache, lasers, and shared collision testing.

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
    } else {
        root.DuelBullets = factory(root);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    const Theme = (typeof DuelTheme !== 'undefined') ? DuelTheme : ((root && root.DuelTheme) ? root.DuelTheme : (typeof require !== 'undefined' ? require('./duel-theme.js') : null));
    const DUEL_THEME = Theme ? Theme.DUEL_THEME : (root && root.DuelTheme ? root.DuelTheme.DUEL_THEME : null);

    const POOL_CAPACITY = 1024;
    const DEFAULT_BULLET_RADIUS = 4;
    const DEFAULT_MAX_AGE = 6.0;
    const SHIP_HIT_RADIUS = 5.75;
    const GRAZE_EXTRA_RADIUS = 20.0;

    const COLOR_PALETTES = {
        ember: { halo: '#ff7942', main: '#f36a2a', core: '#fff1db', dark: '#300a12' },
        hellrose: { halo: '#ff4384', main: '#ef286b', core: '#ffe9ee', dark: '#30051a' },
        gold: DUEL_THEME.bulletFamilies.gold,
        yellow: DUEL_THEME.bulletFamilies.gold,
        white: DUEL_THEME.bulletFamilies.gold,
        crimson: DUEL_THEME.bulletFamilies.crimson,
        red: DUEL_THEME.bulletFamilies.crimson,
        orange: DUEL_THEME.bulletFamilies.crimson,
        violet: DUEL_THEME.bulletFamilies.violet,
        purple: DUEL_THEME.bulletFamilies.violet,
        lime: DUEL_THEME.bulletFamilies.violet,
        cyan: DUEL_THEME.bulletFamilies.violet
    };

    const SPRITE_SIZES = {
        spore: { w: 20, h: 20, radius: 3.5 },
        ichor: { w: 20, h: 28, radius: 4.5 },
        eye_seed: { w: 24, h: 24, radius: 5.5 },
        thorn: { w: 20, h: 30, radius: 4.5 },
        void_shard: { w: 22, h: 28, radius: 5.0 },
        pellet: { w: 16, h: 16, radius: 3.5 },
        ball: { w: 22, h: 22, radius: 5.5 },
        big_ball: { w: 34, h: 34, radius: 10.0 },
        rice: { w: 18, h: 26, radius: 4.5 },
        kunai: { w: 18, h: 30, radius: 4.5 },
        needle: { w: 14, h: 28, radius: 3.5 },
        star: { w: 24, h: 24, radius: 6.0 },
        oval: { w: 20, h: 28, radius: 5.0 },
        crystal: { w: 20, h: 28, radius: 5.0 },
        ring: { w: 28, h: 28, radius: 8.0 }
    };

    const _spriteCache = {};

    function _createOffscreenCanvas(w, h) {
        if (typeof document !== 'undefined' && document.createElement) {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            return c;
        }
        return null;
    }

    function _bakeBulletSprite(style, colorKey) {
        const pal = COLOR_PALETTES[colorKey] || COLOR_PALETTES.orange;
        const meta = SPRITE_SIZES[style] || SPRITE_SIZES.ball;
        const w = meta.w;
        const h = meta.h;
        const canvas = _createOffscreenCanvas(w, h);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        const cx = w * 0.5;
        const cy = h * 0.5;

        ctx.save();
        if (['spore', 'ichor', 'eye_seed', 'thorn', 'void_shard'].includes(style)) {
            ctx.translate(cx, cy);
            const pathBody = () => {
                ctx.beginPath();
                if (style === 'spore') {
                    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? 4 : 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
                } else if (style === 'eye_seed') ctx.ellipse(0, 0, 7, 5.5, 0, 0, Math.PI * 2);
                else if (style === 'ichor') { ctx.moveTo(0, -10); ctx.bezierCurveTo(7, 0, 6, 7, 0, 8); ctx.bezierCurveTo(-6, 7, -7, 0, 0, -10); }
                else if (style === 'thorn') { ctx.moveTo(0, -12); ctx.quadraticCurveTo(6, -2, 3, 9); ctx.lineTo(0, 5); ctx.lineTo(-3, 9); ctx.quadraticCurveTo(-6, -2, 0, -12); }
                else { ctx.moveTo(0, -11); ctx.lineTo(6, -2); ctx.lineTo(2, 9); ctx.lineTo(-5, 4); ctx.lineTo(-3, -5); ctx.closePath(); }
            };
            ctx.save();
            ctx.shadowColor = pal.halo; ctx.shadowBlur = 5;
            pathBody(); ctx.fillStyle = pal.main; ctx.fill();
            ctx.restore();
            pathBody(); ctx.strokeStyle = pal.dark; ctx.lineWidth = 5; ctx.stroke();
            const g = ctx.createLinearGradient(-6, -9, 6, 9); g.addColorStop(0, pal.core); g.addColorStop(0.35, pal.main); g.addColorStop(1, pal.halo);
            ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = pal.main; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = pal.core; ctx.beginPath(); ctx.ellipse(0, 0, 1.6, style === 'eye_seed' ? 4 : 2.8, 0, 0, Math.PI * 2); ctx.fill();
            if (style === 'eye_seed') { ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.ellipse(0, 0, 1.1, 3, 0, 0, Math.PI * 2); ctx.fill(); }
        } else if (style === 'pellet') {
            ctx.beginPath();
            ctx.arc(cx, cy, 5.0, 0, Math.PI * 2);
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'ball') {
            ctx.beginPath();
            ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 5.8, 0, Math.PI * 2);
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'big_ball') {
            ctx.beginPath();
            ctx.arc(cx, cy, 13.0, 0, Math.PI * 2);
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 11.0, 0, Math.PI * 2);
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 5.8, 0, Math.PI * 2);
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'rice') {
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.5, 10.0, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(0, 0, 3.2, 8.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(0, 0, 1.6, 5.0, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'kunai') {
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(6, -2);
            ctx.lineTo(4, 11);
            ctx.lineTo(-4, 11);
            ctx.lineTo(-6, -2);
            ctx.closePath();
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(4.5, -2);
            ctx.lineTo(2.8, 9);
            ctx.lineTo(-2.8, 9);
            ctx.lineTo(-4.5, -2);
            ctx.closePath();
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(2, -1);
            ctx.lineTo(1.2, 6);
            ctx.lineTo(-1.2, 6);
            ctx.lineTo(-2, -1);
            ctx.closePath();
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'needle') {
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(3.2, 0);
            ctx.lineTo(2, 11);
            ctx.lineTo(-2, 11);
            ctx.lineTo(-3.2, 0);
            ctx.closePath();
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(2, 0);
            ctx.lineTo(1.2, 9);
            ctx.lineTo(-1.2, 9);
            ctx.lineTo(-2, 0);
            ctx.closePath();
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(0.9, 0);
            ctx.lineTo(0.6, 6);
            ctx.lineTo(-0.6, 6);
            ctx.lineTo(-0.9, 0);
            ctx.closePath();
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'star') {
            ctx.translate(cx, cy);
            const drawStarPath = function (rOuter, rInner) {
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const ang = (i * Math.PI) / 5 - Math.PI * 0.5;
                    const r = (i % 2 === 0) ? rOuter : rInner;
                    const sx = Math.cos(ang) * r;
                    const sy = Math.sin(ang) * r;
                    if (i === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.closePath();
            };

            drawStarPath(9.5, 4.2);
            ctx.fillStyle = pal.dark;
            ctx.fill();

            drawStarPath(7.6, 3.2);
            ctx.fillStyle = pal.main;
            ctx.fill();

            drawStarPath(3.8, 1.6);
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'oval') {
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.ellipse(0, 0, 5.5, 11.0, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(0, 0, 4.0, 9.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(0, 0, 2.0, 5.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'crystal') {
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.moveTo(0, -11);
            ctx.lineTo(5.5, 0);
            ctx.lineTo(0, 11);
            ctx.lineTo(-5.5, 0);
            ctx.closePath();
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(4.2, 0);
            ctx.lineTo(0, 9);
            ctx.lineTo(-4.2, 0);
            ctx.closePath();
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(2.0, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(-2.0, 0);
            ctx.closePath();
            ctx.fillStyle = pal.core;
            ctx.fill();
        } else if (style === 'ring') {
            ctx.beginPath();
            ctx.arc(cx, cy, 11.0, 0, Math.PI * 2);
            ctx.fillStyle = pal.dark;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
            ctx.fillStyle = pal.main;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 8.0, 0, Math.PI * 2);
            ctx.fillStyle = pal.core;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 5.0, 0, Math.PI * 2);
            ctx.fillStyle = DUEL_THEME.bgOuter;
            ctx.fill();
        }
        ctx.restore();

        return canvas;
    }

    function getSprite(style, colorKey) {
        const key = style + '_' + colorKey;
        if (_spriteCache[key]) return _spriteCache[key];
        const canvas = _bakeBulletSprite(style, colorKey);
        if (canvas) {
            _spriteCache[key] = canvas;
            return canvas;
        }
        return null;
    }

    class BulletPool {
        constructor(capacity = POOL_CAPACITY) {
            this.capacity = capacity;
            this.bullets = new Array(capacity);
            for (let i = 0; i < capacity; i++) {
                this.bullets[i] = {
                    id: i,
                    active: false,
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    radius: DEFAULT_BULLET_RADIUS,
                    speed: 0,
                    angle: 0,
                    age: 0,
                    maxAge: DEFAULT_MAX_AGE,
                    grazed: false,
                    style: 'ball',
                    colorKey: 'orange',
                    behavior: null,
                    behaviorData: null
                };
            }
            this.activeCount = 0;
            this.nextFreeIndex = 0;
        }

        reset() {
            for (let i = 0; i < this.capacity; i++) {
                this.bullets[i].active = false;
                this.bullets[i].grazed = false;
                this.bullets[i].behavior = null;
                this.bullets[i].behaviorData = null;
            }
            this.activeCount = 0;
            this.nextFreeIndex = 0;
        }

        clear() {
            this.reset();
        }

        spawn(x, y, vx, vy, options = {}) {
            let found = -1;
            for (let step = 0; step < this.capacity; step++) {
                const idx = (this.nextFreeIndex + step) % this.capacity;
                if (!this.bullets[idx].active) {
                    found = idx;
                    this.nextFreeIndex = (idx + 1) % this.capacity;
                    break;
                }
            }
            if (found === -1) return null;

            const b = this.bullets[found];
            b.active = true;
            b.x = x;
            b.y = y;
            b.vx = vx;
            b.vy = vy;
            b.radius = options.radius !== undefined ? options.radius : DEFAULT_BULLET_RADIUS;
            b.speed = options.speed !== undefined ? options.speed : Math.hypot(vx, vy);
            b.angle = options.angle !== undefined ? options.angle : Math.atan2(vy, vx);
            b.age = 0;
            b.maxAge = options.maxAge !== undefined ? options.maxAge : DEFAULT_MAX_AGE;
            b.grazed = false;
            const organicStyle = { pellet: 'spore', ball: 'eye_seed', big_ball: 'eye_seed', rice: 'ichor',
                oval: 'ichor', kunai: 'thorn', needle: 'thorn', star: 'spore', crystal: 'void_shard', ring: 'eye_seed' };
            b.style = organicStyle[options.style || 'ball'] || options.style;
            b.colorKey = options.colorKey || 'orange';
            b.cause = options.cause || 'bullet';
            b.behavior = options.behavior || null;
            b.behaviorData = options.behaviorData ? Object.assign({}, options.behaviorData) : null;

            this.activeCount++;
            _triggerSpawnRing(x, y, (COLOR_PALETTES[b.colorKey] || DUEL_THEME.bulletFamilies.crimson).halo);
            return b;
        }

        update(dt, speedScale = 1.0, bounds = null) {
            updateTransientFX(dt);
            const minX = bounds ? bounds.minX : -120;
            const maxX = bounds ? bounds.maxX : 2560;
            const minY = bounds ? bounds.minY : -120;
            const maxY = bounds ? bounds.maxY : 1600;

            for (let i = 0; i < this.capacity; i++) {
                const b = this.bullets[i];
                if (!b.active) continue;

                b.age += dt;
                if (b.age >= b.maxAge) {
                    b.active = false;
                    this.activeCount--;
                    continue;
                }

                if (b.behavior === 'wave' && b.behaviorData) {
                    const data = b.behaviorData;
                    data.elapsed = (data.elapsed || 0) + dt * speedScale;
                    const lateral = Math.cos(data.freq * data.elapsed) * data.amplitude * data.freq;
                    const perpX = -Math.sin(b.angle);
                    const perpY = Math.cos(b.angle);
                    b.x += (b.vx * speedScale + perpX * lateral) * dt;
                    b.y += (b.vy * speedScale + perpY * lateral) * dt;
                } else if (b.behavior === 'curve' && b.behaviorData) {
                    const data = b.behaviorData;
                    b.angle += (data.angularSpeed || 0) * dt * speedScale;
                    b.vx = Math.cos(b.angle) * b.speed;
                    b.vy = Math.sin(b.angle) * b.speed;
                    b.x += b.vx * speedScale * dt;
                    b.y += b.vy * speedScale * dt;
                } else {
                    b.x += b.vx * speedScale * dt;
                    b.y += b.vy * speedScale * dt;
                }

                if (b.x < minX || b.x > maxX || b.y < minY || b.y > maxY) {
                    b.active = false;
                    this.activeCount--;
                }
            }
        }
    }

    function checkBulletCollision(bullet, shipX, shipY, shipRadius = SHIP_HIT_RADIUS, safetyMargin = 0) {
        if (!bullet.active) return { hit: false, graze: false };
        const dx = bullet.x - shipX;
        const dy = bullet.y - shipY;
        const distSq = dx * dx + dy * dy;

        const hitDist = shipRadius + bullet.radius + safetyMargin;
        const isHit = distSq <= hitDist * hitDist;

        let isGraze = false;
        if (!isHit && !bullet.grazed) {
            const grazeDist = shipRadius + bullet.radius + GRAZE_EXTRA_RADIUS;
            if (distSq <= grazeDist * grazeDist) {
                isGraze = true;
            }
        }
        return { hit: isHit, graze: isGraze };
    }

    function checkContinuousCollision(bx0, by0, bx1, by1, bRadius, px0, py0, px1, py1, pRadius, safetyMargin = 0) {
        const d0x = bx0 - px0;
        const d0y = by0 - py0;
        const d1x = bx1 - px1;
        const d1y = by1 - py1;

        const deltaX = d1x - d0x;
        const deltaY = d1y - d0y;
        const deltaLenSq = deltaX * deltaX + deltaY * deltaY;

        let tClosest = 0;
        if (deltaLenSq > 1e-6) {
            const dot = -(d0x * deltaX + d0y * deltaY);
            tClosest = Math.max(0, Math.min(1, dot / deltaLenSq));
        }

        const closestX = d0x + tClosest * deltaX;
        const closestY = d0y + tClosest * deltaY;
        const minDistanceSq = closestX * closestX + closestY * closestY;

        const hitDistance = pRadius + bRadius + safetyMargin;
        return minDistanceSq <= hitDistance * hitDistance;
    }

    const SPAWN_RING_CAPACITY = 64;
    const _spawnRings = new Array(SPAWN_RING_CAPACITY);
    for (let i = 0; i < SPAWN_RING_CAPACITY; i++) {
        _spawnRings[i] = { active: false, x: 0, y: 0, radius: 4, maxRadius: 18, elapsed: 0, duration: 0.15, color: '' };
    }

    let _nextRingIndex = 0;
    function _triggerSpawnRing(x, y, color) {
        for (let step = 0; step < SPAWN_RING_CAPACITY; step++) {
            const idx = (_nextRingIndex + step) % SPAWN_RING_CAPACITY;
            const r = _spawnRings[idx];
            if (!r.active) {
                r.active = true;
                r.x = x;
                r.y = y;
                r.radius = 4;
                r.maxRadius = 18;
                r.elapsed = 0;
                r.duration = 0.15;
                r.color = color || (DUEL_THEME ? DUEL_THEME.bulletFamilies.crimson.halo : '');
                _nextRingIndex = (idx + 1) % SPAWN_RING_CAPACITY;
                return;
            }
        }
    }

    const CANCEL_MOTE_CAPACITY = 120;
    const _cancelMotes = new Array(CANCEL_MOTE_CAPACITY);
    for (let i = 0; i < CANCEL_MOTE_CAPACITY; i++) {
        _cancelMotes[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, elapsed: 0, duration: 0.35, size: 2.5 };
    }

    let cancelAudioAt=-1000;
    function spawnCancelMote(x, y) {
        const now=performance.now();
        if(now-cancelAudioAt>120){cancelAudioAt=now;if(typeof window!=='undefined')window.AudioMgr?.playSfxAt('duel-cancel-shards',x,y);}
        for (let i = 0; i < CANCEL_MOTE_CAPACITY; i++) {
            const m = _cancelMotes[i];
            if (!m.active) {
                m.active = true;
                m.x = x;
                m.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = 25 + Math.random() * 50;
                m.vx = Math.cos(angle) * speed;
                m.vy = Math.sin(angle) * speed;
                m.elapsed = 0;
                m.duration = 0.35;
                m.size = 2.0 + Math.random() * 1.5;
                return;
            }
        }
    }

    function cancelAllBullets(pool, target) {
        if (!pool) return;
        const bullets = pool.bullets;
        const len = pool.capacity;
        let moteIdx = 0;
        for (let i = 0; i < len; i++) {
            const b = bullets[i];
            if (!b.active) continue;
            b.active = false;
            while (moteIdx < CANCEL_MOTE_CAPACITY) {
                const m = _cancelMotes[moteIdx++];
                if (!m.active) {
                    m.active = true;
                    m.x = b.x;
                    m.y = b.y;
                    m.vx = (Math.random() - 0.5) * 60;
                    m.vy = -60 - Math.random() * 80;
                    m.elapsed = 0;
                    m.duration = target ? 0.64 + (moteIdx % 7) * 0.035 : 0.35;
                    if (target) {
                        m.vx = (target.x - b.x) / m.duration;
                        m.vy = (target.y - b.y) / m.duration;
                    }
                    m.size = 2.0 + Math.random() * 1.5;
                    break;
                }
            }
        }
        pool.activeCount = 0;
    }

    function checkSegmentCircleCollision(x0, y0, x1, y1, halfWidth, cx, cy, cRadius) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        if (lenSq > 1e-6) {
            t = Math.max(0, Math.min(1, ((cx - x0) * dx + (cy - y0) * dy) / lenSq));
        }
        const px = x0 + t * dx;
        const py = y0 + t * dy;
        const distSq = (cx - px) * (cx - px) + (cy - py) * (cy - py);
        const totalRadius = halfWidth + cRadius;
        return distSq <= totalRadius * totalRadius;
    }

    function updateTransientFX(dt) {
        for (const r of _spawnRings) if (r.active) { r.elapsed += dt; if (r.elapsed >= r.duration) r.active = false; }
        for (const m of _cancelMotes) if (m.active) {
            m.elapsed += dt; m.x += m.vx * dt; m.y += m.vy * dt;
            if (m.elapsed >= m.duration) m.active = false;
        }
    }

    function getTransientFXState() {
        return { rings: _spawnRings.filter(r => r.active).map(r => ({ x: r.x, y: r.y, age: r.elapsed })),
            motes: _cancelMotes.filter(m => m.active).map(m => ({ x: m.x, y: m.y, age: m.elapsed })) };
    }

    function renderBulletsCanvas(ctx, pool, gfxLevel = 0) {
        // 1. Render bullet cancel motes (pool 120, single batched path)
        let hasMotes = false;
        for (let i = 0; i < CANCEL_MOTE_CAPACITY; i++) {
            if (_cancelMotes[i].active) { hasMotes = true; break; }
        }
        if (hasMotes) {
            ctx.save();
            ctx.fillStyle = DUEL_THEME.electric;
            for (let i = 0; i < CANCEL_MOTE_CAPACITY; i++) {
                const m = _cancelMotes[i];
                if (!m.active) continue;
                const lifeP = Math.max(0, 1.0 - (m.elapsed / m.duration));
                const s = m.size * lifeP;
                ctx.globalAlpha = lifeP * 0.85;
                ctx.beginPath();
                ctx.moveTo(m.x, m.y - s * 1.5);
                ctx.lineTo(m.x + s * 0.6, m.y);
                ctx.lineTo(m.x, m.y + s * 1.5);
                ctx.lineTo(m.x - s * 0.6, m.y);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // 2. Render spawn muzzle flash rings (if gfxLevel <= 2, single batched path)
        if (gfxLevel <= 2) {
            let hasRings = false;
            for (let i = 0; i < SPAWN_RING_CAPACITY; i++) {
                if (_spawnRings[i].active) { hasRings = true; break; }
            }
            if (hasRings) {
                ctx.save();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = DUEL_THEME.gold;
                ctx.globalAlpha = 0.55;
                ctx.beginPath();
                for (let i = 0; i < SPAWN_RING_CAPACITY; i++) {
                    const r = _spawnRings[i];
                    if (!r.active) continue;
                    const prog = r.elapsed / r.duration;
                    const curR = r.radius + (r.maxRadius - r.radius) * prog;
                    ctx.beginPath(); ctx.strokeStyle = r.color;
                    ctx.arc(r.x, r.y, curR, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        const bullets = pool.bullets;
        const len = pool.capacity;

        ctx.save();
        for (let i = 0; i < len; i++) {
            const b = bullets[i];
            if (!b.active) continue;

            const style = b.style || 'ball';
            const colorKey = b.colorKey || 'orange';
            const sprite = getSprite(style, colorKey);
            const meta = SPRITE_SIZES[style] || SPRITE_SIZES.ball;
            const pal = COLOR_PALETTES[colorKey] || DUEL_THEME.bulletFamilies.crimson;

            if (sprite) {
                const hw = meta.w * 0.5;
                const hh = meta.h * 0.5;

                const fx = typeof window !== 'undefined' ? window._fxOpts : null;
                const motion = gfxLevel < 2 && (!fx || !fx.reducedMotion);
                const pulse = motion ? 1 + Math.sin(b.age * 11 + b.id) * 0.12 : 1;
                const turn = motion ? Math.sin(b.age * 4.5 + b.id) * (style === 'spore' ? 1.4 : 0.17) : 0;
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.angle + Math.PI * 0.5 + turn);
                if (gfxLevel < 2 && (!fx || fx.glow !== false)) {
                    ctx.globalAlpha = 0.38;
                    ctx.fillStyle = pal.halo;
                    ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(0, 10 + Math.min(12, b.speed * 0.064));
                    ctx.lineTo(2, 2); ctx.fill();
                    ctx.globalAlpha = 1;
                }
                ctx.drawImage(sprite, -hw * pulse, -hh, meta.w * pulse, meta.h);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius + 2.0, 0, Math.PI * 2);
                ctx.fillStyle = DUEL_THEME.bgPanel;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fillStyle = pal.main;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(b.x, b.y, Math.max(1, b.radius * 0.45), 0, Math.PI * 2);
                ctx.fillStyle = pal.core;
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // Renders boss beam/laser entries using the shared organic tentacle renderer
    function renderLasersCanvas(ctx, lasers, gfxLevel = 0) {
        if (!lasers || lasers.length === 0) return;
        const now = performance.now();
        const tSec = now * 0.001;
        ctx.save();
        for (let i = 0; i < lasers.length; i++) {
            const l = lasers[i];
            if (l.state === 'expired') continue;

            const x0 = l.x0, y0 = l.y0, x1 = l.x1, y1 = l.y1;
            const dx = x1 - x0, dy = y1 - y0;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const bend = (i % 2 === 0 ? -1 : 1) * 32;

            if (l.state === 'telegraph') {
                const pulse = 0.45 + 0.40 * Math.sin(now * 0.014 + i);
                ctx.save();
                ctx.strokeStyle = '#ff4d6d';
                ctx.lineWidth = 2.4;
                ctx.globalAlpha = pulse;
                ctx.setLineDash([10, 8]);
                ctx.lineDashOffset = -now * 0.04;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.quadraticCurveTo((x0 + x1) * 0.5 + nx * bend, (y0 + y1) * 0.5 + ny * bend, x1, y1);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(x1, y1, 18, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            } else if (l.state === 'active' || l.state === 'fading') {
                const alpha = l.state === 'fading' ? Math.max(0, 1.0 - (l.elapsed - l.activeTime) / Math.max(0.05, l.fadeTime)) : 1.0;
                const ext = l.state === 'active' ? Math.min(1.0, l.elapsed / 0.16) : 1.0;
                if (typeof window !== 'undefined' && typeof window.buildOrganicTentacleSpine === 'function' && typeof window.drawOrganicTentacle === 'function') {
                    const spine = window.buildOrganicTentacleSpine(x0, y0, x1, y1, {
                        joints: 16, time: tSec, waveAmp: 16, waveFreq: 2.2, waveSpeed: 5.5,
                        phase: i * 1.4, bend: bend, reach: ext, curl: i % 2 === 0 ? 0.35 : -0.35
                    });
                    window.drawOrganicTentacle(ctx, spine, {
                        rootWidth: (l.width || 28) * 1.15, tipWidth: 4,
                        baseColor: '#481c74', darkColor: '#1a0a33', rimColor: '#6ef2ff',
                        glowColor: '#c06cff', suckerColor: '#98f5ff', glow: 0.65,
                        suckers: gfxLevel < 2, alpha: alpha
                    });
                }
            }
        }
        ctx.restore();
    }

    function renderBulletsPixi(app, pool) {
        if (!app || !app.stage) return;
        let container = pool._pixiContainer;
        if (!container) {
            if (typeof PIXI === 'undefined') return;
            container = new PIXI.Container();
            container.name = 'duelBulletsLayer';
            pool._pixiContainer = container;
            app.stage.addChild(container);
            pool._pixiGraphics = new PIXI.Graphics();
            container.addChild(pool._pixiGraphics);
        }

        const g = pool._pixiGraphics;
        g.clear();

        const bullets = pool.bullets;
        const len = pool.capacity;
        for (let i = 0; i < len; i++) {
            const b = bullets[i];
            if (!b.active) continue;
            const r = b.radius || 4;

            g.circle(b.x, b.y, r + 1.5);
            g.fill({ color: 0x081430, alpha: 1.0 });

            let colorHex = 0xff4d6d;
            if (b.colorKey === 'gold' || b.colorKey === 'yellow' || b.colorKey === 'white') colorHex = 0xe8c46a;
            else if (b.colorKey === 'crimson' || b.colorKey === 'red' || b.colorKey === 'orange') colorHex = 0xff4d6d;
            else if (b.colorKey === 'violet' || b.colorKey === 'lime') colorHex = 0x9c7bff;
            else if (b.colorKey === 'cyan') colorHex = 0x00e5ff;

            g.circle(b.x, b.y, r);
            g.fill({ color: colorHex, alpha: 1.0 });

            g.circle(b.x, b.y, Math.max(1, r * 0.45));
            g.fill({ color: 0xffffff, alpha: 1.0 });
        }
    }

    return {
        BulletPool,
        updateTransientFX,
        getTransientFXState,
        checkBulletCollision,
        checkContinuousCollision,
        checkSegmentCircleCollision,
        renderBulletsCanvas,
        renderLasersCanvas,
        renderBulletsPixi,
        cancelAllBullets,
        spawnCancelMote,
        COLOR_PALETTES,
        SPRITE_SIZES,
        DEFAULT_BULLET_RADIUS,
        DEFAULT_MAX_AGE,
        SHIP_HIT_RADIUS,
        GRAZE_EXTRA_RADIUS
    };
});
