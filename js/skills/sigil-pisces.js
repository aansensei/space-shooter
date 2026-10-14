// Pisces fish use simulation time and fixed pools for projectiles and water effects.
const _piscesFishPool = [];
for (let i = 0; i < 2; i++) _piscesFishPool.push({ active: false, x: 0, y: 0, previous: { x: 0, y: 0 }, angle: 0, age: 0, damage: 0, hitMs: 0, hits: [] });
const _piscesFxPool = [];
for (let i = 0; i < 128; i++) _piscesFxPool.push({ x: 0, y: 0, age: 0, life: 0, kind: 0, angle: 0, size: 24, enemy: null });
let _piscesFxCursor = 0;
let _piscesClock = 0, _piscesNextFishAt = 0;
const _piscesFishSource = { damage: 0, isPiercing: true, _barrierPiercing: true, _statSrc: 'Pisces: Flow Fish' };

function _piscesReset() {
    window._piscesFlowMs = 0;
    window._cofAuraEnd = 0;
    _piscesClock = _piscesNextFishAt = _piscesFxCursor = 0;
    for (const fish of _piscesFishPool) { fish.active = false; fish.hitMs = 0; fish.hits.length = 0; }
    for (const fx of _piscesFxPool) { fx.life = 0; fx.enemy = null; }
}

function _piscesOnCdReduction(reduction, now) {
    window._piscesFlowMs = Math.min(PISCES_FLOW_CAP_MS, window._piscesFlowMs + reduction);
    window._cofAuraEnd = Math.max(window._cofAuraEnd, now + (window._cofAuraEnd > now ? 600 : 720));
}

function _piscesCanTarget(e) {
    return e && e.hp > 0 && !e._markedForDeath && !e._deathPhase && !e.dyingLaserPhase
        && !e.inCoronation && !e._stealthed && !e.type.startsWith('enemy_bullet')
        && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && e.type !== 'embryo'
        && e.type !== 'thaelis_cocoon';
}

function _piscesEmit(kind, x, y, life, angle = 0, size = 24, enemy = null) {
    const fx = _piscesFxPool[_piscesFxCursor];
    _piscesFxCursor = (_piscesFxCursor + 1) % _piscesFxPool.length;
    fx.kind = kind; fx.x = x; fx.y = y; fx.age = 0; fx.life = life;
    fx.angle = angle; fx.size = Math.max(24, Math.min(220, size)); fx.enemy = enemy;
}

function _piscesTrySummon() {
    if (window._piscesFlowMs < PISCES_FISH_COST_MS || _piscesClock < _piscesNextFishAt) return;
    let free = null;
    for (const fish of _piscesFishPool) if (!fish.active) { free = fish; break; }
    if (!free) return;
    let target = null, closest = Infinity;
    for (const e of enemies) {
        if (!_piscesCanTarget(e)) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        const distance = dx * dx + dy * dy;
        if (distance < closest) { closest = distance; target = e; }
    }
    if (!target) return;
    window._piscesFlowMs -= PISCES_FISH_COST_MS;
    _piscesNextFishAt = _piscesClock + PISCES_FISH_INTERVAL_MS;
    free.active = true; free.x = free.previous.x = player.x; free.y = free.previous.y = player.y - player.height / 2 - 32;
    free.angle = Math.atan2(target.y - free.y, target.x - free.x);
    free.age = 0; free.damage = PISCES_FISH_ATK * player.atk; free.hitMs = 0; free.hits.length = 0;
    _piscesEmit(0, free.x, free.y, PISCES_FISH_FORM_MS + 240);
}

function _piscesUpdate(deltaTime) {
    if (!_hasBuff('dong_chay_luan_hoi')) {
        if (window._piscesFlowMs || _piscesFishPool[0].active || _piscesFishPool[1].active) _piscesReset();
        return;
    }
    _piscesClock += deltaTime;
    for (const fx of _piscesFxPool) if (fx.life > 0) {
        fx.age += deltaTime;
        if (fx.age >= 90) fx.enemy = null;
        if (fx.age >= fx.life) { fx.life = 0; fx.enemy = null; }
    }
    for (const fish of _piscesFishPool) {
        if (!fish.active) continue;
        fish.hitMs = Math.max(0, fish.hitMs - deltaTime);
        const previousAge = fish.age;
        fish.age += deltaTime;
        const travelMs = Math.max(0, fish.age - PISCES_FISH_FORM_MS) - Math.max(0, previousAge - PISCES_FISH_FORM_MS);
        if (travelMs > 0) {
            fish.previous.x = fish.x; fish.previous.y = fish.y;
            fish.x += Math.cos(fish.angle) * PISCES_FISH_SPEED * travelMs;
            fish.y += Math.sin(fish.angle) * PISCES_FISH_SPEED * travelMs;
            for (const e of enemies) {
                if (!_piscesCanTarget(e) || fish.hits.indexOf(e) >= 0) continue;
                if (distToSegment(e, fish, fish.previous) > (e.size || 20) / 2 + 10) continue;
                fish.hits.push(e);
                _piscesFishSource.damage = fish.damage;
                let blocked = false;
                if (e.type === 'leviathan' && e.afoShieldActive) {
                    e.afoHitCount = (e.afoHitCount || 0) + 1;
                    blocked = true;
                } else {
                    blocked = checkMarchosiasArcBarrier(e, _piscesFishSource, fish.x, fish.y);
                    if (!blocked) {
                        dealDamage(e, _piscesFishSource);
                        // The hold runs in _leoFreezeEnemy, the same Dominant freeze as Leo's petrify.
                        e._piscesStunMs = Math.max(e._piscesStunMs || 0, PISCES_FISH_STUN_MS);
                    }
                }
                _piscesEmit(blocked ? 3 : 1, e.x, e.y, 300, fish.angle, e.size || 24, blocked ? null : e);
                if (!blocked) fish.hitMs = 140;
            }
        }
        if (fish.age >= PISCES_FISH_FORM_MS + PISCES_FISH_LIFE_MS || fish.x < -80 || fish.x > canvas.width + 80 || fish.y < -80 || fish.y > canvas.height + 80) {
            _piscesEmit(2, fish.x, fish.y, 340);
            fish.active = false; fish.hits.length = 0;
        }
    }
    _piscesTrySummon();
}
