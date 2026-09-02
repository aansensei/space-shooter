// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Great Sage (than) sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.than = {
        name: 'Great Sage', element: 'Earth', color: '#D62839',
        buffs: [
            { id: 'cuop_bao_tang', name: 'Ransacked Treasury', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Annihilation Sweep is reskinned into the Great Sage\'s own Ruyi Jingu Bang, widening with every kill it lands within a single cast (up to 4.5x its starting width, resetting each cast). Every kill on an Elite-tier-or-higher enemy also plunders that enemy\'s own gem (up to 3 held at once, one of each kind) - the same way the Great Sage once ransacked the Dragon King\'s undersea treasury. Pressing Annihilation Sweep again while it is still on cooldown spends the oldest gem to unleash a scaled-down copy of that enemy\'s own signature attack and fires the sweep again immediately, ignoring the remaining cooldown - the sweep itself is unchanged (still an instant kill on contact).' },
            { id: 'bien_hoa_72', name: '72 Transformations', type: 'ATK', typeC: '#ef4444',
              desc: 'While holding 3 different gems at once, every stolen attack unleashed hits 1.5x as hard - the Great Sage\'s full mastery of borrowed powers, "72 Transformations" for whatever the moment demands.' },
        ]
};

SIGIL_I18N_VI.than = { name: 'Đấu Chiến Thắng Phật', element: 'Thổ', buffs: {
        cuop_bao_tang: { name: 'Cướp Long Cung', desc: 'Thiên Ý Trảm được tái tạo hình thành Như Ý Kim Cô Bổng của Tề Thiên, tự nới rộng thêm mỗi khi hạ được 1 kẻ địch trong lượt quét đó (tối đa ~4.5 lần bề rộng gốc, reset mỗi lượt quét mới). Hạ được kẻ địch từ Elite trở lên sẽ cướp luôn bảo thạch của chính nó (tối đa 3 viên khác loại cùng lúc) — giống hệt cách Tề Thiên năm xưa cướp phá Long Cung để đoạt lấy cây gậy này. Bấm Thiên Ý Trảm khi đang hồi chiêu sẽ tiêu viên bảo thạch cũ nhất, tung ra 1 bản thu nhỏ của chính đòn đánh đặc trưng kẻ địch đó, và phóng lại Thiên Ý Trảm ngay lập tức — đòn quét bản thân không đổi (vẫn chạm là chết).' },
        bien_hoa_72: { name: '72 Phép Biến Hóa', desc: 'Khi đang giữ đủ 3 viên bảo thạch khác loại, mỗi đòn cướp được tung ra sẽ mạnh hơn x1.5, thể hiện trọn vẹn khả năng "72 phép biến hóa" của Tề Thiên, sẵn sàng ứng biến mọi tình huống.' },
}};
