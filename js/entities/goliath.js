// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/goliath.js — Goliath (Demigod of Genesis): Alpha/Circuit
// Link, Corrupted Genesis, transform, True Form + Inevitable/Warding Palm/
// Threshold Ward/Unified Front/Tempered Resolve/Waning Might/Shield Burst,
// Unbroken Will, Joker copy system, death sequence. Extracted from
// entities.js. Must load after entities.js and before main.js.

function spawnGoliath() {
    const alphaSize = 125; // ngang Thaelis (100-150), không phải khối khổng lồ
    const g = {
        x: canvas.width / 2, y: -alphaSize,
        size: alphaSize, speed: 0,
        hp: 1, maxHp: 1,
        type: 'goliath',
        shield: 0,
        // Mượn cờ inCoronation có sẵn (dùng ~20 chỗ khắp code để đánh dấu
        // "không thể chọn làm mục tiêu") — Alpha/Transforming phải HOÀN TOÀN
        // vô hình với Sentinel/skill/tinh linh auto-target, không chỉ bất tử.
        inCoronation: true,
        phase: 'alpha', // 'alpha' | 'transforming' | 'true_form'
        _restX: canvas.width / 2,
        _restY: canvas.height * 0.14,
        _appearTimer: 0,
        slots: [{ filled: false, gem: null }, { filled: false, gem: null }, { filled: false, gem: null }],
        // Circuit Link: sổ ghi thiệt hại nhận được trong lúc còn bị liên kết,
        // theo từng enemy (Map enemy -> tổng dmg), cộng dồn thành damagePull
        // khi enemy đó chết trong lúc vẫn còn liên kết.
        _linkedLedger: new Map(),
        _pendingGems: [],
        _flyingGems: [], // {x,y,gem,t,dur} — bảo thạch đang bay từ chỗ enemy chết vào khe
        damagePull: 0,
        gemPoints: 0,
        transformTimer: 0,
        // True Form (rỗng cho tới khi biến hình xong)
        trueFormReady: false,
        _inevitableWindowEnd: 0,
        _inevitableCooldownEnd: 0,
        _weaveSeed: Math.random() * 1000,
        _weaveClock: 0,
        _wasCasting: false,
        // Fracture Step: dịch chuyển khi có mối đe doạ trong 100px, +1 lớp
        // Iron Body (hấp thụ 3 đòn) mỗi lần, cooldown riêng cho bản thân skill
        _fractureStepCooldownEnd: 0,
        _fractureIronBodyHits: 0,
        _fractureTeleportPhase: 'idle',
        // Absolute Verdict: kênh 3s rồi phóng quả cầu xuyên phá
        _verdictPhase: 'ready', // 'ready' | 'channeling' | 'cooldown'
        _verdictChannelTimer: 0,
        _verdictCooldownEnd: 0,
        _verdictLocked: false,
        _verdictLockX: 0, _verdictLockY: 0,
        // Warding Palm: chặn phản ứng (không có "phase" — check ngay trong dealDamage)
        // Corrupted Meteor (NEW): hút 1 Apostle bất kỳ, nén thành lõi thiên
        // thạch trong tay rồi ném về phía người chơi. CD 5s.
        _meteorPhase: 'ready', // 'ready' | 'charging'
        _meteorChargeTimer: 0,
        _meteorCooldownEnd: 0,
        _meteorTargets: [],
        // Threshold Ward: mốc HP đã kích hoạt + kho khiên tích luỹ
        _thresholdMilestonesHit: { 75: false, 50: false, 25: false },
        _thresholdShieldPool: 0,
        // Joker Thaelis (Tenacity, NEW): mốc HP 5% gần nhất đã phát thưởng
        _thaelisLastMilestone: 100,
        _meteors: [],
        _fusedCount: 0,
        _armFused: { left: 0, right: 0 },
        _limbPopFired: false,
        // Joker: 3 kỹ năng copy chạy ĐỘC LẬP, không chia sẻ cooldown với nhau
        // hay với Fracture Step/Absolute Verdict/Warding Palm/Threshold Ward.
        // Điền khi vào True Form, dựa vào 3 bảo thạch thực tế đã hấp thụ.
        _jokerState: {},
    };
    enemies.push(g);
    if (window.AudioMgr) {
        window.AudioMgr.enterGoliathSpawnDuck();
        window.AudioMgr.playSfxAt('goliath-spawn', g.x, g.y);
        // One-shot cue, no onended hook available - duck for its rough
        // runtime instead of tracking real playback end.
        setTimeout(() => { if (window.AudioMgr) window.AudioMgr.exitGoliathSpawnDuck(); }, 1800);
    }
    _goliathCircuitLink(g);

    // Passive của Alpha: ceil(1/3) số kẻ địch còn lại trong wave này bị loại
    // ngay lập tức, số còn lại được +15% MaxHP. Bug cũ: Goliath luôn spawn ở
    // at:0 (đầu wave, xem _buildWaveQueue) nên lúc này gần như chưa có con
    // nào thật sự tồn tại trên màn hình — cull theo `enemies` gần như luôn
    // ra 0. Sửa: cull thẳng từ _waveQueue (những gì CÒN CHƯA spawn của wave
    // này), và buff +15% được áp ở _updateWaveSystem's spawn dispatch (main.js)
    // cho MỌI enemy spawn ra sau đây trong cùng wave, không phân biệt tier.
    const _cullCount = Math.ceil(_waveQueue.length / 3);
    for (let i = 0; i < _cullCount && _waveQueue.length > 0; i++) {
        _waveQueue.splice(Math.floor(Math.random() * _waveQueue.length), 1);
    }
    window._goliathWaveHpBuff = 1.15;
    addExplosion(g.x, g.y, g.size * 1.5, '#f59e0b');
    createParticles(g.x, g.y, 30, '#f59e0b', 3, 10);
}

// Circuit Link (passive): liên kết tới TẤT CẢ enemy đang có trên màn hình
// tại thời điểm spawn — +20% DR cho Goliath (áp trong dealDamage), và mỗi
// enemy bị liên kết được gắn tham chiếu ngược để dealDamage() có thể ghi sổ
// thiệt hại nó nhận vào _linkedLedger của Goliath.
function _goliathCircuitLink(g) {
    enemies.forEach(e => {
        if (e === g || e.type === 'goliath') return;
        if (e.type && e.type.startsWith('enemy_bullet')) return;
        e._goliathLinkedTo = g;
        g._linkedLedger.set(e, 0);
    });
}

// Circuit Link cũng hút HEAL/KHIÊN — enemy đang bị liên kết (Alpha) mà tự
// hồi HP hoặc tự có thêm khiên thì phần đó cộng thẳng vào damagePull ngay
// lập tức (không cần đợi enemy đó chết như với damage, vì đây là tài nguyên
// DƯƠNG — hút được lúc nào là cộng lúc đó).
function _goliathTrackResourceGain(enemy, amount) {
    if (!(amount > 0)) return;
    const g = enemy._goliathLinkedTo;
    if (g && g.phase === 'alpha') g.damagePull += amount;
}

// Tổng hợp mọi hệ số +hiệu quả heal/shield Goliath tự nhận, cộng dồn với
// nhau (không cái nào thay thế cái nào): Joker Thaelis (Tenacity, +35%,
// thường trực nếu có bảo thạch) + Fracture Step hậu-dịch-chuyển (+15%, chỉ
// 1s sau mỗi lần dịch chuyển). Dùng ở mọi nơi Goliath tự cấp heal/shield cho
// chính mình (Inevitable regen, Threshold Ward, hồi lúc bắt đầu vận skill...).
function _goliathHealBoost(enemy, amount) {
    let mult = 1;
    if (enemy._jokerState && enemy._jokerState['Thaelis']) mult += 0.35;
    if (enemy._fractureBuffEnd && performance.now() < enemy._fractureBuffEnd) mult += 0.15;
    if (enemy._unbrokenWillBuffEnd && performance.now() < enemy._unbrokenWillBuffEnd) mult += 0.40;
    mult += _walpurgisHealShieldMult() - 1; // Walpurgis (Huyết Dạ): +5% heal effectiveness per stack
    mult += enemy._unifiedFrontHealPct || 0; // Unified Front: +5%/ally on the map, cap +60%
    return amount * mult * Math.pow(0.80, _goliathWaningStacks(enemy));
}

// Waning Might (NEW): mỗi 35s True Form còn sống, Goliath yếu dần đi trên
// 3 trục cùng lúc — DR gốc, hiệu quả hồi HP/khiên, và sát thương tự gây ra
// — nhân dồn (không cộng thẳng, tránh về âm) chứ không có trần, đảm bảo
// trận nào kéo dài cỡ nào cũng phải kết thúc mà không đụng vào sức mạnh
// đầu trận (0 stack cho tới khi qua mốc 35s đầu tiên).
function _goliathWaningStacks(enemy) {
    if (!enemy._trueFormEnteredAt) return 0;
    return Math.floor((performance.now() - enemy._trueFormEnteredAt) / 35000);
}

// Unified Front (True Form passive): counts every living player-side unit
// on the map right now - the player, real Sentinels, Yuusha Party members,
// and the Remembrance Spirit - and scales 3 defensive stats off that count
// (N). Refreshed every 1s to the CURRENT N rather than compounding tick
// over tick. The shield top-up adds into the same shared enemy.shield pool
// everything else uses (Threshold Ward, Corrupted Genesis...), so it stacks
// with those normally - it just doesn't keep growing across its own ticks.
function _goliathCountAllies() {
    let n = 1; // the player is always on the map while a run is active
    n += sentinels.length;
    n += (window._yuushaSquad || []).filter(s => s.hp > 0).length;
    n += spirits.length;
    return n;
}

// Fracture Step hậu-dịch-chuyển (NEW): +20% MỌI sát thương Goliath tự gây
// ra (Joker copies, Absolute Verdict, Corrupted Meteor...) trong 1s sau khi
// vừa dịch chuyển xong. Waning Might nhân dồn theo chiều ngược lại phía trên.
function _goliathDmgBoost(enemy, amount) {
    const fractureMult = (enemy._fractureBuffEnd && performance.now() < enemy._fractureBuffEnd) ? 1.20 : 1;
    return amount * fractureMult * Math.pow(0.85, _goliathWaningStacks(enemy));
}

// Every Goliath attack (Absolute Verdict, Corrupted Meteor, and every Joker
// copy) that lands on the player also silences them - no skills, no auto-shot
// - 0.75s for a normal attack, 1.25s for Absolute Verdict specifically. Root
// is untouched; this is purely a lock on the player's own attacks, not movement.
function _goliathApplySilence(durMs) {
    const now = performance.now();
    player._silenced = true;
    player._silenceEnd = Math.max(player._silenceEnd || 0, now + (durMs || 750));
}

// Unbroken Will (1 lần duy nhất/con): đòn lẽ ra đã kết liễu Goliath thì thay
// vào đó — bất tử 4s (tái dùng đúng cổng Iron Body tuyệt đối của
// _transformIronBodyEnd, không ngoại lệ nào xuyên nổi, kể cả true damage),
// hồi đầy HP, và +1 lớp barrier = 20% MaxHP ngay lập tức. Sau khi 4s bất tử đã hết hẳn (KHÔNG
// chồng lấn), mở ra cửa sổ 6s tiếp theo: +40% hiệu quả hồi HP/khiên (cộng dồn
// qua _goliathHealBoost), +20% MaxHP (kèm HP hiện tại cộng thẳng phần đó, tự
// rút lại khi hết hạn — xem updateGoliath), +15% tốc độ bay — cửa sổ này được
// mở đúng lúc bắn sóng giải phóng, xem entities.js updateGoliath. Trả về true
// nếu đã kích hoạt (đòn này KHÔNG trừ HP thật) để nơi gọi bỏ qua việc trừ HP.
function _goliathTryUnbrokenWill(enemy, incomingHpDamage) {
    if (enemy.type !== 'goliath' || enemy.phase !== 'true_form') return false;
    if (enemy._unbrokenWillUsed) return false;
    // Fires reactively off the 1-HP floor below (not off this hit's own
    // size) so it always catches the real final blow, no matter how many
    // smaller unmitigated hits (true damage skips every other Goliath
    // defense layer) chipped it down first — a single early oversized hit
    // can no longer "waste" the save on something that wasn't actually
    // the kill.
    if (!(incomingHpDamage > 0) || enemy.hp > 1) return false;
    enemy._unbrokenWillUsed = true;
    const now = performance.now();
    enemy._transformIronBodyEnd = Math.max(enemy._transformIronBodyEnd || 0, now + 4000);
    // Riêng theo dõi mốc HẾT bất tử của CHÍNH Unbroken Will (không dùng
    // chung _transformIronBodyEnd — field đó có thể bị mốc invuln biến hình
    // ban đầu ghi đè/kéo dài) để biết CHÍNH XÁC lúc nào bắn sóng giải phóng.
    enemy._unbrokenWillInvulnEnd = now + 4000;
    enemy.hp = enemy.maxHp;
    enemy.barrier = (enemy.barrier || 0) + Math.ceil(enemy.maxHp * 0.20);
    addExplosion(enemy.x, enemy.y, enemy.size * 1.1, '#f97316');
    createParticles(enemy.x, enemy.y, 40, '#fdba74', 3, 11);
    _setShake(16, 400);
    return true;
}

// Unbroken Will — sóng giải phóng: bắn ngay khi 4s bất tử vừa hết, đúng 1
// lần duy nhất (đi kèm passive, không có cooldown riêng vì chỉ có thể kích
// hoạt 1 lần/con). Không tự push thẳng vào spawnBossShockwave() (hàm đó gắn
// cứng SFX/AudioMgr.startMaouHaki — không hợp ngữ nghĩa ở đây, đây không phải
// 1 đòn tấn công vào người chơi) mà tự dựng wave object cùng thông số tốc
// độ/maxRadius để khớp đúng "duration bằng Maou Haki" — xem xử lý
// wave._isUnbrokenWave ở main.js (quét sạch đạn người chơi, không trừ mạng
// ai, nhưng gây 100 + 20% MaxHp của Goliath dưới dạng true damage cho Sentinels).
function _goliathReleaseUnbrokenWave(enemy, now) {
    bossShockwaves.push({
        x: enemy.x, y: enemy.y,
        radius: 0,
        maxRadius: Math.hypot(canvas.width, canvas.height),
        speed: 12,
        hitSentinels: new Set(),
        active: true,
        _isUnbrokenWave: true,
        _sourceMaxHp: enemy.maxHp,
    });
    // Animation "tung chiêu": cờ hint cho render vẽ tư thế giải phóng năng
    // lượng (2 tay/thân bung ra) trong 500ms trước khi sóng thật bắt đầu đọc rõ.
    enemy._unbrokenReleaseAnimEnd = now + 500;
    addExplosion(enemy.x, enemy.y, enemy.size * 1.3, '#f97316');
    createParticles(enemy.x, enemy.y, 50, '#fb923c', 4, 12);
    _setShake(24, 500);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('goliath-unbroken-wave', enemy.x, enemy.y);
}

// Joker Marchosias (Sword & Barrier, full port): proc kích hoạt Sword khi
// barrier bị đánh trúng — hàng đợi tối đa 4 quả/chu kỳ, cooldown 650ms giữa
// các lần trigger, mỗi quả windup 1000ms trước khi bắn thật (giống hệt
// _tryTriggerMarchosiasCounter thật, chỉ khác chỗ lưu trạng thái).
function _goliathTryTriggerSword(enemy) {
    const s = enemy._jokerState['Marchosias'];
    if (!s || s.barrierDown) return;
    const now = performance.now();
    if (s.lastSwordTriggerAt && now - s.lastSwordTriggerAt < 650) return;
    if ((s.swordsThisCycle || 0) >= 10) return;
    s.lastSwordTriggerAt = now;
    s.swordsThisCycle = (s.swordsThisCycle || 0) + 1;
    s.windups.push({ timer: 0, dur: 1000, targetX: player.x, targetY: player.y });
    // ĐÚNG bản gốc: chạm mốc sword thứ 10 (max/chu kỳ) thì barrier TỰ NỔ
    // ngay lập tức, không cần đợi hết HP.
    if (s.swordsThisCycle >= 10) _goliathMarchosiasBarrierBreak(enemy, s);
}

// Joker Marchosias: barrier riêng 8000 HP CỐ ĐỊNH (không scale theo maxHp
// Goliath), 60% DR (dmg vào barrier = raw × 0.40), cap 35% HP HIỆN TẠI của
// barrier/đòn, đòn xuyên (isPiercing) chỉ hấp thụ 1 phần rồi tiếp tục qua
// thân với -30% dmg, true damage bỏ qua barrier hoàn toàn. LƯU Ý: không có
// toạ độ điểm va chạm ở hầu hết nguồn damage gọi tới dealDamage() nên
// KHÔNG port được phần "chỉ chặn trong cung 90° hướng mặt" của bản gốc —
// barrier của Goliath hấp thụ TOÀN HƯỚNG (omnidirectional), đổi lại vẫn giữ
// nguyên né 10%, lifesteal, sword-proc, và break/revive.
// Trả về: 'evaded' | 'absorbed' | 'passthrough' | null (không có barrier/bỏ qua)
function _goliathMarchosiasBarrier(enemy, source) {
    const s = enemy._jokerState['Marchosias'];
    if (!s || s.barrierDown || source.isTrueDamage) return null;
    if (Math.random() < 0.10) {
        _goliathTryTriggerSword(enemy);
        addExplosion(enemy.x, enemy.y, enemy.size * 0.35, '#aaddff');
        if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
        return 'evaded';
    }
    let dmg = Math.ceil((source.damage || 0) + (s.barrierMaxHp * (source.percentDamage || 0)));
    dmg = Math.ceil(dmg * 0.40);
    if (source.isPiercing) {
        dmg = Math.ceil(dmg * 1.15);
        dmg = Math.min(dmg, Math.ceil(s.barrierHp * 0.35));
        const barrierHeal = Math.min(2000, Math.ceil(dmg * 0.05));
        const wasAlive = s.barrierHp > 0;
        s.barrierHp = Math.max(0, s.barrierHp - dmg + barrierHeal);
        _goliathMarchosiasBodyHeal(enemy, dmg);
        _goliathTryTriggerSword(enemy);
        if (wasAlive && s.barrierHp <= 0) _goliathMarchosiasBarrierBreak(enemy, s);
        source.damage = Math.ceil((source.damage || 0) * 0.70);
        if (source.percentDamage) source.percentDamage *= 0.70;
        return 'passthrough';
    }
    dmg = Math.min(dmg, Math.ceil(s.barrierHp * 0.35));
    const barrierHeal = Math.min(2000, Math.ceil(dmg * 0.05));
    const wasAlive = s.barrierHp > 0;
    s.barrierHp = Math.max(0, s.barrierHp - dmg + barrierHeal);
    _goliathMarchosiasBodyHeal(enemy, dmg);
    _goliathTryTriggerSword(enemy);
    if (wasAlive && s.barrierHp <= 0) _goliathMarchosiasBarrierBreak(enemy, s);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
    return 'absorbed';
}
function _goliathMarchosiasBodyHeal(enemy, dmg) {
    const healAmt = Math.min(2000, Math.ceil(dmg * 0.10));
    const newHp = enemy.hp + healAmt;
    if (newHp > enemy.maxHp) {
        enemy.hp = enemy.maxHp;
        _addEnemyShield(enemy, Math.ceil((newHp - enemy.maxHp) * 0.50));
    } else {
        enemy.hp = newHp;
    }
}
function _goliathMarchosiasBarrierBreak(enemy, s) {
    if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
    addExplosion(enemy.x, enemy.y, enemy.size * 0.9, '#ff3344');
    createParticles(enemy.x, enemy.y, 24, '#ff3344', 3, 10);
    enemy.ironBodyHits = (enemy.ironBodyHits || 0) + 5;
    const healAmt = Math.ceil(enemy.maxHp * 0.40);
    const newHp = enemy.hp + healAmt;
    if (newHp > enemy.maxHp) {
        enemy.hp = enemy.maxHp;
        _addEnemyShield(enemy, Math.ceil((newHp - enemy.maxHp) * 0.50));
    } else {
        enemy.hp = newHp;
    }
    _addEnemyShield(enemy, Math.ceil(enemy.maxHp * 0.15 + (enemy.maxHp - enemy.hp) * 0.15));
    s.barrierDown = true;
    const fullCycle = (s.swordsThisCycle || 0) >= 10;
    const reviveDelay = fullCycle ? 3000 : Math.max(4000, 5000 - (gameElapsedTime / 180000) * 1000);
    s.reviveAt = performance.now() + reviveDelay;
}

function updateGoliath(enemy, deltaTime) {
    const now = performance.now();

    // Hiệu ứng nổ chết (True Form): mắt + 3 bảo thạch phát nổ lần lượt, rồi
    // thân từ từ tan rã thành đá vụn, cuối cùng bốc hơi bụi theo gió. Giữ
    // enemy.hp = 1 suốt sequence để main.js KHÔNG splice/kill ngay — chỉ khi
    // sequence xong mới thật sự cho hp về 0 để đường xử lý chết chung (score,
    // handleEnemyKill...) chạy đúng 1 lần.
    if (enemy._deathPhase) {
        _goliathUpdateDeathSequence(enemy, deltaTime, now);
        return;
    }
    if (enemy.phase === 'true_form' && enemy.hp <= 0) {
        enemy._deathPhase = 'core';
        enemy._deathPhaseTimer = 0;
        enemy._deathGemsExploded = 0;
        enemy.hp = 1;
        _goliathUpdateDeathSequence(enemy, deltaTime, now);
        return;
    }

    if (enemy.phase === 'alpha') {
        // Circuit Link KHÔNG được chỉ chụp 1 lần lúc spawn — enemy sinh ra
        // SAU Goliath (trường hợp bình thường: bấm nút debug Goliath rồi mới
        // bấm nút boss khác, hoặc quái tới theo wave sau khi Goliath đã xuất
        // hiện) sẽ không bao giờ được liên kết, khiến Corrupted Genesis/Damage
        // Pull không bao giờ có gì để ăn. Quét lại liên tục suốt pha Alpha —
        // hàm này chỉ gắn cờ cho enemy CHƯA có _goliathLinkedTo nên gọi lại
        // nhiều lần vô hại.
        _goliathCircuitLink(enemy);

        // Trồi lên từ mép trên rồi dừng hẳn (speed=0 — Alpha không di chuyển
        // liên tục như quái thường, chỉ có 1 lần ease-in lúc xuất hiện)
        enemy._appearTimer += deltaTime;
        const p = Math.min(1, enemy._appearTimer / 1500);
        const ease = 1 - Math.pow(1 - p, 3);
        enemy.y = -enemy.size + (enemy._restY - (-enemy.size)) * ease;

        // Bảo thạch đang bay từ chỗ enemy vừa chết vào khe (main.js death-hook
        // chỉ tạo hiệu ứng rớt + object bay, chưa đưa thẳng vào _pendingGems)
        for (let i = (enemy._flyingGems || []).length - 1; i >= 0; i--) {
            const fg = enemy._flyingGems[i];
            fg.t += (deltaTime / 1000) / fg.dur;
            if (fg.t >= 1) {
                enemy._pendingGems.push(fg.gem);
                enemy._flyingGems.splice(i, 1);
                // Dư chấn nhẹ khi bảo thạch va vào thân — rung thân Alpha
                // một chút (không phải screen shake toàn màn hình).
                enemy._gemImpactShakeEnd = now + 260;
            }
        }

        // Corrupted Genesis: quét các enemy Abnormal-tier trở lên đã chết
        // trong danh sách liên kết, thu bảo thạch màu tương ứng nguồn gốc.
        // (Việc rơi bảo thạch + tính damagePull thực hiện trong dealDamage
        // và death-hook ở main.js — hàm này chỉ lo việc HẤP THỤ khi đủ 3+.)
        if ((enemy._pendingGems || []).length >= 3 && enemy.slots.some(s => !s.filled)) {
            const used = new Set(enemy.slots.filter(s => s.filled).map(s => s.gem.name));
            for (let i = 0; i < enemy._pendingGems.length && enemy.slots.some(s => !s.filled); i++) {
                const gem = enemy._pendingGems[i];
                if (used.has(gem.name)) continue;
                const slot = enemy.slots.find(s => !s.filled);
                slot.filled = true; slot.gem = gem;
                used.add(gem.name);
                enemy._pendingGems.splice(i, 1); i--;
            }
        }
        if (enemy.slots.every(s => s.filled) && enemy.phase === 'alpha') {
            _goliathBeginTransform(enemy);
        }
    } else if (enemy.phase === 'transforming') {
        const tBefore = enemy.transformTimer / 1000;
        enemy.transformTimer += deltaTime;
        const tAfter = enemy.transformTimer / 1000;
        // Theo dõi thiên thạch đáp xuống (chỉ trong pha Summon, 0-2.2s) để
        // render file biết khối nóng chảy thân/vai phồng to tới đâu.
        if (tAfter < 2.2) {
            enemy._meteors.forEach(m => {
                if (!m.arrived && tAfter >= m.arriveAt * 2.2) {
                    m.arrived = true;
                    if (m.target === 'body') enemy._fusedCount++;
                    else enemy._armFused[m.target]++;
                }
            });
        }
        if (enemy.transformTimer >= 4000) _goliathEnterTrueForm(enemy);
    } else if (enemy.phase === 'true_form') {
        // Unified Front: every 1s, recompute healing effectiveness + flat DR
        // off the current ally count, and top up shield by 5% MaxHP per ally.
        enemy._unifiedFrontTimer = (enemy._unifiedFrontTimer || 0) + deltaTime;
        if (enemy._unifiedFrontTimer >= 1000) {
            enemy._unifiedFrontTimer -= 1000;
            const _uAllies = _goliathCountAllies();
            enemy._unifiedFrontHealPct = Math.min(0.60, 0.05 * _uAllies);
            enemy._unifiedFrontDRMult = 1 + 0.1 * _uAllies;
            enemy._unifiedFrontScalingDRMult = 1 + 0.15 * _uAllies;
            if (_uAllies > 0) {
                const _uShield = enemy.maxHp * 0.05 * _uAllies;
                enemy.shield = (enemy.shield || 0) + _uShield;
                _goliathTrackResourceGain(enemy, _uShield);
            }
        }

        // Lượn qua lượn lại kiểu boss Touhou — CHẬM, êm, uy nghiêm (không phải
        // rung giật nhiều tần số như trước). Tâm dao động bám theo vị trí đã
        // ổn định gần nhất (_restX/_restY, cập nhật khi Fracture Step dịch
        // chuyển) chứ không nhảy về giữa màn hình, và ưu tiên vùng gần viền
        // trên. Đứng yên hoàn toàn khi Phantom (Veilshroud-copy) đang kích
        // hoạt — Phantom thật của Veilshroud cũng đứng im lúc vô hiệu hoá.
        // Hạn chế mới: đang vận bất kỳ skill nào (của chính Goliath hay Joker
        // copy) thì chậm 35% (weave clock chạy chậm hơn thay vì đứng hẳn) +
        // cấm Fracture Step (dịch chuyển) + hồi 20% MaxHP 1 LẦN DUY NHẤT ngay
        // khi vừa VẬN XONG (bắt cạnh xuống true->false, không phải mỗi frame).
        const isCasting = _goliathIsCasting(enemy);
        // Fracture Step hậu-dịch-chuyển (NEW): +10% tốc độ bay trong 1s.
        const _fractureSpdMult = (enemy._fractureBuffEnd && now < enemy._fractureBuffEnd) ? 1.10 : 1;
        // Unbroken Will (NEW): +15% tốc độ bay trong cửa sổ 6s sau khi cứu mạng.
        const _unbrokenSpdMult = (enemy._unbrokenWillBuffEnd && now < enemy._unbrokenWillBuffEnd) ? 1.15 : 1;
        enemy._weaveClock = (enemy._weaveClock || 0) + deltaTime * (isCasting ? 0.65 : 1) * _fractureSpdMult * _unbrokenSpdMult;

        // Unbroken Will (NEW): hết cửa sổ 6s thì rút lại đúng phần +20% MaxHP
        // đã cấp tạm thời (chỉ 1 lần duy nhất trong đời Goliath này).
        if (enemy._unbrokenWillMaxHpBonus && now >= enemy._unbrokenWillBuffEnd) {
            enemy.maxHp -= enemy._unbrokenWillMaxHpBonus;
            enemy.hp = Math.min(enemy.hp, enemy.maxHp);
            enemy._unbrokenWillMaxHpBonus = 0;
        }
        if (!isCasting && enemy._wasCasting) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + _goliathHealBoost(enemy, enemy.maxHp * 0.20));
        }
        enemy._wasCasting = isCasting;

        const veilJoker = enemy._jokerState['Veilshroud'];
        const inPhantomCopy = veilJoker && veilJoker.phantomEnd && now < veilJoker.phantomEnd;
        // Đứng yên khi Phantom HOẶC đang giữa chuỗi dịch chuyển Fracture Step
        // (đóng/mở vòng pháp trận) — không để weave đè lên vị trí đã khoá.
        const inFractureTransition = enemy._fractureTeleportPhase === 'closing' || enemy._fractureTeleportPhase === 'opening';
        if (!inPhantomCopy && !inFractureTransition) {
            const t = enemy._weaveClock / 1000 + enemy._weaveSeed;
            const ampX = canvas.width * 0.28, ampY = canvas.height * 0.10;
            const centerX = enemy._restX != null ? enemy._restX : canvas.width / 2;
            const centerY = Math.min(enemy._restY, canvas.height * 0.30);
            // Giảm thêm ~30% tốc độ bay (bay hơi nhanh, theo yêu cầu): chu kỳ
            // dài hơn nữa — 13.85 -> 18, 10 -> 13.
            const targetX = centerX + Math.sin(t * Math.PI * 2 / 18) * ampX;
            const targetY = centerY + Math.sin(t * Math.PI * 2 / 13 + 1.2) * ampY;
            // Blend mượt ~1.2s vào công thức weave thay vì áp dụng ngay — tránh
            // vị trí NHẢY đột ngột (ăn theo weaveSeed ngẫu nhiên) ngay lúc vừa
            // vào True Form hoặc vừa dịch chuyển xong (2 chỗ set _weaveEnterAt).
            if (enemy._weaveEnterAt && now - enemy._weaveEnterAt < 1200) {
                const bp = Math.min(1, (now - enemy._weaveEnterAt) / 1200);
                const ease = bp * bp * (3 - 2 * bp); // smoothstep
                enemy.x = enemy._weaveEnterX + (targetX - enemy._weaveEnterX) * ease;
                enemy.y = enemy._weaveEnterY + (targetY - enemy._weaveEnterY) * ease;
            } else {
                enemy.x = targetX; enemy.y = targetY;
            }
        }

        // Fracture Step: dịch chuyển CHẬM RÕ RÀNG qua 2 giai đoạn — vòng pháp
        // trận đóng lại tại vị trí cũ (400ms), rồi mở ra tại vị trí mới
        // (400ms) — không còn dịch chuyển tức thời như trước.
        if (!enemy._fractureTeleportPhase || enemy._fractureTeleportPhase === 'idle') {
            if (!isCasting && now >= enemy._fractureStepCooldownEnd) {
                const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                let threatNear = distToPlayer < 100;
                if (!threatNear && typeof bullets !== 'undefined') {
                    threatNear = bullets.some(b => Math.hypot(b.x - enemy.x, b.y - enemy.y) < 100);
                }
                // Death Star's contact kill is a real threat the passive weave
                // drift doesn't otherwise avoid — react a bit before actual
                // contact range (SKILLD_CONTACT_MULT's own threshold) so it
                // reads as a dodge, not a reflex after already touching it.
                let dsThreat = false;
                if (typeof deathStar !== 'undefined' && deathStar) {
                    const distToDs = Math.hypot(enemy.x - deathStar.x, enemy.y - deathStar.y);
                    dsThreat = distToDs < deathStar.size * SKILLD_CONTACT_MULT * 1.6 + enemy.size / 2;
                }
                threatNear = threatNear || dsThreat;
                if (threatNear || !enemy._lastFractureAt || now - enemy._lastFractureAt >= 2000) {
                    enemy._lastFractureAt = now;
                    enemy._fractureStepCooldownEnd = now + 2000;
                    enemy._fractureTeleportPhase = 'closing';
                    enemy._fractureTeleportStart = now;
                    enemy._fractureFromX = enemy.x; enemy._fractureFromY = enemy.y;
                    if (dsThreat) {
                        // Pick a destination biased to the far side of the
                        // screen from the Death Star instead of a fully
                        // random spot that could just as easily land it
                        // right back in contact range.
                        const _dsAwayX = deathStar.x < canvas.width / 2 ? canvas.width * 0.7 : canvas.width * 0.3;
                        enemy._fractureToX = Math.max(150, Math.min(canvas.width - 150, _dsAwayX + (Math.random() - 0.5) * canvas.width * 0.3));
                        enemy._fractureToY = canvas.height * 0.18 + Math.random() * (canvas.height * 0.35);
                    } else {
                        enemy._fractureToX = 150 + Math.random() * (canvas.width - 300);
                        enemy._fractureToY = canvas.height * 0.18 + Math.random() * (canvas.height * 0.35);
                    }
                }
            }
        } else if (enemy._fractureTeleportPhase === 'closing') {
            if (now - enemy._fractureTeleportStart >= 400) {
                addExplosion(enemy._fractureFromX, enemy._fractureFromY, enemy.size * 0.7, '#f59e0b');
                createParticles(enemy._fractureFromX, enemy._fractureFromY, 18, '#f59e0b', 3, 9);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('goliath-fracture-step', enemy._fractureFromX, enemy._fractureFromY);
                enemy.x = enemy._fractureToX; enemy.y = enemy._fractureToY;
                enemy._restX = enemy.x; enemy._restY = enemy.y;
                enemy._fractureIronBodyHits = Math.min(3, enemy._fractureIronBodyHits + 3);
                // Hậu-dịch-chuyển (NEW, 1s): +20% sát thương Goliath gây ra,
                // +10% tốc độ bay, +15% hiệu quả heal/khiên (cộng dồn Tenacity).
                enemy._fractureBuffEnd = now + 1000;
                enemy._fractureTeleportPhase = 'opening';
                enemy._fractureTeleportStart = now;
                addExplosion(enemy.x, enemy.y, enemy.size * 0.9, '#fff8e1');
                createParticles(enemy.x, enemy.y, 24, '#fff8e1', 4, 10);
                enemy._fractureTeleportFlashEnd = now + 700;
            }
        } else if (enemy._fractureTeleportPhase === 'opening') {
            if (now - enemy._fractureTeleportStart >= 400) {
                enemy._fractureTeleportPhase = 'idle';
                // Weave chỉ resume SAU khi cổng đã mở xong — neo lại đúng vị
                // trí vừa dịch chuyển tới rồi blend mượt vào công thức weave,
                // tránh giật ngay lúc weave bắt đầu chạy lại.
                enemy._weaveEnterX = enemy.x;
                enemy._weaveEnterY = enemy.y;
                enemy._weaveEnterAt = now;
            }
        }

        // Absolute Verdict: kênh 3s rồi phóng quả cầu xuyên phá (35% MaxHP
        // true damage vào Sentinel, -5 mạng người chơi nếu trúng)
        if (enemy._verdictPhase === 'ready' && now >= enemy._verdictCooldownEnd) {
            enemy._verdictPhase = 'channeling';
            enemy._verdictChannelTimer = 0;
            enemy._verdictLocked = false;
            if (window.AudioMgr) window.AudioMgr.startGoliathVerdictCharge();
        } else if (enemy._verdictPhase === 'channeling') {
            enemy._verdictChannelTimer += deltaTime;
            // Chỉ TRACK vị trí người chơi tới trước lúc bắn 500ms — sau mốc đó
            // khoá cứng vị trí ngắm, không dí theo nữa, cho người chơi 1
            // khoảng thời gian rõ ràng để né trước khi quả cầu thật sự phóng.
            if (!enemy._verdictLocked && enemy._verdictChannelTimer >= 2500) {
                enemy._verdictLocked = true;
                enemy._verdictLockX = player.x; enemy._verdictLockY = player.y;
            }
            if (enemy._verdictChannelTimer >= 3000) {
                enemy._verdictPhase = 'ready';
                enemy._verdictCooldownEnd = now + 8000;
                if (window.AudioMgr) window.AudioMgr.stopGoliathVerdictCharge();
                // Phóng ra từ MẮT (không phải tâm thân), theo đúng hướng đã
                // khoá lúc 2500ms — không dùng vị trí tại đúng thời điểm bắn.
                const _eye = _goliathEyeWorldPos(enemy);
                const vAngle = Math.atan2(enemy._verdictLockY - _eye.y, enemy._verdictLockX - _eye.x);
                window._goliathOrbs = window._goliathOrbs || [];
                window._goliathOrbs.push({
                    x: _eye.x, y: _eye.y, vx: Math.cos(vAngle) * 420, vy: Math.sin(vAngle) * 420,
                    dmg: enemy.maxHp * 0.35, owner: enemy, life: 4000,
                });
                if (window.AudioMgr) window.AudioMgr.playSfxAt('goliath-verdict-launch', _eye.x, _eye.y);
            }
        }

        // Corrupted Meteor: hút tối đa 3 Apostle khác nhau, nén mỗi con thành
        // 1 lõi thiên thạch riêng, quăng cả 3 (toả nhẹ) về phía người chơi
        // đang đứng lúc bắt đầu quăng. Nếu không còn Apostle nào để hút, vẫn
        // quăng 1 thiên thạch "trơn" (không tiêu thụ gì) — skill không bao
        // giờ bị bỏ lỡ hoàn toàn. CD 4s, không tự tính là "vận skill" chậm
        // 35% cho gọn (đã có CD ngắn riêng), nhưng vẫn khoá Fracture Step
        // qua _goliathIsCasting như mọi skill khác.
        if (enemy._meteorPhase === 'ready' && now >= enemy._meteorCooldownEnd) {
            const apostles = enemies.filter(e => e !== enemy && e.type === 'apostle' && e.hp > 0);
            apostles.sort(() => Math.random() - 0.5);
            enemy._meteorTargets = apostles.slice(0, 3);
            enemy._meteorPhase = 'charging';
            enemy._meteorChargeTimer = 0;
        } else if (enemy._meteorPhase === 'charging') {
            enemy._meteorChargeTimer += deltaTime;
            enemy._meteorTargets = (enemy._meteorTargets || []).filter(a => a && a.hp > 0);
            if (enemy._meteorChargeTimer >= 800) {
                const targets = enemy._meteorTargets;
                // Số thiên thạch KHÔNG bằng số Apostle hút được nữa: 1 con ->
                // 3 thiên thạch, 2 con -> 4, 3 con -> 5 (tối đa 5). 0 con vẫn
                // quăng đúng 1 thiên thạch "trơn" như cũ.
                const throwCount = targets.length > 0 ? Math.min(5, targets.length + 2) : 1;
                const _eye = _goliathEyeWorldPos(enemy);
                const baseAng = Math.atan2(player.y - _eye.y, player.x - _eye.x);
                window._goliathMeteors = window._goliathMeteors || [];
                for (let i = 0; i < throwCount; i++) {
                    const src = targets[i];
                    if (src) {
                        // Tiêu thụ Apostle — biến hẳn thành thiên thạch, không rớt
                        // điểm/gem như chết thường (Corrupted Genesis xử lý riêng
                        // ở death-hook main.js dựa vào _goliathLinkedTo, con này
                        // bị xoá thẳng nên không kích hoạt đường đó).
                        addExplosion(src.x, src.y, 40, '#f59e0b');
                        src.hp = 0; src._markedForDeath = true; src._noDrop = true;
                    }
                    const spread = throwCount > 1 ? (i - (throwCount - 1) / 2) * 0.18 : 0;
                    const ang = baseAng + spread;
                    window._goliathMeteors.push({
                        x: _eye.x, y: _eye.y, vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400,
                        owner: enemy, life: 4000, _fireTime: now,
                    });
                }
                if (window.AudioMgr) window.AudioMgr.playSfxAt('goliath-corrupted-meteor', _eye.x, _eye.y);
                enemy._meteorPhase = 'ready';
                enemy._meteorCooldownEnd = now + 4000;
                enemy._meteorTargets = [];
            }
        }

        _goliathUpdateJoker(enemy, deltaTime, now);

        // Threshold Ward: mốc HP 75/50/25% mỗi mốc cho +20% MaxHP khiên 1 lần
        const hpPct = enemy.hp / enemy.maxHp;
        [75, 50, 25].forEach(mile => {
            if (!enemy._thresholdMilestonesHit[mile] && hpPct * 100 <= mile) {
                enemy._thresholdMilestonesHit[mile] = true;
                enemy._thresholdShieldPool += _goliathHealBoost(enemy, enemy.maxHp * 0.20);
            }
        });
        // Evade (NEW): +10% 3.5s mỗi lần HP tụt XUYÊN QUA 75/50/25% — dùng HP
        // KHUNG HÌNH TRƯỚC (không phải cờ latch như trên) nên lặp lại được vô
        // hạn lần nếu hồi lên rồi tụt lại đúng mốc. Không cộng dồn: chỉ set
        // lại đúng 1 mốc hết hạn, dù 1 đòn lớn tụt xuyên luôn cả 3 mốc cùng lúc.
        if (enemy._lastHpPctForEvade === undefined) enemy._lastHpPctForEvade = hpPct;
        [75, 50, 25].forEach(mile => {
            if (enemy._lastHpPctForEvade * 100 > mile && hpPct * 100 <= mile) {
                enemy._evadeThresholdBuffEnd = now + 3500;
            }
        });
        enemy._lastHpPctForEvade = hpPct;
        // Unbroken Will: ngay khi 4s bất tử vừa hết, giải phóng 1 đợt sóng
        // quét sạch đạn người chơi trong tầm — cơ chế y hệt Maou Haki (cùng
        // tốc độ/maxRadius), không gây sát thương/trừ mạng người chơi, nhưng
        // CÓ gây 50 + 20% MaxHp cho Sentinels (xem wave._isUnbrokenWave ở
        // main.js). Cùng lúc này, mở cửa sổ buff 6s hậu-cứu-mạng (KHÔNG chồng
        // lấn với 4s bất tử vừa qua) — +20% MaxHp cấp ngay tại đây, +40% hiệu
        // quả hồi HP/khiên và +15% tốc độ bay đọc trực tiếp từ
        // _unbrokenWillBuffEnd ở nơi khác.
        if (enemy._unbrokenWillInvulnEnd && now >= enemy._unbrokenWillInvulnEnd && !enemy._unbrokenWillWaveFired) {
            enemy._unbrokenWillWaveFired = true;
            enemy._unbrokenWillBuffEnd = now + 6000;
            const _maxHpBonus = Math.ceil(enemy.maxHp * 0.20);
            enemy._unbrokenWillMaxHpBonus = _maxHpBonus;
            enemy.maxHp += _maxHpBonus;
            enemy.hp += _maxHpBonus;
            _goliathReleaseUnbrokenWave(enemy, now);
        }
        // Khiên tích luỹ vượt mốc 25/50/75/100% MaxHp → hồi máu tương ứng
        [1.0, 0.75, 0.5, 0.25].forEach(frac => {
            if (enemy._thresholdShieldPool >= enemy.maxHp * frac && enemy.hp < enemy.maxHp * frac) {
                enemy.hp = Math.max(enemy.hp, enemy.maxHp * frac);
            }
        });

        // Joker Thaelis (Tenacity, NEW): mỗi 5% MaxHP mất (mốc mới, chưa từng
        // phát) hồi 2.5% MaxHP + cấp 1% MaxHP khiên — cả 2 đều ăn +35% của
        // chính Tenacity (cộng dồn, không tự loại trừ chính nó).
        if (enemy._jokerState['Thaelis']) {
            while (enemy._thaelisLastMilestone - hpPct * 100 >= 5) {
                enemy._thaelisLastMilestone -= 5;
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + _goliathHealBoost(enemy, enemy.maxHp * 0.025));
                enemy.shield = (enemy.shield || 0) + _goliathHealBoost(enemy, enemy.maxHp * 0.01);
                createParticles(enemy.x, enemy.y, 12, '#ffe066', 2, 7);
            }
        }

        // Inevitable: hồi máu 2.5%/s, ăn +35% Tenacity nếu có
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + _goliathHealBoost(enemy, enemy.maxHp * 0.025 * (deltaTime / 1000)));

        if (enemy._inevitableWindowEnd && now >= enemy._inevitableWindowEnd && !enemy._inevitableCooldownEnd) {
            enemy._inevitableCooldownEnd = now + 500;
            enemy._inevitableWindowEnd = 0;
        }
        if (enemy._inevitableCooldownEnd && now >= enemy._inevitableCooldownEnd) {
            enemy._inevitableCooldownEnd = 0;
        }
    }
}

// Sinh thiên thạch bay từ mọi mép màn hình vào — đa số hội tụ về THÂN (đến
// sớm), số còn lại lệch hướng bay tới 2 khớp vai (đến muộn hơn), y hệt
// prototype test-goliath.html đã duyệt.
function _goliathSpawnMeteors(enemy) {
    function edgePt() {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) return { x: Math.random() * canvas.width, y: -80 };
        if (edge === 1) return { x: canvas.width + 80, y: Math.random() * canvas.height };
        if (edge === 2) return { x: Math.random() * canvas.width, y: canvas.height + 80 };
        return { x: -80, y: Math.random() * canvas.height };
    }
    enemy._meteors = [];
    const BODY_COUNT = 5;
    for (let i = 0; i < BODY_COUNT; i++) {
        const from = edgePt();
        enemy._meteors.push({
            fromX: from.x, fromY: from.y, target: 'body',
            toX: enemy.x + (Math.random() - 0.5) * 60, toY: enemy.y + (Math.random() - 0.5) * 60,
            arriveAt: 0.1 + (i / BODY_COUNT) * 0.55,
            size: 16 + Math.random() * 16, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 6,
            arrived: false,
        });
    }
    const LIMB_COUNT = 3;
    ['left', 'right'].forEach(side => {
        const joint = GOLIATH_LIMB_JOINT[side];
        for (let i = 0; i < LIMB_COUNT; i++) {
            const from = edgePt();
            enemy._meteors.push({
                fromX: from.x, fromY: from.y, target: side,
                toX: enemy.x + joint.x + (Math.random() - 0.5) * 24, toY: enemy.y + joint.y + (Math.random() - 0.5) * 24,
                arriveAt: 0.6 + (i / LIMB_COUNT) * 0.4,
                size: 12 + Math.random() * 10, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 6,
                arrived: false,
            });
        }
    });
    enemy._fusedCount = 0;
    enemy._armFused = { left: 0, right: 0 };
    enemy._limbPopFired = false;
}

function _goliathBeginTransform(enemy) {
    enemy.phase = 'transforming';
    enemy.transformTimer = 0;
    _goliathSpawnMeteors(enemy);
    if (window.AudioMgr) { window.AudioMgr.enterGoliathTransformDuck(); window.AudioMgr.playSfxAt('goliath-transform', enemy.x, enemy.y); }
}

// Kích thước True Form ngang Leviathan (250-300), không phải khối khổng lồ
// 460 như bản trước — hình học GOLIATH_TRUE_FORM_OUTLINE tự co giãn theo
// enemy.size / GOLIATH_TRUE_FORM_REF_SIZE ở render file.
function _goliathEnterTrueForm(enemy) {
    enemy.phase = 'true_form';
    enemy.inCoronation = false; // giờ mới có thể bị nhắm mục tiêu
    enemy.size = 260; // giảm ~7% so với 280 theo yêu cầu
    const pulledCapped = Math.min(320000, enemy.damagePull);
    const maxHp = Math.round((65000 + pulledCapped) * (1 + 0.25 * enemy.gemPoints) * _walpurgisHpMult());
    enemy.hp = maxHp; enemy.maxHp = maxHp;
    enemy.trueFormReady = true;
    if (window.AudioMgr) { window.AudioMgr.exitGoliathTransformDuck(); window.AudioMgr.startGoliathIdle(); }

    // Inevitable (NEW): Iron Body tuyệt đối 4s ngay sau khi biến hình xong
    // thành công — bảo vệ đúng khoảnh khắc vừa lộ diện, còn chưa kịp làm gì.
    enemy._transformIronBodyEnd = performance.now() + 4000;

    // Evade (NEW): mốc thời gian bắt đầu decay từ 35% -> 25% trong 15s kể từ
    // đúng lúc biến hình xong — xem khối tính evade trong dealDamage.
    enemy._trueFormEnteredAt = performance.now();

    // QUAN TRỌNG: chuyển cảnh mượt lúc biến hình vừa xong — công thức weave
    // dùng sin(t + weaveSeed) với weaveSeed NGẪU NHIÊN từ lúc spawn, nên nếu
    // dùng thẳng công thức ngay từ frame đầu tiên của True Form, vị trí sẽ
    // NHẢY đột ngột (offset ±ampX/±ampY ngay lập tức) khỏi chỗ Settle vừa để
    // thân lại — đúng hiện tượng "giật khi chuyển cảnh cuối biến hình". Neo
    // lại vị trí hiện tại rồi cho weave-update blend mượt vào công thức thật
    // trong ~1.2s thay vì áp dụng ngay.
    enemy._weaveEnterX = enemy.x;
    enemy._weaveEnterY = enemy.y;
    enemy._weaveEnterAt = performance.now();

    // Joker: khởi tạo trạng thái cho ĐÚNG 3 kỹ năng ứng với 3 bảo thạch đã
    // hấp thụ (không phải cả 7) — mỗi kỹ năng có timer/cooldown riêng.
    enemy.slots.forEach(slot => {
        if (!slot.filled || !slot.gem) return;
        const name = slot.gem.name;
        if (enemy._jokerState[name]) return; // phòng khi 2 khe cùng tên (không nên xảy ra)
        if (name === 'Veilshroud') enemy._jokerState[name] = { phase: 'ready', cooldownEnd: 0, phantomEnd: 0, targets: [], lightningPending: false, lightningCountdown: 0 };
        else if (name === 'Thaelis') enemy._jokerState[name] = { active: true }; // passive dai dẳng, không cooldown
        else if (name === 'Aegis Core') enemy._jokerState[name] = { nextFireAt: performance.now() + 4000, originX: 0, originY: 0 };
        else if (name === 'Marchosias') enemy._jokerState[name] = {
            barrierAngle: 0, barrierHp: 8000, barrierMaxHp: 8000,
            barrierDown: false, reviveAt: 0,
            swordsThisCycle: 0, lastSwordTriggerAt: 0, windups: [],
        };
        else if (name === 'Egregor') enemy._jokerState[name] = { phase: 'ready', cooldownEnd: 0, windupTimer: 0, angle: 0, targetX: 0, targetY: 0, strikeTimer: 0, dmgDealt: false, originX: 0, originY: 0 };
        else if (name === 'Dargruel') enemy._jokerState[name] = { nextFireAt: performance.now() }; // bắn ngay lần đầu
        else if (name === 'Leviathan') enemy._jokerState[name] = { phase: 'ready', cooldownEnd: 0, warnTimer: 0, sweepTimer: 0, sweepOrigin: 0 };
    });

    // Bảo thạch dư (NEW): _pendingGems chỉ được nhét vào khe khi có ĐỦ 3
    // viên chờ sẵn VÀ còn khe trống có màu khác — nếu gem bay tới đúng lúc cả
    // 3 khe (khác màu) vừa lấp xong, hoặc trùng màu 1 khe đã có, nó kẹt lại
    // trong _pendingGems vĩnh viễn (Alpha đã kết thúc, không còn vòng lặp
    // nào xử lý tiếp). Tới lúc True Form đã hình thành, gom hết số dư đó lại
    // — thay vì bỏ phí — chuyển thẳng thành 1 lớp khiên 1 lần = 20% MaxHP
    // cho kẻ địch còn sống gần Goliath nhất.
    const _leftoverGemCount = (enemy._pendingGems || []).length + (enemy._flyingGems || []).length;
    if (_leftoverGemCount > 0) {
        const _nearby = enemies.filter(e => e !== enemy && e.hp > 0 && !e._markedForDeath
            && e.type !== 'goliath' && !(e.type && e.type.startsWith('enemy_bullet')));
        _nearby.sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y));
        const _target = _nearby[0];
        if (_target) {
            _addEnemyShield(_target, _target.maxHp * 0.20);
            addExplosion(_target.x, _target.y, _target.size * 0.8, '#f59e0b');
            createParticles(_target.x, _target.y, 20, '#f59e0b', 3, 8);
        }
        enemy._pendingGems = [];
        enemy._flyingGems = [];
    }
}

// Joker: chạy đúng 3 kỹ năng ứng với 3 bảo thạch đã hấp thụ, mỗi kỹ năng
// hoàn toàn độc lập (cooldown/timer riêng, không dùng chung với nhau hay với
// Fracture Step/Absolute Verdict/Warding Palm/Threshold Ward).
// Mọi điểm PHÁT của attack/scale phải tính từ MẮT (GOLIATH_EYE_POS, đã có
// sẵn ở render/enemy-goliath.js — cùng global scope classic-script) chứ
// không phải tâm thân enemy.x/y, kể cả khi thân đang bay lượn khắp màn hình.
function _goliathEyeWorldPos(enemy) {
    const trueScale = enemy.size / 460;
    return { x: enemy.x + GOLIATH_EYE_POS.x * trueScale, y: enemy.y + GOLIATH_EYE_POS.y * trueScale };
}
function _goliathSlotWorldPos(enemy, idx) {
    const trueScale = enemy.size / 460;
    const a = GOLIATH_SLOT_ANCHORS[idx];
    return { x: enemy.x + a.x * trueScale, y: enemy.y + a.y * trueScale };
}

// Hiệu ứng nổ chết: 3 bảo thạch nổ LẦN LƯỢT cách nhau 350ms, mắt tắt sáng,
// rồi thân từ từ tan rã (crumble) — kết thúc thẳng ngay khi đá rụng hết, xem
// _goliathUpdateDeathSequence gọi hàm này mỗi frame.
const GOLIATH_DEATH_CORE_DUR = 1400, GOLIATH_DEATH_CRUMBLE_DUR = 1800;
function _goliathUpdateDeathSequence(enemy, deltaTime, now) {
    enemy._deathPhaseTimer = (enemy._deathPhaseTimer || 0) + deltaTime;
    const t = enemy._deathPhaseTimer;

    if (enemy._deathPhase === 'core') {
        // Trình tự (theo yêu cầu): 3 bảo thạch nổ lần lượt trước -> mắt tắt
        // sáng (không nổ, chỉ tối dần) -> chuyển crumble kèm 1 vụ nổ lớn.
        const gemStagger = 350;
        const gemIdx = Math.min(3, Math.floor(t / gemStagger));
        if (gemIdx > (enemy._deathGemsExploded || 0)) {
            for (let i = (enemy._deathGemsExploded || 0); i < gemIdx; i++) {
                const gp = _goliathSlotWorldPos(enemy, i);
                const slot = enemy.slots[i];
                const gemColor = (slot && slot.gem) ? slot.gem.mid : '#f59e0b';
                addExplosion(gp.x, gp.y, enemy.size * 0.35, gemColor);
                createParticles(gp.x, gp.y, 20, gemColor, 3, 9);
                _setShake(10, 300);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('enemy-hit', gp.x, gp.y);
            }
            enemy._deathGemsExploded = gemIdx;
        }
        // Mắt tắt sáng NGAY khi bảo thạch cuối cùng vừa nổ xong — cờ này chỉ
        // để render (_drawGoliath) biết mà vẽ mắt tối dần, không tự vẽ gì ở
        // đây (logic-only file).
        if (gemIdx >= 3 && !enemy._deathEyeDark) {
            enemy._deathEyeDark = true;
            enemy._deathEyeDarkAt = now;
        }
        // Tro/lửa RẢI RÁC liên tục suốt cả pha core (không chỉ đúng khoảnh
        // khắc bảo thạch nổ) — để pha này trông "đang sụp đổ dần" thay vì
        // đứng yên rồi im bặt giữa các lần nổ.
        if (!enemy._deathEmberNext || now >= enemy._deathEmberNext) {
            enemy._deathEmberNext = now + 90 + Math.random() * 60;
            const _emberAt = gemIdx < 3 ? _goliathSlotWorldPos(enemy, Math.min(2, gemIdx)) : _goliathEyeWorldPos(enemy);
            createParticles(_emberAt.x, _emberAt.y, 4, gemIdx < 3 ? '#f59e0b' : '#665544', 1, 4);
        }
        if (t >= GOLIATH_DEATH_CORE_DUR) {
            enemy._deathPhase = 'crumble';
            enemy._deathPhaseTimer = 0;
        }
    } else if (enemy._deathPhase === 'crumble') {
        // Kết thúc thẳng ngay khi đá rụng hết — không còn pha "hoá bụi" +
        // vụ nổ lớn cuối cùng nữa theo yêu cầu.
        if (t >= GOLIATH_DEATH_CRUMBLE_DUR) {
            enemy.hp = 0;
            enemy._markedForDeath = true;
            if (window.AudioMgr) { window.AudioMgr.stopGoliathIdle(); window.AudioMgr.playSfxAt('goliath-death', enemy.x, enemy.y); }
        }
    }
}

// Đang "vận" 1 kỹ năng bất kỳ (của chính Goliath hoặc bất kỳ bản copy Joker
// nào) — dùng cho hạn chế mới: chậm 35% + cấm Fracture Step (dịch chuyển) +
// hồi 15% MaxHP (1 lần lúc bắt đầu vận) + thêm 10% DR trong lúc vận.
function _goliathIsCasting(enemy) {
    if (enemy._verdictPhase === 'channeling') return true;
    if (enemy._meteorPhase === 'charging') return true;
    const js = enemy._jokerState;
    if (js['Aegis Core'] && (js['Aegis Core'].telegraphing || js['Aegis Core'].firing)) return true;
    if (js['Egregor'] && (js['Egregor'].phase === 'charging' || js['Egregor'].phase === 'striking')) return true;
    if (js['Veilshroud']) {
        const s = js['Veilshroud'];
        const now = performance.now();
        if ((s.phantomEnd && now < s.phantomEnd) || s.lightningPending) return true;
    }
    return false;
}

function _goliathUpdateJoker(enemy, deltaTime, now) {
    const js = enemy._jokerState;

    if (js['Veilshroud']) {
        const s = js['Veilshroud'];
        if (s.phantomEnd && now < s.phantomEnd) {
            // đang Phantom — DR áp trong combinedDR bên dưới
        } else if (s.phantomEnd && now >= s.phantomEnd) {
            // vừa thoát Phantom: CHỐT vị trí + vào pending 1500ms (đúng
            // lightningCountdownDuration thật của Veilshroud — trước đây bắn
            // sét ngay không hề có cảnh báo dưới chân mục tiêu trước).
            s.phantomEnd = 0;
            const targets = [player, ...sentinels.slice(0, 3)];
            s.targets = targets.map(t => ({ x: t.x, y: t.y, ref: t, isPlayer: t === player }));
            s.lightningPending = true;
            s.lightningCountdown = 0;
        } else if (s.lightningPending) {
            s.lightningCountdown += deltaTime;
            if (s.lightningCountdown >= 1500) {
                s.lightningPending = false;
                s.lightningEnd = now + 400;
                if (window.AudioMgr && s.targets.length > 0) window.AudioMgr.playSfxAt('phantom-strike', s.targets[0].x, s.targets[0].y);
                // Đúng thật (_veilshroudStrike): sét đánh vào TOẠ ĐỘ đã chốt,
                // nhưng chỉ thực sự gây damage nếu mục tiêu CÒN Ở ĐÓ lúc sét
                // rơi (né ra khỏi vùng cảnh báo là tránh được) — trước đây gây
                // damage vô điều kiện dù đã né khỏi vùng.
                s.targets.forEach(t => {
                    if (t.isPlayer) {
                        // playerTakesHit() (không phải loseLife() thẳng) để tôn trọng
                        // Yog-Sothoth Domain, Dream Realm né, khiên Skill A, v.v. —
                        // loseLife() thẳng bỏ qua toàn bộ các lớp bảo vệ đó.
                        if (Math.hypot(player.x - t.x, player.y - t.y) < (player.hitRadius || 15) + 30) {
                            if (!_yuushaPierceRedirect(_goliathDmgBoost(enemy, enemy.maxHp * 0.05), 'flat') && playerTakesHit(enemy)) _goliathApplySilence();
                        }
                    } else if (t.ref.hp > 0 && Math.hypot(t.ref.x - t.x, t.ref.y - t.y) < (t.ref.size || 20) + 30) {
                        dealDamage(t.ref, { damage: _goliathDmgBoost(enemy, enemy.maxHp * 0.05), isTrueDamage: true, _noHitSfx: true, _attackerType: 'goliath' });
                    }
                    addExplosion(t.x, t.y, 60, '#ff9a2e');
                });
                s.cooldownEnd = now + 3000;
            }
        } else if (now >= (s.cooldownEnd || 0) && Math.random() < (deltaTime / 450) * 0.5) {
            s.phantomEnd = now + 3000;
        }
    }
    // Thaelis: passive thuần, DR áp trong combinedDR — không cần cập nhật gì ở đây

    if (js['Aegis Core']) {
        // Đúng cơ chế Lumen Nova THẬT (fx.js drawAegisLasers): trước tiên MARK
        // mục tiêu + báo trước bằng 1 đường thẳng mờ TẠI VỊ TRÍ ĐÃ CHỐT (chỉ
        // track 1 lần lúc mark, không đuổi theo sau đó), rồi mới bắn dọc đúng
        // đường đó — KHÔNG PHẢI 1 chùm tia xoay tròn như bản trước (xoay vậy
        // không cách nào né được).
        const s = js['Aegis Core'];
        if (!s.telegraphing && !s.firing && now >= s.nextFireAt) {
            s.telegraphing = true;
            s.telegraphEnd = now + 1000;
            s.targets = [{ x: player.x, y: player.y, isPlayer: true }, ...sentinels.map(sen => ({ x: sen.x, y: sen.y, ref: sen }))];
            // Chốt luôn điểm PHÁT (không chỉ điểm ĐÍCH) — Goliath giờ luôn di
            // chuyển nên nếu cứ tính hướng từ vị trí HIỆN TẠI mỗi frame, đường
            // ngắm sẽ trông như đang dí theo dù mục tiêu đã chốt (đúng ra chỉ
            // track/chốt 1 lần lúc mark, y hệt Aegis Core thật đứng yên bắn).
            const _eye = _goliathEyeWorldPos(enemy);
            s.originX = _eye.x; s.originY = _eye.y;
        } else if (s.telegraphing && now >= s.telegraphEnd) {
            s.telegraphing = false; s.firing = true; s.fireEnd = now + 200;
            if (window.AudioMgr) window.AudioMgr.playSfxAt('laser-fire', s.originX, s.originY);
            // Đúng thật (main.js aegisLasers: distToSegment check tại thời
            // điểm bắn) — chỉ trúng nếu người chơi/Sentinel CÒN Ở TRÊN đường
            // thẳng lúc bắn, không phải trúng vô điều kiện mọi mục tiêu đã
            // chốt (trước đây né ra khỏi đường vẫn dính do không hề check).
            const fullLen = Math.hypot(canvas.width, canvas.height);
            s.targets.forEach(t => {
                const ang = Math.atan2(t.y - s.originY, t.x - s.originX);
                const lineEnd = { x: s.originX + Math.cos(ang) * fullLen, y: s.originY + Math.sin(ang) * fullLen };
                const lineStart = { x: s.originX, y: s.originY };
                if (t.isPlayer) {
                    if (distToSegment(player, lineStart, lineEnd) < (player.hitRadius || 15) + 15) {
                        if (!_yuushaPierceRedirect(_goliathDmgBoost(enemy, enemy.maxHp * 0.25), 'flat') && playerTakesHit(enemy)) _goliathApplySilence();
                    }
                } else if (t.ref && t.ref.hp > 0 && distToSegment(t.ref, lineStart, lineEnd) < (t.ref.size || 20) + 15) {
                    dealDamage(t.ref, { damage: _goliathDmgBoost(enemy, enemy.maxHp * 0.25), isTrueDamage: true, _noHitSfx: true, _attackerType: 'goliath' });
                }
                addExplosion(t.x, t.y, 60, '#fff8e1');
            });
        } else if (s.firing && now >= s.fireEnd) {
            s.firing = false; s.nextFireAt = now + 4000;
        }
    }

    if (js['Marchosias']) {
        const s = js['Marchosias'];
        s.barrierAngle = (s.barrierAngle + deltaTime * 0.0008) % (Math.PI * 2);

        // Barrier hồi sinh sau reviveAt: full HP trở lại, reset chu kỳ sword.
        if (s.barrierDown && now >= (s.reviveAt || 0)) {
            s.barrierDown = false;
            s.barrierHp = s.barrierMaxHp;
            s.swordsThisCycle = 0;
            addExplosion(enemy.x, enemy.y, enemy.size * 0.6, '#ff3344');
        }

        // Xử lý hàng đợi Sword (proc khi barrier bị đánh, xem
        // _goliathTryTriggerSword/_goliathMarchosiasBarrier) — mỗi windup bắn
        // thật sau đúng 1000ms, LẤY TỪ MẮT tại đúng thời điểm bắn (không phải
        // lúc mark) vì Goliath vẫn di chuyển suốt lúc chờ.
        for (let i = s.windups.length - 1; i >= 0; i--) {
            const w = s.windups[i];
            w.timer += deltaTime;
            if (w.timer >= w.dur) {
                s.windups.splice(i, 1);
                const _eye = _goliathEyeWorldPos(enemy);
                const ang = Math.atan2(w.targetY - _eye.y, w.targetX - _eye.x);
                window._goliathSwords = window._goliathSwords || [];
                window._goliathSwords.push({
                    x: _eye.x, y: _eye.y, vx: Math.cos(ang) * 792, vy: Math.sin(ang) * 792,
                    radius: 88, life: 2000,
                    originX: _eye.x, originY: _eye.y, _fireTime: now,
                });
                if (window.AudioMgr) window.AudioMgr.playSfxAt('spirit-arc-slash', _eye.x, _eye.y);
            }
        }
    }

    if (js['Egregor']) {
        // Null Slash (KHÔNG phải Psychic Tempest — đã lấy lộn) — vận 3s dí
        // theo người chơi, chốt góc + đích lúc phóng, mốc 460ms quét cung
        // 180°: người chơi bị chậm 50% trong 1.5s (KHÔNG mất mạng, có thể né
        // qua Yog-Sothoth Domain), Sentinel trong cung ăn true damage theo số
        // lượng bị trúng (30/35/40% MaxHP). Mốc 720ms mở thêm 1 vùng Dimension
        // Break (world object dùng chung với Egregor thật, tự vẽ/tự hết hạn).
        // KHÔNG port Boon & Bane — đó là cơ chế tự trừng phạt riêng của
        // Egregor lúc bị đánh trong lúc vận, không hợp vai trò boss.
        const s = js['Egregor'];
        if (s.phase === 'ready' && now >= (s.cooldownEnd || 0)) {
            s.phase = 'charging'; s.windupTimer = 0;
            if (window.AudioMgr) window.AudioMgr.startNullSlashWindup();
        } else if (s.phase === 'charging') {
            s.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            s.targetX = player.x; s.targetY = player.y;
            s.windupTimer += deltaTime;
            if (s.windupTimer >= 3000) {
                s.phase = 'striking'; s.strikeTimer = 0; s.dmgDealt = false;
                s.originX = enemy.x; s.originY = enemy.y;
                s._dimBreakSpawned = false;
                if (window.AudioMgr) { window.AudioMgr.stopNullSlashWindup(); window.AudioMgr.playSfxAt('egregor-nullslash-slash', enemy.x, enemy.y); }
            }
        } else if (s.phase === 'striking') {
            s.strikeTimer += deltaTime;
            if (!s.dmgDealt && s.strikeTimer >= 460) {
                s.dmgDealt = true;
                const _ex = enemy.x, _ey = enemy.y;
                const _arcR = Math.hypot(s.targetX - _ex, s.targetY - _ey);
                const _inSlash = (tx, ty) => {
                    if (Math.hypot(tx - _ex, ty - _ey) > _arcR + 100) return false;
                    let dA = Math.atan2(ty - _ey, tx - _ex) - s.angle;
                    while (dA > Math.PI) dA -= Math.PI * 2;
                    while (dA < -Math.PI) dA += Math.PI * 2;
                    return Math.abs(dA) <= Math.PI / 2;
                };
                let _nsHitLanded = false;
                if (_inSlash(player.x, player.y)) {
                    _nsHitLanded = true;
                    if (typeof skillShiftActive !== 'undefined' && skillShiftActive) {
                        _triggerAccurateParry();
                    } else {
                        player._nullSlashSlowed = true;
                        player._nullSlashSlowEnd = now + 1500;
                        addExplosion(player.x, player.y, 90, '#6600cc');
                        createParticles(player.x, player.y, 25, '#aa44ff', 3, 10);
                        _setShake(12, 350);
                        _goliathApplySilence();
                    }
                }
                const hitSents = sentinels.filter(sn => _inSlash(sn.x, sn.y));
                const hc = hitSents.length;
                if (hc > 0) {
                    _nsHitLanded = true;
                    const pct = hc === 1 ? 0.30 : hc === 2 ? 0.35 : 0.40;
                    for (const sn of hitSents) {
                        dealDamage(sn, { damage: _goliathDmgBoost(enemy, Math.ceil(sn.maxHp * pct)), isTrueDamage: true, _noHitSfx: true, _attackerType: 'goliath' });
                        addExplosion(sn.x, sn.y, 65, '#7700dd');
                        createParticles(sn.x, sn.y, 18, '#cc44ff', 3, 7);
                    }
                    addExplosion(s.targetX, s.targetY, 140, '#5500bb');
                    createParticles(s.targetX, s.targetY, 35, '#9933ff', 5, 14);
                    _setShake(14, 400);
                }
                if (_nsHitLanded && window.AudioMgr) window.AudioMgr.playSfxAt('egregor-nullslash-hit', s.targetX, s.targetY);
            }
            if (!s._dimBreakSpawned && s.strikeTimer >= 720) {
                s._dimBreakSpawned = true;
                const _dbArcR = Math.hypot(s.targetX - s.originX, s.targetY - s.originY);
                if (!window._dimBreakZones) window._dimBreakZones = [];
                window._dimBreakZones.push({
                    cx: s.originX, cy: s.originY, arcR: _dbArcR, angle: s.angle,
                    arcStart: s.angle - Math.PI / 2, spawnAt: now, expireAt: now + 1000,
                });
            }
            if (s.strikeTimer >= 950) {
                s.phase = 'ready'; s.cooldownEnd = now + 3500;
            }
        }
    }

    if (js['Dargruel']) {
        const s = js['Dargruel'];
        if (now >= s.nextFireAt) {
            s.nextFireAt = now + 8000;
            // Dùng đúng cơ chế Maou Haki thật (spawnBossShockwave): tự động
            // quét sạch đạn người chơi trong bán kính lan ra + gây sát thương
            // Sentinel — trước đây thiếu hẳn phần dọn đạn.
            spawnBossShockwave(enemy.x, enemy.y, 'goliath');
            if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < canvas.width) {
                player._goliathSlowEnd = now + 2000; player._goliathSlowFactor = 0.30;
                // Doesn't route through playerTakesHit (it's an unconditional
                // proximity slow, not a dodgeable hit), so Yog-Sothoth has to
                // be checked here directly for the silence specifically.
                if (!(typeof skillShiftActive !== 'undefined' && skillShiftActive)) _goliathApplySilence();
            }
            addExplosion(enemy.x, enemy.y, 200, '#8A2BE2');
        }
    }

    if (js['Leviathan']) {
        const s = js['Leviathan'];
        if (s.phase === 'ready' && now >= (s.cooldownEnd || 0)) {
            s.phase = 'warning'; s.warnTimer = 0;
        } else if (s.phase === 'warning') {
            s.warnTimer += deltaTime;
            if (s.warnTimer >= 1500) {
                s.phase = 'sweeping'; s.sweepTimer = 0;
                s.sweepOrigin = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                s._hitPlayer = false;
                s._hitSentinels = new Set();
                if (window.AudioMgr) window.AudioMgr.playSfxAt('leviathan-perseverance', enemy.x, enemy.y);
            }
        } else if (s.phase === 'sweeping') {
            s.sweepTimer += deltaTime;
            // 1800ms cho đúng 1 vòng 360° — khớp tốc độ quét thật của Leviathan
            // (trước đây 1000ms khiến tia quay nhanh hơn hẳn bản gốc).
            const curAngle = s.sweepOrigin + (s.sweepTimer / 1800) * Math.PI * 2;
            // đơn giản hoá va chạm: coi tia quét đã "quét qua" người chơi nếu góc
            // hiện tại của người chơi nằm giữa 2 mốc góc của khung hình trước/sau
            if (!s._hitPlayer) {
                const pAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                let d1 = Math.abs(((curAngle - pAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                if (d1 < 0.15 && Math.hypot(player.x - enemy.x, player.y - enemy.y) < 900) {
                    s._hitPlayer = true;
                    if (!_yuushaPierceRedirect(0.50, true) && playerTakesHit(enemy)) _goliathApplySilence();
                }
            }
            // Sentinel: đúng công thức thật (ep*5%*ownerHits, trần 50% ep) —
            // Goliath không có afoHitCount thật nên LẤY CỐ ĐỊNH 150 (vượt xa
            // ngưỡng 10 hit làm bão hoà công thức thật), tức luôn chạm trần
            // 50% EP mỗi lần quét trúng — đúng như Leviathan thật lúc AFO đã
            // vỡ từ lâu. Mỗi Sentinel chỉ trúng 1 lần/vòng quét.
            for (const sen of sentinels) {
                if (s._hitSentinels.has(sen)) continue;
                const sAngle = Math.atan2(sen.y - enemy.y, sen.x - enemy.x);
                let d2 = Math.abs(((curAngle - sAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                if (d2 < 0.15 && Math.hypot(sen.x - enemy.x, sen.y - enemy.y) < 900) {
                    s._hitSentinels.add(sen);
                    const ep = sen.maxHp + (sen.shield || 0);
                    const ownerHits = 150;
                    const dmg = Math.min(Math.ceil(ep * 0.50), Math.ceil(ep * 0.05 * ownerHits));
                    dealDamage(sen, { damage: _goliathDmgBoost(enemy, dmg), isTrueDamage: true, _attackerType: 'goliath' });
                }
            }
            if (s.sweepTimer >= 1800) {
                s.phase = 'ready'; s.cooldownEnd = now + 2000;
            }
        }
    }
}
