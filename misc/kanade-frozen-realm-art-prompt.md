# Frozen realm backdrop: art prompt

Ảnh nền mờ cho không gian ngưng đọng của Kanade: một toà thành lơ lửng giữa
hố đen, xung quanh là các khối đen viền đỏ đang bị ăn mòn dữ liệu. Ảnh nằm
**dưới** toàn bộ hiệu ứng hiện tại (lớp phủ, lưới thời gian, mảnh sáng, cổng,
vòng spell) và không thay thế thứ gì cả.

---

## PHẦN 1: Copy đoạn dưới đây đưa cho ChatGPT

Chỉ copy đúng khối trong khung, không copy gì khác trong file này.

```
Create a single wide landscape image, 1536 x 1024 pixels.

A colossal derelict citadel hanging motionless in the void, seen from a
distance.

The citadel: a vast gothic-brutalist fortress of black stone and dark metal,
inverted and asymmetric, its lower spires trailing off into broken fragments
that hang suspended where they fell. Long dead windows, no lights inside. It
reads as something abandoned for a very long time.

Behind it: the accretion disk of a black hole, a thin blazing ring of
violet-white light seen nearly edge-on, with the event horizon a perfect
circle of absolute black at its centre. Light from the disk bends around the
horizon in a lensing arc. The disk is the only real light source and it rims
the citadel from behind.

Around the citadel: dozens of floating black cubes and rectangular slabs of
varying size, drifting in slow orbit. Their edges glow hot red, as if burning
from within along the seams. Some are already half eaten away, dissolving into
small drifting shards and scattered pixel-like debris. The corruption reads as
information decay: clean geometric blocks breaking apart into data fragments,
some edges fraying into scan-line artefacts and thin red glitch bands.

Palette: near-black background, deep violet and indigo mid-tones, violet-white
for the accretion disk, and saturated crimson red confined to the cube edges
and the glitch artefacts. No other colours.

Composition, important: place the citadel in the RIGHT-OF-CENTRE area, roughly
58 to 92 percent across the frame and 22 to 58 percent down from the top.
Leave the left half comparatively empty and dark. Keep everything important
inside the middle 65 percent of the image height, between 18 and 82 percent
down, because the top and bottom will be cropped. Keep the outer edges of the
frame simple and uncluttered.

Style: painterly digital matte painting, high detail, strong contrast, clean
rendering. Not blurry, not hazy, not soft focus, not foggy. No text, no
letters, no logos, no watermark, no signature, no characters, no people, no
creatures, no UI elements, no border, no frame.

1536 x 1024, landscape.
```

---

## PHẦN 2: Vẽ xong lưu ở đâu

Lưu **đúng một file**, **đúng tên này**, **đúng thư mục này**:

```
C:\Users\Thien An Nguyen\SpaceShooter\assets\images\game\effects\frozen-realm.jpg
```

Tính từ gốc repo thì là `assets/images/game/effects/frozen-realm.jpg`.

Yêu cầu file:

- **Định dạng JPG**, không phải PNG. Ảnh phủ kín khung nên không cần nền trong
  suốt, mà PNG ở cỡ này sẽ nặng 3 đến 5 MB.
- **Chất lượng khoảng 85**, nhắm **dưới 600 KB**. Tham chiếu có sẵn trong
  repo: `assets/images/game/effects/yog-sothoth-starry-night.jpg` nặng 476 KB.
- Kích thước giữ nguyên **1536 x 1024**. ChatGPT trả ảnh PNG thì đổi sang JPG
  rồi mới lưu.
- Tên file phải khớp chính xác, code sẽ tìm đúng chuỗi đó.

Lưu xong báo tôi, tôi ráp vào cutscene.

---

## PHẦN 3: Vì sao lại là các con số đó (không cần đọc nếu không quan tâm)

### Chỉ cần một ảnh

`manifest.json` khoá `"orientation": "landscape"`, và code đã xử lý sẵn cho
điện thoại xoay ngang, nên mọi thiết bị đều chơi ngang. Không cần bản dọc.

### Vì sao vùng an toàn là 18 đến 82 phần trăm chiều cao

Ảnh được vẽ kiểu **cover**: phủ kín màn hình rồi cắt phần thừa. Hai tỉ lệ màn
hình thực tế khác nhau khá nhiều:

| | độ phân giải | tỉ lệ | cắt mất |
|---|---|---|---|
| PC | 1280 x 720 | 1.78 | 16% chiều cao |
| Điện thoại ngang | 844 x 390 | 2.16 | 31% chiều cao |

Phần còn lại chung cho cả hai là 69% chiều cao ở giữa. Lấy chặt hơn một chút
cho an toàn thành 18% đến 82%. Bất cứ thứ gì nằm ngoài dải đó sẽ bị cắt mất
trên điện thoại.

### Vì sao toà thành lệch sang phải chứ không ở giữa

Số liệu lấy từ `layout()` trong `js/render/kanade-cutscene.js`:

- Kanade đứng ở **37% bề ngang**, tâm ở **52% chiều cao**, vòng spell quanh cô
  bán kính khoảng **31% chiều cao**. Vùng x 12%-62% bị cô và vòng che kín.
- Cổng ở **66% bề ngang**, cùng chiều cao đó.
- Băng thông báo chiếm dải trên cùng tới **25% chiều cao** khi cô ra chiêu.

Đặt toà thành giữa khung thì Kanade che gần hết. Lệch sang phải thì nó nằm
ngay sau cổng, thành ra cổng mở ra trước toà thành, hợp với ý đồ.

### Vì sao cấm ảnh mờ

Ảnh sẽ được vẽ ở **khoảng 25% opacity** trên nền đã tối sẵn. Nếu ChatGPT trả
về một ảnh vốn đã mờ và nhạt, cộng thêm lần mờ nữa là biến mất sạch. Ảnh gốc
cần tương phản mạnh, viền đỏ thật rực, khối thật đen. Chuyện mờ để code lo.

### Sau khi có ảnh thì tôi làm gì

Chèn trong `drawKanadeCutscene`, ngay **sau** `drawFreezeWash` và **trước**
`drawVignette`, để nó nằm trên lớp phủ nhưng dưới mọi thứ còn lại. Vẽ kiểu
cover, căn giữa. Opacity bám theo `reach` của mặt sóng để toà thành hiện ra
đúng lúc không gian ngưng đọng lan tới chứ không bật sẵn. Bỏ hẳn ở tầng đồ
hoạ thấp nhất vì đây là ảnh full màn hình. Thêm vào precache của
`js/offline.js` và `sw.js` kèm bump `CACHE_VERSION`.

---

## PHẦN 4: Prompt Veo, biến ảnh tĩnh thành video loop

Dùng chế độ **image-to-video**, đưa chính file `frozen-realm.jpg` vào làm ảnh
gốc. Không phải text-to-video, nếu không nó sẽ vẽ lại một toà thành khác.

Chỉ copy đúng khối trong khung:

```
Animate this image. Locked-off static camera. No pan, no zoom, no push-in,
no dolly, no parallax, no camera shake. The framing is identical in the first
and last frame.

The black hole is alive and is the focus of all motion. Its accretion disk
rotates continuously and visibly around the event horizon, the bright ring
streaming and churning along its length with hot filaments moving through it.
Its light pulses and breathes, brightening and dimming across the shot, and
the lensed arc of light bending around the black sphere shimmers and warps as
the disk turns. The event horizon itself stays a perfect still black circle.

Every floating black cube and slab is drifting. None of them are static: each
one moves slowly through the void on its own path and tumbles gently as it
goes, rotating a few degrees. The red glow along their edges flickers and
pulses, brighter and dimmer, and thin red glitch bands crawl along the seams
at irregular intervals like data corruption spreading. Small shards and
pixel-like fragments break off the corroding blocks and drift away into the
dark. Faint dust and embers drift slowly through the whole frame.

The citadel itself hangs completely motionless, as if time around it has
stopped. It is the one still thing in the shot.

The cubes stay entirely within frame and never pass in front of the citadel's
silhouette. Nothing enters or leaves the frame. No people, no creatures, no
ships, no new objects. No text, no captions, no subtitles, no logos, no
watermark, no UI. Completely silent: no audio, no music, no sound effects,
no ambience.
```

### Cài đặt

- Tỉ lệ **16:9**, khớp với 1536 x 1024 của ảnh gốc và với `"orientation":
  "landscape"` trong `manifest.json`
- Độ dài mặc định 8 giây là đủ, ping-pong xong thành 16 giây
- Tắt audio nếu giao diện có nút đó. Veo 3 mặc định tự sinh tiếng, mà prompt
  đã ghi silent nhưng nút vẫn chắc hơn chữ

### Vì sao chia rõ cái gì động, cái gì tĩnh

Veo hiểu "very slowly" thành "gần như đứng yên", nên bản đầu ra các khối gần
như bất động và hố đen chỉ sáng lên tắt đi. Prompt giờ nói thẳng hố đen là tâm
của mọi chuyển động và **không khối nào được đứng yên**, mô tả từng thứ chúng
làm (trôi, lật nhẹ, viền đỏ nhấp nháy, vệt glitch bò dọc mép, mảnh vỡ tách ra)
thay vì gộp chung một câu.

Toà thành vẫn phải đứng im, và giờ prompt nói rõ nó là thứ duy nhất đứng im.
Đó là điểm neo của cả cảnh: mọi thứ quanh nó rã ra trong khi bản thân nó bị
đóng băng.

### Vì sao prompt khoá chặt camera

Veo rất thích tự thêm push-in chậm. Camera trôi một chút là hỏng cả hai việc:
bố cục lệch khỏi vùng an toàn 18% đến 82% mà ảnh được vẽ theo, và khung cuối
không còn khớp khung đầu nên ping-pong sẽ giật.

Cũng vì thế mà prompt cấm mọi thứ đi vào hoặc ra khỏi khung. Một khối trôi ra
ngoài rồi biến mất là một chi tiết không thể khớp lại khi lặp.

### Loop

Veo không tạo loop khít, khung cuối gần như chắc chắn lệch khung đầu. Gen xong
đưa file cho tôi, tôi ghép **ping-pong** bằng ffmpeg: phát xuôi rồi phát ngược,
khít tuyệt đối vì khung cuối của chiều này đúng là khung đầu của chiều kia.
Chuyển động trôi lơ lửng rất hợp kiểu này, xem ngược cũng không nhận ra.
