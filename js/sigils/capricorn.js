// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Capricorn sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.capricorn = {
        name: 'Capricorn', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'lai_kep', name: 'Compound Interest', type: 'HEAL', typeC: '#22c55e',
              desc: 'Each kill grants +0.8% PE; every 5% PE gained increases all ally fire rate by 1.5% (max +40%, preserved through BTM). While the great spirit is alive, every ally attack deals +200 bonus true damage.' },
            { id: 'tuyet_lan', name: 'Avalanche', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Each kill grants +0.5% global damage (resets after 6s without a kill, max +70%)' },
        ]
};

SIGIL_I18N_VI.capricorn = { name: 'Ma Kết', element: 'Thổ', buffs: {
        lai_kep: { name: 'Lãi Kép', desc: 'Mỗi lần hạ gục nhận +0.8% EP; mỗi 5% EP nhận được tăng 1.5% tốc độ bắn của toàn phe ta (tối đa +40%, giữ nguyên qua BTM). Trong lúc đại tinh linh còn sống, mỗi đòn đánh của phe ta gây thêm +200 sát thương thật.' },
        tuyet_lan: { name: 'Tuyết Lăn', desc: 'Mỗi lần hạ gục nhận +0.5% sát thương toàn cục (reset sau 6s không hạ gục, tối đa +70%)' },
}};
