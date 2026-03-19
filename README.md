# Pisces: Space Journey

**Author:** An Nguyen

**Play the game:** [https://aansensei.github.io/space-shooter/](https://aansensei.github.io/space-shooter/)

A fast-paced arcade space shooter with deep combat mechanics, percentage-based damage scaling, and powerful screen-clearing abilities. Survive endless enemy waves, manage your cooldowns, and go for the highest score.

---

## How to Play

| Input | Action |
|---|---|
| ← → Arrow Keys | Move left / right |
| Spacebar (tap & hold) | Charge shot — release to fire |
| Spacebar (hold 3 seconds) | Overload Laser |
| Shift Left / Right | Skill: Yog-Sothoth Domain |
| A | Skill: Thunder Orbs |
| S | Skill: Remembrance Spirit |
| D | Skill: Cosmic Black Hole |
| F | Skill: Annihilation Sweep |
| G | Skill: Life Domain / Tesla Matrix |

- You start with **12 lives**. Earn **+1 life** every **500,000 points**.
- Your ship fires automatically at all times.
- A small **cyan hitbox dot** at the exact center of your ship shows the true collision point — only that dot touching a bullet costs a life.
- Enemy bullets always render on top of all effects and are outlined with a **pulsing white glow** so they remain visible in dense situations.
- The game automatically **pauses** if you switch tabs, and resumes cleanly with no time skips.

---

## General Combat Rules

- All damage reduction from any source is **hard-capped at 99%** — nothing is ever completely immune to damage.
- Damage from percentage-based effects is calculated against the **effective HP** (Body HP + Shield HP combined).
- When Glory for Justice is active, all friendly damage is multiplied by **1.55x**.
- When **Accurate Parry** is active, all friendly damage is additionally multiplied by **1.25x** (stacks on top of Glory for Justice).

---

## Player Stats & Attacks

**Auto-Fire** — Fires 5 bullets in a 45-degree spread every 170ms. Each bullet deals **6 base + 4% of target's Max HP**. Each bullet independently rolls a **25% chance** to apply Vulnerability.

**Charged Shot** — Hold Space to charge for up to 1 second, then release. Damage scales up to **10x**, capping at **12% of target's Max HP** at full charge.

**Overload Laser** — Hold Space for a full **3 seconds** without releasing. Fires a continuous beam for **12 seconds** (12s cooldown after). Deals **10 base + 26% of target's Max HP** per tick every 175ms. Also pulls nearby enemies toward the beam.

---

## Passive Abilities

### Vulnerability (Trọng Thương)

A stacking debuff inflicted by all friendly attacks that progressively weakens enemies.

- **Application Chance:** Player auto-fire bullets each have a **25% chance** per hit. All other allied sources — Sentinels, Spirits, Skill A orbs, Black Hole, Overload Laser, Chain Lightning, Tesla DoT, and all other damage sources — have a **15% chance**.
- **On Application — Shield Shred:** Instantly destroys **24% of the enemy's current Shield HP** (not Max HP — the shred scales down as the shield depletes).
- **Damage Amplification:** Each stack increases all incoming damage to that enemy by **+25%**. At maximum stacks the enemy takes **+75% more damage** from all sources.
- **Stacking:** Caps at **3 stacks**. Applying a new stack (whether the cap is reached or not) fully **refreshes the 3-second duration**. Stacks are lost all at once when the timer expires.

---

### Glory for Justice

Activates automatically when **any of the following** is true:

- More than 4 enemies are on screen
- Any elite enemy is present (Thaelis, Aegis Core, Marchosias, or Dargruel)
- Skill G is active

**While active:**

- All friendly damage ×**1.55** (player, sentinels, chain lightning, tesla DoT)
- Player and Sentinel fire rate ×1.4
- Spirit bullets (Skill S) move **30%** faster
- Attacks trigger **Chain Lightning** (150ms cooldown) that arcs to up to 6 nearby enemies for **30%** of the triggering hit's damage
- Chain Lightning hits have a **55% chance** to apply **Soul Reaver** on the target — reducing all healing and shielding that enemy receives by **25%** (marked with a crossed-swords icon)
- **Soul Devourer (Cắn nuốt linh hồn):** Every 0.5 seconds, enemies afflicted with Soul Reaver take **10 base + 5% Max HP** as true damage that bypasses all shields
- All active Sentinels gain **+20% Damage Reduction**

---

### Sentinels

A Sentinel spawns automatically every **4 enemy kills**. Maximum **12 Sentinels** at once — if the cap is hit, the weakest Sentinel self-destructs to make room.

**Base stats:** 299 HP | 75ms fire interval

- Loses **1 HP** every time it fires (recoil).
- Takes damage equal to the HP of any enemy bullet that hits it.
- Every **4th shot** is a Special Shot: homing, deals **6 base + 7% Max HP**, +12% speed, and **heals the firing Sentinel for 3 HP** on hit.

**Herd Mentality** — bonuses scale with how many Sentinels are alive:

| Count | Bonus | Glow |
|---|---|---|
| 1–4 | +30% Max HP → **389 HP total**, +10% bullet speed | Cyan |
| 5–11 | +20% fire rate, +10% damage, +10% Damage Reduction | Magenta |
| 12 | Every shot becomes a Special Shot | Gold |

**On death** — explodes into 10 scattered projectiles (2 base + 2% target Max HP, speed 8) and causes a brief screen shake.

---

### Final Defense & Last Stand

**Final Defense** is an automatic safety net with two hidden shields:

- **Player Shield** — absorbs 1 hit that would otherwise cost a life.
- **Boundary Shield** — absorbs 1 enemy that crosses the bottom boundary.

Each shield regenerates after **25 seconds**.

**Last Stand** — triggers once per game only. If the player takes a fatal hit on their **last life**, they survive. The player and all active Sentinels instantly gain a **Golden Absolute Shield** that blocks the next hit of any damage. This can only happen once.

**Hit absorption priority (highest to lowest):**

1. Yog-Sothoth Domain — complete immunity (+ triggers Accurate Parry if hit occurs)
2. Thunder Orb Sacrifice (yellow orb from Skill A)
3. Final Defense Player Shield
4. Last Stand Absolute Shield
5. Lose a life

---

## Active Skills

### Shift — Yog-Sothoth: Cursed Domain Expansion

**Cooldown:** 15s | **Max duration:** 8s (auto-cancels)

Hold Shift to open a cursed domain. Everything on the battlefield — enemies, bullets, movement, all timers — slows to **15% of normal speed**. You are **completely invincible** while the domain is active.

While active, press **← or →** to teleport. The teleport range increases the longer you hold Shift (up to half the screen width). A ghost shadow shows where you'll land.

**Accurate Parry** — If an enemy attack reaches the player while the domain is active, it is automatically blocked. This triggers a powerful counter-buff lasting **4 seconds**:

- All friendly damage output increases by **+25%**.
- All active Sentinels instantly gain a shield equal to **25% of their Max HP**.
- A golden aura appears around the player while the buff is active.
- **The buff persists even after the domain ends** — closing the domain early does not cancel Accurate Parry.

---

### A — Thunder Orbs: Celestial Thunderburst

**Cooldown:** 9s

Summons **20 homing energy orbs** (up to 80 total on screen). Each orb homes in on the nearest enemy and deals **11 base + 28% Max HP** on impact, then shatters into **16 scattered projectiles** (4 base + 2% Max HP each) that fly outward in all directions.

**Orb Sacrifice** — Up to 3 orbs glow yellow at any time. If the player takes a hit, one yellow orb is automatically consumed to completely absorb the damage.

---

### S — Remembrance Spirit: Summoned Spirit Judgment

**Cooldown:** 15s | **Max:** 2 Spirits

Summons a Spirit that orbits near you for **35 seconds**, firing homing bullets automatically every 65ms.

- **Spirit Bullet:** 5 base + 4% Max HP, homing, +10% flight speed bonus.
- **Blade Arc:** Every 5 shots, fires a wide sweeping arc (radius 125, speed +10% faster than before) dealing 10 base + 16% Max HP.
- **All Spirit attacks** cut through and destroy enemy bullets on contact.
- **Finale (at 35s):** The Spirit drifts to the screen center, charges for 2.5 seconds while firing continuous lasers (10 base + 40% Max HP per tick), then explodes into 8 massive bouncing plasma balls (10 base + 25% Max HP, bounce off walls).

---

### D — Cosmic Black Hole: Singularity

**Cooldown:** 15s | **Charge time:** 2 seconds

After a 2-second charge, spawns a Black Hole that pulls all enemies and enemy bullets toward its center at speed 6. Anything that touches the absolute center takes **999,999,999 damage** — instant kill, even through Absolute Shields.

- Embryos are immune to the gravitational pull but still die at the center.
- The Black Hole slowly floats upward and disappears off-screen.

---

### F — Annihilation Sweep: Thiên Ý Trảm

**Cooldown:** 10s | **Charge:** 1.5s | **Sweep:** 1s

Charges up, then sweeps a massive plasma beam across the entire screen. Every enemy in the sweep path takes **999,999,999 damage** — instant kill, even through Absolute Shields.

---

### G — Life Domain / Tesla Matrix: Sinh Mệnh Kết Giới

**Charge:** fills +0.5% per enemy kill | **Duration:** 30s

Activates Glory for Justice immediately. Spawns Energy Orbs at enemy kill locations throughout the duration.

**Energy Links** — Orbs automatically pair up and connect. Enemies passing through the link slow down by 8% and take **6 base + 4% Max HP** damage every 125ms.

**Tesla Coils** — After 5 seconds, each linked pair of orbs merges into a Tesla Coil (max 4 total). Each coil has a radius-200 aura that slows enemies by 8% and shocks them for **10 base + 13% Max HP every 50ms**.

**Detonation** — When a coil's HP (30) runs out or the 30-second duration ends, all orbs and coils explode. Each coil blast deals **10 base + 15% Max HP** in a large area.

---

## Enemies

*All enemies have a hidden +5% HP bonus applied to their base stats.*

---

### Normal Enemy

Spawns continuously from the start. HP starts between 1–5 and scales up over time (capped at 60 HP). Fires 1 bullet per second — the bullet's HP equals the enemy's HP at the moment of firing.

**Score on kill:** 10 – 630 points (scales with HP at spawn)

---

### Thaelis (Elite)

**Available after:** 30s | **Spawn rate:** 12% → 25% | **Cap:** 3 on screen | **Score on kill:** 3,000 – 6,800 points

Slower than normals (-25% speed). HP: 300–680.

Fires a large projectile every second. After 0.6 seconds of flight it splits into 3 smaller homing bullets. Small bullets deal 1 life of damage to the player, or 2% Max HP to a Sentinel.

**Reincarnation** — At 0 HP, Thaelis splits into 3 Embryos in a triangle formation:

- Each Embryo has 33% of Thaelis's Max HP + 50–100 bonus HP.
- Embryos have **90% Damage Reduction** and are immune to crowd control (Black Holes, Tesla). They CAN receive shields and heals from Aegis Core or Demon Gift.
- After 3 seconds, any surviving Embryo hatches into a new Normal Enemy (Embryo's HP + 60 base HP).

---

### Heavenly Aegis Core (Elite)

**Available after:** 30s | **Spawn rate:** 6% → 14% | **Cap:** 2 on screen | **Score on kill:** 4,000 – 7,500 points

HP: 400–750. Innate +10% Damage Reduction.

**Custos Aeternus** — Spawns with 1 Absolute Shield that absorbs any single hit, including Black Holes and Skill F.

**Support Aura** — Constantly emits a field covering half the screen width:

- Heals all ally units inside for 1.55% of Aegis Core's Max HP per second.
- Grants a shield equal to 40% of Aegis Core's Max HP to all allies inside. Shielded units gain +15% Damage Reduction.
- All enemies and enemy bullets inside move 5% faster.

**Lumen Nova** — Every 5 seconds, marks the player and 3 random Sentinels with targeting lines. After 1 second, fires fast lasers along those paths. Hitting the player costs 1 life (or consumes a protective layer). Hitting a Sentinel deals 18% of its Max HP.

---

### Marchosias (Elite)

**Available after:** 20s | **Spawn rate:** 5% → 13% | **Cap:** 2 on screen | **Score on kill:** 10,000 – 22,000 points

A heavily armored hexagonal mech with size equal to Thaelis, speed slightly below Aegis Core (-10%), and HP ranging from **1,000 to 2,200**. Marchosias has a permanent **20% Damage Reduction** on its own body at all times.

---

**Sword & Shield**

Marchosias carries a rotating **Arc Shield** — a glowing 90-degree arc (quarter-circle) that continuously tracks and faces the player. The shield and Marchosias's body HP are **completely independent pools**, each equal to Marchosias's Max HP at spawn. Damage dealt to the shield never reduces body HP, and vice versa.

*Shield properties:*

- **50% Damage Reduction** on all incoming damage.
- **Completely buff-immune:** cannot receive heals, Damage Reduction boosts, Aegis shields, or any other beneficial effect. Marchosias's body is unaffected by this restriction.

*What counts as a shield hit:* Any attack that lands within the 90° arc — player bullets, Sentinel bullets, Spirit bullets, scattered projectiles, Overload Laser ticks, Skill F sweep, and Black Hole center ticks all register individually.

*Sword trigger conditions:*

- Every shield hit has a **20% independent chance** to queue a Sword.
- If the shield is fully destroyed, a Sword is queued immediately.
- When Marchosias's body HP drops to **1%**, all queued Swords fire simultaneously (up to 3, each spread slightly apart in angle).

There is no hard limit on total Swords per fight. Each individual Marchosias has its own independent **0.65-second cooldown** between triggers — if two Marchosias are on screen simultaneously, each can trigger and fire Swords on their own timers, potentially landing multiple Swords at once. Multiple queued Swords on the same Marchosias count down their 1-second windups in parallel and fire independently.

*Sword sequence:*

1. A static orange warning beam extends from Marchosias to **your position at the moment of trigger** and remains visible for 1 second.
2. After 1 second, an orange arc projectile (radius 88, faster than the Spirit's blade arc) launches along that exact line. **It does not home or adjust its course.**
3. If it strikes the player, all normal protective layers apply in order: Orb Sacrifice → Final Defense Shield → Last Stand → lose a life.
4. If it strikes a Sentinel, it deals **20% of that Sentinel's Max HP** as damage.
5. **The Sword cannot be destroyed or deflected by anything** — not Spirit blade arcs, not the Black Hole, not Skill F, not Tesla Coils. It also passes through all allied projectiles without destroying them. It persists until it exits the screen.

---

**Normal Attack**

Every second, Marchosias fires **2 bullets** simultaneously at the nearest player or Sentinel's position at that exact moment. The bullets travel in straight lines and **do not home**. Each bullet's HP equals ⌈1.25% of Marchosias's current HP⌉, scaling down as Marchosias takes damage.

---

**Assimilation — Death Passive**

When Marchosias's body reaches 0 HP, it explodes and spawns **3 Minion Robots** (triangular shape, same size as a Normal Enemy). Each minion independently inherits **15–25%** of Marchosias's **Max HP** (not current HP) at random.

Each minion immediately scans within **1.5× its own radius** for a valid host — any living enemy except other Minion Robots:

**Host found → Parasite Mode:** The minion vanishes and attaches to the host as a **Parasite Shield**. The shield's HP equals the minion's current HP at the moment of attachment. This shield absorbs incoming damage before any other shield on that unit, including Aegis shields. It is **completely buff-immune** — no heals, no regeneration, no Damage Reduction bonuses of any kind can affect it. A green rotating ring marks infected hosts.

**No host nearby → Hunt Mode:** The minion locks onto the player and charges directly at **+35% increased movement speed**, firing bullets like a normal enemy and dealing contact damage on collision.

---

### Dargruel (Ultra-Elite / Boss)

**Available after:** 30s | **Spawn rate:** 4% → 13% | **Cap:** 2 on screen | **Score on kill:** 12,550 – 50,230 points

Massive size. HP: roughly 1,255–5,023.

**Demon Gift** — Triggers when HP crosses **70%, 40%, 10%, and 1%**:

- Heals all other enemies on screen for **15% of Dargruel's Max HP** (including bullets and embryos). Enemies with Soul Reaver receive only 75% of this heal.
- If the heal exceeds a target's Max HP, the overflow becomes a shield at 21% efficiency.
- All units gain **18% Damage Reduction for 4 seconds**. Stacks up to 2 times (max **30%**).

**Maou Haki** — Triggers once at exactly **50% HP**:

- Fires a screen-wide purple shockwave that instantly destroys all player and ally projectiles.
- Any Sentinel hit loses **25% of its Max HP**.

---

## Elite Spawn Summary

All elites share a combined cap of **6 elite enemies on screen at once**, plus individual per-type caps.

| Enemy | Unlocks | Spawn Rate | Cap |
|---|---|---|---|
| Marchosias | 20s | 5% → 13% | 2 |
| Thaelis | 30s | 12% → 25% | 3 |
| Aegis Core | 30s | 6% → 14% | 2 |
| Dargruel | 30s | 4% → 13% | 2 |

Spawn rates ramp up over roughly the first 3.5 minutes of play, then hold at their maximum.
