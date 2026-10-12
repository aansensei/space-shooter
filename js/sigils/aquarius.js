// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Aquarius sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.aquarius = {
        name: 'Aquarius', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'set_day_chuyen', name: 'Chain Lightning', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla DoT can arc to a nearby enemy and Skill G charges 35% faster. Orbs that expire unpaired grant stacking ally damage and feed extra Skill A orbs.' },
            { id: 'dien_tu_truong', name: 'Magnetic Field', type: 'DEF', typeC: '#3b82f6',
              desc: 'While Skill G is active or fully charged, enemies within 300px are slowed 30% and take 65% ATK damage per second.' },
        ]
};

SIGIL_I18N_VI.aquarius = { name: 'Bảo Bình', element: 'Phong', buffs: {
        set_day_chuyen: { name: 'Liên Hoàn Lôi', desc: 'Sát thương Tesla có thể lan sang kẻ địch gần đó, Skill G nạp nhanh hơn 35%. Cầu hết hạn chưa ghép cho thêm sát thương cộng dồn và thêm cầu Skill A.' },
        dien_tu_truong: { name: 'Điện Từ Trường', desc: 'Khi Skill G kích hoạt hoặc nạp đầy, kẻ địch trong 300px bị chậm 30% và chịu 65% ATK sát thương mỗi giây.' },
}};
