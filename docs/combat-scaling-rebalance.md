# Pisces: Space Journey: combat scaling proposal

Prepared for AanSensei. Source baseline: local checkout `7770ee4`, inspected September 15, 2026. This is a proposed specification, not an implemented or playtested balance patch. Runtime code takes precedence over descriptions and comments.

## Scope and decisions

Keep Skill F, all of Skill D including its spaceships, Phōtokrystos's Danger? Not Today! laser, and Back to Motherland unchanged. Their damage, cooldowns, activation, targeting, buffs, defensive interactions, and Sigil modifications are protected. Ordinary Remembrance Spirit attacks and its separate finale are in scope. There are 13 Sigils to review: 12 Zodiac signs plus Great Sage (`than`).

Use two releases. **Conversion** introduces stats with exact baseline parity. **Rebalance** applies the explicit numerical changes below. Do not combine these into one unmeasurable change. The Part 1 table is the conversion table; Parts 2 through 5 define the proposed balance release. When a Sigil appears in both, Part 5 is its final tuning.

**The player has lives, not numeric HP.** Enemy damage amounts currently matter primarily to Sentinels, Yuusha members, and destructible objects. Keep the life system: an ordinary unblocked collision still costs one life, and a control-only attack still costs zero. Do not silently introduce player HP. Enemy attack scaling will therefore affect numeric recipients; exposure, encounter duration, and unit survival still determine the threat to the player. Goliath Verdict's five sequential life-hit attempts and Uriel's additional Judged life loss remain unchanged in this proposal. If enemy ATK must determine player life loss too, that requires a separate decision about fractional life damage or a player HP system.

### Notation and table conventions

* `A`: current player ATK. Conversion release: 100. Proposed balance release: `100 + 2 × min(15, max(0, wave − 1))`, giving 100, 108, 118, and 130 at waves 1, 5, 10, and 16+. Recalculate at wave start, reset at run start. Summons inherit live player ATK when firing; projectiles snapshot it when created. DoT applications snapshot it when applied or refreshed.
* `E`: attacker's enemy ATK. Values and progression are listed in Part 2. Never derive `E` from HP, shields, projectile HP, or damage taken.
* `T`: victim's Max HP, excluding shields. `L`: victim's lost HP, `max(0, T − currentHP)`. `H`: attacker's own Max HP. `r`: attacker's lost HP fraction, `clamp(1 − currentHP/H, 0, 1)`.
* `P`: Primeval Energy in points, 0 to 100. The Yuusha implementation uses this value, despite its descriptions saying Max HP.
* `g(w) = 1 + 0.02 × min(15, max(0, w − 1))`. Thus `A = 100g(w)` in the balance release. `u = 1 + _yuukiBonus` remains an independent multiplier, currently growing by 0.20 every two waves starting at wave 8, up to 4.00 total. Do not count it again inside ATK.
* `Hs = min(H, 2H₀)` is the bounded attacker Max HP used by the selected HP attacks. `H₀` is a fixed species calibration value in Part 2, not the particular instance's spawn HP. This preserves HP builds while preventing late HP inflation from creating unbounded one-hit damage. HP attacks do not also multiply by `g`.
* Tables show raw payloads before global multipliers, DR, shields, and existing per-target caps unless explicitly stated. Preserve true, piercing, and ordinary damage types unless a row explicitly changes one. Percentages retain the named basis. Numeric enemy examples use `T = 300`, `g = 1`, and the listed `H₀`.
* Keep floating point amounts through the proposed pipeline. Round only the final numeric loss or displayed value. For periodic rates, accumulate fractional damage rather than rounding every rendered frame. The conversion release retains current rounding points for parity.
* Source locations in tables are relative to the project's `js/` directory. Before values describe executable source, not tooltip promises. No measured hit rate or encounter duration is assumed.

### Important source discrepancies

1. `entities/core.js:869` uses **Glory ×1.70**, not ×1.55. Phōtokrystos bullets additionally multiply their base by 1.55 at `skill-s-spirit.js:420`; boomerangs multiply base plus lost HP locally at line 581. Conversion preserves both. The rebalance explicitly normalizes in-scope friendly damage to **one ×1.55**, as described in the request, with Accurate Parry still ×1.25. Both together become ×1.9375 instead of the core's ×2.125. Protected sources keep their current behavior.
2. Most eligible hits also receive an undocumented **+60** in `entities/core.js:861`. Converting only projectile constants misses this. It becomes `0.60A` on precisely the same eligible payloads during conversion.
3. Some enemy hits receive friendly Glory, Parry, Yuuki, and Sigil multipliers through the shared resolver. Vanguard reconstructs incoming damage and applies Glory and Parry again in its own path. This must be corrected as an explicit balance change, not hidden in the conversion.
4. Abnormal and Elite names differ from the prompt's tiers. Runtime wave selection uses Marchosias, Veilshroud, and Uriel in the abnormal pool; Thaelis, Raphael, and Egregor in the elite pool; Dargruel and Leviathan in the dominator pool. All are covered without moving them between pools.
5. Tesla Coil aura is **130 + 2.5% T per 125ms**, not the README's 6% per 50ms. Enuma Elish's runtime cooldown is **1s**, not the tooltip's 0.5s. Gaia Barrier is **25% lost HP + 15% Max HP**, not its adjacent comment's 20% + 10%.
6. Goliath Corrupted Meteor's Sentinel call supplies `percentDamage` without `damage`; the shared resolver adds `undefined`, producing a nonfinite result. The table labels the intended 25% formula separately from that runtime defect. Fix nonfinite damage before using match statistics as a balance baseline.

## Part 1: player ATK conversion

For each existing flat base `B`, use `c = B/100`, then `raw = cA + pT + qL`. Preserve all existing multipliers and proc conditions during conversion. Summons use the player's ATK, with their existing Blessing and herd multipliers applied afterward. This changes the source of the number without changing its value at `A = 100`.

In the balance release, the final in-scope friendly pipeline is:

`raw = cA + pT + qL + eligibleImpactBonus(0.60A)`

`outgoing = raw × Glory(1 or 1.55) × Parry(1 or 1.25) × u × attackSpecificModifiers × SigilModifiers`

Then apply target debuffs, target DR/armor, relevant caps, shields, and actual HP loss in that order, retaining explicit special interception rules. Reflected or stored damage is tagged as already scaled and must not receive the same outgoing multipliers a second time. Enemy faction attacks never receive this friendly multiplier bundle. Protected sources use the existing path and constants.

### Every in-scope flat player and Sentinel payload

| Attack or component | Current raw value | Conversion formula | Base at A=100 → A=130 | Source |
|---|---|---|---|---|
| Eligible impact bonus | +60 | +0.60A | 60 → 78 | entities/core.js:861 |
| Auto-fire, each of 5 bullets | 130 + 0.4% T | 1.30A + 0.4% T | 130 → 169 | entities/core.js:269 |
| Charged bullet, charge m from 1 to 10 | 0 + 0.7% × m × T | 0A + 0.7% × m × T | 0 → 0; eligible impact bonus still applies | main.js:2064 |
| Overload, each 155ms tick | 350 + 23% T | 3.50A + 23% T | 350 → 455 | main.js:786 |
| Overload clone beams, each of 4 clones | Same 350 + 23% T; hit geometry may cover more than one beam | 3.50A + 23% T | 350 → 455 | main.js:322,793 |
| Gemini mirrored Overload, each of 2 mirrors | 341.25 + 22.425% T, from 1.30×0.75 | 3.4125A + 22.425% T | 341.25 → 443.625 | main.js:818 |
| A, primary orb impact | 200 + 20% T | 2A + 20% T | 200 → 260 | skills/skill-a.js:229 |
| A, primary follow-up true hit | 100 + 15% L | A + 15% L | 100 → 130 | skills/skill-a.js:231 |
| A, Astral Pierce subsequent impact | 240 + 24% T | 2.40A + 24% T | 240 → 312 | skills/skill-a.js:189 |
| A, Astral Pierce subsequent true hit | 120 + 18% L | 1.20A + 18% L | 120 → 156 | skills/skill-a.js:191 |
| A, scattered projectile, each | 8 + 2% T | 0.08A + 2% T | 8 → 10.4 | skills/skill-a.js:192,232 |
| A, Dimensional Rift DoT | 60 + 5.5% T / 350ms | 0.60A + 5.5% T / 350ms | 60 → 78 | skills/skill-a.js:376 |
| A, Rift chain payload | 50% of originating raw Rift tick | 0.5 × (0.60A + 5.5% originating T) | flat portion 30 → 39 | skills/skill-a.js:387 |
| Soul Reaver DoT, including orb retaliation | 60 + 5.5% T / 350ms | 0.60A + 5.5% T / 350ms | 60 → 78 | skills/misc-mechanics.js:76 |
| Normal Spirit bullet | 120 + 0.5% T | 1.20A + 0.5% T | 120 → 156 | skills/skill-s-spirit.js:101 |
| Normal Spirit arc | 180 + 4.6% T + 5.5% L | 1.80A + 4.6% T + 5.5% L | 180 → 234 | skills/skill-s-spirit.js:144,726 |
| Twin Blades Spirit arc, each | 288 + 7.36% T + 5.5% L | 2.88A + 7.36% T + 5.5% L | 288 → 374.4 | skills/skill-s-spirit.js:120,726 |
| Normal Spirit finale tick | 10 + 40% T / 100ms | 0.10A + 40% T / 100ms | 10 → 13 | skills/skill-s-spirit.js:1080 |
| Finale spinner body | 200 + 15% T, per-target 1s | 2A + 15% T | 200 → 260 | skills/skill-s-spirit.js:945 |
| Spinner mini arc, each | 350 + 3.5% T | 3.50A + 3.5% T | 350 → 455 | skills/skill-s-spirit.js:811 |
| Twin Blades spinner mini arc, each | 560 + 5.6% T | 5.60A + 5.6% T | 560 → 728 | skills/skill-s-spirit.js:811 |
| Phōtokrystos homing bullet | 125 + 1.7% T, before local buffs | 1.25A + 1.7% T | 125 → 162.5 | skills/skill-s-spirit.js:420 |
| Phōtokrystos boomerang | 500 + 7% T + 5% L, before local buffs | 5A + 7% T + 5% L | 500 → 650 | skills/skill-s-spirit.js:489,581 |
| G, link DoT | 95 + 0.6% T / 125ms | 0.95A + 0.6% T / 125ms | 95 → 123.5 | skills/skill-g.js:238 |
| G, Aquarius link chain | 95 + 0.6% struck target T | 0.95A + 0.6% struck target T | 95 → 123.5 | skills/skill-g.js:248 |
| G, Coil aura | 130 + 2.5% T / 125ms | 1.30A + 2.5% T / 125ms | 130 → 169 | main.js:1060 |
| G, orb collision or expiry burst | 10 + 6% T | 0.10A + 6% T | 10 → 13 | skills/skill-g.js:160,188 |
| G, expiry burst at endSkillG | 20 + 9% T | 0.20A + 9% T | 20 → 26 | skills/skill-g.js:27 |
| G, destroyed Coil burst | 20 + 15% T | 0.20A + 15% T | 20 → 26 | skills/skill-g.js:301 |
| Sentinel normal bullet | 30 + 1.5% T | 0.30A + 1.5% T | 30 → 39 | entities/sentinel.js:155 |
| Sentinel special bullet | 50 + 3% T | 0.50A + 3% T | 50 → 65 | entities/sentinel.js:145 |
| Sentinel death bullet, each of 10 | 2 + 2% T | 0.02A + 2% T | 2 → 2.6 | entities/sentinel.js:64 |
| Vulnerability window end | 500 true | 5A true | 500 → 650 | entities/core.js:77 |
| Aries blade | 50 + 4% T | 0.50A + 4% T | 50 → 65 | skills/sigil-aries.js:30,76 |
| Yuusha Tank blade | 40 + 0.04P | 0.40A + 0.04P | 40 → 52 | yuusha-party.js:1075 |
| Yuusha Marksman arrow | 75 + 0.05P | 0.75A + 0.05P | 75 → 97.5 | yuusha-party.js:1109 |
| Yuusha Mage zone tick | 50 + 0.04P / 500ms | 0.50A + 0.04P / 500ms | 50 → 65 | yuusha-party.js:1148 |
| Gemini small orb | 75 + 3% T | 0.75A + 3% T | 75 → 97.5 | skills/sigil-gemini.js:85 |
| Gemini large orb | 180 + 8% T | 1.80A + 8% T | 180 → 234 | skills/sigil-gemini.js:83 |
| Gemini proc laser | 350 + 18% T / 125ms | 3.50A + 18% T / 125ms | 350 → 455 | skills/sigil-gemini.js:133 |
| Cancer whirlpool DoT | 50 + 0.25% T / 100ms | 0.50A + 0.25% T / 100ms | 50 → 65 | skills/sigil-cancer.js:43 |
| Cancer whirlpool bite | 650 + 25% T | 6.50A + 25% T | 650 → 845 | skills/sigil-cancer.js:43 |
| Leo Burn per stack | 200 + 5% T / 500ms | 2A + 5% T / 500ms | 200 → 260 | main.js:2971 |
| Virgo fist | 1000 + 10% T + 15% L | 10A + 10% T + 15% L | 1000 → 1300 | skills/sigil-virgo.js:34 |
| Libra large arrow traversal | 300 | 3A | 300 → 390 | skills/sigil-libra.js:506 |
| Libra small arrow traversal | 180 | 1.80A | 180 → 234 | skills/sigil-libra.js:456,506 |
| Libra large explosion | 400 + 20% T | 4A + 20% T | 400 → 520 | skills/sigil-libra.js:457 |
| Libra small explosion | 180 + 12% T + 5% L | 1.80A + 12% T + 5% L | 180 → 234 | skills/sigil-libra.js:457 |
| Sagittarius auto proc arc | 300 + 7% T + 5.5% L | 3A + 7% T + 5.5% L | 300 → 390 | entities/core.js:286; skills/skill-s-spirit.js:726 |
| Capricorn bonus direct true hit | 200, excluding Goliath | 2A, same eligibility | 200 → 260 | entities/core.js:1684 |
| Great Sage Raphael | 220 + 12% T | 2.20A + 12% T | 220 → 286 | skills/sigil-great-sage.js:198 |
| Great Sage Marchosias | 260 + 13% T | 2.60A + 13% T | 260 → 338 | skills/sigil-great-sage.js:217 |
| Great Sage Veilshroud | 320 + 17% T true | 3.20A + 17% T true | 320 → 416 | skills/sigil-great-sage.js:229 |
| Great Sage Egregor | 260 + 14% T | 2.60A + 14% T | 260 → 338 | skills/sigil-great-sage.js:266 |
| Great Sage Dargruel | 190 + 11% T | 1.90A + 11% T | 190 → 247 | skills/sigil-great-sage.js:287 |
| Great Sage Leviathan | 200 + 11% T | 2A + 11% T | 200 → 260 | skills/sigil-great-sage.js:304 |
| Great Sage Goliath copy | 420 + 22% T true | 4.20A + 22% T true | 420 → 546 | skills/sigil-great-sage.js:322 |

The Great Sage Goliath attack has an implementation, but ordinary Goliath kills award its three absorbed gems instead of a Goliath gem. Treat that attack as a dormant compatibility path, not measured normal-run DPS. Uriel is absent from the current stealable gem registry; do not invent an Uriel gem.

### Derived, percentage-only, and special paths

| Component | Current | Conversion | Balance-release decision and rationale |
|---|---|---|---|
| Glory chain | 50% of already resolved parent damage, passed through outgoing multipliers again; 8 targets, 150ms gate | Preserve exactly for parity | Use 50% of parent's pre-target-defense, already outgoing-scaled payload; apply only destination defenses. Preserve 8 targets and 150ms. Avoid double Glory/Parry and target DR inheritance. |
| Enuma Elish | min(15% T, 16000) | Unchanged, no flat base | Part 5 adds an ATK-related cap. |
| Virgo auto critical | Normal hit plus separate 3× base and percent true hit, with no second +60 | Derive the extra hit from the converted auto payload | Part 5 retunes the extra hit; do not mistake this for four ordinary hits. |
| Aquarius field | 3.5% T/s | Unchanged | Part 5 retains rate with fixed 100ms ticks. |
| Pisces marked detonation | 60% accumulated damage + 35% L | Unchanged | Part 5 removes repeat amplification and lowers lost HP contribution. |
| Shift | No numeric damage; bullet clearing and protection | No ATK coefficient | Unchanged. |
| Spinner repeated-contact discount | ×0.70 within 1s, shared timestamp | Unchanged | Keep; protects against overlapping spinner blades. |
| Spinner ricochet bonus | +15% per bounce, max +45% | Unchanged | Keep in Part 5. |
| Phōtokrystos post-DNT penalty on ordinary bullets | ×0.80 for 3s | Unchanged | Keep without changing DNT or its timing. |
| Spirit finale against Goliath | Warding Palm overrides payload: 35% chance of 15% H loss, otherwise 35% H | Keep override in conversion | Keep this override, and flag it as a major exception to ATK scaling. Separating it from the protected F/D interception would require its own encounter test. |

**Rationale:** 100 ATK makes every legacy base a readable coefficient and an exact equality at the reference point. A bounded 30% increase over 15 waves helps flat damage against armor without compounding the already large Yuuki and Sigil multipliers. It does not inflate percentage components. For example, a 130 + 0.4% hit against T=10000 is 170 before impact bonus at A=100 and 209 at A=130, a 22.94% increase, not 30% to the entire hit. Including its impact bonus, 230 becomes 287.

## Part 2: enemy scaling diversity

Every numeric hostile attack gets exactly one primary basis: ATK, own Max HP, or own lost HP. The enrage formula is `cE × (0.80 + 0.40r)`. It averages the old nominal amount over a uniformly traversed HP bar, with 80%, 100%, and 116% output at 100%, 50%, and 10% remaining HP. That average is a calibration assumption, not evidence about actual encounter residence time. Use enrage only for Thaelis's large volley, Egregor's Null Slash, and Goliath's Verdict.

Snapshot owner, faction, ATK, `Hs`, missing HP fraction, and damage type at launch, including delayed attacks and death attacks. Projectile HP remains an independent interception durability. A wounded or shot projectile must not deal less damage merely because its HP was depleted. If a source dies, its projectile retains its snapshot. This is particularly necessary for Marchosias blades, Veilshroud delayed strikes/echoes, and shared shockwaves, which do not all preserve owner references today.

### Enemy stats

| Enemy | New base ATK E₀ | E at g=1.30 | Fixed H₀ for own-HP attacks | Reason |
|---|---:|---:|---:|---|
| Apostle | 36 | 46.8 | 100 | Early full-health Apostle is roughly 26 to 48 HP; decouple offense from its large late HP growth. |
| Thaelis, including revived | 180 | 234 | 3000 | Match its existing 180-HP large projectile nominal hit. |
| Cocoon Guard | 30 | 39 | 750 | No active numeric attack currently; explicit zero attack rows below. |
| Legacy Embryo | 0 | 0 | 1 | No active numeric offense found; do not invent one. |
| Uriel | 90 | 117 | 3000 | Holy Sword nominal 30% of a 300-HP Sentinel. |
| Raphael | 60 | 78 | 4000 | Laser nominal 20% of a 300-HP Sentinel. |
| Marchosias | 50 | 65 | 4000 | Normal rounds near 1.25% of full body HP. |
| Marchosias minion | 100 | 130 | 1500 | Prevent a minion's roughly 32.5% to 45.5% parent HP becoming one projectile's damage. |
| Veilshroud and retained echo snapshot | 54 | 70.2 | 3000 | Phantom Strike nominal 18% of a 300-HP Sentinel. |
| Dargruel | 25 | 32.5 | 12000 | Mean of its nominal 10 to 40 projectile roll. |
| Egregor | 60 | 78 | 4000 | Tempest's nominal 60 damage and Null Slash ratios. |
| Leviathan | 180 | 234 | 12000 | Heavy basic fire and sweep compared with ordinary 300-HP summons. |
| Goliath Alpha/True Form | 120 | 156 | 200000 for True Form only | Alpha has no numeric attack. True Form attacks must not inherit hundreds of thousands of damage from health growth. |

For ATK and enrage sources, `E = E₀g(waveAtSpawn)`; revived forms retain their spawn wave's `g`. For HP sources use `Hs` only, without an extra ATK multiplier. Keep existing body HP, spawn budgets, cadence, geometry, telegraphs, and collision behavior unless explicitly listed. HP coefficients use current Max HP at launch, so Max HP buffs change those attacks up to the `2H₀` limit.

### Complete hostile numeric attack assignment

The example column compares **nominal raw amounts**, not current resolved damage after accidental friendly buffs or route differences. `n` is the number of relevant hits counted by the current skill.

| Enemy and attack | Current raw formula | Category and proposed formula | Example before → after | Source and rationale |
|---|---|---|---|---|
| Apostle bullet | Remaining projectile HP, initially shooter's current HP | ATK: 1E | 36 at a full 36-HP Apostle → 36 | main.js:1653,1425. Preserve early threat, remove HP coupling. |
| Echo-spawned Apostle bullet | Same, potentially huge HP inherited from phantom damage | ATK: 1E using Apostle E₀ | Variable, no finite fixed baseline → 36 | main.js:2620. Same projectile shape should not hide an arbitrary one-hit payload. |
| Thaelis large projectile | Remaining projectile HP, starts at 180 | Lost HP: E(0.80 + 0.40r) | 180 → 144 / 180 / 208.8 at r=0/.5/.9 | main.js:1559. Tenacity fits desperation. Keep projectile durability 180. |
| Thaelis small split projectile | 15% T; durability 60 | ATK: 0.25E | 45 → 45 | main.js:1423,1472. Keep splits non-enraged so a volley does not multiply two enrage bonuses. |
| Uriel Holy Sword | 30% T, true | ATK: 1E, true | 90 → 90 | entities/uriel.js:378. Precision blade, no HP connection. |
| Raphael Lumen Nova | 20% T | ATK: 1E | 60 → 60 | main.js:604. Match typical Sentinel hit. |
| Raphael Wisdom Orb | 25% T, true | Own Max HP: 0.01875Hs, true | 75 → 75 at H₀=4000 | entities/raphael.js:105. Stored vitality themed orb. |
| Raphael Wisdom zone | 5% T/s, true; called every frame | Own Max HP: 0.00375Hs/s, true | 15/s → 15/s | entities/raphael.js:148. Fixed 100ms ticks eliminate frame-rounding inflation. |
| Marchosias normal bullet | Remaining projectile HP; initially ceil(1.25% current owner HP) | ATK: 1E | 50 at full H=4000 → 50 | main.js:1700. Wounds no longer silently weaken its basic weapon. |
| Marchosias counter sword, first victim | 27% T | ATK: 1.62E | 81 → 81 | skills/misc-mechanics.js:39. Preserve first-hit weight. |
| Marchosias counter sword, second victim | 23% T | ATK: 1.38E | 69 → 69 | Same source. Preserve falloff. |
| Marchosias counter sword, third+ victim | 21% T | ATK: 1.26E | 63 → 63 | Same source. Preserve falloff. |
| Marchosias 1%-HP/death queued swords | Same 27% / 23% / 21% T | ATK: 1.62E / 1.38E / 1.26E, owner snapshot | 81 / 69 / 63 → same | entities/marchosias.js:169; main.js:1662. Do not add another enrage source. |
| Marchosias minion bullet | Remaining bullet HP, initially full current minion HP | ATK: 1E | 1500 for an illustrative full minion → 100 | main.js:1792. Intentional outlier reduction; high uncertainty about realized collision frequency. |
| Veilshroud Phantom Strike | 18% T | ATK: 1E | 54 → 54 | entities/veilshroud.js:163. Same for delayed post-death strike. |
| Veilshroud normal volley, each bullet | ceil(1.2% owner H), then reduced with projectile HP | Own Max HP: 0.012Hs | 36 → 36 at H₀=3000 | entities/veilshroud.js:179. Retain an existing vitality attack but separate durability. |
| Veilshroud Echo field | 6% T / 500ms for 2s | Own Max HP: 0.006Hs / 500ms, snapshot original Veilshroud | 18/tick → 18/tick | main.js:2647. Use original host HP, never the echo's placeholder 9999. |
| Dargruel basic bullet | Remaining projectile HP, initially ceil(10 + random×30) | ATK: E × uniform(0.4,1.6) | Roughly 10 to 40 → 10 to 40 | main.js:1565. Preserve spread and mean before integer rounding. |
| Dargruel normal chain | 15% T, true | ATK: 1.80E, true | 45 → 45 | main.js:1338. Keep player effect control-only. |
| Dargruel dark chain | 20% T, true | ATK: 2.40E, true | 60 → 60 | main.js:1338. Preserve dangerous chain distinction. |
| Dargruel death chain volley | Normal chain formula | ATK: 1.80E, true | 45 → 45 | main.js:1620. Snapshot at launch. |
| Dargruel Maou Haki shockwave | 38% T | Own Max HP: 0.0095Hs | 114 → 114 at H₀=12000 | main.js:567. Large body fuels an expanding wave. |
| Egregor Psychic Tempest, normal and forced | 20% T | Own Max HP: 0.015Hs | 60 → 60 at H₀=4000 | entities/egregor.js:155,211. Tentacle body fuels discharge. |
| Egregor Null Slash, one victim | 30% T × (1 + min(.30,.06×rageStacks)) | Lost HP: 1.50E × (0.80 + 0.40r) | 90 to 117 → 72 / 90 / 104.4 at r=0/.5/.9 | entities/egregor.js:300. Replace damage rage multiplier, retain movement/cadence rage. |
| Egregor Null Slash, two victims | 35% T × rage multiplier | Lost HP: 1.75E × (0.80 + 0.40r) | 105 to 136.5 → 84 / 105 / 121.8 | Same source. |
| Egregor Null Slash, three+ victims | 40% T × rage multiplier | Lost HP: 2E × (0.80 + 0.40r) | 120 to 156 → 96 / 120 / 139.2 | Same source. True damage retained on all three slash rows. |
| Egregor Boon and Bane self-backlash | min(50% accumulated vessel, 40% H), then resolver amplification | Own Max HP capped reaction: min(0.50V,0.40H), already scaled | At V=1000,H=4000: raw 500 → 500 | entities/egregor.js:340. Reactive self-damage exception; never replace stored damage with an invented flat attack. |
| Leviathan basic bullet | ceil(2% H), then projectile HP loss reduces damage | Own Max HP: 0.02Hs | 240 → 240 at H₀=12000 | entities/leviathan.js:210. High-body-HP artillery identity retained. |
| Leviathan Perseverance opener and repeat sweep | min(50% T,5% T×min(250,n)) per >80ms contact | ATK: E × min(5/6,n/12), same contact interval | At n≥10: 150 → 150 | main.js:2451. Retain charge from hit count and saturation; unify currently inconsistent true/normal routes as true. |
| Leviathan Last Rites, each beam | min(55% T,1.5% T×n), once per beam | Own Max HP: Hs × min(0.01375,0.000375n) | At n≥37: 165 → 165 | main.js:2550. Death releases remaining body energy; resolve as true on all routes. |
| Goliath Absolute Verdict | 35% H, true | Lost HP: 1.50E × (0.80 + 0.40r), true | H=200000: 70000 → 144 / 180 / 208.8 | entities/goliath.js:609. Large deliberate numeric reduction; five player life-hit attempts retained. |
| Goliath Corrupted Meteor AoE | Intended 25% T true; numeric resolver currently receives undefined base | ATK: 0.625E, true | Intended 75 → 75; actual invalid baseline | main.js:2393. Fix invalid payload; preserve area and throw count. |
| Goliath Unbroken Will wave | 100 + 20% H, true | Own Max HP: 0.00060Hs, true | 40100 → 120 at H₀=200000 | main.js:533. A recovery wave should hurt summons without invariably erasing them. |
| Goliath Joker Veilshroud | 5% H × fracture/waning, true | ATK: 0.625E × fracture/waning, true | 10000 → 75 before modifiers | entities/goliath.js:1000. Two targets and warning retained. |
| Goliath Joker Raphael | 25% H × fracture/waning, true | Own Max HP: 0.00060Hs × fracture/waning, true | 50000 → 120 before modifiers | entities/goliath.js:1046. Heavier telegraphed vitality laser. |
| Goliath Joker Marchosias sword | 27% / 23% / 21% T | ATK: 0.675E / 0.575E / 0.525E | 81 / 69 / 63 → same before modifiers | main.js:2361. Snapshot and consistently apply its own fracture/waning. |
| Goliath Joker Egregor Null Slash | 30% / 35% / 40% T × fracture/waning | ATK: 0.75E / 0.875E / 1E × fracture/waning | 90 / 105 / 120 → same | entities/goliath.js:1145. No extra enrage on this copy. |
| Goliath Joker Dargruel wave | 38% T | Own Max HP: 0.00057Hs × fracture/waning | 114 → 114 before modifiers | main.js:567; entities/goliath.js:1179. Same nominal wave budget. |
| Goliath Joker Leviathan sweep | 50% T × fracture/waning, once per sweep | ATK: 1.25E × fracture/waning, true | 150 → 150 | entities/goliath.js:1229. Preserve one-hit-per-sweep budget. |

### Zero-damage and life-based paths, explicitly audited

| Path | Current → proposed | Assignment |
|---|---|---|
| Ordinary enemy body contact, including Apostle, Thaelis, Raphael, Marchosias, minions, Uriel, Veilshroud, Egregor, Leviathan, Goliath where a collision handler exists | 1 unblocked life event → 1 | ATK-family contact metadata, but no numeric player HP conversion. Do not add collision handlers where none exist. |
| Enemy bottom-boundary breach | Existing life-event behavior → unchanged | Encounter failure event, not a damage coefficient. |
| Uriel Judged | +1 extra lost life inside its 3s window → unchanged | Status punishment, not ATK damage. |
| Dargruel ordinary chains against player | 0 lives, 1s root/silence → unchanged | ATK category for numeric recipients, zero damage/control against player. |
| Dargruel Maou Haki / Goliath copied wave against player | Control and projectile clearing → unchanged | Own-HP category for numeric recipients only. |
| Egregor and copied Null Slash / Dimension Break against player | Slow/control and projectile disruption → unchanged | No new life damage or invented DoT. |
| Raphael Wisdom field against player | Slow field, no numeric HP loss → unchanged | Own-HP category for summons, no life tick. |
| Veilshroud Echo collapse / lingering field against player | Collapse 1 life event; field 0 → same | Own-HP field for summons only. |
| Goliath Unbroken wave against player | 0 lives → 0 | Own-HP attack to summons; projectile clearing retained. |
| Goliath Alpha / transforming form | No active numeric attacks; untargetable → unchanged | ATK initialized but inactive. Do not use placeholder HP=1 for combat scaling. |
| Goliath Joker Thaelis | Passive protection, no attack → unchanged as an attack | Sustain tuning is in Part 4. |
| Thaelis Cocoon / Guards / legacy Embryos | No active numeric damage payload found → no new attack | Passive or contact behavior only. |
| Yuusha piercing redirect | 1.5× attack's victim-based formula to each living member → 1.5× the same snapshotted attacker-derived payload to each | Feed the same damage descriptor to the squad resolver. Preserve number of recipients and interception conditions. |
| Ordinary bullets against Yuusha | min(30% member T,remaining bullet HP), except small bullets 15% T → min(30% member T,new payload) | Preserve the existing squad safety cap as a post-scaling cap, not the scaling source. |
| Enemy bullets against Tesla Coil | Remaining projectile HP → snapshotted new payload | Separate interception durability from impact damage. |
| Enemy attacks against D spaceships | Current formulas → unchanged | Protected legacy path; explicitly outside the otherwise shared enemy resolver. |

### Telegraphs and wave calibration

Use labels and shapes, not color alone: **ATK** with a narrow weapon reticle; **VITALITY** with outward concentric rings; **ENRAGE** with a segmented ring that fills as HP is lost and a visible multiplier such as ×1.16. Friendly target-Max-HP damage should say **TARGET HP**, while enemy own-HP attacks say **CASTER HP**. Keep existing windup times and geometry.

This design preserves most ordinary nominal hits at T=300. It does **not** claim equal realized wave threat: minion HP bullets, Goliath's extreme payloads, friendly-buff leakage, and new mitigation routes are deliberate outlier corrections. T=300 is close to the current 299-HP herd Sentinel, but below the 389 to 450 solo Sentinel, fortified variants, and Gaia-enhanced units. Larger HP builds should now buy survival rather than raise incoming damage proportionally.

For acceptance, replay identical seeds and inputs at waves 1, 2, 5, 10, 15, and 20, with 1/5/12 Sentinels and no Sigil, each individual Sigil, plus Taurus/Cancer/Capricorn and Aries/Gemini/Virgo. Record life loss, completed waves, actual HP damage to summons, summon deaths, enemy residence time, and damage by source. Ordinary-wave life-loss rate and median clear time should stay within 10% of baseline, summon deaths within 15%. These are proposed acceptance bands, not measured results. Keep spawn rosters and cadence fixed while tuning E₀ in 5% increments. Track Goliath separately as an intentional sustain/outlier correction. Do not label a raw-damage sum a wave simulation.

## Part 3: DR, healing, and resource rules

Use additive percentage DR with explicit caps, preserving the existing design rather than silently changing every stack to multiplication: `DR = clamp(sum(contributions),0,cap)`. Cap sustained enemy DR at 85% and friendly summon DR at 65%. Timed Veilshroud Phantom and Leviathan break grace retain their explicitly stated temporary limits. True damage bypasses ordinary DR and flat armor. It does not bypass invulnerability gates. Keep the protected sources' existing defenses and exceptions.

For ordinary numeric hits, `postDR = raw × (1 − DR)`; then `armorLoss = min(flatArmor,0.60 × postDR)`; damage after armor is `postDR − armorLoss`. Armor can remove at most 60% of what survives percentage DR. This avoids a permanent zero-damage floor from growing flat armor. This armor rule does not convert an invulnerability or evade into chip damage.

Resolve friendly unit damage once: incoming payload, evade/invulnerability, network dampening/distribution if present, per-recipient DR, barrier, shield, HP. Store actual resource changes for statistics and lifesteal. Gaia must subtract **only what its pool actually absorbed**; a 1-point barrier cannot discard 99% of a 1000-point hit. True damage bypasses Gaia and ordinary shields consistently on all in-scope routes. Fix Yuusha's ignored ordinary shield pool and pass true/normal type through its resolver.

### DR and damage-multiplier review

| Effect | Current | Proposed | Rationale |
|---|---|---|---|
| Friendly Glory damage | Core ×1.70, some Photo bases also ×1.55 | One ×1.55 on in-scope outgoing damage | Match requested meaning; explicit 8.82% core reduction. |
| Accurate Parry | ×1.25 for 4s | ×1.25 for 4s | Preserve reward and stacking. |
| Phōtokrystos local Glory | Base ×1.55 plus core ×1.70 | Remove local ×1.55 in ordinary Photo attacks only | Eliminate double application; protected BTM/DNT untouched. |
| Friendly buffs on hostile hits | Several resolver paths apply them | ×1 for all friendly offensive buffs on hostile hits | Defensive buffs should not increase incoming attack damage. |
| Yuuki | +20% every 2 waves from 8, cap +300% | Unchanged | Existing global progression remains separate from the modest ATK growth. |
| Vulnerability | +16% per stack, max +64%; shield destruction 26% | +12% per stack, max +48%; shield destruction 20% | Reduce multiplicative amplification and repeated shield shredding. |
| Vulnerability true kicker / expiry | 40% declining to 20% over 2.5s; 500 expiry | 30% declining to 15% over 2.5s; 5A expiry | Lower amplification, preserve flat conversion and timing. |
| Dimensional Rift damage taken | +25% | +20% | Stacks with Vulnerability and Sigils. |
| Normal Sentinel base DR | 8% solo; 5% in reconstructed Vanguard route | 8% on all numeric routes | Consistent defense. |
| Sentinel Glory DR | 30% solo; 15% network path | 25% on all numeric routes | Useful without the old incoming Glory multiplication. |
| Herd tier 2 DR | +10% at 5 to 11 | +8% at 5 to 11 | Network already distributes damage. |
| Sentinel Parry DR | +10% | +10% | Keep successful parry payoff. |
| Blessing DR | Stored 15%, or 20% with Leviathan; used for recoil and Yuusha, missing in ordinary Sentinel DR accumulation | Apply 10%, or 15% with Leviathan, to in-scope summon DR and recoil | Explicitly fix missing route; values lowered for wider actual coverage. |
| Yuusha base DR | 0%; other bonuses additive, cap 90% | 8%; shared friendly cap 65% | Match the intended Sentinel defenses after common routing. |
| Apostle base DR | 0% | 0% | Preserve fragile fodder. |
| Thaelis Tenacity | +2.5 percentage points DR per 1% HP lost, max 95% | +1 percentage point per 1% HP lost, max 60% | Strong but killable without requiring true damage. |
| Thaelis revived bonus | +20% DR, +250 flat armor | +10% DR, +100 flat armor | Revived body already has 80% original Max HP. |
| Cocoon Guard | 40% DR +20 flat | 40% DR +20 flat | Keep timed challenge baseline; new armor floor applies. |
| Legacy Embryo | 90% DR | 85% DR | Shared sustained cap; no new spawning behavior. |
| Uriel base / camouflage armor | 40%; +200 flat for 2s | 40%; +100 flat for 2s | Retain evade and stealth identity; avoid zeroing small hits. |
| Raphael base | 55% | 50% | Custos remains its distinct protection phase. |
| Raphael-granted shield DR | +18% | +12% | Reduce healer stack compounding. |
| Marchosias body / broken-barrier bonus | 45%; `enemy.DR` receives +20%, but core hardcodes 45% | 45% + explicit 10% while barrier is broken | Expose runtime discrepancy; evaluate actual body DR, not unused state. |
| Marchosias arc barrier DR | 60% on ordinary barrier hits | 60% | Keep shield-facing mechanic and 35%-current-barrier hit cap. |
| Marchosias minion DR | 75% | 65% | Parasite can be cleared after its bullet outlier is removed. |
| Veilshroud normal / Phantom | 40% / 99% | 40% / 99% | Preserve timed Phantom identity, excluding it from sustained cap. |
| Veilshroud post-heal DR | +20% for 3s | +10% for 3s | Less defensive feedback from support. |
| Dargruel Maître | 50% +2.5% per Sentinel, max 60% | 45% +1% per Sentinel, max 55% | Summoning help should not negate most added offense. |
| Dargruel low-HP DR | +1.5 points per point below 60% HP, max 72% | +0.75 points per point below 60%, max 30% | Caps combined intrinsic protection at 85%. |
| Egregor body | 40% base, +5% per lost tentacle max 20% | 40% base, +3% per lost tentacle max 15% | Tentacle interception already provides protection. |
| Egregor charging DR | +40% appears twice in common accumulation; some nontrue tentacle paths return earlier | Apply +25% exactly once on applicable body path | Remove path-dependent 99% plateau. |
| Leviathan base / flat armor | 60% +350 flat | 55% +150 flat | Maintain heavy defense while allowing ATK weapons to matter. |
| Leviathan AFO break grace | 90% for 1s | 90% for 1s | Explicit brief exception to ordinary cap. |
| Demon Gift DR | 20% per stack, max 40%, 4s | 10% per stack, max 20%, 4s | Buff still matters without repeatedly reaching 99%. |
| Envy DR | +25% | +15% | Reduce support stack saturation. |
| Walpurgis flat armor | 5 × wave, uncapped | min(100,5 × wave), plus 60% post-DR armor cap | Avoid eventual immunity to all small normal hits. |
| Goliath base DR | 70% × waning | 60% × waning | Sustain reductions must be tested together; preserve waning timing. |
| Goliath copied Thaelis DR | max(20%,60% − 0.6×lost-HP percentage points) | max(10%,25% − 0.15×lost-HP percentage points) | Keeps defensive gem without immediate 99% addition. |
| Goliath copied Marchosias broken barrier / Egregor casting | +20% / +40% | +10% / +15% | Stay within 85% sustained cap. |
| Goliath copied Veilshroud | +99% during Phantom, total capped 99% | Total 99% during its 3s Phantom | Preserve timed identity. |
| Goliath Tempered Resolve | +10% DR and +420 flat while casting | +10% DR and +100 flat while casting | Large armor reduction makes ordinary attacks viable. |
| Goliath Unified Front armor | 200(1+.10N), or 400(1+.15N) against percent payload | 100(1+.05min(N,12)) for both | Remove penalty based on payload encoding; max 160. |
| Goliath ordinary Photo resistance | ×0.60 | ×0.80 | Partly offsets removal of double Glory while keeping boss resistance. |
| Other per-hit and timed damage caps | Existing target-specific caps | Retain numerical limits | Avoid simultaneously redesigning every interception mechanic. See source inventory and protected boundaries. |

Retained special defenses still need explicit coverage; they are not ordinary DR contributions and must not be stacked a second time by the common resolver:

| Special defense | Before → after | Source / interpretation |
|---|---|---|
| Egregor ordinary hit, tentacles alive | Tentacle loss =35%×75%×(1−rageDR) of payload; rageDR +5%/stack capped25% → unchanged | entities/core.js:944. Interception path returns before common body DR. |
| Egregor body bleed after4 tentacle losses | min(12% payload,12% H) → unchanged | entities/core.js:974. This explicit88% attenuation is an interception exception to the ordinary85% DR cap. |
| Egregor piercing body with tentacles | 30% payload capped30% H; additional×.70 while charging → unchanged | entities/core.js:985. Do not add the common charging bonus to this early-return path. |
| Egregor all tentacles dead, nonpiercing normal hit | 50% payload capped30% H → unchanged | entities/core.js:995. Separate early-return path. |
| Marchosias/Egregor piercing burst cap | 20% H per rolling700ms → unchanged | entities/core.js:512 |
| Marchosias directional barrier | Normal barrier DR60%; piercing split70% to barrier and20% to body while intact; cap35% current barrier per hit → unchanged | entities/marchosias.js:7,73. Retain routing, including barrier-break transition. |
| Goliath copied directional barrier | 60% barrier DR; piercing barrier payload×1.15 and body payload×.70; cap35% current barrier per hit → unchanged | entities/goliath.js:289 |
| Veilshroud Phantom cap | 25% H per hit → unchanged | entities/core.js:1300 |
| Uriel body cap | 30% H per hit → unchanged | entities/core.js:1313 |
| Leviathan Inevitable | Hit>20% H opens3s cap10% H;2s cooldown after;one forced trigger at50% HP → unchanged | entities/core.js:1323,1618 |
| Dargruel protection window | Hit>25% H opens3.5s cap11% H;2s cooldown after → unchanged | entities/core.js:1341 |
| Thaelis per-hit cap | max(35%,90%−5×lost-HP percentage points) of H → unchanged | entities/core.js:1354 |
| Egregor per-hit cap | max(25%,90%−10% per lost tentacle) of H → unchanged | entities/core.js:1366. Backlash retains its own cap. |
| Embryo cap | 10% H per hit → unchanged | entities/core.js:1371 |
| Goliath ordinary-hit cap | min(3%,1.5%+0.3% per debuff stack) of H → unchanged | entities/core.js:1294. Piercing, true, and listed DoTs exempt. |
| Goliath burst window | Hit>8% H opens2s cap2.5% H;0.5s cooldown after → unchanged | entities/core.js:1440. True damage exempt. |
| Goliath large normal HP hit adjustment | If damage>30% current HP: max(damage−8% H,30% current HP) → unchanged | entities/core.js:1456 |
| Raphael Custos / Uriel Iron Body / Dargruel threshold Iron Body | Custos20 qualified hits with175ms throttle;existing Uriel gates;Dargruel3 hits per threshold → unchanged | Preserve hit-count defenses rather than translating them into DR. |
| Marchosias and Goliath copied barrier break | Grants5 Iron Body hits → unchanged | entities/marchosias.js:131; entities/goliath.js:337 |
| Goliath Fracture / transform | Fracture grants up to3 Iron Body hits;transform invulnerability4s → unchanged | entities/goliath.js:560,797 |

At baseline Glory, Parry, four Vulnerability stacks, and Rift, the core multiplier product decreases from `1.70×1.25×1.64×1.25 = 4.35625` to `1.55×1.25×1.48×1.20 = 3.441`. This 21.01% reduction is an intentional compensation for less armor and less sustain, not part of neutral ATK conversion. Enemy HP, evasion, and spawn frequency remain separate challenge levers.

### Healing, shield generation, and general defensive resources

Use recipient Max HP for percent healing and shields unless a row deliberately names caster HP. Ordinary player-side flat support amounts become ATK-based, with recipient-HP caps so a large ATK build cannot refill a fragile unit with every hit. Enemy sustain does not automatically use enemy ATK: changing an offensive stat should not secretly buff all defense.

Apply healing-effectiveness and anti-heal once, then resource caps. Standard Soul Reaver anti-heal is ×0.60 to in-scope HP recovery and shield grants. Do not apply it twice to overheal conversion. Ordinary numeric shields have aggregate caps: allies 30% T, ordinary enemies 50% T, Goliath 30% H. Named arc barriers and hit-count invulnerability are separate pools. Clamp new grants to available capacity, never erase already granted protected resources.

| Resource | Current | Proposed | Why |
|---|---|---|---|
| Sentinel recoil per shot | 1 × (1 − Blessing DR) HP | Same formula with retuned Blessing DR | Self-cost is not an attack; do not multiply by ATK. |
| Sentinel special-hit heal | 2 per collision, even if damage blocked | min(0.02A,1% own T), only if positive actual enemy HP/shield loss | 2 at A=100; 2.6 at 130. No healing on invulnerable targets. |
| Sentinel base HP | Tier 1 max(389,time-scaled 300 to 450); herd 299; 36% chance ×1.5 fortified | Keep base values and fortified rate | Avoid unnecessary HP inflation while incoming scaling is corrected. |
| Gaia Max HP progression | Sequential ×1.05, ×1.10, ×1.15, then ten ×1.03: approximately ×1.7851 | Additive 5%,15%,30%, then +3%/wave, cap +60%: ×1.60 | Match stated cap; reapply from each unit's base on tier transition without losing accumulated Gaia. |
| Gaia Barrier amount | 25% lost HP +15% T, every 8s, 5s at wave 10+ | 20% lost HP +12% T, same intervals | Bounded pool; Lunar still increases it as Part 5 specifies. |
| Gaia absorption | Some paths keep only 1% of hit even if pool is insufficient; other routes differ | Absorb min(pool,incoming ordinary damage); preserve remainder | Correct resource conservation before balance testing. |
| Gaia against true damage | Bypass in one route; 20% mitigation and 99% absorption in others | Bypass consistently | Makes stated damage type reliable. |
| Blessing regen | 1.75% T every 0.75s = 2.3333% T/s | 1.50% T every 0.75s = 2% T/s | Modest reduction alongside restored shield/DR behavior. |
| Blessing shield | +50 every 3s, its portion capped 50 | Add up to min(0.40A,15% T), portion cap same, every 3s | 40 at A=100 on T=300; grows to 45 cap. |
| Blessing Leviathan shield grant | +50; guard resets each 3s, allowing repeated grants | One min(0.40A,15% T) grant per Leviathan presence episode | Correct unintended repeated unbounded grant. |
| Cancer Tidal regen | 3% T/s ×1.30 = 3.9% T/s | 2.5% T/s ×1.20 = 3% T/s | Stable sustain relative to recoil, without indefinite passive replacement of all incoming damage. |
| Taurus Support heal | 50 to each of 2 lowest-HP% targets; checks every 1.2s | min(0.50A,20% recipient T), same targets and cadence | 50 on T=300; 40 on a 200-HP role. |
| Taurus Tank self-heal | 20 per absorb-meter release | min(0.20A,8% own T) | 20 at A=100; capped 24 for base 300 HP. |
| Taurus Tank damage soak | 30% real-Sentinel incoming share | 30%, routed through consistent numeric defense exactly once | Preserve role; no double mitigation. |
| Taurus role HP / respawn | Tank 300; others 200; 5s respawn | Unchanged | Evaluate offense/sustain independently. |
| Friendly network distribution | 60% target, 40% shared | Unchanged | Preserve formation behavior. |
| Network repeated-source damping | Hits 1/2 ×1, 3 ×.62, 4+ ×.32 within 200ms | Unchanged | Retain anti-AoE protection. |
| Network multi-source damping | 3/5/7/9 sources: ×.84/.72/.62/.52 within 100ms | Unchanged | Keep existing burst protection. |
| Fuse Protocol | 26% combined Max HP in 500ms; 3s CD; 1.25s Iron Body | Same numbers, count accepted incoming damage before distribution and after source damping | Stable source accounting; don't count friendly multipliers or rejected hits. |
| Final Defense player / boundary | 1 hit layer; player regeneration 25s | Unchanged existing timers and layers | Life-based defense is not a numeric heal. |
| Last Stand | Once at final life; Absolute Shield for player and summons | Unchanged | No new life inflation. |
| Raphael aura ally heal | 8% caster H/s, ×1.35 after Custos; self receives 55% rate | 4% caster H/s, capped at 3% recipient T/s; post-Custos ×1.20 before cap; self retains 55% | Prevent large healers fully restoring small units each second. |
| Raphael first shield | 38% caster H | min(20% caster H,25% recipient T) | Retain first protection burst. |
| Raphael ongoing shield | 6% caster H/s | min(2% caster H/s,2% recipient T/s) | Finite refill under aggregate shield cap. |
| Raphael overheal shield conversion | 50% excess | 25% excess | Reduce HP-to-shield feedback. |
| Raphael Custos-break shield | 8/12/20/24/28% own H for 0/1/2/3/4+ allies | 8/10/15/20/25% own H | Keep nearby allies relevant. |
| Dargruel Demon Gift heal | 28% caster H at five HP thresholds | min(15% caster H,20% recipient T) | Large boss no longer fully resets every small enemy. |
| Demon Gift overheal conversion | 30% excess | 20% excess | Lower shield banking. |
| Envy regen / received-heal bonus | 1% own T/s; +25% healing | 0.75% own T/s; +15% healing | Less combined support sustain. |
| Veilshroud normal received shield multiplier | ×1.35 | ×1.20 | Lower support amplification. |
| Veilshroud extra shield from healing | Can equal incoming heal amount | 50% of actual HP restored, capped by shield capacity | No reward for wasted full-health healing. |
| Veilshroud Phantom received recovery | ×0.75 in some paths | ×0.75 consistently | Preserve vulnerability to attrition during protection. |
| Uriel stealth healing | 2% H/s over 1.75s | 1.5% H/s over 1.75s | 3.5% → 2.625% H per full stealth. |
| Uriel reappearance shield | 20% H | 15% H | Compensate for reliable stealth and armor. |
| Marchosias barrier repair on impact | 5% barrier damage, cap 1000 per hit | 3% actual barrier loss, cap 2% body H per 1s | Prevent high-frequency attack spam from funding high repair. |
| Marchosias body heal from barrier | 10% barrier damage, cap 1000 per hit | 5% actual barrier loss, cap 2% H per 1s | Bounded reactive sustain. |
| Marchosias overheal conversion | 50% excess | 25% excess | Lower repeated conversion. |
| Marchosias barrier-break heal | 40% H | 15% H | Breaking defense must yield progress. |
| Marchosias barrier-break shield | 30% H +30% lost HP after heal | 15% H +10% lost HP after heal | Keep a recovery phase without replacing the broken barrier fully. |
| Marchosias initial/revived barrier | Initial 1.5525H; revived H | Unchanged pool sizes and regeneration timer | Its visible facing mechanic remains meaningful. |
| Marchosias parasite host grant | Remaining minion HP; spawn grant 32.5% to 45.5% parent H | min(remaining minion HP,15% host T) | Prevent small host acquiring a disproportionately large shield. |
| Thaelis threshold shield | (30% H +20% lost HP +250)×1.10 at 70/40/10% HP | 20% H +10% lost HP +100, same one-time thresholds | No ATK tie for defense; reduce repeated huge shields. |
| Thaelis revival | 40% original Max HP ×2 =80%; full at that reduced max; 1s invulnerability | Unchanged | Preserve Cocoon identity. |
| Thaelis guard-kill shield bank | +300 per killed guard | +150 per killed guard, capped at 30% revived H | Reward no longer scales unboundedly with repeated guard kills. |
| Leviathan Bulwark | 1.2% H per other enemy, max25% per layer; 2 layers; one per 1s | 0.8% H per enemy, max15% per layer; 2 layers; one per 1.5s | Maximum own shield rebuild 50% → 30% H. |
| Leviathan AFO-break shield | 50% H | 30% H | Short grace already prevents immediate burst. |
| Egregor tentacle-loss body heal | 6% H ×Walpurgis recovery | 4% H, same event and one effectiveness pass | Separate from Goliath review. |
| Egregor tentacle-loss Max HP gain | +20% of tentacle Max HP; tentacle is 80% body H | Unchanged | Major encounter HP structure; do not retune without tentacle kill data. |
| Egregor Mind Link ally-death heal | +15% Max HP; heal22% new H; heal living tentacles15% | Keep +15% Max HP; body heal12% new H; tentacles10% | Reduce reset strength while preserving reactive growth. |
| Walpurgis heal/shield effectiveness | +5% per 5-wave stack, unbounded | +3% per stack, cap +30% | Avoid compounding endless defense with HP growth. |
| Walpurgis body HP / evasion | +20% HP per stack; +5% evade per stack capped40% | Unchanged | Preserve primary late-run challenge while ATK/armor is evaluated. |
| Protected D spaceship healing/DR/shields | Shared ally buffs currently include these units | Preserve every existing value and route for spaceships | Separate recipient policy is required; do not alter shared loops blindly. |

At T=300, old Tidal plus Blessing regen is 18.7 HP/s. The proposed native rates sum to15 HP/s; with Cancer's20% healing-effectiveness bonus applied consistently to Blessing too, that becomes16.2 HP/s. Sentinel recoil under Glory is roughly19.2 shots/s solo and23.04 shots/s in a herd before other fire-rate bonuses. Special-hit heals and Support are still needed. This is an arithmetic comparison, not a prediction that every special shot lands.

## Part 4: dedicated Goliath sustain review

**Review item GOLIATH-SUSTAIN-01.** Alpha has placeholder HP and is invulnerable; it does not have a meaningful self-heal loop. Its healing-related mechanism is Circuit Link recording allied recovery into the eventual True Form HP budget. True Form has direct regen, cast-end healing, shield-to-heal feedback, copied Marchosias lifesteal, Thaelis milestones, and Unbroken Will. These are independent effects and must each be bounded.

Let `Hentry` be Max HP upon entering True Form, before Unbroken Will's temporary bonus. Use Hentry for all new Goliath sustain budgets so temporary HP cannot recursively enlarge its own refill. Ordinary shield cap is `0.30Hentry`. Total repeatable healing has a rolling 10s budget of `0.12Hentry`; repeatable shield generation has a rolling 10s budget of `0.15Hentry`. Apply bonuses, anti-heal, and Waning Might before those final budgets. One-time phase rewards below are outside the rolling budget but inside the aggregate shield cap. Consumed milestone flags never reset on healing or Unbroken Will.

| Goliath mechanic | Current | Proposed | Rationale |
|---|---|---|---|
| Alpha linked resource credit | +100% each positive tracked heal/shield grant to damagePull; coverage differs by path | +25% actual HP/shield/barrier restored after caps, once per grant; cumulative resource credit cap60000 | Measured resources, no credit for overheal, rejected shields, or the same grant twice. |
| Alpha damage ledger and True Form HP | Kill ledger: ceil(.75×damage)×10, special protected kills50000; damagePull cap320000; H=round((65000+pull)×(1+.25gemPoints)×Walpurgis×1.20) | Retain damage credit, cap, and HP formula; use retuned resource-credit part only | Isolate recovery-fed HP inflation from the base encounter and protected finishers. |
| Alpha remaining-wave HP grant / cull | +15% enemy HP; removes ceil(one-third remaining queued roster) | Unchanged | Not self-healing; no silent wave rewrite. |
| Extra gems at transform | One 20% recipient Max HP shield to nearest eligible enemy | One 15% recipient Max HP shield, normal capacity limit | Bounded support reward. |
| Base Inevitable regen | 2.5% H/s ×heal boost | 0.75% Hentry/s ×heal boost, repeatable budget | At Hentry=200000: 5000/s →1500/s before boosts. |
| Cast-end recovery | 20% H ×heal boost on transition from casting to idle | 3% Hentry ×heal boost, shared 4s cooldown, repeatable budget | At 200000: 40000 →6000 before boosts. Overlapping copied skills cannot multiply it. |
| Unified Front shield | Adds 5% H×N every second, no capacity limit | Restore 0.25% Hentry×min(N,8) per second, max2%/s, repeatable budget | N=12,H=200000: 120000/s →4000/s before rolling cap. |
| Unified Front healing bonus | +5% per player-side unit, cap60% | +2% per unit, cap20% | Counter-summon identity without overwhelming summon contribution. |
| Thaelis gem healing bonus | +35% | +20% | Keep strongest sustain gem meaningful. |
| Fracture recovery bonus | +15% for 1s | +10% for 1s | Small benefit only. |
| Unbroken recovery bonus | +40% for 6s after invulnerability | +20% for 6s | Avoid enormous post-revive recovery. |
| Total recovery boost | Additive, no aggregate bonus cap before waning | Additive bonus capped +50%, then waning/anti-heal/budgets | Maximum repeatable recovery remains provable. |
| Waning Might | Every35s: heal/shield factor .80^s for s≤2, then .80^(2s−2); damage/base DR analogous .85 | Keep rates and timing; apply to every in-scope repeatable recovery path | Existing Unified Front and some copied recovery bypass it; proposal closes those paths. |
| Threshold milestones | At75/50/25% HP, adds20% H×heal boost to threshold pool | Grant10% Hentry ordinary shield once at each threshold | Replace a persistent floor mechanism with consumable protection. |
| Threshold pool restoration | Each frame, pool≥25/50/75/100% H restores HP to matching threshold, without spending pool | Remove recurring restoration; no replacement heal | Unspent stored value must not be an unlimited HP source. |
| Damage-fed Threshold shield | 25%×min(recorded HP damage,10% H), boosted, no total cap | 10% actual HP lost; max0.5% Hentry per hit; repeatable budget | At actual loss10000,H=200000:2500 →1000 before boosts. |
| Shield Burst trigger | >12% H recorded damage in a reset-on-timeout 1s bucket; 0.5s cooldown | >12% Hentry actual HP+shield loss in rolling1s; 3s cooldown | Count real resource loss, not overkill or blocked payload. |
| Shield Burst new shield | 50% accumulated damage | 20% actual window loss, max3% Hentry; repeatable shield budget | Keep anti-burst response without refilling half every attack. |
| Shield Burst heal | 60% pre-burst shield; shield is not spent | Consume up to10% Hentry current shield, heal50% of shield consumed; repeatable heal budget | At shield60000,Hentry200000:36000 free heal → up to10000 heal costing20000 shield. |
| Copied Marchosias barrier | 8000 pool, 60% DR; regenerates full after break timer | 8000 pool, 60% DR; full replacement on existing timer | Keep separate visible pool and clock. |
| Copied Marchosias impact barrier repair | 5% impact damage, cap2000 per hit | 3% actual barrier loss; cap160 per rolling1s | 2% of the 8000 barrier per second. |
| Copied Marchosias body lifesteal | 10% impact damage, cap2000 per hit | 5% actual barrier loss; cap0.5% Hentry/s; repeatable heal budget | Lifesteal scales from actual intercepted damage and cannot duplicate it. |
| Copied Marchosias excess-heal shield | 50% excess | 25% excess, repeatable shield budget | One effectiveness/anti-heal application. |
| Copied Marchosias barrier-break heal | 40% H | 5% Hentry, repeatable heal budget | Breaking its 8000-point defense cannot return80000 body HP. |
| Copied Marchosias barrier-break shield | 15% H +15% lost HP | 5% Hentry, repeatable shield budget | Predictable recovery event. |
| Copied Thaelis HP milestones | Each new5% lost HP milestone: heal2.5% H and shield1% H, both boosted | Same one-time milestones: heal0.75% Hentry and shield0.5% Hentry; total milestone healing cap15% Hentry and shields10% Hentry | Bounded lifetime reward; retained across Unbroken Will. |
| Unbroken Will lethal-save heal | Full HP, once | 35% Hentry HP, once | A second phase, not a complete second full-health fight. |
| Unbroken Will shield / invulnerability | +20% H shield;4s invulnerability | +10% Hentry shield;4s invulnerability | Preserve transition readability and timing. |
| Unbroken Will temporary Max HP | +20% H and matching HP for6s | +10% Hentry and matching HP for6s, removed on expiry | Keep temporary empowerment without changing sustain reference. |
| External Raphael, Demon Gift, Envy healing to Goliath | Separate paths, inconsistent bonuses | Shared effectiveness/anti-heal and repeatable budgets | Multiple supports cannot bypass the boss's recovery budget. |

For Hentry=200000, proposed repeatable healing is at most24000 per10s, repeatable shield generation at most30000 per10s, and ordinary shields at most60000 at a time, after all boosts. This excludes the explicitly limited one-time revive/milestone events and separate arc barrier. The old Unified Front alone generates120000 shield each second at N=12. This is a large intended reduction, not a claim of neutral balance.

**Uncertain and mandatory encounter check:** No baseline combat traces establish typical True Form HP, gem combinations, time spent casting, incoming true-damage share, or completion time. Target a median True Form duration of35 to60s for an appropriately equipped wave-5/10 run, with the existing Waning Might as the long-fight relief. That duration is a proposed playtest target. Test every 3-gem combination of the seven supported gems (35 combinations), especially Thaelis/Marchosias/Raphael and Veilshroud/Egregor/Leviathan. Do not claim the target has been achieved from the recovery budget alone.

## Part 5: all Zodiac Sigils and Great Sage

The following values are the **final rebalance** after the neutral conversions in Part 1. Where a Sigil modifies F, D, D spaceships, DNT, or BTM, leave that branch and its numbers unchanged. Changes to global Sigil multipliers apply only to in-scope source descriptors. This requires explicit source provenance, including F-generated boomerangs or arcs; relying on their shape or `isSpirit` flag is insufficient.

Proc rules: a secondary Sigil event must not generate another secondary Sigil event. Eligible primary player, Spirit, and Sentinel hits can still trigger their specified Sigil. Preserve explicit exclusions such as Yuusha not feeding Aries, and Sentinels not feeding Shadow Twin. Retain hit counters by logical attack event rather than re-counting a split damage packet, reflected damage, or a stored-damage detonation. These are explicit balance fixes, not part of the parity release.

| Sigil / effect | Current runtime or documented discrepancy | Final proposed value | Rationale |
|---|---|---|---|
| Aries Gate of Babylon | 14 blades, each50+4% T true;1.5s CD | 14 blades, each0.50A+3% T true;1.5s CD | Flat baseline retained; lower fan percentage budget. At A=100,T=10000:450 →350 per blade. |
| Aries Enuma Elish | min(15% T,16000) true;30 hits;runtime1s CD | min(12% T,120A) true;30 hits;1s CD | ATK ceiling grows12000 →15600; target HP remains the attack identity. At T=10000:1500 →1200. |
| Taurus Yuusha formation | HP300/200/200/200;5s respawn;1.5× piercing redirect;2 Sentinels replenished on empty,2s gate | Keep all listed numbers | Formation is utility, not a new HP scaling system. |
| Taurus Tank offense | 40+0.04P true, not4% enemy Max HP | 0.40A+0.04P true | At A=100,P=100:44 →44. Correct tooltip, not a hidden tenfold buff. |
| Taurus Marksman | 75+0.05P every0.3s, not5% enemy Max HP | 0.75A+0.05P every0.3s | At A=100,P=100:80 →80. |
| Taurus Mage | 50+0.04P per500ms per3s zone | 0.50A+0.04P, same timing | At A=100,P=100:54 →54. Preserve every fourth cast's3.5s Soul Reaver. |
| Taurus Support / Tank healing | 50 to2 recipients /20 self | min(.50A,.20T) / min(.20A,.08T) | Same formulas as Part 3; never heals player lives. |
| Cancer Lunar Aegis | Gaia without Glory;barrier×1.40;evade20%;execute≤8% HP | Keep activation;barrier×1.30;evade15%;execute≤8% | Reduce combined avoidance and sustain; preserve execution immunity exclusions. |
| Cancer Tidal Flow regen | 3% T/s×1.30 | 2.5% T/s×1.20 | 3.9% →3% T/s total for its own regen. Healing-effectiveness bonus applied once. |
| Cancer Tidal Iron Body / replenish | One layer,8s after consumption;2 Sentinels on empty with2s gate | Unchanged | One-hit protection is independent of ATK. |
| Cancer Riptide meter | 4000;overflow30%;passive50/60/75 per s at1/2/3+ Sentinels | Unchanged values; feed actual absorbed damage only | Fix barrier overcount before lowering meter requirements. |
| Cancer Riptide DoT | 50+0.25% T true per100ms | .50A+0.25% T true per100ms | At A=100,T=10000:75 →75. |
| Cancer Riptide bite | 650+25% T true per whirlpool, up to10 | 6.50A+18% T true;one bite per victim per activation | At A=100,T=10000:3150 →2450. No ten-overlapping-whirlpool boss burst. |
| Cancer overlapping whirlpool ticks | Each overlapping whirlpool can tick | At most one Riptide tick per victim per100ms per activation | Keep10 spawn sites and crowd coverage; no accidental single-target multiplier. |
| Gemini Shadow Twin | Small75+3% T;large180+8% T;3 volleys of3;10-hit trigger | Small.75A+2.5% T;large1.80A+6% T;same volleys and trigger | At T=10000,A=100:375 →325,980 →780. |
| Gemini Twin vulnerability | 2 stacks per orb hit | 1 stack per orb hit | Nine orbs already reach cap quickly; Soul Reaver retained. |
| Gemini Overload mirrors | Main×1.30,2 mirrors each75% of buffed main | Main×1.20,2 mirrors each60% of buffed main | One main beam plus both mirrors: 3.25× → 2.64×; clone beam overlap is additional. Preserve movement and 125% mirror speed. |
| Gemini proc column | 350+18% T every125ms for3s;4s CD;5% chance,+0.3 point/miss | 3.50A+8% T every125ms for3s;6s CD;same chance/pity | At A=100,T=10000:2150 →1150 per tick. Reduces boss melting while retaining rare burst. |
| Leo Lion's Roar Burn | (200+5% T)×up to3 stacks per500ms;3s;ignores50% DR | (2A+3% T)×up to3 stacks per500ms;same duration and DR bypass | At A=100,T=10000:700 →500 per stack. |
| Leo direct lost-HP bonus | 2% L on eligible hits | 1% L on eligible primary hits | High fire rate otherwise makes execute-like damage dominant. |
| Leo Divine Fate | 5s freeze and ×2 damage at wave start | Same5s freeze;×1.60 in-scope damage | Preserve crowd-control identity, reduce burst stacking. Protected damage branches retain current value. |
| Virgo Forest Guardian critical | Every6th auto volley:normal hit +3× payload true | Every6th:normal hit +2× payload true | Nominal4× →3× payload; keep1s root/silence and two Vulnerability applications. |
| Virgo wooden fist | 1000+10% T+15% L;4s while5+ enemies | 10A+8% T+10% L;same gate | At A=100,T=10000,L=5000:2750 →2300. |
| Virgo Tesla boost | +50% to link ticks and destroyed-Coil burst; aura call does not apply it | +30% to link,aura,and all in-scope Coil bursts | Correct inconsistent coverage; explicitly buff previously unboosted aura to1.30×. |
| Virgo debuffed-target amplification | +50% all-source damage | +25% in-scope damage | Highly available debuffs made this nearly permanent. |
| Virgo Coil destruction charge | Runtime +10 G points;tooltip claims CD reduction and rate bonus | +10 G points, unchanged | Display real mechanic; no invented G cooldown reduction. |
| Libra Blood Arrow traversal | Large300;small180 | Large3A;small1.80A | Exact base parity. |
| Libra large explosion | (400+20% T)×(1+DR bonus)×repeat | (4A+16% T)×(1+DR bonus)×repeat | At DR0,A100,T10000:2400 →2000. |
| Libra small explosion | (180+12% T)×(1+DR bonus)×repeat +5% L×repeat | (1.80A+9% T)×(1+DR bonus)×repeat +3% L×repeat | At DR0,A100,T10000,L5000:1630 →1230. |
| Libra DR bonus | 2% per1 percentage point estimated DR, cap120% | 1% per1 percentage point actual applicable DR, cap60% | Still counters tanks after DR is retuned; no stale duplicate estimate. |
| Libra repeat multiplier | ×0.70 for subsequent arrow hits in same volley | ×0.70 | Preserve spread incentive. |
| Libra Skill A cooldown / stacking | −2s;bank stacks;1 large+4 small arrows per stack | Unchanged | Cadence and stored-cast identity preserved. |
| Libra Astral Pierce | +20% payload on onward impacts;size+30% | Same coefficients in Part 1;size+30% | Keep piercing identity. Do not assume initial primary orb already gains20%; current code distinguishes the paths. |
| Scorpio Resurrection | +5 lives on pick;1 life/250000 points instead of500000 | +4 lives;1 life/300000 points | Slightly less life supply after enemy damage outliers are reduced. |
| Scorpio Death Mark | +0 to70% as HP100 to21%;+80% at≤20%;execute≤5%,excluding Goliath | +0 to40% over same range;+50% at≤20%;same execute/exclusions | Keep finisher identity with less global damage stacking. |
| Scorpio F Iron Body interaction | F arc can bypass Iron Body | Unchanged | Explicit protected Skill F interaction. |
| Sagittarius Spirit Twin Blades | 2 arcs each×1.60,+25% chance of third | 2 arcs each×1.20,+25% third;15ms stagger unchanged | Expected3.60× →2.70× baseline arc count×payload. |
| Sagittarius spinner blade pairs | 2 per direction each×1.60 | 2 per direction each×1.20 | 3.20× →2.40× baseline mini-arc budget. |
| Sagittarius auto arc proc | 15% per volley;300+7% T+5.5% L | 15%;3A+5% T+5.5% L | Flat preserved, percent reduced. |
| Sagittarius ordinary Photo extra boomerangs | Two independent40% rolls,each adds2 to base2 | Two independent30% rolls,each adds2 | Expected3.6 →3.2 boomerangs per trigger. No F-sourced change. |
| Sagittarius spinner ricochet | +15% per bounce,max45%,reset on hit | Unchanged | Rewards spatial behavior rather than passive scaling. |
| Sagittarius Arctic Chill | 75% slow/pull chance;30% slow,2s;Spirit/Photo fire rate+30% | Keep chance/control;ordinary fire rate+20% | Less multiplication with Capricorn; no DNT/BTM scheduling changes. |
| Sagittarius F replacement | F casts its existing2 boomerangs | Unchanged, including damage and modifiers | Explicit Skill F protection. |
| Capricorn Compound Interest energy | +0.8P per kill;every5P gives1.5% fire rate,cap40% | Energy and fire-rate values unchanged | PE also fuels protected transformation/BTM; leave lifecycle intact. |
| Capricorn true rider | Flat200 per eligible hit while Photo alive,excludes Goliath,no cooldown | 1.50A,100ms shared per-target gate,primary hits only,same Goliath exclusion | Maximum1500 raw/s per target at A100; no recursive procs or double outgoing multiplier. |
| Capricorn Avalanche | +0.5% per kill,cap70%,resets6s without kill | +0.5% per kill,cap40%,same6s | Keep ramp, lower late-run multiplier pileup. |
| Aquarius Chain Lightning | 50% link tick proc at150px;G charge+35% | Same proc/range/charge | Scales naturally through .95A link payload. |
| Aquarius unpaired-orb damage stacks | +15% each,max6,5s | +8% each,max6,5s | Maximum+90% →+48%. Extra A orb conversion unchanged. |
| Aquarius Magnetic Field | 3.5% T/s within300px;slow30% | Same rate/range/slow;100ms ticks of0.35% T | Fix frame-rate dependence, don't add a flat ATK term to a percentage identity. |
| Pisces Dream Realm protection | 3s immunity on Shift | 2.5s,shared6s minimum retrigger interval | Prevent repeated short Shift activations from sustaining near-continuous invulnerability. Shift's own protection is unchanged. |
| Pisces marked explosion | 60% pre-shield accumulator +35% L at1.65s,then outgoing buffs can apply again | min(50% actual marked HP+shield loss +15% L,25% T);true;no repeat outgoing buffs | Damage storage already scales with ATK; prevent amplified damage recycling. |
| Pisces Cycle kill CD reductions | Apostle1s;abnormal/elite1.5s;dominator2s;Egregor3s | In-scope skills:0.75s /1s /1.5s /2s;max2s reduction per skill per real second | Smooth rapid-kill resets while retaining utility. D/F reductions unchanged. |
| Pisces movement CD reduction | .5s per actual screen width moved | .5s,inside the same2s/s budget for in-scope skills | Movement incentive retained. D/F unchanged. |
| Pisces G / Photo energy charge | +50% | G+35%;Photo+50% unchanged | Avoid altering protected Photo ultimate availability. |
| Pisces instant charge behavior | D,F,Overload instantaneous | Unchanged | Protected D/F; Overload utility retained. |
| Great Sage Ransacked Treasury sweep/gems | F recast, widening up to4.5×,3 distinct gems | Unchanged | All F activation and sweep behavior protected. |
| Great Sage Raphael stolen attack | 220+12% T | 2.20A+10% T | At A100,T10000:1420 →1220. |
| Great Sage Marchosias stolen attack | 260+13% T | 2.60A+11% T | 1560 →1360. |
| Great Sage Veilshroud stolen attack | 320+17% T true | 3.20A+14% T true | 2020 →1720. |
| Great Sage Egregor stolen attack | 260+14% T | 2.60A+12% T | 1660 →1460. |
| Great Sage Dargruel stolen attack | 190+11% T | 1.90A+9% T | 1290 →1090. |
| Great Sage Leviathan stolen attack | 200+11% T | 2A+9% T | 1300 →1100. |
| Great Sage Goliath dormant copy | 420+22% T true | 4.20A+18% T true | 2620 →2220; normal gem acquisition still does not grant it. |
| Great Sage Thaelis protection | Player1 Iron Body layer;summons50% evade for3s×combo | Player1 layer;summons40% evade for3s×combo | Keep borrowed defense, reduce stacked avoidance. |
| Great Sage 72 Transformations | ×1.50 stolen attack power with3 gems | ×1.50 | Scarce conditional payoff retained; only copied payloads above change. |

Than's copied attacks are treated as separate Sigil payloads riding an unchanged F recast. If AanSensei intends the entire gem activation payload to be included in the F exclusion, freeze those eight copy rows too. This is the remaining scope ambiguity; no game code has been changed.

## Implementation boundaries and verification

Do not use a blind search-and-replace of every `damage` value. `fireChargedBullet.damage` stores a charge multiplier, enemy projectile HP is durability, Alpha HP is a placeholder, and the game has direct HP deductions that bypass the main resolver.

Suggested concrete shape: `player.atk`, `enemy.atk`, and a damage descriptor carrying `faction`, `owner`, `attackId`, `atkCoefficient`, `targetMaxHpPct`, `targetLostHpPct`, `ownMaxHpCoefficient`, `enrage`, `damageType`, and snapshot values. Only include fields needed by that attack; no general scripting engine. A small explicit protected-source discriminator must preserve old payloads and old shared-buff behavior for F/D/spaceships/DNT/BTM. Source lineage must survive copied arcs and boomerangs.

The Pisces mark resolver is physically inside `skills/skill-d.js:238`, though Shift also creates the marks. In an implementation, separate the **Shift/Pisces-owned mark behavior** from D-owned marks without changing D's current behavior. Similarly, shared ally loops in `main.js:2148` currently include D spaceships. File location alone is not a safe scope boundary.

Verification gates:

1. At A=100 and unchanged legacy multipliers, compare every Part 1 payload against the original at T=100,10000,200000 and L=0,.5T,.9T. Include ordinary, piercing, true, barrier, crit, and direct-HP paths. Assert identical conversion results, including original rounding.
2. Test actor provenance: no friendly offensive multiplier on hostile payloads in the balance release; no double outgoing multiplier on reflected/stored damage; no unknown owner fallback to target HP. Assert finite, nonnegative payloads, including Meteor and expired owners.
3. Test shield conservation: HP loss plus shield/barrier loss cannot exceed accepted damage; tiny barriers do not erase excess damage; healing and lifesteal use actual loss with overkill excluded. Test true damage with and without Vanguard and Yuusha.
4. Test protection of F/D/spaceships/DNT/BTM with frozen fixtures covering Glory, Parry, every relevant Sigil, Goliath interception, shield/invulnerability, cooldown reduction, and direct HP bypass. Never route protected attacks into the new Sigil proc rules implicitly.
5. Test temporal boundaries: wave reset, pause, owner death, Goliath transform, simultaneous cast endings, Unbroken Will expiry, debuff refresh, and 30/60/120fps DoT totals. Use simulation time rather than wall time for combat snapshots and budgets.
6. Run the paired encounter matrix from Part 2 and the35 Goliath gem combinations. Report actual results before claiming the rebalance is fair. A later implementation should retain the legacy configuration until the parity fixtures and paired traces pass.

### Confidence and unresolved items

**High confidence:** the listed constants, source distinctions, +60 impact bonus, Yuusha's Primeval Energy basis, Glory inconsistency, numeric Meteor defect, and unbounded Goliath shield/recovery paths are directly visible in source.

**Medium confidence:** T=300 is a useful calibration anchor; bounded ATK growth, armor limits, and capped recovery are coherent first-pass designs. Exact coefficients remain playtest proposals.

**Low confidence until measured:** total wave threat, the right endgame ATK cap, fair Goliath duration, minion bullet exposure, and the net interaction of lower damage amplification with much lower defense. This proposal deliberately does not claim those are validated.

**Scope clarification still useful:** whether Great Sage's stolen payloads count as excluded F behavior; whether ordinary Spirit finale's Goliath Warding Palm exception should eventually become ATK-based; and whether the user-facing Glory×1.55 is the desired final value despite the current core×1.70. The tables choose separate Sigil payloads, retain the finale exception, and use final×1.55 respectively, with no silent implementation.

The advisor-executor MCP requested by the workspace instructions was unavailable. No advisor model selection, attempt count, or Opus review result exists for this proposal. The analysis is local source inspection and formula design only.
