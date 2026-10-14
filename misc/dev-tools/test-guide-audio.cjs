const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.PLAYWRIGHT_NODE_MODULES] }));

const root = process.cwd();
const output = path.join(root, 'misc', 'guide-audio-check');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp4': 'video/mp4' };
const guideSource = fs.readFileSync(path.join(root, 'guide.html'), 'utf8');
assert(!guideSource.includes('<script src="js/audio.js"></script>'));
const beforeSource = guideSource.replace('  <script src="js/render/skill-g.js"></script>', '  <script src="js/render/skill-g.js"></script>\n  <script src="js/audio.js"></script>');
const errors = [];

async function makeContext(browser, stage) {
    const context = await browser.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const records = [];
    await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.hostname !== '127.0.0.1') { await route.fulfill({ status: 200, contentType: 'text/css', body: '' }); return; }
        const name = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html', file = path.resolve(root, name);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { await route.fulfill({ status: 404, body: '' }); return; }
        const body = name === 'guide.html' ? Buffer.from(stage === 'before' ? beforeSource : guideSource) : fs.readFileSync(file);
        records.push({ file: name, bytes: body.length, type: path.extname(file).slice(1) || 'other' });
        await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body });
    });
    await context.addInitScript(() => {
        window.__audioCheck = { contexts: 0, decoded: 0, sources: [], calls: [], drawings: {} };
        const NativeContext = window.AudioContext;
        if (NativeContext) window.AudioContext = new Proxy(NativeContext, { construct(target, args) { const value = Reflect.construct(target, args); window.__audioCheck.contexts++; return value; } });
        const arrays = new WeakMap(), buffers = new WeakMap(), arrayBuffer = Response.prototype.arrayBuffer;
        Response.prototype.arrayBuffer = function (...args) { const file = new URL(this.url).pathname.slice(1); return arrayBuffer.apply(this, args).then(value => { arrays.set(value, file); return value; }); };
        const decode = BaseAudioContext.prototype.decodeAudioData;
        BaseAudioContext.prototype.decodeAudioData = function (...args) { window.__audioCheck.decoded++; const file = arrays.get(args[0]); return decode.apply(this, args).then(value => { buffers.set(value, file); return value; }); };
        const start = AudioBufferSourceNode.prototype.start, stop = AudioBufferSourceNode.prototype.stop, nodes = new WeakMap();
        AudioBufferSourceNode.prototype.start = function (...args) {
            const item = { file: buffers.get(this.buffer), duration: this.buffer ? this.buffer.duration : 0, loop: this.loop, active: true };
            nodes.set(this, item); window.__audioCheck.sources.push(item);
            this.addEventListener('ended', () => { item.active = false; });
            return start.apply(this, args);
        };
        AudioBufferSourceNode.prototype.stop = function (...args) { const item = nodes.get(this); if (item) item.active = false; return stop.apply(this, args); };
        for (const name of ['fill', 'stroke', 'fillRect', 'drawImage', 'fillText']) {
            const original = CanvasRenderingContext2D.prototype[name];
            CanvasRenderingContext2D.prototype[name] = function (...args) { const id = this.canvas.id || (this.canvas.dataset.sigil ? 'sigil:' + this.canvas.dataset.sigil : ''); if (id) window.__audioCheck.drawings[id] = (window.__audioCheck.drawings[id] || 0) + 1; return original.apply(this, args); };
        }
    });
    context.on('page', page => {
        page.on('pageerror', error => errors.push(stage + ': ' + error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(stage + ': ' + message.text()); });
    });
    return { context, records };
}

function summarize(records) {
    const types = {};
    for (const r of records) { const t = types[r.type] ||= { requests: 0, bytes: 0 }; t.requests++; t.bytes += r.bytes; }
    return { requests: records.length, bytes: records.reduce((sum, r) => sum + r.bytes, 0), types };
}

async function visible(frame) {
    await frame.waitForFunction(() => document.querySelector('#guideBody .card.visible'), null, { polling: 50 });
}

async function tabs(frame) {
    const result = [];
    for (const tab of ['basics', 'passives', 'skills', 'sigils', 'enemies', 'rules', 'updatelog', 'music']) {
        await frame.locator(`[data-tab="${tab}"]`).click();
        await visible(frame);
        await frame.waitForTimeout(250);
        const count = await frame.locator('.play-btn').count();
        const widgets = [];
        for (let i = 0; i < count; i++) {
            const button = frame.locator('.play-btn').nth(i);
            await button.evaluate(el => { if (el.closest('#sSpiritPane2')) showSpiritTab(2); if (el.closest('#gGoliathPane2')) showGoliathTab(2); });
            const sample = await button.evaluate(el => ({ id: el.id, canvas: el.parentElement.querySelector('canvas')?.id }));
            if (!sample.canvas) continue;
            const initial = await frame.evaluate(id => __audioCheck.drawings[id] || 0, sample.canvas);
            await button.evaluate(el => el.click());
            await frame.waitForTimeout(100);
            const draws = await frame.evaluate(id => __audioCheck.drawings[id] || 0, sample.canvas);
            widgets.push({ ...sample, additionalDraws: draws - initial });
            assert(draws > initial, tab + ' demo did not draw: ' + sample.id);
            await button.evaluate(el => { if (el.dataset.running === 'true' && el.dataset.paused !== 'true') el.click(); });
        }
        const canvases = await frame.evaluate(() => [...document.querySelectorAll('canvas')].map(c => ({ id: c.id || 'sigil:' + c.dataset.sigil, width: c.width, height: c.height, draws: __audioCheck.drawings[c.id || 'sigil:' + c.dataset.sigil] || 0 })));
        if (tab === 'sigils') assert(canvases.some(c => c.draws > 0), 'Sigil glyphs did not draw');
        result.push({ tab, widgets, canvases });
    }
    return result;
}

async function standalone(browser, url, stage) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
        const { context, records } = await makeContext(browser, stage), page = await context.newPage();
        const start = performance.now();
        await page.goto(url + '/guide.html', { waitUntil: 'domcontentloaded' });
        await visible(page);
        const visibleMs = performance.now() - start;
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        const startup = records.slice(), audio = await page.evaluate(() => ({ contexts: __audioCheck.contexts, decoded: __audioCheck.decoded, ownAudioMgr: !!window.AudioMgr }));
        assert.equal(audio.contexts, stage === 'before' ? 1 : 0);
        assert.equal(audio.ownAudioMgr, stage === 'before');
        const row = { ...summarize(startup), visibleMs, audio };
        if (i === 0) {
            row.png = [...new Map(startup.filter(r => r.type === 'png').map(r => [r.file, r])).values()].sort((a, b) => b.bytes - a.bytes);
            row.renderModules = startup.filter(r => r.file.startsWith('js/render/')).map(r => r.file);
            if (stage === 'after') row.tabs = await tabs(page);
        }
        runs.push(row);
        await context.close();
        console.log(stage + ' Guide startup ' + (i + 1) + ': ' + row.requests + ' requests');
    }
    return runs;
}

async function inGame(browser, url, stage) {
    const { context, records } = await makeContext(browser, stage), page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(url + '/index.html');
    await page.waitForFunction(() => window.debugStartSession && window._bgReady && window._pixiApp);
    await page.evaluate(() => selectPlatform('mobile'));
    await page.locator('#click-to-start').click();
    await page.locator('#start-hyperjump-btn').click();
    await page.waitForFunction(() => window._inGame && window._sigilPicker?.phase === 'choosing_sigil');
    const confirm = await page.evaluate(() => {
        const r = _sigilConfirmRect(_pickerLayout(), 0), bounds = canvas.getBoundingClientRect(), h = window._hudScale || 1;
        return { x: bounds.left + (canvas.width / 2 + (r.x + r.w / 2 - canvas.width / 2) * h) * bounds.width / canvas.width, y: bounds.top + (canvas.height / 2 + (r.y + r.h / 2 - canvas.height / 2) * h) * bounds.height / canvas.height };
    });
    await page.touchscreen.tap(confirm.x, confirm.y);
    await page.waitForFunction(() => !window._sigilPicker && gameState === 'playing');
    await page.evaluate(() => {
        gamePaused = true; showPauseScreen();
        window.__parentAudio = window.AudioMgr;
        for (const name of ['playSfx', 'pauseBgm', 'resumeBgm']) {
            const original = AudioMgr[name];
            AudioMgr[name] = function (...args) { __audioCheck.calls.push({ name, args }); return original.apply(this, args); };
        }
        const track = AudioMgr.list().find(t => !t.menuOnly);
        window.__bgmExpected = track.src;
        AudioMgr.setMuted(false); AudioMgr.unlockContext(); AudioMgr.playBgmById(track.id);
    });
    await page.waitForFunction(() => __audioCheck.sources.some(s => s.active && s.file === __bgmExpected), null, { timeout: 30000 });
    await page.waitForTimeout(500);
    const runs = [], count = stage === 'before' ? 3 : 5;
    for (let i = 0; i < count; i++) {
        const initial = records.length;
        const start = performance.now();
        await page.locator('#pause-guide-btns button').first().click();
        const frame = await page.waitForSelector('#guideFrame').then(h => h.contentFrame());
        await visible(frame);
        const visibleMs = performance.now() - start;
        await frame.waitForTimeout(300);
        const iframeAudio = await frame.evaluate(() => ({ contexts: __audioCheck.contexts, ownAudioMgr: !!window.AudioMgr }));
        assert.equal(iframeAudio.contexts, stage === 'before' ? 1 : 0);
        await frame.locator('[data-tab="enemies"]').click();
        await frame.waitForTimeout(300);
        await frame.locator('[data-tab="music"]').click();
        await frame.waitForSelector('#music-list button');
        const beforeMusic = records.length;
        await frame.locator('#music-list button').first().click();
        await frame.waitForFunction(() => window._musicArchivePreview && !_musicArchivePreview.paused && _musicArchivePreview.currentTime > 0);
        const music = await frame.evaluate(() => ({ src: new URL(_musicArchivePreview.src).pathname.slice(1), preload: _musicArchivePreview.preload, time: _musicArchivePreview.currentTime }));
        assert.equal(music.src, 'assets/audio/bgm/anata.mp3');
        assert.equal(music.preload, 'none');
        assert(records.slice(beforeMusic).some(r => r.file === music.src), 'Archive did not request selected song');
        const paused = await page.evaluate(() => !__audioCheck.sources.some(s => s.active && s.file === __bgmExpected));
        assert(paused, 'Parent BGM still active during preview');
        await frame.locator('#music-list button').first().click();
        await page.waitForFunction(() => __audioCheck.sources.some(s => s.active && s.file === __bgmExpected));
        await page.locator('#guideOverlay button[onclick="closeGuide()"]').click();
        await page.waitForFunction(() => document.getElementById('guideFrame').src === 'about:blank');
        await page.waitForTimeout(400);
        const restored = await page.evaluate(() => ({ sameAudioMgr: AudioMgr === __parentAudio, contexts: __audioCheck.contexts, bgm: AudioMgr.currentBgmId(), playing: __audioCheck.sources.some(s => s.active && s.file === __bgmExpected), clicks: __audioCheck.calls.filter(c => c.name === 'playSfx' && c.args[0] === 'click').length, clickSources: __audioCheck.sources.filter(s => s.file === 'assets/audio/sfx/click.mp3').length }));
        assert(restored.sameAudioMgr && restored.playing && restored.clicks > 0);
        await cdp.send('HeapProfiler.collectGarbage');
        const metrics = (await cdp.send('Performance.getMetrics')).metrics;
        const heapBytes = metrics.find(m => m.name === 'JSHeapUsedSize').value;
        runs.push({ visibleMs, iframeAudio, music, parentPaused: paused, restored, heapBytes, requests: summarize(records.slice(initial)) });
        console.log(stage + ' in-game cycle ' + (i + 1) + ': ' + visibleMs.toFixed(1) + ' ms');
    }
    await context.close();
    return runs;
}

function sourceLocations(file) {
    const result = [];
    for (const name of ['guide.html', ...[...guideSource.matchAll(/<script src="(js\/render\/[^"?]+)/g)].map(m => m[1])]) {
        fs.readFileSync(path.join(root, name), 'utf8').split(/\r?\n/).forEach((line, index) => { if (line.includes(file)) result.push({ file: name, line: index + 1 }); });
    }
    return result;
}

async function cacheAudit(browser, url) {
    const { context } = await makeContext(browser, 'after'), page = await context.newPage();
    await page.goto(url + '/guide.html');
    await page.locator('[data-tab="enemies"]').click();
    await page.waitForTimeout(300);
    await page.locator('#gTabBtn2').click();
    await page.waitForTimeout(200);
    const sample = () => ({
        goliathFx: Object.keys(_goliathFxCache).length,
        thaelisCanvases: [_thaelisOuterPolySprite, _thaelisInnerPolySprite, _thaelisCoreSprite].filter(Boolean).length,
        urielEyes: Object.keys(_urielEyeSpriteCache).length,
        urielWings: Object.keys(_urielWingSpriteCache).length,
        urielRings: Object.keys(_urielRingSpriteCache).length,
        lastContextDetached: !!ctx && !ctx.canvas.isConnected
    });
    const enemies = await page.evaluate(sample);
    await page.locator('[data-tab="music"]').click();
    await page.waitForTimeout(200);
    const music = await page.evaluate(sample);
    await context.close();
    return { enemies, music };
}

async function report(browser, data) {
    const context = await browser.newContext({ viewport: { width: 1500, height: 900 } }), page = await context.newPage();
    const mb = n => (n / 1048576).toFixed(2), mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    const a = data.before.standalone[0], b = data.after.standalone[0];
    const rows = [...new Set([...Object.keys(a.types), ...Object.keys(b.types)])].map(type => `<tr><td>${type}</td><td>${a.types[type]?.requests || 0}</td><td>${mb(a.types[type]?.bytes || 0)}</td><td>${b.types[type]?.requests || 0}</td><td>${mb(b.types[type]?.bytes || 0)}</td></tr>`).join('');
    const png = b.png.map(r => `<tr><td>${r.file}</td><td>${mb(r.bytes)}</td><td>${r.loaders.map(l => l.file + ':' + l.line).join(', ')}</td></tr>`).join('');
    const timings = stage => data[stage].inGame.slice(0, 3).map(r => r.visibleMs.toFixed(1)).join(', ');
    const sheets = [
        ['guide-audio-results.png', `<h1>Guide audio removal</h1><table><tr><th>Type</th><th>Before requests</th><th>Before MiB</th><th>After requests</th><th>After MiB</th></tr>${rows}<tr><td>Total</td><td>${a.requests}</td><td>${mb(a.bytes)}</td><td>${b.requests}</td><td>${mb(b.bytes)}</td></tr></table><p>Open to visible first tab, in game, ms. Before: ${timings('before')}. After: ${timings('after')}. Means: ${mean(data.before.inGame.slice(0, 3).map(r => r.visibleMs)).toFixed(1)} and ${mean(data.after.inGame.slice(0, 3).map(r => r.visibleMs)).toFixed(1)}.</p><p>After: all 8 tabs and ${data.after.standalone[0].tabs.reduce((s, r) => s + r.widgets.length, 0)} playable widgets checked. Five in-game open and close cycles through the actual game entry, sigil confirmation and Guide buttons. Parent BGM pause and resume, selected song request, click calls and active audio sources verified. Console errors: ${data.errors.length}.</p><p>Collected JS heap after each close, MiB: ${data.after.inGame.map(r => mb(r.heapBytes)).join(', ')}. The small upward trend remains. This test cannot confirm absence of memory growth. Audio source and call instrumentation also retains small records.</p><p>Chrome headless at 874 x 402, DPR 3, touch and mobile enabled. Local assets served directly, external fonts use the same system fallback in both cases. Bytes are served resource payloads, excluding HTTP headers. The baseline restores only the Guide audio script in memory. This does not reproduce Safari or iOS memory limits. Final validation requires a real iPhone.</p>`],
        ['guide-png-audit.png', `<h1>Guide startup PNG files, unchanged</h1><table><tr><th>File</th><th>MiB</th><th>Loader</th></tr>${png}</table><p>${b.renderModules.length} js/render modules load at startup, plus js/canvas-guard.js. The current source loads 14 render modules, not 15. They and their raster caches stay loaded on tab switches. Closing Guide still unloads the iframe. Tab switches cancel animation callbacks at guide.html:3098 and replace visible canvases at guide.html:2963 but do not explicitly release module caches.</p><p>Measured retained cache entries, Enemies then Music Archive: ${Object.keys(data.cacheAudit.enemies).filter(k => k !== 'lastContextDetached').map(k => k + ' ' + data.cacheAudit.enemies[k] + ' to ' + data.cacheAudit.music[k]).join(', ')}. Last shared drawing context points to a detached canvas after leaving Enemies: ${data.cacheAudit.music.lastContextDetached}.</p><p>Cache declarations: js/render/enemy-goliath.js:167, js/render/enemy-thaelis.js:17, js/render/enemy-uriel.js:65, 205, 302. No change made to these resources.</p>`]
    ];
    for (const [name, html] of sheets) { await page.setContent(`<style>body{font:17px Arial;color:#172435;margin:28px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;text-align:left;padding:10px}th{background:#edf2f7}p{line-height:1.5}</style>${html}`); await page.screenshot({ path: path.join(output, name), fullPage: true }); }
    await context.close();
}

async function main() {
    fs.mkdirSync(output, { recursive: true });
    const server = http.createServer((req, res) => { res.writeHead(404); res.end(); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ executablePath: path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'), headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
    const url = 'http://127.0.0.1:' + server.address().port;
    const data = { measurement: 'Chrome headless, local resource payload bytes, external fonts use system fallback', before: {}, after: {}, errors };
    try {
        if (process.argv.includes('--report-only')) {
            const saved = JSON.parse(fs.readFileSync(path.join(output, 'results.json')));
            saved.cacheAudit = await cacheAudit(browser, url);
            saved.errors.push(...errors);
            await report(browser, saved);
            fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(saved, null, 2));
            return;
        }
        for (const stage of ['before', 'after']) {
            data[stage].standalone = await standalone(browser, url, stage);
            data[stage].inGame = await inGame(browser, url, stage);
        }
        for (const r of data.after.standalone[0].png) r.loaders = sourceLocations(r.file);
        data.cacheAudit = await cacheAudit(browser, url);
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(data, null, 2));
        await report(browser, data);
        assert.equal(errors.length, 0, errors.join('\n'));
        assert.equal(data.after.standalone[0].types.mp3?.requests || 0, 0);
        data.passed = true;
        console.log(JSON.stringify({ passed: true, errors, afterStartup: data.after.standalone[0].requests }));
    } finally { if (!process.argv.includes('--report-only')) fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(data, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
