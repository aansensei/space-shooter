// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Aries sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.aries = {
        name: 'Aries', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'cong_babylon', name: 'Gate of Babylon', type: 'ATK', typeC: '#ef4444',
              desc: 'Ally hits can open gates that fire 14 piercing blades in a fan, dealing 7.5% ATK true damage to each enemy hit (1.5s CD).' },
            { id: 'enuma_elish', name: 'Enuma Elish', type: 'ATK', typeC: '#ef4444',
              desc: "Every 30 ally hits, a phantom hurls a spear through the strongest enemy's line: 18x ATK + 5% Max HP true damage to each enemy hit." },
        ]
};

SIGIL_I18N_VI.aries = { name: 'Bạch Dương', element: 'Hỏa', buffs: {
        cong_babylon: { name: 'Cổng Babylon', desc: 'Đòn trúng của phe ta có thể mở cổng phóng 14 lưỡi kiếm xuyên hình quạt, mỗi kẻ địch trúng chịu 7.5% ATK sát thương chuẩn (hồi 1.5s).' },
        enuma_elish: { name: 'Enuma Elish', desc: 'Mỗi 30 đòn trúng, 1 bản thể ma ảnh phóng thương xuyên theo hướng kẻ địch mạnh nhất: mỗi kẻ trúng chịu 18 lần ATK + 5% Max HP sát thương chuẩn.' },
}};
