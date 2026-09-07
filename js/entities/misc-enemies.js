// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/misc-enemies.js — the smaller enemy types that don't have
// enough standalone update logic to justify their own file: Dargruel (spawn
// + Demon's Gift), Thaelis (spawn), Aegis Core (spawn), Apostle (spawn +
// Coronation transform). Extracted from entities.js. Must load after
// entities.js and before main.js.

function spawnDargruel() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 13; // was *10, Dargruel read visibly smaller than Egregor at the same Dominator tier
    let hp = Math.ceil((6200 + Math.random() * 9800) * 1.15 * _walpurgisHpMult()); // 6200–16000, +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8 * 0.765, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'dargruel', shootTimer: (autoFireInterval * 2) * 0.75,
        chainTimer: 0,
        demonGift90Triggered: false, demonGift70Triggered: false, demonGift50Triggered: false,
        demonGift30Triggered: false, demonGift1Triggered: false,
        _demonEvadeStacks: 0, _demonEvadeExpiry: 0,
        _chainDarkenChance: 0.18
    });
}

function triggerDemonGift(boss) {
    demonGiftEffect.active = true;
    demonGiftEffect.endTime = performance.now() + 4000;

    enemies.forEach(enemy => {
        if (enemy === boss) return;
        if (enemy.hp <= 0 || enemy._markedForDeath) return; // đã chết, không heal
        if (enemy.type === 'leviathan' && enemy._deathLaserSpawned) return;
        if (enemy.type === 'veilshroud_echo') return; // echo không nhận buff
        const healBase = boss.maxHp * 0.28;
        const healMultiplier = enemy.levEnvy ? 1.25 : 1.0; // Envy: +25% heal
        let healAmount = (enemy.soulReaver ? healBase * 0.75 : healBase) * healMultiplier;
        const veilNormal = enemy.type === 'veilshroud' && !enemy.inPhantom;
        const veilPhantom = enemy.type === 'veilshroud' && enemy.inPhantom;
        if (veilPhantom) healAmount *= 0.75; // Phantom: -25% heal & shield received
        healAmount *= _walpurgisHealShieldMult(); // Walpurgis (Huyết Dạ): +5% heal effectiveness per stack
        const potentialHp = enemy.hp + healAmount;

        if (potentialHp > enemy.maxHp) {
            const overheal = potentialHp - enemy.maxHp;
            let shieldGain = Math.ceil(overheal * 0.30);
            if (enemy.soulReaver) shieldGain *= 0.75;
            if (veilNormal) shieldGain *= 1.35; // Alteration: +35% shield
            if (veilPhantom) shieldGain *= 0.75; // Phantom: -25% shield
            _addEnemyShield(enemy, shieldGain);
        } else if (veilNormal) {
            // Alteration: nhận thêm khiên bằng lượng hồi phục
            _addEnemyShield(enemy, healAmount);
        }
        enemy.hp = Math.min(enemy.maxHp, potentialHp);
        if (veilNormal) enemy._veilHealDRExpiry = performance.now() + 3000;

        enemy.demonGiftStacks = (enemy.demonGiftStacks || 0) + 1;
        if (enemy.demonGiftStacks > 2) enemy.demonGiftStacks = 2;
        enemy.demonGiftEndTime = performance.now() + 4000;
        enemy._demonGiftAuraEnd = enemy.demonGiftEndTime;
    });
}

function spawnThaelis() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.ceil(Math.min(2640, 1100 + hpFromTime * 53) * 1.15 * _walpurgisHpMult()); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8 * 0.80 * 0.80,
        hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'thaelis', shootTimer: 1000, reincarnated: false,
        _shieldPeak: 0,
        _tenacityBarrier70: false, _tenacityBarrier40: false, _tenacityBarrier10: false
    });
}

function spawnAegisCore() {
    const baseSize = (20 + Math.random() * 10);
    const size = ((baseSize * 5) / 2) * 0.7;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.ceil(Math.min(4500, 2500 + hpFromTime * 64) * 1.15 * _walpurgisHpMult()); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.367, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'aegis_core', shootTimer: 0,
        aegisInvulnerable: true, aegisCustosHits: 0, aegisShieldReceived: false
    });
}

function spawnApostle() {
    const size = 20 + Math.random() * 10;
    const hpFromTime = Math.floor(gameElapsedTime / 15000);
    let hp = Math.ceil(Math.min(330, (Math.floor(Math.random() * 20) + 22 + hpFromTime * 5)) * 1.15 * _walpurgisHpMult()); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'apostle', shootTimer: 1000
    });
}

function updateApostleCoronation(enemy, deltaTime) {
    if (enemy._coronationConsumed) return; // already transformed, awaiting removal, no re-entry
    if (!enemy.inCoronation) {
        // Check per-second tick
        if (!enemy.coronationCheckTimer) enemy.coronationCheckTimer = 0;
        enemy.coronationCheckTimer += deltaTime;
        if (enemy.coronationCheckTimer < 1000) return;
        enemy.coronationCheckTimer = 0;

        // Must be at least partially visible on screen
        if (enemy.y < 0) return;

        // Global limit: max 3 in 5 seconds
        const now = performance.now();
        window._coronationHistory = window._coronationHistory.filter(t => now - t < 5000);
        if (window._coronationHistory.length >= 3) return;

        const baseChance = enemy.y < canvas.height / 2 ? 0.0067 : 0.01;
        const chance = baseChance + (window._coronationDeathBonus || 0);
        if (Math.random() >= chance) return;

        // Trigger Coronation, reset death bonus
        window._coronationDeathBonus = 0;
        window._coronationHistory.push(now);
        enemy.inCoronation = true;
        enemy.coronationTimer = 0;
        enemy.coronationDuration = 2200;
        createParticles(enemy.x, enemy.y, 20, '#ffd700', 3, 8);
        if (window.AudioMgr) window.AudioMgr.playSfxAt('coronation', enemy.x, enemy.y);
    } else {
        enemy.coronationTimer += deltaTime;
        // Spawn golden lightning particles during animation
        if (Math.random() < 0.3) {
            const angle = Math.random() * Math.PI * 2;
            const dist = enemy.size * (0.5 + Math.random() * 1.5);
            createParticles(
                enemy.x + Math.cos(angle) * dist,
                enemy.y + Math.sin(angle) * dist,
                2, '#ffd700', 4, 12
            );
        }
        if (enemy.coronationTimer >= enemy.coronationDuration) {
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
            addExplosion(enemy.x, enemy.y, enemy.size * 3, '#ffd700');
            createParticles(enemy.x, enemy.y, 40, '#ffd700', 4, 14);
            _spawnCoronationResult(enemy);
            enemy.hp = 0; // remove original apostle silently (no kill credit)
            enemy._coronationConsumed = true;
        }
    }
}
