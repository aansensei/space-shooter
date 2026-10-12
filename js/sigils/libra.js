// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Libra sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.libra = {
        name: 'Libra', element: 'Blood Sorcery', color: '#378ADD',
        buffs: [
            { id: 'mui_ten_apollo', name: "Blood Arrow", type: 'SPEC', typeC: '#f59e0b',
              desc: 'Skill A cooldown -2s. Each press banks a volley of 5 piercing arrows; press with a target in sight to fire everything banked. Arrows explode and apply Vulnerability.' },
            { id: 'xuyen_pha', name: 'Astral Pierce', type: 'ATK', typeC: '#ef4444',
              desc: 'Skill A orbs pierce through their target to the screen edge, hitting every enemy on the way. Orb size +30%, damage +20%.' },
        ]
};

SIGIL_I18N_VI.libra = { name: 'Thiên Bình', element: 'Huyết Quỷ Thuật', buffs: {
        mui_ten_apollo: { name: 'Huyết Tiễn', desc: 'Hồi chiêu Skill A -2s. Mỗi lần ấn tích 1 loạt 5 mũi tên xuyên; ấn khi có mục tiêu để bắn hết. Mũi tên phát nổ và gây Trọng Thương.' },
        xuyen_pha: { name: 'Tinh Xuyên', desc: 'Cầu Skill A xuyên qua mục tiêu tới mép màn hình, trúng mọi kẻ địch trên đường bay. Kích thước cầu +30%, sát thương +20%.' },
}};
