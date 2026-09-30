# Nhiệm vụ: chấm nhịp cutscene Kanade và lập bảng nâng cấp cinematic

Gửi kèm 3 file:

- `kanade-cutscene-full-720p.mp4`: toàn cảnh, đúng cỡ gameplay 720p, 60fps.
- `kanade-cutscene-close-720p.mp4`: cùng cảnh, cắt cận quanh Kanade.
- `kanade-cutscene-sheet.png`: 15 khung chính, render 1080p.

---

## Vai trò

Bạn là đạo diễn hình ảnh cho cảnh tung chiêu trong anime/game. Đừng viết
code. Nhiệm vụ là **xem clip và lập bảng nhịp**: chỗ nào chưa đã mắt, sửa gì,
ở giây nào, cường độ bao nhiêu. Người lập trình (Claude) sẽ làm theo bảng.

Mục tiêu: cảnh phải "wow" như khoảnh khắc tung chiêu cuối trong anime, không
chỉ nhiều hiệu ứng. Bản hiện tại đã dày hiệu ứng nhưng người xem vẫn thấy
thiếu cao trào.

## Dòng thời gian thật (lấy từ code)

| Giây | Beat | Chuyện gì xảy ra |
|---|---|---|
| 0.0 đến 1.2 | freeze | thời gian ngưng đọng lan ra từ một điểm, viền haki tím có sét, tia sáng |
| 1.2 đến 2.1 | gate | cổng dịch chuyển xé mở theo chiều ngang, bụi tím, glitch, lens flare |
| 2.1 đến 4.0 | walkOut | Kanade bay ra khỏi cổng về chỗ đứng; cổng đóng từ 3.43s |
| 4.0 đến 5.8 | think | đứng suy nghĩ, bong bóng "...", mắt nhắm dịu |
| 5.8 đến 7.6 | summon | 5.80 lấy đà; 5.90 mắt nhắm, đổi sang smirk; 5.96 đến 6.61 giơ tay; 6.52 Goliath xuất hiện; tụ năng lượng tới cuối beat |
| 7.6 đến 10.0 | cast | charge tăng tiếp; **8.20 phép nổ**; banner "STACK OVERFLOW" hiện dần 8.20 đến 8.65; hạ tay 8.51 đến 9.40; tóc và áo lắng lại |
| 10.0 đến 11.8 | leave | chớp sáng quay lưng khoảng 10.3s, cổng mở lại, bay về cổng |
| 11.8 đến 12.9 | close | cổng đóng, thế giới trở lại |

## Hiệu ứng đang có (đừng đề xuất lại, có thể đề xuất chỉnh)

- **Toàn cảnh:** letterbox, nền tối nhẹ và vignette spotlight theo Kanade,
  backlight và vệt sáng dưới chân, khung hình ngả tím khi tụ lực, cánh hoa
  anh đào bay.
- **Freeze:** viền haki tím sôi như lửa, sét chạy dọc viền, tia sáng từ tâm.
- **Cổng:** ảnh thế giới số (khối vuông đen viền đỏ) xoay bên trong, khối
  vuông bay ra, viền phân đoạn, vệt quét sáng, ký tự, mạch điện, vòng dữ
  liệu; mở và đóng theo chiều ngang, viền vẽ dần, glitch, bụi tím.
- **Vòng quanh Kanade:** ký tự, sao 8 cánh, cung gạch, chấm quay có đuôi,
  sáng theo charge.
- **Tụ lực:** aura haki bốc lên, vệt năng lượng hút vào, vòng haki co vào
  người, dòng năng lượng chảy vào lòng bàn tay, sét quanh người và từ vòng
  phép vào tay, lens flare ở tay, ánh tím trên tay, má và mép tóc, tóc lay
  mạnh và nâng lên, sợi tóc hất lên.
- **Phép nổ (8.2s):** chớp tím toàn màn hình khoảng 0.2s, tia sáng, 3 vòng
  sóng áp lực, vạch áp lực, sét phóng từ lòng bàn tay, lens flare ngang màn
  hình, đầu và vai giật lùi nhẹ, tóc bị hất.
- **Tiêu đề:** chữ kiểu Dark Souls, vàng xương, phóng to chậm.

## Ý tưởng đang cân nhắc (chấm từng cái: nên, không nên, hoặc sửa gì)

1. Máy quay zoom từ từ vào Kanade 6 đến 8% trong lúc tụ lực, giật ra lúc nổ,
   kèm rung màn hình khoảng 0.3s.
2. Hit-stop khoảng 100ms đúng lúc nổ, kèm 1 đến 2 frame âm bản.
3. Cut-in: dải ngang cận đôi mắt phát sáng trượt vào khoảng 0.6s trước lúc nổ.
4. Vạch tập trung kiểu manga dồn về Kanade trong 0.5s cuối lúc tụ lực.
5. Mắt sáng tím dần theo charge, lóe sáng ngay trước khi nổ.
6. Ở đỉnh charge, tóc bay hẳn lên, đầu lọn tỏa sợi năng lượng.
7. Vệt sáng vẽ theo quỹ đạo bàn tay khi giơ tay.

## Ràng buộc kỹ thuật

- Canvas 2D, phong cách cel phẳng. Không blur toàn màn hình, không bộ lọc
  (`filter`) toàn màn hình, không tạo gradient mới mỗi frame.
- Phải mượt 60fps trên máy thường; mức đồ họa thấp được phép bỏ bớt.
- Ảnh chiến trường đang đóng băng phía sau không zoom hay rung theo được (nó
  bị phủ tối 86% và bị video nền che, nên lệch nhẹ không lộ).
- Tổng thời lượng có thể đổi tối đa khoảng ±1s nếu thật sự cần. Mốc
  Goliath xuất hiện và mốc phép nổ đang gắn với âm thanh, dời thì ghi rõ.
- Nhân vật và khuôn mặt đã khóa, không đề xuất vẽ lại.

## Cách trả lời

1. **Nhận xét nhanh** (tối đa 5 dòng): cảm giác chung, chỗ hụt lớn nhất.
2. **Bảng nhịp**, tối đa 8 dòng, xếp theo mức tác động:

   | # | Giây bắt đầu đến kết thúc | Vấn đề | Thêm hoặc đổi gì | Thông số cụ thể | Ưu tiên |
   |---|---|---|---|---|---|

   Thông số phải đo được, ví dụ: zoom 7% ease-in 1.2s, rung 8px ở 1080p
   tắt dần trong 0.3s, dừng hình 90ms, dải cut-in cao 22% màn hình trượt vào
   trong 120ms.
3. **Chấm 7 ý tưởng ở trên**: mỗi cái một dòng (nên, không nên, sửa gì).
4. **Một thứ bạn sẽ bỏ đi** nếu thấy đang thừa hoặc làm rối khung hình.

Xem cả hai clip trước khi trả lời. Nếu không mở được video, nói rõ và chấm
dựa trên sheet 15 khung.
