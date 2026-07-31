// Returns true if the hit was fully absorbed by the arcBarrier (false = passes through)
function checkMarchosiasArcBarrier(enemy, source, bx, by) {
    if (enemy.type !== 'marchosias' || !enemy.arcBarrier || enemy.arcBarrier.hp <= 0) return false;
    const bulletAngle = Math.atan2(by - enemy.y, bx - enemy.x);
    let diff = bulletAngle - enemy.arcBarrier.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) >= Math.PI / 4) return false; // outside 90° arc

    // Arc barrier has +10% evade (stacks on top of Mar's body evade)
    if (Math.random() < 0.10) {
        _tryTriggerMarchosiasCounter(enemy);
        addExplosion(enemy.x, enemy.y, enemy.size * 0.45, '#aaddff');
        return true;
    }

    // Compute base damage to barrier (60% DR, cap 35% barrier HP)
    const effectiveHp = enemy.arcBarrier.maxHp;
    let dmg = Math.ceil((source.damage || 0) + (effectiveHp * (source.percentDamage || 0)));
    if (gloryForJusticeActive) dmg = Math.ceil(dmg * 1.70);
    dmg = Math.ceil(dmg * 0.40);

    // Piercing attacks (spirit arc, boomerang, overload laser) partially penetrate:
    // barrier takes +15% extra, body damage reduced 30%, hit not fully absorbed
    if (source._barrierPiercing) {
        dmg = Math.ceil(dmg * 1.15);
        dmg = Math.min(dmg, Math.ceil(enemy.arcBarrier.hp * 0.35));
        const barrierHeal = Math.min(1000, Math.ceil(dmg * 0.05));
        const barrierWasAlive = enemy.arcBarrier.hp > 0;
        enemy.arcBarrier.hp = Math.max(0, enemy.arcBarrier.hp - dmg + barrierHeal);
        _applyArcBarrierBodyHeal(enemy, dmg);
        if (barrierWasAlive && enemy.arcBarrier.hp <= 0) _triggerArcBarrierBreak(enemy);
        if (Math.random() < 0.25) _tryTriggerMarchosiasCounter(enemy);
        // Reduce damage that reaches body by 30%
        source.damage = Math.ceil((source.damage || 0) * 0.70);
        if (source.percentDamage) source.percentDamage = source.percentDamage * 0.70;
        createParticles(bx, by, 3, '#aaffaa', 1, 4);
        return false; // passes through at reduced damage
    }

    // Normal attack: fully absorbed by barrier
    dmg = Math.min(dmg, Math.ceil(enemy.arcBarrier.hp * 0.35));
    const barrierHeal = Math.min(1000, Math.ceil(dmg * 0.05));
    const barrierWasAlive = enemy.arcBarrier.hp > 0;
    enemy.arcBarrier.hp = Math.max(0, enemy.arcBarrier.hp - dmg + barrierHeal);
    _applyArcBarrierBodyHeal(enemy, dmg);
    if (Math.random() < 0.25) _tryTriggerMarchosiasCounter(enemy);
    if (barrierWasAlive && enemy.arcBarrier.hp <= 0) _triggerArcBarrierBreak(enemy);
    createParticles(bx, by, 3, '#aaffaa', 1, 4);
    return true;
}

function _applyArcBarrierBodyHeal(enemy, dmg) {
    const healAmt = Math.min(1000, Math.ceil(dmg * 0.10));
    const newHp = enemy.hp + healAmt;
    if (newHp > enemy.maxHp) {
        enemy.hp = enemy.maxHp;
        enemy.shield = (enemy.shield || 0) + Math.ceil((newHp - enemy.maxHp) * 0.50);
    } else {
        enemy.hp = newHp;
    }
}

function _triggerArcBarrierBreak(enemy) {
    const _fullCycle = (enemy._barrierSwordsThisCycle || 0) >= 4;
    if (_fullCycle) {
        addExplosion(enemy.x, enemy.y, enemy.size * 1.4, '#00ff88');
        addExplosion(enemy.x, enemy.y, enemy.size * 0.6, '#aaffd8');
        createParticles(enemy.x, enemy.y, 28, '#00ff88', 3, 12);
        createParticles(enemy.x, enemy.y, 10, '#ffffff', 2, 6);
        for (let i = 0; i < 3; i++) {
            const r = _acquireParticle();
            r.isBarrierBreakRing = true;
            r.x = enemy.x; r.y = enemy.y;
            r.lifetime = 580 - i * 90; r.maxLifetime = r.lifetime;
            r.radius = i * 20;
            particles.push(r);
        }
    } else {
        addExplosion(enemy.x, enemy.y, enemy.size * 0.7, '#00ff88');
    }
    _tryTriggerMarchosiasCounter(enemy);
    enemy.ironBodyHits = (enemy.ironBodyHits || 0) + 5;
    const healAmt = Math.ceil(enemy.maxHp * 0.40);
    const newHp = enemy.hp + healAmt;
    if (newHp > enemy.maxHp) {
        enemy.hp = enemy.maxHp;
        enemy.shield = (enemy.shield || 0) + Math.ceil((newHp - enemy.maxHp) * 0.50);
    } else {
        enemy.hp = newHp;
    }
    const _breakShield = Math.ceil(enemy.maxHp * 0.15 + (enemy.maxHp - enemy.hp) * 0.15);
    _addEnemyShield(enemy, _breakShield);
    enemy.DR = Math.min(0.99, (enemy.DR || 0.45) + 0.20);
    const _reviveDelay = _fullCycle ? 3000 : Math.max(4000, 5000 - (gameElapsedTime / 180000) * 1000);
    enemy._arcBarrierReviveDuration = _reviveDelay;
    enemy._arcBarrierReviveAt = gameElapsedTime + _reviveDelay;
}

// Kích hoạt Sword — tối đa 4 lần mỗi barrier cycle, cooldown 650ms giữa các lần
function _tryTriggerMarchosiasCounter(enemy) {
    const now = performance.now();
    if (enemy.hp <= 0 || enemy._markedForDeath) return;
    if (!enemy.marchosiasWindups) enemy.marchosiasWindups = [];
    if (enemy.lastSwordTriggerTime && now - enemy.lastSwordTriggerTime < 650) return;
    if ((enemy._barrierSwordsThisCycle || 0) >= 4) return;
    enemy.lastSwordTriggerTime = now;
    enemy._barrierSwordsThisCycle = (enemy._barrierSwordsThisCycle || 0) + 1;
    const _wTx = player.x, _wTy = player.y;
    enemy.marchosiasWindups.push({ timer: 1000, target: { x: _wTx, y: _wTy } });
    if (!enemy._ghostWindups) enemy._ghostWindups = [];
    enemy._ghostWindups.push({
        targetX: _wTx, targetY: _wTy,
        originX: enemy.x, originY: enemy.y,
        freezeTimer: 1000,
        fadeTimer: 1200, maxFade: 1200,
    });
}

// Khi HP Mar <= 1%, bắn tất cả Sword đang pending trong queue ngay lập tức
function _fireMarchosiasDeathSwords(enemy) {
    if (!enemy.marchosiasWindups || enemy.marchosiasWindups.length === 0) return;
    // Fire all queued windups instantly, spread slightly
    const count = enemy.marchosiasWindups.length;
    enemy.marchosiasWindups.forEach((windup, idx) => {
        if (!windup.target) return;
        const baseAngle = Math.atan2(windup.target.y - enemy.y, windup.target.x - enemy.x);
        const spread = (idx - (count - 1) / 2) * 0.18;
        const angle = baseAngle + spread;
        marchosiasBlades.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
            angle, radius: 88,
            delay: 0, active: true, // fire immediately
            hitEnemies: [], hitPlayer: false,
            originX: enemy.x, originY: enemy.y,
        });
    });
    enemy.marchosiasWindups = [];
}

// Sigil: Circuit Engineer — true if the enemy currently carries any recognized debuff
function _hasAnyDebuff(enemy) {
    const now = performance.now();
    if ((enemy.vulnStacks || 0) > 0) return true;
    if (enemy.soulReaver) return true;
    if (enemy._slowEnd && now < enemy._slowEnd) return true;
    if (enemy._dtuSlow) return true;
    if ((enemy._nocToiStacks || 0) > 0) return true;
    if (enemy._yogMark) return true;
    if (enemy._inDimensionalRift) return true;
    if (window._sthBurning && window._sthBurning.has(enemy)) return true;
    return false;
}

// VULNERABILITY (Trọng Thương)
function applyVulnerability(enemy) {
    const now = performance.now();
    const stacks = (enemy.vulnStacks || 0);
    if (stacks < 4) {
        // Lập tức giảm 26% khiên hiện tại
        if (enemy.shield > 0) {
            enemy.shield = Math.max(0, Math.floor(enemy.shield * 0.74));
        }
        enemy.vulnStacks = stacks + 1;
        // Full stack (4): kích hoạt 2s true damage window
        if (enemy.vulnStacks === 4) {
            enemy.vulnTrueDmgEnd = now + 2000;
        }
    }
    // Reset lại thời gian 3 giây mỗi khi cộng dồn
    enemy.vulnEndTime = now + 3000;
}

function _spawnBloodFlower(x, y, size) {
    const petalCount = 12;
    const lifeMs = 700 + Math.random() * 200;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const speed = 1.8 + Math.random() * 2.2;
        const r = size * (0.35 + Math.random() * 0.4);
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifetime: lifeMs + Math.random() * 150,
            maxLifetime: lifeMs + 150,
            size: r,
            color: Math.random() < 0.6 ? '#cc0022' : '#ff2244',
            _bloodPetal: true,
            _angle: angle,
        });
    }
    addExplosion(x, y, size * 1.4, '#cc0022');
    createParticles(x, y, 18, '#ff1133', 2, 6);
}

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.hypot(p.x - projX, p.y - projY);
}

function handleEnemyKill(enemy) {
    if (window.AudioMgr) {
        window.AudioMgr.playSfxAt('enemy-death', enemy.x, enemy.y);
        // Layered on top of the generic death sfx for enemies killed by
        // Phōtokrystos's Back to Motherland (lightning ticks or the final
        // shockwave) — covers both kill sources in one dedicated cue.
        if (enemy._btmKilled) window.AudioMgr.playSfxAt('photokrystos-btm-kill', enemy.x, enemy.y);
    }
    score = Math.ceil(score + enemy.maxHp * 6);
    // Primeval Creation: +1.25% energy per kill from non-spirit sources
    if (!enemy._spiritKillCounted) {
        const _peGainMult = _hasBuff('dong_chay_luan_hoi') ? 1.50 : 1; // Cycle of Flow: +50% charge rate
        primevalEnergy = Math.min(100, (primevalEnergy || 0) + 1.25 * _peGainMult);
    }
    // Blessing HP regen handled in main.js update loop
    if (score >= nextLifeMilestone) {
        lives++;
        nextLifeMilestone += _hasBuff('hoan_sinh') ? 250000 : 500000;
        createParticles(player.x, player.y, 50, 'lime', 3, 8);
    }
    // Egregor gets its own dedicated death burst below instead of the
    // generic explosion, so the signature monster's death reads distinctly.
    if (enemy.type !== 'egregor') addExplosion(enemy.x, enemy.y, enemy.size);
    if (enemy.type === 'leviathan') window._lastLeviathanKillTime = performance.now();
    if (enemy.type === 'egregor') {
        window._lastEgregorKillTime = performance.now();
        if (!window._egregorDeathBursts) window._egregorDeathBursts = [];
        window._egregorDeathBursts.push({ x: enemy.x, y: enemy.y, size: enemy.size, spawnAt: performance.now(), duration: 900 });
        createParticles(enemy.x, enemy.y, 40, '#aa44ff', 3, 11);
        createParticles(enemy.x, enemy.y, 20, '#ffffff', 2, 7);
        _setShake(16, 420);
        if (window.AudioMgr) {
            window.AudioMgr.playSfxAt('egregor-death-roar', enemy.x, enemy.y);
            window.AudioMgr.stopNullSlashWindup();
        }
    }

    // Leviathan AFO: mỗi kill tăng counter cho tất cả Leviathan đang có khiên
    enemies.forEach(lev => {
        if (lev.type === 'leviathan' && lev.afoShieldActive && !lev.afoShieldBroken) {
            lev.afoKillCount = (lev.afoKillCount || 0) + 1;
        }
    });

    killCountForPassive++;
    // 30% cơ hội nhận thêm 1 điểm kill (tiến nhanh hơn tới mốc 3)
    if (Math.random() < 0.30) killCountForPassive++;
    if (killCountForPassive % 4 === 0) {
        spawnSentinel(player.x, player.y, false);
    }

    if (skillGCharge < 100) {
        const _gChargeGain = 0.5 * (_hasBuff('set_day_chuyen') ? 1.35 : 1) * (_hasBuff('dong_chay_luan_hoi') ? 1.50 : 1); // Chain Lightning: +35%, Cycle of Flow: +50%
        skillGCharge = Math.min(100, skillGCharge + _gChargeGain);
    }
    if (skillGActive) {
        spawnEnergyOrb(enemy.x, enemy.y);
    }

    const _now = performance.now();

    if (_hasBuff('tuyet_lan')) {
        window._tuyetLanStacks = Math.min(140, (window._tuyetLanStacks || 0) + 1);
        window._tuyetLanLastKill = _now;
    }

    if (_hasBuff('lai_kep')) {
        const _peGain = 0.008;
        const _prevAccum = window._laiKepPEAccum || 0;
        window._laiKepPEAccum = _prevAccum + _peGain;
        primevalEnergy = Math.min(100, primevalEnergy + _peGain * 100);
        const _milestones = Math.floor(window._laiKepPEAccum * 20) - Math.floor(_prevAccum * 20);
        if (_milestones > 0 && (window._laiKepFireRateBonus || 0) < 0.40) {
            window._laiKepFireRateBonus = Math.min(0.40, (window._laiKepFireRateBonus || 0) + _milestones * 0.015);
        }
    }

    if (_hasBuff('dong_chay_luan_hoi')) {
        let _cdReduc = 0;
        const _t = enemy.type;
        if (_t === 'apostle') _cdReduc = 1000;
        else if (_t === 'egregor') _cdReduc = 3000;
        else if (_t === 'thaelis' || _t === 'veilshroud' || _t === 'marchosias' || _t === 'aegis_core') _cdReduc = 1500;
        else if (_t === 'dargruel' || _t === 'leviathan') _cdReduc = 2000;
        if (_cdReduc > 0) {
            lastSkillA     = Math.min(_now, lastSkillA     - _cdReduc);
            lastSkillS     = Math.min(_now, lastSkillS     - _cdReduc);
            lastSkillD     = Math.min(_now, lastSkillD     - _cdReduc);
            lastSkillF     = Math.min(_now, lastSkillF     - _cdReduc);
            laserCooldownEnd = Math.max(0, laserCooldownEnd - _cdReduc);
        }
    }

    if (_hasBuff('su_tu_hong') && gloryForJusticeActive && window._sthBurning) {
        window._sthBurning.delete(enemy);
    }
}

function fireAutoShot() {
    const fireRateMultiplier = (gloryForJusticeActive ? 1.50 : 1) * (1 + (window._laiKepFireRateBonus || 0));
    if (performance.now() - lastAutoFire < autoFireInterval / fireRateMultiplier) return;
    lastAutoFire = performance.now();
    if (window.AudioMgr) window.AudioMgr.playSfx('autoshot');
    _checkMirrorLaserProc();

    const speedMultiplier = gloryForJusticeActive ? 1.25 : 1;
    const numBullets = 5, spreadAngle = Math.PI / 4;
    const startAngle = -spreadAngle / 2, angleStep = spreadAngle / (numBullets - 1);
    const baseAngle = -Math.PI / 2;
    const _vanguard = _hasBuff('tien_phong');
    const _dmgMult = _vanguard ? 1.50 : 1;

    let _isCritVolley = false;
    if (_hasBuff('mui_ten_vang')) {
        window._muiTenVangVolleyCount = (window._muiTenVangVolleyCount || 0) + 1;
        if (window._muiTenVangVolleyCount % 6 === 0) _isCritVolley = true;
    }

    for (let i = 0; i < numBullets; i++) {
        const angle = baseAngle + startAngle + (i * angleStep);
        const _pierce = _vanguard && Math.random() < 0.50;
        bullets.push({
            x: player.x, y: player.y - player.height / 2,
            vx: Math.cos(angle) * 13.44 * speedMultiplier, vy: Math.sin(angle) * 13.44 * speedMultiplier,
            damage: 55 * _dmgMult, percentDamage: 0.009 * _dmgMult, size: 6.5, type: 'player_auto',
            applyVuln: true, vulnChance: 0.28,
            isPiercing: _pierce, hitEnemies: _pierce ? [] : undefined,
            _muiTenVangCrit: _isCritVolley,
        });
    }

    // Twin Blades: 15% chance per auto-fire volley to fire an arc blade (same as the spirit's)
    if (_hasBuff('song_luoi') && Math.random() < 0.15) {
        const _abClosest = findClosestEnemy(player.x, player.y);
        let _abvx = 0, _abvy = -15.84;
        if (_abClosest) {
            const _abd = Math.hypot(_abClosest.x - player.x, _abClosest.y - player.y);
            _abvx = (_abClosest.x - player.x) / _abd * 15.84;
            _abvy = (_abClosest.y - player.y) / _abd * 15.84;
        }
        bladeArcProjectiles.push({
            x: player.x, y: player.y, vx: _abvx, vy: _abvy, radius: 125,
            damage: 300, percentDamage: 0.07, hitEnemies: [], isSpirit: true, isPiercing: true, _barrierPiercing: true
        });
        if (window.AudioMgr) window.AudioMgr.playSfxAt('spirit-arc-slash', player.x, player.y);
    }
}

function fireChargedBullet(multiplier) {
    if (window.AudioMgr) window.AudioMgr.playSfx('charged-shot');
    const baseSize = 5;
    bullets.push({
        x: player.x, y: player.y - player.height / 2,
        vx: 0, vy: -10,
        damage: multiplier, size: (baseSize * multiplier) * 1.1,
        type: 'player_charged', hitEnemies: []
    });
    createParticles(player.x, player.y - player.height / 2, 3, 'yellow', 2, 4);
}

function spawnEnemy() {
    const elapsedSec = gameElapsedTime / 1000; // Dùng game time (bị slow bởi Yog-Sothoth)

    const dargruelCount = enemies.filter(e => e.type === 'dargruel').length;
    const thaelisCount = enemies.filter(e => e.type === 'thaelis').length;
    const aegisCount = enemies.filter(e => e.type === 'aegis_core').length;
    const marchosiasCount = enemies.filter(e => e.type === 'marchosias').length;
    const leviathanCount = enemies.filter(e => e.type === 'leviathan').length;
    const veilshroudCount = enemies.filter(e => e.type === 'veilshroud').length;
    const egregorCount = enemies.filter(e => e.type === 'egregor').length;
    const totalElite = dargruelCount + thaelisCount + aegisCount + marchosiasCount + leviathanCount + veilshroudCount + egregorCount;

    if (elapsedSec < 20) {
        spawnApostle();
        return;
    }

    if (elapsedSec < 30) {
        const marchosiasCountEarly = enemies.filter(e => e.type === 'marchosias').length;
        const tEarly = Math.min(1, (elapsedSec - 20) / 10);
        if (marchosiasCountEarly < 1 && Math.random() < 0.04 + tEarly * 0.04) {
            spawnMarchosias(); return;
        }
        spawnApostle();
        return;
    }

    const t = Math.min(1, (elapsedSec - 30) / 210);

    const dargruelRate = 0.04 + t * 0.09;
    const aegisRate = 0.06 + t * 0.08;
    const thaelisRate = 0.12 + t * 0.13;
    const marchosiasRate = 0.05 + t * 0.08;

    // Leviathan: unlock sau 36s, cooldown 8s giữa mỗi lần spawn/chết
    const _now = performance.now();
    const levCooldownOk = !window._lastLeviathanKillTime ||
        (_now - window._lastLeviathanKillTime) >= 8000;
    const leviathanRate = (elapsedSec >= 36 && levCooldownOk) ? (0.02 + t * 0.04) : 0;

    // Egregor: cooldown 6s sau khi bị tiêu diệt
    const egrCooldownOk = !window._lastEgregorKillTime ||
        (_now - window._lastEgregorKillTime) >= 6000;

    const canSpawnDargruel = dargruelCount < 2 && totalElite < 6;
    const canSpawnAegis = aegisCount < 2 && totalElite < 6;
    const canSpawnThaelis = thaelisCount < 3 && totalElite < 6;
    const canSpawnMarchosias = marchosiasCount < 2 && totalElite < 6;
    const canSpawnLeviathan = leviathanCount < 1 && totalElite < 6 && levCooldownOk;
    const canSpawnVeilshroud = veilshroudCount < 2 && totalElite < 6 && egregorCount === 0;
    const canSpawnEgregor = egregorCount < 1 && totalElite < 6 && veilshroudCount === 0 && egrCooldownOk;
    const egregorRate = (elapsedSec >= 35) ? (0.035 + t * 0.085) : 0;

    // Veilshroud: unlock sau 25s, tỉ lệ spawn bằng Thaelis
    const veilshroudRate = (elapsedSec >= 25) ? (0.12 + t * 0.13) : 0;

    const rand = Math.random();
    let cursor = 0;

    if (canSpawnLeviathan && leviathanRate > 0 && rand < (cursor += leviathanRate)) {
        spawnLeviathan(); return;
    }
    if (canSpawnDargruel && rand < (cursor += dargruelRate)) {
        spawnDargruel(); return;
    }
    if (canSpawnAegis && rand < (cursor += aegisRate)) {
        spawnAegisCore(); return;
    }
    if (canSpawnThaelis && rand < (cursor += thaelisRate)) {
        spawnThaelis(); return;
    }
    if (canSpawnMarchosias && rand < (cursor += marchosiasRate)) {
        spawnMarchosias(); return;
    }
    if (canSpawnVeilshroud && veilshroudRate > 0 && rand < (cursor += veilshroudRate)) {
        spawnVeilshroud(); return;
    }
    if (canSpawnEgregor && egregorRate > 0 && rand < (cursor += egregorRate)) {
        spawnEgregor(); return;
    }

    spawnApostle();
}

function spawnDargruel() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 10;
    let hp = Math.ceil((6200 + Math.random() * 9800) * 1.15); // 6200–16000, +15% global HP buff
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

function spawnThaelis() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.ceil(Math.min(2640, 1100 + hpFromTime * 53) * 1.15); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8 * 0.80 * 0.80,
        hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'thaelis', shootTimer: 1000, reincarnated: false,
        _tenacityBarrier: 0, _tenacityBarrierMax: 0,
        _tenacityBarrier70: false, _tenacityBarrier40: false, _tenacityBarrier10: false
    });
}

function spawnAegisCore() {
    const baseSize = (20 + Math.random() * 10);
    const size = ((baseSize * 5) / 2) * 0.7;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.ceil(Math.min(4500, 2500 + hpFromTime * 64) * 1.15); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.367, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'aegis_core', shootTimer: 0,
        aegisInvulnerable: true, aegisCustosHits: 0, aegisShieldReceived: false
    });
}

function spawnMarchosias() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const speed = (1 + Math.random() * 2) * 0.4 * 0.9 * 1.067; // ~1.6 u/s
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.ceil(Math.min(4092, 2112 + hpFromTime * 55) * 1.15); // +15% global HP buff

    const shieldHp = hp;

    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size,
        size, speed, hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'marchosias',
        shootTimer: 1000,
        DR: 0.45,
        arcBarrier: {
            hp: shieldHp,
            maxHp: shieldHp,
            angle: 0,
            hitCount: 0,
        },
        _arcBarrierReviveAt: null,
        _barrierSwordsThisCycle: 0,
    });
}

function spawnMarchosiasMinion(parentX, parentY, parentMaxHp) {
    const size = 20 + Math.random() * 10;
    const inheritPct = 0.25 + Math.random() * 0.10;
    const hp = Math.ceil(parentMaxHp * inheritPct * 1.30); // +30% HP

    const paraRange = 170;
    const host = enemies.find(e =>
        e !== null &&
        e.type !== 'marchosias_minion' &&
        e.type !== 'marchosias' &&
        e.type !== 'veilshroud_echo' &&
        e.type !== 'abyssal_chain' &&
        !e.type.startsWith('enemy_bullet') &&
        Math.hypot(e.x - parentX, e.y - parentY) < paraRange
    );

    if (host) {
        host.marchosiasParasiteShield = (host.marchosiasParasiteShield || 0) + hp;
        createParticles(host.x, host.y, 20, '#00ff88', 2, 6);
        addExplosion(host.x, host.y, host.size * 0.8, '#00ff88');
    } else {
        const baseSpeed = (1 + Math.random() * 2) * 0.8;
        enemies.push({
            x: parentX + (Math.random() - 0.5) * 40,
            y: parentY + (Math.random() - 0.5) * 40,
            size, speed: baseSpeed * 2.10,
            hp, maxHp: hp,
            isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
            type: 'marchosias_minion',
            DR: 0.75, // 75% innate DR
            shootTimer: 1000,
        });
    }
}

function spawnApostle() {
    const size = 20 + Math.random() * 10;
    const hpFromTime = Math.floor(gameElapsedTime / 15000);
    let hp = Math.ceil(Math.min(330, (Math.floor(Math.random() * 20) + 22 + hpFromTime * 5)) * 1.15); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'apostle', shootTimer: 1000
    });
}

function spawnVeilshroud() {
    const baseSize = 20 + Math.random() * 10;
    const size = baseSize * 5; // ~100–150px, bằng Thaelis
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    const hp = Math.ceil(Math.min(3300, 1320 + hpFromTime * 66) * 1.15); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2,
        y: -size,
        size,
        speed: 2.0,
        hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'veilshroud',
        // Phantom mechanic
        inPhantom: false,
        phantomTimer: 0,
        phantomDuration: 1500,
        phantomCheckTimer: 0,
        phantomCheckInterval: 450,
        // Lightning after phantom exit
        lightningPending: false,
        lightningCountdown: 0,
        lightningCountdownDuration: 1500,
        lightningTargetX: 0,
        lightningTargetY: 0,
        lightningTargetRef: null,
        // Normal attack (−20% speed → interval × 1.25)
        shootTimer: 0,
        shootInterval: 500,
        // Energy Accumulation: tracks damage absorbed during Phantom
        _phantomAbsorb: 0,
    });
}

// VEILSHROUD UPDATE
function updateVeilshroud(enemy, deltaTime) {
    const dt = deltaTime / 16.67;

    // Movement (không di chuyển trong phantom)
    if (!enemy.inPhantom) {
        enemy.y += enemy.speed * dt;
    }

    // Va chạm người chơi
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
        playerTakesHit(enemy);
    }

    // Phantom check (chỉ khi không pending lightning)
    if (!enemy.inPhantom && !enemy.lightningPending) {
        enemy.phantomCheckTimer += deltaTime;
        if (enemy.phantomCheckTimer >= enemy.phantomCheckInterval) {
            enemy.phantomCheckTimer = 0;
            if (Math.random() < 0.40) {
                enemy.inPhantom = true;
                enemy.phantomTimer = 0;
                enemy._phantomAbsorb = 0;
            }
        }
    }

    // Phantom state duration
    if (enemy.inPhantom) {
        enemy.phantomTimer += deltaTime;
        if (enemy.phantomTimer >= enemy.phantomDuration) {
            enemy.inPhantom = false;
            enemy.phantomTimer = 0;
            enemy.phantomFadeTimer = 400;
            // Energy Accumulation: convert absorbed damage into shield
            const _eaAbsorbed = enemy._phantomAbsorb || 0;
            const _eaShield = Math.min(1200, Math.ceil((0.35 * _eaAbsorbed + 200) * 1.15));
            _addEnemyShield(enemy, _eaShield);
            enemy._phantomAbsorb = 0;
            _veilshroudBeginLightning(enemy);
        }
    }

    // Post-phantom color fade-out
    if (!enemy.inPhantom && (enemy.phantomFadeTimer || 0) > 0) {
        enemy.phantomFadeTimer = Math.max(0, enemy.phantomFadeTimer - deltaTime);
    }

    // Lightning countdown & strike
    if (enemy.lightningPending) {
        enemy.lightningCountdown += deltaTime;
        // Vị trí vòng mục tiêu cố định tại chỗ đặt, không dí theo player
        if (enemy.lightningCountdown >= enemy.lightningCountdownDuration) {
            _veilshroudStrike(enemy);
            enemy.lightningPending = false;
            enemy.lightningCountdown = 0;
            enemy.lightningTargetRef = null;
        }
    }

    // Normal attack: volley 2 viên / 400ms (không bắn khi phantom hoặc đang countdown)
    if (!enemy.inPhantom && !enemy.lightningPending) {
        enemy.shootTimer += deltaTime;
        if (enemy.shootTimer >= enemy.shootInterval) {
            enemy.shootTimer = 0;
            _veilshroudFireVolley(enemy);
        }
    }
}

function _veilshroudBeginLightning(enemy) {
    // Chọn target ngẫu nhiên từ sentinels + player
    const pool = [...sentinels];
    pool.push(player);
    const target = pool[Math.floor(Math.random() * pool.length)];
    enemy.lightningPending = true;
    enemy.lightningCountdown = 0;
    enemy.lightningTargetRef = target;
    enemy.lightningTargetX = target.x;
    enemy.lightningTargetY = target.y;
}

function _veilshroudStrike(enemy) {
    const tx = enemy.lightningTargetX;
    const ty = enemy.lightningTargetY;
    // Lưu vị trí sét cuối để render vòng đỏ lưu lại sau khi đánh
    enemy._lastLightningX = tx;
    enemy._lastLightningY = ty;
    enemy._lastLightningTime = performance.now();

    // Tạo object sét, lưu targets bị trúng để render hiệu ứng riêng
    if (!window._veilshroudLightnings) window._veilshroudLightnings = [];
    const _lt = {
        x: tx, y: ty,
        life: 700, maxLife: 700,
        strikeRadius: 100,
        hitSentinelPositions: [],  // {x,y} mỗi sentinel bị trúng
        hitPlayer: false,
        playerHitPos: null,
    };
    window._veilshroudLightnings.push(_lt);

    _setShake(9, 350);

    // Trúng người chơi
    if (Math.hypot(player.x - tx, player.y - ty) < player.hitRadius + 30) {
        _lt.hitPlayer = true;
        _lt.playerHitPos = { x: player.x, y: player.y };
        playerTakesHit();
        addExplosion(player.x, player.y, 90, '#ff0033');
        createParticles(player.x, player.y, 35, '#ffffff', 4, 14);
        createParticles(player.x, player.y, 20, '#ff3355', 2, 8);
        _setShake(18, 500);
    }

    // Trúng sentinel trong phạm vi 100px
    for (const s of sentinels) {
        if (Math.hypot(s.x - tx, s.y - ty) < 100) {
            _lt.hitSentinelPositions.push({ x: s.x, y: s.y });
            const dmg = Math.ceil((s.maxHp + (s.shield || 0)) * 0.18);
            dealDamage(s, { damage: dmg, percentDamage: 0, _vanguardTag: 'veil_lightning_' + tx });
            addExplosion(s.x, s.y, 60, '#ff1133');
            createParticles(s.x, s.y, 22, '#ffffff', 3, 10);
            createParticles(s.x, s.y, 14, '#ff3355', 2, 7);
        }
    }
    createParticles(tx, ty, 35, '#ff1133', 3, 10);
}

function _veilshroudFireVolley(enemy) {
    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
    if (!target) return;
    const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    for (let i = 0; i < 2; i++) {
        const a = baseAngle + (i - 0.5) * 0.22;
        const bulletHp = Math.max(10, Math.ceil(enemy.maxHp * 0.012));
        enemies.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(a) * 4.8, vy: Math.sin(a) * 4.8,
            damage: 2, size: 9,
            hp: bulletHp, maxHp: bulletHp,
            type: 'enemy_bullet', shield: 0, ownerRef: enemy
        });
    }
}

// VEILSHROUD ECHO UPDATE
function updateVeilshroudEcho(enemy, deltaTime) {
    enemy.echoTimer += deltaTime;

    // 0–3s: bắn đạn nhanh hơn (222ms, −10% fire rate so với 200ms gốc)
    if (enemy.echoTimer < 3000) {
        enemy.echoShootTimer += deltaTime;
        if (enemy.echoShootTimer >= (enemy.echoShootInterval || 222)) {
            enemy.echoShootTimer = 0;
            const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
            if (target) {
                const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                for (let i = 0; i < 2; i++) {
                    const a = baseAngle + (i - 0.5) * 0.22;
                    const bulletHp = Math.max(10, Math.ceil(enemy.echoOriginMaxHp * 0.012));
                    enemies.push({
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(a) * 4.8, vy: Math.sin(a) * 4.8,
                        damage: 2, size: 9,
                        hp: bulletHp, maxHp: bulletHp,
                        type: 'enemy_bullet', shield: 0, ownerRef: enemy
                    });
                }
            }
        }
    }

    // 5s: phát nổ
    if (enemy.echoTimer >= 5000 && !enemy.echoExplosionDone) {
        enemy.echoExplosionDone = true;
        _veilshroudEchoExplode(enemy);
        enemy.hp = 0; // xóa echo
    }
}

function _veilshroudEchoExplode(enemy) {
    const x = enemy.x, y = enemy.y, r = 300;
    addExplosion(x, y, 60, '#aa00ff');
    _setShake(12, 500);
    createParticles(x, y, 50, '#cc44ff', 2, 10);

    // Tạo vùng nổ tick
    if (!window._veilshroudExplosions) window._veilshroudExplosions = [];
    window._veilshroudExplosions.push({
        x, y,
        radius: r,
        life: 2000, maxLife: 2000,
        tickTimer: 0, tickInterval: 500,
        hitPlayerThisTick: false,
        originMaxHp: enemy.echoOriginMaxHp,
    });
}

function createAegisTelegraph(startX, startY, target) {
    let angle = Math.atan2(target.y - startY, target.x - startX);
    let length = Math.hypot(canvas.width, canvas.height);
    let endX = startX + Math.cos(angle) * length;
    let endY = startY + Math.sin(angle) * length;
    aegisLasers.push({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        delay: 1000,
        fired: false,
        duration: 0
    });
}

// Particle Object Pool
const _particlePool = [];
function _acquireParticle() {
    const p = _particlePool.length > 0 ? _particlePool.pop() : {};
    p.isSummonRing = false; p.isLaserLine = false; p.isSkillGAura = false; p._isTriangle = false;
    p.isBarrierBreakRing = false;
    p.vx = 0; p.vy = 0;
    return p;
}
function _releaseParticle(p) {
    if (_particlePool.length < 600) _particlePool.push(p);
}

function createParticles(x, y, count, color, minSpeed, maxSpeed) {
    const _actualCount = Math.ceil(count * (window._particleScale !== undefined ? window._particleScale : 1));
    for (let i = 0; i < _actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;
        const lt = 300 + Math.random() * 200;
        const p = _acquireParticle();
        p.x = x; p.y = y;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
        p.lifetime = lt; p.maxLifetime = lt;
        p.size = 1 + Math.random() * 2; p.color = color;
        particles.push(p);
    }
}

function addExplosion(x, y, size, color = 'orange') {
    let finalColor = color;
    if (color === 'electric_blue') {
        finalColor = '#00FFFF';
    }
    explosions.push({ x, y, size, lifetime: 500, maxLifetime: 500, color: finalColor });
    createParticles(x, y, 8, finalColor, 1, 5);
}

function spawnSentinel(x, y, forceNormal = false) {
    for (let i = 0; i < 3; i++) {
        const _sr = _acquireParticle();
        _sr.isSummonRing = true; _sr.x = x; _sr.y = y;
        _sr.lifetime = 500; _sr.maxLifetime = 500; _sr.radius = i * 20;
        particles.push(_sr);
    }
    createParticles(x, y, 30, '#00FFFF', 2, 8);

    if (sentinels.length >= MAX_SENTINELS) {
        // BUG I fix: silent eviction, no explosion when at capacity
        sentinels.sort((a, b) => a.hp - b.hp);
        sentinels.splice(0, 1);
    }

    let currentTier = (sentinels.length + 1 >= 12) ? 3 : ((sentinels.length + 1 >= 5) ? 2 : 1);
    // Base HP tăng dần theo thời gian: 300 → 450 trong 5 phút đầu
    const hpScale = Math.min(1, gameElapsedTime / 300000); // 0→1 trong 5 phút
    const baseHpMin = 300, baseHpMax = 450;
    const baseHp = Math.round(baseHpMin + hpScale * (baseHpMax - baseHpMin));
    // Tier 1: base scaling, Tier 2-3: 299 fixed (herd mentality override)
    let initialMaxHp = (currentTier === 1) ? Math.max(389, baseHp) : 299;

    // 36% cơ hội sentinel có HP cao hơn 50%
    const isFortified = !forceNormal && Math.random() < 0.36;
    if (isFortified) {
        initialMaxHp = Math.ceil(initialMaxHp * 1.5);
    }

    if (_hasBuff('ho_ve')) initialMaxHp = Math.ceil(initialMaxHp * 1.65);
    sentinels.push({
        x, y, hp: initialMaxHp, maxHp: initialMaxHp, angle: -Math.PI / 2, shootTimer: 0,
        target: null, size: 15, shotsFiredSinceSpecial: 0,
        absoluteShield: false,
        synergyTier: currentTier,
        isFortified
    });
    if (window.AudioMgr) window.AudioMgr.playSfxAt('sentinel-spawn', x, y);

    // Gaia Protection catch-up for late-spawned sentinels
    const _gaiaHpCumMult = window._gaiaHpCumMult || 1;
    if (_gaiaHpCumMult > 1) {
        const _ns = sentinels[sentinels.length - 1];
        _ns.maxHp = Math.ceil(_ns.maxHp * _gaiaHpCumMult);
        _ns.hp = _ns.maxHp;
    }

}

function destroySentinel(sentinel) {
    if (_hasBuff('ho_ve')) {
        const now = performance.now();
        if (now >= (window._hoVeShieldCooldownEnd || 0)) {
            window._hoVeShieldCooldownEnd = now + 3500;
            const deadEP = sentinel.maxHp + (sentinel.shield || 0);
            for (const s of sentinels) {
                if (s === sentinel || s.hp <= 0) continue;
                s.hp = Math.min(s.maxHp, s.hp + deadEP * 0.10);
                s.shield = (s.shield || 0) + Math.ceil(deadEP * 0.20);
            }
        }
    }
    addExplosion(sentinel.x, sentinel.y, 80, '#00FFFF');
    _setShake(5, 200);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('sentinel-explode', sentinel.x, sentinel.y);
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 / 10) * i;
        bullets.push({
            x: sentinel.x, y: sentinel.y,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            damage: 2, percentDamage: 0.02, size: 6, type: 'sentinel_death'
        });
    }
}

function updateSentinels(deltaTime) {
    let activeCount = sentinels.length;
    let sentinelFireRate = 62.5; // 75 / 1.2 (+20% fire rate)
    let damageMultiplier = 1.0;

    if (_hasBuff('ho_ve')) damageMultiplier *= 1.30;
    if (_hasBuff('lai_kep') && (window._laiKepFireRateBonus || 0) > 0) {
        sentinelFireRate /= (1 + window._laiKepFireRateBonus);
    }

    if (_hasBuff('trieu_hoi')) {
        const _tNow = performance.now();
        for (const s of sentinels) {
            s.hp = Math.min(s.maxHp, s.hp + (s.maxHp * 0.03 / 1000) * deltaTime * 1.30);
            if (!s._trieuIronBody && _tNow >= (s._trieuIronBodyCooldownEnd || 0)) {
                s._trieuIronBody = true;
            }
        }
    }

    let isTier1 = activeCount < 5;
    let isTier2 = activeCount >= 5 && activeCount < 12;
    let isTier3 = activeCount >= 12;
    let swarmSpecialForced = activeCount >= 12;

    // Tier 1: +10% bullet speed (added below via herdSpeedBonus)
    const herdSpeedBonus = isTier1 ? 1.10 : 1.0;

    if (activeCount >= 5) {
        sentinelFireRate /= 1.20;
        damageMultiplier = 1.10;
    }

    if (gloryForJusticeActive) {
        sentinelFireRate /= 1.50;
    }

    for (let i = 0; i < sentinels.length; i++) {
        let s = sentinels[i];
        let newTier = isTier3 ? 3 : (isTier2 ? 2 : 1);
        if (s.synergyTier !== newTier) {
            let oldMax = s.maxHp;
            s.maxHp = (newTier === 1) ? 389 : 299;
            if (s.isFortified) s.maxHp = Math.ceil(s.maxHp * 1.5); // re-apply fortified bonus
            s.hp = Math.min(s.maxHp, s.hp * (s.maxHp / oldMax));
            s.synergyTier = newTier;
        }
    }

    for (let i = sentinels.length - 1; i >= 0; i--) {
        const sentinel = sentinels[i];
        sentinel.target = findClosestEnemy(sentinel.x, sentinel.y);

        if (sentinel.target) {
            const targetAngle = Math.atan2(sentinel.target.y - sentinel.y, sentinel.target.x - sentinel.x);
            let angleDiff = targetAngle - sentinel.angle;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            sentinel.angle += angleDiff * 0.1;
        }

        sentinel.shootTimer -= deltaTime;
        if (sentinel.shootTimer <= 0 && sentinel.target) {
            sentinel.shootTimer = sentinelFireRate;
            const _bDR = sentinel._blessingDR || 0;
            // Guardian (ho_ve): sentinels no longer pay the recoil cost at all
            const _hpCost = _hasBuff('ho_ve') ? 0 : Math.max(0, 1 - _bDR); // Blessing: -15% cost
            sentinel.hp = Math.max(0, sentinel.hp - _hpCost);
            const angle = sentinel.angle;
            const speedMultiplier = (gloryForJusticeActive ? 1.25 : 1) * herdSpeedBonus;

            sentinel.shotsFiredSinceSpecial++;

            if (sentinel.shotsFiredSinceSpecial >= 4 || swarmSpecialForced) {
                sentinel.shotsFiredSinceSpecial = 0;

                const _bDmg = 1 + (sentinel._blessingDmg || 0);
                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    damage: 50 * damageMultiplier * _bDmg, percentDamage: 0.03 * damageMultiplier * _bDmg, size: 30, type: 'sentinel_special',
                    target: sentinel.target, speedMultiplier: 1.12 * speedMultiplier,
                    sourceSentinel: sentinel, _isSentinelBullet: true
                });
            } else {
                const _bDmg2 = 1 + (sentinel._blessingDmg || 0);
                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    vx: Math.cos(angle) * 10.8 * speedMultiplier, vy: Math.sin(angle) * 10.8 * speedMultiplier,
                    damage: 30 * damageMultiplier * _bDmg2 * (_hasBuff('tien_phong') ? 1.50 : 1),
                    percentDamage: 0.015 * damageMultiplier * _bDmg2 * (_hasBuff('tien_phong') ? 1.50 : 1),
                    size: 7.8, type: 'sentinel_auto',
                    _isSentinelBullet: true,
                    ...(_hasBuff('tien_phong') && Math.random() < 0.50 ? { isPiercing: true, hitEnemies: [] } : {}),
                });
                const _mz = _acquireParticle(); _mz.x = sentinel.x + Math.cos(angle) * (sentinel.size + 5); _mz.y = sentinel.y + Math.sin(angle) * (sentinel.size + 5); _mz.lifetime = 100; _mz.maxLifetime = 100; _mz.size = 5; _mz.color = 'orange'; particles.push(_mz);
            }
        }

        if (sentinel.hp <= 0) {
            destroySentinel(sentinel);
            sentinels.splice(i, 1);
        }
    }
}

function findClosestEnemy(x, y) {
    let closest = null, closestDist = Infinity;
    for (let enemy of enemies) {
        if (enemy.type.startsWith('enemy_bullet')) continue;
        if (enemy.type === 'abyssal_chain') continue;
        if (enemy.type === 'veilshroud_echo') continue;
        if (enemy.inCoronation) continue; // Coronation: untargetable during animation
        let d = Math.hypot(enemy.x - x, enemy.y - y);
        if (d < closestDist) { closest = enemy; closestDist = d; }
    }
    return closest;
}

function findClosestSentinelOrPlayer(x, y) {
    let targets = [...sentinels, player];
    let closest = null, closestDist = Infinity;
    for (const target of targets) {
        const d = Math.hypot(target.x - x, target.y - y);
        if (d < closestDist) { closest = target; closestDist = d; }
    }
    return closest;
}

// Helper: add shield to an enemy, khi Thaelis đang có barrier, mọi khiên đều dồn vào barrier thay thế
function _addEnemyShield(enemy, amount) {
    if (!amount || amount <= 0) return;
    if (enemy.type === 'thaelis' && (enemy._tenacityBarrier || 0) > 0) {
        enemy._tenacityBarrier += amount;
        enemy._tenacityBarrierMax = Math.max(enemy._tenacityBarrierMax || 0, enemy._tenacityBarrier);
        return;
    }
    enemy.shield = (enemy.shield || 0) + amount;
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

function spawnBossShockwave(x, y) {
    bossShockwaves.push({
        x: x, y: y,
        radius: 0,
        maxRadius: Math.hypot(canvas.width, canvas.height),
        speed: 12,
        hitSentinels: new Set(),
        active: true
    });
    _setShake(20, 600);
    if (window.AudioMgr) window.AudioMgr.startMaouHaki();
}

function dealDamage(enemy, source) {
    if (enemy.type === 'abyssal_chain') return;

    // GOLIATH Alpha/Transforming: bất khả xâm phạm tuyệt đối (Iron Body vĩnh
    // viễn) — không có ngoại lệ nào được xuyên thủng trong pha này.
    if (enemy.type === 'goliath' && enemy.phase !== 'true_form') return;

    if (enemy.type === 'goliath' && enemy.phase === 'true_form') {
        // Fracture Step: lớp Iron Body vừa nhận lúc dịch chuyển, hấp thụ trọn
        // từng đòn (giống Coronation ironBodyHits đã có sẵn trong codebase)
        if (enemy._fractureIronBodyHits > 0 && (source.damage > 0 || source.percentDamage > 0)) {
            enemy._fractureIronBodyHits--;
            createParticles(enemy.x, enemy.y, 6, '#f59e0b', 2, 7);
            return;
        }
        // Warding Palm: đòn tới từ Skill F/D/tia Photokrystos — sức mạnh khởi
        // nguyên của những đòn này quá mạnh nên KHÔNG BAO GIỜ bị chặn đứng
        // hoàn toàn, kể cả khi đỡ thành công. 30% mỗi đòn đỡ được (chỉ ăn 15%
        // MaxHP), 70% đỡ hụt (ăn 40% MaxHP) — tính PER HIT, không phải trần
        // cộng dồn cho cả trận.
        if (source._isSkillF || source._isSkillD || source.isSpiritLaser) {
            const _blocked = Math.random() < 0.30;
            enemy._wardingPalmFlash = { end: performance.now() + 500, success: _blocked };
            const dmg = enemy.maxHp * (_blocked ? 0.15 : 0.40);
            if (_blocked) createParticles(enemy.x, enemy.y, 14, '#c084fc', 3, 9);
            enemy.hp = Math.max(0, enemy.hp - dmg);
            if (enemy.hp <= 0) enemy._markedForDeath = true;
            return;
        }
    }

    // Circuit Link: enemy đang bị Goliath (còn ở pha Alpha) liên kết — thiệt
    // hại 1 đòn bị giới hạn tối đa 80% Max HP của CHÍNH enemy đó (để nó
    // không bị one-shot xoá sổ trước khi Damage Pull kịp ghi sổ), và phần
    // thiệt hại thực nhận được cộng dồn vào sổ ghi của Goliath.
    if (enemy._goliathLinkedTo && enemy._goliathLinkedTo.phase === 'alpha') {
        const g = enemy._goliathLinkedTo;
        const cap = enemy.maxHp * 0.8;
        let dmg = Math.ceil((source.damage || 0) + (enemy.maxHp * (source.percentDamage || 0)));
        if (dmg > cap) {
            source = Object.assign({}, source, { damage: cap, percentDamage: 0 });
            dmg = cap;
        }
        g._linkedLedger.set(enemy, (g._linkedLedger.get(enemy) || 0) + dmg);
        // Ngoại lệ Damage Pull: nếu đòn KẾT LIỄU tới từ Skill F/D/tia laser tối
        // thượng Photokrystos (sát thương lý thuyết gần như vô hạn), đánh dấu
        // lại để death-hook ở main.js cộng phẳng +50,000 thay vì % ledger thật.
        if (source.isSpiritLaser || source._isSkillF || source._isSkillD) enemy._goliathLethalWasUncapped = true;
    }
    if (enemy.marchosiasParasiteShield && enemy.marchosiasParasiteShield > 0) {
        const effectiveHpForParasite = (enemy.maxHp || enemy.hp) + (enemy.marchosiasParasiteShield || 0);
        let parasiteDmg = Math.ceil((source.damage || 0) + (effectiveHpForParasite * (source.percentDamage || 0)));
        if (gloryForJusticeActive) parasiteDmg = Math.ceil(parasiteDmg * 1.70);
        parasiteDmg = Math.max(0, parasiteDmg);

        if (parasiteDmg <= 0) {
        } else if (enemy.marchosiasParasiteShield >= parasiteDmg) {
            enemy.marchosiasParasiteShield -= parasiteDmg;
            return;
        } else {
            const overflow = parasiteDmg - enemy.marchosiasParasiteShield;
            enemy.marchosiasParasiteShield = 0;
            addExplosion(enemy.x, enemy.y, enemy.size * 0.6, '#00ff88');
            const origDmg = source.damage || 0;
            source = Object.assign({}, source, { damage: Math.max(0, origDmg - (parasiteDmg - overflow)) });
        }
    }

    // Coronation: apostle undergoing transformation, immortal, cannot take damage
    if (enemy.type === 'apostle' && enemy.inCoronation) return;

    if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
        // Shield blocks ALL damage, chỉ đếm hit (max 200)
        if (source.damage > 0 || source.percentDamage > 0) {
            enemy.afoHitCount = Math.min(250, (enemy.afoHitCount || 0) + 1);
        }
        return;
    }

    // Leviathan đang dying: chặn mọi damage VÀ không cho HP thay đổi
    if (enemy.type === 'leviathan' && enemy.dyingLaserPhase) {
        return; // ignore all damage during death sequence
    }
    if (enemy.type === 'aegis_core' && enemy.aegisInvulnerable) {
        if (source.damage > 0 || source.percentDamage > 0) {
            enemy.aegisCustosHits = (enemy.aegisCustosHits || 0) + 1;
            addExplosion(enemy.x, enemy.y, enemy.size * 1.2, 'white');
            if (enemy.aegisCustosHits >= 20) {
                enemy.aegisInvulnerable = false;
                enemy._custosExpired = true;
                // One-time defensive grant based on allies in support aura when Custos breaks
                {
                    const _aR = canvas.width / 2;
                    const _inAura = enemies.filter(a =>
                        a !== enemy && a.hp > 0 && !a._markedForDeath &&
                        !a.type.startsWith('enemy_bullet') && a.type !== 'veilshroud_echo' &&
                        Math.hypot(a.x - enemy.x, a.y - enemy.y) <= _aR
                    ).length;
                    if (_inAura === 0) {
                        _addEnemyShield(enemy, enemy.maxHp * 0.10);
                    } else {
                        const _bPct = _inAura >= 4 ? 0.35 : _inAura >= 3 ? 0.30 : _inAura >= 2 ? 0.25 : 0.15;
                        enemy._aegisBarrier = (enemy._aegisBarrier || 0) + enemy.maxHp * _bPct;
                    }
                }
            }
            return;
        }
    }

    if (enemy.absoluteShield) {
        if (source.damage > 0 || source.percentDamage > 0) {
            enemy.absoluteShield = false;
            addExplosion(enemy.x, enemy.y, enemy.size * 2, 'gold');
            return;
        }
    }

    // Evade scales from min to max over 3 minutes: lesser 1–2%, abnormal 3–5%, elite 5–10%, dominator 10–15%
    {
        const _t = Math.min(1, gameElapsedTime / 180000);
        const _evadeLesser   = 0.01 + _t * 0.01;
        const _evadeAbnormal = 0.03 + _t * 0.02;
        const _evadeElite    = 0.05 + _t * 0.05;
        const _evadeDom      = 0.10 + _t * 0.05;
        let _evade = ({
            'apostle': _evadeLesser,
            'veilshroud': _evadeAbnormal, 'thaelis': _evadeAbnormal,
            'aegis_core': _evadeElite, 'marchosias': _evadeElite, 'egregor': _evadeElite,
            'dargruel': _evadeDom, 'leviathan': _evadeDom
        })[enemy.type] || 0;
        // Marchosias: +10% extra body evade while arc barrier is alive
        if (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0) _evade += 0.10;
        // Inevitable (Dargruel): +5% evade per 6% MaxHP lost, cap +30%
        if (enemy.type === 'dargruel') {
            const _hpLostPct = (1 - enemy.hp / enemy.maxHp) * 100;
            _evade += Math.min(0.30, Math.floor(_hpLostPct / 6) * 0.05);
        }
        if (_evade > 0 && Math.random() < _evade) {
            addExplosion(enemy.x, enemy.y, enemy.size * 0.55, '#aaddff');
            // Evaded body hits on Marchosias can still trigger sword
            if (enemy.type === 'marchosias') _tryTriggerMarchosiasCounter(enemy);
            return;
        }
    }

    if (source.applySoulReaver) {
        enemy.soulReaver = true;
    }

    const currentTime = performance.now();
    if (enemy.vulnStacks && enemy.vulnEndTime && currentTime > enemy.vulnEndTime) {
        enemy.vulnStacks = 0;
        enemy.vulnEndTime = 0;
        enemy.vulnTrueDmgEnd = 0;
    }

    const oldHP = enemy.hp;
    enemy.shield = enemy.shield || 0;
    const isSentinel = enemy.hasOwnProperty('shotsFiredSinceSpecial');
    const enemyMaxHp = enemy.maxHp || enemy.hp;
    const effectiveHp = enemyMaxHp + enemy.shield;
    let totalDamage = Math.ceil(source.damage + (effectiveHp * (source.percentDamage || 0)));

    if (!isSentinel && !source._vanguardTag && !source._noBase60
        && (source.damage > 0 || (source.percentDamage || 0) > 0)
        && !source.isTeslaDot && !source._isNocToiDot
        && !source._isDtuDot && !source._isSthDot && !source._yogExplosion) {
        totalDamage += 60;
        // Sigil: Lion's Roar — every hit also deals 2% of the enemy's own missing HP as bonus dmg
        if (_hasBuff('su_tu_hong')) {
            totalDamage += Math.ceil((enemy.maxHp - enemy.hp) * 0.02);
        }
    }

    if (gloryForJusticeActive) {
        totalDamage = Math.ceil(totalDamage * 1.70);
    }

    // Accurate Parry buff: +25% tất cả damage đầu ra trong 4s
    if (accurateParryActive && performance.now() < accurateParryEndTime) {
        totalDamage = Math.ceil(totalDamage * 1.25);
    }

    if (_yuukiBonus > 0) {
        totalDamage = Math.ceil(totalDamage * (1 + _yuukiBonus));
    }

    // Sigil: Avalanche — global damage multiplier (per kill stacks, max 70%)
    if (_hasBuff('tuyet_lan') && window._tuyetLanStacks > 0) {
        totalDamage = Math.ceil(totalDamage * (1 + Math.min(0.70, window._tuyetLanStacks * 0.005)));
    }

    // Sigil: Chain Lightning — unpaired Skill G energy orbs grant a stacking dmg buff (max 6x, 5s each)
    if (_hasBuff('set_day_chuyen') && window._sdcDmgStacks && window._sdcDmgStacks.length > 0) {
        const _sdcNow = performance.now();
        window._sdcDmgStacks = window._sdcDmgStacks.filter(t => t > _sdcNow);
        if (window._sdcDmgStacks.length > 0) {
            totalDamage = Math.ceil(totalDamage * (1 + window._sdcDmgStacks.length * 0.15));
        }
    }

    // Sigil: Circuit Engineer — any active debuff on the target (slow, DoT, Vulnerability,
    // Soul Reaver, Dimensional Rift, Yog mark, ...) grants +50% dmg taken
    if (_hasBuff('ky_su_dien') && !isSentinel && _hasAnyDebuff(enemy)) {
        totalDamage = Math.ceil(totalDamage * 1.50);
    }

    // Sigil: Death Mark — linear 0%→70% from 100%→21% HP; flat +80% at ≤20%
    if (_hasBuff('tu_huyet') && !isSentinel) {
        const _tuFrac = enemy.hp / (enemy.maxHp || enemy.hp);
        if (_tuFrac <= 0.20) {
            totalDamage = Math.ceil(totalDamage * 1.80);
        } else {
            totalDamage = Math.ceil(totalDamage * (1 + (1 - _tuFrac) / 0.79 * 0.70));
        }
    }

    // Sigil: Divine Fate — +100% dmg during 5s freeze window at wave start
    if (_hasBuff('than_menh') && window._thanMenhEndTime > 0 && performance.now() < window._thanMenhEndTime) {
        totalDamage = Math.ceil(totalDamage * 2.00);
    }

    // Trọng Thương: +16% mỗi stack (max 4 stacks = +64%)
    if (enemy.vulnStacks && enemy.vulnStacks > 0) {
        totalDamage = Math.ceil(totalDamage * (1 + enemy.vulnStacks * 0.16));
    }

    // Dimensional Rift zone: +25% incoming damage
    if (enemy._inDimensionalRift) {
        totalDamage = Math.ceil(totalDamage * 1.25);
    }

    // True damage window: 4 stacks đủ → 2 giây tiếp theo bypass shield hoàn toàn
    const inTrueDmgWindow = enemy.vulnTrueDmgEnd && performance.now() < enemy.vulnTrueDmgEnd;

    // Egregor, Collective Mind
    if (enemy.type === 'egregor' && !source.isTrueDamage) {
        const _allTentDead = !enemy._tentacleHps || enemy._tentacleHps.every(hp => hp <= 0);
        if (!_allTentDead) {
            const _applyTentacleDmg = () => {
                // Mind Link rage: +5% tentacle DR per stack, max +25%
                const _rageTentDR = Math.min(0.25, (enemy._rageStacks || 0) * 0.05);
                const _tenDmg = Math.ceil(totalDamage * 0.35 * 0.75 * (1 - _rageTentDR));
                if (!enemy._tentacleHps) return;
                const _ti = enemy._tentacleHps.findIndex(hp => hp > 0);
                if (_ti === -1) return;
                const _tentMaxHp = Math.ceil(enemy.maxHp * 0.80);
                const _wasAlive = enemy._tentacleHps[_ti] > 0;
                enemy._tentacleHps[_ti] = Math.max(0, enemy._tentacleHps[_ti] - _tenDmg);
                if (_wasAlive && enemy._tentacleHps[_ti] <= 0) {
                    enemy._tentaclesLost = (enemy._tentaclesLost || 0) + 1;
                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.ceil(enemy.maxHp * 0.06));
                    enemy.maxHp += Math.ceil(_tentMaxHp * 0.20);
                    const _sc = (enemy.size / 2) / 110;
                    const _tiAngle = (_ti / 10) * Math.PI * 2;
                    const _tipDist = (44 + 150 + (_ti % 5) * 16) * _sc;
                    const _tipX = enemy.x + Math.cos(_tiAngle) * _tipDist;
                    const _tipY = enemy.y + Math.sin(_tiAngle) * _tipDist;
                    addExplosion(_tipX, _tipY, 55, '#00ffaa');
                    createParticles(_tipX, _tipY, 20, '#00ffcc', 2, 7);
                    createParticles(_tipX, _tipY, 10, '#ffffff', 1, 4);
                }
            };

            if (!source.isPiercing) {
                const _aliveTents = enemy._tentacleHps.filter(hp => hp > 0).length;
                if (Math.random() < (_aliveTents / 10) * 0.60) return;
                _applyTentacleDmg();
                // ≥4 tentacles lost: normal hits bleed through — 88% DR, hard cap 12% MaxHP
                if ((enemy._tentaclesLost || 0) >= 4) {
                    const _bleedDmg = Math.ceil(Math.min(totalDamage * 0.12, enemy.maxHp * 0.12));
                    enemy.hp = Math.max(0, enemy.hp - _bleedDmg);
                }
                return;
            }

            // Piercing: graze tentacle, then body takes 30% (capped 30% MaxHP)
            _applyTentacleDmg();
            if (enemy.hp <= 0) return;
            if (Math.random() < 0.05) return;
            let _pierceDmg = Math.min(
                Math.ceil(totalDamage * 0.30),
                Math.ceil(enemy.maxHp * 0.30)
            );
            if (enemy._nullSlashPhase === 'charging') _pierceDmg = Math.ceil(_pierceDmg * 0.70);
            enemy.hp = Math.max(0, enemy.hp - _pierceDmg);
            return;
        }
        // All tentacles dead: normal attacks — 50% DR, hard cap 30% MaxHP, applied directly
        if (!source.isPiercing) {
            const _bodyDmg = Math.min(Math.ceil(totalDamage * 0.50), Math.ceil(enemy.maxHp * 0.30));
            enemy.hp = Math.max(0, enemy.hp - _bodyDmg);
            return;
        }
    }

    let combinedDR = 0;
    if (enemy.type === 'egregor') {
        combinedDR += 0.40;
        if (enemy._nullSlashPhase === 'charging') combinedDR += 0.40;
        combinedDR += Math.min(0.20, (enemy._tentaclesLost || 0) * 0.05); // +5% DR per tentacle lost, max 20%
    }
    if (enemy.demonGiftEndTime && currentTime < enemy.demonGiftEndTime) {
        combinedDR += (enemy.demonGiftStacks === 2) ? 0.40 : 0.20;
    }

    if (enemy.type === 'dargruel' && enemy.hp < enemy.maxHp * 0.6) {
        const hpPercent = (enemy.hp / enemy.maxHp) * 100;
        const percentPointsLost = 60 - hpPercent;
        combinedDR += Math.min(0.72, (percentPointsLost * 1.5 / 100));
    }

    // Tenacity: +2.5% DR per 1% HP lost, cap 95%
    if (enemy.type === 'thaelis') {
        const hpLostPct = (1 - enemy.hp / enemy.maxHp) * 100;
        combinedDR += Math.min(0.95, hpLostPct * 0.025);
    }

    if (enemy.type === 'aegis_core') {
        combinedDR += 0.55;
    }

    if (enemy.shield > 0 && enemy.aegisShieldReceived) {
        combinedDR += 0.18;
    }

    if (enemy.type === 'marchosias') {
        combinedDR += 0.45;
    }

    if (enemy.type === 'marchosias_minion' && enemy.DR) {
        combinedDR += enemy.DR;
    }

    if (enemy.type === 'dargruel') {
        // Maître suprême: 50% base + 2.5% per sentinel, capped at 60%
        const maitreDR = Math.min(0.60, 0.50 + sentinels.length * 0.025);
        combinedDR += maitreDR;
    }

    if (enemy.type === 'goliath' && enemy.phase === 'true_form') {
        combinedDR += 0.70; // Inevitable: 70% base DR

        // Joker copies — mỗi cái chỉ cộng DR nếu Goliath THẬT SỰ có bảo thạch
        // đó (enemy._jokerState[name] chỉ tồn tại khi đã hấp thụ đúng viên)
        const js = enemy._jokerState;
        if (js['Veilshroud'] && js['Veilshroud'].phantomEnd && currentTime < js['Veilshroud'].phantomEnd) {
            combinedDR += 0.99; // Alteration: 99% DR trong Phantom
        }
        if (js['Thaelis']) {
            const hpLostPct = (1 - enemy.hp / enemy.maxHp) * 100;
            combinedDR += Math.max(0.20, 0.60 - hpLostPct * 0.006); // Tenacity: trần dao động 20-60%
        }
        if (js['Marchosias']) {
            combinedDR += 0.60; // Sword & Barrier: 60% DR arc thường trực
        }
        if (js['Egregor'] && (js['Egregor'].phase === 'telegraphing' || js['Egregor'].phase === 'striking')) {
            combinedDR += 0.40; // Psychic Tempest đang telegraph/đánh: +40% DR
        }
        // Hạn chế mới: đang vận bất kỳ skill nào (của chính Goliath hay Joker
        // copy) thì +10% DR, bù lại cho việc bị chậm 35% + cấm dịch chuyển.
        if (_goliathIsCasting(enemy)) {
            combinedDR += 0.10;
        }
    }

    if (enemy.type === 'leviathan') {
        combinedDR += 0.60; // Inevitable: 60% base DR
        // Grace period right as the AFO shield breaks: 90% DR for 1s
        if (enemy._afoBreakGraceEnd && currentTime < enemy._afoBreakGraceEnd) {
            combinedDR = Math.max(combinedDR, 0.90);
        }
    }

    // Egregor Null Slash charging: +40% DR on body hits
    if (enemy.type === 'egregor' && enemy._nullSlashPhase === 'charging') {
        combinedDR += 0.40;
    }
    if (enemy.type === 'embryo') {
        combinedDR += 0.90;
    }

    // Veilshroud: 99% DR trong phantom, 40% base DR bình thường
    // Alteration, mỗi đòn trúng có 40% né + kích hoạt phantom ngay lập tức
    if (enemy.type === 'veilshroud') {
        if (!enemy.inPhantom && !enemy.lightningPending && Math.random() < 0.40) {
            enemy.inPhantom = true;
            enemy.phantomTimer = 0;
            enemy.phantomCheckTimer = 0;
            enemy._phantomAbsorb = 0;
            createParticles(enemy.x, enemy.y, 12, '#00e5cc', 2, 7);
            return; // đòn bị né hoàn toàn
        }
        if (enemy._veilHealDRExpiry && currentTime < enemy._veilHealDRExpiry) {
            combinedDR += 0.20; // Alteration heal DR buff: +20% for 3s after receiving heal
        }
        combinedDR += enemy.inPhantom ? 0.99 : 0.40;
    }

    // veilshroud_echo: hoàn toàn bất tử
    if (enemy.type === 'veilshroud_echo') return;

    // Thủ Lĩnh Bầy Đàn (Envy): +25% DR, cộng dồn với mọi nguồn
    if (enemy.levEnvy) {
        combinedDR += 0.25;
        // Envy 1% MaxHP/s regen handled in main loop
    }

    // Iron Body (Bất tử tuyệt đối), bypass all damage
    if (isSentinel && enemy.ironBody && performance.now() < enemy.ironBodyEnd) {
        return; // hoàn toàn miễn sát thương
    }

    // Tidal Flow: 1-hit iron body layer per sentinel, cooldown starts after consumed
    if (isSentinel && enemy._trieuIronBody && _hasBuff('trieu_hoi')) {
        enemy._trieuIronBody = false;
        enemy._trieuIronBodyCooldownEnd = performance.now() + 8000;
        createParticles(enemy.x, enemy.y, 4, '#22c55e', 2, 5);
        return;
    }

    // Coronation Iron Body perk, 1-hit block on spawned enemy (tu_huyet blade arc bypasses)
    if (!isSentinel && enemy.ironBodyHits > 0 && !source._bypassIronBody) {
        enemy.ironBodyHits--;
        createParticles(enemy.x, enemy.y, 6, '#ffd700', 2, 7);
        return; // 1 hit absorbed
    }

    // Sentinel Parry (khi Glory for Justice active)
    if (isSentinel && gloryForJusticeActive && (source.damage > 0 || source.percentDamage > 0)
        && !source.isTeslaDot && !source.isChainLightning) {
        if (Math.random() < 0.20) {
            _triggerSentinelParry(enemy);
            return;
        }
    }

    // Vanguard Network (Liên kết Vanguard), 5+ sentinels
    if (isSentinel && sentinels.length >= 5 && (source.damage > 0 || source.percentDamage > 0)) {
        const effHp = (enemy.maxHp || enemy.hp) + (enemy.shield || 0);
        let rawDmg = Math.ceil((source.damage || 0) + effHp * (source.percentDamage || 0));
        if (gloryForJusticeActive) rawDmg = Math.ceil(rawDmg * 1.70);
        if (accurateParryActive && performance.now() < accurateParryEndTime) rawDmg = Math.ceil(rawDmg * 1.25);
        if (enemy.vulnStacks) rawDmg = Math.ceil(rawDmg * (1 + enemy.vulnStacks * 0.16));
        rawDmg = Math.max(0, rawDmg);
        // BUG A fix: apply vanguard DR (each source 10%, max 30%)
        const _vIsTrueDmg = source.isTrueDamage || inTrueDmgWindow;
        if (!_vIsTrueDmg) {
            let _vDR = 0.05; // base sentinel DR
            if (gloryForJusticeActive) _vDR += 0.15;
            if (sentinels.length >= 5 && sentinels.length < 12) _vDR += 0.10;
            if (enemy.sentinelParryBuff && performance.now() < enemy.sentinelParryBuffEnd) _vDR += 0.10;
            rawDmg = Math.ceil(rawDmg * (1 - _vDR));
        }
        rawDmg = Math.max(0, rawDmg);
        _applyVanguardDamage(rawDmg, source._vanguardTag || 'generic', _vIsTrueDmg, enemy);
        return;
    }

    if (isSentinel) combinedDR += 0.08; // base sentinel DR
    if (isSentinel && gloryForJusticeActive) {
        combinedDR += 0.30; // Glory for Justice sentinel DR
    }
    // Tier 2 Herd Mentality: +10% DR thêm khi có 5-11 sentinels
    if (isSentinel && sentinels.length >= 5 && sentinels.length < 12) {
        combinedDR += 0.10;
    }
    // Sentinel Parry buff: +10% DR (có thể cộng dồn)
    if (isSentinel && enemy.sentinelParryBuff && performance.now() < enemy.sentinelParryBuffEnd) {
        combinedDR += 0.10;
    }

    if (enemy._debugDR) combinedDR += enemy._debugDR;
    combinedDR = Math.min(0.99, combinedDR);
    const _veilPreDr = (enemy.type === 'veilshroud' && enemy.inPhantom) ? totalDamage : 0;
    // True damage skips DR; Lion's Roar Burn uses 50% of DR; normal damage uses full DR
    if (!source.isTrueDamage) {
        const _drMul = source._isSthDot ? combinedDR * 0.5 : combinedDR;
        totalDamage = Math.ceil(totalDamage * (1 - _drMul));
        totalDamage = Math.max(0, totalDamage);
    }

    // Damage caps apply regardless of true damage

    // Veilshroud Phantom: damage capped at 25% maxHP per hit
    if (enemy.type === 'veilshroud' && enemy.inPhantom) {
        totalDamage = Math.min(totalDamage, Math.ceil(enemy.maxHp * 0.25));
        // Energy Accumulation: record absorbed damage
        enemy._phantomAbsorb = (enemy._phantomAbsorb || 0) + Math.max(0, _veilPreDr - totalDamage);
    }

    // Inevitable (Leviathan): if hit > 20% maxHP, cap at 10% for 3s (2s cooldown after it ends)
    if (enemy.type === 'leviathan') {
        const now_ine = currentTime;
        if (enemy._inevitableActive && now_ine >= (enemy._inevitableEnd || 0)) {
            enemy._inevitableActive = false;
        }
        if (totalDamage > enemy.maxHp * 0.20) {
            if (!enemy._inevitableActive && now_ine >= (enemy._inevitableCooldownEnd || 0)) {
                enemy._inevitableActive = true;
                enemy._inevitableEnd = now_ine + 3000;
                enemy._inevitableCooldownEnd = now_ine + 5000;
            }
        }
        if (enemy._inevitableActive) {
            totalDamage = Math.min(totalDamage, Math.ceil(enemy.maxHp * 0.10));
        }
    }

    // Inevitable (Dargruel): if hit > 25% maxHP, cap at 11% for 3.5s (2s cooldown)
    if (enemy.type === 'dargruel') {
        const now_ms = currentTime;
        if (enemy._maitreProtActive && now_ms >= (enemy._maitreProtEnd || 0)) {
            enemy._maitreProtActive = false;
        }
        if (totalDamage > enemy.maxHp * 0.25) {
            if (!enemy._maitreProtActive && now_ms >= (enemy._maitreProtCooldownEnd || 0)) {
                enemy._maitreProtActive = true;
                enemy._maitreProtEnd = now_ms + 3500;
                enemy._maitreProtCooldownEnd = now_ms + 5500;
            }
        }
        if (enemy._maitreProtActive) {
            totalDamage = Math.min(totalDamage, Math.ceil(enemy.maxHp * 0.11));
        }
    }

    // Tenacity Bulwark (Thaelis): per-hit cap = max(35%, 90% - 5% per 1% HP lost) × maxHp
    if (enemy.type === 'thaelis') {
        const _hpLostPct = (1 - enemy.hp / enemy.maxHp) * 100;
        const _tCap = Math.max(0.35, 0.90 - _hpLostPct * 0.05);
        totalDamage = Math.min(totalDamage, Math.ceil(enemy.maxHp * _tCap));
    }

    // Collective Mind (Egregor): body per-hit cap for true damage
    // Cap = max(25%, 90% - 10% per lost tentacle) of body MaxHP
    // Boon and Bane backlash bypasses this cap (has its own 40% MaxHP cap)
    if (enemy.type === 'egregor' && !source._boonBaneBacklash) {
        const _lost = enemy._tentaclesLost || 0;
        const _capPct = Math.max(0.25, 0.90 - 0.10 * _lost);
        totalDamage = Math.min(totalDamage, Math.ceil(enemy.maxHp * _capPct));
    }

    // Reincarnation, embryo per-hit damage cap: 10% of EP
    if (enemy.type === 'embryo') {
        totalDamage = Math.min(totalDamage, Math.ceil((enemy.maxHp + (enemy.shield || 0)) * 0.10));
    }

    // Marchosias minion: per-hit cap 50% of max EP
    if (enemy.type === 'marchosias_minion') {
        totalDamage = Math.min(totalDamage, Math.ceil((enemy.maxHp + (enemy.shield || 0)) * 0.50));
    }

    // Tenacity Barrier (Thaelis): lớp khiên riêng, chặn MỌI đòn (kể cả piercing)
    // Ngoại lệ: isSpiritLaser và true damage xuyên qua
    if (enemy.type === 'thaelis' && (enemy._tenacityBarrier || 0) > 0 && !source.isSpiritLaser && !source.isTrueDamage && !inTrueDmgWindow) {
        const _absorbed = Math.min(totalDamage, enemy._tenacityBarrier);
        enemy._tenacityBarrier -= _absorbed;
        enemy._tenacityBarrier = Math.max(0, enemy._tenacityBarrier);
        if (enemy._tenacityBarrier <= 0) {
            enemy._tenacityBarrier = 0;
            // Barrier break VFX
            addExplosion(enemy.x, enemy.y, enemy.size * 1.1, '#ffdd00');
            createParticles(enemy.x, enemy.y, 40, '#ffe066', 4, 14);
            createParticles(enemy.x, enemy.y, 20, '#ffffff', 3, 10);
        }
        totalDamage -= _absorbed;
        if (totalDamage <= 0) { enemy.hp = Math.max(0, enemy.hp); return; }
    }

    // Gaia Barrier (Sentinel): 99% absorbed by barrier, 1% through to body
    // True damage bypasses the barrier entirely
    if (isSentinel && (enemy._gaiaBarrier || 0) > 0 && !source.isTrueDamage && !inTrueDmgWindow) {
        const _gAbsorb = Math.min(Math.ceil(totalDamage * 0.99), enemy._gaiaBarrier);
        enemy._gaiaBarrier = Math.max(0, enemy._gaiaBarrier - _gAbsorb);
        if (enemy._gaiaBarrier <= 0) {
            addExplosion(enemy.x, enemy.y, enemy.size * 1.2, '#00ff88');
            createParticles(enemy.x, enemy.y, 14, '#00ff88', 2, 7);
        }
        totalDamage = Math.max(1, Math.ceil(totalDamage * 0.01));
    }

    // Pisces Dream Realm: enemies marked by black hole accumulate damage
    if (_hasBuff('coi_mong') && enemy._yogMark && !source._yogExplosion) {
        enemy._yogMarkAccum = (enemy._yogMarkAccum || 0) + totalDamage;
    }

    // Boon and Bane (Egregor passive): during Null Slash charge, each body hit grants barrier
    // Barrier absorbs non-true hits; true damage pierces through
    if (enemy.type === 'egregor' && enemy._nullSlashPhase === 'charging' && !source._boonBaneBacklash && totalDamage > 0) {
        const _bbGain = Math.ceil(totalDamage * 0.75);
        enemy._boonBaneBarrier      = (enemy._boonBaneBarrier      || 0) + _bbGain;
        enemy._boonBaneBarrierTotal = (enemy._boonBaneBarrierTotal || 0) + _bbGain;
        if (!source.isTrueDamage && !inTrueDmgWindow) {
            const _bbAbsorb = Math.min(totalDamage, enemy._boonBaneBarrier);
            enemy._boonBaneBarrier = Math.max(0, enemy._boonBaneBarrier - _bbAbsorb);
            totalDamage -= _bbAbsorb;
            if (totalDamage <= 0) return;
        }
    }

    // Aegis Core post-Custos barrier: absorbs non-true hits, true damage pierces
    if (enemy.type === 'aegis_core' && (enemy._aegisBarrier || 0) > 0 && !source.isTrueDamage && !inTrueDmgWindow) {
        const _absorb = Math.min(totalDamage, enemy._aegisBarrier);
        enemy._aegisBarrier = Math.max(0, enemy._aegisBarrier - _absorb);
        totalDamage -= _absorb;
        if (totalDamage <= 0) return;
    }

    // Goliath Inevitable damage window: hit > 20% MaxHP (post-DR) opens a
    // 2.5s window capping every hit at 5% MaxHP; 2s CD after window ends
    // (CD cleared in updateGoliath). True damage bypasses this cap entirely.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form' && !source.isTrueDamage && !inTrueDmgWindow) {
        const _gNow = performance.now();
        if (enemy._inevitableWindowEnd && _gNow < enemy._inevitableWindowEnd) {
            totalDamage = Math.min(totalDamage, enemy.maxHp * 0.05);
        } else if (totalDamage > enemy.maxHp * 0.20 && !(enemy._inevitableCooldownEnd && _gNow < enemy._inevitableCooldownEnd)) {
            enemy._inevitableWindowEnd = _gNow + 2500;
            totalDamage = Math.min(totalDamage, enemy.maxHp * 0.05);
        }
    }

    // Apply damage: true damage and true-damage-window both bypass shield
    if (source.isTrueDamage || inTrueDmgWindow) {
        enemy.hp -= totalDamage;
    } else {
        const damageToShield = Math.min(enemy.shield, totalDamage);
        enemy.shield -= damageToShield;
        enemy.shield = Math.max(0, enemy.shield);
        totalDamage -= damageToShield;
        enemy.hp -= totalDamage;
    }
    enemy.hp = Math.max(0, enemy.hp);
    if (enemy.hp <= 0) enemy._markedForDeath = true;
    else if (window.AudioMgr) window.AudioMgr.playSfxAt('enemy-hit', enemy.x, enemy.y);

    // Inevitable emergency trigger: the instant Leviathan first crosses 50%
    // HP, immediately activate the protection window regardless of this
    // hit's size or the normal cooldown — a one-time guaranteed proc.
    if (enemy.type === 'leviathan' && !enemy._levHalfHpTriggered && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.50) {
        enemy._levHalfHpTriggered = true;
        enemy._inevitableActive = true;
        enemy._inevitableEnd = currentTime + 3000;
        enemy._inevitableCooldownEnd = currentTime + 5000;
        createParticles(enemy.x, enemy.y, 20, '#9d00ff', 2, 7);
    }

    // Onslaught (khat_chien): every landed ally hit (except Skill F/D, and not
    // the fireball's own impact) can fire a fireball at whichever enemy the
    // PREVIOUS qualifying hit struck. The 300ms CD only throttles firing —
    // the "last hit" tracking always updates so the target stays current.
    // Fodder enemies often die in 1 hit, so the "previous" target is
    // frequently already dead by the next trigger — fall back to the
    // CURRENT target (if it's still alive) instead of silently skipping,
    // so the ability doesn't go quiet against weak waves.
    if (_hasBuff('khat_chien') && !isSentinel && !source._isSkillF && !source._isSkillD && !source._isOnslaughtOrb && totalDamage > 0) {
        const _onNow = performance.now();
        if (_onNow >= (window._onslaughtCooldownEnd || 0)) {
            const _prevOnslaughtTarget = window._onslaughtLastEnemy;
            let _onslaughtFireTarget = null;
            if (_prevOnslaughtTarget && _prevOnslaughtTarget.hp > 0 && !_prevOnslaughtTarget._markedForDeath && enemies.includes(_prevOnslaughtTarget)) {
                _onslaughtFireTarget = _prevOnslaughtTarget;
            } else if (enemy.hp > 0 && !enemy._markedForDeath) {
                _onslaughtFireTarget = enemy;
            }
            if (_onslaughtFireTarget) {
                window._onslaughtOrbs = window._onslaughtOrbs || [];
                window._onslaughtOrbs.push({ x: player.x, y: player.y, target: _onslaughtFireTarget, baseDmg: 100 + Math.ceil(totalDamage * 0.15) });
            }
            window._onslaughtCooldownEnd = _onNow + 300;
        }
        window._onslaughtLastEnemy = enemy;
    }

    // Compound Interest: +200 true damage (bypasses shield and DR, like isTrueDamage
    // elsewhere in this function) while Photokrystos is alive — Goliath luật
    // riêng (Inevitable/Warding Palm) phải luôn trên mọi sigil, kể cả bypass nhỏ này.
    if (_hasBuff('lai_kep') && !isSentinel && enemy.type !== 'goliath'
        && typeof spirits !== 'undefined' && spirits.some(s => s.isPhotokrystos && !s._done)) {
        enemy.hp = Math.max(0, enemy.hp - 200);
        if (enemy.hp <= 0) enemy._markedForDeath = true;
    }

    // Sigil: Death Mark — enemy at ≤5% HP triggers lightning instakill. LOẠI
    // TRỪ Goliath — mọi luật riêng của Goliath (Inevitable, Fracture Step,
    // Warding Palm) phải luôn ở TRÊN mọi sigil, kể cả sigil "xuyên Iron Body"
    // này; Goliath không được phép chết vì 1 rule instakill chung như vậy.
    if (_hasBuff('tu_huyet') && !isSentinel && enemy.type !== 'goliath' && enemy.hp > 0
        && enemy.hp / (enemy.maxHp || enemy.hp) <= 0.05
        && !enemy.inCoronation && enemy.type !== 'veilshroud_echo') {
        enemy.hp = 0;
        enemy._markedForDeath = true;
        _spawnBloodFlower(enemy.x, enemy.y, enemy.size);
        // Lightning bolt visual: vertical streak particles from above
        const lx = enemy.x, ly = enemy.y;
        for (let _li = 0; _li < 18; _li++) {
            const segY = ly - enemy.size * 3 - _li * 14;
            createParticles(lx + (Math.random() - 0.5) * 8, segY, 1, '#aaddff', 1, 3);
        }
        createParticles(lx, ly, 16, '#ffffff', 3, 8);
        createParticles(lx, ly, 10, '#88ccff', 2, 6);
    }

    // Leviathan: khi HP về 0 (hoặc đã ≤ 1), spawn death lasers ngay nếu chưa spawn
    if (enemy.type === 'leviathan' && enemy.hp <= 1 && !enemy._deathLaserSpawned) {
        enemy._deathLaserSpawned = true;
        enemy.hp = 0;
        if (!window._levDeathLasers) window._levDeathLasers = [];
        const hits = enemy.afoHitCount || 1;
        const lx = enemy.x, ly = enemy.y;
        const NUM_WINGS = 9;

        // Build target angles: mỗi sentinel nhận 1 laser, player nhận phần còn lại
        const angles = [];
        const sentCopy = [...sentinels].slice(0, NUM_WINGS - 1);
        sentCopy.forEach(s => angles.push(Math.atan2(s.y - ly, s.x - lx)));

        // Player luôn nhận ít nhất 1
        const pAngle = Math.atan2(player.y - ly, player.x - lx);
        angles.push(pAngle);

        // Spread nếu còn thiếu
        let si = 1;
        while (angles.length < NUM_WINGS) {
            const side = si % 2 === 0 ? 1 : -1;
            angles.push(pAngle + side * Math.ceil(si / 2) * 0.28);
            si++;
        }

        // Cánh ban đầu ở góc đều nhau (như bình thường)
        // Chúng sẽ quay về targetAngle trong warnTime (animation trong render)
        angles.slice(0, NUM_WINGS).forEach((targetAngle, k) => {
            const defaultAngle = (Math.PI * 2 / NUM_WINGS) * k - Math.PI / 2;
            window._levDeathLasers.push({
                ox: lx, oy: ly,
                angle: targetAngle,          // góc cuối (nơi laser bắn)
                startAngle: defaultAngle,     // góc đầu (vị trí cánh ban đầu)
                warnTime: 1200,              // ms animation cánh xoay + warning
                activeTime: 900,
                elapsed: 0,
                hitPlayer: false, hitSentinels: new Set(),
                levHits: hits
            });
        });
        _setShake(12, 400);
    }

    const isChainable = gloryForJusticeActive && !source.isChainLightning && !source.isTeslaDot;

    if (isChainable && currentTime > chainLightningCooldownEnd) {
        chainLightningCooldownEnd = currentTime + 150;
        const chainDamage = totalDamage * 0.50;
        let chainedCount = 0;
        for (const otherEnemy of enemies) {
            if (chainedCount >= 8) break;
            if (otherEnemy.type === 'veilshroud_echo' || otherEnemy.inCoronation) continue; // untargetable
            if (otherEnemy !== enemy && !otherEnemy.type.startsWith('enemy_bullet') && Math.hypot(enemy.x - otherEnemy.x, enemy.y - otherEnemy.y) < 150) {
                let debuff = Math.random() < 0.60;
                dealDamage(otherEnemy, { damage: chainDamage, isChainLightning: true, applySoulReaver: debuff });
                chainLightningEffects.push({
                    x1: enemy.x, y1: enemy.y, x2: otherEnemy.x, y2: otherEnemy.y, lifetime: 250, maxLifetime: 250
                });
                if (window.AudioMgr) window.AudioMgr.playSfxAt('chain-lightning', enemy.x, enemy.y);
                chainedCount++;
            }
        }
    }

    // Trigger Trọng thương: player auto 25%, tất cả nguồn khác 15% (bao gồm chain lightning và tesla)
    if (source.applyVuln && Math.random() < (source.vulnChance || 0)) {
        applyVulnerability(enemy);
    } else if (!source.applyVuln && Math.random() < 0.15) {
        applyVulnerability(enemy);
    }

    // Sigil: Shadow Twin trigger — every 10th hit from any player-ally source (sentinels excluded)
    if (_hasBuff('bong_doi') && !isSentinel && source.type !== 'sentinel_auto' && source.type !== 'sentinel_special') {
        window._bongDoiHitCount = (window._bongDoiHitCount || 0) + 1;
        if (window._bongDoiHitCount % 10 === 0 && !window._bongDoiCharging
            && currentTime >= (window._bongDoiCooldownEnd || 0)) {
            window._bongDoiCharging = true;
            window._bongDoiChargeStart = currentTime;
        }
    }

    if (enemy.type === 'dargruel') {
        const oldPercent = oldHP / enemy.maxHp;
        const newPercent = enemy.hp / enemy.maxHp;
        const _demonTrigger = () => {
            triggerDemonGift(enemy);
            enemy.ironBodyHits = (enemy.ironBodyHits || 0) + 3;
        };
        if (oldPercent > 0.90 && newPercent <= 0.90 && !enemy.demonGift90Triggered) { _demonTrigger(); spawnBossShockwave(enemy.x, enemy.y); enemy.demonGift90Triggered = true; }
        if (oldPercent > 0.70 && newPercent <= 0.70 && !enemy.demonGift70Triggered) { _demonTrigger(); enemy.demonGift70Triggered = true; }
        if (oldPercent > 0.50 && newPercent <= 0.50 && !enemy.demonGift50Triggered) { _demonTrigger(); spawnBossShockwave(enemy.x, enemy.y); enemy.demonGift50Triggered = true; }
        if (oldPercent > 0.30 && newPercent <= 0.30 && !enemy.demonGift30Triggered) { _demonTrigger(); enemy.demonGift30Triggered = true; }
        if (oldPercent > 0.01 && newPercent <= 0.01 && !enemy.demonGift1Triggered) { _demonTrigger(); enemy.demonGift1Triggered = true; }
    }

    // Tenacity, mỗi khi mất 30% HP, nhận lớp khiên riêng (30% MaxHP + 15% HP đã mất + 100) × 1.25
    if (enemy.type === 'thaelis') {
        const oldPct = oldHP / enemy.maxHp;
        const newPct = enemy.hp / enemy.maxHp;
        const _hpLost = enemy.maxHp - enemy.hp;
        const shieldGrant = Math.ceil((enemy.maxHp * 0.30 + _hpLost * 0.20 + 250) * 1.34);
        const _grantBarrier = () => {
            // Lớp khiên hoàn toàn tách biệt với EP, _tenacityBarrier
            enemy._tenacityBarrier = (enemy._tenacityBarrier || 0) + shieldGrant;
            enemy._tenacityBarrierMax = (enemy._tenacityBarrierMax || 0) + shieldGrant;
            createParticles(enemy.x, enemy.y, 35, '#ffe066', 3, 12);
            createParticles(enemy.x, enemy.y, 18, '#ffffff', 2, 8);
        };
        if (oldPct > 0.70 && newPct <= 0.70 && !enemy._tenacityBarrier70) { _grantBarrier(); enemy._tenacityBarrier70 = true; }
        if (oldPct > 0.40 && newPct <= 0.40 && !enemy._tenacityBarrier40) { _grantBarrier(); enemy._tenacityBarrier40 = true; }
        if (oldPct > 0.10 && newPct <= 0.10 && !enemy._tenacityBarrier10) { _grantBarrier(); enemy._tenacityBarrier10 = true; }
    }
}
// LEVIATHAN, Dominator Class

function spawnLeviathan() {
    const baseSize = 25 + Math.random() * 5;
    const size = baseSize * 10;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.min(15435, 8820 + hpFromTime * 55);
    hp = Math.ceil(hp * 1.05 * 1.15); // +15% global HP buff (stacks with Leviathan's own +5%)

    // Y = random 6-9 kills để trigger announcement Perseverance → vỡ khiên
    const killQuota = 10 + Math.floor(Math.random() * 11); // 10–20

    const lev = {
        x: Math.random() * (canvas.width - size * 2) + size,
        y: -size,
        size,
        speed: (1 + Math.random() * 0.5) * 0.8 * 0.85 * 0.85 * 1.3, // ~1.5 u/s
        hp, maxHp: hp,
        type: 'leviathan',
        shield: 0,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,

        // All for One
        afoShieldActive: true,
        afoShieldBroken: false,
        afoKillCount: 0,
        afoKillQuota: killQuota,
        afoHitCount: 0,

        // Announcement sweep (quota met → one sweep → shield breaks)
        afoAnnouncePending: false, // quota just met, waiting to start charge
        afoAnnouncing: false,      // announcement sweep in progress

        // Perseverance (normal cycle after shield broken)
        perseveranceCharging: false,
        perseveranceChargeStart: 0,
        perseveranceFiring: false,
        perseveranceSweepOrigin: 0,
        perseveranceSweepStart: 0,
        perseveranceSweepProgress: 0,
        perseveranceSweepCurrent: null,
        perseveranceCooldown: 0,

        shootTimer: 750,
        shootInterval: 750,

        dyingLaserPhase: false,
        dyingLaserTimer: 0,
        dyingLaserFired: false,

        // Bulwark Barrier
        _levBarrierTimer: 0,
        _levBarrierLayers: 0,
        _levHalfHpTriggered: false,
    };
    enemies.push(lev);
    // Thủ Lĩnh Bầy Đàn: đánh dấu Envy lên tất cả enemy hiện có
    _applyLeviathanEnvy(lev);
}

function _ensureLeviathanQuota(lev) {
    const killable = enemies.filter(e =>
        e !== lev &&
        e.type !== 'leviathan' &&
        !e.type.startsWith('enemy_bullet') &&
        e.type !== 'abyssal_chain' &&
        e.type !== 'veilshroud_echo' &&
        !e.inCoronation
    ).length;
    const needed = lev.afoKillQuota - killable;
    for (let i = 0; i < needed; i++) spawnApostle();
}

function _applyLeviathanEnvy(lev) {
    enemies.forEach(e => {
        if (e === lev) return;
        if (e.type.startsWith('enemy_bullet') || e.type === 'embryo' || e.type === 'abyssal_chain') return;
        if (e.levEnvy) return; // already marked
        e.levEnvy = true;
        e.levEnvyLev = lev;
    });
}

function updateLeviathan(enemy, deltaTime) {
    const now = performance.now();

    // Đã die (hp=0 set bởi dealDamage) → skip, main loop sẽ splice
    if (enemy.hp <= 0) return;

    // MOVE DOWN
    enemy.y += enemy.speed * (deltaTime / 16.67);
    if (enemy.y > canvas.height + enemy.size) { enemy.hp = 0; return; }

    // Re-apply Envy to enemies that spawned after this Leviathan
    enemy._levEnvyRecheckTimer = (enemy._levEnvyRecheckTimer || 0) + deltaTime;
    if (enemy._levEnvyRecheckTimer >= 2500) {
        enemy._levEnvyRecheckTimer = 0;
        _applyLeviathanEnvy(enemy);
    }

    // Bulwark Barrier (passive): every 1s, if the shield hasn't reached its
    // cap of 2 layers, gain 1 more layer worth 0.5% MaxHP per on-screen
    // enemy (each layer individually capped at 15% MaxHP). Resets once the
    // shield is fully depleted so it builds back up from scratch.
    enemy._levBarrierTimer = (enemy._levBarrierTimer || 0) + deltaTime;
    if (enemy._levBarrierTimer >= 1000) {
        enemy._levBarrierTimer -= 1000;
        if ((enemy.shield || 0) <= 0) enemy._levBarrierLayers = 0;
        if ((enemy._levBarrierLayers || 0) < 2) {
            const _onScreenEnemies = enemies.filter(e =>
                e !== enemy && !e.type.startsWith('enemy_bullet') &&
                e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation
            ).length;
            const _levLayerVal = Math.min(enemy.maxHp * 0.15, enemy.maxHp * 0.005 * _onScreenEnemies);
            if (_levLayerVal > 0) {
                enemy.shield = (enemy.shield || 0) + _levLayerVal;
                enemy._levBarrierLayers = (enemy._levBarrierLayers || 0) + 1;
                createParticles(enemy.x, enemy.y, 6, '#00e5ff', 2, 6);
            }
        }
    }

    // PHASE 2: ALL FOR ONE SHIELD
    if (enemy.afoShieldActive) {
        if (enemy.afoKillCount >= enemy.afoKillQuota && !enemy.afoAnnouncePending && !enemy.afoAnnouncing) {
            enemy.afoAnnouncePending = true;
            enemy.perseveranceCharging = true;
            enemy.perseveranceChargeStart = now;
        }

        if (enemy.afoAnnouncePending || enemy.afoAnnouncing) {
            if (enemy.perseveranceCharging) {
                if (now - enemy.perseveranceChargeStart >= 1000) {
                    enemy.perseveranceCharging = false;
                    enemy.afoAnnouncePending = false;
                    enemy.afoAnnouncing = true;
                    _spawnPerseveranceBeam(enemy, now);
                }
            }
            if (enemy.afoAnnouncing && !_hasPersBeam(enemy)) {
                // Sweep done → BREAK THE SHIELD
                enemy.afoAnnouncing = false;
                enemy.afoShieldActive = false;
                enemy.afoShieldBroken = true;
                // Grace period the instant the Iron Body shield breaks: 1s of
                // 90% DR plus a fresh barrier layer worth 50% Max HP (a shield
                // pool, absorbed like normal — not another Iron Body).
                enemy._afoBreakGraceEnd = now + 1000;
                enemy.shield = (enemy.shield || 0) + enemy.maxHp * 0.50;
                addExplosion(enemy.x, enemy.y, enemy.size * 3, '#00e5ff');
                for (let i = 0; i < 40; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const _sp = _acquireParticle();
                    _sp.x = enemy.x; _sp.y = enemy.y;
                    _sp.vx = Math.cos(a) * (3 + Math.random() * 8);
                    _sp.vy = Math.sin(a) * (3 + Math.random() * 8);
                    _sp.color = i % 2 === 0 ? '#00e5ff' : '#ffffff';
                    _sp.size = 4 + Math.random() * 5; _sp.lifetime = 800; _sp.maxLifetime = 800;
                    particles.push(_sp);
                }
                _setShake(15, 500);
                enemy.perseveranceCooldown = now + 2000;
                enemy.shootTimer = 750;
            }
        }

        if (enemy.afoShieldActive) return;
    }

    // PHASE 3: POST-SHIELD, PERSEVERANCE + ATTACK

    // Perseverance cycle
    if (enemy.perseveranceCharging) {
        if (now - enemy.perseveranceChargeStart >= 1000) {
            enemy.perseveranceCharging = false;
            _spawnPerseveranceBeam(enemy, now);
        }
    } else if (!_hasPersBeam(enemy) && enemy.afoShieldBroken) {
        if (now >= (enemy.perseveranceCooldown || 0)) {
            enemy.perseveranceCharging = true;
            enemy.perseveranceChargeStart = now;
        }
    }

    // Normal attack
    if (enemy.afoShieldBroken) {
        enemy.shootTimer -= deltaTime;
        if (enemy.shootTimer <= 0) {
            enemy.shootTimer = enemy.shootInterval;
            const targets = [...sentinels, player];
            let nearest = null, minDist = Infinity;
            targets.forEach(t => {
                const d = Math.hypot(t.x - enemy.x, t.y - enemy.y);
                if (d < minDist) { minDist = d; nearest = t; }
            });
            if (nearest) {
                const baseAngle = Math.atan2(nearest.y - enemy.y, nearest.x - enemy.x);
                for (let i = -1; i <= 1; i++) {
                    const a = baseAngle + i * 0.22;
                    const bulletHp = Math.ceil(enemy.maxHp * 0.02);
                    enemies.push({
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5,
                        hp: bulletHp, maxHp: bulletHp, size: 10,
                        type: 'enemy_bullet', isSplit: false, ownerRef: enemy
                    });
                }
            }
        }
    }
}

// Spawn Perseverance beam, quét 360° toàn bản đồ
function _spawnPerseveranceBeam(enemy, now) {
    if (!window._levPersBeams) window._levPersBeams = [];
    window._levPersBeams.push({
        ox: enemy.x, oy: enemy.y,
        sweepOrigin: -Math.PI,        // bắt đầu từ -180°
        sweepStart: now,
        duration: 1800,               // 1.8s quét đủ 360°
        done: false,
        ownerRef: enemy,
        hitPlayer: false,
        hitSentinels: new Map()       // Map cho cooldown per-sentinel
    });
}

// Check xem enemy Lev có beam đang active không
function _hasPersBeam(enemy) {
    if (!window._levPersBeams) return false;
    return window._levPersBeams.some(b => b.ownerRef === enemy && !b.done);
}
// Vanguard Network central damage handler
// Mọi nguồn damage vào sentinel đều đi qua đây khi network active (5+ sentinels)
// rawDmg: damage đã tính (sau multipliers), sourceTag: string unique per source instance
// targetSentinel: sentinel bị nhắm trực tiếp (nhận thêm 50% damage gốc)
function _applyVanguardDamage(rawDmg, sourceTag, isTrueDamage = false, targetSentinel = null) {
    if (!window._vanguardState || sentinels.length < 5) return;
    if (rawDmg <= 0) return;
    const vs = window._vanguardState;
    const now = performance.now();

    // Per-source AoE Dampening
    if (!vs.tagHitCount) vs.tagHitCount = {};
    if (!vs.tagHitTime) vs.tagHitTime = {};

    if (!vs.tagHitCount[sourceTag] || now - (vs.tagHitTime[sourceTag] || 0) > 200) {
        vs.tagHitCount[sourceTag] = 0;
    }
    vs.tagHitCount[sourceTag]++;
    vs.tagHitTime[sourceTag] = now;

    const hitIdx = vs.tagHitCount[sourceTag];
    let perSourceDamp = 1.0;
    if (hitIdx >= 4) perSourceDamp = 0.32;
    else if (hitIdx === 3) perSourceDamp = 0.62;

    // Multi-source AoE Dampening
    // Track unique sources hitting in last 100ms (1 frame window)
    if (!vs.frameSources) vs.frameSources = {};
    if (!vs.frameSourcesTime) vs.frameSourcesTime = now;
    // Reset frame bucket every 100ms
    if (now - vs.frameSourcesTime > 100) {
        vs.frameSources = {};
        vs.frameSourcesTime = now;
    }
    vs.frameSources[sourceTag] = true;
    const uniqueSources = Object.keys(vs.frameSources).length;
    let multiSourceDamp = 1.0;
    if (uniqueSources >= 9) multiSourceDamp = 0.52;
    else if (uniqueSources >= 7) multiSourceDamp = 0.62;
    else if (uniqueSources >= 5) multiSourceDamp = 0.72;
    else if (uniqueSources >= 3) multiSourceDamp = 0.84;

    const dampenedDmg = Math.ceil(rawDmg * perSourceDamp * multiSourceDamp);

    // Option A: 60% thẳng vào target, 40% chia đều toàn đàn
    const n = sentinels.length;
    const sharedHalf = Math.ceil(dampenedDmg * 0.4);
    const targetExtra = Math.ceil(dampenedDmg * 0.6);
    const dmgPerSentinel = Math.ceil(sharedHalf / n); // phần chia đều cho mỗi con

    sentinels.forEach(s => {
        if (s.ironBody && now < s.ironBodyEnd) return;
        const isTarget = targetSentinel !== null && s === targetSentinel;
        let totalDmg = dmgPerSentinel + (isTarget ? targetExtra : 0);

        // Gaia Barrier: 99% absorbed, 1% passes through; true damage reduced 20% first
        if ((s._gaiaBarrier || 0) > 0) {
            if (isTrueDamage) totalDmg = Math.ceil(totalDmg * 0.80);
            const _gAbsorb = Math.min(Math.ceil(totalDmg * 0.99), s._gaiaBarrier);
            s._gaiaBarrier = Math.max(0, s._gaiaBarrier - _gAbsorb);
            if (s._gaiaBarrier <= 0) {
                addExplosion(s.x, s.y, s.size * 1.2, '#00ff88');
                createParticles(s.x, s.y, 14, '#00ff88', 2, 7);
            }
            totalDmg = Math.max(1, Math.ceil(totalDmg * 0.01));
        }

        if (isTrueDamage) {
            s.hp = Math.max(0, s.hp - totalDmg);
        } else {
            const shieldAbsorb = Math.min(s.shield || 0, totalDmg);
            s.shield = Math.max(0, (s.shield || 0) - shieldAbsorb);
            const remainingDmg = totalDmg - shieldAbsorb;
            s.hp = Math.max(0, s.hp - remainingDmg);
        }
        if (s.hp <= 0) s._markedForDeath = true;
    });

    // Track cho Fuse Protocol (26% threshold)
    // BUG J fix: use rawDmg (pre-dampening) for accurate threshold detection
    vs.recentDamage = vs.recentDamage.filter(d => now - d.time < 500);
    vs.recentDamage.push({ time: now, damage: rawDmg });

    const totalRecentDmg = vs.recentDamage.reduce((a, b) => a + b.damage, 0);
    const totalNetworkMaxHp = sentinels.reduce((a, s) => a + s.maxHp, 0);
    if (totalRecentDmg > totalNetworkMaxHp * 0.26
        && !vs.fuseTriggered
        && now > (vs.fuseCooldownEnd || 0)) {
        vs.fuseTriggered = true;
        vs.fuseCooldownEnd = now + 3000;
        _triggerVanguardFuse();
    }
}

// Vanguard Fuse Protocol (Cầu Chì Hy Sinh)
function _triggerVanguardFuse() {
    const now = performance.now();
    window._vanguardState.fuseTriggered = false;

    if (sentinels.length < 2) return;

    // Tìm sentinel HP thấp nhất
    let weakestIdx = 0;
    for (let i = 1; i < sentinels.length; i++) {
        if (sentinels[i].hp < sentinels[weakestIdx].hp) weakestIdx = i;
    }
    const weakest = sentinels[weakestIdx];

    // Phát nổ, bung đạn như chết thường
    destroySentinel(weakest);
    sentinels.splice(weakestIdx, 1);

    // Iron Body 1.25s cho tất cả sentinel còn lại, hoàn toàn bất khả xâm phạm
    sentinels.forEach(s => {
        s.ironBody = true;
        s.ironBodyEnd = now + 1250;
    });

    // Visual: flash trắng mạnh
    addExplosion(weakest.x, weakest.y, 100, '#ffffff');
    addExplosion(weakest.x, weakest.y, 60, '#ffcc00');
    _setShake(12, 350);
    createParticles(weakest.x, weakest.y, 30, '#ffffff', 4, 12);

    // Reset damage window
    window._vanguardState.recentDamage = [];
}

// CORONATION (Đăng Cơ), Apostle transformation passive
// Max 3 per 5-second window, 0.67%/s above midscreen, 1%/s below
// Death bonus: mỗi apostle chết +0.67% base chance (reset khi có 1 đứa trigger)
if (!window._coronationHistory) window._coronationHistory = [];
if (window._coronationDeathBonus === undefined) window._coronationDeathBonus = 0;

function _getCoronationTransformType() {
    const _cn = performance.now();
    const _levCount  = enemies.filter(e => e.type === 'leviathan').length;
    const _veilCount = enemies.filter(e => e.type === 'veilshroud').length;
    const _egrCount  = enemies.filter(e => e.type === 'egregor').length;
    const _levCdOk   = !window._lastLeviathanKillTime || (_cn - window._lastLeviathanKillTime) >= 8000;
    const _egrCdOk   = !window._lastEgregorKillTime   || (_cn - window._lastEgregorKillTime)   >= 6000;
    const pool = ['marchosias', 'thaelis', 'dargruel'];
    if (_veilCount < 2 && _egrCount === 0) pool.push('veilshroud');
    if (_levCdOk && _levCount < 1) pool.push('leviathan');
    if (_egrCdOk && _egrCount < 1 && _veilCount === 0) pool.push('egregor');
    return pool[Math.floor(Math.random() * pool.length)];
}

function _spawnCoronationResult(enemy) {
    const type = _getCoronationTransformType();
    if (type === 'marchosias') spawnMarchosias();
    else if (type === 'veilshroud') spawnVeilshroud();
    else if (type === 'thaelis') spawnThaelis();
    else if (type === 'leviathan') spawnLeviathan();
    else if (type === 'egregor') spawnEgregor();
    else spawnDargruel();

    // Place the new enemy at the apostle's position
    const spawned = enemies[enemies.length - 1];
    if (spawned) {
        spawned.x = enemy.x;
        spawned.y = enemy.y;
        spawned.ironBodyHits = 1; // Coronation perk: blocks exactly 1 hit
    }
    // If Coronation produced a Leviathan, ensure enough killable enemies exist for its AFO quota
    if (type === 'leviathan' && spawned) _ensureLeviathanQuota(spawned);
}

// GOLIATH — Digiform prototype boss, tầng giữa Dominator và
// Administrator (class tương lai). Spec đầy đủ: xem design doc đã duyệt.
// PHẦN NÀY (đợt code đầu): Alpha phase, Circuit Link, Corrupted Genesis,
// Transition, True Form spawn-in + Inevitable (DR + damage window). CÒN
// THIẾU (đợt sau): Fracture Step teleport thật, Absolute Verdict damage
// thật, Warding Palm block, Threshold Ward shield-mốc, hệ Joker 7 kỹ năng
// copy — field trạng thái đã khai báo sẵn bên dưới nhưng chưa có logic kích
// hoạt thật, để tránh code nửa vời gây lỗi khi test.
function spawnGoliath() {
    const alphaSize = 125; // ngang Thaelis (100-150), không phải khối khổng lồ
    const g = {
        x: canvas.width / 2, y: -alphaSize,
        size: alphaSize, speed: 0,
        hp: 1, maxHp: 1,
        type: 'goliath',
        shield: 0,
        // Mượn cờ inCoronation có sẵn (dùng ~20 chỗ khắp code để đánh dấu
        // "không thể chọn làm mục tiêu") — Alpha/Transforming phải HOÀN TOÀN
        // vô hình với Sentinel/skill/tinh linh auto-target, không chỉ bất tử.
        inCoronation: true,
        phase: 'alpha', // 'alpha' | 'transforming' | 'true_form'
        _restX: canvas.width / 2,
        _restY: canvas.height * 0.14,
        _appearTimer: 0,
        slots: [{ filled: false, gem: null }, { filled: false, gem: null }, { filled: false, gem: null }],
        // Circuit Link: sổ ghi thiệt hại nhận được trong lúc còn bị liên kết,
        // theo từng enemy (Map enemy -> tổng dmg), cộng dồn thành damagePull
        // khi enemy đó chết trong lúc vẫn còn liên kết.
        _linkedLedger: new Map(),
        _pendingGems: [],
        _flyingGems: [], // {x,y,gem,t,dur} — bảo thạch đang bay từ chỗ enemy chết vào khe
        damagePull: 0,
        gemPoints: 0,
        transformTimer: 0,
        // True Form (rỗng cho tới khi biến hình xong)
        trueFormReady: false,
        _inevitableWindowEnd: 0,
        _inevitableCooldownEnd: 0,
        _weaveSeed: Math.random() * 1000,
        _weaveClock: 0,
        _wasCasting: false,
        // Fracture Step: dịch chuyển khi có mối đe doạ trong 100px, +1 lớp
        // Iron Body (hấp thụ 3 đòn) mỗi lần, cooldown riêng cho bản thân skill
        _fractureStepCooldownEnd: 0,
        _fractureIronBodyHits: 0,
        _fractureTeleportPhase: 'idle',
        // Absolute Verdict: kênh 3s rồi phóng quả cầu xuyên phá
        _verdictPhase: 'ready', // 'ready' | 'channeling' | 'cooldown'
        _verdictChannelTimer: 0,
        _verdictCooldownEnd: 0,
        _verdictLocked: false,
        _verdictLockX: 0, _verdictLockY: 0,
        // Warding Palm: chặn phản ứng (không có "phase" — check ngay trong dealDamage)
        // Corrupted Meteor (NEW): hút 1 Apostle bất kỳ, nén thành lõi thiên
        // thạch trong tay rồi ném về phía người chơi. CD 5s.
        _meteorPhase: 'ready', // 'ready' | 'charging'
        _meteorChargeTimer: 0,
        _meteorCooldownEnd: 0,
        _meteorTargetApostle: null,
        // Threshold Ward: mốc HP đã kích hoạt + kho khiên tích luỹ
        _thresholdMilestonesHit: { 75: false, 50: false, 25: false },
        _thresholdShieldPool: 0,
        _meteors: [],
        _fusedCount: 0,
        _armFused: { left: 0, right: 0 },
        _limbPopFired: false,
        // Joker: 3 kỹ năng copy chạy ĐỘC LẬP, không chia sẻ cooldown với nhau
        // hay với Fracture Step/Absolute Verdict/Warding Palm/Threshold Ward.
        // Điền khi vào True Form, dựa vào 3 bảo thạch thực tế đã hấp thụ.
        _jokerState: {},
    };
    enemies.push(g);
    _goliathCircuitLink(g);

    // Passive mới của Alpha: khi triệu hồi, ceil(1/3) số kẻ địch HIỆN CÓ
    // trong wave (làm tròn lên) bị loại khỏi wave ngay lập tức, số còn lại
    // được +15% MaxHP. Ví dụ: 23 kẻ địch -> 23/3=7.67 -> ceil 8 con bị loại,
    // còn lại 15 con, cả 15 con đó được +15% MaxHP.
    const _waveEnemies = enemies.filter(e => e !== g && e.type !== 'goliath' && !(e.type && e.type.startsWith('enemy_bullet')));
    const _cullCount = Math.ceil(_waveEnemies.length / 3);
    const _shuffledWave = _shuffleArray(_waveEnemies);
    _shuffledWave.forEach((e, idx) => {
        if (idx < _cullCount) {
            e.hp = 0;
            e._markedForDeath = true;
            // Hiệu ứng "bị xoá sổ" bởi Goliath — nổ cam đậm + hạt văng, tách
            // biệt với hiệu ứng chết thường của từng loại enemy.
            addExplosion(e.x, e.y, e.size * 1.2 || 60, '#f59e0b');
            createParticles(e.x, e.y, 20, '#f59e0b', 3, 9);
        } else {
            e.maxHp = Math.ceil(e.maxHp * 1.15);
            e.hp = Math.ceil(e.hp * 1.15);
        }
    });
}

// Circuit Link (passive): liên kết tới TẤT CẢ enemy đang có trên màn hình
// tại thời điểm spawn — +20% DR cho Goliath (áp trong dealDamage), và mỗi
// enemy bị liên kết được gắn tham chiếu ngược để dealDamage() có thể ghi sổ
// thiệt hại nó nhận vào _linkedLedger của Goliath.
function _goliathCircuitLink(g) {
    enemies.forEach(e => {
        if (e === g || e.type === 'goliath') return;
        if (e.type && e.type.startsWith('enemy_bullet')) return;
        e._goliathLinkedTo = g;
        g._linkedLedger.set(e, 0);
    });
}

function updateGoliath(enemy, deltaTime) {
    const now = performance.now();
    if (enemy.phase === 'alpha') {
        // Circuit Link KHÔNG được chỉ chụp 1 lần lúc spawn — enemy sinh ra
        // SAU Goliath (trường hợp bình thường: bấm nút debug Goliath rồi mới
        // bấm nút boss khác, hoặc quái tới theo wave sau khi Goliath đã xuất
        // hiện) sẽ không bao giờ được liên kết, khiến Corrupted Genesis/Damage
        // Pull không bao giờ có gì để ăn. Quét lại liên tục suốt pha Alpha —
        // hàm này chỉ gắn cờ cho enemy CHƯA có _goliathLinkedTo nên gọi lại
        // nhiều lần vô hại.
        _goliathCircuitLink(enemy);

        // Trồi lên từ mép trên rồi dừng hẳn (speed=0 — Alpha không di chuyển
        // liên tục như quái thường, chỉ có 1 lần ease-in lúc xuất hiện)
        enemy._appearTimer += deltaTime;
        const p = Math.min(1, enemy._appearTimer / 1500);
        const ease = 1 - Math.pow(1 - p, 3);
        enemy.y = -enemy.size + (enemy._restY - (-enemy.size)) * ease;

        // Bảo thạch đang bay từ chỗ enemy vừa chết vào khe (main.js death-hook
        // chỉ tạo hiệu ứng rớt + object bay, chưa đưa thẳng vào _pendingGems)
        for (let i = (enemy._flyingGems || []).length - 1; i >= 0; i--) {
            const fg = enemy._flyingGems[i];
            fg.t += (deltaTime / 1000) / fg.dur;
            if (fg.t >= 1) {
                enemy._pendingGems.push(fg.gem);
                enemy._flyingGems.splice(i, 1);
                // Dư chấn nhẹ khi bảo thạch va vào thân — rung thân Alpha
                // một chút (không phải screen shake toàn màn hình).
                enemy._gemImpactShakeEnd = now + 260;
            }
        }

        // Corrupted Genesis: quét các enemy Abnormal-tier trở lên đã chết
        // trong danh sách liên kết, thu bảo thạch màu tương ứng nguồn gốc.
        // (Việc rơi bảo thạch + tính damagePull thực hiện trong dealDamage
        // và death-hook ở main.js — hàm này chỉ lo việc HẤP THỤ khi đủ 3+.)
        if ((enemy._pendingGems || []).length >= 3 && enemy.slots.some(s => !s.filled)) {
            const used = new Set(enemy.slots.filter(s => s.filled).map(s => s.gem.name));
            for (let i = 0; i < enemy._pendingGems.length && enemy.slots.some(s => !s.filled); i++) {
                const gem = enemy._pendingGems[i];
                if (used.has(gem.name)) continue;
                const slot = enemy.slots.find(s => !s.filled);
                slot.filled = true; slot.gem = gem;
                used.add(gem.name);
                enemy._pendingGems.splice(i, 1); i--;
            }
        }
        if (enemy.slots.every(s => s.filled) && enemy.phase === 'alpha') {
            _goliathBeginTransform(enemy);
        }
    } else if (enemy.phase === 'transforming') {
        const tBefore = enemy.transformTimer / 1000;
        enemy.transformTimer += deltaTime;
        const tAfter = enemy.transformTimer / 1000;
        // Theo dõi thiên thạch đáp xuống (chỉ trong pha Summon, 0-2.2s) để
        // render file biết khối nóng chảy thân/vai phồng to tới đâu.
        if (tAfter < 2.2) {
            enemy._meteors.forEach(m => {
                if (!m.arrived && tAfter >= m.arriveAt * 2.2) {
                    m.arrived = true;
                    if (m.target === 'body') enemy._fusedCount++;
                    else enemy._armFused[m.target]++;
                }
            });
        }
        if (enemy.transformTimer >= 4000) _goliathEnterTrueForm(enemy);
    } else if (enemy.phase === 'true_form') {
        // Lượn qua lượn lại kiểu boss Touhou — CHẬM, êm, uy nghiêm (không phải
        // rung giật nhiều tần số như trước). Tâm dao động bám theo vị trí đã
        // ổn định gần nhất (_restX/_restY, cập nhật khi Fracture Step dịch
        // chuyển) chứ không nhảy về giữa màn hình, và ưu tiên vùng gần viền
        // trên. Đứng yên hoàn toàn khi Phantom (Veilshroud-copy) đang kích
        // hoạt — Phantom thật của Veilshroud cũng đứng im lúc vô hiệu hoá.
        // Hạn chế mới: đang vận bất kỳ skill nào (của chính Goliath hay Joker
        // copy) thì chậm 35% (weave clock chạy chậm hơn thay vì đứng hẳn) +
        // cấm Fracture Step (dịch chuyển) + hồi 15% MaxHP 1 LẦN DUY NHẤT lúc
        // vừa bắt đầu vận (bắt cạnh lên false->true, không phải mỗi frame).
        const isCasting = _goliathIsCasting(enemy);
        enemy._weaveClock = (enemy._weaveClock || 0) + deltaTime * (isCasting ? 0.65 : 1);
        if (isCasting && !enemy._wasCasting) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.15);
        }
        enemy._wasCasting = isCasting;

        const veilJoker = enemy._jokerState['Veilshroud'];
        const inPhantomCopy = veilJoker && veilJoker.phantomEnd && now < veilJoker.phantomEnd;
        // Đứng yên khi Phantom HOẶC đang giữa chuỗi dịch chuyển Fracture Step
        // (đóng/mở vòng pháp trận) — không để weave đè lên vị trí đã khoá.
        const inFractureTransition = enemy._fractureTeleportPhase === 'closing' || enemy._fractureTeleportPhase === 'opening';
        if (!inPhantomCopy && !inFractureTransition) {
            const t = enemy._weaveClock / 1000 + enemy._weaveSeed;
            const ampX = canvas.width * 0.28, ampY = canvas.height * 0.10;
            const centerX = enemy._restX != null ? enemy._restX : canvas.width / 2;
            const centerY = Math.min(enemy._restY, canvas.height * 0.30);
            // Giảm 35% tốc độ bay (chu kỳ dài hơn 1/0.65 lần — 9 -> 13.85, 6.5 -> 10)
            const targetX = centerX + Math.sin(t * Math.PI * 2 / 13.85) * ampX;
            const targetY = centerY + Math.sin(t * Math.PI * 2 / 10 + 1.2) * ampY;
            // Blend mượt ~1.2s vào công thức weave thay vì áp dụng ngay — tránh
            // vị trí NHẢY đột ngột (ăn theo weaveSeed ngẫu nhiên) ngay lúc vừa
            // vào True Form hoặc vừa dịch chuyển xong (2 chỗ set _weaveEnterAt).
            if (enemy._weaveEnterAt && now - enemy._weaveEnterAt < 1200) {
                const bp = Math.min(1, (now - enemy._weaveEnterAt) / 1200);
                const ease = bp * bp * (3 - 2 * bp); // smoothstep
                enemy.x = enemy._weaveEnterX + (targetX - enemy._weaveEnterX) * ease;
                enemy.y = enemy._weaveEnterY + (targetY - enemy._weaveEnterY) * ease;
            } else {
                enemy.x = targetX; enemy.y = targetY;
            }
        }

        // Fracture Step: dịch chuyển CHẬM RÕ RÀNG qua 2 giai đoạn — vòng pháp
        // trận đóng lại tại vị trí cũ (400ms), rồi mở ra tại vị trí mới
        // (400ms) — không còn dịch chuyển tức thời như trước.
        if (!enemy._fractureTeleportPhase || enemy._fractureTeleportPhase === 'idle') {
            if (!isCasting && now >= enemy._fractureStepCooldownEnd) {
                const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                let threatNear = distToPlayer < 100;
                if (!threatNear && typeof bullets !== 'undefined') {
                    threatNear = bullets.some(b => Math.hypot(b.x - enemy.x, b.y - enemy.y) < 100);
                }
                if (threatNear || !enemy._lastFractureAt || now - enemy._lastFractureAt >= 2000) {
                    enemy._lastFractureAt = now;
                    enemy._fractureStepCooldownEnd = now + 3000;
                    enemy._fractureTeleportPhase = 'closing';
                    enemy._fractureTeleportStart = now;
                    enemy._fractureFromX = enemy.x; enemy._fractureFromY = enemy.y;
                    enemy._fractureToX = 150 + Math.random() * (canvas.width - 300);
                    enemy._fractureToY = canvas.height * 0.18 + Math.random() * (canvas.height * 0.35);
                }
            }
        } else if (enemy._fractureTeleportPhase === 'closing') {
            if (now - enemy._fractureTeleportStart >= 400) {
                addExplosion(enemy._fractureFromX, enemy._fractureFromY, enemy.size * 0.7, '#f59e0b');
                createParticles(enemy._fractureFromX, enemy._fractureFromY, 18, '#f59e0b', 3, 9);
                enemy.x = enemy._fractureToX; enemy.y = enemy._fractureToY;
                enemy._restX = enemy.x; enemy._restY = enemy.y;
                enemy._fractureIronBodyHits = Math.min(3, enemy._fractureIronBodyHits + 3);
                enemy._fractureTeleportPhase = 'opening';
                enemy._fractureTeleportStart = now;
                addExplosion(enemy.x, enemy.y, enemy.size * 0.9, '#fff8e1');
                createParticles(enemy.x, enemy.y, 24, '#fff8e1', 4, 10);
                enemy._fractureTeleportFlashEnd = now + 700;
            }
        } else if (enemy._fractureTeleportPhase === 'opening') {
            if (now - enemy._fractureTeleportStart >= 400) {
                enemy._fractureTeleportPhase = 'idle';
                // Weave chỉ resume SAU khi cổng đã mở xong — neo lại đúng vị
                // trí vừa dịch chuyển tới rồi blend mượt vào công thức weave,
                // tránh giật ngay lúc weave bắt đầu chạy lại.
                enemy._weaveEnterX = enemy.x;
                enemy._weaveEnterY = enemy.y;
                enemy._weaveEnterAt = now;
            }
        }

        // Absolute Verdict: kênh 3s rồi phóng quả cầu xuyên phá (35% MaxHP
        // true damage vào Sentinel, -5 mạng người chơi nếu trúng)
        if (enemy._verdictPhase === 'ready' && now >= enemy._verdictCooldownEnd) {
            enemy._verdictPhase = 'channeling';
            enemy._verdictChannelTimer = 0;
            enemy._verdictLocked = false;
        } else if (enemy._verdictPhase === 'channeling') {
            enemy._verdictChannelTimer += deltaTime;
            // Chỉ TRACK vị trí người chơi tới trước lúc bắn 500ms — sau mốc đó
            // khoá cứng vị trí ngắm, không dí theo nữa, cho người chơi 1
            // khoảng thời gian rõ ràng để né trước khi quả cầu thật sự phóng.
            if (!enemy._verdictLocked && enemy._verdictChannelTimer >= 2500) {
                enemy._verdictLocked = true;
                enemy._verdictLockX = player.x; enemy._verdictLockY = player.y;
            }
            if (enemy._verdictChannelTimer >= 3000) {
                enemy._verdictPhase = 'ready';
                enemy._verdictCooldownEnd = now + 8000;
                // Phóng ra từ MẮT (không phải tâm thân), theo đúng hướng đã
                // khoá lúc 2500ms — không dùng vị trí tại đúng thời điểm bắn.
                const _eye = _goliathEyeWorldPos(enemy);
                const vAngle = Math.atan2(enemy._verdictLockY - _eye.y, enemy._verdictLockX - _eye.x);
                window._goliathOrbs = window._goliathOrbs || [];
                window._goliathOrbs.push({
                    x: _eye.x, y: _eye.y, vx: Math.cos(vAngle) * 420, vy: Math.sin(vAngle) * 420,
                    dmg: enemy.maxHp * 0.35, owner: enemy, life: 4000,
                });
            }
        }

        // Corrupted Meteor: hút 1 Apostle bất kỳ, nén thành lõi thiên thạch
        // trong tay (phải, cùng bên với fist 'spikes'), quăng về phía người
        // chơi đang đứng lúc bắt đầu quăng. CD 5s, không tự tính là "vận
        // skill" chậm 35% cho gọn (đã có CD ngắn riêng), nhưng vẫn khoá
        // Fracture Step qua _goliathIsCasting như mọi skill khác.
        if (enemy._meteorPhase === 'ready' && now >= enemy._meteorCooldownEnd) {
            const apostles = enemies.filter(e => e !== enemy && e.type === 'apostle' && e.hp > 0);
            if (apostles.length > 0) {
                enemy._meteorTargetApostle = apostles[Math.floor(Math.random() * apostles.length)];
                enemy._meteorPhase = 'charging';
                enemy._meteorChargeTimer = 0;
            }
        } else if (enemy._meteorPhase === 'charging') {
            enemy._meteorChargeTimer += deltaTime;
            const apostleGone = !enemy._meteorTargetApostle || enemy._meteorTargetApostle.hp <= 0;
            if (enemy._meteorChargeTimer >= 800 || apostleGone) {
                if (!apostleGone) {
                    // Tiêu thụ Apostle — biến hẳn thành thiên thạch, không rớt
                    // điểm/gem như chết thường (Corrupted Genesis xử lý riêng
                    // ở death-hook main.js dựa vào _goliathLinkedTo, con này
                    // bị xoá thẳng nên không kích hoạt đường đó).
                    const ax = enemy._meteorTargetApostle.x, ay = enemy._meteorTargetApostle.y;
                    enemy._meteorTargetApostle.hp = 0;
                    enemy._meteorTargetApostle._markedForDeath = true;
                    enemy._meteorTargetApostle._noDrop = true;
                    addExplosion(ax, ay, 40, '#f59e0b');
                    const _eye = _goliathEyeWorldPos(enemy);
                    const ang = Math.atan2(player.y - _eye.y, player.x - _eye.x);
                    window._goliathMeteors = window._goliathMeteors || [];
                    window._goliathMeteors.push({
                        x: _eye.x, y: _eye.y, vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400,
                        owner: enemy, life: 4000, _fireTime: now,
                    });
                }
                enemy._meteorPhase = 'ready';
                enemy._meteorCooldownEnd = now + 5000;
                enemy._meteorTargetApostle = null;
            }
        }

        _goliathUpdateJoker(enemy, deltaTime, now);

        // Threshold Ward: mốc HP 75/50/25% mỗi mốc cho +15% MaxHP khiên 1 lần
        const hpPct = enemy.hp / enemy.maxHp;
        [75, 50, 25].forEach(mile => {
            if (!enemy._thresholdMilestonesHit[mile] && hpPct * 100 <= mile) {
                enemy._thresholdMilestonesHit[mile] = true;
                enemy._thresholdShieldPool += enemy.maxHp * 0.15;
            }
        });
        // Khiên tích luỹ vượt mốc 25/50/75/100% MaxHp → hồi máu tương ứng
        [1.0, 0.75, 0.5, 0.25].forEach(frac => {
            if (enemy._thresholdShieldPool >= enemy.maxHp * frac && enemy.hp < enemy.maxHp * frac) {
                enemy.hp = Math.max(enemy.hp, enemy.maxHp * frac);
            }
        });

        // Inevitable: hồi máu 2%/s + hồi hiệu quả 35% từ heal/shield khác
        // (phần "+35%" áp dụng ở nơi heal/shield được cấp cho enemy, chưa
        // nối — chỉ hồi máu chủ động ở đây)
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.02 * (deltaTime / 1000));

        if (enemy._inevitableWindowEnd && now >= enemy._inevitableWindowEnd && !enemy._inevitableCooldownEnd) {
            enemy._inevitableCooldownEnd = now + 2000;
            enemy._inevitableWindowEnd = 0;
        }
        if (enemy._inevitableCooldownEnd && now >= enemy._inevitableCooldownEnd) {
            enemy._inevitableCooldownEnd = 0;
        }
    }
}

// Sinh thiên thạch bay từ mọi mép màn hình vào — đa số hội tụ về THÂN (đến
// sớm), số còn lại lệch hướng bay tới 2 khớp vai (đến muộn hơn), y hệt
// prototype test-goliath.html đã duyệt.
function _goliathSpawnMeteors(enemy) {
    function edgePt() {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) return { x: Math.random() * canvas.width, y: -80 };
        if (edge === 1) return { x: canvas.width + 80, y: Math.random() * canvas.height };
        if (edge === 2) return { x: Math.random() * canvas.width, y: canvas.height + 80 };
        return { x: -80, y: Math.random() * canvas.height };
    }
    enemy._meteors = [];
    const BODY_COUNT = 5;
    for (let i = 0; i < BODY_COUNT; i++) {
        const from = edgePt();
        enemy._meteors.push({
            fromX: from.x, fromY: from.y, target: 'body',
            toX: enemy.x + (Math.random() - 0.5) * 60, toY: enemy.y + (Math.random() - 0.5) * 60,
            arriveAt: 0.1 + (i / BODY_COUNT) * 0.55,
            size: 16 + Math.random() * 16, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 6,
            arrived: false,
        });
    }
    const LIMB_COUNT = 3;
    ['left', 'right'].forEach(side => {
        const joint = GOLIATH_LIMB_JOINT[side];
        for (let i = 0; i < LIMB_COUNT; i++) {
            const from = edgePt();
            enemy._meteors.push({
                fromX: from.x, fromY: from.y, target: side,
                toX: enemy.x + joint.x + (Math.random() - 0.5) * 24, toY: enemy.y + joint.y + (Math.random() - 0.5) * 24,
                arriveAt: 0.6 + (i / LIMB_COUNT) * 0.4,
                size: 12 + Math.random() * 10, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 6,
                arrived: false,
            });
        }
    });
    enemy._fusedCount = 0;
    enemy._armFused = { left: 0, right: 0 };
    enemy._limbPopFired = false;
}

function _goliathBeginTransform(enemy) {
    enemy.phase = 'transforming';
    enemy.transformTimer = 0;
    _goliathSpawnMeteors(enemy);
}

// Kích thước True Form ngang Leviathan (250-300), không phải khối khổng lồ
// 460 như bản trước — hình học GOLIATH_TRUE_FORM_OUTLINE tự co giãn theo
// enemy.size / GOLIATH_TRUE_FORM_REF_SIZE ở render file.
function _goliathEnterTrueForm(enemy) {
    enemy.phase = 'true_form';
    enemy.inCoronation = false; // giờ mới có thể bị nhắm mục tiêu
    enemy.size = 260; // giảm ~7% so với 280 theo yêu cầu
    const pulledCapped = Math.min(200000, enemy.damagePull);
    const maxHp = Math.max(50000, Math.round(pulledCapped * (1 + 0.15 * enemy.gemPoints)));
    enemy.hp = maxHp; enemy.maxHp = maxHp;
    enemy.trueFormReady = true;

    // QUAN TRỌNG: chuyển cảnh mượt lúc biến hình vừa xong — công thức weave
    // dùng sin(t + weaveSeed) với weaveSeed NGẪU NHIÊN từ lúc spawn, nên nếu
    // dùng thẳng công thức ngay từ frame đầu tiên của True Form, vị trí sẽ
    // NHẢY đột ngột (offset ±ampX/±ampY ngay lập tức) khỏi chỗ Settle vừa để
    // thân lại — đúng hiện tượng "giật khi chuyển cảnh cuối biến hình". Neo
    // lại vị trí hiện tại rồi cho weave-update blend mượt vào công thức thật
    // trong ~1.2s thay vì áp dụng ngay.
    enemy._weaveEnterX = enemy.x;
    enemy._weaveEnterY = enemy.y;
    enemy._weaveEnterAt = performance.now();

    // Joker: khởi tạo trạng thái cho ĐÚNG 3 kỹ năng ứng với 3 bảo thạch đã
    // hấp thụ (không phải cả 7) — mỗi kỹ năng có timer/cooldown riêng.
    enemy.slots.forEach(slot => {
        if (!slot.filled || !slot.gem) return;
        const name = slot.gem.name;
        if (enemy._jokerState[name]) return; // phòng khi 2 khe cùng tên (không nên xảy ra)
        if (name === 'Veilshroud') enemy._jokerState[name] = { phase: 'ready', cooldownEnd: 0, phantomEnd: 0, targets: [], lightningPending: false, lightningCountdown: 0 };
        else if (name === 'Thaelis') enemy._jokerState[name] = { active: true }; // passive dai dẳng, không cooldown
        else if (name === 'Aegis Core') enemy._jokerState[name] = { nextFireAt: performance.now() + 4000, originX: 0, originY: 0 };
        else if (name === 'Marchosias') enemy._jokerState[name] = { barrierAngle: 0, nextSwordAt: performance.now() + 1500, telegraphing: false, originX: 0, originY: 0 };
        else if (name === 'Egregor') enemy._jokerState[name] = { phase: 'ready', cooldownEnd: 0, targets: [], telegraphTimer: 0, originX: 0, originY: 0 };
        else if (name === 'Dargruel') enemy._jokerState[name] = { nextFireAt: performance.now() }; // bắn ngay lần đầu
        else if (name === 'Leviathan') enemy._jokerState[name] = { phase: 'ready', cooldownEnd: 0, warnTimer: 0, sweepTimer: 0, sweepOrigin: 0 };
    });
}

// Joker: chạy đúng 3 kỹ năng ứng với 3 bảo thạch đã hấp thụ, mỗi kỹ năng
// hoàn toàn độc lập (cooldown/timer riêng, không dùng chung với nhau hay với
// Fracture Step/Absolute Verdict/Warding Palm/Threshold Ward).
// Mọi điểm PHÁT của attack/scale phải tính từ MẮT (GOLIATH_EYE_POS, đã có
// sẵn ở render/enemy-goliath.js — cùng global scope classic-script) chứ
// không phải tâm thân enemy.x/y, kể cả khi thân đang bay lượn khắp màn hình.
function _goliathEyeWorldPos(enemy) {
    const trueScale = enemy.size / 460;
    return { x: enemy.x + GOLIATH_EYE_POS.x * trueScale, y: enemy.y + GOLIATH_EYE_POS.y * trueScale };
}

// Đang "vận" 1 kỹ năng bất kỳ (của chính Goliath hoặc bất kỳ bản copy Joker
// nào) — dùng cho hạn chế mới: chậm 35% + cấm Fracture Step (dịch chuyển) +
// hồi 15% MaxHP (1 lần lúc bắt đầu vận) + thêm 10% DR trong lúc vận.
function _goliathIsCasting(enemy) {
    if (enemy._verdictPhase === 'channeling') return true;
    if (enemy._meteorPhase === 'charging') return true;
    const js = enemy._jokerState;
    if (js['Aegis Core'] && (js['Aegis Core'].telegraphing || js['Aegis Core'].firing)) return true;
    if (js['Marchosias'] && js['Marchosias'].telegraphing) return true;
    if (js['Egregor'] && (js['Egregor'].phase === 'telegraphing' || js['Egregor'].phase === 'striking')) return true;
    if (js['Veilshroud']) {
        const s = js['Veilshroud'];
        const now = performance.now();
        if ((s.phantomEnd && now < s.phantomEnd) || s.lightningPending) return true;
    }
    return false;
}

function _goliathUpdateJoker(enemy, deltaTime, now) {
    const js = enemy._jokerState;

    if (js['Veilshroud']) {
        const s = js['Veilshroud'];
        if (s.phantomEnd && now < s.phantomEnd) {
            // đang Phantom — DR áp trong combinedDR bên dưới
        } else if (s.phantomEnd && now >= s.phantomEnd) {
            // vừa thoát Phantom: CHỐT vị trí + vào pending 1500ms (đúng
            // lightningCountdownDuration thật của Veilshroud — trước đây bắn
            // sét ngay không hề có cảnh báo dưới chân mục tiêu trước).
            s.phantomEnd = 0;
            const targets = [player, ...sentinels.slice(0, 3)];
            s.targets = targets.map(t => ({ x: t.x, y: t.y, ref: t, isPlayer: t === player }));
            s.lightningPending = true;
            s.lightningCountdown = 0;
        } else if (s.lightningPending) {
            s.lightningCountdown += deltaTime;
            if (s.lightningCountdown >= 1500) {
                s.lightningPending = false;
                s.lightningEnd = now + 400;
                // Đúng thật (_veilshroudStrike): sét đánh vào TOẠ ĐỘ đã chốt,
                // nhưng chỉ thực sự gây damage nếu mục tiêu CÒN Ở ĐÓ lúc sét
                // rơi (né ra khỏi vùng cảnh báo là tránh được) — trước đây gây
                // damage vô điều kiện dù đã né khỏi vùng.
                s.targets.forEach(t => {
                    if (t.isPlayer) {
                        // playerTakesHit() (không phải loseLife() thẳng) để tôn trọng
                        // Yog-Sothoth Domain, Dream Realm né, khiên Skill A, v.v. —
                        // loseLife() thẳng bỏ qua toàn bộ các lớp bảo vệ đó.
                        if (Math.hypot(player.x - t.x, player.y - t.y) < (player.hitRadius || 15) + 30) playerTakesHit();
                    } else if (t.ref.hp > 0 && Math.hypot(t.ref.x - t.x, t.ref.y - t.y) < (t.ref.size || 20) + 30) {
                        dealDamage(t.ref, { damage: enemy.maxHp * 0.05, isTrueDamage: true });
                    }
                    addExplosion(t.x, t.y, 60, '#ff9a2e');
                });
                s.cooldownEnd = now + 3000;
            }
        } else if (now >= (s.cooldownEnd || 0) && Math.random() < (deltaTime / 450) * 0.5) {
            s.phantomEnd = now + 3000;
        }
    }
    // Thaelis: passive thuần, DR áp trong combinedDR — không cần cập nhật gì ở đây

    if (js['Aegis Core']) {
        // Đúng cơ chế Lumen Nova THẬT (fx.js drawAegisLasers): trước tiên MARK
        // mục tiêu + báo trước bằng 1 đường thẳng mờ TẠI VỊ TRÍ ĐÃ CHỐT (chỉ
        // track 1 lần lúc mark, không đuổi theo sau đó), rồi mới bắn dọc đúng
        // đường đó — KHÔNG PHẢI 1 chùm tia xoay tròn như bản trước (xoay vậy
        // không cách nào né được).
        const s = js['Aegis Core'];
        if (!s.telegraphing && !s.firing && now >= s.nextFireAt) {
            s.telegraphing = true;
            s.telegraphEnd = now + 1000;
            s.targets = [{ x: player.x, y: player.y, isPlayer: true }, ...sentinels.map(sen => ({ x: sen.x, y: sen.y, ref: sen }))];
            // Chốt luôn điểm PHÁT (không chỉ điểm ĐÍCH) — Goliath giờ luôn di
            // chuyển nên nếu cứ tính hướng từ vị trí HIỆN TẠI mỗi frame, đường
            // ngắm sẽ trông như đang dí theo dù mục tiêu đã chốt (đúng ra chỉ
            // track/chốt 1 lần lúc mark, y hệt Aegis Core thật đứng yên bắn).
            const _eye = _goliathEyeWorldPos(enemy);
            s.originX = _eye.x; s.originY = _eye.y;
        } else if (s.telegraphing && now >= s.telegraphEnd) {
            s.telegraphing = false; s.firing = true; s.fireEnd = now + 200;
            // Đúng thật (main.js aegisLasers: distToSegment check tại thời
            // điểm bắn) — chỉ trúng nếu người chơi/Sentinel CÒN Ở TRÊN đường
            // thẳng lúc bắn, không phải trúng vô điều kiện mọi mục tiêu đã
            // chốt (trước đây né ra khỏi đường vẫn dính do không hề check).
            const fullLen = Math.hypot(canvas.width, canvas.height);
            s.targets.forEach(t => {
                const ang = Math.atan2(t.y - s.originY, t.x - s.originX);
                const lineEnd = { x: s.originX + Math.cos(ang) * fullLen, y: s.originY + Math.sin(ang) * fullLen };
                const lineStart = { x: s.originX, y: s.originY };
                if (t.isPlayer) {
                    if (distToSegment(player, lineStart, lineEnd) < (player.hitRadius || 15) + 15) playerTakesHit();
                } else if (t.ref && t.ref.hp > 0 && distToSegment(t.ref, lineStart, lineEnd) < (t.ref.size || 20) + 15) {
                    dealDamage(t.ref, { damage: enemy.maxHp * 0.25, isTrueDamage: true });
                }
                addExplosion(t.x, t.y, 60, '#fff8e1');
            });
        } else if (s.firing && now >= s.fireEnd) {
            s.firing = false; s.nextFireAt = now + 4000;
        }
    }

    if (js['Marchosias']) {
        const s = js['Marchosias'];
        s.barrierAngle = (s.barrierAngle + deltaTime * 0.0008) % (Math.PI * 2);
        // Thêm hành lang cảnh báo trước khi phóng Sword (đúng windup thật của
        // Marchosias — _drawMarchoBlade warning phase), và Sword to bằng
        // đúng kích thước sword thật (radius 88, tốc độ 13.2px/frame~60fps).
        if (!s.telegraphing && now >= s.nextSwordAt) {
            s.telegraphing = true;
            s.telegraphEnd = now + 500;
            // Chốt điểm phát ngay lúc mark, LẤY TỪ MẮT (không phải tâm thân)
            // — Goliath vẫn di chuyển suốt lúc báo trước 500ms, Sword phải
            // bay ra từ ĐÚNG điểm hành lang cảnh báo đã vẽ.
            const _eye = _goliathEyeWorldPos(enemy);
            s.originX = _eye.x; s.originY = _eye.y;
            s.aimAngle = Math.atan2(player.y - s.originY, player.x - s.originX);
        } else if (s.telegraphing && now >= s.telegraphEnd) {
            s.telegraphing = false;
            s.nextSwordAt = now + 1500;
            const ang = s.aimAngle;
            window._goliathSwords = window._goliathSwords || [];
            window._goliathSwords.push({
                x: s.originX, y: s.originY, vx: Math.cos(ang) * 792, vy: Math.sin(ang) * 792,
                radius: 88, dmg: enemy.maxHp * 0.08, life: 2000,
                originX: s.originX, originY: s.originY, _fireTime: now,
            });
        }
    }

    if (js['Egregor']) {
        // Đúng cơ chế Psychic Tempest thật (_updateEgregorTempest): KHÔNG phải
        // quét cung 180° — chốt tối đa 3 mục tiêu (người chơi + Sentinel) tại
        // vị trí hiện tại, báo trước 1200ms, rồi giáng tia sét vào ĐÚNG các vị
        // trí đã chốt đó (bán kính 100, không track theo mục tiêu di chuyển).
        const s = js['Egregor'];
        if (s.phase === 'ready' && now >= (s.cooldownEnd || 0)) {
            const pool = [player, ...sentinels].sort(() => Math.random() - 0.5);
            const count = Math.min(3, pool.length);
            s.targets = pool.slice(0, count).map(t => ({ ref: t, tx: t.x, ty: t.y, isPlayer: t === player }));
            if (s.targets.length > 0) {
                s.phase = 'telegraphing'; s.telegraphTimer = 0;
                const _eye = _goliathEyeWorldPos(enemy);
                s.originX = _eye.x; s.originY = _eye.y;
            }
        } else if (s.phase === 'telegraphing') {
            s.telegraphTimer += deltaTime;
            if (s.telegraphTimer >= 1200) {
                s.phase = 'striking'; s.strikeEnd = now + 700;
                const ox = s.originX, oy = s.originY;
                addExplosion(ox, oy, 65, '#8800cc');
                createParticles(ox, oy, 22, '#cc44ff', 4, 10);
                let hitPlayer = false;
                s.targets.forEach(t => {
                    // Bán kính to hơn thật (100 -> 130) theo yêu cầu vùng cảnh
                    // báo to rõ ràng hơn — khớp đúng bán kính vẽ ở render.
                    if (t.isPlayer) {
                        if (!hitPlayer && Math.hypot(player.x - t.tx, player.y - t.ty) < 130) { playerTakesHit(); hitPlayer = true; }
                    } else if (t.ref.hp > 0 && Math.hypot(t.ref.x - t.tx, t.ref.y - t.ty) < 130) {
                        dealDamage(t.ref, { damage: enemy.maxHp * 0.05, isTrueDamage: true });
                    }
                });
            }
        } else if (s.phase === 'striking') {
            if (now >= s.strikeEnd) { s.phase = 'ready'; s.cooldownEnd = now + 4000; }
        }
    }

    if (js['Dargruel']) {
        const s = js['Dargruel'];
        if (now >= s.nextFireAt) {
            s.nextFireAt = now + 8000;
            // Dùng đúng cơ chế Maou Haki thật (spawnBossShockwave): tự động
            // quét sạch đạn người chơi trong bán kính lan ra + gây sát thương
            // Sentinel — trước đây thiếu hẳn phần dọn đạn.
            spawnBossShockwave(enemy.x, enemy.y);
            if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < canvas.width) {
                player._goliathSlowEnd = now + 2000; player._goliathSlowFactor = 0.30;
            }
            addExplosion(enemy.x, enemy.y, 200, '#8A2BE2');
        }
    }

    if (js['Leviathan']) {
        const s = js['Leviathan'];
        if (s.phase === 'ready' && now >= (s.cooldownEnd || 0)) {
            s.phase = 'warning'; s.warnTimer = 0;
        } else if (s.phase === 'warning') {
            s.warnTimer += deltaTime;
            if (s.warnTimer >= 1500) {
                s.phase = 'sweeping'; s.sweepTimer = 0;
                s.sweepOrigin = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                s._hitPlayer = false;
            }
        } else if (s.phase === 'sweeping') {
            s.sweepTimer += deltaTime;
            // 1800ms cho đúng 1 vòng 360° — khớp tốc độ quét thật của Leviathan
            // (trước đây 1000ms khiến tia quay nhanh hơn hẳn bản gốc).
            const curAngle = s.sweepOrigin + (s.sweepTimer / 1800) * Math.PI * 2;
            // đơn giản hoá va chạm: coi tia quét đã "quét qua" người chơi nếu góc
            // hiện tại của người chơi nằm giữa 2 mốc góc của khung hình trước/sau
            if (!s._hitPlayer) {
                const pAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                let d1 = Math.abs(((curAngle - pAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                if (d1 < 0.15 && Math.hypot(player.x - enemy.x, player.y - enemy.y) < 900) {
                    s._hitPlayer = true; playerTakesHit();
                }
            }
            if (s.sweepTimer >= 1800) {
                s.phase = 'ready'; s.cooldownEnd = now + 2000;
            }
        }
    }
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
            addExplosion(enemy.x, enemy.y, enemy.size * 3, '#ffd700');
            createParticles(enemy.x, enemy.y, 40, '#ffd700', 4, 14);
            _spawnCoronationResult(enemy);
            enemy.hp = 0; // remove original apostle silently (no kill credit)
            enemy._coronationConsumed = true;
        }
    }
}

// EGREGOR, Plump Parasite (Elite)
function spawnEgregor() {
    const size = 160;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    const hp = Math.ceil(Math.min(4750, 2200 + hpFromTime * 72) * 1.15); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size,
        y: -size,
        size, speed: 0.8,
        hp, maxHp: hp, _baseMaxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'egregor',
        // Mind Link, rage stacks
        _rageStacks: 0,
        _rageEndTimes: [],
        // Psychic Tempest
        _tempestPhase: 'ready',
        _tempestTargets: [],
        _tempestCooldownEnd: performance.now() + 8000,
        _tempestPending: false,
        _tempestOriginX: 0, _tempestOriginY: 0,
        // Null Slash
        _nullSlashPhase: 'ready',
        _nullSlashCooldownEnd: performance.now() + 3000,
        _nullSlashWindupTimer: 0,
        _nullSlashWindupDur: 3000,
        _nullSlashStrikeTimer: 0,
        _nullSlashAngle: 0,
        _nullSlashTargetX: 0,
        _nullSlashTargetY: 0,
        _nullSlashDmgDealt: false,
        _nullSlashTentPts: null,
        _nullSlashOriginX: 0,
        _nullSlashOriginY: 0,
        _dimBreakZoneSpawned: false,
        // Collective Mind tentacles
        _tentacleHps: null,   // initialized in updateEgregor on first tick
        _tentaclesLost: 0,
        // Visual
        _tentacles: null,
        _eyeBlinkTimers: [0, 0, 0, 0],
        _eyeNextBlinks: [2000, 2800, 1500, 3500],
    });
}

function updateEgregor(enemy, deltaTime) {
    const now = performance.now();
    const dt = deltaTime / 16.67;

    // Signature-monster crawl texture: two alternating one-shots cross-started
    // by AudioMgr so the loop never has a silent gap. startEgregorCrawl is a
    // no-op once already running; stopped from main.js when no Egregor remains.
    if (window.AudioMgr) {
        window.AudioMgr.startEgregorCrawl();
        window.AudioMgr.tickEgregorCrawl();
    }

    // Collective Mind, init tentacle HP pools on first tick
    if (!enemy._tentacleHps) {
        const tentHP = Math.ceil(enemy.maxHp * 0.80);
        enemy._tentacleHps = Array(10).fill(tentHP);
        enemy._tentaclesLost = 0;
    }
    // Sync lost count (source of truth: tentacleHps)
    enemy._tentaclesLost = enemy._tentacleHps.filter(hp => hp <= 0).length;

    // Rage stack decay (before movement so multipliers are current this frame)
    enemy._rageEndTimes = (enemy._rageEndTimes || []).filter(t => t > now);
    enemy._rageStacks = enemy._rageEndTimes.length;

    // Speed bonus from rage (+18% move speed per stack)
    const _speedMult = 1 + enemy._rageStacks * 0.18;
    // Rage active: Tempest 15% faster (flat bonus only)
    const _rageOn = (enemy._rageStacks > 0);
    const _tempestCD = 4000 * (_rageOn ? 0.85 : 1.0);

    // Move at 10% speed during NullSlash windup, full speed otherwise
    const _nsMoveMult = (enemy._nullSlashPhase === 'charging') ? 0.10 : 1.0;
    enemy.y += enemy.speed * _speedMult * _nsMoveMult * dt;
    if (enemy.x < enemy.size) enemy.x = enemy.size;
    if (enemy.x > canvas.width - enemy.size) enemy.x = canvas.width - enemy.size;

    _updateEgregorTempest(enemy, deltaTime, now, _tempestCD);
    _updateEgregorNullSlash(enemy, deltaTime, now);

    // Player body collision, 1.5s cooldown prevents per-frame life drain
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
        if (now >= (enemy._bodyHitCooldownEnd || 0)) {
            playerTakesHit(enemy);
            enemy._bodyHitCooldownEnd = now + 1500;
        }
    }
}

function _updateEgregorTempest(enemy, deltaTime, now, cooldown) {
    if (enemy._tempestPhase === 'ready') {
        if (now >= (enemy._tempestCooldownEnd || 0)) {
            const pool = _shuffleArray([player, ...sentinels]);
            const count = Math.min(3, pool.length);
            enemy._tempestTargets = [];
            for (let i = 0; i < count; i++) {
                enemy._tempestTargets.push({
                    target: pool[i],
                    tx: pool[i].x, ty: pool[i].y,
                    countdown: 1200, strikeLife: 0, strikeMaxLife: 700,
                    struck: false, _mainBolt: null, _outerBolt: null, _thinBolt: null,
                });
            }
            if (enemy._tempestTargets.length > 0) {
                enemy._tempestPhase = 'telegraphing';
                // Origin between gills (L2D gill center at y+25*sc from body center)
                const _gillSc = (enemy.size / 2) / 110;
                enemy._tempestOriginX = enemy.x;
                enemy._tempestOriginY = enemy.y + 25 * _gillSc;
            }
        }
        return;
    }

    if (enemy._tempestPhase === 'telegraphing') {
        // Rage: countdown expires 15% faster
        const _tempestTickMult = ((enemy._rageStacks || 0) > 0) ? (1 / 0.85) : 1.0;
        let allDone = true;
        for (const t of enemy._tempestTargets) {
            t.countdown -= deltaTime * _tempestTickMult;
            // No tracking: tx/ty are locked at targeting moment
            if (t.countdown > 0) allDone = false;
        }
        if (allDone) {
            const ox = enemy._tempestOriginX, oy = enemy._tempestOriginY;
            // Muzzle burst from gill area
            addExplosion(ox, oy, 65, '#8800cc');
            createParticles(ox, oy, 22, '#cc44ff', 4, 10);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('egregor-tempest-strike', ox, oy);
            let _playerHit = false;
            const _hitSentinels = new Set();
            for (const t of enemy._tempestTargets) {
                t.struck = true; t.strikeLife = 700;
                t._mainBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty, 16, 32);
                t._outerBolt = _egregorGenBolt(ox, oy, t.tx, t.ty, 12, 48);
                t._thinBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty,  8, 18);
                t._branchA   = _egregorGenBolt(ox, oy, t.tx, t.ty, 10, 38);
                // Damage (radius 100px), player and each sentinel hit at most once per cast
                if (!_playerHit && Math.hypot(player.x - t.tx, player.y - t.ty) < 100) {
                    playerTakesHit(enemy); _playerHit = true;
                }
                for (const s of sentinels) {
                    if (!_hitSentinels.has(s) && Math.hypot(s.x - t.tx, s.y - t.ty) < 100) {
                        dealDamage(s, { damage: Math.ceil(s.maxHp * 0.20), isTrueDamage: false });
                        _hitSentinels.add(s);
                    }
                }
            }
            enemy._tempestPhase = 'striking';
        }
        return;
    }

    if (enemy._tempestPhase === 'striking') {
        let anyAlive = false;
        for (const t of enemy._tempestTargets) {
            if (t.struck && t.strikeLife > 0) { t.strikeLife -= deltaTime; if (t.strikeLife > 0) anyAlive = true; }
        }
        if (!anyAlive) {
            enemy._tempestPhase = 'ready';
            enemy._tempestCooldownEnd = now + cooldown;
            enemy._tempestTargets = [];
        }
    }
}

function _egregorGenBolt(x1, y1, x2, y2, detail, jitter) {
    const pts = [{ x: x1, y: y1 }];
    const dx = x2 - x1, dy = y2 - y1;
    for (let i = 1; i < detail; i++) {
        const t = i / detail;
        const s = Math.sin(t * Math.PI);
        pts.push({ x: x1 + dx * t + (Math.random() - 0.5) * jitter * 2 * s, y: y1 + dy * t + (Math.random() - 0.5) * jitter * 2 * s });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
}

// Fire pending Tempest immediately (called when Egregor dies mid-telegraph)
function _forceFireEgregorTempest(enemy) {
    if (enemy._tempestPhase !== 'telegraphing' || !enemy._tempestTargets.length) return;
    const ox = enemy._tempestOriginX, oy = enemy._tempestOriginY;
    addExplosion(ox, oy, 65, '#8800cc');
    createParticles(ox, oy, 22, '#cc44ff', 4, 10);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('egregor-tempest-strike', ox, oy);
    let _playerHit = false;
    const _hitSentinels = new Set();
    for (const t of enemy._tempestTargets) {
        t.struck = true; t.strikeLife = 700;
        t._mainBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty, 16, 32);
        t._outerBolt = _egregorGenBolt(ox, oy, t.tx, t.ty, 12, 48);
        t._thinBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty,  8, 18);
        t._branchA   = _egregorGenBolt(ox, oy, t.tx, t.ty, 10, 38);
        if (!_playerHit && Math.hypot(player.x - t.tx, player.y - t.ty) < 100) {
            playerTakesHit(enemy); _playerHit = true;
        }
        for (const s of sentinels) {
            if (!_hitSentinels.has(s) && Math.hypot(s.x - t.tx, s.y - t.ty) < 100) {
                dealDamage(s, { damage: Math.ceil(s.maxHp * 0.20), isTrueDamage: false });
                _hitSentinels.add(s);
            }
        }
    }
    enemy._tempestPhase = 'striking';
}

function _updateEgregorNullSlash(enemy, deltaTime, now) {
    if (enemy._nullSlashPhase === 'ready') {
        if (now >= (enemy._nullSlashCooldownEnd || 0)) {
            enemy._nullSlashPhase = 'charging';
            enemy._nullSlashWindupTimer = 0;
            // Windup: base 3s (no rage) / 2.5s (rage active), −0.35s per stack, min 1s
            const _nsBase = ((enemy._rageStacks || 0) > 0) ? 2500 : 3000;
            enemy._nullSlashWindupDur = Math.max(1000, _nsBase - (enemy._rageStacks || 0) * 350);
            enemy._boonBaneBarrier = 250;
            enemy._boonBaneBarrierTotal = 0;
            enemy._nullSlashTentPts = null;
            // Windup drone plays at natural pace and is cut short below the
            // instant the strike begins, so its length always tracks the
            // actual (rage-shortened) windup rather than a fixed duration.
            if (window.AudioMgr) window.AudioMgr.startNullSlashWindup();
        }
        return;
    }

    if (enemy._nullSlashPhase === 'charging') {
        // Track player continuously during windup, lock angle+target only at the moment of release
        enemy._nullSlashAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy._nullSlashTargetX = player.x;
        enemy._nullSlashTargetY = player.y;

        enemy._nullSlashWindupTimer += deltaTime;
        if (enemy._nullSlashWindupTimer >= enemy._nullSlashWindupDur) {
            enemy._nullSlashPhase = 'striking';
            enemy._nullSlashStrikeTimer = 0;
            enemy._nullSlashDmgDealt = false;
            enemy._nullSlashOriginX = enemy.x;
            enemy._nullSlashOriginY = enemy.y;
            enemy._dimBreakZoneSpawned = false;
            if (window.AudioMgr) {
                window.AudioMgr.stopNullSlashWindup();
                window.AudioMgr.playSfxAt('egregor-nullslash-slash', enemy.x, enemy.y);
            }
        }
        return;
    }

    if (enemy._nullSlashPhase === 'striking') {
        enemy._nullSlashStrikeTimer += deltaTime;

        // Damage check at 460ms, arc tip crosses target at sweep midpoint
        if (!enemy._nullSlashDmgDealt && enemy._nullSlashStrikeTimer >= 460) {
            enemy._nullSlashDmgDealt = true;
            const sx = enemy._nullSlashTargetX, sy = enemy._nullSlashTargetY;
            const _ex = enemy.x, _ey = enemy.y;
            const _nsAng = enemy._nullSlashAngle;
            const _arcR = Math.hypot(sx - _ex, sy - _ey) + (enemy._rageStacks || 0) * 5;
            // Hit: inside the 180° sweep sector, within arcR+100px of Egregor
            const _inSlash = (tx, ty) => {
                if (Math.hypot(tx - _ex, ty - _ey) > _arcR + 100) return false;
                let dA = Math.atan2(ty - _ey, tx - _ex) - _nsAng;
                while (dA > Math.PI) dA -= 2 * Math.PI;
                while (dA < -Math.PI) dA += 2 * Math.PI;
                return Math.abs(dA) <= Math.PI / 2;
            };

            let _nsHitLanded = false;

            // Player hit
            if (_inSlash(player.x, player.y)) {
                if (typeof skillShiftActive !== 'undefined' && skillShiftActive) {
                    _triggerAccurateParry(); // Yog-Sothoth dodge, no life, no slow
                } else {
                    // Slow 50% for 1.5s, NO life loss
                    player._nullSlashSlowed = true;
                    player._nullSlashSlowEnd = now + 1500;
                    addExplosion(player.x, player.y, 90, '#6600cc');
                    createParticles(player.x, player.y, 25, '#aa44ff', 3, 10);
                    _setShake(12, 350);
                    _nsHitLanded = true;
                }
            }

            // Sentinel hits, all sentinels inside the arc sector
            const hitSents = sentinels.filter(s => _inSlash(s.x, s.y));
            const hc = hitSents.length;
            if (hc > 0) {
                const pct = hc === 1 ? 0.30 : hc === 2 ? 0.35 : 0.40;
                // Rage bonus: +5% per stack, max +25%
                const _nsRageMult = 1 + Math.min(0.30, Math.min(5, enemy._rageStacks || 0) * 0.06);
                for (const s of hitSents) {
                    dealDamage(s, { damage: Math.ceil(s.maxHp * pct * _nsRageMult), isTrueDamage: true });
                    addExplosion(s.x, s.y, 65, '#7700dd');
                    createParticles(s.x, s.y, 18, '#cc44ff', 3, 7);
                }
                addExplosion(sx, sy, 140, '#5500bb');
                createParticles(sx, sy, 35, '#9933ff', 5, 14);
                createParticles(sx, sy, 15, '#ffffff', 4, 10);
                _setShake(14, 400);
                _nsHitLanded = true;
            }

            if (_nsHitLanded && window.AudioMgr) window.AudioMgr.playSfxAt('egregor-nullslash-hit', sx, sy);
        }

        // Spawn Dimension Break zone at start of retract (720ms) — independent world object
        if (!enemy._dimBreakZoneSpawned && enemy._nullSlashStrikeTimer >= 720) {
            enemy._dimBreakZoneSpawned = true;
            const ox = enemy._nullSlashOriginX, oy = enemy._nullSlashOriginY;
            const _dbArcR = Math.hypot(enemy._nullSlashTargetX - ox, enemy._nullSlashTargetY - oy)
                          + (enemy._rageStacks || 0) * 5;
            if (!window._dimBreakZones) window._dimBreakZones = [];
            window._dimBreakZones.push({
                cx: ox, cy: oy,
                arcR: _dbArcR,
                angle: enemy._nullSlashAngle,
                arcStart: enemy._nullSlashAngle - Math.PI / 2,
                spawnAt: now,
                expireAt: now + 1000
            });
            if (window.AudioMgr) window.AudioMgr.playSfxAt('dimension-break', ox, oy);
        }

        // Strike animation: 950ms (EXTEND 200 + SWEEP 520 + RETRACT 230)
        if (enemy._nullSlashStrikeTimer >= 950) {
            // Boon and Bane backlash: 50% of total accumulated barrier, cap 40% MaxHP, bypasses all
            if ((enemy._boonBaneBarrierTotal || 0) > 0) {
                const _backDmg = Math.min(
                    Math.ceil(enemy._boonBaneBarrierTotal * 0.50),
                    Math.ceil(enemy.maxHp * 0.40)
                );
                dealDamage(enemy, { damage: _backDmg, isTrueDamage: true, _boonBaneBacklash: true, _noBase60: true });
                addExplosion(enemy.x, enemy.y, enemy.size * 0.7, '#cc00cc');
                createParticles(enemy.x, enemy.y, 22, '#880088', 3, 9);
                enemy._boonBaneBarrier = 0;
                enemy._boonBaneBarrierTotal = 0;
            }
            enemy._nullSlashPhase = 'ready';
            enemy._nullSlashCooldownEnd = now + 3500; // 3.5s CD
            enemy._nullSlashTentPts = null;
        }
    }
}