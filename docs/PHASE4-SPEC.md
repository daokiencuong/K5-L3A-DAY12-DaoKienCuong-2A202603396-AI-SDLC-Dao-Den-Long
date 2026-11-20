# Phase 4 · Ticket-04 · Contract 1.3

## Bằng chứng và chấp nhận

| Yêu cầu | Hiện thực | Kiểm tra |
|---|---|---|
| Benchmark 1280×720 | `scripts/bench.js`, `bench.html`, `bench.jsx`; Chrome/Edge cửa sổ app, vsync flags, warm-up 3 giây, fixture seeded 200 Shades/100 motes/3 lamp | `bench.json`, lệnh chuẩn trong contract |
| Chỉ số | Tính N/sum(dt), trung bình 1% dt chậm nhất, nearest-rank p95, load tới frame đầu; RSS trình duyệt là null và được giải thích | `src/bench-metrics.js`, output JSON |
| Soak | 10 lần tạo Simulation trong một tiến trình, Night 1/2/3 xoay vòng; input PRNG riêng theo seed từng đêm; RSS đo sau khởi tạo và sau reset cuối | `scripts/soak.js`, `soak.json` |
| Bảng điểm | API Node local atomic write; tên ASCII 3–12, top10 điểm giảm dần và thời điểm tăng dần; màn hình game + export | `scripts/verify_phase4.js`, tạm chạy server với file bảng trong temp |
| Accessibility | Đổi 9 binding và lưu, báo trùng, reset; chỉ báo hướng Shade, gió, 10 giây và dầu yếu; giảm chuyển động, chữ lớn, màu dễ phân biệt | `scripts/verify_phase4.js`, kiểm tra build và giao diện |
| Cài đặt/phát hành | React/Three.js bundle tĩnh và server Node không cần dependency runtime; clone/build/start trong 3 lệnh | production build, `release/README.md` |
| Tương thích | Contract runtime 1.3, gameplay snapshots giữ 1.2; simulation bình thường không đổi | Bốn bộ test Phase 1–4, byte-determinism regression Phase 1 |

## Benchmark protocol

Launcher dùng `--disable-frame-rate-limit`, `--disable-gpu-vsync`, `--window-size=1280,720`, và cửa sổ app không fullscreen. Cảnh benchmark tắt input, procedural spawn, sát thương, nhặt mote, hao dầu và kết thúc đêm; chỉ bước `wander` deterministic cho 200 Shade. Renderer/material/lighting Three.js giống gameplay; các thực thể benchmark dùng instanced meshes để giảm draw calls. Camera bắt đầu ở (30,15,0), quay ngược chiều kim đồng hồ mỗi vòng 15 giây. `load_ms` measures from runner start to the first benchmark scene frame; `peak_mem_mb:null` vì harness web không đo RSS của toàn bộ tiến trình Chrome.

`frame_ms_p95` dùng nearest-rank `ceil(0.95N)`. `p1_low_fps` dùng trung bình `ceil(0.01N)` frame time lớn nhất. `bench.json` là phép đo trên máy phát triển hiện tại; ngưỡng chấm được áp dụng trên máy giảng viên.

## Soak protocol

`--nights 10` tái tạo một Simulation mới cho mỗi đêm trong cùng Node process. Harness chạy 1.200 tick warm-up rồi reset trước khi lấy `mem_start_mb`, để RSS ban đầu phản ánh runtime đã nạp/JIT-warm như ứng dụng đang chạy; warm-up không tính vào 10 kết quả. Đêm i dùng seed `7+i`, loại đêm lần lượt 1/2/3; hướng di chuyển thay mỗi 30 tick. Jump/dash/pulse/interact lấy mẫu mỗi tick với xác suất lần lượt .05/.03/.02/.10. Event queue được xả vì đây là soak gameplay, không phải event-history test. Garbage collection được bật qua `--expose-gc` trước khi lấy RSS cuối.

## Kết quả local

Kết quả đầy đủ và phiên bản build được ghi ở [`proof/phase4-verification.txt`](proof/phase4-verification.txt). Hai JSON gốc là [`../bench.json`](../bench.json) và [`../soak.json`](../soak.json). Máy giảng viên là nguồn quyết định cho ngưỡng FPS/load cuối.
