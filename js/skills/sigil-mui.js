// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) sigil logic: Soul Qi charging, Legion of Souls state,
// 5-layer Iron Body, player CC immunity, Spirit Array, and Soul Blade Rain.
// Visual rendering lives exclusively in js/render/sigil-mui.js.

const MUI_QI_MAX = 100;
const MUI_WINDUP_MS = 500;
const MUI_WINDUP_TRAVEL_MS = 450;
const MUI_WINDUP_TAIL_MS = 620;
const MUI_LEGION_MS = 5000;
const MUI_ARRAY_OPEN_MS = 400;
const MUI_ARRAY_FADE_MS = 600;
const MUI_ARRAY_RADIUS = 86;
const MUI_ARRAY_COUNT = 8;
const MUI_ARRAY_MIN_PLAYER_DIST = 230;
const MUI_ARRAY_ABOVE_SHIP = 150;
const MUI_ARRAY_TOP_LIMIT = 110;
const MUI_ARRAY_TICK_MS = 400;
const MUI_ARRAY_ATK_RATIO = 0.12;
const MUI_ROOT_MS = 1500;
const MUI_SLOW_LINGER_MS = 1500;
const MUI_SLOW_FACTOR = 0.55;
const MUI_CC_IMMUNE_SLOW_FACTOR = 0.75;
const MUI_IRON_MAX = 5;
const MUI_PASSIVE_SPEED = 1.06;
const MUI_ACTIVE_SPEED = 1.40;
const MUI_WAVES_TOTAL = 79;
const MUI_BLADES_PER_WAVE = 2;
const MUI_WAVE_INTERVAL_MS = MUI_LEGION_MS / MUI_WAVES_TOTAL;
const MUI_BLADE_POOL_MAX = 40;
const MUI_BLADE_ERASE_RADIUS = 30;
const MUI_POOL_ECHO_CHANCE = 0.4;
const MUI_POOL_ECHO_RATIO = 0.25;
const MUI_BLADE_SPAWN_MS = 140;
const MUI_BLADE_AIM_MS = 120;
const MUI_BLADE_SPEED = 30;
const MUI_BLADE_ATK_RATIO = 0.14;
const MUI_BLADE_MAXHP_RATIO = 0.0006;
const MUI_NON_ELITE_MULT = 1.10;
const MUI_HEALTHY_HP_RATIO = 0.5;
const MUI_HEALTHY_BONUS = 1.25;
const MUI_FX_POOL_MAX = 192;
const MUI_TRAIL_MAX = 6;

const _MUI_ELITE_OR_HIGHER = new Set([
    'thaelis', 'raphael', 'egregor', 'marchosias', 'veilshroud',
    'dargruel', 'leviathan', 'uriel', 'goliath', 'ammit',
]);

const _MUI_SIGIL_PREFIXES = [
    'Wraith Warden:',
    'Aries:',
    'Cancer:',
    'Great Sage:',
    'Umbral Serpent:',
    'Golden Needle',
    'Divine Fate:',
    'Mountainfall',
    'Virgo:',
    'Pisces:',
    'Capricorn:',
    'Leo:',
    'Libra:',
    'Gemini:',
    'Scorpio:',
    'Taurus:',
    'Sagittarius:',
    'Aquarius:',
    'Dawn Herald:',
    'Sigil:',
];

const _MUI_NON_SIGIL_PREFIXES = [
    'Skill S:',
    'Skill A:',
    'Skill D:',
    'Skill F:',
    'Skill G:',
    'Overload Laser',
    'Player ',
    'Debug ',
];

function _muiChargeFor(type) {
    if (!type || typeof type !== 'string') return 0;
    if (type.startsWith('enemy_bullet') || type === 'abyssal_chain' || type === 'veilshroud_echo'
        || type === 'embryo' || type === 'thaelis_cocoon') return 0;
    if (type === 'goliath') return 40;
    if (type === 'dargruel' || type === 'leviathan') return 25;
    if (type === 'raphael' || type === 'marchosias' || type === 'egregor' || type === 'ammit') return 15;
    if (type === 'veilshroud' || type === 'thaelis' || type === 'thaelis_guard' || type === 'uriel') return 6;
    return 2;
}

function _muiIsEliteOrHigher(type) {
    return typeof type === 'string' && _MUI_ELITE_OR_HIGHER.has(type);
}

function _muiPickWeapon(rng) {
    const r = typeof rng === 'function' ? rng() : Math.random();
    if (r < 0.30) return 0; // Duong dao 30%
    if (r < 0.55) return 1; // Thuong 25%
    if (r < 0.75) return 2; // Qua 20%
    if (r < 0.90) return 3; // Quan dao 15%
    return 4;               // Kiem Dong Son 10%
}

function _muiBladeSpawnPoint(playerX, playerY, canvasH, rng, out) {
    const rand = typeof rng === 'function' ? rng : Math.random;
    const theta = rand() * Math.PI;
    const r = 130 + rand() * 90;
    const x = playerX + Math.cos(theta) * r;
    const rawY = playerY + Math.sin(theta) * r * 0.45;
    const maxY = (typeof canvasH === 'number' && canvasH > 0) ? canvasH + 20 : playerY + 120;
    const y = Math.max(playerY - 4, Math.min(maxY, rawY));
    if (out) {
        out.x = x;
        out.y = y;
        return out;
    }
    return { x, y };
}

function _muiAimAngle(from, to, rng) {
    const rand = typeof rng === 'function' ? rng : Math.random;
    if (to && Number.isFinite(to.x) && Number.isFinite(to.y)) {
        const base = Math.atan2(to.y - from.y, to.x - from.x);
        const spread = (rand() * 2 - 1) * (3 * Math.PI / 180);
        return base + spread;
    }
    const fan = (rand() * 2 - 1) * (12 * Math.PI / 180);
    return -Math.PI / 2 + fan;
}

function _isSigilDamageSource(params) {
    if (!params || typeof params !== 'object') return false;
    if (params._sigilDmg === true) return true;
    const src = typeof params._statSrc === 'string' ? params._statSrc : '';
    if (src) {
        for (let i = 0; i < _MUI_NON_SIGIL_PREFIXES.length; i++) {
            if (src.startsWith(_MUI_NON_SIGIL_PREFIXES[i])) return false;
        }
        for (let i = 0; i < _MUI_SIGIL_PREFIXES.length; i++) {
            if (src.startsWith(_MUI_SIGIL_PREFIXES[i])) return true;
        }
    }
    if (params._isGobBlade || params._isEeSpear || params._dauReflect || params._isSthDot || params._isTyVenomDot) {
        return true;
    }
    return false;
}

function _muiHasSpec() {
    return typeof _hasBuff === 'function' && _hasBuff('quy_mon_diem_quan');
}

function _muiHasAtk() {
    return typeof _hasBuff === 'function' && _hasBuff('van_kiem_quy_hon');
}

function _muiIsActive() {
    return typeof window !== 'undefined' && (window._muiRemainMs || 0) > 0;
}

function _muiIsCalling() {
    return _muiIsActive() || window._muiWindupMs > 0;
}

function _muiPlayerCCImmune() {
    return _muiHasSpec() && _muiIsCalling();
}

function _muiWindupRadius(maxR, elapsed) {
    const rest = 1 - Math.min(1, Math.max(0, elapsed) / MUI_WINDUP_TRAVEL_MS);
    return maxR * (1 - rest * rest * rest);
}

function _muiMoveSpeedMult() {
    if (!_muiHasSpec()) return 1;
    return _muiIsActive() ? (MUI_PASSIVE_SPEED * MUI_ACTIVE_SPEED) : MUI_PASSIVE_SPEED;
}

function _muiPlaySfx(key, x, y, minIntervalMs, throttleField) {
    if (typeof window === 'undefined' || !window.AudioMgr) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!window._muiSfxTimes) window._muiSfxTimes = {};
    if (minIntervalMs > 0 && throttleField) {
        const last = window._muiSfxTimes[throttleField] ?? -Infinity;
        if (now - last < minIntervalMs) return;
        window._muiSfxTimes[throttleField] = now;
    }
    if (typeof x === 'number' && typeof y === 'number' && typeof window.AudioMgr.playSfxAt === 'function') {
        window.AudioMgr.playSfxAt(key, x, y);
    } else if (typeof window.AudioMgr.playSfx === 'function') {
        window.AudioMgr.playSfx(key);
    }
}

function _muiEmitFx(kind, x, y, life, scale, angle, vx, vy) {
    if (typeof window === 'undefined' || !window._muiFx) return;
    const pool = window._muiFx;
    const idx = window._muiFxCursor % MUI_FX_POOL_MAX;
    window._muiFxCursor = (idx + 1) % MUI_FX_POOL_MAX;
    const fx = pool[idx];
    fx.active = true;
    fx.kind = kind;
    fx.x = x;
    fx.y = y;
    fx.vx = vx || 0;
    fx.vy = vy || 0;
    fx.angle = angle || 0;
    fx.age = 0;
    fx.life = life || 300;
    fx.scale = scale || 1;
    fx.seed = (window._muiFxSeq = ((window._muiFxSeq || 0) + 1) & 1023) * 0.6180339;
}

function _muiClearPlayerCC() {
    if (typeof player === 'undefined' || !player) return;
    player._silenced = false;
    player._rooted = false;
    player._silenceEnd = 0;
    player._nullSlashSlowed = false;
    player._nullSlashSlowEnd = 0;
    player._levLaserSlowEnd = 0;
    player._wisdomOrbSlowed = false;
    player._wisdomOrbSlowEnd = 0;
}

function _muiConsumeIronLayer() {
    if (typeof window === 'undefined' || !_muiIsCalling() || !(window._muiIronLayers > 0)) return false;
    window._muiIronLayers--;
    const px = typeof player !== 'undefined' && player ? player.x : 0;
    const py = typeof player !== 'undefined' && player ? player.y : 0;
    window._muiIronBreakMs = 360;
    window._muiLastBrokenSlot = window._muiIronLayers;
    _muiEmitFx(2, px, py, 420, 1.0, 0, 0, 0);
    const shardCount = (typeof _mobPerf !== 'undefined' && _mobPerf) ? 4 : 8;
    for (let i = 0; i < shardCount; i++) {
        const a = (i / shardCount) * Math.PI * 2 + 0.3;
        const sp = 0.18 + (i % 3) * 0.08;
        _muiEmitFx(4, px + Math.cos(a) * 18, py + Math.sin(a) * 18, 340, 0.9, a, Math.cos(a) * sp, Math.sin(a) * sp);
    }
    _muiPlaySfx('mui-iron-block', px, py, 120, 'block');
    if (window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
        window.AudioMgr.playSfx('shield-hit');
    }
    return true;
}

function _muiAddQi(amount) {
    if (typeof window === 'undefined' || !_muiHasSpec() || _muiIsCalling()) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    window._muiQi = Math.min(MUI_QI_MAX, (window._muiQi || 0) + amount);
    if (window._muiQi >= MUI_QI_MAX) {
        window._muiQi = MUI_QI_MAX;
        if (!window._muiReady) {
            window._muiReady = true;
            const px = typeof player !== 'undefined' && player ? player.x : 0;
            const py = typeof player !== 'undefined' && player ? player.y : 0;
            _muiPlaySfx('mui-qi-ready', px, py, 150, 'ready');
        }
    }
}

function _muiOnEnemyKill(enemy) {
    if (!enemy || enemy._noKillReward || !_muiHasSpec() || _muiIsCalling()) return;
    const gain = _muiChargeFor(enemy.type);
    if (gain > 0) _muiAddQi(gain);
}

function _muiRelease() {
    if (typeof window === 'undefined' || !window._muiReady || !_muiHasSpec() || _muiIsCalling()) return false;
    if (typeof player !== 'undefined' && player && player._silenced) return false;
    if (typeof gameState !== 'undefined' && gameState !== 'playing') return false;
    if (typeof gamePaused !== 'undefined' && gamePaused) return false;
    if (window._sigilPicker || window._kanadeCutscene) return false;

    const px = typeof player !== 'undefined' && player ? player.x : 400;
    const py = typeof player !== 'undefined' && player ? player.y : 500;
    const cw = typeof canvas !== 'undefined' && canvas ? canvas.width : 1280;
    const ch = typeof canvas !== 'undefined' && canvas ? canvas.height : 720;
    window._muiQi = 0;
    window._muiReady = false;
    window._muiScreenFx = null;
    window._muiWindupMs = MUI_WINDUP_MS;
    window._muiWindupFx = {
        id: ++window._muiWindupId,
        start: window._muiClock,
        x: px,
        y: py,
        maxR: Math.hypot(Math.max(px, cw - px), Math.max(py, ch - py)) + 60,
    };
    window._muiIronLayers = MUI_IRON_MAX;
    window._muiArray.active = false;
    _muiClearPlayerCC();

    if (typeof _setShake === 'function'
        && window._screenShakeEnabled !== false
        && !(window._fxOpts && window._fxOpts.reducedMotion)) {
        _setShake((typeof _mobPerf !== 'undefined' && _mobPerf) ? 3 : 6, 260);
    }
    _muiPlaySfx('mui-legion-call', px, py, 0, null);
    if (window.AudioMgr && typeof window.AudioMgr.enterMuiWindupDuck === 'function') {
        window.AudioMgr.enterMuiWindupDuck();
    }
    return true;
}

function _muiStartLegion(now) {
    window._muiRemainMs = MUI_LEGION_MS;
    window._muiActiveUntil = now + MUI_LEGION_MS;
    window._muiLegionJustStarted = true;
    window._muiCallMs = 0;
    window._muiShipFlashMs = 340;
    window._muiWavesSpawned = 0;
    window._muiWaveAccum = MUI_WAVE_INTERVAL_MS;

    const px = typeof player !== 'undefined' && player ? player.x : 400;
    const py = typeof player !== 'undefined' && player ? player.y : 500;
    window._muiScreenFx = { start: window._muiClock, age: 0, endAge: -1, phase: 0, x: px, y: py };
    if (typeof _setShake === 'function'
        && !window._gfxLevel && !(typeof _mobPerf !== 'undefined' && _mobPerf)
        && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion
        && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        _setShake(3, 210);
    }
    const arr = window._muiArray;
    arr.active = true;
    arr.id = ++window._muiArrayCounter;
    arr.age = 0;
    arr.duration = MUI_LEGION_MS;
    arr.tickAccum = MUI_ARRAY_TICK_MS;
    _muiArrayPickCenters(px, py, typeof canvas !== 'undefined' && canvas ? canvas.width : 1280, Math.random, arr.zones);
    _muiPlaySfx('mui-legion-burst', px, py, 0, null);
    _muiPlaySfx('mui-warden-cry', px, py, 0, null);
    _muiPlaySfx('mui-array-open', px, py - MUI_ARRAY_ABOVE_SHIP, 0, null);
}

const _muiSpawnScratch = { x: 0, y: 0 };
const _muiSegA = { x: 0, y: 0 };
const _muiSegB = { x: 0, y: 0 };
const _muiArrayDmgSource = { damage: 0, isTrueDamage: true, _noHitSfx: true, _sigilDmg: true, _statSrc: 'Wraith Warden: Spirit Array' };
const _muiEchoDmgSource = { damage: 0, isTrueDamage: true, _noHitSfx: true, _sigilDmg: true, _statSrc: 'Wraith Warden: Pool Echo' };
const _muiBladeDmgSource = { damage: 0, isTrueDamage: true, _noHitSfx: true, _sigilDmg: true, _statSrc: 'Wraith Warden: Soul Blade Rain' };

// The Spirit Array is eight small round pools scattered over the field. The field above the ship is cut
// into a grid whose cells are wide enough that two pools can never touch, every pool gets a random offset
// inside its cell, and eight cells are drawn at random. Cells within MUI_ARRAY_MIN_PLAYER_DIST of the ship
// are skipped so standing still never keeps the ship inside a pool, and every pool sits at least
// MUI_ARRAY_ABOVE_SHIP above the ship's row.
const _muiCellScratch = [];
function _muiArrayPickCenters(playerX, playerY, canvasW, rng, zones) {
    const r = MUI_ARRAY_RADIUS;
    const need = r * 2 + 6;
    const xMin = r + 24, xMax = Math.max(xMin, canvasW - r - 24);
    const yMax = playerY - MUI_ARRAY_ABOVE_SHIP;
    const yMin = Math.min(yMax, MUI_ARRAY_TOP_LIMIT);
    const cols = Math.max(1, Math.floor((xMax - xMin) / need) + 1);
    const rows = Math.max(1, Math.floor((yMax - yMin) / need) + 1);
    const stepX = cols > 1 ? (xMax - xMin) / (cols - 1) : 0;
    const stepY = rows > 1 ? (yMax - yMin) / (rows - 1) : 0;
    const jitterX = cols > 1 ? Math.max(0, (stepX - need) / 2) : (xMax - xMin) / 2;
    const jitterY = rows > 1 ? Math.max(0, (stepY - need) / 2) : (yMax - yMin) / 2;

    const cells = _muiCellScratch;
    cells.length = 0;
    for (let c = 0; c < cols; c++) {
        for (let rw = 0; rw < rows; rw++) {
            const cx = cols > 1 ? xMin + stepX * c : (xMin + xMax) / 2;
            const cy = rows > 1 ? yMin + stepY * rw : (yMin + yMax) / 2;
            const x = Math.min(xMax, Math.max(xMin, cx + (rng() * 2 - 1) * jitterX));
            const y = Math.min(yMax, Math.max(yMin, cy + (rng() * 2 - 1) * jitterY));
            cells.push({ x, y, far: Math.hypot(x - playerX, y - playerY) });
        }
    }
    // Fisher-Yates shuffle, then the cells that are far enough from the ship come first
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
    }
    const ordered = [];
    for (let i = 0; i < cells.length; i++) if (cells[i].far >= MUI_ARRAY_MIN_PLAYER_DIST) ordered.push(cells[i]);
    const near = cells.filter(cell => cell.far < MUI_ARRAY_MIN_PLAYER_DIST).sort((m, n) => n.far - m.far);
    for (let i = 0; i < near.length; i++) ordered.push(near[i]);
    zones.length = 0;
    for (let i = 0; i < MUI_ARRAY_COUNT; i++) {
        const cell = ordered[i % ordered.length];
        zones.push({ x: cell.x, y: cell.y, r });
    }
    return zones;
}

// An enemy is inside a pool when its centre lies within it, allowing a quarter of its body as slack.
function _muiArrayContains(arr, e) {
    const zones = arr.zones;
    for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        const reach = z.r + (e.size || 0) * 0.25;
        const dx = e.x - z.x, dy = e.y - z.y;
        if (dx * dx + dy * dy <= reach * reach) return true;
    }
    return false;
}

// A blade hit deals 25% more to an enemy that still has more than half of its Max HP.
function _muiHealthyBonus(enemy) {
    const max = enemy && (enemy.maxHp || 0);
    return max > 0 && enemy.hp / max > MUI_HEALTHY_HP_RATIO ? MUI_HEALTHY_BONUS : 1;
}

// An enemy standing in a Spirit Array pool has a 40% chance, on each blade hit, to take 25% of that hit again as true damage.
// Returns the extra damage (0 when the enemy is outside every pool, the array is closed or the roll fails).
function _muiRollPoolEcho(enemy, baseDamage, rng) {
    const arr = typeof window !== 'undefined' ? window._muiArray : null;
    if (!arr || !arr.active || arr.age >= arr.duration || !_muiArrayContains(arr, enemy)) return 0;
    return rng() < MUI_POOL_ECHO_CHANCE ? baseDamage * MUI_POOL_ECHO_RATIO : 0;
}

// A flying soul blade wipes every enemy bullet it cuts through. Abyssal chains are not bullets and are never wiped.
function _muiBladeErasesBullet(e) {
    return !!e && typeof e.type === 'string' && e.type.startsWith('enemy_bullet');
}

function _muiEnemyCCImmune(enemy) {
    if (!enemy) return true;
    if (enemy.type === 'goliath') return true;
    return typeof _isCCImmune === 'function' ? _isCCImmune(enemy) : false;
}

function _muiUpdateArray(deltaTime, now) {
    const arr = window._muiArray;
    if (!arr || !arr.active) return;
    arr.age += deltaTime;
    if (arr.age >= arr.duration + arr.fadeMs) {
        arr.active = false;
        return;
    }
    if (arr.age >= arr.duration) return;

    arr.tickAccum += deltaTime;
    const doTick = arr.tickAccum >= MUI_ARRAY_TICK_MS;
    if (doTick) arr.tickAccum -= MUI_ARRAY_TICK_MS;

    if (typeof enemies === 'undefined') return;
    const patk = typeof player !== 'undefined' && player ? player.atk : 100;

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || e._markedForDeath || e._deathPhase) continue;
        if (typeof _isEnemyTargetable === 'function' && !_isEnemyTargetable(e)) continue;
        if (!_muiArrayContains(arr, e)) continue;

        e._muiArrayUntil = now + 100;
        const ccImmune = _muiEnemyCCImmune(e);

        // The hold is Dominant: it works through CC immunity and runs in _leoFreezeEnemy, once per enemy per Legion.
        if (e._muiRootedBy !== arr.id) {
            e._muiRootedBy = arr.id;
            e._muiHoldMs = MUI_ROOT_MS;
            _muiPlaySfx('mui-root-bind', e.x, e.y, 120, 'root');
        }
        // The slow is an ordinary CC, so CC immune enemies only get the lighter one.
        if (!(e._muiHoldMs > 0)) {
            e._muiSlowEnd = now + (ccImmune ? 120 : MUI_SLOW_LINGER_MS);
            e._muiSlowFactor = ccImmune ? MUI_CC_IMMUNE_SLOW_FACTOR : MUI_SLOW_FACTOR;
        }

        if (doTick && typeof dealDamage === 'function') {
            const mult = _muiIsEliteOrHigher(e.type) ? 1.0 : MUI_NON_ELITE_MULT;
            _muiArrayDmgSource.damage = MUI_ARRAY_ATK_RATIO * patk * mult;
            dealDamage(e, _muiArrayDmgSource);
        }
    }
}

function _muiPickBladeTarget(playerY, rng) {
    if (typeof enemies === 'undefined' || !enemies.length) return null;
    const rand = typeof rng === 'function' ? rng : Math.random;
    let totalWeight = 0;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || e._markedForDeath || e._deathPhase) continue;
        if (typeof _isEnemyTargetable === 'function' && !_isEnemyTargetable(e)) continue;
        if (e.y >= playerY - 20) continue;
        totalWeight += _muiIsEliteOrHigher(e.type) ? 3 : 1;
    }
    if (totalWeight <= 0) return null;
    let pick = rand() * totalWeight;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || e._markedForDeath || e._deathPhase) continue;
        if (typeof _isEnemyTargetable === 'function' && !_isEnemyTargetable(e)) continue;
        if (e.y >= playerY - 20) continue;
        pick -= _muiIsEliteOrHigher(e.type) ? 3 : 1;
        if (pick <= 0) return e;
    }
    return null;
}

function _muiCountActiveBlades() {
    const pool = window._muiBlades;
    let count = 0;
    for (let i = 0; i < MUI_BLADE_POOL_MAX; i++) {
        if (pool[i].active) count++;
    }
    return count;
}

function _muiSpawnBladeWave() {
    const pool = window._muiBlades;
    const px = typeof player !== 'undefined' && player ? player.x : 400;
    const py = typeof player !== 'undefined' && player ? player.y : 500;
    const ch = typeof canvas !== 'undefined' && canvas ? canvas.height : 720;

    let freeCount = 0;
    for (let i = 0; i < MUI_BLADE_POOL_MAX; i++) {
        if (!pool[i].active) {
            freeCount++;
            if (freeCount >= MUI_BLADES_PER_WAVE) break;
        }
    }
    if (freeCount < MUI_BLADES_PER_WAVE) return false;

    let spawned = 0;
    for (let i = 0; i < MUI_BLADE_POOL_MAX && spawned < MUI_BLADES_PER_WAVE; i++) {
        const b = pool[i];
        if (b.active) continue;
        _muiBladeSpawnPoint(px, py, ch, Math.random, _muiSpawnScratch);
        b.active = true;
        b.phase = 0;
        b.age = 0;
        b.x = _muiSpawnScratch.x;
        b.y = _muiSpawnScratch.y;
        b.prevX = b.x;
        b.prevY = b.y;
        b.vx = 0;
        b.vy = 0;
        b.target = _muiPickBladeTarget(py, Math.random);
        b.targetAngle = _muiAimAngle(b, b.target, Math.random);
        b.angle = b.startAngle = b.targetAngle;
        b.weaponType = _muiPickWeapon(Math.random);
        b.alpha = 0;
        b.scale = 0.25;
        b.stretch = 1;
        b.flashMs = 0;
        b.hitSet.clear();
        b.trailLen = 0;
        _muiEmitFx(1, b.x, b.y, 260, 1.0, b.angle, 0, 0);
        spawned++;
    }
    _muiPlaySfx('mui-blade-summon', px, py, 90, 'summon');
    return true;
}

function _muiStepWaveClock(state, deltaTime, activeCount, spawnFn) {
    if (state.wavesSpawned >= MUI_WAVES_TOTAL) return;
    state.waveAccum += deltaTime;
    while (state.wavesSpawned < MUI_WAVES_TOTAL && state.waveAccum >= MUI_WAVE_INTERVAL_MS) {
        if (activeCount + MUI_BLADES_PER_WAVE > MUI_BLADE_POOL_MAX) break;
        if (spawnFn && !spawnFn()) break;
        state.wavesSpawned++;
        state.waveAccum -= MUI_WAVE_INTERVAL_MS;
        activeCount += MUI_BLADES_PER_WAVE;
    }
}

function _muiBeginFrame(deltaTime, now) {
    if (typeof window === 'undefined' || !_muiHasSpec()) return;
    if ((typeof gameState !== 'undefined' && gameState !== 'playing')
        || (typeof gamePaused !== 'undefined' && gamePaused)
        || window._sigilPicker || window._kanadeCutscene) return;

    const windup = window._muiWindupMs > 0;
    const wave = window._muiWindupFx;
    const oldClock = window._muiClock;
    window._muiClock += deltaTime;
    window._muiLegionJustStarted = false;
    if (wave && window._muiClock - wave.start >= MUI_WINDUP_TAIL_MS) window._muiWindupFx = null;
    if (window._muiCallMs < 2000) window._muiCallMs += deltaTime;
    if (window._muiShipFlashMs > 0) window._muiShipFlashMs = Math.max(0, window._muiShipFlashMs - deltaTime);
    if (window._muiIronBreakMs > 0) window._muiIronBreakMs = Math.max(0, window._muiIronBreakMs - deltaTime);

    const fxPool = window._muiFx;
    for (let i = 0; i < MUI_FX_POOL_MAX; i++) {
        const fx = fxPool[i];
        if (!fx.active) continue;
        fx.age += deltaTime;
        fx.x += fx.vx * deltaTime;
        fx.y += fx.vy * deltaTime;
        if (fx.age >= fx.life) fx.active = false;
    }

    _muiUpdateEnemyFlashes(deltaTime, windup ? wave : null, oldClock);

    if (windup) {
        window._muiWindupMs = Math.max(0, window._muiWindupMs - deltaTime);
        _muiClearPlayerCC();
        if (window._muiWindupMs === 0) {
            if (window.AudioMgr && typeof window.AudioMgr.exitMuiWindupDuck === 'function') {
                window.AudioMgr.exitMuiWindupDuck();
            }
            _muiStartLegion(now);
            _muiUpdateArray(0, now);
        }
        return;
    }

    if (window._muiRemainMs > 0) {
        window._muiRemainMs = Math.max(0, window._muiRemainMs - deltaTime);
        window._muiActiveUntil = now + window._muiRemainMs;
        _muiClearPlayerCC();
        if (window._muiRemainMs <= 0) {
            window._muiIronLayers = 0;
            window._muiActiveUntil = 0;
            const px = typeof player !== 'undefined' && player ? player.x : 400;
            const py = typeof player !== 'undefined' && player ? player.y : 500;
            _muiPlaySfx('mui-legion-end', px, py, 0, null);
        }
    } else {
        _muiAddQi(deltaTime / 1000);
    }

    const screenFx = window._muiScreenFx;
    if (screenFx) {
        screenFx.age = window._muiClock - screenFx.start;
        screenFx.phase = window._muiRemainMs <= 600 ? 2 : screenFx.age < 700 ? 0 : 1;
        if (window._muiRemainMs === 0) {
            screenFx.endAge = Math.max(0, screenFx.age - MUI_LEGION_MS);
            if (screenFx.endAge >= 500) window._muiScreenFx = null;
        }
    }
    _muiUpdateArray(deltaTime, now);
}

function _muiUpdateEnemyFlashes(deltaTime, wave, oldClock) {
    if (typeof enemies === 'undefined') return;
    const elapsed = wave ? oldClock - wave.start : 0;
    const scan = wave && elapsed < MUI_WINDUP_TRAVEL_MS && (window._gfxLevel || 0) === 0
        && !(typeof _mobPerf !== 'undefined' && _mobPerf) && !window._fxOpts?.reducedMotion;
    const inner = scan ? _muiWindupRadius(wave.maxR, elapsed) : 0;
    const outer = scan ? _muiWindupRadius(wave.maxR, elapsed + deltaTime) : 0;
    const innerSq = inner * inner;
    const outerSq = outer * outer;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e) continue;
        if (e._muiHitFlashMs > 0) e._muiHitFlashMs = Math.max(0, e._muiHitFlashMs - deltaTime);
        if (!scan || e._muiWaveSeen === wave.id || e.hp <= 0 || e._markedForDeath || e._deathPhase
            || e.type?.startsWith('enemy_bullet') || e.type === 'abyssal_chain' || e.type === 'veilshroud_echo') continue;
        const dx = e.x - wave.x;
        const dy = e.y - wave.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < innerSq || distSq > outerSq) continue;
        e._muiWaveSeen = wave.id;
        e._muiHitFlashMs = 150;
    }
}

function updateSoulBlades(deltaTime) {
    if (typeof window === 'undefined' || !window._muiBlades) return;
    if ((typeof gameState !== 'undefined' && gameState !== 'playing')
        || (typeof gamePaused !== 'undefined' && gamePaused)
        || window._sigilPicker || window._kanadeCutscene) return;

    if (window._muiLegionJustStarted) {
        window._muiLegionJustStarted = false;
        deltaTime = 0;
    }
    const canWave = !window._muiWindupMs && _muiHasAtk()
        && (_muiIsActive() || (window._muiWavesSpawned > 0 && window._muiWavesSpawned < MUI_WAVES_TOTAL));
    if (canWave) {
        window._muiWaveAccum += deltaTime;
        while (window._muiWavesSpawned < MUI_WAVES_TOTAL && window._muiWaveAccum >= MUI_WAVE_INTERVAL_MS) {
            if (!_muiSpawnBladeWave()) break;
            window._muiWavesSpawned++;
            window._muiWaveAccum -= MUI_WAVE_INTERVAL_MS;
        }
    }

    const pool = window._muiBlades;
    const dt = deltaTime / 16.67;
    const cw = typeof canvas !== 'undefined' && canvas ? canvas.width : 1280;
    const ch = typeof canvas !== 'undefined' && canvas ? canvas.height : 720;
    const py = typeof player !== 'undefined' && player ? player.y : 500;
    const patk = typeof player !== 'undefined' && player ? player.atk : 100;
    const margin = 60;

    for (let i = 0; i < MUI_BLADE_POOL_MAX; i++) {
        const b = pool[i];
        if (!b.active) continue;
        b.age += deltaTime;
        if (b.flashMs > 0) b.flashMs = Math.max(0, b.flashMs - deltaTime);

        if (b.phase === 0) {
            const p = Math.min(1, b.age / MUI_BLADE_SPAWN_MS);
            b.scale = 0.25 + 0.75 * p;
            b.alpha = p;
            b.stretch = 1;
            if (b.age >= MUI_BLADE_SPAWN_MS) {
                b.phase = 1;
                b.age = 0;
                b.scale = 1;
                b.alpha = 1;
            }
        } else if (b.phase === 1) {
            // the blade already points along its flight line and only waits a beat before it launches
            if (b.age >= MUI_BLADE_AIM_MS) {
                b.phase = 2;
                b.age = 0;
                b.vx = Math.cos(b.angle) * MUI_BLADE_SPEED;
                b.vy = Math.sin(b.angle) * MUI_BLADE_SPEED;
                b.stretch = 1.24;
                b.flashMs = 110;
                _muiEmitFx(5, b.x, b.y, 160, 1.0, b.angle, 0, 0);
                _muiPlaySfx('mui-blade-launch', b.x, b.y, 70, 'launch');
            }
        } else {
            b.prevX = b.x;
            b.prevY = b.y;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (typeof _marchCutsShot === 'function' && _marchCutsShot(b, b.prevX, b.prevY, 8)) { b.active = false; b.target = null; b.hitSet.clear(); b.trailLen = 0; continue; }
            b.stretch = 1.18;

            const tIdx = b.trailLen < MUI_TRAIL_MAX ? b.trailLen++ : (MUI_TRAIL_MAX - 1);
            for (let t = tIdx; t > 0; t--) {
                b.trailX[t] = b.trailX[t - 1];
                b.trailY[t] = b.trailY[t - 1];
            }
            b.trailX[0] = b.prevX;
            b.trailY[0] = b.prevY;

            if (typeof enemies !== 'undefined' && typeof dealDamage === 'function') {
                _muiSegA.x = b.prevX; _muiSegA.y = b.prevY;
                _muiSegB.x = b.x; _muiSegB.y = b.y;
                for (let j = 0; j < enemies.length; j++) {
                    const en = enemies[j];
                    if (!en || en.hp <= 0 || en._markedForDeath || en._deathPhase) continue;
                    if (b.hitSet.has(en)) continue;
                    if (typeof _isEnemyTargetable === 'function' && !_isEnemyTargetable(en)) continue;
                    const hitR = (en.size || 20) / 2 + 8;
                    const dist = typeof distToSegment === 'function'
                        ? distToSegment(en, _muiSegA, _muiSegB)
                        : Math.hypot(en.x - b.x, en.y - b.y);
                    if (dist <= hitR) {
                        b.hitSet.add(en);
                        const mult = _muiIsEliteOrHigher(en.type) ? 1.0 : MUI_NON_ELITE_MULT;
                        _muiBladeDmgSource.damage = (MUI_BLADE_ATK_RATIO * patk + MUI_BLADE_MAXHP_RATIO * (en.maxHp || en.hp || 0)) * mult * _muiHealthyBonus(en);
                        dealDamage(en, _muiBladeDmgSource);
                        const echo = _muiRollPoolEcho(en, _muiBladeDmgSource.damage, Math.random);
                        if (echo > 0) {
                            _muiEchoDmgSource.damage = echo;
                            dealDamage(en, _muiEchoDmgSource);
                            _muiPlaySfx('mui-pool-echo', en.x, en.y, 80, 'echo');
                            _muiEmitFx(0, en.x, en.y, 260, 1.0, b.angle + 0.9, 0, 0);
                        }
                        en._muiHitFlashMs = 150;
                        _muiPlaySfx('mui-blade-hit', en.x, en.y, 60, 'hit');
                        _muiEmitFx(0, en.x, en.y, 240, 1.0, b.angle, 0, 0);
                        if (!(typeof _mobPerf !== 'undefined' && _mobPerf)) {
                            for (let s = 0; s < 3; s++) {
                                const sa = b.angle + (s - 1) * 0.35;
                                _muiEmitFx(4, en.x, en.y, 220, 0.75, sa, Math.cos(sa) * 0.28, Math.sin(sa) * 0.28);
                            }
                        }
                    }
                }
            }

            if (typeof enemies !== 'undefined') {
                _muiSegA.x = b.prevX; _muiSegA.y = b.prevY;
                _muiSegB.x = b.x; _muiSegB.y = b.y;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const bullet = enemies[j];
                    if (!_muiBladeErasesBullet(bullet)) continue;
                    const dist = typeof distToSegment === 'function'
                        ? distToSegment(bullet, _muiSegA, _muiSegB)
                        : Math.hypot(bullet.x - b.x, bullet.y - b.y);
                    if (dist > MUI_BLADE_ERASE_RADIUS + (bullet.size || 6)) continue;
                    enemies.splice(j, 1);
                    _muiEmitFx(6, bullet.x, bullet.y, 260, 1.0, b.angle, 0, 0);
                }
            }

            if (b.x < -margin || b.x > cw + margin || b.y < -margin || b.y > ch + margin) {
                b.active = false;
                b.target = null;
                b.hitSet.clear();
            }
        }
    }
}

function _muiReset() {
    if (typeof window === 'undefined') return;
    if (window._muiWindupMs > 0 && window.AudioMgr && typeof window.AudioMgr.exitMuiWindupDuck === 'function') {
        window.AudioMgr.exitMuiWindupDuck();
    }
    window._muiQi = 0;
    window._muiReady = false;
    window._muiWindupMs = 0;
    window._muiWindupFx = null;
    window._muiScreenFx = null;
    window._muiWindupId = 0;
    window._muiLegionJustStarted = false;
    window._muiRemainMs = 0;
    window._muiActiveUntil = 0;
    window._muiIronLayers = 0;
    window._muiClock = 0;
    window._muiCallMs = 2000;
    window._muiShipFlashMs = 0;
    window._muiIronBreakMs = 0;
    window._muiLastBrokenSlot = -1;
    window._muiWavesSpawned = 0;
    window._muiWaveAccum = 0;
    window._muiArrayCounter = 0;
    window._muiFxCursor = 0;
    window._muiFxSeq = 0;
    window._muiSfxTimes = {};

    if (!window._muiArray) {
        window._muiArray = { active: false, id: 0, age: 0, duration: MUI_LEGION_MS, fadeMs: MUI_ARRAY_FADE_MS, zones: [], tickAccum: 0 };
    } else {
        window._muiArray.active = false;
        window._muiArray.age = 0;
        window._muiArray.tickAccum = 0;
    }

    if (!window._muiBlades) {
        window._muiBlades = [];
        for (let i = 0; i < MUI_BLADE_POOL_MAX; i++) {
            window._muiBlades.push({
                active: false, phase: 0, age: 0,
                x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0,
                angle: -Math.PI / 2, startAngle: -Math.PI / 2, targetAngle: -Math.PI / 2,
                target: null, weaponType: 0, alpha: 0, scale: 1, stretch: 1, flashMs: 0,
                hitSet: new Set(),
                trailX: new Float32Array(MUI_TRAIL_MAX),
                trailY: new Float32Array(MUI_TRAIL_MAX),
                trailLen: 0,
            });
        }
    } else {
        for (let i = 0; i < MUI_BLADE_POOL_MAX; i++) {
            window._muiBlades[i].active = false;
            window._muiBlades[i].target = null;
            window._muiBlades[i].hitSet.clear();
            window._muiBlades[i].trailLen = 0;
        }
    }

    if (!window._muiFx) {
        window._muiFx = [];
        for (let i = 0; i < MUI_FX_POOL_MAX; i++) {
            window._muiFx.push({ active: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, angle: 0, age: 0, life: 0, scale: 1, seed: 0 });
        }
    } else {
        for (let i = 0; i < MUI_FX_POOL_MAX; i++) {
            window._muiFx[i].active = false;
        }
    }

    if (typeof enemies !== 'undefined') {
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e) continue;
            e._muiArrayUntil = 0;
            e._muiRootedBy = 0;
            e._muiHoldMs = 0;
            e._muiSlowEnd = 0;
            e._muiSlowFactor = 1;
            e._muiHitFlashMs = 0;
            e._muiWaveSeen = 0;
        }
    }
}

if (typeof window !== 'undefined') {
    _muiReset();
    // Chain into _releaseReadySpaceSigil without modifying sigil-leo.js:
    // priority stays Cancer -> Leo -> Mui -> Capricorn.
    if (typeof _releaseReadySpaceSigil === 'function') {
        const _muiPrevReleaseSpaceSigil = _releaseReadySpaceSigil;
        _releaseReadySpaceSigil = function () {
            if (window._tidalSurgeReady) {
                _releaseTidalSurge();
                return true;
            }
            if (window._leoFateReady) return _releaseLeoFate();
            if (window._muiReady) return _muiRelease();
            return _muiPrevReleaseSpaceSigil();
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MUI_QI_MAX,
        MUI_WINDUP_MS,
        MUI_LEGION_MS,
        MUI_WAVES_TOTAL,
        MUI_BLADES_PER_WAVE,
        MUI_WAVE_INTERVAL_MS,
        MUI_BLADE_POOL_MAX,
        MUI_IRON_MAX,
        _muiChargeFor,
        _muiIsEliteOrHigher,
        _muiPickWeapon,
        _muiBladeSpawnPoint,
        _muiAimAngle,
        _muiArrayPickCenters,
        _muiArrayContains,
        _muiBladeErasesBullet,
        _muiRollPoolEcho,
        _muiHealthyBonus,
        MUI_HEALTHY_HP_RATIO,
        MUI_HEALTHY_BONUS,
        MUI_POOL_ECHO_CHANCE,
        MUI_POOL_ECHO_RATIO,
        MUI_ARRAY_COUNT,
        MUI_ARRAY_RADIUS,
        MUI_ARRAY_MIN_PLAYER_DIST,
        MUI_ARRAY_ABOVE_SHIP,
        _isSigilDamageSource,
        _muiStepWaveClock,
        _muiConsumeIronLayer,
        _muiPlayerCCImmune,
        _muiMoveSpeedMult,
        _muiAddQi,
        _muiOnEnemyKill,
        _muiRelease,
        _muiReset,
        _muiBeginFrame,
        updateSoulBlades,
        _muiPlaySfx,
        _muiUpdateArray,
        _muiStartLegion,
    };
}
