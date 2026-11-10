// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/debug-console.js — in-game debug/cheat console. Loaded last (after
// config.js/js/sigils/*.js/entities.js/js/skills/*.js/main.js) so every function and
// global below is a real, already-safe-to-call piece of the actual game —
// this file adds a panel UI around them, it does not reimplement any game
// logic itself. The only edits made to existing files for this feature are
// a handful of `window._debug*` guard clauses dropped into main.js at real
// call sites (fireAutoShot, playerTakesHit, loseLife) — see each guard's
// own comment there for why that specific spot was chosen.
//
// Toggle: press ` (Backquote) — the first press starts a dedicated debug
// match (skips the start-of-run sigil picker, disables the wave auto-spawner
// so only enemies you spawn from the panel ever appear) and opens the panel;
// later presses just open/close the panel without resetting anything. Press
// P any time to freeze/unfreeze the game (a plain gamePaused toggle, no pause
// menu) so you can adjust values without enemies/timers moving under you.

window._debugAutoshotOff = false;
window._debugNoCooldown = false;
window._debugPlayerInvuln = false;
window._debugGameSpeed = 1;
window._debugClickSpawnType = '';
window._debugAutoplay = false;

// Autoplay: a real threat-aware pilot instead of a random walk. Every tick
// it scans the whole `enemies` array (bullets, chains, anything else with a
// linear vx/vy) for whatever is on a collision course with the player's own
// y-row, works out where each one will actually be when it gets there (pure
// line geometry - since x and y both integrate as pos += v*dt every frame,
// the arrival x is just current x plus (vx/vy) times the remaining vertical
// distance, so real dt units never even come into it), and steers toward
// whichever of "stay / step left / step right" scores least dangerous,
// weighted by how soon and how close each threat is. Gets more cautious as
// lives drop. Skill Shift's own cooldown scales hard with how it's used
// (cancelSkillShift, js/skills/skill-shift.js): entering the domain and just cancelling
// under 2s costs only ~1.1s CD and still wipes every enemy bullet within
// ~45% of the screen on exit, while an actual teleport always costs the
// full 9s regardless of hold length - so the pilot treats them as two
// different tools, a cheap panic-clear for moderate heat and a real
// (longer-held, bigger-distance) reposition saved for serious danger or low
// lives, rather than always doing the same short-hold-then-teleport combo.
// A (self-homing orbs) and S (summon) fire purely on cooldown since there's
// never a wrong time for either; D (pull+instakill) and F's normal sweep
// only fire with a real enemy on screen so they're not wasted into empty
// air, though a banked Great Sage gem still fires through F unconditionally
// since that's free and never touches F's own cooldown. Cancer's Riptide
// Surge gets the same Space priority it has for a real player: a banked
// release fires the instant it's ready. When nothing's dangerous, movement
// keeps a slow continuous patrol across the middle of the screen instead of
// parking still, so it's always mid-repositioning for whatever shows up
// next. Meant for hands-off soak testing (e.g. watching [PROF]/[LONGTASK]
// output over a long run) without needing to actually play.
let _autoplayTimer = null;
let _autoplayShiftReleaseAt = 0;   // 0 = not currently holding Shift
let _autoplayShiftMode = null;     // 'clear' (cancel only) or 'teleport', set when the hold starts
let _autoplayChargeReleaseAt = 0;  // 0 = not currently holding Space
let _autoplayPatrolDir = 1;        // continuous idle sweep direction when nothing's dangerous

const AUTOPLAY_DANGER_LOOKAHEAD = 100; // in vx/vy's own per-frame units (~1.6s at 60fps)
const AUTOPLAY_STEP = 90; // px a candidate dodge step is scored against

// Every live threat that will cross the player's y-row within the lookahead
// window, with where it'll actually be when it gets there.
function _autoplayScanThreats() {
    const threats = [];
    for (const e of enemies) {
        if (e.hp <= 0 || e.inCoronation) continue;
        if (typeof e.vx !== 'number' || typeof e.vy !== 'number' || e.vy <= 0.01) continue;
        const dy = player.y - e.y;
        if (dy <= 0) continue; // already past the player's row
        const framesToArrival = dy / e.vy;
        if (framesToArrival > AUTOPLAY_DANGER_LOOKAHEAD) continue; // too far out to plan around yet
        const arrivalX = e.x + e.vx * framesToArrival;
        const radius = e.type && e.type.startsWith('enemy_bullet') ? e.size : (e.size ? e.size / 2 : 20);
        threats.push({ arrivalX, radius, framesToArrival });
    }
    return threats;
}
// Aggregate danger score if the player were standing at x - higher for
// threats that are both closer to x and sooner to arrive.
function _autoplayDangerAt(threats, x, margin) {
    let danger = 0;
    for (const t of threats) {
        const band = t.radius + player.hitRadius + margin;
        const d = Math.abs(x - t.arrivalX);
        if (d < band) danger += (band - d) / Math.max(t.framesToArrival, 4);
    }
    return danger;
}

// Extracted out of _setDebugAutoplay's setInterval callback so a fast-
// forwarded simulation (e.g. a verification script driving update()
// directly, without real wall-clock time passing) can call this same
// decision logic on its own simulated cadence instead of waiting on the
// real 200ms interval below, which never fires while that kind of script
// blocks the event loop between real ticks.
function _autoplayTick() {
        if (!window._debugAutoplay || typeof gameState === 'undefined' || gameState !== 'playing' || gamePaused) return;
        const now = performance.now();

        // More cautious the fewer lives are left: a wider safety margin
        // means every threat starts getting dodged earlier and further out.
        const livesNow = typeof lives === 'number' ? lives : START_LIVES;
        const margin = 55 + Math.max(0, START_LIVES - livesNow) * 5;

        // Skill economy: A (self-homing orbs) and S (summons an ally) are
        // never a wrong time to use, so they stay pure on-cooldown. D
        // (pull+instakill) and F's normal sweep only fire with a real
        // target on screen - excludes bullets/chains/coronation, same
        // filter the mechanics themselves use for "a real enemy". A
        // banked Great Sage gem always fires through F regardless (it's
        // free and never touches F's own cooldown, see activateSkillF).
        const _realEnemyCount = enemies.filter(e =>
            !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation).length;
        const _greatSageGemReady = typeof _hasBuff === 'function' && _hasBuff('cuop_bao_tang')
            && typeof _greatSageGems !== 'undefined' && _greatSageGems.length > 0;

        if (typeof activateSkillA === 'function') activateSkillA();
        if (typeof activateSkillS === 'function') activateSkillS();
        if (typeof activateSkillD === 'function' && _realEnemyCount > 0) activateSkillD();
        if (typeof activateSkillF === 'function' && (_realEnemyCount > 0 || _greatSageGemReady)) activateSkillF();
        if (typeof activateSkillG === 'function') activateSkillG();

        // Cancer's Riptide Surge, Leo's Divine Fate, then Capricorn's Mountainfall: a banked release is
        // free (doesn't touch any other cooldown) and just needs a Space press
        // whenever it's ready, same priority Space itself gives it in input.js.
        if ((window._tidalSurgeReady || window._leoFateReady || window._capricornReady) && typeof _releaseReadySpaceSigil === 'function'
            && !(typeof player !== 'undefined' && player._silenced)) {
            _releaseReadySpaceSigil();
        }

        // Movement + Skill Shift engage: both driven off the same
        // threat scan, since "is walking alone enough" is exactly the
        // signal that decides whether Shift is even worth spending.
        if (_autoplayShiftReleaseAt === 0) {
            const threats = _autoplayScanThreats();
            const leftX = Math.max(player.width / 2, player.x - AUTOPLAY_STEP);
            const rightX = Math.min(canvas.width - player.width / 2, player.x + AUTOPLAY_STEP);
            const dHere = _autoplayDangerAt(threats, player.x, margin);
            const dLeft = _autoplayDangerAt(threats, leftX, margin);
            const dRight = _autoplayDangerAt(threats, rightX, margin);

            let dir = 0, bestScore = dHere; // 0 = stay, ties favor staying put
            if (dLeft < bestScore) { bestScore = dLeft; dir = -1; }
            if (dRight < bestScore) { bestScore = dRight; dir = 1; }

            if (bestScore < 0.05 && dir === 0) {
                // Nothing dangerous anywhere nearby: don't just park -
                // keep a slow continuous patrol sweep across the middle
                // of the screen (never standing still) so there's always
                // equal room to dodge either way the instant something
                // shows up, and it still visibly "plays" during a lull.
                const center = canvas.width / 2, patrolRange = 160;
                if (player.x <= center - patrolRange) _autoplayPatrolDir = 1;
                else if (player.x >= center + patrolRange) _autoplayPatrolDir = -1;
                dir = _autoplayPatrolDir;
            }
            keys.left = dir < 0;
            keys.right = dir > 0;

            // bestScore is "how dangerous the safest available option
            // still is" - if walking alone can't get it near zero,
            // Skill Shift is genuinely worth spending here.
            if (bestScore > 0.05 && !skillShiftActive && now - lastSkillShift >= skillShiftCooldown
                && !(typeof player !== 'undefined' && player._silenced)) {
                const critical = bestScore > 0.6 || livesNow <= 3;
                keys.left = false; keys.right = false; // Iron Body covers us during the hold, no need to also drift
                skillShiftActive = true;
                window._shiftActive = true;
                // Force FULL tier for the domain's own showcase effects, same reasoning as input.js's real activation.
                if (window._smartQuality !== false && typeof window._applyGfxLevel === 'function') window._applyGfxLevel(0);
                skillShiftChargeStart = now;
                if (window.AudioMgr) { window.AudioMgr.enterTimeDomain(); window.AudioMgr.playSfx('shift-hold'); }
                if (typeof _hasBuff === 'function' && _hasBuff('coi_mong')) {
                    window._coiMongEndTime = now + 2500; // docs/combat-scaling-rebalance.md Part 5
                    for (const _e of enemies) {
                        if (_e.type.startsWith('enemy_bullet') || _e.type === 'abyssal_chain' || _e.inCoronation) continue;
                        if (!_e._yogMark) {
                            _e._yogMark = true; _e._yogMarkStart = now; _e._yogMarkAccum = 0;
                            applyVulnerability(_e);
                        }
                    }
                }
                // Moderate heat: short hold, cancel only, cheap ~1.1s CD.
                // Serious heat (or lives running low): hold toward full
                // charge and actually teleport, accepting the flat 9s CD.
                _autoplayShiftMode = critical ? 'teleport' : 'clear';
                _autoplayShiftReleaseAt = now + (critical ? 2900 : 1800);
            }
        } else if (now >= _autoplayShiftReleaseAt) {
            _autoplayShiftReleaseAt = 0;
            if (skillShiftActive) {
                if (_autoplayShiftMode === 'teleport') {
                    const threats = _autoplayScanThreats();
                    const maxDist = canvas.width / 2;
                    const leftX = Math.max(player.width / 2, player.x - maxDist);
                    const rightX = Math.min(canvas.width - player.width / 2, player.x + maxDist);
                    const dir = _autoplayDangerAt(threats, leftX, margin) <= _autoplayDangerAt(threats, rightX, margin) ? 'left' : 'right';
                    executeShiftTeleport(dir);
                } else {
                    cancelSkillShift(); // no reposition needed - just the cheap CD + bullet wipe on exit
                }
            }
            _autoplayShiftMode = null;
        }

        // Charged Space shot: hold to maxChargeTime for a max-multiplier
        // charged bullet (Cycle of Flow's insta-fire path is left to the
        // instant branch below, matching the real keydown's own check).
        if (_autoplayChargeReleaseAt === 0) {
            if (!charging && !laserActive && !skillShiftActive) {
                if (typeof _hasBuff === 'function' && _hasBuff('dong_chay_luan_hoi')) {
                    if (now >= laserCooldownEnd && typeof _activateOverloadLaser === 'function') {
                        _activateOverloadLaser(now);
                        if (typeof _piscesInstantCast === 'function') _piscesInstantCast('SPC');
                    }
                } else {
                    charging = true; chargeStartTime = now;
                    if (window.AudioMgr) window.AudioMgr.startCharging();
                    _autoplayChargeReleaseAt = now + maxChargeTime;
                }
            }
        } else if (now >= _autoplayChargeReleaseAt) {
            _autoplayChargeReleaseAt = 0;
            if (charging && !laserActive) {
                const chargeDuration = now - chargeStartTime;
                if (chargeDuration < overloadChargeTime) {
                    const multiplier = 1 + ((Math.min(chargeDuration, maxChargeTime) / maxChargeTime) * (maxMultiplier - 1));
                    fireChargedBullet(Math.min(multiplier, maxMultiplier));
                }
                charging = false;
                if (window.AudioMgr) window.AudioMgr.stopCharging();
            }
        }
}

function _setDebugAutoplay(on) {
    window._debugAutoplay = on;
    if (on) {
        if (_autoplayTimer) return;
        _autoplayShiftReleaseAt = 0;
        _autoplayShiftMode = null;
        _autoplayChargeReleaseAt = 0;
        _autoplayPatrolDir = 1;
        _autoplayTimer = setInterval(_autoplayTick, 200);
    } else {
        keys.left = false;
        keys.right = false;
        if (skillShiftActive) cancelSkillShift();
        if (charging && !laserActive) { charging = false; if (window.AudioMgr) window.AudioMgr.stopCharging(); }
        _autoplayShiftReleaseAt = 0;
        _autoplayShiftMode = null;
        _autoplayChargeReleaseAt = 0;
        if (_autoplayTimer) { clearInterval(_autoplayTimer); _autoplayTimer = null; }
    }
}

// DPS/TTK verification (docs/combat-scaling-rebalance.md Part 2's remaining
// checklist item): runs a fixed set of wave milestones back to back through
// the real wave system (debugSpawnWaveComposition's own logic, inlined here
// so it doesn't depend on the panel's wave-number input field), with
// autoplay driving the ship and 4x game speed, no sigils equipped. Reports
// clear time, lives lost, and damage dealt/received per wave so the numbers
// can be read off directly instead of guessed at from manual play.
const VERIFY_WAVE_MILESTONES = [1, 2, 5, 10, 15, 20];
const VERIFY_NON_GOLIATH_BUDGET_MS = 90000; // waves 1-10 force-end well under this anyway
const VERIFY_GOLIATH_BUDGET_MS = 300000; // Goliath waves (multiples of 5) never force-end on their own

function _verifyResetWaveState(waveNum) {
    _ammitReset();
    enemies.length = 0;
    window._matchStats = _newMatchStats();
    lives = START_LIVES;
    if (typeof player !== 'undefined' && typeof canvas !== 'undefined') {
        player.x = canvas.width / 2;
        player._silenced = false;
        player._rooted = false;
    }
    _waveNumber = waveNum - 1;
    _wavePhase = 'rest';
    _waveRestTimer = 3000;
    _waveForceEndTimer = 0;
    window._debugWaveRosterActive = true;
}

function _verifySleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function _verifyRunWave(waveNum) {
    const budgetMs = waveNum % 5 === 0 ? VERIFY_GOLIATH_BUDGET_MS : VERIFY_NON_GOLIATH_BUDGET_MS;
    _verifyResetWaveState(waveNum);

    let started = false;
    const startDeadline = performance.now() + 8000;
    while (!started && performance.now() < startDeadline) {
        if (enemies.some((e) => !e.type.startsWith('enemy_bullet'))) started = true;
        await _verifySleep(200);
    }

    let gameElapsed = 0, lastCheck = performance.now(), cleared = false, timedOut = false;
    while (true) {
        await _verifySleep(250);
        const now = performance.now();
        gameElapsed += (now - lastCheck) * (window._debugGameSpeed || 1);
        lastCheck = now;
        if (typeof gameState !== 'undefined' && gameState !== 'playing') break; // ran out of lives, or similar
        if (started && window._debugWaveRosterActive === false) { cleared = true; break; }
        if (gameElapsed > budgetMs) { timedOut = true; break; }
    }

    const remainingEnemies = enemies.filter((e) => !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo');
    const remainingHp = remainingEnemies.reduce((s, e) => s + Math.max(0, e.hp), 0);
    const remainingMaxHp = remainingEnemies.reduce((s, e) => s + Math.max(0, e.maxHp || e.hp), 0);
    const sumBucket = (b) => Object.values(b).reduce((s, v) => s + v, 0);
    return {
        wave: waveNum,
        cleared: cleared,
        timedOut: timedOut,
        gameOver: typeof gameState !== 'undefined' && gameState !== 'playing',
        approxGameMs: Math.round(gameElapsed),
        livesLost: START_LIVES - lives,
        allyDamageDealt: Math.round(sumBucket(window._matchStats.allyDamage)),
        enemyDamageReceived: Math.round(sumBucket(window._matchStats.enemyDamage)),
        remainingEnemyCount: remainingEnemies.length,
        remainingHpPct: remainingMaxHp > 0 ? +(100 * remainingHp / remainingMaxHp).toFixed(1) : 0,
    };
}

function _verifyFormatRow(r) {
    const status = r.cleared ? 'CLEARED' : (r.gameOver ? 'GAME OVER' : 'TIMED OUT');
    return `Wave ${r.wave}: ${status} in ~${(r.approxGameMs / 1000).toFixed(1)}s | lives lost ${r.livesLost} | dealt ${r.allyDamageDealt} | took ${r.enemyDamageReceived} | ${r.remainingEnemyCount} left (${r.remainingHpPct}% HP)`;
}

window.runCombatVerification = async function () {
    const resultsEl = document.getElementById('dbgVerifyResults');
    if (typeof gameState === 'undefined' || gameState !== 'playing' || !window._debugSessionActive) {
        window.debugStartSession();
        await _verifySleep(300);
    }
    const prevSpeed = window._debugGameSpeed;
    window.debugSetSpeed(4);
    _setDebugAutoplay(true);

    const results = [];
    for (const w of VERIFY_WAVE_MILESTONES) {
        if (resultsEl) resultsEl.textContent = results.map(_verifyFormatRow).concat('Running wave ' + w + '...').join('\n');
        const r = await _verifyRunWave(w);
        results.push(r);
        if (resultsEl) resultsEl.textContent = results.map(_verifyFormatRow).join('\n');
        if (r.gameOver) break; // out of lives entirely, no point continuing to the next milestone
    }

    _setDebugAutoplay(false);
    window.debugSetSpeed(prevSpeed || 1);
    window.__combatVerifyReport = results;
    console.table(results);
    if (resultsEl) resultsEl.textContent = results.map(_verifyFormatRow).join('\n') + '\n\nFull data in window.__combatVerifyReport (also logged as a table in the browser console).';
    return results;
};

// Voyage Recap from the debug console: this run's numbers so far, or a long
// made up run with every section filled, without having to die first.
function _debugSampleRecapData() {
    const timeline = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 168; i++) {
        const wave = Math.min(14, 1 + Math.floor(i / 12));
        timeline.push({ t: (i + 1) * 5, wave, allyDamage: Math.round((2000 + wave * 900) * (0.7 + rnd() * 0.6) * (i % 12 === 11 ? 3.5 : 1)), damageTaken: Math.round(wave * 40 * (rnd() < 0.2 ? 3 : 0.5) * rnd()), kills: Math.round((4 + wave) * (0.5 + rnd())) });
    }
    return {
        score: 1284650, wave: 14, timeMs: 842000, livesStart: 12, livesLost: 12, cause: 'Leviathan',
        sigils: [['capricorn', 0], ['leo', 5], ['pisces', 10]].map(([id, w]) => ({ id, name: SIGIL_DEFS[id].name, vi: (SIGIL_I18N_VI[id] || {}).name || SIGIL_DEFS[id].name, color: SIGIL_DEFS[id].color, atWave: w })),
        kills: { total: 1873, byType: { Apostle: 1320, Thaelis: 96, Marchosias: 88, Veilshroud: 77, Egregor: 71, Raphael: 61, Uriel: 58, Leviathan: 44, Dargruel: 42, Embryo: 15, Goliath: 1 } },
        matchStats: {
            allyDamage: { 'Player Auto-Fire': 2840000, 'Sentinel Auto-Fire': 1910000, 'Mountainfall': 1420000, 'Skill D: Death Star': 1180000, 'Divine Fate: Shatter': 960000, 'Skill G: Tesla Coil': 720000, 'Chain Lightning': 510000, 'Skill S: Remembrance Spirit': 480000, 'Solar Flare': 350000, 'Player Charged Shot': 260000, 'Pisces: Flow Fish': 140000, 'Other': 60000 },
            enemyDamage: { 'Enemy Bullet': 182000, 'Leviathan': 96000, 'Goliath': 88000, 'Raphael': 41000, 'Egregor': 38000, 'Boss Attack': 12000 },
            lifeLoss: { 'Enemy Bullet': 4, 'Leviathan': 3, 'Goliath': 2, 'Raphael': 1, 'Egregor': 1, 'Uriel': 1 },
        },
        timeline,
    };
}
window.debugOpenRecap = function (sample) {
    if (typeof window._openVoyageRecap !== 'function') return;
    window._openVoyageRecap(sample ? _debugSampleRecapData() : null);
    // Same voice a real death plays; menu return cancels it through _gameoverVoice.
    if (window.AudioMgr) {
        if (window.AudioMgr.setTimeFrozen) window.AudioMgr.setTimeFrozen(false, false);
        if (window._gameoverVoice) window._gameoverVoice.cancel();
        window._gameoverVoice = window.AudioMgr.playSfx('gameover');
    }
};
window.debugCloseRecap = function () {
    if (typeof window._closeVoyageRecap === 'function') window._closeVoyageRecap();
};

// Directly override the two globals driving Walpurgis (Huyết Dạ, scales
// off _waveNumber — see _walpurgisStacks in config.js) and the Yuuki HUD
// bonus (_yuukiBonus, ally dmg multiplier applied in entities.js), so both
// can be tested without grinding real waves. Clamped to the same range the
// real game allows (_yuukiBonus caps at 3.00 in main.js) so debug testing
// still reflects an actually-reachable state.
window.debugTutorial = function (action) {
    const r = typeof window._tutorialDebug === 'function' ? window._tutorialDebug(action) : 'n/a';
    const el = document.getElementById('dbgTutorialState');
    if (el) el.textContent = r;
};
window.debugSetWaveNumber = function () {
    const el = document.getElementById('dbgWaveNumber');
    const v = el && el.value !== '' ? Math.max(0, Math.floor(Number(el.value))) : null;
    if (v === null || isNaN(v)) return;
    // bare assignment, not window._waveNumber — _waveNumber is a top-level
    // `let` in config.js, a separate lexical binding from any window property
    _waveNumber = v;
};
window.debugSetYuukiBonus = function () {
    const el = document.getElementById('dbgYuukiBonus');
    const v = el && el.value !== '' ? Number(el.value) : null;
    if (v === null || isNaN(v)) return;
    _yuukiBonus = Math.max(0, Math.min(3.00, v / 100));
};

(function () {
    // every Thaelis test action: id, button label, tooltip. The Boss tab section runs them on all Thaelis, a row runs them on its own.
    const THAELIS_DEBUG_ACTIONS = [
        ['fill', 'Fill queue', 'Ulysses\' Return: store the most waves it can hold'],
        ['cast', 'Cast wave', 'Ulysses\' Return: fire a wave now'],
        ['slowlane', 'Arm slow lane', 'Next wave leaves a slowing lane and hits for the most extra damage'],
        ['points', '+3 points', 'Ulysses\' Return: add 3 Ordeal points'],
        ['shield', '+Shield', 'Add a shield worth 30% of Max HP'],
        ['tenacity', 'Tenacity shield', 'Cross the 70% HP line so Tenacity weaves a new shield'],
        ['absorb', 'Absorb hit', 'Penelope\'s Shroud: the shield soaks a hit and heals Thaelis'],
        ['overheal', 'Overheal', 'Penelope\'s Shroud: heal past Max HP so 55% of the excess becomes shield'],
        ['break', 'Break shield', 'Remove the shield with the break effect'],
        ['hurt', 'Hurt to 50%', 'Set HP to half, with no shield it mends on its own'],
        ['reborn', 'Mark reborn', 'Give it the reborn look and its flat armor'],
        ['cocoon', 'To Cocoon', 'Reincarnation: die into a Cocoon now']
    ];
    const PANEL_HTML = `
<div id="debugConsoleOverlay" style="display:none; position:fixed; inset:0; z-index:999999999;
    justify-content:flex-end; align-items:stretch; pointer-events:none;">
  <div id="debug-console-panel" style="
      pointer-events:auto; width:min(92vw,380px); height:100%; overflow-y:auto;
      background:rgba(0,12,28,0.96); border-left:1.5px solid rgba(0,229,255,0.3);
      box-shadow:-10px 0 40px rgba(0,100,200,0.25);
      font-family:'Courier New',monospace; color:#c8e8ff; font-size:12px;
      padding:16px 16px 40px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <div style="color:#00e5ff; font-weight:bold; font-size:14px; letter-spacing:1px;">DEBUG CONSOLE</div>
      <button onclick="closeDebugConsole()" style="background:none; border:1px solid rgba(0,229,255,0.4); color:#00e5ff; border-radius:6px; width:26px; height:26px; cursor:pointer;"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <div style="opacity:0.6; font-size:10px; margin-bottom:6px;">\` toggles this panel · P freezes/unfreezes the game.</div>
    <div id="dbgSessionStatus" style="font-size:10px; margin-bottom:10px; padding:5px 8px; border-radius:6px; background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.2);"></div>
    <div class="dbg-row dbg-toolbar">
      <button class="dbg-btn" id="dbgPauseBtn" onclick="debugTogglePause()" style="min-width:110px; font-weight:bold;">Pause Game</button>
      <span class="dbg-toolbar-end">
        <button class="dbg-btn" onclick="debugResetPlayer()" title="Put the ship back in the middle with full lives">Reset Player</button>
        <button class="dbg-btn" onclick="debugRestartRun()" title="Start the debug sandbox, or restart it empty">Start / Restart Sandbox</button>
      </span>
    </div>
    <div class="dbg-row" style="margin-bottom:14px;">
      <button class="dbg-btn" onclick="debugOpenRecap(false)">Voyage Recap (this run)</button>
      <button class="dbg-btn" onclick="debugOpenRecap(true)">Voyage Recap (sample run)</button>
      <button class="dbg-btn" onclick="debugCloseRecap()">Close Recap</button>
    </div>
    <div class="dbg-section">
      <div class="dbg-h">GAME SPEED</div>
      <div class="dbg-row" id="dbgSpeedRow" style="flex-wrap:wrap;">
        <button class="dbg-btn dbg-speed-btn" onclick="debugSetSpeed(0.25)">0.25×</button>
        <button class="dbg-btn dbg-speed-btn" onclick="debugSetSpeed(0.5)">0.5×</button>
        <button class="dbg-btn dbg-speed-btn" onclick="debugSetSpeed(1)">1×</button>
        <button class="dbg-btn dbg-speed-btn" onclick="debugSetSpeed(2)">2×</button>
        <button class="dbg-btn dbg-speed-btn" onclick="debugSetSpeed(4)">4×</button>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">PLAYER</div>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgAutoshotToggle" onchange="window._debugAutoshotOff = !this.checked;">
        Autoshot enabled
      </label>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgCooldownToggle" onchange="window._debugNoCooldown = !this.checked;">
        Cooldowns enabled
      </label>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgInvulnToggle" onchange="window._debugPlayerInvuln = this.checked;">
        Player Invulnerable
      </label>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgAutoplayToggle" onchange="_setDebugAutoplay(this.checked);">
        Autoplay (moves and spams skills)
      </label>
      <div class="dbg-row">
        <button class="dbg-btn danger" onclick="debugExitSession()">Exit Debug Mode (to Main Menu)</button>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">WAVE / GLOBAL BUFFS</div>
      <div class="dbg-row">
        <input type="number" id="dbgWaveNumber" placeholder="Wave #" style="width:80px;">
        <button class="dbg-btn" onclick="window.debugSetWaveNumber()">Set Wave (drives Walpurgis)</button>
      </div>
      <div class="dbg-row">
        <input type="number" id="dbgYuukiBonus" placeholder="Yuuki %" step="1" style="width:80px;">
        <button class="dbg-btn" onclick="window.debugSetYuukiBonus()">Set Yuuki %</button>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">COMBAT VERIFY (DPS/TTK)</div>
      <div class="dbg-note">Runs waves 1, 2, 5, 10, 15, 20 back to back through the real wave system, autoplay + 4x speed, no sigils. Reports clear time, lives lost, and damage dealt/received per wave. docs/combat-scaling-rebalance.md Part 2.</div>
      <div class="dbg-row">
        <button class="dbg-btn" onclick="runCombatVerification()">Run Verification</button>
      </div>
      <pre id="dbgVerifyResults" style="font-size:10px; white-space:pre-wrap; opacity:0.85; max-height:200px; overflow-y:auto; background:rgba(0,0,0,0.3); padding:6px; border-radius:6px; margin:0;"></pre>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">SKILLS (force ready and activate now)</div>
      <div class="dbg-row">
        <button class="dbg-btn" onclick="debugForceSkill('A')">A</button>
        <button class="dbg-btn" onclick="debugForceSkill('S')">S</button>
        <button class="dbg-btn" onclick="debugForceSkill('D')">D</button>
        <button class="dbg-btn" onclick="debugForceSkill('F')">F</button>
        <button class="dbg-btn" onclick="debugForceSkill('G')">G</button>
        <button class="dbg-btn" onclick="debugForceSkill('Shift')">Shift</button>
        <button class="dbg-btn" onclick="debugForceSkill('Laser')">Laser</button>
        <button class="dbg-btn" onclick="debugForceSkill('Photokrystos')">Photokrystos</button>
        <button class="dbg-btn" onclick="debugForceSkill('S-Spinner')">S Finale (Spinner)</button>
        <button class="dbg-btn" onclick="debugForceSkill('TeslaCoil')">Spawn Tesla Coil</button>
      </div>
      <div class="dbg-row">
        <button class="dbg-btn" onclick="if (typeof cancelSkillShift === 'function') cancelSkillShift();">Cancel Shift</button>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">SIGILS / PASSIVES</div>
      <div id="dbgSigilList"></div>
      <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12);">
        <div class="dbg-row">
          <button class="dbg-btn" onclick="debugForceAccurateParry()">Force Accurate Parry (4s)</button>
          <button class="dbg-btn" onclick="debugForceSilence('dargruel')">Silence: Dargruel (root+silence, 4s)</button>
          <button class="dbg-btn" onclick="debugForceSilence('goliath')">Silence: Goliath (silence only, 4s)</button>
        </div>
        <div class="dbg-note dbg-note-flush">Glory for Justice isn't a toggle: it auto-activates whenever &gt;4 enemies are on screen, an Abnormal+ enemy is present, Skill G is active, or Photokrystos is active. Spawn any boss type below (or 5+ enemies) to trigger it. Vulnerability is applied per enemy: see the "+Vuln" button on each row in Active Enemies.</div>
      </div>
      <div id="dbgGreatSageSection" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12); display:none;">
        <div class="dbg-h" style="font-size:10px;">GREAT SAGE, STOLEN GEMS</div>
        <div id="dbgGreatSageGems" style="font-size:10px; opacity:0.7; margin-bottom:4px;"></div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugGreatSageFire('thaelis')">Fire: Thaelis</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('raphael')">Fire: Raphael</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('marchosias')">Fire: Marchosias</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('veilshroud')">Fire: Veilshroud</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('egregor')">Fire: Egregor</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('dargruel')">Fire: Dargruel</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('leviathan')">Fire: Leviathan</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('goliath')">Fire: Goliath</button>
        </div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('thaelis')">+Gem: Thaelis</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('raphael')">+Gem: Raphael</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('marchosias')">+Gem: Marchosias</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('veilshroud')">+Gem: Veilshroud</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('egregor')">+Gem: Egregor</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('dargruel')">+Gem: Dargruel</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('leviathan')">+Gem: Leviathan</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('goliath')">+Gem: Goliath</button>
        </div>
        <div class="dbg-row">
          <button class="dbg-btn" onclick="debugGreatSageFillCombo()">Fill 3 Distinct Gems (72 buff active)</button>
          <button class="dbg-btn" onclick="debugGreatSageClearGems()">Clear Gems</button>
          <button class="dbg-btn" onclick="debugGreatSageForceStealth()">Force Stealth (1s)</button>
        </div>
        <div class="dbg-note dbg-note-flush">"Fire" unleashes that stolen attack immediately without touching the gem bank. "+Gem" adds it to the bank (respects the 3-slot/no-duplicate cap) so you can test the real F-to-release flow.</div>
      </div>
      <div id="dbgCancerSection" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12); display:none;">
        <div class="dbg-h" style="font-size:10px;">CANCER, TIDAL SURGE / OCEAN HUNTER</div>
        <div id="dbgCancerState" style="font-size:10px; opacity:0.7; margin-bottom:4px;"></div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugCancerFillMeter()">Fill Meter to Ready</button>
          <button class="dbg-btn" onclick="debugCancerRelease()">Force Release (Space)</button>
          <button class="dbg-btn" onclick="debugCancerOceanHunter()">Force Ocean Hunter (nearest enemy)</button>
          <button class="dbg-btn" onclick="debugCancerClear()">Clear State</button>
        </div>
        <div class="dbg-note dbg-note-flush">"Fill Meter" mirrors real absorb/passive feed up to ready. "Force Release" simulates the real Space press. "Ocean Hunter" drops the nearest enemy to 5% HP so the real execute check fires on its own.</div>
      </div>
      <div id="dbgLeoSection" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12); display:none;">
        <div class="dbg-h" style="font-size:10px;">LEO, DIVINE FATE / WILDFIRE</div>
        <div id="dbgLeoState" style="font-size:10px; opacity:0.7; margin-bottom:4px;"></div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugLeoSetFate(100)">Fill Fate to Ready</button>
          <button class="dbg-btn" onclick="debugLeoSetFate(50)">Fate 50%</button>
          <button class="dbg-btn" onclick="debugLeoRelease()">Release (Space)</button>
          <button class="dbg-btn" onclick="debugLeoPetrify(3000)">Petrify 3s now</button>
          <button class="dbg-btn" onclick="debugLeoPetrify(5000)">Wave Petrify 5s</button>
          <button class="dbg-btn" onclick="debugLeoClear()">Clear State</button>
        </div>
        <div class="dbg-note dbg-note-flush">Shown while Leo is equipped. "Release" goes through the real Space path (Cancer first if both are ready, blocked while silenced). "Petrify 3s now" skips the meter but still starts the 8s rest; "Wave Petrify 5s" is the wave start version with no rest. "Clear State" empties the meter, rest, petrify and every Burn.</div>
      </div>
      <div id="dbgTySection" style="margin-top:8px;display:none;">
        <div class="dbg-h">UMBRAL SERPENT</div>
        <div id="dbgTyState" style="font-size:10px;"></div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugTyAction('fill')">Fill Umbral Flame</button>
          <button class="dbg-btn" onclick="debugTyAction('detonate')">Detonate On Nearest</button>
          <button class="dbg-btn" onclick="debugTyAction('array')">Open Serpent Array</button>
          <button class="dbg-btn" onclick="debugTyAction('spawn')">Spawn 10 Serpents</button>
          <button class="dbg-btn" onclick="debugTyAction('break')">Break Scale Shield</button>
          <button class="dbg-btn" onclick="debugTyAction('restore')">Restore Scale Shield</button>
          <button class="dbg-btn" onclick="debugTyAction('venom')">Venom: 5 stacks</button>
        </div>
      </div>
      <div id="dbgDauSection" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12); display:none;">
        <div class="dbg-h" style="font-size:10px;">DAWN HERALD (DAU), DAYBREAK CROW</div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugDauCrow()">Trigger Crow Now</button>
        </div>
      </div>
      <div id="dbgPiscesSection" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12); display:none;">
        <div class="dbg-h" style="font-size:10px;">PISCES, CYCLE OF FLOW</div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugPiscesRefund()">Refund 2s to every skill (needs Cycle of Flow)</button>
        </div>
      </div>
      <div id="dbgCapricornSection" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12); display:none;">
        <div class="dbg-h" style="font-size:10px;">CAPRICORN, COMPOUND INTEREST / MOUNTAINFALL</div>
        <div id="dbgCapricornState" style="font-size:10px; opacity:0.7; margin-bottom:4px;"></div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugCapricornStacks(10)">+10 Stacks</button>
          <button class="dbg-btn" onclick="debugCapricornStacks(80)">Max Stacks (80)</button>
          <button class="dbg-btn" onclick="debugCapricornDecay()">Start Loss Warning</button>
          <button class="dbg-btn" onclick="debugCapricornFillLey()">Fill Ley to Ready</button>
          <button class="dbg-btn" onclick="debugCapricornRelease()">Release (Space)</button>
          <button class="dbg-btn" onclick="debugCapricornDrop()">Drop Mountain Now</button>
          <button class="dbg-btn" onclick="debugCapricornClear()">Clear State</button>
        </div>
        <div class="dbg-note dbg-note-flush">"+10 Stacks" goes through the real stack gain, so it also fills the Ley meter. "Start Loss Warning" jumps to 4s without a stack: the circle cracks for 2s, then every stack is lost. "Release" uses the real Space path (Cancer, then Leo, then Capricorn; blocked while silenced or while a mountain is up). "Drop Mountain Now" skips the meter.</div>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">SPAWN ENEMY / SENTINEL</div>
      <div class="dbg-note">Stats below apply to the next spawn (blank = that type's default). Hover a button to see that type's HP/size range.</div>
      <div class="dbg-row">
        <input type="number" id="dbgSpawnHp" placeholder="HP" class="dbg-enemy-hp" style="width:70px;">
        <input type="number" id="dbgSpawnSize" placeholder="Size" class="dbg-enemy-hp" style="width:70px;">
        <input type="number" id="dbgSpawnSpeed" placeholder="Speed" step="0.1" class="dbg-enemy-hp" style="width:60px;">
      </div>
      <div class="dbg-row" style="flex-wrap:wrap; gap:10px;">
        <label style="cursor:pointer; display:flex; gap:4px; align-items:center; font-size:11px;">
          <input type="checkbox" id="dbgSpawnBlessed"> Administrator's Blessing
        </label>
        <label style="cursor:pointer; display:flex; gap:4px; align-items:center; font-size:11px;">
          <input type="checkbox" id="dbgSpawnStill" onchange="window._debugSpawnStill = this.checked;"> Spawn still
        </label>
        <button class="dbg-btn" onclick="debugPinEnemies(true)" title="Freeze every enemy where it stands. It can still cast.">Pin all</button>
        <button class="dbg-btn" onclick="debugPinEnemies(false)" title="Let pinned enemies move again">Release all</button>
      </div>
      <div class="dbg-note">Spawn still: new enemies stand where they appear and never move, but keep casting. Without a click position they appear in the upper part of the screen. Pin all and Release all do the same for enemies already out.</div>
      <div class="dbg-note">Applies the blessing to whatever spawns next, skipping the 10% roll, the wave-6 gate and the 12-per-wave ceiling. Works on any type, including ones the real roll never picks.</div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <button class="dbg-btn" onclick="debugSpawn('spawnApostle')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="22–330" data-size="20–30">Apostle</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnThaelis')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="1520–3170" data-size="100–150">Thaelis</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnRaphael')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="2500–4500" data-size="52–66">Raphael</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnMarchosias')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="2112–4092" data-size="100–150">Marchosias</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnDargruel')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="6200–16000" data-size="200–300">Dargruel</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnVeilshroud')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="1320–3300" data-size="100–150">Veilshroud</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnUriel')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="1725–4140" data-size="100–150">Uriel</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnLeviathan')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="8820–15435" data-size="250–300">Leviathan</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnEgregor')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="2200–5200" data-size="160">Egregor</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnAmmit')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="3680 to 7590" data-size="150">Ammit</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnGoliath')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="1 (Alpha, invuln)" data-size="380/460">Goliath (WIP)</button>
        <button class="dbg-btn" onclick="debugSpawnSentinel()" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="100–800" data-size="18–28">Sentinel</button>
      </div>
      <div id="dbgSpawnHint" style="font-size:10px; min-height:14px; color:#7fd8ff; margin-bottom:2px;"></div>
      <div class="dbg-row" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12);">
        <select id="dbgClickSpawnType" class="dbg-enemy-hp" style="width:160px;" onchange="window._debugClickSpawnType = this.value;">
          <option value="">Click-to-spawn: off</option>
          <option value="spawnApostle">Apostle</option>
          <option value="spawnThaelis">Thaelis</option>
          <option value="spawnRaphael">Raphael</option>
          <option value="spawnMarchosias">Marchosias</option>
          <option value="spawnDargruel">Dargruel</option>
          <option value="spawnVeilshroud">Veilshroud</option>
          <option value="spawnUriel">Uriel</option>
          <option value="spawnLeviathan">Leviathan</option>
          <option value="spawnEgregor">Egregor</option>
          <option value="spawnGoliath">Goliath (WIP)</option>
          <option value="spawnSentinel">Sentinel</option>
        </select>
      </div>
      <div class="dbg-note dbg-note-flush">When a type is picked above, click anywhere on the game screen to spawn it there (uses the HP/Size/Speed overrides too). Pick "off" to stop. Works with the panel open or closed.</div>
      <div class="dbg-row" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12);">
        <input type="number" id="dbgWaveNum" class="dbg-enemy-hp" style="width:70px;" min="1" value="5" placeholder="Wave #">
        <button class="dbg-btn" onclick="debugSpawnWaveComposition()">Spawn Wave's Full Roster</button>
      </div>
      <div class="dbg-note dbg-note-flush">Runs that wave number through the real wave system: a 3s countdown, then the normal wave banner and a gradual spawn (the 15s queue for waves 1-10, the live trickle + surges for waves 11+), Goliath included if the wave is a multiple of 5. Hands back to the frozen sandbox once the wave is fully spawned and cleared. Applies that wave's Walpurgis and Yuuki scaling.</div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">GOLIATH: ENDLESS ECHO</div>
      <div class="dbg-note">Kanade reaches out of her gate, two ghosts replay your last 1.5s of flight at 0.6x speed, each living 2.5s. Uses the True Form Goliath on screen, or spawns one. If fewer than 10 path samples are recorded it fills in a made-up path so the trail has something to show.</div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <button class="dbg-btn" onclick="debugEchoCast(true)">Spawn Goliath + Cast</button>
        <button class="dbg-btn" onclick="debugEchoCast(false)">Cast Now</button>
        <button class="dbg-btn" onclick="debugEchoLoop()">Auto-recast: <span id="dbgEchoLoopState">off</span></button>
        <button class="dbg-btn danger" onclick="debugEchoClear()">Clear ghosts</button>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">KANADE / TIMELINE DISTORTION</div>
      <div class="dbg-note">The boss-wave cutscene and the effect it imposes. Playing it freezes the sim, the audio and the background exactly as a real boss wave does, and its summon beat spawns a real Goliath.</div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <select id="dbgTimelineDistortion" class="dbg-enemy-hp" style="width:100%; margin-bottom:4px;">
          ${TIMELINE_DISTORTION_POOL.map(effect => '<option value="' + effect.id + '">' + effect.name + '</option>').join('')}
        </select>
        <button class="dbg-btn" onclick="debugPlayKanadeCutscene()">Play Cutscene</button>
        <button class="dbg-btn" onclick="debugPlayKanadeCutscene(true)">Play (no Goliath)</button>
        <button class="dbg-btn danger" onclick="debugStopKanadeCutscene()">Stop</button>
      </div>
      <div class="dbg-row" style="flex-wrap:wrap; margin-top:6px;">
        <button class="dbg-btn" onclick="debugToggleStackOverflow()">Apply / Clear Selected</button>
        <span id="dbgStackOverflowState" style="font-size:10px; color:#7fd8ff; align-self:center;"></span>
      </div>
      <div class="dbg-row" style="flex-wrap:wrap; margin-top:6px;">
        <button class="dbg-btn" onclick="debugResetKanadeIntro()">Reset "first viewing" flag</button>
      </div>
      <div class="dbg-row" style="flex-wrap:wrap; margin-top:8px;">
        <button class="dbg-btn" onclick="debugToggleKanadeModel()">Show model</button>
        <button class="dbg-btn" onclick="debugKanadeModel('back')">Front / Back</button>
        <button class="dbg-btn" onclick="debugKanadeModel('expr')">Expression</button>
        <button class="dbg-btn" onclick="debugKanadeModel('still')">Still / Idle</button>
        <button class="dbg-btn" onclick="debugKanadeModel('grid')">Grid</button>
        <button class="dbg-btn" onclick="debugKanadeModel('cast')">Cast pose</button>
        <span id="dbgKanadeModelState" style="font-size:10px; color:#7fd8ff; align-self:center;"></span>
      </div>
      <div class="dbg-note dbg-note-flush">Holds the body sprite still, blown up, with the 180-unit grid and the landmark lines the drawing code is written against (eyes y=38, shoulders y=62, hem y=125). Opens over anything, including a running cutscene.</div>
      <div class="dbg-note dbg-note-flush">Resetting the flag makes the next boss wave play the cutscene forced again and hides the Skip toggle in Settings until it has been watched once more.</div>
      <div class="dbg-h" style="margin-top:12px;">TUTORIAL (Kanade)</div>
      <div class="dbg-note">These work while the Tutorial mode is running (pick Tutorial in the Voyage bar on the menu).</div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <button class="dbg-btn" onclick="debugTutorial('next')">Next step</button>
        <button class="dbg-btn" onclick="debugTutorial('restart')">Restart</button>
        <button class="dbg-btn danger" onclick="debugTutorial('end')">End now</button>
        <button class="dbg-btn" onclick="closeDebugConsole(); if(window._tutorialEnd) window._tutorialEnd({timeMs:180000,attempts:{bullets:1,strip:1,circle:2,sector:1,shift:1},firstTry:4,hits:1,skills:['SH','A','S','D','F','G','SPC']})">Pilot licence</button>
        <select id="dbgTutFace" class="dbg-input" aria-label="Kanade expression"><option value="auto">Automatic</option><option>neutral</option><option>serene</option><option>smug</option><option>determined</option><option>happy</option><option>surprised</option><option>sad</option><option>thinking</option><option>angry</option><option>pain</option></select>
        <select id="dbgTutGesture" class="dbg-input" aria-label="Kanade gesture"><option>rest</option><option>chest</option><option>palm</option><option>present</option><option>point</option><option>beckon</option></select>
        <button class="dbg-btn" onclick="if(window._tutorialDebugPose) window._tutorialDebugPose(document.getElementById('dbgTutFace').value,document.getElementById('dbgTutGesture').value)">Preview pose</button>
        <span id="dbgTutorialState" style="font-size:10px; color:#7fd8ff; align-self:center;"></span>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">THAELIS: ULYSSES' RETURN</div>
      <div class="dbg-note">Every button here works on all Thaelis on screen. Spawn one from the Spawn tab first. Each Thaelis row under Active Enemies has the same buttons for that one only.</div>
      <div class="dbg-row">
        ${THAELIS_DEBUG_ACTIONS.map(a => '<button class="dbg-btn" onclick="debugThaelis(\'' + a[0] + '\')" title="' + a[2] + '">' + a[1] + '</button>').join('')}
        <button class="dbg-btn" onclick="debugThaelis('hatch')" title="Reincarnation: end the Cocoon timer now so Thaelis climbs out">Hatch Cocoon</button>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">ACTIVE ENEMIES</div>
      <div id="dbgEnemyList" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">ACTIVE SENTINELS</div>
      <div id="dbgSentinelList" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">COMBAT DUMMY</div>
      <div class="dbg-note">Stationary hex-drone. Takes real damage from all skills and abilities. Auto-respawns when killed.</div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <input type="number" id="dbgDummyHp" class="dbg-enemy-hp" style="width:80px;" value="5000000" placeholder="HP">
        <input type="number" id="dbgDummySize" class="dbg-enemy-hp" style="width:70px;" value="40" placeholder="Size">
        <input type="number" id="dbgDummyDR" class="dbg-enemy-hp" style="width:60px;" value="0" min="0" max="99" placeholder="DR %">
        <button class="dbg-btn" onclick="debugSpawnDummy()">Spawn</button>
        <button class="dbg-btn danger" onclick="debugRemoveDummy()">Remove</button>
        <button class="dbg-btn" onclick="debugResetDummyDps()">Reset DPS</button>
      </div>
      <div class="dbg-row" style="flex-wrap:wrap; gap:10px;">
        <label style="cursor:pointer; display:flex; gap:4px; align-items:center; font-size:11px;">
          <input type="checkbox" id="dbgDummyIron" onchange="debugSetDummyIron(this.checked)"> Iron Body (blocks damage)
        </label>
        <label style="cursor:pointer; display:flex; gap:4px; align-items:center; font-size:11px;">
          <input type="checkbox" id="dbgDummyImmune" onchange="debugSetDummyImmune(this.checked)"> Full Immune
        </label>
      </div>
      <div class="dbg-row" style="align-items:center; gap:6px;">
        <span style="font-size:11px; opacity:0.7;">DR live:</span>
        <input type="number" id="dbgDummyDRLive" class="dbg-enemy-hp" style="width:58px;" min="0" max="99" placeholder="0" oninput="debugSetDummyDR(this.value)">
        <span style="font-size:10px; opacity:0.5;">% (0=none | 40=Egregor/Veil | 45=Marchosias | 50-60=Dargruel | 55=Raphael | 60=Leviathan | 90=Embryo | Thaelis 0→95%)</span>
      </div>
      <div id="dbgDummyStatus" style="opacity:0.55; font-size:10px; min-height:14px;"></div>
    </div>
  </div>
</div>
<style>
  .dbg-section { margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid rgba(0,229,255,0.12); }
  .dbg-h { color:#7fd8ff; font-size:10px; letter-spacing:1px; margin-bottom:6px; opacity:0.85; }
  .dbg-row { display:flex; gap:6px; align-items:center; margin-bottom:6px; }
  .dbg-btn { background:rgba(0,229,255,0.10); border:1px solid rgba(0,229,255,0.35); color:#c8e8ff;
      border-radius:6px; padding:4px 8px; font-family:inherit; font-size:11px; cursor:pointer; }
  .dbg-btn:hover { background:rgba(0,229,255,0.22); }
  .dbg-btn.danger { border-color:rgba(255,80,80,0.5); color:#ffb0b0; }
  .dbg-btn.danger:hover { background:rgba(255,60,60,0.18); }
  .dbg-speed-btn.active { background:rgba(0,229,255,0.35); border-color:#00e5ff; color:#fff; }
  #dbgPauseBtn.active { background:rgba(255,204,102,0.22); border-color:#ffcc66; color:#ffcc66; }
  .dbg-enemy-row { background:rgba(0,229,255,0.05); border:1px solid rgba(0,229,255,0.15); border-radius:8px; padding:8px; }
  .dbg-enemy-hp { width:70px; background:rgba(0,0,0,0.4); border:1px solid rgba(0,229,255,0.3); color:#c8e8ff; border-radius:4px; padding:2px 4px; font-family:inherit; }
  .dbg-row { flex-wrap:wrap; }
  .dbg-toolbar { display:flex; align-items:center; gap:6px; margin-bottom:10px; }
  .dbg-toolbar-end { margin-left:auto; display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
  .dbg-note { opacity:0.55; font-size:10px; margin-bottom:4px; }
  .dbg-note-flush { margin-bottom:0; }
  .dbg-sticky { position:sticky; top:-16px; z-index:3; margin:-16px -16px 12px; padding:14px 16px 8px; background:rgba(0,12,28,0.98); border-bottom:1px solid rgba(0,229,255,0.2); }
  .dbg-tabs { display:flex; gap:4px; margin-top:8px; }
  .dbg-tab { flex:1; min-height:30px; padding:4px 2px; font-family:inherit; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8fb4d4; background:rgba(0,229,255,0.05); border:1px solid rgba(0,229,255,0.2); border-radius:6px; cursor:pointer; }
  .dbg-tab:hover { color:#c8e8ff; background:rgba(0,229,255,0.14); }
  .dbg-tab.active { color:#fff; background:rgba(0,229,255,0.3); border-color:#00e5ff; }
  .dbg-section[hidden] { display:none; }
  #dbgClickSpawnType { width:100% !important; max-width:220px; }
  #dbgFab:active { background:rgba(0,229,255,0.25); }
  @media (max-width: 700px) { #debug-console-panel { width:100vw !important; border-left:0 !important; } }
  @media (max-height: 520px) and (orientation: landscape) { #debug-console-panel { width:min(62vw,460px) !important; } }
  @media (pointer: coarse) {
    #debug-console-panel { padding-top:max(16px, env(safe-area-inset-top)) !important; padding-right:max(16px, env(safe-area-inset-right)) !important; padding-bottom:calc(40px + env(safe-area-inset-bottom)) !important; }
    .dbg-btn { min-height:36px; padding:6px 10px; font-size:12px; }
    .dbg-tab { min-height:40px; font-size:12px; }
    #debug-console-panel input, #debug-console-panel select { font-size:16px; min-height:34px; }
    #debug-console-panel input[type="checkbox"] { width:20px; height:20px; }
  }
</style>`;

    let panelOpen = false;
    let refreshTimer = null;

        // the long single column is grouped into tabs, one place per job; a section the table does not know lands in Test
    const DBG_TABS = [
        ['run', 'Run', /SPEED|PLAYER|WAVE|SESSION/],
        ['spawn', 'Spawn', /SPAWN|ENEMIES|SENTINELS|DUMMY/],
        ['skills', 'Skills', /SKILL|SIGIL/],
        ['boss', 'Boss', /GOLIATH|KANADE|TIMELINE|AMMIT|TUTORIAL|ECHO|THAELIS/],
        ['test', 'Test', /./]
    ];
    function organizePanel() {
        const panel = document.getElementById('debug-console-panel');
        if (!panel || panel.dataset.organized) return;
        panel.dataset.organized = '1';
        const head = panel.firstElementChild, hint = head ? head.nextElementSibling : null;
        const status = document.getElementById('dbgSessionStatus'), pauseBtn = document.getElementById('dbgPauseBtn');
        const pauseRow = pauseBtn ? pauseBtn.closest('.dbg-row') : null;
        const recapBtn = panel.querySelector('button[onclick^="debugOpenRecap(false"]'), recapRow = recapBtn ? recapBtn.closest('.dbg-row') : null;
        const sticky = document.createElement('div'); sticky.className = 'dbg-sticky';
        [head, hint, status, pauseRow].forEach(function (el) { if (el) sticky.appendChild(el); });
        const bar = document.createElement('div'); bar.className = 'dbg-tabs'; bar.setAttribute('role', 'tablist');
        sticky.appendChild(bar);
        if (recapRow) {
            const wrap = document.createElement('div'); wrap.className = 'dbg-section';
            wrap.innerHTML = '<div class="dbg-h">VOYAGE RECAP</div>';
            wrap.appendChild(recapRow);
            panel.appendChild(wrap);
        }
        const sections = Array.prototype.slice.call(panel.querySelectorAll(':scope > .dbg-section'));
        sections.forEach(function (sec) {
            const h = sec.querySelector('.dbg-h'), name = h ? h.textContent.toUpperCase() : '';
            for (let i = 0; i < DBG_TABS.length; i++) if (DBG_TABS[i][2].test(name)) { sec.dataset.tab = DBG_TABS[i][0]; break; }
        });
        panel.insertBefore(sticky, panel.firstChild);
        let saved = 'run';
        try { saved = localStorage.getItem('pisces_dbg_tab') || 'run'; } catch (_) { }
        function show(id) {
            if (!DBG_TABS.some(function (t) { return t[0] === id; })) id = DBG_TABS[0][0];
            Array.prototype.forEach.call(bar.children, function (b) { const on = b.dataset.tab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
            sections.forEach(function (sec) { sec.hidden = sec.dataset.tab !== id; });
            try { localStorage.setItem('pisces_dbg_tab', id); } catch (_) { }
            panel.scrollTop = 0;
        }
        DBG_TABS.forEach(function (t) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'dbg-tab'; b.dataset.tab = t[0]; b.textContent = t[1]; b.setAttribute('role', 'tab');
            b.addEventListener('click', function () { show(t[0]); });
            bar.appendChild(b);
        });
        window._debugShowTab = show;
        show(saved);
    }

    function ensurePanel() {
        if (document.getElementById('debugConsoleOverlay')) return;
        document.body.insertAdjacentHTML('beforeend', PANEL_HTML);
        organizePanel();
        buildSigilList();
    }

    function updateSessionStatus() {
        const el = document.getElementById('dbgSessionStatus');
        if (el) {
            const playing = typeof gameState !== 'undefined' && gameState === 'playing';
            if (!playing) {
                el.textContent = 'Not in a match. Click "Initiate Hyperjump" for a normal run, or "Start / Restart Sandbox" above for an empty hands-off one.';
                el.style.color = '#ffcc66';
            } else if (window._debugSessionActive) {
                el.textContent = (gamePaused ? 'PAUSED: ' : 'Running: ') + 'debug sandbox (auto-spawn off, sigil picker skipped).';
                el.style.color = gamePaused ? '#ffcc66' : '#7fffb0';
            } else {
                el.textContent = (gamePaused ? 'PAUSED: ' : 'Running: ') + 'normal match.';
                el.style.color = gamePaused ? '#ffcc66' : '#7fffb0';
            }
        }
        const pauseBtn = document.getElementById('dbgPauseBtn');
        if (pauseBtn) {
            pauseBtn.textContent = gamePaused ? 'Resume Game' : 'Pause Game';
            pauseBtn.classList.toggle('active', !!gamePaused);
        }
        document.querySelectorAll('.dbg-speed-btn').forEach(b => {
            b.classList.toggle('active', parseFloat(b.textContent) === window._debugGameSpeed);
        });
    }

    // Same plain gamePaused toggle the P hotkey uses — exposed as a button
    // too since a hotkey alone isn't discoverable from the panel itself.
    window.debugTogglePause = function () {
        if (typeof gameState === 'undefined' || gameState !== 'playing') return;
        gamePaused = !gamePaused;
        // Match the real ESC pause's audio behavior instead of leaving bgm/
        // engine/laser loops running while everything else is frozen.
        if (window.AudioMgr) {
            if (gamePaused) window.AudioMgr.pauseAll(); else window.AudioMgr.resumeAll();
        }
        updateSessionStatus();
    };

    // Scales the deltaTime fed into update()/draw() every frame (see the
    // `_debugSpeed` multiplier added in js/main.js's gameLoop) — slows down
    // or fast-forwards the whole simulation (movement, cooldowns, spawns)
    // without touching gamePaused.
    window.debugSetSpeed = function (mult) {
        window._debugGameSpeed = mult;
        updateSessionStatus();
    };

    // Real startGame() always immediately opens the sigil-pick overlay
    // (js/main.js: `if (... _sigilPool.length > 0) _triggerSigilPicker()`,
    // unconditional on a fresh run) and the real wave system starts spawning
    // apostles right away — both suppressed here per the request that a
    // debug match should be an empty, hands-off sandbox until you spawn
    // something yourself. window._debugSessionActive is the one new flag
    // that gates the wave-spawner call in main.js's update() loop.
    // sets the flags that make the next startGame() an empty hands-off sandbox; the panel button and Custom Voyage both use it
    window._debugPrepareSession = function () {
        window._debugSessionActive = true;
        window._debugWaveRosterActive = false;
        window._debugAutoshotOff = true;
        window._debugSkipSigilPick = true;
    };

    window.debugStartSession = function () {
        window._debugPrepareSession();
        // Chỉ skip sigil picker khi CHỦ ĐỘNG bấm nút bắt đầu sandbox này —
        // không set ở nơi mở panel nữa, để 1 lượt Initiate Hyperjump bình
        // thường (mở panel trước, rồi bấm nút thật ngoài menu) vẫn đi qua
        // đúng luồng chọn sigil như 1 trận chơi thật.
        window._debugSkipSigilPick = true;
        window._debugStillAny = false; // a fresh sandbox starts with no pinned enemies
        if (typeof startGame === 'function') startGame();
        // The real hyperjump click-chain (index.html) is what normally starts
        // these, but this button skips straight to startGame() without going
        // through it, so the sandbox would otherwise run completely silent.
        if (window.AudioMgr) { window.AudioMgr.stopBgm(); window.AudioMgr.stopMenuSpace(); window.AudioMgr.startAmbient(); window.AudioMgr.startEngine(); }
        window._sigilPicker = null;
        const ov = document.getElementById('sigil-pick-overlay');
        if (ov) ov.style.display = 'none';
        // Nếu gọi từ màn hình START (chưa bấm "Initiate Hyperjump"), overlay
        // easter-egg vẫn còn che kín toàn màn hình — bình thường chỉ được ẩn
        // ở CUỐI chuỗi hiệu ứng 3.5s của nút hyperjump thật (index.html),
        // startGame() tự nó không đụng tới. Ẩn thẳng luôn ở đây để thấy được
        // cả game lẫn panel debug thay vì bị đè khuất phía sau.
        const eggOv = document.getElementById('easter-egg-overlay');
        if (eggOv) eggOv.style.display = 'none';
        if (typeof _wavePhase !== 'undefined') _wavePhase = 'rest';
        updateSessionStatus();
    };

    window.openDebugConsole = function () {
        ensurePanel();
        document.getElementById('debugConsoleOverlay').style.display = 'flex';
        const cb = document.getElementById('dbgAutoshotToggle');
        if (cb) cb.checked = !window._debugAutoshotOff;
        const cdCb = document.getElementById('dbgCooldownToggle');
        if (cdCb) cdCb.checked = !window._debugNoCooldown;
        const apCb = document.getElementById('dbgAutoplayToggle');
        if (apCb) apCb.checked = window._debugAutoplay;
        panelOpen = true;
        refreshEnemyList();
        refreshSentinelList();
        refreshDummyStatus();
        updateSessionStatus();
        _refreshGreatSageGemDisplay();
        _refreshCancerStateDisplay();
        _refreshLeoStateDisplay();
        _refreshSigilSections();
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            const _t0 = performance.now();
            refreshEnemyList(); refreshSentinelList(); refreshDummyStatus(); updateSessionStatus();
            _refreshGreatSageGemDisplay();
            _refreshCancerStateDisplay();
            _refreshLeoStateDisplay();
            _refreshSigilSections();
            _dbgRefreshStackOverflowState();
            const _dt = performance.now() - _t0;
            if (_dt > 15) console.warn('[DBGPANEL] refresh took ' + _dt.toFixed(0) + 'ms');
        }, 500);
    };

    window.closeDebugConsole = function () {
        const ov = document.getElementById('debugConsoleOverlay');
        if (ov) ov.style.display = 'none';
        panelOpen = false;
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    };

    // Reuses the real Main Menu button's own reset logic (js/input.js,
    // exposed as window._goToMenuImmediate: gameState = "start" +
    // window._returnToMainMenu()) instead of re-deriving it here. Debug-only
    // flags are reset separately since that logic knows nothing about them.
    window.debugExitSession = function () {
        window._debugSessionActive = false;
        window._debugSkipSigilPick = false;
        window._debugWaveRosterActive = false;
        window._debugAutoshotOff = false;
        window._debugNoCooldown = false;
        window._debugGameSpeed = 1;
        window._debugClickSpawnType = '';
        window._debugSpawnStill = false;
        window._debugStillAny = false;
        const stillCb = document.getElementById('dbgSpawnStill');
        if (stillCb) stillCb.checked = false;
        _setDebugAutoplay(false);
        const autoplayCb = document.getElementById('dbgAutoplayToggle');
        if (autoplayCb) autoplayCb.checked = false;
        const sel = document.getElementById('dbgClickSpawnType');
        if (sel) sel.value = '';
        if (typeof gamePaused !== 'undefined') gamePaused = false;
        // Calls the real handler directly, not mainMenuBtn.click() - the
        // button now shows a Yes/No confirm first (misclick guard), which
        // isn't appropriate for this already-deliberate debug exit.
        if (typeof window._goToMenuImmediate === 'function') window._goToMenuImmediate();
        window.closeDebugConsole();
    };

    // Dùng chung cho cả phím ` lẫn nút bấm chuột dự phòng (một số bộ gõ
    // tiếng Việt/layout bàn phím có thể nuốt mất phím ` trước khi tới trang).
    // CHỈ mở/đóng panel — không tự start game gì cả. Panel mở được ngay từ
    // màn hình START (chưa Initiate Hyperjump), lẫn cả trong 1 trận thật đã
    // đang chạy; bấm "Initiate Hyperjump" ngoài menu như thường để vào game
    // thật (đủ sigil picker), hoặc dùng nút sandbox trong panel nếu muốn 1
    // trận rỗng, hands-off riêng.
        // a small button that reopens the console during a sandbox run, so phones without the backquote key can reach it
    function ensureFab() {
        if (document.getElementById('dbgFab') || !document.body) return;
        const b = document.createElement('button'); b.id = 'dbgFab'; b.type = 'button'; b.textContent = 'DBG'; b.setAttribute('aria-label', 'Debug console');
        b.style.cssText = 'position:fixed; top:calc(8px + env(safe-area-inset-top, 0px)); left:50%; margin-left:-22px; z-index:999999998; display:none; min-width:44px; min-height:34px; padding:0 10px; font:700 11px "Courier New",monospace; letter-spacing:1px; color:#00e5ff; background:rgba(0,12,28,0.85); border:1px solid rgba(0,229,255,0.5); border-radius:17px; cursor:pointer; touch-action:manipulation;';
        b.addEventListener('click', function () { window._debugToggleConsole(); });
        document.body.appendChild(b);
        setInterval(function () {
            const on = !!window._debugSessionActive && typeof gameState !== 'undefined' && gameState === 'playing' && !panelOpen;
            b.style.display = on ? 'block' : 'none';
        }, 700);
    }
    ensureFab();

    // on the live site the console answers only while Custom Voyage is the chosen mode or its sandbox run is active
    const _dbgDevHost = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname) || location.protocol === 'file:';
    function _dbgKeysAllowed() { return _dbgDevHost || window._gameMode === 'custom' || !!window._debugSessionActive; }

    window._debugToggleConsole = function () {
        if (panelOpen) window.closeDebugConsole(); else window.openDebugConsole();
    };

    document.addEventListener('keydown', (e) => {
        // e.code === 'Backquote' là VỊ TRÍ vật lý cố định (đúng ô cạnh phím
        // "1" trên bàn phím US) — nếu bàn phím thật không có phím đúng chỗ
        // đó (layout khác chuẩn US), code sẽ khác dù gõ ra đúng ký tự `.
        // Thêm e.key === '`' làm dự phòng theo ký tự thực tế đã gõ ra.
        if (!_dbgKeysAllowed()) return;
        if (e.code === 'Backquote' || e.key === '`') {
            e.preventDefault();
            // Giữ phím lâu hơn 1 chút -> OS/browser tự bắn lại nhiều keydown
            // liên tiếp (key repeat) -> mỗi lần lại toggle 1 lần -> panel
            // mở/đóng/mở/đóng nhấp nháy liên tục. Bỏ qua các sự kiện lặp lại.
            if (e.repeat) return;
            window._debugToggleConsole();
            return;
        }
        if (e.code === 'KeyP' && typeof gameState !== 'undefined' && gameState === 'playing') {
            e.preventDefault();
            window.debugTogglePause();
        }
    });

    // Click-to-spawn
    // Independent of the panel being open/closed so a type can be armed
    // once and then spawned repeatedly across the full screen. Ignores
    // clicks that land on the panel itself so its own buttons still work.
    document.addEventListener('click', (e) => {
        const fnName = window._debugClickSpawnType;
        if (!fnName || typeof gameState === 'undefined' || gameState !== 'playing') return;
        // the path is read as it was when the click started, so a button that rebuilds the panel in its own handler is still recognised
        const path = e.composedPath ? e.composedPath() : [];
        for (let i = 0; i < path.length; i++) {
            const n = path[i];
            if (!n || !n.id && !n.matches) continue;
            if (n.id === 'debug-console-panel' || n.id === 'dbgFab') return;
            if (n.matches && n.matches('button, input, select, textarea, a, label, [role="button"]')) return;
        }
        if (e.target.closest && e.target.closest('#debug-console-panel, #dbgFab')) return;
        const gc = document.getElementById('gameCanvas');
        if (!gc) return;
        const rect = gc.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = (e.clientX - rect.left) * (gc.width / rect.width);
        const y = (e.clientY - rect.top) * (gc.height / rect.height);
        window.debugSpawn(fnName, x, y);
    });

    // Player
    window.debugResetPlayer = function () {
        if (typeof player === 'undefined') return;
        player.x = canvas.width / 2;
        player._silenced = false;
        player._rooted = false;
        player._nullSlashSlowed = false;
        if (typeof lives !== 'undefined') lives = START_LIVES;
    };

    window.debugRestartRun = function () {
        window.debugStartSession();
    };

    // Skills
    window.debugForceSkill = function (id) {
        const now = performance.now();
        switch (id) {
            case 'A':
                lastSkillA = -Infinity;
                if (typeof activateSkillA === 'function') activateSkillA();
                break;
            case 'S':
                lastSkillS = -Infinity;
                spirits.length = 0; // activateSkillS blocks while a spirit is already alive
                if (typeof activateSkillS === 'function') activateSkillS();
                break;
            case 'Photokrystos':
                // Đảm bảo có 1 tinh linh THƯỜNG trước (activatePrimevalCreation
                // cần 1 con làm nguồn để biến đổi), rồi mới ép primevalEnergy
                // đầy và gọi lại activateSkillS() thật — không tự viết lại
                // logic biến đổi, chỉ mồi đúng 2 điều kiện nó tự check.
                if (typeof activateSkillS === 'function') {
                    if (!(typeof spirits !== 'undefined' && spirits.some(sp => !sp.isFinishing && !sp.isPhotokrystos))) {
                        lastSkillS = -Infinity;
                        activateSkillS();
                    }
                    if (typeof primevalEnergy !== 'undefined') primevalEnergy = 100;
                    activateSkillS();
                }
                break;
            case 'S-Spinner':
                // Ensures a normal spirit exists, then jumps it straight into
                // the finale's 'firing' state - skips the moving/charging
                // wind-up (2.5s) so the Spinner spawns immediately for a
                // quick visual check.
                {
                    let _spirit = (typeof spirits !== 'undefined') && spirits.find(sp => !sp.isFinishing && !sp.isPhotokrystos);
                    if (!_spirit) {
                        lastSkillS = -Infinity;
                        spirits.length = 0;
                        if (typeof activateSkillS === 'function') activateSkillS();
                        _spirit = spirits[0];
                    }
                    if (_spirit) {
                        _spirit.isFinishing = true;
                        _spirit.finaleState = 'firing';
                        if (typeof updateSpiritFinale === 'function') updateSpiritFinale(_spirit, 16.67);
                        // updateSpiritFinale's 'firing' case resets isFinishing to
                        // false once the Spinner launches, same as a real finale -
                        // normally updateSpirits() itself splices the spirit out
                        // right after seeing that, but this call runs standalone
                        // outside that loop, so it never gets the chance. Without
                        // this, the spirit lingers as if it were a fresh, ordinary
                        // spirit for another full 35s, and the next press just
                        // reuses it instead of testing a clean Spinner launch.
                        const _idx = spirits.indexOf(_spirit);
                        if (_idx !== -1 && !_spirit.isFinishing) spirits.splice(_idx, 1);
                    }
                }
                break;
            case 'D':
                lastSkillD = -Infinity;
                skillDCharging = false; deathStar = null;
                if (typeof activateSkillD === 'function') activateSkillD();
                break;
            case 'F':
                lastSkillF = -Infinity;
                skillFState = 'ready';
                if (typeof activateSkillF === 'function') activateSkillF();
                break;
            case 'G':
                skillGCharge = 100;
                if (typeof activateSkillG === 'function') activateSkillG();
                break;
            case 'TeslaCoil':
                // Drops a coil above the player, fanned out sideways so
                // repeated presses (up to MAX_TESLA_COILS) don't stack on
                // the same spot. No Skill G run needed to test it.
                if (typeof spawnTeslaCoil === 'function') {
                    const _slot = teslaCoils.length;
                    spawnTeslaCoil(player.x + (_slot - 1.5) * 130, Math.max(120, player.y - 260));
                }
                break;
            case 'Shift':
                // Real activation is inlined in js/input.js's keydown handler
                // (there's no standalone activateSkillShift()) — replicated
                // verbatim here rather than re-derived.
                if (!skillShiftActive) {
                    skillShiftActive = true;
                    window._shiftActive = true;
                    // Force FULL tier for the domain's own showcase effects, same reasoning as input.js's real activation.
                    if (window._smartQuality !== false && typeof window._applyGfxLevel === 'function') window._applyGfxLevel(0);
                    skillShiftChargeStart = now;
                    lastSkillShift = now;
                    if (window.AudioMgr) { window.AudioMgr.enterTimeDomain(); window.AudioMgr.playSfx('shift-hold'); }
                }
                break;
            case 'Laser':
                // No standalone activate function — the real trigger lives in
                // main.js's update() loop, checked every frame; priming these
                // fields makes that real check fire on the very next frame.
                laserCooldownEnd = 0;
                charging = true;
                chargeStartTime = now - overloadChargeTime;
                break;
        }
    };

    // Sigils / passives
    function buildSigilList() {
        const el = document.getElementById('dbgSigilList');
        if (!el || typeof SIGIL_ORDER === 'undefined') return;
        const allSigilIds = [...SIGIL_ORDER, ...(typeof SIGIL_EXTRA !== 'undefined' ? SIGIL_EXTRA : [])];
        el.innerHTML = allSigilIds.map(id => {
            const def = SIGIL_DEFS[id];
            return `<label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgSigil_${id}" onchange="debugToggleSigil('${id}', this.checked)">
        <span style="color:${def.color}">${def.name}</span>
        <span class="dbg-note dbg-note-flush">(${def.buffs.map(b => b.name).join(' / ')})</span>
      </label>`;
        }).join('');
        syncSigilCheckboxes();
    }

    function syncSigilCheckboxes() {
        if (typeof SIGIL_ORDER === 'undefined') return;
        [...SIGIL_ORDER, ...(typeof SIGIL_EXTRA !== 'undefined' ? SIGIL_EXTRA : [])].forEach(id => {
            const cb = document.getElementById('dbgSigil_' + id);
            if (cb) cb.checked = typeof _hasSigil === 'function' && _hasSigil(id);
        });
    }

    window.debugToggleSigil = function (sigilId, on) {
        window._playerSigils = window._playerSigils || [];
        if (on) {
            if (!window._playerSigils.some(s => s.sigilId === sigilId)) {
                if (typeof _completeSigilPicker === 'function') {
                    // Real pick-confirm function — pushes the sigil, applies
                    // both its buffs' one-time effects, resumes wave/BGM
                    // state. Harmless to call with no picker actually open.
                    _completeSigilPicker(sigilId);
                }
            }
        } else {
            const i = window._playerSigils.findIndex(s => s.sigilId === sigilId);
            if (i !== -1) window._playerSigils.splice(i, 1);
        }
        _refreshSigilSections();
    };

    // Spawn enemy / sentinel
    // Administrator's Blessing on a debug spawn. Runs after the HP/Size/Speed
    // overrides so its +20% Max HP and its own speed cut sit on top of the
    // values typed in, matching the order the real wave path uses.
    function applyDebugBlessing(enemy) {
        const el = document.getElementById('dbgSpawnBlessed');
        if (!el || !el.checked) return;
        if (typeof _applyAdminBlessing === 'function') _applyAdminBlessing(enemy);
    }

    function applySpawnStatOverrides(obj, allowSpeed) {
        const hpEl = document.getElementById('dbgSpawnHp');
        const sizeEl = document.getElementById('dbgSpawnSize');
        const speedEl = document.getElementById('dbgSpawnSpeed');
        const hp = hpEl && hpEl.value !== '' ? Number(hpEl.value) : null;
        const size = sizeEl && sizeEl.value !== '' ? Number(sizeEl.value) : null;
        const speed = speedEl && speedEl.value !== '' ? Number(speedEl.value) : null;
        if (hp !== null && !isNaN(hp) && hp > 0) { obj.hp = hp; obj.maxHp = hp; }
        if (size !== null && !isNaN(size) && size > 0) obj.size = size;
        if (allowSpeed && speed !== null && !isNaN(speed)) obj.speed = speed;
    }

    // fnName === 'spawnSentinel' is handled separately: it pushes into the
    // separate `sentinels` array via a different (x, y, forceNormal)
    // signature rather than `enemies` with no params. x/y, when given,
    // come from a canvas click (see the click-to-spawn listener below);
    // omitted for the plain toolbar buttons, which use each spawner's own
    // default position.
    window.debugSpawn = function (fnName, x, y) {
        if (fnName === 'spawnSentinel') {
            if (typeof spawnSentinel !== 'function') return;
            const px = (typeof x === 'number') ? x : player.x;
            const py = (typeof y === 'number') ? y : player.y - 60;
            spawnSentinel(px, py, false);
            applySpawnStatOverrides(sentinels[sentinels.length - 1], false);
            refreshSentinelList();
            return;
        }
        if (typeof window[fnName] !== 'function') return;
        const before = enemies.length;
        window[fnName]();
        if (enemies.length <= before) return; // spawnMarchosiasMinion-style no-ops
        const e = enemies[enemies.length - 1];
        if (typeof x === 'number') e.x = x;
        if (typeof y === 'number') e.y = y;
        applySpawnStatOverrides(e, true);
        applyDebugBlessing(e);
        // Spawn still: stand where it appeared (a spot in the upper screen when no click gave one) and never move
        if (window._debugSpawnStill) {
            if (typeof x !== 'number') e.x = canvas.width * (0.2 + 0.15 * ((window._debugStillSlot = (window._debugStillSlot || 0) + 1) % 5));
            if (typeof y !== 'number') e.y = canvas.height * 0.28;
            pinEnemy(e, true);
        }
        refreshEnemyList();
    };

    // A pinned enemy is put back on its spot every frame by main.js, so whatever its own movement does, it stays and still casts.
    function pinEnemy(e, on) {
        if (on) {
            if (e._debugStill) return;
            e._debugStill = true; e._stillX = e.x; e._stillY = e.y; e._stillSpeed = e.speed;
            e.speed = 0;
            window._debugStillAny = true;
        } else if (e._debugStill) {
            e._debugStill = false;
            if (e._stillSpeed !== undefined) e.speed = e._stillSpeed;
        }
    }
    window.debugPinEnemies = function (on) {
        for (const e of enemies) {
            if (e.hp <= 0 || e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain') continue;
            pinEnemy(e, on);
        }
        refreshEnemyList();
    };

    window.debugSpawnSentinel = function () { window.debugSpawn('spawnSentinel'); };

    // Kanade's cutscene, driven exactly as a boss wave drives it so the freeze,
    // the audio gate, the background hold and the summon all behave the same.
    // Endless Echo testing. Finds the True Form Goliath or makes one, then
    // fires the cast as soon as the next frame can take it.
    function _dbgEchoTarget(spawnIfMissing) {
        let g = enemies.find(e => e.type === 'goliath' && e.phase === 'true_form');
        if (!g && spawnIfMissing) {
            spawnGoliath();
            g = enemies.find(e => e.type === 'goliath');
            g.slots.forEach((sl, i) => { if (!sl.filled) { sl.filled = true; sl.gem = GOLIATH_GEM_COLORS[i]; } });
            _goliathEnterTrueForm(g);
            g._transformIronBodyEnd = 0;
        }
        return g && g.phase === 'true_form' ? g : null;
    }
    window.debugEchoCast = function (spawnIfMissing) {
        const g = _dbgEchoTarget(spawnIfMissing);
        if (!g) return;
        if (g._echoSamples.length < GOLIATH_ECHO_MIN_SAMPLES) {
            g._echoSamples = Array.from({ length: GOLIATH_ECHO_SAMPLES }, (_, i) => ({
                x: player.x - 110 + i * 14 + Math.sin(i * 0.6) * 40,
                y: player.y - 10 - i * 7,
            }));
        }
        g._echoCooldownEnd = 0;
    };
    let _dbgEchoLoopTimer = null;
    window.debugEchoLoop = function () {
        const label = document.getElementById('dbgEchoLoopState');
        if (_dbgEchoLoopTimer) {
            clearInterval(_dbgEchoLoopTimer);
            _dbgEchoLoopTimer = null;
            if (label) label.textContent = 'off';
            return;
        }
        if (label) label.textContent = 'on';
        _dbgEchoLoopTimer = setInterval(() => {
            enemies.forEach(e => {
                if (e.type === 'goliath' && e.phase === 'true_form' && e._echoPhase === 'ready') e._echoCooldownEnd = 0;
            });
        }, 500);
    };
    window.debugEchoClear = function () {
        window._goliathEchoes = [];
        enemies.forEach(e => {
            if (e.type === 'goliath') { e._echoPhase = 'ready'; e._echoTrailEnd = 0; e._echoReleaseAt = 0; }
        });
    };

    function _dbgSelectedTimelineDistortion() {
        const select = document.getElementById('dbgTimelineDistortion');
        return TIMELINE_DISTORTION_POOL.find(effect => effect.id === (select && select.value)) || TIMELINE_DISTORTION_POOL[0];
    }

    window.debugPlayKanadeCutscene = function (noGoliath) {
        if (typeof window._beginKanadeCutscene !== 'function' || typeof _rollTimelineDistortion !== 'function') return;
        // The summon beat calls _spawnWaveGoliath itself. Stubbing it out for
        // this one run is how the "no Goliath" variant stays a pure preview of
        // the animation without leaving a boss behind afterwards.
        if (noGoliath) {
            const _realSpawn = window._spawnWaveGoliath;
            window._spawnWaveGoliath = function () {};
            setTimeout(() => { window._spawnWaveGoliath = _realSpawn; }, (window._KANADE_CUTSCENE_MS || 12000) + 500);
        }
        window._beginKanadeCutscene(_dbgSelectedTimelineDistortion(), typeof _waveNumber !== 'undefined' ? _waveNumber : 5);
        refreshEnemyList();
    };

    window.debugStopKanadeCutscene = function () {
        window._kanadeCutscene = null;
        // Undo what the freeze had taken over, since cutting it short skips
        // the cutscene's own teardown.
        if (window.AudioMgr && window.AudioMgr.setTimeFrozen) window.AudioMgr.setTimeFrozen(false, true);
        window._bgPaused = false;
        if (window._pixiApp && window._pixiApp.stage) window._pixiApp.stage.alpha = 1;
    };

    window.debugToggleStackOverflow = function () {
        if (typeof _applyTimelineDistortion !== 'function') return;
        const selected = _dbgSelectedTimelineDistortion();
        if (window._timelineDistortion && window._timelineDistortion.id === selected.id) _clearTimelineDistortion();
        else _applyTimelineDistortion(selected);
        _dbgRefreshStackOverflowState();
    };

    function _dbgRefreshStackOverflowState() {
        const el = document.getElementById('dbgStackOverflowState');
        if (!el) return;
        const on = !!window._timelineDistortion;
        el.textContent = on
            ? 'active: ' + (window._timelineDistortion ? window._timelineDistortion.name : '?')
            : 'inactive';
    }

    const KANADE_EXPRESSIONS = ['neutral', 'serene', 'thinking', 'determined',
        'smug', 'happy', 'surprised', 'angry', 'sad', 'pain'];

    function _kanadeModelState() {
        const m = window._kanadeDebugModel;
        const el = document.getElementById('dbgKanadeModelState');
        if (!el) return;
        el.textContent = m
            ? (m.back ? 'back' : 'front') + ' / ' + m.expression +
              (m.still ? ' / still' : ' / idle') + (m.grid ? ' / grid' : '') +
              (m.castExt ? ' / cast' : '')
            : 'off';
    }

    window.debugToggleKanadeModel = function () {
        window._kanadeDebugModel = window._kanadeDebugModel
            ? null
            : { back: false, expression: 'neutral', still: false, grid: true, blink: true, castExt: 0, trail: 0 };
        _kanadeModelState();
    };

    window.debugKanadeModel = function (what) {
        const m = window._kanadeDebugModel;
        if (!m) return;
        if (what === 'back') m.back = !m.back;
        else if (what === 'still') m.still = !m.still;
        else if (what === 'grid') m.grid = !m.grid;
        else if (what === 'cast') m.castExt = m.castExt ? 0 : 1;
        else if (what === 'expr') {
            const i = KANADE_EXPRESSIONS.indexOf(m.expression);
            m.expression = KANADE_EXPRESSIONS[(i + 1) % KANADE_EXPRESSIONS.length];
        }
        _kanadeModelState();
    };

    window.debugResetKanadeIntro = function () {
        try {
            localStorage.removeItem('kanadeIntroSeen');
            localStorage.removeItem('kanadeSkipCutscene');
        } catch (_) {}
    };

    // Tái dùng đúng logic wave thật (js/main.js: _getWaveTemplate +
    // _spawnWaveTier) thay vì tự suy ra số lượng riêng — spawn NGAY LẬP TỨC
    // toàn bộ thành phần của 1 wave bất kỳ (kể cả Goliath nếu chia hết 5),
    // thay vì rải đều trong 15s như wave thật.
    window.debugSpawnWaveComposition = function () {
        if (typeof _updateWaveSystem !== 'function' || typeof _wavePhase === 'undefined') return;
        const input = document.getElementById('dbgWaveNum');
        const waveNum = Math.max(1, Math.floor(Number(input && input.value) || 1));
        // Drive the real wave system for one wave: a 3s countdown, then the
        // normal wave banner and the gradual trickle/queue spawn, instead
        // of dumping the whole roster at once. _debugWaveRosterActive lets
        // the (otherwise frozen) wave system run for just this one wave and
        // hands control back once it's spawned + cleared - see js/main.js.
        _waveNumber = waveNum - 1;
        _wavePhase = 'rest';
        _waveRestTimer = 3000;
        _waveForceEndTimer = 0;
        window._debugWaveRosterActive = true;
        refreshEnemyList();
    };

    window._dbgHint = function (btn) {
        const el = document.getElementById('dbgSpawnHint');
        if (!el) return;
        if (!btn) { el.textContent = ''; return; }
        const hp = btn.dataset.hp, size = btn.dataset.size;
        el.textContent = btn.textContent.trim() + ': HP ' + hp + ', size ' + size;
    };

    // Combat Dummy
    function _getDummy() {
        if (typeof enemies === 'undefined') return null;
        return enemies.find(e => e.type === 'debug_dummy') || null;
    }

    window.debugSpawnDummy = function () {
        const hpEl = document.getElementById('dbgDummyHp');
        const sizeEl = document.getElementById('dbgDummySize');
        const drEl = document.getElementById('dbgDummyDR');
        const hp = Math.max(1, Number(hpEl && hpEl.value || 5000000));
        const size = Math.max(10, Number(sizeEl && sizeEl.value || 40));
        const dr = Math.min(0.99, Math.max(0, Number(drEl && drEl.value || 0) / 100));
        window.debugRemoveDummy();
        if (typeof enemies === 'undefined' || typeof canvas === 'undefined') return;
        const _cx = canvas.width > 0 ? canvas.width / 2 : window.innerWidth / 2;
        const _cy = canvas.height > 0 ? canvas.height * 0.4 : window.innerHeight * 0.4;
        enemies.push({
            type: 'debug_dummy',
            x: _cx, y: _cy,
            hp, maxHp: hp, size,
            speed: 0, vx: 0, vy: 0,
            shield: 0, vulnStacks: 0,
            isTargetedByA: false, hitBySkillF: false, laserHit: false,
            _state: 'idle', _stateTime: performance.now(),
            _ironActive: false, _isImmune: false,
            _debugDR: dr,
            _particles: [],
        });
        refreshDummyStatus();
    };

    window.debugSetDummyDR = function (val) {
        const d = _getDummy();
        if (!d) return;
        d._debugDR = Math.min(0.99, Math.max(0, Number(val) / 100));
    };

    window.debugResetDummyDps = function () {
        const d = _getDummy();
        if (d) d._dps = null;
    };

    window.debugRemoveDummy = function () {
        if (typeof enemies === 'undefined') return;
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (enemies[i].type === 'debug_dummy') enemies.splice(i, 1);
        }
        refreshDummyStatus();
    };

    window.debugSetDummyIron = function (on) {
        const d = _getDummy();
        if (d) d._ironActive = !!on;
    };

    window.debugSetDummyImmune = function (on) {
        const d = _getDummy();
        if (d) d._isImmune = !!on;
    };

    window.debugDummyState = function (state) {
        const d = _getDummy();
        if (!d) return;
        d._state = state;
        d._stateTime = performance.now();
        if (state === 'death') { d.hp = d.maxHp; } // let respawn anim play
        refreshDummyStatus();
    };

    function refreshDummyStatus() {
        const el = document.getElementById('dbgDummyStatus');
        if (!el) return;
        const d = _getDummy();
        if (!d) { el.textContent = 'No dummy on screen.'; return; }
        const _drPct = d._debugDR ? Math.round(d._debugDR * 100) : 0;
        el.textContent = `Active: ${Math.max(0, Math.round(d.hp))}/${Math.round(d.maxHp)} HP · DR ${_drPct}% · ${d._state}${d._ironActive ? ' · iron' : ''}${d._isImmune ? ' · immune' : ''}`;
        const ironCb = document.getElementById('dbgDummyIron');
        if (ironCb) ironCb.checked = !!d._ironActive;
        const immuneCb = document.getElementById('dbgDummyImmune');
        if (immuneCb) immuneCb.checked = !!d._isImmune;
        const drLive = document.getElementById('dbgDummyDRLive');
        if (drLive && document.activeElement !== drLive) drLive.value = _drPct || '';
    }

    // Core passives (not sigils)
    window.debugForceAccurateParry = function () {
        if (typeof accurateParryActive === 'undefined') return;
        accurateParryActive = true;
        accurateParryEndTime = performance.now() + 4000;
    };

    // Forces the player._silenced overlay so both debuff icons (Dargruel's
    // root+silence chain vs Goliath's silence-only attacks) can be checked
    // visually without waiting for either enemy to actually land a hit.
    window.debugForceSilence = function (kind) {
        if (typeof player === 'undefined') return;
        player._silenced = true;
        player._silenceEnd = performance.now() + 4000;
        player._rooted = (kind === 'dargruel');
    };

    // Pisces testing: puts every skill on cooldown, then refunds 2s to each
    // through the path kills and movement use. One click shows the slot
    // outlines, the ship aura and a full 12 Flow points.
    window.debugPiscesRefund = function () {
        if (typeof _markCdGlow !== 'function' || !_hasBuff('dong_chay_luan_hoi')) return;
        const now = performance.now();
        lastSkillShift = lastSkillA = lastSkillS = lastSkillD = lastSkillF = now - 2000;
        laserCooldownEnd = now + laserCooldownDuration - 2000;
        for (const slot in window._cdGlowEnd) _markCdGlow(slot, now, 2000);
        _flushPiscesRefund(NaN, NaN);
    };

    // Great Sage sigil testing: "Fire" calls the same _castStolenGemAttack
    // used by the real F-to-release flow, but standalone (doesn't touch the
    // gem bank) so each of the 8 stolen attacks can be checked in isolation.
    // "+Gem" instead goes through the real bank (respects the 3-slot cap and
    // no-duplicate-type rule) so the actual press-F-to-release path can be
    // exercised end to end.
    window.debugGreatSageFire = function (type) {
        if (typeof _castStolenGemAttack !== 'function') return;
        _castStolenGemAttack(type, 1);
    };
    // idx runs the action on that one enemy, no idx runs it on every living Thaelis
    window.debugThaelis = function (action, idx) {
        if (action === 'hatch') {
            for (const c of enemies) if (c.type === 'thaelis_cocoon' && c.hp > 0) c._cocoonTimer = 1;
            return;
        }
        const targets = typeof idx === 'number' ? [enemies[idx]] : enemies.filter(x => x.type === 'thaelis');
        for (const e of targets) {
            if (!e || e.type !== 'thaelis' || !(e.hp > 0)) continue;
            const max = e.maxHp, now = performance.now();
            if (action === 'fill') { e._ordealQueue = THAELIS_ORDEAL_MAX_QUEUE; e._ordealCd = 0; e._ordealCastAt = -1e9; }
            else if (action === 'cast') { e._ordealQueue = Math.max(1, e._ordealQueue || 0); e._ordealCd = 0; e._ordealCastAt = -1e9; _castThaelisWave(e); }
            else if (action === 'slowlane') { e._ordealSlowPts = THAELIS_ORDEAL_SLOW_POINTS; e._ordealBonus = THAELIS_ORDEAL_OVER_DMG_MAX; e._ordealQueue = Math.max(1, e._ordealQueue || 0); e._ordealCd = 0; e._ordealCastAt = -1e9; }
            else if (action === 'points') _thaelisOrdealAddPoints(e, 3);
            else if (action === 'shield') _addEnemyShield(e, max * 0.30);
            else if (action === 'tenacity') {
                e._tenacityBarrier70 = e._tenacityBarrier40 = e._tenacityBarrier10 = false;
                e.hp = max * 0.71;
                dealDamage(e, { damage: max * 0.04, isTrueDamage: true, _bypassIronBody: true, isSpiritLaser: true });
            }
            else if (action === 'absorb') {
                if (!((e.shield || 0) > 0)) _addEnemyShield(e, max * 0.30);
                if (e.hp >= max) e.hp = max * 0.6;
                dealDamage(e, { damage: max * 0.1, isTrueDamage: true, _bypassIronBody: true });
            }
            else if (action === 'overheal') { e.hp = max; _thaelisShroudHeal(e, max * 0.2); }
            else if (action === 'break') { e.shield = 0; e._shieldBreakCrackAt = now; }
            else if (action === 'hurt') e.hp = max * 0.5;
            else if (action === 'reborn') { e.reincarnated = true; e._justRevivedAt = now; }
            else if (action === 'cocoon') { e._cocoonCooldownUntil = 0; e.hp = 0; }
        }
        refreshEnemyList();
    };
    window.debugThaelisOrdeal = function () { window.debugThaelis('fill'); };
    window.debugGreatSageGiveGem = function (type) {
        if (typeof _greatSageGems === 'undefined') return;
        if (_greatSageGems.length < 3 && !_greatSageGems.includes(type)) _greatSageGems.push(type);
        _refreshGreatSageGemDisplay();
    };
    window.debugGreatSageFillCombo = function () {
        if (typeof _greatSageGems === 'undefined') return;
        _greatSageGems = ['thaelis', 'raphael', 'goliath'];
        _refreshGreatSageGemDisplay();
    };
    window.debugGreatSageClearGems = function () {
        if (typeof _greatSageGems === 'undefined') return;
        _greatSageGems.length = 0;
        _refreshGreatSageGemDisplay();
    };
    window.debugGreatSageForceStealth = function () {
        window._greatSageStealthEnd = performance.now() + 1000;
    };
    function _refreshGreatSageGemDisplay() {
        const section = document.getElementById('dbgGreatSageSection');
        const equipped = typeof _hasSigil === 'function' && _hasSigil('than');
        if (section) section.style.display = equipped ? '' : 'none';
        if (!equipped) return;
        const el = document.getElementById('dbgGreatSageGems');
        if (!el || typeof _greatSageGems === 'undefined') return;
        el.textContent = _greatSageGems.length ? 'Bank: ' + _greatSageGems.join(', ') : 'Bank: (empty)';
    }

    window.debugCancerFillMeter = function () {
        if (typeof _feedTidalSurgeMeter !== 'function' || typeof TIDAL_SURGE_METER_MAX === 'undefined') return;
        _feedTidalSurgeMeter(TIDAL_SURGE_METER_MAX);
        _refreshCancerStateDisplay();
    };
    window.debugCancerRelease = function () {
        if (typeof _releaseTidalSurge === 'function') _releaseTidalSurge();
        _refreshCancerStateDisplay();
    };
    window.debugCancerOceanHunter = function () {
        if (typeof findClosestEnemy !== 'function' || typeof _tryOceanHunterExecute !== 'function') return;
        const e = findClosestEnemy(player.x, player.y);
        if (e) { e.hp = Math.max(1, Math.ceil(e.maxHp * 0.05)); _tryOceanHunterExecute(e); }
    };
    window.debugCancerClear = function () {
        if (typeof _tidalSurgeMeter !== 'undefined') _tidalSurgeMeter = 0;
        if (typeof _tidalSurgeOverflow !== 'undefined') _tidalSurgeOverflow = 0;
        window._tidalSurgeReady = false;
        if (typeof _tidalSurgeEffects !== 'undefined') _tidalSurgeEffects.length = 0;
        if (typeof _oceanHunterBites !== 'undefined') _oceanHunterBites.length = 0;
        _refreshCancerStateDisplay();
    };
    // Leo debug: every button equips the sigil first so it works from a bare sandbox.
    function _dbgEnsureLeo() {
        if (typeof _hasSigil === 'function' && !_hasSigil('leo') && typeof window.debugToggleSigil === 'function') {
            window.debugToggleSigil('leo', true);
            if (typeof syncSigilCheckboxes === 'function') syncSigilCheckboxes();
        }
        return typeof _leoHasFateMeter === 'function';
    }
    window.debugLeoSetFate = function (pct) {
        if (!_dbgEnsureLeo()) return;
        window._leoFateRestMs = 0;
        window._leoFateMeter = Math.max(0, Math.min(LEO_FATE_METER_MAX, pct));
        window._leoFateReady = window._leoFateMeter >= LEO_FATE_METER_MAX;
        window._leoChargeFlashMs = 300;
        _refreshLeoStateDisplay();
    };
    window.debugLeoRelease = function () {
        if (!_dbgEnsureLeo()) return;
        if ((window._tidalSurgeReady || window._leoFateReady) && !player._silenced) _releaseReadySpaceSigil();
        _refreshLeoStateDisplay();
    };
    window.debugLeoPetrify = function (ms) {
        if (!_dbgEnsureLeo()) return;
        _leoStartPetrify(ms, ms === LEO_FATE_ACTIVE_MS);
        _refreshLeoStateDisplay();
    };
    window.debugLeoClear = function () {
        if (typeof _leoReset === 'function') _leoReset();
        _refreshLeoStateDisplay();
    };
    window.debugDauCrow = function () {
        if (typeof _hasSigil === 'function' && !_hasSigil('dau') && typeof window.debugToggleSigil === 'function') {
            window.debugToggleSigil('dau', true);
            if (typeof syncSigilCheckboxes === 'function') syncSigilCheckboxes();
        }
        if (typeof _dauTriggerCrow === 'function') _dauTriggerCrow();
    };
    // Each sigil's debug section shows only while that sigil is equipped.
    const _DBG_SIGIL_SECTIONS = [['dbgTySection', 'ty'], ['dbgLeoSection', 'leo'], ['dbgDauSection', 'dau'], ['dbgPiscesSection', 'pisces'], ['dbgCapricornSection', 'capricorn']];
    window.debugTyAction = function (action) {
        if (!_hasSigil('ty')) return;
        if (action === 'venom') {
            let found = false;
            for (let i = 0; i < enemies.length; i++) if (_tyVenomTarget(enemies[i])) { found = true; break; }
            if (!found) debugSpawnDummy();
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i]; if (!_tyVenomTarget(e)) continue;
                _tyClearVenom(e); for (let stack = 0; stack < 5; stack++) _tyAddVenom(e);
            }
        }
        if (action === 'fill') _tyChargeFlame(10000);
        if (action === 'detonate') { _tyChargeFlame(10000); _tyDetonate(_tyNearest(player.x, player.y, Infinity, false)); }
        if (action === 'array') _tyOpenArray();
        if (action === 'spawn') {
            window._tySwarmEnd = window._tyClock + 8000; window._tySwarmLimit = window._tyClock + 12000;
            _tySpawnSerpents(player.x, player.y); _tyRestoreShield();
        }
        if (action === 'break') _tyBlockHit({ x: player.x + 80, y: player.y });
        if (action === 'restore') _tyRestoreShield();
        _refreshSigilSections();
    };
    function _refreshSigilSections() {
        for (const [id, sigil] of _DBG_SIGIL_SECTIONS) {
            const section = document.getElementById(id);
            if (section) section.style.display = typeof _hasSigil === 'function' && _hasSigil(sigil) ? '' : 'none';
        }
        _refreshCapricornStateDisplay();
        const state = document.getElementById('dbgTyState');
        if (state && _hasSigil('ty')) {
            let alive = 0; for (let i = 0; i < _tySerpents.length; i++) if (_tySerpents[i].active) alive++;
            const phase = !_tyArray.active ? 'idle' : _tyArray.exploded ? 'burst' : window._tyClock - _tyArray.start < 180 ? 'opening' : 'pull';
            state.textContent = 'Flame: ' + Math.round(window._tyCharge / 100) + '% · Allied damage: +' + window._tyFangStacks.toFixed(1) + '% · Venom bites: ' + window._tyVenomBites + ' · Serpents: ' + alive + ' (' + (Math.max(0, window._tySwarmEnd - window._tyClock) / 1000).toFixed(1) + 's) · Shield: ' + (_tyShield.state === 1 || _tyShield.state === 3 ? 'ready' : 'broken') + ' · Bites: ' + _tyShield.bites + '/12 · Array: ' + phase;
        }
    }
    function _refreshCapricornStateDisplay() {
        const el = document.getElementById('dbgCapricornState');
        if (!el || typeof _hasSigil !== 'function' || !_hasSigil('capricorn')) return;
        const st = window._capMountain, stacks = window._capStacks || 0;
        const phase = !st ? 'none' : st.elapsed < 350 ? 'falling' : st.elapsed < 900 ? 'splitting' : st.elapsed < 4900 ? 'walls up' : 'collapsing';
        el.textContent = 'Stacks: ' + stacks + ' (+' + (stacks * 0.5).toFixed(1) + '% dmg) · since last: ' + ((window._capSinceGain || 0) / 1000).toFixed(1) + 's'
            + ' · Ley: ' + Math.round(window._capLey || 0) + '% ' + (window._capricornReady ? '(READY)' : '') + ' · Mountain: ' + phase
            + (st ? ' · wall hits: ' + st.walls.map(w => w.broken ? 'X' : w.hitCount).join('/') : '')
            + ' · blocked: ' + Object.entries(window._capBlockedCounts || {}).map(([kind, n]) => kind + '=' + n).join(' ');
    }
    window.debugCapricornStacks = function (n) {
        if (typeof _capAddStacks !== 'function') return;
        _capAddStacks(n);
        _refreshCapricornStateDisplay();
    };
    window.debugCapricornDecay = function () {
        if ((window._capStacks || 0) > 0) window._capSinceGain = CAP_WARN_MS;
        _refreshCapricornStateDisplay();
    };
    window.debugCapricornFillLey = function () {
        if (window._capMountain) return;
        window._capLey = 100;
        window._capricornReady = true;
        _refreshCapricornStateDisplay();
    };
    window.debugCapricornRelease = function () {
        if ((window._tidalSurgeReady || window._leoFateReady || window._capricornReady) && !player._silenced) _releaseReadySpaceSigil();
        _refreshCapricornStateDisplay();
    };
    window.debugCapricornDrop = function () {
        if (window._capMountain || typeof _releaseCapricorn !== 'function') return;
        window._capLey = 100;
        window._capricornReady = true;
        _releaseCapricorn();
        _refreshCapricornStateDisplay();
    };
    window.debugCapricornDropAt = function (x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y) || typeof _capBuildMountain !== 'function') return null;
        const st = _capBuildMountain(x, y);
        window._capMountain = st; window._capLey = 0; window._capricornReady = false;
        if (typeof _capOnCast === 'function') _capOnCast(st);
        _refreshCapricornStateDisplay();
        return st;
    };
    window.debugCapricornClear = function () {
        const stacks = window._capStacks;
        if (typeof _capricornReset === 'function') _capricornReset();
        if (stacks > 0 && typeof _capOnStacksLost === 'function') _capOnStacksLost();
        _refreshCapricornStateDisplay();
    };
    function _refreshLeoStateDisplay() {
        const el = document.getElementById('dbgLeoState');
        if (!el) return;
        if (typeof _hasSigil !== 'function' || !_hasSigil('leo')) return;
        const pct = typeof _leoFatePercent === 'function' ? _leoFatePercent() : 0;
        el.textContent = `Fate: ${pct.toFixed(1)}% ${window._leoFateReady ? '(READY)' : ''} · ATK +${(pct * LEO_FATE_ATK_PER_PERCENT * 100).toFixed(1)}%`
            + ` · Petrify: ${(window._leoPetrifyMs / 1000).toFixed(1)}s · Rest: ${(window._leoFateRestMs / 1000).toFixed(1)}s`
            + ` · Burning: ${window._sthBurning ? window._sthBurning.size : 0}`;
    }

    function _refreshCancerStateDisplay() {
        const section = document.getElementById('dbgCancerSection');
        const equipped = typeof _hasSigil === 'function' && _hasSigil('cancer');
        if (section) section.style.display = equipped ? '' : 'none';
        if (!equipped) return;
        const el = document.getElementById('dbgCancerState');
        if (!el || typeof _tidalSurgeMeter === 'undefined') return;
        const pct = Math.round((_tidalSurgeMeter / TIDAL_SURGE_METER_MAX) * 100);
        el.textContent = `Meter: ${pct}% ${window._tidalSurgeReady ? '(READY)' : ''} · Overflow: ${Math.round(_tidalSurgeOverflow || 0)} · Whirlpools: ${(_tidalSurgeEffects || []).length}`;
    }

    window.debugApplyVuln = function (idx) {
        const e = enemies[idx];
        if (!e || typeof applyVulnerability !== 'function') return;
        applyVulnerability(e);
        refreshEnemyList();
    };

    // Active enemy list
    function debugSetHp(idx) {
        const input = document.getElementById('dbgHp_' + idx);
        const e = enemies[idx];
        if (!input || !e) return;
        const v = Math.max(0, Math.floor(Number(input.value) || 0));
        if (e.type === 'goliath' && e.phase !== 'true_form') {
            // Alpha/Transforming: HP luôn khoá ở 1 (bất khả xâm phạm) — ô này
            // thật ra chỉnh Damage Pull, thứ thật sự quyết định Max HP lúc vào
            // True Form. Không tự áp trần 50k ở đây — công thức thật
            // (max(50000, min(pull,200000) * (1+0.15*gemPoints)), xem nơi tính
            // Max HP lúc _goliathEnterTrueForm) đã tự lo phần đó.
            e.damagePull = v;
            return;
        }
        e.hp = v;
        if (v > e.maxHp) e.maxHp = v;
    }
    window.debugSetHp = debugSetHp;

    window.debugKillEnemy = function (idx) {
        const e = enemies[idx];
        if (!e) return;
        if (e.type === 'goliath') {
            if (e.phase === 'true_form') {
                // Debug kill cần chắc chắn giết được ngay — bỏ qua thẳng mọi
                // lớp phòng thủ của Goliath (Iron Body biến hình, Iron Body
                // Fracture Step, Arc Barrier) thay vì đi qua dealDamage như
                // bình thường, vì các lớp đó có thể hấp thụ trọn 1 đòn bất kể
                // sát thương lớn cỡ nào. updateGoliath sẽ tự bắt hp<=0 ở True
                // Form và chạy chuỗi hiệu ứng chết thật ở frame kế tiếp.
                e._transformIronBodyEnd = 0;
                e._fractureIronBodyHits = 0;
                if (e.arcBarrier) e.arcBarrier.hp = 0;
                e.hp = 0;
            } else {
                // Alpha/Transforming không có state "chết" thật (chỉ biến
                // hình) — debug xoá thẳng khỏi màn thay vì giả vờ giết.
                enemies.splice(idx, 1);
            }
            refreshEnemyList();
            return;
        }
        // Every other type: force the kill directly instead of routing
        // through dealDamage's normal damage math. Several enemies have a
        // per-hit % MaxHP cap that applies even to true damage (Veilshroud
        // Phantom, Thaelis Tenacity Bulwark, Leviathan/Dargruel Inevitable,
        // Uriel's Covenant King, Egregor's body, embryo, Marchosias minion),
        // on top of ironBodyHits/absoluteShield/Custos Aeternus/thaelis_cocoon
        // - any of which can eat a single hit no matter how large. One debug
        // press must always actually kill, so bypass all of it the same way
        // Skill F's own instant-kill does: zero shield/hp directly.
        e.shield = 0;
        e.hp = 0;
        // Leviathan's death-laser spawn is only triggered from inside
        // dealDamage's own hp<=1 check - a direct hp=0 set skips it, so fire
        // a harmless 0-damage call just to run that hook, same as Skill F does.
        // The AFO shield's own early-return would skip that check too, so
        // it's cleared first.
        if (e.type === 'leviathan' && !e._deathLaserSpawned && typeof dealDamage === 'function') {
            e.afoShieldActive = false;
            dealDamage(e, { damage: 0, percentDamage: 0, _bypassIronBody: true, _statSrc: 'Debug Kill' });
        }
        refreshEnemyList();
    };

    window.debugClearDefense = function (idx) {
        const e = enemies[idx];
        if (!e) return;
        if (e.type === 'raphael') e.raphaelInvulnerable = false;
        if (e.type === 'leviathan' && e.afoShieldActive) {
            // Jump straight to the shield actually breaking — same end
            // state and effects the real announce→charge→sweep sequence
            // produces, so the shield-break burst still fires (a bare
            // afoShieldActive=false skips that entirely, which is why this
            // button used to look like it "did nothing").
            e.afoShieldActive = false;
            e.afoShieldBroken = true;
            e.afoAnnouncePending = false;
            e.afoAnnouncing = false;
            e.perseveranceCharging = false;
            e._afoBreakGraceEnd = performance.now() + 1000;
            e.shield = (e.shield || 0) + e.maxHp * 0.50;
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', e.x, e.y);
            if (typeof addExplosion === 'function') addExplosion(e.x, e.y, e.size * 3, '#00e5ff');
            if (!window._levShieldBreaks) window._levShieldBreaks = [];
            window._levShieldBreaks.push({ x: e.x, y: e.y, size: e.size, spawnAt: performance.now(), duration: 700, _seed: Math.random() * Math.PI * 2 });
        }
        if (e.type === 'marchosias' && e.arcBarrier) e.arcBarrier.hp = 0;
        if (e.type === 'egregor' && e._tentacleHps) e._tentacleHps = e._tentacleHps.map(() => 0);
    };

    window.debugAmmitTTK = function () {
        const rows = [], hp = 5635;
        const attacks = [PLAYER_BASE_ATK * _playerAtkWaveMult(5), PLAYER_BASE_ATK * _playerAtkWaveMult(10) * 1.34, PLAYER_BASE_ATK * _playerAtkWaveMult(30) * 1.36 * 1.15];
        const hits = attacks.map(atk => .16 * atk), intervals = [autoFireInterval, autoFireInterval, autoFireInterval];
        for (let tier = 0; tier < 3; tier++) {
            let health = hp, pool = Math.ceil(hp * AMMIT_TUNE_WRAP_FRAC) * 3;
            let tokens = Math.ceil(hp * AMMIT_TUNE_LOSS_FRAC), now = 0, next = 0, exposed = 0, feather = 0, lost = 0;
            while (health > 0 && now < 180000) {
                const dt = 1000 / 120; now += dt;
                tokens = Math.min(Math.ceil(hp * AMMIT_TUNE_LOSS_FRAC), tokens + hp * AMMIT_TUNE_LOSS_FRAC * dt / AMMIT_TUNE_LOSS_WINDOW);
                if (now < next) continue;
                next += intervals[tier];
                const open = now < exposed, dr = open ? AMMIT_TUNE_EXPOSED_DR : AMMIT_TUNE_DR;
                const post = Math.ceil((hits[tier] + .069 * attacks[tier]) * (1 - dr));
                let damage = Math.min(hp * AMMIT_TUNE_HIT_CAP, post - Math.min(open ? AMMIT_TUNE_EXPOSED_ARMOR : AMMIT_TUNE_ARMOR, post * .6));
                const soaked = Math.min(pool, damage); pool -= soaked; damage -= soaked;
                damage = Math.min(tokens, damage); tokens -= damage; health -= damage; lost += damage;
                if (now >= feather && lost >= hp * AMMIT_FEATHER_FRAC) { exposed = now + AMMIT_EXPOSED; feather = now + AMMIT_FEATHER_BACK; pool = 0; lost = 0; }
            }
            rows.push({ tier: tier === 0 ? 'low' : tier === 1 ? 'middle' : 'high', hit: hits[tier], intervalMs: intervals[tier], estimatedSeconds: +(now / 1000).toFixed(2) });
        }
        console.table(rows);
        const target = document.getElementById('dbgEnemyList');
        if (target) { let result = document.getElementById('ammitTrialResult'); if (!result) { result = document.createElement('div'); result.id = 'ammitTrialResult'; target.before(result); } result.textContent = 'Ammit: mô hình phòng thủ cô lập (không né, Tim, vận chiêu hay hiệu ứng build): ' + rows.map(r => r.tier + ' ' + r.estimatedSeconds + 's').join(', '); }
    };

    window.debugForceEnemySkill = function (idx, which) {
        const e = enemies[idx];
        if (!e) return;
        if (which === 'ns') e._nullSlashCooldownEnd = 0;
        if (which === 'tempest') e._tempestCooldownEnd = 0;
        if (which.startsWith('am_') && e.type === 'ammit' && e._amReal) {
            // the chosen skill is made ready and the others wait 1.5s, so it is the next one Ammit casts
            const t = _ammitNow(e);
            if (which === 'am_exposed') { _ammitExpose(e); return; }
            if (which === 'am_enrage') { e.hp = e.maxHp * 0.29; return; }
            if (which === 'am_entrance') { spawnAmmit(); return; }
            e._amSkill = 'none'; e._amSkillT = 0; e._amStomp.hits.length = 0;
            e._amJaws.phase = e._amWeigh.phase = e._amClaw.phase = e._amStomp.phase = 'idle';
            e._amJawsChained = false;
            e._amJawsCdEnd = e._amWeighCdEnd = e._amClawCdEnd = e._amStompCdEnd = Math.max(t, e._spawnTime + AMMIT_RISE) + 1500;
            if (which === 'am_jaws') e._amJawsCdEnd = 0;
            if (which === 'am_weigh') e._amWeighCdEnd = 0;
            if (which === 'am_claw') { e._amClawCdEnd = 0; e._amForceClaw = true; }
            if (which === 'am_stomp') e._amStompCdEnd = 0;
        }
        if (which === 'rage') {
            // a debug stack lasts 60s so Null Slash can be tested at each rage level, and the five stack cap still applies
            if (!e._rageEndTimes) e._rageEndTimes = [];
            if (e._rageEndTimes.length < 5) e._rageEndTimes.push(performance.now() + 60000);
            e._rageStacks = e._rageEndTimes.length;
        }
        if (which === 'sword') { e.lastSwordTriggerTime = 0; if (typeof _tryTriggerMarchosiasCounter === 'function') _tryTriggerMarchosiasCounter(e); }
        if (which === 'haki' && typeof spawnBossShockwave === 'function') spawnBossShockwave(e.x, e.y, 'dargruel', 0.0095 * _enemyHs(e));
        if (which === 'chains') e.chainTimer = 0;
        if (which === 'laser') e.shootTimer = 0;
        if (which === 'wisdom_orb' && typeof _raphaelSpawnWisdomOrb === 'function') _raphaelSpawnWisdomOrb(e);
        if (which === 'perseverance') {
            e.perseveranceCooldown = 0;
            // Clearing the cooldown alone only unblocks the natural
            // trigger conditions in updateLeviathan — kick the charge off
            // directly so the button actually starts the sequence now
            // instead of waiting on those conditions to line up.
            if (e.type === 'leviathan' && !e.perseveranceCharging) {
                e.perseveranceCharging = true;
                e.perseveranceChargeStart = performance.now();
            }
        }
        if (which === 'void' && typeof _veilshroudBeginLightning === 'function') _veilshroudBeginLightning(e);
        if (which === 'uriel_camo' && typeof _urielTriggerCamo === 'function') { e._camoCDReadyAt = 0; e._camoPhase = 'idle'; _urielTriggerCamo(e); }
        if (which === 'uriel_sword' && typeof _urielTriggerSword === 'function') _urielTriggerSword(e);
        if (which === 'goliath_transform' && e.type === 'goliath' && e.phase === 'alpha') {
            // Bỏ qua yêu cầu 3 bảo thạch thật để test nhanh Transform + True Form
            e.slots.forEach((s, i) => { if (!s.filled) { s.filled = true; s.gem = GOLIATH_GEM_COLORS[i]; } });
            e.damagePull = Math.max(e.damagePull, 50000);
            if (typeof _goliathBeginTransform === 'function') _goliathBeginTransform(e);
        }
        if (which === 'goliath_trueform' && e.type === 'goliath') {
            e.slots.forEach((s, i) => { if (!s.filled) { s.filled = true; s.gem = GOLIATH_GEM_COLORS[i]; } });
            e.damagePull = Math.max(e.damagePull, 50000);
            if (typeof _goliathEnterTrueForm === 'function') _goliathEnterTrueForm(e);
        }
        if (which === 'goliath_fracture' && e.type === 'goliath') e._fractureStepCooldownEnd = 0;
        if (which === 'goliath_echo' && e.type === 'goliath') e._echoCooldownEnd = 0;
        if (which === 'goliath_verdict' && e.type === 'goliath') { e._verdictPhase = 'ready'; e._verdictCooldownEnd = 0; }
        if (which === 'goliath_unbroken' && e.type === 'goliath' && typeof _goliathTryUnbrokenWill === 'function') {
            _goliathTryUnbrokenWill(e, e.hp + 1); // fake a lethal hit to force the proc
        }
        if (which === 'goliath_unbroken_wave' && e.type === 'goliath' && typeof _goliathReleaseUnbrokenWave === 'function') {
            e._unbrokenWillWaveFired = true; // skip the natural 3.5s wait, fire it right now
            _goliathReleaseUnbrokenWave(e, performance.now());
        }
        if (which === 'goliath_btm_test' && e.type === 'goliath') {
            // Simulate a Photokrystos BTM hit directly on this Goliath — the
            // exact bypass path that used to punch through Unbroken Will's
            // invuln — so this button click-tests that fix live.
            bossShockwaves.push({
                x: e.x, y: e.y, radius: 5, maxRadius: 100000, speed: 0,
                hitSentinels: new Set(), _hitEnemies: new Set(), active: true,
                _isBTMWave: true, _damage: 10, _percentDamage: 0.99,
            });
        }
    };

    function enemyDefenseNote(e) {
        if (e.type === 'raphael' && e.raphaelInvulnerable) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Break Custos</button>';
        if (e.type === 'leviathan' && e.afoShieldActive) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Break AFO Shield</button>';
        if (e.type === 'marchosias' && e.arcBarrier && e.arcBarrier.hp > 0) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Break Arc Barrier</button>';
        if (e.type === 'egregor' && e._tentacleHps && e._tentacleHps.some(h => h > 0)) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Clear Tentacles</button>';
        return '';
    }

    function enemySkillButtons(e) {
        const i = enemies.indexOf(e);
        if (e.type === 'egregor') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'ns')">Null Slash</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'tempest')">Tempest</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'rage')">+Rage Stack (${e._rageStacks || 0}/5)</button>`;
        if (e.type === 'ammit') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'am_jaws')">Jaws</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'am_weigh')">Weighing</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'am_claw')">Lion Claw</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'am_stomp')">Hippo Stomp</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'am_entrance')">Ammit: màn xuất hiện</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'am_enrage')">Ammit: nổi điên</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'am_exposed')">Ammit: Lộ Diện</button><button class="dbg-btn" onclick="debugAmmitTTK()">Ammit: thử TTK</button>`;
        if (e.type === 'marchosias') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'sword')">Sword</button>`;
        if (e.type === 'thaelis') return THAELIS_DEBUG_ACTIONS.map(a => `<button class="dbg-btn" onclick="debugThaelis('${a[0]}', ${i})" title="${a[2]}">${a[1]}</button>`).join('');
        if (e.type === 'dargruel') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'haki')">Maou Haki</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'chains')">Chains</button>`;
        if (e.type === 'raphael') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'laser')">Laser</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'wisdom_orb')">Wisdom Orb</button>`;
        if (e.type === 'leviathan') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'perseverance')">Perseverance</button>`;
        if (e.type === 'veilshroud') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'void')">Void Strike</button>`;
        if (e.type === 'uriel') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'uriel_camo')">Force Camouflage</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'uriel_sword')">Force Judgment</button>`;
        if (e.type === 'goliath' && e.phase === 'alpha') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_transform')">Force Transform</button>`;
        if (e.type === 'goliath' && e.phase === 'transforming') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_trueform')">Skip to True Form</button>`;
        if (e.type === 'goliath' && e.phase === 'true_form') {
            let btns = `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_fracture')">Fracture Step</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_echo')">Endless Echo</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_verdict')">Absolute Verdict</button>`;
            if (!e._unbrokenWillUsed) btns += `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_unbroken')">Unbroken Will</button>`;
            else if (!e._unbrokenWillWaveFired) btns += `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_unbroken_wave')">Fire Release Wave Now</button>`;
            btns += `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_btm_test')">Test BTM Hit</button>`;
            return btns;
        }
        return '';
    }

    const BOSS_TYPES = ['apostle', 'thaelis', 'raphael', 'marchosias', 'dargruel', 'veilshroud', 'uriel', 'leviathan', 'egregor', 'ammit', 'goliath'];

    function refreshEnemyList() {
        const el = document.getElementById('dbgEnemyList');
        if (!el || typeof enemies === 'undefined') return;
        // skip the rebuild while typing into one of these inputs - the 500ms
        // interval was nuking the field's focus/value mid-edit every tick,
        // worst on goliath's damage-pull field since that number moves
        // almost every tick so the input never got a chance to hold still
        const _af = document.activeElement;
        if (_af && _af.id && _af.id.startsWith('dbgHp_')) return;
        const rows = enemies.map((e, i) => ({ e, i })).filter(x => BOSS_TYPES.includes(x.e.type));
        if (rows.length === 0) { el.innerHTML = '<div style="opacity:0.5;">No tracked enemies on screen.</div>'; return; }
        el.innerHTML = rows.map(({ e, i }) => {
            // Goliath Alpha/Transforming: HP luôn khoá ở 1 (bất khả xâm phạm),
            // giá trị thật đáng chỉnh là Damage Pull (quyết định Max HP lúc vào
            // True Form) — đổi hẳn ô nhập + nhãn sang Damage Pull cho 2 pha này.
            const isGoliathPre = e.type === 'goliath' && e.phase !== 'true_form';
            const inputVal = isGoliathPre ? Math.round(e.damagePull || 0) : Math.round(e.hp);
            return `
      <div class="dbg-enemy-row">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <b>${e.type}${isGoliathPre ? ' (' + e.phase + ')' : ''}</b>
          <span style="opacity:0.6;">${isGoliathPre ? 'Damage Pull ' + Math.round(e.damagePull || 0) : Math.round(e.hp) + ' / ' + Math.round(e.maxHp) + ' HP'}</span>
        </div>
        <div class="dbg-row">
          <input type="number" class="dbg-enemy-hp" id="dbgHp_${i}" value="${inputVal}" placeholder="${isGoliathPre ? 'Damage Pull' : 'HP'}">
          <button class="dbg-btn" onclick="debugSetHp(${i})">Apply ${isGoliathPre ? 'Pull' : 'HP'}</button>
          <button class="dbg-btn danger" onclick="debugKillEnemy(${i})">Kill</button>
          <button class="dbg-btn" onclick="debugApplyVuln(${i})" title="Vulnerability stacks: ${e.vulnStacks || 0}/4">+Vuln (${e.vulnStacks || 0}/4)</button>
        </div>
        <div class="dbg-row" style="flex-wrap:wrap;">${enemySkillButtons(e)}${enemyDefenseNote(e)}</div>
        ${e.type === 'ammit' ? `<div id="ammitMetrics_${e._amId}" style="font:12px monospace"></div>` : ''}
      </div>`;
        }).join('');
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i]; if (e.type !== 'ammit') continue;
            const node = document.getElementById('ammitMetrics_' + e._amId); if (!node) continue;
            const bucket = Math.floor(_ammitPassiveNow(e) / AMMIT_DAMAGE_BUCKET); let sum = 0;
            for (let j = 0; j < AMMIT_DAMAGE_SLOTS; j++) if (bucket - e._amDmgT[j] < 100) sum += e._amDmgL[j];
            const dps = sum / 5;
            node.textContent = 'Ammit: số đo cân bằng. DR ' + Math.round(_ammitDR(e) * 100) + '%, giáp ' + _ammitArmor(e) + ', vải ' + e._amWraps + ' (' + Math.ceil(e._amWrapPool) + '), Lông Vũ ' + e._amFeather + ', Tim ' + e._amHearts + ', chiêu ' + e._amSkill + ', nổi điên ' + e._amEnraged + ', mất máu 5s ' + Math.round(sum) + ', DPS ' + Math.round(dps) + ', TTK ' + (dps > 0 ? (e.hp / dps).toFixed(1) + 's' : 'chưa đủ số đo') + ', Lộ Diện ' + e._amExposedCount;
        }
    }

    // Sentinels
    window.debugSetSentinelHp = function (idx) {
        const input = document.getElementById('dbgSentHp_' + idx);
        const s = sentinels[idx];
        if (!input || !s) return;
        const v = Math.max(0, Math.floor(Number(input.value) || 0));
        s.hp = v;
        if (v > s.maxHp) s.maxHp = v;
    };

    // "Cancel" a sentinel: same real destroy path a killed sentinel takes
    // (js/entities.js: explosion FX + splice), not just zeroing hp.
    window.debugKillSentinel = function (idx) {
        const s = sentinels[idx];
        if (!s) return;
        if (typeof destroySentinel === 'function') destroySentinel(s);
        sentinels.splice(idx, 1);
        refreshSentinelList();
    };

    function refreshSentinelList() {
        const el = document.getElementById('dbgSentinelList');
        if (!el || typeof sentinels === 'undefined') return;
        const _af = document.activeElement;
        if (_af && _af.id && _af.id.startsWith('dbgSentHp_')) return;
        if (sentinels.length === 0) { el.innerHTML = '<div style="opacity:0.5;">No sentinels active.</div>'; return; }
        el.innerHTML = sentinels.map((s, i) => `
      <div class="dbg-enemy-row">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <b>Sentinel${s.isFortified ? ' (fortified)' : ''}, tier ${s.synergyTier}</b>
          <span style="opacity:0.6;">${Math.round(s.hp)} / ${Math.round(s.maxHp)} HP</span>
        </div>
        <div class="dbg-row">
          <input type="number" class="dbg-enemy-hp" id="dbgSentHp_${i}" value="${Math.round(s.hp)}">
          <button class="dbg-btn" onclick="debugSetSentinelHp(${i})">Apply</button>
          <button class="dbg-btn danger" onclick="debugKillSentinel(${i})">Cancel</button>
        </div>
      </div>`).join('');
    }

    // Keep the sigil checkboxes honest if sigils change from elsewhere
    // (e.g. a real wave-5/10 pick) while the panel happens to be open.
    setInterval(() => { if (panelOpen) syncSigilCheckboxes(); }, 1000);
})();
