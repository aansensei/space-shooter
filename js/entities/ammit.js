// Pisces: Space Journey, Copyright 2024 An Nguyen. Licensed under the MIT License.
// js/entities/ammit.js: Ammit, Devourer of Hearts (Elite). Real fight logic plus the visual demo loop used by the preview page and the Guide.

const AMMIT_JAWS_CD = 5000;
const AMMIT_WEIGH_CD = 12000;
const AMMIT_CLAW_CD = 5000;
const AMMIT_CLAW_R = 290;
const AMMIT_CLAW_SPAN = 1.75;
const AMMIT_CLAW_WIND = 750;
const AMMIT_CLAW_COEFF = 1.7;
const AMMIT_CLAW_TRIGGER = 340;
const AMMIT_ENRAGE_FRAC = 0.30;
const AMMIT_STOMP_CD = 9000;
const AMMIT_STOMP_WIND = 1000;
const AMMIT_STOMP_SPEED = 0.75;
const AMMIT_STOMP_GAP = 260;
const AMMIT_STOMP_BAND = 30;
const AMMIT_STOMP_COEFF = 1.8;
const AMMIT_LOSS_CAP_FRAC = 0.22;
const AMMIT_LOSS_WINDOW = 2500;
const AMMIT_SCARAB_CAP = 6;
const AMMIT_SCARAB_LIFE = 7000;
const AMMIT_HEART_LIFE = 10000;
const AMMIT_WRAP_REGROW = 6000;
const AMMIT_FEATHER_BACK = 12000;
const AMMIT_EXPOSED = 3000;
const AMMIT_FEATHER_WINDOW = 4000;
const AMMIT_FEATHER_FRAC = 0.12;
const AMMIT_STAGGER = 2000;
const AMMIT_RISE = 1300;
const AMMIT_JAWS_RADIUS = 110;
const AMMIT_PAN_RADIUS = 170;
const AMMIT_JAWS_COEFF = 1.9;
const AMMIT_PAN_COEFF = 2.3;
const AMMIT_WRAP_LAYER_FRAC = 0.08;
const AMMIT_HEART_DR = 0.02;

function spawnAmmit() {
    const now = performance.now();
    const size = 150;
    const real = window._ammitDemo !== true;
    const hp = real ? Math.ceil(Math.min(6600, 3200 + Math.floor(gameElapsedTime / 10000) * 95) * 1.15 * _walpurgisHpMult()) : 4000;
    const cw = typeof canvas !== 'undefined' && canvas.width ? canvas.width : 1280;
    const ch = typeof canvas !== 'undefined' && canvas.height ? canvas.height : 800;
    const cx = real ? size + Math.random() * (cw - size * 2) : cw * 0.5;
    const cy = Math.min(real ? 190 : 220, ch * (real ? 0.24 : 0.26));
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
        _amReal: real,
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
        _demoClock: 0,
        _demoStep: -1,
        _amHeartEnds: [],
        _amDmgT: new Float32Array(24).fill(-1e9),
        _amDmgL: new Float32Array(24),
        _amDmgCursor: 0,
        _amLastHp: hp,
        _amJawsCdEnd: now + 3500,
        _amWeighCdEnd: now + 9000,
        _amClawCdEnd: now + 2500,
        _amClaw: { phase: 'idle', t: 0, ang: Math.PI / 2, r: AMMIT_CLAW_R, span: AMMIT_CLAW_SPAN, ox: cx, oy: cy },
        _amStompCdEnd: now + 6000,
        _amStomp: { phase: 'idle', t: 0, gx: cx, gw: AMMIT_STOMP_GAP, y0: cy + size * 0.55, front: 0, id: 0, hitP: false },
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
    if (typeof _enemySnapshotAtk === 'function') _enemySnapshotAtk(enemy, 'ammit');
    return enemy;
}

// Swallows the heart of whatever just died near an Ammit, up to five at a time, each lasting ten seconds.
function _ammitHoard(x, y, source) {
    if (source && source._amScarab) return;
    const now = performance.now();
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.type !== 'ammit' || !e._amReal || e === source || !(e.hp > 0)) continue;
        if (Math.hypot(e.x - x, e.y - y) > 600) continue;
        if (e._amHeartEnds.length < 5) e._amHeartEnds.push(now + AMMIT_HEART_LIFE);
        else e._amHeartEnds[0] = now + AMMIT_HEART_LIFE;
        e._amHeartAt = now;
        e._amHeartFromX = x;
        e._amHeartFromY = y;
    }
}

// Ammit cannot be hurt while it is still rising out of the sand. Returns true when the hit is swallowed.
function _ammitAbsorbHit(enemy) {
    if (!enemy._amReal) return false;
    return performance.now() - enemy._spawnTime < AMMIT_RISE;
}

// Linen wrap: each layer soaks a slice of Max HP worth of damage after armor has been applied, then bursts and the next layer
// takes over. Damage over time slips past the linen. Returns the damage that gets through to the body.
function _ammitWrapSoak(enemy, source, dmg) {
    if (!enemy._amReal || enemy._amWraps <= 0 || !(dmg > 0)) return dmg;
    if (source._isSrDot || source.isTeslaDot || source._isTyVenomDot || source._isSthDot || source._isDtuDot || source._isNocToiDot || source._isWisdomZoneDot) return dmg;
    const now = performance.now();
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
        enemy._amWrapLostAt = now;
        createParticles(enemy.x, enemy.y + enemy.size * 0.25, 14, '#f2d27a', 2, 7);
        if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
    } else if (now - (enemy._amWrapChipAt || 0) > 90) {
        enemy._amWrapChipAt = now;
        createParticles(enemy.x, enemy.y + enemy.size * 0.25, 3, '#f2d27a', 1, 4);
    }
    return left;
}

// Rolling limit on health lost: a burst can take at most 22% of Max HP at once, then 22% more for every 2.5s that pass, so no
// stack of true damage or damage amplifiers can empty Ammit before it has cast anything.
function _ammitClampHpLoss(enemy, dmg) {
    if (enemy.type !== 'ammit' || !enemy._amReal || !(dmg > 0)) return dmg;
    return _goliathDrawBucket(enemy, '_amLossTokens', '_amLossAt', Math.ceil(enemy.maxHp * AMMIT_LOSS_CAP_FRAC), AMMIT_LOSS_WINDOW, dmg);
}

// Total damage reduction: heavy hide plus a Heart bonus, thinned while Exposed or staggered, and firmer while casting or enraged.
function _ammitDR(enemy) {
    const now = performance.now();
    if (enemy._amExposedUntil > now || now < (enemy._amStaggerUntil || 0)) return 0.15;
    let dr = 0.42 + AMMIT_HEART_DR * (enemy._amHearts || 0);
    if (enemy._amSkill && enemy._amSkill !== 'none') dr += 0.10;
    if (enemy.hp < enemy.maxHp * AMMIT_ENRAGE_FRAC) dr += 0.08;
    return dr;
}

// Sand scarabs hatch from the pit, crawl after the ship and can be shot down. At most six live at once.
function _ammitSpawnScarabs(enemy, x, y, count) {
    const list = enemy._amScarabs, now = performance.now();
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
        if (!(s.hp > 0)) { list.splice(i, 1); continue; }
        if (now - s._amBornAt > AMMIT_SCARAB_LIFE) { s.hp = 0; list.splice(i, 1); continue; }
        const want = Math.atan2(player.y - s.y, player.x - s.x), cur = Math.atan2(s.vy, s.vx);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const step = 0.04 * (dt / 16.67), a = cur + Math.max(-step, Math.min(step, d));
        s.vx = Math.cos(a) * s._amSpd; s.vy = Math.sin(a) * s._amSpd;
    }
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
    for (let i = 0; i < enemy._amScarabs.length; i++) enemy._amScarabs[i].hp = 0;
    enemy._amScarabs.length = 0;
    if (typeof _spawnAmmitDeathBurst === 'function') _spawnAmmitDeathBurst(enemy.x, enemy.y, enemy.size, performance.now(), enemy._amHearts || 0);
    createParticles(enemy.x, enemy.y, 36, '#f2b72e', 3, 11);
    _setShake(12, 380);
}

function _ammitHitSentinel(enemy, s, coeff, mult) {
    dealDamage(s, { damage: coeff * enemy.atk * mult * _enemyEnrageMult(enemy), isTrueDamage: false, _noHitSfx: true, _attackerType: 'ammit', _capSource: enemy });
}

function _ammitHitPlayer(enemy) {
    if (!_yuushaPierceRedirect(enemy.atk || 0, false, enemy)) playerTakesHit(enemy);
}

function _ammitUnits(enemy, w) {
    const mid = canvas.width * 0.5;
    let left = player.x < mid ? 1 : 0, right = left ? 0 : 1;
    for (let i = 0; i < sentinels.length; i++) { if (sentinels[i].x < mid) left++; else right++; }
    w.leftCount = left; w.rightCount = right; w.balanced = left === right;
}

function _updateAmmitFight(enemy, deltaTime) {
    const now = performance.now(), dt = Math.min(50, Math.max(0, deltaTime || 16.67));
    const cw = canvas.width, ch = canvas.height;
    const ends = enemy._amHeartEnds; let kept = 0;
    for (let i = 0; i < ends.length; i++) if (ends[i] > now) ends[kept++] = ends[i];
    ends.length = kept;
    enemy._amHearts = kept;
    // below 30% health Ammit enrages: shorter cooldowns, harder hits, and Jaws bites twice
    const enraged = enemy.hp < enemy.maxHp * AMMIT_ENRAGE_FRAC;
    const hearts = kept, dmgMult = (1 + 0.06 * hearts) * (enraged ? 1.15 : 1), cdRate = (1 + 0.05 * hearts) * (enraged ? 1.35 : 1);
    if (enemy._amScarabs.length > 0) _ammitSteerScarabs(enemy, now, dt);

    // the Feather of Truth falls when too much health goes in a short window
    const lost = enemy._amLastHp - enemy.hp;
    enemy._amLastHp = enemy.hp;
    if (lost > 0) {
        const c = enemy._amDmgCursor; enemy._amDmgT[c] = now; enemy._amDmgL[c] = lost; enemy._amDmgCursor = (c + 1) % enemy._amDmgT.length;
        if (enemy._amFeather === 'up' && now - enemy._spawnTime > AMMIT_RISE) {
            let sum = 0;
            for (let i = 0; i < enemy._amDmgT.length; i++) if (now - enemy._amDmgT[i] <= AMMIT_FEATHER_WINDOW) sum += enemy._amDmgL[i];
            if (sum >= enemy.maxHp * AMMIT_FEATHER_FRAC) {
                enemy._amFeather = 'fallen';
                enemy._amExposedUntil = now + AMMIT_EXPOSED;
                enemy._amFeatherBackAt = now + AMMIT_FEATHER_BACK;
                enemy._amWraps = 0;
                enemy._amWrapPool = 0;
                enemy._amWrapRegrowAt = enemy._amExposedUntil + AMMIT_WRAP_REGROW;
                enemy._amDmgT.fill(-1e9);
                createParticles(enemy.x, enemy.y - enemy.size * 0.4, 18, '#fff0b8', 2, 8);
                _setShake(4, 200);
            }
        }
    }
    if (enemy._amFeather === 'fallen' && now >= enemy._amFeatherBackAt) enemy._amFeather = 'up';
    if (enemy._amWraps < 3 && now >= enemy._amExposedUntil && now >= enemy._amWrapRegrowAt) {
        if (enemy._amWraps === 0) enemy._amWrapPool = Math.ceil(enemy.maxHp * AMMIT_WRAP_LAYER_FRAC);
        enemy._amWraps++;
        enemy._amWrapRegrowAt = now + AMMIT_WRAP_REGROW;
    }

    const staggered = now < enemy._amStaggerUntil, rising = now - enemy._spawnTime < AMMIT_RISE;
    if (enemy._amSkill !== 'weigh' && enemy._amSkill !== 'claw' && enemy._amSkill !== 'stomp' && !staggered && !rising) {
        const dx = player.x - enemy.x;
        enemy.x += Math.max(-1.1, Math.min(1.1, dx * 0.01)) * (dt / 16.67) * (1 + 0.04 * hearts);
    }
    enemy.x = Math.max(enemy.size, Math.min(cw - enemy.size, enemy.x));

    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius && now >= (enemy._bodyHitCooldownEnd || 0)) {
        playerTakesHit(enemy);
        enemy._bodyHitCooldownEnd = now + 1500;
    }

    if (enemy._amSkill === 'none') {
        enemy._amJaws.phase = 'idle'; enemy._amWeigh.phase = staggered ? 'stagger' : 'idle';
        if (staggered) enemy._amWeigh.t = AMMIT_STAGGER - (enemy._amStaggerUntil - now);
        if (!staggered && !rising) {
            if (now >= enemy._amWeighCdEnd) {
                enemy._amSkill = 'weigh'; enemy._amSkillT = 0; enemy._amSkillDone = false;
                enemy._amWeigh.tilt = 0;
                // the pans hang at the ship's height when the scale opens, so the verdict really lands where the fight is
                enemy._amWeigh.panY = Math.max(canvas.height * 0.45, Math.min(canvas.height * 0.80, player.y));
            } else if (now >= enemy._amClawCdEnd && (enemy._amForceClaw || Math.hypot(player.x - enemy.x, player.y - enemy.y) < AMMIT_CLAW_TRIGGER)) {
                const c = enemy._amClaw;
                enemy._amForceClaw = false;
                enemy._amSkill = 'claw'; enemy._amSkillT = 0; enemy._amSkillDone = false;
                c.r = AMMIT_CLAW_R; c.span = AMMIT_CLAW_SPAN; c.ox = enemy.x; c.oy = enemy.y + enemy.size * 0.15;
                c.ang = Math.max(0.35, Math.min(Math.PI - 0.35, Math.atan2(player.y - c.oy, player.x - c.ox)));
            } else if (now >= enemy._amStompCdEnd) {
                // the wave leaves one safe gap, set to the side of the ship so it has to move
                const st = enemy._amStomp, dir = Math.random() < 0.5 ? -1 : 1;
                let gx = player.x + dir * 300;
                if (gx < 150 || gx > cw - 150) gx = player.x - dir * 300;
                enemy._amSkill = 'stomp'; enemy._amSkillT = 0; enemy._amSkillDone = false;
                st.gw = AMMIT_STOMP_GAP; st.gx = Math.max(st.gw / 2 + 20, Math.min(cw - st.gw / 2 - 20, gx));
                st.y0 = enemy.y + enemy.size * 0.55; st.front = st.y0; st.phase = 'wind'; st.t = 0; st.hitP = false;
                st.id = window._amStompSerial = (window._amStompSerial || 0) + 1;
            } else if (now >= enemy._amJawsCdEnd) {
                enemy._amSkill = 'jaws'; enemy._amSkillT = 0; enemy._amSkillDone = false;
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
        else if (T < 1300) { j.phase = 'close'; j.t = T; }
        else if (T < 1950) {
            j.phase = 'bite'; j.t = T - 1300;
            if (!enemy._amSkillDone) {
                enemy._amSkillDone = true;
                const tx = j.tx, ty = j.ty;
                if (typeof _spawnAmmitSandPit === 'function') _spawnAmmitSandPit(tx, ty, now, 3000);
                if (Math.hypot(player.x - tx, player.y - ty) < AMMIT_JAWS_RADIUS + (player.hitRadius || 0) && !_capBlocksSource(enemy, player)) _ammitHitPlayer(enemy);
                for (let i = 0; i < sentinels.length; i++) {
                    const s = sentinels[i];
                    if (Math.hypot(s.x - tx, s.y - ty) < AMMIT_JAWS_RADIUS && !_capBlocksSource(enemy, s)) _ammitHitSentinel(enemy, s, AMMIT_JAWS_COEFF, dmgMult);
                }
                _ammitSpawnScarabs(enemy, tx, ty, enraged ? 4 : 3);
                _setShake(8, 300);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', tx, ty);
            }
        } else if (T < 2400) { j.phase = 'after'; j.t = T - 1950; }
        else if (enraged && !enemy._amJawsChained) {
            enemy._amJawsChained = true; enemy._amSkillT = 0; enemy._amSkillDone = false;
            j.tx = player.x; j.ty = player.y; j.phase = 'lock'; j.t = 0;
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
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, st.y0);
        }
        st.phase = 'wave'; st.t = wt; st.front = st.y0 + AMMIT_STOMP_SPEED * wt;
        // the front sweeps down the arena, everything outside the gap that it crosses is hit once
        const pr = player.hitRadius || 0;
        if (!st.hitP && Math.abs(player.y - st.front) <= AMMIT_STOMP_BAND + pr && Math.abs(player.x - st.gx) > st.gw / 2 && !_capBlocksSource(enemy, player)) {
            st.hitP = true;
            _ammitHitPlayer(enemy);
        }
        for (let i = 0; i < sentinels.length; i++) {
            const s = sentinels[i];
            if (s._amStompId === st.id) continue;
            if (Math.abs(s.y - st.front) <= AMMIT_STOMP_BAND + (s.size || 20) * 0.5 && Math.abs(s.x - st.gx) > st.gw / 2 && !_capBlocksSource(enemy, s)) {
                s._amStompId = st.id;
                _ammitHitSentinel(enemy, s, AMMIT_STOMP_COEFF, dmgMult);
            }
        }
        if (st.front > ch + AMMIT_STOMP_BAND + 20) { st.phase = 'idle'; st.t = 0; enemy._amSkill = 'none'; enemy._amStompCdEnd = now + AMMIT_STOMP_CD / cdRate; }
        return;
    }

    if (enemy._amSkill === 'claw') {
        const c = enemy._amClaw;
        c.ox = enemy.x; c.oy = enemy.y + enemy.size * 0.15;
        if (T < AMMIT_CLAW_WIND) {
            c.phase = 'wind'; c.t = T;
            // the swing keeps tracking the ship until the last 450ms, then the arc is fixed
            if (T < 300) c.ang = Math.max(0.35, Math.min(Math.PI - 0.35, Math.atan2(player.y - c.oy, player.x - c.ox)));
        } else if (T < AMMIT_CLAW_WIND + 250) {
            c.phase = 'strike'; c.t = T - AMMIT_CLAW_WIND;
            if (!enemy._amSkillDone) {
                enemy._amSkillDone = true;
                if (_ammitInClaw(c, player.x, player.y, player.hitRadius || 0) && !_capBlocksSource(enemy, player)) _ammitHitPlayer(enemy);
                for (let i = 0; i < sentinels.length; i++) {
                    const s = sentinels[i];
                    if (_ammitInClaw(c, s.x, s.y, (s.size || 20) * 0.5) && !_capBlocksSource(enemy, s)) _ammitHitSentinel(enemy, s, AMMIT_CLAW_COEFF, dmgMult);
                }
                _setShake(7, 260);
                createParticles(c.ox + Math.cos(c.ang) * c.r * 0.6, c.oy + Math.sin(c.ang) * c.r * 0.6, 16, '#f2d27a', 3, 9);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', c.ox, c.oy);
            }
        } else if (T < AMMIT_CLAW_WIND + 550) { c.phase = 'after'; c.t = T - AMMIT_CLAW_WIND - 250; }
        else { c.phase = 'idle'; c.t = 0; enemy._amSkill = 'none'; enemy._amClawCdEnd = now + AMMIT_CLAW_CD / cdRate; }
        return;
    }

    const w = enemy._amWeigh;
    if (T < 600) { w.phase = 'summon'; w.t = T; _ammitUnits(enemy, w); w.tilt += (0 - w.tilt) * Math.min(1, dt / 250); }
    else if (T < 2600) {
        w.phase = 'weigh'; w.t = T - 600; _ammitUnits(enemy, w);
        const target = w.balanced ? 0 : (w.leftCount > w.rightCount ? -0.9 : 0.9);
        w.tilt += (target - w.tilt) * Math.min(1, dt / 250);
    } else if (T < 3250) {
        w.phase = 'verdict'; w.t = T - 2600; w.tilt = w.balanced ? 0 : (w.leftCount > w.rightCount ? -0.95 : 0.95);
        if (!enemy._amSkillDone) {
            enemy._amSkillDone = true;
            if (w.balanced) {
                enemy._amStaggerUntil = now + AMMIT_STAGGER;
                createParticles(enemy.x, enemy.y, 24, '#fff0b8', 3, 9);
                _setShake(5, 260);
            } else {
                const cx = cw * (w.leftCount > w.rightCount ? 0.25 : 0.75);
                const cy = w.panY > 0 ? w.panY : ch * 0.56;
                if (Math.hypot(player.x - cx, player.y - cy) < AMMIT_PAN_RADIUS + (player.hitRadius || 0) && !_capBlocksSource(enemy, player)) _ammitHitPlayer(enemy);
                for (let i = 0; i < sentinels.length; i++) {
                    const s = sentinels[i];
                    if (Math.hypot(s.x - cx, s.y - cy) < AMMIT_PAN_RADIUS && !_capBlocksSource(enemy, s)) _ammitHitSentinel(enemy, s, AMMIT_PAN_COEFF, dmgMult);
                }
                _setShake(12, 380);
                createParticles(cx, cy, 30, '#f2b72e', 4, 12);
            }
        }
    } else {
        w.phase = 'idle'; w.t = 0; enemy._amSkill = 'none'; enemy._amWeighCdEnd = now + AMMIT_WEIGH_CD / cdRate;
        if (!w.balanced) enemy._amJawsCdEnd = Math.max(enemy._amJawsCdEnd, now + 1500);
    }
}

function updateAmmit(enemy, deltaTime) {
    if (!enemy) return;
    if (enemy._amReal) { _updateAmmitFight(enemy, deltaTime); return; }
    if (window._ammitDemo) _updateAmmitDemo(enemy, deltaTime);
}

// The visual demo loop used by the preview page, the debug button and the Guide: it plays every state in turn and never hurts anyone.
function _updateAmmitDemo(enemy, deltaTime) {
    const now = performance.now();
    const dt = Math.min(50, Math.max(0, deltaTime || 16.67));
    enemy._demoClock = (enemy._demoClock || 0) + dt;
    const cycle = 28000;
    const t = enemy._demoClock % cycle;
    const cw = typeof canvas !== 'undefined' && canvas.width ? canvas.width : 1280;
    const ch = typeof canvas !== 'undefined' && canvas.height ? canvas.height : 800;
    const px = typeof player !== 'undefined' && player ? player.x : cw * 0.5;
    const py = typeof player !== 'undefined' && player ? player.y : ch * 0.68;

    // Reset spawn and passive state at the start of each 28s visual demo cycle
    if (t < dt * 1.5 && enemy._demoClock > dt * 2) {
        enemy._spawnTime = now;
        enemy._amHearts = 0;
        enemy._amWraps = 3;
        enemy._amFeather = 'up';
        enemy._amExposedUntil = -9999;
        enemy.hp = enemy.maxHp;
        enemy._demoStep = -1;
    }

    // Stage 0 (0 to 1200ms): emerging from sand dune with sandstorm
    // Stage 1 (1200 to 2800ms): idle breathing and swallowing hearts up to 3, then 5
    if (t >= 1400 && enemy._demoStep < 1) {
        enemy._demoStep = 1;
        enemy._amHearts = 3;
        enemy._amHeartAt = now;
    }
    if (t >= 2200 && enemy._demoStep < 2) {
        enemy._demoStep = 2;
        enemy._amHearts = 5;
        enemy._amHeartAt = now;
    }

    // Stage 2 (2800 to 5200ms): Skill 1 Jaws of Ammit (lock, close, bite, and sand pit)
    if (t >= 2800 && t < 4100) {
        if (enemy._demoStep < 3) {
            enemy._demoStep = 3;
            enemy._amJaws.tx = px;
            enemy._amJaws.ty = py;
        }
        const jt = t - 2800;
        enemy._amJaws.phase = jt < 260 ? 'lock' : 'close';
        enemy._amJaws.t = jt;
    } else if (t >= 4100 && t < 4750) {
        if (enemy._demoStep < 4) {
            enemy._demoStep = 4;
            if (typeof _spawnAmmitSandPit === 'function') _spawnAmmitSandPit(enemy._amJaws.tx, enemy._amJaws.ty, now, 3000);
        }
        enemy._amJaws.phase = 'bite';
        enemy._amJaws.t = t - 4100;
    } else if (t >= 4750 && t < 5200) {
        enemy._amJaws.phase = 'after';
        enemy._amJaws.t = t - 4750;
    } else {
        enemy._amJaws.phase = 'idle';
        enemy._amJaws.t = 0;
    }

    // Stage 3 (5400 to 7200ms): Linen Wrap losses and hit flash
    if (t >= 5400 && enemy._demoStep < 5) {
        enemy._demoStep = 5;
        enemy._amWraps = 2;
        enemy._amWrapLostAt = now;
        enemy._amHitAt = now;
    }
    if (t >= 6200 && enemy._demoStep < 6) {
        enemy._demoStep = 6;
        enemy._amWraps = 1;
        enemy._amWrapLostAt = now;
        enemy._amHitAt = now;
    }

    // Stage 4 (7200 to 10500ms): Skill 2 Weighing of the Heart (tilted left then right, heavy verdict)
    if (t >= 7200 && t < 7800) {
        enemy._amWeigh.phase = 'summon';
        enemy._amWeigh.t = t - 7200;
        enemy._amWeigh.tilt = -0.35;
        enemy._amWeigh.leftCount = 3;
        enemy._amWeigh.rightCount = 1;
        enemy._amWeigh.balanced = false;
    } else if (t >= 7800 && t < 9800) {
        const wt = t - 7800;
        enemy._amWeigh.phase = 'weigh';
        enemy._amWeigh.t = wt;
        enemy._amWeigh.tilt = wt < 1000 ? -0.85 * (wt / 1000) : 0.9 * ((wt - 1000) / 1000);
        enemy._amWeigh.leftCount = wt < 1000 ? 3 : 1;
        enemy._amWeigh.rightCount = wt < 1000 ? 1 : 3;
        enemy._amWeigh.balanced = false;
    } else if (t >= 9800 && t < 10500) {
        enemy._amWeigh.phase = 'verdict';
        enemy._amWeigh.t = t - 9800;
        enemy._amWeigh.tilt = 0.95;
        enemy._amWeigh.balanced = false;
    } else if (t >= 11000 && t < 11600) {
        // Stage 5 (11000 to 16200ms): Balanced Weighing of the Heart and Stagger
        enemy._amWeigh.phase = 'summon';
        enemy._amWeigh.t = t - 11000;
        enemy._amWeigh.tilt = 0;
        enemy._amWeigh.leftCount = 2;
        enemy._amWeigh.rightCount = 2;
        enemy._amWeigh.balanced = true;
    } else if (t >= 11600 && t < 13600) {
        enemy._amWeigh.phase = 'weigh';
        enemy._amWeigh.t = t - 11600;
        enemy._amWeigh.tilt = 0;
        enemy._amWeigh.balanced = true;
    } else if (t >= 13600 && t < 14200) {
        enemy._amWeigh.phase = 'verdict';
        enemy._amWeigh.t = t - 13600;
        enemy._amWeigh.tilt = 0;
        enemy._amWeigh.balanced = true;
    } else if (t >= 14200 && t < 16200) {
        enemy._amWeigh.phase = 'stagger';
        enemy._amWeigh.t = t - 14200;
        enemy._amWeigh.tilt = 0;
        enemy._amWeigh.balanced = true;
    } else {
        enemy._amWeigh.phase = 'idle';
        enemy._amWeigh.t = 0;
    }

    // Stage 6 (16500 to 19800ms): Feather of Truth falls, Exposed state, low HP cracks
    if (t >= 16500 && enemy._demoStep < 7) {
        enemy._demoStep = 7;
        enemy._amFeather = 'fallen';
        enemy._amExposedUntil = now + 3000;
        enemy._amWraps = 0;
        enemy._amHitAt = now;
        enemy.hp = Math.floor(enemy.maxHp * 0.24);
    }
    if (t >= 19800 && enemy._demoStep < 8) {
        enemy._demoStep = 8;
        enemy._amFeather = 'up';
        enemy._amExposedUntil = -9999;
        enemy._amWraps = 3;
        enemy.hp = enemy.maxHp;
    }

    // Stage 7 (20200 to 21500ms): Lion Claw telegraph, rake and recovery
    const cl = enemy._amClaw;
    if (t >= 20200 && t < 21500) {
        const ct = t - 20200;
        cl.ox = enemy.x; cl.oy = enemy.y + enemy.size * 0.15; cl.ang = Math.PI / 2; cl.r = AMMIT_CLAW_R; cl.span = AMMIT_CLAW_SPAN;
        if (ct < AMMIT_CLAW_WIND) { cl.phase = 'wind'; cl.t = ct; }
        else if (ct < AMMIT_CLAW_WIND + 250) { cl.phase = 'strike'; cl.t = ct - AMMIT_CLAW_WIND; }
        else { cl.phase = 'after'; cl.t = ct - AMMIT_CLAW_WIND - 250; }
    } else { cl.phase = 'idle'; cl.t = 0; }

    // Stage 8 (22200 to 25800ms): Hippo Stomp warning lanes and the sweeping front
    const sp = enemy._amStomp;
    if (t >= 22200 && t < 25800) {
        const stt = t - 22200;
        sp.gw = AMMIT_STOMP_GAP; sp.gx = Math.max(sp.gw / 2 + 20, Math.min(cw - sp.gw / 2 - 20, px + 300));
        sp.y0 = enemy.y + enemy.size * 0.55;
        if (stt < AMMIT_STOMP_WIND) { sp.phase = 'wind'; sp.t = stt; sp.front = sp.y0; }
        else {
            sp.t = stt - AMMIT_STOMP_WIND; sp.front = sp.y0 + AMMIT_STOMP_SPEED * sp.t;
            sp.phase = sp.front > ch + AMMIT_STOMP_BAND + 20 ? 'idle' : 'wave';
        }
    } else { sp.phase = 'idle'; sp.t = 0; }
}
