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
| Spacebar (hold 5 seconds) | Overload Laser |
| Shift Left / Right | Skill: Yog-Sothoth Domain |
| A | Skill: Thunder Orbs |
| S | Skill: Remembrance Spirit |
| D | Skill: Cosmic Black Hole |
| F | Skill: Annihilation Sweep |
| G | Skill: Life Domain / Tesla Matrix |

- You start with **12 lives**. Earn **+1 life** every **500,000 points**.
- Your ship fires automatically at all times.

---

## General Combat Rules

- All damage reduction from any source is **hard-capped at 99%** — nothing is ever completely immune to damage.
- Damage from percentage-based effects is calculated against the **effective HP** (Body HP + Shield HP combined).
- When Glory for Justice is active, all friendly damage (player, sentinels, chain lightning, tesla) is multiplied by **1.4x**.

---

## Player Stats & Attacks

**Auto-Fire** — Fires 5 bullets in a 45-degree spread every 170ms.
Each bullet deals **6 base + 4% of target's Max HP**.

**Charged Shot** — Hold Space to charge for up to 1 second, then release.
Damage scales up to **10x**, capping at **12% of target's Max HP** at full charge.

**Overload Laser** — Hold Space for a full 5 seconds without releasing.
Fires a continuous beam for **12 seconds** (12s cooldown after).
Deals **10 base + 26% of target's Max HP** per tick, every 175ms. Also pulls nearby enemies toward the beam.

---

## Passive Abilities

### Glory for Justice

Activates automatically when **any of the following** is true:

- More than 4 enemies are on screen
- A Boss (Dargruel) is present
- Skill G is active

**While active:**

- All friendly damage ×1.4 (player, sentinels, chain lightning, tesla DoT)
- Player and Sentinel fire rate ×1.4
- Spirit bullets (Skill S) move 25% faster
- Attacks trigger **Chain Lightning** (150ms cooldown) that arcs to up to 6 nearby enemies for 25% of the triggering hit's damage
- Chain Lightning hits have a **50% chance** to apply **Soul Reaver** on the target, reducing all healing/shielding that enemy receives by 20% (marked with a crossed-swords icon)
- All active Sentinels gain **+12% Damage Reduction**

---

### Sentinels

A Sentinel spawns automatically every **4 enemy kills**. Maximum **12 Sentinels** at once — if the cap is hit, the weakest Sentinel self-destructs to make room.

**Base stats:** 260 HP | 75ms fire interval

- Loses **1 HP** every time it fires (recoil).
- Takes damage equal to the HP of any enemy bullet that hits it.
- Every **4th shot** is a Special Shot: homing, deals **6 base + 7% Max HP**, +12% speed, and **heals the firing Sentinel for 3 HP** on hit.

**Herd Mentality** — bonuses scale with how many Sentinels are alive:

| Count | Bonus | Glow |
|---|---|---|
| 1–4 | +30% Max HP (338 HP total) | Cyan |
| 5–11 | +20% fire rate, +10% damage | Magenta |
| 12 | Every shot becomes a Special Shot | Gold |

**On death** — explodes into 10 scattered projectiles (2 base + 2% target Max HP, speed 8) and causes a brief screen shake.

---

### Final Defense & Last Stand

**Final Defense** is an automatic safety net. The player has two hidden shields:

- **Player Shield** — absorbs 1 hit that would otherwise cost a life.
- **Boundary Shield** — absorbs 1 enemy that crosses the bottom boundary.

Each shield takes **25 seconds** to regenerate after being broken.

**Last Stand** — triggers once per game only. If the player takes a fatal hit while on their **last life**, they survive. The player and all active Sentinels instantly gain a **Golden Absolute Shield** that blocks the next hit of any damage, including Black Holes and Skill F. This can only happen once.

**Hit absorption priority (highest to lowest):**

1. Yog-Sothoth Domain — complete immunity
2. Thunder Orb Sacrifice (yellow orb from Skill A)
3. Final Defense Player Shield
4. Last Stand Absolute Shield
5. Lose a life

---

## Active Skills

### Shift — Yog-Sothoth: Cursed Domain Expansion

**Cooldown:** 15s | **Max duration:** 8s (auto-cancels)

Hold Shift to open a cursed domain. Everything on the battlefield — enemies, bullets, movement, all timers — slows to **15% of normal speed**. You are **completely invincible** while the domain is active.

While active, press **← or →** to teleport. The teleport range increases the longer you hold Shift (up to half the screen width). Two hollow placeholders shows where you'll land.

---

### A — Thunder Orbs: Celestial Thunderburst

**Cooldown:** 9s

Summons **20 homing energy orbs** (up to 80 total on screen). Each orb homes in on the nearest enemy and deals **10 base + 24% Max HP** on impact, then shatters into **16 scattered projectiles** (4 base + 2% Max HP each) that fly outward in all directions.

**Orb Sacrifice** — Up to 3 orbs glow yellow at any time. If the player takes a hit, one yellow orb is automatically consumed to completely absorb the damage.

---

### S — Remembrance Spirit: Summoned Spirit Judgment

**Cooldown:** 15s | **Max:** 2 Spirits

Summons a Spirit that orbits near you for **35 seconds**, firing homing bullets automatically every 65ms (+10% bullet speed).

- **Spirit Bullet:** 5 base + 4% Max HP, homing.
- **Blade Arc:** Every 5 shots, fires a wide sweeping arc (radius 125) dealing 10 base + 16% Max HP.
- **All Spirit attacks** cut through and destroy enemy bullets on contact.
- **Finale (at 35s):** The Spirit moves to the center, charges for 2.5 seconds while firing continuous lasers (10 base + 40% Max HP per tick), then explodes into 8 massive bouncing plasma balls (10 base + 25% Max HP, bounce off walls).

---

### D — Cosmic Black Hole: Singularity

**Cooldown:** 15s | **Charge time:** 2 seconds

After a 2-second charge, spawns a Black Hole that pulls all enemies and enemy bullets toward its center at speed 6. Anything that touches the absolute center takes **999,999,999 damage** — instant kill, even through Absolute Shields.

- Embryos are immune to the gravitational pull but still die at the center.
- The Black Hole slowly floats upward and disappears off-screen.

---

### F — Annihilation Sweep: Thiên Ý Trảm

**Cooldown:** 10s | **Charge:** 1.5s | **Sweep:** 1s

Charges up, then sweeps a massive plasma beam across the entire screen from one side to the other. Every enemy in the beam's path takes **999,999,999 damage** — instant kill, even through Absolute Shields.

---

### G — Life Domain / Tesla Matrix: Sinh Mệnh Kết Giới

**Charge:** fills +0.5% per enemy kill | **Duration:** 30s

Activates Glory for Justice immediately. Spawns Energy Orbs at enemy kill locations throughout the duration.

**Energy Links** — Orbs automatically pair up and connect. Enemies passing through the link slow down by 8% and take **6 base + 4% Max HP** damage every 125ms.

**Tesla Coils** — After 5 seconds, each linked pair of orbs merges into a Tesla Coil (max 4 total). Each coil has a radius-200 aura that slows enemies by 8% and continuously shocks them for **10 base + 13% Max HP every 50ms**.

**Detonation** — When a coil's HP (30) runs out or the 30-second duration ends, all orbs and coils explode simultaneously. Each coil explosion deals **10 base + 15% Max HP** in a large area.

---

## Enemies

*All enemies have a hidden +5% HP bonus applied to their base stats.*

---

### Normal Enemy

Spawns continuously from the start of the game. HP starts between 1–5 and scales up over time (capped at 60 HP). Fires 1 bullet per second — the bullet has the same HP as the enemy when it fires.

---

### Thaelis (Elite)

**Available after:** 30s | **Spawn rate:** 12% → 25% | **Cap:** 3 on screen

Slower than normals (-25% speed). HP: 300–680.

Fires a large projectile every second. After 0.6 seconds of flight it splits into 3 smaller homing bullets. Small bullets deal 1 life of damage to the player, or 2% Max HP to a Sentinel.

**Reincarnation** — At 0 HP, Thaelis doesn't die. It splits into 3 Embryos in a triangle formation:

- Each Embryo has 33% of Thaelis's Max HP + 50–100 bonus HP.
- Embryos have **90% Damage Reduction** and are immune to crowd control (Black Holes, Tesla Coils).
- After 3 seconds, any surviving Embryo hatches into a new Normal Enemy (Embryo's remaining HP + 60 base HP).

---

### Heavenly Aegis Core (Elite)

**Available after:** 30s | **Spawn rate:** 6% → 14% | **Cap:** 2 on screen

HP: 400–750. Innate +10% Damage Reduction.

**Custos Aeternus** — Spawns with 1 Absolute Shield that absorbs any single hit, including Black Holes and Skill F.

**Support Aura** — Constantly emits a field covering half the screen width:

- Heals all ally units inside for 1.55% of Aegis Core's Max HP per second.
- Grants a shield equal to 40% of Aegis Core's Max HP to all allies inside (including bullets and embryos). Shielded units gain +15% Damage Reduction.
- All enemies and enemy bullets inside move 5% faster.

**Lumen Nova** — Every 5 seconds, marks the player and 3 random Sentinels with targeting lines. After 1 second, fires fast lasers along those paths. Hitting the player costs 1 life (or consumes a shield/orb). Hitting a Sentinel deals 18% of its Max HP as damage.

---

### Marchosias (Elite)

**Available after:** 20s | **Spawn rate:** 5% → 13% | **Cap:** 1 on screen

Size equal to Thaelis. Speed slightly below Aegis Core (-10%). HP: 1,000–2,200. Permanent **20% Damage Reduction** on its body.

---

#### Sword & Shield

Marchosias carries an **Arc Shield** — a glowing 90-degree arc (quarter-circle) that rotates to always face the player's current position.

**The shield has its own HP pool** equal to Marchosias's Max HP. They are tracked completely separately — hitting the shield does **not** damage Marchosias's body at all.

Shield properties:

- **50% Damage Reduction** on all incoming damage.
- **Cannot receive any buffs** — no heals, no Damage Reduction boosts, no Aegis shields. The shield is completely buff-immune. Marchosias's body can still receive buffs normally.

**What counts as a shield hit:** Any attack that contacts the shield — player bullets, sentinel bullets, spirit bullets, scattered projectiles, Overload Laser ticks, Skill F sweep contacts, and Black Hole center ticks.

**Sword Counter** — Each shield hit has a **10% chance** to trigger a Sword. Two additional automatic triggers:

- Shield is destroyed → Sword fires immediately.
- Marchosias dies for any reason → **all remaining Sword slots fire at once** (e.g. if 0 Swords have triggered yet, all 3 fire simultaneously on death).

Swords are limited to a maximum of **3 per Marchosias**, counted across all sources combined.

**Sword sequence:**

1. An orange glowing rectangular warning beam projects from Marchosias toward your **current position** — you have **1 second** to reposition.
2. After 1 second, an orange arc projectile (radius 80) launches toward where you were standing. **It travels in a straight line and does not track you.**
3. If it hits the player, normal protection rules apply (orb → shield → last stand → lose a life).
4. If it hits a Sentinel, it deals **20% of that Sentinel's Max HP**.

**The Sword is unstoppable.** Once fired, it cannot be destroyed or blocked by anything — not spirit blade arcs, not the Black Hole, not Skill F, not Tesla. It simply travels until it exits the screen. It also does not destroy any allied projectiles it passes through.

---

#### Normal Attack

Fires **2 bullets per second** aimed at the nearest player or Sentinel's position at the moment of firing. Bullets travel in a straight line and **do not home**. Each bullet has HP equal to ⌈1.25% of Marchosias's current HP⌉.

---

#### Assimilation (Death Passive)

When Marchosias reaches 0 HP, it explodes and splits into **3 Minion Robots** (triangular shape, same size as a Normal Enemy). Each minion randomly inherits **15–25%** of Marchosias's Max HP.

Each minion immediately checks for a nearby valid host (any enemy within 1.5× the minion's own radius, excluding other Minion Robots):

**Host found → Parasite Mode:**

- The minion vanishes and becomes a **Parasite Shield** on the host.
- Shield HP equals the minion's current HP at the moment of parasitizing.
- A green rotating ring appears on the host to show the parasite shield.
- The shield absorbs damage before any other shield on that unit.
- It **cannot receive any buffs, heals, or regeneration** — it can only be whittled down by attacks.

**No host nearby → Hunt Mode:**

- The minion locks onto the player and charges at **+35% movement speed**.
- Fires bullets and deals contact damage like a normal enemy.

---

### Dargruel (Ultra-Elite / Boss)

**Available after:** 30s | **Spawn rate:** 4% → 13% | **Cap:** 2 on screen

Massive size. HP: roughly 1,255–5,023.

**Demon Gift** — Triggers when HP crosses **70%, 40%, 10%, and 1%**:

- Heals all other enemies on screen for **15% of Dargruel's Max HP** (including bullets and embryos).
- If the heal exceeds a target's Max HP, the overflow becomes a shield at 21% efficiency.
- All units on screen gain **18% Damage Reduction for 4 seconds**. Stacks up to 2 times for a maximum of **30% Damage Reduction**.

**Maou Haki** — Triggers once at exactly **50% HP**:

- Fires a screen-wide purple shockwave that instantly clears all player and ally projectiles from the screen.
- Any Sentinel the shockwave passes through loses **25% of its Max HP**.

---

## Elite Spawn Summary

All elites share a combined cap of **6 elite enemies on screen at once**, plus individual per-type caps below.

| Enemy | Unlocks | Spawn Rate | Cap |
|---|---|---|---|
| Marchosias | 20s | 5% → 13% | 1 |
| Thaelis | 30s | 12% → 25% | 3 |
| Aegis Core | 30s | 6% → 14% | 2 |
| Dargruel | 30s | 4% → 13% | 2 |

Spawn rates ramp up over roughly the first 3.5 minutes of play, then hold at their maximum.
