# Hướng dẫn Cấu hình LaTeX & VS Code (Trải nghiệm như Overleaf)

Tài liệu này hướng dẫn cách thiết lập môi trường biên dịch LaTeX nhanh chóng cho báo cáo của dự án tại thư mục `docs/bao-cao` và cấu hình VS Code để có trải nghiệm xem/sửa tiện lợi tương tự Overleaf.

---

## 1. Cài đặt các công cụ chính (Bắt buộc)

* **Cài đặt MiKTeX:** 
  1. Tải và cài đặt [MiKTeX](https://miktex.org/download).
  2. **Quan trọng:** Trong quá trình cài đặt, tại phần thiết lập mặc định, chọn tùy chọn **"Always install missing packages on-the-fly"** (hoặc *Yes*) để MiKTeX tự động tải các gói lệnh bổ sung khi biên dịch.
* **Cài đặt Extension VS Code:**
  * Mở VS Code, tìm kiếm và cài đặt tiện ích mở rộng [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop).
* **Tạo Profile mới trong VS Code (Khuyên dùng - Không bắt buộc):**
  ![alt text](image.png)
  * *Tại sao nên làm:* Extension LaTeX Workshop khá nặng và có nhiều cấu hình phím tắt. Tạo Profile riêng giúp bạn tách biệt môi trường viết báo cáo LaTeX với môi trường viết code Web (React/Node.js) thông thường để tránh bị loãng/chậm VS Code.
  * *Cách làm:* Nhấp vào biểu tượng **Bánh răng** (góc dưới bên trái) -> Chọn **Profiles** -> **Create Profile...** -> Đặt tên là `LaTeX` -> Chuyển sang profile này khi viết báo cáo.

---

## 2. Cấu hình VS Code (Settings JSON giống Overleaf)

Vì báo cáo sử dụng **XeLaTeX** (để hỗ trợ Tiếng Việt và font Times New Roman), bạn cần cấu hình công cụ biên dịch mặc định và các tính năng đồng bộ hóa vị trí (SyncTeX) giống Overleaf.

### Bước 1: Mở file `settings.json` của VS Code
1. Nhấn tổ hợp phím `Ctrl + Shift + P` (hoặc `Cmd + Shift + P` trên macOS).
2. Tìm kiếm và chọn dòng **Preferences: Open User Settings (JSON)**.

### Bước 2: Dán đoạn cấu hình sau vào trong cặp ngoặc nhọn `{ ... }`
```json
  // Cấu hình chế độ tự động biên dịch mỗi khi Lưu file (Ctrl + S)
  "latex-workshop.latex.autoBuild.run": "onSave",

  // Nháy đúp (Double click) vào bản xem PDF để nhảy về dòng code tương ứng (Giống Overleaf)
  "latex-workshop.view.pdf.internal.synctex.keybinding": "double-click",

  // Cấu hình XeLaTeX làm công cụ biên dịch mặc định cho dự án
  "latex-workshop.latex.recipe.default": "first",
  "latex-workshop.latex.recipes": [
    {
      "name": "xelatex ➞ bibtex ➞ xelatex",
      "tools": [
        "xelatex",
        "bibtex",
        "xelatex"
      ]
    }
  ]
```

---

## 3. Xem bản PDF sau khi biên dịch (Live Preview)

* **Xem PDF bên trong VS Code:** Mở file `main.tex`, nhấn tổ hợp phím **`Ctrl + Alt + V`** (hoặc click biểu tượng **Kính lúp** ở góc trên bên phải màn hình). Chọn *View in VS Code tab*.
* **Nhảy từ PDF về dòng Code:** Nhấp đúp chuột trái (**Double Click**) vào bất kỳ dòng chữ nào trên màn hình hiển thị PDF để nhảy tới dòng code tương ứng.
* **Nhảy từ Code sang PDF:** Đặt con trỏ chuột tại dòng code bạn đang sửa, nhấn tổ hợp phím **`Ctrl + Alt + J`** để cuộn PDF đến đúng vị trí của dòng đó.

---

## 4. Các mục bổ trợ và xử lý sự cố (Optional)

### Cài đặt phần mềm bổ trợ phụ
* **Strawberry Perl:** Tải và cài đặt [Strawberry Perl](https://strawberryperl.com/) để hỗ trợ các kịch bản lệnh tự động (không bắt buộc nhưng giúp hỗ trợ tốt hơn cho một số gói biên dịch đặc thù).
* **Cập nhật gói của MiKTeX:** Nếu gặp lỗi thiếu thư viện khi biên dịch, hãy mở **MiKTeX Console** từ Menu Start -> Chọn **Updates** -> Nhấn **Check for updates** và cập nhật toàn bộ thư viện lên phiên bản mới nhất.

### Xử lý sự cố thường gặp
* **Lỗi biên dịch lần đầu bị đơ/chậm:** Do tính năng tự động tải thư viện kích hoạt. Vui lòng giữ kết nối Internet ổn định và đợi vài phút ở lần biên dịch đầu tiên để MiKTeX tải đủ các file.
* **Lỗi Antivirus chặn tải gói:** Một số phần mềm diệt virus có thể hiểu nhầm quá trình tự động tải gói của MiKTeX là hành vi đáng ngờ. Nếu biên dịch báo lỗi, bạn hãy thử tạm thời vô hiệu hóa Antivirus hoặc thêm MiKTeX vào danh sách ngoại lệ (Whitlelist).
