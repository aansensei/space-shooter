// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/marchosias.js — real Marchosias: spawn (+ its parasite
// minion), the arc barrier absorb/break/counter-sword kit. Extracted from
// entities.js. Must load after entities.js and before main.js.

// Returns true if the hit was fully absorbed by the arcBarrier (false = passes through)
function checkMarchosiasArcBarrier(enemy, source, bx, by) {
    if (enemy.type !== 'marchosias' || !enemy.arcBarrier || enemy.arcBarrier.hp <= 0) return false;
    const bulletAngle = Math.atan2(by - enemy.y, bx - enemy.x);
    let diff = bulletAngle - enemy.arcBarrier.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) >= Math.PI / 4) return false; // outside 90° arc

    // Arc barrier has +10% evade (stacks on top of Mar's body evade)
    if (Math.random() < 0.10) {
        _tryTriggerMarchosiasCounter(enemy);
        addExplosion(enemy.x, enemy.y, enemy.size * 0.45, '#aaddff');
        return true;
    }

    // Compute base damage to barrier (60% DR, cap 35% barrier HP)
    const effectiveHp = enemy.arcBarrier.maxHp;
    let dmg = Math.ceil((source.damage || 0) + (effectiveHp * (source.percentDamage || 0)));
    if (gloryForJusticeActive) dmg = Math.ceil(dmg * 1.70);
    dmg = Math.ceil(dmg * 0.40);

    // Piercing attacks (spirit arc, boomerang, overload laser) partially penetrate:
    // barrier takes +15% extra, body damage reduced 30%, hit not fully absorbed
    if (source._barrierPiercing) {
        dmg = Math.ceil(dmg * 1.15);
        dmg = Math.min(dmg, Math.ceil(enemy.arcBarrier.hp * 0.35));
        const barrierHeal = Math.min(1000, Math.ceil(dmg * 0.05));
        const barrierWasAlive = enemy.arcBarrier.hp > 0;
        enemy.arcBarrier.hp = Math.max(0, enemy.arcBarrier.hp - dmg + barrierHeal);
        _applyArcBarrierBodyHeal(enemy, dmg);
        if (barrierWasAlive && enemy.arcBarrier.hp <= 0) _triggerArcBarrierBreak(enemy);
        if (Math.random() < 0.25) _tryTriggerMarchosiasCounter(enemy);
        // Reduce damage that reaches body by 30%
        source.damage = Math.ceil((source.damage || 0) * 0.70);
        if (source.percentDamage) source.percentDamage = source.percentDamage * 0.70;
        createParticles(bx, by, 3, '#aaffaa', 1, 4);
        return false; // passes through at reduced damage
    }

    // Normal attack: fully absorbed by barrier
    dmg = Math.min(dmg, Math.ceil(enemy.arcBarrier.hp * 0.35));
    const barrierHeal = Math.min(1000, Math.ceil(dmg * 0.05));
    const barrierWasAlive = enemy.arcBarrier.hp > 0;
    enemy.arcBarrier.hp = Math.max(0, enemy.arcBarrier.hp - dmg + barrierHeal);
    _applyArcBarrierBodyHeal(enemy, dmg);
    if (Math.random() < 0.25) _tryTriggerMarchosiasCounter(enemy);
    if (barrierWasAlive && enemy.arcBarrier.hp <= 0) _triggerArcBarrierBreak(enemy);
    createParticles(bx, by, 3, '#aaffaa', 1, 4);
    return true;
}

function _applyArcBarrierBodyHeal(enemy, dmg) {
    const healAmt = Math.min(1000, Math.ceil(dmg * 0.10));
    const newHp = enemy.hp + healAmt;
    if (newHp > enemy.maxHp) {
        enemy.hp = enemy.maxHp;
        enemy.shield = (enemy.shield || 0) + Math.ceil((newHp - enemy.maxHp) * 0.50);
    } else {
        enemy.hp = newHp;
    }
}

function _triggerArcBarrierBreak(enemy) {
    const _fullCycle = (enemy._barrierSwordsThisCycle || 0) >= 4;
    if (_fullCycle) {
        if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
        addExplosion(enemy.x, enemy.y, enemy.size * 1.4, '#00ff88');
        addExplosion(enemy.x, enemy.y, enemy.size * 0.6, '#aaffd8');
        createParticles(enemy.x, enemy.y, 28, '#00ff88', 3, 12);
        createParticles(enemy.x, enemy.y, 10, '#ffffff', 2, 6);
        for (let i = 0; i < 3; i++) {
            const r = _acquireParticle();
            r.isBarrierBreakRing = true;
            r.x = enemy.x; r.y = enemy.y;
            r.lifetime = 580 - i * 90; r.maxLifetime = r.lifetime;
            r.radius = i * 20;
            particles.push(r);
        }
    } else {
        addExplosion(enemy.x, enemy.y, enemy.size * 0.7, '#00ff88');
    }
    _tryTriggerMarchosiasCounter(enemy);
    enemy.ironBodyHits = (enemy.ironBodyHits || 0) + 5;
    const healAmt = Math.ceil(enemy.maxHp * 0.40);
    const newHp = enemy.hp + healAmt;
    if (newHp > enemy.maxHp) {
        enemy.hp = enemy.maxHp;
        enemy.shield = (enemy.shield || 0) + Math.ceil((newHp - enemy.maxHp) * 0.50);
    } else {
        enemy.hp = newHp;
    }
    const _breakShield = Math.ceil(enemy.maxHp * 0.15 + (enemy.maxHp - enemy.hp) * 0.15);
    _addEnemyShield(enemy, _breakShield);
    enemy.DR = Math.min(0.99, (enemy.DR || 0.45) + 0.20);
    const _reviveDelay = _fullCycle ? 3000 : Math.max(4000, 5000 - (gameElapsedTime / 180000) * 1000);
    enemy._arcBarrierReviveDuration = _reviveDelay;
    enemy._arcBarrierReviveAt = gameElapsedTime + _reviveDelay;
}

// Kích hoạt Sword — tối đa 4 lần mỗi barrier cycle, cooldown 650ms giữa các lần
function _tryTriggerMarchosiasCounter(enemy) {
    const now = performance.now();
    if (enemy.hp <= 0 || enemy._markedForDeath) return;
    if (!enemy.marchosiasWindups) enemy.marchosiasWindups = [];
    if (enemy.lastSwordTriggerTime && now - enemy.lastSwordTriggerTime < 650) return;
    if ((enemy._barrierSwordsThisCycle || 0) >= 4) return;
    enemy.lastSwordTriggerTime = now;
    enemy._barrierSwordsThisCycle = (enemy._barrierSwordsThisCycle || 0) + 1;
    const _wTx = player.x, _wTy = player.y;
    enemy.marchosiasWindups.push({ timer: 1000, target: { x: _wTx, y: _wTy } });
    if (!enemy._ghostWindups) enemy._ghostWindups = [];
    enemy._ghostWindups.push({
        targetX: _wTx, targetY: _wTy,
        originX: enemy.x, originY: enemy.y,
        freezeTimer: 1000,
        fadeTimer: 1200, maxFade: 1200,
    });
}

// Khi HP Mar <= 1%, bắn tất cả Sword đang pending trong queue ngay lập tức
function _fireMarchosiasDeathSwords(enemy) {
    if (!enemy.marchosiasWindups || enemy.marchosiasWindups.length === 0) return;
    // Fire all queued windups instantly, spread slightly
    const count = enemy.marchosiasWindups.length;
    enemy.marchosiasWindups.forEach((windup, idx) => {
        if (!windup.target) return;
        const baseAngle = Math.atan2(windup.target.y - enemy.y, windup.target.x - enemy.x);
        const spread = (idx - (count - 1) / 2) * 0.18;
        const angle = baseAngle + spread;
        marchosiasBlades.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
            angle, radius: 88,
            delay: 0, active: true, // fire immediately
            hitEnemies: [], hitPlayer: false,
            originX: enemy.x, originY: enemy.y,
        });
    });
    enemy.marchosiasWindups = [];
}

function spawnMarchosias() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const speed = (1 + Math.random() * 2) * 0.4 * 0.9 * 1.067; // ~1.6 u/s
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.ceil(Math.min(4092, 2112 + hpFromTime * 55) * 1.15 * _walpurgisHpMult()); // +15% global HP buff

    const shieldHp = hp;

    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size,
        size, speed, hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'marchosias',
        shootTimer: 1000,
        DR: 0.45,
        arcBarrier: {
            hp: shieldHp,
            maxHp: shieldHp,
            angle: 0,
            hitCount: 0,
        },
        _arcBarrierReviveAt: null,
        _barrierSwordsThisCycle: 0,
    });
}

function spawnMarchosiasMinion(parentX, parentY, parentMaxHp) {
    const size = 20 + Math.random() * 10;
    const inheritPct = 0.25 + Math.random() * 0.10;
    const hp = Math.ceil(parentMaxHp * inheritPct * 1.30); // +30% HP

    const paraRange = 170;
    const host = enemies.find(e =>
        e !== null &&
        e.type !== 'marchosias_minion' &&
        e.type !== 'marchosias' &&
        e.type !== 'veilshroud_echo' &&
        e.type !== 'abyssal_chain' &&
        !e.type.startsWith('enemy_bullet') &&
        Math.hypot(e.x - parentX, e.y - parentY) < paraRange
    );

    if (host) {
        host.marchosiasParasiteShield = (host.marchosiasParasiteShield || 0) + hp;
        _goliathTrackResourceGain(host, hp);
        createParticles(host.x, host.y, 20, '#00ff88', 2, 6);
        addExplosion(host.x, host.y, host.size * 0.8, '#00ff88');
    } else {
        const baseSpeed = (1 + Math.random() * 2) * 0.8;
        enemies.push({
            x: parentX + (Math.random() - 0.5) * 40,
            y: parentY + (Math.random() - 0.5) * 40,
            size, speed: baseSpeed * 2.10,
            hp, maxHp: hp,
            isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
            type: 'marchosias_minion',
            DR: 0.75, // 75% innate DR
            shootTimer: 1000,
        });
    }
}
