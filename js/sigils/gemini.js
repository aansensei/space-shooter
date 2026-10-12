// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Gemini sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.gemini = {
        name: 'Gemini', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'bong_doi', name: 'Shadow Twin', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 10th ally hit calls a phantom twin ship that fires 3 volleys of piercing plasma orbs across the screen, applying Vulnerability and Soul Reaver.' },
            { id: 'guong_laze', name: 'Mirror Laser', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Overload Laser gains 2 mirror beams and +20% damage. Skills and shots also have a small, growing chance to fire a piercing laser column for 3s.' },
        ]
};

SIGIL_I18N_VI.gemini = { name: 'Song Tử', element: 'Phong', buffs: {
        bong_doi: { name: 'Ảnh Song', desc: 'Mỗi đòn trúng thứ 10 gọi 1 tàu bóng ma bắn 3 đợt cầu plasma xuyên khắp màn hình, gây Trọng Thương và Đoạt Hồn.' },
        guong_laze: { name: 'Gương Quang Tuyến', desc: 'Overload Laser có thêm 2 tia gương và +20% sát thương. Skill và đạn bắn còn có tỉ lệ nhỏ, tăng dần, bắn ra 1 cột laser xuyên trong 3s.' },
}};
