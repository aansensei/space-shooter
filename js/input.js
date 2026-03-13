const startBtn = document.getElementById("startBtn");

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

function showStartButton(text) {
    startBtn.textContent = text;
    if (gameState === "gameover") {
        startBtn.style.top = "calc(50% + 80px)";
    } else {
        startBtn.style.top = "50%";
    }
    startBtn.style.display = "block";
}

function hideStartButton() {
    startBtn.style.display = "none";
}

// --- LOGIC MÀN HÌNH PAUSE MỚI ---
function showPauseScreen() {
    pauseOverlay.style.display = "flex";
    resumeBtn.style.display = "block";
    progressContainer.style.display = "none";
    pauseTitle.innerText = "SYSTEM PAUSED";
    pauseSubtitle.style.display = "block";
}

resumeBtn.addEventListener("click", () => {
    // 1. Ẩn nút và chữ, hiện thanh loading
    resumeBtn.style.display = "none";
    pauseSubtitle.style.display = "none";
    pauseTitle.innerText = "REBOOTING SYSTEMS...";
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";

    const loadingDuration = 2000; // Thay đổi thời gian load ở đây (2000ms = 2 giây)
    const startTime = performance.now();

    // 2. Chạy animation loading chuẩn xác theo thời gian thực
    function animateLoading(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / loadingDuration, 1); // max là 1 (100%)

        progressBar.style.width = (progress * 100) + "%";

        if (progress < 1) {
            requestAnimationFrame(animateLoading); // Tiếp tục gọi nếu chưa đầy
        } else {
            // 3. Đã load xong 100%, tắt overlay và tiếp tục game
            pauseOverlay.style.display = "none";
            gamePaused = false;
            lastTimeStamp = performance.now(); // Reset time để game không bị lặp lại lỗi pause
            requestAnimationFrame(gameLoop);
        }
    }

    requestAnimationFrame(animateLoading);
});

document.addEventListener("keydown", (e) => {
    if (gameState !== "playing") return;
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "Space" && !charging && !laserActive) { charging = true; chargeStartTime = performance.now(); e.preventDefault(); }
    if (e.code === "KeyA") { activateSkillA(); e.preventDefault(); }
    if (e.code === "KeyS") { activateSkillS(); e.preventDefault(); }
    if (e.code === "KeyD") { activateSkillD(); e.preventDefault(); }
    if (e.code === "KeyF") { activateSkillF(); e.preventDefault(); }
    if (e.code === "KeyG") { activateSkillG(); e.preventDefault(); }
});

document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
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