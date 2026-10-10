// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Leo sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.leo = {
        name: 'Leo', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'su_tu_hong', name: "Lion's Roar", type: 'ATK', typeC: '#ef4444',
              desc: "While GFJ is active, attacks inflict Burn: 30% ATK per stack every 500ms for 3s (a new hit refreshes it and adds a stack, up to 3). Burn bypasses 50% of enemy DR. Every hit also deals bonus damage equal to 1% of the target's lost HP. Wildfire: an enemy that dies while Burning passes its Burn stacks to up to 6 enemies within 150px." },
            { id: 'than_menh', name: 'Divine Fate', type: 'SPEC', typeC: '#f59e0b',
              desc: "Wave start: every enemy is petrified for 5s (new spawns too) and all damage is +60%. Petrify ignores CC immunity and cannot be cleansed: petrified enemies cannot move, attack or cast, and their cooldowns pause. Goliath's UNIQUE SKILLs (Endless Echo and Joker) are unaffected. Fate meter: Burning kills charge it (Apostle 5%, Abnormal and Elite 20%, Dominator 35%) and each Burn tick on an Abnormal or higher enemy charges 0.5%. Every 1% grants +0.15% ATK (up to +15%). When full, press Space to petrify every enemy for 3s with the same +60% damage. When any petrify runs out, each petrified enemy shatters for 100% ATK. The meter and its ATK bonus drop to 0, and charging resumes 8s after the petrify ends." },
        ]
};

SIGIL_I18N_VI.leo = { name: 'Sư Tử', element: 'Hỏa', buffs: {
        su_tu_hong: { name: 'Sư Tử Hống', desc: 'Trong lúc Glory for Justice kích hoạt, đòn đánh gây Bỏng: 30% ATK mỗi lớp, tick mỗi 500ms trong 3s (đòn mới làm mới thời gian và cộng thêm 1 lớp, tối đa 3). Bỏng xuyên 50% giảm sát thương của kẻ địch. Mỗi đòn còn gây thêm sát thương bằng 1% HP đã mất của mục tiêu. Lửa Lan: kẻ địch chết khi đang Bỏng truyền số lớp Bỏng của nó sang tối đa 6 kẻ địch trong 150px.' },
        than_menh: { name: 'Thần Mệnh', desc: 'Đầu mỗi wave: mọi kẻ địch bị hóa đá 5s (kể cả địch mới xuất hiện), toàn bộ sát thương +60%. Hóa đá bỏ qua miễn khống chế và không thể bị xóa: kẻ địch hóa đá không di chuyển, không tấn công, không vận chiêu, hồi chiêu tạm dừng. UNIQUE SKILL của Goliath (Dư Âm Đêm Vô Tận và Joker) không bị ảnh hưởng. Thanh Thần Mệnh: hạ kẻ địch đang Bỏng sẽ nạp thanh (Apostle 5%, Abnormal và Elite 20%, Dominator 35%), mỗi tick Bỏng lên kẻ địch hạng Abnormal trở lên nạp 0.5%. Mỗi 1% cho +0.15% ATK (tối đa +15%). Khi đầy, nhấn Space để hóa đá mọi kẻ địch 3s với cùng +60% sát thương. Khi hóa đá hết thời gian, mỗi kẻ địch đang hóa đá vỡ ra, chịu sát thương bằng 100% ATK. Thanh và thưởng ATK về 0, 8s sau khi hết hóa đá mới nạp lại.' },
}};
