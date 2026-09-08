// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Libra sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.libra = {
        name: 'Libra', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'mui_ten_apollo', name: "Blood Arrow", type: 'SPEC', typeC: '#f59e0b',
              desc: 'Skill A cooldown -2s while Libra is equipped. Skill A banks a stack per press; press again with a target to trigger the charge and release everything banked, each firing 5 piercing arrows (1 big marking the highest-MaxHP enemy, 4 small on other enemies, denser clusters preferred). Arrows deal 300 dmg and explode on their marked target for 400+20% Max HP (up to +100% more from DR), applying 2 Vulnerability stacks. A repeat hit on the same enemy deals 40% less. Small arrows deal 40% less damage but fly 20% faster.' },
            { id: 'xuyen_pha', name: 'Astral Pierce', type: 'ATK', typeC: '#ef4444',
              desc: 'Skill A orbs pierce through their target on impact and continue flying to the screen edge, dealing hit damage to every enemy they cross. Orb size +30%, damage +20%.' },
        ]
};

SIGIL_I18N_VI.libra = { name: 'Thiên Bình', element: 'Phong', buffs: {
        mui_ten_apollo: { name: 'Huyết Tiễn', desc: 'Giảm 2s hồi chiêu Skill A khi trang bị Thiên Bình. Skill A tích 1 stack mỗi lần ấn; ấn lại khi có mục tiêu để kích hoạt và xả hết stack đang tích, mỗi stack bắn 1 loạt 5 mũi tên xuyên (1 mũi lớn đánh dấu kẻ Max HP cao nhất, 4 mũi nhỏ đánh dấu kẻ khác, ưu tiên khu đông địch). Mũi tên gây 300 sát thương và nổ trên mục tiêu đánh dấu (400 gốc + 20% Max HP, tối đa +100% từ giáp mục tiêu), gây 2 lớp Trọng Thương. Trúng lại cùng 1 kẻ địch gây ít hơn 40% sát thương. Mũi nhỏ gây ít hơn 40% sát thương nhưng bay nhanh hơn 20%.' },
        xuyen_pha: { name: 'Tinh Xuyên', desc: 'Cầu năng lượng Skill A xuyên qua mục tiêu khi va chạm và tiếp tục bay tới mép màn hình, gây sát thương cho mọi kẻ địch nó đi qua. Kích thước cầu +30%, sát thương +20%.' },
}};
