// Showdown debug panel. Only available on a local host or in Custom mode. F4 or the SD button toggles it.
(function (root) {
    'use strict';

    const isDevHost = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname) || location.protocol === 'file:';
    const allowed = () => isDevHost || root._gameMode === 'custom';
    const state = root._duelDebug = { invuln: false, enemyScale: 1, open: false };
    const session = () => root._duelSession;
    const el = {};
    let panel = null, fab = null, timer = 0;

    function row(html) { const d = document.createElement('div'); d.className = 'sdd-row'; d.innerHTML = html; return d; }

    function build() {
        if (panel) return;
        const style = document.createElement('style');
        style.textContent = '#sdd{position:fixed;top:56px;right:12px;width:290px;max-height:86vh;overflow:auto;z-index:99998;background:rgba(10,4,14,.94);' +
            'border:1px solid #8c6a32;border-radius:6px;color:#e6d3a1;font:11px/1.35 monospace;padding:8px;display:none}' +
            '#sdd .sdd-row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;align-items:center}' +
            '#sdd button{background:#1b0f22;color:#e8c46a;border:1px solid #6b4f26;border-radius:3px;padding:3px 6px;font:11px monospace;cursor:pointer}' +
            '#sdd button:hover{background:#2c1836}#sdd select,#sdd input[type=number]{background:#150b1b;color:#e6d3a1;border:1px solid #6b4f26;font:11px monospace}' +
            '#sdd h4{margin:6px 0 3px;color:#ff6a78;font-size:11px;letter-spacing:.08em}#sdd pre{margin:0 0 6px;white-space:pre-wrap;color:#b8e8ff}' +
            '#sdd-fab{position:fixed;bottom:12px;right:12px;z-index:99998;background:#240a14;color:#ff6a78;border:1px solid #8c6a32;border-radius:4px;' +
            'padding:4px 8px;font:bold 11px monospace;cursor:pointer;display:none}';
        document.head.appendChild(style);

        panel = document.createElement('div'); panel.id = 'sdd';
        el.status = document.createElement('pre'); panel.appendChild(el.status);

        const h = t => { const x = document.createElement('h4'); x.textContent = t; panel.appendChild(x); };
        const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { try { fn(); } catch (e) { console.warn('[SDD]', e); } refresh(); }; return b; };
        const add = (...nodes) => { const r = row(''); nodes.forEach(n => r.appendChild(n)); panel.appendChild(r); };

        h('FLOW');
        add(btn('Skip opening', () => { const s = session(); s._openingSkipped = true; s._openingVoiceStarted = true; s.preBattleElapsed = 20; }),
            btn('Replay opening', () => replay()));
        el.attack = document.createElement('select');
        for (let i = 1; i <= 18; i++) { const o = document.createElement('option'); o.value = i; o.textContent = 'Attack ' + i; el.attack.appendChild(o); }
        add(el.attack, btn('Jump', () => jump(+el.attack.value)));

        h('BOSS');
        add(btn('Kill set', () => { const s = session(); if (s.state === 'playing') s.attacks.hp = 0; }),
            btn('HP 10%', () => { const s = session(); s.attacks.hp = Math.max(1, s.attacks.maxHp * .1); }),
            btn('HP full', () => { const s = session(); s.attacks.hp = s.attacks.maxHp; }));
        add(btn('Force spell change', () => jump(1, 0)),
            btn('Force phase 2', () => jump(6, 0)),
            btn('Force phase 3', () => jump(13, 0)));
        add(btn('Boss death', () => jump(18, 0, true)),
            btn('Ship death', () => { const s = session(); s.lives = 1; s.recoveryRemaining = 0; s.playerShieldActive = false; s.onPlayerHit('bullet'); }));

        h('TOGGLES');
        el.invuln = document.createElement('input'); el.invuln.type = 'checkbox'; el.invuln.onchange = () => { state.invuln = el.invuln.checked; };
        el.autoshot = document.createElement('input'); el.autoshot.type = 'checkbox'; el.autoshot.checked = true;
        el.autoshot.onchange = () => { root._debugSessionActive = true; root._debugAutoshotOff = !el.autoshot.checked; };
        const l1 = document.createElement('label'); l1.append(el.invuln, ' invulnerable');
        const l2 = document.createElement('label'); l2.append(el.autoshot, ' autoshot');
        add(l1, l2);
        el.speed = document.createElement('select');
        [['0.25', '0.25x'], ['0.5', '0.5x'], ['1', '1x'], ['2', '2x']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = 'game ' + t; if (v === '1') o.selected = true; el.speed.appendChild(o); });
        el.speed.onchange = () => { root._debugGameSpeed = +el.speed.value; };
        el.freeze = document.createElement('select');
        [['1', 'Egregor 1x'], ['0.3', 'Egregor 0.3x'], ['0.01', 'Egregor frozen']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; el.freeze.appendChild(o); });
        el.freeze.onchange = () => { state.enemyScale = +el.freeze.value; };
        add(el.speed, el.freeze);
        add(btn('Reset cooldowns', () => { const s = session(); s.shiftCooldownRemaining = 0; s.skillFCooldown = 0; s.playerShieldActive = true; s.playerShieldCooldown = 0; }),
            btn('+1 life', () => { const s = session(); s.lives = Math.min(99, s.lives + 1); }),
            btn('Lives 8', () => { session().lives = 8; }));

        h('IDLE AUDIO (phase 1 set)');
        const vr = row('');
        ['coo-a', 'coo-b', 'growl-a', 'growl-b', 'roar'].forEach(k => vr.appendChild(btn(k, () => { root.AudioMgr.playSfx('egregor-idle-p1-' + k); })));
        panel.appendChild(vr);
        add(btn('Next idle voice now', () => { const s = session(); if (s._idleVoice) s._idleVoice.next = 0; }),
            btn('Go to attack 1 (phase 1 loops)', () => jump(1)));

        h('EGREGOR SKILL FX');
        const kinds = ['tendril_lash', 'tempest', 'upheaval', 'eye_beams', 'null_slash', 'rift', 'chorus', 'mind_link', 'thought_sphere'];
        const kr = row('');
        kinds.forEach(k => kr.appendChild(btn(k, () => {
            const s = session(), a = s.attacks;
            a._setBossCue(k, .9, .35, player.x, player.y);
        })));
        panel.appendChild(kr);
        add(btn('Gap bar', () => { const s = session(); s.attacks._spawnGapBar(canvas.width, canvas.height, true, 1, 'y'); }),
            btn('Gap bar (x)', () => { const s = session(); s.attacks._spawnGapBar(canvas.width, canvas.height, true, 1, 'x'); }),
            btn('Pillars', () => { const s = session(); s.attacks._spawnPillars(canvas.width, canvas.height, true, 2, 1); }));

        document.body.appendChild(panel);
        fab = document.createElement('button'); fab.id = 'sdd-fab'; fab.textContent = 'SD'; fab.title = 'Showdown debug (F4)';
        fab.onclick = toggle; document.body.appendChild(fab);
    }

    function replay() {
        const s = session(), weapon = s.selectedWeapon;
        s.abort(); root._runGameMode = 'showdown'; gameState = 'playing';
        s.start(); s.selectOpponent('egregor', s.difficulty || 'hard'); s.selectWeapon(weapon || s.weaponPicker.weapons[0]);
    }

    // Starts the given attack; index is the position the next attack will have in the sequence when hp reaches 0
    function jump(attackId, hp, finalBoss) {
        const s = session();
        if (s.state === 'pre_battle') { s._openingSkipped = true; s._openingVoiceStarted = true; s.preBattleElapsed = 20; }
        s.beginAttack(attackId);
        s.chosenAttackIndex = attackId - 1;
        s.recoveryRemaining = Math.max(s.recoveryRemaining, hp === 0 ? 0 : 1.2);
        if (hp === 0) s.attacks.hp = 0;
        if (finalBoss) s.chosenAttackIndex = 17;
    }

    function refresh() {
        const s = session();
        if (!panel || !s || !el.status) return;
        const a = s.attacks, m = s.bossMotion || {}, st = s.stats || {};
        el.status.textContent = [
            'state  ' + s.state + (s.quit ? ' (quit)' : ''),
            'attack ' + (a ? a.currentAttackId : '-') + '  t=' + (a ? a.elapsed.toFixed(1) : '-') + 's',
            'boss hp ' + (a ? Math.round(a.hp) + ' / ' + Math.round(a.maxHp) : '-'),
            'boss  ' + (s.bossPos ? Math.round(s.bossPos.x) + ',' + Math.round(s.bossPos.y) : '-') + '  ' + (m.style || '') + ' ' + (m.speed ? Math.round(m.speed) : 0),
            'lives ' + s.lives + '  shield ' + (s.playerShieldActive ? 'on' : Math.ceil(s.playerShieldCooldown) + 's'),
            'shift ' + (s.shiftActive ? 'ACTIVE' : s.shiftCooldownRemaining.toFixed(1) + 's') + '  F ' + s.skillFCooldown.toFixed(1) + 's',
            'bullets ' + (s.pool ? s.pool.activeCount : 0) + '  skills ' + (a ? a.skills.length : 0) + '  cues ' + (a && a.cues ? a.cues.length : 0),
            'audio loops ' + ((root.AudioMgr && root.AudioMgr.getDuelAudioStatus().loops) || []).map(k => k.replace('egregor-idle-', '')).join(' '),
            'enemy x' + (s.enemyTimeScale || 1).toFixed(2) + '  clock ' + (st.timeSec || 0).toFixed(1) + 's  dmg ' + Math.round(st.damageDealt || 0)
        ].join('\n');
    }

    function toggle() {
        if (!allowed()) return;
        build();
        state.open = !state.open;
        panel.style.display = state.open ? 'block' : 'none';
        clearInterval(timer);
        if (state.open) { refresh(); timer = setInterval(refresh, 250); }
    }

    function syncFab() {
        const show = allowed() && root._runGameMode === 'showdown' && session() && session().active;
        if (show) { build(); fab.style.display = 'block'; }
        else { if (fab) fab.style.display = 'none'; if (state.open) toggle(); }
    }

    document.addEventListener('keydown', e => { if (e.code === 'F4' && allowed() && root._runGameMode === 'showdown') { e.preventDefault(); toggle(); } });
    setInterval(syncFab, 600);
})(window);
