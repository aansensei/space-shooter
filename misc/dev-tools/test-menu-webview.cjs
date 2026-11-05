const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_NODE_MODULES
    ? require.resolve('playwright', { paths: [process.env.PLAYWRIGHT_NODE_MODULES] })
    : path.join(process.env.USERPROFILE, 'anaconda3/lib/site-packages/playwright/driver/package'));
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'misc/menu-webview-audit');
const baselineRef = process.argv.find(arg => arg.startsWith('--baseline='));
const baseline = baselineRef ? execFileSync('git', ['show', baselineRef.slice(11) + ':index.html'], { cwd: root, encoding: 'utf8' }) : null;
const profiles = [
    { id: 'linkedin-portrait', width: 402, height: 682 },
    { id: 'iphone-expanded', width: 390, height: 620 },
    { id: 'iphone-collapsed', width: 390, height: 844 },
    { id: 'iphone-landscape', width: 874, height: 340, insets: { left: 59, right: 59, bottom: 21 } },
    { id: 'small-landscape', width: 667, height: 320, insets: { bottom: 21 } },
    { id: 'ipad-portrait', width: 820, height: 1080, insets: { top: 24, bottom: 20 } },
    { id: 'ipad-landscape', width: 1180, height: 744, insets: { top: 24, bottom: 20 } },
    { id: 'desktop', width: 1440, height: 900, desktop: true }
];

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const server = await require('./game-audit-server.cjs')(root);
    const browser = await chromium.launch({ headless: true,
        executablePath: path.join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe') });
    const checks = [], errors = [];
    const check = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });
    async function open(profile, old = false) {
        const page = await browser.newPage({ viewport: { width: profile.width, height: profile.height },
            isMobile: !profile.desktop, hasTouch: !profile.desktop, deviceScaleFactor: 1, serviceWorkers: 'block' });
        page.on('pageerror', e => errors.push(profile.id + ': ' + e.message));
        await page.route('https://fonts.googleapis.com/**', route => route.abort());
        await page.route('**/index.html', route => {
            let html = old ? baseline : fs.readFileSync(path.join(root, 'index.html'), 'utf8');
            if (profile.insets) html = html.replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,
                (_, side) => (profile.insets[side] || 0) + 'px');
            return route.fulfill({ contentType: 'text/html', body: html });
        });
        await page.goto(server.url + '/index.html');
        await page.waitForFunction(() => document.getElementById('bgCanvas') && document.getElementById('pixiCanvas') && typeof selectPlatform === 'function');
        await page.evaluate(() => {
            document.getElementById('click-to-start').style.display = 'none';
            AudioMgr.setMuted(true);
        });
        return page;
    }
    async function inspect(page) {
        return page.evaluate(() => {
            const box = id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
            return { overlay: box('easter-egg-overlay'), ui: box('ui-wrapper'),
                buttons: ['btn-pc', 'btn-mobile', 'guideBtn', 'settingsBtn', 'modeBtn', 'start-hyperjump-btn'].map(id => ({ id, ...box(id) })),
                layers: ['bgCanvas', 'gameCanvas', 'pixiCanvas'].map(id => ({ id, visibility: getComputedStyle(document.getElementById(id)).visibility })),
                width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollHeight,
                horizontalOverflow: document.documentElement.scrollWidth > innerWidth };
        });
    }
    try {
        if (baseline) {
            const before = await open(profiles[0], true);
            // Models a webview whose cached CSS height excludes the translucent toolbar region.
            await before.evaluate(() => { document.getElementById('easter-egg-overlay').style.height = 'calc(100% - 76px)'; });
            const old = await inspect(before);
            check('Baseline exposes gameplay below a shortened menu', old.overlay.bottom < old.height && old.layers.some(l => l.visibility === 'visible'), old);
            await before.screenshot({ path: path.join(output, 'linkedin-before.png') });
            await before.close();
        }
        for (const profile of profiles) {
            const page = await open(profile);
            const state = await inspect(page);
            check(profile.id + ': menu covers viewport and hides gameplay', state.overlay.bottom >= state.height && state.layers.every(l => l.visibility === 'hidden') && !state.horizontalOverflow, state);
            const reachable = [];
            for (const button of state.buttons) {
                await page.locator('#' + button.id).scrollIntoViewIfNeeded();
                const bounds = (await inspect(page)).buttons.find(b => b.id === button.id);
                reachable.push({ ...bounds, fits: bounds.x >= -1 && bounds.y >= -1 && bounds.right <= state.width + 1 && bounds.bottom <= state.height + 1 });
            }
            check(profile.id + ': menu buttons remain reachable', reachable.every(b => b.fits), reachable);
            await page.evaluate(() => { document.getElementById('lock-screen').scrollTop = 0; });
            if (profile.id === 'linkedin-portrait') {
                await page.evaluate(() => { document.getElementById('easter-egg-overlay').style.height = 'calc(100% - 76px)'; });
                const short = await inspect(page);
                check('Shortened webview height retains opaque menu coverage', short.overlay.bottom >= short.height && short.layers.every(l => l.visibility === 'hidden'), short);
                await page.screenshot({ path: path.join(output, 'linkedin-after.png') });
                await page.evaluate(() => { document.getElementById('easter-egg-overlay').style.height = ''; });
                await page.locator('#modeBtn').click();
                check('Voyage picker opens', await page.locator('.gm-card[data-mode="tutorial"]').isVisible());
                await page.locator('.gm-card[data-mode="tutorial"]').click();
                await page.locator('#start-hyperjump-btn').click();
                await page.waitForFunction(() => window._inGame && getComputedStyle(document.getElementById('easter-egg-overlay')).display === 'none', null, { timeout: 20000 });
                check('Hyperjump reveals all gameplay layers', (await inspect(page)).layers.every(l => l.visibility === 'visible'));
                await page.evaluate(() => { _tutorialAbort(); _returnToMainMenu(); });
                await page.waitForTimeout(100);
                check('Returning to menu hides gameplay again', (await inspect(page)).layers.every(l => l.visibility === 'hidden'));
                for (const viewport of [{ width: 874, height: 340 }, { width: 402, height: 770 }, { width: 402, height: 682 }]) {
                    await page.setViewportSize(viewport);
                    await page.waitForTimeout(300);
                    const rotated = await inspect(page);
                    check('Rotate or toolbar resize ' + viewport.width + 'x' + viewport.height,
                        rotated.overlay.bottom >= rotated.height && rotated.layers.every(l => l.visibility === 'hidden') && !rotated.horizontalOverflow, rotated);
                }
                await page.waitForFunction(() => typeof debugStartSession === 'function');
                await page.evaluate(() => { debugStartSession(); closeDebugConsole(); });
                check('Direct custom session reveals gameplay', (await inspect(page)).layers.every(l => l.visibility === 'visible'));
            } else if (profile.id === 'iphone-landscape' || profile.id === 'ipad-portrait') {
                await page.screenshot({ path: path.join(output, profile.id + '.png') });
            }
            await page.close();
        }
        check('No runtime exceptions', errors.length === 0, errors);
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
        console.log(JSON.stringify({ passed: checks.filter(c => c.pass).length, total: checks.length,
            failed: checks.filter(c => !c.pass), errors }, null, 2));
        assert(checks.every(c => c.pass));
    } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
