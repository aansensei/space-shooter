// Zodiac Sigil system — 12 sigils, pick 1 at wave 5 and 1 at wave 10

const SIGIL_DEFS = {
    aries: {
        name: 'Aries', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'tien_phong', name: 'Vanguard', type: 'ATK', typeC: '#ef4444',
              desc: '30% chance for player & sentinel bullets to pierce enemies, +20% damage' },
            { id: 'khat_chien', name: 'Blood Frenzy', type: 'ATK', typeC: '#ef4444',
              desc: 'Chain hits +30% dmg; each chain adds 2.5% enemy EP as true damage (max 4 chains)' },
        ]
    },
    taurus: {
        name: 'Taurus', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'thanh_dong', name: 'Iron Fortress', type: 'DEF', typeC: '#3b82f6',
              desc: 'Every 10s gain 1 Iron Body layer (consumed first, max 2 stacks)' },
            { id: 'ho_ve', name: 'Guardian', type: 'DEF', typeC: '#3b82f6',
              desc: 'Sentinel +60% HP & +25% dmg; when sentinel dies, next sentinel spawned within 5s gains a shield worth 20% of predecessor MaxHP (CD 4s)' },
        ]
    },
    gemini: {
        name: 'Gemini', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'bong_doi', name: 'Shadow Twin', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 6th bullet hit spawns a mirror copy from the opposite X side: 30% larger, piercing, +40% damage, green' },
            { id: 'guong_laze', name: 'Mirror Laser', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Overload spawns 2 mirror entities (top-left & bottom-right) moving vertically in opposite directions, each firing a horizontal laser beam with equal damage' },
        ]
    },
    cancer: {
        name: 'Cancer', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'giap_nguyet', name: 'Lunar Aegis', type: 'DEF', typeC: '#3b82f6',
              desc: 'Gaia Protection activates without Glory for Justice; shield absorption +20%' },
            { id: 'trieu_hoi', name: 'Tidal Flow', type: 'HEAL', typeC: '#22c55e',
              desc: 'Sentinel regenerates 10 HP/s; sentinel healing effectiveness +20%' },
        ]
    },
    leo: {
        name: 'Leo', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'su_tu_hong', name: "Lion's Roar", type: 'ATK', typeC: '#ef4444',
              desc: 'While GFJ active, attacks inflict Burn: 200 + 5% EP DoT per 500ms for 3s (resets on new hit, stacks x3). Allied attacks surrounded by fire.' },
            { id: 'than_menh', name: 'Divine Fate', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Wave start: 5s freeze — all enemies stop moving (new spawns also frozen) + all damage +50%' },
        ]
    },
    virgo: {
        name: 'Virgo', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'mui_ten_vang', name: 'Golden Arrow', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 12 bullet hits trigger a Critical Strike: 3x damage, Vulnerability, root + silence 1s' },
            { id: 'ky_su_dien', name: 'Circuit Engineer', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla DoT & Coil +50% dmg; destroying a Coil reduces Skill G CD by 3s and increases G energy gain by 10%' },
        ]
    },
    libra: {
        name: 'Libra', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'phan_don', name: 'Riposte', type: 'SPEC', typeC: '#f59e0b',
              desc: 'On each hit taken, next skill activation deals +120% damage (1 proc per hit)' },
            { id: 'luat_can_bang', name: 'Law of Scales', type: 'ATK', typeC: '#ef4444',
              desc: 'The lower an enemy HP, the more damage it takes: +0% at full HP to +70% at 10% HP' },
        ]
    },
    scorpio: {
        name: 'Scorpio', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'hoan_sinh', name: 'Resurrection', type: 'HEAL', typeC: '#22c55e',
              desc: 'On pick: immediately gain +5 lives. Life bonus rate: +1 life per 250,000 pts (instead of 500,000)' },
            { id: 'tu_huyet', name: 'Death Mark', type: 'ATK', typeC: '#ef4444',
              desc: 'Enemies below 20% HP take +70% damage from all sources. Skill F blade arc pierces Iron Body.' },
        ]
    },
    sagittarius: {
        name: 'Sagittarius', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'song_luoi', name: 'Twin Blades', type: 'ATK', typeC: '#ef4444',
              desc: 'Spirit arc slash fires 2 converging blades (+30% each). Each boomerang thrown has 30% chance to launch an extra one.' },
            { id: 'cuc_han', name: 'Arctic Chill', type: 'ATK', typeC: '#ef4444',
              desc: 'Boomerang and arc slash: 50% chance to slow targets 20% for 2s and lightly pull them toward the player. CC-immune enemies: no pull, still slowed.' },
        ]
    },
    capricorn: {
        name: 'Capricorn', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'lai_kep', name: 'Compound Interest', type: 'HEAL', typeC: '#22c55e',
              desc: 'Each kill grants +0.6% PE; every 5% PE gained increases all ally fire rate by 1.5% (max +30%, preserved through BTM)' },
            { id: 'tuyet_lan', name: 'Avalanche', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Each kill grants +0.5% global damage (resets after 5s without a kill, max +60%)' },
        ]
    },
    aquarius: {
        name: 'Aquarius', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'set_day_chuyen', name: 'Chain Lightning', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla DoT has a 40% chance to chain to the nearest enemy within 150px' },
            { id: 'dien_tu_truong', name: 'Magnetic Field', type: 'DEF', typeC: '#3b82f6',
              desc: 'While Skill G is charging, enemies within 250px are slowed 30% and suffer 0.35% MaxHP DoT/s' },
        ]
    },
    pisces: {
        name: 'Pisces', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'coi_mong', name: 'Dream Realm', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Each Shift activation negates all enemy damage for 2 seconds. Enemies pulled by black hole accumulate damage received; after 1.5s, explode for 30% of the total.' },
            { id: 'dong_chay_luan_hoi', name: 'Cycle of Flow', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Kill apostle: −0.5s all skill CD; kill abnormal/elite: −1s; kill dominator: −1.5s' },
        ]
    },
};

const SIGIL_ORDER = ['aries','taurus','gemini','cancer','leo','virgo',
                     'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

function _hasSigil(id) { return (window._playerSigils || []).some(s => s.sigilId === id); }
function _hasBuff(id)  {
    return (window._playerSigils || []).some(s => {
        const def = SIGIL_DEFS[s.sigilId];
        return def && def.buffs.some(b => b.id === id);
    });
}

function _triggerSigilPicker() {
    const shuffled = [...(window._sigilPool || [])].sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, Math.min(4, shuffled.length));
    window._sigilPicker = {
        phase: 'slide_in',
        startTime: performance.now(),
        options,
        hoveredSigil: null,
        hoveredConfirm: false,
        selectedSigil: null,
        flyParticles: [],
        flyDone: false,
    };
}

function _completeSigilPicker(sigilId) {
    window._playerSigils = window._playerSigils || [];
    window._playerSigils.push({ sigilId });
    window._sigilPool = (window._sigilPool || []).filter(id => id !== sigilId);
    const def = SIGIL_DEFS[sigilId];
    if (def) def.buffs.forEach(b => _onSigilApplied(sigilId, b.id));
    window._sigilPicker = null;
    _wavePhase = 'rest';
    _waveRestTimer = 3000;
    _waveForceEndTimer = 0;
}

function _onSigilApplied(sigilId, buffId) {
    if (buffId === 'tuyet_lan')    { window._tuyetLanStacks = 0; window._tuyetLanLastKill = 0; }
    if (buffId === 'bong_doi')     { window._bongDoiHitCount = 0; }
    if (buffId === 'mui_ten_vang') { window._muiTenVangHitCount = 0; }
    if (buffId === 'lai_kep')      { window._laiKepPEAccum = 0; window._laiKepFireRateBonus = 0; }
    if (buffId === 'thanh_dong')   { window._sigilIronBodyStacks = 0; window._sigilIronBodyNextAt = performance.now() + 10000; }
    if (buffId === 'su_tu_hong')   { window._sthBurning = new Map(); }
    if (buffId === 'ho_ve')        { window._hoVeLastDeadMaxHp = 0; window._hoVeShieldAvailUntil = 0; window._hoVeShieldCooldownEnd = 0; }
    if (buffId === 'hoan_sinh')    { if (typeof lives !== 'undefined') lives += 5; }
}

function drawSigilPicker() {
    const p = window._sigilPicker;
    if (!p) return;
    const now = performance.now();

    if (p.phase === 'slide_in') {
        const t = Math.min(1, (now - p.startTime) / 350);
        const ease = 1 - Math.pow(1 - t, 3);
        if (t >= 1) { p.phase = 'choosing_sigil'; p.startTime = now; }
        _drawPickerCards(p, ease);
        return;
    }

    if (p.phase === 'choosing_sigil') {
        _drawPickerCards(p, 1);
        return;
    }

    if (p.phase === 'fly_in') {
        const elapsed = now - p.flyStart;
        _drawFlyIn(p, elapsed);
        if (elapsed >= 1000) _completeSigilPicker(p.selectedSigil);
        return;
    }
}

function _pickerLayout() {
    const margin = 32;
    const available = canvas.width - margin * 2;
    const cardW = Math.min(210, Math.max(150, (available - 30) / 4));
    const cardH = 310;
    const gapX = (available - cardW * 4) / 3;
    const panelPad = 24;
    const panelW = available + panelPad * 2;
    const panelH = cardH + panelPad * 2 + 50 + 56;
    const panelX = (canvas.width - panelW) / 2;
    const panelY = (canvas.height - panelH) / 2 - 20;
    return { cardW, cardH, gapX, panelPad, panelW, panelH, panelX, panelY };
}

function _drawPickerCards(p, slideEase) {
    const now = performance.now();
    const L = _pickerLayout();
    const { cardW, cardH, gapX, panelPad, panelW, panelH, panelX, panelY } = L;
    const yOff = (1 - slideEase) * -300;
    const hasSelected = p.selectedSigil != null;

    ctx.save();

    ctx.globalAlpha = slideEase * 0.94;
    ctx.fillStyle = 'rgba(0,2,14,0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = slideEase;
    ctx.fillStyle = 'rgba(4,12,34,0.98)';
    _drawRoundRect(panelX, panelY + yOff, panelW, panelH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,140,255,0.65)';
    ctx.lineWidth = 1.5;
    _drawRoundRect(panelX, panelY + yOff, panelW, panelH, 12);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8dcff';
    ctx.font = `bold 13px "Courier New", monospace`;
    const sigilCount = (window._playerSigils || []).length + 1;
    ctx.fillText(`ZODIAC SIGIL  ${sigilCount} / 3  —  CHOOSE YOUR SEAL`, canvas.width / 2, panelY + yOff + 26);

    const startX = panelX + panelPad;
    for (let i = 0; i < p.options.length; i++) {
        const sigilId = p.options[i];
        const def = SIGIL_DEFS[sigilId];
        if (!def) continue;
        const cx = startX + i * (cardW + gapX) + cardW / 2;
        const cy = panelY + yOff + panelPad + 50 + cardH / 2;
        _drawSigilCard(cx, cy, cardW, cardH, sigilId, def, p.hoveredSigil === sigilId, p.selectedSigil === sigilId, now);
    }

    const btn = _sigilConfirmRect(L, yOff);
    ctx.globalAlpha = slideEase;
    ctx.strokeStyle = 'rgba(60,90,160,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 40, btn.y - 12);
    ctx.lineTo(panelX + panelW - 40, btn.y - 12);
    ctx.stroke();

    ctx.globalAlpha = slideEase * (hasSelected ? 1.0 : 0.30);
    const selDef = hasSelected ? SIGIL_DEFS[p.selectedSigil] : null;
    const [br, bg, bb] = selDef ? _hexRgb3(selDef.color) : [80, 120, 255];
    ctx.fillStyle = hasSelected ? `rgba(${br},${bg},${bb},0.22)` : 'rgba(40,50,80,0.22)';
    _drawRoundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.strokeStyle = hasSelected ? `rgba(${br},${bg},${bb},${p.hoveredConfirm ? 1.0 : 0.75})` : 'rgba(60,80,120,0.40)';
    ctx.lineWidth = hasSelected && p.hoveredConfirm ? 2.5 : 1.5;
    _drawRoundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();
    if (hasSelected && p.hoveredConfirm) {
        ctx.fillStyle = `rgba(${br},${bg},${bb},0.08)`;
        _drawRoundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
    }
    ctx.fillStyle = hasSelected ? '#e8f0ff' : '#444860';
    ctx.font = `bold 15px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('CONFIRM', btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
    ctx.letterSpacing = '0px';

    ctx.restore();
}

function _sigilConfirmRect(L, yOff) {
    yOff = yOff || 0;
    L = L || _pickerLayout();
    const w = 200, h = 42;
    return { x: L.panelX + (L.panelW - w) / 2, y: L.panelY + yOff + L.panelH - h - 16, w, h };
}

function _drawSigilCard(cx, cy, w, h, sigilId, def, isHovered, isSelected, now) {
    const x = cx - w / 2, y = cy - h / 2;
    const [r, g, b] = _hexRgb3(def.color);

    ctx.save();

    const bgAlpha = isSelected ? 0.45 : (isHovered ? 0.32 : 0.18);
    ctx.fillStyle = `rgba(${r},${g},${b},${bgAlpha})`;
    _drawRoundRect(x, y, w, h, 8);
    ctx.fill();

    const borderAlpha = isSelected ? 1.0 : (isHovered ? 0.92 : 0.65);
    ctx.strokeStyle = `rgba(${r},${g},${b},${borderAlpha})`;
    ctx.lineWidth = isSelected ? 2.5 : (isHovered ? 1.8 : 1.2);
    _drawRoundRect(x, y, w, h, 8);
    ctx.stroke();

    if (isSelected) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 350);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 + 0.35 * pulse})`;
        ctx.lineWidth = 6;
        _drawRoundRect(x - 3, y - 3, w + 6, h + 6, 11);
        ctx.stroke();
    }

    const symCx = cx, symCy = y + 54, symR = 34;

    ctx.fillStyle = `rgba(${r},${g},${b},${isSelected ? 0.20 : 0.10})`;
    ctx.beginPath(); ctx.arc(symCx, symCy, symR + 4, 0, Math.PI * 2); ctx.fill();

    if (isHovered || isSelected) {
        const glow = 0.5 + 0.5 * Math.sin(now / 400);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 + 0.4 * glow})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(symCx, symCy, symR + 8, 0, Math.PI * 2); ctx.stroke();
    }

    _drawZodiacGlyph(sigilId, symCx, symCy, symR * 0.72, def.color);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0f4ff';
    ctx.font = `bold 13px "Courier New", monospace`;
    ctx.fillText(def.name, cx, y + 116);

    ctx.fillStyle = `rgba(${r},${g},${b},1.0)`;
    ctx.font = `10px "Courier New", monospace`;
    ctx.fillText(def.element, cx, y + 131);

    ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x + 12, y + 141); ctx.lineTo(x + w - 12, y + 141); ctx.stroke();

    _drawMiniBuffRow(cx, y + 160, w - 20, def.buffs[0]);
    _drawMiniBuffRow(cx, y + 228, w - 20, def.buffs[1]);

    ctx.restore();
}

function _drawMiniBuffRow(cx, topY, maxW, buff) {
    ctx.save();
    ctx.fillStyle = buff.typeC + 'aa';
    _drawRoundRect(cx - maxW / 2, topY, 38, 15, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 9px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(buff.type, cx - maxW / 2 + 19, topY + 11);

    ctx.fillStyle = '#e8f0ff';
    ctx.font = `bold 11px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(buff.name, cx - maxW / 2 + 44, topY + 11);

    ctx.fillStyle = 'rgba(180,200,230,1.0)';
    ctx.font = `10px sans-serif`;
    _wrapText(buff.desc, cx - maxW / 2, topY + 24, maxW, 13, 2);
    ctx.restore();
}

function _wrapText(text, x, y, maxW, lineH, maxLines) {
    const words = text.split(' ');
    let line = '', lines = [];
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line); line = word;
            if (lines.length >= maxLines) break;
        } else { line = test; }
    }
    if (lines.length < maxLines && line) lines.push(line);
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
}

function _drawFlyIn(p, elapsed) {
    const def = SIGIL_DEFS[p.selectedSigil];
    if (!def) return;
    const [r, g, b] = _hexRgb3(def.color);
    const progress = Math.min(1, elapsed / 1000);

    ctx.save();

    ctx.globalAlpha = 1 - progress * 0.8;
    ctx.fillStyle = 'rgba(0,2,10,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!p.flyParticles) p.flyParticles = [];
    if (elapsed < 600 && p.flyParticles.length < 80) {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 80;
            p.flyParticles.push({
                x: canvas.width / 2 + Math.cos(angle) * dist,
                y: canvas.height / 2 + Math.sin(angle) * dist,
                targetX: player.x, targetY: player.y,
                speed: 0.8 + Math.random() * 1.2,
                size: 3 + Math.random() * 4,
                alpha: 0.8 + Math.random() * 0.2,
            });
        }
    }

    for (const fp of p.flyParticles) {
        const dx = fp.targetX - fp.x, dy = fp.targetY - fp.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) { fp.x += (dx / dist) * fp.speed * 8; fp.y += (dy / dist) * fp.speed * 8; }
        ctx.globalAlpha = fp.alpha * (1 - progress);
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(fp.x, fp.y, fp.size * (1 - progress * 0.5), 0, Math.PI * 2); ctx.fill();
    }

    const burstA = Math.max(0, 1 - elapsed / 400);
    if (burstA > 0) {
        ctx.globalAlpha = burstA * 0.9;
        const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, 120);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (progress > 0.6) {
        const landA = (progress - 0.6) / 0.4;
        ctx.globalAlpha = landA;
        _drawZodiacGlyph(p.selectedSigil, player.x, player.y, 28 * (1 + landA), def.color);
    }

    ctx.restore();
}

function _drawZodiacGlyph(id, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    switch (id) {
        case 'aries': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r * 0.45);
            ctx.lineTo(cx, cy + r * 0.02);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx - r * 0.42, cy + r * 0.08, r * 0.44, Math.PI * 0.05, Math.PI * 0.85, true);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + r * 0.42, cy + r * 0.08, r * 0.44, Math.PI * 0.15, Math.PI * 0.95, false);
            ctx.stroke();
            break;
        }
        case 'taurus': {
            ctx.beginPath();
            ctx.arc(cx, cy + r * 0.18, r * 0.44, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy - r * 0.24, r * 0.48, Math.PI * 0.08, Math.PI * 0.92, false);
            ctx.stroke();
            break;
        }
        case 'gemini': {
            const lx = cx - r * 0.28, rx = cx + r * 0.28;
            const ty = cy - r * 0.5, by = cy + r * 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.55, ty); ctx.lineTo(cx + r * 0.55, ty);
            ctx.moveTo(cx - r * 0.55, by); ctx.lineTo(cx + r * 0.55, by);
            ctx.moveTo(lx, ty); ctx.lineTo(lx, by);
            ctx.moveTo(rx, ty); ctx.lineTo(rx, by);
            ctx.stroke();
            break;
        }
        case 'cancer': {
            ctx.beginPath();
            ctx.arc(cx + r * 0.18, cy - r * 0.18, r * 0.35, Math.PI * 0.2, Math.PI * 1.9, false);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx - r * 0.18, cy + r * 0.18, r * 0.35, Math.PI * 1.2, Math.PI * 2.9, false);
            ctx.stroke();
            break;
        }
        case 'leo': {
            ctx.beginPath();
            ctx.arc(cx - r * 0.15, cy - r * 0.1, r * 0.38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.23, cy - r * 0.1);
            ctx.bezierCurveTo(cx + r * 0.75, cy - r * 0.08, cx + r * 0.78, cy - r * 0.62, cx + r * 0.38, cy - r * 0.6);
            ctx.stroke();
            break;
        }
        case 'virgo': {
            const bY = cy + r * 0.48, tY = cy - r * 0.48, lX = cx - r * 0.52;
            ctx.beginPath();
            ctx.moveTo(lX, bY);
            ctx.lineTo(lX, tY);
            ctx.arc(lX + r * 0.26, tY, r * 0.26, Math.PI, 0, false);
            ctx.arc(cx + r * 0.26, tY, r * 0.26, Math.PI, 0, false);
            ctx.lineTo(cx + r * 0.52, cy + r * 0.22);
            ctx.bezierCurveTo(cx + r * 0.52, cy + r * 0.55, cx + r * 0.18, cy + r * 0.55, cx + r * 0.18, cy + r * 0.22);
            ctx.stroke();
            break;
        }
        case 'libra': {
            const baseY = cy + r * 0.48, midY = cy + r * 0.1;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.58, baseY); ctx.lineTo(cx + r * 0.58, baseY);
            ctx.moveTo(cx - r * 0.52, midY);  ctx.lineTo(cx + r * 0.52, midY);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, midY, r * 0.42, Math.PI, 0, false);
            ctx.stroke();
            break;
        }
        case 'scorpio': {
            const bY2 = cy + r * 0.38, tY2 = cy - r * 0.48, lX2 = cx - r * 0.52;
            ctx.beginPath();
            ctx.moveTo(lX2, bY2);
            ctx.lineTo(lX2, tY2);
            ctx.arc(lX2 + r * 0.26, tY2, r * 0.26, Math.PI, 0, false);
            ctx.arc(cx + r * 0.26, tY2, r * 0.26, Math.PI, 0, false);
            ctx.lineTo(cx + r * 0.52, cy + r * 0.15);
            ctx.bezierCurveTo(cx + r * 0.52, cy + r * 0.52, cx + r * 0.62, cy + r * 0.52, cx + r * 0.62, cy + r * 0.22);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.62, cy + r * 0.22);
            ctx.lineTo(cx + r * 0.45, cy + r * 0.42);
            ctx.moveTo(cx + r * 0.62, cy + r * 0.22);
            ctx.lineTo(cx + r * 0.78, cy + r * 0.42);
            ctx.stroke();
            break;
        }
        case 'sagittarius': {
            const ax1 = cx - r * 0.52, ay1 = cy + r * 0.52;
            const ax2 = cx + r * 0.52, ay2 = cy - r * 0.52;
            ctx.beginPath();
            ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2);
            ctx.moveTo(ax2, ay2); ctx.lineTo(ax2 - r * 0.35, ay2);
            ctx.moveTo(ax2, ay2); ctx.lineTo(ax2, ay2 + r * 0.35);
            ctx.moveTo(cx - r * 0.28, cy + r * 0.28); ctx.lineTo(cx + r * 0.28, cy - r * 0.28);
            ctx.stroke();
            break;
        }
        case 'capricorn': {
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.45);
            ctx.bezierCurveTo(cx - r * 0.5, cy + r * 0.28, cx, cy + r * 0.38, cx, cy - r * 0.02);
            ctx.bezierCurveTo(cx, cy - r * 0.5, cx + r * 0.52, cy - r * 0.5, cx + r * 0.48, cy - r * 0.04);
            ctx.bezierCurveTo(cx + r * 0.44, cy + r * 0.42, cx - r * 0.05, cy + r * 0.52, cx - r * 0.05, cy + r * 0.2);
            ctx.stroke();
            break;
        }
        case 'aquarius': {
            const wY1 = cy - r * 0.22, wY2 = cy + r * 0.22;
            const wA = r * 0.22, wL = r * 0.55;
            ctx.beginPath();
            ctx.moveTo(cx - wL, wY1);
            ctx.bezierCurveTo(cx - wL * 0.5, wY1 - wA, cx - wL * 0.5, wY1 - wA, cx, wY1);
            ctx.bezierCurveTo(cx + wL * 0.5, wY1 + wA, cx + wL * 0.5, wY1 + wA, cx + wL, wY1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - wL, wY2);
            ctx.bezierCurveTo(cx - wL * 0.5, wY2 - wA, cx - wL * 0.5, wY2 - wA, cx, wY2);
            ctx.bezierCurveTo(cx + wL * 0.5, wY2 + wA, cx + wL * 0.5, wY2 + wA, cx + wL, wY2);
            ctx.stroke();
            break;
        }
        case 'pisces': {
            ctx.beginPath();
            ctx.arc(cx - r * 0.14, cy, r * 0.42, Math.PI * 0.5, Math.PI * 1.5, true);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + r * 0.14, cy, r * 0.42, Math.PI * 0.5, Math.PI * 1.5, false);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.55, cy); ctx.lineTo(cx + r * 0.55, cy);
            ctx.stroke();
            break;
        }
    }

    ctx.restore();
}

function drawSigilHUD() {
    const sigils = window._playerSigils || [];
    const now = performance.now();

    const isMob = typeof _isMobile !== 'undefined' && _isMobile;
    const hW = isMob ? 148 : 192;
    const hH = (isMob ? 158 : 198) + (_yuukiBonus > 0 ? (isMob ? 22 : 26) : 0);

    const R = 20;
    const slotGap = 8;
    const panelW = R * 2 + 16;
    const panelH = 3 * (R * 2) + 2 * slotGap + 20;
    const panelX = canvas.width - panelW - 12;
    const panelY = 10 + hH + 6;

    ctx.save();

    ctx.fillStyle = 'rgba(0,4,14,0.60)';
    _drawRoundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,80,160,0.35)';
    ctx.lineWidth = 1;
    _drawRoundRect(panelX, panelY, panelW, panelH, 8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(100,130,200,0.45)';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIGIL', panelX + panelW / 2, panelY + 9);

    for (let i = 0; i < 3; i++) {
        const cx = panelX + panelW / 2;
        const cy = panelY + 16 + R + i * (R * 2 + slotGap);
        const ps = sigils[i];
        const def = ps ? SIGIL_DEFS[ps.sigilId] : null;
        const pulse = 0.5 + 0.5 * Math.sin(now / 1000 + i * 1.1);

        if (def) {
            const [r, g, b] = _hexRgb3(def.color);

            ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = `rgba(${r},${g},${b},${0.55 + 0.35 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

            ctx.shadowColor = def.color;
            ctx.shadowBlur = 4 + 5 * pulse;
            _drawZodiacGlyph(ps.sigilId, cx, cy, R * 0.58, def.color);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = 'rgba(12,18,40,0.55)';
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = 'rgba(40,60,110,0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = 'rgba(50,70,120,0.30)';
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(['I','II','III'][i], cx, cy + 4);
        }
    }

    ctx.restore();
}

function drawSigilShipUpgrades() {
    const sigils = window._playerSigils || [];
    if (sigils.length === 0) return;
    const now = performance.now();

    ctx.save();
    for (let si = 0; si < sigils.length; si++) {
        const ps = sigils[si];
        const def = SIGIL_DEFS[ps.sigilId];
        if (!def) continue;
        const [r, g, b] = _hexRgb3(def.color);
        const pulse = 0.5 + 0.5 * Math.sin(now / 800 + si * Math.PI);
        const xSide = si === 0 ? -1 : 1;
        const runeX = player.x + xSide * 20;
        const runeY = player.y + 14;

        ctx.globalAlpha = 0.55 + 0.25 * pulse;
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 4 + 4 * pulse;
        _drawZodiacGlyph(ps.sigilId, runeX, runeY, 7, def.color);

        if (def.element === 'Fire') {
            ctx.globalAlpha = 0.22 * pulse;
            ctx.fillStyle = `rgba(${r},${g},${b},1)`;
            ctx.beginPath();
            ctx.arc(player.x + xSide * 6, player.y + 27, 4 + 3 * pulse, 0, Math.PI * 2);
            ctx.fill();
        } else if (def.element === 'Air') {
            ctx.globalAlpha = 0.18 * pulse;
            ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(player.x - 28, player.y + 10);
            ctx.lineTo(player.x + 28, player.y + 10);
            ctx.stroke();
        }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}

function _drawRoundRect(x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

function _hexRgb3(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function _handleSigilPickerClick(ex, ey) {
    const p = window._sigilPicker;
    if (!p) return;

    if (p.phase === 'choosing_sigil') {
        const L = _pickerLayout();
        const { cardW, cardH, gapX, panelPad, panelX, panelY } = L;
        const startX = panelX + panelPad;
        for (let i = 0; i < p.options.length; i++) {
            const cx = startX + i * (cardW + gapX);
            const cy = panelY + panelPad + 50;
            if (ex >= cx && ex <= cx + cardW && ey >= cy && ey <= cy + cardH) {
                p.selectedSigil = p.options[i];
                return;
            }
        }

        if (p.selectedSigil) {
            const btn = _sigilConfirmRect(L, 0);
            if (ex >= btn.x && ex <= btn.x + btn.w && ey >= btn.y && ey <= btn.y + btn.h) {
                p.phase = 'fly_in';
                p.flyStart = performance.now();
                p.flyParticles = [];
            }
        }
    }
}

function _handleSigilPickerMouseMove(ex, ey) {
    const p = window._sigilPicker;
    if (!p) return;

    if (p.phase === 'choosing_sigil') {
        const L = _pickerLayout();
        const { cardW, cardH, gapX, panelPad, panelX, panelY } = L;
        const startX = panelX + panelPad;
        p.hoveredSigil = null;
        p.hoveredConfirm = false;
        for (let i = 0; i < p.options.length; i++) {
            const cx = startX + i * (cardW + gapX);
            const cy = panelY + panelPad + 50;
            if (ex >= cx && ex <= cx + cardW && ey >= cy && ey <= cy + cardH) {
                p.hoveredSigil = p.options[i];
                return;
            }
        }
        if (p.selectedSigil) {
            const btn = _sigilConfirmRect(L, 0);
            p.hoveredConfirm = ex >= btn.x && ex <= btn.x + btn.w && ey >= btn.y && ey <= btn.y + btn.h;
        }
    }
}

function drawSigilShipUpgrades() {
    const now = performance.now();

    // Iron Fortress (thanh_dong): hexagonal armor rings for each active stack
    const ironStacks = window._sigilIronBodyStacks || 0;
    if (_hasBuff('thanh_dong') && ironStacks > 0) {
        for (let s = 0; s < ironStacks; s++) {
            const r = 36 + s * 13;
            const pulse = 0.55 + 0.45 * Math.sin(now / 700 + s * Math.PI);
            ctx.save();
            ctx.strokeStyle = `rgba(59,130,246,${0.80 * pulse})`;
            ctx.lineWidth = 2.5;
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 12; }
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const a = Math.PI / 6 + v * Math.PI / 3;
                const px = player.x + Math.cos(a) * r;
                const py = player.y + Math.sin(a) * r;
                if (v === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('×' + ironStacks, player.x + 26, player.y - 34);
        ctx.restore();
    }

    // Riposte (phan_don): orange ring when buff is ready to proc
    if (_hasBuff('phan_don') && window._phanDonReady) {
        const pulse = 0.65 + 0.35 * Math.sin(now / 180);
        ctx.save();
        ctx.strokeStyle = `rgba(251,146,60,${pulse})`;
        ctx.lineWidth = 2;
        if (!_mobPerf) { ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 16; }
        ctx.beginPath();
        ctx.arc(player.x, player.y, 33, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Dream Realm (coi_mong): cyan shield shimmer when negating damage
    if (_hasBuff('coi_mong') && now < (window._coiMongEndTime || 0)) {
        const fade = Math.min(1, (window._coiMongEndTime - now) / 350);
        const pulse = 0.55 + 0.45 * Math.sin(now / 110);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = `rgba(34,211,238,${0.7 + 0.3 * pulse})`;
        ctx.lineWidth = 3;
        if (!_mobPerf) { ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 22; }
        ctx.beginPath();
        ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    canvas.addEventListener('click', (e) => {
        if (!window._sigilPicker) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        _handleSigilPickerClick((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!window._sigilPicker) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        _handleSigilPickerMouseMove((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    });
});
