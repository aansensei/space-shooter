// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Scorpio sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.scorpio = {
        name: 'Scorpio', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'hoan_sinh', name: 'Resurrection', type: 'HEAL', typeC: '#22c55e',
              desc: 'On pick: immediately gain +5 lives. Life bonus rate: +1 life per 250,000 pts (instead of 500,000)' },
            { id: 'tu_huyet', name: 'Death Mark', type: 'ATK', typeC: '#ef4444',
              desc: 'HP 100%→21%: +0%→+70% damage linearly. HP ≤20%: +80% damage from all sources. HP ≤5%: lightning instakill. Skill F blade arc pierces Iron Body. Enemies below 50% HP show a cyan warning ring.' },
        ]
};

SIGIL_I18N_VI.scorpio = { name: 'Bọ Cạp', element: 'Thủy', buffs: {
        hoan_sinh: { name: 'Hoàn Sinh', desc: 'Khi chọn: nhận ngay +5 mạng. Tỉ lệ thưởng mạng: +1 mạng mỗi 250,000 điểm (thay vì 500,000)' },
        tu_huyet: { name: 'Tử Ấn', desc: 'HP 100%→21%: sát thương tăng tuyến tính +0%→+70%. HP ≤20%: +80% sát thương từ mọi nguồn. HP ≤5%: sét đánh kết liễu ngay lập tức. Vòng cung lưỡi kiếm Skill F xuyên qua Iron Body. Kẻ địch dưới 50% HP hiện vòng cảnh báo màu xanh cyan.' },
}};
