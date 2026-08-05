# OUTLINE BÁO CÁO PROG2008

## 1. Quy chuẩn trình bày

- Khổ A4; lề trái 3 cm, phải 2 cm, trên/dưới 2,5 cm.
- Times New Roman 14 pt; thụt đầu dòng 1,27 cm; bullet thống nhất.
- Header ghi Trường Đại học CMC và mã học phần PROG2008; số trang ở chân trang.
- Caption bảng ở trên, caption hình ở dưới; bảng và hình đánh số theo chương (`1.1`, `2.3`, ...).
- Tất cả bảng nội dung dùng đường viền kín ô như báo cáo mẫu.
- Ảnh giao diện khách hàng và quản trị dùng bản trắng đen/không màu, nhưng phải đủ tương phản để đọc.

## 2. Thứ tự và phân bổ trang

1. Trang bìa: giảng viên, mã lớp, tên đề tài, website, sinh viên và mã sinh viên. Tên đề tài và link được giữ trống trong `metadata.tex`.
2. Trang phân công công việc: thành viên, mã sinh viên, nhiệm vụ, tỷ lệ đóng góp và phần ký xác nhận.
3. Mục lục tự động.
4. Danh mục bảng.
5. Danh mục hình.
6. Danh mục từ viết tắt.
7. Chương 1 - Giới thiệu bài toán: khoảng 7 trang.
8. Chương 2 - Phân tích luồng hoạt động: khoảng 8 trang.
9. Chương 3 - Triển khai hệ thống: khoảng 20 trang, phụ thuộc số ảnh thật.
10. Kết luận và tài liệu tham khảo: khoảng 2 trang.

Bản hiện tại có 39 trang nội dung đánh số Ả Rập và 46 trang vật lý; vẫn dưới giới hạn 60. Cần kiểm tra lại sau mỗi lần thay nội dung hoặc ảnh.

## 3. Nội dung chi tiết

### Chương 1 - Giới thiệu bài toán

- Bối cảnh và động cơ thực hiện.
- Khó khăn của người đọc, người đăng nội dung và đội ngũ vận hành.
- Mục tiêu và tiêu chí kiểm chứng.
- Đối tượng sử dụng, sơ đồ ngữ cảnh và bên liên quan.
- Phạm vi trong/ngoài sản phẩm.
- Yêu cầu phi chức năng.
- Phương pháp thực hiện và nguồn bằng chứng.

### Chương 2 - Phân tích luồng hoạt động

- Ma trận quyền Guest, User, Uploader, Moderator và Admin.
- Guest: khám phá, tìm kiếm, xem chi tiết và đọc truyện.
- User: đăng ký/đăng nhập, JWT, lịch sử đọc, theo dõi và tương tác.
- Uploader: tạo truyện, import nội dung, quản lý chương và cộng tác viên.
- Moderator: duyệt/yêu cầu sửa/từ chối, xử lý nội dung vi phạm.
- Admin: quản lý user, role, trạng thái, truyện, từ khóa, báo cáo và audit log.
- Truy vết từng luồng về endpoint và module source.
- Nhánh lỗi HTTP và nguyên tắc an toàn luồng.

### Chương 3 - Triển khai hệ thống

- Kiến trúc SPA React + REST API Express + PostgreSQL + Redis/BullMQ + worker.
- Frontend: sơ đồ thư mục, route/guard, Axios interceptor, trạng thái UI.
- Backend: sơ đồ thư mục, phân lớp, pipeline request, JWT/RBAC, queue/worker.
- Database: mô hình dữ liệu, schema/migration, SQL chính, pool/index/transaction.
- Cấu hình và triển khai: biến môi trường, topology, link bàn giao để trống.
- Kiểm thử: kết quả đã ghi nhận và kịch bản thủ công cần bổ sung.
- Giao diện khách hàng và giao diện Admin/Moderator: giữ nguyên toàn bộ khung ảnh.
- Đánh giá kết quả, hạn chế và thứ tự hoàn thiện trước khi nộp.

## 4. Dàn ý khoảng 15 slide

1. Bìa: học phần, đề tài, nhóm, giảng viên.
2. Bài toán, đối tượng và mục tiêu.
3. Phạm vi chức năng và vai trò.
4. Luồng Guest khám phá/đọc truyện.
5. Luồng User đăng nhập, lưu lịch sử và tương tác.
6. Luồng Uploader tạo truyện và quản lý chương.
7. Luồng Moderator/Admin kiểm duyệt, báo cáo và audit.
8. Kiến trúc tổng thể.
9. Frontend: cấu trúc, route và đoạn code chính.
10. Backend: phân lớp, middleware và đoạn code chính.
11. Database: ERD, schema và ràng buộc chính.
12. Giao diện khách hàng.
13. Giao diện Admin/Moderator.
14. Kiểm thử, build và triển khai.
15. Kết quả, hạn chế, hướng phát triển và lời mời demo/hỏi đáp.

## 5. Cấu trúc thư mục Overleaf

```text
main.tex                 Cấu hình định dạng và thứ tự ghép báo cáo
metadata.tex             Nơi duy nhất cần điền thông tin nhóm và liên kết
OUTLINE.md               Dàn ý báo cáo và slide
README.md                Hướng dẫn biên dịch/kiểm tra
chapters/
  chapter1.tex           Giới thiệu bài toán
  chapter2.tex           Phân tích luồng hoạt động
  chapter3.tex           Triển khai hệ thống
sections/
  cover.tex              Trang bìa
  assignment.tex         Phân công công việc
  abbreviations.tex      Danh mục từ viết tắt
  conclusion.tex         Kết luận
  references.tex         Tài liệu tham khảo
images/
  cmc_logo.png
  screenshots/           Ảnh thật sẽ bổ sung theo đúng tên file
```

## 6. Trình tự hoàn thiện

1. Điền `metadata.tex` sau khi nhóm chốt thông tin.
2. Chụp ảnh thật đúng phiên bản nộp, chuyển ảnh UI sang trắng đen và lưu đúng tên trong `images/screenshots/`.
3. Điền URL website, repository/commit và video; kiểm tra bằng cửa sổ ẩn danh.
4. Cập nhật kết quả E2E/thủ công chỉ khi có bằng chứng thật.
5. Biên dịch XeLaTeX ít nhất hai lần, rà mục lục, danh mục, số trang và toàn bộ placeholder.
