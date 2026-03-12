const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
    if (gameState === "playing" && gamePaused) resumeGame(); else startGame();
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
    startBtn.style.top = "50%";
}

function resumeGame() {
    gamePaused = false; loading = true; hideStartButton();
    setTimeout(() => {
        loading = false; lastTimeStamp = performance.now(); requestAnimationFrame(gameLoop);
    }, 2000);
}

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