// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Cancer sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.cancer = {
        name: 'Cancer', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'giap_nguyet', name: 'Lunar Aegis', type: 'DEF', typeC: '#3b82f6',
              desc: 'Gaia Protection activates without Glory for Justice; Gaia Barrier absorption +40%; sentinels gain +20% evade. Ocean Hunter: any enemy at 8% HP or below is instantly finished off by a killer whale lunging in.' },
            { id: 'trieu_hoi', name: 'Tidal Flow', type: 'HEAL', typeC: '#22c55e',
              desc: 'Sentinel regenerates 3% MaxHP/s (scales with tier); healing effectiveness +30%. Each sentinel gains 1 Iron Body layer; 8s CD starts only after it is consumed. If no sentinel is left, 2 are summoned back in (checked every 1s, 2s CD). Riptide Surge: absorbed hits feed a shared tide meter, plus a passive trickle scaling with how many sentinels are up (50/60/75 per s for 1/2/3+ alive); overflow banks up to +30% as a head start. Once full, press Space to erupt a whirlpool at every enemy on screen (up to 10, closest first), pulling everything nearby (CC-immune enemies and bullets included) toward center - anything caught takes 50 + 0.25% Max HP true damage every 100ms the whole time it exists - before bursting for 650 + 25% Max HP true damage when the whale bites.' },
        ]
};

SIGIL_I18N_VI.cancer = { name: 'Cự Giải', element: 'Thủy', buffs: {
        giap_nguyet: { name: 'Nguyệt Giáp', desc: 'Gaia Protection kích hoạt mà không cần Glory for Justice; khả năng hấp thụ của Gaia Barrier +40%; Vệ Binh nhận +20% né tránh. Sát Thủ Đại Dương: kẻ địch còn 8% HP trở xuống lập tức bị 1 con cá voi sát thủ lao vào cắn chết.' },
        trieu_hoi: { name: 'Triều Lưu', desc: 'Vệ Binh hồi 3% Max HP/s (tăng theo cấp bậc); hiệu quả hồi máu +30%. Mỗi Vệ Binh nhận 1 lớp Iron Body; hồi chiêu 8s chỉ bắt đầu sau khi lớp đó bị tiêu hao. Nếu không còn Vệ Binh nào, sẽ triệu hồi lại 2 con (kiểm tra mỗi 1s, hồi chiêu 2s). Triều Cường: đòn bị hấp thụ đổ vào 1 thanh triều dùng chung, cộng thêm lượng thụ động theo số Vệ Binh còn sống (50/60/75 mỗi giây ứng với 1/2/3+ con); tràn thanh được tích thêm tối đa +30% làm đà cho lần sau. Khi đầy, ấn Space để tạo xoáy nước tại từng kẻ địch trên màn hình (tối đa 10, gần nhất trước), hút mọi thứ quanh đó (kể cả kẻ địch miễn CC và đạn địch) vào tâm - thứ gì dính vào chịu 50 + 0.25% Max HP sát thương chuẩn mỗi 100ms suốt thời gian xoáy còn tồn tại - rồi nổ tung gây 650 + 25% Max HP sát thương chuẩn khi cá voi cắn xuống.' },
}};
