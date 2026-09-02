// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Zodiac Sigil engine: the generic picker/HUD/glyph machinery shared by every
// sigil. Per-sigil EN+VI data (name/element/buff text) lives one file per sigil in
// this same folder (js/sigils/<id>.js), each assigning into the SIGIL_DEFS and
// SIGIL_I18N_VI objects declared empty right below - this file must load BEFORE
// any of them (see index.html's script order). Split out of the old monolithic
// js/sigils.js so each sigil's own data lives in its own small file.

const SIGIL_DEFS = {};

const SIGIL_ORDER = ['aries','taurus','gemini','cancer','leo','virgo',
                     'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

// Sigils outside the 12 Western signs' fixed order (Vietnamese Zodiac set,
// currently just Great Sage) - appended into the random pool at run start
// alongside SIGIL_ORDER (see window._sigilPool in main.js) rather than
// interleaved into that fixed sequence.
const SIGIL_EXTRA = ['than'];

// Vietnamese display text for the sigil picker (name/element/buff name/buff
// desc only) — SIGIL_DEFS above stays English and is what all game LOGIC
// reads (ids, _hasBuff/_hasSigil, element comparisons in
// drawSigilShipUpgrades, etc.). Only _drawPickerCards' rendering path below
// swaps to this via _localizedSigil(); every other reader of SIGIL_DEFS is
// untouched, so a 'Fire'/'Air' element check elsewhere never sees a
// Vietnamese string.
const SIGIL_I18N_VI = {};

// Returns a display-only copy of SIGIL_DEFS[sigilId] with name/element/buff
// name+desc swapped to Vietnamese when window._lang === 'vi' — used ONLY by
// the sigil-picker rendering path (_drawPickerCards and what it calls).
// SIGIL_DEFS itself is never mutated, so every other reader (game logic,
// drawSigilHUD, drawSigilShipUpgrades' element === 'Fire' checks, etc.)
// keeps seeing the real English data untouched.
function _localizedSigil(sigilId) {
    const def = SIGIL_DEFS[sigilId];
    if (!def) return def;
    if (window._lang !== 'vi' || !SIGIL_I18N_VI[sigilId]) return def;
    const vi = SIGIL_I18N_VI[sigilId];
    return {
        ...def,
        name: vi.name,
        element: vi.element,
        buffs: def.buffs.map(b => {
            const viBuff = vi.buffs[b.id];
            return viBuff ? { ...b, name: viBuff.name, desc: viBuff.desc } : b;
        }),
    };
}

function _hasSigil(id) { return (window._playerSigils || []).some(s => s.sigilId === id); }

// Libra's whole kit (Blood Arrow, Astral Pierce) rides on Skill A's own
// cooldown - unlike Aries's near-passive proc-off-any-hit kit, Libra only
// ever fires as often as the player can recast Skill A. -2s brings that
// cadence up without touching Blood Arrow's own numbers.
function _skillACooldown() { return skillACooldown - (_hasSigil('libra') ? 2000 : 0); }
function _hasBuff(id)  {
    return (window._playerSigils || []).some(s => {
        const def = SIGIL_DEFS[s.sigilId];
        return def && def.buffs.some(b => b.id === id);
    });
}

function _triggerSigilPicker() {
    const shuffled = _shuffleArray(window._sigilPool || []);
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
    const ov = document.getElementById('sigil-pick-overlay');
    if (ov) ov.style.display = 'block';
    // Mobile skill buttons (#mc) sit in their own DOM layer above the canvas
    // (fixed z-index), independent of when the canvas draws the sigil picker
    // on top of them — pointer-events alone doesn't stop them rendering over
    // the cards. Hiding outright is correct anyway: skills aren't usable
    // before the run has even started.
    const mc = document.getElementById('mc');
    if (mc) { mc.style.pointerEvents = 'none'; mc.style.display = 'none'; }
    if (window.AudioMgr) window.AudioMgr.playSfx('sigil-open');
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
    const ov = document.getElementById('sigil-pick-overlay');
    if (ov) ov.style.display = 'none';
    const mc = document.getElementById('mc');
    if (mc) {
        mc.style.pointerEvents = 'all';
        if (typeof _platform !== 'undefined' && _platform === 'mobile') mc.style.display = 'block';
    }
    // First sigil confirm swaps menu → random in-game BGM. Wave 5/10 re-picks
    // keep whatever in-game track is already playing.
    if (window.AudioMgr) {
        const cur = window.AudioMgr.currentBgmId();
        const curTrack = window.AudioMgr.list().find(t => t.id === cur);
        if (!curTrack || curTrack.menuOnly) window.AudioMgr.playRandomInGameBgm();
    }
}

function _onSigilApplied(sigilId, buffId) {
    if (buffId === 'tuyet_lan')    { window._tuyetLanStacks = 0; window._tuyetLanLastKill = 0; }
    if (buffId === 'bong_doi')     { window._bongDoiHitCount = 0; window._bongDoiCharging = false; window._bongDoiCooldownEnd = 0; }
    if (buffId === 'cong_babylon') { window._gobCooldownEnd = 0; window._gobSequences = []; }
    if (buffId === 'enuma_elish')  { window._eeHitCounter = 0; window._eeSequences = []; }
    if (buffId === 'mui_ten_vang') { window._muiTenVangHitCount = 0; }
    if (buffId === 'lai_kep')      { window._laiKepPEAccum = 0; window._laiKepFireRateBonus = 0; }
    if (buffId === 'doi_hinh_chien') {
        window._yuushaSquad = [];
        window._yuushaBlades = []; window._yuushaProjectiles = []; window._yuushaParticles = [];
        window._yuushaDotZones = []; window._yuushaBurstRays = [];
        window._yuushaFloatingTexts = [];
        window._yuushaReplenishLastCheck = 0; window._yuushaReplenishCooldownEnd = 0;
        if (typeof _spawnYuushaMember === 'function') {
            ['Tank', 'Support', 'Marksman', 'Mage'].forEach(role => _spawnYuushaMember(role));
        }
    }
    if (buffId === 'hiep_luc') { /* synergy — no separate state, keyed off doi_hinh_chien arrays */ }
    if (buffId === 'su_tu_hong')   { window._sthBurning = new Map(); }
    if (buffId === 'hoan_sinh')    { if (typeof lives !== 'undefined') lives = Math.min(15, lives + 5); }
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
    const isMob = typeof _platform !== 'undefined' && _platform === 'mobile';
    if (isMob) {
        const margin = 10;
        const panelPad = 12;
        const gapX = 8, gapY = 8;
        const cols = 2, rows = 2;
        const panelW = canvas.width - margin * 2;
        const cardW = Math.floor((panelW - panelPad * 2 - gapX) / 2);

        // Ideal (tablet-sized) budget. Short landscape phones can't fit this,
        // so scale cardH/detailH down until the panel fits canvas.height —
        // titleH/confirmH/padding stay fixed (already small, and confirmH
        // must stay tappable).
        const titleH = 26, confirmH = 44;
        let cardH = 160, detailH = 76;
        const availH = canvas.height - margin * 2;
        const neededH = rows * cardH + (rows - 1) * gapY + panelPad * 2 + titleH + confirmH + detailH + 6;
        if (neededH > availH) {
            const fixedH = panelPad * 2 + titleH + confirmH + (rows - 1) * gapY + 6;
            const flexAvail = Math.max(150, availH - fixedH);
            const flexNeeded = rows * cardH + detailH;
            const scale = flexAvail / flexNeeded;
            cardH = Math.max(58, Math.floor(cardH * scale));
            detailH = Math.max(0, Math.floor(detailH * scale));
        }

        const panelH = rows * cardH + (rows - 1) * gapY + panelPad * 2 + titleH + confirmH + detailH + 6;
        const panelX = (canvas.width - panelW) / 2;
        const panelY = Math.max(6, (canvas.height - panelH) / 2);
        return { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob, confirmH };
    }
    const margin = 32;
    const available = canvas.width - margin * 2;
    const cardW = Math.min(210, Math.max(150, (available - 30) / 4));
    const cardH = 310;
    const gapX = (available - cardW * 4) / 3;
    const gapY = 0;
    const cols = 4, rows = 1;
    const panelPad = 24;
    const titleH = 50;
    const panelW = available + panelPad * 2;
    const panelH = cardH + panelPad * 2 + titleH + 56 + 100 + 6;
    const panelX = (canvas.width - panelW) / 2;
    const panelY = (canvas.height - panelH) / 2 - 20;
    return { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob: false };
}

function _drawDetailPanel(def, x, y, w, alpha) {
    const [r, g, b] = _hexRgb3(def.color);
    const lineH = 13, pad = 10, badgeW = 38;
    const maxW = w - pad * 2;

    ctx.save();
    ctx.globalAlpha = alpha * 0.97;
    ctx.fillStyle = `rgba(4,10,28,0.95)`;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.65)`;
    ctx.lineWidth = 1.2;

    // Measure height dynamically
    ctx.font = `9px sans-serif`;
    const _measH = (desc) => {
        const words = desc.split(' ');
        let line = '', lines = 0;
        for (const wd of words) {
            const test = line ? line + ' ' + wd : wd;
            if (ctx.measureText(test).width > maxW - badgeW - 8 && line) { lines++; line = wd; } else { line = test; }
        }
        if (line) lines++;
        return lines;
    };
    const b1lines = Math.max(1, _measH(def.buffs[0].desc));
    const b2lines = Math.max(1, _measH(def.buffs[1].desc));
    const rowH1 = 14 + b1lines * lineH;
    const rowH2 = 14 + b2lines * lineH;
    const panH = pad + rowH1 + 6 + rowH2 + pad;

    _drawRoundRect(x, y, w, panH, 6);
    ctx.fill();
    _drawRoundRect(x, y, w, panH, 6);
    ctx.stroke();

    const drawBuff = (buff, ty) => {
        ctx.fillStyle = buff.typeC + 'bb';
        _drawRoundRect(x + pad, ty, badgeW, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 8px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(buff.type, x + pad + badgeW / 2, ty + 10);
        ctx.fillStyle = '#e8f4ff';
        ctx.font = `bold 10px "Courier New", monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(buff.name, x + pad + badgeW + 6, ty + 10);
        ctx.fillStyle = 'rgba(180,210,240,0.95)';
        ctx.font = `9px sans-serif`;
        _wrapText(buff.desc, x + pad, ty + 22, maxW, lineH, 6);
    };

    drawBuff(def.buffs[0], y + pad);
    drawBuff(def.buffs[1], y + pad + rowH1 + 6);
    ctx.restore();
}

function _drawPickerCards(p, slideEase) {
    const now = performance.now();
    const L = _pickerLayout();
    const { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob } = L;
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
    ctx.font = `bold ${isMob ? 11 : 13}px "Courier New", monospace`;
    const sigilCount = (window._playerSigils || []).length + 1;
    const _tt = (typeof window._t === 'function') ? window._t : (k => k);
    const titleLabel = isMob
        ? `${_tt('sigilPicker.title')} ${sigilCount}/3 — ${_tt('sigilPicker.chooseSeal')}`
        : `${_tt('sigilPicker.title')}  ${sigilCount} / 3  —  ${_tt('sigilPicker.chooseSeal')}`;
    ctx.fillText(titleLabel, canvas.width / 2, panelY + yOff + (isMob ? 26 : 26));

    const startX = panelX + panelPad;
    const startY = panelY + yOff + panelPad + titleH;
    for (let i = 0; i < p.options.length; i++) {
        const sigilId = p.options[i];
        const def = _localizedSigil(sigilId);
        if (!def) continue;
        const col = isMob ? i % cols : i;
        const row = isMob ? Math.floor(i / cols) : 0;
        const cx = startX + col * (cardW + gapX) + cardW / 2;
        const cy = startY + row * (cardH + gapY) + cardH / 2;
        _drawSigilCard(cx, cy, cardW, cardH, sigilId, def, p.hoveredSigil === sigilId, p.selectedSigil === sigilId, now, isMob);
    }

    // Detail panel: shown for hovered card (PC) or selected card (mobile)
    const _detailId = isMob ? p.selectedSigil : p.hoveredSigil;
    if (_detailId) {
        const _dd = _localizedSigil(_detailId);
        if (_dd) {
            const cardsBottom = startY + (isMob ? rows : 1) * (cardH + gapY);
            _drawDetailPanel(_dd, panelX + panelPad, cardsBottom + 6, panelW - panelPad * 2, slideEase);
        }
    }

    const btn = _sigilConfirmRect(L, yOff);
    ctx.globalAlpha = slideEase;
    ctx.strokeStyle = 'rgba(60,90,160,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 40, btn.y - 10);
    ctx.lineTo(panelX + panelW - 40, btn.y - 10);
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
    ctx.font = `bold ${isMob ? 13 : 15}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText(_tt('sigilPicker.confirm'), btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
    ctx.letterSpacing = '0px';

    // Reroll button — shared pool of 2 uses across all 3 sigil picks in a game
    const rerollsLeft = window._sigilRerollsLeft || 0;
    const canReroll = rerollsLeft > 0;
    const rbtn = _sigilRerollRect(L, yOff);
    const rPulse = 0.55 + 0.45 * Math.sin(now / 400);
    ctx.globalAlpha = slideEase * (canReroll ? 1.0 : 0.30);
    ctx.fillStyle = canReroll ? `rgba(180,140,60,${p.hoveredReroll ? 0.32 : 0.16})` : 'rgba(40,50,80,0.18)';
    _drawRoundRect(rbtn.x, rbtn.y, rbtn.w, rbtn.h, 8);
    ctx.fill();
    ctx.strokeStyle = canReroll ? `rgba(230,180,80,${p.hoveredReroll ? 1.0 : 0.55 + 0.2 * rPulse})` : 'rgba(60,80,120,0.40)';
    ctx.lineWidth = canReroll && p.hoveredReroll ? 2.5 : 1.5;
    _drawRoundRect(rbtn.x, rbtn.y, rbtn.w, rbtn.h, 8);
    ctx.stroke();
    if (canReroll && p.hoveredReroll) {
        ctx.fillStyle = 'rgba(230,180,80,0.08)';
        _drawRoundRect(rbtn.x, rbtn.y, rbtn.w, rbtn.h, 8);
        ctx.fill();
    }
    ctx.fillStyle = canReroll ? '#ffe9b0' : '#444860';
    ctx.font = `bold ${isMob ? 9 : 12}px "Courier New", monospace`;
    ctx.letterSpacing = isMob ? '0px' : '1px';
    const rLabel = isMob ? `↻ ${rerollsLeft}` : `↻ ${_tt('sigilPicker.reroll')} (${rerollsLeft})`;
    ctx.fillText(rLabel, rbtn.x + rbtn.w / 2, rbtn.y + rbtn.h / 2 + 4);
    ctx.letterSpacing = '0px';

    // Reroll flash: brief white overlay across the cards on a successful reroll
    if (p.rerollFlash) {
        const flashT = (now - p.rerollFlash) / 300;
        if (flashT < 1) {
            const cardsW = cols * cardW + (cols - 1) * gapX;
            const cardsH = rows * cardH + (rows - 1) * gapY;
            ctx.globalAlpha = slideEase * (1 - flashT) * 0.5;
            ctx.fillStyle = '#ffffff';
            _drawRoundRect(startX, startY, cardsW, cardsH, 8);
            ctx.fill();
        } else {
            p.rerollFlash = null;
        }
    }

    ctx.restore();
}

function _sigilConfirmRect(L, yOff) {
    yOff = yOff || 0;
    L = L || _pickerLayout();
    const w = L.isMob ? Math.min(200, L.panelW - 32) : 200;
    const h = 42;
    return { x: L.panelX + (L.panelW - w) / 2, y: L.panelY + yOff + L.panelH - h - 14, w, h };
}

function _sigilRerollRect(L, yOff) {
    yOff = yOff || 0;
    L = L || _pickerLayout();
    const confirmBtn = _sigilConfirmRect(L, yOff);
    const w = L.isMob ? 64 : 130;
    const h = 42;
    const gap = L.isMob ? 6 : 14;
    return { x: confirmBtn.x + confirmBtn.w + gap, y: confirmBtn.y, w, h };
}

function _drawSigilCard(cx, cy, w, h, sigilId, def, isHovered, isSelected, now, compact) {
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

    const symR = compact ? 20 : 34;
    const symCy = compact ? y + 32 : y + 54;
    const symCx = cx;

    ctx.fillStyle = `rgba(${r},${g},${b},${isSelected ? 0.20 : 0.10})`;
    ctx.beginPath(); ctx.arc(symCx, symCy, symR + 4, 0, Math.PI * 2); ctx.fill();

    if (isHovered || isSelected) {
        const glow = 0.5 + 0.5 * Math.sin(now / 400);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 + 0.4 * glow})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(symCx, symCy, symR + (compact ? 6 : 8), 0, Math.PI * 2); ctx.stroke();
    }

    _drawZodiacGlyph(sigilId, symCx, symCy, symR * 0.72, def.color);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0f4ff';
    ctx.font = `bold ${compact ? 11 : 13}px "Courier New", monospace`;
    ctx.fillText(def.name, cx, compact ? y + 62 : y + 116);

    ctx.fillStyle = `rgba(${r},${g},${b},1.0)`;
    ctx.font = `${compact ? 9 : 10}px "Courier New", monospace`;
    ctx.fillText(def.element, cx, compact ? y + 73 : y + 131);

    ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
    ctx.lineWidth = 0.8;
    const divY = compact ? y + 80 : y + 141;
    ctx.beginPath(); ctx.moveTo(x + 12, divY); ctx.lineTo(x + w - 12, divY); ctx.stroke();

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    _drawMiniBuffRow(cx, compact ? y + 90 : y + 160, w - (compact ? 12 : 20), def.buffs[0], compact ? 1 : 2);
    _drawMiniBuffRow(cx, compact ? y + 140 : y + 228, w - (compact ? 12 : 20), def.buffs[1], compact ? 1 : 2);

    ctx.restore();
}

function _drawMiniBuffRow(cx, topY, maxW, buff, maxLines) {
    maxLines = maxLines || 2;
    ctx.save();
    ctx.fillStyle = buff.typeC + 'aa';
    _drawRoundRect(cx - maxW / 2, topY, 38, 15, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 9px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(buff.type, cx - maxW / 2 + 19, topY + 11);

    ctx.fillStyle = '#e8f0ff';
    ctx.font = `bold ${maxLines === 1 ? 10 : 11}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(buff.name, cx - maxW / 2 + 44, topY + 11);

    ctx.fillStyle = 'rgba(180,200,230,1.0)';
    ctx.font = `${maxLines === 1 ? 9 : 10}px sans-serif`;
    _wrapText(buff.desc, cx - maxW / 2, topY + 24, maxW, 12, maxLines);
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

// Zodiac glyph sprites: hand-drawn white line-art icons on transparent PNG,
// one shared set for all 12 signs. Tinted per-element (Fire/Earth/Air/Water)
// via source-atop compositing done on an OFFSCREEN canvas, then that already-
// tinted result is drawn onto the real ctx with a plain drawImage. Tinting
// straight on the real ctx doesn't work: source-atop paints wherever the
// EXISTING canvas content already has alpha > 0, and every real call site
// draws this over an already-opaque badge/panel background, so it painted
// the whole square bounding box solid instead of just the icon's own shape.
// Cached per (sigil, color) since the same pair redraws every frame.
const _zodiacGlyphImgs = {};
const _zodiacTintCache = {};
['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces', 'than'].forEach(id => {
    const img = new Image();
    img.src = 'assets/images/game/zodiac/zodiac_' + id + '.png';
    img.decode().catch(() => {});
    _zodiacGlyphImgs[id] = img;
});

// Thin line-art at the source's native 1024px, downscaled in one shot to
// the ~24-90px the HUD/cards actually draw it at, breaks apart into noisy
// fragments - a single bilinear pass isn't real mipmapping and can't average
// enough source pixels per output pixel at a 40:1+ ratio. Halving the size
// repeatedly (each step a clean 2:1 reduction, well within what one bilinear
// pass handles correctly) approximates a real mipmap chain and keeps the
// lines solid all the way down.
function _downscaleStepwise(img, targetSize) {
    let srcCanvas = img, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    while (w > targetSize * 2) {
        const nw = Math.max(targetSize, Math.round(w / 2)), nh = Math.max(targetSize, Math.round(h / 2));
        const step = document.createElement('canvas');
        step.width = nw; step.height = nh;
        step.getContext('2d').drawImage(srcCanvas, 0, 0, nw, nh);
        srcCanvas = step; w = nw; h = nh;
    }
    return srcCanvas;
}

// Call sites draw this glyph anywhere from ~15px (ship-upgrade icon) to
// ~120px (the sigil-confirm burst over the ship), so one fixed cache
// resolution can't be a clean ~2:1 final step for all of them - stepping
// down to within 2x of THIS call's own actual display size instead keeps
// every size crisp. Bucketed to the nearest 8px so a continuously-animated
// size (the confirm burst) reuses a handful of cache entries instead of
// re-running the stepwise reduction every single frame.
function _getTintedZodiacGlyph(id, color, displaySize) {
    const img = _zodiacGlyphImgs[id];
    if (!img || !img.complete || !img.naturalWidth) return null;
    const bucket = Math.max(8, Math.round(displaySize / 8) * 8);
    const key = id + '|' + color + '|' + bucket;
    const cached = _zodiacTintCache[key];
    if (cached) return cached;
    const small = _downscaleStepwise(img, bucket);
    const off = document.createElement('canvas');
    off.width = small.width; off.height = small.height;
    const octx = off.getContext('2d');
    octx.drawImage(small, 0, 0);
    octx.globalCompositeOperation = 'source-atop';
    octx.fillStyle = color;
    octx.fillRect(0, 0, off.width, off.height);
    _zodiacTintCache[key] = off;
    return off;
}

function _drawZodiacGlyph(id, cx, cy, r, color) {
    const size = r * 2.4; // a bit bigger than the old strokes' footprint - reads clearer at HUD scale
    const tinted = _getTintedZodiacGlyph(id, color, size);
    ctx.save();
    if (tinted) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 9;
        ctx.drawImage(tinted, cx - size / 2, cy - size / 2, size, size);
    } else {
        // Sprite not decoded yet (first instant after page load) - a plain
        // glowing dot so the glyph never goes fully invisible.
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawSigilHUD() {
    const sigils = window._playerSigils || [];
    const now = performance.now();

    const isMob = typeof _platform !== 'undefined' && _platform === 'mobile';

    const R = 20;
    const slotGap = 8;
    const panelW = R * 2 + 16;
    const panelH = 3 * (R * 2) + 2 * slotGap + 20;
    const panelX = canvas.width - panelW - 12;
    // Anchor below the real stats HUD panel (js/render/core.js), which
    // publishes its own actual bottom edge — avoids the two files keeping
    // separate copies of the same height formula that could drift apart.
    const hH = (isMob ? 158 : 198) + (_yuukiBonus > 0 ? (isMob ? 22 : 26) : 0);
    const statsHudBottom = typeof window._statsHudBottom === 'number' ? window._statsHudBottom : (10 + hH);
    const panelY = statsHudBottom + 6;

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
    const now = performance.now();

    if (sigils.length > 0) {
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

    // Yuusha Party (doi_hinh_chien) squad formation
    if (typeof drawYuushaParty === 'function') {
        try { drawYuushaParty(); } catch (err) { console.warn('drawYuushaParty failed:', err); }
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

function _pickerCardHitTest(ex, ey, L) {
    const { cardW, cardH, gapX, gapY, cols, panelPad, panelX, panelY, titleH } = L;
    const startX = panelX + panelPad;
    const startY = panelY + panelPad + titleH;
    for (let i = 0; i < 4; i++) {
        const col = L.isMob ? i % cols : i;
        const row = L.isMob ? Math.floor(i / cols) : 0;
        const cx = startX + col * (cardW + gapX);
        const cy = startY + row * (cardH + gapY);
        if (ex >= cx && ex <= cx + cardW && ey >= cy && ey <= cy + cardH) return i;
    }
    return -1;
}

function _handleSigilPickerClick(ex, ey) {
    const p = window._sigilPicker;
    if (!p || p.phase !== 'choosing_sigil') return;

    const L = _pickerLayout();
    const idx = _pickerCardHitTest(ex, ey, L);
    if (idx >= 0 && idx < p.options.length) {
        p.hoveredSigil = p.options[idx];
        p.selectedSigil = p.options[idx];
        if (window.AudioMgr) window.AudioMgr.playSfx('click');
        return;
    }

    if ((window._sigilRerollsLeft || 0) > 0) {
        const rbtn = _sigilRerollRect(L, 0);
        if (ex >= rbtn.x && ex <= rbtn.x + rbtn.w && ey >= rbtn.y && ey <= rbtn.y + rbtn.h) {
            window._sigilRerollsLeft--;
            p.options = _shuffleArray(window._sigilPool || []).slice(0, Math.min(4, (window._sigilPool || []).length));
            p.selectedSigil = null;
            p.hoveredSigil = null;
            p.rerollFlash = performance.now();
            if (window.AudioMgr) window.AudioMgr.playSfx('sigil-confirm');
            return;
        }
    }

    if (p.selectedSigil) {
        const btn = _sigilConfirmRect(L, 0);
        if (ex >= btn.x && ex <= btn.x + btn.w && ey >= btn.y && ey <= btn.y + btn.h) {
            p.phase = 'fly_in';
            p.flyStart = performance.now();
            p.flyParticles = [];
            if (window.AudioMgr) window.AudioMgr.playSfx('sigil-confirm');
        }
    }
}

function _handleSigilPickerMouseMove(ex, ey) {
    const p = window._sigilPicker;
    if (!p || p.phase !== 'choosing_sigil') return;

    const L = _pickerLayout();
    const prevSigil = p.hoveredSigil;
    const prevConfirm = p.hoveredConfirm;
    const prevReroll = p.hoveredReroll;
    p.hoveredSigil = null;
    p.hoveredConfirm = false;
    p.hoveredReroll = false;
    const idx = _pickerCardHitTest(ex, ey, L);
    if (idx >= 0 && idx < p.options.length) {
        p.hoveredSigil = p.options[idx];
    } else if (p.selectedSigil) {
        const btn = _sigilConfirmRect(L, 0);
        p.hoveredConfirm = ex >= btn.x && ex <= btn.x + btn.w && ey >= btn.y && ey <= btn.y + btn.h;
    }
    if (!p.hoveredSigil && !p.hoveredConfirm && (window._sigilRerollsLeft || 0) > 0) {
        const rbtn = _sigilRerollRect(L, 0);
        p.hoveredReroll = ex >= rbtn.x && ex <= rbtn.x + rbtn.w && ey >= rbtn.y && ey <= rbtn.y + rbtn.h;
    }
    // Fire hover sfx only when the hovered target changes (card→different
    // card, none→card, none→confirm, etc.). Prevents per-mousemove spam.
    const sigilChanged   = p.hoveredSigil   && p.hoveredSigil   !== prevSigil;
    const confirmEntered = p.hoveredConfirm && !prevConfirm;
    const rerollEntered  = p.hoveredReroll  && !prevReroll;
    if ((sigilChanged || confirmEntered || rerollEntered) && window.AudioMgr) {
        window.AudioMgr.playSfx('hover');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    function _canvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return [
            (clientX - rect.left) * (canvas.width / rect.width),
            (clientY - rect.top)  * (canvas.height / rect.height),
        ];
    }

    canvas.addEventListener('click', (e) => {
        if (!window._sigilPicker) return;
        const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
        _handleSigilPickerClick(ex, ey);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!window._sigilPicker) return;
        const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
        _handleSigilPickerMouseMove(ex, ey);
    });

    const ov = document.getElementById('sigil-pick-overlay');
    if (ov) {
        ov.addEventListener('click', (e) => {
            if (!window._sigilPicker) return;
            const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
            _handleSigilPickerClick(ex, ey);
        });

        ov.addEventListener('mousemove', (e) => {
            if (!window._sigilPicker) return;
            const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
            _handleSigilPickerMouseMove(ex, ey);
        });

        ov.addEventListener('touchend', (e) => {
            if (!window._sigilPicker) return;
            e.preventDefault();
            const t = e.changedTouches[0];
            const [ex, ey] = _canvasCoords(t.clientX, t.clientY);
            _handleSigilPickerClick(ex, ey);
            try { navigator.vibrate && navigator.vibrate(18); } catch (_) {}
        }, { passive: false });

        ov.addEventListener('touchmove', (e) => {
            if (!window._sigilPicker) return;
            e.preventDefault();
            const t = e.touches[0];
            const [ex, ey] = _canvasCoords(t.clientX, t.clientY);
            _handleSigilPickerMouseMove(ex, ey);
        }, { passive: false });

        ov.addEventListener('touchstart', (e) => {
            if (!window._sigilPicker) return;
            e.preventDefault();
        }, { passive: false });
    }
});
