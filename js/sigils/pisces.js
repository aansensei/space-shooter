// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Pisces sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.pisces = {
        name: 'Pisces', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'coi_mong', name: 'Dream Realm', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Shift makes you immune for 2.5s and marks every enemy. Marked enemies then burst for part of the damage they took, up to 25% of their Max HP.' },
            { id: 'dong_chay_luan_hoi', name: 'Cycle of Flow', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Kills and movement cut skill cooldowns. Each second actually refunded adds a Flow point. At 12 points, bubbles form a fish that swims straight through enemies for 65% ATK Piercing damage and stuns each one for 1s (Dominant). Stores 12 overflow points, up to 2 fish at once, at least 2s between summons. Skill G charges 35% faster; D, F and Overload Laser fire instantly.' },
        ]
};

SIGIL_I18N_VI.pisces = { name: 'Song Ngư', element: 'Thủy', buffs: {
        coi_mong: { name: 'Cõi Mộng', desc: 'Shift giúp bạn miễn sát thương 2.5s và đánh dấu mọi kẻ địch. Sau đó kẻ bị đánh dấu nổ ra theo phần sát thương đã nhận, tối đa 25% Max HP.' },
        dong_chay_luan_hoi: { name: 'Dòng Chảy Luân Hồi', desc: 'Hạ gục và di chuyển giảm hồi chiêu. Mỗi giây được rút thực sự cho 1 điểm Luân Hồi. Đủ 12 điểm, bọt nước tụ thành cá bơi thẳng xuyên địch, gây 65% ATK sát thương xuyên và làm choáng mỗi kẻ địch 1s (Áp Chế). Lưu thêm 12 điểm overload, tối đa 2 cá cùng lúc, cách nhau ít nhất 2s. Skill G nạp nhanh hơn 35%; D, F và Overload Laser bắn ngay.' },
}};
