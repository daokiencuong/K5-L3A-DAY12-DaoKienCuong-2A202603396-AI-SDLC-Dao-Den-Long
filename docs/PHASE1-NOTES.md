# Phase 1 · giả định, kiểm chứng và ghi chép

## Giả định

- Đảo tròn bán kính chơi được 29,5 m; năm đèn nằm quanh rìa. Mỗi đèn cần 3 đom đóm, người chơi mang tối đa 5.
- Mây có 3 đèn sinh mệnh. Chạm Bóng Mực mất một đèn; bất tử 1,5 giây sau va chạm. Rơi không bị phạt.
- Tỏa sáng tiêu hao một đom đóm, làm choáng và đẩy Bóng Mực trong bán kính 8 m; hồi chiêu 4 giây.
- Đêm dài 300 giây. Chạm đèn trong 3 m nạp số đom đóm đang mang vào đèn gần nhất.
- Màn headless và trình duyệt dùng chung `src/sim.js`, đơn vị mét và hệ trục XZ của contract. Cảnh/hiệu ứng Three.js chỉ để hiển thị.

## Tiêu chí nghiệm thu Phase 1

| Yêu cầu | Kiểm chứng | Bằng chứng |
|---|---|---|
| 5 đèn, 60 Hz, snapshot tick 0 và end JSONL | `src/headless.js` với scenario deterministic | `docs/proof/phase1-smoke.jsonl` |
| Nhặt đom đóm, nạp và thắp đèn | Scenario tương tác có sẵn trong `docs/proof/` | `docs/proof/phase1-smoke.jsonl` |
| Bóng Mực đuổi, chạm gây mất lửa | Đầu ra scenario chạy lại được | Còn cần kiểm tra hình ảnh khi mở browser |
| Pulse tốn sáng, đẩy/choáng bóng | Sự kiện pulse và snapshot scenario | `docs/proof/phase1-smoke.jsonl` |
| Determinism và định dạng JSON | Chạy cùng lệnh hai lần, so byte | `docs/proof/verification.txt` |
| HUD, chơi lại, điều khiển, không bạo lực | React build + Chrome screenshot | `docs/proof/react-three-ui.png`; WASD mapping covered by `npm run verify` |

## Nhật ký AI và retro

- Sau phản hồi của người dùng, nâng cấp renderer từ WebGL viết tay sang Three.js, chuyển headless sang Node.js và làm lại HUD theo phong cách MOBA. Chia sẻ lõi `src/sim.js` giữ quy tắc headless nhất quán giữa hai chế độ.
- Điều khiển bàn phím dùng trục camera riêng: W tiến, S lùi, A trái, D phải; F kích hoạt pulse ánh sáng. Trục được kiểm chứng bằng bài kiểm tra bốn hướng.
- Không có API/token meter hiển thị cho phiên này; token/chi phí chính xác không đo được, không tự ước lượng thành số liệu giả. Không thêm asset hình ảnh/âm thanh bên ngoài.
- Tag `phase-1` bản cũ đã được gỡ theo yêu cầu sau khi đổi stack; bản hiện tại ở nhánh main. Bằng chứng headless được tái tạo bằng Node.js và giao diện được chụp từ Chrome.
