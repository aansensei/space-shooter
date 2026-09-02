// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Gemini sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.gemini = {
        name: 'Gemini', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'bong_doi', name: 'Shadow Twin', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 10th hit landed by any allied source (Sentinels excluded) charges for 0.5s, then a phantom twin ship appears at a random screen edge and fires 3 volleys of piercing plasma orbs at random enemies, flying all the way across the screen. Each volley is 1 large orb flanked by 2 small orbs. Small orb: 75 + 3% EP dmg. Large orb: 180 + 8% EP dmg. Each hit applies 2 Vulnerability stacks and Soul Reaver. 0.5s cooldown before it can trigger again.' },
            { id: 'guong_laze', name: 'Mirror Laser', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Overload spawns 2 mirror entities (top-left & bottom-right) moving vertically in opposite directions (+25% speed), each firing a horizontal laser beam at 75% of the original beam damage. The original beam itself is buffed +30%. Additionally, every skill cast or auto-fire shot has a 5% chance (+0.3% per miss, resets on trigger) to fire a piercing green-purple laser column dealing 350 + 18% EP every 125ms for 3s — no enemy pull, stacks with Overload Laser (CD 4s).' },
        ]
};

SIGIL_I18N_VI.gemini = { name: 'Song Tử', element: 'Phong', buffs: {
        bong_doi: { name: 'Ảnh Song', desc: 'Mỗi đòn đánh trúng thứ 10 từ bất kỳ nguồn phe ta nào (trừ Vệ Binh) tích 0.5s, sau đó 1 tàu bóng ma xuất hiện ở một cạnh màn hình ngẫu nhiên và bắn 3 đợt cầu plasma xuyên phá vào kẻ địch ngẫu nhiên, bay xuyên suốt màn hình. Mỗi đợt gồm 1 cầu lớn kèm 2 cầu nhỏ. Cầu nhỏ: 75 + 3% EP sát thương. Cầu lớn: 180 + 8% EP sát thương. Mỗi lần trúng gây 2 lớp Trọng Thương và Soul Reaver. Hồi chiêu 0.5s trước khi kích hoạt lại.' },
        guong_laze: { name: 'Gương Quang Tuyến', desc: 'Overload Laser sinh ra 2 thực thể gương (trên-trái & dưới-phải) di chuyển dọc theo hướng ngược nhau (+25% tốc độ), mỗi cái bắn 1 tia laser ngang bằng 75% sát thương tia gốc. Tia gốc được buff +30%. Ngoài ra, mỗi lần dùng skill hoặc bắn tự động có 5% cơ hội (+0.3% mỗi lần trượt, reset khi kích hoạt) bắn ra 1 cột laser xanh-tím xuyên phá gây 350 + 18% EP mỗi 125ms trong 3s — không hút địch, cộng dồn với Overload Laser (hồi chiêu 4s).' },
}};
