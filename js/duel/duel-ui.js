// Pisces: Space Journey. Showdown Voyage user interface and screen presentation module.
// Renders Opponent Select, Practice Mode, Divine Arm Picker, Pre-battle, In-battle Transitions, Duel HUD, and Results.

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.DuelUI = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const Theme = (typeof DuelTheme !== 'undefined') ? DuelTheme : ((typeof require !== 'undefined') ? require('./duel-theme.js') : null);
    const T = Theme ? Theme.DUEL_THEME : null;

    const DIVINE_WEAPONS = [
        {
            id: 'sword',
            skillA: {id:'sword',nameKey:'duel.relic.sword.name',descKey:'duel.relic.sword.desc',labelKey:'duel.relic.sword.label',cooldown:13},
            hasArt: true,
            iconSrc: 'assets/images/duel/weapons/sword-icon.png',
            bulletSrc: 'assets/images/duel/weapons/sword-bullet.png',
            nameKey: 'duel.weapon.sword.name',
            descKey: 'duel.weapon.sword.desc',
            roleKey: 'duel.weapon.sword.role',
            color: (T && T.playerBullet) ? T.playerBullet.halo : 'cyan',
            pattern: 'fan',
            volleyBullets: 5,
            spreadAngle: (18 * Math.PI) / 180,
            damagePerBullet: 2.35,
            speed: 14.0,
            fireInterval: 135,
            stats: { width: 5, precision: 3, burst: 3 }
        },
        {
            id: 'spear',
            skillA: {id:'spear',nameKey:'duel.relic.spear.name',descKey:'duel.relic.spear.desc',labelKey:'duel.relic.spear.label',cooldown:15},
            hasArt: true,
            iconSrc: 'assets/images/duel/weapons/spear-icon.png',
            bulletSrc: 'assets/images/duel/weapons/spear-bullet.png',
            nameKey: 'duel.weapon.spear.name',
            descKey: 'duel.weapon.spear.desc',
            roleKey: 'duel.weapon.spear.role',
            color: (T && T.playerBullet) ? T.playerBullet.trail : 'cyan',
            pattern: 'parallel_2',
            volleyBullets: 2,
            spacing: 16,
            damagePerBullet: 4.40,
            speed: 15.5,
            fireInterval: 135,
            stats: { width: 2, precision: 5, burst: 3 }
        },
        {
            id: 'halberd',
            skillA: {id:'halberd',nameKey:'duel.relic.halberd.name',descKey:'duel.relic.halberd.desc',labelKey:'duel.relic.halberd.label',cooldown:15},
            hasArt: true,
            iconSrc: 'assets/images/duel/weapons/halberd-icon.png',
            bulletSrc: 'assets/images/duel/weapons/halberd-bullet.png',
            nameKey: 'duel.weapon.halberd.name',
            descKey: 'duel.weapon.halberd.desc',
            roleKey: 'duel.weapon.halberd.role',
            color: (T && T.playerBullet) ? T.playerBullet.halo : 'cyan',
            pattern: 'fan_3',
            volleyBullets: 3,
            spreadAngle: (14 * Math.PI) / 180,
            damagePerBullet: 4.00,
            speed: 14.5,
            fireInterval: 135,
            stats: { width: 4, precision: 3, burst: 4 }
        },
        {
            id: 'dagger_array',
            skillA: {id:'dagger_array',nameKey:'duel.relic.dagger_array.name',descKey:'duel.relic.dagger_array.desc',labelKey:'duel.relic.dagger_array.label',cooldown:14},
            hasArt: true,
            iconSrc: 'assets/images/duel/weapons/dagger-icon.png',
            bulletSrc: 'assets/images/duel/weapons/dagger-bullet.png',
            nameKey: 'duel.weapon.dagger_array.name',
            descKey: 'duel.weapon.dagger_array.desc',
            roleKey: 'duel.weapon.dagger_array.role',
            color: (T && T.playerBullet) ? T.playerBullet.trail : 'cyan',
            pattern: 'parallel_4',
            volleyBullets: 4,
            spreadWidth: 70,
            damagePerBullet: 1.90,
            speed: 14.5,
            fireInterval: 135,
            stats: { width: 5, precision: 2, burst: 3 }
        },
        {
            id: 'heavy_lance',
            skillA: {id:'heavy_lance',nameKey:'duel.relic.heavy_lance.name',descKey:'duel.relic.heavy_lance.desc',labelKey:'duel.relic.heavy_lance.label',cooldown:16},
            hasArt: true,
            iconSrc: 'assets/images/duel/weapons/heavy-lance-icon.png',
            bulletSrc: 'assets/images/duel/weapons/heavy-lance-bullet.png',
            nameKey: 'duel.weapon.heavy_lance.name',
            descKey: 'duel.weapon.heavy_lance.desc',
            roleKey: 'duel.weapon.heavy_lance.role',
            color: (T && T.playerBullet) ? T.playerBullet.body : 'cyan',
            pattern: 'heavy_cycle',
            volleyBullets: 1,
            lightDamage: 3.5,
            heavyDamage: 40.5,
            speed: 15.0,
            fireInterval: 135,
            stats: { width: 2, precision: 4, burst: 5 }
        }
    ];

    const I18N_STRINGS = {
        en: {
            'duel.opponentSelect.title': 'OPPONENT SELECT',
            'duel.opponentSelect.subtitle': 'Face cosmic entities in a climactic showdown.',
            'duel.opponentSelect.diff': 'Difficulty',
            'duel.opponentSelect.standard': 'Standard',
            'duel.opponentSelect.hard': 'Hard',
            'duel.opponentSelect.continue': 'Engage',
            'duel.opponentSelect.back': 'Back',
            'duel.opponentSelect.practice': 'Practice',
            "duel.opponent.egregor.card.classification": "Calamity class. Information lifeform.",
            "duel.opponent.egregor.card.size": "SIZE",
            "duel.opponent.egregor.card.traits": "TRAITS",
            "duel.opponent.egregor.card.evolution": "EVOLUTION",
            "duel.opponent.egregor.card.record": "RECORD",
            "duel.opponent.egregor.card.height": "Height: 640 m (dome)",
            "duel.opponent.egregor.card.span": "Tentacle span: 2.8 km",
            "duel.opponent.egregor.card.mass": "Mass: about 4.7 million tons of condensed thought",
            "duel.opponent.egregor.card.minds": "Minds: 10, one will",
            "duel.opponent.egregor.card.trait1": "Collective Mind: ten minds act as one",
            "duel.opponent.egregor.card.trait2": "Psychic Tempest: tears space open beneath you",
            "duel.opponent.egregor.card.trait3": "Dimensional Rifts: portals that open anywhere",
            "duel.opponent.egregor.card.trait4": "Threefold Evolution: changes form twice mid fight",
            "duel.opponent.egregor.card.weak": "Weak point: breaking a pattern exposes it",
            'duel.opponent.egregor.name': 'Egregor the Overmind',
            'duel.opponent.egregor.title': 'Collective Entity of Ten Minds',
            'duel.opponent.egregor.theme': 'Theme: Psychic Tempest and Dimensional Rifts',
            'duel.opponent.locked.title': 'Classified Entity',
            'duel.opponent.locked.desc': 'Signal undetected in this sector.',
            'duel.opponent.locked.tag': 'Coming Soon',

            'duel.weaponSelect.title': 'DIVINE ARTIFACTS',
            'duel.weaponSelect.subtitle': 'Select your celestial armament for the voyage.',
            'duel.weaponSelect.confirm': 'Deploy',
            'duel.weaponSelect.back': 'Back',
            'duel.stat.width': 'Width',
            'duel.stat.precision': 'Precision',
            'duel.stat.burst': 'Burst',

            'duel.weapon.sword.name': 'Celestial Blade',
            'duel.weapon.sword.desc': 'Five way fan with wide crescent blades. Reliable coverage and grazing support.',
            'duel.weapon.sword.role': 'Tactical Role: Balanced coverage. Recommended for first clear.',

            'duel.weapon.spear.name': 'Void Piercer',
            'duel.weapon.spear.desc': 'Dual high speed forward spears. Extremely concentrated single target pierce.',
            'duel.weapon.spear.role': 'Tactical Role: Concentrated precision. Ideal for aggressive play.',

            'duel.weapon.halberd.name': 'Eclipse Cleaver',
            'duel.weapon.halberd.desc': 'Three sweeping sickle axes. Heavy horizontal clearing during dense waves.',
            'duel.weapon.halberd.role': 'Tactical Role: Sweeping cleaves. Controls space during dense patterns.',

            'duel.weapon.dagger_array.name': 'Phantom Blades',
            'duel.weapon.dagger_array.desc': 'Four parallel blades spread across a wide barrier. Safe boundary damage.',
            'duel.weapon.dagger_array.role': 'Tactical Role: Parallel stream. Reliable while dodging near walls.',

            'duel.weapon.heavy_lance.name': 'Titan Greatlance',
            'duel.weapon.heavy_lance.desc': 'Seven piercing kinetic thrusts followed by a catastrophic heavy shock lance.',
            'duel.weapon.heavy_lance.role': 'Tactical Role: Heavy kinetic spikes. Devastating rhythmic burst.',

            'duel.opening.range': 'RANGE',
            'duel.opening.mass': 'MASS',
            'duel.fx.system': 'FLIGHT SYSTEM ONLINE',
            'duel.fx.shield': 'SHIELD SYNCHRONIZED',
            'duel.fx.armament': 'ARMAMENT LINKED',
            'duel.fx.range': 'RANGE',
            'duel.fx.mass': 'MASS',
            'duel.fx.sequence': 'PATTERN',
            'duel.fx.reforming': 'The next pattern takes shape',
            'duel.fx.final': 'The final convergence',
            'duel.fx.evolved': 'SHIELD RESTORED. NEW FORM DETECTED',
            'duel.opening.calamity': 'CALAMITY CLASS',
            'duel.opening.engage': 'ENGAGE',
            'duel.opening.warning': 'WARNING',
            'duel.opening.warningSub': 'Unknown extraterrestrial entity approaching',
            'duel.opening.title': 'The Slumbering Elder',
            'duel.opening.titleSub': 'PHASE I',
            'duel.opening.slowed': 'SLOWED',

            'duel.phase.1': 'Phase I: The Slumbering Elder',
            'duel.phase.2': 'Phase II: Descent of Ten Thoughts',
            'duel.phase.3': 'Phase III: Voidword of the Final End',
            'duel.phase.1.title': 'The Slumbering Elder',
            'duel.phase.2.title': 'Descent of Ten Thoughts',
            'duel.phase.3.title': 'Voidword of the Final End',
            'duel.spellCard.survival': 'Survival',
            'duel.spellCard.defeated': 'Defeated',
            'duel.spellCard.bonus': 'Bonus',

            'duel.hud.boss': 'The Slumbering Elder',
            'duel.hud.attack': 'Attack',
            'duel.hud.time': 'Time',
            'duel.hud.shiftReady': 'Domain: Ready',
            'duel.hud.shiftCooling': 'Domain Cooldown',
            'duel.audio.ambience': 'Showdown ambience',
            'duel.hud.shield': 'Shield',
            'duel.hud.shieldAbsorbed': 'Shield Absorbed',
            'duel.hud.skillF': 'Sweep [F]',
            'duel.hud.lives': 'Lives',            'duel.report.tag.warning': 'WARNING',
            'duel.report.tag.critical': 'CRITICAL WARNING',
            'duel.report.tag.report': 'REPORT',
            'duel.report.tag.failure': 'CRITICAL FAILURE',
            'duel.report.phase2': 'A major shift has been detected in the fusion structure of the entity. Energy output is rising.',
            'duel.report.phase3': 'The fusion structure is collapsing into a new state. Output has exceeded all measurable values. Brace for impact.',
            'duel.report.setclear': 'Attack pattern analyzed. Countermeasure confirmed.',
            'duel.report.lowhp5': 'Barrier integrity failing. The vessel is malfunctioning.',
            'duel.report.lowhp3': 'Core systems have failed. The vessel will not hold.',
            'duel.report.failed': 'Vessel integrity lost. Mission failed.',
            'duel.tip.shift': 'Hold SHIFT to slow time down. While you hold it, tap the left or right arrow to blink sideways.',
            'duel.tip.f': 'Press F to charge a sweep that wipes out every bullet it passes. Ready again after 7 seconds.',

            'duel.skill.thoughtSphere': 'Thought Sphere',
            'duel.attack.1': 'Tendril Probe',
            'duel.attack.2': 'Locked Thought',
            'duel.attack.3': 'Eye Lines',
            'duel.attack.4': 'Ripple of Dimensions',
            'duel.attack.5': 'Whisper Rain',
            'duel.attack.6': 'Mirror Mind',
            'duel.attack.7': 'Ten Voices',
            'duel.attack.8': 'Collective Mind',
            'duel.attack.9': 'Null Prelude',
            'duel.attack.10': 'Null Slash',
            'duel.attack.11': 'Mind Link Pulse',
            'duel.attack.12': 'Boon and Bane',
            'duel.attack.13': 'Dimension Break',
            'duel.attack.14': 'Overmind Chorus',
            'duel.attack.15': 'Psychic Tempest Maelstrom',
            'duel.attack.16': 'Echo of Ten',
            'duel.attack.17': 'Rage of the Collective',
            'duel.attack.18': 'Ten Minds, One Voice',

            'duel.practice.title': 'SPELL CARD PRACTICE',
            'duel.practice.subtitle': 'Select an attack to test and master individually.',
            'duel.practice.close': 'Close',
            'duel.practice.phase1': 'Phase 1: Awakening (Attacks 1 to 6)',
            'duel.practice.phase2': 'Phase 2: Multiple Minds (Attacks 7 to 13)',
            'duel.practice.phase3': 'Phase 3: One Voice (Attacks 14 to 18)',
            'duel.practice.cleared': 'PRACTICE CLEAR',
            'duel.practice.failed': 'PRACTICE FAILED',
            'duel.practice.retry': 'Retry',
            'duel.practice.pickAnother': 'Pick Another',

            'duel.result.victory': 'VOYAGE CONQUERED',
            'duel.result.defeat': 'VOYAGE DEFEAT',
            'duel.result.defeatedAt': 'Defeated at',
            'duel.result.time': 'Time Elapsed',
            'duel.result.damage': 'Damage Dealt',
            'duel.result.graze': 'Graze Count',
            'duel.result.shifts': 'Shifts Used',
            'duel.result.attacksCleared': 'Attacks Cleared',
            'duel.result.shieldAbsorptions': 'Shield Absorptions',
            'duel.result.rank': 'Showdown Rank',
            'duel.result.playAgain': 'Fight Again',
            'duel.result.mainMenu': 'Main Menu',
            'duel.result.status.cleared': 'Cleared',
            'duel.result.status.survived': 'Survived',
            'duel.result.status.unreached': 'Not Reached'
        },
        vi: {
            'duel.opponentSelect.title': 'CHỌN ĐỐI THỦ',
            'duel.opponentSelect.subtitle': 'Thách đấu thực thể vũ trụ trong hành trình quyết chiến.',
            'duel.opponentSelect.diff': 'Độ Khó',
            'duel.opponentSelect.standard': 'Chuẩn (Standard)',
            'duel.opponentSelect.hard': 'Khó (Hard)',
            'duel.opponentSelect.continue': 'Tham Chiến',
            'duel.opponentSelect.back': 'Về Menu',
            'duel.opponentSelect.practice': 'Luyện Tập',
            "duel.opponent.egregor.card.classification": "Cấp thiên tai. Sinh thể thông tin.",
            "duel.opponent.egregor.card.size": "KÍCH THƯỚC",
            "duel.opponent.egregor.card.traits": "ĐẶC ĐIỂM",
            "duel.opponent.egregor.card.evolution": "TIẾN HÓA",
            "duel.opponent.egregor.card.record": "KỶ LỤC",
            "duel.opponent.egregor.card.height": "Chiều cao: 640 m (phần chóp)",
            "duel.opponent.egregor.card.span": "Sải xúc tu: 2,8 km",
            "duel.opponent.egregor.card.mass": "Khối lượng: khoảng 4,7 triệu tấn ý niệm cô đặc",
            "duel.opponent.egregor.card.minds": "Tâm trí: 10, một ý chí",
            "duel.opponent.egregor.card.trait1": "Tâm Trí Hợp Nhất: mười tâm trí hành động như một",
            "duel.opponent.egregor.card.trait2": "Bão Tâm Linh: xé toạc không gian dưới chân bạn",
            "duel.opponent.egregor.card.trait3": "Vết Rách Không Gian: cổng mở ở bất cứ đâu",
            "duel.opponent.egregor.card.trait4": "Tiến Hóa Ba Lần: biến đổi hai lần giữa trận",
            "duel.opponent.egregor.card.weak": "Điểm yếu: phá vỡ một chiêu thức sẽ làm lộ ra",
            'duel.opponent.egregor.name': 'Egregor: Thống Lĩnh Tâm Trí',
            'duel.opponent.egregor.title': 'Thực Thể Ý Thức Mười Tâm Trí',
            'duel.opponent.egregor.theme': 'Chủ đề: Bão Tâm Linh và Vết Rách Không Gian',
            'duel.opponent.locked.title': 'Thực Thể Chưa Rõ',
            'duel.opponent.locked.desc': 'Chưa ghi nhận tín hiệu trong khu vực này.',
            'duel.opponent.locked.tag': 'Sắp Có',

            'duel.weaponSelect.title': 'CHỌN THẦN KHÍ',
            'duel.weaponSelect.subtitle': 'Chọn khí giới định mệnh cho trận quyết chiến.',
            'duel.weaponSelect.confirm': 'Xác Nhận',
            'duel.weaponSelect.back': 'Quay Lại',
            'duel.stat.width': 'Độ Rộng',
            'duel.stat.precision': 'Chính Xác',
            'duel.stat.burst': 'Bùng Nổ',

            'duel.weapon.sword.name': 'Thanh Kiếm Thiên Hà',
            'duel.weapon.sword.desc': 'Quạt 5 lưỡi kiếm cong hình bán nguyệt. Độ phủ rộng và hỗ trợ graze an toàn.',
            'duel.weapon.sword.role': 'Lối Chơi: Tầm quét cân bằng, độ phủ rộng, khuyên dùng cho người mới.',

            'duel.weapon.spear.name': 'Ngọn Giáo Hư Không',
            'duel.weapon.spear.desc': 'Hai mũi giáo phóng thẳng song song cực nhanh. Sát thương xuyên phá dồn dập.',
            'duel.weapon.spear.role': 'Lối Chơi: Tập trung chính xác cao, sát thương dồn cực mạnh.',

            'duel.weapon.halberd.name': 'Lưỡi Kích Nhật Thực',
            'duel.weapon.halberd.desc': 'Ba lưỡi kích hình trăng khuyết quét rộng. Kiểm soát không gian ngang hiệu quả.',
            'duel.weapon.halberd.role': 'Lối Chơi: Nhát chém hình cung, dọn không gian khi đạn dày.',

            'duel.weapon.dagger_array.name': 'Bộ Phi Đao Bóng Ma',
            'duel.weapon.dagger_array.desc': 'Bốn phi đao song song tạo bức tường quét ngang. Gây sát thương an toàn từ biên.',
            'duel.weapon.dagger_array.role': 'Lối Chơi: Luồng đạn ngang rộng, duy trì bắn khi né sát mép.',

            'duel.weapon.heavy_lance.name': 'Chiến Thương Cự Thần',
            'duel.weapon.heavy_lance.desc': 'Bảy đòn đâm nhịp điệu rồi bùng nổ một mũi thương nặng sát thương xung kích.',
            'duel.weapon.heavy_lance.role': 'Lối Chơi: Đòn đâm nhịp điệu bùng nổ, sát thương dứt điểm cực lớn.',

            'duel.opening.range': 'CỰ LY',
            'duel.opening.mass': 'KHỐI LƯỢNG',
            'duel.fx.system': 'HỆ THỐNG BAY SẴN SÀNG',
            'duel.fx.shield': 'KHIÊN ĐÃ ĐỒNG BỘ',
            'duel.fx.armament': 'VŨ KHÍ ĐÃ KẾT NỐI',
            'duel.fx.range': 'CỰ LY',
            'duel.fx.mass': 'KHỐI LƯỢNG',
            'duel.fx.sequence': 'CHIÊU THỨC',
            'duel.fx.reforming': 'Cấu trúc ý niệm đang tái lập',
            'duel.fx.final': 'Ý niệm cuối cùng hội tụ',
            'duel.fx.evolved': 'KHIÊN ĐÃ HỒI PHỤC. PHÁT HIỆN DẠNG MỚI',
            'duel.opening.calamity': 'CẤP THIÊN TAI',
            'duel.opening.engage': 'GIAO CHIẾN',
            'duel.opening.warning': 'CẢNH BÁO',
            'duel.opening.warningSub': 'Phát hiện thực thể ngoài hành tinh đang tiếp cận',
            'duel.opening.title': 'Thâm Miên Cổ Thần',
            'duel.opening.titleSub': 'GIAI ĐOẠN I',
            'duel.opening.slowed': 'LÀM CHẬM',

            'duel.phase.1': 'Giai Đoạn I: Thâm Miên Cổ Thần',
            'duel.phase.2': 'Giai Đoạn II: Thập Niệm Giáng Thế',
            'duel.phase.3': 'Giai Đoạn III: Chung Yên Hư Ngôn',
            'duel.phase.1.title': 'Thâm Miên Cổ Thần',
            'duel.phase.2.title': 'Thập Niệm Giáng Thế',
            'duel.phase.3.title': 'Chung Yên Hư Ngôn',
            'duel.spellCard.survival': 'Sống Sót',
            'duel.spellCard.defeated': 'Đã Hạ',
            'duel.spellCard.bonus': 'Thưởng',

            'duel.hud.boss': 'Thâm Miên Cổ Thần',
            'duel.hud.attack': 'Chiêu',
            'duel.hud.time': 'Thời Gian',
            'duel.hud.shiftReady': 'Lãnh Địa: Sẵn Sàng',
            'duel.hud.shiftCooling': 'Hồi Chiêu Lãnh Địa',
            'duel.audio.ambience': 'Âm nền Quyết Chiến',
            'duel.hud.shield': 'Khiên Hộ Mệnh',
            'duel.hud.shieldAbsorbed': 'Khiên Đã Đỡ',
            'duel.hud.skillF': 'Quét Tiêu Diệt [F]',
            'duel.hud.lives': 'Mạng',            'duel.report.tag.warning': 'CẢNH BÁO',
            'duel.report.tag.critical': 'CẢNH BÁO NGUY CẤP',
            'duel.report.tag.report': 'BÁO CÁO',
            'duel.report.tag.failure': 'HỎNG HÓC NGHIÊM TRỌNG',
            'duel.report.phase2': 'Phát hiện chuyển đổi lớn trong cấu trúc nhiệt hạch của thực thể. Công suất đang tăng.',
            'duel.report.phase3': 'Cấu trúc nhiệt hạch đang sụp đổ sang một trạng thái mới. Công suất đã vượt mọi giá trị đo được. Chuẩn bị chịu va chạm.',
            'duel.report.setclear': 'Đã phân tích chiêu thức. Biện pháp đối phó được xác nhận.',
            'duel.report.lowhp5': 'Hàng rào hộ thể đang suy yếu. Con tàu đang trục trặc.',
            'duel.report.lowhp3': 'Lõi hệ thống đã hỏng. Con tàu sẽ không trụ nổi.',
            'duel.report.failed': 'Độ toàn vẹn của con tàu đã mất. Nhiệm vụ thất bại.',
            'duel.tip.shift': 'Giữ SHIFT để làm chậm thời gian. Khi đang giữ, bấm mũi tên trái hoặc phải để dịch chuyển sang bên.',
            'duel.tip.f': 'Bấm F để nạp một đường quét xóa sạch đạn nó đi qua. Sau 7 giây dùng lại được.',

            'duel.skill.thoughtSphere': 'Niệm Cầu',
            'duel.attack.1': 'Xúc Tu Thám Hư',
            'duel.attack.2': 'Tỏa Niệm',
            'duel.attack.3': 'Nhãn Tuyến',
            'duel.attack.4': 'Vị Diện Lan Ba',
            'duel.attack.5': 'Ngữ Vũ',
            'duel.attack.6': 'Kính Tâm Ảnh',
            'duel.attack.7': 'Thập Thanh Cộng Minh',
            'duel.attack.8': 'Quần Tâm Hợp Lực',
            'duel.attack.9': 'Hư Vô Tiền Tấu',
            'duel.attack.10': 'Hư Vô Trảm',
            'duel.attack.11': 'Tâm Liên Xung',
            'duel.attack.12': 'Phúc Họa Tương Y',
            'duel.attack.13': 'Phá Vị Diện',
            'duel.attack.14': 'Thượng Trí Hợp Xướng',
            'duel.attack.15': 'Tâm Linh Phong Bạo',
            'duel.attack.16': 'Thập Niệm Hồi Âm',
            'duel.attack.17': 'Quần Tâm Cuồng Nộ',
            'duel.attack.18': 'Thập Tâm Nhất Thanh',

            'duel.practice.title': 'LUYỆN TẬP CHIÊU THỨC',
            'duel.practice.subtitle': 'Chọn một chiêu thức để luyện tập riêng và rèn luyện kỹ năng.',
            'duel.practice.close': 'Đóng',
            'duel.practice.phase1': 'Giai Đoạn 1: Thức Tỉnh (Chiêu 1 đến 6)',
            'duel.practice.phase2': 'Giai Đoạn 2: Nhiều Tâm Trí (Chiêu 7 đến 13)',
            'duel.practice.phase3': 'Giai Đoạn 3: Một Tiếng Nói (Chiêu 14 đến 18)',
            'duel.practice.cleared': 'HOÀN THÀNH LUYỆN TẬP',
            'duel.practice.failed': 'LUYỆN TẬP THẤT BẠI',
            'duel.practice.retry': 'Luyện Lại',
            'duel.practice.pickAnother': 'Chọn Chiêu Khác',

            'duel.result.victory': 'CHINH PHỤC QUYẾT CHIẾN',
            'duel.result.defeat': 'CHUYẾN DU HÀNH KẾT THÚC',
            'duel.result.defeatedAt': 'Thất bại tại',
            'duel.result.time': 'Thời Gian',
            'duel.result.damage': 'Tổng Sát Thương',
            'duel.result.graze': 'Số Lần Graze',
            'duel.result.shifts': 'Số Lần Shift',
            'duel.result.attacksCleared': 'Số Chiêu Vượt Qua',
            'duel.result.shieldAbsorptions': 'Số Lần Khiên Đỡ',
            'duel.result.rank': 'Xếp Hạng',
            'duel.result.playAgain': 'Đấu Lại',
            'duel.result.mainMenu': 'Menu Chính',
            'duel.result.status.cleared': 'Đã Hạ',
            'duel.result.status.survived': 'Hết Giờ',
            'duel.result.status.unreached': 'Chưa Tới'
        }
    };

    Object.assign(I18N_STRINGS.en, {"duel.tip.a":"Press A to unleash the skill of your sacred relic.","duel.relic.category":"SACRED RELIC","duel.relic.sword.name":"Moonwheel Aegis","duel.relic.sword.desc":"Three crescents ward the ship, then strike the boss twice each.","duel.relic.sword.label":"Moonwheel","duel.relic.spear.name":"Void Lance","duel.relic.spear.desc":"Charge, then pierce a column with six hits.","duel.relic.spear.label":"Void Lance","duel.relic.halberd.name":"Eclipse Reave","duel.relic.halberd.desc":"Five sweeping strikes across the forward arc.","duel.relic.halberd.label":"Eclipse","duel.relic.dagger_array.name":"Phantom Blades","duel.relic.dagger_array.desc":"Two phantoms fire at 40% power for 5 seconds.","duel.relic.dagger_array.label":"Phantoms","duel.relic.heavy_lance.name":"Titan Breaker","duel.relic.heavy_lance.desc":"Heavy lance, impact wave, early heavy shot.","duel.relic.heavy_lance.label":"Titan Break"});
    Object.assign(I18N_STRINGS.vi, {"duel.tip.a":"Bấm A để kích hoạt kỹ năng của thánh di vật.","duel.relic.category":"THÁNH DI VẬT","duel.relic.sword.name":"Nguyệt Luân Hộ Thân","duel.relic.sword.desc":"Ba lưỡi trăng hộ thân rồi lao tới chém Egregor hai lượt.","duel.relic.sword.label":"Nguyệt Luân","duel.relic.spear.name":"Xuyên Hư Thương","duel.relic.spear.desc":"Nạp rồi xuyên một cột với sáu hit.","duel.relic.spear.label":"Xuyên Hư","duel.relic.halberd.name":"Nhật Thực Trảm","duel.relic.halberd.desc":"Năm nhát quét vùng phía trước tàu.","duel.relic.halberd.label":"Nhật Thực","duel.relic.dagger_array.name":"Ảnh Phi Đao","duel.relic.dagger_array.desc":"Hai bóng bắn với 40% sức mạnh trong 5 giây.","duel.relic.dagger_array.label":"Ảnh Đao","duel.relic.heavy_lance.name":"Cự Thần Phá","duel.relic.heavy_lance.desc":"Thương nặng, sóng chấn, sớm có viên nặng.","duel.relic.heavy_lance.label":"Cự Thần Phá"});

    function t(key) {
        if (!key) return '';
        if (typeof window !== 'undefined' && typeof window._t === 'function') {
            const res = window._t(key);
            if (res && res !== key) return res;
        }
        const lang = (typeof window !== 'undefined' && window._lang === 'vi') ? 'vi' : 'en';
        const dict = I18N_STRINGS[lang] || I18N_STRINGS.en;
        return dict[key] || I18N_STRINGS.en[key] || key;
    }

    function initI18n() {
        if (typeof window !== 'undefined' && typeof window._addI18n === 'function') {
            window._addI18n(I18N_STRINGS);
        }
    }

    const _iconImages = {};
    const _bulletImages = {};
    const _bulletSprites = {};

    function _bakeBulletSprite(img, w, h) {
        if (typeof document === 'undefined' || !img) return img;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const c2 = cv.getContext('2d');
        c2.drawImage(img, 0, 0, w, h);
        return cv;
    }

    function getWeaponIconImage(weapon) {
        if (!weapon || !weapon.iconSrc || weapon.hasArt !== true) return null;
        if (_iconImages[weapon.id] !== undefined) return _iconImages[weapon.id] || null;
        if (typeof Image === 'undefined') return null;
        const img = new Image();
        _iconImages[weapon.id] = null;
        img.onload = function () { _iconImages[weapon.id] = img; };
        img.onerror = function () { _iconImages[weapon.id] = false; };
        img.src = weapon.iconSrc;
        return null;
    }

    function getWeaponBulletSprite(weaponId, isHeavy) {
        const key = weaponId + (isHeavy ? '_heavy' : '');
        if (_bulletSprites[key]) return _bulletSprites[key];
        const w = DIVINE_WEAPONS.find(function (item) { return item.id === weaponId; });
        if (!w || !w.bulletSrc || w.hasArt !== true) return null;
        if (_bulletImages[weaponId] === false) return null;
        if (_bulletImages[weaponId]) {
            const bw = isHeavy ? 34 : (weaponId === 'halberd' ? 28 : 22);
            const bh = isHeavy ? 68 : (weaponId === 'spear' ? 54 : 44);
            _bulletSprites[key] = _bakeBulletSprite(_bulletImages[weaponId], bw, bh);
            return _bulletSprites[key];
        }
        if (typeof Image === 'undefined') return null;
        const img = new Image();
        _bulletImages[weaponId] = null;
        img.onload = function () {
            _bulletImages[weaponId] = img;
            const bw = weaponId === 'halberd' ? 28 : 22;
            const bh = weaponId === 'spear' ? 54 : 44;
            _bulletSprites[weaponId] = _bakeBulletSprite(img, bw, bh);
            if (weaponId === 'heavy_lance') {
                _bulletSprites[weaponId + '_heavy'] = _bakeBulletSprite(img, 36, 72);
            }
        };
        img.onerror = function () { _bulletImages[weaponId] = false; };
        img.src = w.bulletSrc;
        return null;
    }

    function preloadWeaponAssets() {
        for (let i = 0; i < DIVINE_WEAPONS.length; i++) {
            getWeaponIconImage(DIVINE_WEAPONS[i]);
            getWeaponBulletSprite(DIVINE_WEAPONS[i].id, false);
        }
    }

    function drawProceduralWeapon(ctx, weaponId, cx, cy, scale = 1.0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        if (weaponId === 'sword') {
            // Celestial Blade: Curved arc blade with cold silver and cyan styling
            ctx.fillStyle = T.bgPanel;
            ctx.beginPath();
            ctx.arc(0, 0, 24, -Math.PI * 0.72, -Math.PI * 0.12);
            ctx.quadraticCurveTo(14, -22, 0, -32);
            ctx.quadraticCurveTo(-11, -15, 0, 0);
            ctx.fill();

            const grd = ctx.createLinearGradient(0, -32, 0, 0);
            grd.addColorStop(0, T.white);
            grd.addColorStop(0.35, T.electric);
            grd.addColorStop(1, T.turquoise);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(0, 0, 21, -Math.PI * 0.70, -Math.PI * 0.15);
            ctx.quadraticCurveTo(11, -20, 0, -28);
            ctx.quadraticCurveTo(-8, -13, 0, 0);
            ctx.fill();

            ctx.fillStyle = T.silver;
            ctx.fillRect(-8, 0, 16, 3);
            ctx.fillStyle = T.turquoise;
            ctx.fillRect(-2.5, 3, 5, 14);
        } else if (weaponId === 'spear') {
            // Void Piercer: Sleek sharp needle spearhead
            const grd = ctx.createLinearGradient(0, -32, 0, 12);
            grd.addColorStop(0, T.white);
            grd.addColorStop(0.4, T.electric);
            grd.addColorStop(1, T.turquoise);
            ctx.fillStyle = grd;

            ctx.beginPath();
            ctx.moveTo(0, -32);
            ctx.lineTo(6, -10);
            ctx.lineTo(3, 4);
            ctx.lineTo(0, 10);
            ctx.lineTo(-3, 4);
            ctx.lineTo(-6, -10);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = T.white;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(0, 6);
            ctx.stroke();

            ctx.fillStyle = T.turquoise;
            ctx.fillRect(-1.5, 10, 3, 16);
        } else if (weaponId === 'halberd') {
            // Eclipse Cleaver: Wide crescent axe blade
            ctx.fillStyle = T.silverMuted;
            ctx.fillRect(-2, -26, 4, 48);

            const axeGrd = ctx.createLinearGradient(0, -26, 18, 0);
            axeGrd.addColorStop(0, T.white);
            axeGrd.addColorStop(0.5, T.gold);
            axeGrd.addColorStop(1, T.goldGlow);
            ctx.fillStyle = axeGrd;

            ctx.beginPath();
            ctx.arc(10, -10, 17, -Math.PI * 0.55, Math.PI * 0.45);
            ctx.lineTo(2, -4);
            ctx.lineTo(2, -18);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-2, -10);
            ctx.lineTo(-10, -8);
            ctx.lineTo(-2, -14);
            ctx.closePath();
            ctx.fillStyle = T.gold;
            ctx.fill();
        } else if (weaponId === 'dagger_array') {
            // Phantom Blades: Four parallel sleek kunai
            const offsets = [-15, -5, 5, 15];
            for (let i = 0; i < offsets.length; i++) {
                const ox = offsets[i];
                ctx.save();
                ctx.translate(ox, 0);
                const dGrd = ctx.createLinearGradient(0, -24, 0, 10);
                dGrd.addColorStop(0, T.white);
                dGrd.addColorStop(0.5, T.electric);
                dGrd.addColorStop(1, T.turquoise);
                ctx.fillStyle = dGrd;

                ctx.beginPath();
                ctx.moveTo(0, -24);
                ctx.lineTo(4, -8);
                ctx.lineTo(1.5, 8);
                ctx.lineTo(-1.5, 8);
                ctx.lineTo(-4, -8);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = T.silver;
                ctx.fillRect(-3, 8, 6, 2);
                ctx.fillStyle = T.bgPanel;
                ctx.fillRect(-1, 10, 2, 8);
                ctx.restore();
            }
        } else if (weaponId === 'heavy_lance') {
            // Titan Greatlance: Massive kinetic spike with flared guards
            const lanceGrd = ctx.createLinearGradient(0, -34, 0, 12);
            lanceGrd.addColorStop(0, T.white);
            lanceGrd.addColorStop(0.35, T.silver);
            lanceGrd.addColorStop(1, T.electric);
            ctx.fillStyle = lanceGrd;

            ctx.beginPath();
            ctx.moveTo(0, -34);
            ctx.lineTo(10, 0);
            ctx.lineTo(7, 10);
            ctx.lineTo(-7, 10);
            ctx.lineTo(-10, 0);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = T.gold;
            ctx.fillRect(-13, 10, 26, 4);
            ctx.fillStyle = T.silverMuted;
            ctx.fillRect(-3, 14, 6, 12);
        }
        ctx.restore();
    }

    const _opponentPortraits = {
        splash: { src: 'assets/images/duel/opponents/egregor-splash.png', state: 'idle', image: null },
        sketch: { src: null, state: 'missing', image: null },
        forms: [null, null, null]
    };
    function preloadOpponentPortraits() {
        for (const art of [_opponentPortraits.splash, _opponentPortraits.sketch, ..._opponentPortraits.forms]) {
            if (!art || !art.src || art.state !== 'idle' || typeof Image === 'undefined') continue;
            art.state = 'loading'; art.image = new Image();
            art.image.onload = () => { art.state = 'ready'; };
            art.image.onerror = () => { art.state = 'missing'; art.image = null; };
            art.image.src = art.src;
        }
    }

    let duelMenuBackdrop = null;
    function renderDuelMenuBackdrop(ctx, width, height, mx, my) {
        if (!duelMenuBackdrop) {
            const layer = document.createElement('canvas');
            layer.width = 512;
            layer.height = 288;
            duelMenuBackdrop = layer.getContext('2d', { alpha: false });
        }
        const backdrop = duelMenuBackdrop;
        backdrop.setTransform(backdrop.canvas.width / width, 0, 0, backdrop.canvas.height / height, 0, 0);
        paintDuelMenuBackdrop(backdrop, width, height, mx, my);
        ctx.drawImage(backdrop.canvas, 0, 0, width, height);
    }

    function paintDuelMenuBackdrop(ctx, width, height, mx, my) {
        const fx = window._fxOpts || {}, low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
        const motion = fx.reducedMotion ? 0 : performance.now() * 0.001;
        ctx.save();
        ctx.fillStyle = '#090711'; ctx.fillRect(0, 0, width, height);
        const portrait = _opponentPortraits.splash.image;
        if (portrait && portrait.complete && portrait.naturalWidth) {
            const scale = Math.max(width / portrait.naturalWidth, height / portrait.naturalHeight) * 1.22;
            const w = portrait.naturalWidth * scale, h = portrait.naturalHeight * scale;
            const x = (width - w) * 0.5 - (motion ? (mx - width * 0.5) * 0.018 : 0);
            const y = (height - h) * 0.5 - (motion ? (my - height * 0.5) * 0.025 : 0);
            ctx.globalAlpha = 0.19 + Math.sin(motion * 0.65) * 0.025;
            ctx.drawImage(portrait, x, y, w, h);
            ctx.globalAlpha = 1;
        }
        let veil = paintDuelMenuBackdrop.veil;
        if (!veil) {
            veil = paintDuelMenuBackdrop.veil = document.createElement('canvas');
            veil.width = 512; veil.height = 288;
            const g = veil.getContext('2d');
            const v = g.createRadialGradient(256, 130, 54, 256, 144, 274);
            v.addColorStop(0, '#170d2400'); v.addColorStop(0.65, '#210e2a88'); v.addColorStop(1, '#06040df9');
            g.fillStyle = v; g.fillRect(0, 0, 512, 288);
            const fog = paintDuelMenuBackdrop.fog = document.createElement('canvas');
            fog.width = 256; fog.height = 64;
            const f = fog.getContext('2d');
            f.scale(1, 0.25);
            const r = f.createRadialGradient(128, 128, 0, 128, 128, 128);
            r.addColorStop(0, '#ac609044'); r.addColorStop(0.54, '#77396b2b'); r.addColorStop(1, '#3f112f00');
            f.fillStyle = r; f.fillRect(0, 0, 256, 256);
        }
        ctx.drawImage(veil, 0, 0, width, height);
        if (fx.glow !== false && !low && !fx.reducedMotion) for (let i = 0; i < 2; i++) {
            const x = Math.sin(motion * (0.13 + i * 0.04) + i * 1.2) * width * 0.12;
            const open = Math.max(0, Math.sin(motion * 0.64 + i * 1.61)) ** 4;
            ctx.globalAlpha = 0.46;
            ctx.drawImage(paintDuelMenuBackdrop.fog, x + width * (i % 2 ? 0.11 : -0.23), height * (0.06 + i * 0.43), width * 1.15, height * 0.41);
            ctx.globalAlpha = open * 0.48; ctx.fillStyle = '#ffc28c';
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.ellipse(width * (0.06 + i * 0.28) + side * 12, height * (0.21 + i % 2 * 0.14), 4.5, 1.6 * open, side * 0.18, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        if (fx.particles !== false) {
            ctx.fillStyle = '#edb184';
            for (let i = 0; i < (low ? 10 : 24); i++) {
                const p = (i * 0.618 + motion * (0.014 + i % 5 * 0.003)) % 1;
                const x = ((i * 0.371) % 1) * width + Math.sin(motion * 0.25 + i) * 24;
                ctx.globalAlpha = Math.sin(p * Math.PI) * (0.24 + i % 5 * 0.085);
                ctx.fillRect(x, height * (1 - p), 1 + i % 3 * 0.55, 1 + i % 3 * 0.55);
            }
        }
        ctx.restore();
    }

    const sealedPortraits = new Map();
    function renderSealedPortrait(ctx, x, y, w, h, kind) {
        const key = [w, h, kind, _opponentPortraits.splash.state].join('/');
        let sprite = sealedPortraits.get(key);
        if (!sprite) {
            sprite = document.createElement('canvas');
            sprite.width = Math.ceil(w); sprite.height = Math.ceil(h);
            drawSealedPortrait(sprite.getContext('2d'), 0, 0, w, h, kind);
            if (sealedPortraits.size >= 12) sealedPortraits.delete(sealedPortraits.keys().next().value);
            sealedPortraits.set(key, sprite);
        }
        ctx.drawImage(sprite, x, y, w, h);
    }

    function drawSealedPortrait(ctx, x, y, w, h, kind) {
        ctx.save();
        Theme.panelPath(ctx, x, y, w, h, 13, 4); ctx.clip();
        const image = _opponentPortraits.splash.image;
        if (image && image.complete && image.naturalWidth) {
            ctx.globalAlpha = 0.14;
            ctx.drawImage(image, x - w * 0.30, y - h * 0.32, w * 1.6, h * 1.9);
        }
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#080512'; ctx.strokeStyle = '#58304e'; ctx.lineWidth = 1.4;
        ctx.translate(x + w * 0.5, y + h * 0.39);
        ctx.beginPath(); ctx.moveTo(0, -h * 0.49);
        for (const side of [1, -1]) {
            ctx.quadraticCurveTo(side * w * 0.36, -h * 0.36, side * w * 0.29, 0);
            ctx.lineTo(side * w * (kind === 1 ? 0.5 : 0.39), h * 0.38);
            ctx.quadraticCurveTo(side * w * 0.18, h * 0.30, 0, h * 0.48);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#b28a6f'; ctx.globalAlpha = 0.34; ctx.lineWidth = 1.7;
        for (let i = -7; i <= 7; i++) {
            const bx = i * w * 0.075, by = Math.sin(i * 0.22) * h * 0.36 + h * 0.09;
            ctx.beginPath(); ctx.ellipse(bx, by, 9, 4, kind === 1 ? 0.62 : -0.62, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    class OpponentSelectUI {
        constructor() {
            this.selectedIndex = 0;
            this.difficulty = 'standard';
            this.hoveredIndex = -1;
            this.continueHovered = false;
            this.backHovered = false;
            this.practiceHovered = false;

            this.practiceModalOpen = false;
            this.practiceModalAnim = 0;
            this.practiceHoveredAttack = 0;
            this.practiceModalBounds = [];
            this.practiceCloseBounds = null;

            this.cardBounds = [];
            this.continueBtnBounds = null;
            this.backBtnBounds = null;
            this.practiceBtnBounds = null;

            this.previewAnimTime = 0;
            this.titleAnim = 0;
            this.lastMouseX = 640;
            this.lastMouseY = 360;
            this.pressedElementId = null;
            this.artOffsetX = 0;
            this.artOffsetY = 0;
            this._cardTextCache = new Map();

        }

        update(dt) {
            this.previewAnimTime += dt;
            const portrait = this.cardBounds[0];
            if (portrait) {
                const weight = 1 - Math.exp(-dt * 8);
                const dx = Math.max(-1, Math.min(1, (this.lastMouseX - portrait.x - portrait.w / 2) / (portrait.w / 2)));
                const dy = Math.max(-1, Math.min(1, (this.lastMouseY - portrait.y - portrait.h / 2) / (portrait.h / 2)));
                this.artOffsetX += (dx * 5 - this.artOffsetX) * weight;
                this.artOffsetY += (dy * 3 - this.artOffsetY) * weight;
            }
            this.titleAnim = Math.min(1.0, this.titleAnim + dt / 0.4);

            if (Theme && Theme.uiFx) {
                Theme.uiFx.update(dt);
            }

            if (this.practiceModalOpen) {
                this.practiceModalAnim = Math.min(1.0, this.practiceModalAnim + dt / 0.18);
            } else if (this.practiceModalAnim > 0) {
                this.practiceModalAnim = Math.max(0, this.practiceModalAnim - dt / 0.18);
            }

        }

        render(ctx, width, height) {
            ctx.save();

            renderDuelMenuBackdrop(ctx, width, height, this.lastMouseX, this.lastMouseY);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            // Title animation: letter spacing ease in, diamond marks rotate in
            const titleText = t('duel.opponentSelect.title');
            ctx.font = Theme.getTitleFont(30, 700);
            ctx.fillStyle = T.gold;
            const titleY = height * 0.06 + Math.max(0, height - 800) * 0.32;
            ctx.fillText(titleText, width * 0.5, titleY);

            const titleMetrics = ctx.measureText(titleText);
            const diaOffset = titleMetrics.width * 0.5 + 24;
            const diaRot = (1.0 - this.titleAnim) * Math.PI;

            ctx.save();
            ctx.translate(width * 0.5 - diaOffset, titleY + 16);
            ctx.rotate(diaRot);
            Theme.drawDiamondMark(ctx, 0, 0, 8);
            ctx.restore();

            ctx.save();
            ctx.translate(width * 0.5 + diaOffset, titleY + 16);
            ctx.rotate(-diaRot);
            Theme.drawDiamondMark(ctx, 0, 0, 8);
            ctx.restore();

            // Gradient divider under title drawing from center outwards
            const halfSpan = (titleMetrics.width * 0.6 + 40) * this.titleAnim;
            Theme.drawGradientDivider(ctx, width * 0.5 - halfSpan, width * 0.5 + halfSpan, titleY + 36);

            // Subtitle: Segoe UI, silver
            ctx.font = Theme.getBodyFont(13, 400);
            ctx.fillStyle = T.silverDim;
            ctx.fillText(t('duel.opponentSelect.subtitle'), width * 0.5, titleY + 44);

            // Desktop cards retain room for the heading and action row.
            const cardScale = Math.min(1, (width - 32) / 992);
            const cardW = 400 * cardScale, lockedW = 272 * cardScale, cardGap = 24 * cardScale;
            const totalCardsW = cardW + lockedW * 2 + cardGap * 2;
            const cardStartX = Math.floor((width - totalCardsW) * 0.5);
            const cardY = Math.ceil(titleY + 78);
            const cardH = Math.min(460, Math.floor(height - cardY - 100));
            const u = cardH / 460, isPortrait = false;
            this.cardBounds = [];
            this.cardBounds.push({ index: 0, id: 'opp_card_0', x: cardStartX, y: cardY, w: cardW, h: cardH, selectable: true });
            this._renderBestiaryCard(ctx, this.cardBounds[0]);

            // Cards 1 & 2: Classified Entity (Locked)
            for (let c = 1; c <= 2; c++) {
                const lkX = cardStartX + this.cardBounds[0].w + cardGap + (c - 1) * (lockedW + cardGap);
                const cardW = lockedW;
                const cardId = 'opp_card_' + c;
                this.cardBounds.push({ index: c, id: cardId, x: lkX, y: cardY, w: cardW, h: cardH, selectable: false });

                const tfC = Theme.uiFx ? Theme.uiFx.getTransform(cardId, true) : { translateY: 0, scale: 1.0, shakeX: 0, flashAlpha: 0, shineProgress: 1.0, ripples: [] };

                ctx.save();
                const lkMidX = lkX + cardW * 0.5;
                const lkMidY = cardY + cardH * 0.5;
                ctx.translate(lkMidX + tfC.shakeX, lkMidY + tfC.translateY);
                ctx.scale(tfC.scale, tfC.scale);
                ctx.translate(-lkMidX, -lkMidY);

                Theme.drawDuelSelectionPanel(ctx, lkX, cardY, cardW, cardH, 16, false, tfC.shineProgress);
                renderSealedPortrait(ctx, lkX + 12, cardY + 11, cardW - 24, Math.min(178, cardH * 0.5), c);

                // Crimson border flash when clicked
                if (tfC.flashAlpha > 0) {
                    ctx.save();
                    Theme.panelPath(ctx, lkX, cardY, cardW, cardH, 16);
                    ctx.strokeStyle = T.crimson;
                    ctx.lineWidth = 2.0;
                    ctx.globalAlpha = tfC.flashAlpha * 0.85;
                    ctx.stroke();
                    ctx.restore();
                }

                // Wobbling ornamental lock
                const lockWobble = tfC.shakeX * 0.08;
                ctx.save();
                ctx.translate(lkMidX, cardY + 110);
                ctx.rotate(lockWobble);
                Theme.drawOrnamentalLock(ctx, 0, 0, 38);
                ctx.restore();

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Locked title in Segoe UI uppercase
                ctx.font = Theme.getBodyFont(14, 700);
                ctx.fillStyle = T.silverMuted;
                ctx.fillText(t('duel.opponent.locked.title').toUpperCase(), lkMidX, cardY + 204);

                // Coming soon tag in Segoe UI
                ctx.font = Theme.getBodyFont(11, 700);
                ctx.fillStyle = T.goldDim;
                ctx.fillText(('[ ' + t('duel.opponent.locked.tag') + ' ]').toUpperCase(), lkMidX, cardY + 232);

                // Lore description in Segoe UI
                ctx.font = Theme.getBodyFont(11, 400);
                ctx.fillStyle = T.silverMuted;
                this._renderWrappedText(ctx, t('duel.opponent.locked.desc'), lkMidX, cardY + 266, cardW - 32, 16);

                ctx.restore();
            }

            // Bottom Buttons: Back (left), Practice (middle), Engage (right / primary)
            const btnW = isPortrait ? Math.floor((width - 48) / 3) : 160;
            const btnH = Math.max(38, Math.min(44, Math.floor(44 * u)));
            const btnGap = isPortrait ? 8 : 20;
            const totalBtnsW = btnW * 3 + btnGap * 2;
            const btnStartX = Math.floor((width - totalBtnsW) * 0.5);
            const btnY = Math.min(height - btnH - 24, Math.floor(cardY + cardH + 16));

            this.backBtnBounds = { id: 'opp_btn_back', x: btnStartX, y: btnY, w: btnW, h: btnH };
            this.practiceBtnBounds = { id: 'opp_btn_practice', x: btnStartX + btnW + btnGap, y: btnY, w: btnW, h: btnH };
            this.continueBtnBounds = { id: 'opp_btn_continue', x: btnStartX + (btnW + btnGap) * 2, y: btnY, w: btnW, h: btnH };

            // Left: Back (Secondary)
            Theme.drawFantasyButton(ctx, this.backBtnBounds.x, btnY, btnW, btnH, t('duel.opponentSelect.back').toUpperCase(), false, this.backHovered, Theme.uiFx.getTransform(this.backBtnBounds.id));

            // Middle: Practice (Secondary)
            Theme.drawFantasyButton(ctx, this.practiceBtnBounds.x, btnY, btnW, btnH, t('duel.opponentSelect.practice').toUpperCase(), false, this.practiceHovered, Theme.uiFx.getTransform(this.practiceBtnBounds.id));

            // Right: Engage (Primary: Dark navy fill, gold border, bright gold text, hover cyan border)
            Theme.drawFantasyButton(ctx, this.continueBtnBounds.x, btnY, btnW, btnH, t('duel.opponentSelect.continue').toUpperCase(), true, this.continueHovered, Theme.uiFx.getTransform(this.continueBtnBounds.id));

            // Draw any global sparks
            if (Theme && Theme.uiFx) {
                Theme.uiFx.drawSparks(ctx);
            }

            // Practice Mode Modal Popup
            if (this.practiceModalAnim > 0) {
                this._renderPracticeModal(ctx, width, height, this.practiceModalAnim);
            }

            ctx.restore();
        }

        _cardLines(ctx, text, maxWidth) {
            const key = ctx.font + ':' + maxWidth + ':' + text;
            if (this._cardTextCache.has(key)) return this._cardTextCache.get(key);
            const lines = []; let line = '';
            for (const word of String(text).split(' ')) {
                const next = line ? line + ' ' + word : word;
                if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
                else line = next;
            }
            if (line) lines.push(line);
            this._cardTextCache.set(key, lines);
            return lines;
        }

        _renderBestiaryCard(ctx, bounds) {
            preloadOpponentPortraits();
            const { x, y, w, h } = bounds, center = x + w / 2, bottom = y + h;
            const transform = Theme.uiFx ? Theme.uiFx.getTransform(bounds.id, true) : { scale: 1, shakeX: 0, translateY: 0 };
            ctx.save(); ctx.translate(center + transform.shakeX, y + h / 2 + transform.translateY);
            ctx.scale(transform.scale, transform.scale); ctx.translate(-center, -y - h / 2);
            Theme.drawDuelSelectionPanel(ctx, x, y, w, h, 16, this.selectedIndex === 0, transform.shineProgress);
            const compact = h < 410;
            const infoY = bottom - (compact ? 137 : 166), nameY = infoY - (compact ? 51 : 59);
            const lineHeight = compact ? 12 : 14, weakY = bottom - (compact ? 55 : 68);
            const formsY = bottom - (compact ? 31 : 38), recordY = bottom - (compact ? 16 : 19);
            const artH = nameY - y - 12, artY = y + artH / 2 + 2;
            const radius = Math.min(140, artH * 0.6), low = typeof _gfxLevel !== 'undefined' && _gfxLevel >= 2;
            const fo = typeof window !== 'undefined' ? window._fxOpts : null;
            if (!fo || fo.glow !== false) {
                let glow = OpponentSelectUI._portraitGlow;
                if (!glow) {
                    glow = OpponentSelectUI._portraitGlow = document.createElement('canvas'); glow.width = glow.height = 256;
                    const g = glow.getContext('2d'), gradient = g.createRadialGradient(128, 128, 3, 128, 128, 126);
                    gradient.addColorStop(0, '#7555bc7a'); gradient.addColorStop(0.5, '#32acc52e'); gradient.addColorStop(1, '#16365800');
                    g.fillStyle = gradient; g.fillRect(0, 0, 256, 256);
                }
                ctx.save(); ctx.globalAlpha = 0.7 + Math.sin(this.previewAnimTime * 1.3) * 0.15;
                ctx.drawImage(glow, center - radius, artY - radius, radius * 2, radius * 2); ctx.restore();
            }
            const ring = OpponentSelectUI._portraitRune || (OpponentSelectUI._portraitRune = Theme.bakeBossRuneRing(92));
            if (ring) {
                ctx.save(); ctx.translate(center, artY); ctx.rotate(fo?.reducedMotion ? 0 : this.previewAnimTime * 0.12); ctx.globalAlpha = 0.35;
                const size = Math.min(artH * 0.9, 220); ctx.drawImage(ring, -size / 2, -size / 2, size, size); ctx.restore();
            }
            ctx.save(); ctx.strokeStyle='#d4a876';ctx.fillStyle='#f3d4a0';
            for(let i=0;i<10;i++){const a=i*Math.PI/5+(fo?.reducedMotion?0:this.previewAnimTime*.08),r=Math.min(artH*.43,105);
                const ex=center+Math.cos(a)*r,ey=artY+Math.sin(a)*r*.72;
                ctx.globalAlpha=fo?.reducedMotion ? .55 : .4+.22*Math.sin(this.previewAnimTime*1.4+i);ctx.beginPath();ctx.ellipse(ex,ey,4,1.8,0,0,Math.PI*2);ctx.stroke();ctx.fillRect(ex-.7,ey-1.2,1.4,2.4);}
            ctx.restore();
            const sketch = _opponentPortraits.sketch;
            if (sketch.state === 'ready') { ctx.save(); ctx.globalAlpha = 0.24; ctx.drawImage(sketch.image, center - artH / 2, y + 4, artH, artH); ctx.restore(); }
            const art = _opponentPortraits.splash, float = (fo?.reducedMotion ? 0 : Math.sin(this.previewAnimTime * 2) * (low ? 1 : 3));
            if (art.state === 'ready') {
                const imageH = Math.min(250, artH), imageW = imageH * art.image.naturalWidth / art.image.naturalHeight;
                ctx.drawImage(art.image, center - imageW / 2 + this.artOffsetX, y + (artH - imageH) / 2 + float + this.artOffsetY, imageW, imageH);
            } else if (art.state === 'missing' && typeof _drawEgregor === 'function') {
                ctx.save(); ctx.translate(center, artY + float); const scale = Math.min(0.7, artH / 230); ctx.scale(scale, scale);
                _drawEgregor({ type: 'egregor', x: 0, y: 0, size: 118, hp: 1000, maxHp: 1000, _rageStacks: 0,
                    _phase: 1, _noHpBar: true, _egSpawnAt: -20000, _eyeAngles: [0, 0, 0, 0] }); ctx.restore();
            } else {
                ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = T.turquoise; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(center, artY, Math.min(72, artH * 0.35), artH * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            }
            let record = '...';
            try { record = localStorage.getItem('pisces_duel_best_egregor') || record; } catch (_) {}
            const key = [w, h, window._lang, record, document.fonts?.status].join('/');
            if (this._bestiaryTextKey !== key) {
                this._bestiaryTextKey = key;
                const label = this._bestiaryText || (this._bestiaryText = document.createElement('canvas'));
                label.width = Math.ceil(w); label.height = Math.ceil(bottom - nameY + 7);
                const art = label.getContext('2d');
                art.translate(-x, 7 - nameY);
                this._paintBestiaryText(art, { x, w, center, bottom, compact, infoY, nameY, lineHeight, weakY, formsY, recordY, record });
            }
            ctx.drawImage(this._bestiaryText, x, nameY - 7);
            this.formBounds = [];
            for (let i = 0; i < 3; i++) {
                const fx = center + 20 + i * 24, fy = formsY, color = ['#5ce1c5', '#b37aff', '#ff627c'][i];
                this.formBounds.push({ x: fx - 9, y: fy - 9, w: 18, h: 18, phase: i + 1 });
                const hovered = Math.abs(this.lastMouseX - fx) <= 9 && Math.abs(this.lastMouseY - fy) <= 9;
                if (hovered) {
                    ctx.save(); ctx.font = Theme.getBodyFont(11, 600); const lines = this._cardLines(ctx, t('duel.phase.' + (i + 1) + '.title'), 88);
                    ctx.fillStyle = '#071326'; ctx.fillRect(x + 12, y + 12, 100, lines.length * 13 + 12); ctx.fillStyle = color;
                    lines.forEach((line, index) => ctx.fillText(line, x + 18, y + 18 + index * 13)); ctx.restore();
                }
            }
            ctx.restore();
        }

        _paintBestiaryText(ctx, geometry) {
            const { x, w, center, bottom, compact, infoY, nameY, lineHeight, weakY, formsY, recordY, record } = geometry;
            ctx.fillStyle = 'rgba(3,9,24,0.72)'; Theme.panelPath(ctx, x + 9, nameY - 7, w - 18, bottom - nameY - 3, 6, 4); ctx.fill();
            ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = Theme.getTitleFont(18, 700); ctx.fillStyle = T.gold;
            ctx.fillText(t('duel.opponent.egregor.name'), center, nameY);
            ctx.font = Theme.getBodyFont(11, 600); ctx.fillStyle = T.silver;
            ctx.fillText(t('duel.opponent.egregor.title').toUpperCase(), center, nameY + 23);
            ctx.font = Theme.getBodyFont(11, 400); ctx.fillStyle = T.silverDim;
            ctx.fillText(t('duel.opponent.egregor.card.classification'), center, nameY + (compact ? 37 : 39));
            const pad = 20, colW = (w - pad * 2 - 18) / 2, left = x + pad, right = center + 9;
            ctx.textAlign = 'left'; ctx.font = Theme.getBodyFont(11, 700); ctx.fillStyle = T.gold;
            ctx.fillText(t('duel.opponent.egregor.card.size'), left, infoY);
            ctx.fillText(t('duel.opponent.egregor.card.traits'), right, infoY);
            ctx.strokeStyle = '#334862'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(center - 3, infoY + 1); ctx.lineTo(center - 3, weakY - 10); ctx.stroke();
            ctx.font = Theme.getBodyFont(11, 400); ctx.fillStyle = T.silver;
            let statY = infoY + (compact ? 16 : 18);
            for (const key of ['height', 'span', 'mass', 'minds']) {
                for (const line of this._cardLines(ctx, t('duel.opponent.egregor.card.' + key), colW)) { ctx.fillText(line, left, statY); statY += lineHeight; }
            }
            const colors = ['#6de8d6', '#bd8bff', '#edc878', '#f985b4'];
            for (let i = 0; i < 4; i++) {
                const rowY = infoY + (compact ? 16 : 18) + i * (compact ? 16 : 18), iconX = right + 4;
                ctx.save(); ctx.translate(iconX, rowY + 5); ctx.strokeStyle = colors[i]; ctx.lineWidth = 1;
                if (i === 0) { ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(2, 1, 1, 0, Math.PI * 2); ctx.stroke(); }
                else if (i === 1) { ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(2, -1); ctx.lineTo(-1, 1); ctx.lineTo(3, 4); ctx.stroke(); }
                else if (i === 2) { ctx.beginPath(); ctx.ellipse(0, 0, 3, 5, 0.4, 0, Math.PI * 2); ctx.stroke(); }
                else { for (let dot = 0; dot < 3; dot++) { ctx.beginPath(); ctx.arc((dot - 1) * 3, 0, 1, 0, Math.PI * 2); ctx.stroke(); } }
                ctx.restore(); ctx.fillStyle = T.silver;
                const title = t('duel.opponent.egregor.card.trait' + (i + 1)).split(':')[0];
                this._cardLines(ctx, title, colW - 15).forEach((line, n) => ctx.fillText(line, right + 14, rowY + n * 12));
            }
            ctx.font = Theme.getBodyFont(11, 400); ctx.fillStyle = T.silverDim; ctx.textAlign = 'left';
            this._cardLines(ctx, t('duel.opponent.egregor.card.weak'), w - 40).forEach((line, i) => ctx.fillText(line, left, weakY + i * 12));
            ctx.font = Theme.getBodyFont(11, 700); ctx.fillStyle = T.silverMuted;
            ctx.fillText(t('duel.opponent.egregor.card.evolution'), left, formsY - 6);
            for (let i = 0; i < 3; i++) {
                const fx = center + 20 + i * 24, fy = formsY;
                ctx.fillStyle = ['#5ce1c5', '#b37aff', '#ff627c'][i];
                ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.textAlign = 'center'; ctx.font = Theme.getBodyFont(11, 700); ctx.fillStyle = T.gold;
            ctx.fillText(t('duel.opponent.egregor.card.record') + ': ' + record, center, recordY);
        }

        _renderPracticeModal(ctx, width, height, anim) {
            ctx.save();
            const p = Math.max(0, Math.min(1, anim));

            // Dimmed backdrop
            ctx.fillStyle = T.bgOverlay;
            ctx.globalAlpha = p * 0.90;
            ctx.fillRect(0, 0, width, height);

            // Modal zoom 0.96 to 1.0 + fade in
            const modalW = Math.min(840, width * 0.88);
            const modalH = 500;
            const mx = (width - modalW) * 0.5;
            const my = (height - modalH) * 0.5;

            const cx = width * 0.5;
            const cy = height * 0.5;
            const scale = 0.96 + 0.04 * p;

            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
            ctx.globalAlpha = p;

            Theme.drawFantasyPanel(ctx, mx, my, modalW, modalH, 18, true, 4);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            ctx.font = Theme.getTitleFont(22, 700);
            ctx.fillStyle = T.gold;
            ctx.fillText(t('duel.practice.title'), width * 0.5, my + 20);

            ctx.font = Theme.getBodyFont(12, 400);
            ctx.fillStyle = T.silverDim;
            ctx.fillText(t('duel.practice.subtitle'), width * 0.5, my + 50);

            // Close button (44px touch height)
            const closeW = 90;
            const closeH = 34;
            this.practiceCloseBounds = { id: 'modal_close', x: mx + modalW - closeW - 20, y: my + 18, w: closeW, h: closeH };
            Theme.drawFantasyButton(ctx, this.practiceCloseBounds.x, this.practiceCloseBounds.y, closeW, closeH, t('duel.practice.close').toUpperCase(), false, false, Theme.uiFx.getTransform(this.practiceCloseBounds.id));

            // 18 Attack Buttons grouped in 3 columns (Phase 1, 2, 3)
            this.practiceModalBounds = [];
            const colW = Math.floor((modalW - 60) / 3);
            const colY = my + 82;

            const phases = [
                { titleKey: 'duel.practice.phase1', start: 1, end: 6 },
                { titleKey: 'duel.practice.phase2', start: 7, end: 13 },
                { titleKey: 'duel.practice.phase3', start: 14, end: 18 }
            ];

            for (let pIdx = 0; pIdx < 3; pIdx++) {
                const phase = phases[pIdx];
                const colX = mx + 20 + pIdx * (colW + 10);

                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.font = Theme.getBodyFont(12, 700);
                ctx.fillStyle = T.gold;
                ctx.fillText(t(phase.titleKey).toUpperCase(), colX, colY);

                let itemY = colY + 24;
                for (let attId = phase.start; attId <= phase.end; attId++) {
                    const itemH = 46;
                    const bounds = { id: 'att_btn_' + attId, attackId: attId, x: colX, y: itemY, w: colW - 6, h: itemH };
                    this.practiceModalBounds.push(bounds);

                    const isHovered = this.practiceHoveredAttack === attId;
                    ctx.save();
                    const pressFx = Theme.uiFx.getTransform(bounds.id);
                    ctx.translate(0, pressFx.translateY);
                    Theme.drawFantasyPanel(ctx, colX, itemY, colW - 6, itemH, 6, isHovered, 3);
                    if (pressFx.press > .05) {
                        ctx.save(); ctx.globalAlpha = pressFx.press * .24; ctx.fillStyle = '#000';
                        Theme.panelPath(ctx, colX + 1, itemY + 1, colW - 8, itemH - 2, 5, 4); ctx.fill();
                        ctx.globalAlpha = pressFx.press * .45; ctx.fillRect(colX + 6, itemY + 2, colW - 18, 3); ctx.restore();
                    }

                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    // Spell index: Segoe UI uppercase with letter spacing
                    ctx.font = Theme.getBodyFont(10, 700);
                    ctx.fillStyle = isHovered ? T.electric : T.silverDim;
                    ctx.fillText('SPELL ' + attId, colX + 10, itemY + 6);

                    // Spell name: Segoe UI
                    ctx.font = Theme.getBodyFont(12, 600);
                    ctx.fillStyle = isHovered ? T.white : T.silver;
                    const attName = t('duel.attack.' + attId);
                    ctx.fillText(attName, colX + 10, itemY + 22);

                    ctx.restore();
                    itemY += itemH + 8;
                }
            }
            ctx.restore();
        }

        _renderWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
            if (!text) return;
            const words = text.split(' ');
            let line = '';
            let curY = y;
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    ctx.fillText(line.trim(), x, curY);
                    line = words[n] + ' ';
                    curY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line.trim(), x, curY);
        }

        handlePointerDown(x, y) {
            this.pressedElementId = null;

            if (this.practiceModalOpen) {
                if (this.practiceCloseBounds) {
                    const cb = this.practiceCloseBounds;
                    if (x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h) {
                        this.pressedElementId = cb.id;
                        if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(cb.id, x, y);
                        return;
                    }
                }
                for (let i = 0; i < this.practiceModalBounds.length; i++) {
                    const b = this.practiceModalBounds[i];
                    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                        this.pressedElementId = b.id;
                        if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                        return;
                    }
                }
                return;
            }

            for (let i = 0; i < this.cardBounds.length; i++) {
                const b = this.cardBounds[i];
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    this.pressedElementId = b.id;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                    return;
                }
            }

            if (this.continueBtnBounds) {
                const b = this.continueBtnBounds;
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    this.pressedElementId = b.id;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                    return;
                }
            }

            if (this.practiceBtnBounds) {
                const b = this.practiceBtnBounds;
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    this.pressedElementId = b.id;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                    return;
                }
            }

            if (this.backBtnBounds) {
                const b = this.backBtnBounds;
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    this.pressedElementId = b.id;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                    return;
                }
            }
        }

        handlePointerMove(x, y) {
            this.lastMouseX = x;
            this.lastMouseY = y;

            if (this.practiceModalOpen) {
                this.practiceHoveredAttack = 0;
                for (let i = 0; i < this.practiceModalBounds.length; i++) {
                    const b = this.practiceModalBounds[i];
                    const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                    if (isInside) {
                        this.practiceHoveredAttack = b.attackId;
                    }
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, isInside);
                }
                if (this.practiceCloseBounds) {
                    const cb = this.practiceCloseBounds;
                    const isInside = x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(cb.id, isInside);
                }
                return;
            }

            this.hoveredIndex = -1;
            for (let i = 0; i < this.cardBounds.length; i++) {
                const b = this.cardBounds[i];
                const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                if (isInside && b.selectable) this.hoveredIndex = b.index;
                if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, isInside);
            }

            if (this.continueBtnBounds) {
                const b = this.continueBtnBounds;
                this.continueHovered = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, this.continueHovered);
            }
            if (this.practiceBtnBounds) {
                const b = this.practiceBtnBounds;
                this.practiceHovered = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, this.practiceHovered);
            }
            if (this.backBtnBounds) {
                const b = this.backBtnBounds;
                this.backHovered = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, this.backHovered);
            }
        }

        handlePointerUp(x, y) {
            const pressedId = this.pressedElementId;
            this.pressedElementId = null;

            if (this.practiceModalOpen) {
                if (this.practiceCloseBounds && pressedId === this.practiceCloseBounds.id) {
                    const cb = this.practiceCloseBounds;
                    const isInside = x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h;
                    const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(cb.id, isInside) : isInside;
                    if (triggered) {
                        this.practiceModalOpen = false;
                        return { action: 'close_practice' };
                    }
                    return null;
                }
                for (let i = 0; i < this.practiceModalBounds.length; i++) {
                    const b = this.practiceModalBounds[i];
                    if (pressedId === b.id) {
                        const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                        const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                        if (triggered) {
                            this.practiceModalOpen = false;
                            return { action: 'start_practice', attackId: b.attackId, difficulty: this.difficulty };
                        }
                        return null;
                    }
                }
                return null;
            }

            for (let i = 0; i < this.cardBounds.length; i++) {
                const b = this.cardBounds[i];
                if (pressedId === b.id) {
                    const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                    const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                    if (triggered) {
                        if (b.selectable) {
                            this.selectedIndex = b.index;
                            if (Theme && Theme.uiFx) {
                                Theme.uiFx.triggerSelectPop(b.id, b.x + b.w - 18, b.y + 18);
                            }
                            return { action: 'select', opponent: 'egregor' };
                        } else {
                            // Locked card clicked: shake 3 cycles, 4px amp in 220ms, crimson flash, tut-fail sound
                            if (Theme && Theme.uiFx) {
                                Theme.uiFx.triggerLockShake(b.id);
                            }
                            return { action: 'locked' };
                        }
                    }
                    return null;
                }
            }

            if (this.continueBtnBounds && pressedId === this.continueBtnBounds.id) {
                const b = this.continueBtnBounds;
                const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                if (triggered) {
                    return { action: 'continue', opponent: 'egregor', difficulty: this.difficulty };
                }
                return null;
            }

            if (this.practiceBtnBounds && pressedId === this.practiceBtnBounds.id) {
                const b = this.practiceBtnBounds;
                const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                if (triggered) {
                    this.practiceModalOpen = true;
                    return { action: 'open_practice' };
                }
                return null;
            }

            if (this.backBtnBounds && pressedId === this.backBtnBounds.id) {
                const b = this.backBtnBounds;
                const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                if (triggered) {
                    return { action: 'back' };
                }
                return null;
            }

            return null;
        }

        // Keep handleClick for compatibility with direct callers
        handleClick(x, y) {
            this.handlePointerDown(x, y);
            return this.handlePointerUp(x, y);
        }

        handleMouseMove(x, y) {
            this.handlePointerMove(x, y);
        }

        handleKey(e) {
            if (this.practiceModalOpen) {
                if (e.code === 'Escape' || e.key === 'Escape') {
                    this.practiceModalOpen = false;
                    return { action: 'close_practice' };
                }
                return null;
            }

            if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                return { action: 'select', opponent: 'egregor' };
            }
            if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
                this.selectedIndex = Math.min(2, this.selectedIndex + 1);
                if (this.selectedIndex > 0) {
                    if (Theme && Theme.uiFx) Theme.uiFx.triggerLockShake('opp_card_' + this.selectedIndex);
                }
                return { action: 'select', opponent: 'egregor' };
            }
            if (e.code === 'Enter' || e.key === 'Enter' || e.code === 'NumpadEnter') {
                return { action: 'continue', opponent: 'egregor', difficulty: this.difficulty };
            }
            if (e.code === 'Escape' || e.key === 'Escape') {
                return { action: 'back' };
            }
            return null;
        }
    }

    class WeaponPickerUI {
        constructor() {
            this.weapons = DIVINE_WEAPONS;
            this.selectedIndex = 0;
            this.hoveredIndex = -1;
            this.confirmHovered = false;
            this.backHovered = false;
            this.cardBounds = [];
            this.confirmButtonBounds = null;
            this.backButtonBounds = null;
            this.testFireTime = 0;
            this.lastMouseX = 640;
            this.lastMouseY = 360;
            this.pressedElementId = null;
            this.openTime = 0;
            preloadWeaponAssets();
            if (typeof window !== 'undefined' && typeof window.bakeDuelBossAssets === 'function') window.bakeDuelBossAssets();

        }

        update(dt) {
            this.testFireTime += dt;
            this.openTime = (this.openTime || 0) + dt;
            if (Theme && Theme.uiFx) {
                Theme.uiFx.update(dt);
            }
        }

        render(ctx, width, height) {
            ctx.save();
            renderDuelMenuBackdrop(ctx, width, height, this.lastMouseX, this.lastMouseY);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const titleText = t('duel.weaponSelect.title');
            ctx.font = Theme.getTitleFont(30, 700);
            ctx.fillStyle = T.gold;
            const menuOffset = Math.max(0, height - 760) * 0.32;
            const titleY = height * 0.055 + menuOffset;
            ctx.fillText(titleText, width * 0.5, titleY);

            const titleMetrics = ctx.measureText(titleText);
            Theme.drawDiamondMark(ctx, width * 0.5 - titleMetrics.width * 0.5 - 20, titleY + 16, 8);
            Theme.drawDiamondMark(ctx, width * 0.5 + titleMetrics.width * 0.5 + 20, titleY + 16, 8);

            Theme.drawGradientDivider(ctx, width * 0.5 - titleMetrics.width * 0.7, width * 0.5 + titleMetrics.width * 0.7, titleY + 36);

            ctx.font = Theme.getBodyFont(13, 400);
            ctx.fillStyle = T.silverDim;
            ctx.fillText(t('duel.weaponSelect.subtitle'), width * 0.5, titleY + 44);

            // Responsive geometry calculation for safe viewport bounds
            const u = Math.max(0.60, Math.min(1.0, (height - 160) / 460));
            const isPortrait = width < 600;
            const cardW = isPortrait ? Math.min(280, width - 48) : Math.min(224, Math.floor((width - 80) / 5));
            const cardH = Math.floor(440 * u);
            const cardGap = 16;
            const totalW = isPortrait ? cardW : (cardW * 5 + cardGap * 4);
            const startX = Math.floor((width - totalW) * 0.5);
            const safeTitleY = Math.max(48, Math.floor(height * 0.05)) + menuOffset;
            const cardY = safeTitleY + 54;

            this.cardBounds = [];

            const renderStart = isPortrait ? this.selectedIndex : 0;
            const renderEnd = isPortrait ? this.selectedIndex + 1 : this.weapons.length;

            for (let i = renderStart; i < renderEnd; i++) {
                const w = this.weapons[i];
                const cx = isPortrait ? startX : (startX + i * (cardW + cardGap));
                const isSelected = i === this.selectedIndex;
                const isHovered = i === this.hoveredIndex;
                const cardId = 'weap_card_' + i;

                this.cardBounds.push({ index: i, id: cardId, x: cx, y: cardY, w: cardW, h: cardH });

                const tf = Theme.uiFx ? Theme.uiFx.getTransform(cardId, true) : { translateY: 0, scale: 1.0, shakeX: 0, shineProgress: 1.0, ripples: [] };

                ctx.save();
                const cardMidX = cx + cardW * 0.5;
                const cardMidY = cardY + cardH * 0.5;
                ctx.translate(cardMidX, cardMidY + tf.translateY);
                ctx.scale(tf.scale, tf.scale);
                ctx.translate(-cardMidX, -cardMidY);

                Theme.drawDuelSelectionPanel(ctx, cx, cardY, cardW, cardH, 14, isSelected, isHovered ? tf.shineProgress : 1);
                ctx.translate(0, cardY);
                ctx.scale(1, u);
                ctx.translate(0, -cardY);

                // Staggered entrance easing + selected gentle scale
                const staggerDelay = i * 0.07;
                const enterT = Math.max(0, Math.min(1, ((this.openTime || 0) - staggerDelay) / 0.38));
                const easeEnter = 1 - Math.pow(1 - enterT, 3);
                ctx.globalAlpha = easeEnter;
                ctx.translate(0, (1 - easeEnter) * 18);

                // Spotlight pulsing halo behind icon (strictly inside upper art zone)
                const iconCenterX = cx + cardW * 0.5;
                const iconCenterY = cardY + 62;
                const fx = window._fxOpts || {};
                const clock = fx.reducedMotion ? 0 : this.testFireTime;
                ctx.strokeStyle = isSelected ? '#d0a574' : '#76648f'; ctx.lineWidth = 1.1;
                ctx.globalAlpha *= 0.7;
                ctx.beginPath(); ctx.ellipse(iconCenterX, cardY + 111, cardW * 0.32, 9, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.ellipse(iconCenterX, cardY + 111, cardW * 0.25, 5, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = easeEnter;
                if (fx.particles !== false) for (let spark = 0; spark < (isSelected ? 9 : 4); spark++) {
                    const p = (spark * 0.173 + clock * 0.36) % 1;
                    ctx.globalAlpha = easeEnter * Math.sin(Math.PI * p) * 0.66;
                    ctx.fillStyle = isSelected ? '#ffe0a1' : '#d3a8ff';
                    ctx.fillRect(iconCenterX + Math.cos(spark * 2.4 + p * 2) * cardW * 0.36, cardY + 105 - p * 88, 1.4, 2.5);
                }
                ctx.globalAlpha = easeEnter;
                const iconFloatY = Math.sin(clock * 2.5 + i * 0.9) * (isHovered || isSelected ? 3.5 : 2.0);
                const iconTiltAngle = (isHovered || isSelected) ? Math.sin(clock * 2.0 + i) * 0.08 : Math.sin(clock * 1.4 + i) * 0.015;

                ctx.save();
                ctx.beginPath();
                ctx.rect(cx + 8, cardY + 6, cardW - 16, 116);
                ctx.clip();
                ctx.translate(iconCenterX, iconCenterY + iconFloatY);
                ctx.rotate(iconTiltAngle);

                const icon = getWeaponIconImage(w);
                if (icon) {
                    const iconSize = Math.min(cardW * 0.79, isSelected ? 125 : 111);
                    ctx.drawImage(icon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
                } else {
                    drawProceduralWeapon(ctx, w.id, 0, 0, 0.95);
                }
                ctx.restore();

                const panel = this._getWeaponDetails(w, cardW, isSelected);
                ctx.drawImage(panel, cx, cardY + 125);
                const previewStripY = cardY + 286;
                const previewStripH = 64;

                ctx.save();
                ctx.beginPath();
                ctx.rect(cx + 8, previewStripY, cardW - 16, previewStripH);
                ctx.clip();

                // Faint preview backdrop panel
                ctx.fillStyle = T.bgPanel;
                ctx.globalAlpha = 0.65;
                ctx.fillRect(cx + 8, previewStripY, cardW - 16, previewStripH);
                ctx.globalAlpha = 1.0;

                // Border around preview strip
                ctx.strokeStyle = isSelected ? T.electricDim : T.silverMuted;
                ctx.lineWidth = 0.8;
                ctx.strokeRect(cx + 8, previewStripY, cardW - 16, previewStripH);

                const previewWaves = w.id !== 'sword' && (isHovered || isSelected) ? 3 : 1;
                for (let wave = 0; wave < previewWaves; wave++) {
                    const waveTime = (isHovered || isSelected ? clock : 0.23) + wave * 0.40;
                    const loopT = (waveTime % 1.2) / 1.2;
                    const bulletY = previewStripY + previewStripH - 8 - loopT * (previewStripH - 12);
                    const bulletAlpha = Math.max(0, Math.min(1.0, Math.sin(loopT * Math.PI) * 1.5));
                    this._drawLiveWeaponBullets(ctx, w, iconCenterX, bulletY, loopT, bulletAlpha);
                }
                ctx.restore();


                ctx.restore();
            }

            // Bottom Buttons: Back (left) and Deploy (right / primary)
            const btnW = isPortrait ? Math.floor((width - 48) / 2) : 160;
            const btnH = Math.max(38, Math.min(44, Math.floor(44 * u)));
            const btnGap = isPortrait ? 12 : 20;
            const totalBtnsW = btnW * 2 + btnGap;
            const btnStartX = Math.floor((width - totalBtnsW) * 0.5);
            const btnY = Math.min(height - btnH - 24, Math.floor(cardY + cardH + 16));

            this.backButtonBounds = { id: 'weap_btn_back', x: btnStartX, y: btnY, w: btnW, h: btnH };
            this.confirmButtonBounds = { id: 'weap_btn_deploy', x: btnStartX + btnW + btnGap, y: btnY, w: btnW, h: btnH };

            // Secondary: Back (Deep navy, silver border, silver text)
            Theme.drawFantasyButton(ctx, this.backButtonBounds.x, btnY, btnW, btnH, t('duel.weaponSelect.back').toUpperCase(), false, this.backHovered, Theme.uiFx.getTransform(this.backButtonBounds.id));

            // Primary: Deploy (Dark navy, gold border, bright gold text, hover cyan border)
            Theme.drawFantasyButton(ctx, this.confirmButtonBounds.x, btnY, btnW, btnH, t('duel.weaponSelect.confirm').toUpperCase(), true, this.confirmHovered, Theme.uiFx.getTransform(this.confirmButtonBounds.id));

            // Controls the player may not know yet, shown only when the screen has room under the buttons
            const tipW = Math.min(390, Math.floor((width - 64) / 3)), tipsY = btnY + btnH + 14;
            if (!isPortrait && tipsY + 64 <= height - 8) {
                drawControlTips(ctx, Math.floor((width - (tipW * 3 + 24)) * 0.5), tipsY, tipW, 0.95, true);
            }

            // Global sparks
            if (Theme && Theme.uiFx) {
                Theme.uiFx.drawSparks(ctx);
            }

            ctx.restore();
        }

        _drawLiveWeaponBullets(ctx, w, cx, cy, loopT, alpha) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

            if (w.id === 'sword') {
                const travel = Math.sin(loopT * Math.PI);
                for (let side = -1; side <= 1; side++) {
                    const x = cx + side * (6 + travel * 30);
                    const y = cy + (side === 0 ? -6 : 3);
                    ctx.globalAlpha = alpha * .5;
                    ctx.strokeStyle = '#73caff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(cx + side * 5, Math.min(y + 20, cy + 16));
                    ctx.quadraticCurveTo(x + side * 7, y + 14, x, y);
                    ctx.stroke();
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(side * .48);
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = '#d4f6ff';
                    ctx.beginPath();
                    ctx.moveTo(-9, 4);
                    ctx.quadraticCurveTo(0, -11, 9, 4);
                    ctx.quadraticCurveTo(0, -4, -9, 4);
                    ctx.fill();
                    ctx.restore();
                }
            } else if (w.id === 'spear') {
                // 2 high speed parallel spears
                for (let k = -1; k <= 1; k += 2) {
                    const bx = cx + k * 14;
                    const by = cy;
                    ctx.save();
                    ctx.translate(bx, by);
                    ctx.fillStyle = T.electric;
                    ctx.fillRect(-2, -10, 4, 20);
                    ctx.fillStyle = T.white;
                    ctx.fillRect(-1, -8, 2, 16);
                    ctx.restore();
                }
            } else if (w.id === 'halberd') {
                // 3 sickle axes sweeping
                for (let k = -1; k <= 1; k++) {
                    const bx = cx + k * (20 + loopT * 12);
                    const by = cy;
                    ctx.save();
                    ctx.translate(bx, by);
                    ctx.rotate(k * 0.25 + loopT * 0.5);
                    ctx.fillStyle = T.electric;
                    ctx.beginPath();
                    ctx.arc(0, 0, 12, -Math.PI * 0.8, -Math.PI * 0.1);
                    ctx.lineTo(0, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            } else if (w.id === 'dagger_array') {
                // 4 parallel flying daggers
                const offsets = [-24, -8, 8, 24];
                for (let k = 0; k < 4; k++) {
                    const bx = cx + offsets[k];
                    const by = cy;
                    ctx.save();
                    ctx.translate(bx, by);
                    ctx.fillStyle = T.electric;
                    ctx.beginPath();
                    ctx.moveTo(0, -8);
                    ctx.lineTo(3, 0);
                    ctx.lineTo(1, 8);
                    ctx.lineTo(-1, 8);
                    ctx.lineTo(-3, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = T.white;
                    ctx.fillRect(-0.5, -6, 1, 12);
                    ctx.restore();
                }
            } else if (w.id === 'heavy_lance') {
                // Titan Greatlance: massive thrust with expanding kinetic shockwave ring
                ctx.save();
                ctx.translate(cx, cy);
                ctx.fillStyle = T.goldBright;
                ctx.beginPath();
                ctx.moveTo(0, -18);
                ctx.lineTo(6, -2);
                ctx.lineTo(4, 12);
                ctx.lineTo(-4, 12);
                ctx.lineTo(-6, -2);
                ctx.closePath();
                ctx.fill();

                // Expanding kinetic shockwave ring
                const ringR = 8 + loopT * 16;
                ctx.strokeStyle = T.goldGlow;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = Math.max(0, 1.0 - loopT);
                ctx.beginPath();
                ctx.arc(0, -6, ringR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }

        _getWeaponDetails(w, cardW, isSelected) {
            this._weaponDetails ||= new Map();
            const key = [w.id, cardW, isSelected, window._lang, document.fonts?.status].join('/');
            const cached = this._weaponDetails.get(key);
            if (cached) return cached;
            const art = document.createElement('canvas');
            art.width = Math.ceil(cardW); art.height = 300;
            const ctx = art.getContext('2d');
            const cx = 0, cardY = -125, iconCenterX = cardW * 0.5;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = Theme.getTitleFont(15, 700);
            ctx.fillStyle = isSelected ? T.goldBright : T.gold;
            ctx.fillText(t(w.nameKey), iconCenterX, cardY + 130);

            const statStartY = cardY + 158;
            const barLabels = [
                { key: 'duel.stat.width', val: w.stats.width },
                { key: 'duel.stat.precision', val: w.stats.precision },
                { key: 'duel.stat.burst', val: w.stats.burst }
            ];

            ctx.textAlign = 'left';
            ctx.font = Theme.getBodyFont(11, 600);
            for (let s = 0; s < barLabels.length; s++) {
                const rowY = statStartY + s * 20;
                ctx.fillStyle = T.silverDim;
                ctx.fillText(t(barLabels[s].key).toUpperCase(), cx + 14, rowY);

                const barStartX = cx + cardW - 68;
                for (let dot = 1; dot <= 5; dot++) {
                    const lit = dot <= barLabels[s].val;
                    const gx = barStartX + (dot - 1) * 11 + 4, gy = rowY + 6;
                    ctx.fillStyle = lit ? (isSelected ? '#dcaa70' : '#b198d8') : '#21192d';
                    ctx.strokeStyle = lit ? '#ffe0b2' : '#63476b';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(gx, gy - 4); ctx.lineTo(gx + 4, gy);
                    ctx.lineTo(gx, gy + 4); ctx.lineTo(gx - 4, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
                }
            }

            // Description in Segoe UI
            ctx.textAlign = 'center';
            ctx.font = Theme.getBodyFont(11, 400);
            ctx.fillStyle = T.silverDim;
            this._renderWrappedText(ctx, t(w.descKey), iconCenterX, cardY + 224, cardW - 20, 15);

            Theme.drawGradientDivider(ctx, cx + 14, cx + cardW - 14, cardY + 355);
            ctx.font = Theme.getBodyFont(10, 700); ctx.fillStyle = '#c5956f';
            ctx.fillText(t('duel.relic.category'), iconCenterX, cardY + 363);
            ctx.font = Theme.getTitleFont(12, 700); ctx.fillStyle = '#f3c98e';
            ctx.fillText('[A] ' + t(w.skillA.nameKey), iconCenterX, cardY + 378, cardW - 22);
            ctx.font = Theme.getBodyFont(10.5, 400); ctx.fillStyle = '#c9bbb4';
            this._renderWrappedText(ctx, t(w.skillA.descKey), iconCenterX, cardY + 397, cardW - 24, 13);
            if (this._weaponDetails.size >= 36) this._weaponDetails.delete(this._weaponDetails.keys().next().value);
            this._weaponDetails.set(key, art);
            return art;
        }

        _renderWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
            if (!text) return;
            const words = text.split(' ');
            let line = '';
            let curY = y;
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    ctx.fillText(line.trim(), x, curY);
                    line = words[n] + ' ';
                    curY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line.trim(), x, curY);
        }

        handlePointerDown(x, y) {
            this.pressedElementId = null;

            for (let i = 0; i < this.cardBounds.length; i++) {
                const b = this.cardBounds[i];
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    this.pressedElementId = b.id;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                    return;
                }
            }

            if (this.confirmButtonBounds) {
                const b = this.confirmButtonBounds;
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    this.pressedElementId = b.id;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                    return;
                }
            }

            if (this.backButtonBounds) {
                const b = this.backButtonBounds;
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    this.pressedElementId = b.id;
                    if (Theme && Theme.uiFx) Theme.uiFx.onPointerDown(b.id, x, y);
                    return;
                }
            }
        }

        handlePointerMove(x, y) {
            this.lastMouseX = x;
            this.lastMouseY = y;

            this.hoveredIndex = -1;
            for (let i = 0; i < this.cardBounds.length; i++) {
                const b = this.cardBounds[i];
                const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                if (isInside) this.hoveredIndex = b.index;
                if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, isInside);
            }

            if (this.confirmButtonBounds) {
                const b = this.confirmButtonBounds;
                this.confirmHovered = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, this.confirmHovered);
            }

            if (this.backButtonBounds) {
                const b = this.backButtonBounds;
                this.backHovered = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                if (Theme && Theme.uiFx) Theme.uiFx.onPointerMove(b.id, this.backHovered);
            }
        }

        handlePointerUp(x, y) {
            const pressedId = this.pressedElementId;
            this.pressedElementId = null;

            for (let i = 0; i < this.cardBounds.length; i++) {
                const b = this.cardBounds[i];
                if (pressedId === b.id) {
                    const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                    const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                    if (triggered) {
                        this.selectedIndex = b.index;
                        if (Theme && Theme.uiFx) {
                            Theme.uiFx.triggerSelectPop(b.id, b.x + b.w - 18, b.y + 18);
                        }
                        return { action: 'select', weapon: this.weapons[this.selectedIndex] };
                    }
                    return null;
                }
            }

            if (this.confirmButtonBounds && pressedId === this.confirmButtonBounds.id) {
                const b = this.confirmButtonBounds;
                const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                if (triggered) {
                    return { action: 'confirm', weapon: this.weapons[this.selectedIndex] };
                }
                return null;
            }

            if (this.backButtonBounds && pressedId === this.backButtonBounds.id) {
                const b = this.backButtonBounds;
                const isInside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
                const triggered = Theme && Theme.uiFx ? Theme.uiFx.onPointerUp(b.id, isInside) : isInside;
                if (triggered) {
                    return { action: 'back' };
                }
                return null;
            }

            return null;
        }

        handleClick(x, y) {
            this.handlePointerDown(x, y);
            return this.handlePointerUp(x, y);
        }

        handleMouseMove(x, y) {
            this.handlePointerMove(x, y);
        }

        handleKey(e) {
            if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
                this.selectedIndex = (this.selectedIndex - 1 + this.weapons.length) % this.weapons.length;
                if (Theme && Theme.uiFx) Theme.uiFx.triggerSelectPop('weap_card_' + this.selectedIndex, 0, 0);
                return { action: 'navigate' };
            }
            if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
                this.selectedIndex = (this.selectedIndex + 1) % this.weapons.length;
                if (Theme && Theme.uiFx) Theme.uiFx.triggerSelectPop('weap_card_' + this.selectedIndex, 0, 0);
                return { action: 'navigate' };
            }
            if (e.code === 'Enter' || e.key === 'Enter' || e.code === 'NumpadEnter') {
                return { action: 'confirm', weapon: this.weapons[this.selectedIndex] };
            }
            if (e.code === 'Escape' || e.key === 'Escape') {
                return { action: 'back' };
            }
            return null;
        }
    }

    function renderEvolutionCamera(ctx, width, height, elapsed, x, y) {
        window.DuelCinematics.evolutionCamera(ctx, width, height, elapsed, x, y);
    }

    function renderPreBattleTransition(ctx, width, height, elapsed, session) {
        window.DuelCinematics.renderOpening(ctx, width, height, elapsed, session);
    }

    function renderSpellCardTransition(ctx, width, height, info, elapsed) {
        window.DuelCinematics.spellCard(ctx, width, height, info, elapsed);
    }

    function renderPhaseTransition(ctx, width, height, phaseNumber) {
        ctx.save();
        ctx.fillStyle = T.bgOverlay;
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const phaseKey = 'duel.phase.' + phaseNumber;
        const plateW = Math.min(580, width * 0.64), plateH = 112;
        Theme.drawObsidianPlate(ctx, (width - plateW) * 0.5, height * 0.47 - plateH * 0.5, plateW, plateH, { cut: 16, horns: true, ember: 1 });
        ctx.font = Theme.getTitleFont(32, 700);
        ctx.fillStyle = T.gold;
        ctx.fillText(t(phaseKey), width * 0.5, height * 0.47 - 12);

        ctx.font = Theme.getBodyFont(15, 400);
        ctx.fillStyle = '#c9a98a';
        ctx.fillText(t('duel.opponent.egregor.theme'), width * 0.5, height * 0.47 + 28);

        ctx.restore();
    }

    // Three control tips (Shift, F and A), each a plate with a key cap and the text wrapped to at most two lines.
    // Returns the height used so callers can stack it. alpha fades the whole block.
    function drawControlTips(ctx, x, y, w, alpha, horizontal) {
        const tips = [{ key: 'SHIFT', text: t('duel.tip.shift') }, { key: 'F', text: t('duel.tip.f') }, { key: 'A', text: t('duel.tip.a') }];
        const rowH = horizontal ? 64 : 50, gap = horizontal ? 12 : 8, capW = 46;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.textBaseline = 'middle';
        for (let i = 0; i < tips.length; i++) {
            const ry = horizontal ? y : y + i * (rowH + gap);
            const rx = horizontal ? x + i * (w + gap) : x;
            Theme.drawObsidianPlate(ctx, rx, ry, w, rowH, { cut: 8, ember: 0.35 });
            const capX = rx + 12, capY = ry + 10, capH = rowH - 20;
            ctx.fillStyle = 'rgba(232, 196, 106, 0.14)';
            ctx.fillRect(capX, capY, capW, capH);
            ctx.strokeStyle = '#8c6a32';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(capX + 0.5, capY + 0.5, capW - 1, capH - 1);
            ctx.textAlign = 'center';
            ctx.font = Theme.getTitleFont(13, 700);
            ctx.fillStyle = '#e8c46a';
            ctx.fillText(tips[i].key, capX + capW * 0.5, capY + capH * 0.5 + 1);
            ctx.textAlign = 'left';
            ctx.font = Theme.getBodyFont(12.5, 400);
            ctx.fillStyle = '#e6d3a1';
            const maxW = w - capW - 40, words = tips[i].text.split(' ');
            const lines = [];
            let line = '';
            for (const word of words) {
                const next = line ? line + ' ' + word : word;
                if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = word; } else line = next;
            }
            if (line) lines.push(line);
            const lh = 16, top = ry + rowH * 0.5 - (lines.length - 1) * lh * 0.5;
            for (let l = 0; l < lines.length; l++) ctx.fillText(lines[l], capX + capW + 14, top + l * lh);
        }
        ctx.restore();
        return horizontal ? rowH : tips.length * rowH + (tips.length - 1) * gap;
    }

    function renderHUD(ctx, width, height, state) {
        ctx.save();

        // The health ratio and chip damage belong to the current attack.
        const barW = Math.min(500, width * 0.44), barH = 16;
        const barX = (width - barW) * 0.5, barY = 34;
        const attackId = state.attackId || 1;
        const ratio = state.maxHp > 0 ? Math.max(0, Math.min(1, state.hp / state.maxHp)) : 0;
        const reset = renderHUD._barSerial !== state.attackSerial;
        const previous = reset ? ratio : renderHUD._chip;
        const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - (renderHUD._barTime || now)) / 1000));
        renderHUD._barTime = now; renderHUD._barSerial = state.attackSerial;
        renderHUD._chip = Math.max(ratio, previous - dt * Math.max(0.18, (previous - ratio) * 2.4));
        Theme.drawBossHPBar(ctx, barX, barY, barW, barH, ratio, renderHUD._chip, state.bossName || t('duel.phase.1.title'), state.enemySlowed, {
            attackId, attackElapsed: state.elapsed, transition: state.transitionState,
            nextAttackId: state.nextAttackId, transitionElapsed: state.transitionElapsed,
            transitionProgress: state.transitionProgress, slowLabel: t('duel.opening.slowed'),
            hitFlash: state.hpBarHitFlash || 0, heavyShake: state.hpBarHeavyShake || 0
        });


        // 3. Clean top-right HUD panel (Timer, Lives, Shield distinct rows)
        const _hMob = width < 600 || (typeof _platform !== 'undefined' && _platform === 'mobile');
        const _hW = _hMob ? 148 : 180;
        const _hX = width - _hW - 14;
        const _hY = 12;
        const _hPad = 12;
        const _rH = _hMob ? 22 : 26;
        const _hH = _hMob ? 78 : 92;

        Theme.drawObsidianPlate(ctx, _hX, _hY, _hW, _hH, { cut: 9, ember: 0.6 });

        ctx.textAlign = 'right';
        let _ry = _hY + 8;

        // Row 1: Battle Elapsed Timer
        const totalSec = Math.floor(state.stats ? state.stats.timeSec : (state.elapsed || 0));
        const tmm = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const tss = String(totalSec % 60).padStart(2, '0');
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = '#e6d3a1';
        if (typeof window !== 'undefined' && typeof window._iconText === 'function') {
            window._iconText('clock', tmm + ':' + tss, _hX + _hW - _hPad, _ry + 14, 13);
        } else {
            ctx.fillText(tmm + ':' + tss, _hX + _hW - _hPad, _ry + 14);
        }
        _ry += _rH;

        // Divider
        ctx.strokeStyle = 'rgba(232, 196, 106, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(_hX + 10, _ry); ctx.lineTo(_hX + _hW - 10, _ry); ctx.stroke();
        _ry += 4;

        // Row 2: Lives with heart icon (blinking red when < 5)
        const curLives = (typeof state.lives === 'number') ? state.lives : 8;
        if (curLives < 5) {
            const _bt = performance.now();
            const _blink = window._fxOpts?.reducedMotion ? .85 : 0.7 + 0.3 * Math.abs(Math.sin(_bt / 380));
            ctx.fillStyle = 'rgb(255,' + Math.round(40 * _blink) + ',' + Math.round(40 * _blink) + ')';
        } else {
            ctx.fillStyle = '#ffffff';
        }
        ctx.font = 'bold 15px Arial';
        if (typeof window !== 'undefined' && typeof window._iconText === 'function') {
            window._iconText('heart', String(curLives), _hX + _hW - _hPad, _ry + 14, 13);
        } else {
            ctx.fillText('♥ ' + String(curLives), _hX + _hW - _hPad, _ry + 14);
        }
        _ry += _rH;

        // Divider
        ctx.beginPath(); ctx.moveTo(_hX + 10, _ry); ctx.lineTo(_hX + _hW - 10, _ry); ctx.stroke();
        _ry += 4;

        // Row 3: Player Shield status with dedicated indicator
        const hudShieldActive = state.playerShieldActive !== false;
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = hudShieldActive ? '#e8c46a' : '#d9825b';
        const shieldCd = state.playerShieldCooldownRemaining || 0;
        const shieldText = hudShieldActive ? (window._lang === 'vi' ? 'KHIÊN SẴN SÀNG' : 'SHIELD READY') : ((window._lang === 'vi' ? 'HỒI KHIÊN ' : 'SHIELD ') + Math.ceil(shieldCd) + 's');
        ctx.fillText(shieldText, _hX + _hW - _hPad, _ry + 12);

        // 5. Bottom left corner HUD: Shift domain, Player Shield, Skill F
        const shiftCx = 48;
        const shiftCy = height - 48;
        const isShiftHolding = state.shiftActive === true;
        const isShiftCooling = state.shiftCooldownRemaining > 0;
        const isShiftReady = !isShiftHolding && !isShiftCooling;

        let shiftChargeRatio = 1.0;
        let shiftLabel = t('duel.hud.shiftReady');
        if (isShiftHolding) {
            const holdRatio = Math.max(0, 1.0 - (state.shiftElapsed || 0) / 2.0);
            shiftChargeRatio = holdRatio;
            shiftLabel = (Math.max(0, 2.0 - (state.shiftElapsed || 0))).toFixed(1) + 's';
        } else if (isShiftCooling) {
            shiftChargeRatio = Math.max(0, 1.0 - state.shiftCooldownRemaining / 4.0);
            shiftLabel = state.shiftCooldownRemaining.toFixed(1) + 's';
        }
        Theme.drawShiftDomainArc(ctx, shiftCx, shiftCy, 24, shiftChargeRatio, isShiftReady, shiftLabel);

        // Player Shield gauge
        const shieldCx = 108;
        const shieldCy = height - 48;
        const shieldActive = state.playerShieldActive !== false;
        const shieldRatio = state.playerShieldCooldownRatio !== undefined ? state.playerShieldCooldownRatio : 1.0;
        const shieldLabel = shieldActive ? t('duel.hud.shield') : (state.playerShieldCooldownRemaining ? state.playerShieldCooldownRemaining.toFixed(0) + 's' : t('duel.hud.shield'));
        Theme.drawPlayerShieldGauge(ctx, shieldCx, shieldCy, 24, shieldActive, shieldRatio, shieldLabel);

        // Skill F gauge
        const skillFCx = 168;
        const skillFCy = height - 48;
        const skillFActive = state.skillFActive || false;
        const skillFCharging = state.skillFCharging || false;
        const skillFChargeRatio = state.skillFChargeRatio || 0.0;
        const skillFRatio = state.skillFCooldownRatio !== undefined ? state.skillFCooldownRatio : 1.0;
        Theme.drawSkillFGauge(ctx, skillFCx, skillFCy, 24, skillFActive, skillFRatio, skillFCharging, skillFChargeRatio, t('duel.hud.skillF'));

        // Active Divine Arm icon badge in HUD
        if (state.weaponId) {
            const activeW = DIVINE_WEAPONS.find(function (item) { return item.id === state.weaponId; });
            const wIcon = activeW ? getWeaponIconImage(activeW) : null;
            const badgeCx = 228;
            const badgeCy = height - 48;
            ctx.save();
            ctx.fillStyle = 'rgba(5, 12, 26, 0.85)';
            const skill = activeW?.skillA;
            const ratio = skill ? Math.max(0, 1 - (state.skillACooldown || 0) / skill.cooldown) : 1;
            ctx.strokeStyle = state.skillAActive ? '#ffbc85' : '#8e7564';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(badgeCx, badgeCy, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.save(); ctx.strokeStyle = ratio >= 1 ? '#efc38d' : '#c37d68'; ctx.lineWidth = 3;
            if (ratio >= 1 && !window._fxOpts?.reducedMotion && window._fxOpts?.glow !== false) ctx.globalAlpha *= .86 + .14 * Math.sin(performance.now() * .004);
            ctx.beginPath(); ctx.arc(badgeCx,badgeCy,25,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio); ctx.stroke(); ctx.restore();
            if (wIcon) {
                ctx.drawImage(wIcon, badgeCx - 16, badgeCy - 16, 32, 32);
            } else if (activeW) {
                drawProceduralWeapon(ctx, activeW.id, badgeCx, badgeCy, 0.42);
            }
            ctx.font = Theme.getBodyFont(10,700);ctx.textAlign='center';ctx.fillStyle='#efc38d';
            ctx.fillText(state.skillACooldown > 0 ? state.skillACooldown.toFixed(1)+'s' : 'A',badgeCx,badgeCy+5);
            ctx.font=Theme.getBodyFont(9,600);ctx.fillText(skill ? t(skill.labelKey) : 'A',badgeCx,badgeCy-36,65);
            ctx.restore();
        }

        // Mobile touch button for Skill F if touch device
        const hasTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
        if (hasTouch) {
            const touchSize = 56;
            const touchX = width - 140;
            const touchY = height - 76;
            Theme.drawSkillFTouchButton(ctx, touchX, touchY, touchSize, skillFRatio >= 1.0, skillFCharging, skillFRatio);
        }

        ctx.restore();
    }

    function renderResultScreen(ctx, width, height, outcome, stats, setBoundsCallback, isPractice = false) {
        ctx.save();
        ctx.fillStyle = T.bgOverlay;
        ctx.fillRect(0, 0, width, height);

        const isVictory = outcome === 'victory';

        // Timing for animations: ease out 0.8s count up, stamp slams at 0.20 to 0.32s
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (!stats._enterStamp) stats._enterStamp = now;
        const elapsed = (now - stats._enterStamp) / 1000;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (isPractice) {
            // Practice Mode Result Screen
            const pTitleKey = isVictory ? 'duel.practice.cleared' : 'duel.practice.failed';
            ctx.font = Theme.getTitleFont(28, 700);
            ctx.fillStyle = isVictory ? T.gold : T.crimson;
            ctx.fillText(t(pTitleKey), width * 0.5, height * 0.12);

            const attNum = stats.currentAttackId || 1;
            ctx.font = Theme.getBodyFont(14, 700);
            ctx.fillStyle = T.electric;
            ctx.fillText(('SPELL ' + attNum + ': ' + t('duel.attack.' + attNum)).toUpperCase(), width * 0.5, height * 0.19);

            const panelW = Math.min(480, width * 0.78);
            const panelH = 210;
            const px = (width - panelW) * 0.5;
            const py = height * 0.25;

            Theme.drawFantasyPanel(ctx, px, py, panelW, panelH, 16, true, 4);

            const targetTime = stats.timeSec || 0;
            const targetDamage = Math.round(stats.damageDealt || 0);
            const targetGraze = stats.grazeCount || 0;
            const targetShifts = stats.shiftCount || 0;
            const targetShields = stats.shieldBreaksCount || 0;

            function getCountVal(target, rowIdx) {
                const delay = rowIdx * 0.12;
                const p = Math.max(0, Math.min(1, (elapsed - delay) / 0.8));
                const eased = 1 - Math.pow(1 - p, 3);
                return Math.round(target * eased);
            }

            const rows = [
                { label: t('duel.result.time').toUpperCase(), value: (getCountVal(targetTime * 10, 0) / 10).toFixed(1) + 's' },
                { label: t('duel.result.damage').toUpperCase(), value: getCountVal(targetDamage, 1).toLocaleString() },
                { label: t('duel.result.graze').toUpperCase(), value: getCountVal(targetGraze, 2).toLocaleString() },
                { label: t('duel.result.shifts').toUpperCase(), value: String(getCountVal(targetShifts, 3)) },
                { label: t('duel.result.shieldAbsorptions').toUpperCase(), value: String(getCountVal(targetShields, 4)) }
            ];

            const rowH = 34;
            const rowStartY = py + 20;
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const ry = rowStartY + i * rowH;

                ctx.textAlign = 'left';
                ctx.font = Theme.getBodyFont(12, 600);
                ctx.fillStyle = T.silverDim;
                ctx.fillText(r.label, px + 24, ry);

                ctx.textAlign = 'right';
                ctx.font = Theme.getBodyFont(13, 700);
                ctx.fillStyle = T.white;
                ctx.fillText(r.value, px + panelW - 24, ry);

                if (i < rows.length - 1) {
                    Theme.drawGradientDivider(ctx, px + 20, px + panelW - 20, ry + rowH - 4);
                }
            }

            // Buttons: Retry, Pick Another, Main Menu (44px touch height)
            const btnW = 140;
            const btnH = 44;
            const btnGap = 16;
            const totalBtnsW = btnW * 3 + btnGap * 2;
            const btnStartX = (width - totalBtnsW) * 0.5;
            const btnY = py + panelH + 28;

            const mainMenuBounds = { id: 'res_btn_mm', x: btnStartX, y: btnY, w: btnW, h: btnH };
            const pickAnotherBounds = { id: 'res_btn_pick', x: btnStartX + btnW + btnGap, y: btnY, w: btnW, h: btnH };
            const retryBounds = { id: 'res_btn_retry', x: btnStartX + (btnW + btnGap) * 2, y: btnY, w: btnW, h: btnH };

            if (typeof setBoundsCallback === 'function') {
                setBoundsCallback({ retry: retryBounds, pickAnother: pickAnotherBounds, mainMenu: mainMenuBounds });
            }

            Theme.drawFantasyButton(ctx, mainMenuBounds.x, btnY, btnW, btnH, t('duel.result.mainMenu').toUpperCase(), false, false);
            Theme.drawFantasyButton(ctx, pickAnotherBounds.x, btnY, btnW, btnH, t('duel.practice.pickAnother').toUpperCase(), false, false);
            Theme.drawFantasyButton(ctx, retryBounds.x, btnY, btnW, btnH, t('duel.practice.retry').toUpperCase(), true, false);

            ctx.restore();
            return;
        }

        // Full Voyage Result Screen
        const titleKey = isVictory ? 'duel.result.victory' : 'duel.result.defeat';
        const titleColor = isVictory ? T.gold : T.crimson;

        ctx.font = Theme.getTitleFont(34, 700);
        ctx.fillStyle = titleColor;
        ctx.fillText(t(titleKey), width * 0.5, height * 0.05);

        // Strict Rank determination: S strictly requires clearing ALL 18 attacks
        const clearedCount = stats.clearedAttacks ? stats.clearedAttacks.length : 0;
        let rank = 'D';
        if (clearedCount === 18) {
            if (stats.timeSec < 480 && stats.livesRemaining >= 4) rank = 'S';
            else if (stats.timeSec < 600 && stats.livesRemaining >= 2) rank = 'A';
            else rank = 'B';
        } else if (clearedCount >= 12) {
            rank = 'B';
        } else if (clearedCount >= 6) {
            rank = 'C';
        } else {
            rank = 'D';
        }

        // Rank stamp: zooms in and slams down (scale 2.4 to 1.0 in 120ms between 0.20s and 0.32s)
        const rankCy = height * 0.15;
        let stampScale = 1.0;
        let stampAlpha = 1.0;
        if (elapsed < 0.20) {
            stampAlpha = 0;
            stampScale = 2.4;
        } else if (elapsed < 0.32) {
            const sp = (elapsed - 0.20) / 0.12;
            stampScale = 2.4 - 1.4 * sp;
            stampAlpha = sp;
        } else {
            stampScale = 1.0;
            stampAlpha = 1.0;
            // Play stamp audio cue once at impact
            if (!stats._stampSoundPlayed) {
                stats._stampSoundPlayed = true;
                if (typeof window !== 'undefined' && window.AudioMgr && typeof window.AudioMgr.playSfx === 'function') {
                    try { window.AudioMgr.playSfx('ui-card-select'); } catch (e) {}
                }
            }
        }

        // Shockwave ring and screen shake at stamp impact
        let rankShakeX = 0;
        let rankShakeY = 0;
        if (elapsed >= 0.32 && elapsed < 0.52) {
            const shakeP = (0.52 - elapsed) / 0.20;
            const shakeAmp = isVictory ? 5.0 : 2.5;
            rankShakeX = (Math.random() - 0.5) * shakeAmp * shakeP;
            rankShakeY = (Math.random() - 0.5) * shakeAmp * shakeP;
        }

        if (stampAlpha > 0) {
            ctx.save();
            ctx.translate(width * 0.5 + rankShakeX, rankCy + rankShakeY);
            ctx.scale(stampScale, stampScale);
            ctx.globalAlpha = stampAlpha;

            // Diamond frame for rank stamp
            Theme.drawDiamondMark(ctx, 0, 0, 52);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = Theme.getTitleFont(28, 700);
            ctx.fillStyle = isVictory ? T.bgOuter : T.crimsonDark;
            ctx.fillText(rank, 0, 0);

            // Expanding shockwave ring
            if (elapsed >= 0.32 && elapsed < 0.62) {
                const swP = (elapsed - 0.32) / 0.30;
                ctx.beginPath();
                ctx.arc(0, 0, 40 + swP * 45, 0, Math.PI * 2);
                ctx.strokeStyle = isVictory ? T.goldBright : T.crimson;
                ctx.lineWidth = 2.0 * (1.0 - swP);
                ctx.globalAlpha = (1.0 - swP) * 0.8;
                ctx.stroke();
            }

            ctx.restore();
        }

        // Defeat notification banner if lost
        if (!isVictory) {
            const failedAtt = (stats.clearedAttacks ? stats.clearedAttacks.length + 1 : 1);
            ctx.textBaseline = 'top';
            ctx.font = Theme.getBodyFont(13, 600);
            ctx.fillStyle = T.crimson;
            ctx.fillText(t('duel.result.defeatedAt').toUpperCase() + ' SPELL ' + failedAtt + ': ' + t('duel.attack.' + failedAtt).toUpperCase(), width * 0.5, height * 0.205);
        }

        // Stats panel
        const panelW = Math.min(540, width * 0.82);
        const panelH = 188;
        const px = (width - panelW) * 0.5;
        const py = height * 0.235;

        Theme.drawFantasyPanel(ctx, px, py, panelW, panelH, 16, true, 4);

        const targetTime = stats.timeSec || 0;
        const targetDamage = Math.round(stats.damageDealt || 0);
        const targetGraze = stats.grazeCount || 0;
        const targetShifts = stats.shiftCount || 0;
        const targetCleared = clearedCount;
        const targetShields = stats.shieldBreaksCount || 0;

        function getCountUpVal(target, rowIdx) {
            const delay = rowIdx * 0.12;
            const p = Math.max(0, Math.min(1, (elapsed - delay) / 0.8));
            const eased = 1 - Math.pow(1 - p, 3);
            return Math.round(target * eased);
        }

        const rows = [
            { label: t('duel.result.time').toUpperCase(), value: (getCountUpVal(targetTime * 10, 0) / 10).toFixed(1) + 's' },
            { label: t('duel.result.damage').toUpperCase(), value: getCountUpVal(targetDamage, 1).toLocaleString() },
            { label: t('duel.result.graze').toUpperCase(), value: getCountUpVal(targetGraze, 2).toLocaleString() },
            { label: t('duel.result.shifts').toUpperCase(), value: String(getCountUpVal(targetShifts, 3)) },
            { label: t('duel.result.attacksCleared').toUpperCase(), value: getCountUpVal(targetCleared, 4) + ' / 18' },
            { label: t('duel.result.shieldAbsorptions').toUpperCase(), value: String(getCountUpVal(targetShields, 5)) }
        ];

        const rowH = 28;
        const rowStartY = py + 14;
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const ry = rowStartY + i * rowH;

            ctx.textAlign = 'left';
            ctx.font = Theme.getBodyFont(12, 600);
            ctx.fillStyle = T.silverDim;
            ctx.fillText(r.label, px + 24, ry);

            ctx.textAlign = 'right';
            ctx.font = Theme.getBodyFont(13, 700);
            ctx.fillStyle = T.white;
            ctx.fillText(r.value, px + panelW - 24, ry);

            if (i < rows.length - 1) {
                Theme.drawGradientDivider(ctx, px + 20, px + panelW - 20, ry + rowH - 4);
            }
        }

        // 18 Attack Status Grid (3 columns of 6) with sequential checkmarks reveal
        const gridW = panelW;
        const gridH = 116;
        const gx = px;
        const gy = py + panelH + 12;

        Theme.drawFantasyPanel(ctx, gx, gy, gridW, gridH, 12, false, 4);

        const colW = (gridW - 20) / 3;
        for (let c = 0; c < 3; c++) {
            for (let r = 0; r < 6; r++) {
                const attId = c * 6 + r + 1;
                const bx = gx + 10 + c * colW;
                const by = gy + 8 + r * 17;

                const isCleared = stats.clearedAttacks && stats.clearedAttacks.some(a => (typeof a === 'number' ? a : a.attackId) === attId);
                const isCurrent = attId === clearedCount + 1 && !isVictory;

                // Sequential checkmark reveal: 80ms per item
                const checkDelay = 0.4 + attId * 0.06;
                const isRevealed = elapsed >= checkDelay;

                let prefix = '· ';
                if (isCleared) {
                    prefix = isRevealed ? '◆ ' : '· ';
                } else if (isCurrent) {
                    prefix = isRevealed ? '✕ ' : '· ';
                }

                const fullLabel = prefix + attId + '. ' + t('duel.attack.' + attId);

                let fontSize = 11;
                ctx.font = Theme.getBodyFont(fontSize, 600);
                while (fontSize > 8.0 && ctx.measureText(fullLabel).width > (colW - 14)) {
                    fontSize -= 0.5;
                    ctx.font = Theme.getBodyFont(fontSize, 600);
                }

                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillStyle = (isCleared && isRevealed) ? T.silver : (isCurrent && isRevealed ? T.crimson : T.silverMuted);
                ctx.fillText(fullLabel, bx, by);
            }
        }

        // Save best record in localStorage
        try {
            const oldRec = localStorage.getItem('pisces_duel_best_egregor');
            const summary = 'Cleared ' + clearedCount + '/18, Rank ' + rank;
            if (!oldRec || clearedCount > 0) {
                localStorage.setItem('pisces_duel_best_egregor', summary);
            }
        } catch (_) {}

        // Buttons (44px touch height)
        const btnW = 160;
        const btnH = 44;
        const btnY = gy + gridH + 16;
        const mainMenuBounds = { id: 'res_btn_mm', x: width * 0.5 - btnW - 12, y: btnY, w: btnW, h: btnH };
        const playAgainBounds = { id: 'res_btn_pa', x: width * 0.5 + 12, y: btnY, w: btnW, h: btnH };

        if (typeof setBoundsCallback === 'function') {
            setBoundsCallback({ playAgain: playAgainBounds, mainMenu: mainMenuBounds });
        }

        Theme.drawFantasyButton(ctx, mainMenuBounds.x, btnY, btnW, btnH, t('duel.result.mainMenu').toUpperCase(), false, false);
        Theme.drawFantasyButton(ctx, playAgainBounds.x, btnY, btnW, btnH, t('duel.result.playAgain').toUpperCase(), true, false);

        ctx.restore();
    }

    return {
        DIVINE_WEAPONS,
        I18N_STRINGS,
        OpponentSelectUI,
        WeaponPickerUI,
        renderPreBattleTransition,
        renderEvolutionCamera,
        renderSpellCardTransition,
        renderPhaseTransition,
        drawControlTips,
        renderHUD,
        renderResultScreen,
        initI18n,
        t
    };
});
