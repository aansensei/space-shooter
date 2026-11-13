// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/entities/misc-enemies.js — the smaller enemy types that don't have
// enough standalone update logic to justify their own file: Dargruel (spawn
// + Demon's Gift), Thaelis (spawn), Raphael (spawn), Apostle (spawn +
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
    _enemySnapshotAtk(enemies[enemies.length - 1], 'dargruel');
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
        // docs/combat-scaling-rebalance.md Part 3
        const healBase = Math.min(0.15 * boss.maxHp, 0.20 * enemy.maxHp);
        const healMultiplier = enemy.levEnvy ? 1.15 : 1.0; // Envy: +15% heal
        let healAmount = (enemy.soulReaver ? healBase * 0.75 : healBase) * healMultiplier;
        const veilNormal = enemy.type === 'veilshroud' && !enemy.inPhantom;
        const veilPhantom = enemy.type === 'veilshroud' && enemy.inPhantom;
        if (veilPhantom) healAmount *= 0.75; // Phantom: -25% heal & shield received
        healAmount *= _walpurgisHealShieldMult(); // Walpurgis (Huyết Dạ): +5% heal effectiveness per stack

        // An allied Goliath in True Form routes this heal (and any overheal
        // shield) through its own sustain budget instead of receiving Demon
        // Gift's grant directly (docs/combat-scaling-rebalance.md Part 4).
        if (enemy.type === 'goliath' && enemy.phase === 'true_form') {
            const grantedHeal = _goliathDrawBudget(enemy, 'heal', _goliathHealBoost(enemy, healAmount));
            const overheal = Math.max(0, enemy.hp + healAmount - enemy.maxHp);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + grantedHeal);
            if (overheal > 0) {
                const shieldGain = Math.ceil(overheal * 0.20); // docs/combat-scaling-rebalance.md Part 3
                _goliathGrantShield(enemy, _goliathDrawBudget(enemy, 'shield', _goliathHealBoost(enemy, shieldGain)));
            }
        } else {
            const potentialHp = enemy.hp + healAmount;
            if (potentialHp > enemy.maxHp) {
                const overheal = potentialHp - enemy.maxHp;
                let shieldGain = Math.ceil(overheal * 0.20); // docs/combat-scaling-rebalance.md Part 3
                if (enemy.soulReaver) shieldGain *= 0.75;
                if (veilNormal) shieldGain *= 1.20; // Alteration: +20% shield (docs/combat-scaling-rebalance.md Part 3)
                if (veilPhantom) shieldGain *= 0.75; // Phantom: -25% shield
                _addEnemyShield(enemy, shieldGain);
            } else if (veilNormal) {
                // Alteration: khiên bằng 50% lượng HP thực tế hồi được, không phải
                // toàn bộ lượng heal (docs/combat-scaling-rebalance.md Part 3);
                // _addEnemyShield's own aggregate cap still applies on top.
                _addEnemyShield(enemy, healAmount * 0.50);
            }
            enemy.hp = Math.min(enemy.maxHp, potentialHp);
        }
        if (veilNormal) enemy._veilHealDRExpiry = performance.now() + 3000;

        enemy.demonGiftStacks = (enemy.demonGiftStacks || 0) + 1;
        if (enemy.demonGiftStacks > 2) enemy.demonGiftStacks = 2;
        enemy.demonGiftEndTime = performance.now() + 4000;
        enemy._demonGiftAuraEnd = enemy.demonGiftEndTime;
    });
}

// Reincarnation (Thaelis): death no longer splits into 3 weak Embryos that
// silently hatch into basic Apostles - it collapses into a single Cocoon at
// the death spot. The Cocoon itself carries no HP at all and cannot be
// damaged, healed, or shielded by anything (CC immune, Iron Body, fully
// untargetable - see the early return in dealDamage). The only way to
// destroy it for good is to kill a random number of its Guards within the
// 7.5s window; each Guard has its own flat HP pool and respawns individually
// 0.5s after death. Killing enough Guards in time means Thaelis is dead for
// good; falling short means the real Thaelis climbs back out, fully itself
// (not a downgraded copy), at reduced Max HP.
const THAELIS_COCOON_DURATION = 7500;
const THAELIS_COCOON_GUARD_COUNT = 4; // kept alive at all times
const THAELIS_COCOON_GUARD_HP_MIN = 500; // flat, not tied to Thaelis's own Max HP anymore
const THAELIS_COCOON_GUARD_HP_MAX = 1000;
const THAELIS_COCOON_GUARD_DR = 0.40; // Guards are the real damage sink now, some DR keeps them from melting instantly
const THAELIS_COCOON_GUARD_FLAT_DR = 20; // subtracted after the % cut above, same pattern as Walpurgis/Leviathan's own flat DR
const THAELIS_COCOON_GUARD_RESPAWN_MS = 1050;
const THAELIS_COCOON_GUARD_SHIELD_GRANT = 250; // flat Shield banked per Guard kill, carried over to Thaelis if it revives (see _reviveThaelis, capped there at 50% revived Max HP) - purely a reward, doesn't affect the kill-count win condition. docs/combat-scaling-rebalance.md Part 3
const THAELIS_COCOON_KILLS_NEEDED_MIN = 12; // random per Cocoon, how many Guard kills within the 9s actually destroys it
const THAELIS_COCOON_KILLS_NEEDED_MAX = 16;
const THAELIS_REVIVE_HP_PCT = 0.40;
const THAELIS_REVIVE_INVULN_MS = 1000;
const THAELIS_COCOON_RETRIGGER_COOLDOWN_MS = 12000; // a revived Thaelis can't cocoon again this soon if it dies right away
// Iron Body counts one layer per beat, like Raphael's Custos but quicker, so a burst spends one layer
const THAELIS_IRON_BODY_BEAT_MS = 200;
const THAELIS_REVIVE_IRON_BODY = 4; // Iron Body layers (one whole hit each) a Thaelis wears after climbing out of its Cocoon

// angle is passed when respawning, so the replacement stands where the dead
// guard stood rather than on top of one that's still alive
function _spawnThaelisCocoonGuard(cocoon, angle) {
    const hp = Math.round(THAELIS_COCOON_GUARD_HP_MIN + Math.random() * (THAELIS_COCOON_GUARD_HP_MAX - THAELIS_COCOON_GUARD_HP_MIN));
    if (angle === undefined) {
        const slot = (cocoon._cocoonGuardSlot = (cocoon._cocoonGuardSlot || 0) + 1);
        angle = (slot / THAELIS_COCOON_GUARD_COUNT) * Math.PI * 2;
    }
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
            e._noKillReward = true; // a cleared guard was never killed, so no score or kill procs
            e.hp = 0;
        }
    }
}

function _spawnThaelisCocoon(deadThaelis) {
    const killsNeeded = THAELIS_COCOON_KILLS_NEEDED_MIN + Math.floor(Math.random() * (THAELIS_COCOON_KILLS_NEEDED_MAX - THAELIS_COCOON_KILLS_NEEDED_MIN + 1));
    const cocoon = {
        x: deadThaelis.x, y: deadThaelis.y, size: deadThaelis.size * 0.85,
        speed: 0,
        // No real HP pool - hp/maxHp are just a fixed placeholder so every
        // other system that assumes an enemy has valid hp/maxHp (bars,
        // evade math, etc.) keeps working; the Cocoon is untargetable so
        // this value can never actually change except at final resolution,
        // where it's set to 0 to trigger the normal death cleanup.
        hp: 1, maxHp: 1, shield: 0,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,
        type: 'thaelis_cocoon',
        _cocoonOriginalMaxHp: deadThaelis.maxHp,
        _cocoonOriginalSize: deadThaelis.size,
        _cocoonTimer: THAELIS_COCOON_DURATION,
        _cocoonGuardRespawnTimers: [],
        _cocoonKillsNeeded: killsNeeded,
        _cocoonKillsSoFar: 0,
    };
    // the Cocoon keeps Thaelis's Ordeal state and can still fire the waves already stored while it holds out
    for (const k of ['_ordealPts', '_ordealDmg', '_ordealQueue', '_ordealCd', '_ordealIdle', '_ordealBonus', '_ordealSlowPts', '_ordealCastAt', '_ordealCastAngle']) cocoon[k] = deadThaelis[k] || 0;
    cocoon._ordealGlow = 0; cocoon._ordealShieldHit = 0;
    if (cocoon._ordealCastAt === 0) cocoon._ordealCastAt = -1e9;
    cocoon._ordealAtk = (deadThaelis.atk || 0) * _enemyEnrageMult(deadThaelis);
    enemies.push(cocoon);
    for (let i = 0; i < THAELIS_COCOON_GUARD_COUNT; i++) _spawnThaelisCocoonGuard(cocoon);
}

// Called once when a Thaelis or its Cocoon reaches 0 HP. A Thaelis off its Cocoon cooldown falls into a Cocoon;
// one that dies inside the cooldown, and a Cocoon that is destroyed before it hatches, is slain for good.
// render/enemy-thaelis-warrior.js draws the effect from _thaelisDeathFx.
function _thaelisOnDeath(enemy) {
    if (enemy._deathHandled) return;
    enemy._deathHandled = true;
    if (enemy.type === 'thaelis') {
        if (!enemy._cocoonCooldownUntil || performance.now() >= enemy._cocoonCooldownUntil) {
            _spawnThaelisCocoon(enemy);
            _thaelisDeathFxAdd(enemy.x, enemy.y, enemy.size / 2, 'fall');
        } else _thaelisDeathFxAdd(enemy.x, enemy.y, enemy.size / 2, 'slain');
    } else if (enemy.type === 'thaelis_cocoon' && !enemy._cocoonHatched) {
        _thaelisDeathFxAdd(enemy.x, enemy.y, (enemy._cocoonOriginalSize || enemy.size / 0.85) / 2, 'slain');
    }
}

function _thaelisDeathFxAdd(x, y, r, kind) {
    if (_thaelisDeathFx.length >= 6) _thaelisDeathFx.shift();
    _thaelisDeathFx.push({ x: x, y: y, r: r, kind: kind, age: 0, dur: kind === 'slain' ? 1800 : 1000, rot: performance.now() / 3000 });
    if (kind === 'slain') {
        if (typeof _setShake === 'function') _setShake(12, 380);
        createParticles(x, y, 30, '#ff4a3c', 4, 12);
        createParticles(x, y, 20, '#ffd45a', 3, 10);
    } else {
        if (typeof _setShake === 'function') _setShake(6, 200);
        createParticles(x, y, 18, '#ffd45a', 3, 9);
    }
    if (window.AudioMgr) window.AudioMgr.playSfxAt(kind === 'slain' ? 'thaelis-slain' : 'thaelis-fall', x, y);
}

// Cocoon survived its full timer: the real Thaelis climbs back out at the
// same spot, fully itself (not a downgraded copy) but at reduced Max HP, with
// a brief invulnerability window so it isn't punished for the exact frame it
// reappears on.
function _reviveThaelis(cocoon) {
    // Base revive HP: 40% of its original Max HP.
    const _reviveBaseHp = Math.ceil(cocoon._cocoonOriginalMaxHp * THAELIS_REVIVE_HP_PCT);
    // Reincarnation buff: +100% Max HP (the base amount, doubled) on top of
    // that, alongside the +20% DR / +250 flat DR it also gets from now on
    // (see dealDamage, entities/core.js) - surviving the Cocoon comes back
    // stronger, not just a diminished remnant. `reincarnated: true` marks
    // this lineage for those DR bonuses.
    const hp = Math.max(1, _reviveBaseHp * 2);
    // Banked Guard Shield carries over up to 50% of the revived Max HP, and the revive itself adds a free 20% on top.
    const _bankedShield = Math.min(cocoon.shield || 0, hp * 0.50) + hp * 0.20;
    enemies.push({
        x: cocoon.x, y: cocoon.y, size: cocoon._cocoonOriginalSize || cocoon.size / 0.85,
        speed: (1 + Math.random() * 2) * 0.8 * 0.80 * 0.80,
        hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,
        // Shield banked from every Guard sacrificed while the Cocoon held out
        // carries straight over as a head start, instead of being wasted.
        shield: _bankedShield,
        type: 'thaelis', shootTimer: 1000, reincarnated: true,
        _ibThrottleMs: THAELIS_IRON_BODY_BEAT_MS,
        _shieldPeak: _bankedShield,
        // climbing out of the Cocoon wears 5 Iron Body layers, each soaks one whole hit (see dealDamage, entities/core.js)
        ironBodyHits: THAELIS_REVIVE_IRON_BODY,
        _tenacityBarrier70: false, _tenacityBarrier40: false, _tenacityBarrier10: false,
        _reviveInvulnEnd: performance.now() + THAELIS_REVIVE_INVULN_MS,
        _justRevivedAt: performance.now(),
        // Cooldown before THIS lineage can cocoon again if it dies right
        // away - without this a revived Thaelis could chain-cocoon forever.
        _cocoonCooldownUntil: performance.now() + THAELIS_COCOON_RETRIGGER_COOLDOWN_MS,
    });
    _enemySnapshotAtk(enemies[enemies.length - 1], 'thaelis');
    // half of the Ordeal points the dead Thaelis held come back with it
    _thaelisOrdealInit(enemies[enemies.length - 1], Math.floor(_thaelisOrdealPoints(cocoon) / 2));
    addExplosion(cocoon.x, cocoon.y, cocoon.size * 1.6, '#22cc55');
    createParticles(cocoon.x, cocoon.y, 40, '#22cc55', 3, 10);
    _setShake(10, 300);
    // the rebirth is a story beat, so it is heard at full strength wherever the cocoon hatches
    if (window.AudioMgr) window.AudioMgr.playSfx('thaelis-reborn');
}

function spawnThaelis() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    // Early-game floor bumped 1100 -> 1265 (+15%), on top of the separate
    // +15% global HP buff multiplier below - Thaelis specifically reads too
    // squishy in the first waves compared to other Abnormal-tier enemies.
    let hp = Math.ceil(Math.min(3170, 1520 + hpFromTime * 64) * 1.15 * _walpurgisHpMult());
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8 * 0.80 * 0.80 * 0.92,   // 8% slower than the old default
        hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'thaelis', shootTimer: 1000, reincarnated: false,
        _ibThrottleMs: THAELIS_IRON_BODY_BEAT_MS,
        _shieldPeak: 0,
        _tenacityBarrier70: false, _tenacityBarrier40: false, _tenacityBarrier10: false
    });
    _enemySnapshotAtk(enemies[enemies.length - 1], 'thaelis');
    _thaelisOrdealInit(enemies[enemies.length - 1], 0);
    if (window.AudioMgr) window.AudioMgr.playSfx('thaelis-spawn');
}

function spawnRaphael() {
    const baseSize = (20 + Math.random() * 10);
    const size = ((baseSize * 5) / 2) * 0.7;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.ceil(Math.min(4500, 2500 + hpFromTime * 64) * 1.15 * _walpurgisHpMult()); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.32, hp: hp, maxHp: hp, // per AanSensei: nudged down a bit (was 0.367)
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'raphael', shootTimer: 0,
        raphaelInvulnerable: true, raphaelCustosHits: 0, raphaelShieldReceived: false
    });
    _enemySnapshotAtk(enemies[enemies.length - 1], 'raphael');
    if (window.AudioMgr) window.AudioMgr.startRaphaelIdle();
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
    _enemySnapshotAtk(enemies[enemies.length - 1], 'apostle');
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

// Ulysses' Return. Thaelis banks Ordeal points from the damage it takes, three
// points queue one wave, and every wave is its own object in _thaelisWaves, so
// a cast that has begun keeps going even when Thaelis dies during the gate.
const THAELIS_ORDEAL_CHUNK = 0.04;      // share of Max HP in landed damage that earns 1 point
const THAELIS_ORDEAL_CHUNK_LOW = 0.03;  // same share while Thaelis is under 40% HP
const THAELIS_ORDEAL_HIT_MAX = 2;       // most points one hit can give
const THAELIS_ORDEAL_COST = 3;          // points per queued wave
const THAELIS_ORDEAL_MAX_QUEUE = 2;
const THAELIS_ORDEAL_IDLE_MS = 6000;    // a point arrives on its own at this pace
const THAELIS_ORDEAL_CD = 4000;         // pause between two casts of one Thaelis
const THAELIS_ORDEAL_MIN_GAP = 2500;    // overflow can shorten that pause, never below this
const THAELIS_ORDEAL_MAX_WAVES = 6;     // waves alive at once, several Thaelis can cast together
const THAELIS_ORDEAL_OVER_CD = 500;     // cooldown shaved by each point earned past a full queue
const THAELIS_ORDEAL_OVER_DMG = 0.04;   // wave damage added by each such point
const THAELIS_ORDEAL_OVER_DMG_MAX = 0.20;
const THAELIS_ORDEAL_SLOW_POINTS = 4;   // such points that make the next wave leave a slowing lane
const THAELIS_WAVE_GATE_MS = 900;
const THAELIS_WAVE_HALF_WIDTH = 100;    // Marchosias's blade has radius 88
const THAELIS_WAVE_SPEED = 15;
const THAELIS_WAVE_FRONT = 36;
const THAELIS_WAVE_LANE_MS = 1500;
const THAELIS_WAVE_LANE_SLOW = 0.75;
const THAELIS_WAVE_COEFF = [0.45, 0.38, 0.35]; // x snapshotted atk on a Sentinel, 1st, 2nd, 3rd hit
const THAELIS_WAVE_FOCUS_TARGETS = 3;   // a wave with fewer targets than this in its lane when it leaves is a focused wave
const THAELIS_WAVE_FOCUS_MULT = 1.5;    // damage of a focused wave
const THAELIS_WAVE_BODY = 360;         // length of the wave's trail behind its front, every ally shot inside it is cut

// Penelope's Shroud, axe parry. Thaelis can cut a hit out of the air with its axe, which blocks that hit whole.
const THAELIS_PARRY_CHANCE = 0.15;          // per hit while no Shield stands
const THAELIS_PARRY_CHANCE_SHIELDED = 0.08; // per hit while a Shield stands
const THAELIS_PARRY_CD_MS = 1200;           // the axe needs this long before it can parry again
const THAELIS_PARRY_BUSY_MS = 400;          // after a wave's gate closes the axe is still chopping

// Rolls the parry for one hit. Damage over time and the Spirit Laser cannot be parried, nor can anything that
// passes Iron Body. The axe can parry while Ulysses' Return gathers, but not while it chops.
function _thaelisTryParry(enemy, source) {
    if (!(source.damage > 0 || source.percentDamage > 0) || source._bypassIronBody || source.isSpiritLaser) return false;
    if (source.isTeslaDot || source._isDtuDot || source._isNocToiDot || source._isSthDot || source._isSrDot || source._isTyVenomDot) return false;
    if (_thaelisClock - (enemy._parryClock === undefined ? -1e9 : enemy._parryClock) < THAELIS_PARRY_CD_MS) return false;
    const castAge = _thaelisClock - (enemy._ordealCastAt === undefined ? -1e9 : enemy._ordealCastAt);
    if (castAge >= THAELIS_WAVE_GATE_MS && castAge < THAELIS_WAVE_GATE_MS + THAELIS_PARRY_BUSY_MS) return false;
    if (Math.random() >= ((enemy.shield || 0) > 0 ? THAELIS_PARRY_CHANCE_SHIELDED : THAELIS_PARRY_CHANCE)) return false;
    _thaelisParry(enemy, Number.isFinite(source.x) ? source.x : player.x, Number.isFinite(source.y) ? source.y : player.y);
    return true;
}

// The parry itself: render swings the axe across the line the hit came down (see _parryAt, _parryAngle).
function _thaelisParry(enemy, fromX, fromY) {
    let a = Math.atan2(fromY - enemy.y, fromX - enemy.x);
    if (!Number.isFinite(a) || (fromX === enemy.x && fromY === enemy.y)) a = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy._parryClock = _thaelisClock;
    enemy._parryAt = performance.now();
    enemy._parryAngle = a;
    const r = enemy.size / 2;
    createParticles(enemy.x + Math.cos(a) * r * 1.5, enemy.y + Math.sin(a) * r * 1.5, 12, '#ffe6d0', 3, 9);
    createParticles(enemy.x + Math.cos(a) * r * 1.5, enemy.y + Math.sin(a) * r * 1.5, 8, '#ff4a3c', 2, 7);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('thaelis-parry', enemy.x, enemy.y);
}

function _thaelisOrdealInit(enemy, carryPoints) {
    enemy._ordealPts = 0; enemy._ordealDmg = 0; enemy._ordealQueue = 0; enemy._ordealShieldHit = 0;
    enemy._ordealCd = 3000 + Math.random() * 2000; enemy._ordealIdle = 0;
    enemy._ordealBonus = 0; enemy._ordealSlowPts = 0; enemy._ordealGlow = 0; enemy._ordealCastAt = -1e9;
    // render poses the warrior from the cast time (gather, then chop, then bá khí rising) and aims the chop along the wave
    enemy._ordealCastAngle = Math.PI / 2;
    if (carryPoints > 0) _thaelisOrdealAddPoints(enemy, carryPoints);
}

function _thaelisOrdealPoints(enemy) {
    return (enemy._ordealQueue || 0) * THAELIS_ORDEAL_COST + (enemy._ordealPts || 0);
}

function _thaelisOrdealAddPoints(enemy, n) {
    for (let i = 0; i < n; i++) {
        enemy._ordealGlow = 1;
        if (enemy._ordealQueue >= THAELIS_ORDEAL_MAX_QUEUE) {
            enemy._ordealCd = Math.max(0, enemy._ordealCd - THAELIS_ORDEAL_OVER_CD);
            enemy._ordealBonus = Math.min(THAELIS_ORDEAL_OVER_DMG_MAX, enemy._ordealBonus + THAELIS_ORDEAL_OVER_DMG);
            enemy._ordealSlowPts++;
        } else if (++enemy._ordealPts >= THAELIS_ORDEAL_COST) {
            enemy._ordealPts -= THAELIS_ORDEAL_COST;
            enemy._ordealQueue++;
        }
    }
}

// Called with the damage a hit actually landed (shield and Max HP together).
function _thaelisOrdealGain(enemy, amount) {
    if (!(amount > 0) || !(enemy.hp > 0) || enemy._ordealPts === undefined) return;
    const chunk = enemy.maxHp * (enemy.hp / enemy.maxHp < 0.4 ? THAELIS_ORDEAL_CHUNK_LOW : THAELIS_ORDEAL_CHUNK);
    enemy._ordealDmg += amount;
    const whole = Math.floor(enemy._ordealDmg / chunk);
    if (whole <= 0) return;
    enemy._ordealDmg -= whole * chunk;
    _thaelisOrdealAddPoints(enemy, Math.min(THAELIS_ORDEAL_HIT_MAX, whole));
}

function updateThaelisOrdeal(enemy, deltaTime, now) {
    if (enemy._ordealPts === undefined) _thaelisOrdealInit(enemy, 0);
    // Tenacity quickens the whole cycle as Thaelis loses HP
    const lost = 1 - enemy.hp / enemy.maxHp;
    const dt = deltaTime * (1 + Math.min(0.20, lost * 0.1));
    enemy._ordealGlow = Math.max(0, enemy._ordealGlow - deltaTime / 400);
    if (enemy._ordealCd > 0) enemy._ordealCd -= dt;
    // the Cocoon only fires waves already stored, it earns no points
    if (enemy.type !== 'thaelis_cocoon') {
        enemy._ordealIdle += dt;
        if (enemy._ordealIdle >= THAELIS_ORDEAL_IDLE_MS) { enemy._ordealIdle = 0; _thaelisOrdealAddPoints(enemy, 1); }
    }
    if (enemy._ordealQueue <= 0 || enemy._ordealCd > 0) return;
    if (_thaelisClock - enemy._ordealCastAt < THAELIS_ORDEAL_MIN_GAP) return;
    if (enemy._reviveInvulnEnd && now < enemy._reviveInvulnEnd) return;
    if (!_isCCImmune(enemy) && enemy._silencedEnd && now < enemy._silencedEnd) return;
    let alive = 0;
    for (let i = 0; i < _thaelisWaves.length; i++) if (_thaelisWaves[i].phase !== 'lane') alive++;
    if (alive >= THAELIS_ORDEAL_MAX_WAVES) return;
    _castThaelisWave(enemy);
}

function _castThaelisWave(enemy) {
    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y) || player;
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const slow = enemy._ordealSlowPts >= THAELIS_ORDEAL_SLOW_POINTS;
    // Tenacity: +3.5% wave speed per 0.5% HP lost, capped at +25%
    const speedBonus = Math.min(0.25, (1 - enemy.hp / enemy.maxHp) * 7.0);
    _thaelisWaves.push({
        type: 'thaelis_wave', phase: 'gate', timer: THAELIS_WAVE_GATE_MS, dur: THAELIS_WAVE_GATE_MS,
        ox: enemy.x, oy: enemy.y, x: enemy.x, y: enemy.y, angle: angle,
        halfWidth: THAELIS_WAVE_HALF_WIDTH, radius: THAELIS_WAVE_HALF_WIDTH,
        speed: THAELIS_WAVE_SPEED * (1 + speedBonus), s: 0, prevS: 0,
        // a turned wave goes back to its caster, so the Dau reflect reads the owner and the heading
        owner: enemy, vx: Math.cos(angle) * THAELIS_WAVE_SPEED * (1 + speedBonus), vy: Math.sin(angle) * THAELIS_WAVE_SPEED * (1 + speedBonus),
        atk: (enemy.type === 'thaelis_cocoon' ? enemy._ordealAtk || 0 : (enemy.atk || 0) * _enemyEnrageMult(enemy)) * (1 + enemy._ordealBonus),
        len: _thaelisLaneLength(enemy.x, enemy.y, angle),
        slow: slow, hitPlayer: false, hitEnemies: [], born: _thaelisClock,
    });
    enemy._ordealQueue--;
    enemy._ordealCd = THAELIS_ORDEAL_CD;
    enemy._ordealBonus = 0;
    if (slow) enemy._ordealSlowPts = 0;
    enemy._ordealCastAt = _thaelisClock;
    enemy._ordealCastAngle = angle;
    createParticles(enemy.x, enemy.y, 14, '#ff8a5c', 2, 7);
    // energy gathers at Thaelis while the gate lights
    if (window.AudioMgr) window.AudioMgr.playSfxAt('thaelis-wave-charge', enemy.x, enemy.y);
}

// The wave cuts every ally shot (the ship's bullets, Sentinel spears, spirit bullets) that crosses its front or its trail.
function _thaelisWaveCutShots(w) {
    const lists = [bullets, spiritBullets];
    const ca = Math.cos(w.angle), sa = Math.sin(w.angle);
    for (let li = 0; li < lists.length; li++) {
        const list = lists[li];
        for (let j = list.length - 1; j >= 0; j--) {
            const b = list[j];
            if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
            const dx = b.x - w.ox, dy = b.y - w.oy, rad = (b.size || 6) * 0.5;
            const t = dx * ca + dy * sa, d = Math.abs(-dx * sa + dy * ca);
            if (d >= w.halfWidth + rad || t < w.s - THAELIS_WAVE_BODY || t > w.s + rad) continue;
            // render draws a Thaelis spark at each cut shot from this list
            if (_thaelisCutFx.length < 24) _thaelisCutFx.push({ x: b.x, y: b.y, angle: w.angle, age: 0 });
            if (_gfxLevel < 2 && window._bulletSlashFx.length < 48) window._bulletSlashFx.push({ x: b.x, y: b.y, angle: w.angle + 0.7, r: Math.max(3, b.size || 6), large: false, age: 0 });
            if (!_mobPerf) createParticles(b.x, b.y, 2, '#ffd88a', 1, 4);
            list.splice(j, 1);
        }
    }
}

// Where the lane leaves the screen, so the warning, the hoops and the wave cover only what the player can see.
function _thaelisLaneLength(ox, oy, angle) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const tx = ca > 0.0001 ? (canvas.width - ox) / ca : ca < -0.0001 ? -ox / ca : Infinity;
    const ty = sa > 0.0001 ? (canvas.height - oy) / sa : sa < -0.0001 ? -oy / sa : Infinity;
    return Math.max(300, Math.min(tx, ty) + 60);
}

// Whether a point stands anywhere in a wave's lane, ahead of its origin.
function _thaelisInLane(w, px, py, rad) {
    const dx = px - w.ox, dy = py - w.oy, ca = Math.cos(w.angle), sa = Math.sin(w.angle);
    const t = dx * ca + dy * sa, d = Math.abs(-dx * sa + dy * ca);
    return d < w.halfWidth + rad && t >= 0 && t <= w.len;
}

// Where a point sits against a wave: t along its heading, d across it.
function _thaelisWaveHits(w, px, py, rad) {
    const dx = px - w.ox, dy = py - w.oy, ca = Math.cos(w.angle), sa = Math.sin(w.angle);
    const t = dx * ca + dy * sa, d = Math.abs(-dx * sa + dy * ca);
    if (d >= w.halfWidth + rad) return false;
    return t >= w.prevS - THAELIS_WAVE_FRONT - rad && t <= w.s + rad;
}

// The three idle loops run while a Thaelis stands on the field and stop when none is left.
let _thaelisIdleOn = false;
function _thaelisIdleTick() {
    let alive = false;
    for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (e.type === 'thaelis' && e.hp > 0 && !e._markedForDeath) { alive = true; break; } }
    if (alive === _thaelisIdleOn) return;
    _thaelisIdleOn = alive;
    if (window.AudioMgr) { if (alive) window.AudioMgr.startThaelisIdle(); else window.AudioMgr.stopThaelisIdle(); }
}
// a run ending or restarting silences the loops and lets the tick start them again
function _thaelisAudioReset() {
    _thaelisIdleOn = false;
    if (window.AudioMgr) window.AudioMgr.stopThaelisIdle();
}

function updateThaelisWaves(deltaTime) {
    _thaelisIdleTick();
    _thaelisClock += deltaTime;
    for (let i = _thaelisDeathFx.length - 1; i >= 0; i--) {
        _thaelisDeathFx[i].age += deltaTime;
        if (_thaelisDeathFx[i].age > _thaelisDeathFx[i].dur) _thaelisDeathFx.splice(i, 1);
    }
    for (let i = _thaelisCutFx.length - 1; i >= 0; i--) {
        _thaelisCutFx[i].age += deltaTime;
        if (_thaelisCutFx[i].age > 320) _thaelisCutFx.splice(i, 1);
    }
    const dt = deltaTime / 16.67;
    for (let i = _thaelisWaves.length - 1; i >= 0; i--) {
        const w = _thaelisWaves[i];
        if (w.phase === 'gate') {
            w.timer -= deltaTime;
            if (w.timer <= 0) {
                w.phase = 'fly';
                // counted as the wave leaves: Sentinels and the ship standing in its lane. Under 3 and it hits 50% harder
                let inLane = _thaelisInLane(w, player.x, player.y, player.hitRadius) ? 1 : 0;
                for (const s of sentinels) if (_thaelisInLane(w, s.x, s.y, s.size)) inLane++;
                if (inLane < THAELIS_WAVE_FOCUS_TARGETS) { w.focus = true; w.atk *= THAELIS_WAVE_FOCUS_MULT; }
                if (window.AudioMgr) window.AudioMgr.playSfxAt('thaelis-wave-sweep', w.ox, w.oy);
                // the axe chop layers its own hit on top of the sweep, its peak lands as the swing finishes
                if (window.AudioMgr) window.AudioMgr.playSfxAt('thaelis-ulysses-slash', w.ox, w.oy);
                // the wave tears through the air for as long as it flies
                if (window.AudioMgr) window.AudioMgr.playSfxAt('thaelis-wave-fly', w.ox, w.oy);
                if (typeof _setShake === 'function') _setShake(9, 240);
            }
            continue;
        }
        if (w.phase === 'lane') {
            w.timer -= deltaTime;
            if (w.timer <= 0) _thaelisWaves.splice(i, 1);
            continue;
        }
        w.prevS = w.s;
        w.s += w.speed * dt;
        const ca = Math.cos(w.angle), sa = Math.sin(w.angle);
        // The player takes one life, then the Yuusha redirect and shield layers apply as for any hit
        if (!w.hitPlayer && _thaelisWaveHits(w, player.x, player.y, player.hitRadius)) {
            w.hitPlayer = true;
            const tp = (player.x - w.ox) * ca + (player.y - w.oy) * sa;
            w.x = w.ox + ca * tp; w.y = w.oy + sa * tp;
            if (typeof _yuushaPierceRedirect !== 'function' || !_yuushaPierceRedirect(THAELIS_WAVE_COEFF[0] * w.atk, false, w)) playerTakesHit(w);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('thaelis-wave-hit', player.x, player.y);
        }
        for (const s of sentinels) {
            if (w.hitEnemies.includes(s) || !_thaelisWaveHits(w, s.x, s.y, s.size)) continue;
            const ts = (s.x - w.ox) * ca + (s.y - w.oy) * sa;
            w.x = w.ox + ca * ts; w.y = w.oy + sa * ts;
            const coeff = THAELIS_WAVE_COEFF[Math.min(w.hitEnemies.length, THAELIS_WAVE_COEFF.length - 1)];
            dealDamage(s, { damage: w.atk * coeff, _noHitSfx: true, _attackerType: 'thaelis', _capSource: w, _capKind: 'skill' });
            w.hitEnemies.push(s);
            addExplosion(s.x, s.y, 20, '#ffb030');
            if (window.AudioMgr) window.AudioMgr.playSfxAt('thaelis-wave-hit', s.x, s.y);
        }
        w.x = w.ox + ca * w.s; w.y = w.oy + sa * w.s;
        _thaelisWaveCutShots(w);
        if (w.s > w.len + THAELIS_WAVE_BODY) {
            if (w.slow) { w.phase = 'lane'; w.timer = THAELIS_WAVE_LANE_MS; }
            else _thaelisWaves.splice(i, 1);
        }
    }
}

// The lane a slowing wave leaves behind drags at the ship, same hook the Duat sand pits use.
function _thaelisLaneSlowMult() {
    let m = 1;
    for (let i = 0; i < _thaelisWaves.length; i++) {
        const w = _thaelisWaves[i];
        if (!w.slow || w.phase === 'gate') continue;
        const dx = player.x - w.ox, dy = player.y - w.oy, ca = Math.cos(w.angle), sa = Math.sin(w.angle);
        const t = dx * ca + dy * sa, d = Math.abs(-dx * sa + dy * ca);
        const reach = w.phase === 'lane' ? w.len : w.s;
        if (d < w.halfWidth + player.hitRadius && t >= 0 && t <= reach) m = Math.min(m, THAELIS_WAVE_LANE_SLOW);
    }
    return m;
}

// Penelope's Shroud. Like the shroud she wove by day and unwove by night, Thaelis keeps
// mending itself. Damage its shield soaks heals it, and with no shield standing it
// recovers on its own. Healing and shield effectiveness are stronger while it is bare.
const THAELIS_SHROUD_ABSORB_HEAL = 0.38;   // share of the damage a shield soaks that comes back as HP
const THAELIS_SHROUD_REGEN = 0.015;        // Max HP per second while no shield stands
const THAELIS_SHROUD_BARE_BONUS = 0.35;    // heal and shield effectiveness while no shield stands
const THAELIS_SHROUD_WARDED_BONUS = 0.10;  // the same while a shield stands
const THAELIS_SHROUD_SOUL_REAVER = 0.60;   // Soul Reaver cuts its healing like any other enemy's
const THAELIS_SHROUD_OVERHEAL_SHIELD = 0.55; // share of any healing past its Max HP that turns into shield

// Multiplier for every heal and shield Thaelis receives, read from its shield at that moment.
function _thaelisSustainMult(enemy) {
    return 1 + ((enemy.shield || 0) > 0 ? THAELIS_SHROUD_WARDED_BONUS : THAELIS_SHROUD_BARE_BONUS);
}

// Heals Thaelis by amount after effectiveness; returns the HP actually restored.
function _thaelisShroudHeal(enemy, amount) {
    if (!(amount > 0) || !(enemy.hp > 0) || enemy._markedForDeath) return 0;
    let heal = amount * _thaelisSustainMult(enemy) * _walpurgisHealShieldMult();
    if (enemy.soulReaver) heal *= THAELIS_SHROUD_SOUL_REAVER;
    const before = enemy.hp, room = enemy.maxHp - enemy.hp;
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
    // render reads this to keep a mending glow up while any heal keeps landing
    if (enemy.hp > before) enemy._shroudHealAt = performance.now();
    if (heal > room) _thaelisOverhealToShield(enemy, heal - room);
    return enemy.hp - before;
}

// Healing past Max HP is not lost: 55% of it becomes shield, which still follows the usual shield rules and cap.
function _thaelisOverhealToShield(enemy, overheal) {
    if (!(overheal > 0)) return;
    const before = enemy.shield || 0;
    _addEnemyShield(enemy, overheal * THAELIS_SHROUD_OVERHEAL_SHIELD);
    const gained = (enemy.shield || 0) - before;
    if (!(gained > 0)) return;
    // render reads these to show healing spilling over into the shield ring
    enemy._shroudOverflowAt = performance.now();
    enemy._shroudOverflowAmt = gained;
}

// Called by dealDamage with the damage the shield just soaked, before the shield shrinks.
function _thaelisShroudAbsorb(enemy, absorbed) {
    const healed = _thaelisShroudHeal(enemy, absorbed * THAELIS_SHROUD_ABSORB_HEAL);
    if (healed <= 0) return;
    // render reads these to flash the mend: when it happened and how much HP came back
    enemy._shroudMendAt = performance.now();
    enemy._shroudMendAmt = healed;
    if (!_mobPerf && Math.random() < 0.3) createParticles(enemy.x, enemy.y, 1, '#ffd88a', 1, 4);
}

// Per frame: with no shield standing Thaelis recovers 1.5% of its Max HP per second.
function updateThaelisShroud(enemy, deltaTime) {
    if ((enemy.shield || 0) > 0 || !(enemy.hp > 0) || enemy.hp >= enemy.maxHp) return;
    if (enemy._reviveInvulnEnd && performance.now() < enemy._reviveInvulnEnd) return;
    _thaelisShroudHeal(enemy, enemy.maxHp * THAELIS_SHROUD_REGEN * deltaTime / 1000);
}
