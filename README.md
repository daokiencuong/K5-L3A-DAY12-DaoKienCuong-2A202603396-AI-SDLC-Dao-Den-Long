# Đảo Đèn Lồng · Phase 1

Game phiêu lưu 3D low-poly trên đảo tròn giữa biển mây. Mây nhặt đom đóm, mang tới năm đèn lớn, né Bóng Mực và dùng ánh sáng để làm chúng choáng. Chạy trực tiếp trên macOS, Linux hoặc Windows với Python 3.9+ và trình duyệt hỗ trợ WebGL; không cần cài package.

## Cài đặt và chạy

```sh
python -m compileall -q src
python -m http.server 8000
```

Mở `http://localhost:8000`. Dừng máy chủ bằng Ctrl+C. Build command chỉ kiểm tra cú pháp mô phỏng; game browser là HTML/JavaScript tĩnh.

## Điều khiển

- `W A S D`: đi theo góc camera; camera bám sau Mây. Kéo chuột ngang để xoay camera.
- `Space`: nhảy.
- `E`: nạp đom đóm vào đèn gần nhất trong 3 m.
- `Q`: tỏa sáng, tiêu hao 1 đom đóm; Bóng Mực cách tối đa 8 m bị choáng 2,5 giây và đẩy lùi 3 m. Hồi chiêu 4 giây.

Mây di chuyển 6 m/s, mang tối đa 5 đom đóm, có 3 đèn sinh mệnh. Mỗi đèn cần 3 đom đóm. Bóng Mực đi 2,4 m/s, chạm trong 1 m làm mất một đèn sinh mệnh; Mây được miễn nhiễm va chạm 1,5 giây. Đêm dài 300 giây. Đảo không phạt khi ra khỏi rìa; Mây bị giữ trong bán kính 29,5 m.

## Điểm

Mỗi đom đóm nhặt được: 10; mỗi đèn thắp sáng: 100; mỗi Bóng Mực bị choáng: 15. Khi thắng, cộng thêm 1 điểm cho mỗi giây còn lại và 25 điểm cho mỗi đèn sinh mệnh còn lại. Thua không có điểm thưởng cuối màn.

## Headless và kiểm chứng

Contract đầy đủ ở [`game.contract.json`](game.contract.json). Headless dùng Python standard library, chạy 60 tick/giây, không cửa sổ/GPU:

```sh
python src/headless.py --seed 23 --night 1 --scenario docs/proof/scenario-smoke.json --inputs docs/proof/inputs-smoke.json --ticks 600 --snapshot-every 1 --out run.jsonl
python scripts/verify_phase1.py
```

Inputs, scenario, snapshot/event/end tuân theo Test Contract v1.0. Lỗi định dạng scenario/inputs trả mã 2. Chạy cùng seed và tệp đầu vào tạo cùng JSONL. Headless mô phỏng là nguồn chuẩn cho chấm tự động; phần trình bày browser không làm thay đổi đầu ra headless.

## Sáng tạo của tôi

- Dựng cảnh 3D low-poly bằng WebGL thuần: đảo xanh tối, sương đêm, đèn vàng, Mây đội nón lá và Bóng Mực tím đen. Không tải asset ngoài.
- Chứng cứ lõi: `docs/proof/phase1-smoke.jsonl` ghi pulse làm choáng S1, nạp và thắp L1, thắng ở tick 3; `docs/proof/verification.txt` ghi kiểm tra nhặt, va chạm, JSON sai mã 2 và so sánh tất định. Các bản dựng scenario không cộng điểm cho đèn đã thắp sẵn.

## Ghi chép

Giả định, tiêu chí nghiệm thu và nhật ký AI Phase 1: [`docs/PHASE1-NOTES.md`](docs/PHASE1-NOTES.md). Harness cho coding agent: [`AGENTS.md`](AGENTS.md). Credits và license: [`CREDITS.md`](CREDITS.md), [`LICENSE`](LICENSE).
