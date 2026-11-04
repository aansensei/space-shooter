// Pisces: Space Journey, Copyright 2024 An Nguyen. Licensed under the MIT License.
// Ammit governs its attacks and defenses on simulation time.

// The middle damage range is controlled by hide reduction and flat armor.
const AMMIT_TUNE_DR = 0.52;
const AMMIT_TUNE_ARMOR = 340;
const AMMIT_TUNE_EXPOSED_ARMOR = 40;
const AMMIT_TUNE_EXPOSED_DR = 0.15;
const AMMIT_TUNE_CAST_DR = 0.10;
const AMMIT_TUNE_ENRAGE_DR = 0.08;
const AMMIT_TUNE_HIT_CAP = 0.18;
const AMMIT_TUNE_WRAP_FRAC = 0.08;
const AMMIT_TUNE_LOSS_FRAC = 0.22;
const AMMIT_TUNE_LOSS_WINDOW = 2500;
const AMMIT_TUNE_HEART_DR = 0.02;
const AMMIT_TUNE_HEART_DAMAGE = 0.06;
const AMMIT_TUNE_HEART_COOLDOWN = 0.05;
const AMMIT_TUNE_ENRAGE_DAMAGE = 1.15;
const AMMIT_TUNE_ENRAGE_COOLDOWN = 1.35;
const AMMIT_TUNE_JAWS_CD = 5000;
const AMMIT_TUNE_WEIGH_CD = 12000;
const AMMIT_TUNE_CLAW_CD = 5000;
const AMMIT_TUNE_STOMP_CD = 9000;
const AMMIT_TUNE_JAWS_COEFF = 1.9;
const AMMIT_TUNE_PAN_COEFF = 2.3;
const AMMIT_TUNE_CLAW_COEFF = 1.7;
const AMMIT_TUNE_STOMP_COEFF = 1.8;
const AMMIT_TUNE_STOMP_OFFSET = 300;
const AMMIT_TUNE_STOMP_REACTION = 200;
const AMMIT_TUNE_SAND_SLOW = 0.65;
const AMMIT_TUNE_MOVE_FLOOR = 0.5;
const AMMIT_WEIGH_LOCK = 2200;
const AMMIT_WEIGH_VERDICT = 2600;
const AMMIT_WEIGH_RETRACT = 3250;
const AMMIT_WEIGH_END = 3700;
const AMMIT_DAMAGE_BUCKET = 50;
const AMMIT_DAMAGE_SLOTS = 101;
let _ammitTime = 0;
let _ammitSerial = 0;
let _ammitActive = 0;
let _ammitVisualUntil = 0;

function _ammitNow(enemy) { return Number.isFinite(enemy._amClock) ? enemy._amClock : performance.now(); }
function _ammitPassiveNow(enemy) { return enemy._amReal ? _ammitTime : _ammitNow(enemy); }

function _ammitSound(key, x, y) {
    if (window.AudioMgr) window.AudioMgr.playSfxAt(key, x, y);
}

function _ammitReset() {
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e._amScarab) { e.hp = 0; e.ownerRef = null; }
        if (e.type === 'ammit') { e._amScarabs.length = 0; e._amStomp.hits.length = 0; e._amSkill = 'none'; }
    }
    if (window._ammitSandPits) for (let i = 0; i < window._ammitSandPits.length; i++) window._ammitSandPits[i].born = -1e9;
    if (window._ammitDeathBursts) for (let i = 0; i < window._ammitDeathBursts.length; i++) window._ammitDeathBursts[i].spawnAt = -1e9;
    for (let i = 0; i < sentinels.length; i++) sentinels[i]._amStompId = 0;
    window._amStompSerial = 0; _ammitActive = 0; _ammitVisualUntil = 0;
    if (typeof _ammitReleasePyramid === 'function') _ammitReleasePyramid();
    if (window.AudioMgr) { window.AudioMgr.stopAmmitIdle(); window.AudioMgr.stopAmmitCues(); }
}

function _ammitTickWorld(dt) {
    if (window._kanadeCutscene) return;
    _ammitTime += Math.max(0, Number.isFinite(dt) ? dt : 0);
    if (_ammitActive) for (let i = 0; i < enemies.length; i++) if (enemies[i].type === 'ammit' && enemies[i].hp > 0) _ammitTickPassives(enemies[i], dt);
    if (_ammitActive && window.AudioMgr) window.AudioMgr.startAmmitIdle();
}

function _ammitArmor(enemy) {
    const now = _ammitPassiveNow(enemy);
    return enemy._amExposedUntil > now || enemy._amStaggerUntil > now ? AMMIT_TUNE_EXPOSED_ARMOR : AMMIT_TUNE_ARMOR;
}

// Time buckets aggregate every hit without dropping dense volleys.
function _ammitRecordLoss(enemy, amount) {
    if (!(amount > 0) || !Number.isFinite(amount)) return;
    enemy._amHitAt = _ammitNow(enemy);
    const now = _ammitPassiveNow(enemy), bucket = Math.floor(now / AMMIT_DAMAGE_BUCKET);
    const i = bucket % AMMIT_DAMAGE_SLOTS;
    if (enemy._amDmgT[i] !== bucket) { enemy._amDmgT[i] = bucket; enemy._amDmgL[i] = 0; }
    enemy._amDmgL[i] += amount;
    if (enemy._amFeather !== 'up') return;
    let sum = 0;
    for (let j = 0; j < AMMIT_DAMAGE_SLOTS; j++) if (bucket - enemy._amDmgT[j] < AMMIT_FEATHER_WINDOW / AMMIT_DAMAGE_BUCKET) sum += enemy._amDmgL[j];
    if (sum >= enemy.maxHp * AMMIT_FEATHER_FRAC) _ammitExpose(enemy);
}

function _ammitExpose(enemy) {
    const now = _ammitPassiveNow(enemy);
    enemy._amFeather = 'fallen'; enemy._amExposedUntil = now + AMMIT_EXPOSED;
    enemy._amFeatherBackAt = now + AMMIT_FEATHER_BACK;
    enemy._amWraps = 0; enemy._amWrapPool = 0;
    enemy._amWrapRegrowAt = enemy._amExposedUntil + AMMIT_WRAP_REGROW;
    enemy._amExposedCount++;
    _ammitSound('ammit-feather-fall', enemy.x, enemy.y);
}

const AMMIT_JAWS_CD = AMMIT_TUNE_JAWS_CD;
const AMMIT_WEIGH_CD = AMMIT_TUNE_WEIGH_CD;
const AMMIT_CLAW_CD = AMMIT_TUNE_CLAW_CD;
const AMMIT_CLAW_R = 290;
const AMMIT_CLAW_SPAN = 0.66;
const AMMIT_CLAW_REACH_PAD = 80;
const AMMIT_CLAW_WIND = 1100;
const AMMIT_CLAW_TRACK = 500;
const AMMIT_CLAW_COEFF = AMMIT_TUNE_CLAW_COEFF;
const AMMIT_CLAW_TRIGGER = 340;
const AMMIT_ENRAGE_FRAC = 0.30;
const AMMIT_STOMP_CD = AMMIT_TUNE_STOMP_CD;
const AMMIT_STOMP_WIND = 1000;
const AMMIT_STOMP_SPEED = 0.75;
const AMMIT_STOMP_GAP = 260;
const AMMIT_STOMP_BAND = 30;
const AMMIT_STOMP_COEFF = AMMIT_TUNE_STOMP_COEFF;
const AMMIT_LOSS_CAP_FRAC = AMMIT_TUNE_LOSS_FRAC;
const AMMIT_LOSS_WINDOW = AMMIT_TUNE_LOSS_WINDOW;
const AMMIT_SCARAB_CAP = 6;
const AMMIT_SCARAB_LIFE = 7000;
const AMMIT_HEART_LIFE = 10000;
const AMMIT_WRAP_REGROW = 6000;
const AMMIT_FEATHER_BACK = 12000;
const AMMIT_EXPOSED = 3000;
const AMMIT_FEATHER_WINDOW = 4000;
const AMMIT_FEATHER_FRAC = 0.12;
const AMMIT_STAGGER = 2000;
const AMMIT_RISE = 3000;
const AMMIT_JAWS_RADIUS = 110;
const AMMIT_PAN_RADIUS = 170;
const AMMIT_JAWS_COEFF = AMMIT_TUNE_JAWS_COEFF;
const AMMIT_PAN_COEFF = AMMIT_TUNE_PAN_COEFF;
const AMMIT_WRAP_LAYER_FRAC = AMMIT_TUNE_WRAP_FRAC;
const AMMIT_HEART_DR = AMMIT_TUNE_HEART_DR;

function spawnAmmit() {
    const now = _ammitTime;
    const size = 150;
    if (typeof _warmAmmitArt === 'function') _warmAmmitArt();
    if (typeof _ammitPreparePyramid === 'function') _ammitPreparePyramid();
    if (window.AudioMgr) window.AudioMgr.prepareEnemy('ammit');
    const hp = Math.ceil(Math.min(6600, 3200 + Math.floor(gameElapsedTime / 10000) * 95) * 1.15 * _walpurgisHpMult());
    const cw = typeof canvas !== 'undefined' && canvas.width ? canvas.width : 1280;
    const ch = typeof canvas !== 'undefined' && canvas.height ? canvas.height : 800;
    const cx = Math.min(size, cw * 0.5) + Math.random() * Math.max(0, cw - size * 2);
    const cy = Math.min(190, ch * 0.24);
    window._lastAmmitSpawn = performance.now();
    const enemy = {
        x: cx,
        y: cy,
        size,
        speed: 0,
        hp,
        maxHp: hp,
        _baseMaxHp: hp,
        isTargetedByA: false,
        hitBySkillF: false,
        laserHit: false,
        shield: 0,
        type: 'ammit',
        _amReal: true,
        _amMoveMult: 1,
        _amArenaWidth: cw,
        _amArenaHeight: ch,
        _amHearts: 0,
        _amHeartAt: -9999,
        _amWraps: 3,
        _amWrapLostAt: -9999,
        _amFeather: 'up',
        _amExposedUntil: -9999,
        _amJaws: { phase: 'idle', t: 0, tx: cx, ty: cy + 240 },
        _amWeigh: { phase: 'idle', t: 0, tilt: 0, leftCount: 0, rightCount: 0, balanced: false },
        _amHitAt: -9999,
        _spawnTime: now,
        _eyeBlinkTimers: new Float32Array(2),
        _eyeNextBlinks: new Float32Array([2200, 3100]),
        _amClock: now,
        _amId: ++_ammitSerial,
        _amExposedCount: 0,
        _amEntranceCue: 0,
        _amEnraged: false,
        _amHeartEnds: [],
        _amDmgT: new Float64Array(AMMIT_DAMAGE_SLOTS).fill(-1e9),
        _amDmgL: new Float64Array(AMMIT_DAMAGE_SLOTS),
        _amJawsCdEnd: now + AMMIT_RISE + 3500,
        _amWeighCdEnd: now + AMMIT_RISE + 9000,
        _amClawCdEnd: now + AMMIT_RISE + 2500,
        _amClaw: { phase: 'idle', t: 0, ang: Math.PI / 2, r: AMMIT_CLAW_R, span: AMMIT_CLAW_SPAN, ox: cx, oy: cy },
        _amStompCdEnd: now + AMMIT_RISE + 6000,
        _amStomp: { phase: 'idle', t: 0, gx: cx, gw: AMMIT_STOMP_GAP, y0: cy + size * 0.55, front: 0, id: 0, hitP: false, hits: [] },
        _amScarabs: [],
        _amJawsChained: false,
        _amSkill: 'none',
        _amSkillT: 0,
        _amSkillDone: false,
        _amStaggerUntil: -1,
        _amWrapRegrowAt: 0,
        _amWrapPool: Math.ceil(hp * AMMIT_WRAP_LAYER_FRAC),
        _amFeatherBackAt: 0
    };
    enemies.push(enemy);
    _ammitActive++;
    _ammitSound('ammit-rift-crack', enemy.x, enemy.y);
    if (typeof _enemySnapshotAtk === 'function') _enemySnapshotAtk(enemy, 'ammit');
    return enemy;
}

// Swallows the heart of whatever just died near an Ammit, up to five at a time, each lasting ten seconds.
function _ammitHoard(x, y, source) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (source && source._amScarab) return;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.type !== 'ammit' || !e._amReal || e === source || !(e.hp > 0)) continue;
        if (Math.hypot(e.x - x, e.y - y) > 600) continue;
        const now = _ammitPassiveNow(e);
        _ammitSound('ammit-heart-devour', x, y);
        if (e._amHeartEnds.length < 5) e._amHeartEnds.push(now + AMMIT_HEART_LIFE);
        else { let oldest = 0; for (let j = 1; j < e._amHeartEnds.length; j++) if (e._amHeartEnds[j] < e._amHeartEnds[oldest]) oldest = j; e._amHeartEnds[oldest] = now + AMMIT_HEART_LIFE; }
        e._amHeartAt = _ammitNow(e);
        e._amHeartFromX = x;
        e._amHeartFromY = y;
    }
}

// The Duat gateway absorbs every hit until the entrance completes.
function _ammitAbsorbHit(enemy) {
    if (!enemy._amReal) return false;
    return _ammitNow(enemy) - enemy._spawnTime < AMMIT_RISE;
}

// Linen wrap: each layer soaks a slice of Max HP worth of damage after armor has been applied, then bursts and the next layer
// takes over. Damage over time slips past the linen. Returns the damage that gets through to the body.
function _ammitWrapSoak(enemy, source, dmg) {
    if (enemy._amReal && dmg > 0) enemy._amWrapRegrowAt = Math.max(enemy._amExposedUntil + AMMIT_WRAP_REGROW, _ammitPassiveNow(enemy) + AMMIT_WRAP_REGROW);
    if (!enemy._amReal || enemy._amWraps <= 0 || !(dmg > 0)) return dmg;
    if (source._isSrDot || source.isTeslaDot || source._isTyVenomDot || source._isSthDot || source._isDtuDot || source._isNocToiDot || source._isWisdomZoneDot) return dmg;
    const now = _ammitPassiveNow(enemy);
    const layer = Math.ceil(enemy.maxHp * AMMIT_WRAP_LAYER_FRAC);
    if (!(enemy._amWrapPool > 0)) enemy._amWrapPool = layer;
    let left = dmg, burst = false;
    while (left > 0 && enemy._amWraps > 0) {
        const take = Math.min(left, enemy._amWrapPool);
        enemy._amWrapPool -= take;
        left -= take;
        if (enemy._amWrapPool <= 0) {
            enemy._amWraps--;
            burst = true;
            enemy._amWrapPool = enemy._amWraps > 0 ? layer : 0;
        }
    }
    enemy._amWrapRegrowAt = now + AMMIT_WRAP_REGROW;
    if (burst) {
        enemy._amWrapLostAt = _ammitNow(enemy);
        createParticles(enemy.x, enemy.y + enemy.size * 0.25, 14, '#f2d27a', 2, 7);
        if (window.AudioMgr) window.AudioMgr.playSfxAt('ammit-wrap-tear', enemy.x, enemy.y);
    } else if (now - (enemy._amWrapChipAt || 0) > 90) {
        enemy._amWrapChipAt = now;
        createParticles(enemy.x, enemy.y + enemy.size * 0.25, 3, '#f2d27a', 1, 4);
    }
    return left;
}

// Rolling limit on health lost: a burst can take at most 22% of Max HP at once, then 22% more for every 2.5s that pass, so no
// stack of true damage or damage amplifiers can empty Ammit before it has cast anything.
function _ammitClampHpLoss(enemy, dmg) {
    if (enemy.type !== 'ammit' || !enemy._amReal) return dmg;
    if (!(dmg > 0) || !Number.isFinite(dmg)) return 0;
    dmg = Math.min(dmg, Math.ceil(enemy.maxHp * AMMIT_TUNE_HIT_CAP));
    const now = _ammitPassiveNow(enemy), cap = Math.ceil(enemy.maxHp * AMMIT_LOSS_CAP_FRAC);
    const last = Number.isFinite(enemy._amLossAt) ? enemy._amLossAt : now;
    const tokens = Math.min(cap, (enemy._amLossTokens === undefined ? cap : enemy._amLossTokens) + Math.max(0, now - last) * cap / AMMIT_LOSS_WINDOW);
    const granted = Math.min(tokens, dmg);
    enemy._amLossTokens = tokens - granted; enemy._amLossAt = now;
    return Math.max(0, granted);
}

// Total damage reduction: heavy hide plus a Heart bonus, thinned while Exposed or staggered, and firmer while casting or enraged.
function _ammitDR(enemy) {
    const now = _ammitPassiveNow(enemy);
    if (enemy._amExposedUntil > now || now < (enemy._amStaggerUntil || 0)) return AMMIT_TUNE_EXPOSED_DR;
    let dr = AMMIT_TUNE_DR + AMMIT_HEART_DR * (enemy._amHearts || 0);
    if (enemy._amSkill && enemy._amSkill !== 'none') dr += AMMIT_TUNE_CAST_DR;
    if (enemy.hp < enemy.maxHp * AMMIT_ENRAGE_FRAC) dr += AMMIT_TUNE_ENRAGE_DR;
    return Math.min(0.85, dr);
}

// Sand scarabs hatch from the pit, crawl after the ship and can be shot down. At most six live at once.
function _ammitSpawnScarabs(enemy, x, y, count) {
    const list = enemy._amScarabs, now = _ammitPassiveNow(enemy);
    _ammitSound('ammit-scarab-hatch', x, y);
    for (let i = list.length - 1; i >= 0; i--) if (!(list[i].hp > 0)) list.splice(i, 1);
    const spd = ((typeof player !== 'undefined' && player.speed) || 6) / 3 * 0.5;
    // they hatch on the rim of the pit, never on top of whoever was bitten, and the first one points back at Ammit
    const base = Math.atan2(enemy.y - y, enemy.x - x), ch = canvas.height, cw = canvas.width;
    for (let i = 0; i < count && list.length < AMMIT_SCARAB_CAP; i++) {
        const a = base + i * Math.PI * 2 / count;
        const hp = Math.max(1, Math.ceil(enemy.maxHp * 0.015));
        const s = {
            x: Math.max(20, Math.min(cw - 20, x + Math.cos(a) * 150)), y: Math.max(20, Math.min(ch - 20, y + Math.sin(a) * 150)),
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            damage: 0.7 * (enemy.atk || 0), size: 13, hp, maxHp: hp,
            type: 'enemy_bullet', shield: 0, ownerRef: enemy,
            _amScarab: true, _amBornAt: now, _amSpd: spd
        };
        enemies.push(s);
        list.push(s);
    }
}

function _ammitSteerScarabs(enemy, now, dt) {
    const list = enemy._amScarabs;
    for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        if (!(s.hp > 0)) { s.ownerRef = null; list.splice(i, 1); continue; }
        if (now - s._amBornAt > AMMIT_SCARAB_LIFE) { s.hp = 0; s.ownerRef = null; list.splice(i, 1); continue; }
        const want = Math.atan2(player.y - s.y, player.x - s.x), cur = Math.atan2(s.vy, s.vx);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const step = 0.04 * (dt / 16.67), a = cur + Math.max(-step, Math.min(step, d));
        s.vx = Math.cos(a) * s._amSpd; s.vy = Math.sin(a) * s._amSpd;
    }
}

// The ship only slides left and right at the bottom of the screen, so the fan always reaches past the ship's row.
function _ammitClawReach(c) {
    const ch = typeof canvas !== 'undefined' && canvas.height ? canvas.height : 800;
    return Math.max(AMMIT_CLAW_R, Math.min(ch + 60, Math.hypot(player.x - c.ox, player.y - c.oy) + AMMIT_CLAW_REACH_PAD));
}

// True when a point of the given radius sits inside the claw sector.
function _ammitInClaw(c, x, y, r) {
    const dx = x - c.ox, dy = y - c.oy, dist = Math.hypot(dx, dy);
    if (dist > c.r + r) return false;
    if (dist < 1) return true;
    let d = Math.atan2(dy, dx) - c.ang;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d) <= c.span / 2 + Math.min(0.5, r / dist);
}

function _ammitOnDeath(enemy) {
    if (enemy._amDead) return;
    enemy._amDead = true; _ammitActive = Math.max(0, _ammitActive - 1);
    enemy._amSkill = 'none'; enemy._amStomp.hits.length = 0;
    enemy._amJaws.phase = enemy._amWeigh.phase = enemy._amClaw.phase = enemy._amStomp.phase = 'idle';
    for (let i = 0; i < enemy._amScarabs.length; i++) { enemy._amScarabs[i].hp = 0; enemy._amScarabs[i].ownerRef = null; }
    if (window._ammitSandPits) for (let i = 0; i < window._ammitSandPits.length; i++) if (window._ammitSandPits[i]._amOwner === enemy._amId) window._ammitSandPits[i].born = -1e9;
    _ammitVisualUntil = _ammitTime + 1200;
    if (!_ammitActive) {
        if (typeof _ammitReleasePyramid === 'function') _ammitReleasePyramid();
        if (window.AudioMgr) { window.AudioMgr.stopAmmitIdle(); window.AudioMgr.stopAmmitCues(); }
    }
    _ammitSound('ammit-death-roar', enemy.x, enemy.y);
    enemy._amScarabs.length = 0;
    for (let i = 0; i < sentinels.length; i++) if (sentinels[i]._amStompId === enemy._amStomp.id) sentinels[i]._amStompId = 0;
    _ammitHoard(enemy.x, enemy.y, enemy);
    if (typeof _spawnAmmitDeathBurst === 'function') _spawnAmmitDeathBurst(enemy.x, enemy.y, enemy.size, _ammitTime, enemy._amHearts || 0);
    createParticles(enemy.x, enemy.y, 36, '#f2b72e', 3, 11);
    _setShake(12, 380);
}

function _ammitHitSentinel(enemy, s, coeff, mult) {
    dealDamage(s, { damage: coeff * enemy.atk * mult * _enemyEnrageMult(enemy), isTrueDamage: false, _noHitSfx: true, _attackerType: 'ammit', _capSource: enemy });
}

function _ammitHitPlayer(enemy, coeff = 1, mult = 1) {
    const damage = coeff * (enemy.atk || 0) * mult * _enemyEnrageMult(enemy);
    if (!_yuushaPierceRedirect(damage, false, enemy)) {
        playerTakesHit(enemy);
    }
}

function _ammitUnits(enemy, w) {
    const mid = canvas.width * 0.5;
    let left = player.x < mid ? 1 : 0, right = player.x > mid ? 1 : 0;
    for (let i = 0; i < sentinels.length; i++) { const s = sentinels[i]; if (!(s.hp > 0)) continue; if (s.x < mid) left++; else if (s.x > mid) right++; }
    w.leftCount = left; w.rightCount = right; w.balanced = left === right;
}

function _ammitTickPassives(enemy, dt) {
    const now = _ammitPassiveNow(enemy);
    if (enemy._amScarabs.length > 0) _ammitSteerScarabs(enemy, now, dt);
    const ends = enemy._amHeartEnds; let kept = 0;
    for (let i = 0; i < ends.length; i++) if (ends[i] > now) ends[kept++] = ends[i];
    ends.length = kept;
    enemy._amHearts = kept;
    if (enemy._amFeather === 'fallen' && now >= enemy._amFeatherBackAt) { enemy._amFeather = 'up'; enemy._amFeatherReturnedAt = _ammitNow(enemy); _ammitSound('ammit-feather-return', enemy.x, enemy.y); }
    if (enemy._amWraps < 3 && now >= enemy._amExposedUntil && now >= enemy._amWrapRegrowAt) {
        if (enemy._amWraps === 0) enemy._amWrapPool = Math.ceil(enemy.maxHp * AMMIT_WRAP_LAYER_FRAC);
        enemy._amWraps++;
        enemy._amWrapRegrownAt = _ammitNow(enemy);
        enemy._amWrapRegrowAt = now + AMMIT_WRAP_REGROW;
    }

}

function _updateAmmitFight(enemy, deltaTime) {
    const dt = Math.min(50, Math.max(0, Number.isFinite(deltaTime) ? deltaTime : 0));
    enemy._amClock += dt;
    const now = _ammitNow(enemy), realNow = performance.now();
    const spawnAge = now - enemy._spawnTime;
    if (spawnAge < AMMIT_RISE) {
        const cue = spawnAge >= 2400 ? 3 : spawnAge >= 1400 ? 2 : spawnAge >= 600 ? 1 : 0;
        while (enemy._amEntranceCue < cue) {
            enemy._amEntranceCue++;
            const n = enemy._amEntranceCue;
            _ammitSound(n === 1 ? 'ammit-rift-open' : n === 2 ? 'ammit-emerge' : 'ammit-rift-close', enemy.x, enemy.y);
            if (n === 3) _setShake(6, 250);
        }
        return;
    }
    if (enemy._silencedEnd > realNow || enemy._stunEnd > realNow || enemy._frozenEnd > realNow) return;
    if (window._spacetimeFlowActive) {
        const advance = TD_FLOW_ENEMY_CD * dt;
        enemy._amJawsCdEnd -= advance; enemy._amWeighCdEnd -= advance;
        enemy._amClawCdEnd -= advance; enemy._amStompCdEnd -= advance;
    }
    const cw = canvas.width, ch = canvas.height;
    if (enemy._amArenaWidth !== cw || enemy._amArenaHeight !== ch) {
        const st = enemy._amStomp, j = enemy._amJaws, w = enemy._amWeigh;
        st.gw = Math.min(AMMIT_STOMP_GAP, cw * .7);
        st.gx = Math.max(st.gw / 2, Math.min(cw - st.gw / 2, st.gx));
        j.tx = Math.max(0, Math.min(cw, j.tx)); j.ty = Math.max(0, Math.min(ch, j.ty));
        if (w.panY > 0) w.panY = Math.max(ch * .45, Math.min(ch * .8, w.panY));
        enemy._amArenaWidth = cw; enemy._amArenaHeight = ch;
    }
    // below 30% health Ammit enrages: shorter cooldowns, harder hits, and Jaws bites twice
    const enraged = enemy.hp < enemy.maxHp * AMMIT_ENRAGE_FRAC;
    if (enraged && !enemy._amEnraged) { enemy._amEnraged = true; enemy._amEnrageAt = now; _ammitSound('ammit-enrage', enemy.x, enemy.y); _setShake(8, 300); }
    const hearts = enemy._amHearts, dmgMult = (1 + AMMIT_TUNE_HEART_DAMAGE * hearts) * (enraged ? AMMIT_TUNE_ENRAGE_DAMAGE : 1), cdRate = (1 + AMMIT_TUNE_HEART_COOLDOWN * hearts) * (enraged ? AMMIT_TUNE_ENRAGE_COOLDOWN : 1);
    const staggered = _ammitPassiveNow(enemy) < enemy._amStaggerUntil, rising = now - enemy._spawnTime < AMMIT_RISE;
    if (enemy._amSkill !== 'weigh' && enemy._amSkill !== 'claw' && enemy._amSkill !== 'stomp' && !staggered && !rising && !(enemy._rootEnd > realNow)) {
        const dx = player.x - enemy.x;
        enemy.x += Math.max(-1.1, Math.min(1.1, dx * 0.01)) * (dt / 16.67) * (1 + 0.04 * hearts) * enemy._amMoveMult;
    }
    enemy.x = Math.max(Math.min(enemy.size, cw * 0.5), Math.min(Math.max(cw * 0.5, cw - enemy.size), enemy.x));

    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius && now >= (enemy._bodyHitCooldownEnd || 0)) {
        playerTakesHit(enemy);
        enemy._bodyHitCooldownEnd = now + 1500;
    }

    if (enemy._amSkill === 'none') {
        enemy._amJaws.phase = 'idle'; enemy._amWeigh.phase = staggered ? 'stagger' : 'idle';
        if (staggered) enemy._amWeigh.t = AMMIT_STAGGER - (enemy._amStaggerUntil - _ammitPassiveNow(enemy));
        if (!staggered && !rising) {
            if (now >= enemy._amWeighCdEnd) {
                enemy._amSkill = 'weigh'; enemy._amSkillT = 0; enemy._amSkillDone = false;
                enemy._amWeigh.tilt = 0; enemy._amWeigh.velocity = 0; enemy._amWeigh.locked = false;
                _ammitSound('ammit-weigh-open', enemy.x, enemy.y);
                // the pans hang at the ship's height when the scale opens, so the verdict really lands where the fight is
                enemy._amWeigh.panY = Math.max(canvas.height * 0.45, Math.min(canvas.height * 0.80, player.y));
            } else if (now >= enemy._amClawCdEnd && (enemy._amForceClaw || Math.abs(player.x - enemy.x) < AMMIT_CLAW_TRIGGER)) {
                const c = enemy._amClaw;
                enemy._amForceClaw = false;
                c._windSfx = false;
                enemy._amSkill = 'claw'; enemy._amSkillT = 0; enemy._amSkillDone = false;
                c.r = AMMIT_CLAW_R; c.span = AMMIT_CLAW_SPAN; c.ox = enemy.x; c.oy = enemy.y + enemy.size * 0.15;
                c.ang = Math.max(0.35, Math.min(Math.PI - 0.35, Math.atan2(player.y - c.oy, player.x - c.ox)));
                c.r = _ammitClawReach(c);
            } else if (now >= enemy._amStompCdEnd) {
                // the wave leaves one safe gap, set to the side of the ship so it has to move
                const st = enemy._amStomp, dir = Math.random() < 0.5 ? -1 : 1;
                const offset = Math.min(AMMIT_TUNE_STOMP_OFFSET, AMMIT_STOMP_GAP * .5 + player.speed * AMMIT_TUNE_MOVE_FLOOR * AMMIT_TUNE_SAND_SLOW * Math.max(0, AMMIT_STOMP_WIND - AMMIT_TUNE_STOMP_REACTION) / 16.67 - 20);
                let gx = player.x + dir * offset;
                if (gx < 150 || gx > cw - 150) gx = player.x - dir * offset;
                enemy._amSkill = 'stomp'; enemy._amSkillT = 0; enemy._amSkillDone = false;
                st.gw = Math.min(AMMIT_STOMP_GAP, cw * 0.7); st.gx = Math.max(st.gw / 2 + 20, Math.min(cw - st.gw / 2 - 20, gx));
                st.y0 = enemy.y + enemy.size * 0.55; st.front = st.y0; st.phase = 'wind'; st.t = 0; st.hitP = false; st.hits.length = 0;
                st.id = window._amStompSerial = (window._amStompSerial || 0) + 1;
                _ammitSound('ammit-stomp-wind', enemy.x, enemy.y);
            } else if (now >= enemy._amJawsCdEnd) {
                enemy._amSkill = 'jaws'; enemy._amSkillT = 0; enemy._amSkillDone = false;
                _ammitSound('ammit-jaws-lock', enemy.x, enemy.y);
                const pick = sentinels.length > 0 && Math.random() < 0.45 ? sentinels[Math.floor(Math.random() * sentinels.length)] : player;
                enemy._amJaws.tx = pick.x; enemy._amJaws.ty = pick.y;
            }
        }
        return;
    }

    enemy._amSkillT += dt;
    const T = enemy._amSkillT;
    if (enemy._amSkill === 'jaws') {
        const j = enemy._amJaws;
        if (T < 260) { j.phase = 'lock'; j.t = T; }
        else if (T < 1300) { if (j.phase !== 'close') _ammitSound('ammit-jaws-close', j.tx, j.ty); j.phase = 'close'; j.t = T; }
        else if (T < 1950) {
            j.phase = 'bite'; j.t = T - 1300;
            if (!enemy._amSkillDone) {
                enemy._amSkillDone = true;
                const tx = j.tx, ty = j.ty;
                if (typeof _spawnAmmitSandPit === 'function') _spawnAmmitSandPit(tx, ty, _ammitTime, 3000, enemy._amId);
                if (Math.hypot(player.x - tx, player.y - ty) < AMMIT_JAWS_RADIUS + (player.hitRadius || 0) && !_capBlocksSource(enemy, player)) _ammitHitPlayer(enemy, AMMIT_JAWS_COEFF, dmgMult);
                for (let i = sentinels.length - 1; i >= 0; i--) {
                    const s = sentinels[i];
                    if (Math.hypot(s.x - tx, s.y - ty) < AMMIT_JAWS_RADIUS && !_capBlocksSource(enemy, s)) _ammitHitSentinel(enemy, s, AMMIT_JAWS_COEFF, dmgMult);
                }
                _ammitSpawnScarabs(enemy, tx, ty, enraged ? 4 : 3);
                _setShake(8, 300);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('ammit-jaws-bite', tx, ty);
            }
        } else if (T < 2400) { j.phase = 'after'; j.t = T - 1950; }
        else if (enraged && !enemy._amJawsChained) {
            enemy._amJawsChained = true; enemy._amSkillT = 0; enemy._amSkillDone = false;
            j.tx = player.x; j.ty = player.y; j.phase = 'lock'; j.t = 0;
            _ammitSound('ammit-jaws-lock', j.tx, j.ty);
        } else { enemy._amJawsChained = false; j.phase = 'idle'; j.t = 0; enemy._amSkill = 'none'; enemy._amJawsCdEnd = now + AMMIT_JAWS_CD / cdRate; }
        return;
    }

    if (enemy._amSkill === 'stomp') {
        const st = enemy._amStomp;
        if (T < AMMIT_STOMP_WIND) { st.phase = 'wind'; st.t = T; return; }
        const wt = T - AMMIT_STOMP_WIND;
        if (!enemy._amSkillDone) {
            enemy._amSkillDone = true;
            _setShake(9, 320);
            createParticles(enemy.x, st.y0, 20, '#f2d27a', 3, 10);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('ammit-stomp-slam', enemy.x, st.y0);
        }
        st.phase = 'wave'; st.t = wt; st.front = st.y0 + AMMIT_STOMP_SPEED * wt;
        // the front sweeps down the arena, everything outside the gap that it crosses is hit once
        const pr = player.hitRadius || 0;
        if (!st.hitP && Math.abs(player.y - st.front) <= AMMIT_STOMP_BAND + pr && Math.abs(player.x - st.gx) > st.gw / 2 && !_capBlocksSource(enemy, player)) {
            st.hitP = true;
            _ammitHitPlayer(enemy, AMMIT_STOMP_COEFF, dmgMult);
        }
        for (let i = sentinels.length - 1; i >= 0; i--) {
            const s = sentinels[i];
            if (st.hits.indexOf(s) !== -1) continue;
            if (Math.abs(s.y - st.front) <= AMMIT_STOMP_BAND + (s.size || 20) * 0.5 && Math.abs(s.x - st.gx) > st.gw / 2 && !_capBlocksSource(enemy, s)) {
                st.hits.push(s);
                _ammitHitSentinel(enemy, s, AMMIT_STOMP_COEFF, dmgMult);
            }
        }
        if (st.front > ch + AMMIT_STOMP_BAND + 20) { st.phase = 'idle'; st.t = 0; st.hits.length = 0; enemy._amSkill = 'none'; enemy._amStompCdEnd = now + AMMIT_STOMP_CD / cdRate; }
        return;
    }

    if (enemy._amSkill === 'claw') {
        const c = enemy._amClaw;
        if (T < AMMIT_CLAW_TRACK) { c.ox = enemy.x; c.oy = enemy.y + enemy.size * 0.15; }
        if (T < AMMIT_CLAW_WIND) {
            c.phase = 'wind'; c.t = T;
            // the growl is timed to end right as the rakes land
            if (!c._windSfx && T >= AMMIT_CLAW_WIND - 750) { c._windSfx = true; _ammitSound('ammit-claw-wind', enemy.x, enemy.y); }
            // the swing keeps tracking the ship until the last 600ms, then the arc is fixed
            if (T < AMMIT_CLAW_TRACK) { c.ang = Math.max(0.35, Math.min(Math.PI - 0.35, Math.atan2(player.y - c.oy, player.x - c.ox))); c.r = _ammitClawReach(c); }
        } else if (T < AMMIT_CLAW_WIND + 250) {
            c.phase = 'strike'; c.t = T - AMMIT_CLAW_WIND;
            if (!enemy._amSkillDone) {
                enemy._amSkillDone = true;
                if (_ammitInClaw(c, player.x, player.y, player.hitRadius || 0) && !_capBlocksSource(enemy, player)) _ammitHitPlayer(enemy, AMMIT_CLAW_COEFF, dmgMult);
                for (let i = sentinels.length - 1; i >= 0; i--) {
                    const s = sentinels[i];
                    if (_ammitInClaw(c, s.x, s.y, (s.size || 20) * 0.5) && !_capBlocksSource(enemy, s)) _ammitHitSentinel(enemy, s, AMMIT_CLAW_COEFF, dmgMult);
                }
                _setShake(10, 340);
                for (let k = -1; k <= 1; k++) createParticles(c.ox + Math.cos(c.ang + k * 0.2) * c.r * 0.75, c.oy + Math.sin(c.ang + k * 0.2) * c.r * 0.75, 9, k ? '#f2d27a' : '#fff0b8', 3, 10);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('ammit-claw-strike', c.ox, c.oy);
            }
        } else if (T < AMMIT_CLAW_WIND + 700) { c.phase = 'after'; c.t = T - AMMIT_CLAW_WIND - 250; }
        else { c.phase = 'idle'; c.t = 0; enemy._amSkill = 'none'; enemy._amClawCdEnd = now + AMMIT_CLAW_CD / cdRate; }
        return;
    }

    const w = enemy._amWeigh;
    if (!w.locked && T >= AMMIT_WEIGH_LOCK) { w.locked = true; _ammitUnits(enemy, w); }
    else if (!w.locked) _ammitUnits(enemy, w);
    const target = T < 600 || w.balanced ? 0 : (w.leftCount > w.rightCount ? -0.9 : 0.9);
    const omega = 0.012, decay = Math.exp(-omega * dt), distance = w.tilt - target;
    const velocity = w.velocity || 0, step = (velocity + omega * distance) * dt;
    w.tilt = target + (distance + step) * decay;
    w.velocity = (velocity - omega * step) * decay;
    if (T < 600) { w.phase = 'summon'; w.t = T; }
    else if (T < AMMIT_WEIGH_VERDICT) {
        if (w.phase !== 'weigh') _ammitSound('ammit-weigh-tilt', enemy.x, enemy.y);
        w.phase = 'weigh'; w.t = T - 600;
    } else if (T < AMMIT_WEIGH_RETRACT) {
        w.phase = 'verdict'; w.t = T - AMMIT_WEIGH_VERDICT;
        if (!enemy._amSkillDone) {
            enemy._amSkillDone = true;
            _ammitSound(w.balanced ? 'ammit-weigh-balanced' : 'ammit-weigh-slam', cw * (w.leftCount > w.rightCount ? 0.25 : 0.75), w.panY);
            if (w.balanced) {
                enemy._amStaggerUntil = _ammitPassiveNow(enemy) + AMMIT_STAGGER;
                createParticles(enemy.x, enemy.y, 24, '#fff0b8', 3, 9);
                _setShake(5, 260);
            } else {
                const cx = cw * (w.leftCount > w.rightCount ? 0.25 : 0.75);
                const cy = w.panY > 0 ? w.panY : ch * 0.56;
                if (Math.hypot(player.x - cx, player.y - cy) < AMMIT_PAN_RADIUS + (player.hitRadius || 0) && !_capBlocksSource(enemy, player)) _ammitHitPlayer(enemy, AMMIT_PAN_COEFF, dmgMult);
                for (let i = sentinels.length - 1; i >= 0; i--) {
                    const s = sentinels[i];
                    if (Math.hypot(s.x - cx, s.y - cy) < AMMIT_PAN_RADIUS && !_capBlocksSource(enemy, s)) _ammitHitSentinel(enemy, s, AMMIT_PAN_COEFF, dmgMult);
                }
                _setShake(12, 380);
                createParticles(cx, cy, 30, '#f2b72e', 4, 12);
            }
        }
    } else if (T < AMMIT_WEIGH_END) { w.phase = 'retract'; w.t = T - AMMIT_WEIGH_RETRACT;
    } else {
        w.phase = 'idle'; w.t = 0; enemy._amSkill = 'none'; enemy._amWeighCdEnd = now + AMMIT_WEIGH_CD / cdRate;
        if (!w.balanced) enemy._amJawsCdEnd = Math.max(enemy._amJawsCdEnd, now + 1500);
    }
}

function updateAmmit(enemy, deltaTime, auraSpeed = 1) {
    if (!enemy) return;
    if (window._kanadeCutscene || enemy._thanMenhFrozen) return;
    const now = performance.now();
    let mult = auraSpeed;
    if (enemy._riftSlow) mult *= .65;
    if (enemy._orbRetaliationSlowEnd > now) mult *= .75;
    if (enemy._dtuSlow && enemy._dtuSlowEnd > now) mult *= .70;
    if (enemy._slowEnd > now && Number.isFinite(enemy._slowFactor) && enemy._slowFactor > 0) mult /= enemy._slowFactor;
    if (typeof teslaBoltSlowMult === 'function') mult *= teslaBoltSlowMult(enemy, now);
    enemy._amMoveMult = Number.isFinite(mult) ? Math.max(0, mult) : 1;
    _updateAmmitFight(enemy, deltaTime);
}

