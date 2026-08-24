// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// render/skill-buttons.js — extracted from render.js (on-screen skill button UI).
// drawSkillButton (singular) is confirmed dead code (no caller) — kept as-is,
// not deleted, per repo convention of not removing unrelated dead code.

function drawSkillButton(x, y, key, color, cooldown, lastActivation, activeCondition, chargePercent = -1, r = btnRadius) {
    ctx.save();
    const now = performance.now();
    let isReady = false, remaining = 0;
    const fontSize = Math.max(10, Math.floor(r * 0.75));
    const cdFontSize = Math.max(9, Math.floor(r * 0.65));

    if (chargePercent !== -1) {
        isReady = chargePercent >= 100;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333'; ctx.fill();

        if (chargePercent > 0 && chargePercent < 100) {
            ctx.save();
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.arc(x, y, r, Math.PI / 2, Math.PI / 2 + (2 * Math.PI * (chargePercent / 100)), false);
            ctx.closePath();
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'white'); grad.addColorStop(1, color);
            ctx.fillStyle = grad; ctx.globalAlpha = 0.7; ctx.fill();
            ctx.restore();
        }

        ctx.strokeStyle = isReady ? 'white' : '#666'; ctx.lineWidth = 2; ctx.stroke();

        if (isReady) {
            ctx.save();
            if (!_mobPerf) ctx.shadowColor = 'white'; if (!_mobPerf) ctx.shadowBlur = 16;
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r + 4 + Math.sin(now / 150) * 2, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        ctx.fillStyle = 'white'; ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(key, x, y);
        if (!isReady) { ctx.font = `bold ${cdFontSize}px Arial`; ctx.fillText(Math.floor(chargePercent) + '%', x, y + 1); }

    } else {
        remaining = Math.max(0, (cooldown - (now - lastActivation)) / 1e3);
        isReady = remaining <= 0 && !activeCondition;

        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? color : '#333'; ctx.fill();
        ctx.strokeStyle = isReady ? 'white' : '#666'; ctx.lineWidth = 2; ctx.stroke();

        if (remaining > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - remaining * 1e3 / cooldown));
            ctx.closePath(); ctx.fill();
        }

        ctx.fillStyle = 'white'; ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(key, x, y);
        if (remaining > 0) { ctx.font = `bold ${cdFontSize}px Arial`; ctx.fillText(Math.ceil(remaining), x, y + 1); }
    }
    // Silence overlay: red X when player is silenced
    if (typeof player !== 'undefined' && player._silenced) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,30,30,0.9)';
        ctx.lineWidth = Math.max(2, r * 0.25);
        ctx.lineCap = 'round';
        const d = r * 0.65;
        ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function drawSkillButtons() {
    const now = performance.now();
    const skillAReady = (now - lastSkillA >= _skillACooldown()) && skillAOrbs.length < maxSkillAOrbs;

    const pW = 124, pH = 22;
    const rowGap = 4, padX = 6, padY = 6, marginL = 4, marginB = 14;
    const divH = 1, divGap = 4;
    const panelH = padY * 2 + 6 * pH + 5 * rowGap + divGap * 2 + divH + pH;
    const panelW = padX * 2 + pW;
    const panelX = marginL, panelY = canvas.height - marginB - panelH;
    const pillX = panelX + padX;

    function _hexRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,6,18,0.50)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 6); ctx.fill(); }
    else ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.restore();

    if (!_mobPerf) {
        ctx.save();
        ctx.strokeStyle = 'rgba(60,120,255,0.55)';
        ctx.lineWidth = 1.5; ctx.lineCap = 'square';
        const arm = 7, ins = 2;
        const br = (x1, y1, x2, y2, x3, y3) => { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke(); };
        br(panelX+ins+arm, panelY+ins, panelX+ins, panelY+ins, panelX+ins, panelY+ins+arm);
        br(panelX+panelW-ins-arm, panelY+ins, panelX+panelW-ins, panelY+ins, panelX+panelW-ins, panelY+ins+arm);
        br(panelX+ins+arm, panelY+panelH-ins, panelX+ins, panelY+panelH-ins, panelX+ins, panelY+panelH-ins-arm);
        br(panelX+panelW-ins-arm, panelY+panelH-ins, panelX+panelW-ins, panelY+panelH-ins, panelX+panelW-ins, panelY+panelH-ins-arm);
        ctx.restore();
    }

    function rowY(idx) { return panelY + padY + idx * (pH + rowGap); }

    function _pill(py, keyLabel, color, opts) {
        const { cd = -1, lastAct = 0, active = false, charge = -1, activeLabel = 'ACTIVE' } = opts;
        let isReady = false, remaining = 0;
        if (charge !== -1) {
            isReady = charge >= 100;
        } else if (cd >= 0) {
            remaining = Math.max(0, (cd - (now - lastAct)) / 1000);
            isReady = remaining <= 0 && !active;
        }
        const [cr, cg, cb] = _hexRgb(color);
        const blink = isReady ? (0.5 + 0.5 * Math.sin(now / 200)) : 0;
        ctx.save();

        if (isReady) {
            ctx.fillStyle = color;
            ctx.globalAlpha = blink * 0.22;
            ctx.fillRect(pillX, py, pW, pH);
        } else if (active) {
            const pulse = 0.5 + 0.5 * Math.sin(now / 280);
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.07 + 0.04 * pulse).toFixed(3)})`;
            ctx.fillRect(pillX, py, pW, pH);
        }

        ctx.fillStyle = color;
        if (isReady) {
            ctx.globalAlpha = 0.35 + 0.65 * blink;
            if (!_mobPerf) { ctx.shadowColor = color; ctx.shadowBlur = 4 + 8 * blink; }
        } else if (active) {
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 280);
            if (!_mobPerf) { ctx.shadowColor = color; ctx.shadowBlur = 5; }
        } else {
            ctx.globalAlpha = 0.28;
        }
        ctx.fillRect(pillX, py, 3, pH);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        let progFrac = 0;
        if (!isReady && cd >= 0 && !active) {
            progFrac = Math.min(1, (cd - remaining * 1000) / cd);
        } else if (charge !== -1 && !isReady) {
            progFrac = Math.min(1, charge / 100);
        }
        if (isReady) {
            ctx.fillStyle = color; ctx.globalAlpha = 0.35 + 0.45 * blink;
            if (!_mobPerf) { ctx.shadowColor = color; ctx.shadowBlur = 4 * blink; }
            ctx.fillRect(pillX + 3, py + pH - 2, pW - 3, 2);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        } else if (progFrac > 0) {
            ctx.fillStyle = color; ctx.globalAlpha = 0.45;
            ctx.fillRect(pillX + 3, py + pH - 2, (pW - 3) * progFrac, 2);
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.25)`;
        ctx.fillRect(pillX + 40, py + 4, 1, pH - 8);

        ctx.font = `bold 9px "Courier New", Consolas, monospace`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.globalAlpha = isReady ? (0.5 + 0.5 * blink) : (active ? 0.85 : 0.55);
        if (isReady && !_mobPerf) { ctx.shadowColor = color; ctx.shadowBlur = 4 * blink; }
        ctx.fillText(keyLabel, pillX + 5, py + pH / 2);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        ctx.font = `9px "Courier New", Consolas, monospace`;
        ctx.textAlign = 'right';
        let stateText = '';
        if (isReady) stateText = 'READY';
        else if (active) stateText = activeLabel;
        else if (charge !== -1) stateText = Math.floor(charge) + '%';
        else if (remaining > 0) stateText = remaining.toFixed(1) + 's';
        if (stateText) {
            const dr = Math.min(255, cr + 70), dg = Math.min(255, cg + 70), db = Math.min(255, cb + 70);
            ctx.fillStyle = (isReady || active) ? '#fff' : `rgba(${dr},${dg},${db},0.75)`;
            if (isReady) {
                ctx.globalAlpha = 0.5 + 0.5 * blink;
                if (!_mobPerf) { ctx.shadowColor = color; ctx.shadowBlur = 8 * blink; }
            } else {
                ctx.globalAlpha = active ? 0.90 : 0.60;
                if (active && !_mobPerf) { ctx.shadowColor = color; ctx.shadowBlur = 6; }
            }
            ctx.fillText(stateText, pillX + pW - 5, py + pH / 2);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        if (typeof player !== 'undefined' && player._silenced) {
            ctx.strokeStyle = 'rgba(255,30,30,0.85)';
            ctx.lineWidth = 1.5; ctx.lineCap = 'round';
            const cx = pillX + pW / 2, cy = py + pH / 2, d = 4;
            ctx.beginPath(); ctx.moveTo(cx-d,cy-d); ctx.lineTo(cx+d,cy+d); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx+d,cy-d); ctx.lineTo(cx-d,cy+d); ctx.stroke();
        }

        ctx.restore();
    }

    _pill(rowY(0), skillShiftActive ? '⏸ SH' : 'SH', '#A855F7', {
        cd: skillShiftCooldown, lastAct: lastSkillShift,
        active: skillShiftActive, activeLabel: 'SHIFT',
    });

    const _aCdDone = now - lastSkillA >= _skillACooldown();
    _pill(rowY(1), 'A', '#3B82F6', {
        cd: _skillACooldown(), lastAct: lastSkillA,
        active: _aCdDone && skillAOrbs.length >= maxSkillAOrbs,
        activeLabel: 'MAX',
    });

    const _photo = spirits.find(s2 => s2.isPhotokrystos && !s2._done);
    const _normalSpirit = spirits.find(s2 => !s2.isPhotokrystos && !s2.isFinishing);
    const _anySpiritAlive = spirits.length > 0;
    if (_photo) {
        const _combatAge = _photo._combatStartTime ? (gameElapsedTime - _photo._combatStartTime) : 0;
        const _photoRemain = Math.max(0, 40000 - _combatAge);
        _pill(rowY(2), 'S', '#10B981', {
            cd: 40000, lastAct: now - (40000 - _photoRemain), active: true, activeLabel: 'BTM ' + (_photoRemain / 1000).toFixed(0) + 's',
        });
    } else if (_normalSpirit) {
        const _sReady = primevalEnergy >= 100;
        _pill(rowY(2), 'S', _sReady ? '#00ff88' : '#22C55E', {
            charge: Math.min(100, primevalEnergy), active: false,
        });
    } else {
        _pill(rowY(2), 'S', '#22C55E', {
            cd: skillSCooldown, lastAct: lastSkillS, active: _anySpiritAlive,
        });
    }

    {
        let _dOpts;
        if (skillDCharging) {
            const _dc = Math.min(100, (now - skillDChargeStartTime) / skillDChargeTime * 100);
            _dOpts = { charge: _dc, active: false };
        } else {
            const _dCdDone = now - lastSkillD >= skillDCooldown;
            _dOpts = { cd: skillDCooldown, lastAct: lastSkillD, active: !_dCdDone && !!deathStar, activeLabel: 'D-STAR' };
        }
        _pill(rowY(3), 'D', '#9333EA', _dOpts);
    }

    _pill(rowY(4), 'F', '#EF4444', {
        cd: skillFCooldown, lastAct: lastSkillF, active: skillFState !== 'ready', activeLabel: 'ACTIVE',
    });

    {
        const _gRemSec = skillGActive ? Math.max(0, (skillGEndTime - gameElapsedTime) / 1000) : 0;
        _pill(rowY(5), 'G', '#22D3EE', {
            charge: skillGCharge, active: skillGActive,
            activeLabel: _gRemSec > 0 ? 'TSL ' + _gRemSec.toFixed(0) + 's' : 'TESLA',
        });
    }

    const divY = panelY + padY + 6 * (pH + rowGap) - rowGap + divGap;
    ctx.save();
    ctx.fillStyle = 'rgba(60,120,255,0.18)';
    ctx.fillRect(pillX + 4, divY, pW - 8, divH);
    ctx.restore();

    const _spaceY = divY + divH + divGap;
    let _spaceOpts;
    if (laserActive) {
        const _laserRem = Math.max(0, laserDuration - (now - laserStartTime));
        _spaceOpts = { active: true, activeLabel: '⚡ ' + (_laserRem / 1000).toFixed(1) + 's' };
    } else if (charging) {
        const _chargeRatio = Math.min(100, (now - chargeStartTime) / overloadChargeTime * 100);
        _spaceOpts = { charge: _chargeRatio, active: false };
    } else {
        const _spcRem = Math.max(0, (laserCooldownEnd - now) / 1000);
        const _spcReady = _spcRem <= 0;
        _spaceOpts = _spcReady
            ? { cd: laserCooldownDuration, lastAct: now - laserCooldownDuration, active: false }
            : { cd: laserCooldownDuration, lastAct: now - (laserCooldownDuration - _spcRem * 1000), active: false };
    }
    _pill(_spaceY, '⎵ SPC', '#3B82F6', _spaceOpts);
}

//  VEILSHROUD RENDER

