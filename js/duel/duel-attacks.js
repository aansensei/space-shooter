// Pisces: Space Journey. Showdown Voyage attack patterns for Egregor the Overmind.
// Implements all 18 attacks across Phase 1, Phase 2, and Phase 3 with Touhou spell card structure.
// Features 9 named Egregor Boss Skills, Thought Sphere engine, and continuous bullet pacing.

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.DuelAttacks = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function createPRNG(seed = 0) {
        let s = (seed >>> 0) || 1;
        return function () {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function _distToSegmentSq(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        if (lenSq > 1e-6) {
            t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
        }
        const qx = ax + t * dx, qy = ay + t * dy;
        return (px - qx) * (px - qx) + (py - qy) * (py - qy);
    }

    let _cachedRiftSprite = null;
    function _getRiftSprite() {
        if (_cachedRiftSprite) return _cachedRiftSprite;
        if (typeof document === 'undefined') return null;
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const g = c.getContext('2d');
        const cx = 128, cy = 128;
        const rg = g.createRadialGradient(cx, cy, 8, cx, cy, 122);
        rg.addColorStop(0, 'rgba(18, 6, 38, 0.92)');
        rg.addColorStop(0.38, 'rgba(128, 42, 218, 0.45)');
        rg.addColorStop(0.72, 'rgba(0, 229, 255, 0.22)');
        rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = rg;
        g.fillRect(0, 0, 256, 256);

        for (let r = 0; r < 3; r++) {
            g.strokeStyle = r % 2 === 0 ? 'rgba(0, 229, 255, 0.65)' : 'rgba(192, 96, 255, 0.65)';
            g.lineWidth = 2.0;
            g.beginPath();
            g.arc(cx, cy, 34 + r * 26, r * 1.1, r * 1.1 + Math.PI * 1.35);
            g.stroke();
        }
        _cachedRiftSprite = c;
        return c;
    }

    const NULL_EXTEND = 0.20, NULL_SWEEP = 0.52, NULL_RETRACT = 0.23;
    const NULL_IMPACT = NULL_EXTEND + NULL_SWEEP / 2;

    function nullSlashReach(skill, age = skill.elapsed) {
        const t = Math.max(0, age);
        const sweep = Math.max(0, Math.min(1, (t - NULL_EXTEND) / NULL_SWEEP));
        const eased = sweep < 0.5 ? 2 * sweep * sweep : 1 - 2 * (1 - sweep) ** 2;
        const extent = t < NULL_EXTEND ? 1 - (1 - t / NULL_EXTEND) ** 2.8
            : Math.max(0, 1 - Math.max(0, t - NULL_EXTEND - NULL_SWEEP) / NULL_RETRACT) ** 2.2;
        return { radius: skill.radius * extent, angle: skill.angle + skill.sweepDirection * (eased - 0.5) * Math.PI, eased };
    }

    function lockNullSlash(skill, boss, x, y) {
        skill.originX = boss.x; skill.originY = boss.y;
        skill.targetX = x; skill.targetY = y;
        const dx = x - boss.x, dy = y - boss.y;
        skill.radius = Math.max(760, Math.hypot(dx, dy) + 120);
        skill.angle = Math.atan2(dy, dx);
        skill.sweepDirection = skill.swing % 2 === 0 ? 1 : -1;
    }

    function chorusLane(skill, lane) {
        const beat = (skill.elapsed + 0.45) % 4 - 0.45 - lane * 0.32;
        return {
            x: 100 + lane * 118,
            beat,
            reach: beat < 0.2275 ? Math.sin(Math.max(0, beat) / 0.2275 * Math.PI * 0.5)
                : Math.max(0, 1 - (beat - 0.2275) / 0.4225)
        };
    }

    function chorusSpine(skill, lane) {
        const { x, reach } = chorusLane(skill, lane);
        return window.buildOrganicTentacleSpine(x, 16, x, 704, {
            joints: 14, time: skill.elapsed, waveAmp: 9, waveFreq: 2.2, waveSpeed: 5,
            phase: lane * 0.9, reach, curl: lane % 2 === 0 ? 0.2 : -0.2
        });
    }

    // Two skills that ask the ship to move: a bar that sweeps the whole arena with one safe gap, and stone pillars
    // that drop on the ship's column. The plan lists when each one appears inside an attack (seconds of script time).
    const CUE_KIND = { gap_bar: 'tempest', crush_pillar: 'upheaval' };
    // A bar moves along its axis: 'y' runs from the top edge down (dir 1) or from the bottom edge up (dir -1),
    // 'x' runs from the left edge across (dir 1) or from the right edge back (dir -1). A wave of pillars drops from
    // left to right (dir 1) or right to left (dir -1), and a count of 1 drops a single pillar.
    const VOID_PLAN = {
        3: [{ at: 8, kind: 'bar', axis: 'y', dir: 1 }],
        4: [{ at: 9, kind: 'pillar', count: 1 }, { at: 19, kind: 'pillar', count: 2, dir: -1 }],
        7: [{ at: 8, kind: 'pillar', count: 2, dir: 1 }],
        9: [{ at: 6, kind: 'bar', axis: 'x', dir: 1 }, { at: 13, kind: 'bar', axis: 'x', dir: -1 }],
        11: [{ at: 7, kind: 'pillar', count: 2, dir: -1 }, { at: 13, kind: 'bar', axis: 'y', dir: -1 }],
        15: [{ at: 8, kind: 'bar', axis: 'y', dir: 1 }, { at: 19, kind: 'bar', axis: 'x', dir: -1 }],
        16: [{ at: 6, kind: 'pillar', count: 3, dir: 1 }, { at: 18, kind: 'bar', axis: 'x', dir: 1 }]
    };
    const PILLAR_OFFSETS = { 1: [0], 2: [-170, 170], 3: [-300, 0, 300] };

    // The arena is as wide as the window, not a fixed 1280, so a sweeping bar must cover all of it
    function arenaWidth(sk) {
        return Math.max(sk.canvasW || 0, (typeof canvas !== 'undefined' && canvas.width) || 0, 1280);
    }

    // Position of the bar's centre along its sweep axis
    function gapBarPos(sk, progress) {
        const extent = sk.axis === 'x' ? arenaWidth(sk) : (sk.canvasH || 720);
        const span = extent + sk.thick * 2;
        return sk.dir === 1 ? -sk.thick + span * progress : extent + sk.thick - span * progress;
    }

    function pillarBottom(sk, col) {
        const floorY = sk.floorY || 720;
        if (sk.phase === 'drop') { const p = Math.max(0, Math.min(1, (sk.elapsed - col.delay) / sk.dropDur)); return floorY * p * p; }
        return floorY;
    }

    function pillarCenter(playerX, count, width) {
        const margin = 150 + Math.max(...PILLAR_OFFSETS[count].map(Math.abs));
        return Math.max(margin, Math.min(width - margin, playerX));
    }

    function upheavalTip(progress, dir, floorY, maxH) {
        if (progress < 0.38) {
            const u = progress / 0.38;
            return { dx: dir * 18 * u, y: floorY - maxH * (1 - (1 - u) ** 3) };
        }
        if (progress < 0.78) {
            const u = (progress - 0.38) / 0.40;
            return { dx: dir * (18 + Math.sin(u * Math.PI * 0.5) * 145), y: floorY - maxH };
        }
        const u = (progress - 0.78) / 0.22;
        return { dx: dir * (163 - u * 35), y: floorY - maxH * (1 - u * 0.18) };
    }

    function upheavalSpine(x, floorY, tipX, tipY, dir, index, elapsed, striking) {
        return window.buildOrganicTentacleSpine(x, floorY + 24, tipX, tipY, {
            joints: 16, time: elapsed, waveAmp: 14, waveFreq: 2, waveSpeed: 6.2,
            phase: index * 1.4, bend: dir * (striking ? 42 : 24), curl: dir * 0.75
        });
    }

    function smoothstep(t) {
        return t * t * (3.0 - 2.0 * t);
    }

    const _scheduleCache = new Map();

    function getBossSchedule(attackId, duration, width, seed = 0) {
        const cacheKey = attackId + '_' + duration.toFixed(1) + '_' + width.toFixed(0) + '_' + seed;
        if (_scheduleCache.has(cacheKey)) {
            return _scheduleCache.get(cacheKey);
        }

        if (attackId === 6) {
            const sched = [{ tStart: 0, tEnd: duration, type: 'hold', x: width * 0.5 }];
            _scheduleCache.set(cacheKey, sched);
            return sched;
        }

        const rng = createPRNG(seed + attackId * 101);
        const sched = [];
        let curT = 0;
        let curX = width * 0.5;

        while (curT < duration) {
            let holdDur = 1.8 + rng() * 1.4;
            if (attackId === 9) holdDur = 2.4;
            if (attackId === 18 && curT >= 48.0 && curT <= 68.0) {
                curX = width * 0.5;
                holdDur = 20.0;
            }
            if (attackId === 18 && curT >= 71.0) {
                curX = width * 0.5;
                holdDur = 20.0;
            }

            const holdEnd = Math.min(duration, curT + holdDur);
            sched.push({ tStart: curT, tEnd: holdEnd, type: 'hold', x: curX });
            curT = holdEnd;
            if (curT >= duration) break;

            let newX;
            let attempts = 0;
            do {
                newX = width * (0.24 + rng() * 0.52);
                attempts++;
            } while (Math.abs(newX - curX) < width * 0.12 && attempts < 10);

            if (Math.abs(newX - curX) < width * 0.12) {
                newX = curX > width * 0.5 ? curX - width * 0.15 : curX + width * 0.15;
            }

            const dist = Math.abs(newX - curX);
            const moveDur = Math.max(1.2, (1.5 * dist) / 140.0);
            const moveEnd = Math.min(duration, curT + moveDur);
            sched.push({ tStart: curT, tEnd: moveEnd, type: 'move', fromX: curX, toX: newX, dur: moveDur });
            curT = moveEnd;
            curX = newX;
        }

        _scheduleCache.set(cacheKey, sched);
        return sched;
    }

    // Boss roaming path. After the opening settle the boss alternates between holding still and gliding to a
    // new spot anywhere in the upper half of the screen (not only left and right). Every glide starts exactly
    // where the previous one ended, so the path is continuous and begins at the current anchor.
    function getBossTargetPosition(scriptTime, width, height, attackId = 1, seed = 0, anchorX = undefined, anchorY = undefined) {
        const brain = typeof window !== "undefined" ? window.DuelBossBrain : null;
        if (brain && typeof brain.getTargetPosition === "function") {
            return brain.getTargetPosition(scriptTime, width, height, attackId, seed, anchorX, anchorY);
        }
        const minX = width * 0.12, maxX = width * 0.88;
        const minY = height * 0.18, maxY = height * 0.44;
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        let x = clamp(Number.isFinite(anchorX) ? anchorX : width * 0.5, minX, maxX);
        let y = clamp(Number.isFinite(anchorY) ? anchorY : height * 0.18, minY, maxY);
        if (attackId === 6 || scriptTime <= 2) return { x, y };
        const rng = createPRNG((seed >>> 0) + attackId * 1013);
        let time = scriptTime - 2;
        for (let leg = 0; leg < 2048; leg++) {
            let toX = x, toY = y, tries = 0;
            do {
                toX = minX + rng() * (maxX - minX);
                toY = minY + rng() * (maxY - minY);
                tries++;
            } while (Math.hypot(toX - x, toY - y) < 170 && tries < 14);
            const distance = Math.hypot(toX - x, toY - y);
            const duration = Math.max(0.1, distance * 1.875 / 110);
            if (time < duration) {
                const p = Math.max(0, time / duration);
                const eased = p * p * p * (10 + p * (-15 + p * 6));
                return { x: x + (toX - x) * eased, y: y + (toY - y) * eased };
            }
            time -= duration; x = toX; y = toY;
            const hold = 1.0 + rng() * 1.4;
            if (time < hold) return { x, y };
            time -= hold;
        }
        return { x, y };
    }

    function getBossPosition(attackTime, width, height, attackId = 1, seed = 0) {
        if (typeof window !== 'undefined' && window._duelSession && window._duelSession.active && window._duelSession.bossPos) {
            return { x: window._duelSession.bossPos.x, y: window._duelSession.bossPos.y };
        }
        return getBossTargetPosition(attackTime, width, height, attackId, seed);
    }

    function getTentacleSources(bossX, bossY, count = 10, radius = 48) {
        const sources = [];
        for (let i = 0; i < count; i++) {
            const frac = count > 1 ? i / (count - 1) : 0.5;
            const angle = Math.PI * (0.15 + 0.70 * frac);
            sources.push({
                index: i,
                x: bossX + Math.cos(angle) * radius,
                y: bossY + Math.sin(angle) * radius,
                angle: angle
            });
        }
        return sources;
    }

    function getEyeSources(bossX, bossY) {
        return [
            { x: bossX - 22, y: bossY - 8, angle: Math.PI * 0.55 },
            { x: bossX - 8,  y: bossY + 4, angle: Math.PI * 0.52 },
            { x: bossX + 8,  y: bossY + 4, angle: Math.PI * 0.48 },
            { x: bossX + 22, y: bossY - 8, angle: Math.PI * 0.45 }
        ];
    }

    const ATTACK_DEFS = {
        1: { id: 1, key: 'duel.attack.1', name: 'Tendril Probe', phase: 1, duration: 16.0, baseHp: 440 },
        2: { id: 2, key: 'duel.attack.2', name: 'Locked Thought', phase: 1, duration: 24.0, baseHp: 650 },
        3: { id: 3, key: 'duel.attack.3', name: 'Eye Lines', phase: 1, duration: 18.0, baseHp: 495 },
        4: { id: 4, key: 'duel.attack.4', name: 'Ripple of Dimensions', phase: 1, duration: 26.0, baseHp: 705 },
        5: { id: 5, key: 'duel.attack.5', name: 'Whisper Rain', phase: 1, duration: 18.0, baseHp: 495 },
        6: { id: 6, key: 'duel.attack.6', name: 'Mirror Mind', phase: 1, duration: 26.0, baseHp: 715 },
        7: { id: 7, key: 'duel.attack.7', name: 'Ten Voices', phase: 2, duration: 18.0, baseHp: 505 },
        8: { id: 8, key: 'duel.attack.8', name: 'Collective Mind', phase: 2, duration: 28.0, baseHp: 765 },
        9: { id: 9, key: 'duel.attack.9', name: 'Null Prelude', phase: 2, duration: 18.0, baseHp: 505 },
        10: { id: 10, key: 'duel.attack.10', name: 'Null Slash', phase: 2, duration: 28.0, baseHp: 775 },
        11: { id: 11, key: 'duel.attack.11', name: 'Mind Link Pulse', phase: 2, duration: 18.0, baseHp: 505 },
        12: { id: 12, key: 'duel.attack.12', name: 'Boon and Bane', phase: 2, duration: 28.0, baseHp: 765 },
        13: { id: 13, key: 'duel.attack.13', name: 'Dimension Break', phase: 2, duration: 30.0, baseHp: 820 },
        14: { id: 14, key: 'duel.attack.14', name: 'Overmind Chorus', phase: 3, duration: 20.0, baseHp: 555 },
        15: { id: 15, key: 'duel.attack.15', name: 'Psychic Tempest Maelstrom', phase: 3, duration: 28.0, baseHp: 775 },
        16: { id: 16, key: 'duel.attack.16', name: 'Echo of Ten', phase: 3, duration: 28.0, baseHp: 775 },
        17: { id: 17, key: 'duel.attack.17', name: 'Rage of the Collective', phase: 3, duration: 32.0, baseHp: 880 },
        18: { id: 18, key: 'duel.attack.18', name: 'Ten Minds, One Voice', phase: 3, duration: 40.0, baseHp: 1090 }
    };

    let _totalMatchHp = 0;
    let _p1TotalHp = 0;
    let _p2TotalHp = 0;
    for (let _k = 1; _k <= 18; _k++) {
        const _d = ATTACK_DEFS[_k];
        if (!_d) continue;
        _totalMatchHp += _d.baseHp;
        if (_d.phase === 1) _p1TotalHp += _d.baseHp;
        if (_d.phase === 2) _p2TotalHp += _d.baseHp;
    }
    const TOTAL_MATCH_BASE_HP = _totalMatchHp;
    const P1_END_RATIO = (_totalMatchHp - _p1TotalHp) / _totalMatchHp;
    const P2_END_RATIO = (_totalMatchHp - _p1TotalHp - _p2TotalHp) / _totalMatchHp;

    function getMatchHpInfo(attackId, currentHp) {
        let remaining = Math.max(0, currentHp);
        for (let i = attackId + 1; i <= 18; i++) {
            if (ATTACK_DEFS[i]) remaining += ATTACK_DEFS[i].baseHp;
        }
        const ratio = Math.max(0, Math.min(1.0, remaining / TOTAL_MATCH_BASE_HP));
        return {
            remainingHp: remaining,
            totalHp: TOTAL_MATCH_BASE_HP,
            ratio: ratio,
            p1EndRatio: P1_END_RATIO,
            p2EndRatio: P2_END_RATIO
        };
    }

    const PHASE_RANGES = {
        1: [1, 6],
        2: [7, 13],
        3: [14, 18]
    };

    function getPhaseHpInfo(attackId, currentHp) {
        const def = ATTACK_DEFS[attackId] || ATTACK_DEFS[1];
        const phase = def.phase || 1;
        const range = PHASE_RANGES[phase] || [1, 6];
        const startId = range[0];
        const endId = range[1];
        let totalPhaseHp = 0;
        let remainingPhaseHp = Math.max(0, currentHp);
        for (let i = startId; i <= endId; i++) {
            const d = ATTACK_DEFS[i];
            if (!d) continue;
            totalPhaseHp += d.baseHp;
            if (i > attackId) remainingPhaseHp += d.baseHp;
        }
        const ticks = [];
        let acc = 0;
        for (let i = startId; i < endId; i++) {
            const d = ATTACK_DEFS[i];
            if (!d) continue;
            acc += d.baseHp;
            ticks.push(Math.max(0, Math.min(1, (totalPhaseHp - acc) / totalPhaseHp)));
        }
        const ratio = totalPhaseHp > 0 ? Math.max(0, Math.min(1, remainingPhaseHp / totalPhaseHp)) : 0;
        return {
            phase: phase,
            remainingHp: remainingPhaseHp,
            totalHp: totalPhaseHp,
            ratio: ratio,
            attackTicks: ticks
        };
    }

    // Thought spheres lock the ship position at launch and burst into pooled projectiles.
    class ThoughtSphere {
        constructor(controller) { this.controller = controller; this.active = false; }
        spawn(x, y, targetX, size, colorPhase) {
            const c = this.controller;
            this.active = true; this.phase = 'telegraph'; this.elapsed = 0;
            const source = c._bossOrigin || { x, y: y - 40 };
            this.startX = this.x = source.x; this.startY = this.y = source.y + 40;
            const shipX = Number.isFinite(c._lastPlayerX) ? c._lastPlayerX : targetX;
            this.targetX = shipX + Math.max(-48, Math.min(48, targetX - shipX));
            this.targetY = (Number.isFinite(c._lastPlayerY) ? c._lastPlayerY : 660) - 20;
            this.size = size || 110; this.colorPhase = colorPhase || 1;
            this.radius = Math.min(42, 18 + this.size * 0.09);
            this.flightDuration = Math.min(1.3, 0.9 + this.size * 0.001);
            this.secondRing = false;
            c._sound('egregor-sphere-warn',this.x,this.y);
            c._setBossCue('thought_sphere', 0.35, 0.16, this.targetX, this.targetY);
        }
        _burst(offset) {
            const c = this.controller, n = this.size >= 170 ? 12 : (this.size >= 125 ? 10 : 8);
            const color = c._bulletColor();
            for (let i = 0; i < n; i++) {
                const a = i / n * Math.PI * 2 + 0.18 + offset;
                c._spawnPatternBullet(this.targetX, this.targetY, Math.cos(a) * 170, Math.sin(a) * 170,
                    { style: 'eye_seed', colorKey: color, radius: 4.5, maxAge: 6 });
            }
        }
        update(dt) {
            if (!this.active) return;
            this.elapsed += dt;
            if (this.phase === 'telegraph' && this.elapsed >= 0.35) {
                this.elapsed -= 0.35; this.phase = 'flying';
                this.controller._sound('orb-throw', this.x, this.y);
            }
            if (this.phase === 'flying') {
                const p = Math.min(1, this.elapsed / this.flightDuration);
                this.x = this.startX + (this.targetX - this.startX) * p;
                this.y = this.startY + (this.targetY - this.startY) * p - Math.sin(p * Math.PI) * 95;
                if (p >= 1) {
                    this.phase = 'burst'; this.elapsed = 0; this._burst(0);
                    if (typeof window !== 'undefined' && window.AudioMgr) this.controller._sound('orb-burst', this.targetX, this.targetY);
                }
            } else if (this.phase === 'burst') {
                if (this.size >= 170 && !this.secondRing && this.elapsed >= 0.35) {
                    this.secondRing = true; this._burst(Math.PI / 12);
                }
                if (this.elapsed >= 0.7) this.active = false;
            }
        }
        render(ctx) {
            if (!this.active) return;
            const pal = typeof DuelFX !== 'undefined' ? DuelFX.getPhasePalette(this.colorPhase) : { rim: '#72edff', glow: '#9b6aff', sucker: '#ffefc0' };
            const now = performance.now(), low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
            const fo = typeof window !== 'undefined' ? window._fxOpts : null;
            ctx.save();
            if (this.phase !== 'burst' && typeof _drawDangerZone === 'function') {
                const p = this.phase === 'telegraph' ? 0 : Math.min(1, this.elapsed / this.flightDuration);
                _drawDangerZone('circle', this.targetX, this.targetY, 46, p, 0.85, now, 0, 0, Math.PI * 2, true, false);
            }
            if (this.phase === 'burst') {
                const p = this.elapsed / 0.7;
                ctx.globalAlpha = 1 - p; ctx.strokeStyle = pal.rim; ctx.lineWidth = 3 * (1 - p) + 1;
                ctx.beginPath(); ctx.arc(this.targetX, this.targetY, 12 + p * 110, 0, Math.PI * 2); ctx.stroke();
            } else {
                const r = this.radius * (this.phase === 'telegraph' ? 0.5 + Math.min(1, this.elapsed / 0.35) * 0.5 : 1);
                if (!low && (!fo || fo.glow !== false)) {
                    ctx.globalAlpha = 0.17; ctx.strokeStyle = pal.rim; ctx.lineWidth = r * 0.7;
                    ctx.beginPath(); ctx.arc(this.x, this.y, r * 1.1, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
                }
                const g = ctx.createRadialGradient(this.x - r * 0.22, this.y - r * 0.28, 1, this.x, this.y, r);
                g.addColorStop(0, '#fff8df'); g.addColorStop(0.25, pal.sucker); g.addColorStop(0.65, pal.rim); g.addColorStop(1, pal.glow);
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = pal.sucker; ctx.lineWidth = 1.5;
                for (let i = 0; i < (low ? 1 : 3); i++) {
                    ctx.beginPath(); ctx.ellipse(this.x, this.y, r * 1.28, r * 0.38, now * 0.0016 + i * 1.1, 0, Math.PI * 2); ctx.stroke();
                }
                if (this.phase === 'flying' && !low && (!fo || fo.particles !== false)) {
                    ctx.strokeStyle = pal.rim; ctx.globalAlpha = 0.3; ctx.lineWidth = 5;
                    const dx = this.targetX - this.startX, dy = this.targetY - this.startY;
                    const len = Math.hypot(dx, dy) || 1;
                    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - dx / len * 38, this.y - dy / len * 38); ctx.stroke();
                }
            }
            ctx.restore();
        }
    }
    // ATTACK CONTROLLER WITH 9 BOSS SKILLS
    class AttackController {
        constructor(pool, options = {}) {
            this.pool = pool;
            this.difficulty = options.difficulty || 'standard';
            this.seed = options.seed !== undefined ? options.seed : 0;
            this.rng = createPRNG(this.seed);
            this.currentAttackId = 1;
            this.elapsed = 0;
            this.pressureBeat = 0;
            this.pressureAt = 2.5;
            this.scriptTime = 0;
            this.cycleCount = 0;
            this.cycleBreather = 0;
            this.anchorX = 640;
            this.anchorY = 130;
            this.hp = 320;
            this.maxHp = 320;
            this.telegraphs = [];
            this.slowZones = [];
            this.lasers = [];
            this.lastSpawnTimes = {};
            this.boonHitsRecorded = 0;
            this.rageStacks = 0;

            // 9 Boss Skills state
            this.thoughtCube = new ThoughtSphere(this);
            this.thoughtCube2 = new ThoughtSphere(this);
            this.skills = []; // active skills: tempest, nullSlash, tendrilLash, eyeBeams, mindLink, chorus, rifts
            this.hasHexShield = false;
        }

        setDifficulty(diff) {
            this.difficulty = diff === 'hard' ? 'hard' : 'standard';
        }

        setSeed(seed) {
            this.seed = seed;
            this.rng = createPRNG(seed);
        }

        recordPlayerHit() {
            if (this.currentAttackId === 12) {
                this.boonHitsRecorded++;
            }
        }

        startAttack(attackId, options = {}) {
            this.clearDimensionBreak();
            this.currentAttackId = attackId;
            this.pressureBeat = 0;
            this.pressureAt = 2.5;
            this._lastVolleyCueAt = -1;
            const def = ATTACK_DEFS[attackId] || ATTACK_DEFS[1];
            this.elapsed = 0;
            this.scriptTime = options.released ? 0.31 : 0;
            this.scriptWarmup = options.released ? 0 : 0.4;
            this.cycleCount = 0;
            this.cycleBreather = 0;
            this.maxHp = def.baseHp;
            this.hp = def.baseHp;
            this.telegraphs = [];
            this.slowZones = [];
            this.lasers = [];
            this.lastSpawnTimes = {};
            this.boonHitsRecorded = 0;
            this.rageStacks = attackId >= 17 ? 5 : (attackId >= 14 ? 3 : (attackId >= 7 ? 2 : 0));
            this.hasHexShield = false;
            this.skills = [];
            this.thoughtCube.active = false;
            this.thoughtCube2.active = false;
            this.pool.reset();
            this.emissions = [];
            this.bossCue = null;
            this.cues = [];
            this.poseCue = { kind: 'idle', wind: 0, fire: 0, dirX: 0, dirY: 1 };
            this._lastVolleyCueAt = -1;
            this._seenSkills = new WeakSet();
            this._skillAudioStages = new WeakMap();
            this._lastEmissionAudio = -1;
            this.pendingSafeBars = [];
            this._lastSafeCellSide = 0;

            if (options.seed !== undefined) {
                this.setSeed(options.seed);
            }
            const _aw = options.canvasW || 1280;
            if (typeof options.anchorX === 'number' && isFinite(options.anchorX)) {
                this.anchorX = Math.max(_aw * 0.12, Math.min(_aw * 0.88, options.anchorX));
            }
            if (typeof options.anchorY === 'number' && isFinite(options.anchorY)) {
                const _ah = options.canvasH || 720;
                this.anchorY = Math.max(_ah * 0.18, Math.min(_ah * 0.44, options.anchorY));
            }
        }

        getOverdueDamageMult() {
            const def = ATTACK_DEFS[this.currentAttackId];
            if (!def) return 1.0;
            const overdue = Math.max(0, this.elapsed - def.duration);
            if (overdue <= 0) return 1.0;
            return Math.min(1.60, 1.0 + (overdue / 6.0) * 0.10);
        }

        update(dt, canvasW, canvasH, playerX, playerY, playerBullets, externalBossPos) {
            this._lastPlayerX = playerX;
            this._lastPlayerY = playerY;
            this.elapsed += dt;
            this._bossOrigin = externalBossPos || { x: this.anchorX, y: canvasH * 0.18 };
            this._updateCues(dt);
            this._updatePose(dt);
            const def = ATTACK_DEFS[this.currentAttackId] || ATTACK_DEFS[1];
            const isHard = this.difficulty === 'hard';
            const cycleCadence = 1.0 + Math.min(0.24, this.cycleCount * 0.08);
            const speedScale = (isHard ? 1.08 : 1.0) * (1.0 + Math.min(0.20, this.cycleCount * 0.06));

            this._updateTelegraphs(dt);
            this._updateSlowZones(dt);
            this._updateLasers(dt);

            // Update Thought Spheres
            if (this.thoughtCube.active) {
                this.thoughtCube.update(dt, canvasW, canvasH, playerBullets);
            }
            if (this.thoughtCube2.active) {
                this.thoughtCube2.update(dt, canvasW, canvasH, playerBullets);
            }

            // Update Boss Skills
            this._updateSkills(dt, canvasW, canvasH, playerX, playerY);
            this._syncSkillAudio();

            if (this.cycleBreather > 0) {
                this.cycleBreather = Math.max(0, this.cycleBreather - dt);
                return;
            }

            if (this.elapsed < this.scriptWarmup) { this.scriptTime = this.elapsed; return; }
            this.scriptTime += dt * cycleCadence;
            if (def && this.scriptTime >= def.duration) {
                if (this.currentAttackId === 13) { this.clearDimensionBreak(); this.pool.reset(); }
                this.cycleCount += 1;
                this._sound('mind-adapt');
                this.scriptTime = 0;
                this.cycleBreather = 0.65;
                this.lastSpawnTimes = {};
                return;
            }

            const bossPos = externalBossPos
                ? { x: externalBossPos.x, y: externalBossPos.y }
                : getBossTargetPosition(this.scriptTime, canvasW, canvasH, this.currentAttackId, this.seed, this.anchorX, this.anchorY);

            switch (this.currentAttackId) {
                case 1:  this._updateAttack1(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 2:  this._updateAttack2(dt, canvasW, canvasH, bossPos, playerX, playerY, speedScale, isHard); break;
                case 3:  this._updateAttack3(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 4:  this._updateAttack4(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 5:  this._updateAttack5(dt, canvasW, canvasH, speedScale, isHard); break;
                case 6:  this._updateAttack6(dt, canvasW, canvasH, speedScale, isHard); break;
                case 7:  this._updateAttack7(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 8:  this._updateAttack8(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 9:  this._updateAttack9(dt, canvasW, canvasH, speedScale, isHard); break;
                case 10: this._updateAttack10(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 11: this._updateAttack11(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 12: this._updateAttack12(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 13: this._updateAttack13(dt, canvasW, canvasH, canvasW * 0.25, canvasW * 0.75, bossPos.y, speedScale, isHard); break;
                case 14: this._updateAttack14(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 15: this._updateAttack15(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 16: this._updateAttack16(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 17: this._updateAttack17(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
                case 18: this._updateAttack18(dt, canvasW, canvasH, bossPos, speedScale, isHard); break;
            }
            if (this.elapsed >= this.pressureAt) {
                this.pressureAt = this.elapsed + 3.6;
                const odd = this.pressureBeat++ % 2;
                const x = bossPos.x + (odd ? 24 : -24);
                const y = bossPos.y - 6;
                const aim = Math.atan2(playerY - y, playerX - x);
                for (const offset of odd ? [0, -0.17, 0.23] : [0, 0.13, 0.33]) {
                    this._queueShot(x, y, Math.cos(aim + offset) * 182, Math.sin(aim + offset) * 182,
                        { style: odd ? 'eye_seed' : 'void_shard', radius: 5, locked: true });
                }
            }
            for (const beam of this.lasers) {
                if (this._seenSkills.has(beam)) continue;
                this._seenSkills.add(beam);
                this._setBossCue('eye_beams', beam.telegraphTime, 0.18, beam.x1, beam.y1);
            }
            for (const sk of this.skills) {
                if (this._seenSkills.has(sk)) continue;
                this._seenSkills.add(sk);
                if (sk.type === 'null_slash') {
                    sk.swing = 0;
                    sk.slashCount = def.phase;
                    sk.rifts = [];
                    lockNullSlash(sk, bossPos, playerX, playerY);
                }
                if (sk.type === 'tendril_lash' && sk.variant === 'vertical') sk.reach = canvasH;
                if (sk.type === 'upheaval' || sk.type === 'crush_pillar') sk.floorY = canvasH;
                if (sk.type === 'eye_beams' && sk.beams.length) {
                    sk.beams[0].targetX = playerX;
                    sk.beams[0].targetY = playerY;
                    sk.beams[0].locked = true;
                }
                if (sk.type === 'rift' || sk.type === 'mind_link' || sk.type === 'chorus') continue;
                const target = sk.targets?.[0] || sk.beams?.[0] || sk;
                this._setBossCue(CUE_KIND[sk.type] || sk.type, sk.telegraphDur || sk.windupDur || 0.45, 0.18,
                    target.targetX ?? target.x ?? playerX, target.targetY ?? target.y ?? playerY);
            }
        }

        _sound(key, x, y) {
            const am = typeof window !== 'undefined' ? window.AudioMgr : null;
            if (!am || !am.playSfxAt) return;
            const boss = this._bossOrigin || { x: this.anchorX, y: 130 };
            const phase = (ATTACK_DEFS[this.currentAttackId] || ATTACK_DEFS[1]).phase;
            am.playSfxAt(key, x ?? boss.x, y ?? boss.y, phase);
        }

        _syncSkillAudio() {
            if (!this._skillAudioStages) this._skillAudioStages = new WeakMap();
            for (const sk of this.skills) {
                const phase = sk.phase || 'active';
                const previous = this._skillAudioStages.get(sk);
                if (previous !== phase) {
                    this._skillAudioStages.set(sk, phase);
                    const key = {
                        tempest: {telegraph:'egregor-tempest-warn'},
                        tendril_lash: { telegraph: 'tendril-windup', aftermath: 'tendril-retract' },
                        upheaval: { telegraph: 'upheaval-rumble', strike: 'upheaval-erupt' },
                        eye_beams: { telegraph: 'eyebeam-charge', fade: 'eyebeam-end' },
                        gap_bar: { telegraph: 'duel-gapbar-warn', sweep: 'duel-gapbar-sweep', aftermath:'duel-gapbar-fade' },
                        crush_pillar: { telegraph: 'duel-pillar-warn', drop:'duel-pillar-drop', rest: 'duel-pillar-slam', aftermath:'duel-pillar-fade' },
                        rift: {active:'egregor-rift-warn'}, chorus: { active: 'egregor-chorus-form' }, mind_link: { active: 'mindlink-form' }
                    }[sk.type]?.[phase];
                    if (key) this._sound(key, sk.linked ? sk.x : undefined, sk.linked ? sk.y : undefined);
                }
                if(sk.type==='rift'){
                    if(sk.elapsed>=.35 && !sk._r3Form){sk._r3Form=true;this._sound('egregor-rift-form',sk.linked?sk.x:undefined,sk.linked?sk.y:undefined);}
                    if(sk.elapsed>=(sk.duration||5)-.4 && !sk._r3Fade){sk._r3Fade=true;this._sound('egregor-rift-fade',sk.linked?sk.x:undefined,sk.linked?sk.y:undefined);}
                }
                if(sk.type==='mind_link' && sk.elapsed>=sk.duration-.4 && !sk._r3Fade){sk._r3Fade=true;this._sound('egregor-mindlink-fade');}
                if (sk.type === 'upheaval' && sk.phase === 'strike' && sk.elapsed >= .42 && !sk._audioSlam) {
                    sk._audioSlam = true; this._sound('upheaval-slam', sk.targets?.[0]?.x, sk.floorY);
                }
            }
            for (const beam of this.lasers) {
                const previous = this._skillAudioStages.get(beam);
                if (previous === beam.state) continue;
                this._skillAudioStages.set(beam, beam.state);
                if (beam.state === 'telegraph') this._sound('eyebeam-charge');
                else if (beam.state === 'active') this._sound('egregor-eyebeam-fire');
                else if (beam.state === 'fading') this._sound('eyebeam-end');
            }
        }

        _setBossCue(kind, windup, active, targetX, targetY) {
            const boss = this._bossOrigin || { x: this.anchorX, y: 130 };
            const dx = (targetX ?? boss.x) - boss.x, dy = (targetY ?? boss.y + 400) - boss.y;
            const len = Math.hypot(dx, dy) || 1;
            const prep = Math.max(0.25, Math.min(0.9, windup));
            this.cues.push({ kind, age: -Math.max(0, windup - prep), startedAt: this.elapsed, windup: prep, active,
                endsAt: this.elapsed + Math.max(prep, windup) + active + 0.4,
                recover: 0.4, dirX: dx / len, dirY: dy / len, wind: 0, fire: 0, stage: 'scheduled' });
        }

        getNextCueIn() {
            let best = Infinity;
            if (Array.isArray(this.cues)) {
                for (let i = 0; i < this.cues.length; i++) {
                    const c = this.cues[i];
                    // plain volleys fire almost continuously, so they never count as an event the boss must hold still for
                    if (c.kind === 'volley') continue;
                    if (c.age < 0) {
                        const rem = -c.age;
                        if (rem < best) best = rem;
                    } else if (c.wind > 0.01 || c.fire > 0.01) {
                        return 0;
                    }
                }
            }
            const plan = VOID_PLAN[this.currentAttackId];
            if (Array.isArray(plan)) {
                for (let i = 0; i < plan.length; i++) {
                    const rem = plan[i].at - this.scriptTime;
                    if (rem > 0 && rem < best) best = rem;
                }
            }
            if (Number.isFinite(this.pressureAt)) {
                const remP = this.pressureAt - this.elapsed;
                if (remP > 0 && remP < best) best = remP;
            }
            return best;
        }

        _updateCues(dt) {
            let best = null, bestScore = -1;
            for (let i = this.cues.length - 1; i >= 0; i--) {
                const c = this.cues[i];
                c.age += dt;
                if (c.age >= c.windup + c.active + c.recover) {
                    this.cues.splice(i, 1);
                    continue;
                }
                if (c.age < 0) continue;
                if(c.kind!=='volley' && !c._r3Rune){c._r3Rune=true;this._sound('egregor-cast-rune');}
                if(c.kind!=='volley' && c.age>=c.windup && !c._r3Release){c._r3Release=true;this._sound('egregor-cast-release');}
                if (c.age < c.windup) {
                    c.stage = 'prepare'; c.wind = smoothstep(c.age / c.windup); c.fire = 0;
                } else if (c.age < c.windup + c.active) {
                    c.stage = 'fire'; c.wind = 1; c.fire = Math.sin((c.age - c.windup) / c.active * Math.PI);
                } else {
                    c.stage = 'recover'; c.wind = 1 - smoothstep((c.age - c.windup - c.active) / c.recover); c.fire = 0;
                }
                const score = (c.stage === 'fire' ? 3 : 0) + (c.kind === 'volley' ? 0 : 1) + c.wind;
                if (score > bestScore) { best = c; bestScore = score; }
            }
            this.bossCue = best;
            for (let i = (this.emissions || []).length - 1; i >= 0; i--) {
                const e = this.emissions[i]; e.delay -= dt;
                if (e.delay > 0) continue;
                this._volleySound(e.options.style, e.x, e.y);
                this._spawnPatternBullet(e.x, e.y, e.vx, e.vy, e.options); this.emissions.splice(i, 1);
            }
        }

        _updatePose(dt) {
            const p = this.poseCue, c = this.bossCue;
            if (!p) return;
            const weight = 1 - Math.exp(-dt * 24);
            p.wind += ((c ? c.wind : 0) - p.wind) * weight;
            p.fire += ((c ? c.fire : 0) - p.fire) * weight;
            if (c) {
                p.kind = c.kind;
                p.dirX += (c.dirX - p.dirX) * weight;
                p.dirY += (c.dirY - p.dirY) * weight;
            }
        }

        _volleySound(style, x, y) {
            if (this._lastEmissionAudio === this.elapsed) return;
            this._lastEmissionAudio = this.elapsed;
            const family = { eye_seed: 'eye', ichor: 'ichor', thorn: 'thorn', void_shard: 'thorn' }[style] || 'spore';
            this._sound('boss-bullet-' + family, x, y);
        }

        _queueShot(x, y, vx, vy, options) {
            const boss = this._bossOrigin;
            const near = boss && Math.abs(x - boss.x) < 200 && Math.abs(y - boss.y) < 190;
            const styles = { pellet: 'spore', ball: 'eye_seed', big_ball: 'eye_seed', rice: 'ichor', oval: 'ichor',
                kunai: 'thorn', needle: 'thorn', crystal: 'void_shard', star: 'spore', ring: 'eye_seed' };
            const opt = { ...options, style: styles[options.style] || options.style, colorKey: this._bulletColor() };
            if (near || opt.cause === 'rift') {
                const side = x < boss.x ? -1 : 1;
                if (near && !opt.locked && opt.style === 'thorn') { x = boss.x + side * 74; y = boss.y + 112; }
                else if (near && !opt.locked && (opt.style === 'void_shard' || opt.style === 'eye_seed')) { x = boss.x + side * 24; y = boss.y - 6; }
                else if (near && !opt.locked) { x = boss.x + side * 18; y = boss.y + 52; }
                if (this._lastVolleyCueAt !== this.elapsed) {
                    this._lastVolleyCueAt = this.elapsed; this._setBossCue(opt.cause === 'rift' ? 'rift' : 'volley', 0.25, 0.12, x + vx, y + vy);
                }
                this.emissions.push({ x, y, vx, vy, options: opt, delay: 0.25 });
            } else { this._volleySound(opt.style, x, y); this._spawnPatternBullet(x, y, vx, vy, opt); }
        }

        _updateTelegraphs(dt) {
            for (let i = this.telegraphs.length - 1; i >= 0; i--) {
                const tg = this.telegraphs[i];
                tg.elapsed += dt;
                if (tg.elapsed >= tg.duration) {
                    this.telegraphs.splice(i, 1);
                }
            }
        }

        _updateSlowZones(dt) {
            for (let i = this.slowZones.length - 1; i >= 0; i--) {
                const sz = this.slowZones[i];
                sz.age += dt;
                if (sz.age >= sz.maxAge) {
                    this.slowZones.splice(i, 1);
                }
            }
        }

        _updateLasers(dt) {
            for (let i = this.lasers.length - 1; i >= 0; i--) {
                const l = this.lasers[i];
                l.elapsed += dt;
                if (l.state === 'telegraph') {
                    if (l.elapsed >= l.telegraphTime) {
                        l.state = 'active';
                        l.elapsed = 0;
                    }
                } else if (l.state === 'active') {
                    if (l.elapsed >= l.activeTime) {
                        l.state = 'fading';
                        l.elapsed = 0;
                    }
                } else if (l.state === 'fading') {
                    if (l.elapsed >= l.fadeTime) {
                        l.state = 'expired';
                        this.lasers.splice(i, 1);
                    }
                }
            }
        }

        _updateSkills(dt, canvasW, canvasH, playerX, playerY) {
            if (this.pendingSafeBars?.length) {
                const request = this.pendingSafeBars[0];
                if (this._spawnGapBar(...request, true)) this.pendingSafeBars.shift();
            }
            if (this.dimension) this._updateDimensionPortals(dt, canvasW, canvasH, playerX, playerY);
            for (let i = this.skills.length - 1; i >= 0; i--) {
                const sk = this.skills[i];
                if (sk.type === 'null_slash') sk.previousStrikeElapsed = sk.elapsed;
                if (sk.hold > 0) {
                    sk.hold = Math.max(0, sk.hold - dt);
                    continue;
                }
                sk.elapsed += dt;
                if (sk.rifts) {
                    for (const rift of sk.rifts) rift.age += dt;
                    if (sk.rifts[0]?.age >= 0.8) sk.rifts.shift();
                }

                if (sk.type === 'tempest') {
                    if (sk.phase === 'telegraph') {
                        if (sk.elapsed >= sk.telegraphDur) {
                            sk.phase = 'strike';
                            sk.elapsed = 0;
                            if (typeof window !== 'undefined' && window.AudioMgr) {
                                try { window.AudioMgr.playSfx('egregor-tempest-strike'); } catch (_) {}
                            }
                        }
                    } else if (sk.phase === 'strike') {
                        if (sk.elapsed >= 0.25) {
                            sk.phase = 'aftermath';
                            sk.elapsed = 0;
                        }
                    } else if (sk.phase === 'aftermath') {
                        if (sk.elapsed >= 0.8) {
                            this.skills.splice(i, 1);
                        }
                    }
                } else if (sk.type === 'null_slash') {
                    if (sk.phase === 'charging') {
                        if (!sk._windupAudio) {
                            sk._windupAudio = true;
                            if (typeof _setShake === 'function' && window._screenShakeEnabled !== false) _setShake(2, 140);
                            if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.startNullSlashWindup === 'function') {
                                try { this._sound('nullslash-windup2'); } catch (_) {}
                            }
                        }
                        if (sk.elapsed >= sk.windupDur) {
                            sk.phase = 'striking';
                            sk.elapsed = 0;
                            if (sk.swing === 0 && sk.selfDamage && this.hp > 0) {
                                this.hp = Math.max(0, this.hp - sk.selfDamage);
                            }
                            if (typeof window !== 'undefined' && window.AudioMgr) {
                                if (typeof window.AudioMgr.stopNullSlashWindup === 'function') {
                                    try { window.AudioMgr.stopNullSlashWindup(); } catch (_) {}
                                }
                                try { this._sound('nullslash-slash2'); } catch (_) {}
                            }
                        }
                    } else if (sk.phase === 'striking') {
                        if (!sk.impact && sk.elapsed >= NULL_IMPACT) {
                            sk.impact = true;
                            sk.hold = 0.06;
                            if (typeof _setShake === 'function' && window._screenShakeEnabled !== false) _setShake(7, 220);
                        }
                        if (!sk.torn && sk.elapsed >= NULL_EXTEND + NULL_SWEEP) {
                            sk.torn = true;
                            this._sound('nullslash-tear', sk.targetX, sk.targetY);
                            sk.rifts.push({ x: sk.originX, y: sk.originY, angle: sk.angle, radius: sk.radius, age: 0 });
                        }
                        if (sk.elapsed >= NULL_EXTEND + NULL_SWEEP + NULL_RETRACT) {
                            sk.phase = 'aftermath';
                            sk.elapsed = 0;
                            this.slowZones.push({
                                x: sk.targetX - 140,
                                y: sk.targetY - 50,
                                w: 280,
                                h: 100,
                                age: 0,
                                maxAge: 1.0,
                                slowFactor: 0.50
                            });
                        }
                    } else if (sk.phase === 'aftermath') {
                        if (sk.swing + 1 < sk.slashCount && sk.elapsed >= 0.24) {
                            sk.swing++;
                            sk.phase = 'charging'; sk.elapsed = 0;
                            sk.windupDur = sk.slashCount === 3 ? 0.67 : 0.7;
                            sk.impact = sk.torn = sk._windupAudio = false;
                            lockNullSlash(sk, this._bossOrigin, playerX, playerY);
                            this._setBossCue('null_slash', sk.windupDur, 0.18, sk.targetX, sk.targetY);
                        } else if (sk.elapsed >= 0.8) {
                            this.skills.splice(i, 1);
                        }
                    }
                } else if (sk.type === 'tendril_lash') {
                    if (sk.phase === 'telegraph') {
                        if (sk.elapsed >= (sk.telegraphDur || 0.8)) {
                            sk.phase = 'strike';
                            sk.elapsed = 0;
                            if (typeof window !== 'undefined' && window.AudioMgr) {
                                try { this._sound('tendril-strike'); } catch (_) {}
                            }
                        }
                    } else if (sk.phase === 'strike') {
                        if (sk.sweepDir) sk.targetX = sk.baseX + sk.sweepDir * sk.sweep * Math.min(1, sk.elapsed / sk.strikeDur);
                        if (sk.elapsed >= (sk.strikeDur || (sk.variant === 'targeted' ? 0.35 : 0.25))) {
                            sk.phase = 'aftermath';
                            sk.elapsed = 0;
                        }
                    } else if (sk.phase === 'aftermath') {
                        if (sk.elapsed >= 1.0) {
                            this.skills.splice(i, 1);
                        }
                    }
                } else if (sk.type === 'chorus') {
                    if (sk.elapsed >= sk.duration) {
                        this.skills.splice(i, 1);
                    } else {
                        const beat = Math.floor((sk.elapsed + 0.3) / 4);
                        if (beat !== sk.lastCue) {
                            sk.lastCue = beat;
                            this._sound('egregor-chorus-pulse');
                            this._setBossCue('chorus', 0.3, 0.28, playerX, playerY);
                        }
                    }
                } else if (sk.type === 'mind_link') {
                    if (sk.elapsed >= sk.duration) {
                        this.skills.splice(i, 1);
                    } else {
                        const cueBeat = Math.floor((sk.elapsed - 1.2) / 3);
                        if (cueBeat >= 0 && cueBeat !== sk.lastCue) {
                            sk.lastCue = cueBeat;
                            this._sound('mind-lock', playerX, playerY);
                            this._setBossCue('mind_link', 0.5, 0.18, playerX, playerY);
                        }
                        const beat = Math.floor((sk.elapsed - 1.7) / 3);
                        if (beat >= 0 && beat !== sk.lastPulse) {
                            sk.lastPulse = beat;
                            this._volleySound('spore', this._bossOrigin.x, this._bossOrigin.y);
                            const boss = this._bossOrigin, count = sk.starCount || 6;
                            const aim = Math.atan2(playerY - boss.y, playerX - boss.x);
                            const index = Math.round((aim - sk.elapsed) * count / (Math.PI * 2));
                            const angle = index / count * Math.PI * 2 + sk.elapsed;
                            const x = boss.x + Math.cos(angle) * 180;
                            const y = boss.y + Math.sin(angle) * 180;
                            const lock = Math.atan2(playerY - y, playerX - x);
                            for (const offset of [-0.19, 0, 0.24]) {
                                this.pool.spawn(x, y, Math.cos(lock + offset) * 172, Math.sin(lock + offset) * 172, {
                                    style: 'spore', colorKey: this._bulletColor(), radius: 6, cause: 'mind_link'
                                });
                            }
                        }
                    }
                } else if (sk.type === 'rift') {
                    if (sk.elapsed >= (sk.duration || 5.0)) {
                        this.skills.splice(i, 1);
                    }
                } else if (sk.type === 'gap_bar') {
                    if (sk.phase === 'telegraph') {
                        if (sk.elapsed >= sk.telegraphDur) { sk.phase = 'sweep'; sk.elapsed = 0; }
                    } else if (sk.phase === 'sweep') {
                        if (sk.elapsed >= sk.sweepDur) { sk.phase = 'aftermath'; sk.elapsed = 0; }
                    } else if (sk.elapsed >= sk.aftermathDur) {
                        this.skills.splice(i, 1);
                    }
                } else if (sk.type === 'crush_pillar') {
                    if (sk.phase === 'telegraph') {
                        // The columns follow the ship for the first part of the warning, then lock in place
                        if (sk.elapsed < sk.telegraphDur * 0.55) {
                            const centre = pillarCenter(playerX, sk.count, canvasW);
                            const follow = Math.min(1, dt * 6);
                            for (const col of sk.cols) col.x += (centre + col.offset - col.x) * follow;
                        }
                        if (sk.elapsed >= sk.telegraphDur) {
                            sk.phase = 'drop'; sk.elapsed = 0;
                            for (const col of sk.cols) col.x = Math.round(col.x);
                        }
                    } else if (sk.phase === 'drop') {
                        if (sk.elapsed >= sk.dropTotal) {
                            sk.phase = 'rest'; sk.elapsed = 0;
                            if (typeof _setShake === 'function' && (typeof window === 'undefined' || (window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion))) _setShake(8, 260);
                        }
                    } else if (sk.phase === 'rest') {
                        if (sk.elapsed >= sk.restDur) { sk.phase = 'aftermath'; sk.elapsed = 0; }
                    } else if (sk.elapsed >= sk.aftermathDur) {
                        this.skills.splice(i, 1);
                    }
                } else if (sk.type === 'upheaval') {
                    if (sk.phase === 'telegraph') {
                        if (sk.elapsed >= (sk.telegraphDur || 1.05)) {
                            sk.phase = 'strike';
                            sk.elapsed = 0;
                            if (typeof _setShake === 'function' && (typeof window === 'undefined' || (window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion))) {
                                _setShake(6, 220);
                            }
                            if (typeof window !== 'undefined' && window.AudioMgr) {
                                // The stage observer emits the eruption cue.
                            }
                        }
                    } else if (sk.phase === 'strike') {
                        if (sk.elapsed >= (sk.strikeDur || 0.72)) {
                            sk.phase = 'aftermath';
                            sk.elapsed = 0;
                        }
                    } else if (sk.phase === 'aftermath') {
                        if (sk.elapsed >= (sk.aftermathDur || 0.55)) {
                            this.skills.splice(i, 1);
                            continue;
                        }
                    }
                } else if (sk.type === 'eye_beams') {
                    if (sk.phase === 'telegraph') {
                        if (sk.elapsed >= (sk.telegraphDur || 0.9)) {
                            sk.phase = 'active';
                            sk.elapsed = 0;
                            if (typeof window !== 'undefined' && window.AudioMgr) {
                                try { this._sound('egregor-eyebeam-fire'); } catch (_) {}
                            }
                        }
                    } else if (sk.phase === 'active') {
                        if (sk.sweep && sk.beams) {
                            const sweepDelta = (sk.sweepDir || 1) * 35 * dt;
                            for (let b = 0; b < sk.beams.length; b++) {
                                if (!sk.beams[b].locked) sk.beams[b].targetX += sweepDelta;
                            }
                        }
                        if (sk.elapsed >= (sk.activeDur || 0.5)) {
                            sk.phase = 'fade';
                            sk.elapsed = 0;
                        }
                    } else if (sk.phase === 'fade') {
                        if (sk.elapsed >= (sk.fadeDur || 0.3)) {
                            this.skills.splice(i, 1);
                        }
                    }
                }
            }
        }

        _renderTargetedTendril(ctx, sk, now, bossPos) {
            const sx = sk.originX !== undefined ? sk.originX : (bossPos ? bossPos.x : 640);
            const sy = sk.originY !== undefined ? sk.originY : (bossPos ? bossPos.y : 130);
            const ex = sk.targetX !== undefined ? sk.targetX : 640;
            const ey = sk.targetY !== undefined ? sk.targetY : 660;
            const cx = sk.ctrlX !== undefined ? sk.ctrlX : (sx + ex) * 0.5;
            const cy = sk.ctrlY !== undefined ? sk.ctrlY : (sy + ey) * 0.5;
            const curDef = ATTACK_DEFS[this.currentAttackId];
            const pal = (typeof window !== 'undefined' && window.DuelFX) ? window.DuelFX.getPhasePalette(curDef ? curDef.phase : 1) : { base: '#4c1d78', dark: '#1a0a30', rim: '#62ecff', glow: '#b064ff', sucker: '#9cf5ff' };
            const tSec = now * 0.001;
            const bend = (cx - (sx + ex) * 0.5) * 0.85;

            if (sk.phase === 'telegraph') {
                const prog = Math.min(1.0, sk.elapsed / (sk.telegraphDur || 0.9));
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 77, 109, ' + (0.28 + prog * 0.55) + ')';
                ctx.lineWidth = 2.4;
                ctx.setLineDash([10, 8]);
                ctx.lineDashOffset = -now * 0.04;
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
                if (typeof _drawDangerZone === 'function') {
                    _drawDangerZone('circle', ex, ey, 12, prog, 0.85, now, 0, 0, Math.PI * 2, true, false);
                }

                // Coiled windup tentacle pulling back at boss root
                if (typeof window !== 'undefined' && typeof window.buildOrganicTentacleSpine === 'function' && typeof window.drawOrganicTentacle === 'function') {
                    const windSpine = window.buildOrganicTentacleSpine(sx, sy, ex, ey, {
                        joints: 14, time: tSec, waveAmp: 22, waveFreq: 2.4, waveSpeed: 5.0,
                        bend: bend * 1.2, reach: 0.24 * Math.sin(prog * Math.PI * 0.5), curl: 0.65
                    });
                    window.drawOrganicTentacle(ctx, windSpine, {
                        rootWidth: 42, tipWidth: 4, baseColor: pal.base, darkColor: pal.dark,
                        rimColor: pal.rim, glowColor: pal.glow, suckerColor: pal.sucker, glow: 0.55, alpha: 0.88
                    });
                }
            } else if (sk.phase === 'strike') {
                const p = Math.min(1.0, sk.elapsed / 0.20);
                if (!sk._shook) {
                    sk._shook = true;
                    if (typeof _setShake === 'function') _setShake(5, 160);
                }
                const reach = Math.sin(p * Math.PI * 0.5);
                if (typeof window !== 'undefined' && typeof window.buildOrganicTentacleSpine === 'function' && typeof window.drawOrganicTentacle === 'function') {
                    const sp = window.buildOrganicTentacleSpine(sx, sy, ex, ey, {
                        joints: 18, time: tSec, waveAmp: 16, waveFreq: 2.2, waveSpeed: 6.0,
                        bend: bend, reach: reach, curl: 0.35
                    });
                    window.drawOrganicTentacle(ctx, sp, {
                        rootWidth: 48, tipWidth: 5, baseColor: pal.base, darkColor: pal.dark,
                        rimColor: pal.rim, glowColor: pal.glow, suckerColor: pal.sucker,
                        glow: 0.80, suckers: true, hooked: true, alpha: 1.0
                    });
                }
                if (p > 0.65 && typeof window !== 'undefined' && window.DuelFX) {
                    const swP = (p - 0.65) / 0.35;
                    window.DuelFX.drawShockwave(ctx, ex, ey, 18 + swP * 68, 1.0 - swP, pal.rim, 3.5);
                }
            } else if (sk.phase === 'aftermath') {
                const p = Math.min(1.0, sk.elapsed / 0.75);
                if (typeof window !== 'undefined' && typeof window.buildOrganicTentacleSpine === 'function' && typeof window.drawOrganicTentacle === 'function') {
                    const sp = window.buildOrganicTentacleSpine(sx, sy, ex, ey, {
                        joints: 14, time: tSec, waveAmp: 20, waveFreq: 2.2, waveSpeed: 4.0,
                        bend: bend, reach: Math.max(0.08, 1.0 - p), curl: 0.55
                    });
                    window.drawOrganicTentacle(ctx, sp, {
                        rootWidth: 42 * (1 - p * 0.3), tipWidth: 4, baseColor: pal.base, darkColor: pal.dark,
                        rimColor: pal.rim, glowColor: pal.glow, suckerColor: pal.sucker,
                        glow: 0.35, suckers: true, alpha: Math.max(0.05, 1.0 - p)
                    });
                }
            }
        }

        _renderTempest(ctx, sk, now) {
            const phase = ATTACK_DEFS[this.currentAttackId].phase, pal = window.DuelFX.getPhasePalette(phase);
            const low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
            const fo = window._fxOpts, glow = !fo || fo.glow !== false, parts = !fo || fo.particles !== false;
            const warning = sk.phase === 'telegraph';
            const age = warning ? 0 : sk.elapsed + (sk.phase === 'aftermath' ? 0.25 : 0);
            const progress = warning ? Math.min(1, sk.elapsed / sk.telegraphDur) : 1;
            const fade = warning ? 1 : Math.min(1, Math.max(0, (1.05 - age) / 0.35));
            for (const target of sk.targets || []) {
                const x = target.x, y = target.y, open = warning ? 0.3 + progress * 0.7 : fade;
                ctx.save();
                ctx.globalAlpha = fade;
                ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.ellipse(x, y, 60 * open, 25 * open, -0.1, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = pal.rim; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(x, y, 60 * open, 25 * open, -0.1, 0, Math.PI * 2); ctx.stroke();
                if (warning && typeof _drawDangerZone === 'function') _drawDangerZone('tempest', x, y, 100, progress, 1, now, 0, 0, Math.PI, true, false);
                // Staggered portal limbs share the growth and recoil timing of the Endless effect.
                const count = low ? 2 : (typeof _gfxLevel !== 'undefined' && _gfxLevel === 1 ? 3 : 4);
                for (let i = count - 1; i >= 0; i--) {
                    const local = age - i * 0.048;
                    if (!warning && local < 0) continue;
                    const grown = warning ? Math.max(0, (progress - 0.75) * 4) * 0.22 : smoothstep(Math.min(1, (local + 0.022) / 0.09));
                    const retract = warning || age < 0.255 ? 1 : Math.max(0, (1.05 - age) / 0.795);
                    const a = i * 2.39996, reach = (i === 0 ? 275 : 180) * grown * retract;
                    const bx = x + Math.cos(a) * 16, by = y + Math.sin(a) * 8;
                    const spine = window.buildOrganicTentacleSpine(bx, by, bx + Math.cos(a) * reach * 0.42, by - reach, {
                        joints: low ? 8 : 14, time: now * 0.001, waveAmp: 8, bend: Math.sin(Math.min(1, local / 0.3) * Math.PI) * 65,
                        phase: i * 1.8, curl: i % 2 ? 0.6 : -0.6
                    });
                    window.drawOrganicTentacle(ctx, spine, { rootWidth: i === 0 ? 48 : 29, tipWidth: 5, phase,
                        suckers: !low, glow: glow ? 0.6 : 0, alpha: fade, castShadow: false, subdiv: low ? 1 : 2 });
                }
                if (!warning) {
                    ctx.save(); ctx.globalCompositeOperation = 'lighter';
                    const pulse = Math.max(0, 1 - age / 0.43);
                    ctx.globalAlpha = pulse * 0.85; ctx.strokeStyle = pal.sucker; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(x, y, 16 + Math.min(1, age / 0.22) * 84, 0, Math.PI * 2); ctx.stroke();
                    if (glow && typeof _riftArt !== 'undefined' && _riftArt?.nova) {
                        ctx.globalAlpha = Math.max(0, 1 - age / 0.12) * 0.45;
                        ctx.drawImage(_riftArt.nova, x - 72, y - 72, 144, 144);
                    }
                    if (parts) {
                        ctx.globalAlpha = pulse * 0.8; ctx.fillStyle = pal.rim; ctx.beginPath();
                        for (let i = 0; i < (low ? 6 : 20); i++) {
                            const a = i * 2.39996, r = 14 + age * (70 + i % 4 * 35);
                            const dx = x + Math.cos(a) * r, dy = y + Math.sin(a) * r * 0.6 - Math.sin(Math.min(1, age / 0.43) * Math.PI) * 24;
                            ctx.moveTo(dx, dy - 2); ctx.lineTo(dx + 3, dy + 2); ctx.lineTo(dx - 2, dy + 3); ctx.closePath();
                        }
                        ctx.fill();
                    }
                    ctx.restore();
                }
                ctx.restore();
            }
        }

        _renderNullSlash(ctx, sk, now) {
            const x = sk.originX, y = sk.originY, r = sk.radius, a = sk.angle;
            const phase = ATTACK_DEFS[this.currentAttackId].phase;
            const color = ['#a17dff', '#cd8dff', '#ff7464'][phase - 1];
            const fx = window._fxOpts || {}, low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
            const art = bakeDuelBossAssets();
            const limb = art.limbs[phase - 1];
            for (const tear of sk.rifts) {
                const fade = Math.max(0, 1 - tear.age / 0.8);
                _drawEgregorRift(tear.x, tear.y, tear.radius, tear.angle - Math.PI / 2, Math.PI, phase + 1, 1, fade, now, 0);
                if (fx.particles !== false) {
                    ctx.save(); ctx.fillStyle = '#f4d7ff';
                    for (let k = 0; k < (low ? 5 : 16); k++) {
                        const az = tear.angle - Math.PI / 2 + k * 0.73 % Math.PI;
                        const d = tear.radius * (0.96 + (k % 4 - 1.5) * tear.age * 0.2);
                        const dx = tear.x + Math.cos(az) * d, dy = tear.y + Math.sin(az) * d;
                        ctx.globalAlpha = fade * (0.44 + (k % 3) * 0.16);
                        ctx.beginPath(); ctx.moveTo(dx - 4, dy + 3); ctx.lineTo(dx + 8, dy - 3); ctx.lineTo(dx + 1, dy + 6); ctx.fill();
                    }
                    ctx.restore();
                }
            }
            ctx.save();
            if (sk.phase === 'charging') {
                const p = smoothstep(sk.elapsed / sk.windupDur);
                _drawEgregorNullCharge({ x, y }, now, p, r, a);
                _drawDangerZone('sector', x, y, r, p, 0.66, now, a, 0, Math.PI, false, true);
                const startingArm = a - sk.sweepDirection * Math.PI / 2;
                for (let k = 0; k < 2; k++) {
                    ctx.save(); ctx.translate(x, y);
                    ctx.rotate(startingArm - Math.PI / 2 - sk.sweepDirection * (1 - p) * (0.7 + k * 0.22));
                    ctx.globalAlpha = 0.68 + p * 0.3;
                    ctx.drawImage(limb, -56 + k * 21, -26, 100 - k * 20, 114 + p * 55);
                    ctx.restore();
                }
                if (fx.glow !== false) {
                    ctx.save(); ctx.translate(x, y); ctx.rotate(now * (fx.reducedMotion ? 0 : 0.0015));
                    ctx.globalAlpha = p * 0.55; ctx.drawImage(art.p3Ring, -78, -78, 156, 156); ctx.restore();
                    ctx.globalAlpha = 0.14 + p * 0.20;
                    ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.beginPath();
                    ctx.arc(x, y, r, a - Math.PI * 0.5, a + Math.PI * 0.5); ctx.stroke();
                }
                // Crisp outer reach boundary so the safe zone outside null_slash radius is readable
                ctx.save();
                ctx.globalAlpha = 0.36 + p * 0.44;
                ctx.strokeStyle = "#fff0f6";
                ctx.lineWidth = 2.2;
                ctx.setLineDash([12, 8]);
                ctx.beginPath();
                ctx.arc(x, y, r, a - Math.PI * 0.5, a + Math.PI * 0.5);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            } else if (sk.phase === 'striking') {
                const frame = nullSlashReach(sk);
                const direction = sk.sweepDirection;
                const swept = frame.eased * Math.PI;
                const retract = Math.max(0, (sk.elapsed - NULL_EXTEND - NULL_SWEEP) / NULL_RETRACT);
                const fade = 1 - retract * retract;
                if (frame.radius > 1) {
                    _drawDangerZone('strip', x, y, frame.radius, 1, 0.40, now, frame.angle, 45, Math.PI, false, false);
                    for (let k = fx.trails === false ? 0 : (low ? 1 : 4); k >= 0; k--) {
                        const shadow = nullSlashReach(sk, sk.elapsed - k * 0.026);
                        if (shadow.radius < 2) continue;
                        ctx.save(); ctx.translate(x, y); ctx.rotate(shadow.angle - Math.PI / 2);
                        ctx.globalAlpha = k ? 0.17 - k * 0.021 : fade;
                        ctx.drawImage(limb, -43, -shadow.radius * 0.13, 88, shadow.radius * 1.29);
                        ctx.restore();
                    }
                }
                if (swept > 0.03) {
                    const tail = Math.min(swept, Math.PI * (0.56 + retract * 0.21));
                    const start = frame.angle - direction * tail;
                    const segments = low ? 5 : 10;
                    ctx.lineCap = 'round';
                    for (let k = 0; k < segments; k++) {
                        const p = (k + 1) / segments;
                        const a0 = start + direction * tail * k / segments, a1 = start + direction * tail * p;
                        const arc = () => { ctx.beginPath(); ctx.arc(x, y, r, a0, a1, direction < 0); ctx.stroke(); };
                        ctx.globalAlpha = fade * p * (0.48 + 0.3 * p);
                        ctx.strokeStyle = '#080412'; ctx.lineWidth = 9 + 26 * p * p; arc();
                        ctx.strokeStyle = color; ctx.lineWidth = 3 + 16 * p * p; arc();
                        ctx.strokeStyle = '#fff3ff'; ctx.lineWidth = 1 + 5 * p * p; arc();
                    }
                }
                const flash = Math.max(0, 1 - Math.abs(sk.elapsed - NULL_IMPACT) / 0.115);
                if (flash > 0 && fx.screenFlash !== false) {
                    const px = sk.targetX, py = sk.targetY;
                    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2 + flash * 2.5;
                    for (const side of [-1, 1]) {
                        ctx.globalAlpha = flash * 0.7; ctx.strokeStyle = side === 1 ? '#ff547e' : '#93caff';
                        ctx.beginPath(); ctx.ellipse(px + side * 5, py, 34 + (1 - flash) * 52, 12 + (1 - flash) * 25, a, 0, Math.PI * 2); ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        _renderSafeCellBar(ctx, sk, now) {
            const W = sk.canvasW, H = sk.canvasH, size = sk.safeSize;
            const x0 = sk.safeX - size / 2, y0 = sk.cellTop;
            const tel = sk.phase === 'telegraph' ? Math.min(1, sk.elapsed / sk.telegraphDur) : 1;
            const fade = sk.phase === 'aftermath' ? Math.max(0, 1 - sk.elapsed / sk.aftermathDur) : 1;
            const pal = window.DuelFX.getPhasePalette(ATTACK_DEFS[this.currentAttackId].phase);
            const fo = window._fxOpts || {}, low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
            ctx.save();
            // The whole screen is dangerous except the safe cell: a red wash, a bright red frame and a glow, all cut around the cell
            const screenW = typeof canvas !== 'undefined' ? canvas.width : W, screenH = typeof canvas !== 'undefined' ? canvas.height : H;
            const red = window._dangerGuide === true || fo.dangerWarn !== false;
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, screenW, screenH); ctx.rect(x0, y0, size, size); ctx.clip('evenodd');
            if (red) {
                const wash = (sk.phase === 'sweep' ? 0.14 : 0.07 + tel * 0.13) * fade * (fo.reducedMotion ? 1 : 0.86 + 0.14 * Math.sin(now * 0.012));
                ctx.fillStyle = 'rgba(255,48,34,' + wash + ')'; ctx.fillRect(0, 0, screenW, screenH);
                ctx.strokeStyle = 'rgba(255,70,49,' + ((0.5 + tel * 0.4) * fade) + ')'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, screenW - 8, screenH - 8);
                if (!low && fo.glow !== false) {
                    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,56,32,' + (0.2 * fade) + ')';
                    ctx.lineWidth = 24; ctx.strokeRect(12, 12, screenW - 24, screenH - 24); ctx.globalCompositeOperation = 'source-over';
                }
            } else {
                ctx.strokeStyle = 'rgba(228,224,217,' + (0.5 * fade) + ')'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, screenW - 4, screenH - 4);
            }
            ctx.restore();
            if ((sk.phase === 'telegraph' || sk.phase === 'sweep') && typeof _drawDangerZone === 'function') {
                // the whole ship row is lethal except the safe cell, so it carries the standard red warning: zone, rim, glow and ticks
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(x0, y0, size, size); ctx.clip('evenodd');
                _drawDangerZone('strip', 0, y0 + size / 2, W, sk.phase === 'telegraph' ? tel : 1, sk.phase === 'telegraph' ? 0.9 : 0.5, now, 0, size / 2, Math.PI, false, false);
                ctx.restore();
            } else if (sk.phase === 'telegraph' && fo.dangerWarn !== false) {
                ctx.fillStyle = 'rgba(255,60,95,' + (0.06 + tel * 0.13) + ')';
                ctx.fillRect(0, y0, x0, size); ctx.fillRect(x0 + size, y0, W - x0 - size, size);
            }
            if (sk.phase === 'sweep') {
                const along = gapBarPos(sk, Math.min(1, sk.elapsed / sk.sweepDur));
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(x0, y0, size, size); ctx.clip('evenodd');
                const g = ctx.createLinearGradient(along - 27, 0, along + 27, 0);
                g.addColorStop(0, pal.base); g.addColorStop(0.5, pal.dark); g.addColorStop(1, pal.base);
                ctx.fillStyle = g; ctx.fillRect(along - 27, 0, 54, H);
                if (!low && fo.glow !== false) {
                    const trail = ctx.createLinearGradient(along, 0, along - sk.dir * 140, 0);
                    trail.addColorStop(0, '#ff547e66'); trail.addColorStop(1, '#ff547e00');
                    ctx.fillStyle = trail; ctx.fillRect(Math.min(along, along - sk.dir * 140), 0, 140, H);
                }
                ctx.strokeStyle = pal.rim; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(along - 27, 0); ctx.lineTo(along - 27, H); ctx.moveTo(along + 27, 0); ctx.lineTo(along + 27, H); ctx.stroke();
                ctx.restore();
            }
            // The safe cell flashes so it can be found at a glance; reduced motion swaps the flash for a slow pulse
            const flash = fo.reducedMotion ? 0.5 + 0.5 * Math.sin(now * 0.006) : (Math.sin(now * 0.016) > -0.15 ? 1 : 0);
            ctx.globalAlpha = fade * (0.1 + 0.34 * flash); ctx.fillStyle = flash > 0.5 ? '#f4f0ff' : pal.rim; ctx.fillRect(x0, y0, size, size);
            ctx.globalAlpha = fade * (0.45 + 0.55 * flash); ctx.strokeStyle = flash > 0.5 ? '#ffffff' : pal.rim; ctx.lineWidth = 3 + tel;
            const dash = low || fo.reducedMotion || fo.trails === false ? 0 : now * 0.025;
            ctx.setLineDash([11, 7]); ctx.lineDashOffset = -dash; ctx.strokeRect(x0, y0, size, size); ctx.setLineDash([]);
            ctx.lineWidth = 2;
            for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x0 + size, y0, -1, 1], [x0, y0 + size, 1, -1], [x0 + size, y0 + size, -1, -1]]) {
                ctx.beginPath(); ctx.moveTo(x, y + sy * 18); ctx.lineTo(x, y); ctx.lineTo(x + sx * 18, y); ctx.stroke();
            }
            if (sk.phase === 'telegraph') {
                const side = Math.sign(sk.safeX - sk.originShipX), travel = Math.abs(sk.safeX - sk.originShipX) - size / 2 - 26;
                for (let k = 0; k < (low ? 2 : 4); k++) {
                    const u = low || fo.reducedMotion || fo.trails === false ? (k + 1) / (low ? 3 : 5) : ((now * 0.00065 + k / 4) % 1);
                    const x = sk.originShipX + side * (24 + u * travel), y = sk.safeY + 24;
                    ctx.beginPath(); ctx.moveTo(x - side * 9, y - 7); ctx.lineTo(x, y); ctx.lineTo(x - side * 9, y + 7); ctx.stroke();
                }
                for (const x of [22, W - 22]) {
                    const y = y0 - 24;
                    ctx.beginPath(); ctx.moveTo(x - sk.dir * 12, y - 8); ctx.lineTo(x + sk.dir * 12, y); ctx.lineTo(x - sk.dir * 12, y + 8); ctx.stroke();
                }
            }
            ctx.restore();
        }

        _renderGapBar(ctx, sk, now) {
            if (sk.axis === 'x' && Number.isFinite(sk.safeX)) { this._renderSafeCellBar(ctx, sk, now); return; }
            // Along the 'x' axis the drawing is mirrored across the diagonal, so the code below always draws a sweep along y
            const swap = sk.axis === 'x';
            const arenaW = arenaWidth(sk), arenaH = Math.max(sk.canvasH || 720, (typeof canvas !== 'undefined' && canvas.height) || 0);
            const W = swap ? arenaH : arenaW, H = swap ? arenaW : arenaH;
            const curDef = ATTACK_DEFS[this.currentAttackId];
            const pal = window.DuelFX.getPhasePalette(curDef ? curDef.phase : 1);
            const fo = window._fxOpts, glow = !fo || fo.glow !== false;
            const gl = sk.gap - sk.gapW / 2, gr = sk.gap + sk.gapW / 2;
            const tel = sk.phase === 'telegraph' ? Math.min(1, sk.elapsed / sk.telegraphDur) : 1;
            const out = sk.phase === 'aftermath' ? Math.max(0, 1 - sk.elapsed / sk.aftermathDur) : 1;
            const pulse = fo?.reducedMotion ? .85 : 0.75 + 0.25 * Math.sin(now * 0.016);
            ctx.save();
            if (swap) ctx.transform(0, 1, 1, 0, 0, 0);
            // The lethal columns on both sides of the gap are striped so they read as a warning from across the arena
            const warn = (sk.phase === 'telegraph' ? 0.05 + tel * 0.17 : 0.2) * out * pulse;
            ctx.fillStyle = 'rgba(255, 60, 95, ' + warn + ')';
            ctx.fillRect(0, 0, gl, H); ctx.fillRect(gr, 0, W - gr, H);
            ctx.fillStyle = 'rgba(255, 60, 95, ' + (warn * 1.5) + ')';
            const stripe = 46, off = (now * 0.05) % stripe;
            for (let x = -stripe + off; x < gl; x += stripe) {
                const a = Math.max(0, x), b = Math.min(x + 10, gl);
                if (b > a) ctx.fillRect(a, 0, b - a, H);
            }
            for (let x = gr - stripe + off; x < W; x += stripe) {
                const a = Math.max(gr, x), b = Math.min(x + 10, W);
                if (b > a) ctx.fillRect(a, 0, b - a, H);
            }
            // The safe window glows and chevrons run through it in the direction the bar will travel
            ctx.globalAlpha = (0.08 + tel * 0.12) * out; ctx.fillStyle = pal.rim; ctx.fillRect(gl, 0, gr - gl, H);
            ctx.globalAlpha = 0.9 * out; ctx.strokeStyle = pal.rim; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(gl, 0); ctx.lineTo(gl, H); ctx.moveTo(gr, 0); ctx.lineTo(gr, H); ctx.stroke();
            ctx.lineWidth = 2.4; ctx.globalAlpha = (0.35 + tel * 0.45) * out;
            const spacing = 76;
            for (let k = 0; k < Math.ceil(H / spacing) + 1; k++) {
                const y = ((k * spacing + now * 0.14 * sk.dir) % (H + spacing) + H + spacing) % (H + spacing) - spacing * 0.5;
                ctx.beginPath(); ctx.moveTo(sk.gap - 30, y - 12 * sk.dir); ctx.lineTo(sk.gap, y + 12 * sk.dir); ctx.lineTo(sk.gap + 30, y - 12 * sk.dir); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            if (sk.phase === 'sweep') {
                const y = gapBarPos(sk, Math.min(1, sk.elapsed / sk.sweepDur)), th = sk.thick;
                const slab = (x0, x1) => {
                    if (x1 - x0 < 2) return;
                    const g = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
                    g.addColorStop(0, pal.base); g.addColorStop(0.5, pal.dark); g.addColorStop(1, pal.base);
                    ctx.fillStyle = g; ctx.fillRect(x0, y - th / 2, x1 - x0, th);
                    if (glow) {
                        const tg = ctx.createLinearGradient(0, y - sk.dir * th / 2, 0, y - sk.dir * (th / 2 + 170));
                        tg.addColorStop(0, 'rgba(255, 60, 95, 0.38)'); tg.addColorStop(1, 'rgba(255, 60, 95, 0)');
                        ctx.fillStyle = tg; ctx.fillRect(x0, Math.min(y - sk.dir * (th / 2 + 170), y - sk.dir * th / 2), x1 - x0, 170);
                    }
                    ctx.strokeStyle = pal.rim; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
                    ctx.beginPath(); ctx.moveTo(x0, y - th / 2); ctx.lineTo(x1, y - th / 2); ctx.moveTo(x0, y + th / 2); ctx.lineTo(x1, y + th / 2); ctx.stroke();
                    ctx.fillStyle = pal.rim; ctx.globalAlpha = 0.6;
                    for (let x = x0 + 40 - ((now * 0.04) % 64); x < x1 - 10; x += 64) if (x > x0) ctx.fillRect(x, y - 3, 14, 6);
                    ctx.globalAlpha = 1;
                };
                slab(0, gl); slab(gr, W);
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9;
                for (const ex of [gl, gr]) {
                    ctx.beginPath(); ctx.moveTo(ex, y - 12); ctx.lineTo(ex + 8, y); ctx.lineTo(ex, y + 12); ctx.lineTo(ex - 8, y); ctx.closePath(); ctx.fill();
                }
            }
            if (sk.phase === 'aftermath') {
                const p = Math.min(1, sk.elapsed / sk.aftermathDur);
                const end = gapBarPos(sk, 1);
                ctx.globalAlpha = (1 - p) * .6; ctx.strokeStyle = pal.rim; ctx.lineWidth = 2;
                for (const ex of [gl, gr]) {
                    ctx.beginPath(); ctx.ellipse(ex, end, 12 + p * 38, 7 + p * 12, 0, 0, Math.PI * 2); ctx.stroke();
                }
            }
            ctx.restore();
        }

        _renderPillars(ctx, sk, now) {
            const H = sk.floorY || 720, w = sk.w;
            const curDef = ATTACK_DEFS[this.currentAttackId];
            const pal = window.DuelFX.getPhasePalette(curDef ? curDef.phase : 1);
            const fo = window._fxOpts, glow = !fo || fo.glow !== false;
            const tel = sk.phase === 'telegraph' ? Math.min(1, sk.elapsed / sk.telegraphDur) : 1;
            const fade = sk.phase === 'aftermath' ? Math.max(0, 1 - sk.elapsed / sk.aftermathDur) : 1;
            for (const col of sk.cols) {
                const x = col.x;
                const bottom = pillarBottom(sk, col);
                if (sk.phase === 'telegraph') {
                    if (typeof _drawDangerZone === 'function') _drawDangerZone('strip', x, 0, H, tel, 0.9, now, Math.PI * 0.5, w / 2, Math.PI, false, false);
                    // The underside of the pillar creeps in from above and trembles harder as the drop nears
                    const peek = 8 + tel * 38, shake = fo?.reducedMotion ? 0 : Math.sin(now * 0.07 + x) * (1 + tel * 3);
                    ctx.save();
                    ctx.fillStyle = pal.dark; ctx.strokeStyle = pal.rim; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
                    ctx.beginPath(); ctx.moveTo(x - w / 2 + shake, 0); ctx.lineTo(x + w / 2 + shake, 0); ctx.lineTo(x + w / 2 + shake, peek);
                    ctx.lineTo(x + shake, peek + 16); ctx.lineTo(x - w / 2 + shake, peek); ctx.closePath(); ctx.fill(); ctx.stroke();
                    ctx.restore();
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = fade;
                if (sk.phase === 'aftermath') ctx.translate(0, (1 - fade) * 18);
                const x0 = x - w / 2, x1 = x + w / 2, tipH = 34;
                const g = ctx.createLinearGradient(x0, 0, x1, 0);
                g.addColorStop(0, pal.dark); g.addColorStop(0.35, pal.base); g.addColorStop(0.65, pal.base); g.addColorStop(1, pal.dark);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x1, -10); ctx.lineTo(x1, bottom - tipH); ctx.lineTo(x, bottom); ctx.lineTo(x0, bottom - tipH); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = pal.rim; ctx.lineWidth = 2.5; ctx.stroke();
                for (let y = 60; y < bottom - tipH - 20; y += 78) {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(x0 + 3, y); ctx.lineTo(x1 - 3, y); ctx.stroke();
                    ctx.fillStyle = pal.rim; ctx.globalAlpha = 0.7 * fade;
                    ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + 7, y + 28); ctx.lineTo(x, y + 42); ctx.lineTo(x - 7, y + 28); ctx.closePath(); ctx.fill();
                    ctx.globalAlpha = fade;
                }
                if (sk.phase === 'drop') {
                    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.35;
                    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 20, Math.max(0, bottom - 320)); ctx.lineTo(x + k * 20, bottom - tipH); ctx.stroke(); }
                } else if (sk.phase === 'rest') {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'; ctx.lineWidth = 2; ctx.globalAlpha = Math.min(1, sk.elapsed * 3);
                    ctx.beginPath(); ctx.moveTo(x - 10, 120); ctx.lineTo(x + 4, 190); ctx.lineTo(x - 6, 250); ctx.lineTo(x + 12, 330); ctx.stroke();
                }
                ctx.restore();
                if (sk.phase === 'rest' && sk.elapsed < 0.4) {
                    const q = sk.elapsed / 0.4;
                    ctx.save(); ctx.strokeStyle = pal.rim; ctx.lineWidth = 4 * (1 - q) + 1; ctx.globalAlpha = 1 - q;
                    ctx.beginPath(); ctx.ellipse(x, H - 6, 40 + q * 170, 8 + q * 22, 0, 0, Math.PI * 2); ctx.stroke();
                    if (fo?.particles !== false) {
                        const count = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2 ? 6 : 14;
                        ctx.globalAlpha = (1 - q) * .65; ctx.fillStyle = pal.rim;
                        for (let k = 0; k < count; k++) {
                            const a = Math.PI + (k + .5) * Math.PI / count;
                            const move = fo?.reducedMotion ? 12 : q * 150;
                            const dx = x + Math.cos(a) * (25 + move), dy = H - 8 + Math.sin(a) * (12 + move * .5);
                            ctx.beginPath(); ctx.moveTo(dx, dy - 4); ctx.lineTo(dx + 5, dy + 3); ctx.lineTo(dx - 3, dy + 5); ctx.closePath(); ctx.fill();
                        }
                    }
                    ctx.restore();
                }
            }
        }

        renderSkills(ctx, bossPos) {
            if (!this.skills || this.skills.length === 0) return;
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            const now = performance.now();
            const phasePal = window.DuelFX.getPhasePalette(ATTACK_DEFS[this.currentAttackId].phase);

            for (let i = 0; i < this.skills.length; i++) {
                const sk = this.skills[i];
                if (sk.type === 'tempest') {
                    this._renderTempest(ctx, sk, now);
                } else if (sk.type === 'gap_bar') {
                    this._renderGapBar(ctx, sk, now);
                } else if (sk.type === 'crush_pillar') {
                    this._renderPillars(ctx, sk, now);
                } else if (sk.type === 'null_slash') {
                    this._renderNullSlash(ctx, sk, now);
                } else if (sk.type === 'tendril_lash') {
                    if (sk.variant === 'targeted') {
                        this._renderTargetedTendril(ctx, sk, now, bossPos);
                        continue;
                    }
                    const isHoriz = (sk.variant !== 'vertical');
                    const bandH = 48;
                    const reachMax = isHoriz ? (sk.width || 768) : (sk.reach || 540);
                    const portalX = isHoriz ? (sk.direction === 1 ? 0 : 1280) : (sk.targetX || 640);
                    const portalY = isHoriz ? (sk.y || 420) : 0;
                    const targetX = isHoriz ? (sk.direction === 1 ? reachMax : 1280 - reachMax) : portalX;
                    const targetY = isHoriz ? portalY : reachMax;

                    function _drawLashTentacle(startX, startY, curEndX, curEndY, reachProgress, whipAlpha) {
                        const steps = 30;
                        const ptsX = new Float32Array(steps + 1);
                        const ptsY = new Float32Array(steps + 1);
                        const ptsW = new Float32Array(steps + 1);

                        for (let s = 0; s <= steps; s++) {
                            const tRaw = s / steps;
                            const wave = Math.sin(tRaw * Math.PI * 2.5 - reachProgress * Math.PI * 2.2) * (16 * Math.sin(tRaw * Math.PI));
                            if (isHoriz) {
                                ptsX[s] = startX + (curEndX - startX) * tRaw;
                                ptsY[s] = startY + wave;
                            } else {
                                ptsX[s] = startX + wave;
                                ptsY[s] = startY + (curEndY - startY) * tRaw;
                            }
                            ptsW[s] = Math.max(6, (1.0 - tRaw * 0.74) * 54);
                        }

                        ctx.save();
                        ctx.globalAlpha = whipAlpha;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';

                        // 1. Radiant outer aura rim (vivid cyan and electric violet border)
                        ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
                        for (let s = 0; s < steps; s++) {
                            ctx.lineWidth = ptsW[s] + 10;
                            ctx.beginPath();
                            ctx.moveTo(ptsX[s], ptsY[s]);
                            ctx.lineTo(ptsX[s + 1], ptsY[s + 1]);
                            ctx.stroke();
                        }

                        // 2. Dark outer silhouette
                        ctx.strokeStyle = '#180a2b';
                        for (let s = 0; s < steps; s++) {
                            ctx.lineWidth = ptsW[s] + 5;
                            ctx.beginPath();
                            ctx.moveTo(ptsX[s], ptsY[s]);
                            ctx.lineTo(ptsX[s + 1], ptsY[s + 1]);
                            ctx.stroke();
                        }

                        // 3. Deep vibrant cosmic violet core
                        ctx.strokeStyle = '#6a229c';
                        for (let s = 0; s < steps; s++) {
                            ctx.lineWidth = ptsW[s];
                            ctx.beginPath();
                            ctx.moveTo(ptsX[s], ptsY[s]);
                            ctx.lineTo(ptsX[s + 1], ptsY[s + 1]);
                            ctx.stroke();
                        }

                        // 4. Lit flank and glowing bioluminescent suckers along lower rim
                        for (let s = 2; s < steps; s += 2) {
                            const tRaw = s / steps;
                            const rSucker = Math.max(3, (1.0 - tRaw * 0.55) * 8.5);
                            const offX = isHoriz ? 0 : ptsW[s] * 0.38;
                            const offY = isHoriz ? ptsW[s] * 0.38 : 0;

                            ctx.fillStyle = '#b340ff';
                            ctx.beginPath();
                            ctx.arc(ptsX[s] + offX, ptsY[s] + offY, rSucker, 0, Math.PI * 2);
                            ctx.fill();

                            ctx.fillStyle = phasePal.rim;
                            ctx.beginPath();
                            ctx.arc(ptsX[s] + offX, ptsY[s] + offY, rSucker * 0.45, 0, Math.PI * 2);
                            ctx.fill();

                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 1.0;
                            ctx.beginPath();
                            ctx.arc(ptsX[s] + offX, ptsY[s] + offY, rSucker, 0, Math.PI * 2);
                            ctx.stroke();
                        }

                        // 5. Bright wet spine highlight
                        ctx.strokeStyle = '#f0d9ff';
                        ctx.lineWidth = 4.2;
                        ctx.beginPath();
                        ctx.moveTo(ptsX[0], ptsY[0]);
                        for (let s = 1; s <= steps; s++) {
                            const offX = isHoriz ? 0 : -ptsW[s] * 0.22;
                            const offY = isHoriz ? -ptsW[s] * 0.22 : 0;
                            ctx.lineTo(ptsX[s] + offX, ptsY[s] + offY);
                        }
                        ctx.stroke();

                        // 6. White incandescent light tip with lens burst
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(ptsX[steps], ptsY[steps], 7.5, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = phasePal.rim;
                        ctx.lineWidth = 2.0;
                        ctx.beginPath();
                        ctx.arc(ptsX[steps], ptsY[steps], 12.0, 0, Math.PI * 2);
                        ctx.stroke();

                        ctx.restore();
                    }

                    if (sk.phase === 'telegraph') {
                        const prog = Math.min(1.0, sk.elapsed / (sk.telegraphDur || 0.8));
                        ctx.save();
                        // 1. Red warning band across 60% of arena
                        ctx.fillStyle = `rgba(255, 30, 60, ${0.08 + prog * 0.18})`;
                        if (isHoriz) {
                            const bx = sk.direction === 1 ? 0 : 1280 - reachMax;
                            ctx.fillRect(bx, portalY - bandH * 0.5, reachMax, bandH);
                            ctx.strokeStyle = `rgba(255, 70, 100, ${0.5 + 0.4 * Math.sin(now * 0.015)})`;
                            ctx.lineWidth = 1.8;
                            ctx.setLineDash([12, 8]);
                            ctx.lineDashOffset = -now * 0.04;
                            ctx.beginPath();
                            ctx.moveTo(bx, portalY - bandH * 0.5); ctx.lineTo(bx + reachMax, portalY - bandH * 0.5);
                            ctx.moveTo(bx, portalY + bandH * 0.5); ctx.lineTo(bx + reachMax, portalY + bandH * 0.5);
                            ctx.stroke();
                        } else {
                            const by = 0;
                            if (sk.sweepDir) {
                                // The whole path the tentacle will comb is marked, with arrows showing which way it moves
                                const x0 = sk.baseX, x1 = sk.baseX + sk.sweepDir * sk.sweep;
                                ctx.fillRect(Math.min(x0, x1) - 40, by, Math.abs(x1 - x0) + 80, reachMax);
                                ctx.strokeStyle = 'rgba(255, 150, 170, 0.85)'; ctx.lineWidth = 2.4;
                                for (let k = 0; k < 5; k++) {
                                    const ax = x0 + (x1 - x0) * (((k / 5) + now * 0.0006) % 1);
                                    ctx.beginPath(); ctx.moveTo(ax - sk.sweepDir * 10, 150); ctx.lineTo(ax + sk.sweepDir * 10, 168); ctx.lineTo(ax - sk.sweepDir * 10, 186); ctx.stroke();
                                }
                            }
                            ctx.fillRect(portalX - 40, by, 80, reachMax);
                            ctx.strokeStyle = `rgba(255, 70, 100, ${0.5 + 0.4 * Math.sin(now * 0.015)})`;
                            ctx.lineWidth = 1.8;
                            ctx.setLineDash([12, 8]);
                            ctx.lineDashOffset = -now * 0.04;
                            ctx.beginPath();
                            ctx.moveTo(portalX - 40, by); ctx.lineTo(portalX - 40, by + reachMax);
                            ctx.moveTo(portalX + 40, by); ctx.lineTo(portalX + 40, by + reachMax);
                            ctx.stroke();
                        }
                        ctx.restore();

                        // 2. Edge portal opening
                        if (typeof _drawEgregorPortal === 'function') {
                            _drawEgregorPortal(portalX, portalY, 44, now, Math.min(1.0, sk.elapsed / 0.25), false);
                        }

                        // 3. Faint coiled ghost tentacle peeking out from the portal
                        const peekReach = 140 * Math.sin(prog * Math.PI * 0.5);
                        const curEndX = isHoriz ? (portalX + (sk.direction === 1 ? peekReach : -peekReach)) : portalX;
                        const curEndY = isHoriz ? portalY : (portalY + peekReach);
                        _drawLashTentacle(portalX, portalY, curEndX, curEndY, prog, 0.4 + prog * 0.3);

                    } else if (sk.phase === 'strike') {
                        const p = Math.min(1.0, sk.elapsed / 0.25);
                        if (!sk._shook) {
                            sk._shook = true;
                            if (typeof _setShake === 'function') _setShake(4, 160);
                        }

                        // Edge portal fully flared
                        if (typeof _drawEgregorPortal === 'function') {
                            _drawEgregorPortal(portalX, portalY, 48, now, 1.0, false);
                        }

                        // Motion blur ghost trails behind whipping tentacle
                        if (p > 0.15) {
                            const trailReach1 = reachMax * Math.sin(Math.max(0, p - 0.08) * Math.PI * 0.5);
                            const t1EndX = isHoriz ? (portalX + (sk.direction === 1 ? trailReach1 : -trailReach1)) : portalX;
                            const t1EndY = isHoriz ? portalY : (portalY + trailReach1);
                            _drawLashTentacle(portalX, portalY, t1EndX, t1EndY, p * 0.85, 0.35);
                        }

                        // Segmented tentacle whipping across the lane
                        const curReach = reachMax * Math.sin(p * Math.PI * 0.5);
                        const curEndX = isHoriz ? (portalX + (sk.direction === 1 ? curReach : -curReach)) : portalX;
                        const curEndY = isHoriz ? portalY : (portalY + curReach);
                        _drawLashTentacle(portalX, portalY, curEndX, curEndY, p, 1.0);

                        // Shockwave ring and impact flash with spark bursts at tip when fully extended
                        if (p > 0.7) {
                            const swProg = Math.min(1, (p - 0.7) / 0.3);
                            const swR = 20 + swProg * 95;
                            ctx.save();
                            ctx.strokeStyle = `rgba(0, 229, 255, ${1.0 - swProg})`;
                            ctx.lineWidth = 4 * (1.0 - swProg) + 1.2;
                            ctx.beginPath();
                            ctx.arc(curEndX, curEndY, swR, 0, Math.PI * 2);
                            ctx.stroke();

                            ctx.strokeStyle = `rgba(255, 235, 255, ${1.0 - swProg})`;
                            ctx.lineWidth = 2 * (1.0 - swProg) + 0.8;
                            ctx.beginPath();
                            ctx.arc(curEndX, curEndY, swR * 0.65, 0, Math.PI * 2);
                            ctx.stroke();

                            ctx.fillStyle = `rgba(255, 255, 255, ${(1.0 - swProg) * 0.85})`;
                            ctx.beginPath();
                            ctx.arc(curEndX, curEndY, 45 * (1.0 - swProg), 0, Math.PI * 2);
                            ctx.fill();

                            // Spark particles bursting from whip tip
                            ctx.fillStyle = phasePal.rim;
                            for (let sp = 0; sp < 10; sp++) {
                                const spAng = (sp / 10) * Math.PI * 2 + now * 0.02;
                                const spDist = swProg * 75 * (0.6 + (sp % 3) * 0.2);
                                ctx.fillRect(curEndX + Math.cos(spAng) * spDist - 1.5, curEndY + Math.sin(spAng) * spDist - 1.5, 3, 3);
                            }
                            ctx.restore();
                        }
                    } else if (sk.phase === 'aftermath') {
                        const p = Math.min(1.0, sk.elapsed / 1.0);
                        const aFade = (1.0 - p);

                        // Portal smoothly closing
                        if (typeof _drawEgregorPortal === 'function') {
                            _drawEgregorPortal(portalX, portalY, 44 * aFade, now, aFade * 0.8, false);
                        }

                        // Retracting tentacle fading out during first 30% of aftermath
                        if (p < 0.32) {
                            const retProg = p / 0.32;
                            const retReach = reachMax * (1.0 - retProg);
                            const curEndX = isHoriz ? (portalX + (sk.direction === 1 ? retReach : -retReach)) : portalX;
                            const curEndY = isHoriz ? portalY : (portalY + retReach);
                            _drawLashTentacle(portalX, portalY, curEndX, curEndY, 1.0 - retProg, (1.0 - retProg) * 0.7);
                        }

                        // Scratch, tear marks and fading embers
                        ctx.save();
                        ctx.strokeStyle = `rgba(195, 120, 255, ${aFade * 0.8})`;
                        ctx.lineWidth = 2.8 * aFade + 0.6;
                        if (isHoriz) {
                            const startX = sk.direction === 1 ? 0 : 1280;
                            const endX = targetX;
                            ctx.beginPath(); ctx.moveTo(startX, portalY); ctx.lineTo(endX, portalY); ctx.stroke();

                            // Residual void particles along the lash scar
                            ctx.fillStyle = `rgba(255, 210, 250, ${aFade * 0.9})`;
                            for (let sp = 0; sp < 16; sp++) {
                                const sx = startX + (endX - startX) * ((sp * 0.0625 + now * 0.0003) % 1);
                                const sy = portalY + Math.sin(sp * 3.7 + now * 0.005) * 16 * aFade;
                                ctx.beginPath();
                                ctx.arc(sx, sy, 2.0 * aFade, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        } else {
                            ctx.beginPath(); ctx.moveTo(portalX, 0); ctx.lineTo(portalX, reachMax); ctx.stroke();

                            ctx.fillStyle = `rgba(255, 210, 250, ${aFade * 0.9})`;
                            for (let sp = 0; sp < 16; sp++) {
                                const sy = reachMax * ((sp * 0.0625 + now * 0.0003) % 1);
                                const sx = portalX + Math.sin(sp * 3.7 + now * 0.005) * 18 * aFade;
                                ctx.beginPath();
                                ctx.arc(sx, sy, 2.0 * aFade, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                        ctx.restore();
                    }
                } else if (sk.type === 'chorus') {
                    // Chorus: 10 living organic tentacles descending and slamming sequentially like a wave (NO flat ruler columns)
                    const curDef = ATTACK_DEFS[this.currentAttackId];
                    const pal = (typeof window !== 'undefined' && window.DuelFX) ? window.DuelFX.getPhasePalette(curDef ? curDef.phase : 2) : { base: '#3b1e6e', dark: '#170a36', rim: '#42f5cc', glow: phasePal.glow, sucker: '#8afce4' };
                    for (let l = 0; l < 10; l++) {
                        const { x: laneX, beat } = chorusLane(sk, l);
                        if (beat >= 0 && beat < 0.65) {
                            const p = beat / 0.65;
                            if (typeof window.buildOrganicTentacleSpine === 'function' && typeof window.drawOrganicTentacle === 'function') {
                                const sp = chorusSpine(sk, l);
                                window.drawOrganicTentacle(ctx, sp, {
                                    rootWidth: 36, tipWidth: 5, baseColor: pal.base, darkColor: pal.dark,
                                    rimColor: pal.rim, glowColor: pal.glow, suckerColor: pal.sucker,
                                    glow: 0.72, suckers: true, hooked: true, alpha: Math.min(1, (1 - p) * 1.8)
                                });
                            }
                            if (p >= 0.25 && p < 0.55 && typeof window !== 'undefined' && window.DuelFX) {
                                const sw = (p - 0.25) / 0.30;
                                window.DuelFX.drawShockwave(ctx, laneX, 668, 14 + sw * 46, 1 - sw, pal.rim, 2.8);
                            }
                        } else if (beat < 0 && beat > -0.45) {
                            const wp = 1 + beat / 0.45;
                            if (typeof _drawDangerZone === 'function') {
                                _drawDangerZone('strip', laneX, 16, 688, wp, 0.75, now, Math.PI * 0.5, 18, Math.PI, false, false);
                            }
                        }
                    }
                                } else if (sk.type === 'mind_link') {
                    const cycleDur = 3.0;
                    const p = (sk.elapsed % cycleDur);
                    const sCount = sk.starCount || 6;
                    const bx = bossPos ? bossPos.x : 640;
                    const by = bossPos ? bossPos.y : 130;

                    let orbitR = 80;
                    let starAlpha = 1.0;
                    let filamentAlpha = 0.0;
                    let pulseRingR = 0;

                    if (p < 0.5) {
                        orbitR = 80;
                        starAlpha = 0.7 + (p / 0.5) * 0.3;
                    } else if (p < 1.0) {
                        const f = (p - 0.5) / 0.5;
                        orbitR = 80 + f * 100;
                        starAlpha = 1.0;
                    } else if (p < 1.7) {
                        orbitR = 180;
                        const f = (p - 1.0) / 0.7;
                        filamentAlpha = f * 0.9;
                    } else if (p < 2.3) {
                        orbitR = 180;
                        filamentAlpha = 0.9;
                        pulseRingR = ((p - 1.7) / 0.6) * 55;
                    } else if (p < 2.7) {
                        orbitR = 180;
                        filamentAlpha = Math.max(0, 1.0 - (p - 2.3) / 0.4);
                        starAlpha = filamentAlpha;
                    } else {
                        orbitR = 180;
                        starAlpha = Math.max(0, 1.0 - (p - 2.7) / 0.3) * 0.4;
                    }

                    ctx.save();
                    for (let sIdx = 0; sIdx < sCount; sIdx++) {
                        const ang = (sIdx / sCount) * Math.PI * 2 + sk.elapsed;
                        const sx = bx + Math.cos(ang) * orbitR;
                        const sy = by + Math.sin(ang) * orbitR;

                        if (filamentAlpha > 0.01) {
                            ctx.save();
                            ctx.strokeStyle = '#ff3b56';
                            ctx.globalAlpha = filamentAlpha * 0.7;
                            ctx.lineWidth = 1.8;
                            ctx.beginPath();
                            ctx.moveTo(bx, by);
                            ctx.lineTo(sx, sy);
                            ctx.stroke();
                            ctx.restore();
                        }

                        if (pulseRingR > 1) {
                            ctx.save();
                            ctx.strokeStyle = '#ff6b8b';
                            ctx.globalAlpha = Math.max(0, 1.0 - pulseRingR / 55);
                            ctx.lineWidth = 2.0;
                            ctx.beginPath();
                            ctx.arc(sx, sy, pulseRingR, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.restore();
                        }

                        if (starAlpha > 0.01) {
                            ctx.save();
                            ctx.fillStyle = '#ff3b56';
                            ctx.globalAlpha = starAlpha;
                            if (typeof _egStar8 === 'function') {
                                ctx.beginPath();
                                _egStar8(sx, sy, 8, ang);
                                ctx.fill();
                            } else {
                                ctx.beginPath();
                                ctx.arc(sx, sy, 7, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            ctx.restore();
                        }
                    }
                    ctx.restore();
                } else if (sk.type === 'rift') {
                    if (sk.linked) continue;
                    const dur = sk.duration || 5.0;
                    const p = Math.min(1.0, sk.elapsed / dur);
                    const rx = sk.x || 640;
                    const ry = sk.y || 260;
                    const rw = sk.w || 200;
                    const lifeScale = p < 0.15 ? (p / 0.15) : (p > 0.85 ? (1.0 - p) / 0.15 : 1.0);
                    const rSprite = _getRiftSprite();

                    ctx.save();
                    ctx.translate(rx, ry);
                    ctx.globalAlpha = Math.max(0.05, lifeScale);

                    if (rSprite) {
                        const drawR = Math.min(rw * 0.68, 96) * (0.65 + 0.35 * lifeScale);
                        ctx.save();
                        ctx.rotate(now * 0.0014);
                        ctx.drawImage(rSprite, -drawR, -drawR, drawR * 2, drawR * 2);
                        ctx.restore();
                    }

                    const tearH = 96 * lifeScale;
                    ctx.strokeStyle = '#c45cff';
                    ctx.lineWidth = 6.5 * lifeScale;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    for (let seg = 0; seg <= 8; seg++) {
                        const ft = seg / 8;
                        const fy = -tearH * 0.5 + ft * tearH;
                        const fx = Math.sin(now * 0.015 + seg * 1.9) * 5.0 * Math.sin(ft * Math.PI);
                        if (seg === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
                    }
                    ctx.stroke();

                    ctx.strokeStyle = '#6cf4ff';
                    ctx.lineWidth = 2.2 * lifeScale;
                    ctx.stroke();
                    ctx.restore();
                } else if (sk.type === 'upheaval') {
                    // Dia Xuc Hat Thien (Earthen Tentacle Upheaval): erupts from bottom floor, hooks sideways, slams, retracts
                    const targets = sk.targets || [];
                    const curDef = ATTACK_DEFS[this.currentAttackId];
                    const phaseNum = curDef ? curDef.phase : 1;
                    const pal = (typeof window !== 'undefined' && window.DuelFX) ? window.DuelFX.getPhasePalette(phaseNum) : { base: '#1d5d66', dark: '#0a222b', rim: '#74f5ff', glow: '#42e8d4', sucker: '#a8f8ef' };
                    const tSec = now * 0.001;
                    const low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
                    const fo = window._fxOpts, glow = !fo || fo.glow !== false, parts = !fo || fo.particles !== false;
                    const floorY = sk.floorY || 720;

                    for (let ui = 0; ui < targets.length; ui++) {
                        const tgt = targets[ui];
                        const bx = tgt.x;
                        const by = floorY + 24;
                        const dir = tgt.dir || (ui % 2 === 0 ? 1 : -1);
                        const maxH = tgt.maxH || (floorY * 0.68);
                        const portalOpen = sk.phase === 'telegraph' ? Math.min(1, sk.elapsed / sk.telegraphDur) :
                            (sk.phase === 'aftermath' ? Math.max(0, 1 - sk.elapsed / sk.aftermathDur) : 1);
                        ctx.save(); ctx.globalAlpha = portalOpen * 0.8;
                        ctx.fillStyle = pal.dark; ctx.strokeStyle = pal.rim; ctx.lineWidth = 3;
                        ctx.beginPath(); ctx.ellipse(bx, floorY - 12, 52 * portalOpen, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        if (glow && !low) {
                            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.3; ctx.lineWidth = 9;
                            ctx.stroke();
                        }
                        ctx.restore();

                        if (sk.phase === 'telegraph') {
                            const prog = Math.min(1.0, sk.elapsed / Math.max(0.1, sk.telegraphDur || 1.05));
                            if (typeof _drawDangerZone === 'function') {
                                _drawDangerZone('tempest', bx, floorY - 36, 56, prog, 0.9, now, 0, 0, Math.PI * 2, true, false);
                            }
                            // Progressive glowing ground fissures cracking open before eruption
                            ctx.save();
                            ctx.strokeStyle = pal.rim;
                            ctx.globalAlpha = 0.35 + prog * 0.65;
                            ctx.lineWidth = 2.0 + prog * 1.6;
                            for (let f = -2; f <= 2; f++) {
                                const fx0 = bx + f * 12;
                                ctx.beginPath();
                                ctx.moveTo(fx0, floorY);
                                ctx.lineTo(fx0 + f * (10 + prog * 18), floorY - (14 + prog * 34));
                                ctx.stroke();
                            }
                            ctx.restore();
                        } else if (sk.phase === 'strike' || sk.phase === 'aftermath') {
                            const sProg = sk.phase === 'strike'
                                ? Math.min(1.0, sk.elapsed / Math.max(0.1, sk.strikeDur || 0.72))
                                : 1.0;
                            const fade = sk.phase === 'aftermath'
                                ? Math.max(0, 1.0 - sk.elapsed / Math.max(0.1, sk.aftermathDur || 0.55))
                                : 1.0;

                            const tip = sk.phase === 'strike' ? upheavalTip(sProg, dir, floorY, maxH)
                                : { dx: dir * 128 * fade, y: floorY - maxH * Math.max(0.08, fade) * 0.82 };
                            const tipX = bx + tip.dx, tipY = tip.y;
                            if (typeof window.buildOrganicTentacleSpine === 'function' && typeof window.drawOrganicTentacle === 'function') {
                                const sp = upheavalSpine(bx, floorY, tipX, tipY, dir, ui, sk.elapsed, sk.phase === 'strike');
                                window.drawOrganicTentacle(ctx, sp, {
                                    rootWidth: 58, tipWidth: 9, phase: phaseNum,
                                    baseColor: pal.dark, midColor: pal.base, rimColor: pal.rim, suckerColor: pal.sucker,
                                    suckers: !low, glow: glow ? 0.8 : 0, hooked: true, alpha: fade, subdiv: low ? 1 : 2
                                });
                            }

                            if (!low && glow && sk.phase === 'strike' && sProg > 0.38 && sProg < 0.78) {
                                ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = pal.glow; ctx.lineWidth = 22;
                                ctx.beginPath(); ctx.moveTo(tipX - dir * 45, tipY + 22); ctx.lineTo(tipX, tipY); ctx.stroke(); ctx.restore();
                            }
                            if (sk.phase === 'aftermath') window.DuelFX.drawShockwave(ctx, tipX, floorY - 22,
                                24 + sk.elapsed * 160, fade * 0.6, pal.sucker, 2.5);
                            // Floor shockwave + rising rock debris on eruption
                            if (sk.phase === 'strike' && sProg < 0.55 && typeof window !== 'undefined' && window.DuelFX) {
                                const swU = sProg / 0.55;
                                window.DuelFX.drawShockwave(ctx, bx, floorY - 18, 22 + swU * 96, (1 - swU) * 0.85, pal.rim, 3.8);
                                ctx.save();
                                ctx.fillStyle = pal.sucker;
                                for (let d = 0; parts && d < (low ? 4 : 12); d++) {
                                    const da = -Math.PI * (0.15 + (d / 7) * 0.70);
                                    const dist = 24 + swU * (95 + (d % 3) * 32);
                                    ctx.globalAlpha = (1 - swU) * 0.8;
                                    ctx.fillRect(bx + Math.cos(da) * dist, floorY - 12 + Math.sin(da) * dist, 5, 5);
                                }
                                ctx.restore();
                            }
                        }
                    }
                } else if (sk.type === 'eye_beams') {
                    // Eye Beams: sinuous sweeping organic tentacles curving from boss eyes with glowing tip & floor splash
                    const beams = sk.beams || [];
                    const isTelegraph = sk.phase === 'telegraph';
                    const isActive = sk.phase === 'active';
                    const isFade = sk.phase === 'fade';
                    const curDef = ATTACK_DEFS[this.currentAttackId];
                    const pal = (typeof window !== 'undefined' && window.DuelFX) ? window.DuelFX.getPhasePalette(curDef ? curDef.phase : 1) : { base: '#17545c', dark: '#09242e', rim: '#62ecff', glow: '#3ce0c8', sucker: phasePal.sucker };
                    const tSec = now * 0.001;

                    for (let b = 0; b < beams.length; b++) {
                        const bm = beams[b];
                        const ox = bm.originX, oy = bm.originY;
                        const tx = bm.targetX, ty = bm.targetY;
                        const bend = (b % 2 === 0 ? -1 : 1) * 68;

                        if (isTelegraph) {
                            const prog = Math.min(1.0, sk.elapsed / (sk.telegraphDur || 0.9));
                            ctx.save();
                            ctx.strokeStyle = 'rgba(255, 77, 109, ' + (0.28 + prog * 0.55) + ')';
                            ctx.lineWidth = 2.4;
                            ctx.setLineDash([10, 8]);
                            ctx.lineDashOffset = -now * 0.04;
                            ctx.beginPath();
                            ctx.moveTo(ox, oy);
                            ctx.quadraticCurveTo((ox + tx) * 0.5 + bend, (oy + ty) * 0.5, tx, ty);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            ctx.restore();
                            if (typeof _drawDangerZone === 'function') {
                                _drawDangerZone('circle', tx, ty, 44, prog, 0.8, now, 0, 0, Math.PI * 2, false, false);
                            }
                        } else if (isActive || isFade) {
                            const alpha = isFade ? Math.max(0, 1.0 - sk.elapsed / (sk.fadeDur || 0.3)) : 1.0;
                            const ext = isActive ? Math.min(1.0, sk.elapsed / 0.16) : 1.0;
                            if (typeof window !== 'undefined' && typeof window.buildOrganicTentacleSpine === 'function' && typeof window.drawOrganicTentacle === 'function') {
                                const sp = window.buildOrganicTentacleSpine(ox, oy, tx, ty, {
                                    joints: 18, time: tSec, waveAmp: 22, waveFreq: 2.3, waveSpeed: 5.8,
                                    phase: b * 1.5, bend: bend, reach: ext, curl: b % 2 === 0 ? 0.45 : -0.45
                                });
                                window.drawOrganicTentacle(ctx, sp, {
                                    rootWidth: 48, tipWidth: 8, phase: curDef ? curDef.phase : 1,
                                    glow: 0.85, suckers: true, hooked: true, alpha: alpha
                                });
                                if (ext >= 0.90 && typeof window.DuelFX === 'object') {
                                    const tipPt = sp[sp.length - 1];
                                    window.DuelFX.drawShockwave(ctx, tipPt.x, tipPt.y, 22 + (sk.elapsed * 85) % 44, alpha * 0.8, pal.rim, 3.0);
                                    ctx.save();
                                    ctx.globalCompositeOperation = 'lighter';
                                    ctx.fillStyle = pal.rim;
                                    for (let dp = 0; dp < 6; dp++) {
                                        const da = (dp / 6) * Math.PI * 2 + now * 0.008;
                                        const dr = 10 + ((sk.elapsed * 65 + dp * 7) % 34);
                                        ctx.globalAlpha = alpha * 0.55;
                                        ctx.beginPath();
                                        ctx.arc(tipPt.x + Math.cos(da) * dr, tipPt.y + Math.sin(da) * dr * 0.55, 2.4, 0, Math.PI * 2);
                                        ctx.fill();
                                    }
                                    ctx.restore();
                                }
                            }
                        }
                    }
                }
            }
            ctx.restore();
        }

        checkLaserCollisions(px, py, pradius = 5.75) {
            for (let i = 0; i < this.lasers.length; i++) {
                const l = this.lasers[i];
                if (l.state !== 'active') continue;
                const halfW = (l.width || 24) * 0.45;
                const dx = l.x1 - l.x0;
                const dy = l.y1 - l.y0;
                const lenSq = dx * dx + dy * dy;
                let t = 0;
                if (lenSq > 1e-6) {
                    t = Math.max(0, Math.min(1, ((px - l.x0) * dx + (py - l.y0) * dy) / lenSq));
                }
                const qx = l.x0 + t * dx;
                const qy = l.y0 + t * dy;
                const distSq = (px - qx) * (px - qx) + (py - qy) * (py - qy);
                const hitDist = halfW + pradius;
                if (distSq <= hitDist * hitDist) {
                    return true;
                }
            }
            return false;
        }

        checkSkillCollisions(px, py, pradius = 5.75) {
            for (let i = 0; i < this.skills.length; i++) {
                const sk = this.skills[i];
                if (sk.type === 'tempest' && sk.phase === 'strike') {
                    for (let t = 0; t < sk.targets.length; t++) {
                        const tgt = sk.targets[t];
                        const dx = px - tgt.x;
                        const dy = py - tgt.y;
                        if (dx * dx + dy * dy <= (100 + pradius) * (100 + pradius)) {
                            return { hit: true, cause: 'tempest' };
                        }
                    }
                } else if (sk.type === 'gap_bar' && sk.phase === 'sweep') {
                    const along = gapBarPos(sk, Math.min(1, sk.elapsed / sk.sweepDur));
                    const onBar = sk.axis === 'x' ? px : py, across = sk.axis === 'x' ? py : px;
                    const outside = sk.axis === 'x' && Number.isFinite(sk.safeX)
                        ? Math.abs(px - sk.safeX) > sk.safeSize * 0.5 - pradius
                        : Math.abs(across - sk.gap) > sk.gapW * 0.5 - pradius;
                    if (Math.abs(onBar - along) <= sk.thick * 0.5 + pradius && outside) {
                        return { hit: true, cause: 'gap_bar' };
                    }
                } else if (sk.type === 'crush_pillar' && (sk.phase === 'drop' || sk.phase === 'rest')) {
                    for (const col of sk.cols) {
                        if (Math.abs(px - col.x) <= sk.w * 0.5 + pradius * 0.5 && py - pradius <= pillarBottom(sk, col)) return { hit: true, cause: 'crush' };
                    }
                } else if (sk.type === 'null_slash' && sk.phase === 'striking') {
                    const sweep = nullSlashReach(sk);
                    const previous = nullSlashReach(sk, Math.min(sk.elapsed, sk.previousStrikeElapsed ?? sk.elapsed));
                    const dx = px - sk.originX, dy = py - sk.originY;
                    const relative = Math.atan2(Math.sin(Math.atan2(dy, dx) - sweep.angle), Math.cos(Math.atan2(dy, dx) - sweep.angle));
                    const displacement = previous.angle - sweep.angle;
                    const angle = sweep.angle + Math.max(Math.min(0, displacement), Math.min(Math.max(0, displacement), relative));
                    const radius = Math.max(sweep.radius, previous.radius);
                    const tipX = sk.originX + Math.cos(angle) * radius;
                    const tipY = sk.originY + Math.sin(angle) * radius;
                    if (_distToSegmentSq(px, py, sk.originX, sk.originY, tipX, tipY) <= (45 + pradius) ** 2) {
                        return { hit: true, cause: 'null_slash', isFatal: sk.isP3 };
                    }
                } else if (sk.type === 'chorus' && typeof window.checkOrganicTentacleCollision === 'function') {
                    for (let lane = 0; lane < 10; lane++) {
                        const { x, beat } = chorusLane(sk, lane);
                        if (beat < 0 || beat >= 0.54 || Math.abs(px - x) > 48) continue;
                        if (window.checkOrganicTentacleCollision(px, py, pradius, chorusSpine(sk, lane), { rootWidth: 36, tipWidth: 5 })) {
                            return { hit: true, cause: 'chorus' };
                        }
                    }
                } else if (sk.type === 'tendril_lash' && sk.phase === 'strike') {
                    if (sk.variant === 'vertical') {
                        const reach = (sk.reach || 720) * Math.sin(Math.min(1, sk.elapsed / 0.14) * Math.PI * 0.5);
                        if (_distToSegmentSq(px, py, sk.targetX, 0, sk.targetX, reach) <= (24 + pradius) ** 2) {
                            return { hit: true, cause: 'tendril_lash' };
                        }
                        continue;
                    }
                    // Capsules follow the locked quadratic tendril.
                    const sx = sk.originX !== undefined ? sk.originX : 640;
                    const sy = sk.originY !== undefined ? sk.originY : 130;
                    const ex = sk.targetX !== undefined ? sk.targetX : 640;
                    const ey = sk.targetY !== undefined ? sk.targetY : 660;
                    const cx = sk.ctrlX !== undefined ? sk.ctrlX : (sx + ex) * 0.5;
                    const cy = sk.ctrlY !== undefined ? sk.ctrlY : (sy + ey) * 0.5;
                    const p = Math.min(1.0, sk.elapsed / 0.20);
                    const reach = Math.sin(p * Math.PI * 0.5);
                    const segs = 6;
                    let prevX = sx, prevY = sy;
                    for (let k = 1; k <= segs; k++) {
                        const u = (k / segs) * reach;
                        const inv = 1 - u;
                        const qx = inv * inv * sx + 2 * inv * u * cx + u * u * ex;
                        const qy = inv * inv * sy + 2 * inv * u * cy + u * u * ey;
                        const halfW = Math.max(12, (1.0 - u * 0.58) * 26);
                        const hitR = halfW + pradius;
                        if (_distToSegmentSq(px, py, prevX, prevY, qx, qy) <= hitR * hitR) {
                            return { hit: true, cause: 'tendril_lash' };
                        }
                        prevX = qx;
                        prevY = qy;
                    }
                } else if (sk.type === 'upheaval' && sk.phase === 'strike') {
                    const targets = sk.targets || [];
                    const floorY = sk.floorY || 720;
                    const sProg = Math.min(1, sk.elapsed / Math.max(0.1, sk.strikeDur || 0.72));
                    for (let ui = 0; ui < targets.length; ui++) {
                        const tgt = targets[ui];
                        const bx = tgt.x;
                        const dir = tgt.dir || (ui % 2 === 0 ? 1 : -1);
                        const maxH = tgt.maxH || (floorY * 0.68);
                        if (Math.abs(px - bx) > 220) continue;
                        const tip = upheavalTip(sProg, dir, floorY, maxH);
                        const groundHit = (px - bx) ** 2 + (py - (floorY - 36)) ** 2 <= (56 + pradius) ** 2;
                        const spineHit = !groundHit && typeof window.checkOrganicTentacleCollision === 'function' &&
                            window.checkOrganicTentacleCollision(px, py, pradius,
                                upheavalSpine(bx, floorY, bx + tip.dx, tip.y, dir, ui, sk.elapsed, true),
                                { rootWidth: 58, tipWidth: 9 });
                        if (groundHit || spineHit) return { hit: true, cause: 'upheaval' };
                    }
                } else if (sk.type === 'eye_beams' && sk.phase === 'active') {
                    const beams = sk.beams || [];
                    for (let b = 0; b < beams.length; b++) {
                        const bm = beams[b];
                        const dx = bm.targetX - bm.originX;
                        const dy = bm.targetY - bm.originY;
                        const lenSq = dx * dx + dy * dy;
                        let t = 0;
                        if (lenSq > 1e-6) {
                            t = Math.max(0, Math.min(1, ((px - bm.originX) * dx + (py - bm.originY) * dy) / lenSq));
                        }
                        const qx = bm.originX + t * dx;
                        const qy = bm.originY + t * dy;
                        const distSq = (px - qx) * (px - qx) + (py - qy) * (py - qy);
                        const hitDist = 18 + pradius;
                        if (distSq <= hitDist * hitDist) {
                            return { hit: true, cause: 'eye_beams' };
                        }
                    }
                }
            }

            return null;
        }

        checkSlowAt(x, y) {
            for (let i = 0; i < this.slowZones.length; i++) {
                const sz = this.slowZones[i];
                if (sz.disabled) continue;
                if (sz.linked && Math.hypot(x - sz.x - sz.w * 0.5, y - sz.y - sz.h * 0.5) > sz.radius) continue;
                if (x >= sz.x && x <= sz.x + sz.w && y >= sz.y && y <= sz.y + sz.h) {
                    return sz.slowFactor || 0.20;
                }
            }
            return 0.0;
        }

        _bulletColor() {
            const phase = ATTACK_DEFS[this.currentAttackId].phase;
            return phase === 3 ? 'gold' : (phase === 2 ? 'hellrose' : 'ember');
        }

        _fireFan(sourceX, sourceY, baseAngle, count, spread, speed, options = {}) {
            const beat = Math.floor(this.scriptTime * 2.4);
            const rift = options.cause === 'rift';
            const aim = rift ? Math.atan2(this._lastPlayerY - sourceY, this._lastPlayerX - sourceX)
                : baseAngle + Math.sin(beat * 1.87) * 0.12;
            const step = spread / Math.max(1, count - 1);
            for (let i = 0; i < count; i++) {
                const locked = rift && i === Math.floor(count / 2);
                const angle = locked ? aim : aim - spread * 0.5 + i * step;
                const pace = locked ? speed : speed * (1 + 0.13 * Math.sin(i * 1.65 + beat));
                this._queueShot(sourceX, sourceY, Math.cos(angle) * pace, Math.sin(angle) * pace, {
                    ...options, angle, speed: pace, locked,
                    behavior: locked ? null : 'wave',
                    behaviorData: locked ? null : { freq: 2.2, amplitude: 10 + (i % 3) * 4 }
                });
            }
        }

        _fireRing(x, y, count, speed, angle = 0, options = {}) {
            for (let i = 0; i < count; i++) {
                if (i === Math.floor(count * 0.56)) continue;
                const a = angle + i * Math.PI * 2 / count;
                this._queueShot(x, y, Math.cos(a) * speed, Math.sin(a) * speed, {
                    ...options, speed, angle: a,
                    behavior: 'curve', behaviorData: { angularSpeed: i % 2 === 0 ? 0.14 : -0.12 }
                });
            }
        }

        // 18 ATTACK IMPLEMENTATIONS
        // Attack 1: Tendril Probe (P1: Tendril Lash slow + 1-point Tempest + small fans)
        _spawnUpheaval(variant, canvasW, canvasH, playerX) {
            const safePx = Math.max(120, Math.min(canvasW - 120, playerX || canvasW * 0.5));
            const targets = [];
            if (variant === 'single') {
                targets.push({ x: safePx, y: canvasH - 36, dir: safePx > canvasW * 0.5 ? -1 : 1, maxH: canvasH * 0.66 });
            } else if (variant === 'pincer') {
                targets.push({ x: Math.max(110, safePx - 140), y: canvasH - 36, dir: 1, maxH: canvasH * 0.64 });
                targets.push({ x: Math.min(canvasW - 110, safePx + 140), y: canvasH - 36, dir: -1, maxH: canvasH * 0.64 });
            } else if (variant === 'sweep_low') {
                targets.push({ x: Math.max(120, safePx - 160), y: canvasH - 36, dir: 1, maxH: canvasH * 0.48 });
                targets.push({ x: safePx, y: canvasH - 36, dir: safePx > canvasW * 0.5 ? -1 : 1, maxH: canvasH * 0.56 });
            } else {
                // triple_wave: 3 locked points including player position
                targets.push({ x: Math.max(110, safePx - 210), y: canvasH - 36, dir: 1, maxH: canvasH * 0.66 });
                targets.push({ x: safePx, y: canvasH - 36, dir: safePx > canvasW * 0.5 ? -1 : 1, maxH: canvasH * 0.72 });
                targets.push({ x: Math.min(canvasW - 110, safePx + 210), y: canvasH - 36, dir: -1, maxH: canvasH * 0.66 });
            }
            this.skills.push({
                type: 'upheaval',
                variant: variant,
                phase: 'telegraph',
                elapsed: 0,
                telegraphDur: 1.05,
                strikeDur: 0.72,
                aftermathDur: 0.55,
                targets: targets
            });
        }

        // A bar that sweeps the whole arena from one edge to the other. Only the gap is safe, and it is placed
        // a few hundred pixels from the ship so the ship has to move to reach it.
        _spawnGapBar(canvasW, canvasH, isHard, dir, axis, retry = false) {
            if (axis === 'x') {
                const size = isHard ? 150 : 170, telegraphDur = isHard ? 1.3 : 1.5;
                const px = Number.isFinite(this._lastPlayerX) ? this._lastPlayerX : canvasW / 2;
                const py = Number.isFinite(this._lastPlayerY) ? this._lastPlayerY : canvasH - 60;
                const maxDistance = Math.min(320, 8.6 * 1000 / 16.67 * 0.5 * (telegraphDur - 0.25));
                const lo = size / 2 + 40, hi = canvasW - size / 2 - 40, choices = [];
                for (const side of [-1, 1]) {
                    let ranges = [[Math.max(lo, side < 0 ? px - maxDistance : px + 200), Math.min(hi, side < 0 ? px - 200 : px + maxDistance)]];
                    for (const sk of this.skills) if (sk.type === 'crush_pillar' && sk.phase !== 'aftermath') {
                        for (const col of sk.cols) {
                            const a = col.x - sk.w / 2 - size / 2 - 8, b = col.x + sk.w / 2 + size / 2 + 8;
                            ranges = ranges.flatMap(([l, r]) => r <= a || l >= b ? [[l, r]] : [[l, Math.min(r, a)], [Math.max(l, b), r]]);
                        }
                    }
                    for (const [a, b] of ranges) if (b - a > 0.01) choices.push({ side, a, b, weight: (b - a) * (side === dir ? 1.4 : 1) });
                }
                if (!choices.length) {
                    if (!retry) (this.pendingSafeBars ||= []).push([canvasW, canvasH, isHard, dir, axis]);
                    return null;
                }
                const opposite = choices.filter(c => c.side !== this._lastSafeCellSide);
                const eligible = opposite.length && this._lastSafeCellSide ? opposite : choices;
                let roll = this.rng() * eligible.reduce((s, c) => s + c.weight, 0), pick = eligible.at(-1);
                for (const candidate of eligible) { roll -= candidate.weight; if (roll <= 0) { pick = candidate; break; } }
                const safeX = pick.a + this.rng() * (pick.b - pick.a);
                this._lastSafeCellSide = pick.side;
                const sk = { type: 'gap_bar', phase: 'telegraph', elapsed: 0, telegraphDur, sweepDur: 1.25,
                    aftermathDur: 0.35, safeX, safeY: py, safeSize: size, originShipX: px, maxDistance,
                    cellTop: Math.max(12, Math.min(canvasH - size - 12, py - size / 2)),
                    gap: py, gapW: size, thick: 54, dir, axis, canvasW, canvasH };
                this.skills.push(sk); this._sound('duel-safecell-lock', safeX, py);
                return sk;
            }
            const gapW = isHard ? 200 : 230;
            const across = axis === 'x' ? canvasH : canvasW;
            const margin = axis === 'x' ? 150 : 60;
            const ship = axis === 'x'
                ? (Number.isFinite(this._lastPlayerY) ? this._lastPlayerY : canvasH - 64)
                : (Number.isFinite(this._lastPlayerX) ? this._lastPlayerX : canvasW * 0.5);
            let side = ship < across * 0.5 ? 1 : -1;
            if (Math.random() < 0.25) side = -side;
            const gap = Math.max(gapW / 2 + margin, Math.min(across - gapW / 2 - (axis === 'x' ? 40 : margin), ship + side * (240 + Math.random() * 140)));
            this.skills.push({
                type: 'gap_bar', phase: 'telegraph', elapsed: 0, telegraphDur: isHard ? 1.3 : 1.5,
                sweepDur: axis === 'x' ? 1.25 : 1.05, aftermathDur: 0.35, gap, gapW, thick: 54, dir, axis, canvasW, canvasH
            });
        }

        // Stone pillars drop on the ship's column after a warning. Touching one costs a life.
        _spawnPillars(canvasW, canvasH, isHard, count, dir) {
            const px = Number.isFinite(this._lastPlayerX) ? this._lastPlayerX : canvasW * 0.5;
            const centre = pillarCenter(px, count, canvasW);
            const order = dir === -1 ? -1 : 1, stagger = count > 1 ? 0.2 : 0;
            const offsets = PILLAR_OFFSETS[count];
            this.skills.push({
                type: 'crush_pillar', phase: 'telegraph', elapsed: 0, telegraphDur: isHard ? 1.05 : 1.2, dropDur: 0.16,
                dropTotal: 0.16 + stagger * (count - 1), restDur: 0.85, aftermathDur: 0.5, w: 120, count,
                cols: offsets.map((offset, i) => ({ x: centre + offset, offset, delay: (order === 1 ? i : count - 1 - i) * stagger }))
            });
        }

        // A tentacle that drops from the top edge. With a sweep direction it moves sideways while it strikes.
        _makeVerticalLash(centreX, canvasW, telegraphDur, sweepDir) {
            const sweep = 380;
            const leftEnd = Math.max(80, Math.min(canvasW - 80 - sweep, centreX - sweep * 0.5));
            const baseX = sweepDir === 0 ? centreX : (sweepDir === 1 ? leftEnd : leftEnd + sweep);
            return {
                type: 'tendril_lash', variant: 'vertical', targetX: baseX, baseX, y: 0,
                sweepDir, sweep, strikeDur: sweepDir === 0 ? 0.25 : 0.7,
                telegraphDur: sweepDir === 0 ? telegraphDur : telegraphDur + 0.25, phase: 'telegraph', elapsed: 0
            };
        }

        // Starts the skills the plan lists for this attack when their time arrives
        _voidSkills(attackId, t, canvasW, canvasH, isHard) {
            const plan = VOID_PLAN[attackId];
            if (!plan) return;
            for (let i = 0; i < plan.length; i++) {
                const key = 'void' + attackId + '_' + i;
                if (t < plan[i].at || this.lastSpawnTimes[key]) continue;
                this.lastSpawnTimes[key] = true;
                if (plan[i].kind === 'bar') this._spawnGapBar(canvasW, canvasH, isHard, plan[i].dir, plan[i].axis);
                else this._spawnPillars(canvasW, canvasH, isHard, plan[i].count, plan[i].dir);
            }
        }

        // Repeats a ground upheaval every `cycle` seconds from `startT`, cycling through the given variants
        _scheduleUpheaval(key, t, startT, cycle, variants, canvasW, canvasH) {
            if (t < startT) return;
            const n = Math.floor((t - startT) / cycle);
            const done = typeof this.lastSpawnTimes[key] === 'number' ? this.lastSpawnTimes[key] : -1;
            if (n > done) {
                this.lastSpawnTimes[key] = n;
                this._spawnUpheaval(variants[n % variants.length], canvasW, canvasH, this._lastPlayerX);
            }
        }

        _updateAttack1(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;

            // 1. Boss-rooted targeted Tendril Lashes curving down through the player lane
            const pX = typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5;
            const pY = typeof this._lastPlayerY === 'number' ? this._lastPlayerY : canvasH - 64;
            if (t >= 0.6 && !this.lastSpawnTimes['att1_lash1']) {
                this.lastSpawnTimes['att1_lash1'] = true;
                this.skills.push({
                    type: 'tendril_lash',
                    variant: 'targeted',
                    originX: bossPos.x - 36,
                    originY: bossPos.y + 18,
                    ctrlX: (bossPos.x + pX) * 0.5 - 120,
                    ctrlY: (bossPos.y + pY) * 0.45,
                    targetX: pX,
                    targetY: pY,
                    telegraphDur: 0.9,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }
            if (t >= 8.0 && !this.lastSpawnTimes['att1_lash2']) {
                this.lastSpawnTimes['att1_lash2'] = true;
                this.skills.push({
                    type: 'tendril_lash',
                    variant: 'targeted',
                    originX: bossPos.x + 36,
                    originY: bossPos.y + 18,
                    ctrlX: (bossPos.x + pX) * 0.5 + 120,
                    ctrlY: (bossPos.y + pY) * 0.45,
                    targetX: pX,
                    targetY: pY,
                    telegraphDur: 0.9,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // 2. Psychic Tempest 1-point at t = 14.0s
            if (t >= 14.0 && !this.lastSpawnTimes['att1_tempest']) {
                this.lastSpawnTimes['att1_tempest'] = true;
                this.skills.push({
                    type: 'tempest',
                    targets: [{ x: canvasW * 0.45, y: 640 }],
                    telegraphDur: 1.2,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // 3. Gentle alternating curved kunai fans (steady cadence, no 1-second dead window)
            const fanCycle = 0.8;
            const tLeftLast = this.lastSpawnTimes['att1_fan_l'] || (0.3 - fanCycle);
            if (t - tLeftLast >= fanCycle) {
                this.lastSpawnTimes['att1_fan_l'] = t;
                const fanCount = isHard ? 3 : 2;
                const spread = (18 * Math.PI) / 180;
                const spd = 135 * speedScale;
                this._fireFan(bossPos.x - 30, bossPos.y, Math.PI * 0.5 + 0.12, fanCount, spread, spd, { style: 'kunai', colorKey: 'orange', radius: 5.0 });
            }
            const tRightLast = this.lastSpawnTimes['att1_fan_r'] || (0.7 - fanCycle);
            if (t - tRightLast >= fanCycle) {
                this.lastSpawnTimes['att1_fan_r'] = t;
                const fanCount = isHard ? 3 : 2;
                const spread = (18 * Math.PI) / 180;
                const spd = 135 * speedScale;
                this._fireFan(bossPos.x + 30, bossPos.y, Math.PI * 0.5 - 0.12, fanCount, spread, spd, { style: 'kunai', colorKey: 'orange', radius: 5.0 });
            }
        }

        // Attack 2: Locked Thought (P1: Psychic Tempest 1 then 2 points, 2 slow Eye Beams)
        _updateAttack2(dt, canvasW, canvasH, bossPos, playerX, playerY, speedScale, isHard) {
            const t = this.scriptTime;
            this._scheduleUpheaval('att2_up', t, 6.0, 9.0, ['single', 'pincer'], canvasW, canvasH);

            // Tempest at 0.3s, 10.0s, 22.0s, 34.0s
            const tempestCycle = 12.0;
            const tLastTemp = this.lastSpawnTimes['att2_temp'] || (0.3 - tempestCycle);
            if (t - tLastTemp >= tempestCycle) {
                this.lastSpawnTimes['att2_temp'] = t;
                const tgts = t < 15.0
                    ? [{ x: playerX, y: 640 }]
                    : [{ x: canvasW * 0.32, y: 640 }, { x: canvasW * 0.68, y: 640 }];
                this.skills.push({
                    type: 'tempest',
                    targets: tgts,
                    telegraphDur: 1.2,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // Eye Beams at t = 16.0s and t = 28.0s
            if ((t >= 16.0 && !this.lastSpawnTimes['att2_eye1']) || (t >= 28.0 && !this.lastSpawnTimes['att2_eye2'])) {
                if (t < 20.0) this.lastSpawnTimes['att2_eye1'] = true;
                else this.lastSpawnTimes['att2_eye2'] = true;
                this.lasers.push({
                    x0: bossPos.x - 22, y0: bossPos.y - 8,
                    x1: bossPos.x - 120, y1: 720,
                    width: 28, state: 'telegraph', elapsed: 0,
                    telegraphTime: 0.9, activeTime: 0.5, fadeTime: 0.3,
                    colorKey: 'yellow'
                });
                this.lasers.push({
                    x0: bossPos.x + 22, y0: bossPos.y - 8,
                    x1: bossPos.x + 120, y1: 720,
                    width: 28, state: 'telegraph', elapsed: 0,
                    telegraphTime: 0.9, activeTime: 0.5, fadeTime: 0.3,
                    colorKey: 'yellow'
                });
            }

            // Very few bullets: sparse guiding pellets (max 20 bullets)
            const cycle = 1.6;
            const tLast = this.lastSpawnTimes['att2_shot'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att2_shot'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 3 : 2, (18 * Math.PI) / 180, 130 * speedScale, { style: 'pellet', colorKey: 'violet', radius: 5.0 });
            }
        }

        // Attack 3: Eye Lines (P1: Eye Beams 2 eyes then 4 eyes, slow sweep)
        _updateAttack3(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._voidSkills(3, t, canvasW, canvasH, isHard);

            // Eye beams at t = 0.3s (2 eyes), 6.0s (4 eyes sweeping), 12.0s (4 eyes sweeping reverse)
            if (t >= 0.3 && !this.lastSpawnTimes['att3_beam1']) {
                this.lastSpawnTimes['att3_beam1'] = true;
                this.skills.push({
                    type: 'eye_beams',
                    eyeCount: 2,
                    phase: 'telegraph',
                    elapsed: 0,
                    telegraphDur: 0.9,
                    activeDur: 0.5,
                    fadeDur: 0.3,
                    duration: 1.7,
                    beams: [
                        { originX: bossPos.x - 28, originY: bossPos.y + 10, targetX: canvasW * 0.32, targetY: canvasH },
                        { originX: bossPos.x + 28, originY: bossPos.y + 10, targetX: canvasW * 0.68, targetY: canvasH }
                    ]
                });
            }
            if (t >= 6.0 && !this.lastSpawnTimes['att3_beam2']) {
                this.lastSpawnTimes['att3_beam2'] = true;
                const eyes = getEyeSources(bossPos.x, bossPos.y);
                this.skills.push({
                    type: 'eye_beams',
                    eyeCount: 4,
                    phase: 'telegraph',
                    elapsed: 0,
                    telegraphDur: 0.9,
                    activeDur: 0.5,
                    fadeDur: 0.3,
                    duration: 1.7,
                    sweep: true,
                    sweepDir: 1,
                    beams: eyes.map((e, idx) => ({
                        originX: e.x,
                        originY: e.y,
                        targetX: canvasW * (0.20 + idx * 0.20),
                        targetY: canvasH
                    }))
                });
            }
            if (t >= 12.0 && !this.lastSpawnTimes['att3_beam3']) {
                this.lastSpawnTimes['att3_beam3'] = true;
                const eyes = getEyeSources(bossPos.x, bossPos.y);
                this.skills.push({
                    type: 'eye_beams',
                    eyeCount: 4,
                    phase: 'telegraph',
                    elapsed: 0,
                    telegraphDur: 0.9,
                    activeDur: 0.5,
                    fadeDur: 0.3,
                    duration: 1.7,
                    sweep: true,
                    sweepDir: -1,
                    beams: eyes.map((e, idx) => ({
                        originX: e.x,
                        originY: e.y,
                        targetX: canvasW * (0.80 - idx * 0.20),
                        targetY: canvasH
                    }))
                });
            }

            // Warm crystal rings (max 24 bullets)
            const ringCycle = 1.8;
            const tLastRing = this.lastSpawnTimes['att3_ring'] || (0.3 - ringCycle);
            if (t - tLastRing >= ringCycle) {
                this.lastSpawnTimes['att3_ring'] = t;
                this._fireRing(bossPos.x, bossPos.y, isHard ? 10 : 8, 125 * speedScale, t * 0.3, { style: 'crystal', colorKey: 'yellow', radius: 5.5 });
            }
        }

        // Attack 4: Ripple of Dimensions (P1: Dimension Rift + Thought Spheres 110px)
        _updateAttack4(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._voidSkills(4, t, canvasW, canvasH, isHard);

            // A small sphere locks the ship position at script second 6.
            if (t >= 6.0 && !this.lastSpawnTimes['att4_cube']) {
                this.lastSpawnTimes['att4_cube'] = true;
                const aimX4 = Math.max(120, Math.min(canvasW - 120, typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5));
                this.thoughtCube.spawn(bossPos.x, bossPos.y + 40, aimX4, 110, 1);
            }

            // Gentle ripple rings from boss flank (max 35 bullets)
            const pulseCycle = 1.5;
            const tLastPulse = this.lastSpawnTimes['att4_pulse'] || (0.3 - pulseCycle);
            if (t - tLastPulse >= pulseCycle) {
                this.lastSpawnTimes['att4_pulse'] = t;
                this._fireFan(bossPos.x - 140, 160, Math.PI * 0.5, isHard ? 4 : 3, (28 * Math.PI) / 180, 130 * speedScale, { style: 'ball', colorKey: 'gold', radius: 5.5 });
                this._fireFan(bossPos.x + 140, 160, Math.PI * 0.5, isHard ? 4 : 3, (28 * Math.PI) / 180, 130 * speedScale, { style: 'ball', colorKey: 'gold', radius: 5.5 });
            }
        }

        // Attack 5: Whisper Rain (P1: Sparse curved bullet rain + 1 Tendril Lash)
        _updateAttack5(dt, canvasW, canvasH, speedScale, isHard) {
            const t = this.scriptTime;
            this._scheduleUpheaval('att5_up', t, 5.0, 9.0, ['pincer', 'single'], canvasW, canvasH);

            // Boss-rooted targeted Tendril Lash at t = 11.0s
            if (t >= 11.0 && !this.lastSpawnTimes['att5_lash']) {
                this.lastSpawnTimes['att5_lash'] = true;
                const pX5 = typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5;
                const pY5 = typeof this._lastPlayerY === 'number' ? this._lastPlayerY : canvasH - 64;
                const bPos5 = this._bossOrigin;
                this.skills.push({
                    type: 'tendril_lash',
                    variant: 'targeted',
                    originX: bPos5.x + 32,
                    originY: bPos5.y + 18,
                    ctrlX: (bPos5.x + pX5) * 0.5 + 130,
                    ctrlY: (bPos5.y + pY5) * 0.45,
                    targetX: pX5,
                    targetY: pY5,
                    telegraphDur: 0.9,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // Sparse curved rain with 160px+ safe lanes (max 40 bullets)
            const rainCycle = 1.1;
            const tLast = this.lastSpawnTimes['att5_rain'] || (0.3 - rainCycle);
            if (t - tLast >= rainCycle) {
                this.lastSpawnTimes['att5_rain'] = t;
                const dropCount = isHard ? 5 : 4;
                const step = canvasW / (dropCount + 1);
                for (let i = 1; i <= dropCount; i++) {
                    const rx = step * i + Math.sin(t * 1.8 + i) * 35;
                    this.pool.spawn(rx, -10, Math.sin(t + i) * 20, 140 * speedScale, {
                        style: 'ball',
                        colorKey: this._bulletColor(),
                        radius: 5.5,
                        angle: Math.PI * 0.5
                    });
                }
            }
        }

        // Attack 6: Mirror Mind (P1: Phantom mirror copy + mirror eye beams)
        _updateAttack6(dt, canvasW, canvasH, speedScale, isHard) {
            const t = this.scriptTime;

            // Mirror beams at t = 0.3s, 14.0s, 28.0s
            const beamCycle = 13.0;
            const tLastBeam = this.lastSpawnTimes['att6_beam'] || (0.3 - beamCycle);
            if (t - tLastBeam >= beamCycle) {
                this.lastSpawnTimes['att6_beam'] = t;
                this.lasers.push({
                    x0: canvasW * 0.35, y0: 130,
                    x1: canvasW * 0.25, y1: 720,
                    width: 32, state: 'telegraph', elapsed: 0,
                    telegraphTime: 0.9, activeTime: 0.5, fadeTime: 0.3,
                    colorKey: 'gold'
                });
                this.lasers.push({
                    x0: canvasW * 0.65, y0: 130,
                    x1: canvasW * 0.75, y1: 720,
                    width: 32, state: 'telegraph', elapsed: 0,
                    telegraphTime: 0.9, activeTime: 0.5, fadeTime: 0.3,
                    colorKey: 'gold'
                });
            }

            if (t >= 10 && !this.lastSpawnTimes.att6_slash) {
                this.lastSpawnTimes.att6_slash = true;
                this.skills.push({ type: 'null_slash', windupDur: 1.6, phase: 'charging', elapsed: 0 });
            }

            // Mirror pulse fans (max 36 bullets)
            const pulseCycle = 1.3;
            const tLastPulse = this.lastSpawnTimes['att6_pulse'] || (0.3 - pulseCycle);
            if (t - tLastPulse >= pulseCycle) {
                this.lastSpawnTimes['att6_pulse'] = t;
                this._fireFan(canvasW * 0.35, 130, Math.PI * 0.5, isHard ? 4 : 3, (24 * Math.PI) / 180, 135 * speedScale, { style: 'oval', colorKey: 'yellow', radius: 5.0 });
                this._fireFan(canvasW * 0.65, 130, Math.PI * 0.5, isHard ? 4 : 3, (24 * Math.PI) / 180, 135 * speedScale, { style: 'oval', colorKey: 'yellow', radius: 5.0 });
            }
        }

        // Attack 7: Ten Voices (P2: Chorus 10 tentacles sequential wave strikes)
        _updateAttack7(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._voidSkills(7, t, canvasW, canvasH, isHard);

            // Chorus sequential strikes
            if (t >= 0.3 && !this.lastSpawnTimes['att7_chorus']) {
                this.lastSpawnTimes['att7_chorus'] = true;
                this.skills.push({
                    type: 'chorus',
                    duration: 22.0,
                    elapsed: 0
                });
            }

            // Rhythmic tentacle slams every 2.0s
            const slamCycle = 2.2;
            const tLastSlam = this.lastSpawnTimes['att7_slam'] || (0.3 - slamCycle);
            if (t - tLastSlam >= slamCycle) {
                this.lastSpawnTimes['att7_slam'] = t;
                const laneX = canvasW * (0.15 + ((t * 0.3) % 0.7));
                // The slams alternate between dropping straight down, combing left to right and combing right to left
                const mode = Math.round((t - 0.3) / slamCycle) % 3;
                this.skills.push(this._makeVerticalLash(laneX, canvasW, 0.7, mode === 1 ? 1 : mode === 2 ? -1 : 0));
            }

            // Low-density wave motes (max 28 bullets)
            const waveCycle = 1.4;
            const tLastWave = this.lastSpawnTimes['att7_wave'] || (0.3 - waveCycle);
            if (t - tLastWave >= waveCycle) {
                this.lastSpawnTimes['att7_wave'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 4 : 3, (26 * Math.PI) / 180, 140 * speedScale, { style: 'ball', colorKey: 'violet', radius: 5.5 });
            }
        }

        // Attack 8: Collective Mind (P2: Tendril Lash + 2-pt Tempest + Thought Spheres 150px)
        _updateAttack8(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._scheduleUpheaval('att8_up', t, 4.0, 10.0, ['triple_wave', 'single', 'pincer'], canvasW, canvasH);

            // A medium sphere locks the ship position at script second 10.
            if (t >= 10.0 && !this.lastSpawnTimes['att8_cube']) {
                this.lastSpawnTimes['att8_cube'] = true;
                const aimX8 = Math.max(130, Math.min(canvasW - 130, typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5));
                this.thoughtCube.spawn(bossPos.x, bossPos.y + 40, aimX8, 145, 2);
            }

            // Tempest at t = 0.3s, 22.0s, 38.0s
            const tempCycle = 16.0;
            const tLastTemp = this.lastSpawnTimes['att8_temp'] || (0.3 - tempCycle);
            if (t - tLastTemp >= tempCycle) {
                this.lastSpawnTimes['att8_temp'] = t;
                this.skills.push({
                    type: 'tempest',
                    targets: [{ x: canvasW * 0.34, y: 640 }, { x: canvasW * 0.66, y: 640 }],
                    telegraphDur: 1.2,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // Tendril Lash at t = 6.0s and t = 28.0s
            if ((t >= 6.0 && !this.lastSpawnTimes['att8_lash1']) || (t >= 28.0 && !this.lastSpawnTimes['att8_lash2'])) {
                const first = t < 20.0;
                if (first) this.lastSpawnTimes['att8_lash1'] = true;
                else this.lastSpawnTimes['att8_lash2'] = true;
                const pX8 = typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5;
                const pY8 = typeof this._lastPlayerY === 'number' ? this._lastPlayerY : canvasH - 64;
                const side8 = first ? -1 : 1;
                this.skills.push({
                    type: 'tendril_lash',
                    variant: 'targeted',
                    originX: bossPos.x + side8 * 36,
                    originY: bossPos.y + 18,
                    ctrlX: (bossPos.x + pX8) * 0.5 + side8 * 120,
                    ctrlY: (bossPos.y + pY8) * 0.45,
                    targetX: pX8,
                    targetY: pY8,
                    telegraphDur: 0.9,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // Regular guiding bullets (max 45 bullets)
            const fanCycle = 1.3;
            const tLastFan = this.lastSpawnTimes['att8_fan'] || (0.3 - fanCycle);
            if (t - tLastFan >= fanCycle) {
                this.lastSpawnTimes['att8_fan'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 5 : 4, (28 * Math.PI) / 180, 145 * speedScale, { style: 'oval', colorKey: 'violet', radius: 5.0 });
            }
        }

        // Attack 9: Null Prelude (P2: Null Slash 3s charge + Boon/Bane hex shield)
        _updateAttack9(dt, canvasW, canvasH, speedScale, isHard) {
            const t = this.scriptTime;
            this._voidSkills(9, t, canvasW, canvasH, isHard);

            // Null Slash at t = 0.3s and t = 13.0s
            const slashCycle = 12.0;
            const tLastSlash = this.lastSpawnTimes['att9_slash'] || (0.3 - slashCycle);
            if (t - tLastSlash >= slashCycle) {
                this.lastSpawnTimes['att9_slash'] = t;
                this.skills.push({
                    type: 'null_slash',
                    originX: canvasW * 0.5,
                    originY: 130,
                    targetX: canvasW * 0.5,
                    targetY: 640,
                    angle: Math.PI * 0.5,
                    radius: 460,
                    windupDur: 3.0,
                    hasHexShield: true,
                    selfDamage: 60,
                    isP3: false,
                    phase: 'charging',
                    elapsed: 0
                });
            }

            // Light bullet curtain (max 30 bullets)
            const fanCycle = 1.4;
            const tLastFan = this.lastSpawnTimes['att9_fan'] || (0.3 - fanCycle);
            if (t - tLastFan >= fanCycle) {
                this.lastSpawnTimes['att9_fan'] = t;
                this._fireFan(canvasW * 0.5, 130, Math.PI * 0.5, isHard ? 4 : 3, (24 * Math.PI) / 180, 130 * speedScale, { style: 'ball', colorKey: 'yellow', radius: 5.5 });
            }
        }

        // Attack 10: Null Slash (P2: Four consecutive Null Slashes with accelerating cadence)
        _updateAttack10(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;

            // 4 Slashes at t = 0.3s, 12.0s, 24.0s, 36.0s
            const slashCadence = [
                { t: 0.3, dur: 2.2, x: canvasW * 0.4 },
                { t: 12.0, dur: 1.8, x: canvasW * 0.6 },
                { t: 24.0, dur: 1.5, x: canvasW * 0.35 },
                { t: 36.0, dur: 1.2, x: canvasW * 0.65 }
            ];

            for (let i = 0; i < slashCadence.length; i++) {
                const sc = slashCadence[i];
                if (t >= sc.t && !this.lastSpawnTimes['att10_s' + i]) {
                    this.lastSpawnTimes['att10_s' + i] = true;
                    this.skills.push({
                        type: 'null_slash',
                        originX: bossPos.x,
                        originY: bossPos.y,
                        targetX: sc.x,
                        targetY: 640,
                        angle: Math.atan2(640 - bossPos.y, sc.x - bossPos.x),
                        radius: 440,
                        windupDur: sc.dur,
                        hasHexShield: false,
                        selfDamage: 0,
                        isP3: false,
                        phase: 'charging',
                        elapsed: 0
                    });
                }
            }

            // Curved motes (max 35 bullets)
            const cycle = 1.4;
            const tLast = this.lastSpawnTimes['att10_bullet'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att10_bullet'] = t;
                this._fireRing(bossPos.x, bossPos.y, isHard ? 10 : 8, 125 * speedScale, t * 0.4, { style: 'pellet', colorKey: 'violet', radius: 5.0 });
            }
        }

        // Attack 11: Mind Link Pulse (P2: 6 rage stars orbit boss then pulse outward with connecting rays)
        _updateAttack11(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._voidSkills(11, t, canvasW, canvasH, isHard);

            // Mind link pulses at t = 0.3s and t = 12.0s
            if (t >= 0.3 && !this.lastSpawnTimes['att11_link']) {
                this.lastSpawnTimes['att11_link'] = true;
                this.skills.push({
                    type: 'mind_link',
                    starCount: 6,
                    duration: 22.0,
                    elapsed: 0
                });
            }

            // Expanding rage pulse fans (max 40 bullets)
            const cycle = 1.35;
            const tLast = this.lastSpawnTimes['att11_fan'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att11_fan'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 5 : 4, (30 * Math.PI) / 180, 140 * speedScale, { style: 'star', colorKey: 'crimson', radius: 6.0 });
            }
        }

        // Attack 12: Boon and Bane (P2: Hex shield absorbs bullets, self-damage, 2-pt Tempest)
        _updateAttack12(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._scheduleUpheaval('att12_up', t, 5.0, 10.0, ['sweep_low', 'pincer', 'triple_wave'], canvasW, canvasH);

            // Null Slash with Hex Shield at t = 0.3s and t = 26.0s
            const slashCycle = 24.0;
            const tLastSlash = this.lastSpawnTimes['att12_slash'] || (0.3 - slashCycle);
            if (t - tLastSlash >= slashCycle) {
                this.lastSpawnTimes['att12_slash'] = t;
                this.skills.push({
                    type: 'null_slash',
                    originX: bossPos.x,
                    originY: bossPos.y,
                    targetX: canvasW * 0.5,
                    targetY: 640,
                    angle: Math.PI * 0.5,
                    radius: 460,
                    windupDur: 2.4,
                    hasHexShield: true,
                    selfDamage: 120,
                    isP3: false,
                    phase: 'charging',
                    elapsed: 0
                });
            }

            // Tempest at t = 14.0s and t = 38.0s
            if ((t >= 14.0 && !this.lastSpawnTimes['att12_tmp1']) || (t >= 38.0 && !this.lastSpawnTimes['att12_tmp2'])) {
                if (t < 25.0) this.lastSpawnTimes['att12_tmp1'] = true;
                else this.lastSpawnTimes['att12_tmp2'] = true;
                this.skills.push({
                    type: 'tempest',
                    targets: [{ x: canvasW * 0.35, y: 640 }, { x: canvasW * 0.65, y: 640 }],
                    telegraphDur: 1.2,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // Balanced bullet fill (max 42 bullets)
            const cycle = 1.3;
            const tLast = this.lastSpawnTimes['att12_bullet'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att12_bullet'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 5 : 4, (26 * Math.PI) / 180, 140 * speedScale, { style: 'crystal', colorKey: 'gold', radius: 5.5 });
            }
        }

        // Interference rings share a moving opening at the ship's row.
        _dimensionLaneAt(time) {
            const d = this.dimension;
            return d ? d.width * (0.5 + 0.18 * Math.sin(time * 0.26)) : this.anchorX;
        }

        _spawnPatternBullet(x, y, vx, vy, options = {}) {
            const d = this.currentAttackId === 13 ? this.dimension : null;
            if (!d) return this.pool.spawn(x, y, vx, vy, options);
            if (this.pool.activeCount + d.transits.length >= 56) return null;
            // The opening is composed at launch; bullets retain their velocity in flight.
            if (options.protectLane) {
                const band = (options.radius || 4.5) + 7.75, lifetime = options.maxAge || 6;
                const eta = Math.abs(vy) > 1 ? (d.shipY - y) / (vy * 1.1) : 0;
                const half = Math.abs(vy) > 1 ? band / Math.abs(vy * 1.1) : lifetime;
                const start = Math.max(0, eta - half), end = Math.min(lifetime, eta + half);
                if (Math.abs(vy) > 1 || Math.abs(y - d.shipY) <= band) {
                    const sway = options.behaviorData?.amplitude || 0;
                    for (let age = start; age <= end; age += 1 / 120) {
                        const atX = x + vx * 1.1 * age;
                        if (Math.abs(atX - this._dimensionLaneAt(this.elapsed + age)) < 92 + sway * 2) return null;
                    }
                }
            }
            return this.pool.spawn(x, y, vx, vy, options);
        }

        clearDimensionBreak() {
            if (this.dimension || this.currentAttackId === 13) {
                if (this.emissions) this.emissions.length = 0;
                if (this.cues) this.cues.length = 0;
                this.bossCue = null;
                if (this.thoughtCube) this.thoughtCube.active = false;
                if (this.thoughtCube2) this.thoughtCube2.active = false;
            }
            if (this.dimension) this.dimension.transits.length = 0;
            this.dimension = null;
            if (this.pool) this.pool.portalController = null;
            if (this.skills) this.skills = this.skills.filter(sk => !sk.linked);
            if (this.slowZones) this.slowZones = this.slowZones.filter(z => !z.linked);
        }

        _portalSound(key, x, y) {
            const d = this.dimension;
            if (this.elapsed - (d.soundAt[key] ?? -1) < 0.08 - 1e-6) return;
            d.soundAt[key] = this.elapsed;
            this._sound(key, x, y);
        }

        capturePortalBullet(b, previousX, previousY) {
            const d = this.dimension;
            if (!d || b.portalHops || d.sliding || this.elapsed - d.openedAt < 0.9) return false;
            for (let i = 0; i < 2; i++) {
                const p = d.portals[i];
                if (Math.hypot(previousX - p.x, previousY - p.y) <= 56) continue;
                if (_distToSegmentSq(p.x, p.y, previousX, previousY, b.x, b.y) > 56 * 56) continue;
                const target = d.portals[1 - i];
                const aim = Math.atan2(d.shipY - target.y, this._lastPlayerX - target.x);
                const angle = aim + b.portalFanOffset;
                d.transits.push({ from: i, to: 1 - i, remaining: 0.35, duration: 0.35,
                    capturedAt: this.elapsed, speed: Math.hypot(b.vx, b.vy), angle,
                    targetX: this._lastPlayerX, targetY: d.shipY, fanOffset: b.portalFanOffset,
                    options: { style: b.style, colorKey: b.colorKey, radius: b.radius,
                        maxAge: Math.max(0.1, b.maxAge - b.age), portalHops: 1,
                        cause: b.cause, behavior: b.behavior,
                        behaviorData: b.behaviorData ? { ...b.behaviorData } : null } });
                b.active = false; this.pool.activeCount--;
                this._portalSound('duel-portal-swallow', p.x, p.y);
                return true;
            }
            return false;
        }

        _updateDimensionPortals(dt, canvasW, canvasH, playerX, playerY) {
            const d = this.dimension, t = this.scriptTime;
            d.shipY = playerY; d.sliding = false;
            const period = this.difficulty === 'hard' ? 4.2 : 5;
            let swapped = false, progress = 0, warning = false;
            for (let at = 8; at + 2.3 <= 18; at += period) {
                if (t >= at && t < at + 1.2) warning = true;
                if (t >= at + 1.2 && t < at + 2.3) {
                    d.sliding = true; progress = smoothstep((t - at - 1.2) / 1.1);
                } else if (t >= at + 2.3) swapped = !swapped;
            }
            if (warning && !d.warning) { d.warnStart = this.elapsed; this._sound('duel-portal-swap-warn', canvasW / 2, canvasH * 0.42); }
            if (d.sliding && !d.wasSliding) this._sound('duel-portal-swap', canvasW / 2, canvasH * 0.42);
            d.warning = warning; d.wasSliding = d.sliding;
            for (let i = 0; i < 2; i++) {
                const p = d.portals[i], left = (i === 0) !== swapped;
                const start = canvasW * (left ? 0.25 : 0.75), end = canvasW - start;
                p.x = t >= 18 ? canvasW * (i === 0 ? 0.3 : 0.7) : start + (end - start) * progress;
                p.y = canvasH * 0.42 + (t >= 18 ? (i === 0 ? -35 : 35) : 0);
                p.warning = warning;
                const z = d.zones[i]; z.x = p.x - 56; z.y = p.y - 56; z.disabled = d.sliding;
            }
            for (let i = d.transits.length - 1; i >= 0; i--) {
                const q = d.transits[i]; q.remaining -= dt;
                if (q.remaining > 1e-7) continue;
                const p = d.portals[q.to];
                q.angle = Math.atan2(q.targetY - p.y, q.targetX - p.x) + q.fanOffset;
                const ux = Math.cos(q.angle), uy = Math.sin(q.angle);
                const x = p.x + ux * 58, y = p.y + uy * 58;
                // A transit is consumed even when capacity or spawn clearance rejects it.
                d.transits.splice(i, 1);
                if (Math.hypot(x - playerX, y - playerY) < 90) continue;
                const b = this._spawnPatternBullet(x, y, ux * q.speed, uy * q.speed, { ...q.options, angle: q.angle, speed: q.speed });
                if (b) this._portalSound('duel-portal-emit', x, y);
            }
        }

        _dimensionRing(portal, count, speed, gap) {
            const d = this.dimension;
            const eta = Math.max(0, (d.shipY - portal.y) / (speed * 1.1));
            const lane = this._dimensionLaneAt(this.elapsed + eta);
            const aim = Math.atan2(d.shipY - portal.y, lane - portal.x);
            for (let i = 0; i < count; i++) {
                const a = aim + gap / 2 + i * (Math.PI * 2 - gap) / Math.max(1, gap > 0 ? count - 1 : count);
                this._spawnPatternBullet(portal.x, portal.y, Math.cos(a) * speed, Math.sin(a) * speed,
                    { style: 'void_shard', colorKey: 'hellrose', radius: 4.5, maxAge: 6, cause: 'rift', angle: a, protectLane: true });
            }
        }

        renderLinkedPortals(ctx) {
            if (!this.dimension) return;
            const now = performance.now();
            for (const portal of this.dimension.portals) this._renderLinkedPortal(ctx, portal, now);
        }

        _renderLinkedPortal(ctx, sk, now) {
            const d = this.dimension;
            if (!d) return;
            const low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
            const fo = window._fxOpts || {}, open = Math.min(1, Math.max(0, (this.elapsed - d.openedAt) / 0.9));
            const color = sk.warning ? '#ff805d' : '#c45cff';
            if (typeof _drawDangerZone === 'function' && open >= 1) {
                const slot = d.portals.indexOf(sk), held = d.transits.filter(q => q.to === slot);
                if (held.length) {
                    let lo = Infinity, hi = -Infinity, remaining = 0.35;
                    for (const q of held) { lo = Math.min(lo, q.fanOffset); hi = Math.max(hi, q.fanOffset); remaining = Math.min(remaining, q.remaining); }
                    const centre = Math.atan2(held[0].targetY - sk.y, held[0].targetX - sk.x) + (lo + hi) / 2;
                    const reach = Math.min(620, Math.hypot(held[0].targetX - sk.x, held[0].targetY - sk.y) + 140);
                    _drawDangerZone('sector', sk.x, sk.y, reach, 1 - remaining / 0.35, 0.6, now, centre, 0, Math.max(0.24, hi - lo + 0.3), false, false);
                }
                if (sk.warning && Number.isFinite(d.warnStart)) _drawDangerZone('circle', sk.x, sk.y, 78, (this.elapsed - d.warnStart) / 1.2, 0.7, now, 0, 0, Math.PI * 2, false, false);
            }
            ctx.save(); ctx.globalAlpha = open; ctx.strokeStyle = color; ctx.lineWidth = 2;
            if (sk === d.portals[0] && !low && fo.trails !== false) {
                const a = d.portals[0], b = d.portals[1];
                ctx.globalAlpha = 0.15 + Math.min(0.35, d.transits.length * 0.035) * (fo.reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(now * 0.014));
                ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
            ctx.globalAlpha = open;
            const shake = sk.warning && !fo.reducedMotion ? Math.sin(now * 0.055) * 3 : 0;
            ctx.translate(sk.x + shake, sk.y);
            const sprite = _getRiftSprite();
            if (sprite && fo.glow !== false) ctx.drawImage(sprite, -76 * open, -76 * open, 152 * open, 152 * open);
            ctx.fillStyle = 'rgba(14, 5, 32, 0.82)'; ctx.beginPath(); ctx.arc(0, 0, 30 * open, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.arc(0, 0, 56 * open, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, 30 * open, 0, Math.PI * 2); ctx.stroke();
            const ticks = low ? 6 : 12;
            for (let k = 0; k < ticks; k++) {
                const a = k * Math.PI * 2 / ticks, r = 48 * open;
                ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5)); ctx.stroke();
            }
            const index = d.portals.indexOf(sk), incoming = d.transits.filter(q => q.to === index);
            if (incoming.length) {
                const remaining = Math.min(...incoming.map(q => q.remaining));
                const r = 28 + 17 * Math.max(0, remaining / 0.35);
                ctx.strokeStyle = '#f9d5ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
                if (!low && fo.particles !== false) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke(); }
                const shot = incoming[0], aim = Math.atan2(shot.targetY - sk.y, shot.targetX - sk.x) + shot.fanOffset;
                ctx.globalAlpha = 0.85; ctx.strokeStyle = '#f9d5ff'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(Math.cos(aim) * 58, Math.sin(aim) * 58); ctx.lineTo(Math.cos(aim) * (low ? 88 : 122), Math.sin(aim) * (low ? 88 : 122)); ctx.stroke();
            }
            ctx.restore();
        }

        // Attack 13 opens linked rifts, exchanges their positions, then crosses their rings.
        _updateAttack13(dt, canvasW, canvasH, rift1X, rift2X, bossY, speedScale, isHard) {
            const t = this.scriptTime;

            // Two spheres launch from the boss at script second 9.
            if (t >= 9.0 && !this.lastSpawnTimes['att13_cubes']) {
                this.lastSpawnTimes['att13_cubes'] = true;
                const aimX13 = Math.max(180, Math.min(canvasW - 180, typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5));
                this.thoughtCube.spawn(rift1X, 190, Math.max(120, aimX13 - 90), 130, 2);
                this.thoughtCube2.spawn(rift2X, 190, Math.min(canvasW - 120, aimX13 + 120), 130, 2);
            }

            // Circular slow fields share the portals' capture radius and position.
            if (t >= 0.3 && !this.lastSpawnTimes['att13_rifts']) {
                this.lastSpawnTimes['att13_rifts'] = true;
                const portals = [rift1X, rift2X].map(x => ({ type: 'rift', linked: true, x, y: canvasH * 0.42, w: 112, h: 112, duration: 29.7, elapsed: 0 }));
                const zones = portals.map(p => ({ x: p.x - 56, y: p.y - 56, w: 112, h: 112, radius: 56, linked: true, age: 0, maxAge: 30, slowFactor: 0.35 }));
                this.dimension = { portals, zones, transits: [], width: canvasW, shipY: this._lastPlayerY,
                    openedAt: this.elapsed, soundAt: {}, warning: false, sliding: false };
                this.skills.push(...portals); this.slowZones.push(...zones); this.pool.portalController = this;
            }

            const d = this.dimension;
            if (!d) return;
            const cycle = 2;
            const tLast = this.lastSpawnTimes['att13_pulse'] ?? -0.5;
            if (t < 18 && t - tLast >= cycle && !d.sliding && !d.warning) {
                const index = (this.lastSpawnTimes.att13_side || 0) % 2;
                const p = d.portals[index], boss = this._bossOrigin;
                const aim = Math.atan2(p.y - boss.y, p.x - boss.x), count = isHard ? 6 : 5;
                const speed = Math.min(320, Math.hypot(p.x - boss.x, p.y - boss.y) / 0.9) * speedScale;
                const flight = Math.hypot(p.x - boss.x, p.y - boss.y) / (speed * 1.1) + 0.25;
                const swapPeriod = isHard ? 4.2 : 5;
                let flightClear = true;
                for (let at = 8; at + 2.3 <= 18; at += swapPeriod) {
                    if (t < at + 1.2 && t + flight >= at + 1.2) flightClear = false;
                }
                if (flightClear) {
                    this.lastSpawnTimes['att13_pulse'] = t; this.lastSpawnTimes.att13_side = index + 1;
                    for (let i = 0; i < count; i++) {
                        const offset = i === Math.floor(count / 2) ? 0 : (i / (count - 1) - 0.5) * 0.16;
                        const a = aim + offset;
                        this._queueShot(boss.x, boss.y, Math.cos(a) * speed, Math.sin(a) * speed,
                            { style: 'void_shard', radius: 4.5, portalFeed: true, portalFanOffset: a - aim, locked: true, maxAge: 6 });
                    }
                }
            }
            if (t >= 8 && t < 18 && t - (this.lastSpawnTimes.att13_ring ?? 4) >= 4) {
                this.lastSpawnTimes.att13_ring = t;
                this._dimensionRing(d.portals[Math.floor(t / 4) % 2], 8, 95, 0);
            }
            if (t >= 18) {
                const gap = (isHard ? 32 : 38) * Math.PI / 180, period = isHard ? 2.8 : 3.2;
                const last = this.lastSpawnTimes.att13_cross ?? (18.6 - period);
                if (t - last >= period) {
                    this.lastSpawnTimes.att13_cross = t;
                    this._sound('duel-portal-cross', canvasW / 2, canvasH * 0.42);
                    for (const p of d.portals) this._dimensionRing(p, 14, 230 * speedScale, gap);
                }
            }
        }

        // Attack 14: Overmind Chorus (P3: Accelerated Chorus + 3-point Psychic Tempest)
        _updateAttack14(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;

            // Chorus wave at 0.3s
            if (t >= 0.3 && !this.lastSpawnTimes['att14_chorus']) {
                this.lastSpawnTimes['att14_chorus'] = true;
                this.skills.push({ type: 'chorus', duration: 23.0, elapsed: 0 });
            }

            // 3-point Tempest at t = 10.0s
            if (t >= 10.0 && !this.lastSpawnTimes['att14_temp']) {
                this.lastSpawnTimes['att14_temp'] = true;
                this.skills.push({
                    type: 'tempest',
                    targets: [{ x: canvasW * 0.25, y: 640 }, { x: canvasW * 0.50, y: 640 }, { x: canvasW * 0.75, y: 640 }],
                    telegraphDur: 1.0,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // Light cadence shots (max 40 bullets)
            const cycle = 1.3;
            const tLast = this.lastSpawnTimes['att14_fan'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att14_fan'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 5 : 4, (28 * Math.PI) / 180, 145 * speedScale, { style: 'kunai', colorKey: 'crimson', radius: 5.0 });
            }
        }

        // Attack 15: Psychic Tempest Maelstrom (P3: Cascading 3-pt Tempest strikes, rapid cadence)
        _updateAttack15(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._voidSkills(15, t, canvasW, canvasH, isHard);
            this._scheduleUpheaval('att15_up', t, 4.0, 9.0, ['triple_wave', 'pincer', 'sweep_low'], canvasW, canvasH);

            // Cascading Tempest at t = 0.3s, 12.0s, 24.0s, 36.0s
            const cycle = 12.0;
            const tLast = this.lastSpawnTimes['att15_temp'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att15_temp'] = t;
                const offset = (t * 0.2) % 0.3;
                this.skills.push({
                    type: 'tempest',
                    targets: [
                        { x: canvasW * (0.2 + offset), y: 640 },
                        { x: canvasW * (0.5 + offset * 0.5), y: 640 },
                        { x: canvasW * (0.8 - offset), y: 640 }
                    ],
                    telegraphDur: 0.9,
                    phase: 'telegraph',
                    elapsed: 0
                });
            }

            // Balanced bullets (max 42 bullets)
            const fanCycle = 1.4;
            const tLastFan = this.lastSpawnTimes['att15_fan'] || (0.3 - fanCycle);
            if (t - tLastFan >= fanCycle) {
                this.lastSpawnTimes['att15_fan'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 5 : 4, (26 * Math.PI) / 180, 140 * speedScale, { style: 'ball', colorKey: 'crimson', radius: 5.5 });
            }
        }

        // Attack 16: Echo of Ten (P3: Tendril slam + 4-eye sweeping beams + Mind Link Pulse)
        _updateAttack16(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._voidSkills(16, t, canvasW, canvasH, isHard);

            // Mind Link at 0.3s
            if (t >= 0.3 && !this.lastSpawnTimes['att16_link']) {
                this.lastSpawnTimes['att16_link'] = true;
                this.skills.push({ type: 'mind_link', starCount: 8, duration: 45.0, elapsed: 0 });
            }

            // 4-Eye sweeping beams at t = 12.0s and t = 28.0s
            if ((t >= 12.0 && !this.lastSpawnTimes['att16_beam1']) || (t >= 28.0 && !this.lastSpawnTimes['att16_beam2'])) {
                if (t < 20.0) this.lastSpawnTimes['att16_beam1'] = true;
                else this.lastSpawnTimes['att16_beam2'] = true;
                const eyes = getEyeSources(bossPos.x, bossPos.y);
                for (let i = 0; i < 4; i++) {
                    this.lasers.push({
                        x0: eyes[i].x, y0: eyes[i].y,
                        x1: canvasW * (0.15 + i * 0.22), y1: 720,
                        width: 32, state: 'telegraph', elapsed: 0,
                        telegraphTime: 0.9, activeTime: 0.5, fadeTime: 0.3,
                        colorKey: 'gold'
                    });
                }
            }

            // Tendril vertical slam at t = 20.0s and t = 38.0s
            if ((t >= 20.0 && !this.lastSpawnTimes['att16_slam1']) || (t >= 38.0 && !this.lastSpawnTimes['att16_slam2'])) {
                if (t < 30.0) this.lastSpawnTimes['att16_slam1'] = true;
                else this.lastSpawnTimes['att16_slam2'] = true;
                this.skills.push(this._makeVerticalLash(canvasW * 0.5, canvasW, 0.9, t < 30.0 ? 1 : -1));
            }

            // Supportive bullets (max 55 bullets)
            const cycle = 1.3;
            const tLast = this.lastSpawnTimes['att16_fan'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att16_fan'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 6 : 5, (30 * Math.PI) / 180, 145 * speedScale, { style: 'star', colorKey: 'crimson', radius: 6.0 });
            }
        }

        // Attack 17: Rage of the Collective (P3: 5 rage stacks, Null Slash fatal on hit, Enraged Sphere 190px)
        _updateAttack17(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;
            this._scheduleUpheaval('att17_up', t, 3.0, 8.0, ['triple_wave', 'sweep_low', 'pincer', 'single'], canvasW, canvasH);

            // A large sphere launches at script second 11.
            if (t >= 11.0 && !this.lastSpawnTimes['att17_cube']) {
                this.lastSpawnTimes['att17_cube'] = true;
                const aimX17 = Math.max(140, Math.min(canvasW - 140, typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5));
                this.thoughtCube.spawn(bossPos.x, bossPos.y + 40, aimX17, 180, 3);
            }

            // Fatal Null Slash at t = 0.3s and t = 32.0s
            const slashCycle = 30.0;
            const tLastSlash = this.lastSpawnTimes['att17_slash'] || (0.3 - slashCycle);
            if (t - tLastSlash >= slashCycle) {
                this.lastSpawnTimes['att17_slash'] = t;
                this.skills.push({
                    type: 'null_slash',
                    originX: bossPos.x,
                    originY: bossPos.y,
                    targetX: canvasW * 0.5,
                    targetY: 640,
                    angle: Math.PI * 0.5,
                    radius: 460,
                    windupDur: 1.8,
                    hasHexShield: false,
                    selfDamage: 0,
                    isP3: true,
                    phase: 'charging',
                    elapsed: 0
                });
            }

            // Enraged pulse rings (max 60 bullets)
            const cycle = 1.35;
            const tLast = this.lastSpawnTimes['att17_ring'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att17_ring'] = t;
                this._fireRing(bossPos.x, bossPos.y, isHard ? 14 : 12, 135 * speedScale, t * 0.3, { style: 'oval', colorKey: 'crimson', radius: 5.5 });
            }
        }

        // Attack 18: Ten Minds, One Voice (P3: Grand Finale: Chorus + Null Slash + Eye Beams + Giant Thought Spheres 240px)
        _updateAttack18(dt, canvasW, canvasH, bossPos, speedScale, isHard) {
            const t = this.scriptTime;

            // Chorus wave active from 0.3s to 26.0s
            if (t >= 0.3 && !this.lastSpawnTimes['att18_chorus']) {
                this.lastSpawnTimes['att18_chorus'] = true;
                this.skills.push({ type: 'chorus', duration: 25.0, elapsed: 0 });
            }

            // The final sphere launches at script second 18.
            if (t >= 18.0 && !this.lastSpawnTimes['att18_cube']) {
                this.lastSpawnTimes['att18_cube'] = true;
                const aimX18 = Math.max(150, Math.min(canvasW - 150, typeof this._lastPlayerX === 'number' ? this._lastPlayerX : canvasW * 0.5));
                this.thoughtCube.spawn(bossPos.x, bossPos.y + 40, aimX18, 200, 3);
            }

            // Eye Beams at t = 12.0s
            if (t >= 12.0 && !this.lastSpawnTimes['att18_beams']) {
                this.lastSpawnTimes['att18_beams'] = true;
                this.lasers.push({
                    x0: bossPos.x - 20, y0: bossPos.y,
                    x1: canvasW * 0.28, y1: 720,
                    width: 32, state: 'telegraph', elapsed: 0,
                    telegraphTime: 0.9, activeTime: 0.5, fadeTime: 0.3,
                    colorKey: 'gold'
                });
                this.lasers.push({
                    x0: bossPos.x + 20, y0: bossPos.y,
                    x1: canvasW * 0.72, y1: 720,
                    width: 32, state: 'telegraph', elapsed: 0,
                    telegraphTime: 0.9, activeTime: 0.5, fadeTime: 0.3,
                    colorKey: 'gold'
                });
            }

            // Null Slash at t = 45.0s
            if (t >= 45.0 && !this.lastSpawnTimes['att18_slash']) {
                this.lastSpawnTimes['att18_slash'] = true;
                this.skills.push({
                    type: 'null_slash',
                    originX: bossPos.x,
                    originY: bossPos.y,
                    targetX: canvasW * 0.5,
                    targetY: 640,
                    angle: Math.PI * 0.5,
                    radius: 460,
                    windupDur: 1.8,
                    hasHexShield: false,
                    selfDamage: 0,
                    isP3: true,
                    phase: 'charging',
                    elapsed: 0
                });
            }

            // Grand climax bullets (max 70 bullets, always leaving >= 110px gaps)
            const cycle = 1.35;
            const tLast = this.lastSpawnTimes['att18_bullets'] || (0.3 - cycle);
            if (t - tLast >= cycle) {
                this.lastSpawnTimes['att18_bullets'] = t;
                this._fireFan(bossPos.x, bossPos.y, Math.PI * 0.5, isHard ? 6 : 5, (32 * Math.PI) / 180, 145 * speedScale, { style: 'ball', colorKey: 'yellow', radius: 5.5 });
            }
        }
    }

    return {
        ATTACK_DEFS,
        AttackController,
        ThoughtSphere,
        TOTAL_MATCH_BASE_HP,
        getMatchHpInfo,
        getPhaseHpInfo,
        getBossTargetPosition,
        getBossPosition,
        getBossSchedule,
        getTentacleSources,
        getEyeSources,
        createPRNG
    };
});
