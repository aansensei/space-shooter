// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Cancer sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.cancer = {
        name: 'Cancer', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'giap_nguyet', name: 'Lunar Aegis', type: 'DEF', typeC: '#3b82f6',
              desc: 'Gaia Protection works without GFJ, Gaia Barrier absorbs 30% more and Sentinels gain 15% evade. A killer whale finishes any enemy at 8% HP or below.' },
            { id: 'trieu_hoi', name: 'Tidal Flow', type: 'HEAL', typeC: '#22c55e',
              desc: 'Sentinels regenerate, heal 30% better, gain an Iron Body layer and come back if all fall. Blocked hits fill a tide meter; when full, Space or CHARGE summons whirlpools that drag enemies in (Dominant) and burst.' },
        ]
};

SIGIL_I18N_VI.cancer = { name: 'Cự Giải', element: 'Thủy', buffs: {
        giap_nguyet: { name: 'Nguyệt Giáp', desc: 'Gaia Protection chạy không cần Glory for Justice, Gaia Barrier hấp thụ thêm 30%, Vệ Binh +15% né. Cá voi sát thủ kết liễu mọi kẻ địch còn 8% HP trở xuống.' },
        trieu_hoi: { name: 'Triều Lưu', desc: 'Vệ Binh tự hồi máu, hồi máu tốt hơn 30%, có 1 lớp Iron Body và được gọi lại nếu chết hết. Đòn bị chặn nạp thanh triều; khi đầy, Space hoặc CHARGE tạo xoáy nước hút kẻ địch (Áp Chế) rồi nổ tung.' },
}};
