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
    window._capBlockedCounts = { bullet: 0, skill: 0, laser: 0, body: 0, area: 0, debuff: 0 };
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
    _capRecordBlock(i, w.curX, w.curY, 'skill');
    if (window.AudioMgr) window.AudioMgr.playSfxAt('dimension-break', w.curX, w.curY);
}

function _capIsGoliath(o) {
    if (!o) return false;
    if (o._capSource) o = o._capSource;
    return o.type === 'goliath' || o._attackerType === 'goliath' || o._ownerType === 'goliath' || o._isUnbrokenWave === true
        || (o.ownerRef && o.ownerRef.type === 'goliath') || (o.owner && o.owner.type === 'goliath')
        || (o.enemy && o.enemy.type === 'goliath');
}

const _capCross = { x: 0, y: 0, wall: -1, t: 0 };

// Finds the nearest intersection with the full thickness of three screens.
function _capWallCrossing(ax, ay, bx, by, out, radius = 0) {
    const st = window._capMountain;
    if (!_capWallsUp(st)) return false;
    let best = Infinity, index = -1;
    for (let i = 0; i < 3; i++) {
        const w = st.walls[i];
        if (w.broken) continue;
        const dx = ax - w.curX, dy = ay - w.curY;
        const x = dx * w.cos + dy * w.sin, y = -dx * w.sin + dy * w.cos;
        const vx = (bx - ax) * w.cos + (by - ay) * w.sin;
        const vy = -(bx - ax) * w.sin + (by - ay) * w.cos;
        const hw = w.w / 2 + radius, ht = CAP_WALL_HALF_T + radius;
        let lo = 0, hi = 1;
        if (Math.abs(vx) < 1e-9) { if (Math.abs(x) > hw) continue; }
        else {
            const p = (-hw - x) / vx, q = (hw - x) / vx;
            lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q));
        }
        if (Math.abs(vy) < 1e-9) { if (Math.abs(y) > ht) continue; }
        else {
            const p = (-ht - y) / vy, q = (ht - y) / vy;
            lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q));
        }
        if (lo <= hi && lo < best) { best = lo; index = i; }
    }
    if (index < 0) return false;
    if (out) { out.x = ax + (bx - ax) * best; out.y = ay + (by - ay) * best; out.wall = index; out.t = best; }
    return true;
}

function _capRecordBlock(index, x, y, kind) {
    const st = window._capMountain;
    if (!st || index < 0) return;
    st.walls[index].hitCount++;
    const counts = window._capBlockedCounts;
    if (counts && counts[kind] !== undefined) counts[kind]++;
    if (typeof _capOnWallHit === 'function') _capOnWallHit(st, x, y, kind);
}

// Every enemy hit, area tick and debuff uses the same occlusion test.
function _capShields(srcX, srcY, targetX, targetY, kind = 'laser', owner = null) {
    if (!_capWallsUp(window._capMountain) || _capIsGoliath(owner)) return false;
    if (!Number.isFinite(srcX) || !Number.isFinite(srcY) || !Number.isFinite(targetX) || !Number.isFinite(targetY)) return false;
    if (!_capWallCrossing(srcX, srcY, targetX, targetY, _capCross)) return false;
    _capRecordBlock(_capCross.wall, _capCross.x, _capCross.y, kind);
    return true;
}

function _capBlocksSource(source, target, kind) {
    if (!_capWallsUp(window._capMountain) || !source || !target || source._isBTMWave || _capIsGoliath(source)) return false;
    const s = source._capSource || source;
    const x = Number.isFinite(s.ox) ? s.ox : Number.isFinite(s.cx) ? s.cx : s.start ? s.start.x : s.x;
    const y = Number.isFinite(s.oy) ? s.oy : Number.isFinite(s.cy) ? s.cy : s.start ? s.start.y : s.y;
    return _capShields(x, y, target.x, target.y, kind || source._capKind || 'laser', source);
}

function _capWallBlocksHit(attacker) { return _capBlocksSource(attacker, player); }

// Swept collision runs after movement and before any projectile hit code.
function _capStopProjectile(p, ax, ay, kind = 'skill', breaks = false, radius = 8) {
    if (!_capWallsUp(window._capMountain) || (!breaks && _capIsGoliath(p))) return false;
    if (!_capWallCrossing(ax, ay, p.x, p.y, _capCross, radius)) return false;
    if (breaks) { _capBreakWall(window._capMountain, _capCross.wall); return false; }
    _capRecordBlock(_capCross.wall, _capCross.x, _capCross.y, kind);
    return true;
}

function _capBlockArray(st, list, kind) {
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.life <= 0) continue;
        if (kind === 'marchosias' && (p.delay > 0 || p.active === false)) continue;
        if (kind === 'raphael' && p.phase !== 'launch') continue;
        const breaks = kind === 'meteor' || kind === 'verdict';
        const r = kind === 'uriel' ? 46 : kind === 'raphael' ? 21 : kind === 'verdict' ? 108 : kind === 'meteor' ? 46 : p.radius || 8;
        if (!_capStopProjectile(p, p.x, p.y, 'skill', breaks, r)) continue;
        for (let j = i; j < list.length - 1; j++) list[j] = list[j + 1];
        list.pop();
    }
}

// A body keeps its approach side and slides along the screen, including teleports.
function _capHoldBody(e, ax, ay) {
    if (!_capWallsUp(window._capMountain) || !e || _capIsGoliath(e) || e._deathPhase
        || e.type === 'veilshroud_echo' || e.type === 'thaelis_cocoon' || e.type === 'embryo') return;
    const r = (e.size || 40) * 0.4;
    let index = -1;
    if (_capWallCrossing(ax, ay, e.x, e.y, _capCross, r)) index = _capCross.wall;
    if (index < 0) return;
    const w = window._capMountain.walls[index];
    const prevY = -(ax - w.curX) * w.sin + (ay - w.curY) * w.cos;
    const side = prevY > CAP_WALL_HALF_T ? 1 : -1;
    const lx = Math.max(-w.w / 2 - r, Math.min(w.w / 2 + r, (e.x - w.curX) * w.cos + (e.y - w.curY) * w.sin));
    const ly = side * (CAP_WALL_HALF_T + r + 0.01);
    e.x = w.curX + lx * w.cos - ly * w.sin;
    e.y = w.curY + lx * w.sin + ly * w.cos;
    if (e._capBodyHitAt === undefined || window._capClock - e._capBodyHitAt >= 100) {
        e._capBodyHitAt = window._capClock;
        _capRecordBlock(index, _capCross.x, _capCross.y, 'body');
    }
}

function _capBlockEnemies(st) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || !Number.isFinite(e.x)) continue;
        if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain') {
            if (_capStopProjectile(e, e.x, e.y, e.type === 'abyssal_chain' ? 'skill' : 'bullet', false, e.size || 8)) e.hp = 0;
        } else _capHoldBody(e, e.x, e.y);
    }
}

function _capBeamLength(source, x, y, angle, length, record = false) {
    if (_capIsGoliath(source) || !_capWallsUp(window._capMountain)) return length;
    if (!_capWallCrossing(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length, _capCross)) return length;
    if (record && (!source || source._capBeamHitAt === undefined || window._capClock - source._capBeamHitAt >= 80)) {
        _capRecordBlock(_capCross.wall, _capCross.x, _capCross.y, 'laser');
        if (source) source._capBeamHitAt = window._capClock;
    }
    return length * _capCross.t;
}

// The wall shadow clips line effects and area rings in world coordinates.
function _capClipEnemyDraw(g, x, y, owner) {
    const st = window._capMountain;
    if (!_capWallsUp(st) || _capIsGoliath(owner)) return;
    const far = Math.hypot(canvas.width, canvas.height) * 8;
    for (let i = 0; i < 3; i++) {
        const w = st.walls[i];
        if (w.broken) continue;
        const side = (-(x - w.curX) * w.sin + (y - w.curY) * w.cos) > 0 ? 1 : -1;
        const cx = w.curX - w.sin * CAP_WALL_HALF_T * side, cy = w.curY + w.cos * CAP_WALL_HALF_T * side;
        const ax = cx - w.cos * w.w / 2, ay = cy - w.sin * w.w / 2;
        const bx = cx + w.cos * w.w / 2, by = cy + w.sin * w.w / 2;
        const ad = Math.hypot(ax - x, ay - y) || 1, bd = Math.hypot(bx - x, by - y) || 1;
        g.beginPath(); g.rect(-far, -far, far * 2, far * 2);
        g.moveTo(ax, ay); g.lineTo(bx, by);
        g.lineTo(bx + (bx - x) / bd * far, by + (by - y) / bd * far);
        g.lineTo(ax + (ax - x) / ad * far, ay + (ay - y) / ad * far); g.closePath();
        g.clip('evenodd');
    }
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
