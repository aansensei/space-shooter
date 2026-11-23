// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) blade impacts, slashes, Echo cross cuts, hit stop feel, bullet slices, and dissipation mist.
// Owns FX kinds 25 to 29, plus core compatibility for kinds 0, 2, 4, 5, 6.

function _drawMuiDissolvingBladeMist(blades, gfx) {
    if (!blades) return;
    const cw = (typeof canvas !== 'undefined' && canvas.width) ? canvas.width : 1280;
    const ch = (typeof canvas !== 'undefined' && canvas.height) ? canvas.height : 720;
    const bladeMax = typeof MUI_BLADE_POOL_MAX !== 'undefined' ? MUI_BLADE_POOL_MAX : blades.length;

    for (let i = 0; i < bladeMax; i++) {
        const b = blades[i];
        if (!b || !b.active || b.phase !== 2) {
            if (b) b._muiMistEmitted = false;
            continue;
        }

        const nearEdge = b.x < 18 || b.x > cw - 18 || b.y < 18 || b.y > ch - 18;
        if (nearEdge && !b._muiMistEmitted) {
            b._muiMistEmitted = true;
            if (gfx < 2) {
                _muiEmitFxHelper(29, b.x, b.y, 440, b.scale || 1.0, b.angle, (b.vx || 0) * 0.12, (b.vy || 0) * 0.12);
            }
        }
    }
}

function _drawMuiImpacts() {
    if (!window._muiFx && !window._muiBlades) return;
    const fxPool = window._muiFx || [];
    const blades = window._muiBlades || [];
    const gfx = _muiGfxTier();
    const S = _muiSprites();
    const fxMax = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : fxPool.length;

    _drawMuiDissolvingBladeMist(blades, gfx);

    for (let i = 0; i < fxMax; i++) {
        const fx = fxPool[i];
        if (!fx || !fx.active) continue;

        if (fx.kind === 25 || (fx.kind === 0 && Math.abs(fx.life - 260) > 5)) {
            // Primary blade pierce impact slash burst
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            const ease = _muiEaseOutQuad(p);
            const alpha = (1 - p) * 0.94;
            if (alpha <= 0.01) continue;

            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

            // Subtle visual hit stop micro pause feel: razor freeze glint star
            if (fx.age <= 42 && gfx < 2) {
                const freezeT = 1.0 - (fx.age / 42);
                ctx.save();
                ctx.rotate(fx.angle);
                ctx.globalAlpha = freezeT * 0.98;
                ctx.fillStyle = '#EAF7F2';
                const fLen = 24 * fx.scale;
                ctx.beginPath();
                ctx.moveTo(fLen, 0);
                ctx.lineTo(0, -3.2);
                ctx.lineTo(-fLen * 0.6, 0);
                ctx.lineTo(0, 3.2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Expanding jade shockwave ripple
            const rad = 10 + ease * 36;
            ctx.globalAlpha = alpha * 0.88;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 2.2 * (1 - p * 0.5);
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, MUI_TAU);
            ctx.stroke();

            if (gfx === 0) {
                // Secondary thin bone inner ripple
                ctx.globalAlpha = alpha * 0.55;
                ctx.strokeStyle = '#EAF7F2';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(0, 0, rad * 0.72, 0, MUI_TAU);
                ctx.stroke();
            }

            // Slash texture or procedural razor flare
            ctx.rotate(fx.angle);
            const slashImg = _muiFxImg('hit-slash');
            if (slashImg) {
                const sz = (74 + ease * 62) * fx.scale;
                ctx.globalAlpha = (1 - p) * 0.95;
                ctx.drawImage(slashImg, -sz * 0.5, -sz * 0.5, sz, sz);

                if (gfx === 0 && S.jadeGlow) {
                    ctx.globalAlpha = (1 - p) * 0.42;
                    ctx.drawImage(S.jadeGlow, -sz * 0.35, -sz * 0.25, sz * 0.7, sz * 0.5);
                }
            } else {
                const flareLen = (1 - p * 0.38) * 40 * fx.scale;
                ctx.fillStyle = '#EAF7F2';
                ctx.globalAlpha = (1 - p) * 0.94;
                ctx.beginPath();
                ctx.moveTo(flareLen, 0);
                ctx.lineTo(0, -4.0 * (1 - p));
                ctx.lineTo(-flareLen * 0.62, 0);
                ctx.lineTo(0, 4.0 * (1 - p));
                ctx.closePath();
                ctx.fill();

                if (gfx < 2) {
                    ctx.strokeStyle = '#3DDBB0';
                    ctx.lineWidth = 1.4;
                    ctx.stroke();
                }
            }
            ctx.restore();
        } else if (fx.kind === 26 || (fx.kind === 0 && Math.abs(fx.life - 260) <= 5)) {
            // Second diagonal cross slash for Echo proc (40% chance in logic)
            // Emitted at angle b.angle + 0.9 (approx 51.5 degrees cross cut)
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            const ease = _muiEaseOutQuad(p);
            const alpha = (1 - p) * 0.92;
            if (alpha <= 0.01) continue;

            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

            // Ethereal Echo harmonic resonance ring (ancient bronze gold and jade tint)
            const rad = 14 + ease * 42;
            ctx.globalAlpha = alpha * 0.85;
            ctx.strokeStyle = '#C9A24A';
            ctx.lineWidth = 2.0 * (1 - p * 0.5);
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, MUI_TAU);
            ctx.stroke();

            // Transverse elliptical echo ripple
            if (gfx === 0) {
                ctx.globalAlpha = alpha * 0.5;
                ctx.strokeStyle = '#3DDBB0';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.ellipse(0, 0, rad * 1.18, rad * 0.74, fx.angle, 0, MUI_TAU);
                ctx.stroke();
            }

            // Diagonal cross slash texture or procedural flare
            ctx.rotate(fx.angle);
            const slashImg = _muiFxImg('hit-slash');
            if (slashImg) {
                const sz = (68 + ease * 54) * fx.scale;
                ctx.globalAlpha = (1 - p) * 0.88;
                ctx.drawImage(slashImg, -sz * 0.5, -sz * 0.5, sz, sz);

                if (gfx === 0 && S.goldGlow) {
                    ctx.globalAlpha = (1 - p) * 0.48;
                    ctx.drawImage(S.goldGlow, -sz * 0.3, -sz * 0.2, sz * 0.6, sz * 0.4);
                }
            } else {
                const flareLen = (1 - p * 0.35) * 36 * fx.scale;
                ctx.fillStyle = '#C9A24A';
                ctx.globalAlpha = (1 - p) * 0.90;
                ctx.beginPath();
                ctx.moveTo(flareLen, 0);
                ctx.lineTo(0, -3.4 * (1 - p));
                ctx.lineTo(-flareLen * 0.6, 0);
                ctx.lineTo(0, 3.4 * (1 - p));
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#EAF7F2';
                ctx.globalAlpha = (1 - p) * 0.94;
                ctx.beginPath();
                ctx.moveTo(flareLen * 0.85, 0);
                ctx.lineTo(0, -1.8 * (1 - p));
                ctx.lineTo(-flareLen * 0.45, 0);
                ctx.lineTo(0, 1.8 * (1 - p));
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        } else if (fx.kind === 27) {
            // Visual hit stop micro ripple and freeze glint
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            const alpha = (1 - p) * 0.96;
            if (alpha <= 0.01) continue;

            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.angle);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

            // High contrast freeze glint star holding intense in first 35% of life
            const hold = p < 0.35 ? 1.0 : (1.0 - (p - 0.35) / 0.65);
            ctx.globalAlpha = hold * 0.95;
            ctx.fillStyle = '#EAF7F2';
            const starLen = (18 - p * 6) * fx.scale;
            const starThick = 2.4 * (1 - p * 0.5);

            ctx.beginPath();
            ctx.moveTo(starLen, 0);
            ctx.lineTo(0, -starThick);
            ctx.lineTo(-starLen * 0.7, 0);
            ctx.lineTo(0, starThick);
            ctx.closePath();
            ctx.fill();

            // Transverse ray
            ctx.beginPath();
            ctx.moveTo(0, starLen * 0.55);
            ctx.lineTo(-starThick * 0.8, 0);
            ctx.lineTo(0, -starLen * 0.55);
            ctx.lineTo(starThick * 0.8, 0);
            ctx.closePath();
            ctx.fill();

            // Concentric freeze ring
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 1.6;
            ctx.globalAlpha = (1 - p) * 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, 8 + p * 20, 0, MUI_TAU);
            ctx.stroke();

            ctx.restore();
        } else if (fx.kind === 28) {
            // Surrendered bullet shard drifting toward player
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            const alpha = (1 - p) * 0.88;
            if (alpha <= 0.01) continue;

            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha;

            const r = (2.8 - p * 1.5) * fx.scale;
            ctx.fillStyle = (i % 2 === 0) ? '#EAF7F2' : '#3DDBB0';
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, r), 0, MUI_TAU);
            ctx.fill();

            if (gfx === 0 && S.jadeGlow) {
                ctx.globalAlpha = alpha * 0.45;
                ctx.drawImage(S.jadeGlow, -8, -8, 16, 16);
            }
            ctx.restore();
        } else if (fx.kind === 29) {
            // Dissolving mist when blade flies off screen
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            const ease = _muiEaseOutQuad(p);
            const alpha = (1 - p) * (gfx === 0 ? 0.65 : 0.45);
            if (alpha <= 0.01) continue;

            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.angle + p * 0.35);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha;

            const scale = (0.75 + ease * 0.85) * fx.scale;
            const mw = 124 * scale;
            const mh = 46 * scale;
            if (S.mist) {
                ctx.drawImage(S.mist, -mw * 0.5, -mh * 0.5, mw, mh);
            } else if (S.jadeGlow) {
                ctx.drawImage(S.jadeGlow, -mw * 0.5, -mh * 0.5, mw, mh);
            }

            if (gfx === 0 && p < 0.7) {
                ctx.globalAlpha = (1 - p / 0.7) * 0.35;
                if (S.jadeGlow) {
                    ctx.drawImage(S.jadeGlow, -mw * 0.25, -mh * 0.3, mw * 0.5, mh * 0.6);
                }
            }
            ctx.restore();
        } else if (fx.kind === 5 && gfx < 2) {
            // Crisp launch flash star at blade origin
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.angle);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - p) * 0.9;
            const r = (1 - p) * 26 * fx.scale;
            ctx.fillStyle = '#EAF7F2';
            ctx.beginPath();
            ctx.moveTo(r * 1.4, 0);
            ctx.lineTo(0, -3);
            ctx.lineTo(-r * 0.8, 0);
            ctx.lineTo(0, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (fx.kind === 2) {
            // Iron Body layer block expanding ring
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            ctx.save();
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            const rad = (24 + p * 64) * fx.scale;
            ctx.globalAlpha = (1 - p) * 0.9;
            ctx.strokeStyle = '#EAF7F2';
            ctx.lineWidth = 3 * (1 - p * 0.6);
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, rad, 0, MUI_TAU);
            ctx.stroke();
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, rad * 0.78, 0, MUI_TAU);
            ctx.stroke();
            ctx.restore();
        } else if (fx.kind === 6) {
            // An enemy bullet cut by a soul blade: sliced into surrendered jade sparks
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            const alpha = (1 - p) * 0.92;
            if (alpha <= 0.01) continue;

            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';

            // 1. Expanding jade shock ring
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 2.0 * (1 - p * 0.5);
            ctx.beginPath();
            ctx.arc(0, 0, 6 + p * 18, 0, MUI_TAU);
            ctx.stroke();

            // 2. Bisecting razor slice line along blade flight path
            ctx.rotate(fx.angle);
            ctx.strokeStyle = '#EAF7F2';
            ctx.lineWidth = 1.8 * (1 - p * 0.4);
            ctx.beginPath();
            ctx.moveTo(-10 - p * 12, 0);
            ctx.lineTo(10 + p * 12, 0);
            ctx.stroke();

            // 3. Two severed halves sliding apart perpendicularly
            if (gfx < 2) {
                const perp = p * 7;
                ctx.strokeStyle = 'rgba(61,219,176,0.65)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(0, -perp, 3.5, 0, Math.PI);
                ctx.arc(0, perp, 3.5, Math.PI, MUI_TAU);
                ctx.stroke();
            }

            // 4. Surrendered jade sparks drifting toward player ship
            if (gfx < 2) {
                const px = (typeof player !== 'undefined' && player) ? player.x : fx.x;
                const py = (typeof player !== 'undefined' && player) ? player.y : (fx.y + 200);
                const dx = px - fx.x;
                const dy = py - fx.y;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                ctx.rotate(-fx.angle);
                const sparkCount = gfx === 0 ? 4 : 2;
                for (let s = 0; s < sparkCount; s++) {
                    const sparkSeed = fx.seed + s * 1.618;
                    const lateral = Math.sin(sparkSeed * 6.28) * 14 * p;
                    const advance = p * (28 + (s % 3) * 16);
                    const sx = nx * advance - ny * lateral;
                    const sy = ny * advance + nx * lateral;
                    const sparkAlpha = (1 - p) * (s === 0 ? 0.95 : 0.75);

                    ctx.globalAlpha = sparkAlpha;
                    ctx.fillStyle = (s % 2 === 0) ? '#EAF7F2' : '#3DDBB0';
                    const sparkSz = (2.6 - p * 1.2) * fx.scale;
                    ctx.beginPath();
                    ctx.arc(sx, sy, Math.max(0.6, sparkSz), 0, MUI_TAU);
                    ctx.fill();
                }
            }
            ctx.restore();
        } else if (fx.kind === 4 && gfx < 2) {
            // Luminous spirit spark or shattered jade shard
            const p = _muiClamp(fx.age / fx.life, 0, 1);
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.rotate(fx.angle);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - p) * 0.88;
            const len = 7 * fx.scale * (1 - p * 0.4);
            ctx.fillStyle = (i % 3 === 0) ? '#EAF7F2' : '#3DDBB0';
            ctx.beginPath();
            ctx.moveTo(len, 0);
            ctx.lineTo(0, -2.4);
            ctx.lineTo(-len * 0.7, 0);
            ctx.lineTo(0, 2.4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
}
