# Đảo Đèn Lồng · Phase 1

Game 3D góc nhìn sau lưng Mây, giao diện **React**, cảnh dựng bằng **Three.js**, chạy trên **Node.js**. Vite chỉ phục vụ build và development server. Đêm nay sương đen phủ đảo: hãy thu thập đom đóm, thắp năm đèn lớn, dùng ánh sáng đẩy lùi Bóng Mực và giữ lại đèn sinh mệnh.

## Cài đặt và chạy

Cần Node.js 20.19 trở lên.

```sh
npm install
npm run dev
```

Mở URL Vite hiện trong terminal (mặc định `http://localhost:5173`). Để tạo bản build tĩnh, chạy thêm `npm run build`.

## Điều khiển

- `W A S D`: đi theo hướng camera; `W` tiến, `S` lùi, `A` trái, `D` phải.
- Kéo chuột ngang để xoay camera; lăn chuột để chỉnh khoảng cách.
- `Space`: nhảy.
- `E`: nạp đom đóm vào đèn gần nhất trong 3 m.
- `F`: tỏa sáng, tiêu hao 1 đom đóm; Bóng Mực cách tối đa 8 m bị choáng 2,5 giây và đẩy lùi 3 m. Hồi chiêu 4 giây.

Mây đi 6 m/s, mang tối đa 5 đom đóm và có 3 đèn sinh mệnh. Mỗi đèn cần 3 đom đóm. Bóng Mực đi 2,4 m/s, chạm trong 1 m làm mất một đèn sinh mệnh; Mây được miễn nhiễm va chạm 1,5 giây sau đó. Đêm dài 300 giây. Đảo giữ Mây trong bán kính 29,5 m.

## Điểm

Mỗi đom đóm nhặt được: 10; mỗi đèn thắp sáng: 100; mỗi Bóng Mực bị choáng: 15. Khi thắng, cộng thêm 1 điểm cho mỗi giây còn lại và 25 điểm cho mỗi đèn sinh mệnh còn lại.

## Headless và kiểm chứng

Tuning nằm trong [`game.contract.json`](game.contract.json). Lõi mô phỏng JavaScript dùng chung cho browser và Node, chạy 60 tick/giây, không cần cửa sổ hay GPU:

```sh
node src/headless.js --seed 23 --night 1 --scenario docs/proof/scenario-smoke.json --inputs docs/proof/inputs-smoke.json --ticks 600 --snapshot-every 1 --out run.jsonl
npm run verify
```

Headless tuân theo Test Contract v1.0: scenario/inputs, sự kiện/snapshot/end JSONL, mã thoát 2 khi dữ liệu scenario/inputs sai và đầu ra tất định theo seed. Bằng chứng có thể tái tạo tại `docs/proof/`.

## Sáng tạo của tôi

- Cảnh đảo 3D low-poly bằng Three.js, sương, cây cỏ, ánh sáng đèn màu hổ phách và nhân vật Mây đội nón lá.
- HUD phong cách MOBA giả tưởng: mục tiêu ở đỉnh màn hình, minimap, thanh sinh mệnh/ánh sáng, điểm và ô kỹ năng, trong đó **F** là kỹ năng tỏa sáng.
- Bằng chứng giao diện: [ảnh Chrome 1600×900](docs/proof/react-three-ui.png). Bằng chứng lõi: `docs/proof/phase1-smoke.jsonl` thể hiện Bóng Mực bị làm choáng, đèn được nạp/thắp và màn thắng. `npm run verify` kiểm tra nhặt, va chạm, bốn hướng WASD, JSON lỗi, tính tất định và đồng bộ tuning.

## Ghi chép

Giả định Phase 1, phạm vi và ghi chú cập nhật renderer: [`docs/PHASE1-NOTES.md`](docs/PHASE1-NOTES.md). Harness coding agent: [`AGENTS.md`](AGENTS.md). Credits/license: [`CREDITS.md`](CREDITS.md), [`LICENSE`](LICENSE).
