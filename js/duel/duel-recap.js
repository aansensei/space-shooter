// Pisces: Space Journey. Showdown Voyage Recap Screen.
// End of duel match review showing stats, rank, attack breakdown, and timeline.

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.DuelRecap = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const I18N = {
        en: {
            titleVictory: 'Egregor Overmind Defeated',
            titleDefeat: 'Defeat',
            titleAbandoned: 'Showdown Abandoned',
            subtitle: 'Showdown Log',
            opponentLabel: 'Opponent: Egregor the Overmind',
            difficultyLabel: 'Difficulty: Hard',
            tabOverview: 'Overview',
            tabHits: 'Hits Taken',
            tabTimeline: 'Timeline',
            metricTime: 'Battle Time',
            metricScore: 'Total Score',
            metricRank: 'Rank Stamp',
            metricClears: 'Attacks Cleared',
            metricLives: 'Lives Left',
            metricShield: 'Shield Absorptions',
            metricGraze: 'Graze Count',
            metricShifts: 'Shifts Used',
            metricSkillF: 'Skill F Uses',
            scoreBreakdownTitle: 'Score Breakdown',
            scoreWinBonus: 'Victory Conquest Bonus',
            scoreAttackBonus: 'Attacks Cleared Bonus',
            scoreTimeBonus: 'Swift Clearance Bonus',
            scoreCleanBonus: 'Flawless Attack Bonus',
            scoreLivesPenalty: 'Lives Lost Penalty',
            scoreShieldPenalty: 'Shield Depletion Penalty',
            scoreGrazeBonus: 'Graze Focus Bonus',
            btnPlayAgain: 'Fight Again',
            btnMainMenu: 'Main Menu',
            practiceTitleVictory: 'Practice Complete',
            practiceTitleDefeat: 'Practice Failed',
            hitsByAttackTitle: 'Hits Received by Attack',
            hitsByCauseTitle: 'Hits by Threat Type',
            threatBullet: 'Danmaku Bullets',
            threatLaser: 'Dimensional Lasers',
            threatTempest: 'Tempest Lightning',
            threatNullSlash: 'Null Slash Sweeps',
            threatRift: 'Spacetime Rifts'
        },
        vi: {
            titleVictory: 'Egregor: Thống Lĩnh Tâm Trí Đã Bị Hạ Gục',
            titleDefeat: 'Thất Bại',
            titleAbandoned: 'Bỏ Dở Quyết Chiến',
            subtitle: 'Nhật Ký Quyết Chiến',
            opponentLabel: 'Đối Thủ: Egregor Thống Lĩnh Tâm Trí',
            difficultyLabel: 'Độ Khó: Khó',
            tabOverview: 'Tổng Quan',
            tabHits: 'Đòn Đã Trúng',
            tabTimeline: 'Diễn Biến',
            metricTime: 'Thời Gian Giao Chiến',
            metricScore: 'Tổng Điểm',
            metricRank: 'Ấn Xếp Hạng',
            metricClears: 'Chiêu Đã Vượt',
            metricLives: 'Mạng Còn Lại',
            metricShield: 'Số Lần Khiên Đỡ',
            metricGraze: 'Số Lần Sượt Đạn',
            metricShifts: 'Số Lần Dịch Chuyển',
            metricSkillF: 'Số Lần Quét [F]',
            scoreBreakdownTitle: 'Chi Tiết Điểm Số',
            scoreWinBonus: 'Thưởng Chiến Thắng',
            scoreAttackBonus: 'Thưởng Chiêu Đã Vượt',
            scoreTimeBonus: 'Thưởng Tốc Chiến',
            scoreCleanBonus: 'Thưởng Chiêu Không Trúng Đòn',
            scoreLivesPenalty: 'Phạt Mất Mạng',
            scoreShieldPenalty: 'Phạt Vỡ Khiên',
            scoreGrazeBonus: 'Thưởng Sượt Đạn',
            btnPlayAgain: 'Đấu Lại',
            btnMainMenu: 'Về Menu Chính',
            practiceTitleVictory: 'Luyện Tập Thành Công',
            practiceTitleDefeat: 'Luyện Tập Thất Bại',
            hitsByAttackTitle: 'Đòn Trúng Theo Từng Chiêu',
            hitsByCauseTitle: 'Đòn Trúng Theo Loại Hiểm Họa',
            threatBullet: 'Đạn Mạc',
            threatLaser: 'Tia Vị Diện',
            threatTempest: 'Lôi Điện Phong Bạo',
            threatNullSlash: 'Đường Quét Hư Vô Trảm',
            threatRift: 'Vị Diện Liệt Phùng'
        }
    };

    function t(key, lang) {
        const dict = I18N[lang] || I18N.en;
        return dict[key] || I18N.en[key] || key;
    }

    function calculateScore(data) {
        const stats = data.stats || {};
        const isWin = data.outcome === 'victory';
        const clearedList = (stats.clearedAttacks && stats.clearedAttacks.length > 0) ? stats.clearedAttacks : (data.clearedAttacks || []);
        const clearedCount = clearedList.length;
        const timeSec = stats.timeSec || 0;
        const livesStart = 8;
        const livesRemaining = stats.livesRemaining !== undefined ? stats.livesRemaining : 8;
        const livesLost = Math.max(0, livesStart - livesRemaining);
        const shieldBreaks = stats.shieldBreaks || 0;
        const grazeCount = stats.grazeCount || 0;

        let cleanCount = 0;
        for (let i = 0; i < clearedList.length; i++) {
            if (clearedList[i].clean) cleanCount++;
        }

        const winBonus = isWin ? 100000 : 0;
        const attackBonus = clearedCount * 2000;
        const timeBonus = isWin && timeSec < 660 ? Math.round(20000 * Math.max(0, 1.0 - timeSec / 660)) : 0;
        const cleanBonus = cleanCount * 1500;
        const livesPenalty = livesLost * 1500;
        const shieldPenalty = shieldBreaks * 400;
        const grazeBonus = Math.min(5000, grazeCount * 10);

        const totalScore = Math.max(0, winBonus + attackBonus + timeBonus + cleanBonus + grazeBonus - livesPenalty - shieldPenalty);

        let rank = 'D';
        if (isWin) {
            if (totalScore >= 140000) rank = 'S';
            else if (totalScore >= 115000) rank = 'A';
            else if (totalScore >= 90000) rank = 'B';
            else if (totalScore >= 60000) rank = 'C';
        }

        return {
            totalScore: totalScore,
            rank: rank,
            winBonus: winBonus,
            attackBonus: attackBonus,
            timeBonus: timeBonus,
            cleanBonus: cleanBonus,
            cleanCount: cleanCount,
            livesPenalty: livesPenalty,
            livesLost: livesLost,
            shieldPenalty: shieldPenalty,
            shieldBreaks: shieldBreaks,
            grazeBonus: grazeBonus,
            grazeCount: grazeCount,
            clearedCount: clearedCount,
            timeSec: timeSec
        };
    }

    let _overlayEl = null;
    let _activeData = null;
    let _onPlayAgainCb = null;
    let _onMainMenuCb = null;
    let _activeTab = 'overview';
    let _animStartTime = 0;
    let _rafId = null;

    // Ending screen: the Voyage Recap presentation fed with the figures of the duel.
    const SD_PHASE_NAMES = {
        en: ['The Slumbering Elder', 'Descent of Ten Thoughts', 'Voidword of the Final End'],
        vi: ['Thâm Miên Cổ Thần', 'Thập Niệm Giáng Thế', 'Chung Yên Hư Ngôn']
    };
    const SD_CAUSE_NAMES = {
        bullet: { en: 'Enemy bullets', vi: 'Đạn địch' },
        laser: { en: 'Eye beams', vi: 'Tia mắt' },
        tempest: { en: 'Tempest', vi: 'Tâm Linh Phong Bạo' },
        upheaval: { en: 'Earthen Tentacle Upheaval', vi: 'Địa Xúc Hất Thiên' },
        null_slash: { en: 'Null Slash', vi: 'Hư Vô Trảm' },
        rift: { en: 'Dimensional Rift', vi: 'Vị Diện Liệt Phùng' },
        gap_bar: { en: 'Void Horizon', vi: 'Hư Không Hoành Tuyến' },
        crush: { en: 'Falling Monolith', vi: 'Cự Trụ Giáng Thế' },
        tendril: { en: 'Tendril lash', vi: 'Xúc Tu Quất' },
        cube: { en: 'Thought sphere', vi: 'Niệm Cầu' },
        sphere: { en: 'Thought sphere', vi: 'Niệm Cầu' }
    };
    const SD_LABELS = {
        en: {
            rcAstralSub: 'Showdown Log',
            rcScoreSub: 'Total score of the fight',
            rcRank: 'Rank',
            rcQuitLine: 'Withdrew from the showdown mid fight',
            rcWave: 'Attacks Cleared',
            rcWaveSub: 'Out of 18 attacks',
            rcTime: 'Battle Time',
            rcTimeSub: 'Time in battle',
            rcSigilTitle: 'Attack Constellation',
            rcSigilSub: 'Eighteen attacks across three forms',
            rcEmptySigils: 'No attack was cleared',
            rcKillsTitle: 'Attacks by Form',
            rcKillsSub: 'How far you got in each form',
            rcKillsTotalLabel: 'Attacks cleared',
            rcEmptyKills: 'No attack was cleared',
            rcAnalysisTitle: 'Showdown Statistics',
            rcAnalysisSub: 'Damage dealt, hits taken and lives lost',
            rcTabAlly: 'Damage Dealt',
            rcTabEnemy: 'Hits Taken',
            rcTabLives: 'Lives Lost',
            rcEmptyStats: 'Nothing recorded here yet',
            rcEmptyTimeline: 'The fight was too short to chart',
            rcTimelineTitle: 'Battle Timeline',
            rcTimelineSub: 'Every 5 seconds, with a 30 second moving average',
            rcLegOutput: 'Damage dealt (5s)',
            rcLegMa: 'Moving average (30s)',
            rcLegTaken: 'Hits taken',
            rcLegWave: 'Attack and form marks',
            rcSumDps: 'Damage per second',
            rcSumPeak: 'Peak damage (5s)',
            rcSumMvp: 'Strongest form',
            rcSumTop3: 'Share of the top form',
            rcBtnPlayAgain: 'Fight Again',
            rcBtnMainMenu: 'Main Menu',
            rcLivesLostBadge: 'Lost {lost} of {start} lives'
        },
        vi: {
            rcAstralSub: 'Nhật Ký Quyết Chiến',
            rcScoreSub: 'Tổng điểm của trận đấu',
            rcRank: 'Hạng',
            rcQuitLine: 'Rút lui khỏi trận quyết chiến giữa chừng',
            rcWave: 'Chiêu Đã Vượt',
            rcWaveSub: 'Trên tổng số 18 chiêu',
            rcTime: 'Thời Gian Chiến Đấu',
            rcTimeSub: 'Thời gian giao chiến',
            rcSigilTitle: 'Chòm Sao Chiêu Thức',
            rcSigilSub: 'Mười tám chiêu thức qua ba hình thái',
            rcEmptySigils: 'Chưa vượt được chiêu nào',
            rcKillsTitle: 'Chiêu Thức Theo Hình Thái',
            rcKillsSub: 'Bạn đã đi được tới đâu trong từng hình thái',
            rcKillsTotalLabel: 'Chiêu đã vượt',
            rcEmptyKills: 'Chưa vượt được chiêu nào',
            rcAnalysisTitle: 'Thống Kê Quyết Chiến',
            rcAnalysisSub: 'Sát thương gây ra, đòn bị trúng và số mạng đã mất',
            rcTabAlly: 'Sát Thương Gây Ra',
            rcTabEnemy: 'Đòn Bị Trúng',
            rcTabLives: 'Mạng Đã Mất',
            rcEmptyStats: 'Chưa có số liệu ở mục này',
            rcEmptyTimeline: 'Trận đấu quá ngắn để vẽ diễn biến',
            rcTimelineTitle: 'Diễn Biến Trận Đấu',
            rcTimelineSub: 'Mỗi 5 giây, kèm đường trung bình 30 giây',
            rcLegOutput: 'Sát thương gây ra (5s)',
            rcLegMa: 'Trung bình trượt (30 giây)',
            rcLegTaken: 'Đòn bị trúng',
            rcLegWave: 'Mốc chiêu thức và hình thái',
            rcSumDps: 'Sát thương mỗi giây',
            rcSumPeak: 'Đỉnh sát thương (5s)',
            rcSumMvp: 'Hình thái mạnh nhất',
            rcSumTop3: 'Tỉ trọng hình thái đứng đầu',
            rcBtnPlayAgain: 'Đấu Lại',
            rcBtnMainMenu: 'Về Menu Chính',
            rcLivesLostBadge: 'Mất {lost} trên {start} mạng'
        }
    };

    function buildShowdownRecapData(data, lang) {
        const stats = data.stats || {};
        const isWin = data.outcome === 'victory';
        const sc = calculateScore(data);
        const defs = (window.DuelAttacks && window.DuelAttacks.ATTACK_DEFS) || {};
        const phaseNames = SD_PHASE_NAMES[lang] || SD_PHASE_NAMES.en;
        const L = Object.assign({}, SD_LABELS.en, SD_LABELS[lang] || {});
        const clearedList = (stats.clearedAttacks && stats.clearedAttacks.length) ? stats.clearedAttacks : [];
        const clearedMap = {};
        for (let i = 0; i < clearedList.length; i++) clearedMap[clearedList[i].attackId] = clearedList[i];

        let failedId = 0;
        if (!isWin) {
            if (data.isPractice && data.practiceAttackId) failedId = data.practiceAttackId;
            else for (let id = 1; id <= 18; id++) { if (!clearedMap[id]) { failedId = id; break; } }
        }
        const attacks = [];
        const phaseTotals = [0, 0, 0], phaseCleared = [0, 0, 0], phaseDamage = [0, 0, 0];
        const dmgByAttack = stats.damageByAttack || {};
        for (let id = 1; id <= 18; id++) {
            const def = defs[id] || { phase: id <= 6 ? 1 : (id <= 13 ? 2 : 3), name: 'Attack ' + id, baseHp: 0 };
            const ph = Math.max(1, Math.min(3, def.phase || 1));
            const c = clearedMap[id];
            attacks.push({ id: id, phase: ph, cleared: !!c, clean: !!(c && c.clean), failed: id === failedId });
            phaseTotals[ph - 1]++;
            if (c) phaseCleared[ph - 1]++;
            phaseDamage[ph - 1] += (dmgByAttack[id] !== undefined) ? dmgByAttack[id] : (c ? (def.baseHp || 0) : 0);
        }

        const dmgMap = {}, killMap = {}, causeMap = {}, lifeMap = {};
        for (let i = 0; i < 3; i++) {
            if (phaseDamage[i] > 0) dmgMap[phaseNames[i]] = Math.round(phaseDamage[i]);
            if (phaseCleared[i] > 0) killMap[phaseNames[i]] = phaseCleared[i];
        }
        const hc = stats.hitsByCause || {};
        for (const k in hc) {
            if (hc[k] > 0) { const nm = SD_CAUSE_NAMES[k]; causeMap[nm ? (nm[lang] || nm.en) : k] = hc[k]; }
        }
        const ha = stats.hitsByAttack || {};
        for (const k in ha) {
            if (ha[k] > 0) { const def = defs[k]; lifeMap['A' + k + (def && lang !== 'vi' ? ' ' + def.name : '')] = ha[k]; }
        }

        const weaponId = (typeof data.weapon === 'object' && data.weapon) ? (data.weapon.id || data.weapon.name) : (data.weapon || 'sword');
        const weaponNames = {
            sword: { en: 'Celestial Blade', vi: 'Thanh Kiếm Thiên Hà' }, blade: { en: 'Celestial Blade', vi: 'Thanh Kiếm Thiên Hà' },
            spear: { en: 'Void Piercer', vi: 'Ngọn Giáo Hư Không' }, halberd: { en: 'Eclipse Cleaver', vi: 'Lưỡi Kích Nhật Thực' },
            dagger_array: { en: 'Phantom Blades', vi: 'Bộ Phi Đao Bóng Ma' }, heavy_lance: { en: 'Titan Greatlance', vi: 'Chiến Thương Cự Thần' },
            lance: { en: 'Titan Greatlance', vi: 'Chiến Thương Cự Thần' }
        };
        const wn = weaponNames[weaponId] || weaponNames.sword;
        const oppName = lang === 'vi' ? 'Egregor: Thống Lĩnh Tâm Trí' : 'Egregor the Overmind';
        const pills = [
            { name: wn.en, vi: wn.vi, color: '#00E5FF', tag: '' },
            { name: oppName, vi: oppName, color: '#B68AFF', tag: '' },
            { name: 'Hard', vi: 'Khó', color: '#FF8A5C', tag: '' },
            { name: 'Rank ' + sc.rank, vi: 'Hạng ' + sc.rank, color: '#E8C46A', tag: '' }
        ];

        const causeKey = stats.lastCause;
        const causeNm = causeKey && SD_CAUSE_NAMES[causeKey] ? (SD_CAUSE_NAMES[causeKey][lang] || SD_CAUSE_NAMES[causeKey].en) : (causeKey || '');
        let epitaphHtml;
        if (isWin) {
            epitaphHtml = '<span class="rc-epitaph-cause">' + oppName + '</span> ' + (lang === 'vi' ? 'đã gục ngã' : 'has fallen');
        } else if (data.quit) {
            epitaphHtml = lang === 'vi' ? 'Rút khỏi trận quyết chiến giữa chừng' : 'Withdrew from the showdown mid fight';
        } else if (causeNm) {
            epitaphHtml = (lang === 'vi' ? 'Gục trước ' : 'Felled by ') + '<span class="rc-epitaph-cause">' + causeNm + '</span>';
        } else {
            epitaphHtml = lang === 'vi' ? 'Hành trình dừng lại giữa chừng' : 'The showdown ended early';
        }

        const labels = { en: Object.assign({}, SD_LABELS.en), vi: Object.assign({}, SD_LABELS.vi) };
        const title = isWin
            ? { en: 'Egregor Has Fallen', vi: 'Egregor Đã Gục Ngã' }
            : (data.isPractice ? { en: 'Practice Ended', vi: 'Buổi Luyện Tập Kết Thúc' } : { en: "Showdown's End", vi: 'Hồi Kết Quyết Chiến' });
        labels.en.rcTitle = title.en; labels.vi.rcTitle = title.vi;
        if (data.isPractice) { labels.en.rcAstralSub = 'Practice Log'; labels.vi.rcAstralSub = 'Nhật Ký Luyện Tập'; }

        return {
            variant: 'showdown',
            outcome: data.outcome,
            labels: labels,
            score: sc.totalScore,
            rank: sc.rank,
            rankBands: [0, 60000, 90000, 115000, 140000, 170000],
            rankCap: !isWin,
            wave: sc.clearedCount,
            timeMs: (stats.timeSec || 0) * 1000,
            livesStart: 8,
            livesLost: sc.livesLost,
            cause: causeNm,
            epitaphHtml: epitaphHtml,
            quit: data.quit === true,
            sigils: pills,
            attacks: attacks,
            phaseNames: ['I', 'II', 'III'],
            kills: { total: sc.clearedCount, byType: killMap },
            matchStats: { allyDamage: dmgMap, enemyDamage: causeMap, lifeLoss: lifeMap },
            timeline: stats.dmgBuckets || [],
            wavePrefix: 'A',
            bossWaves: [6, 13, 18]
        };
    }

    let _showdownRecapOpen = false;

    function openDuelRecap(data, onPlayAgain, onMainMenu) {
        closeDuelRecap();

        if (typeof window !== 'undefined' && typeof window._openShowdownRecap === 'function') {
            try {
                const sdLang = (window._lang === 'vi') ? 'vi' : 'en';
                _showdownRecapOpen = true;
                window._openShowdownRecap(buildShowdownRecapData(data, sdLang), onPlayAgain, onMainMenu);
                return;
            } catch (e) {
                _showdownRecapOpen = false;
                console.warn('[Duel] Voyage Recap failed, using the plain result panel', e);
            }
        }

        _activeData = data;
        _onPlayAgainCb = onPlayAgain;
        _onMainMenuCb = onMainMenu;
        _activeTab = 'overview';
        _animStartTime = performance.now();

        const lang = (typeof window !== 'undefined' && window._lang === 'vi') ? 'vi' : 'en';
        const scoreData = calculateScore(data);

        _overlayEl = document.createElement('div');
        _overlayEl.id = 'duelRecapOverlay';
        _overlayEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 6%,rgba(60,25,72,0.88),rgba(5,8,24,0.96) 64%),#080611;overflow-y:auto;overflow-x:hidden;font-family:"Segoe UI",system-ui,sans-serif;color:#DCE8F5;display:flex;flex-direction:column;align-items:center;padding:24px 16px;box-sizing:border-box;';

        const isWin = data.outcome === 'victory';
        const isPractice = !!data.isPractice;
        const titleText = isPractice ? (isWin ? t('practiceTitleVictory', lang) : t('practiceTitleDefeat', lang)) : (isWin ? t('titleVictory', lang) : t('titleDefeat', lang));
        const titleColor = isWin ? '#F2D98B' : '#FF4D6D';

        const weaponId = (typeof data.weapon === 'object' && data.weapon) ? (data.weapon.id || data.weapon.name) : (data.weapon || 'lance');
        const weaponNames = {
            'sword': { en: 'Celestial Blade', vi: 'Thanh Kiếm Thiên Hà' },
            'blade': { en: 'Celestial Blade', vi: 'Thanh Kiếm Thiên Hà' },
            'spear': { en: 'Void Piercer', vi: 'Ngọn Giáo Hư Không' },
            'halberd': { en: 'Eclipse Cleaver', vi: 'Lưỡi Kích Nhật Thực' },
            'dagger_array': { en: 'Phantom Blades', vi: 'Bộ Phi Đao Bóng Ma' },
            'heavy_lance': { en: 'Titan Greatlance', vi: 'Chiến Thương Cự Thần' },
            'lance': { en: 'Titan Greatlance', vi: 'Chiến Thương Cự Thần' }
        };
        const wInfo = weaponNames[weaponId] || { en: 'Celestial Blade', vi: 'Thanh Kiếm Thiên Hà' };
        const weaponName = lang === 'vi' ? wInfo.vi : wInfo.en;
        // Showdown mode is always Hard difficulty
        const diffText = lang === 'vi' ? 'Độ Khó: Khó' : 'Difficulty: Hard';

        let contentHtml = '';
        contentHtml += '<div style="max-width:960px;width:100%;display:flex;flex-direction:column;align-items:center;position:relative;margin:auto 0;">';

        // Header Title
        contentHtml += '<div style="text-align:center;margin-bottom:18px;">';
        contentHtml += '<div style="font-size:12px;letter-spacing:4px;color:#8CA6C6;margin-bottom:6px;text-transform:uppercase;">' + t('subtitle', lang) + '</div>';
        contentHtml += '<h1 style="font-family:' + (lang === 'vi' ? "'Playfair Display',Georgia,serif" : "'Cinzel','Playfair Display',Georgia,serif") + ';font-size:32px;color:' + titleColor + ';margin:0 0 8px 0;letter-spacing:2px;text-shadow:0 0 20px rgba(232,196,106,0.4);">' + titleText.toUpperCase() + '</h1>';
        contentHtml += '<div style="font-size:13px;color:#8CA6C6;letter-spacing:1.5px;">' + t('opponentLabel', lang) + ' &nbsp;|&nbsp; ' + weaponName + ' &nbsp;|&nbsp; ' + diffText + '</div>';
        contentHtml += '</div>';

        // Navigation Tabs
        contentHtml += '<div style="display:flex;gap:12px;margin-bottom:24px;">';
        contentHtml += '<button id="drTabOverview" style="padding:10px 24px;border-radius:6px;background:rgba(0,40,70,0.85);border:1.5px solid #00E5FF;color:#00E5FF;font-weight:600;font-size:13px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;">' + t('tabOverview', lang) + '</button>';
        contentHtml += '<button id="drTabHits" style="padding:10px 24px;border-radius:6px;background:rgba(8,20,40,0.7);border:1px solid #8CA6C6;color:#8CA6C6;font-weight:600;font-size:13px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;">' + t('tabHits', lang) + '</button>';
        contentHtml += '<button id="drTabTimeline" style="padding:10px 24px;border-radius:6px;background:rgba(8,20,40,0.7);border:1px solid #8CA6C6;color:#8CA6C6;font-weight:600;font-size:13px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;">' + t('tabTimeline', lang) + '</button>';
        contentHtml += '</div>';

        // Tab Content Container
        contentHtml += '<div id="drTabContent" style="width:100%;"></div>';

        // Bottom Action Buttons: Main Menu on left, Fight Again on right
        contentHtml += '<div style="display:flex;justify-content:center;gap:24px;margin:16px 0 18px;width:100%;max-width:540px;">';
        contentHtml += '<button id="drBtnMainMenu" style="flex:1;padding:12px 20px;border-radius:6px;background:rgba(10,24,48,0.9);border:1px solid #8CA6C6;color:#DCE8F5;font-weight:700;font-size:13px;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase;transition:all 140ms ease;">' + t('btnMainMenu', lang) + '</button>';
        contentHtml += '<button id="drBtnPlayAgain" style="flex:1;padding:12px 20px;border-radius:6px;background:rgba(0,40,70,0.9);border:1.5px solid #E8C46A;color:#F2D98B;font-weight:700;font-size:13px;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase;transition:all 140ms ease;box-shadow:0 0 16px rgba(232,196,106,0.3);">' + t('btnPlayAgain', lang) + '</button>';
        contentHtml += '</div>';

        contentHtml += '</div>';
        _overlayEl.innerHTML = contentHtml;
        
        const animStyleEl = document.createElement('style');
        animStyleEl.textContent = ''
            + '@keyframes drFadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }'
            + '@keyframes drRankStamp { 0% { opacity: 0; transform: scale(2.1) rotate(-8deg); } 70% { opacity: 1; transform: scale(0.92) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }'
            + '#duelRecapOverlay { animation: drFadeSlideUp 320ms cubic-bezier(0.22, 1, 0.36, 1) both; }'
            + '#duelRecapOverlay .dr-stagger-1 { animation: drFadeSlideUp 360ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both; }'
            + '#duelRecapOverlay .dr-stagger-2 { animation: drFadeSlideUp 360ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both; }'
            + '#duelRecapOverlay .dr-stagger-3 { animation: drFadeSlideUp 360ms cubic-bezier(0.22, 1, 0.36, 1) 340ms both; }'
            + '#duelRecapOverlay .dr-rank-stamp { animation: drRankStamp 520ms cubic-bezier(0.34, 1.56, 0.64, 1) 240ms both; }'
            + '@media (max-height:620px) { #duelRecapOverlay { padding-top:12px !important; padding-bottom:7px !important; } #drTabContent > div { margin-bottom:10px !important; } }'
            + '#drTabContent > div > div { box-shadow: inset 0 1px rgba(255,222,180,.16), 0 8px 24px rgba(3,2,17,.35); }'
            + '@media (prefers-reduced-motion:reduce) { #duelRecapOverlay, #duelRecapOverlay * { animation:none !important; } }'
            + '#duelRecapOverlay button:hover { transform: translateY(-2px) scale(1.02); filter: brightness(1.15); }'
            + '#duelRecapOverlay button:active { transform: translateY(1px) scale(0.98); }';
        _overlayEl.appendChild(animStyleEl);
    
        document.body.appendChild(_overlayEl);

        // Bind tab switching
        const tabOverviewBtn = document.getElementById('drTabOverview');
        const tabHitsBtn = document.getElementById('drTabHits');
        const tabTimelineBtn = document.getElementById('drTabTimeline');
        const tabContent = document.getElementById('drTabContent');

        function renderTab(tabName) {
            _activeTab = tabName;
            tabOverviewBtn.style.borderColor = tabName === 'overview' ? '#00E5FF' : '#8CA6C6';
            tabOverviewBtn.style.color = tabName === 'overview' ? '#00E5FF' : '#8CA6C6';
            tabHitsBtn.style.borderColor = tabName === 'hits' ? '#00E5FF' : '#8CA6C6';
            tabHitsBtn.style.color = tabName === 'hits' ? '#00E5FF' : '#8CA6C6';
            tabTimelineBtn.style.borderColor = tabName === 'timeline' ? '#00E5FF' : '#8CA6C6';
            tabTimelineBtn.style.color = tabName === 'timeline' ? '#00E5FF' : '#8CA6C6';

            if (tabName === 'overview') {
                renderOverviewTab(tabContent, scoreData, lang, isWin, data);
            } else if (tabName === 'hits') {
                renderHitsTab(tabContent, data, lang);
            } else if (tabName === 'timeline') {
                renderTimelineTab(tabContent, data, lang);
            }
        }

        tabOverviewBtn.addEventListener('click', () => renderTab('overview'));
        tabHitsBtn.addEventListener('click', () => renderTab('hits'));
        tabTimelineBtn.addEventListener('click', () => renderTab('timeline'));

        // Bind buttons
        document.getElementById('drBtnMainMenu').addEventListener('click', () => {
            closeDuelRecap();
            if (typeof _onMainMenuCb === 'function') _onMainMenuCb();
        });
        document.getElementById('drBtnPlayAgain').addEventListener('click', () => {
            closeDuelRecap();
            if (typeof _onPlayAgainCb === 'function') _onPlayAgainCb();
        });

        renderTab('overview');

        // Play rank stamp audio
        if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
            try { window.AudioMgr.playSfx('ui-card-select'); } catch (_) {}
        }
    }

    function renderOverviewTab(container, scoreData, lang, isWin, data = {}) {
        const stats = data.stats || {};
        const isPractice = !!data.isPractice;
        const timeMinutes = Math.floor(scoreData.timeSec / 60);
        const timeSeconds = Math.floor(scoreData.timeSec % 60);
        const timeFormatted = (timeMinutes < 10 ? '0' : '') + timeMinutes + ':' + (timeSeconds < 10 ? '0' : '') + timeSeconds;

        if (isPractice) {
            const attId = data.practiceAttackId || 1;
            let html = '';
            html += '<div style="background:rgba(8,20,40,0.85);border:1px solid ' + (isWin ? '#E8C46A' : '#FF4D6D') + ';border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">';
            html += '<div style="font-size:12px;color:#8CA6C6;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">SPELL ' + attId + ' PRACTICE</div>';
            html += '<div style="font-family:Cinzel,Playfair Display,Georgia,serif;font-size:36px;font-weight:700;color:' + (isWin ? '#F2D98B' : '#FF4D6D') + ';margin-bottom:12px;">' + (isWin ? (lang === 'vi' ? 'THÀNH CÔNG' : 'CLEARED') : (lang === 'vi' ? 'THẤT BẠI' : 'FAILED')) + '</div>';
            html += '<div style="font-size:14px;color:#DCE8F5;">' + t('metricTime', lang) + ': <strong style="color:#00E5FF;">' + (scoreData.timeSec).toFixed(1) + 's</strong></div>';
            html += '</div>';

            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:16px;margin-bottom:24px;">';
            html += '<div style="background:rgba(8,20,40,0.85);border:1px solid rgba(0,229,255,0.4);border-radius:8px;padding:16px;text-align:center;">';
            html += '<div style="font-size:11px;color:#8CA6C6;text-transform:uppercase;">' + t('tabHits', lang) + '</div>';
            html += '<div style="font-size:28px;font-weight:700;color:#FF4D6D;margin-top:8px;">' + (stats.hitsTaken || 0) + '</div>';
            html += '</div>';

            html += '<div style="background:rgba(8,20,40,0.85);border:1px solid rgba(0,229,255,0.4);border-radius:8px;padding:16px;text-align:center;">';
            html += '<div style="font-size:11px;color:#8CA6C6;text-transform:uppercase;">' + t('metricShield', lang) + '</div>';
            html += '<div style="font-size:28px;font-weight:700;color:#00E5FF;margin-top:8px;">' + (stats.shieldBreaks || 0) + '</div>';
            html += '</div>';

            html += '<div style="background:rgba(8,20,40,0.85);border:1px solid rgba(0,229,255,0.4);border-radius:8px;padding:16px;text-align:center;">';
            html += '<div style="font-size:11px;color:#8CA6C6;text-transform:uppercase;">' + t('metricGraze', lang) + '</div>';
            html += '<div style="font-size:28px;font-weight:700;color:#F2D98B;margin-top:8px;">' + (stats.grazeCount || 0) + '</div>';
            html += '</div>';

            html += '<div style="background:rgba(8,20,40,0.85);border:1px solid rgba(0,229,255,0.4);border-radius:8px;padding:16px;text-align:center;">';
            html += '<div style="font-size:11px;color:#8CA6C6;text-transform:uppercase;">' + t('metricShifts', lang) + '</div>';
            html += '<div style="font-size:28px;font-weight:700;color:#9C7BFF;margin-top:8px;">' + (stats.shiftsUsed || 0) + '</div>';
            html += '</div>';
            html += '</div>';

            container.innerHTML = html;
            return;
        }

        let html = '';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:24px;">';

        // Rank Card
        html += '<div style="background:rgba(8,20,40,0.85);border:1px solid #E8C46A;border-radius:8px;padding:16px;text-align:center;position:relative;overflow:hidden;">';
        html += '<div style="font-size:11px;color:#8CA6C6;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">' + t('metricRank', lang) + '</div>';
        if (isWin) {
            html += '<div style="font-family:Cinzel,Playfair Display,Georgia,serif;font-size:64px;font-weight:700;color:#F2D98B;text-shadow:0 0 24px rgba(232,196,106,0.6);line-height:1;">' + scoreData.rank + '</div>';
        } else {
            html += '<div style="font-size:14px;color:#FF4D6D;font-weight:600;margin-top:16px;">' + scoreData.clearedCount + ' / 18</div>';
        }
        html += '</div>';

        // Total Score Card
        html += '<div style="background:rgba(8,20,40,0.85);border:1px solid rgba(0,229,255,0.4);border-radius:8px;padding:16px;text-align:center;">';
        html += '<div style="font-size:11px;color:#8CA6C6;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">' + t('metricScore', lang) + '</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#00E5FF;letter-spacing:2px;line-height:1;margin-top:12px;">' + scoreData.totalScore.toLocaleString() + '</div>';
        html += '</div>';

        // Battle Time Card
        html += '<div style="background:rgba(8,20,40,0.85);border:1px solid rgba(0,229,255,0.4);border-radius:8px;padding:16px;text-align:center;">';
        html += '<div style="font-size:11px;color:#8CA6C6;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">' + t('metricTime', lang) + '</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#DCE8F5;letter-spacing:2px;line-height:1;margin-top:12px;">' + timeFormatted + '</div>';
        html += '</div>';

        // Attacks Cleared Card
        html += '<div style="background:rgba(8,20,40,0.85);border:1px solid rgba(0,229,255,0.4);border-radius:8px;padding:16px;text-align:center;">';
        html += '<div style="font-size:11px;color:#8CA6C6;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">' + t('metricClears', lang) + '</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#F2D98B;letter-spacing:2px;line-height:1;margin-top:12px;">' + scoreData.clearedCount + ' / 18</div>';
        html += '</div>';

        html += '</div>';

        // Score Breakdown Table
        html += '<div style="background:rgba(6,16,36,0.9);border:1px solid rgba(140,166,198,0.3);border-radius:8px;padding:20px;margin-bottom:16px;">';
        html += '<div style="font-size:14px;color:#E8C46A;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;border-bottom:1px solid rgba(232,196,106,0.25);padding-bottom:6px;">' + t('scoreBreakdownTitle', lang) + '</div>';

        html += '<div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">';
        if (isWin) {
            html += '<div style="display:flex;justify-content:space-between;color:#DCE8F5;"><span>' + t('scoreWinBonus', lang) + '</span><span style="color:#00E5FF;font-weight:600;">+100,000</span></div>';
        }
        html += '<div style="display:flex;justify-content:space-between;color:#DCE8F5;"><span>' + t('scoreAttackBonus', lang) + ' (' + scoreData.clearedCount + ' x 2,000)</span><span style="color:#00E5FF;font-weight:600;">+' + scoreData.attackBonus.toLocaleString() + '</span></div>';
        if (scoreData.timeBonus > 0) {
            html += '<div style="display:flex;justify-content:space-between;color:#DCE8F5;"><span>' + t('scoreTimeBonus', lang) + '</span><span style="color:#00E5FF;font-weight:600;">+' + scoreData.timeBonus.toLocaleString() + '</span></div>';
        }
        if (scoreData.cleanBonus > 0) {
            html += '<div style="display:flex;justify-content:space-between;color:#DCE8F5;"><span>' + t('scoreCleanBonus', lang) + ' (' + scoreData.cleanCount + ' x 1,500)</span><span style="color:#00E5FF;font-weight:600;">+' + scoreData.cleanBonus.toLocaleString() + '</span></div>';
        }
        if (scoreData.grazeBonus > 0) {
            html += '<div style="display:flex;justify-content:space-between;color:#DCE8F5;"><span>' + t('scoreGrazeBonus', lang) + ' (' + scoreData.grazeCount + ' x 10)</span><span style="color:#00E5FF;font-weight:600;">+' + scoreData.grazeBonus.toLocaleString() + '</span></div>';
        }
        if (scoreData.livesPenalty > 0) {
            html += '<div style="display:flex;justify-content:space-between;color:#FF4D6D;"><span>' + t('scoreLivesPenalty', lang) + ' (' + scoreData.livesLost + ' x 1,500)</span><span style="font-weight:600;">-' + scoreData.livesPenalty.toLocaleString() + '</span></div>';
        }
        if (scoreData.shieldPenalty > 0) {
            html += '<div style="display:flex;justify-content:space-between;color:#FF4D6D;"><span>' + t('scoreShieldPenalty', lang) + ' (' + scoreData.shieldBreaks + ' x 400)</span><span style="font-weight:600;">-' + scoreData.shieldPenalty.toLocaleString() + '</span></div>';
        }
        html += '</div>';

        html += '</div>';
        container.innerHTML = html;
    }

    function renderHitsTab(container, data, lang) {
        const stats = data.stats || {};
        const hitsByAttack = stats.hitsByAttack || {};
        const hitsByCause = stats.hitsByCause || { bullet: 0, laser: 0, tempest: 0, null_slash: 0, rift: 0 };

        let html = '';
        html += '<div style="display:flex;flex-direction:column;gap:20px;">';

        // Hits by Threat Type
        html += '<div style="background:rgba(6,16,36,0.9);border:1px solid rgba(140,166,198,0.3);border-radius:8px;padding:20px;">';
        html += '<div style="font-size:14px;color:#E8C46A;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">' + t('hitsByCauseTitle', lang) + '</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;">';
        html += '<div style="padding:10px;background:rgba(0,30,60,0.6);border-radius:6px;text-align:center;"><div style="font-size:11px;color:#8CA6C6;">' + t('threatBullet', lang) + '</div><div style="font-size:22px;color:#00E5FF;font-weight:700;">' + (hitsByCause.bullet || 0) + '</div></div>';
        html += '<div style="padding:10px;background:rgba(0,30,60,0.6);border-radius:6px;text-align:center;"><div style="font-size:11px;color:#8CA6C6;">' + t('threatLaser', lang) + '</div><div style="font-size:22px;color:#FF4D6D;font-weight:700;">' + (hitsByCause.laser || 0) + '</div></div>';
        html += '<div style="padding:10px;background:rgba(0,30,60,0.6);border-radius:6px;text-align:center;"><div style="font-size:11px;color:#8CA6C6;">' + t('threatTempest', lang) + '</div><div style="font-size:22px;color:#F2D98B;font-weight:700;">' + (hitsByCause.tempest || 0) + '</div></div>';
        html += '<div style="padding:10px;background:rgba(0,30,60,0.6);border-radius:6px;text-align:center;"><div style="font-size:11px;color:#8CA6C6;">' + t('threatNullSlash', lang) + '</div><div style="font-size:22px;color:#9C7BFF;font-weight:700;">' + (hitsByCause.null_slash || 0) + '</div></div>';
        html += '<div style="padding:10px;background:rgba(0,30,60,0.6);border-radius:6px;text-align:center;"><div style="font-size:11px;color:#8CA6C6;">' + t('threatRift', lang) + '</div><div style="font-size:22px;color:#00E5FF;font-weight:700;">' + (hitsByCause.rift || 0) + '</div></div>';
        html += '</div>';
        html += '</div>';

        // Hits by Attack chart
        html += '<div style="background:rgba(6,16,36,0.9);border:1px solid rgba(140,166,198,0.3);border-radius:8px;padding:20px;">';
        html += '<div style="font-size:14px;color:#E8C46A;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">' + t('hitsByAttackTitle', lang) + '</div>';
        html += '<div style="display:flex;flex-direction:column;gap:6px;">';
        let maxHitsOnAnyAttack = 1;
        for (let i = 1; i <= 18; i++) {
            const h = hitsByAttack[i] || 0;
            if (h > maxHitsOnAnyAttack) maxHitsOnAnyAttack = h;
        }
        for (let i = 1; i <= 18; i++) {
            const h = hitsByAttack[i] || 0;
            const pct = Math.round((h / maxHitsOnAnyAttack) * 100);
            const barCol = h > 0 ? (h === maxHitsOnAnyAttack ? '#FF4D6D' : '#F2D98B') : '#3A5070';
            html += '<div style="display:flex;align-items:center;gap:10px;font-size:11px;">';
            html += '<span style="width:70px;color:#8CA6C6;">Attack ' + i + '</span>';
            html += '<div style="flex:1;height:12px;background:rgba(0,20,40,0.6);border-radius:3px;overflow:hidden;">';
            html += '<div style="height:100%;width:' + pct + '%;background:' + barCol + ';"></div>';
            html += '</div>';
            html += '<span style="width:24px;text-align:right;color:#DCE8F5;">' + h + '</span>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        html += '</div>';
        container.innerHTML = html;
    }

    function renderTimelineTab(container, data, lang) {
        const timeline = (data.stats && data.stats.timeline) || [];
        let html = '';
        html += '<div style="background:rgba(6,16,36,0.9);border:1px solid rgba(140,166,198,0.3);border-radius:8px;padding:20px;">';
        html += '<div style="font-size:14px;color:#E8C46A;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">' + t('tabTimeline', lang) + '</div>';

        if (timeline.length === 0) {
            html += '<div style="color:#8CA6C6;font-size:13px;text-align:center;padding:24px;">No critical combat events recorded.</div>';
        } else {
            html += '<div style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto;padding-right:8px;">';
            for (let i = 0; i < timeline.length; i++) {
                const ev = timeline[i];
                const timeMin = Math.floor(ev.time / 60);
                const timeSec = Math.floor(ev.time % 60);
                const timeStr = (timeMin < 10 ? '0' : '') + timeMin + ':' + (timeSec < 10 ? '0' : '') + timeSec;

                let tagColor = '#00E5FF';
                let tagText = 'EVENT';
                if (ev.type === 'hit') {
                    tagColor = '#FF4D6D';
                    tagText = 'LIFE LOST';
                } else if (ev.type === 'shield_break') {
                    tagColor = '#00E5FF';
                    tagText = 'SHIELD BREAK';
                } else if (ev.type === 'skill_f') {
                    tagColor = '#F2D98B';
                    tagText = 'SKILL F SWEEP';
                } else if (ev.type === 'shift') {
                    tagColor = '#9C7BFF';
                    tagText = 'TIME DOMAIN';
                }

                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(0,25,50,0.5);border-radius:4px;border-left:3px solid ' + tagColor + ';">';
                html += '<span style="color:#DCE8F5;font-size:12px;font-weight:600;">' + tagText + ' (Attack ' + (ev.attackId || '?') + ')</span>';
                html += '<span style="color:#8CA6C6;font-size:11px;font-family:monospace;">' + timeStr + '</span>';
                html += '</div>';
            }
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    function closeDuelRecap() {
        if (_showdownRecapOpen) {
            _showdownRecapOpen = false;
            if (typeof window !== 'undefined' && typeof window._closeVoyageRecap === 'function') window._closeVoyageRecap();
        }
        if (_rafId) {
            cancelAnimationFrame(_rafId);
            _rafId = null;
        }
        if (_overlayEl && _overlayEl.parentNode) {
            _overlayEl.parentNode.removeChild(_overlayEl);
        }
        _overlayEl = null;
        _activeData = null;
        if (typeof window !== 'undefined' && window._duelSession) {
            window._duelSession._recapOpened = false;
        }
    }

    function verifyRecapOverlayText() {
        const el = document.getElementById('duelRecapOverlay');
        if (!el) return { ok: false, error: 'Overlay element not found' };
        const text = el.innerText || el.textContent || '';
        const badTokens = ['undefined', 'null', 'NaN'];
        const found = [];
        for (let i = 0; i < badTokens.length; i++) {
            const token = badTokens[i];
            const re = new RegExp('\\b' + token + '\\b', 'i');
            if (re.test(text)) found.push(token);
        }
        return {
            ok: found.length === 0,
            found: found,
            textSample: text.substring(0, 200).replace(/\s+/g, ' ')
        };
    }

    if (typeof window !== 'undefined') {
        window._openDuelRecap = openDuelRecap;
        window._closeDuelRecap = closeDuelRecap;
        window._verifyRecapOverlayText = verifyRecapOverlayText;
    }

    return {
        openDuelRecap: openDuelRecap,
        closeDuelRecap: closeDuelRecap,
        calculateScore: calculateScore,
        verifyRecapOverlayText: verifyRecapOverlayText
    };
});
