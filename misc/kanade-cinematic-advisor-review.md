# Đánh giá cinematic Kanade

AanSensei, đây là bảng chỉ dẫn hình ảnh cho Claude. Không yêu cầu sửa thiết kế nhân vật hoặc khuôn mặt.

Cơ sở đánh giá: hai clip full và close trong ZIP, đều 1280 × 720, 60fps, dài 12,917s; sheet 15 khung. Tôi không phát video liên tục trong phiên này. Tôi giải mã cả hai clip thành chuỗi khung hình bao quát toàn cảnh, lấy mẫu dày hơn ở đoạn tụ lực và cách nhau 50ms quanh phép nổ. Các clip không có luồng âm thanh. Kết luận về bố cục và độ che mặt có căn cứ hình ảnh; cảm giác chuyển động liên tục và đồng bộ âm thanh cần được xem lại sau khi thực hiện.

## 1. Nhận xét nhanh

Cảnh có bản sắc tím và thế giới số rõ, cổng đủ hấp dẫn để giữ lại.
Ở toàn cảnh, vòng phép chiếm chú ý nhiều hơn Kanade; bố cục tụ lực thay đổi ít.
Điểm hụt lớn nhất là trước và sau 8,20s cùng dùng nhiều ánh tím, sét và vòng tròn, nên mức tương phản chưa đủ mạnh.
Ở cận cảnh, vùng sáng lúc nổ che mắt và trán, làm mất biểu cảm đúng khoảnh khắc cần thấy nhất.
Ưu tiên tạo nhịp nén, va chạm, bung, lắng. Chưa cần thêm cả bảy hiệu ứng.

## 2. Bảng nhịp

Xếp theo tác động dự kiến. P0 làm trước, P1 hoàn thiện cao trào, P2 làm sau. Thông số là điểm khởi đầu để xem thử, không phải kết quả đo hiệu năng. Mọi giá trị px tính tại 1080p; tại 720p nhân 2/3. Opacity và tốc độ dưới đây là tỷ lệ so với hiệu ứng hiện tại, trừ khi ghi khác.

| # | Giây bắt đầu đến kết thúc | Vấn đề | Thêm hoặc đổi gì | Thông số cụ thể | Ưu tiên |
|---|---|---|---|---|---|
| 1 | 7,70 đến 8,20 | Tụ lực đã sáng và bận, không còn khoảng tương phản cho vụ nổ. | Chuyển từ hút lực sang nén lực; dành một khoảng gần tĩnh ngay trước nổ. | 7,70 đến 8,10: opacity vòng trang trí xuống 35%, mật độ sét phụ xuống 40%; tăng tốc vệt hút từ 100% lên 160%. 8,10 đến 8,20: dừng phát hạt mới và sét phụ, giữ lõi tay sáng, co vòng haki sẵn có xuống 85% bán kính. Nền thêm một lớp đen opacity tuyệt đối 0,10. | P0 |
| 2 | 8,20 đến 8,283 | Va chạm chưa có một khung đủ rõ để mắt ghi nhận. | Giữ hình va chạm ngắn, dùng một impact frame bằng mảng phẳng. | Tổng nhịp giữ hình là 5 frame, tương đương 83,3ms. Frame đầu tại 8,20 dùng nền tím đen và silhouette sáng từ hình nhân vật sẵn có; 4 frame tiếp theo trở về màu thường, giữ pose và bán kính sóng đầu. Không đảo màu bằng filter. Âm thanh và đồng hồ sự kiện tiếp tục chạy; không dời mốc phép nổ. | P0 |
| 3 | 6,60 đến 8,58 | Máy quay cố định khiến mức tăng năng lượng ít có cảm giác áp sát. | Zoom vào, giật ra sau nhịp giữ hình, rồi rung tắt nhanh. | 6,60 đến 8,10: scale 1,00 lên 1,07, ease-in bậc hai, tâm ở giữa mặt và bàn tay. Giữ 1,07 đến 8,283; về 1,00 trong 100ms. Rung từ 8,283 trong 300ms, biên độ tối đa 8px ngang và 4px dọc, về 0 theo bình phương. Chỉ biến đổi lớp cinematic; letterbox và chữ cố định. | P0 |
| 4 | 8,20 đến 8,48 | Chớp tay và flare trùm mắt, trong khi các vòng nổ vẫn giống vòng trang trí. | Chỉnh hiệu ứng nổ hiện có để có hướng bung rõ và giữ mặt đọc được. | Chớp phủ màn hình đạt đỉnh trong 2 frame, đuôi tắt trong 100ms. Từ 8,283, tâm lõi sáng và sóng đặt ở bàn tay; giảm 70% opacity lõi/flare trong vùng mắt và trán bằng vùng cắt, trừ impact frame. Ba sóng bung nối tiếp, cách 50ms, độ sáng tương đối 100%, 65%, 35%; mỗi sóng tắt trong 200ms. | P0 |
| 5 | 8,48 đến 9,40 | Ánh tay và sét tiếp tục mạnh khi chữ xuất hiện, làm dư chấn giống tụ lực kéo dài. | Hạ năng lượng nhanh để biểu cảm và tiêu đề được đọc trong khoảng lắng. | 8,48 đến 8,80: flare tay xuống 20%, dừng vệt hút vào và sét phụ; giữ một viền tím mảnh. Vòng trang trí còn 40% độ sáng đến 9,40. Giữ banner bắt đầu 8,20 và rõ hoàn toàn 8,65; scale chữ chỉ tăng 3% từ 8,65 đến 9,40. Giữ lịch hạ tay 8,51 đến 9,40. | P1 |
| 6 | 7,70 đến 8,20 | Đỉnh charge chưa có dấu hiệu riêng trên nhân vật, phần lớn thay đổi nằm ở hiệu ứng quanh người. | Tăng ánh mắt và nâng tóc sẵn có trong đoạn cuối, với mức vừa đủ. | Mắt: lớp tím cục bộ opacity tuyệt đối 0 lên 0,35 từ 7,70 đến 8,10; lên 0,65 trong 2 frame tại 8,10 rồi về 0,35 đến nổ. Giữ đồng tử đọc được. Tóc: nhân biên độ chuyển động hiện có tối đa 1,35; nâng đầu lọn ngoài thêm 8px tại 8,10. Không thêm sợi năng lượng. | P1 |
| 7 | 4,00 đến 5,80 | Đoạn suy nghĩ vẫn nằm trong bộ vòng và hạt hoạt động, nên chưa tạo khoảng nghỉ rõ trước triệu hồi. | Làm đoạn think thật bình tĩnh rồi khởi động lại hiệu ứng từ 5,80. | Vòng trang trí quay ở 30% tốc độ, độ sáng 50%; lượng cánh hoa mới 25% trong beat. Giữ ánh mặt, bóng “...” và nền. Phục hồi tốc độ vòng trong 200ms từ 5,80; không rút ngắn beat hoặc dời Goliath 6,52. | P2 |
| 8 | 5,96 đến 6,61 | Động tác giơ tay nhỏ ở toàn cảnh, khó nối ánh nhìn từ nhân vật đến điểm phát phép. | Thêm một vệt ngắn theo quỹ đạo tay, tắt ngay sau khi hoàn tất. | Một nét chính rộng 3px, viền phụ 7px opacity tuyệt đối 0,15; chiều dài lịch sử quỹ đạo 100ms. Đuôi tắt trong 120ms, hết trước 6,75. Vệt đi phía sau tay và không qua mặt. | P2 |

Giữ Goliath xuất hiện 6,52s, phép nổ 8,20s và tổng thời lượng 12,917s. Hit-stop là giữ hình chọn lọc theo đồng hồ thực, không cộng thêm 83ms vào timeline. Các hiệu ứng sau nhịp giữ hình phải bắt đầu ở 8,283s, không nhảy đến trạng thái đã bung của 8,283s. Giữ lịch âm thanh và banner độc lập với giữ hình.

Mức đồ họa thấp giữ nhịp nén, impact frame, zoom và một sóng chính; bỏ vệt tay, giảm sét phụ và giảm rung xuống 4px ngang, 2px dọc. Dùng mảng phẳng, vùng cắt và hình sẵn có; không blur hoặc filter toàn màn hình, không tạo gradient mới mỗi frame. Đây là chỉ dẫn để phù hợp ngân sách Canvas 2D, chưa phải xác nhận chạy đạt 60fps.

## 3. Chấm bảy ý tưởng

1. **Zoom và rung: nên.** Zoom 7% trong 1,50s; giật ra sau nhịp giữ hình. Rung 300ms tắt nhanh, không rung xuyên suốt charge.
2. **Hit-stop và âm bản: sửa.** Giữ hình 83,3ms trước; dùng một impact frame mảng phẳng 16,7ms thay cho đảo màu toàn màn hình. Không dừng đồng hồ âm thanh.
3. **Cut-in đôi mắt: chưa nên ở lượt đầu.** Zoom, ánh mắt và khoảng nén đã đủ tạo trọng tâm. Cut-in còn tranh chỗ với bàn tay và Goliath. Nếu bản sau vẫn thiếu điểm nhấn, thử 7,60 đến 7,98: dải cao 18% màn hình, vào 100ms, giữ 200ms, ra 80ms; dùng crop khuôn mặt hiện có và tắt trước khoảng nén.
4. **Vạch manga: không nên thêm.** Đã có tia sáng hướng tâm và vệt hút lực. Chỉnh những vệt hiện có hội tụ rõ hơn trong 7,70 đến 8,10, rồi tắt ở khoảng nén; không chồng một bộ vạch nữa.
5. **Mắt tím: nên, mức nhẹ.** Chỉ tăng rõ trong 0,50s cuối; lóe 2 frame tại 8,10. Giữ đồng tử, không biến mắt thành hai đốm trắng và không vẽ lại mặt.
6. **Tóc bay hẳn lên và tỏa năng lượng: sửa.** Tăng chuyển động tóc sẵn có tối đa 35%, giữ chân tóc và tóc mái ổn định. Bỏ sợi năng lượng ở đầu lọn để đường nét nhân vật còn rõ.
7. **Vệt quỹ đạo tay: nên, ưu tiên thấp.** Vệt ngắn 100ms, tắt trong 120ms, chỉ hỗ trợ động tác 5,96 đến 6,61. Không để lại một cung sáng kéo dài cạnh mặt.

## 4. Một thứ sẽ bỏ

**Bỏ phần tia sáng hướng tâm nền tiếp tục kéo dài sau 8,48s.** Giữ chúng cho cú bung, tắt hết trong 120ms từ 8,48. Khoảng lắng sẽ sạch hơn để đọc “STACK OVERFLOW” và thấy Kanade bình thản sau khi tung phép.
