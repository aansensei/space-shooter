# Space Shooter – Comprehensive Upgrade (FX & Balance)

## 🎮 Gameplay & Movement
- **Objective**: Survive against endless waves of enemies and score as high as possible.
- **Movement**: Use the **Left Arrow (ArrowLeft)** and **Right Arrow (ArrowRight)** keys to move the spaceship sideways.
- **Lives**: You start with 15 lives. For every 500,000 points earned, you will gain 1 extra life.
- **Glory for Justice Mechanic**: Automatically triggers when there are more than 4 enemies on screen or when Skill G is active. This state increases the auto-fire rate by 1.4x and projectile speed by 1.25x. For Sentinels, the fire rate is also increased (cooldown divided by 1.40).

## ⚔️ Normal Attack & Overload
- **Player Stats**:
  - Movement Speed: 8.6
  - Auto-fire Interval: 170ms per volley.
- **Normal Attack (Auto Fire)**:
  - Fires 5 bullets per volley with a spread angle of 45 degrees (PI/4).
  - Bullet Speed: 10.4
  - Base Damage: 6
  - Percentage Damage: 3% of target's max HP (0.03).
  - Bullet Size: 6.25.
- **Charged Attack (Hold Space)**:
  - Maximum Charge Time for a super bullet: 1300ms.
  - Max Damage Multiplier: x10.
  - Max Percentage Damage (at full charge): 12% (0.12).
- **Overload Laser (Hold Space Long)**:
  - Requires holding the Spacebar for 5000ms to activate Overload.
  - Laser Duration: 12 seconds (12000ms).
  - Laser Cooldown: 15 seconds (15000ms).
  - The Laser ticks (deals damage) every 250ms.
  - Laser Damage: 10 base + 24% of the target's HP (0.24) per tick.

## 🤖 Passive Skill: Sentinel
- For every 5 enemies killed, you summon 1 Sentinel.
- Maximum Limit: Up to 15 Sentinels on the field at once.
- Sentinel HP: 150.
- Fire Rate: 95ms per shot.
- **Normal Bullet**: Deals 3 base damage + 3% max HP. Bullet speed is 9, size 7.8.
- **Special Bullet**: Every 4 normal shots, the Sentinel fires 1 special bullet dealing 4 base damage + 5% max HP (massive size 30, speed multiplier 1.1x).
- **Death Effect**: When a Sentinel's HP reaches 0, it explodes, causing screen shake and shooting 10 projectiles (damage 2, size 6, speed 8) in all directions.

## 🔮 Active Skills

### 1. Skill A – Tracking Orbs (Key A)
- **Cooldown**: 9 seconds (9000ms).
- **Effect**: Summons 15 energy orbs per use. A maximum of 60 orbs can be maintained at once.
- **Damage**: Each orb automatically tracks targets. Upon collision, it explodes dealing 10 base damage + 18% target HP.
- **Scattered Projectiles**: The orb breaks into 10 smaller projectiles (damage 4, size 4) that scatter around.

### 2. Skill S – Spirit Memory (Key S)
- **Cooldown**: 15 seconds (15000ms).
- **Effect**: Summons a Spirit. Maximum 2 Spirits on the field.
- **Duration**: 35 seconds (35000ms).
- **Fire Rate**: 70ms per shot. Spirit bullets deal 3 damage + 3.15% max HP (size 7.2).
- **Blade Arc**: Every 5 shots, the Spirit fires 1 massive Blade Arc (radius 125) dealing 10 damage + 13.15% max HP.
- **Finale**: After 35 seconds, the Spirit stops moving, charges for 2.5 seconds (2500ms), and unleashes a massive laser across the screen toward enemies.

### 3. Skill D – Black Hole (Key D)
- **Cooldown**: 15 seconds (15000ms).
- **Effect**: Charges for 2.7 seconds (2700ms) to open a black hole.
- **Pull Speed**: Sucks all enemies towards its center with a speed of 5.5.
- **Damage**: Any enemy pulled into the exact center of the black hole is instantly killed (HP = 0).

### 4. Skill F - Laser Sweep (Key F)
- **Cooldown**: 10 seconds (10000ms).
- **Mechanic**: Charges for 1.5 seconds (1500ms) before sweeping a gigantic laser across the screen for 1 second (1000ms).

### 5. Skill G - Life Barrier / Domain (Key G)
- **Charge (Energy)**: Charges from 0-100%. Restores 1% for each enemy killed.
- **Effect**: When activated, creates Energy Orbs (size 15) and Tesla Coils (size 20). 
- **Max Tesla Coils**: Up to 6 Tesla Coils on the field.
- **Tesla Aura**: The magnetic interference zone has an effective radius of 200.

## 👾 Enemies & Bosses
- **Boss**: Has a 2.6% spawn chance. Extremely large in size and possesses massive HP.
- **Mini-Boss**: Has a 26% spawn chance with medium difficulty.
- **Normal Enemy**: Spawns with the remaining chance. Their HP scales up based on how long the player has survived (time elapsed).
- **Boss Passive (Demon Gift)**: Triggers when the Boss's HP drops to 70%, 40%, 10%, and 1%.
  - Heals all other enemies on the field for 15% of the Boss's Max HP.
  - If the heal exceeds an enemy's Max HP, the excess healing is converted into a Shield (at a 21% ratio).
  - Grants other enemies an 18% damage reduction buff that lasts for 3.5 seconds.
