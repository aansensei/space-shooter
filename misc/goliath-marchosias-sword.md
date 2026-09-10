# Goliath's Marchosias Joker: the Sword & Barrier, in plain terms

How the sword slashes actually get thrown. Written to be read, not
skimmed off the code.

## The setup

When Goliath transforms into True Form, whichever three gems ended up in
its slots each hand it a "Joker" copy of that boss's kit. If one of them
is the **Marchosias** gem, Goliath gets:

- A **Barrier**: a shield bubble around Goliath with its own **8000 HP**
  (a fixed number, it does not scale with Goliath's own HP), **60% damage
  reduction**, and a per-hit cap so no single hit can strip more than 35%
  of the barrier's current HP. True damage ignores the barrier entirely
  and hits Goliath's body directly.
- The **Sword throw**, which is what the barrier's whole existence is
  there to feed.

## What triggers a sword

**Every time you land a hit on the barrier, the game rolls to throw a
sword.** There is no separate "sword attack timer". It is purely a
reaction to being hit.

Concretely, one hit on the live barrier does one of these, and *all
three of them ask for a sword*:

1. **10% of hits are "evaded"**: the barrier flashes, takes zero damage,
   and asks for a sword.
2. **A piercing hit** chips the barrier, some of it passes through to
   Goliath at reduced power, and asks for a sword.
3. **A normal hit** is absorbed into the barrier and asks for a sword.

So while the barrier is up, sustained fire on Goliath is what keeps the
swords coming. The harder you hit it, the more it hits back.

## The gate on "asking for a sword"

Asking is not the same as getting one. The request passes only if:

- The barrier is currently **up** (not broken and waiting to respawn).
- At least **650 ms** have passed since the last sword was triggered.
  Faster hits than that are ignored for sword purposes.
- Fewer than **10 swords** have been thrown this barrier cycle. Hit 10
  and the barrier **detonates on the spot** (see "barrier break" below),
  no need to grind its HP to zero.

When a request does pass, it does not throw one sword. It **locks 3
points**: the player, plus two more (real Sentinels if there are any,
otherwise random spots near the player). Each locked point becomes a
pending sword.

## From lock to slash

Each pending sword has a **1000 ms wind-up**. During that second Goliath
is still moving around, so the sword does **not** aim at where the point
was when it locked. When the wind-up finishes it re-reads Goliath's eye
position *at that moment* and fires from there toward the locked target
coordinates.

The thrown sword: leaves Goliath's eye, travels at **792 px/s**, is
**88 px** wide, and lives for **2 seconds** before despawning.

## Barrier break (either HP hits 0, or the 10th sword lands)

When the barrier goes down it is not a clean win. It pays out:

- Goliath gains **5 Iron Body hits** (5 incoming hits fully negated).
- Heals **40% of its Max HP**.
- Gains shield worth **15% Max HP + 15% of its missing HP**.

Then it goes dormant and **revives at full 8000 HP** after a delay:
**3 seconds** if it broke because the 10th sword landed, otherwise
**4 to 5 seconds** (shorter the longer the overall run has gone). On
revive the sword count for the cycle resets to 0.

## The tuning knobs (file : what)

| Value | Where | Meaning |
|---|---|---|
| `0.10` | goliath.js:292 | chance a barrier hit is an evade (still triggers a sword) |
| `650` | goliath.js:265 | minimum ms between sword triggers |
| `10` | goliath.js:266, 277 | swords per cycle before the barrier auto-breaks |
| `_goliathLockTargets(2)` | goliath.js:272 | targets locked per trigger = player + this many |
| `1000` | goliath.js:273 | per-sword wind-up in ms |
| `792` | goliath.js:1080 | sword travel speed (px/s) |
| `88` | goliath.js:1081 | sword hit radius (px) |
| `2000` | goliath.js:1081 | sword lifetime (ms) |
| `8000` | goliath.js:825 | barrier HP (fixed) |
| `0.40` | goliath.js:299 | barrier damage multiplier (i.e. 60% DR) |
| `0.35` | goliath.js:302, 313 | max fraction of barrier HP one hit can remove |
| `0.40` | goliath.js:338 | Max HP healed when the barrier breaks |
| `3000` / `4000 to 5000` | goliath.js:349 | barrier revive delay (full-cycle break / normal) |
