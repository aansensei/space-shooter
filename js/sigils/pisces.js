// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Pisces sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.pisces = {
        name: 'Pisces', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'coi_mong', name: 'Dream Realm', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Shift activation negates all enemy damage for 2.5s (6s minimum between activations) and marks all enemies on screen (each instantly takes 1 Vulnerability stack). After 1.65s, marked enemies burst for up to 50% of the damage they accumulated during the mark window plus 15% of their lost HP, capped at 25% of their own Max HP, as true damage.' },
            { id: 'dong_chay_luan_hoi', name: 'Cycle of Flow', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Kill apostle: −1s Skill D/F CD (−0.75s for Skill A/S/Overload Laser); kill abnormal/elite: −1.5s D/F (−1s others); kill dominator: −2s D/F (−1.5s others); kill Egregor: −3s D/F (−2s others) - the A/S/Laser reduction is capped at 2s of total per real second so a kill streak can\'t reset them near-instantly. Every full screen-width of actual movement also takes −0.5s off Skill A/S/Overload Laser. Charge rate for Phōtokrystos +50%, Skill G +35%. Skill D, Skill F and Overload Laser fire instantly, skipping their charge phase entirely (Shift unaffected).' },
        ]
};

SIGIL_I18N_VI.pisces = { name: 'Song Ngư', element: 'Thủy', buffs: {
        coi_mong: { name: 'Cõi Mộng', desc: 'Kích hoạt Shift vô hiệu hóa mọi sát thương của địch trong 2.5s (tối thiểu 6s giữa 2 lần kích hoạt) và đánh dấu toàn bộ kẻ địch trên màn hình (mỗi con nhận ngay 1 lớp Trọng Thương). Sau 1.65s, kẻ địch bị đánh dấu bùng nổ gây tối đa 50% sát thương đã tích lũy trong lúc bị đánh dấu cộng 15% HP đã mất của chúng, giới hạn 25% Max HP của chính nó, dưới dạng sát thương chuẩn.' },
        dong_chay_luan_hoi: { name: 'Dòng Chảy Luân Hồi', desc: 'Hạ Apostle: −1s hồi chiêu Skill D/F (−0.75s cho Skill A/S/Overload Laser); hạ Abnormal/Elite: −1.5s D/F (−1s các skill khác); hạ Dominator: −2s D/F (−1.5s các skill khác); hạ Egregor: −3s D/F (−2s các skill khác) - riêng phần giảm của A/S/Laser bị giới hạn tối đa 2s mỗi giây thực để 1 chuỗi hạ gục nhanh không reset gần như ngay lập tức. Mỗi lần di chuyển thực tế đủ 1 bề ngang màn hình cũng được −0.5s hồi chiêu Skill A/S/Overload Laser. Tốc độ nạp Phōtokrystos +50%, Skill G +35%. Skill D, Skill F và Overload Laser bắn ngay lập tức, bỏ qua hoàn toàn giai đoạn nạp (không ảnh hưởng Shift).' },
}};
