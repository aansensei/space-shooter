// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Zodiac Sigil system — 12 sigils, pick 1 at wave 5 and 1 at wave 10

const SIGIL_DEFS = {
    aries: {
        name: 'Aries', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'tien_phong', name: 'Vanguard', type: 'ATK', typeC: '#ef4444',
              desc: '50% chance for player & sentinel bullets to pierce enemies, +50% damage. Each pierce-chain hit: +30% dmg per chain, plus 3% of the enemy\'s Max HP as true damage (max 4 chains).' },
            { id: 'khat_chien', name: 'Onslaught', type: 'ATK', typeC: '#ef4444',
              desc: 'Every landed hit from any allied source (except Skill D and Skill F) can fire a fireball at whichever enemy the previous landed hit struck, dealing 100 + 15% of that hit\'s damage + 0.75% of the target\'s lost HP, plus 40% of that same hit as splash to other enemies within 70px (300ms CD).' },
        ]
    },
    taurus: {
        name: 'Taurus', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'thanh_dong', name: 'Iron Fortress', type: 'DEF', typeC: '#3b82f6',
              desc: 'Every 5s gain 1 Iron Body layer (max 3 stacks): absorbs 1 player hit or 1 normal chain root/silence. Shown as green hex rings on ship.' },
            { id: 'ho_ve', name: 'Guardian', type: 'DEF', typeC: '#3b82f6',
              desc: 'Sentinel +65% HP & +30% dmg. Sentinel normal shots no longer cost 1 HP recoil. When a sentinel dies, the remaining sentinels heal 10% of its EP and gain a shield worth 20% of its EP (CD 3.5s).' },
        ]
    },
    gemini: {
        name: 'Gemini', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'bong_doi', name: 'Shadow Twin', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 10th hit landed by any allied source (Sentinels excluded) charges for 0.5s, then a phantom twin ship appears at the middle of a random screen edge (left/right) and fires 3 volleys of piercing plasma orbs at random enemies, flying all the way across the screen. Each volley is 1 large orb flanked by 2 small orbs. Small orb: 75 + 3% EP dmg. Large orb: 175 + 8% EP dmg. Each hit applies 2 Vulnerability stacks and Soul Reaver. 1s cooldown before it can trigger again.' },
            { id: 'guong_laze', name: 'Mirror Laser', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Overload spawns 2 mirror entities (top-left & bottom-right) moving vertically in opposite directions (+25% speed), each firing a horizontal laser beam at 75% of the original beam damage. The original beam itself is buffed +30%. Additionally, every skill cast or auto-fire shot has a 5% chance (+0.3% per miss, resets on trigger) to fire a piercing green-purple laser column dealing 350 + 18% EP every 125ms for 3s — no enemy pull, stacks with Overload Laser (CD 4s).' },
        ]
    },
    cancer: {
        name: 'Cancer', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'giap_nguyet', name: 'Lunar Aegis', type: 'DEF', typeC: '#3b82f6',
              desc: 'Gaia Protection activates without Glory for Justice; Gaia Barrier absorption +40%; sentinels gain +20% evade' },
            { id: 'trieu_hoi', name: 'Tidal Flow', type: 'HEAL', typeC: '#22c55e',
              desc: 'Sentinel regenerates 3% MaxHP/s (scales with tier); healing effectiveness +30%. Each sentinel gains 1 Iron Body layer; 8s CD starts only after it is consumed.' },
        ]
    },
    leo: {
        name: 'Leo', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'su_tu_hong', name: "Lion's Roar", type: 'ATK', typeC: '#ef4444',
              desc: 'While GFJ active, attacks inflict Burn: 200 + 5% EP DoT per 500ms for 3s (resets on new hit, stacks x3). Burn bypasses 50% enemy DR. Attacks emit fire. Every hit also deals bonus damage equal to 2% of the target\'s own lost HP.' },
            { id: 'than_menh', name: 'Divine Fate', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Wave start: 5s freeze — all enemies stop moving (new spawns also frozen) + all damage +100%' },
        ]
    },
    virgo: {
        name: 'Virgo', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'mui_ten_vang', name: 'Forest Guardian', type: 'ATK', typeC: '#ef4444',
              desc: 'Every 6th auto volley triggers a Critical Strike: 4x damage, Vulnerability, root + silence 1s. Bullets glow gold. While 5+ enemies are on screen, every 4s a vine-wrapped wooden fist sweeps across the screen (60% of screen width), dealing 1000 + 10% EP + 15% of each target\'s lost HP.' },
            { id: 'ky_su_dien', name: 'Circuit Engineer', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla DoT & Coil +50% dmg; destroying a Coil reduces Skill G CD by 3s and increases G energy gain by 10%. Enemies carrying any debuff (slow, DoT, Vulnerability, Soul Reaver, etc.) take +50% damage from all sources.' },
        ]
    },
    libra: {
        name: 'Libra', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'mui_ten_apollo', name: "Blood Arrow", type: 'SPEC', typeC: '#f59e0b',
              desc: 'Each Skill A cast fires 3 arrows after a 0.5s windup: 1 big arrow marks the highest-EP enemy, the other 2 mark random enemies (biased toward denser clusters). Each arrow pierces all enemies (300 base dmg) and explodes on its marked target (400 base + 20% PE, up to +100% more from the target\'s DR). All hit enemies take 2 Vulnerability stacks. The 2 small arrows deal 40% less damage but fly 20% faster than the big one, which is also 15% bigger.' },
            { id: 'xuyen_pha', name: 'Astral Pierce', type: 'ATK', typeC: '#ef4444',
              desc: 'Skill A orbs pierce through their target on impact and continue flying to the screen edge, dealing hit damage to every enemy they cross. Orb size +30%.' },
        ]
    },
    scorpio: {
        name: 'Scorpio', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'hoan_sinh', name: 'Resurrection', type: 'HEAL', typeC: '#22c55e',
              desc: 'On pick: immediately gain +5 lives. Life bonus rate: +1 life per 250,000 pts (instead of 500,000)' },
            { id: 'tu_huyet', name: 'Death Mark', type: 'ATK', typeC: '#ef4444',
              desc: 'HP 100%→21%: +0%→+70% damage linearly. HP ≤20%: +80% damage from all sources. HP ≤5%: lightning instakill. Skill F blade arc pierces Iron Body. Enemies below 50% HP show a cyan warning ring.' },
        ]
    },
    sagittarius: {
        name: 'Sagittarius', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'song_luoi', name: 'Twin Blades', type: 'ATK', typeC: '#ef4444',
              desc: 'Spirit arc slash fires 2 blades (+60% each, 2nd fires 15ms later), plus a 25% chance for a 3rd blade. Each boomerang has 40% chance for 2 extra. Skill F sweep now throws 2 boomerangs from the player instead of blade arcs. Extra blades have +20% radius. Every auto-fire shot has a 15% chance to fire an arc blade (300 + 7% EP), same as the spirit\'s.' },
            { id: 'cuc_han', name: 'Arctic Chill', type: 'ATK', typeC: '#ef4444',
              desc: 'Boomerang and arc slash: 75% chance to slow 30% for 2s and pull toward projectile. CC-immune: no pull (25% chance to pull anyway, except Goliath — never), still slowed. Remembrance Spirit and Phōtokrystos fire rate +30%.' },
        ]
    },
    capricorn: {
        name: 'Capricorn', element: 'Earth', color: '#4D9B2A',
        buffs: [
            { id: 'lai_kep', name: 'Compound Interest', type: 'HEAL', typeC: '#22c55e',
              desc: 'Each kill grants +0.8% PE; every 5% PE gained increases all ally fire rate by 1.5% (max +40%, preserved through BTM). While the great spirit is alive, every ally attack deals +200 bonus true damage.' },
            { id: 'tuyet_lan', name: 'Avalanche', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Each kill grants +0.5% global damage (resets after 6s without a kill, max +70%)' },
        ]
    },
    aquarius: {
        name: 'Aquarius', element: 'Air', color: '#378ADD',
        buffs: [
            { id: 'set_day_chuyen', name: 'Chain Lightning', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Tesla DoT: 50% chain to nearest enemy within 150px. Skill G charge rate +35%. While Skill G is active, every energy orb that expires without pairing into a Tesla coil grants a stacking +15% ally dmg buff (max 6 stacks, 5s each), and is siphoned into an extra Skill A orb if Skill A has room.' },
            { id: 'dien_tu_truong', name: 'Magnetic Field', type: 'DEF', typeC: '#3b82f6',
              desc: 'While Skill G is active or fully charged, enemies within 300px are slowed 30% and suffer 3.5% MaxHP DoT/s' },
        ]
    },
    pisces: {
        name: 'Pisces', element: 'Water', color: '#7F77DD',
        buffs: [
            { id: 'coi_mong', name: 'Dream Realm', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Shift activation negates all enemy damage for 3s and marks all enemies on screen (each instantly takes 1 Vulnerability stack). After 1.65s, marked enemies burst for 60% of the damage they accumulated during the mark window plus 35% of their lost HP.' },
            { id: 'dong_chay_luan_hoi', name: 'Cycle of Flow', type: 'SPEC', typeC: '#f59e0b',
              desc: 'Kill apostle: −1s all skill CD; kill abnormal/elite: −1.5s; kill dominator: −2s; kill Egregor: −3s. Charge rate for Phōtokrystos and Skill G +50%. Skill D, Skill F and Overload Laser fire instantly, skipping their charge phase entirely (Shift unaffected).' },
        ]
    },
};

const SIGIL_ORDER = ['aries','taurus','gemini','cancer','leo','virgo',
                     'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

// Vietnamese display text for the sigil picker (name/element/buff name/buff
// desc only) — SIGIL_DEFS above stays English and is what all game LOGIC
// reads (ids, _hasBuff/_hasSigil, element comparisons in
// drawSigilShipUpgrades, etc.). Only _drawPickerCards' rendering path below
// swaps to this via _localizedSigil(); every other reader of SIGIL_DEFS is
// untouched, so a 'Fire'/'Air' element check elsewhere never sees a
// Vietnamese string.
const SIGIL_I18N_VI = {
    aries: { name: 'Bạch Dương', element: 'Hỏa', buffs: {
        tien_phong: { name: 'Tiên Phong', desc: "50% cơ hội đạn của người chơi & Vệ Binh xuyên qua kẻ địch, +50% sát thương. Mỗi lần xuyên chuỗi: +30% sát thương mỗi chuỗi, cộng thêm 3% Max HP của kẻ địch dưới dạng sát thương thật (tối đa 4 chuỗi)." },
        khat_chien: { name: 'Khát Chiến', desc: 'Mỗi đòn đánh trúng từ bất kỳ nguồn phe ta nào (trừ Skill D và Skill F) có thể bắn 1 quả cầu lửa vào kẻ địch bị đòn trước đó đánh trúng, gây 100 + 15% sát thương của đòn đó + 0.75% HP đã mất của mục tiêu, cộng thêm 40% sát thương đó lan sang kẻ địch khác trong bán kính 70px (hồi chiêu 300ms).' },
    }},
    taurus: { name: 'Kim Ngưu', element: 'Thổ', buffs: {
        thanh_dong: { name: 'Vương Cung Thành Trì', desc: 'Mỗi 5s nhận 1 lớp Iron Body (tối đa 3 lớp): hấp thụ 1 đòn đánh vào người chơi hoặc 1 lần trói/câm lặng thường. Hiển thị dưới dạng vòng lục giác xanh lá quanh tàu.' },
        ho_ve: { name: 'Hộ Vệ', desc: 'Vệ Binh +65% HP & +30% sát thương. Đạn thường của Vệ Binh không còn tốn 1 HP giật lùi. Khi 1 Vệ Binh bị kết liễu, các Vệ Binh còn lại hồi 10% EP của nó và nhận khiên trị giá 20% EP của nó (hồi chiêu 3.5s).' },
    }},
    gemini: { name: 'Song Tử', element: 'Phong', buffs: {
        bong_doi: { name: 'Ảnh Song', desc: 'Mỗi đòn đánh trúng thứ 10 từ bất kỳ nguồn phe ta nào (trừ Vệ Binh) tích 0.5s, sau đó 1 tàu bóng ma xuất hiện giữa cạnh màn hình ngẫu nhiên (trái/phải) và bắn 3 đợt cầu plasma xuyên phá vào kẻ địch ngẫu nhiên, bay xuyên suốt màn hình. Mỗi đợt gồm 1 cầu lớn kèm 2 cầu nhỏ. Cầu nhỏ: 75 + 3% EP sát thương. Cầu lớn: 175 + 8% EP sát thương. Mỗi lần trúng gây 2 lớp Trọng Thương và Soul Reaver. Hồi chiêu 1s trước khi kích hoạt lại.' },
        guong_laze: { name: 'Gương Quang Tuyến', desc: 'Overload Laser sinh ra 2 thực thể gương (trên-trái & dưới-phải) di chuyển dọc theo hướng ngược nhau (+25% tốc độ), mỗi cái bắn 1 tia laser ngang bằng 75% sát thương tia gốc. Tia gốc được buff +30%. Ngoài ra, mỗi lần dùng skill hoặc bắn tự động có 5% cơ hội (+0.3% mỗi lần trượt, reset khi kích hoạt) bắn ra 1 cột laser xanh-tím xuyên phá gây 350 + 18% EP mỗi 125ms trong 3s — không hút địch, cộng dồn với Overload Laser (hồi chiêu 4s).' },
    }},
    cancer: { name: 'Cự Giải', element: 'Thủy', buffs: {
        giap_nguyet: { name: 'Nguyệt Giáp', desc: 'Gaia Protection kích hoạt mà không cần Glory for Justice; khả năng hấp thụ của Gaia Barrier +40%; Vệ Binh nhận +20% né tránh' },
        trieu_hoi: { name: 'Triều Lưu', desc: 'Vệ Binh hồi 3% Max HP/s (tăng theo cấp bậc); hiệu quả hồi máu +30%. Mỗi Vệ Binh nhận 1 lớp Iron Body; hồi chiêu 8s chỉ bắt đầu sau khi lớp đó bị tiêu hao.' },
    }},
    leo: { name: 'Sư Tử', element: 'Hỏa', buffs: {
        su_tu_hong: { name: 'Sư Tử Hống', desc: 'Trong lúc Glory for Justice kích hoạt, đòn đánh gây Bỏng: 200 + 5% EP sát thương theo thời gian mỗi 500ms trong 3s (reset khi trúng đòn mới, cộng dồn x3). Bỏng xuyên 50% giáp kẻ địch. Đòn đánh phát ra lửa. Mỗi đòn còn gây thêm sát thương bằng 2% HP đã mất của mục tiêu.' },
        than_menh: { name: 'Thần Mệnh', desc: 'Đầu mỗi wave: đóng băng 5s — mọi kẻ địch ngừng di chuyển (kể cả địch mới xuất hiện) + toàn bộ sát thương +100%' },
    }},
    virgo: { name: 'Xử Nữ', element: 'Thổ', buffs: {
        mui_ten_vang: { name: 'Hộ Lâm', desc: 'Mỗi đợt bắn tự động thứ 6 kích hoạt Chí Mạng: sát thương x4, gây Trọng Thương, trói + câm lặng 1s. Đạn phát sáng vàng. Khi có 5+ kẻ địch trên màn hình, mỗi 4s 1 nắm đấm gỗ bọc dây leo quét ngang màn hình (60% chiều rộng màn hình), gây 1000 + 10% EP + 15% HP đã mất của mỗi mục tiêu.' },
        ky_su_dien: { name: 'Kỹ Sư Mạch', desc: 'Sát thương theo thời gian Tesla & Cuộn Tesla +50%; phá hủy 1 Cuộn Tesla giảm 3s hồi chiêu Skill G và tăng 10% tốc độ nạp năng lượng G. Kẻ địch mang bất kỳ hiệu ứng bất lợi nào (chậm, sát thương theo thời gian, Trọng Thương, Soul Reaver,...) nhận +50% sát thương từ mọi nguồn.' },
    }},
    libra: { name: 'Thiên Bình', element: 'Phong', buffs: {
        mui_ten_apollo: { name: 'Huyết Tiễn', desc: 'Mỗi lần dùng Skill A bắn 3 mũi tên sau 0.5s chuẩn bị: 1 mũi tên lớn đánh dấu kẻ địch có EP cao nhất, 2 mũi còn lại đánh dấu kẻ địch ngẫu nhiên (ưu tiên khu vực đông địch). Mỗi mũi tên xuyên qua mọi kẻ địch (300 sát thương gốc) và nổ trên mục tiêu bị đánh dấu (400 gốc + 20% EP, tăng thêm tối đa +100% từ giáp của mục tiêu). Mọi kẻ địch trúng đòn nhận 2 lớp Trọng Thương. 2 mũi tên nhỏ gây ít hơn 40% sát thương nhưng bay nhanh hơn 20% so với mũi lớn, vốn cũng to hơn 15%.' },
        xuyen_pha: { name: 'Tinh Xuyên', desc: 'Cầu năng lượng Skill A xuyên qua mục tiêu khi va chạm và tiếp tục bay tới mép màn hình, gây sát thương cho mọi kẻ địch nó đi qua. Kích thước cầu +30%.' },
    }},
    scorpio: { name: 'Bọ Cạp', element: 'Thủy', buffs: {
        hoan_sinh: { name: 'Hoàn Sinh', desc: 'Khi chọn: nhận ngay +5 mạng. Tỉ lệ thưởng mạng: +1 mạng mỗi 250,000 điểm (thay vì 500,000)' },
        tu_huyet: { name: 'Tử Ấn', desc: 'HP 100%→21%: sát thương tăng tuyến tính +0%→+70%. HP ≤20%: +80% sát thương từ mọi nguồn. HP ≤5%: sét đánh kết liễu ngay lập tức. Vòng cung lưỡi kiếm Skill F xuyên qua Iron Body. Kẻ địch dưới 50% HP hiện vòng cảnh báo màu xanh cyan.' },
    }},
    sagittarius: { name: 'Nhân Mã', element: 'Hỏa', buffs: {
        song_luoi: { name: 'Song Lưỡi', desc: 'Đòn chém cung của Tinh Linh bắn 2 lưỡi kiếm (+60% mỗi lưỡi, lưỡi thứ 2 bắn trễ 15ms), cộng thêm 25% cơ hội có lưỡi thứ 3. Mỗi boomerang có 40% cơ hội thêm 2 boomerang phụ. Skill F giờ ném 2 boomerang từ người chơi thay vì chém cung. Lưỡi kiếm phụ có +20% bán kính. Mỗi phát bắn tự động có 15% cơ hội bắn ra 1 lưỡi kiếm cung (300 + 7% EP), giống của Tinh Linh.' },
        cuc_han: { name: 'Cực Hàn', desc: 'Boomerang và chém cung: 75% cơ hội làm chậm 30% trong 2s và hút về phía đạn. Kẻ địch miễn nhiễm khống chế: không bị hút (vẫn có 25% cơ hội bị hút, trừ Goliath — không bao giờ), nhưng vẫn bị chậm. Tốc độ bắn của Tinh Linh Hoài Niệm và Phōtokrystos +30%.' },
    }},
    capricorn: { name: 'Ma Kết', element: 'Thổ', buffs: {
        lai_kep: { name: 'Lãi Kép', desc: 'Mỗi lần hạ gục nhận +0.8% EP; mỗi 5% EP nhận được tăng 1.5% tốc độ bắn của toàn phe ta (tối đa +40%, giữ nguyên qua BTM). Trong lúc đại tinh linh còn sống, mỗi đòn đánh của phe ta gây thêm +200 sát thương thật.' },
        tuyet_lan: { name: 'Tuyết Lăn', desc: 'Mỗi lần hạ gục nhận +0.5% sát thương toàn cục (reset sau 6s không hạ gục, tối đa +70%)' },
    }},
    aquarius: { name: 'Bảo Bình', element: 'Phong', buffs: {
        set_day_chuyen: { name: 'Liên Hoàn Lôi', desc: 'Sát thương theo thời gian Tesla: 50% cơ hội lan sang kẻ địch gần nhất trong bán kính 150px. Tốc độ nạp Skill G +35%. Trong lúc Skill G kích hoạt, mỗi cầu năng lượng hết hạn mà chưa ghép thành Cuộn Tesla sẽ cho +15% sát thương phe ta (cộng dồn, tối đa 6 lớp, mỗi lớp 5s), và được hút thành 1 cầu Skill A phụ nếu Skill A còn chỗ.' },
        dien_tu_truong: { name: 'Điện Từ Trường', desc: 'Trong lúc Skill G kích hoạt hoặc nạp đầy, kẻ địch trong bán kính 300px bị chậm 30% và chịu sát thương theo thời gian 3.5% Max HP/s' },
    }},
    pisces: { name: 'Song Ngư', element: 'Thủy', buffs: {
        coi_mong: { name: 'Cõi Mộng', desc: 'Kích hoạt Shift vô hiệu hóa mọi sát thương của địch trong 3s và đánh dấu toàn bộ kẻ địch trên màn hình (mỗi con nhận ngay 1 lớp Trọng Thương). Sau 1.65s, kẻ địch bị đánh dấu bùng nổ gây 60% sát thương đã tích lũy trong lúc bị đánh dấu cộng 35% HP đã mất của chúng.' },
        dong_chay_luan_hoi: { name: 'Dòng Chảy Luân Hồi', desc: 'Hạ Apostle: −1s hồi chiêu mọi skill; hạ Abnormal/Elite: −1.5s; hạ Dominator: −2s; hạ Egregor: −3s. Tốc độ nạp Phōtokrystos và Skill G +50%. Skill D, Skill F và Overload Laser bắn ngay lập tức, bỏ qua hoàn toàn giai đoạn nạp (không ảnh hưởng Shift).' },
    }},
};

// Returns a display-only copy of SIGIL_DEFS[sigilId] with name/element/buff
// name+desc swapped to Vietnamese when window._lang === 'vi' — used ONLY by
// the sigil-picker rendering path (_drawPickerCards and what it calls).
// SIGIL_DEFS itself is never mutated, so every other reader (game logic,
// drawSigilHUD, drawSigilShipUpgrades' element === 'Fire' checks, etc.)
// keeps seeing the real English data untouched.
function _localizedSigil(sigilId) {
    const def = SIGIL_DEFS[sigilId];
    if (!def) return def;
    if (window._lang !== 'vi' || !SIGIL_I18N_VI[sigilId]) return def;
    const vi = SIGIL_I18N_VI[sigilId];
    return {
        ...def,
        name: vi.name,
        element: vi.element,
        buffs: def.buffs.map(b => {
            const viBuff = vi.buffs[b.id];
            return viBuff ? { ...b, name: viBuff.name, desc: viBuff.desc } : b;
        }),
    };
}

function _hasSigil(id) { return (window._playerSigils || []).some(s => s.sigilId === id); }
function _hasBuff(id)  {
    return (window._playerSigils || []).some(s => {
        const def = SIGIL_DEFS[s.sigilId];
        return def && def.buffs.some(b => b.id === id);
    });
}

function _triggerSigilPicker() {
    const shuffled = _shuffleArray(window._sigilPool || []);
    const options = shuffled.slice(0, Math.min(4, shuffled.length));
    window._sigilPicker = {
        phase: 'slide_in',
        startTime: performance.now(),
        options,
        hoveredSigil: null,
        hoveredConfirm: false,
        selectedSigil: null,
        flyParticles: [],
        flyDone: false,
    };
    const ov = document.getElementById('sigil-pick-overlay');
    if (ov) ov.style.display = 'block';
    // Mobile skill buttons (#mc) sit in their own DOM layer above the canvas
    // (fixed z-index), independent of when the canvas draws the sigil picker
    // on top of them — pointer-events alone doesn't stop them rendering over
    // the cards. Hiding outright is correct anyway: skills aren't usable
    // before the run has even started.
    const mc = document.getElementById('mc');
    if (mc) { mc.style.pointerEvents = 'none'; mc.style.display = 'none'; }
    if (window.AudioMgr) window.AudioMgr.playSfx('sigil-open');
}

function _completeSigilPicker(sigilId) {
    window._playerSigils = window._playerSigils || [];
    window._playerSigils.push({ sigilId });
    window._sigilPool = (window._sigilPool || []).filter(id => id !== sigilId);
    const def = SIGIL_DEFS[sigilId];
    if (def) def.buffs.forEach(b => _onSigilApplied(sigilId, b.id));
    window._sigilPicker = null;
    _wavePhase = 'rest';
    _waveRestTimer = 3000;
    _waveForceEndTimer = 0;
    const ov = document.getElementById('sigil-pick-overlay');
    if (ov) ov.style.display = 'none';
    const mc = document.getElementById('mc');
    if (mc) {
        mc.style.pointerEvents = 'all';
        if (typeof _platform !== 'undefined' && _platform === 'mobile') mc.style.display = 'block';
    }
    // First sigil confirm swaps menu → random in-game BGM. Wave 5/10 re-picks
    // keep whatever in-game track is already playing.
    if (window.AudioMgr) {
        const cur = window.AudioMgr.currentBgmId();
        const curTrack = window.AudioMgr.list().find(t => t.id === cur);
        if (!curTrack || curTrack.menuOnly) window.AudioMgr.playRandomInGameBgm();
    }
}

function _onSigilApplied(sigilId, buffId) {
    if (buffId === 'tuyet_lan')    { window._tuyetLanStacks = 0; window._tuyetLanLastKill = 0; }
    if (buffId === 'bong_doi')     { window._bongDoiHitCount = 0; window._bongDoiCharging = false; window._bongDoiCooldownEnd = 0; }
    if (buffId === 'khat_chien')   { window._onslaughtLastEnemy = null; window._onslaughtCooldownEnd = 0; window._onslaughtOrbs = []; }
    if (buffId === 'mui_ten_vang') { window._muiTenVangHitCount = 0; }
    if (buffId === 'lai_kep')      { window._laiKepPEAccum = 0; window._laiKepFireRateBonus = 0; }
    if (buffId === 'thanh_dong')   { window._sigilIronBodyStacks = 0; window._sigilIronBodyNextAt = performance.now() + 8000; }
    if (buffId === 'su_tu_hong')   { window._sthBurning = new Map(); }
    if (buffId === 'ho_ve')        { window._hoVeShieldCooldownEnd = 0; }
    if (buffId === 'hoan_sinh')    { if (typeof lives !== 'undefined') lives += 5; }
}

function drawSigilPicker() {
    const p = window._sigilPicker;
    if (!p) return;
    const now = performance.now();

    if (p.phase === 'slide_in') {
        const t = Math.min(1, (now - p.startTime) / 350);
        const ease = 1 - Math.pow(1 - t, 3);
        if (t >= 1) { p.phase = 'choosing_sigil'; p.startTime = now; }
        _drawPickerCards(p, ease);
        return;
    }

    if (p.phase === 'choosing_sigil') {
        _drawPickerCards(p, 1);
        return;
    }

    if (p.phase === 'fly_in') {
        const elapsed = now - p.flyStart;
        _drawFlyIn(p, elapsed);
        if (elapsed >= 1000) _completeSigilPicker(p.selectedSigil);
        return;
    }
}

function _pickerLayout() {
    const isMob = typeof _platform !== 'undefined' && _platform === 'mobile';
    if (isMob) {
        const margin = 10;
        const panelPad = 12;
        const gapX = 8, gapY = 8;
        const cols = 2, rows = 2;
        const panelW = canvas.width - margin * 2;
        const cardW = Math.floor((panelW - panelPad * 2 - gapX) / 2);

        // Ideal (tablet-sized) budget. Short landscape phones can't fit this,
        // so scale cardH/detailH down until the panel fits canvas.height —
        // titleH/confirmH/padding stay fixed (already small, and confirmH
        // must stay tappable).
        const titleH = 26, confirmH = 44;
        let cardH = 160, detailH = 76;
        const availH = canvas.height - margin * 2;
        const neededH = rows * cardH + (rows - 1) * gapY + panelPad * 2 + titleH + confirmH + detailH + 6;
        if (neededH > availH) {
            const fixedH = panelPad * 2 + titleH + confirmH + (rows - 1) * gapY + 6;
            const flexAvail = Math.max(150, availH - fixedH);
            const flexNeeded = rows * cardH + detailH;
            const scale = flexAvail / flexNeeded;
            cardH = Math.max(58, Math.floor(cardH * scale));
            detailH = Math.max(0, Math.floor(detailH * scale));
        }

        const panelH = rows * cardH + (rows - 1) * gapY + panelPad * 2 + titleH + confirmH + detailH + 6;
        const panelX = (canvas.width - panelW) / 2;
        const panelY = Math.max(6, (canvas.height - panelH) / 2);
        return { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob, confirmH };
    }
    const margin = 32;
    const available = canvas.width - margin * 2;
    const cardW = Math.min(210, Math.max(150, (available - 30) / 4));
    const cardH = 310;
    const gapX = (available - cardW * 4) / 3;
    const gapY = 0;
    const cols = 4, rows = 1;
    const panelPad = 24;
    const titleH = 50;
    const panelW = available + panelPad * 2;
    const panelH = cardH + panelPad * 2 + titleH + 56 + 100 + 6;
    const panelX = (canvas.width - panelW) / 2;
    const panelY = (canvas.height - panelH) / 2 - 20;
    return { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob: false };
}

function _drawDetailPanel(def, x, y, w, alpha) {
    const [r, g, b] = _hexRgb3(def.color);
    const lineH = 13, pad = 10, badgeW = 38;
    const maxW = w - pad * 2;

    ctx.save();
    ctx.globalAlpha = alpha * 0.97;
    ctx.fillStyle = `rgba(4,10,28,0.95)`;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.65)`;
    ctx.lineWidth = 1.2;

    // Measure height dynamically
    ctx.font = `9px sans-serif`;
    const _measH = (desc) => {
        const words = desc.split(' ');
        let line = '', lines = 0;
        for (const wd of words) {
            const test = line ? line + ' ' + wd : wd;
            if (ctx.measureText(test).width > maxW - badgeW - 8 && line) { lines++; line = wd; } else { line = test; }
        }
        if (line) lines++;
        return lines;
    };
    const b1lines = Math.max(1, _measH(def.buffs[0].desc));
    const b2lines = Math.max(1, _measH(def.buffs[1].desc));
    const rowH1 = 14 + b1lines * lineH;
    const rowH2 = 14 + b2lines * lineH;
    const panH = pad + rowH1 + 6 + rowH2 + pad;

    _drawRoundRect(x, y, w, panH, 6);
    ctx.fill();
    _drawRoundRect(x, y, w, panH, 6);
    ctx.stroke();

    const drawBuff = (buff, ty) => {
        ctx.fillStyle = buff.typeC + 'bb';
        _drawRoundRect(x + pad, ty, badgeW, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 8px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(buff.type, x + pad + badgeW / 2, ty + 10);
        ctx.fillStyle = '#e8f4ff';
        ctx.font = `bold 10px "Courier New", monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(buff.name, x + pad + badgeW + 6, ty + 10);
        ctx.fillStyle = 'rgba(180,210,240,0.95)';
        ctx.font = `9px sans-serif`;
        _wrapText(buff.desc, x + pad, ty + 22, maxW, lineH, 6);
    };

    drawBuff(def.buffs[0], y + pad);
    drawBuff(def.buffs[1], y + pad + rowH1 + 6);
    ctx.restore();
}

function _drawPickerCards(p, slideEase) {
    const now = performance.now();
    const L = _pickerLayout();
    const { cardW, cardH, gapX, gapY, cols, rows, panelPad, panelW, panelH, panelX, panelY, titleH, isMob } = L;
    const yOff = (1 - slideEase) * -300;
    const hasSelected = p.selectedSigil != null;

    ctx.save();

    ctx.globalAlpha = slideEase * 0.94;
    ctx.fillStyle = 'rgba(0,2,14,0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = slideEase;
    ctx.fillStyle = 'rgba(4,12,34,0.98)';
    _drawRoundRect(panelX, panelY + yOff, panelW, panelH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,140,255,0.65)';
    ctx.lineWidth = 1.5;
    _drawRoundRect(panelX, panelY + yOff, panelW, panelH, 12);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8dcff';
    ctx.font = `bold ${isMob ? 11 : 13}px "Courier New", monospace`;
    const sigilCount = (window._playerSigils || []).length + 1;
    const _tt = (typeof window._t === 'function') ? window._t : (k => k);
    const titleLabel = isMob
        ? `${_tt('sigilPicker.title')} ${sigilCount}/3 — ${_tt('sigilPicker.chooseSeal')}`
        : `${_tt('sigilPicker.title')}  ${sigilCount} / 3  —  ${_tt('sigilPicker.chooseSeal')}`;
    ctx.fillText(titleLabel, canvas.width / 2, panelY + yOff + (isMob ? 26 : 26));

    const startX = panelX + panelPad;
    const startY = panelY + yOff + panelPad + titleH;
    for (let i = 0; i < p.options.length; i++) {
        const sigilId = p.options[i];
        const def = _localizedSigil(sigilId);
        if (!def) continue;
        const col = isMob ? i % cols : i;
        const row = isMob ? Math.floor(i / cols) : 0;
        const cx = startX + col * (cardW + gapX) + cardW / 2;
        const cy = startY + row * (cardH + gapY) + cardH / 2;
        _drawSigilCard(cx, cy, cardW, cardH, sigilId, def, p.hoveredSigil === sigilId, p.selectedSigil === sigilId, now, isMob);
    }

    // Detail panel: shown for hovered card (PC) or selected card (mobile)
    const _detailId = isMob ? p.selectedSigil : p.hoveredSigil;
    if (_detailId) {
        const _dd = _localizedSigil(_detailId);
        if (_dd) {
            const cardsBottom = startY + (isMob ? rows : 1) * (cardH + gapY);
            _drawDetailPanel(_dd, panelX + panelPad, cardsBottom + 6, panelW - panelPad * 2, slideEase);
        }
    }

    const btn = _sigilConfirmRect(L, yOff);
    ctx.globalAlpha = slideEase;
    ctx.strokeStyle = 'rgba(60,90,160,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 40, btn.y - 10);
    ctx.lineTo(panelX + panelW - 40, btn.y - 10);
    ctx.stroke();

    ctx.globalAlpha = slideEase * (hasSelected ? 1.0 : 0.30);
    const selDef = hasSelected ? SIGIL_DEFS[p.selectedSigil] : null;
    const [br, bg, bb] = selDef ? _hexRgb3(selDef.color) : [80, 120, 255];
    ctx.fillStyle = hasSelected ? `rgba(${br},${bg},${bb},0.22)` : 'rgba(40,50,80,0.22)';
    _drawRoundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.strokeStyle = hasSelected ? `rgba(${br},${bg},${bb},${p.hoveredConfirm ? 1.0 : 0.75})` : 'rgba(60,80,120,0.40)';
    ctx.lineWidth = hasSelected && p.hoveredConfirm ? 2.5 : 1.5;
    _drawRoundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();
    if (hasSelected && p.hoveredConfirm) {
        ctx.fillStyle = `rgba(${br},${bg},${bb},0.08)`;
        _drawRoundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
    }
    ctx.fillStyle = hasSelected ? '#e8f0ff' : '#444860';
    ctx.font = `bold ${isMob ? 13 : 15}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText(_tt('sigilPicker.confirm'), btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
    ctx.letterSpacing = '0px';

    // Reroll button — shared pool of 2 uses across all 3 sigil picks in a game
    const rerollsLeft = window._sigilRerollsLeft || 0;
    const canReroll = rerollsLeft > 0;
    const rbtn = _sigilRerollRect(L, yOff);
    const rPulse = 0.55 + 0.45 * Math.sin(now / 400);
    ctx.globalAlpha = slideEase * (canReroll ? 1.0 : 0.30);
    ctx.fillStyle = canReroll ? `rgba(180,140,60,${p.hoveredReroll ? 0.32 : 0.16})` : 'rgba(40,50,80,0.18)';
    _drawRoundRect(rbtn.x, rbtn.y, rbtn.w, rbtn.h, 8);
    ctx.fill();
    ctx.strokeStyle = canReroll ? `rgba(230,180,80,${p.hoveredReroll ? 1.0 : 0.55 + 0.2 * rPulse})` : 'rgba(60,80,120,0.40)';
    ctx.lineWidth = canReroll && p.hoveredReroll ? 2.5 : 1.5;
    _drawRoundRect(rbtn.x, rbtn.y, rbtn.w, rbtn.h, 8);
    ctx.stroke();
    if (canReroll && p.hoveredReroll) {
        ctx.fillStyle = 'rgba(230,180,80,0.08)';
        _drawRoundRect(rbtn.x, rbtn.y, rbtn.w, rbtn.h, 8);
        ctx.fill();
    }
    ctx.fillStyle = canReroll ? '#ffe9b0' : '#444860';
    ctx.font = `bold ${isMob ? 9 : 12}px "Courier New", monospace`;
    ctx.letterSpacing = isMob ? '0px' : '1px';
    const rLabel = isMob ? `↻ ${rerollsLeft}` : `↻ ${_tt('sigilPicker.reroll')} (${rerollsLeft})`;
    ctx.fillText(rLabel, rbtn.x + rbtn.w / 2, rbtn.y + rbtn.h / 2 + 4);
    ctx.letterSpacing = '0px';

    // Reroll flash: brief white overlay across the cards on a successful reroll
    if (p.rerollFlash) {
        const flashT = (now - p.rerollFlash) / 300;
        if (flashT < 1) {
            const cardsW = cols * cardW + (cols - 1) * gapX;
            const cardsH = rows * cardH + (rows - 1) * gapY;
            ctx.globalAlpha = slideEase * (1 - flashT) * 0.5;
            ctx.fillStyle = '#ffffff';
            _drawRoundRect(startX, startY, cardsW, cardsH, 8);
            ctx.fill();
        } else {
            p.rerollFlash = null;
        }
    }

    ctx.restore();
}

function _sigilConfirmRect(L, yOff) {
    yOff = yOff || 0;
    L = L || _pickerLayout();
    const w = L.isMob ? Math.min(200, L.panelW - 32) : 200;
    const h = 42;
    return { x: L.panelX + (L.panelW - w) / 2, y: L.panelY + yOff + L.panelH - h - 14, w, h };
}

function _sigilRerollRect(L, yOff) {
    yOff = yOff || 0;
    L = L || _pickerLayout();
    const confirmBtn = _sigilConfirmRect(L, yOff);
    const w = L.isMob ? 64 : 130;
    const h = 42;
    const gap = L.isMob ? 6 : 14;
    return { x: confirmBtn.x + confirmBtn.w + gap, y: confirmBtn.y, w, h };
}

function _drawSigilCard(cx, cy, w, h, sigilId, def, isHovered, isSelected, now, compact) {
    const x = cx - w / 2, y = cy - h / 2;
    const [r, g, b] = _hexRgb3(def.color);

    ctx.save();

    const bgAlpha = isSelected ? 0.45 : (isHovered ? 0.32 : 0.18);
    ctx.fillStyle = `rgba(${r},${g},${b},${bgAlpha})`;
    _drawRoundRect(x, y, w, h, 8);
    ctx.fill();

    const borderAlpha = isSelected ? 1.0 : (isHovered ? 0.92 : 0.65);
    ctx.strokeStyle = `rgba(${r},${g},${b},${borderAlpha})`;
    ctx.lineWidth = isSelected ? 2.5 : (isHovered ? 1.8 : 1.2);
    _drawRoundRect(x, y, w, h, 8);
    ctx.stroke();

    if (isSelected) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 350);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 + 0.35 * pulse})`;
        ctx.lineWidth = 6;
        _drawRoundRect(x - 3, y - 3, w + 6, h + 6, 11);
        ctx.stroke();
    }

    const symR = compact ? 20 : 34;
    const symCy = compact ? y + 32 : y + 54;
    const symCx = cx;

    ctx.fillStyle = `rgba(${r},${g},${b},${isSelected ? 0.20 : 0.10})`;
    ctx.beginPath(); ctx.arc(symCx, symCy, symR + 4, 0, Math.PI * 2); ctx.fill();

    if (isHovered || isSelected) {
        const glow = 0.5 + 0.5 * Math.sin(now / 400);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 + 0.4 * glow})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(symCx, symCy, symR + (compact ? 6 : 8), 0, Math.PI * 2); ctx.stroke();
    }

    _drawZodiacGlyph(sigilId, symCx, symCy, symR * 0.72, def.color);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0f4ff';
    ctx.font = `bold ${compact ? 11 : 13}px "Courier New", monospace`;
    ctx.fillText(def.name, cx, compact ? y + 62 : y + 116);

    ctx.fillStyle = `rgba(${r},${g},${b},1.0)`;
    ctx.font = `${compact ? 9 : 10}px "Courier New", monospace`;
    ctx.fillText(def.element, cx, compact ? y + 73 : y + 131);

    ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
    ctx.lineWidth = 0.8;
    const divY = compact ? y + 80 : y + 141;
    ctx.beginPath(); ctx.moveTo(x + 12, divY); ctx.lineTo(x + w - 12, divY); ctx.stroke();

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    _drawMiniBuffRow(cx, compact ? y + 90 : y + 160, w - (compact ? 12 : 20), def.buffs[0], compact ? 1 : 2);
    _drawMiniBuffRow(cx, compact ? y + 140 : y + 228, w - (compact ? 12 : 20), def.buffs[1], compact ? 1 : 2);

    ctx.restore();
}

function _drawMiniBuffRow(cx, topY, maxW, buff, maxLines) {
    maxLines = maxLines || 2;
    ctx.save();
    ctx.fillStyle = buff.typeC + 'aa';
    _drawRoundRect(cx - maxW / 2, topY, 38, 15, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 9px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(buff.type, cx - maxW / 2 + 19, topY + 11);

    ctx.fillStyle = '#e8f0ff';
    ctx.font = `bold ${maxLines === 1 ? 10 : 11}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(buff.name, cx - maxW / 2 + 44, topY + 11);

    ctx.fillStyle = 'rgba(180,200,230,1.0)';
    ctx.font = `${maxLines === 1 ? 9 : 10}px sans-serif`;
    _wrapText(buff.desc, cx - maxW / 2, topY + 24, maxW, 12, maxLines);
    ctx.restore();
}

function _wrapText(text, x, y, maxW, lineH, maxLines) {
    const words = text.split(' ');
    let line = '', lines = [];
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line); line = word;
            if (lines.length >= maxLines) break;
        } else { line = test; }
    }
    if (lines.length < maxLines && line) lines.push(line);
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
}

function _drawFlyIn(p, elapsed) {
    const def = SIGIL_DEFS[p.selectedSigil];
    if (!def) return;
    const [r, g, b] = _hexRgb3(def.color);
    const progress = Math.min(1, elapsed / 1000);

    ctx.save();

    ctx.globalAlpha = 1 - progress * 0.8;
    ctx.fillStyle = 'rgba(0,2,10,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!p.flyParticles) p.flyParticles = [];
    if (elapsed < 600 && p.flyParticles.length < 80) {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 80;
            p.flyParticles.push({
                x: canvas.width / 2 + Math.cos(angle) * dist,
                y: canvas.height / 2 + Math.sin(angle) * dist,
                targetX: player.x, targetY: player.y,
                speed: 0.8 + Math.random() * 1.2,
                size: 3 + Math.random() * 4,
                alpha: 0.8 + Math.random() * 0.2,
            });
        }
    }

    for (const fp of p.flyParticles) {
        const dx = fp.targetX - fp.x, dy = fp.targetY - fp.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) { fp.x += (dx / dist) * fp.speed * 8; fp.y += (dy / dist) * fp.speed * 8; }
        ctx.globalAlpha = fp.alpha * (1 - progress);
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(fp.x, fp.y, fp.size * (1 - progress * 0.5), 0, Math.PI * 2); ctx.fill();
    }

    const burstA = Math.max(0, 1 - elapsed / 400);
    if (burstA > 0) {
        ctx.globalAlpha = burstA * 0.9;
        const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, 120);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (progress > 0.6) {
        const landA = (progress - 0.6) / 0.4;
        ctx.globalAlpha = landA;
        _drawZodiacGlyph(p.selectedSigil, player.x, player.y, 28 * (1 + landA), def.color);
    }

    ctx.restore();
}

function _drawZodiacGlyph(id, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    switch (id) {
        case 'aries': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r * 0.45);
            ctx.lineTo(cx, cy + r * 0.02);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx - r * 0.42, cy + r * 0.08, r * 0.44, Math.PI * 0.05, Math.PI * 0.85, true);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + r * 0.42, cy + r * 0.08, r * 0.44, Math.PI * 0.15, Math.PI * 0.95, false);
            ctx.stroke();
            break;
        }
        case 'taurus': {
            ctx.beginPath();
            ctx.arc(cx, cy + r * 0.18, r * 0.44, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy - r * 0.24, r * 0.48, Math.PI * 0.08, Math.PI * 0.92, false);
            ctx.stroke();
            break;
        }
        case 'gemini': {
            const lx = cx - r * 0.28, rx = cx + r * 0.28;
            const ty = cy - r * 0.5, by = cy + r * 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.55, ty); ctx.lineTo(cx + r * 0.55, ty);
            ctx.moveTo(cx - r * 0.55, by); ctx.lineTo(cx + r * 0.55, by);
            ctx.moveTo(lx, ty); ctx.lineTo(lx, by);
            ctx.moveTo(rx, ty); ctx.lineTo(rx, by);
            ctx.stroke();
            break;
        }
        case 'cancer': {
            ctx.beginPath();
            ctx.arc(cx + r * 0.18, cy - r * 0.18, r * 0.35, Math.PI * 0.2, Math.PI * 1.9, false);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx - r * 0.18, cy + r * 0.18, r * 0.35, Math.PI * 1.2, Math.PI * 2.9, false);
            ctx.stroke();
            break;
        }
        case 'leo': {
            ctx.beginPath();
            ctx.arc(cx - r * 0.15, cy - r * 0.1, r * 0.38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.23, cy - r * 0.1);
            ctx.bezierCurveTo(cx + r * 0.75, cy - r * 0.08, cx + r * 0.78, cy - r * 0.62, cx + r * 0.38, cy - r * 0.6);
            ctx.stroke();
            break;
        }
        case 'virgo': {
            const bY = cy + r * 0.48, tY = cy - r * 0.48, lX = cx - r * 0.52;
            ctx.beginPath();
            ctx.moveTo(lX, bY);
            ctx.lineTo(lX, tY);
            ctx.arc(lX + r * 0.26, tY, r * 0.26, Math.PI, 0, false);
            ctx.arc(cx + r * 0.26, tY, r * 0.26, Math.PI, 0, false);
            ctx.lineTo(cx + r * 0.52, cy + r * 0.22);
            ctx.bezierCurveTo(cx + r * 0.52, cy + r * 0.55, cx + r * 0.18, cy + r * 0.55, cx + r * 0.18, cy + r * 0.22);
            ctx.stroke();
            break;
        }
        case 'libra': {
            const baseY = cy + r * 0.48, midY = cy + r * 0.1;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.58, baseY); ctx.lineTo(cx + r * 0.58, baseY);
            ctx.moveTo(cx - r * 0.52, midY);  ctx.lineTo(cx + r * 0.52, midY);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, midY, r * 0.42, Math.PI, 0, false);
            ctx.stroke();
            break;
        }
        case 'scorpio': {
            const bY2 = cy + r * 0.38, tY2 = cy - r * 0.48, lX2 = cx - r * 0.52;
            ctx.beginPath();
            ctx.moveTo(lX2, bY2);
            ctx.lineTo(lX2, tY2);
            ctx.arc(lX2 + r * 0.26, tY2, r * 0.26, Math.PI, 0, false);
            ctx.arc(cx + r * 0.26, tY2, r * 0.26, Math.PI, 0, false);
            ctx.lineTo(cx + r * 0.52, cy + r * 0.15);
            ctx.bezierCurveTo(cx + r * 0.52, cy + r * 0.52, cx + r * 0.62, cy + r * 0.52, cx + r * 0.62, cy + r * 0.22);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.62, cy + r * 0.22);
            ctx.lineTo(cx + r * 0.45, cy + r * 0.42);
            ctx.moveTo(cx + r * 0.62, cy + r * 0.22);
            ctx.lineTo(cx + r * 0.78, cy + r * 0.42);
            ctx.stroke();
            break;
        }
        case 'sagittarius': {
            const ax1 = cx - r * 0.52, ay1 = cy + r * 0.52;
            const ax2 = cx + r * 0.52, ay2 = cy - r * 0.52;
            ctx.beginPath();
            ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2);
            ctx.moveTo(ax2, ay2); ctx.lineTo(ax2 - r * 0.35, ay2);
            ctx.moveTo(ax2, ay2); ctx.lineTo(ax2, ay2 + r * 0.35);
            ctx.moveTo(cx - r * 0.28, cy + r * 0.28); ctx.lineTo(cx + r * 0.28, cy - r * 0.28);
            ctx.stroke();
            break;
        }
        case 'capricorn': {
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.45);
            ctx.bezierCurveTo(cx - r * 0.5, cy + r * 0.28, cx, cy + r * 0.38, cx, cy - r * 0.02);
            ctx.bezierCurveTo(cx, cy - r * 0.5, cx + r * 0.52, cy - r * 0.5, cx + r * 0.48, cy - r * 0.04);
            ctx.bezierCurveTo(cx + r * 0.44, cy + r * 0.42, cx - r * 0.05, cy + r * 0.52, cx - r * 0.05, cy + r * 0.2);
            ctx.stroke();
            break;
        }
        case 'aquarius': {
            const wY1 = cy - r * 0.22, wY2 = cy + r * 0.22;
            const wA = r * 0.22, wL = r * 0.55;
            ctx.beginPath();
            ctx.moveTo(cx - wL, wY1);
            ctx.bezierCurveTo(cx - wL * 0.5, wY1 - wA, cx - wL * 0.5, wY1 - wA, cx, wY1);
            ctx.bezierCurveTo(cx + wL * 0.5, wY1 + wA, cx + wL * 0.5, wY1 + wA, cx + wL, wY1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - wL, wY2);
            ctx.bezierCurveTo(cx - wL * 0.5, wY2 - wA, cx - wL * 0.5, wY2 - wA, cx, wY2);
            ctx.bezierCurveTo(cx + wL * 0.5, wY2 + wA, cx + wL * 0.5, wY2 + wA, cx + wL, wY2);
            ctx.stroke();
            break;
        }
        case 'pisces': {
            ctx.beginPath();
            ctx.arc(cx - r * 0.14, cy, r * 0.42, Math.PI * 0.5, Math.PI * 1.5, true);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + r * 0.14, cy, r * 0.42, Math.PI * 0.5, Math.PI * 1.5, false);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.55, cy); ctx.lineTo(cx + r * 0.55, cy);
            ctx.stroke();
            break;
        }
    }

    ctx.restore();
}

function drawSigilHUD() {
    const sigils = window._playerSigils || [];
    const now = performance.now();

    const isMob = typeof _platform !== 'undefined' && _platform === 'mobile';

    const R = 20;
    const slotGap = 8;
    const panelW = R * 2 + 16;
    const panelH = 3 * (R * 2) + 2 * slotGap + 20;
    const panelX = canvas.width - panelW - 12;
    // Anchor below the real stats HUD panel (js/render/core.js), which
    // publishes its own actual bottom edge — avoids the two files keeping
    // separate copies of the same height formula that could drift apart.
    const hH = (isMob ? 158 : 198) + (_yuukiBonus > 0 ? (isMob ? 22 : 26) : 0);
    const statsHudBottom = typeof window._statsHudBottom === 'number' ? window._statsHudBottom : (10 + hH);
    const panelY = statsHudBottom + 6;

    ctx.save();

    ctx.fillStyle = 'rgba(0,4,14,0.60)';
    _drawRoundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,80,160,0.35)';
    ctx.lineWidth = 1;
    _drawRoundRect(panelX, panelY, panelW, panelH, 8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(100,130,200,0.45)';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIGIL', panelX + panelW / 2, panelY + 9);

    for (let i = 0; i < 3; i++) {
        const cx = panelX + panelW / 2;
        const cy = panelY + 16 + R + i * (R * 2 + slotGap);
        const ps = sigils[i];
        const def = ps ? SIGIL_DEFS[ps.sigilId] : null;
        const pulse = 0.5 + 0.5 * Math.sin(now / 1000 + i * 1.1);

        if (def) {
            const [r, g, b] = _hexRgb3(def.color);

            ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = `rgba(${r},${g},${b},${0.55 + 0.35 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

            ctx.shadowColor = def.color;
            ctx.shadowBlur = 4 + 5 * pulse;
            _drawZodiacGlyph(ps.sigilId, cx, cy, R * 0.58, def.color);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = 'rgba(12,18,40,0.55)';
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = 'rgba(40,60,110,0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = 'rgba(50,70,120,0.30)';
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(['I','II','III'][i], cx, cy + 4);
        }
    }

    ctx.restore();
}

function drawSigilShipUpgrades() {
    const sigils = window._playerSigils || [];
    if (sigils.length === 0) return;
    const now = performance.now();

    ctx.save();
    for (let si = 0; si < sigils.length; si++) {
        const ps = sigils[si];
        const def = SIGIL_DEFS[ps.sigilId];
        if (!def) continue;
        const [r, g, b] = _hexRgb3(def.color);
        const pulse = 0.5 + 0.5 * Math.sin(now / 800 + si * Math.PI);
        const xSide = si === 0 ? -1 : 1;
        const runeX = player.x + xSide * 20;
        const runeY = player.y + 14;

        ctx.globalAlpha = 0.55 + 0.25 * pulse;
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 4 + 4 * pulse;
        _drawZodiacGlyph(ps.sigilId, runeX, runeY, 7, def.color);

        if (def.element === 'Fire') {
            ctx.globalAlpha = 0.22 * pulse;
            ctx.fillStyle = `rgba(${r},${g},${b},1)`;
            ctx.beginPath();
            ctx.arc(player.x + xSide * 6, player.y + 27, 4 + 3 * pulse, 0, Math.PI * 2);
            ctx.fill();
        } else if (def.element === 'Air') {
            ctx.globalAlpha = 0.18 * pulse;
            ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(player.x - 28, player.y + 10);
            ctx.lineTo(player.x + 28, player.y + 10);
            ctx.stroke();
        }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}

function _drawRoundRect(x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

function _hexRgb3(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function _pickerCardHitTest(ex, ey, L) {
    const { cardW, cardH, gapX, gapY, cols, panelPad, panelX, panelY, titleH } = L;
    const startX = panelX + panelPad;
    const startY = panelY + panelPad + titleH;
    for (let i = 0; i < 4; i++) {
        const col = L.isMob ? i % cols : i;
        const row = L.isMob ? Math.floor(i / cols) : 0;
        const cx = startX + col * (cardW + gapX);
        const cy = startY + row * (cardH + gapY);
        if (ex >= cx && ex <= cx + cardW && ey >= cy && ey <= cy + cardH) return i;
    }
    return -1;
}

function _handleSigilPickerClick(ex, ey) {
    const p = window._sigilPicker;
    if (!p || p.phase !== 'choosing_sigil') return;

    const L = _pickerLayout();
    const idx = _pickerCardHitTest(ex, ey, L);
    if (idx >= 0 && idx < p.options.length) {
        p.hoveredSigil = p.options[idx];
        p.selectedSigil = p.options[idx];
        if (window.AudioMgr) window.AudioMgr.playSfx('click');
        return;
    }

    if ((window._sigilRerollsLeft || 0) > 0) {
        const rbtn = _sigilRerollRect(L, 0);
        if (ex >= rbtn.x && ex <= rbtn.x + rbtn.w && ey >= rbtn.y && ey <= rbtn.y + rbtn.h) {
            window._sigilRerollsLeft--;
            p.options = _shuffleArray(window._sigilPool || []).slice(0, Math.min(4, (window._sigilPool || []).length));
            p.selectedSigil = null;
            p.hoveredSigil = null;
            p.rerollFlash = performance.now();
            if (window.AudioMgr) window.AudioMgr.playSfx('sigil-confirm');
            return;
        }
    }

    if (p.selectedSigil) {
        const btn = _sigilConfirmRect(L, 0);
        if (ex >= btn.x && ex <= btn.x + btn.w && ey >= btn.y && ey <= btn.y + btn.h) {
            p.phase = 'fly_in';
            p.flyStart = performance.now();
            p.flyParticles = [];
            if (window.AudioMgr) window.AudioMgr.playSfx('sigil-confirm');
        }
    }
}

function _handleSigilPickerMouseMove(ex, ey) {
    const p = window._sigilPicker;
    if (!p || p.phase !== 'choosing_sigil') return;

    const L = _pickerLayout();
    const prevSigil = p.hoveredSigil;
    const prevConfirm = p.hoveredConfirm;
    const prevReroll = p.hoveredReroll;
    p.hoveredSigil = null;
    p.hoveredConfirm = false;
    p.hoveredReroll = false;
    const idx = _pickerCardHitTest(ex, ey, L);
    if (idx >= 0 && idx < p.options.length) {
        p.hoveredSigil = p.options[idx];
    } else if (p.selectedSigil) {
        const btn = _sigilConfirmRect(L, 0);
        p.hoveredConfirm = ex >= btn.x && ex <= btn.x + btn.w && ey >= btn.y && ey <= btn.y + btn.h;
    }
    if (!p.hoveredSigil && !p.hoveredConfirm && (window._sigilRerollsLeft || 0) > 0) {
        const rbtn = _sigilRerollRect(L, 0);
        p.hoveredReroll = ex >= rbtn.x && ex <= rbtn.x + rbtn.w && ey >= rbtn.y && ey <= rbtn.y + rbtn.h;
    }
    // Fire hover sfx only when the hovered target changes (card→different
    // card, none→card, none→confirm, etc.). Prevents per-mousemove spam.
    const sigilChanged   = p.hoveredSigil   && p.hoveredSigil   !== prevSigil;
    const confirmEntered = p.hoveredConfirm && !prevConfirm;
    const rerollEntered  = p.hoveredReroll  && !prevReroll;
    if ((sigilChanged || confirmEntered || rerollEntered) && window.AudioMgr) {
        window.AudioMgr.playSfx('hover');
    }
}

function drawSigilShipUpgrades() {
    const now = performance.now();

    // Iron Fortress (thanh_dong): hexagonal armor rings for each active stack
    const ironStacks = window._sigilIronBodyStacks || 0;
    if (_hasBuff('thanh_dong') && ironStacks > 0) {
        for (let s = 0; s < ironStacks; s++) {
            const r = 36 + s * 13;
            const pulse = 0.55 + 0.45 * Math.sin(now / 700 + s * Math.PI);
            ctx.save();
            ctx.strokeStyle = `rgba(59,130,246,${0.80 * pulse})`;
            ctx.lineWidth = 2.5;
            if (!_mobPerf) { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 12; }
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const a = Math.PI / 6 + v * Math.PI / 3;
                const px = player.x + Math.cos(a) * r;
                const py = player.y + Math.sin(a) * r;
                if (v === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('×' + ironStacks, player.x + 26, player.y - 34);
        ctx.restore();
    }

    // Dream Realm (coi_mong): cyan shield shimmer when negating damage
    if (_hasBuff('coi_mong') && now < (window._coiMongEndTime || 0)) {
        const fade = Math.min(1, (window._coiMongEndTime - now) / 350);
        const pulse = 0.55 + 0.45 * Math.sin(now / 110);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = `rgba(34,211,238,${0.7 + 0.3 * pulse})`;
        ctx.lineWidth = 3;
        if (!_mobPerf) { ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 22; }
        ctx.beginPath();
        ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    function _canvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return [
            (clientX - rect.left) * (canvas.width / rect.width),
            (clientY - rect.top)  * (canvas.height / rect.height),
        ];
    }

    canvas.addEventListener('click', (e) => {
        if (!window._sigilPicker) return;
        const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
        _handleSigilPickerClick(ex, ey);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!window._sigilPicker) return;
        const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
        _handleSigilPickerMouseMove(ex, ey);
    });

    const ov = document.getElementById('sigil-pick-overlay');
    if (ov) {
        ov.addEventListener('click', (e) => {
            if (!window._sigilPicker) return;
            const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
            _handleSigilPickerClick(ex, ey);
        });

        ov.addEventListener('mousemove', (e) => {
            if (!window._sigilPicker) return;
            const [ex, ey] = _canvasCoords(e.clientX, e.clientY);
            _handleSigilPickerMouseMove(ex, ey);
        });

        ov.addEventListener('touchend', (e) => {
            if (!window._sigilPicker) return;
            e.preventDefault();
            const t = e.changedTouches[0];
            const [ex, ey] = _canvasCoords(t.clientX, t.clientY);
            _handleSigilPickerClick(ex, ey);
            try { navigator.vibrate && navigator.vibrate(18); } catch (_) {}
        }, { passive: false });

        ov.addEventListener('touchmove', (e) => {
            if (!window._sigilPicker) return;
            e.preventDefault();
            const t = e.touches[0];
            const [ex, ey] = _canvasCoords(t.clientX, t.clientY);
            _handleSigilPickerMouseMove(ex, ey);
        }, { passive: false });

        ov.addEventListener('touchstart', (e) => {
            if (!window._sigilPicker) return;
            e.preventDefault();
        }, { passive: false });
    }
});
