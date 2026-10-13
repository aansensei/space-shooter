const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.PLAYWRIGHT_NODE_MODULES] }));
const root = process.cwd(), output = path.join(root, 'misc', 'pisces-hud-check');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
async function main() {
    const glowOnly = process.argv.includes('--glow-only');
    const server = http.createServer((req, res) => {
        const file = path.resolve(root, '.' + (req.url.split('?')[0] === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0])));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ executablePath: path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'), headless: true });
    const errors = [], reports = [];
    try {
        for (const mode of glowOnly ? ['mobile'] : ['desktop', 'mobile']) {
            const context = await browser.newContext({ viewport: mode === 'desktop' ? { width: 1280, height: 800 } : { width: 390, height: 844 }, hasTouch: mode === 'mobile', isMobile: mode === 'mobile', serviceWorkers: 'block' });
            const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
            page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
            await page.addInitScript(() => { window.__flowFrames = []; window.requestAnimationFrame = cb => { if (cb.name === 'loop') window.__flowFrames.push(cb); return 0; }; });
            await page.goto('http://127.0.0.1:' + server.address().port + '/index.html');
            await page.waitForFunction(() => typeof debugStartSession === 'function');
            await page.evaluate(mode => {
                window.AudioMgr = null; selectPlatform(mode === 'mobile' ? 'mobile' : 'pc'); debugStartSession(); closeDebugConsole();
                window._inGame = true; if (mode === 'mobile') _initMobileControls();
                document.getElementById('click-to-start').style.display = 'none';
                window._smartQuality = false; window._flowRealNow = performance.now.bind(performance);
                window._flowNow = 100000; performance.now = () => window._flowNow; Math.random = () => 0.999;
                window.__flowReset = () => {
                    _piscesReset(); enemies = []; bullets = []; spirits = []; sentinels = []; particles = []; explosions = [];
                    gameState = 'playing'; gamePaused = false; gameElapsedTime = 10000; player.atk = 100; gloryForJusticeActive = false;
                    window._playerSigils = [{ sigilId: 'pisces' }]; window._coiMongEndTime = 0;
                    skillShiftActive = false; window._shiftActive = false; skillAOrbs = []; skillAActive = false; deathStar = null; skillDCharging = false; skillFState = 'ready'; laserActive = false;
                    lastSkillA = lastSkillS = lastSkillD = lastSkillF = lastSkillShift = -Infinity; laserCooldownEnd = 0;
                    for (const slot in window._cdGlowEnd) window._cdGlowEnd[slot] = 0;
                    _applyGfxLevel(0); player.x = canvas.width / 2; player.y = canvas.height - 120;
                };
                window.__flowEnemy = (x, y) => { spawnApostle(); const e = enemies.at(-1); e.x = x; e.y = y; e.size = 24; e.hp = e.maxHp = 10000; e.vulnStacks = 0; return e; };
                window.__flowPaint = () => { _frozenNow = performance.now(); draw(0); const callbacks = window.__flowFrames.splice(0); for (const cb of callbacks) cb(performance.now()); };
                window.__flowStep = ms => { window._flowNow += ms; _piscesUpdate(ms); __flowPaint(); };
                window.__impactFixture = type => {
                    __flowReset(); player.x = canvas.width * 0.3; player.y = canvas.height * 0.48;
                    let e;
                    if (type === 'small') e = __flowEnemy(player.x+165,player.y-52);
                    else {
                        if (type === 'boss') spawnRaphael();
                        else if (type === 'blocked') spawnMarchosias();
                        else spawnLeviathan();
                        e = enemies.find(e=>e.type === (type === 'boss' ? 'raphael' : type === 'blocked' ? 'marchosias' : 'leviathan'));
                        enemies = [e]; e.x = player.x+165; e.y = player.y-52; e.size = 144;
                        e.hp = e.maxHp = 1000000; e.raphaelInvulnerable = false;
                        if (e.arcBarrier) e.arcBarrier.angle = Math.PI;
                    }
                    debugPiscesRefund(); _piscesUpdate(0);
                    return e;
                };
            }, mode);
            if(glowOnly) {
                const results = await page.evaluate(()=>{
                    const proto=CanvasRenderingContext2D.prototype;
                    const clear=proto.clearRect, stroke=proto.stroke, arc=proto.arc;
                    let ops=[];
                    proto.clearRect=function(...args){ if(this.canvas.id.startsWith('mb-'))ops.push({id:this.canvas.id,type:'clear'});return clear.apply(this,args); };
                    proto.arc=function(x,y,r,...args){this.__glowRadius=r;return arc.call(this,x,y,r,...args);};
                    proto.stroke=function(...args){if(this.canvas.id.startsWith('mb-')&&this.lineWidth===2&&this.__glowRadius===28)ops.push({id:this.canvas.id,type:'glow'});return stroke.apply(this,args);};
                    const results=[];
                    try {
                        for(const name of ['normal','shift','spirit mana','spirit ready','blood arrow','great sage','charge','laser','tidal','leo']) {
                            __flowReset(); primevalEnergy=0; charging=false; laserActive=false; spirits=[];
                            window._bloodArrowStacks=0; _greatSageGems.length=0; window._tidalSurgeReady=false; window._leoFateReady=false;
                            if(name==='shift'){skillShiftActive=true;skillShiftChargeStart=performance.now();}
                            if(name==='spirit mana'){spirits=[{isFinishing:false}];primevalEnergy=40;}
                            if(name==='spirit ready'){spirits=[{isFinishing:false}];primevalEnergy=100;}
                            if(name==='blood arrow')window._bloodArrowStacks=1;
                            if(name==='great sage')_greatSageGems.push('thaelis');
                            if(name==='charge'){charging=true;chargeStartTime=performance.now();}
                            if(name==='laser'){laserActive=true;laserStartTime=performance.now();}
                            if(name==='tidal')window._tidalSurgeReady=true;
                            if(name==='leo')window._leoFateReady=true;
                            debugPiscesRefund();
                            let uncleared=0,glows=0;
                            for(let frame=0;frame<12;frame++) {
                                ops=[];const callbacks=window.__flowFrames.splice(0);for(const cb of callbacks)cb(performance.now());
                                for(let i=0;i<ops.length;i++)if(ops[i].type==='glow'){
                                    glows++; if(!ops.slice(0,i).some(e=>e.id===ops[i].id&&e.type==='clear'))uncleared++;
                                }
                            }
                            if(glows!==72)throw new Error(name+': missing glow loop '+glows);
                            results.push({name,frames:12,glows,uncleared});
                        }
                    }finally{proto.clearRect=clear;proto.stroke=stroke;proto.arc=arc;}
                    return results;
                });
                fs.writeFileSync(path.join(output,'mobile-glow-probe.json'),JSON.stringify(results,null,2));
                console.log(JSON.stringify(results,null,2));await context.close();continue;
            }
            const checks = await page.evaluate(() => {
                const done = [], check = (ok, label) => { if (!ok) throw new Error(label); done.push(label); };
                __flowReset(); check(SIGIL_ATK_BONUS.pisces === 0.20, 'ATK stays 20%');
                _piscesOnCdReduction(500, performance.now()); _piscesOnCdReduction(500, performance.now());
                check(window._piscesFlowMs === 1000, 'fractional refunds total one point per second');
                _piscesOnCdReduction(50000, performance.now()); _piscesUpdate(0);
                check(window._piscesFlowMs === 24000 && !_piscesFishPool.some(f => f.active), '24 point cap waits for a target');
                const first = __flowEnemy(player.x + 150, player.y - 20);
                _piscesUpdate(0); check(window._piscesFlowMs === 12000 && _piscesFishPool.filter(f => f.active).length === 1, '12 spent, 12 overflow carried');
                const angle = _piscesFishPool[0].angle; first.y -= 150;
                _piscesUpdate(200); check(_piscesFishPool[0].angle === angle && _piscesFishPool[0].x === player.x, 'formation holds position and direction is fixed');
                _piscesOnCdReduction(16000, performance.now()); _piscesClock += 1799; _piscesTrySummon();
                check(_piscesFishPool.filter(f => f.active).length === 1, 'second fish waits for 2 seconds');
                _piscesClock++; _piscesTrySummon(); check(_piscesFishPool.filter(f => f.active).length === 2, 'second fish at interval');
                _piscesOnCdReduction(16000, performance.now()); _piscesTrySummon();
                check(_piscesFishPool.filter(f => f.active).length === 2 && window._piscesFlowMs === 24000, 'two fish cap preserves stored points');
                __flowReset(); player.x = 80; player.y = 300;
                const a = __flowEnemy(180,248), b = __flowEnemy(320,248), c = __flowEnemy(450,308);
                _piscesOnCdReduction(12000, performance.now()); _piscesUpdate(0);
                const damage = dealDamage, hits = [];
                dealDamage = (e, s) => { if (s._statSrc === 'Pisces: Flow Fish') hits.push({ e, damage: s.damage, piercing: s.isPiercing, trueDamage: !!s.isTrueDamage }); return damage(e, s); };
                try {
                    _piscesUpdate(419); check(!hits.length, 'no damage during bubble formation');
                    _piscesUpdate(501); check(hits.length === 2 && hits[0].e === a && hits[1].e === b, 'swept hit passes through two aligned enemies');
                    check(hits.every(h => h.damage === 65 && h.piercing && !h.trueDamage), '65% ATK through the Piercing resolver');
                    check(_piscesFxPool.filter(f=>f.life>0&&f.kind===1).length===2, 'one impact per pierced target');
                    _piscesUpdate(100); check(hits.length === 2 && c.hp === 10000, 'no repeat damage and no hit off the line');
                } finally { dealDamage = damage; }
                const blocked = __impactFixture('blocked'), blockedHp = blocked.hp;
                const random = Math.random; Math.random = () => 0.1;
                try { _piscesUpdate(PISCES_FISH_FORM_MS+190); } finally { Math.random = random; }
                const blockedFx = _piscesFxPool.filter(f=>f.life>0&&f.kind===3);
                check(blockedFx.length===1 && !blockedFx[0].enemy && blocked.hp===blockedHp, 'Marchosias block emits one reverse splash without body flash');
                const lev = __impactFixture('afo'), levHp = lev.hp, levHits = lev.afoHitCount;
                _piscesUpdate(PISCES_FISH_FORM_MS+190);
                check(_piscesFxPool.filter(f=>f.life>0&&f.kind===3).length===1 && lev.hp===levHp && lev.afoHitCount===levHits+1, 'AFO uses blocked effect and keeps the existing shield hit');
                __flowReset(); player.x=80; player.y=300;
                for(let i=0;i<40;i++)__flowEnemy(100+i*4,248);
                debugPiscesRefund(); _piscesUpdate(0); _piscesClock=2000; debugPiscesRefund(); _piscesTrySummon();
                _piscesUpdate(PISCES_FISH_FORM_MS+350);
                check(_piscesFxPool.length===128 && _piscesFxPool.filter(f=>f.life>0&&f.kind===1).length===80, 'two fish keep all 80 impacts in the fixed pool');
                _piscesUpdate(50); check(_piscesFxPool.filter(f=>f.life>0&&f.kind===1).length===80, 'pierced enemies do not emit duplicate impacts');
                _piscesUpdate(250); check(!_piscesFxPool.some(f=>f.life>0&&f.kind===1) && _piscesFxPool.every(f=>!f.enemy), 'impacts expire at 300ms and release enemy references');
                __flowReset(); const table = _piscesFishPool, effects = _piscesFxPool;
                _piscesOnCdReduction(16000, performance.now()); __flowEnemy(player.x, player.y-200); _piscesUpdate(0);
                const age = table[0].age, clock = _piscesClock; gamePaused = true; update(1000);
                check(table[0].age === age && _piscesClock === clock, 'pause holds fish and summon interval'); gamePaused = false;
                window._playerSigils = []; _piscesUpdate(16);
                check(!table.some(f=>f.active) && window._piscesFlowMs === 0 && table.every(f=>!f.hits.length), 'unequip releases fish and hit references');
                _piscesReset(); check(_piscesFishPool === table && _piscesFxPool === effects, 'reset reuses fixed pools');
                __flowReset(); window._cofMoveDist = 0; keys.left = keys.right = false;
                lastSkillA = lastSkillS = lastSkillD = lastSkillF = lastSkillShift = performance.now(); laserCooldownEnd = performance.now() + 9000;
                for (const slot of ['A','S','Laser']) { window['_pofCdTokens'+slot] = 2000; window['_pofCdAt'+slot] = performance.now(); }
                window._cofMoveDist = canvas.width - 1; keys.right = true; update(16); keys.right = false;
                check(window._piscesFlowMs === 3000, 'real movement credits six 0.5 second refunds');
                __flowReset(); lastSkillA = lastSkillS = lastSkillD = lastSkillF = performance.now(); laserCooldownEnd = performance.now() + 9000;
                for (const slot of ['A','S','Laser']) { window['_pofCdTokens'+slot] = 2000; window['_pofCdAt'+slot] = performance.now(); }
                handleEnemyKill(__flowEnemy(100,100)); check(window._piscesFlowMs === 4250, 'real Apostle kill credits 4.25 seconds');
                __flowReset(); window._cofMoveDist = canvas.width - 1;
                lastSkillA = performance.now() - _skillACooldown() + 100; keys.right = true;
                window._pofCdTokensA = 2000; window._pofCdAtA = performance.now(); update(16); keys.right = false;
                check(window._piscesFlowMs === 100, 'credits only remaining cooldown, not nominal grant');
                __flowReset(); window._cofMoveDist = canvas.width - 1; keys.right = true; update(16); keys.right = false;
                check(window._piscesFlowMs === 0 && window._cofAuraEnd === 0, 'READY skills give neither points nor aura');
                __flowReset(); lastSkillD = performance.now(); _skillDOnKill({ _markedForDeath: true });
                check(window._piscesFlowMs === 0, 'Skill D independent refund is outside Flow');
                _piscesSprites(); const cache = _piscesRenderCache;
                _piscesOnCdReduction(16000, performance.now()); __flowEnemy(player.x,player.y-300); _piscesUpdate(0);
                window._flowNow += 120;
                const gradient = ctx.createRadialGradient, linear = ctx.createLinearGradient;
                ctx.createRadialGradient = ctx.createLinearGradient = () => { throw new Error('live gradient'); };
                try { for (const level of [0,1,2,3,4]) { _applyGfxLevel(level); _drawPiscesCurrent(); _drawPiscesAura(); _drawPiscesFish(); _drawPiscesImpacts(); } }
                finally { ctx.createRadialGradient = gradient; ctx.createLinearGradient = linear; }
                check(_piscesRenderCache === cache, 'all graphics tiers reuse cached sprites without live gradients');
                const counterDraws=()=>{
                    const calls=[],draw=ctx.drawImage;
                    ctx.drawImage=function(sprite,x,y,w,h){
                        if(sprite===_piscesRenderCache.bubble||sprite===_piscesRenderCache.overflowBubble)calls.push({white:sprite===_piscesRenderCache.overflowBubble,alpha:this.globalAlpha,x:x+w/2,y:y+h/2,size:w});
                        return draw.apply(this,arguments);
                    };
                    try{_drawPiscesCurrent();}finally{ctx.drawImage=draw;}
                    return calls;
                };
                for(const level of [0,1,2,3,4])for(const points of [0,5,12,14,24]){
                    __flowReset();_applyGfxLevel(level);_drawPiscesCurrent();window._piscesFlowMs=points*1000;
                    const draws=counterDraws(), low=level>=2;
                    if(!low){
                        check(draws.length===12&&draws.filter(d=>d.alpha>0.6).length===Math.min(points,12)&&draws.filter(d=>d.white).length===Math.max(0,points-12),'counter '+level+': '+points+' points');
                    }else{
                        const base=draws.filter(d=>!d.white), extra=draws.filter(d=>d.white);
                        check(base.length===4&&Math.abs(base.reduce((n,d)=>n+(d.alpha-0.1)/0.65*3,0)-Math.min(points,12))<1e-8&&Math.abs(extra.reduce((n,d)=>n+d.alpha/0.75*3,0)-Math.max(0,points-12))<1e-8,'grouped counter '+level+': '+points+' points');
                    }
                }
                __flowReset();_drawPiscesCurrent();_piscesOnCdReduction(5000,performance.now());counterDraws();
                _piscesClock+=130;const popped=counterDraws();
                check(popped.filter(d=>d.size>15.5).length===5,'only five newly lit bubbles pop at 130ms');
                _piscesClock+=131;check(counterDraws().every(d=>Math.abs(d.size-12)<1e-8),'bubble pop returns to size after 260ms');
                __flowReset();_drawPiscesCurrent();debugPiscesRefund();const ready=counterDraws();
                check(window._piscesFlowMs===12000&&ready.every(d=>d.alpha>0.6),'debug refund lights the ready ring');
                _piscesClock+=100;const pulsed=counterDraws();
                check(pulsed.every(d=>Math.abs(d.alpha-pulsed[0].alpha)<1e-8)&&pulsed[0].alpha!==ready[0].alpha,'ready ring breathes uniformly while waiting');
                __flowEnemy(player.x,player.y-200);_piscesTrySummon();
                check(window._piscesFlowMs===0&&counterDraws().every(d=>d.alpha===0.1),'summon extinguishes the ring in the same frame');
                __flowReset();window._piscesFlowMs=5000;_mobPerf=true;
                check(counterDraws().filter(d=>!d.white).length===4,'mobile performance mode uses four fixed bubbles even at tier zero');
                window._playerSigils=[];check(counterDraws().length===0,'no buff draws no counter');
                check(typeof _drawPiscesHud==='undefined'&&typeof _piscesPointLabels==='undefined'&&typeof _piscesPointFlashMs==='undefined','FLOW HUD and orphaned state are removed');
                return done;
            });
            const timings = await page.evaluate(() => {
                __flowReset(); _piscesSprites(); window._piscesFlowMs = 16000;
                window._cofAuraEnd = performance.now() + 600;
                for (const fish of _piscesFishPool) { fish.active = true; fish.x = player.x; fish.y = player.y - 70; fish.age = 700; fish.angle = -1; }
                const target = __flowEnemy(player.x,player.y-100); target.size=144;
                _piscesEmit(1,target.x,target.y,300,-1,target.size,target); _piscesEmit(1,target.x+20,target.y,300,-1,target.size,target);
                const rows = [], original = ctx.drawImage;
                for (const level of [0,1,2,3,4]) {
                    _applyGfxLevel(level);
                    let images = 0;
                    ctx.drawImage = function (...args) { images++; return original.apply(this,args); };
                    _drawPiscesCurrent(); _drawPiscesAura(); _drawPiscesFish(); _drawPiscesImpacts();
                    ctx.drawImage = original;
                    const runsCpuMs=[];
                    for(let run=0;run<3;run++) {
                        for (let i=0;i<50;i++) { _drawPiscesCurrent(); _drawPiscesAura(); _drawPiscesFish(); _drawPiscesImpacts(); }
                        const start = _flowRealNow();
                        for (let i=0;i<300;i++) { _drawPiscesCurrent(); _drawPiscesAura(); _drawPiscesFish(); _drawPiscesImpacts(); }
                        runsCpuMs.push((_flowRealNow()-start)/300);
                    }
                    rows.push({level,images,runsCpuMs,meanCpuMs:runsCpuMs.reduce((a,b)=>a+b)/3});
                }
                return rows;
            });
            assert(timings[0].images > timings[2].images && timings[2].images > timings[4].images, 'graphics levels reduce layers and bubbles');
            reports.push({ mode, checks, timings });
            await page.evaluate(()=>{__flowReset();window.AudioMgr={playSfx(){}};openDebugConsole();});
            await page.getByRole('button',{name:'Pisces: Refund 2s to every skill (needs Cycle of Flow)',exact:true}).click();
            const buttonPoints=await page.evaluate(()=>{closeDebugConsole();window.AudioMgr=null;return window._piscesFlowMs;});
            assert.equal(buttonPoints,12000,'the existing debug button refunds twelve points');
            for(const level of [0,2,4])for(const points of [0,5,12,14,24]){
                await page.evaluate(({level,points,mode})=>{
                    __flowReset();_applyGfxLevel(level);player.y=mode==='mobile'?canvas.height*0.48:canvas.height*0.55;__flowPaint();
                    if(points>=12){debugPiscesRefund();if(points>12)_piscesOnCdReduction((points-12)*1000,performance.now());}
                    else if(points)_piscesOnCdReduction(points*1000,performance.now());
                    _piscesClock=300;__flowPaint();
                },{level,points,mode});
                await page.screenshot({path:path.join(output,`counter-${mode}-tier-${level}-${points}-points.png`)});
            }
            for(const level of [0,4])for(const type of ['small','boss','blocked']) {
                const beforeMs = await page.evaluate(({level,type})=>{
                    const e=__impactFixture(type); _applyGfxLevel(level);
                    Math.random=()=>type==='blocked'?0.1:0.999;
                    const before=(165-e.size/2-20)/PISCES_FISH_SPEED;
                    __flowStep(PISCES_FISH_FORM_MS+before); return before;
                },{level,type});
                await page.screenshot({path:path.join(output,`impact-${mode}-${type}-tier-${level}-before.png`)});
                await page.evaluate(()=>__flowStep(25));
                await page.screenshot({path:path.join(output,`impact-${mode}-${type}-tier-${level}-hit.png`)});
                await page.evaluate(()=>__flowStep(100));
                await page.screenshot({path:path.join(output,`impact-${mode}-${type}-tier-${level}-100ms.png`)});
                await page.evaluate(()=>__flowStep(200));
                await page.screenshot({path:path.join(output,`impact-${mode}-${type}-tier-${level}-300ms.png`)});
                await page.evaluate(()=>{Math.random=()=>0.999;});
            }
            for (const level of [0,2,4]) {
                await page.evaluate(({level, mode}) => { __flowReset(); _applyGfxLevel(level); player.x = canvas.width / 2; player.y = mode === 'mobile' ? canvas.height * 0.48 : canvas.height - 180; __flowEnemy(player.x + 130,player.y-100); window._piscesFlowMs = 11000; __flowPaint(); }, {level,mode});
                await page.screenshot({ path: path.join(output, `flow-${mode}-tier-${level}-11-points.png`) });
                await page.evaluate(() => { _piscesOnCdReduction(1000, performance.now()); _piscesUpdate(0); __flowStep(160); });
                await page.screenshot({ path: path.join(output, `flow-${mode}-tier-${level}-bubbles.png`) });
                await page.evaluate(() => __flowStep(340));
                await page.screenshot({ path: path.join(output, `flow-${mode}-tier-${level}-fish.png`) });
            }
            await page.evaluate(mode => { __flowReset(); player.y = mode === 'mobile' ? canvas.height * 0.48 : canvas.height-180; _piscesOnCdReduction(11000,performance.now()); window._coiMongEndTime = performance.now()+2500; __flowStep(120); }, mode);
            await page.screenshot({ path: path.join(output, `flow-${mode}-dream-overlap.png`) });
            const movie = await page.evaluate(async mode => {
                __flowReset(); _applyGfxLevel(mode === 'mobile' ? 2 : 0);
                player.x = canvas.width / 2; player.y = canvas.height * 0.58;
                __flowEnemy(player.x + 140,player.y - 230);
                const chunks = [], stream = canvas.captureStream(30);
                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 1800000 });
                const stopped = new Promise(resolve => recorder.onstop = resolve);
                recorder.ondataavailable = e => chunks.push(e.data); recorder.start();
                for (let frame = 0; frame < 150; frame++) {
                    if (frame < 72 && frame % 6 === 0) _piscesOnCdReduction(1000,performance.now());
                    __flowStep(1000/30);
                    await new Promise(resolve=>setTimeout(resolve,1000/30));
                }
                recorder.stop(); await stopped; stream.getTracks().forEach(t=>t.stop());
                return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));
            }, mode);
            fs.writeFileSync(path.join(output, `flow-${mode}-preview.webm`), Buffer.from(movie));
            await context.close();
        }
        if(!glowOnly)fs.writeFileSync(path.join(output,'flow-results.json'),JSON.stringify({reports,errors},null,2));
        assert.equal(errors.length,0,errors.join('\n')); console.log(JSON.stringify({reports,errors},null,2));
    } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
