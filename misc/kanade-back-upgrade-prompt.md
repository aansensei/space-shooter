# Prompt: nâng cấp mặt lưng của Kanade

Đưa nguyên phần trong khung cho agent. Mọi thứ nó cần biết đều nằm trong đó,
không phải hỏi lại.

---

````
Work in the repo at C:\Users\Thien An Nguyen\SpaceShooter. It is a vanilla
JavaScript browser game, no build step, plain <script> tags.

## The job

Rebuild `drawKanadeBack` in `js/render/kanade-cutscene.js` (starts at line
908, about 198 lines) so the character reads as a person seen from behind.

Right now she reads as a bell-shaped cocoon. The front view of the same
character was rebuilt recently and is good; the back view was never given the
same attention and it shows. Count the drawing calls in each and the gap is
the whole problem:

  drawKanade      229 drawing calls
  drawKanadeBack   65 drawing calls

Your job is to close that gap with drawing that earns its place, not to pad
the count.

## What is wrong, specifically

Render the back view before you start (see "How to see your work") and you
will see all of these:

1. The hair is one unbroken mass from the crown down to the hem, so head,
   neck, shoulders and body are a single silhouette. There is a pinch at the
   neck in the outer shape already, but the shoulders and sleeves fill it back
   in, so it does not read.
2. Two horizontal white streaks sit near the top of the head, around y=38 and
   y=45. They are meant to be the sheen band anime uses on hair. They read as
   sticking plaster. Either make them read as sheen or remove them.
3. A thin gold curve crosses the back around y=55. It is unclear what garment
   it belongs to. It needs to be part of something or go.
4. The sleeves stick straight out sideways like fins, with rounded ends, and
   join the body at no clear point. There are no shoulders.
5. The hands are two small patches of skin with two strokes each.
6. The bottom edge of the hair is a row of even rounded scallops, like the
   fringe on a tablecloth.
7. The boots are two dark blobs at the very bottom, with a gold dot floating
   beside one of them.
8. There is no gold anywhere on the back of the outfit. The front has gold
   piping down both panels, a hem band, collar trim, a waist band, cuffs,
   studs and scattered stars. The back has none of it, and the character is
   supposed to be wearing one garment.
9. The hair locks are evenly spaced vertical lines of one tone. Evenly spaced
   lines of one colour read as corduroy, not as hair.

## Coordinate system

Everything is drawn into a 180 x 180 buffer called `px` through `pctx`, which
is already scaled by RES_MULT (2). Write plain 0..180 coordinates and ignore
the scaling.

Landmarks the rest of the code is written against. Keep them:

  y=11   top of the head
  y=38   eye line
  y=47   chin
  y=62   shoulders
  y=95   waist
  y=150  hem of the gown
  y=175  soles of the boots
  x=90   vertical centreline of the figure

## Drawing helpers available

All of them take plain 0..180 coordinates.

  rect(x, y, w, h, colour)
  poly([[x,y], ...], colour)
  ellipse(x, y, rx, ry, colour)                 filled
  ring(x, y, rx, ry, rotation, colour, width)   outline only
  crystal(x, y, halfHeight, colour, highlight)  small gem shape
  line([[x,y], ...], colour, width)
  bezierLine(start, segments, colour, width)
  bezierShape(start, segments, colour)          filled, auto-closed
  sparkle(x, y, size, colour)                   four-pointed star
  drawHand(x, y, facing, open)                  facing is 1 or -1, open is 0..1

`bezierLine` and `bezierShape` take `start` as `[x, y]` and `segments` as an
array of cubic beziers, each `[c1x, c1y, c2x, c2y, endX, endY]`.

You may add helpers if a shape genuinely needs one, next to the existing ones.

## Palette

Use `PAL` and add nothing to it. These are all the colours that exist:

  hair        hairDeep #4a4570  hairShadow #6b6690  hairMid #9f9cc4
              hairLight #e7e5f5  hairHi #fffdf8
  skin        skin #ffe3d4  skinShadow #e3ac9d  blush #f5b7c2
  cream robe  creamShadow #b8b2ca  creamMid #e9e5ea  cream #fffaf0
  indigo      indigoDeep #110f24  indigo #292552  indigoMid #403a78
              indigoHi #665ba1
  gold        goldDark #9b7131  gold #d8b35a  goldHi #fff0a3
  boots       bootDeep #15142a  boot #292647  bootHi #ece7ef
  outline     outline #231f38
  magic       magic #b98cff  magicHi #efdcff   (only while casting)

## Values available inside the function

`t` is 0..1 and cycles once per 900ms. Already derived at the top:

  sway         horizontal drift, amplitude from opts.swayAmp (default 1.5)
  bob          vertical drift, amplitude from opts.bobAmp (default 1)
  lean         opts.lean, the whole body is translated by it
  trail        opts.trail, how far the hair streams out behind her
  whip         opts.whip
  walkStep     opts.walkStep, -1..1, she is walking into the gate
  fabricTrail  trail * 0.75 + whip
  armSwing     walkStep * 2.2
  backFoot     walkStep * 4

Things that trail the body (hair tips, chains, cloth) should lag it: use a
smaller multiple of `sway` or `trail` than the body uses, so they arrive a
beat late instead of moving rigidly with her.

## Hard constraints

**The sprite cache.** Both body views share one buffer and are cached on a
key. Look at `spriteKey` above `drawKanade`. If you make the drawing depend on
any value that is not already in that key, add it to the key, or the sprite
will freeze on a stale frame. Do not remove the cache.

**Performance.** Measure, do not guess. The front view costs about 0.9ms per
frame against a 16.7ms budget at 60fps. The back view currently costs about
0.3ms. Anything up to roughly 1.2ms is fine. Measure three times and in both
orders: a single reading on this machine has been wrong by a factor of two
before.

**Signature.** `drawKanadeBack(t, opts)` must keep its name, arguments and the
buffer it draws into. Callers must not need changing.

**Graphics tiers.** There is a `gfxLevel()` helper returning 0 for HIGH. The
front view puts its rim light, contact shadows, loose strands and glints
behind `if (gfxLevel() === 0)`. Do the same: the base drawing must stand on
its own at every tier, with the top tier getting extras.

**Style.** Flat cel shading. Every shadow and highlight is a separate flat
shape or stroke in a palette tone. No gradients, no alpha, no blur, no
shadowBlur. Match the front view's idiom, and read it before you start: it is
in the same file, directly above.

## Two traps this drawing has already fallen into

Both cost real time to find. Do not repeat them.

**A wide flat fill and a thin stroke read as completely different things at
this size, even in the same colour.** A shadow painted as a filled band across
the forehead looked like a stain and had to become three short strokes. Robe
panels drawn as polygons had their corners poke out under the hem as spikes
and had to become curves. When something looks wrong, ask whether it is the
wrong *kind* of mark before you move the coordinates.

**Fixing the outer silhouette is not enough if the inner layers spill past
it.** The neck pinch was added to the outer hair shape and nothing changed,
because the layers underneath were still wide there. Then the layers were
fixed and still nothing changed, because the shoulders filled the gap. What it
needed was the boundary: an edge line down the hair mass and a shadow at the
nape. If a shape change does nothing, measure the actual silhouette before
changing more coordinates.

## How to see your work

This matters more than anything else in this prompt. There is a headless
renderer in the repo so you can look at what you draw instead of guessing.

    npm install @napi-rs/canvas --no-save

    # back view, 4x, written to back.png
    SCALE=4 BACK=1 OUT=back.png node misc/dev-tools/render-kanade.js

    # front view, for comparison
    SCALE=4 OUT=front.png node misc/dev-tools/render-kanade.js

    # with a walk cycle and hair streaming
    SCALE=4 BACK=1 OPTS='{"walkStep":0.7,"trail":8}' OUT=walk.png \
      node misc/dev-tools/render-kanade.js

    # timing, three times, alternating with the front view
    BENCH=1 node misc/dev-tools/render-kanade.js

    # the in-game model viewer with grid and landmark lines
    BACK=1 OUT=viewer.png node misc/dev-tools/render-viewer.js

**Look at every render.** Open the PNG. Zoom into the part you changed. The
whole reason the front view got fixed is that each change was rendered and
looked at, and several of them were wrong in ways no amount of reasoning about
coordinates would have caught.

## Checking you have not broken anything

    node --check js/render/kanade-cutscene.js

There is also a headless smoke test for the cutscene. If `scratchpad/smoke.js`
is not present in your session, at minimum verify the module still loads and
that `window._KANADE_CUTSCENE_MS` is 12400.

## What done looks like

Render the back view at 4x and it should read, without being told, as:

- a head, with a neck under it, and shoulders under that
- a body wearing the same garment as the front view, with gold on it
- arms that come out of shoulders and end in hands
- hair that falls in overlapping locks of varying length, not a sheet
- feet in boots, standing on the ground

And it should still be recognisably the same character as the front view: same
silver-white hair, same cream and indigo gown with gold trim, same proportions
against the landmark lines above.

Do not touch `drawKanade`, the front view. It is finished.
````

---

## Ghi chú cho AanSensei

**Vì sao prompt dài thế.** Phần lớn độ dài là những thứ tôi phải tự dò ra
trong hai ngày: hệ toạ độ, danh sách helper, tên màu, các mốc y, cái bẫy cache
sprite. Agent không biết mấy thứ đó sẽ đoán sai rồi tôi phải sửa lại.

**Phần quan trọng nhất là mục "How to see your work".** Hôm qua tôi sửa mù
mấy vòng vì browser pane không mở được localhost, và chỉ thật sự tiến được sau
khi dựng harness render bằng node-canvas. Tôi vừa copy hai script đó vào
`misc/dev-tools/` để agent khác chạy được ngay, kèm luôn các lệnh mẫu.

**Hai cái bẫy tôi ghi vào prompt** là hai thứ tốn thời gian nhất hôm qua: một
là mảng phẳng với nét mảnh đọc ra khác hẳn nhau ở cỡ sprite này, hai là sửa
silhouette ngoài mà lớp trong tràn ra thì không ăn thua. Không ghi thì agent
sẽ đâm vào đúng chỗ đó.

**Con số 229 với 65** là bằng chứng định lượng cho việc mặt lưng bị bỏ bê, và
nó cho agent một cái đích rõ ràng hơn là bảo "làm đẹp hơn".

Prompt cấm động vào `drawKanade`, để mặt trước đang ổn không bị phá.
