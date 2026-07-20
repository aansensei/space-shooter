// js/debug-console.js — in-game debug/cheat console. Loaded last (after
// config.js/sigils.js/entities.js/skills.js/main.js) so every function and
// global below is a real, already-safe-to-call piece of the actual game —
// this file adds a panel UI around them, it does not reimplement any game
// logic itself. The only edit made to an existing file for this feature is
// the `!window._debugAutoshotOff` guard added at the real fireAutoShot()
// call site in main.js.
//
// Toggle: press ` (Backquote) — the first press starts a dedicated debug
// match (skips the start-of-run sigil picker, disables the wave auto-spawner
// so only enemies you spawn from the panel ever appear) and opens the panel;
// later presses just open/close the panel without resetting anything. Press
// P any time to freeze/unfreeze the game (a plain gamePaused toggle, no pause
// menu) so you can adjust values without enemies/timers moving under you.

window._debugAutoshotOff = false;
window._debugGameSpeed = 1;
window._debugClickSpawnType = '';

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
        <button class="dbg-btn" onclick="debugRestartRun()">Restart Debug Match</button>
      </div>
      <label class="dbg-row" style="cursor:pointer;">
        <input type="checkbox" id="dbgAutoshotToggle" onchange="window._debugAutoshotOff = !this.checked;">
        Autoshot enabled
      </label>
      <div class="dbg-row">
        <button class="dbg-btn danger" onclick="debugExitSession()">Exit Debug Mode → Main Menu</button>
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
        </div>
        <div style="opacity:0.5; font-size:10px;">Glory for Justice isn't a toggle — it auto-activates whenever &gt;4 enemies are on screen, an Abnormal+ enemy is present, Skill G is active, or Photokrystos is active. Spawn any boss type below (or 5+ enemies) to trigger it. Vulnerability is applied per-enemy — see the "+Vuln" button on each row in Active Enemies.</div>
      </div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">SPAWN ENEMY / SENTINEL</div>
      <div style="opacity:0.55; font-size:10px; margin-bottom:4px;">Stats below apply to the next spawn (blank = that type's default). Type-specific stats (barriers, tentacles, etc.) stay editable per-enemy in Active Enemies below.</div>
      <div class="dbg-row">
        <input type="number" id="dbgSpawnHp" placeholder="HP" class="dbg-enemy-hp" style="width:60px;">
        <input type="number" id="dbgSpawnSize" placeholder="Size" class="dbg-enemy-hp" style="width:60px;">
        <input type="number" id="dbgSpawnSpeed" placeholder="Speed" step="0.1" class="dbg-enemy-hp" style="width:60px;">
      </div>
      <div class="dbg-row" style="flex-wrap:wrap;">
        <button class="dbg-btn" onclick="debugSpawn('spawnApostle')">Apostle</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnThaelis')">Thaelis</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnAegisCore')">Aegis Core</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnMarchosias')">Marchosias</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnDargruel')">Dargruel</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnVeilshroud')">Veilshroud</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnLeviathan')">Leviathan</button>
        <button class="dbg-btn" onclick="debugSpawn('spawnEgregor')">Egregor</button>
        <button class="dbg-btn" onclick="debugSpawnSentinel()">Sentinel</button>
      </div>
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
          <option value="spawnSentinel">Sentinel</option>
        </select>
      </div>
      <div style="opacity:0.55; font-size:10px;">When a type is picked above, click anywhere on the game screen to spawn it there (uses the HP/Size/Speed overrides too). Pick "off" to stop. Works with the panel open or closed.</div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">ACTIVE ENEMIES</div>
      <div id="dbgEnemyList" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>

    <div class="dbg-section">
      <div class="dbg-h">ACTIVE SENTINELS</div>
      <div id="dbgSentinelList" style="display:flex; flex-direction:column; gap:8px;"></div>
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
            if (!window._debugSessionActive) {
                el.textContent = 'No debug match running — press ` again or click below to start one.';
                el.style.color = '#ffcc66';
            } else {
                el.textContent = (gamePaused ? '⏸ PAUSED — ' : '▶ Running — ') + 'auto-spawn off, sigil picker skipped.';
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
        if (typeof startGame === 'function') startGame();
        window._sigilPicker = null;
        const ov = document.getElementById('sigil-pick-overlay');
        if (ov) ov.style.display = 'none';
        if (typeof _wavePhase !== 'undefined') _wavePhase = 'rest';
        updateSessionStatus();
    };

    window.openDebugConsole = function () {
        ensurePanel();
        document.getElementById('debugConsoleOverlay').style.display = 'flex';
        const cb = document.getElementById('dbgAutoshotToggle');
        if (cb) cb.checked = !window._debugAutoshotOff;
        panelOpen = true;
        refreshEnemyList();
        refreshSentinelList();
        updateSessionStatus();
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => { refreshEnemyList(); refreshSentinelList(); updateSessionStatus(); }, 500);
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
        window._debugGameSpeed = 1;
        window._debugClickSpawnType = '';
        const sel = document.getElementById('dbgClickSpawnType');
        if (sel) sel.value = '';
        if (typeof gamePaused !== 'undefined') gamePaused = false;
        const btn = document.getElementById('mainMenuBtn');
        if (btn) btn.click();
        window.closeDebugConsole();
    };

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Backquote') {
            e.preventDefault();
            if (!window._debugSessionActive) window.debugStartSession();
            if (panelOpen) window.closeDebugConsole(); else window.openDebugConsole();
            return;
        }
        if (e.code === 'KeyP' && window._debugSessionActive && typeof gameState !== 'undefined' && gameState === 'playing') {
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
        if (!fnName || !window._debugSessionActive) return;
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
            case 'D':
                lastSkillD = -Infinity;
                skillDCharging = false; blackHole = null;
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
        el.innerHTML = SIGIL_ORDER.map(id => {
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
        SIGIL_ORDER.forEach(id => {
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

    // ── Core passives (not sigils) ──────────────────────────────────
    window.debugForceAccurateParry = function () {
        if (typeof accurateParryActive === 'undefined') return;
        accurateParryActive = true;
        accurateParryEndTime = performance.now() + 4000;
    };

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
        e.hp = v;
        if (v > e.maxHp) e.maxHp = v;
    }
    window.debugSetHp = debugSetHp;

    window.debugKillEnemy = function (idx) {
        const e = enemies[idx];
        if (!e || typeof dealDamage !== 'function') return;
        dealDamage(e, { damage: (e.hp || 0) + (e.shield || 0) + 999999, isTrueDamage: true });
    };

    window.debugClearDefense = function (idx) {
        const e = enemies[idx];
        if (!e) return;
        if (e.type === 'aegis_core') e.aegisInvulnerable = false;
        if (e.type === 'leviathan') e.afoShieldActive = false;
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
        if (which === 'perseverance') e.perseveranceCooldown = 0;
        if (which === 'void' && typeof _veilshroudBeginLightning === 'function') _veilshroudBeginLightning(e);
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
        return '';
    }

    const BOSS_TYPES = ['apostle', 'thaelis', 'aegis_core', 'marchosias', 'dargruel', 'veilshroud', 'leviathan', 'egregor'];

    function refreshEnemyList() {
        const el = document.getElementById('dbgEnemyList');
        if (!el || typeof enemies === 'undefined') return;
        const rows = enemies.map((e, i) => ({ e, i })).filter(x => BOSS_TYPES.includes(x.e.type));
        if (rows.length === 0) { el.innerHTML = '<div style="opacity:0.5;">No tracked enemies on screen.</div>'; return; }
        el.innerHTML = rows.map(({ e, i }) => `
      <div class="dbg-enemy-row">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <b>${e.type}</b>
          <span style="opacity:0.6;">${Math.round(e.hp)} / ${Math.round(e.maxHp)} HP</span>
        </div>
        <div class="dbg-row">
          <input type="number" class="dbg-enemy-hp" id="dbgHp_${i}" value="${Math.round(e.hp)}">
          <button class="dbg-btn" onclick="debugSetHp(${i})">Apply</button>
          <button class="dbg-btn danger" onclick="debugKillEnemy(${i})">Kill</button>
          <button class="dbg-btn" onclick="debugApplyVuln(${i})" title="Vulnerability stacks: ${e.vulnStacks || 0}/4">+Vuln (${e.vulnStacks || 0}/4)</button>
        </div>
        <div class="dbg-row" style="flex-wrap:wrap;">${enemySkillButtons(e)}${enemyDefenseNote(e)}</div>
      </div>`).join('');
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
