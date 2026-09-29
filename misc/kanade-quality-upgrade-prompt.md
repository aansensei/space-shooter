# Prompt: nâng chất lượng model 2D của Kanade

Đưa nguyên phần trong khung cho agent.

---

````
Work in the repo at C:\Users\Thien An Nguyen\SpaceShooter. Vanilla JavaScript
browser game, no build step, plain <script> tags.

Kanade's 2D model lives in `js/render/kanade-cutscene.js`, drawn procedurally
with canvas paths into a sprite buffer. Your job is to raise its quality. The
structure is sound and the front view was rebuilt recently; what follows is
measured, not guessed, so trust the numbers over your first impression.

## State of it, in numbers

    drawKanade      (front)  229 drawing calls   ~1.16ms per uncached draw
    drawKanadeBack  (back)    65 drawing calls   ~0.3ms
    bezierShape (curved fills)  45
    poly (hard-cornered fills)  23
    distinct stroke widths      29, from 0.35 to 13

The sprite is a 180x180 logical grid, supersampled by `RES_MULT = 2` into a
360x360 buffer, blitted with `imageSmoothingEnabled = false`. That is a
deliberate pixel-art look. Keep it.

## Do these, in this order

### 1. Raise RES_MULT. This is the single highest-value change.

The buffer is 360px. Here is what the sprite actually occupies on screen,
computed from `layout()`:

    720p              360px    buffer is exactly 1:1
    1080p             540px    buffer is upscaled 1.5x
    1440p             720px    buffer is upscaled 2.0x
    phone landscape   195px    buffer is downscaled 0.54x

So from 1080p up, a 360px buffer is being blown up, and that is where the
softness comes from. It is not the pixel-art style, it is running out of
buffer.

I measured the cost of raising it, with the sprite cache bypassed so each
call is a real draw:

    RES_MULT = 2 (360x360)   1.163 ms
    RES_MULT = 3 (540x540)   1.049 ms
    RES_MULT = 4 (720x720)   1.017 ms

It does not get more expensive. The cost is in path geometry and the number
of drawing calls, not in filling pixels, because the figure covers a small
part of the buffer. Measured with @napi-rs/canvas, so verify in a browser
before trusting it absolutely, but the shape of the result should hold.

Raising it also rescues the thin strokes. There are 56 strokes below 0.5
units wide; at RES_MULT 2 those land on under one physical pixel and mostly
vanish.

**Prefer making it adaptive over hardcoding 4.** A phone only ever shows the
sprite at 195px and does not need a 720x720 buffer. Size the buffer from the
canvas, clamped to something sane, and rebuild it when the canvas resizes.
`px` and `pctx` are module-level; `blitSprite` and the debug viewer read
`GRID_W`/`RES_MULT`, so anything reading them has to keep working.

### 2. Bring the garment up to the level of the hair

The hair has a real shading system: `hairLockShaded` (line 174) builds a lock
from a base, a shade band, an edge light and a strand line. The cloth does not
have an equivalent. It has folds and contact shadows, added one at a time,
with nothing systematic behind them.

Write the cloth equivalent. One function that takes a panel and produces base,
shadow, lit edge and fold, so every panel is lit consistently by the same
light source. Decide the light direction once (the gate she comes out of is to
her far side, and the front view's top-tier rim light already assumes that)
and apply it everywhere.

### 3. Convert the polygons that still show corners

23 `poly()` calls remain. They are fine for genuinely straight things, wrong
for cloth and flesh. The trailing robe panels were already converted because
their corners poked out under the hem as spikes. Find the rest by rendering
and looking for straight edges where there should be curves: the legs, the
bodice and the front panels are the known offenders.

### 4. Regularise stroke widths

29 distinct widths with no system is why some lines scream and others
disappear. Define a small set as named constants, something like hairline,
detail, seam, outline, limb, and map everything onto it. This is also what
makes the drawing survive a change of RES_MULT.

### 5. Break the symmetry of the resting pose

Animation already breaks it in motion (`sway`, `bob`, `trail`, `whip`,
`walkStep`), but standing still she is close to mirrored. Drop one shoulder a
unit or two, give the two robe panels different silhouettes, offset the
ornaments. Small, permanent, not animated.

### 6. The back view

It is the weakest thing in the file and there is a separate brief for it at
`misc/kanade-back-upgrade-prompt.md`. If you are doing the whole model, read
that too. In short: the hair covers a back that is actually drawn underneath
it, so part the hair rather than drawing more of what cannot be seen.

## Do NOT do this

Do not enlarge the logical grid from 180 to 270 or 360 by multiplying all the
coordinates. It sounds equivalent to raising RES_MULT and it is not. There are
roughly two thousand hardcoded coordinates; rescaling them risks the whole
drawing, and it adds no detail on its own, it only spreads the same shapes
over more units. RES_MULT gets you the same sharpness without touching a
single coordinate. If you later want finer detail in one area, add it locally
at the existing scale.

Do not turn on `imageSmoothingEnabled`. Smoothing without more detail gives a
soft blur, not a cleaner drawing.

## Hard constraints

**Sprite cache.** Both views share one buffer and are cached on a key built by
`spriteKey`. If you make the drawing depend on a value not in that key, add it
to the key or the sprite will freeze on a stale frame. Do not remove the cache
and do not remove the `invalidateSprite()` call after `tintBuffer`.

**Performance.** Front view is about 0.9ms per frame in practice against a
16.7ms budget, helped by the cache redrawing at 24 steps per sway cycle rather
than 60. Up to about 1.5ms is fine. Measure three times and alternate the
order: a single pair of readings on this machine once had the cheaper config
looking twice as expensive as the richer one.

**Graphics tiers.** `gfxLevel()` returns 0 for HIGH. The front view puts its
rim light, contact shadows, loose strands and glints behind
`if (gfxLevel() === 0)`. Keep that split: the base drawing must stand on its
own at every tier.

**Signatures.** `drawKanade(t, opts)` and `drawKanadeBack(t, opts)` keep their
names, arguments and buffer. Callers must not change.

**Style.** Flat cel shading. Every shadow and highlight is a separate flat
shape or stroke in a `PAL` tone. No gradients, no alpha, no blur, no
shadowBlur. Add nothing to `PAL`.

## Coordinates and helpers

Grid is 0..180 in both axes; `pctx` is already scaled, so write plain
coordinates. Landmarks the code is written against:

    y=11 top of head   y=38 eyes   y=47 chin   y=62 shoulders
    y=75 casting hand  y=95 waist  y=150 hem   y=175 soles
    x=90 centreline

Helpers, all in logical units:

    rect(x, y, w, h, colour)
    poly([[x,y], ...], colour)
    ellipse(x, y, rx, ry, colour)                  filled
    ring(x, y, rx, ry, rotation, colour, width)    outline only
    crystal(x, y, halfHeight, colour, highlight)
    line([[x,y], ...], colour, width)
    bezierLine(start, segments, colour, width)
    bezierShape(start, segments, colour)           filled, auto-closed
    sparkle(x, y, size, colour)                    four-pointed star
    drawHand(x, y, facing, open)                   facing 1 or -1, open 0..1
    hairLock / hairLockShaded                      see line 174

`bezierLine`/`bezierShape` take `start` as `[x, y]` and `segments` as an array
of cubics, each `[c1x, c1y, c2x, c2y, endX, endY]`.

Values available inside the draw functions: `t` (0..1, one cycle per 900ms),
`sway`, `bob`, `lean`, `trail`, `whip`, `droop`, `walkStep`, `castExt`,
`fabricTrail`. Things that trail the body should use a smaller multiple of
`sway`/`trail` than the body does, so they arrive a beat late.

## How to see your work, and keep seeing it

This is the part that decides whether this goes well. There is a headless
renderer in the repo. Use it after every change.

    npm install @napi-rs/canvas --no-save

    # all twelve poses in one sheet: this is the one to watch
    OUT=sheet.png node misc/dev-tools/render-sheet.js

    # the same sheet at a different supersample, to judge change 1
    RES=4 OUT=sheet4.png node misc/dev-tools/render-sheet.js

    # a single pose, blown up 4x
    SCALE=4 OUT=front.png node misc/dev-tools/render-kanade.js
    SCALE=4 BACK=1 OUT=back.png node misc/dev-tools/render-kanade.js
    SCALE=4 OPTS='{"castExt":1}' OUT=cast.png node misc/dev-tools/render-kanade.js

    # with the grid and landmark lines
    OUT=viewer.png node misc/dev-tools/render-viewer.js

    # timing
    BENCH=1 node misc/dev-tools/render-kanade.js

    # lower tier, to check the base drawing stands alone
    GFX=2 OUT=low.png node misc/dev-tools/render-sheet.js

**Open every render and look at it.** Zoom into what you changed. The front
view only got fixed because each change was rendered and inspected, and
several were wrong in ways no reasoning about coordinates would have caught.

Check it still loads:

    node --check js/render/kanade-cutscene.js

## Three traps this drawing has already cost time on

**A wide flat fill and a thin stroke read as different things at this size,
even in the same colour.** A forehead shadow painted as a filled band looked
like a stain and had to become three short strokes. Robe panels drawn as
polygons grew spikes under the hem. When something looks wrong, ask whether it
is the wrong kind of mark before moving coordinates.

**Fixing an outer silhouette does nothing while inner layers spill past it.**
A neck pinch was added to the outer hair shape and nothing changed, because
the layers underneath were still wide there; then those were fixed and still
nothing changed, because the shoulders filled the gap. What it needed was the
boundary. If a shape change does nothing, measure the actual silhouette before
changing more coordinates.

**Detail you cannot see costs the same as detail you can.** A pass of locks
and sheen was added to the back hair, and at rest it is almost entirely hidden
behind the sleeves and gown; it only shows when she flies. Render before you
invest in an area.

## What done looks like

- The sheet at 1080p-equivalent scale is visibly sharper than before, with no
  change in style.
- Cloth is lit by one light source with the same consistency the hair already
  has.
- No straight polygon edges left where cloth or flesh should curve.
- Stroke widths come from a named set, and nothing disappears or screams.
- Standing still, she is not mirrored.
- Still under about 1.5ms per frame, measured three times.
- `node --check` passes and the cutscene still runs 12400ms end to end.
````

---

## Ghi chú cho AanSensei

**Nhận xét của ChatGPT phần lớn đúng.** Tôi đã đối chiếu code từng điểm:
`hairLockShaded` có thật ở dòng 174 (tôi tưởng không có, tôi sai), outline
đúng là loạn với 29 mức từ 0.35 đến 13, còn 23 `poly()` góc cạnh thật, và back
view đúng là bị tóc che phần thân đã vẽ sẵn.

**Nhưng có một đề xuất tôi bỏ, và ghi hẳn vào mục cấm:** nâng lưới từ 180 lên
270 hoặc 360 rồi nhân toàn bộ toạ độ. Nghe thì tương đương với tăng
`RES_MULT` nhưng không phải: khoảng hai nghìn toạ độ hardcode, nhân hết lên là
đánh cược cả bản vẽ, mà **không tự thêm một chi tiết nào**, chỉ trải cùng những
hình đó ra nhiều đơn vị hơn. Tăng `RES_MULT` cho đúng độ sắc nét đó mà không
đụng một con số nào.

**Phát hiện đáng giá nhất khi tôi đo:** tăng `RES_MULT` gần như miễn phí.
Một lần vẽ thật ở mức 2 là 1.163ms, mức 4 là 1.017ms, tức không đắt hơn. Chi
phí nằm ở số lệnh vẽ và xử lý đường cong chứ không ở việc tô pixel, vì nhân
vật chỉ chiếm phần nhỏ của buffer. Ngược hẳn trực giác, và nó biến việc này
thành thứ nên làm đầu tiên.

**Lý do tăng cũng mạnh hơn ChatGPT nói.** Không phải "cho sắc hơn" chung
chung: buffer 360px khớp đúng 1:1 ở 720p, nhưng ở 1080p sprite hiển thị 540px
và ở 1440p là 720px, tức đang bị phóng to lên 1.5 và 2 lần. Đó mới là nguồn
gốc của cảm giác mờ.

**Một điểm ChatGPT bỏ sót:** nên cho `RES_MULT` co giãn theo kích thước canvas
thay vì đặt cứng bằng 4. Điện thoại chỉ hiển thị sprite ở 195px, cấp cho nó
buffer 720x720 là phí bốn lần bộ nhớ mà không thấy khác gì.

**Về harness,** tôi thêm `misc/dev-tools/render-sheet.js`: dựng cả mười hai tư
thế vào một ảnh, gồm cả mấy tư thế phơi bày lỗi nhiều nhất như đi vào cổng và
tóc bay. Agent nhìn một ảnh là thấy thay đổi ảnh hưởng tới mọi pose, thay vì
render từng cái rồi quên mất cái trước trông ra sao. Nó nhận `RES` để so trực
tiếp hai mức supersample.
