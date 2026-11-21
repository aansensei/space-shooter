(function (root) {
    'use strict';
    const TAU = Math.PI * 2;
    const SWORD = {
        wardRadius: 92, wardTime: .9, bladeStagger: .07, orbitRate: 4.8,
        flightSpeed: 2400, passTime: .34, turnTime: .24, rejoinRadius: 80, rejoinTime: .3,
        hitInterval: .15, hitDamage: 8, hitsPerPass: 3, cancelRadius: 30, cancelLimit: 18,
        trailSize: 8, trailInterval: 1 / 60, flashTime: .18
    };
    const BLADE_STAGE = { WARD: 0, LAUNCH: 1, OUTBOUND_PASS: 2, TURN: 3, INBOUND_PASS: 4, RETURN: 5, REJOIN: 6, DONE: 7 };
    const BOSS_HITBOX_FALLBACK = { rx: 78, ry: 62, offsetY: -4 };
    let swordSprites;
    function sound(key, x, y) { root.AudioMgr?.playSfxAt(key, x, y); }
    function bossHitbox(s) {
        const id = s.attacks.currentAttackId;
        const phase = id <= 6 ? 1 : id <= 13 ? 2 : 3;
        return root.getDuelBossHitbox?.(phase, s.bossPhaseMorph) || BOSS_HITBOX_FALLBACK;
    }
    function reset(s, cooldown = false) {
        s.playerSkills = [];
        if (cooldown) s.skillACooldown = 0;
        for (const b of s.playerBulletPool || []) if (b.skillASource) b.active = false;
    }
    function cast(s) {
        if (s.state !== 'playing' || root.gamePaused || (typeof gamePaused !== 'undefined' && gamePaused) || s.shiftActive || root._duelIsShiftHeld?.() || s.skillACooldown > 0) return false;
        const w = s.selectedWeapon, def = w?.skillA;
        if (!def) return false;
        const p = typeof player !== 'undefined' ? player : {x:640,y:640};
        s.skillACooldown = def.cooldown;
        s.stats.skillAUses = (s.stats.skillAUses || 0) + 1;
        const e = {id:w.id, age:0, x:p.x, y:p.y - 24, hit:false, boonRecorded:false, cancelled:0, hitCount:0, ticks:0, next:0, duration:2.2};
        s.playerSkills.push(e);
        if (w.id === 'heavy_lance') {
            const b = s.spawnPlayerBullet(e.x,e.y,0,-20,90,w.id,14,true);
            if (b) { b.skillASource = e; b.skillAImpact = true; }
            s.lanceVolleyCounter = 7;
        }
        e.duration = {sword:6,spear:1.55,halberd:1.25,dagger_array:5.3,heavy_lance:2.2}[w.id];
        if (w.id === 'sword') {
            e.x = p.x;
            e.y = p.y;
            e.blades = [];
            e.dissolveAge = -1;
            e.hitbox = bossHitbox(s);
            for (let i = 0; i < 3; i++) {
                const angle = i * TAU / 3;
                e.blades.push({
                    x: p.x + Math.cos(angle) * SWORD.wardRadius,
                    y: p.y + Math.sin(angle) * SWORD.wardRadius,
                    angle: angle + Math.PI / 2, stage: BLADE_STAGE.WARD, time: 0, hits: 0, next: 0,
                    trail: new Float32Array(SWORD.trailSize * 2), trailCount: 0, trailHead: 0, trailClock: 0,
                    flash: 0, flashX: 0, flashY: 0, flashAngle: 0, finisher: false
                });
            }
        }
        if(w.id==='dagger_array') e.next=.135;
        sound('duel-relic-' + w.id + '-cast',e.x,e.y);
        return true;
    }
    function damage(s,e,amount,x,y,heavy=false) {
        const value = s._damageBoss(amount,x,y,{source:'skillA',entity:e,heavy,vx:0,vy:-1});
        if (value > 0) {e.hitCount++; sound('duel-relic-' + e.id + '-hit',x,y);}
        return value;
    }
    function impact(s,b,x,y) {
        const e=b.skillASource;
        if (!e || !b.skillAImpact) return;
        e.hit=true; e.impactX=x; e.impactY=y; e.impactAge=e.age;
        damage(s,e,30,x,y,true);
        sound('duel-relic-heavy_lance-impact',x,y);
    }
    function update(s,dt) {
        if (s.state !== 'playing') {reset(s); return;}
        const before=s.skillACooldown || 0;
        s.skillACooldown=Math.max(0,before-dt);
        if (before>0 && s.skillACooldown===0) sound('duel-relic-ready');
        if (s.playerSkills.length === 0) return;
        const p=typeof player !== 'undefined' ? player : {x:640,y:640};
        const boss = s.bossPos;
        const hb = s.playerSkills[0].hitbox || bossHitbox(s);
        for (const e of s.playerSkills) {
            e.age+=dt;
            if(e.id==='sword') {
                updateSword(s,e,p,boss,hb,dt);
            } else if(e.id==='spear') {
                if(e.age>=.6 && !e.released){e.released=true;sound('duel-relic-spear-release',e.x,e.y);}
                while(e.ticks<6 && e.age+1e-7>=.6+e.ticks*.1) {
                    if(boss.y<e.y && Math.abs(boss.x-e.x)<=hb.rx+28) damage(s,e,30,boss.x,boss.y,true);
                    e.ticks++;
                }
                if(e.age>=.6 && e.age<=1.2) cancel(s,e,b=>b.y<=e.y && Math.abs(b.x-e.x)<35,18);
            } else if(e.id==='halberd') {
                const reach=(typeof canvas!=='undefined'?canvas.height:720)*1.1;
                while(e.ticks<5 && e.age+1e-7>=.12+e.ticks*.18) {
                    const dx=boss.x-e.x,dy=boss.y-e.y;
                    if(dy<0 && Math.hypot(dx,dy)<reach+hb.ry) damage(s,e,30,boss.x,boss.y,true);
                    e.ticks++;
                }
                if(e.age<.9) cancel(s,e,b=>b.y<e.y && Math.hypot(b.x-e.x,b.y-e.y)<reach,18);
            } else if(e.id==='dagger_array') {
                e.x=p.x;e.y=p.y-24;
                while(e.next<=5 && e.age+1e-7>=e.next) {
                    for(const side of [-1,1]) for(const offset of [-35,-35/3,35/3,35]) {
                        const x=Math.max(42,Math.min((typeof canvas!=='undefined'?canvas.width:1280)-42,p.x+side*48));
                        const b=s.spawnPlayerBullet(x+offset,e.y,0,-14.5,s.selectedWeapon.damagePerBullet*.4,'dagger_array',3.5,false);
                        if(b)b.skillASource=e;
                    }
                    sound('duel-relic-dagger_array-volley',e.x,e.y);e.next+=.135;
                }
            }
        }
        let active = 0;
        for (const effect of s.playerSkills) {
            if (effect.age < effect.duration) s.playerSkills[active++] = effect;
        }
        s.playerSkills.length = active;
    }
    function cancel(s,e,test,limit) {
        if(e.cancelled>=limit)return;
        for(const b of s.pool.bullets) if(b.active && test(b)) {
            b.active=false;s.pool.activeCount--;e.cancelled++;
            root.DuelBullets?.spawnCancelMote(b.x,b.y);
            if(!e.cancelSound || e.age-e.cancelSound>.12){sound('duel-relic-cancel',b.x,b.y);e.cancelSound=e.age;}
            if(e.cancelled>=limit)break;
        }
    }
    function cancelBlade(s, effect, blade, fromX, fromY) {
        if (!s.pool.activeCount || effect.cancelled >= SWORD.cancelLimit) return;
        const dx = blade.x - fromX, dy = blade.y - fromY;
        const lengthSq = dx * dx + dy * dy;
        const particles = root._fxOpts?.particles !== false;
        for (const bullet of s.pool.bullets) {
            if (!bullet.active) continue;
            const bx = bullet.x - fromX, by = bullet.y - fromY;
            const along = lengthSq ? Math.max(0, Math.min(1, (bx * dx + by * dy) / lengthSq)) : 0;
            const radius = SWORD.cancelRadius + (bullet.radius || 0);
            if ((bx - dx * along) ** 2 + (by - dy * along) ** 2 > radius * radius) continue;
            bullet.active = false;
            s.pool.activeCount--;
            effect.cancelled++;
            if (particles) root.DuelBullets?.spawnCancelMote(bullet.x, bullet.y);
            if (!effect.cancelSound || effect.age - effect.cancelSound > .12) {
                sound('duel-relic-cancel', bullet.x, bullet.y);
                effect.cancelSound = effect.age;
            }
            if (effect.cancelled === SWORD.cancelLimit) break;
        }
    }

    function updateSword(s, effect, ship, boss, hitbox, dt) {
        const stage = BLADE_STAGE;
        const cfg = SWORD;
        effect.x = ship.x;
        effect.y = ship.y;
        const bx = boss.x, by = boss.y + (hitbox.offsetY || 0);
        let done = 0;
        for (let i = 0; i < effect.blades.length; i++) {
            const blade = effect.blades[i];
            const oldX = blade.x, oldY = blade.y;
            const previousStage = blade.stage;
            const offset = i * TAU / 3;
            const orbitAngle = effect.age * cfg.orbitRate + offset;
            blade.flash = Math.max(0, blade.flash - dt);
            blade.time += dt;
            if (previousStage === stage.WARD || previousStage === stage.REJOIN) {
                const warding = previousStage === stage.WARD;
                const radius = warding ? cfg.wardRadius : cfg.rejoinRadius * Math.max(0, 1 - blade.time / cfg.rejoinTime);
                blade.x = ship.x + Math.cos(orbitAngle) * radius;
                blade.y = ship.y + Math.sin(orbitAngle) * radius;
                blade.angle = orbitAngle + Math.PI / 2;
                if (warding && effect.age >= cfg.wardTime + i * cfg.bladeStagger) {
                    blade.stage = stage.LAUNCH;
                    blade.time = 0;
                    if (i === 0) sound('duel-relic-sword-release', ship.x, ship.y);
                } else if (!warding && blade.time >= cfg.rejoinTime) {
                    blade.stage = stage.DONE;
                }
            } else if (previousStage === stage.LAUNCH || previousStage === stage.RETURN) {
                const returning = previousStage === stage.RETURN;
                const targetAngle = returning ? orbitAngle : offset - 1.4;
                const tx = returning ? ship.x + Math.cos(targetAngle) * cfg.rejoinRadius : bx + Math.cos(targetAngle) * hitbox.rx * .55;
                const ty = returning ? ship.y + Math.sin(targetAngle) * cfg.rejoinRadius : by + Math.sin(targetAngle) * hitbox.ry * .55;
                const dx = tx - blade.x, dy = ty - blade.y;
                const step = cfg.flightSpeed * dt;
                if (dx * dx + dy * dy <= step * step) {
                    blade.x = tx;
                    blade.y = ty;
                    blade.stage = returning ? stage.REJOIN : stage.OUTBOUND_PASS;
                    blade.time = 0;
                    blade.next = 0;
                    if (returning && !effect.rejoined) {
                        effect.rejoined = true;
                        sound('duel-relic-sword-return', ship.x, ship.y);
                    }
                } else {
                    const sway = Math.sin(Math.min(1, blade.time / .35) * Math.PI);
                    const bend = sway * ((i - 1) * .38 + .13) * (returning ? -.85 : 1);
                    blade.angle = Math.atan2(dy, dx) + bend;
                    blade.x += Math.cos(blade.angle) * step;
                    blade.y += Math.sin(blade.angle) * step;
                }
            } else if (previousStage === stage.OUTBOUND_PASS || previousStage === stage.INBOUND_PASS) {
                const outbound = previousStage === stage.OUTBOUND_PASS;
                const direction = outbound ? 1 : -1;
                const angle = offset + direction * (Math.min(1, blade.time / cfg.passTime) * 2.8 - 1.4);
                blade.x = bx + Math.cos(angle) * hitbox.rx * .55;
                blade.y = by + Math.sin(angle) * hitbox.ry * .55;
                blade.angle = angle + direction * Math.PI / 2;
                const passLimit = cfg.hitsPerPass * (outbound ? 1 : 2);
                if (blade.hits < passLimit && blade.time + 1e-9 >= blade.next) {
                    if (damage(s, effect, cfg.hitDamage, blade.x, blade.y)) {
                        blade.flash = cfg.flashTime;
                        blade.flashX = blade.x;
                        blade.flashY = blade.y;
                        blade.flashAngle = angle;
                        blade.finisher = blade.hits + 1 === passLimit;
                        if (root._screenShakeEnabled !== false && !root._fxOpts?.reducedMotion && typeof _setShake === 'function') {
                            _setShake(blade.finisher ? 1.5 : .65, blade.finisher ? 65 : 35);
                        }
                    }
                    blade.hits++;
                    blade.next = blade.time + cfg.hitInterval;
                }
                if (blade.hits === passLimit && blade.time >= cfg.passTime) {
                    blade.stage = outbound ? stage.TURN : stage.RETURN;
                    blade.time = 0;
                }
            } else if (previousStage === stage.TURN) {
                const fraction = Math.min(1, blade.time / cfg.turnTime);
                const angle = offset + 1.4 + fraction * TAU;
                const radius = .55 + Math.sin(fraction * Math.PI) * .63;
                blade.x = bx + Math.cos(angle) * hitbox.rx * radius;
                blade.y = by + Math.sin(angle) * hitbox.ry * radius;
                blade.angle = angle + Math.PI / 2;
                if (fraction === 1) {
                    blade.stage = stage.INBOUND_PASS;
                    blade.time = 0;
                    blade.next = 0;
                }
            }
            if (blade.stage === stage.DONE) {
                done++;
                continue;
            }
            const sweeping = previousStage === stage.LAUNCH || previousStage === stage.RETURN;
            cancelBlade(s, effect, blade, sweeping ? oldX : blade.x, sweeping ? oldY : blade.y);
            blade.trailClock += dt;
            if (blade.trailClock + 1e-9 >= cfg.trailInterval) {
                blade.trailClock = Math.max(0, blade.trailClock - cfg.trailInterval);
                blade.trailHead = (blade.trailHead + 1) % cfg.trailSize;
                const slot = blade.trailHead * 2;
                blade.trail[slot] = oldX;
                blade.trail[slot + 1] = oldY;
                blade.trailCount = Math.min(cfg.trailSize, blade.trailCount + 1);
            }
        }
        if (done === effect.blades.length && effect.dissolveAge < 0) {
            effect.dissolveAge = effect.age;
            effect.duration = effect.age + .2;
        }
    }

    function bakeCrescent(outerGlow) {
        const sprite = document.createElement('canvas');
        sprite.width = sprite.height = 80;
        const g = sprite.getContext('2d');
        g.translate(40, 40);
        g.beginPath();
        g.moveTo(-12, -27);
        g.bezierCurveTo(30, -24, 34, 20, -12, 29);
        g.bezierCurveTo(12, 10, 12, -9, -12, -27);
        g.closePath();
        g.lineJoin = 'round';
        if (outerGlow) {
            g.shadowColor = '#62cfff';
            g.shadowBlur = 8;
            g.strokeStyle = '#5cc7ff88';
            g.lineWidth = 5;
            g.stroke();
            g.shadowBlur = 0;
        }
        const light = g.createLinearGradient(-10, 0, 21, 0);
        light.addColorStop(0, '#69bff5');
        light.addColorStop(1, '#f3ffff');
        g.fillStyle = light;
        g.fill();
        g.strokeStyle = '#f3ffff';
        g.lineWidth = 1.5;
        g.stroke();
        return sprite;
    }

    function drawCrescent(ctx, sprite, x, y, angle, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    function renderSword(ctx, effect, fx, low) {
        if (!swordSprites) swordSprites = { blade: bakeCrescent(false), glow: bakeCrescent(true) };
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < effect.blades.length; i++) {
            const blade = effect.blades[i];
            if (blade.stage !== BLADE_STAGE.DONE) {
                const fade = Math.min(1, effect.age / .12, blade.stage === BLADE_STAGE.REJOIN ? 1 - blade.time / SWORD.rejoinTime : 1);
                const trailLength = Math.min(blade.trailCount, fx.reducedMotion ? 2 : low ? 4 : SWORD.trailSize);
                if (trailLength) {
                    ctx.lineWidth = low ? 3 : 4.5;
                    ctx.strokeStyle = '#8fdfff';
                    for (let end = 0; end < trailLength; end += 3) {
                        const startSlot = ((blade.trailHead - end + SWORD.trailSize) % SWORD.trailSize) * 2;
                        ctx.globalAlpha = fade * .31 * (1 - end / trailLength);
                        ctx.beginPath();
                        if (end === 0) ctx.moveTo(blade.x, blade.y);
                        else ctx.moveTo(blade.trail[startSlot], blade.trail[startSlot + 1]);
                        for (let j = end; j <= Math.min(end + 3, trailLength - 1); j++) {
                            const slot = ((blade.trailHead - j + SWORD.trailSize) % SWORD.trailSize) * 2;
                            ctx.lineTo(blade.trail[slot], blade.trail[slot + 1]);
                        }
                        ctx.stroke();
                        if (fx.particles !== false && !low && !fx.reducedMotion) {
                            ctx.fillStyle = '#c8f5ff';
                            ctx.fillRect(blade.trail[startSlot] + Math.sin(effect.age * 9 + end) * 10, blade.trail[startSlot + 1] + 4, 2, 2);
                        }
                    }
                }
                ctx.globalAlpha = fade;
                const sprite = fx.glow !== false && !low ? swordSprites.glow : swordSprites.blade;
                drawCrescent(ctx, sprite, blade.x, blade.y, blade.angle, 80);
            }
            if (blade.flash > 0) {
                const remaining = blade.flash / SWORD.flashTime;
                ctx.globalAlpha = remaining * (fx.reducedMotion ? .5 : .9);
                ctx.strokeStyle = '#e5fbff';
                ctx.lineWidth = blade.finisher ? 4 : 2;
                const outward = blade.flashAngle;
                const reach = effect.hitbox.ry * (blade.finisher ? 1.14 : .93);
                const radius = reach + (fx.reducedMotion ? 0 : (1 - remaining) * 14);
                ctx.beginPath();
                ctx.arc(blade.flashX, blade.flashY, radius, outward - .7, outward + .7);
                ctx.stroke();
                if (fx.glow !== false && !low) {
                    ctx.globalAlpha *= .46;
                    ctx.strokeStyle = '#68cfff';
                    ctx.lineWidth *= 2.7;
                    ctx.stroke();
                }
            }
        }
        if (effect.dissolveAge >= 0) {
            const fraction = (effect.age - effect.dissolveAge) / .2;
            const radius = fx.reducedMotion ? 58 : 28 + fraction * 72;
            ctx.globalAlpha = (1 - fraction) * .9;
            ctx.strokeStyle = '#caf6ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(effect.x, effect.y, radius, radius * .53, 0, 0, TAU);
            ctx.stroke();
            if (fx.glow !== false && !low) {
                ctx.globalAlpha *= .42;
                ctx.strokeStyle = '#5eafff';
                ctx.lineWidth = 7;
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function render(ctx,s) {
        const fx=root._fxOpts || {}, low=typeof _gfxLevel !== 'undefined' && _gfxLevel>=2;
        ctx.save();
        for (const e of s.playerSkills || []) {
            const fade=Math.min(1,e.age/.12,(e.duration-e.age)/.25);
            ctx.globalAlpha=fade*.7; ctx.strokeStyle='#efbe80'; ctx.lineWidth=2;
            if (e.id==='heavy_lance') {
                const y=e.y-e.age*1200;
                ctx.beginPath();ctx.moveTo(e.x,y-45);ctx.lineTo(e.x+15,y+5);ctx.lineTo(e.x,y+36);ctx.lineTo(e.x-15,y+5);ctx.closePath();ctx.stroke();
                if(e.hit) {
                    const u=Math.min(1,(e.age-e.impactAge)/.6);
                    ctx.globalAlpha=(1-u)*.75;ctx.lineWidth=8*(1-u)+1;
                    ctx.beginPath();ctx.ellipse(e.impactX,e.impactY,15+u*150,8+u*65,0,0,TAU);ctx.stroke();
                }
            } else if(e.id==='sword') {
                renderSword(ctx,e,fx,low);
            } else if(e.id==='spear') {
                ctx.strokeStyle='#c8aff2';
                if(e.age<.6) {
                    ctx.beginPath();ctx.ellipse(e.x,e.y,12+e.age*45,5+e.age*18,0,0,TAU);ctx.stroke();
                    ctx.globalAlpha=.18;ctx.fillStyle='#c8aff2';ctx.fillRect(e.x-35,0,70,e.y);
                } else {
                    const pulse=fx.reducedMotion?1:1+.08*Math.sin(e.age*24);
                    ctx.globalAlpha=fade*.25;ctx.fillStyle='#ac81cb';ctx.fillRect(e.x-35,0,70,e.y);
                    ctx.globalAlpha=fade*.75;ctx.fillStyle='#ead6ff';ctx.fillRect(e.x-3*pulse,0,6*pulse,e.y);
                    ctx.beginPath();ctx.moveTo(e.x-35,e.y);ctx.lineTo(e.x,0);ctx.lineTo(e.x+35,e.y);ctx.stroke();
                }
            } else if(e.id==='halberd') {
                const reach=(typeof canvas!=='undefined'?canvas.height:720)*1.1;
                const u=Math.min(1,e.age/.9),angle=-Math.PI+u*Math.PI;
                ctx.globalAlpha=fade*.07;ctx.fillStyle='#dc8f7e';
                ctx.beginPath();ctx.arc(e.x,e.y,reach,Math.PI,TAU);ctx.lineTo(e.x,e.y);ctx.closePath();ctx.fill();
                ctx.globalAlpha=fade*.48;ctx.strokeStyle='#ebb69f';ctx.lineWidth=low?3:6;
                ctx.beginPath();ctx.arc(e.x,e.y,reach*.9,angle-.5,angle+.1);ctx.stroke();
                ctx.globalAlpha=fade*.45;ctx.lineWidth=2;
                for(let i=0;i<(low?2:5);i++){ctx.beginPath();ctx.arc(e.x,e.y,reach*(.3+i*.15),Math.PI+.12,TAU-.12);ctx.stroke();}
            } else if(e.id==='dagger_array' && e.age<=5) {
                for(const side of [-1,1]) {
                    const x=Math.max(42,Math.min((typeof canvas!=='undefined'?canvas.width:1280)-42,e.x+side*48));
                    ctx.globalAlpha=fade*.45;ctx.fillStyle='#ac9bd3';ctx.strokeStyle='#d8c9ef';
                    ctx.beginPath();ctx.moveTo(x,e.y-30);ctx.lineTo(x+20,e.y+19);ctx.lineTo(x,e.y+10);ctx.lineTo(x-20,e.y+19);ctx.closePath();ctx.fill();ctx.stroke();
                }
            }
            if(e.id!=='sword' && fx.particles!==false && !low) for(let i=0;i<8;i++) {
                const a=i*2.39996,r=12+(fx.reducedMotion ? .4 : e.age)*45;
                ctx.globalAlpha=fade*.35;ctx.fillStyle='#f2d59c';ctx.fillRect(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,2,2);
            }
        }
        ctx.restore();
    }
    root.DuelWeaponSkills={reset,cast,update,render,impact,damage};
})(typeof window !== 'undefined' ? window : globalThis);
