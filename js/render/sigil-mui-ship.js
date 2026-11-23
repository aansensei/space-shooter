// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) ship status and Iron Body beads visual renderer (fx kind 40..44).

const _MUI_MAX_BEADS = 5;
const _muiBeads = [];
for (let i = 0; i < _MUI_MAX_BEADS; i++) {
    _muiBeads.push({
        active: false,
        angleOffset: 0,
        targetOffset: 0,
        x: 0,
        y: 0,
        z: 0
    });
}

let _muiLastIronLayers = 0;
let _muiLastShipTime = 0;
let _muiDomeCanvas = null;

function _muiGetDomeSurface() {
    if (_muiDomeCanvas) return _muiDomeCanvas;
    const w = 160, h = 130;
    const c = _muiSurface(w, h);
    const g = c.getContext('2d');
    const cx = w * 0.5, cy = h * 0.5;
    const rx = 64, ry = 52;
    g.save();
    g.translate(cx, cy);
    g.scale(1, ry / rx);
    const grad = g.createRadialGradient(0, 0, rx * 0.25, 0, 0, rx);
    grad.addColorStop(0, 'rgba(61,219,176,0)');
    grad.addColorStop(0.68, 'rgba(61,219,176,0.18)');
    grad.addColorStop(0.92, 'rgba(234,247,242,0.36)');
    grad.addColorStop(1, 'rgba(61,219,176,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, rx, 0, MUI_TAU);
    g.fill();
    g.restore();
    _muiDomeCanvas = c;
    return c;
}

function _muiLerpAngle(curr, target, rate) {
    let diff = (target - curr) % MUI_TAU;
    if (diff < -Math.PI) diff += MUI_TAU;
    if (diff > Math.PI) diff -= MUI_TAU;
    return curr + diff * rate;
}

function _muiSpawnBeadBreakFx(bx, by, px, py, gfx) {
    const shardCount = gfx < 2 ? 10 : 5;
    for (let s = 0; s < shardCount; s++) {
        const shardAngle = (s / shardCount) * MUI_TAU + (Math.random() * 0.4 - 0.2);
        const speed = 0.14 + Math.random() * 0.24;
        const vx = Math.cos(shardAngle) * speed;
        const vy = Math.sin(shardAngle) * speed;
        const life = 340 + Math.random() * 180;
        const scale = 0.8 + Math.random() * 0.5;
        _muiEmitFxHelper(41, bx, by, life, scale, shardAngle, vx, vy);
    }
    _muiEmitFxHelper(42, px, py, 360, 1.0, 0, 0, 0);
    if (gfx < 2) {
        for (let m = 0; m < 4; m++) {
            const a = Math.random() * MUI_TAU;
            const sp = 0.05 + Math.random() * 0.08;
            _muiEmitFxHelper(40, bx, by, 260 + Math.random() * 140, 1.0, a, Math.cos(a) * sp, Math.sin(a) * sp);
        }
    }
}

function _drawMuiShipParticles(gfx) {
    if (!window._muiFx) return;
    const pool = window._muiFx;
    const max = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : pool.length;
    for (let i = 0; i < max; i++) {
        const fx = pool[i];
        if (!fx || !fx.active) continue;
        if (fx.kind < 40 || fx.kind > 44) continue;
        const p = _muiClamp(fx.age / fx.life, 0, 1);

        if (fx.kind === 41) {
            // Bead shattering crystal shard
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.angle + fx.age * 0.009);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            const scale = fx.scale * (1 - p * 0.35);
            ctx.globalAlpha = (1 - p) * 0.95;

            const len = 9 * scale;
            const w = 3.8 * scale;
            ctx.fillStyle = (i % 2 === 0) ? '#EAF7F2' : '#3DDBB0';
            ctx.beginPath();
            ctx.moveTo(len, 0);
            ctx.lineTo(0, -w);
            ctx.lineTo(-len * 0.65, 0);
            ctx.lineTo(0, w);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        } else if (fx.kind === 42) {
            // Secondary protective dome shockwave ring
            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            const radX = (45 + p * 62) * fx.scale;
            const radY = (34 + p * 46) * fx.scale;
            ctx.globalAlpha = (1 - p) * 0.82;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 2.0 * (1 - p);
            ctx.beginPath();
            ctx.ellipse(0, 0, radX, radY, 0, 0, MUI_TAU);
            ctx.stroke();
            ctx.strokeStyle = '#EAF7F2';
            ctx.lineWidth = 1.0 * (1 - p);
            ctx.beginPath();
            ctx.ellipse(0, 0, radX * 0.86, radY * 0.86, 0, 0, MUI_TAU);
            ctx.stroke();
            ctx.restore();
        } else if (fx.kind === 40 && gfx < 2) {
            // Comet tail mote and floating spark
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - p) * 0.85;
            ctx.fillStyle = (i % 3 === 0) ? '#EAF7F2' : '#3DDBB0';
            ctx.beginPath();
            ctx.arc(0, 0, 2.2 * fx.scale * (1 - p * 0.5), 0, MUI_TAU);
            ctx.fill();
            ctx.restore();
        } else if (fx.kind === 44 && gfx < 2) {
            // Shield absorption flash flare
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - p) * 0.9;
            const fl = (1 - p) * 28 * fx.scale;
            ctx.fillStyle = '#EAF7F2';
            ctx.beginPath();
            ctx.moveTo(fl, 0); ctx.lineTo(0, -3); ctx.lineTo(-fl, 0); ctx.lineTo(0, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
}

function _drawMuiShipStatus() {
    if (typeof player === 'undefined' || !player) return;
    if (typeof _hasBuff !== 'function' || !_hasBuff('quy_mon_diem_quan')) return;
    const S = _muiSprites();
    const gfx = _muiGfxTier();
    const reduced = _muiReducedMotion();
    const t = window._muiClock || 0;
    let dt = _muiLastShipTime > 0 ? (t - _muiLastShipTime) : 16;
    if (dt <= 0 || dt > 100) dt = 16;
    _muiLastShipTime = t;

    // 1. Brief jade flash on ship when Legion is called
    if (window._muiShipFlashMs > 0) {
        const fp = _muiClamp(window._muiShipFlashMs / 340, 0, 1);
        ctx.save();
        if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fp * 0.78;
        const rad = 52 + (1 - fp) * 34;
        ctx.drawImage(S.jadeGlow, player.x - rad, player.y - rad, rad * 2, rad * 2);
        ctx.restore();
    }

    // 2. While Legion runs: rotating talisman ritual circle under ship
    const remainMs = window._muiRemainMs || 0;
    if (remainMs > 0) {
        const legionMs = typeof MUI_LEGION_MS !== 'undefined' ? MUI_LEGION_MS : 5000;
        const frac = _muiClamp(remainMs / legionMs, 0, 1);
        const groundImg = _muiFxImg('call-sigil');
        ctx.save();
        if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
        if (groundImg) {
            ctx.translate(player.x, player.y);
            ctx.rotate(t * 0.0009);
            ctx.globalAlpha = 0.34 * (0.7 + 0.3 * frac);
            ctx.drawImage(groundImg, -110, -110, 220, 220);
            ctx.rotate(-t * 0.0009);
            ctx.translate(-player.x, -player.y);
        }
        // Fallback countdown arc if N4 B has not rendered exquisite arc yet
        if (typeof window._muiShipFxArcActive === 'undefined' || !window._muiShipFxArcActive) {
            ctx.globalAlpha = 0.85;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(player.x, player.y, (player.width || 44) * 0.92 + 16, -Math.PI / 2, -Math.PI / 2 + frac * MUI_TAU);
            ctx.stroke();
        }
        ctx.restore();
    }

    // 3. Orbiting Iron Body beads with luminous comet tails
    const currentLayers = (typeof window._muiIronLayers === 'number' && window._muiIronLayers > 0) ? window._muiIronLayers : 0;
    const orbitRx = (player.width || 44) * 0.98;
    const orbitRy = (player.height || 44) * 0.60;
    const baseAngle = t * 0.0032;

    // Detect layer transitions
    if (currentLayers > _muiLastIronLayers) {
        // Layers restored or Legion activated: distribute evenly
        const step = MUI_TAU / currentLayers;
        for (let i = 0; i < currentLayers; i++) {
            _muiBeads[i].active = true;
            _muiBeads[i].angleOffset = i * step;
            _muiBeads[i].targetOffset = i * step;
            const a = baseAngle + _muiBeads[i].angleOffset;
            _muiBeads[i].x = player.x + Math.cos(a) * orbitRx;
            _muiBeads[i].y = player.y + Math.sin(a) * orbitRy;
            _muiBeads[i].z = Math.sin(a);
        }
        for (let i = currentLayers; i < _MUI_MAX_BEADS; i++) {
            _muiBeads[i].active = false;
        }
        _muiLastIronLayers = currentLayers;
    } else if (currentLayers < _muiLastIronLayers) {
        if (currentLayers === 0 && ((window._muiRemainMs || 0) <= 0 || (window._muiIronBreakMs || 0) === 0)) {
            for (let i = 0; i < _MUI_MAX_BEADS; i++) {
                _muiBeads[i].active = false;
            }
            _muiLastIronLayers = 0;
        } else {
        // One or more layers lost: spawn shatter effects and rebalance surviving beads
        while (_muiLastIronLayers > currentLayers) {
            let brokenIdx = (typeof window._muiLastBrokenSlot === 'number' && window._muiLastBrokenSlot >= 0 && window._muiLastBrokenSlot < _muiLastIronLayers)
                ? window._muiLastBrokenSlot
                : (_muiLastIronLayers - 1);
            if (brokenIdx >= _muiLastIronLayers) brokenIdx = _muiLastIronLayers - 1;

            let bx = _muiBeads[brokenIdx].x;
            let by = _muiBeads[brokenIdx].y;
            if (bx === 0 && by === 0) {
                const ba = baseAngle + _muiBeads[brokenIdx].angleOffset;
                bx = player.x + Math.cos(ba) * orbitRx;
                by = player.y + Math.sin(ba) * orbitRy;
            }
            _muiSpawnBeadBreakFx(bx, by, player.x, player.y, gfx);

            // Shift surviving beads down to keep cyclic ordering
            for (let j = brokenIdx; j < _muiLastIronLayers - 1; j++) {
                _muiBeads[j].angleOffset = _muiBeads[j + 1].angleOffset;
                _muiBeads[j].targetOffset = _muiBeads[j + 1].targetOffset;
                _muiBeads[j].x = _muiBeads[j + 1].x;
                _muiBeads[j].y = _muiBeads[j + 1].y;
                _muiBeads[j].z = _muiBeads[j + 1].z;
            }
            _muiLastIronLayers--;
        }
        for (let j = currentLayers; j < _MUI_MAX_BEADS; j++) {
            _muiBeads[j].active = false;
        }

        // Compute optimal balanced target offsets minimizing angular displacement
        if (currentLayers > 0) {
            let sumCos = 0;
            let sumSin = 0;
            const step = MUI_TAU / currentLayers;
            for (let j = 0; j < currentLayers; j++) {
                const diff = _muiBeads[j].angleOffset - j * step;
                sumCos += Math.cos(diff);
                sumSin += Math.sin(diff);
            }
            const anchor = Math.atan2(sumSin, sumCos);
            for (let j = 0; j < currentLayers; j++) {
                let tgt = anchor + j * step;
                while (tgt < 0) tgt += MUI_TAU;
                while (tgt >= MUI_TAU) tgt -= MUI_TAU;
                _muiBeads[j].targetOffset = tgt;
            }
        }
        }
    }

    // Faint jade orbital guide ellipse
    if (currentLayers > 0 && gfx < 2) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = '#3DDBB0';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(player.x, player.y, orbitRx, orbitRy, 0, 0, MUI_TAU);
        ctx.stroke();
        ctx.restore();
    }

    // Update and draw active orbiting beads
    if (currentLayers > 0) {
        const lerpRate = Math.min(1.0, dt * 0.0075);
        const orbImg = _muiFxImg('iron-orb');

        for (let i = 0; i < currentLayers; i++) {
            const b = _muiBeads[i];
            b.angleOffset = _muiLerpAngle(b.angleOffset, b.targetOffset, lerpRate);
            const a = baseAngle + b.angleOffset;
            const z = Math.sin(a);
            const sZ = 0.88 + 0.22 * (z + 1.0) * 0.5;
            const bx = player.x + Math.cos(a) * orbitRx;
            const by = player.y + Math.sin(a) * orbitRy;
            b.x = bx;
            b.y = by;
            b.z = z;

            // Luminous comet tail and aura glow trailing along elliptical orbit behind bead
            if (gfx < 2) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                if (!reduced) {
                    // Outer jade comet tail stroke
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    for (let k = 1; k <= 5; k++) {
                        const ak = a - k * 0.065;
                        ctx.lineTo(player.x + Math.cos(ak) * orbitRx, player.y + Math.sin(ak) * orbitRy);
                    }
                    ctx.strokeStyle = '#3DDBB0';
                    ctx.lineWidth = 3.2 * sZ;
                    ctx.globalAlpha = 0.52 * (0.8 + 0.2 * z);
                    ctx.stroke();

                    // Inner bone-white core stroke
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    for (let k = 1; k <= 3; k++) {
                        const ak = a - k * 0.055;
                        ctx.lineTo(player.x + Math.cos(ak) * orbitRx, player.y + Math.sin(ak) * orbitRy);
                    }
                    ctx.strokeStyle = '#EAF7F2';
                    ctx.lineWidth = 1.6 * sZ;
                    ctx.globalAlpha = 0.74 * (0.8 + 0.2 * z);
                    ctx.stroke();
                }

                // Bead aura glow
                ctx.globalAlpha = 0.75 * (0.8 + 0.2 * z);
                const glowSz = 26 * sZ;
                ctx.drawImage(S.jadeGlow, bx - glowSz * 0.5, by - glowSz * 0.5, glowSz, glowSz);
                ctx.restore();
            }

            // Bead core
            if (orbImg) {
                const orbSz = 20 * sZ;
                ctx.drawImage(orbImg, bx - orbSz * 0.5, by - orbSz * 0.5, orbSz, orbSz);
            } else {
                ctx.save();
                ctx.fillStyle = '#3DDBB0';
                ctx.beginPath();
                ctx.arc(bx, by, 4.6 * sZ, 0, MUI_TAU);
                ctx.fill();
                ctx.fillStyle = '#EAF7F2';
                ctx.beginPath();
                ctx.arc(bx, by, 2.2 * sZ, 0, MUI_TAU);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(bx - 1.2 * sZ, by - 1.2 * sZ, 1.0 * sZ, 0, MUI_TAU);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // 4. Protective dome flash and shockwave ripples when blocking damage
    if (window._muiIronBreakMs > 0) {
        const breakMs = window._muiIronBreakMs;
        const p = _muiClamp(1 - breakMs / 360, 0, 1);
        const easeP = _muiEaseOutQuad(p);
        const domeRx = (player.width || 44) * 1.22 + 10;
        const domeRy = (player.height || 44) * 0.95 + 10;

        ctx.save();
        if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

        // Translucent protective dome fill using pre-baked surface
        const domeSurf = _muiGetDomeSurface();
        ctx.globalAlpha = 1 - p;
        ctx.drawImage(domeSurf, player.x - domeRx, player.y - domeRy, domeRx * 2, domeRy * 2);

        // Luminous dome contour rings
        ctx.strokeStyle = '#EAF7F2';
        ctx.lineWidth = 2.4 * (1 - p * 0.6);
        ctx.globalAlpha = (1 - p) * 0.92;
        ctx.beginPath();
        ctx.ellipse(player.x, player.y, domeRx, domeRy, 0, 0, MUI_TAU);
        ctx.stroke();

        ctx.strokeStyle = '#3DDBB0';
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = (1 - p) * 0.68;
        ctx.beginPath();
        ctx.ellipse(player.x, player.y, domeRx * 0.94, domeRy * 0.94, 0, 0, MUI_TAU);
        ctx.stroke();

        // Dome talisman grid facets when gfx < 2
        if (gfx < 2) {
            ctx.strokeStyle = '#C9A24A';
            ctx.globalAlpha = 0.45 * (1 - p);
            ctx.lineWidth = 1.0;
            for (let m = -1; m <= 1; m += 2) {
                ctx.beginPath();
                ctx.ellipse(player.x, player.y, domeRx * 0.52, domeRy * 0.88, m * 0.22, 0, MUI_TAU);
                ctx.stroke();
            }
        }

        // Outward spreading shockwave ripples
        const waveRx = domeRx + easeP * 54;
        const waveRy = domeRy + easeP * 38;
        ctx.strokeStyle = '#3DDBB0';
        ctx.lineWidth = 2.4 * (1 - p);
        ctx.globalAlpha = (1 - p) * 0.85;
        ctx.beginPath();
        ctx.ellipse(player.x, player.y, waveRx, waveRy, 0, 0, MUI_TAU);
        ctx.stroke();

        ctx.strokeStyle = '#EAF7F2';
        ctx.lineWidth = 1.2 * (1 - p);
        ctx.globalAlpha = (1 - p) * 0.70;
        ctx.beginPath();
        ctx.ellipse(player.x, player.y, waveRx * 0.88, waveRy * 0.88, 0, 0, MUI_TAU);
        ctx.stroke();

        ctx.restore();
    }

    // 5. Render active particle pool items for kinds 40..44
    _drawMuiShipParticles(gfx);
}