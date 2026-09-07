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
        if (enemy.type === 'thaelis_cocoon') return; // Cocoon chỉ tự hồi máu của chính nó
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

// Reincarnation (Thaelis): death no longer splits into 3 weak Embryos that
// silently hatch into basic Apostles - it collapses into a single Cocoon at
// the death spot. The Cocoon itself cannot be damaged directly (see the
// early return in dealDamage) and takes no heal/shield from any outside
// source, only its own slow self-regen - the only way to hurt it is to kill
// the Guards standing around it, each one worth a chunk of its HP. Destroy
// the Cocoon before the timer runs out and Thaelis is gone for good; let it
// survive the full window and the real Thaelis climbs back out, fully
// itself (not a downgraded copy), at reduced Max HP.
const THAELIS_COCOON_HP_PCT = 0.60;
const THAELIS_COCOON_REGEN_PCT = 0.01; // per second, of the cocoon's own maxHp
const THAELIS_COCOON_DURATION = 9000;
const THAELIS_COCOON_GUARD_COUNT = 4; // kept alive at all times
const THAELIS_COCOON_GUARD_HP_MIN_PCT = 0.10; // of Thaelis's original maxHp
const THAELIS_COCOON_GUARD_HP_MAX_PCT = 0.20;
const THAELIS_COCOON_GUARD_DR = 0.40; // Guards are the real damage sink now, some DR keeps them from melting instantly
const THAELIS_COCOON_GUARD_FLAT_DR = 20; // subtracted after the % cut above, same pattern as Walpurgis/Leviathan's own flat DR
const THAELIS_COCOON_GUARD_RESPAWN_MS = 500;
const THAELIS_COCOON_GUARD_SHIELD_GRANT = 300; // flat Shield the Cocoon banks per Guard kill, carried over to Thaelis if it revives (see _reviveThaelis)
const THAELIS_REVIVE_HP_PCT = 0.40;
const THAELIS_REVIVE_INVULN_MS = 1000;
const THAELIS_COCOON_RETRIGGER_COOLDOWN_MS = 12000; // a revived Thaelis can't cocoon again this soon if it dies right away

function _spawnThaelisCocoonGuard(cocoon) {
    const pct = THAELIS_COCOON_GUARD_HP_MIN_PCT + Math.random() * (THAELIS_COCOON_GUARD_HP_MAX_PCT - THAELIS_COCOON_GUARD_HP_MIN_PCT);
    const hp = Math.ceil(cocoon._cocoonOriginalMaxHp * pct);
    const slot = (cocoon._cocoonGuardSlot = (cocoon._cocoonGuardSlot || 0) + 1);
    const angle = (slot / THAELIS_COCOON_GUARD_COUNT) * Math.PI * 2;
    const dist = cocoon.size * 0.95;
    enemies.push({
        x: cocoon.x + Math.cos(angle) * dist, y: cocoon.y + Math.sin(angle) * dist,
        size: 15, speed: 0, hp: hp, maxHp: hp, shield: 0,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,
        type: 'thaelis_guard', _guardCocoon: cocoon, _guardAngle: angle,
    });
}

// Whenever the Cocoon resolves one way or the other (drained to real death,
// or surviving to revive Thaelis), any Guards still standing no longer have
// anything to protect - clear them out instead of leaving them behind as
// inert leftover enemies.
function _despawnCocoonGuards(cocoon) {
    for (const e of enemies) {
        if (e.type === 'thaelis_guard' && e._guardCocoon === cocoon && e.hp > 0) {
            e._guardConsumed = true; // skip the death->damage transfer, the cocoon is already resolved
            e.hp = 0;
        }
    }
}

function _spawnThaelisCocoon(deadThaelis) {
    const cocoonHp = Math.ceil(deadThaelis.maxHp * THAELIS_COCOON_HP_PCT);
    const cocoon = {
        x: deadThaelis.x, y: deadThaelis.y, size: deadThaelis.size * 0.85,
        speed: 0, hp: cocoonHp, maxHp: cocoonHp, shield: 0,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,
        type: 'thaelis_cocoon',
        _cocoonOriginalMaxHp: deadThaelis.maxHp,
        _cocoonOriginalSize: deadThaelis.size,
        _cocoonTimer: THAELIS_COCOON_DURATION,
        _cocoonGuardRespawnTimers: [],
    };
    enemies.push(cocoon);
    for (let i = 0; i < THAELIS_COCOON_GUARD_COUNT; i++) _spawnThaelisCocoonGuard(cocoon);
}

// Cocoon survived its full timer: the real Thaelis climbs back out at the
// same spot, fully itself (not a downgraded copy) but at reduced Max HP, with
// a brief invulnerability window so it isn't punished for the exact frame it
// reappears on.
function _reviveThaelis(cocoon) {
    const hp = Math.max(1, Math.ceil(cocoon._cocoonOriginalMaxHp * THAELIS_REVIVE_HP_PCT));
    enemies.push({
        x: cocoon.x, y: cocoon.y, size: cocoon._cocoonOriginalSize || cocoon.size / 0.85,
        speed: (1 + Math.random() * 2) * 0.8 * 0.80 * 0.80,
        hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,
        // Shield banked from every Guard sacrificed while the Cocoon held out
        // carries straight over as a head start, instead of being wasted.
        shield: cocoon.shield || 0,
        type: 'thaelis', shootTimer: 1000, reincarnated: false,
        _shieldPeak: cocoon.shield || 0,
        _tenacityBarrier70: false, _tenacityBarrier40: false, _tenacityBarrier10: false,
        _reviveInvulnEnd: performance.now() + THAELIS_REVIVE_INVULN_MS,
        _justRevivedAt: performance.now(),
        // Cooldown before THIS lineage can cocoon again if it dies right
        // away - without this a revived Thaelis could chain-cocoon forever.
        _cocoonCooldownUntil: performance.now() + THAELIS_COCOON_RETRIGGER_COOLDOWN_MS,
    });
    addExplosion(cocoon.x, cocoon.y, cocoon.size * 1.6, '#22cc55');
    createParticles(cocoon.x, cocoon.y, 40, '#22cc55', 3, 10);
    _setShake(10, 300);
}

function spawnThaelis() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    // Early-game floor bumped 1100 -> 1265 (+15%), on top of the separate
    // +15% global HP buff multiplier below - Thaelis specifically reads too
    // squishy in the first waves compared to other Abnormal-tier enemies.
    let hp = Math.ceil(Math.min(2640, 1265 + hpFromTime * 53) * 1.15 * _walpurgisHpMult());
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
