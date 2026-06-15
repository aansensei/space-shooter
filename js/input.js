// Global UI helpers, called from main.js
function showStartButton(text) {
    const btn = document.getElementById("startBtn");
    if (!btn) return;
    btn.textContent = text;
    const _isGO = typeof gameState !== 'undefined' && gameState === "gameover";
    btn.style.top = _isGO ? "calc(50% + 48px)" : "50%";
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

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById("startBtn");
    const mainMenuBtn = document.getElementById("mainMenuBtn");

    if (mainMenuBtn) {
        const _goToMenu = () => {
            gameState = "start";
            hideStartButton();
            hideMainMenuButton();
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

    startBtn.addEventListener("click", () => {
        startGame();
    });
    // Mobile: touchstart fires more reliably than click on overlapped elements
    startBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        startGame();
    }, { passive: false });

    // showPauseScreen cần pauseOverlay nên vẫn ở trong DOMContentLoaded, expose ra window để main.js gọi được
    window.showPauseScreen = function showPauseScreen() {
        pauseOverlay.style.display = "flex";
        resumeBtn.style.display = "block";
        progressContainer.style.display = "none";
        pauseTitle.innerText = "SYSTEM PAUSED";
        pauseSubtitle.style.display = "block";
    }

    resumeBtn.addEventListener("click", () => {
        resumeBtn.style.display = "none";
        pauseSubtitle.style.display = "none";
        pauseTitle.innerText = "REBOOTING SYSTEMS...";
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";

        const loadingDuration = 2000;
        const startTime = performance.now();

        function animateLoading(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / loadingDuration, 1);
            progressBar.style.width = (progress * 100) + "%";

            if (progress < 1) {
                requestAnimationFrame(animateLoading);
            } else {
                // Loading xong, ẩn overlay, reset clock, game loop tự chạy tiếp
                pauseOverlay.style.display = "none";
                gamePaused = false;
                lastTimeStamp = performance.now(); // reset or pause duration becomes a giant deltaTime spike next frame
            }
        }

        requestAnimationFrame(animateLoading);
    });

    document.addEventListener("keydown", (e) => {
        if (e.code === "Escape" && gameState === "playing" && !gamePaused) {
            gamePaused = true;
            window.showPauseScreen();
            e.preventDefault();
            return;
        }

        if (gameState !== "playing") return;

        // Skill Shift: Yog-Sothoth
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
            if (!skillShiftActive && performance.now() - lastSkillShift >= skillShiftCooldown
                && !(typeof player !== 'undefined' && player._silenced)) {
                skillShiftActive = true;
                window._shiftActive = true;
                skillShiftChargeStart = performance.now();
                if (_hasBuff('coi_mong')) {
                    window._coiMongEndTime = performance.now() + 2000;
                    const _markT = performance.now();
                    for (const _e of enemies) {
                        if (_e.type.startsWith('enemy_bullet') || _e.type === 'abyssal_chain' || _e.inCoronation) continue;
                        if (!_e._yogMark) {
                            _e._yogMark = true;
                            _e._yogMarkStart = _markT;
                            _e._yogMarkAccum = 0;
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

        if (e.code === "Space" && !charging && !laserActive && !skillShiftActive) { charging = true; chargeStartTime = performance.now(); e.preventDefault(); }
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
            if (chargeDuration < overloadChargeTime) {
                let multiplier = 1 + ((Math.min(chargeDuration, maxChargeTime) / maxChargeTime) * (maxMultiplier - 1));
                fireChargedBullet(Math.min(multiplier, maxMultiplier));
            }
            charging = false; e.preventDefault();
        }
    });

    window.addEventListener("resize", function () {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
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