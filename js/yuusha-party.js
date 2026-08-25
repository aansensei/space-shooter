// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Yuusha Party (Tổ Đội Dũng Giả) — Taurus sigil: Squad Formation system

const YUUSHA_ROLES = {
    Tank:     { color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.8)'  },
    Support:  { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.8)'   },
    Marksman: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.8)'  },
    Mage:     { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.8)'  },
};

const _yEaseOutCubic = t => 1 - Math.pow(1 - t, 3);
const _yEaseInQuad   = t => t * t;
const _yEaseOutBack  = t => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function _yDrawTankWeapon(ctx, cx, cy, r) {
    const w = 26, h = 12;
    const x = cx - w / 2, y = cy - r - h - 2;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#8fa3d9');
    grad.addColorStop(1, '#2d3f6b');
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function _yDrawMarksmanWeapon(ctx, cx, cy, r, pullAmount) {
    pullAmount = pullAmount || 0;
    const leftTipX = cx - 16, leftTipY = cy - r - 18;
    const rightTipX = cx + 16, rightTipY = cy - r - 18;

    // Bow limb — fixed curve, always arcing above the body
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(leftTipX, leftTipY);
    ctx.quadraticCurveTo(cx, cy - r - 30, rightTipX, rightTipY);
    ctx.stroke();

    // Bowstring dips closer to the body as pullAmount rises toward a shot
    const stringCtrlY = (cy - r - 10) + pullAmount * 14;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(leftTipX, leftTipY);
    ctx.quadraticCurveTo(cx, stringCtrlY, rightTipX, rightTipY);
    ctx.stroke();
}

function _yDrawSupportWeapon(ctx, cx, cy, r) {
    const baseX = cx, baseY = cy - r - 2;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX, baseY - 10);
    ctx.stroke();

    // Satellite dish — tilted ellipse
    ctx.save();
    ctx.translate(baseX, baseY - 15);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22c55e';
    ctx.stroke();

    // Signal-receiver dot at the dish's focal point
    ctx.beginPath();
    ctx.arc(0, -7, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.restore();
}

function _yDrawMageOrbit(ctx, cx, cy, r, angle) {
    const orbitR = r + 12;
    for (let i = 1; i <= 4; i++) {
        const a = angle - i * 0.15;
        const tx = cx + Math.cos(a) * orbitR;
        const ty = cy + Math.sin(a) * orbitR;
        const size = 6 - i * 0.75;
        const alpha = 0.6 - i * 0.125;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(tx, ty, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    const gx = cx + Math.cos(angle) * orbitR;
    const gy = cy + Math.sin(angle) * orbitR;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(angle);
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

class YuushaMember {
    constructor(role) {
        this.role = role;
        this.id = Math.random();
        this.radius = 18;
        this.state = 'idle';
        this.activeStart = 0;

        this.scale = 0;
        this.spawnStart = performance.now();

        this.lastShot = performance.now() + Math.random() * 1000; // Marksman auto-fire cadence
        this.lastCastCheck = performance.now() + Math.random() * 1000; // Support/Mage auto-cast cadence
        this.crystal = { angle: 0, x: 0, y: 0, active: false, flyStart: 0, targetX: 0, targetY: 0 }; // Mage
        this.absorb = 0; // Tank

        this.maxHp = role === 'Tank' ? 300 : 200;
        this.hp = this.maxHp;
        this.healFlashUntil = 0;

        // Position — set by _updateYuushaFormation
        this.x = player.x;
        this.y = player.y - 70;

        // Ally-wide buff fields, matching the shape sentinels/skillDSpaceships expose
        this.shield = 0;
        this._blessingDR = 0;
        this._blessingDmg = 0;
        this._blessingShield = 0;

        this._arrowFired = false;
        this._healApplied = false;
        this.healTargets = null;
    }

    _findTarget() {
        if (typeof enemies === 'undefined' || enemies.length === 0) return null;
        let best = null, bestDist = Infinity;
        for (const e of enemies) {
            if (e.hp <= 0) continue;
            if (e.type && e.type.startsWith('enemy_bullet')) continue;
            if (e.type === 'abyssal_chain') continue;
            if (e.type === 'veilshroud_echo') continue; // untargetable
            if (e.inCoronation) continue; // untargetable during coronation
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < bestDist) { bestDist = d; best = e; }
        }
        return best ? { x: best.x, y: best.y, enemy: best } : null;
    }

    triggerActive() {
        if (this.state === 'active') return;
        this.state = 'active';
        this.activeStart = performance.now();

        if (this.role === 'Tank') {
            const tgt = this._findTarget();
            if (tgt) {
                window._yuushaBlades.push(new YuushaBlade(this.x, this.y - this.radius - 20, tgt.x, tgt.y));
            }
        }

        if (this.role === 'Support') {
            const squadCandidates = (window._yuushaSquad || []).filter(s => s.hp > 0); // Support can heal itself too
            const sentinelCandidates = typeof sentinels !== 'undefined' ? sentinels.filter(s => s.hp > 0) : [];
            const candidates = squadCandidates.concat(sentinelCandidates)
                .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
            this.healTargets = candidates.length > 0 ? candidates.slice(0, 2) : [this];
            this._healApplied = false;
        }

        if (this.role === 'Mage') {
            this.crystal.active = true;
            this.crystal.flyStart = performance.now();
            const tgt = this._findTarget();
            if (tgt) {
                this.crystal.targetX = tgt.x + (Math.random() - 0.5) * 100;
                this.crystal.targetY = tgt.y + (Math.random() - 0.5) * 50;
            } else {
                this.crystal.targetX = this.x + (Math.random() - 0.5) * 200;
                this.crystal.targetY = this.y - 300;
            }
        }
    }

    update(now, dt) {
        if (this.scale < 1) {
            const t = (now - this.spawnStart) / 300;
            this.scale = t >= 1 ? 1 : _yEaseOutBack(t);
        }

        // Slide toward the formation slot _updateYuushaFormation last assigned
        if (this.targetX !== undefined) {
            const t = (now - this.slideStart) / 300;
            if (t >= 1) {
                this.x = this.targetX;
                this.y = this.targetY;
            } else {
                const ease = _yEaseOutCubic(t);
                this.x = this.oldX + (this.targetX - this.oldX) * ease;
                this.y = this.oldY + (this.targetY - this.oldY) * ease;
            }
        }

        // Marksman fires on its own clock regardless of squad damage state
        if (this.role === 'Marksman') {
            const cycle = (typeof gloryForJusticeActive !== 'undefined' && gloryForJusticeActive) ? 300 / 1.20 : 300;
            const elapsed = now - this.lastShot;
            if (elapsed > cycle) {
                this.triggerActive();
                this.lastShot = now;
            }
        }

        // Support checks periodically for a hurt ally (squad or real Sentinels) to heal
        if (this.role === 'Support' && this.state === 'idle') {
            if (now - this.lastCastCheck > 1200) {
                this.lastCastCheck = now;
                const squad = window._yuushaSquad || [];
                const squadHurt = squad.some(s => s.hp > 0 && s.hp < s.maxHp);
                const sentinelHurt = typeof sentinels !== 'undefined' && sentinels.some(s => s.hp > 0 && s.hp < s.maxHp);
                if (squadHurt || sentinelHurt) this.triggerActive();
            }
        }

        // Mage checks periodically for a live enemy to bombard
        if (this.role === 'Mage' && this.state === 'idle') {
            if (now - this.lastCastCheck > 1000) {
                this.lastCastCheck = now;
                if (this._findTarget()) this.triggerActive();
            }
        }

        if (this.role === 'Support' && this.state === 'active') {
            const targets = (this.healTargets && this.healTargets.length > 0) ? this.healTargets : [this];
            const t = now - this.activeStart;
            if (t < 400) {
                for (const tgt of targets) {
                    for (let i = 0; i < 2; i++) {
                        window._yuushaParticles.push(new YuushaParticle(
                            this.x + (Math.random() - 0.5) * 40, this.y - 20,
                            tgt.x, tgt.y, '#4ade80'
                        ));
                    }
                }
            }
            if (t >= 350 && !this._healApplied) {
                this._healApplied = true;
                for (const tgt of targets) {
                    tgt.hp = Math.min(tgt.maxHp, tgt.hp + 50);
                    tgt.healFlashUntil = now + 800;
                    window._yuushaFloatingTexts = window._yuushaFloatingTexts || [];
                    window._yuushaFloatingTexts.push({
                        x: tgt.x + (Math.random() - 0.5) * 20, y: tgt.y - 20,
                        text: '+HP', color: '#4ade80', life: 1200, start: now
                    });
                    for (let i = 0; i < 15; i++) {
                        window._yuushaParticles.push(new YuushaParticle(
                            tgt.x, tgt.y,
                            tgt.x + (Math.random() - 0.5) * 100,
                            tgt.y + (Math.random() - 0.5) * 100,
                            '#22c55e'
                        ));
                    }
                }
            }
        }

        if (this.state === 'active') {
            const elapsed = now - this.activeStart;
            const duration = this.role === 'Tank' ? 300
                : (this.role === 'Support' ? 550
                : (this.role === 'Marksman' ? 350 : 0)); // Mage's state resets inside drawMageCrystal
            if (duration > 0 && elapsed >= duration) {
                this.state = 'idle';
            }
        }
    }

    drawBase(ctx, now) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        const color = YUUSHA_ROLES[this.role].color;
        const _lq = typeof _mobPerf !== 'undefined' && _mobPerf;

        let corePulse = 1;
        if (this.role === 'Support' && this.state === 'idle') {
            corePulse = 0.6 + 0.4 * Math.sin(now / 1000 * Math.PI * 2);
        }

        ctx.beginPath();
        ctx.arc(0, 10, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, '#CCCCCC');
        grad.addColorStop(0.7, '#888888');
        grad.addColorStop(1, '#444444');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.4);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(1, color);
        ctx.globalAlpha = corePulse;
        if (!_lq) { ctx.shadowBlur = 10; ctx.shadowColor = color; }
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.save();
        ctx.rotate(now / 1500);
        ctx.setLineDash([5, 7]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-8, -this.radius + 3); ctx.lineTo(-8, this.radius - 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -this.radius + 3); ctx.lineTo(8, this.radius - 3); ctx.stroke();

        if (now < this.healFlashUntil) {
            const tFlash = (this.healFlashUntil - now) / 800;
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5 + (1 - tFlash) * 40, 0, Math.PI * 2);
            ctx.lineWidth = 4 * tFlash;
            ctx.strokeStyle = `rgba(74, 222, 128, ${tFlash})`;
            if (!_lq) { ctx.shadowBlur = 15; ctx.shadowColor = '#4ade80'; }
            ctx.stroke();
            ctx.restore();
        }

        const hpY = this.radius + 8;
        const hpW = 28, hpH = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-hpW / 2, hpY - hpH / 2, hpW, hpH);
        const hpPct = Math.max(0, this.hp / this.maxHp);
        let hpColor = '#22c55e';
        if (hpPct < 0.4) hpColor = '#ef4444';
        else if (hpPct < 0.7) hpColor = '#facc15';
        ctx.fillStyle = hpColor;
        ctx.fillRect(-hpW / 2, hpY - hpH / 2, hpW * hpPct, hpH);

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const txtW = ctx.measureText(this.role).width;
        ctx.beginPath(); ctx.roundRect(-txtW / 2 - 4, this.radius + 18 - 9, txtW + 8, 14, 4); ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(this.role, 0, this.radius + 18);

        ctx.restore();
    }

    drawAttachments(ctx, now) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        const elapsed = this.state === 'active' ? now - this.activeStart : 0;
        const color = YUUSHA_ROLES[this.role].color;
        const _lq = typeof _mobPerf !== 'undefined' && _mobPerf;

        if (!_lq) { ctx.shadowBlur = 8; ctx.shadowColor = color; }

        if (this.role === 'Tank') {
            const bobY = this.state === 'idle' ? Math.sin(now / 2000 * Math.PI * 2) * 2 : 0;
            ctx.save();
            ctx.translate(0, bobY);

            _yDrawTankWeapon(ctx, 0, 0, this.radius);

            if (this.state === 'active') {
                if (elapsed < 150) {
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.beginPath();
                    ctx.roundRect(-13, -this.radius - 14, 26, 12, 3);
                    ctx.fill();
                } else if (elapsed >= 150 && elapsed < 300) {
                    const p = (elapsed - 150) / 150;
                    ctx.globalAlpha = 1 - p;
                    ctx.beginPath();
                    ctx.arc(0, -this.radius - 8, 40, Math.PI, Math.PI - (Math.PI * 5 / 6) * p, true);
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }

            const absorbPct = (this.absorb || 0) / 100;
            if (absorbPct > 0) {
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 9, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * absorbPct), false);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#fbbf24';
                ctx.stroke();
            }

            ctx.restore();
        }

        else if (this.role === 'Support') {
            const tilt = this.state === 'idle' ? Math.sin(now / 1000 * Math.PI * 2) * (3 * Math.PI / 180) : 0;

            let gAlpha = 0;
            if (this.state === 'active') {
                if (elapsed < 400) gAlpha = 1;
                else gAlpha = Math.max(0, 1 - (elapsed - 400) / 150);
            }

            ctx.save();
            ctx.rotate(tilt);

            if (gAlpha > 0 && !_lq) {
                const pulse = Math.sin(now / 150 * Math.PI * 2) * 5;
                ctx.shadowBlur = 15 + Math.max(0, pulse);
                ctx.shadowColor = '#22c55e';
            }

            _yDrawSupportWeapon(ctx, 0, 0, this.radius);

            ctx.restore();
        }

        else if (this.role === 'Marksman') {
            let pullAmount = 0;
            if (this.state === 'idle') {
                const tSince = now - this.lastShot;
                pullAmount = Math.exp(-tSince / 800) * Math.sin(now / 120 * Math.PI * 2) * 0.15;
            } else if (this.state === 'active') {
                if (elapsed < 150) {
                    pullAmount = _yEaseInQuad(elapsed / 150);
                } else if (elapsed < 200) {
                    pullAmount = 1;
                } else if (elapsed < 280) {
                    const t = (elapsed - 200) / 80;
                    pullAmount = 1 - _yEaseOutBack(t);
                }
            }

            _yDrawMarksmanWeapon(ctx, 0, 0, this.radius, pullAmount);

            if (this.state === 'active' && elapsed >= 280 && !this._arrowFired) {
                this._arrowFired = true;
                const tgt = this._findTarget();
                if (tgt) {
                    const spawnX = this.x;
                    const spawnY = this.y - this.radius - 14 + pullAmount * 7;
                    window._yuushaProjectiles.push(new YuushaProjectile(spawnX, spawnY, tgt.x, tgt.y));
                }
            }
            if (this.state === 'idle') this._arrowFired = false;
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawMageCrystal(ctx, now) {
        if (this.role !== 'Mage') return;
        const _lq = typeof _mobPerf !== 'undefined' && _mobPerf;
        const orbitR = this.radius + 12;

        if (!this.crystal.active) {
            this.crystal.angle = (now / 2500 * Math.PI * 2) % (Math.PI * 2);

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(this.scale, this.scale);
            if (!_lq) { ctx.shadowBlur = 8; ctx.shadowColor = '#a855f7'; }
            _yDrawMageOrbit(ctx, 0, 0, this.radius, this.crystal.angle);
            ctx.restore();

            this.crystal.x = this.x + Math.cos(this.crystal.angle) * orbitR;
            this.crystal.y = this.y + Math.sin(this.crystal.angle) * orbitR;
        } else {
            const elapsed = now - this.crystal.flyStart;
            let cx = -999, cy = -999;

            if (elapsed < 350) {
                const t = _yEaseInQuad(elapsed / 350);
                cx = this.crystal.x + (this.crystal.targetX - this.crystal.x) * t;
                cy = this.crystal.y + (this.crystal.targetY - this.crystal.y) * t;
            } else if (elapsed > 350 && !this.crystal.exploded) {
                window._yuushaDotZones.push(new YuushaDoTZone(this.crystal.targetX, this.crystal.targetY, '#a855f7'));
                this.crystal.exploded = true;
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 5;
                    window._yuushaBurstRays.push({
                        x: this.crystal.targetX, y: this.crystal.targetY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 1, start: now
                    });
                }
            } else if (elapsed > 750) {
                const t = Math.min(1, (elapsed - 750) / 200);
                this.crystal.angle = (now / 2500 * Math.PI * 2) % (Math.PI * 2);

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(this.scale, this.scale);
                ctx.globalAlpha = t;
                if (!_lq) { ctx.shadowBlur = 8; ctx.shadowColor = '#a855f7'; }
                _yDrawMageOrbit(ctx, 0, 0, this.radius, this.crystal.angle);
                ctx.restore();

                if (t >= 1) {
                    this.crystal.active = false;
                    this.crystal.exploded = false;
                    this.state = 'idle';
                }
            }

            if (cx !== -999 && !this.crystal.exploded) {
                const pt = new YuushaParticle(cx, cy, cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20, '#a855f7');
                pt.speed = 0.05;
                window._yuushaParticles.push(pt);

                ctx.save();
                ctx.translate(cx, cy);
                const spinAngle = (now - this.crystal.flyStart) / 50;
                ctx.rotate(spinAngle);

                if (!_lq) { ctx.shadowBlur = 20; ctx.shadowColor = '#a855f7'; }
                ctx.fillStyle = '#a855f7';
                ctx.beginPath();
                ctx.moveTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(0, 9); ctx.lineTo(-6, 0);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }
    }
}

// Tank's piercing crescent — travels straight toward the point it was aimed at on cast
class YuushaBlade {
    constructor(x, y, tx, ty) {
        this.x = x; this.y = y;
        const angle = Math.atan2(ty - y, tx - x);
        const speed = (typeof gloryForJusticeActive !== 'undefined' && gloryForJusticeActive) ? 15 * 1.25 : 15;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.angle = angle; // crescent's bulge leads the direction of travel
        this.height = 190;
        this.life = 1;
        this.hitEnemies = new Set();
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.015;
        if (Math.random() < 0.5) {
            window._yuushaParticles.push(new YuushaParticle(
                this.x + (Math.random() - 0.5) * 40,
                this.y + (Math.random() - 0.5) * 40,
                this.x - this.vx, this.y - this.vy, '#3b82f6'
            ));
        }
    }
    draw(ctx) {
        const _lq = typeof _mobPerf !== 'undefined' && _mobPerf;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.max(0, this.life);

        if (!_lq) { ctx.shadowBlur = 32; ctx.shadowColor = '#3b82f6'; }

        // Outer glow — wide soft halo behind the blade
        ctx.strokeStyle = 'rgba(59,130,246,0.55)';
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.arc(0, 0, this.height / 2, -Math.PI / 2.4, Math.PI / 2.4, false);
        ctx.stroke();

        // Blade body — solid, saturated blue
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.arc(0, 0, this.height / 2, -Math.PI / 2.4, Math.PI / 2.4, false);
        ctx.stroke();

        // Bright cutting edge
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, this.height / 2, -Math.PI / 2.4, Math.PI / 2.4, false);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// Marksman's arrow — piercing, leaves a fading trail
class YuushaProjectile {
    constructor(x, y, tx, ty) {
        this.x = x; this.y = y;
        const angle = Math.atan2(ty - y, tx - x);
        const speed = (typeof gloryForJusticeActive !== 'undefined' && gloryForJusticeActive) ? 25 * 1.25 : 25;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.angle = angle;
        this.color = '#f59e0b';
        this.trail = [];
        this._dead = false;
        this.hitEnemies = new Set();
    }
    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        window._yuushaParticles.push(new YuushaParticle(
            this.x, this.y, this.x - this.vx, this.y - this.vy, '#fde68a'
        ));
    }
    draw(ctx) {
        const _lq = typeof _mobPerf !== 'undefined' && _mobPerf;
        ctx.save();

        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        for (let i = 0; i < this.trail.length - 1; i++) {
            ctx.strokeStyle = `rgba(245, 158, 11, ${(i / this.trail.length)})`;
            ctx.beginPath();
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
            ctx.stroke();
        }

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (!_lq) { ctx.shadowBlur = 15; ctx.shadowColor = '#f59e0b'; }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(15, 0); ctx.lineTo(-8, -6); ctx.lineTo(-4, 0); ctx.lineTo(-8, 6);
        ctx.closePath(); ctx.fill();

        ctx.restore();
    }
}

class YuushaParticle {
    constructor(x, y, tx, ty, color) {
        this.x = x; this.y = y;
        this.tx = tx; this.ty = ty;
        this.color = color;
        this.life = 1;
        this.speed = 0.08 + Math.random() * 0.04;
    }
    update() {
        const dx = this.tx - this.x, dy = this.ty - this.y;
        this.x += dx * this.speed;
        this.y += dy * this.speed;
        this.life -= 0.02;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath(); ctx.arc(this.x, this.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Mage's arcane AoE zone — ticks damage to any enemy standing inside it
class YuushaDoTZone {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.color = color;
        this.radius = 80;
        this.life = 3000;
        this.maxLife = 3000;
        this.hitEnemies = new Map(); // enemy -> timestamp of its last tick
    }
    update(dt) {
        this.life -= dt;
        if (Math.random() < 0.4) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * this.radius;
            const px = this.x + Math.cos(angle) * r;
            const py = this.y + Math.sin(angle) * r;
            const pt = new YuushaParticle(px, py, px, py - 50, '#c084fc');
            pt.life = 0.8;
            pt.speed = 0.05;
            window._yuushaParticles.push(pt);
        }
    }
    draw(ctx) {
        const p = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.translate(this.x, this.y);

        const pulse = Math.sin(performance.now() / 150) * 10;
        const currentR = this.radius + pulse;

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentR);
        grad.addColorStop(0, `rgba(168, 85, 247, ${0.5 * p})`);
        grad.addColorStop(0.5, `rgba(216, 180, 254, ${0.3 * p})`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, currentR, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = `rgba(216, 180, 254, ${0.8 * p})`;
        ctx.lineWidth = 2 + Math.random() * 2;
        ctx.beginPath(); ctx.arc(0, 0, currentR * 0.9, 0, Math.PI * 2); ctx.stroke();

        ctx.restore();
    }
}

function _spawnYuushaMember(role) {
    const member = new YuushaMember(role);
    window._yuushaSquad = window._yuushaSquad || [];
    window._yuushaSquad.push(member);
    _updateYuushaFormation(true);
}

// Formation slots are relative offsets from the player, re-applied every frame
// so the squad tracks player movement. A slide-in animation (oldX/slideStart)
// only restarts when a member's slot actually changes (spawn/row reflow) —
// recomputing it every frame would trap members at their spawn point forever.
function _updateYuushaFormation(slotsChanged) {
    const squad = window._yuushaSquad || [];
    if (squad.length === 0) return;

    const n = squad.length;
    let spacing = 90;
    const maxWidth = canvas.width - 100;

    const expectedWidth = (n - 1) * spacing;
    if (expectedWidth > maxWidth) {
        spacing = Math.max(60, maxWidth / (n - 1 || 1));
    }

    // Wrap to a 2nd row once even the minimum spacing can't fit in one row
    let row1 = [], row2 = [];
    if (n > 1 && (n - 1) * 60 > maxWidth) {
        const row1Count = Math.ceil(n / 2);
        row1 = squad.slice(0, row1Count);
        row2 = squad.slice(row1Count);
    } else {
        row1 = squad;
    }

    const assignRow = (rowArr, offsetY, currentSpacing) => {
        const w = (rowArr.length - 1) * currentSpacing;
        const startOffsetX = -w / 2;
        const now = performance.now();
        rowArr.forEach((s, i) => {
            const offsetX = startOffsetX + i * currentSpacing;
            const slotMoved = slotsChanged || s._slotOffsetX === undefined
                || Math.abs(s._slotOffsetX - offsetX) > 0.5 || s._slotOffsetY !== offsetY;
            s._slotOffsetX = offsetX;
            s._slotOffsetY = offsetY;
            s.targetX = player.x + offsetX;
            s.targetY = player.y + offsetY;
            if (slotMoved) {
                s.oldX = s.x !== undefined ? s.x : s.targetX;
                s.oldY = s.y !== undefined ? s.y : s.targetY;
                s.slideStart = now;
            }
        });
    };

    assignRow(row1, -70, spacing);
    if (row2.length > 0) {
        assignRow(row2, -130, spacing);
    }
}

// A piercing enemy attack that's about to hit the player is instead redirected
// onto EVERY living squad member at once, each taking 1.5x whatever that same
// attack already deals to a real Sentinel — piercing/AoE attacks sweep through
// every entity in their path, so all 4 members share that fate together, not
// just one. Called from each piercing enemy attack's own player-hit call site,
// using that same attack's own sentinel-damage formula. `value` is a fraction
// of each member's own maxHp (optionally +shield when `pctMode` is true)
// unless `pctMode === 'flat'`, in which case `value` is already an absolute
// damage number (matches abilities like Goliath's Absolute Verdict, whose
// sentinel damage is a flat % of ITS OWN maxHp, unrelated to the target's).
// Returns true if redirected (caller should skip its own playerTakesHit call).
function _yuushaPierceRedirect(value, pctMode) {
    if (!_hasBuff('doi_hinh_chien') || !(value > 0)) return false;
    const alive = (window._yuushaSquad || []).filter(s => s.hp > 0);
    if (alive.length === 0) return false;

    const now = performance.now();
    alive.forEach(member => {
        const sentinelDmg = pctMode === 'flat'
            ? value
            : (pctMode ? (member.maxHp + (member.shield || 0)) : member.maxHp) * value;
        const rawDmg = sentinelDmg * 1.5;
        const actualDmg = _yuushaApplyDamage(member, rawDmg, now);
        if (member.role === 'Tank' && actualDmg > 0) _yuushaFillTankAbsorb(member, actualDmg * 2.2);
        if (member.hp <= 0) member._deathTime = now;
        addExplosion(member.x, member.y, 40, 'cyan');
    });
    if (window.AudioMgr) window.AudioMgr.playSfxAt('shield-hit', alive[0].x, alive[0].y);
    return true;
}

// A living Tank actually tanks part of the hit for a real Sentinel: 15% of
// an incoming hit (hooked from entities.js's dealDamage, called BEFORE the
// hit is subtracted from hp so a lethal blow can actually be softened
// instead of applying in full and getting partially refunded from a corpse)
// is shaved off, and that same absorbed amount fills the Tank's meter.
// Returns the HP amount to shave off the hit (0 if no Tank is alive).
function _yuushaTankAbsorbFromSentinelDamage(amount) {
    if (!_hasBuff('doi_hinh_chien') || amount <= 0) return 0;
    const squad = window._yuushaSquad || [];
    const tank = squad.find(s => s.role === 'Tank' && s.hp > 0);
    if (!tank) return 0;
    const absorbed = amount * 0.15;
    _yuushaFillTankAbsorb(tank, Math.min(30, absorbed * 2.2));
    return absorbed;
}

function _yuushaFillTankAbsorb(tank, amount) {
    tank.absorb = Math.min(100, (tank.absorb || 0) + amount);
    if (tank.absorb >= 100) {
        tank.absorb = 0;
        tank.hp = Math.min(tank.maxHp, tank.hp + 5);
        tank.triggerActive();
    }
}

// Applies incoming damage to a squad member through the same defensive
// layers real Sentinels get (Absolute Shield / Iron Body / Sentinel Parry /
// Blessing DR / Glory for Justice DR+parry / Lunar Aegis evade / Gaia
// Barrier), since those buffs are now granted to _yuushaSquad too via the
// same forEach loops that grant them to `sentinels`. Returns the HP damage
// actually applied (0 if fully blocked/evaded).
function _yuushaApplyDamage(member, dmg, now) {
    if (member.absoluteShield) {
        member.absoluteShield = false;
        return 0;
    }
    if (member.ironBody && now < member.ironBodyEnd) return 0;
    if (typeof gloryForJusticeActive !== 'undefined' && gloryForJusticeActive && Math.random() < 0.20) {
        if (typeof _triggerSentinelParry === 'function') _triggerSentinelParry(member);
        return 0;
    }
    if (_hasBuff('giap_nguyet') && Math.random() < 0.20) return 0;

    let dr = member._blessingDR || 0;
    if (member.sentinelParryBuff && now < member.sentinelParryBuffEnd) dr += 0.10;
    if (typeof gloryForJusticeActive !== 'undefined' && gloryForJusticeActive) dr += 0.30;
    let mitigated = dmg * (1 - Math.min(0.9, dr));

    if ((member._gaiaBarrier || 0) > 0) {
        const absorbed = Math.min(member._gaiaBarrier, mitigated);
        member._gaiaBarrier -= absorbed;
        mitigated -= absorbed;
    }
    member.hp = Math.max(0, member.hp - mitigated);
    return mitigated;
}

// Enemies don't specifically target the squad, but bullets already flying
// through the player's vicinity (where the squad stands) can clip a member
// on the way past — mirrors how bullets already collide with real Sentinels.
function _checkYuushaBulletCollisions(now) {
    const squad = window._yuushaSquad || [];
    if (squad.length === 0 || typeof enemies === 'undefined') return;

    const tanks = squad.filter(s => s.role === 'Tank' && s.hp > 0);

    for (const e of enemies) {
        if (e.hp <= 0 || !e.type || !e.type.startsWith('enemy_bullet')) continue;

        // A hit only exists if the bullet is actually within range of some
        // living member — find the closest one that's actually in range.
        let nearest = null, nearestDist = Infinity;
        for (const s of squad) {
            if (s.hp <= 0) continue;
            const d = Math.hypot(e.x - s.x, e.y - s.y);
            if (d < e.size + s.radius && d < nearestDist) { nearestDist = d; nearest = s; }
        }
        if (!nearest) continue;

        // Once a hit is confirmed, a Tank soaks it for the squad 75% of the time
        const member = (tanks.length > 0 && Math.random() < 0.75)
            ? tanks[Math.floor(Math.random() * tanks.length)]
            : nearest;

        const rawDmg = e.type === 'enemy_bullet_small' ? member.maxHp * 0.15 : Math.min(member.maxHp * 0.3, e.hp);
        const actualDmg = _yuushaApplyDamage(member, rawDmg, now);
        e.hp = 0;

        if (member.role === 'Tank' && actualDmg > 0) _yuushaFillTankAbsorb(member, actualDmg * 2.2);
        if (member.hp <= 0) member._deathTime = now;
    }
}

// Keeps the real point-defense Sentinel fleet from going fully extinct —
// checks once every 5s, and if none are left on the map, spawns 2 back in.
function _checkYuushaSentinelReplenish(now) {
    if (now - (window._yuushaReplenishLastCheck || 0) < 5000) return;
    window._yuushaReplenishLastCheck = now;
    if (now < (window._yuushaReplenishCooldownEnd || 0)) return;
    if (typeof sentinels === 'undefined' || sentinels.length > 0) return;
    if (typeof spawnSentinel !== 'function') return;

    window._yuushaReplenishCooldownEnd = now + 2000;
    spawnSentinel(player.x, player.y, false);
    spawnSentinel(player.x, player.y, false);
}

function updateYuushaParty(deltaTime) {
    if (!_hasBuff('doi_hinh_chien')) return;
    try {
        _updateYuushaPartyInner(deltaTime);
    } catch (err) {
        console.error('updateYuushaParty failed:', err);
    }
}

function _updateYuushaPartyInner(deltaTime) {
    const squad = window._yuushaSquad || [];
    const now = performance.now();

    _updateYuushaFormation();
    _checkYuushaBulletCollisions(now);
    _checkYuushaSentinelReplenish(now);

    for (const s of squad) {
        if (s.hp <= 0) {
            // Respawn a fallen member 8s after it drops
            if (s._deathTime && now - s._deathTime > 8000) {
                s.hp = s.maxHp;
                s.scale = 0;
                s.spawnStart = now;
                s._deathTime = null;
                s.absorb = 0;
            }
            continue;
        }
        s.update(now, deltaTime);
    }

    const blades = window._yuushaBlades || [];
    for (const blade of blades) {
        blade.update();
        if (typeof enemies !== 'undefined') {
            for (const e of enemies) {
                if (e.hp <= 0 || blade.hitEnemies.has(e)) continue;
                const eRadius = e.size ? e.size / 2 : 15;
                if (Math.hypot(blade.x - e.x, blade.y - e.y) < blade.height / 2 + eRadius) {
                    blade.hitEnemies.add(e);
                    const ep = typeof primevalEnergy !== 'undefined' ? primevalEnergy : 0;
                    const dmg = 40 + ep * 0.04;
                    if (typeof dealDamage === 'function') {
                        dealDamage(e, {
                            damage: dmg, percentDamage: 0,
                            isTrueDamage: true, isPiercing: true,
                            _statSrc: 'Sigil: Yuusha Party',
                            _isYuushaParty: true
                        });
                    }
                    for (let i = 0; i < 10; i++) {
                        window._yuushaParticles.push(new YuushaParticle(
                            e.x, e.y,
                            e.x + (Math.random() - 0.5) * 100,
                            e.y + (Math.random() - 0.5) * 100,
                            '#93c5fd'
                        ));
                    }
                }
            }
        }
    }
    window._yuushaBlades = blades.filter(b => b.life > 0);

    const projs = window._yuushaProjectiles || [];
    for (const p of projs) {
        p.update();
        if (typeof enemies !== 'undefined' && !p._dead) {
            for (const e of enemies) {
                if (e.hp <= 0 || p.hitEnemies.has(e)) continue;
                const eRadius = e.size ? e.size / 2 : 15;
                const dist = Math.hypot(p.x - e.x, p.y - e.y);
                if (dist < eRadius + 6) {
                    p.hitEnemies.add(e);
                    const ep = typeof primevalEnergy !== 'undefined' ? primevalEnergy : 0;
                    const dmg = 75 + ep * 0.05;
                    if (typeof dealDamage === 'function') {
                        dealDamage(e, {
                            damage: dmg, percentDamage: 0,
                            isPiercing: true,
                            _statSrc: 'Sigil: Yuusha Party',
                            _isYuushaParty: true
                        });
                    }
                    for (let i = 0; i < 10; i++) {
                        window._yuushaParticles.push(new YuushaParticle(
                            e.x, e.y,
                            e.x + (Math.random() - 0.5) * 120,
                            e.y + (Math.random() - 0.5) * 120,
                            '#fde68a'
                        ));
                    }
                }
            }
        }
    }
    window._yuushaProjectiles = projs.filter(p =>
        p.y > -50 && p.y < canvas.height + 50 && p.x > -50 && p.x < canvas.width + 50
    );

    const zones = window._yuushaDotZones || [];
    for (const z of zones) {
        z.update(deltaTime);
        const tickNow = performance.now();
        if (typeof enemies !== 'undefined') {
            for (const e of enemies) {
                if (e.hp <= 0) continue;
                const eRadius = e.size ? e.size / 2 : 15;
                const dist = Math.hypot(z.x - e.x, z.y - e.y);
                if (dist < z.radius + eRadius) {
                    const lastTick = z.hitEnemies.get(e) || 0;
                    if (tickNow - lastTick >= 500) {
                        z.hitEnemies.set(e, tickNow);
                        const ep = typeof primevalEnergy !== 'undefined' ? primevalEnergy : 0;
                        const dmg = 50 + ep * 0.04;
                        if (typeof dealDamage === 'function') {
                            dealDamage(e, {
                                damage: dmg, percentDamage: 0,
                                _statSrc: 'Sigil: Yuusha Party',
                                _isYuushaParty: true,
                                _noBase60: true
                            });
                        }
                    }
                }
            }
        }
    }
    window._yuushaDotZones = zones.filter(z => z.life > 0);

    const parts = window._yuushaParticles || [];
    for (const p of parts) p.update();
    window._yuushaParticles = parts.filter(p => p.life > 0);

    const rays = window._yuushaBurstRays || [];
    for (const r of rays) {
        r.life -= deltaTime / 300;
        r.x += r.vx * 3;
        r.y += r.vy * 3;
    }
    window._yuushaBurstRays = rays.filter(r => r.life > 0);

    const fts = window._yuushaFloatingTexts || [];
    window._yuushaFloatingTexts = fts.filter(ft => now - ft.start < ft.life);
}

function drawYuushaParty() {
    if (!_hasBuff('doi_hinh_chien')) return;
    try {
        _drawYuushaPartyInner();
    } catch (err) {
        console.error('drawYuushaParty failed:', err);
    }
}

function _drawYuushaPartyInner() {
    const squad = window._yuushaSquad || [];
    const now = performance.now();
    const _lq = typeof _mobPerf !== 'undefined' && _mobPerf;

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
    for (const s of squad) {
        if (s.role === 'Tank' && s.hp > 0) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 90, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();

    for (const z of (window._yuushaDotZones || [])) z.draw(ctx);

    for (const s of squad) {
        if (s.hp <= 0) continue;
        s.drawBase(ctx, now);
        s.drawAttachments(ctx, now);
        s.drawMageCrystal(ctx, now);
    }

    for (const b of (window._yuushaBlades || [])) b.draw(ctx);
    for (const p of (window._yuushaProjectiles || [])) p.draw(ctx);
    for (const p of (window._yuushaParticles || [])) p.draw(ctx);

    for (const r of (window._yuushaBurstRays || [])) {
        ctx.save();
        if (!_lq) { ctx.shadowBlur = 15; ctx.shadowColor = '#a855f7'; }
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x + r.vx * 15, r.y + r.vy * 15);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(233, 213, 255, ${Math.max(0, r.life)})`;
        ctx.stroke();
        ctx.restore();
    }

    const fts = window._yuushaFloatingTexts || [];
    for (const ft of fts) {
        const p = (now - ft.start) / ft.life;
        if (p > 1) continue;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = 1 - p;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y - p * 30);
        ctx.globalAlpha = 1;
    }
}
