# GỢI Ý HOÀN THIỆN BÁO CÁO PROG2008

## Ưu tiên trước khi nộp

1. Xác nhận với giảng viên về công nghệ backend. Đề cương học phần mô tả ASP.NET MVC và Entity Framework, trong khi dự án đang dùng React, Express và PostgreSQL. Nếu giảng viên đã cho phép stack thay thế, nhóm nên chuẩn bị một câu giải thích ngắn khi vấn đáp; nếu ASP.NET là yêu cầu bắt buộc, cần xử lý trước khi nộp.
2. Điền URL website và kho mã nguồn/commit trong `metadata.tex`, sau đó mở thử bằng cửa sổ ẩn danh.
3. Bổ sung toàn bộ ảnh thật trong `images/screenshots/`; ảnh giao diện chuyển sang trắng đen nhưng vẫn phải đọc được chữ và trạng thái.
4. Chạy lại kiểm thử trên đúng commit nộp. Chỉ cập nhật số liệu khi có log hoặc ảnh minh chứng; ưu tiên bổ sung E2E, kiểm thử thủ công và kết nối Redis/worker.
5. Đồng bộ ERD với schema và migration. ERD hiện có cả `ratings` và `story_ratings`, đồng thời có `bad_words` nhưng báo cáo chưa tìm thấy migration tương ứng. Cần xác nhận bảng thực sự được ứng dụng sử dụng.

## Gợi ý khi thuyết trình

- Tập trung vào một luồng xuyên suốt: Uploader tạo truyện, Moderator duyệt, User đọc và tương tác, Admin truy vết.
- Khi trình bày kiến trúc, giải thích rõ trách nhiệm của frontend, REST API, PostgreSQL, Redis/BullMQ và worker.
- Ở phần database, phóng to các cụm bảng thay vì cố đọc toàn bộ ERD trên một slide.
- Chuẩn bị demo nhánh lỗi 401/403 và một thao tác tạo audit log để chứng minh xác thực, phân quyền và truy vết.
- Dành slide cuối cho kết quả kiểm thử, hạn chế còn lại và hướng phát triển; không khẳng định các kết quả chưa có bằng chứng.

## Các điểm đã sửa trong bản này

- Bổ sung đối tượng sử dụng, sơ đồ ngữ cảnh và bảng nhu cầu ở Chương 1.
- Bổ sung ERD thật ở Chương 3 và ghi chú điểm cần đồng bộ dữ liệu.
- Biên tập phần giới thiệu, phương pháp thực hiện, mô hình dữ liệu và kết luận theo văn phong báo cáo dự án.
- Bổ sung tài liệu tham khảo chính thức cho React, Vite, Express, PostgreSQL, JWT, Redis, BullMQ và OWASP.
- Giữ nguyên các khung ảnh và trường liên kết để nhóm điền bằng minh chứng thật.
