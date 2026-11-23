// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) Soul Qi meter visual renderer (fx kind 50..54).

let _muiMeterLastQi = 0;
let _muiMeterLastReady = false;
let _muiMeterGainFlash = 0;
let _muiMeterLastTime = 0;
let _muiMeterPulseTimer = 0;
let _muiMeterDrainTimer = 0;
let _muiMeterGrads = null;
let _muiGleamGradNormal = null;
let _muiGleamGradBright = null;
let _muiSkullEyeGlow = null;

function _muiGetMeterGrad(ctx, hh, hw, mode) {
    if (!_muiMeterGrads) {
        _muiMeterGrads = {};
        let g0 = ctx.createLinearGradient(0, hh, 0, 0);
        g0.addColorStop(0, '#072a28');
        g0.addColorStop(0.45, '#135752');
        g0.addColorStop(0.85, '#3DDBB0');
        g0.addColorStop(1, '#8ef5d8');
        _muiMeterGrads.t0_normal = g0;

        let g0b = ctx.createLinearGradient(0, hh, 0, 0);
        g0b.addColorStop(0, '#072a28');
        g0b.addColorStop(0.45, '#135752');
        g0b.addColorStop(0.85, '#7ef0cf');
        g0b.addColorStop(1, '#EAF7F2');
        _muiMeterGrads.t0_bright = g0b;

        let g0a = ctx.createLinearGradient(0, hh, 0, 0);
        g0a.addColorStop(0, '#072a28');
        g0a.addColorStop(0.45, '#135752');
        g0a.addColorStop(0.85, '#3DDBB0');
        g0a.addColorStop(1, '#8ef5d8');
        _muiMeterGrads.t0_active = g0a;

        let g1 = ctx.createLinearGradient(0, hh, 0, 0);
        g1.addColorStop(0, '#0B3B3A');
        g1.addColorStop(0.55, '#3DDBB0');
        g1.addColorStop(1, '#7ef0cf');
        _muiMeterGrads.t1_normal = g1;

        let g1b = ctx.createLinearGradient(0, hh, 0, 0);
        g1b.addColorStop(0, '#0B3B3A');
        g1b.addColorStop(0.55, '#3DDBB0');
        g1b.addColorStop(1, '#EAF7F2');
        _muiMeterGrads.t1_bright = g1b;

        let g2 = ctx.createLinearGradient(0, 0, hw, 0);
        g2.addColorStop(0, '#0B3B3A');
        g2.addColorStop(0.55, '#3DDBB0');
        g2.addColorStop(1, '#7ef0cf');
        _muiMeterGrads.t2_normal = g2;

        let g2b = ctx.createLinearGradient(0, 0, hw, 0);
        g2b.addColorStop(0, '#0B3B3A');
        g2b.addColorStop(0.55, '#3DDBB0');
        g2b.addColorStop(1, '#EAF7F2');
        _muiMeterGrads.t2_bright = g2b;
    }
    return _muiMeterGrads[mode];
}

function _muiGetGleamGrad(ctx, bright) {
    if (bright) {
        if (!_muiGleamGradBright) {
            let g = ctx.createLinearGradient(-4, 0, 2, 0);
            g.addColorStop(0, 'rgba(61,219,176,0)');
            g.addColorStop(0.65, 'rgba(234,247,242,0.95)');
            g.addColorStop(1, 'rgba(61,219,176,0)');
            _muiGleamGradBright = g;
        }
        return _muiGleamGradBright;
    }
    if (!_muiGleamGradNormal) {
        let g = ctx.createLinearGradient(-4, 0, 2, 0);
        g.addColorStop(0, 'rgba(61,219,176,0)');
        g.addColorStop(0.65, 'rgba(142,245,216,0.85)');
        g.addColorStop(1, 'rgba(61,219,176,0)');
        _muiGleamGradNormal = g;
    }
    return _muiGleamGradNormal;
}

function _muiGetSkullEyeGlow() {
    if (_muiSkullEyeGlow) return _muiSkullEyeGlow;
    const c = _muiSurface(16, 16);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(8, 8, 0.5, 8, 8, 4.5);
    grad.addColorStop(0, 'rgba(234,247,242,0.95)');
    grad.addColorStop(0.4, 'rgba(61,219,176,0.75)');
    grad.addColorStop(1, 'rgba(11,59,58,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(8, 8, 4.5, 0, MUI_TAU);
    g.fill();
    _muiSkullEyeGlow = c;
    return c;
}

function _drawMuiMeter() {
    if (typeof _hasBuff !== 'function' || !_hasBuff('quy_mon_diem_quan') || typeof player === 'undefined') return;
    const S = _muiSprites();
    const gfx = _muiGfxTier();
    const reduced = _muiReducedMotion();
    const t = window._muiClock || 0;
    const w = MUI_METER_W;
    const h = w * MUI_METER_ASPECT;

    // Stack above Cancer, Leo, and Capricorn meters without overlapping any of them
    const tidal = _hasBuff('trieu_hoi') && typeof TIDAL_METER_FRAME_ASPECT !== 'undefined' ? 110 * TIDAL_METER_FRAME_ASPECT + 6 : 0;
    const leo = typeof _leoHasFateMeter === 'function' && _leoHasFateMeter() && typeof LEO_METER_FRAME_ASPECT !== 'undefined' ? 110 * LEO_METER_FRAME_ASPECT + 6 : 0;
    const cap = _hasBuff('thai_son_ap_dinh') && typeof CAP_METER_ASPECT !== 'undefined' ? 110 * CAP_METER_ASPECT + 6 : 0;

    const x = player.x - w * 0.5;
    const y = player.y - (player.height || 40) * 0.5 - h - 6 - (window._greatSageFrameClearance || 0) - tidal - leo - cap;
    const hx = x + w * MUI_METER_HOLE.x0;
    const hy = y + h * MUI_METER_HOLE.y0;
    const hw = w * (MUI_METER_HOLE.x1 - MUI_METER_HOLE.x0);
    const hh = h * (MUI_METER_HOLE.y1 - MUI_METER_HOLE.y0);

    const active = (window._muiRemainMs || 0) > 0;
    const windup = window._muiWindupMs > 0;
    const legionMs = typeof MUI_LEGION_MS !== 'undefined' ? MUI_LEGION_MS : 5000;
    const qiMax = typeof MUI_QI_MAX !== 'undefined' ? MUI_QI_MAX : 100;
    const curQi = window._muiQi || 0;
    const fill = windup ? 1 : active
        ? _muiClamp(window._muiRemainMs / legionMs, 0, 1)
        : _muiClamp(curQi / qiMax, 0, 1);
    const ready = !!window._muiReady || (!active && !windup && curQi >= qiMax);
    const bright = ready || windup;
    const breath = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * (windup ? 0.03 : 0.0065));

    // Time step delta calculation for smooth flash decay
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = _muiMeterLastTime > 0 ? Math.min(100, Math.max(0, now - _muiMeterLastTime)) : 16;
    _muiMeterLastTime = now;

    // Detect Soul Qi gain for luminous flash and splash motes (meaningful gain >= 0.5 Qi)
    if (curQi - _muiMeterLastQi >= 0.5) {
        _muiMeterGainFlash = 1.0;
        if (gfx < 2 && !reduced) {
            const splashX = hx + hw * fill;
            const splashY = hy + hh * 0.5;
            _muiEmitFxHelper(50, splashX, splashY, 320, 1.0, 0, -0.04, -0.06);
            _muiEmitFxHelper(50, splashX, splashY, 280, 0.8, 0, 0.04, -0.05);
        }
    }
    _muiMeterLastQi = curQi;

    if (_muiMeterGainFlash > 0) {
        _muiMeterGainFlash = Math.max(0, _muiMeterGainFlash - dt * 0.0035);
    }

    // Detect full charge transition: outward resonance pulse ring and skull flare
    if (ready && !_muiMeterLastReady) {
        _muiMeterLastReady = true;
        _muiMeterGainFlash = 1.0;
        if (!reduced) {
            _muiEmitFxHelper(52, x + w * 0.5, y + h * 0.5, 520, 1.2, 0, 0, 0);
            if (gfx < 2) {
                _muiEmitFxHelper(51, x + w * 0.5 - 4.5, y + h * 0.22, 420, 1.0, 0, 0, -0.04);
                _muiEmitFxHelper(51, x + w * 0.5 + 4.5, y + h * 0.22, 420, 1.0, 0, 0, -0.04);
            }
        }
    } else if (!ready && _muiMeterLastReady) {
        _muiMeterLastReady = false;
    }

    // Periodic resonance pulse while awaiting release
    if (ready && !active && !windup && !reduced && gfx < 2) {
        _muiMeterPulseTimer += dt;
        if (_muiMeterPulseTimer >= 1200) {
            _muiMeterPulseTimer = 0;
            _muiEmitFxHelper(52, x + w * 0.5, y + h * 0.5, 480, 0.9, 0, 0, 0);
        }
        // Periodic flame motes from skull eye sockets
        if (Math.random() < 0.18) {
            const side = Math.random() < 0.5 ? -4.5 : 4.5;
            _muiEmitFxHelper(51, x + w * 0.5 + side, y + h * 0.22, 340, 0.8, 0, 0, -0.035);
        }
    } else {
        _muiMeterPulseTimer = 0;
    }

    // Active countdown drain vapor during Legion
    if (active && !reduced && gfx < 2) {
        _muiMeterDrainTimer += dt;
        if (_muiMeterDrainTimer >= 80) {
            _muiMeterDrainTimer = 0;
            const drainX = hx + hw * fill;
            const drainY = hy + hh * (0.2 + 0.6 * Math.random());
            _muiEmitFxHelper(53, drainX, drainY, 360, 1.0, 0, -0.02, -0.05);
        }
    } else {
        _muiMeterDrainTimer = 0;
    }

    // Draw active fx particles for kinds 50 to 54
    _drawMuiMeterParticles(gfx);

    // Breathing jade glow behind meter when ready or active
    if ((bright || active) && gfx < 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = bright ? (0.28 + 0.24 * breath) : 0.22;
        ctx.drawImage(S.jadeGlow, x - 16, y - 10, w + 32, h + 20);
        ctx.restore();
    }

    // Meter fill inside frozen frame window
    ctx.save();
    ctx.translate(hx, hy);
    ctx.beginPath();
    ctx.rect(0, 0, hw, hh);
    ctx.clip();

    // Dark reservoir floor
    ctx.fillStyle = '#061616';
    ctx.fillRect(0, 0, hw, hh);

    const fw = hw * fill;
    if (fw > 0.5) {
        // Liquid flowing Qi fill effect
        if (gfx === 0 && !reduced) {
            // Tier 0: Dual harmonic wave layers for fluid viscosity and depth
            // Back wave: darker deep teal
            ctx.fillStyle = 'rgba(20,84,78,0.55)';
            ctx.beginPath();
            ctx.moveTo(0, hh);
            for (let px = 0; px <= fw; px += 4) {
                const waveBack = Math.sin(t * 0.007 + px * 0.14) * 1.5;
                ctx.lineTo(px, 2.0 + waveBack);
            }
            ctx.lineTo(fw, hh);
            ctx.closePath();
            ctx.fill();

            // Front wave: radiant jade to bone white gradient
            const gradMode = active ? 't0_active' : (bright ? 't0_bright' : 't0_normal');
            ctx.fillStyle = _muiGetMeterGrad(ctx, hh, hw, gradMode);

            ctx.beginPath();
            ctx.moveTo(0, hh);
            for (let px = 0; px <= fw; px += 3) {
                const waveFront = Math.sin(t * 0.011 + px * 0.18 + 1.2) * 1.2;
                ctx.lineTo(px, 1.2 + waveFront);
            }
            ctx.lineTo(fw, hh);
            ctx.closePath();
            ctx.fill();

            // Luminous surface crest line along top of fluid
            ctx.strokeStyle = bright ? 'rgba(234,247,242,0.85)' : 'rgba(142,245,216,0.65)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let px = 0; px <= fw; px += 3) {
                const waveFront = Math.sin(t * 0.011 + px * 0.18 + 1.2) * 1.2;
                if (px === 0) ctx.moveTo(px, 1.2 + waveFront);
                else ctx.lineTo(px, 1.2 + waveFront);
            }
            ctx.stroke();

            // Advancing or draining meniscus vertical gleam
            ctx.save();
            ctx.translate(fw, 0);
            ctx.fillStyle = _muiGetGleamGrad(ctx, bright);
            ctx.fillRect(-3, 0, 5, hh);
            ctx.restore();

            // Micro bubbles rising within fluid
            ctx.fillStyle = 'rgba(234,247,242,0.65)';
            for (let b = 0; b < 4; b++) {
                const bx = ((b * 22 + t * 0.025) % Math.max(1, fw - 4)) + 2;
                const by = hh - 2 - ((t * 0.035 + b * 6) % (hh - 3));
                ctx.fillRect(bx, by, 1.2, 1.2);
            }
        } else if (gfx === 1 || reduced) {
            // Tier 1 / Reduced Motion: single smooth wave or clean fill
            const gradMode = bright ? 't1_bright' : 't1_normal';
            ctx.fillStyle = _muiGetMeterGrad(ctx, hh, hw, gradMode);

            if (!reduced) {
                ctx.beginPath();
                ctx.moveTo(0, hh);
                for (let px = 0; px <= fw; px += 5) {
                    const wave = Math.sin(t * 0.009 + px * 0.16) * 1.0;
                    ctx.lineTo(px, 1.2 + wave);
                }
                ctx.lineTo(fw, hh);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, fw, hh);
            }

            // Meniscus highlight
            ctx.fillStyle = bright ? 'rgba(234,247,242,0.8)' : 'rgba(142,245,216,0.6)';
            ctx.fillRect(fw - 2, 0, 3, hh);
        } else {
            // Tier 2 (Low / Mobile perf): direct rect fill
            const gradMode = bright ? 't2_bright' : 't2_normal';
            ctx.fillStyle = _muiGetMeterGrad(ctx, hh, hw, gradMode);
            ctx.fillRect(0, 0, fw, hh);
        }

        // Luminous flash wash on Soul Qi gain
        if (_muiMeterGainFlash > 0) {
            ctx.fillStyle = 'rgba(234,247,242,' + (0.42 * _muiMeterGainFlash) + ')';
            ctx.fillRect(0, 0, fw, hh);
        }

        // Windup surge illumination
        if (windup) {
            ctx.fillStyle = 'rgba(234,247,242,' + (0.15 + 0.35 * breath) + ')';
            ctx.fillRect(0, 0, fw, hh);
        }

        // 10 delicate calibration division ticks across frame window
        for (let k = 1; k < 10; k++) {
            const tx = (hw * k) / 10;
            ctx.fillStyle = (tx <= fw) ? 'rgba(201,162,74,0.32)' : 'rgba(61,219,176,0.12)';
            ctx.fillRect(tx, 2, 1, hh - 4);
        }

        // Moving luminous sheen across filled portion
        if (gfx < 2 && !reduced) {
            const sheenX = ((t * 0.045) % (hw + 28)) - 14;
            if (sheenX < fw) {
                const sheenW = Math.min(10, fw - sheenX);
                if (sheenW > 0) {
                    ctx.fillStyle = 'rgba(234,247,242,0.45)';
                    ctx.fillRect(sheenX, 0, sheenW, hh);
                }
            }
        }
    }
    ctx.restore();

    // Frame PNG or stylized bronze jade fallback frame
    if (_muiImgReady(_muiFrameImg)) {
        ctx.drawImage(_muiFrameImg, x, y, w, h);
    } else {
        ctx.save();
        ctx.strokeStyle = ready ? '#EAF7F2' : '#3DDBB0';
        ctx.lineWidth = ready ? (1.8 + 0.8 * breath) : 1.5;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(hx - 2, hy - 2, hw + 4, hh + 4, 4);
            ctx.stroke();
        } else {
            ctx.strokeRect(hx - 2, hy - 2, hw + 4, hh + 4);
        }
        // Subtle bronze corner ticks
        ctx.fillStyle = '#C9A24A';
        ctx.fillRect(hx - 3, hy - 3, 4, 4);
        ctx.fillRect(hx + hw - 1, hy - 3, 4, 4);
        ctx.fillRect(hx - 3, hy + hh - 1, 4, 4);
        ctx.fillRect(hx + hw - 1, hy + hh - 1, 4, 4);
        ctx.restore();
    }

    // Goat skull eye sockets ignite with jade flame when ready or during windup
    if ((ready || windup) && gfx < 2) {
        _drawMuiSkullFlames(x + w * 0.5, y + h * 0.22, t, breath, reduced);
    }
}

// Dancing jade spirit flames in goat skull eye sockets
function _drawMuiSkullFlames(cx, cy, t, breath, reduced) {
    ctx.save();
    const eyeOffsetX = 4.5;
    for (let side = -1; side <= 1; side += 2) {
        const ex = cx + side * eyeOffsetX;
        const ey = cy;
        const flH = reduced ? 6 : (5.5 + 2.5 * Math.sin(t * 0.022 + side * 1.8));

        // Soft radial glow at socket using pre-baked surface
        const eyeGlow = _muiGetSkullEyeGlow();
        ctx.drawImage(eyeGlow, ex - 8, ey - 8, 16, 16);

        // Flickering flame tongue
        if (!reduced) {
            ctx.beginPath();
            ctx.moveTo(ex - 1.5, ey);
            const curl = Math.sin(t * 0.03 + side) * 1.2;
            ctx.quadraticCurveTo(ex - 1.8, ey - flH * 0.5, ex + curl, ey - flH);
            ctx.quadraticCurveTo(ex + 1.8, ey - flH * 0.5, ex + 1.5, ey);
            ctx.closePath();
            ctx.fillStyle = 'rgba(61,219,176,0.85)';
            ctx.fill();

            // Hot white core
            ctx.beginPath();
            ctx.moveTo(ex - 0.8, ey);
            ctx.quadraticCurveTo(ex - 0.8, ey - flH * 0.35, ex + curl * 0.5, ey - flH * 0.6);
            ctx.quadraticCurveTo(ex + 0.8, ey - flH * 0.35, ex + 0.8, ey);
            ctx.closePath();
            ctx.fillStyle = 'rgba(234,247,242,0.9)';
            ctx.fill();
        }
    }
    ctx.restore();
}

// Particle renderer for N5 fx kinds 50 to 54
function _drawMuiMeterParticles(gfx) {
    if (typeof window === 'undefined' || !window._muiFx) return;
    const pool = window._muiFx;
    const max = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : pool.length;

    for (let i = 0; i < max; i++) {
        const fx = pool[i];
        if (!fx || !fx.active || fx.kind < 50 || fx.kind > 54) continue;
        const p = _muiClamp(fx.age / fx.life, 0, 1);

        if (fx.kind === 50) {
            // Soul Qi gain splash mote
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalAlpha = (1 - p) * 0.9;
            ctx.fillStyle = '#EAF7F2';
            const sz = (1.4 - p * 0.7) * (fx.scale || 1) * 2.8;
            ctx.beginPath();
            ctx.arc(0, 0, sz, 0, MUI_TAU);
            ctx.fill();
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        } else if (fx.kind === 51) {
            // Goat skull eye flame mote
            const curl = Math.sin(p * 8 + (fx.seed || 0)) * 2;
            const sz = (1 - p) * 3.2 * (fx.scale || 1);
            ctx.save();
            ctx.translate(fx.x + curl, fx.y);
            ctx.globalAlpha = (1 - p) * 0.85;
            ctx.fillStyle = p < 0.35 ? '#EAF7F2' : (p < 0.75 ? '#3DDBB0' : '#0B3B3A');
            ctx.beginPath();
            ctx.arc(0, 0, sz, 0, MUI_TAU);
            ctx.fill();
            ctx.restore();
        } else if (fx.kind === 52) {
            // Full charge resonance outward pulse ring
            const rad = 14 + p * 54;
            ctx.save();
            ctx.globalAlpha = (1 - p) * 0.8;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 2.4 * (1 - p * 0.6);
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, rad, 0, MUI_TAU);
            ctx.stroke();
            if (gfx < 2) {
                ctx.strokeStyle = '#C9A24A';
                ctx.lineWidth = 1.2 * (1 - p);
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, rad * 0.88, 0, MUI_TAU);
                ctx.stroke();
            }
            ctx.restore();
        } else if (fx.kind === 53) {
            // Countdown active drain vapor
            const curl = Math.sin(p * 6 + (fx.seed || 0)) * 3.5;
            const sz = (2.2 + p * 2.8) * (fx.scale || 1);
            ctx.save();
            ctx.translate(fx.x + curl, fx.y);
            ctx.globalAlpha = (1 - p) * 0.6;
            ctx.fillStyle = p < 0.5 ? '#3DDBB0' : '#4B2A6B';
            ctx.beginPath();
            ctx.arc(0, 0, sz, 0, MUI_TAU);
            ctx.fill();
            ctx.restore();
        } else if (fx.kind === 54) {
            // Liquid surface bubble or ripple
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalAlpha = (1 - p) * 0.7;
            ctx.fillStyle = '#EAF7F2';
            ctx.beginPath();
            ctx.arc(0, 0, 1.2, 0, MUI_TAU);
            ctx.fill();
            ctx.restore();
        }
    }
}

function _muiHasMeter() {
    return typeof _hasBuff === 'function' && _hasBuff('quy_mon_diem_quan');
}

function _drawMuiReadyPrompt() {
    if (typeof _muiHasMeter !== 'function' || !_muiHasMeter()) return;
    const qiMax = typeof MUI_QI_MAX !== 'undefined' ? MUI_QI_MAX : 100;
    const curQi = (typeof window !== 'undefined' && (window._muiQi || window._muiSoulQi)) || 0;
    const ready = !!window._muiReady || curQi >= qiMax;
    const active = (window._muiRemainMs || 0) > 0 || !!window._muiActive;
    const windup = (window._muiWindupMs || 0) > 0 || !!window._muiWindupActive;
    if (!ready || active || windup) return;

    const cx = canvas.width / 2;
    let cy = canvas.height * 0.5;
    if (window._tidalSurgeReady) cy += 52;
    if (window._leoFateReady) cy += 52;

    const vi = typeof window !== 'undefined' && window._lang === 'vi';
    const label = vi ? 'BINH ĐOÀN SẴN SÀNG' : 'LEGION READY';
    const key = (typeof _platform !== 'undefined' && _platform === 'mobile') ? 'CHARGE' : 'Space';
    const sub = key + (vi ? ': gọi Binh Đoàn' : ': call the Legion');

    if (typeof _beginScreenHud === 'function') _beginScreenHud(cx, cy);
    ctx.save();
    ctx.font = 'bold 13px "Courier New", Consolas, monospace';
    const labelW = ctx.measureText(label).width;
    const boxW = Math.max(labelW, 180) + 40;
    const boxH = 40;

    ctx.fillStyle = 'rgba(11,59,58,0.82)';
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8);
        ctx.fill();
    } else {
        ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    }

    const now = performance.now();
    const pulse = 0.7 + 0.3 * Math.sin(now / 280);
    ctx.strokeStyle = '#3DDBB0';
    ctx.lineWidth = 1.5;
    if (typeof _mobPerf === 'undefined' || !_mobPerf) {
        ctx.shadowColor = '#3DDBB0';
        ctx.shadowBlur = 10 * pulse;
    }
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8);
        ctx.stroke();
    } else {
        ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    }
    ctx.shadowBlur = 0;

    // Bronze corner accents
    ctx.fillStyle = '#C9A24A';
    ctx.fillRect(cx - boxW / 2 + 2, cy - boxH / 2 + 2, 4, 4);
    ctx.fillRect(cx + boxW / 2 - 6, cy - boxH / 2 + 2, 4, 4);
    ctx.fillRect(cx - boxW / 2 + 2, cy + boxH / 2 - 6, 4, 4);
    ctx.fillRect(cx + boxW / 2 - 6, cy + boxH / 2 - 6, 4, 4);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#EAF7F2';
    ctx.fillText(label, cx, cy - 8);

    ctx.font = '11px "Courier New", Consolas, monospace';
    ctx.fillStyle = '#C9A24A';
    ctx.fillText(sub, cx, cy + 10);
    ctx.restore();
    if (typeof _endScreenHud === 'function') _endScreenHud();
}
