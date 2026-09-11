// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Global UI helpers, called from main.js
function showStartButton(text) {
    const btn = document.getElementById("startBtn");
    if (!btn) return;
    btn.textContent = text;
    const _isGO = typeof gameState !== 'undefined' && gameState === "gameover";
    btn.style.top = _isGO ? "calc(50% + 143px)" : "50%";
    btn.style.transform = _isGO ? "translateX(-50%)" : "translate(-50%, -50%)";
    if (_isGO) { btn.classList.add("ds-mode"); } else { btn.classList.remove("ds-mode"); }
    btn.style.display = "block";
    // On mobile, #mc (z-index:300) covers the screen, lift button above it
    btn.style.zIndex = "400";
    btn.style.position = "fixed";
    btn.style.left = "50%";
    btn.style.pointerEvents = "all";
    btn.style.touchAction = "manipulation";
}

function hideStartButton() {
    const btn = document.getElementById("startBtn");
    if (btn) { btn.style.display = "none"; btn.style.zIndex = ""; btn.classList.remove("ds-mode"); }
}

function showMainMenuButton() {
    const btn = document.getElementById("mainMenuBtn");
    if (btn) btn.style.display = "block";
}

function hideMainMenuButton() {
    const btn = document.getElementById("mainMenuBtn");
    if (btn) btn.style.display = "none";
}

function showMatchStatsButton() {
    const btn = document.getElementById("matchStatsBtn");
    if (btn) btn.style.display = "block";
}

function hideMatchStatsButton() {
    const btn = document.getElementById("matchStatsBtn");
    if (btn) btn.style.display = "none";
    if (typeof closeMatchStats === 'function') closeMatchStats();
}

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById("startBtn");
    const mainMenuBtn = document.getElementById("mainMenuBtn");

    if (mainMenuBtn) {
        const _goToMenu = () => {
            gameState = "start";
            hideStartButton();
            hideMainMenuButton();
            hideMatchStatsButton();
            screenShake.duration = 0;
            if (typeof window._returnToMainMenu === 'function') window._returnToMainMenu();
        };
        mainMenuBtn.addEventListener("click", _goToMenu);
        mainMenuBtn.addEventListener("touchstart", (e) => { e.preventDefault(); _goToMenu(); }, { passive: false });
    }

    // Elements của màn hình Pause
    const pauseOverlay = document.getElementById("pause-overlay");
    const resumeBtn = document.getElementById("resume-btn");
    const progressContainer = document.getElementById("resume-progress-container");
    const progressBar = document.getElementById("resume-progress-bar");
    const pauseTitle = document.getElementById("pause-title");
    const pauseSubtitle = document.getElementById("pause-subtitle");
    const pauseMainBtns = document.getElementById("pause-main-btns");

    startBtn.addEventListener("click", () => {
        startGame();
    });
    // Mobile: touchstart fires more reliably than click on overlapped elements
    startBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        startGame();
    }, { passive: false });

    // View Current Position: hides the pause overlay so the frozen game
    // scene underneath becomes visible - gamePaused (and the paused audio
    // mix) is untouched the whole time, this only toggles which of the two
    // full-screen overlays is on top. The peek overlay is transparent but
    // still catches any click/tap to return, same as Esc does on desktop.
    const positionPeekOverlay = document.getElementById("position-peek-overlay");
    const viewPositionBtn = document.getElementById("view-position-btn");
    window._enterPositionPeek = function () {
        if (!gamePaused) return;
        pauseOverlay.style.display = "none";
        if (positionPeekOverlay) positionPeekOverlay.style.display = "block";
    };
    window._exitPositionPeek = function () {
        if (positionPeekOverlay) positionPeekOverlay.style.display = "none";
        if (gamePaused) pauseOverlay.style.display = "flex";
    };
    if (viewPositionBtn) {
        viewPositionBtn.addEventListener("click", window._enterPositionPeek);
        viewPositionBtn.addEventListener("touchstart", (e) => { e.preventDefault(); window._enterPositionPeek(); }, { passive: false });
    }
    if (positionPeekOverlay) {
        positionPeekOverlay.addEventListener("click", window._exitPositionPeek);
        positionPeekOverlay.addEventListener("touchstart", (e) => { e.preventDefault(); window._exitPositionPeek(); }, { passive: false });
    }

    // showPauseScreen cần pauseOverlay nên vẫn ở trong DOMContentLoaded, expose ra window để main.js gọi được
    window.showPauseScreen = function showPauseScreen() {
        if (positionPeekOverlay) positionPeekOverlay.style.display = "none";
        pauseOverlay.style.display = "flex";
        if (pauseMainBtns) pauseMainBtns.style.display = "flex";
        progressContainer.style.display = "none";
        pauseTitle.innerText = "SYSTEM TERMINATED";
        pauseSubtitle.style.display = "block";
        const _pgb = document.getElementById("pause-guide-btns");
        if (_pgb) _pgb.style.display = "flex";
        window._bgPaused = true;
        // Freeze the full mix (bgm + engine/ambient/laser/charging loops)
        // while the pause overlay is up; resumed after the reboot animation
        // completes. Overlay/click/hover sfx stay live so pause-screen UI
        // still gives audible feedback.
        if (window.AudioMgr) window.AudioMgr.pauseAll();
    }

    resumeBtn.addEventListener("click", () => {
        if (pauseMainBtns) pauseMainBtns.style.display = "none";
        pauseSubtitle.style.display = "none";
        pauseTitle.innerText = "REBOOTING SYSTEMS...";
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";
        const _pgb = document.getElementById("pause-guide-btns");
        if (_pgb) _pgb.style.display = "none";

        // No real async work happens on resume (audio resume is instant,
        // there's no state to reload) — this is a fixed-duration transition
        // beat only, same nature as the Initiate Hyperjump bar.
        if (window.AudioMgr) window.AudioMgr.resumeAll();

        const DURATION_MS = 500;
        const startTime = performance.now();

        function animateLoading(currentTime) {
            const progress = Math.min(1, (currentTime - startTime) / DURATION_MS);
            progressBar.style.width = (progress * 100) + "%";

            if (progress < 1) {
                requestAnimationFrame(animateLoading);
            } else {
                // Done: hide overlay, reset clock, game loop resumes on its own.
                pauseOverlay.style.display = "none";
                gamePaused = false;
                window._bgPaused = false;
                lastTimeStamp = performance.now(); // reset or pause duration becomes a giant deltaTime spike next frame
            }
        }

        requestAnimationFrame(animateLoading);
    });

    const pauseMenuBtn = document.getElementById("main-menu-btn");
    if (pauseMenuBtn) {
        const _goMenuFromPause = () => {
            gameState = "start";
            screenShake.duration = 0;
            if (typeof window._returnToMainMenu === 'function') window._returnToMainMenu();
        };
        pauseMenuBtn.addEventListener('click', _goMenuFromPause);
        pauseMenuBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _goMenuFromPause(); }, { passive: false });
    }

    document.addEventListener("keydown", (e) => {
        if (e.code === "Escape" && gameState === "playing" && !gamePaused) {
            gamePaused = true;
            window.showPauseScreen();
            e.preventDefault();
            return;
        }
        // Already paused: Esc toggles View Current Position instead, same
        // as clicking the button/peek overlay - never touches gamePaused.
        if (e.code === "Escape" && gameState === "playing" && gamePaused) {
            e.preventDefault();
            const _peekOv = document.getElementById("position-peek-overlay");
            if (_peekOv && _peekOv.style.display === "block") {
                window._exitPositionPeek();
            } else {
                window._enterPositionPeek();
            }
            return;
        }

        // Same freeze as main.js's update() (skipped while the sigil picker
        // is up) — without this, skill keys still fired activateSkillX()
        // using real wall-clock time while everything else was frozen, so
        // e.g. Skill D's charge could silently start (or even resolve
        // instantly, if the picker sat open longer than the charge time)
        // before the player ever saw the game resume.
        if (gameState !== "playing" || gamePaused || window._sigilPicker) return;

        // Skill Shift: Yog-Sothoth
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
            if (!skillShiftActive && performance.now() - lastSkillShift >= skillShiftCooldown
                && !(typeof player !== 'undefined' && player._silenced)) {
                skillShiftActive = true;
                window._shiftActive = true;
                // The domain's whole Van Gogh painting treatment is FULL-tier
                // only. Smart Quality freezes further changes for the rest of
                // the domain the instant _shiftActive flips true (see
                // index.html's FPS watchdog) but never lifts a tier that had
                // already been auto-downgraded before Shift was pressed - so
                // without this, a fight that had recently dipped FPS could
                // silently strip the domain's own showcase effects even
                // though Settings still says "Full". Forcing tier 0 right
                // here gives the domain its best shot every time; the
                // watchdog resumes its own normal downgrade/recovery once
                // Shift ends if performance genuinely can't hold it.
                if (window._smartQuality !== false && typeof window._applyGfxLevel === 'function') window._applyGfxLevel(0);
                skillShiftChargeStart = performance.now();
                if (window.AudioMgr) {
                    window.AudioMgr.enterTimeDomain();
                    window.AudioMgr.playSfx('shift-hold');
                }
                if (_hasBuff('coi_mong')) {
                    window._coiMongEndTime = performance.now() + 3000;
                    const _markT = performance.now();
                    for (const _e of enemies) {
                        if (_e.type.startsWith('enemy_bullet') || _e.type === 'abyssal_chain' || _e.inCoronation) continue;
                        if (!_e._yogMark) {
                            _e._yogMark = true;
                            _e._yogMarkStart = _markT;
                            _e._yogMarkAccum = 0;
                            applyVulnerability(_e);
                        }
                    }
                }
            }
            e.preventDefault();
        }

        // must check shift first bc arrows inside domain = teleport, return early skips keys.left below
        if (skillShiftActive) {
            // Trong lãnh địa, ấn phím điều hướng để Dịch Chuyển
            if (e.code === "ArrowLeft") { executeShiftTeleport('left'); e.preventDefault(); return; }
            if (e.code === "ArrowRight") { executeShiftTeleport('right'); e.preventDefault(); return; }
        } else {
            // Di chuyển bình thường
            if (e.code === "ArrowLeft") keys.left = true;
            if (e.code === "ArrowRight") keys.right = true;
        }

        // Cancer sigil: a banked Riptide Surge takes priority over the
        // normal charge/laser, same "works any time, doesn't touch the
        // normal skill's own state" shape as Great Sage's gem release.
        if (e.code === "Space" && window._tidalSurgeReady
            && !(typeof player !== 'undefined' && player._silenced)) {
            _releaseTidalSurge();
            e.preventDefault();
        } else if (e.code === "Space" && !charging && !laserActive && !skillShiftActive
            && !(typeof player !== 'undefined' && player._silenced)) {
            const _now = performance.now();
            if (_hasBuff('dong_chay_luan_hoi')) {
                // Cycle of Flow: skip the charge phase entirely
                if (_now >= laserCooldownEnd) _activateOverloadLaser(_now);
            } else {
                charging = true; chargeStartTime = _now;
                if (window.AudioMgr) window.AudioMgr.startCharging();
            }
            e.preventDefault();
        }
        if (e.code === "KeyA") { activateSkillA(); e.preventDefault(); }
        if (e.code === "KeyS") { activateSkillS(); e.preventDefault(); }
        if (e.code === "KeyD") { activateSkillD(); e.preventDefault(); }
        if (e.code === "KeyF") { activateSkillF(); e.preventDefault(); }
        if (e.code === "KeyG") { activateSkillG(); e.preventDefault(); }
    });

    document.addEventListener("keyup", (e) => {
        if (e.code === "ArrowLeft") keys.left = false;
        if (e.code === "ArrowRight") keys.right = false;

        // Hủy trạng thái Lãnh địa nếu nhả phím Shift
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
            cancelSkillShift();
        }

        if (e.code === "Space" && charging && !laserActive) {
            let chargeDuration = performance.now() - chargeStartTime;
            // Getting silenced mid-charge (e.g. a Goliath hit lands while
            // holding Space) still cancels the charge on release - no shot.
            if (chargeDuration < overloadChargeTime && !(typeof player !== 'undefined' && player._silenced)) {
                let multiplier = 1 + ((Math.min(chargeDuration, maxChargeTime) / maxChargeTime) * (maxMultiplier - 1));
                fireChargedBullet(Math.min(multiplier, maxMultiplier));
            }
            charging = false;
            if (window.AudioMgr) window.AudioMgr.stopCharging();
            e.preventDefault();
        }
    });

    // PC-only resize path. Mobile uses its own handler (index.html, near
    // _initMobileControls) because the canvas is deliberately oversized
    // there (1.282x inflate) — this 1:1 resize would clobber that and
    // desync the skill-button overlay from the canvas whenever Safari's
    // toolbar shows/hides in landscape.
    window.addEventListener("resize", function () {
        if (typeof window._platform !== 'undefined' && window._platform === 'mobile') return;
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        ctx.imageSmoothingQuality = "high"; // resizing the canvas resets context state, including this
        player.y = canvas.height - 60;
        skillASensorRadius = Math.min(canvas.width, canvas.height) * 0.9;
    });
    // Tự động pause khi chuyển tab
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameState === 'playing' && !gamePaused) {
            gamePaused = true;
            showPauseScreen();
        }
    });

}); // DOMContentLoaded