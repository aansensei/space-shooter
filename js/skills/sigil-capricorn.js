// Pisces: Space Journey. (c) 2024 An Nguyen. Licensed under the MIT License.
// Capricorn sigil mechanics: Compound Interest stacks and Mountainfall, the
// mountain that crushes the densest group and breaks into three rock walls
// that stop everything the enemy sends at the ship. Visuals live in
// js/render/sigil-capricorn.js.

const CAP_STACK_DMG = 0.005;          // +0.5% damage per stack
const CAP_WARN_MS = 4000;             // the stack circle starts to crack
const CAP_LOSS_MS = 6000;             // every stack is lost
const CAP_LEY_PER_STACK = 2.5;        // 40 stacks fill the Ley meter
const CAP_MF_IMPACT_MS = 350;
const CAP_MF_WALL_FROM_MS = 600;      // walls block from here, while still sliding
const CAP_MF_WALL_END_MS = 4900;
const CAP_MF_END_MS = 5300;
const CAP_MF_RADIUS = 170;
const CAP_MF_ATK = 12;
const CAP_MF_PCT = 0.04;
const CAP_MF_BURY_MS = 1500;
const CAP_WALL_HALF_T = 13;
const _capImpactSource = { damage: 0, percentDamage: CAP_MF_PCT, _statSrc: 'Mountainfall' };

function _capricornReset() {
    window._capStacks = 0;
    window._capSinceGain = 0;
    window._capPEFrac = 0;
    window._capLey = 0;
    window._capricornReady = false;
    window._capMountain = null;
    window._capClock = 0;
}
_capricornReset();

function _capStackCount() { return _hasBuff('lai_kep') ? (window._capStacks || 0) : 0; }

// Damage multiplier applied in dealDamage while Compound Interest holds stacks.
function _capDamageMult() {
    const s = _capStackCount();
    return s > 0 ? 1 + Math.min(_stackCap('avalancheMult'), s * CAP_STACK_DMG) : 1;
}

function _capAddStacks(n) {
    if (!_hasBuff('lai_kep') || !(n > 0)) return;
    const before = window._capStacks || 0;
    window._capStacks = Math.min(_stackCap('avalancheStacks'), before + n);
    window._capSinceGain = 0;
    if (typeof _capOnStacksGained === 'function') _capOnStacksGained(before, window._capStacks);
    if (_hasBuff('thai_son_ap_dinh') && !window._capMountain) {
        window._capLey = Math.min(100, (window._capLey || 0) + n * CAP_LEY_PER_STACK);
        window._capricornReady = window._capLey >= 100;
    }
}

// Every whole Primeval Energy point charged from anything but a kill.
function _capOnPEGain(amount) {
    if (!_hasBuff('lai_kep') || !(amount > 0)) return;
    const total = (window._capPEFrac || 0) + amount;
    const whole = Math.floor(total);
    window._capPEFrac = total - whole;
    if (whole > 0) _capAddStacks(whole);
}

function _capCanBury(e) {
    return e && e.hp > 0 && !e._deathPhase && !e._markedForDeath && !e.dyingLaserPhase
        && e.type && !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo'
        && !(e.type === 'goliath' && e.phase !== 'true_form');
}

function _capIsTarget(e) {
    return e && e.hp > 0 && e.type && !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain'
        && e.type !== 'veilshroud_echo' && !e._stealthed && !e._deathPhase;
}

// The densest spot on an 80px grid, keeping at least 200px above the ship.
function _capPickTarget() {
    const maxY = player.y - 200, r2 = CAP_MF_RADIUS * CAP_MF_RADIUS;
    let best = -1, bestHp = -1, bx = canvas.width / 2, by = Math.min(canvas.height * 0.37, maxY);
    for (let y = 80; y <= maxY; y += 80) {
        for (let x = 40; x < canvas.width; x += 80) {
            let count = 0, hp = 0;
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (!_capIsTarget(e)) continue;
                const dx = e.x - x, dy = e.y - y;
                if (dx * dx + dy * dy <= r2) { count++; hp += e.hp; }
            }
            if (count > best || (count === best && hp > bestHp)) { best = count; bestHp = hp; bx = x; by = y; }
        }
    }
    return { x: bx, y: Math.max(60, by) };
}

// The mountain breaks into three wall segments where it lands: an arc along
// its foot, centred under the impact, kept at least 120px clear of the ship.
function _capBuildMountain(x, y) {
    const width = canvas.width, span = width * 0.55, segW = span / 3 + 9, fallSize = Math.min(520, width * 0.95);
    const cx = Math.max(span * 0.54, Math.min(width - span * 0.54, x));
    const cy = Math.min(y + fallSize * 0.3, player.y - 120);
    const off = (segW - 7) * Math.cos(0.12), oy = Math.sin(0.24) * segW * 0.52;
    const st = { x, y, elapsed: 0, impacted: false, walls: [], fallSize, marks: 0 };
    for (let i = 0; i < 3; i++) {
        const a = (i - 1) * 0.24, c = Math.cos(a), s = Math.sin(a);
        const wx = cx + (i - 1) * off, wy = cy + (i === 1 ? 0 : oy);
        st.walls.push({ index: i, cx: wx, cy: wy, curX: x, curY: y, w: segW, angle: a, cos: c, sin: s, broken: false, brokenAt: 0, hitCount: 0 });
    }
    return st;
}

function _releaseCapricorn() {
    if (!window._capricornReady || window._capMountain || (player && player._silenced)) return false;
    const target = _capPickTarget();
    window._capMountain = _capBuildMountain(target.x, target.y);
    window._capLey = 0;
    window._capricornReady = false;
    if (typeof _capOnCast === 'function') _capOnCast(window._capMountain);
    if (window.AudioMgr) window.AudioMgr.playSfx('goliath-descend');
    return true;
}

function _capImpact(st) {
    st.impacted = true;
    const r2 = CAP_MF_RADIUS * CAP_MF_RADIUS;
    _capImpactSource.damage = CAP_MF_ATK * player.atk;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_capIsTarget(e)) continue;
        const dx = e.x - st.x, dy = e.y - st.y;
        if (dx * dx + dy * dy > r2) continue;
        if (_capCanBury(e)) e._capBuryMs = Math.max(e._capBuryMs || 0, CAP_MF_BURY_MS);
        dealDamage(e, _capImpactSource);
    }
    if (typeof _setShake === 'function') _setShake(_mobPerf ? 6 : 12, 420);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('goliath-verdict-impact', st.x, st.y);
}

// Local coordinates of a point in a wall's frame: lx along it, ly across.
function _capWallLocal(w, x, y, out) {
    const dx = x - w.curX, dy = y - w.curY;
    out.lx = dx * w.cos + dy * w.sin;
    out.ly = -dx * w.sin + dy * w.cos;
    return out;
}
const _capLocal = { lx: 0, ly: 0 };

function _capWallsUp(st) {
    return st && st.elapsed >= CAP_MF_WALL_FROM_MS && st.elapsed < CAP_MF_WALL_END_MS;
}

// Index of the standing wall a circle at (x, y) touches, or -1.
function _capWallAt(x, y, r) {
    const st = window._capMountain;
    if (!_capWallsUp(st)) return -1;
    for (let i = 0; i < 3; i++) {
        const w = st.walls[i];
        if (w.broken) continue;
        _capWallLocal(w, x, y, _capLocal);
        if (Math.abs(_capLocal.lx) <= w.w / 2 + r && Math.abs(_capLocal.ly) <= CAP_WALL_HALF_T + r) return i;
    }
    return -1;
}

function _capBreakWall(st, i) {
    const w = st.walls[i];
    if (w.broken) return;
    w.broken = true; w.brokenAt = st.elapsed;
    if (typeof _capOnWallHit === 'function') _capOnWallHit(st, w.curX, w.curY, 'skill');
    if (window.AudioMgr) window.AudioMgr.playSfxAt('dimension-break', w.curX, w.curY);
}

function _capIsGoliath(o) { return !!o && o.type === 'goliath'; }

// Launched enemy skills, the same arrays Dawn Herald can turn back. Goliath's
// own meteors and verdict orbs break a wall instead of being stopped.
function _capBlockArray(st, list, kind) {
    if (!list) return;
    const goliathOwned = kind === 'meteor' || kind === 'verdict';
    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        // Only skills already in flight, by the same test Dawn Herald uses.
        if (typeof _dauReflectEligible === 'function' && !_dauReflectEligible(kind, p)) continue;
        const wi = _capWallAt(p.x, p.y, p.radius || p.size / 2 || 8);
        if (wi < 0) continue;
        const owner = p.owner || p.ownerRef || p.enemy;
        if (goliathOwned || _capIsGoliath(owner)) { _capBreakWall(st, wi); continue; }
        if (typeof _capOnWallHit === 'function') _capOnWallHit(st, p.x, p.y, 'skill');
        st.walls[wi].hitCount++;
        for (let j = i; j < list.length - 1; j++) list[j] = list[j + 1];
        list.pop();
    }
}

function _capBlockEnemies(st) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || !Number.isFinite(e.x)) continue;
        if (e.type.startsWith('enemy_bullet')) {
            const wi = _capWallAt(e.x, e.y, (e.size || 8) / 2);
            if (wi < 0) continue;
            // Goliath's own shots pass the screens untouched, by his own rules.
            if (_capIsGoliath(e.ownerRef)) continue;
            e.hp = 0;
            st.walls[wi].hitCount++;
            if (typeof _capOnWallHit === 'function') _capOnWallHit(st, e.x, e.y, 'bullet');
            continue;
        }
        if (e.type === 'abyssal_chain') {
            const wi = _capWallAt(e.x, e.y, (e.size || 20) / 2);
            if (wi < 0) continue;
            if (typeof _capOnWallHit === 'function') _capOnWallHit(st, e.x, e.y, 'skill');
            enemies.splice(i, 1);
            continue;
        }
        // Goliath's body neither breaks nor is held by the screens; only his
        // meteors and Verdict orbs break them.
        if (e.type === 'veilshroud_echo' || e.type === 'goliath' || e._deathPhase) continue;
        const r = (e.size || 40) / 2;
        const wi = _capWallAt(e.x, e.y, r * 0.8);
        if (wi < 0) continue;
        // A body that reaches a wall is held on its far side from the ship.
        const w = st.walls[wi];
        _capWallLocal(w, e.x, e.y, _capLocal);
        const ly = -(CAP_WALL_HALF_T + r * 0.8);
        if (_capLocal.ly > ly) {
            e.x = w.curX + _capLocal.lx * w.cos - ly * w.sin;
            e.y = w.curY + _capLocal.lx * w.sin + ly * w.cos;
            if (!e._capBodyHitAt || window._capClock - e._capBodyHitAt > 400) {
                e._capBodyHitAt = window._capClock;
                if (typeof _capOnWallHit === 'function') _capOnWallHit(st, e.x, e.y + r * 0.6, 'body');
            }
        }
    }
}

// Segment test: does the line from (ax, ay) to (bx, by) cross a standing wall?
function _capWallCrossing(ax, ay, bx, by, out) {
    const st = window._capMountain;
    if (!_capWallsUp(st)) return false;
    for (let i = 0; i < 3; i++) {
        const w = st.walls[i];
        if (w.broken) continue;
        const hx = w.cos * w.w / 2, hy = w.sin * w.w / 2;
        const x1 = w.curX - hx, y1 = w.curY - hy, x2 = w.curX + hx, y2 = w.curY + hy;
        const d = (bx - ax) * (y2 - y1) - (by - ay) * (x2 - x1);
        if (Math.abs(d) < 1e-6) continue;
        const t = ((x1 - ax) * (y2 - y1) - (y1 - ay) * (x2 - x1)) / d;
        const u = ((x1 - ax) * (by - ay) - (y1 - ay) * (bx - ax)) / d;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            if (out) { out.x = ax + (bx - ax) * t; out.y = ay + (by - ay) * t; }
            return true;
        }
    }
    return false;
}
const _capCross = { x: 0, y: 0 };

// Called from playerTakesHit: beams, shockwaves and anything else that comes
// from an attacker on the far side of a wall is stopped by it. Goliath keeps
// his own rules and is never stopped.
function _capWallBlocksHit(attacker) {
    if (!window._capMountain || !attacker || !Number.isFinite(attacker.x) || !Number.isFinite(attacker.y)) return false;
    if (_capIsGoliath(attacker) || _capIsGoliath(attacker.ownerRef)) return false;
    if (!_capWallCrossing(attacker.x, attacker.y, player.x, player.y, _capCross)) return false;
    if (typeof _capOnWallHit === 'function') _capOnWallHit(window._capMountain, _capCross.x, _capCross.y, 'laser');
    return true;
}

function _capricornBeginFrame(deltaTime) {
    if (typeof _hasBuff !== 'function') return;
    if (!_hasBuff('lai_kep') && !_hasBuff('thai_son_ap_dinh')) { window._capMountain = null; return; }
    if ((typeof gameState !== 'undefined' && gameState !== 'playing')
        || (typeof gamePaused !== 'undefined' && gamePaused)
        || window._sigilPicker || window._kanadeCutscene) return;
    window._capClock += deltaTime;
    if (window._capStacks > 0) {
        window._capSinceGain += deltaTime;
        if (window._capSinceGain >= CAP_LOSS_MS) {
            window._capStacks = 0;
            if (typeof _capOnStacksLost === 'function') _capOnStacksLost();
        }
    }
    const st = window._capMountain;
    if (!st) return;
    st.elapsed += deltaTime;
    const slide = Math.max(0, Math.min(1, (st.elapsed - CAP_MF_IMPACT_MS) / 550));
    const ease = slide * slide * (3 - 2 * slide);
    for (let i = 0; i < 3; i++) {
        const w = st.walls[i];
        w.curX = st.x + (w.cx - st.x) * ease;
        w.curY = st.y + (w.cy - st.y) * ease;
    }
    if (!st.impacted && st.elapsed >= CAP_MF_IMPACT_MS) _capImpact(st);
    if (_capWallsUp(st)) {
        _capBlockEnemies(st);
        _capBlockArray(st, typeof marchosiasBlades !== 'undefined' ? marchosiasBlades : null, 'marchosias');
        _capBlockArray(st, window._urielHolySwords, 'uriel');
        _capBlockArray(st, typeof raphaelWisdomOrbs !== 'undefined' ? raphaelWisdomOrbs : null, 'raphael');
        _capBlockArray(st, window._goliathMeteors, 'meteor');
        _capBlockArray(st, window._goliathOrbs, 'verdict');
    }
    if (st.elapsed >= CAP_MF_END_MS) {
        window._capMountain = null;
        window._capricornReady = _hasBuff('thai_son_ap_dinh') && window._capLey >= 100;
    }
}
