// Pisces: Space Journey, © 2024 An Nguyen. Licensed under the MIT License.
// js/tutorial.js: Tutorial mode. Kanade leads a short calibration run: she steps out of her gate, speaks in a
// speech box, the skill panel fills in as she names each skill, a few training enemies appear, and her magic
// circles fire the attack shapes the player has to learn to read. She is drawn as an overlay only: she is never
// in enemies, sentinels or bullets, so nothing in the game can target, hit or move her.
(function () {
    'use strict';

    const SLOTS = ['SH', 'A', 'S', 'D', 'F', 'G', 'SPC'];
    const MOBILE_ID = { SH: 'mb-yog', A: 'mb-a', S: 'mb-s', D: 'mb-d', F: 'mb-f', G: 'mb-g', SPC: 'mb-ch' };
    const HUD_ROW = { SH: 0, A: 1, S: 2, D: 3, F: 4, G: 5 };
    const BEAT = { gate: 900, walk: 1900, leave: 1800, close: 1100 };
    const CAST_MS = 4200;
    const LEAD_MS = 1100;
    const EMIT_AT = 1700;
    const PARK_MS = 800;
    const TYPE_MS = 28;
    const HOLD_BASE = 1500;
    const HOLD_PER_CHAR = 22;
    const HINT_AFTER = 18000;
    const SKIP_AFTER = 75000;
    const TOAST_MS = 7000;

    // [english, vietnamese]
    const TXT = {
        intro1: ['I am Kanade. This is a calibration run for your ship.', 'Tôi là Kanade. Đây là lượt hiệu chuẩn cho con tàu của bạn.'],
        intro2: ['Nothing here can truly harm you. Watch first, then act.', 'Ở đây không gì có thể gây hại thật cho bạn. Hãy quan sát trước, rồi hành động.'],
        sigils: ['Choose one Sigil. Read its blessings before confirming.', 'Chọn một Sigil. Đọc phước lành của nó trước khi xác nhận.'],
        move: ['Move with the left and right arrow keys.', 'Di chuyển bằng phím mũi tên trái và phải.'],
        moveM: ['Drag the joystick to move your ship.', 'Kéo cần điều khiển để di chuyển con tàu.'],
        moveDone: ['Good. Your ship also fires on its own, without pause.', 'Tốt. Con tàu còn tự động bắn liên tục, không ngừng.'],
        charge: ['Hold SPACE to charge a shot. Release to fire it.', 'Giữ SPACE để Bắn Sạc. Thả ra để bắn.'],
        chargeM: ['Hold the CHARGE button to charge a shot. Release to fire it.', 'Giữ nút CHARGE để Bắn Sạc. Thả ra để bắn.'],
        chargeMore: ['Hold it for three seconds and it becomes the Overload Laser.', 'Giữ trong ba giây, nó trở thành Laser Quá Tải.'],
        skills: ['Now your skills. Each one has its own cooldown.', 'Giờ là các kỹ năng. Mỗi kỹ năng có thời gian hồi chiêu riêng.'],
        skillA: ['A: Thunder Orbs. Energy orbs that hunt enemies on their own.', 'A: Cầu Sấm Sét. Những cầu năng lượng tự tìm kẻ địch.'],
        skillS: ['S: Remembrance Spirit. It summons an ally that fights beside you.', 'S: Tinh Linh Hoài Niệm. Triệu hồi một đồng minh chiến đấu cùng bạn.'],
        skillD: ['D: Death Star. It pulls enemies in and destroys what it touches.', 'D: Tử Long Tinh. Hút kẻ địch vào và tiêu diệt thứ nó chạm tới.'],
        skillF: ['F: Annihilation Sweep. A beam that crosses the whole screen.', 'F: Càn Quét Hủy Diệt. Một chùm tia quét qua toàn màn hình.'],
        skillG: ['G: Tesla Matrix. A field of lightning that guards your ship.', 'G: Ma Trận Tesla. Một trường sét bảo vệ con tàu.'],
        monsters: ['Hostiles detected. Destroy them. Use every skill you have.', 'Phát hiện kẻ địch. Hãy tiêu diệt chúng. Dùng mọi kỹ năng bạn có.'],
        afterMonsters: ['Acceptable. Now the part that decides survival: avoiding attacks.', 'Đạt yêu cầu. Giờ là phần quyết định sự sống còn: né đòn.'],
        dodgeIntro: ['A red zone marks where an attack will land. Leave it before it fires.', 'Vùng đỏ đánh dấu nơi đòn tấn công sẽ giáng xuống. Hãy rời khỏi đó trước khi nó phát động.'],
        patBullets: ['First, shots aimed at you. Step aside.', 'Trước hết là đạn nhắm vào bạn. Hãy tránh sang bên.'],
        patStrip: ['A beam follows its red lane. Get out of the lane.', 'Một tia sáng chạy dọc làn đỏ. Hãy rời khỏi làn đó.'],
        patCircle: ['A burst lands on a red circle. Move out of it.', 'Một vụ nổ rơi xuống vòng tròn đỏ. Hãy rời khỏi vòng.'],
        patSector: ['A sweep covers a wide fan. Go behind it or past its edge.', 'Một đòn quét phủ cả một cung rộng. Hãy vòng ra sau nó hoặc vượt qua rìa cung.'],
        patShift: ['Some attacks cannot be outrun. Hold SHIFT to enter the Yog Sothoth Domain.', 'Có những đòn không thể chạy thoát. Giữ SHIFT để vào Lãnh Địa Yog-Sothoth.'],
        patShiftM: ['Some attacks cannot be outrun. Hold the Yog Sothoth button to enter its Domain.', 'Có những đòn không thể chạy thoát. Giữ nút Yog-Sothoth để vào Lãnh Địa của nó.'],
        good: ['Well dodged.', 'Né tốt.'],
        again: ['You were hit. Again.', 'Bạn bị trúng. Làm lại.'],
        hintBullets: ['Move after the circles aim. Keep moving.', 'Di chuyển sau khi pháp trận ngắm. Đừng dừng lại.'],
        hintStrip: ['Leave the lane. Its light still burns.', 'Ra khỏi làn. Ánh sáng của nó vẫn thiêu đốt.'],
        hintCircle: ['Watch the centre. Cross the rim before impact.', 'Nhìn vào tâm vòng. Vượt qua rìa trước khi nổ.'],
        hintSector: ['The bright edge advances. Leave the fan.', 'Mép sáng đang tiến tới. Ra khỏi cung.'],
        hintShift: ['Hold the Domain through the blast. Timing matters.', 'Giữ Lãnh Địa qua lúc nổ. Canh đúng thời điểm.'],
        hintWait: ['Take your time. I am waiting.', 'Cứ thong thả. Tôi đang chờ.'],
        outro1: ['Calibration complete. I will not repeat myself.', 'Hiệu chuẩn hoàn tất. Tôi sẽ không lặp lại.'],
        outro2: ['The Endless Voyage is waiting. Do not disappoint the system.', 'Hành Trình Vô Tận đang chờ. Đừng làm hệ thống thất vọng.'],
        capHud: ['The skill panel: a skill pulses when it is ready.', 'Bảng kỹ năng: kỹ năng nhấp nháy khi đã sẵn sàng.'],
        capStrip: ['Red lane: a beam is about to cross it.', 'Làn đỏ: một tia sắp quét qua.'],
        capCircle: ['Red circle: a burst is about to land.', 'Vòng đỏ: một vụ nổ sắp rơi xuống.'],
        capSector: ['Red fan: a sweep is about to cover it.', 'Cung đỏ: một đòn quét sắp phủ qua.'],
        capYog: ['The Domain stops every attack while you hold it.', 'Lãnh Địa chặn mọi đòn tấn công khi bạn còn giữ nó.']
    };
    const TOASTS = {
        hud: { img: 'assets/images/game/tutorial/tut-hud.png', cap: 'capHud' },
        strip: { img: 'assets/images/game/tutorial/tut-strip.png', cap: 'capStrip' },
        circle: { img: 'assets/images/game/tutorial/tut-circle.png', cap: 'capCircle' },
        sector: { img: 'assets/images/game/tutorial/tut-sector.png', cap: 'capSector' },
        yog: { img: 'assets/images/game/tutorial/tut-yog.png', cap: 'capYog' }
    };

    const mobile = () => window._platform === 'mobile';
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);
    const lang = () => (window._lang === 'vi' ? 1 : 0);
    const tx = (k) => (TXT[k] ? TXT[k][lang()] : k);
    const stage = () => window._kanadeStage || null;
    const nowMs = () => (typeof _frozenNow === 'number' && _frozenNow > 0 ? _frozenNow : performance.now());

    const T = {
        on: false, t: 0, i: -1, S: null, shown: {}, glow: {}, hitSeq: 0, orig: null, advance: false,
        mobileT: 0, toastT: 0, steps: null, pat: null, stats: null, typeAt: 0, typeN: 0, typeSound: 0, expression: 'neutral', targetExpression: 'neutral', blinkT: 300, expressionAge: 1000, gesture: 0, gestureFrom: 0, gestureT: 1, gestureWanted: 0, debugPose: null,
        K: { mode: 'hidden', t: 0, park: 0, parkTo: 0, gateT: -1, spin: 0, talk: false, out: false }
    };
    const FAKE = { type: 'tutorial_attack', x: 0, y: 0, damage: 0, ownerRef: null };
    const ZONES = [];
    for (let i = 0; i < 6; i++) ZONES.push({ on: false, kind: 'circle', x: 0, y: 0, r: 0, ang: 0, span: 0, hw: 0, len: 0, t: 0, tele: 1, fired: false, hit: false, parried: false, impact: false, strike: 0, life: 900, ex: 0, ey: 0 });
    const _lineCache = { key: '', lines: [] };
    let speechFont = '', nameFont = '', fontUnit = 0;

    function playSfx(key) { if (window.AudioMgr && window.AudioMgr.playSfx) (window.AudioMgr.playTutorialSfx || window.AudioMgr.playSfx)(key); }
    function slotOf(label) { return label.indexOf('SPC') >= 0 ? 'SPC' : label.indexOf('SH') >= 0 ? 'SH' : label; }
    function unit() { return Math.max(0.7, Math.min(1.4, canvas.height / 720)); }

    window._tutorialLocked = function (slot) { return !!(T.on && !T.shown[slot]); };
    window._tutHudHidden = function (label) { return !!(T.on && !T.shown[slotOf(label)]); };
    window._tutHudAllHidden = function () { if (!T.on) return false; for (let i = 0; i < SLOTS.length; i++) if (T.shown[SLOTS[i]]) return false; return true; };
    window._tutorialOnHit = function () {
        if (!T.on) return;
        T.hitSeq++;
        T.stats.hits++;
        T.reaction = 1500;
        burst(player.x, player.y, 1, 20);
        ring(player.x, player.y, 1, 85);
        window._hitVignetteStart = performance.now();
        playSfx('tut-fail');
        if (typeof _setShake === 'function') _setShake(6, 220);
    };

    function reveal(slot) {
        if (T.shown[slot]) return;
        T.shown[slot] = true;
        T.glow[slot] = performance.now() + 3200;
        T.mobileT = 0;
        T.stats.skills.push(slot);
        playSfx('tut-reveal');
        const y = canvas.height - 220 + SLOTS.indexOf(slot) * 26;
        let x = 70, sy = y;
        const el = mobile() && document.getElementById(MOBILE_ID[slot]);
        if (el) { const r = el.getBoundingClientRect(); const cr = canvas.getBoundingClientRect(); x = (r.x + r.width / 2 - cr.x) * canvas.width / cr.width; sy = (r.y + r.height / 2 - cr.y) * canvas.height / cr.height; }
        burst(x, sy, 0, 16); ring(x, sy, 0, 65);
    }

    function setMode(m) { T.K.mode = m; T.K.t = 0; }

    function say(keys) { return function () { return keys.map(function (k) { return k === 'move' && mobile() ? 'moveM' : k === 'charge' && mobile() ? 'chargeM' : k === 'patShift' && mobile() ? 'patShiftM' : k; }); }; }

    function buildSteps() {
        const SK = { 1: 'A', 2: 'S', 3: 'D', 4: 'F', 5: 'G' };
        return [
            { id: 'intro', park: false, lines: say(['intro1', 'intro2']) },
            { id: 'sigils', park: true, lines: say(['sigils']), pickSigil: true },
            {
                id: 'move', park: true, lines: say(['move']),
                tick: function (S) {
                    const dx = player.x - S.lastX; S.lastX = player.x;
                    S.moved += Math.abs(dx); if (dx < -0.2) S.left = true; if (dx > 0.2) S.right = true;
                },
                wait: function (S) { return S.moved > 260 && S.left && S.right; }
            },
            { id: 'auto', lines: say(['moveDone']) },
            {
                id: 'charge', lines: say(['charge', 'chargeMore']), pre: function () { reveal('SPC'); },
                tick: function (S) { if (charging) S.seen = true; else if (S.seen) S.fired = true; },
                wait: function (S) { return !!S.fired; }
            },
            {
                id: 'skills', lines: say(['skills', 'skillA', 'skillS', 'skillD', 'skillF', 'skillG']), toast: null,
                onLine: function (li) { if (SK[li]) reveal(SK[li]); if (li === 1) showToast('hud'); }
            },
            {
                id: 'monsters', lines: say(['monsters']), pre: spawnTrainingEnemies,
                wait: function () { return !enemies.some(function (e) { return e.hp > 0 && e.type.indexOf('enemy_bullet') !== 0 && e.type !== 'abyssal_chain'; }); }
            },
            { id: 'after', lines: say(['afterMonsters', 'dodgeIntro']), pre: clearField },
            { id: 'bullets', lines: say(['patBullets']), pattern: 'bullets' },
            { id: 'strip', lines: say(['patStrip']), pattern: 'strip', toast: 'strip' },
            { id: 'circle', lines: say(['patCircle']), pattern: 'circle', toast: 'circle' },
            { id: 'sector', lines: say(['patSector']), pattern: 'sector', toast: 'sector' },
            { id: 'shift', lines: say(['patShift']), pattern: 'shift', toast: 'yog', pre: function () { reveal('SH'); } },
            { id: 'outro', park: false, lines: say(['outro1', 'outro2']), outro: true }
        ];
    }

    function clearField() {
        for (let i = 0; i < enemies.length; i++) enemies[i].hp = 0;
    }

    function spawnTrainingEnemies() {
        const W = canvas.width;
        for (let i = 0; i < 4; i++) {
            if (typeof spawnApostle !== 'function') break;
            spawnApostle();
            const e = enemies[enemies.length - 1];
            e.x = W * (0.2 + i * 0.2); e.y = -30 - i * 55; e.speed = 0.6; e.hp = e.maxHp = 60; e.shootTimer = 1e9; e._tut = true;
        }
    }

    function enterStep(i) {
        const def = T.steps[i];
        T.i = i;
        T.S = {
            def: def, keys: def.lines(), li: 0, text: '', typed: 0, full: false, hold: 0, phase: 'lines', waitT: 0, hint: '', tries: 0, resultT: 0, result: '',
            lastX: player.x, moved: 0, left: false, right: false, seen: false, fired: false
        };
        if (def.park !== undefined) T.K.parkTo = def.park ? 1 : 0;
        if (def.pre) def.pre(T.S);
        if (def.toast) showToast(def.toast);
        if (def.outro) playSfx('tut-complete');
        burst(canvas.width * 0.4, canvas.height * 0.12, 0, 14);
        startLine();
    }

    function startLine() {
        const S = T.S, keys = S.keys;
        if (S.li >= keys.length) { afterLines(); return; }
        if (S.li) playSfx('tut-line');
        S.text = tx(keys[S.li]); S.typed = 0; S.full = false; S.hold = 0; T.typeAt = 0; T.typeN = 0;
        if (S.def.onLine) S.def.onLine(S.li);
    }

    function afterLines() {
        const S = T.S;
        if (S.def.pickSigil && typeof _triggerSigilPicker === 'function' && (window._sigilPool || []).length) {
            _triggerSigilPicker(false); T.picker = window._sigilPicker; S.phase = 'sigil'; return;
        }
        if (S.def.wait) { S.phase = 'wait'; S.waitT = 0; return; }
        if (S.def.pattern) { startPattern(S.def.pattern); S.phase = 'pattern'; return; }
        if (S.def.outro) { T.K.parkTo = 0; T.K.out = true; S.phase = 'outro'; return; }
        nextStep();
    }

    function nextStep() {
        if (T.i + 1 >= T.steps.length) { finish(); return; }
        enterStep(T.i + 1);
    }

    function setMessage(key) { T.typeAt = 0; T.typeN = 0; const S = T.S; S.text = tx(key); S.typed = 0; S.full = false; S.hold = 0; S.hint = ''; }

    function startPattern(id) {
        T.stats.attempts[id]++;
        T.pat = { id: id, c: 0, emitted: false, hit0: T.hitSeq, bullets: 0, endT: 0, done: false, ex: [] };
        setMode('cast');
        playSfx('kanade-summon');
        playSfx('tut-circle-charge');
    }

    function emitterY() { return Math.max(canvas.height * 0.3, (T.speechBottom || 0) + 46 * unit()); }

    function zone(kind) {
        for (let i = 0; i < ZONES.length; i++) if (!ZONES[i].on) {
            const z = ZONES[i]; z.on = true; z.kind = kind; z.t = 0; z.fired = false; z.hit = false; z.parried = false; z.impact = false; z.strike = 0; z.life = kind === 'strip' ? 420 : kind === 'sector' ? 380 : kind === 'domain' ? 240 : 300; playSfx('tut-warn'); return z;
        }
        return null;
    }

    function emit(P) {
        const W = canvas.width, H = canvas.height, u = unit(), EY = emitterY(), id = P.id;
        P.emitted = true;
        if (id === 'bullets') {
            playSfx('tut-bullet-volley');
            const xs = [W * 0.22, W * 0.5, W * 0.78], spd = (player.speed || 6) / 3;
            for (let i = 0; i < xs.length; i++) {
                P.ex.push({ x: xs[i], y: EY }); ring(xs[i], EY, 2, 55);
                for (let k = 0; k < 2; k++) {
                    const a = Math.atan2(player.y - EY, player.x - xs[i]) + k * 0.14;
                    enemies.push({ x: xs[i], y: EY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, damage: 0, size: 10, hp: 1e12, maxHp: 1e12, type: 'enemy_bullet', shield: 0, ownerRef: null, _tut: true });
                    P.bullets++;
                }
            }
        } else if (id === 'strip') {
            const lanes = [player.x, Math.max(W * 0.1, Math.min(W * 0.9, player.x + (player.x < W / 2 ? 1 : -1) * W * 0.24))];
            for (let i = 0; i < lanes.length; i++) {
                const z = zone('strip'); if (!z) continue;
                z.x = lanes[i]; z.y = EY; z.ang = Math.PI / 2; z.len = H - EY + 40; z.hw = 46 * u; z.tele = 1500; z.ex = z.x; z.ey = EY;
                P.ex.push({ x: z.x, y: EY });
            }
        } else if (id === 'circle') {
            const pts = [[player.x, player.y], [Math.max(W * 0.12, Math.min(W * 0.88, W - player.x)), Math.max(H * 0.3, player.y - 150 * u)]];
            for (let i = 0; i < pts.length; i++) {
                const z = zone('circle'); if (!z) continue;
                z.x = pts[i][0]; z.y = pts[i][1]; z.r = 112 * u; z.tele = 1700; z.ex = z.x; z.ey = EY;
                P.ex.push({ x: z.x, y: EY });
            }
        } else if (id === 'sector') {
            const z = zone('sector');
            if (z) {
                z.x = W / 2; z.y = H * 0.1; z.ang = Math.atan2(player.y - z.y, player.x - z.x); z.span = 1.05; z.r = H * 1.05; z.tele = 1900; z.ex = z.x; z.ey = z.y;
                P.ex.push({ x: z.x, y: z.y });
            }
        } else if (id === 'shift') {
            const z = zone('domain');
            playSfx('tut-domain-charge');
            if (z) { z.x = W / 2; z.y = H * 0.45; z.r = Math.hypot(W, H) * 0.62; z.tele = 3200; z.ex = W / 2; z.ey = EY; P.ex.push({ x: W / 2, y: EY }); }
        }
        const help = 1 + Math.min(0.5, T.S.tries * 0.12);
        for (let i = 0; i < ZONES.length; i++) if (ZONES[i].on) ZONES[i].tele *= help;
    }

    function zoneHits(z) {
        const pr = player.hitRadius || 4, dx = player.x - z.x, dy = player.y - z.y;
        if (z.kind === 'domain') return true;
        if (z.kind === 'circle') return z.strike >= 160 && Math.hypot(dx, dy) <= z.r * clamp01((z.strike - 160) / 140) + pr;
        if (z.kind === 'strip') {
            const c = Math.cos(z.ang), s = Math.sin(z.ang), along = dx * c + dy * s, across = Math.abs(-dx * s + dy * c);
            return along >= 0 && along <= z.len * clamp01(z.strike / 120) && across <= z.hw + pr;
        }
        const dist = Math.hypot(dx, dy);
        if (dist > z.r + pr) return false;
        let d = Math.atan2(dy, dx) - z.ang;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const edge = dist > 1 ? pr / dist : Math.PI;
        return d >= -z.span / 2 - edge && d <= -z.span / 2 + z.span * clamp01(z.strike / 380) + edge;
    }

    function updateZones(dt) {
        for (let i = 0; i < ZONES.length; i++) {
            const z = ZONES[i];
            if (!z.on) continue;
            z.t += dt;
            if (!z.fired && z.t >= z.tele) {
                z.fired = true;
                playSfx(z.kind === 'strip' ? 'tut-beam' : z.kind === 'sector' ? 'tut-sweep' : z.kind === 'domain' ? 'tut-domain-blast' : 'tut-burst');
                if (typeof _setShake === 'function') _setShake(z.kind === 'domain' ? 9 : 4, 180);
                if (z.kind === 'strip') for (let k = 1; k <= 4; k++) burst(z.x, z.y + z.len * k / 5, 2, 6);
                else if (z.kind !== 'circle') burst(z.x, z.y, 2, 24);
            }
            if (z.fired) {
                z.strike = z.t - z.tele;
                if (z.kind === 'circle' && !z.impact && z.strike >= 160) { z.impact = true; burst(z.x, z.y, 2, 24); }
                if (!z.hit && z.strike <= z.life && zoneHits(z)) {
                    FAKE.x = z.x; FAKE.y = z.y;
                    if (skillShiftActive) {
                        if (!z.parried && typeof playerTakesHit === 'function') playerTakesHit(FAKE);
                        z.parried = true; if (z.kind === 'domain') z.hit = true;
                    } else { z.hit = true; window._tutorialOnHit(); }
                }
                if (z.strike > z.life + 450) z.on = false;
            }
        }
    }

    function anyZone() { for (let i = 0; i < ZONES.length; i++) if (ZONES[i].on) return true; return false; }
    function anyBullet() { for (let i = 0; i < enemies.length; i++) if (enemies[i]._tut && enemies[i].type === 'enemy_bullet' && enemies[i].hp > 0) return true; return false; }

    function updatePattern(dt) {
        const P = T.pat, S = T.S;
        if (!P) return;
        P.c += dt;
        if (!P.emitted && P.c >= EMIT_AT) emit(P);
        updateZones(dt);
        if (P.emitted && !P.done) {
            P.endT += dt;
            const over = (P.id === 'bullets' ? !anyBullet() : !anyZone()) && P.endT > 500;
            if (over || P.endT > 14000) { P.done = true; P.endT = 0; }
        }
        if (P.done && P.c >= CAST_MS - 200) {
            const hit = T.hitSeq > P.hit0;
            T.pat = null;
            for (let i = 0; i < enemies.length; i++) if (enemies[i]._tut && enemies[i].type === 'enemy_bullet') enemies[i].hp = 0;
            if (hit) { S.tries++; setMessage('again'); S.phase = 'result'; S.resultT = 0; S.result = 'retry'; }
            else { if (!S.tries) T.stats.firstTry++; playSfx('tut-pass'); burst(player.x, player.y, 0, 18); ring(player.x, player.y, 0, 100); setMessage('good'); S.phase = 'result'; S.resultT = 0; S.result = 'next'; }
        }
    }

    function updateKanade(dt) {
        const K = T.K;
        K.t += dt;
        const to = K.parkTo;
        if (K.park !== to) K.park = to > K.park ? Math.min(to, K.park + dt / PARK_MS) : Math.max(to, K.park - dt / PARK_MS);
        if (K.mode === 'lead' && K.t >= LEAD_MS) { setMode('gate'); playSfx('kanade-gate-open'); }
        else if (K.mode === 'gate' && K.t >= BEAT.gate) { setMode('walk'); playSfx('kanade-emerge'); }
        else if (K.mode === 'walk' && K.t >= BEAT.walk) { setMode('idle'); K.gateT = -1; K.talk = true; playSfx('tut-speech-open'); }
        else if (K.mode === 'cast' && K.t >= CAST_MS) setMode('idle');
        else if (K.mode === 'gate2' && K.t >= BEAT.gate) { setMode('leave'); playSfx('kanade-depart'); }
        else if (K.mode === 'leave' && K.t >= BEAT.leave) setMode('close');
        else if (K.mode === 'close' && K.t >= BEAT.close) { finish(); return; }
        if (K.out && K.mode === 'idle' && K.park <= 0.001) { K.out = false; K.talk = false; setMode('gate2'); playSfx('kanade-gate-open'); }
    }

    function updateMobile(dt) {
        T.mobileT -= dt;
        if (T.mobileT > 0 || !mobile()) return;
        T.mobileT = 400;
        const now = performance.now();
        for (let i = 0; i < SLOTS.length; i++) {
            const k = SLOTS[i], el = document.getElementById(MOBILE_ID[k]);
            if (!el) continue;
            const on = !!T.shown[k];
            el.style.visibility = on ? '' : 'hidden';
            el.style.pointerEvents = on ? '' : 'none';
            el.classList.toggle('tut-glow', on && (T.glow[k] || 0) > now);
        }
    }

    function restoreMobile() {
        for (const k in MOBILE_ID) {
            const el = document.getElementById(MOBILE_ID[k]);
            if (el) { el.style.visibility = ''; el.style.pointerEvents = ''; el.classList.remove('tut-glow'); }
        }
    }

    window.updateTutorial = function (dt) {
        if (!T.on) return;
        dt = Math.min(skillShiftActive ? dt / 0.15 : dt, 50);
        T.t += dt;
        updateFx(dt);
        T.reaction = Math.max(0, (T.reaction || 0) - dt);
        updateExpression(dt);
        updateKanade(dt);
        if (!T.on) return;
        updateMobile(dt);
        if (T.toastT > 0) { T.toastT -= dt; if (T.toastT <= 0) hideToast(); }
        const S = T.S;
        if (!S) { if (T.K.talk) nextStep(); return; }
        if (S.def.tick) S.def.tick(S);
        const adv = T.advance; T.advance = false;
        if (S.phase === 'lines') {
            if (!T.K.talk) return;
            if (!S.full) {
                S.typed += dt / TYPE_MS;
                if (adv) S.typed = S.text.length;
                if (S.typed >= S.text.length) { S.typed = S.text.length; S.full = true; S.hold = 0; }
            } else {
                S.hold += dt;
                const last = S.li >= S.keys.length - 1;
                const auto = !(last && (S.def.wait || S.def.pattern));
                if (adv || (auto && S.hold > HOLD_BASE + HOLD_PER_CHAR * S.text.length) || (!auto && S.hold > 350)) { S.li++; startLine(); }
            }
        } else if (S.phase === 'wait') {
            S.waitT += dt;
            if (!S.hint && S.waitT > HINT_AFTER) S.hint = tx('hintWait');
            if (S.def.wait(S) || S.waitT > SKIP_AFTER) nextStep();
        } else if (S.phase === 'sigil') {
            if (!window._sigilPicker) { T.picker = null; nextStep(); }
        } else if (S.phase === 'pattern') {
            updatePattern(dt);
        } else if (S.phase === 'result') {
            if (!S.full) { S.typed += dt / TYPE_MS; if (adv) S.typed = S.text.length; if (S.typed >= S.text.length) { S.typed = S.text.length; S.full = true; } }
            else {
                S.resultT += dt;
                if (S.resultT > 1500 || adv) {
                    if (S.result === 'retry') {
                        if (S.tries >= 3 && !S.hinted) { S.hinted = true; setMessage('hint' + S.def.pattern[0].toUpperCase() + S.def.pattern.slice(1)); S.resultT = 0; S.result = 'hint'; }
                        else { startPattern(S.def.pattern); S.phase = 'pattern'; }
                    } else if (S.result === 'hint') { startPattern(S.def.pattern); S.phase = 'pattern'; }
                    else nextStep();
                }
            }
        } else if (S.phase === 'outro') {
            if (T.K.mode !== 'idle') S.text = '';
        }
        typeSound(S);
        updateZones(S.phase === 'pattern' ? 0 : dt);
    };

    function onKey(e) { if (window._sigilPicker) return; if (e.code === 'Enter') T.advance = true; }
    function onPointer(e) {
        if (window._sigilPicker) return;
        const t = e.target;
        if (t && t.closest && t.closest('.mb, button, #debug-console-panel, #dbgFab')) return;
        T.advance = true;
    }

    function ensureToast() {
        let el = document.getElementById('tut-toast');
        if (el) return el;
        const st = document.createElement('style');
        st.id = 'tut-style';
        st.textContent = [
            '#tut-toast{position:fixed;top:54%;right:12px;width:min(46vw,300px);z-index:250;pointer-events:none;opacity:0;transform:translateX(18px);transition:opacity .25s ease,transform .25s ease;',
            'background:linear-gradient(180deg,#0b0820,#060414);border:1.5px solid #b98cff;border-radius:4px;box-shadow:0 0 22px rgba(150,100,255,.35);overflow:hidden;font-family:"Segoe UI",system-ui,sans-serif;}',
            '#tut-toast.on{opacity:1;transform:none;}',
            '#tut-toast img{display:block;width:100%;height:auto;image-rendering:auto;background:#050310;}',
            '#tut-toast img[hidden]{display:none;}',
            '#tut-toast .cap{padding:8px 10px;font-size:12px;line-height:1.4;color:#e8e0ff;letter-spacing:.2px;}',
            '#tut-toast .tag{padding:5px 10px 0;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#b98cff;font-weight:700;}',
            '.mb.tut-glow{animation:tut-glow 1s ease-in-out infinite;}',
            '@keyframes tut-glow{0%,100%{box-shadow:0 0 0 0 rgba(185,140,255,.9)}50%{box-shadow:0 0 0 12px rgba(185,140,255,0)}}',
            '@media (max-width:600px) and (orientation:portrait){#tut-toast{top:58%;width:min(60vw,260px)}}',
            '@media (max-height:520px) and (orientation:landscape){#tut-toast{top:46%;width:min(32vw,220px)}#tut-toast .cap{font-size:11px;padding:6px 8px}}',
            '@media (prefers-reduced-motion:reduce){#tut-toast{transition:none}.mb.tut-glow{animation:none}}'
        ].join('');
        document.head.appendChild(st);
        el = document.createElement('div');
        el.id = 'tut-toast';
        el.innerHTML = '<img alt="" hidden><div class="tag">Kanade</div><div class="cap"></div>';
        document.body.appendChild(el);
        el.querySelector('img').addEventListener('error', function () { this.hidden = true; });
        el.querySelector('img').addEventListener('load', function () { this.hidden = false; });
        return el;
    }
    function showToast(key) {
        const def = TOASTS[key];
        if (!def) return;
        const el = ensureToast(), img = el.querySelector('img');
        img.hidden = true;
        img.src = def.img;
        el.querySelector('.cap').textContent = tx(def.cap);
        el.classList.add('on');
        T.toastT = TOAST_MS;
        playSfx('tut-toast');
    }
    function hideToast() { const el = document.getElementById('tut-toast'); if (el) el.classList.remove('on'); }

    function lerp(a, b, k) { return a + (b - a) * k; }
    let _gx = 0, _gy = 0;
    const _speaker = { x: 0, y: 0, w: 0 };
    const _poseStyle = { tick: -1, mode: '', expression: 'neutral', blink: 0, from: 0, gesture: 0, progress: 0, gazeX: 0, gazeY: 0, turn: 0 };
    let _idlePose = null, _pose = null, _poseBeat = '', _poseNow = -1, _hand = null;
    function cachedPose(S, L, beat, p, now) {
        if (!_pose || _poseBeat !== beat || _poseNow !== now) {
            const same = _pose && _poseBeat === beat, x = same ? _pose.motionX : 0, y = same ? _pose.motionY : 0, scale = same ? _pose.motionScale : 1, period = same ? Math.max(12, Math.min(100, now - _poseNow)) : 16;
            _pose = S.poseFor(L, beat, p, now); _poseBeat = beat; _poseNow = now; _hand = null;
            if (_pose) {
                _pose.baseX = _pose.x; _pose.baseY = _pose.y; _pose.baseScale = _pose.scale; _pose.baseBlink = _pose.opts.blinkAmount || 0;
                _pose.fromX = same ? x : _pose.x; _pose.fromY = same ? y : _pose.y; _pose.fromScale = same ? scale : _pose.scale; _pose.sampleAt = T.t; _pose.period = period;
            }
        }
        if (_pose) {
            const f = clamp01((T.t - _pose.sampleAt) / _pose.period);
            _pose.x = _pose.motionX = lerp(_pose.fromX, _pose.baseX, f); _pose.y = _pose.motionY = lerp(_pose.fromY, _pose.baseY, f); _pose.scale = _pose.motionScale = lerp(_pose.fromScale, _pose.baseScale, f); _pose.opts.blinkAmount = _pose.baseBlink;
        }
        return _pose;
    }

    // A temporary surface tints the departure silhouette during the turn.
    const TURN = { canvas: null, ctx: null, side: 0 };
    function captureBody(source) { TURN.ctx.drawImage(source, 0, 0, TURN.side, TURN.side); }
    function drawSpriteFrame(S, L, pose) {
        if (pose.flash <= 0.01) { S.blitSprite(L, pose.x, pose.y, pose.scale, pose.alpha); return; }
        if (!TURN.canvas) { TURN.canvas = document.createElement('canvas'); TURN.ctx = TURN.canvas.getContext('2d'); }
        const side = Math.max(180, Math.min(540, Math.ceil(L.box)));
        if (TURN.side !== side) { TURN.side = side; TURN.canvas.width = TURN.canvas.height = side; }
        const g = TURN.ctx; g.clearRect(0, 0, side, side);
        const draw = ctx.drawImage;
        try { ctx.drawImage = captureBody; S.blitSprite(L, 0, 0, 1, 1); }
        finally { ctx.drawImage = draw; }
        g.globalCompositeOperation = 'source-atop'; g.globalAlpha = pose.flash * 0.92; g.fillStyle = '#fff8ff'; g.fillRect(0, 0, side, side); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        const w = L.box * pose.scale;
        ctx.save(); ctx.globalAlpha = pose.alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(TURN.canvas, pose.x - w / 2, pose.y - w / 2, w, w); ctx.restore();
    }

    const PARTICLES = Array.from({ length: 96 }, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: 0 }; });
    const RINGS = Array.from({ length: 8 }, function () { return { x: 0, y: 0, life: 0, color: 0, r: 0 }; });
    const COLORS = ['#f5d589', '#ec7caf', '#c79dff'];
    const TYPE_SOUNDS = ['tut-type-a', 'tut-type-b', 'tut-type-c'];
    const GESTURES = ['rest', 'chest', 'palm', 'present', 'point', 'beckon'];
    const EXPRESSIONS = ['neutral', 'serene', 'smug', 'determined', 'happy', 'surprised', 'sad', 'thinking', 'angry', 'pain'];
    const SNAP = { lean: 3, trail: 3, whip: 3, castExt: 32, hairWind: 3, hairEnergy: 5, hairImpact: 5, hairBoost: 10, headTurn: 250, gazeX: 5, gazeY: 5, blinkAmount: 5 };
    const LINE_STYLE = {
        intro1: ['serene', 1], intro2: ['serene', 2], move: ['determined', 4], moveM: ['determined', 4],
        sigils: ['determined', 3], skills: ['determined', 3], skillA: ['serene', 3], skillS: ['serene', 3], skillD: ['smug', 3], skillF: ['smug', 3], skillG: ['serene', 3],
        monsters: ['determined', 4], afterMonsters: ['serene', 2], dodgeIntro: ['determined', 4],
        patBullets: ['determined', 4], patStrip: ['determined', 4], patCircle: ['determined', 4], patSector: ['determined', 4], patShift: ['determined', 1], patShiftM: ['determined', 1],
        outro1: ['happy', 1], outro2: ['serene', 2]
    };
    function quality() { return Math.max(window._gfxLevel || 0, typeof _mobPerf !== 'undefined' && _mobPerf ? 1 : 0); }
    function fxEnabled(key) { return !window._fxOpts || window._fxOpts[key] !== false; }
    function snapOpts(o) { for (const k in SNAP) if (typeof o[k] === 'number') o[k] = Math.round(o[k] * SNAP[k]) / SNAP[k]; }
    function burst(x, y, color, n) {
        if (!fxEnabled('particles')) return;
        n = Math.ceil(n / (1 + quality()));
        for (let i = 0; i < PARTICLES.length && n > 0; i++) {
            const p = PARTICLES[i]; if (p.life > 0) continue;
            const a = i * 2.39996 + T.t, v = 0.04 + (i % 7) * 0.012;
            p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 0.025; p.life = p.max = 550 + (i % 5) * 90; p.color = color; n--;
        }
    }
    function ring(x, y, color, r) {
        if (!fxEnabled('glow')) return;
        for (let i = 0; i < RINGS.length; i++) if (RINGS[i].life <= 0) { const p = RINGS[i]; p.x = x; p.y = y; p.color = color; p.r = r; p.life = 650; break; }
    }
    function updateFx(dt) {
        for (let i = 0; i < PARTICLES.length; i++) { const p = PARTICLES[i]; if (p.life <= 0) continue; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        for (let i = 0; i < RINGS.length; i++) RINGS[i].life -= dt;
    }
    function drawStar(x, y, r) {
        ctx.beginPath();
        for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, d = k % 2 ? r * 0.28 : r; if (k) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else ctx.moveTo(x + d, y); }
        ctx.closePath(); ctx.fill();
    }
    function drawFx() {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
        if (fxEnabled('particles')) for (let i = 0; i < PARTICLES.length; i++) { const p = PARTICLES[i]; if (p.life <= 0) continue; ctx.globalAlpha = p.life / p.max; ctx.fillStyle = COLORS[p.color]; drawStar(p.x, p.y, 3); }
        if (fxEnabled('glow')) for (let i = 0; i < RINGS.length; i++) { const p = RINGS[i]; if (p.life <= 0) continue; ctx.globalAlpha = p.life / 650; ctx.strokeStyle = COLORS[p.color]; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - p.life / 650), 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
    }
    function typeSound(S) {
        if (S.full || (S.phase !== 'lines' && S.phase !== 'result')) return;
        const end = Math.floor(S.typed); let n = T.typeN;
        for (let i = T.typeAt; i < end; i++) if (S.text[i] !== ' ') n++;
        if (n >= 2 && T.t - T.typeSound >= 50) { playSfx(TYPE_SOUNDS[end % 3]); T.typeSound = T.t; n = 0; }
        T.typeAt = end; T.typeN = n;
    }
    function updateExpression(dt) {
        const S = T.S, m = T.K.mode, style = S && LINE_STYLE[S.keys[S.li]];
        let e = style ? style[0] : 'serene', gesture = style ? style[1] : 0;
        if (m === 'walk' || m === 'gate' || m === 'lead') { e = 'neutral'; gesture = 0; }
        else if (m === 'cast' || m === 'leave' || m === 'gate2') { e = 'smug'; gesture = 0; }
        else if (S) {
            if (S.phase === 'result') { e = S.result === 'next' ? (S.resultT < 1200 ? 'happy' : 'serene') : S.result === 'hint' ? 'thinking' : S.tries >= 3 ? 'sad' : 'determined'; gesture = S.result === 'next' ? 2 : 5; }
            else if (S.phase === 'wait') { e = S.waitT > HINT_AFTER ? 'serene' : 'thinking'; gesture = 0; }
            else if (S.phase === 'outro' || S.phase === 'sigil') gesture = 0;
        }
        if (T.reaction > 900 && m !== 'walk' && m !== 'leave') { e = 'surprised'; if (m === 'idle') gesture = 5; }
        if (T.debugPose) { e = T.debugPose.expression; gesture = T.debugPose.gesture; }
        T.expressionAge += dt;
        if (e !== T.targetExpression && T.blinkT >= 300 && (T.expressionAge >= 900 || T.expression === 'surprised' && T.expressionAge >= 500)) { T.targetExpression = e; T.blinkT = 0; }
        T.blinkT = Math.min(300, T.blinkT + dt);
        if (T.blinkT >= 110 && T.expression !== T.targetExpression) { T.expression = T.targetExpression; T.expressionAge = 0; }
        T.gestureT = Math.min(1, T.gestureT + dt / 720);
        if (T.gestureT === 1 && T.gesture === gesture) T.gestureFrom = gesture;
        if (T.gestureT === 1 && T.gesture !== gesture) { T.gestureFrom = T.gesture; T.gesture = gesture; T.gestureT = 0; }
        T.gestureWanted = gesture;
    }
    function drawEmitter(x, y, r, a, now) {
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.strokeStyle = '#b78bed'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.rotate(now * .0016); ctx.strokeStyle = '#e8c46a'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; ctx.moveTo(Math.cos(an) * r * .3, Math.sin(an) * r * .3); ctx.lineTo(Math.cos(an) * r * .95, Math.sin(an) * r * .95); } ctx.stroke();
        if (quality() < 2 && fxEnabled('glow')) {
            ctx.rotate(-now * .0032); ctx.font = '10px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8c46a';
            for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * Math.PI / 6); ctx.fillText('ΙΧΦΨ'[i % 4], 0, -r * 1.16); ctx.restore(); }
            ctx.strokeStyle = '#c9a8ff'; ctx.beginPath();
            for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + now * .0006, d = r * (1 - (now / 900 + i / 8) % 1); ctx.moveTo(Math.cos(an) * d, Math.sin(an) * d); ctx.lineTo(Math.cos(an) * (d + 5), Math.sin(an) * (d + 5)); } ctx.stroke();
        }
        ctx.restore();
    }
    function drawZones(now) {
        const S = stage(), glow = quality() < 2 && fxEnabled('glow') && S ? S.energyGlow() : null;
        for (let i = 0; i < ZONES.length; i++) {
            const z = ZONES[i]; if (!z.on) continue;
            if (!z.fired) {
                const p = clamp01(z.t / z.tele);
                if (z.kind === 'domain') { ctx.save(); ctx.globalAlpha = p * .5; ctx.fillStyle = '#10051e'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = .8; ctx.strokeStyle = '#e6c97c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, Math.max(4, z.r * (1 - p)), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
                if (typeof _drawDangerZone === 'function') {
                    if (z.kind === 'strip') _drawDangerZone('strip', z.x, z.y, z.len, p, .6, now, z.ang, z.hw);
                    else if (z.kind === 'sector') _drawDangerZone('sector', z.x, z.y, z.r, p, .6, now, z.ang, 0, z.span);
                    else _drawDangerZone('circle', z.x, z.y, z.r, p, .6, now);
                }
                continue;
            }
            ctx.save(); ctx.translate(z.x, z.y);
            const live = z.strike <= z.life, f = live ? 1 : 1 - clamp01((z.strike - z.life) / 450);
            ctx.globalAlpha = f * (live ? .8 : .12); ctx.strokeStyle = '#c987ff'; ctx.fillStyle = '#a060dc';
            if (live) ctx.globalCompositeOperation = 'lighter';
            if (z.kind === 'strip') {
                ctx.rotate(z.ang); const reach = z.len * clamp01(z.strike / 120);
                if (glow) { ctx.globalAlpha = f * .35; ctx.drawImage(glow, 0, -z.hw * 2, Math.max(1, reach), z.hw * 4); ctx.globalAlpha = f * .8; }
                ctx.fillRect(0, -z.hw, reach, z.hw * 2); ctx.strokeStyle = '#d6a9ff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0);
                for (let k = 1; k <= 12; k++) ctx.lineTo(reach * k / 12, Math.sin(k * 19 + Math.floor(now / 55)) * z.hw * .5);
                ctx.stroke(); ctx.strokeStyle = '#fff8ef'; ctx.lineWidth = 2; ctx.stroke();
                if (glow && live) { ctx.fillStyle = '#ffecc8'; drawStar(reach, 0, 14 * unit()); }
                if (live && quality() < 2) for (let k = 2; k < 10; k += 2) { const x = reach * k / 12; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 12, z.hw * .8); ctx.lineTo(x + 28, z.hw * .5); ctx.stroke(); }
            } else if (z.kind === 'sector') {
                const a = z.ang - z.span / 2, edge = a + z.span * clamp01(z.strike / 380);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, z.r, a, edge); ctx.closePath(); ctx.globalAlpha *= .24; ctx.fill();
                ctx.globalAlpha = f; ctx.strokeStyle = '#fff0ce'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(edge) * z.r, Math.sin(edge) * z.r); ctx.stroke();
                ctx.strokeStyle = '#bd7aff'; ctx.lineWidth = 16; ctx.globalAlpha *= .3; ctx.stroke();
                if (glow && live) { ctx.fillStyle = '#f9e2ae'; ctx.globalAlpha = f; drawStar(Math.cos(edge) * z.r, Math.sin(edge) * z.r, 9); }
                if (quality() < 2 && live) { ctx.globalAlpha = .8; ctx.strokeStyle = '#e8bfed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, z.r * .85, Math.max(a, edge - .18), edge); ctx.stroke(); }
            } else if (z.kind === 'domain') {
                ctx.fillStyle = '#dfc5ff'; ctx.globalAlpha *= .4 * (fxEnabled('screenFlash') ? 1 : 0); ctx.fillRect(-z.x, -z.y, canvas.width, canvas.height);
                ctx.globalAlpha = f; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, z.r * clamp01(z.strike / 240), 0, Math.PI * 2); ctx.stroke();
                if (glow) { const r = z.r * clamp01(z.strike / 240); ctx.globalAlpha = f * .45; ctx.lineWidth = 2; ctx.strokeStyle = '#f2d797'; ctx.beginPath(); ctx.arc(0, 0, r * .72, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fce8bf'; drawStar(0, 0, 40 * (1 - clamp01(z.strike / 240))); }
            } else if (z.strike < 160) {
                const y = (z.ey - z.y) * (1 - z.strike / 160);
                if (glow) { ctx.globalAlpha = f * .65; ctx.drawImage(glow, -42, y - 42, 84, 84); ctx.globalAlpha = f; }
                ctx.fillStyle = '#f9ebff'; ctx.beginPath(); ctx.arc(0, y, 13 * unit(), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c599ff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, y - 45); ctx.lineTo(0, y); ctx.stroke();
            } else {
                const r = Math.max(1, z.r * clamp01((z.strike - 160) / 140));
                if (glow) { ctx.globalAlpha = f * .3; ctx.drawImage(glow, -r * 1.3, -r * 1.3, r * 2.6, r * 2.6); ctx.globalAlpha = f * .8; }
                ctx.globalAlpha *= .18; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = f; ctx.lineWidth = 7; ctx.strokeStyle = '#fce3ff'; ctx.stroke();
                if (quality() < 2) { ctx.globalAlpha *= .3; ctx.lineWidth = 16; ctx.strokeStyle = '#b378ff'; ctx.stroke(); ctx.fillStyle = '#f5d589'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; drawStar(Math.cos(a) * r, Math.sin(a) * r, 5 * f); } }
            }
            ctx.restore();
        }
    }
    function wrapLines(text, maxW, font) {
        if (_lineCache.text === text && _lineCache.width === maxW && _lineCache.font === font) return _lineCache.lines;
        ctx.font = font; const words = text.split(' '), lines = []; let cur = '';
        for (let i = 0; i < words.length; i++) { const t = cur ? cur + ' ' + words[i] : words[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = words[i]; } else cur = t; }
        if (cur) lines.push(cur); _lineCache.text = text; _lineCache.width = maxW; _lineCache.font = font; _lineCache.lines = lines; _lineCache.segments = new Array(lines.length); _lineCache.typed = -1; return lines;
    }
    function cutPath(x, y, w, h, c) { ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c); ctx.closePath(); }
    function drawSpeech(kx, ky, fw, now) {
        const S = T.S; if (!S || !S.text || !T.K.talk || S.phase === 'outro' || S.phase === 'sigil') return;
        const u = unit(), W = canvas.width, portrait = canvas.height > canvas.width * 1.15, fs = Math.max(14, Math.min(22, Math.round(15 * u)));
        if (fontUnit !== u) { fontUnit = u; speechFont = fs + 'px "Segoe UI",system-ui,sans-serif'; nameFont = '700 ' + Math.max(9, Math.round(10 * u)) + 'px "Segoe UI",sans-serif'; }
        let bx, by, bw; if (portrait) { bx = 10 * u; bw = W - 20 * u; by = ky + fw * .5 + 8 * u; } else { bx = kx + fw * .4; bw = Math.min(W - bx - 14 * u, 540 * u); by = Math.max(10 * u, ky - fw * .42); }
        const pad = 14 * u, lines = wrapLines(S.text, bw - pad * 2, speechFont), lh = fs * 1.38, bh = pad * 2 + 16 * u + lines.length * lh + (S.hint ? lh : 0);
        T.speechBottom = by + bh; ctx.save(); ctx.globalAlpha = .94; cutPath(bx, by, bw, bh, 12 * u); ctx.fillStyle = '#0a061c'; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#b98cff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = nameFont; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = '#b98cff'; ctx.fillText('K A N A D E', bx + pad, by + 7 * u); ctx.font = speechFont; ctx.fillStyle = '#f2ecff';
        const typed = Math.floor(S.typed);
        if (_lineCache.typed !== typed) {
            _lineCache.typed = typed; let left = typed, visible = 0;
            for (let i = 0; i < lines.length && left > 0; i++) { _lineCache.segments[i] = lines[i].length <= left ? lines[i] : lines[i].slice(0, left); left -= lines[i].length + 1; visible++; }
            _lineCache.visible = visible;
        }
        let y = by + pad + 16 * u;
        for (let i = 0; i < _lineCache.visible; i++) { ctx.fillText(_lineCache.segments[i], bx + pad, y); y += lh; }
        if (S.hint) { ctx.fillStyle = '#b98cff'; ctx.fillText(S.hint, bx + pad, y); }
        ctx.restore();
    }
    function drawHudGlow(now) {
        if (mobile() || !T.on) return;
        const pW = 124, pH = 22, rowGap = 4, padY = 6, panelH = padY * 2 + 6 * pH + 5 * rowGap + 8 + 1 + pH, panelY = canvas.height - 14 - panelH;
        for (let i = 0; i < SLOTS.length; i++) {
            const k = SLOTS[i], g = (T.glow[k] || 0) - performance.now(); if (g <= 0 || !T.shown[k]) continue;
            const y = k === 'SPC' ? panelY + padY + 6 * (pH + rowGap) - rowGap + 9 : panelY + padY + HUD_ROW[k] * (pH + rowGap);
            ctx.save(); ctx.globalAlpha = Math.min(1, g / 600) * (.75 + .25 * Math.sin(now * .012)); ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 2.5; ctx.strokeRect(7, y - 3, pW + 6, pH + 6); ctx.restore();
        }
    }

    function drawKanadeLayer(now, dt) {
        const K = T.K, S = stage();
        if (!S || K.mode === 'hidden') return null;
        const L = S.layout(), qstep = quality() >= 2 ? 1000 / 24 : quality() === 1 ? 1000 / 30 : 1000 / 60, qnow = Math.floor(now / qstep) * qstep, t = (qnow / 900) % 1;
        let pose = null, gateOpen = 0, gateBeat = null, gateP = 0, dustBeat = null, dustP = 0;
        const m = K.mode;
        if (m === 'gate') { gateBeat = 'gate'; gateP = clamp01(K.t / BEAT.gate); dustBeat = 'gate'; dustP = gateP; }
        else if (m === 'walk') { gateP = clamp01(K.t / BEAT.walk); gateBeat = 'walkOut'; dustBeat = 'walkOut'; dustP = gateP; pose = cachedPose(S, L, 'walkOut', gateP, qnow); }
        else if (m === 'idle') {
            _idlePose = cachedPose(S, L, 'think', 0.5, qnow);
            pose = _idlePose;
        }
        else if (m === 'cast') {
            const c = K.t;
            pose = c < 1800 ? cachedPose(S, L, 'summon', c / 1800, qnow) : cachedPose(S, L, 'cast', clamp01((c - 1800) / 2400), qnow);
        } else if (m === 'gate2') { gateBeat = 'gate'; gateP = clamp01(K.t / BEAT.gate); dustBeat = 'gate'; dustP = gateP; pose = cachedPose(S, L, 'think', 0.5, qnow); }
        else if (m === 'leave') { gateP = clamp01(K.t / BEAT.leave); gateBeat = 'leave'; dustBeat = 'leave'; dustP = gateP; pose = cachedPose(S, L, 'leave', gateP, qnow);
            const p = gateP, q = clamp01((p - 0.30) / 0.60);
            pose.back = p >= 0.24; pose.flash = p >= 0.18 && p <= 0.30 ? Math.sin((p - 0.18) / 0.12 * Math.PI) : 0;
            pose.x = lerp(L.standX, L.gateX, ease(q)); pose.y = L.centerY - 12 * Math.sin(q * Math.PI); pose.scale = 1 - q * 0.20; pose.alpha = q > 0.72 ? clamp01(1 - (q - 0.72) / 0.28) : 1;
        }
        else if (m === 'close') { gateP = clamp01(K.t / BEAT.close); gateBeat = 'close'; dustBeat = 'close'; dustP = gateP; }
        if (gateBeat) gateOpen = gateBeat === 'leave' ? 1 : S.gateOpenness(gateBeat, gateP);
        K.spin += dt * gateOpen;
        const gateAlpha = ease(clamp01((gateOpen - 0.10) / 0.50));
        if (gateAlpha > 0.01) {
            S.drawGateDust(L, S.gateDustSpread(dustBeat, gateOpen), S.gateDust(dustBeat, dustP) * gateAlpha, now);
            S.drawGate(L.gateX, L.centerY, L.gateR, gateOpen, gateAlpha, now, K.spin);
        }
        let hx = 0, hy = 0, hs = 1;
        if (pose) {
            if (_poseStyle.tick !== qnow || _poseStyle.mode !== m) {
                _poseStyle.tick = qnow; _poseStyle.mode = m;
                const changed = _poseStyle.expression !== T.expression;
                _poseStyle.expression = T.expression;
                _poseStyle.blink = changed ? 1 : T.blinkT < 110 ? T.blinkT / 110 : T.blinkT < 150 ? 1 : T.blinkT < 300 ? 1 - (T.blinkT - 150) / 150 : 0;
                _poseStyle.from = T.gestureFrom; _poseStyle.gesture = T.gesture; _poseStyle.progress = Math.round(ease(T.gestureT) * 24) / 24;
                const skill = T.S && T.S.def.id === 'skills', think = T.expression === 'thinking';
                _poseStyle.gazeX = skill ? -0.4 : think ? -0.6 : Math.max(-0.6, Math.min(0.6, (player.x - pose.x) / canvas.width));
                _poseStyle.gazeY = skill ? 0.6 : think ? -0.2 : 0.4; _poseStyle.turn = T.expression === 'determined' ? 0.008 : 0;
            }
            pose.opts.expression = _poseStyle.expression;
            pose.opts.blinkAmount = m === 'idle' ? _poseStyle.blink : Math.max(pose.opts.blinkAmount || 0, _poseStyle.blink);
            if (m === 'idle') {
                pose.opts.gestureFrom = _poseStyle.from; pose.opts.gesture = _poseStyle.gesture; pose.opts.gestureT = _poseStyle.progress;
                pose.opts.gazeX = _poseStyle.gazeX; pose.opts.gazeY = _poseStyle.gazeY; pose.opts.headTurn = _poseStyle.turn;
            } else { pose.opts.gestureFrom = 0; pose.opts.gesture = 0; pose.opts.gestureT = 0; }
            pose.opts.tutorialMotion = true;
            snapOpts(pose.opts);
            const e = ease(clamp01(K.park)), portrait = L.portrait;
            const px = canvas.width * (portrait ? 0.2 : 0.13), py = canvas.height * (portrait ? 0.2 : 0.25), ps = portrait ? 0.55 : (canvas.height < 560 ? 0.78 : 0.5);
            pose.x = lerp(pose.x, px, e); pose.y = lerp(pose.y, py, e); pose.scale *= lerp(1, ps, e);
            S.fitSpriteBuffer(L.box);
            if (pose.back) S.drawKanadeBack(t, pose.opts); else S.drawKanade(t, pose.opts);

            if (!pose.back && fxEnabled('glow')) {
                const u = L.box * pose.scale / 180;
                ctx.save(); ctx.globalAlpha = pose.alpha * 0.65; ctx.strokeStyle = '#a9ebd8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(pose.x + 2 * u, pose.y - 64 * u, 20 * u, 5 * u, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            }

            drawSpriteFrame(S, L, pose);
            if (pose.charge && S.handPos) {
                const hp = _hand || (_hand = S.handPos(L, pose, t));
                if (hp) {
                    const r = L.box * pose.scale * (0.06 + 0.12 * pose.charge);
                    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * pose.charge;
                    ctx.drawImage(S.energyGlow(), hp.x - r, hp.y - r, r * 2, r * 2);
                    ctx.restore();
                    if (T.pat && fxEnabled('glow')) {
                        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#d2a6ff'; ctx.globalAlpha = 0.35 * pose.charge; ctx.lineWidth = 1;
                        const P = T.pat, count = P.ex.length || (P.id === 'bullets' ? 3 : 1);
                        for (let i = 0; i < count; i++) { const x = P.ex.length ? P.ex[i].x : canvas.width * (count === 3 ? 0.22 + i * 0.28 : 0.5), y = P.ex.length ? P.ex[i].y : emitterY(); ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.quadraticCurveTo((hp.x + x) / 2, hp.y - 50, x, y); ctx.stroke(); }
                        ctx.restore();
                    }
                }
            }
            hx = pose.x; hy = pose.y; hs = pose.scale * L.box;
        }

        _gx = hx; _gy = hy;
        _speaker.x = hx; _speaker.y = hy; _speaker.w = hs;
        return pose ? _speaker : null;
    }

    let _lastDraw = 0;
    window.drawTutorial = function () {
        if (!T.on || window._sigilPicker) return;
        const now = nowMs(), dt = Math.max(0, Math.min(60, now - (_lastDraw || now)));
        _lastDraw = now;
        drawZones(now);
        const P = T.pat;
        if (P && P.emitted) {
            for (let i = 0; i < P.ex.length; i++) drawEmitter(P.ex[i].x, P.ex[i].y, 38 * unit(), P.done ? clamp01(1 - P.endT / 500) : 1, now);
        } else if (P && P.c > 600) {
            const W = canvas.width, a = clamp01((P.c - 600) / 900);
            const u = unit(), EY = emitterY();
            const count = P.id === 'bullets' ? 3 : 1;
            for (let i = 0; i < count; i++) drawEmitter(W * (count === 3 ? 0.22 + i * 0.28 : 0.5), EY, 38 * u * a, a * 0.8, now);
        }
        drawFx();
        const k = drawKanadeLayer(now, dt);
        drawHudGlow(now);
        if (k) drawSpeech(k.x, k.y, k.w, now);
        else if (T.S && T.K.talk) drawSpeech(canvas.width * 0.13, canvas.height * 0.25, 120, now);
    };

    function installWrappers() {
        T.orig = {};
        const hit = window.playerTakesHit;
        if (typeof hit === 'function') {
            T.orig.playerTakesHit = hit;
            window.playerTakesHit = function (attacker) {
                if (T.on && attacker && attacker._tut && attacker.type === 'enemy_bullet' && !skillShiftActive) { window._tutorialOnHit(); return true; }
                return hit.apply(this, arguments);
            };
        }
        ['A', 'S', 'D', 'F', 'G'].forEach(function (k) {
            const name = 'activateSkill' + k, orig = window[name];
            if (typeof orig !== 'function') return;
            T.orig[name] = orig;
            window[name] = function () { if (T.on && !T.shown[k]) return; return orig.apply(this, arguments); };
        });
    }
    function removeWrappers() {
        if (!T.orig) return;
        for (const name in T.orig) window[name] = T.orig[name];
        T.orig = null;
    }

    function cleanup() {
        if (T.picker && (!window._sigilPicker || window._sigilPicker === T.picker)) {
            window._sigilPicker = null; const el = document.getElementById('sigil-pick-overlay'); if (el) el.style.display = 'none';
        }
        T.picker = null;
        if ((T.on || window._tutorialActive) && typeof skillShiftActive !== 'undefined' && skillShiftActive) {
            skillShiftActive = false; window._shiftActive = false; window._shiftTeleportUsed = false;
            if (window.AudioMgr && window.AudioMgr.exitTimeDomain) window.AudioMgr.exitTimeDomain();
        }
        T.on = false;
        window._tutorialActive = false;
        removeWrappers();
        restoreMobile();
        hideToast();
        if (window.AudioMgr && window.AudioMgr.stopTutorialSfx) window.AudioMgr.stopTutorialSfx();
        for (let i = 0; i < PARTICLES.length; i++) PARTICLES[i].life = 0;
        for (let i = 0; i < RINGS.length; i++) RINGS[i].life = 0;
        if (TURN.canvas) { TURN.canvas.width = TURN.canvas.height = 0; TURN.side = 0; }
        _idlePose = null; _pose = null; _hand = null; _poseStyle.tick = -1; _poseStyle.mode = ''; _poseStyle.expression = 'neutral'; T.debugPose = null; T.gesture = T.gestureFrom = T.gestureWanted = 0; T.gestureT = 1;
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onPointer, true);
        for (let i = 0; i < ZONES.length; i++) ZONES[i].on = false;
        if (typeof enemies !== 'undefined') for (let i = 0; i < enemies.length; i++) if (enemies[i]._tut) enemies[i].hp = 0;
        T.S = null; T.pat = null; T.K.mode = 'hidden'; T.K.park = 0; T.K.parkTo = 0; T.K.gateT = -1; T.K.spin = 0; T.K.talk = false; T.K.out = false;
    }

    function finish() {
        const stats = T.stats || {}; stats.timeMs = T.t;
        cleanup();
        if (typeof window._tutorialEnd === 'function') { window._tutorialEnd(stats); return; }
        if (typeof window._goToMenuImmediate === 'function') window._goToMenuImmediate();
    }

    window._tutorialPrepare = function () { window._tutorialActive = true; };
    window._tutorialAbort = function () { if (T.on || window._tutorialActive) cleanup(); };

    window.beginTutorial = function () {
        cleanup();
        window._tutorialActive = true;
        T.on = true; T.t = 0; T.i = -1; T.shown = {}; T.glow = {}; T.hitSeq = 0; T.advance = false; T.mobileT = 0; T.toastT = 0; _lastDraw = 0;
        T.stats = { timeMs: 0, attempts: { bullets: 0, strip: 0, circle: 0, sector: 0, shift: 0 }, firstTry: 0, hits: 0, skills: [] };
        T.expression = 'neutral'; T.targetExpression = 'neutral'; T.blinkT = 300; T.expressionAge = 1000; T.reaction = 0; T.gesture = 0; T.gestureFrom = 0; T.gestureT = 1; T.gestureWanted = 0; T.debugPose = null;
        T.steps = buildSteps();
        T.K.mode = 'lead'; T.K.t = 0; T.K.park = 0; T.K.parkTo = 0; T.K.gateT = -1; T.K.spin = 0; T.K.talk = false; T.K.out = false;
        installWrappers();
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('pointerdown', onPointer, true);
        if (window.AudioMgr && window.AudioMgr.prepareEnemy) window.AudioMgr.prepareEnemy('kanade');
        enterStep(0);
    };

    window._tutorialDebug = function (action) {
        if (action === 'restart') {
            if (T.on) cleanup();
            if (typeof window._prepareGameMode === 'function') window._prepareGameMode('tutorial');
            if (typeof startGame === 'function') startGame();
            return window._tutorialState();
        }
        if (!T.on) return 'off';
        if (action === 'next') { if (T.S) { T.S.phase = 'lines'; } T.pat = null; for (let i = 0; i < ZONES.length; i++) ZONES[i].on = false; if (T.K.mode === 'cast') setMode('idle'); T.K.talk = true; nextStep(); }
        else if (action === 'end') finish();
        return T.S ? T.S.def.id + ' / ' + T.S.phase : 'start';
    };
    window._tutorialDebugPose = function (expression, gesture) {
        if (!T.on) return;
        if (expression === 'auto') { T.debugPose = null; return; }
        if (EXPRESSIONS.indexOf(expression) < 0 || GESTURES.indexOf(gesture) < 0) return;
        T.debugPose = { expression: expression, gesture: GESTURES.indexOf(gesture) };
    };
    window._tutorialHitCount = function () { return T.hitSeq; };
    window._tutorialState = function () { return T.on ? (T.S ? T.S.def.id + ' (' + T.S.phase + ')' : 'starting') : 'off'; };
})();
