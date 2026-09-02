// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Pisces sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.pisces = {
        name: 'Pisces', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'coi_mong', name: 'Dream Realm', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Shift activation negates all enemy damage for 3s and marks all enemies on screen (each instantly takes 1 Vulnerability stack). After 1.65s, marked enemies burst for 60% of the damage they accumulated during the mark window plus 35% of their lost HP.' },
            { id: 'dong_chay_luan_hoi', name: 'Cycle of Flow', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Kill apostle: −1s all skill CD; kill abnormal/elite: −1.5s; kill dominator: −2s; kill Egregor: −3s. Every full screen-width of actual movement also takes −0.5s off all skill CDs. Charge rate for Phōtokrystos and Skill G +50%. Skill D, Skill F and Overload Laser fire instantly, skipping their charge phase entirely (Shift unaffected).' },
        ]
};

SIGIL_I18N_VI.pisces = { name: 'Song Ngư', element: 'Thủy', buffs: {
        coi_mong: { name: 'Cõi Mộng', desc: 'Kích hoạt Shift vô hiệu hóa mọi sát thương của địch trong 3s và đánh dấu toàn bộ kẻ địch trên màn hình (mỗi con nhận ngay 1 lớp Trọng Thương). Sau 1.65s, kẻ địch bị đánh dấu bùng nổ gây 60% sát thương đã tích lũy trong lúc bị đánh dấu cộng 35% HP đã mất của chúng.' },
        dong_chay_luan_hoi: { name: 'Dòng Chảy Luân Hồi', desc: 'Hạ Apostle: −1s hồi chiêu mọi skill; hạ Abnormal/Elite: −1.5s; hạ Dominator: −2s; hạ Egregor: −3s. Mỗi lần di chuyển thực tế đủ 1 bề ngang màn hình cũng được −0.5s hồi chiêu mọi skill. Tốc độ nạp Phōtokrystos và Skill G +50%. Skill D, Skill F và Overload Laser bắn ngay lập tức, bỏ qua hoàn toàn giai đoạn nạp (không ảnh hưởng Shift).' },
}};
