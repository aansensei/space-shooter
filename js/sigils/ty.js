// Umbral Serpent data loads after the shared sigil definitions.
SIGIL_DEFS.ty = {
    name: 'Umbral Serpent', element: 'Venomancy', color: '#9B5CFF',
    buffs: [
        { id: 'hac_viem_phe_hon', name: 'Umbral Devour', type: 'ATK', typeC: '#ef4444',
          desc: 'Charge in 10s. Kills hasten charge by 0.3s. Your next bullet hit triggers 4 bites (60% ATK each), then 4 piercing shards (45% ATK, repeated hits deal 25%). Gain 50% speed for 1s and refund 1s on D and S.' },
        { id: 'van_xa_trieu_tran', name: 'Serpent Array', type: 'SPEC', typeC: '#9B5CFF',
          desc: 'Skill S opens a 170px array that pulls enemies in (Dominant) for 20% ATK every 0.25s for 1.25s, then 300% ATK + 1.5% Max HP and 1.25s Dominant. Summon 10 serpents for 8s (35% ATK per 0.6s, 40% chance to latch on for 3 bites in a row, kills extend 2s up to 12s, bites charge 3%). Gain a one-hit shield, restored after 12 bites, and slow nearby enemies 50% for 2s. Each swarm bite grants the player side +1% damage, up to 40%. After 2s without a bite, stacks fade to zero over 1s.' }
    ]
};
SIGIL_I18N_VI.ty = { name: 'Dực Hỏa Tinh Quan', element: 'Độc Xà Thuật', buffs: {
    hac_viem_phe_hon: { name: 'Hắc Viêm Phệ Hồn', desc: 'Nạp Hắc Viêm trong 10s. Mỗi hạ gục rút 0,3s. Đạn tàu trúng đích kích hoạt 4 nhát cắn (mỗi nhát 60% ATK), rồi 4 mảnh xuyên (45% ATK, trúng lặp nhận 25%). Tàu tăng 50% tốc độ trong 1s, hồi chiêu D và S giảm 1s.' },
    van_xa_trieu_tran: { name: 'Vạn Xà Triệu Trận', desc: 'Skill S mở trận 170px: hút kẻ địch vào tâm (Áp Chế) và gây 20% ATK mỗi 0,25s trong 1,25s, rồi nổ 300% ATK + 1,5% Max HP và hất tung 1,25s (Áp Chế). Gọi 10 rắn trong 8s, mỗi con cắn 35% ATK mỗi 0,6s, có 40% cơ hội bám mồi cắn liền 3 nhát rồi mới quay về tàu. Rắn hạ gục kéo dài 2s, tối đa 12s. Mỗi nhát nạp 3% Hắc Viêm. Khiên chặn 1 đòn, dựng lại sau 12 nhát cắn. Sóng quanh tàu làm chậm 50% trong 2s. Mỗi nhát cắn của bầy rắn tăng 1% sát thương cho toàn phe người chơi, tối đa 40%. Sau 2s không cắn trúng, tầng giảm đều về 0 trong 1s.' }
}};
