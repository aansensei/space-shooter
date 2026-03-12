const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const btnMarginLeft = 20, btnMarginBottom = 20, btnRadius = 25, btnGap = 12;
let gameState = "start", lives = 15, score = 0, gameStartTime = 0;
let nextLifeMilestone = 500000;

const player = { x: canvas.width / 2, y: canvas.height - 60, width: 40, height: 40, speed: 8.6 };
let playerClones = [];
let lastAutoFire = 0;
const autoFireInterval = 170;

let bullets = [], enemies = [], explosions = [], particles = [], chainLightningEffects = [];
let demonGiftEffect = { active: false, endTime: 0 };
let gloryForJusticeActive = false;
let finalDefense = { playerShield: true, boundaryShield: true, playerCooldownEnd: 0, boundaryCooldownEnd: 0 };
let chainLightningCooldownEnd = 0;

// Nội tại Vệ Binh
let sentinels = [];
let killCountForPassive = 0;
const MAX_SENTINELS = 15;

// Skill A
let skillAOrbs = [], skillAActive = false, lastSkillA = -Infinity;
const skillACooldown = 9000, maxSkillAOrbs = 60;
let skillASensorRadius = 0;
let scatteredProjectiles = [];

// Skill S
let spirits = [];
const MAX_SPIRITS = 2;
let lastSkillS = -Infinity;
const skillSCooldown = 15000;
let spiritBullets = [], spiritParticles = [], bladeArcProjectiles = [];

// Skill D
let skillDCharging = false, skillDChargeStartTime = 0;
const skillDChargeTime = 2700;
let blackHole = null, lastSkillD = -Infinity;
const skillDCooldown = 15000;

// Skill F
let lastSkillF = -Infinity;
const skillFCooldown = 10000;
let skillFState = "ready", skillFChargeStart, skillFSweepStart;
const skillFSweepDuration = 1000;
let screenShake = { intensity: 0, duration: 0 };

// Skill G
let skillGCharge = 0;
let skillGActive = false;
let skillGEndTime = 0;
let skillGBorderOpacity = 0;
let energyOrbs = [];
let teslaCoils = [];
const MAX_TESLA_COILS = 6;
const ENERGY_ORB_SIZE = 15;
const TESLA_COIL_SIZE = 20;
const TESLA_AURA_RADIUS = TESLA_COIL_SIZE * 10;

// Tụ đạn & Overload
let charging = false, chargeStartTime = 0;
const maxChargeTime = 1300;
const maxMultiplier = 10;
const overloadChargeTime = 5000;

// Tia laze
let laserActive = false, laserStartTime = 0, lastLaserTick = 0;
const laserDuration = 12000, laserCooldownDuration = 15000, laserTickInterval = 250;
let laserCooldownEnd = 0;

// Spawn enemy
let lastEnemySpawn = 0;
const initialSpawnInterval = 1494, spawnDecreaseRate = 50, minSpawnInterval = 370;

let keys = {}, gamePaused = false, loading = false, lastTimeStamp = 0;
const boundaryY = canvas.height - 10;