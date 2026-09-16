# Combat scaling changelog (implementation log)

Tracks every actual code change made while implementing `docs/combat-scaling-rebalance.md` on the `combat-scaling` branch. This is a running log kept during implementation - **not yet reflected in `guide.html` or `README.md`**. Once the user has tested and approved a release (Conversion, then Rebalance), the relevant section below becomes the source for updating those docs.

**If a different session/model is picking this up:** follow `docs/combat-scaling-rebalance.md` exactly for every formula/number - it is the source of truth, not this log. Follow the repo's own `CLAUDE.md` conventions throughout (author `An Nguyen <nguyencaothienan937@gmail.com>` on every commit, no decorative `// ===`-style comment dividers, no em dashes anywhere including comments/commit messages, comments describe current behavior not edit history, `node -c` every touched file before committing, work stays on the `combat-scaling` branch - never push to `main` without being asked). Update the checklist below as you go so progress stays visible across handoffs.

**Commit frequently, in small units, not just once at the end.** Commit after each logically complete chunk (one enemy's full conversion, one Part 4 mechanic, etc.) instead of batching the whole session into a single commit - this keeps the branch bisectable and makes it much easier to debug a regression back to the exact change that caused it. Every commit stays local to `combat-scaling` (never pushed without being asked), so there is no cost to committing often.

## Task checklist

- [x] Part 1: player ATK conversion - complete, spot-verified live, committed (`ef3c7bf`)
- [ ] Part 2: enemy scaling diversity
  - [x] Enemy ATK stat/table + snapshot-at-launch plumbing (`_ENEMY_ATK_TABLE`, `_enemySnapshotAtk`, `_enemyHs`, `_enemyEnrageMult` in config.js; `player.atk` now grows via `_atkWaveMult` at wave start)
  - [x] Apostle bullet + echo-spawned Apostle bullet (both route through the same fixed code, decoupled `damage` from bullet-interception `hp`)
  - [x] Thaelis large projectile (enrage category) + small split projectile (ATK 0.25E, inherits owner via `ownerRef`)
  - [x] Uriel Holy Sword (snapshotted `atk` on the sword object at launch)
  - [x] Raphael Lumen Nova (laser object snapshots `atk` at telegraph time) + Wisdom Orb + Wisdom zone (own-Max-HP category, zone inherits 20% of the orb's own atk per the spec's stated per-second rate)
  - [x] Marchosias (normal bullet ATK 1E, counter sword falloff 1.62E/1.38E/1.26E across all 3 blade-creation sites incl. death-queued swords, minion bullet ATK 1E)
  - [x] Veilshroud (Phantom Strike incl. delayed post-death strike via a snapshotted `atk` on the pending-strike record, normal volley own-Max-HP 0.012Hs, Echo field own-Max-HP 0.006Hs using the echo's snapshotted origin maxHp/h0 rather than its placeholder 9999)
  - [x] Dargruel (basic bullet was already ATK-scaled from an earlier pass; normal/dark chain now ATK 1.80E/2.40E true via `ownerRef.atk`, death chain volley shares the same formula through the same collision code, Maou Haki shockwave own-Max-HP 0.0095Hs, `spawnBossShockwave` now takes an explicit `dmg` computed by the caller so its shared collision code also serves Goliath's Joker copy at 0.00057Hs x fracture/waning)
  - [x] Egregor (Psychic Tempest normal+forced own-Max-HP 0.015Hs, Null Slash 1/2/3+ victims now 1.50E/1.75E/2E x enrage instead of a flat rage multiplier off T, movement/cadence rage stacks left untouched; Boon/Bane backlash confirmed already correct, no change needed)
  - [x] Leviathan (basic bullet own-Max-HP 0.02Hs, also fixed a pre-existing missing `damage` field that made this bullet deal NaN; Perseverance sweep now ATK E x min(5/6, n/12) with the Vanguard route unified to true damage; Last Rites own-Max-HP Hs x min(0.01375, 0.000375n) read off the surviving `ownerRef`, also unified to true damage on both routes)
  - [x] Goliath (Absolute Verdict now lost-HP/enrage 1.50E x (0.80+0.40r); Corrupted Meteor fixed and converted to ATK 0.625E true; Unbroken Will wave own-Max-HP 0.00060Hs true; all 5 Joker copies converted: Veilshroud ATK 0.625E, Raphael own-Max-HP 0.00060Hs, Marchosias sword falloff 0.675E/0.575E/0.525E snapshotted at launch, Egregor Null Slash 0.75E/0.875E/1E with no extra enrage, Leviathan sweep ATK 1.25E, all still wrapped in the existing `_goliathDmgBoost` fracture/waning multiplier; Dargruel wave copy done earlier via `spawnBossShockwave`'s new `dmg` param)
  - [x] Fixed Goliath Corrupted Meteor NaN bug (missing `damage` field, main.js dealDamage call for the sentinel-splash hit)
  - [x] Zero-damage/life-based paths audit (table in spec's Part 2): every row confirmed already correct except Yuusha piercing redirect (`js/yuusha-party.js:907 _yuushaPierceRedirect`), which recomputed a victim-based `member.maxHp * pct` for each squad member instead of feeding the same snapshotted attacker-derived payload real Sentinels take. Fixed every call site (Raphael Lumen Nova, Goliath Verdict orb/Meteor/Joker sword/Joker Veilshroud/Joker Raphael/Joker Leviathan, Egregor Tempest x2, Leviathan Perseverance/Last Rites, Marchosias blade) to pass the actual computed damage number with `'flat'` mode instead of a raw percentage
  - [x] User's ask (check Goliath heal/instant-death bugs): no instant-death bug found - True Form gets an absolute 4s Iron Body (`_transformIronBodyEnd`) the instant it becomes targetable. The "keeps healing despite being attacked" symptom is real and source-confirmed, not a hunch: `Inevitable` regen ran unconditionally at 2.5% current Max HP/s with no gate on recent damage, `Threshold Ward`'s shield pool restored HP to the matching % threshold every single frame the pool stayed covered with no cap on the pool itself, and `Unified Front`'s shield-per-ally-per-second had no capacity limit at all (120000/s at N=12 before this pass). This is exactly Part 4's GOLIATH-SUSTAIN-01 review item, so it was pulled forward and implemented now instead of left dangling - see Part 4 below.
  - [ ] Verify via simulation script (DPS/TTK at wave checkpoints, not full manual playtesting)
- [ ] Part 3: DR, healing, and resource rules
- [x] Part 4: dedicated Goliath sustain review (pulled forward from its normal order because it directly answers the user's Goliath-heal question above)
- [ ] Part 5: all Zodiac Sigils and Great Sage final tuning

Status: **Part 1 (Conversion) complete and spot-verified.** Part 2 substantially complete (only the simulation-script verification step remains). Part 4 implemented ahead of Part 3/5 order because the user specifically asked about Goliath's sustain during Part 2 work.

## Part 4: dedicated Goliath sustain review

Added `enemy._hentry` (True Form Max HP at the moment of transformation, before Unbroken Will's temporary bonus - every budget below is sized off this fixed value so a temporary HP bump can't recursively enlarge its own refill) and two shared rolling token-bucket budgets in `entities/goliath.js`: `_goliathDrawBudget(enemy, 'heal'|'shield', requested)` (0.12/0.15 x Hentry per rolling 10s respectively) plus a generic `_goliathDrawBucket()` primitive reused for two narrower per-mechanic rolling caps, and `_goliathGrantShield(enemy, amount)` (aggregate ordinary-shield cap of 0.30 x Hentry, separate from the arc barrier's own pool). One-time milestone/revive grants bypass the rolling budgets but still respect the aggregate shield cap, per spec.

| Mechanic | Old | New | File |
|---|---|---|---|
| Inevitable regen | 2.5% current Max HP/s, unconditional | 0.75% Hentry/s, drawn from heal budget | entities/goliath.js, true_form update loop |
| Cast-end recovery | 20% current Max HP, every cast, no cooldown | 3% Hentry, shared 4s cooldown, heal budget | entities/goliath.js, true_form update loop |
| Unified Front shield | 5% current Max HP x N every second, uncapped | 0.25% Hentry x min(N,8)/s (naturally caps at 2%/s), shield budget | entities/goliath.js, true_form update loop |
| Unified Front healing bonus | +5%/ally, cap 60% | +2%/ally, cap 20% | entities/goliath.js |
| Threshold Ward | 20% current Max HP into a pool each milestone; pool silently restored HP to the matching % every frame it stayed covered, no cap | One-time 10% Hentry ordinary shield per milestone; pool-restoration removed entirely | entities/goliath.js, true_form update loop |
| Copied Thaelis HP milestones | 2.5%/1% current Max HP heal/shield per 5%-lost milestone, no lifetime cap | 0.75%/0.5% Hentry, same one-time milestones, lifetime caps of 15%/10% Hentry respectively | entities/goliath.js |
| Damage-fed Threshold shield | 25% x min(recorded damage, 10% current Max HP), no total cap | 10% actual HP lost, capped 0.5% Hentry per hit, shield budget | entities/core.js dealDamage |
| Shield Burst trigger | >12% current Max HP of raw incoming damage in a reset-on-timeout 1s bucket, 0.5s cooldown | >12% Hentry of actual HP+shield loss (added a `_shieldDamageDealt` tracker alongside the existing `_hpDamageDealt`) in a rolling 1s bucket, 3s cooldown | entities/core.js dealDamage |
| Shield Burst shield | 50% of accumulated window damage, uncapped | 20% of actual window loss, capped 3% Hentry, shield budget | entities/core.js dealDamage |
| Shield Burst heal | 60% of pre-burst shield, shield not spent | Consumes up to 10% Hentry of current shield, heals 50% of what was consumed, heal budget | entities/core.js dealDamage |
| Copied Marchosias barrier repair | 5% impact damage, cap 2000/hit | 3% actual barrier loss, cap 160 per rolling 1s (own bucket on the Joker sub-state) | entities/goliath.js `_goliathMarchosiasBarrierRepair` |
| Copied Marchosias body lifesteal | 10% impact damage, cap 2000/hit | 5% actual barrier loss, rate-capped 0.5% Hentry/s, then heal budget | entities/goliath.js `_goliathMarchosiasBodyHeal` |
| Copied Marchosias excess-heal shield | 50% of overheal | 25% of overheal, shield budget | entities/goliath.js (both call sites) |
| Copied Marchosias barrier-break heal/shield | 40% current Max HP heal; 15% current Max HP + 15% lost HP shield | 5% Hentry heal (heal budget) and 5% Hentry shield (shield budget) | entities/goliath.js `_goliathMarchosiasBarrierBreak` |
| Unbroken Will lethal-save heal | Full heal to Max HP | 35% Hentry (a second phase, not a second full-health fight) | entities/goliath.js `_goliathTryUnbrokenWill` |
| Unbroken Will shield | +20% current Max HP | +10% Hentry, via `_goliathGrantShield` (respects aggregate cap) | Same |
| Unbroken Will temporary Max HP | +20% current Max HP for 6s | +10% Hentry for 6s, unchanged removal-on-expiry | entities/goliath.js true_form update loop |
| Recovery bonus sources (Thaelis/Fracture/Unbroken) | +35%/+15%/+40%, additive, no aggregate cap | +20%/+10%/+20%, additive sum capped at +50% before Waning Might | entities/goliath.js `_goliathHealBoost` |
| Alpha resource credit (heal/shield leaking into damagePull) | +100% of every grant, no cap | +25% of every grant, tracked separately, lifetime cap 60000 | entities/goliath.js `_goliathTrackResourceGain` |
| Extra gems at transform | 20% recipient Max HP shield to nearest ally | 15% recipient Max HP shield | entities/goliath.js |

**Not yet done / known gap:** "External Raphael, Demon Gift, Envy healing to Goliath" (spec row: these should share Goliath's effectiveness/anti-heal and repeatable budgets when they land on a Goliath ally) was not implemented - it only matters in the rare case Goliath coexists with a real Raphael/Dargruel/Leviathan in the same wave and receives their ally-heal effects, and tracing exactly where each of those three heals a non-self target would need its own pass. Flagged here rather than guessed at.

Alpha's own kill-based damage-pull formula (`ceil(0.75xdamage)x10`, cap 320000) and the True Form HP formula itself (`round((65000+pull)x(1+0.25xgemPoints)xWalpurgisx1.20)`) are unchanged per spec - only the resource-credit leak into `damagePull` was retuned.

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
