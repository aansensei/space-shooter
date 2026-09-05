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
        phase: 'deal',
        startTime: performance.now(),
        options,
        hoveredSigil: null,
        hoveredConfirm: false,
        selectedSigil: null,
        mobileIndex: 0,
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

// Deck-deal intro: cards leave a single face-down stack at the panel's
// center one at a time (staggered by DEAL_STAGGER), fly to their slot over
// DEAL_FLY_DUR, then flip face-up over DEAL_FLIP_DUR - see _dealCardState().
const DEAL_STAGGER = 110, DEAL_FLY_DUR = 260, DEAL_FLIP_DUR = 220;

function drawSigilPicker() {
    const p = window._sigilPicker;
    if (!p) return;
    const now = performance.now();

    if (p.phase === 'deal') {
        const elapsed = now - p.startTime;
        const totalDur = Math.max(0, p.options.length - 1) * DEAL_STAGGER + DEAL_FLY_DUR + DEAL_FLIP_DUR + 80;
        const panelEase = Math.min(1, elapsed / 250);
        if (elapsed >= totalDur) {
            p.phase = 'choosing_sigil'; p.startTime = now;
            const isMob = typeof _platform !== 'undefined' && _platform === 'mobile';
            if (isMob) p.selectedSigil = p.options[p.mobileIndex] || null;
        }
        _drawPickerCards(p, panelEase, elapsed);
        return;
    }

    if (p.phase === 'choosing_sigil') {
        _drawPickerCards(p, 1, null);
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
        // One big card at a time (swipe/arrows to browse) instead of a
        // cramped 2x2 grid - the card is wide enough that both buffs wrap
        // to full, un-truncated text instead of the old 1-line cutoff.
        const margin = 10;
        const panelPad = 14;
        const cols = 1, rows = 1, gapX = 0, gapY = 0;
        const panelW = canvas.width - margin * 2;
        const cardW = panelW - panelPad * 2;

        const titleH = 42, confirmH = 44, navH = 20; // titleH reserves room for a swipe-hint line under the title; navH is just the dot row
        const availH = canvas.height - margin * 2;
        const fixedH = panelPad * 2 + titleH + navH + confirmH + 10;
        const cardH = Math.max(190, Math.min(360, availH - fixedH));

        const panelH = cardH + fixedH;
        const panelX = (canvas.width - panelW) / 2;
        const panelY = Math.max(6, (canvas.height - panelH) / 2);
        return { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob, confirmH, navH };
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

// Per-card deal progress: flies from the deck position to its slot over
// DEAL_FLY_DUR (face-down the whole flight), then flips face-up in place
// over DEAL_FLIP_DUR. Returns null before this card's own turn starts.
function _dealCardState(index, dealElapsed) {
    if (dealElapsed == null) return { t: 1, scaleX: 1, showFront: true, flyT: 1, sinceLand: 9999 };
    const cardStart = index * DEAL_STAGGER;
    if (dealElapsed < cardStart) return null;
    const flyT = Math.min(1, (dealElapsed - cardStart) / DEAL_FLY_DUR);
    const flyEase = 1 - Math.pow(1 - flyT, 3);
    if (flyT < 1) return { t: flyEase, scaleX: 1, showFront: false, flyT, sinceLand: -1 };
    const sinceLand = dealElapsed - cardStart - DEAL_FLY_DUR;
    const flipT = Math.min(1, sinceLand / DEAL_FLIP_DUR);
    const angle = flipT * Math.PI;
    const showFront = flipT >= 0.5;
    // cos(angle) alone would carry the front half through negative scaleX
    // (0 -> -1), mirroring the card's own text/icon for that whole half -
    // the ~0.5s "sigil hiện ngược" bug. Negating it for the front half
    // instead re-grows it from edge-on (0) back up to a normal +1, so the
    // settled card is never mirrored.
    const scaleX = showFront ? -Math.cos(angle) : Math.cos(angle);
    return { t: 1, scaleX, showFront, flyT: 1, sinceLand };
}

function _drawCardBack(cx, cy, w, h, scaleX) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, 1);
    const x = -w / 2, y = -h / 2;
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#0c1230'); bg.addColorStop(1, '#050814');
    ctx.fillStyle = bg;
    _drawRoundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,255,0.55)'; ctx.lineWidth = 1.5;
    _drawRoundRect(x, y, w, h, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,180,120,0.35)'; ctx.lineWidth = 1;
    _drawRoundRect(x + 6, y + 6, w - 12, h - 12, 6); ctx.stroke();
    const R = Math.min(w, h) * 0.28;
    ctx.strokeStyle = 'rgba(150,180,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6);
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.stroke();
    }
    ctx.restore();
}

function _drawDeckStack(cx, cy, w, h) {
    for (let i = 2; i >= 0; i--) {
        _drawCardBack(cx + i * 2, cy + i * 2, w, h, 1);
    }
}

function _mobileNavRects(L, yOff) {
    yOff = yOff || 0;
    const cardX = L.panelX + L.panelPad;
    const cardY = L.panelY + yOff + L.panelPad + L.titleH;
    const cy = cardY + L.cardH / 2;
    return {
        cardCx: cardX + L.cardW / 2, cardCy: cy,
        dotsY: cardY + L.cardH + L.navH / 2,
    };
}

// The bottom row, unchanged position from before any of this - CONFIRM
// stays put, a nav arrow sits just outside each side of it, and reroll
// trails a bit further past the right arrow. Not a new row, not moved.
// Hand-drawn chevron (not a font glyph, which read as an unclear "<>" to
// testers) that breathes with a glow ring and nudges toward its own
// direction, so the buttons themselves draw the eye instead of leaning on
// a text hint alone.
function _drawMobileArrow(btn, enabled, dir, slideEase, now) {
    const arrowPulse = 0.5 + 0.5 * Math.sin(now / 450);
    const arrowNudge = Math.sin(now / 380) * 3;
    ctx.save();
    ctx.globalAlpha = slideEase * (enabled ? 1 : 0.25);

    if (enabled) {
        ctx.strokeStyle = `rgba(140,190,255,${0.25 + arrowPulse * 0.35})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r + 3 + arrowPulse * 2, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(10,16,40,0.85)';
    ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = enabled ? `rgba(150,195,255,${0.7 + arrowPulse * 0.3})` : 'rgba(120,160,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2); ctx.stroke();

    const ax = btn.x + (enabled ? dir * arrowNudge : 0);
    const chevW = 6, chevH = 8;
    ctx.strokeStyle = '#eaf2ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - dir * chevW * 0.5, btn.y - chevH);
    ctx.lineTo(ax + dir * chevW * 0.5, btn.y);
    ctx.lineTo(ax - dir * chevW * 0.5, btn.y + chevH);
    ctx.stroke();
    ctx.restore();
}

function _mobileBottomRowRects(L, yOff) {
    yOff = yOff || 0;
    const h = 42;
    const y = L.panelY + yOff + L.panelH - h - 14;
    const arrowR = 15, gap = 10;
    const rerollW = 74, rerollH = 32;
    const confirmW = Math.max(110, Math.min(160, L.panelW - 32 - (arrowR * 2 + gap) * 2 - rerollW - gap));
    // CONFIRM's own center is pinned to the panel's true center - reroll
    // trailing off to one side would otherwise pull a "center the whole
    // group" layout off-center, and CONFIRM staying dead-center matters
    // more than the group looking symmetric.
    const centerX = L.panelX + L.panelW / 2;
    const confirm = { x: centerX - confirmW / 2, y, w: confirmW, h };
    const leftArrow = { x: confirm.x - gap - arrowR, y: y + h / 2, r: arrowR };
    const rightArrow = { x: confirm.x + confirmW + gap + arrowR, y: y + h / 2, r: arrowR };
    const reroll = { x: rightArrow.x + arrowR + gap, y: y + (h - rerollH) / 2, w: rerollW, h: rerollH };
    return { leftArrow, confirm, rightArrow, reroll };
}

function _drawPickerCards(p, slideEase, dealElapsed) {
    const now = performance.now();
    const L = _pickerLayout();
    const { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob } = L;
    const yOff = (1 - slideEase) * -300;
    const hasSelected = p.selectedSigil != null;
    const dealing = dealElapsed != null;

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

    if (isMob) {
        // Swipe hint: without this, players tended to burn both rerolls
        // thinking each swipe only shows a single fixed sigil rather than
        // browsing the same 4 - the arrows alone weren't noticeable enough.
        const hintPulse = 0.6 + 0.4 * Math.sin(now / 500);
        ctx.fillStyle = `rgba(170,205,255,${hintPulse})`;
        ctx.font = `bold 12px "Courier New", monospace`;
        ctx.fillText(_tt('sigilPicker.swipeHint'), canvas.width / 2, panelY + yOff + 41);
    }

    const startX = panelX + panelPad;
    const startY = panelY + yOff + panelPad + titleH;

    if (isMob) {
        // Single big card, swiped/arrowed through instead of a 2x2 grid -
        // full un-truncated buff text since there's no longer a cramped
        // per-card space budget to fit into.
        const nav = _mobileNavRects(L, yOff);
        const cx = nav.cardCx, cy = nav.cardCy;
        const deckY = cy + cardH * 0.7 + 30;

        if (dealing) {
            const st = _dealCardState(0, dealElapsed);
            _drawDeckStack(cx, deckY, cardW * 0.8, cardH * 0.8);
            if (st) {
                const dx = cx, dy = cy + (1 - st.t) * (deckY - cy);
                if (!st.showFront) {
                    _drawCardBack(dx, dy, cardW, cardH, st.scaleX);
                } else {
                    const sigilId = p.options[0];
                    const def = _localizedSigil(sigilId);
                    if (def) {
                        ctx.save();
                        ctx.translate(dx, dy); ctx.scale(st.scaleX, 1); ctx.translate(-dx, -dy);
                        _drawSigilCardMobile(dx, dy, cardW, cardH, sigilId, def, now);
                        ctx.restore();
                    }
                }
            }
        } else {
            const transElapsed = p.mobileTransStart ? now - p.mobileTransStart : MOBILE_SLIDE_DUR;
            if (transElapsed < MOBILE_SLIDE_DUR && p.mobileTransFrom != null) {
                const t = transElapsed / MOBILE_SLIDE_DUR;
                const eased = 1 - Math.pow(1 - t, 3);
                const dir = p.mobileTransDir;
                const span = cardW + 24;

                // Clip to the panel so the sliding cards never spill past
                // its rounded border mid-transition
                ctx.save();
                _drawRoundRect(panelX, panelY + yOff, panelW, panelH, 12);
                ctx.clip();

                const outId = p.options[p.mobileTransFrom];
                const outDef = _localizedSigil(outId);
                if (outDef) _drawSigilCardMobile(cx - dir * eased * span, cy, cardW, cardH, outId, outDef, now);

                const inId = p.options[p.mobileIndex];
                const inDef = _localizedSigil(inId);
                if (inDef) _drawSigilCardMobile(cx + dir * (1 - eased) * span, cy, cardW, cardH, inId, inDef, now);

                ctx.restore();
            } else {
                const sigilId = p.options[p.mobileIndex] || p.options[0];
                const def = _localizedSigil(sigilId);
                if (def) _drawSigilCardMobile(cx, cy, cardW, cardH, sigilId, def, now);
            }

            // Dot indicator
            const dotGap = 14, dotR = 4;
            const dotsW = (p.options.length - 1) * dotGap;
            const dotsStartX = canvas.width / 2 - dotsW / 2;
            for (let i = 0; i < p.options.length; i++) {
                const dx = dotsStartX + i * dotGap;
                const active = i === p.mobileIndex;
                ctx.fillStyle = active ? 'rgba(140,180,255,0.95)' : 'rgba(120,140,190,0.35)';
                ctx.beginPath(); ctx.arc(dx, nav.dotsY, active ? dotR + 1 : dotR, 0, Math.PI * 2); ctx.fill();
            }
        }
    } else {
        const deckCx = panelX + panelW / 2, deckCy = startY + rows * (cardH + gapY) / 2;

        if (dealing) {
            // Ambient glow behind the deck, brightest while cards are still
            // actively departing, so the source of the deal reads clearly
            const totalDur = Math.max(0, p.options.length - 1) * DEAL_STAGGER + DEAL_FLY_DUR + DEAL_FLIP_DUR;
            const deckFade = Math.max(0, 1 - dealElapsed / totalDur);
            ctx.save();
            const haloR = cardH * 0.55;
            const halo = ctx.createRadialGradient(deckCx, deckCy, 0, deckCx, deckCy, haloR);
            halo.addColorStop(0, `rgba(120,160,255,${0.35 * deckFade})`);
            halo.addColorStop(1, 'rgba(120,160,255,0)');
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(deckCx, deckCy, haloR, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            _drawDeckStack(deckCx, deckCy, cardW * 0.7, cardH * 0.7);
        }

        for (let i = 0; i < p.options.length; i++) {
            const sigilId = p.options[i];
            const def = _localizedSigil(sigilId);
            if (!def) continue;
            const [r, g, b] = _hexRgb3(def.color);
            const col = i, row = 0;
            const cx = startX + col * (cardW + gapX) + cardW / 2;
            const cy = startY + row * (cardH + gapY) + cardH / 2;

            if (dealing) {
                const st = _dealCardState(i, dealElapsed);
                if (!st) continue;
                const dx = deckCx + (cx - deckCx) * st.t, dy = deckCy + (cy - deckCy) * st.t;

                // Launch ring, right as this card departs the deck
                if (st.flyT < 0.4) {
                    const ringP = st.flyT / 0.4;
                    ctx.save();
                    ctx.globalAlpha = 1 - ringP;
                    ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(deckCx, deckCy, 8 + ringP * 46, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                }

                if (!st.showFront) {
                    _drawCardBack(dx, dy, cardW, cardH, st.scaleX);
                } else {
                    ctx.save();
                    ctx.translate(dx, dy); ctx.scale(st.scaleX, 1); ctx.translate(-dx, -dy);
                    _drawSigilCard(dx, dy, cardW, cardH, sigilId, def, false, false, now, isMob);
                    ctx.restore();

                    // Bright edge-on flash right at the midpoint of the flip
                    if (Math.abs(st.scaleX) < 0.15) {
                        ctx.save();
                        ctx.globalAlpha = 1 - Math.abs(st.scaleX) / 0.15;
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 3;
                        if (!_mobPerf) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12; }
                        ctx.beginPath(); ctx.moveTo(dx, dy - cardH / 2); ctx.lineTo(dx, dy + cardH / 2); ctx.stroke();
                        ctx.shadowBlur = 0;
                        ctx.restore();
                    }

                    // Landing sparkle burst, fading over the first 220ms after settling
                    if (st.sinceLand >= 0 && st.sinceLand < 220) {
                        const burstP = st.sinceLand / 220;
                        ctx.save();
                        ctx.fillStyle = `rgba(${r},${g},${b},${1 - burstP})`;
                        for (let sp = 0; sp < 8; sp++) {
                            const sa = (sp / 8) * Math.PI * 2 + i * 0.7;
                            const sd = burstP * 42;
                            ctx.beginPath();
                            ctx.arc(dx + Math.cos(sa) * sd, dy + Math.sin(sa) * sd, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                }
            } else {
                _drawSigilCard(cx, cy, cardW, cardH, sigilId, def, p.hoveredSigil === sigilId, p.selectedSigil === sigilId, now, isMob);
            }
        }

        // Detail panel: shown for the hovered card (desktop only)
        if (p.hoveredSigil) {
            const _dd = _localizedSigil(p.hoveredSigil);
            if (_dd) {
                const cardsBottom = startY + (cardH + gapY);
                _drawDetailPanel(_dd, panelX + panelPad, cardsBottom + 6, panelW - panelPad * 2, slideEase);
            }
        }
    }

    if (isMob) {
        const bottomRow = _mobileBottomRowRects(L, yOff);
        const canPrev = p.mobileIndex > 0, canNext = p.mobileIndex < p.options.length - 1;
        _drawMobileArrow(bottomRow.leftArrow, canPrev, -1, slideEase, now);
        _drawMobileArrow(bottomRow.rightArrow, canNext, 1, slideEase, now);
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
    ctx.font = `bold ${isMob ? 10 : 12}px "Courier New", monospace`;
    ctx.letterSpacing = isMob ? '0px' : '1px';
    const rLabel = isMob ? `↻ ${_tt('sigilPicker.reroll')} ${rerollsLeft}` : `↻ ${_tt('sigilPicker.reroll')} (${rerollsLeft})`;
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
    if (L.isMob) return _mobileBottomRowRects(L, yOff).confirm;
    const w = 200;
    const h = 42;
    return { x: L.panelX + (L.panelW - w) / 2, y: L.panelY + yOff + L.panelH - h - 14, w, h };
}

function _sigilRerollRect(L, yOff) {
    yOff = yOff || 0;
    L = L || _pickerLayout();
    if (L.isMob) return _mobileBottomRowRects(L, yOff).reroll;
    const confirmBtn = _sigilConfirmRect(L, yOff);
    const w = 130;
    const h = 42;
    const gap = 14;
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

// Full-size mobile card: same identity block as _drawSigilCard but with
// generous room, so both buff descriptions get real word-wrap instead of
// the old 1-line hard cutoff. maxLines is computed from actual row height,
// not a fixed guess, so it adapts to whatever cardH _pickerLayout() picked.
function _drawSigilCardMobile(cx, cy, w, h, sigilId, def, now) {
    const x = cx - w / 2, y = cy - h / 2;
    const [r, g, b] = _hexRgb3(def.color);

    ctx.save();

    ctx.fillStyle = `rgba(${r},${g},${b},0.20)`;
    _drawRoundRect(x, y, w, h, 10);
    ctx.fill();

    const pulse = 0.5 + 0.5 * Math.sin(now / 500);
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.75 + 0.25 * pulse})`;
    ctx.lineWidth = 2;
    _drawRoundRect(x, y, w, h, 10);
    ctx.stroke();

    const symR = 28;
    const symCx = cx, symCy = y + 40;
    ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
    ctx.beginPath(); ctx.arc(symCx, symCy, symR + 5, 0, Math.PI * 2); ctx.fill();
    _drawZodiacGlyph(sigilId, symCx, symCy, symR * 0.72, def.color);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0f4ff';
    ctx.font = `bold 17px "Courier New", monospace`;
    ctx.fillText(def.name, cx, y + 84);

    ctx.fillStyle = `rgba(${r},${g},${b},1.0)`;
    ctx.font = `11px "Courier New", monospace`;
    ctx.fillText(def.element, cx, y + 100);

    ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
    ctx.lineWidth = 0.8;
    const divY = y + 112;
    ctx.beginPath(); ctx.moveTo(x + 14, divY); ctx.lineTo(x + w - 14, divY); ctx.stroke();

    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const rowH = Math.max(40, (h - 112 - 16) / 2);
    _drawFullBuffRow(def.buffs[0], x + 14, divY + 10, w - 28, rowH);
    _drawFullBuffRow(def.buffs[1], x + 14, divY + 10 + rowH, w - 28, rowH);

    ctx.restore();
}

function _drawFullBuffRow(buff, x, y, maxW, rowH) {
    const badgeW = 42;
    ctx.save();
    ctx.fillStyle = buff.typeC + 'cc';
    _drawRoundRect(x, y, badgeW, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 9px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(buff.type, x + badgeW / 2, y + 11);

    ctx.fillStyle = '#e8f4ff';
    ctx.font = `bold 12px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(buff.name, x + badgeW + 8, y + 12);

    ctx.fillStyle = 'rgba(190,215,245,0.95)';
    ctx.font = '11px sans-serif';
    const lineH = 14;
    const maxLines = Math.max(1, Math.floor((rowH - 20) / lineH));
    _wrapText(buff.desc, x, y + 28, maxW, lineH, maxLines);
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

const MOBILE_SLIDE_DUR = 220;

// Moves the mobile single-card view to a new index (clamped), keeping
// p.selectedSigil in sync since there's no separate tap-to-select step
// there - whichever card is currently shown is what CONFIRM would pick.
// Records a from-index + direction so the draw code can slide the old card
// out and the new one in instead of snapping instantly (the instant swap
// was the "chưa mượt" jank reported after the first pass).
function _mobileGoTo(p, newIndex) {
    newIndex = Math.max(0, Math.min(p.options.length - 1, newIndex));
    if (newIndex === p.mobileIndex) return;
    if (p.mobileTransStart && performance.now() - p.mobileTransStart < MOBILE_SLIDE_DUR) return;
    p.mobileTransFrom = p.mobileIndex;
    p.mobileTransDir = newIndex > p.mobileIndex ? 1 : -1;
    p.mobileTransStart = performance.now();
    p.mobileIndex = newIndex;
    p.selectedSigil = p.options[newIndex];
    if (window.AudioMgr) window.AudioMgr.playSfx('hover');
}

function _handleSigilPickerClick(ex, ey) {
    const p = window._sigilPicker;
    if (!p || p.phase !== 'choosing_sigil') return;

    const L = _pickerLayout();

    if (L.isMob) {
        const bottomRow = _mobileBottomRowRects(L, 0);
        if (Math.hypot(ex - bottomRow.leftArrow.x, ey - bottomRow.leftArrow.y) <= bottomRow.leftArrow.r + 6) {
            _mobileGoTo(p, p.mobileIndex - 1);
            return;
        }
        if (Math.hypot(ex - bottomRow.rightArrow.x, ey - bottomRow.rightArrow.y) <= bottomRow.rightArrow.r + 6) {
            _mobileGoTo(p, p.mobileIndex + 1);
            return;
        }
    } else {
        const idx = _pickerCardHitTest(ex, ey, L);
        if (idx >= 0 && idx < p.options.length) {
            p.hoveredSigil = p.options[idx];
            p.selectedSigil = p.options[idx];
            if (window.AudioMgr) window.AudioMgr.playSfx('click');
            return;
        }
    }

    if ((window._sigilRerollsLeft || 0) > 0) {
        const rbtn = _sigilRerollRect(L, 0);
        if (ex >= rbtn.x && ex <= rbtn.x + rbtn.w && ey >= rbtn.y && ey <= rbtn.y + rbtn.h) {
            window._sigilRerollsLeft--;
            p.options = _shuffleArray(window._sigilPool || []).slice(0, Math.min(4, (window._sigilPool || []).length));
            p.mobileIndex = 0;
            p.selectedSigil = L.isMob ? (p.options[0] || null) : null;
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
    const idx = L.isMob ? -1 : _pickerCardHitTest(ex, ey, L);
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

        // Swipe support for the mobile single-card view: a horizontal drag
        // past SWIPE_THRESHOLD moves to the next/prev card instead of
        // registering as a tap on release.
        const SWIPE_THRESHOLD = 40;
        let _swipeStartX = 0, _swipeStartY = 0;

        ov.addEventListener('touchend', (e) => {
            if (!window._sigilPicker) return;
            e.preventDefault();
            const t = e.changedTouches[0];
            const [ex, ey] = _canvasCoords(t.clientX, t.clientY);
            const p = window._sigilPicker;
            const L = _pickerLayout();
            const dx = t.clientX - _swipeStartX, dy = t.clientY - _swipeStartY;
            if (L.isMob && p.phase === 'choosing_sigil' && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
                _mobileGoTo(p, p.mobileIndex + (dx < 0 ? 1 : -1));
            } else {
                _handleSigilPickerClick(ex, ey);
            }
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
            const t = e.touches[0];
            _swipeStartX = t.clientX; _swipeStartY = t.clientY;
        }, { passive: false });
    }
});
