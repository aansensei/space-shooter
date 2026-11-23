// Pisces: Space Journey. Showdown Voyage coordinator module.
// Manages the state machine, 18 attacks, weapon auto fire, Yog-Sothoth Shift, and match transitions.

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
    } else {
        root.DuelCore = factory(root);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';
    function smoothRelease(p) { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); }

    const Bullets = (typeof DuelBullets !== 'undefined') ? DuelBullets : ((root && root.DuelBullets) ? root.DuelBullets : (typeof require !== 'undefined' ? require('./duel-bullets.js') : null));
    const Attacks = (typeof DuelAttacks !== 'undefined') ? DuelAttacks : ((root && root.DuelAttacks) ? root.DuelAttacks : (typeof require !== 'undefined' ? require('./duel-attacks.js') : null));
    const UI = (typeof DuelUI !== 'undefined') ? DuelUI : ((root && root.DuelUI) ? root.DuelUI : (typeof require !== 'undefined' ? require('./duel-ui.js') : null));
    const Theme = (typeof DuelTheme !== 'undefined') ? DuelTheme : ((root && root.DuelTheme) ? root.DuelTheme : (typeof require !== 'undefined' ? require('./duel-theme.js') : null));
    const T = Theme ? Theme.DUEL_THEME : null;

    const TOTAL_ATTACKS = 18;
    const ATTACK_SEQUENCE = Array.from({ length: TOTAL_ATTACKS }, (_, i) => i + 1);
    const DUEL_LIVES = 8;
    const TOTAL_LIVES = DUEL_LIVES;
    // Cooldown after the Yog-Sothoth domain scales with how long it was held: a quick tap recovers fast, a full hold takes longest
    const SHIFT_COOLDOWN_MIN_SEC = 1.1;
    const SHIFT_COOLDOWN_SEC = 4.4;
    const SHIFT_MAX_DURATION_SEC = 2.0;
    const SHIFT_SLOW_MULT = 0.35;
    // Enemy bullets fly 10 percent faster than their authored speed
    const BOSS_BULLET_SPEED_MULT = 1.1;
    const GRAZE_COOLDOWN_REDUCTION_SEC = 0.15;
    const GRAZE_MAX_RATE_PER_SEC = 8;
    const RECOVERY_DURATION_SEC = 2.0;

    class DuelSession {
        constructor() {
            this.active = false;
            this.state = 'idle'; // 'idle', 'opponent_select', 'weapon_select', 'pre_battle', 'playing', 'spell_transition', 'phase_transition', 'result'
            this.pool = new Bullets.BulletPool(280);
            this.attacks = new Attacks.AttackController(this.pool);
            this.opponentUI = new UI.OpponentSelectUI();
            this.weaponPicker = new UI.WeaponPickerUI();

            this.selectedWeapon = this.weaponPicker.weapons[0];
            this.difficulty = 'standard';
            this._fxDamage = [];
            this._fxDamageClock = 0;
            this.chosenAttackIndex = 0;
            this.practiceMode = false;
            this.lives = TOTAL_LIVES;

            // Shift state
            this.shiftActive = false;
            this.shiftElapsed = 0;
            this.shiftCooldownRemaining = 0;
            this.grazeAccumulator = 0;
            this.grazeLastCheckTime = 0;

            // Recovery state
            this.recoveryRemaining = 0;

            // Boss hit flash state
            this._egBodyHitAt = -1000;

            // Player combat with pre-allocated pool (capacity 256)
            this.playerBulletPool = new Array(256);
            for (let i = 0; i < this.playerBulletPool.length; i++) {
                this.playerBulletPool[i] = {
                    active: false,
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    damage: 0,
                    weaponId: '',
                    radius: 4.0,
                    isHeavy: false
                };
            }
            this.skillACooldown = 0;
            this.playerSkills = [];
            this.lastAutoFireTime = 0;
            this.lanceVolleyCounter = 0;
            this.playerHitboxVisible = false;

            // Transitions
            this.preBattleElapsed = 0;
            this.preBattleDuration = 7.5;
            this.bossPhaseMorph = 0;
            if (UI && typeof UI.preloadWeaponAssets === 'function') UI.preloadWeaponAssets();
            if (typeof window !== 'undefined' && typeof window.bakeDuelBossAssets === 'function') window.bakeDuelBossAssets();
            this._openingAudioStep = 0;
            this.transitionElapsed = 0;
            this.transitionDuration = 1.5;
            this.transitionInfo = {};

            // Statistics
            this.stats = {
                timeSec: 0,
                damageDealt: 0,
                grazeCount: 0,
                shiftCount: 0,
                shiftsUsed: 0,
                clearedAttacks: [],
                livesRemaining: TOTAL_LIVES,
                livesLost: 0,
                hitsTaken: 0,
                shieldBreaks: 0,
                skillAUses: 0,
                skillADamage: 0,
                skillFUses: 0,
                skillFBulletsCleared: 0,
                hitsByAttack: {},
                hitsByCause: {
                    bullet: 0,
                    laser: 0,
                    tempest: 0,
                    null_slash: 0,
                    rift: 0
                },
                timeline: [],
                damageByAttack: {},
                dmgBuckets: [],
                lastCause: null
            };

            this.hitStopRemaining = 0;
            this._rechargeShieldOnRecovery = false;

            // Player Shield state (Final Defense in Duel)
            this.playerShieldActive = true;
            this.playerShieldCooldown = 0;
            this.playerShieldMaxCooldown = 25.0;
            this.shieldBreaksCount = 0;

            // Skill F state (Annihilation Sweep in Duel)
            this.skillACooldown = 0;
            root.DuelWeaponSkills?.reset(this);
            this.skillFCooldown = 0;
            this.skillFMaxCooldown = 7.0;
            this.skillFCharging = false;
            this.skillFChargeElapsed = 0;
            this.skillFChargeDuration = 1.5;
            this.skillFSweepActive = false;
            this.skillFSweepElapsed = 0;
            this.skillFSweepDuration = 1.0;
            this.skillFDirection = 1;
            this.enemySlowTimer = 0;
            this.enemyTimeScale = 1.0;

            // Bullet cancel motes pool (maximum 120 motes)
            this.cancelMotes = [];

            // Visual Effects state
            this._runeRing = (Theme && typeof Theme.bakeBossRuneRing === 'function') ? Theme.bakeBossRuneRing(80) : null;
            this.transitionDarken = 0;
            this.transitionShockwave = 0;
            this.bossFlashTime = 0;
            this.hpBarHitFlash = 0;
            this.hpBarHeavyShake = 0;
            this.bossPhaseMorph = 0;
            this._phaseAudioStep = 0;
            this._lockedSweepDirection = 1;
            this._shieldBreakAnim = 0;
            this._shieldRestoreAnim = 0;
            this._engineTrail = [];
            this._lastBossPos = null;
            this._lockedBossPos = null;
            this.bossPos = { x: 640, y: 130 };
            this.bossVel = { x: 0, y: 0 };
            this.bossMotion = { style: "hold", speed: 0, leanX: 0 };
            this.bossMotionState = null;
            this.bossHabit = (typeof window !== "undefined" && window.DuelBossBrain && typeof window.DuelBossBrain.createHabit === "function")
                ? window.DuelBossBrain.createHabit() : null;
            this.bossGestureState = (typeof window !== "undefined" && window.DuelGestures && typeof window.DuelGestures.createState === "function")
                ? window.DuelGestures.createState() : null;
            this._invulnRipples = [];
            this._bossBlendFrom = null;
            this._bossBlendElapsed = 0;
            this._evolutionShards = [];
            this.hitVignetteRemaining = 0;
            this.climaxChargeWave = 0;
            this._wasClimax = false;
            this._prevBossX = 0;
            this.victoryBurstTime = 0;
            this.defeatBurstTime = 0;

            // Persistent boss entity to preserve eye blinks, rage stacks, and avoid distortion
            this.bossEntity = {
                type: 'egregor',
                x: 640,
                y: 140,
                size: 118,
                maxHp: 1000,
                hp: 1000,
                _rageStacks: 0,
                _phase: 1,
                _visualRage: 0,
                _ragePulseAt: -1000,
                _egSpawnAt: performance.now(),
                _egBodyHitAt: -1000,
                _eyeAngles: [0, 0, 0, 0],
                _eyeBlinkTimers: new Float32Array(4),
                _eyeNextBlinks: new Float32Array([2000, 2800, 1500, 3500]),
                _noHpBar: true
            };

            // Spell Card announcement (Touhou style)
            this.spellCardAnnounce = {
                name: 'Tendril Probe',
                key: 'duel.attack.1',
                elapsed: 0,
                duration: 2.5
            };

            // Ghost afterimages for shift teleport (capacity 3)
            this.ghostTrail = [];

            // Boss hit spark pool (capacity 24)
            this.bossHitSparks = new Array(24);
            for (let i = 0; i < 24; i++) {
                this.bossHitSparks[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0.25 };
            }

            this.result = null; // 'victory' or 'defeat'
            this.quit = false; // true when the player left a fight through the pause menu
            this.resultButtons = null;
            this._listenersActive = false;

            this._onKeyDown = this.onKeyDown.bind(this);
            this._onKeyUp = this.onKeyUp.bind(this);
            this._onPointerDown = this.onPointerDown.bind(this);
            this._onPointerMove = this.onPointerMove.bind(this);
            this._onPointerUp = this.onPointerUp.bind(this);
        }

        get playerBullets() {
            return this.playerBulletPool.filter(b => b.active);
        }

        resetPlayerBullets() {
            for (let i = 0; i < this.playerBulletPool.length; i++) {
                this.playerBulletPool[i].active = false;
            }
        }

        spawnPlayerBullet(x, y, vx, vy, damage, weaponId, radius = 4.0, isHeavy = false) {
            for (let i = 0; i < this.playerBulletPool.length; i++) {
                const b = this.playerBulletPool[i];
                if (!b.active) {
                    b.active = true;
                    b.x = x;
                    b.y = y;
                    b.vx = vx;
                    b.vy = vy;
                    b.damage = damage;
                    b.weaponId = weaponId;
                    b.radius = radius;
                    b.isHeavy = isHeavy;
                    b.skillASource = null;
                    b.skillAImpact = false;
                    return b;
                }
            }
            return null;
        }

        prepare() {
            if (typeof window !== 'undefined' && typeof window.showdownLockedOnThisDevice === 'function' && window.showdownLockedOnThisDevice()) {
                this.abort();
                if (typeof window.selectGameMode === 'function') {
                    window.selectGameMode('endless');
                }
                return;
            }
            this.active = true;
            this.state = 'idle';
            UI.initI18n();
            if (typeof document !== 'undefined' && document.body) {
                document.body.classList.add('duel-mode');
            }
        }

        abort() {
            root.DuelWeaponSkills?.reset(this);
            if (window.AudioMgr) window.AudioMgr.setDuelAudioActive(false);
            if (window.AudioMgr) { window._lowHpActive = false; try { window.AudioMgr.stopLowHp(); } catch (_) {} }
            this.active = false;
            this.state = 'idle';
            this._cancelOpeningVoice();
            this._cancelVictoryCues();
            if (window.AudioMgr) window.AudioMgr.exitDuelEvolutionDuck();
            this.pool.reset();
            this.resetPlayerBullets();
            root.DuelWeaponSkills?.reset(this);
            this.removeInputListeners();
            if (this.shiftActive && typeof window !== 'undefined' && window.AudioMgr) {
                window.AudioMgr.exitTimeDomain();
            }
            this.shiftActive = false;
            if (typeof skillShiftChargeStart !== 'undefined') {
                skillShiftChargeStart = 0;
            }
            if (typeof skillFState !== 'undefined') {
                skillFState = 'ready';
            }
            if (typeof window !== 'undefined' && window.AudioMgr) {
                if (typeof window.AudioMgr.stopSkillFCharge === 'function') window.AudioMgr.stopSkillFCharge();
                if (typeof window.AudioMgr.stopSkillFFire === 'function') window.AudioMgr.stopSkillFFire();
                if (typeof window.AudioMgr.stopNullSlashWindup === 'function') window.AudioMgr.stopNullSlashWindup();
            }
            if (typeof window !== 'undefined') {
                window._runGameMode = 'normal';
                window._lowHpActive = false;
                window._hitVignetteStart = 0;
                if (typeof window._closeDuelRecap === 'function') {
                    window._closeDuelRecap();
                }
            }
            if (typeof document !== 'undefined' && document.body) {
                document.body.classList.remove('duel-mode');
            }
            this._recapOpened = false;
        }

        restart() {
            this.abort();
            this._startRunLoops();
            if (typeof window !== 'undefined') {
                window._runGameMode = 'showdown';
                window.gameState = 'playing';
                gameState = 'playing';
            }
            this.prepare();
            this.start();
            const w = this.selectedWeapon || 'lance';
            this.selectWeapon(w);
        }

        // Stops the sustained background loops of a run (space ambience, engine, heartbeat), as the Voyage does when a run ends.
        _stopRunLoops() {
            if (typeof window === 'undefined') return;
            window._lowHpActive = false;
            const am = window.AudioMgr;
            if (!am) return;
            try { am.stopLowHp(); am.stopAmbient(); am.stopEngine(); } catch (_) {}
        }

        // Starts them again when a run is replayed without going through the menu.
        _startRunLoops() {
            const am = (typeof window !== 'undefined') ? window.AudioMgr : null;
            if (!am) return;
            try { am.startAmbient(); am.startEngine(); } catch (_) {}
        }

        // Stops every sustained sound a fight can leave running (the F sweep charge and fire loops, the Null Slash
        // windup, the Egregor crawl, the time domain, the evolution volume duck), so nothing of the fight is
        // heard under the recap screen.
        _stopFightSounds() {
            const am = (typeof window !== 'undefined') ? window.AudioMgr : null;
            if (!am) return;
            const call = (name) => { if (typeof am[name] === 'function') { try { am[name](); } catch (_) {} } };
            if (this.shiftActive) call('exitTimeDomain');
            call('exitDuelEvolutionDuck');
            call('stopSkillFCharge');
            call('stopSkillFFire');
            call('stopNullSlashWindup');
            call('stopEgregorCrawl');
            call('stopLowHp');
            if (typeof am.stopDuelBattleTheme === 'function') am.stopDuelBattleTheme(.5);
        }

        // victory sounds that outlive the burst: they run on timers so stopDuelAudio at the recap does not cut them
        _victoryAfter(ms, fn) {
            const id = setTimeout(() => { this._victoryTimers = (this._victoryTimers || []).filter(v => v !== id); fn(); }, ms);
            (this._victoryTimers || (this._victoryTimers = [])).push(id);
        }

        _cancelVictoryCues() {
            for (const id of this._victoryTimers || []) clearTimeout(id);
            this._victoryTimers = [];
            for (const h of this._victoryHandles || []) { try { if (h && h.cancel) h.cancel(0.4); } catch (_) {} }
            this._victoryHandles = [];
        }

        // the ship report and its panel come as Egregor falls, with the epic cue under the voice; the afterglow follows once the cue has ended
        _playVictoryCues() {
            const am = window.AudioMgr;
            if (!am) return;
            const keep = h => { (this._victoryHandles || (this._victoryHandles = [])).push(h); };
            this._victoryAfter(600, () => keep(am.playSfx('duel-victory-bloom')));
            this._victoryAfter(1200, () => {
                keep(am.playSfx('vo-victory')); keep(am.playSfx('duel-victory-fanfare'));
                this._showReport('victory', 'report', 4.6);
            });
            this._victoryAfter(10500, () => { if (this.state === 'result') keep(am.playSfx('duel-victory-afterglow')); });
        }

        openRecapScreen() {
            if (this._recapOpened) return;
            this._recapOpened = true;
            this._stopRunLoops();
            this._stopFightSounds();
            const audio = window.AudioMgr;
            if (audio) {
                audio.stopDuelAudio();
                if (this.result === 'victory') {
                    audio.playSfx('result-victory');
                } else {
                    if (!this._failedVoicePlayed) window._gameoverVoice = audio.playSfx('gameover');
                    audio.playSfx('result-defeat');
                }
            }
            this.state = 'result';

            if (typeof window !== 'undefined' && typeof window._openDuelRecap === 'function') {
                const data = {
                    outcome: this.result,
                    quit: this.quit === true,
                    isPractice: this.practiceMode,
                    stats: this.stats,
                    weapon: this.selectedWeapon,
                    difficulty: this.difficulty || 'hard',
                    practiceAttackId: this.practiceMode ? this.attacks.currentAttackId : undefined
                };
                window._openDuelRecap(
                    data,
                    () => {
                        this._recapOpened = false;
                        if (window._gameoverVoice) { try { window._gameoverVoice.cancel(); } catch (_) {} window._gameoverVoice = null; }
                        if (typeof window !== 'undefined' && typeof window._duelRestart === 'function') {
                            window._duelRestart();
                        } else {
                            this.restart();
                        }
                    },
                    () => {
                        this._recapOpened = false;
                        if (window._gameoverVoice) { try { window._gameoverVoice.cancel(); } catch (_) {} window._gameoverVoice = null; }
                        this.abort();
                        if (typeof window !== 'undefined' && typeof window._returnToMainMenu === 'function') {
                            window._duelReturnToMenu();
                        } else if (typeof window !== 'undefined' && typeof window.showScreen === 'function') {
                            window.showScreen('start');
                        }
                    }
                );
            }
        }

        // Leaving from the pause menu closes the fight (or its opening cutscene) as a defeat marked as a withdrawal
        // and shows the Showdown recap. Returns false when nothing is running, so the caller leaves for the menu directly.
        quitToRecap() {
            root.DuelWeaponSkills?.reset(this);
            const running = this.state === 'playing' || this.state === 'spell_transition' || this.state === 'phase_transition' || this.state === 'pre_battle';
            if (!running || this._recapOpened) return false;
            this.result = 'defeat';
            this.quit = true;
            if (this.state === 'pre_battle') {
                this._cancelOpeningVoice();
                const am = window.AudioMgr;
                if (am && typeof am.stopEgregorCrawl === 'function') { try { am.stopEgregorCrawl(); } catch (_) {} }
            }
            if (this.shiftActive) this.releaseShift();
            const po = document.getElementById('pause-overlay');
            if (po) po.style.display = 'none';
            const peek = document.getElementById('position-peek-overlay');
            if (peek) peek.style.display = 'none';
            if (typeof gamePaused !== 'undefined') gamePaused = false;
            window._bgPaused = false;
            if (typeof lastTimeStamp !== 'undefined') lastTimeStamp = performance.now();
            if (window.AudioMgr && window.AudioMgr.resumeAll) window.AudioMgr.resumeAll();
            this.openRecapScreen();
            return true;
        }

        start() {
            if (typeof window !== 'undefined' && typeof window.showdownLockedOnThisDevice === 'function' && window.showdownLockedOnThisDevice()) {
                this.abort();
                if (typeof window.selectGameMode === 'function') {
                    window.selectGameMode('endless');
                }
                return;
            }
            this.active = true;
            if (typeof window !== 'undefined') {
                window._runGameMode = 'showdown';
            }
            this.state = 'opponent_select';
            this._cancelVictoryCues();
            if (window.AudioMgr) { window.AudioMgr.setDuelAudioActive(true); window.AudioMgr.prepareDuel(); }
            this._fxDamage.length = 0;
            this._fxDamageClock = 0;
            this._fxGraze = this._fxFReady = this._fxShiftReady = 0;
            this.difficulty = 'hard';
            this.attacks.setDifficulty('hard');
            this.lives = TOTAL_LIVES;
            if (typeof window !== 'undefined' && typeof window.lives !== 'undefined') window.lives = this.lives;
            if (typeof lives !== 'undefined') lives = this.lives;
            if (typeof window !== 'undefined') window._lowHpActive = false;
            this._recapOpened = false;
            this.burstTotalTime = 0;
            this.shiftActive = false;
            this.shiftElapsed = 0;
            this.shiftCooldownRemaining = 0;
            this.recoveryRemaining = 0;
            this.hitStopRemaining = 0;
            this._rechargeShieldOnRecovery = false;
            this.chosenAttackIndex = 0;
            this.practiceMode = false;
            this.playerShieldActive = true;
            this.playerShieldCooldown = 0;
            this.shieldBreaksCount = 0;
            this.skillACooldown = 0;
            root.DuelWeaponSkills?.reset(this);
            this.skillFCooldown = 0;
            this.skillFCharging = false;
            this.skillFSweepActive = false;
            this.enemySlowTimer = 0;
            this.enemyTimeScale = 1.0;
            if (this.bossEntity) {
                this.bossEntity._phase = 1;
                this.bossEntity._rageStacks = 0;
                this.bossEntity._visualRage = 0;
                this.bossEntity._ragePulseAt = -1000;
                this.bossEntity._egBodyHitAt = -1000;
                this.bossEntity._egSpawnAt = performance.now();
                if (this.bossEntity._eyeBlinkTimers) this.bossEntity._eyeBlinkTimers.fill(0);
            }
            if (this.cancelMotes) this.cancelMotes.length = 0; else this.cancelMotes = [];
            this.pool.reset();
            const _initW = (typeof canvas !== 'undefined' && canvas) ? canvas.width : 1280;
            const _initH = (typeof canvas !== 'undefined' && canvas) ? canvas.height : 720;
            this.bossPos = { x: _initW * 0.5, y: _initH * 0.18 };
            this.bossVel = { x: 0, y: 0 };
            this.bossMotion = { style: "hold", speed: 0, leanX: 0 };
            this.bossHabit = (typeof window !== "undefined" && window.DuelBossBrain && typeof window.DuelBossBrain.createHabit === "function")
                ? window.DuelBossBrain.createHabit() : null;
            this.bossMotionState = (typeof window !== "undefined" && window.DuelBossBrain && typeof window.DuelBossBrain.createMotionState === "function")
                ? window.DuelBossBrain.createMotionState(this.bossPos.x, this.bossPos.y, this.attacks ? this.attacks.seed : 1) : null;
            this.bossGestureState = (typeof window !== "undefined" && window.DuelGestures && typeof window.DuelGestures.createState === "function")
                ? window.DuelGestures.createState() : null;
            this.resetPlayerBullets();
            root.DuelWeaponSkills?.reset(this);
            this.stats = {
                timeSec: 0,
                damageDealt: 0,
                grazeCount: 0,
                shiftCount: 0,
                shiftsUsed: 0,
                clearedAttacks: [],
                livesRemaining: TOTAL_LIVES,
                livesLost: 0,
                hitsTaken: 0,
                shieldBreaks: 0,
                skillAUses: 0,
                skillADamage: 0,
                skillFUses: 0,
                skillFBulletsCleared: 0,
                hitsByAttack: {},
                hitsByCause: {
                    bullet: 0,
                    laser: 0,
                    tempest: 0,
                    null_slash: 0,
                    rift: 0
                },
                timeline: [],
                damageByAttack: {},
                dmgBuckets: [],
                lastCause: null
            };
            this.result = null;
            this.quit = false;
            this._idleVoice = null;
            this._lowHpVo5 = false;
            this._cockpit = null;
            this._failedVoicePlayed = false;
            this._report = null;
            this._lowHpVo3 = false;
            // The Shift and F control tips show over the first seconds of each of the first three fights
            this._tipsShow = false;
            try {
                const seen = parseInt(localStorage.getItem('pisces_duel_tips_seen') || '0', 10) || 0;
                this._tipsShow = seen < 3;
                if (this._tipsShow) localStorage.setItem('pisces_duel_tips_seen', String(seen + 1));
            } catch (_) { this._tipsShow = true; }

            if (typeof document !== 'undefined' && document.body) {
                document.body.classList.add('duel-mode');
            }

            this.addInputListeners();
        }

        startPractice(attackId, difficulty = 'standard') {
            this.start();
            this.practiceMode = true;
            this.difficulty = difficulty;
            this.attacks.setDifficulty(difficulty);
            this.chosenAttackIndex = Math.max(0, Math.min(TOTAL_ATTACKS - 1, attackId - 1));
            this.state = 'weapon_select';
        }

        addInputListeners() {
            if (typeof window === 'undefined') return;
            if (this._listenersActive) this.removeInputListeners();
            window.addEventListener('keydown', this._onKeyDown, true);
            window.addEventListener('keyup', this._onKeyUp, true);
            window.addEventListener('pointerdown', this._onPointerDown, true);
            window.addEventListener('pointermove', this._onPointerMove, true);
            window.addEventListener('pointerup', this._onPointerUp, true);
            this._listenersActive = true;
        }

        removeInputListeners() {
            if (typeof window === 'undefined') return;
            window.removeEventListener('keydown', this._onKeyDown, true);
            window.removeEventListener('keyup', this._onKeyUp, true);
            window.removeEventListener('pointerdown', this._onPointerDown, true);
            window.removeEventListener('pointermove', this._onPointerMove, true);
            window.removeEventListener('pointerup', this._onPointerUp, true);
            this._listenersActive = false;
        }

        selectOpponent(opponent, difficulty) {
            if (window.AudioMgr) window.AudioMgr.playSfx('ui-card-select');
            this.difficulty = difficulty || 'standard';
            this.attacks.setDifficulty(this.difficulty);
            this.state = 'weapon_select';
        }

        selectWeapon(weapon) {
            if (window.AudioMgr) window.AudioMgr.playSfx('ui-confirm-engage');
            this.selectedWeapon = weapon;
            this.lanceVolleyCounter = 0;
            if (this.practiceMode) {
                this.beginAttack(ATTACK_SEQUENCE[this.chosenAttackIndex]);
            } else {
                this.startPreBattle();
            }
        }

        _cancelOpeningVoice() {
            if (this._openingVoice && typeof this._openingVoice.cancel === 'function') {
                try { this._openingVoice.cancel(0.15); } catch (_) {}
            }
            this._openingVoice = null;
            if (this._openingMusic && typeof this._openingMusic.cancel === 'function') { try { this._openingMusic.cancel(0.8); } catch (_) {} }
            this._openingMusic = null;
            this._openingVoiceStarted = true;
            this._openingHoldUntil = 0;
        }

        startPreBattle() {
            window.DuelCinematics.prepareOpening(
                typeof canvas !== 'undefined' ? canvas.width : 1280,
                typeof canvas !== 'undefined' ? canvas.height : 720
            );
            this._fWasReady = undefined;
            this._shiftWasReady = undefined;
            this.state = 'pre_battle';
            this._openingSceneStartedAt = performance.now();
            this._openingMusic = (window.AudioMgr && window.AudioMgr.playDuelOpeningMusic) ? window.AudioMgr.playDuelOpeningMusic() : null;
            this._openingSkipped = false;
            this.preBattleElapsed = 0;
            this.preBattleDuration = 7.5;
            this._openingAudioStep = 0;
            this._openingVoice = null;
            this._openingVoiceStarted = false;
            this._openingPortalCue = false;
            this._openingEngageCue = false;
            this._openingR3Sounds = new Set();
            this._r3AshPlayed = false;
            this._sensorAudio = false; this._lockAudio = false;
            this._openingHoldUntil = 0;
            this._openingShakeA = false; this._openingShakeB = false;
            this.hpBarHitFlash = this.hpBarHeavyShake = 0;
            this._openingGestureState = window.DuelGestures ? window.DuelGestures.createState() : null;
            if (this._openingGestureState) {
                this._openingGestureState.current = 'roar';
                this._openingGestureState.prev = 'idle';
            }
            if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.prepareVoiceSequence === 'function') {
                try { window.AudioMgr.prepareVoiceSequence('contact'); } catch (_) {}
            }
            this.pool.reset();
            this.resetPlayerBullets();
            root.DuelWeaponSkills?.reset(this);

            if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) _setShake(3, 200);

            // Pre-warm heavy assets (Starry Night GPU texture, F Hex canvas) during opening
            // so the first Shift hold and F sweep have zero hitch (p99 <= 16ms).
            try {
                if (typeof ctx !== 'undefined') {
                    ctx.save();
                    ctx.globalAlpha = 0.001;
                    if (typeof _yogDomainStarryImg !== 'undefined' && _yogDomainStarryImg) {
                        ctx.drawImage(_yogDomainStarryImg, -100, -100, 16, 16);
                    }
                    if (typeof _getFHexCanvas === 'function' && typeof canvas !== 'undefined') {
                        const hexCv = _getFHexCanvas(canvas.width || 1280, canvas.height || 720, 0);
                        if (hexCv) ctx.drawImage(hexCv, -100, -100, 16, 16);
                    }
                    ctx.restore();
                }
            } catch (e) {
                // Pre-warm fallback
            }
        }

        beginAttack(attackId, released = false) {
            root.DuelWeaponSkills?.reset(this);
            this.attackSerial = (this.attackSerial || 0) + 1;
            if (this._invulnRipples) this._invulnRipples.length = 0;
            if (window.AudioMgr) window.AudioMgr.stopDuelAudio();
            window.AudioMgr?.startDuelBattleTheme?.();
            this.state = 'playing';
            this._recapOpened = false;
            this.burstTotalTime = 0;
            this.transitionDarken = 0;
            if (this._lockedBossPos) {
                this.bossPos = { x: this._lockedBossPos.x, y: this._lockedBossPos.y };
                this.bossVel = { x: 0, y: 0 };
                this._lockedBossPos = null;
            }
            const _cw = (typeof canvas !== 'undefined' && canvas) ? canvas.width : 1280;
            const _anchor = this.bossPos ? this.bossPos.x : _cw * 0.5;
            this._bossMotionTime = 0;
            this._bossMotionRate = 0;
            this.bossVel = { x: 0, y: 0 };
            this.bossMotion = { style: "hold", speed: 0, leanX: 0 };
            const _ch = (typeof canvas !== 'undefined' && canvas) ? canvas.height : 720;
            this.attacks.startAttack(attackId, { anchorX: _anchor, anchorY: this.bossPos ? this.bossPos.y : undefined, canvasW: _cw, canvasH: _ch, released });
            if (typeof window !== "undefined" && window.DuelBossBrain && typeof window.DuelBossBrain.resetMotionForAttack === "function") {
                const _ay = this.bossPos ? this.bossPos.y : _ch * 0.18;
                this.bossMotionState = window.DuelBossBrain.resetMotionForAttack(this.bossMotionState, attackId, _anchor, _ay, this.attacks.seed);
            }
            this.bossPhaseMorph = Attacks.ATTACK_DEFS[attackId].phase - 1;
            this.pool.reset();
        }

        nextAttack() {
            root.DuelWeaponSkills?.reset(this);
            if (window.AudioMgr) { window.AudioMgr.stopDuelAudio(); window.AudioMgr.playSfx('boss-bullet-cancel'); }
            const currentDef = Attacks.ATTACK_DEFS[this.attacks.currentAttackId];
            const wasDepleted = this.attacks.hp <= 0;
            const attId = currentDef ? currentDef.id : this.chosenAttackIndex + 1;
            const attHits = this.stats.hitsByAttack[attId] || 0;
            this.stats.clearedAttacks.push({
                attackId: attId,
                name: currentDef ? currentDef.name : 'Attack',
                depleted: wasDepleted,
                elapsed: this.attacks.elapsed,
                hits: attHits,
                clean: attHits === 0
            });

            this.attacks.skills.length = 0;
            this.attacks.telegraphs.length = 0;
            this.attacks.slowZones.length = 0;
            this.attacks.lasers.length = 0;
            this.attacks.thoughtCube.active = false;
            this.attacks.thoughtCube2.active = false;
            this.attacks.emissions.length = 0;
            this.attacks.bossCue = null;
            this.attacks.cues.length = 0;
            this.chosenAttackIndex++;
            if (this.practiceMode || this.chosenAttackIndex >= ATTACK_SEQUENCE.length) {
                this.state = 'victory_burst';
                window.AudioMgr?.stopDuelBattleTheme?.(1.5);
                window.AudioMgr?.playSfx('egregor-death-fracture');
                this._playVictoryCues();
                this.victoryBurstTime = 5.0;
                this.burstTotalTime = 0;
                this.result = 'victory';
                this.stats.livesRemaining = this.lives;
                if (typeof window !== 'undefined' && window.AudioMgr) {
                    try { window.AudioMgr.playSfx('egregor-death-roar'); } catch (_) {}
                }
                if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) _setShake(10, 500);
                const self = this;
                setTimeout(() => {
                    if (self.state === 'defeat_burst' || self.state === 'victory_burst') {
                        self.state = 'result';
                        self.openRecapScreen();
                    }
                }, 5600);
                if (Bullets && typeof Bullets.cancelAllBullets === 'function') {
                    Bullets.cancelAllBullets(this.pool);
                } else {
                    this.pool.reset();
                }
                this.resetPlayerBullets();
            root.DuelWeaponSkills?.reset(this);
                if (!this.practiceMode) {
                    try {
                        localStorage.setItem('pisces_duel_best_egregor', this.stats.timeSec.toFixed(1) + 's');
                    } catch (_) {}
                }
                return;
            }

            const nextAttackId = ATTACK_SEQUENCE[this.chosenAttackIndex];
            const nextDef = Attacks.ATTACK_DEFS[nextAttackId];

            const currentPhase = currentDef ? currentDef.phase : 1;
            const nextPhase = nextDef ? nextDef.phase : 1;

            if (nextPhase > currentPhase) {
                this.state = 'phase_transition';
                window.AudioMgr?.playSfx('egregor-evolution-shell');
                if (window.AudioMgr) window.AudioMgr.playSfxAt('evolve-charge', this.bossPos.x, this.bossPos.y);
                this.transitionElapsed = 0;
                this.transitionDuration = nextPhase === 3 ? 6.0 : 5.0;
                this._lockedBossPos = { x: this.bossPos.x, y: this.bossPos.y };
                this.bossVel = { x: 0, y: 0 };
                this._evolutionShards = [];
                this._phaseAudioStep = 0;
                this.transitionInfo = { phase: nextPhase, prevPhase: currentPhase, nextIndex: nextAttackId };
                this.recoveryRemaining = Math.max(this.recoveryRemaining, 1.5);
                // Free shield recharge on phase transition
                this.playerShieldActive = true;
                this.playerShieldCooldown = 0;
                if (this.bossEntity) {
                    this.bossEntity._phase = nextPhase;
                    this.bossEntity._ragePulseAt = performance.now();
                    this.bossEntity._visualRage = nextPhase === 2 ? 2.5 : 4.5;
                }
            } else {
                const isFinal = nextAttackId === 18;
                this.state = 'spell_transition';
                if (window.AudioMgr) window.AudioMgr.playSfxAt('spell-charge', this.bossPos.x, this.bossPos.y, nextPhase);
                this.transitionElapsed = 0;
                this.transitionDuration = 1.3;
                this._releasePlayed = false;
                this._lockedBossPos = { x: this.bossPos.x, y: this.bossPos.y };
                this.bossVel = { x: 0, y: 0 };
                this.recoveryRemaining = Math.max(this.recoveryRemaining, 1.2);
                this.transitionInfo = {
                    index: currentDef ? currentDef.id : this.chosenAttackIndex,
                    nextIndex: nextAttackId,
                    name: nextDef ? nextDef.name : 'Spell Card',
                    depleted: wasDepleted,
                    isFinalClimax: isFinal,
                    bonus: wasDepleted ? 5000 : 1500
                };
                if (isFinal && typeof window !== 'undefined' && window.AudioMgr) {
                    try { window.AudioMgr.playSfx('egregor-tempest-warn'); } catch (_) {}
                }
            }

            if (wasDepleted && window.AudioMgr) {
                window.AudioMgr.playSfx('hp-layer-break');
                window.AudioMgr.playSfx('vo-setclear');
                this._showReport('setclear', 'report', 4.5);
            }
            this._layerFreeze = 0.08;
            this._layerFreezeAt = performance.now() * 0.001;
            // Cancelled hostile projectiles converge on the locked core.
            if (Bullets && typeof Bullets.cancelAllBullets === 'function') {
                Bullets.cancelAllBullets(this.pool, this._lockedBossPos);
            } else {
                this.pool.reset();
            }
            this._engineTrail.length = 0;
            this.ghostTrail.length = 0;
            this.transitionDarken = 0.14;
            this.transitionShockwave = 0.6;
            this.bossFlashTime = 0.3;
        }

        update(dt, currentTime) {
            if (!this.active) return;
            for (let i = this._fxDamage.length - 1; i >= 0; i--) {
                this._fxDamage[i].life -= dt;
                if (this._fxDamage[i].life <= 0) this._fxDamage.splice(i, 1);
            }
            this._fxDamageClock = Math.max(0, this._fxDamageClock - dt);
            this._fxGraze = Math.max(0, (this._fxGraze || 0) - dt);
            this._fxFReady = Math.max(0, (this._fxFReady || 0) - dt);
            this._fxShiftReady = Math.max(0, (this._fxShiftReady || 0) - dt);

            // The Voyage background loops (space ambience, engine) are re-checked every 1.5 seconds of a run
            if (this.state !== 'idle' && this.state !== 'result') {
                this._loopWatch = (this._loopWatch || 0) + dt;
                if (this._loopWatch >= 1.5) {
                    this._loopWatch = 0;
                    if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.ensureRunLoops === 'function') {
                        try { window.AudioMgr.ensureRunLoops(); } catch (_) {}
                    }
                }
            }

            // Skill F and the Yog-Sothoth domain chime when they come back off cooldown, as in the Voyage
            if (this.state === 'playing') {
                const fReady = this.skillFCooldown <= 0 && !this.skillFCharging && !this.skillFSweepActive;
                const shiftReady = !this.shiftActive && this.shiftCooldownRemaining <= 0;
                if ((this._fWasReady === false && fReady) || (this._shiftWasReady === false && shiftReady)) {
                    if (typeof window !== 'undefined' && window.AudioMgr) { try { window.AudioMgr.playSfx('skill-ready'); } catch (_) {} }
                }
                if (this._fWasReady === false && fReady) this._fxFReady = .6;
                if (this._shiftWasReady === false && shiftReady) this._fxShiftReady = .6;
                this._fWasReady = fReady;
                this._shiftWasReady = shiftReady;
            }

            const canvasW = (typeof canvas !== 'undefined') ? canvas.width : 1280;
            const canvasH = (typeof canvas !== 'undefined') ? canvas.height : 720;
            const playerX = (typeof player !== 'undefined') ? player.x : canvasW * 0.5;
            const playerY = (typeof player !== 'undefined') ? player.y : canvasH - 60;
            // The shield ripples fade in every state. They used to fade only during a transition, so any ripple still alive
            // when the transition ended stayed frozen on the screen for the rest of the fight.
            if (this._invulnRipples && this._invulnRipples.length > 0) {
                for (let ri = this._invulnRipples.length - 1; ri >= 0; ri--) {
                    this._invulnRipples[ri].life -= dt;
                    if (this._invulnRipples[ri].life <= 0) this._invulnRipples.splice(ri, 1);
                }
            }
            for (const spark of this.bossHitSparks) {
                if (!spark.active) continue;
                spark.life = Math.max(0, spark.life - dt);
                spark.x += spark.vx * dt * 60; spark.y += spark.vy * dt * 60;
                if (spark.life <= 0) spark.active = false;
            }

            if (window.AudioMgr) {
                const phase = this.attacks.currentAttackId <= 6 ? 1 : this.attacks.currentAttackId <= 13 ? 2 : 3;
                const beam = this.attacks.skills.some(sk => sk.type === 'eye_beams' && sk.phase === 'active') || this.attacks.lasers.some(l => l.state === 'active');
                const chorus = this.attacks.skills.some(sk => sk.type === 'chorus');
                window.AudioMgr.syncDuelLoops(this.state === 'playing', phase, this.bossPos?.x, beam, chorus);
            }

            if (this.state === 'opponent_select') {
                this.opponentUI.update(dt);
                return;
            }

            if (this.state === 'weapon_select') {
                this.weaponPicker.update(dt);
                return;
            }

            if (this.state === 'pre_battle') {
                const now = performance.now();
                const am = typeof window !== 'undefined' ? window.AudioMgr : null;
                if (this._openingVoiceStarted && this._openingHoldUntil === 0 && this.preBattleElapsed >= 6.4) this._openingSkipped = true;
                if (!this._openingVoiceStarted) this.preBattleElapsed = Math.max(0, (now - this._openingSceneStartedAt) / 1000);
                else if (this._openingSkipped) this.preBattleElapsed += dt;
                if (this.preBattleElapsed >= 0.9 && !this._openingVoiceStarted) {
                    this._openingVoiceStarted = true;
                    this._openingSkipped = false;
                    this._openingVoiceStartedAt = now;
                    this._openingVoiceMarks = [0, 0.62, 1.63, 4.73, 6.22];
                    this.preBattleDuration = 8.9;
                    if (am && !am.isMuted() && typeof am.playVoiceSequence === 'function' && typeof am.getVoiceSequenceOffset === 'function') {
                        this._openingVoiceMarks = this._openingVoiceMarks.map((fallback, i) =>
                            am.getVoiceSequenceOffset('contact', i) || fallback);
                    }
                    if (am && typeof am.playVoiceSequence === 'function' && !am.isMuted()) {
                        try { this._openingVoice = am.playVoiceSequence('contact'); } catch (_) { this._openingVoiceMarks = [0, 0.62, 1.63, 4.73, 6.22]; }
                    }
                }
                if (this._openingVoiceStarted && !this._openingSkipped) {
                    const voice = this._openingVoice;
                    if (voice && Number.isFinite(voice.startedAt)) {
                        this._openingVoiceStartedAt = voice.startedAt;
                        if (voice.partOffsets) this._openingVoiceMarks = voice.partOffsets;
                    }
                    this._openingHoldUntil = this._openingVoiceStartedAt + this._openingVoiceMarks[3] * 1000;
                    if (now < this._openingHoldUntil) this.preBattleElapsed = Math.min(2.2, 0.9 + Math.max(0, (now - this._openingVoiceStartedAt) / 1000));
                    else this.preBattleElapsed = 2.2 + (now - this._openingHoldUntil) / 1000;
                }

                // The portal starts cracking open on the word "Warning", so its crackle plays then
                if (am && this._openingVoiceStarted && !this._openingSkipped && !this._openingPortalCue &&
                    now >= this._openingVoiceStartedAt + this._openingVoiceMarks[1] * 1000) {
                    this._openingPortalCue = true;
                    try { am.playSfx('portal-crack'); } catch (_) {}
                }

                // The rift tearing open and the boss arriving each shake the screen once
                if (this.preBattleElapsed >= 2.3 && !this._openingShakeA) {
                    this._openingShakeA = true;
                    if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) _setShake(5, 320);
                }
                if (this.preBattleElapsed >= 4.75 && !this._openingShakeB) {
                    this._openingShakeB = true;
                    if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) _setShake(11, 460);
                }
                // The portal and crawl cues follow the released cinematic clock.
                if (am) {
                    if (this.preBattleElapsed >= .15 && !this._sensorAudio) { this._sensorAudio = true; am.playSfx('sensor-sweep'); }
                    if (this.preBattleElapsed >= 3.3 && !this._lockAudio) { this._lockAudio = true; am.playSfx('lock-on-beep'); }
                    const sirenAt = [0.4];
                    for (let k = 0; k < sirenAt.length; k++) {
                        if (this.preBattleElapsed >= sirenAt[k] && this._openingAudioStep < k + 1) {
                            this._openingAudioStep = k + 1;
                            try { am.playSfx('egregor-tempest-warn'); } catch (_) {}
                            if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) _setShake(4, 180);
                        }
                    }
                    if (this.preBattleElapsed >= 3.6 && this._openingAudioStep < 4) {
                        this._openingAudioStep = 4;
                        try { am.playSfx('egregor-tempest-portal'); } catch (_) {}
                        if (typeof am.startEgregorCrawl === 'function') {
                            try { am.startEgregorCrawl(); } catch (_) {}
                        }
                    }
                    if (this.preBattleElapsed >= 4.75 && this._openingAudioStep === 4) {
                        this._openingAudioStep = 5;
                        am.playSfx('boss-emerge-roar');
                    }
                    if (this.preBattleElapsed >= 6.4 && this._openingAudioStep < 6) {
                        this._openingAudioStep = 6;
                        if (typeof am.stopEgregorCrawl === 'function') {
                            try { am.stopEgregorCrawl(); } catch (_) {}
                        }
                    }
                }

                window.DuelCinematics.updateOpeningAudio(this, now);
                if (this.preBattleElapsed >= 7.65 && !this._openingEngageCue) {
                    this._openingEngageCue = true;
                    if (am) am.playSfx('ui-confirm-engage');
                }

                if (this.preBattleElapsed >= this.preBattleDuration) {
                    this._cancelOpeningVoice();
                    if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.stopEgregorCrawl === 'function') {
                        try { window.AudioMgr.stopEgregorCrawl(); } catch (_) {}
                    }
                    this.beginAttack(ATTACK_SEQUENCE[this.chosenAttackIndex]);
                }
                return;
            }

            if (this.state === 'spell_transition' || this.state === 'phase_transition') {
                if (Bullets.updateTransientFX) Bullets.updateTransientFX(dt);
                this.transitionElapsed += dt;
                this._layerFreeze = Math.max(0, this._layerFreeze - dt);
                if (this.state === 'spell_transition' && !this._releasePlayed && this.transitionElapsed >= 1) {
                    this._releasePlayed = true;
                    if (window.AudioMgr) window.AudioMgr.playSfxAt('spell-release', this.bossPos.x, this.bossPos.y, this.transitionInfo?.phase || (this.attacks.currentAttackId <= 6 ? 1 : this.attacks.currentAttackId <= 13 ? 2 : 3));
                }
                if (this.transitionInfo) {
                    this.transitionInfo.progress = Math.min(1.0, this.transitionElapsed / Math.max(0.1, this.transitionDuration));
                }
                if (this.state === 'phase_transition' && this.transitionInfo) {
                    const nextP = this.transitionInfo.phase || 2;
                    const tEl = this.transitionElapsed;
                    const burstAt = 2.6;
                    if (tEl >= 0.15 && this._phaseAudioStep < 1) {
                        this._phaseAudioStep = 1;
                        if (typeof window !== 'undefined' && window.AudioMgr) {
                            window.AudioMgr.enterDuelEvolutionDuck();
                            window.AudioMgr.playSfx('egregor-tempest-veins');
                        }
                    }
                    if (tEl >= burstAt && this._phaseAudioStep < 2) {
                        this._phaseAudioStep = 2;
                        window.AudioMgr?.playSfx('egregor-evolution-shards');
                        if (typeof window !== 'undefined' && window.AudioMgr) {
                            window.AudioMgr.playSfxAt('evolve-roar', this.bossPos.x, this.bossPos.y, nextP);
                        }
                        if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) _setShake(nextP === 3 ? 14 : 11, 420);
                        // Spawn shattering carapace shards from locked boss position
                        const bx = this._lockedBossPos ? this._lockedBossPos.x : canvasW * 0.5;
                        const by = this._lockedBossPos ? this._lockedBossPos.y : canvasH * 0.18;
                        const fx = window._fxOpts;
                        const shards = fx?.particles === false || fx?.reducedMotion ? 0 : (typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2 ? 16 : 42);
                        for (let sh = 0; sh < shards; sh++) {
                            const ang = (sh / shards) * Math.PI * 2 + (sh % 3) * 0.15;
                            const spd = 140 + (sh % 5) * 48;
                            this._evolutionShards.push({
                                x: bx, y: by,
                                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                                rot: ang, vrot: (sh % 2 === 0 ? 4 : -4),
                                size: 8 + (sh % 4) * 4, life: 1.1, maxLife: 1.1
                            });
                        }
                    }
                    this.bossPhaseMorph = nextP - 2 + smoothRelease((tEl - 2.78) / 1.28);
                    if (tEl >= 3.35 && this._phaseAudioStep < 3) {
                        this._phaseAudioStep = 3;
                        if (window.AudioMgr) window.AudioMgr.exitDuelEvolutionDuck();
                    }
                    if (tEl >= this.transitionDuration - 1 && this._phaseAudioStep < 4) {
                        this._phaseAudioStep = 4;
                        if (window.AudioMgr) {
                            window.AudioMgr.playSfx('evolve-reveal');
                            window.AudioMgr.playSfx(nextP === 3 ? 'vo-phase3' : 'vo-phase2');
                            this._showReport(nextP === 3 ? 'phase3' : 'phase2', nextP === 3 ? 'critical' : 'warning', nextP === 3 ? 10 : 8.5);
                        }
                    }
                    for (let si = this._evolutionShards.length - 1; si >= 0; si--) {
                        const sh = this._evolutionShards[si];
                        sh.life -= dt;
                        sh.x += sh.vx * dt;
                        sh.y += sh.vy * dt;
                        sh.rot += sh.vrot * dt;
                        if (sh.life <= 0) this._evolutionShards.splice(si, 1);
                    }
                }
                if (this.cancelMotes.length > 0) {
                    for (let mIdx = this.cancelMotes.length - 1; mIdx >= 0; mIdx--) {
                        const mot = this.cancelMotes[mIdx];
                        mot.life -= dt;
                        if (mot.life <= 0) {
                            this.cancelMotes.splice(mIdx, 1);
                        } else {
                            mot.x += mot.vx * dt;
                            mot.y += mot.vy * dt;
                            mot.alpha = Math.max(0, mot.life / mot.maxLife);
                        }
                    }
                }
                // Keep player bullets flying and allow firing during transitions (boss shows invulnerability shield ripples)
                if (this._layerFreeze === 0) {
                    this.fireAutoShot();
                    this._updatePlayerBullets(dt, canvasW, canvasH);
                }
                if (this.transitionElapsed >= this.transitionDuration) {
                    this.beginAttack(ATTACK_SEQUENCE[this.chosenAttackIndex], true);
                }
                return;
            }

            if (this.state === 'defeat_burst') {
                this.defeatBurstTime -= dt;
                this.burstTotalTime = (this.burstTotalTime || 0) + dt;
                if (this.defeatBurstTime <= 0 || this.burstTotalTime >= 3.0) {
                    this.state = 'result';
                    this.openRecapScreen();
                }
                return;
            }

            if (this.state === 'victory_burst') {
                if(!this._r3AshPlayed){this._r3AshPlayed=true;window.AudioMgr?.playSfx('egregor-death-ash');}
                this.victoryBurstTime -= dt;
                this.burstTotalTime = (this.burstTotalTime || 0) + dt;
                if (this.victoryBurstTime <= 0 || this.burstTotalTime >= 5.2) {
                    this.state = 'result';
                    this.openRecapScreen();
                }
                return;
            }

            if (this.hitStopRemaining > 0) {
                this.hitStopRemaining = Math.max(0, this.hitStopRemaining - dt);
                return;
            }

            if (this.state !== 'playing') return;

            // The battle clock is game time: it runs at the same rate as the Egregor's world, so the HUD clock
            // slows down together with the F sweep and the Shift domain
            this.stats.timeSec += dt * this.enemyTimeScale;
            if (this.hpBarHitFlash > 0) this.hpBarHitFlash = Math.max(0, this.hpBarHitFlash - dt * 5.5);
            if (this.hpBarHeavyShake > 0) this.hpBarHeavyShake = Math.max(0, this.hpBarHeavyShake - dt * 4.0);
            if (this.transitionDarken > 0) this.transitionDarken = Math.max(0, this.transitionDarken - dt * 1.5);
            if (this._shieldBreakAnim > 0) this._shieldBreakAnim = Math.max(0, this._shieldBreakAnim - dt);
            if (this._shieldRestoreAnim > 0) this._shieldRestoreAnim = Math.max(0, this._shieldRestoreAnim - dt);
            for (let gi = this.ghostTrail.length - 1; gi >= 0; gi--) {
                this.ghostTrail[gi].alpha -= dt * 2.4;
                if (this.ghostTrail[gi].alpha <= 0) this.ghostTrail.splice(gi, 1);
            }
            if (typeof player !== 'undefined') {
                if (Math.abs(player.x - (this._prevTrailPlayerX || player.x)) > 1.2) {
                    this._engineTrail.push({ x: player.x, y: player.y + 22, life: 0.28, maxLife: 0.28 });
                    if (this._engineTrail.length > 12) this._engineTrail.shift();
                }
                this._prevTrailPlayerX = player.x;
                for (let ti = this._engineTrail.length - 1; ti >= 0; ti--) {
                    this._engineTrail[ti].life -= dt;
                    this._engineTrail[ti].y += dt * 48;
                    if (this._engineTrail[ti].life <= 0) this._engineTrail.splice(ti, 1);
                }
            }
            if (this.spellCardAnnounce) {
                this.spellCardAnnounce.elapsed += dt;
            }

            // Shift cooldown update
            if (this.shiftActive) {
                this.shiftElapsed += dt;
                if (this.shiftElapsed >= SHIFT_MAX_DURATION_SEC) {
                    this.releaseShift();
                }
            } else if (this.shiftCooldownRemaining > 0) {
                this.shiftCooldownRemaining = Math.max(0, this.shiftCooldownRemaining - dt);
            }

            // Recovery cooldown update
            if (this.recoveryRemaining > 0) {
                this.recoveryRemaining = Math.max(0, this.recoveryRemaining - dt);
                if (this.recoveryRemaining <= 0 && this._rechargeShieldOnRecovery) {
                    this.playerShieldActive = true;
                    this.playerShieldCooldown = 0;
                    this._shieldRestoreAnim = 0.35;
                    this._rechargeShieldOnRecovery = false;
                    if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
                        try { window.AudioMgr.playSfx('shield-restore'); } catch (e) {}
                    }
                }
            }

            // Player Shield cooldown update
            if (!this.playerShieldActive) {
                this.playerShieldCooldown -= dt;
                if (this.playerShieldCooldown <= 0) {
                    this.playerShieldActive = true;
                    this.playerShieldCooldown = 0;
                    this._shieldRestoreAnim = 0.35;
                    if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
                        try { window.AudioMgr.playSfx('shield-restore'); } catch (e) {}
                    }
                }
            }

            root.DuelWeaponSkills?.update(this, dt);

            // Skill F cooldown, charge, and sweep update
            if (this.skillFCooldown > 0) {
                this.skillFCooldown = Math.max(0, this.skillFCooldown - dt);
            }
            if (this.skillFCharging) {
                this.skillFChargeElapsed += dt;
                if (this.skillFChargeElapsed >= this.skillFChargeDuration) {
                    this.skillFCharging = false;
                    this.skillFSweepActive = true;
                    this.skillFSweepElapsed = 0;
                    this._lockedSweepDirection = this.skillFDirection || 1;
                    this.skillFCooldown = this.skillFMaxCooldown;
                    this.enemySlowTimer = 4.0;
                    this.enemyTimeScale = 0.5;
                    if (typeof skillFState !== 'undefined') {
                        skillFState = 'sweeping';
                    }
                    if (typeof skillFSweepStart !== 'undefined') {
                        skillFSweepStart = performance.now();
                    }
                    if (typeof skillFSweepDuration !== 'undefined') {
                        skillFSweepDuration = 1000;
                    }
                    if (typeof skillFDirection !== 'undefined') {
                        skillFDirection = this._lockedSweepDirection;
                    }
                    if (typeof window !== 'undefined' && window.AudioMgr) {
                        if (typeof window.AudioMgr.stopSkillFCharge === 'function') window.AudioMgr.stopSkillFCharge();
                        if (typeof window.AudioMgr.startSkillFFire === 'function') window.AudioMgr.startSkillFFire();
                    }
                }
            } else if (this.skillFSweepActive) {
                this.skillFSweepElapsed += dt;
                this._performSkillFSweep(dt);
                if (this.skillFSweepElapsed >= this.skillFSweepDuration) {
                    this.skillFSweepActive = false;
                    if (typeof skillFState !== 'undefined') {
                        skillFState = 'ready';
                    }
                    if (typeof window !== 'undefined' && window.AudioMgr) {
                        if (typeof window.AudioMgr.stopSkillFFire === 'function') window.AudioMgr.stopSkillFFire();
                    }
                }
            }

            // Egregor time scale: the F sweep slows it to 0.5x for 4.0s, and holding Shift (the Yog-Sothoth domain)
            // slows its whole world (attack scripts, skills, movement and bullets) on top of that
            let enemyScale = 1.0;
            if (this.enemySlowTimer > 0) {
                this.enemySlowTimer = Math.max(0, this.enemySlowTimer - dt);
                if (this.enemySlowTimer > 0) enemyScale = 0.5;
            }
            if (this.shiftActive) enemyScale *= SHIFT_SLOW_MULT;
            if (window._duelDebug) enemyScale *= window._duelDebug.enemyScale;
            this.enemyTimeScale = enemyScale;

            // Update cancel motes
            if (this.cancelMotes.length > 0) {
                for (let mIdx = this.cancelMotes.length - 1; mIdx >= 0; mIdx--) {
                    const mot = this.cancelMotes[mIdx];
                    mot.life -= dt;
                    if (mot.life <= 0) {
                        this.cancelMotes.splice(mIdx, 1);
                    } else {
                        mot.x += mot.vx * dt;
                        mot.y += mot.vy * dt;
                        mot.alpha = Math.max(0, mot.life / mot.maxLife);
                    }
                }
            }

            // Movement slow zones
            const slowFactor = this.attacks.checkSlowAt(playerX, playerY);
            if (typeof player !== 'undefined') {
                const baseSpeed = 8.6;
                player.speed = baseSpeed * (1.0 - slowFactor);
            }

            // Observe player positioning habits in memory during active combat
            if (typeof window !== "undefined" && window.DuelBossBrain && typeof window.DuelBossBrain.observeHabit === "function") {
                if (!this.bossHabit) this.bossHabit = window.DuelBossBrain.createHabit();
                window.DuelBossBrain.observeHabit(this.bossHabit, {
                    playerX: playerX,
                    playerY: playerY,
                    dt: dt,
                    attackId: this.attacks.currentAttackId,
                    width: canvasW,
                    height: canvasH
                });
            }

            // Update continuous boss position before attack spawns and bullet hit checks
            const enemyDt = dt * this.enemyTimeScale;
            this._updateBossMotion(enemyDt, canvasW, canvasH, playerX, playerY);

            // Bullet update with speed scaling under Shift and Skill F slow
            const bulletSpeedScale = this.enemyTimeScale * BOSS_BULLET_SPEED_MULT;
            this._bossEyeSamples ||= [];
            if (this._bossEyeSamples.length === 11) this._bossEyeSamples.pop();
            this._bossEyeSamples.unshift({ x: playerX, y: playerY });
            this.attacks.update(enemyDt, canvasW, canvasH, playerX, playerY, null, this.bossPos);
            this._updateIdleVoice(dt);
            if (typeof window !== "undefined" && window.DuelGestures && typeof window.DuelGestures.updateState === "function") {
                if (!this.bossGestureState) this.bossGestureState = window.DuelGestures.createState();
                const _bp = this.bossPos || { x: canvasW * 0.5, y: canvasH * 0.18 };
                const _gdx = playerX - _bp.x;
                const _gdy = playerY - _bp.y;
                const _glen = Math.hypot(_gdx, _gdy) || 1;
                const _hitAgeG = (typeof performance !== "undefined" ? performance.now() : 0) - (this._egBodyHitAt || -1000);
                window.DuelGestures.updateState(this.bossGestureState, {
                    cue: this.attacks.poseCue,
                    dirX: _gdx / _glen,
                    dirY: _gdy / _glen,
                    leanX: this.bossMotion ? this.bossMotion.leanX : 0,
                    speed: this.bossMotion ? this.bossMotion.speed : 0,
                    heavyHit: !!(this._bossHitHeavy && _hitAgeG >= 0 && _hitAgeG < 140),
                    tauntTrigger: this.attacks.elapsed > 0.25 && this.attacks.elapsed < 0.45,
                    reducedMotion: !!(window._fxOpts && window._fxOpts.reducedMotion)
                }, enemyDt, window.DUEL_GESTURES_DATA);
            }
            this.pool.update(dt, bulletSpeedScale, { minX: -60, maxX: canvasW + 60, minY: -60, maxY: canvasH + 60 });

            // Combat checks
            this._updateGraze(dt, playerX, playerY);
            this._checkPlayerHits(currentTime, playerX, playerY);
            this._updatePlayerBullets(dt, canvasW, canvasH);

            // Advance attack only when current attack HP reaches zero
            const def = Attacks.ATTACK_DEFS[this.attacks.currentAttackId];
            if (def && this.attacks.hp <= 0) {
                this.nextAttack();
            }
        }

        // The line the ship computer speaks is also shown as a report panel in the corner of the screen for as long as it is heard
        _showReport(id, tag, duration) {
            this._report = { id, tag, duration, at: performance.now() };
            window.AudioMgr?.playSfx('duel-ship-report');
            if(id==='lowhp5')window.AudioMgr?.playSfx('duel-cockpit-five');
            if(id==='lowhp3')window.AudioMgr?.playSfx('duel-cockpit-three');
        }

        // Phase 1 Egregor now and then lets out a coo, a growl or (rarely) a roar from its body while it fights. They are
        // spaced 9 to 18 seconds apart, skipped while a voice line or boss cue is playing, and the roar needs 45 s between uses.
        _updateIdleVoice(dt) {
            const am = window.AudioMgr;
            const def = this.attacks && Attacks.ATTACK_DEFS[this.attacks.currentAttackId];
            if (!am || !def || !(def.phase >= 1 && def.phase <= 3)) return;
            const v = this._idleVoice || (this._idleVoice = { clock: 0, next: 8 + Math.random() * 6, lastRoar: -999 });
            v.clock += dt;
            if (v.clock < v.next || this.attacks.elapsed < 1.5 || this.shiftActive) return;
            const status = typeof am.getDuelAudioStatus === 'function' ? am.getDuelAudioStatus() : null;
            if (status && (status.voiceDuck || status.cueDuck)) { v.next = v.clock + 1.5; return; }
            const r = Math.random();
            let kind = r < .4 ? 'coo' : r < .85 ? 'growl' : 'roar';
            if (kind === 'roar' && v.clock - v.lastRoar < 45) kind = 'growl';
            if (kind === 'roar') v.lastRoar = v.clock;
            const phase = def.phase;
            const key = kind === 'roar' ? 'egregor-idle-p' + phase + '-roar' : 'egregor-idle-p' + phase + '-' + kind + (Math.random() < .5 ? '-a' : '-b');
            // a busy mix can refuse the sound, so it is tried again shortly instead of being skipped
            if (!am.playSfxAt(key, this.bossPos.x, this.bossPos.y, phase)) { v.next = v.clock + 1.2; return; }
            // the later forms speak up more often: 9 to 18 s, then 7 to 14 s, then 5 to 11 s
            v.next = v.clock + (phase === 1 ? 9 + Math.random() * 9 : phase === 2 ? 7 + Math.random() * 7 : 5 + Math.random() * 6);
        }

        _updateBossMotion(dt, canvasW, canvasH, playerX, playerY) {
            if (!this.bossPos) this.bossPos = { x: canvasW * 0.5, y: canvasH * 0.18 };
            if (dt <= 0) return;
            const a = this.attacks;
            const sphereBusy = sphere => sphere && sphere.active && (sphere.phase === 'telegraph' || sphere.phase === 'flying');
            const skillBusy = a.skills.some(sk =>
                (sk.type === 'null_slash' && (sk.phase === 'charging' || sk.phase === 'striking')) ||
                (sk.type === 'tempest' && (sk.phase === 'telegraph' || sk.phase === 'strike')) ||
                ((sk.type === 'gap_bar' || sk.type === 'crush_pillar') && (sk.phase === 'telegraph' || sk.phase === 'drop')) ||
                (sk.type === 'rift' && sk.elapsed < 0.9));
            const immobile = a.elapsed < 2 || a.currentAttackId === 6 || skillBusy || sphereBusy(a.thoughtCube) || sphereBusy(a.thoughtCube2);
            const brain = (typeof window !== "undefined") ? window.DuelBossBrain : null;
            const previousX = this.bossPos.x, previousY = this.bossPos.y;

            if (brain && typeof brain.stepMotion === "function") {
                if (!this.bossMotionState || this.bossMotionState.attackId !== a.currentAttackId) {
                    this.bossMotionState = brain.resetMotionForAttack(this.bossMotionState, a.currentAttackId, this.bossPos.x, this.bossPos.y, a.seed);
                }
                const px = Number.isFinite(playerX) ? playerX : ((typeof player !== "undefined" && player) ? player.x : canvasW * 0.5);
                const py = Number.isFinite(playerY) ? playerY : ((typeof player !== "undefined" && player) ? player.y : canvasH * 0.85);
                const phase = a.currentAttackId <= 6 ? 1 : (a.currentAttackId <= 13 ? 2 : 3);
                const nextCueIn = typeof a.getNextCueIn === "function" ? a.getNextCueIn() : Infinity;
                const res = brain.stepMotion(this.bossMotionState, {
                    attackId: a.currentAttackId,
                    phase: phase,
                    width: canvasW,
                    height: canvasH,
                    playerX: px,
                    playerY: py,
                    habit: this.bossHabit,
                    weights: (typeof window !== "undefined") ? window.DUEL_BOSS_WEIGHTS : null,
                    immobile: immobile,
                    nextCueIn: nextCueIn
                }, dt);
                this.bossPos.x = res.x;
                this.bossPos.y = res.y;
                this.bossVel = { x: res.vx, y: res.vy };
                this.bossMotion = { style: res.style, speed: res.speed, leanX: res.leanX };
                if (immobile) {
                    this._bossMotionRate = 0;
                    this._lastBossPos = { x: this.bossPos.x, y: this.bossPos.y };
                    return;
                }
            } else {
                if (immobile) {
                    this._bossMotionRate = 0;
                    this.bossVel = { x: 0, y: 0 };
                    this.bossMotion = { style: "hold", speed: 0, leanX: 0 };
                    this._lastBossPos = { x: this.bossPos.x, y: this.bossPos.y };
                    return;
                }
                this._bossMotionRate = Math.min(1, (this._bossMotionRate || 0) + dt / 0.3);
                this._bossMotionTime = Math.max(2, this._bossMotionTime || 0) + dt * this._bossMotionRate;
                const target = Attacks.getBossTargetPosition(this._bossMotionTime, canvasW, canvasH,
                    a.currentAttackId, a.seed, a.anchorX, a.anchorY);
                const maxStep = Math.min(5, 125 * dt);
                this.bossPos.x += Math.max(-maxStep, Math.min(maxStep, target.x - previousX));
                this.bossPos.y += Math.max(-maxStep, Math.min(maxStep, target.y - previousY));
                this.bossPos.x = Math.max(canvasW * 0.12, Math.min(canvasW * 0.88, this.bossPos.x));
                this.bossPos.y = Math.max(canvasH * 0.18, Math.min(canvasH * 0.44, this.bossPos.y));
                this.bossVel = { x: (this.bossPos.x - previousX) / dt, y: (this.bossPos.y - previousY) / dt };
                const spd = Math.hypot(this.bossVel.x, this.bossVel.y);
                this.bossMotion = { style: spd > 20 ? "glide" : "hold", speed: spd, leanX: Math.max(-1, Math.min(1, this.bossVel.x / 180)) };
            }
            const dx = this.bossPos.x - previousX, dy = this.bossPos.y - previousY;
            for (const shot of a.emissions) {
                if (shot.options.locked || shot.options.cause === 'rift') continue;
                shot.x += dx; shot.y += dy;
            }
            for (const skill of a.skills) {
                if (skill.type === 'tendril_lash' && skill.variant === 'targeted') {
                    skill.originX += dx; skill.originY += dy;
                    skill.ctrlX += dx * 0.5; skill.ctrlY += dy * 0.5;
                }
                if (skill.type === 'eye_beams') {
                    for (const beam of skill.beams || []) { beam.originX += dx; beam.originY += dy; }
                }
            }
            this._lastBossPos = { x: this.bossPos.x, y: this.bossPos.y };
        }

        _updateGraze(dt, playerX, playerY) {
            this.grazeLastCheckTime += dt;
            if (this.grazeLastCheckTime >= 1.0) {
                this.grazeAccumulator = 0;
                this.grazeLastCheckTime = 0;
            }

            this.playerHitboxVisible = this.shiftActive;

            const bullets = this.pool.bullets;
            const len = this.pool.capacity;
            for (let i = 0; i < len; i++) {
                const b = bullets[i];
                if (!b.active || b.grazed) continue;

                const res = Bullets.checkBulletCollision(b, playerX, playerY);
                if (res.graze) {
                    b.grazed = true;
                    this.stats.grazeCount++;
                    this._fxGraze = .32;
                    if (window.AudioMgr) window.AudioMgr.playSfxAt('graze-tick', b.x, b.y);
                    this.playerHitboxVisible = true;

                    if (this.grazeAccumulator < GRAZE_MAX_RATE_PER_SEC) {
                        this.grazeAccumulator++;
                        if (this.shiftCooldownRemaining > 0) {
                            this.shiftCooldownRemaining = Math.max(0, this.shiftCooldownRemaining - GRAZE_COOLDOWN_REDUCTION_SEC);
                        }
                    }

                    if (typeof createParticles === 'function' && window._fxOpts?.particles !== false) {
                        const goldCol = (T && T.bulletFamilies && T.bulletFamilies.gold) ? T.bulletFamilies.gold.main : 'gold';
                        createParticles(b.x, b.y, 3, goldCol, 1.5, 4);
                    }
                }
            }
        }

        _checkPlayerHits(currentTime, playerX, playerY) {
            // The Yog-Sothoth domain is Iron Body: nothing can hurt the ship while it is open
            if (this.recoveryRemaining > 0 || this.shiftActive) return;

            // 1. Check laser collisions
            if (this.attacks.checkLaserCollisions(playerX, playerY, Bullets.SHIP_HIT_RADIUS)) {
                this.onPlayerHit('laser');
                return;
            }

            // 1b. Check active skill collisions
            const skillHit = this.attacks.checkSkillCollisions(playerX, playerY, Bullets.SHIP_HIT_RADIUS);
            if (skillHit && skillHit.hit) {
                if (skillHit.cause === 'null_slash' && window.AudioMgr) window.AudioMgr.playSfx('nullslash-hit2');
                this.onPlayerHit(skillHit.cause || 'laser');
                return;
            }

            // 2. Check bullet pool collisions
            const bullets = this.pool.bullets;
            const len = this.pool.capacity;
            for (let i = 0; i < len; i++) {
                const b = bullets[i];
                if (!b.active) continue;

                const res = Bullets.checkBulletCollision(b, playerX, playerY);
                if (res.hit) {
                    b.active = false;
                    this.pool.activeCount--;
                    this.onPlayerHit(b.cause);
                    return;
                }
            }
        }

        onPlayerHit(cause) {
            if (this.recoveryRemaining > 0 || this.shiftActive) return;
            if (window._duelDebug && window._duelDebug.invuln) return;

            const px = (typeof player !== 'undefined') ? player.x : 640;
            const py = (typeof player !== 'undefined') ? player.y : 640;
            const currentAttId = this.attacks ? this.attacks.currentAttackId : 1;
            const cKey = cause || 'bullet';

            // Player Shield handling in duel: absorbs hit, breaks, no life lost
            if (this.playerShieldActive) {
                this.playerShieldActive = false;
                this.playerShieldCooldown = this.playerShieldMaxCooldown;
                this._shieldBreakAnim = 0.40;
                this.shieldBreaksCount = (this.shieldBreaksCount || 0) + 1;
                this.stats.shieldBreaks = this.shieldBreaksCount;
                this.recoveryRemaining = 0.8;

                // Threat and timeline tracking
                this.stats.hitsByCause[cKey] = (this.stats.hitsByCause[cKey] || 0) + 1;
                this.stats.hitsByAttack[currentAttId] = (this.stats.hitsByAttack[currentAttId] || 0) + 1;
                this.stats.timeline.push({ time: this.stats.timeSec, attackId: currentAttId, type: 'shield_break', cause: cKey });

                // Cancel Skill F charge if hit while charging
                if (this.skillFCharging) {
                    this.skillFCharging = false;
                    if (typeof skillFState !== 'undefined') skillFState = 'ready';
                    if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.stopSkillFCharge === 'function') {
                        window.AudioMgr.stopSkillFCharge();
                    }
                }

                // Break VFX: shatter fragments and 80px bullet cancel shockwave
                this._cancelBulletsInRadius(px, py, 80);

                // Shield break uses crisp cyan shatter ring (_shieldBreakAnim) instead of large gold explosion
                if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) {
                    _setShake(15, 400);
                }
                if (typeof createParticles === 'function' && window._fxOpts?.particles !== false) {
                    const cyanCol = (T && T.shieldCyan) ? T.shieldCyan : 'cyan';
                    createParticles(px, py, 18, cyanCol, 3.0, 10);
                }
                if (typeof window !== 'undefined' && window.AudioMgr) {
                    window.AudioMgr.playSfx('shield-break');
                } else if (typeof window !== 'undefined' && window.audio && typeof window.audio.play === 'function') {
                    try { window.audio.play('shield-hit', { volume: 0.6 }); } catch (e) {}
                }
                return;
            }

            // Hit while charging cancels Skill F
            if (this.skillFCharging) {
                this.skillFCharging = false;
                if (typeof skillFState !== 'undefined') skillFState = 'ready';
                if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.stopSkillFCharge === 'function') {
                    window.AudioMgr.stopSkillFCharge();
                }
            }

            // Life lost handling: Duel lives tracked in session.lives; global lives kept >= 1 so Endless gameover never triggers
            this.lives = Math.max(0, this.lives - 1);
            if (typeof lives !== 'undefined') lives = Math.max(1, this.lives);
            if (typeof window !== 'undefined') {
                window.lives = Math.max(1, this.lives);
                window._hitVignetteStart = performance.now();
                // The main loop watches the global lives value and starts or stops the low health heartbeat itself,
                // so the flag is left to it (setting it here would make the watcher think the loop already runs).
            }

            // The ship computer warns once when the lives drop to 5 or fewer and once more at 3 or fewer (never on the killing hit)
            if (this.lives > 0 && window.AudioMgr) {
                if (this.lives <= 3 && !this._lowHpVo3) { this._lowHpVo3 = true; this._lowHpVo5 = true; this._cockpit = { level: 3, at: performance.now() }; window.AudioMgr.playSfx('vo-lowhp3'); this._showReport('lowhp3', 'critical', 5.3); }
                else if (this.lives <= 5 && !this._lowHpVo5) { this._lowHpVo5 = true; this._cockpit = { level: 5, at: performance.now() }; window.AudioMgr.playSfx('vo-lowhp5'); this._showReport('lowhp5', 'warning', 6.2); }
            }
            this.stats.livesLost++;
            this.stats.hitsTaken++;
            this.stats.lastCause = cKey;
            this._recordTaken();
            this.stats.livesRemaining = this.lives;
            this.stats.hitsByCause[cKey] = (this.stats.hitsByCause[cKey] || 0) + 1;
            this.stats.hitsByAttack[currentAttId] = (this.stats.hitsByAttack[currentAttId] || 0) + 1;
            this.stats.timeline.push({ time: this.stats.timeSec, attackId: currentAttId, type: 'hit', cause: cKey });

            // Recovery and hit-stop
            this._rechargeShieldOnRecovery = true;
            this.hitStopRemaining = 0.080;
            this.recoveryRemaining = 2.0;

            // 120px shockwave cancels nearby bullets into motes
            this._cancelBulletsInRadius(px, py, 120);

            if (typeof createParticles === 'function' && window._fxOpts?.particles !== false) {
                const crimsonCol = (T && T.crimson) ? T.crimson : 'crimson';
                createParticles(px, py, 24, crimsonCol, 2.5, 8);
            }
            if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) {
                _setShake(10, 300);
            }
            if (typeof window !== 'undefined' && window.AudioMgr) {
                window.AudioMgr.playSfx('life-lost');
            } else if (typeof window !== 'undefined' && window.audio && typeof window.audio.play === 'function') {
                try { window.audio.play('life-lost', { volume: 0.6 }); } catch (e) {}
            }

            if (this.lives <= 0) {
                if (typeof createParticles === 'function' && window._fxOpts?.particles !== false) {
                    const crimsonCol = (T && T.crimson) ? T.crimson : 'crimson';
                    createParticles(px, py, 50, crimsonCol, 4.2, 18);
                    createParticles(px, py, 18, '#b4edff', 3.6, 8);
                }
                this.state = 'defeat_burst';
                window.AudioMgr?.stopDuelBattleTheme?.(1.2);
                window.AudioMgr?.playSfx('duel-ship-fireball');
                window.AudioMgr?.playSfx('duel-ship-debris');
                this.defeatBurstTime = 2.6;
                this._showReport('failed', 'failure', 5);
                // the ship computer announces the loss just after the explosion starts, and replaces the plain game over voice
                this._failedVoicePlayed = false;
                setTimeout(() => {
                    if (this.state !== 'defeat_burst' || !window.AudioMgr) return;
                    this._failedVoicePlayed = true;
                    window._gameoverVoice = window.AudioMgr.playSfx('vo-failed');
                }, 450);
                this.burstTotalTime = 0;
                this.result = 'defeat';
                this.stats.livesRemaining = 0;
                if (Bullets && typeof Bullets.cancelAllBullets === 'function') {
                    Bullets.cancelAllBullets(this.pool);
                } else {
                    this.pool.reset();
                }
                this.resetPlayerBullets();
            root.DuelWeaponSkills?.reset(this);

                // Safety fallback timer: auto-transition to result after 3 seconds regardless of gameState
                const self = this;
                setTimeout(() => {
                    if (self.state === 'defeat_burst' || self.state === 'victory_burst') {
                        self.state = 'result';
                        self.openRecapScreen();
                    }
                }, 3000);
            }
        }


        _cancelBulletsInRadius(x, y, radius) {
            const radSq = radius * radius;
            const bullets = this.pool.bullets;
            const len = this.pool.capacity;
            let cancelled = 0;
            for (let i = 0; i < len; i++) {
                const b = bullets[i];
                if (!b.active) continue;
                const dx = b.x - x;
                const dy = b.y - y;
                if (dx * dx + dy * dy <= radSq) {
                    b.active = false;
                    this.pool.activeCount--;
                    cancelled++;
                    if (Bullets && typeof Bullets.spawnCancelMote === 'function') {
                        Bullets.spawnCancelMote(b.x, b.y);
                    }
                }
            }
            return cancelled;
        }

        _performSkillFSweep(dt) {
            const progress = Math.min(1.0, this.skillFSweepElapsed / this.skillFSweepDuration);
            const playerX = (typeof player !== 'undefined') ? player.x : 640;
            const playerY = (typeof player !== 'undefined') ? player.y : 640;
            const lockedDir = this._lockedSweepDirection || 1;
            const startAngle = lockedDir === 1 ? -Math.PI : 0;
            const sweepAngle = startAngle + (lockedDir === 1 ? Math.PI : -Math.PI) * progress;
            const sweepRadius = 1200;

            const bullets = this.pool.bullets;
            const len = this.pool.capacity;
            for (let i = 0; i < len; i++) {
                const b = bullets[i];
                if (!b.active) continue;
                const dx = b.x - playerX;
                const dy = b.y - playerY;
                const dSq = dx * dx + dy * dy;
                if (dSq > sweepRadius * sweepRadius) continue;

                const bAngle = Math.atan2(dy, dx);
                let angleDiff = Math.abs(bAngle - sweepAngle);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < 0.35) {
                    b.active = false;
                    this.pool.activeCount--;
                    this.stats.skillFBulletsCleared++;
                    if (Bullets && typeof Bullets.spawnCancelMote === 'function') {
                        Bullets.spawnCancelMote(b.x, b.y);
                    }
                }
            }
        }

        triggerSkillF() {
            if (this.state !== 'playing' || this.shiftActive || root._duelIsShiftHeld?.()) return;
            if (this.skillFCooldown > 0 || this.skillFCharging || this.skillFSweepActive) return;
            this.skillFCharging = true;
            this.skillFChargeElapsed = 0;
            this.stats.skillFUses++;
            if (typeof skillFState !== 'undefined') {
                skillFState = 'charging';
            }
            if (typeof skillFChargeStart !== 'undefined') {
                skillFChargeStart = performance.now();
            }
            if (typeof skillFDirection !== 'undefined') {
                skillFDirection = this.skillFDirection;
            }
            if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.startSkillFCharge === 'function') {
                window.AudioMgr.startSkillFCharge();
            }
        }

        updateSkillFDirection(dir) {
            if (this.shiftActive || this.skillFSweepActive) return;
            this.skillFDirection = dir;
            if (typeof skillFDirection !== 'undefined') {
                skillFDirection = dir;
            }
        }

        setSkillFDirection(dir) {
            this.updateSkillFDirection(dir);
        }

        _spawnBossHitSparks(x, y, count) {
            let spawned = 0;
            for (let i = 0; i < 24; i++) {
                const sp = this.bossHitSparks[i];
                if (!sp.active) {
                    sp.active = true;
                    sp.x = x;
                    sp.y = y;
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1.0 + Math.random() * 2.2;
                    sp.vx = Math.cos(angle) * speed;
                    sp.vy = Math.sin(angle) * speed;
                    sp.maxLife = 0.10 + Math.random() * 0.08;
                    sp.life = sp.maxLife;
                    sp.color = window.DuelFX.getPhasePalette(this.attacks.currentAttackId <= 6 ? 1 : this.attacks.currentAttackId <= 13 ? 2 : 3).sucker;
                    spawned++;
                    if (spawned >= count) break;
                }
            }
        }

        // Damage dealt and hits taken are also kept per attack and in 5 second buckets for the ending screen.
        _statBucket() {
            const st = this.stats;
            if (!st.dmgBuckets) st.dmgBuckets = [];
            const attackId = this.attacks ? this.attacks.currentAttackId : 1;
            const idx = Math.max(0, Math.floor(st.timeSec / 5));
            while (st.dmgBuckets.length <= idx) st.dmgBuckets.push({ t: st.dmgBuckets.length * 5, allyDamage: 0, damageTaken: 0, wave: attackId });
            st.dmgBuckets[idx].wave = attackId;
            return st.dmgBuckets[idx];
        }

        _recordDamage(amount) {
            const st = this.stats;
            if (!st.damageByAttack) st.damageByAttack = {};
            const attackId = this.attacks ? this.attacks.currentAttackId : 1;
            st.damageByAttack[attackId] = (st.damageByAttack[attackId] || 0) + amount;
            this._statBucket().allyDamage += amount;
        }

        _recordTaken() {
            this._statBucket().damageTaken += 1;
        }

        triggerSkillA() { return root.DuelWeaponSkills?.cast(this) || false; }

        _damageBoss(amount, hitX, hitY, opts = {}) {
            if (this.state !== 'playing' || this.attacks.hp <= 0) return 0;
            const bossPos = this.bossPos;
            const curPhase = this.attacks.currentAttackId <= 6 ? 1 : this.attacks.currentAttackId <= 13 ? 2 : 3;
            const dmgMult = this.attacks.getOverdueDamageMult?.() || 1;
                    const prevHp = this.attacks.hp;
                    const actualDmg = Math.min(amount * dmgMult, prevHp);
                    this.attacks.hp = Math.max(0, prevHp - actualDmg);
                    this.stats.damageDealt += actualDmg;
                    this._recordDamage(actualDmg);
                    if (this._fxDamageClock <= 0) {
                        if (this._fxDamage.length >= 6) this._fxDamage.shift();
                        this._fxDamage.push({ x: hitX, y: hitY, amount: actualDmg, life: .65 });
                        this._fxDamageClock = .12;
                    } else if (this._fxDamage.length) {
                        this._fxDamage[this._fxDamage.length - 1].amount += actualDmg;
                    }
                    if (opts.source !== 'skillA' || !opts.entity?.boonRecorded) {
                        this.attacks.recordPlayerHit();
                        if (opts.entity) opts.entity.boonRecorded = true;
                    }
                    if (opts.source === 'skillA') this.stats.skillADamage = (this.stats.skillADamage || 0) + actualDmg;
                    if (window.AudioMgr) window.AudioMgr.playSfxAt(opts.heavy ? 'boss-hit-heavy' : 'boss-hit', hitX, hitY, curPhase);

                    const nowMs = performance.now();
                    if (opts.heavy || nowMs - (this._egBodyHitAt || 0) >= 180) {
                        this._egBodyHitAt = nowMs;
                        const hitLen = Math.hypot(opts.vx || 0, opts.vy || -1) || 1;
                        this._bossHitDir = { x: (opts.vx || 0) / hitLen, y: (opts.vy || -1) / hitLen };
                        this._bossHitHeavy = !!opts.heavy;
                        this._bossHitLocal = { x: hitX - bossPos.x, y: hitY - bossPos.y };
                        if (typeof window !== 'undefined') {
                            window._egBodyHitAt = this._egBodyHitAt;
                        }
                    }

                    this.hpBarHitFlash = Math.min(1.0, (this.hpBarHitFlash || 0) + (opts.heavy ? 1.0 : 0.45));
                    if (opts.heavy) this.hpBarHeavyShake = 1.0;
                    this._spawnBossHitSparks(hitX, hitY, opts.heavy ? 4 : 1);

            return actualDmg;
        }

        _updatePlayerBullets(dt, canvasW, canvasH) {
            const bossPos = ((this.state === 'spell_transition' || this.state === 'phase_transition') && this._lockedBossPos)
                ? this._lockedBossPos
                : (this.bossPos || { x: canvasW * 0.5, y: canvasH * 0.18 });
            const curPhase = this.attacks ? (this.attacks.currentAttackId <= 6 ? 1 : (this.attacks.currentAttackId <= 13 ? 2 : 3)) : 1;
            const hb = (typeof window !== 'undefined' && typeof window.getDuelBossHitbox === 'function')
                ? window.getDuelBossHitbox(curPhase, this.bossPhaseMorph)
                : { rx: 78, ry: 62, offsetY: -4 };
            const invuln = (this.state === 'spell_transition' || this.state === 'phase_transition');
            const dmgMult = (this.attacks && typeof this.attacks.getOverdueDamageMult === 'function')
                ? this.attacks.getOverdueDamageMult()
                : 1.0;
            const cx = bossPos.x;
            const cy = bossPos.y + (hb.offsetY || 0);

            for (let i = 0; i < this.playerBulletPool.length; i++) {
                const pb = this.playerBulletPool[i];
                if (!pb.active) continue;

                const prevX = pb.x;
                const prevY = pb.y;
                pb.x += pb.vx * dt * 60.0;
                pb.y += pb.vy * dt * 60.0;

                // Swept segment-vs-ellipse intersection (eliminates tunneling at high speed)
                const pad = pb.radius || 4.0;
                const erx = hb.rx + pad;
                const ery = hb.ry + pad;
                const ax = (prevX - cx) / erx;
                const ay = (prevY - cy) / ery;
                const bx = (pb.x - cx) / erx;
                const by = (pb.y - cy) / ery;
                const sx = bx - ax;
                const sy = by - ay;
                const segLenSq = sx * sx + sy * sy;
                let tHit = 0;
                if (segLenSq > 1e-8) {
                    tHit = Math.max(0, Math.min(1, -(ax * sx + ay * sy) / segLenSq));
                }
                const qx = ax + sx * tHit;
                const qy = ay + sy * tHit;

                if (qx * qx + qy * qy <= 1.0) {
                    const hitX = prevX + (pb.x - prevX) * tHit;
                    const hitY = prevY + (pb.y - prevY) * tHit;
                    if (invuln) {
                        if (window.AudioMgr) window.AudioMgr.playSfxAt('boss-invuln', hitX, hitY);
                        if (this._invulnRipples && this._invulnRipples.length < 18) {
                            this._invulnRipples.push({ x: hitX, y: hitY, life: 0.30, maxLife: 0.30 });
                        }
                        pb.active = false;
                        continue;
                    }

                    this._damageBoss(pb.damage, hitX, hitY, {heavy:pb.isHeavy, vx:pb.vx, vy:pb.vy, source:pb.skillASource ? 'skillA' : 'autoshot', entity:pb.skillASource});
                    if(pb.skillASource){pb.skillASource.hitCount++;window.AudioMgr?.playSfxAt('duel-relic-'+pb.skillASource.id+'-hit',hitX,hitY);}
                    root.DuelWeaponSkills?.impact(this, pb, hitX, hitY);
                    pb.active = false;
                    continue;
                }

                if (pb.y < -40 || pb.x < -40 || pb.x > canvasW + 40 || pb.y > canvasH + 40) {
                    pb.active = false;
                }
            }
        }

        fireAutoShot() {
            if (window._debugSessionActive && window._debugAutoshotOff) return;
            if (this.state !== 'playing' && this.state !== 'spell_transition' && this.state !== 'phase_transition') return;

            const now = performance.now();
            const w = this.selectedWeapon || this.weaponPicker.weapons[0];
            const interval = w.fireInterval || 135;

            if (now - this.lastAutoFireTime < interval) return;
            this.lastAutoFireTime = now;

            const pX = (typeof player !== 'undefined') ? player.x : 640;
            const pY = (typeof player !== 'undefined') ? (player.y - player.height * 0.5) : 640;

            if (typeof window !== 'undefined' && window.AudioMgr) {
                window.AudioMgr.playSfx('autoshot');
            }

            if (w.pattern === 'fan') {
                const num = w.volleyBullets || 5;
                const spread = w.spreadAngle || (Math.PI / 4);
                const start = -spread * 0.5;
                const step = num > 1 ? spread / (num - 1) : 0;
                const base = -Math.PI * 0.5;
                for (let i = 0; i < num; i++) {
                    const ang = base + start + i * step;
                    this.spawnPlayerBullet(
                        pX,
                        pY,
                        Math.cos(ang) * w.speed,
                        Math.sin(ang) * w.speed,
                        w.damagePerBullet,
                        w.id,
                        4.0,
                        false
                    );
                }
            } else if (w.pattern === 'parallel_2') {
                const offset = (w.spacing || 14) * 0.5;
                this.spawnPlayerBullet(pX - offset, pY, 0, -w.speed, w.damagePerBullet, w.id, 4.0, false);
                this.spawnPlayerBullet(pX + offset, pY, 0, -w.speed, w.damagePerBullet, w.id, 4.0, false);
            } else if (w.pattern === 'fan_3') {
                const num = 3;
                const spread = w.spreadAngle || ((18 * Math.PI) / 180);
                const start = -spread * 0.5;
                const step = spread * 0.5;
                const base = -Math.PI * 0.5;
                for (let i = 0; i < num; i++) {
                    const ang = base + start + i * step;
                    this.spawnPlayerBullet(
                        pX,
                        pY,
                        Math.cos(ang) * w.speed,
                        Math.sin(ang) * w.speed,
                        w.damagePerBullet,
                        w.id,
                        4.5,
                        false
                    );
                }
            } else if (w.pattern === 'parallel_4') {
                const halfW = (w.spreadWidth || 64) * 0.5;
                const offsets = [-halfW, -halfW / 3, halfW / 3, halfW];
                for (let i = 0; i < 4; i++) {
                    this.spawnPlayerBullet(
                        pX + offsets[i],
                        pY,
                        0,
                        -w.speed,
                        w.damagePerBullet,
                        w.id,
                        3.5,
                        false
                    );
                }
            } else if (w.pattern === 'heavy_cycle') {
                this.lanceVolleyCounter++;
                const isHeavy = this.lanceVolleyCounter % 8 === 0;
                const dmg = isHeavy ? w.heavyDamage : w.lightDamage;
                const rad = isHeavy ? 8.0 : 4.0;
                this.spawnPlayerBullet(
                    pX,
                    pY,
                    0,
                    -w.speed * (isHeavy ? 1.15 : 1.0),
                    dmg,
                    w.id,
                    rad,
                    isHeavy
                );
            }
        }

        triggerShift() {
            if (this.state !== 'playing') return;
            if (this.shiftActive) return;
            if (this.shiftCooldownRemaining > 0) return;

            this.shiftActive = true;
            this.shiftElapsed = 0;
            this.stats.shiftCount++;
            this.stats.shiftsUsed = this.stats.shiftCount;
            this.stats.timeline.push({ time: this.stats.timeSec, attackId: this.attacks ? this.attacks.currentAttackId : 1, type: 'shift' });

            if (typeof skillShiftChargeStart !== 'undefined') {
                skillShiftChargeStart = performance.now();
            }
            if (typeof window !== 'undefined' && window.AudioMgr) {
                window.AudioMgr.enterTimeDomain();
                window.AudioMgr.playSfx('shift-hold');
            }
        }

        releaseShift() {
            if (!this.shiftActive) return;
            this.shiftActive = false;
            const heldRatio = Math.max(0, Math.min(1, this.shiftElapsed / SHIFT_MAX_DURATION_SEC));
            this.shiftCooldownRemaining = SHIFT_COOLDOWN_MIN_SEC + (SHIFT_COOLDOWN_SEC - SHIFT_COOLDOWN_MIN_SEC) * heldRatio;
            // Iron Body lingers briefly so a bullet already overlapping the ship at release does not land at once
            this.recoveryRemaining = Math.max(this.recoveryRemaining, 0.35);
            if (typeof skillShiftChargeStart !== 'undefined') {
                skillShiftChargeStart = 0;
            }
            if (typeof window !== 'undefined') {
                const px = typeof player !== 'undefined' ? player.x : 640;
                const py = typeof player !== 'undefined' ? player.y : 660;
                const radius = typeof canvas !== 'undefined' ? Math.min(canvas.width, canvas.height) * 0.45 : 324;
                this._cancelBulletsInRadius(px, py, radius);
                window._domainCloseBursts ||= [];
                window._domainCloseBursts.push({ x: px, y: py, spawnAt: performance.now(), duration: 300 });
                if (window.AudioMgr) {
                    window.AudioMgr.exitTimeDomain();
                }
            }
        }

        shiftTeleport(direction) {
            if (!this.shiftActive) return;
            if (typeof player === 'undefined' || typeof canvas === 'undefined') return;
            const heldRatio = Math.max(0, Math.min(1, this.shiftElapsed / SHIFT_MAX_DURATION_SEC));
            const distance = canvas.width * (0.08 + heldRatio * 0.27);
            const delta = direction === 'left' ? -distance : distance;

            if (this.ghostTrail.length >= 3) this.ghostTrail.shift();
            this.ghostTrail.push({ x: player.x, y: player.y, alpha: 0.70 });

            player.x = Math.max(player.width * 0.5, Math.min(canvas.width - player.width * 0.5, player.x + delta));

            if (typeof window !== 'undefined') {
                if (!window._teleportBursts) window._teleportBursts = [];
                window._teleportBursts.push({ x: player.x, y: player.y, spawnAt: performance.now(), duration: 550 });
            }
            if (typeof createParticles === 'function' && window._fxOpts?.particles !== false) {
                createParticles(player.x, player.y, 14, '#8cbcfc', 2, 7);
            }
            if (typeof _setShake === 'function' && window._screenShakeEnabled !== false && !window._fxOpts?.reducedMotion) _setShake(10, 200);
            if (window.AudioMgr) window.AudioMgr.playSfx('shift-teleport');
        }

        renderCombat(ctx) {
            if (!this.active) return;
            if (this.state !== 'playing' && this.state !== 'spell_transition' && this.state !== 'phase_transition' && this.state !== 'pre_battle' && this.state !== 'victory_burst' && this.state !== 'defeat_burst') return;

            const canvasW = (typeof canvas !== 'undefined') ? canvas.width : 1280;
            const canvasH = (typeof canvas !== 'undefined') ? canvas.height : 720;

            let bossPos = this.bossPos
                ? { x: this.bossPos.x, y: this.bossPos.y }
                : { x: canvasW * 0.5, y: canvasH * 0.18 };
            if ((this.state === 'spell_transition' || this.state === 'phase_transition') && this._lockedBossPos) {
                bossPos = { x: this._lockedBossPos.x, y: this._lockedBossPos.y };
            } else if (this.state === 'playing') {
                this._lastBossPos = { x: bossPos.x, y: bossPos.y };
            }

            // Boss slide down during pre-battle
            let drawBossPos = bossPos;
            if (this.state === 'pre_battle') {
                const prog = Math.min(1.0, this.preBattleElapsed / 2.0);
                const startY = -120;
                const endY = canvasH * 0.18;
                drawBossPos = { x: bossPos.x, y: startY + (endY - startY) * prog };
            }

            const cinematic = this.state === 'phase_transition' || this.state === 'spell_transition';
            if (cinematic) window.DuelCinematics.transitionWorld(ctx, this, canvasW, canvasH, drawBossPos, false);
            window.DuelCinematics.ambientPlayer(ctx, this, canvasW, canvasH);

            // Ground hazards share the same geometry as collision tests.
            root.DuelWeaponSkills?.render(ctx, this);
            this._renderSlowZones(ctx);
            this._renderTelegraphs(ctx);
            if (this.attacks && typeof this.attacks.renderSkills === 'function') {
                this.attacks.renderSkills(ctx, drawBossPos);
            }
            if (this.attacks) {
                if (this.attacks.thoughtCube && this.attacks.thoughtCube.active) {
                    this.attacks.thoughtCube.render(ctx);
                }
                if (this.attacks.thoughtCube2 && this.attacks.thoughtCube2.active) {
                    this.attacks.thoughtCube2.render(ctx);
                }
            }

            // Boss body, aura, face, and eyes always rendered on top with guaranteed alpha 1.0
            // The opening cutscene draws the boss itself as it emerges from the portal
            if (this.state !== 'pre_battle') {
                ctx.save();
                ctx.globalAlpha = 1.0;
                const cinematic = this.state === 'phase_transition' || this.state === 'spell_transition';
                if (cinematic) this._renderTransitionEnergy(ctx, drawBossPos, false);
                if (this.state === 'victory_burst') window.DuelCinematics.bossDeath(ctx, this, canvasW, canvasH, drawBossPos);
                else this._renderBoss(ctx, drawBossPos);
                if (this.state === 'playing') window.DuelCinematics.skillCast(ctx, this, canvasW, canvasH, drawBossPos);
                if (cinematic) {
                    this._renderTransitionEnergy(ctx, drawBossPos, true);
                    window.DuelCinematics.transitionWorld(ctx, this, canvasW, canvasH, drawBossPos, true);
                }
                ctx.restore();
            }

            // Invulnerability shield ripples when bullets strike boss during transitions
            if (this._invulnRipples && this._invulnRipples.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (let ri = 0; ri < this._invulnRipples.length; ri++) {
                    const rp = this._invulnRipples[ri];
                    const u = 1.0 - Math.max(0, rp.life / rp.maxLife);
                    ctx.globalAlpha = (1.0 - u) * 0.72;
                    ctx.strokeStyle = window.DuelFX.getPhasePalette(this.attacks.currentAttackId <= 6 ? 1 : this.attacks.currentAttackId <= 13 ? 2 : 3).rim;
                    ctx.lineWidth = 2.2 * (1.0 - u) + 0.6;
                    ctx.beginPath();
                    ctx.arc(rp.x, rp.y, 6 + u * 26, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            window.DuelCinematics.damageNumbers(ctx, this);
            // Player projectiles sit below hostile projectiles.
            this._renderPlayerBullets(ctx);

            // Lasers and enemy bullets
            const gfxLvl = (typeof _gfxLevel !== 'undefined') ? _gfxLevel : 0;
            Bullets.renderLasersCanvas(ctx, this.attacks.lasers, gfxLvl);
            Bullets.renderBulletsCanvas(ctx, this.pool, gfxLvl);

            // Bullet cancel motes
            if (Bullets && typeof Bullets.renderCancelMotesCanvas === 'function') {
                Bullets.renderCancelMotesCanvas(ctx, gfxLvl);
            }

            // Short engine glows follow moving ships and expire in the combat update.
            if (window._fxOpts?.particles !== false && this._engineTrail && this._engineTrail.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (let ti = 0; ti < this._engineTrail.length; ti++) {
                    const pt = this._engineTrail[ti];
                    const a = Math.max(0, pt.life / pt.maxLife);
                    ctx.globalAlpha = a * 0.35;
                    ctx.fillStyle = '#38e8ff';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 2.5 + a * 4.0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // Shield shatter burst (0.4s) when shield breaks, then completely gone
            if (this._shieldBreakAnim > 0 && typeof player !== 'undefined') {
                const bp = 1.0 - (this._shieldBreakAnim / 0.40);
                const baseR = (player.width || 36) * (1.0 + bp * 0.65);
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1.0 - bp);
                ctx.strokeStyle = '#7ff4ff';
                ctx.lineWidth = 2.5 * (1.0 - bp) + 0.5;
                for (let seg = 0; seg < 6; seg++) {
                    const a0 = (seg / 6) * Math.PI * 2 + bp * 0.5;
                    ctx.beginPath();
                    ctx.arc(player.x, player.y, baseR, a0, a0 + 0.55);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Shield restore smooth expand halo (0.35s) when shield returns
            if (this._shieldRestoreAnim > 0 && this.playerShieldActive && typeof player !== 'undefined') {
                const rp = 1.0 - (this._shieldRestoreAnim / 0.35);
                const rCur = (player.width || 36) * (0.45 + 0.55 * (1 - Math.pow(1 - rp, 3)));
                ctx.save();
                ctx.globalAlpha = (1.0 - rp) * 0.85;
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3.0;
                ctx.beginPath();
                ctx.arc(player.x, player.y, rCur, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Skill F charging directional aim arc & arrow so player clearly sees left/right sweep side
            if (this.skillFCharging && typeof player !== 'undefined') {
                const aimDir = this.skillFDirection || 1;
                const cProg = Math.min(1.0, this.skillFChargeElapsed / Math.max(0.1, this.skillFChargeDuration));
                ctx.save();
                ctx.translate(player.x, player.y);
                ctx.strokeStyle = 'rgba(242, 217, 139, ' + (0.45 + 0.45 * cProg) + ')';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                if (aimDir === 1) {
                    ctx.arc(0, 0, 48 + cProg * 12, -Math.PI * 0.85, -Math.PI * 0.15);
                } else {
                    ctx.arc(0, 0, 48 + cProg * 12, -Math.PI * 0.85, -Math.PI * 0.15);
                }
                ctx.stroke();
                const ax = aimDir * (56 + cProg * 12);
                ctx.fillStyle = '#f2d98b';
                ctx.beginPath();
                ctx.moveTo(ax + aimDir * 12, -8);
                ctx.lineTo(ax - aimDir * 2, -16);
                ctx.lineTo(ax - aimDir * 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Hitbox dot (white with red border) at ship center
            if (this.playerHitboxVisible && typeof player !== 'undefined') {
                ctx.save();
                ctx.beginPath();
                ctx.arc(player.x, player.y, 4.0, 0, Math.PI * 2);
                ctx.fillStyle = T.crimson;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(player.x, player.y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = T.white;
                ctx.fill();
                ctx.restore();
            }

            // Shift Domain and Teleport ghost preview
            if (this.shiftActive && typeof player !== 'undefined') {
                ctx.save();
                const maxTeleport = Math.min(canvasW * 0.15, 192);

                // Domain aura
                ctx.strokeStyle = T.electric;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.45;
                ctx.beginPath();
                ctx.arc(player.x, player.y, 60, 0, Math.PI * 2);
                ctx.stroke();

                // Teleport afterimage ghost preview
                ctx.fillStyle = T.electricGlow;
                ctx.globalAlpha = 0.35;
                ctx.beginPath();
                ctx.arc(player.x - maxTeleport, player.y, player.hitRadius || 5.75, 0, Math.PI * 2);
                ctx.arc(player.x + maxTeleport, player.y, player.hitRadius || 5.75, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Teleport afterimage ghost trails
            for (let i = 0; i < this.ghostTrail.length; i++) {
                const gt = this.ghostTrail[i];
                ctx.save();
                ctx.globalAlpha = Math.max(0, gt.alpha);
                ctx.strokeStyle = T.electric;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(gt.x, gt.y, 16, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Boss hit sparks (pool 24)
            ctx.save();
            ctx.fillStyle = (T && T.playerBullet) ? T.playerBullet.spark : T.electric;
            for (let i = 0; i < 24; i++) {
                const sp = this.bossHitSparks[i];
                if (!sp.active) continue;
                ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
                ctx.fillStyle = sp.color || '#c4f9ff';
                ctx.beginPath(); ctx.arc(sp.x, sp.y, 1.8, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();

            // Hit vignette overlay (red border on damage)
            if (this.hitVignetteRemaining > 0) {
                ctx.save();
                const vGrad = ctx.createRadialGradient(canvasW * 0.5, canvasH * 0.5, canvasH * 0.35, canvasW * 0.5, canvasH * 0.5, canvasW * 0.68);
                vGrad.addColorStop(0, T.transparent);
                vGrad.addColorStop(1, T.hitVignette);
                ctx.fillStyle = vGrad;
                ctx.fillRect(0, 0, canvasW, canvasH);
                ctx.restore();
            }

            // Subtle transition veil (proportional alpha <= 0.14, never darkens live combat)
            if (this.transitionDarken > 0 && this.state === 'spell_transition') {
                ctx.save();
                ctx.fillStyle = 'rgba(3, 7, 20, ' + Math.min(0.14, this.transitionDarken) + ')';
                ctx.fillRect(0, 0, canvasW, canvasH);
                ctx.restore();
            }


            // Defeat screen darken overlay: smooth fade to black over 1.2s
            if (this.state === 'defeat_burst') {
                ctx.save();
                const dProg = Math.min(1.0, Math.max(0, 1.0 - (this.defeatBurstTime / 1.2)));
                ctx.fillStyle = 'rgba(2, 6, 18, ' + (dProg * 0.90) + ')';
                ctx.fillRect(0, 0, canvasW, canvasH);
                ctx.restore();
            }

            window.DuelCinematics.ending(ctx, canvasW, canvasH, this);
        }

        _renderTransitionEnergy(ctx, pos, foreground) {
            const t = this.transitionElapsed;
            const phase = this.state === 'phase_transition';
            const fireAt = phase ? 2.6 : 1;
            const gather = smoothRelease((t - (phase ? 0.12 : 0.08)) / (fireAt - 0.16));
            const since = t - fireAt;
            const pulse = Math.max(0, 1 - since / (phase ? 1.35 : 0.34));
            const fx = window._fxOpts || {};
            const low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
            const color = phase ? (this.transitionInfo.phase === 3 ? '#ffb97e' : '#c795ff') : '#81e9ff';
            ctx.save();
            ctx.translate(pos.x, pos.y);
            if (!foreground && since < 0) {
                const ring = this._transitionRune || (this._transitionRune = Theme.bakeBossRuneRing(100));
                for (let i = 0; i < (low ? 2 : 3); i++) {
                    const r = 208 - gather * 128 + i * 31;
                    ctx.save();
                    ctx.rotate(t * (i % 2 ? -0.8 : 0.65) + i * 1.4);
                    ctx.globalAlpha = gather * (0.48 - i * 0.10);
                    ctx.drawImage(ring, -r, -r * 0.62, r * 2, r * 1.24);
                    ctx.restore();
                }
                if (fx.particles !== false) {
                    ctx.strokeStyle = color; ctx.lineWidth = 1.6;
                    for (let i = 0; i < (low ? 10 : 36); i++) {
                        const a = i * 2.39996 + t * 0.63;
                        const u = (i * 0.619 + t * 1.5) % 1;
                        const r = 26 + (1 - u) * (240 - gather * 100);
                        ctx.globalAlpha = gather * Math.sin(Math.PI * u) * 0.82;
                        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                        ctx.lineTo(Math.cos(a) * (r + 8 + u * 24), Math.sin(a) * (r + 8 + u * 24)); ctx.stroke();
                    }
                }
            } else if (foreground && since >= 0) {
                ctx.strokeStyle = color;
                for (let i = 0; i < (low ? 2 : 4); i++) {
                    const wave = Math.max(0, since - i * (phase ? 0.09 : 0.041));
                    if (!wave || pulse <= 0) continue;
                    ctx.globalAlpha = pulse ** 2 * (0.88 - i * 0.14);
                    ctx.lineWidth = 1 + 4 * pulse;
                    ctx.beginPath(); ctx.ellipse(0, 0, 35 + wave * 450, 18 + wave * 215, 0, 0, Math.PI * 2); ctx.stroke();
                }
                if (phase && fx.particles !== false && !fx.reducedMotion) for (const sh of this._evolutionShards) {
                    ctx.save(); ctx.translate(sh.x - pos.x, sh.y - pos.y); ctx.rotate(sh.rot);
                    ctx.globalAlpha = sh.life / sh.maxLife; ctx.fillStyle = '#35203f';
                    ctx.lineWidth = 1; ctx.strokeStyle = color;
                    ctx.beginPath(); ctx.moveTo(sh.size, 0); ctx.lineTo(-sh.size * 0.65, 3);
                    ctx.lineTo(-sh.size * 0.3, -sh.size * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
                }
                if (fx.glow !== false && !fx.reducedMotion && since < 0.14) {
                    ctx.globalAlpha = (1 - since / 0.14) ** 2 * 0.62;
                    ctx.fillStyle = '#fff2e1'; ctx.beginPath();
                    ctx.ellipse(0, 0, 58 + since * 450, 33 + since * 190, 0, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }

        _renderBoss(ctx, pos, opening = null, auraContext = ctx) {
            const gfxLvl = (typeof _gfxLevel !== 'undefined') ? _gfxLevel : 0;
            const now = opening ? 0 : this.attacks.elapsed;

            // Inward converging charge wave at climax start (0.6s)
            if (gfxLvl < 2 && this.climaxChargeWave > 0) {
                const u = 1.0 - (this.climaxChargeWave / 0.6);
                const curR = 120 * (1.0 - u) + 16;
                ctx.save();
                ctx.strokeStyle = T.electricGlow;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, curR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            const bossDrawX = pos.x;
            this._prevBossX = pos.x;

            if (!this.bossEntity) {
                this.bossEntity = {
                    type: 'egregor',
                    x: bossDrawX,
                    y: pos.y,
                    size: 118,
                    maxHp: this.attacks.maxHp,
                    hp: this.attacks.hp,
                    _isDuelBoss: true,
                    _rageStacks: this.attacks.rageStacks || 0,
                    _phase: this.attacks.currentAttackId <= 6 ? 1 : (this.attacks.currentAttackId <= 13 ? 2 : 3),
                    _eyeAngles: [0, 0, 0, 0],
                    _egBodyHitAt: this._egBodyHitAt || -1000,
                    _noHpBar: true,
                    _egSpawnAt: performance.now(),
                    _eyeBlinkTimers: new Float32Array(4),
                    _eyeNextBlinks: new Float32Array([2000, 2800, 1500, 3500])
                };
            } else {
                this.bossEntity.x = bossDrawX;
                this.bossEntity.y = pos.y;
                this.bossEntity.size = 118;
                this.bossEntity.maxHp = this.attacks.maxHp;
                this.bossEntity.hp = this.attacks.hp;
                this.bossEntity._isDuelBoss = true;
                this.bossEntity._rageStacks = this.attacks.rageStacks || 0;
                this.bossEntity._phase = this.attacks.currentAttackId <= 6 ? 1 : (this.attacks.currentAttackId <= 13 ? 2 : 3);
                this.bossEntity._egBodyHitAt = this._egBodyHitAt || -1000;
            }

            ctx.save();
            ctx.globalAlpha = 1.0;
            const targetPhase = opening ? 1 : (this.attacks.currentAttackId <= 6 ? 1 : (this.attacks.currentAttackId <= 13 ? 2 : 3));
            let trembleX = 0, trembleY = 0, contractScale = 1, collapseProgress = 0, chargeGlow = 0;
            if (this.state === 'phase_transition' && this.transitionInfo) {
                const t = this.transitionElapsed;
                const build = smoothRelease((t - 0.12) / 2.48);
                contractScale = 1 - 0.30 * build * (1 - smoothRelease((t - 3.3) / 1.1));
                chargeGlow = build * (1 - smoothRelease((t - 2.6) / 0.9));
                if (!window._fxOpts?.reducedMotion) {
                    const jitter = 4 * build * (1 - smoothRelease((t - 2.6) / 0.6));
                    trembleX = Math.sin(t * 64) * jitter;
                    trembleY = Math.sin(t * 51) * jitter * 0.55;
                }
            } else if (this.state === 'spell_transition') {
                const t = this.transitionElapsed;
                const build = smoothRelease((t - 0.08) / 0.92);
                const release = smoothRelease((t - 1) / 0.3);
                contractScale = 1 - 0.16 * build * (1 - release);
                chargeGlow = 0.85 * build * (1 - release);
            } else if (this.state === 'victory_burst') {
                collapseProgress = Math.max(0, Math.min(1, (this.burstTotalTime || 0) / 2.2));
                if (!window._fxOpts?.reducedMotion) {
                    trembleX = Math.sin(performance.now() * 0.08) * (1 - collapseProgress) * 9;
                    trembleY = Math.cos(performance.now() * 0.07) * (1 - collapseProgress) * 7;
                }
            }

            let openingGesture = null;
            if (opening) {
                contractScale = opening.scale;
                chargeGlow = opening.charge;
                const state = this._openingGestureState;
                if (state && opening.roar > .001 && window.DuelGestures) {
                    state.t = Math.max(0, opening.time - 4.75);
                    state.blend = opening.roar;
                    state.reducedMotion = !!window._fxOpts?.reducedMotion;
                    openingGesture = window.DuelGestures.sample(state, opening.time, window.DUEL_GESTURES_DATA);
                }
            }

            if (typeof window !== 'undefined' && typeof window.drawDuelEgregor === 'function') {
                const _hitAge = performance.now() - (this._egBodyHitAt || -1000);
                const _hitFlash = _hitAge >= 0 && _hitAge < 140 ? (1.0 - _hitAge / 140) : 0;
                const _px = (typeof player !== 'undefined' && player) ? player.x : bossDrawX;
                const _py = (typeof player !== 'undefined' && player) ? player.y : (pos.y + 360);
                window.drawDuelEgregor(ctx, bossDrawX + trembleX, pos.y + trembleY, {
                    size: 118,
                    time: opening?.frozen ? 4.67 :
                        (this.state === 'spell_transition' && this._layerFreeze > 0 ? this._layerFreezeAt : undefined),
                    phase: targetPhase,
                    phaseMorph: opening ? 0 : this.bossPhaseMorph,
                    auraStrength: opening ? 0.59 : 1,
                    auraContext,
                    eyeSamples: this._bossEyeSamples,
                    playerX: _px,
                    playerY: _py,
                    hitFlash: _hitFlash * (this._bossHitHeavy ? 1 : 0.5),
                    hitDir: this._bossHitDir,
                    bossMotion: this.bossMotion,
                    gesture: openingGesture || (typeof window !== "undefined" && window.DuelGestures && typeof window.DuelGestures.sample === "function" && this.bossGestureState)
                        ? window.DuelGestures.sample(this.bossGestureState, now, window.DUEL_GESTURES_DATA) : null,
                    hitLocal: this._bossHitLocal,
                    hitResponse: _hitFlash,
                    hitHeavy: this._bossHitHeavy,
                    cue: opening && opening.roar > .001 ? { wind: 0, fire: opening.roar, dirX: 0, dirY: 1 } :
                        this.state === 'playing' && this.attacks.poseCue && (this.attacks.poseCue.wind > 0.001 || this.attacks.poseCue.fire > 0.001) ? this.attacks.poseCue : null,
                    release: this.state === 'playing' ? 0 :
                        (this.state === 'spell_transition' && this.transitionElapsed >= this.transitionDuration - 0.3
                            ? Math.max(0, 1 - (this.transitionElapsed - 1) / 0.3) : 0),
                    hitAt: this._egBodyHitAt || -1000,
                    trembleX: trembleX,
                    trembleY: trembleY,
                    contractScale: contractScale,
                    collapseProgress: collapseProgress,
                    chargeGlow: chargeGlow,
                    spellFlicker: this.state === 'spell_transition' ? Math.min(1, this.transitionElapsed / Math.max(0.1, this.transitionDuration)) : 0,
                    eyeBlinkTimers: this.bossEntity._eyeBlinkTimers,
                    eyeNextBlinks: this.bossEntity._eyeNextBlinks
                });
            } else if (typeof _drawEgregor === 'function') {
                _drawEgregor(this.bossEntity);
            } else {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
                ctx.fillStyle = T.bgPanel;
                ctx.fill();
            }
            ctx.restore();
        }

        _renderTelegraphs(ctx) {
            const tgs = this.attacks.telegraphs;
            if (!tgs || tgs.length === 0) return;
            const nowMs = performance.now();
            ctx.save();
            for (let i = 0; i < tgs.length; i++) {
                const tg = tgs[i];
                const progress = Math.min(1.0, tg.elapsed / Math.max(0.05, tg.duration));
                if (typeof _drawDangerZone === 'function') {
                    _drawDangerZone('circle', tg.x, tg.y, tg.radius || 52, progress, 0.75, nowMs, 0, 0, Math.PI * 2, false, false);
                } else {
                    ctx.strokeStyle = 'rgba(255, 70, 49, ' + (0.45 + progress * 0.4) + ')';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.arc(tg.x, tg.y, (tg.radius || 52) * (1.0 - progress * 0.35), 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        _renderSlowZones(ctx) {
            const zones = this.attacks.slowZones;
            if (!zones || zones.length === 0) return;
            const now = performance.now();

            const phase = this.attacks.currentAttackId <= 6 ? 1 : this.attacks.currentAttackId <= 13 ? 2 : 3;
            const palette = window.DuelFX.getPhasePalette(phase);
            if ((!this._slowZoneSprite || this._slowZonePhase !== phase) && typeof document !== 'undefined') {
                const c = document.createElement('canvas');
                c.width = 220;
                c.height = 220;
                const g = c.getContext('2d');
                const rg = g.createRadialGradient(110, 110, 10, 110, 110, 104);
                rg.addColorStop(0, palette.dark);
                rg.addColorStop(0.50, palette.glow + '38');
                rg.addColorStop(0.82, palette.rim + '24');
                rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
                g.fillStyle = rg;
                g.fillRect(0, 0, 220, 220);
                for (let k = 0; k < 3; k++) {
                    g.strokeStyle = (k % 2 === 0 ? palette.rim : palette.sucker) + '88';
                    g.lineWidth = 1.6;
                    g.beginPath();
                    g.arc(110, 110, 28 + k * 24, k * 1.2, k * 1.2 + Math.PI * 1.3);
                    g.stroke();
                }
                this._slowZoneSprite = c; this._slowZonePhase = phase;
            }

            ctx.save();
            for (let i = 0; i < zones.length; i++) {
                const sz = zones[i];
                const cx = sz.x + sz.w * 0.5;
                const cy = sz.y + sz.h * 0.5;
                const r = sz.w * 0.5;
                const age = sz.age || 0;
                const maxAge = sz.maxAge || 50.0;
                const lifeAlpha = Math.min(Math.min(1.0, age / 0.8), Math.min(1.0, Math.max(0, (maxAge - age) / 0.8)));
                if (lifeAlpha <= 0.01) continue;

                ctx.save();
                ctx.globalAlpha = lifeAlpha;

                if (this._slowZoneSprite) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(now * 0.0012 * (i % 2 === 0 ? 1 : -1));
                    const d = r * 1.15;
                    ctx.drawImage(this._slowZoneSprite, -d, -d, d * 2, d * 2);
                    ctx.restore();
                }

                const fLen = 96 * lifeAlpha;
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'rgba(170, 72, 255, 0.78)';
                ctx.lineWidth = 6.0;
                ctx.beginPath();
                for (let seg = 0; seg <= 8; seg++) {
                    const ft = seg / 8;
                    const fy = cy - fLen * 0.5 + ft * fLen;
                    const fx = cx + Math.sin(now * 0.016 + seg * 1.8) * 3.5 * Math.sin(ft * Math.PI);
                    if (seg === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
                }
                ctx.stroke();

                ctx.strokeStyle = '#6cf4ff';
                ctx.lineWidth = 2.0;
                ctx.stroke();

                ctx.fillStyle = '#bcebff';
                for (let m = 0; m < 5; m++) {
                    const mAng = (m / 5) * Math.PI * 2 + now * 0.002;
                    const mPhase = (now * 0.0008 + m * 0.2) % 1.0;
                    const mDist = r * (1.0 - mPhase * 0.82);
                    const mx = cx + Math.cos(mAng + mPhase * 2.2) * mDist;
                    const my = cy + Math.sin(mAng + mPhase * 2.2) * mDist;
                    ctx.beginPath();
                    ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (typeof player !== 'undefined' && Math.hypot(player.x - cx, player.y - cy) <= r) {
                    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(player.x, player.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                ctx.restore();
            }
            ctx.restore();
        }

        _renderPlayerBullets(ctx) {
            ctx.save();
            const pb = (T && T.playerBullet) ? T.playerBullet : ((Theme && Theme.DUEL_THEME) ? Theme.DUEL_THEME.playerBullet : null);
            if (!pb) {
                ctx.restore();
                return;
            }

            for (let i = 0; i < this.playerBulletPool.length; i++) {
                const b = this.playerBulletPool[i];
                if (!b.active) continue;

                const wId = b.weaponId;
                const angle = Math.atan2(b.vy, b.vx);

                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(angle + Math.PI * 0.5);

                const sprite = (UI && typeof UI.getWeaponBulletSprite === 'function') ? UI.getWeaponBulletSprite(wId, b.isHeavy) : null;
                if (sprite) {
                    // Subtle luminous energy trail behind projectile
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = b.isHeavy ? 0.45 : 0.28;
                    ctx.fillStyle = pb.trail || '#00e5ff';
                    ctx.beginPath(); ctx.ellipse(0, 14, b.isHeavy ? 3.0 : 1.8, b.isHeavy ? 11 : 7, 0, 0, Math.PI * 2); ctx.fill();
                    // Additive PNG bullet sprite with gentle brightness pulse
                    const pulse = 0.86 + 0.14 * Math.sin(performance.now() * 0.02 + i);
                    ctx.globalAlpha = pulse;
                    ctx.drawImage(sprite, -sprite.width * 0.5, -sprite.height * 0.5);
                    ctx.restore();
                    continue;
                }

                if (wId === 'sword') {
                    // Celestial Blade: curved blade shape with cold silver and cyan styling
                    ctx.globalAlpha = 0.65;
                    ctx.fillStyle = pb.body;
                    ctx.strokeStyle = pb.halo;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -14);
                    ctx.quadraticCurveTo(5, -4, 3, 10);
                    ctx.lineTo(0, 14);
                    ctx.quadraticCurveTo(0, 0, -3, 10);
                    ctx.quadraticCurveTo(-5, -4, 0, -14);
                    ctx.fill();
                    ctx.stroke();

                    // White core spine
                    ctx.fillStyle = pb.core;
                    ctx.beginPath();
                    ctx.moveTo(0, -12);
                    ctx.quadraticCurveTo(2, -2, 1, 8);
                    ctx.lineTo(0, 10);
                    ctx.quadraticCurveTo(-2, -2, 0, -12);
                    ctx.fill();
                } else if (wId === 'spear') {
                    // Void Piercer: long single spearhead with trailing needle
                    ctx.globalAlpha = 0.70;
                    ctx.fillStyle = pb.body;
                    ctx.strokeStyle = pb.halo;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -20);
                    ctx.lineTo(4, -8);
                    ctx.lineTo(1.5, 18);
                    ctx.lineTo(-1.5, 18);
                    ctx.lineTo(-4, -8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // White core needle
                    ctx.fillStyle = pb.core;
                    ctx.beginPath();
                    ctx.moveTo(0, -19);
                    ctx.lineTo(1.5, -7);
                    ctx.lineTo(0.5, 16);
                    ctx.lineTo(-0.5, 16);
                    ctx.lineTo(-1.5, -7);
                    ctx.closePath();
                    ctx.fill();
                } else if (wId === 'halberd') {
                    // Eclipse Cleaver: sweeping crescent axe arc
                    ctx.globalAlpha = 0.65;
                    ctx.fillStyle = pb.body;
                    ctx.strokeStyle = pb.halo;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(0, -4, 14, -Math.PI * 0.8, -Math.PI * 0.2);
                    ctx.quadraticCurveTo(12, 12, 0, 14);
                    ctx.quadraticCurveTo(-12, 12, -10, -4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // White crescent core
                    ctx.fillStyle = pb.core;
                    ctx.beginPath();
                    ctx.arc(0, -4, 12, -Math.PI * 0.75, -Math.PI * 0.25);
                    ctx.lineTo(0, 8);
                    ctx.closePath();
                    ctx.fill();
                } else if (wId === 'dagger_array') {
                    // Phantom Blades: flying dagger with sheen
                    ctx.globalAlpha = 0.65;
                    ctx.fillStyle = pb.body;
                    ctx.strokeStyle = pb.halo;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -12);
                    ctx.lineTo(3.5, -2);
                    ctx.lineTo(1.5, 10);
                    ctx.lineTo(0, 12);
                    ctx.lineTo(-1.5, 10);
                    ctx.lineTo(-3.5, -2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // White blade spine
                    ctx.fillStyle = pb.core;
                    ctx.beginPath();
                    ctx.moveTo(0, -10);
                    ctx.lineTo(1.5, -2);
                    ctx.lineTo(0, 8);
                    ctx.lineTo(-1.5, -2);
                    ctx.closePath();
                    ctx.fill();
                } else if (wId === 'heavy_lance') {
                    // Titan Greatlance: large heavy lance tip with shockwave aura
                    const isH = b.isHeavy;
                    ctx.globalAlpha = isH ? 0.70 : 0.60;

                    if (isH) {
                        ctx.strokeStyle = pb.glow;
                        ctx.lineWidth = 1.8;
                        ctx.beginPath();
                        ctx.arc(0, 0, 16, 0, Math.PI * 2);
                        ctx.stroke();
                    }

                    ctx.fillStyle = isH ? pb.body : pb.trail;
                    ctx.strokeStyle = pb.halo;
                    ctx.lineWidth = 1.5;
                    const len = isH ? 20 : 14;
                    const w = isH ? 6 : 4;
                    ctx.beginPath();
                    ctx.moveTo(0, -len);
                    ctx.lineTo(w, -2);
                    ctx.lineTo(w * 0.5, len);
                    ctx.lineTo(-w * 0.5, len);
                    ctx.lineTo(-w, -2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // White core spike
                    ctx.fillStyle = pb.core;
                    ctx.beginPath();
                    ctx.moveTo(0, -len + 3);
                    ctx.lineTo(w * 0.4, -2);
                    ctx.lineTo(0, len - 2);
                    ctx.lineTo(-w * 0.4, -2);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.globalAlpha = 0.60;
                    ctx.fillStyle = pb.halo;
                    ctx.beginPath();
                    ctx.arc(0, 0, 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
            ctx.restore();
        }

        _renderMatchHUD(ctx, canvasW, canvasH, openingFill = null) {
            const opening = openingFill !== null;
            const def = Attacks.ATTACK_DEFS[opening ? 1 : this.attacks.currentAttackId];
            let hudPhase = def ? def.phase : 1;
            if (this.state === 'phase_transition' && this.transitionInfo) {
                const nextP = this.transitionInfo.phase || 2;
                if (this.transitionElapsed >= (nextP === 3 ? 4.0 : 3.2)) hudPhase = nextP;
            }
            UI.renderHUD(ctx, canvasW, canvasH, {
                bossName: (function () { const isVi = typeof window !== 'undefined' && window._lang === 'vi'; if (hudPhase === 3) return isVi ? 'Chung Yên Hư Ngôn' : 'Voidword of the Final End'; if (hudPhase === 2) return isVi ? 'Thập Niệm Giáng Thế' : 'Descent of Ten Thoughts'; return isVi ? 'Thâm Miên Cổ Thần' : 'The Slumbering Elder'; })(),
                attackKey: def ? def.key : 'duel.attack.1',
                attackId: opening ? 1 : this.attacks.currentAttackId,
                attackSerial: opening ? (this.attackSerial || 0) + 1 : this.attackSerial,
                transitionState: !opening && this.state !== 'playing',
                nextAttackId: opening || this.state === 'playing' ? 0 : this.transitionInfo.nextIndex,
                transitionElapsed: this.transitionElapsed,
                transitionProgress: this.transitionElapsed / Math.max(0.1, this.transitionDuration),
                hp: opening ? openingFill : this.attacks.hp,
                maxHp: opening ? 1 : this.attacks.maxHp,
                phase: hudPhase,
                hpBarHitFlash: this.hpBarHitFlash || 0,
                hpBarHeavyShake: this.hpBarHeavyShake || 0,
                weaponId: this.selectedWeapon ? this.selectedWeapon.id : 'sword',
                elapsed: opening ? 0 : this.attacks.elapsed,
                stats: this.stats,
                duration: def ? def.duration : 25.0,
                lives: this.lives,
                playerShieldActive: this.playerShieldActive,
                playerShieldCooldownRemaining: this.playerShieldCooldown,
                playerShieldCooldownRatio: this.playerShieldCooldown > 0 ? (1.0 - this.playerShieldCooldown / this.playerShieldMaxCooldown) : 1.0,
                shiftActive: this.shiftActive,
                shiftElapsed: this.shiftElapsed,
                shiftCooldownRemaining: this.shiftCooldownRemaining,
                recoveryRemaining: this.recoveryRemaining,
                skillACooldown: this.skillACooldown,
                skillAActive: this.playerSkills.length > 0,
                skillFActive: this.skillFSweepActive,
                skillFCharging: this.skillFCharging,
                skillFChargeRatio: Math.min(1.0, this.skillFChargeElapsed / this.skillFChargeDuration),
                skillFCooldownRatio: this.skillFCooldown > 0 ? (1.0 - this.skillFCooldown / this.skillFMaxCooldown) : 1.0,
                enemySlowed: (this.enemySlowTimer > 0) || (this.shiftDomain && this.shiftDomain.active),
                spellCardAnnounce: this.spellCardAnnounce
            });
        }

        renderHUD(ctx) {
            if (!this.active) return;
            const canvasW = (typeof canvas !== 'undefined') ? canvas.width : 1280;
            const canvasH = (typeof canvas !== 'undefined') ? canvas.height : 720;

            if (this.state === 'opponent_select') {
                this.opponentUI.render(ctx, canvasW, canvasH);
                return;
            }

            if (this.state === 'weapon_select') {
                this.weaponPicker.render(ctx, canvasW, canvasH);
                return;
            }

            if (this.state === 'pre_battle') {
                UI.renderPreBattleTransition(ctx, canvasW, canvasH, this.preBattleElapsed, this);
                return;
            }

            if (this.state === 'spell_transition') {
                UI.renderSpellCardTransition(ctx, canvasW, canvasH, this.transitionInfo, this.transitionElapsed);
            } else if (this.state === 'phase_transition') {
                const lock = this._lockedBossPos;
                if (lock) UI.renderEvolutionCamera(ctx, canvasW, canvasH, this.transitionElapsed, lock.x, lock.y);
                window.DuelCinematics.evolutionOverlay(ctx, canvasW, canvasH, this);
            }

            if (this.state === 'playing' || this.state === 'spell_transition' || this.state === 'phase_transition') {
                window.DuelCinematics.cockpitAlarm(ctx, canvasW, canvasH, this);
                this._renderMatchHUD(ctx, canvasW, canvasH);
                window.DuelCinematics.shipReport(ctx, canvasW, canvasH, this);
                if (this._tipsShow && this.state === 'playing' && this.stats.timeSec < 5) {
                    const tipAge = this.stats.timeSec;
                    UI.drawControlTips(ctx, 20, 78, 380, Math.min(0.9, tipAge / 0.5, (5 - tipAge) / 1.0));
                }
            }

            if (this.state === 'playing') window.DuelCinematics.readyPulse(ctx, canvasW, canvasH, this);

            if (this.state === 'result') {
                // Canvas result UI removed to prevent dual-overlay clash with DOM duel-recap
                ctx.save();
                ctx.fillStyle = 'rgba(2, 6, 18, 0.95)';
                ctx.fillRect(0, 0, canvasW, canvasH);
                ctx.restore();
            }
        }

        onKeyDown(e) {
            if (!this.active) return;

            if (this.state === 'opponent_select') {
                const res = this.opponentUI.handleKey(e);
                if (res) {
                    if (res.action === 'start_practice') {
                        this.startPractice(res.attackId, res.difficulty);
                    } else if (res.action === 'continue') {
                        this.selectOpponent(res.opponent, res.difficulty);
                    } else if (res.action === 'back') {
                        this.abort();
                        if (typeof window._returnToMainMenu === 'function') {
                            window._duelReturnToMenu();
                        }
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
                return;
            }

            if (this.state === 'weapon_select') {
                const res = this.weaponPicker.handleKey(e);
                if (res) {
                    if (res.action === 'confirm') {
                        this.selectWeapon(res.weapon);
                    } else if (res.action === 'back') {
                        this.state = 'opponent_select';
                        if (window.AudioMgr) window.AudioMgr.playSfx('ui-back');
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
                return;
            }

            if (this.state === 'pre_battle') {
                // The opening always plays through, so no key shortens it
                return;
            }

        }

        onKeyUp(e) {
            if (!this.active) return;
        }

        onPointerDown(e) {
            if (!this.active) return;
            const cv = (typeof canvas !== 'undefined') ? canvas : document.getElementById('gameCanvas');
            const rect = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: 1280, height: 720 };
            const scaleX = (cv && rect.width > 0) ? (cv.width / rect.width) : 1;
            const scaleY = (cv && rect.height > 0) ? (cv.height / rect.height) : 1;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            if (this.state === 'opponent_select') {
                this.opponentUI.handlePointerDown(x, y);
            } else if (this.state === 'weapon_select') {
                this.weaponPicker.handlePointerDown(x, y);
            }
        }

        onPointerMove(e) {
            if (!this.active) return;
            const cv = (typeof canvas !== 'undefined') ? canvas : document.getElementById('gameCanvas');
            const rect = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: 1280, height: 720 };
            const scaleX = (cv && rect.width > 0) ? (cv.width / rect.width) : 1;
            const scaleY = (cv && rect.height > 0) ? (cv.height / rect.height) : 1;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            if (this.state === 'opponent_select') {
                this.opponentUI.handlePointerMove(x, y);
            } else if (this.state === 'weapon_select') {
                this.weaponPicker.handlePointerMove(x, y);
            }
        }

        onPointerUp(e) {
            if (!this.active) return;
            const cv = (typeof canvas !== 'undefined') ? canvas : document.getElementById('gameCanvas');
            const rect = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: 1280, height: 720 };
            const scaleX = (cv && rect.width > 0) ? (cv.width / rect.width) : 1;
            const scaleY = (cv && rect.height > 0) ? (cv.height / rect.height) : 1;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            if (this.state === 'opponent_select') {
                const res = this.opponentUI.handlePointerUp(x, y);
                if (res) {
                    if (res.action === 'start_practice') {
                        this.startPractice(res.attackId, res.difficulty);
                    } else if (res.action === 'continue') {
                        this.selectOpponent(res.opponent, res.difficulty);
                    } else if (res.action === 'back') {
                        this.abort();
                        if (typeof window._returnToMainMenu === 'function') {
                            window._duelReturnToMenu();
                        }
                    }
                }
            } else if (this.state === 'weapon_select') {
                const res = this.weaponPicker.handlePointerUp(x, y);
                if (res) {
                    if (res.action === 'confirm') {
                        this.selectWeapon(res.weapon);
                    } else if (res.action === 'back') {
                        this.state = 'opponent_select';
                        if (window.AudioMgr) window.AudioMgr.playSfx('ui-back');
                    }
                }
            } else if (this.state === 'result' && this.resultButtons) {
                if (this.practiceMode) {
                    const ret = this.resultButtons.retry;
                    const pick = this.resultButtons.pickAnother;
                    const mm = this.resultButtons.mainMenu;
                    if (ret && x >= ret.x && x <= ret.x + ret.w && y >= ret.y && y <= ret.y + ret.h) {
                        this.startPractice(this.chosenAttackIndex + 1, this.difficulty);
                    } else if (pick && x >= pick.x && x <= pick.x + pick.w && y >= pick.y && y <= pick.y + pick.h) {
                        this.start();
                        this.opponentUI.practiceModalOpen = true;
                    } else if (mm && x >= mm.x && x <= mm.x + mm.w && y >= mm.y && y <= mm.y + mm.h) {
                        this.abort();
                        if (typeof window._returnToMainMenu === 'function') {
                            window._duelReturnToMenu();
                        }
                    }
                } else {
                    const pa = this.resultButtons.playAgain;
                    const mm = this.resultButtons.mainMenu;
                    if (pa && x >= pa.x && x <= pa.x + pa.w && y >= pa.y && y <= pa.y + pa.h) {
                        this.start();
                    } else if (mm && x >= mm.x && x <= mm.x + mm.w && y >= mm.y && y <= mm.y + mm.h) {
                        this.abort();
                        if (typeof window._returnToMainMenu === 'function') {
                            window._duelReturnToMenu();
                        }
                    }
                }
            }
        }
    }

    const session = new DuelSession();

    if (typeof window !== 'undefined') {
        window._duelSession = session;
        window._duelPrepare = () => session.prepare();
        window._duelAbort = () => session.abort();
        // Leaving Showdown for the main menu also takes the game loop out of the playing state, so no Voyage run
        // (waves, music, game over) starts behind the menu
        window._duelReturnToMenu = () => {
            session.abort();
            if (typeof window._goToMenuImmediate === 'function') window._goToMenuImmediate();
            else { gameState = 'start'; if (typeof window._returnToMainMenu === 'function') window._returnToMainMenu(); }
        };
        window._duelQuitToRecap = () => session.quitToRecap();
        window._duelStart = () => session.start();
        window._duelRestart = () => session.restart();
        window._duelStartPractice = (id, diff) => session.startPractice(id, diff);
        window._duelUpdate = (dt, now) => session.update(dt, now);
        window._duelRenderCombat = (ctx) => session.renderCombat(ctx);
        window._duelRenderHUD = (ctx) => session.renderHUD(ctx);
        window._duelFireAutoShot = () => session.fireAutoShot();
        window._duelTriggerShift = () => session.triggerShift();
        window._duelReleaseShift = () => session.releaseShift();
        window._duelShiftTeleport = (dir) => session.shiftTeleport(dir);
        window._duelTriggerSkillA = () => session.triggerSkillA();
        window._duelTriggerSkillF = () => session.triggerSkillF();
        window._duelUpdateSkillFDirection = (dir) => session.updateSkillFDirection(dir);
        window._duelOnHit = (cause) => session.onPlayerHit(cause);
    }

    return {
        session,
        DuelSession
    };
});
