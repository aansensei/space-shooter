# Combat scaling changelog (implementation log)

Tracks every actual code change made while implementing `docs/combat-scaling-rebalance.md` on the `combat-scaling` branch. This is a running log kept during implementation - **not yet reflected in `guide.html` or `README.md`**. Once the user has tested and approved a release (Conversion, then Rebalance), the relevant section below becomes the source for updating those docs.

Status: **Part 1 (Conversion) complete and spot-verified.** Nothing in Parts 2-5 has been touched yet.

Verified live at `player.atk = 100` (spec's Verification Gate #1): auto-fire bullet damage = 130 (exact), Sentinel normal bullet = 30 (exact), Sentinel special bullet = 50 (exact), Vulnerability-window-end damage = 560 = 500 (converted `5*atk`) + 60 (converted `0.60*atk` impact bonus, which already applied to this hit before conversion too - not a new interaction). All match their pre-conversion originals. This is a spot-check of the highest-traffic paths, not an exhaustive per-row automated test - that would be the next investment if full certainty is wanted before Part 2.

## Part 1: player ATK conversion

Added `player.atk` (js/config.js), pinned at `100` for this conversion pass (no wave growth yet - that's a Part 2+ concern). Every row below is a pure formula substitution: at `player.atk = 100`, every converted line produces the exact same number as before. No gameplay-visible change is expected from Part 1 alone.

| Attack / component | File : line (pre-edit) | Old | New |
|---|---|---|---|
| Eligible impact bonus | entities/core.js:861 | `totalDamage += 60` | `totalDamage += 0.60 * player.atk` |
| Auto-fire, each of 5 bullets | entities/core.js:269 | `damage: 130` | `damage: 1.30 * player.atk` |
| Vulnerability window end | entities/core.js:77 | `damage: 500` | `damage: 5 * player.atk` |
| Sagittarius auto proc arc | entities/core.js:286 | `damage: 300` | `damage: 3 * player.atk` |
| Capricorn bonus direct true hit | entities/core.js:1684 (direct HP subtract, not dealDamage) | `enemy.hp -= 200` | `enemy.hp -= 2 * player.atk` |
| Sentinel special bullet | entities/sentinel.js:147 | `damage: 50 * damageMultiplier * _bDmg` | `damage: 0.50 * player.atk * damageMultiplier * _bDmg` |
| Sentinel normal bullet | entities/sentinel.js:157 | `damage: 30 * damageMultiplier * _bDmg2` | `damage: 0.30 * player.atk * damageMultiplier * _bDmg2` |
| Sentinel death bullet, each of 10 | entities/sentinel.js:63 | `damage: 2` | `damage: 0.02 * player.atk` |
| Overload tick + clone beams (shared `_laserDmg`) | main.js:786 | `_laserDmg = 350 * (_mlBuffed ? 1.30 : 1)` | `_laserDmg = 3.50 * player.atk * (_mlBuffed ? 1.30 : 1)` |
| Gemini mirrored Overload | main.js:818 (derived from `_laserDmg`, no separate edit) | `_mlMirrorDmg = _laserDmg * 0.75` | unchanged expression, inherits conversion |
| G, Coil aura | main.js:1060 | `damage: 130` | `damage: 1.30 * player.atk` |
| Leo Burn per stack | main.js:2971 | `200 + 0.05 * maxHp` | `2 * player.atk + 0.05 * maxHp` |
| Charged bullet | main.js:2064 | `damage: 0` | unchanged (already 0, no ATK term) |
| A, primary orb impact | skills/skill-a.js:229 | `damage: 200` | `damage: 2 * player.atk` |
| A, primary follow-up true hit | skills/skill-a.js:231 | `damage: 100 + ...` | `damage: player.atk + ...` |
| A, Astral Pierce subsequent impact | skills/skill-a.js:189 | `damage: 240` | `damage: 2.40 * player.atk` |
| A, Astral Pierce subsequent true hit | skills/skill-a.js:191 | `damage: 120 + ...` | `damage: 1.20 * player.atk + ...` |
| A, scattered projectile, each (×2 call sites) | skills/skill-a.js:192,235 | `damage: 8` | `damage: 0.08 * player.atk` |
| A, Dimensional Rift DoT + chain payload | skills/skill-a.js:376-377 | `dotDmg` / `damage: 60` | both use `0.60 * player.atk`; chain payload (`dotDmg * 0.50`) inherits automatically |
| Soul Reaver DoT | skills/misc-mechanics.js:76 | `damage: 60` | `damage: 0.60 * player.atk` |
| Normal Spirit bullet | skills/skill-s-spirit.js:101 | `damage: 120` | `damage: 1.20 * player.atk` |
| Normal Spirit arc | skills/skill-s-spirit.js:144 | `damage: 180` | `damage: 1.80 * player.atk` |
| Twin Blades Spirit arc | skills/skill-s-spirit.js:120 | `baseDmg = 180 * 1.60` | `baseDmg = 1.80 * player.atk * 1.60` |
| Arc lost-HP component (shared) | skills/skill-s-spirit.js:726 | `arc.damage + ...` | unchanged, inherits from `arc.damage` |
| Spinner mini arc / Twin Blades variant | skills/skill-s-spirit.js:811 | `_bladeDmg = _twinBlades ? 350*1.60 : 350` | `_bladeDmg = _twinBlades ? 3.50*player.atk*1.60 : 3.50*player.atk` |
| Finale spinner body | skills/skill-s-spirit.js:945 | `Math.round(200 * ...)` | `Math.round(2 * player.atk * ...)` |
| Normal Spirit finale tick | skills/skill-s-spirit.js:1080 | `damage: 10` | `damage: 0.10 * player.atk` |
| Phōtokrystos homing bullet | skills/skill-s-spirit.js:420 | `damage: 125 * dmgMult * dntMult` | `damage: 1.25 * player.atk * dmgMult * dntMult` |
| Phōtokrystos boomerang | skills/skill-s-spirit.js:489 | `damage: 500` | `damage: 5 * player.atk` |
| Boomerang lost-HP + local Glory (line 581) | skills/skill-s-spirit.js:581 | as-is | **unchanged** - inherits `b.damage`; the local ×1.55 double-Glory issue is a Part 3 fix, not touched here |
| BTM full-screen wave | skills/skill-s-spirit.js:354 | `_damage: 10, _percentDamage: 0.99` | **unchanged - protected (Back to Motherland)** |
| G, link DoT | skills/skill-g.js:238 | `damage: 95 * _teslaDmgMult` | `damage: 0.95 * player.atk * _teslaDmgMult` |
| G, Aquarius link chain | skills/skill-g.js:248 | `damage: 95 * _teslaDmgMult` | `damage: 0.95 * player.atk * _teslaDmgMult` |
| G, orb collision burst | skills/skill-g.js:160 | `damage: 10` | `damage: 0.10 * player.atk` |
| G, orb expiry burst | skills/skill-g.js:188 | `damage: 10` | `damage: 0.10 * player.atk` |
| G, expiry burst at endSkillG | skills/skill-g.js:27 | `damage: 20` | `damage: 0.20 * player.atk` |
| G, destroyed Coil burst | skills/skill-g.js:301 | `damage: 20 * _coilDmgMult` | `damage: 0.20 * player.atk * _coilDmgMult` |
| Yuusha Tank blade | yuusha-party.js:1076 | `dmg = 40 + ep*0.04` | `dmg = 0.40*player.atk + ep*0.04` |
| Yuusha Marksman arrow | yuusha-party.js:1110 | `dmg = 75 + ep*0.05` | `dmg = 0.75*player.atk + ep*0.05` |
| Yuusha Mage zone tick | yuusha-party.js:1149 | `dmg = 50 + ep*0.04` | `dmg = 0.50*player.atk + ep*0.04` |
| Aries Gate of Babylon blade | skills/sigil-aries.js:30,76 | `const GOB_SWORD_DMG_BASE = 50` (top-level const) | removed; inlined as `0.50 * player.atk` at the single usage site |
| Gemini small orb | skills/sigil-gemini.js:85 | `damage: 75` | `damage: 0.75 * player.atk` |
| Gemini large orb | skills/sigil-gemini.js:83 | `damage: 180` | `damage: 1.80 * player.atk` |
| Gemini proc laser (×2 call sites) | skills/sigil-gemini.js:133,138 | `damage: 350` | `damage: 3.50 * player.atk` |
| Cancer whirlpool DoT | skills/sigil-cancer.js:157 | `const TIDAL_SURGE_DOT_DAMAGE = 50` (top-level const) | removed; inlined as `0.50 * player.atk` |
| Cancer whirlpool bite | skills/sigil-cancer.js:204 | `const TIDAL_SURGE_DAMAGE = 650` (top-level const) | removed; inlined as `6.50 * player.atk` |
| Virgo fist | skills/sigil-virgo.js:34 | `damage: 1000 + missingHpBonus` | `damage: 10 * player.atk + missingHpBonus` |
| Libra large/small arrow traversal | skills/sigil-libra.js:506 | `damage: 300 * dmgMult * repeatMult` | `damage: 3 * player.atk * dmgMult * repeatMult` |
| Libra large/small explosion | skills/sigil-libra.js:457 | `explodeBase = arrow.isPrimary ? 400 : 180` | `explodeBase = arrow.isPrimary ? 4*player.atk : 1.80*player.atk` |
| Great Sage Raphael (Lumen Nova) | skills/sigil-great-sage.js:198 | `damage: 220 * fx.comboMult` | `damage: 2.20 * player.atk * fx.comboMult` |
| Great Sage Marchosias (Arc Barrier) | skills/sigil-great-sage.js:217 | `damage: 260 * fx.comboMult` | `damage: 2.60 * player.atk * fx.comboMult` |
| Great Sage Veilshroud (Phantom Strike) | skills/sigil-great-sage.js:229 | `damage: 320 * fx.comboMult` | `damage: 3.20 * player.atk * fx.comboMult` |
| Great Sage Egregor (Null Slash) | skills/sigil-great-sage.js:266 | `damage: 260 * fx.comboMult` | `damage: 2.60 * player.atk * fx.comboMult` |
| Great Sage Dargruel (Root Shockwave) | skills/sigil-great-sage.js:287 | `damage: 190 * fx.comboMult` | `damage: 1.90 * player.atk * fx.comboMult` |
| Great Sage Leviathan (Perseverance Sweep) | skills/sigil-great-sage.js:304 | `damage: 200 * fx.comboMult` | `damage: 2 * player.atk * fx.comboMult` |
| Great Sage Goliath dormant copy | skills/sigil-great-sage.js:322 | `damage: 420 * fx.comboMult` | `damage: 4.20 * player.atk * fx.comboMult` |

### Derived/percentage-only paths (spec's second Part 1 table)

Checked against source, no edits needed for any of these - all either already scale from an already-converted field, or are explicitly unchanged per the spec:

- **Virgo Forest Guardian critical** (every 6th auto volley, `entities/core.js:2082`): `damage: b.damage * 3` - already derives from the converted auto-fire bullet's `damage` field, no separate edit needed.
- Glory chain, Enuma Elish, Aquarius field, Pisces marked detonation, Shift, Spinner repeated-contact discount, Spinner ricochet bonus, Photokrystos post-DNT penalty (`dntMult`, already threaded through the converted homing-bullet formula), Spirit finale vs Goliath override - all explicitly "unchanged" per the spec's own table, confirmed against source.

## Part 2-5 (enemy scaling, DR/healing, Goliath, Sigils)

Not started.

## Notes from the user during implementation

- Goliath (Part 4) needs a check for a possible "keeps healing even while being actively attacked" bug, and the opposite (instant-death on spawn). Target: at wave 5, sustained attack should kill Goliath in roughly **1 minute**, not longer, not near-instant.
- Once Goliath's HP-drain pacing is set, revisit Great Spirit (Phōtokrystos)'s scaling against it.
