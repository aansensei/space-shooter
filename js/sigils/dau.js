// Pisces: Space Journey. (c) 2024 An Nguyen. Licensed under the MIT License.
// Dawn Herald (dau) sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.dau = {
    name: 'Dawn Herald', element: 'Metal', color: '#FFD23F',
    buffs: [
        { id: 'kim_ke_bao_hieu', name: 'Daybreak Crow', type: 'SPEC', typeC: '#f59e0b',
          desc: "Every 10s the rooster crows: a ring of light erases enemy bullets, drags Uriel out of camouflage and marks enemies with Daybreak for 4s. Daybreak enemies take +20% damage and cannot evade (Goliath loses 30% evade instead)." },
        { id: 'tu_hoa_cham', name: 'Golden Needle', type: 'ATK', typeC: '#ef4444',
          desc: "Each bullet a crow erases flies back as a homing golden needle (up to 16) for 60% ATK true damage. Seven star needles also strike the 7 strongest enemies for 200% ATK and pin them for 1.5s." },
    ]
};

SIGIL_I18N_VI.dau = { name: 'Mão Nhật Tinh Quan', element: 'Kim', buffs: {
    kim_ke_bao_hieu: { name: 'Kim Kê Báo Hiểu', desc: 'Mỗi 10s gà thần cất tiếng gáy: vòng sáng xóa đạn địch, kéo Uriel khỏi tàng hình và gắn Rạng Đông 4s. Kẻ địch mang Rạng Đông nhận thêm 20% sát thương và không thể né (riêng Goliath chỉ bị giảm 30% né).' },
    tu_hoa_cham: { name: 'Tú Hoa Châm', desc: 'Mỗi viên đạn bị tiếng gáy xóa bay ngược lại thành kim vàng tự tìm mục tiêu (tối đa 16), gây 60% ATK sát thương chuẩn. Bảy kim sao giáng xuống 7 kẻ địch mạnh nhất, gây 200% ATK và ghim chúng 1.5s.' },
}};
