// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Virgo sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.virgo = {
        name: 'Virgo', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'mui_ten_vang', name: 'Forest Guardian', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 6th auto volley triggers a Critical Strike: 4x damage, Vulnerability, root + silence 1s. Bullets glow gold. While 5+ enemies are on screen, every 4s a vine-wrapped wooden fist sweeps across the screen (60% of screen width), dealing 1000 + 10% EP + 15% of each target\'s lost HP.' },
            { id: 'ky_su_dien', name: 'Circuit Engineer', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla DoT & Coil +50% dmg; destroying a Coil reduces Skill G CD by 3s and increases G energy gain by 10%. Enemies carrying any debuff (slow, DoT, Vulnerability, Soul Reaver, etc.) take +50% damage from all sources.' },
        ]
};

SIGIL_I18N_VI.virgo = { name: 'Xử Nữ', element: 'Thổ', buffs: {
        mui_ten_vang: { name: 'Hộ Lâm', desc: 'Mỗi đợt bắn tự động thứ 6 kích hoạt Chí Mạng: sát thương x4, gây Trọng Thương, trói + câm lặng 1s. Đạn phát sáng vàng. Khi có 5+ kẻ địch trên màn hình, mỗi 4s 1 nắm đấm gỗ bọc dây leo quét ngang màn hình (60% chiều rộng màn hình), gây 1000 + 10% EP + 15% HP đã mất của mỗi mục tiêu.' },
        ky_su_dien: { name: 'Kỹ Sư Mạch', desc: 'Sát thương theo thời gian Tesla & Cuộn Tesla +50%; phá hủy 1 Cuộn Tesla giảm 3s hồi chiêu Skill G và tăng 10% tốc độ nạp năng lượng G. Kẻ địch mang bất kỳ hiệu ứng bất lợi nào (chậm, sát thương theo thời gian, Trọng Thương, Soul Reaver,...) nhận +50% sát thương từ mọi nguồn.' },
}};
