function draw() {
    ctx.save();
    if (screenShake.duration > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake.intensity, (Math.random() - 0.5) * screenShake.intensity);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (demonGiftEffect.active && performance.now() < demonGiftEffect.endTime) {
        drawDemonGiftAura();
    }

    drawSkillGBarrier();

    if (gameState === "playing") {
        sentinels.forEach(drawSentinel);
        if (skillAActive) drawSkillA();
        bladeArcProjectiles.forEach(drawBladeArcProjectile);
        scatteredProjectiles.forEach(drawScatteredProjectile);

        teslaCoils.forEach(drawTeslaCoil);
        energyOrbs.forEach(drawEnergyOrb);

        drawAegisLasers();

        enemies.forEach(drawEnemy);
        bullets.forEach(drawBullet);
        spiritBullets.forEach(drawSpiritBullet);
        spirits.forEach(drawSpirit);
        if (blackHole) drawBlackHole();

        drawBossShockwaves();

        if (laserActive) {
            playerClones.forEach(clone => drawPlayer(0.5, clone.xOffset));
            drawLaser();
        }
        drawPlayer();
        drawPlayerAura();
        drawFinalDefense();

        if (charging && !laserActive) drawChargeEffect();
        explosions.forEach(drawExplosion);
        particles.forEach(drawParticle);
        chainLightningEffects.forEach(drawChainLightning);
        if (skillFState !== 'ready') drawSkillF();
        if (charging) drawChargeMeter();

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, boundaryY);
        ctx.lineTo(canvas.width, boundaryY);
        ctx.stroke();
        ctx.restore();
    }

    if (gameState === "playing") {
        drawSkillButtons();
        ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "right";
        ctx.fillText("Score: " + score, canvas.width - 20, 30);
        ctx.fillText("Lives: " + lives, canvas.width - 20, 60);
        ctx.fillText("Sentinels: " + sentinels.length, canvas.width - 20, 90);
        ctx.fillText("Tesla Coils: " + teslaCoils.length, canvas.width - 20, 120);
    } else if (gameState === "start") {
        ctx.textAlign = "center"; ctx.font = "40px Arial"; ctx.fillStyle = "white";
        ctx.fillText("Space Shooter Pro", canvas.width / 2, canvas.height / 2 - 50);
    } else if (gameState === "gameover") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(canvas.width / 2 - 250, canvas.height / 2 - 100, 500, 200);
        ctx.textAlign = "center";
        ctx.font = "50px Arial";
        ctx.fillStyle = "red";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = "30px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Tổng Điểm: " + score, canvas.width / 2, canvas.height / 2 + 30);
    }
    ctx.restore();
}

function drawAegisLasers() {
    aegisLasers.forEach(laser => {
        ctx.save();
        if (!laser.fired) {
            ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();

            ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 15]);
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            let prog = laser.duration / 200;
            ctx.strokeStyle = `rgba(255, 50, 50, ${prog})`;
            ctx.lineWidth = 40 * prog;
            ctx.shadowColor = "red";
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${prog})`;
            ctx.lineWidth = 15 * prog;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
        }
        ctx.restore();
    });
}

function drawBossShockwaves() {
    bossShockwaves.forEach(wave => {
        ctx.save();
        ctx.strokeStyle = "rgba(138, 43, 226, 0.8)";
        ctx.lineWidth = 15;
        ctx.shadowColor = "#FF00FF";
        ctx.shadowBlur = 30;

        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(138, 43, 226, 0.1)";
        ctx.fill();
        ctx.restore();
    });
}

function drawChainLightning(effect) {
    ctx.save();
    let alpha = effect.lifetime / effect.maxLifetime;

    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.lineWidth = 5;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.moveTo(effect.x1, effect.y1);
    for (let i = 0; i < 5; i++) {
        const progress = i / 4;
        const nx = effect.x1 + (effect.x2 - effect.x1) * progress;
        const ny = effect.y1 + (effect.y2 - effect.y1) * progress;
        const offsetX = (Math.random() - 0.5) * 30 * (1 - Math.abs(progress - 0.5) * 2);
        const offsetY = (Math.random() - 0.5) * 30 * (1 - Math.abs(progress - 0.5) * 2);
        ctx.lineTo(nx + offsetX, ny + offsetY);
    }
    ctx.lineTo(effect.x2, effect.y2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function drawDemonGiftAura() {
    const elapsed = demonGiftEffect.endTime - performance.now();
    const alpha = Math.max(0, (elapsed / 4000) * 0.25);

    ctx.save();
    const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
    grad.addColorStop(0, `rgba(138, 43, 226, 0)`);
    grad.addColorStop(1, `rgba(138, 43, 226, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function drawFinalDefense() {
    const now = performance.now();
    ctx.save();

    // MỚI: Vẽ Khiên Vàng Tuyệt Đối của người chơi
    if (playerAbsoluteShield) {
        ctx.strokeStyle = '#FFD700'; // Vàng Gold
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#FFA500';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    if (finalDefense.playerShield) {
        ctx.strokeStyle = '#00FFFF';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    if (finalDefense.boundaryShield) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 20;
        ctx.fillRect(0, boundaryY, canvas.width, 10);
    }
    ctx.restore();
}

function drawPlayerAura() {
    const auraLevel = killCountForPassive % 5;
    if (auraLevel === 0 && killCountForPassive > 0 && sentinels.length > 0) return;

    const maxRadius = player.width * 1.5;
    const maxOpacity = 0.5;

    const progress = auraLevel / 5;
    const radius = maxRadius * progress;
    const opacity = maxOpacity * progress;

    ctx.save();
    ctx.translate(player.x, player.y);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, `rgba(255, 255, 100, ${opacity})`);
    grad.addColorStop(1, `rgba(255, 200, 0, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSentinel(sentinel) {
    const { x, y, size, angle, hp, maxHp } = sentinel;
    ctx.save();
    ctx.translate(x, y);

    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    bodyGrad.addColorStop(0, '#FFFFFF'); bodyGrad.addColorStop(0.5, '#AAAAAA'); bodyGrad.addColorStop(1, '#666666');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2; ctx.stroke();

    ctx.rotate(angle);
    const gunWidth = size * 0.8, gunHeight = size * 0.8;
    ctx.fillStyle = '#444444';
    ctx.fillRect(size * 0.5, -gunHeight / 2, gunWidth, gunHeight);
    ctx.strokeStyle = '#888888';
    ctx.strokeRect(size * 0.5, -gunHeight / 2, gunWidth, gunHeight);
    ctx.restore();

    const barWidth = 40, barHeight = 5;
    const barX = x - barWidth / 2, barY = y - size - 15;
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = 'cyan'; ctx.fillRect(barX, barY, barWidth * (hp / maxHp), barHeight);
    ctx.strokeStyle = '#FFF'; ctx.strokeRect(barX, barY, barWidth, barHeight);

    if (gloryForJusticeActive) {
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.moveTo(x - 5, y - size - 25);
        ctx.lineTo(x + 5, y - size - 25);
        ctx.lineTo(x, y - size - 35);
        ctx.closePath();
        ctx.fill();
    }

    // MỚI: Vẽ Khiên Vàng cho Sentinel
    if (sentinel.absoluteShield) {
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FFA500';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, size + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function drawBullet(b) {
    ctx.save();
    switch (b.type) {
        case 'sentinel_special':
            ctx.fillStyle = "red"; ctx.shadowColor = "white"; ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y - b.size / 2); ctx.lineTo(b.x + b.size / 3, b.y);
            ctx.lineTo(b.x, b.y + b.size / 2); ctx.lineTo(b.x - b.size / 3, b.y);
            ctx.closePath(); ctx.fill();
            break;
        case 'player_charged':
            ctx.fillStyle = "yellow"; ctx.shadowColor = "orange"; break;
        case 'sentinel_auto': case 'sentinel_death':
            ctx.fillStyle = "#FFA500"; ctx.shadowColor = "#FFD700"; break;
        case 'player_auto': default:
            ctx.fillStyle = "white"; ctx.shadowColor = "cyan"; break;
    }
    if (b.type !== 'sentinel_special') {
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawSpiritBullet(b) {
    ctx.save();
    ctx.fillStyle = "lime"; ctx.shadowColor = "white"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawPlayer(alpha = 1, xOffset = 0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(player.x + xOffset, player.y);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(24, 12);
    ctx.lineTo(24, 20);
    ctx.lineTo(10, 16);
    ctx.lineTo(-10, 16);
    ctx.lineTo(-24, 20);
    ctx.lineTo(-24, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(28, 10);
    ctx.lineTo(26, 16);
    ctx.lineTo(8, 12);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-26, 16);
    ctx.lineTo(-28, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(8, -8);
    ctx.lineTo(12, 18);
    ctx.lineTo(6, 22);
    ctx.lineTo(-6, 22);
    ctx.lineTo(-12, 18);
    ctx.lineTo(-8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(7, 4);
    ctx.lineTo(-7, 14);
    ctx.lineTo(0, 18);
    ctx.lineTo(9, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(4, -2);
    ctx.lineTo(0, 8);
    ctx.lineTo(-4, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(2, -2);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.fillRect(-8, 22, 5, 4);
    ctx.fillRect(3, 22, 5, 4);

    let flameH = 12 + Math.random() * 15;

    const flameGradL = ctx.createLinearGradient(0, 26, 0, 26 + flameH);
    flameGradL.addColorStop(0, "white");
    flameGradL.addColorStop(0.3, "#00FFFF");
    flameGradL.addColorStop(1, "rgba(0, 150, 255, 0)");
    ctx.fillStyle = flameGradL;
    ctx.beginPath();
    ctx.moveTo(-8, 26);
    ctx.lineTo(-5.5, 26 + flameH);
    ctx.lineTo(-3, 26);
    ctx.closePath();
    ctx.fill();

    const flameGradR = ctx.createLinearGradient(0, 26, 0, 26 + flameH);
    flameGradR.addColorStop(0, "white");
    flameGradR.addColorStop(0.3, "#00FFFF");
    flameGradR.addColorStop(1, "rgba(0, 150, 255, 0)");
    ctx.fillStyle = flameGradR;
    ctx.beginPath();
    ctx.moveTo(3, 26);
    ctx.lineTo(5.5, 26 + flameH);
    ctx.lineTo(8, 26);
    ctx.closePath();
    ctx.fill();

    if (gloryForJusticeActive && alpha === 1) {
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.moveTo(-5, -32);
        ctx.lineTo(5, -32);
        ctx.lineTo(0, -42);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function drawPolygon(x, y, radius, sides, angleOffset, color1, color2) {
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.shadowColor = color1;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + angleOffset;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawAegisCore(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    let auraRadius = canvas.width / 2;

    // Vòng Kết giới nền mờ
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 50, 50, 0.04)";
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 77, 77, 0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15, 5, 15]);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- SỬA: HIỆU ỨNG SÓNG ÂM LAN TỎA ---
    let speedPulse = 0.25; // Tốc độ lan ra của sóng
    let maxR = auraRadius;

    // Tạo 2 sóng đuổi nhau liên tục
    let wave1 = (performance.now() * speedPulse) % maxR;
    let wave2 = (performance.now() * speedPulse + maxR / 2) % maxR;

    ctx.lineWidth = 4;
    ctx.shadowColor = "red";
    ctx.shadowBlur = 10;

    // Vẽ sóng 1
    ctx.beginPath();
    ctx.arc(0, 0, wave1, 0, Math.PI * 2);
    // Độ mờ giảm dần khi sóng lan ra xa tâm
    ctx.strokeStyle = `rgba(255, 77, 77, ${1 - wave1 / maxR})`;
    ctx.stroke();

    // Vẽ sóng 2
    ctx.beginPath();
    ctx.arc(0, 0, wave2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 77, 77, ${1 - wave2 / maxR})`;
    ctx.stroke();

    ctx.shadowBlur = 0; // Tắt shadow để vẽ body không bị nhòe
    // ----------------------------------------

    if (enemy.aegisInvulnerable) {
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size + 15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 4;
        ctx.shadowColor = "white";
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    const bodyGrad = ctx.createRadialGradient(0, 0, enemy.size * 0.2, 0, 0, enemy.size);
    bodyGrad.addColorStop(0, "#f5f5f5");
    bodyGrad.addColorStop(0.6, "#d0d0d0");
    bodyGrad.addColorStop(1, "#909090");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 2;
    ctx.stroke();

    const coreGrad = ctx.createLinearGradient(0, -enemy.size * 0.4, 0, enemy.size * 0.4);
    coreGrad.addColorStop(0, "#ff3333");
    coreGrad.addColorStop(1, "#800000");

    ctx.shadowColor = "#ff3333";
    ctx.shadowBlur = 15;
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#ff6666";
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "#330000";
    let rectSize = enemy.size * 0.2;
    ctx.fillRect(-rectSize, -rectSize, rectSize * 2, rectSize * 2);
    ctx.strokeRect(-rectSize, -rectSize, rectSize * 2, rectSize * 2);

    ctx.restore();
}

function drawEnemy(enemy) {
    if (enemy.type === 'aegis_core') {
        drawAegisCore(enemy);
    } else if (enemy.type === 'boss' || enemy.type === 'mini-boss') {
        const rotation = performance.now() / (enemy.type === 'boss' ? 2000 : 3000);
        const color1 = enemy.type === 'boss' ? '#FF00FF' : '#FFD700';
        const color2 = enemy.type === 'boss' ? '#8A2BE2' : '#FFA500';
        drawPolygon(enemy.x, enemy.y, enemy.size / 2, 8, rotation, color1, color2);

        const hpPercent = enemy.hp / enemy.maxHp;
        if (hpPercent < 0.6) {
            ctx.save();
            const pulse = Math.abs(Math.sin(performance.now() / 200)) * 10;
            const auraColor = enemy.type === 'boss' ? `rgba(255, 0, 255, 0.3)` : `rgba(255, 215, 0, 0.3)`;
            ctx.fillStyle = auraColor;
            ctx.shadowColor = auraColor;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size / 2 + 10 + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    } else if (enemy.type === 'enemy_bullet') {
        ctx.save();
        ctx.fillStyle = 'red';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else {
        ctx.save();
        const hpRatio = enemy.hp / enemy.maxHp;
        const hue = 120 + hpRatio * 60;
        const color = `hsl(${hue}, 100%, 55%)`;

        const grad = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size);
        grad.addColorStop(0, "white");
        grad.addColorStop(0.3, color);
        grad.addColorStop(1, "rgba(0, 50, 100, 0.8)");

        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (enemy.shield > 0) {
        const barWidth = enemy.size;
        const barHeight = 5;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.size / 2 - 15;
        ctx.fillStyle = 'rgba(0, 150, 255, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.strokeStyle = '#00FFFF';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(Math.ceil(enemy.shield), enemy.x, barY - 2);
    }

    if (enemy.demonGiftEndTime && performance.now() < enemy.demonGiftEndTime) {
        ctx.save();
        ctx.strokeStyle = enemy.demonGiftStacks === 2 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(138, 43, 226, 0.8)';
        ctx.lineWidth = enemy.demonGiftStacks === 2 ? 5 : 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.ceil(enemy.hp), enemy.x, enemy.y + 5);
    ctx.restore();
}

function drawChargeEffect() {
    let chargeDuration = performance.now() - chargeStartTime;
    let chargeRatio = Math.min(chargeDuration / overloadChargeTime, 1);
    let radius = player.width / 2 + chargeRatio * player.width * 2;
    let color = `rgba(0, 255, 255, ${.5 + chargeRatio * .5})`;
    if (chargeDuration > maxChargeTime) {
        let overloadRatio = (chargeDuration - maxChargeTime) / (overloadChargeTime - maxChargeTime);
        let r = Math.floor(255 * overloadRatio);
        let g = 255 - Math.floor(255 * overloadRatio);
        color = `rgba(${r}, ${g}, 0, 0.8)`
    }
    if (chargeDuration > 3000 && chargeDuration < overloadChargeTime) {
        screenShake = { intensity: (chargeRatio - 0.6) * 10, duration: 50 };
    }
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowBlur = 20 * chargeRatio;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + 4 * chargeRatio;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawChargeMeter() {
    if (!charging) return;
    const chargeDuration = performance.now() - chargeStartTime;
    const chargeRatio = Math.min(chargeDuration / overloadChargeTime, 1);
    const barWidth = 60, barHeight = 8;
    const barX = player.x - barWidth / 2, barY = player.y + player.height / 2 + 10;
    ctx.fillStyle = '#444'; ctx.fillRect(barX, barY, barWidth, barHeight);
    const grad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    grad.addColorStop(0, "cyan"); grad.addColorStop(.7, "lime"); grad.addColorStop(1, "red");
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barWidth * chargeRatio, barHeight);
    ctx.strokeStyle = 'white'; ctx.strokeRect(barX, barY, barWidth, barHeight);
}

function drawLaser() {
    const laserBeamWidth = 100;
    const allLasers = [{ xOffset: 0 }, ...playerClones];
    allLasers.forEach(clone => {
        const laserX = player.x + clone.xOffset;
        ctx.save();

        const wobble = Math.sin(performance.now() / 30 + clone.xOffset / 50) * 8;
        const currentWidth = laserBeamWidth + wobble;
        const currentX = laserX - currentWidth / 2;

        let grad = ctx.createLinearGradient(currentX, 0, currentX + currentWidth, 0);
        grad.addColorStop(0, "rgba(0, 255, 255, 0)");
        grad.addColorStop(.1, "rgba(0, 255, 255, 0.5)");
        grad.addColorStop(.5, "rgba(255, 255, 255, 0.9)");
        grad.addColorStop(.9, "rgba(0, 255, 255, 0.5)");
        grad.addColorStop(1, "rgba(0, 255, 255, 0)");

        ctx.fillStyle = grad;
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 30;
        ctx.fillRect(currentX, 0, currentWidth, player.y);
        ctx.restore();

        if (Math.random() < 0.6) {
            particles.push({
                x: laserX + (Math.random() - 0.5) * currentWidth, y: player.y,
                vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 10 - 8,
                lifetime: 250, maxLifetime: 250, size: Math.random() * 3 + 1,
                color: `rgba(150, 255, 255, 0.8)`
            });
        }
    })
}

function drawExplosion(exp) {
    ctx.save();
    let p = 1 - exp.lifetime / exp.maxLifetime;
    let radius = exp.size * (1 + p);
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = exp.color;
    if (exp.color === '#00FFFF' || exp.color === 'gold') {
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 20;
    }
    ctx.beginPath(); ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawParticle(p) {
    ctx.save();
    if (p.isSummonRing) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,255,255,${prog})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * 50, 0, 2 * Math.PI); ctx.stroke();
    } else if (p.isLaserLine) {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = p.color; ctx.lineWidth = 5; ctx.shadowColor = 'red'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
    } else if (p.isSkillGAura) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0, 180, 255, ${prog})`;
        ctx.lineWidth = 10;
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + (1 - prog) * p.maxRadius, 0, 2 * Math.PI);
        ctx.stroke();
    } else {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawSkillA() {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 255, 255, 0.3)"; ctx.lineWidth = 2; ctx.setLineDash([10, 5]);
    ctx.beginPath(); ctx.arc(player.x, player.y, skillASensorRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    skillAOrbs.forEach(orb => {
        ctx.save();
        ctx.fillStyle = "cyan"; ctx.shadowColor = "white"; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore()
    })
}

function drawScatteredProjectile(p) {
    ctx.save();
    ctx.globalAlpha = p.lifetime / p.maxLifetime;
    if (p.isBouncingBall) {
        const pulse = Math.sin(performance.now() / 100) * 5;
        const currentSize = p.size + pulse;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
        grad.addColorStop(0, 'white'); grad.addColorStop(.5, 'red'); grad.addColorStop(1, 'darkred');
        ctx.fillStyle = grad; ctx.shadowColor = 'red'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = "orange";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawSpirit(spirit) {
    if (!spirit) return;
    const timeRemaining = spirit.duration - (performance.now() - spirit.spawnTime);
    if (timeRemaining < 3e3 && Math.floor(performance.now() / 150) % 2 === 0) return;
    ctx.save();
    if (spirit.isFinishing && spirit.finaleState === 'charging') {
        const chargeRatio = 1 - spirit.finaleChargeTime / 2500;
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.beginPath(); ctx.arc(spirit.x, spirit.y, canvas.width * chargeRatio, 0, Math.PI * 2); ctx.fill();
    }
    const size = spirit.isFinishing ? 30 : 15;
    const grad = ctx.createRadialGradient(spirit.x, spirit.y, 0, spirit.x, spirit.y, size);
    grad.addColorStop(0, 'white'); grad.addColorStop(.4, 'magenta'); grad.addColorStop(1, 'purple');
    ctx.fillStyle = grad; ctx.shadowBlur = 20; ctx.shadowColor = 'magenta';
    ctx.beginPath(); ctx.arc(spirit.x, spirit.y, size, 0, Math.PI * 2); ctx.fill();

    const barWidth = 40, barHeight = 5;
    const barX = spirit.x - barWidth / 2, barY = spirit.y - size - 15;
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = 'white'; ctx.fillRect(barX, barY, barWidth * (timeRemaining / spirit.duration), barHeight);
    ctx.strokeStyle = 'white'; ctx.strokeRect(barX, barY, barWidth, barHeight);

    if (gloryForJusticeActive) {
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.moveTo(spirit.x - 5, spirit.y - size - 25);
        ctx.lineTo(spirit.x + 5, spirit.y - size - 25);
        ctx.lineTo(spirit.x, spirit.y - size - 35);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function drawBladeArcProjectile(arc) {
    ctx.save();
    const angle = Math.atan2(arc.vy, arc.vx);
    const startAngle = angle - Math.PI / 2, endAngle = angle + Math.PI / 2;
    ctx.strokeStyle = `rgba(173, 255, 47, 1)`; ctx.lineWidth = 5;
    ctx.shadowColor = 'white'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(arc.x, arc.y, arc.radius, startAngle, endAngle); ctx.stroke();
    ctx.restore();
}

function drawBlackHole() {
    ctx.save();
    let angle = blackHole.activeTime / 500;
    ctx.translate(blackHole.x, blackHole.y);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, blackHole.size);
    grad.addColorStop(0, "black"); grad.addColorStop(.8, "purple"); grad.addColorStop(1, "rgba(50,0,50,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    ctx.rotate(angle);
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size * .8, 0, Math.PI * .5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, blackHole.size * .8, Math.PI, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
}

function drawSkillF() {
    const currentTime = performance.now();
    ctx.save();
    ctx.translate(player.x, player.y);
    const radius = Math.max(canvas.width, canvas.height);

    if (skillFState === "charging") {
        let p = (currentTime - skillFChargeStart) / 1500;
        ctx.fillStyle = `rgba(0, 255, 255, ${.1 + p * .2})`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, -Math.PI, 0); ctx.closePath(); ctx.fill()
    }

    if (skillFState === "sweeping") {
        let sweepProgress = (currentTime - skillFSweepStart) / skillFSweepDuration;
        let currentAngle = -Math.PI + Math.PI * sweepProgress;
        ctx.rotate(currentAngle);

        ctx.fillStyle = "white";
        ctx.shadowColor = "cyan";
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, -15);
        ctx.lineTo(radius, 15);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, -40);
        ctx.lineTo(radius, 40);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, Math.random() * 20 - 10);
        ctx.stroke();
    }
    ctx.restore()
}

function drawSkillGBarrier() {
    if (skillGBorderOpacity <= 0) return;

    ctx.save();
    ctx.strokeStyle = `rgba(0, 180, 255, ${skillGBorderOpacity})`;
    ctx.shadowColor = 'cyan';
    ctx.shadowBlur = 30;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, boundaryY - 5);

    ctx.fillStyle = `rgba(0, 50, 80, ${skillGBorderOpacity * 0.2})`;
    ctx.fillRect(0, 0, canvas.width, boundaryY);

    ctx.restore();
}

function drawEnergyOrb(orb) {
    ctx.save();
    const pulse = Math.sin(performance.now() / 200) * 3;
    let radius = orb.size + pulse;
    if (orb.isMerging) {
        const mergeDuration = 500;
        let mergeProgress = (performance.now() - orb.mergeStartTime) / mergeDuration;
        radius = Math.max(0, (orb.size + pulse) * (1 - mergeProgress));
    }

    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.7, 'cyan');
    grad.addColorStop(1, 'blue');

    ctx.fillStyle = grad;
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (!orb.isMerging && orb.linkedTo && orb.id < orb.linkedTo.orb.id) {
        const orb2 = orb.linkedTo.orb;
        if (!orb2) return;

        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = orb.size;
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.moveTo(orb.x, orb.y);
        ctx.lineTo(orb2.x, orb2.y);
        ctx.stroke();

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(orb.x, orb.y);
        ctx.lineTo(orb2.x, orb2.y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawTeslaCoil(coil) {
    ctx.save();
    const rotation = performance.now() / 5000;
    drawPolygon(coil.x, coil.y, coil.auraRadius, 8, rotation, 'rgba(0, 200, 255, 0.1)', 'rgba(0, 100, 150, 0.05)');

    const bodyRadius = coil.size / 2;
    const grad = ctx.createRadialGradient(coil.x, coil.y, 0, coil.x, coil.y, bodyRadius);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.5, '#00FFFF');
    grad.addColorStop(1, '#00AAAA');

    ctx.fillStyle = grad;
    ctx.shadowColor = 'cyan';
    ctx.shadowBlur = 30;

    ctx.beginPath();
    ctx.arc(coil.x, coil.y, bodyRadius, 0, Math.PI * 2);
    ctx.fill();

    if (Math.random() < 0.3) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(coil.x, coil.y);
        const angle = Math.random() * Math.PI * 2;
        const dist = bodyRadius + Math.random() * 20;
        ctx.lineTo(coil.x + Math.cos(angle) * dist, coil.y + Math.sin(angle) * dist);
        ctx.stroke();
    }

    const barWidth = 40, barHeight = 5;
    const barX = coil.x - barWidth / 2, barY = coil.y - coil.size - 10;
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = 'red'; ctx.fillRect(barX, barY, barWidth * (coil.hp / coil.maxHp), barHeight);
    ctx.strokeStyle = '#FFF'; ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.restore();
}

function drawSkillButton(x, y, key, color, cooldown, lastActivation, activeCondition, chargePercent = -1) {
    ctx.save();
    const now = performance.now();
    let isReady = false, remaining = 0;

    if (chargePercent !== -1) {
        isReady = chargePercent >= 100;
        ctx.beginPath();
        ctx.arc(x, y, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333';
        ctx.fill();

        if (chargePercent > 0 && chargePercent < 100) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, btnRadius, Math.PI / 2, Math.PI / 2 + (2 * Math.PI * (chargePercent / 100)), false);
            ctx.closePath();

            const grad = ctx.createRadialGradient(x, y, 0, x, y, btnRadius);
            grad.addColorStop(0, 'white');
            grad.addColorStop(1, color);
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.restore();
        }

        ctx.strokeStyle = isReady ? 'white' : '#666';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (isReady) {
            ctx.save();
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, btnRadius + 5 + Math.sin(performance.now() / 150) * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(key, x, y);
        if (!isReady) {
            ctx.font = "bold 14px Arial";
            ctx.fillText(Math.floor(chargePercent) + "%", x, y + 2);
        }

    } else {
        remaining = Math.max(0, (cooldown - (now - lastActivation)) / 1e3);
        isReady = remaining <= 0 && !activeCondition;

        ctx.beginPath();
        ctx.arc(x, y, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333';
        ctx.fill();
        ctx.strokeStyle = isReady ? 'white' : '#666';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (remaining > 0) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, btnRadius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - remaining * 1e3 / cooldown));
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(key, x, y);
        if (remaining > 0) {
            ctx.font = "bold 16px Arial";
            ctx.fillText(Math.ceil(remaining), x, y + 2);
        }
    }
    ctx.restore()
}

function drawSkillButtons() {
    const baseX = btnMarginLeft + btnRadius, baseY = canvas.height - btnMarginBottom - btnRadius, step = btnRadius * 2 + btnGap;
    const skillAReady = (performance.now() - lastSkillA >= skillACooldown) && skillAOrbs.length < maxSkillAOrbs;
    drawSkillButton(baseX, baseY, 'A', 'blue', skillACooldown, lastSkillA, !skillAReady);
    drawSkillButton(baseX + step, baseY, 'S', 'green', skillSCooldown, lastSkillS, spirits.length >= MAX_SPIRITS);
    drawSkillButton(baseX + 2 * step, baseY, 'D', '#4B0082', skillDCooldown, lastSkillD, skillDCharging || blackHole);
    drawSkillButton(baseX + 3 * step, baseY, 'F', 'red', skillFCooldown, lastSkillF, skillFState !== 'ready');
    drawSkillButton(baseX + 4 * step, baseY, 'G', '#00BCD4', -1, 0, skillGActive, skillGCharge);
}