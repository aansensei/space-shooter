// Pisces: Space Journey. (c) 2024 An Nguyen. Licensed under the MIT License.
// Dawn Herald data loads after the shared sigil definitions.

SIGIL_DEFS.dau = {
    name: 'Dawn Herald', element: 'Metal', color: '#FFD23F',
    buffs: [
        { id: 'kim_ke_bao_hieu', name: 'Daybreak Clarion', type: 'SPEC', typeC: '#f59e0b',
          desc: 'Every 10s the rooster crows: a ring of light erases enemy bullets, shoves enemies back (Dominant) and marks them with Daybreak for 4s (+20% damage taken, no evade). Daybreak kills hasten the next crow.' },
        { id: 'tu_hoa_cham', name: 'Starfall Needles', type: 'ATK', typeC: '#ef4444',
          desc: 'Erased bullets fly back as homing golden needles (60% ATK true damage). Seven star needles pin the 7 strongest enemies for 1.5s (200% ATK). Enemy skill shots the ring touches return to their caster.' },
    ]
};

SIGIL_I18N_VI.dau = { name: 'Mão Nhật Tinh Quan', element: 'Kim', buffs: {
    kim_ke_bao_hieu: { name: 'Kê Minh Phá Hiểu', desc: 'Mỗi 10s gà thần cất tiếng gáy: vòng sáng xóa đạn địch, đẩy lùi kẻ địch (Áp Chế) và gắn Rạng Đông 4s (nhận thêm 20% sát thương, không thể né). Hạ kẻ địch mang Rạng Đông giúp tiếng gáy kế tiếp đến sớm hơn.' },
    tu_hoa_cham: { name: 'Tú Hoa Châm', desc: 'Đạn bị tiếng gáy xóa bay ngược thành kim vàng tự tìm mục tiêu (60% ATK sát thương chuẩn). Bảy kim sao ghim 7 kẻ địch mạnh nhất 1.5s (200% ATK). Chiêu phóng của địch chạm vòng sáng bị phản về kẻ tung chiêu.' },
}};
