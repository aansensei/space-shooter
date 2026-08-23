// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/match-stats.js — Match Statistics panel, opened from Game Over.
// reads window._matchStats, pure UI, never touches gameplay state

// vi labels for dynamic _recordStat source strings, falls back to english if missing
const _MATCH_STATS_LABEL_VI = {
    'Skill D: Death Star': 'Chiêu D: Tử Long Tinh',
    'Skill D: Mark & Annihilate': 'Chiêu D: Đánh Dấu & Tiêu Diệt',
    'Chain Lightning': 'Chuỗi Sét',
    'Skill G: Tesla Coil': 'Chiêu G: Cuộn Tesla',
    'Skill S: Remembrance Spirit': 'Chiêu S: Hồi Ức Chi Linh',
    'Skill S: Back to Motherland': 'Chiêu S: Quy Hồi Cố Thổ',
    'Skill A: Onslaught': 'Chiêu A: Cuồng Phong',
    'Yog-Sothoth Domain': 'Lãnh Địa Yog-Sothoth',
    'Dimensional Rift': 'Khe Nứt Không Gian',
    'Soul Devourer': 'Cắn Nuốt Linh Hồn',
    'Solar Flare': 'Bùng Cháy Mặt Trời',
    'Boon & Bane': 'Phúc & Họa',
    'Blade Arc': 'Cung Kiếm',
    'Enemy Bullet': 'Đạn Địch',
    'Enemy Chain Lightning': 'Chuỗi Sét Địch',
    'Boss Attack': 'Đòn Đánh Boss',
    'Goliath': 'Goliath', 'Leviathan': 'Leviathan', 'Egregor': 'Egregor',
    'Dargruel': 'Dargruel', 'Marchosias': 'Marchosias', 'Veilshroud': 'Veilshroud',
    'Aegis Core': 'Aegis Core', 'Thaelis': 'Thaelis', 'Apostle': 'Sứ Đồ',
    'Embryo': 'Phôi Thai', 'Abyssal Chain': 'Xiềng Xích Hắc Ám',
    'Normal Enemy': 'Địch Thường', 'Unknown': 'Không Rõ', 'Other': 'Khác',
};

function _matchStatsLabel(rawLabel) {
    if (typeof window._lang !== 'undefined' && window._lang === 'vi') {
        return _MATCH_STATS_LABEL_VI[rawLabel] || rawLabel;
    }
    return rawLabel;
}

function openMatchStats() {
    const overlay = document.getElementById('matchStatsOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    if (window.AudioMgr) window.AudioMgr.playSfx('click');
    _renderMatchStatsTab('allyDamage');
}

function closeMatchStats() {
    const overlay = document.getElementById('matchStatsOverlay');
    if (overlay) overlay.style.display = 'none';
}

const _MATCH_STATS_EMPTY_KEY = { allyDamage: 'matchStats.emptyAlly', enemyDamage: 'matchStats.emptyEnemy', lifeLoss: 'matchStats.emptyLives' };
const _MATCH_STATS_EMPTY_FALLBACK = {
    allyDamage: { en: 'No ally damage recorded this run.', vi: 'Không có sát thương phe đồng minh nào được ghi nhận.' },
    enemyDamage: { en: 'No enemy damage recorded this run.', vi: 'Không có sát thương phe địch nào được ghi nhận.' },
    lifeLoss: { en: 'No lives were lost this run.', vi: 'Không mất mạng nào trong trận này.' },
};

function _renderMatchStatsTab(tabName) {
    document.querySelectorAll('.ms-tab-btn').forEach(btn => {
        const active = btn.dataset.tab === tabName;
        btn.style.background = active ? 'rgba(0,229,255,0.22)' : 'rgba(0,229,255,0.08)';
        btn.style.color = active ? '#ffffff' : '#00e5ff';
    });

    const body = document.getElementById('match-stats-body');
    if (!body) return;
    const bucket = (window._matchStats && window._matchStats[tabName]) || {};
    const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);

    if (entries.length === 0 || total <= 0) {
        const lang = (typeof window._lang !== 'undefined' && window._lang === 'vi') ? 'vi' : 'en';
        body.innerHTML = '<p style="text-align:center; color:rgba(0,229,255,0.4); font-size:11px; padding:24px 0;">'
            + _MATCH_STATS_EMPTY_FALLBACK[tabName][lang] + '</p>';
        return;
    }

    const isCount = tabName === 'lifeLoss';
    body.innerHTML = entries.map(([label, value]) => {
        const pct = total > 0 ? (value / total) * 100 : 0;
        const displayVal = isCount ? Math.round(value) + '×' : Math.round(value).toLocaleString();
        return `
            <div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; color:rgba(215,235,255,0.9); margin-bottom:3px;">
                    <span>${_matchStatsLabel(label)}</span>
                    <span style="color:#00e5ff;">${displayVal} &middot; ${pct.toFixed(1)}%</span>
                </div>
                <div style="background:rgba(0,229,255,0.08); border-radius:4px; height:6px; overflow:hidden;">
                    <div style="background:linear-gradient(90deg, #00e5ff, #0088aa); height:100%; width:${pct}%;"></div>
                </div>
            </div>`;
    }).join('');
}
