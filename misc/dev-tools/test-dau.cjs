// Runs production scripts with a virtual game clock in a headless browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Point PLAYWRIGHT_NODE_MODULES at a node_modules folder that contains playwright.
const runtime = process.env.PLAYWRIGHT_NODE_MODULES || __dirname;
const { chromium } = require(require.resolve('playwright', { paths: [runtime, __dirname] }));
const root = path.resolve(__dirname, '../..');
async function main() {
    for (const file of ['index.html', 'guide.html']) {
        for (const m of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
            if (m[1].trim() && !m[0].includes('application/ld+json')) new vm.Script(m[1]);
        }
    }
    const browser = await chromium.launch({ executablePath: process.env.DAU_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const errors = [];
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
        await page.goto('file:///' + path.join(root, 'index.html').replaceAll('\\', '/'));
        await page.waitForFunction(() => typeof debugStartSession === 'function');
        await page.keyboard.press('Backquote');
        const debugKeyboard = await page.locator('#debugConsoleOverlay').isVisible();
        await page.keyboard.press('Backquote');
        await page.evaluate(() => {
            window.AudioMgr = null; debugStartSession(); closeDebugConsole();
            window._realNow = performance.now.bind(performance);
            Math.random = () => 0.999; window._testNow = 100000; performance.now = () => window._testNow;
            window._dauTestReset = () => {
                enemies = []; bullets = []; sentinels = []; spirits = []; particles = []; explosions = [];
                bossShockwaves = []; raphaelLasers = []; raphaelWisdomOrbs = []; raphaelWisdomZones = []; marchosiasBlades = []; photoBrangs = []; bladeArcProjectiles = [];
                window._goliathOrbs = []; window._goliathMeteors = []; window._goliathSwords = []; window._goliathEchoes = []; window._urielBarriers = []; window._urielHolySwords = [];
                window._sigilPicker = null; window._kanadeCutscene = null; window._timelineDistortion = null;
                window._playerSigils = [{ sigilId: 'dau' }]; _leoReset(); _dauReset();
                gameState = 'playing'; gamePaused = false; gameElapsedTime = 180000; _waveNumber = 0;
                skillShiftActive = false; gloryForJusticeActive = false; charging = false; laserActive = false;
                skillFState = 'ready'; skillGActive = false; lives = 999;
                window._debugGodMode = true; window._debugAutoshotOff = true;
                window._administratorsFavorActive = false; window._stackOverflowActive = false;
                player.x = canvas.width / 2; player.y = canvas.height * 0.75; player.atk = 100;
                player._rooted = false; player._silenced = false; player._wisdomOrbSlowed = false;
                window._testNow += 10000; screenShake.intensity = 0; screenShake.duration = 0;
            };
            window._dauStep = ms => { window._testNow += ms; update(ms); };
            window._dauMob = (type = 'apostle', x = player.x, y = player.y) => ({ type, x, y, hp: 1000000, maxHp: 1000000, size: 30, speed: 0, shield: 0, ironBodyHits: 0 });
            window._dauSkillList = kind => kind === 'marchosias' ? marchosiasBlades : kind === 'uriel' ? window._urielHolySwords : kind === 'raphael' ? raphaelWisdomOrbs : kind === 'dargruel' ? enemies : kind === 'meteor' ? window._goliathMeteors : window._goliathOrbs;
            window._dauSkill = (kind, owner, x = player.x, y = player.y) => {
                const p = {x,y,owner,enemy:owner,ownerRef:owner,vx:0,vy:1,ang:Math.PI/2,speed:5,life:4000,atk:100,dmg:100,phase:'launch',active:true,delay:0,radius:88,hitEnemies:[],hitSentinels:[],hitTargets:[],trail:[],type:kind==='dargruel'?'abyssal_chain':kind,hp:9999,maxHp:9999,size:16,shield:0,originX:x,originY:y};
                _dauSkillList(kind).push(p); return p;
            };
        });
        const results = await page.evaluate(() => {
            const results = [], assert = (v, m) => { if (!v) throw Error(m); };
            const test = (name, fn) => { try { _dauTestReset(); fn(); results.push({ name, pass: true }); } catch(e) { results.push({ name, pass: false, error: e.message }); } };
            const mark = e => { window._dauCrowId = 1; window._dauDaybreakMs = 4000; e._dauCrowId = 1; };
            const hit = e => { const hp = e.hp; dealDamage(e, { damage: 100, _noHitSfx: true }); return hp - e.hp; };
            test('A1: debug equip and exact 10s cadence', () => { window._playerSigils = []; debugToggleSigil('dau', true); for(let i=0;i<1200;i++) _dauStep(10000/1200); assert(window._dauCrowId === 1, 'first crow'); for(let i=0;i<1200;i++) _dauStep(10000/1200); assert(window._dauCrowId === 2, 'second crow'); });
            test('A2: pause, picker and Kanade hold the clock for 5s', () => { for(const flag of ['pause','picker','kanade']) { _dauTestReset(); _dauStep(3000); if(flag==='pause') gamePaused=true; else if(flag==='picker') window._sigilPicker={}; else window._kanadeCutscene={}; for(let i=0;i<600;i++) _dauBeginFrame(5000/600, performance.now()); assert(window._dauCrowTimer===3000, flag); gamePaused=false; window._sigilPicker=null; window._kanadeCutscene=null; _dauStep(7000); assert(window._dauCrowId===1, flag+' resumes'); } });
            test('A3: clear 40 bullets and preserve chain', () => { for(let i=0;i<40;i++) enemies.push(_dauMob(['enemy_bullet','enemy_bullet_small','enemy_bullet_large'][i%3],player.x+i,player.y)); const chain=_dauMob('abyssal_chain'); enemies.push(chain); _dauTriggerCrow(); _dauBeginFrame(100,performance.now()); assert(enemies.slice(0,40).every(e=>e.hp===0),'bullets'); assert(chain.hp===chain.maxHp,'chain'); });
            test('A4: global 4s window and late spawn behind ring', () => { const e=_dauMob(); enemies.push(e); _dauTriggerCrow(); _dauBeginFrame(100,performance.now()); assert(_dauHasDaybreak(e),'marked'); const late=_dauMob(); enemies.push(late); _dauBeginFrame(100,performance.now()); assert(!_dauHasDaybreak(late),'late spawn'); _dauBeginFrame(3799,performance.now()); assert(_dauHasDaybreak(e),'3999'); _dauBeginFrame(1,performance.now()); assert(!_dauHasDaybreak(e),'4000'); });
            test('A5: damage multiplier and Circuit Engineer debuff', () => { const r=Math.random; Math.random=()=>0.999; try { const a=_dauMob(),b=_dauMob(); const base=hit(a); mark(b); assert(hit(b)===Math.ceil(base*1.2),'damage'); assert(_hasAnyDebuff(b),'debuff'); } finally {Math.random=r;} });
            test('A6: 200 Dargruel hits bypass evade only with Daybreak', () => { const r=Math.random; Math.random=()=>0.1; try { const e=_dauMob('dargruel'); mark(e); let misses=0; for(let i=0;i<200;i++) if(hit(e)===0) misses++; assert(misses===0,'marked misses'); window._dauDaybreakMs=0; let ordinaryMisses=0;for(let i=0;i<200;i++)if(hit(e)===0)ordinaryMisses++;assert(ordinaryMisses>0,'unmarked evade'); } finally {Math.random=r;} });
            test('A7: Uriel erosion, ten hit camouflage and 30% floor', () => { const r=Math.random; Math.random=()=>0.1; try { spawnUriel(); const e=enemies.at(-1); e.hp=e.maxHp=1000000; e.ironBodyHits=0; mark(e); for(let i=1;i<=10;i++) { assert(hit(e)>0,'hit '+i); assert(Math.abs(e._urielEvade-(0.99-i*0.05))<1e-7,'erosion '+i); } assert(e._camoPhase==='stealthing','ten hit camo'); e._camoPhase='shielded'; e.ironBodyHits=0; for(let i=0;i<10;i++) hit(e); assert(e._urielEvade===0.30,'floor'); window._dauDaybreakMs=0; assert(hit(e)===0,'remaining evade'); } finally {Math.random=r;} });
            test('A8: Goliath subtracts 30 percentage points', () => { const r=Math.random; try { spawnGoliath(); const e=enemies.at(-1); _goliathEnterTrueForm(e); e.hp=e.maxHp=1000000; e._trueFormEnteredAt=performance.now(); e._transformIronBodyEnd=0; e._unbrokenWillUsed=false; Math.random=()=>0.11; assert(hit(e)===0,'normal evade'); mark(e); assert(hit(e)>0,'reduced evade'); Math.random=()=>0.05; assert(hit(e)===0,'remaining evade'); window._dauDaybreakMs=0; assert(hit(e)===0,'normal low roll'); } finally {Math.random=r;} });
            test('A9: native Uriel reveal clears Iron Body without preselected position', () => { spawnUriel(); const e=enemies.at(-1); e.x=player.x; e.y=player.y; e._camoPhase='stealthed'; e._stealthed=true; e._camoNextPicked=false; e.ironBodyHits=999; _dauTriggerCrow(); _dauBeginFrame(1,performance.now()); assert(e._stealthed,'native reveal pending'); _urielUpdateCamouflage(e,1); assert(!e._stealthed && e.ironBodyHits===0 && Number.isFinite(e.x) && Number.isFinite(e.y),'native reveal'); assert(_dauHasDaybreak(e),'reveal mark'); });
            test('A10: Unbroken Will rejects and clears Daybreak', () => { const e=_dauMob('goliath'); e.phase='true_form'; e._debuffImmuneEnd=performance.now()+4000; enemies.push(e); _dauTriggerCrow(); _dauBeginFrame(1,performance.now()); assert(!_dauHasDaybreak(e),'immune'); mark(e); _goliathClearDebuffs(e); assert(!_dauHasDaybreak(e),'cleansed'); });
            test('A11: menu and new game reset all state', () => { _dauTriggerCrow(); _returnToMainMenu(); assert(window._dauCrowId===0 && !window._dauRings.length,'menu'); _dauTriggerCrow(); startGame(); assert(window._dauCrowId===0 && !window._dauRings.length,'new game'); });
            test('A12: unequipped begin frame returns without mutation', () => { window._playerSigils=[]; window._dauCrowTimer=123; _dauBeginFrame(10000,performance.now()); assert(window._dauCrowTimer===123 && window._dauCrowId===0,'inactive'); });
            test('A13: localized picker and missing glyph fallback', () => { const lang=window._lang; window._lang='en'; assert(_localizedSigil('dau').element==='Metal','EN'); window._lang='vi'; assert(_localizedSigil('dau').element==='Kim','VI'); const img=_zodiacGlyphImgs.dau;try{_zodiacGlyphImgs.dau={complete:false,naturalWidth:0};assert(!_getTintedZodiacGlyph('dau','#FFD23F',48),'missing sprite');_drawZodiacGlyph('dau',100,100,20,'#FFD23F');}finally{_zodiacGlyphImgs.dau=img;window._lang=lang;} });
            test('A14: real wave update and draw', () => { window._debugSessionActive=false; _waveNumber=0; _wavePhase='rest'; _waveRestTimer=0; _waveQueue=[]; _waveSpawnBudget=null; for(let i=0;i<1800;i++){ _dauStep(1000/120); if(i%4===0) draw(1000/120); } assert(_waveNumber>=1,'wave started'); assert(enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)),'finite'); });
            test('Crow overflow preserves fractional frame remainder', () => { _dauBeginFrame(10003,performance.now()); assert(window._dauCrowTimer===3,'remainder'); });
            test('Overlapping rings keep their own mark and bounded queue', () => { _dauTriggerCrow(); _dauBeginFrame(100,performance.now()); _dauTriggerCrow(); const e=_dauMob('apostle',player.x+DAU_RING_SPEED*110,player.y); enemies.push(e); _dauBeginFrame(20,performance.now()); assert(!_dauHasDaybreak(e),'old ring uses new id'); for(let i=0;i<100;i++) _dauTriggerCrow(); assert(window._dauRings.length<=64,'ring cap'); });
            test('Older ring cannot erase a newer Daybreak contact', () => { _dauTriggerCrow(); _dauBeginFrame(100,performance.now()); _dauTriggerCrow(); const e=_dauMob('apostle',player.x+DAU_RING_SPEED*105,player.y); enemies.push(e); _dauBeginFrame(110,performance.now()); assert(_dauHasDaybreak(e),'new mark overwritten'); });
            test('B: exactly 16 returns, all 60 bullets erased at their positions', () => { const target=_dauMob('apostle',player.x+200,player.y-200); enemies.push(target); for(let i=0;i<60;i++) enemies.push(_dauMob('enemy_bullet',player.x+20+i,player.y)); _dauTriggerCrow(); _dauBeginFrame(160,performance.now()); const returns=window._dauNeedles.filter(n=>n.kind===0); assert(returns.length===16,'return cap'); assert(returns.every(n=>n.x>=player.x+20 && n.x<=player.x+35 && n.y===player.y),'bullet origins'); assert(enemies.slice(1).every(e=>e.hp===0),'erase beyond cap'); });
            test('B: seven unique strongest targets, fewer enemies get no extra needles', () => { for(let i=1;i<=9;i++){const e=_dauMob('apostle',player.x+i*10,player.y-150); e.maxHp=e.hp=i*1000; enemies.push(e);} _dauTriggerCrow(); assert(window._dauNeedles.length===7,'seven'); assert(window._dauStarTargets.map(e=>e.maxHp).join(',')==='9000,8000,7000,6000,5000,4000,3000','strongest'); _dauReset(); enemies.length=3; _dauTriggerCrow(); assert(window._dauNeedles.length===3,'three'); });
            test('B: returns retarget dead or removed enemies and dissolve with none', () => { const a=_dauMob('apostle',player.x+150,player.y),b=_dauMob('apostle',player.x+300,player.y); enemies.push(a,b); _dauAddNeedle(0,player.x,player.y,a,-1); a.hp=0; _dauUpdateNeedles(10,performance.now()); assert(window._dauNeedles[0].target===b,'dead target'); enemies=[]; _dauUpdateNeedles(10,performance.now()); assert(!window._dauNeedles.length,'removed and none'); });
            test('B: 350ms warning, real true damage and 1.5s pin', () => { const e=_dauMob('apostle',player.x,100); enemies.push(e); _dauTriggerCrow(); const hp=e.hp; _dauUpdateNeedles(349,performance.now()); assert(e.hp===hp,'warning'); _dauUpdateNeedles(1,performance.now()); for(let i=0;i<40 && e.hp===hp;i++) _dauUpdateNeedles(10,performance.now()); assert(Math.abs(hp-e.hp-206.9)<1e-7,'star damage '+(hp-e.hp)); assert(e._rootEnd===performance.now()+1500,'pin'); _dauReset(); e._rootEnd=0; _dauAddNeedle(0,e.x,e.y,e,-1); _dauUpdateNeedles(1,performance.now()); assert(Math.abs(hp-e.hp-273.8)<1e-7,'return damage'); });
            test('B: pin holds native Uriel movement and respects CC immunity', () => { spawnUriel(); const e=enemies.at(-1); e.ironBodyHits=0; e._camoPhase='shielded'; e._camoTimer=0; e._rootEnd=e._dauPinEnd=performance.now()+1500; const x=e.x,y=e.y; _dauStep(100); assert(e.x===x && e.y===y,'Uriel patrol'); for(const type of ['egregor','dargruel','leviathan']) assert(!_dauPinAllowed(_dauMob(type)),type); const g=_dauMob('goliath'); g.phase='true_form'; g._debuffImmuneEnd=performance.now()+1500; assert(!_dauPinAllowed(g),'immune Goliath'); const m=_dauMob('marchosias'); m.arcBarrier={hp:100}; assert(!_dauPinAllowed(m),'barrier'); });
            test('B: native cleanup gives the same bullet rewards as Motherland', () => { const clear = dau => { _dauTestReset(); window._playerSigils=dau?[{sigilId:'dau'}]:[]; for(let i=0;i<40;i++){const b=_dauMob('enemy_bullet',player.x+100+i,player.y-100); b.vx=b.vy=0; enemies.push(b);} const before=score; if(dau) _dauTriggerCrow(); else bossShockwaves.push({active:true,x:player.x,y:player.y,radius:0,speed:200,maxRadius:2000,_isBTMWave:true,_hitEnemies:new Set()}); _dauStep(100); return score-before; }; const btm=clear(false),dau=clear(true); assert(dau===btm,'reward mismatch '+dau+' '+btm); });
            test('B: needle sources and reused impact sound are exact', () => { const damage=dealDamage, audio=window.AudioMgr, calls=[],sounds=[]; try { dealDamage=(e,s)=>calls.push({...s}); window.AudioMgr={playSfx:k=>sounds.push(k),playSfxAt:k=>sounds.push(k)}; const e=_dauMob(); enemies.push(e); _dauTriggerCrow(); _dauAddNeedle(0,e.x,e.y,e,-1); _dauUpdateNeedles(1000,performance.now()); assert(calls.some(s=>s.damage===60)&&calls.some(s=>s.damage===200),'coefficients'); assert(calls.every(s=>s.isTrueDamage&&s._noHitSfx&&s._statSrc==='Golden Needle'),'provenance'); assert(sounds.includes('dau-crow')&&sounds.includes('blood-arrow-impact'),'sound routes'); } finally {dealDamage=damage;window.AudioMgr=audio;} });
            test('B: no Golden Needle buff produces no needles', () => { const buffs=SIGIL_DEFS.dau.buffs; try {SIGIL_DEFS.dau.buffs=[buffs[0]]; const e=_dauMob(),b=_dauMob('enemy_bullet'); enemies.push(e,b); _dauTriggerCrow(); _dauBeginFrame(100,performance.now()); assert(!window._dauNeedles.length&&b.hp===0,'buff gate');} finally {SIGIL_DEFS.dau.buffs=buffs;} });
            test('B: queues stay bounded and reset releases all targets', () => { enemies.push(_dauMob('apostle',player.x,100)); for(let i=0;i<100;i++){_dauTriggerCrow();_dauEmit(1,100,100,400);} assert(window._dauNeedles.length<=64&&window._dauFx.length===64&&window._dauRings.length<=64,'caps'); _dauReset(); assert(!window._dauNeedles.length&&!window._dauRings.length&&window._dauNeedlePool.every(n=>!n.active&&!n.target)&&window._dauFx.every(f=>f.life===0),'release'); });
            test('B: all graphics tiers draw without live sprite baking', () => { const cache=_dauRenderCache; for(const level of [0,1,2,3,4]){_dauTestReset(); _applyGfxLevel(level); enemies.push(_dauMob('apostle',player.x,player.y-100)); _dauTriggerCrow(); for(let i=0;i<8;i++){_dauStep(50); draw(50);} assert(_dauRenderCache===cache,'cache '+level);} });
            test('B: Dominant displaces Apostle and CC immune Dargruel by 36px with easing', () => { const buffs=SIGIL_DEFS.dau.buffs; try {SIGIL_DEFS.dau.buffs=[buffs[0]]; const a=_dauMob(),d=_dauMob('dargruel'); enemies.push(a,d); const y=a.y; a.vy=d.vy=7; a._state=d._state='casting'; _dauTriggerCrow(); _dauBeginFrame(1,performance.now()); _dauBeginFrame(110,performance.now()); assert(Math.abs(y-a.y-27)<1e-7,'ease midpoint'); _dauBeginFrame(110,performance.now()); assert(y-a.y===36&&y-d.y===36,'distance'); assert(a.vy===7&&d._state==='casting','kinematics and cast');} finally {SIGIL_DEFS.dau.buffs=buffs;} });
            test('B: Dominant respects top edge and never pulls down', () => { const at=_dauMob('apostle',player.x,15),above=_dauMob('apostle',player.x,10),near=_dauMob('apostle',player.x,25); enemies.push(at,above,near); _dauPush(at);_dauPush(above);_dauPush(near); _dauAdvanceKnockback(220); assert(at.y===15&&above.y===10&&near.y===15,'top clamp'); });
            test('B: Dominant excludes stealth, coronation, chains, echoes, cocoons and deaths', () => { const cases=['abyssal_chain','veilshroud_echo','thaelis_cocoon'].map(t=>_dauMob(t)); const u=_dauMob('uriel');u._stealthed=true;cases.push(u);const c=_dauMob();c.inCoronation=true;cases.push(c);const g=_dauMob('goliath');g._deathPhase='core';cases.push(g);const l=_dauMob('leviathan');l.dyingLaserPhase=true;cases.push(l);enemies.push(...cases);const y=player.y;for(const e of cases)_dauPush(e);_dauAdvanceKnockback(220);assert(cases.every(e=>e.y===y),'excluded'); });
            test('B: Unbroken immunity does not block Dominant and two crows total 72px', () => { const buffs=SIGIL_DEFS.dau.buffs; try {SIGIL_DEFS.dau.buffs=[buffs[0]]; const e=_dauMob('dargruel');e._debuffImmuneEnd=performance.now()+4000;enemies.push(e);const y=e.y;_dauTriggerCrow();_dauBeginFrame(1,performance.now());_dauBeginFrame(110,performance.now());_dauTriggerCrow();_dauBeginFrame(100,performance.now());_dauBeginFrame(220,performance.now());assert(Math.abs(y-e.y-72)<1e-7,'two pushes');}finally{SIGIL_DEFS.dau.buffs=buffs;} });
            test('B: True Form Goliath recoils through his lift, settles back and refuses the mark while immune', () => { const buffs=SIGIL_DEFS.dau.buffs; try {SIGIL_DEFS.dau.buffs=[buffs[0]]; const e=_dauMob('goliath');e.phase='true_form';e._debuffImmuneEnd=performance.now()+4000;enemies.push(e);const y=e.y;_dauTriggerCrow();_dauBeginFrame(1,performance.now());_dauBeginFrame(DAU_KNOCKBACK_MS,performance.now());assert(Math.abs(e._dauLift-DAU_KNOCKBACK_PX)<1e-7,'peak lift');assert(e.y===y,'the weave owns his position');_dauBeginFrame(DAU_KNOCKBACK_RECOVER_MS/2,performance.now());assert(e._dauLift>0&&e._dauLift<DAU_KNOCKBACK_PX,'settling');_dauBeginFrame(DAU_KNOCKBACK_RECOVER_MS,performance.now());assert(e._dauLift===0,'settled');assert(!_dauHasDaybreak(e),'immune mark');}finally{SIGIL_DEFS.dau.buffs=buffs;} });
            test('B: live Goliath is lifted by the crow and returns to his path', () => { spawnGoliath();const g=enemies.at(-1);g.slots.forEach((sl,i)=>{if(!sl.filled){sl.filled=true;sl.gem=GOLIATH_GEM_COLORS[i];}});_goliathEnterTrueForm(g);g._transformIronBodyEnd=0;g.hp=g.maxHp=1e9;const buffs=SIGIL_DEFS.dau.buffs; try {SIGIL_DEFS.dau.buffs=[buffs[0]]; let now=performance.now(),top=Infinity,peak=0;const tick=()=>{now+=1000/60;performance.now=()=>now;update(1000/60);window._dauCrowTimer=0;};const real=performance.now;try{for(let i=0;i<120;i++)tick();const before=g.y;_dauTriggerCrow();for(let i=0;i<240;i++){tick();peak=Math.max(peak,g._dauLift||0);top=Math.min(top,g.y);}assert(Math.abs(peak-DAU_KNOCKBACK_PX)<1,'lift reached '+peak);assert(top<before-10,'he visibly moved up');assert((g._dauLift||0)===0&&(g._dauLiftApplied||0)===0,'lift fully released');}finally{performance.now=real;}}finally{SIGIL_DEFS.dau.buffs=buffs;} });
            test('B: bullets flying at the ship cannot slip through the ring edge', () => { const made=[];for(let i=0;i<120;i++){const a=-Math.PI*(0.08+0.84*i/119),d=120+(i*37)%600;const b=_dauMob('enemy_bullet',player.x+Math.cos(a)*d,player.y+Math.sin(a)*d);const back=Math.atan2(player.y-b.y,player.x-b.x);b.vx=Math.cos(back)*player.speed/3;b.vy=Math.sin(back)*player.speed/3;made.push(b);enemies.push(b);}_dauTriggerCrow();for(let f=0;f<600&&window._dauRings.length;f++){for(const b of made)if(b.hp>0){b.x+=b.vx;b.y+=b.vy;}_dauBeginFrame(1000/60,performance.now());}assert(made.every(b=>b.hp===0),made.filter(b=>b.hp>0).length+' bullets survived the ring'); });
            test('B: needles never lock onto the untargetable cocoon', () => { const c=_dauMob('thaelis_cocoon');c.maxHp=1e12;enemies.push(c);const m=_dauMob('apostle',player.x+40,player.y-200);enemies.push(m);assert(!_dauCanTarget(c),'cocoon target');assert(_dauClosest(player.x,player.y)===m,'closest skips cocoon');_dauStarNeedles();assert(window._dauNeedles.every(n=>n.target!==c),'star needle on cocoon'); });
            test('B: progressive charge caps and pause keep the same phase', () => { const cache=_dauRenderCache; for(const level of [0,1,2,3,4]) { _applyGfxLevel(level); window._dauCrowTimer=9700; gamePaused=true; _dauBeginFrame(5000,performance.now()); assert(window._dauCrowTimer===9700,'paused phase'); _drawDauRing();_drawDauHud();assert(_dauRenderCache===cache&&_dauChargeParticles.length===24,'reused charge pool');gamePaused=false;} });
            const cases = [['marchosias',150,0.01],['uriel',250,0.02],['raphael',250,0.02],['dargruel',200,0.015],['meteor',300,0.02],['verdict',600,0.03]];
            for (const [kind,atk,percent] of cases) {
                test('C: '+kind+' reflects once and deals exact real damage', () => {
                    const random=Math.random; Math.random=()=>0.499;
                    try {
                        const owner=_dauMob('apostle',player.x+300,player.y-300);owner.hp=owner.maxHp=10000;enemies.push(owner);
                        const p=_dauSkill(kind,owner);_dauTriggerCrow();_dauBeginFrame(1,performance.now());
                        assert(DAU_REFLECT_CHANCE===0.50,'50 percent chance');
                        assert(!_dauSkillList(kind).includes(p)&&window._dauReflections.length===1,'remove and copy');
                        assert(window._dauReflections[0].target===owner,'caster');
                        window._dauNeedles.length=0;const hp=owner.hp;_dauUpdateReflections(1000);
                        assert(Math.abs(hp-owner.hp-(atk+10000*percent+6.9))<1e-7,'damage '+(hp-owner.hp));
                        assert(!window._dauReflections.length,'one impact');
                        assert(DAU_REFLECT[kind].atk===atk/100&&DAU_REFLECT[kind].percentDamage===percent,'table');
                    } finally {Math.random=random;}
                });
                test('C: '+kind+' failed roll stays harmful and never rolls twice', () => {
                    const random=Math.random, takeHit=playerTakesHit;let rolls=0,hits=0;
                    Math.random=()=>{rolls++;return 0.50;}; playerTakesHit=()=>{hits++;return true;};
                    try {
                        const owner=_dauMob('apostle',player.x+300,player.y-300);enemies.push(owner);
                        const p=_dauSkill(kind,owner);_dauTriggerCrow();_dauBeginFrame(1,performance.now());
                        assert(_dauSkillList(kind).includes(p)&&!window._dauReflections.length,'failed roll');
                        const first=rolls;_dauBeginFrame(1,performance.now());assert(rolls===first&&first===1,'one draw');
                        window._playerSigils=[];window._dauNeedles.length=0;p.x=player.x;p.y=player.y;p.vx=p.vy=p.speed=0;
                        if(kind==='uriel')_updateUrielEffects(1);else if(kind==='raphael')updateRaphaelWisdomOrbs(1);else if(kind==='marchosias')updateMarchosiasBlades(1);else _dauStep(1);
                        assert(kind==='dargruel'?player._rooted:hits>0,'native collision');
                    } finally {Math.random=random;playerTakesHit=takeHit;}
                });
            }
            test('C: delayed swords and gathering Wisdom Orbs stay native', () => {
                const random=Math.random;Math.random=()=>0;try{
                    const owner=_dauMob();enemies.push(owner);const blade=_dauSkill('marchosias',owner),orb=_dauSkill('raphael',owner);blade.delay=100;blade.active=false;orb.phase='gather';
                    _dauTriggerCrow();_dauBeginFrame(100,performance.now());assert(marchosiasBlades.includes(blade)&&raphaelWisdomOrbs.includes(orb)&&!window._dauReflections.length,'windups');
                }finally{Math.random=random;}
            });
            test('C: native Verdict and Meteor reflect despite the caster Joker state', () => {
                const random=Math.random;Math.random=()=>0;try{
                    const g=_dauMob('goliath',player.x,100);g._jokerState={Marchosias:{},Dargruel:{}};enemies.push(g);
                    const orb=_dauSkill('verdict',g),meteor=_dauSkill('meteor',g);_dauTriggerCrow();_dauBeginFrame(1,performance.now());
                    assert(!window._goliathOrbs.includes(orb)&&!window._goliathMeteors.includes(meteor)&&window._dauReflections.length===2,'native skills');
                }finally{Math.random=random;}
            });
            test('C: Joker copies, shared arrays, Goliath chains and Endless Echo are excluded', () => {
                const random=Math.random;Math.random=()=>0;try{
                    const g=_dauMob('goliath',player.x,100);g._jokerState={};enemies.push(g);
                    const chain=_dauSkill('dargruel',g),sword=_dauSkill('marchosias',g),holy=_dauSkill('uriel',g),wisdom=_dauSkill('raphael',g);
                    const tagged=_dauSkill('meteor',g);tagged._jokerState={};
                    const joker={x:player.x,y:player.y,life:4000},echo={x:player.x,y:player.y,life:4000};window._goliathSwords.push(joker);window._goliathEchoes.push(echo);
                    _dauTriggerCrow();_dauBeginFrame(100,performance.now());assert(!window._dauReflections.length,'no copies');
                    assert(enemies.includes(chain)&&marchosiasBlades.includes(sword)&&window._urielHolySwords.includes(holy)&&raphaelWisdomOrbs.includes(wisdom)&&window._goliathMeteors.includes(tagged)&&window._goliathSwords.includes(joker)&&window._goliathEchoes.includes(echo),'native storage');
                }finally{Math.random=random;}
            });
            test('C: all six fast skills cross the tracked outer edge', () => {
                const random=Math.random;Math.random=()=>0;try{
                    const owner=_dauMob('apostle',player.x+300,player.y-300);enemies.push(owner);
                    const made=cases.map(([kind])=>[kind,_dauSkill(kind,owner,player.x,player.y-400)]);
                    _dauTriggerCrow();_dauBeginFrame(1,performance.now());assert(!window._dauReflections.length,'seen outside');
                    for(const [,p]of made)p.y=player.y-10;
                    _dauBeginFrame(30,performance.now());assert(window._dauReflections.length===6&&made.every(([k,p])=>!_dauSkillList(k).includes(p)),'crossed without annulus');
                }finally{Math.random=random;}
            });
            test('C: seven beam, wave and ground attacks keep their native state', () => {
                const random=Math.random;Math.random=()=>0;try{
                    const l=_dauMob('leviathan'),e=_dauMob('egregor'),v=_dauMob('veilshroud');l.dyingLaserPhase=true;l.dyingLaserTimer=500;l.dyingLaserFired=true;
                    e._tempestPhase='striking';e._tempestTargets=[{x:player.x,y:player.y,countdown:100}];e._nullSlashPhase='striking';e._nullSlashStrikeTimer=100;v.lightningPhase='striking';v.lightningCountdown=100;enemies.push(l,e,v);
                    const laser={x:player.x,y:player.y,life:200},wave={x:player.x,y:player.y,radius:20,active:true};raphaelLasers.push(laser);bossShockwaves.push(wave);
                    window._levPersBeams=[];_spawnPerseveranceBeam(l,performance.now());const beam=window._levPersBeams[0];
                    _dauTriggerCrow();_dauBeginFrame(100,performance.now());
                    assert(raphaelLasers[0]===laser&&laser.life===200,'Lumen Nova');assert(window._levPersBeams[0]===beam&&!beam.done,'Perseverance');
                    assert(l.dyingLaserPhase&&l.dyingLaserTimer===500&&l.dyingLaserFired,'death laser');assert(bossShockwaves[0]===wave&&wave.radius===20,'Maou Haki');
                    assert(e._tempestPhase==='striking'&&e._tempestTargets[0].countdown===100,'Psychic Tempest');assert(e._nullSlashPhase==='striking'&&e._nullSlashStrikeTimer===100,'Null Slash');
                    assert(v.lightningPhase==='striking'&&v.lightningCountdown===100&&!window._dauReflections.length,'Void Strike');
                    window._levPersBeams=[];
                }finally{Math.random=random;}
            });
            test('C: native Uriel and Marchosias births retain their caster reference', () => {
                spawnUriel();const u=enemies.at(-1);_urielLaunchSword(u);assert(window._urielHolySwords.at(-1).owner===u,'Uriel birth');
                spawnMarchosias();const m=enemies.at(-1);m.marchosiasWindups=[{target:player}];_fireMarchosiasDeathSwords(m);assert(marchosiasBlades.length&&marchosiasBlades.every(p=>p.owner===m),'Marchosias birth');
            });
            test('C: reflection source flags and Daybreak use the real damage resolver', () => {
                const original=dealDamage;let source;
                try{const e=_dauMob();enemies.push(e);mark(e);dealDamage=(target,s)=>{source={...s};return original(target,s);};
                    _dauAddReflection('uriel',{x:e.x,y:e.y,owner:e,vx:1,vy:1});const hp=e.hp;_dauUpdateReflections(1);
                    assert(source.damage===250&&source.percentDamage===0.02&&source.isTrueDamage&&source._noHitSfx&&source._statSrc==='Golden Needle: Reflect','source');
                    assert(hp-e.hp===Math.ceil((250+20000+6.9)*1.2),'Daybreak');
                }finally{dealDamage=original;}
            });
            test('C: reflected Wisdom leaves no DoT, chains no root and meteors no splash', () => {
                const random=Math.random,takeHit=playerTakesHit;let hits=0;Math.random=()=>0;playerTakesHit=()=>{hits++;return true;};try{
                    const owner=_dauMob('apostle',player.x+300,player.y-300);enemies.push(owner);
                    for(const [kind]of cases)_dauSkill(kind,owner);
                    spawnSentinel(player.x,player.y,true);const s=sentinels.at(-1);s.shootTimer=100000;
                    _dauTriggerCrow();_dauBeginFrame(1,performance.now());const hp=s.hp;_dauStep(1);
                    assert(!hits&&!player._rooted&&!player._silenced&&!player._wisdomOrbSlowed&&!raphaelWisdomZones.length&&s.hp===hp&&!explosions.length,'no original effects '+JSON.stringify({hits,root:player._rooted,silence:player._silenced,slow:player._wisdomOrbSlowed,zones:raphaelWisdomZones.length,hp:s.hp,before:hp,explosions:explosions.length}));
                }finally{Math.random=random;playerTakesHit=takeHit;}
            });
            test('C: owner death, stealth, removal and empty scene retarget correctly', () => {
                for(const state of ['dead','stealth','removed']){
                    _dauTestReset();const owner=_dauMob('apostle',player.x+200,player.y),near=_dauMob('apostle',player.x+100,player.y),far=_dauMob('apostle',player.x+400,player.y);enemies.push(owner,far,near);
                    const p=_dauSkill('meteor',owner);_dauAddReflection('meteor',p);if(state==='dead')owner.hp=0;else if(state==='stealth')owner._stealthed=true;else enemies.splice(enemies.indexOf(owner),1);
                    _dauUpdateReflections(1);assert(window._dauReflections[0].target===near,state);enemies=[];_dauUpdateReflections(1);assert(!window._dauReflections.length,'dissolve');
                }
            });
            test('C: per crow cap is 16, excess originals survive and pool reuse is bounded', () => {
                const random=Math.random;Math.random=()=>0;try{
                    const owner=_dauMob('apostle',player.x+300,player.y-300);enemies.push(owner);
                    for(let i=0;i<24;i++)_dauSkill('meteor',owner);_dauTriggerCrow();_dauBeginFrame(1,performance.now());
                    assert(window._dauReflections.length===16&&window._goliathMeteors.length===8,'cap');
                    for(let c=0;c<8;c++){for(let i=0;i<24;i++)_dauSkill('meteor',owner);_dauTriggerCrow();_dauBeginFrame(1,performance.now());}
                    assert(window._dauReflections.length<=DAU_FX_MAX&&window._dauReflectPool.length===DAU_FX_MAX,'pool ceiling');
                    const pool=window._dauReflectPool;_dauReset();assert(pool===window._dauReflectPool&&pool.every(p=>!p.active&&!p.target),'reuse and release');
                }finally{Math.random=random;}
            });
            test('C: without Golden Needle no skill reflects and sprite tiers reuse the cache', () => {
                const buffs=SIGIL_DEFS.dau.buffs,random=Math.random,cache=_dauRenderCache;Math.random=()=>0;try{
                    SIGIL_DEFS.dau.buffs=[buffs[0]];const owner=_dauMob();enemies.push(owner);for(const [kind]of cases)_dauSkill(kind,owner);_dauTriggerCrow();_dauBeginFrame(100,performance.now());assert(!window._dauReflections.length,'buff gate');
                    SIGIL_DEFS.dau.buffs=buffs;for(const [kind]of cases)_dauAddReflection(kind,{x:100,y:100,owner,vx:1,vy:1});
                    for(const level of [0,1,2,3,4]){_applyGfxLevel(level);_dauEmit(6,200,200,850);_drawDauStatus();_drawDauReflectImpacts();assert(_dauRenderCache===cache,'baked tier '+level);}
                }finally{SIGIL_DEFS.dau.buffs=buffs;Math.random=random;}
            });
            gamePaused=true; return results;
        });
        results.push({name:'Backquote opens the debug console',pass:debugKeyboard});
        for(const r of results)if(!r.pass)console.log(JSON.stringify(r));
        const preview = path.join(root, 'misc/dau-vfx-preview');
        fs.mkdirSync(preview, {recursive:true});
        await page.waitForFunction(() => _zodiacGlyphImgs.dau.complete && _zodiacGlyphImgs.dau.naturalWidth === 1024);
        results.push({name:'Picker decodes the real 1024px glyph',pass:await page.evaluate(() => !!_getTintedZodiacGlyph('dau','#FFD23F',48))});
        await page.evaluate(() => {
            window._dauPreviewScene = level => {
                _dauTestReset(); _applyGfxLevel(level); window._debugSessionActive=true;
                document.getElementById('easter-egg-overlay').style.display='none';
                document.getElementById('click-to-start').style.display='none';
                document.getElementById('mc').style.display='none';
                canvas.width=1280;canvas.height=800;canvas.style.width='1280px';canvas.style.height='800px';boundaryY=790;
                if(window._pixiApp) window._pixiApp.renderer.resize(1280,800);
                if(window._bgResize) window._bgResize(1280,800);
                player.x=640;player.y=710;
                for(let i=0;i<7;i++) {spawnApostle();const e=enemies.at(-1);e.x=220+i*140;e.y=355+(i%2)*65;e.hp=e.maxHp=100000+i*1000;e.size=65;e.speed=0;}
                for(let i=0;i<30;i++) {const e=_dauMob('enemy_bullet',180+i%10*100,460+Math.floor(i/10)*35);e.size=7;e.vx=e.vy=0;e.hp=e.maxHp=100;enemies.push(e);}
                particles=[];explosions=[];bossShockwaves=[];screenShake.intensity=0;screenShake.duration=0;
            };
        });
        for (const level of [0,2]) {
            for (const [phase,ms] of [['crow',180],['ring-push',650],['star-warning',260],['star-strike',460],['daybreak',1500]]) {
                await page.evaluate(({level,ms}) => {
                    _dauPreviewScene(level);_dauTriggerCrow();
                    for(let elapsed=0;elapsed<ms;elapsed+=1000/120){const dt=Math.min(1000/120,ms-elapsed);_dauStep(dt);}
                    screenShake.intensity=0;screenShake.duration=0;draw(0);
                },{level,ms});
                await page.screenshot({path:path.join(preview,(level===0?'full':'low')+'-'+phase+'.png')});
            }
        }
        for (const p of [0.2,0.55,0.8,0.97]) {
            await page.evaluate(p => {
                _dauPreviewScene(0);enemies=enemies.filter(e=>!e.type.startsWith('enemy_bullet'));
                for(let i=0;i<8;i++){const e=_dauMob('enemy_bullet',player.x-85+i*24,player.y-55+(i%3)*17);e.size=7;e.hp=e.maxHp=100;e.vx=e.vy=0;enemies.push(e);}
                window._dauCrowTimer=p*DAU_CROW_INTERVAL_MS;draw(0);
            },p);
            await page.screenshot({path:path.join(preview,'full-charge-'+p+'.png')});
        }
        for (const level of [0,2]) {
            for (const phase of ['reflection','verdict-impact']) {
                await page.evaluate(({level,phase})=>{
                    _dauPreviewScene(level);enemies=enemies.filter(e=>e.type.startsWith('enemy_bullet'));window._dauNeedles.length=0;
                    spawnGoliath();const g=enemies.at(-1);g.slots.forEach((s,i)=>{s.filled=true;s.gem=GOLIATH_GEM_COLORS[i];});_goliathEnterTrueForm(g);
                    g._transformIronBodyEnd=0;g._trueFormEnteredAt=performance.now()-10000;g._unbrokenWillUsed=true;g.hp=g.maxHp=1000000;g.x=640;g.y=180;
                    spawnUriel();const u=enemies.at(-1);u.x=350;u.y=190;u._camoPhase='shielded';u.ironBodyHits=0;
                    const random=Math.random;Math.random=()=>0.499;
                    try{const kind=phase==='reflection'?'uriel':'verdict',owner=kind==='uriel'?u:g;
                        _dauSkill(kind,owner,640,460);_dauTriggerCrow();window._dauNeedles.length=0;_dauBeginFrame(450,performance.now());
                        if(phase==='reflection')_dauUpdateReflections(60);else{Math.random=()=>0.999;const hp=g.hp;_dauUpdateReflections(1000);if(g.hp>=hp)throw Error('Verdict preview must damage Goliath');for(const f of window._dauFx)if(f.kind===6&&f.life>0)f.age=260;}
                        window._dauBurstMs=1400;screenShake.intensity=0;screenShake.duration=0;draw(0);
                    }finally{Math.random=random;}
                },{level,phase});
                await page.screenshot({path:path.join(preview,(level===0?'full':'low')+'-c-'+phase+'.png')});
            }
        }
        for(const lang of ['en','vi']) {
            await page.evaluate(lang => {
                _dauPreviewScene(0);window._lang=lang;window._sigilPool=['dau','leo','than','aries'];
                _triggerSigilPicker();window._sigilPicker.phase='choosing_sigil';draw(0);drawSigilPicker();
            },lang);
            await page.screenshot({path:path.join(preview,'picker-'+lang+'.png')});
        }
        const timings = await page.evaluate(() => {
            const measure = (level,mode,enabled) => {
                _dauTestReset();_applyGfxLevel(level);window._debugSessionActive=true;
                window._playerSigils=mode==='crow'&&!enabled?[]:[{sigilId:'dau'}];
                const bodies=[],shots=[];
                for(let i=0;i<80;i++){const e=_dauMob('apostle',70+i%10*120,65+Math.floor(i/10)*70);e.size=22;enemies.push(e);bodies.push(e);}
                for(let i=0;i<60;i++){const e=_dauMob('enemy_bullet',90+i%12*95,90+Math.floor(i/12)*85);e.size=7;e.vx=e.vy=0;enemies.push(e);shots.push(e);}
                window._dauChargePreviewOff=mode==='charge'&&!enabled;
                let total=0,frames=0,peak=0,reflected=0;
                const random=Math.random;if(mode==='crow')Math.random=()=>0.499;
                const windowFrames=mode==='crow'?Math.ceil(Math.hypot(canvas.width,canvas.height)/DAU_RING_SPEED/(1000/120))+40:300;
                for(let cycle=0;cycle<6;cycle++) {
                    enemies=bodies.concat(shots);marchosiasBlades=[];raphaelWisdomOrbs=[];raphaelWisdomZones=[];window._urielHolySwords=[];window._goliathOrbs=[];window._goliathMeteors=[];
                    _dauReset();
                    if(mode==='crow')for(let i=0;i<12;i++){const kind=['marchosias','uriel','raphael','dargruel','meteor','verdict'][i%6];const p=_dauSkill(kind,bodies[i],240+i%6*150,350+Math.floor(i/6)*60);p.vx=p.vy=0;p.ang=Math.atan2(player.y-p.y,player.x-p.x);}
                    if(mode==='crow'&&enabled)_dauTriggerCrow();
                    for(let f=0;f<windowFrames;f++) {
                        for(let i=0;i<bodies.length;i++){const e=bodies[i];e.hp=e.maxHp;e.x=70+i%10*120;e.y=65+Math.floor(i/10)*70;e.shield=0;}
                        for(let i=0;i<shots.length;i++){const e=shots[i];e.hp=e.maxHp;e.x=90+i%12*95;e.y=90+Math.floor(i/12)*85;if(enemies.indexOf(e)<0)enemies.push(e);}
                        if(mode==='charge')window._dauCrowTimer=9400;
                        window._testNow+=1000/120;
                        const start=window._realNow();update(1000/120);draw(1000/120);const elapsed=window._realNow()-start;
                        if(cycle>0){total+=elapsed;frames++;peak=Math.max(peak,elapsed);}
                        if(enabled&&window._dauRings.length)reflected=Math.max(reflected,window._dauRings[0].reflected);
                    }
                }
                window._dauChargePreviewOff=false;
                Math.random=random;
                return {meanMs:total/frames,peakMs:peak,frames,reflected};
            };
            const rows=[];
            for(const level of [0,2]) {
                const off=measure(level,'crow',false),on=measure(level,'crow',true);
                rows.push({kind:'crow',tier:level===0?'FULL':'LOW',off,on,deltaMs:on.meanMs-off.meanMs,limitMs:1.5});
            }
            const off=measure(0,'charge',false),on=measure(0,'charge',true);
            rows.push({kind:'charge',tier:'FULL',off,on,deltaMs:on.meanMs-off.meanMs,limitMs:0.3});
            gamePaused=true;return rows;
        });
        for(const row of timings)results.push({name:row.kind+' frame budget '+row.tier,pass:row.deltaMs<=row.limitMs});
        const guide=await browser.newPage();guide.on('pageerror',e=>errors.push('guide: '+e.message));
        await guide.goto('file:///'+path.join(root,'guide.html').replaceAll('\\','/'));
        await guide.locator('[data-tab="sigils"]').click();
        await guide.waitForFunction(() => window._guideZodiacImgs?.dau?.naturalWidth===1024);
        for(const lang of ['en','vi']) {
            await guide.evaluate(lang => {window._lang=lang;},lang);
            await guide.locator('[data-tab="sigils"]').click();
            await guide.waitForFunction(() => {
                const c=document.querySelector('canvas.sfc-glyph-cv[data-sigil="dau"]');
                return c && c.width > 0 && window._guideZodiacImgs.dau.naturalWidth === 1024;
            });
            const card=guide.locator('.sfc').filter({has:guide.locator('canvas.sfc-glyph-cv[data-sigil="dau"]')}).first();
            const title=await card.innerText();
            results.push({name:'Guide renders the actual glyph in '+lang,pass:title.includes(lang==='en'?'DAWN HERALD':'MÃO NHẬT TINH QUAN')});
            await card.screenshot({path:path.join(preview,'guide-'+lang+'.png')});
        }
        const report={tests:results,pageErrors:errors,timings,measurement:'CPU time around production update and draw in desktop headless Chrome at 1280x800, 120Hz simulation, 80 enemies and 60 bullets, plus 12 launched skill objects per crow cycle. Crow: fixed random 0.499, complete screen diagonal traversal plus 40 frames, five measured cycles after one warmup cycle. Charge: five measured cycles of 300 frames after one warmup cycle. Fixture restoration is outside the timed window.'};
        fs.writeFileSync(path.join(preview,'test-results.json'),JSON.stringify(report,null,2));
        console.log(JSON.stringify(report,null,2));
        if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
    } finally { await browser.close(); }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
