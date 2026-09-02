// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/skill-shift.js — split out of the old monolithic js/skills.js.
// Skill Shift: Yog-Sothoth Domain teleport execution and cancellation
// (cooldown scaling by hold duration, the on-exit enemy-bullet wipe).

// MỚI: Hàm xử lý dịch chuyển khi dùng Shift
function executeShiftTeleport(direction) {
    if (!skillShiftActive) return;
    let chargeDuration = performance.now() - skillShiftChargeStart;
    let chargeRatio = Math.min(chargeDuration / skillShiftMaxCharge, 1);
    let maxDist = canvas.width / 2; // Tối đa đi được nửa màn hình
    let dist = chargeRatio * maxDist;

    if (direction === 'left') {
        player.x -= dist;
    } else if (direction === 'right') {
        player.x += dist;
    }

    // Giới hạn không cho người chơi bay khỏi màn hình
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));

    // Hiệu ứng dịch chuyển
    addExplosion(player.x, player.y, 60, 'purple');
    createParticles(player.x, player.y, 30, 'magenta', 3, 10);
    _setShake(10, 200);
    if (window.AudioMgr) window.AudioMgr.playSfx('shift-teleport');

    // Teleport used → 9s cooldown
    window._shiftTeleportUsed = true;
    cancelSkillShift();
}

function cancelSkillShift() {
    if (skillShiftActive) {
        const holdDuration = (performance.now() - skillShiftChargeStart) / 1000; // seconds
        skillShiftActive = false;
        window._shiftActive = false;
        if (window.AudioMgr) window.AudioMgr.exitTimeDomain();

        // If teleport (←/→) was used during domain → 9s CD (same as held ≥7s)
        const teleportUsed = !!window._shiftTeleportUsed;
        window._shiftTeleportUsed = false; // reset flag

        let effectiveCD;
        if (teleportUsed || holdDuration >= 7) {
            effectiveCD = 9000;                        // held ≥7s hoặc teleport → 9s (was 11s)
        } else if (holdDuration < 2) {
            effectiveCD = skillShiftCooldown * 0.10;   // −90% → 1.1s
        } else if (holdDuration < 5) {
            effectiveCD = skillShiftCooldown * 0.40;   // −60% → 4.4s
        } else {
            effectiveCD = skillShiftCooldown * 0.90;   // −10% → 9.9s
        }
        lastSkillShift = performance.now() - (skillShiftCooldown - effectiveCD);

        // Xóa tất cả enemy bullet trong vùng phạm vi Shift (bán kính = nửa màn hình)
        const shiftRadius = Math.min(canvas.width, canvas.height) * 0.45;
        enemies = enemies.filter(e => {
            if (!e.type.startsWith('enemy_bullet')) return true;
            return Math.hypot(e.x - player.x, e.y - player.y) > shiftRadius;
        });
    }
}

