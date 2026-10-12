// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// Leo sigil data (EN + VI). Split out of the old monolithic
// js/sigils.js; loaded after js/sigils/core.js, which declares SIGIL_DEFS and
// SIGIL_I18N_VI as empty objects for every sigil file to assign its own entry into.

SIGIL_DEFS.leo = {
        name: 'Leo', element: 'Fire', color: '#EF9F27',
        buffs: [
            { id: 'su_tu_hong', name: "Lion's Roar", type: 'ATK', typeC: '#ef4444',
              desc: 'During GFJ, hits Burn enemies (30% ATK per stack every 0.5s, up to 3 stacks) and deal +1% of their lost HP. A Burning enemy that dies spreads its Burn to up to 6 nearby enemies.' },
            { id: 'than_menh', name: 'Divine Fate', type: 'SPEC', typeC: '#f59e0b',
              desc: "Each wave starts with every enemy petrified for 5s (Dominant) and taking +60% damage. With Lion's Roar, Burning kills fill a Fate meter worth up to +15% ATK. When full, Space or CHARGE petrifies every enemy for 3s, and petrified enemies shatter for 100% ATK when it ends." },
        ]
};

SIGIL_I18N_VI.leo = { name: 'Sư Tử', element: 'Hỏa', buffs: {
        su_tu_hong: { name: 'Sư Tử Hống', desc: 'Khi Glory for Justice bật, đòn đánh gây Bỏng (30% ATK mỗi lớp mỗi 0.5s, tối đa 3 lớp) và thêm 1% HP đã mất của mục tiêu. Kẻ địch chết khi đang Bỏng lan Bỏng sang tối đa 6 kẻ địch gần đó.' },
        than_menh: { name: 'Thần Mệnh', desc: 'Đầu mỗi wave, mọi kẻ địch hóa đá 5s (Áp Chế) và nhận thêm 60% sát thương. Có Sư Tử Hống thì hạ kẻ địch đang Bỏng nạp thanh Thần Mệnh, cho tối đa +15% ATK. Khi đầy, Space hoặc CHARGE hóa đá mọi kẻ địch 3s, hết hóa đá thì chúng vỡ ra chịu 100% ATK.' },
}};
