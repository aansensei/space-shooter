// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Great Sage (than) sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.than = {
        name: 'Great Sage', element: 'Earth', color: '#D62839',
        buffs: [
            { id: 'cuop_bao_tang', name: 'Ransacked Treasury', type: 'SPEC', typeC: '#f59e0b',
              desc: "Skill F becomes the Ruyi Jingu Bang, widening with each kill. Killing an Elite or stronger steals its gem; press F to unleash a copy of that enemy's signature attack." },
            { id: 'bien_hoa_72', name: '72 Transformations', type: 'ATK', typeC: '#ef4444',
              desc: 'While holding 3 different gems, each stolen attack hits 1.65x as hard.' },
        ]
};

SIGIL_I18N_VI.than = { name: 'Đấu Chiến Thắng Phật', element: 'Thổ', buffs: {
        cuop_bao_tang: { name: 'Cướp Long Cung', desc: 'Skill F hóa thành Như Ý Kim Cô Bổng, rộng dần theo mỗi lần hạ gục. Hạ Elite trở lên cướp bảo thạch của nó; bấm F để tung bản sao đòn đặc trưng của kẻ đó.' },
        bien_hoa_72: { name: '72 Phép Biến Hóa', desc: 'Khi giữ đủ 3 viên bảo thạch khác loại, mỗi đòn cướp được mạnh hơn x1.65.' },
}};
