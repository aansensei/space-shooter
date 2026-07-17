// render/skill-d.js — extracted from render.js (Cosmic Black Hole charge + hole).

function drawSkillDCharging() {
    const now = performance.now();
    const p = Math.min((now - skillDChargeStartTime) / skillDChargeTime, 1);
    const cx = player.x, cy = player.y;

    ctx.save();

    // 1. GRAVITY RINGS, co lại vào tâm
    for (let ring = 0; ring < 4; ring++) {
        const phase = ((now / (900 - p * 300) + ring / 4) % 1);
        const ringR = 20 + phase * (60 + p * 120);
        const ringA = (1 - phase) * 0.5 * p;
        ctx.strokeStyle = `rgba(120,0,200,${ringA})`;
        ctx.lineWidth = 2.5 * (1 - phase);
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // 2. MATTER STREAMS, phân tử xoáy vào từ xung quanh
    const streamCount = 8;
    for (let i = 0; i < streamCount; i++) {
        const spinDir = i % 2 === 0 ? 1 : -1;
        const baseAngle = (i / streamCount) * Math.PI * 2;
        const spinOffset = now / (600 + i * 50) * spinDir;
        const len = 60 + p * 160;

        ctx.beginPath();
        const steps = 22;
        for (let s = steps; s >= 0; s--) {
            const t = s / steps;
            const dist = t * len;
            const angle = baseAngle + spinOffset + t * 2.5 * spinDir;
            const px2 = cx + Math.cos(angle) * dist;
            const py2 = cy + Math.sin(angle) * dist;
            s === steps ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        const sA = 0.2 + p * 0.6;
        ctx.strokeStyle = i % 2 === 0
            ? `rgba(160,0,255,${sA})`
            : `rgba(80,0,180,${sA * 0.7})`;
        ctx.lineWidth = 0.8 + p * 1.2;
        ctx.stroke();
    }

    // 3. DARK CORE hình thành
    const coreR = 4 + p * 16;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
    coreGrad.addColorStop(0, 'rgba(0,0,0,1)');
    coreGrad.addColorStop(0.4, `rgba(40,0,80,${0.8 * p})`);
    coreGrad.addColorStop(0.8, `rgba(100,0,180,${0.4 * p})`);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(180,80,255,0.8)`;
    ctx.lineWidth = 1.5;
    if (!_mobPerf) ctx.shadowColor = '#8800ff'; if (!_mobPerf) ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. TITLE, hiện NGAY khi ấn, mờ dần khi gần đầy
    {
        const textT = Math.min(p / 0.15, 1) * Math.max(0, 1 - (p - 0.7) / 0.3);
        if (textT > 0.02) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.globalAlpha = textT * 0.28;
            ctx.font = 'bold 110px serif';
            ctx.fillStyle = '#6600cc';
            if (!_mobPerf) ctx.shadowColor = '#4400aa'; if (!_mobPerf) ctx.shadowBlur = 40;
            ctx.fillText('虛空崩塌', cx, cy - 80);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'bold 30px "Arial Black", sans-serif';
            ctx.fillStyle = '#cc88ff';
            if (!_mobPerf) ctx.shadowColor = '#8800ff'; if (!_mobPerf) ctx.shadowBlur = 28;
            ctx.fillText('SINGULARITY', cx, cy - 122);

            ctx.globalAlpha = textT * 0.92;
            ctx.font = 'italic 13px monospace';
            ctx.fillStyle = '#bb66ff';
            if (!_mobPerf) ctx.shadowBlur = 10;
            ctx.fillText('— Hố Đen Triệu Hoán —', cx, cy - 98);
            ctx.restore();
        }
    }

    ctx.restore();
}

// Black hole
function drawBlackHole() {
    if (!blackHole || blackHole.size <= 0) return;
    const now = performance.now();
    ctx.save();
    const angle = blackHole.activeTime / 500;
    ctx.translate(blackHole.x, blackHole.y);

    // Gravitational lens glow (HIGH full, MED dim)
    if (_gfxLevel < 2) {
        const _lensA = _gfxLevel < 1 ? 1.0 : 0.40;
        const lensG = ctx.createRadialGradient(0, 0, blackHole.size * 0.85, 0, 0, blackHole.size * 2.0);
        lensG.addColorStop(0,   `rgba(200,80,255,${0.22 * _lensA})`);
        lensG.addColorStop(0.5, `rgba(100,0,180,${0.08 * _lensA})`);
        lensG.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = lensG;
        ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 2.0, 0, Math.PI * 2); ctx.fill();
    }

    // Accretion disk, BEHIND pass (far half, before BH body)
    // HIGH: animated sin oscillation   MED: static 5-layer   LOW: static 2-layer
    if (_gfxLevel < 3) {
        const _t   = now / 1000;
        const _anim = _gfxLevel < 1; // animated only on HIGH
        const _s1  = _anim ? Math.sin(_t * 0.55)         * 0.14 : 0;
        const _s2  = _anim ? Math.sin(_t * 0.82 + 1.4)   * 0.09 : 0;
        const _s3  = _anim ? Math.sin(_t * 1.20 + 2.9)   * 0.07 : 0;
        const _sw  = _anim ? Math.sin(_t * 0.33 + 0.8)   * 0.08 : 0; // width wave
        const _diskTilt = _anim ? 0.22 + Math.sin(_t * 0.18) * 0.055 : 0.22;
        const _BH  = blackHole.size;
        const _ry  = _BH * 0.32;
        const _layers = _gfxLevel < 2 ? [
            { rx: _BH * 1.78, lw: 20 + _sw * 40, r:60,  g:0,   b:110, a: 0.18 + _s1 * 0.5 },
            { rx: _BH * 1.52, lw: 13 + _sw * 20, r:130, g:0,   b:200, a: 0.30 + _s2 },
            { rx: _BH * 1.28, lw:  9 + _sw * 14, r:190, g:40,  b:255, a: 0.48 + _s1 },
            { rx: _BH * 1.09, lw:  5 + _sw *  8, r:230, g:120, b:255, a: 0.65 + _s3 },
            { rx: _BH * 0.95, lw:  2.5,           r:255, g:220, b:255, a: 0.85 + _s2 },
        ] : [
            { rx: _BH * 1.55, lw: 11, r:110, g:0,  b:160, a: 0.22 },
            { rx: _BH * 1.08, lw:  4, r:200, g:80, b:255, a: 0.38 },
        ];
        ctx.save();
        ctx.rotate(_diskTilt);
        ctx.beginPath(); ctx.rect(-_BH * 3, 0, _BH * 6, _BH * 3); ctx.clip(); // far half
        for (const d of _layers) {
            ctx.strokeStyle = `rgba(${d.r},${d.g},${d.b},${Math.min(0.97, Math.max(0.02, d.a))})`;
            ctx.lineWidth = d.lw;
            if (!_mobPerf) { ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = d.lw * 0.65; }
            ctx.beginPath(); ctx.ellipse(0, 0, d.rx, _ry * (d.rx / (_BH * 1.78)), 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Infalling matter particles (HIGH only)
    if (_gfxLevel < 1) {
        for (let i = 0; i < 6; i++) {
            const phase = ((angle * 0.35 + i / 6) % 1 + 1) % 1; // 0→1 cycling
            const dist  = blackHole.size * (2.4 - 1.5 * phase);
            const pAngle = (i / 6) * Math.PI * 2 + phase * 3.5; // spirals inward
            const px = Math.cos(pAngle) * dist;
            const py = Math.sin(pAngle) * dist;
            const pA  = Math.min(1, (1 - phase) * 2.0) * 0.75;
            const pR  = Math.max(0.8, 2.5 * (1 - phase * 0.7));
            ctx.fillStyle = `rgba(220,140,255,${pA})`;
            ctx.beginPath(); ctx.arc(px, py, pR, 0, Math.PI * 2); ctx.fill();
        }
    }

    // distortion ring (visual layer only)
    for (let i = 3; i >= 1; i--) {
        const ringR = blackHole.size * (0.9 + i * 0.18);
        ctx.strokeStyle = `rgba(180,0,255,${0.08 * i})`;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // Main body + event horizon (HIGH: wobbling boundary)
    // Gradient radius slightly larger to cover wobble peaks
    const _ehWobble = _gfxLevel < 1 ? 0.07 : 0;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, blackHole.size * (1 + _ehWobble));
    grad.addColorStop(0,    'black');
    grad.addColorStop(0.36, '#1a0030');
    grad.addColorStop(0.68, 'purple');
    grad.addColorStop(1,    'rgba(80,0,80,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (_gfxLevel < 1) {
        // 5 sin waves, incommensurable frequencies → never repeats exactly
        const _ehT = now / 1000;
        const _seg = 64;
        for (let i = 0; i <= _seg; i++) {
            const a = (i / _seg) * Math.PI * 2;
            const w = 1
                + Math.sin(a * 3 + _ehT * 1.10        ) * 0.028
                + Math.sin(a * 5 + _ehT * 0.73 + 1.40 ) * 0.018
                + Math.sin(a * 7 + _ehT * 1.47 + 2.80 ) * 0.013
                + Math.sin(a * 2 + _ehT * 0.51 + 0.70 ) * 0.022
                + Math.sin(a * 4 + _ehT * 1.83 + 3.50 ) * 0.011;
            const r = blackHole.size * w;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                    : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
    } else {
        ctx.arc(0, 0, blackHole.size, 0, Math.PI * 2);
    }
    ctx.fill();

    // Photon sphere ring (HIGH: pulsing, MED: static, LOW: dim static)
    if (_gfxLevel < 3) {
        const _psT = now / 1000;
        const _psP = _gfxLevel < 1 ? (0.70 + 0.30 * Math.sin(_psT * 1.4))
                   : _gfxLevel < 2 ? 0.60
                   :                 0.30;
        const psG = ctx.createRadialGradient(0, 0, blackHole.size * 0.88, 0, 0, blackHole.size * 1.04);
        psG.addColorStop(0,    'rgba(0,0,0,0)');
        psG.addColorStop(0.35, `rgba(200,80,255,${0.45 * _psP})`);
        psG.addColorStop(0.62, `rgba(255,220,255,${0.78 * _psP})`);
        psG.addColorStop(1,    'rgba(140,0,200,0)');
        ctx.fillStyle = psG;
        if (!_mobPerf) { ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = _gfxLevel < 1 ? 22 : _gfxLevel < 2 ? 12 : 6; }
        ctx.beginPath(); ctx.arc(0, 0, blackHole.size * 1.04, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Accretion disk, FRONT pass (near half, drawn over BH body)
    // HIGH: animated   MED: static 5-layer   LOW: static 2-layer
    if (_gfxLevel < 3) {
        const _t   = now / 1000;
        const _anim = _gfxLevel < 1;
        const _s1  = _anim ? Math.sin(_t * 0.55)         * 0.14 : 0;
        const _s2  = _anim ? Math.sin(_t * 0.82 + 1.4)   * 0.09 : 0;
        const _s3  = _anim ? Math.sin(_t * 1.20 + 2.9)   * 0.07 : 0;
        const _sw  = _anim ? Math.sin(_t * 0.33 + 0.8)   * 0.08 : 0;
        const _diskTilt = _anim ? 0.22 + Math.sin(_t * 0.18) * 0.055 : 0.22;
        const _BH  = blackHole.size;
        const _ry  = _BH * 0.32;
        // front pass slightly brighter (near side)
        const _fLayers = _gfxLevel < 2 ? [
            { rx: _BH * 1.78, lw: 16 + _sw * 35, r:65,  g:0,   b:120, a: 0.20 + _s1 * 0.5 },
            { rx: _BH * 1.52, lw: 10 + _sw * 18, r:140, g:0,   b:210, a: 0.34 + _s2 },
            { rx: _BH * 1.28, lw:  7 + _sw * 12, r:200, g:50,  b:255, a: 0.55 + _s1 },
            { rx: _BH * 1.09, lw:  4 + _sw *  7, r:238, g:130, b:255, a: 0.72 + _s3 },
            { rx: _BH * 0.95, lw:  2.5,           r:255, g:230, b:255, a: 0.90 + _s2 },
        ] : [
            { rx: _BH * 1.55, lw:  9, r:120, g:10,  b:170, a: 0.26 },
            { rx: _BH * 1.08, lw:  3, r:210, g:90,  b:255, a: 0.42 },
        ];
        ctx.save();
        ctx.rotate(_diskTilt);
        ctx.beginPath(); ctx.rect(-_BH * 3, -_BH * 3, _BH * 6, _BH * 3); ctx.clip(); // near half
        for (const d of _fLayers) {
            ctx.strokeStyle = `rgba(${d.r},${d.g},${d.b},${Math.min(0.97, Math.max(0.02, d.a))})`;
            ctx.lineWidth = d.lw;
            if (!_mobPerf) { ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = d.lw * 0.75; }
            ctx.beginPath(); ctx.ellipse(0, 0, d.rx, _ry * (d.rx / (_BH * 1.78)), 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();
}

// Skill F – Annihilation Sweep
