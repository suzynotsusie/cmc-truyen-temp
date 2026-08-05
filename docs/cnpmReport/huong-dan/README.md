# Báo cáo LaTeX PROG2008

Thư mục này chứa bản báo cáo đã được viết lại theo source thật của dự án CMC Truyện và tiêu chí người học cung cấp. Bố cục chính gồm bìa, phân công, mục lục tự động, danh mục bảng, danh mục hình, ba chương nội dung, kết luận và tài liệu tham khảo. Xem `OUTLINE.md` để theo dõi cấu trúc báo cáo, phân bổ trang và dàn ý khoảng 15 slide.

## 1. Việc phải làm trước khi nộp

1. Sửa duy nhất `metadata.tex` để chốt:
   - tên đề tài;
   - giảng viên, mã lớp;
   - kiểm tra thông tin 4 thành viên;
   - phân công và tỷ lệ đóng góp;
   - URL website, repository/commit và video nếu có.
2. Chụp ảnh thật và lưu đúng tên trong `images/screenshots/`. Khi file tồn tại, lệnh `\ReportImage` tự thay khung giữ chỗ bằng ảnh.
3. Chuyển ảnh giao diện sang trắng đen, kiểm tra tương phản và che dữ liệu nhạy cảm.
4. Chạy E2E/kiểm thử thủ công rồi cập nhật bảng kết quả nếu có bằng chứng mới. Không đổi `Chưa ghi nhận` thành `Pass` chỉ dựa trên suy đoán.
5. Kiểm tra `images/database-erd.png` khớp với đúng commit và database dùng để demo; xác nhận cách sử dụng hai bảng `ratings` và `story_ratings`.

## 2. Danh sách ảnh cần bổ sung

- `fe-folder-tree.png`
- `fe-app-routes-code.png`
- `fe-api-interceptor-code.png`
- `be-folder-tree.png`
- `be-app-routes-code.png`
- `be-auth-rbac-code.png`
- `db-folder-schema.png`
- `db-main-sql-code.png`
- `database-erd.png` đã được bổ sung từ ERD do nhóm cung cấp.
- `ui-customer-home.png`
- `ui-customer-browse.png`
- `ui-customer-story-detail.png`
- `ui-customer-reader.png`
- `ui-customer-account.png`
- `ui-admin-dashboard.png`
- `ui-admin-users.png`
- `ui-moderator-pending-stories.png`
- `ui-admin-reports.png`
- `ui-admin-audit-logs.png`

Không cần sửa caption hoặc label khi thêm ảnh.

## 3. Biên dịch trên Overleaf bằng XeLaTeX

Trong Overleaf, vào **Menu -> Settings -> Compiler** và chọn **XeLaTeX**. Source dùng UTF-8 và ưu tiên đúng font Times New Roman; nếu môi trường không có font này, mã nguồn tự chuyển sang TeX Gyre Termes tương thích.

Nếu biên dịch trên máy cá nhân:

```powershell
New-Item -ItemType Directory -Force output/pdf | Out-Null
xelatex -interaction=nonstopmode -halt-on-error -output-directory=output/pdf main.tex
xelatex -interaction=nonstopmode -halt-on-error -output-directory=output/pdf main.tex
```

Hoặc:

```powershell
latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir=output/pdf main.tex
```

Cần chạy ít nhất hai lần để mục lục, số trang, danh mục bảng/hình và tham chiếu được cập nhật. Bản kiểm tra ngày 22/07/2026 đã biên dịch thành công bằng XeLaTeX với Times New Roman.

## 4. Kiểm tra sau khi biên dịch

- Bìa là trang 1 và phân công là trang 2.
- Danh mục bảng đứng trước danh mục hình.
- Hình/bảng được đánh số theo chương (`1.1`, `2.3`, ...).
- Không còn khung `VỊ TRÍ CHÈN ẢNH MINH CHỨNG` trong bản nộp.
- Không còn chuỗi `[ĐIỀN ...]` hoặc `[CHƯA CHỐT ...]`.
- Mục lục không có số trang `??`; mọi `\ref` đã được giải quyết.
- Phần nội dung đánh số Ả Rập nên ở khoảng 35--40 trang; tổng trang vật lý vẫn phải dưới 60. Bản hiện tại có 39 trang nội dung và 46 trang vật lý.
- Không có ảnh màu trong phần giao diện nếu giảng viên yêu cầu bản không màu.
- URL mở được ở cửa sổ ẩn danh và trỏ đúng bản deploy/commit dùng để chấm.

Bản PDF kiểm tra chỉ nhằm xác nhận bố cục. Sau khi điền metadata, ảnh và liên kết, cần biên dịch lại ít nhất hai lượt và rà soát trực quan trước khi nộp.
