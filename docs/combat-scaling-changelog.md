# Combat scaling changelog (implementation log)

Tracks every actual code change made while implementing `docs/combat-scaling-rebalance.md` on the `combat-scaling` branch. This is a running log kept during implementation.

**guide.html/README.md status (mid-update, paused by request):** the English AND Vietnamese enemy cards (Apostle through Leviathan) plus the full Goliath True Form card (both languages) are done and committed (`07f9d39`, `63cd9e1`, plus the DR-cap/buff follow-ups). **Still pending:** the ZODIAC SIGIL SYSTEM card (13 sigils, both languages - every ability's ATK-coefficient number needs recomputing at the new `PLAYER_BASE_ATK = 115`, plus Part 5's percentage retunes layered on top), a new UPDATE LOG entry summarizing this whole rebalance, and `README.md` (807 lines, not started). Next session: pick up the Sigil section first (Aries through Great Sage, in guide.html's `ZODIAC SIGIL SYSTEM` card, EN ~line 910-2113, VI ~line 2159-2336) - read each sigil's actual current formula from `js/skills/sigil-*.js` rather than trusting guide.html's existing (stale) numbers.

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
  - [x] Verify via simulation script (DPS/TTK at wave checkpoints, not full manual playtesting) - built as a real debug-console feature, see below
- [x] Part 3: DR, healing, and resource rules
- [x] Part 4: dedicated Goliath sustain review (pulled forward from its normal order because it directly answers the user's Goliath-heal question above)
- [x] Part 5: all Zodiac Sigils and Great Sage final tuning

Status: **All 5 parts implemented.** What remains is the user's own human playtesting before this ships.

## Post-implementation hotfixes (found during the user's own testing)

- **Player base ATK 100 → 115**: a deliberate buff on top of the conversion/rebalance, requested after reviewing early autoplay results. `PLAYER_BASE_ATK` in `config.js`, both reset sites in `main.js` now read from it.
- **Goliath True Form died in well under 15s instead of the intended ~1 minute at wave 5**: root cause was that piercing/true damage/DoT hits against Goliath were completely unbounded (every other per-hit protection - the 1.5-3% normal-hit cap, the 8%-trigger burst window, the low-HP clutch armor - explicitly excludes them), so a true-damage-heavy loadout blew straight through the 60% base DR with nothing else standing in the way. Added a parallel per-hit cap for piercing/true/DoT (4% base, +0.3%/debuff stack, cap 6%) in `entities/core.js`, higher than the normal-hit cap so those sources stay meaningfully stronger without being unbounded. First-pass numbers, not independently verified against the 1-minute target yet - needs the user's own retest.
- **Goliath buffed further per AanSensei**: Inevitable base DR 60% -> 63% (slight, applies the whole fight), plus a NEW permanent +12% DR that kicks in once Unbroken Will has actually triggered (`enemy._unbrokenWillUsed`, `entities/core.js`) and lasts the rest of the fight - separate from Unbroken Will's existing temporary 6s reinforcement window, meant to make the second half of the encounter meaningfully harder than the first, not just briefly.
- **Known issue, not yet fixed**: AanSensei reports Goliath "occasionally loses/skips invulnerability" (lâu lâu lỗi mất bất tử) - intermittent, not yet reproduced or root-caused. Likely candidates to check first next session: the 4s absolute Iron Body window right after True Form transform (`enemy._transformIronBodyEnd`, `entities/core.js` ~line 572), Unbroken Will's 4s full-invuln window (`enemy._unbrokenWillInvulnEnd`), and Fracture Step's per-teleport Iron Body layer count (`enemy._fractureIronBodyHits`) - a timing/race condition around any of these (e.g. a frame where the end-timestamp check and the counter-decrement disagree) is the most likely shape of bug for something that only "sometimes" happens. Not investigated further this session, per AanSensei's request to pause here.

**DPS/TTK verification tool** (`js/debug-console.js`): added a "Run Verification" button (COMBAT VERIFY section of the debug panel, press `` ` `` to open it) that runs wave 1, 2, 5, 10, 15, 20 back to back through the real wave system (`_verifyResetWaveState`, the same logic `debugSpawnWaveComposition` uses, inlined so it doesn't depend on a panel input field), autoplay driving the ship the whole time at 4x game speed, no sigils equipped so the numbers reflect the raw Part 1/2 conversion rather than any one Sigil build. Per wave it reports clear time, lives lost, total damage dealt and received (from `window._matchStats`), and remaining enemy count/HP% if it timed out instead of clearing. Non-Goliath waves are capped at a 90s (in-game) safety budget; Goliath waves (multiples of 5) get 300s since they never force-end on their own. Full results land in `window.__combatVerifyReport` and as a `console.table`, not just the on-panel text.

`_setDebugAutoplay`'s per-tick decision logic (movement/dodging, skill usage) was pulled out into a standalone `_autoplayTick()` function (previously an inline arrow function passed straight to `setInterval`) so it can be driven on demand instead of only via the real 200ms interval - a pure extraction, no behavior change, but it's what made it possible to sanity-check the verification flow by stepping simulated time directly.

Actually running the full 6-wave sweep needs a real, visible browser tab (`requestAnimationFrame`, which the whole game loop runs on, does not fire while a tab is backgrounded/hidden, so an automated headless-style session can't drive it end to end). One clean data point was captured live before that limitation was hit: wave 1 with no sigils, autoplay only, cleared with 0 lives lost and 3 total incoming damage across the whole wave. Wave 2 (which has 38 normals + 6 abnormals + 4 elites per `WAVE_TEMPLATES`, not a trivial roster) was still in progress, 2 lives down, when the session was interrupted - not enough to call a verdict either way. The tool itself is finished and working; running the full milestone sweep (and judging whether the numbers it reports are actually balanced) is left to the user's own pass, since that verdict was explicitly never meant to be an automated pass/fail (the spec itself says "report actual results before claiming the rebalance is fair," not assert against invented thresholds).

## Part 5: all Zodiac Sigils and Great Sage

Retunes every Sigil's final numbers per the spec's Part 5 table (`docs/combat-scaling-rebalance.md` lines 424-490). Where a row's "current" value already matched the proposed value exactly (several Taurus/Aries/Gemini/Libra rows had already landed on their final coefficient during Part 1's ATK conversion), no code change was needed - confirmed by direct comparison rather than assumed.

**Aries**: Gate of Babylon's percent term 4%->3% (flat 0.50A already correct). Enuma Elish 15%T/16000-flat-cap -> 12%T/120A-cap (the cap itself is now ATK-scaling, not a frozen number).

**Gemini**: Shadow Twin large/small orb percent terms 8%/3% -> 6%/2.5%, Vulnerability stacks per orb hit 2->1. Overload Laser's Mirror buff x1.30 main / x0.75-of-that mirrors -> x1.20 main / x0.60-of-that mirrors (`main.js`, shared by the beam and its mirror-entity clones).

**Cancer**: Lunar Aegis barrier bonus x1.40->x1.30, its 20% evade rolls (3 sites in main.js plus the Yuusha-side one in yuusha-party.js) ->15%. Riptide bite percent 25%->18%, and both the bite and the DoT tick are now capped at one per victim per activation (added a shared `_activation` object across every whirlpool spawned in the same `_spawnTidalWhirlpool()` call, replacing each whirlpool's own independent `hitEnemies` tracking - up to 10 overlapping whirlpools could previously bite or tick the same clustered victim once each). Tidal Flow regen done earlier in Part 3.

**Virgo**: Forest Guardian's wooden-fist percent/lost-HP terms 10%/15% -> 8%/10%. Its 6th-volley crit bonus reduced from +3x to +2x payload (main.js). Circuit Engineer's Tesla boost unified to +30% (was +50%) across link ticks, the destroyed-Coil burst, AND the proximity aura tick - the aura tick previously got no boost at all despite the tooltip claiming universal coverage (a real missing-route bug, fixed in `main.js`). Its debuffed-target damage amplification 50%->25%.

**Libra**: large/small explosion percent terms 20%/12% -> 16%/9%, small arrow's lost-HP bonus 5%->3%, DR-bonus rate 2%/point (cap 120%) -> 1%/point (cap 60%). Blood Arrow traversal damage was already at its final parity value, confirmed unchanged.

**Scorpio**: Resurrection's on-pick life grant +5->+4, its life-per-score-milestone 250k->300k points. Death Mark's damage ramp 0-70%->0-40%, its sub-20%-HP flat bonus 80%->50%.

**Sagittarius**: Twin Blades arc multiplier x1.60->x1.20 (both the Spirit's own Blade Arc and the Spinner's 4-way mini-arc volley share this constant). Auto-fire arc proc percent 7%->5%. Ordinary Photokrystos extra-boomerang rolls 40%->30% each (two independent rolls). Arctic Chill's Spirit/Photokrystos/Spinner fire-rate bonus +30%->+20% (3 call sites).

**Capricorn**: Compound Interest's true-damage rider 2A->1.50A, and it's now gated to primary hits only (reusing the same eligibility gate as the +60 impact bonus) with a new 100ms-per-target cooldown (`enemy._laiKepLastAt`) - previously it fired on every single eligible hit with no rate limit at all. Avalanche's damage-stack cap 70%->40% (and its stack-count ceiling lowered to match, since stacking further was already pointless).

**Aquarius**: Chain Lightning's unpaired-orb stack bonus 15%/stack->8%/stack. Magnetic Field's DoT fixed from a frame-rate-dependent per-frame `deltaTime`-scaled tick (more, smaller `dealDamage` calls at a high frame rate rounded up to noticeably more total damage per second than fewer, larger ticks at a low frame rate) to a discrete 100ms-tick accumulator dealing a flat 0.35% Max HP per tick (main.js) - same nominal 3.5%/s rate, no ATK term added (kept it a pure percentage identity per spec).

**Pisces**: Dream Realm's immunity window 3s->2.5s, plus a new shared 6s minimum retrigger interval (`window._coiMongCooldownEnd` in `input.js` and `debug-console.js`) so repeated short Shift activations can't chain into near-continuous invulnerability. Yog-Sothoth marked-explosion damage reworked: the accumulator now tracks actual accepted HP+shield loss per hit (`_hpDamageDealt + _shieldDamageDealt`, moved to right after those are finalized in `dealDamage`) instead of the pre-shield raw damage attempt; the explosion formula itself changed from `60%accum + 35%lostHP` to `min(50%accum + 15%lostHP, 25%MaxHP)` true damage (`skills/skill-d.js`); and the entire outgoing-buff multiplier chain (Glory, Parry, Yuuki, Avalanche, Chain Lightning, Circuit Engineer, Death Mark, Divine Fate, Vulnerability stacks, Skill D evade overflow, Dimensional Rift) is now skipped when resolving the explosion itself (wrapped in `!source._yogExplosion` in `entities/core.js`), preventing every contributing hit's buffs from being counted a second time when the accumulated total detonates. Cycle of Flow's kill-based and movement-based cooldown reductions for Skill A/S/Overload Laser lowered (0.75/1/1.5/2s per kill tier, was 1/1.5/2/3s) and now share a rolling 2s-per-real-second budget per skill (reusing the generic `_goliathDrawBucket` token-bucket helper from Part 4, called on `window` since these are global cooldown timestamps rather than per-enemy state) - Skill D and F keep their original, larger, uncapped reductions since they're protected sources. Its G-charge-rate bonus split from a shared +50% to +35% for Skill G specifically (Photokrystos energy charge stays +50%, unchanged).

**Great Sage**: all 7 stolen-attack percent terms reduced (Raphael 12%->10%, Marchosias 13%->11%, Veilshroud 17%->14%, Egregor 14%->12%, Dargruel 11%->9%, Leviathan 11%->9%, Goliath 22%->18%), and the Thaelis-gem sentinel-evade window 50%->40%.

**Not touched**: in-game Sigil tooltip/description text (`js/sigils/*.js`) still shows the pre-Part-5 numbers in both English and Vietnamese. Left alone deliberately, same standing convention as `guide.html`/`README.md` - updated only after the user has tested and approved the release.

## Part 3: DR, healing, and resource rules

**Structural changes** (`entities/core.js` dealDamage unless noted):
- Armor formula: flat-armor sources (Walpurgis, Leviathan Inevitable, Uriel camo, Thaelis Cocoon Guard, revived Thaelis, Goliath Unified Front/Tempered Resolve) are now summed into one `_flatArmor` total and capped at `min(_flatArmor, 0.60*postDR)` instead of each subtracting unconditionally in sequence - a small hit against a heavily-armored target can no longer be zeroed out permanently as more armor sources stack.
- DR is capped at 85% for sustained enemy defense / 65% for friendly summons, with the two spec-named timed exceptions (Veilshroud's own 3s Phantom and its Goliath Joker copy, Leviathan's 1s AFO-break grace) kept at 99%.
- Glory for Justice's core damage multiplier unified to x1.55 everywhere it still said x1.70 (`entities/core.js`, the Vanguard Network route, both Marchosias arc-barrier damage calcs). Its Sentinel DR bonus unified to +25% on both the solo and Vanguard routes (was 30%/15%).
- Fixed a real double-application bug: Egregor's Null Slash-charging DR was being added twice (two separate `combinedDR += 0.40` sites) instead of once; now a single +25% site.
- Gaia Barrier: fixed the "absorbs 99%, lets a flat 1% through regardless of pool size" bug in 4 separate call sites (core.js's main Sentinel route, the Vanguard Network route, and Dargruel chain/Leviathan Perseverance/Last Rites) to `absorb = min(pool, incomingDamage)`. Also made true damage bypass Gaia consistently everywhere (3 of those sites previously gave true damage a partial 80%/20% mitigate-then-absorb instead of a clean bypass).
- Fixed Blessing of the Primordial's DR being computed but never actually applied to incoming damage (only ever reduced Sentinel recoil cost) - now feeds `combinedDR` on both damage routes.
- Fixed Yuusha squad members: base DR was 0% (now 8%, shared 65% friendly cap replacing an unbounded 90%), ordinary `.shield` grants from the shared ally-buff loops were never actually drained on hit (now absorbed before HP, same order as Gaia/DR), and `_yuushaPierceRedirect`/`_yuushaApplyDamage` now take a real `isTrueDamage` flag threaded from each of the 12 call sites instead of always resolving as normal damage.
- Fixed Vanguard Network's Fuse Protocol trigger to track post-source-damping damage (`dampenedDmg`) instead of the raw pre-dampening value, so a heavily-damped repeated/multi-source hit no longer overcounts toward the 26% threshold.

**Per-enemy DR retuned** (all in `entities/core.js`'s combinedDR block unless noted): Egregor tentacle DR (5%/tentacle max20% -> 3%/max15%), Demon Gift DR (20/40% -> 10/20%), Dargruel low-HP DR (max72% -> max30%) and Maitre DR (50%+2.5%/sentinel max60% -> 45%+1% max55%), Thaelis Tenacity (2.5pp/1%lost max95% -> 1pp max60%) and revived bonus (+20%/+250 flat -> +10%/+100 flat), Raphael base (55%->50%) and shield-received DR (18%->12%), Marchosias body (explicit +10% while barrier broken added, matching a pre-existing `enemy.DR` field the resolver never read), Leviathan base (60%->55%, flat armor 350->150), Embryo (90%->85%), Veilshroud post-heal DR (20%->10%), Envy DR (25%->15%) and regen (1%/s->0.75%/s) and heal bonus (25%->15%), Goliath base Inevitable (70%->60%), copied Thaelis/Marchosias-broken/Egregor-casting Joker DRs, Unified Front armor (unified to one `100(1+.05*min(N,12))` formula for both normal and percent-payload hits, was two different penalized formulas), Photokrystos-vs-Goliath resistance (x0.60->x0.80), Walpurgis flat armor (uncapped->capped 100) and heal/shield effectiveness (+5%/stack unbounded -> +3%/stack cap+30%). `skills/sigil-libra.js`'s `_estimateSolArrowDR` (Sol Arrow's target-ranking heuristic, a full separate mirror of the same per-enemy DR table) updated in sync so target selection doesn't drift from real damage math.

**Healing/shield table retuned**: Sentinel recoil (via retuned Blessing DR) and special-hit heal (flat 2 -> min(0.02A,1%T), and now gated on actual HP/shield loss instead of firing on every collision); Blessing of the Primordial regen (1.75%->1.50%/tick) and shield (flat 50 -> min(0.40A,15%T)) and its Leviathan-presence grant (fixed a real repeat-grant bug: the flag reset every 3s instead of only when Leviathan actually leaves, letting it refire indefinitely); Gaia Max HP progression confirmed already matching the proposed additive 5/15/30%+3%/wave/cap60% curve (no change needed - already correct); Gaia Barrier amount (25%lost+15%T -> 20%lost+12%T); Cancer Tidal Flow regen (3%/s x1.30 -> 2.5%/s x1.20); Taurus Support heal (flat 50 -> min(0.50A,20%T)), Tank self-heal (flat 20 -> min(0.20A,8%T)); Raphael aura heal (8%casterH/s -> 4%, capped 3% recipient T/s) and first shield (38%casterH -> min(20%casterH,25%recipientT)) and ongoing shield (6%/s -> min(2%/s,2%recipientT/s)) and overheal conversion (50%->25%) and Custos-break shield (8/12/20/24/28% -> 8/10/15/20/25%); Uriel stealth heal (2%/s->1.5%/s) and reappearance shield (20%->15%); real Marchosias barrier repair (5%->3% of actual loss, now rate-capped 2%bodyH/rolling1s via a reusable token-bucket) and body-heal-from-barrier (10%->5%, same rate cap) and overheal conversion (50%->25%) and barrier-break heal/shield (40%H/30%H+30%lost -> 15%H/15%H+10%lost) and parasite-host grant (uncapped 32.5-45.5%parentH -> capped 15%hostT, both the spawn-time and later-attach call sites); Thaelis threshold shield (30%H+20%lost+250, x1.10 -> 20%H+10%lost+100) and guard-kill shield bank (flat 300/kill -> 150/kill, capped 30% of revived Max HP on transfer); Leviathan Bulwark (1.2%H/enemy max25%/layer every1s -> 0.8%H max15%/layer every1.5s) and AFO-break shield (50%H->30%H); Egregor tentacle-loss body heal (6%->4%) and Mind Link ally-death heal (heal 22% of new Max HP -> 12%, tentacle heal 15%->10%, both duplicated call sites in main.js fixed together).

**Ordinary enemy shields** now share an aggregate 50% Max HP cap, added directly inside `_addEnemyShield` (the single shared grant helper) rather than at each call site; Goliath's own stricter 30%*Hentry cap (from Part 4) is enforced upstream of that and takes precedence for Goliath specifically.

**Ally shields** (Sentinel/Yuusha/spaceship) now share an aggregate 30% Max HP cap too, added via a new `_addAllyShield(unit, amount)` helper in `entities/core.js` (mirrors `_addEnemyShield`'s pattern, returns the actually-granted amount). Both Blessing of the Primordial call sites in main.js (the one-time Leviathan-presence grant and the 3s top-up) route through it; the top-up's `_blessingShield` bookkeeping now tracks the clamped return value instead of the requested amount, so it can't drift above what was actually granted.

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

**External Raphael, Demon Gift, Envy healing to Goliath**: when an allied Goliath in True Form is the recipient of Raphael's aura heal/shield (main.js), Demon Gift's heal/overheal-shield (`triggerDemonGift`, entities/misc-enemies.js), or Envy's regen tick (main.js), the grant is now rerouted through `_goliathDrawBudget`/`_goliathHealBoost`/`_goliathGrantShield` instead of applying directly, so it shares the same effectiveness/anti-heal and repeatable-budget rules as every other source of Goliath sustain. Only matters in the rare case Goliath coexists with a real Raphael/Dargruel/Leviathan in the same wave; non-Goliath recipients are unaffected.

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

## Post-release rework: stripping target-Max-HP dependence from ally offense

After live playtesting (Goliath still dying fast despite the Part 3/4 DR nerfs above), AanSensei clarified the actual intent behind the original rebalance ask: ally damage was supposed to depend on the player's own ATK, not on the *target's* Max HP, except for a short, explicit allow-list (Skill F, all of Skill D, Photokrystos's "Danger? Not Today!" laser, Back to Motherland). Part 1 had only converted flat numbers to ATK-coefficients while leaving every pre-existing `percentDamage` term in place, since that was its stated scope - it never actually removed the dependency, which is why a huge-HP target like Goliath kept taking inflated absolute damage no matter how its own DR was tuned.

**What changed**: swept every ally-offense file for `percentDamage` and inline `target.maxHp * X` terms and, outside the protected sources above, either removed them outright (pure ATK-coefficient now) or, for a curated set of rare/cooldown-gated "signature burst" abilities, kept a small 2-4% term as a deliberate anti-tank exception (AanSensei's own call: Thunder Orb impact, Photokrystos boomerang, Blade Arc, Charged Shot, Spinner body-contact, and the unique ability of every sigil that has one - Enuma Elish, Shadow Twin/Mirror Laser, Riptide, Forest Guardian(lost-HP only, no Max-HP term), Blood Arrow, all 7 Great Sage stolen attacks). Lost-HP-based bonuses (Skill A's true-damage follow-up, Virgo's missing-HP bonus, Libra's lost-HP bonus) were kept everywhere - they scale off damage already dealt, not the target's raw size, so they don't reproduce the same runaway problem.

**Rescale**: alongside the strip, `PLAYER_BASE_ATK` was rescaled from 115 to a round 1000 (every remaining ATK-coefficient divided by the same 115/1000 ratio, output-neutral on its own), then bumped twice more as a deliberate compensating buff for the damage the strip removed: 1000 -> 1100 -> **1400** (+40% over the round baseline), based on live DPS/TTK verification data (wave 15 wiped a run in ~9.2s with 12 lives lost, dealing only 20582 damage - the trigger for the final +40%).

**New features added in the same pass**:
- **Per-sigil ATK bonus** (`SIGIL_ATK_BONUS` in config.js, `_sigilAtkMult()`): each of the 13 sigils additively grants a percentage bump to `player.atk`, weighted toward how offense-focused its kit is (Aries/Sagittarius highest, Taurus/Cancer lowest). Bumped ~1.5x again shortly after (see below).
- **Per-Yuuki-tier target-Max-HP bonus** (`entities/core.js` dealDamage): Yuuki now also grants +0.35% of the *target's* own Max HP as flat bonus damage per tier, on top of the existing +20%/tier damage multiplier. This %MaxHP portion runs on its own separate tier counter (`_yuukiHpPctTiers`, config.js) that maxes out (15 tiers, **+5.25% target Max HP**) by **wave 20** - the damage-multiplier portion (`_yuukiBonus`) is untouched and keeps its original pace out to wave 36+, per AanSensei's explicit correction after an earlier pass mistakenly compressed both onto the same wave-20 schedule.
- **Player-only wave scaling** (`_playerAtkWaveMult` in config.js): `player.atk` used to grow off the same `_atkWaveMult` enemies scale by, so buffing that curve buffed both sides equally. Split into two functions - enemies keep the original (+2%/wave, cap wave 16), the player gets a new, steeper one (+3%/wave, cap **wave 20**).
- **Sigil power pass**: `SIGIL_ATK_BONUS` raised ~1.5x across all 13 sigils; the ATK coefficients (and their small anti-tank percent terms, proportionally) on every sigil's signature ability raised ~30% (Aries, Gemini, Cancer, Libra, Virgo, all 7 Great Sage stolen attacks + its 72 Transformations combo multiplier 1.5x->1.65x, all of Yuusha Party/Taurus); Scorpio's Death Mark damage ramp and Leo/Aquarius/Capricorn's ATK-only riders (left out of the original rescale pass) raised similarly.
- **Goliath buffed further**: Unbroken Will now revives to a **full 100% Max HP** (was 35% of entry HP - a deliberate softer "second phase" from Part 4, reverted per AanSensei since the player-side buffs above made the encounter overall stronger); Unified Front's flat armor raised 100->130; Warding Palm's per-hit Skill F/D/Photokrystos-laser damage trimmed to 10%/22% of Max HP (was 15%/35%); the death check in `updateGoliath` now gives Unbroken Will one last chance to fire if hp reaches 0 without having routed through it first, instead of only patching known bypass sources (like Back to Motherland's manual hp subtraction, fixed earlier) one at a time as they turn up.

**Still stale, not yet touched**: `guide.html`, `README.md`, and the in-game Sigil tooltip text (`js/sigils/*.js`, `SIGIL_DEFS`/`SIGIL_I18N_VI`) all still describe the pre-strip, `PLAYER_BASE_ATK=115` numbers. All three need a full resync pass against current code, not the other way around.
