# Goliath fix + high-wave rebalance ideas

Parked here for a later pass, per AanSensei. The wave-spawn rework
(waves 11+) is being done first and separately; this file is the
Goliath / Walpurgis / scaling side.

## Problem statement (AanSensei, playtest to ~wave 23)

- Goliath at waves 15 / 20 / 25 dies far too fast despite showing ~3M HP.
- High waves dump the whole enemy count into the fixed 15s window, which
  lags hard and turns into panic button-mashing.

## Why a 3M HP Goliath melts

Formula ([js/entities/goliath.js](../js/entities/goliath.js), `_goliathEnterTrueForm`):

```
maxHp = round( (65000 + min(320000, damagePull))
               * (1 + 0.25 * gemPoints)
               * _walpurgisHpMult()
               * 1.20 )
```

HP does scale with wave (via Walpurgis), so 3M is real. It still dies
fast because:

1. **Waning Might** (`_goliathWaningStacks`, every 35s in True Form):
   damage / DR / heal all decay. DR by stack: 100 -> 85 -> 72 -> 52 ->
   38 -> 27%. Heal by stack: 100 -> 80 -> 64 -> 41 -> 26 -> 17%. Any
   fight that runs past ~70s has Goliath's 70% Inevitable DR mostly gone
   and self-heal near zero, so the big HP pool has nothing protecting it.
2. **%MaxHP damage** (Skill D / Skill F / Photokrystos). Warding Palm
   only reduces to 15% MaxHP on a 35% roll; the other 65% land the full
   35% MaxHP = ~1.05M on a 3M Goliath. A few Skill F hits end it.
3. **Player scaling by wave 15+**: 3 sigils, Yuuki bonus (cap +300%),
   Walpurgis also buffs player side, Glory near-permanent. Raw player
   DPS outpaces the HP number.

## Fix options

### (a) Per-hit %MaxHP cap on Goliath True Form  [preferred]
Cap any `percentDamage > 0` hit at e.g. **8% Max HP per hit** against
Goliath True Form (same idea other bosses already use). Kills the
~1M-per-Skill-F burst without touching sustained DPS much.
- Touch point: `dealDamage` in [js/entities/core.js](../js/entities/core.js),
  near the existing Unified Front flat-DR block (~line 1137).

### (b) Slow Waning Might at high waves  [preferred, pair with a]
Keep Goliath "lì" instead of a paper tiger. Options:
- Interval 35s -> 50s when `_waveNumber >= 15`.
- Or hard-cap the stack at 2 while `_waveNumber >= 15` (DR floor ~72%,
  heal floor ~64%).
- Touch point: `_goliathWaningStacks` / `_goliathWaningMult`
  ([js/entities/goliath.js](../js/entities/goliath.js) ~line 144-153).

### (c) Wave-scaling HP multiplier for wave >= 15
Add `* (1 + 0.15 * (_waveNumber - 10))` to the True Form formula for
wave >= 15. Wave 15 -> +0.75x, wave 25 -> +2.25x. Turns 3M into ~5-7M.
Simpler but just inflates the number; less interesting than a+b.

## Related: buff Walpurgis (AanSensei asked)

Current ([js/config.js](../js/config.js) ~line 195-202),
`_walpurgisStacks() = floor(_waveNumber / 5)`:

| stat | current | notes |
|---|---|---|
| HP mult | `1 + 0.20 * stacks` | wave 15 = 1.6x, w20 = 1.8x, w25 = 2.0x |
| evade | `min(0.40, 0.05 * stacks)` | caps at wave 40 |
| flat DR | `25 * stacks` | wave 25 = 125 |
| heal/shield eff | `1 + 0.05 * stacks` | |

Proposed buff (confirm exact number with AanSensei):
- HP mult per stack **0.20 -> 0.28** (wave 25: 2.0x -> 2.4x), or make it
  superlinear past stack 4 (early waves unchanged, late waves ramp
  harder): `stacks <= 4 ? 1 + 0.20*stacks : 1.8 + 0.32*(stacks-4)`.
- Optionally flat DR `25 -> 35` per stack.
- This feeds Goliath's HP formula too, so it partly covers fix (c) for
  free.

## Order of operations

1. Wave 11+ spawn rework (separate, in progress).
2. This pass: (a) + (b) for Goliath, plus the Walpurgis HP buff.
3. Re-test to ~wave 25, check Goliath TTK and whether high-wave enemy
   HP now creates the intended pressure without being a slog.
