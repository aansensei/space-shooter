// Pisces: Space Journey. Showdown Voyage Life Solver.
// Command line script testing survival paths on fixed seeds (0, 1, 42, 20261113).
// Verifies continuous swept collisions at 120Hz on a 2px spatial grid across all 18 attacks.

const DuelBullets = require('./duel-bullets.js');
const DuelAttacks = require('./duel-attacks.js');

const SEEDS = [0, 1, 42, 20261113];
const ATTACK_IDS = Array.from({ length: 18 }, (_, i) => i + 1);
const DIFFICULTIES = ['standard', 'hard'];

const DT = 1.0 / 120.0;
const GRID_STEP = 2.0;
const CANVAS_W = 1280.0;
const CANVAS_H = 720.0;
const SHIP_Y = CANVAS_H - 60.0;
const SHIP_SPEED_NORMAL = 516.0;
const SHIP_SPEED_SLOW = 412.8;
const SHIP_SOLVER_RADIUS = 12.75; // Ship radius 5.75 + Bullet radius 4.0 + Design margin 3.0

function verifyBossMovement() {
    console.log('================================================================');
    console.log('BOSS MOVEMENT TRAJECTORY VERIFICATION (60 Seconds per Attack)');
    console.log('================================================================');

    for (const attackId of ATTACK_IDS) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const totalSteps = Math.round(60.0 / DT);
        for (let s = 0; s <= totalSteps; s++) {
            const t = s * DT;
            const pos = DuelAttacks.getBossPosition(t, CANVAS_W, CANVAS_H, attackId, 42);
            if (pos.x < minX) minX = pos.x;
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y < minY) minY = pos.y;
            if (pos.y > maxY) maxY = pos.y;
        }

        if (Math.abs(maxY - minY) > 0.01) {
            console.error(`ERROR: Boss Y moved significantly for Attack ${attackId}`);
            process.exit(1);
        }
    }
    console.log('Boss Y is strictly constant across all 18 attacks.\n');

    console.log('BOSS HORIZONTAL MOVEMENT & HOLD RATIO (Touhou Movement Metrics):');
    console.log('Attack | Peak Speed | Average Speed | Hold Ratio | Movement Mode');
    console.log('-------|------------|---------------|------------|--------------');
    for (const attackId of ATTACK_IDS) {
        const def = DuelAttacks.ATTACK_DEFS[attackId];
        const dur = def ? def.duration : 60.0;
        let peakSpd = 0, totalSpd = 0, totalHold = 0, samples = 0;
        const sched = DuelAttacks.getBossSchedule(attackId, dur, CANVAS_W, 42);

        for (let t = 0; t < dur; t += 0.01) {
            const seg = sched.find(s => t >= s.tStart && t < s.tEnd) || sched[sched.length - 1];
            let spd = 0;
            if (seg.type === 'hold') {
                totalHold += 0.01;
            } else {
                const u = (t - seg.tStart) / seg.dur;
                if (u >= 0 && u <= 1) {
                    spd = Math.abs(seg.toX - seg.fromX) * 6.0 * u * (1.0 - u) / seg.dur;
                }
            }
            if (spd > peakSpd) peakSpd = spd;
            totalSpd += spd;
            samples++;
        }
        const avgSpd = totalSpd / samples;
        const holdPct = (totalHold / dur * 100).toFixed(1);
        const mode = attackId === 6 ? 'STATIONARY (CENTER)' : (attackId === 9 || attackId === 10 ? 'LASER HOLD ALIGNED' : 'HOLD / MOVE PATROL');
        console.log(`   ${String(attackId).padStart(2)}  |  ${peakSpd.toFixed(1).padStart(5)} px/s |    ${avgSpd.toFixed(1).padStart(4)} px/s |    ${holdPct.padStart(5)}%  | ${mode}`);
    }
    console.log('================================================================\n');
}

function solveAttack(attackId, difficulty, seed) {
    const def = DuelAttacks.ATTACK_DEFS[attackId];
    const duration = def.duration;
    const totalSteps = Math.round(duration / DT);

    const pool = new DuelBullets.BulletPool(1024);
    const controller = new DuelAttacks.AttackController(pool, { difficulty, seed });
    controller.startAttack(attackId, { seed });

    const minX = 40.0;
    const maxX = CANVAS_W - 40.0;
    const numGridPoints = Math.floor((maxX - minX) / GRID_STEP) + 1;

    let reachable = new Uint8Array(numGridPoints);
    reachable.fill(1);

    const prevBulletStates = new Map();
    let peakBullets = 0;
    let peakLasers = 0;

    function captureBulletPositions() {
        prevBulletStates.clear();
        let active = 0;
        for (let i = 0; i < pool.capacity; i++) {
            const b = pool.bullets[i];
            if (b.active) {
                active++;
                prevBulletStates.set(b.id, { x: b.x, y: b.y, radius: b.radius });
            }
        }
        if (active > peakBullets) peakBullets = active;
        if (controller.lasers.length > peakLasers) peakLasers = controller.lasers.length;
    }

    captureBulletPositions();

    for (let step = 0; step < totalSteps; step++) {
        const tNext = (step + 1) * DT;

        controller.update(DT, CANVAS_W, CANVAS_H, CANVAS_W * 0.5, SHIP_Y);
        pool.update(DT, 1.0, { minX: -60, maxX: CANVAS_W + 60, minY: -60, maxY: CANVAS_H + 60 });

        const activeSweptBullets = [];
        for (let i = 0; i < pool.capacity; i++) {
            const b = pool.bullets[i];
            if (b.active && prevBulletStates.has(b.id)) {
                const prev = prevBulletStates.get(b.id);
                if (Math.min(prev.y, b.y) <= SHIP_Y + SHIP_SOLVER_RADIUS + 12 &&
                    Math.max(prev.y, b.y) >= SHIP_Y - SHIP_SOLVER_RADIUS - 12) {
                    activeSweptBullets.push({
                        bx0: prev.x, by0: prev.y,
                        bx1: b.x, by1: b.y,
                        radius: b.radius
                    });
                }
            }
        }

        const nextReachable = new Uint8Array(numGridPoints);
        let anyReachable = false;

        for (let pIdx = 0; pIdx < numGridPoints; pIdx++) {
            if (!reachable[pIdx]) continue;

            const px0 = minX + pIdx * GRID_STEP;

            const isSlow = controller.checkSlowAt(px0, SHIP_Y) > 0;
            const speed = isSlow ? SHIP_SPEED_SLOW : SHIP_SPEED_NORMAL;
            const maxDeltaX = speed * DT;
            const maxGridStep = Math.floor(maxDeltaX / GRID_STEP);

            const startIdx = Math.max(0, pIdx - maxGridStep);
            const endIdx = Math.min(numGridPoints - 1, pIdx + maxGridStep);

            for (let targetIdx = startIdx; targetIdx <= endIdx; targetIdx++) {
                if (nextReachable[targetIdx]) continue;
                const px1 = minX + targetIdx * GRID_STEP;

                let hit = false;
                if (controller.checkLaserCollisions(px1, SHIP_Y, SHIP_SOLVER_RADIUS)) {
                    hit = true;
                }

                if (!hit) {
                    for (let bi = 0; bi < activeSweptBullets.length; bi++) {
                        const sb = activeSweptBullets[bi];
                        if (DuelBullets.checkContinuousCollision(
                            sb.bx0, sb.by0, sb.bx1, sb.by1, sb.radius,
                            px0, SHIP_Y, px1, SHIP_Y, SHIP_SOLVER_RADIUS
                        )) {
                            hit = true;
                            break;
                        }
                    }
                }

                if (!hit) {
                    nextReachable[targetIdx] = 1;
                    anyReachable = true;
                }
            }
        }

        if (!anyReachable) {
            return {
                survived: false,
                failTime: tNext,
                step: step,
                totalSteps: totalSteps,
                peakBullets: peakBullets,
                peakLasers: peakLasers
            };
        }

        reachable = nextReachable;
        captureBulletPositions();
    }

    let survivingPositions = 0;
    for (let i = 0; i < numGridPoints; i++) {
        if (reachable[i]) survivingPositions++;
    }

    return {
        survived: true,
        duration: duration,
        survivingCount: survivingPositions,
        peakBullets: peakBullets,
        peakLasers: peakLasers
    };
}

function runAll() {
    verifyBossMovement();

    console.log('================================================================');
    console.log('LIFE PATH SOLVER (Continuous Swept Collision at 120Hz, 2px Grid)');
    console.log('Testing 18 Attacks across Seeds and Difficulties');
    console.log('================================================================');

    let allPassed = true;
    const summary = [];

    for (const attackId of ATTACK_IDS) {
        let attPassed = true;
        let maxPeak = 0;
        let maxLasers = 0;
        for (const diff of DIFFICULTIES) {
            for (const seed of SEEDS) {
                const res = solveAttack(attackId, diff, seed);
                if (res.peakBullets > maxPeak) maxPeak = res.peakBullets;
                if (res.peakLasers > maxLasers) maxLasers = res.peakLasers;
                if (!res.survived) {
                    attPassed = false;
                    allPassed = false;
                    console.log(`[Att ${attackId} | ${diff.toUpperCase()} | Seed ${seed}] DEADLOCK at t = ${res.failTime.toFixed(3)}s`);
                }
            }
        }
        summary.push({ attackId, passed: attPassed, peakBullets: maxPeak, peakLasers: maxLasers });
        console.log(`Attack ${String(attackId).padStart(2)}: ${attPassed ? 'PASSED' : 'FAILED'} (Peak bullets: ${maxPeak} / 1024, Lasers: ${maxLasers})`);
    }

    console.log('\n================================================================');
    console.log('SOLVER SUMMARY TABLE:');
    console.log('Attack | Status | Peak Bullets | Peak Lasers | Pool Margin');
    console.log('-------|--------|--------------|-------------|------------');
    for (const row of summary) {
        console.log(`   ${String(row.attackId).padStart(2)}  | ${row.passed ? 'PASSED' : 'FAIL  '} |     ${String(row.peakBullets).padStart(4)}     |     ${String(row.peakLasers).padStart(2)}      |   ${1024 - row.peakBullets} free`);
    }
    console.log('================================================================');
    if (allPassed) {
        console.log('ALL 18 ATTACKS PASSED ON ALL SEEDS AND DIFFICULTIES.');
    } else {
        console.log('SOME ATTACKS FAILED: Diagnostics printed above.');
        process.exit(1);
    }
}

runAll();
