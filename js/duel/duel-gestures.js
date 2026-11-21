// Pisces: Space Journey. Pure keyframe gesture system for Egregor's tentacles, body, wings, and gaze.
// Replaces oscillatory wave flailing with 12 three-phase gestures (anticipation, action, follow-through)
// and smooth cross-blending. Runs in both browser (window.DuelGestures) and Node (module.exports).

(function (root, factory) {
    const mod = factory(root);
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
    }
    if (root && typeof root === 'object') {
        root.DuelGestures = mod;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
    'use strict';

    const DEFAULT_DATA = {
        blendDuration: 0.34,
        tipLagPhase: 1.75,
        whipAmp: 0.62,
        slamAmp: 0.56,
        sweepAmp: 0.58,
        summonAmp: 0.50,
        roarAmp: 0.54,
        aimAmp: 0.48,
        idleAmp: 0.24,
        stalkDrag: 0.42,
        phases: {
            antEnd: 0.28,
            actEnd: 0.66
        }
    };

    // Maps attack cues from AttackController to gesture sequences.
    const CUE_GESTURE = {
        volley:         { prepare: 'aim',     fire: 'whip',   recover: 'idle', intensity: 0.90 },
        tendril_lash:   { prepare: 'aim',     fire: 'whip',   recover: 'idle', intensity: 1.00, trackTarget: true },
        tempest:        { prepare: 'wind_up', fire: 'summon', recover: 'idle', intensity: 1.00 },
        upheaval:       { prepare: 'wind_up', fire: 'slam',   recover: 'idle', intensity: 1.00 },
        null_slash:     { prepare: 'wind_up', fire: 'sweep',  recover: 'idle', intensity: 1.00, trackTarget: true },
        eye_beams:      { prepare: 'aim',     fire: 'aim',    recover: 'idle', intensity: 0.95, gazeLock: true },
        chorus:         { prepare: 'summon',  fire: 'summon', recover: 'idle', intensity: 0.85 },
        mind_link:      { prepare: 'taunt',   fire: 'taunt',  recover: 'idle', intensity: 0.90 },
        rift:           { prepare: 'wind_up', fire: 'roar',   recover: 'idle', intensity: 1.00 },
        thought_sphere: { prepare: 'wind_up', fire: 'slam',   recover: 'idle', intensity: 0.72 }
    };

    // Arm index (1..7) to group letter (A: 1,2; B: 3; C: 4,5; D: 6,7).
    const ARM_GROUP = { 1: 'A', 2: 'A', 3: 'B', 4: 'C', 5: 'C', 6: 'D', 7: 'D' };
    const GROUPS = ['A', 'B', 'C', 'D'];

    // Gesture definitions: each has 3 keyframes (ant, act, rec) with root angle offsets per group,
    // reach scale, bend bias, tip lag behavior, body tilt, squash/stretch, wing open, and gaze.
    // Note on angle sign: in drawDuelEgregor, base arm angles are negative (-0.81..-1.31) pointing outward/down;
    // POSITIVE offset drives arms DOWNWARD/INWARD toward the player (avoiding flat horizontal bat-wing splay).
    const GESTURE_DEFS = {
        idle: {
            duration: 2.6, loop: true,
            ant: { A: 0.04, B: 0.02, C: 0.03, D: 0.02, reach: 0.99, bend: 0.08, tipBend: 0.14, tilt: 0.00, sqX: 1.01, sqY: 0.99, wing: 0.02, gazeY: 0.05 },
            act: { A: 0.10, B: 0.06, C: 0.07, D: 0.04, reach: 1.02, bend: -0.06, tipBend: -0.10, tilt: 0.00, sqX: 0.99, sqY: 1.01, wing: -0.02, gazeY: 0.08 },
            rec: { A: 0.05, B: 0.03, C: 0.04, D: 0.02, reach: 1.00, bend: 0.04, tipBend: 0.06, tilt: 0.00, sqX: 1.00, sqY: 1.00, wing: 0.00, gazeY: 0.05 }
        },
        stalk: {
            duration: 1.4, loop: true,
            ant: { A: 0.14, B: 0.10, C: 0.12, D: 0.08, reach: 1.04, bend: 0.12, tipBend: 0.24, tilt: 0.06, sqX: 0.98, sqY: 1.02, wing: -0.06, gazeY: 0.15 },
            act: { A: 0.20, B: 0.14, C: 0.18, D: 0.10, reach: 1.06, bend: 0.16, tipBend: 0.30, tilt: 0.09, sqX: 0.97, sqY: 1.03, wing: -0.10, gazeY: 0.18 },
            rec: { A: 0.16, B: 0.11, C: 0.14, D: 0.09, reach: 1.04, bend: 0.12, tipBend: 0.22, tilt: 0.06, sqX: 0.98, sqY: 1.02, wing: -0.07, gazeY: 0.15 }
        },
        taunt: {
            duration: 1.3, loop: false, asym: 0.38,
            ant: { A: -0.12, B: -0.08, C: 0.10, D: 0.08, reach: 0.94, bend: 0.20, tipBend: 0.26, tilt: -0.05, sqX: 1.03, sqY: 0.97, wing: 0.08, gazeY: 0.10 },
            act: { A: -0.24, B: -0.16, C: 0.24, D: 0.14, reach: 1.06, bend: -0.18, tipBend: 0.32, tilt: 0.06, sqX: 1.04, sqY: 0.96, wing: 0.18, gazeY: 0.22 },
            rec: { A: 0.02,  B: 0.00,  C: 0.08, D: 0.05, reach: 1.00, bend: 0.04, tipBend: 0.08, tilt: 0.01, sqX: 1.00, sqY: 1.00, wing: 0.04, gazeY: 0.10 }
        },
        aim: {
            duration: 0.95, loop: false, pointLead: true,
            ant: { A: -0.16, B: -0.10, C: 0.14, D: 0.06, reach: 0.92, bend: 0.22, tipBend: 0.28, tilt: -0.04, sqX: 1.02, sqY: 0.98, wing: -0.05, gazeY: 0.30, gazeLock: true },
            act: { A: 0.34,  B: -0.12, C: 0.22, D: 0.06, reach: 1.08, bend: -0.04, tipBend: -0.06, tilt: 0.04, sqX: 0.98, sqY: 1.02, wing: -0.14, gazeY: 0.42, gazeLock: true },
            rec: { A: 0.22,  B: 0.10,  C: 0.18, D: 0.08, reach: 1.03, bend: 0.04, tipBend: 0.04, tilt: 0.02, sqX: 0.99, sqY: 1.01, wing: -0.03, gazeY: 0.25, gazeLock: true }
        },
        wind_up: {
            duration: 0.85, loop: false,
            ant: { A: -0.14, B: -0.12, C: -0.06, D: -0.04, reach: 0.93, bend: 0.22, tipBend: 0.34, tilt: -0.04, sqX: 1.03, sqY: 0.97, wing: 0.06, gazeY: -0.05 },
            act: { A: -0.34, B: -0.26, C: -0.18, D: -0.10, reach: 0.86, bend: 0.36, tipBend: 0.52, tilt: -0.08, sqX: 1.05, sqY: 0.95, wing: 0.14, gazeY: -0.12 },
            rec: { A: -0.22, B: -0.18, C: -0.10, D: -0.06, reach: 0.90, bend: 0.26, tipBend: 0.38, tilt: -0.05, sqX: 1.03, sqY: 0.97, wing: 0.10, gazeY: -0.04 }
        },
        whip: {
            duration: 1.16, loop: false, whipLag: true, pointLead: true,
            ant: { A: -0.22, B: -0.14, C: -0.08, D: -0.04, reach: 0.90, bend: -0.10, tipBend: -0.18, tilt: -0.06, sqX: 1.03, sqY: 0.97, wing: -0.04, gazeY: 0.18 },
            act: { A: 0.48,  B: 0.30,  C: 0.38,  D: 0.20,  reach: 1.14, bend: -0.16, tipBend: -0.26, tilt: 0.08, sqX: 0.96, sqY: 1.04, wing: -0.12, gazeY: 0.38 },
            rec: { A: 0.36,  B: 0.22,  C: 0.28,  D: 0.15,  reach: 1.06, bend: 0.28,  tipBend: 0.68,  tilt: 0.04, sqX: 1.00, sqY: 1.00, wing: -0.04, gazeY: 0.16 }
        },
        slam: {
            duration: 1.24, loop: false, whipLag: true,
            ant: { A: -0.32, B: -0.20, C: -0.14, D: -0.08, reach: 0.90, bend: 0.30, tipBend: 0.42, tilt: -0.06, sqX: 0.97, sqY: 1.04, wing: 0.14, gazeY: -0.08 },
            act: { A: 0.62,  B: 0.42,  C: 0.56,  D: 0.34,  reach: 1.12, bend: -0.30, tipBend: -0.40, tilt: 0.02, sqX: 1.06, sqY: 0.94, wing: -0.22, gazeY: 0.45 },
            rec: { A: 0.28,  B: 0.16,  C: 0.26,  D: 0.14,  reach: 1.02, bend: 0.10, tipBend: -0.12, tilt: 0.03, sqX: 1.01, sqY: 0.99, wing: -0.04, gazeY: 0.20 }
        },
        summon: {
            duration: 1.15, loop: false,
            ant: { A: -0.10, B: -0.14, C: 0.06,  D: 0.04,  reach: 0.95, bend: 0.16, tipBend: 0.24, tilt: -0.02, sqX: 1.01, sqY: 0.99, wing: 0.10, gazeY: -0.05 },
            act: { A: -0.42, B: -0.34, C: -0.16, D: 0.02,  reach: 1.12, bend: -0.28, tipBend: -0.36, tilt: -0.04, sqX: 0.96, sqY: 1.05, wing: 0.28, gazeY: -0.18 },
            rec: { A: -0.12, B: -0.10, C: 0.02,  D: 0.04,  reach: 1.03, bend: -0.06, tipBend: -0.08, tilt: -0.01, sqX: 0.99, sqY: 1.01, wing: 0.10, gazeY: 0.00 }
        },
        sweep: {
            duration: 1.14, loop: false, sweepDir: true, whipLag: true,
            ant: { A: -0.22, B: -0.16, C: -0.06, D: -0.04, reach: 0.92, bend: 0.30, tipBend: 0.44, tilt: -0.09, sqX: 1.02, sqY: 0.98, wing: 0.08, gazeY: 0.15 },
            act: { A: 0.36,  B: 0.28,  C: 0.22,  D: 0.12,  reach: 1.18, bend: -0.18, tipBend: -0.36, tilt: 0.14, sqX: 0.96, sqY: 1.04, wing: 0.16, gazeY: 0.32 },
            rec: { A: 0.18,  B: 0.12,  C: 0.16,  D: 0.08,  reach: 1.03, bend: 0.08, tipBend: -0.16, tilt: 0.03, sqX: 1.00, sqY: 1.00, wing: -0.02, gazeY: 0.14 }
        },
        flinch: {
            duration: 0.78, loop: false,
            ant: { A: 0.18,  B: 0.14,  C: 0.22,  D: 0.16,  reach: 0.84, bend: 0.36, tipBend: 0.42, tilt: -0.08, sqX: 1.07, sqY: 0.92, wing: -0.18, gazeY: -0.10 },
            act: { A: 0.26,  B: 0.20,  C: 0.30,  D: 0.20,  reach: 0.82, bend: 0.42, tipBend: 0.48, tilt: -0.10, sqX: 1.06, sqY: 0.93, wing: -0.22, gazeY: -0.14 },
            rec: { A: 0.08,  B: 0.06,  C: 0.10,  D: 0.06,  reach: 0.96, bend: 0.12, tipBend: 0.16, tilt: -0.02, sqX: 1.01, sqY: 0.99, wing: -0.05, gazeY: 0.02 }
        },
        roar: {
            duration: 1.20, loop: false, tremor: true,
            ant: { A: 0.16,  B: 0.12,  C: 0.20,  D: 0.14,  reach: 0.88, bend: 0.28, tipBend: 0.36, tilt: -0.05, sqX: 1.04, sqY: 0.96, wing: -0.08, gazeY: -0.10 },
            act: { A: -0.36, B: -0.32, C: 0.18,  D: 0.10,  reach: 1.14, bend: -0.32, tipBend: -0.44, tilt: -0.10, sqX: 1.05, sqY: 1.04, wing: 0.36, gazeY: -0.26 },
            rec: { A: -0.06, B: -0.06, C: 0.10,  D: 0.06,  reach: 1.02, bend: -0.04, tipBend: -0.08, tilt: -0.02, sqX: 1.01, sqY: 1.00, wing: 0.10, gazeY: -0.04 }
        },
        fake: {
            duration: 0.96, loop: false, asym: -0.35,
            ant: { A: -0.26, B: -0.18, C: -0.10, D: -0.06, reach: 0.90, bend: 0.30, tipBend: 0.42, tilt: -0.07, sqX: 1.03, sqY: 0.97, wing: 0.10, gazeY: 0.12 },
            act: { A: 0.34,  B: 0.08,  C: 0.24,  D: 0.10,  reach: 1.05, bend: -0.16, tipBend: 0.28, tilt: 0.08, sqX: 0.98, sqY: 1.02, wing: -0.06, gazeY: 0.24 },
            rec: { A: -0.10, B: -0.06, C: 0.06,  D: 0.04,  reach: 0.97, bend: 0.12, tipBend: 0.16, tilt: -0.02, sqX: 1.00, sqY: 1.00, wing: 0.02, gazeY: 0.12 }
        }
    };

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function smoothstep(t) {
        const u = clamp(t, 0, 1);
        return u * u * (3 - 2 * u);
    }

    function resolveData(customData) {
        const base = (root && root.DUEL_GESTURES_DATA) ? root.DUEL_GESTURES_DATA : DEFAULT_DATA;
        if (!customData) return base;
        return Object.assign({}, base, customData, {
            phases: Object.assign({}, base.phases || DEFAULT_DATA.phases, customData.phases || {})
        });
    }

    function createState() {
        return {
            current: 'idle',
            prev: 'idle',
            t: 0,
            prevT: 0,
            blend: 1,
            blendDur: 0.34,
            dirX: 0,
            dirY: 1,
            leanX: 0,
            speed: 0,
            intensity: 1,
            gazeLock: false,
            reducedMotion: false,
            flinchTimer: 0,
            tauntTimer: 0
        };
    }

    function transitionTo(state, nextName, blendDur, intensity) {
        if (!GESTURE_DEFS[nextName]) nextName = 'idle';
        if (state.current === nextName) {
            state.intensity = intensity !== undefined ? intensity : state.intensity;
            return;
        }
        state.prev = state.current;
        state.prevT = state.t;
        state.current = nextName;
        state.t = 0;
        state.blend = 0;
        state.blendDur = Math.max(0.14, blendDur || 0.34);
        state.intensity = intensity !== undefined ? intensity : 1;
    }

    // Updates gesture state machine from combat cue, motion, hit response, and reducedMotion flag.
    function updateState(state, input, dt, customData) {
        const st = state || createState();
        const inp = input || {};
        const stepDt = Math.max(0, Math.min(0.1, dt || 0));
        const data = resolveData(customData);

        st.reducedMotion = !!inp.reducedMotion;
        if (Number.isFinite(inp.dirX)) st.dirX += (clamp(inp.dirX, -1, 1) - st.dirX) * (1 - Math.exp(-stepDt * 12));
        if (Number.isFinite(inp.dirY)) st.dirY += (clamp(inp.dirY, -1, 1) - st.dirY) * (1 - Math.exp(-stepDt * 12));
        if (Number.isFinite(inp.leanX)) st.leanX += (clamp(inp.leanX, -1, 1) - st.leanX) * (1 - Math.exp(-stepDt * 10));
        if (Number.isFinite(inp.speed)) st.speed = Math.max(0, inp.speed);

        if (st.reducedMotion) {
            st.current = 'idle';
            st.prev = 'idle';
            st.blend = 1;
            st.t = (st.t + stepDt * 0.25) % 1;
            st.gazeLock = false;
            return st;
        }

        if (inp.heavyHit && st.flinchTimer <= 0) {
            st.flinchTimer = 0.42;
        }
        if (st.flinchTimer > 0) st.flinchTimer = Math.max(0, st.flinchTimer - stepDt);

        if (inp.tauntTrigger && st.tauntTimer <= 0) {
            st.tauntTimer = 1.1;
        }
        if (st.tauntTimer > 0) st.tauntTimer = Math.max(0, st.tauntTimer - stepDt);

        let desired = 'idle';
        let desiredIntensity = 1.0;
        let gazeLock = false;
        const cue = inp.cue;

        if (st.flinchTimer > 0 && (!cue || (cue.fire || 0) < 0.2)) {
            desired = 'flinch';
            desiredIntensity = 1.0;
        } else if (cue && (cue.wind > 0.04 || cue.fire > 0.04)) {
            const map = CUE_GESTURE[cue.kind] || CUE_GESTURE.volley;
            desiredIntensity = map.intensity || 1.0;
            gazeLock = !!map.gazeLock;
            if (Number.isFinite(cue.dirX)) st.dirX += (clamp(cue.dirX, -1, 1) - st.dirX) * (1 - Math.exp(-stepDt * 14));
            if (Number.isFinite(cue.dirY)) st.dirY += (clamp(cue.dirY, -1, 1) - st.dirY) * (1 - Math.exp(-stepDt * 14));
            if ((cue.fire || 0) > 0.08) {
                desired = map.fire;
            } else {
                desired = map.prepare;
            }
        } else if (st.tauntTimer > 0 && st.speed < 25) {
            desired = 'taunt';
        } else if (st.speed > 26) {
            desired = 'stalk';
        } else {
            desired = 'idle';
        }

        st.gazeLock = gazeLock;
        if (desired !== st.current) {
            transitionTo(st, desired, data.blendDuration, desiredIntensity);
        } else {
            st.intensity = desiredIntensity;
        }

        const curDef = GESTURE_DEFS[st.current] || GESTURE_DEFS.idle;
        const prevDef = GESTURE_DEFS[st.prev] || GESTURE_DEFS.idle;
        st.t += stepDt / Math.max(0.2, curDef.duration);
        if (curDef.loop) {
            st.t = st.t % 1;
        } else {
            st.t = Math.min(1, st.t);
        }
        st.prevT += stepDt / Math.max(0.2, prevDef.duration);
        if (prevDef.loop) st.prevT = st.prevT % 1;
        else st.prevT = Math.min(1, st.prevT);

        if (st.blend < 1) {
            st.blend = Math.min(1, st.blend + stepDt / Math.max(0.14, st.blendDur));
        }

        return st;
    }

    // Evaluates a single gesture definition at normalized progress p in [0, 1].
    function evalGesturePose(name, p, ctx, data) {
        const def = GESTURE_DEFS[name] || GESTURE_DEFS.idle;
        const antEnd = clamp(data.phases.antEnd, 0.16, 0.42);
        const actEnd = clamp(data.phases.actEnd, antEnd + 0.22, 0.84);
        const u = clamp(p, 0, 1);

        let k0, k1, segT;
        if (u < antEnd) {
            k0 = GESTURE_DEFS.idle.rec;
            k1 = def.ant;
            segT = smoothstep(u / antEnd);
        } else if (u < actEnd) {
            k0 = def.ant;
            k1 = def.act;
            segT = smoothstep((u - antEnd) / (actEnd - antEnd));
        } else {
            k0 = def.act;
            k1 = def.rec;
            segT = smoothstep((u - actEnd) / Math.max(0.05, 1 - actEnd));
        }

        const ampScale = name === 'whip' ? (data.whipAmp / 0.62)
            : name === 'slam' ? (data.slamAmp / 0.56)
            : name === 'sweep' ? (data.sweepAmp / 0.58)
            : name === 'summon' ? (data.summonAmp / 0.50)
            : name === 'roar' ? (data.roarAmp / 0.54)
            : name === 'aim' ? (data.aimAmp / 0.48)
            : name === 'idle' ? (data.idleAmp / 0.24)
            : 1.0;

        const dirX = ctx.dirX || 0;
        const leanX = ctx.leanX || 0;
        const intensity = ctx.intensity !== undefined ? ctx.intensity : 1;
        const scale = ampScale * intensity;

        const left = {};
        const right = {};
        for (let g = 0; g < GROUPS.length; g++) {
            const grp = GROUPS[g];
            const baseAng = lerp(k0[grp], k1[grp], segT) * scale;
            const asym = def.asym ? def.asym * scale : 0;
            const drag = name === 'stalk' ? data.stalkDrag * leanX * 0.45 : leanX * 0.14;

            let lAng = baseAng + asym;
            let rAng = baseAng - asym;

            if (def.pointLead) {
                const lead = clamp(dirX * 1.6, -1, 1);
                rAng += (0.16 * lead - 0.02) * scale;
                lAng += (-0.16 * lead - 0.02) * scale;
            }
            if (def.sweepDir) {
                const sgn = clamp(dirX * 1.6, -1, 1);
                const sweepWave = Math.cos(u * Math.PI);
                lAng -= sgn * 0.22 * scale * sweepWave;
                rAng += sgn * 0.22 * scale * sweepWave;
            }

            // Drag shifts trailing side outward and leading side inward
            lAng += drag;
            rAng -= drag;

            left[grp] = lAng;
            right[grp] = rAng;
        }

        const reach = 1 + (lerp(k0.reach, k1.reach, segT) - 1) * intensity;
        const bend = lerp(k0.bend, k1.bend, segT) * scale;
        const tipBend = lerp(k0.tipBend, k1.tipBend, segT) * scale;
        const tilt = lerp(k0.tilt, k1.tilt, segT) * scale * clamp(dirX * 1.5, -1, 1) + leanX * 0.12;
        const sqX = 1 + (lerp(k0.sqX, k1.sqX, segT) - 1) * intensity;
        const sqY = 1 + (lerp(k0.sqY, k1.sqY, segT) - 1) * intensity;
        const wing = lerp(k0.wing, k1.wing, segT) * scale;
        const gazeY = lerp(k0.gazeY, k1.gazeY, segT);
        const tremorAmp = def.tremor ? Math.sin(u * Math.PI) * 0.025 * intensity : 0;

        // Phase-lagged tip impulse for whip/slam/sweep: root drives early, tip follows behind and snaps through
        const whipProgress = def.whipLag ? clamp((u - antEnd * 0.6) / Math.max(0.1, 1 - antEnd * 0.6), 0, 1) : 0;

        return {
            left, right, reach, bend, tipBend, tilt, sqX, sqY, wing,
            gazeX: dirX * 0.6,
            gazeY,
            gazeLock: !!(def.act && def.act.gazeLock),
            tremorAmp,
            whipLag: def.whipLag ? 1 : 0,
            whipProgress,
            drag: (name === 'stalk' ? data.stalkDrag : 0.18) * leanX
        };
    }

    // Samples the blended gesture pose for rendering or Node metrics.
    function sample(gestureState, timeSec, customData) {
        const st = gestureState || createState();
        const t = Number.isFinite(timeSec) ? timeSec : 0;
        const data = resolveData(customData);

        if (st.reducedMotion) {
            const zeroGrp = { A: 0, B: 0, C: 0, D: 0 };
            return {
                gesture: 'idle',
                left: zeroGrp,
                right: zeroGrp,
                reach: 1.0,
                bodyTilt: 0,
                squashX: 1.0,
                squashY: 1.0,
                wingOpen: 0,
                gazeBias: { x: 0, y: 0, lock: false },
                tremor: 0,
                armAngle: function () { return 0; },
                armReach: function () { return 1.0; },
                bendAt: function (u) { return 0.03 * u * Math.sin(t * 0.6); }
            };
        }

        const pCur = evalGesturePose(st.current, st.t, st, data);
        const b = smoothstep(st.blend);
        const pPrev = b < 0.999 ? evalGesturePose(st.prev, st.prevT, st, data) : pCur;

        const left = {};
        const right = {};
        for (let g = 0; g < GROUPS.length; g++) {
            const grp = GROUPS[g];
            left[grp] = lerp(pPrev.left[grp], pCur.left[grp], b);
            right[grp] = lerp(pPrev.right[grp], pCur.right[grp], b);
        }

        const reach = lerp(pPrev.reach, pCur.reach, b);
        const bend = lerp(pPrev.bend, pCur.bend, b);
        const tipBend = lerp(pPrev.tipBend, pCur.tipBend, b);
        const bodyTilt = lerp(pPrev.tilt, pCur.tilt, b);
        const squashX = lerp(pPrev.sqX, pCur.sqX, b);
        const squashY = lerp(pPrev.sqY, pCur.sqY, b);
        const wingOpen = lerp(pPrev.wing, pCur.wing, b);
        const gazeX = lerp(pPrev.gazeX, pCur.gazeX, b);
        const gazeY = lerp(pPrev.gazeY, pCur.gazeY, b);
        const tremor = lerp(pPrev.tremorAmp, pCur.tremorAmp, b) * Math.sin(t * 36);
        const whipWeight = lerp(pPrev.whipLag, pCur.whipLag, b);
        const whipProg = lerp(pPrev.whipProgress, pCur.whipProgress, b);
        const drag = lerp(pPrev.drag, pCur.drag, b);
        const lagPhase = data.tipLagPhase || 1.75;
        const idleBreath = data.idleAmp || 0.24;

        function armAngle(armIndex, side) {
            const grp = ARM_GROUP[armIndex] || 'A';
            const sideTable = side < 0 ? left : right;
            const base = sideTable[grp] || 0;
            const microBreath = Math.sin(t * (1.05 + armIndex * 0.08) + armIndex * 1.3 + side * 0.7) * 0.035;
            return base + microBreath + tremor;
        }

        function armReach(armIndex, side) {
            const grp = ARM_GROUP[armIndex] || 'A';
            const grpScale = grp === 'A' ? 1.0 : (grp === 'C' ? 0.96 : 0.90);
            return clamp(1 + (reach - 1) * grpScale, 0.78, 1.22);
        }

        // Smooth curvature function bend(u) along tentacle u in [0, 1] (0 = root, 1 = tip).
        function bendAt(u, armIndex, side) {
            const uu = clamp(u, 0, 1);
            const idx = armIndex || 1;
            const sd = side || 1;
            // Base intentional curve from root to tip
            const baseCurve = bend * (1 - uu * 0.35) + tipBend * (uu * uu);
            // Whip phase-lagged wave: root initiates, tip lags by lagPhase radians then snaps through
            const whipWave = whipWeight > 0.01
                ? whipWeight * (0.28 + 0.72 * uu) * Math.sin(whipProg * Math.PI * 1.65 - uu * lagPhase) * 0.32
                : 0;
            // Subtle out-of-phase organic breathing (kept quiet so gestures read cleanly)
            const breathWave = idleBreath * 0.45 * (0.2 + 0.8 * uu) * Math.sin(t * 1.45 + idx * 1.7 + sd * 0.6 - uu * 1.8);
            // Flight drag bends tentacles opposite motion direction
            const dragCurve = -drag * sd * (0.3 + 0.7 * uu) * 0.55;
            return baseCurve + whipWave + breathWave + dragCurve;
        }

        return {
            gesture: st.current,
            left,
            right,
            reach,
            bodyTilt,
            squashX,
            squashY,
            wingOpen,
            gazeBias: { x: gazeX, y: gazeY, lock: st.gazeLock || pCur.gazeLock },
            tremor,
            armAngle,
            armReach,
            bendAt
        };
    }

    return {
        GESTURE_DEFS,
        CUE_GESTURE,
        ARM_GROUP,
        DEFAULT_DATA,
        createState,
        transitionTo,
        updateState,
        sample
    };
});
