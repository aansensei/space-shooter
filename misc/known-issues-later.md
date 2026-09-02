# Known issues — revisit when free

Parked here instead of actively fixed, per AanSensei's call (too many
side effects to chase right now). Not on `main`, not blocking anything.

## PC devicePixelRatio (DPR) canvas fix — reverted

**Attempted:** `js/config.js` + `js/input.js` — make the PC canvas backing
store scale by `window.devicePixelRatio` (capped at 2x) instead of
matching `window.innerWidth`/`innerHeight` 1:1, so rendering stays sharp
on scaled Windows displays (125%/150%) instead of being softly upscaled
by the browser. `canvas.style.width/height` was pinned to the CSS
viewport size so the on-screen box didn't change, and the resize handler
force-synced Pixi's renderer to match (same pattern the mobile 1.282x
inflate already uses).

**Why reverted:** broke the in-game sigil-picker card layout — cards
rendered visibly smaller with large uneven gaps between them once
`canvas.width` stopped matching `window.innerWidth` 1:1. Root cause not
found yet — something in the sigil-picker's draw code (`js/sigils/core.js`,
`_drawPickerCards` and friends) likely mixes `canvas.width` (now DPR-
scaled) with a fixed/`window.innerWidth`-based constant for card
sizing, so position and size math end up in two different scales. Needs
a proper audit of every picker-layout constant before retrying, not a
blind re-apply.

**State:** fully reverted on `main` (confirmed `canvas.width ===
window.innerWidth`, no `_pcCanvasDpr` in the live tree). The attempt
still exists on the local branch `pc-dpr-fix` (commit `0dd9478`, never
pushed to origin) if picking this back up later.

**If retried:** audit every place `canvas.width`/`canvas.height` is read
in `js/sigils/core.js`'s picker draw path and cross-check each against
`window.innerWidth`/`innerHeight` before touching config.js again —
that mismatch is almost certainly the actual bug, not the DPR idea
itself.

## guide.html — Sigils tab card grid, uneven row heights

`.sigil-deck` (guide.html, `display:grid; grid-template-columns:
repeat(4,1fr)`) rows stretch every card in a row to match the tallest
one. When one card's `.sfc-row` content is much longer than its row-
mates (e.g. Taurus's Yuusha Party writeup vs. Aries/Gemini), the shorter
cards end up with a big empty gap before their "CLICK TO READ LORE"
footer, which reads as visually broken even though the grid itself is
behaving as designed.

**Not yet fixed.** Possible directions: cap `.sfc-row` line count with
`-webkit-line-clamp` + "…" for the overview cards, move the footer link
so it doesn't rely on an absolutely-positioned bottom anchor, or just
let each card size independently (`align-items: start` and manage the
visual imbalance some other way). Needs a real look at the design, not
a quick CSS tweak — screenshot reference: Aries/Taurus/Gemini row where
Taurus's card is visibly the tallest.
