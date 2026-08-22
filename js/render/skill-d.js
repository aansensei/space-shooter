// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/skill-d.js — Death Star: Draconic Annihilation (Tinh Vương Long: Tử
// Long Tinh). Charge VFX (drawSkillDCharging), the Death Star body itself
// (drawDeathStar), the mark->laser beams (drawSkillDLasers) and spaceship
// firing bolts (drawSkillDBolts) fired from js/skills.js's updateSkillD, and
// the allied spaceship drone (drawSkillDSpaceships).

function drawSkillDCharging() {
    const now = performance.now();
    const p = Math.min((now - skillDChargeStartTime) / skillDChargeTime, 1);
    const cx = player.x, cy = player.y;

    ctx.save();

    // 1. GRAVITY WAVES, expanding rings pulsing outward from the forming core,
    // alternating cyan/violet for a richer two-tone pulse than a single hue
    const _ringCount = _gfxLevel < 1 ? 4 : _gfxLevel < 2 ? 3 : 2;
    for (let ring = 0; ring < _ringCount; ring++) {
        const phase = ((now / (900 - p * 300) + ring / _ringCount) % 1);
        const ringR = 20 + (1 - phase) * 150 * p;
        const ringA = phase * 0.75 * p;
        ctx.strokeStyle = ring % 2 === 0 ? `rgba(0,255,255,${ringA})` : `rgba(160,0,255,${ringA})`;
        ctx.lineWidth = 2.5 * (1 - phase * 0.5);
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // 2. ENERGY STREAMS, spiraling matter trails pulled inward toward the
    // core (multi-segment curved paths, not flat lines — tier 0/1 get the
    // full spiral, tier 2+ fall back to short straight streaks)
    const streamCount = _gfxLevel < 1 ? 12 : _gfxLevel < 2 ? 8 : 4;
    const _spiralSteps = _gfxLevel < 1 ? 16 : _gfxLevel < 2 ? 8 : 0;
    for (let i = 0; i < streamCount; i++) {
        const spinDir = i % 2 === 0 ? 1 : -1;
        const baseAngle = (i / streamCount) * Math.PI * 2 + (now * 0.0015) * spinDir;
        const len = 60 + (1 - p) * 160;
        ctx.beginPath();
        if (_spiralSteps > 0) {
            for (let s = _spiralSteps; s >= 0; s--) {
                const t = s / _spiralSteps;
                const dist = 20 + t * len;
                const angle = baseAngle + t * 2.2 * spinDir;
                const sx = cx + Math.cos(angle) * dist, sy = cy + Math.sin(angle) * dist;
                s === _spiralSteps ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
        } else {
            const distOffset = len + 20;
            ctx.moveTo(cx + Math.cos(baseAngle) * distOffset, cy + Math.sin(baseAngle) * distOffset);
            ctx.lineTo(cx + Math.cos(baseAngle + 0.2) * (distOffset - 20), cy + Math.sin(baseAngle + 0.2) * (distOffset - 20));
        }
        ctx.strokeStyle = i % 2 === 0 ? `rgba(180,0,255,${0.25 + p * 0.65})` : `rgba(0,255,255,${0.25 + p * 0.65})`;
        ctx.lineWidth = 0.8 + p * 1.6;
        ctx.stroke();
    }

    // 3. CORE forming — smoother multi-stop falloff than a 4-stop gradient,
    // plus a glowing rim stroke (tier 0-1 only)
    const coreR = 5 + p * 25;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    coreGrad.addColorStop(0,    '#ffffff');
    coreGrad.addColorStop(0.22, '#aef9ff');
    coreGrad.addColorStop(0.45, '#00ffff');
    coreGrad.addColorStop(0.72, '#8800ff');
    coreGrad.addColorStop(0.92, '#380066');
    coreGrad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();

    if (_gfxLevel < 2) {
        ctx.strokeStyle = 'rgba(200,140,255,0.85)';
        ctx.lineWidth = 1.5;
        if (!_mobPerf) { ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 18 * p; }
        ctx.beginPath(); ctx.arc(cx, cy, coreR * 1.15, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 4. TITLE — same 3-layer composition as the old Black Hole's charge
    // text (large faded kanji behind, bold subtitle in front, small italic
    // full name below), same purple palette, new Death Star wording.
    {
        const textT = Math.min(p / 0.15, 1) * Math.max(0, 1 - (p - 0.7) / 0.3);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.28;
            ctx.font = 'bold 100px serif';
            ctx.fillStyle = '#6600cc';
            if (!_mobPerf) { ctx.shadowColor = '#4400aa'; ctx.shadowBlur = 40; }
            ctx.fillText('龍滅死星', cx, cy - 80);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 28px "Arial Black", sans-serif';
            ctx.fillStyle = '#cc88ff';
            if (!_mobPerf) { ctx.shadowColor = '#8800ff'; ctx.shadowBlur = 28; }
            ctx.fillText('DRACONIC ANNIHILATION', cx, cy - 122);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#bb66ff';
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.fillText(window._lang === 'vi' ? '— Tinh Vương Long: Tử Long Tinh —' : '— Death Star —', cx, cy - 98);
            ctx.restore();
        }
    }

    ctx.restore();
}

// Debris field (the ring of asteroid rubble orbiting the Death Star) is
// generated once per cast and cached on the deathStar object itself
// (deathStar._debris) — same lazy-cache-on-the-entity idiom used elsewhere in
// this render folder rather than regenerating every frame.
// Golden-angle placement (the sunflower-seed distribution trick) instead of
// a plain Math.random() angle per item — a purely random angle can (and, per
// AanSensei's report, did) clump visibly to one side with only ~40-80 points.
// The golden angle's key property: ANY prefix of the sequence stays close to
// evenly spread around the full circle, so this stays ring-shaped whether 80
// are drawn (HIGH tier) or only the first 40 (MED tier's _drawSkillDDebrisRing
// subsampling) — not just the final full set.
const _GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
// Each debris piece's polygon + gradient fill + stroke is baked once onto a
// small offscreen canvas at generation time instead of rebuilding the path
// and creating a fresh createLinearGradient for all 80 pieces every single
// frame — that per-frame cost (up to 80 gradients + 80 path fills/strokes,
// twice — once per near/far pass) was the actual source of the reported lag,
// not just a style choice. Drawing is now a single cheap drawImage per piece.
// The rim-light direction is fixed per-piece (baked in) rather than always
// facing the Death Star center — a static "lit from one side" read instead
// of a live-recomputed one, visually close enough to be worth the trade.
// Every piece orbits at this SAME shared angular speed (not per-piece
// random) — `time` below is the raw performance.now() clock, not reset per
// Death Star spawn, so with independent per-piece speeds each piece drifts
// by a different huge multiple of its own rate and the golden-angle even
// spacing gets scrambled almost immediately (looked like debris "missing"
// on one side, clumped on the other). A single shared speed keeps every
// piece's relative angle — and therefore the even spacing — fixed forever,
// while the ring as a whole still visibly rotates.
const _SKILLD_DEBRIS_SPEED = 0.0022;
function _genSkillDDebris(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
        const distance = 130 + Math.random() * 150;
        const sides = 4 + Math.floor(Math.random() * 4);
        const pts = [];
        let maxR = 0;
        for (let s = 0; s < sides; s++) {
            const a = (s / sides) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const r = 3 + Math.random() * 9;
            pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            if (r > maxR) maxR = r;
        }
        const dim = Math.ceil(maxR * 2) + 4;
        const half = dim / 2;
        const sc = document.createElement('canvas');
        sc.width = dim; sc.height = dim;
        const scx = sc.getContext('2d');
        scx.translate(half, half);
        scx.beginPath();
        scx.moveTo(pts[0].x, pts[0].y);
        for (let j = 1; j < pts.length; j++) scx.lineTo(pts[j].x, pts[j].y);
        scx.closePath();
        const grad = scx.createLinearGradient(-half, -half, half, half);
        grad.addColorStop(0, '#00ffff');
        grad.addColorStop(0.3, '#331166');
        grad.addColorStop(1, '#0a0a10');
        scx.fillStyle = grad;
        scx.fill();
        scx.strokeStyle = '#111';
        scx.lineWidth = 1;
        scx.stroke();

        out.push({
            angle: (i * _GOLDEN_ANGLE) % (Math.PI * 2),
            dist: distance,
            speed: _SKILLD_DEBRIS_SPEED,
            tilt: Math.random() * Math.PI * 2,
            sprite: sc, half,
        });
    }
    return out;
}

function _drawSkillDDebrisRing(debris, time, drawBehind, count) {
    for (let i = 0; i < count; i++) {
        const d = debris[i];
        const currentAngle = d.angle + time * d.speed;
        const sy = Math.sin(currentAngle);
        if ((drawBehind && sy >= 0) || (!drawBehind && sy < 0)) continue;

        const sx = Math.cos(currentAngle) * d.dist;
        const yPos = sy * d.dist * 0.3;

        ctx.save();
        ctx.translate(sx, yPos);
        ctx.rotate(d.tilt + time * d.speed * 2);
        ctx.drawImage(d.sprite, -d.half, -d.half);
        ctx.restore();
    }
}

// Ring styling matches this game's established neon-construct language
// (Goliath's gradient-bezel rings with orbiting glow studs, the Sigil HUD's
// glowing dot icons) rather than the reference preview's flat-grey physical
// machinery — a radial-gradient band + soft rim light + glowing gem studs
// instead of flat fill + rectangular grooves/tabs.
function _drawSkillDMechanicalRing(outer, inner, rotation, fillColor, accentColor, segments) {
    ctx.save();
    ctx.rotate(rotation);

    const mid = (outer + inner) / 2;
    const bandGrad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
    bandGrad.addColorStop(0,   fillColor);
    bandGrad.addColorStop(0.5, accentColor + '22');
    bandGrad.addColorStop(1,   fillColor);
    ctx.fillStyle = bandGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.arc(0, 0, inner, 0, Math.PI * 2, true);
    ctx.fill();

    // Soft rim light on both edges instead of a flat grey stroke
    ctx.strokeStyle = accentColor + '55';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, outer, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, inner, 0, Math.PI * 2); ctx.stroke();

    // Glowing gem studs orbiting mid-band, same visual family as Goliath's
    // ring bezels and the Sigil HUD's icon dots. One cached glow sprite
    // (core.js's _getGlowSprite) reused via drawImage for every stud instead
    // of a fresh createRadialGradient + shadowBlur toggle per stud per frame
    // — with up to 20 studs across both rings that was a real perf cost.
    const studR = (outer - inner) * 0.22;
    const studSprite = _getGlowSprite(accentColor, studR);
    if (studSprite) {
        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a);
            ctx.drawImage(studSprite, mid - studR, -studR);
            ctx.restore();
        }
    }
    ctx.restore();
}

function drawDeathStar() {
    if (!deathStar || deathStar.size <= 0) return;
    const now = performance.now();
    if (!deathStar._debris) deathStar._debris = _genSkillDDebris(80);

    // Old Black Hole's outermost visible radius was blackHole.size * 2.0 (the
    // lens glow). This structure's outermost ring (the base disc) reaches
    // S * 2.8, so scale the whole draw by 2.0/2.8 to match that same overall
    // on-screen footprint at every growth stage instead of rendering larger.
    const DS_SCALE = 2.0 / 2.8;
    ctx.save();
    ctx.translate(deathStar.x, deathStar.y);
    ctx.scale(DS_SCALE, DS_SCALE);

    const S = deathStar.size; // grows 10 -> 120, same as the old Black Hole's growth-in

    // Outer aura halo — a slow-breathing glow surrounding the whole structure,
    // MED/HIGH only, sits behind everything else
    if (_gfxLevel < 2) {
        const breathe = 0.5 + 0.5 * Math.sin(now / 1400);
        const auraGrad = ctx.createRadialGradient(0, 0, S * 2.6, 0, 0, S * 4.2);
        auraGrad.addColorStop(0, `rgba(150,0,255,${0.10 + breathe * 0.06})`);
        auraGrad.addColorStop(0.6, `rgba(0,200,255,${0.04 + breathe * 0.03})`);
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath(); ctx.arc(0, 0, S * 4.2, 0, Math.PI * 2); ctx.fill();
    }

    // Orbiting energy motes — a particle halo at several radii/speeds, HIGH
    // gets a dense field, MED a sparse one. Uses core.js's cached glow-sprite
    // (drawImage of a pre-baked gradient) instead of a fresh
    // createRadialGradient + shadowBlur toggle per mote per frame — with up
    // to 26 of these every frame that was a real perf cost, not just visual.
    if (_gfxLevel < 2) {
        const moteCount = _gfxLevel < 1 ? 26 : 10;
        const cyanSprite = _getGlowSprite('#00ffff', 5);
        const violetSprite = _getGlowSprite('#aa00ff', 5);
        for (let i = 0; i < moteCount; i++) {
            const ring = i % 3;
            const radius = S * (1.9 + ring * 0.35);
            const speed = (ring % 2 === 0 ? 1 : -1) * (0.00035 + ring * 0.0001);
            const a = (i / moteCount) * Math.PI * 2 + now * speed;
            const mx = Math.cos(a) * radius, my = Math.sin(a) * radius * 0.94;
            const tw = 0.4 + 0.6 * Math.sin(now / 300 + i * 1.7);
            const sprite = i % 2 === 0 ? cyanSprite : violetSprite;
            if (sprite) {
                ctx.globalAlpha = tw;
                ctx.drawImage(sprite, mx - 5, my - 5);
                ctx.globalAlpha = 1;
            }
        }
    }

    // Far debris (behind), count/pass tiered
    const _debrisCount = _gfxLevel < 1 ? 80 : _gfxLevel < 2 ? 40 : 0;
    if (_debrisCount > 0) {
        ctx.globalAlpha = 0.6;
        _drawSkillDDebrisRing(deathStar._debris, now, true, _debrisCount);
        ctx.globalAlpha = 1.0;
    }

    // Base satellite disc
    ctx.fillStyle = '#0a0a15';
    ctx.strokeStyle = '#221144';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, S * 2.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Radar-style scanning sweep crossing the disc, HIGH only
    if (_gfxLevel < 1) {
        ctx.save();
        ctx.rotate(now * 0.0009);
        const sweepGrad = ctx.createLinearGradient(0, 0, S * 2.5, 0);
        sweepGrad.addColorStop(0, 'rgba(0,255,255,0.35)');
        sweepGrad.addColorStop(1, 'rgba(0,255,255,0)');
        ctx.strokeStyle = sweepGrad;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(S * 2.5, 0); ctx.stroke();
        ctx.restore();
    }

    // Mechanical rings — animated only at tier 0, static angle otherwise
    if (_gfxLevel < 3) {
        const t1 = _gfxLevel < 1 ? now * 0.0005 : 0.6;
        const t2 = _gfxLevel < 1 ? -now * 0.0003 : -0.4;
        _drawSkillDMechanicalRing(S * 2.25, S * 1.9, t1, '#111122', '#00ffff', _gfxLevel < 2 ? 12 : 6);
        if (_gfxLevel < 2) _drawSkillDMechanicalRing(S * 1.7, S * 1.35, t2, '#151525', '#8800ff', 8);
    }

    // Energy conduits — pulsing power lines feeding the inner ring into the
    // core, MED/HIGH only. A short solid-color dash at the pulse position
    // (alpha falls off with distance from it) reads the same as the fade
    // this used to build via a fresh 5-stop createLinearGradient per conduit
    // per frame, without the per-frame gradient-object cost.
    if (_gfxLevel < 2) {
        const conduitCount = _gfxLevel < 1 ? 8 : 4;
        const conduitLen = S * 0.15;
        for (let i = 0; i < conduitCount; i++) {
            const a = (i / conduitCount) * Math.PI * 2 + now * 0.0004;
            const pulse = (now / 500 + i / conduitCount) % 1;
            ctx.save();
            ctx.rotate(a);
            const px = S * 1.5 - pulse * conduitLen;
            ctx.strokeStyle = 'rgba(180,240,255,0.9)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(px + 6, 0); ctx.lineTo(px - 6, 0); ctx.stroke();
            ctx.restore();
        }
    }

    // Core — the focal point, kept at every tier, with a smoother multi-stop
    // falloff (more stops than a plain 4-color blend, richer mid-tones)
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 1.5);
    coreGrad.addColorStop(0,    '#ffffff');
    coreGrad.addColorStop(0.10, '#eefeff');
    coreGrad.addColorStop(0.20, '#aef9ff');
    coreGrad.addColorStop(0.32, '#00ffff');
    coreGrad.addColorStop(0.45, '#22bfff');
    coreGrad.addColorStop(0.58, '#7a00ee');
    coreGrad.addColorStop(0.72, '#aa00ff');
    coreGrad.addColorStop(0.85, '#5c0099');
    coreGrad.addColorStop(0.94, '#220044');
    coreGrad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, 0, S * 1.5, 0, Math.PI * 2); ctx.fill();

    // Concentric turbulence rings inside the core, pulsing at slightly
    // different phases for a "roiling plasma" read instead of a flat gradient
    if (_gfxLevel < 2) {
        const ringCount = _gfxLevel < 1 ? 6 : 3;
        for (let i = 0; i < ringCount; i++) {
            const rp = ((now / (700 + i * 90)) % 1);
            ctx.strokeStyle = `rgba(180,240,255,${0.20 * (1 - rp)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(0, 0, S * 0.3 + rp * S * 0.9, 0, Math.PI * 2); ctx.stroke();
        }
    }

    // In-core lightning arcs — HIGH gets real forking sub-branches off each
    // main bolt, MED gets the plain jointed bolt, LOW+ none (matches fx.js's
    // flat/no-decoration cutoff convention)
    if (_gfxLevel < 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8; }
        const arcCount = _gfxLevel < 1 ? 8 : 2;
        const segCount = _gfxLevel < 1 ? 5 : 2;
        for (let i = 0; i < arcCount; i++) {
            ctx.save();
            ctx.rotate(now * 0.002 + i);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            let d = 0, py = 0;
            const branchPoints = [];
            for (let s = 0; s < segCount; s++) {
                d += 8 + Math.random() * 10;
                py = (Math.random() - 0.5) * (10 + s * 8);
                ctx.lineTo(d, py);
                if (_gfxLevel < 1 && s > 0 && Math.random() < 0.5) branchPoints.push({ d, py });
            }
            ctx.stroke();
            // Sub-forks off the main bolt, thinner + dimmer
            if (branchPoints.length > 0) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(210,180,255,0.6)';
                for (const bp of branchPoints) {
                    const forkAngle = (Math.random() - 0.5) * 1.4;
                    const forkLen = 6 + Math.random() * 10;
                    ctx.beginPath();
                    ctx.moveTo(bp.d, bp.py);
                    ctx.lineTo(bp.d + Math.cos(forkAngle) * forkLen, bp.py + Math.sin(forkAngle) * forkLen);
                    ctx.stroke();
                }
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            }
            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    // Near debris (front), same tier gating as the far pass. Reset to a
    // fresh translate+scale (not just continuing the existing stack) since
    // the mechanical-ring/lightning-arc draws above rotate the context
    // internally — each already wraps its own save/restore, but resetting
    // here is cheap insurance against any accumulated transform drift.
    if (_debrisCount > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(deathStar.x, deathStar.y);
        ctx.scale(DS_SCALE, DS_SCALE);
        _drawSkillDDebrisRing(deathStar._debris, now, false, _debrisCount);
    }

    ctx.restore();

    // Spawn-range indicator: dashed circle showing the exact radius within
    // which ANY enemy death spawns a Galactic Spaceship (see handleEnemyKill
    // in entities.js) — drawn in plain world space, not the scaled/rotated
    // local frame above, since this radius is a world-space value. Formula
    // must stay in sync with SKILLD_CONTACT_MULT (js/config.js) + 180.
    // guide.html reuses this file without loading config.js, so
    // SKILLD_CONTACT_MULT isn't guaranteed to exist there — fall back to the
    // same literal value config.js defines it as.
    const _dsContactMult = typeof SKILLD_CONTACT_MULT !== 'undefined' ? SKILLD_CONTACT_MULT : 2.5 * (2.0 / 2.8);
    const spawnR = S * _dsContactMult + 180;
    ctx.save();
    ctx.translate(deathStar.x, deathStar.y);
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -now * 0.02;
    ctx.strokeStyle = 'rgba(74,222,128,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, spawnR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

// Crosshair ring around each currently-marked target, telegraphing the
// upcoming Mark & Annihilate beam — the mechanic has no other visual cue
// without this, since js/skills.js only tracks the mark as a plain array.
function drawSkillDMarks() {
    if (!deathStar || !deathStar.markedTargets) return;
    for (const e of deathStar.markedTargets) {
        if (!e || e.hp <= 0) continue;
        const r = e.size / 2 + 10;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -r - 5); ctx.lineTo(0, -r + 5);
        ctx.moveTo(0, r - 5); ctx.lineTo(0, r + 5);
        ctx.moveTo(-r - 5, 0); ctx.lineTo(-r + 5, 0);
        ctx.moveTo(r - 5, 0); ctx.lineTo(r + 5, 0);
        ctx.stroke();
        ctx.restore();
    }
}

function drawSkillDLasers() {
    for (const l of window.skillDLasers) {
        // Punch curve: near-full brightness for the first half of its life,
        // then a fast falloff — reads as a sudden discharge, not a fade-in.
        const punch = l.life > 0.5 ? 1 : l.life / 0.5;
        const jitter = (Math.random() - 0.5) * 3 * punch;
        const ang = Math.atan2(l.endY - l.startY, l.endX - l.startX);
        const perpX = Math.cos(ang + Math.PI / 2), perpY = Math.sin(ang + Math.PI / 2);
        const sx = l.startX + perpX * jitter, sy = l.startY + perpY * jitter;
        const ex = l.endX + perpX * jitter, ey = l.endY + perpY * jitter;

        ctx.save();
        ctx.globalAlpha = l.life;

        // Three-layer beam sized like Aegis Core's Lumen Nova (js/render/fx.js
        // drawAegisLasers — outer/core/center ~50/30/10 lineWidth) rather than
        // a thin line, so it reads with real weight instead of a laser pointer.
        ctx.strokeStyle = '#aa00ff';
        ctx.lineWidth = 46 * punch;
        if (!_mobPerf) { ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 40; }
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

        ctx.strokeStyle = '#e0aaff';
        ctx.lineWidth = 24 * punch;
        if (!_mobPerf) ctx.shadowBlur = 22;
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 9 * punch;
        if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16; }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Muzzle flash burst at the origin, brightest in the first instant
        if (punch > 0.4) {
            const flashR = 26 * punch;
            const flashGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, flashR);
            flashGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
            flashGrad.addColorStop(0.35, 'rgba(0,255,255,0.6)');
            flashGrad.addColorStop(1, 'rgba(170,0,255,0)');
            ctx.fillStyle = flashGrad;
            ctx.beginPath(); ctx.arc(sx, sy, flashR, 0, Math.PI * 2); ctx.fill();

            // Impact flare at the endpoint
            const impactGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, flashR * 0.8);
            impactGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
            impactGrad.addColorStop(0.4, 'rgba(0,255,255,0.5)');
            impactGrad.addColorStop(1, 'rgba(170,0,255,0)');
            ctx.fillStyle = impactGrad;
            ctx.beginPath(); ctx.arc(ex, ey, flashR * 0.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

function drawSkillDBolts() {
    for (const b of window.skillDBolts) {
        ctx.save();
        ctx.globalAlpha = b.life * 0.85;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 * b.life;
        if (!_mobPerf) { ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.restore();
    }
}

function drawSkillDSpaceships() {
    for (const ship of window.skillDSpaceships) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        const angle = ship.target ? Math.atan2(ship.target.y - ship.y, ship.target.x - ship.x) : -Math.PI / 2;
        ctx.rotate(angle);

        const r = ship.size / 2;
        // Tier color (cyan T1 / purple T2 / red T3) — falls back to cyan for
        // any pre-fusion-update ship object that predates the `color` field.
        const shipColor = ship.color || '#00ffff';

        // Engine glow trail
        ctx.fillStyle = shipColor;
        if (!_mobPerf) { ctx.shadowColor = shipColor; ctx.shadowBlur = 12; }
        ctx.beginPath(); ctx.arc(-r * 0.75, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Hull — angular allied-drone silhouette (tier-colored/white core,
        // dark plating, consistent with this game's Sentinel/Photōkrystos
        // visual language)
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(r * 0.15, -r * 0.42);
        ctx.lineTo(-r * 0.65, -r * 0.62);
        ctx.lineTo(-r * 0.35, -r * 0.10);
        ctx.lineTo(-r * 0.55, 0);
        ctx.lineTo(-r * 0.35, r * 0.10);
        ctx.lineTo(-r * 0.65, r * 0.62);
        ctx.lineTo(r * 0.15, r * 0.42);
        ctx.closePath();
        ctx.fillStyle = '#141428';
        ctx.strokeStyle = shipColor;
        ctx.lineWidth = 1.5;
        ctx.fill(); ctx.stroke();

        // Cockpit glow core
        const coreGrad = ctx.createRadialGradient(r * 0.2, 0, 0, r * 0.2, 0, r * 0.35);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, shipColor);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();

        ctx.restore();

        // HP bar, only while damaged — kept out of the rotated/translated
        // transform above so it stays screen-aligned
        if (ship.hp < ship.maxHp) {
            ctx.fillStyle = 'rgba(255,68,68,0.9)';
            ctx.fillRect(ship.x - r, ship.y - r - 8, r * 2 * (ship.hp / ship.maxHp), 3);
        }
    }
}

// Skill F – Annihilation Sweep
