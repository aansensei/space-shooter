// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Leo sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.leo = {
        name: 'Leo', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'su_tu_hong', name: "Lion's Roar", type: 'ATK', typeC: '#ef4444',
              desc: 'While GFJ active, attacks inflict Burn: 200 + 5% Max HP DoT per 500ms for 3s (resets on new hit, stacks x3). Burn bypasses 50% enemy DR. Attacks emit fire. Every hit also deals bonus damage equal to 2% of the target\'s own lost HP.' },
            { id: 'than_menh', name: 'Divine Fate', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Wave start: 5s freeze — all enemies stop moving (new spawns also frozen) + all damage +100%' },
        ]
};

SIGIL_I18N_VI.leo = { name: 'Sư Tử', element: 'Hỏa', buffs: {
        su_tu_hong: { name: 'Sư Tử Hống', desc: 'Trong lúc Glory for Justice kích hoạt, đòn đánh gây Bỏng: 200 + 5% Max HP sát thương theo thời gian mỗi 500ms trong 3s (reset khi trúng đòn mới, cộng dồn x3). Bỏng xuyên 50% giáp kẻ địch. Đòn đánh phát ra lửa. Mỗi đòn còn gây thêm sát thương bằng 2% HP đã mất của mục tiêu.' },
        than_menh: { name: 'Thần Mệnh', desc: 'Đầu mỗi wave: đóng băng 5s — mọi kẻ địch ngừng di chuyển (kể cả địch mới xuất hiện) + toàn bộ sát thương +100%' },
}};
