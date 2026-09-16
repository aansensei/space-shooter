// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
const canvas = document.getElementById("gameCanvas");
// Synchronize presentation because each frame clears and redraws this canvas.
// Keep alpha enabled so the separate background canvas remains visible.
const ctx = canvas.getContext("2d", { desynchronized: false });
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// Default smoothing quality is browser-dependent and can look noticeably
// pixelated/aliased when the large generated sprite art (weapons, bullets,
// sentinel shell, etc.) gets scaled way down to its small in-game render
// size — request the browser's best resampling filter explicitly.
ctx.imageSmoothingQuality = "high";

// Fisher-Yates shuffle. `arr.sort(() => Math.random() - 0.5)` looks random
// but is measurably biased (V8's TimSort makes fewer comparisons than a true
// shuffle needs, so items tend to stay closer to their original position) —
// this was the reason certain sigils were showing up far less often in the
// picker than others. Always use this instead of a random sort comparator.
function _shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const btnMarginLeft = 20, btnMarginBottom = 20, btnRadius = 25, btnGap = 12;
let gameState = "start", lives = 12, score = 0, gameStartTime = 0;
let gameElapsedTime = 0; // Thời gian game thực tế (bị slow bởi Yog-Sothoth)
let _gameOverPlayTime = 0; // ms played, captured at game over
let nextLifeMilestone = 500000;

// atk: the player's attack-power stat every in-scope friendly damage
// formula is expressed as a coefficient of (docs/combat-scaling-rebalance.md).
// Starts at PLAYER_BASE_ATK and grows via _atkWaveMult() as waves clear
// (recalculated in _updateWaveSystem, main.js; reset here on a new run).
// Rescaled to a round 1000 baseline per AanSensei (was 115): every formula
// below that multiplies player.atk had its own coefficient divided by the
// same 115/1000 ratio, so that rescale alone didn't change output - only
// removing each formula's separate target-Max-HP percent term did. The
// +40% on top of that round 1000 (1400) is a deliberate compensating buff
// for the overall damage lost by that removal, per AanSensei's own request
// after reviewing live DPS/TTK verification data - a first-pass number,
// wave 15+ especially still needs its own retest after this.
const PLAYER_BASE_ATK = 1400;
const player = { x: canvas.width / 2, y: canvas.height - 60, width: 40, height: 40, speed: 8.6, hitRadius: 5.75, atk: PLAYER_BASE_ATK }; // must match the cyan dot drawn in render.js, change both or neither
let playerClones = [];
let lastAutoFire = 0;
const autoFireInterval = 135; // 135ms = base 168ms with the +20% fire rate bonus already baked in

let bullets = [], enemies = [], explosions = [], particles = [], chainLightningEffects = [], marchoDeathBursts = [], marchoBarrierBursts = [], raphaelDeathBursts = [], raphaelWisdomOrbs = [], raphaelWisdomZones = [];
let demonGiftEffect = { active: false, endTime: 0 };
let gloryForJusticeActive = false;
let finalDefense = { playerShield: true, boundaryShield: true, playerCooldownEnd: 0, boundaryCooldownEnd: 0 }; // both start true so they are ready from hit 1
let chainLightningCooldownEnd = 0;

let hasTriggeredLastStand = false;
let playerAbsoluteShield = false;

let bossShockwaves = [];
let raphaelLasers = [];
let marchosiasBlades = []; // Global array, blades tồn tại độc lập, không bị ngắt

// Accurate Parry (Yog-Sothoth)
let accurateParryActive = false;
let accurateParryEndTime = 0;

// Nội tại Vệ Binh
let sentinels = [];
let killCountForPassive = 0;
const MAX_SENTINELS = 12;

// Skill Shift: Yog-Sothoth (Thao túng Không Thời Gian)
let skillShiftActive = false;
let skillShiftChargeStart = 0;
const skillShiftCooldown = 11000; // base CD 11s (scales with hold duration)
let lastSkillShift = -Infinity; // -Infinity so the skill is ready immediately, 0 would lock it for 11s on start
const skillShiftMaxCharge = 3000; // 3 giây tụ lực tối đa
const skillShiftMaxHold = 8000; // 8 giây giữ tối đa tự hủy

// Skill A
let skillAOrbs = [], skillAActive = false, lastSkillA = -Infinity;
const skillACooldown = 6000, maxSkillAOrbs = 80;
let skillASensorRadius = 0;
let scatteredProjectiles = [];
let skillADefensiveCharges = 0;
let dimensionalRifts = []; // Dimensional Rift zones spawned on Skill A hit

// Skill S
let spirits = [];
const MAX_SPIRITS = 2; // kept for compatibility
let primevalEnergy = 0; // 0–100: Primeval Creation meter
let photoBrangs = []; // bouncing boomerangs from Phōtokrystos
let primevalSummonEffect = null; // summoning circle animation
let _spiritCooldownOverrideUntil = 0; // after Phōtokrystos BTM, force 40s CD
let lastSkillS = -Infinity;
const skillSCooldown = 12000;
let spiritBullets = [], spiritParticles = [], bladeArcProjectiles = [], spiritSpinners = [];

// Skill D
let skillDCharging = false, skillDChargeStartTime = 0;
const skillDChargeTime = 2000;
let deathStar = null, lastSkillD = -Infinity;
const skillDCooldown = 10000;
// Death Star's actual visible/contact radius = deathStar.size * this
// multiplier (matches the base disc drawn at size*2.5 scaled by DS_SCALE =
// 2.0/2.8 in js/render/skill-d.js) — shared between js/skills/skill-d.js's own contact
// check and entities.js's Galactic Spaceships proximity-spawn check so the
// two can never drift apart.
const SKILLD_CONTACT_MULT = 2.5 * (2.0 / 2.8);
window.skillDSpaceships = []; // allied drones spawned on Death Star kills
window.skillDLasers = []; // {startX,startY,endX,endY,life} — mark->laser cycle beams
window.skillDBolts = []; // {x1,y1,x2,y2,life} — short-lived spaceship firing-bolt visuals

// Skill F
let lastSkillF = -Infinity;
const skillFCooldown = 7000;
let skillFState = "ready", skillFChargeStart, skillFSweepStart;
const skillFSweepDuration = 1000;
// Great Sage sigil (Ransacked Treasury): up to 3 stolen enemy gems held at
// once, one of each kind (FIFO — oldest is the one spent first), each one an
// enemy type string from SKILL_F_ELITE_TIERS below. Never decays on its own.
let _greatSageGems = [];
// Great Sage sigil (Ransacked Treasury): widens the sweep cone with every
// kill landed during the current cast; resets to 0 at the start of each sweep
let _skillFKillsThisSweep = 0;
const SKILL_F_ELITE_TIERS = ['thaelis', 'raphael', 'egregor', 'marchosias', 'veilshroud', 'dargruel', 'leviathan', 'goliath'];
// Great Sage sigil only: impact flashes for the Ruyi staff sweep, one per
// enemy struck this sweep, drawn by js/render/skill-f.js and pruned there
let _skillFHitFlashes = [];
// Great Sage sigil only: active stolen-attack effects (telegraphs, sweeps,
// delayed strikes) spent gems enqueue - see _castStolenGemAttack/
// _updateGreatSageEffects in js/skills/sigil-great-sage.js and _drawGreatSageEffects in
// js/render/skill-f.js
let _greatSageEffects = [];

// Cancer sigil (Tidal Flow / Riptide Surge): fed by every hit a Gaia Barrier
// or a Tidal Flow Iron Body layer absorbs (see dealDamage, entities/core.js).
// Fills to TIDAL_SURGE_METER_MAX, then spawns a whirlpool and resets to 0.
let _tidalSurgeMeter = 0;
const TIDAL_SURGE_METER_MAX = 4000;
// Active whirlpools: {x, y, phase, timer, hitEnemies}. Advanced by
// _updateTidalSurge (js/skills/sigil-cancer.js), drawn by js/render/sigil-cancer.js.
let _tidalSurgeEffects = [];
// Cancer sigil (Lunar Aegis / Ocean Hunter): queued bite visuals, one per
// enemy executed at low HP - {x, y, spawnAt, duration, fromLeft}.
let _oceanHunterBites = [];

let screenShake = { intensity: 0, duration: 0 };
// Throttle: chỉ upgrade shake nếu mạnh hơn hoặc shake hiện tại đã hết
function _setShake(intensity, duration) {
    if (intensity >= screenShake.intensity || screenShake.duration <= 0) {
        screenShake = { intensity, duration };
    }
}

// Skill G
let skillGCharge = 0;
let skillGActive = false;
let skillGEndTime = 0;
let skillGBorderOpacity = 0;
let energyOrbs = [];
let teslaCoils = [];
const MAX_TESLA_COILS = 4;
const ENERGY_ORB_SIZE = 15;
const TESLA_COIL_SIZE = 20;
const TESLA_AURA_RADIUS = TESLA_COIL_SIZE * 10;

// Tụ đạn & Overload
let charging = false, chargeStartTime = 0;
const maxChargeTime = 1000;
const maxMultiplier = 10;
const overloadChargeTime = 3000;

// Tia laze
let laserActive = false, laserStartTime = 0, lastLaserTick = 0;
const laserDuration = 12000;
const laserCooldownDuration = 9000;
const laserTickInterval = 155;
let laserCooldownEnd = 0;

// Spawn enemy (legacy timer kept for Yog-Sothoth offset)
let lastEnemySpawn = 0;
const initialSpawnInterval = 1494, spawnDecreaseRate = 50, minSpawnInterval = 370;

// Combat scaling (docs/combat-scaling-rebalance.md Part 2): the wave-based
// growth multiplier every enemy's own ATK stat scales by - +2% per wave up
// to +30% at wave 16+, so bounded flat damage keeps some relevance against
// armor without compounding on top of Yuuki/Sigil multipliers, which already
// grow independently.
function _atkWaveMult(wave) { return 1 + 0.02 * Math.min(15, Math.max(0, wave - 1)); }

// Player-only wave growth (per AanSensei: buff the player's own scaling
// so it pulls ahead of the enemy curve above rather than tracking it 1:1).
// +3% per wave up to +57% at wave 20+, where it plateaus.
function _playerAtkWaveMult(wave) { return 1 + 0.03 * Math.min(19, Math.max(0, wave - 1)); }

// Per-sigil ATK bonus (per AanSensei): each of the 13 sigils grants a
// different flat percentage bump to player.atk on top of everything else,
// weighted toward how offense-focused that sigil's own theme is (Aries/
// Sagittarius highest, Taurus/Cancer's support-and-defense kits lowest).
// Additive across every equipped sigil, applied in _sigilAtkMult() below.
const SIGIL_ATK_BONUS = {
    aries: 0.12, taurus: 0.04, gemini: 0.08, cancer: 0.04, leo: 0.11,
    virgo: 0.09, libra: 0.08, scorpio: 0.08, sagittarius: 0.11,
    capricorn: 0.05, aquarius: 0.06, pisces: 0.05, than: 0.09,
};
function _sigilAtkMult() {
    const sigils = (typeof window !== 'undefined' && window._playerSigils) || [];
    let bonus = 0;
    for (const s of sigils) bonus += SIGIL_ATK_BONUS[s.sigilId] || 0;
    return 1 + bonus;
}

// Per-species enemy ATK base (E0) and the fixed Max HP calibration (H0)
// "own Max HP"-category attacks scale against (docs/combat-scaling-rebalance.md
// Part 2). E0 is unrelated to the species' actual spawn HP - it exists so an
// attack's threat doesn't silently ride the same HP roll a build/Walpurgis
// stack inflates. H0 is a fixed reference point, not the instance's own Max
// HP - see _enemySnapshotAtk's Hs bound below.
const _ENEMY_ATK_TABLE = {
    apostle: { e0: 36, h0: 100 },
    thaelis: { e0: 180, h0: 3000 },
    thaelis_cocoon: { e0: 30, h0: 750 },
    embryo: { e0: 0, h0: 1 },
    uriel: { e0: 90, h0: 3000 },
    raphael: { e0: 60, h0: 4000 },
    marchosias: { e0: 50, h0: 4000 },
    marchosias_minion: { e0: 100, h0: 1500 },
    veilshroud: { e0: 54, h0: 3000 },
    dargruel: { e0: 25, h0: 12000 },
    egregor: { e0: 60, h0: 4000 },
    leviathan: { e0: 180, h0: 12000 },
    goliath: { e0: 120, h0: 200000 }, // h0 applies to True Form only; Alpha has no numeric attack
};

// Snapshots an enemy's ATK (E = E0 * g(wave at spawn)) and H0 onto the
// instance at spawn time - every attack this enemy fires reads enemy.atk /
// enemy._h0 rather than re-deriving them later, so a build-up mid-fight
// (Walpurgis Max HP stacks, Sentinel count, etc.) never silently changes an
// already-launched or already-spawned enemy's own offense.
function _enemySnapshotAtk(enemy, speciesKey) {
    const spec = _ENEMY_ATK_TABLE[speciesKey];
    if (!spec) return;
    enemy.atk = spec.e0 * _atkWaveMult(typeof _waveNumber !== 'undefined' ? Math.max(1, _waveNumber) : 1);
    enemy._h0 = spec.h0;
}

// Bounded own-Max-HP basis for "own Max HP" category attacks: Hs = min(H, 2*H0).
// Lets a real HP build still make these hit harder (up to double the
// species' calibration point) without unbounded late-run HP inflation
// turning one of these into a one-shot.
function _enemyHs(enemy) {
    const h0 = enemy._h0 || 1;
    return Math.min(enemy.maxHp || h0, 2 * h0);
}

// Enrage multiplier for the handful of attacks that scale off how much HP
// the attacker itself has already lost (docs/combat-scaling-rebalance.md
// Part 2) - averages the old nominal amount over a uniformly traversed HP
// bar rather than assuming any particular fight duration.
function _enemyEnrageMult(enemy) {
    const r = Math.max(0, Math.min(1, 1 - (enemy.hp / (enemy.maxHp || 1))));
    return 0.80 + 0.40 * r;
}

// Wave System
let _waveNumber = 0;
let _wavePhase = 'rest'; // 'spawning' | 'rest'
let _waveRestTimer = 0;
let _waveQueue = [];
let _waveQueueTimer = 0;
let _waveAnnouncedAt = 0;
let _waveForceEndTimer = 0;
let _yuukiBonus = 0;

// Wave 11+ live trickle spawner (replaces the fixed-15s _waveQueue at high
// waves - see _updateWaveTrickle). Budget is the remaining per-tier count
// for the current wave; the rest are countdown/count-up timers in ms.
let _waveSpawnBudget = null;
let _waveNextSpawnAt = 0;
let _waveSurgeAt = 0;
let _waveLastEliteAt = 0;
let _waveLastDomAt = 0;

// Walpurgis (Huyết Dạ): every 5 waves, all enemies permanently gain +20% Max
// HP, +5% evade (capped at +40% total from Walpurgis alone, i.e. 8 stacks'
// worth - past that, more stacks keep buffing everything else but stop
// pushing evade further, so a very long run never makes enemies outright
// unhittable), and +5% effectiveness on heals/shields they receive. HP is the
// one stat pushed hardest here on purpose: this game's real death clock is
// lives lost to contact, not raw incoming damage, so a longer time-to-kill
// means more exposure to that over a fight rather than a harder-hitting one.
// Stacks forever, derived directly from _waveNumber so there's no separate
// counter to track/reset.
function _walpurgisStacks() { return Math.floor(_waveNumber / 5); }
// Takes an explicit stack count when given (used to compare an old stack
// count against the current one, e.g. main.js's retroactive on-screen
// rescale), defaulting to the current real stack count otherwise.
function _walpurgisHpMult(stacks) { return 1 + 0.20 * (stacks != null ? stacks : _walpurgisStacks()); }
function _walpurgisEvadeBonus() { return Math.min(0.40, 0.05 * _walpurgisStacks()); }
// Flat damage reduction (a separate stat from the %-based DR above),
// subtracted straight off a hit before the enemy hp<=0 check, same as every
// other flat-DR source in dealDamage - it can only shave a hit down to a
// graze, never block a kill outright. Scales with the raw wave number
// instead of Walpurgis's own 5-wave stack count so it grows smoothly every
// wave (+5 flat DR each) rather than in stair-step jumps, and is computed
// live off the enemy's current wave rather than frozen at spawn, so an
// enemy that survives across a wave boundary keeps pace automatically.
// docs/combat-scaling-rebalance.md Part 3: capped at 100 so it can no
// longer grow into eventual immunity to all small normal hits; the 60%
// post-DR armor cap in dealDamage bounds it further on any single hit.
function _walpurgisFlatDR() { return Math.min(100, 5 * _waveNumber); }
// docs/combat-scaling-rebalance.md Part 3: lower per-stack rate, capped at +30%
function _walpurgisHealShieldMult() { return 1 + Math.min(0.30, 0.03 * _walpurgisStacks()); }

let keys = {}, gamePaused = false, loading = false, lastTimeStamp = 0;
// A performance.now() snapshot that only advances while the game is NOT
// paused - render code that needs "how much time has passed" for an
// in-progress animation (e.g. Skill F's sweep angle) should read this
// instead of calling performance.now() directly, or the animation keeps
// advancing in real time even while frozen behind the pause screen. Updated
// once per frame in main.js's gameLoop, right before draw() runs.
let _frozenNow = performance.now();

// match stats, reset in startGame. label -> cumulative total (damage
// maps) or count (lifeLoss). amount defaults to 1 for lifeLoss calls
window._matchStats = { allyDamage: {}, enemyDamage: {}, lifeLoss: {} };
function _recordStat(category, label, amount) {
    const bucket = window._matchStats[category];
    const amt = amount === undefined ? 1 : amount;
    if (!bucket || !amt) return;
    bucket[label] = (bucket[label] || 0) + amt;
}
// label a dealDamage() source for stats only, doesn't touch gameplay.
// checks existing flags first, falls back to source._statSrc, else "Other"
const _BULLET_TYPE_LABELS = {
    player_auto: 'Player Auto-Fire', player_charged: 'Player Charged Shot',
    sentinel_auto: 'Sentinel Auto-Fire', sentinel_special: 'Sentinel Special Shot',
};
function _classifyDamageSource(source, isAllyDealt) {
    if (!source) return 'Other';
    if (source._statSrc) return source._statSrc;
    if (source.type && _BULLET_TYPE_LABELS[source.type]) return _BULLET_TYPE_LABELS[source.type];
    if (isAllyDealt) {
        if (source._isSkillD) return 'Skill D: Death Star';
        if (source.isChainLightning) return 'Chain Lightning';
        if (source.isTeslaDot) return 'Skill G: Tesla Coil';
        if (source.isSpiritLaser) return 'Skill S: Remembrance Spirit';
        if (source._yogExplosion) return 'Yog-Sothoth Domain';
        if (source._isDtuDot) return 'Dimensional Rift';
        if (source._isNocToiDot) return 'Soul Devourer';
        if (source._isSthDot) return 'Solar Flare';
        if (source._boonBaneBacklash) return 'Boon & Bane';
        if (source._isSlashVfx) return 'Blade Arc';
        if (source.isPiercing && source.isTrueDamage) return 'Skill D: Mark & Annihilate';
        return 'Other';
    }
    if (source._attackerType) return _enemyTypeLabel(source._attackerType);
    if (source._vanguardTag) {
        const tag = source._vanguardTag;
        if (tag.startsWith('bsm_') || tag.startsWith('blt_')) return 'Enemy Bullet';
        if (tag.startsWith('chain_')) return 'Enemy Chain Lightning';
        if (tag.startsWith('veil_')) return 'Veilshroud';
        return 'Boss Attack';
    }
    return 'Other';
}

// enemy.type -> display name, used by _classifyAttacker + wherever else
const _ENEMY_TYPE_LABELS = {
    goliath: 'Goliath', leviathan: 'Leviathan', egregor: 'Egregor', dargruel: 'Dargruel',
    marchosias: 'Marchosias', veilshroud: 'Veilshroud', veilshroud_echo: 'Veilshroud',
    raphael: 'Raphael', thaelis: 'Thaelis', apostle: 'Apostle', embryo: 'Embryo',
    abyssal_chain: 'Abyssal Chain', normal: 'Normal Enemy',
};
function _enemyTypeLabel(type) {
    if (_ENEMY_TYPE_LABELS[type]) return _ENEMY_TYPE_LABELS[type];
    if (!type) return 'Unknown';
    // not in map -> just titlecase the snake_case type instead of raw dump
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
// attacker -> label for the Lives Lost tab
function _classifyAttacker(attacker) {
    if (!attacker) return 'Unknown';
    if (attacker.type && attacker.type.startsWith('enemy_bullet')) {
        return (attacker.ownerRef && attacker.ownerRef.type) ? _enemyTypeLabel(attacker.ownerRef.type) + ' Bullet' : 'Enemy Bullet';
    }
    if (attacker.type) return _enemyTypeLabel(attacker.type);
    return 'Unknown';
}

// Sigil System state (reset in startGame)
window._sigilPool = [];
window._sigilRerollsLeft = 2;
window._playerSigils = [];
window._sigilPicker = null;
window._yuushaSquad = [];
window._yuushaBlades = [];
window._yuushaProjectiles = [];
window._yuushaParticles = [];
window._yuushaDotZones = [];
window._yuushaBurstRays = [];
window._yuushaFloatingTexts = [];
window._yuushaReplenishLastCheck = 0;
window._yuushaReplenishCooldownEnd = 0;
window._coiMongEndTime = 0;
window._thanMenhEndTime = 0;
window._tuyetLanStacks = 0;
window._tuyetLanLastKill = 0;
window._muiTenVangHitCount = 0;
window._sthBurning = new Map();
window._laiKepPEAccum = 0;
window._laiKepFireRateBonus = 0;
window._solArrows = [];
window._bongDoiHitCount = 0;
window._bongDoiCharging = false;
window._bongDoiChargeStart = 0;
window._bongDoiCooldownEnd = 0;
window._shadowTwinGhosts = [];
window._shadowOrbs = [];
window._shadowTwinVolleysPending = 0;
window._shadowTwinNextVolleyAt = 0;
window._mirrorLaserColumns = [];
window._mlProcChance = 0.05;
window._mlProcCooldownEnd = 0;
window._sdcDmgStacks = [];
window._goldenArrowNextSweepAt = 0;
window._goldenArrowSweep = null;
window._gobSequences = [];
window._gobCooldownEnd = 0;
window._eeSequences = [];
window._eeHitCounter = 0;
let boundaryY = canvas.height - 10;