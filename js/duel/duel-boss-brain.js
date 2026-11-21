// Pisces: Space Journey. Pure positioning, habit tracking, and damped motion brain for Egregor.
// Runs in both browser (window.DuelBossBrain) and Node (module.exports) without DOM dependencies.

(function (root, factory) {
    const mod = factory(root);
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
    }
    if (root && typeof root === 'object') {
        root.DuelBossBrain = mod;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
    'use strict';

    const SHIP_SPEED_PX_PER_SEC = 8.6 * 60; // 516 px/s at 60 fps
    const MIN_ESCAPE_GAP_PX = 150;
    const MIN_MOVE_DIST_PX = 170;
    const MIN_SPREAD_CLEARANCE_PX = 110;
    const MIN_OVERHEAD_DX_PX = 90;
    const MAX_FRAME_STEP_PX = 5.4;
    const PRE_CUE_HOLD_WINDOW_SEC = 0.6;
    const HABIT_HALF_LIFE_SEC = 8.0;
    const HABIT_COLS = 16;
    const HABIT_ROWS = 4;

    const DEFAULT_WEIGHTS = {
        idealDist: 1.0,
        overheadPenalty: 4.2,
        nearPlayerPenalty: 5.0,
        moveMinPenalty: 2.2,
        memoryPenalty: 1.8,
        readability: 1.0,
        centerBias: 0.9,
        verticalPref: 1.1,
        edgePenalty: 1.4,
        hudPenalty: 12.0,
        fairPressure: 1.1,
        escapePenalty: 8.0
    };

    // Per-attack tactical stance profiles (attackId 1..18).
    // idealDxMin/Max: desired horizontal offset from player.
    // minSafeDx: minimum horizontal offset to avoid firing straight down from directly overhead.
    const STANCE = {
        1:  { role: 'tendril',     idealDxMin: 230, idealDxMax: 420, minSafeDx: 96,  preferYMin: 0.20, preferYMax: 0.34, centerBias: 0.25, holdMin: 1.3, holdMax: 2.0, allowDash: false },
        2:  { role: 'tempest',     idealDxMin: 240, idealDxMax: 420, minSafeDx: 96,  preferYMin: 0.19, preferYMax: 0.32, centerBias: 0.35, holdMin: 1.4, holdMax: 2.2, allowDash: false },
        3:  { role: 'eye_beams',   idealDxMin: 250, idealDxMax: 440, minSafeDx: 96,  preferYMin: 0.19, preferYMax: 0.31, centerBias: 0.30, holdMin: 1.4, holdMax: 2.1, allowDash: true },
        4:  { role: 'volley',      idealDxMin: 220, idealDxMax: 420, minSafeDx: 100, preferYMin: 0.20, preferYMax: 0.35, centerBias: 0.25, holdMin: 1.3, holdMax: 2.0, allowDash: true },
        5:  { role: 'volley',      idealDxMin: 230, idealDxMax: 420, minSafeDx: 100, preferYMin: 0.20, preferYMax: 0.34, centerBias: 0.20, holdMin: 1.2, holdMax: 1.9, allowDash: true },
        6:  { role: 'hold',        idealDxMin: 0,   idealDxMax: 0,   minSafeDx: 0,   preferYMin: 0.18, preferYMax: 0.24, centerBias: 1.00, holdMin: 99,  holdMax: 99,  allowDash: false },
        7:  { role: 'tendril',     idealDxMin: 230, idealDxMax: 420, minSafeDx: 96,  preferYMin: 0.21, preferYMax: 0.36, centerBias: 0.25, holdMin: 1.2, holdMax: 1.9, allowDash: true },
        8:  { role: 'tempest',     idealDxMin: 240, idealDxMax: 420, minSafeDx: 96,  preferYMin: 0.20, preferYMax: 0.35, centerBias: 0.30, holdMin: 1.3, holdMax: 2.0, allowDash: true },
        9:  { role: 'null_slash',  idealDxMin: 220, idealDxMax: 410, minSafeDx: 96,  preferYMin: 0.18, preferYMax: 0.26, centerBias: 0.70, holdMin: 1.4, holdMax: 2.2, allowDash: false },
        10: { role: 'null_slash',  idealDxMin: 220, idealDxMax: 410, minSafeDx: 96,  preferYMin: 0.18, preferYMax: 0.26, centerBias: 0.75, holdMin: 1.3, holdMax: 2.0, allowDash: true },
        11: { role: 'mind_link',   idealDxMin: 220, idealDxMax: 410, minSafeDx: 96,  preferYMin: 0.20, preferYMax: 0.32, centerBias: 0.75, holdMin: 1.3, holdMax: 2.0, allowDash: false },
        12: { role: 'null_slash',  idealDxMin: 230, idealDxMax: 420, minSafeDx: 96,  preferYMin: 0.18, preferYMax: 0.27, centerBias: 0.70, holdMin: 1.3, holdMax: 2.0, allowDash: true },
        13: { role: 'rift',        idealDxMin: 220, idealDxMax: 410, minSafeDx: 96,  preferYMin: 0.20, preferYMax: 0.32, centerBias: 0.80, holdMin: 1.3, holdMax: 2.0, allowDash: true },
        14: { role: 'chorus',      idealDxMin: 240, idealDxMax: 430, minSafeDx: 96,  preferYMin: 0.20, preferYMax: 0.34, centerBias: 0.40, holdMin: 1.2, holdMax: 1.8, allowDash: true },
        15: { role: 'tempest',     idealDxMin: 245, idealDxMax: 440, minSafeDx: 96,  preferYMin: 0.21, preferYMax: 0.36, centerBias: 0.30, holdMin: 1.1, holdMax: 1.8, allowDash: true },
        16: { role: 'volley',      idealDxMin: 220, idealDxMax: 420, minSafeDx: 100, preferYMin: 0.20, preferYMax: 0.35, centerBias: 0.30, holdMin: 1.1, holdMax: 1.8, allowDash: true },
        17: { role: 'tendril',     idealDxMin: 240, idealDxMax: 430, minSafeDx: 96,  preferYMin: 0.21, preferYMax: 0.36, centerBias: 0.35, holdMin: 1.1, holdMax: 1.7, allowDash: true },
        18: { role: 'volley',      idealDxMin: 220, idealDxMax: 420, minSafeDx: 100, preferYMin: 0.19, preferYMax: 0.32, centerBias: 0.45, holdMin: 1.1, holdMax: 1.7, allowDash: true }
    };

    const STYLE_PARAMS = {
        hold:  { maxSpeed: 0,   maxAccel: 600, stiffness: 16, damping: 8.5, anticipateDist: 0,  anticipateDur: 0 },
        drift: { maxSpeed: 76,  maxAccel: 185, stiffness: 8,  damping: 5.8, anticipateDist: 0,  anticipateDur: 0 },
        glide: { maxSpeed: 112, maxAccel: 310, stiffness: 13, damping: 7.4, anticipateDist: 0,  anticipateDur: 0 },
        dash:  { maxSpeed: 260, maxAccel: 820, stiffness: 28, damping: 9.8, anticipateDist: 10, anticipateDur: 0.12 }
    };

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function createPRNG(seed) {
        let s = ((seed || 0) >>> 0) || 1;
        return function () {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function halton(index, base) {
        let f = 1;
        let r = 0;
        let i = index;
        while (i > 0) {
            f /= base;
            r += f * (i % base);
            i = Math.floor(i / base);
        }
        return r;
    }

    function getPlayBounds(width, height) {
        const w = width || 1280;
        const h = height || 720;
        return {
            minX: w * 0.12,
            maxX: w * 0.88,
            minY: h * 0.18,
            maxY: h * 0.44
        };
    }

    // Forbidden HUD zones padded to keep the boss body clear of the HP bar,
    // top-right status panel (x > 1086, y < 110 at 1280x720), and bottom-left skill cluster.
    function getHudForbiddenZones(width, height) {
        const w = width || 1280;
        const h = height || 720;
        const sx = w / 1280;
        const sy = h / 720;
        return [
            { name: 'hp_bar', x1: w * 0.24, y1: 0, x2: w * 0.76, y2: Math.min(h * 0.175, 118 * sy) },
            { name: 'top_right_hud', x1: 1030 * sx, y1: 0, x2: w, y2: 172 * sy },
            { name: 'bottom_left_hud', x1: 0, y1: h - 150 * sy, x2: 260 * sx, y2: h }
        ];
    }

    function pointInRect(x, y, r, pad) {
        const p = pad || 0;
        return x >= (r.x1 - p) && x <= (r.x2 + p) && y >= (r.y1 - p) && y <= (r.y2 + p);
    }

    function pointInForbidden(x, y, width, height, pad) {
        const zones = getHudForbiddenZones(width, height);
        for (let i = 0; i < zones.length; i++) {
            if (pointInRect(x, y, zones[i], pad)) return true;
        }
        return false;
    }

    // Liang-Barsky segment-vs-AABB intersection test.
    function segmentIntersectsRect(ax, ay, bx, by, r, pad) {
        const p = pad || 0;
        const xMin = r.x1 - p;
        const yMin = r.y1 - p;
        const xMax = r.x2 + p;
        const yMax = r.y2 + p;
        const dx = bx - ax;
        const dy = by - ay;
        let t0 = 0;
        let t1 = 1;
        const checks = [
            [-dx, ax - xMin],
            [dx, xMax - ax],
            [-dy, ay - yMin],
            [dy, yMax - ay]
        ];
        for (let i = 0; i < 4; i++) {
            const pVal = checks[i][0];
            const qVal = checks[i][1];
            if (Math.abs(pVal) < 1e-9) {
                if (qVal < 0) return false;
            } else {
                const t = qVal / pVal;
                if (pVal < 0) {
                    if (t > t1) return false;
                    if (t > t0) t0 = t;
                } else {
                    if (t < t0) return false;
                    if (t < t1) t1 = t;
                }
            }
        }
        return t0 <= t1;
    }

    function segmentIntersectsForbidden(ax, ay, bx, by, width, height, pad) {
        const zones = getHudForbiddenZones(width, height);
        for (let i = 0; i < zones.length; i++) {
            if (segmentIntersectsRect(ax, ay, bx, by, zones[i], pad)) return true;
        }
        return false;
    }

    function pushOutOfForbidden(x, y, width, height) {
        const b = getPlayBounds(width, height);
        let nx = clamp(x, b.minX, b.maxX);
        let ny = clamp(y, b.minY, b.maxY);
        const zones = getHudForbiddenZones(width, height);
        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            if (pointInRect(nx, ny, z, 0)) {
                if (z.name === 'top_right_hud') {
                    const pushLeft = z.x1 - 4;
                    const pushDown = z.y2 + 4;
                    if (Math.abs(nx - pushLeft) <= Math.abs(ny - pushDown) && pushLeft >= b.minX) {
                        nx = pushLeft;
                    } else {
                        ny = clamp(pushDown, b.minY, b.maxY);
                    }
                } else if (z.name === 'hp_bar') {
                    ny = clamp(z.y2 + 4, b.minY, b.maxY);
                } else {
                    ny = clamp(z.y1 - 4, b.minY, b.maxY);
                }
            }
        }
        return { x: clamp(nx, b.minX, b.maxX), y: clamp(ny, b.minY, b.maxY) };
    }

    // Player habit tracker (in-memory only, reset every match).
    function createHabit() {
        return {
            cols: HABIT_COLS,
            rows: HABIT_ROWS,
            grid: new Float32Array(HABIT_COLS * HABIT_ROWS),
            totalWeight: 0,
            lastX: null,
            lastDir: 0,
            dirChangeRate: 0,
            edgeRatio: 0,
            elapsed: 0,
            lastAttackId: 0
        };
    }

    function observeHabit(habit, sample) {
        if (!habit || !sample) return habit;
        const dt = Math.max(0, Math.min(0.25, sample.dt || 0));
        if (dt <= 0) return habit;
        const w = sample.width || 1280;
        const h = sample.height || 720;
        const px = Number.isFinite(sample.playerX) ? clamp(sample.playerX, 0, w) : w * 0.5;
        const py = Number.isFinite(sample.playerY) ? clamp(sample.playerY, 0, h) : h * 0.85;

        const decay = Math.pow(0.5, dt / HABIT_HALF_LIFE_SEC);
        const grid = habit.grid;
        for (let i = 0; i < grid.length; i++) {
            grid[i] *= decay;
        }
        habit.totalWeight = habit.totalWeight * decay + dt;

        const col = Math.min(habit.cols - 1, Math.max(0, Math.floor((px / w) * habit.cols)));
        const row = Math.min(habit.rows - 1, Math.max(0, Math.floor((py / h) * habit.rows)));
        grid[row * habit.cols + col] += dt;

        const nearEdge = (px < w * 0.14 || px > w * 0.86) ? 1 : 0;
        const alpha = 1 - decay;
        habit.edgeRatio += (nearEdge - habit.edgeRatio) * alpha;

        if (habit.lastX !== null) {
            const dx = px - habit.lastX;
            const dir = dx > 1.5 ? 1 : (dx < -1.5 ? -1 : 0);
            const changed = (dir !== 0 && habit.lastDir !== 0 && dir !== habit.lastDir) ? 1 : 0;
            habit.dirChangeRate = habit.dirChangeRate * decay + changed;
            if (dir !== 0) habit.lastDir = dir;
        }
        habit.lastX = px;
        habit.elapsed += dt;
        if (sample.attackId) habit.lastAttackId = sample.attackId;
        return habit;
    }

    function getHabitSummary(habit, width) {
        const w = width || 1280;
        if (!habit || !habit.grid || habit.totalWeight < 0.25) {
            return { ready: false, favoredX: w * 0.5, confidence: 0, edgeRatio: 0, dirChangeRate: 0 };
        }
        let bestCol = Math.floor(habit.cols / 2);
        let bestMass = -1;
        let weightedColSum = 0;
        let massSum = 0;
        for (let c = 0; c < habit.cols; c++) {
            let colMass = 0;
            for (let r = 0; r < habit.rows; r++) {
                colMass += habit.grid[r * habit.cols + c];
            }
            if (colMass > bestMass) {
                bestMass = colMass;
                bestCol = c;
            }
            weightedColSum += (c + 0.5) * colMass;
            massSum += colMass;
        }
        const favoredX = massSum > 1e-6 ? ((weightedColSum / massSum) / habit.cols) * w : ((bestCol + 0.5) / habit.cols) * w;
        const confidence = clamp(habit.totalWeight / 4.0, 0, 1);
        return {
            ready: true,
            favoredX,
            peakX: ((bestCol + 0.5) / habit.cols) * w,
            confidence,
            edgeRatio: habit.edgeRatio || 0,
            dirChangeRate: habit.dirChangeRate || 0
        };
    }

    // Checks whether the player can reach at least one continuous safe corridor >= 150px wide
    // outside the boss's direct vertical threat column (|x-bossX| <= 95px) within 0.75s at 516 px/s.
    function hasFairEscapeCorridor(candX, playerX, width) {
        const w = width || 1280;
        const shipMargin = 28;
        const reach = SHIP_SPEED_PX_PER_SEC * 0.95; // 490 px within telegraph/bullet travel time
        const reachMin = Math.max(shipMargin, playerX - reach);
        const reachMax = Math.min(w - shipMargin, playerX + reach);
        const threatHalf = 95;
        const leftSafeEnd = Math.min(reachMax, candX - threatHalf);
        const leftGap = Math.max(0, leftSafeEnd - reachMin);
        const rightSafeStart = Math.max(reachMin, candX + threatHalf);
        const rightGap = Math.max(0, reachMax - rightSafeStart);
        return Math.max(leftGap, rightGap) >= MIN_ESCAPE_GAP_PX;
    }

    function resolveWeights(weights) {
        const base = (root && root.DUEL_BOSS_WEIGHTS) ? root.DUEL_BOSS_WEIGHTS : DEFAULT_WEIGHTS;
        if (!weights) return base;
        return Object.assign({}, base, weights);
    }

    function chooseStance(opts) {
        const o = opts || {};
        const width = o.width || 1280;
        const height = o.height || 720;
        const attackId = o.attackId || 1;
        const phase = o.phase || (attackId <= 6 ? 1 : (attackId <= 13 ? 2 : 3));
        const stance = STANCE[attackId] || STANCE[1];
        const b = getPlayBounds(width, height);
        const bossX = Number.isFinite(o.bossX) ? clamp(o.bossX, b.minX, b.maxX) : width * 0.5;
        const bossY = Number.isFinite(o.bossY) ? clamp(o.bossY, b.minY, b.maxY) : b.minY;
        const playerX = Number.isFinite(o.playerX) ? clamp(o.playerX, 0, width) : width * 0.5;
        const playerY = Number.isFinite(o.playerY) ? clamp(o.playerY, 0, height) : height * 0.85;
        const history = Array.isArray(o.history) ? o.history : [];
        const nextCueIn = Number.isFinite(o.nextCueIn) ? o.nextCueIn : Infinity;
        const rng = typeof o.rng === 'function' ? o.rng : createPRNG(attackId * 997 + 17);
        const W = resolveWeights(o.weights);

        if (attackId === 6 || stance.role === 'hold') {
            return { x: bossX, y: bossY, hold: 99, style: 'hold' };
        }
        if (nextCueIn < PRE_CUE_HOLD_WINDOW_SEC) {
            return { x: bossX, y: bossY, hold: Math.max(0.4, nextCueIn + 0.2), style: 'hold' };
        }

        const habitInfo = getHabitSummary(o.habit, width);
        const haltonOffset = Math.floor(rng() * 48) + 1;
        const candidates = [];

        // 24 Halton candidates across playable upper arena
        for (let i = 0; i < 24; i++) {
            const hx = halton(haltonOffset + i, 2);
            const hy = halton(haltonOffset + i, 3);
            const cx = b.minX + hx * (b.maxX - b.minX);
            const cy = b.minY + hy * (b.maxY - b.minY);
            candidates.push({ x: cx, y: cy });
        }
        // Add 4 tactical flank anchors relative to player so valid off-axis points always exist
        const flankY = clamp(height * (stance.preferYMin + stance.preferYMax) * 0.5, b.minY, b.maxY);
        const idealMid = (stance.idealDxMin + stance.idealDxMax) * 0.5;
        candidates.push({ x: clamp(playerX - idealMid, b.minX, b.maxX), y: flankY });
        candidates.push({ x: clamp(playerX + idealMid, b.minX, b.maxX), y: flankY });
        candidates.push({ x: clamp(playerX - 380, b.minX, b.maxX), y: flankY });
        candidates.push({ x: clamp(playerX + 380, b.minX, b.maxX), y: flankY });
        candidates.push({ x: clamp(width * 0.24, b.minX, b.maxX), y: flankY });
        candidates.push({ x: clamp(width * 0.76, b.minX, b.maxX), y: flankY });

        const prefYLo = height * stance.preferYMin;
        const prefYHi = height * stance.preferYMax;
        const prefYMid = (prefYLo + prefYHi) * 0.5;
        const safeEdgeX = width * 0.20;
        const rightEdgeX = width * 0.80;

        let bestCand = null;
        let bestCost = Infinity;

        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            const inHud = pointInForbidden(c.x, c.y, width, height, 6);
            const pathHud = segmentIntersectsForbidden(bossX, bossY, c.x, c.y, width, height, 4);

            let cost = 0;

            // 1. Horizontal distance to player vs stance ideal band
            const dxPlayer = Math.abs(c.x - playerX);
            if (dxPlayer < stance.idealDxMin) {
                const deficit = (stance.idealDxMin - dxPlayer) / Math.max(1, stance.idealDxMin);
                cost += W.idealDist * deficit * deficit * 2.4;
            } else if (dxPlayer > stance.idealDxMax) {
                const excess = (dxPlayer - stance.idealDxMax) / 260;
                cost += W.idealDist * excess * excess * 1.4;
            }
            if (stance.minSafeDx > 0 && dxPlayer < stance.minSafeDx + 50) {
                const ov = (stance.minSafeDx + 50 - dxPlayer) / (stance.minSafeDx + 50);
                cost += W.overheadPenalty * (12.0 + ov * 24.0);
            }
            const crossesPlayer = (bossX - playerX) * (c.x - playerX) < 0 && Math.abs(bossX - playerX) > 60;
            const nearCorner = bossX < width * 0.24 || bossX > width * 0.76;
            if (stance.minSafeDx > 0 && crossesPlayer && !nearCorner) {
                cost += W.overheadPenalty * 2.4;
            }
            const distToPlayer = Math.hypot(c.x - playerX, c.y - playerY);
            if (distToPlayer < MIN_SPREAD_CLEARANCE_PX + 70) {
                const close = (MIN_SPREAD_CLEARANCE_PX + 70 - distToPlayer) / 100;
                cost += W.nearPlayerPenalty * (1 + close * 2.5);
            }

            // 2. Meaningful reposition distance & short-term memory penalty (last 2 spots)
            const moveDist = Math.hypot(c.x - bossX, c.y - bossY);
            if (moveDist < MIN_MOVE_DIST_PX) {
                const shortFrac = (MIN_MOVE_DIST_PX - moveDist) / MIN_MOVE_DIST_PX;
                cost += W.moveMinPenalty * (0.4 + shortFrac * 2.2);
            }
            const memCount = Math.min(2, history.length);
            for (let m = 0; m < memCount; m++) {
                const prev = history[history.length - 1 - m];
                if (!prev) continue;
                const dPrev = Math.hypot(c.x - prev.x, c.y - prev.y);
                if (dPrev < 155) {
                    cost += W.memoryPenalty * (1 - dPrev / 155) * (m === 0 ? 1.0 : 0.7);
                }
            }

            // 3. Readability, vertical preference, and center bias
            const yNorm = Math.abs(c.y - prefYMid) / Math.max(40, (b.maxY - b.minY) * 0.5);
            cost += W.verticalPref * yNorm * yNorm;
            const centerNorm = Math.abs(c.x - width * 0.5) / (width * 0.38);
            cost += W.centerBias * stance.centerBias * centerNorm * centerNorm;
            if (c.x < safeEdgeX || c.x > rightEdgeX) {
                const edgePen = c.x < safeEdgeX ? (safeEdgeX - c.x) / 80 : (c.x - rightEdgeX) / 80;
                cost += (W.readability + W.edgePenalty) * edgePen;
            }

            // 4. HUD exclusion (hard penalty on point or trajectory crossing HUD)
            if (inHud) cost += W.hudPenalty * 8.0;
            if (pathHud) cost += W.hudPenalty * 6.0;

            // 5. Fair pressure using player habit + guaranteed 150px escape corridor
            if (habitInfo.ready) {
                const dxHabit = Math.abs(c.x - habitInfo.favoredX);
                const targetPressureDx = habitInfo.edgeRatio > 0.45 ? 210 : 270;
                const habitDelta = Math.abs(dxHabit - targetPressureDx) / 260;
                cost += W.fairPressure * habitInfo.confidence * habitDelta;
                if (dxHabit < 95) {
                    cost += W.fairPressure * habitInfo.confidence * 1.2;
                }
            }
            if (!hasFairEscapeCorridor(c.x, playerX, width)) {
                cost += W.escapePenalty * 3.0;
            }

            // Small deterministic tie-breaker
            cost += rng() * 0.04;

            if (cost < bestCost) {
                bestCost = cost;
                bestCand = c;
            }
        }

        if (!bestCand) {
            bestCand = pushOutOfForbidden(width * 0.5, prefYMid, width, height);
        }

        const safePos = pushOutOfForbidden(bestCand.x, bestCand.y, width, height);
        const dist = Math.hypot(safePos.x - bossX, safePos.y - bossY);
        const holdSpan = Math.max(0.1, stance.holdMax - stance.holdMin);
        const hold = stance.holdMin + rng() * holdSpan;

        let style = 'glide';
        const currentlyOverhead = stance.minSafeDx > 0 && Math.abs(bossX - playerX) < MIN_OVERHEAD_DX_PX + 60;
        const crossingNow = (bossX - playerX) * (safePos.x - playerX) < 0;
        if (dist < 40) {
            style = 'hold';
        } else if (((currentlyOverhead || crossingNow) && dist >= 140 && nextCueIn >= 0.7) || (stance.allowDash && dist >= 245 && nextCueIn >= 1.8 && phase >= 2)) {
            style = 'dash';
        } else if (dist < 210 && phase === 1) {
            style = 'drift';
        }

        return {
            x: safePos.x,
            y: safePos.y,
            hold: hold,
            style: style
        };
    }

    function createMotionState(x, y, seed) {
        return {
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            targetX: x,
            targetY: y,
            startX: x,
            startY: y,
            style: 'hold',
            phase: 'hold',
            phaseTimer: 0,
            holdTimer: 0.4,
            anticipateX: x,
            anticipateY: y,
            history: [{ x: x, y: y }],
            leanX: 0,
            speed: 0,
            rng: createPRNG(seed || 1),
            seed: seed || 1,
            attackId: 1
        };
    }

    function resetMotionForAttack(motion, attackId, x, y, seed) {
        const m = motion || createMotionState(x, y, seed);
        m.x = x;
        m.y = y;
        m.vx = 0;
        m.vy = 0;
        m.targetX = x;
        m.targetY = y;
        m.startX = x;
        m.startY = y;
        m.style = 'hold';
        m.phase = 'hold';
        m.phaseTimer = 0;
        m.holdTimer = 0.25;
        m.anticipateX = x;
        m.anticipateY = y;
        m.history = [{ x: x, y: y }];
        m.leanX = 0;
        m.speed = 0;
        m.attackId = attackId;
        m.seed = ((seed || 0) >>> 0) + attackId * 1013;
        m.rng = createPRNG(m.seed);
        return m;
    }

    // Advances weighted spring-damper boss motion by dt seconds.
    function stepMotion(motion, params, dt) {
        const p = params || {};
        const width = p.width || 1280;
        const height = p.height || 720;
        const b = getPlayBounds(width, height);
        const stepDt = Math.max(0, Math.min(0.05, dt || 0));
        if (stepDt <= 0) {
            return { x: motion.x, y: motion.y, vx: motion.vx, vy: motion.vy, style: motion.style, speed: motion.speed, leanX: motion.leanX };
        }

        const immobile = !!p.immobile || p.attackId === 6;
        const nextCueIn = Number.isFinite(p.nextCueIn) ? p.nextCueIn : Infinity;

        if (immobile) {
            // Hard freeze during opening 2s, attack 6, skillBusy, or transitions.
            motion.vx = 0;
            motion.vy = 0;
            motion.speed = 0;
            motion.leanX *= Math.exp(-stepDt * 12);
            motion.style = 'hold';
            motion.phase = 'hold';
            motion.targetX = motion.x;
            motion.targetY = motion.y;
            return { x: motion.x, y: motion.y, vx: 0, vy: 0, style: 'hold', speed: 0, leanX: motion.leanX };
        }

        const prevX = motion.x;
        const prevY = motion.y;
        const prevVx = motion.vx;
        const prevVy = motion.vy;

        if (motion.phase === 'hold') {
            motion.holdTimer -= stepDt;
            // Smooth brake to rest if any residual speed remains
            const brake = Math.exp(-stepDt * 14);
            motion.vx *= brake;
            motion.vy *= brake;
            if (Math.hypot(motion.vx, motion.vy) < 2) {
                motion.vx = 0;
                motion.vy = 0;
            }

            // Also reposition early if player camped directly under boss on a vertical-fire attack
            const stance = STANCE[p.attackId || motion.attackId] || STANCE[1];
            const overheadDanger = stance.minSafeDx > 0 && Number.isFinite(p.playerX) && Math.abs(motion.x - p.playerX) < (MIN_OVERHEAD_DX_PX + 75);

            if ((motion.holdTimer <= 0 || overheadDanger) && nextCueIn >= PRE_CUE_HOLD_WINDOW_SEC) {
                const choice = chooseStance({
                    attackId: p.attackId || motion.attackId,
                    phase: p.phase,
                    playerX: p.playerX,
                    playerY: p.playerY,
                    bossX: motion.x,
                    bossY: motion.y,
                    width: width,
                    height: height,
                    history: motion.history,
                    habit: p.habit,
                    weights: p.weights,
                    rng: motion.rng,
                    nextCueIn: nextCueIn
                });
                motion.targetX = choice.x;
                motion.targetY = choice.y;
                motion.startX = motion.x;
                motion.startY = motion.y;
                motion.holdTimer = choice.hold;
                motion.style = choice.style;

                const d = Math.hypot(choice.x - motion.x, choice.y - motion.y);
                if (choice.style === 'hold' || d < 25) {
                    motion.phase = 'hold';
                    motion.style = 'hold';
                } else if (choice.style === 'dash' && !overheadDanger) {
                    const ux = (choice.x - motion.x) / d;
                    const uy = (choice.y - motion.y) / d;
                    const backDist = STYLE_PARAMS.dash.anticipateDist;
                    const ant = pushOutOfForbidden(motion.x - ux * backDist, motion.y - uy * backDist, width, height);
                    motion.anticipateX = ant.x;
                    motion.anticipateY = ant.y;
                    motion.phase = 'anticipate';
                    motion.phaseTimer = STYLE_PARAMS.dash.anticipateDur;
                } else {
                    motion.phase = 'move';
                    motion.phaseTimer = 0;
                }
            }
        } else if (motion.phase === 'anticipate') {
            // Brief recoil opposite the dash vector before launching forward.
            motion.phaseTimer -= stepDt;
            const dx = motion.anticipateX - motion.x;
            const dy = motion.anticipateY - motion.y;
            const ax = dx * 32 - motion.vx * 11;
            const ay = dy * 32 - motion.vy * 11;
            motion.vx += clamp(ax, -260, 260) * stepDt;
            motion.vy += clamp(ay, -260, 260) * stepDt;
            const sp = Math.hypot(motion.vx, motion.vy);
            if (sp > 90) {
                motion.vx = (motion.vx / sp) * 90;
                motion.vy = (motion.vy / sp) * 90;
            }
            if (motion.phaseTimer <= 0) {
                motion.phase = 'move';
                motion.phaseTimer = 0;
                // Damp recoil velocity before forward launch to prevent >90 deg snap
                motion.vx *= 0.15;
                motion.vy *= 0.15;
            }
        } else if (motion.phase === 'move') {
            motion.phaseTimer += stepDt;
            const spCfg = STYLE_PARAMS[motion.style] || STYLE_PARAMS.glide;
            const toX = motion.targetX - motion.x;
            const toY = motion.targetY - motion.y;
            const dist = Math.hypot(toX, toY);

            // Spring-damper acceleration toward target
            let ax = toX * spCfg.stiffness - motion.vx * spCfg.damping;
            let ay = toY * spCfg.stiffness - motion.vy * spCfg.damping;
            const aMag = Math.hypot(ax, ay);
            if (aMag > spCfg.maxAccel) {
                ax = (ax / aMag) * spCfg.maxAccel;
                ay = (ay / aMag) * spCfg.maxAccel;
            }

            motion.vx += ax * stepDt;
            motion.vy += ay * stepDt;

            // Clamp max speed for style
            const speed = Math.hypot(motion.vx, motion.vy);
            if (speed > spCfg.maxSpeed) {
                motion.vx = (motion.vx / speed) * spCfg.maxSpeed;
                motion.vy = (motion.vy / speed) * spCfg.maxSpeed;
            }

            // Live flank adjustment: if player chases under the target while moving, slide target further away along current heading
            const stanceM = STANCE[p.attackId || motion.attackId] || STANCE[1];
            if (stanceM.minSafeDx > 0 && Number.isFinite(p.playerX) && nextCueIn >= PRE_CUE_HOLD_WINDOW_SEC) {
                if (Math.abs(motion.x - p.playerX) < MIN_OVERHEAD_DX_PX + 40 && motion.style !== 'dash') {
                    motion.style = 'dash';
                }
                if (Math.abs(motion.targetX - p.playerX) < MIN_OVERHEAD_DX_PX + 60) {
                    const openDir = p.playerX < width * 0.5 ? 1 : -1;
                    const pushedX = clamp(p.playerX + openDir * 310, b.minX + 24, b.maxX - 24);
                    if (Math.abs(pushedX - p.playerX) >= MIN_OVERHEAD_DX_PX + 50 &&
                        !pointInForbidden(pushedX, motion.targetY, width, height, 4) &&
                        hasFairEscapeCorridor(pushedX, p.playerX, width)) {
                        motion.targetX = pushedX;
                    }
                }
            }

            // Arrival check (settling cleanly with at most 1 gentle overshoot)
            const curSpeed = Math.hypot(motion.vx, motion.vy);
            if ((dist < 10 && curSpeed < 24) || motion.phaseTimer > 3.4) {
                const stillOverhead = stanceM.minSafeDx > 0 && Number.isFinite(p.playerX) && Math.abs(motion.x - p.playerX) < (MIN_OVERHEAD_DX_PX + 50);
                motion.phase = 'hold';
                motion.style = 'hold';
                motion.holdTimer = stillOverhead ? 0 : motion.holdTimer;
                motion.vx *= 0.2;
                motion.vy *= 0.2;
                motion.history.push({ x: motion.x, y: motion.y });
                if (motion.history.length > 4) motion.history.shift();
            }
        }

        // Guard against sharp direction reversals (> 80 deg) when moving at speed
        const prevSp = Math.hypot(prevVx, prevVy);
        const newSp = Math.hypot(motion.vx, motion.vy);
        if (prevSp > 24 && newSp > 24) {
            const dot = (prevVx * motion.vx + prevVy * motion.vy) / (prevSp * newSp);
            if (dot < 0.20) {
                // Smoothly decelerate along current heading instead of snapping > 78 deg
                const blend = Math.exp(-stepDt * 18);
                motion.vx = prevVx * blend;
                motion.vy = prevVy * blend;
            }
        }

        // Integrate position with strict per-frame step cap (< 6px)
        let stepX = motion.vx * stepDt;
        let stepY = motion.vy * stepDt;
        const stepLen = Math.hypot(stepX, stepY);
        if (stepLen > MAX_FRAME_STEP_PX) {
            const scale = MAX_FRAME_STEP_PX / stepLen;
            stepX *= scale;
            stepY *= scale;
        }

        let nextX = clamp(prevX + stepX, b.minX, b.maxX);
        let nextY = clamp(prevY + stepY, b.minY, b.maxY);

        if (pointInForbidden(nextX, nextY, width, height, 0) ||
            segmentIntersectsForbidden(prevX, prevY, nextX, nextY, width, height, 0)) {
            const safe = pushOutOfForbidden(nextX, nextY, width, height);
            const corrX = safe.x - prevX;
            const corrY = safe.y - prevY;
            const corrLen = Math.hypot(corrX, corrY);
            if (corrLen > MAX_FRAME_STEP_PX) {
                nextX = prevX + (corrX / corrLen) * MAX_FRAME_STEP_PX;
                nextY = prevY + (corrY / corrLen) * MAX_FRAME_STEP_PX;
            } else {
                nextX = safe.x;
                nextY = safe.y;
            }
        }

        motion.x = nextX;
        motion.y = nextY;
        motion.vx = (motion.x - prevX) / stepDt;
        motion.vy = (motion.y - prevY) / stepDt;
        motion.speed = Math.hypot(motion.vx, motion.vy);
        const targetLean = clamp(motion.vx / 180, -1, 1);
        motion.leanX += (targetLean - motion.leanX) * (1 - Math.exp(-stepDt * 10));

        return {
            x: motion.x,
            y: motion.y,
            vx: motion.vx,
            vy: motion.vy,
            style: motion.style,
            speed: motion.speed,
            leanX: motion.leanX
        };
    }

    // Pure fallback target evaluator matching the legacy getBossTargetPosition signature.
    function getTargetPosition(scriptTime, width, height, attackId, seed, anchorX, anchorY, playerX, playerY) {
        const w = width || 1280;
        const h = height || 720;
        const b = getPlayBounds(w, h);
        const ax = clamp(Number.isFinite(anchorX) ? anchorX : w * 0.5, b.minX, b.maxX);
        const ay = clamp(Number.isFinite(anchorY) ? anchorY : b.minY, b.minY, b.maxY);
        const id = attackId || 1;
        if (id === 6 || scriptTime <= 2) return { x: ax, y: ay };

        const m = resetMotionForAttack(null, id, ax, ay, seed || 0);
        const dt = 1 / 30;
        const total = Math.min(60, Math.max(0, scriptTime - 2));
        const steps = Math.floor(total / dt);
        const px = Number.isFinite(playerX) ? playerX : w * 0.5;
        const py = Number.isFinite(playerY) ? playerY : h * 0.85;
        for (let i = 0; i < steps; i++) {
            stepMotion(m, { attackId: id, width: w, height: h, playerX: px, playerY: py, immobile: false }, dt);
        }
        return { x: m.x, y: m.y };
    }

    return {
        STANCE,
        STYLE_PARAMS,
        DEFAULT_WEIGHTS,
        SHIP_SPEED_PX_PER_SEC,
        MIN_ESCAPE_GAP_PX,
        MIN_MOVE_DIST_PX,
        MIN_OVERHEAD_DX_PX,
        MIN_SPREAD_CLEARANCE_PX,
        PRE_CUE_HOLD_WINDOW_SEC,
        createPRNG,
        getPlayBounds,
        getHudForbiddenZones,
        pointInForbidden,
        segmentIntersectsForbidden,
        hasFairEscapeCorridor,
        createHabit,
        observeHabit,
        getHabitSummary,
        chooseStance,
        createMotionState,
        resetMotionForAttack,
        stepMotion,
        getTargetPosition
    };
});
