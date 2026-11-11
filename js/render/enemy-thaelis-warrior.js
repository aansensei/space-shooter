// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/render/enemy-thaelis-warrior.js: the Odyssey war gear on Thaelis's hoplite shield.
// Pure Canvas2D, called from enemy-thaelis.js. It draws
//   - bronze and crimson armour plates riveted onto the shield, and the red Viking bearded axe that hangs beside it,
//   - the Ulysses' Return cast: the axe is raised, red đấu khí and bá khí gather and the ground cracks open,
//     the axe chops, the ground bursts and bá khí wisps lift away. A huge ghost shape (the bá khí phantom)
//     stands behind a bare Thaelis and behind its Cocoon alike while the wave is gathered,
//   - Tenacity's đấu khí, the flame aura that burns hotter the more HP Thaelis has lost,
//   - the Iron Body layers a revived Thaelis wears (5 plates).
// Everything has a code-drawn version. If the art listed in _THAELIS_ART exists on disk it is
// drawn instead (misc/scripts/ingest_thaelis_assets.py prepares those files).
// Nothing here allocates per frame: the pose and cast state live in two reused objects.

const _THAELIS_ART = {
    // armour ring laid over the shield: centred, the shield (radius r in game) is rFrac of the image width
    armor: { src: 'assets/images/game/enemies/thaelis-armor.png', rFrac: 0.36 },
    // the axe lies along +x, butt on the left, the blade on the right. pivot = grip, as a fraction of the width,
    // len = whole sprite width in r, head = where the blade meets the haft, as a fraction of the width,
    // bladeOff = how far the middle of the blade hangs off the haft, in r (0 for a blade mirrored about the haft)
    axe: { src: 'assets/images/game/enemies/thaelis-axe.png', len: 2.05, pivot: 0.17, head: 0.86, bladeOff: 0.38 },
    // chest centre at the image centre, drawn additive (black is invisible). widthR = whole image width in r
    phantom: { src: 'assets/images/game/effects/thaelis-bakhi-phantom.png', widthR: 6.4 },
    // the head of the sonic wave: the leading crescent sits at tip (fraction of the width), ripples trail to the left
    sonic: { src: 'assets/images/game/effects/thaelis-sonic-arc.png', tip: 0.70 },
};

const _TW_REF = 150;            // radius the figure is baked at
const _TW_TAU = Math.PI * 2;
const THAELIS_SWING_MS = 240;   // the chop, right when the wave's gate closes
const THAELIS_RELEASE_MS = 1500; // bá khí rising after the chop

const _twCast = { kind: 0, p: 0, angle: Math.PI / 2 };   // kind: 0 idle, 1 gather, 2 chop, 3 release
const _twPose = { ang: 0, hx: 0, hy: 0, glow: 0, sweep: 0 };
let _twArmorSprite = null, _twAxeSprite = null, _twPhantomSprite = null;
let _twArtRequested = false;

function _twClamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function _twLerp(a, b, t) { return a + (b - a) * t; }
function _twEaseOut(t) { t = _twClamp01(t); return 1 - (1 - t) * (1 - t) * (1 - t); }
function _twEaseInOut(t) { t = _twClamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function _twGlowOn() { return !_mobPerf && window._fxOpts && window._fxOpts.glow; }

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

// the Viking bearded axe lies along +x: butt on the left, grip near it, one long bearded blade hanging to +y on the right
function _twGetAxe() {
    if (_twAxeSprite) return _twAxeSprite;
    const A = _THAELIS_ART.axe, R = _TW_REF;
    const W = Math.ceil(A.len * R), H = Math.ceil(1.9 * R);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    c.translate(A.pivot * W, H / 2);
    const headX = (A.head - A.pivot) * W, tipX = (1 - A.pivot) * W - 0.02 * R;
    c.lineJoin = 'round';
    // haft: dark ash, slightly thicker toward the head
    const hg = c.createLinearGradient(0, -0.06 * R, 0, 0.06 * R);
    hg.addColorStop(0, '#b07a48'); hg.addColorStop(0.5, '#7a4a22'); hg.addColorStop(1, '#40240f');
    c.fillStyle = hg;
    c.beginPath();
    c.moveTo(-A.pivot * W + 0.03 * R, -0.04 * R);
    c.lineTo(tipX, -0.055 * R); c.lineTo(tipX, 0.055 * R);
    c.lineTo(-A.pivot * W + 0.03 * R, 0.04 * R);
    c.closePath(); c.fill();
    // wood grain
    c.strokeStyle = 'rgba(40, 20, 8, 0.4)'; c.lineWidth = 0.008 * R;
    for (const gy of [-0.02, 0.012]) { c.beginPath(); c.moveTo(0.34 * R, gy * R); c.lineTo(headX - 0.25 * R, gy * R * 1.2); c.stroke(); }
    // leather wrapped grip with crossed lacing
    c.fillStyle = '#2a1608';
    c.fillRect(-0.14 * R, -0.056 * R, 0.44 * R, 0.112 * R);
    c.strokeStyle = 'rgba(214, 160, 86, 0.6)'; c.lineWidth = 0.012 * R;
    for (let i = 0; i < 7; i++) {
        const x = -0.12 * R + i * 0.058 * R;
        c.beginPath(); c.moveTo(x, -0.056 * R); c.lineTo(x + 0.05 * R, 0.056 * R); c.moveTo(x + 0.05 * R, -0.056 * R); c.lineTo(x, 0.056 * R); c.stroke();
    }
    // iron pommel ring and two iron bands
    c.fillStyle = '#8d8f98'; c.strokeStyle = '#d9dbe2'; c.lineWidth = 0.01 * R;
    c.beginPath(); c.arc(-A.pivot * W + 0.07 * R, 0, 0.07 * R, 0, _TW_TAU); c.fill(); c.stroke();
    c.fillStyle = '#1c0d06';
    c.beginPath(); c.arc(-A.pivot * W + 0.07 * R, 0, 0.03 * R, 0, _TW_TAU); c.fill();
    c.fillStyle = '#8d8f98';
    for (const bx of [0.36, 0.62]) c.fillRect(bx * R, -0.058 * R, 0.035 * R, 0.116 * R);
    // crimson cord lashed under the head
    c.strokeStyle = '#b01822'; c.lineWidth = 0.022 * R;
    for (let i = 0; i < 4; i++) { const x = headX - 0.34 * R + i * 0.035 * R; c.beginPath(); c.moveTo(x, -0.06 * R); c.lineTo(x + 0.02 * R, 0.06 * R); c.stroke(); }

    // the bearded blade: a short toe ahead of the haft tip, a long curved edge, and the beard hooking back down the haft
    const blade = () => {
        c.beginPath();
        c.moveTo(headX + 0.14 * R, -0.07 * R);
        c.quadraticCurveTo(headX + 0.34 * R, 0.06 * R, headX + 0.42 * R, 0.36 * R);        // out to the toe
        c.quadraticCurveTo(headX + 0.06 * R, 0.86 * R, headX - 0.5 * R, 0.72 * R);          // the cutting edge, down to the beard tip
        c.quadraticCurveTo(headX - 0.24 * R, 0.56 * R, headX - 0.17 * R, 0.2 * R);          // inside of the beard
        c.lineTo(headX - 0.15 * R, -0.07 * R);
        c.closePath();
    };
    const bg = c.createLinearGradient(headX, -0.05 * R, headX - 0.05 * R, 0.8 * R);
    bg.addColorStop(0, '#2c2f38'); bg.addColorStop(0.3, '#5a1218'); bg.addColorStop(0.72, '#c2222c'); bg.addColorStop(1, '#ff8a6a');
    blade();
    c.fillStyle = bg; c.fill();
    c.strokeStyle = '#1a0a0c'; c.lineWidth = 0.02 * R; c.stroke();
    // fuller: a darker forged groove following the edge
    c.strokeStyle = 'rgba(20, 6, 8, 0.5)'; c.lineWidth = 0.035 * R;
    c.beginPath(); c.moveTo(headX + 0.22 * R, 0.2 * R); c.quadraticCurveTo(headX + 0.02 * R, 0.58 * R, headX - 0.3 * R, 0.56 * R); c.stroke();
    // the honed edge, white hot
    c.strokeStyle = '#ffe9d0'; c.lineWidth = 0.028 * R; c.lineCap = 'round';
    c.beginPath(); c.moveTo(headX + 0.415 * R, 0.37 * R); c.quadraticCurveTo(headX + 0.06 * R, 0.855 * R, headX - 0.49 * R, 0.715 * R); c.stroke();
    c.strokeStyle = 'rgba(255, 120, 90, 0.75)'; c.lineWidth = 0.06 * R;
    c.beginPath(); c.moveTo(headX + 0.38 * R, 0.37 * R); c.quadraticCurveTo(headX + 0.05 * R, 0.8 * R, headX - 0.44 * R, 0.68 * R); c.stroke();
    // runes inlaid in gold on the cheek of the blade
    c.strokeStyle = '#ffd979'; c.lineWidth = 0.014 * R;
    const rune = (x, y, k) => {
        c.beginPath();
        c.moveTo(x, y - 0.06 * R); c.lineTo(x, y + 0.06 * R);
        if (k === 0) { c.moveTo(x, y - 0.06 * R); c.lineTo(x + 0.04 * R, y - 0.02 * R); c.lineTo(x, y + 0.02 * R); }           // thurisaz
        else if (k === 1) { c.moveTo(x - 0.035 * R, y - 0.03 * R); c.lineTo(x, y - 0.06 * R); c.lineTo(x + 0.035 * R, y - 0.03 * R); } // tiwaz
        else { c.moveTo(x, y - 0.02 * R); c.lineTo(x + 0.04 * R, y - 0.06 * R); c.moveTo(x, y + 0.01 * R); c.lineTo(x + 0.04 * R, y - 0.03 * R); } // ansuz
        c.stroke();
    };
    rune(headX + 0.14 * R, 0.24 * R, 0); rune(headX + 0.0 * R, 0.34 * R, 1); rune(headX - 0.14 * R, 0.4 * R, 2);
    // iron eye around the haft, a hammer poll on the back and a rivet
    const eg = c.createLinearGradient(0, -0.2 * R, 0, 0.12 * R);
    eg.addColorStop(0, '#c9ccd6'); eg.addColorStop(1, '#4a4d58');
    c.fillStyle = eg; c.strokeStyle = '#14151a'; c.lineWidth = 0.014 * R;
    c.beginPath();
    c.moveTo(headX - 0.17 * R, 0.1 * R); c.lineTo(headX - 0.15 * R, -0.09 * R); c.lineTo(headX - 0.1 * R, -0.2 * R);
    c.lineTo(headX + 0.1 * R, -0.2 * R); c.lineTo(headX + 0.15 * R, -0.09 * R); c.lineTo(headX + 0.16 * R, 0.1 * R);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e9bd5e';
    c.beginPath(); c.arc(headX, 0, 0.04 * R, 0, _TW_TAU); c.fill();
    _twAxeSprite = { canvas: off, w: W, h: H };
    return _twAxeSprite;
}

// the bá khí phantom: a huge translucent Odysseus with the axe raised overhead and a round shield on the other arm.
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
    // right arm up, fist over the head, axe haft and its bearded blade
    s.lineWidth = 0.66 * U;
    s.beginPath(); s.moveTo(1.55 * U, -1.2 * U); s.lineTo(2.25 * U, -2.0 * U); s.lineTo(1.85 * U, -2.85 * U); s.stroke();
    s.lineWidth = 0.15 * U;
    s.beginPath(); s.moveTo(1.8 * U, -1.9 * U); s.lineTo(2.0 * U, -3.82 * U); s.stroke();
    s.beginPath();
    s.moveTo(2.05 * U, -3.85 * U);
    s.quadraticCurveTo(1.2 * U, -4.0 * U, 0.75 * U, -3.55 * U);
    s.quadraticCurveTo(0.7 * U, -2.9 * U, 1.3 * U, -2.5 * U);
    s.quadraticCurveTo(1.45 * U, -3.0 * U, 1.9 * U, -3.2 * U);
    s.closePath(); s.fill();
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
        [2.9, -3.6], [1.2, -3.6], [2.0, -3.9], [2.3, -2.1], [-0.9, 0.2], [0.9, 0.2], [-0.3, -3.6], [0.4, -3.3]];
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
function _twComputePose(cast, now) {
    const P = _twPose;
    P.glow = 0; P.sweep = 0;
    if (cast.kind === 0) {
        P.ang = _TW_IDLE.ang + Math.sin(now / 760) * 0.05;
        P.hx = _TW_IDLE.hx; P.hy = _TW_IDLE.hy + Math.sin(now / 760 + 1) * 0.03;
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
        P.glow = cast.p;
    } else if (cast.kind === 2) {
        const q = cast.p, t = q * q;
        P.ang = _TW_COCK.ang + delta * t;
        P.hx = _twLerp(_TW_COCK.hx, endHx, t); P.hy = _twLerp(_TW_COCK.hy, endHy, t);
        P.glow = 1; P.sweep = q;
    } else {
        const t = _twEaseInOut((cast.p - 0.25) / 0.75);
        P.ang = _twLerp(_TW_COCK.ang + delta, _TW_IDLE.ang, t);
        P.hx = _twLerp(endHx, _TW_IDLE.hx, t); P.hy = _twLerp(endHy, _TW_IDLE.hy, t);
        P.glow = 1 - cast.p;
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
    const P = _twComputePose(cast, now);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // swing smear: the path the blade just travelled
    if (cast.kind === 2 && P.sweep > 0.05) {
        const len = 1.41 * r;
        let delta = ((cast.angle - _TW_COCK.ang) % _TW_TAU + _TW_TAU) % _TW_TAU;
        if (delta > Math.PI * 1.25) delta -= _TW_TAU;
        const trail = Math.min(Math.abs(delta), 1.5), dir = delta >= 0 ? 1 : -1;
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
    const reach = r * 2.7 * grow;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // molten glow under the cracks
    const g = _getGlowSprite('rgba(255, 60, 40, 0.8)', 64);
    if (g) { const gr = reach * 0.75; ctx.globalAlpha = 0.3 * heat; ctx.drawImage(g, -gr, -gr * 0.8, gr * 2, gr * 1.6); }
    const nCr = _mobPerf ? 9 : _TW_CRACKS.length;
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
        const rocks = 12, lift = cast.kind === 1 ? cast.p : 1;
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
    // the slam
    if (burst > 0.02) {
        ctx.globalAlpha = burst;
        ctx.strokeStyle = '#ffd0b0';
        ctx.lineWidth = 3 * burst + 0.6;
        ctx.beginPath(); ctx.ellipse(0, 0, r * (1.2 + (1 - burst) * 2.6), r * (1.2 + (1 - burst) * 2.6) * 0.82, 0, 0, _TW_TAU); ctx.stroke();
    }
    ctx.restore();
}

// ---------- bá khí ----------

// While Ulysses' Return is gathered the warrior's own bá khí takes his shape behind the body, larger than he is.
// It lunges with the chop and then lifts away. Works for a bare Thaelis and for its Cocoon alike.
function _drawThaelisPhantom(enemy, r, now, cast) {
    if (cast.kind === 0) return;
    let k, rise = 0, scale = 1, lunge = 0;
    if (cast.kind === 1) { k = _twEaseOut(cast.p * 1.15); scale = 0.74 + 0.26 * k; rise = (1 - k) * 0.35 * r; }
    else if (cast.kind === 2) { k = 1; scale = 1 + 0.07 * cast.p; lunge = Math.sin(cast.p * Math.PI) * 0.45 * r; }
    else { k = Math.pow(1 - cast.p, 1.4); scale = 1.07 + 0.1 * cast.p; rise = -cast.p * 1.3 * r; }
    if (k <= 0.01) return;
    const art = _twImg('phantom'), spr = art ? null : _twGetPhantom();
    const src = art || spr.canvas;
    const w = _THAELIS_ART.phantom.widthR * r * scale, h = w * (art ? art.naturalHeight / art.naturalWidth : 1);
    const cx = enemy.x + Math.cos(cast.angle) * lunge, cy = enemy.y + Math.sin(cast.angle) * lunge - rise;
    const flicker = 0.84 + 0.16 * Math.sin(now / 63 + enemy.x);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // three copies, the outer two drifting, so the edge shimmers like heat
    const copies = _mobPerf ? 1 : 3;
    for (let i = 0; i < copies; i++) {
        const dx = i === 0 ? 0 : Math.sin(now / 210 + i * 2.1) * r * 0.07 * i;
        const dy = i === 0 ? 0 : Math.cos(now / 170 + i) * r * 0.05 * i;
        const s = i === 0 ? 1 : 1 + 0.03 * i * Math.sin(now / 260 + i);
        ctx.globalAlpha = (i === 0 ? 0.8 : 0.24) * k * flicker;
        ctx.drawImage(src, cx - w * s / 2 + dx, cy - h * s / 2 + dy, w * s, h * s);
    }
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

// after the chop the bá khí rises off him in crimson and gold wisps
function _drawThaelisBakhiRise(enemy, r, now, cast) {
    if (cast.kind !== 3 && cast.kind !== 2) return;
    const q = cast.kind === 2 ? cast.p * 0.12 : 0.12 + cast.p * 0.88;
    const n = _mobPerf ? 6 : 14;
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
    const n = _mobPerf ? 7 : 13;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalCompositeOperation = 'lighter';

    const g = _getGlowSprite('rgba(255, 170, 40, 0.6)', 64);
    if (g) {
        const gr = r * (1.55 + 0.55 * lvl + 0.5 * gather);
        ctx.globalAlpha = 0.2 + 0.34 * lvl;
        ctx.drawImage(g, -gr, -gr, gr * 2, gr * 2);
    }

    for (let i = 0; i < n; i++) {
        const a = (i / n) * _TW_TAU + Math.sin(now / 1700 + i) * 0.12;
        const ox = Math.cos(a), oy = Math.sin(a);
        // flames lean upward the way an aura does, the ones on the lower half stay short
        let dx = ox * 0.38, dy = oy * 0.38 - 0.62;
        const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
        const flick = 0.72 + 0.28 * Math.sin(now / 95 + i * 2.3);
        const L = r * (0.5 + 0.95 * lvl) * flick * (0.62 + 0.38 * -oy) * (1 + burst * 0.5 + gather * 0.45);
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
