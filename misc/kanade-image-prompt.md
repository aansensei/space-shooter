# Kanade: prompt gen ảnh nguồn để vectorize

Ảnh này **không dùng trực tiếp trong game**. Nó là nguyên liệu: gen ra PNG,
tôi trace thành vector, tách nhóm, rồi ráp vào `js/render/kanade-cutscene.js`
thay cho gần 500 dòng vẽ tay hiện tại.

Vì đích đến là vector nên ảnh phải vẽ theo kiểu **dễ trace**, khác hẳn một
ảnh minh hoạ đẹp thông thường. Phần lớn ràng buộc bên dưới là vì lý do đó,
không phải vì thẩm mỹ.

---

## PHẦN 1: Copy đoạn dưới đây đưa cho công cụ gen ảnh

Đính kèm ảnh chụp Kanade đang đứng trong cutscene làm tham chiếu tạo hình.
Nếu công cụ có chế độ image-to-image hoặc character reference thì **bật lên**
và để độ bám tham chiếu ở mức cao, để giữ đúng nhân vật.

```
Full body anime character illustration, flat cel shading, clean vector-style
artwork, front view, standing straight, facing the viewer.

CHARACTER
A tall slender otherworldly young woman.

Hair: silver-white, very long, falling past the hips. Two thick locks fall
forward over the shoulders down the front of the body. The rest falls behind
her. The hair is drawn as distinct curved locks that taper to points,
overlapping each other at different lengths, never as straight parallel strips
of equal width.

The fringe must NOT be a blunt straight line across the forehead. Break it
into pointed strands of uneven length, a little longer toward the outside,
with one or two strands falling loose and slightly off to one side. Add longer
sidelocks framing the face down past the jaw.

HAIR ACCESSORY
She wears gold hair ornaments, matching the gold trim on her dress:

A four-pointed gold star ornament pinned into the hair on the left side of her
head (the viewer's left), sitting where the fringe meets the sidelock, small
enough to read as jewellery rather than a crown.

From that ornament, two or three fine gold chains hang down along the side of
her face, each ending in a tiny gold bead or a small pale violet gem.

A slim gold band running back over the crown of the head, mostly hidden under
the hair, with only its ends visible emerging on either side.

These are pinned into the hair and touch it. They are NOT a floating ring
above her head and must not be drawn as one.

Eyes: large bright blue anime eyes, deep blue outer ring, lighter blue iris, a
pale cyan glow in the lower half, dark pupil, one large and one small white
highlight. Calm serene expression. Small closed mouth. A simple small nose.
Soft natural eyebrows.

Skin: pale and warm.

Outfit: a long floor-length dress. A dark indigo centre panel runs from the
collar to the hem, flanked on both sides by wide cream-white robe panels that
hang open like a coat. A vertical gold band runs down the centre of the torso
with round gold studs set along it. Bare shoulders with a dark indigo shoulder
piece trimmed in gold. Long wide cream sleeves that hang DOWNWARD under their
own weight, draping toward the floor, not spread out horizontally. Small
four-pointed gold stars scattered sparsely across the skirt and sleeves. The
skirt is split at the centre front showing one leg.

Boots: ankle-height, dark near-black with pale cream trim, both fully visible.

POSE
Standing upright, weight even on both feet, arms held a little away from the
body so they do not touch or overlap the skirt. Both hands open and clearly
visible with five distinct fingers each, drawn as real hands with a palm and
visible knuckles. The hands must read as hands, not as claws or spikes.

COLOURS
Silver-white and lavender-grey hair, pale warm skin, bright blue eyes, cream
white robe panels, dark indigo dress, gold trim, near-black boots.

CRITICAL RENDERING REQUIREMENTS
Flat plain background in solid chroma green (#00B140), completely uniform,
one single colour edge to edge.

Cel shading with hard-edged shadows: each shadow is a flat block of a darker
tone with a crisp boundary. No soft gradients anywhere, no airbrushing, no
smooth colour blending, no ambient occlusion.

No glow, no bloom, no light rays, no lens flare, no floating particles, no
sparkles in the air, no magic effects, no aura.

No depth of field, no blur, no motion blur. Everything in sharp focus.

No paper texture, no canvas texture, no noise, no film grain, no halftone.

No halo or ring above her head.

No text, no watermark, no signature, no logo, no UI, no border, no frame.

FRAMING
Full body from the top of the head to below the soles of the boots, nothing
cropped. The figure centred, standing vertically, with a small margin of
background above the head and below the feet. Portrait orientation.
```

---

## PHẦN 2: Cài đặt và chỗ lưu

**Kích thước:** dọc, khoảng **1024 x 1536**, hoặc tỉ lệ 2:3 bất kỳ từ 832x1248
trở lên. Càng lớn thì trace càng bắt được nếp gấp, nhưng trên 2048 là thừa.

**Định dạng:** PNG. Không JPG, vì JPG tạo nhiễu quanh viền và trace sẽ bắt cả
nhiễu đó thành path rác.

Lưu **đúng tên này, đúng thư mục này**:

```
C:\Users\Thien An Nguyen\SpaceShooter\misc\imagegen\kanade-body-source.png
```

Tính từ gốc repo là `misc/imagegen/kanade-body-source.png`.

Nếu công cụ chỉ cho tải về Downloads thì cứ để đó rồi báo tôi, tôi chuyển.

**Gen vài bản rồi chọn.** Thứ cần nhìn kỹ trước khi chốt, theo thứ tự:

1. **Hai bàn tay.** Có đủ năm ngón, có lòng bàn tay, không dính thành cục và
   không xoè ra như vuốt. Đây là chỗ hỏng thường xuyên nhất.
2. **Tóc.** Là những lọn cong thuôn nhọn chồng lên nhau, không phải các dải
   thẳng song song đều nhau.
3. **Mái và phụ kiện.** Mái phải là các sợi nhọn dài ngắn khác nhau chứ không
   phải một đường bằng cắt ngang trán. Trâm sao vàng nằm gọn một bên đầu,
   chuỗi vàng rủ dọc mặt. Nếu nó vẽ thành vòng lơ lửng trên đầu thì sai, đó
   là halo, phải gen lại.
4. **Nền.** Xanh lá phẳng tuyệt đối, không có vệt sáng tối, không có bóng đổ
   của nhân vật hắt lên nền.
5. **Bóng đổ trên người.** Là mảng phẳng cạnh sắc, không phải chuyển màu mềm.
6. **Bàn chân.** Không bị cắt mất ở mép dưới.

---

## PHẦN 3: Vì sao các ràng buộc đó

### Vì sao cấm gradient, glow, blur, noise

Đây là ràng buộc quan trọng nhất và cũng dễ bị bỏ qua nhất.

Trace hoạt động bằng cách gom các vùng cùng màu thành một hình. Một chuyển màu
mềm không có vùng cùng màu nào cả, nên nó bị băm thành hàng chục dải mỏng, mỗi
dải một path. Đo thật hôm qua trên một ảnh có nhiều chuyển màu mềm: mức chi
tiết cao cho ra **12.578 path và 6.8 MB**, trong khi cùng ảnh đó ép về ít màu
chỉ còn **638 path và 1.5 MB** mà nhìn gần như không khác.

Glow, bloom và hạt sáng cũng vậy, mỗi thứ đều là chuyển màu mềm. Mà những hiệu
ứng đó thì canvas trong game đã tự làm rồi và làm tốt, nên vẽ vào ảnh là vừa
thừa vừa làm hỏng bản trace.

### Vì sao nền xanh lá chứ không phải trắng

Áo choàng của Kanade màu trắng kem. Nền trắng thì chỗ tà áo chạm biên sẽ dính
liền vào nền và không tách ra được. Xanh lá không xuất hiện ở bất kỳ đâu trên
người cô nên tách sạch.

### Vì sao tay áo phải rủ xuống

Bản SVG thử trước đó vẽ tay áo xoè ngang như cánh dơi, rộng gần bằng cả người,
và đó là một trong những chỗ nhìn kì nhất. Tay áo vải nặng thì rủ theo trọng
lực.

### Vì sao tay phải tách khỏi váy

Mỗi bộ phận sẽ thành một nhóm riêng để xoay độc lập, nhờ đó tay vung được và
`handPos()` biết chính xác bàn tay ở đâu. Tay chạm vào váy thì lúc tách nhóm
sẽ dính vào nhau, phải cắt tay và vá lại phần váy bị che.

### Vì sao cấm vẽ halo

Halo là `assets/images/game/effects/kanade-halo.png`, vẽ riêng bằng
`drawHaloAt()`, và thứ tự của nó đổi theo hướng cô quay mặt: nhìn thẳng thì
halo nằm sau đầu, quay lưng thì halo ra trước. Vẽ sẵn vào ảnh là hỏng cơ chế
đó.

### Ảnh này còn dùng làm mốc kiểm tra

Ngoài việc để trace, file PNG này là **ảnh tham chiếu cho
`misc/kanade-svg-prompt.md`**. Prompt bên đó bắt model vừa vẽ vừa render ra
PNG rồi so với ảnh này, từng bộ phận một, chỉ qua bộ phận sau khi bộ phận
trước đã khớp. Không có ảnh này thì mất cơ chế tự sửa, và kết quả sẽ lại ra
tóc như rèm cửa với bàn tay như vuốt, đúng như lần thử đầu.

Nên dù cuối cùng chọn đường trace hay đường vẽ SVG, gen ảnh này trước đều có
ích.

### Sau khi có ảnh thì tôi làm gì

Trace bằng vtracer ở mức ít màu, xoá nền xanh bằng flood fill từ biên, khử ám
xanh ở rìa tóc, cắt sát, tách thành tám nhóm theo bộ phận, rồi dựng thành
`Path2D` nhét vào `js/render/kanade-cutscene.js`. Cấu trúc nhóm đã có sẵn
khuôn từ `misc/imagegen/kanade-body.svg`, phần đó ChatGPT làm đúng rồi.
