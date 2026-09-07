// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Sagittarius sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.sagittarius = {
        name: 'Sagittarius', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'song_luoi', name: 'Twin Blades', type: 'ATK', typeC: '#ef4444',
              desc: 'Spirit arc slash fires 2 blades (+60% each, 2nd fires 15ms later), plus a 25% chance for a 3rd blade. Each boomerang has 40% chance for 2 extra. Skill F sweep now throws 2 boomerangs from the player instead of blade arcs. Extra blades have +20% radius. Every auto-fire shot has a 15% chance to fire an arc blade (300 + 7% Max HP), same as the spirit\'s.' },
            { id: 'cuc_han', name: 'Arctic Chill', type: 'ATK', typeC: '#ef4444',
              desc: 'Boomerang and arc slash: 75% chance to slow 30% for 2s and pull toward projectile. CC-immune targets are never pulled, but are still slowed. Remembrance Spirit and Phōtokrystos fire rate +30%.' },
        ]
};

SIGIL_I18N_VI.sagittarius = { name: 'Nhân Mã', element: 'Hỏa', buffs: {
        song_luoi: { name: 'Song Lưỡi', desc: 'Đòn chém cung của Tinh Linh bắn 2 lưỡi kiếm (+60% mỗi lưỡi, lưỡi thứ 2 bắn trễ 15ms), cộng thêm 25% cơ hội có lưỡi thứ 3. Mỗi boomerang có 40% cơ hội thêm 2 boomerang phụ. Skill F giờ ném 2 boomerang từ người chơi thay vì chém cung. Lưỡi kiếm phụ có +20% bán kính. Mỗi phát bắn tự động có 15% cơ hội bắn ra 1 lưỡi kiếm cung (300 + 7% Max HP), giống của Tinh Linh.' },
        cuc_han: { name: 'Cực Hàn', desc: 'Boomerang và chém cung: 75% cơ hội làm chậm 30% trong 2s và hút về phía đạn. Kẻ địch miễn nhiễm khống chế không bao giờ bị hút, nhưng vẫn bị chậm. Tốc độ bắn của Tinh Linh Hoài Niệm và Phōtokrystos +30%.' },
}};
