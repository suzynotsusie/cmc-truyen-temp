# Phiếu chấm thử và vòng sửa báo cáo

## Vòng 1 - Góc nhìn giảng viên khó tính

### Điểm dự kiến của bản thảo trước khi sửa: 7,2/10

| Tiêu chí | Điểm tối đa | Điểm vòng 1 | Nhận xét |
|---|---:|---:|---|
| Hình thức và cấu trúc | 1,0 | 0,8 | Có mẫu bìa, mục lục và chia chương; chưa kiểm chứng số trang bằng PDF. |
| Giới thiệu bài toán | 1,5 | 1,2 | Nêu được nhu cầu nhưng cần ranh giới phạm vi và tiêu chí kiểm chứng rõ hơn. |
| Phân tích luồng | 2,0 | 1,5 | Có luồng người dùng/admin nhưng phải bổ sung ngoại lệ, RBAC và truy vết endpoint. |
| Kiến trúc/triển khai | 2,0 | 1,4 | Cần mô tả rõ SPA React, REST API Express và kiến trúc phân lớp. |
| FE/BE/DB và code | 1,5 | 1,0 | Thiếu phê bình schema/migration; cần chỉ đúng đoạn code và bằng chứng folder. |
| Kiểm thử/đánh giá | 1,0 | 0,6 | Chưa có kết quả thực chạy và chưa nêu giới hạn của unit test. |
| Minh chứng, liêm chính | 1,0 | 0,7 | Link/ảnh còn thiếu là chấp nhận được ở bản thảo, nhưng bản nộp không được còn placeholder. |

### Yêu cầu sửa bắt buộc

1. Mô tả chính xác SPA React + REST Express theo kiến trúc phân lớp.
2. Thêm ma trận vai trò, luồng Uploader/Moderator, trạng thái kiểm duyệt, ngoại lệ 401/403/404/409/429 và bảng truy vết API.
3. Đối chiếu source thật: route, middleware, schema, worker, package và cấu hình triển khai.
4. Chạy test/build, ghi con số thực và cả cảnh báo; không chỉ viết “hệ thống hoạt động tốt”.
5. Phân tích nợ kỹ thuật: migration phân tán, DDL chạy lúc startup, bảng `bad_words`, Redis/open handle, bundle lớn.
6. Bổ sung ảnh folder, code, giao diện khách hàng/admin bằng ảnh do nhóm tự chụp; tất cả ảnh giao diện phải không màu theo yêu cầu.
7. Chốt thông tin hành chính, phân công và liên kết trước khi nộp.

## Vòng 2 - Sinh viên GPA 4.0 sửa bài

Các chỉnh sửa đã được đưa vào bản LaTeX cuối:

- gom mọi trường cần điền vào `metadata.tex`, giữ nguyên mẫu bìa hai khung và logo CMC từ ZIP;
- đặt phân công đúng trang 2, thêm nguyên tắc xác nhận đóng góp;
- dùng `extreport` để đánh số hình/bảng theo chương và đặt danh mục bảng trước danh mục hình;
- viết lại Chương 1 với bài toán, tác nhân, phạm vi, yêu cầu phi chức năng và phương pháp bằng chứng;
- viết lại Chương 2 với năm vai trò, ma trận quyền, luồng chính/ngoại lệ, sơ đồ trạng thái và truy vết endpoint;
- viết lại Chương 3 theo kiến trúc thực, phân tích FE/BE/DB, deployment, security, queue/AI, test và nợ kỹ thuật;
- ghi đúng kết quả thực chạy: backend 49/49, frontend 23/23, tổng 72/72; build production thành công;
- công khai log Redis `ECONNREFUSED`, Jest force-exit, cảnh báo bundle 535,36 kB và E2E chưa chạy;
- tạo 18 vị trí ảnh có tên file, caption, label và hướng dẫn chụp; không tạo ảnh giả;
- thêm checklist biên dịch/kiểm tra để loại placeholder trước khi nộp.

## Chấm lại sau vòng sửa

### Chất lượng nội dung/source báo cáo: 9,1/10

Bản viết có cấu trúc, lập luận, truy vết và tự phê bình tốt. PDF hiện có 35 trang nội dung, 42 trang vật lý. Điểm chưa tối đa vì chưa có kết quả E2E/accessibility/performance và 18 ảnh thật vẫn cần nhóm bổ sung.

### Trạng thái nộp ngay lúc này: tối đa khoảng 7,5/10

Giảng viên khó tính vẫn trừ mạnh nếu bản nộp còn tên đề tài/giảng viên/phân công/link chưa điền hoặc còn khung ảnh. Đây là dữ liệu chỉ người học có thể cung cấp; không được tự bịa để nâng điểm hình thức.

### Điều kiện để đạt mức 9+

- điền đủ metadata và phân công của 4 thành viên;
- thay toàn bộ 18 placeholder bằng ảnh thật, rõ, trắng đen;
- điền link deploy/repository theo đúng commit và kiểm tra quyền truy cập;
- chọn compiler XeLaTeX, biên dịch ít nhất hai lần, rà từng trang; phần nội dung giữ khoảng 35-40 trang và tổng vật lý không vượt 60 trang;
- nếu có thời gian, chạy Playwright E2E với PostgreSQL/Redis thật và bổ sung kết quả;
- sửa migration `bad_words`/reports/tags và teardown Redis để phần giải trình kỹ thuật thuyết phục hơn.
