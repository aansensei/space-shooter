// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Virgo sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.virgo = {
        name: 'Virgo', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'mui_ten_vang', name: 'Forest Guardian', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 6th auto volley crits for 3x damage with Vulnerability, root and silence. With 5+ enemies on screen, a vine wrapped log sweeps the screen every 4s.' },
            { id: 'ky_su_dien', name: 'Circuit Engineer', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla damage +30%, and each destroyed Coil refunds Skill G charge. Enemies with any debuff take +25% damage from all sources.' },
        ]
};

SIGIL_I18N_VI.virgo = { name: 'Xử Nữ', element: 'Thổ', buffs: {
        mui_ten_vang: { name: 'Hộ Lâm', desc: 'Mỗi đợt bắn tự động thứ 6 chí mạng x3, gây Trọng Thương, trói và câm lặng. Khi có 5+ kẻ địch, mỗi 4s 1 khúc gỗ bọc dây leo quét ngang màn hình.' },
        ky_su_dien: { name: 'Kỹ Sư Mạch', desc: 'Sát thương Tesla +30%, mỗi Cuộn Tesla bị phá hoàn lại năng lượng Skill G. Kẻ địch mang bất kỳ hiệu ứng bất lợi nào nhận thêm 25% sát thương.' },
}};
