// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Aquarius sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.aquarius = {
        name: 'Aquarius', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'set_day_chuyen', name: 'Chain Lightning', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla DoT: 50% chain to nearest enemy within 150px. Skill G charge rate +35%. While Skill G is active, every energy orb that expires without pairing into a Tesla coil grants a stacking +8% ally dmg buff (max 6 stacks, +48% total, 5s each), and is siphoned into an extra Skill A orb if Skill A has room.' },
            { id: 'dien_tu_truong', name: 'Magnetic Field', type: 'DEF', typeC: '#3b82f6',
              desc: 'While Skill G is active or fully charged, enemies within 300px are slowed 30% and suffer 65 DoT every 100ms (650/s)' },
        ]
};

SIGIL_I18N_VI.aquarius = { name: 'Bảo Bình', element: 'Phong', buffs: {
        set_day_chuyen: { name: 'Liên Hoàn Lôi', desc: 'Sát thương theo thời gian Tesla: 50% cơ hội lan sang kẻ địch gần nhất trong bán kính 150px. Tốc độ nạp Skill G +35%. Trong lúc Skill G kích hoạt, mỗi cầu năng lượng hết hạn mà chưa ghép thành Cuộn Tesla sẽ cho +8% sát thương phe ta (cộng dồn, tối đa 6 lớp, tổng +48%, mỗi lớp 5s), và được hút thành 1 cầu Skill A phụ nếu Skill A còn chỗ.' },
        dien_tu_truong: { name: 'Điện Từ Trường', desc: 'Trong lúc Skill G kích hoạt hoặc nạp đầy, kẻ địch trong bán kính 300px bị chậm 30% và chịu 65 sát thương mỗi 100ms (650/s)' },
}};
