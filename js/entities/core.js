// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Real Marchosias's arc-barrier kit moved to js/entities/marchosias.js.

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

// Đếm TỔNG số tầng debuff (mọi sigil/skill nào áp được lên Goliath, dù
// CC-immune không chặn nổi) đang dính trên enemy — dùng cho trần damage
// động của Inevitable. Cùng danh sách nguồn với _hasAnyDebuff ở trên, chỉ
// khác là ĐẾM tầng thay vì chỉ true/false, + thêm Tesla Coil aura riêng.
function _goliathDebuffStackCount(enemy) {
    const now = performance.now();
    let n = enemy.vulnStacks || 0;
    if (enemy.soulReaver) n += 1;
    if (enemy._slowEnd && now < enemy._slowEnd) n += 1;
    if (enemy._dtuSlow) n += 1;
    n += enemy._nocToiStacks || 0;
    if (enemy._yogMark) n += 1;
    if (enemy._inDimensionalRift) n += 1;
    if (window._sthBurning && window._sthBurning.has(enemy)) n += window._sthBurning.get(enemy).stacks || 1;
    if (typeof teslaCoils !== 'undefined') {
        for (const _coil of teslaCoils) {
            if (Math.hypot(enemy.x - _coil.x, enemy.y - _coil.y) < _coil.auraRadius + enemy.size / 2) { n += 1; break; }
        }
    }
    return n;
}

// VULNERABILITY (Trọng Thương)
// true-dmg window length, shared with the decay calc in dealDamage and the
// expiry burst in updateVulnerabilityWindows - keep all 3 in sync
const VULN_TRUE_DMG_WINDOW_MS = 2500;

function applyVulnerability(enemy) {
    const now = performance.now();
    const stacks = (enemy.vulnStacks || 0);
    if (stacks < 4) {
        // Lập tức giảm 26% khiên hiện tại
        if (enemy.shield > 0) {
            enemy.shield = Math.max(0, Math.floor(enemy.shield * 0.74));
        }
        enemy.vulnStacks = stacks + 1;
        // full stack -> 2.5s true dmg window. goliath: 5s cd, starts counting
        // once the window ends (not at trigger) so it's a real dead gap
        if (enemy.vulnStacks === 4 && (enemy.type !== 'goliath' || now >= (enemy._vulnTrueDmgCooldownEnd || 0))) {
            enemy.vulnTrueDmgEnd = now + VULN_TRUE_DMG_WINDOW_MS;
            if (enemy.type === 'goliath') enemy._vulnTrueDmgCooldownEnd = enemy.vulnTrueDmgEnd + 5000;
        }
    }
    // Reset lại thời gian 3 giây mỗi khi cộng dồn
    enemy.vulnEndTime = now + 3000;
}

// window ends -> 500 base true dmg burst + full stack reset (not just the
// dmg-amp stacks, the true-dmg window itself gets a clean slate too), so
// non-goliath enemies actually get a real gap before it can fire again
// instead of just sitting pinned at 4 stacks under continuous fire
function updateVulnerabilityWindows() {
    const now = performance.now();
    for (const enemy of enemies) {
        if (enemy.vulnTrueDmgEnd && now >= enemy.vulnTrueDmgEnd) {
            enemy.vulnTrueDmgEnd = 0;
            enemy.vulnStacks = 0;
            enemy.vulnEndTime = 0;
            dealDamage(enemy, { damage: 500, isTrueDamage: true, _noHitSfx: true, _statSrc: 'Vulnerability' });
        }
    }
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
    // Galactic Spaceships (Skill D passive): ANY enemy that dies within
    // radius of an active Death Star spawns an allied spaceship, no matter
    // what killed it — an ally, the player, or the Death Star itself. This
    // is separate from _skillDOnKill's cooldown refund (js/skills.js), which
    // only fires for the Death Star's own 3 kill sources.
    if (deathStar) {
        const _dsSpawnR = deathStar.size * SKILLD_CONTACT_MULT + 180;
        if (Math.hypot(enemy.x - deathStar.x, enemy.y - deathStar.y) <= _dsSpawnR) {
            spawnSkillDSpaceship(enemy.x, enemy.y);
        }
    }
    score = Math.ceil(score + enemy.maxHp * 6);
    // Primeval Creation: +1.25% energy per kill from non-spirit sources
    if (!enemy._spiritKillCounted) {
        const _peGainMult = _hasBuff('dong_chay_luan_hoi') ? 1.50 : 1; // Cycle of Flow: +50% charge rate
        primevalEnergy = Math.min(100, (primevalEnergy || 0) + 1.25 * _peGainMult);
    }
    // Blessing HP regen handled in main.js update loop
    if (score >= nextLifeMilestone) {
        lives = Math.min(15, lives + 1);
        nextLifeMilestone += _hasBuff('hoan_sinh') ? 250000 : 500000;
        createParticles(player.x, player.y, 50, 'lime', 3, 8);
    }
    // Egregor and Leviathan get their own dedicated death bursts below
    // instead of the generic explosion, so each signature monster's death
    // reads distinctly.
    if (enemy.type !== 'egregor' && enemy.type !== 'leviathan') addExplosion(enemy.x, enemy.y, enemy.size);
    if (enemy.type === 'leviathan') {
        window._lastLeviathanKillTime = performance.now();
        // The actual burst fires later, in main.js, once this instance's
        // own death lasers finish playing out (~2.1s from now) — not here,
        // since this whole function runs the instant hp hits 0, the same
        // frame the laser sequence starts, well before it's actually done.
    }
    if (enemy.type === 'egregor') {
        window._lastEgregorKillTime = performance.now();
        if (!window._egregorDeathBursts) window._egregorDeathBursts = [];
        window._egregorDeathBursts.push({ x: enemy.x, y: enemy.y, size: enemy.size, spawnAt: performance.now(), duration: 900 });
        createParticles(enemy.x, enemy.y, 40, '#aa44ff', 3, 11);
        createParticles(enemy.x, enemy.y, 20, '#ffffff', 2, 7);
        _setShake(16, 420);
        if (window.AudioMgr) {
            window.AudioMgr.playSfxAt('egregor-death-roar', enemy.x, enemy.y);
            // Chỉ dừng windup nếu CHÍNH con Egregor này đang vận — windup là 1
            // audio element dùng chung, nếu dừng vô điều kiện sẽ cắt luôn
            // windup của Goliath Joker-copy Egregor (hoặc 1 Egregor khác) đang
            // vận cùng lúc ở nơi khác trên màn hình.
            if (enemy._nullSlashPhase === 'charging') window.AudioMgr.stopNullSlashWindup();
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
        const _gChargeGain = 0.5 * (_hasBuff('set_day_chuyen') ? 1.35 : 1) * (_hasBuff('dong_chay_luan_hoi') ? 1.50 : 1) * (_hasBuff('ky_su_dien') ? 1.10 : 1); // Chain Lightning: +35%, Cycle of Flow: +50%, Circuit Engineer: +10%
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
    const fireRateMultiplier = (gloryForJusticeActive ? 1.20 : 1) * (1 + (window._laiKepFireRateBonus || 0));
    if (performance.now() - lastAutoFire < autoFireInterval / fireRateMultiplier) return;
    lastAutoFire = performance.now();
    if (window.AudioMgr) window.AudioMgr.playSfx('autoshot');
    _checkMirrorLaserProc();

    const speedMultiplier = gloryForJusticeActive ? 1.25 : 1;
    const numBullets = 5, spreadAngle = Math.PI / 4;
    const startAngle = -spreadAngle / 2, angleStep = spreadAngle / (numBullets - 1);
    const baseAngle = -Math.PI / 2;

    let _isCritVolley = false;
    if (_hasBuff('mui_ten_vang')) {
        window._muiTenVangVolleyCount = (window._muiTenVangVolleyCount || 0) + 1;
        if (window._muiTenVangVolleyCount % 6 === 0) _isCritVolley = true;
    }

    for (let i = 0; i < numBullets; i++) {
        const angle = baseAngle + startAngle + (i * angleStep);
        bullets.push({
            x: player.x, y: player.y - player.height / 2,
            vx: Math.cos(angle) * 13.44 * speedMultiplier, vy: Math.sin(angle) * 13.44 * speedMultiplier,
            damage: 75, percentDamage: 0.009, size: 6.5, type: 'player_auto',
            applyVuln: true, vulnChance: 0.28,
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

// spawnDargruel / spawnThaelis / spawnAegisCore / spawnApostle moved to
// js/entities/misc-enemies.js. spawnMarchosias / spawnMarchosiasMinion
// moved to js/entities/marchosias.js.

// spawnVeilshroud (real + Echo) moved to js/entities/veilshroud.js.

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
    // fx.js's createRadialGradient throws (and freezes the whole render loop,
    // since nothing here is wrapped in try/catch) if any of x/y/size is
    // non-finite — a bad caller upstream (NaN position/size on some enemy)
    // must never be able to take down the entire game from this one shared
    // choke point every explosion effect passes through.
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size)) return;
    let finalColor = color;
    if (color === 'electric_blue') {
        finalColor = '#00FFFF';
    }
    explosions.push({ x, y, size, lifetime: 500, maxLifetime: 500, color: finalColor });
    createParticles(x, y, 8, finalColor, 1, 5);
}

// spawnSentinel / destroySentinel / updateSentinels moved to
// js/entities-sentinel.js (loaded right after this file).

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
    amount *= _walpurgisHealShieldMult(); // Walpurgis (Huyết Dạ): +5% shield effectiveness per stack
    _goliathTrackResourceGain(enemy, amount);
    if (enemy.type === 'thaelis' && (enemy._tenacityBarrier || 0) > 0) {
        enemy._tenacityBarrier += amount;
        enemy._tenacityBarrierMax = Math.max(enemy._tenacityBarrierMax || 0, enemy._tenacityBarrier);
        return;
    }
    enemy.shield = (enemy.shield || 0) + amount;
}

// triggerDemonGift moved to js/entities/misc-enemies.js.

function spawnBossShockwave(x, y, ownerType) {
    bossShockwaves.push({
        x: x, y: y,
        radius: 0,
        maxRadius: Math.hypot(canvas.width, canvas.height),
        speed: 12,
        hitSentinels: new Set(),
        active: true,
        _ownerType: ownerType || null,
    });
    _setShake(20, 600);
    if (window.AudioMgr) window.AudioMgr.startMaouHaki();
}

function dealDamage(enemy, source) {
    if (enemy.type === 'abyssal_chain') return;

    // GOLIATH Alpha/Transforming: bất khả xâm phạm tuyệt đối (Iron Body vĩnh
    // viễn) — không có ngoại lệ nào được xuyên thủng trong pha này.
    if (enemy.type === 'goliath' && enemy.phase !== 'true_form') return;

    // GOLIATH đang chạy chuỗi hiệu ứng nổ chết: bỏ qua mọi damage tới thêm.
    if (enemy.type === 'goliath' && enemy._deathPhase) return;

    if (enemy.type === 'goliath' && enemy.phase === 'true_form') {
        // Inevitable (NEW): Iron Body tuyệt đối 1.5s ngay sau khi biến hình
        // xong — bất khả xâm phạm hoàn toàn, không ngoại lệ nào xuyên nổi
        // (kể cả true damage/xuyên), giống hệt luật Alpha/Transforming.
        if (enemy._transformIronBodyEnd && performance.now() < enemy._transformIronBodyEnd) {
            createParticles(enemy.x, enemy.y, 6, '#f59e0b', 2, 7);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
            return;
        }
        // Fracture Step: lớp Iron Body vừa nhận lúc dịch chuyển, hấp thụ trọn
        // từng đòn (giống Coronation ironBodyHits đã có sẵn trong codebase)
        if (enemy._fractureIronBodyHits > 0 && (source.damage > 0 || source.percentDamage > 0)) {
            enemy._fractureIronBodyHits--;
            createParticles(enemy.x, enemy.y, 6, '#f59e0b', 2, 7);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
            return;
        }
        // Warding Palm: đòn tới từ Skill F/D/tia Photokrystos — sức mạnh khởi
        // nguyên của những đòn này quá mạnh nên KHÔNG BAO GIỜ bị chặn đứng
        // hoàn toàn, kể cả khi đỡ thành công. 35% mỗi đòn đỡ được (chỉ ăn 15%
        // MaxHP), 65% đỡ hụt (ăn 35% MaxHP) — tính PER HIT, không phải trần
        // cộng dồn cho cả trận.
        if (source._isSkillF || source._isSkillD || source.isSpiritLaser) {
            const _blocked = Math.random() < 0.35;
            enemy._wardingPalmFlash = { end: performance.now() + 500, success: _blocked };
            const dmg = enemy.maxHp * (_blocked ? 0.15 : 0.35);
            if (_blocked) createParticles(enemy.x, enemy.y, 14, '#c084fc', 3, 9);
            enemy.hp = Math.max(0, enemy.hp - dmg);
            if (enemy.hp <= 0) enemy._markedForDeath = true;
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
            return;
        }
        // Joker Marchosias: Arc Barrier hấp thụ đòn TRƯỚC KHI chạm thân (nếu
        // đang sống) — 'evaded'/'absorbed' thì return luôn (0 dame vào thân),
        // 'passthrough' (đòn xuyên) thì source.damage/percentDamage đã bị trừ
        // 30% ngay trong hàm, tiếp tục chảy xuống pipeline chung bên dưới.
        if (enemy._jokerState['Marchosias']) {
            const _barrierResult = _goliathMarchosiasBarrier(enemy, source);
            if (_barrierResult === 'evaded' || _barrierResult === 'absorbed') return;
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
            // Local flash at the actual impact point instead of the shield
            // just sitting still while it's being shot — purely visual,
            // doesn't change what the shield blocks or how it breaks.
            if (!window._levShieldRipples) window._levShieldRipples = [];
            if (window._levShieldRipples.length < 24) {
                const _hx = source.x !== undefined ? source.x : enemy.x;
                const _hy = source.y !== undefined ? source.y : enemy.y;
                window._levShieldRipples.push({ owner: enemy, x: _hx, y: _hy, spawnAt: performance.now(), duration: 380 });
            }
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
                        const _aegisGain = enemy.maxHp * _bPct;
                        enemy._aegisBarrier = (enemy._aegisBarrier || 0) + _aegisGain;
                        _goliathTrackResourceGain(enemy, _aegisGain);
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
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
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
        // Goliath (NEW): riêng, không dùng bảng tier chung ở trên (giữ 0 nếu
        // chưa vào True Form). 40% ngay lúc vừa biến hình xong, decay tuyến
        // tính về 25% trong 15s rồi giữ nguyên 25%. Cộng thêm +10% (không cộng
        // dồn dù trigger nhiều mốc cùng lúc — chỉ 1 lớp +10% duy nhất, refresh
        // lại 3.5s) mỗi lần HP tụt xuyên qua 75/50/25% — có thể lặp lại vô hạn
        // lần nếu hồi lên rồi tụt lại đúng mốc đó, khác hẳn khiên Threshold
        // Ward (chỉ phát 1 lần/mốc trong cả trận). Không áp dụng cho Skill F/
        // D/tia Photokrystos — 3 nguồn đó đã return sớm qua Warding Palm,
        // không bao giờ chạy tới khối evade này.
        if (enemy.type === 'goliath' && enemy.phase === 'true_form') {
            const _gDecayT = Math.min(1, (performance.now() - (enemy._trueFormEnteredAt || performance.now())) / 15000);
            _evade = 0.40 - _gDecayT * 0.15;
            if (enemy._evadeThresholdBuffEnd && performance.now() < enemy._evadeThresholdBuffEnd) _evade += 0.10;
        }
        // Walpurgis (Huyết Dạ): +5% evade per stack, applies on top of every
        // enemy's own tier/type evade (including types with 0 base evade).
        _evade += _walpurgisEvadeBonus();
        if (_evade > 0 && Math.random() < _evade) {
            if (enemy.type === 'goliath') {
                // Riêng cho Goliath: vòng lục giác tím giãn ra + thân nhấp
                // nháy nhanh (xem _drawGoliathEvadeFlash, enemy-goliath.js) —
                // khác hẳn flash xanh nhạt generic, để "phase né đòn" rõ ràng
                // dễ nhận ra hơn thay vì lẫn với flash chung của mọi enemy.
                enemy._evadeFlashEnd = performance.now() + 400;
                createParticles(enemy.x, enemy.y, 16, '#c084fc', 3, 8);
            } else {
                addExplosion(enemy.x, enemy.y, enemy.size * 0.55, '#aaddff');
            }
            // Evaded body hits on Marchosias can still trigger sword
            if (enemy.type === 'marchosias') _tryTriggerMarchosiasCounter(enemy);
            return;
        }
    }

    if (source.applySoulReaver) {
        enemy.soulReaver = true;
        enemy.soulReaverEnd = performance.now() + 2000;
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
    const isSpaceship = window.skillDSpaceships.includes(enemy);
    const enemyMaxHp = enemy.maxHp || enemy.hp;
    const effectiveHp = enemyMaxHp + enemy.shield;
    let totalDamage = Math.ceil(source.damage + (effectiveHp * (source.percentDamage || 0)));

    // Warding Palm (NEW, thử nghiệm): mọi sát thương từ Phōtokrystos (đạn
    // homing gắn isPhoto, boomerang gắn _isPhotoSourced) giảm thẳng 48% khi
    // đánh Goliath True Form — áp dụng SỚM, trước DR/Inevitable cap/true-dmg
    // bypass, để đè lên cả 2 loại sát thương thường lẫn true damage (boomerang).
    // Back to Motherland (đại kỹ của Remembrance Spirit) mượn cờ isPhoto cho
    // mục đích khác, không phải đòn Photokrystos thật, nên loại trừ riêng.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form' && (source.isPhoto || source._isPhotoSourced)
        && source._statSrc !== 'Skill S: Back to Motherland') {
        totalDamage = Math.ceil(totalDamage * 0.52);
    }

    if (!isSentinel && !source._vanguardTag && !source._noBase60
        && (source.damage > 0 || (source.percentDamage || 0) > 0)
        && !source.isTeslaDot && !source._isNocToiDot
        && !source._isDtuDot && !source._isSthDot && !source._yogExplosion) {
        totalDamage += 60;
        // Sigil: Lion's Roar — every hit also deals 2% of the enemy's own lost HP as bonus dmg
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

    // vuln 4 stacks -> 2.5s window. hit still eats shield/barrier as normal,
    // just gets +50% incoming dmg tacked on as true dmg (see _vulnTrueBonus
    // near the end). no longer a full convert-to-true-dmg like before
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
                    const _hpBefore = enemy.hp;
                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.ceil(enemy.maxHp * 0.06 * _walpurgisHealShieldMult()));
                    _goliathTrackResourceGain(enemy, enemy.hp - _hpBefore);
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
        combinedDR += 0.70 * Math.pow(0.85, _goliathWaningStacks(enemy)); // Inevitable: 70% base DR, decayed by Waning Might

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
        if (js['Marchosias'] && js['Marchosias'].barrierDown) {
            combinedDR += 0.20; // Barrier vừa vỡ: +20% DR tạm, mất khi barrier hồi sinh
        }
        if (js['Egregor'] && (js['Egregor'].phase === 'charging' || js['Egregor'].phase === 'striking')) {
            combinedDR += 0.40; // Null Slash đang vận/đánh: +40% DR
        }
        // Tempered Resolve: đang vận bất kỳ skill nào (của chính Goliath hay
        // Joker copy) thì +10% DR, bù lại cho việc bị chậm 35% + cấm dịch chuyển.
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

    // Great Sage: 1s of untargetable phase-out after every real Annihilation
    // Sweep, same rule as Veilshroud's own ghost (undetectable, every hit
    // passes through with no damage). Matching check for the player is in
    // playerTakesHit, main.js.
    if (isSentinel && window._greatSageStealthEnd && performance.now() < window._greatSageStealthEnd) {
        return;
    }

    // Great Sage (stolen Tenacity Barrier gem): sentinels get a duration
    // window of 50% dodge chance per hit instead of the player's single
    // Iron Body layer (see playerTakesHit, main.js)
    if (isSentinel && window._greatSageShieldEnd && performance.now() < window._greatSageShieldEnd && Math.random() < 0.5) {
        createParticles(enemy.x, enemy.y, 6, '#c4b5fd', 2, 6);
        return;
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
        _applyVanguardDamage(rawDmg, source._vanguardTag || 'generic', _vIsTrueDmg, enemy, source._attackerType || null);
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
        // Walpurgis (Huyết Dạ): flat "DR Base" armor, +100 per stack — a
        // separate stat from the %-based DR above, subtracted straight off
        // the remaining damage. Floored at 0 same as everywhere else, so it
        // can only ever reduce a hit to a graze, never block a kill outright.
        totalDamage -= _walpurgisFlatDR();
        // Inevitable (Leviathan): 350 flat armor on top of its 60% DR above,
        // same subtract-after-percentage pattern as Walpurgis's flat DR.
        if (enemy.type === 'leviathan') totalDamage -= 350;
        // Unified Front (Goliath True Form): flat armor recomputed every 1s
        // off the current ally count, same pattern. Base 200 (scaling
        // 1+10%/ally) against normal hits, base 400 (scaling 1+15%/ally)
        // against any %HP/EP/MaxHP-scaling hit (percentDamage > 0) — that's
        // the damage class that ignores Goliath's raw HP pool, so it gets
        // punished harder here.
        if (enemy.type === 'goliath' && enemy.phase === 'true_form') {
            totalDamage -= source.percentDamage > 0
                ? 400 * (enemy._unifiedFrontScalingDRMult || 1)
                : 200 * (enemy._unifiedFrontDRMult || 1);
        }
        // Tempered Resolve (Goliath True Form): +420 flat DR while
        // channeling any skill (its own or a Joker copy's), on top of the
        // +10% DR already applied above — same subtract-after-% pattern.
        if (enemy.type === 'goliath' && enemy.phase === 'true_form' && _goliathIsCasting(enemy)) {
            totalDamage -= 420;
        }
        totalDamage = Math.max(0, totalDamage);
    }

    // Damage caps apply regardless of true damage

    // Inevitable (Goliath, True Form): CHỈ sát thương xuyên (isPiercing),
    // CHUẨN (true damage), và DOT mới được đánh full — sát thương BÌNH
    // THƯỜNG (%HP/%EP, ăn shield trước — gồm cả đạn auto-fire cơ bản) bị
    // giới hạn cứng 1.5% MaxHP/đòn (tính SAU khi đã trừ DR ở trên), +0.3%
    // trần cho MỖI tầng debuff đang dính (bất kỳ sigil nào áp được lên
    // Goliath — vd 2 tầng Vulnerability = 1.5%+0.6%=2.1%), trần tối đa 3%.
    // Không áp dụng cho Skill F/D/tia Photokrystos finale — 3 nguồn đó đã
    // return sớm qua Warding Palm ở đầu hàm, không bao giờ chạy tới đây.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form'
        && !source.isTrueDamage && !source.isPiercing
        && !source.isTeslaDot && !source._isDtuDot && !source._isNocToiDot && !source._isSthDot) {
        const _capPct = Math.min(0.03, 0.015 + _goliathDebuffStackCount(enemy) * 0.003);
        totalDamage = Math.min(totalDamage, Math.ceil(enemy.maxHp * _capPct));
    }

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
    if (enemy.type === 'thaelis' && (enemy._tenacityBarrier || 0) > 0 && !source.isSpiritLaser && !source.isTrueDamage) {
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
    if (isSentinel && (enemy._gaiaBarrier || 0) > 0 && !source.isTrueDamage) {
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
        if (!source.isTrueDamage) {
            const _bbAbsorb = Math.min(totalDamage, enemy._boonBaneBarrier);
            enemy._boonBaneBarrier = Math.max(0, enemy._boonBaneBarrier - _bbAbsorb);
            totalDamage -= _bbAbsorb;
            if (totalDamage <= 0) return;
        }
    }

    // Aegis Core post-Custos barrier: absorbs non-true hits, true damage pierces
    if (enemy.type === 'aegis_core' && (enemy._aegisBarrier || 0) > 0 && !source.isTrueDamage) {
        const _absorb = Math.min(totalDamage, enemy._aegisBarrier);
        enemy._aegisBarrier = Math.max(0, enemy._aegisBarrier - _absorb);
        totalDamage -= _absorb;
        if (totalDamage <= 0) return;
    }

    // Goliath Inevitable damage window: hit > 8% MaxHP (post-DR) opens a
    // 2s window capping every hit at 2.5% MaxHP; 0.5s CD after window ends
    // (CD cleared in updateGoliath). True damage bypasses this cap entirely.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form' && !source.isTrueDamage) {
        const _gNow = performance.now();
        if (enemy._inevitableWindowEnd && _gNow < enemy._inevitableWindowEnd) {
            totalDamage = Math.min(totalDamage, enemy.maxHp * 0.025);
        } else if (totalDamage > enemy.maxHp * 0.08 && !(enemy._inevitableCooldownEnd && _gNow < enemy._inevitableCooldownEnd)) {
            enemy._inevitableWindowEnd = _gNow + 2000;
            totalDamage = Math.min(totalDamage, enemy.maxHp * 0.025);
        }
    }

    // Goliath clutch armor: a single hit worth more than 30% of its CURRENT
    // hp (not MaxHp, unlike Inevitable above) gets 8% MaxHp shaved off flat,
    // floored so it never drops below that same 30% current-hp threshold —
    // blunts an execute swing without ever making the hit harmless outright.
    // No cooldown: the current-hp condition already only fires rarely, when
    // Goliath is genuinely low and about to eat something huge.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form' && !source.isTrueDamage
        && totalDamage > enemy.hp * 0.30) {
        totalDamage = Math.max(totalDamage - enemy.maxHp * 0.08, enemy.hp * 0.30);
    }

    // Bùng nổ khiên (Inevitable): dồn TOÀN BỘ sát thương nhận trong 1 giây
    // (mọi loại, kể cả piercing/true/DOT) — dùng đúng độ lớn của đòn TRƯỚC
    // khi bị true-dmg/shield/barrier trừ, nên phải chụp lại ở đây. Trigger
    // thật nằm dưới (sau khi hp đã trừ xong), xem khối "Inevitable — bùng
    // nổ khiên" phía dưới.
    const _hitSizeForBurst = totalDamage;
    // match stats: log the actual damage applied, capped at the enemy's
    // current HP - instakill tricks (Death Star's damage: maxHp*999999999)
    // use an intentionally absurd raw value to guarantee a kill through any
    // mitigation, and logging that raw value would blow the leaderboard up
    // to a meaningless number instead of real damage dealt.
    _recordStat(
        (isSentinel || isSpaceship) ? 'enemyDamage' : 'allyDamage',
        _classifyDamageSource(source, !(isSentinel || isSpaceship)),
        Math.min(_hitSizeForBurst, Math.max(0, enemy.hp))
    );

    // Buff Phōtokrystos (NEW): đánh 1 kẻ địch >50,000 MaxHP (thực tế chỉ có
    // Goliath True Form đạt mức này) — mỗi 1% MaxHP của nó gây được thành sát
    // thương thì nạp thêm 1.5% năng lượng triệu hồi Phōtokrystos.
    if (enemy.maxHp > 50000 && typeof primevalEnergy !== 'undefined' && _hitSizeForBurst > 0) {
        const _pePctDealt = (_hitSizeForBurst / enemy.maxHp) * 100;
        primevalEnergy = Math.min(100, primevalEnergy + _pePctDealt * 1.5);
    }

    // Vết chém (NEW): riêng cho Goliath, khi bị arc blade/boomerang trúng
    // thật (đã qua evade/Iron Body/Warding Palm ở trên) — vẽ 1 đường chém
    // sáng ngang thân, khác hẳn hiệu ứng nổ tròn generic. Xem enemy-goliath.js.
    if (enemy.type === 'goliath' && source._isSlashVfx) {
        enemy._slashVfx = { end: performance.now() + 350, angle: Math.random() * Math.PI * 2 };
    }

    // Apply damage: true damage bypasses shield/barrier entirely (same rule
    // as Joker Marchosias's Arc Barrier). Vuln true-dmg window doesn't do
    // that anymore — hit still eats shield/barrier, just gets a % of its
    // damage tacked on separately as guaranteed true dmg. that % decays
    // 40% -> 20% linearly across the window instead of a flat rate.
    let _hpDamageDealt = 0;
    if (source.isTrueDamage) {
        if (isSentinel && typeof _yuushaTankAbsorbFromSentinelDamage === 'function') {
            totalDamage -= _yuushaTankAbsorbFromSentinelDamage(totalDamage);
        }
        if (!_goliathTryUnbrokenWill(enemy, totalDamage)) {
            _hpDamageDealt = totalDamage;
            enemy.hp -= totalDamage;
        }
    } else {
        let _vulnTrueBonus = 0;
        if (inTrueDmgWindow) {
            const _vulnElapsed = VULN_TRUE_DMG_WINDOW_MS - (enemy.vulnTrueDmgEnd - performance.now());
            const _vulnFrac = Math.min(1, Math.max(0, _vulnElapsed / VULN_TRUE_DMG_WINDOW_MS));
            const _vulnPct = 0.40 - _vulnFrac * 0.20;
            _vulnTrueBonus = Math.ceil(totalDamage * _vulnPct);
        }
        if (enemy.type === 'goliath' && enemy.barrier > 0) {
            const damageToBarrier = Math.min(enemy.barrier, totalDamage);
            enemy.barrier -= damageToBarrier;
            totalDamage -= damageToBarrier;
        }
        const damageToShield = Math.min(enemy.shield, totalDamage);
        enemy.shield -= damageToShield;
        enemy.shield = Math.max(0, enemy.shield);
        totalDamage -= damageToShield;
        totalDamage += _vulnTrueBonus;
        if (isSentinel && typeof _yuushaTankAbsorbFromSentinelDamage === 'function') {
            totalDamage -= _yuushaTankAbsorbFromSentinelDamage(totalDamage);
        }
        if (!_goliathTryUnbrokenWill(enemy, totalDamage)) {
            _hpDamageDealt = totalDamage;
            enemy.hp -= totalDamage;
        }
    }
    // GOLIATH True Form, before Unbroken Will has fired: floor hp at 1
    // instead of 0 — the actual kill only happens once a hit lands while
    // already pinned here (see _goliathTryUnbrokenWill above), so the save
    // can never be skipped by a hit that's simply too big to compute against
    // the death-phase check below in the same call.
    const _gFloor = (enemy.type === 'goliath' && enemy.phase === 'true_form' && !enemy._unbrokenWillUsed) ? 1 : 0;
    enemy.hp = Math.max(_gFloor, enemy.hp);
    // GOLIATH True Form: bắt + ghim hp=1 NGAY TẠI ĐÂY, ĐỒNG BỘ trong chính
    // dealDamage — không đợi tới frame sau để updateGoliath() bắt kịp nữa.
    // Bất kỳ đoạn code nào gọi dealDamage() rồi tự ý splice/kill luôn enemy
    // ngay sau đó trong CÙNG lần gọi (không đợi qua vòng lặp main.js) đều sẽ
    // thấy hp đã về 1 trước khi kịp làm gì — loại hẳn khoảng hở thời gian mà
    // trước đây khiến Goliath có thể "biến mất" không chạy hiệu ứng chết.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form' && enemy.hp <= 0 && !enemy._deathPhase) {
        enemy._deathPhase = 'core';
        enemy._deathPhaseTimer = 0;
        enemy._deathGemsExploded = 0;
        enemy.hp = 1;
        enemy._markedForDeath = false;
        if (window.AudioMgr) window.AudioMgr.playSfxAt('goliath-death', enemy.x, enemy.y);
    }
    if (enemy.hp <= 0) enemy._markedForDeath = true;
    // _noHitSfx: caller already plays its own dedicated hit sound for this
    // exact hit (e.g. skill-a-orb-hit, phantom-strike) — the generic
    // enemy-hit fallback would just stack on top of it.
    else if (window.AudioMgr && !source._noHitSfx) window.AudioMgr.playSfxAt('enemy-hit', enemy.x, enemy.y);

    // Threshold Ward: every 1 real HP dmg taken (post-shield) regens 0.25
    // shield. Total shield can still balloon over a long fight (no cap on
    // the running total), but each individual hit's own contribution is
    // capped at 10% MaxHP — an oversized true-damage spike (the kind that
    // skips every other Goliath defense layer) would otherwise mint a
    // shield way bigger than the hit that caused it, which Shield Burst
    // below then converts straight into a huge HP heal-back.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form' && _hpDamageDealt > 0) {
        enemy.shield = (enemy.shield || 0) + _goliathHealBoost(enemy, Math.min(_hpDamageDealt, enemy.maxHp * 0.10) * 0.25);
    }

    // Inevitable — bùng nổ khiên: dồn sát thương MỌI loại nhận được trong 1
    // giây trôi (rolling window) — vượt quá 12% MaxHP thì cấp 1 khoản
    // barrier mới = 50% tổng sát thương đã dồn trong window đó, ĐỒNG THỜI
    // rút sạch shield hiện có sang barrier (barrier KHÔNG tính vào EP =
    // maxHp+shield như shield thường — giảm luôn độ lớn các đòn %EP tiếp
    // theo ăn vào), và hồi HP = 60% ĐÚNG PHẦN shield vừa rút đó. 0.5s
    // cooldown giữa các lần kích hoạt, window reset ngay khi vừa kích hoạt.
    if (enemy.type === 'goliath' && enemy.phase === 'true_form' && _hitSizeForBurst > 0) {
        const _gNow3 = performance.now();
        if (!enemy._burstWindowStart || _gNow3 - enemy._burstWindowStart >= 1000) {
            enemy._burstWindowStart = _gNow3;
            enemy._burstWindowDmg = 0;
        }
        enemy._burstWindowDmg = (enemy._burstWindowDmg || 0) + _hitSizeForBurst;
        if (enemy._burstWindowDmg > enemy.maxHp * 0.12 && !(enemy._burstCooldownEnd && _gNow3 < enemy._burstCooldownEnd)) {
            enemy._burstCooldownEnd = _gNow3 + 500;
            enemy.barrier = (enemy.barrier || 0) + Math.ceil(enemy._burstWindowDmg * 0.50);
            const _convertedShield = enemy.shield || 0;
            enemy.barrier += _convertedShield;
            enemy.shield = 0;
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.ceil(_convertedShield * 0.60));
            enemy._burstWindowDmg = 0;
            enemy._burstWindowStart = _gNow3;
            createParticles(enemy.x, enemy.y, 16, '#38bdf8', 3, 9);
        }
    }

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

    // Gate of Babylon (cong_babylon): every landed ally hit (except Skill D/F,
    // and not a blade's own impact) can open gates around the player and
    // fire a fan of 14 piercing blades, 1.5s CD. Timeline/collision runs in
    // updateGateOfBabylon (js/skills.js); this just spawns the sequence.
    if (_hasBuff('cong_babylon') && !isSentinel && !source._isSkillF && !source._isSkillD && !source._isGobBlade && !source._isYuushaParty && totalDamage > 0) {
        const _gobNow = performance.now();
        if (_gobNow >= (window._gobCooldownEnd || 0)) {
            window._gobCooldownEnd = _gobNow + 1500;
            window._gobSequences = window._gobSequences || [];
            window._gobSequences.push(_createGobSequence(_gobNow));
            if (window.AudioMgr) window.AudioMgr.playSfxAt('gate-of-babylon', player.x, player.y);
        }
    }

    // Enuma Elish: every 30th landed ally hit (except Skill D/F, and not the
    // spear's own impact) summons a phantom double of the player at its
    // current position that hurls a giant piercing spear toward whichever
    // enemy is the current highest priority (Dominator/Digiform first, else
    // highest HP), locked in at trigger time, 1s CD. Timeline/collision
    // runs in updateEnumaElish (js/skills.js).
    if (_hasBuff('enuma_elish') && !isSentinel && !source._isSkillF && !source._isSkillD && !source._isEeSpear && !source._isYuushaParty && totalDamage > 0) {
        window._eeHitCounter = (window._eeHitCounter || 0) + 1;
        const _eeNow = performance.now();
        if (window._eeHitCounter >= 30 && _eeNow >= (window._eeCooldownEnd || 0)) {
            window._eeHitCounter = 0;
            const _eeTarget = _eeFindPriorityTarget();
            if (_eeTarget) {
                window._eeCooldownEnd = _eeNow + 1000;
                window._eeSequences = window._eeSequences || [];
                window._eeSequences.push(_createEeSequence(_eeNow, _eeTarget));
                if (window.AudioMgr) window.AudioMgr.playSfxAt('enuma-elish-charge', player.x, player.y);
            }
        }
    }

    // Lion's Roar (su_tu_hong): while GfJ is active, ANY landed ally hit
    // inflicts/refreshes Burn (used to be auto-fire-only, description never
    // said that) - the actual DoT ticks are applied in updateSoulReaverDoT's
    // neighbor at main.js (_sthBurning map), this just opens/refreshes an entry.
    if (_hasBuff('su_tu_hong') && !isSentinel && gloryForJusticeActive && !source._isSthDot
        && !source._isSkillF && !source._isSkillD && totalDamage > 0) {
        const _sthNow = performance.now();
        window._sthBurning = window._sthBurning || new Map();
        const _sthExisting = window._sthBurning.get(enemy);
        if (_sthExisting) {
            _sthExisting.stacks = Math.min(3, _sthExisting.stacks + 1);
            _sthExisting.expiry = _sthNow + 3000;
        } else {
            window._sthBurning.set(enemy, { stacks: 1, nextTick: _sthNow + 500, expiry: _sthNow + 3000 });
        }
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
        enemy.dyingLaserPhase = true; // freezes the real 9 wings' own idle rotation so they don't fight the aiming animation drawn per-laser, and gates out further damage below
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
                ownerRef: enemy,
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
        // Tiếng laser-fire phải phát đúng lúc các tia THỰC SỰ bắn (elapsed
        // >= warnTime, xem main.js), không phải ngay lúc này — lúc này các
        // cánh mới bắt đầu xoay dò/tracking mục tiêu trong 1200ms warnTime.
        window._levDeathLaserSoundPending = true;
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
                dealDamage(otherEnemy, { damage: chainDamage, isChainLightning: true, applySoulReaver: debuff, _noHitSfx: true });
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
        if (oldPercent > 0.90 && newPercent <= 0.90 && !enemy.demonGift90Triggered) { _demonTrigger(); spawnBossShockwave(enemy.x, enemy.y, 'dargruel'); enemy.demonGift90Triggered = true; }
        if (oldPercent > 0.70 && newPercent <= 0.70 && !enemy.demonGift70Triggered) { _demonTrigger(); enemy.demonGift70Triggered = true; }
        if (oldPercent > 0.50 && newPercent <= 0.50 && !enemy.demonGift50Triggered) { _demonTrigger(); spawnBossShockwave(enemy.x, enemy.y, 'dargruel'); enemy.demonGift50Triggered = true; }
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
// Leviathan moved to js/entities/leviathan.js.

// Vanguard Network central damage handler
// Mọi nguồn damage vào sentinel đều đi qua đây khi network active (5+ sentinels)
// rawDmg: damage đã tính (sau multipliers), sourceTag: string unique per source instance
// targetSentinel: sentinel bị nhắm trực tiếp (nhận thêm 50% damage gốc)
// attackerType: enemy.type gây damage, nếu có sẽ ghi Match Stats theo tên boss
// thật (vd "Leviathan") thay vì rơi về nhãn chung chung "Boss Attack"
function _applyVanguardDamage(rawDmg, sourceTag, isTrueDamage = false, targetSentinel = null, attackerType = null) {
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

    let _vanguardStatTotal = 0;
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

        _vanguardStatTotal += totalDmg;
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
    _recordStat('enemyDamage', _classifyDamageSource({ _vanguardTag: sourceTag, _attackerType: attackerType }, false), _vanguardStatTotal);

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
// Goliath moved to js/entities/goliath.js.


// updateApostleCoronation moved to js/entities/misc-enemies.js.


// Egregor moved to js/entities/egregor.js.
