// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Aries sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.aries = {
        name: 'Aries', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'cong_babylon', name: 'Gate of Babylon', type: 'ATK', typeC: '#ef4444',
              desc: 'Every landed hit from any allied source (except Skill D and Skill F) can open gates around the player and fire 14 blades in a fan, each piercing through every enemy in its path and dealing 50 + 4% Max HP as true damage per enemy hit (1.5s CD).' },
            { id: 'enuma_elish', name: 'Enuma Elish', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 30 landed hits from any allied source (except Skill D and Skill F) summons a phantom double of the player that hurls a massive spear straight through the highest-priority enemy\'s direction (Dominator/Digiform first, otherwise highest current HP), piercing every enemy in the line: each one hit takes 15% of its own Max HP as true damage, capped at 16,000 (0.5s CD).' },
        ]
};

SIGIL_I18N_VI.aries = { name: 'Bạch Dương', element: 'Hỏa', buffs: {
        cong_babylon: { name: 'Cổng Babylon', desc: 'Mỗi đòn đánh trúng từ bất kỳ nguồn phe ta nào (trừ Skill D và Skill F) có thể mở cổng quanh người chơi và phóng 14 lưỡi kiếm theo hình quạt, mỗi lưỡi xuyên qua mọi kẻ địch trên đường bay, gây 50 + 4% Max HP sát thương chuẩn cho mỗi kẻ địch bị xuyên (hồi chiêu 2.5s).' },
        enuma_elish: { name: 'Enuma Elish', desc: 'Cứ mỗi 30 đòn đánh trúng từ bất kỳ nguồn phe ta nào (trừ Skill D và Skill F), triệu hồi 1 bản thể ma ảnh của người chơi phóng 1 lưỡi thương khổng lồ thẳng theo hướng kẻ địch ưu tiên cao nhất (Dominator/Digiform trước, không thì HP hiện tại cao nhất), xuyên qua mọi kẻ địch trên đường bay, mỗi kẻ bị xuyên nhận 15% Max HP của chính nó dưới dạng sát thương chuẩn, tối đa 16,000 (hồi chiêu 0.5s).' },
}};
