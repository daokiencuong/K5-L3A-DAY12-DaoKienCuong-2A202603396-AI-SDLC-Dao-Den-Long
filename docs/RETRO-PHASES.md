# Retrospective · Phase 1–4

## Evaluation qua bốn phase

**Phase 1 — prototype.** Từ PRD-0, phần quan trọng nhất là giữ vòng chơi dễ hiểu: gom đom đóm, thắp đèn và dùng Tỏa Sáng đẩy Bóng Mực. Bằng chứng sớm là headless trace và HUD React/Three.js. Prototype Python ban đầu không còn phù hợp khi cần cùng một luật chạy cả browser lẫn headless, nên stack được đổi theo yêu cầu sang Node.js.

**Phase 2 — chuẩn hóa và nội dung.** Một simulation JavaScript 60 Hz dùng chung giúp seed, tick order và output JSONL có thể kiểm chứng. Ba bản đồ và các hệ thống gió/lướt làm game phong phú hơn. Điểm yếu là thời lượng và nhịp gameplay một số đêm chỉ được suy ra khi ticket thiếu tuning, nên các giả định phải ghi trong contract/spec để không trình bày như yêu cầu gốc.

**Phase 3 — đổi luật nền.** Mô hình nhiên liệu nguyên theo đơn vị 1/60 tránh drift; ADR và test làm rõ ranh giới an toàn, thắp lại, châm dầu và kết thúc lúc bình minh. Hồi quy là cần thiết vì thắng sớm và điểm Phase 2 đã bị thay. Bằng chứng cụ thể: các test fuel/drain/dawn, ba bộ hồi quy và headless chạy hết Đêm 3.

**Phase 4 — phát hành.** Benchmark browser cố định và soak chạy cùng tiến trình biến các mục tiêu phi chức năng thành dữ liệu. Local leaderboard dùng API Node và JSON trên đĩa, không phụ thuộc tài khoản ngoài. Đổi phím, chỉ báo hình ảnh, reduced motion và chữ lớn cải thiện khả năng tiếp cận. Kết quả benchmark trên máy phát triển chỉ là baseline; ngưỡng cuối phải chạy trên máy chung của giảng viên. Chi tiết nằm trong `bench.json`, `soak.json` và phase4 verification.

## Làm việc với AI

AI làm tốt khi ticket có con số rõ, contract được đọc trước khi sửa, và mỗi luật có test nhỏ. Bốn nguồn harness hữu ích nhất là `AGENTS.md` (ràng buộc repo), `game.contract.json` (số liệu/schema), test deterministic/headless (phát hiện hồi quy), và ADR/changelog (phân biệt yêu cầu mới với luật bị thay thế). Không có skill hoặc hook đặc thù được dùng trong repo.

AI cũng có thể sai theo cách rất cụ thể. Trong Phase 1, phím trục camera từng bị đảo; test WASD theo từng hướng phát hiện. Ở Phase 3, hao dầu xảy ra trước tương tác, vì vậy một đèn vừa đầy ở đầu tick có thể hao một đơn vị nội bộ rồi theo quy tắc `ceil` tiêu một mote, trong khi nhiên liệu clamp lại 100. Test tick-order làm lộ cách hiểu event `refuel.amount`; quyết định cuối là ghi số mote tiêu thụ và nêu rõ trong ADR. Ở Phase 4, lần đo đầu tiên tạo được JSON nhưng runner thoát lỗi khi xóa Chrome profile đang bị khóa; quy trình cleanup được đổi để đợi browser process đóng và thử xóa lại. Các ví dụ này nhắc rằng compile-pass không thay cho test hợp đồng hay kiểm tra exit status.

## Hiệu quả và điều chỉnh nếu làm lại

Simulation dùng chung, số liệu tập trung và test đầu cuối theo từng phase giúp sửa đổi luật lớn mà vẫn giữ được trace tái lập. Phần tốn thời gian nhất là yêu cầu đến ở dạng văn bản tự do, UI/gameplay/contract cùng thay đổi và môi trường Node trên máy phát triển có launcher npm cần được gọi trực tiếp bằng Node để vượt kiểm tra trust của NVM. Nếu bắt đầu lại, tôi sẽ tạo schema scenario/event và smoke test server ngay Phase 1; thêm kiểm thử browser tự động sớm; đo scene cơ sở trước khi tăng số lượng mesh; và giữ checklist release để tag, artefact, video, public visibility được xác nhận riêng.

## Token và chi phí AI

Repo và Codex phiên này không cung cấp bộ đếm tổng token hay hóa đơn API cho bốn phase. Ước lượng thô từ các lượt triển khai, rà soát và chỉnh sửa artifact là **khoảng 80.000–120.000 token tương đương**, độ tin cậy thấp; **chi phí API quan sát được: $0**, vì không gọi API tính phí trực tiếp từ project. Chi phí subscription không có telemetry để phân bổ. Token được tiết kiệm bằng cách đọc contract/test trước, batch các file liên quan, chạy test theo phạm vi sau mỗi cụm và không sinh lại asset hình ảnh/âm thanh khi hình học procedural đã đủ.
