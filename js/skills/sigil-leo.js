// Leo's Fate meter and dominant petrification use simulation time.
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
    window._leoPetrifyDuration = 0;
    window._leoPetrifySource = null;
    window._leoPetrifySerial = 0;
    window._thanMenhEndTime = 0;
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
            e._leoSilenceMs = 0;
            e._leoPetrifySerial = 0;
        }
    }
}

function _leoEnemyRank(e) {
    if (e.type === 'goliath' || e.type === 'dargruel' || e.type === 'leviathan') return 3;
    if (e.type === 'egregor' || e.type === 'raphael' || e.type === 'marchosias') return 2;
    if (e.type === 'veilshroud' || e.type === 'thaelis' || e.type === 'thaelis_guard' || e.type === 'uriel') return 1;
    return 0;
}

function _leoCanBurn(e) {
    return !!e && typeof e.type === 'string' && e.type !== 'sentinel' && e.type !== 'skillDSpaceship'
        && e.type !== 'spaceship' && !e.type.startsWith('enemy_bullet')
        && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo'
        && e.type !== 'thaelis_guard' && e.type !== 'thaelis_cocoon' && e.type !== 'uriel'
        && !e.inCoronation && !(e.type === 'raphael' && e.raphaelInvulnerable)
        && !(e.type === 'goliath' && (e.phase !== 'true_form' || _goliathDebuffImmune(e)));
}

function _leoAddBurn(e, stacks, now) {
    if (!_leoCanBurn(e) || !Number.isFinite(stacks) || stacks < 1) return;
    const old = window._sthBurning.get(e);
    const previous = old && Number.isFinite(old.stacks) ? Math.max(1, old.stacks) : 0;
    const count = Math.min(_stackCap('sunLionBurn'), previous + stacks);
    if (!Number.isFinite(count)) return;
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

function _leoRememberBurnKill(e) {
    const burn = window._sthBurning.get(e);
    if (burn && burn.expiry > performance.now() && Number.isFinite(burn.stacks)) {
        e._leoDeathBurn = { stacks: burn.stacks };
    }
    e._leoPlayerKill = true;
}

function _leoOnEnemyKill(e) {
    const now = performance.now();
    const active = window._sthBurning.get(e);
    const burn = e._leoDeathBurn || (active && active.expiry > now ? active : null);
    window._sthBurning.delete(e);
    if (e._leoKillHandled || e._noKillReward || e._noDrop || (!e._markedForDeath && !e._leoPlayerKill)
        || e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain'
        || e.type === 'veilshroud_echo' || e.hatched || e._cocoonHatched || e._coronationConsumed) return;
    e._leoKillHandled = true;
    if (!burn || !Number.isFinite(burn.stacks) || burn.stacks < 1) return;
    const rank = _leoEnemyRank(e);
    _leoChargeFate(rank === 3 ? LEO_FATE_DOMINATOR_KILL : rank > 0 ? LEO_FATE_ABNORMAL_KILL : LEO_FATE_APOSTLE_KILL);
    if (_hasBuff('su_tu_hong') && gloryForJusticeActive) {
        window._leoWildfirePending.push({ x: e.x, y: e.y, stacks: burn.stacks });
    }
}

function _leoVisual(fx) {
    if (window._leoVisuals.length < LEO_FX_MAX) window._leoVisuals.push(fx);
}

function _leoSpreadWildfire(now) {
    const pending = window._leoWildfirePending;
    if (!pending.length) return;
    window._leoWildfirePending = [];
    if (!_hasBuff('su_tu_hong') || !gloryForJusticeActive) return;
    for (const fire of pending) {
        const targets = enemies.filter(e => e.hp > 0 && !e._markedForDeath && !e._deathPhase && _leoCanBurn(e)
            && Math.hypot(e.x - fire.x, e.y - fire.y) <= LEO_WILDFIRE_RADIUS);
        targets.sort((a, b) => Math.hypot(a.x - fire.x, a.y - fire.y) - Math.hypot(b.x - fire.x, b.y - fire.y));
        _leoVisual({ kind: 'ring', x: fire.x, y: fire.y, age: 0, life: 350 });
        for (let i = 0; i < Math.min(LEO_WILDFIRE_TARGETS, targets.length); i++) {
            const e = targets[i];
            _leoAddBurn(e, Math.max(1, fire.stacks), now);
            _leoVisual({ kind: 'fire', x: fire.x, y: fire.y, tx: e.x, ty: e.y, age: 0, life: 380 });
        }
    }
}

function _leoCanPetrify(e) {
    return e.hp > 0 && !e._deathPhase && !e._markedForDeath && !e.dyingLaserPhase
        && !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain'
        && e.type !== 'veilshroud_echo'
        && !(e.type === 'thaelis_guard' && e._guardCocoon && e._guardCocoon.hp <= 0)
        && !(e.type === 'goliath' && e.phase !== 'true_form');
}

function _leoDargruelShockwave(e) {
    if (!e._thanMenhFrozen && !(e._leoSilenceMs > 0)) spawnBossShockwave(e.x, e.y, 'dargruel', 0.0095 * _enemyHs(e));
}

// Petrification cancels owned casts and starts their full native cooldowns.
function _leoInterruptSkills(e, now) {
    e._leoSilenceMs = LEO_FATE_SILENCE_MS;
    e._silencedEnd = Math.max(e._silencedEnd || 0, now + LEO_FATE_SILENCE_MS);
    if (Number.isFinite(e.shootTimer)) e.shootTimer = e.shootInterval || (e.type === 'raphael' ? 5000 : 1000);
    if (e.type === 'goliath') {
        if (e._verdictPhase === 'channeling') {
            e._verdictPhase = 'ready'; e._verdictChannelTimer = 0; e._verdictLocked = false;
            e._verdictCooldownEnd = now + 8000;
            if (window.AudioMgr) window.AudioMgr.stopGoliathVerdictCharge();
        }
        if (e._meteorPhase === 'charging') {
            e._meteorPhase = 'ready'; e._meteorChargeTimer = 0; e._meteorTargets = [];
            e._meteorCooldownEnd = now + 4000;
        }
        if (e._fractureTeleportPhase === 'closing' || e._fractureTeleportPhase === 'opening') {
            e._fractureTeleportPhase = 'idle'; e._fractureTeleportStart = 0;
            e._fractureStepCooldownEnd = now + 2000;
            e._weaveEnterX = e.x; e._weaveEnterY = e.y; e._weaveEnterAt = now;
        }
        e._wasCasting = false;
        e._weaveWasHeld = false;
    } else if (e.type === 'egregor') {
        if (e._tempestPhase !== 'ready') {
            e._tempestPhase = 'ready'; e._tempestTargets = [];
            e._tempestCooldownEnd = now + 4000 * ((e._rageStacks || 0) > 0 ? 0.85 : 1);
        }
        if (e._nullSlashPhase !== 'ready') {
            e._nullSlashPhase = 'ready'; e._nullSlashWindupTimer = 0; e._nullSlashStrikeTimer = 0;
            e._nullSlashTentPts = null; e._boonBaneVessel = 0; e._boonBaneVesselTotal = 0;
            e._nullSlashCooldownEnd = now + 3500;
            if (window.AudioMgr) window.AudioMgr.stopNullSlashWindup();
        }
    } else if (e.type === 'veilshroud') {
        e.inPhantom = false; e.phantomTimer = 0; e.phantomCheckTimer = 0;
        e.lightningPending = false; e.lightningCountdown = 0; e.lightningTargetRef = null;
        e._phantomAbsorb = 0;
    } else if (e.type === 'uriel') {
        if (e._swordCharging || e._swordFiring || e._urielSwordQueued > 0) {
            e._swordCharging = false; e._swordFiring = false; e._urielSwordQueued = 0;
            e._urielSoloJudgmentTimer = 0;
        }
        if (e._camoPhase !== 'idle') {
            e._camoPhase = 'idle'; e._camoTimer = 0; e._stealthed = false;
            e._stealthIBEnd = 0; e.ironBodyHits = Math.min(e.ironBodyHits || 0, 1);
            e._camoCDReadyAt = now + 3000;
        }
    } else if (e.type === 'marchosias') {
        if (e.marchosiasWindups && e.marchosiasWindups.length) {
            e.marchosiasWindups.length = 0; e.lastSwordTriggerTime = now;
        }
        if (e._ghostWindups) e._ghostWindups.length = 0;
    } else if (e.type === 'dargruel') {
        e._chainWindupActive = false;
        e.chainTimer = 2100;
    } else if (e.type === 'leviathan') {
        const beamActive = _hasPersBeam(e);
        if (e.perseveranceCharging || e.afoAnnouncing || beamActive) {
            e.perseveranceCharging = false; e.perseveranceFiring = false;
            e.afoAnnouncePending = false; e.afoAnnouncing = false;
            e.perseveranceCooldown = now + 2000;
            if (window._levPersBeams) {
                for (const beam of window._levPersBeams) if (beam.ownerRef === e) beam.done = true;
            }
        }
    }
    if (e.type === 'raphael') {
        for (let i = raphaelLasers.length - 1; i >= 0; i--) {
            if (raphaelLasers[i].owner === e && !raphaelLasers[i].fired) raphaelLasers.splice(i, 1);
        }
        for (let i = raphaelWisdomOrbs.length - 1; i >= 0; i--) {
            if (raphaelWisdomOrbs[i].enemy === e && raphaelWisdomOrbs[i].phase === 'gather') raphaelWisdomOrbs.splice(i, 1);
        }
        e._wisdomOrbLastLaunchAt = now;
    }
}

// Only owned action clocks move. Buffs, DoTs and launched objects keep their clocks.
const _leoActionClocks = [
    '_verdictCooldownEnd', '_meteorCooldownEnd',
    '_castEndRecoveryCooldownEnd', '_fractureStepCooldownEnd', '_lastFractureAt',
    '_fractureTeleportStart', '_weaveEnterAt', '_tempestCooldownEnd', '_nullSlashCooldownEnd',
    '_bodyHitCooldownEnd', '_camoCDReadyAt', '_swordChargeStart', '_swordReleaseAt',
    '_lastLightningTime', 'lastSwordTriggerTime',
    'perseveranceChargeStart', 'perseveranceCooldown', '_wisdomOrbLastLaunchAt'
];

function _leoShiftClocks(e, delay) {
    if (!Number.isFinite(delay) || delay <= 0) return;
    for (const key of _leoActionClocks) {
        if (Number.isFinite(e[key]) && e[key] > 0) e[key] += delay;
    }
}

function _leoFreezeEnemy(e, now) {
    const frozen = window._leoPetrifyMs > 0 && _hasBuff('than_menh') && _leoCanPetrify(e);
    if (e._thanMenhFrozen && e._leoPetrifyLastAt != null) _leoShiftClocks(e, now - e._leoPetrifyLastAt);
    if (frozen && e._leoPetrifySerial !== window._leoPetrifySerial) {
        e._leoStoneStarted = window._leoFxClock;
        e._leoPetrifySerial = window._leoPetrifySerial;
        _leoInterruptSkills(e, now);
    }
    if (!frozen && e._thanMenhFrozen) {
        _leoVisual({ kind: 'stone', x: e.x, y: e.y, r: Math.min(100, e.size / 2), age: 0, life: 450 });
    }
    e._thanMenhFrozen = frozen;
    e._leoPetrifyLastAt = frozen ? now : null;
    if (frozen && e.type === 'goliath' && _goliathDebuffImmune(e)) _goliathClearDebuffs(e);
    return frozen;
}

function _leoStartPetrify(duration, source) {
    window._leoPetrifySerial++;
    window._leoPetrifyMs = Math.max(window._leoPetrifyMs || 0, duration);
    window._leoPetrifyDuration = window._leoPetrifyMs;
    window._leoPetrifySource = source;
    window._thanMenhEndTime = performance.now() + window._leoPetrifyMs;
    window._leoFateWaveMs = 500;
    for (const e of enemies) _leoFreezeEnemy(e, performance.now());
    if (typeof _setShake === 'function') _setShake(4, 180);
    if (window.AudioMgr) window.AudioMgr.playSfx('goliath-unbroken-wave');
}

function _releaseLeoFate() {
    if (!window._leoFateReady || !_leoHasFateMeter() || player._silenced
        || gameState !== 'playing' || gamePaused || window._sigilPicker || window._kanadeCutscene
        || window._leoPetrifyMs > 0) return false;
    window._leoFateMeter = 0;
    window._leoFateReady = false;
    if (charging) {
        charging = false;
        if (window.AudioMgr) window.AudioMgr.stopCharging();
    }
    player.atk = PLAYER_BASE_ATK * _playerAtkWaveMult(_waveNumber) * _sigilAtkMult() * _playerAtkDebuffMult() * _playerAtkBuffMult();
    _leoStartPetrify(LEO_FATE_ACTIVE_MS, 'meter');
    return true;
}

// All Space controls consume at most one banked sigil, in Cancer then Leo order.
function _releaseReadySpaceSigil() {
    if (gameState !== 'playing' || gamePaused || window._sigilPicker || window._kanadeCutscene || player._silenced) return false;
    if (window._tidalSurgeReady) {
        if (charging) {
            charging = false;
            if (window.AudioMgr) window.AudioMgr.stopCharging();
        }
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
        if (left <= 0) window._leoFateRestMs = Math.max(0, LEO_FATE_REST_MS + left);
    } else {
        window._leoFateRestMs = Math.max(0, window._leoFateRestMs - deltaTime);
    }
    window._thanMenhEndTime = window._leoPetrifyMs > 0 ? now + window._leoPetrifyMs : 0;
    for (const e of enemies) {
        e._leoSilenceMs = Math.max(0, (e._leoSilenceMs || 0) - deltaTime);
        if (e._thanMenhFrozen && Number.isFinite(e._arcBarrierReviveAt)) e._arcBarrierReviveAt += deltaTime;
        _leoFreezeEnemy(e, now);
    }
    if (enemies.some(e => e.type === 'goliath' && e.phase === 'true_form'
        && e.hp > 0 && !e._deathPhase && !e._markedForDeath)) {
        _leoChargeFate(LEO_FATE_GOLIATH_CHARGE_PER_SECOND * deltaTime / 1000);
    }
    for (let i = window._leoVisuals.length - 1; i >= 0; i--) {
        const fx = window._leoVisuals[i];
        fx.age += deltaTime;
        if (fx.age >= fx.life) window._leoVisuals.splice(i, 1);
    }
    _leoSpreadWildfire(now);
    for (const [e, burn] of window._sthBurning) {
        if (!enemies.includes(e) || now >= burn.expiry) window._sthBurning.delete(e);
    }
}

function _leoSyncSuspension(suspended, now) {
    if (suspended) {
        if (window._leoSuspendedAt == null) window._leoSuspendedAt = now;
    } else if (window._leoSuspendedAt != null) {
        const delay = Math.max(0, now - window._leoSuspendedAt);
        for (const burn of window._sthBurning.values()) {
            burn.nextTick += delay; burn.expiry += delay;
        }
        window._leoSuspendedAt = null;
    }
}

_leoReset();
