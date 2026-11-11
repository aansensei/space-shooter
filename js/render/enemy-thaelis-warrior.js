// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/render/enemy-thaelis-warrior.js: the Odyssey war gear on Thaelis's hoplite shield.
// Pure Canvas2D, called from enemy-thaelis.js. It draws
//   - bronze and crimson armour plates riveted onto the shield, and the two-headed war axe (blade and hammer) that hangs beside it,
//   - the Ulysses' Return cast: the axe is raised, red đấu khí and bá khí gather and the ground cracks open,
//     the axe chops, the ground bursts and bá khí wisps lift away. A huge ghost shape (the bá khí phantom)
//     stands behind a bare Thaelis and behind its Cocoon alike while the wave is gathered and chops with a
//     giant ghost of the axe, and black lightning breaks out of the chop,
//   - Penelope's Shroud's parry: the axe whips across an incoming hit and leaves a white-hot cut,
//   - Tenacity's đấu khí, the flame aura that burns hotter the more HP Thaelis has lost,
//   - the Iron Body layers a revived Thaelis wears (5 plates).
//   - Thaelis going down: the shield and armour burst apart as it falls into its Cocoon, and a larger
//     end (torn phantom, black lightning, a pillar of light, the axe stuck in the ground) when it is slain for good.
// Everything has a code-drawn version. If the art listed in _THAELIS_ART exists on disk it is
// drawn instead (misc/scripts/ingest_thaelis_assets.py prepares those files).
// Nothing here allocates per frame: the pose and cast state live in two reused objects.

const _THAELIS_ART = {
    // armour ring laid over the shield: centred, the shield (radius r in game) is rFrac of the image width
    armor: { src: 'assets/images/game/enemies/thaelis-armor.png', rFrac: 0.36 },
    // the axe lies along +x, butt on the left, the blade on the right. pivot = grip, as a fraction of the width,
    // len = whole sprite width in r, head = where the blade meets the haft, as a fraction of the width,
    // bladeOff = how far the middle of the blade hangs off the haft, in r (0 for a blade mirrored about the haft)
    axe: { src: 'assets/images/game/enemies/thaelis-axe.png', len: 2.05, pivot: 0.17, head: 0.86, bladeOff: 0.55 },
    // chest centre at the image centre, drawn additive (black is invisible). widthR = whole image width in r.
    // body only: the phantom's axe arm is drawn live so it can chop
    phantom: { src: 'assets/images/game/effects/thaelis-bakhi-phantom.png', widthR: 6.9 },
    // the head of the sonic wave: the leading crescent sits at tip (fraction of the width), ripples trail to the left
    sonic: { src: 'assets/images/game/effects/thaelis-sonic-arc.png', tip: 0.70 },
};

const _TW_REF = 150;            // radius the figure is baked at
const _TW_TAU = Math.PI * 2;
const THAELIS_SWING_MS = 240;   // the chop, right when the wave's gate closes
const THAELIS_RELEASE_MS = 1500; // bá khí rising after the chop
const THAELIS_PARRY_SWING_MS = 130, THAELIS_PARRY_MS = 420; // Penelope's Shroud parry: the cut across the hit, then the whole move

const _twCast = { kind: 0, p: 0, angle: Math.PI / 2 };   // kind: 0 idle, 1 gather, 2 chop, 3 release
const _twPose = { ang: 0, hx: 0, hy: 0, glow: 0, sweep: 0, armOff: 0, trail: 0 };
let _twArmorSprite = null, _twAxeSprite = null, _twPhantomSprite = null, _twGhostAxeSprite = null;
// where the phantom's axe is this frame, for the black lightning that follows it
const _twGhost = { on: false, hx: 0, hy: 0, headX: 0, headY: 0, k: 0 };
let _twArtRequested = false;

function _twClamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function _twLerp(a, b, t) { return a + (b - a) * t; }
function _twEaseOut(t) { t = _twClamp01(t); return 1 - (1 - t) * (1 - t) * (1 - t); }
function _twEaseInOut(t) { t = _twClamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function _twGlowOn() { return !_mobPerf && window._fxOpts && window._fxOpts.glow; }

// Detail tiers come from the graphics level: 0 full, 1 medium, 2 low, 3 minimum, 4 performance (mobile only).
function _twTier() { const g = window._gfxLevel || 0; return g > 4 ? 4 : g; }
// A count for the current tier. Full and low are given, medium sits halfway between them, minimum is half of low
// and performance a third of it, never below 1 unless low itself is 0.
function _twCount(low, full) {
    const t = _twTier();
    if (t === 0) return full;
    if (t === 1) return Math.max(low, Math.round((full + low) / 2));
    if (t === 2) return low;
    if (low < 1) return low;
    return Math.max(1, Math.floor(low / (t === 3 ? 2 : 3)));
}

// one request per art file, made the first time a Thaelis is drawn; a missing file just keeps the code-drawn version
function _twImg(key) {
    const a = _THAELIS_ART[key];
    if (!a._img) { a._img = new Image(); a._img.onerror = () => { a._bad = true; }; a._img.src = a.src; }
    return a._img.complete && a._img.naturalWidth > 0 ? a._img : null;
}
function _twRequestArt() {
    if (_twArtRequested) return;
    _twArtRequested = true;
    for (const k in _THAELIS_ART) _twImg(k);
}

// where Ulysses' Return stands, read off the cast time: gather (the wave's gate), chop, release
function _thaelisCastState(enemy) {
    const c = _twCast;
    c.kind = 0; c.p = 0;
    if (enemy._ordealCastAt === undefined) return c;
    const age = _thaelisClock - enemy._ordealCastAt;
    c.angle = enemy._ordealCastAngle === undefined ? Math.PI / 2 : enemy._ordealCastAngle;
    if (age < 0) return c;
    if (age < THAELIS_WAVE_GATE_MS) { c.kind = 1; c.p = age / THAELIS_WAVE_GATE_MS; }
    else if (age < THAELIS_WAVE_GATE_MS + THAELIS_SWING_MS) { c.kind = 2; c.p = (age - THAELIS_WAVE_GATE_MS) / THAELIS_SWING_MS; }
    else if (age < THAELIS_WAVE_GATE_MS + THAELIS_RELEASE_MS) { c.kind = 3; c.p = (age - THAELIS_WAVE_GATE_MS - THAELIS_SWING_MS) / (THAELIS_RELEASE_MS - THAELIS_SWING_MS); }
    return c;
}

// ---------- baked art ----------

// eight kite shaped plates, one per vertex of the octagon, bronze with a crimson enamel stripe, a gold rim and a ruby
function _twBakeArmor(c, R) {
    for (let i = 0; i < 8; i++) {
        c.save();
        c.rotate((i / 8) * _TW_TAU);
        // plate pointing outward along +x
        c.beginPath();
        c.moveTo(0.78 * R, 0);
        c.lineTo(0.9 * R, -0.17 * R);
        c.quadraticCurveTo(1.1 * R, -0.12 * R, 1.34 * R, 0);
        c.quadraticCurveTo(1.1 * R, 0.12 * R, 0.9 * R, 0.17 * R);
        c.closePath();
        const g = c.createLinearGradient(0.8 * R, 0, 1.34 * R, 0);
        g.addColorStop(0, '#6b4010'); g.addColorStop(0.45, '#d9a23a'); g.addColorStop(1, '#fff0b0');
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = '#fff3c0'; c.lineWidth = 0.014 * R; c.stroke();
        // crimson enamel stripe
        c.fillStyle = '#c4202a';
        c.beginPath();
        c.moveTo(0.92 * R, -0.045 * R); c.lineTo(1.26 * R, 0); c.lineTo(0.92 * R, 0.045 * R);
        c.closePath(); c.fill();
        // ruby at the root
        c.fillStyle = '#e0242c';
        c.beginPath(); c.arc(0.92 * R, 0, 0.045 * R, 0, _TW_TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.beginPath(); c.arc(0.905 * R, -0.014 * R, 0.014 * R, 0, _TW_TAU); c.fill();
        c.restore();
    }
    // small crimson horns between the plates
    for (let i = 0; i < 8; i++) {
        c.save();
        c.rotate(((i + 0.5) / 8) * _TW_TAU);
        c.fillStyle = '#9c1620';
        c.strokeStyle = '#ffd979'; c.lineWidth = 0.01 * R;
        c.beginPath();
        c.moveTo(0.9 * R, -0.07 * R); c.quadraticCurveTo(1.05 * R, -0.04 * R, 1.16 * R, 0); c.quadraticCurveTo(1.05 * R, 0.04 * R, 0.9 * R, 0.07 * R);
        c.closePath(); c.fill(); c.stroke();
        c.restore();
    }
    // a crimson belt around the shield rim
    c.strokeStyle = 'rgba(190, 28, 38, 0.9)';
    c.lineWidth = 0.05 * R;
    c.setLineDash([0.16 * R, 0.07 * R]);
    c.beginPath(); c.arc(0, 0, 0.86 * R, 0, _TW_TAU); c.stroke();
    c.setLineDash([]);
}

function _twGetArmor() {
    if (_twArmorSprite) return _twArmorSprite;
    const half = 1.4, dim = Math.ceil(half * 2 * _TW_REF);
    const off = document.createElement('canvas');
    off.width = off.height = dim;
    const c = off.getContext('2d');
    c.translate(dim / 2, dim / 2);
    _twBakeArmor(c, _TW_REF);
    _twArmorSprite = { canvas: off, rFrac: _TW_REF / dim };
    return _twArmorSprite;
}

// the two-headed war axe lies along +x: butt on the left, grip near it, and on the right a broad flared blade
// hanging to +y with a square hammer head opposite it on -y, bound to a haft of twisted wood
function _twGetAxe() {
    if (_twAxeSprite) return _twAxeSprite;
    const A = _THAELIS_ART.axe, R = _TW_REF;
    const W = Math.ceil(A.len * R), H = Math.ceil(1.96 * R);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    c.translate(A.pivot * W, H / 2);
    const headX = (A.head - A.pivot) * W, buttX = -A.pivot * W + 0.03 * R, tipX = headX + 0.2 * R;
    c.lineJoin = 'round'; c.lineCap = 'round';

    // haft: gnarled wood, its edges wander like a grown branch
    const hg = c.createLinearGradient(0, -0.07 * R, 0, 0.07 * R);
    hg.addColorStop(0, '#b98a58'); hg.addColorStop(0.5, '#7a4d26'); hg.addColorStop(1, '#3a200c');
    c.fillStyle = hg;
    c.beginPath();
    c.moveTo(buttX, -0.045 * R);
    const steps = 14;
    for (let i = 1; i <= steps; i++) { const x = buttX + (tipX - buttX) * i / steps; c.lineTo(x, (-0.05 - 0.012 * Math.sin(i * 1.9)) * R); }
    for (let i = steps; i >= 0; i--) { const x = buttX + (tipX - buttX) * i / steps; c.lineTo(x, (0.05 + 0.012 * Math.sin(i * 2.3 + 1)) * R); }
    c.closePath(); c.fill();
    // the twist of the grain
    c.strokeStyle = 'rgba(40, 20, 8, 0.55)'; c.lineWidth = 0.012 * R;
    for (let x = buttX + 0.1 * R; x < headX - 0.3 * R; x += 0.11 * R) { c.beginPath(); c.moveTo(x, -0.05 * R); c.quadraticCurveTo(x + 0.07 * R, 0, x + 0.05 * R, 0.055 * R); c.stroke(); }
    c.strokeStyle = 'rgba(230, 190, 130, 0.35)'; c.lineWidth = 0.008 * R;
    for (let x = buttX + 0.15 * R; x < headX - 0.3 * R; x += 0.22 * R) { c.beginPath(); c.moveTo(x, -0.035 * R); c.quadraticCurveTo(x + 0.06 * R, -0.01 * R, x + 0.05 * R, 0.03 * R); c.stroke(); }
    // leather grip and a knot of wood at the butt
    c.fillStyle = '#24130a';
    c.fillRect(-0.14 * R, -0.062 * R, 0.42 * R, 0.124 * R);
    c.strokeStyle = 'rgba(214, 160, 86, 0.6)'; c.lineWidth = 0.012 * R;
    for (let i = 0; i < 7; i++) { const x = -0.12 * R + i * 0.056 * R; c.beginPath(); c.moveTo(x, -0.062 * R); c.lineTo(x + 0.045 * R, 0.062 * R); c.stroke(); }
    c.fillStyle = '#6b4120';
    c.beginPath(); c.ellipse(buttX + 0.03 * R, 0, 0.06 * R, 0.085 * R, 0, 0, _TW_TAU); c.fill();

    const steel = (x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#d5d8e2'); g.addColorStop(0.45, '#7c808d'); g.addColorStop(1, '#30323b'); return g; };

    // hammer head on -y: a square block that widens into its striking face
    c.fillStyle = steel(headX - 0.3 * R, -0.75 * R, headX + 0.3 * R, -0.1 * R);
    c.strokeStyle = '#121318'; c.lineWidth = 0.018 * R;
    c.beginPath();
    c.moveTo(headX - 0.2 * R, -0.1 * R); c.lineTo(headX - 0.23 * R, -0.56 * R); c.lineTo(headX - 0.29 * R, -0.6 * R); c.lineTo(headX - 0.29 * R, -0.76 * R);
    c.lineTo(headX + 0.29 * R, -0.76 * R); c.lineTo(headX + 0.29 * R, -0.6 * R); c.lineTo(headX + 0.23 * R, -0.56 * R); c.lineTo(headX + 0.2 * R, -0.1 * R);
    c.closePath(); c.fill(); c.stroke();
    // bevel on the face and a glowing seam
    c.strokeStyle = 'rgba(255, 255, 255, 0.45)'; c.lineWidth = 0.012 * R;
    c.beginPath(); c.moveTo(headX - 0.27 * R, -0.745 * R); c.lineTo(headX + 0.27 * R, -0.745 * R); c.stroke();
    c.strokeStyle = '#e0242c'; c.lineWidth = 0.02 * R;
    c.beginPath(); c.moveTo(headX - 0.215 * R, -0.5 * R); c.lineTo(headX + 0.215 * R, -0.5 * R); c.moveTo(headX - 0.205 * R, -0.2 * R); c.lineTo(headX + 0.205 * R, -0.2 * R); c.stroke();

    // axe blade on +y: flares from the eye into a broad crescent
    const bg = c.createLinearGradient(headX, 0.1 * R, headX, 0.93 * R);
    bg.addColorStop(0, '#3a3d47'); bg.addColorStop(0.35, '#6a1218'); bg.addColorStop(0.75, '#c8242e'); bg.addColorStop(1, '#ff9070');
    c.fillStyle = bg;
    c.strokeStyle = '#121318'; c.lineWidth = 0.018 * R;
    c.beginPath();
    c.moveTo(headX - 0.2 * R, 0.1 * R);
    c.quadraticCurveTo(headX - 0.26 * R, 0.46 * R, headX - 0.6 * R, 0.7 * R);       // back horn
    c.quadraticCurveTo(headX, 1.08 * R, headX + 0.6 * R, 0.7 * R);                   // the cutting edge
    c.quadraticCurveTo(headX + 0.26 * R, 0.46 * R, headX + 0.2 * R, 0.1 * R);       // front horn
    c.closePath(); c.fill(); c.stroke();
    // forged groove, then the honed edge, white hot
    c.strokeStyle = 'rgba(16, 5, 8, 0.5)'; c.lineWidth = 0.035 * R;
    c.beginPath(); c.moveTo(headX - 0.36 * R, 0.62 * R); c.quadraticCurveTo(headX, 0.84 * R, headX + 0.36 * R, 0.62 * R); c.stroke();
    c.strokeStyle = 'rgba(255, 120, 90, 0.8)'; c.lineWidth = 0.065 * R;
    c.beginPath(); c.moveTo(headX - 0.55 * R, 0.7 * R); c.quadraticCurveTo(headX, 1.02 * R, headX + 0.55 * R, 0.7 * R); c.stroke();
    c.strokeStyle = '#ffeeda'; c.lineWidth = 0.026 * R;
    c.beginPath(); c.moveTo(headX - 0.59 * R, 0.7 * R); c.quadraticCurveTo(headX, 1.07 * R, headX + 0.59 * R, 0.7 * R); c.stroke();
    // runes inlaid in gold on the cheek of the blade
    c.strokeStyle = '#ffd979'; c.lineWidth = 0.014 * R;
    const rune = (x, y, k) => {
        c.beginPath();
        c.moveTo(x, y - 0.06 * R); c.lineTo(x, y + 0.06 * R);
        if (k === 0) { c.moveTo(x, y - 0.06 * R); c.lineTo(x + 0.04 * R, y - 0.02 * R); c.lineTo(x, y + 0.02 * R); }
        else if (k === 1) { c.moveTo(x - 0.035 * R, y - 0.03 * R); c.lineTo(x, y - 0.06 * R); c.lineTo(x + 0.035 * R, y - 0.03 * R); }
        else { c.moveTo(x, y - 0.02 * R); c.lineTo(x + 0.04 * R, y - 0.06 * R); c.moveTo(x, y + 0.01 * R); c.lineTo(x + 0.04 * R, y - 0.03 * R); }
        c.stroke();
    };
    rune(headX - 0.13 * R, 0.4 * R, 0); rune(headX, 0.42 * R, 1); rune(headX + 0.13 * R, 0.4 * R, 2);

    // the eye block between the two heads, with the red core that feeds them
    c.fillStyle = steel(headX - 0.22 * R, -0.14 * R, headX + 0.22 * R, 0.14 * R);
    c.strokeStyle = '#121318'; c.lineWidth = 0.018 * R;
    c.beginPath(); c.rect(headX - 0.22 * R, -0.13 * R, 0.44 * R, 0.26 * R); c.fill(); c.stroke();
    c.fillStyle = '#e0242c';
    c.beginPath(); c.arc(headX, 0, 0.06 * R, 0, _TW_TAU); c.fill();
    c.fillStyle = '#ffd0c0';
    c.beginPath(); c.arc(headX, 0, 0.025 * R, 0, _TW_TAU); c.fill();
    // two roots of the haft grow up and clasp the head
    c.strokeStyle = '#6b4120'; c.lineWidth = 0.05 * R;
    c.beginPath(); c.moveTo(headX - 0.42 * R, -0.03 * R); c.quadraticCurveTo(headX - 0.3 * R, -0.2 * R, headX - 0.12 * R, -0.3 * R); c.stroke();
    c.beginPath(); c.moveTo(headX - 0.42 * R, 0.03 * R); c.quadraticCurveTo(headX - 0.3 * R, 0.2 * R, headX - 0.1 * R, 0.27 * R); c.stroke();
    c.strokeStyle = 'rgba(230, 190, 130, 0.45)'; c.lineWidth = 0.012 * R;
    c.beginPath(); c.moveTo(headX - 0.41 * R, -0.045 * R); c.quadraticCurveTo(headX - 0.3 * R, -0.215 * R, headX - 0.13 * R, -0.315 * R); c.stroke();
    _twAxeSprite = { canvas: off, w: W, h: H };
    return _twAxeSprite;
}

// the bá khí phantom: a huge translucent Odysseus with a round shield on one arm (his axe arm is drawn live).
// Baked in an 8U x 8U square (U = 80px), chest at the centre, then drawn additive. The body is drawn once as a solid
// silhouette so overlapping limbs do not stack alpha, then tinted, carved with armour lines and wrapped in flames.
function _twGetPhantom() {
    if (_twPhantomSprite) return _twPhantomSprite;
    const U = 80, dim = 8 * U;
    const mk = () => { const o = document.createElement('canvas'); o.width = o.height = dim; const k = o.getContext('2d'); k.translate(dim / 2, dim / 2); return [o, k]; };
    const [sil, s] = mk();
    s.fillStyle = s.strokeStyle = '#fff';
    s.lineCap = s.lineJoin = 'round';
    // helm and the tall crest
    s.beginPath(); s.arc(0, -2.2 * U, 0.52 * U, 0, _TW_TAU); s.fill();
    s.beginPath();
    s.moveTo(-0.34 * U, -2.55 * U);
    s.bezierCurveTo(-0.95 * U, -3.05 * U, -0.45 * U, -3.6 * U, 0.05 * U, -3.78 * U);
    s.bezierCurveTo(0.6 * U, -3.6 * U, 0.95 * U, -3.05 * U, 0.34 * U, -2.55 * U);
    s.closePath(); s.fill();
    // neck, shoulders and chest, narrowing to the waist
    s.beginPath();
    s.moveTo(-0.32 * U, -1.8 * U);
    s.bezierCurveTo(-0.9 * U, -1.8 * U, -1.65 * U, -1.72 * U, -1.8 * U, -1.15 * U);
    s.bezierCurveTo(-1.7 * U, -0.2 * U, -1.2 * U, 1.1 * U, -0.95 * U, 2.2 * U);
    s.lineTo(0.95 * U, 2.2 * U);
    s.bezierCurveTo(1.2 * U, 1.1 * U, 1.7 * U, -0.2 * U, 1.8 * U, -1.15 * U);
    s.bezierCurveTo(1.65 * U, -1.72 * U, 0.9 * U, -1.8 * U, 0.32 * U, -1.8 * U);
    s.closePath(); s.fill();
    // the right arm and the axe are not baked: _drawThaelisPhantom swings them live
    // left arm down to a big round shield
    s.lineWidth = 0.62 * U;
    s.beginPath(); s.moveTo(-1.5 * U, -1.2 * U); s.lineTo(-2.15 * U, -0.2 * U); s.stroke();
    s.beginPath(); s.arc(-2.35 * U, 0.35 * U, 1.1 * U, 0, _TW_TAU); s.fill();

    // carve the armour out of the solid shape: shield rings, chest plates, helm slits
    s.globalCompositeOperation = 'destination-out';
    s.strokeStyle = 'rgba(0,0,0,0.5)'; s.lineWidth = 0.07 * U;
    for (const k of [0.82, 0.55, 0.28]) { s.beginPath(); s.arc(-2.35 * U, 0.35 * U, 1.1 * U * k, 0, _TW_TAU); s.stroke(); }
    s.beginPath(); s.moveTo(0, -1.7 * U); s.lineTo(0, 1.6 * U); s.stroke();
    for (const sx of [-1, 1]) {
        s.beginPath(); s.moveTo(sx * 0.15 * U, -1.1 * U); s.quadraticCurveTo(sx * 0.9 * U, -1.0 * U, sx * 1.2 * U, -0.2 * U); s.stroke();
        s.beginPath(); s.moveTo(sx * 0.15 * U, -0.1 * U); s.quadraticCurveTo(sx * 0.8 * U, 0, sx * 1.0 * U, 0.8 * U); s.stroke();
    }
    s.fillStyle = 'rgba(0,0,0,0.85)';
    for (const sx of [-1, 1]) { s.beginPath(); s.ellipse(sx * 0.22 * U, -2.14 * U, 0.17 * U, 0.06 * U, sx * 0.25, 0, _TW_TAU); s.fill(); }
    s.beginPath(); s.rect(-0.04 * U, -2.2 * U, 0.08 * U, 0.55 * U); s.fill();
    s.globalCompositeOperation = 'source-over';

    // tint: hot at the head and axe, deep red in the middle, ash at the waist
    s.globalCompositeOperation = 'source-in';
    const tint = s.createLinearGradient(0, -4 * U, 0, 2.4 * U);
    tint.addColorStop(0, 'rgb(255, 200, 150)'); tint.addColorStop(0.25, 'rgb(255, 92, 64)'); tint.addColorStop(0.7, 'rgb(190, 26, 34)'); tint.addColorStop(1, 'rgb(90, 8, 16)');
    s.fillStyle = tint; s.fillRect(-4 * U, -4 * U, 8 * U, 8 * U);
    s.globalCompositeOperation = 'source-over';

    const [out, c] = mk();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.shadowColor = 'rgba(255, 50, 40, 1)'; c.shadowBlur = 38;
    c.globalAlpha = 0.55; c.drawImage(sil, 0, 0);
    c.shadowColor = 'rgba(255, 170, 90, 1)'; c.shadowBlur = 12;
    c.globalAlpha = 0.5; c.drawImage(sil, 0, 0);
    c.shadowBlur = 0; c.globalAlpha = 1;
    c.translate(dim / 2, dim / 2);
    // flames lick up off the crest, shoulders, shield rim and the blades
    const lick = (bx, by, len, w, lean, alpha, hue) => {
        c.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
        c.beginPath();
        c.moveTo(bx - w, by);
        c.quadraticCurveTo(bx - w * 0.5 + lean * 0.5, by - len * 0.55, bx + lean, by - len);
        c.quadraticCurveTo(bx + w * 0.5 + lean * 0.5, by - len * 0.55, bx + w, by);
        c.closePath(); c.fill();
    };
    const spots = [[-0.4, -2.7], [0.45, -2.7], [-1.5, -1.6], [-1.0, -1.75], [1.0, -1.75], [1.5, -1.6], [-2.35, -0.8], [-3.0, -0.4], [-1.7, -0.35],
        [2.1, -1.7], [-0.9, 0.2], [0.9, 0.2], [-0.3, -3.6], [0.4, -3.3]];
    for (let i = 0; i < spots.length; i++) {
        const h = (i * 0.618) % 1;
        lick(spots[i][0] * U, spots[i][1] * U, (0.55 + 0.75 * h) * U, (0.12 + 0.1 * h) * U, (h - 0.5) * 0.5 * U, 0.2 + 0.18 * h, 12 + h * 34);
    }
    // the body dissolves toward the waist
    c.globalCompositeOperation = 'destination-in';
    const fade = c.createLinearGradient(0, -4 * U, 0, 3 * U);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.55, 'rgba(0,0,0,0.9)'); fade.addColorStop(0.85, 'rgba(0,0,0,0.15)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = fade; c.fillRect(-4 * U, -4 * U, 8 * U, 8 * U);
    c.globalCompositeOperation = 'source-over';
    // the eyes stay white-hot
    c.fillStyle = 'rgba(255, 245, 225, 0.95)';
    c.shadowColor = '#ff4030'; c.shadowBlur = 14;
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 0.22 * U, -2.14 * U, 0.15 * U, 0.05 * U, sx * 0.25, 0, _TW_TAU); c.fill(); }
    c.shadowBlur = 0;
    _twPhantomSprite = { canvas: out };
    return _twPhantomSprite;
}

// ---------- the gear ----------

function _twShortAngle(a) { a = a % _TW_TAU; if (a > Math.PI) a -= _TW_TAU; else if (a < -Math.PI) a += _TW_TAU; return a; }

// where the hanging axe and its grip sit for the current cast stage, in units of r
const _TW_IDLE = { ang: -1.2, hx: 1.28, hy: 0.12 };    // hangs upright at the side
const _TW_COCK = { ang: -2.3, hx: 0.95, hy: -1.15 };   // raised high and cocked back
function _twComputePose(cast, now, enemy) {
    const P = _twPose;
    P.glow = 0.12; P.sweep = 0; P.armOff = 0; P.trail = 0;
    if (cast.kind === 0) {
        P.ang = _TW_IDLE.ang + Math.sin(now / 760) * 0.05;
        P.hx = _TW_IDLE.hx; P.hy = _TW_IDLE.hy + Math.sin(now / 760 + 1) * 0.03;
        // Penelope's Shroud parry: the axe whips across the line the hit came down, then eases home
        const age = enemy && enemy._parryAt ? now - enemy._parryAt : 1e9;
        if (age >= 0 && age < THAELIS_PARRY_MS) {
            const pa = enemy._parryAngle || 0, from = pa - 1.5, to = pa + 1.1;
            const gx = Math.cos(pa) * 0.7, gy = Math.sin(pa) * 0.7;
            if (age < THAELIS_PARRY_SWING_MS) {
                const t = _twEaseOut(age / THAELIS_PARRY_SWING_MS);
                P.ang = from + (to - from) * t; P.hx = gx; P.hy = gy;
                P.trail = Math.min(1.6, (to - from) * t); P.glow = 0.9;
            } else {
                const t = _twEaseInOut((age - THAELIS_PARRY_SWING_MS) / (THAELIS_PARRY_MS - THAELIS_PARRY_SWING_MS));
                P.ang = to + _twShortAngle(P.ang - to) * t;
                P.hx = _twLerp(gx, P.hx, t); P.hy = _twLerp(gy, P.hy, t);
                P.glow = 0.9 * (1 - t) + 0.12 * t;
            }
        }
        return P;
    }
    // the chop runs clockwise over the top unless the target sits close to the cocked angle
    const aim = cast.angle;
    let delta = ((aim - _TW_COCK.ang) % _TW_TAU + _TW_TAU) % _TW_TAU;
    if (delta > Math.PI * 1.25) delta -= _TW_TAU;
    const endHx = 0.9 + Math.cos(aim) * 0.7, endHy = Math.max(-1.1, -0.1 + Math.sin(aim) * 0.7);
    if (cast.kind === 1) {
        const t = _twEaseOut(cast.p * 1.3), tr = 0.015 + 0.04 * cast.p;
        P.ang = _twLerp(_TW_IDLE.ang, _TW_COCK.ang, t);
        P.hx = _twLerp(_TW_IDLE.hx, _TW_COCK.hx, t) + Math.sin(now / 23) * tr;
        P.hy = _twLerp(_TW_IDLE.hy, _TW_COCK.hy, t) + Math.cos(now / 19) * tr;
        P.glow = cast.p; P.armOff = 0.9;
    } else if (cast.kind === 2) {
        const q = cast.p, t = q * q;
        P.ang = _TW_COCK.ang + delta * t;
        P.hx = _twLerp(_TW_COCK.hx, endHx, t); P.hy = _twLerp(_TW_COCK.hy, endHy, t);
        P.glow = 1; P.sweep = q; P.armOff = 0.9 * (1 - t);
        if (q > 0.05) P.trail = (delta >= 0 ? 1 : -1) * Math.min(Math.abs(delta), 1.5);
    } else {
        const t = _twEaseInOut((cast.p - 0.25) / 0.75);
        P.ang = _twLerp(_TW_COCK.ang + delta, _TW_IDLE.ang, t);
        P.hx = _twLerp(endHx, _TW_IDLE.hx, t); P.hy = _twLerp(endHy, _TW_IDLE.hy, t);
        P.glow = Math.max(0.12, 1 - cast.p); P.armOff = 0.9 * t;
    }
    return P;
}

// bronze and crimson plates over the shield, turning with it, and a red glow in the core while a wave gathers
function _drawThaelisArmor(enemy, r, now, cast, rotation) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(rotation);
    const art = _twImg('armor');
    if (art) {
        const dw = r / _THAELIS_ART.armor.rFrac, dh = dw * art.naturalHeight / art.naturalWidth;
        ctx.drawImage(art, -dw / 2, -dh / 2, dw, dh);
    } else {
        const f = _twGetArmor(), dw = r / f.rFrac;
        ctx.drawImage(f.canvas, -dw / 2, -dw / 2, dw, dw);
    }
    ctx.restore();
    if (cast.kind !== 0) {
        const k = cast.kind === 1 ? cast.p : cast.kind === 2 ? 1 : 1 - cast.p;
        const g = _getGlowSprite('rgba(255, 50, 40, 0.95)', 48);
        if (g && k > 0.02) {
            const gr = r * (0.8 + 0.4 * k) * (0.94 + 0.06 * Math.sin(now / 40));
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 * k;
            ctx.drawImage(g, enemy.x - gr, enemy.y - gr, gr * 2, gr * 2);
            ctx.restore();
        }
    }
}

// the red axe hangs beside the shield with no hand on it: it rises and trembles as power gathers, then comes down
function _drawThaelisAxe(enemy, r, now, cast) {
    const P = _twComputePose(cast, now, enemy);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // swing smear: the path the blade just travelled, for the chop and for a parry
    if (P.trail !== 0) {
        const len = 1.41 * r;
        const trail = Math.abs(P.trail), dir = P.trail >= 0 ? 1 : -1;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
            ctx.strokeStyle = k === 0 ? 'rgba(224, 36, 44, 0.42)' : k === 1 ? 'rgba(255, 110, 70, 0.55)' : 'rgba(255, 240, 210, 0.7)';
            ctx.lineWidth = r * (0.5 - k * 0.17);
            ctx.beginPath();
            ctx.arc(P.hx * r, P.hy * r, len * (0.92 + k * 0.04), P.ang - dir * trail, P.ang, dir < 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    const A = _THAELIS_ART.axe, img = _twImg('axe'), spr = img ? null : _twGetAxe();
    const aw = A.len * r, ah = aw * (img ? img.naturalHeight / img.naturalWidth : spr.h / spr.w);
    ctx.save();
    ctx.translate(P.hx * r, P.hy * r);
    ctx.rotate(P.ang);
    if (_twGlowOn()) { ctx.shadowColor = 'rgba(255, 50, 40, 0.9)'; ctx.shadowBlur = 6 + 14 * P.glow; }
    ctx.drawImage(img || spr.canvas, -A.pivot * aw, -ah / 2, aw, ah);
    ctx.shadowBlur = 0;
    ctx.restore();

    // the blades gather red light as the cast builds
    if (P.glow > 0.02) {
        const headD = (A.head - A.pivot) * A.len * r;
        const hx = P.hx * r + Math.cos(P.ang) * headD - Math.sin(P.ang) * A.bladeOff * r, hy = P.hy * r + Math.sin(P.ang) * headD + Math.cos(P.ang) * A.bladeOff * r;
        const g = _getGlowSprite('rgba(255, 60, 44, 0.95)', 48), g2 = _getGlowSprite('rgba(255, 235, 200, 0.95)', 24);
        if (g) {
            const gr = r * (0.3 + 0.75 * P.glow) * (0.92 + 0.08 * Math.sin(now / 38));
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.35 + 0.6 * P.glow;
            ctx.drawImage(g, hx - gr, hy - gr, gr * 2, gr * 2);
            if (g2) { ctx.globalAlpha = 0.5 * P.glow; ctx.drawImage(g2, hx - gr * 0.4, hy - gr * 0.4, gr * 0.8, gr * 0.8); }
        }
    }
    ctx.restore();
}

// Penelope's Shroud parry: where the axe met the hit, a white-hot cut in a crimson edge, sparks and a ring
function _drawThaelisParryFx(enemy, r, now) {
    if (!enemy._parryAt) return;
    const age = now - enemy._parryAt;
    if (age < 0 || age >= THAELIS_PARRY_MS) return;
    const p = age / THAELIS_PARRY_MS, pa = enemy._parryAngle || 0;
    const ix = enemy.x + Math.cos(pa) * r * 1.7, iy = enemy.y + Math.sin(pa) * r * 1.7;
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(pa);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // the cut: a crescent across the incoming line
    const cutA = Math.pow(1 - p, 1.5);
    for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = cutA * (i === 0 ? 0.5 : i === 1 ? 0.7 : 1);
        ctx.strokeStyle = i === 0 ? '#e0242c' : i === 1 ? '#ff7a54' : '#fff3e0';
        ctx.lineWidth = r * (0.34 - i * 0.12) * (1 - p * 0.5);
        ctx.beginPath();
        ctx.arc(-r * 0.9, 0, r * (0.95 + p * 0.25), -0.95, 0.95);
        ctx.stroke();
    }
    // sparks thrown back toward the attacker
    ctx.strokeStyle = '#ffe9c8';
    ctx.lineWidth = 1.8;
    const n = _twCount(5, 10);
    for (let i = 0; i < n; i++) {
        const a = (_twHash(i * 3.1 + 2) - 0.5) * 2.4, d0 = r * (0.15 + p * 1.5 * (0.5 + _twHash(i + 9))), d1 = d0 + r * 0.28 * (1 - p);
        ctx.globalAlpha = (1 - p) * 0.95;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * d0, Math.sin(a) * d0); ctx.lineTo(Math.cos(a) * d1, Math.sin(a) * d1); ctx.stroke();
    }
    // the ring of the clash and its flash
    ctx.globalAlpha = (1 - p) * 0.8;
    ctx.strokeStyle = '#ffd0b0';
    ctx.lineWidth = 2.4 * (1 - p) + 0.5;
    ctx.beginPath(); ctx.arc(0, 0, r * (0.2 + p * 0.9), 0, _TW_TAU); ctx.stroke();
    if (p < 0.35) {
        const g = _getGlowSprite('rgba(255, 235, 210, 0.95)', 32);
        if (g) { const gr = r * 0.9 * (1 - p); ctx.globalAlpha = 1 - p / 0.35; ctx.drawImage(g, -gr, -gr, gr * 2, gr * 2); }
    }
    ctx.restore();
}

// ---------- ground cracks ----------

// jagged crack paths radiating from the body, baked once as unit vectors; each is a polyline of [x, y] in units of its reach
const _TW_CRACKS = (function () {
    const out = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * _TW_TAU + ((i * 0.37) % 0.3);
        const pts = [];
        let a = a0, d = 0.3;
        for (let k = 0; k < 6; k++) {
            pts.push([Math.cos(a) * d, Math.sin(a) * d]);
            d += 0.14 + ((i * 7 + k * 3) % 5) * 0.03;
            a += (((i * 5 + k * 11) % 7) - 3) * 0.06;
        }
        out.push(pts);
        // a short fork off the third point
        const f = pts[3], fa = a0 + (i % 2 ? 0.7 : -0.7);
        out.push([f, [f[0] + Math.cos(fa) * 0.14, f[1] + Math.sin(fa) * 0.14], [f[0] + Math.cos(fa + 0.2) * 0.3, f[1] + Math.sin(fa + 0.2) * 0.3]]);
    }
    return out;
})();

// while Ulysses' Return is gathered the ground splits open around Thaelis, glowing red; the chop bursts it, then it cools
function _drawThaelisGroundCracks(enemy, r, now, cast) {
    if (cast.kind === 0) return;
    let grow, heat, burst = 0;
    if (cast.kind === 1) { grow = _twEaseOut(cast.p); heat = 0.35 + 0.5 * cast.p; }
    else if (cast.kind === 2) { grow = 1 + cast.p * 0.35; heat = 1; burst = cast.p; }
    else { grow = 1.35; heat = Math.pow(1 - cast.p, 1.3); burst = Math.max(0, 0.7 - cast.p * 1.6); }
    if (heat <= 0.02) return;
    const reach = r * 3.2 * grow;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // molten glow under the cracks
    const g = _getGlowSprite('rgba(255, 60, 40, 0.8)', 64);
    if (g) { const gr = reach * 0.75; ctx.globalAlpha = 0.3 * heat; ctx.drawImage(g, -gr, -gr * 0.8, gr * 2, gr * 1.6); }
    const nCr = _twCount(9, _TW_CRACKS.length);
    for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass === 0 ? `rgba(230, 36, 30, ${0.6 * heat})` : `rgba(255, 226, 180, ${0.95 * heat})`;
        ctx.lineWidth = pass === 0 ? 8 : 2.4;
        for (let c = 0; c < nCr; c++) {
            const pts = _TW_CRACKS[c];
            // a crack only reaches as far as the growth has got
            const live = Math.max(2, Math.min(pts.length, Math.ceil(pts.length * _twClamp01(grow * 1.05 - (c % 3) * 0.08))));
            ctx.beginPath();
            ctx.moveTo(pts[0][0] * reach, pts[0][1] * reach * 0.82);
            for (let k = 1; k < live; k++) ctx.lineTo(pts[k][0] * reach, pts[k][1] * reach * 0.82);
            ctx.stroke();
        }
    }
    // the slab edges lift and break away, then drift up
    if (!_mobPerf) {
        const rocks = 18, lift = cast.kind === 1 ? cast.p : 1;
        for (let i = 0; i < rocks; i++) {
            const h = (i * 0.618) % 1, a = (i / rocks) * _TW_TAU + h;
            let d = r * (1.35 + 1.1 * h) * (1 + burst * 0.9), y = Math.sin(a) * d * 0.82 - lift * r * (0.15 + 0.3 * h) - burst * r * 1.1 * (0.5 + h);
            if (cast.kind === 3) y -= cast.p * r * 0.9;
            const sz = r * (0.07 + 0.07 * h), wob = Math.sin(now / 90 + i) * 0.5 * (1 - burst);
            ctx.globalAlpha = Math.min(1, heat * 1.3);
            ctx.fillStyle = i % 3 === 0 ? '#ff8a5c' : '#5a1a1c';
            ctx.save();
            ctx.translate(Math.cos(a) * d, y);
            ctx.rotate(a + wob + now * 0.002 * (h - 0.5));
            ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.6); ctx.lineTo(sz, -sz * 0.4); ctx.lineTo(sz * 0.7, sz); ctx.lineTo(-sz * 0.8, sz * 0.7); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
    // the slam: two shock rings and streaks of dust thrown outward
    if (burst > 0.02) {
        for (let j = 0; j < 2; j++) {
            const b = Math.max(0, burst - j * 0.25);
            if (b <= 0) continue;
            ctx.globalAlpha = b;
            ctx.strokeStyle = j ? '#ff6a4a' : '#ffe0c8';
            ctx.lineWidth = (j ? 5 : 3.5) * b + 0.6;
            const rr = r * (1.2 + (1 - b) * (3.2 - j * 0.6));
            ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.82, 0, 0, _TW_TAU); ctx.stroke();
        }
        ctx.strokeStyle = '#ffc8a8';
        ctx.lineWidth = 2;
        const streaks = _twCount(8, 16);
        for (let i = 0; i < streaks; i++) {
            const a = (i / streaks) * _TW_TAU + (i % 2) * 0.13, d0 = r * (1.3 + (1 - burst) * 2.4), d1 = d0 + r * (0.35 + 0.3 * ((i * 0.618) % 1));
            ctx.globalAlpha = burst * 0.8;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * d0, Math.sin(a) * d0 * 0.82); ctx.lineTo(Math.cos(a) * d1, Math.sin(a) * d1 * 0.82); ctx.stroke();
        }
    }
    ctx.restore();
}

// ---------- bá khí ----------

// the phantom's own axe: the same two-headed axe, burnt down to a crimson glow
function _twGetGhostAxe() {
    if (_twGhostAxeSprite) return _twGhostAxeSprite;
    const base = _twGetAxe(), pad = 30;
    const tint = document.createElement('canvas');
    tint.width = base.w; tint.height = base.h;
    const t = tint.getContext('2d');
    t.drawImage(base.canvas, 0, 0);
    t.globalCompositeOperation = 'source-in';
    const g = t.createLinearGradient(0, 0, base.w, 0);
    g.addColorStop(0, 'rgb(150, 20, 28)'); g.addColorStop(0.7, 'rgb(240, 60, 44)'); g.addColorStop(1, 'rgb(255, 190, 140)');
    t.fillStyle = g; t.fillRect(0, 0, base.w, base.h);
    const off = document.createElement('canvas');
    off.width = base.w + pad * 2; off.height = base.h + pad * 2;
    const c = off.getContext('2d');
    c.shadowColor = 'rgba(255, 50, 40, 1)'; c.shadowBlur = 22;
    c.globalAlpha = 0.85; c.drawImage(tint, pad, pad);
    c.shadowBlur = 0; c.globalAlpha = 0.5; c.drawImage(tint, pad, pad);
    _twGhostAxeSprite = { canvas: off, w: base.w, h: base.h, pad: pad };
    return _twGhostAxeSprite;
}

// While Ulysses' Return is gathered the warrior's own bá khí takes his shape behind the body, larger than he is.
// His arm raises a giant ghost of the axe with the real one and chops with it, then the whole shape lifts away.
// Works for a bare Thaelis and for its Cocoon alike.
function _drawThaelisPhantom(enemy, r, now, cast) {
    _twGhost.on = false;
    if (cast.kind === 0) return;
    let k, rise = 0, scale = 1, lunge = 0;
    if (cast.kind === 1) { k = _twEaseOut(cast.p * 1.15); scale = 0.74 + 0.26 * k; rise = (1 - k) * 0.35 * r; }
    else if (cast.kind === 2) { k = 1; scale = 1 + 0.07 * cast.p; lunge = Math.sin(cast.p * Math.PI) * 0.45 * r; }
    else { k = Math.pow(1 - cast.p, 1.4); scale = 1.07 + 0.1 * cast.p; rise = -cast.p * 1.3 * r; }
    if (k <= 0.01) return;
    const P = _twComputePose(cast, now, null);
    const art = _twImg('phantom'), spr = art ? null : _twGetPhantom();
    const src = art || spr.canvas;
    const w = _THAELIS_ART.phantom.widthR * r * scale, h = w * (art ? art.naturalHeight / art.naturalWidth : 1);
    const cx = enemy.x + Math.cos(cast.angle) * lunge, cy = enemy.y + Math.sin(cast.angle) * lunge - rise;
    const flicker = 0.84 + 0.16 * Math.sin(now / 63 + enemy.x);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // three copies, the outer two drifting, so the edge shimmers like heat
    const copies = _twCount(1, 3);
    for (let i = 0; i < copies; i++) {
        const dx = i === 0 ? 0 : Math.sin(now / 210 + i * 2.1) * r * 0.07 * i;
        const dy = i === 0 ? 0 : Math.cos(now / 170 + i) * r * 0.05 * i;
        const s = i === 0 ? 1 : 1 + 0.03 * i * Math.sin(now / 260 + i);
        ctx.globalAlpha = (i === 0 ? 0.92 : 0.28) * k * flicker;
        ctx.drawImage(src, cx - w * s / 2 + dx, cy - h * s / 2 + dy, w * s, h * s);
    }

    // the phantom's axe arm: shoulder fixed on the shape, the arm trails the axe, the axe follows the real one's angle
    const U = w / 8, A = _THAELIS_ART.axe;
    const shX = cx + 1.55 * U, shY = cy - 1.2 * U;
    const armAng = P.ang + P.armOff;
    const hx = shX + Math.cos(armAng) * 1.5 * U, hy = shY + Math.sin(armAng) * 1.5 * U;
    const gl = 4.6 * U, headD = (A.head - A.pivot) * gl;
    const g = _twGetGhostAxe(), gs = gl / g.w;
    ctx.globalAlpha = 0.75 * k * flicker;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgb(200, 34, 36)';
    ctx.lineWidth = 0.62 * U;
    ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(hx, hy); ctx.stroke();
    // the cut it leaves in the air
    if (cast.kind === 2 && P.sweep > 0.05) {
        let delta = ((cast.angle - _TW_COCK.ang) % _TW_TAU + _TW_TAU) % _TW_TAU;
        if (delta > Math.PI * 1.25) delta -= _TW_TAU;
        const trail = Math.min(Math.abs(delta) * P.sweep * P.sweep, 1.7), dir = delta >= 0 ? 1 : -1;
        for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = (i === 0 ? 0.4 : i === 1 ? 0.5 : 0.7) * k;
            ctx.strokeStyle = i === 0 ? 'rgb(200, 24, 34)' : i === 1 ? 'rgb(255, 96, 64)' : 'rgb(255, 236, 210)';
            ctx.lineWidth = U * (1.1 - i * 0.42);
            ctx.beginPath();
            ctx.arc(hx, hy, headD * (0.96 + i * 0.03), P.ang - dir * trail, P.ang, dir < 0);
            ctx.stroke();
        }
    }
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(P.ang);
    ctx.globalAlpha = 0.9 * k * flicker;
    ctx.drawImage(g.canvas, -A.pivot * gl - g.pad * gs, -(g.h * gs) / 2 - g.pad * gs, g.canvas.width * gs, g.canvas.height * gs);
    ctx.restore();
    // remember where the ghost blade is for the lightning
    const off = A.bladeOff * (gl / A.len);
    _twGhost.on = true; _twGhost.k = k; _twGhost.hx = hx; _twGhost.hy = hy;
    _twGhost.headX = hx + Math.cos(P.ang) * headD - Math.sin(P.ang) * off;
    _twGhost.headY = hy + Math.sin(P.ang) * headD + Math.cos(P.ang) * off;

    // a crimson ring on the ground of the shape, strongest at the moment of the chop
    const ringA = cast.kind === 1 ? cast.p * 0.35 : cast.kind === 2 ? 0.55 : 0.35 * (1 - cast.p);
    if (ringA > 0.01) {
        ctx.globalAlpha = ringA;
        ctx.strokeStyle = '#ff4a3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r * (1.2 + (cast.kind === 1 ? (1 - cast.p) * 1.2 : cast.kind === 2 ? cast.p * 0.4 : 0.4 + cast.p * 0.6)), 0, _TW_TAU);
        ctx.stroke();
    }
    ctx.restore();
}

// ---------- black lightning ----------

function _twHash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// one jagged bolt from (x0, y0) to (x1, y1); the same seed always gives the same shape, so it can be stroked twice
function _twBoltPath(x0, y0, x1, y1, seed, jit) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len, segs = 7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 1; i < segs; i++) {
        const t = i / segs, j = (_twHash(seed + i * 7.3) - 0.5) * 2 * jit * Math.sin(t * Math.PI);
        ctx.lineTo(x0 + dx * t + px * j, y0 + dy * t + py * j);
        if (i === 3) {   // a short fork
            const f = (_twHash(seed + 91) - 0.5) * 2;
            ctx.lineTo(x0 + dx * (t + 0.12) + px * (j + f * jit * 1.6), y0 + dy * (t + 0.12) + py * (j + f * jit * 1.6));
            ctx.moveTo(x0 + dx * t + px * j, y0 + dy * t + py * j);
        }
    }
    ctx.lineTo(x1, y1);
}

// black lightning: a black core in a crimson sheath. It crackles round the phantom's blade as power gathers and
// bursts out of the chop, from the ghost axe and from the body, mostly down the heading of the wave
function _drawThaelisBlackLightning(enemy, r, now, cast) {
    let power;
    if (cast.kind === 1) power = cast.p > 0.55 ? (cast.p - 0.55) / 0.45 * 0.45 : 0;
    else if (cast.kind === 2) power = 1;
    else if (cast.kind === 3) power = cast.p < 0.4 ? 1 - cast.p / 0.4 : 0;
    else power = 0;
    if (power <= 0.02) return;
    const frame = Math.floor(now / 55), seed0 = frame * 13.7 + enemy.x * 0.01;
    const burst = cast.kind !== 1;
    const nBody = burst ? (_twCount(4, 10)) : (_twCount(0, 2)), nGhost = _twGhost.on ? (burst ? (_twCount(2, 6)) : (_twCount(1, 3))) : 0;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
        // pass 0: crimson sheath, pass 1: the black core on top of it
        ctx.globalAlpha = Math.min(1, power * 1.2) * (pass === 0 ? 0.85 : 1);
        ctx.strokeStyle = pass === 0 ? '#ff3c32' : '#07020a';
        for (let i = 0; i < nBody + nGhost; i++) {
            const seed = seed0 + i * 31.3;
            if (_twHash(seed + 5) < 0.15) continue;   // each bolt is out for a frame now and then
            const ghost = i >= nBody;
            const ox = ghost ? _twGhost.headX : enemy.x, oy = ghost ? _twGhost.headY : enemy.y;
            // bolts fan round the wave's heading on the chop, any way at all while gathering
            const a = burst ? cast.angle + (_twHash(seed + 1) - 0.5) * (ghost ? 2.2 : 2.8) : _twHash(seed + 1) * _TW_TAU;
            const reach = r * (burst ? 2.0 + _twHash(seed + 2) * 2.8 : 0.8 + _twHash(seed + 2) * 1.0) * (ghost ? 1.15 : 1);
            const start = ghost ? 0 : r * 0.9;
            const wd = (ghost ? 4.2 : 3.6) * (0.7 + 0.6 * _twHash(seed + 3)) * (burst ? 1 : 0.7);
            ctx.lineWidth = pass === 0 ? wd + 5.5 : wd;
            _twBoltPath(ox + Math.cos(a) * start, oy + Math.sin(a) * start, ox + Math.cos(a) * (start + reach), oy + Math.sin(a) * (start + reach), seed, reach * 0.16);
            ctx.stroke();
        }
    }
    // the flash the first frames of the chop
    if (cast.kind === 2 && cast.p < 0.5) {
        const g = _getGlowSprite('rgba(255, 70, 60, 0.9)', 64);
        if (g) {
            const gr = r * 3.4;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - cast.p * 2) * 0.75;
            ctx.drawImage(g, enemy.x - gr, enemy.y - gr, gr * 2, gr * 2);
        }
    }
    ctx.restore();
}

// after the chop the bá khí rises off him in crimson and gold wisps
function _drawThaelisBakhiRise(enemy, r, now, cast) {
    if (cast.kind !== 3 && cast.kind !== 2) return;
    const q = cast.kind === 2 ? cast.p * 0.12 : 0.12 + cast.p * 0.88;
    const n = _twCount(6, 14);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
        const h = (i * 0.6180339) % 1, h2 = (i * 0.7548776 + 0.31) % 1;
        const delay = h * 0.35;
        const t = (q - delay) / (1 - delay);
        if (t <= 0 || t >= 1) continue;
        const x0 = (h2 * 2 - 1) * r * 1.05, y0 = r * (-0.15 + (h - 0.5) * 0.7);
        const sway = Math.sin(t * 5 + i * 1.9) * r * 0.15 * (0.4 + t);
        const x = x0 + sway, y = y0 - t * (1.5 + 1.1 * h) * r;
        const len = r * (0.5 + 0.5 * h2) * (1 - t * 0.45);
        const a = t < 0.15 ? t / 0.15 : (1 - t) / 0.85;
        ctx.strokeStyle = `rgba(224, 36, 44, ${a * 0.34})`;
        ctx.lineWidth = r * 0.17;
        ctx.beginPath(); ctx.moveTo(x, y + len); ctx.quadraticCurveTo(x + sway * 0.7, y + len * 0.5, x, y); ctx.stroke();
        ctx.strokeStyle = `rgba(255, 216, 150, ${a * 0.8})`;
        ctx.lineWidth = r * 0.05;
        ctx.stroke();
    }
    // heat ring lifting off the body
    const ringP = _twClamp01(q * 1.3);
    ctx.globalAlpha = (1 - ringP) * 0.45;
    ctx.strokeStyle = '#ff7a4a';
    ctx.lineWidth = 2.4 * (1 - ringP) + 0.6;
    ctx.beginPath(); ctx.ellipse(0, -ringP * r * 0.5, r * (1.05 + ringP * 0.7), r * (1.05 + ringP * 0.7) * 0.8, 0, 0, _TW_TAU); ctx.stroke();
    ctx.restore();
}

// ---------- Tenacity: đấu khí ----------

// the flame aura grows with the HP Thaelis has lost (Tenacity's DR caps at 65% lost), stays lit while a shield
// stands or after a revive, and flares for a moment whenever Tenacity weaves a new shield
function _drawThaelisDouqi(enemy, r, now, hpPct, cast) {
    let qi = _twClamp01((1 - hpPct) / 0.65);
    if ((enemy.shield || 0) > 0) qi = Math.max(qi, 0.38);
    if (enemy.reincarnated) qi = Math.max(qi, 0.25);
    let burst = 0;
    if (enemy._shieldGrantAt) { const a = now - enemy._shieldGrantAt; if (a >= 0 && a < 900) burst = 1 - a / 900; }
    if (qi < 0.04 && burst <= 0 && cast.kind === 0) return;
    // gathering Ulysses' Return turns the aura crimson and drives it to full: the đấu khí that feeds the chop
    const gather = cast.kind === 1 ? _twEaseOut(cast.p * 1.2) : cast.kind === 2 ? 1 : cast.kind === 3 ? 1 - cast.p : 0;
    const lvl = Math.min(1, Math.max(qi + burst * 0.6, gather));
    const hue = 48 - 26 * lvl - 20 * gather;
    const n = _twCount(7, 13);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalCompositeOperation = 'lighter';

    const g = _getGlowSprite('rgba(255, 170, 40, 0.6)', 64);
    if (g) {
        const gr = r * (1.55 + 0.55 * lvl + 0.5 * gather);
        ctx.globalAlpha = 0.24 + 0.4 * lvl;
        ctx.drawImage(g, -gr, -gr, gr * 2, gr * 2);
    }

    for (let i = 0; i < n; i++) {
        const a = (i / n) * _TW_TAU + Math.sin(now / 1700 + i) * 0.12;
        const ox = Math.cos(a), oy = Math.sin(a);
        // flames lean upward the way an aura does, the ones on the lower half stay short
        let dx = ox * 0.38, dy = oy * 0.38 - 0.62;
        const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
        const flick = 0.72 + 0.28 * Math.sin(now / 95 + i * 2.3);
        const L = r * (0.5 + 0.95 * lvl) * flick * (0.62 + 0.38 * -oy) * (1 + burst * 0.5 + gather * 0.75);
        const w = r * (0.13 + 0.09 * lvl);
        const bx = ox * r * 1.02, by = oy * r * 1.02;
        const px = -dy, py = dx;
        const sway = Math.sin(now / 130 + i * 1.7) * L * 0.18;
        const mx = bx + dx * L * 0.5 + px * sway * 0.5, my = by + dy * L * 0.5 + py * sway * 0.5;
        const tx = bx + dx * L + px * sway, ty = by + dy * L + py * sway;
        ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${0.36 + 0.26 * lvl})`;
        ctx.beginPath();
        ctx.moveTo(bx + px * w, by + py * w);
        ctx.quadraticCurveTo(mx + px * w * 0.55, my + py * w * 0.55, tx, ty);
        ctx.quadraticCurveTo(mx - px * w * 0.55, my - py * w * 0.55, bx - px * w, by - py * w);
        ctx.closePath();
        ctx.fill();
        // white-hot core of the flame
        ctx.fillStyle = `rgba(255, 244, 200, ${0.3 + 0.25 * lvl})`;
        const lx = bx + dx * L * 0.62 + px * sway * 0.6, ly = by + dy * L * 0.62 + py * sway * 0.6;
        ctx.beginPath();
        ctx.moveTo(bx + px * w * 0.45, by + py * w * 0.45);
        ctx.quadraticCurveTo(mx + px * w * 0.2, my + py * w * 0.2, lx, ly);
        ctx.quadraticCurveTo(mx - px * w * 0.2, my - py * w * 0.2, bx - px * w * 0.45, by - py * w * 0.45);
        ctx.closePath();
        ctx.fill();
    }

    // rings of qi spread out of the body
    if (!_mobPerf && lvl > 0.45) {   // 2 rings, they spread faster while gathering
        ctx.strokeStyle = `hsl(${hue}, 100%, 62%)`;
        for (let j = 0; j < 2; j++) {
            const t = (now / (1100 - gather * 600) + j * 0.5) % 1;
            ctx.globalAlpha = (1 - t) * 0.5 * lvl;
            ctx.lineWidth = 2 * (1 - t) + 0.6;
            ctx.beginPath(); ctx.arc(0, 0, r * (1 + 0.8 * t), 0, _TW_TAU); ctx.stroke();
        }
    }
    if (burst > 0) {
        ctx.globalAlpha = burst * 0.8;
        ctx.strokeStyle = '#fff0b0';
        ctx.lineWidth = 2.6 * burst + 0.6;
        ctx.beginPath(); ctx.arc(0, 0, r * (1 + 1.3 * (1 - burst)), 0, _TW_TAU); ctx.stroke();
    }
    ctx.restore();
}

// ---------- Iron Body ----------

// one bronze plate per layer on the left of the body: gold while it stands, a hollow once it broke.
// the plate that just broke flashes and throws shards, a fresh revive raises all five one after another
function _drawThaelisIronBody(enemy, r, now) {
    const hits = enemy.ironBodyHits | 0;
    const flashAge = enemy._ironBodyHitAt ? now - enemy._ironBodyHitAt : 1e9;
    let peak = enemy._ironBodyPeak || 0;
    if (hits > peak) peak = enemy._ironBodyPeak = hits;
    if (peak <= 0) return;
    if (hits <= 0 && flashAge > 700) { enemy._ironBodyPeak = 0; return; }
    const slots = Math.min(5, peak), lit = Math.min(slots, hits);
    const reviveAge = enemy._justRevivedAt ? now - enemy._justRevivedAt : 1e9;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (hits > 0) {
        ctx.strokeStyle = `rgba(255, 204, 60, ${0.3 + 0.2 * Math.sin(now / 300)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([9, 7]);
        ctx.lineDashOffset = -now * 0.02;
        ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, _TW_TAU); ctx.stroke();
        ctx.setLineDash([]);
    }

    const R2 = r + 25, span = slots > 1 ? 0.31 : 0;
    for (let i = 0; i < slots; i++) {
        const a = Math.PI + (i - (slots - 1) / 2) * span;
        const px = Math.cos(a) * R2, py = Math.sin(a) * R2;
        const on = i < lit;
        const born = on && reviveAge < 1100 ? _twEaseOut((reviveAge - i * 110) / 220) : 1;
        if (born <= 0) continue;
        const pr = 6.5 * born;
        ctx.beginPath();
        for (let v = 0; v < 6; v++) { const va = a + v * Math.PI / 3; ctx.lineTo(px + Math.cos(va) * pr, py + Math.sin(va) * pr); }
        ctx.closePath();
        if (on) {
            ctx.fillStyle = '#e6b53c';
            ctx.strokeStyle = '#fff4c0';
            ctx.lineWidth = 1.2;
            if (_twGlowOn()) { ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = 7; }
            ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath(); ctx.arc(px - pr * 0.25, py - pr * 0.3, pr * 0.2, 0, _TW_TAU); ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(20, 12, 4, 0.45)';
            ctx.strokeStyle = 'rgba(255, 215, 120, 0.22)';
            ctx.lineWidth = 1;
            ctx.fill(); ctx.stroke();
        }
        // the layer that has just broken: a white flash and shards
        if (i === lit && flashAge < 520) {
            const p = flashAge / 520;
            ctx.save();
            ctx.translate(px, py);
            ctx.globalAlpha = 1 - p;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 * (1 - p) + 0.5;
            ctx.beginPath(); ctx.arc(0, 0, 6 + 14 * p, 0, _TW_TAU); ctx.stroke();
            ctx.fillStyle = '#ffe9a0';
            for (let s = 0; s < 5; s++) {
                const sa = a + (s / 5) * _TW_TAU + 0.4, sd = 4 + p * 20;
                ctx.fillRect(Math.cos(sa) * sd - 1.5, Math.sin(sa) * sd - 1.5, 3, 3);
            }
            ctx.restore();
        }
    }
    ctx.restore();
}

// ---------- going down ----------

const _twFxPos = { x: 0, y: 0 }, _twFxCast = { kind: 3, p: 0, angle: Math.PI / 2 };

function _twDrawAxeAt(x, y, ang, r, alpha) {
    const A = _THAELIS_ART.axe, img = _twImg('axe'), spr = img ? null : _twGetAxe();
    const aw = A.len * r, ah = aw * (img ? img.naturalHeight / img.naturalWidth : spr.h / spr.w);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img || spr.canvas, -A.pivot * aw, -ah / 2, aw, ah);
    ctx.restore();
}

// the shield bursts into its eight wedges and the armour plates fly off it, both spinning out and fading
function _twDrawWreck(r, rot, p, reach) {
    const out = _twEaseOut(p), a = Math.max(0, 1 - p * p);
    for (let i = 0; i < 8; i++) {
        const h = (i * 0.618) % 1, mid = rot + ((i + 0.5) / 8) * _TW_TAU;
        // shield wedge
        const d = r * (0.08 + reach * 0.62 * out * (0.7 + 0.6 * h));
        ctx.save();
        ctx.translate(Math.cos(mid) * d, Math.sin(mid) * d);
        ctx.rotate(rot + (h - 0.5) * 2.4 * out);
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 2 ? '#f2b705' : '#ffd84a';
        ctx.strokeStyle = '#7a3c08';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((i / 8) * _TW_TAU) * r, Math.sin((i / 8) * _TW_TAU) * r);
        ctx.lineTo(Math.cos(((i + 1) / 8) * _TW_TAU) * r, Math.sin(((i + 1) / 8) * _TW_TAU) * r);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // the engraved rings of the shield face still show on each piece
        ctx.strokeStyle = 'rgba(120, 58, 6, 0.55)';
        ctx.lineWidth = 1;
        for (const k of [0.74, 0.46]) { ctx.beginPath(); ctx.arc(0, 0, r * k, (i / 8) * _TW_TAU + 0.06, ((i + 1) / 8) * _TW_TAU - 0.06); ctx.stroke(); }
        ctx.restore();
        // armour plate
        const va = rot + (i / 8) * _TW_TAU, pd = r * (0.95 + reach * out * (0.8 + 0.5 * h));
        ctx.save();
        ctx.translate(Math.cos(va) * pd, Math.sin(va) * pd);
        ctx.rotate(va + out * (4 + h * 5) * (i % 2 ? 1 : -1));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#d9a23a';
        ctx.beginPath(); ctx.moveTo(-r * 0.18, 0); ctx.lineTo(-r * 0.06, -r * 0.15); ctx.lineTo(r * 0.36, 0); ctx.lineTo(-r * 0.06, r * 0.15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c4202a';
        ctx.beginPath(); ctx.moveTo(-r * 0.04, -r * 0.04); ctx.lineTo(r * 0.28, 0); ctx.lineTo(-r * 0.04, r * 0.04); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
}

// Thaelis going down. 'fall': the shield breaks, the plates and the axe are thrown clear and green threads wind in to
// start the Cocoon. 'slain': the bá khí shape is torn in two and lifts away, black lightning bursts out, a pillar of
// red light stands over the spot, and the axe is flung up, comes down and sticks in the ground before it fades.
function _drawThaelisDeathFx() {
    if (typeof _thaelisDeathFx === 'undefined' || !_thaelisDeathFx.length) return;
    const now = performance.now();
    for (let f = 0; f < _thaelisDeathFx.length; f++) {
        const fx = _thaelisDeathFx[f], p = _twClamp01(fx.age / fx.dur), r = fx.r, slain = fx.kind === 'slain';
        ctx.save();
        ctx.translate(fx.x, fx.y);

        if (slain) {
            // the ground it stood on: cracks cooling as the effect runs
            _twFxPos.x = 0; _twFxPos.y = 0; _twFxCast.p = p;
            _drawThaelisGroundCracks(_twFxPos, r, now, _twFxCast);
            // pillar of red light
            const pk = Math.sin(Math.PI * _twClamp01(p * 1.5)), pw = r * (0.25 + 1.1 * pk);
            if (pk > 0.02) {
                const pg = ctx.createLinearGradient(-pw, 0, pw, 0);
                pg.addColorStop(0, 'rgba(255, 40, 30, 0)'); pg.addColorStop(0.5, `rgba(255, 190, 150, ${0.8 * pk})`); pg.addColorStop(1, 'rgba(255, 40, 30, 0)');
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = pg;
                ctx.fillRect(-pw, -r * 9, pw * 2, r * 9.6);
                ctx.globalCompositeOperation = 'source-over';
            }
            // the bá khí shape, torn down the middle, each half drifting off and up
            const ghostA = Math.pow(1 - _twClamp01(p / 0.8), 1.2);
            if (ghostA > 0.02) {
                const art = _twImg('phantom'), src = art || _twGetPhantom().canvas;
                const sw = art ? art.naturalWidth : src.width, sh = art ? art.naturalHeight : src.height;
                const w = _THAELIS_ART.phantom.widthR * r * (1 + 0.15 * p), h = w * sh / sw;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.9 * ghostA;
                for (const side of [-1, 1]) {
                    const dx = side * r * 0.9 * p, dy = -r * 1.4 * p;
                    ctx.save();
                    ctx.translate(dx, dy);
                    ctx.rotate(side * 0.28 * p);
                    ctx.drawImage(src, side < 0 ? 0 : sw / 2, 0, sw / 2, sh, side < 0 ? -w / 2 : 0, -h / 2, w / 2, h);
                    ctx.restore();
                }
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1;
            }
        }

        // flash, then the wreck of the shield and its armour
        const flash = Math.pow(1 - _twClamp01(p / (slain ? 0.3 : 0.4)), 2);
        if (flash > 0.02) {
            const g = _getGlowSprite(slain ? 'rgba(255, 120, 90, 0.95)' : 'rgba(255, 225, 140, 0.95)', 64);
            if (g) { const gr = r * (slain ? 3.6 : 2.4); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash; ctx.drawImage(g, -gr, -gr, gr * 2, gr * 2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
        }
        _twDrawWreck(r, fx.rot, _twClamp01(p * (slain ? 1.25 : 1)), slain ? 3.4 : 2.2);
        ctx.globalAlpha = 1;

        // light breaks out through the cracks
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        const rays = _twCount(6, 12), rayA = Math.pow(1 - _twClamp01(p / 0.6), 1.5);
        if (rayA > 0.02) {
            ctx.strokeStyle = slain ? '#ff8a6a' : '#fff0b0';
            for (let i = 0; i < rays; i++) {
                const a = (i / rays) * _TW_TAU + fx.rot, l0 = r * 0.3, l1 = r * (1.2 + 2.6 * p) * (0.7 + 0.5 * ((i * 0.618) % 1));
                ctx.globalAlpha = rayA * 0.85;
                ctx.lineWidth = 3 * (1 - p) + 0.8;
                ctx.beginPath(); ctx.moveTo(Math.cos(a) * l0, Math.sin(a) * l0); ctx.lineTo(Math.cos(a) * l1, Math.sin(a) * l1); ctx.stroke();
            }
        }
        // shock rings
        for (let j = 0; j < (slain ? 3 : 2); j++) {
            const q = _twClamp01(p * 1.6 - j * 0.22);
            if (q <= 0 || q >= 1) continue;
            ctx.globalAlpha = (1 - q) * 0.9;
            ctx.strokeStyle = j === 0 ? '#ffe9c8' : slain ? '#ff4a3c' : '#ffc23c';
            ctx.lineWidth = (4 - j) * (1 - q) + 0.6;
            ctx.beginPath(); ctx.arc(0, 0, r * (1 + q * (slain ? 4.2 : 2.8)), 0, _TW_TAU); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        if (slain) {
            // black lightning tears out in every direction
            const power = 1 - _twClamp01(p / 0.5);
            if (power > 0.02) {
                const frame = Math.floor(now / 55), bolts = _twCount(5, 11);
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                for (let pass = 0; pass < 2; pass++) {
                    ctx.globalAlpha = Math.min(1, power * 1.4) * (pass === 0 ? 0.85 : 1);
                    ctx.strokeStyle = pass === 0 ? '#ff3c32' : '#07020a';
                    for (let i = 0; i < bolts; i++) {
                        const seed = frame * 11.3 + i * 29.1 + f;
                        if (_twHash(seed + 5) < 0.2) continue;
                        const a = (i / bolts) * _TW_TAU + _twHash(seed + 1) * 0.5, reach = r * (2.2 + _twHash(seed + 2) * 3);
                        const wd = 3.6 * (0.7 + 0.6 * _twHash(seed + 3));
                        ctx.lineWidth = pass === 0 ? wd + 5.5 : wd;
                        _twBoltPath(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, Math.cos(a) * reach, Math.sin(a) * reach, seed, reach * 0.15);
                        ctx.stroke();
                    }
                }
                ctx.globalAlpha = 1;
            }
            // embers rise off the spot for the whole effect
            ctx.globalCompositeOperation = 'lighter';
            const embers = _twCount(8, 18);
            for (let i = 0; i < embers; i++) {
                const h = (i * 0.618) % 1, h2 = (i * 0.754 + 0.3) % 1, t = _twClamp01((p - h * 0.3) / 0.7);
                if (t <= 0 || t >= 1) continue;
                ctx.globalAlpha = (1 - t) * 0.9;
                ctx.fillStyle = i % 3 ? '#ff7a4a' : '#ffe0a8';
                const ex = (h2 * 2 - 1) * r * 1.4 + Math.sin(t * 6 + i) * r * 0.12, ey = r * 0.3 - t * r * (2 + 2.2 * h);
                ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            // the axe: flung up spinning, comes down blade first, sticks, then fades
            const landX = r * 0.5, landY = r * 0.35;
            if (p < 0.55) {
                const t = p / 0.55;
                _twDrawAxeAt(_twLerp(r * 1.28, landX, t), _twLerp(r * 0.12, landY - r * 1.2, t) - Math.sin(Math.PI * t) * r * 2.4, _TW_IDLE.ang + t * t * 14.2, r, 1);
            } else {
                const t = (p - 0.55) / 0.45, hitP = _twClamp01(t / 0.35);
                _twDrawAxeAt(landX, landY - r * 1.2 * (1 - _twEaseOut(t * 6)), Math.PI / 2 + 0.22 + Math.sin(t * 40) * 0.05 * (1 - hitP), r, 1 - _twClamp01((t - 0.55) / 0.45));
                if (hitP < 1) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 1 - hitP;
                    ctx.strokeStyle = '#ffd0b0';
                    ctx.lineWidth = 2.5 * (1 - hitP) + 0.5;
                    ctx.beginPath(); ctx.ellipse(landX, landY + r * 0.7, r * (0.3 + 1.3 * hitP), r * (0.3 + 1.3 * hitP) * 0.5, 0, 0, _TW_TAU); ctx.stroke();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = 1;
                }
            }
        } else {
            // the axe is thrown clear, tumbling, and fades
            _twDrawAxeAt(r * (1.28 + 1.5 * p), r * (0.12 - 1.1 * p + 2.4 * p * p), _TW_IDLE.ang + p * 9, r, 1 - p * p * p);
            // green threads wind in from all round: the Cocoon is being spun
            if (p > 0.3) {
                const q = (p - 0.3) / 0.7, threads = _twCount(4, 8);
                ctx.strokeStyle = `rgba(130, 255, 170, ${Math.sin(Math.PI * q) * 0.85})`;
                ctx.lineWidth = 1.6;
                for (let i = 0; i < threads; i++) {
                    const a = (i / threads) * _TW_TAU + q * 3.2, d1 = r * 2.6 * (1 - q) + r * 0.5, d2 = r * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * d1, Math.sin(a) * d1);
                    ctx.quadraticCurveTo(Math.cos(a + 0.9) * d1 * 0.6, Math.sin(a + 0.9) * d1 * 0.6, Math.cos(a + 1.6) * d2, Math.sin(a + 1.6) * d2);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }
}
