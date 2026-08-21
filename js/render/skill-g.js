// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/skill-g.js — extracted from render.js (Tesla Matrix barrier, energy
// orb, tesla coil). drawTeslaCoil calls drawPolygon() from fx.js.

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
    }

    // interior tint
    ctx.fillStyle = `rgba(0,40,70,${skillGBorderOpacity * 0.18})`;
    ctx.fillRect(0, 0, canvas.width, boundaryY);

    // animated grid inside barrier (cheap – low alpha)
    ctx.strokeStyle = `rgba(0,200,255,${skillGBorderOpacity * 0.07})`;
    ctx.lineWidth = 1;
    const gSize = 60;
    const offset = (now / 40) % gSize;
    for (let x = -gSize + offset; x < canvas.width; x += gSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, boundaryY); ctx.stroke();
    }
    for (let y = offset; y < boundaryY; y += gSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // outer glow frame
    ctx.strokeStyle = `rgba(0,180,255,${skillGBorderOpacity * 0.7})`;
    if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 35;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, boundaryY - 5);

    // inner thin highlight line
    ctx.strokeStyle = `rgba(150,255,255,${skillGBorderOpacity * 0.5})`;
    ctx.lineWidth = 2;
    if (!_mobPerf) ctx.shadowBlur = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, boundaryY - 10);

    // Pulse rings from player (HIGH only)
    if (_gfxLevel < 1 && skillGActive && typeof player !== 'undefined') {
        const phasePeriod = 1200;
        const phase = (now % phasePeriod) / phasePeriod; // 0→1 per cycle
        const maxR = Math.min(canvas.width, canvas.height) * 0.40;
        const pR = phase * maxR;
        const pAlpha = (1 - phase) * skillGBorderOpacity * 0.55;
        if (pAlpha > 0.01) {
            ctx.strokeStyle = `rgba(0,220,255,${pAlpha})`;
            ctx.lineWidth = 2;
            if (!_mobPerf) { ctx.shadowColor = 'cyan'; ctx.shadowBlur = 14; }
            ctx.beginPath(); ctx.arc(player.x, player.y, pR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    ctx.restore();
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

    // outer halo
    ctx.fillStyle = 'rgba(0,180,255,0.12)';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 2, 0, Math.PI * 2); ctx.fill();

    // Stronger corona (HIGH + MED)
    if (_gfxLevel < 2) {
        const cPulse = 0.6 + 0.4 * Math.sin(now / 180 + (orb.id || 0) * 1.7);
        const cg = ctx.createRadialGradient(orb.x, orb.y, radius * 1.0, orb.x, orb.y, radius * 2.8);
        cg.addColorStop(0, `rgba(0,200,255,${0.20 * cPulse})`);
        cg.addColorStop(1, 'rgba(0,80,180,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(120,230,255,${0.45 * cPulse})`;
        ctx.lineWidth = 1.5;
        if (!_mobPerf) { ctx.shadowColor = 'cyan'; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 1.6, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // main gradient
    const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.45, '#44ddff');
    grad.addColorStop(0.8, '#0066cc');
    grad.addColorStop(1, 'rgba(0,40,120,0.4)');
    ctx.fillStyle = grad;
    if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2); ctx.fill();

    // inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(orb.x - radius * 0.25, orb.y - radius * 0.25, radius * 0.28, radius * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner detail (HIGH only)
    if (_gfxLevel < 1) {
        const t = now / 1000;
        const orbId = orb.id || 0;

        // rotating inner ring of 6 energy motes
        ctx.shadowColor = '#aaffff'; ctx.shadowBlur = 8;
        for (let i = 0; i < 6; i++) {
            const ma = t * 1.8 + (i / 6) * Math.PI * 2 + orbId;
            const mr = radius * 0.58;
            const mx = orb.x + Math.cos(ma) * mr;
            const my = orb.y + Math.sin(ma) * mr;
            const mA = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.1 + i));
            ctx.fillStyle = `rgba(200,255,255,${mA})`;
            ctx.beginPath(); ctx.arc(mx, my, radius * 0.10, 0, Math.PI * 2); ctx.fill();
        }

        // 3 surface arc segments (counter-rotating)
        ctx.shadowColor = 'white'; ctx.shadowBlur = 6;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const aa = -t * 2.5 + (i / 3) * Math.PI * 2;
            const arcA = 0.4 + 0.45 * Math.abs(Math.sin(t + i * 1.4));
            ctx.strokeStyle = `rgba(255,255,255,${arcA})`;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, radius * 0.82, aa, aa + Math.PI * 0.38);
            ctx.stroke();
        }

        // pulsing inner core ring
        const corePulse = 0.5 + 0.5 * Math.sin(t * 3.2 + orbId);
        ctx.strokeStyle = `rgba(180,240,255,${0.55 * corePulse})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, radius * 0.36, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // energy link beam
    if (!orb.isMerging && orb.linkedTo && orb.id < orb.linkedTo.orb.id) {
        const orb2 = orb.linkedTo.orb;
        if (!orb2) { ctx.restore(); return; }

        // outer glow beam
        ctx.strokeStyle = 'rgba(0,200,255,0.25)';
        ctx.lineWidth = orb.size * 2;
        if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // main beam
        ctx.strokeStyle = 'rgba(0,255,255,0.75)';
        ctx.lineWidth = orb.size;
        if (!_mobPerf) ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // bright core
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        if (!_mobPerf) ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(orb.x, orb.y); ctx.lineTo(orb2.x, orb2.y); ctx.stroke();

        // animated energy packet
        const t = (now / 1200) % 1;
        const ex = orb.x + (orb2.x - orb.x) * t;
        const ey = orb.y + (orb2.y - orb.y) * t;
        ctx.fillStyle = 'white'; if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// Tesla Coil (Skill G)
function drawTeslaCoil(coil) {
    const now = performance.now();
    ctx.save();

    // aura zone
    const rotation = now / 5000;
    drawPolygon(coil.x, coil.y, coil.auraRadius, 8, rotation, 'rgba(0,200,255,0.07)', 'rgba(0,80,120,0.03)');

    // aura rim
    ctx.strokeStyle = 'rgba(0,200,255,0.15)';
    ctx.lineWidth = 2; ctx.setLineDash([10, 20]);
    ctx.beginPath(); ctx.arc(coil.x, coil.y, coil.auraRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    const br = coil.size / 2;

    // outer glow ring
    ctx.fillStyle = 'rgba(0,200,255,0.15)';
    if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(coil.x, coil.y, br * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // outer casing ring – counter-rotating gear teeth
    ctx.save();
    ctx.translate(coil.x, coil.y);
    ctx.rotate(-now / 4000);
    ctx.strokeStyle = 'rgba(0,180,200,0.7)'; ctx.lineWidth = 2;
    const teeth = 10;
    for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const inner = br * 1.05, outer = br * 1.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.stroke();
    }
    // gear arc segments
    ctx.strokeStyle = 'rgba(0,220,255,0.4)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const nextA = ((i + 0.5) / teeth) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, br * 1.18, a, nextA); ctx.stroke();
    }
    ctx.restore();

    // main body
    const bodyGrad = ctx.createRadialGradient(coil.x, coil.y, 0, coil.x, coil.y, br);
    bodyGrad.addColorStop(0, 'white');
    bodyGrad.addColorStop(0.4, '#00FFFF');
    bodyGrad.addColorStop(0.8, '#0088AA');
    bodyGrad.addColorStop(1, '#004455');
    ctx.fillStyle = bodyGrad;
    if (!_mobPerf) ctx.shadowColor = 'cyan'; if (!_mobPerf) ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(coil.x, coil.y, br, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // inner energy core
    const coreR = br * 0.45;
    const cg = ctx.createRadialGradient(coil.x, coil.y, 0, coil.x, coil.y, coreR);
    cg.addColorStop(0, 'white');
    cg.addColorStop(0.5, 'cyan');
    cg.addColorStop(1, 'rgba(0,200,255,0.2)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(coil.x, coil.y, coreR, 0, Math.PI * 2); ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(coil.x - br * 0.2, coil.y - br * 0.2, br * 0.26, br * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // random discharge sparks (probabilistic – cheap)
    if (Math.random() < 0.35) {
        ctx.strokeStyle = `rgba(200,255,255,${0.5 + Math.random() * 0.5})`;
        ctx.lineWidth = 1.5 + Math.random();
        if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 8;
        const sa = Math.random() * Math.PI * 2;
        const sd = br + Math.random() * 28;
        ctx.beginPath();
        ctx.moveTo(coil.x, coil.y);
        const mx = coil.x + Math.cos(sa) * sd * 0.5 + (Math.random() - 0.5) * 10;
        const my = coil.y + Math.sin(sa) * sd * 0.5 + (Math.random() - 0.5) * 10;
        ctx.lineTo(mx, my);
        ctx.lineTo(coil.x + Math.cos(sa) * sd, coil.y + Math.sin(sa) * sd);
        ctx.stroke();
        ctx.shadowBlur = 0;
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

// Skill buttons (UI – unchanged logic, minor glow)
