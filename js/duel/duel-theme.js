// Pisces: Space Journey. Showdown Voyage central theme and color tokens module.
// Single source of truth for all duel palettes, fonts, and fantasy canvas drawing primitives.

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.DuelTheme = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // Core color tokens strictly matching game design in index.html (lines 414-420 and 1796-1803)
    const DUEL_THEME = Object.freeze({
        // Backgrounds
        bgOuter: '#030714',
        bgMiddle: '#040a1c',
        bgPanel: '#081430',
        bgOverlay: 'rgba(3, 7, 20, 0.85)',
        bgModal: 'rgba(8, 20, 48, 0.95)',
        bgCard: 'rgba(8, 20, 48, 0.70)',
        bgCardHover: 'rgba(12, 28, 64, 0.85)',
        bgCardSelected: 'rgba(15, 34, 76, 0.90)',

        // Metallics & Accents
        electric: '#00E5FF',
        electricGlow: 'rgba(0, 229, 255, 0.60)',
        electricDim: 'rgba(0, 229, 255, 0.25)',
        electricSubtle: 'rgba(0, 229, 255, 0.12)',

        turquoise: '#3FA9F5',
        turquoiseGlow: 'rgba(63, 169, 245, 0.45)',
        turquoiseDim: 'rgba(63, 169, 245, 0.18)',

        silver: '#DCE8F5',
        silverDim: '#8CA6C6',
        silverMuted: '#4A607A',
        silverGlow: 'rgba(220, 232, 245, 0.50)',

        gold: '#E8C46A',
        goldBright: '#F2D98B',
        goldGlow: 'rgba(232, 196, 106, 0.65)',
        goldDim: 'rgba(232, 196, 106, 0.20)',
        goldSubtle: 'rgba(232, 196, 106, 0.10)',

        crimson: '#FF4D6D',
        crimsonGlow: 'rgba(255, 77, 109, 0.60)',
        crimsonDim: 'rgba(255, 77, 109, 0.20)',
        crimsonDark: '#450A0A',

        white: '#FFFFFF',
        whiteTranslucent: 'rgba(255, 255, 255, 0.65)',
        ghostHp: 'rgba(255, 255, 255, 0.80)',

        // Button tokens
        navyBtn: 'rgba(0, 40, 70, 0.90)',
        navyBtnHover: 'rgba(0, 60, 90, 0.85)',
        navyBtnSecondary: 'rgba(4, 10, 28, 0.85)',
        btnShadow: 'rgba(0, 0, 0, 0.45)',
        btnTopShadow: 'rgba(0, 0, 0, 0.50)',
        shineGrad: 'rgba(160, 245, 255, 0.35)',
        rippleCyan: 'rgba(0, 229, 255, 0.40)',
        spotlightGlow: 'rgba(0, 229, 255, 0.15)',
        spotlightGold: 'rgba(232, 196, 106, 0.15)',

        // Phase tokens
        phase2Violet: '#9C7BFF',
        phase2VioletAura: 'rgba(74, 47, 191, 0.35)',
        phase3Crimson: '#FF4D6D',
        phase3CrimsonAura: 'rgba(179, 18, 59, 0.35)',

        // Shield and Skill F tokens
        shieldCyan: '#00FFFF',
        shieldFill: 'rgba(0, 255, 255, 0.08)',
        shieldDotted: 'rgba(100, 255, 255, 0.35)',
        slowFrostAura: 'rgba(0, 229, 255, 0.30)',

        // Transparent tokens & VFX overlays
        transparent: 'rgba(0, 0, 0, 0)',
        transparentTurquoise: 'rgba(63, 169, 245, 0)',
        transparentElectric: 'rgba(0, 229, 255, 0)',
        transparentGold: 'rgba(232, 196, 106, 0)',
        transparentCrimson: 'rgba(255, 77, 109, 0)',
        hitVignette: 'rgba(255, 77, 109, 0.28)',
        transitionDarken: 'rgba(3, 7, 20, 0.14)',
        slowZoneFill: 'rgba(0, 229, 255, 0.10)',
        slowZoneStroke: '#00E5FF',
        hpHighlight: 'rgba(255, 255, 255, 0.35)',

        // Boss specific
        bossTealAura: 'rgba(20, 60, 74, 0.35)',
        bossTealRune: 'rgba(0, 229, 255, 0.40)',
        bossHitFlash: '#E7D5E8',

        // Player Projectiles: Cold palette (silver white core, turquoise cyan halo)
        playerBullet: Object.freeze({
            core: '#FFFFFF',
            body: '#DCE8F5',
            halo: '#00E5FF',
            trail: '#3FA9F5',
            glow: 'rgba(0, 229, 255, 0.45)',
            spark: '#00E5FF'
        }),

        // Enemy Bullet Families: Warm Gold, Crimson, Violet, Cyan
        bulletFamilies: Object.freeze({
            // Warm Gold: rings, spirals, background curtain
            gold: Object.freeze({
                main: '#E8C46A',
                halo: '#FF9A3C',
                dark: '#4A2800',
                core: '#FFFFFF',
                glow: 'rgba(255, 154, 60, 0.45)'
            }),
            // Crimson: aimed at ship, danger bullets
            crimson: Object.freeze({
                main: '#FF4D6D',
                halo: '#B3123B',
                dark: '#450A0A',
                core: '#FFF0F3',
                glow: 'rgba(255, 77, 109, 0.45)'
            }),
            // Violet: ambient bullets, slow space-fillers
            violet: Object.freeze({
                main: '#9C7BFF',
                halo: '#4A2FBF',
                dark: '#261059',
                core: '#FFFFFF',
                glow: 'rgba(156, 123, 255, 0.45)'
            }),
            // Cyan: environmental arcs, starlight waves
            cyan: Object.freeze({
                main: '#00E5FF',
                halo: '#0088A8',
                dark: '#003344',
                core: '#FFFFFF',
                glow: 'rgba(0, 229, 255, 0.40)'
            })
        })
    });

    // Helper to get title font family: Cinzel for English, Playfair Display for Vietnamese
    function getTitleFont(size, weight = 700) {
        const isVi = typeof window !== 'undefined' && ((window._getLocale && window._getLocale() === 'vi') || window._lang === 'vi');
        if (isVi) {
            return weight + ' ' + size + "px 'Playfair Display', Cambria, 'Times New Roman', serif";
        }
        return weight + ' ' + size + "px 'Cinzel', 'Playfair Display', Georgia, serif";
    }

    // Helper to get body font family: Segoe UI with system fallbacks matching game --gm-font
    function getBodyFont(size, weight = 400) {
        return weight + ' ' + size + 'px "Segoe UI", system-ui, -apple-system, sans-serif';
    }

    // Chamfered corner polygon path (matching #mode-panel and #settings-panel clip-path)
    function panelPath(ctx, x, y, w, h, cut = 16, corners = 2) {
        ctx.beginPath();
        if (corners === 2) {
            // Top-left and bottom-right chamfered
            ctx.moveTo(x + cut, y);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + h - cut);
            ctx.lineTo(x + w - cut, y + h);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x, y + cut);
            ctx.closePath();
        } else {
            // All four corners chamfered
            ctx.moveTo(x + cut, y);
            ctx.lineTo(x + w - cut, y);
            ctx.lineTo(x + w, y + cut);
            ctx.lineTo(x + w, y + h - cut);
            ctx.lineTo(x + w - cut, y + h);
            ctx.lineTo(x + cut, y + h);
            ctx.lineTo(x, y + h - cut);
            ctx.lineTo(x, y + cut);
            ctx.closePath();
        }
    }

    // Renders full fantasy panel with 160 deg gradient border and inset background gradient
    function drawFantasyPanel(ctx, x, y, w, h, cut = 16, isSelected = false, corners = 2, uifx = null) {
        ctx.save();
        const fx = uifx || { scale: 1.0, translateY: 0, shakeOffset: 0, borderSweepT: 0, tickScale: isSelected ? 1.0 : 0 };

        const cx = x + w * 0.5;
        const cy = y + h * 0.5;

        ctx.translate(cx + (fx.shakeOffset || 0), cy + (fx.translateY || 0));
        if (fx.scale && fx.scale !== 1.0) {
            ctx.scale(fx.scale, fx.scale);
        }
        ctx.translate(-cx, -cy);

        const borderGrad = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
        if (isSelected) {
            borderGrad.addColorStop(0, '#d78d4c');
            borderGrad.addColorStop(0.3, '#654031');
            borderGrad.addColorStop(0.7, '#654031');
            borderGrad.addColorStop(1, DUEL_THEME.gold);
        } else {
            borderGrad.addColorStop(0, DUEL_THEME.silverMuted);
            borderGrad.addColorStop(0.5, '#654031');
            borderGrad.addColorStop(1, DUEL_THEME.silverMuted);
        }

        panelPath(ctx, x, y, w, h, cut, corners);
        ctx.fillStyle = borderGrad;
        ctx.fill();

        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, isSelected ? '#231719' : '#14121b');
        bgGrad.addColorStop(0.55, '#0f0c13');
        bgGrad.addColorStop(1, '#08070c');

        const innerCut = Math.max(2, cut - 1);
        panelPath(ctx, x + 1.2, y + 1.2, w - 2.4, h - 2.4, innerCut, corners);
        ctx.fillStyle = bgGrad;
        ctx.fill();

        // Spotlight illumination behind character or weapon icon
        const spotGrad = ctx.createRadialGradient(cx, y + 80, 8, cx, y + 80, Math.min(100, w * 0.45));
        spotGrad.addColorStop(0, isSelected ? DUEL_THEME.spotlightGold : '#a7784d18');
        spotGrad.addColorStop(1, DUEL_THEME.transparent);
        ctx.fillStyle = spotGrad;
        ctx.fillRect(x, y, w, 170);

        // Selection round tick mark in top right corner matching gm-check
        if (isSelected || (fx.tickScale && fx.tickScale > 0.05)) {
            const tickR = 10;
            const tickX = x + w - 16;
            const tickY = y + 16;
            const tScale = fx.tickScale || 1.0;

            ctx.save();
            ctx.translate(tickX, tickY);
            ctx.scale(tScale, tScale);

            ctx.beginPath();
            ctx.arc(0, 0, tickR, 0, Math.PI * 2);
            ctx.fillStyle = DUEL_THEME.electricDim;
            ctx.fill();
            ctx.strokeStyle = DUEL_THEME.electric;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Checkmark glyph
            ctx.strokeStyle = DUEL_THEME.white;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(-1, 3.5);
            ctx.lineTo(4.5, -3.5);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    // Renders fantasy button with chamfered corners, navy fill, gold border, and squish down fx
    const duelCardCache = new Map();
    function drawDuelSelectionPanel(ctx, x, y, w, h, cut, selected, shine) {
        const key = [w, h, cut, selected].join('/');
        let layer = duelCardCache.get(key);
        if (!layer) {
            layer = document.createElement('canvas');
            layer.width = Math.ceil(w); layer.height = Math.ceil(h);
            const art = layer.getContext('2d');
            drawFantasyPanel(art, 0, 0, w, h, cut, selected);
            drawDuelCardTrim(art, 0, 0, w, h, selected);
            drawRelicCarving(art, w, h, selected);
            if (duelCardCache.size >= 24) duelCardCache.delete(duelCardCache.keys().next().value);
            duelCardCache.set(key, layer);
        }
        ctx.drawImage(layer, x, y, w, h);
        if (shine >= 0 && shine < 1) {
            ctx.save(); ctx.globalAlpha = Math.sin(shine * Math.PI);
            ctx.strokeStyle = '#fff1c6'; ctx.lineWidth = 2;
            const p = x + 18 + shine * (w - 36);
            ctx.beginPath(); ctx.moveTo(p - 10, y + 7); ctx.lineTo(p + 9, y + 7); ctx.stroke();
            ctx.restore();
        }
    }

    function drawRelicCarving(ctx,w,h,selected) {
        ctx.save();
        ctx.strokeStyle=selected?'#e09b58':'#765a55';ctx.fillStyle='#aa815b';ctx.lineWidth=.75;
        for(let i=0;i<22;i++){const y=33+i*(h-66)/22;
            for(const x of [12,w-12]){ctx.beginPath();ctx.moveTo(x-3,y-4);ctx.lineTo(x+3,y);ctx.lineTo(x-3,y+4);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();}}
        for(const side of [-1,1])for(const top of [true,false]){
            ctx.save();ctx.translate(side<0?10:w-10,top?10:h-10);ctx.scale(-side,top?1:-1);
            ctx.beginPath();ctx.moveTo(0,46);ctx.bezierCurveTo(22,29,4,10,45,0);ctx.bezierCurveTo(21,14,39,18,14,26);ctx.stroke();
            ctx.beginPath();ctx.moveTo(5,26);ctx.quadraticCurveTo(28,25,23,12);ctx.quadraticCurveTo(18,6,14,17);ctx.stroke();
            ctx.fillRect(4,5,3,3);ctx.restore();}
        ctx.globalAlpha=.5;ctx.fillStyle='#0c090c';ctx.strokeStyle='#8c694e';
        ctx.beginPath();ctx.moveTo(w*.2,111);ctx.lineTo(w*.8,111);ctx.lineTo(w*.87,121);ctx.lineTo(w*.13,121);ctx.closePath();ctx.fill();ctx.stroke();
        for(let i=0;i<9;i++){const x=w*.24+i*w*.065;ctx.beginPath();ctx.moveTo(x,115);ctx.lineTo(x+2,119);ctx.lineTo(x+4,115);ctx.stroke();}
        ctx.globalAlpha=.2;ctx.strokeStyle='#92745b';
        for(let i=0;i<19;i++){const x=24+((i*73.13)%(w-48)),y=22+((i*117.71)%(h-44));
            ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y+4);ctx.lineTo(x+3,y+13);ctx.stroke();}
        if(selected){ctx.globalAlpha=.75;ctx.strokeStyle='#e88742';ctx.lineWidth=1.4;panelPath(ctx,2,2,w-4,h-4,12,4);ctx.stroke();}
        ctx.restore();
    }

    function drawDuelCardTrim(ctx, x, y, w, h, selected) {
        const accent = selected ? '#efc38d' : '#a585a8';
        ctx.save();
        ctx.strokeStyle = '#26142b'; ctx.lineWidth = 4;
        panelPath(ctx, x + 5, y + 5, w - 10, h - 10, 11, 4); ctx.stroke();
        ctx.lineWidth = selected ? 1.7 : 1; ctx.strokeStyle = accent;
        panelPath(ctx, x + 7, y + 7, w - 14, h - 14, 10, 4); ctx.stroke();
        for (let i = 0; i < 4; i++) {
            const sx = i % 2 ? -1 : 1, sy = i < 2 ? 1 : -1;
            ctx.save(); ctx.translate(x + (sx === 1 ? 9 : w - 9), y + (sy === 1 ? 9 : h - 9)); ctx.scale(sx, sy);
            ctx.beginPath(); ctx.moveTo(0, 31); ctx.quadraticCurveTo(3, 9, 14, 11);
            ctx.quadraticCurveTo(19, 13, 15, 18); ctx.moveTo(2, 14); ctx.quadraticCurveTo(8, 4, 33, 0); ctx.stroke();
            ctx.globalAlpha = 0.64;
            ctx.beginPath(); ctx.moveTo(0, 43); ctx.lineTo(2, 39); ctx.lineTo(5, 42);
            ctx.lineTo(9, 39); ctx.lineTo(13, 40); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    const buttonStates=new Map();
    function buttonPointerFX(x,y,w,h,hovered) {
        const p=typeof window!=='undefined'?window._duelButtonPointer:null;
        const id=[x,y,w,h].join('/');
        let st=buttonStates.get(id);if(!st){st={down:false,released:0};if(buttonStates.size>64)buttonStates.clear();buttonStates.set(id,st);}
        const down=!!(p?.down&&p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h),now=performance.now();
        if(st.down&&!down)st.released=now;st.down=down;
        const u=Math.min(1,(now-st.released)/120),bounce=window._fxOpts?.reducedMotion?0:-Math.sin(u*Math.PI)*.8;
        return {press:down?1:0,hover:hovered?1:0,scale:1,translateY:down?3:bounce,shineT:-1};
    }

    function drawFantasyButton(ctx, x, y, w, h, label, isPrimary = false, isHovered = false, uifx = null) {
        ctx.save();
        const cut = 8;
        const fx = uifx || buttonPointerFX(x, y, w, h, isHovered) || {
            scale: 1.0,
            translateY: isHovered ? -2 : 0,
            press: 0,
            hover: isHovered ? 1.0 : 0,
            shineT: -1,
            ripple: null
        };

        const cx = x + w * 0.5;
        const cy = y + h * 0.5;

        ctx.save();ctx.fillStyle='rgba(0,0,0,.65)';
        panelPath(ctx,x,y+(fx.press>.1?2:5),w,h,cut,4);ctx.fill();ctx.restore();
        ctx.translate(cx, cy + (fx.translateY || 0));
        if (fx.scale && fx.scale !== 1.0) {
            ctx.scale(fx.scale, fx.scale);
        }
        ctx.translate(-cx, -cy);

        // 1. Button Border: Gold for primary, Silver for secondary, Cyan on hover
        let borderColor = isPrimary ? DUEL_THEME.gold : DUEL_THEME.silverDim;
        if (fx.hover > 0.05) {
            borderColor = isPrimary ? DUEL_THEME.electric : DUEL_THEME.turquoise;
        }

        panelPath(ctx, x, y, w, h, cut, 4);
        ctx.fillStyle = borderColor;
        ctx.fill();

        // 2. Button Fill: Dark navy background
        let bgFill = isPrimary ? DUEL_THEME.navyBtn : DUEL_THEME.navyBtnSecondary;
        if (fx.hover > 0.05) {
            bgFill = isPrimary ? DUEL_THEME.navyBtnHover : DUEL_THEME.bgCardHover;
        }

        panelPath(ctx, x + 1.2, y + 1.2, w - 2.4, h - 2.4, cut - 1, 4);
        ctx.fillStyle = bgFill;
        ctx.fill();

        // 3. Pressed Top Shadow
        if (fx.press > 0.05) {
            ctx.save();
            panelPath(ctx, x + 1.2, y + 1.2, w - 2.4, h - 2.4, cut - 1, 4);
            ctx.clip();
            ctx.fillStyle = DUEL_THEME.btnTopShadow;
            ctx.fillRect(x, y, w, 5);
            ctx.restore();
        }

        if(fx.press>.05){ctx.save();ctx.globalAlpha=fx.press*.22;ctx.fillStyle='#000';panelPath(ctx,x+2,y+2,w-4,h-4,cut-1,4);ctx.fill();ctx.restore();}

        // 4. Diagonal Shine Sweep (0.6s sweep when hovered)
        if (fx.shineT >= 0 && fx.press < 0.1) {
            ctx.save();
            panelPath(ctx, x + 1.2, y + 1.2, w - 2.4, h - 2.4, cut - 1, 4);
            ctx.clip();
            const shineProgress = Math.min(1.0, fx.shineT / 0.60);
            const shineX = x - w * 0.3 + (w * 1.6) * shineProgress;
            const grad = ctx.createLinearGradient(shineX - 25, y, shineX + 25, y);
            grad.addColorStop(0, DUEL_THEME.transparent);
            grad.addColorStop(0.5, DUEL_THEME.shineGrad);
            grad.addColorStop(1, DUEL_THEME.transparent);
            ctx.fillStyle = grad;
            ctx.transform(1, 0, -0.36, 1, 0, 0);
            ctx.fillRect(shineX - 30, y - 10, 60, h + 20);
            ctx.restore();
        }

        // 5. Ripple Expanding Ring
        if (fx.ripple) {
            ctx.save();
            panelPath(ctx, x + 1.2, y + 1.2, w - 2.4, h - 2.4, cut - 1, 4);
            ctx.clip();
            ctx.strokeStyle = DUEL_THEME.rippleCyan;
            ctx.globalAlpha = fx.ripple.alpha || 0.4;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(fx.ripple.x, fx.ripple.y, fx.ripple.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 6. Button Label: Segoe UI uppercase with letter spacing, no Cinzel small caps
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = getBodyFont(12, 700);
        const textColor = isPrimary ? DUEL_THEME.goldBright : (fx.hover > 0.05 ? DUEL_THEME.silver : DUEL_THEME.silverDim);
        ctx.fillStyle = textColor;
        ctx.fillText(String(label).toUpperCase(), cx, cy);
        ctx.restore();
    }

    if(typeof window!=='undefined') {
        window._duelButtonPointer={x:-1,y:-1,down:false};
        window.addEventListener('pointerdown',e=>{const c=document.getElementById('gameCanvas') || (typeof canvas!=='undefined'?canvas:null);if(!c)return;const r=c.getBoundingClientRect();window._duelButtonPointer={x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height,down:true};});
        for(const event of ['pointerup','pointercancel','blur'])window.addEventListener(event,()=>{window._duelButtonPointer.down=false;});
    }

    // Small gold diamond accent (matching .gm-mark in index.html)
    function drawDiamondMark(ctx, cx, cy, size = 7) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = DUEL_THEME.gold;
        ctx.strokeStyle = DUEL_THEME.bgOuter;
        ctx.lineWidth = 1;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.restore();
    }

    // Gradient divider line (matching .gm-head::after in index.html)
    function drawGradientDivider(ctx, x1, x2, y) {
        ctx.save();
        const grad = ctx.createLinearGradient(x1, y, x2, y);
        grad.addColorStop(0, DUEL_THEME.transparentTurquoise);
        grad.addColorStop(0.3, DUEL_THEME.turquoiseGlow);
        grad.addColorStop(0.5, DUEL_THEME.goldGlow);
        grad.addColorStop(0.7, DUEL_THEME.turquoiseGlow);
        grad.addColorStop(1, DUEL_THEME.transparentTurquoise);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        ctx.restore();
    }

    // Ornamental lock glyph for locked cards with gold shimmer and shake animation
    function drawOrnamentalLock(ctx, cx, cy, size = 28, wobble = 0, isCrimson = false) {
        ctx.save();
        ctx.translate(cx, cy);
        if (wobble) ctx.rotate(wobble);

        const shackleR = size * 0.28;
        const mainColor = isCrimson ? DUEL_THEME.crimson : DUEL_THEME.gold;
        const darkColor = isCrimson ? DUEL_THEME.crimsonDark : DUEL_THEME.bgOuter;

        // Shackle arc
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -size * 0.25, shackleR, Math.PI, 0);
        ctx.stroke();

        // Lock body (chamfered mini box)
        const bw = size * 0.75;
        const bh = size * 0.60;
        panelPath(ctx, -bw / 2, 0, bw, bh, 4, 4);
        ctx.fillStyle = mainColor;
        ctx.fill();

        panelPath(ctx, -bw / 2 + 1.2, 1.2, bw - 2.4, bh - 2.4, 3, 4);
        ctx.fillStyle = darkColor;
        ctx.fill();

        // Keyhole
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(0, bh * 0.40, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-1.5, bh * 0.40);
        ctx.lineTo(1.5, bh * 0.40);
        ctx.lineTo(2.0, bh * 0.75);
        ctx.lineTo(-2.0, bh * 0.75);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // Each attack owns one full health bar and one distinct palette.
    const ATTACK_BAR_COLORS = [
        '#26e7b2', '#38b7ff', '#45e3ef', '#4280ff', '#69f4ca', '#327dba',
        '#8275ff', '#df65ed', '#6856db', '#fa75b8', '#a77aff', '#cf42a1', '#7065f5',
        '#ff4567', '#ff9b45', '#f85c32', '#ffd55c', '#eef7ff'
    ];

    function getAttackBarState(attackId, hp, maxHp) {
        const index = Math.max(0, Math.min(17, (attackId || 1) - 1));
        return { index, ratio: Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0)),
            color: ATTACK_BAR_COLORS[index], nextColor: ATTACK_BAR_COLORS[index + 1] || '#17283c',
            remaining: 17 - index };
    }

    const duelBarSprites = new Map();
    function _bakeDuelBar(color) {
        if (duelBarSprites.has(color)) return duelBarSprites.get(color);
        const sprite = document.createElement('canvas');
        sprite.width = 2; sprite.height = 16;
        const g = sprite.getContext('2d');
        const paint = g.createLinearGradient(0, 0, 0, 16);
        paint.addColorStop(0, '#f0fbff'); paint.addColorStop(0.18, color);
        paint.addColorStop(0.64, color); paint.addColorStop(1, '#122039');
        g.fillStyle = paint; g.fillRect(0, 0, 2, 16);
        duelBarSprites.set(color, sprite);
        return sprite;
    }

    // Obsidian plate: dark stone body, worn gold edge, studded corners and a faint ember glow along the lower edge
    function drawObsidianPlate(ctx, x, y, w, h, opts) {
        const o = opts || {}, now = performance.now();
        const ember = o.ember !== undefined ? o.ember : 0.5;
        const cut = Math.min(o.cut || 10, h * 0.3);
        const low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
        const path = (ix, iy, iw, ih, c) => {
            ctx.beginPath();
            ctx.moveTo(ix + c, iy); ctx.lineTo(ix + iw - c, iy); ctx.lineTo(ix + iw, iy + c);
            ctx.lineTo(ix + iw, iy + ih - c); ctx.lineTo(ix + iw - c, iy + ih); ctx.lineTo(ix + c, iy + ih);
            ctx.lineTo(ix, iy + ih - c); ctx.lineTo(ix, iy + c); ctx.closePath();
        };
        ctx.save();
        if (!low) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3; }
        path(x, y, w, h, cut); ctx.fillStyle = '#0a0709'; ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        const edge = ctx.createLinearGradient(x, y, x, y + h);
        edge.addColorStop(0, '#f0d58a'); edge.addColorStop(0.45, '#8c6a32'); edge.addColorStop(1, '#4a3418');
        path(x, y, w, h, cut); ctx.strokeStyle = edge; ctx.lineWidth = 1.6; ctx.stroke();
        const body = ctx.createLinearGradient(x, y, x, y + h);
        body.addColorStop(0, '#1b1419'); body.addColorStop(0.5, '#110c10'); body.addColorStop(1, '#0a0709');
        path(x + 3, y + 3, w - 6, h - 6, Math.max(2, cut - 3)); ctx.fillStyle = body; ctx.fill();
        ctx.strokeStyle = 'rgba(232,196,106,0.22)'; ctx.lineWidth = 1; ctx.stroke();
        if (ember > 0) {
            const glow = ember * (0.5 + 0.5 * Math.sin(now * 0.003 + x * 0.01));
            const g = ctx.createLinearGradient(0, y + h - 14, 0, y + h);
            g.addColorStop(0, 'rgba(190,60,40,0)'); g.addColorStop(1, 'rgba(210,80,50,' + (0.24 * glow) + ')');
            ctx.save(); path(x + 3, y + 3, w - 6, h - 6, Math.max(2, cut - 3)); ctx.clip();
            ctx.fillStyle = g; ctx.fillRect(x, y + h - 14, w, 14); ctx.restore();
        }
        ctx.fillStyle = '#e8c46a';
        for (const sx of [x + 5, x + w - 5]) for (const sy of [y + 5, y + h - 5]) {
            ctx.beginPath(); ctx.moveTo(sx, sy - 3); ctx.lineTo(sx + 3, sy); ctx.lineTo(sx, sy + 3); ctx.lineTo(sx - 3, sy); ctx.closePath(); ctx.fill();
        }
        if (o.horns) {
            const mx = x + w * 0.5;
            ctx.fillStyle = edge; ctx.beginPath();
            ctx.moveTo(mx - 24, y); ctx.lineTo(mx - 9, y - 9); ctx.lineTo(mx, y - 3); ctx.lineTo(mx + 9, y - 9); ctx.lineTo(mx + 24, y); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }

    // Horned end caps and a crown stud for the boss health bar
    function drawBarCaps(ctx, bx, y, w, h) {
        const gold = ctx.createLinearGradient(0, y - 6, 0, y + h + 6);
        gold.addColorStop(0, '#f0d58a'); gold.addColorStop(0.5, '#a07a3a'); gold.addColorStop(1, '#5a4120');
        ctx.save(); ctx.fillStyle = gold;
        for (const side of [-1, 1]) {
            const px = side < 0 ? bx - 3 : bx + w + 3;
            ctx.beginPath();
            ctx.moveTo(px, y - 6); ctx.lineTo(px + side * 11, y + h * 0.5);
            ctx.lineTo(px, y + h + 6); ctx.lineTo(px + side * 3, y + h * 0.5); ctx.closePath(); ctx.fill();
        }
        const mx = bx + w * 0.5;
        ctx.beginPath(); ctx.moveTo(mx, y - 8); ctx.lineTo(mx + 6, y - 3); ctx.lineTo(mx, y + 2); ctx.lineTo(mx - 6, y - 3); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function drawBossHPBar(ctx, x, y, w, h, ratio, ghost, bossName, isSlowed = false, opts = null) {
        const o = opts || {}, now = performance.now();
        const bar = getAttackBarState(o.attackId, ratio, 1);
        const elapsed = o.transitionElapsed || 0;
        const incoming = o.nextAttackId ? getAttackBarState(o.nextAttackId, 1, 1) : null;
        const fillIn = Math.max(0, Math.min(1, (elapsed - 0.18) / 0.82));
        const newRatio = fillIn * fillIn * (3 - 2 * fillIn);
        const low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
        const fo = typeof window !== 'undefined' ? window._fxOpts : null;
        const particles = !low && (!fo || fo.particles !== false);
        const flash = Math.min(1, o.hitFlash || 0), shake = o.heavyShake || 0;
        const bx = x + (fo?.reducedMotion ? 0 : Math.sin(now * 0.08) * shake * 3);
        ctx.save();
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.font = 'italic ' + getTitleFont(16, 700);
        ctx.fillStyle = DUEL_THEME.silver;
        ctx.fillText(bossName || '', x, y - 8);
        if (isSlowed) {
            ctx.font = getBodyFont(10, 700); ctx.fillStyle = '#a6edff';
            ctx.textAlign = 'right'; ctx.fillText(o.slowLabel || '', x + w, y - 8);
        }
        ctx.fillStyle = '#08050a'; ctx.fillRect(bx - 3, y - 3, w + 6, h + 6);
        ctx.strokeStyle = '#8c6a32'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 3, y - 3, w + 6, h + 6);
        ctx.strokeStyle = bar.color; ctx.globalAlpha = 0.55; ctx.lineWidth = 1; ctx.strokeRect(bx - 1, y - 1, w + 2, h + 2); ctx.globalAlpha = 1;
        const gradient = color => _bakeDuelBar(color);
        ctx.drawImage(gradient(bar.nextColor), bx, y, w, h);
        ctx.fillStyle = 'rgba(4,10,24,0.48)'; ctx.fillRect(bx, y, w, h);
        const fill = w * bar.ratio;
        ctx.fillStyle = '#fff0ca';
        ctx.fillRect(bx + fill, y, Math.max(0, Math.min(1, ghost) * w - fill), h);
        if (fill > 0) ctx.drawImage(gradient(bar.color), bx, y, fill, h);
        if (incoming && newRatio > 0) {
            ctx.drawImage(gradient(incoming.color), bx, y, w * newRatio, h);
            if (newRatio < 1) {
                ctx.fillStyle = '#fff6c9'; ctx.fillRect(bx + w * newRatio - 3, y, 3, h);
            }
        }
        if (incoming && particles && !fo?.reducedMotion && elapsed < .58) {
            const p = Math.max(0, elapsed / .58);
            ctx.save(); ctx.globalAlpha = (1 - p) * .88; ctx.strokeStyle = bar.color;
            for (let i = 0; i < 14; i++) {
                const x0 = bx + (i + .5) * w / 14;
                const dx = Math.sin(i * 2.4) * p * 23, dy = p * p * (28 + i % 4 * 7);
                ctx.fillStyle = i % 3 ? bar.color : '#fff3c9';
                ctx.beginPath(); ctx.moveTo(x0 + dx, y + dy);
                ctx.lineTo(x0 + dx + w / 22, y + dy + 5);
                ctx.lineTo(x0 + dx - w / 45, y + dy + 12); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }
        if (incoming && elapsed < 0.2) {
            ctx.globalAlpha = 0.7 * (1 - elapsed / 0.2);
            ctx.fillStyle = '#fff2cf'; ctx.fillRect(bx, y, w, h);
            ctx.globalAlpha = 1;
        }
        drawBarCaps(ctx, bx, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.fillRect(bx, y, fill, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(bx, y + h - 3, fill, 3);
        if (flash > 0) { ctx.globalAlpha = flash * 0.4; ctx.fillStyle = '#fff9df'; ctx.fillRect(bx, y, fill, h); ctx.globalAlpha = 1; }
        const release = Math.max(0, 1 - (o.attackElapsed || 0) / 0.4);
        if (!o.transition && release > 0) {
            const sweep = bx + (1 - release) * w;
            ctx.fillStyle = 'rgba(255,255,255,' + release * 0.7 + ')'; ctx.fillRect(sweep, y, 9, h);
        }
        const counter = incoming && elapsed >= 0.20 ? incoming : bar;
        if (counter.remaining > 0) {
            const bounce = fo?.reducedMotion ? 1 : 1 + Math.sin((1 - release) * Math.PI) * release * 0.25;
            const flip = incoming ? Math.max(0, 1 - Math.abs(elapsed - 0.20) / 0.20) : 0;
            ctx.save(); ctx.translate(x + w + 12, y + h * 0.5);
            ctx.scale(bounce, Math.max(0.03, (1 - flip) * bounce));
            ctx.fillStyle = counter.nextColor; ctx.font = getBodyFont(17, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('x' + counter.remaining, 0, 0); ctx.restore();
        }
        if (o.transition) {
            const p = o.transitionProgress || 0;
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = bar.color;
            ctx.globalAlpha = 0.75 * (1 - p * 0.65); ctx.lineWidth = 2;
            const n = fo && fo.particles === false ? 0 : (particles ? 20 : 6);
            for (let i = 0; i < n; i++) {
                const travel = (p * 2.2 + i * 0.37) % 1;
                const px = bx + (i + 0.5) / n * w, py = y + h * 0.5 + Math.sin(i * 2.4) * travel * 30;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (travel - 0.5) * 18, py - travel * 9); ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();
    }

    // Player lives rendered as crystal droplet facets with gold rims
    function drawLivesCrystals(ctx, x, y, lives, maxLives = 5) {
        ctx.save();
        const spacing = 16;
        for (let i = 0; i < maxLives; i++) {
            const cx = x + i * spacing + 6;
            const cy = y;
            const active = i < lives;

            ctx.save();
            ctx.translate(cx, cy);

            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(5, 0);
            ctx.lineTo(0, 7);
            ctx.lineTo(-5, 0);
            ctx.closePath();

            if (active) {
                const cryGrad = ctx.createLinearGradient(0, -7, 0, 7);
                cryGrad.addColorStop(0, DUEL_THEME.crimson);
                cryGrad.addColorStop(1, DUEL_THEME.crimsonDark);
                ctx.fillStyle = cryGrad;
                ctx.fill();

                ctx.strokeStyle = DUEL_THEME.gold;
                ctx.lineWidth = 1.2;
                ctx.stroke();

                // Inner facet reflection
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.lineTo(3, 0);
                ctx.lineTo(0, 5);
                ctx.lineTo(-3, 0);
                ctx.closePath();
                ctx.fillStyle = DUEL_THEME.whiteTranslucent;
                ctx.fill();
            } else {
                ctx.fillStyle = DUEL_THEME.bgPanel;
                ctx.fill();
                ctx.strokeStyle = DUEL_THEME.silverMuted;
                ctx.lineWidth = 1.0;
                ctx.stroke();
            }

            ctx.restore();
        }
        ctx.restore();
    }

    // Dedicated Shift Domain arc meter at screen corner
    function drawShiftDomainArc(ctx, cx, cy, radius = 28, chargeRatio = 1.0, isReady = true, labelText = '') {
        ctx.save();
        ctx.translate(cx, cy);

        // Arc bounds: -0.75 PI to +0.75 PI (270 degrees sweep)
        const startAng = -Math.PI * 0.75;
        const endAng = Math.PI * 0.75;
        const totalSweep = endAng - startAng;

        // Background track
        ctx.beginPath();
        ctx.arc(0, 0, radius, startAng, endAng);
        ctx.strokeStyle = DUEL_THEME.silverMuted;
        ctx.lineWidth = 3.0;
        ctx.stroke();

        // Active charge arc
        const safeCharge = Math.max(0, Math.min(1, chargeRatio));
        if (safeCharge > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, radius, startAng, startAng + totalSweep * safeCharge);
            ctx.strokeStyle = isReady ? DUEL_THEME.electric : DUEL_THEME.turquoiseDim;
            ctx.lineWidth = isReady ? 3.5 : 2.5;
            ctx.stroke();
        }

        // Center jewel icon
        if (isReady) {
            drawDiamondMark(ctx, 0, 0, 10);
        } else {
            ctx.fillStyle = DUEL_THEME.silverMuted;
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Label below meter
        if (labelText) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = getBodyFont(10, 700);
            ctx.fillStyle = isReady ? DUEL_THEME.electric : DUEL_THEME.silverDim;
            ctx.fillText(labelText, 0, radius + 8);
        }

        ctx.restore();
    }

    // Pre-bakes intricate rotating fantasy rune ring for boss
    function bakeBossRuneRing(radius = 80) {
        if (typeof document === 'undefined') return null;
        const size = Math.ceil((radius + 20) * 2);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const cx = size * 0.5;
        const cy = size * 0.5;

        // Concentric geometric circles
        ctx.strokeStyle = DUEL_THEME.bossTealRune;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = DUEL_THEME.electricDim;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = DUEL_THEME.turquoiseDim;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 8-point intersecting star squares
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = DUEL_THEME.goldSubtle;
        ctx.lineWidth = 1.0;
        const sqR = radius * 0.72;
        ctx.strokeRect(-sqR * 0.7, -sqR * 0.7, sqR * 1.4, sqR * 1.4);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-sqR * 0.7, -sqR * 0.7, sqR * 1.4, sqR * 1.4);
        ctx.restore();

        // 12 radial ticks
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = DUEL_THEME.bossTealRune;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 12; i++) {
            ctx.beginPath();
            ctx.moveTo(0, radius * 0.85);
            ctx.lineTo(0, radius);
            ctx.stroke();
            ctx.rotate(Math.PI / 6);
        }
        ctx.restore();

        // 4 cardinal diamond marks
        drawDiamondMark(ctx, cx + radius * 0.75, cy, 6);
        drawDiamondMark(ctx, cx - radius * 0.75, cy, 6);
        drawDiamondMark(ctx, cx, cy + radius * 0.75, 6);
        drawDiamondMark(ctx, cx, cy - radius * 0.75, 6);

        return canvas;
    }

    // Sleek non-darkening Phase Form Card shown at the end of evolution (boss remains bright and unobstructed)
    function drawPhaseFormCard(ctx, w, h, phaseNum, phaseTitleVi, phaseTitleEn, progress) {
        ctx.save();
        const p = Math.max(0, Math.min(1, progress));
        let slideY = 0;
        let alpha = 1.0;
        if (p < 0.20) {
            const u = 1 - Math.pow(1 - (p / 0.20), 3);
            slideY = (1 - u) * 26;
            alpha = u;
        } else if (p > 0.78) {
            const u = (p - 0.78) / 0.22;
            slideY = -u * 14;
            alpha = 1 - u;
        }
        if (alpha <= 0.01) { ctx.restore(); return; }

        const isP3 = phaseNum === 3;
        const accent = isP3 ? '#f2d98b' : '#42f5cc';
        const subCol = isP3 ? '#ff82a8' : '#b88aff';
        const cardW = Math.min(500, w * 0.56);
        const cardH = 88;
        const cx = (w - cardW) * 0.5;
        const cy = h * 0.44 + slideY;

        ctx.globalAlpha = alpha;
        drawFantasyPanel(ctx, cx, cy, cardW, cardH, 16, true, 4);

        const isVi = typeof window !== 'undefined' && ((window._getLocale && window._getLocale() === 'vi') || window._lang === 'vi');
        const mainTitle = isVi ? (phaseTitleVi || '') : (phaseTitleEn || phaseTitleVi || '');
        const phaseSub = isVi ? (isP3 ? 'GIAI ĐOẠN III' : 'GIAI ĐOẠN II') : (isP3 ? 'PHASE III' : 'PHASE II');

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = getTitleFont(24, 700);
        ctx.fillStyle = accent;
        ctx.fillText(mainTitle, w * 0.5, cy + 16);

        ctx.font = getBodyFont(12, 700);
        ctx.fillStyle = subCol;
        ctx.fillText(phaseSub, w * 0.5, cy + 54);
        ctx.restore();
    }

    // Player Shield HUD gauge: circular gauge with shield silhouette
    function drawPlayerShieldGauge(ctx, cx, cy, radius = 24, shieldActive = true, cooldownRatio = 1.0, labelText = '') {
        ctx.save();
        ctx.translate(cx, cy);

        // 1. Background circle
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = DUEL_THEME.silverMuted;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 2. Shield active or recharging
        if (shieldActive) {
            // Full cyan border with subtle glow
            ctx.strokeStyle = DUEL_THEME.shieldCyan;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Shield silhouette in center
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(8, -4);
            ctx.lineTo(8, 3);
            ctx.quadraticCurveTo(8, 9, 0, 11);
            ctx.quadraticCurveTo(-8, 9, -8, 3);
            ctx.lineTo(-8, -4);
            ctx.closePath();

            ctx.fillStyle = DUEL_THEME.shieldFill;
            ctx.fill();
            ctx.strokeStyle = DUEL_THEME.shieldCyan;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            // Recharging arc
            const safeRatio = Math.max(0, Math.min(1, cooldownRatio));
            if (safeRatio > 0) {
                const startAng = -Math.PI * 0.5;
                ctx.beginPath();
                ctx.arc(0, 0, radius, startAng, startAng + Math.PI * 2 * safeRatio);
                ctx.strokeStyle = DUEL_THEME.shieldCyan;
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            // Remaining seconds text in center
            const remainSec = Math.ceil(25 * (1.0 - safeRatio));
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = getBodyFont(11, 700);
            ctx.fillStyle = DUEL_THEME.silverDim;
            ctx.fillText(remainSec + 's', 0, 0);
        }

        // Label below gauge
        const text = labelText || 'SHIELD';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = getBodyFont(9, 700);
        ctx.fillStyle = shieldActive ? DUEL_THEME.shieldCyan : DUEL_THEME.silverDim;
        ctx.fillText(text, 0, radius + 6);

        ctx.restore();
    }

    // Skill F HUD gauge: circular gauge with F glyph
    function drawSkillFGauge(ctx, cx, cy, radius = 24, skillActive = false, cooldownRatio = 1.0, isCharging = false, chargeRatio = 0.0, labelText = '') {
        ctx.save();
        ctx.translate(cx, cy);

        // 1. Background circle
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = DUEL_THEME.silverMuted;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        const isReady = cooldownRatio >= 1.0 && !skillActive;

        // 2. Active, charging or cooldown arc
        if (isCharging) {
            // Pulsing charging sweep arc
            const startAng = -Math.PI * 0.5;
            const cRatio = Math.max(0, Math.min(1, chargeRatio));
            ctx.beginPath();
            ctx.arc(0, 0, radius, startAng, startAng + Math.PI * 2 * cRatio);
            ctx.strokeStyle = DUEL_THEME.goldBright;
            ctx.lineWidth = 3.0;
            ctx.stroke();
        } else if (isReady) {
            // Ready ring
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = DUEL_THEME.gold;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        } else {
            // Cooldown arc
            const safeRatio = Math.max(0, Math.min(1, cooldownRatio));
            if (safeRatio > 0) {
                const startAng = -Math.PI * 0.5;
                ctx.beginPath();
                ctx.arc(0, 0, radius, startAng, startAng + Math.PI * 2 * safeRatio);
                ctx.strokeStyle = DUEL_THEME.electricDim;
                ctx.lineWidth = 2.0;
                ctx.stroke();
            }
        }

        // 3. Center content
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isCharging) {
            ctx.font = getBodyFont(12, 700);
            ctx.fillStyle = DUEL_THEME.goldBright;
            ctx.fillText('F', 0, 0);
        } else if (isReady) {
            ctx.font = getBodyFont(13, 700);
            ctx.fillStyle = DUEL_THEME.goldBright;
            ctx.fillText('F', 0, 0);
        } else {
            const remainSec = Math.ceil(18 * (1.0 - Math.min(1, cooldownRatio)));
            ctx.font = getBodyFont(11, 700);
            ctx.fillStyle = DUEL_THEME.silverDim;
            ctx.fillText(remainSec + 's', 0, 0);
        }

        // Label below
        const text = labelText || 'SWEEP [F]';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = getBodyFont(9, 700);
        ctx.fillStyle = isReady ? DUEL_THEME.goldBright : DUEL_THEME.silverDim;
        ctx.fillText(text, 0, radius + 6);

        ctx.restore();
    }

    // Touch button for mobile viewports
    function drawSkillFTouchButton(ctx, x, y, size = 56, ready = true, charging = false, cooldownRatio = 1.0) {
        ctx.save();
        const half = size * 0.5;
        const cx = x + half;
        const cy = y + half;

        // Button background
        ctx.fillStyle = DUEL_THEME.navyBtn;
        ctx.beginPath();
        ctx.arc(cx, cy, half - 2, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.lineWidth = 2.0;
        if (charging) {
            ctx.strokeStyle = DUEL_THEME.goldBright;
        } else if (ready) {
            ctx.strokeStyle = DUEL_THEME.gold;
        } else {
            ctx.strokeStyle = DUEL_THEME.silverMuted;
        }
        ctx.stroke();

        // Cooldown sweep arc if recharging
        if (!ready && !charging) {
            const safeRatio = Math.max(0, Math.min(1, cooldownRatio));
            const startAng = -Math.PI * 0.5;
            ctx.beginPath();
            ctx.arc(cx, cy, half - 2, startAng, startAng + Math.PI * 2 * safeRatio);
            ctx.strokeStyle = DUEL_THEME.electric;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // Center F label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = getBodyFont(18, 700);
        ctx.fillStyle = ready ? DUEL_THEME.goldBright : DUEL_THEME.silverDim;
        ctx.fillText('F', cx, cy);

        ctx.restore();
    }

    // UiFxManager for juicy tactile squish feedback
    class UiFxManager {
        constructor() {
            this.states = new Map();
            this.globalSparks = [];
            this.lastHoverSoundTime = 0;
        }

        getState(id) {
            let st = this.states.get(id);
            if (!st) {
                st = {
                    hover: 0,
                    press: 0,
                    targetHover: 0,
                    targetPress: 0,
                    pressDownX: 0,
                    pressDownY: 0,
                    releaseT: 1.0,
                    shineProgress: 1.0,
                    ripples: [],
                    shake: { active: false, elapsed: 0, duration: 220, amp: 4, flashAlpha: 0 },
                    pop: { active: false, elapsed: 0, duration: 240, scale: 1.0 },
                    selected: false,
                    focus: false,
                    enterT: 0
                };
                this.states.set(id, st);
            }
            return st;
        }

        update(dt) {
            const dtSec = Math.max(0.001, Math.min(0.1, dt));
            const lowFx = typeof window !== 'undefined' && (
                (window._fxOpts && window._fxOpts.reducedMotion) ||
                (window._gfxLevel && window._gfxLevel === 'low') ||
                (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            );

            for (const [id, st] of this.states) {
                st.enterT += dtSec;

                // 1. Lerp hover: 140ms in, 180ms out
                const hoverRate = st.targetHover > st.hover ? (dtSec / 0.14) : (dtSec / 0.18);
                if (st.targetHover > st.hover) {
                    st.hover = Math.min(st.targetHover, st.hover + hoverRate);
                } else if (st.targetHover < st.hover) {
                    st.hover = Math.max(st.targetHover, st.hover - hoverRate);
                }

                // 2. Lerp press: 70ms pointerdown, 90ms release
                const pressRate = st.targetPress > st.press ? (dtSec / 0.07) : (dtSec / 0.09);
                if (st.targetPress > st.press) {
                    st.press = Math.min(st.targetPress, st.press + pressRate);
                } else if (st.targetPress < st.press) {
                    st.press = Math.max(st.targetPress, st.press - pressRate);
                }

                // 3. Release bounce overshoot: 180 to 220ms easeOutBack
                if (st.releaseT < 1.0) {
                    st.releaseT = Math.min(1.0, st.releaseT + dtSec / 0.12);
                }

                // 4. Diagonal shine sweep: 0.6s
                if (!lowFx && st.shineProgress < 1.0) {
                    st.shineProgress = Math.min(1.0, st.shineProgress + dtSec / 0.6);
                }

                // 5. Ripples: 380ms expanding ring
                if (!lowFx && st.ripples.length > 0) {
                    for (let i = st.ripples.length - 1; i >= 0; i--) {
                        const r = st.ripples[i];
                        r.elapsed += dtSec * 1000;
                        r.progress = Math.min(1.0, r.elapsed / 380);
                        if (r.progress >= 1.0) {
                            st.ripples.splice(i, 1);
                        }
                    }
                } else if (lowFx) {
                    st.ripples.length = 0;
                }

                // 6. Shake: 3 cycles, 4px amp in 220ms
                if (st.shake.active) {
                    st.shake.elapsed += dtSec * 1000;
                    const p = st.shake.elapsed / st.shake.duration;
                    if (p >= 1.0) {
                        st.shake.active = false;
                        st.shake.flashAlpha = 0;
                    } else {
                        st.shake.flashAlpha = Math.max(0, 1.0 - p);
                    }
                }

                // 7. Pop tick mark: 240ms (scale 0.6 to 1.15 to 1.0)
                if (st.pop.active) {
                    st.pop.elapsed += dtSec * 1000;
                    const p = st.pop.elapsed / st.pop.duration;
                    if (p >= 1.0) {
                        st.pop.active = false;
                        st.pop.scale = 1.0;
                    } else if (p < 0.45) {
                        const k = p / 0.45;
                        st.pop.scale = 0.6 + 0.55 * k;
                    } else {
                        const k = (p - 0.45) / 0.55;
                        st.pop.scale = 1.15 - 0.15 * k;
                    }
                }
            }

            // Global sparks pool (maximum 16 particles)
            if (!lowFx && this.globalSparks.length > 0) {
                for (let i = this.globalSparks.length - 1; i >= 0; i--) {
                    const sp = this.globalSparks[i];
                    sp.life -= dtSec;
                    if (sp.life <= 0) {
                        this.globalSparks.splice(i, 1);
                    } else {
                        sp.x += sp.vx * dtSec;
                        sp.y += sp.vy * dtSec;
                        sp.alpha = Math.max(0, sp.life / sp.maxLife);
                    }
                }
            } else if (lowFx) {
                this.globalSparks.length = 0;
            }
        }

        onPointerMove(id, isInside) {
            const st = this.getState(id);
            const wasHover = st.targetHover > 0.5;
            st.targetHover = isInside ? 1.0 : 0.0;
            if (isInside && !wasHover) {
                st.shineProgress = 0.0;
                this.playHoverSoundThrottled(id);
            }
        }

        onPointerDown(id, x, y) {
            const st = this.getState(id);
            st.targetPress = 1.0;
            st.pressDownX = x;
            st.pressDownY = y;
            this.playClickSound(id);
        }

        onPointerUp(id, isInside) {
            const st = this.getState(id);
            const wasPressed = st.targetPress > 0.5;
            st.targetPress = 0.0;
            if (wasPressed && isInside) {
                st.releaseT = 0.0;
                if (st.ripples.length < 3) {
                    st.ripples.push({
                        x: st.pressDownX || 0,
                        y: st.pressDownY || 0,
                        elapsed: 0,
                        progress: 0
                    });
                }
                return true;
            }
            return false;
        }

        triggerLockShake(id) {
            const st = this.getState(id);
            st.shake.active = true;
            st.shake.elapsed = 0;
            this.playFailSound();
        }

        triggerSelectPop(id, cx, cy) {
            const st = this.getState(id);
            st.pop.active = true;
            st.pop.elapsed = 0;
            st.pop.scale = 0.6;
            this.playConfirmSound(id);

            const sparkCount = 7;
            for (let i = 0; i < sparkCount; i++) {
                if (this.globalSparks.length >= 16) {
                    this.globalSparks.shift();
                }
                const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.4;
                const speed = 40 + Math.random() * 50;
                this.globalSparks.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.28,
                    maxLife: 0.28,
                    alpha: 1.0,
                    size: 2.0 + Math.random() * 1.5
                });
            }
        }

        getTransform(id, isCard = false) {
            const st = this.getState(id);
            const hoverLift = isCard ? -3.0 : -2.0;
            const currentHoverY = isCard ? hoverLift * st.hover : 0;
            const currentPressY = 3.0 * st.press;
            const totalTranslateY = currentHoverY + currentPressY;

            const pressScaleTarget = isCard ? 0.985 : 1;
            let scale = 1.0 - (1.0 - pressScaleTarget) * st.press;

            if (st.releaseT < 1.0 && !window._fxOpts?.reducedMotion) {
                const p = st.releaseT;
                scale += 0.03 * Math.sin((1.0 - p) * Math.PI);
            }

            let shakeX = 0;
            if (st.shake.active) {
                const p = st.shake.elapsed / st.shake.duration;
                shakeX = Math.sin(p * Math.PI * 6) * st.shake.amp * (1.0 - p);
            }

            return {
                translateY: totalTranslateY,
                scale,
                shakeX,
                hover: st.hover,
                press: st.press,
                shineProgress: st.shineProgress,
                ripples: st.ripples,
                flashAlpha: st.shake.flashAlpha,
                popScale: st.pop.active ? st.pop.scale : 1.0
            };
        }

        drawSparks(ctx) {
            if (this.globalSparks.length === 0) return;
            ctx.save();
            for (let i = 0; i < this.globalSparks.length; i++) {
                const sp = this.globalSparks[i];
                ctx.fillStyle = DUEL_THEME.goldBright;
                ctx.globalAlpha = sp.alpha;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        playHoverSoundThrottled(id) {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (now - this.lastHoverSoundTime > 80) {
                this.lastHoverSoundTime = now;
                if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
                    try {
                        window.AudioMgr.playSfx(/^weap/.test(id || '') ? 'ui-weapon-hover' : 'ui-card-hover');
                    } catch (e) {}
                }
            }
        }

        playClickSound(id) {
            if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
                try {
                    window.AudioMgr.playSfx(/back|close/.test(id || '') ? 'ui-back' : 'ui-card-select');
                } catch (e) {}
            }
        }

        playConfirmSound(id) {
            if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
                try {
                    const s = window._duelSession;
                    const weapon = s?.weaponPicker?.weapons[s.weaponPicker.selectedIndex];
                    const names = { spear: 'spear', sword: 'sword', halberd: 'axe', dagger_array: 'phantom', heavy_lance: 'titan' };
                    window.AudioMgr.playSfx(/^weap/.test(id || '') ? 'ui-weapon-select-' + (names[weapon?.id] || 'sword') : 'ui-card-select');
                } catch (e) {}
            }
        }

        playFailSound() {
            if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
                try {
                    window.AudioMgr.playSfx('ui-locked');
                } catch (e) {}
            }
        }
    }

    const uiFx = new UiFxManager();

    // Preloads web fonts in browser context
    function preloadFonts() {
        if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.load === 'function') {
            document.fonts.load('700 20px Cinzel').catch(function () {});
            document.fonts.load('700 20px "Playfair Display"').catch(function () {});
            document.fonts.load('400 14px "Segoe UI"').catch(function () {});
        }
    }

    // Trigger preloading immediately if available
    preloadFonts();

    return {
        DUEL_THEME,
        getTitleFont,
        getBodyFont,
        panelPath,
        drawFantasyPanel,
        drawObsidianPlate,
        drawFantasyButton,
        drawDuelSelectionPanel,
        drawDiamondMark,
        drawGradientDivider,
        drawOrnamentalLock,
        drawBossHPBar,
        getAttackBarState,
        ATTACK_BAR_COLORS,
        drawLivesCrystals,
        drawShiftDomainArc,
        drawPhaseFormCard,
        drawPlayerShieldGauge,
        drawSkillFGauge,
        drawSkillFTouchButton,
        bakeBossRuneRing,
        UiFxManager,
        uiFx,
        preloadFonts
    };
});
