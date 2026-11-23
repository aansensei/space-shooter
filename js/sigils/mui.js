// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden data loads after the shared sigil definitions.

SIGIL_DEFS.mui = {
    name: 'Wraith Warden', element: 'Necromancy', color: '#3DDBB0',
    buffs: [
        { id: 'quy_mon_diem_quan', name: 'Legion of Souls', type: 'SPEC', typeC: '#f59e0b',
          desc: 'Kills and time charge Soul Qi up to 100. When full, press Space for a 0.5s windup where energy sweeps across the screen, then the Legion arrives for 5s: +40% move speed, 5 Iron Body layers (each blocks one hit), immunity to all CC, and eight small Spirit Array pools open at random spots above and away from the ship. Enemies inside a pool are held for 1.5s (Dominant, through CC immunity), then slowed 45%, take 12% ATK true damage every 0.4s and take double sigil damage. CC immune enemies are only slowed 25%. Passive: always +6% move speed.' },
        { id: 'van_kiem_quy_hon', name: 'Soul Blade Rain', type: 'ATK', typeC: '#ef4444',
          desc: 'While the Legion is out, 79 waves of spectral blades rise from the 180 degrees behind the ship and fly in straight lines at the enemies ahead, piercing everything on the way and wiping every enemy bullet they cut through. Enemies standing in a Spirit Array pool have a 40% chance, on each blade hit, to take 25% of that hit again as true damage. Each wave has 2 blades. Each blade hits each enemy once for 14% ATK + 0.06% Max HP true damage, and deals 10% more to units below Elite tier. Each blade hit deals 25% more to an enemy with more than 50% of its Max HP.' },
    ]
};

SIGIL_I18N_VI.mui = { name: 'Quỷ Kim Tinh Quan', element: 'Âm Binh Thuật', buffs: {
    quy_mon_diem_quan: { name: 'Binh Đoàn Linh Hồn', desc: 'Hạ gục kẻ địch và thời gian chiến đấu nạp Hồn Khí (tối đa 100). Khi đầy, nhấn Space khởi động 0.5 giây với năng lượng tỏa khắp màn hình, rồi Binh Đoàn xuất hiện trong 5 giây: tốc độ chạy +40%, có 5 lớp Iron Body (mỗi lớp chặn 1 lần trúng đòn), miễn nhiễm mọi CC, và mở 8 vòng Ma Trận nhỏ ở các chỗ ngẫu nhiên phía trên và cách xa tàu. Kẻ địch trong vòng Ma Trận bị giữ chân 1.5 giây (Áp Chế, xuyên qua miễn nhiễm CC) rồi bị làm chậm 45%, chịu 12% ATK sát thương chuẩn mỗi 0.4 giây, và chịu gấp đôi sát thương sigil. Kẻ địch miễn CC chỉ bị làm chậm 25%. Nội tại: luôn được +6% tốc độ chạy.' },
    van_kiem_quy_hon: { name: 'Vạn Kiếm Quy Hồn', desc: 'Trong lúc Binh Đoàn xuất hiện, 79 đợt hồn kiếm liên tục trồi lên từ vùng 180 độ phía sau tàu rồi phóng thẳng về phía kẻ địch ở phía trước, xuyên qua mọi thứ trên đường bay và xóa mọi đạn của kẻ địch mà chúng cắt qua. Kẻ địch đứng trong vòng Ma Trận có 40% xác suất, mỗi lần bị kiếm trúng, chịu thêm 25% sát thương của nhát đó dưới dạng sát thương chuẩn. Mỗi đợt có 2 thanh kiếm. Mỗi kiếm gây cho mỗi kẻ địch một lần 14% ATK + 0.06% Max HP sát thương chuẩn, và thêm 10% sát thương lên đơn vị không phải Elite trở lên. Mỗi nhát kiếm gây thêm 25% sát thương lên kẻ địch còn trên 50% Max HP.' },
}};
