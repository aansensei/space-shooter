// Pisces: Space Journey. Showdown Voyage Performance Benchmark.
// Measures update, collision, and simulated render throughput for 300, 600, and 800 bullets.
// Also calculates maximum peak bullet counts for Attack 1, Attack 8, and Attack 13.

const DuelBullets = require('./duel-bullets.js');
const DuelAttacks = require('./duel-attacks.js');

function measurePeakBullets() {
    console.log('================================================================');
    console.log('PEAK ACTIVE BULLET COUNTS PER PROTOTYPE ATTACK');
    console.log('================================================================');

    for (const attackId of [1, 8, 13]) {
        for (const diff of ['standard', 'hard']) {
            const pool = new DuelBullets.BulletPool(1024);
            const ctrl = new DuelAttacks.AttackController(pool, { difficulty: diff, seed: 42 });
            ctrl.startAttack(attackId);

            let maxBullets = 0;
            const DT = 1.0 / 60.0;
            const totalSteps = Math.round(ctrl.attacks ? 0 : DuelAttacks.ATTACK_DEFS[attackId].duration * 60);

            for (let s = 0; s < totalSteps; s++) {
                ctrl.update(DT, 1280, 720, 640, 660);
                pool.update(DT, 1.0, { minX: -60, maxX: 1340, minY: -60, maxY: 780 });
                if (pool.activeCount > maxBullets) {
                    maxBullets = pool.activeCount;
                }
            }

            console.log(`Attack ${attackId} (${DuelAttacks.ATTACK_DEFS[attackId].name}) [${diff.toUpperCase()}]: Peak = ${maxBullets} bullets`);
        }
    }
    console.log('');
}

function benchmarkBulletLoad(targetCounts = [300, 600, 800], iterations = 2000) {
    console.log('================================================================');
    console.log('SIMULATION & COLLISION BENCHMARK (2000 Frames at 60fps)');
    console.log('================================================================');

    for (const count of targetCounts) {
        const pool = new DuelBullets.BulletPool(1024);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 120 + (i % 60);
            pool.spawn(640, 360, Math.cos(angle) * speed, Math.sin(angle) * speed, {
                radius: 4,
                maxAge: 1000.0
            });
        }

        const DT = 1.0 / 60.0;
        const playerX = 640;
        const playerY = 660;

        const start = performance.now();
        let hitCount = 0;
        let grazeCount = 0;

        for (let it = 0; it < iterations; it++) {
            pool.update(DT, 1.0, { minX: -100, maxX: 1380, minY: -100, maxY: 820 });

            for (let i = 0; i < pool.capacity; i++) {
                const b = pool.bullets[i];
                if (!b.active) continue;
                const col = DuelBullets.checkBulletCollision(b, playerX, playerY, 5.75, 0);
                if (col.hit) hitCount++;
                if (col.graze) grazeCount++;
            }
        }

        const elapsed = performance.now() - start;
        const avgFrameMs = elapsed / iterations;
        const fpsPotential = 1000.0 / avgFrameMs;

        console.log(`Load ${count} Bullets:`);
        console.log(`  Total time for ${iterations} frames: ${elapsed.toFixed(2)} ms`);
        console.log(`  Average frame time: ${avgFrameMs.toFixed(4)} ms`);
        console.log(`  Throughput: ${fpsPotential.toFixed(0)} FPS potential (budget: 10.1 ms Desktop, 12.0 ms Mobile)`);
        console.log('');
    }
}

measurePeakBullets();
benchmarkBulletLoad();
