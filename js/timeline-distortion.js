// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// timeline-distortion.js — Kanade's boss-wave modifier system (game logic).
// Every boss wave (_waveNumber % 5 === 0) rolls one paired effect from the
// pool below and applies it for that fight only. The cutscene that presents
// it lives in js/render/kanade-cutscene.js; this file works on its own when
// that cutscene is skipped.

// Single source of truth for every hard-capped stack mechanic in the game,
// both sides. `base` is the normal ceiling; each cap site reads _stackCap()
// instead of writing its own number inline, so Stack Overflow lifts all of
// them at once and clearing it puts every one back exactly where it was.
const TIMELINE_STACK_CAPS = {
    // Deliberately not lifted. Vulnerability's stacks are not a plain counter:
    // reaching 4 is what opens the true-damage window, and the window expiring
    // is what resets them. Uncapped, Goliath could climb past 4 while its own
    // 5s window cooldown was still running, never hit the trigger again, and
    // sit on 20-plus permanent stacks with no reset in sight. It stays at 4.
    vulnerability:       { side: 'player', base: 4, overflow: false, where: 'js/entities/core.js applyVulnerability' },
    teslaCoil:           { side: 'player', base: TESLA_STACK_MAX, where: 'js/skills/skill-g.js _launchTeslaBolt' },
    chainLightning:      { side: 'player', base: 6,               where: 'js/skills/skill-g.js orb pairing' },
    avalancheStacks:     { side: 'player', base: 80,              where: 'js/entities/core.js kill hook' },
    avalancheMult:       { side: 'player', base: 0.40,            where: 'js/entities/core.js dealDamage' },
    sunLionBurn:         { side: 'player', base: 3,               where: 'js/entities/core.js + js/main.js burn DoT' },
    spiritBounce:        { side: 'player', base: 3,               where: 'js/skills/skill-s-spirit.js wall bounce' },
    walpurgisHealShield: { side: 'enemy',  base: 0.30,            where: 'js/config.js _walpurgisHealShieldMult' },
    walpurgisFlatDR:     { side: 'enemy',  base: 100,             where: 'js/config.js _walpurgisFlatDR' },
    egregorRageDR:       { side: 'enemy',  base: 0.25,            where: 'js/entities/core.js tentacle damage' },
};

// Walpurgis's evade bonus (_walpurgisEvadeBonus, capped at 0.40) is
// deliberately absent from that list. It grows 0.05 per 5-wave stack, so
// uncapped it crosses 100% evade around wave 100 and the boss stops being
// killable at all — that's a dead run, not a risk worth taking.

// What a cap site asks for instead of hardcoding its own ceiling.
function _stackCap(id) {
    const entry = TIMELINE_STACK_CAPS[id];
    if (!entry) return Infinity;
    if (entry.overflow === false) return entry.base;
    return window._stackOverflowActive ? Infinity : entry.base;
}

const TIMELINE_DISTORTION_ART = {
    stack_overflow: {
        accent: '#a052ff',
        banner: 'assets/images/game/effects/timeline-distortion-banner.png',
        playerIcon: 'assets/images/game/icons/timeline-distortion-player.png',
        enemyIcon: 'assets/images/game/icons/timeline-distortion-enemy.png',
    },
};
for (const [id, accent] of Object.entries({
    spacetime_flow: '#38e8ff', administrators_favor: '#f5c451', adaptive_counter: '#3ddc97',
})) {
    TIMELINE_DISTORTION_ART[id] = {
        accent,
        banner: 'assets/images/game/effects/timeline-distortion-banner-' + id + '.png',
        playerIcon: 'assets/images/game/icons/timeline-distortion-player-' + id + '.png',
        enemyIcon: 'assets/images/game/icons/timeline-distortion-enemy-' + id + '.png',
    };
}

const _tdColorCache = {};
function _timelineDistortionColors(accent) {
    if (_tdColorCache[accent]) return _tdColorCache[accent];
    const legacy = {
        flash: 'rgba(200,150,255,1)', rays: 'rgba(232,200,255,1)',
        ring: 'rgba(236,210,255,1)', accent: 'rgba(160,82,255,1)',
        trail: 'rgba(214,176,255,1)', bolt: 'rgba(150,70,255,1)',
        boltCore: 'rgba(246,232,255,1)', border: '#6a3caa',
        glow: '#8a44ff', title: '#e2c8ff',
    };
    if (accent === TIMELINE_DISTORTION_ART.stack_overflow.accent) {
        return (_tdColorCache[accent] = legacy);
    }
    const rgb = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16));
    const tint = amount => 'rgba(' + rgb.map(v => Math.round(v + (255 - v) * amount)).join(',') + ',1)';
    return (_tdColorCache[accent] = {
        flash: tint(0.4), rays: tint(0.7), ring: tint(0.75), accent: tint(0),
        trail: tint(0.55), bolt: tint(0), boltCore: tint(0.9),
        border: tint(0), glow: tint(0), title: tint(0.7),
    });
}

function _timelineDistortionName(effect) {
    return window._lang === 'vi' && effect.nameVi ? effect.nameVi : effect.name;
}

const _tdBossCooldowns = ['_verdictCooldownEnd', '_meteorCooldownEnd', '_echoCooldownEnd', '_fractureStepCooldownEnd'];
const _tdJokerCooldowns = ['cooldownEnd', 'nextFireAt', 'reviveAt'];
function _tickTimelineFlowBoss(enemy, deltaTime, now) {
    if (!window._spacetimeFlowActive || enemy.type !== 'goliath' || enemy._deathPhase) return;
    const advance = TD_FLOW_ENEMY_CD * deltaTime;
    for (const key of _tdBossCooldowns) {
        if (enemy[key] > now) enemy[key] = Math.max(now, enemy[key] - advance);
    }
    for (const name in enemy._jokerState) {
        const state = enemy._jokerState[name];
        for (const key of _tdJokerCooldowns) {
            if (state[key] > now) state[key] = Math.max(now, state[key] - advance);
        }
        if (state.lastSwordTriggerAt && now - state.lastSwordTriggerAt < TD_FLOW_JOKER_SWORD_CD) state.lastSwordTriggerAt -= advance;
    }
}

const TD_FAVOR_EXTRA_TYPES = { marchosias: true, veilshroud: true, uriel: true };
function _timelineFavorEligible(type) {
    return !!(ADMIN_BLESSING_TYPES[type] || TD_FAVOR_EXTRA_TYPES[type]);
}

function _grantTimelineFavorSentinels() {
    if (!window._administratorsFavorActive) return;
    for (const s of sentinels) {
        if (s.hp <= 0 || s._tdFavorShieldGiven) continue;
        s._tdFavorShieldGiven = true;
        s._tdFavorShield = _addAllyShield(s, TD_FAVOR_SENTINEL_SHIELD_BASE + TD_FAVOR_SENTINEL_SHIELD_PER_WAVE * _waveNumber);
    }
}

function _consumeTimelineFavorShield(unit, amount) {
    if (unit._tdFavorShield > 0) unit._tdFavorShield = Math.max(0, unit._tdFavorShield - amount);
}

function _updateTimelineDistortion(deltaTime, now) {
    if (window._spacetimeFlowActive) {
        const advance = TD_FLOW_PLAYER_CD * deltaTime;
        if (!skillAActive && now - lastSkillA < _skillACooldown()) lastSkillA -= Math.min(advance, _skillACooldown() - (now - lastSkillA));
        if (!spirits.length && now - lastSkillS < skillSCooldown) lastSkillS -= Math.min(advance, skillSCooldown - (now - lastSkillS));
        if (!skillDCharging && !deathStar && now - lastSkillD < skillDCooldown) lastSkillD -= Math.min(advance, skillDCooldown - (now - lastSkillD));
        if (skillFState === 'ready' && now - lastSkillF < skillFCooldown) lastSkillF -= Math.min(advance, skillFCooldown - (now - lastSkillF));
    }
    if (window._administratorsFavorActive) {
        for (const enemy of enemies) {
            if (!_timelineFavorEligible(enemy.type) || window._tdFavorSeenEnemies.has(enemy)) continue;
            window._tdFavorSeenEnemies.add(enemy);
            _tryAdminBlessing(enemy);
        }
        if (!window._tdFavorPlayerShield) {
            window._tdFavorRecharge = Math.max(0, window._tdFavorRecharge - deltaTime);
            if (!window._tdFavorRecharge) window._tdFavorPlayerShield = true;
        }
        _grantTimelineFavorSentinels();
    }
}

function _recordAdaptiveSkill(skill) {
    const state = window._adaptiveCounterState;
    if (!state) return;
    if (state.last === skill) {
        state.resistance[skill] = Math.min(TD_ADAPT_CAP, state.resistance[skill] + TD_ADAPT_STEP);
        state.fresh = false;
    } else {
        for (const key of Object.keys(state.resistance)) state.resistance[key] = 0;
        state.fresh = true;
    }
    state.last = skill;
}

function _adaptiveSkillMult(source, enemy) {
    const state = window._adaptiveCounterState;
    if (!state || enemy.type !== 'goliath' || enemy.phase !== 'true_form') return 1;
    if (source.isPhoto || source._isPhotoSourced || source.isSpirit || source.type === 'sentinel_auto' || source.type === 'sentinel_special') return 1;
    const label = _classifyDamageSource(source, true);
    let skill = source._isSkillF ? 'F' : source._isSkillD ? 'D' : source.isSpiritLaser ? 'S' : null;
    if (!skill && /^Skill [ADF]:/.test(label)) skill = label.charAt(6);
    if (!skill && label === 'Skill S: Spinner') skill = 'S';
    if (!skill) return 1;
    return (1 - state.resistance[skill]) * (state.last === skill && state.fresh ? TD_ADAPT_FRESH : 1);
}

// one paired effect per boss fight
const TIMELINE_DISTORTION_POOL = [
    {
        id: 'stack_overflow',
        name: 'STACK OVERFLOW',
        playerHalf: 'Your stacks never cap.',
        enemyHalf: 'Neither do theirs.',
        apply() { window._stackOverflowActive = true; },
        clear() { window._stackOverflowActive = false; },
    },
    {
        id: 'spacetime_flow', name: 'SPACETIME FLOW', nameVi: 'DÒNG CHẢY THỜI KHÔNG',
        playerHalf: 'Your cooldowns run 35% faster.',
        enemyHalf: 'Enemy bullets and boss skills run faster too.',
        apply() { window._spacetimeFlowActive = true; },
        clear() { window._spacetimeFlowActive = false; },
    },
    {
        id: 'administrators_favor', name: "ADMINISTRATOR'S FAVOR", nameVi: 'ÂN SỦNG QUẢN TRỊ VIÊN',
        playerHalf: 'Kanade shields you and your Sentinels.',
        enemyHalf: 'Her blessing marks your enemies and hardens them.',
        apply() {
            window._administratorsFavorActive = true;
            window._tdFavorSeenEnemies = new WeakSet(enemies);
            window._tdFavorPlayerShield = true;
            window._tdFavorRecharge = 0;
            player.atk = PLAYER_BASE_ATK * _playerAtkWaveMult(_waveNumber) * _sigilAtkMult() * _playerAtkDebuffMult() * _playerAtkBuffMult();
            _grantTimelineFavorSentinels();
        },
        clear() {
            window._administratorsFavorActive = false;
            window._tdFavorSeenEnemies = null;
            window._tdFavorPlayerShield = false;
            window._tdFavorRecharge = 0;
            player.atk = PLAYER_BASE_ATK * _playerAtkWaveMult(_waveNumber) * _sigilAtkMult() * _playerAtkDebuffMult() * _playerAtkBuffMult();
            for (const s of sentinels) {
                s.shield = Math.max(0, (s.shield || 0) - (s._tdFavorShield || 0));
                delete s._tdFavorShield;
                delete s._tdFavorShieldGiven;
            }
        },
    },
    {
        id: 'adaptive_counter', name: 'ADAPTIVE COUNTER', nameVi: 'KẺ ĐỊCH HỌC HỎI',
        playerHalf: 'Switching skills makes the next one hit harder.',
        enemyHalf: 'The boss adapts to a skill you keep repeating.',
        apply() { window._adaptiveCounterState = { last: null, fresh: false, resistance: { A: 0, S: 0, D: 0, F: 0 } }; },
        clear() { window._adaptiveCounterState = null; },
    },
];

function _rollTimelineDistortion() {
    const choices = TIMELINE_DISTORTION_POOL.length > 1
        ? TIMELINE_DISTORTION_POOL.filter(effect => effect.id !== window._lastTimelineDistortionId)
        : TIMELINE_DISTORTION_POOL;
    const effect = choices[Math.floor(Math.random() * choices.length)];
    window._lastTimelineDistortionId = effect.id;
    return effect;
}

function _applyTimelineDistortion(effect) {
    _clearTimelineDistortion();
    window._timelineDistortion = effect;
    effect.apply();
}

function _clearTimelineDistortion() {
    if (window._timelineDistortion) window._timelineDistortion.clear();
    window._timelineDistortion = null;
    window._tdSkipBannerAt = 0;
}

// The first boss wave a player ever reaches plays the cutscene forced — it's
// their introduction to Kanade and to the mechanic. Plain-string localStorage,
// same idiom as js/background.js's brightness preference, one try/catch per
// call: persisted forever on this browser, not per run.
function _kanadeIntroSeen() {
    try { return localStorage.getItem('kanadeIntroSeen') === 'true'; } catch (_) { return false; }
}

function _markKanadeIntroSeen() {
    try { localStorage.setItem('kanadeIntroSeen', 'true'); } catch (_) {}
}

function _kanadeCutsceneSkipped() {
    if (!_kanadeIntroSeen()) return false;
    try { return localStorage.getItem('kanadeSkipCutscene') === 'true'; } catch (_) { return false; }
}

function _setKanadeCutsceneSkipped(skip) {
    try { localStorage.setItem('kanadeSkipCutscene', skip ? 'true' : 'false'); } catch (_) {}
}

// Boss-wave entry point. Always rolls and applies an effect — only the
// cutscene presentation is skippable, and only after the first viewing.
// Leaves window._kanadeCutscene set when the cutscene took over the Goliath
// summon, so the caller knows not to spawn him itself.
function _startTimelineDistortion(waveNum) {
    const effect = _rollTimelineDistortion();
    if (_kanadeCutsceneSkipped() || typeof window._beginKanadeCutscene !== 'function') {
        _applyTimelineDistortion(effect);
        // The cutscene is the only thing that ever names the rolled effect,
        // and nothing in the HUD tracks it, so skipping the animation left the
        // fight's biggest rule change completely unannounced. Its own banner
        // and cue stand in, drawn in js/render/core.js.
        window._tdSkipBannerAt = (typeof performance !== 'undefined') ? performance.now() : 0;
        if (window.AudioMgr && window.AudioMgr.playCutsceneSfx) {
            window.AudioMgr.playCutsceneSfx('timeline-distortion-banner');
        }
        return;
    }
    window._beginKanadeCutscene(effect, waveNum);
}
