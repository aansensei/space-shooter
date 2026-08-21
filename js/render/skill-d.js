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
function _genSkillDDebris(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
        const distance = 130 + Math.random() * 150;
        const sides = 4 + Math.floor(Math.random() * 4);
        const pts = [];
        for (let s = 0; s < sides; s++) {
            const a = (s / sides) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const r = 3 + Math.random() * 9;
            pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        out.push({
            angle: (i * _GOLDEN_ANGLE) % (Math.PI * 2),
            dist: distance,
            speed: (0.001 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1),
            pts, tilt: Math.random() * Math.PI * 2,
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

        ctx.beginPath();
        ctx.moveTo(d.pts[0].x, d.pts[0].y);
        for (let j = 1; j < d.pts.length; j++) ctx.lineTo(d.pts[j].x, d.pts[j].y);
        ctx.closePath();

        if (_gfxLevel < 2) {
            const gradient = ctx.createLinearGradient(-sx / 10, -yPos / 10, sx / 10, yPos / 10);
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(0.3, '#331166');
            gradient.addColorStop(1, '#0a0a10');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = '#1a0a2a'; // flat fast-path at LOW/MIN
        }
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.stroke();
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
    // ring bezels and the Sigil HUD's icon dots
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        const studR = (outer - inner) * 0.22;
        const studGrad = ctx.createRadialGradient(mid, 0, 0, mid, 0, studR);
        studGrad.addColorStop(0, '#ffffff');
        studGrad.addColorStop(0.4, accentColor);
        studGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = studGrad;
        if (!_mobPerf) { ctx.shadowColor = accentColor; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(mid, 0, studR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
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
    // gets a dense field, MED a sparse one
    if (_gfxLevel < 2) {
        const moteCount = _gfxLevel < 1 ? 26 : 10;
        for (let i = 0; i < moteCount; i++) {
            const ring = i % 3;
            const radius = S * (1.9 + ring * 0.35);
            const speed = (ring % 2 === 0 ? 1 : -1) * (0.00035 + ring * 0.0001);
            const a = (i / moteCount) * Math.PI * 2 + now * speed;
            const mx = Math.cos(a) * radius, my = Math.sin(a) * radius * 0.94;
            const tw = 0.4 + 0.6 * Math.sin(now / 300 + i * 1.7);
            ctx.fillStyle = i % 2 === 0 ? `rgba(0,255,255,${tw})` : `rgba(200,120,255,${tw})`;
            if (!_mobPerf) { ctx.shadowColor = i % 2 === 0 ? '#00ffff' : '#aa00ff'; ctx.shadowBlur = 6; }
            ctx.beginPath(); ctx.arc(mx, my, 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
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
    // core, MED/HIGH only, reinforcing that the core is being actively fed
    if (_gfxLevel < 2) {
        const conduitCount = _gfxLevel < 1 ? 8 : 4;
        for (let i = 0; i < conduitCount; i++) {
            const a = (i / conduitCount) * Math.PI * 2 + now * 0.0004;
            const pulse = (now / 500 + i / conduitCount) % 1;
            ctx.save();
            ctx.rotate(a);
            const conduitGrad = ctx.createLinearGradient(S * 1.5, 0, S * 1.35, 0);
            conduitGrad.addColorStop(0, 'rgba(0,255,255,0)');
            conduitGrad.addColorStop(Math.max(0, pulse - 0.15), 'rgba(0,255,255,0)');
            conduitGrad.addColorStop(pulse, 'rgba(180,240,255,0.9)');
            conduitGrad.addColorStop(Math.min(1, pulse + 0.15), 'rgba(0,255,255,0)');
            conduitGrad.addColorStop(1, 'rgba(0,255,255,0)');
            ctx.strokeStyle = conduitGrad;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(S * 1.5, 0); ctx.lineTo(S * 1.35, 0); ctx.stroke();
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

        // Engine glow trail
        ctx.fillStyle = '#00ffff';
        if (!_mobPerf) { ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 12; }
        ctx.beginPath(); ctx.arc(-r * 0.75, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Hull — angular allied-drone silhouette (cyan/white core, dark plating,
        // consistent with this game's Sentinel/Photōkrystos visual language)
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
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.fill(); ctx.stroke();

        // Cockpit glow core
        const coreGrad = ctx.createRadialGradient(r * 0.2, 0, 0, r * 0.2, 0, r * 0.35);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, '#00ffff');
        coreGrad.addColorStop(1, 'rgba(0,255,255,0)');
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
