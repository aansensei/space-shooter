// Pisces: Space Journey. © 2024 An Nguyen. Licensed under the MIT License.
// Leo sigil mechanics: Lion's Roar Burn and Wildfire, the Divine Fate meter,
// and dominant petrification. Petrify and the meter run on game time; Burn
// windows run on performance.now() and are shifted across pauses.

function _leoHasFateMeter() {
    return _hasBuff('su_tu_hong') && _hasBuff('than_menh');
}

function _leoFatePercent() {
    return _leoHasFateMeter() && Number.isFinite(window._leoFateMeter)
        ? Math.max(0, Math.min(LEO_FATE_METER_MAX, window._leoFateMeter)) : 0;
}

function _leoReset() {
    window._leoFateMeter = 0;
    window._leoFateReady = false;
    window._leoFateRestMs = 0;
    window._leoPetrifyMs = 0;
    window._leoRestAfterPetrify = false;
    window._leoFxClock = 0;
    window._leoChargeFlashMs = 0;
    window._leoFateWaveMs = 0;
    window._leoWildfirePending = [];
    window._leoVisuals = [];
    window._leoSuspendedAt = null;
    window._leoHudTop = null;
    window._sthBurning = new Map();
    if (typeof enemies !== 'undefined') {
        for (const e of enemies) {
            e._thanMenhFrozen = false;
            e._leoPetrifyLastAt = null;
            e._leoDeathBurn = null;
        }
    }
}

// 3 = Dominator (and Goliath), 2 = Elite, 1 = Abnormal, 0 = everything else.
function _leoEnemyRank(e) {
    if (e.type === 'goliath' || e.type === 'dargruel' || e.type === 'leviathan') return 3;
    if (e.type === 'egregor' || e.type === 'raphael' || e.type === 'marchosias') return 2;
    if (e.type === 'veilshroud' || e.type === 'thaelis' || e.type === 'thaelis_guard' || e.type === 'uriel') return 1;
    return 0;
}

// False for targets whose DoT immunity in dealDamage blocks every Burn tick.
function _leoCanBurn(e) {
    return !!e && e.type !== 'thaelis_guard' && e.type !== 'thaelis_cocoon' && e.type !== 'uriel'
        && !(e.type === 'raphael' && e.raphaelInvulnerable) && !_goliathDebuffImmune(e);
}

function _leoCanCatchWildfire(e) {
    return e.hp > 0 && !e._markedForDeath && !e._deathPhase && !e.inCoronation && _leoCanBurn(e)
        && !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo'
        && e.type !== 'sentinel' && e.type !== 'skillDSpaceship' && e.type !== 'spaceship';
}

// A landed hit adds one stack up to the cap; Wildfire raises the target to
// the source's stack count. Both refresh the 3s window.
function _leoAddBurn(e, stacks, now, raiseTo) {
    if (!Number.isFinite(stacks) || stacks < 1) return;
    const cap = _stackCap('sunLionBurn');
    const old = window._sthBurning.get(e);
    const previous = old && Number.isFinite(old.stacks) ? old.stacks : 0;
    const count = Math.min(cap, raiseTo ? Math.max(previous, stacks) : previous + stacks);
    if (!Number.isFinite(count) || count < 1) return;
    if (old) {
        old.stacks = count;
        old.expiry = now + LEO_BURN_DURATION_MS;
    } else {
        window._sthBurning.set(e, { stacks: count, nextTick: now + LEO_BURN_TICK_MS, expiry: now + LEO_BURN_DURATION_MS });
    }
}

function _leoChargeFate(amount) {
    if (!_leoHasFateMeter() || !Number.isFinite(amount) || amount <= 0
        || window._leoFateReady || window._leoPetrifyMs > 0 || window._leoFateRestMs > 0) return;
    window._leoFateMeter = Math.min(LEO_FATE_METER_MAX, _leoFatePercent() + amount);
    window._leoFateReady = window._leoFateMeter >= LEO_FATE_METER_MAX;
    window._leoChargeFlashMs = 300;
}

// Runs from handleEnemyKill, before the enemy leaves the array.
function _leoOnEnemyKill(e) {
    const active = window._sthBurning.get(e);
    const burn = e._leoDeathBurn || (active && active.expiry > performance.now() ? active : null);
    window._sthBurning.delete(e);
    if (!burn || e._noKillReward || e.type.startsWith('enemy_bullet') || e.type === 'veilshroud_echo') return;
    const stacks = Math.min(_stackCap('sunLionBurn'), Number.isFinite(burn.stacks) ? burn.stacks : 0);
    if (!(stacks >= 1)) return;
    const rank = _leoEnemyRank(e);
    _leoChargeFate(rank === 3 ? LEO_FATE_DOMINATOR_KILL : rank > 0 ? LEO_FATE_ABNORMAL_KILL : LEO_FATE_APOSTLE_KILL);
    if (_hasBuff('su_tu_hong') && gloryForJusticeActive && Number.isFinite(e.x) && Number.isFinite(e.y)) {
        window._leoWildfirePending.push({ x: e.x, y: e.y, stacks });
    }
}

function _leoVisual(fx) {
    if (window._leoVisuals.length < LEO_FX_MAX) window._leoVisuals.push(fx);
}

const _leoWildfireTargets = [];
const _leoWildfireDist = [];

// Spreads the previous frame's kills, so a death caused by the spread itself
// can only spread again on a later frame. The enemies array is only read.
function _leoSpreadWildfire(now) {
    const pending = window._leoWildfirePending;
    if (!pending.length) return;
    window._leoWildfirePending = [];
    if (!_hasBuff('su_tu_hong') || !gloryForJusticeActive) return;
    for (const fire of pending) {
        // Nearest LEO_WILDFIRE_TARGETS eligible enemies, kept sorted by distance.
        _leoWildfireTargets.length = 0; _leoWildfireDist.length = 0;
        for (const e of enemies) {
            if (!_leoCanCatchWildfire(e)) continue;
            const d = Math.hypot(e.x - fire.x, e.y - fire.y);
            if (!(d <= LEO_WILDFIRE_RADIUS)) continue;
            let at = _leoWildfireTargets.length;
            while (at > 0 && _leoWildfireDist[at - 1] > d) at--;
            if (at >= LEO_WILDFIRE_TARGETS) continue;
            _leoWildfireTargets.splice(at, 0, e); _leoWildfireDist.splice(at, 0, d);
            if (_leoWildfireTargets.length > LEO_WILDFIRE_TARGETS) { _leoWildfireTargets.pop(); _leoWildfireDist.pop(); }
        }
        _leoVisual({ kind: 'ring', x: fire.x, y: fire.y, age: 0, life: 350 });
        for (const e of _leoWildfireTargets) {
            _leoAddBurn(e, fire.stacks, now, true);
            _leoVisual({ kind: 'fire', x: fire.x, y: fire.y, tx: e.x, ty: e.y, age: 0, life: 380 });
        }
    }
    _leoWildfireTargets.length = 0;
}

// Projectiles and lingering hazards fly on. Goliath outside True Form and
// every death sequence are left alone.
function _leoCanPetrify(e) {
    return e.hp > 0 && !e._deathPhase && !e._markedForDeath && !e.dyingLaserPhase
        && !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo'
        && !(e.type === 'thaelis_guard' && e._guardCocoon && e._guardCocoon.hp <= 0)
        && !(e.type === 'goliath' && e.phase !== 'true_form');
}

// performance.now() action clocks. A petrified enemy's update is skipped, so
// game-time timers stand still on their own; these are pushed forward by the
// petrified time instead, so cooldowns and casts resume where they stopped.
// Buff and debuff windows are not listed and keep running, and neither are
// Goliath's Endless Echo and Joker clocks, since those skills keep running.
const _leoActionClocks = [
    '_verdictCooldownEnd', '_meteorCooldownEnd',
    '_castEndRecoveryCooldownEnd', '_fractureStepCooldownEnd', '_lastFractureAt',
    '_fractureTeleportStart', '_weaveEnterAt',
    '_tempestCooldownEnd', '_nullSlashCooldownEnd', '_bodyHitCooldownEnd',
    '_camoCDReadyAt', '_stealthIBEnd', '_swordChargeStart', '_swordReleaseAt', '_judgmentCooldownEnd',
    '_lastLightningTime', 'lastSwordTriggerTime', '_wisdomOrbLastLaunchAt',
    'perseveranceChargeStart', 'perseveranceCooldown',
];

function _leoShiftClocks(e, delay) {
    if (!Number.isFinite(delay) || delay <= 0) return;
    for (const key of _leoActionClocks) {
        if (Number.isFinite(e[key]) && e[key] > 0) e[key] += delay;
    }
}

// Channel loops go quiet while the caster is stone and resume with the cast.
function _leoSyncCastAudio(e, frozen) {
    if (!window.AudioMgr) return;
    if (e.type === 'goliath' && e._verdictPhase === 'channeling') {
        if (frozen) window.AudioMgr.stopGoliathVerdictCharge(); else window.AudioMgr.startGoliathVerdictCharge();
    }
    if (e.type === 'egregor' && e._nullSlashPhase === 'charging') {
        if (frozen) window.AudioMgr.stopNullSlashWindup(); else window.AudioMgr.startNullSlashWindup();
    }
}

// Called for every enemy from the main update loop. Returns true when the
// enemy is petrified and its own update must be skipped this frame.
function _leoFreezeEnemy(e, now, deltaTime) {
    const frozen = window._leoPetrifyMs > 0 && _leoCanPetrify(e);
    if (e._thanMenhFrozen && e._leoPetrifyLastAt != null) _leoShiftClocks(e, now - e._leoPetrifyLastAt);
    if (frozen && e._thanMenhFrozen && Number.isFinite(e._arcBarrierReviveAt)) e._arcBarrierReviveAt += deltaTime;
    if (frozen && !e._thanMenhFrozen) {
        e._leoStoneStarted = window._leoFxClock;
        _leoSyncCastAudio(e, true);
    } else if (!frozen && e._thanMenhFrozen) {
        const r = Math.min(100, (e.size || 40) / 2);
        // The stone shatters when the petrify runs out, for 100% ATK. An enemy
        // released early by dying or a death sequence only crumbles.
        if (!(window._leoPetrifyMs > 0) && e.hp > 0 && !e._deathPhase && !e._markedForDeath) {
            _leoVisual({ kind: 'shatter', x: e.x, y: e.y, r, seed: Math.random() * 6.283, age: 0, life: 560 });
            if (window.AudioMgr && window._leoShatterSfxAt !== now) {
                window._leoShatterSfxAt = now;
                window.AudioMgr.playSfx('dimension-break');
            }
            const dmg = LEO_FATE_SHATTER_ATK * player.atk;
            if (Number.isFinite(dmg) && dmg > 0) dealDamage(e, { damage: dmg, percentDamage: 0, _statSrc: 'Divine Fate: Shatter' });
        } else {
            _leoVisual({ kind: 'stone', x: e.x, y: e.y, r, age: 0, life: 450 });
        }
        if (e.hp > 0 && !e._deathPhase && !e._markedForDeath) _leoSyncCastAudio(e, false);
        // An outside pull may have moved him, so he blends back into his path.
        if (e.type === 'goliath' && e.phase === 'true_form') {
            e._weaveEnterX = e.x; e._weaveEnterY = e.y; e._weaveEnterAt = now;
        }
    }
    e._thanMenhFrozen = frozen;
    e._leoPetrifyLastAt = frozen ? now : null;
    // updateGoliath is skipped while he is stone, so Unbroken Will's
    // per-frame debuff sweep runs here. It never touches petrification.
    if (frozen && e.type === 'goliath' && _goliathDebuffImmune(e)) _goliathClearDebuffs(e);
    return frozen;
}

// Wave start and the meter share one petrify window; the longer one wins.
function _leoStartPetrify(duration, fromMeter) {
    window._leoPetrifyMs = Math.max(window._leoPetrifyMs || 0, duration);
    if (fromMeter) window._leoRestAfterPetrify = true;
    window._leoFateWaveMs = 500;
    if (typeof _setShake === 'function') _setShake(4, 180);
    if (window.AudioMgr) window.AudioMgr.playSfx('goliath-unbroken-wave');
}

function _releaseLeoFate() {
    if (!window._leoFateReady || !_leoHasFateMeter() || player._silenced
        || gameState !== 'playing' || gamePaused || window._sigilPicker || window._kanadeCutscene
        || window._leoPetrifyMs > 0) return false;
    window._leoFateMeter = 0;
    window._leoFateReady = false;
    player.atk = PLAYER_BASE_ATK * _playerAtkWaveMult(_waveNumber) * _sigilAtkMult() * _playerAtkDebuffMult() * _playerAtkBuffMult();
    _leoStartPetrify(LEO_FATE_ACTIVE_MS, true);
    return true;
}

// Space and the mobile CHARGE button release one banked sigil per press,
// Cancer before Leo.
function _releaseReadySpaceSigil() {
    if (window._tidalSurgeReady) {
        _releaseTidalSurge();
        return true;
    }
    return _releaseLeoFate();
}

function _leoBeginFrame(deltaTime, now) {
    window._leoFxClock += deltaTime;
    window._leoChargeFlashMs = Math.max(0, window._leoChargeFlashMs - deltaTime);
    window._leoFateWaveMs = Math.max(0, window._leoFateWaveMs - deltaTime);
    if (window._leoPetrifyMs > 0) {
        const left = window._leoPetrifyMs - deltaTime;
        window._leoPetrifyMs = Math.max(0, left);
        if (left <= 0 && window._leoRestAfterPetrify) {
            window._leoRestAfterPetrify = false;
            window._leoFateRestMs = Math.max(0, LEO_FATE_REST_MS + left);
        }
    } else {
        window._leoFateRestMs = Math.max(0, window._leoFateRestMs - deltaTime);
    }
    for (let i = window._leoVisuals.length - 1; i >= 0; i--) {
        const fx = window._leoVisuals[i];
        fx.age += deltaTime;
        if (fx.age >= fx.life) window._leoVisuals.splice(i, 1);
    }
    _leoSpreadWildfire(now);
    for (const [e, burn] of window._sthBurning) {
        // A death sequence (Goliath's runs for seconds) can outlast the Burn
        // window, so the stacks carried into it count for the kill at its end.
        if (e._deathPhase && !e._leoDeathBurn && now < burn.expiry && Number.isFinite(burn.stacks)) {
            e._leoDeathBurn = { stacks: burn.stacks };
        }
        if (now >= burn.expiry) window._sthBurning.delete(e);
    }
}

// Pauses, the sigil picker and Kanade's cutscene stop update(), so Burn
// windows and petrified clocks are moved past the time spent suspended.
function _leoSyncSuspension(suspended, now) {
    if (suspended) {
        if (window._leoSuspendedAt == null) window._leoSuspendedAt = now;
    } else if (window._leoSuspendedAt != null) {
        const delay = Math.max(0, now - window._leoSuspendedAt);
        for (const burn of window._sthBurning.values()) {
            burn.nextTick += delay; burn.expiry += delay;
        }
        for (const e of enemies) {
            if (e._leoPetrifyLastAt != null) e._leoPetrifyLastAt += delay;
        }
        window._leoSuspendedAt = null;
    }
}

_leoReset();
