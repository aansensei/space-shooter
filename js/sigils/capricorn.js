// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Capricorn sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.capricorn = {
        name: 'Capricorn', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'lai_kep', name: 'Compound Interest', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Kills charge Skill S faster. Each kill or Primeval Energy point adds +0.5% damage (up to +40%, lost after 6s without either), and every 5 points adds +1.5% ally fire rate (up to +40%). While the great spirit lives, ally hits deal +22.5% ATK true damage.' },
            { id: 'thai_son_ap_dinh', name: 'Mountainfall', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Stacks fill the Ley meter. When full, Space or CHARGE drops a mountain on the densest enemy group for 12x ATK + 4% Max HP and buries them for 1.5s (Dominant). It breaks into rock walls that stop every enemy bullet, beam and body for 4s.' },
        ]
};

SIGIL_I18N_VI.capricorn = { name: 'Ma Kết', element: 'Thổ', buffs: {
        lai_kep: { name: 'Lãi Kép', desc: 'Hạ gục nạp Skill S nhanh hơn. Mỗi lần hạ gục hoặc mỗi điểm Năng Lượng Nguyên Thủy +0.5% sát thương (tối đa +40%, mất hết sau 6s không nạp), mỗi 5 điểm +1.5% tốc độ bắn toàn phe ta (tối đa +40%). Khi đại tinh linh còn sống, đòn phe ta gây thêm 22.5% ATK sát thương chuẩn.' },
        thai_son_ap_dinh: { name: 'Thái Sơn Áp Đỉnh', desc: 'Stack Lãi Kép nạp thanh Địa Mạch. Khi đầy, Space hoặc CHARGE giáng một ngọn núi xuống nơi địch đông nhất, gây 12 lần ATK + 4% Max HP và vùi chúng 1.5s (Áp Chế). Núi vỡ thành tường đá chặn mọi đạn, tia và thân địch trong 4s.' },
}};
