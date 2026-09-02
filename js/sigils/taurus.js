// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Taurus sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.taurus = {
        name: 'Taurus', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'doi_hinh_chien', name: 'Yuusha Party', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Summon a squad of 4 Sentinels that follow in formation above the player, one of each role (Tank 300 HP, Support/Marksman/Mage 200 HP each). Each member has its own HP bar and role-specific weapon, respawns 5s after falling (same role), and shares every buff real Sentinels get (Blessing, Gaia Protection/Barrier, Lunar Aegis, Last Stand, Glory for Justice). Enemy bullets passing near the squad can strike a member: Tanks draw ~75% of it. Piercing enemy attacks that would cost the player a life instead strike every living squad member at once, each taking 1.5x that same attack\'s real-Sentinel damage (non-piercing hits are unaffected). Every 1s, if no real Sentinels remain, 2 are spawned back in (2s cooldown).' },
            { id: 'hiep_luc', name: 'Squad Synergy', type: 'ATK', typeC: '#ef4444',
              desc: 'Tank: absorb meter fills from squad damage and from damage it soaks (30%) off real Sentinels\' hits; at 100 fires a piercing SentinelBlade sweep (40 + 4% EP true dmg per enemy) and heals itself 20 HP. Support: heals the 2 lowest-HP% targets across both the squad and real Sentinels for 50 HP each (never the player). Marksman: auto-fires a piercing arrow every 0.3s (75 + 5% EP). Mage: orbiting crystal flies to the nearest enemy roughly every 1s and detonates an arcane AoE zone (3s, 50 + 4% EP/tick).' },
        ]
};

SIGIL_I18N_VI.taurus = { name: 'Kim Ngưu', element: 'Thổ', buffs: {
        doi_hinh_chien: { name: 'Tổ Đội Dũng Giả', desc: 'Triệu hồi đội hình 4 Vệ Binh bám theo đội hình phía trên người chơi, đủ 4 vai trò (Tank 300 HP, Support/Marksman/Mage mỗi con 200 HP). Mỗi thành viên có thanh HP riêng, vũ khí theo vai trò, hồi sinh sau 5s nếu gục (giữ nguyên vai trò cũ), và nhận đủ mọi buff mà Vệ Binh thật có (Blessing, Gaia Protection/Barrier, Lunar Aegis, Last Stand, Glory for Justice). Đạn địch bay gần đội hình có thể trúng 1 thành viên, Tank hứng ~75% số đó. Đòn tấn công xuyên (piercing) của địch đáng lẽ khiến người chơi mất mạng sẽ đánh trúng CẢ 4 thành viên còn sống cùng lúc, mỗi đứa chịu 1.5 lần sát thương mà chính đòn đó gây lên Vệ Binh thật (đạn/đòn thường không xuyên thì không có cơ chế này). Mỗi 1s, nếu bản đồ không còn Vệ Binh thật nào thì tự động spawn lại 2 con (hồi chiêu 2s).' },
        hiep_luc: { name: 'Hiệp Lực Tổ Đội', desc: 'Tank: thanh hấp thụ đầy từ sát thương đội hình và từ phần dame nó gánh hộ (30%) mỗi khi Vệ Binh thật ăn đòn; đầy 100 → phóng lưỡi chém xuyên SentinelBlade (40 + 4% EP sát thương chuẩn mỗi kẻ địch) kèm tự hồi 20 HP. Support: hồi máu cho 2 mục tiêu %HP thấp nhất trong CẢ đội hình lẫn Vệ Binh thật (không phải người chơi), mỗi người 50 HP. Marksman: tự động bắn mũi tên xuyên mỗi 0.3s (75 + 5% EP). Mage: ngọc vệ tinh bay đến kẻ địch gần nhất khoảng mỗi 1s và nổ vùng arcane AoE (3s, 50 + 4% EP/tick).' },
}};
