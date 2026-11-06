// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
(function () {
    'use strict';
    const SLOTS = ['SH', 'A', 'S', 'D', 'F', 'G', 'SPC'];
    const WORDS = {
        title: ['Voyage Pilot Licence', 'Giấy Phép Phi Công Hành Trình'],
        class: ['Endless Voyage, Class I', 'Hành Trình Vô Tận, Hạng I'],
        holder: ['LICENCE HOLDER', 'CHỦ GIẤY PHÉP'],
        number: ['LICENCE NUMBER', 'SỐ GIẤY PHÉP'],
        issued: ['ISSUED', 'NGÀY CẤP'],
        reissued: ['REISSUED', 'CẤP LẠI'],
        issuer: ['ISSUING OFFICER', 'NGƯỜI CẤP PHÉP'],
        calibration: ['FLIGHT CALIBRATION', 'HIỆU CHUẨN BAY'],
        stamp: ['CALIBRATED', 'ĐÃ HIỆU CHUẨN'],
        begin: ['Begin Endless Voyage', 'Bắt Đầu Hành Trình Vô Tận'],
        menu: ['Main menu', 'Menu chính'],
        save: ['Save image', 'Lưu ảnh'],
        name: ['Pilot name', 'Tên phi công'],
        saving: ['Preparing image', 'Đang tạo ảnh'],
        saved: ['Image ready', 'Ảnh đã sẵn sàng'],
        error: ['Image unavailable. Try again.', 'Chưa tạo được ảnh. Hãy thử lại.']
    };
    const STOP = ['stopAmbient', 'stopEngine', 'stopLaser', 'stopCharging', 'stopSkillDCharge', 'stopSkillFCharge', 'stopSkillFFire', 'stopDeathStar', 'stopMaouHaki', 'stopLowHp', 'stopNullSlashWindup', 'stopEgregorCrawl', 'stopPhotokrystosIdle', 'stopSkillGLoop', 'stopGoliathIdle', 'stopGoliathVerdictCharge', 'stopLeviathanIdle', 'stopAmmitIdle', 'stopAmmitCues', 'stopUrielIdle', 'stopUrielSwordHover', 'stopRaphaelIdle', 'stopCancerWhirlpool', 'stopCutsceneAmbience', 'exitGoliathTransformDuck', 'exitGoliathSpawnDuck', 'exitTimeDomain', 'stopBgm', 'stopTutorialSfx'];
    let overlay = null, card = null, view = null, base = null, stamp = null, seal = null, input = null, status = null;
    let data = null, record = null, name = '', vi = false, portrait = false, opened = 0, raf = 0, active = false, elapsed = 0, cue = 0, reduced = false, focusReturn = null, generation = 0;
    let W = 1000, H = 650, scale = 1, stampX = 0, stampY = 0, sealX = 0, sealY = 0;
    const nameRect = { x: 0, y: 0, w: 0, h: 44 };
    const printRows = new Float32Array(7), printH = new Float32Array(7);
    const fonts = { title: '', ui: '', script: '' };
    const fontLoads = {};
    function word(key) { return WORDS[key][vi ? 1 : 0]; }
    function clean(raw) { return Array.from(String(raw || '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 16).join(''); }
    function get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
    function put(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
    function sfx(key) { if (window.AudioMgr && window.AudioMgr.playSfx) window.AudioMgr.playSfx(key); }
    function count(value, fallback, max) { return Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback; }
    function stats(raw) {
        raw = raw || {};
        const attempts = raw.attempts || {}, skills = Array.isArray(raw.skills) ? raw.skills : [];
        let total = 0;
        for (const k of ['bullets', 'strip', 'circle', 'sector', 'shift']) total += Math.max(1, count(attempts[k], 1, 999999));
        const first = count(raw.firstTry, 0, 5), hits = count(raw.hits, 0, 999999);
        // S requires five clean first tries, A requires at least three with at most three hits, B requires at least one with at most ten hits, and C covers the rest.
        const rank = first === 5 && hits === 0 ? 'S' : first >= 3 && hits <= 3 ? 'A' : first >= 1 && hits <= 10 ? 'B' : 'C';
        return { total, first, hits, rank, time: Math.round(count(raw.timeMs, 0, 86400000) / 1000), skills: SLOTS.filter(function (k) { return skills.includes(k); }) };
    }
    function identity() {
        let old;
        try { old = JSON.parse(get('pisces_license')); } catch (_) {}
        if (old && /^PSC-\d{4}[A-Z0-9]{4}$/.test(old.number) && Number.isFinite(Date.parse(old.issued))) return { number: old.number, issued: old.issued, reissued: true };
        const issued = new Date().toISOString();
        let hash = 2166136261;
        const seed = name + issued;
        for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
        const number = 'PSC-' + issued.slice(0, 4) + (hash >>> 0).toString(36).toUpperCase().padStart(4, '0').slice(-4);
        put('pisces_license', JSON.stringify({ number, issued }));
        return { number, issued, reissued: false };
    }
    function loadFonts() {
        const v = vi, key = vi ? 'vi' : 'en';
        if (fontLoads[key]) return;
        fontLoads[key] = true;
        const link = document.createElement('link'); link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?' + (vi ? 'family=Playfair+Display:wght@700&family=Be+Vietnam+Pro:wght@400;600;700&family=Cormorant+Garamond:ital,wght@1,600' : 'family=Cinzel:wght@700&family=Orbitron:wght@400;600;700&family=Cormorant+Garamond:ital,wght@1,600&family=Be+Vietnam+Pro:wght@600') + '&display=swap';
        link.onload = function () {
            if (!document.fonts) return;
            // canvas text never requests a font by itself, so each face and its Vietnamese subset is loaded explicitly before the card is baked again
            const probes = v ? [['700 38px "Playfair Display"', 'Giấy Phép Phi Công Hành Trình HẠNG ẤẠỆỔ'], ['400 22px "Be Vietnam Pro"', 'CHỦ GIẤY PHÉP HIỆU CHUẨN Ạ'], ['600 22px "Be Vietnam Pro"', 'Né ngay lần đầu Ạ'], ['italic 600 48px "Cormorant Garamond"', 'Kanade']] : [['700 38px Cinzel', 'Voyage Pilot Licence GRADE'], ['400 22px Orbitron', 'LICENCE HOLDER 0123456789'], ['600 22px Orbitron', 'Attempts'], ['italic 600 48px "Cormorant Garamond"', 'Kanade']];
            Promise.all(probes.map(function (p) { return document.fonts.load(p[0], p[1]); })).catch(function () {}).then(function () { if (active) { bake(); render(elapsed); } });
        };
        document.head.appendChild(link);
    }
    function cut(g, x, y, w, h, c) {
        g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h); g.lineTo(x, y + h); g.lineTo(x, y + c); g.closePath();
    }
    function star(g, x, y, r) {
        g.beginPath();
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, d = i % 2 ? r * .32 : r; if (!i) g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
        g.closePath(); g.fill();
    }
    function text(g, value, x, y, size, family, color, maxW) {
        g.fillStyle = color || '#ebe5f8';
        const italic = family.indexOf('italic ') === 0, face = italic ? family.slice(7) : family, prefix = italic ? 'italic ' : '';
        g.font = prefix + size + 'px ' + face;
        while (maxW && size > 22 && g.measureText(value).width > maxW) { size--; g.font = prefix + size + 'px ' + face; }
        g.fillText(value, x, y, maxW);
    }
    function field(g, label, value, x, y, width) {
        text(g, label, x, y, 22, fonts.ui, '#c3add8', width);
        text(g, value, x, y + 36, 27, fonts.ui, '#fff0cd', width);
    }
    function bake() {
        portrait = innerHeight > innerWidth;
        W = portrait ? 720 : 1000; H = portrait ? 1000 : 650;
        fonts.title = vi ? '"Playfair Display",Georgia,serif' : 'Cinzel,Georgia,serif';
        fonts.ui = vi ? '"Be Vietnam Pro","Segoe UI",sans-serif' : 'Orbitron,"Segoe UI",sans-serif';
        fonts.script = '"Cormorant Garamond",Georgia,serif';
        if (!base) { base = document.createElement('canvas'); stamp = document.createElement('canvas'); seal = document.createElement('canvas'); }
        base.width = W * 2; base.height = H * 2;
        const g = base.getContext('2d'); g.scale(2, 2);
        cut(g, 3, 3, W - 6, H - 6, 26); g.fillStyle = '#100d22'; g.fill(); g.strokeStyle = '#6fc3cf'; g.lineWidth = 2; g.stroke();
        cut(g, 17, 17, W - 34, H - 34, 18); g.strokeStyle = '#99764b'; g.lineWidth = 1; g.stroke();
        g.save(); cut(g, 22, 22, W - 44, H - 44, 14); g.clip();
        g.strokeStyle = '#73558a'; g.globalAlpha = .18; g.lineWidth = .8;
        for (let row = 0; row < 17; row++) {
            g.beginPath();
            for (let x = 20; x < W; x += 4) { const y = H * .48 + row * 9 + Math.sin(x * .017 + row * .36) * 95; if (x === 20) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        }
        g.restore();
        g.fillStyle = '#f0cb7c'; star(g, 51, 58, 16);
        text(g, 'PISCES: SPACE JOURNEY', 80, 66, 24, fonts.ui, '#cdbbdf', W - 140);
        text(g, word('title'), 46, portrait ? 121 : 121, portrait ? 34 : 38, fonts.title, '#f4dcac', W - 92);
        text(g, word('class'), 48, 159, 23, fonts.ui, '#bfa6e3', W - 96);
        g.strokeStyle = '#5f4d6e'; g.beginPath(); g.moveTo(45, 179); g.lineTo(W - 45, 179); g.stroke();
        const sx = 48, sy = 203, sw = portrait ? 236 : 255;
        cut(g, sx, sy, sw, sw, 18); g.fillStyle = '#101c30'; g.fill(); g.strokeStyle = '#649baf'; g.stroke();
        g.save(); cut(g, sx + 2, sy + 2, sw - 4, sw - 4, 18); g.clip();
        g.strokeStyle = '#23556a';
        for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(sx + i * sw / 8, sy); g.lineTo(sx + i * sw / 8, sy + sw); g.moveTo(sx, sy + i * sw / 8); g.lineTo(sx + sw, sy + i * sw / 8); g.stroke(); }
        g.strokeStyle = '#54d5e8'; g.lineWidth = 2; g.beginPath(); g.arc(sx + sw / 2, sy + sw / 2, sw * .39, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#2b7088'; g.lineWidth = 9; g.stroke();
        const hull = typeof _getPlayerShipBaseSprite === 'function' ? _getPlayerShipBaseSprite() : null;
        if (hull && hull.width) { const k = Math.min(sw * .7 / hull.width, sw * .7 / hull.height); g.drawImage(hull, sx + (sw - hull.width * k) / 2, sy + (sw - hull.height * k) / 2, hull.width * k, hull.height * k); }
        else { g.fillStyle = '#a1eff7'; g.beginPath(); g.moveTo(sx + sw / 2, sy + sw * .22); g.lineTo(sx + sw * .75, sy + sw * .72); g.lineTo(sx + sw / 2, sy + sw * .6); g.lineTo(sx + sw * .25, sy + sw * .72); g.closePath(); g.fill(); }
        g.restore();
        g.fillStyle = '#c6a9e2'; star(g, sx + sw - 34, sy + sw - 34, 24);
        const rx = portrait ? 314 : 342, rw = W - rx - 49;
        nameRect.x = rx; nameRect.y = 238; nameRect.w = rw;
        text(g, word('holder'), rx, 220, 22, fonts.ui, '#c3add8', rw);
        text(g, name || (vi ? 'PHI CÔNG' : 'PILOT'), rx, 274, portrait ? 30 : 36, /[^\x20-\x7e]/.test(name) ? '"Be Vietnam Pro","Segoe UI",sans-serif' : fonts.ui, '#fff0cd', rw);
        g.strokeStyle = '#8e7569'; g.lineWidth = 1; g.beginPath(); g.moveTo(rx, 288); g.lineTo(W - 49, 288); g.stroke();
        const date = new Date(record.issued).toLocaleDateString(vi ? 'vi-VN' : 'en-GB');
        field(g, word('number'), record.number, rx, 324, rw);
        field(g, word('issued'), date + (record.reissued ? ' (' + word('reissued').toLowerCase() + ')' : ''), rx, 405, rw);
        const cy = portrait ? 500 : 487;
        text(g, word('calibration'), 48, cy, 22, fonts.ui, '#cdbbdf', portrait ? 460 : 550);
        const cell = portrait ? 77 : 54, gap = portrait ? 14 : 12;
        for (let i = 0; i < SLOTS.length; i++) {
            const x = 48 + i * (cell + gap), y = cy + 19, taught = data.skills.includes(SLOTS[i]);
            g.fillStyle = taught ? '#282136' : '#171521'; g.fillRect(x, y, cell, 43); g.strokeStyle = taught ? '#d9bb7a' : '#605769'; g.strokeRect(x, y, cell, 43);
            text(g, SLOTS[i] === 'SH' ? 'SH' : SLOTS[i] === 'SPC' ? 'SPC' : SLOTS[i], x + 8, y + 30, 22, fonts.ui, taught ? '#f4dca3' : '#776a87', cell - 12);
        }
        const metricsY = portrait ? 635 : 585;
        const first = vi ? 'Né ngay lần đầu: ' + data.first + '/5' : 'First try: ' + data.first + '/5';
        const tries = vi ? 'Tổng lần thử: ' + data.total : 'Attempts: ' + data.total;
        const time = (vi ? 'Thời gian: ' : 'Time: ') + Math.floor(data.time / 60) + ':' + String(data.time % 60).padStart(2, '0');
        text(g, first, 48, metricsY, 22, fonts.ui, '#eadcc7', portrait ? 340 : 330);
        text(g, tries, portrait ? 48 : 395, portrait ? metricsY + 42 : metricsY, 22, fonts.ui, '#c1b3d5', 280);
        text(g, time, portrait ? 400 : 690, metricsY, 22, fonts.ui, '#c1b3d5', portrait ? 270 : 261);
        // the issuing officer signs once: script signature, a rule under it, then the printed role
        const sigX = portrait ? 48 : 690, sigY = portrait ? 895 : 515, sigW = portrait ? 312 : 230;
        text(g, 'Kanade', sigX + 6, sigY, 48, 'italic ' + fonts.script, '#ead09d', 230);
        g.strokeStyle = '#b39a7a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sigX, sigY + 12); g.lineTo(sigX + sigW, sigY + 12); g.stroke(); g.lineWidth = 1;
        text(g, word('issuer'), sigX, sigY + 38, 22, fonts.ui, '#c3add8', sigW);
        // the grade sits in its own framed badge
        const bx = portrait ? 48 : 751, by = portrait ? 715 : 302, bw = 200, bh = portrait ? 70 : 62;
        cut(g, bx, by, bw, bh, 12); g.fillStyle = '#1a1428'; g.fill(); g.strokeStyle = '#d9bb7a'; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
        text(g, vi ? 'HẠNG' : 'GRADE', bx + 18, by + bh / 2 + 7, 22, fonts.ui, '#c3add8', 100);
        text(g, data.rank, bx + bw - 62, by + bh / 2 + 17, 52, fonts.title, '#f1d795', 60);
        stampX = portrait ? 490 : 800; stampY = portrait ? 765 : 420;
        sealX = portrait ? 603 : 690; sealY = portrait ? 880 : 335;
        stamp.width = 600; stamp.height = 150; const st = stamp.getContext('2d'); st.scale(2, 2);
        st.strokeStyle = '#c7a2ee'; st.lineWidth = 2; st.strokeRect(4, 4, 292, 67); st.strokeRect(10, 10, 280, 55);
        st.textAlign = 'center'; text(st, word('stamp'), 150, 46, 24, fonts.ui, '#ddbbff', 270);
        seal.width = seal.height = 200; const sg = seal.getContext('2d'); sg.scale(2, 2);
        sg.fillStyle = '#b68c4d'; star(sg, 50, 50, 48); sg.fillStyle = '#f0d48b'; star(sg, 50, 50, 39);
        sg.fillStyle = '#39284e'; sg.beginPath(); sg.arc(50, 50, 24, 0, Math.PI * 2); sg.fill(); sg.fillStyle = '#bfe5e5'; star(sg, 50, 50, 20);
        const mrz = 'PSC<<' + (name || 'PILOT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '<') + '<<' + record.number.replace(/-/g, '<') + '<<<<I';
        text(g, mrz, 48, H - 29, 22, 'monospace', '#8e879f', W - 95);
        const rows = [192, 296, 378, cy - 23, metricsY - 24, portrait ? 708 : H - 51, H - 51], heights = [98, 76, 76, 98, 85, portrait ? 245 : 30, 30];
        for (let i = 0; i < 7; i++) { printRows[i] = rows[i]; printH[i] = heights[i]; }
        resize();
    }
    function resize() {
        if (!active) return;
        if ((innerHeight > innerWidth) !== portrait) { bake(); return; }
        const availableH = innerHeight - (innerHeight < 500 ? 102 : 152);
        scale = Math.max(.1, Math.min((innerWidth - 28) / W, availableH / H, 1.06));
        card.style.width = (W * scale) + 'px'; card.style.height = (H * scale) + 'px';
        view.width = Math.round(W * Math.min(2, devicePixelRatio || 1) * scale); view.height = Math.round(H * Math.min(2, devicePixelRatio || 1) * scale);
        input.style.left = (nameRect.x / W * 100) + '%'; input.style.top = (nameRect.y / H * 100) + '%'; input.style.width = (nameRect.w / W * 100) + '%'; input.style.height = (nameRect.h / H * 100) + '%'; input.style.fontSize = Math.max(10, 28 * scale) + 'px';
    }
    function render(ms, target) {
        const g = target || view.getContext('2d'), c = g.canvas;
        g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(base, 0, 0, W, H);
        if (ms < 1800) {
            g.fillStyle = '#100d22';
            for (let i = 0; i < 7; i++) if (ms < 450 + i * 220) { const y = printRows[i]; if (i < 3) g.fillRect(nameRect.x - 2, y, nameRect.w + 4, printH[i]); else g.fillRect(40, y, W - 80, printH[i]); }
        }
        if (ms >= 2000) {
            const p = Math.min(1, (ms - 2000) / 180); g.save(); g.translate(stampX, stampY); g.rotate(-.14); const k = reduced ? 1 : 1 + (1 - p) * .3; g.scale(k, k); g.globalAlpha = p * .85; g.drawImage(stamp, -150, -37.5, 300, 75); g.restore();
        }
        if (ms >= 2550) {
            g.globalAlpha = Math.min(1, (ms - 2550) / 400); g.drawImage(seal, sealX - 50, sealY - 50, 100, 100); g.globalAlpha = 1;
            const glow = !window._fxOpts || window._fxOpts.glow !== false;
            if (glow && (window._gfxLevel || 0) < 2) { g.save(); g.translate(48 + (portrait ? 236 : 255) - 34, 203 + (portrait ? 236 : 255) - 34); g.rotate(reduced ? 0 : Math.sin(ms * .0007) * .18); g.globalAlpha = .35; g.fillStyle = '#80f2f0'; star(g, 0, 0, 28); g.restore(); }
        }
    }
    function animate(now) {
        if (!active) return;
        elapsed = Math.max(elapsed, now - opened);
        if (elapsed >= 450 && cue < 1) { cue = 1; sfx('tut-license-print'); }
        if (elapsed >= 2000 && cue < 2) { cue = 2; sfx('tut-stamp'); }
        if (elapsed >= 2550 && cue < 3) { cue = 3; sfx('tut-seal'); }
        render(elapsed);
        if (elapsed < 3000 || (!reduced && (window._gfxLevel || 0) < 2 && !(typeof _mobPerf !== 'undefined' && _mobPerf))) raf = requestAnimationFrame(animate);
        else raf = 0;
    }
    function skip() { elapsed = 3200; cue = 3; card.style.animation = 'none'; card.style.opacity = '1'; card.style.transform = ''; render(elapsed); }
    function close() {
        active = false; generation++; cancelAnimationFrame(raf); raf = 0;
        if (window.AudioMgr && window.AudioMgr.stopTutorialSfx) window.AudioMgr.stopTutorialSfx();
        document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize);
        if (overlay) overlay.remove();
        overlay = card = view = input = status = null; base = stamp = seal = null;
        if (focusReturn && focusReturn.isConnected) focusReturn.focus(); focusReturn = null;
    }
    function begin() { sfx('click'); close(); if (window._prepareGameMode) window._prepareGameMode('endless'); if (typeof startGame === 'function') startGame(); }
    function menu() { sfx('click'); close(); if (window._goToMenuImmediate) window._goToMenuImmediate(); }
    function onResize() { resize(); render(elapsed); }
    function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); menu(); }
        else if (e.key === 'Enter' && e.target !== input && e.target.tagName !== 'BUTTON') { e.preventDefault(); e.stopImmediatePropagation(); begin(); }
        else if (e.key === 'Enter' && e.target === input) { e.preventDefault(); input.blur(); }
        else if (e.key === 'Tab') {
            const nodes = overlay.querySelectorAll('input,button'), first = nodes[0], last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }
    function crc(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) { c ^= bytes[i]; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; } return (c ^ 0xffffffff) >>> 0; }
    function tagPng(bytes) {
        const parts = [bytes.subarray(0, 33)];
        for (const key of ['Author', 'Source']) { const body = new TextEncoder().encode('tEXt' + key + '\0@aansensei'), chunk = new Uint8Array(body.length + 8), dv = new DataView(chunk.buffer); dv.setUint32(0, body.length - 4); chunk.set(body, 4); dv.setUint32(chunk.length - 4, crc(body)); parts.push(chunk); }
        parts.push(bytes.subarray(33)); return new Blob(parts, { type: 'image/png' });
    }
    async function save() {
        const session = generation; sfx('click'); skip(); status.textContent = word('saving');
        try {
            const c = document.createElement('canvas'), k = Math.min(2 * scale, 2048 / W, 2048 / H);
            c.width = Math.round(W * k); c.height = Math.round(H * k); render(4000, c.getContext('2d'));
            const png = await new Promise(function (resolve) { c.toBlob(resolve, 'image/png'); });
            const blob = tagPng(new Uint8Array(await png.arrayBuffer()));
            if (!active || session !== generation) return;
            const file = new File([blob], record.number + '.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: word('title') }); } catch (e) { if (e.name === 'AbortError') return; download(blob); } }
            else download(blob);
            if (active && session === generation) status.textContent = word('saved');
        } catch (_) { if (active && session === generation) status.textContent = word('error'); }
    }
    function download(blob) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = record.number + '.png'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 10000); }
    function open(raw) {
        if (active) close();
        vi = window._lang === 'vi'; data = stats(raw); name = clean(get('pisces_pilot_name')); record = identity();
        reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; active = true; generation++; elapsed = 0; cue = 0; focusReturn = document.activeElement;
        if (!document.getElementById('licenseStyle')) {
            const st = document.createElement('style'); st.id = 'licenseStyle';
            st.textContent = '#licenseOverlay{position:fixed;inset:0;z-index:99999996;background:rgba(4,5,16,.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px;box-sizing:border-box;color:#e7dcf7;font-family:"Be Vietnam Pro","Segoe UI",sans-serif;backdrop-filter:blur(8px)}@keyframes license-enter{from{opacity:0;transform:perspective(1000px) translateY(35px) rotateX(7deg)}to{opacity:1;transform:none}}@keyframes license-fade{from{opacity:0}to{opacity:1}}#licenseOverlay .license-card{position:relative;flex:none;cursor:pointer}#licenseOverlay canvas{width:100%;height:100%;display:block}#licenseOverlay input{position:absolute;box-sizing:border-box;border:0;border-bottom:1px solid transparent;background:transparent;color:transparent;caret-color:#8ae6ee;font-family:"Be Vietnam Pro","Segoe UI",sans-serif;outline:none}#licenseOverlay input::placeholder{color:transparent}#licenseOverlay input:focus::placeholder{color:#afa2bf}#licenseOverlay input:focus{color:#fff0cd;background:#171026;border-color:#80e9ef}#licenseOverlay nav{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}#licenseOverlay button{min-height:44px;border:1px solid #7a627f;background:#181329;color:#e6d9ef;padding:8px 16px;font:600 12px "Be Vietnam Pro","Segoe UI",sans-serif;cursor:pointer;border-radius:3px}#licenseOverlay button:first-child{color:#f7dfa8;border-color:#b89b65;background:#292035}#licenseOverlay button:focus-visible,#licenseOverlay input:focus-visible{outline:2px solid #83e6e9;outline-offset:3px}#licenseOverlay button:hover{background:#302342}#licenseOverlay .license-status{font-size:11px;min-height:16px;margin:0;color:#afa2bf}@media(max-height:500px){#licenseOverlay{gap:5px;padding:7px}#licenseOverlay button{padding:6px 12px;font-size:11px}}';
            document.head.appendChild(st);
        }
        overlay = document.createElement('section'); overlay.id = 'licenseOverlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', word('title'));
        card = document.createElement('div'); card.className = 'license-card'; view = document.createElement('canvas'); view.setAttribute('role', 'img'); view.setAttribute('aria-label', word('title') + ', ' + record.number + ', ' + data.rank); card.appendChild(view);
        input = document.createElement('input'); input.value = name; input.maxLength = 40; input.placeholder = vi ? 'PHI CÔNG' : 'PILOT'; input.autocomplete = 'nickname'; input.setAttribute('aria-label', word('name')); card.appendChild(input);
        input.addEventListener('input', function () { name = clean(input.value); put('pisces_pilot_name', name); bake(); skip(); });
        input.addEventListener('blur', function () { input.value = name; }); input.addEventListener('pointerdown', function (e) { e.stopPropagation(); skip(); });
        card.addEventListener('pointerdown', skip); overlay.appendChild(card);
        const nav = document.createElement('nav');
        for (const pair of [['begin', begin], ['menu', menu], ['save', save]]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = word(pair[0]); button.addEventListener('click', pair[1]); button.addEventListener('pointerenter', function () { sfx('hover'); }); nav.appendChild(button); }
        overlay.appendChild(nav); status = document.createElement('p'); status.className = 'license-status'; status.setAttribute('aria-live', 'polite'); overlay.appendChild(status); document.body.appendChild(overlay);
        bake(); loadFonts(); card.style.animation = reduced ? 'license-fade .45s both' : 'license-enter .45s both'; opened = performance.now(); sfx('tut-license-open'); raf = requestAnimationFrame(animate);
        document.addEventListener('keydown', onKey, true); window.addEventListener('resize', onResize); nav.firstChild.focus();
    }
    window._tutorialEnd = function (raw) {
        try {
            if (window._tutorialAbort) window._tutorialAbort(); window._tutorialActive = false;
            gameState = 'gameover'; gamePaused = false; window._bgPaused = false; window._lowHpActive = false;
            const a = window.AudioMgr;
            if (a) { if (a.setTimeFrozen) a.setTimeFrozen(false, false); for (let i = 0; i < STOP.length; i++) if (typeof a[STOP[i]] === 'function') a[STOP[i]](); if (a.prepareEnemy) a.prepareEnemy('kanade'); }
            const pause = document.getElementById('pause-overlay'); if (pause) pause.style.display = 'none';
            open(raw);
        } catch (_) { close(); if (window._goToMenuImmediate) window._goToMenuImmediate(); }
    };
})();
