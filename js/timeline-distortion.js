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

// The pool Kanade rolls from. Only Stack Overflow is designed so far, so
// every boss wave currently lands on it; adding a second entry is enough to
// make the roll meaningful.
const TIMELINE_DISTORTION_POOL = [
    {
        id: 'stack_overflow',
        name: 'STACK OVERFLOW',
        playerHalf: 'Your stacks never cap.',
        enemyHalf: 'Neither do theirs.',
        apply() { window._stackOverflowActive = true; },
        clear() { window._stackOverflowActive = false; },
    },
];

function _rollTimelineDistortion() {
    return TIMELINE_DISTORTION_POOL[Math.floor(Math.random() * TIMELINE_DISTORTION_POOL.length)];
}

function _applyTimelineDistortion(effect) {
    _clearTimelineDistortion();
    window._timelineDistortion = effect;
    effect.apply();
}

function _clearTimelineDistortion() {
    if (window._timelineDistortion) window._timelineDistortion.clear();
    window._timelineDistortion = null;
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
        return;
    }
    window._beginKanadeCutscene(effect, waveNum);
}
