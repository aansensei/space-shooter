# Space Shooter ( Thần Binh Thiên Hà)

**Play the game here:** [https://aansensei.github.io/space-shooter/](https://aansensei.github.io/space-shooter/) 
\n**The password is**: the first letter of my favorite character + a japanese honorific meaning "lord/master" + the english word meaning "ultimate dominance" (16 letters, all lowercase)
An intense, highly polished arcade space survival game featuring deep combat mechanics, percentage-based scaling damage, and massive screen-clearing abilities. 

---

## 🎮 How to Play
* **Objective:** Survive endless waves of scaling enemies, manage your skills efficiently, and achieve the highest score possible.
* **Movement:** Use the **Left Arrow** and **Right Arrow** keys to steer your spaceship.
* **Basic Attack:** The ship fires automatically.
* **Charge Attack:** Press and hold the **Spacebar** to charge a powerful shot. Release to fire.
* **Overload Laser:** Hold the **Spacebar** for exactly 5 seconds to unleash a massive continuous laser beam.
* **Active Skills:** Press **A, S, D, F, G** to activate powerful tactical abilities (details below).
* **Lives:** You start with **15 lives**. Every **500,000 points** grants you **1 extra life**.

---

## ⚔️ Combat System & Base Stats

### 1. The Spaceship (Player)
* **Movement Speed:** 8.6
* **Auto-Fire Rate:** 170ms per volley.
* **Normal Attack:** Fires 5 bullets in a 45-degree spread. 
  * *Damage:* 6 Base + 3% of target's Max HP.
  * *Bullet Speed:* 10.4 | *Size:* 6.25.
* **Charged Shot (Hold & Release Space):**
  * *Max Charge Time:* 1300ms.
  * *Max Damage Multiplier:* Up to 10x damage (caps at 12% of target's Max HP).
* **Overload Laser (Hold Space for 5s):**
  * *Duration:* 12 seconds.
  * *Cooldown:* 15 seconds.
  * *Damage:* Strikes every 250ms (Tick), dealing 10 Base + 24% of target's Max HP per tick.

### 2. Passive Abilities

**Glory for Justice (Vinh Quang Cho Kẻ Yếu)**
* **Activation:** Automatically triggers when there are **more than 4 enemies** on the screen OR when **Skill G** is active.
* **Effects:** * Player auto-fire rate is increased by **1.4x**.
  * Sentinel (Ally) fire rate is increased by **1.4x**.
  * Spirit bullets (Skill S) flight speed is increased by **1.25x**.

**Sentinels (Vệ Binh)**
* **Activation:** 1 Sentinel automatically spawns for every 5 enemies killed.
* **Limit:** Maximum 15 Sentinels on the battlefield.
* **Stats:** 150 HP | Fire rate: 95ms.
* **Normal Shot:** Deals 3 Base + 3% Max HP (Speed 9, Size 7.8).
* **Special Shot:** Every 4th shot is a massive bullet dealing 4 Base + 5% Max HP with 10% extra speed.
* **Death Throes:** Upon dying, causes screen shake and explodes into 10 scattered projectiles (2 Damage, Speed 8).

**Final Defense**
* A hidden automated defense mechanism that activates temporary invulnerability shields (Player Shield & Boundary Shield) to prevent instant, unfair deaths in bullet-hell situations.

---

## 🔮 Active Skills

### Skill A: Tracking Orbs (Key: A)
* **Cooldown:** 9 seconds.
* **Basic Stats:** Summons 15 homing energy orbs (Max 60 on screen). Sensor radius is 90% of the screen.
* **Detailed Mechanic:** Orbs automatically seek out enemies. Upon impact, they deal **10 Base + 18% Target Max HP** damage. The orb then shatters into 10 smaller scattered projectiles dealing 4 damage each, bouncing around the map.

### Skill S: Spirit Memory (Key: S)
* **Cooldown:** 15 seconds.
* **Basic Stats:** Summons an ancient Spirit (Max 2). Lasts for 35 seconds. Fire rate: 70ms.
* **Detailed Mechanic:** * *Spirit Bullets:* Deal 3 Base + 3.15% Max HP.
  * *Blade Arc:* Every 5 shots, the Spirit unleashes a massive blade arc (125 radius) dealing 10 Base + 13.15% Max HP. **This arc cuts through and destroys enemy bullets.**
  * *Finale:* After 35 seconds, the Spirit stops, charges for 2.5s, and fires a devastating screen-wide laser (10 Base + 40% Max HP per tick) before exploding into 8 massive bouncing plasma balls.

### Skill D: Cosmic Black Hole (Key: D)
* **Cooldown:** 15 seconds.
* **Basic Stats:** Charges for 2.7 seconds to spawn a Black Hole.
* **Detailed Mechanic:** Sucks all enemies toward its center with a gravitational pull speed of 5.5. Any enemy (including Bosses) that touches the absolute center of the black hole is **instantly executed (HP = 0)**.

### Skill F: Annihilation Sweep (Key: F)
* **Cooldown:** 10 seconds.
* **Basic Stats:** 1.5s charge time, 1s execution time.
* **Detailed Mechanic:** Charges energy and then sweeps a gigantic laser across the entire screen in 1 second, causing violent screen shake. Any enemy caught in the sweep angle is instantly vaporized.

### Skill G: Life Domain / Tesla Matrix (Key: G)
* **Charge Requirement:** Charges from 0% to 100% (**+0.5% per enemy kill**).
* **Duration:** 30 seconds.
* **Basic Stats:** Spawns Energy Orbs (Size 15) and Tesla Coils (Size 20). Max 4 Tesla Coils.
* **Detailed Mechanic:**
  * *Aura & Buffs:* Instantly grants the *Glory for Justice* passive buff while active.
  * *Energy Links:* Orbs find pairs and link together for 5 seconds. Enemies walking through the energy link have their **movement speed reduced by 20%** and take DoT (Damage over Time) shocks dealing 5 Base + 3% Max HP every 200ms.
  * *Tesla Coils:* After 5 seconds, paired orbs merge into a Tesla Coil. The Coil has a magnetic aura (Radius 200) that **slows all enemies inside by 20%**. 
  * *Detonation:* When a Coil's HP (30) depletes or the 30-second skill duration ends, all Orbs and Coils detonate. Coils deal 10 Base + 15% Max HP in a massive AoE.

---

## 👾 Entities: Enemies & Bosses

### Normal & Mini-Bosses
* **Normal Enemies:** Spawn continuously. Their HP pool scales infinitely based on how long the player has survived.
* **Mini-Boss:** 26% chance to spawn instead of a normal enemy. Has significantly higher HP and damage output.

### The Boss & "Demon Gift"
* **Boss:** 2.6% chance to spawn. Massive in size with a colossal HP bar.
* **Passive: Demon Gift:** The Boss possesses a terrifying self-preservation mechanic that triggers exactly when its HP drops to **70%, 40%, 10%, and 1%**.
  * *Global Heal:* Heals all other enemies on the screen for an amount equal to **15% of the Boss's Maximum HP**.
  * *Overheal Shield:* If the heal amount exceeds a minion's Max HP, the excess healing is converted into a sturdy Shield at a 21% efficiency rate.
  * *Damage Reduction:* Grants all minions an aura that reduces incoming damage by **18% for 3.5 seconds**.
