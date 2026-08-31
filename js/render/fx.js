// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/fx.js — extracted from render.js (shared visual effects: aegis lasers,
// persian tile, dimensional rifts, dim-break zones, boss shockwaves, chain
// lightning, demon-gift aura, vanguard threads, sentinel, polygon helper,
// explosion/particle, scattered projectile, lightning-bolt helpers).
// Depends on core.js (_getGlowSprite, _mobPerf, _gfxLevel).

function drawAegisLasers() {
    aegisLasers.forEach(laser => {
        ctx.save();
        if (!laser.fired) {
            // Wide warning zone
            ctx.strokeStyle = "rgba(255,0,0,0.12)";
            ctx.lineWidth = 22;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            // Dashed targeting line
            ctx.strokeStyle = "rgba(255,100,100,0.9)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([12, 12]);
            if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            ctx.setLineDash([]);
            // tiny crosshair dot at end
            ctx.fillStyle = 'rgba(255,80,80,0.9)';
            ctx.beginPath();
            ctx.arc(laser.end.x, laser.end.y, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            let prog = laser.duration / 200;
            // outer glow
            ctx.strokeStyle = `rgba(255,30,30,${prog * 0.6})`;
            ctx.lineWidth = 50 * prog;
            if (!_mobPerf) ctx.shadowColor = "red";
            if (!_mobPerf) ctx.shadowBlur = 40;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            // core beam
            ctx.strokeStyle = `rgba(255,80,80,${prog})`;
            ctx.lineWidth = 30 * prog;
            if (!_mobPerf) ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
            // bright center
            ctx.strokeStyle = `rgba(255,255,255,${prog})`;
            ctx.lineWidth = 10 * prog;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(laser.start.x, laser.start.y);
            ctx.lineTo(laser.end.x, laser.end.y);
            ctx.stroke();
        }
        ctx.restore();
    });
}

// Persian/Moroccan tile pattern helper
// Vẽ một tile hoa văn Ba Tư tại (tx,ty), kích thước tileSize, với alpha và màu chủ
function _drawPersianTile(tx, ty, tileSize, baseAlpha, hue) {
    const h = tileSize / 2;
    const q = tileSize / 4;
    const e = tileSize / 8;

    ctx.save();
    ctx.translate(tx, ty);

    // Outer diamond frame
    ctx.strokeStyle = `hsla(${hue},70%,55%,${baseAlpha * 0.9})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(h, 0);
    ctx.lineTo(0, h); ctx.lineTo(-h, 0);
    ctx.closePath(); ctx.stroke();

    // Inner square (rotated 45° = diamond)
    const iS = h * 0.55;
    ctx.strokeStyle = `hsla(${hue + 20},65%,65%,${baseAlpha * 0.7})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -iS); ctx.lineTo(iS, 0);
    ctx.lineTo(0, iS); ctx.lineTo(-iS, 0);
    ctx.closePath(); ctx.stroke();

    // 4-petal flower (arabesque)
    const petalR = h * 0.38;
    for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * Math.PI * 2;
        const px = Math.cos(pa) * petalR * 0.42;
        const py = Math.sin(pa) * petalR * 0.42;
        ctx.strokeStyle = `hsla(${hue + 30},75%,70%,${baseAlpha * 0.8})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(px, py, petalR * 0.38, petalR * 0.22,
            pa + Math.PI / 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Center cross
    ctx.strokeStyle = `hsla(${hue},80%,80%,${baseAlpha * 0.6})`;
    ctx.lineWidth = 0.8;
    const cs = h * 0.18;
    ctx.beginPath();
    ctx.moveTo(-cs, 0); ctx.lineTo(cs, 0);
    ctx.moveTo(0, -cs); ctx.lineTo(0, cs);
    ctx.stroke();

    // 4 corner accent dots
    const dotR = h * 0.07;
    ctx.fillStyle = `hsla(${hue + 40},80%,80%,${baseAlpha * 0.7})`;
    for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(pa) * h * 0.7, Math.sin(pa) * h * 0.7, dotR, 0, Math.PI * 2);
        ctx.fill();
    }

    // 8-fold star lines
    ctx.strokeStyle = `hsla(${hue + 10},60%,60%,${baseAlpha * 0.4})`;
    ctx.lineWidth = 0.6;
    for (let s = 0; s < 8; s++) {
        const sa = (s / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * h * 0.2, Math.sin(sa) * h * 0.2);
        ctx.lineTo(Math.cos(sa) * h * 0.48, Math.sin(sa) * h * 0.48);
        ctx.stroke();
    }

    ctx.restore();
}

// Dimensional Rift, full animated ctx render (always active, drawn before enemies)
// Dimensional Rift void sprite: generated reference render, chroma-keyed
// and trimmed the same way as the other sprite-replaced assets this game
// uses. Shows a torn-open window into another universe (starfield +
// distant galaxy) instead of a flat dark gradient disc.
const _riftVoidImg = new Image();
_riftVoidImg.src = 'assets/images/game/rift-void.png';
// Force async decode now instead of on first draw - this sprite is only
// ever drawn once a rift actually spawns (a conditional Skill A proc that
// might not happen until well into a run), so without this the browser
// decodes the full PNG synchronously on that first draw call, causing a
// one-time frame hitch right as the rift appears.
_riftVoidImg.decode().catch(() => {});

function _drawDimensionalRiftsCtx() {
    if (!dimensionalRifts || !dimensionalRifts.length) return;
    ctx.save();
    for (const rift of dimensionalRifts) {
        const lifeRatio = rift.timer / rift.maxTimer;
        const alpha = lifeRatio < 0.167 ? lifeRatio / 0.167 : 1;
        const r = rift.radius;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Void core: a torn-open window into another universe. Static -
        // no pulse/scale animation on the background art itself, only the
        // energy ring and crack lines below stay animated.
        if (_riftVoidImg.complete && _riftVoidImg.naturalWidth) {
            const d = r * 2.0;

            // Soft glow halo behind the void, medium/high graphics only
            if (!_mobPerf && _gfxLevel <= 1) {
                const haloR = d * 0.75;
                const halo = ctx.createRadialGradient(rift.x, rift.y, d * 0.3, rift.x, rift.y, haloR);
                halo.addColorStop(0, 'rgba(157,78,221,0.35)');
                halo.addColorStop(1, 'rgba(157,78,221,0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(rift.x, rift.y, haloR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Clip to a clean circle: the source art's own edge is jagged
            // (torn-crack silhouette, not a perfect circle) and chroma-key
            // cutout can leave faint background residue right at the edge -
            // clipping hides both instead of relying on a perfect cutout.
            // Draw the source art oversized relative to the clip circle so
            // any faint chroma-key fringe left right at its outer edge
            // always lands outside the visible circle.
            const dImg = d * 1.18;
            ctx.save();
            ctx.beginPath();
            ctx.arc(rift.x, rift.y, d / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(_riftVoidImg, rift.x - dImg / 2, rift.y - dImg / 2, dImg, dImg);
            ctx.restore();
        } else {
            const pulse = 1 + Math.sin((rift._age || 0) * 2.5) * 0.05;
            // Sprite not loaded yet - fall back to the old gradient rather
            // than drawing nothing.
            const grad = ctx.createRadialGradient(rift.x, rift.y, 0, rift.x, rift.y, r * 1.25);
            grad.addColorStop(0,    'rgba(2,1,5,1)');
            grad.addColorStop(0.60, 'rgba(60,9,108,0.5)');
            grad.addColorStop(1,    'rgba(36,0,70,0.3)');
            ctx.beginPath();
            ctx.arc(rift.x, rift.y, r * 1.25, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rift.x, rift.y, r * 0.75 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(2,1,5,1)';
            ctx.fill();
        }

        // Energy ring (rotates)
        ctx.save();
        ctx.translate(rift.x, rift.y);
        ctx.rotate(rift._ringRot || 0);

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,245,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(157,78,221,0.7)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        for (let i = 0; i < 12; i++) {
            const ang   = (i / 12) * Math.PI * 2;
            const inner = r * 0.78;
            const outer = r * (1.0 + (i % 3 === 0 ? 0.08 : 0.04));
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
            ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
            ctx.strokeStyle = 'rgba(224,170,255,0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();

        // Cracks (redrawn each frame with 18% glitch chance)
        const triggerGlitch = Math.random() < 0.18;
        ctx.save();
        ctx.translate(rift.x, rift.y);
        for (const crack of rift.cracksInfo) {
            const cAngle = crack.baseAngle + (triggerGlitch ? (Math.random() - 0.5) * 0.2 : 0);
            const cLen   = crack.maxLength  * (triggerGlitch ? (0.85 + Math.random() * 0.3) : 1);
            let lastX = 0, lastY = 0;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let s = 1; s <= 4; s++) {
                const ratio   = s / 4;
                const tx      = Math.cos(cAngle) * cLen * ratio;
                const ty      = Math.sin(cAngle) * cLen * ratio;
                const jitter  = s < 4 ? (r * 0.22) : 0;
                const offset  = (Math.random() - 0.5) * jitter;
                lastX = tx + (-Math.sin(cAngle) * offset);
                lastY = ty + ( Math.cos(cAngle) * offset);
                ctx.lineTo(lastX, lastY);
            }
            ctx.strokeStyle = triggerGlitch ? 'rgba(255,255,255,0.85)' : 'rgba(216,0,255,0.85)';
            ctx.lineWidth   = triggerGlitch ? 3.0 : 1.5;
            ctx.stroke();

            if (crack.hasSubBranch && triggerGlitch) {
                const bAngle = cAngle + (Math.random() > 0.5 ? 0.5 : -0.5);
                ctx.beginPath();
                ctx.moveTo(lastX * 0.5, lastY * 0.5);
                ctx.lineTo(lastX * 0.5 + Math.cos(bAngle) * 20, lastY * 0.5 + Math.sin(bAngle) * 20);
                ctx.strokeStyle = 'rgba(0,245,255,0.7)';
                ctx.lineWidth   = 1.2;
                ctx.stroke();
            }
        }
        ctx.restore();

        // Particles
        for (const p of (rift._particles || [])) {
            ctx.globalAlpha = alpha * Math.max(0, p.life);
            ctx.fillStyle   = p.isCyan ? '#00e5ff' : '#ff007f';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2 + Math.random() * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    ctx.restore();
}

// Egregor death: "Collective Collapse" — a dedicated, larger burst distinct
// from the generic enemy explosion, themed to match Null Slash's violet
// palette. A shrinking dark-void core (the hive-mind collapsing inward)
// followed by a large double shockwave ring and jagged "tentacle snap"
// crack lines radiating outward.
function _drawEgregorDeathBursts() {
    if (!window._egregorDeathBursts || window._egregorDeathBursts.length === 0) return;
    const now = performance.now();
    for (const b of window._egregorDeathBursts) {
        const t = (now - b.spawnAt) / b.duration;
        if (t >= 1) continue;
        ctx.save();
        ctx.translate(b.x, b.y);

        if (t < 0.22) {
            // Implosion: the body collapses into a dark void core
            const it = t / 0.22;
            const r = Math.max(1, b.size * (0.9 - it * 0.7));
            const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            vg.addColorStop(0, 'rgba(10,0,20,0.9)');
            vg.addColorStop(0.6, 'rgba(90,0,160,0.7)');
            vg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vg;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        } else {
            // Eruption: white-hot violet core expanding + twin shockwave rings
            const et = (t - 0.22) / 0.78;
            const fade = 1 - et;
            const r = b.size * 0.3 + et * b.size * 2.2;

            const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, r));
            cg.addColorStop(0, `rgba(255,255,255,${fade * 0.9})`);
            cg.addColorStop(0.25, `rgba(190,80,255,${fade * 0.75})`);
            cg.addColorStop(0.6, `rgba(90,0,160,${fade * 0.45})`);
            cg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = `rgba(220,180,255,${fade * 0.85})`;
            ctx.lineWidth = 5;
            if (!_mobPerf) { ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 20; }
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

            const r2 = Math.max(0, r - b.size * 0.5);
            ctx.strokeStyle = `rgba(140,50,220,${fade * 0.5})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.stroke();

            // Jagged tentacle-snap cracks
            if (_gfxLevel < 2) {
                const crackCount = _gfxLevel < 1 ? 10 : 6;
                ctx.strokeStyle = `rgba(230,200,255,${fade * 0.6})`;
                ctx.lineWidth = 2;
                for (let i = 0; i < crackCount; i++) {
                    const a = (i / crackCount) * Math.PI * 2 + i * 0.7;
                    const midA = a + Math.sin(i * 5.7) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
                    ctx.lineTo(Math.cos(midA) * r * 0.7, Math.sin(midA) * r * 0.7);
                    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}

// Yog-Sothoth Accurate Parry burst: "Temporal Fracture" — a dedicated
// violet/white ring-and-spoke flash distinct from the flat gold explosion
// shared with Sentinel Parry, themed to match the Domain's cursed-energy
// palette so the dodge itself reads as Yog-Sothoth's own effect.
function _drawParryBursts() {
    if (!window._parryBursts || window._parryBursts.length === 0) return;
    const now = performance.now();
    for (const pb of window._parryBursts) {
        const t = (now - pb.spawnAt) / pb.duration;
        if (t >= 1) continue;
        const fade = 1 - t;
        ctx.save();
        ctx.translate(pb.x, pb.y);

        if (t < 0.35) {
            const flashA = 1 - t / 0.35;
            const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
            fg.addColorStop(0, `rgba(255,255,255,${flashA * 0.95})`);
            fg.addColorStop(0.35, `rgba(200,120,255,${flashA * 0.6})`);
            fg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
        }

        // Twin expanding rings, offset timing for a "time-stutter" look
        [0, 0.12].forEach((delay, i) => {
            const rt = Math.max(0, t - delay) / (1 - delay);
            if (rt <= 0 || rt >= 1) return;
            const r = rt * 130;
            const ringA = (1 - rt) * (i === 0 ? 0.85 : 0.55);
            ctx.strokeStyle = i === 0 ? `rgba(220,180,255,${ringA})` : `rgba(150,60,255,${ringA})`;
            ctx.lineWidth = i === 0 ? 3 : 5;
            if (!_mobPerf) { ctx.shadowColor = '#a020f0'; ctx.shadowBlur = 14; }
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // Clock spokes, counter-rotating tick marks
        if (_gfxLevel < 2) {
            const spokeCount = _gfxLevel < 1 ? 8 : 6;
            const spokeLen = 26 * fade;
            const spin = t * Math.PI * 1.4;
            for (let i = 0; i < spokeCount; i++) {
                const a = (i / spokeCount) * Math.PI * 2 + spin;
                const r0 = 34;
                ctx.strokeStyle = `rgba(230,200,255,${fade * 0.7})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
                ctx.lineTo(Math.cos(a) * (r0 + spokeLen), Math.sin(a) * (r0 + spokeLen));
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

// Vine Bind (Phōtokrystos DNT companion effect): vines grow from nothing to
// wrap the rooted enemy's base over the first 1s, then a pulsing green aura
// marks the 2s 50% slow that follows — both fade out together at the end.
function _drawVineBinds() {
    const now = performance.now();
    for (const enemy of enemies) {
        if (!enemy._vineStart) continue;
        const elapsed = now - enemy._vineStart;
        if (elapsed < 0 || elapsed >= 3000) continue;
        const growProg = Math.min(1, elapsed / 1000);
        const slowActive = elapsed >= 1000;
        const fadeOut = elapsed >= 2750 ? Math.max(0, 1 - (elapsed - 2750) / 250) : 1;

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        const baseR = (enemy.size || 30) / 2;

        const vineCount = 6;
        ctx.lineCap = 'round';
        if (!_mobPerf) { ctx.shadowColor = '#2a6a1a'; ctx.shadowBlur = 6; }
        for (let i = 0; i < vineCount; i++) {
            const a = (i / vineCount) * Math.PI * 2 + i * 0.7;
            const len = (baseR * 1.6) * growProg;
            const wob = Math.sin(now / 300 + i * 2) * 4 * growProg;
            const midR = baseR * 0.5 + len * 0.5;
            const midA = a + 0.6 * growProg;
            const tipR = baseR * 0.3 + len;
            const tipA = a + 1.1 * growProg;
            ctx.strokeStyle = `rgba(60,140,40,${0.85 * fadeOut})`;
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * baseR * 0.4, Math.sin(a) * baseR * 0.4 + baseR * 0.6);
            ctx.quadraticCurveTo(
                Math.cos(midA) * midR + wob, Math.sin(midA) * midR * 0.6 + baseR * 0.3,
                Math.cos(tipA) * tipR, Math.sin(tipA) * tipR * 0.55
            );
            ctx.stroke();
            if (growProg > 0.5 && _gfxLevel < 2) {
                ctx.fillStyle = `rgba(90,200,60,${0.7 * fadeOut})`;
                const lx = Math.cos(midA) * midR, ly = Math.sin(midA) * midR * 0.6 + baseR * 0.3;
                ctx.save(); ctx.translate(lx, ly); ctx.rotate(midA);
                ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }
        ctx.shadowBlur = 0;

        if (slowActive) {
            const pulse = 0.6 + 0.4 * Math.sin(now / 200);
            const auraR = baseR * 1.3;
            const g = ctx.createRadialGradient(0, 0, baseR * 0.3, 0, 0, auraR);
            g.addColorStop(0, `rgba(60,220,80,${0.05 * pulse * fadeOut})`);
            g.addColorStop(0.7, `rgba(40,200,70,${0.22 * pulse * fadeOut})`);
            g.addColorStop(1, 'rgba(20,150,50,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(80,255,120,${0.5 * fadeOut})`;
            ctx.lineWidth = 1.5;
            if (!_mobPerf) { ctx.shadowColor = '#40ff80'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
}

// Dimension Break zones: lingering arcs left by Egregor's Null Slash
function _drawDimBreakZones() {
    if (!window._dimBreakZones || window._dimBreakZones.length === 0) return;
    const now = performance.now();
    for (const dbz of window._dimBreakZones) {
        const dbAlpha = Math.max(0, (dbz.expireAt - now) / 1000);
        if (dbAlpha <= 0) continue;
        ctx.save();
        ctx.lineCap = 'round';
        const dbEnd = dbz.arcStart + Math.PI;

        ctx.globalAlpha = dbAlpha * 0.30;
        ctx.strokeStyle = 'rgba(110,0,190,1)';
        ctx.lineWidth = 32;
        if (!_mobPerf) { ctx.shadowColor = '#6600cc'; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.arc(dbz.cx, dbz.cy, dbz.arcR, dbz.arcStart, dbEnd); ctx.stroke();

        if (_gfxLevel < 2) {
            ctx.globalAlpha = dbAlpha * 0.80;
            ctx.strokeStyle = 'rgba(195,90,255,1)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = _mobPerf ? 0 : 12;
            ctx.beginPath(); ctx.arc(dbz.cx, dbz.cy, dbz.arcR, dbz.arcStart, dbEnd); ctx.stroke();
            ctx.globalAlpha = dbAlpha * 0.40;
            ctx.strokeStyle = 'rgba(255,215,255,1)';
            ctx.lineWidth = 1.0;
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(dbz.cx, dbz.cy, dbz.arcR, dbz.arcStart, dbEnd); ctx.stroke();
        }

        if (!_mobPerf && _gfxLevel === 0) {
            const spN = 5 + Math.round(dbAlpha * 7);
            ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 8;
            for (let _si = 0; _si < spN; _si++) {
                const spA = dbz.arcStart + (_si / spN) * Math.PI + Math.sin(now * 0.003 + _si * 1.9) * 0.09;
                const spR = dbz.arcR + Math.sin(now * 0.005 + _si * 2.3) * 9;
                ctx.globalAlpha = dbAlpha * (0.45 + 0.45 * Math.abs(Math.sin(now * 0.007 + _si)));
                ctx.fillStyle = _si % 2 === 0 ? 'rgba(215,170,255,1)' : 'rgba(150,50,255,1)';
                ctx.beginPath(); ctx.arc(
                    dbz.cx + Math.cos(spA) * spR,
                    dbz.cy + Math.sin(spA) * spR,
                    Math.max(0.1, 1.4 + Math.abs(Math.sin(now * 0.004 + _si)) * 2), 0, Math.PI * 2
                ); ctx.fill();
            }
        }

        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Boss shockwaves (Maou Haki)
function drawBossShockwaves() {
    const now = performance.now();
    bossShockwaves.forEach(wave => {
        if (!wave || wave.radius <= 0) return;
        const maxR = wave.maxRadius || canvas.width;
        const prog = Math.min(1, wave.radius / maxR);
        const fade = Math.max(0, 1 - prog);

        // BTM shockwave: green expanding ring
        if (wave._isBTMWave) {
            ctx.save(); ctx.translate(wave.x, wave.y);
            const blink2 = 0.7 + 0.3 * Math.sin(now / 50);
            // Inner fill
            ctx.globalAlpha = fade * 0.18 * blink2;
            ctx.fillStyle = 'rgba(0,255,120,1)';
            ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.fill();
            // Secondary fill ring
            ctx.globalAlpha = fade * 0.1;
            ctx.fillStyle = 'rgba(200,255,230,1)';
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0, wave.radius - 20), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = fade * 0.9;
            // Outer glow ring
            if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 28; }
            ctx.strokeStyle = 'rgba(0,255,136,0.95)'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
            // Bright white inner edge
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0, wave.radius - 10), 0, Math.PI * 2); ctx.stroke();
            // Trailing glow arc
            ctx.strokeStyle = `rgba(45,255,115,${fade * 0.35})`; ctx.lineWidth = 18;
            ctx.beginPath(); ctx.arc(0, 0, wave.radius + 14, 0, Math.PI * 2); ctx.stroke();
            // Ornament dots every 30°
            if (!_mobPerf) {
                ctx.shadowColor = '#a7ffc5'; ctx.shadowBlur = 8;
                for (let di = 0; di < 12; di++) {
                    const da = (di / 12) * Math.PI * 2 + now / 1500;
                    ctx.fillStyle = `rgba(255,255,255,${fade * (0.5 + 0.4 * Math.sin(now / 120 + di))})`;
                    ctx.beginPath(); ctx.arc(Math.cos(da) * wave.radius, Math.sin(da) * wave.radius, 3.5, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
            return;
        }

        // Unbroken Will release wave: an ORANGE crashing tidal wave, not a
        // clean geometric ring like the BTM one above. Radius is perturbed
        // by 3 layered sine frequencies so the leading edge reads as a
        // turbulent, foamy crest rather than a magic circle — the "vùng cấm
        // đạn" (bullet-forbidden zone) it punches out should feel like raw
        // water/force slamming outward, not an ornamental barrier.
        if (wave._isUnbrokenWave) {
            ctx.save(); ctx.translate(wave.x, wave.y);
            const segs = 48;
            const wob = (a) => 1
                + Math.sin(a * 5  + now / 180) * 0.055
                + Math.sin(a * 11 - now / 260) * 0.030
                + Math.sin(a * 23 + now / 95)  * 0.015;

            const bandW = Math.min(70, 18 + wave.radius * 0.06);
            const outerPts = [], innerPts = [];
            for (let i = 0; i <= segs; i++) {
                const a = (i / segs) * Math.PI * 2;
                const rOut = wave.radius * wob(a);
                outerPts.push([Math.cos(a) * rOut, Math.sin(a) * rOut]);
                innerPts.push([Math.cos(a) * Math.max(0, rOut - bandW), Math.sin(a) * Math.max(0, rOut - bandW)]);
            }

            // Deep trailing water body — solid annulus, darkest layer.
            ctx.beginPath();
            ctx.moveTo(outerPts[0][0], outerPts[0][1]);
            for (let i = 1; i <= segs; i++) ctx.lineTo(outerPts[i][0], outerPts[i][1]);
            for (let i = segs; i >= 0; i--) ctx.lineTo(innerPts[i][0], innerPts[i][1]);
            ctx.closePath();
            ctx.fillStyle = `rgba(124,45,18,${fade * 0.32})`;
            ctx.fill();

            // Mobile-only: tint the whole swept interior orange as the wave
            // expands outward, not just the crest band — reads as the zone
            // itself getting "infected" with the color, not just a passing
            // ring. Purely additive gate; PC rendering above is untouched.
            if (window._platform === 'mobile') {
                const innerR = Math.max(0, wave.radius - bandW);

                // Layered fills, each a smaller/deeper-orange disc stacked
                // behind the last — real surf isn't one flat wash, it's
                // several overlapping fronts of water at different depths.
                ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(249,115,22,${fade * 0.30})`;
                ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, innerR * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(234,88,12,${fade * 0.20})`;
                ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, innerR * 0.42, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(194,65,12,${fade * 0.14})`;
                ctx.fill();

                // Swash rings: thin arcs continuously receding inward from
                // the band, like water surging back after the crest passes
                // — sells motion inside the tint instead of a static disc.
                ctx.lineWidth = 2;
                for (let li = 0; li < 3; li++) {
                    const t2 = (now / 480 + li / 3) % 1;
                    const r2 = innerR * (1 - t2);
                    if (r2 <= 2) continue;
                    ctx.strokeStyle = `rgba(255,200,140,${fade * 0.35 * (1 - t2)})`;
                    ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.stroke();
                }
            }

            // Mid-roll: brighter ember orange, inset from the crest so the
            // hottest color sits just behind the foam edge, not on top of it.
            ctx.beginPath();
            for (let i = 0; i <= segs; i++) {
                const a = (i / segs) * Math.PI * 2;
                const r = Math.max(0, wave.radius * wob(a) - bandW * 0.35);
                const x = Math.cos(a) * r, y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(249,115,22,${fade * 0.85})`;
            ctx.lineWidth = bandW * 0.55;
            if (!_mobPerf) { ctx.shadowColor = '#f97316'; ctx.shadowBlur = 22; }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Crest — the crashing leading edge itself, bright foam-white,
            // traced along the SAME wobble so it hugs every bulge/trough.
            ctx.beginPath();
            for (let i = 0; i <= segs; i++) {
                const [x, y] = outerPts[i];
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            if (!_mobPerf) { ctx.shadowColor = '#fff1e0'; ctx.shadowBlur = 14; }
            ctx.strokeStyle = `rgba(255,241,224,${fade * 0.9})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;

            if (!_mobPerf) {
                // Foam clumps: denser/brighter right where the crest bulges
                // outward most (peaks of the wobble), like whitecaps.
                for (let fi = 0; fi < segs; fi += 2) {
                    const a = (fi / segs) * Math.PI * 2;
                    const w = wob(a);
                    if (w < 1.02) continue; // only on outward bulges
                    const r = wave.radius * w;
                    const jig = Math.sin(now / 140 + fi) * 6;
                    const fx_ = Math.cos(a) * r + Math.cos(a + 1.6) * jig;
                    const fy_ = Math.sin(a) * r + Math.sin(a + 1.6) * jig;
                    const size = 2 + (w - 1) * 60;
                    ctx.fillStyle = `rgba(255,255,255,${fade * (0.45 + 0.4 * Math.sin(now / 100 + fi))})`;
                    ctx.beginPath(); ctx.arc(fx_, fy_, size, 0, Math.PI * 2); ctx.fill();
                }

                // Trailing wake — smoother, calmer ripples receding behind
                // the crest, unlike the turbulent leading edge.
                ctx.strokeStyle = `rgba(253,186,116,${fade * 0.30})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0, wave.radius * 0.78), 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = `rgba(253,186,116,${fade * 0.18})`;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0, wave.radius * 0.58), 0, Math.PI * 2); ctx.stroke();

                // Outward spray streaks — short radial lines shooting past
                // the crest, selling the push/force rather than a static ring.
                ctx.strokeStyle = `rgba(255,237,213,${fade * 0.5})`;
                ctx.lineWidth = 1.6;
                for (let si = 0; si < 16; si++) {
                    const a = (si / 16) * Math.PI * 2 + now / 3000;
                    const rBase = wave.radius * wob(a);
                    const len = 10 + 14 * (0.5 + 0.5 * Math.sin(now / 130 + si));
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * (rBase - 4), Math.sin(a) * (rBase - 4));
                    ctx.lineTo(Math.cos(a) * (rBase + len), Math.sin(a) * (rBase + len));
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1; ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(wave.x, wave.y);
        // Slow heavy pulse for the oppressive fill/ring, separate from the
        // faster "blink" used for sparkle/accent flicker below — a slow
        // pulse reads as heavy and dominant, a fast one reads as sparkly.
        const heavyPulse = 0.75 + 0.25 * Math.sin(now / 260);
        const blink = 0.7 + 0.3 * Math.sin(now / 40);

        // Dense void core: near-black at the very center darkening to
        // violet toward the edge, instead of one flat translucent violet
        // wash — reads as a crushing pressure zone rather than a light
        // decorative glow.
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, wave.radius);
        core.addColorStop(0,   `rgba(10,0,20,${fade * 0.55 * heavyPulse})`);
        core.addColorStop(0.6, `rgba(70,0,140,${fade * 0.42 * heavyPulse})`);
        core.addColorStop(1,   `rgba(140,0,220,${fade * 0.30 * heavyPulse})`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.fill();

        // 2. Lightweight Persian arcs (8 rotating arcs, NO grid loop)
        const numArcs = 8;
        const rot = now / 1200;
        ctx.save();
        ctx.rotate(rot);
        for (let i = 0; i < numArcs; i++) {
            const a = (Math.PI * 2 / numArcs) * i;
            const r1 = wave.radius * 0.25, r2 = wave.radius * 0.80;
            ctx.strokeStyle = `rgba(200,80,255,${fade * 0.40 * blink})`;
            ctx.lineWidth = 1.0;
            // Radial spoke
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.stroke();
        }
        // Inner hex (single path, no loop)
        ctx.strokeStyle = `rgba(180,80,255,${fade * 0.50 * blink})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i;
            const r = wave.radius * 0.42;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.stroke();
        // Counter-rotate arc ring
        ctx.rotate(-rot * 1.7);
        ctx.strokeStyle = `rgba(220,130,255,${fade * 0.28})`;
        ctx.lineWidth = 1.0;
        ctx.setLineDash([6, 10]);
        ctx.beginPath(); ctx.arc(0, 0, wave.radius * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 3. Outer halo — thicker and darker than before (28px soft violet
        // → 44px with a near-black outer band) so the boundary reads as a
        // heavy pressure wall instead of a thin glowing ring.
        ctx.globalAlpha = fade * 0.34 * heavyPulse;
        ctx.strokeStyle = 'rgba(150,0,220,1)';
        ctx.lineWidth = 44;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = fade * 0.5 * heavyPulse;
        ctx.strokeStyle = 'rgba(20,0,40,1)';
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius + 20, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;

        // 4. Flying sparks on outer ring
        const sparkCount = 10;
        for (let i = 0; i < sparkCount; i++) {
            // Each spark orbits at slightly different speed & radius offset
            const sparkAngle = (Math.PI * 2 / sparkCount) * i + now / (400 + i * 33);
            const rOff = wave.radius + Math.sin(now / 180 + i * 1.3) * 8;
            const sx = Math.cos(sparkAngle) * rOff;
            const sy = Math.sin(sparkAngle) * rOff;
            const sparkFade = fade * blink * (0.6 + 0.4 * Math.sin(now / 120 + i));
            // Spark body
            if (!_mobPerf) ctx.shadowColor = '#FF44FF'; if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.fillStyle = `rgba(255,180,255,${sparkFade * 0.9})`;
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
            // Spark tail
            const tailAngle = sparkAngle - 0.18;
            ctx.strokeStyle = `rgba(200,100,255,${sparkFade * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(Math.cos(tailAngle) * (rOff - 14), Math.sin(tailAngle) * (rOff - 14));
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // 5. Main ring — thicker (7px → 12px) for more visual weight
        ctx.strokeStyle = `rgba(138,43,226,${(0.7 + 0.3 * blink) * fade})`;
        ctx.lineWidth = 12;
        if (!_mobPerf) ctx.shadowColor = '#CC00FF';
        if (!_mobPerf) ctx.shadowBlur = 24 + 14 * blink;
        ctx.beginPath(); ctx.arc(0, 0, wave.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // 6. Inner bright edge
        if (wave.radius > 12) {
            ctx.strokeStyle = `rgba(255,200,255,${fade * 0.55 * blink})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, wave.radius - 7, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.restore();
    });
}

// Chain lightning
function drawChainLightning(effect) {
    ctx.save();
    let alpha = effect.lifetime / effect.maxLifetime;

    // wide faint pass (no shadowBlur)
    ctx.strokeStyle = `rgba(0,200,255,${alpha * 0.35})`;
    ctx.lineWidth = 9;
    _drawLightningPath(effect);
    ctx.stroke();

    // main bolt
    ctx.strokeStyle = `rgba(0,255,255,${alpha * 0.9})`;
    ctx.lineWidth = 2.5;
    _drawLightningPath(effect);
    ctx.stroke();

    // bright core
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.65})`;
    ctx.lineWidth = 1.2;
    _drawLightningPath(effect);
    ctx.stroke();

    ctx.restore();
}
function _drawLightningPath(effect) {
    ctx.beginPath();
    ctx.moveTo(effect.x1, effect.y1);
    const segs = 6;
    for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const nx = effect.x1 + (effect.x2 - effect.x1) * t;
        const ny = effect.y1 + (effect.y2 - effect.y1) * t;
        const jitter = (1 - Math.abs(t - 0.5) * 2) * 22;
        ctx.lineTo(nx + (Math.random() - 0.5) * jitter, ny + (Math.random() - 0.5) * jitter);
    }
    ctx.lineTo(effect.x2, effect.y2);
}

// Demon Gift aura
function drawDemonGiftAura() {
    const elapsed = demonGiftEffect.endTime - performance.now();
    const alpha = Math.max(0, (elapsed / 4000) * 0.28);
    const now = performance.now();

    ctx.save();
    const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
    grad.addColorStop(0, `rgba(100,0,180,0)`);
    grad.addColorStop(0.7, `rgba(138,43,226,${alpha * 0.6})`);
    grad.addColorStop(1, `rgba(138,43,226,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle pulsing hex grid vignette
    ctx.strokeStyle = `rgba(200,0,255,${alpha * 0.3})`;
    ctx.lineWidth = 1;
    const hexR = 40;
    const cols = Math.ceil(canvas.width / (hexR * 1.5)) + 1;
    const rows = Math.ceil(canvas.height / (hexR * Math.sqrt(3))) + 1;
    const phase = (now / 3000) % 1;
    ctx.globalAlpha = alpha * 0.15;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const hx = c * hexR * 1.5;
            const hy = r * hexR * Math.sqrt(3) + (c % 2 ? hexR * Math.sqrt(3) / 2 : 0);
            const dist = Math.hypot(hx - canvas.width / 2, hy - canvas.height / 2) / canvas.width;
            const a = Math.max(0, 0.6 - dist + 0.2 * Math.sin(phase * Math.PI * 2 + dist * 8));
            if (a <= 0) continue;
            ctx.globalAlpha = alpha * a * 0.3;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const px = hx + hexR * 0.9 * Math.cos(angle);
                const py = hy + hexR * 0.9 * Math.sin(angle);
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();
}

// Final Defense shields

function _drawVanguardThreads() {
    const now = performance.now();
    const n = sentinels.length;
    const pulse = 0.4 + 0.3 * Math.sin(now / 400);
    const color = n >= 12 ? '#FFD700' : '#FF00FF';

    ctx.save();
    ctx.globalAlpha = pulse * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    if (!_mobPerf) ctx.shadowColor = color;
    if (!_mobPerf) ctx.shadowBlur = 6;

    // Connect each sentinel to its 2 nearest neighbours (not all pairs, too
    // dense). Tracks the 2 closest by hand instead of mapping the whole
    // array into distance objects + sorting every outer iteration — this
    // runs every frame whenever 5+ sentinels are alive, no need to allocate
    // n objects and a sorted array n times per frame just to pick 2.
    for (let i = 0; i < n; i++) {
        const a = sentinels[i];
        let j1 = -1, d1 = Infinity, j2 = -1, d2 = Infinity;
        for (let j = 0; j < n; j++) {
            if (j === i) continue;
            const d = Math.hypot(a.x - sentinels[j].x, a.y - sentinels[j].y);
            if (d < d1) { j2 = j1; d2 = d1; j1 = j; d1 = d; }
            else if (d < d2) { j2 = j; d2 = d; }
        }
        if (j1 > i) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(sentinels[j1].x, sentinels[j1].y); ctx.stroke(); }
        if (j2 > i) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(sentinels[j2].x, sentinels[j2].y); ctx.stroke(); }
    }

    ctx.setLineDash([]);
    ctx.restore();
}

// Sentinel shell sprite: generated reference render, chroma-keyed and
// trimmed the same way as the Aries weapons/Photokrystos boomerang. Stays
// neutral gunmetal gray with no baked-in color so the glowColor tint (ring
// stroke + core gem, set below) keeps working unchanged on top of it.
const _sentinelShellImg = new Image();
_sentinelShellImg.src = 'assets/images/game/sentinel-shell.png';
_sentinelShellImg.decode().catch(() => {}); // force async decode now, not on first draw

function drawSentinel(sentinel) {
    const { x, y, size, angle, hp, maxHp } = sentinel;
    const now = performance.now();

    // Great Sage: 1s untargetable phase-out after every real Annihilation
    // Sweep. Every sentinel fades and sheds rising smoke wisps too, same
    // as the player (js/render/player.js's drawPlayer).
    const _gsStealthActive = window._greatSageStealthEnd && now < window._greatSageStealthEnd;
    if (_gsStealthActive) {
        if (!sentinel._greatSageSmokeLast || now - sentinel._greatSageSmokeLast > 90) {
            sentinel._greatSageSmokeLast = now;
            createParticles(x, y + size * 0.3, 2, 'rgba(148,163,184,0.5)', 3, 7);
        }
    }
    // outer save() matching the ctx.restore() at the very end of this
    // function - every nested save/restore pair below composes correctly
    // with this outer alpha since canvas state nests as a stack.
    ctx.save();
    ctx.globalAlpha = _gsStealthActive ? 0.35 : 1;

    let activeCount = sentinels.length;
    let glowColor = '#00FFFF';
    if (activeCount >= 12) glowColor = '#FFD700';
    else if (activeCount >= 5) glowColor = '#FF00FF';

    // Iron Body flicker
    const ironActive = sentinel.ironBody && now < sentinel.ironBodyEnd;
    if (ironActive) {
        const flicker = Math.sin(now / 40) > 0; // fast blink ~12Hz
        if (!flicker) {
            // Skip drawing this frame, creates the flicker effect
            // Still draw a bright white outline so position is visible
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            if (!_mobPerf) ctx.shadowColor = '#ffffff'; if (!_mobPerf) ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
            ctx.restore(); // matches the Great Sage stealth-fade save() above
            return;
        }
        glowColor = '#ffffff'; // white glow during iron body
    }

    // Shield bubble aura (behind body)
    const _shieldVal = sentinel.shield || 0;
    if (_shieldVal > 0) {
        const _bR = size * 1.4;
        const _bPulse = 0.5 + 0.5 * Math.sin(now / 600);
        ctx.save();
        const _bGrad = ctx.createRadialGradient(x, y, _bR * 0.3, x, y, _bR);
        _bGrad.addColorStop(0,    'rgba(255,220,60,0.02)');
        _bGrad.addColorStop(0.60, 'rgba(255,215,0,0.04)');
        _bGrad.addColorStop(0.88, 'rgba(255,215,0,0.10)');
        _bGrad.addColorStop(1,    `rgba(255,215,0,${0.22 * _bPulse})`);
        ctx.fillStyle = _bGrad;
        ctx.beginPath(); ctx.arc(x, y, _bR, 0, Math.PI * 2); ctx.fill();
        if (!_mobPerf) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6; }
        ctx.strokeStyle = `rgba(255,215,0,${0.35 * _bPulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, _bR, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);

    // body glow ring (always)
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke();

    // rotating outer dashed orbit ring - pure decoration (doesn't convey any
    // game state), so it's the first thing to go on mobile once there are
    // enough sentinels on screen that this per-sentinel rotate+dash+stroke
    // actually adds up. Untouched on desktop at any tier.
    const _mobSkipOrbitRing = window._platform === 'mobile' && _gfxLevel >= 1 && sentinels.length >= 5;
    if (!_mobSkipOrbitRing) {
        ctx.save();
        ctx.rotate(now / 1800);
        ctx.strokeStyle = `${glowColor}88`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.arc(0, 0, size + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // body shell
    ctx.shadowBlur = 0;
    if (_sentinelShellImg.complete && _sentinelShellImg.naturalWidth) {
        ctx.drawImage(_sentinelShellImg, -size, -size, size * 2, size * 2);
    } else {
        // Sprite not loaded yet (first instant after page load) - fall back
        // to the old flat gradient rather than drawing nothing.
        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        bodyGrad.addColorStop(0, '#FFFFFF');
        bodyGrad.addColorStop(0.35, '#CCCCCC');
        bodyGrad.addColorStop(0.75, '#888888');
        bodyGrad.addColorStop(1, '#444444');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
    }

    // inner core gem - on mobile, cache the gradient per (size, glowColor)
    // on the sentinel itself instead of rebuilding it every single frame
    // for every sentinel (same trick already used for the fin gradients
    // below); desktop keeps rebuilding it fresh, unchanged from before.
    const coreSize = size * 0.4;
    let coreGrad;
    if (window._platform === 'mobile') {
        if (sentinel._coreGradKey !== coreSize + glowColor) {
            sentinel._coreGradKey = coreSize + glowColor;
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
            g.addColorStop(0, 'white');
            g.addColorStop(0.5, glowColor);
            g.addColorStop(1, `${glowColor}44`);
            sentinel._coreGrad = g;
        }
        coreGrad = sentinel._coreGrad;
    } else {
        coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        coreGrad.addColorStop(0, 'white');
        coreGrad.addColorStop(0.5, glowColor);
        coreGrad.addColorStop(1, `${glowColor}44`);
    }
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, coreSize, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // panel lines (static detail)
    ctx.strokeStyle = `${glowColor}66`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.3);
    ctx.lineTo(-size * 0.5, size * 0.3);
    ctx.moveTo(size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.5, size * 0.3);
    ctx.stroke();

    // side fins: two small triangular metal fins flanking the body, static
    // like the panel lines (don't rotate with the gun arm) - pure detail,
    // no animation. The gradient only depends on `size` (fixed per
    // sentinel), so it's cached on the sentinel instead of rebuilt every
    // frame for every sentinel on screen.
    if (sentinel._finGradSize !== size) {
        sentinel._finGradSize = size;
        sentinel._finGrads = [-1, 1].map(side => {
            const g = ctx.createLinearGradient(side * size * 0.75, 0, side * size * 1.35, 0);
            g.addColorStop(0, '#4a4a4a');
            g.addColorStop(1, '#1a1a1a');
            return g;
        });
    }
    [-1, 1].forEach((side, si) => {
        const fx0 = side * size * 0.75, fy0 = -size * 0.4;
        const fx1 = side * size * 1.35, fy1 = 0;
        const fx2 = side * size * 0.75, fy2 = size * 0.4;
        ctx.save();
        ctx.fillStyle = sentinel._finGrads[si];
        ctx.beginPath();
        ctx.moveTo(fx0, fy0);
        ctx.lineTo(fx1, fy1);
        ctx.lineTo(fx2, fy2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `${glowColor}aa`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
    });

    // Gaia Barrier crescent (top half-disc, static upward, not rotating with gun)
    if ((sentinel._gaiaBarrier || 0) > 0) {
        const _gbPct = sentinel._gaiaBarrier / (sentinel._gaiaBarrierMax || 1);
        const _gbR = size * 1.65;
        const _gbPulse = 0.75 + 0.25 * Math.sin(now / 380);
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10 * _gbPct; }
        const _gbGrad = ctx.createRadialGradient(0, 0, size * 0.6, 0, 0, _gbR);
        _gbGrad.addColorStop(0, `rgba(0,255,136,${0.04 * _gbPct})`);
        _gbGrad.addColorStop(0.65, `rgba(0,200,100,${0.15 * _gbPct})`);
        _gbGrad.addColorStop(0.9, `rgba(0,255,136,${0.42 * _gbPct * _gbPulse})`);
        _gbGrad.addColorStop(1, `rgba(0,100,60,0)`);
        ctx.fillStyle = _gbGrad;
        ctx.beginPath();
        ctx.arc(0, 0, _gbR, Math.PI, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(0,255,136,${0.9 * _gbPct * _gbPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, _gbR, Math.PI, 2 * Math.PI);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // gun arm
    ctx.rotate(angle);
    const gunW = size * 0.8, gunH = size * 0.75;

    // Recoil + muzzle flash: keyed off sentinel._lastFireTime, stamped in
    // entities.js at the moment a shot actually fires, so the barrel kicks
    // back into the mount and flashes on that exact frame instead of only
    // ever tracking the target angle with no feedback on the shot itself.
    const _fireDt = now - (sentinel._lastFireTime || -99999);
    const _recoilDur = 140;
    const _recoilT = _fireDt < _recoilDur ? 1 - (_fireDt / _recoilDur) : 0;
    const gunX = size * 0.5 - _recoilT * gunW * 0.35;

    // barrel: cylindrical metal shading instead of a flat block. Only
    // depends on gunH (fixed per sentinel size), so cached the same way as
    // the fin gradients above instead of rebuilt every frame.
    if (sentinel._gunGradSize !== size) {
        sentinel._gunGradSize = size;
        const g = ctx.createLinearGradient(0, -gunH / 2, 0, gunH / 2);
        g.addColorStop(0, '#232323');
        g.addColorStop(0.35, '#6a6a6a');
        g.addColorStop(0.55, '#3a3a3a');
        g.addColorStop(1, '#161616');
        sentinel._gunGrad = g;
    }
    ctx.fillStyle = sentinel._gunGrad;
    ctx.fillRect(gunX, -gunH / 2, gunW, gunH);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(gunX, -gunH / 2, gunW, gunH);

    // mount collar where the barrel meets the body
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.arc(size * 0.45, 0, gunH * 0.42, 0, Math.PI * 2); ctx.fill();

    // muzzle ring, tinted by the squad glowColor
    ctx.fillStyle = glowColor;
    ctx.beginPath(); ctx.arc(gunX + gunW, 0, 2, 0, Math.PI * 2); ctx.fill();

    // muzzle flash on the fire frame, decaying with the recoil
    if (_recoilT > 0) {
        const flashR = size * 0.9 * _recoilT;
        const flashGrad = ctx.createRadialGradient(gunX + gunW, 0, 0, gunX + gunW, 0, flashR);
        flashGrad.addColorStop(0, `rgba(255,255,255,${0.9 * _recoilT})`);
        flashGrad.addColorStop(0.4, `${glowColor}cc`);
        flashGrad.addColorStop(1, `${glowColor}00`);
        ctx.fillStyle = flashGrad;
        ctx.beginPath(); ctx.arc(gunX + gunW, 0, flashR, 0, Math.PI * 2); ctx.fill();
    }

    // muzzle smoke: a couple of soft gray puffs drifting off the barrel
    // tip after the shot, lingering a bit longer than the flash itself.
    // Radial gradients only, no shadowBlur.
    const _smokeDur = 380;
    if (_fireDt < _smokeDur) {
        const _smokeT = _fireDt / _smokeDur;
        for (let p = 0; p < 2; p++) {
            const drift = _smokeT * size * (0.9 + p * 0.5);
            const puffX = gunX + gunW + drift;
            const puffY = (p === 0 ? -1 : 1) * _smokeT * size * 0.35;
            const puffR = size * (0.22 + _smokeT * 0.28);
            const puffAlpha = (1 - _smokeT) * 0.35;
            const smokeGrad = ctx.createRadialGradient(puffX, puffY, 0, puffX, puffY, puffR);
            smokeGrad.addColorStop(0, `rgba(200,200,200,${puffAlpha})`);
            smokeGrad.addColorStop(1, 'rgba(200,200,200,0)');
            ctx.fillStyle = smokeGrad;
            ctx.beginPath(); ctx.arc(puffX, puffY, puffR, 0, Math.PI * 2); ctx.fill();
        }
    }

    ctx.restore();

    // HP bar
    const barW = 42, barH = 5;
    const barX = x - barW / 2, barY = y - size - 16;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, barH);
    const hpPct = hp / maxHp;
    const hpCol = hpPct > 0.5 ? 'cyan' : hpPct > 0.25 ? 'orange' : 'red';
    ctx.fillStyle = hpCol;
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    ctx.strokeStyle = '#AAA'; ctx.lineWidth = 0.8;
    ctx.strokeRect(barX, barY, barW, barH);

    // Shield bar (above HP bar)
    const shieldVal = sentinel.shield || 0;
    let shBarY = barY - 5;
    if (shieldVal > 0) {
        const shBarH = 3;
        shBarY = barY - shBarH - 2;
        ctx.fillStyle = '#111'; ctx.fillRect(barX - 1, shBarY - 1, barW + 2, shBarH + 2);
        ctx.fillStyle = '#1a2a1a'; ctx.fillRect(barX, shBarY, barW, shBarH);
        const blessAmt = Math.min(sentinel._blessingShield || 0, shieldVal);
        const otherAmt = Math.max(0, shieldVal - blessAmt);
        let drawn = 0;
        if (otherAmt > 0) {
            const w = Math.min(barW, barW * (otherAmt / maxHp));
            ctx.fillStyle = '#aaaaff'; ctx.fillRect(barX + drawn, shBarY, w, shBarH); drawn += w;
        }
        if (blessAmt > 0) {
            const w = Math.min(barW - drawn, barW * (blessAmt / maxHp));
            ctx.fillStyle = '#00ff88'; ctx.fillRect(barX + drawn, shBarY, w, shBarH);
        }
        ctx.strokeStyle = '#555'; ctx.lineWidth = 0.6;
        ctx.strokeRect(barX, shBarY, barW, shBarH);
    }

    // Gaia Barrier bar (above shield/HP bar)
    const _gbAmt = sentinel._gaiaBarrier || 0;
    if (_gbAmt > 0) {
        const _gbBarH = 3;
        const _gbBase = shBarY - _gbBarH - 2;
        const _gbPct = Math.min(1, _gbAmt / (sentinel._gaiaBarrierMax || Math.max(1, _gbAmt)));
        ctx.fillStyle = '#111'; ctx.fillRect(barX - 1, _gbBase - 1, barW + 2, _gbBarH + 2);
        ctx.fillStyle = '#003322'; ctx.fillRect(barX, _gbBase, barW, _gbBarH);
        ctx.fillStyle = '#00ff88'; ctx.fillRect(barX, _gbBase, barW * _gbPct, _gbBarH);
        ctx.strokeStyle = '#00cc66'; ctx.lineWidth = 0.6;
        ctx.strokeRect(barX, _gbBase, barW, _gbBarH);
    }

    // glory triangle
    if (gloryForJusticeActive) {
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.moveTo(x - 5, y - size - 30);
        ctx.lineTo(x + 5, y - size - 30);
        ctx.lineTo(x, y - size - 40);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // absolute shield ring
    if (sentinel.absoluteShield) {
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.fillStyle = 'rgba(255,215,0,0.18)';
        ctx.lineWidth = 3;
        if (!_mobPerf) ctx.shadowColor = '#FFA500'; if (!_mobPerf) ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(x, y, size + 9, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Domain purple ally tint
    if (skillShiftActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(140,0,255,0.28)';
        ctx.beginPath(); ctx.arc(x, y, size * 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,80,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, size * 1.2, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // Blessing of the Primordial, green outer ring + shield glow
    if (sentinel._blessingDR && sentinel._blessingDR > 0) {
        ctx.save();
        const bPulse = 0.55 + 0.45 * Math.sin(now / 700);
        // Outer blessing ring
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8; }
        ctx.strokeStyle = `rgba(0,255,136,${0.6 * bPulse})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -(now / 80) % 8;
        ctx.beginPath(); ctx.arc(x, y, size + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.shadowBlur = 0;
        // Shield glow (brighter when _blessingShield is full 50)
        if (sentinel._blessingShield && sentinel._blessingShield > 0) {
            const shFrac = sentinel._blessingShield / 50;
            ctx.fillStyle = `rgba(0,255,136,${0.08 * shFrac * bPulse})`;
            ctx.beginPath(); ctx.arc(x, y, size * 1.1, 0, Math.PI * 2); ctx.fill();
        }
        // Leviathan bonus: extra gold tinge
        const _levPresent = enemies && enemies.some(e => e.type === 'leviathan' && e.hp > 0);
        if (_levPresent) {
            ctx.strokeStyle = `rgba(255,215,0,${0.5 * bPulse})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(x, y, size + 11, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    // Gaia Barrier outer ring (dashed green, visible when barrier active)
    if ((sentinel._gaiaBarrier || 0) > 0) {
        ctx.save();
        const _gbRingPulse = 0.6 + 0.4 * Math.sin(now / 400);
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10; }
        ctx.strokeStyle = `rgba(0,255,136,${0.75 * _gbRingPulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.lineDashOffset = (now / 60) % 8;
        ctx.beginPath(); ctx.arc(x, y, size + 14, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore(); // matches the Great Sage stealth-fade save() below
}

// Bullets (no shadowBlur – use gradient layers for depth)

function drawPolygon(x, y, radius, sides, angleOffset, color1, color2) {
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    // no shadowBlur – use stroke for definition instead
    ctx.strokeStyle = color1; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + angleOffset;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
}

// Aegis Core

function drawExplosion(exp) {
    ctx.save();
    let p = 1 - exp.lifetime / exp.maxLifetime;
    let radius = exp.size * (1 + p * 1.2);
    if (radius <= 0 || !isFinite(radius)) { ctx.restore(); return; }
    ctx.globalAlpha = 1 - p;

    if (_mobPerf || _gfxLevel >= 2) {
        // Tier 2/3 or mobile: flat circle, no gradient, fast path
        ctx.fillStyle = exp.color;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2); ctx.fill();
    } else {
        // Fast outward shockwave ring (HIGH, first 40% of lifetime)
        if (p < 0.4) {
            const rp = p / 0.4; // 0→1
            const shockR = exp.size * (1.6 + rp * 3.2);
            ctx.save();
            ctx.globalAlpha = (1 - p) * (1 - rp) * 0.9;
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 2.5 * (1 - rp);
            if (!_mobPerf) { ctx.shadowColor = exp.color; ctx.shadowBlur = 18; }
            ctx.beginPath(); ctx.arc(exp.x, exp.y, shockR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // High-quality: shockwave ring + radial gradient
        ctx.strokeStyle = exp.color;
        ctx.lineWidth = 3 * (1 - p);
        ctx.shadowColor = exp.color; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, radius * 1.2, 0, Math.PI * 2); ctx.stroke();

        const eg = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
        eg.addColorStop(0, 'white');
        eg.addColorStop(0.3, exp.color);
        eg.addColorStop(1, 'transparent');
        ctx.fillStyle = eg;
        ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2); ctx.fill();

        // Bloom pass: wide soft halo with screen blend (HIGH only)
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (1 - p) * 0.28;
        ctx.shadowBlur = 0;
        const bloomR = radius * 2.0;
        const bg = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, bloomR);
        bg.addColorStop(0,   'rgba(255,255,255,0.9)');
        bg.addColorStop(0.4, exp.color);
        bg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, bloomR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

// Particles
function drawParticle(p) {
    ctx.save();
    if (p.isBarrierBreakRing) {
        const prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,255,136,${prog * 0.85})`;
        ctx.lineWidth = Math.max(0.5, 3.5 * prog);
        if (!_mobPerf) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * 90, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    } else if (p.isSummonRing) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,255,255,${prog})`;
        ctx.lineWidth = 3; if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * 50, 0, Math.PI * 2); ctx.stroke();
    } else if (p.isGobImpact) {
        // Gate of Babylon hit-flash: growing white/gold cross, ported from the demo
        const prog = p.lifetime / p.maxLifetime;
        const size = (1 - prog) * 40 + 10;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-size, -1, size * 2, 2);
        ctx.fillRect(-1, -size / 2, 2, size);
        if (!_mobPerf) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10; }
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2 * prog;
        ctx.strokeRect(-size, -1, size * 2, 2);
        ctx.strokeRect(-1, -size / 2, 2, size);
        ctx.shadowBlur = 0;
    } else if (p.isEeSlash) {
        // Enuma Elish hit-flash: red/black rip-slash, ported from the demo
        const prog = p.lifetime / p.maxLifetime;
        const size = (1 - prog) * 60 + 20;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(-size, 0); ctx.lineTo(0, size / 4); ctx.lineTo(size, 0); ctx.lineTo(0, -size / 4);
        ctx.closePath();
        ctx.fillStyle = '#18181b';
        ctx.fill();
        if (!_mobPerf) { ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 15; }
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 3 * prog;
        ctx.stroke();
        ctx.shadowBlur = 0;
    } else if (p.isLaserLine) {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = p.color; ctx.lineWidth = 5;
        if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
    } else if (p.isSkillGAura) {
        let prog = p.lifetime / p.maxLifetime;
        ctx.strokeStyle = `rgba(0,180,255,${prog})`;
        ctx.lineWidth = 10; if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + (1 - prog) * p.maxRadius, 0, Math.PI * 2); ctx.stroke();
    } else if (p._bloodPetal) {
        const _bp = p.lifetime / p.maxLifetime;
        ctx.globalAlpha = _bp * 0.92;
        ctx.translate(p.x, p.y);
        ctx.rotate(p._angle);
        if (!_mobPerf) { ctx.shadowColor = '#cc0022'; ctx.shadowBlur = 8; }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.size * 0.5, 0, p.size * _bp, p.size * 0.38 * _bp, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.globalAlpha = p.lifetime / p.maxLifetime;
        if (!_mobPerf) {
            const _glowR = _gfxLevel < 1 ? 14 : _gfxLevel < 2 ? 8 : 5;
            const _gr = Math.ceil(p.size + _glowR);
            const _gs = _getGlowSprite(p.color, _gr);
            if (_gs) ctx.drawImage(_gs, p.x - _gr, p.y - _gr);
        }
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Skill A – Thunder Orbs

function drawScatteredProjectile(p) {
    ctx.save();
    ctx.globalAlpha = p.lifetime / p.maxLifetime;

    if (p.isBouncingBall) {
        const pulse = Math.sin(performance.now() / 90) * 4;
        const cs = Math.max(1, p.size + pulse);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, cs);
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.35, '#ff4400');
        grad.addColorStop(0.7, '#cc0000');
        grad.addColorStop(1, 'darkred');
        ctx.fillStyle = grad;
        if (!_mobPerf) ctx.shadowColor = 'red'; if (!_mobPerf) ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(p.x, p.y, cs, 0, Math.PI * 2); ctx.fill();
        // bright highlight dot
        ctx.fillStyle = 'rgba(255,220,200,0.7)';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x - cs * 0.3, p.y - cs * 0.3, cs * 0.22, 0, Math.PI * 2); ctx.fill();
    } else {
        const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, p.size));
        sg.addColorStop(0, 'white');
        sg.addColorStop(0.5, '#ff8800');
        sg.addColorStop(1, 'rgba(200,60,0,0.5)');
        ctx.fillStyle = sg;
        if (!_mobPerf) ctx.shadowColor = 'orange'; if (!_mobPerf) ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Spirit

function _genBoltPoints(x1, y1, x2, y2, detail, jitter) {
    const pts = [[x1, y1]];
    const steps = Math.max(2, detail);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        pts.push([
            x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter,
            y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter * 0.5
        ]);
    }
    pts.push([x2, y2]);
    return pts;
}
function _strokeBoltPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
}
// Helper: vẽ tia sét zigzag (re-random mỗi frame, dùng cho non-cached)
function _drawLightningBolt(ctx, x1, y1, x2, y2, detail, jitter) {
    _strokeBoltPath(ctx, _genBoltPoints(x1, y1, x2, y2, detail, jitter));
}

//  EGREGOR, Elite enemy render
