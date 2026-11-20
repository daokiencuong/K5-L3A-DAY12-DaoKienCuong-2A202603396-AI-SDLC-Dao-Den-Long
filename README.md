# Đảo Đèn Lồng · Phase 3

Game 3D góc nhìn sau lưng Mây, dùng React, Three.js và Node.js. Vite là công cụ phát triển/build. Thu thập đom đóm, giữ dầu cho đèn và sống tới bình minh qua ba đêm.

## Cài đặt

Cần Node.js 20.19 trở lên.

```sh
npm install
npm run dev
```

Build production: `npm run build`.

## Điều khiển

- `W A S D`: di chuyển theo camera; W tiến, S lùi, A trái, D phải.
- Kéo chuột để xoay camera; lăn chuột để đổi khoảng cách.
- `Space`: nhảy; `Shift`: lướt; `E`: thắp đèn, thắp lại hoặc châm dầu; `F`: Tỏa Sáng; `Esc`/`P`: tạm dừng.

## Ba đêm

1. Đảo Bến: đảo tròn bán kính 40 m, 5 đèn.
2. Song Đảo Tre: hai đảo, cầu tre, bục nhảy, Bùa Gió và Gió Lạc.
3. Tháp Chuông: ba tầng cao độ, dốc, bục nhảy, gió mạnh và Bùa Gió.

Đèn mất 1 dầu mỗi giây; Bóng Mực hút dầu từ đèn yếu. Giữ ít nhất 60% số đèn sáng đến hết giờ để thắng. Cài đặt có chế độ bảng màu dễ phân biệt. Mỗi đêm dùng cùng mô phỏng deterministic cho trình duyệt và headless.

## Headless và kiểm tra

```sh
node src/headless.js --seed 23 --night 2 --ticks 21600 --snapshot-every 60 --out run.jsonl
npm run verify
```

Tuning và snapshot v1.2 ở [`game.contract.json`](game.contract.json). Phase 3 acceptance: [`docs/PHASE3-SPEC.md`](docs/PHASE3-SPEC.md); quyết định luật đèn: [`docs/ADR-003-lantern-fuel.md`](docs/ADR-003-lantern-fuel.md); thay đổi tương thích: [`docs/CHANGELOG-PHASE3.md`](docs/CHANGELOG-PHASE3.md). Notes Phase 1–2 vẫn được giữ.

Phase 1 tag vẫn được gỡ theo yêu cầu; Phase 2 history/tag được giữ. Phase 3 submission tag: `phase-3`.
