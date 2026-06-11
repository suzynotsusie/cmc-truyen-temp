# CMC Truyện — Nền Tảng Đọc Truyện Chữ Trực Tuyến

CMC Truyện là một nền tảng đọc truyện chữ trực tuyến hiện đại dành cho độc giả Việt Nam. Dự án tập trung vào **trải nghiệm đọc sạch, nhanh, không quảng cáo**, kết hợp với **trí tuệ nhân tạo (AI)** để tóm tắt chương và gợi ý truyện cá nhân hóa cho từng người dùng.

---

## 🏗️ Kiến Trúc Hệ Thống

Hệ thống được thiết kế theo mô hình **Decoupled Architecture (Kiến trúc tách rời)** gồm hai thư mục chính:

*   **`frontend/` (Vite + React 18):** Giao diện hiển thị, điều chỉnh cỡ chữ, dark mode, auto-bookmark, và tương tác của người dùng.
*   **`backend/` (Node.js + Express.js):** Xử lý nghiệp vụ, quản lý cơ sở dữ liệu PostgreSQL (Supabase), quản lý phiên làm việc bằng JWT, và tích hợp AI.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### 💻 Frontend
*   **Framework:** React 18 với React Router v6.
*   **Styling:** Tailwind CSS và Bootstrap (Responsive mượt mà trên Mobile, Tablet, Desktop).
*   **API Client:** Axios để kết nối và gọi API từ Backend.
*   **Đọc truyện cá nhân hóa:** Lưu trữ bookmark tự động, thay đổi font chữ, độ giãn dòng và Dark Mode.

### ⚙️ Backend
*   **Runtime:** Node.js 18+.
*   **Framework:** Express.js (MVC Pattern).
*   **Database:** PostgreSQL (Hosting trên Supabase).
*   **Authentication:** JSON Web Token (JWT) kết hợp băm mật khẩu bằng `bcryptjs`.
*   **AI Integration:** Google Gemini API kết hợp cùng Vercel AI SDK (`@ai-sdk/google`).

---

## 📁 Cấu Trúc Dự Án Hiện Tại

```
web-app-project/
├── backend/                  # Mã nguồn server Node.js/Express
│   ├── src/
│   │   ├── config/          # Cấu hình database, biến môi trường
│   │   ├── controllers/     # Controller điều hướng xử lý nghiệp vụ (Auth, Story, Chapter...)
│   │   ├── models/          # Các query database tương tác PostgreSQL
│   │   ├── routes/          # Các tuyến đường API của hệ thống
│   │   ├── middleware/      # Middleware xác thực JWT & phân quyền người dùng
│   │   ├── services/        # Service tích hợp AI (Google Gemini API)
│   │   ├── app.js           # Khởi tạo Express & Middleware chung
│   │   └── server.js        # Entry point khởi chạy server
│   ├── scripts/             # File schema SQL và seeding database
│   └── package.json
│
├── frontend/                 # Mã nguồn giao diện React
│   ├── src/
│   │   ├── components/      # Các thành phần tái sử dụng (Navbar, StoryCard, AIChapterSummary...)
│   │   ├── pages/           # Các trang giao diện (HomePage, StoryDetailPage, ChapterReaderPage...)
│   │   ├── services/        # Lớp giao tiếp API (`api.js`, `authService.js`)
│   │   ├── styles/          # Styling & cấu hình Dark Mode
│   │   ├── App.jsx          # Cấu hình Router chính của ứng dụng
│   │   └── main.jsx         # Điểm khởi chạy của ứng dụng React
│   └── package.json
│
├── docs/                     # Tài liệu thiết kế và đặc tả dự án
│   ├── product/             # Tài liệu phân tích nghiệp vụ & yêu cầu (MVP, Backlog)
│   └── technical/           # Tài liệu kiến trúc hệ thống, API và AI Personalization
│
├── AGENT_GUIDE.md            # Tài liệu phát triển cho AI agent
├── package.json
└── README.md                 # File hướng dẫn tổng quan này
```

---

## 🔐 Phân Quyền Người Dùng (Role-Based Access Control)

Hệ thống chia làm 4 nhóm quyền chính:

| Vai Trò | Quyền Hạn |
|---------|-----------|
| **Admin** | Toàn quyền kiểm soát hệ thống — quản lý người dùng, truyện, chương và bình luận. |
| **Manager** | Duyệt truyện khi có truyện mới được upload |
| **Uploader** | Đăng truyện mới, quản lý & cập nhật nội dung truyện/chương do mình đăng, cộng với tất cả quyền của User. |
| **User** | Đọc truyện, theo dõi truyện, lưu lịch sử, viết bình luận, nhận gợi ý truyện cá nhân hóa từ AI. |
| **Guest** | Xem danh sách truyện công khai, tìm kiếm và đọc chương (không lưu lịch sử, không bình luận). |

---

## 🤖 Tính Năng Trí Tuệ Nhân Tạo (AI Features)

1.  **Tóm Tắt Chương (AI Chapter Summary):** Người dùng khi đọc chương có thể nhấn nút "Tóm tắt" để gửi nội dung chương sang Gemini API nhằm nhận về nội dung tóm tắt ngắn gọn khoảng 3-4 câu.
2.  **Gợi Ý Cá Nhân Hóa (AI Personalization):** Backend tự động thu thập hành vi người dùng (dwell time, tỷ lệ hoàn thành truyện, truyện theo dõi) và sử dụng Gemini API để phân tích gu đọc truyện, gợi ý ra danh sách 5 truyện tương thích nhất.

---

## 🚀 Hướng Dẫn Khởi Chạy Dự Án

### 1. Chuẩn bị biến môi trường
Tạo các file `.env` tại thư mục `/backend` và `/frontend` tương tự cấu hình sau:

**Backend (`backend/.env`):**
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db_name>
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_google_gemini_api_key
FRONTEND_URL=http://localhost:3000
```

**Frontend (`frontend/.env`):**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 2. Cài đặt & Khởi chạy Backend
```bash
cd backend
npm install
npm run db:init      # Khởi tạo bảng dữ liệu
npm run db:seed      # Thêm dữ liệu mẫu (seeding)
npm run dev          # Chạy server ở chế độ watch mode
```

### 3. Cài đặt & Khởi chạy Frontend
Mở một terminal mới:
```bash
cd frontend
npm install
npm run dev          # Khởi chạy giao diện React (mặc định tại http://localhost:3000)
```

---

## 📚 Tài Liệu Hướng Dẫn Kèm Theo

*   [`ARCHITECTURE.md`](./docs/technical/ARCHITECTURE.md) — Kiến trúc chi tiết, sơ đồ dữ liệu và điều hướng URL cũ sang React.
*   [`API_REFERENCE.md`](./docs/technical/API_REFERENCE.md) — Danh sách đặc tả 34 API Endpoint và cách dùng.
*   [`AI_PERSONALIZATION.md`](./docs/technical/AI_PERSONALIZATION.md) — Cơ chế thu thập dữ liệu hành vi (Telemetry) và tích hợp AI Gemini.
*   [`REQUIREMENTS.md`](./docs/product/REQUIREMENTS.md) — Đặc tả yêu cầu phần mềm, Persona, User Story và Backlog.
*   [`UX_PROTOTYPE.md`](./docs/technical/UX_PROTOTYPE.md) — Hướng dẫn giao diện mẫu tĩnh và Mock Data.
