// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Capricorn sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.capricorn = {
        name: 'Capricorn', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'lai_kep', name: 'Compound Interest', type: 'HEAL', typeC: '#22c55e',
              desc: 'Kills charge Primeval Energy, which raises all ally fire rate (up to +40%). While the great spirit lives, ally attacks deal 22.5% ATK bonus true damage.' },
            { id: 'tuyet_lan', name: 'Avalanche', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Each kill adds +0.5% damage, up to +40%. It resets after 6s without a kill.' },
        ]
};

SIGIL_I18N_VI.capricorn = { name: 'Ma Kết', element: 'Thổ', buffs: {
        lai_kep: { name: 'Lãi Kép', desc: 'Hạ gục nạp Năng Lượng Nguyên Thủy, giúp tăng tốc độ bắn toàn phe ta (tối đa +40%). Khi đại tinh linh còn sống, đòn của phe ta gây thêm 22.5% ATK sát thương chuẩn.' },
        tuyet_lan: { name: 'Tuyết Lăn', desc: 'Mỗi lần hạ gục +0.5% sát thương, tối đa +40%. Mất hết sau 6s không hạ gục.' },
}};
