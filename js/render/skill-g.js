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

function drawSkillGBarrier() {
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
function _sgCoilGear() {
    const br = TESLA_COIL_SIZE / 2;
    const dim = br * 3.2;
    return _sgSprite('coilGear', dim, dim, (x, w) => {
        x.translate(w / 2, w / 2);
        x.strokeStyle = 'rgba(0,180,200,0.7)'; x.lineWidth = 2;
        const teeth = 10;
        for (let i = 0; i < teeth; i++) {
            const a = (i / teeth) * Math.PI * 2;
            x.beginPath();
            x.moveTo(Math.cos(a) * br * 1.05, Math.sin(a) * br * 1.05);
            x.lineTo(Math.cos(a) * br * 1.35, Math.sin(a) * br * 1.35);
            x.stroke();
        }
        x.strokeStyle = 'rgba(0,220,255,0.4)'; x.lineWidth = 1.5;
        for (let i = 0; i < teeth; i++) {
            const a = (i / teeth) * Math.PI * 2;
            x.beginPath(); x.arc(0, 0, br * 1.18, a, ((i + 0.5) / teeth) * Math.PI * 2); x.stroke();
        }
    });
}
function _sgCoilBody() {
    const br = TESLA_COIL_SIZE / 2;
    const dim = br * 12;
    return _sgSprite('coilBody', dim, dim, (x, w) => {
        const c = w / 2;
        x.fillStyle = 'rgba(0,200,255,0.15)';
        x.shadowColor = 'cyan'; x.shadowBlur = 30;
        x.beginPath(); x.arc(c, c, br * 1.5, 0, Math.PI * 2); x.fill();
        x.shadowBlur = 0;
        const bodyGrad = x.createRadialGradient(c, c, 0, c, c, br);
        bodyGrad.addColorStop(0, 'white');
        bodyGrad.addColorStop(0.4, '#00FFFF');
        bodyGrad.addColorStop(0.8, '#0088AA');
        bodyGrad.addColorStop(1, '#004455');
        x.fillStyle = bodyGrad;
        x.shadowColor = 'cyan'; x.shadowBlur = 28;
        x.beginPath(); x.arc(c, c, br, 0, Math.PI * 2); x.fill();
        x.shadowBlur = 0;
        const coreR = br * 0.45;
        const cg = x.createRadialGradient(c, c, 0, c, c, coreR);
        cg.addColorStop(0, 'white');
        cg.addColorStop(0.5, 'cyan');
        cg.addColorStop(1, 'rgba(0,200,255,0.2)');
        x.fillStyle = cg;
        x.beginPath(); x.arc(c, c, coreR, 0, Math.PI * 2); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.45)';
        x.beginPath();
        x.ellipse(c - br * 0.2, c - br * 0.2, br * 0.26, br * 0.16, -Math.PI / 4, 0, Math.PI * 2);
        x.fill();
    });
}

// Tesla Coil (Skill G)
function drawTeslaCoil(coil) {
    const now = performance.now();
    ctx.save();
    const br = coil.size / 2;
    const R = coil.auraRadius;

    // aura: slowly turning octagon + static dashed rim
    const ps = R * 2 + 8;
    ctx.save();
    ctx.translate(coil.x, coil.y);
    ctx.rotate(now / 5000);
    ctx.drawImage(_sgCoilPoly(), -ps / 2, -ps / 2, ps, ps);
    ctx.restore();
    ctx.drawImage(_sgCoilRim(), coil.x - ps / 2, coil.y - ps / 2, ps, ps);

    // counter-rotating gear ring
    const gs = br * 3.2;
    ctx.save();
    ctx.translate(coil.x, coil.y);
    ctx.rotate(-now / 4000);
    ctx.drawImage(_sgCoilGear(), -gs / 2, -gs / 2, gs, gs);
    ctx.restore();

    // body + core + glow
    const bs = br * 12;
    ctx.drawImage(_sgCoilBody(), coil.x - bs / 2, coil.y - bs / 2, bs, bs);

    // Bolt-count ring: fills clockwise toward the coil's self-destruct at
    // TESLA_COIL_MAX_BOLTS, turning red as it nears the limit.
    if (coil.boltsFired > 0) {
        const frac = Math.min(1, coil.boltsFired / TESLA_COIL_MAX_BOLTS);
        ctx.strokeStyle = frac > 0.8 ? `rgba(255,${Math.round(120 - 100 * (frac - 0.8) / 0.2)},60,0.9)` : 'rgba(170,250,255,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coil.x, coil.y, br * 1.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
    }

    // Firing flash: a bloom over the whole coil plus a short bright spike
    // pointing the way the bolt just left, fading over flashMs.
    if (coil.flashMs > 0) {
        const f = coil.flashMs / 160;
        const bloomS = br * (4.8 + (1 - f) * 1.6);
        const bloom = _getGlowSprite('#9af4ff', 48);
        if (bloom) {
            ctx.globalAlpha = 0.95 * f;
            ctx.drawImage(bloom, coil.x - bloomS / 2, coil.y - bloomS / 2, bloomS, bloomS);
            ctx.globalAlpha = 1;
        }
        ctx.save();
        ctx.translate(coil.x, coil.y);
        ctx.rotate(coil.muzzleAngle);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(190,250,255,${0.85 * f})`;
        ctx.beginPath();
        ctx.moveTo(br * 0.6, -br * 0.4);
        ctx.lineTo(br * 2.8, 0);
        ctx.lineTo(br * 0.6, br * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    // Charge-up: while a volley is queued the core pulses brighter.
    if (coil.boltQueue && coil.boltQueue.length > 0) {
        const cp = 0.5 + 0.5 * Math.sin(now / 45);
        ctx.strokeStyle = `rgba(200,255,255,${0.35 + 0.35 * cp})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(coil.x, coil.y, br * (1.95 + 0.12 * cp), 0, Math.PI * 2); ctx.stroke();
    }

    // HP bar
    const bw = 42, bh = 5;
    const bx = coil.x - bw / 2, by = coil.y - coil.size - 10;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
    const hpPct = coil.hp / coil.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#00FFFF' : hpPct > 0.25 ? 'orange' : 'red';
    ctx.fillRect(bx, by, bw * hpPct, bh);
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 0.8; ctx.strokeRect(bx, by, bw, bh);

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
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.drawImage(_sgBoltSprite(), -26, -13, 52, 26);
    ctx.restore();
}

// Impact / detonation rings: {x, y, r0, r1, life, maxLife}
function drawTeslaRings() {
    if (teslaRings.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of teslaRings) {
        const t = 1 - r.life / r.maxLife;
        ctx.strokeStyle = `rgba(150,245,255,${(1 - t) * 0.85})`;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * t, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}
