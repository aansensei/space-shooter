# Nhiệm vụ: vẽ lại khuôn mặt Kanade trong một file riêng

Đưa nguyên file này cho agent, kèm ảnh concept khuôn mặt và sheet
`tmp/kanade-face.png` hiện tại.

---

## Bối cảnh

Game `SpaceShooter` (HTML5 canvas, JavaScript thuần, không build step).
Kanade là nhân vật 2D vẽ hoàn toàn bằng code trong
`js/render/kanade-cutscene.js`. Toàn thân, tóc, cổ, tay và cutscene đã
hoàn thiện và đã khóa. Việc duy nhất của bạn là **thiết kế và vẽ lại các
chi tiết trên khuôn mặt** (mắt, lông mày, mũi, miệng, má hồng) sao cho đẹp
nhất có thể, theo ảnh concept đi kèm.

## Luật cứng

1. **KHÔNG sửa bất kỳ file nào đang có trong repo.** Không sửa
   `js/render/kanade-cutscene.js`, không sửa `index.html`, `sw.js`,
   `js/offline.js`, không sửa công cụ trong `misc/dev-tools/`.
2. **Chỉ tạo đúng một file mới: `js/render/kanade-face.js`.** Mọi code của
   bạn nằm trong file đó. Việc nối file vào game sẽ do người khác làm.
3. Không thêm thư viện, không tải ảnh, không dùng font. Chỉ vẽ bằng canvas
   2D qua các hàm được cấp (xem phần API).
4. Không động vào viền mặt (contour), cằm, cổ, tóc mái, tóc hai bên, ahoge.
   Chúng được vẽ ngoài module của bạn và đã khóa.

## File cần đọc trước

Trong `js/render/kanade-cutscene.js` (số dòng tại commit hiện tại, có thể
lệch vài dòng):

| Dòng | Nội dung |
|---|---|
| 102 | `PAL`: bảng màu |
| 119 | `STROKE`: các độ dày nét chuẩn |
| 133 đến 330 | hàm vẽ cơ bản: `poly`, `ellipse`, `line`, `bezierLine`, `bezierShape`, `smoothOutline`, `tracePath`, `ellipseF` |
| 334 | `drawSimpleEye`: mắt hiện tại (mí, mi, tròng, catchlight, blink, gaze) |
| 421 đến 452 | `BROW_SHAPES`, `drawBrow`: lông mày |
| 454 đến 476 | `drawMouth`, `drawMouthShape`: miệng |
| 477 đến 489 | `EXPRESSIONS`, `OPEN_EYE_FAMILY` |
| 744 | `drawFaceFeatures`: toàn bộ khuôn mặt hiện tại (bản bạn thay thế) |
| 777 đến 798 | `FACE_API`, `drawFace`: chỗ file của bạn được gọi |
| 1370 | `fringe`: tóc mái (để biết phần nào của mặt bị che) |

## Hợp đồng (contract)

File của bạn phải có dạng:

```js
// js/render/kanade-face.js
(function () {
  function drawFeatures(api, face) {
    // vẽ mắt, lông mày, mũi, miệng, má hồng ở đây
  }
  window.KanadeFace = { drawFeatures };
})();
```

Game gọi `drawFeatures(api, face)` mỗi lần vẽ lại sprite mặt trước.

**`face`** (chỉ đọc):

| Trường | Ý nghĩa |
|---|---|
| `expression` | tên biểu cảm: `neutral`, `serene`, `smug`, `happy`, `surprised`, `angry`, `sad`, `pain`, `thinking`, `determined` |
| `eye` | kiểu mắt theo `EXPRESSIONS`: `open`, `narrow`, `wide`, `up`, `droop`, `soft`, `happy`, `shut` |
| `brow` | kiểu lông mày: `flat`, `raised`, `down`, `angryIn`, `sadIn` |
| `mouth` | kiểu miệng: `neutral`, `soft`, `smirk`, `smile`, `flat`, `frown`, `open`, `tense` |
| `openEye` | true nếu kiểu mắt thuộc nhóm mắt mở (chỉ nhóm này mới blink và gaze) |
| `blink` | 0..1, 0 là mở, 1 là nhắm hẳn (luôn 0 khi `openEye` là false) |
| `gazeX`, `gazeY` | -1..1, hướng nhìn (luôn 0 khi `openEye` là false) |

Bạn được tự do đọc `expression` để vẽ riêng từng biểu cảm, không bắt buộc
dùng `eye`/`brow`/`mouth`.

**`api`**:

| Thành viên | Dùng để |
|---|---|
| `ctx` | context 2D của sprite; đã được `save()` trước khi gọi bạn và `restore()` sau |
| `PAL`, `STROKE` | bảng màu và độ dày nét |
| `bezierShape`, `bezierLine`, `line`, `poly`, `ellipse`, `ellipseF`, `smoothOutline`, `tracePath` | hàm vẽ giống hệt phần còn lại của nhân vật |
| `drawEye`, `drawBrow`, `drawMouth` | các phần của khuôn mặt hiện tại, nếu muốn giữ phần nào |
| `drawDefaultFeatures(face)` | vẽ nguyên khuôn mặt hiện tại |

`ellipse` làm tròn bán kính về số nguyên; dùng `ellipseF` cho bán kính lẻ.

## Hệ tọa độ

- Đơn vị là **grid unit**. Sprite là lưới 180 × 180. Ở 1080p nhân vật hiện
  540px, tức 3px mỗi unit; ở 720p là 2px mỗi unit. Chi tiết nhỏ hơn khoảng
  0.4 unit sẽ không thấy được.
- Bạn vẽ bên trong nhóm đầu: đầu đã được xoay nhẹ quanh điểm (92, 50) trước
  khi gọi bạn. Chỉ cần vẽ theo tọa độ thẳng như bên dưới.
- Trục x sang phải, y xuống dưới. Trục giữa mặt là x = 92.

Các mốc của khuôn mặt hiện tại:

| Phần | Vị trí |
|---|---|
| Lòng mặt (đã vẽ sẵn, màu `PAL.skin`) | trái x 81, phải x 103 ở y 32; cằm (92, 47.8) |
| Mép tóc mái (vẽ sau bạn, che phía trên) | tip lọn ở (83.4, 34.0), (88.9, 32.4), (93.2, 35.3), (101.3, 34.1); khe giữa lọn khoảng y 29.6 đến 29.9 |
| Tóc hai bên (vẽ sau bạn) | che x < khoảng 81 và x > khoảng 103 |
| Mắt | tâm (88, 38) và (96, 38); ellipse 2.12 × 1.9 |
| Lông mày | khoảng y 34 đến 35, x 85 đến 89 và 95 đến 99 (đối xứng qua x = 92), một phần nằm dưới tóc mái |
| Mũi | quanh (92.3, 42.1) |
| Miệng | tâm khoảng (92, 45.3) |
| Má hồng | tâm (83.6, 41.2) và (100.4, 41.2) |

Mọi chi tiết phải nằm trong lòng mặt và dưới y 29.5; phần nào nằm trên mép
tóc mái sẽ bị tóc che mất.

## Yêu cầu chất lượng

- Theo ảnh concept đi kèm: kiểu anime, mắt to trong, catchlight rõ, mi trên
  đậm có đuôi, mặt dịu.
- Phong cách **cel phẳng**: mảng màu phẳng, không gradient, không blur,
  không `shadowBlur`, không `globalAlpha` lên cả mặt. Muốn sắc độ thì dùng
  màu khác.
- Ưu tiên màu trong `PAL`. Nếu thật sự cần màu mới, khai báo hằng ở đầu file
  của bạn kèm một dòng giải thích.
- Phải đọc rõ ở cỡ gameplay (2 đến 3px mỗi unit), không chỉ ở ảnh phóng to.
- Blink phải đóng mắt tự nhiên từ `blink = 0` tới `1`, không nhảy hình.
  Gaze dời tròng và catchlight trong phạm vi mắt, không lòi ra ngoài.
- Mọi biểu cảm trong danh sách phải có hình. Cutscene dùng nhiều nhất là
  `neutral` (bước ra), `serene` (suy nghĩ) và `smug` (triệu hồi, thi triển,
  rời đi).

## Ràng buộc kỹ thuật

- **Hàm thuần**: cùng `face` phải vẽ ra đúng cùng một hình. Không đọc
  đồng hồ (`performance.now`, `Date`), không dùng `Math.random`, không lưu
  trạng thái giữa các lần gọi. Sprite được cache theo đầu vào; đọc đồng hồ
  sẽ làm mặt đứng hình hoặc nhấp nháy.
- Không tạo canvas, gradient hay ảnh trong lúc vẽ.
- Nhẹ: giữ số path cùng cỡ với khuôn mặt hiện tại (khoảng 40 đến 80 lệnh vẽ).
  Mặt được vẽ lại mỗi khi blink hoặc gaze đổi.
- Không ghi vào `window` gì khác ngoài `window.KanadeFace`.
- Nếu hàm của bạn ném lỗi, game tự quay về khuôn mặt cũ và ghi log một lần;
  đừng dựa vào điều đó.

## Tự kiểm tra

Cần Node và `npm install @napi-rs/canvas --no-save`, rồi:

```
FACE=js/render/kanade-face.js OUT=face-new.png node misc/dev-tools/render-face.js
OUT=face-old.png node misc/dev-tools/render-face.js
node --check js/render/kanade-face.js
```

Sheet gồm mọi biểu cảm, blink từ mở tới nhắm, gaze 7 hướng, và toàn thân
ở cỡ gameplay. So sánh `face-new.png` với `face-old.png`.

## Bàn giao

1. File `js/render/kanade-face.js`.
2. Sheet `face-new.png` từ lệnh trên.
3. Vài dòng mô tả: ý tưởng thiết kế, màu mới (nếu có), biểu cảm nào đã
   đổi so với bản cũ.
