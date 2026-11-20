# Phase 1 · giả định, kiểm chứng và ghi chép

## Giả định

- Đảo tròn bán kính chơi được 29,5 m; năm đèn nằm quanh rìa. Mỗi đèn cần 3 đom đóm, người chơi mang tối đa 5.
- Mây có 3 đèn sinh mệnh. Chạm Bóng Mực mất một đèn; bất tử 1,5 giây sau va chạm. Rơi không bị phạt.
- Tỏa sáng tiêu hao một đom đóm, làm choáng và đẩy Bóng Mực trong bán kính 8 m; hồi chiêu 4 giây.
- Đêm dài 300 giây. Chạm đèn trong 3 m nạp số đom đóm đang mang vào đèn gần nhất.
- Màn chơi headless dùng cùng đơn vị mét và hệ trục XZ của contract. Browser là bản trình bày tương tác riêng; các thực thể trang trí không được đưa vào mô phỏng headless.

## Tiêu chí nghiệm thu Phase 1

| Yêu cầu | Kiểm chứng | Bằng chứng |
|---|---|---|
| 5 đèn, 60 Hz, snapshot tick 0 và end JSONL | `src/headless.py` với scenario deterministic | `docs/proof/phase1-smoke.jsonl` |
| Nhặt đom đóm, nạp và thắp đèn | Scenario tương tác có sẵn trong `docs/proof/` | `docs/proof/phase1-smoke.jsonl` |
| Bóng Mực đuổi, chạm gây mất lửa | Đầu ra scenario chạy lại được | Còn cần kiểm tra hình ảnh khi mở browser |
| Pulse tốn sáng, đẩy/choáng bóng | Sự kiện pulse và snapshot scenario | `docs/proof/phase1-smoke.jsonl` |
| Determinism và định dạng JSON | Chạy cùng lệnh hai lần, so byte | `docs/proof/verification.txt` |
| HUD, chơi lại, điều khiển, không bạo lực | Mở trang và thao tác thủ công | Chưa có ảnh chụp màn hình trong môi trường này |

## Nhật ký AI và retro

- Dùng Codex để chuyển contract thành mô phỏng headless, trang web Canvas phong cách minh họa và tài liệu bàn giao. Không có API/token meter hiển thị cho phiên này; token/chi phí chính xác không đo được, không tự ước lượng thành số liệu giả.
- Tiết kiệm phạm vi bằng Python standard library cho build/headless và một file browser JS, không thêm package hoặc asset ngoài.
- Rà soát ban đầu bắt được lỗi cú pháp trong chọn đèn an toàn trước khi chạy; đã sửa rồi mới tạo bằng chứng. Cần người dùng mở game trong browser để xác nhận hình ảnh/điều khiển trực quan.
