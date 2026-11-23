// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) spectral blades and summon portals visual renderer (fx kind 20..24, plus core portal 1).

const _MUI_WEAPON_RIMS = [
    { main: '#3DDBB0', core: '#EAF7F2', warm: '#2EC4B6' }, // 0: Duong dao (Classic vibrant jade)
    { main: '#7DF9D6', core: '#FFFFFF', warm: '#3DDBB0' }, // 1: Thuong (Sharp cold cyan)
    { main: '#5ED9A8', core: '#F4FAF6', warm: '#A2E8B8' }, // 2: Qua (Spiritual green jade)
    { main: '#2EC4B6', core: '#E0F8F5', warm: '#1FA89B' }, // 3: Quan dao (Deep sea teal jade)
    { main: '#6CE5A3', core: '#FAFBF4', warm: '#C9A24A' }  // 4: Dong Son kiem (Ancient bronze gold jade)
];

function _drawMuiPortalWings(ctx, ps, pop, gfx) {
    // Left and right feathered spiritual wings unfolding behind the portal
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const wingLen = ps * (0.92 + 0.44 * pop);
    const alpha = (gfx === 0 ? 0.42 : 0.28) * pop;
    ctx.fillStyle = '#3DDBB0';
    ctx.strokeStyle = '#EAF7F2';
    ctx.lineWidth = gfx === 0 ? 1.5 : 1.0;

    // Left wing feathers
    ctx.beginPath();
    ctx.moveTo(-ps * 0.2, 0);
    ctx.quadraticCurveTo(-wingLen * 0.65, -wingLen * 0.75, -wingLen, -wingLen * 0.35);
    ctx.quadraticCurveTo(-wingLen * 0.7, -wingLen * 0.1, -ps * 0.2, 0);
    ctx.moveTo(-ps * 0.2, 0);
    ctx.quadraticCurveTo(-wingLen * 0.8, -wingLen * 0.25, -wingLen * 1.15, 0);
    ctx.quadraticCurveTo(-wingLen * 0.75, wingLen * 0.18, -ps * 0.2, 0);
    if (gfx === 0) {
        ctx.moveTo(-ps * 0.2, 0);
        ctx.quadraticCurveTo(-wingLen * 0.65, wingLen * 0.35, -wingLen * 0.9, wingLen * 0.55);
        ctx.quadraticCurveTo(-wingLen * 0.5, wingLen * 0.3, -ps * 0.2, 0);
    }
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = alpha * 1.4;
    ctx.stroke();

    // Right wing feathers
    ctx.beginPath();
    ctx.moveTo(ps * 0.2, 0);
    ctx.quadraticCurveTo(wingLen * 0.65, -wingLen * 0.75, wingLen, -wingLen * 0.35);
    ctx.quadraticCurveTo(wingLen * 0.7, -wingLen * 0.1, ps * 0.2, 0);
    ctx.moveTo(ps * 0.2, 0);
    ctx.quadraticCurveTo(wingLen * 0.8, -wingLen * 0.25, wingLen * 1.15, 0);
    ctx.quadraticCurveTo(wingLen * 0.75, wingLen * 0.18, ps * 0.2, 0);
    if (gfx === 0) {
        ctx.moveTo(ps * 0.2, 0);
        ctx.quadraticCurveTo(wingLen * 0.65, wingLen * 0.35, wingLen * 0.9, wingLen * 0.55);
        ctx.quadraticCurveTo(wingLen * 0.5, wingLen * 0.3, ps * 0.2, 0);
    }
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = alpha * 1.4;
    ctx.stroke();

    ctx.restore();
}

function _drawMuiPortalRunes(ctx, ps, p, pop) {
    ctx.save();
    ctx.rotate(p * 2.8);
    ctx.fillStyle = '#EAF7F2';
    ctx.globalAlpha = pop * 0.75;
    const r = ps * 0.46;
    for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) * 0.5;
        const rx = Math.cos(ang) * r;
        const ry = Math.sin(ang) * r;
        ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
    }
    ctx.restore();
}

function _drawMuiGhostSoldier(ctx, S, fx, p, gfx) {
    if (p >= 0.85) return;
    const ga = Math.sin((p / 0.85) * Math.PI) * (gfx === 0 ? 0.56 : 0.36);
    ctx.save();
    ctx.globalAlpha = ga;
    if (gfx === 0) ctx.globalCompositeOperation = 'lighter';

    // Ghost soldier drawing weapon gesture: subtle forward reach along emergence angle
    const drawShiftY = -74 - (1 - p) * 8;
    const drawShiftX = -22 + Math.cos(fx.angle || 0) * (1 - p) * 6;

    if (_muiImgReady(_muiGhostImg)) {
        ctx.drawImage(_muiGhostImg, drawShiftX, drawShiftY, 44, 88);
    } else {
        ctx.drawImage(S.jadeGlow, -22, -54, 44, 66);
    }

    // Parting mist wisps as soldier dissolves into spirit realm
    if (gfx === 0 && p > 0.38) {
        const mistAlpha = (1 - (p - 0.38) / 0.47) * 0.35;
        ctx.globalAlpha = mistAlpha;
        ctx.drawImage(S.mist, -34, -68, 68, 68);
    }
    ctx.restore();
}

function _drawMuiBlades() {
    if (!window._muiBlades && !window._muiFx) return;
    const S = _muiSprites();
    const gfx = _muiGfxTier();
    const reduced = _muiReducedMotion();
    const t = window._muiClock || 0;
    const fxPool = window._muiFx || [];
    const blades = window._muiBlades || [];
    const fxMax = typeof MUI_FX_POOL_MAX !== 'undefined' ? MUI_FX_POOL_MAX : fxPool.length;
    const bladeMax = typeof MUI_BLADE_POOL_MAX !== 'undefined' ? MUI_BLADE_POOL_MAX : blades.length;

    // 1. Summon portals and specialized blade fx (kinds 1, 20..24)
    for (let i = 0; i < fxMax; i++) {
        const fx = fxPool[i];
        if (!fx || !fx.active) continue;
        const p = _muiClamp(fx.age / fx.life, 0, 1);

        if (fx.kind === 1 || fx.kind === 20) {
            // Jade portal behind ship where each spectral blade rises
            const pop = p < 0.35 ? (p / 0.35) : (1 - (p - 0.35) / 0.65);
            const ps = (0.4 + 0.78 * pop) * 58;
            ctx.save();
            ctx.translate(fx.x, fx.y);

            // Spectral wings unfolding behind portal
            if (gfx < 2 && !reduced && pop > 0.1) {
                _drawMuiPortalWings(ctx, ps, pop, gfx);
            }

            if (gfx < 2) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = pop * 0.86;
            const portalImg = _muiFxImg('blade-portal');
            if (portalImg) ctx.rotate(p * 2.4);
            ctx.drawImage(portalImg || S.portal, -ps * 0.5, -ps * 0.5, ps, ps);
            if (portalImg) ctx.rotate(-p * 2.4);

            // Ancient glyph runes revolving around the portal
            if (gfx < 2 && pop > 0.2) {
                _drawMuiPortalRunes(ctx, ps, p, pop);
            }

            // Ghost soldier silhouette drawing spectral weapon
            if (gfx < 2) {
                _drawMuiGhostSoldier(ctx, S, fx, p, gfx);
            }
            ctx.restore();
        } else if (fx.kind === 21 && gfx < 2) {
            // Ghost soldier parting spirit mist
            const mp = 1 - p;
            ctx.save();
            ctx.translate(fx.x, fx.y + (fx.vy || 0) * fx.age);
            if (gfx === 0) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = mp * 0.44;
            const msz = 40 + p * 32;
            ctx.drawImage(S.mist, -msz * 0.5, -msz * 0.5, msz, msz);
            ctx.restore();
        } else if (fx.kind === 22 && gfx < 2) {
            // Blade launch anticipation recoil ring
            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx === 0) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - p) * 0.82;
            ctx.strokeStyle = '#3DDBB0';
            ctx.lineWidth = 2.2 * (1 - p);
            ctx.beginPath();
            ctx.arc(0, 0, 10 + p * 34, 0, MUI_TAU);
            ctx.stroke();
            ctx.restore();
        } else if (fx.kind === 23 && gfx < 2) {
            // Spectral mist trail puff behind flying blade
            ctx.save();
            ctx.translate(fx.x, fx.y);
            if (gfx === 0) ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - p) * 0.35;
            const sz = 24 + p * 20;
            ctx.drawImage(S.mist, -sz * 0.5, -sz * 0.5, sz, sz);
            ctx.restore();
        } else if (fx.kind === 24 && gfx === 0) {
            // Comet tail flight starlet
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - p) * 0.9;
            const sz = 3.5 * (1 - p * 0.5);
            ctx.fillStyle = '#EAF7F2';
            ctx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
            ctx.restore();
        }
    }

    // 2. Spectral blades (emerging tip first, aiming, recoil anticipation, and piercing flight)
    for (let i = 0; i < bladeMax; i++) {
        const b = blades[i];
        if (!b || !b.active) continue;
        const cfg = _MUI_WEAPON_CFG[b.weaponType] || _MUI_WEAPON_CFG[0];
        const rim = _MUI_WEAPON_RIMS[b.weaponType] || _MUI_WEAPON_RIMS[0];
        const img = _muiWeaponImgs[b.weaponType];
        const usePng = _muiImgReady(img);
        const w = cfg.length * b.scale;
        const h = usePng ? w * (img.naturalHeight / img.naturalWidth) : w * 0.24;

        // Soul mist streak behind flying blade: art when present, stroked segments otherwise
        if (b.phase === 2 && gfx < 2 && b.trailLen >= 2) {
            const trailImg = _muiFxImg('blade-trail');
            if (trailImg) {
                const k = Math.min(b.trailLen - 1, 9);
                const len = Math.hypot(b.x - b.trailX[k], b.y - b.trailY[k]) + 70;
                const th = Math.max(26, len * 0.17);
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.angle);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = gfx === 0 ? 0.92 : 0.62;
                ctx.drawImage(trailImg, -len, -th * 0.5, len, th);
                ctx.restore();
            }

            // Segmented luminous core trail with weapon rim tint
            ctx.save();
            if (gfx === 0) ctx.globalCompositeOperation = 'lighter';
            for (let k = 0; k < b.trailLen - 1; k++) {
                const frac = 1 - k / b.trailLen;
                ctx.strokeStyle = k === 0 ? rim.core : rim.main;
                ctx.globalAlpha = frac * frac * (gfx === 0 ? 0.58 : 0.38);
                ctx.lineWidth = (gfx === 0 ? 11 : 6) * frac;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(b.trailX[k], b.trailY[k]);
                ctx.lineTo(b.trailX[k + 1], b.trailY[k + 1]);
                ctx.stroke();

                // Spectral mist puffs along trail
                if (gfx === 0 && (k === 1 || k === 3)) {
                    const mistSz = 26 * frac;
                    ctx.globalAlpha = frac * 0.24;
                    ctx.drawImage(S.mist, b.trailX[k] - mistSz * 0.5, b.trailY[k] - mistSz * 0.5, mistSz, mistSz);
                }

                // Comet tail flight particles (starlets) drifting slightly off axis
                if (gfx === 0 && (k === 0 || k === 2)) {
                    const lat = Math.sin(t * 0.04 + k * 2.1 + i * 1.5) * (4 + k * 1.6);
                    const spX = b.trailX[k] - Math.sin(b.angle) * lat;
                    const spY = b.trailY[k] + Math.cos(b.angle) * lat;
                    const sz = frac * 3.4;
                    ctx.fillStyle = rim.core;
                    ctx.globalAlpha = frac * 0.85;
                    ctx.fillRect(spX - sz * 0.5, spY - sz * 0.5, sz, sz);
                }
            }
            ctx.restore();
        }

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        // Velocity stretch during flight
        if (b.phase === 2 && b.stretch > 1) {
            ctx.scale(b.stretch, 1 / Math.sqrt(b.stretch));
        }

        // Phase 0: Tip first emergence clip and rim light scan during spawn phase
        if (b.phase === 0) {
            const emerge = _muiClamp(b.age / (typeof MUI_BLADE_SPAWN_MS !== 'undefined' ? MUI_BLADE_SPAWN_MS : 140), 0.05, 1);
            const leftX = -w * cfg.pivot;
            const tipX = leftX + w;
            const slideBack = (1 - emerge) * w * 0.72;
            ctx.beginPath();
            ctx.rect(tipX - w * emerge - 16, -h * 1.5, w * emerge + 32, h * 3.0);
            ctx.clip();
            ctx.translate(-slideBack, 0);

            // Rim light scan along emergence boundary
            if (gfx < 2) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const scanX = tipX - w * emerge;
                ctx.fillStyle = rim.core;
                ctx.globalAlpha = b.alpha * (gfx === 0 ? 0.95 : 0.72);
                ctx.fillRect(scanX - 2, -h * 0.8, 4, h * 1.6);
                ctx.drawImage(S.jadeGlow, scanX - 16, -h * 1.2, 32, h * 2.4);
                ctx.restore();
            }
        }

        // Phase 1: Micro recoil pause anticipation before blade launch
        if (b.phase === 1) {
            const aimP = _muiClamp(b.age / (typeof MUI_BLADE_AIM_MS !== 'undefined' ? MUI_BLADE_AIM_MS : 120), 0, 1);
            if (aimP > 0.35) {
                const recoilFrac = _muiEaseInOutQuad((aimP - 0.35) / 0.65);
                const recoilX = -Math.sin(recoilFrac * Math.PI) * 6.5;
                ctx.translate(recoilX, 0);
            }
            // Rim light shimmer sweep along blade body during aim
            if (gfx === 0) {
                const sweepX = -w * cfg.pivot + aimP * w;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = (1 - Math.abs(aimP - 0.5) * 2) * 0.75;
                ctx.drawImage(S.jadeGlow, sweepX - 22, -h * 0.9, 44, h * 1.8);
                ctx.restore();
            }
            // Anticipation glint at tip right before release
            if (aimP > 0.78 && gfx < 2) {
                const tipP = (aimP - 0.78) / 0.22;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = tipP * 0.88;
                const tipX = -w * cfg.pivot + w;
                ctx.drawImage(S.jadeGlow, tipX - 16, -16, 32, 32);
                ctx.restore();
            }
        }

        // Translucent spectral look
        ctx.globalAlpha = b.alpha * (b.phase === 2 ? 0.94 : 0.86);

        // Layered jade halo behind blade (FULL tier only)
        if (gfx === 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.84 + 0.16 * Math.sin(t * 0.015 + i);
            const haloW = w * 1.15;
            const haloH = Math.max(h * 2.0, 36);
            ctx.globalAlpha = b.alpha * 0.44 * pulse;
            ctx.drawImage(S.jadeGlow, -w * cfg.pivot - w * 0.07, -haloH * 0.5, haloW, haloH);
            ctx.restore();
        }

        if (usePng) {
            ctx.drawImage(img, -w * cfg.pivot, -h * 0.5, w, h);
        } else {
            ctx.drawImage(S.blades[b.weaponType] || S.blades[0], -w * cfg.pivot, -h * 0.5, w, h);
        }

        // Bright launch glint along blade core and micro recoil ring
        if (b.flashMs > 0 && gfx < 2) {
            const fp = b.flashMs / 110;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fp * 0.88;
            ctx.drawImage(S.jadeGlow, -w * cfg.pivot + w * 0.22, -26, w * 0.82, 52);
            if (gfx === 0) {
                const ringRad = (1 - fp) * 26;
                ctx.strokeStyle = rim.main;
                ctx.lineWidth = 2.0 * fp;
                ctx.beginPath();
                ctx.arc(-w * cfg.pivot + 8, 0, ringRad, 0, MUI_TAU);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();
    }
}
