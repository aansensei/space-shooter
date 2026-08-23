// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

const player = { x: canvas.width / 2, y: canvas.height - 60, width: 40, height: 40, speed: 8.6, hitRadius: 5.75 }; // must match the cyan dot drawn in render.js, change both or neither
let playerClones = [];
let lastAutoFire = 0;
const autoFireInterval = 135; // 135ms = base 168ms with the +20% fire rate bonus already baked in

let bullets = [], enemies = [], explosions = [], particles = [], chainLightningEffects = [];
let demonGiftEffect = { active: false, endTime: 0 };
let gloryForJusticeActive = false;
let finalDefense = { playerShield: true, boundaryShield: true, playerCooldownEnd: 0, boundaryCooldownEnd: 0 }; // both start true so they are ready from hit 1
let chainLightningCooldownEnd = 0;

let hasTriggeredLastStand = false;
let playerAbsoluteShield = false;

let bossShockwaves = [];
let aegisLasers = [];
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
let spiritBullets = [], spiritParticles = [], bladeArcProjectiles = [];

// Skill D
let skillDCharging = false, skillDChargeStartTime = 0;
const skillDChargeTime = 2000;
let deathStar = null, lastSkillD = -Infinity;
const skillDCooldown = 10000;
// Death Star's actual visible/contact radius = deathStar.size * this
// multiplier (matches the base disc drawn at size*2.5 scaled by DS_SCALE =
// 2.0/2.8 in js/render/skill-d.js) — shared between skills.js's own contact
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

// Wave System
let _waveNumber = 0;
let _wavePhase = 'rest'; // 'spawning' | 'rest'
let _waveRestTimer = 0;
let _waveQueue = [];
let _waveQueueTimer = 0;
let _waveAnnouncedAt = 0;
let _waveForceEndTimer = 0;
let _yuukiBonus = 0;

// Walpurgis (Huyết Dạ): every 10 waves, all enemies permanently gain +10% Max
// HP, +5% evade, +100 flat damage reduction (a separate flat armor stat, not
// the existing %-based DR — applied per hit before the enemy hp<=0 checks so
// it never blocks a kill, just shaves a fixed amount off each hit), and +5%
// effectiveness on heals/shields they receive. Stacks forever, derived
// directly from _waveNumber so there's no separate counter to track/reset.
function _walpurgisStacks() { return Math.floor(_waveNumber / 10); }
function _walpurgisHpMult() { return 1 + 0.10 * _walpurgisStacks(); }
function _walpurgisEvadeBonus() { return 0.05 * _walpurgisStacks(); }
function _walpurgisFlatDR() { return 100 * _walpurgisStacks(); }
function _walpurgisHealShieldMult() { return 1 + 0.05 * _walpurgisStacks(); }

let keys = {}, gamePaused = false, loading = false, lastTimeStamp = 0;

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
        if (source._isOnslaughtOrb) return 'Skill A: Onslaught';
        if (source._yogExplosion) return 'Yog-Sothoth Domain';
        if (source._isDtuDot) return 'Dimensional Rift';
        if (source._isNocToiDot) return 'Soul Devourer';
        if (source._isSthDot) return 'Solar Flare';
        if (source._boonBaneBacklash) return 'Boon & Bane';
        if (source._isSlashVfx) return 'Blade Arc';
        if (source.isPiercing && source.isTrueDamage) return 'Skill D: Mark & Annihilate';
        return 'Other';
    }
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
    aegis_core: 'Aegis Core', thaelis: 'Thaelis', apostle: 'Apostle', embryo: 'Embryo',
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
window._sigilIronBodyStacks = 0;
window._sigilIronBodyNextAt = 0;
window._coiMongEndTime = 0;
window._thanMenhEndTime = 0;
window._tuyetLanStacks = 0;
window._tuyetLanLastKill = 0;
window._muiTenVangHitCount = 0;
window._hoVeShieldCooldownEnd = 0;
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
window._onslaughtLastEnemy = null;
window._onslaughtCooldownEnd = 0;
window._onslaughtOrbs = [];
let boundaryY = canvas.height - 10;