// Pisces: Space Journey. (c) 2024 An Nguyen. Licensed under the MIT License.
// Dawn Herald sigil core mechanics: Daybreak Crow timer, expanding light ring,
// bullet clearing, Uriel unstealth, and Daybreak mark tracking.

function _dauCanReceiveDaybreak(e) {
    if (!e || e.hp <= 0) return false;
    if (e.type && e.type.startsWith('enemy_bullet')) return false;
    if (e.type === 'abyssal_chain' || e.type === 'veilshroud_echo' || e.type === 'embryo') return false;
    if (e.inCoronation) return false;
    if (e.type === 'goliath' && typeof _goliathDebuffImmune === 'function' && _goliathDebuffImmune(e)) return false;
    return true;
}

function _dauHasDaybreak(enemy) {
    return !!(enemy && enemy._dauCrowId === window._dauCrowId && window._dauDaybreakMs > 0);
}

function _dauTriggerCrow() {
    window._dauCrowTimer = 0;
    window._dauCrowCounter = (window._dauCrowCounter || 0) + 1;
    window._dauCrowId = window._dauCrowCounter;
    window._dauDaybreakMs = DAU_DAYBREAK_MS;

    const px = (typeof player !== 'undefined' && Number.isFinite(player.x))
        ? player.x
        : ((typeof canvas !== 'undefined' && canvas.width) ? canvas.width / 2 : 400);
    const py = (typeof player !== 'undefined' && Number.isFinite(player.y))
        ? player.y
        : ((typeof canvas !== 'undefined' && canvas.height) ? canvas.height / 2 : 300);
    const maxR = (typeof canvas !== 'undefined' && canvas.width && canvas.height)
        ? Math.hypot(canvas.width, canvas.height)
        : 1000;

    window._dauRings = window._dauRings || [];
    window._dauRings.push({
        x: px,
        y: py,
        radius: 0,
        maxRadius: maxR,
        _hitEnemies: new Set(),
    });
}

function _dauBeginFrame(deltaTime, currentTime) {
    if (typeof _hasBuff !== 'function' || !_hasBuff('kim_ke_bao_hieu')
        || (typeof gameState !== 'undefined' && gameState !== 'playing')
        || (typeof gamePaused !== 'undefined' && gamePaused)
        || (typeof window !== 'undefined' && (window._sigilPicker || window._kanadeCutscene))) return;

    window._dauDaybreakMs = Math.max(0, (window._dauDaybreakMs || 0) - deltaTime);
    window._dauCrowTimer = (window._dauCrowTimer || 0) + deltaTime;
    if (window._dauCrowTimer >= DAU_CROW_INTERVAL_MS) {
        const remainder = window._dauCrowTimer % DAU_CROW_INTERVAL_MS;
        _dauTriggerCrow();
        window._dauCrowTimer = remainder;
    }

    const rings = window._dauRings;
    if (!rings || !rings.length) return;

    for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        const previousRadius = ring.radius;
        ring.radius += DAU_RING_SPEED * deltaTime;

        if (typeof enemies !== 'undefined') {
            for (let j = 0; j < enemies.length; j++) {
                const e = enemies[j];
                if (!e || ring._hitEnemies.has(e)) continue;
                const d = Math.hypot(e.x - ring.x, e.y - ring.y);
                if (d <= ring.radius && (previousRadius === 0 || d > previousRadius)) {
                    ring._hitEnemies.add(e);
                    if (e.type && e.type.startsWith('enemy_bullet')) {
                        e.hp = 0;
                    } else {
                        if (e.type === 'uriel' && e._camoPhase === 'stealthed') {
                            if (!e._camoNextPicked || !Number.isFinite(e._camoNextX) || !Number.isFinite(e._camoNextY)) {
                                const cw = (typeof canvas !== 'undefined' && canvas.width) ? canvas.width : 800;
                                const ch = (typeof canvas !== 'undefined' && canvas.height) ? canvas.height : 600;
                                const es = e.size || 60;
                                e._camoNextPicked = true;
                                e._camoNextX = es / 2 + Math.random() * (cw - es);
                                e._camoNextY = es / 2 + Math.random() * (ch * 0.5 - es);
                            }
                            e._camoTimer = Math.max(e._camoTimer || 0, 1750);
                        }
                        if (_dauCanReceiveDaybreak(e)) {
                            e._dauCrowId = window._dauCrowId;
                        }
                    }
                }
            }
        }

        if (ring.radius >= ring.maxRadius) {
            rings.splice(i, 1);
        }
    }
}

function _dauReset() {
    window._dauCrowTimer = 0;
    window._dauCrowCounter = 0;
    window._dauCrowId = 0;
    window._dauDaybreakMs = 0;
    window._dauRings = [];
    if (typeof enemies !== 'undefined') {
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i]) enemies[i]._dauCrowId = 0;
        }
    }
}

function _drawDauRing() {
    const rings = window._dauRings;
    if (!rings || !rings.length || typeof ctx === 'undefined') return;
    ctx.save();
    ctx.strokeStyle = '#FFD23F';
    ctx.lineWidth = 2;
    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

_dauReset();
