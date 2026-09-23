// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/skill-g.js — Tesla Matrix barrier, energy orb + link, tesla coil,
// homing bolt. Everything with a gradient or shadow glow is baked once into
// an offscreen sprite and drawn with drawImage, so a frame with 4 coils, a
// dozen orbs and a volley of bolts costs a handful of image blits instead
// of rebuilding dozens of gradients and blurs.

const _sgSprites = {};
const SG_BAKE = 2;

// Renders draw(x, w, h) once into a w x h logical-size canvas (baked at
// `scale` x resolution) and caches it under `key`.
function _sgSprite(key, w, h, draw, scale) {
    let s = _sgSprites[key];
    if (s) return s;
    const sc = scale || SG_BAKE;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * sc);
    c.height = Math.ceil(h * sc);
    const x = c.getContext('2d');
    x.scale(sc, sc);
    draw(x, w, h);
    _sgSprites[key] = c;
    return c;
}

// Deterministic 0..1 noise so link lightning re-rolls on a fixed beat
// instead of shimmering randomly every frame.
function _sgNoise(n) {
    const v = Math.sin(n * 12.9898) * 43758.5453;
    return v - Math.floor(v);
}

function _sgBarrierFrameSprite() {
    const key = 'frame_' + canvas.width + '_' + boundaryY;
    if (_sgSprites[key]) return _sgSprites[key];
    for (const k of Object.keys(_sgSprites)) if (k.startsWith('frame_')) delete _sgSprites[k];
    return _sgSprite(key, canvas.width, boundaryY + 40, (x) => {
        x.strokeStyle = 'rgba(0,180,255,0.7)';
        x.shadowColor = 'cyan'; x.shadowBlur = 35;
        x.lineWidth = 10;
        x.strokeRect(5, 5, canvas.width - 10, boundaryY - 5);
        x.strokeStyle = 'rgba(150,255,255,0.5)';
        x.shadowBlur = 8;
        x.lineWidth = 2;
        x.strokeRect(10, 10, canvas.width - 20, boundaryY - 10);
    }, 1);
}

let _sgGridPattern = null;
function _sgGridPatternGet() {
    if (_sgGridPattern) return _sgGridPattern;
    const tile = _sgSprite('gridTile', 60, 60, (x) => {
        x.strokeStyle = 'rgba(0,200,255,1)';
        x.lineWidth = 1;
        x.beginPath(); x.moveTo(0.5, 0); x.lineTo(0.5, 60); x.moveTo(0, 0.5); x.lineTo(60, 0.5); x.stroke();
    }, 1);
    _sgGridPattern = ctx.createPattern(tile, 'repeat');
    return _sgGridPattern;
}

// Cached once; index.html declares #skillg-crest as a fixed, centered,
// pointer-events:none, STATIC overlay (no rotation) with two stacked
// <img> copies of assets/images/game/effects/skill-g-crest.png: a dim base
// (always faint while active) and a brighter "lit" copy whose clip-path
// this grows from the bottom edge upward as the skill's own 30s duration
// (activateSkillG, skill-g.js) elapses - full duration = fully lit.
let _sgCrestEl, _sgCrestLitEl;
function _sgSyncCrest(opacity) {
    if (_sgCrestEl === undefined) {
        _sgCrestEl = document.getElementById('skillg-crest');
        _sgCrestLitEl = document.getElementById('sgCrestLit');
    }
    if (!_sgCrestEl) return;
    // Container just fades the whole overlay in/out with the barrier - the
    // dim/lit balance itself lives in #sgCrestDim/#sgCrestLit's own CSS opacity.
    _sgCrestEl.style.opacity = opacity.toFixed(3);

    const progress = skillGActive
        ? Math.max(0, Math.min(1, 1 - (skillGEndTime - gameElapsedTime) / 30000))
        : 0;
    if (_sgCrestLitEl) {
        _sgCrestLitEl.style.clipPath = `inset(${((1 - progress) * 100).toFixed(2)}% 0 0 0)`;
        _sgCrestLitEl.style.opacity = progress > 0 ? '1' : '0';
        _sgCrestLitEl.style.filter = progress > 0.05
            ? `drop-shadow(0 0 ${(2 + 6 * progress).toFixed(1)}px rgba(220,255,255,${(0.35 * progress).toFixed(2)}))`
            : 'none';
    }
}

function drawSkillGBarrier() {
    _sgSyncCrest(Math.max(0, Math.min(1, skillGBorderOpacity / 0.5)));
    if (skillGBorderOpacity <= 0) return;
    const now = performance.now();
    ctx.save();

    // TITLE FLASH khi G vừa kích hoạt
    {
        // Detect lần đầu active trong frame này
        if (skillGActive && now - _skillGActivatedAt > 500) {
            // Nếu barrier vừa bật (opacity đang tăng từ 0)
            if (skillGBorderOpacity < 0.15) _skillGActivatedAt = now;
        }
        const activeElapsed = now - _skillGActivatedAt;
        const textT = Math.min(activeElapsed / 150, 1) * Math.max(0, 1 - (activeElapsed - 150) / 1250);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const mx = canvas.width / 2, my = canvas.height / 2 - 60;

            ctx.globalAlpha = textT * 0.26;
            ctx.font = 'bold 110px serif';
            ctx.fillStyle = '#00ffaa';
            if (!_mobPerf) ctx.shadowColor = '#00cc88'; if (!_mobPerf) ctx.shadowBlur = 45;
            ctx.fillText('星王生命結界', mx, my - 25);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffffff';
            if (!_mobPerf) ctx.shadowColor = '#00ffaa'; if (!_mobPerf) ctx.shadowBlur = 26;
            ctx.fillText('LIFE DOMAIN', mx, my - 67);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#88ffcc';
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.fillText('— Tinh Vương: Sinh Mệnh Kết Giới —', mx, my - 43);
            ctx.restore();
        }

        // Activation shockwaves: two staggered rings racing out from the
        // player over the first ~900ms, on top of the expanding aura ring.
        if (activeElapsed >= 0 && activeElapsed < 900 && typeof player !== 'undefined') {
            const maxR = Math.min(canvas.width, canvas.height) * 0.55;
            for (let k = 0; k < 2; k++) {
                const t = (activeElapsed - k * 180) / 720;
                if (t <= 0 || t >= 1) continue;
                ctx.strokeStyle = `rgba(150,255,255,${(1 - t) * 0.6})`;
                ctx.lineWidth = 3 - k;
                ctx.beginPath(); ctx.arc(player.x, player.y, t * maxR, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }

    // interior tint
    ctx.fillStyle = `rgba(0,40,70,${skillGBorderOpacity * 0.18})`;
    ctx.fillRect(0, 0, canvas.width, boundaryY);

    // animated grid inside barrier: one baked tile, scrolled by the offset
    {
        const gSize = 60;
        const offset = (now / 40) % gSize;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, canvas.width, boundaryY); ctx.clip();
        ctx.globalAlpha = skillGBorderOpacity * 0.07;
        ctx.translate(offset, offset);
        ctx.fillStyle = _sgGridPatternGet();
        ctx.fillRect(-gSize, -gSize, canvas.width + gSize, boundaryY + gSize);
        ctx.restore();
    }

    // Slow scan band sweeping down the field (HIGH + MED)
    if (_gfxLevel < 2) {
        const band = _sgSprite('scanBand', 8, 128, (x, w, h) => {
            const g = x.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, 'rgba(0,220,255,0)');
            g.addColorStop(0.5, 'rgba(120,240,255,0.55)');
            g.addColorStop(1, 'rgba(0,220,255,0)');
            x.fillStyle = g; x.fillRect(0, 0, w, h);
        }, 1);
        const by = (((now / 3200) % 1) * (boundaryY + 260)) - 130;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, canvas.width, boundaryY); ctx.clip();
        ctx.globalAlpha = skillGBorderOpacity * 0.5;
        ctx.drawImage(band, 0, by, canvas.width, 128);
        ctx.restore();
    }

    // outer glow frame + inner highlight line: baked with their glow, one blit
    ctx.globalAlpha = Math.min(1, skillGBorderOpacity / 0.5);
    ctx.drawImage(_sgBarrierFrameSprite(), 0, 0);
    ctx.globalAlpha = 1;

    // Pulse rings from player (HIGH only)
    if (_gfxLevel < 1 && skillGActive && typeof player !== 'undefined') {
        const phasePeriod = 1200;
        const phase = (now % phasePeriod) / phasePeriod; // 0→1 per cycle
        const maxR = Math.min(canvas.width, canvas.height) * 0.40;
        const pR = phase * maxR;
        const pAlpha = (1 - phase) * skillGBorderOpacity * 0.55;
        if (pAlpha > 0.01) {
            ctx.strokeStyle = `rgba(0,220,255,${pAlpha * 0.35})`;
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.arc(player.x, player.y, pR, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = `rgba(0,220,255,${pAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(player.x, player.y, pR, 0, Math.PI * 2); ctx.stroke();
        }
    }

    ctx.restore();
}

// Energy Orb sprites, baked at the base orb size and scaled to the pulsing
// radius at draw time.
function _sgOrbBody() {
    const R = ENERGY_ORB_SIZE;
    return _sgSprite('orbBody', R * 3, R * 3, (x, w) => {
        const c = w / 2;
        const grad = x.createRadialGradient(c, c, 0, c, c, R);
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.45, '#44ddff');
        grad.addColorStop(0.8, '#0066cc');
        grad.addColorStop(1, 'rgba(0,40,120,0.4)');
        x.fillStyle = grad;
        x.shadowColor = 'white'; x.shadowBlur = 14;
        x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill();
        x.shadowBlur = 0;
        x.fillStyle = 'rgba(255,255,255,0.5)';
        x.beginPath();
        x.ellipse(c - R * 0.25, c - R * 0.25, R * 0.28, R * 0.16, -Math.PI / 4, 0, Math.PI * 2);
        x.fill();
    });
}
function _sgOrbGlow(withCorona) {
    const R = ENERGY_ORB_SIZE;
    return _sgSprite(withCorona ? 'orbGlowC' : 'orbGlow', R * 6, R * 6, (x, w) => {
        const c = w / 2;
        x.fillStyle = 'rgba(0,180,255,0.12)';
        x.beginPath(); x.arc(c, c, R * 2, 0, Math.PI * 2); x.fill();
        if (withCorona) {
            const cg = x.createRadialGradient(c, c, R, c, c, R * 2.8);
            cg.addColorStop(0, 'rgba(0,200,255,0.20)');
            cg.addColorStop(1, 'rgba(0,80,180,0)');
            x.fillStyle = cg;
            x.beginPath(); x.arc(c, c, R * 2.8, 0, Math.PI * 2); x.fill();
            x.strokeStyle = 'rgba(120,230,255,0.45)';
            x.lineWidth = 1.5;
            x.shadowColor = 'cyan'; x.shadowBlur = 10;
            x.beginPath(); x.arc(c, c, R * 1.6, 0, Math.PI * 2); x.stroke();
        }
    });
}

// Energy Orb (Skill G)
function drawEnergyOrb(orb) {
    const now = performance.now();
    ctx.save();
    const pulse = Math.sin(now / 200 + orb.id) * 2.5;
    let radius = Math.max(0.1, orb.size + pulse);
    if (orb.isMerging) {
        const mp = (gameElapsedTime - orb.mergeStartTime) / 500;
        radius = Math.max(0, (orb.size + pulse) * (1 - mp));
    }
    const k = radius / ENERGY_ORB_SIZE;

    // halo + corona (corona on HIGH + MED), pulsing via alpha only
    const withCorona = _gfxLevel < 2;
    const glow = _sgOrbGlow(withCorona);
    const gs = ENERGY_ORB_SIZE * 6 * k;
    ctx.globalAlpha = withCorona ? 0.65 + 0.35 * Math.sin(now / 180 + (orb.id || 0) * 1.7) : 1;
    ctx.drawImage(glow, orb.x - gs / 2, orb.y - gs / 2, gs, gs);
    ctx.globalAlpha = 1;

    const bs = ENERGY_ORB_SIZE * 3 * k;
    ctx.drawImage(_sgOrbBody(), orb.x - bs / 2, orb.y - bs / 2, bs, bs);

    // Inner detail (HIGH only): no shadow blur, motes drawn additively
    if (_gfxLevel < 1) {
        const t = now / 1000;
        const orbId = orb.id || 0;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
            const ma = t * 1.8 + (i / 6) * Math.PI * 2 + orbId;
            const mr = radius * 0.58;
            const mA = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.1 + i));
            ctx.fillStyle = `rgba(200,255,255,${mA})`;
            ctx.beginPath(); ctx.arc(orb.x + Math.cos(ma) * mr, orb.y + Math.sin(ma) * mr, radius * 0.10, 0, Math.PI * 2); ctx.fill();
        }
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const aa = -t * 2.5 + (i / 3) * Math.PI * 2;
            ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.45 * Math.abs(Math.sin(t + i * 1.4))})`;
            ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 0.82, aa, aa + Math.PI * 0.38); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // energy link: jagged lightning between the pair, re-rolled every 70ms
    if (!orb.isMerging && orb.linkedTo && orb.id < orb.linkedTo.orb.id) {
        const orb2 = orb.linkedTo.orb;
        if (!orb2) { ctx.restore(); return; }
        const dx = orb2.x - orb.x, dy = orb2.y - orb.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const segs = Math.max(3, Math.min(14, Math.round(len / 26)));
        const beat = Math.floor(now / 70);
        const seed = beat * 31 + Math.floor(orb.id * 1000);
        const pts = [];
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const amp = (i === 0 || i === segs) ? 0 : (_sgNoise(seed + i * 7.31) - 0.5) * 16;
            pts.push(orb.x + dx * t + nx * amp, orb.y + dy * t + ny * amp);
        }
        const trace = () => {
            ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.stroke();
        };
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,150,255,0.16)';
        ctx.lineWidth = orb.size * 1.9;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,255,255,0.5)';
        ctx.lineWidth = orb.size * 0.55;
        trace();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2;
        trace();
        ctx.globalCompositeOperation = 'source-over';

        // two energy packets running opposite ways
        const pk = _getGlowSprite('#ffffff', 10);
        if (pk) {
            for (let n = 0; n < 2; n++) {
                const t = n === 0 ? (now / 1200) % 1 : 1 - ((now / 1500) % 1);
                ctx.drawImage(pk, orb.x + dx * t - 10, orb.y + dy * t - 10, 20, 20);
            }
        }
    }
    ctx.restore();
}

// Tesla Coil sprites
function _sgCoilPoly() {
    const R = TESLA_AURA_RADIUS;
    return _sgSprite('coilPoly', R * 2 + 8, R * 2 + 8, (x, w) => {
        const c = w / 2;
        const g = x.createRadialGradient(c, c, R * 0.15, c, c, R);
        g.addColorStop(0, 'rgba(0,200,255,0.07)');
        g.addColorStop(1, 'rgba(0,80,120,0.03)');
        x.fillStyle = g;
        x.globalAlpha = 0.6;
        x.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = c + R * Math.cos(a), py = c + R * Math.sin(a);
            i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.closePath(); x.fill();
        x.globalAlpha = 1;
        x.strokeStyle = 'rgba(0,200,255,0.07)'; x.lineWidth = 2; x.stroke();
    }, 1);
}
function _sgCoilRim() {
    const R = TESLA_AURA_RADIUS;
    return _sgSprite('coilRim', R * 2 + 8, R * 2 + 8, (x, w) => {
        x.strokeStyle = 'rgba(0,200,255,0.15)';
        x.lineWidth = 2; x.setLineDash([10, 20]);
        x.beginPath(); x.arc(w / 2, w / 2, R, 0, Math.PI * 2); x.stroke();
    }, 1);
}
// Ornate ring platform: bronze band with glowing rune marks, a dark
// energy floor inside, and six copper-coil pylon mounts. Baked once; the
// whole sprite turns slowly.
function _sgCoilRingSprite() {
    const VR = TESLA_COIL_VISUAL_R, PR = TESLA_PYLON_R;
    const dim = (VR + 8) * 2;
    return _sgSprite('coilRing', dim, dim, (x, w) => {
        const c = w / 2;
        x.translate(c, c);

        // energy floor
        const fl = x.createRadialGradient(0, 0, 0, 0, 0, 16);
        fl.addColorStop(0, '#0a5c9a');
        fl.addColorStop(0.6, '#06305a');
        fl.addColorStop(1, '#041426');
        x.fillStyle = fl;
        x.beginPath(); x.arc(0, 0, 16, 0, Math.PI * 2); x.fill();

        // bronze band
        const band = x.createRadialGradient(0, 0, 15, 0, 0, 25);
        band.addColorStop(0, '#5a3d16');
        band.addColorStop(0.35, '#b98b3e');
        band.addColorStop(0.7, '#8c6428');
        band.addColorStop(1, '#3d2809');
        x.fillStyle = band;
        x.beginPath(); x.arc(0, 0, 25, 0, Math.PI * 2); x.arc(0, 0, 15, 0, Math.PI * 2, true); x.fill();
        x.strokeStyle = '#2a1c0a'; x.lineWidth = 1;
        x.beginPath(); x.arc(0, 0, 25, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.arc(0, 0, 15, 0, Math.PI * 2); x.stroke();
        // steel inner lip and a soft highlight on the outer edge
        x.strokeStyle = '#9aa7b8'; x.lineWidth = 1.2;
        x.beginPath(); x.arc(0, 0, 16.2, 0, Math.PI * 2); x.stroke();
        x.strokeStyle = 'rgba(255,225,160,0.55)'; x.lineWidth = 0.8;
        x.beginPath(); x.arc(0, 0, 24, 0, Math.PI * 2); x.stroke();

        // rune marks along the band, glowing
        x.shadowColor = '#5ee7ff'; x.shadowBlur = 3;
        x.strokeStyle = '#8ff3ff'; x.lineWidth = 1.3; x.lineCap = 'round';
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const len = (i % 2 === 0) ? 0.075 : 0.045;
            x.beginPath(); x.arc(0, 0, 20, a, a + len * Math.PI); x.stroke();
        }
        x.shadowBlur = 0;

        // six pylons: mount plate, copper coil windings, cyan tip socket
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            x.save();
            x.translate(Math.cos(a) * PR, Math.sin(a) * PR);
            x.fillStyle = '#3d2809';
            x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.fill();
            x.strokeStyle = '#d8b46a'; x.lineWidth = 0.9;
            x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.stroke();
            const cg = x.createRadialGradient(-0.8, -0.8, 0.5, 0, 0, 3.8);
            cg.addColorStop(0, '#f0a066');
            cg.addColorStop(0.6, '#b8562a');
            cg.addColorStop(1, '#6a2c12');
            x.fillStyle = cg;
            x.beginPath(); x.arc(0, 0, 3.8, 0, Math.PI * 2); x.fill();
            x.strokeStyle = 'rgba(70,25,8,0.85)'; x.lineWidth = 0.7;
            x.beginPath(); x.arc(0, 0, 2.9, 0, Math.PI * 2); x.stroke();
            x.beginPath(); x.arc(0, 0, 2.0, 0, Math.PI * 2); x.stroke();
            x.fillStyle = '#c9f9ff';
            x.beginPath(); x.arc(0, 0, 1.1, 0, Math.PI * 2); x.fill();
            x.restore();
        }
    });
}

// Eight-point star ornament around the crystal, turning the other way.
function _sgCoilStarSprite() {
    return _sgSprite('coilStar', 32, 32, (x, w) => {
        const c = w / 2;
        x.translate(c, c);
        const g = x.createRadialGradient(0, 0, 2, 0, 0, 14);
        g.addColorStop(0, '#6b7a90');
        g.addColorStop(1, '#2a3444');
        x.fillStyle = g;
        x.strokeStyle = '#b98b3e'; x.lineWidth = 0.9; x.lineJoin = 'round';
        x.beginPath();
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 === 0 ? 14 : 8.2;
            const px = Math.cos(a) * r, py = Math.sin(a) * r;
            i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.closePath(); x.fill(); x.stroke();
        x.shadowColor = '#5ee7ff'; x.shadowBlur = 3;
        x.fillStyle = '#9af4ff';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            x.save(); x.translate(Math.cos(a) * 11, Math.sin(a) * 11); x.rotate(a + Math.PI / 2);
            x.beginPath(); x.moveTo(0, -1.8); x.lineTo(1.1, 0); x.lineTo(0, 1.8); x.lineTo(-1.1, 0); x.closePath(); x.fill();
            x.restore();
        }
    });
}

// Faceted crystal at the center.
function _sgCoilCrystalSprite() {
    return _sgSprite('coilCrystal', 26, 26, (x, w) => {
        const c = w / 2;
        x.translate(c, c);
        x.shadowColor = '#5ee7ff'; x.shadowBlur = 8;
        const shades = ['#e9ffff', '#7ff3ff', '#2fb4ee', '#1478c4', '#1b9be0', '#a8f7ff'];
        for (let i = 0; i < 6; i++) {
            const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
            x.fillStyle = shades[i];
            x.beginPath();
            x.moveTo(0, 0);
            x.lineTo(Math.cos(a0) * 8, Math.sin(a0) * 8);
            x.lineTo(Math.cos(a1) * 8, Math.sin(a1) * 8);
            x.closePath(); x.fill();
        }
        x.shadowBlur = 0;
        x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 0.6;
        x.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            x.moveTo(0, 0); x.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        }
        x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.85)';
        x.beginPath(); x.ellipse(-1.6, -2.4, 1.6, 0.9, -0.6, 0, Math.PI * 2); x.fill();
    });
}

// Tesla Coil (Skill G)
function drawTeslaCoil(coil) {
    const now = performance.now();
    ctx.save();
    const VR = TESLA_COIL_VISUAL_R;
    const R = coil.auraRadius;

    // aura: slowly turning octagon + static dashed rim
    const ps = R * 2 + 8;
    ctx.save();
    ctx.translate(coil.x, coil.y);
    ctx.rotate(now / 5000);
    ctx.drawImage(_sgCoilPoly(), -ps / 2, -ps / 2, ps, ps);
    ctx.restore();
    ctx.drawImage(_sgCoilRim(), coil.x - ps / 2, coil.y - ps / 2, ps, ps);

    // ring platform (turns with the pylons), then the star the other way
    const rs = (VR + 8) * 2;
    ctx.save();
    ctx.translate(coil.x, coil.y);
    ctx.rotate(teslaRingRot(now));
    ctx.drawImage(_sgCoilRingSprite(), -rs / 2, -rs / 2, rs, rs);
    ctx.restore();
    ctx.save();
    ctx.translate(coil.x, coil.y);
    ctx.rotate(-now / 3500);
    ctx.drawImage(_sgCoilStarSprite(), -16, -16, 32, 32);
    ctx.restore();

    // crystal with a breathing glow
    const breathe = 0.5 + 0.5 * Math.sin(now / 420 + coil.id * 9);
    const cGlow = _getGlowSprite('#5ee7ff', 32);
    if (cGlow) {
        const gs = 44 + 8 * breathe;
        ctx.globalAlpha = 0.55 + 0.3 * breathe;
        ctx.drawImage(cGlow, coil.x - gs / 2, coil.y - gs / 2, gs, gs);
        ctx.globalAlpha = 1;
    }
    const cs = 26 * (1 + 0.05 * breathe);
    ctx.drawImage(_sgCoilCrystalSprite(), coil.x - cs / 2, coil.y - cs / 2, cs, cs);

    // pylon tips: glow dots, plus lightning arcing tip to tip (HIGH + MED)
    const tips = [];
    for (let i = 0; i < 6; i++) tips.push(teslaPylonPos(coil, i, now));
    const tipGlow = _getGlowSprite('#7ff3ff', 8);
    const flashF = coil.flashMs > 0 ? coil.flashMs / 200 : 0;
    if (tipGlow) {
        for (let i = 0; i < 6; i++) {
            const hot = (coil.muzzlePylon === i) ? flashF : 0;
            const s = 9 + 4 * Math.sin(now / 160 + i) + 14 * hot;
            ctx.globalAlpha = 0.75 + 0.25 * hot;
            ctx.drawImage(tipGlow, tips[i].x - s / 2, tips[i].y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
    }
    if (_gfxLevel < 2) {
        const beat = Math.floor(now / 90);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const seed = beat * 13 + i * 41 + Math.floor(coil.id * 1000);
            if (_sgNoise(seed) < 0.4) continue;
            const A = tips[i], B = tips[(i + 1) % 6];
            const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const pts = [A.x, A.y];
            for (let k = 1; k < 4; k++) {
                const t = k / 4, amp = (_sgNoise(seed + k * 5.7) - 0.5) * 9;
                pts.push(A.x + dx * t + nx * amp, A.y + dy * t + ny * amp);
            }
            pts.push(B.x, B.y);
            const trace = () => {
                ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
                for (let q = 2; q < pts.length; q += 2) ctx.lineTo(pts[q], pts[q + 1]);
                ctx.stroke();
            };
            ctx.strokeStyle = 'rgba(0,170,255,0.35)'; ctx.lineWidth = 3.2; trace();
            ctx.strokeStyle = 'rgba(220,255,255,0.95)'; ctx.lineWidth = 1; trace();
        }
        ctx.restore();
    }

    // Bolt-count ring: fills clockwise toward the coil's self-destruct at
    // TESLA_COIL_MAX_BOLTS, turning red as it nears the limit.
    if (coil.boltsFired > 0) {
        const frac = Math.min(1, coil.boltsFired / TESLA_COIL_MAX_BOLTS);
        ctx.strokeStyle = frac > 0.8 ? `rgba(255,${Math.round(120 - 100 * (frac - 0.8) / 0.2)},60,0.9)` : 'rgba(170,250,255,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coil.x, coil.y, VR + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
    }

    // Firing flash: the core flares white, a shock spike leaves the crystal
    // along the shot direction, and a lightning conduit runs from the core
    // out to the pylon that points at the target.
    if (coil.flashMs > 0) {
        const bloom = _getGlowSprite('#9af4ff', 48);
        const core = _getGlowSprite('#ffffff', 32);
        if (bloom) {
            const bloomS = VR * (3.8 + (1 - flashF) * 1.4);
            ctx.globalAlpha = 0.85 * flashF;
            ctx.drawImage(bloom, coil.x - bloomS / 2, coil.y - bloomS / 2, bloomS, bloomS);
            ctx.globalAlpha = 1;
        }
        if (core) {
            const cs2 = 30 + 26 * flashF;
            ctx.globalAlpha = Math.min(1, flashF * 1.3);
            ctx.drawImage(core, coil.x - cs2 / 2, coil.y - cs2 / 2, cs2, cs2);
            ctx.globalAlpha = 1;
        }
        const tp = tips[coil.muzzlePylon || 0];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const seed = Math.floor(now / 40) * 17 + Math.floor(coil.id * 1000);
        const dx = tp.x - coil.x, dy = tp.y - coil.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const pts = [coil.x, coil.y];
        for (let k = 1; k < 4; k++) {
            const t = k / 4, amp = (_sgNoise(seed + k * 3.9) - 0.5) * 7;
            pts.push(coil.x + dx * t + nx * amp, coil.y + dy * t + ny * amp);
        }
        pts.push(tp.x, tp.y);
        const trace = () => {
            ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
            for (let q = 2; q < pts.length; q += 2) ctx.lineTo(pts[q], pts[q + 1]);
            ctx.stroke();
        };
        ctx.strokeStyle = `rgba(0,190,255,${0.55 * flashF})`; ctx.lineWidth = 4; trace();
        ctx.strokeStyle = `rgba(235,255,255,${flashF})`; ctx.lineWidth = 1.4; trace();
        ctx.translate(coil.x, coil.y);
        ctx.rotate(coil.muzzleAngle);
        ctx.fillStyle = `rgba(200,252,255,${0.9 * flashF})`;
        ctx.beginPath();
        ctx.moveTo(4, -5);
        ctx.lineTo(VR * 1.7, 0);
        ctx.lineTo(4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    // Charge-up: while a volley is queued the ring pulses brighter.
    if (coil.boltQueue && coil.boltQueue.length > 0) {
        const cp = 0.5 + 0.5 * Math.sin(now / 45);
        ctx.strokeStyle = `rgba(200,255,255,${0.35 + 0.35 * cp})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(coil.x, coil.y, VR + 6 + 2 * cp, 0, Math.PI * 2); ctx.stroke();
    }

    // Empowered shot (5th stack): a brief radial burst of golden lightning
    // shooting outward in every direction, on top of the wider shockwave
    // ring and screen shake fired alongside it in skill-g.js.
    if (coil.empowerBurstMs > 0) {
        const bf = coil.empowerBurstMs / 320;
        const bolts = 9;
        const seed3 = Math.floor(coil.id * 10000);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (let i = 0; i < bolts; i++) {
            const a = (i / bolts) * Math.PI * 2 + seed3 * 0.001;
            const reach = (VR + 20) + (1 - bf) * 46;
            const ex = coil.x + Math.cos(a) * reach, ey = coil.y + Math.sin(a) * reach;
            const nx = -Math.sin(a), ny = Math.cos(a);
            const mx = coil.x + Math.cos(a) * reach * 0.55 + nx * (_sgNoise(seed3 + i * 4.4) - 0.5) * 14;
            const my = coil.y + Math.sin(a) * reach * 0.55 + ny * (_sgNoise(seed3 + i * 4.4) - 0.5) * 14;
            ctx.strokeStyle = `rgba(255,225,150,${0.75 * bf})`;
            ctx.lineWidth = 2.4 * bf + 0.4;
            ctx.beginPath(); ctx.moveTo(coil.x, coil.y); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
        }
        const flareS = 60 + (1 - bf) * 50;
        const flare = _getGlowSprite('#ffe9a8', 40);
        if (flare) {
            ctx.globalAlpha = 0.8 * bf;
            ctx.drawImage(flare, coil.x - flareS / 2, coil.y - flareS / 2, flareS, flareS);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    // Stack bar: five cells above the coil. The whole bar shares one combo
    // timer (any bolt fired refreshes it), so it dims together as that
    // timer runs down instead of each cell decaying on its own; a full bar
    // pulses gold, the next bolt is the empowered one.
    {
        const cw = 9, gap = 2, bh = 5;
        const total = cw * TESLA_STACK_MAX + gap * (TESLA_STACK_MAX - 1);
        const bx = coil.x - total / 2, by = coil.y - VR - 16;
        const full = coil.stackCount >= TESLA_STACK_MAX;
        const pulse = 0.5 + 0.5 * Math.sin(now / 90);
        const life = coil.stackCount > 0 ? Math.max(0.25, Math.min(1, (coil.stackExpireAt - now) / TESLA_STACK_MS)) : 0;
        ctx.fillStyle = 'rgba(10,20,30,0.8)';
        ctx.fillRect(bx - 2, by - 2, total + 4, bh + 4);
        for (let i = 0; i < TESLA_STACK_MAX; i++) {
            const x0 = bx + i * (cw + gap);
            ctx.fillStyle = 'rgba(60,80,95,0.55)';
            ctx.fillRect(x0, by, cw, bh);
            if (i < coil.stackCount) {
                ctx.fillStyle = full ? `rgba(255,${Math.round(200 + 40 * pulse)},${Math.round(90 + 90 * pulse)},1)` : `rgba(0,255,255,${0.45 + 0.55 * life})`;
                ctx.fillRect(x0, by, cw, bh);
            }
        }
        ctx.strokeStyle = full ? `rgba(255,235,170,${0.6 + 0.4 * pulse})` : 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(bx - 2, by - 2, total + 4, bh + 4);
        if (full) {
            const g = _getGlowSprite('#ffe9a8', 24);
            if (g) {
                ctx.globalAlpha = 0.35 + 0.35 * pulse;
                ctx.drawImage(g, coil.x - 24, coil.y - 24, 48, 48);
                ctx.globalAlpha = 1;
            }
        }
    }

    ctx.restore();
}

// Tesla Coil homing bolt: a flattened, pointed oval (lens shape) with the
// head toward the target, baked once and rotated per bolt, plus a short
// fading trail of glow dots.
function _sgBoltSprite() {
    return _sgSprite('teslaBolt', 52, 26, (x, w, h) => {
        const len = 15, wid = 5.5;
        x.translate(w / 2, h / 2);
        x.shadowColor = '#5ee7ff'; x.shadowBlur = 12;
        const g = x.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0, 'rgba(0,120,200,0.85)');
        g.addColorStop(0.55, '#7ff3ff');
        g.addColorStop(1, '#ffffff');
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(len, 0);
        x.quadraticCurveTo(len * 0.2, -wid * 1.25, -len * 0.85, -wid * 0.5);
        x.quadraticCurveTo(-len, 0, -len * 0.85, wid * 0.5);
        x.quadraticCurveTo(len * 0.2, wid * 1.25, len, 0);
        x.closePath();
        x.fill();
        x.shadowBlur = 0;
        x.fillStyle = 'rgba(255,255,255,0.9)';
        x.beginPath();
        x.ellipse(len * 0.2, 0, len * 0.5, wid * 0.32, 0, 0, Math.PI * 2);
        x.fill();
    });
}

function drawTeslaBolt(b) {
    const now = performance.now();
    const trailGlow = _getGlowSprite('#7ff3ff', 8);
    if (trailGlow && b.trail.length > 1) {
        for (let i = 0; i < b.trail.length; i++) {
            const t = (i + 1) / b.trail.length;
            const s = 6 + 10 * t;
            ctx.globalAlpha = 0.5 * t;
            ctx.drawImage(trailGlow, b.trail[i].x - s / 2, b.trail[i].y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
    }
    // HIGH only: a few bright embers peeling off the trail, plus tiny
    // crackling arcs jumping between consecutive trail points.
    if (_gfxLevel < 1 && b.trail.length > 2) {
        const seed = Math.floor(now / 60) * 13 + Math.floor((b.spawnAt || 0) * 7);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < b.trail.length; i++) {
            if (_sgNoise(seed + i * 5.3) < 0.55) continue;
            const p0 = b.trail[i - 1], p1 = b.trail[i];
            const mx = (p0.x + p1.x) / 2 + (_sgNoise(seed + i * 9.1) - 0.5) * 6;
            const my = (p0.y + p1.y) / 2 + (_sgNoise(seed + i * 2.4) - 0.5) * 6;
            ctx.strokeStyle = `rgba(200,255,255,${0.35 * (i / b.trail.length)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(mx, my); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        }
        ctx.restore();
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    if (b.empowered) {
        const g = _getGlowSprite('#ffe9a8', 20);
        if (g) { ctx.globalAlpha = 0.85; ctx.drawImage(g, -22, -22, 44, 44); ctx.globalAlpha = 1; }
        ctx.scale(1.45, 1.45);
    }
    ctx.drawImage(_sgBoltSprite(), -26, -13, 52, 26);
    // HIGH only: a hot core stripe down the spine plus two short crackle
    // ticks off the sides, re-rolled on a fixed beat so it reads as live
    // arcing rather than a static decal.
    if (_gfxLevel < 1) {
        const seed2 = Math.floor(now / 50) * 19 + Math.floor((b.spawnAt || 0) * 11);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(13, 0); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,240,255,0.7)';
        ctx.lineWidth = 0.8;
        for (let k = 0; k < 2; k++) {
            if (_sgNoise(seed2 + k * 6.6) < 0.4) continue;
            const sx = -6 + k * 10, sy = (k === 0 ? -1 : 1) * 3.6;
            ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 2, sy); ctx.stroke();
        }
        ctx.restore();
    }
    ctx.restore();
}

// Impact / detonation rings: {x, y, r0, r1, life, maxLife}
function drawTeslaRings() {
    if (teslaRings.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of teslaRings) {
        const t = 1 - r.life / r.maxLife;
        const rgb = r.color === '#ffe9a8' ? '255,225,150' : '150,245,255';
        ctx.strokeStyle = `rgba(${rgb},${(1 - t) * 0.85})`;
        ctx.lineWidth = (r.color ? 4.5 : 3) * (1 - t) + 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * t, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}
