// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Sagittarius sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.sagittarius = {
        name: 'Sagittarius', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'song_luoi', name: 'Twin Blades', type: 'ATK', typeC: '#ef4444',
              desc: 'Spirit slashes fire extra blades, boomerangs can multiply, Skill F throws 2 boomerangs and auto fire can launch arc blades. Also empowers the Spinner.' },
            { id: 'cuc_han', name: 'Arctic Chill', type: 'ATK', typeC: '#ef4444',
              desc: 'Boomerangs and arc slashes often slow enemies by 30% and pull them in. Remembrance Spirit and Phōtokrystos fire 20% faster. Also applies to the Spinner.' },
        ]
};

SIGIL_I18N_VI.sagittarius = { name: 'Nhân Mã', element: 'Hỏa', buffs: {
        song_luoi: { name: 'Song Lưỡi', desc: 'Tinh Linh chém thêm lưỡi kiếm, boomerang có thể nhân lên, Skill F ném 2 boomerang và đạn tự động có thể phóng lưỡi kiếm cung. Cũng tăng sức cho Spinner.' },
        cuc_han: { name: 'Cực Hàn', desc: 'Boomerang và chém cung thường làm chậm kẻ địch 30% và hút chúng lại. Tinh Linh Hoài Niệm và Phōtokrystos bắn nhanh hơn 20%. Cũng áp dụng cho Spinner.' },
}};
