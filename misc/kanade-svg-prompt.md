# Kanade: prompt nhờ vẽ lại bằng SVG

Mục tiêu: thay phần vẽ tay bằng code trong `js/render/kanade-cutscene.js`
(`drawKanade` và `drawKanadeBack`, gần 500 dòng) bằng path lấy từ một bản vẽ
vector. Canvas nhận thẳng path của SVG qua `Path2D`, nên đổi được mà không mất
gì: vẫn transform từng bộ phận, vẫn shading bằng code, vẫn `handPos` cũ.

Bản vẽ phải giống **Kanade đang chạy trong game**, không phải bản
`misc/imagegen/kanade-full-body-reference.png` (bên đó tóc tím, váy nhiều
tầng, khác hẳn).

---

## PHẦN 1: Copy đoạn dưới đây, kèm ảnh tham chiếu

Đính kèm **một ảnh PNG** làm tham chiếu tạo hình, ưu tiên theo thứ tự:

1. `misc/imagegen/kanade-body-source.png` nếu đã gen theo
   `misc/kanade-image-prompt.md`. Đây là mốc tốt nhất vì đúng tư thế, đúng
   tỉ lệ, nền phẳng.
2. Nếu chưa có thì dùng ảnh chụp màn hình Kanade đang đứng trong cutscene.

Ảnh này quan trọng hơn ta tưởng: prompt bắt nó **vừa vẽ vừa render ra xem và
so với ảnh đó**, từng bộ phận một, nên không có ảnh thì mất luôn cơ chế tự
sửa và kết quả sẽ lại ra như lần trước.

```
Draw this character as one clean SVG file. Front-facing, standing at rest,
both arms held slightly away from the body, wide sleeves hanging open.

CHARACTER
A tall, slender anime girl with an ethereal, otherworldly presence.

Hair: silver-white, very long, falling past the hips. Two thick locks fall
forward over the shoulders down the front of the body. The rest falls behind
her in soft heavy strands.

The fringe must NOT be a blunt straight line across the forehead. Break it
into pointed strands of uneven length, a little longer toward the outside,
with one or two strands falling loose and slightly off to one side. Longer
sidelocks frame the face down past the jaw.

Hair ornaments, in gold matching the trim on her dress: a small four-pointed
gold star pinned into the hair on the viewer's left, where the fringe meets
the sidelock; two or three fine gold chains hanging from it down along the
side of her face, each ending in a tiny gold bead or small pale violet gem;
and a slim gold band over the crown, mostly hidden under the hair with only
its ends showing on either side. These are pinned into the hair and touch it.
They are NOT a floating ring above her head.

Eyes: large, bright blue, clearly the focal point of the face. Deep blue outer
ring, lighter blue iris, a pale cyan glow inside it, and a white highlight.
Calm, serene expression, mouth small and closed.

Skin: pale and warm.

Outfit: a long floor-length dress with a dark indigo centre panel running from
the collar to the hem, flanked on both sides by wide cream-white robe panels
that open like a coat. A vertical gold band runs down the centre of the torso
with small round gold studs set along it. The shoulders are bare, with a dark
indigo shoulder piece trimmed in gold. Long wide cream sleeves, loose at the
wrist. Small four-pointed gold stars are scattered sparsely across the skirt
and sleeves. The skirt is split at the centre front, showing one leg.

Boots: ankle-height, dark near-black with pale cream trim.

DO NOT DRAW A HALO. The halo above her head is a separate image already in the
game and must not appear in this file.

CANVAS
viewBox="0 0 180 180". Nothing may fall outside it. The figure is centred
horizontally on x=90 and fills the height as follows. These landmarks matter,
because code is positioned against them:

  y=13   top of the head
  y=38   eye line
  y=62   shoulders
  y=95   waist
  y=125  hem of the skirt
  y=164  soles of the boots

Her right hand (the viewer's right, the casting hand) must have its palm
centred near x=118, y=75.

STRUCTURE
Wrap the drawing in exactly these groups, in this order, with these ids, and
put nothing outside them:

  <g id="hair-back">   hair falling behind the body
  <g id="boots">
  <g id="skirt">       skirt, robe panels, hem
  <g id="body">        torso, collar, gold band
  <g id="arm-left">    sleeve and hand
  <g id="arm-right">   sleeve and hand, this is the casting arm
  <g id="head">        face, eyes, ears, neck
  <g id="hair-front">  fringe, sidelocks, the two locks over the shoulders
  <g id="hair-accessory">  gold star pin, its hanging chains, the crown band

Each group must be self contained and must not rely on anything in another
group, because each one gets rotated and translated on its own.

DRAWING RULES, IMPORTANT
Use <path> elements only. Every path gets a plain flat fill colour.

No gradients, no filters, no masks, no clipPaths, no patterns, no <image>,
no <use>, no CSS, no style attribute, no opacity below 1. Allowed attributes:
d, fill, id. Nothing else.

Shading and glow get added afterwards in code, so flat colour is exactly what
is wanted. Build every shadow and highlight as a separate flat shape in a
darker or lighter tone from the palette, laid over the base shape. This is
cel shading, the way an anime cel is painted, never a gradient.

HOW MUCH DETAIL
Draw this at the quality of an official character key visual, not a chibi and
not a simplified icon. Aim for roughly 300 to 800 paths in total. Below that
it will look flat and cheap; far above it and it gets slow to render.

Spend the detail here, in this order of importance:

Eyes, the most important part of the whole drawing. Build each eye from at
least these separate shapes: the white of the eye, a thick dark upper lash
line, the outer iris ring in the deepest blue, the inner iris in mid blue, a
pale cyan glow in the lower half of the iris, a dark pupil, one large white
highlight in the upper area and one small white highlight opposite it. Add
the eyebrow as its own shape. Large, expressive, clearly anime.

Hair. Do not draw it as one silhouette. Break it into individual locks, each
lock its own path, and give the locks depth by using at least three of the
hair tones: a dark tone where locks pass behind others, a mid tone for the
body of each lock, and a light tone for the strands catching light along the
top of the head and the front edge of each lock. The fringe should read as
several separate pointed strands, not one block.

Outfit. Draw the folds. Each fold in the sleeves, the robe panels and the
skirt should be its own flat shape in a darker tone over the base colour.
Draw the gold band down the centre as a shape with the individual round studs
on top of it as separate circles. Draw the four-pointed gold stars as actual
four-pointed star shapes, sparse and scattered, not a repeating pattern.

Outline. Give the outer silhouette of the figure a thin dark line in the
outline colour, drawn as a filled path behind the shapes rather than as a
stroke attribute. Keep interior lines minimal, let the colour changes do the
work.

HOW TO WORK, THIS IS NOT OPTIONAL
Do not write the whole file in one pass and hand it over. You must draw, look
at what you drew, compare it against the reference image, and fix it, before
moving on. Use your code interpreter to render the SVG to a PNG and actually
look at the result at every checkpoint below.

Work in this order, one group at a time:

  1. head          6. arm-right
  2. hair-front    7. boots
  3. body          8. hair-back
  4. skirt         9. hair-accessory
  5. arm-left

After finishing each group:

  a. Render the SVG as it stands to a PNG and view it.
  b. Put it next to the reference image and compare that group specifically:
     shape, proportion, placement against the y landmarks listed above.
  c. If it does not match, fix it and render again. Repeat until it does.
  d. Only then start the next group.

State briefly what you checked and what you changed at each checkpoint.

Three things to look at hardest, because they are where this goes wrong:

  Hands. Count the fingers in your render. Five per hand, with a palm, reading
  as a hand and not as claws or spikes. If they look like spikes, redraw them.

  Hair. Look at whether it reads as curved overlapping locks tapering to
  points, or as straight parallel strips of equal width. If it looks like a
  curtain or like rows of scales, redraw it.

  Sleeves. They must hang downward under their own weight. If they spread out
  sideways like bat wings, redraw them.

  Fringe. Look at whether it reads as pointed strands of uneven length, or as
  one blunt line cut straight across the forehead. If it is a straight line,
  redraw it.

Draw hair-accessory last, once the head and fringe are settled, so the star
pin and its chains sit correctly against the hair that is already there.

When all nine groups are done, render the complete file one final time, look
at it as a whole, and fix anything that reads wrong before you output it.

FILE FORMAT
SVG 1.1, plain UTF-8 text, no byte order mark. The root element carries only
viewBox and xmlns. No width or height attribute, no <defs>, no <metadata>, no
comments, no editor namespaces. Round every coordinate to at most 2 decimal
places. It must open in a browser and render correctly on its own.

PALETTE, use these exact hex values and no others:
  hair         #4a4570  #6b6690  #9f9cc4  #e7e5f5  #fffdf8
  skin         #ffe3d4  #e3ac9d    blush  #f5b7c2
  eyes         #244f9d  #4f8fe0  #8ed6ff  #ffffff    eyelid #332b55
  cream robe   #b8b2ca  #e9e5ea  #fffaf0
  indigo dress #110f24  #292552  #403a78  #665ba1
  gold trim    #9b7131  #d8b35a  #fff0a3
  boots        #15142a  #292647  #ece7ef
  outline      #231f38

STYLE AND QUALITY
Clean anime vector illustration in the style of a modern gacha game character
sheet: crisp confident linework, flat cel shading with hard-edged shadows,
high contrast between the cream robe and the indigo dress.

Proportions: roughly seven and a half heads tall, slender, adult. Hands and
feet correctly proportioned and clearly drawn, not mittens or stumps. The face
symmetrical, both eyes the same size and on the same line. Nothing warped,
nothing melting, no extra fingers, no extra limbs.

Match the reference screenshot's design exactly: same silver-white hair at the
same length, same bright blue eyes, same indigo and cream outfit with gold
trim. This is the same character, not a reinterpretation of her.

Output the complete SVG file as text. No explanation, no markdown fence, just
the file.
```

---

## PHẦN 2: Vẽ xong lưu ở đâu

Lưu **đúng một file**, **đúng tên này**, **đúng thư mục này**:

```
C:\Users\Thien An Nguyen\SpaceShooter\misc\imagegen\kanade-body.svg
```

Tính từ gốc repo là `misc/imagegen/kanade-body.svg`.

Yêu cầu file:

- Đuôi **`.svg`**, là file text thuần, mở bằng Notepad phải đọc được chữ
  `<svg` ở đầu. Không phải PNG đổi tên, không phải SVG bọc ảnh bitmap bên
  trong (mở ra thấy `<image` hoặc `base64` là hỏng, phải làm lại).
- Encoding **UTF-8 không BOM**.
- Mở bằng trình duyệt phải hiện ra Kanade, không phải trang trắng.
- Dung lượng dự kiến khoảng **200 KB đến 1 MB**. Dưới 50 KB là vẽ quá sơ
  sài, trên 3 MB là chi tiết thừa, cả hai đều nên gen lại.
- Không kèm file nào khác.
- Nếu công cụ chỉ cho tải về Downloads thì cứ để đó rồi báo tôi đường dẫn,
  tôi tự chuyển vào đúng chỗ.

Xong báo tôi, tôi rút path data ra dựng `Path2D` và ráp vào cutscene.

---

## PHẦN 3: Vì sao các ràng buộc đó

### Vì sao viewBox 180x180

`GRID_W` và `GRID_H` trong `js/render/kanade-cutscene.js` đều là 180, và toàn
bộ code hiện tại vẽ trong hệ toạ độ đó. Giữ nguyên thì `poseFor`,
`blitSprite` và `handPos` không phải sửa dòng nào.

### Vì sao bàn tay phải nằm ở (118, 75)

`handPos()` đang trả đúng điểm đó cho tay ra chiêu, và đó là chỗ năng lượng
tím tụ lại trước khi Stack Overflow bắn ra. Lệch điểm này là hiệu ứng bắn ra
từ chỗ khác trên người cô, đúng cái lỗi đã sửa một lần rồi.

### Vì sao tách phụ kiện tóc thành nhóm riêng

Mái thẳng bằng cắt ngang trán là thứ làm khuôn mặt trông đơn điệu, nên prompt
vừa phá cái mái đó thành các sợi nhọn dài ngắn khác nhau, vừa thêm trâm sao
vàng và chuỗi rủ để có điểm nhìn.

Để riêng `hair-accessory` vì vàng là thứ duy nhất trên người cô có thể ánh
lên. Tách ra thì sau này tôi cho nó loé nhẹ theo nhịp, hoặc cho chuỗi đung
đưa trễ pha so với đầu, mà không phải đụng vào tóc. Gộp chung vào
`hair-front` là mất hẳn khả năng đó.

### Vì sao cấm vẽ halo

Halo là `assets/images/game/effects/kanade-halo.png`, vẽ riêng bằng
`drawHaloAt()`, và thứ tự của nó đổi theo hướng cô quay mặt: đứng trước mặt
thì halo nằm sau đầu, quay lưng thì halo nằm trước. Vẽ halo vào file này là
phá mất cơ chế đó.

### Vì sao cấm gradient và filter

Hai lý do. Thứ nhất, `Path2D` chỉ nhận hình dạng, mọi thứ trình bày do code
quyết định, nên gradient trong file sẽ bị vứt đi. Thứ hai, shading mềm hiện do
canvas làm và làm tốt; thứ cần ở bản vẽ là **đường nét**, đúng phần canvas làm
dở nhất.

### Vì sao phải chia nhóm rời nhau

Mỗi nhóm thành một `Path2D` riêng, xoay và dịch độc lập để tay vung, đầu
nghiêng, tóc và váy đung đưa trễ pha so với thân. Một nhóm dính vào nhóm khác
là mất hẳn khả năng đó.

### Vì sao nhắm 300 đến 800 path

Đo thật trên `misc/imagegen/kanade-full-body-reference.png` qua vtracer, ba
mức chi tiết:

| Mức | Dung lượng | Số path | Kết luận |
|---|---|---|---|
| Chi tiết | 6.8 MB | 12.578 | thừa, render chậm |
| Vừa | 3.2 MB | 2.436 | vẫn nặng |
| Tối giản | 1.5 MB | 638 | nhìn gần như bản gốc |

638 path đã đủ để không phân biệt được với ảnh gốc ở cỡ hiển thị trong game.
Nên khoảng 300 đến 800 là vùng hợp lý: dưới nữa thì bắt đầu mất nếp gấp và
lọn tóc, trên nữa thì chỉ tốn thêm chứ mắt không thấy khác.

### Đường thứ hai đã thử rồi

Vectorize `misc/imagegen/kanade-full-body-reference.png` bằng vtracer cho ra
638 path, 1.5 MB, nhìn gần như không khác bản gốc, và xoá nền rất sạch vì biên
vector là hình học chứ không phải pixel mờ. Nhược điểm là tạo hình bên đó khác
Kanade trong game, và chỉ có đúng một tư thế.
