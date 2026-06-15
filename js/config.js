const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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
let blackHole = null, lastSkillD = -Infinity;
const skillDCooldown = 12000;

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

let keys = {}, gamePaused = false, loading = false, lastTimeStamp = 0;

// Sigil System state (reset in startGame)
window._sigilPool = [];
window._playerSigils = [];
window._sigilPicker = null;
window._sigilIronBodyStacks = 0;
window._sigilIronBodyNextAt = 0;
window._phanDonReady = false;
window._coiMongEndTime = 0;
window._thanMenhEndTime = 0;
window._tuyetLanStacks = 0;
window._tuyetLanLastKill = 0;
window._bongDoiHitCount = 0;
window._muiTenVangHitCount = 0;
window._hoVeLastDeadMaxHp = 0;
window._hoVeShieldAvailUntil = 0;
window._hoVeShieldCooldownEnd = 0;
window._sthBurning = new Map();
window._laiKepPEAccum = 0;
window._laiKepFireRateBonus = 0;
let boundaryY = canvas.height - 10;