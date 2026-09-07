// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/misc-mechanics.js — split out of the old monolithic js/skills.js.
// Enemy-side projectile mechanics that live here rather than in
// entities/*.js: Marchosias's own sword-throw blades, and the Soul Reaver
// curse's damage-over-time tick.

// Marchosias Blade, global array, không bị ngắt bởi bất kỳ nguồn nào
function updateMarchosiasBlades(deltaTime) {
    const dt = deltaTime / 16.67;
    for (let i = marchosiasBlades.length - 1; i >= 0; i--) {
        const blade = marchosiasBlades[i];

        // Nếu đang trong warning phase, đếm ngược delay
        if (!blade.active) {
            blade.delay -= deltaTime;
            if (blade.delay <= 0) {
                blade.active = true; // kích hoạt, bắt đầu bay
            }
            continue; // chưa active → không di chuyển, không hit
        }

        // Active, di chuyển bình thường
        blade.x += blade.vx * dt;
        blade.y += blade.vy * dt;

        // Hit player
        if (!blade.hitPlayer && Math.hypot(blade.x - player.x, blade.y - player.y) < blade.radius + player.hitRadius) {
            blade.hitPlayer = true;
            const _yHitsAlready = blade.hitEnemies.length;
            const _yPct = _yHitsAlready === 0 ? 0.27 : _yHitsAlready === 1 ? 0.23 : 0.21;
            if (typeof _yuushaPierceRedirect !== 'function' || !_yuushaPierceRedirect(_yPct, true)) playerTakesHit({ type: 'marchosias' });
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', blade.x, blade.y);
        }
        // Hit sentinel, damage scales down with number of sentinels already hit
        for (const s of sentinels) {
            if (!blade.hitEnemies.includes(s) && Math.hypot(blade.x - s.x, blade.y - s.y) < blade.radius + s.size) {
                // 1st sentinel hit: 30%, 2nd: 28%, 3rd+: 24%
                const hitsAlready = blade.hitEnemies.length;
                const pct = hitsAlready === 0 ? 0.27 : hitsAlready === 1 ? 0.23 : 0.21;
                dealDamage(s, { damage: s.maxHp * pct, _noHitSfx: true, _attackerType: 'marchosias' });
                blade.hitEnemies.push(s);
                addExplosion(s.x, s.y, 20, '#ff6600');
                if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', s.x, s.y);
            }
        }

        // Xóa khi ra ngoài màn hình (chỉ check khi đang bay)
        if (blade.active && (blade.x < -blade.radius || blade.x > canvas.width + blade.radius ||
            blade.y < -blade.radius || blade.y > canvas.height + blade.radius)) {
            marchosiasBlades.splice(i, 1);
        }
    }
}
// Soul Reaver DoT (Cắn nuốt linh hồn)
// Kẻ địch có soulReaver bị trừ 10 base + 5% MaxHP mỗi 0.5 giây (bỏ qua khiên)
function updateSoulReaverDoT(deltaTime) {
    const now = performance.now();
    for (const enemy of enemies) {
        if (!enemy.soulReaver) continue;
        // expiry runs regardless of GfJ so the debuff (and its heal/shield
        // reduction elsewhere) doesn't outlive its 2s duration on its own
        if (enemy.soulReaverEnd && now > enemy.soulReaverEnd) {
            enemy.soulReaver = false;
            continue;
        }
        if (!gloryForJusticeActive) continue; // DoT tick itself only runs with GfJ on
        if (enemy.type === 'embryo') continue; // CC-immune, bypass all status DoTs
        if (!enemy.soulReaverDotTimer) enemy.soulReaverDotTimer = 0;
        enemy.soulReaverDotTimer -= deltaTime;
        if (enemy.soulReaverDotTimer <= 0) {
            enemy.soulReaverDotTimer = 350; // 0.35 giây
            // Sát thương chuẩn bỏ qua khiên, áp thẳng vào HP
            const dotDmg = Math.ceil(60 + (enemy.maxHp || enemy.hp) * 0.055);
            enemy.hp -= dotDmg;
            enemy.hp = Math.max(0, enemy.hp);
            if (enemy.hp <= 0) enemy._markedForDeath = true;
            // Particle nhỏ màu cam để thể hiện DoT
            createParticles(
                enemy.x + (Math.random() - 0.5) * (enemy.size || 20),
                enemy.y + (Math.random() - 0.5) * (enemy.size || 20),
                3, '#FF4500', 1, 3
            );
        }
    }
}

