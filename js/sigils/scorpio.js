// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Scorpio sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.scorpio = {
        name: 'Scorpio', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'hoan_sinh', name: 'Resurrection', type: 'HEAL', typeC: '#22c55e',
              desc: 'Gain 4 lives now, and earn an extra life every 300,000 points instead of 500,000.' },
            { id: 'tu_huyet', name: 'Death Mark', type: 'ATK', typeC: '#ef4444',
              desc: 'Damage rises as enemies lose HP, up to +65% at 20% HP or below. Enemies at 5% HP are struck down by lightning. Skill F blade arcs pierce Iron Body.' },
        ]
};

SIGIL_I18N_VI.scorpio = { name: 'Bọ Cạp', element: 'Thủy', buffs: {
        hoan_sinh: { name: 'Hoàn Sinh', desc: 'Nhận ngay 4 mạng, và cứ mỗi 300,000 điểm được thêm 1 mạng thay vì 500,000.' },
        tu_huyet: { name: 'Tử Ấn', desc: 'Sát thương tăng khi kẻ địch mất máu, tới +65% khi còn 20% HP trở xuống. Kẻ địch còn 5% HP bị sét đánh chết. Lưỡi kiếm Skill F xuyên Iron Body.' },
}};
