# Space Shooter

# Author: An Nguyen

**Play the game here:** [https://aansensei.github.io/space-shooter/](https://aansensei.github.io/space-shooter/)

An intense, highly polished arcade space survival game featuring deep combat mechanics, percentage-based scaling damage, and massive screen-clearing abilities.

---

## How to Play

* **Objective:** Survive endless waves of scaling enemies, manage your skills efficiently, and achieve the highest score possible.
* **Movement:** Use the **Left Arrow** and **Right Arrow** keys to steer your spaceship.
* **Basic Attack:** The ship fires automatically.
* **Charge Attack:** Press and hold the **Spacebar** to charge a powerful shot. Release to fire.
* **Overload Laser:** Hold the **Spacebar** for exactly 5 seconds to unleash a massive continuous laser beam.
* **Active Skills:** Press **A, S, D, F, G** to activate powerful tactical abilities (details below).
* **Lives:** You start with **12 lives**. Every **500,000 points** grants you **1 extra life**.

---

## Combat System & Base Stats

**Note:** Damage Reduction from all sources combined (Boss aura, Aegis shield, Embryo shield, etc.) is strictly capped at a maximum of **99%**.

### 1. The Spaceship (Player)

* **Movement Speed:** 8.6
* **Auto-Fire Rate:** 170ms per volley.
* **Normal Attack:** Fires 5 bullets in a 45-degree spread.
  * *Damage:* 6 Base + 4% of target's Max HP.
  * *Bullet Speed:* 11.2 | *Size:* 6.5.
* **Charged Shot (Hold & Release Space):**
  * *Max Charge Time:* 1000ms.
  * *Max Damage Multiplier:* Up to 10x damage (caps at 12% of target's Max HP).
* **Overload Laser (Hold Space for 5s):**
  * *Duration:* 12 seconds.
  * *Cooldown:* 12 seconds.
  * *Damage:* Strikes every 175ms (Tick), dealing 10 Base + 26% of target's Max HP per tick.

### 2. Passive Abilities

**Glory for Justice**

* **Activation:** Automatically triggers when there are **more than 4 enemies** on the screen, OR when **Skill G** is active, OR when **The Boss** is on the field.
* **Effects:** * *Damage Buff:* Increases the total damage of all player and allied attacks by **1.4x** (includes Chain Lightning and Tesla DoT).
  * *Fire Rate:* Player and Sentinel auto-fire rates are increased by **1.4x**.
  * *Projectile Speed:* Spirit bullets (Skill S) flight speed is increased by **1.25x**.
  * *Chain Lightning:* Attacks trigger a chain lightning effect (**150ms** internal cooldown) that arcs to up to **6 nearby enemies**, dealing an additional **25%** of the initial attack's total damage.
  * *Soul Reaver Debuff:* Enemies hit by Chain Lightning have a **50% chance** to be afflicted with the Soul Reaver debuff (indicated by an orange crossed-swords icon). Soul Reaver reduces all healing and shielding received by the target by **20%**.
  * *Sentinel Protection:* Grants all active Sentinels a flat **12% Damage Reduction**.

**Sentinels**

* **Activation:** 1 Sentinel automatically spawns for every **4 enemies** killed.
* **Limit:** Maximum **12 Sentinels** on the battlefield. If the limit is reached and a new Sentinel spawns, the Sentinel with the lowest HP will automatically self-destruct to make room.
* **Stats & Mechanics:** **260 Base HP** | Base Fire rate: 75ms.
  * *Recoil Damage:* A Sentinel automatically loses **1 HP** every time it fires a shot.
  * *Vulnerability:* If hit by an enemy bullet, a Sentinel takes damage equal to the **enemy bullet's remaining HP**.
* **Normal Shot:** Deals 4 Base + 3.5% Max HP (Speed 9, Size 7.8).
* **Special Shot:** Every 4th shot is a massive homing bullet dealing **6 Base + 7% Max HP** with **12% extra speed**.
  * *Vampiric Effect:* Each Special Shot that hits an enemy restores **3 HP** to the Sentinel that fired it.
* **Herd Mentality (Synergy):** * **Tier 1 (Less than 5 Sentinels):** Max HP is increased by **30%** (338 HP). Sentinels emit a Cyan glow.
  * **Tier 2 (5 to 11 Sentinels):** Fire rate is increased by **20%** and damage output is increased by **10%**. Sentinels emit a Magenta glow.
  * **Tier 3 (12 Sentinels):** Every single shot fired by the Sentinels becomes a Special Shot. Sentinels emit a Gold glow.
* **Death Throes:** Upon dying, causes screen shake and explodes into 10 scattered projectiles (**2 Base + 2% Target Max HP** Damage, Speed 8).

**Final Defense & Last Stand**

* **Final Defense:** A hidden automated defense mechanism that activates temporary invulnerability shields (Player Shield & Boundary Shield) to prevent instant, unfair deaths in bullet-hell situations. Once a shield is broken, it requires **25 seconds** to regenerate.
* **Last Stand (Absolute Shield):** If the player is struck by a fatal blow while having exactly **1 life remaining**, they cheat death. The player and all active Sentinels instantly receive a Golden Absolute Shield that completely absorbs and nullifies 1 instance of any damage. This effect can only trigger **once per game**.

---

## Active Skills

### Skill A: Thunder Orbs (Key: A)

* **Cooldown:** 9 seconds.
* **Basic Stats:** Summons 20 homing energy orbs (Max **80** on screen). Sensor radius is 90% of the screen.
* **Detailed Mechanic:** Orbs automatically seek out enemies (ignoring enemy bullets). Upon impact, they deal **10 Base + 24% Target Max HP** damage. The orb then shatters into **16 smaller scattered projectiles** dealing **4 Base + 2% Target Max HP** damage each, blasting outward in all directions across the map.
  * **Orb Sacrifice (Defensive Priority 1):** Up to **3 random Orbs** in the formation will be marked with a **Yellow glow**. If the player is hit by an enemy bullet, laser, or enemy body, **1 Yellow Orb is consumed** to completely absorb the hit and prevent the player from losing a life. The remaining orbs instantly rebalance their formation.
  * **Defense Hierarchy:** The game checks defenses in this strict order when the player takes a hit: `Orb Sacrifice -> Final Defense (Player Shield) -> Last Stand (Absolute Shield) -> Lose a Life`.

### Skill S: Remembrance Spirit (Key: S)

* **Cooldown:** 15 seconds.
* **Basic Stats:** Summons an ancient Spirit (Max 2). Lasts for 35 seconds. Base Fire rate: 65ms. Projectile flight speed is increased by 10%.
* **Detailed Mechanic:** * *Anti-Projectile:* All attacks generated by the Spirit (bullets, blade arcs, finale lasers, and plasma balls) cut through and destroy enemy bullets on contact.
  * *Spirit Bullets:* Fires homing projectiles that deal **5 Base + 4% Max HP**.
  * *Blade Arc:* Every 5 shots, the Spirit unleashes a massive blade arc (125 radius) dealing **10 Base + 16% Max HP**.
  * *Finale:* After 35 seconds, the Spirit stops, charges for 2.5s, and fires a devastating screen-wide laser (10 Base + 40% Max HP per tick) before exploding into 8 massive bouncing plasma balls.

### Skill D: Cosmic Black Hole (Key: D)

* **Cooldown:** 15 seconds.
* **Basic Stats:** Charges for 2 seconds to spawn a Black Hole.
* **Detailed Mechanic:** Sucks all enemies and enemy bullets toward its center with a powerful gravitational pull speed of **6**. Any enemy (including Bosses) that touches the absolute center of the black hole takes an astronomical **999,999,999 damage**, instantly obliterating them or instantly shattering Absolute Shields. (Note: Embryos are immune to gravitational pull).

### Skill F: Annihilation Sweep (Key: F)

* **Cooldown:** 10 seconds.
* **Basic Stats:** 1.5s charge time, 1s execution time.
* **Detailed Mechanic:** Charges energy and then sweeps a gigantic, visually enhanced radiant plasma beam across the entire screen in 1 second, causing violent screen shake and scattering particle energy. Any enemy caught in the sweep angle takes **999,999,999 damage**, instantly vaporizing them or shattering Absolute Shields.

### Skill G: Life Domain / Tesla Matrix (Key: G)

* **Charge Requirement:** Charges from 0% to 100% (+0.5% per enemy kill).
* **Duration:** 30 seconds.
* **Basic Stats:** Spawns Energy Orbs (Size 15) and Tesla Coils (Size 20). Max 4 Tesla Coils.
* **Detailed Mechanic:**
  * *Aura & Buffs:* Instantly grants the Glory for Justice passive buff while active.
  * *Energy Links:* Orbs find pairs and link together for 5 seconds. Enemies walking through the energy link have their movement speed reduced by 8% and take DoT (Damage over Time) shocks dealing **6 Base + 4% Max HP every 125ms**.
  * *Tesla Coils:* After 5 seconds, paired orbs merge into a Tesla Coil. The Coil has a magnetic aura (Radius 200) that slows all enemies inside by 8% and rapidly shocks them, dealing **10 Base + 13% Max HP damage every 50ms**.
  * *Detonation:* When a Coil's HP (30) depletes or the 30-second skill duration ends, all Orbs and Coils detonate. Coils deal 10 Base + 15% Max HP in a massive AoE.

---

## Entities: Enemies & Bosses

*Note: All enemies (Normal, Thaelis, Boss) have a baseline 5% Max HP amplification factor built into their health pools.*

### Normal Enemies

* **Spawn Rate:** Spawn continuously.
* **HP Scaling:** Base HP begins roughly between 1 and 5 (capped at **60**) and scales infinitely based on how long the player has survived. Visually distinct with bright, vibrant colors to stand out from enemy projectiles.
* **Attack:** Fires **1 bullet every 1 second**. The damage and health of this bullet are directly equal to the Normal Enemy's current HP at the moment it is fired.

### Thaelis (Elite)

* **Spawn Condition:** **26% chance** to spawn instead of a normal enemy.
* **Stats:** Considerably slower than normal enemies (Speed reduced by 25%). HP scales roughly between **300 and 680 Base HP**.
* **Attack:** Fires a massive projectile (Speed 3.36, Size 18, 180 HP) every **1 second**. After flying for 0.6 seconds, the projectile splits into **3 smaller bullets** (Speed 3.73, Size 10.8, 60 HP) targeting the player or sentinels. If a small bullet hits the player, the player loses 1 life. If a small bullet hits a Sentinel, the Sentinel loses **2% of its Max HP**.
* **Passive: Reincarnation:** Upon reaching 0 HP, Thaelis does not die completely. Instead, it splits into **3 Embryos** placed in a triangular formation (120 degrees apart).
  * *Embryo Mechanics:* Each Embryo possesses 33% of Thaelis's Max HP plus an additional random 50-100 HP. Embryos have a massive **90% Damage Reduction** and are immune to Crowd Control (e.g., Black Holes, Tesla Coils). They CAN receive shields and heals from Aegis Core or Demon Gift.
  * *Hatching:* After 3 seconds, if an Embryo is not destroyed, it hatches into a brand new Normal Enemy with HP equal to the Embryo's remaining HP + 60 Base HP.

### Heavenly Aegis Core (Elite)

* **Spawn Condition:** **20% chance** to spawn instead of a normal enemy (Only 1 can exist on the map at a time).
* **Stats:** Base HP scales from **400 to 750**. Has an inherent flat **10% Damage Reduction**.
* **Passive: Custos Aeternus:** Spawns with an Absolute Shield that completely absorbs and negates 1 instance of any damage (even Black Holes or Sweeping Lasers).
* **Skill: Support Aura:** Emits a massive radar field covering half the map width.
  * Allies inside the aura heal for **1.55% of the Aegis Core's Max HP** per second.
  * Allies (including bullets and embryos) inside also receive a shield equal to **40% of the Aegis Core's Max HP**. Any enemy holding this shield gains a flat **15% Damage Reduction**.
  * Enemies and enemy bullets inside the aura gain a **5% movement speed increase**.
* **Skill: Lumen Nova:** Every 5 seconds, the Aegis Core telegraphs the locations of the player and **3 random Sentinels** with targeting lines. After a 1-second delay, it fires hyper-fast lasers along those paths. Hitting the player triggers `playerTakesHit()` (which attempts to consume Orbs/Shields or removes 1 life), while hitting Sentinels drains **18% of their Max HP**.

### Dargruel ( Ultra - Elite)

* **Dargruel:** 3% chance to spawn. Massive in size with a colossal HP bar (roughly 1255 to 5023 Base HP).
* **Passive: Demon Gift:** Dargruel possesses a terrifying self-preservation mechanic with multiple triggers based on its HP thresholds.
  * **Health Triggers:** Activates exactly when HP drops to **70%, 40%, 10%, and 1%**.
    * *Global Heal:* Heals all other enemies on the screen (including bullets and embryos) for an amount equal to **15% of the Boss's Maximum HP**.
    * *Overheal Shield:* If the heal amount exceeds a minion's Max HP, the excess healing is converted into a sturdy Shield at a 21% efficiency rate.
    * *Damage Reduction:* Grants all minions an aura that reduces incoming damage by **18% for 4 seconds**. If triggered sequentially before the buff expires, it stacks up to a maximum of 2 times (capping at **30% Damage Reduction**).
  * **Maou Haki:** Activates exactly when HP drops to **50%**. Dargruel emits a devastating screen-wide purple shockwave. This blast instantly clears all player and allied projectiles from the screen. Additionally, any Sentinel caught in the shockwave immediately loses **25% of its Maximum HP**.
