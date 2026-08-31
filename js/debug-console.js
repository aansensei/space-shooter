// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/debug-console.js — in-game debug/cheat console. Loaded last (after
// config.js/sigils.js/entities.js/skills.js/main.js) so every function and
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

// Autoplay: sweeps the ship left/right, spams every skill's own activate
// function on a timer, and also drives the two hold-and-release keyboard
// mechanics (Skill Shift and the charged Space shot) by replicating the
// same state transitions their real keydown/keyup handlers make (input.js) —
// each activate function/transition already gates itself on its own
// cooldown/resource/state (the same guard a real keypress hits), so driving
// them repeatedly here is exactly as safe as a player mashing keys.
// Meant for hands-off soak testing (e.g. watching [PROF]/[LONGTASK] output
// over a long run) without needing to actually play.
let _autoplayTimer = null;
let _autoplayDir = 1;
let _autoplayShiftReleaseAt = 0;   // 0 = not currently holding Shift
let _autoplayChargeReleaseAt = 0;  // 0 = not currently holding Space
function _setDebugAutoplay(on) {
    window._debugAutoplay = on;
    if (on) {
        if (_autoplayTimer) return;
        _autoplayDir = 1;
        _autoplayShiftReleaseAt = 0;
        _autoplayChargeReleaseAt = 0;
        _autoplayTimer = setInterval(() => {
            if (!window._debugAutoplay || typeof gameState === 'undefined' || gameState !== 'playing' || gamePaused) return;
            const now = performance.now();
            if (Math.random() < 0.15) _autoplayDir *= -1;
            keys.left = _autoplayDir < 0;
            keys.right = _autoplayDir > 0;
            if (typeof activateSkillA === 'function') activateSkillA();
            if (typeof activateSkillS === 'function') activateSkillS();
            if (typeof activateSkillD === 'function') activateSkillD();
            if (typeof activateSkillF === 'function') activateSkillF();
            if (typeof activateSkillG === 'function') activateSkillG();

            // Skill Shift: open the domain (same keydown gate/effects as a
            // real Shift press, including the Dream Realm mark-burst if that
            // sigil is equipped), hold ~400ms, then release toward whichever
            // side has the nearest threat so the teleport actually dodges
            // something instead of firing blind.
            if (_autoplayShiftReleaseAt === 0) {
                if (!skillShiftActive && now - lastSkillShift >= skillShiftCooldown
                    && !(typeof player !== 'undefined' && player._silenced)) {
                    skillShiftActive = true;
                    window._shiftActive = true;
                    skillShiftChargeStart = now;
                    if (window.AudioMgr) { window.AudioMgr.enterTimeDomain(); window.AudioMgr.playSfx('shift-hold'); }
                    if (typeof _hasBuff === 'function' && _hasBuff('coi_mong')) {
                        window._coiMongEndTime = now + 3000;
                        for (const _e of enemies) {
                            if (_e.type.startsWith('enemy_bullet') || _e.type === 'abyssal_chain' || _e.inCoronation) continue;
                            if (!_e._yogMark) {
                                _e._yogMark = true; _e._yogMarkStart = now; _e._yogMarkAccum = 0;
                                applyVulnerability(_e);
                            }
                        }
                    }
                    _autoplayShiftReleaseAt = now + 400;
                }
            } else if (now >= _autoplayShiftReleaseAt) {
                _autoplayShiftReleaseAt = 0;
                if (skillShiftActive) {
                    const _threat = typeof findClosestEnemy === 'function' ? findClosestEnemy(player.x, player.y) : null;
                    const dir = _threat && _threat.x > player.x ? 'left' : 'right';
                    executeShiftTeleport(dir);
                }
            }

            // Charged Space shot: hold to maxChargeTime for a max-multiplier
            // charged bullet (Cycle of Flow's insta-fire path is left to the
            // instant branch below, matching the real keydown's own check).
            if (_autoplayChargeReleaseAt === 0) {
                if (!charging && !laserActive && !skillShiftActive) {
                    if (typeof _hasBuff === 'function' && _hasBuff('dong_chay_luan_hoi')) {
                        if (now >= laserCooldownEnd && typeof _activateOverloadLaser === 'function') _activateOverloadLaser(now);
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
        }, 200);
    } else {
        keys.left = false;
        keys.right = false;
        if (skillShiftActive) cancelSkillShift();
        if (charging && !laserActive) { charging = false; if (window.AudioMgr) window.AudioMgr.stopCharging(); }
        _autoplayShiftReleaseAt = 0;
        _autoplayChargeReleaseAt = 0;
        if (_autoplayTimer) { clearInterval(_autoplayTimer); _autoplayTimer = null; }
    }
}

// Live Match Stat: opens the same overlay/tabs the Game Over screen uses
// (match-stats.js is pure UI reading window._matchStats, no gameState gate),
// then keeps re-rendering the currently open tab on an interval so numbers
// update while still playing instead of staying a frozen snapshot. Self-stops
// by watching the overlay's own display style, so it doesn't matter whether
// the player closes it via the panel's own ✕ button or anything else.
let _liveMatchStatsTimer = null;
function _debugOpenLiveMatchStats() {
    if (typeof openMatchStats !== 'function') return;
    openMatchStats();
    if (_liveMatchStatsTimer) return;
    _liveMatchStatsTimer = setInterval(() => {
        const overlay = document.getElementById('matchStatsOverlay');
        if (!overlay || overlay.style.display === 'none') {
            clearInterval(_liveMatchStatsTimer);
            _liveMatchStatsTimer = null;
            return;
        }
        _renderMatchStatsTab(window._msLastTab || 'allyDamage');
    }, 500);
}

// Directly override the two globals driving Walpurgis (Huyết Dạ, scales
// off _waveNumber — see _walpurgisStacks in config.js) and the Yuuki HUD
// bonus (_yuukiBonus, ally dmg multiplier applied in entities.js), so both
// can be tested without grinding real waves. Clamped to the same range the
// real game allows (_yuukiBonus caps at 3.00 in main.js) so debug testing
// still reflects an actually-reachable state.
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
      <button onclick="closeDebugConsole()" style="background:none; border:1px solid rgba(0,229,255,0.4); color:#00e5ff; border-radius:6px; width:26px; height:26px; cursor:pointer;">✕</button>
    </div>
    <div style="opacity:0.6; font-size:10px; margin-bottom:6px;">\` toggles this panel · P freezes/unfreezes the game.</div>
    <div id="dbgSessionStatus" style="font-size:10px; margin-bottom:10px; padding:5px 8px; border-radius:6px; background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.2);"></div>
    <div class="dbg-row" style="margin-bottom:14px;">
      <button class="dbg-btn" id="dbgPauseBtn" onclick="debugTogglePause()" style="min-width:110px; font-weight:bold;">⏸ Pause Game</button>
      <span style="opacity:0.55; font-size:10px;">or press P</span>
    </div>
    <div class="dbg-row" style="margin-bottom:14px;">
      <button class="dbg-btn" onclick="_debugOpenLiveMatchStats()">Match Stat (Live)</button>
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
      <div class="dbg-row">
        <button class="dbg-btn" onclick="debugResetPlayer()">Reset Player</button>
        <button class="dbg-btn" onclick="debugRestartRun()">Start/Restart Debug Sandbox</button>
      </div>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgAutoshotToggle" onchange="window._debugAutoshotOff = !this.checked;">
        Autoshot enabled
      </label>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgCooldownToggle" onchange="window._debugNoCooldown = !this.checked;">
        Hồi chiêu
      </label>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgInvulnToggle" onchange="window._debugPlayerInvuln = this.checked;">
        Player Invulnerable
      </label>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgAutoplayToggle" onchange="_setDebugAutoplay(this.checked);">
        Autoplay (di chuyển + spam skill)
      </label>
      <div class="dbg-row">
        <button class="dbg-btn danger" onclick="debugExitSession()">Exit Debug Mode → Main Menu</button>
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
      <div class="dbg-h">SKILLS — force ready &amp; activate now</div>
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
        <div style="opacity:0.5; font-size:10px;">Glory for Justice isn't a toggle — it auto-activates whenever &gt;4 enemies are on screen, an Abnormal+ enemy is present, Skill G is active, or Photokrystos is active. Spawn any boss type below (or 5+ enemies) to trigger it. Vulnerability is applied per-enemy — see the "+Vuln" button on each row in Active Enemies.</div>
      </div>
      <div id="dbgGreatSageSection" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12); display:none;">
        <div class="dbg-h" style="font-size:10px;">GREAT SAGE, STOLEN GEMS</div>
        <div id="dbgGreatSageGems" style="font-size:10px; opacity:0.7; margin-bottom:4px;"></div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugGreatSageFire('thaelis')">Fire: Thaelis</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('aegis_core')">Fire: Aegis Core</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('marchosias')">Fire: Marchosias</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('veilshroud')">Fire: Veilshroud</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('egregor')">Fire: Egregor</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('dargruel')">Fire: Dargruel</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('leviathan')">Fire: Leviathan</button>
          <button class="dbg-btn" onclick="debugGreatSageFire('goliath')">Fire: Goliath</button>
        </div>
        <div class="dbg-row" style="flex-wrap:wrap;">
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('thaelis')">+Gem: Thaelis</button>
          <button class="dbg-btn" onclick="debugGreatSageGiveGem('aegis_core')">+Gem: Aegis Core</button>
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
        <div style="opacity:0.5; font-size:10px;">"Fire" unleashes that stolen attack immediately without touching the gem bank. "+Gem" adds it to the bank (respects the 3-slot/no-duplicate cap) so you can test the real F-to-release flow.</div>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">SPAWN ENEMY / SENTINEL</div>
      <div style="opacity:0.55; font-size:10px; margin-bottom:4px;">Stats below apply to the next spawn (blank = that type's default). Hover a button to see that type's HP/size range.</div>
      <div class="dbg-row">
        <input type="number" id="dbgSpawnHp" placeholder="HP" class="dbg-enemy-hp" style="width:70px;">
        <input type="number" id="dbgSpawnSize" placeholder="Size" class="dbg-enemy-hp" style="width:70px;">
        <input type="number" id="dbgSpawnSpeed" placeholder="Speed" step="0.1" class="dbg-enemy-hp" style="width:60px;">
      </div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <button class="dbg-btn" onclick="debugSpawn('spawnApostle')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="22–330" data-size="20–30">Apostle</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnThaelis')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="1100–2640" data-size="100–150">Thaelis</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnAegisCore')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="2500–4500" data-size="52–66">Aegis Core</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnMarchosias')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="2112–4092" data-size="100–150">Marchosias</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnDargruel')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="6200–16000" data-size="200–300">Dargruel</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnVeilshroud')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="1320–3300" data-size="100–150">Veilshroud</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnLeviathan')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="8820–15435" data-size="250–300">Leviathan</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnEgregor')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="2200–4750" data-size="160">Egregor</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnGoliath')" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="1 (Alpha, invuln)" data-size="380/460">Goliath (WIP)</button>
        <button class="dbg-btn" onclick="debugSpawnSentinel()" onmouseover="_dbgHint(this)" onmouseout="_dbgHint()" data-hp="100–800" data-size="18–28">Sentinel</button>
      </div>
      <div id="dbgSpawnHint" style="font-size:10px; min-height:14px; color:#7fd8ff; margin-bottom:2px;"></div>
      <div class="dbg-row" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12);">
        <select id="dbgClickSpawnType" class="dbg-enemy-hp" style="width:160px;" onchange="window._debugClickSpawnType = this.value;">
          <option value="">Click-to-spawn: off</option>
          <option value="spawnApostle">Apostle</option>
          <option value="spawnThaelis">Thaelis</option>
          <option value="spawnAegisCore">Aegis Core</option>
          <option value="spawnMarchosias">Marchosias</option>
          <option value="spawnDargruel">Dargruel</option>
          <option value="spawnVeilshroud">Veilshroud</option>
          <option value="spawnLeviathan">Leviathan</option>
          <option value="spawnEgregor">Egregor</option>
          <option value="spawnGoliath">Goliath (WIP)</option>
          <option value="spawnSentinel">Sentinel</option>
        </select>
      </div>
      <div style="opacity:0.55; font-size:10px;">When a type is picked above, click anywhere on the game screen to spawn it there (uses the HP/Size/Speed overrides too). Pick "off" to stop. Works with the panel open or closed.</div>
      <div class="dbg-row" style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,229,255,0.12);">
        <input type="number" id="dbgWaveNum" class="dbg-enemy-hp" style="width:70px;" min="1" value="5" placeholder="Wave #">
        <button class="dbg-btn" onclick="debugSpawnWaveComposition()">Spawn Wave's Full Roster</button>
      </div>
      <div style="opacity:0.55; font-size:10px;">Spawns the EXACT enemy composition that wave number would normally spawn (same counts/tiers as the real wave system, all at once instead of trickled over 15s) — Apostles, Abnormals, Elites, Dominators, and Goliath if the wave is a multiple of 5. Ignores current on-screen caps the same way the real spawner does (falls back to an Apostle if a tier's pool is full).</div>
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
      <div style="opacity:0.55; font-size:10px; margin-bottom:4px;">Stationary hex-drone. Takes real damage from all skills and abilities. Auto-respawns when killed.</div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <input type="number" id="dbgDummyHp" class="dbg-enemy-hp" style="width:80px;" value="5000000" placeholder="HP">
        <input type="number" id="dbgDummySize" class="dbg-enemy-hp" style="width:70px;" value="40" placeholder="Size">
        <input type="number" id="dbgDummyDR" class="dbg-enemy-hp" style="width:60px;" value="0" min="0" max="99" placeholder="DR %">
        <button class="dbg-btn" onclick="debugSpawnDummy()">Spawn</button>
        <button class="dbg-btn danger" onclick="debugRemoveDummy()">Remove</button>
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
        <span style="font-size:10px; opacity:0.5;">% (0=none | 40=Egregor/Veil | 45=Marchosias | 50-60=Dargruel | 55=Aegis | 60=Leviathan | 90=Embryo | Thaelis 0→95%)</span>
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
</style>`;

    let panelOpen = false;
    let refreshTimer = null;

    function ensurePanel() {
        if (document.getElementById('debugConsoleOverlay')) return;
        document.body.insertAdjacentHTML('beforeend', PANEL_HTML);
        buildSigilList();
    }

    function updateSessionStatus() {
        const el = document.getElementById('dbgSessionStatus');
        if (el) {
            const playing = typeof gameState !== 'undefined' && gameState === 'playing';
            if (!playing) {
                el.textContent = 'Not in a match — click "Initiate Hyperjump" for a normal run, or "Start Debug Sandbox" below for an empty hands-off one.';
                el.style.color = '#ffcc66';
            } else if (window._debugSessionActive) {
                el.textContent = (gamePaused ? '⏸ PAUSED — ' : '▶ Running — ') + 'debug sandbox (auto-spawn off, sigil picker skipped).';
                el.style.color = gamePaused ? '#ffcc66' : '#7fffb0';
            } else {
                el.textContent = (gamePaused ? '⏸ PAUSED — ' : '▶ Running — ') + 'normal match.';
                el.style.color = gamePaused ? '#ffcc66' : '#7fffb0';
            }
        }
        const pauseBtn = document.getElementById('dbgPauseBtn');
        if (pauseBtn) {
            pauseBtn.textContent = gamePaused ? '▶ Resume Game' : '⏸ Pause Game';
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
    window.debugStartSession = function () {
        window._debugSessionActive = true;
        window._debugAutoshotOff = true;
        // Chỉ skip sigil picker khi CHỦ ĐỘNG bấm nút bắt đầu sandbox này —
        // không set ở nơi mở panel nữa, để 1 lượt Initiate Hyperjump bình
        // thường (mở panel trước, rồi bấm nút thật ngoài menu) vẫn đi qua
        // đúng luồng chọn sigil như 1 trận chơi thật.
        window._debugSkipSigilPick = true;
        if (typeof startGame === 'function') startGame();
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
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            const _t0 = performance.now();
            refreshEnemyList(); refreshSentinelList(); refreshDummyStatus(); updateSessionStatus();
            _refreshGreatSageGemDisplay();
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

    // Reuses the real "Main Menu" button's own click handler (js/input.js,
    // `_goToMenu`: gameState = "start" + window._returnToMainMenu()) instead
    // of re-deriving that reset logic here — the button is just hidden via
    // CSS, .click() still fires its listener. Debug-only flags are reset
    // separately since that button knows nothing about them.
    window.debugExitSession = function () {
        window._debugSessionActive = false;
        window._debugAutoshotOff = false;
        window._debugNoCooldown = false;
        window._debugGameSpeed = 1;
        window._debugClickSpawnType = '';
        _setDebugAutoplay(false);
        const autoplayCb = document.getElementById('dbgAutoplayToggle');
        if (autoplayCb) autoplayCb.checked = false;
        const sel = document.getElementById('dbgClickSpawnType');
        if (sel) sel.value = '';
        if (typeof gamePaused !== 'undefined') gamePaused = false;
        const btn = document.getElementById('mainMenuBtn');
        if (btn) btn.click();
        window.closeDebugConsole();
    };

    // Dùng chung cho cả phím ` lẫn nút bấm chuột dự phòng (một số bộ gõ
    // tiếng Việt/layout bàn phím có thể nuốt mất phím ` trước khi tới trang).
    // CHỈ mở/đóng panel — không tự start game gì cả. Panel mở được ngay từ
    // màn hình START (chưa Initiate Hyperjump), lẫn cả trong 1 trận thật đã
    // đang chạy; bấm "Initiate Hyperjump" ngoài menu như thường để vào game
    // thật (đủ sigil picker), hoặc dùng nút sandbox trong panel nếu muốn 1
    // trận rỗng, hands-off riêng.
    window._debugToggleConsole = function () {
        if (panelOpen) window.closeDebugConsole(); else window.openDebugConsole();
    };

    document.addEventListener('keydown', (e) => {
        // e.code === 'Backquote' là VỊ TRÍ vật lý cố định (đúng ô cạnh phím
        // "1" trên bàn phím US) — nếu bàn phím thật không có phím đúng chỗ
        // đó (layout khác chuẩn US), code sẽ khác dù gõ ra đúng ký tự `.
        // Thêm e.key === '`' làm dự phòng theo ký tự thực tế đã gõ ra.
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

    // ── Click-to-spawn ──────────────────────────────────────────────
    // Independent of the panel being open/closed so a type can be armed
    // once and then spawned repeatedly across the full screen. Ignores
    // clicks that land on the panel itself so its own buttons still work.
    document.addEventListener('click', (e) => {
        const fnName = window._debugClickSpawnType;
        if (!fnName || typeof gameState === 'undefined' || gameState !== 'playing') return;
        if (e.target.closest && e.target.closest('#debug-console-panel')) return;
        const gc = document.getElementById('gameCanvas');
        if (!gc) return;
        const rect = gc.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = (e.clientX - rect.left) * (gc.width / rect.width);
        const y = (e.clientY - rect.top) * (gc.height / rect.height);
        window.debugSpawn(fnName, x, y);
    });

    // ── Player ──────────────────────────────────────────────────────
    window.debugResetPlayer = function () {
        if (typeof player === 'undefined') return;
        player.x = canvas.width / 2;
        player._silenced = false;
        player._rooted = false;
        player._nullSlashSlowed = false;
        if (typeof lives !== 'undefined') lives = 12;
    };

    window.debugRestartRun = function () {
        window.debugStartSession();
    };

    // ── Skills ──────────────────────────────────────────────────────
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
            case 'Shift':
                // Real activation is inlined in js/input.js's keydown handler
                // (there's no standalone activateSkillShift()) — replicated
                // verbatim here rather than re-derived.
                if (!skillShiftActive) {
                    skillShiftActive = true;
                    window._shiftActive = true;
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

    // ── Sigils / passives ───────────────────────────────────────────
    function buildSigilList() {
        const el = document.getElementById('dbgSigilList');
        if (!el || typeof SIGIL_ORDER === 'undefined') return;
        const allSigilIds = [...SIGIL_ORDER, ...(typeof SIGIL_EXTRA !== 'undefined' ? SIGIL_EXTRA : [])];
        el.innerHTML = allSigilIds.map(id => {
            const def = SIGIL_DEFS[id];
            return `<label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgSigil_${id}" onchange="debugToggleSigil('${id}', this.checked)">
        <span style="color:${def.color}">${def.name}</span>
        <span style="opacity:0.55; font-size:10px;">— ${def.buffs.map(b => b.name).join(' / ')}</span>
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
    };

    // ── Spawn enemy / sentinel ──────────────────────────────────────
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
        refreshEnemyList();
    };

    window.debugSpawnSentinel = function () { window.debugSpawn('spawnSentinel'); };

    // Tái dùng đúng logic wave thật (js/main.js: _getWaveTemplate +
    // _spawnWaveTier) thay vì tự suy ra số lượng riêng — spawn NGAY LẬP TỨC
    // toàn bộ thành phần của 1 wave bất kỳ (kể cả Goliath nếu chia hết 5),
    // thay vì rải đều trong 15s như wave thật.
    window.debugSpawnWaveComposition = function () {
        if (typeof _getWaveTemplate !== 'function' || typeof _spawnWaveTier !== 'function' || typeof spawnApostle !== 'function') return;
        const input = document.getElementById('dbgWaveNum');
        const waveNum = Math.max(1, Math.floor(Number(input && input.value) || 1));
        const tmpl = _getWaveTemplate(waveNum);
        for (let i = 0; i < tmpl.normals; i++) spawnApostle();
        for (let i = 0; i < tmpl.abnormals; i++) _spawnWaveTier('abnormal');
        for (let i = 0; i < tmpl.elites; i++) _spawnWaveTier('elite');
        for (let i = 0; i < tmpl.dominators; i++) _spawnWaveTier('dominator');
        if (waveNum % 5 === 0) _spawnWaveTier('goliath');
        refreshEnemyList();
    };

    window._dbgHint = function (btn) {
        const el = document.getElementById('dbgSpawnHint');
        if (!el) return;
        if (!btn) { el.textContent = ''; return; }
        const hp = btn.dataset.hp, size = btn.dataset.size;
        el.textContent = btn.textContent.trim() + ': HP ' + hp + ', size ' + size;
    };

    // ── Combat Dummy ─────────────────────────────────────────────────
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
        el.textContent = `Active — ${Math.max(0, Math.round(d.hp))}/${Math.round(d.maxHp)} HP · DR ${_drPct}% · ${d._state}${d._ironActive ? ' · iron' : ''}${d._isImmune ? ' · immune' : ''}`;
        const ironCb = document.getElementById('dbgDummyIron');
        if (ironCb) ironCb.checked = !!d._ironActive;
        const immuneCb = document.getElementById('dbgDummyImmune');
        if (immuneCb) immuneCb.checked = !!d._isImmune;
        const drLive = document.getElementById('dbgDummyDRLive');
        if (drLive && document.activeElement !== drLive) drLive.value = _drPct || '';
    }

    // ── Core passives (not sigils) ──────────────────────────────────
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
    window.debugGreatSageGiveGem = function (type) {
        if (typeof _greatSageGems === 'undefined') return;
        if (_greatSageGems.length < 3 && !_greatSageGems.includes(type)) _greatSageGems.push(type);
        _refreshGreatSageGemDisplay();
    };
    window.debugGreatSageFillCombo = function () {
        if (typeof _greatSageGems === 'undefined') return;
        _greatSageGems = ['thaelis', 'aegis_core', 'goliath'];
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

    window.debugApplyVuln = function (idx) {
        const e = enemies[idx];
        if (!e || typeof applyVulnerability !== 'function') return;
        applyVulnerability(e);
        refreshEnemyList();
    };

    // ── Active enemy list ───────────────────────────────────────────
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
        if (typeof dealDamage !== 'function') return;
        dealDamage(e, { damage: (e.hp || 0) + (e.shield || 0) + 999999, isTrueDamage: true });
    };

    window.debugClearDefense = function (idx) {
        const e = enemies[idx];
        if (!e) return;
        if (e.type === 'aegis_core') e.aegisInvulnerable = false;
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

    window.debugForceEnemySkill = function (idx, which) {
        const e = enemies[idx];
        if (!e) return;
        if (which === 'ns') e._nullSlashCooldownEnd = 0;
        if (which === 'tempest') e._tempestCooldownEnd = 0;
        if (which === 'sword') { e.lastSwordTriggerTime = 0; if (typeof _tryTriggerMarchosiasCounter === 'function') _tryTriggerMarchosiasCounter(e); }
        if (which === 'haki' && typeof spawnBossShockwave === 'function') spawnBossShockwave(e.x, e.y);
        if (which === 'chains') e.chainTimer = 0;
        if (which === 'laser') e.shootTimer = 0;
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
        if (e.type === 'aegis_core' && e.aegisInvulnerable) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Break Custos</button>';
        if (e.type === 'leviathan' && e.afoShieldActive) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Break AFO Shield</button>';
        if (e.type === 'marchosias' && e.arcBarrier && e.arcBarrier.hp > 0) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Break Arc Barrier</button>';
        if (e.type === 'egregor' && e._tentacleHps && e._tentacleHps.some(h => h > 0)) return '<button class="dbg-btn" onclick="debugClearDefense(' + enemies.indexOf(e) + ')">Clear Tentacles</button>';
        return '';
    }

    function enemySkillButtons(e) {
        const i = enemies.indexOf(e);
        if (e.type === 'egregor') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'ns')">Null Slash</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'tempest')">Tempest</button>`;
        if (e.type === 'marchosias') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'sword')">Sword</button>`;
        if (e.type === 'dargruel') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'haki')">Maou Haki</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'chains')">Chains</button>`;
        if (e.type === 'aegis_core') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'laser')">Laser</button>`;
        if (e.type === 'leviathan') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'perseverance')">Perseverance</button>`;
        if (e.type === 'veilshroud') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'void')">Void Strike</button>`;
        if (e.type === 'goliath' && e.phase === 'alpha') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_transform')">Force Transform</button>`;
        if (e.type === 'goliath' && e.phase === 'transforming') return `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_trueform')">Skip to True Form</button>`;
        if (e.type === 'goliath' && e.phase === 'true_form') {
            let btns = `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_fracture')">Fracture Step</button><button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_verdict')">Absolute Verdict</button>`;
            if (!e._unbrokenWillUsed) btns += `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_unbroken')">Unbroken Will</button>`;
            else if (!e._unbrokenWillWaveFired) btns += `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_unbroken_wave')">Fire Release Wave Now</button>`;
            btns += `<button class="dbg-btn" onclick="debugForceEnemySkill(${i},'goliath_btm_test')">Test BTM Hit</button>`;
            return btns;
        }
        return '';
    }

    const BOSS_TYPES = ['apostle', 'thaelis', 'aegis_core', 'marchosias', 'dargruel', 'veilshroud', 'leviathan', 'egregor', 'goliath'];

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
      </div>`;
        }).join('');
    }

    // ── Sentinels ────────────────────────────────────────────────────
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
          <b>Sentinel${s.isFortified ? ' (fortified)' : ''} — tier ${s.synergyTier}</b>
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
