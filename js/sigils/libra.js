// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Libra sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.libra = {
        name: 'Libra', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'mui_ten_apollo', name: "Blood Arrow", type: 'SPEC', typeC: '#f59e0b',
              desc: 'Skill A cooldown -2s while Libra is equipped. Each Skill A cast fires 3 arrows after a 0.5s windup: 1 big arrow marks the highest-MaxHP enemy, the other 2 mark random enemies (biased toward denser clusters). Each arrow pierces all enemies (300 base dmg) and explodes on its marked target (400 base + 20% Max HP, up to +100% more from the target\'s DR). All hit enemies take 2 Vulnerability stacks. The 2 small arrows deal 40% less damage but fly 20% faster than the big one, which is also 15% bigger.' },
            { id: 'xuyen_pha', name: 'Astral Pierce', type: 'ATK', typeC: '#ef4444',
              desc: 'Skill A orbs pierce through their target on impact and continue flying to the screen edge, dealing hit damage to every enemy they cross. Orb size +30%.' },
        ]
};

SIGIL_I18N_VI.libra = { name: 'Thiên Bình', element: 'Phong', buffs: {
        mui_ten_apollo: { name: 'Huyết Tiễn', desc: 'Giảm 2s hồi chiêu Skill A khi trang bị Thiên Bình. Mỗi lần dùng Skill A bắn 3 mũi tên sau 0.5s chuẩn bị: 1 mũi tên lớn đánh dấu kẻ địch có Max HP cao nhất, 2 mũi còn lại đánh dấu kẻ địch ngẫu nhiên (ưu tiên khu vực đông địch). Mỗi mũi tên xuyên qua mọi kẻ địch (300 sát thương gốc) và nổ trên mục tiêu bị đánh dấu (400 gốc + 20% Max HP, tăng thêm tối đa +100% từ giáp của mục tiêu). Mọi kẻ địch trúng đòn nhận 2 lớp Trọng Thương. 2 mũi tên nhỏ gây ít hơn 40% sát thương nhưng bay nhanh hơn 20% so với mũi lớn, vốn cũng to hơn 15%.' },
        xuyen_pha: { name: 'Tinh Xuyên', desc: 'Cầu năng lượng Skill A xuyên qua mục tiêu khi va chạm và tiếp tục bay tới mép màn hình, gây sát thương cho mọi kẻ địch nó đi qua. Kích thước cầu +30%.' },
}};
