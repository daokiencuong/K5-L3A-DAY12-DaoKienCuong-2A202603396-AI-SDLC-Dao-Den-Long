# Đảo Đèn Lồng · Phase 2

Game 3D góc nhìn sau lưng Mây, dùng React, Three.js và Node.js. Vite là công cụ phát triển/build. Thu thập đom đóm, thắp đèn, né Bóng Mực và Gió Lạc qua ba đêm.

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
- `Space`: nhảy; `Shift`: lướt; `E`: nạp 10 đom đóm vào đèn; `F`: Tỏa Sáng; `Esc`/`P`: tạm dừng.

## Ba đêm

1. Đảo Bến: đảo tròn bán kính 40 m, 5 đèn.
2. Song Đảo Tre: hai đảo, cầu tre, bục nhảy, Bùa Gió và Gió Lạc.
3. Tháp Chuông: ba tầng cao độ, dốc, bục nhảy, gió mạnh và Bùa Gió.

Thắp đủ đèn để thắng đêm; điểm được cộng theo contract. Mỗi đêm dùng cùng mô phỏng deterministic cho trình duyệt và headless.

## Headless và kiểm tra

```sh
node src/headless.js --seed 23 --night 2 --ticks 21600 --snapshot-every 60 --out run.jsonl
npm run verify
```

Tuning, sự kiện, snapshot và acceptance criteria được ghi trong [`game.contract.json`](game.contract.json) và [`docs/PHASE2-SPEC.md`](docs/PHASE2-SPEC.md). Ghi chép Phase 1: [`docs/PHASE1-NOTES.md`](docs/PHASE1-NOTES.md). Hướng dẫn agent: [`AGENTS.md`](AGENTS.md).

Phase 1 tag đã được gỡ theo yêu cầu. Nộp Phase 2 bằng tag `phase-2`.
