// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/sigil-virgo.js — split out of the old monolithic js/skills.js.
// Virgo sigil: Forest Guardian's Golden Arrow crit-sweep bonus attack
// (vine-wrapped log sweep while 5+ enemies are on screen).

// Forest Guardian (Virgo buff 1) — bonus attack: while 5+ enemies are on screen,
// every 4s a vine-wrapped log sweeps across the screen.
function _validGoldenArrowTargets() {
    return enemies.filter(e =>
        !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath
    );
}

function updateGoldenArrowSweep(deltaTime) {
    if (!_hasBuff('mui_ten_vang')) return;
    const now = performance.now();

    if (window._goldenArrowSweep) {
        const sw = window._goldenArrowSweep;
        const progress = (now - sw.startTime) / sw.duration;
        if (progress >= 1) {
            window._goldenArrowSweep = null;
            return;
        }
        const currentAngle = -Math.PI + Math.PI * progress;
        const range = canvas.width * 0.6;
        for (const enemy of _validGoldenArrowTargets()) {
            if (sw.hitEnemies.has(enemy)) continue;
            const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist < range && angle < currentAngle && angle > currentAngle - 0.2) {
                sw.hitEnemies.add(enemy);
                const missingHpBonus = Math.ceil((enemy.maxHp - enemy.hp) * 0.15);
                dealDamage(enemy, { damage: 1000 + missingHpBonus, percentDamage: 0.10, _statSrc: 'Virgo: Forest Guardian' });
                createParticles(enemy.x, enemy.y, 14, '#c9a227', 3, 8);
                createParticles(enemy.x, enemy.y, 8, '#5fae3a', 2, 6);
            }
        }
        return;
    }

    if (now < (window._goldenArrowNextSweepAt || 0)) return;
    // Manual count instead of _validGoldenArrowTargets().length — this idle
    // check runs every frame once off cooldown, no need to allocate a
    // filtered copy of `enemies` just to compare its length against 5.
    let _validCount = 0;
    for (const e of enemies) {
        if (!e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath) {
            if (++_validCount >= 5) break;
        }
    }
    if (_validCount < 5) return;

    window._goldenArrowNextSweepAt = now + 4000;
    window._goldenArrowSweep = { startTime: now, duration: 1000, hitEnemies: new Set() };
    if (window.AudioMgr) window.AudioMgr.playSfxAt('egregor-nullslash-slash', player.x, player.y);
}

